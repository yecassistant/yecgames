/* Kelime Avı – iki kişilik (kelimeavi/mac, kelimeavi/seri). Ortak altyapı: duello.js. Sözlük: kelimeavi-sozluk.js
   mac = { n, v, a, b, harf: "16 harf", sure: 90, oy: { uid: { k: [kelimeler], p: puan, bas: ms, bitti } }, bitti, sonuc: "puan", kazanan, t }
   İkimize aynı tablo gelir; herkes kendi zamanında 90 saniye oynar. İkimiz de bitirince puanlar karşılaştırılır.
   Kurallar: komşu harfler (çapraz da) birleştirilir, aynı harf kutusu bir kelimede bir kez; en az 3 harf; sözlükte yalın hali olan kelimeler ve fiil kökleri. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var SURE = 90, PUAN = { 3: 100, 4: 200, 5: 400, 6: 800, 7: 1400, 8: 2000 };
  function puanOf(w) { return PUAN[Math.min(8, w.length)] || 0; }
  function buyuk(s) { return String(s).toLocaleUpperCase("tr-TR"); }
  function nokta(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

  /* ---- sözlük ve çözücü ---- */
  var SZ = window.KA_SOZLUK || { Y: "", N: "" }, YAYGIN = {}, GECER = {}, KOK = {};
  SZ.Y.split(" ").forEach(function (w) { if (w) { YAYGIN[w] = 1; GECER[w] = 1; } });
  SZ.N.split(" ").forEach(function (w) { if (w) GECER[w] = 1; });
  /* önek ağacı yerine önek kümesi: çözücü yolu erken keser */
  Object.keys(GECER).forEach(function (w) { for (var i = 1; i < w.length; i++) KOK[w.slice(0, i)] = 1; });
  function komsu(i) { var x = i % 4, y = i >> 2, o = []; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; var X = x + dx, Y = y + dy; if (X >= 0 && X < 4 && Y >= 0 && Y < 4) o.push(Y * 4 + X); } return o; }
  var KOMSU = []; for (var q = 0; q < 16; q++) KOMSU.push(komsu(q));
  function coz(harf) {
    var bul = {};
    function git(i, s, yol, gor) {
      s += harf[i]; if (!KOK[s] && !GECER[s]) return;
      gor[i] = 1; yol.push(i);
      if (s.length >= 3 && GECER[s] && !bul[s]) bul[s] = yol.slice();
      if (KOK[s]) KOMSU[i].forEach(function (j) { if (!gor[j]) git(j, s, yol, gor); });
      gor[i] = 0; yol.pop();
    }
    for (var i = 0; i < 16; i++) git(i, "", [], {});
    return bul;
  }
  /* tablo üretimi: Türkçe harf sıklığına göre, en az 6 sesli; yaygın kelimesi bol olanı seç */
  var SIKLIK = "a12 e9 i8 n7 r7 l6 ı5 k5 d5 m4 y3 u3 t3 s3 b3 o3 ü2 ş2 z2 g1 ç1 h1 ğ1 v1 c1 ö1 p1 f1";
  var TORBA = ""; SIKLIK.split(" ").forEach(function (p) { for (var k = 0; k < +p.slice(1); k++) TORBA += p[0]; });
  var SESLI = "aeıioöuü";
  function tabloUret() {
    var en = null;
    for (var t = 0; t < 70; t++) {
      var h = ""; for (var i = 0; i < 16; i++) h += TORBA[Math.floor(Math.random() * TORBA.length)];
      var ses = 0, sayi = {}; for (i = 0; i < 16; i++) { if (SESLI.indexOf(h[i]) >= 0) ses++; sayi[h[i]] = (sayi[h[i]] || 0) + 1; }
      if (ses < 6 || ses > 9 || Object.keys(sayi).some(function (c) { return sayi[c] > 3; }) || (sayi["ğ"] || 0) > 1) continue;
      var b = coz(h), y = Object.keys(b).filter(function (w) { return YAYGIN[w]; }), uzun = y.filter(function (w) { return w.length >= 5; }).length;
      var skor = y.length + uzun * 3;
      if (!en || skor > en.skor) en = { h: h, skor: skor, n: y.length };
      if (en.n >= 45 && uzun >= 6) break;
    }
    return en.h;
  }

  /* ---- duello ---- */
  var D = window.Duello({
    kol: "kelimeavi", sayfa: "kelimeavi", sub: "sub", ses: "SdSes", helpKey: "ka_help",
    startText: "İkinize aynı 4×4 harf tablosu gelir. Herkes kendi zamanında 90 saniye kelime avlar; ikiniz de bitirince puanlar karşılaştırılır.",
    yeniDoc: function (d, ME, OTHER) { return { a: ME, b: OTHER, harf: tabloUret(), sure: SURE, oy: {}, sonuc: "" }; },
    onMac: function (d, ilk) { G = d; if (ilk) { benimKel = null; tur = false; } ciz(); },
    onYok: function () { G = null; ["oyun", "bekle", "ozet", "hazir"].forEach(function (id) { $(id).hidden = true; }); },
    bitisGecikme: 300,
    bitis: function (d) {
      var ME = D.me, OT = D.other, ad = D.adlar[OT] || "Rakip", oy = d.oy || {}, a = (oy[ME] || {}).p || 0, b = (oy[OT] || {}).p || 0;
      return { kick: "Oyun " + d.n, baslik: !d.kazanan ? "Berabere!" : d.kazanan === ME ? "Kazandın!" : ad + " kazandı", metin: nokta(a) + " – " + nokta(b) + " · " + ((oy[ME] || {}).k || []).length + " kelimeye karşı " + ((oy[OT] || {}).k || []).length + " kelime." };
    },
    seriKod: function (d) { var oy = d.oy || {}; return Math.min(98, ((oy[D.me] || {}).k || []).length); }
  });
  var G = null, benimKel = null, tur = false, kalanT = null, kayitT = null, bulunanSet = {};
  function snd(n) { if (window.SdSes) try { window.SdSes.play(n); } catch (e) {} }
  function benimOy() { return (G && G.oy && G.oy[D.me]) || null; }
  function onunOy() { return (G && G.oy && G.oy[D.other]) || null; }
  function lsKey() { return "ka_bas_" + (G ? G.n : 0) + "_" + D.me; }
  function lsKel() { return "ka_kel_" + (G ? G.n : 0) + "_" + D.me; }

  /* tabloyu kur */
  var tb = $("tablo"), hucre = [];
  for (var i = 0; i < 16; i++) { var c = document.createElement("div"); c.className = "kah"; c.setAttribute("data-i", i); c.innerHTML = "<span></span>"; tb.appendChild(c); hucre.push(c); }
  var izSvg = $("iz"), izYol = $("izYol");

  function ciz() {
    if (!G) return;
    var ben = benimOy(), o = onunOy(), ad = D.adlar[D.other] || "O";
    $("ozet").hidden = true; $("bekle").hidden = true; $("hazir").hidden = true; $("oyun").hidden = true;
    hucre.forEach(function (h, i) { h.firstChild.textContent = buyuk(G.harf[i]); });
    if (G.bitti) { ozetCiz(); return; }
    if (ben && ben.bitti) { bekleCiz(); return; }
    var bas = ben && ben.bas ? ben.bas : +localStorageGet(lsKey()) || 0;
    if (bas) { turaDevam(bas); return; }
    /* hazır ekranı */
    $("hazir").hidden = false;
    $("hzOn").textContent = o && o.bitti ? ad + " oynadı: " + nokta(o.p || 0) + " puan, " + (o.k || []).length + " kelime. Sıra sende!" : o && o.bas ? ad + " şu an oynuyor olabilir; sen de başlayabilirsin." : "Sen başla, " + ad + " de kendi zamanında oynasın.";
  }
  function localStorageGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function localStorageSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---- tur ---- */
  $("hzGo").onclick = function () {
    if (!G || G.bitti) return;
    var bas = Date.now(); localStorageSet(lsKey(), bas);
    benimKel = []; kaydet(true, bas);
    turaDevam(bas); snd("lock");
  };
  function turaDevam(bas) {
    var ben = benimOy();
    if (!benimKel) {
      benimKel = (ben && ben.k ? ben.k.slice() : []);
      /* kayıt gecikmişse yerelde duran kelimeleri de al (sayfa yenilenince kaybolmasın) */
      var yerel = []; try { yerel = JSON.parse(localStorageGet(lsKel()) || "[]"); } catch (e) {}
      var eksik = false; yerel.forEach(function (w) { if (GECER[w] && benimKel.indexOf(w) < 0) { benimKel.push(w); eksik = true; } });
      if (eksik) kaydet(true, bas);
    }
    bulunanSet = {}; benimKel.forEach(function (w) { bulunanSet[w] = 1; });
    tur = true; $("oyun").hidden = false; $("hazir").hidden = true;
    listeCiz(); puanCiz();
    clearInterval(kalanT);
    function tik() {
      var k = SURE - (Date.now() - bas) / 1000;
      $("sureCubuk").style.width = Math.max(0, k / SURE * 100) + "%";
      $("sureYazi").textContent = Math.max(0, Math.ceil(k)) <= 0 ? "0:00" : "0:" + ("0" + Math.ceil(k)).slice(-2).replace(/^0(\d\d)$/, "$1");
      if (k >= 60) $("sureYazi").textContent = "1:" + ("0" + Math.ceil(k - 60)).slice(-2);
      $("sureYazi").classList.toggle("az", k <= 10);
      if (k <= 0) { clearInterval(kalanT); bitir(); }
    }
    tik(); kalanT = setInterval(tik, 250);
  }
  function puan(list) { return list.reduce(function (s, w) { return s + puanOf(w); }, 0); }
  function puanCiz() {
    $("puanBen").textContent = nokta(puan(benimKel || [])); $("kelSay").textContent = (benimKel || []).length + " kelime";
    var o = onunOy(); $("puanO").textContent = o && o.bitti ? (D.adlar[D.other] || "O") + " " + nokta(o.p || 0) + " · bitirdi" : o && o.bas ? (D.adlar[D.other] || "O") + " oynuyor" : (D.adlar[D.other] || "O") + " henüz oynamadı";
  }
  function listeCiz() {
    var L = (benimKel || []).slice().reverse();
    $("bulunan").innerHTML = L.map(function (w, j) { return '<span class="kacip' + (j === 0 ? " yeni" : "") + '">' + D.esc(buyuk(w)) + "</span>"; }).join("");
  }
  function kaydet(hemen, bas) {
    clearTimeout(kayitT);
    function yap() {
      if (!G) return;
      var ben = benimOy() || {}, v = { k: benimKel || [], p: puan(benimKel || []), bas: bas || ben.bas || +localStorageGet(lsKey()) || Date.now(), bitti: false };
      var up = { oy: {} }; up.oy[D.me] = v;
      D.ref.set(up, { merge: true }).catch(function () { D.msg("Kaydedilemedi, bağlantına bak."); });
    }
    if (hemen) yap(); else kayitT = setTimeout(yap, 700);
  }
  var bitiyor = false;
  function bitir() {
    if (!G || bitiyor) return; bitiyor = true; tur = false; birak(true);
    var ME = D.me, OT = D.other, list = benimKel || [], p = puan(list);
    snd("found");
    D.db.runTransaction(function (tx) {
      return tx.get(D.ref).then(function (snap) {
        var d = snap.data(); if (!d || d.n !== G.n) throw new Error("degisti");
        var oy = d.oy || {}, ben = oy[ME] || {}, o = oy[OT] || {};
        var nb = { k: list, p: p, bas: ben.bas || +localStorageGet(lsKey()) || Date.now(), bitti: true };
        var up = { oy: {}, v: (d.v || 0) + 1, t: firebase.firestore.FieldValue.serverTimestamp() }; up.oy[ME] = nb;
        if (o.bitti && !d.bitti) {
          var op = o.p || 0; up.bitti = true; up.sonuc = "puan"; up.kazanan = p > op ? ME : op > p ? OT : null; D.bitirenBenim = true;
        }
        tx.set(D.ref, up, { merge: true });
      });
    }).then(function () { bitiyor = false; }).catch(function () { bitiyor = false; D.msg("Bağlantı yok; tekrar denenecek."); setTimeout(function () { if (G && !(benimOy() || {}).bitti) bitir(); }, 4000); });
  }

  /* ---- sürükleme ---- */
  var yol = [], basili = false;
  function hucreAt(x, y) {
    var r = tb.getBoundingClientRect(), w = r.width / 4, cx = Math.floor((x - r.left) / w), cy = Math.floor((y - r.top) / w);
    if (cx < 0 || cx > 3 || cy < 0 || cy > 3) return -1;
    var mx = r.left + (cx + 0.5) * w, my = r.top + (cy + 0.5) * w;
    return Math.hypot(x - mx, y - my) <= w * 0.42 ? cy * 4 + cx : -1;      /* köşelerden geçerken yanlış kutu seçilmesin */
  }
  function yolCiz() {
    hucre.forEach(function (h, i) { h.classList.toggle("sec", yol.indexOf(i) >= 0); });
    var s = yol.map(function (i) { return G.harf[i]; }).join("");
    $("kelime").textContent = buyuk(s); $("kelime").className = "kakel" + (s ? " var" : "");
    var pts = yol.map(function (i) { return ((i % 4) * 100 + 50) + "," + ((i >> 2) * 100 + 50); }).join(" ");
    izYol.setAttribute("points", pts);
  }
  function ekle(i) {
    if (i < 0) return;
    var son = yol[yol.length - 1];
    if (yol.length >= 2 && yol[yol.length - 2] === i) { yol.pop(); yolCiz(); return; }     /* geri gidince son harf silinir */
    if (yol.indexOf(i) >= 0) return;
    if (son !== undefined && KOMSU[son].indexOf(i) < 0) return;
    yol.push(i); yolCiz(); snd("key");
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
  }
  function birak(sessiz) {
    if (!basili && !yol.length) return;
    basili = false;
    var s = yol.map(function (i) { return G.harf[i]; }).join(""), secili = yol.slice();
    yol = [];
    if (!sessiz && s.length) degerlendir(s, secili);
    setTimeout(function () { if (!basili) { hucre.forEach(function (h) { h.classList.remove("sec", "iyi", "kotu", "ayni"); }); izYol.setAttribute("points", ""); } }, 260);
  }
  function degerlendir(s, secili) {
    var cls, mesaj;
    if (s.length < 3) { cls = "kotu"; mesaj = "en az 3 harf"; }
    else if (bulunanSet[s]) { cls = "ayni"; mesaj = "zaten buldun"; }
    else if (!GECER[s]) { cls = "kotu"; mesaj = "sözlükte yok"; }
    else {
      cls = "iyi"; bulunanSet[s] = 1; benimKel.push(s); mesaj = "+" + puanOf(s); localStorageSet(lsKel(), JSON.stringify(benimKel));
      listeCiz(); puanCiz(); kaydet(false); snd(s.length >= 5 ? "found" : "plus");
      try { if (navigator.vibrate) navigator.vibrate(s.length >= 5 ? [20, 40, 30] : 18); } catch (e) {}
    }
    secili.forEach(function (i) { hucre[i].classList.add(cls); });
    var k = $("kelime"); k.textContent = buyuk(s); k.className = "kakel var " + cls; $("kaMesaj").textContent = mesaj; $("kaMesaj").className = "kames " + cls;
    clearTimeout(degerlendir.t); degerlendir.t = setTimeout(function () { if (!basili) { k.textContent = ""; k.className = "kakel"; $("kaMesaj").textContent = ""; } }, 900);
  }
  tb.addEventListener("pointerdown", function (e) {
    if (!tur) return; e.preventDefault(); basili = true; yol = [];
    hucre.forEach(function (h) { h.classList.remove("iyi", "kotu", "ayni"); });
    try { tb.setPointerCapture(e.pointerId); } catch (x) {}
    ekle(hucreAt(e.clientX, e.clientY));
  });
  tb.addEventListener("pointermove", function (e) { if (basili && tur) ekle(hucreAt(e.clientX, e.clientY)); });
  tb.addEventListener("pointerup", function () { birak(false); });
  tb.addEventListener("pointercancel", function () { birak(false); });
  $("kaBitir").onclick = function () { if (tur) { $("erken").hidden = false; } };
  $("erkenEvet").onclick = function () { $("erken").hidden = true; clearInterval(kalanT); bitir(); };
  $("erkenHayir").onclick = function () { $("erken").hidden = true; };

  /* ---- bekleme ve sonuç ---- */
  function bekleCiz() {
    clearInterval(kalanT); tur = false;
    var ben = benimOy() || {}, o = onunOy(), ad = D.adlar[D.other] || "O";
    $("bekle").hidden = false;
    $("bkPuan").textContent = nokta(ben.p || 0); $("bkSay").textContent = (ben.k || []).length + " kelime";
    $("bkYazi").textContent = o && o.bas ? ad + " oynuyor; bitirince sonuçlar açılır." : ad + " henüz oynamadı. O da oynayınca kimin neyi bulduğunu göreceksiniz.";
    $("bkListe").innerHTML = (ben.k || []).slice().sort(function (x, y) { return y.length - x.length || (x < y ? -1 : 1); }).map(function (w) { return '<span class="kacip">' + D.esc(buyuk(w)) + "</span>"; }).join("");
  }
  var tumYol = null;
  function ozetCiz() {
    clearInterval(kalanT); tur = false;
    var oy = G.oy || {}, ben = oy[D.me] || {}, o = oy[D.other] || {}, ad = D.adlar[D.other] || "O";
    var A = {}, B = {}; (ben.k || []).forEach(function (w) { A[w] = 1; }); (o.k || []).forEach(function (w) { B[w] = 1; });
    tumYol = coz(G.harf);
    var ikimiz = Object.keys(A).filter(function (w) { return B[w]; }), sadeceBen = Object.keys(A).filter(function (w) { return !B[w]; }), sadeceO = Object.keys(B).filter(function (w) { return !A[w]; });
    var kacan = Object.keys(tumYol).filter(function (w) { return YAYGIN[w] && !A[w] && !B[w]; }).sort(function (x, y) { return y.length - x.length; }).slice(0, 14);
    function sirala(L) { return L.sort(function (x, y) { return y.length - x.length || (x < y ? -1 : 1); }); }
    function cipler(L, cls) { return L.length ? sirala(L).map(function (w) { return '<button type="button" class="kacip ' + cls + '" data-w="' + D.esc(w) + '">' + D.esc(buyuk(w)) + '<small>' + puanOf(w) + "</small></button>"; }).join("") : '<span class="kabos">—</span>'; }
    $("ozet").hidden = false;
    $("ozAvaBen").textContent = (D.adlar[D.me] || "S").charAt(0).toUpperCase(); $("ozAvaBen").className = "hsava " + D.me;
    $("ozAvaO").textContent = ad.charAt(0).toUpperCase(); $("ozAvaO").className = "hsava " + D.other;
    $("ozBenP").textContent = nokta(ben.p || 0); $("ozOP").textContent = nokta(o.p || 0);
    $("ozBenK").textContent = (ben.k || []).length + " kelime"; $("ozOK").textContent = (o.k || []).length + " kelime";
    $("ozBen").classList.toggle("kazandi", G.kazanan === D.me); $("ozO").classList.toggle("kazandi", G.kazanan === D.other);
    $("ozAdO").textContent = ad; $("ozSadeceOBas").textContent = "Sadece " + ad;
    $("ozIkimiz").innerHTML = cipler(ikimiz, ""); $("ozSadeceBen").innerHTML = cipler(sadeceBen, "ben"); $("ozSadeceO").innerHTML = cipler(sadeceO, "o"); $("ozKacan").innerHTML = cipler(kacan, "kac");
    /* küçük tablo */
    var mt = $("miniTablo"); mt.innerHTML = G.harf.split("").map(function (h, i) { return '<span data-i="' + i + '">' + buyuk(h) + "</span>"; }).join("");
  }
  $("ozet").addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".kacip[data-w]") : null; if (!b || !tumYol) return;
    var p = tumYol[b.getAttribute("data-w")] || [];
    [].forEach.call($("miniTablo").children, function (s, i) { s.className = p.indexOf(i) >= 0 ? (p[0] === i ? "on ilk" : "on") : ""; });
    [].forEach.call(document.querySelectorAll("#ozet .kacip.secili"), function (x) { x.classList.remove("secili"); }); b.classList.add("secili");
    snd("key");
  });
  $("ozYeni").onclick = function () { D.yeniOyun(); };

  /* sayfa arka plana giderse sürükleme yarım kalmasın */
  document.addEventListener("visibilitychange", function () { if (document.hidden) birak(true); });
  if (location.hash === "#test") window.__ka = { coz: coz, tabloUret: tabloUret, gecer: function (w) { return !!GECER[w]; }, yaygin: function (w) { return !!YAYGIN[w]; }, durum: function () { return { G: G, tur: tur, kel: benimKel, me: D.me, other: D.other }; }, sec: function (idx) { basili = true; yol = []; idx.forEach(function (i) { ekle(i); }); birak(false); }, bitir: function () { clearInterval(kalanT); bitir(); }, yeni: D.yeniOyun };
})();
