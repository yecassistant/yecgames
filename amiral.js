/* Amiral Battı – iki kişilik (amiral/mac, amiral/seri). Ortak altyapı: duello.js.
   mac = { n, v, a, b, baslayan, surum: 2, yer: {uid: karıştırılmış diziliş JSON}, hazir: {uid: bool}, atis: {uid: [{c: kare 0-99, v: vurdu, b: batan gemi id|""}]}, sira: uid|"", bitti, sonuc "batti"|"pes", kazanan, t }
   Diziliş (surum 2): [{id, r, c, o}] — o: şeklin yön indeksi. Eski oyunlar (surum yok): [{id, r, c, d:"h"|"v"}], beş düz gemi.
   Filo (surum 2): uçak gemisi 5, zırhlı 4, kruvazör T (3+1 ortada çıkıntı), denizaltı L (3+1 uçta çıkıntı), muhrip 2. Vuran bir daha atar. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var HARF = "ABCDEFGHIJ";
  function duz(n) { var L = []; for (var i = 0; i < n; i++) L.push([0, i]); return L; }
  var FILO2 = [
    { id: "u", ad: "Uçak gemisi", sekil: duz(5) },
    { id: "z", ad: "Zırhlı", sekil: duz(4) },
    { id: "k", ad: "Kruvazör", sekil: [[0, 0], [0, 1], [0, 2], [1, 1]], ayna: false },
    { id: "d", ad: "Denizaltı", sekil: [[0, 0], [0, 1], [0, 2], [1, 2]], ayna: true },
    { id: "m", ad: "Muhrip", sekil: duz(2) }
  ];
  var FILO1 = [
    { id: "u", ad: "Uçak gemisi", sekil: duz(5) }, { id: "z", ad: "Zırhlı", sekil: duz(4) }, { id: "k", ad: "Kruvazör", sekil: duz(3) }, { id: "d", ad: "Denizaltı", sekil: duz(3) }, { id: "m", ad: "Muhrip", sekil: duz(2) }
  ];
  /* her şeklin bütün yönleri (döndür + gerekirse ayna), sol üste yaslanmış, tekrarsız */
  function yonler(gm) {
    var out = [], gor = {};
    function ekle(L) { var mr = Infinity, mc = Infinity; L.forEach(function (p) { mr = Math.min(mr, p[0]); mc = Math.min(mc, p[1]); }); var N = L.map(function (p) { return [p[0] - mr, p[1] - mc]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }); var k = JSON.stringify(N); if (!gor[k]) { gor[k] = 1; out.push(N); } }
    var aynalar = gm.ayna ? [gm.sekil, gm.sekil.map(function (p) { return [p[0], -p[1]]; })] : [gm.sekil];
    aynalar.forEach(function (S) { var L = S; for (var r = 0; r < 4; r++) { ekle(L); L = L.map(function (p) { return [p[1], -p[0]]; }); } });
    return out;
  }
  [FILO1, FILO2].forEach(function (F) { F.forEach(function (g) { g.yon = yonler(g); g.n = g.sekil.length; }); });
  var FILO = FILO2;
  function toplam() { return FILO.reduce(function (s, g) { return s + g.n; }, 0); }
  function gemiTip(id) { for (var i = 0; i < FILO.length; i++) if (FILO[i].id === id) return FILO[i]; return null; }
  function gemiAd(id) { var g = gemiTip(id); return g ? g.ad : "gemi"; }
  function ofsetler(g) {                                                /* geminin hücre ofsetleri (eski biçim h/v de) */
    var t = gemiTip(g.id); if (!t) return [];
    if (g.d) return g.d === "h" ? t.sekil.map(function (p) { return [0, p[1]]; }) : t.sekil.map(function (p) { return [p[1], 0]; });
    return t.yon[((g.o || 0) % t.yon.length + t.yon.length) % t.yon.length];
  }
  function hucreler(g) { return ofsetler(g).map(function (p) { return (g.r + p[0]) * 10 + g.c + p[1]; }); }
  function sigar(g, digerleri) {
    var of = ofsetler(g); if (!of.length) return false;
    for (var i = 0; i < of.length; i++) { var r = g.r + of[i][0], c = g.c + of[i][1]; if (r < 0 || r > 9 || c < 0 || c > 9) return false; }
    var dolu = {}; digerleri.forEach(function (o) { if (o.id !== g.id) hucreler(o).forEach(function (c) { dolu[c] = 1; }); });
    return hucreler(g).every(function (c) { return !dolu[c]; });
  }
  function rastgele() {
    var out = [];
    FILO.forEach(function (gm) {
      for (var dene = 0; dene < 800; dene++) {
        var g = { id: gm.id, r: Math.floor(Math.random() * 10), c: Math.floor(Math.random() * 10), o: Math.floor(Math.random() * gm.yon.length) };
        if (sigar(g, out)) { out.push(g); return; }
      }
    });
    return out.length === FILO.length ? out : rastgele();
  }
  function kareAd(c) { return HARF.charAt(Math.floor(c / 10)) + (c % 10 + 1); }
  function gemiHaritasi(diz) { var m = {}; (diz || []).forEach(function (g) { hucreler(g).forEach(function (c) { m[c] = g.id; }); }); return m; }

  var D = window.Duello({
    kol: "amiral", sayfa: "amiral", sub: "sub", ses: "AbSes",
    startText: "İkimiz de gemilerimizi dizeriz, sonra sırayla atış. Vuran bir daha atar; ilk atış sırası oyun oyun değişir.",
    yeniDoc: function (d, ME, OTHER) {
      var baslayan = d && d.baslayan ? (d.baslayan === ME ? OTHER : ME) : ME, yer = {}, hazir = {}, atis = {};
      yer[ME] = ""; yer[OTHER] = ""; hazir[ME] = false; hazir[OTHER] = false; atis[ME] = []; atis[OTHER] = [];
      return { a: ME, b: OTHER, baslayan: baslayan, surum: 2, yer: yer, hazir: hazir, atis: atis, sira: "" };
    },
    onMac: onMac, onYok: function () { G = null; $("score").hidden = true; dugmeler(); },
    bitis: function (d) {
      var ME = D.me, OTHER = D.other, ad = D.adlar[OTHER] || "Rakip", kazandim = d.kazanan === ME, am = (d.atis[ME] || []), ao = (d.atis[OTHER] || []);
      var vm = am.filter(function (x) { return x.v; }).length, vo = ao.filter(function (x) { return x.v; }).length;
      var baslik = d.sonuc === "pes" ? (kazandim ? ad + " pes etti — kazandın" : "Pes ettin") : kazandim ? "Amiral battı! Kazandın" : ad + " filonu batırdı";
      return { kick: "Oyun " + d.n + " bitti", baslik: baslik, metin: "Sen " + am.length + " atışta " + vm + " vurdun, " + ad + " " + ao.length + " atışta " + vo + ". Yeni oyunda ilk atış " + (d.baslayan === ME ? D.ekIn(ad) : "senin") + "." };
    },
    seriKod: function (d) { return d.sonuc === "pes" ? 99 : Math.min(98, (d.atis[d.kazanan] || []).length); },
    bitisGecikme: function () { return (kuyruk.length + (oynatiyor ? 1 : 0)) * 760 + 900; }
  });
  var G = null, yerel = null, secili = -1, gonderiyor = false, kuyruk = [], oynatiyor = false, gosterilen = 0, sonBenim = -1, sonOnun = -1;
  function seenOku(n) { try { var j = JSON.parse(localStorage.getItem("ab_seen") || "null"); return j && j.n === n ? j.k | 0 : 0; } catch (e) { return 0; } }
  function seenYaz(n, k) { try { localStorage.setItem("ab_seen", JSON.stringify({ n: n, k: k })); } catch (e) {} }
  function snd(n) { if (window.AbSes) try { window.AbSes.play(n); } catch (e) {} }
  function dizilis(d, uid) { if (!d.yer || !d.yer[uid]) return null; try { var j = JSON.parse(D.coz(d.yer[uid], "amiral" + d.n + uid)); return j && j.length === FILO.length ? j : null; } catch (e) { return null; } }

  /* ---- ızgaralar: hücre = gövde katmanı + işaret katmanı ---- */
  var grid = $("grid"), mini = $("mini"), K = [], KM = [];
  function hucreYap(kap, etiket) {
    var b = document.createElement(etiket); if (etiket === "button") b.type = "button";
    b.className = "abc"; b.innerHTML = '<s></s><b></b>'; kap.appendChild(b); return b;
  }
  for (var i = 0; i < 100; i++) { var b = hucreYap(grid, "button"); b.setAttribute("data-c", i); b.setAttribute("aria-label", kareAd(i)); K.push(b); var s = hucreYap(mini, "span"); s.setAttribute("data-c", i); KM.push(s); }
  [["colsA", "rowsA"], ["colsB", "rowsB"]].forEach(function (p) {
    var cs = $(p[0]), rs = $(p[1]); if (!cs) return;
    for (var j = 0; j < 10; j++) { var x = document.createElement("i"); x.textContent = j + 1; cs.appendChild(x); var y = document.createElement("i"); y.textContent = HARF.charAt(j); rs.appendChild(y); }
  });
  function fit() {
    var vh = (window.visualViewport && window.visualViewport.height) || innerHeight;
    var bs = getComputedStyle(document.body), pt = parseFloat(bs.paddingTop) || 0, pb = parseFloat(bs.paddingBottom) || 0;
    $("stage").style.height = Math.max(360, vh - pt - pb) + "px";
    var wrap = $("wrap"), w = wrap.clientWidth, h = wrap.clientHeight, yan = w >= 600 && w > h * 1.15, miniAcik = !mini.hidden;
    wrap.classList.toggle("yan", yan); wrap.classList.toggle("ikili", miniAcik);
    var k = yan ? Math.min((w - 60) / (10.7 + 6.2), (h - 40) / 10.7) : Math.min((w - 16) / 10.7, (h - 60) / (10.7 + (miniAcik ? 6.2 : 2.2)));
    k = Math.max(18, Math.min(46, Math.floor(k)));
    var kok = document.documentElement.style;
    kok.setProperty("--ab-k", k + "px");
    for (var dene = 0; dene < 30 && k > 18 && (wrap.scrollHeight > wrap.clientHeight + 1 || wrap.scrollWidth > wrap.clientWidth + 1); dene++) { k--; kok.setProperty("--ab-k", k + "px"); }
  }
  addEventListener("resize", fit); addEventListener("orientationchange", function () { setTimeout(fit, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", fit);
  function asama() { if (!G) return "kur"; if (G.bitti) return "bitti"; if (!G.hazir || !G.hazir[D.me]) return "yer"; if (!G.hazir[D.other]) return "bekle"; return "oyun"; }

  /* gövde birleşimi: aynı gemiden komşu hücreye doğru "bağ" sınıfları */
  function bag(harita, c) {
    var id = harita[c]; if (!id) return ""; var r = Math.floor(c / 10), k = c % 10, s = "";
    if (r > 0 && harita[c - 10] === id) s += " bn"; if (r < 9 && harita[c + 10] === id) s += " bs";
    if (k > 0 && harita[c - 1] === id) s += " bw"; if (k < 9 && harita[c + 1] === id) s += " be";
    return s;
  }
  function ciz() {
    var ME = D.me, OTHER = D.other, a = asama(); if (!G) return;
    if ($("score").hidden) { $("score").hidden = false; }
    var am = (G.atis && G.atis[ME]) || [], ao = ((G.atis && OTHER && G.atis[OTHER]) || []).slice(0, gosterilen);
    var benimDiz = a === "yer" ? yerel : dizilis(G, ME), onunDiz = G.bitti ? dizilis(G, OTHER) : null;
    var benimH = gemiHaritasi(benimDiz), onunTumH = gemiHaritasi(dizilis(G, OTHER));
    var vurMe = {}, batanOnun = {}; am.forEach(function (x) { vurMe[x.c] = x.v ? 2 : 1; if (x.b) batanOnun[x.b] = 1; });
    var vurOt = {}, batanBenim = {}; ao.forEach(function (x) { vurOt[x.c] = x.v ? 2 : 1; if (x.b) batanBenim[x.b] = 1; });
    /* rakipte görünür gemiler: batanlar (oyunda) ya da hepsi (bitince) */
    var onunGor = {}; Object.keys(onunTumH).forEach(function (c) { var id = onunTumH[c]; if (batanOnun[id] || (G.bitti && onunDiz)) onunGor[c] = id; });
    sonBenim = am.length ? am[am.length - 1].c : -1; sonOnun = ao.length ? ao[ao.length - 1].c : -1;
    var sr = secili >= 0 ? Math.floor(secili / 10) : -1, sk = secili >= 0 ? secili % 10 : -1, oyun = a === "oyun" || a === "bitti";
    for (var c = 0; c < 100; c++) {
      var cls = "abc";
      if (!oyun) { if (benimH[c]) cls += " gemi" + bag(benimH, c) + (a === "yer" ? " sec" : ""); }
      else {
        if (onunGor[c]) cls += " gemi batik" + bag(onunGor, c) + (G.bitti && !batanOnun[onunGor[c]] ? " sag" : "");
        if (vurMe[c] === 2) cls += " vur"; else if (vurMe[c] === 1) cls += " iska";
        if (c === sonBenim) cls += " son";
        if (a === "oyun" && secili >= 0) { if (c === secili) cls += " nisan"; else if (Math.floor(c / 10) === sr || c % 10 === sk) cls += " hiza"; }
      }
      if (K[c].className !== cls) K[c].className = cls;
      K[c].disabled = !(a === "oyun" && G.sira === ME && !gonderiyor && !oynatiyor && !vurMe[c]) && a !== "yer";
      var cm = "abc" + (benimH[c] ? " gemi" + bag(benimH, c) + (batanBenim[benimH[c]] ? " batik" : "") : "") + (vurOt[c] === 2 ? " vur" : vurOt[c] === 1 ? " iska" : "") + (c === sonOnun ? " son" : "");
      if (KM[c].className !== cm) KM[c].className = cm;
    }
    grid.classList.toggle("yerles", a === "yer"); grid.classList.toggle("atesli", a === "oyun" && G.sira === ME && !oynatiyor);
    $("mainLbl").textContent = a === "yer" ? "Filonu diz" : a === "bekle" ? "Filon hazır" : (D.adlar[OTHER] ? D.ekIn(D.adlar[OTHER]) : "Rakibin") + " suları";
    $("mainSag").textContent = a === "yer" ? "sürükle · dokun: döndür" : oyun ? am.length + " atış · " + am.filter(function (x) { return x.v; }).length + "/" + toplam() + " isabet" : "";
    $("miniLbl").textContent = "Senin filon";
    var miniGizli = !oyun; if ($("yanPano").hidden !== miniGizli) { $("yanPano").hidden = miniGizli; mini.hidden = miniGizli; fit(); }
    /* filo listesi: yerleştirmede kendi gemilerim, oyunda rakibin gemileri (batanlar üstü çizili) */
    var gl = $("ships"), filoHTML = FILO.map(function (g) {
      var batti = oyun && batanOnun[g.id], benimBatti = oyun && batanBenim[g.id];
      var of = g.yon[0], w = 0, h = 0; of.forEach(function (p) { h = Math.max(h, p[0] + 1); w = Math.max(w, p[1] + 1); });
      var ikon = '<span class="abik" style="--w:' + w + ';--h:' + h + '">' + of.map(function (p) { return '<i style="grid-row:' + (p[0] + 1) + ";grid-column:" + (p[1] + 1) + '"></i>'; }).join("") + "</span>";
      return '<li class="' + (batti ? "batti" : "") + (benimBatti ? " benim" : "") + '">' + ikon + "<b>" + g.ad + "</b>" + (batti ? "<em>battı</em>" : "") + "</li>";
    }).join("");
    if (gl.getAttribute("data-h") !== filoHTML) { gl.innerHTML = filoHTML; gl.setAttribute("data-h", filoHTML); }
    $("shipsLbl").textContent = oyun ? (D.adlar[OTHER] ? D.ekIn(D.adlar[OTHER]) + " filosu" : "Rakip filo") : "Filon";
    if (gl.parentNode.hidden !== (a === "bekle")) { gl.parentNode.hidden = a === "bekle"; fit(); }
    /* skor ve sıra */
    $("skorMe").textContent = am.filter(function (x) { return x.v; }).length; $("skorOther").textContent = ao.filter(function (x) { return x.v; }).length;
    if (a === "bitti") { $("turnTxt").textContent = G.kazanan === ME ? "Kazandın" : "Kaybettin"; $("turnSub").textContent = "oyun bitti"; }
    else if (a === "yer") { $("turnTxt").textContent = "Diz"; $("turnSub").textContent = "sonra kilitle"; }
    else if (a === "bekle") { $("turnTxt").textContent = "Bekle"; $("turnSub").textContent = (D.adlar[OTHER] || "rakip") + " diziyor"; }
    else if (oynatiyor) { $("turnTxt").textContent = D.adlar[OTHER] || "Rakip"; $("turnSub").textContent = "atışları gösteriliyor"; }
    else if (G.sira === ME) { $("turnTxt").textContent = "Sıra sende"; $("turnSub").textContent = secili >= 0 ? kareAd(secili) + " nişanda" : "bir kare seç"; }
    else { $("turnTxt").textContent = "Sıra " + (D.adlar[OTHER] ? D.ekDe(D.adlar[OTHER]) : "onda"); $("turnSub").textContent = "bekliyorsun"; }
    $("turn").className = "hdturn" + ((a === "oyun" && G.sira === ME && !oynatiyor) || a === "yer" ? " me" : " ot");
    $("pMe").className = "hdp" + (a === "oyun" && G.sira === ME ? " on" : ""); $("pOther").className = "hdp" + (a === "oyun" && G.sira === OTHER ? " on" : "");
    dugmeler();
  }
  function dugmeler() {
    var a = asama(), ME = D.me, benim = a === "oyun" && G && G.sira === ME && !oynatiyor;
    $("bFire").hidden = !benim; $("bFire").disabled = secili < 0 || gonderiyor;
    $("bFireTxt").textContent = secili >= 0 ? "Ateş · " + kareAd(secili) : "Hedef seç";
    $("bShuffle").hidden = a !== "yer"; $("bLock").hidden = a !== "yer"; $("bLock").disabled = gonderiyor;
    $("bResign").hidden = !(a === "oyun" || a === "bekle");
  }

  /* ---- yerleştirme: gemiyi tutup sürükle, bırakınca oturur; kısa dokunuş döndürür ---- */
  var surukle = null;
  function hucreAt(x, y) {
    var r0 = K[0].getBoundingClientRect(), r9 = K[99].getBoundingClientRect(), adim = (r9.left - r0.left) / 9 || r0.width;
    var c = Math.floor((x - r0.left) / adim), r = Math.floor((y - r0.top) / adim);
    return { r: r, c: c, ic: x >= r0.left - adim * 0.6 && x <= r9.right + adim * 0.6 && y >= r0.top - adim * 0.6 && y <= r9.bottom + adim * 0.6 };
  }
  function hayalTemizle() { for (var i = 0; i < 100; i++) K[i].classList.remove("hayal", "kotu", "kalkti"); }
  function hayalCiz(g, ok) {
    hayalTemizle();
    hucreler(surukle.g).forEach(function (c) { K[c].classList.add("kalkti"); });
    if (!g) return;
    hucreler(g).forEach(function (c) { if (c >= 0 && c < 100) { K[c].classList.add("hayal"); if (!ok) K[c].classList.add("kotu"); } });
  }
  grid.addEventListener("pointerdown", function (e) {
    if (asama() !== "yer" || gonderiyor || (e.pointerType === "mouse" && e.button !== 0)) return;
    var b = e.target && e.target.closest ? e.target.closest("button.abc") : null; if (!b) return;
    var c = +b.getAttribute("data-c"), id = gemiHaritasi(yerel)[c]; if (!id) return;
    var g = null; yerel.forEach(function (x) { if (x.id === id) g = x; });
    e.preventDefault();
    surukle = { id: id, g: g, dr: Math.floor(c / 10) - g.r, dc: c % 10 - g.c, x: e.clientX, y: e.clientY, oynadi: false, aday: null, ok: false, pid: e.pointerId, c0: c };
    try { grid.setPointerCapture(e.pointerId); } catch (er) {}
  });
  grid.addEventListener("pointermove", function (e) {
    if (!surukle || e.pointerId !== surukle.pid) return;
    e.preventDefault();
    if (!surukle.oynadi && Math.abs(e.clientX - surukle.x) + Math.abs(e.clientY - surukle.y) < 8) return;
    if (!surukle.oynadi) { surukle.oynadi = true; grid.classList.add("tasiyor"); }
    var h = hucreAt(e.clientX, e.clientY), g = surukle.g;
    if (!h.ic) { surukle.aday = null; hayalCiz(null); return; }
    var aday = { id: g.id, o: g.o || 0, r: h.r - surukle.dr, c: h.c - surukle.dc }, of = ofsetler(aday), mr = 0, mc = 0;
    of.forEach(function (p) { mr = Math.max(mr, p[0]); mc = Math.max(mc, p[1]); });
    aday.r = Math.max(0, Math.min(9 - mr, aday.r)); aday.c = Math.max(0, Math.min(9 - mc, aday.c));   /* kenara taşarsa içeri it */
    if (surukle.aday && surukle.aday.r === aday.r && surukle.aday.c === aday.c) return;
    surukle.aday = aday; surukle.ok = sigar(aday, yerel); hayalCiz(aday, surukle.ok);
  });
  function birak(e, iptal) {
    if (!surukle || (e && e.pointerId !== surukle.pid)) return;
    var s = surukle; surukle = null; grid.classList.remove("tasiyor"); hayalTemizle();
    if (!s.oynadi) { if (!iptal) dondur(s.c0); return; }
    if (!iptal && s.aday && s.ok && (s.aday.r !== s.g.r || s.aday.c !== s.g.c)) { yerel = yerel.map(function (x) { return x.id === s.id ? s.aday : x; }); snd("select"); }
    else if (!iptal && s.aday && !s.ok) D.msg(gemiAd(s.id) + " oraya sığmıyor, başka gemiye değiyor.");
    ciz();
  }
  grid.addEventListener("pointerup", function (e) { birak(e, false); });
  grid.addEventListener("pointercancel", function (e) { birak(e, true); });
  grid.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("button.abc") : null; if (!b || b.disabled) return;
    var c = +b.getAttribute("data-c"), a = asama();
    if (a === "yer") return;
    if (a === "oyun" && G.sira === D.me) { secili = secili === c ? -1 : c; snd("select"); ciz(); }
  });
  function dondur(c) {
    var id = gemiHaritasi(yerel)[c]; if (!id) return;
    var g = null; yerel.forEach(function (x) { if (x.id === id) g = x; });
    var t = gemiTip(id), yeni = null;
    /* sıradaki yönler; dokunulan kare yerinde kalacak şekilde, olmazsa çevresine kaydırarak dene */
    for (var adim = 1; adim <= t.yon.length && !yeni; adim++) {
      var o = ((g.o || 0) + adim) % t.yon.length;
      var kaymalar = [[0, 0], [0, -1], [-1, 0], [0, 1], [1, 0], [-1, -1], [0, -2], [-2, 0], [0, -3], [-3, 0], [0, -4], [-4, 0], [1, -1], [-1, 1]];
      for (var i = 0; i < kaymalar.length && !yeni; i++) {
        var aday = { id: id, o: o, r: g.r + kaymalar[i][0], c: g.c + kaymalar[i][1] };
        if (sigar(aday, yerel)) yeni = aday;
      }
    }
    if (!yeni) { D.msg(gemiAd(id) + " burada dönemiyor."); return; }
    yerel = yerel.map(function (x) { return x.id === id ? yeni : x; }); snd("select"); ciz();
  }
  $("bShuffle").onclick = function () { yerel = rastgele(); snd("select"); ciz(); };
  $("bLock").onclick = function () {
    if (asama() !== "yer" || gonderiyor) return; gonderiyor = true; dugmeler();
    var ME = D.me, OTHER = D.other, diz = yerel.map(function (g) { return { id: g.id, r: g.r, c: g.c, o: g.o || 0 }; });
    D.db.runTransaction(function (tx) {
      return tx.get(D.ref).then(function (snap) {
        var d = snap.data(); if (!d || d.bitti || d.n !== G.n) throw new Error("oyun");
        var upd = { yer: {}, hazir: {}, t: firebase.firestore.FieldValue.serverTimestamp() };
        upd.yer[ME] = D.gizle(JSON.stringify(diz), "amiral" + d.n + ME); upd.hazir[ME] = true;
        if (d.hazir && d.hazir[OTHER]) upd.sira = d.baslayan;
        tx.set(D.ref, upd, { merge: true });
      });
    }).then(function () { gonderiyor = false; D.msg("Filon kilitlendi."); }).catch(function () { gonderiyor = false; dugmeler(); D.msg("Kaydedilemedi, tekrar dene."); });
  };

  /* ---- atış ---- */
  function patlat(el, tip) { el.classList.remove("pat", "sicra"); void el.offsetWidth; el.classList.add(tip); setTimeout(function () { el.classList.remove(tip); }, 900); }
  $("bFire").onclick = function () {
    if (asama() !== "oyun" || G.sira !== D.me || secili < 0 || gonderiyor) return;
    var ME = D.me, OTHER = D.other, c = secili, onun = dizilis(G, OTHER);
    if (!onun) { D.msg("Rakibin dizilişi okunamadı."); return; }
    var h = gemiHaritasi(onun), vurdu = !!h[c], batan = "", am = (G.atis[ME] || []);
    if (vurdu) { var vurulan = {}; am.forEach(function (x) { if (x.v) vurulan[x.c] = 1; }); vurulan[c] = 1; var g = null; onun.forEach(function (x) { if (x.id === h[c]) g = x; }); if (hucreler(g).every(function (q) { return vurulan[q]; })) batan = g.id; }
    var toplamVur = am.filter(function (x) { return x.v; }).length + (vurdu ? 1 : 0), bitti = toplamVur >= toplam(), bitirdi = false;
    gonderiyor = true; dugmeler();
    D.db.runTransaction(function (tx) {
      return tx.get(D.ref).then(function (snap) {
        var d = snap.data(); if (!d || d.bitti || d.sira !== ME || d.v !== G.v) throw new Error("sira");
        var liste = (d.atis[ME] || []).slice(); for (var i = 0; i < liste.length; i++) if (liste[i].c === c) throw new Error("ayni");
        liste.push({ c: c, v: vurdu, b: batan });
        var upd = { atis: {}, v: d.v + 1, t: firebase.firestore.FieldValue.serverTimestamp() }; upd.atis[ME] = liste;
        if (bitti) { upd.bitti = true; upd.sonuc = "batti"; upd.kazanan = ME; upd.sira = ""; bitirdi = true; }
        else upd.sira = vurdu ? ME : OTHER;
        tx.set(D.ref, upd, { merge: true });
      });
    }).then(function () {
      gonderiyor = false; secili = -1;
      snd(batan ? "sunk" : vurdu ? "hit" : "miss"); patlat(K[c], vurdu ? "pat" : "sicra");
      if (batan) { grid.classList.remove("salla"); void grid.offsetWidth; grid.classList.add("salla"); }
      D.msg(bitti ? "Amiral battı!" : batan ? "Batırdın: " + gemiAd(batan) + "! Bir daha at." : vurdu ? "Vurdun! Bir daha at." : "Iskaladın, sıra " + (D.adlar[OTHER] ? D.ekDe(D.adlar[OTHER]) : "onda") + ".");
      if (bitirdi) D.bitirenBenim = true;
      ciz();
    }).catch(function (e) { gonderiyor = false; dugmeler(); D.msg(String(e && e.message) === "sira" ? "Sıra sende değil ya da tahta değişti." : String(e && e.message) === "ayni" ? "Oraya zaten attın." : "Bağlantı kurulamadı, tekrar dene."); });
  };
  $("bResign").onclick = function () { if (!G || G.bitti) return; $("confirm").hidden = false; };
  $("confirmNo").onclick = function () { $("confirm").hidden = true; };
  $("confirmYes").onclick = function () {
    $("confirm").hidden = true; if (!G || G.bitti) return; D.bitirenBenim = true;
    D.ref.set({ bitti: true, sonuc: "pes", kazanan: D.other, sira: "", v: (G.v || 0) + 1, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () { D.bitirenBenim = false; D.msg("Olmadı, tekrar dene."); });
  };

  /* ---- rakibin atışları: tek tek göster ---- */
  function oynat() {
    if (!kuyruk.length) { oynatiyor = false; ciz(); return; }
    oynatiyor = true; var x = kuyruk.shift(), kalan = kuyruk.length;
    gosterilen++; seenYaz(G.n, gosterilen);
    ciz(); patlat(KM[x.c], x.v ? "pat" : "sicra");
    if (x.b) { mini.classList.remove("salla"); void mini.offsetWidth; mini.classList.add("salla"); }
    snd(x.b ? "sunk" : x.v ? "hit" : "miss");
    D.msg((D.adlar[D.other] || "Rakip") + " " + kareAd(x.c) + (x.b ? " — " + gemiAd(x.b) + " battı!" : x.v ? " — vurdu" : " — ıska") + (kalan ? "  (" + kalan + " atış daha)" : ""), true);
    $("turnTxt").textContent = D.adlar[D.other] || "Rakip"; $("turnSub").textContent = "atışları gösteriliyor";
    setTimeout(oynat, 750);
  }
  var siraDuzelt = -1;
  function baslat(d) {
    if (d.bitti || d.sira || !d.hazir || !d.hazir[D.me] || !D.other || !d.hazir[D.other] || siraDuzelt === d.n) return;
    siraDuzelt = d.n; D.ref.set({ sira: d.baslayan, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () {});
  }
  function onMac(d, ilk) {
    var ME = D.me, OTHER = D.other, oncekiG = G; G = d; baslat(d);
    var yeniFilo = d.surum === 2 ? FILO2 : FILO1, filoDegisti = yeniFilo !== FILO; FILO = yeniFilo;
    var ao = (d.atis && OTHER && d.atis[OTHER]) || [];
    if (ilk || filoDegisti || !oncekiG || oncekiG.n !== d.n) { yerel = (!d.hazir || !d.hazir[ME]) ? rastgele() : null; secili = -1; kuyruk = []; oynatiyor = false; gosterilen = Math.min(ao.length, seenOku(d.n)); }
    if (ao.length > gosterilen + kuyruk.length) {
      for (var i = gosterilen + kuyruk.length; i < ao.length; i++) kuyruk.push(ao[i]);
      if (!oynatiyor) { if (ilk && kuyruk.length > 1) D.msg((D.adlar[OTHER] || "Rakip") + " sen yokken " + kuyruk.length + " atış yaptı.", true); oynat(); }
      return;
    }
    if (!ilk && oncekiG && oncekiG.hazir && !oncekiG.hazir[OTHER] && d.hazir[OTHER] && d.hazir[ME]) D.msg((D.adlar[OTHER] || "Rakip") + " filosunu dizdi. " + (d.sira === ME ? "İlk atış senin!" : "İlk atış onun."));
    ciz();
  }
  fit();
  if (location.hash === "#test") window.__ab = { state: function () { return { G: G, me: D.me, other: D.other, asama: asama(), yerel: yerel, secili: secili, oynatiyor: oynatiyor, benim: G ? dizilis(G, D.me) : null, onun: G ? dizilis(G, D.other) : null, toplam: toplam() }; }, sec: function (c) { secili = c; ciz(); }, yerelKur: function (y) { yerel = y; ciz(); }, ates: function () { $("bFire").onclick(); }, kilit: function () { $("bLock").onclick(); }, yeni: D.yeniOyun, hucreler: hucreler, yerle: function (diz) { yerel = diz; ciz(); }, dondur: dondur };
})();
