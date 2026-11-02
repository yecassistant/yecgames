/* Meyve Kasesi — meyve birleştirme.
   Meyveyi kaseye bırak; aynı iki meyve değince bir büyüğüne dönüşür (yaban mersini → … → karpuz).
   Kendi hafif fiziği var (daire–daire, daire–kase duvarı), tuval (canvas) üzerinde çizilir; meyveler SVG'den bir kez rasterlenir. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* ---------- meyveler (küçükten büyüğe) ---------- */
  var FRUITS = [
    { id: "yabanmersini", ad: "Yaban mersini", vc: [50, 52, 45], r: 15, d: 0.9,  c: "#5b6bb5", pts: 1,  msg: ["Muffin malzemesi hazır 🧁", "Yaban mersini ikilisi"] },
    { id: "kiraz",        ad: "Kiraz",         vc: [50, 54, 44], r: 20, d: 1.0,  c: "#e0484f", pts: 3,  msg: ["Kiraz birleşti 🍒", "Çift kiraz, tek sap"] },
    { id: "cilek",        ad: "Çilek",         vc: [50, 56, 43], r: 26, d: 0.85, c: "#ec4b5f", pts: 6,  msg: ["Sufle yolda 🍓", "Bol çilekli olsun"] },
    { id: "uzum",         ad: "Beyaz üzüm",    vc: [50, 54, 44], r: 33, d: 0.95, c: "#b9d47f", pts: 10, msg: ["Beyaz üzüm, serin serin 🍇", "Beyaz üzüm çıktı"] },
    { id: "nektarin",     ad: "Nektarin",      vc: [50, 55, 44], r: 40, d: 1.1,  c: "#f28c3b", pts: 15, msg: ["Nektarin: yaz kokusu ☀️", "Nektarin geldi"] },
    { id: "nar",          ad: "Nar",           vc: [50, 56, 43], r: 46, d: 1.25, c: "#b8324a", pts: 21, msg: ["Nar suyu gibi 🍹", "Nar çıktı!"] },
    { id: "karpuz",       ad: "Karpuz",        vc: [50, 52, 46], r: 52, d: 1.3,  c: "#3f9d5a", pts: 28, msg: ["Karpuz! Peki madem, kase senin 🍉", "Karpuz çıktı; bilet hâlâ geçerli 🎟️"] },
    /* sürpriz son seviye: zincirde altın "?" olarak görünür, iki karpuz birleşince ortaya çıkar */
    { id: "muffin",       ad: "Yaban mersinli muffin", vc: [50, 56, 44], r: 57, d: 0.7,  c: "#f6c64a", pts: 60, gizli: true, key: "pm_muffin2", msg: ["Sürpriz: yaban mersinli muffin 🧁", "Muffin çıktı! Bu kase artık tarihî 🧁"] },
    /* ikinci sürpriz: iki muffin birleşince atom tost (keşfedilene kadar zincirde "?") */
    { id: "tost",         ad: "Atom tost",     vc: [50, 50, 45], r: 62, d: 0.6,  c: "#e9b96e", pts: 90, gizli: true, key: "pm_tost2", msg: ["Sürpriz: atom tost 🍞 Şaka değil", "Atom tost çıktı, kase resmen menü oldu 🍞"] },
    /* üçüncü sürpriz: iki atom tost birleşince kalp (keşfedilene kadar zincirde "?"). kalp:true → çizimde hafif atış + ara sıra göz kırpma (sadece görsel) */
    { id: "kalp",         ad: "Kalp",          vc: [50, 52, 44], r: 67, d: 0.5,  c: "#f0405c", pts: 130, gizli: true, key: "pm_kalp1", kalp: true, msg: ["Kalp çıktı ❤️ Zincirin sonu, en tatlısı", "Kalp! Kase bu kadar tatlı olmamıştı ❤️"] }
  ];
  var seen = {}; FRUITS.forEach(function (f) { if (f.gizli) { try { seen[f.id] = localStorage.getItem(f.key) === "1"; } catch (e) { seen[f.id] = false; } } });
  var DROP_MAX = 4, DROP_W = [32, 28, 22, 13, 5];  /* bırakılabilen seviyeler ve ağırlıkları */
  var BASE_W = 360;                                /* yarıçaplar bu kase genişliğine göre; dar ekranda oranla küçülür */

  var cv = $("bowl"), ctx = cv.getContext("2d"), wrap = $("bowlwrap"), stageEl = document.querySelector("main");
  var msgEl = $("kmsg"), scoreEl = $("score"), bestEl = $("best"), mergesEl = $("merges"), over = $("over"), nextUse = $("nextUse");
  var W = 360, H = 480, DPR = 1, SC = 1;           /* SC: yarıçap ölçeği */
  var TOP = 48, DANGER = 100, RIM = 108, WARN = 56; /* bırakma yüksekliği, tehlike çizgisi, kase ağzı, uyarı bandı (sadece surat; yanma sınırı DANGER değişmez) */
  var walls = [];                                   /* kase iç sınırı: parça doğrular */
  var bodies = [], fx = [], floats = [], score = 0, best = 0, merges = 0, cur = 0, nxt = 0, hx = 180, canDrop = true, dead = false, lastT = 0, running = false;
  var gameH0 = 0, gameSC0 = 0, grace = 0;          /* oyun başladığındaki kase yüksekliği/ölçeği (döndürünce kapasite korunur) ve döndürme sonrası tehlike sayacı için kısa muafiyet */
  var sprites = {};                                 /* sprites[level][face] = canvas */
  try { best = +localStorage.getItem("pm_best") || 0; } catch (e) {}
  bestEl.textContent = best;
  function burst(n) { if (window.__burst) try { window.__burst(n); } catch (e) {} }
  function msg(t) { msgEl.textContent = t; }
  function snd(n, o) { if (window.PmSes) try { window.PmSes.play(n, o); } catch (e) {} }   /* ses: kase-ses.js varsa çalar, yoksa oyun sessiz */
  function bump(el) { if (!el) return; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  /* görsel eklentiler (fiziğe dokunmaz): kombo yazısı, yeni rekor, büyük birleşmede hafif sarsıntı, iki kalpte büyük boy sufle */
  var combo = 0, lastMergeT = 0, best0 = 0, recShown = false, recFx = 0, shakeT = 0, shakeA = 0;
  var su = null, suImg = {}, suPx = 0, suCount = 0, gameSu = 0, celebUntil = 0;
  try { suCount = +localStorage.getItem("pm_sufle") || 0; } catch (e) {}

  /* ---------- SVG → sprite ---------- */
  var defsXml = new XMLSerializer().serializeToString($("fruitDefs"));
  defsXml = defsXml.replace(/<symbol[\s\S]*?<\/symbol>/g, "");         /* sembolleri çıkar, yalnız yüz/gradyan kalsın */
  function spriteSvg(level, face) {
    var inner = $("f-" + FRUITS[level].id).innerHTML;
    if (face !== "n") inner = inner.replace(/href="#face"/g, 'href="#face-' + (face === "h" ? "happy" : face === "k" ? "wink" : "worry") + '"');
    return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" width="100" height="100">' + defsXml + "<g>" + inner + "</g></svg>";
  }
  function buildSprites(done) {
    var left = 0;
    FRUITS.forEach(function (f, L) {
      sprites[L] = {};
      (f.kalp ? ["n", "h", "w", "k"] : ["n", "h", "w"]).forEach(function (face) {   /* k: göz kırpma, sadece kalpte */
        left++;
        var im = new Image(), px = Math.ceil(f.r * SC * DPR * 100 / f.vc[2]) + 2;   /* çizimdeki daire (vc) fizik dairesine birebir oturur */
        im.onload = function () {
          var c = document.createElement("canvas"); c.width = px; c.height = px;
          c.getContext("2d").drawImage(im, 0, 0, px, px); sprites[L][face] = c;
          if (--left === 0) done();
        };
        im.onerror = function () { sprites[L][face] = null; if (--left === 0) done(); };
        im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(spriteSvg(L, face));
      });
    });
  }

  /* büyük boy sufle parçaları: kap (yüzlü), kabaran sufle, kabın ön dudağı, pudra şekeri, çilek — aynı 100×100 kutuda, üst üste çizilince hizalı */
  var suDefs = (function () { var d = $("sufleDefs"); return d ? new XMLSerializer().serializeToString(d).replace(/<symbol[\s\S]*?<\/symbol>/g, "") : ""; })();
  function suSize() { return Math.round(Math.max(120, Math.min(W * 0.58, H * 0.5, 232))); }
  function buildSufle() {
    if (!suDefs) return;
    var px = Math.ceil(suSize() * DPR * 1.2); if (px === suPx) return; suPx = px;
    var src = { kapH: '<use href="#su-kap"/><use href="#face-happy" transform="translate(0 25)"/>', kapK: '<use href="#su-kap"/><use href="#face-wink" transform="translate(0 25)"/>', ust: '<use href="#su-ust"/>', on: '<use href="#su-on"/>', seker: '<use href="#su-seker"/>', cilek: '<use href="#su-cilek"/>' };
    Object.keys(src).forEach(function (k) {
      var im = new Image();
      im.onload = function () { if (px !== suPx) return; var c = document.createElement("canvas"); c.width = px; c.height = px; c.getContext("2d").drawImage(im, 0, 0, px, px); suImg[k] = c; };
      im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" width="100" height="100">' + defsXml + suDefs + "<g>" + src[k] + "</g></svg>");
    });
  }

  /* ---------- ölçü / kase ---------- */
  function measure() {
    var cs = getComputedStyle(stageEl), bs = getComputedStyle(document.body), used = 0;
    used += (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) + (parseFloat(bs.paddingTop) || 0) + (parseFloat(bs.paddingBottom) || 0);
    var g = parseFloat(cs.rowGap || cs.gap); if (isNaN(g)) g = 8;
    var kids = stageEl.children, n = 0;
    for (var k = 0; k < kids.length; k++) { n++; if (kids[k] !== wrap) used += kids[k].offsetHeight; }
    used += g * (n - 1);
    W = Math.min(stageEl.clientWidth, 440);
    H = Math.max(230, Math.min(560, innerHeight - used));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    SC = Math.min(1, W / BASE_W) * (H < 300 ? 0.72 : H < 380 ? 0.86 : H > 470 ? 1.08 : 1);
    WARN = Math.round(30 + 30 * SC);              /* uyarı bandı meyve ölçeğiyle büyür (~50–62 px): tepe tehlike çizgisine bu kadar yaklaşınca surat endişelenir */
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + "px"; cv.style.height = H + "px"; wrap.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildWalls(); bgCache = null;
    if (hx > W - 20) hx = W / 2;
  }
  var inset = 10, curveH = 80;
  function buildWalls() {
    walls = [];
    curveH = Math.min(84, H * 0.22);
    var L = inset, R = W - inset, B = H - 8, cy = B - curveH, rx = (R - L) / 2, cx = W / 2;
    var pts = [[L, -200], [L, cy]];
    for (var i = 1; i < 16; i++) { var a = Math.PI + i * Math.PI / 16; pts.push([cx + rx * Math.cos(a), cy - curveH * Math.sin(a)]); }
    pts.push([R, cy], [R, -200]);
    for (var j = 0; j < pts.length - 1; j++) walls.push({ x1: pts[j][0], y1: pts[j][1], x2: pts[j + 1][0], y2: pts[j + 1][1] });
    wallPath = pts;
  }
  var wallPath = [], bgCache = null;
  function drawBg() {
    var c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height;
    var x = c.getContext("2d"); x.setTransform(DPR, 0, 0, DPR, 0, 0);
    /* cam kase */
    x.beginPath(); x.moveTo(inset, RIM);
    for (var i = 1; i < wallPath.length - 1; i++) x.lineTo(wallPath[i][0], wallPath[i][1]);
    x.lineTo(W - inset, RIM); x.closePath();
    var gr = x.createLinearGradient(0, RIM, 0, H); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(239,231,251,.92)");
    x.fillStyle = gr; x.fill();
    x.lineWidth = 3.5; x.strokeStyle = "#dccdf2"; x.stroke();
    /* iç parlama */
    x.beginPath(); x.moveTo(inset + 9, RIM + 10); x.lineTo(inset + 9, H - 8 - curveH); x.quadraticCurveTo(inset + 14, H - 24, W / 2 - 30, H - 14);
    x.lineWidth = 5; x.strokeStyle = "rgba(255,255,255,.75)"; x.lineCap = "round"; x.stroke();
    /* camda lavanta dalı */
    x.save(); x.globalAlpha = .32; x.translate(W - 44, H - 26); x.rotate(-0.35);
    x.strokeStyle = "#6f9a5a"; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -46); x.stroke();
    x.fillStyle = "#9b7fd1"; for (var k = 0; k < 7; k++) { x.beginPath(); x.ellipse((k % 2 ? 4 : -4), -16 - k * 4.5, 3.2, 2.4, 0, 0, 6.28); x.fill(); }
    x.restore();
    /* tehlike çizgisi */
    x.setLineDash([4, 6]); x.lineWidth = 1.5; x.strokeStyle = "rgba(236,111,154,.45)"; x.beginPath(); x.moveTo(inset + 6, DANGER); x.lineTo(W - inset - 6, DANGER); x.stroke(); x.setLineDash([]);
    return c;
  }

  /* ---------- gövdeler ---------- */
  function rad(L) { return FRUITS[L].r * SC; }
  function addBody(L, x, y, vx, vy) {
    var r = rad(L), b = { L: L, x: x, y: y, vx: vx || 0, vy: vy || 0, w: 0, r: r, mass: FRUITS[L].d * r * r, a: Math.random() * 6.28, born: now(), over: 0, happy: 0, touch: false, id: Math.random(), wink: now() + 2500 + Math.random() * 4000 };
    bodies.push(b); return b;
  }
  function now() { return performance.now(); }
  function randLevel() { var s = 0, i; for (i = 0; i <= DROP_MAX; i++) s += DROP_W[i]; var r = Math.random() * s; for (i = 0; i <= DROP_MAX; i++) { r -= DROP_W[i]; if (r <= 0) return i; } return 0; }

  /* ---------- kalbin gerçek şekli ----------
     Kalp çizimde iki kıvrımlı; fizikte tek daire olunca üstteki girintide meyveler kalbe değmeden havada duruyordu.
     Kalbin çizgisi SVG yolundan örneklenir (sprite birimi: merkez (50,52), yarıçap 44 = b.r) ve kalbe değen meyve bu çizgiyle çarpışır. */
  var KALP_P = (function () {
    var C = [[50, 93, 30, 78, 8, 63, 8, 40], [8, 40, 8, 26, 18.5, 16, 31, 16], [31, 16, 39.5, 16, 46, 20.5, 50, 28], [50, 28, 54, 20.5, 60.5, 16, 69, 16], [69, 16, 81.5, 16, 92, 26, 92, 40], [92, 40, 92, 63, 70, 78, 50, 93]], P = [];
    C.forEach(function (c) { for (var i = 0; i < 8; i++) { var t = i / 8, u = 1 - t; P.push([u * u * u * c[0] + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t * t * t * c[6] - 50, u * u * u * c[1] + 3 * u * u * t * c[3] + 3 * u * t * t * c[5] + t * t * t * c[7] - 52]); } });
    return P;
  })();
  function kalpTemas(h, c) {                                  /* kalp–daire teması: [nx, ny, batma] (n kalpten daireye) ya da null */
    var dx = c.x - h.x, dy = c.y - h.y; if (dx * dx + dy * dy >= (h.r + c.r) * (h.r + c.r)) return null;
    var k = h.r / 44, ca = Math.cos(h.a), sa = Math.sin(h.a), lx = (dx * ca + dy * sa) / k, ly = (-dx * sa + dy * ca) / k, rr = c.r / k;
    var P = KALP_P, n = P.length, en = 1e9, qx = 0, qy = 0, ic = false, i, j;
    for (i = 0, j = n - 1; i < n; j = i++) {
      var a = P[j], b = P[i], ex = b[0] - a[0], ey = b[1] - a[1], L = ex * ex + ey * ey, t = L ? ((lx - a[0]) * ex + (ly - a[1]) * ey) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
      var px = a[0] + ex * t, py = a[1] + ey * t, d = (px - lx) * (px - lx) + (py - ly) * (py - ly);
      if (d < en) { en = d; qx = px; qy = py; }
      if ((a[1] > ly) !== (b[1] > ly) && lx < (b[0] - a[0]) * (ly - a[1]) / (b[1] - a[1]) + a[0]) ic = !ic;
    }
    en = Math.sqrt(en); if (!ic && en >= rr) return null;
    var nx, ny;
    if (en < 1e-6) { var l0 = Math.sqrt(lx * lx + ly * ly) || 1; nx = lx / l0; ny = ly / l0; }
    else if (ic) { nx = (qx - lx) / en; ny = (qy - ly) / en; } else { nx = (lx - qx) / en; ny = (ly - qy) / en; }
    return [nx * ca - ny * sa, nx * sa + ny * ca, (ic ? rr + en : rr - en) * k];
  }
  function kalpUzan(h, ux, uy) {                              /* kalbin (ux,uy) yönündeki en uzak noktası: kase duvarına değme mesafesi */
    var k = h.r / 44, ca = Math.cos(h.a), sa = Math.sin(h.a), lx = ux * ca + uy * sa, ly = -ux * sa + uy * ca, m = -1e9;
    for (var i = 0; i < KALP_P.length; i++) { var v = KALP_P[i][0] * lx + KALP_P[i][1] * ly; if (v > m) m = v; }
    return m * k;
  }

  /* ---------- fizik ---------- */
  /* Uyku yok: her meyve her karede yerçekimi ve temas kuvvetlerine tabi; altta kalan meyve üsttekilerin baskısıyla kayabilir.
     Titreşimi önleyen şeyler: slop'lu yumuşak konum düzeltmesi, düşük hızda sekme yok, çok küçük hızın sıfırlanması (sürünme yok).
     Dönme: her meyvenin açısal hızı var; sürtünme darbeleri döndürür, zeminde yuvarlanma hızına kilitlenir. */
  var GRAV = 1900, REST = 0.28, MU = 0.10, MUW = 0.08, MUP = 0.4, SLOP = 0.5, ITER = 9, VSTOP = 4;   /* MU 0.18→0.10: yuvarlak meyve kayma değil yuvarlanma sürtünmesi görür; 0.18 kamada kilitleniyordu */
  /* Dinlenme: destekli ve 0.5 sn yavaş kalan meyve "dinlenir" (yerçekimi entegrasyonu durur → sürünme yok).
     Dinlenen meyve yine de itilir: hareketli bir meyve değince, baskıyla itilince ya da komşusu birleşince hemen uyanır ve fizik tam çalışır. */
  function wake(b) { if (b.sleep) { b.sleep = false; } b.win = 0; b.wsp = 0; b.x0 = b.x; b.y0 = b.y; }
  function step(dt) {
    var i, j, b, o, n = bodies.length, pend = [];
    for (i = 0; i < n; i++) { b = bodies[i]; b.touch = false; b.ground = false; b.sup = 0; b.supMax = 0; b.supW = 0; b.ncp = b.nc || 0; b.nc = 0; b.nfp = b.nf || 0; b.nf = 0; b.wallHit = false; b.px = b.x; b.py = b.y; if (b.sleep) continue; b.vy += GRAV * dt; b.x += b.vx * dt; b.y += b.vy * dt; }
    for (var it = 0; it < ITER; it++) {
      var corr = it < 2 ? 0.4 : 0.28;
      /* meyve–meyve */
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
        b = bodies[i]; o = bodies[j];
        var kb = !!FRUITS[b.L].kalp, ko = !!FRUITS[o.L].kalp, nx, ny, pen;
        if (kb !== ko) {                                       /* biri kalpse: kalbin gerçek çizgisiyle */
          var kt = kb ? kalpTemas(b, o) : kalpTemas(o, b); if (!kt) continue;
          nx = kb ? kt[0] : -kt[0]; ny = kb ? kt[1] : -kt[1]; pen = kt[2];
        } else {
          var dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy, R = b.r + o.r;
          if (d2 >= R * R) continue;
          if (d2 < 0.0001) { dx = 0.01; dy = -0.01; d2 = 0.0002; }
          var d = Math.sqrt(d2); nx = dx / d; ny = dy / d; pen = R - d;
        }
        var mb = b.mass, mo = o.mass, tot = mb + mo;
        var push = Math.max(0, pen - SLOP) * corr;
        var sb = Math.abs(b.vx) + Math.abs(b.vy), so = Math.abs(o.vx) + Math.abs(o.vy);
        if (b.sleep && (so > 30 || push > 1.2)) wake(b);   /* 16→30: çözücünün artık hız titreşimi (~10–15) komşuları uyandırıp yığını sürüklüyordu; <30 px/s sürünme rejimi, uyandırmaz */
        if (o.sleep && (sb > 30 || push > 1.2)) wake(o);
        /* dinlenen meyve darbe hesabında da "sonsuz kütle": konumda sabitken hıza pay almasın (payı sonra sıfırlanıyordu → uyanık meyve yaklaşma hızını tam kaybetmiyor, titreşim/yavaş durma) */
        var ib = b.sleep ? 0 : 1 / mb, io = o.sleep ? 0 : 1 / mo, invM = ib + io;
        /* dinlenen meyve konum düzeltmesinde "sonsuz kütle": uyanık olan açılır; ikisi de dinleniyorsa dokunulmaz (sürünme motoru burasıydı) */
        if (b.sleep && o.sleep) { }
        else if (b.sleep) { o.x += nx * push; o.y += ny * push; }
        else if (o.sleep) { b.x -= nx * push; b.y -= ny * push; }
        else { b.x -= nx * push * (mo / tot); b.y -= ny * push * (mo / tot); o.x += nx * push * (mb / tot); o.y += ny * push * (mb / tot); }
        var rvx = o.vx - b.vx, rvy = o.vy - b.vy, vn = rvx * nx + rvy * ny;
        if (vn < 0 && invM > 0) {
          if (vn < -35) { wake(b); wake(o); ib = 1 / mb; io = 1 / mo; invM = ib + io; }   /* gerçek bir çarpma: ikisi de uyanır */
          var e = vn < -80 ? REST : 0, jn = -(1 + e) * vn / invM;
          b.vx -= jn * nx * ib; b.vy -= jn * ny * ib; o.vx += jn * nx * io; o.vy += jn * ny * io;
          /* yığının içindekiler (çok temas) daha "tutucu", serbest yuvarlananlar kaygan: yığın akmaz, tek meyve yuvarlanır */
          var mu = (b.nfp >= 3 && o.nfp >= 3) ? MUP : MU;   /* ikisi de sıkışmışsa tutucu; biri serbestse (ör. yığının üstündeki tek meyve) yuvarlanabilir */
          var tx = -ny, ty = nx, vt = (o.vx - b.vx) * tx + (o.vy - b.vy) * ty, jt = -vt / invM, lim = mu * Math.abs(jn);
          if (jt > lim) jt = lim; else if (jt < -lim) jt = -lim;
          b.vx -= jt * tx * ib; b.vy -= jt * ty * ib; o.vx += jt * tx * io; o.vy += jt * ty * io;
          b.w -= jt / (mb * b.r) * 0.9; o.w -= jt / (mo * o.r) * 0.9;          /* sürtünme döndürür */
        }
        b.touch = o.touch = true;
        if (ny > 0.75) b.ground = true; if (ny < -0.75) o.ground = true;
        if (it === 0) { b.nc++; o.nc++; b.nf++; o.nf++; if (ny > 0) { b.sup += ny; if (ny > b.supMax) b.supMax = ny; } else { o.sup -= ny; if (-ny > o.supMax) o.supMax = -ny; } }
        if (b.L === o.L && it === 0 && !b.pm && !o.pm) { b.pm = o.pm = true; pend.push([b, o]); }
      }
      /* meyve–kase duvarı */
      for (i = 0; i < n; i++) {
        b = bodies[i];
        for (j = 0; j < walls.length; j++) {
          var w = walls[j], ex = w.x2 - w.x1, ey = w.y2 - w.y1, len2 = ex * ex + ey * ey;
          var t = ((b.x - w.x1) * ex + (b.y - w.y1) * ey) / len2; t = Math.max(0, Math.min(1, t));
          var px = w.x1 + ex * t, py = w.y1 + ey * t, ddx = b.x - px, ddy = b.y - py, dd = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dd >= b.r || dd === 0) continue;
          var wnx = ddx / dd, wny = ddy / dd, wr = FRUITS[b.L].kalp ? kalpUzan(b, -wnx, -wny) : b.r;
          if (dd >= wr) continue;
          var wpen = wr - dd;
          b.x += wnx * Math.max(0, wpen - SLOP * 0.5) * 0.85; b.y += wny * Math.max(0, wpen - SLOP * 0.5) * 0.85;
          var vn2 = b.vx * wnx + b.vy * wny;
          if (vn2 < 0) {
            var e2 = vn2 < -80 ? REST * 0.8 : 0, jn2 = -(1 + e2) * vn2;
            b.vx += jn2 * wnx; b.vy += jn2 * wny;
            var ttx = -wny, tty = wnx, vt2 = b.vx * ttx + b.vy * tty, jt2 = -vt2, lim2 = (b.nfp >= 3 ? MUP : MUW) * Math.abs(jn2);
            if (jt2 > lim2) jt2 = lim2; else if (jt2 < -lim2) jt2 = -lim2;
            b.vx += jt2 * ttx; b.vy += jt2 * tty;
            b.w -= jt2 / b.r * 0.9;
          }
          b.touch = true; if (wny < -0.75) b.ground = true;
          if (it === 0) { if (!b.wallHit) { b.wallHit = true; b.nc++; } if (wny < 0 && -wny > b.supW) b.supW = -wny; }
          if (wny < -0.2) b.w += (((b.mvx || 0) * ttx2(wnx, wny)) / b.r - b.w) * 0.3;   /* eğimde yuvarlanma: açısal hız gerçek (konumdan ölçülen) teğet hıza yaklaşır */
        }
      }
    }
    /* birleşmeler (çarpışma döngüsü bittikten sonra, dizi değişmesin diye) */
    for (i = 0; i < pend.length; i++) { pend[i][0].pm = pend[i][1].pm = false; tryMerge(pend[i][0], pend[i][1]); }
    /* dönüş, dinlenme ve tehlike sayacı */
    var tnow = now();
    for (i = bodies.length - 1; i >= 0; i--) {
      b = bodies[i];
      var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      b.mvx = b.px === undefined ? 0 : (b.x - b.px) / dt; b.mvy = b.py === undefined ? 0 : (b.y - b.py) / dt;                        /* gerçek hız (konum farkından): çizim için; çözücünün artık "hayalet hızı" yerinde duran meyveyi döndürmesin */
      if (b.ground) { b.w += ((b.mvx / b.r) - b.w) * 0.5; b.vx *= Math.pow(0.992, dt * 180); }   /* zeminde yuvarlanma + yuvarlanma direnci (dt ölçekli: 60 fps/3 alt adımda eski değer) */
      b.w *= Math.pow(0.985, dt * 180);                                         /* havada/temas yokken yavaşça durur (dt ölçekli) */
      b.a += b.w * dt;
      /* çok küçük hız: sıfırla; destekli ve 0.5 sn boyunca yavaşsa dinlenmeye geç (itilince uyanır) */
      /* destek: tek bir temas neredeyse tam alttan (≈10°) ya da birden çok temasın yukarı bileşenleri yeterliyse (sıkışma).
         Desteksiz meyve (eğimde, yanda duran) durdurulmaz: yerçekimiyle kayar/yuvarlanır → kasenin ortasına iner. */
      var supTot = b.sup + b.supW;
      var supported = b.supW >= 0.9994 || b.supMax >= 0.996 || supTot >= 1.25;   /* tek temasla eğimde "tutulmaz": yuvarlanır */
      if (b.nf >= 2 && !b.sleep && sp < 30) { var dmp = Math.pow(0.95, dt * 180); b.vx *= dmp; b.vy *= dmp; }   /* yığın içinde yalnızca sürünme hızındaki hareket sönümlenir; çarpma tepkileri serbest (dt ölçekli) */
      if (b.sleep) { b.vx = b.vy = 0; b.w = 0; if (b.nc === 0 || b.nc < b.ncS) wake(b); }   /* teması azalan (altı boşalan) dinlenen meyve uyanır, düşer */
      else {
        if (supported && sp < VSTOP) { b.vx = 0; b.vy = Math.min(b.vy, 0); if (Math.abs(b.w) < 0.05) b.w = 0; }
        /* dinlenme kararı konuma göre: 0.5 sn içinde 0.8 px'den az yer değiştiren ve temas hâlindeki meyve dinlenir (sürünme/salınım yok) */
        b.win = (b.win || 0) + dt; if (sp > (b.wsp || 0)) b.wsp = sp;
        if (b.win >= 0.5) {
          var moved = Math.abs(b.x - (b.x0 === undefined ? b.x : b.x0)) + Math.abs(b.y - (b.y0 === undefined ? b.y : b.y0));
          /* en az iki teması olan (sıkışmış) ya da desteklenen meyve: 0.5 sn'de 2 px'den az yer değiştirdiyse (çözücünün "hayalet hızı" ile sürünenler dahil) ya da hep sürünme hızının altında kaldıysa dinlenir (statik sürtünme gibi) */
          if (b.touch && (b.nc >= 2 || supported) && (moved < 2 || b.wsp < 8) && b.x0 !== undefined) { b.sleep = true; b.ncS = b.nc; b.vx = b.vy = 0; b.w = 0; }
          b.x0 = b.x; b.y0 = b.y; b.win = 0; b.wsp = 0;
        }
      }
      if (tnow > grace && tnow - b.born > 900 && b.y - b.r < DANGER && sp < 40) { b.over += dt; if (b.over > 1.1 && !dead) gameOver(); } else b.over = 0;
    }
  }
  function ttx2(wnx, wny) { return -wny; }
  function tryMerge(b, o) {
    if (b.dead || o.dead || dead) return;
    var tnow = now(); if (tnow - b.born < 120 || tnow - o.born < 120) return;
    b.dead = o.dead = true;
    var L = b.L, x = (b.x + o.x) / 2, y = (b.y + o.y) / 2, vx = (b.vx + o.vx) / 4, vy = (b.vy + o.vy) / 4;
    bodies = bodies.filter(function (q) { return !q.dead; });
    var R0 = rad(Math.min(L + 1, FRUITS.length - 1));
    for (var k = 0; k < bodies.length; k++) {                     /* komşular uyanır ve "pat" ile hafifçe dışa itilir */
      var q = bodies[k]; wake(q);
      var qx = q.x - x, qy = q.y - y, qd = Math.sqrt(qx * qx + qy * qy) || 1, reach = R0 + q.r + 40;
      if (qd < reach) { var f = (1 - qd / reach) * 240 * Math.min(1.2, (R0 * R0) / q.mass + 0.4); q.vx += qx / qd * f; q.vy += qy / qd * f - 40; }
    }
    merges++; mergesEl.textContent = merges;
    combo = tnow - lastMergeT < 700 ? combo + 1 : 1; lastMergeT = tnow;   /* kombo: art arda birleşmeler (sadece yazı ve ses; puan aynı) */
    if (L >= FRUITS.length - 1) {                       /* en son seviyeden iki tane: büyük boy sufle (görsel kutlama; fizik aynı) */
      addScore(300, x, y, true); startSufle(b, o, x, y); msg("İki kalp birleşti! Benden büyük boy sufle kazandın :D");
      return;
    }
    var nb = addBody(L + 1, x, y, vx, vy - 60); nb.happy = tnow + 650; nb.pop = tnow;
    addScore(FRUITS[L + 1].pts, x, y - nb.r); popFx(x, y, nb.r, FRUITS[L + 1].c);
    snd("merge", { L: L + 1, c: combo });
    if (combo >= 2) floats.push({ x: x, y: y - nb.r - 22, t: tnow + 40, txt: "Kombo ×" + combo, k: 1 });
    if (L + 1 >= 6) shake(L + 1 >= 8 ? 3.4 : 2.4);
    if (FRUITS[L + 1].gizli) {                          /* sürpriz seviye açıldı */
      popFx(x, y, nb.r * 1.3, "#f6c64a"); burst(50); nb.happy = tnow + 2000; snd("gizli");
      if (!seen[FRUITS[L + 1].id]) { seen[FRUITS[L + 1].id] = true; try { localStorage.setItem(FRUITS[L + 1].key, "1"); } catch (e) {} drawChain(); }
      msg(FRUITS[L + 1].msg[0]); return;
    }
    if (L + 1 >= 6) burst(22);
    if (Math.random() < 0.55 || L + 1 >= 5) msg(pick(FRUITS[L + 1].msg));
  }
  function addScore(n, x, y, noFloat) {
    score += n; scoreEl.textContent = score; if (!noFloat) floats.push({ x: x, y: y, t: now(), txt: "+" + n });
    if (score > best) {
      if (!recShown && best0 > 0) { recShown = true; recFx = now(); snd("rekor"); burst(24); bump(bestEl.parentNode); }   /* önceki en iyiyi geçince bir kez */
      best = score; bestEl.textContent = best; try { localStorage.setItem("pm_best", best); } catch (e) {}
    }
  }

  /* ---------- efektler ---------- */
  function popFx(x, y, r, color) {
    var t = now(), i, n = 8 + Math.min(6, Math.round(r / 10));
    fx.push({ k: "ring", x: x, y: y, r: r, t: t, c: color });
    for (i = 0; i < n; i++) { var a = Math.random() * 6.28, sp = 120 + Math.random() * 180; fx.push({ k: "drop", x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, t: t, c: color, s: 2.5 + Math.random() * 3 }); }
    for (i = 0; i < 3; i++) fx.push({ k: "star", x: x + (Math.random() - .5) * r * 2.4, y: y + (Math.random() - .5) * r * 2.4, t: t + Math.random() * 150, c: "#f6b73c", s: 4 + Math.random() * 4 });
    if (fx.length > 90) fx.splice(0, fx.length - 90);
  }
  function drawFx(tnow) {
    var keep = [];
    for (var i = 0; i < fx.length; i++) {
      var e = fx[i], age = (tnow - e.t) / 1000; if (age < 0) { keep.push(e); continue; }
      if (e.k === "ring") { if (age > 0.45) continue; ctx.globalAlpha = (1 - age / 0.45) * 0.8; ctx.lineWidth = 4 * (1 - age / 0.45) + 1; ctx.strokeStyle = e.c; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.7 + age * 2.2), 0, 6.28); ctx.stroke(); }
      else if (e.k === "drop") { if (age > 0.7) continue; var x = e.x + e.vx * age, y = e.y + e.vy * age + 500 * age * age; ctx.globalAlpha = 1 - age / 0.7; ctx.fillStyle = e.c; ctx.beginPath(); ctx.arc(x, y, e.s * (1 - age * 0.6), 0, 6.28); ctx.fill(); }
      else if (e.k === "star") { if (age > 0.5) continue; var s = e.s * (age < 0.2 ? age / 0.2 : 1 - (age - 0.2) / 0.3); ctx.globalAlpha = 0.95; ctx.fillStyle = e.c; ctx.beginPath(); ctx.moveTo(e.x, e.y - s); ctx.lineTo(e.x + s * 0.35, e.y - s * 0.35); ctx.lineTo(e.x + s, e.y); ctx.lineTo(e.x + s * 0.35, e.y + s * 0.35); ctx.lineTo(e.x, e.y + s); ctx.lineTo(e.x - s * 0.35, e.y + s * 0.35); ctx.lineTo(e.x - s, e.y); ctx.lineTo(e.x - s * 0.35, e.y - s * 0.35); ctx.closePath(); ctx.fill(); }
      keep.push(e);
    }
    fx = keep; ctx.globalAlpha = 1;
    var kf = [];
    for (var j = 0; j < floats.length; j++) {
      var f = floats[j], ag = (tnow - f.t) / 1000; if (ag > 0.9) continue;
      if (ag < 0) { kf.push(f); continue; }
      ctx.globalAlpha = ag < 0.6 ? 1 : 1 - (ag - 0.6) / 0.3; ctx.textAlign = "center";
      if (f.k) {                                           /* kombo: küçük bir zıplamayla belirir */
        var zs = ag < 0.14 ? 0.6 + ag / 0.14 * 0.55 : ag < 0.26 ? 1.15 - (ag - 0.14) / 0.12 * 0.15 : 1;
        ctx.save(); ctx.translate(f.x, f.y - 10 - ag * 34); ctx.scale(zs, zs); ctx.font = "800 16px Nunito, -apple-system, sans-serif";
        ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.strokeText(f.txt, 0, 0); ctx.fillStyle = "#e0558a"; ctx.fillText(f.txt, 0, 0); ctx.restore();
      } else { ctx.fillStyle = "#6e52a8"; ctx.font = "800 15px Nunito, -apple-system, sans-serif"; ctx.fillText(f.txt, f.x, f.y - 10 - ag * 40); }
      kf.push(f);
    }
    floats = kf; ctx.globalAlpha = 1;
  }

  /* ---------- çizim ---------- */
  function drawBody(b, tnow) {
    /* endişe yüzü: tehlike çizgisine WARN kadar yaklaşan (ve düşmeyen) meyvede erken başlar; geçiş 300 ms'de yumuşak (wf: 0→1) */
    var wantW = b.over > 0.25 || (b.y - b.r < DANGER + WARN && Math.abs(b.vy) < 40 && tnow - b.born > 900);
    var dtw = b.wt === undefined ? 0 : Math.min(0.1, (tnow - b.wt) / 1000); b.wt = tnow;
    b.wf = Math.max(0, Math.min(1, (b.wf || 0) + (wantW ? dtw : -dtw) / 0.3));
    var face = tnow < b.happy ? "h" : b.wf >= 0.999 ? "w" : "n";
    var s = 1;
    if (FRUITS[b.L].kalp) {                                   /* kalp: sadece görsel — hafif atış (lub-dub) ve ara sıra göz kırpma */
      if (face === "n" && b.wf < 0.001 && tnow >= b.wink) { if (tnow < b.wink + 380) face = "k"; else b.wink = tnow + 3000 + Math.random() * 5000; }
      var ph = ((tnow + b.id * 1000) % 1500) / 1500, beat = ph < 0.12 ? Math.sin(ph / 0.12 * Math.PI) : (ph > 0.16 && ph < 0.3) ? 0.55 * Math.sin((ph - 0.16) / 0.14 * Math.PI) : 0;
      s *= 1 + beat * 0.045;
    }
    var sp = sprites[b.L] && (sprites[b.L][face] || sprites[b.L].n); if (!sp) return;
    if (b.pop) { var p = (tnow - b.pop) / 320; if (p < 1) s *= p < 0.5 ? 0.6 + p * 1.1 : 1.15 - (p - 0.5) * 0.3; else b.pop = 0; }
    var vc = FRUITS[b.L].vc, size = b.r * s * 100 / vc[2], ox = (50 - vc[0]) / 100 * size, oy = (50 - vc[1]) / 100 * size;
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); ctx.drawImage(sp, -size / 2 + ox, -size / 2 + oy, size, size);
    if (face === "n" && b.wf > 0.001 && sprites[b.L].w) { ctx.globalAlpha = b.wf; ctx.drawImage(sprites[b.L].w, -size / 2 + ox, -size / 2 + oy, size, size); ctx.globalAlpha = 1; }   /* endişe yüzü üstte solarak belirir/kaybolur */
    ctx.restore();
  }
  function render(tnow) {
    if (!bgCache) bgCache = drawBg();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var sk = shakeAmt(tnow); if (sk) ctx.translate(sk[0], sk[1]);
    ctx.drawImage(bgCache, 0, 0, W, H);
    dangerPulse(tnow);
    /* kılavuz + eldeki meyve */
    if (!dead) {
      var r = rad(cur), gx = Math.max(inset + r + 2, Math.min(W - inset - r - 2, hx));
      ctx.setLineDash([5, 7]); ctx.strokeStyle = "rgba(236,111,154,.55)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx, TOP + r); ctx.lineTo(gx, H - 20); ctx.stroke(); ctx.setLineDash([]);
      var sp = sprites[cur] && sprites[cur].n; if (sp) { var vc = FRUITS[cur].vc, size = r * 100 / vc[2], ox = (50 - vc[0]) / 100 * size, oy = (50 - vc[1]) / 100 * size; ctx.globalAlpha = canDrop && tnow >= celebUntil ? 1 : 0.55; ctx.drawImage(sp, gx - size / 2 + ox, TOP - size / 2 + oy, size, size); ctx.globalAlpha = 1; }
    }
    for (var i = 0; i < bodies.length; i++) drawBody(bodies[i], tnow);
    drawFx(tnow);
    drawSufle(tnow);
    drawRec(tnow);
  }

  /* ---------- sarsıntı / tehlike / rekor (sadece görsel) ---------- */
  function shake(a) { var t = now(), p = (t - shakeT) / 320, cur = p < 1 ? shakeA * (1 - p) * (1 - p) : 0; shakeA = Math.max(a, cur); shakeT = t; }
  function shakeAmt(tn) { var p = (now() - shakeT) / 320; if (!shakeA || p >= 1) return null; var m = shakeA * (1 - p) * (1 - p); return [Math.sin(tn * 0.11) * m, Math.cos(tn * 0.137) * m * 0.6]; }
  function dangerPulse(tn) {                           /* çizgi uyarısı (sadece görsel): yığın çizgiye yaklaştıkça turuncu yavaş yanar, meyve çizginin üstünde beklerken kırmızı hızlı yanıp söner */
    if (dead) return;
    var m = 0, gap = 1e9, t = now(), i, b, g;
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i]; if (b.over > m) m = b.over;
      if (t - b.born > 900 && Math.abs(b.vy) < 40) { g = b.y - b.r - DANGER; if (g < gap) gap = g; }   /* düşmekte olan meyve sayılmaz, yalnızca yığın */
    }
    var near = gap < WARN ? Math.min(1, 1 - gap / WARN) : 0;
    if (m < 0.12 && near <= 0.02) return;
    var over = m >= 0.12, k = over ? Math.min(1, m / 0.5) * (0.6 + 0.4 * Math.sin(tn / 85)) : near * (0.75 + 0.25 * Math.sin(tn / 240)), c = over ? "229,72,111" : "240,135,79";
    ctx.save();
    var gr = ctx.createLinearGradient(0, DANGER - 2, 0, DANGER + 18);   /* çizginin altında hafif sıcak bir parıltı */
    gr.addColorStop(0, "rgba(" + c + "," + (0.22 * k).toFixed(3) + ")"); gr.addColorStop(1, "rgba(" + c + ",0)");
    ctx.fillStyle = gr; ctx.fillRect(inset + 4, DANGER - 2, W - 2 * inset - 8, 20);
    ctx.globalAlpha = over ? k : 0.3 + 0.65 * k; ctx.setLineDash([4, 6]); ctx.lineWidth = over ? 2.8 : 1.6 + 1.2 * near; ctx.strokeStyle = "rgb(" + c + ")";
    ctx.beginPath(); ctx.moveTo(inset + 6, DANGER); ctx.lineTo(W - inset - 6, DANGER); ctx.stroke(); ctx.restore();
  }
  function E(p) { return p <= 0 ? 0 : p >= 1 ? 1 : p; }
  function eOut(p) { p = E(p); return 1 - (1 - p) * (1 - p) * (1 - p); }
  function eIn(p) { p = E(p); return p * p * p; }
  function eBack(p, k) { p = E(p) - 1; k = k || 1.7; return 1 + (k + 1) * p * p * p + k * p * p; }
  function eBackIn(p) { p = E(p); return 2.7 * p * p * p - 1.7 * p * p; }
  function pill(x, y, txt, fs, a, sc, c1, c2) {        /* yuvarlak etiket: pembe degrade, beyaz yazı */
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.font = "800 " + fs + "px Nunito, -apple-system, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var w = ctx.measureText(txt).width + fs * 1.9, h = fs * 2.05, r = h / 2, g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    function hap(dy) { ctx.beginPath(); ctx.moveTo(-w / 2 + r, -h / 2 + dy); ctx.lineTo(w / 2 - r, -h / 2 + dy); ctx.arc(w / 2 - r, dy, r, -1.5708, 1.5708); ctx.lineTo(-w / 2 + r, h / 2 + dy); ctx.arc(-w / 2 + r, dy, r, 1.5708, 4.7124); ctx.closePath(); }
    hap(3); ctx.fillStyle = "rgba(110,82,168,.22)"; ctx.fill();                       /* gölge: bulanıklık yerine kaydırılmış hap (shadowBlur iOS'ta pahalı) */
    hap(0); ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.fillText(txt, 0, fs * 0.06); ctx.restore();
  }
  function star4(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.3, y - s * 0.3); ctx.lineTo(x + s, y); ctx.lineTo(x + s * 0.3, y + s * 0.3); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.3, y + s * 0.3); ctx.lineTo(x - s, y); ctx.lineTo(x - s * 0.3, y - s * 0.3); ctx.closePath(); ctx.fill(); }
  function drawRec(tn) {                                /* "Yeni rekor!" etiketi: üstten süzülür, 1.8 sn sonra kaybolur */
    if (!recFx) return; var T = now() - recFx; if (T > 1900) { recFx = 0; return; }
    var a = E(T / 160) * (1 - E((T - 1550) / 330)), y = 24 - (1 - eOut(T / 420)) * 26;
    pill(W / 2, y, "Yeni rekor!", 14, a, eBack(T / 420, 2.2), "#9b7fd1", "#ec6f9a");
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "#f6c64a"; var tw = 58 + Math.sin(T / 120) * 2; star4(W / 2 - tw, y - 6, 4 + Math.sin(T / 150) * 1.5); star4(W / 2 + tw, y + 5, 3.5 + Math.cos(T / 140) * 1.5); ctx.restore();
  }

  /* ---------- büyük boy sufle: iki kalp birleşince ~3.3 sn'lik kutlama (fizik normal akar; sadece bu sürede yeni meyve bırakılmaz) ----------
     0–0.3 sn: iki kalp ortada buluşur · 0.25: parlama, halkalar, kalp parçacıkları · 0.3–0.9: sufle kabı belirip ortaya süzülür
     0.64–1.2: sufle kabından kabarır · 1.08: çilek tepeye düşer · 1.3–2.2: pudra şekeri · 1–2.6: buhar, ışınlar, etiket · 2.65–3.3: zincirdeki yerine uçar */
  var HC = ["#f0405c", "#ff8fb0", "#ec6f9a", "#b79ddf", "#f6c64a", "#ff6f91"];
  function startSufle(b, o, x, y) {
    var t = now(), S = suSize(), i;
    var py = Math.max(S * 0.5 + 6, Math.min(H * 0.42, H - S * 0.6 - 36));
    su = { t: t, x: x, y: y, px: W / 2, py: py, S: S, r: b.r, h: [{ x: b.x, y: b.y, a: b.a }, { x: o.x, y: o.y, a: o.a }], hs: [], sg: [], tg: null };
    for (i = 0; i < 18; i++) { var a = i / 18 * 6.283 + Math.random() * 0.3, sp = 210 + Math.random() * 230; su.hs.push({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 140, s: 5 + Math.random() * 5.5, c: HC[i % HC.length], a0: Math.random() * 6.28, va: (Math.random() - 0.5) * 7 }); }
    for (i = 0; i < 30; i++) su.sg.push({ x: (Math.random() - 0.5) * 0.52, y0: -0.64 - Math.random() * 0.3, t0: 1250 + Math.random() * 850, sp: 0.4 + Math.random() * 0.25, s: 0.9 + Math.random() * 0.9, ph: Math.random() * 6.28 });
    celebUntil = t + 2750; gameSu++; suCount++;
    try { localStorage.setItem("pm_sufle", suCount); } catch (e) {}
    shake(5.5); snd("sufle");
    setTimeout(function () { burst(70); }, 280);
  }
  function heartPath(s) { ctx.beginPath(); ctx.moveTo(0, s * 0.38); ctx.bezierCurveTo(-s * 1.1, -s * 0.25, -s * 0.55, -s * 1.05, 0, -s * 0.45); ctx.bezierCurveTo(s * 0.55, -s * 1.05, s * 1.1, -s * 0.25, 0, s * 0.38); ctx.closePath(); }
  function chainTarget() {
    var el = document.querySelector("#chain .chsu") || document.querySelector("#chain svg:last-of-type"), c = cv.getBoundingClientRect(), r;
    if (!el || !c.width) return null; r = el.getBoundingClientRect();
    return { x: (r.left + r.width / 2 - c.left) * W / c.width, y: (r.top + r.height / 2 - c.top) * H / c.height };
  }
  function chainPop() {
    drawChain();
    var el = document.querySelector("#chain .chsu"); if (el) { el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
  }
  function drawSufle(tn) {
    if (!su) return;
    var T = now() - su.t, S = su.S, k, p, i, q;     /* now(): kutlama zamanı fizik adımında başlar; rAF zaman damgası kare başını gösterir, biraz geride kalabilir */
    if (T > 3350) { su = null; chainPop(); return; }
    ctx.save();
    /* 1) iki kalp ortada buluşur */
    if (T < 320 && sprites[9]) {
      p = eIn(T / 300);
      var spr = sprites[9].h || sprites[9].n, vc = FRUITS[9].vc;
      for (k = 0; spr && k < 2; k++) {
        var hh = su.h[k], size = su.r * (1 - 0.3 * p) * 100 / vc[2];
        ctx.save(); ctx.translate(hh.x + (su.x - hh.x) * p, hh.y + (su.y - hh.y) * p); ctx.rotate(hh.a * (1 - p)); ctx.globalAlpha = T < 290 ? 1 : 1 - (T - 290) / 30;
        ctx.drawImage(spr, -size / 2 + (50 - vc[0]) / 100 * size, -size / 2 + (50 - vc[1]) / 100 * size, size, size); ctx.restore();
      }
    }
    /* 2) parlama ve halkalar */
    if (T > 240 && T < 800) {
      p = (T - 240) / 560; var R = su.r * (0.6 + 2.8 * eOut(p)), g = ctx.createRadialGradient(su.x, su.y, 0, su.x, su.y, R);
      g.addColorStop(0, "rgba(255,255,255," + (0.95 * (1 - p) * (1 - p)).toFixed(3) + ")"); g.addColorStop(0.45, "rgba(255,214,231," + (0.6 * (1 - p)).toFixed(3) + ")"); g.addColorStop(1, "rgba(255,214,231,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(su.x, su.y, R, 0, 6.2832); ctx.fill();
    }
    for (k = 0; k < 2; k++) {
      p = (T - 270 - k * 110) / 650;
      if (p > 0 && p < 1) { ctx.globalAlpha = (1 - p) * 0.85; ctx.lineWidth = 7 * (1 - p) + 1; ctx.strokeStyle = k ? "#ff8fb0" : "#f6c64a"; ctx.beginPath(); ctx.arc(su.x, su.y, su.r * (0.5 + 3 * eOut(p)), 0, 6.2832); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    /* 3) kalp parçacıkları */
    var age = (T - 280) / 1000;
    if (age > 0 && age < 1.3) for (i = 0; i < su.hs.length; i++) {
      q = su.hs[i]; ctx.save(); ctx.globalAlpha = Math.max(0, 1 - age / 1.3); ctx.translate(su.x + q.vx * age, su.y + q.vy * age + 520 * age * age); ctx.rotate(q.a0 + q.va * age); ctx.fillStyle = q.c; heartPath(q.s); ctx.fill(); ctx.restore();
    }
    /* 4) sufle */
    if (T > 300) {
      var mv = eOut((T - 300) / 600), cx = su.x + (su.px - su.x) * mv, cy = su.y + (su.py - su.y) * mv, sc = eBack((T - 300) / 480, 2.2);
      if (T > 900) cy += Math.sin((T - 900) / 1000 * 5) * 2;
      if (T > 2650) {                                   /* zincirdeki yerine uçar */
        if (!su.tg) su.tg = chainTarget() || { x: su.px, y: H + 40 };
        var pe = E((T - 2650) / 650), e2 = eIn(pe);
        cx += (su.tg.x - cx) * e2; cy += (su.tg.y - cy) * e2; sc *= Math.max(0, 1 - eBackIn(pe));
      }
      var fade = 1 - E((T - 2600) / 450), ra = E((T - 400) / 400) * fade;
      if (ra > 0) {                                     /* dönen ışınlar ve beyaz hale */
        var RR = S * 1.05;
        ctx.save(); ctx.translate(cx, cy - S * 0.04); ctx.rotate(T / 1000 * 0.45);
        for (k = 0; k < 2; k++) {
          var gr = ctx.createRadialGradient(0, 0, S * 0.08, 0, 0, RR);
          gr.addColorStop(0, k ? "rgba(255,143,176," + (0.42 * ra).toFixed(3) + ")" : "rgba(246,198,74," + (0.5 * ra).toFixed(3) + ")"); gr.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = gr; ctx.beginPath();
          for (i = 0; i < 6; i++) { var a0 = (i * 2 + k) * 0.5236; ctx.moveTo(0, 0); ctx.arc(0, 0, RR, a0 - 0.13, a0 + 0.13); ctx.closePath(); }
          ctx.fill();
        }
        var hg = ctx.createRadialGradient(0, 0, 0, 0, 0, S * 0.62); hg.addColorStop(0, "rgba(255,255,255," + (0.95 * ra).toFixed(3) + ")"); hg.addColorStop(0.55, "rgba(255,244,249," + (0.55 * ra).toFixed(3) + ")"); hg.addColorStop(1, "rgba(255,244,249,0)");
        ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0, 0, S * 0.62, 0, 6.2832); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.globalAlpha = ra;                /* etrafta parıltılar */
        for (i = 0; i < 8; i++) { var th = i * 0.785 + 0.3 + T / 4000, rho = S * (0.5 + 0.07 * (i % 3)), tw = Math.sin(T / 170 + i * 1.7); if (tw > 0) { ctx.fillStyle = i % 2 ? "#ff8fb0" : "#f6c64a"; star4(cx + Math.cos(th) * rho, cy - S * 0.04 + Math.sin(th) * rho * 0.9, S * 0.035 * tw + 1); } }
        ctx.restore();
      }
      if (sc > 0.01 && suImg.kapH) {
        var half = S / 2;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
        ctx.drawImage(T > 1950 && T < 2200 && suImg.kapK ? suImg.kapK : suImg.kapH, -half, -half, S, S);
        var pp = E((T - 640) / 560), pf = 1 - Math.exp(-5 * pp) * Math.cos(7.5 * pp);   /* kabarma: hafif taşıp yerine oturur */
        if (pf > 0.01 && suImg.ust) {
          var sy = pf, sx = 0.9 + 0.1 * Math.min(1, sy) - Math.max(0, sy - 1) * 0.35, ay = S * 0.07;
          ctx.save(); ctx.translate(0, ay); ctx.scale(sx, sy); ctx.translate(0, -ay);
          ctx.drawImage(suImg.ust, -half, -half, S, S);
          if (suImg.seker && T > 1300) { ctx.globalAlpha = E((T - 1300) / 900); ctx.drawImage(suImg.seker, -half, -half, S, S); ctx.globalAlpha = 1; }
          ctx.restore();
        }
        if (suImg.on) ctx.drawImage(suImg.on, -half, -half, S, S);
        if (T > 1080 && suImg.cilek) {                  /* çilek düşer, hafifçe ezilip toparlanır */
          var pd = E((T - 1080) / 330), oy = -(1 - pd * pd) * S * 0.6, bq = T > 1410 ? E((T - 1410) / 280) : 0, sq = bq > 0 ? 1 - 0.2 * Math.sin(bq * Math.PI) * (1 - bq) : 1, cb = -S * 0.29;
          ctx.save(); ctx.globalAlpha = E((T - 1080) / 100); ctx.translate(0, oy + cb); ctx.scale(1 + (1 - sq) * 0.6, sq); ctx.translate(0, -cb); ctx.drawImage(suImg.cilek, -half, -half, S, S); ctx.restore();
        }
        ctx.restore();
        for (i = 0; i < su.sg.length; i++) {           /* pudra şekeri taneleri */
          q = su.sg[i]; var u = (T - q.t0) / 1000; if (u < 0 || u > 1) continue;
          var gy = q.y0 + u * q.sp; if (gy > -0.31) continue;
          ctx.globalAlpha = Math.min(1, u * 6) * 0.95; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx + (q.x * S + Math.sin(u * 7 + q.ph) * 2.5) * sc, cy + gy * S * sc, q.s, 0, 6.2832); ctx.fill();
          ctx.lineWidth = 0.7; ctx.strokeStyle = "rgba(155,127,209,.45)"; ctx.stroke();
        }
        var st = E((T - 1000) / 350) * (1 - E((T - 2400) / 300));
        if (st > 0) for (k = 0; k < 3; k++) for (i = 0; i < 4; i++) {   /* buhar: yükselen yumuşak puflar */
          var uu = (T / 1000 * 0.85 + i / 4 + k * 0.13) % 1, bx = cx + [-0.2, -0.06, 0.26][k] * S * sc, by = cy - [0.33, 0.37, 0.3][k] * S * sc;
          ctx.globalAlpha = st * 0.3 * Math.sin(uu * Math.PI); ctx.fillStyle = "#b8a5dc";
          ctx.beginPath(); ctx.arc(bx + Math.sin(uu * 5 + k) * S * 0.025, by - uu * S * 0.24, S * (0.012 + uu * 0.028), 0, 6.2832); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      var ba = E((T - 950) / 150) * (1 - E((T - 2450) / 250));
      if (ba > 0) pill(cx, cy + S * 0.5 * sc + 16, "Büyük boy sufle", Math.max(13, Math.min(16, Math.round(S * 0.075))), ba, eBack((T - 950) / 380, 2.4), "#f48fb4", "#d9557f");
      var pa = E((T - 1150) / 150) * (1 - E((T - 2300) / 300));
      if (pa > 0) {                                     /* +300 */
        ctx.save(); ctx.globalAlpha = pa; ctx.font = "800 18px Nunito, -apple-system, sans-serif"; ctx.textAlign = "center";
        var px2 = cx + S * 0.4, py2 = cy - S * 0.3 - (T - 1150) / 1000 * 16;
        ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.strokeText("+300", px2, py2); ctx.fillStyle = "#6e52a8"; ctx.fillText("+300", px2, py2); ctx.restore();
      }
    }
    ctx.restore();
  }

  /* ---------- döngü ---------- */
  function loop(t) {
    if (!running) return;
    if (donuk) { lastT = 0; requestAnimationFrame(loop); return; }          /* ekran çevrilmiş: oyun bekler, hiçbir şey ölçeklenmez */
    var dt = lastT ? Math.min(0.033, (t - lastT) / 1000) : 0.016; lastT = t;
    var sub = 3; for (var s = 0; s < sub; s++) step(dt / sub);
    render(t);
    requestAnimationFrame(loop);
  }
  function start() {
    bodies = []; fx = []; floats = []; score = 0; merges = 0; dead = false; canDrop = true; giftShown = false;
    combo = 0; lastMergeT = 0; best0 = best; recShown = false; recFx = 0; su = null; gameSu = 0; celebUntil = 0; shakeA = 0;
    scoreEl.textContent = 0; mergesEl.textContent = 0; over.hidden = true;
    cur = randLevel(); nxt = randLevel(); showNext(); hx = W / 2; gameH0 = H; gameSC0 = SC; kilitYon = yon();
    msg("Kaseye dokun, meyve düşsün. Aynılar birleşir 🍓");
    if (!running) { running = true; lastT = 0; requestAnimationFrame(loop); }
  }
  function showNext() { nextUse.setAttribute("href", "#f-" + FRUITS[nxt].id); nextUse.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#f-" + FRUITS[nxt].id); }
  function drop() {
    if (donuk || !canDrop || dead || now() < celebUntil) return;
    snd("drop");
    var r = rad(cur), gx = Math.max(inset + r + 2, Math.min(W - inset - r - 2, hx));
    addBody(cur, gx, TOP, 0, 120);
    cur = nxt; nxt = randLevel(); showNext();
    canDrop = false; setTimeout(function () { canDrop = true; }, 520);
  }
  function gameOver() {
    dead = true;
    var t = score >= 600 ? "Kase taştı ama bu puan ciddi. Usta işi 📐" : score >= 250 ? "Kase taştı ama puan güzel 🍉" : "Isınma turuydu. Hadi bir daha 🍉";
    var rec = best0 > 0 && score > best0;
    $("overScore").textContent = score; $("overText").textContent = t; $("overBest").textContent = (rec ? "Yeni rekor 🎉" : "En iyi: " + best) + " · Birleşme: " + merges;
    var maxL = bodies.reduce(function (m, b) { return Math.max(m, b.L); }, -1);
    $("overEyebrow").textContent = gameSu > 1 ? gameSu + " büyük boy sufle kazandın 🍫" : gameSu === 1 ? "büyük boy sufle kazandın 🍫" : maxL >= 9 ? "kalbe ulaştın ❤️" : maxL === 8 ? "atom tosta ulaştın 🍞" : maxL === 7 ? "muffine ulaştın 🧁" : maxL === 6 ? "karpuza ulaştın 🍉" : "kase taştı 🍉";
    snd("bitti");
    over.hidden = false;
    showGift();                                       /* sürpriz hediye: yalnızca kalp keşfedildiyse (mevcut yanma akışına eklenti) */
  }

  /* ---------- sürpriz hediye (kalp açıldıysa, kase taşınca) ----------
     Koşul: seen.kalp (kalıcı keşif kaydı) && oyun sonu && hediye daha önce açılmadı (pm_hediye1).
     Oyun içinde hiç görünmez; her oyun sonunda en fazla bir kez tetiklenir; "Evet" ile açılınca bir daha çıkmaz. */
  var giftEl = $("hediye"), giftDone = false, giftShown = false, giftOpening = false;
  try { giftDone = localStorage.getItem("pm_hediye1") === "1"; } catch (e) {}
  function showGift() {
    if (!giftEl || giftShown || giftDone || !seen.kalp || !dead) return;
    giftShown = true; giftEl.hidden = false;
  }
  function openGift() {
    if (giftOpening) return; giftOpening = true;
    var box = $("giftbox"), hNo = $("hNo"), hYes = $("hYes");
    hNo.hidden = true; hYes.disabled = true; $("hHint").textContent = "";
    $("hQ").textContent = "Sıkı bağlamıştım, bir saniye… 🎀";
    box.classList.add("tug");                                                   /* kurdele gerilir, kutu kıpırdar */
    setTimeout(function () { box.classList.add("untie"); }, 1000);              /* kurdele ve fiyonk çözülür */
    setTimeout(function () { box.classList.add("open"); burst(36); $("hQ").textContent = ""; }, 1650);   /* kapak yavaşça açılır, kalp yükselir */
    setTimeout(function () {
      $("hMsg").hidden = false; $("hQ").hidden = true; hYes.hidden = true; $("hDone").hidden = false; burst(70);
      giftDone = true; try { localStorage.setItem("pm_hediye1", "1"); } catch (e) {}
    }, 3200);
  }
  if (giftEl) {
    $("hYes").onclick = openGift;
    $("hDone").onclick = function () { giftEl.hidden = true; };
    if (window.__makeDodger) window.__makeDodger($("hNo"), $("hYes"), $("hHint"),
      ["Emin misin?", "Haydaa", "Bir daha düşün", "Bu buton da bozuk", "Kurdele çok sıkı zaten", "Yakalayamazsın", "Lütfen ama", "Hediye bekliyor", "Pes et artık", "Kutu üzüldü", "Bence belli", "Evet'e bas"],
      ["", "Hayır butonu yine utangaç 😅", "Evet butonu büyüyor, fark ettin mi?", "Bu buton hiçbir sayfada yakalanmadı.", "Bence bu iş belli 🎀"],
      { 5: "Evet, açalım\u00a0🎀", 9: "Evet, açalım\u00a0🎁" },
      "Hayır kaçtı gitti. Geriye bir seçenek kaldı 🎀");
    else $("hNo").hidden = true;                                                 /* kaçma mekanizması yüklenmediyse yalnızca Evet kalır */
  }

  /* ---------- dokunma ---------- */
  var ptrDown = false;
  function px(e) { var r = cv.getBoundingClientRect(); return (e.clientX - r.left) * W / r.width; }
  cv.addEventListener("pointerdown", function (e) { e.preventDefault(); ptrDown = true; hx = px(e); try { cv.setPointerCapture(e.pointerId); } catch (err) {} });
  cv.addEventListener("pointermove", function (e) { if (!ptrDown) return; e.preventDefault(); hx = px(e); });
  function up(e) { if (!ptrDown) return; ptrDown = false; if (e && e.clientX !== undefined) hx = px(e); drop(); }
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", function () { ptrDown = false; });

  /* ---------- zincir (son halka: keşfedilene kadar altın "?") ---------- */
  function drawChain() {
    var c = $("chain"), html = "", n = FRUITS.length, base = 0, k;
    var cw = Math.max(200, (c.clientWidth || 300) - 16);
    for (k = 0; k < n; k++) base += 1 + k * 0.17;
    var unit0 = Math.min(26, (cw - (n - 1) * 9) / base);            /* eski ölçü: zincirin yüksekliği, dolayısıyla kasenin boyu ve meyve ölçeği aynen kalır */
    var ss = Math.round(unit0 * (1 + (n - 1) * 0.17));                 /* sonda sufle: eski kalp boyunda, zincirin en yükseği */
    var unit = Math.min(unit0, (cw - n * 9 - ss) / base);             /* meyveler kalan yere sığar */
    FRUITS.forEach(function (f, i) {
      var s = Math.round(unit * (1 + i * 0.17)), hid = f.gizli && !seen[f.id], id = hid ? "gizli" : f.id, cls = hid ? ' class="gizli"' : "";
      html += '<svg' + cls + ' width="' + s + '" height="' + s + '" viewBox="0 0 100 100"><use href="#f-' + id + '" xlink:href="#f-' + id + '"/></svg><i>›</i>';
    });
    var sid = suCount > 0 ? "sufle" : "gizli";   /* iki kalp birleşene kadar altın "?" */
    html += '<span class="chsu' + (suCount > 0 ? "" : " gizli") + '"><svg width="' + ss + '" height="' + ss + '" viewBox="0 0 100 100"><use href="#f-' + sid + '" xlink:href="#f-' + sid + '"/></svg>' + (suCount > 0 ? "<b>" + suCount + "</b>" : "") + "</span>";
    c.innerHTML = html;
  }
  drawChain();

  $("again2").onclick = start;
  document.addEventListener("visibilitychange", function () { if (document.hidden) { running = false; } else if (!running) { running = true; lastT = 0; requestAnimationFrame(loop); } });
  /* Ekran döndürme / boyut değişimi (tablet yatay-dikey): kase yeniden ölçülür; meyveler kaybolmaz.
     - Ölçek: oyun ortasında kase alçalırsa meyveler de aynı oranda küçülür (tehlike çizgisine kadar olan kapasite korunur), kase yükselince eski ölçeğe döner.
     - Konum: her meyvenin tabandan uzaklığı ölçekle, yatay konumu kase genişliğiyle oranlanır; hız sıfırlanır, 1.5 sn tehlike sayacı işlemez (yığın otursun). */
  function refit() {
    var W0 = W, H0 = H, SC0 = SC, B0 = H0 - 8;
    measure();
    if (bodies.length && gameH0 > DANGER) { var kap = gameSC0 * (H - DANGER) / (gameH0 - DANGER); if (kap < SC) { SC = Math.max(0.3, kap); WARN = Math.round(30 + 30 * SC); } }
    drawChain(); buildSufle();
    var olcek = Math.abs(SC - SC0) > 0.001, B = H - 8, k = SC / SC0, kx = (W - 2 * inset) / (W0 - 2 * inset);
    if (olcek || W !== W0 || H !== H0) {
      bodies.forEach(function (b) {
        if (olcek) { b.r = rad(b.L); b.mass = FRUITS[b.L].d * b.r * b.r; }
        b.x = inset + (b.x - inset) * kx; b.y = B - (B0 - b.y) * k;
        b.x = Math.max(inset + b.r, Math.min(W - inset - b.r, b.x)); b.y = Math.min(B - b.r, b.y);
        b.px = b.x; b.py = b.y; b.vx = 0; b.vy = 0; b.w = 0; b.over = 0; b.sleep = false; b.win = 0; b.wsp = 0; b.x0 = b.x; b.y0 = b.y;
      });
      grace = now() + 1500;
      if (olcek) buildSprites(function () {});
    }
  }
  /* Döndürme yok: telefonda oyun hep dik; tablette oyun hangi yönde başladıysa o yönde kalır. Ekran çevrilince oyun durur,
     "ekranı geri çevir" kartı çıkar; kase ve meyveler hiç yeniden ölçeklenmez (eski büyüme/kaybolma hataları buradan geliyordu).
     Masaüstünde pencere boyutu değişince eskisi gibi uyarlanır. */
  var donuk = false, kilitYon = null, dokunmatik = !!(window.matchMedia && matchMedia("(pointer:coarse)").matches);
  function yon() { return innerWidth > innerHeight ? "y" : "d"; }
  function telefon() { return Math.min(screen.width || innerWidth, screen.height || innerHeight) < 520; }
  function istenen() { if (!dokunmatik) return null; if (telefon()) return "d"; return bodies.length && !dead ? kilitYon : null; }
  var rotEl = null;
  function rotKart(ac, hedef) {
    if (!rotEl) {
      rotEl = document.createElement("div"); rotEl.className = "pmrot"; rotEl.setAttribute("role", "alert");
      rotEl.innerHTML = '<div class="pmrotcard"><svg viewBox="0 0 64 64" aria-hidden="true"><rect x="20" y="8" width="24" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="3.4"/><path d="M29 46h6" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path d="M50 22a20 20 0 0 1 2 18M48 42l4-2 1 4" fill="none" stroke="#ec6f9a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><b></b><span></span></div>';
      document.body.appendChild(rotEl);
    }
    rotEl.querySelector("b").textContent = hedef === "d" ? "Ekranı dik tut" : "Ekranı yan çevir";
    rotEl.querySelector("span").textContent = bodies.length && !dead ? "Oyun durdu; çevirince kaldığın yerden devam." : "Meyve Kasesi dik ekranda oynanıyor.";
    rotEl.hidden = !ac;
  }
  var olcuT = 0;
  function boyutDegisti() {
    clearTimeout(olcuT);
    olcuT = setTimeout(function () {
      var ist = istenen();
      if (ist && yon() !== ist) { donuk = true; ptrDown = false; rotKart(true, ist); return; }
      if (donuk) { donuk = false; rotKart(false); }
      if (dokunmatik && bodies.length && !dead && Math.abs(innerWidth - lastFitW) < 2 && Math.abs(innerHeight - lastFitH) < 140) return;   /* adres çubuğu oynaması: ölçeğe dokunma */
      refit(); lastFitW = innerWidth; lastFitH = innerHeight;
    }, 120);
  }
  var lastFitW = innerWidth, lastFitH = innerHeight;
  addEventListener("resize", boyutDegisti); addEventListener("orientationchange", function () { setTimeout(boyutDegisti, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", boyutDegisti);

  /* yapım aşaması anahtarı (kase.html'de): açıkken oyun hiç başlamaz, sadece "olgunlaşıyor" ekranı görünür */
  if (window.PEKI_MADEM_YAPIM) {
    var yp = $("yapim"); if (yp) yp.hidden = false;
    document.querySelector("main").style.visibility = "hidden";
    return;
  }
  measure(); buildSufle(); setTimeout(boyutDegisti, 0);
  buildSprites(function () {
    /* ilk açılışta kısa tanıtım kartı; "başla" deyince oyun başlar */
    var intro = $("intro"), go = $("introGo");
    if (intro && go) { intro.hidden = false; render(now()); go.onclick = function () { intro.hidden = true; start(); }; }
    else start();
  });

  /* test kancası: kase.html#test */
  if (location.hash === "#test") {
    window.__pm = {
      drop: function (L, x) { addBody(L, x !== undefined ? x : W / 2, TOP, 0, 40); },
      bodies: function () { return bodies; }, score: function () { return score; }, dead: function () { return dead; },
      geom: function () { return { W: W, H: H, SC: SC, DANGER: DANGER }; }, step: function (n) { for (var i = 0; i < n; i++) step(1 / 180); }, over: gameOver,
      add: function (L, x, y) { var b = addBody(L, x, y, 0, 0); b.born = now() - 1000; return b.r; },
      sufle: function () { return { count: suCount, game: gameSu, active: !!su, celeb: now() < celebUntil, img: Object.keys(suImg).length, combo: combo, rec: recShown }; }
    };
  }
})();
