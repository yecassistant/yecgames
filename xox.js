/* XOX – iki kişilik (xox/mac, xox/seri). Ortak altyapı: duello.js.
   mac = { n, v, a, b, baslayan (X), mod: "klasik"|"sonsuz", hamle: [{u: uid, i: 0..8}], sira: uid, bitti, sonuc ""|"dizi"|"berabere"|"pes", kazanan, cizgi: [i,j,k]|null, t }
   Sonsuz modda herkesin tahtada yalnız son 3 işareti durur; 4. konunca en eskisi silinir. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var DIZI = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  var seciliMod = "klasik"; try { seciliMod = localStorage.getItem("xo_mod") === "sonsuz" ? "sonsuz" : "klasik"; } catch (e) {}
  var MOD_NOT = { klasik: "Klasik: tahta dolarsa berabere.", sonsuz: "Sonsuz: herkesin en fazla 3 işareti kalır, 4.'sünde en eskisi silinir." };
  var D = window.Duello({
    kol: "xox", sayfa: "xox", sub: "sub", ses: "SdSes", helpKey: "xox_help",
    startText: "Sırayla X ve O. Üçünü önce dizen kazanır; ilk başlayan oyun oyun değişir.",
    yeniDoc: function (d, ME, OTHER) {
      var baslayan = d && d.baslayan ? (d.baslayan === ME ? OTHER : ME) : ME;
      return { a: ME, b: OTHER, baslayan: baslayan, mod: seciliMod, hamle: [], sira: baslayan, cizgi: null };
    },
    onMac: function (d, ilk) { G = d; ciz(ilk); },
    onYok: function () { G = null; $("score").hidden = true; $("alan").hidden = true; $("modYazi").hidden = true; $("bResign").hidden = true; },
    bitisGecikme: function () { return G && G.cizgi ? 1100 : 500; },
    bitis: function (d) {
      var ME = D.me, ad = D.adlar[D.other] || "Rakip", kazandim = d.kazanan === ME;
      var baslik = d.sonuc === "pes" ? (kazandim ? ad + " pes etti — kazandın" : "Pes ettin") : d.sonuc === "berabere" ? "Berabere" : kazandim ? "Kazandın! Üçünü dizdin" : ad + " dizdi";
      return { kick: "Oyun " + d.n + " · " + (d.mod === "sonsuz" ? "Sonsuz" : "Klasik"), baslik: baslik, metin: "Yeni oyunda ilk hamle " + (d.baslayan === ME ? D.ekIn(ad) : "senin") + "." };
    },
    seriKod: function (d) { return d.sonuc === "pes" ? 99 : Math.min(98, (d.hamle || []).length); }
  });
  var G = null, gonderiyor = false, sonCiz = "";
  function snd(n) { if (window.SdSes) try { window.SdSes.play(n); } catch (e) {} }
  function isaret(d, uid) { return uid === d.baslayan ? "X" : "O"; }
  /* hamle listesinden tahta: [{u, i, yas}] — yas: o oyuncunun kaçıncı en eski işareti (sonsuz modda silinecek olanı göstermek için) */
  function tahta(d) {
    var t = [null, null, null, null, null, null, null, null, null], L = d.hamle || [];
    if (d.mod === "sonsuz") {
      var son = {};
      for (var k = L.length - 1; k >= 0; k--) { var h = L[k]; son[h.u] = son[h.u] || []; if (son[h.u].length < 3) son[h.u].push(h); }
      Object.keys(son).forEach(function (u) { son[u].forEach(function (h, j) { t[h.i] = { u: u, i: h.i, eski: son[u].length === 3 && j === 2 }; }); });
    } else L.forEach(function (h) { t[h.i] = { u: h.u, i: h.i, eski: false }; });
    return t;
  }
  function dizildi(t, u) { for (var k = 0; k < DIZI.length; k++) { var a = DIZI[k]; if (t[a[0]] && t[a[1]] && t[a[2]] && t[a[0]].u === u && t[a[1]].u === u && t[a[2]].u === u) return a; } return null; }
  var SVG_X = '<svg viewBox="0 0 100 100" class="xox"><path d="M24 24L76 76"/><path d="M76 24L24 76"/></svg>', SVG_O = '<svg viewBox="0 0 100 100" class="xoo"><circle cx="50" cy="50" r="27"/></svg>';
  /* tahta kutuları */
  var tb = $("tahta");
  for (var i = 0; i < 9; i++) { var c = document.createElement("button"); c.type = "button"; c.className = "xok"; c.setAttribute("data-i", i); c.setAttribute("aria-label", (i + 1) + ". kare"); tb.appendChild(c); }
  tb.addEventListener("click", function (e) { var b = e.target && e.target.closest ? e.target.closest("button.xok") : null; if (b && !b.disabled) oyna(+b.getAttribute("data-i")); });
  function ciz(ilk) {
    if (!G) return;
    var ME = D.me, OTHER = D.other, t = tahta(G), sira = G.sira === ME && !G.bitti, sonH = (G.hamle || [])[G.hamle.length - 1];
    $("score").hidden = false; $("alan").hidden = false;
    $("modYazi").hidden = false; $("modYazi").textContent = G.mod === "sonsuz" ? "Sonsuz mod · herkesin 3 işareti kalır, soluk olan sıradaki silinecek" : "Klasik mod";
    $("isMe").textContent = isaret(G, ME); $("isMe").className = "xoben " + (isaret(G, ME) === "X" ? "x" : "o");
    $("isOther").textContent = OTHER ? isaret(G, OTHER) : ""; $("isOther").className = "xoben " + (OTHER && isaret(G, OTHER) === "X" ? "x" : "o");
    var anahtar = JSON.stringify([G.n, G.hamle, G.bitti]);
    [].forEach.call(tb.children, function (b, i) {
      var k = t[i], yeni = sonH && sonH.i === i && anahtar !== sonCiz;
      var html = k ? (isaret(G, k.u) === "X" ? SVG_X : SVG_O) : "";
      if (b.getAttribute("data-h") !== (k ? k.u : "") || yeni) { b.innerHTML = html; b.setAttribute("data-h", k ? k.u : ""); if (yeni) { b.classList.remove("yeni"); void b.offsetWidth; b.classList.add("yeni"); } }
      b.classList.toggle("eski", !!(k && k.eski && G.mod === "sonsuz" && !G.bitti));
      b.classList.toggle("dizi", !!(G.cizgi && G.cizgi.indexOf(i) >= 0));
      b.disabled = !sira || !!k || gonderiyor;
    });
    if (anahtar !== sonCiz && !ilk && sonH && sonH.u !== ME && !G.bitti) snd("key");
    sonCiz = anahtar;
    /* kazanma çizgisi */
    var L = $("cizgiL");
    if (G.cizgi) { var a = G.cizgi[0], z = G.cizgi[2], p = function (k) { return [50 + (k % 3) * 100, 50 + Math.floor(k / 3) * 100]; }, A = p(a), Z = p(z), dx = Z[0] - A[0], dy = Z[1] - A[1], u = Math.hypot(dx, dy);
      L.setAttribute("x1", A[0] - dx / u * 30); L.setAttribute("y1", A[1] - dy / u * 30); L.setAttribute("x2", Z[0] + dx / u * 30); L.setAttribute("y2", Z[1] + dy / u * 30); $("cizgi").classList.add("acik"); $("cizgi").classList.toggle("ben", G.kazanan === ME); }
    else $("cizgi").classList.remove("acik", "ben");
    if (G.bitti) { $("turnTxt").textContent = G.kazanan === ME ? "Kazandın" : G.kazanan ? "Kaybettin" : "Berabere"; $("turnSub").textContent = "oyun bitti"; }
    else if (sira) { $("turnTxt").textContent = "Sıra sende"; $("turnSub").textContent = isaret(G, ME) + " koy"; }
    else { $("turnTxt").textContent = "Sıra " + (D.adlar[OTHER] ? D.ekDe(D.adlar[OTHER]) : "onda"); $("turnSub").textContent = "bekliyorsun"; }
    $("turn").className = "hdturn" + (sira ? " me" : " ot");
    $("pMe").className = "hdp" + (sira ? " on" : ""); $("pOther").className = "hdp" + (!G.bitti && G.sira === OTHER ? " on" : "");
    $("bResign").hidden = G.bitti;
  }
  function oyna(i) {
    if (!G || G.bitti || G.sira !== D.me || gonderiyor) return;
    var t = tahta(G); if (t[i]) return;
    var ME = D.me, OTHER = D.other, bitirdi = false, kazandi = false;
    gonderiyor = true;
    /* iyimser çizim */
    var once = G; G = JSON.parse(JSON.stringify(G)); G.hamle.push({ u: ME, i: i }); G.sira = OTHER; ciz(); snd("lock");
    D.db.runTransaction(function (tx) {
      return tx.get(D.ref).then(function (snap) {
        var d = snap.data(); if (!d || d.bitti || d.sira !== ME || d.v !== once.v) throw new Error("sira");
        var h = (d.hamle || []).slice(); h.push({ u: ME, i: i });
        var nd = { hamle: h, mod: d.mod, baslayan: d.baslayan }, tt = tahta(nd), dz = dizildi(tt, ME);
        var upd = { hamle: h, v: d.v + 1, t: firebase.firestore.FieldValue.serverTimestamp() };
        if (dz) { upd.bitti = true; upd.sonuc = "dizi"; upd.kazanan = ME; upd.cizgi = dz; upd.sira = ""; bitirdi = true; kazandi = true; }
        else if (d.mod !== "sonsuz" && h.length >= 9) { upd.bitti = true; upd.sonuc = "berabere"; upd.kazanan = null; upd.sira = ""; bitirdi = true; }
        else upd.sira = OTHER;
        tx.set(D.ref, upd, { merge: true });
      });
    }).then(function () { gonderiyor = false; if (bitirdi) D.bitirenBenim = true; if (kazandi) snd("found"); })
      .catch(function (e) { gonderiyor = false; G = once; ciz(); D.msg(String(e && e.message) === "sira" ? "Sıra sende değil ya da tahta değişti." : "Bağlantı kurulamadı, tekrar dene."); });
  }
  /* mod seçimi (başlangıç ve bitiş kartında) */
  function modCiz() {
    [].forEach.call(document.querySelectorAll("[data-mod-seg] button"), function (b) { b.classList.toggle("on", b.getAttribute("data-mod") === seciliMod); });
    [].forEach.call(document.querySelectorAll("[data-mod-not]"), function (p) { p.textContent = MOD_NOT[seciliMod]; });
  }
  [].forEach.call(document.querySelectorAll("[data-mod-seg]"), function (s) {
    s.addEventListener("click", function (e) { var b = e.target.closest ? e.target.closest("button[data-mod]") : null; if (!b) return; seciliMod = b.getAttribute("data-mod"); try { localStorage.setItem("xo_mod", seciliMod); } catch (x) {} modCiz(); snd("key"); });
  });
  modCiz();
  $("bResign").onclick = function () { if (!G || G.bitti) return; $("confirm").hidden = false; };
  $("confirmNo").onclick = function () { $("confirm").hidden = true; };
  $("confirmYes").onclick = function () {
    $("confirm").hidden = true; if (!G || G.bitti) return; D.bitirenBenim = true;
    D.ref.set({ bitti: true, sonuc: "pes", kazanan: D.other, sira: "", cizgi: null, v: (G.v || 0) + 1, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () { D.bitirenBenim = false; D.msg("Olmadı, tekrar dene."); });
  };
  if (location.hash === "#test") window.__xo = { state: function () { return { G: G, me: D.me, other: D.other, tahta: G ? tahta(G).map(function (k) { return k ? isaret(G, k.u) + (k.eski ? "*" : "") : "."; }).join("") : "" }; }, oyna: oyna, yeni: D.yeniOyun, mod: function (m) { seciliMod = m; modCiz(); } };
})();
