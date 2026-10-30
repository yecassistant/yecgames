/* Çiz Bil – iki kişilik (ciz/mac, ciz/seri). Ortak altyapı: duello.js. Kelimeler: ciz-kelime.js
   mac = { n, v, a, b, baslayan, top: 6, tur, cizen, hazir, kelime (gizli), uz: [parça uzunlukları], cizim: [{c, w, e, p: [x,y,…]}] (0–1000),
           cizdi, ipucu: [açık harf sıraları], tahminler: [{u, t, ok}], puan: {uid}, gecmis: [{tur, cizen, k, ok, p}], sira, son, bitti, sonuc, kazanan }
   Tur: çizen 3 kelimeden birini seçer, çizer (çizim canlı yazılır); öbürü tahmin eder. Puan: bilen taban(kolay 8 / orta 10 / zor 12) − yanlış tahmin − 2×ipucu (en az 2); çizen bilinirse tabanın yarısı.
   Bilemedim: ikisine de 0. 6 tur sonunda puanı çok olan kazanır. Çizim hem canlı izlenir hem sonradan girince baştan oynatılır. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var K = window.CIZ_KELIME || [], TOP = 6, OLCEK = 1000;
  var RENKLER = ["#1c1a1f", "#e8505b", "#f28c28", "#f2c94c", "#2fa872", "#3b7ff0", "#9b5de5", "#8d5524", "#ff8fb3"];
  var TABAN = { 1: 8, 2: 10, 3: 12 };                                     /* zorluğa göre taban puan */
  function taban(d) { return TABAN[(d && d.zor) || 2] || 10; }
  function buyuk(s) { return String(s || "").toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜÂ ]/g, "").replace(/\s+/g, " ").trim(); }
  function anahtar(s) { return buyuk(s).replace(/ /g, "").replace(/Â/g, "A"); }
  function harfler(w) { return Array.from ? Array.from(w) : w.split(""); }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var D = window.Duello({
    kol: "ciz", sayfa: "ciz", sub: "sub", ses: "SdSes", helpKey: "ciz_help",
    startText: "Sırayla çiziyoruz: çizen üç kelimeden birini seçip çizer, öbürü bakarak tahmin eder. 6 tur; puanı çok olan kazanır.",
    yeniDoc: function (d, ME, OTHER) {
      var baslayan = d && d.baslayan ? (d.baslayan === ME ? OTHER : ME) : ME, puan = {}; puan[ME] = 0; puan[OTHER] = 0;
      return { a: ME, b: OTHER, baslayan: baslayan, top: TOP, tur: 1, cizen: baslayan, hazir: false, kelime: "", uz: [], cizim: [], cizdi: false, ipucu: [], tahminler: [], puan: puan, gecmis: [], sira: baslayan, son: null };
    },
    onMac: function (d, ilk) { macGeldi(d, ilk); },
    onYok: function () { G = null; ["score", "sahne", "altBar"].forEach(function (x) { $(x).hidden = true; }); },
    bitisGecikme: 1200,
    bitis: function (d) {
      var ME = D.me, OTHER = D.other, ad = D.adlar[OTHER] || "Rakip", pm = (d.puan || {})[ME] || 0, po = (d.puan || {})[OTHER] || 0, kazandim = d.kazanan === ME;
      var baslik = d.sonuc === "pes" ? (kazandim ? ad + " pes etti — kazandın" : "Pes ettin") : !d.kazanan ? "Berabere " + pm + "–" + po : kazandim ? "Kazandın " + pm + "–" + po + " 🎨" : ad + " kazandı " + po + "–" + pm;
      var L = (d.gecmis || []).map(function (g) { return (g.ok ? "✓ " : "✗ ") + g.k; }).join(" · ");
      return { kick: "Oyun " + d.n + " · " + (d.gecmis || []).length + " tur", baslik: baslik, metin: L + ". Yeni oyunda ilk çizen " + (d.baslayan === ME ? ad : "sen") + "." };
    },
    seriKod: function (d) { return d.sonuc === "pes" ? 99 : Math.min(98, ((d.puan || {})[d.kazanan] || 0)); }
  });
  var G = null, gonderiyor = false, sonOlay = "", secimler = null, sonAsama = "";
  function snd(n) { if (window.SdSes) try { window.SdSes.play(n); } catch (e) {} }
  function ad(u) { return u === D.me ? "Sen" : (D.adlar[u] || "Rakip"); }
  function kelimeOku(d) { return d && d.kelime ? D.coz(d.kelime, "ciz" + d.n + "-" + d.tur) : ""; }
  function cizenBen() { return G && G.cizen === D.me; }
  function asama() { if (!G) return "yok"; if (G.bitti) return "bitti"; if (!G.hazir) return cizenBen() ? "sec" : "bekle"; return cizenBen() ? "ciz" : "tahmin"; }

  /* ---------- kanvas ---------- */
  var cv = $("kanvas"), ctx = cv.getContext("2d"), DPR = 1, BOY = 300, EN = 1.3, YUK = 390, cizilen = 0, canliVuru = null;   /* kâğıt 10:13 (dikey) — her cihazda aynı oran */
  function boyut() {
    var sahne = $("sahne"); if (sahne.hidden) return;
    var ust = (document.querySelector(".czust").offsetHeight || 0) + ($("ustSerit").offsetHeight || 0) + 6, alt = ($("altBar").hidden ? 0 : $("altBar").offsetHeight) + 8;
    var W = sahne.clientWidth, H = sahne.clientHeight, w = W - 12, h = H - ust - alt - 8;
    BOY = Math.max(180, Math.floor(Math.min(w, h / EN, 520))); YUK = Math.floor(BOY * EN);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    var kap = $("kanvasKap"); kap.style.width = BOY + "px"; kap.style.height = YUK + "px"; kap.style.left = Math.round((W - BOY) / 2) + "px"; kap.style.top = Math.round(ust + (h - YUK) / 2) + "px";
    cv.style.width = BOY + "px"; cv.style.height = YUK + "px"; cv.width = Math.round(BOY * DPR); cv.height = Math.round(YUK * DPR);
    $("tahminler").style.bottom = (alt + 4) + "px";
    hepsiniCiz();
  }
  function temizle() { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = "#fffdf8"; ctx.fillRect(0, 0, BOY, YUK); }
  function vuruCiz(v, kadar) {
    var p = v.p, n = kadar === undefined ? p.length : Math.min(p.length, kadar); if (n < 2) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = v.e ? "#fffdf8" : v.c; ctx.lineWidth = v.w * (BOY / 360);
    ctx.beginPath(); ctx.moveTo(p[0] / OLCEK * BOY, p[1] / OLCEK * YUK);
    if (n === 2) ctx.lineTo(p[0] / OLCEK * BOY + 0.01, p[1] / OLCEK * YUK);
    for (var i = 2; i < n; i += 2) ctx.lineTo(p[i] / OLCEK * BOY, p[i + 1] / OLCEK * YUK);
    ctx.stroke();
  }
  function hepsiniCiz() { temizle(); var L = (G && G.cizim) || []; for (var i = 0; i < L.length; i++) vuruCiz(L[i]); if (canliVuru) vuruCiz(canliVuru); cizilen = L.length; }
  /* çizen: parmakla çiz */
  var arac = { c: RENKLER[0], w: 5, e: false }, yazT = 0, yazBekle = null;
  function nokta(e) { var r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * OLCEK), Math.round((e.clientY - r.top) / r.height * OLCEK)]; }
  cv.addEventListener("pointerdown", function (e) {
    if (asama() !== "ciz" || gonderiyor) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    var q = nokta(e); canliVuru = { c: arac.c, w: arac.w, e: arac.e ? 1 : 0, p: [q[0], q[1]], pid: e.pointerId };
    vuruCiz(canliVuru);
  });
  cv.addEventListener("pointermove", function (e) {
    if (!canliVuru || e.pointerId !== canliVuru.pid) return; e.preventDefault();
    var q = nokta(e), p = canliVuru.p, lx = p[p.length - 2], ly = p[p.length - 1];
    if (Math.abs(q[0] - lx) + Math.abs(q[1] - ly) < 4) return;
    p.push(q[0], q[1]); vuruCiz(canliVuru, p.length); vuruCiz(canliVuru);
    if (Date.now() - yazT > 350) cizimYaz(false);
  });
  function vuruBitir(e) {
    if (!canliVuru || (e && e.pointerId !== canliVuru.pid)) return;
    var v = canliVuru; canliVuru = null; delete v.pid;
    if (v.p.length === 2) v.p.push(v.p[0] + 1, v.p[1]);
    G.cizim = (G.cizim || []).concat([v]); hepsiniCiz(); cizimYaz(true);
  }
  cv.addEventListener("pointerup", vuruBitir); cv.addEventListener("pointercancel", vuruBitir);
  function cizimYaz(hemen) {
    if (!G || asama() !== "ciz") return; yazT = Date.now();
    var L = (G.cizim || []).slice(); if (canliVuru && !hemen) { var v = JSON.parse(JSON.stringify(canliVuru)); delete v.pid; L.push(v); }
    var toplam = 0; L.forEach(function (x) { toplam += x.p.length; });
    if (toplam > 40000) { D.msg("Çizim çok kalabalıklaştı; biraz silip devam et."); return; }
    /* yolda tek yazım: önceki gönderim bitmeden yenisi kuyruğa girmez; bitince en güncel hâl gider (yavaş bağlantıda karşı taraf geride kalmasın) */
    if (yolda) { bekleyen = true; return; }
    yolda = true; bekleyen = false;
    D.ref.set({ cizim: L, sira: D.other, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () {}).then(function () {
      yolda = false; if (bekleyen) { bekleyen = false; cizimYaz(!canliVuru); }
    });
  }
  var yolda = false, bekleyen = false;
  $("araclar").addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("button") : null; if (!b) return;
    if (b.hasAttribute("data-renk")) { arac.c = b.getAttribute("data-renk"); arac.e = false; }
    else if (b.hasAttribute("data-kalin")) arac.w = +b.getAttribute("data-kalin");
    else if (b.id === "aSilgi") arac.e = !arac.e;
    else if (b.id === "aGeri") { if (G.cizim && G.cizim.length) { G.cizim = G.cizim.slice(0, -1); hepsiniCiz(); cizimYaz(true); } }
    else if (b.id === "aTemizle") { if (G.cizim && G.cizim.length && confirm("Çizimi tamamen silelim mi?")) { G.cizim = []; hepsiniCiz(); cizimYaz(true); } }
    else if (b.id === "aBitti") { D.ref.set({ cizdi: true, sira: D.other, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).then(function () { D.msg("Çizimin tamam; " + (D.adlar[D.other] || "o") + " tahmin ediyor."); }).catch(function () {}); }
    aracCiz(); snd("key");
  });
  function aracCiz() {
    [].forEach.call($("araclar").querySelectorAll("[data-renk]"), function (b) { b.classList.toggle("on", !arac.e && b.getAttribute("data-renk") === arac.c); });
    [].forEach.call($("araclar").querySelectorAll("[data-kalin]"), function (b) { b.classList.toggle("on", +b.getAttribute("data-kalin") === arac.w); });
    $("aSilgi").classList.toggle("on", arac.e); $("aBitti").disabled = !(G && G.cizim && G.cizim.length) || !!(G && G.cizdi);
  }
  (function () { var h = ""; RENKLER.forEach(function (r) { h += '<button type="button" class="czrenk" data-renk="' + r + '" style="--r:' + r + '" aria-label="renk"></button>'; }); $("renkler").innerHTML = h; })();

  /* izleyen: yeni vuruları ekle; ilk açılışta baştan oynat */
  var oynatim = null;
  function izle(d, ilk) {
    var L = d.cizim || [];
    if (oynatim) { if (L.length >= oynatim.hedef) { oynatim.hedef = L.length; return; } clearTimeout(oynatim.t); oynatim = null; }
    if (ilk && L.length) { oynat(L); return; }
    if (L.length < cizilen) { hepsiniCiz(); return; }
    for (var i = cizilen; i < L.length; i++) vuruCiz(L[i]); cizilen = L.length;
    /* devam eden vuru (canlı): son vuru büyüyorsa tamamını yeniden çiz (eksik kısmı tamamlamak için) */
    if (L.length && cizilen === L.length) vuruCiz(L[L.length - 1]);
  }
  function oynat(L) {
    temizle(); cizilen = 0; var i = 0, j = 2, toplam = 0; L.forEach(function (v) { toplam += v.p.length; });
    var nokta = toplam / 2, adim = Math.max(1, Math.ceil(nokta / 240)) * 2, kare = Math.ceil(nokta / (adim / 2)), aralik = Math.max(16, Math.min(60, 1500 / Math.max(1, kare)));   /* küçük çizim ~1,5 sn, büyük çizim ~4 sn */
    oynatim = { hedef: L.length, t: null };
    (function tik() {
      if (!oynatim) return; var v = L[i]; if (!v) { oynatim = null; cizilen = L.length; hepsiniCiz(); return; }
      j = Math.min(v.p.length, j + adim); vuruCiz(v, j);
      if (j >= v.p.length) { i++; j = 2; cizilen = i; }
      oynatim.t = setTimeout(tik, aralik);
    })();
  }

  /* ---------- çizim ---------- */
  function kelimeSerit() {
    var a = asama(), k = kelimeOku(G), uz = G.uz || [], ip = G.ipucu || [], html = "", ad0 = D.adlar[D.other] || "Rakip";
    if (a === "sec") return '<span class="czsec">Kelimeni seç</span>';
    if (a === "bekle") return '<span class="czsec">' + D.esc(ad0) + " kelime seçiyor…</span>";
    if (a === "ciz") return '<span class="czciz">' + D.esc(k) + "</span>";
    /* tahmin eden: boşluklar + açılan harfler; bitince kelime */
    var say = 0; var parca = uz.map(function (n) { var s = ""; for (var i = 0; i < n; i++) { var idx = say++, acik = G.bitti || ip.indexOf(idx) >= 0, h = acik ? harfler(k.replace(/ /g, ""))[idx] || "" : ""; s += '<i class="czh' + (acik ? " acik" : "") + '">' + h + "</i>"; } return '<span class="czparca">' + s + "</span>"; }).join("");
    return parca || "";
  }
  function ciz() {
    if (!G) return;
    var ME = D.me, OTHER = D.other, a = asama(), adO = D.adlar[OTHER] || "Rakip";
    var ilkAcilis = $("sahne").hidden; $("score").hidden = false; $("sahne").hidden = false; $("altBar").hidden = false;
    $("tur").textContent = (G.bitti ? G.top : Math.min(G.tur, G.top)) + "/" + G.top;
    $("puanMe").textContent = (G.puan || {})[ME] || 0; $("puanOther").textContent = (G.puan || {})[OTHER] || 0;
    $("pMe").classList.toggle("on", !G.bitti && (a === "sec" || a === "ciz")); $("pOther").classList.toggle("on", !G.bitti && (a === "bekle" || a === "tahmin") && false);
    $("rol").textContent = G.bitti ? "bitti" : cizenBen() ? "sen çiziyorsun" : adO + " çiziyor";
    $("pMe").classList.toggle("cizen", !G.bitti && cizenBen()); $("pOther").classList.toggle("cizen", !G.bitti && !cizenBen());
    var ks = kelimeSerit(); if ($("kelime").getAttribute("data-h") !== ks) { $("kelime").innerHTML = ks; $("kelime").setAttribute("data-h", ks); }
    $("secim").hidden = a !== "sec"; if (a === "sec") secimCiz();
    $("araclar").hidden = a !== "ciz"; $("tahminBar").hidden = a !== "tahmin"; $("bekleNot").hidden = !(a === "bekle" || (a === "tahmin" && !(G.cizim || []).length));
    if (a === "bekle") $("bekleNot").textContent = adO + " kelime seçiyor…"; else if (a === "tahmin") $("bekleNot").textContent = adO + " çizmeye başlamadı; biraz bekle.";
    cv.classList.toggle("cizilir", a === "ciz"); $("kanvasKap").classList.toggle("perde", a === "sec" || a === "bekle"); document.body.classList.toggle("cz-sec", a === "sec");
    $("durumNot").textContent = G.bitti ? "Oyun bitti" : a === "ciz" ? (G.cizdi ? adO + " tahmin ediyor · istersen çizmeye devam et" : "Sen çiziyorsun · bitince Çizdim'e bas") : a === "tahmin" ? (G.cizdi ? adO + " çizdi · tahminini yaz" : adO + " canlı çiziyor · istediğin an tahmin et") : a === "sec" ? "Bu tur sen çiziyorsun" : "";
    /* tahminler */
    var T = (G.tahminler || []).slice(-3), th = T.map(function (x) { return '<span class="cztah' + (x.ok ? " ok" : "") + '"><i>' + (x.ok ? "✓" : "✗") + "</i>" + D.esc(x.t) + "</span>"; }).join("");
    if ($("tahminler").getAttribute("data-h") !== th) { $("tahminler").innerHTML = th; $("tahminler").setAttribute("data-h", th); }
    if (a === "tahmin") { var yanlis = (G.tahminler || []).filter(function (x) { return !x.ok; }).length, ip = (G.ipucu || []).length, toplamH = (G.uz || []).reduce(function (s, n) { return s + n; }, 0); $("puanOlasi").textContent = "+" + Math.max(2, taban(G) - yanlis - 2 * ip); $("bIpucu").disabled = ip >= Math.max(0, toplamH - 2); }
    aracCiz();
    $("bResign").hidden = !!G.bitti;
    if (ilkAcilis || sonAsama !== a) { sonAsama = a; boyut(); }
  }
  function secenekler() {
    var r = rng(((G.n || 1) * 7919 + (G.tur || 1) * 104729) >>> 0), kullanilan = (G.gecmis || []).map(function (g) { return g.k; }), L = [];
    var havuz = K.filter(function (k) { return kullanilan.indexOf(k[0]) < 0; });
    var var_ = function (k) { return L.some(function (x) { return x.k === k; }); };
    /* odaya özel kelimeler (Oda Ayarları): üçte bir ihtimalle seçeneklerden biri bizim kelimemiz olur */
    var ozel = []; try { var o = window.Hesap && Hesap.oda(); ozel = (o && o.ayar && o.ayar.kelimeler && o.ayar.kelimeler.ciz) || []; } catch (e) {}
    ozel = ozel.map(function (w) { return String(w).toLocaleUpperCase("tr-TR"); }).filter(function (w) { return w && kullanilan.indexOf(w) < 0; });
    if (ozel.length && r() < 0.34) L.push({ k: ozel[Math.floor(r() * ozel.length)], z: 2, ozel: true });
    [1, 2, 3].forEach(function (z) { if (L.length >= 3) return; var Z = havuz.filter(function (k) { return k[1] === z && !var_(k[0]); }); if (Z.length) { var sec = Z[Math.floor(r() * Z.length)]; L.push({ k: sec[0], z: z }); } });
    while (L.length < 3 && havuz.length) { var x = havuz[Math.floor(r() * havuz.length)]; if (!var_(x[0])) L.push({ k: x[0], z: x[1] }); }
    return L;
  }
  function secimCiz() {
    var L = secenekler(), Z = { 1: "kolay", 2: "orta", 3: "zor" };
    $("secimListe").innerHTML = L.map(function (o) { return '<button type="button" class="czsk z' + o.z + '" data-k="' + D.esc(o.k) + '" data-z="' + o.z + '"><small>' + (o.ozel ? "bizim kelimemiz ★" : Z[o.z]) + "</small><b>" + D.esc(o.k) + '</b><em>' + TABAN[o.z] + " puan</em></button>"; }).join("");
  }
  $("secimListe").addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("button[data-k]") : null; if (!b || asama() !== "sec" || gonderiyor) return;
    var k = b.getAttribute("data-k"), uz = k.split(" ").map(function (p) { return harfler(p).length; }), z = +b.getAttribute("data-z") || 2; gonderiyor = true;
    D.ref.set({ hazir: true, kelime: D.gizle(k, "ciz" + G.n + "-" + G.tur), uz: uz, zor: z, cizim: [], cizdi: false, ipucu: [], tahminler: [], sira: D.other, son: { u: D.me, t: "secti" }, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
      .then(function () { gonderiyor = false; snd("lock"); }).catch(function () { gonderiyor = false; D.msg("Kaydedilemedi, tekrar dene."); });
  });
  /* tahmin */
  function turBitir(d, ok, tahmin) {
    var ME = D.me, OTHER = D.other, k = kelimeOku(d), yanlis = (d.tahminler || []).filter(function (x) { return !x.ok; }).length, ip = (d.ipucu || []).length;
    var tb = taban(d), pB = ok ? Math.max(2, tb - yanlis - 2 * ip) : 0, pC = ok ? Math.ceil(tb / 2) : 0, puan = {}; puan[d.a] = (d.puan || {})[d.a] || 0; puan[d.b] = (d.puan || {})[d.b] || 0;
    puan[ME] += pB; puan[OTHER] += pC;
    var gecmis = (d.gecmis || []).concat([{ tur: d.tur, cizen: d.cizen, k: k, ok: ok, p: pB, z: d.zor || 2 }]), tur = d.tur + 1, bitti = tur > d.top;
    var upd = { tahminler: (d.tahminler || []).concat(tahmin ? [{ u: ME, t: tahmin, ok: ok }] : []), puan: puan, gecmis: gecmis, son: { u: ME, t: ok ? "bildi" : "pas", k: k, p: pB, tur: d.tur }, v: d.v + 1, t: firebase.firestore.FieldValue.serverTimestamp() };
    if (bitti) { upd.bitti = true; upd.sonuc = "bitti"; upd.sira = ""; upd.kazanan = puan[ME] > puan[OTHER] ? ME : puan[OTHER] > puan[ME] ? OTHER : null; }
    else { upd.tur = tur; upd.cizen = ME; upd.hazir = false; upd.kelime = ""; upd.uz = []; upd.cizim = []; upd.cizdi = false; upd.ipucu = []; upd.tahminler = []; upd.sira = ME; }   /* roller değişir: bilen çizer */
    return upd;
  }
  function tahminGonder() {
    var t = buyuk($("tahminIn").value); if (!t || asama() !== "tahmin" || gonderiyor) return;
    var ME = D.me, once = G, ok = anahtar(t) === anahtar(kelimeOku(G)); gonderiyor = true; $("tahminIn").value = "";
    var bitirdi = false;
    D.db.runTransaction(function (tx) {
      return tx.get(D.ref).then(function (snap) {
        var d = snap.data(); if (!d || d.bitti || d.tur !== once.tur || d.cizen === ME || !d.hazir) throw new Error("tur");
        var upd; if (ok) { upd = turBitir(d, true, t); bitirdi = !!upd.bitti; } else upd = { tahminler: (d.tahminler || []).concat([{ u: ME, t: t, ok: false }]), son: { u: ME, t: "yanlis", k: t, tur: d.tur }, v: d.v + 1, t: firebase.firestore.FieldValue.serverTimestamp() };
        tx.set(D.ref, upd, { merge: true });
      });
    }).then(function () { gonderiyor = false; if (bitirdi) D.bitirenBenim = true; snd(ok ? "found" : "key"); if (!ok) { var inp = $("tahminIn"); inp.classList.remove("titre"); void inp.offsetWidth; inp.classList.add("titre"); } })
      .catch(function () { gonderiyor = false; D.msg("Gönderilemedi, tekrar dene."); });
  }
  $("bTahmin").onclick = tahminGonder;
  $("tahminIn").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); tahminGonder(); } });
  $("bIpucu").onclick = function () {
    if (asama() !== "tahmin" || gonderiyor) return; var k = anahtar(kelimeOku(G)), n = harfler(k).length, ip = (G.ipucu || []).slice(), kapali = [];
    for (var i = 0; i < n; i++) if (ip.indexOf(i) < 0) kapali.push(i); if (kapali.length <= 2) return;
    ip.push(kapali[Math.floor(Math.random() * kapali.length)]);
    D.ref.set({ ipucu: ip, son: { u: D.me, t: "ipucu", tur: G.tur }, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).then(function () { snd("plus"); }).catch(function () {});
  };
  $("bPas").onclick = function () {
    if (asama() !== "tahmin" || gonderiyor) return; if (!confirm("Bu kelimeyi geçelim mi? İkiniz de puan almaz.")) return;
    var once = G, ME = D.me; gonderiyor = true; var bitirdi = false;
    D.db.runTransaction(function (tx) {
      return tx.get(D.ref).then(function (snap) { var d = snap.data(); if (!d || d.bitti || d.tur !== once.tur || d.cizen === ME) throw new Error("tur"); var upd = turBitir(d, false, ""); bitirdi = !!upd.bitti; tx.set(D.ref, upd, { merge: true }); });
    }).then(function () { gonderiyor = false; if (bitirdi) D.bitirenBenim = true; }).catch(function () { gonderiyor = false; D.msg("Olmadı, tekrar dene."); });
  };
  /* olaylar */
  function olayGoster(ilk) {
    var s = G && G.son; if (!s) return; var k = G.n + ":" + G.tur + ":" + JSON.stringify(s); if (k === sonOlay) return; sonOlay = k; if (ilk) return;
    var ben = s.u === D.me, kim = ad(s.u);
    if (s.t === "secti") { if (!ben) { D.msg(kim + " kelimeyi seçti, çiziyor…"); snd("plus"); } }
    else if (s.t === "bildi") { damga((ben ? "Bildin!" : kim + " bildi!") + " +" + s.p, s.k, true); D.msg(G.bitti ? "" : "Şimdi " + (cizenBen() ? "sen çiziyorsun" : "o çiziyor") + "."); if (!ben) snd("found"); }
    else if (s.t === "pas") { damga("Geçildi", s.k, false); D.msg(G.bitti ? "" : "Sıradaki tur: " + (cizenBen() ? "sen çiziyorsun" : "o çiziyor") + "."); }
    else if (s.t === "yanlis") { if (!ben) D.msg(kim + " dedi: " + s.k + " — değil"); }
    else if (s.t === "ipucu") { if (!ben) D.msg(kim + " bir harf açtı."); }
  }
  var damgaT = null;
  function damga(bas, kelime, iyi) {
    var el = $("damga"); clearTimeout(damgaT); el.className = "czdamga " + (iyi ? "iyi" : "kotu"); el.innerHTML = "<b>" + D.esc(bas) + "</b><span>" + D.esc(kelime) + "</span>"; el.hidden = false;
    void el.offsetWidth; el.classList.add("acik"); damgaT = setTimeout(function () { el.hidden = true; el.classList.remove("acik"); }, 2600);
  }
  var sonTur = "";
  function macGeldi(d, ilk) {
    var onceki = G; G = d; var turK = d.n + ":" + d.tur;
    var yeniTur = turK !== sonTur; sonTur = turK;
    if (!yeniTur && onceki && d.cizen === D.me && d.hazir) G.cizim = onceki.cizim;              /* çizen için yerel çizim esastır (ara yazımlar çift vuru üretmesin) */
    if (yeniTur) { canliVuru = null; cizilen = 0; if (oynatim) { clearTimeout(oynatim.t); oynatim = null; } }
    ciz();
    if (cizenBen()) { if (yeniTur || !onceki) hepsiniCiz(); }
    else izle(d, yeniTur || !onceki);
    olayGoster(ilk || !onceki || onceki.n !== d.n);
  }
  $("bResign").onclick = function () { if (!G || G.bitti) return; $("confirm").hidden = false; };
  $("confirmNo").onclick = function () { $("confirm").hidden = true; };
  $("confirmYes").onclick = function () {
    $("confirm").hidden = true; if (!G || G.bitti) return; D.bitirenBenim = true;
    D.ref.set({ bitti: true, sonuc: "pes", kazanan: D.other, sira: "", v: (G.v || 0) + 1, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () { D.bitirenBenim = false; D.msg("Olmadı, tekrar dene."); });
  };
  addEventListener("resize", function () { boyut(); }); setTimeout(boyut, 0);
  aracCiz();
  if (location.hash === "#test") window.__cz = {
    state: function () { return { G: G, me: D.me, other: D.other, asama: asama(), kelime: G ? kelimeOku(G) : "", cizilen: cizilen, secenekler: G && !G.hazir ? secenekler() : [] }; },
    sec: function (k) { var b = $("secimListe").querySelector('button[data-k="' + k + '"]'); if (b) b.click(); },
    tahmin: function (t) { $("tahminIn").value = t; tahminGonder(); }, ipucu: function () { $("bIpucu").onclick(); }, pas: function () { window.confirm = function () { return true; }; $("bPas").onclick(); },
    cizgi: function (pts) { G.cizim = (G.cizim || []).concat([{ c: arac.c, w: arac.w, e: 0, p: pts }]); hepsiniCiz(); cizimYaz(true); }, bitti: function () { $("aBitti").click(); }, yeni: D.yeniOyun, kanvas: cv
  };
})();
