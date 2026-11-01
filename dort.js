/* Dört Taş (Connect 4) – iki kişilik (dort/mac, dort/seri). Ortak altyapı: duello.js.
   mac = { n, v, a, b, baslayan, hamle: [{u, c}], sira, bitti, sonuc "dizi"|"berabere"|"pes", kazanan, cizgi: [kare…]|null, odul: {uid: karıştırılmış metin} }
   Tahta 7 sütun × 6 satır; kare = satır * 7 + sütun (satır 0 en üst). Taş sütunun en altındaki boş kareye düşer.
   Ödül: herkes "kaybedersem…" diye bir ödül yazabilir; oyun bitince kazanan, kaybedenin ödülünü görür. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var SUT = 7, SAT = 6;
  var D = window.Duello({
    kol: "dort", sayfa: "dort", sub: "sub", ses: "SdSes", helpKey: "dort_help",
    startText: "Sırayla bir sütuna taş at; yan yana, alt alta ya da çapraz dördünü önce dizen kazanır. İstersen bir de ödül koy: kaybedersen ne vereceksin?",
    yeniDoc: function (d, ME, OTHER) {
      var baslayan = d && d.baslayan ? (d.baslayan === ME ? OTHER : ME) : ME, odul = {}, t = odulGirdi("start");
      if (t) odul[ME] = D.gizle(t, "dort-odul" + ME);
      return { a: ME, b: OTHER, baslayan: baslayan, hamle: [], sira: baslayan, cizgi: null, odul: odul };
    },
    onMac: function (d, ilk) { G = d; ciz(ilk); },
    onYok: function () { G = null; $("pMe").hidden = true; $("pOther").hidden = true; $("alan").hidden = true; $("bResign").hidden = true; },
    bitisGecikme: function () { return G && G.cizgi ? 1500 : 700; },
    bitis: function (d) {
      var ME = D.me, OTHER = D.other, ad = D.adlar[OTHER] || "Rakip", kazandim = d.kazanan === ME;
      var baslik = d.sonuc === "pes" ? (kazandim ? ad + " pes etti — kazandın" : "Pes ettin") : d.sonuc === "berabere" ? "Berabere — tahta doldu" : kazandim ? "Dördünü dizdin, kazandın!" : ad + " dördünü dizdi";
      var ek = "", om = odulOku(d, ME), oo = odulOku(d, OTHER);
      if (kazandim && oo) ek = '<div class="dtodulac"><span>🎁</span><div><small>' + D.esc(ad) + " kaybetti, ödülün:</small><b>" + D.esc(oo) + "</b></div></div>";
      else if (d.kazanan === OTHER && om) ek = '<div class="dtodulac sen"><span>🎁</span><div><small>Ödülü sen vereceksin:</small><b>' + D.esc(om) + "</b></div></div>";
      else if (!d.kazanan && (om || oo)) ek = '<div class="dtodulac"><span>🤝</span><div><small>Berabere — ödüller ikinize de:</small><b>' + D.esc([om, oo].filter(Boolean).join(" · ")) + "</b></div></div>";
      return { kick: "Oyun " + d.n + " · " + (d.hamle || []).length + " hamle", baslik: baslik, metin: "Yeni oyunda ilk taş " + (d.baslayan === ME ? D.ekIn(ad) : "senin") + ".", ek: ek };
    },
    seriKod: function (d) { return d.sonuc === "pes" ? 99 : Math.min(98, (d.hamle || []).length); }
  });
  var G = null, gonderiyor = false, sonCiz = "", dusen = -1, TAS = 21;
  function snd(n) { if (window.SdSes) try { window.SdSes.play(n); } catch (e) {} }
  function odulOku(d, uid) { var o = d && d.odul && d.odul[uid]; return o ? D.coz(o, "dort-odul" + uid) : ""; }
  function odulGirdi(yer) { var L = [].slice.call(document.querySelectorAll('[data-odul="' + yer + '"]')), i = L.filter(function (x) { var o = x.closest && x.closest(".gkover"); return !o || !o.hidden; })[0] || L[0]; var v = i ? String(i.value || "").trim().slice(0, 80) : ""; try { if (v) localStorage.setItem("dt_odul", v); } catch (e) {} return v; }
  /* hamlelerden tahta */
  function tahta(d) { var t = []; for (var i = 0; i < SUT * SAT; i++) t.push(""); (d.hamle || []).forEach(function (h) { var r = bosSatir(t, h.c); if (r >= 0) t[r * SUT + h.c] = h.u; }); return t; }
  function bosSatir(t, c) { for (var r = SAT - 1; r >= 0; r--) if (!t[r * SUT + c]) return r; return -1; }
  function dizi(t, kare) {
    var u = t[kare]; if (!u) return null; var r0 = Math.floor(kare / SUT), c0 = kare % SUT;
    var yonler = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (var y = 0; y < 4; y++) {
      var L = [kare], dr = yonler[y][0], dc = yonler[y][1];
      [1, -1].forEach(function (s) { var r = r0 + dr * s, c = c0 + dc * s; while (r >= 0 && r < SAT && c >= 0 && c < SUT && t[r * SUT + c] === u) { L.push(r * SUT + c); r += dr * s; c += dc * s; } });
      if (L.length >= 4) return L.sort(function (a, b) { return a - b; });
    }
    return null;
  }
  function renk(uid) { var k = uid === D.me ? ((window.Hesap && Hesap.kim()) || {}).kul : D.kul[uid]; return k === "a" ? "a" : "b"; }

  /* tahta kutuları */
  var tb = $("tahta");
  for (var i = 0; i < SUT * SAT; i++) { var h = document.createElement("div"); h.className = "dtk"; h.setAttribute("data-i", i); h.innerHTML = "<i></i>"; tb.appendChild(h); }
  for (var c = 0; c < SUT; c++) { var b = document.createElement("button"); b.type = "button"; b.className = "dtsut"; b.setAttribute("data-c", c); b.style.left = (c / SUT * 100) + "%"; b.setAttribute("aria-label", (c + 1) + ". sütun"); tb.appendChild(b); }
  /* dokunma: basınca hayalet taş o sütunun üstünde belirir, parmak kaydıkça sütun değişir, bırakınca düşer */
  var tut = null;
  function sutunAt(x) { var r = tb.getBoundingClientRect(), c = Math.floor((x - r.left) / r.width * SUT); return Math.max(0, Math.min(SUT - 1, c)); }
  function hayalet(c) {
    var h = $("hayalet"); if (c < 0) { h.hidden = true; h.classList.remove("acik"); return; }
    var r = tb.getBoundingClientRect(), a = $("alan").getBoundingClientRect();
    h.hidden = false; h.style.left = (r.left - a.left + r.width * (c + 0.5) / SUT) + "px"; h.style.top = Math.max(0, r.top - a.top - h.offsetHeight - 10) + "px"; h.style.setProperty("--dt-renk", renk(D.me) === "a" ? "var(--dt-a)" : "var(--dt-b)"); h.classList.add("acik");
  }
  tb.addEventListener("pointerdown", function (e) {
    if (!G || G.bitti || G.sira !== D.me || gonderiyor) return; e.preventDefault();
    var c = sutunAt(e.clientX); tut = { pid: e.pointerId, c: c }; try { tb.setPointerCapture(e.pointerId); } catch (x) {} hayalet(bosSatir(tahta(G), c) >= 0 ? c : -1);
  });
  tb.addEventListener("pointermove", function (e) { if (!tut || e.pointerId !== tut.pid) return; var c = sutunAt(e.clientX); tut.c = c; hayalet(bosSatir(tahta(G), c) >= 0 ? c : -1); });
  function birak(e, iptal) { if (!tut || (e && e.pointerId !== tut.pid)) return; var c = tut.c; tut = null; hayalet(-1); if (!iptal) oyna(c); }
  tb.addEventListener("pointerup", function (e) { birak(e, false); }); tb.addEventListener("pointercancel", function (e) { birak(e, true); });
  addEventListener("keydown", function (e) { var n = +e.key; if (n >= 1 && n <= 7) oyna(n - 1); });

  function yigin(el, n, r) {
    n = Math.max(0, n); var k = n + r; if (el.getAttribute("data-k") === k) return; el.setAttribute("data-k", k);
    var h = ""; for (var i = 0; i < Math.min(n, 21); i++) h += '<i class="' + r + '" style="--i:' + i + '"></i>';
    el.innerHTML = h + "<b>" + n + "</b>";
  }
  function boyut() { var r = tb.getBoundingClientRect(); document.documentElement.style.setProperty("--dt-k", Math.max(24, Math.floor((r.width - 24 - 6 * 7) / 7)) + "px"); }
  function ciz(ilk) {
    if (!G) return;
    var ME = D.me, OTHER = D.other, t = tahta(G), sira = G.sira === ME && !G.bitti, son = (G.hamle || [])[G.hamle.length - 1];
    var ilkAcilis = $("alan").hidden; $("pMe").hidden = false; $("pOther").hidden = false; $("alan").hidden = false; if (ilkAcilis) boyut();
    var anahtar = JSON.stringify([G.n, G.hamle.length, G.bitti]);
    var sonKare = -1; if (son) { var t2 = tahta({ hamle: G.hamle.slice(0, -1) }); sonKare = bosSatir(t2, son.c) * SUT + son.c; }
    [].forEach.call(tb.querySelectorAll(".dtk"), function (el, i) {
      var u = t[i], cls = "dtk" + (u ? " dolu " + renk(u) : "") + (G.cizgi && G.cizgi.indexOf(i) >= 0 ? " dizi" : "") + (i === sonKare ? " son" : "");
      if (el.className.replace(" dus", "") !== cls) {
        var yeni = u && !el.classList.contains("dolu") && i === sonKare && anahtar !== sonCiz && !ilk;
        el.className = cls + (yeni ? " dus" : "");
        if (yeni) el.style.setProperty("--dus", (Math.floor(i / SUT) + 1));
      }
    });
    if (anahtar !== sonCiz && !ilk && son && son.u !== ME && !G.bitti) snd("key");
    sonCiz = anahtar;
    [].forEach.call(tb.querySelectorAll(".dtsut"), function (b) { var c = +b.getAttribute("data-c"); b.disabled = !sira || gonderiyor || bosSatir(t, c) < 0; });
    tb.classList.toggle("benim", sira && !gonderiyor); tb.classList.toggle("onlar", !sira); tb.classList.toggle("bitti", !!G.bitti);
    var adO = D.adlar[OTHER] || "Rakip", benimN = (G.hamle || []).filter(function (h) { return h.u === ME; }).length, onunN = G.hamle.length - benimN;
    yigin($("yiginMe"), TAS - benimN, renk(ME)); yigin($("yiginOther"), TAS - onunN, OTHER ? renk(OTHER) : "a");
    $("siraMe").textContent = G.bitti ? (G.kazanan === ME ? "kazandın 🎉" : G.kazanan ? "kaybettin" : "berabere") : sira ? (G.hamle.length ? "sıra sende" : "ilk taş senin") : "bekliyorsun";
    $("siraOther").textContent = G.bitti ? (G.kazanan === OTHER ? "kazandı" : G.kazanan ? "kaybetti" : "berabere") : G.sira === OTHER ? "düşünüyor…" : "seni bekliyor";
    $("pMe").className = "dttepsi" + (sira ? " on" : "") + (G.bitti && G.kazanan === ME ? " kazanan" : ""); $("pOther").className = "dttepsi karsi" + (!G.bitti && G.sira === OTHER ? " on" : "") + (G.bitti && G.kazanan === OTHER ? " kazanan" : "");
    $("bResign").hidden = G.bitti;
    /* ödül şeridi */
    var om = odulOku(G, ME), oo = !!(G.odul && OTHER && G.odul[OTHER]), adO = D.adlar[OTHER] || "Rakip";
    $("odulBen").innerHTML = om ? "🎁 <b>" + D.esc(om) + "</b>" : G.bitti ? "ödül yok" : "🎁 ödül koy";
    $("odulBen").className = "dtetiket" + (om ? " var" : ""); $("odulBen").title = om ? "Kaybedersen vereceğin ödül · dokun, değiştir" : "";
    $("odulO").innerHTML = oo ? (G.bitti && (G.kazanan === ME || !G.kazanan) ? "🎁 <b>" + D.esc(odulOku(G, OTHER)) + "</b>" : "🎁 gizli ödül") : "ödül yok";
    $("odulO").className = "dtetiket" + (oo ? " var" : "");
    $("odulBen").disabled = !!G.bitti;
  }
  function oyna(c) {
    if (!G || G.bitti || G.sira !== D.me || gonderiyor) return;
    var t = tahta(G); if (bosSatir(t, c) < 0) return;
    var ME = D.me, OTHER = D.other, bitirdi = false, kazandi = false, once = G;
    gonderiyor = true;
    G = JSON.parse(JSON.stringify(G, function (k, v) { return k === "t" && v && typeof v === "object" ? undefined : v; })); G.hamle.push({ u: ME, c: c }); G.sira = OTHER;
    var tt = tahta(G), kare = bosSatir(t, c) * SUT + c, dz = dizi(tt, kare);
    if (dz) { G.bitti = true; G.kazanan = ME; G.cizgi = dz; G.sira = ""; } else if (G.hamle.length >= SUT * SAT) { G.bitti = true; G.kazanan = null; G.sira = ""; }
    ciz(); snd("lock");
    D.db.runTransaction(function (tx) {
      return tx.get(D.ref).then(function (snap) {
        var d = snap.data(); if (!d || d.bitti || d.sira !== ME || d.v !== once.v) throw new Error("sira");
        var h = (d.hamle || []).slice(), t0 = tahta(d), r = bosSatir(t0, c); if (r < 0) throw new Error("dolu");
        h.push({ u: ME, c: c });
        var t1 = tahta({ hamle: h }), z = dizi(t1, r * SUT + c), upd = { hamle: h, v: d.v + 1, t: firebase.firestore.FieldValue.serverTimestamp() };
        if (z) { upd.bitti = true; upd.sonuc = "dizi"; upd.kazanan = ME; upd.cizgi = z; upd.sira = ""; bitirdi = true; kazandi = true; }
        else if (h.length >= SUT * SAT) { upd.bitti = true; upd.sonuc = "berabere"; upd.kazanan = null; upd.sira = ""; bitirdi = true; }
        else upd.sira = OTHER;
        tx.set(D.ref, upd, { merge: true });
      });
    }).then(function () { gonderiyor = false; if (bitirdi) D.bitirenBenim = true; if (kazandi) snd("found"); if (G) ciz(); })
      .catch(function (e) { gonderiyor = false; G = once; ciz(); D.msg(String(e && e.message) === "sira" ? "Sıra sende değil ya da tahta değişti." : "Bağlantı kurulamadı, tekrar dene."); });
  }
  /* ödül yaz / değiştir */
  $("odulBen").onclick = function () { if (!G || G.bitti) return; $("odulIn").value = odulOku(G, D.me) || (function () { try { return localStorage.getItem("dt_odul") || ""; } catch (e) { return ""; } })(); $("odulKart").hidden = false; setTimeout(function () { try { $("odulIn").focus(); } catch (e) {} }, 50); };
  $("odulIptal").onclick = function () { $("odulKart").hidden = true; };
  $("odulKaydet").onclick = function () {
    var v = odulGirdi("oyun"); if (!G || G.bitti) return; $("odulKart").hidden = true;
    var o = {}; o[D.me] = v ? D.gizle(v, "dort-odul" + D.me) : "";
    D.ref.set({ odul: o, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).then(function () { D.msg(v ? "Ödülün kaydedildi; " + (D.adlar[D.other] || "o") + " kazanırsa görecek." : "Ödülü kaldırdın."); snd("plus"); }).catch(function () { D.msg("Kaydedilemedi, tekrar dene."); });
  };
  (function () { try { var v = localStorage.getItem("dt_odul"); if (v) [].forEach.call(document.querySelectorAll('[data-odul="start"]'), function (i) { i.value = v; }); } catch (e) {} })();
  $("bResign").onclick = function () { if (!G || G.bitti) return; $("confirm").hidden = false; };
  $("confirmNo").onclick = function () { $("confirm").hidden = true; };
  $("confirmYes").onclick = function () {
    $("confirm").hidden = true; if (!G || G.bitti) return; D.bitirenBenim = true;
    D.ref.set({ bitti: true, sonuc: "pes", kazanan: D.other, sira: "", cizgi: null, v: (G.v || 0) + 1, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () { D.bitirenBenim = false; D.msg("Olmadı, tekrar dene."); });
  };
  if (location.hash === "#test") window.__dt = { state: function () { return { G: G, me: D.me, other: D.other, tahta: G ? tahta(G) : [] }; }, oyna: oyna, yeni: D.yeniOyun, odul: function (v) { $("odulIn").value = v; $("odulKaydet").onclick(); } };
  addEventListener("resize", function () { if (G) boyut(); });
})();
