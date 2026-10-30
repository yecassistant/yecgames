/* Stilobat – kayan bloğu tam zamanında bırak, kat kat yüksel. (Stilobat: sütunların oturduğu basamaklı kaide; kule de üç basamaklı bir kaidenin üstünde yükselir.) (Canvas, izometrik; fizik: kesilen parça düşer, tam oturtma = mükemmel)
   Kayıt: stb_best (rekor, hesapla eşitlenir), stb_oyun (oynanan oyun sayısı). Ses: stilobat-ses.js (KuSes). Test kancası: #test → window.__ku */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var cv = $("cv"), ctx = cv.getContext("2d", { alpha: false }), stage = $("stage");
  var W = 390, H = 700, DPR = 1, SCALE = 110, KX = 0, KY = 0, CX = 0, CY = 0;
  var BH = 0.3, TOL = 0.085, AMP = 1.55, HIZ0 = 1.25, HIZMAX = 2.7, BUYU_SERI = 5, BUYU = 0.12;
  var blocks = [], cur = null, parcalar = [], halkalar = [], tozlar = [], floats = [];
  var skor = 0, best = 0, perf = 0, combo = 0, maxCombo = 0, durum = "intro", camY = 0, camHedef = 0, zoom = 1, zoomHedef = 1, camMid = 0, sonTap = 0, lastT = 0, running = false, t0 = 0;
  var hueBaslangic = 0;
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function snd(n, o) { if (window.KuSes) try { window.KuSes.play(n, o); } catch (e) {} }
  best = +ls("stb_best") || 0; $("best").textContent = best;
  function now() { return performance.now(); }

  /* ---- ölçü ---- */
  var fitW = -1, fitH = -1, fitT = 0;
  function fit() {
    var vh = (window.visualViewport && window.visualViewport.height) || innerHeight;
    var nW = stage.clientWidth || innerWidth, nH = Math.max(320, Math.round(vh)), nD = Math.min(window.devicePixelRatio || 1, 2);
    if (nW === fitW && nH === fitH && nD === DPR) return;                 /* boyut aynıysa tuvali yeniden kurma (Safari'de çubuklar oynadıkça sürekli resize gelir) */
    fitW = nW; fitH = nH;
    W = nW; H = nH; stage.style.height = H + "px";
    DPR = nD;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    SCALE = Math.min(W * 0.3, H * 0.19); KX = SCALE * 0.866; KY = SCALE * 0.5; CX = W / 2; CY = H * 0.58;
    bgCache = null;
  }
  function fitSonra() { clearTimeout(fitT); fitT = setTimeout(fit, 80); }
  addEventListener("resize", fitSonra); addEventListener("orientationchange", function () { setTimeout(fit, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", fitSonra);
  fit();
  /* izometrik: x sağ-aşağı, z sol-aşağı, y yukarı */
  /* kamera: klasik izometriden biraz daha yukarıdan bakar (üst yüz daha geniş görünür, Stack'teki gibi); dikey bir tık kısa */
  var AX = 0.8, AY = 0.56, AV = 0.92;
  function iso(x, y, z) { var s = SCALE * zoom; return [CX + (x - z) * s * AX, CY + (x + z) * s * AY - (y - camY) * s * AV]; }

  /* ---- renkler: kule önce stilobatla aynı taş ailesinde (mermer kremi → traverten → sıcak taş) bir sütun gibi yükselir,
     sonra yavaş yavaş renge girer: kum → altın → şakayık → lavanta → gök → adaçayı → krem … (her durak 8 kat, aralar yumuşak geçiş) ---- */
  var PAL = [[38, 24, 90], [36, 28, 85], [34, 32, 79], [40, 50, 75], [42, 78, 68], [335, 70, 74], [265, 60, 72], [205, 60, 70], [150, 32, 66], [36, 36, 84]];
  var SEG = 8;
  function lerpHue(a, b, t) { var d = ((b - a + 540) % 360) - 180; return (a + d * t + 360) % 360; }
  function renk(i) {                                                   /* i: kat indeksi → {h,s,l} */
    var k = i + 5 + hueBaslangic, seg = Math.floor(k / SEG), t = (k - seg * SEG) / SEG, a = PAL[((seg % PAL.length) + PAL.length) % PAL.length], b = PAL[(((seg + 1) % PAL.length) + PAL.length) % PAL.length];
    var tt = t * t * (3 - 2 * t);
    return { h: lerpHue(a[0], b[0], tt), s: a[1] + (b[1] - a[1]) * tt, l: a[2] + (b[2] - a[2]) * tt };
  }
  function hsl(c, dl, ds) { return "hsl(" + Math.round(c.h) + "," + Math.max(0, Math.min(100, c.s + (ds || 0))) + "%," + Math.max(0, Math.min(100, c.l + (dl || 0))) + "%)"; }
  var bgH = 330, bgCache = null, bgCacheH = -99;
  /* arka plan (degrade + vinyet) ayrı tuvale bir kez çizilir; ton belirgin kayınca yenilenir — her karede degrade üretmek telefonu kasıyordu */
  function arkaplanOlustur() {
    if (!bgCache) { bgCache = document.createElement("canvas"); bgCache.width = cv.width; bgCache.height = cv.height; }
    var x = bgCache.getContext("2d"); x.setTransform(DPR, 0, 0, DPR, 0, 0);
    var g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "hsl(" + Math.round(lerpHue(268, bgH, 0.22)) + ",42%,22%)"); g.addColorStop(0.55, "hsl(" + Math.round(lerpHue(275, bgH, 0.18)) + ",40%,15%)"); g.addColorStop(1, "hsl(" + Math.round(lerpHue(280, bgH, 0.12)) + ",45%,11%)");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    var v = x.createRadialGradient(W / 2, H * 0.45, W * 0.1, W / 2, H * 0.45, Math.max(W, H) * 0.8); v.addColorStop(0, "rgba(255,255,255,.06)"); v.addColorStop(1, "rgba(0,0,0,.22)");
    x.fillStyle = v; x.fillRect(0, 0, W, H);
    bgCacheH = bgH;
  }
  function arkaplan() {
    var top = blocks.length ? blocks[blocks.length - 1].c : renk(0);
    bgH = lerpHue(bgH, top.h, 0.03);
    var fark = Math.abs(((bgH - bgCacheH + 540) % 360) - 180);
    if (!bgCache || fark > 0.6) arkaplanOlustur();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bgCache, 0, 0); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    /* uzak zerrecikler */
    for (var i = 0; i < tozlar.length; i++) { var p = tozlar[i]; var y = (p.y - camY * 0.25 * SCALE * zoom) % (H + 40); if (y < -20) y += H + 40; ctx.globalAlpha = p.a * 0.5; ctx.fillStyle = "#e9dcff"; ctx.fillRect(p.x, y, p.s, p.s); }
    ctx.globalAlpha = 1;
  }
  for (var ti = 0; ti < 26; ti++) tozlar.push({ x: Math.random() * W, y: Math.random() * (H + 40), s: 2 + Math.random() * 3, a: 0.25 + Math.random() * 0.5 });

  /* ---- blok çizimi ---- */
  function blokCiz(b, alpha, donus, pivot, aktif) {
    var x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2, yt = b.y + BH, yb = b.y;
    var T = [iso(x0, yt, z0), iso(x1, yt, z0), iso(x1, yt, z1), iso(x0, yt, z1)];
    var R = [iso(x1, yt, z0), iso(x1, yt, z1), iso(x1, yb, z1), iso(x1, yb, z0)];     /* +x yüzü (sağ-alt) */
    var L = [iso(x0, yt, z1), iso(x1, yt, z1), iso(x1, yb, z1), iso(x0, yb, z1)];     /* +z yüzü (sol-alt) */
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    if (donus) { var pv = pivot || iso(b.x, yb, b.z); ctx.translate(pv[0], pv[1]); ctx.rotate(donus); ctx.translate(-pv[0], -pv[1]); }
    function yuz(P, fill) { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (var i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
    /* göz yorulmasın / şekil "ters dönmesin": tek bir ışık yönü (üst en açık, sol orta, sağ en koyu, aralar belirgin),
       katlar arası çizgili şerit yok, sadece ince derz */
    var par = aktif ? 5 : 0;
    yuz(L, hsl(b.c, -8 + par, -6)); yuz(R, hsl(b.c, -26 + par, -10)); yuz(T, hsl(b.c, 14 + par, -6));
    /* alt kenar derzi: her kat ayrı okunur */
    ctx.beginPath(); ctx.moveTo(L[3][0], L[3][1]); ctx.lineTo(L[2][0], L[2][1]); ctx.lineTo(R[3][0], R[3][1]); ctx.strokeStyle = "rgba(25,10,35,.18)"; ctx.lineWidth = 1; ctx.stroke();
    /* ince kenar ışığı */
    ctx.beginPath(); ctx.moveTo(T[0][0], T[0][1]); for (var i = 1; i < 4; i++) ctx.lineTo(T[i][0], T[i][1]); ctx.closePath(); ctx.strokeStyle = aktif ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.35)"; ctx.lineWidth = aktif ? 1.6 : 1; ctx.stroke();
    if (aktif) { ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); ctx.lineTo(L[3][0], L[3][1]); ctx.lineTo(L[2][0], L[2][1]); ctx.lineTo(R[3][0], R[3][1]); ctx.lineTo(R[0][0], R[0][1]); ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.restore();
  }
  /* stilobat: üç basamaklı taş kaide (kulenin altında), açık taş rengi */
  var KAIDE = [{ w: 1.9, h: 0.12 }, { w: 1.6, h: 0.12 }, { w: 1.3, h: 0.12 }];
  function kaideCiz() {
    var y = blocks.length ? blocks[0].y : -5 * BH, t = y;
    for (var i = 0; i < KAIDE.length; i++) t -= KAIDE[i].h;
    for (var j = 0; j < KAIDE.length; j++) { var k = KAIDE[j]; blokCizRenk({ x: 0, z: 0, w: k.w, d: k.w, y: t }, k.h, "hsl(38,34%,88%)", "hsl(38,30%,74%)", "hsl(38,28%,62%)"); t += k.h; }
  }
  function blokCizRenk(b, bh, top, left, right) {
    var x0 = b.x - b.w / 2, x1 = b.x + b.w / 2, z0 = b.z - b.d / 2, z1 = b.z + b.d / 2, yt = b.y + bh, yb = b.y;
    var T = [iso(x0, yt, z0), iso(x1, yt, z0), iso(x1, yt, z1), iso(x0, yt, z1)], Rr = [iso(x1, yt, z0), iso(x1, yt, z1), iso(x1, yb, z1), iso(x1, yb, z0)], L = [iso(x0, yt, z1), iso(x1, yt, z1), iso(x1, yb, z1), iso(x0, yb, z1)];
    function yuz(P, fill) { ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (var i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
    yuz(L, left); yuz(Rr, right); yuz(T, top);
  }
  /* mimari çizim hissi: kamerayla kayan ince izometrik ızgara */
  function izgaraCiz() {
    var s = SCALE * zoom, step = 0.5, n = 14;
    ctx.save(); ctx.globalAlpha = 0.05; ctx.strokeStyle = "#c9b3e6"; ctx.lineWidth = 1;
    var yb = (blocks.length ? blocks[0].y : -5 * BH) - 0.36;                 /* kaidenin tabanı düzleminde */
    ctx.beginPath();
    for (var i = -n; i <= n; i++) {
      var a = iso(i * step, yb, -n * step), b = iso(i * step, yb, n * step); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      var c = iso(-n * step, yb, i * step), d = iso(n * step, yb, i * step); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
    }
    ctx.stroke(); ctx.restore();
  }
  function olcuCiz() {
    if (!blocks.length) return;
    var s = SCALE * zoom, y0 = blocks[0].y, yt = blocks[blocks.length - 1].y + BH, lx = CX + AX * s + 22;
    var py0 = CY - (y0 - camY) * s * AV, pyt = CY - (yt - camY) * s * AV;
    if (lx > W - 44) lx = W - 44;
    ctx.save(); ctx.strokeStyle = "rgba(245,236,255,.55)"; ctx.fillStyle = "rgba(245,236,255,.85)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lx, py0); ctx.lineTo(lx, pyt); ctx.stroke();
    var n = blocks.length - 6 + 1, adim = BH * s * AV, her = adim >= 7 ? 1 : adim >= 3.5 ? 2 : adim >= 1.4 ? 5 : 10;
    ctx.beginPath(); for (var i = 0; i <= n; i += her) { var py = CY - (y0 + i * BH - camY) * s * AV; ctx.moveTo(lx - 4, py); ctx.lineTo(lx + 4, py); } ctx.stroke();
    ctx.font = "700 11px Nunito, -apple-system, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("▽ " + kotMetni(skor), lx + 8, pyt); ctx.globalAlpha = 0.6; ctx.fillText("±0,00", lx + 8, py0); ctx.restore();
  }
  function kotMetni(kat) { var m = kat * BH; return (m > 0 ? "+" : "±") + m.toFixed(2).replace(".", ","); }
  /* tam oturtma işareti: yeni bloğun ALTINDA, oturduğu düzlemde beyaz bir çerçeve belirir ve dışa doğru açılıp söner (Stack'teki gibi) */
  function kare(cx, cz, w, d, y) { var x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2; return [iso(x0, y, z0), iso(x1, y, z0), iso(x1, y, z1), iso(x0, y, z1)]; }
  function yol(P) { ctx.moveTo(P[0][0], P[0][1]); for (var i = 1; i < 4; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath(); }
  function halkaCiz(h) {
    var k = Math.min(1, h.t / h.sure), e = 1 - Math.pow(1 - k, 3), y = h.y + 0.001;
    var ic = 1.02, dis = 1.02 + 0.12 + e * 0.1, a = (1 - k) * 0.95;
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "#ffffff";
    ctx.beginPath(); yol(kare(h.x, h.z, h.w * dis + 0.06, h.d * dis + 0.06, y)); yol(kare(h.x, h.z, h.w * ic + 0.02, h.d * ic + 0.02, y)); ctx.fill("evenodd");
    /* ikinci, ince ve daha geniş halka */
    var g = 1.2 + e * 0.6; ctx.globalAlpha = a * 0.5; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.4;
    ctx.beginPath(); yol(kare(h.x, h.z, h.w * g + 0.1, h.d * g + 0.1, y)); ctx.stroke();
    ctx.restore();
  }

  /* ---- oyun ---- */
  function yeniOyun() {
    blocks = []; parcalar = []; halkalar = []; floats = []; skor = 0; perf = 0; combo = 0; maxCombo = 0; zoom = 1; zoomHedef = 1; rekorDendi = false; bestStart = best;
    hueBaslangic = 0; bgH = renk(0).h;
    for (var i = 0; i < 6; i++) blocks.push({ x: 0, z: 0, w: 1, d: 1, y: (i - 5) * BH, c: renk(i - 5) });   /* temel: 6 katlı kaide */
    camY = 0; camHedef = 0;
    $("score").textContent = "0"; kotYaz(); $("over").hidden = true; document.querySelector(".kuhud").style.opacity = "1"; durum = "oyun"; yeniBlok();
    try { ls("stb_oyun", (+ls("stb_oyun") || 0) + 1); } catch (e) {}
  }
  function ust() { return blocks[blocks.length - 1]; }
  function yeniBlok() {
    var u = ust(), i = blocks.length - 6, eksen = i % 2 === 0 ? "x" : "z";
    var hiz = Math.min(HIZMAX, HIZ0 + i * 0.028), yon = (i % 4 < 2) ? 1 : -1;
    cur = { x: u.x, z: u.z, w: u.w, d: u.d, y: u.y + BH, c: renk(i), eksen: eksen, p: -AMP * yon, hiz: hiz * yon, merkez: eksen === "x" ? u.x : u.z, t: 0 };
    camHedef = cur.y - BH * 2;
  }
  function yerlestir() {
    if (durum !== "oyun" || !cur) return;
    var u = ust(), e = cur.eksen, s = e === "x" ? cur.w : cur.d, c0 = e === "x" ? u.x : u.z, c1 = c0 + cur.p, fark = c1 - c0, af = Math.abs(fark);
    if (af >= s - 0.002) { kaybet(); return; }
    var mukemmel = af <= TOL;
    var yeni = { x: cur.x, z: cur.z, w: cur.w, d: cur.d, y: cur.y, c: cur.c };
    if (mukemmel) {
      if (e === "x") yeni.x = u.x; else yeni.z = u.z;                     /* tam oturt */
      combo++; perf++; if (combo > maxCombo) maxCombo = combo;
      halkalar.push({ x: u.x, z: u.z, w: cur.w, d: cur.d, y: cur.y, t: 0, sure: 650 });
      snd("perfect", { combo: combo, n: perf });
      if (combo % BUYU_SERI === 0 && (yeni.w < 1 || yeni.d < 1)) { yeni.w = Math.min(1, yeni.w + BUYU); yeni.d = Math.min(1, yeni.d + BUYU); yeni.buyu = now(); floatEkle("büyüdü", "+", "#9fe3c4", yeni); snd("grow"); }
      else floatEkle("mükemmel", combo >= 2 ? "×" + combo : "", "#f6d98a", yeni);
    } else {
      combo = 0;
      var yeniS = s - af, kesS = af, yeniC = c0 + fark / 2, kesC = c1 + (fark > 0 ? 1 : -1) * (s - kesS) / 2;
      if (e === "x") { yeni.w = yeniS; yeni.x = yeniC; } else { yeni.d = yeniS; yeni.z = yeniC; }
      var kes = { x: cur.x, z: cur.z, w: cur.w, d: cur.d, y: cur.y, c: cur.c, vy: 0, vx: 0, vz: 0, don: 0, dv: 0, t: 0 };
      if (e === "x") { kes.w = kesS; kes.x = kesC; kes.vx = (fark > 0 ? 1 : -1) * 0.9; kes.dv = (fark > 0 ? 1 : -1) * 2.2; } else { kes.d = kesS; kes.z = kesC; kes.vz = (fark > 0 ? 1 : -1) * 0.9; kes.dv = (fark > 0 ? -1 : 1) * 2.2; }
      parcalar.push(kes); snd("place", { boy: Math.min(yeni.w, yeni.d), kes: kesS / s });
    }
    blocks.push(yeni); skor++; $("score").textContent = skor; bump($("score")); kotYaz();
    if (skor > best) { best = skor; ls("stb_best", best); $("best").textContent = best; if (!rekorDendi && bestStart > 0) { rekorDendi = true; floatEkle("yeni rekor", "", "#f7a9c4", ust(), 1); snd("record"); } }
    yeniBlok();
  }
  var rekorDendi = false, bestStart = 0;
  function kaybet() {
    durum = "bitti";
    var kes = { x: cur.x, z: cur.z, w: cur.w, d: cur.d, y: cur.y, c: cur.c, vy: 0, vx: 0, vz: 0, don: 0, dv: 0, t: 0 };
    if (cur.eksen === "x") { kes.x = ust().x + cur.p; kes.vx = cur.p > 0 ? 0.6 : -0.6; kes.dv = cur.p > 0 ? 1.4 : -1.4; } else { kes.z = ust().z + cur.p; kes.vz = cur.p > 0 ? 0.6 : -0.6; kes.dv = cur.p > 0 ? -1.4 : 1.4; }
    parcalar.push(kes); cur = null; snd("over");
    /* kameranın tüm kuleyi göstermesi */
    var n = blocks.length, yukseklik = n * BH, Ymid = Math.max(130, (H - 330) / 2);   /* kart altta; kule üst bölgede ortalanır */
    var ekU = 1.0 * AY / AV, ekA = 1.3 * AY / AV;                         /* üst yüz (yukarı) ve kaide (aşağı) payı, kat cinsinden */
    zoomHedef = Math.max(0.08, Math.min(1, (Ymid * 2 - 70) / ((yukseklik + ekU + ekA) * SCALE * AV))); camMid = blocks[0].y - ekA + (yukseklik + ekU + ekA) / 2;
    camHedef = camMid - (CY - Ymid) / (SCALE * zoomHedef * AV);
    var yeniRekor = skor >= best && skor > 0;
    setTimeout(function () {
      $("overKick").textContent = yeniRekor ? "Yeni rekor" : "Oyun bitti"; $("overScore").textContent = skor; $("overSub").textContent = skor === 1 ? "kat" : "kat";
      $("overBest").textContent = best; $("overPerfect").textContent = perf; $("overCombo").textContent = maxCombo;
      $("overMsg").textContent = skor === 0 ? "Blok kayarken dokun." : yeniRekor ? "Stilobat senin." : skor >= best * 0.8 ? "Rekora çok yakın." : perf > skor / 2 ? "Tam oturtmalar harikaydı." : "Bir daha? Sıra sende.";
      $("over").hidden = false; document.querySelector(".kuhud").style.opacity = "0";
    }, 1100);
    try { ls("stb_son", skor); } catch (e) {}
  }
  /* çizim notu gibi küçük etiket: bloğun yanında, iki yanında ölçü çizgisi; seyrek harfli, kısa ömürlü (göz yormasın) */
  function aralikli(t) { return t.toLocaleUpperCase("tr").split("").join("\u200a"); }
  function floatEkle(t, ek, renk, b, katman) { var f = { t: aralikli(t), ek: ek || "", renk: renk || "#f6d98a", born: now(), x: b ? b.x : 0, y: b ? b.y + BH : 0, z: b ? b.z : 0 }; if (katman) floats.push(f); else floats = floats.filter(function (q) { return q.ust; }).concat([f]); if (katman) f.ust = 1; }
  function kotYaz() { var el = $("kot"); if (el) el.textContent = "kot " + kotMetni(skor); }
  function bump(el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }

  /* ---- döngü ---- */
  function adim(dt) {
    if (cur && durum === "oyun") {
      cur.p += cur.hiz * dt;
      if (cur.p > AMP) { cur.p = AMP; cur.hiz = -Math.abs(cur.hiz); } else if (cur.p < -AMP) { cur.p = -AMP; cur.hiz = Math.abs(cur.hiz); }
      if (cur.eksen === "x") cur.x = ust().x + cur.p; else cur.z = ust().z + cur.p;
    }
    for (var i = parcalar.length - 1; i >= 0; i--) {
      var k = parcalar[i]; k.t += dt; k.vy -= 9.5 * dt; k.y += k.vy * dt; k.x += k.vx * dt; k.z += k.vz * dt; k.don += k.dv * dt;
      if (k.y < camY - 4 || k.t > 3) parcalar.splice(i, 1);
    }
    for (var j = halkalar.length - 1; j >= 0; j--) { halkalar[j].t += dt * 1000; if (halkalar[j].t >= halkalar[j].sure) halkalar.splice(j, 1); }
    camY += (camHedef - camY) * Math.min(1, dt * 6);
    zoom += (zoomHedef - zoom) * Math.min(1, dt * 3);
  }
  function ciz() {
    arkaplan(); izgaraCiz(); kaideCiz(); olcuCiz();
    var start = durum === "bitti" ? 0 : Math.max(0, blocks.length - 16);
    for (var i = start; i < blocks.length; i++) {
      var b = blocks[i];
      for (var hh = 0; hh < halkalar.length; hh++) if (Math.abs(halkalar[hh].y - b.y) < 1e-6) halkaCiz(halkalar[hh]);
      if (b.buyu && now() - b.buyu < 260) { var k = (now() - b.buyu) / 260, pz = 1 + Math.sin(k * Math.PI) * 0.06; blokCiz({ x: b.x, z: b.z, w: b.w * pz, d: b.d * pz, y: b.y, c: b.c }); }
      else blokCiz(b);
    }
    if (cur) blokCiz(cur, undefined, 0, null, true);
    for (var p = 0; p < parcalar.length; p++) { var q = parcalar[p]; blokCiz(q, Math.max(0, 1 - Math.max(0, q.t - 1.2) / 0.8), q.don * 0.35); }
    /* uçan yazılar */
    for (var f = floats.length - 1; f >= 0; f--) {
      var fl = floats[f], age = (now() - fl.born) / (fl.ust ? 1400 : 850); if (age >= 1) { floats.splice(f, 1); continue; }
      var px = W / 2, py = Math.max(150, H * 0.27) - age * 10 + (fl.ust ? 26 : 0);   /* skorun altında, koyu zeminde: blokların üstüne binmez */
      var e = age < 0.12 ? age / 0.12 : 1 - Math.max(0, age - 0.55) / 0.45;
      ctx.save(); ctx.globalAlpha = e * 0.95; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "800 12px Nunito, -apple-system, sans-serif";
      var tw = ctx.measureText(fl.t).width, ekw = 0;
      if (fl.ek) { ctx.font = "800 15px Nunito, -apple-system, sans-serif"; ekw = ctx.measureText(fl.ek).width + 6; }
      var top = tw + ekw, x0 = px - top / 2, ac = 10 + 12 * Math.min(1, age / 0.25);
      /* iki yanda ölçü çizgisi ve uç çentikleri */
      ctx.strokeStyle = fl.renk; ctx.lineWidth = 1; ctx.globalAlpha = e * 0.6;
      ctx.beginPath(); ctx.moveTo(x0 - 8, py); ctx.lineTo(x0 - 8 - ac, py); ctx.moveTo(x0 - 8 - ac, py - 3); ctx.lineTo(x0 - 8 - ac, py + 3);
      ctx.moveTo(x0 + top + 8, py); ctx.lineTo(x0 + top + 8 + ac, py); ctx.moveTo(x0 + top + 8 + ac, py - 3); ctx.lineTo(x0 + top + 8 + ac, py + 3); ctx.stroke();
      ctx.globalAlpha = e * 0.95; ctx.fillStyle = fl.renk; ctx.textAlign = "left";
      ctx.font = "800 12px Nunito, -apple-system, sans-serif"; ctx.fillText(fl.t, x0, py + 0.5);
      if (fl.ek) { ctx.font = "800 15px Nunito, -apple-system, sans-serif"; ctx.fillStyle = "#fff"; ctx.fillText(fl.ek, x0 + tw + 6, py); }
      ctx.restore();
    }
  }
  function loop(t) {
    if (!running) return;
    var dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0; lastT = t;
    adim(dt); ciz(); requestAnimationFrame(loop);
  }
  function basla() { if (!running) { running = true; lastT = 0; requestAnimationFrame(loop); } }
  document.addEventListener("visibilitychange", function () { if (document.hidden) running = false; else basla(); });

  /* ---- giriş ---- */
  function dokun(e) {
    if (e && e.target && e.target.closest && e.target.closest("a, button, .kuover")) return;
    var tnow = now(); if (tnow - sonTap < 140) return; sonTap = tnow;
    if (durum === "intro") { $("intro").hidden = true; yeniOyun(); return; }
    if (durum === "oyun") yerlestir();
  }
  stage.addEventListener("pointerdown", function (e) { if (e.pointerType === "mouse" && e.button !== 0) return; dokun(e); }, { passive: true });
  addEventListener("keydown", function (e) { if (e.code === "Space" || e.key === " ") { e.preventDefault(); dokun(null); } });
  $("again").onclick = function () { $("over").hidden = true; yeniOyun(); };
  $("bSes").onclick = function () { if (window.KuSes) { var on = window.KuSes.toggle(); $("bSes").classList.toggle("off", !on); } };
  try { if (window.KuSes && !window.KuSes.on()) $("bSes").classList.add("off"); } catch (e) {}

  /* ilk kare: kaide + bekleyen blok (intro arkasında) */
  (function () { for (var i = 0; i < 6; i++) blocks.push({ x: 0, z: 0, w: 1, d: 1, y: (i - 5) * BH, c: renk(i - 5) }); cur = { x: 0, z: 0, w: 1, d: 1, y: BH, c: renk(0), eksen: "x", p: 0, hiz: 0, t: 0 }; camHedef = -BH; camY = -BH; })();
  basla();

  if (location.hash === "#test") window.__ku = {
    state: function () { return { durum: durum, skor: skor, best: best, perf: perf, combo: combo, n: blocks.length, cur: cur ? { eksen: cur.eksen, p: cur.p, w: cur.w, d: cur.d, x: cur.x, z: cur.z } : null, ust: ust(), parcalar: parcalar.length, zoom: zoom, camY: camY }; },
    tap: function () { dokun(null); }, koy: function (p) { if (cur) { cur.p = p; if (cur.eksen === "x") cur.x = ust().x + p; else cur.z = ust().z + p; } yerlestir(); }, yeni: yeniOyun, TOL: TOL, BH: BH
  };
})();
