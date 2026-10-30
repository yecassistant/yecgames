/* Sayı Düellosu – iki kişilik "+1 −2" sayı tahmin oyunu (sayi/mac, sayi/seri). Ortak altyapı: duello.js.
   mac = { n, v, a, b, baslayan, gizli: {uid: karıştırılmış sayı}, hazir: {uid: bool}, tahmin: {uid: [{t:"1234", p: doğru yer, m: yanlış yer}]}, sira: uid|"", bitti, sonuc ""|"bulundu"|"berabere"|"pes", kazanan, t }
   Kural: başlayan önce bulursa diğerinin bir tahmin hakkı daha var; ikisi de aynı turda bulursa berabere. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var D = window.Duello({
    kol: "sayi", sayfa: "sayi", sub: "sub", ses: "SdSes",
    startText: "İkiniz de 4 haneli gizli bir sayı belirlersiniz, sonra sırayla tahmin. İlk tahmin sırası oyun oyun değişir.",
    yeniDoc: function (d, ME, OTHER) {
      var baslayan = d && d.baslayan ? (d.baslayan === ME ? OTHER : ME) : ME, gizli = {}, hazir = {}, tahmin = {};
      gizli[ME] = ""; gizli[OTHER] = ""; hazir[ME] = false; hazir[OTHER] = false; tahmin[ME] = []; tahmin[OTHER] = [];
      return { a: ME, b: OTHER, baslayan: baslayan, gizli: gizli, hazir: hazir, tahmin: tahmin, sira: "" };
    },
    onMac: function (d, ilk) { G = d; if (ilk) { giris = ""; siraDuzelt = -1; } baslat(d); ciz(); },
    onYok: function () { G = null; $("score").hidden = true; $("cols").hidden = true; $("pad").hidden = true; $("bResign").hidden = true; },
    bitis: function (d) {
      var ME = D.me, OTHER = D.other, ad = D.adlar[OTHER] || "Rakip", kazandim = d.kazanan === ME, n = (d.tahmin[ME] || []).length, no = (d.tahmin[OTHER] || []).length;
      var baslik = d.sonuc === "pes" ? (kazandim ? ad + " pes etti — kazandın" : "Pes ettin") : d.sonuc === "berabere" ? "Aynı turda buldunuz — berabere" : kazandim ? "Buldun! " + n + " tahminde" : ad + " buldu — " + no + " tahminde";
      var ek = "<div><small>" + D.esc(D.adlar[ME] || "sen") + "</small><b>" + D.esc(coz(d, ME)) + "</b></div><div><small>" + D.esc(ad) + "</small><b>" + D.esc(coz(d, OTHER)) + "</b></div>";
      return { kick: "Oyun " + d.n + " bitti", baslik: baslik, metin: "Sayılar açıldı. Yeni oyunda ilk tahmin " + (d.baslayan === ME ? D.ekIn(ad) : "senin") + ".", ek: ek };
    },
    seriKod: function (d) { return d.sonuc === "pes" ? 99 : Math.min(98, ((d.tahmin[d.kazanan] || d.tahmin[D.me] || []).length)); }
  });
  var G = null, giris = "", gonderiyor = false, siraDuzelt = -1;
  /* ikisi de hazır ama sıra boş kalmışsa (aynı anda kilitleme): başlayanla doldur — tek sefer */
  function baslat(d) {
    if (d.bitti || d.sira || !d.hazir || !d.hazir[D.me] || !D.other || !d.hazir[D.other] || siraDuzelt === d.n) return;
    siraDuzelt = d.n; D.ref.set({ sira: d.baslayan, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () {});
  }
  function snd(n) { if (window.SdSes) try { window.SdSes.play(n); } catch (e) {} }
  function anahtar(uid) { return "sayi" + (G ? G.n : 0) + uid; }
  function coz(d, uid) { return d.gizli && d.gizli[uid] ? D.coz(d.gizli[uid], "sayi" + d.n + uid) : ""; }
  function puanla(gizli, tahmin) { var p = 0, m = 0; for (var i = 0; i < 4; i++) { if (tahmin.charAt(i) === gizli.charAt(i)) p++; else if (gizli.indexOf(tahmin.charAt(i)) >= 0) m++; } return { p: p, m: m }; }
  function gecerli(s) { if (!/^\d{4}$/.test(s) || s.charAt(0) === "0") return false; for (var i = 0; i < 4; i++) if (s.indexOf(s.charAt(i)) !== i) return false; return true; }

  /* ---- tuşlar ---- */
  var keys = $("keys");
  "1234567890".split("").forEach(function (k) { var b = document.createElement("button"); b.type = "button"; b.className = "sdk"; b.textContent = k; b.setAttribute("data-k", k); keys.appendChild(b); });
  var bDel = document.createElement("button"); bDel.type = "button"; bDel.className = "sdk sil"; bDel.innerHTML = "⌫"; bDel.setAttribute("data-k", "sil"); keys.appendChild(bDel);
  var bGo = document.createElement("button"); bGo.type = "button"; bGo.className = "sdk git"; bGo.textContent = "Tahmin et"; bGo.setAttribute("data-k", "git"); keys.appendChild(bGo);
  keys.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("button.sdk") : null; if (!b || b.disabled) return;
    var k = b.getAttribute("data-k");
    if (k === "sil") { giris = giris.slice(0, -1); snd("key"); }
    else if (k === "git") { gonder(); return; }
    else if (giris.length < 4 && giris.indexOf(k) < 0 && !(giris === "" && k === "0")) { giris += k; snd("key"); }
    cizPad();
  });
  function asama() {                                                     /* "kur" | "sayi" (benim sayım yok) | "bekle" (onunki yok) | "oyun" | "bitti" */
    if (!G) return "kur"; if (G.bitti) return "bitti";
    if (!G.hazir || !G.hazir[D.me]) return "sayi"; if (!G.hazir[D.other]) return "bekle"; return "oyun";
  }
  function cizPad() {
    var a = asama(), slots = $("slots").children, i;
    for (i = 0; i < 4; i++) { slots[i].textContent = giris.charAt(i) || ""; slots[i].className = i === giris.length ? "on" : ""; }
    var acik = a === "sayi" || (a === "oyun" && G.sira === D.me && !gonderiyor);
    [].forEach.call(keys.children, function (b) { var k = b.getAttribute("data-k"); b.disabled = !acik || (k === "git" ? giris.length !== 4 : k === "sil" ? !giris.length : (giris.length >= 4 || giris.indexOf(k) >= 0 || (giris === "" && k === "0"))); });
    bGo.textContent = a === "sayi" ? "Sayımı kilitle" : "Tahmin et";
    $("pad").hidden = !(a === "sayi" || a === "oyun"); $("pad").className = "sdpad" + (a === "sayi" ? " gizli" : "");
  }
  function satir(x, benim) { return "<li><b>" + D.esc(x.t) + "</b><span class=\"sdp\">+" + x.p + "</span><span class=\"sdm\">−" + x.m + "</span>" + (x.p === 4 ? '<i class="sdok">✓</i>' : "") + "</li>"; }
  function ciz() {
    var ME = D.me, OTHER = D.other, a = asama();
    if (!G) return;
    $("score").hidden = false; $("cols").hidden = false;
    var benimSayi = coz(G, ME);
    $("numMe").textContent = benimSayi ? benimSayi.split("").join(" ") : "· · · ·";
    $("numOther").textContent = G.bitti ? (coz(G, OTHER) || "····").split("").join(" ") : (G.hazir && G.hazir[OTHER] ? "● ● ● ●" : "· · · ·");
    var onunSayi = G.bitti ? (coz(G, OTHER) || "") : "";
    $("colMeT").innerHTML = "Senin tahminlerin<b>" + (benimSayi ? benimSayi.split("").join(" ") : "· · · ·") + "</b>";
    $("colOtT").innerHTML = D.esc(OTHER && D.adlar[OTHER] ? D.ekIn(D.adlar[OTHER]) : "Onun") + " tahminleri<b" + (onunSayi ? "" : ' class="gizli"') + ">" + (onunSayi ? onunSayi.split("").join(" ") : (G.hazir && G.hazir[OTHER] ? "●●●●" : "····")) + "</b>";
    var tm = (G.tahmin && G.tahmin[ME]) || [], to = (G.tahmin && OTHER && G.tahmin[OTHER]) || [];
    $("listMe").innerHTML = tm.map(function (x) { return satir(x, true); }).join("") || '<li class="bos">Henüz tahmin yok</li>';
    $("listOther").innerHTML = to.map(function (x) { return satir(x, false); }).join("") || '<li class="bos">Henüz tahmin yok</li>';
    var lm = $("listMe"), lo = $("listOther"); lm.scrollTop = lm.scrollHeight; lo.scrollTop = lo.scrollHeight;
    if (a === "bitti") { $("turnTxt").textContent = G.kazanan === ME ? "Kazandın" : G.kazanan ? "Kaybettin" : "Berabere"; $("turnSub").textContent = "oyun bitti"; }
    else if (a === "sayi") { $("turnTxt").textContent = "Sayını belirle"; $("turnSub").textContent = "4 farklı rakam"; }
    else if (a === "bekle") { $("turnTxt").textContent = (D.adlar[OTHER] || "Rakip") + " bekleniyor"; $("turnSub").textContent = "sayısını belirliyor"; }
    else if (G.sira === ME) { $("turnTxt").textContent = "Sıra sende"; $("turnSub").textContent = (tm.length + 1) + ". tahmin"; }
    else { $("turnTxt").textContent = "Sıra " + (ADLAR_ek()); $("turnSub").textContent = "bekliyorsun"; }
    $("turn").className = "hdturn" + (a === "oyun" && G.sira === ME ? " me" : a === "sayi" ? " me" : " ot");
    $("pMe").className = "hdp" + (a === "oyun" && G.sira === ME ? " on" : ""); $("pOther").className = "hdp" + (a === "oyun" && G.sira === OTHER ? " on" : "");
    $("bResign").hidden = !(a === "oyun" || a === "bekle");
    cizPad();
  }
  function ADLAR_ek() { return D.adlar[D.other] ? D.ekDe(D.adlar[D.other]) : "onda"; }

  /* ---- yazımlar ---- */
  function gonder() {
    if (giris.length !== 4 || gonderiyor) return;
    var a = asama(), ME = D.me, OTHER = D.other, s = giris;
    if (!gecerli(s)) { D.msg("Rakamlar farklı olmalı, 0 ile başlamaz."); return; }
    gonderiyor = true; cizPad();
    if (a === "sayi") {
      D.db.runTransaction(function (tx) {
        return tx.get(D.ref).then(function (snap) {
          var d = snap.data(); if (!d || d.bitti || d.n !== G.n) throw new Error("oyun");
          var upd = { gizli: {}, hazir: {}, t: firebase.firestore.FieldValue.serverTimestamp() };
          upd.gizli[ME] = D.gizle(s, "sayi" + d.n + ME); upd.hazir[ME] = true;
          if (d.hazir && d.hazir[OTHER]) upd.sira = d.baslayan;
          tx.set(D.ref, upd, { merge: true });
        });
      }).then(function () { gonderiyor = false; giris = ""; snd("lock"); D.msg("Sayın kilitlendi."); })
        .catch(function () { gonderiyor = false; cizPad(); D.msg("Kaydedilemedi, tekrar dene."); });
      return;
    }
    if (a !== "oyun" || G.sira !== ME) { gonderiyor = false; cizPad(); return; }
    var hedef = coz(G, OTHER); if (hedef.length !== 4) { gonderiyor = false; cizPad(); D.msg("Rakibin sayısı okunamadı."); return; }
    var pm = puanla(hedef, s), bulundu = pm.p === 4, bitirdi = false, once = G;
    /* anında göster: tahmin listeye girer, sonuç sunucudan onaylanınca kesinleşir */
    G = JSON.parse(JSON.stringify(G, function (k, v) { return k === "t" ? undefined : v; })); G.tahmin[ME] = (G.tahmin[ME] || []).concat([{ t: s, p: pm.p, m: pm.m }]); if (!(G.baslayan !== ME && bulundu)) G.sira = OTHER; giris = ""; ciz();
    D.db.runTransaction(function (tx) {
      return tx.get(D.ref).then(function (snap) {
        var d = snap.data(); if (!d || d.bitti || d.sira !== ME || d.v !== G.v) throw new Error("sira");
        var tm = (d.tahmin[ME] || []).slice(), to = d.tahmin[OTHER] || []; tm.push({ t: s, p: pm.p, m: pm.m });
        var upd = { tahmin: {}, v: d.v + 1, t: firebase.firestore.FieldValue.serverTimestamp() }; upd.tahmin[ME] = tm;
        var ikinciBen = d.baslayan !== ME;
        if (ikinciBen) {
          var sb = to.length && to[to.length - 1].p === 4, ob = bulundu;
          if (sb || ob) { upd.bitti = true; upd.sira = ""; bitirdi = true; if (sb && ob) { upd.sonuc = "berabere"; upd.kazanan = null; } else { upd.sonuc = "bulundu"; upd.kazanan = sb ? OTHER : ME; } }
          else upd.sira = OTHER;
        } else upd.sira = OTHER;                                            /* başlayan: bulsa da bulmasa da sıra ikinciye (eşitleme hakkı) */
        tx.set(D.ref, upd, { merge: true });
      });
    }).then(function () { gonderiyor = false; giris = ""; snd(bulundu ? "found" : pm.p ? "plus" : "key"); D.msg(bulundu ? "Buldun!" : "+" + pm.p + " −" + pm.m); if (bitirdi) D.bitirenBenim = true; ciz(); })
      .catch(function (e) { gonderiyor = false; G = once; giris = s; cizPad(); ciz(); D.msg(String(e && e.message) === "sira" ? "Sıra sende değil ya da liste değişti." : "Bağlantı kurulamadı, tekrar dene."); });
  }
  $("bResign").onclick = function () { if (!G || G.bitti) return; $("confirm").hidden = false; };
  $("confirmNo").onclick = function () { $("confirm").hidden = true; };
  $("confirmYes").onclick = function () {
    $("confirm").hidden = true; if (!G || G.bitti) return; D.bitirenBenim = true;
    D.ref.set({ bitti: true, sonuc: "pes", kazanan: D.other, sira: "", v: (G.v || 0) + 1, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () { D.bitirenBenim = false; D.msg("Olmadı, tekrar dene."); });
  };
  cizPad();
  if (location.hash === "#test") window.__sd = { state: function () { return { G: G, me: D.me, other: D.other, giris: giris, asama: asama(), benim: G ? coz(G, D.me) : "", onun: G ? coz(G, D.other) : "" }; }, yaz: function (s) { giris = s; cizPad(); gonder(); }, yeni: D.yeniOyun, puanla: puanla };
})();
