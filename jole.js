/* Jöle – sayılı jöleleri kutuya fırlat; aynı sayılar değince birleşir (1+1=2 … 2048 ve ötesi). Kutu dolarsa biter.
   Yumuşak gövde: her jöle bir nokta halkası (Verlet). Şekil eşleme halkayı toplar; duvarlara, tümseklere ve birbirine çarpınca ezilir, sallanır.
   Üstteki raydan bir jöleyi parmakla tut → sürükle → bırak ya da fırlat. Rekor: jl_best (hesapla eşitlenir), en büyük jöle: jl_max. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var cv = $("kutu"), ctx = cv.getContext("2d"), wrap = $("kutuwrap"), yigin = $("kutuYigin"), arka = $("kutuArka"), on = $("kutuOn");
  var W = 360, H = 600, RAY_Y = 44, CIZGI = 104, PAH = 34, TUM_Y = 330, TUM_R = 24;
  /* jöle fiziği: ağır ve ağır ağır hareket eder (hava sürtünmesi gövdeye), içi ise uzun süre titrer (iç hareket az sönümlenir);
     zemine ve birbirine yapışkan (yüksek sürtünme), sekmez, yayılır; fırlatma hızı sınırlı */
  var CEKIRDEK = 0.88, BASINC = 0.95, TEKRAR = 3, sira2 = [];   /* çekirdek: jöleler en fazla bu kadar iç içe geçer; basınç: hacim ne kadar sert korunur */
  var G = 2100, DT = 1 / 120, SURT = 0.9975, HAVA = 0.0025, SEKIL = 0.0078, AT_MAX = 760, AT_KAT = 0.8;
  var RENK = { 1: "#ff5468", 2: "#ffd84a", 4: "#4fd772", 8: "#2fe3b4", 16: "#3f8cff", 32: "#9d63ff", 64: "#ff4fae", 128: "#ff8c33", 256: "#d9f43c", 512: "#ff9fc8", 1024: "#35f0ff", 2048: "#ffd36b", 4096: "#c9b3ff", 8192: "#ffffff" };
  function renk(v) { return v === 0 ? "#8e889e" : RENK[v] || "#ffffff"; }
  function yaricap(v) { return v === 0 ? 24 : 15 + Math.log(v) / Math.LN2 * 6.1; }
  function koyu(hex, k) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255; return "rgb(" + Math.round(r * k) + "," + Math.round(g * k) + "," + Math.round(b * k) + ")"; }
  var azalt = false; try { azalt = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---------- ses (Web Audio, ilk dokunuşta açılır) ---------- */
  var ac = null, sesAcik = true;
  try { sesAcik = localStorage.getItem("jl_ses") !== "0"; } catch (e) {}
  function sesHazir() { if (!ac) { var A = window.AudioContext || window.webkitAudioContext; if (A) try { ac = new A(); } catch (e) {} } if (ac && ac.state !== "running") try { ac.resume(); } catch (e) {} }
  function ton(f1, f2, sure, vol, tip, gec) {
    if (!sesAcik || !ac) return;
    try {
      var t = ac.currentTime + (gec || 0), o = ac.createOscillator(), g = ac.createGain();
      o.type = tip || "sine"; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + sure);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + sure + 0.03);
    } catch (e) {}
  }
  var ses = {
    tut: function () { ton(420, 640, 0.09, 0.07); },
    birak: function () { ton(300, 180, 0.12, 0.05); },
    pit: function (v, guc) { var k = v ? Math.log(v) / Math.LN2 : 2.5, f = 520 / Math.pow(1.13, k); ton(f * 1.25, f * 0.62, 0.09, Math.min(0.09, 0.025 + guc * 0.07), "sine"); },
    birles: function (v) { var k = Math.log(v) / Math.LN2, f = 200 * Math.pow(2, k / 6); ton(f, f * 1.9, 0.16, 0.11); ton(f * 1.5, f * 2.6, 0.12, 0.05, "triangle", 0.03); },
    cop: function () { ton(180, 120, 0.18, 0.06, "triangle"); },
    temiz: function () { ton(700, 1200, 0.08, 0.05); ton(900, 1500, 0.08, 0.04, "sine", 0.05); },
    bitti: function () { ton(520, 330, 0.3, 0.08); ton(390, 220, 0.4, 0.07, "sine", 0.18); }
  };

  /* ---------- jöle ---------- */
  function Jole(v, x, y, olcek) {
    var r = yaricap(v), n = Math.max(12, Math.min(30, Math.round(Math.PI * 2 * r / 8.5)));
    this.v = v; this.r = r; this.n = n; this.p = []; this.rest = []; this.olcek = olcek || 1; this.buyu = 1; this.tut = false; this.yas = 0; this.aci = 0; this.cx = x; this.cy = y; this.R = r; this.pat = 0;
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2, ox = Math.cos(a) * r, oy = Math.sin(a) * r;
      this.rest.push(ox, oy);
      this.p.push({ x: x + ox * this.olcek, y: y + oy * this.olcek, px: x + ox * this.olcek, py: y + oy * this.olcek });
    }
  }
  Jole.prototype.merkez = function () {
    var sx = 0, sy = 0, P = this.p, n = this.n, R = 0;
    for (var i = 0; i < n; i++) { sx += P[i].x; sy += P[i].y; }
    this.cx = sx / n; this.cy = sy / n;
    for (i = 0; i < n; i++) { var dx = P[i].x - this.cx, dy = P[i].y - this.cy, d = dx * dx + dy * dy; if (d > R) R = d; }
    this.R = Math.sqrt(R);
  };
  Jole.prototype.hiz = function () { var s = 0, P = this.p; for (var i = 0; i < this.n; i++) s += Math.abs(P[i].x - P[i].px) + Math.abs(P[i].y - P[i].py); return s / this.n / DT; };
  Jole.prototype.icinde = function (x, y) {
    var P = this.p, n = this.n, ic = false;
    for (var i = 0, j = n - 1; i < n; j = i++) { var a = P[i], b = P[j]; if (((a.y > y) !== (b.y > y)) && (x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x)) ic = !ic; }
    return ic;
  };
  Jole.prototype.sekil = function (k) {
    /* 1) zayıf şekil eşleme: kimliğini ve dönüşünü korur ama ezilebilir */
    this.merkez();
    var P = this.p, n = this.n, rs = this.rest, s = this.olcek * this.buyu, a = 0, b = 0, i, q, w;
    for (i = 0; i < n; i++) { var qx = P[i].x - this.cx, qy = P[i].y - this.cy, rx = rs[2 * i], ry = rs[2 * i + 1]; a += rx * qx + ry * qy; b += rx * qy - ry * qx; }
    var th = Math.atan2(b, a), c = Math.cos(th), si = Math.sin(th); this.aci = th;
    for (i = 0; i < n; i++) {
      var tx = this.cx + (rs[2 * i] * c - rs[2 * i + 1] * si) * s, ty = this.cy + (rs[2 * i] * si + rs[2 * i + 1] * c) * s;
      P[i].x += (tx - P[i].x) * k; P[i].y += (ty - P[i].y) * k;
    }
    /* 2) kenar yayları: noktalar eşit aralıklı kalsın, sivri uç olmasın */
    var L0 = 2 * Math.PI * this.r * s / n * 0.985;
    for (i = 0; i < n; i++) {
      q = P[i]; w = P[(i + 1) % n]; var dx = w.x - q.x, dy = w.y - q.y, d = Math.sqrt(dx * dx + dy * dy) || 0.001, f = (d - L0) / d * 0.5 * (d < L0 ? 0.45 : 0.04);   /* sıkışmaya karşı sert, uzamaya karşı gevşek: jöle yayılabilsin */
      q.x += dx * f; q.y += dy * f; w.x -= dx * f; w.y -= dy * f;
    }
    /* 3) hacim (alan) korunur: jöle ezilince yanlara taşar, sönmez */
    var alan = 0, cevre = 0;
    for (i = 0; i < n; i++) { q = P[i]; w = P[(i + 1) % n]; alan += q.x * w.y - w.x * q.y; cevre += Math.sqrt((w.x - q.x) * (w.x - q.x) + (w.y - q.y) * (w.y - q.y)); }
    alan *= 0.5; var hedef = Math.PI * this.r * this.r * s * s * 0.97, fark = (hedef - alan) / (cevre || 1) * BASINC;
    for (i = 0; i < n; i++) {
      var o = P[(i + n - 1) % n], nx2 = P[(i + 1) % n], ex = nx2.y - o.y, ey = -(nx2.x - o.x), el = Math.sqrt(ex * ex + ey * ey) || 1;
      P[i].x += ex / el * fark; P[i].y += ey / el * fark;
    }
  };

  /* ---------- oyun durumu ---------- */
  var mod = "tek", atis = 0;
  var jl = [], ray = [], fx = [], yazi = [], tutulan = null, isaret = null, puan = 0, best = 0, enBuyuk = 0, best0 = 0, rekorDendi = false, bitti = false, tasma = 0, birlesme = 0, son = 0, birikim = 0, salla = 0, calisiyor = false;
  try { best = +localStorage.getItem("jl_best") || 0; enBuyuk = +localStorage.getItem("jl_max") || 0; } catch (e) {}
  var puanEl = $("puan"), bestEl = $("best"), buyukEl = $("buyuk"), msgEl = $("jmsg");
  bestEl.textContent = best;
  /* modlar: tek = Klasik (ara ara çöp), sakin (çöp yok), zaman (2 dakika), duello (canlı). Her tek kişilik modun kendi rekoru var. */
  var MODBEST = { tek: "jl_best", sakin: "jl_sbest", zaman: "jl_zbest" }, MODAD = { tek: "Klasik", sakin: "Sakin", zaman: "Zamana karşı" }, ZSURE = 120, zBitis = 0, zKalan = 0;
  function bestOku(m) { try { return +localStorage.getItem(MODBEST[m]) || 0; } catch (e) { return 0; } }

  /* ---------- ray: üstte bekleyen 4 jöle ---------- */
  var RAY_N = 4, sira = 0;
  var rast = Math.random;
  function rayDeger() {
    if (mod === "duello") { var D2 = [[1, 24], [2, 27], [4, 24], [8, 16], [16, 6]], t2 = 0; D2.forEach(function (x) { t2 += x[1]; }); var r2 = rast() * t2; for (var i2 = 0; i2 < D2.length; i2++) { r2 -= D2[i2][1]; if (r2 < 0) return D2[i2][0]; } return 1; }
    var m = 2; jl.forEach(function (j) { if (j.v > m) m = j.v; });
    var L = [[1, 25], [2, 28], [4, 24], [8, 14]]; if (m >= 128) L.push([16, 7]); if (m >= 512) L.push([32, 4]);
    var top = 0; L.forEach(function (x) { top += x[1]; }); var r = Math.random() * top;
    for (var i = 0; i < L.length; i++) { r -= L[i][1]; if (r < 0) return L[i][0]; } return 1;
  }
  function raySlot(i) { return 52 + i * ((W - 104) / (RAY_N - 1)); }
  function rayDoldur(ilk) {
    while (ray.length < RAY_N) { var i = ray.length; ray.push({ v: rayDeger(), x: ilk ? raySlot(i) : W + 40, gir: ilk ? 1 : 0, faz: rast() * 6, id: ++sira }); if (!ilk) kapiParla = 1; }
  }
  var kapiParla = 0;
  function rayBoy(v) { var r = Math.min(yaricap(v), 30); return { w: Math.max(40, r * 2.2), h: Math.max(24, r * 1.15) }; }

  /* ---------- dokunma ---------- */
  var olcek = 1, ofx = 0, ofy = 0, iz = [], sonAtis = 0;   /* iki atış arası en az 0,32 sn: makineli tıklamayla kutu doldurulmaz */
  function dunya(e) { var b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) / olcek, y: (e.clientY - b.top) / olcek }; }
  cv.addEventListener("pointerdown", function (e) {
    sesHazir();
    if (bitti || tutulan || performance.now() - sonAtis < 320) return;
    var q = dunya(e), hedef = -1, enYakin = 1e9;
    ray.forEach(function (p, i) { if (p.bos) return; var bx = rayBoy(p.v), dx = q.x - p.x, dy = q.y - RAY_Y; if (Math.abs(dx) < bx.w / 2 + 14 && Math.abs(dy) < bx.h / 2 + 26 && Math.abs(dx) < enYakin) { enYakin = Math.abs(dx); hedef = i; } });
    if (hedef < 0) { if (q.y < CIZGI + 40) mesaj("Üstteki jölelerden birini tut 👆"); return; }
    e.preventDefault();
    /* tutulan jölenin yeri boş kalır (diğerleri kaymasın, alttan aynı sayı kayıp kendiliğinden birleşmesin); bırakınca kapanır */
    var p = ray[hedef]; ray[hedef] = { bos: true, x: p.x, id: ++sira };
    var j = new Jole(p.v, p.x, RAY_Y, 0.55); j.tut = true; j.buyu = 1; j.yuva = ray[hedef]; jl.push(j); tutulan = j;
    isaret = { x: q.x, y: q.y, id: e.pointerId }; iz = [{ x: q.x, y: q.y, t: performance.now() }];
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    ses.tut(); mesaj("");
  });
  function yuvaKapat(j) {
    var k = ray.indexOf(j.yuva); if (k >= 0) ray.splice(k, 1); j.yuva = null;
    setTimeout(function () { if (!bitti) rayDoldur(false); }, 260);
  }
  cv.addEventListener("pointermove", function (e) {
    if (!tutulan || !isaret || e.pointerId !== isaret.id) return;
    var q = dunya(e); isaret.x = q.x; isaret.y = q.y;
    var t = performance.now(); iz.push({ x: q.x, y: q.y, t: t }); while (iz.length > 2 && t - iz[0].t > 110) iz.shift();
  });
  function birak(e) {
    if (!tutulan || !isaret || (e && e.pointerId !== isaret.id)) return;
    /* bırakınca jöle kendi hızıyla devam eder ama ağırdır: hızı kısılır ve sınırlanır, mermi gibi uçmaz */
    var j = tutulan, vx = 0, vy = 0;
    if (iz.length > 1) { var a = iz[0], b = iz[iz.length - 1], dt = Math.max(16, b.t - a.t) / 1000; vx = (b.x - a.x) / dt * AT_KAT; vy = (b.y - a.y) / dt * AT_KAT; }
    var sp = Math.sqrt(vx * vx + vy * vy); if (sp > AT_MAX) { vx *= AT_MAX / sp; vy *= AT_MAX / sp; }
    var gvx = 0, gvy = 0; j.p.forEach(function (q) { gvx += q.x - q.px; gvy += q.y - q.py; }); gvx /= j.n; gvy /= j.n;
    j.tut = false; j.yas = 0;
    j.p.forEach(function (q) { var ix = q.x - q.px - gvx, iy = q.y - q.py - gvy; q.px = q.x - vx * DT - ix; q.py = q.y - vy * DT - iy; });
    yuvaKapat(j); tutulan = null; isaret = null; ses.birak(); sonAtis = performance.now();
    atis++;
    if (mod === "zaman" && !zBitis) zBitis = Date.now() + ZSURE * 1000;
    if (mod === "tek" && atis >= 10) { var aralik = Math.max(5, 10 - Math.floor(puan / 1500)); if (atis % aralik === 0) copGelsin(puan > 4000 ? 2 : 1); }
  }
  cv.addEventListener("pointerup", birak); cv.addEventListener("pointercancel", birak);

  /* ---------- fizik adımı ---------- */
  function duvar(q) {
    var vx = q.x - q.px, vy = q.y - q.py;
    if (q.x < 0) { q.x = 0; q.py += vy * 0.4; }
    else if (q.x > W) { q.x = W; q.py += vy * 0.4; }
    if (q.y > H) { q.y = H; q.px += vx * 0.6; }
    var d = (q.x + (H - q.y) - PAH) / Math.SQRT2; if (d < 0) { q.x -= d / Math.SQRT2; q.y += d / Math.SQRT2; q.px += vx * 0.2; }
    d = ((W - q.x) + (H - q.y) - PAH) / Math.SQRT2; if (d < 0) { q.x += d / Math.SQRT2; q.y += d / Math.SQRT2; q.px += vx * 0.2; }
    for (var s = 0; s < 2; s++) { var cx = s ? W : 0, dx = q.x - cx, dy = q.y - TUM_Y, dd = dx * dx + dy * dy; if (dd < TUM_R * TUM_R && dd > 0.0001) { var l = Math.sqrt(dd), k = (TUM_R - l) / l; q.x += dx * k; q.y += dy * k; } }
    if (q.y < -260) q.y = -260;
  }
  var temas = [];
  function carpis(A, B) {
    /* A'nın B'nin içine giren noktalarını dışarı it (tutulan jöle hareket etmez) */
    var P = A.p, Q = B.p, n = B.n, R2 = (B.R + 2) * (B.R + 2), oldu = false;
    for (var i = 0; i < A.n; i++) {
      var p = P[i], dx0 = p.x - B.cx, dy0 = p.y - B.cy; if (dx0 * dx0 + dy0 * dy0 > R2) continue;
      if (!B.icinde(p.x, p.y)) continue;
      var en = 1e9, ej = 0, et = 0, eqx = 0, eqy = 0;
      for (var j = 0; j < n; j++) {
        var a = Q[j], b = Q[(j + 1) % n], ex = b.x - a.x, ey = b.y - a.y, L = ex * ex + ey * ey, t = L > 0 ? ((p.x - a.x) * ex + (p.y - a.y) * ey) / L : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t; var qx = a.x + ex * t, qy = a.y + ey * t, d = (qx - p.x) * (qx - p.x) + (qy - p.y) * (qy - p.y);
        if (d < en) { en = d; ej = j; et = t; eqx = qx; eqy = qy; }
      }
      var mx = eqx - p.x, my = eqy - p.y, pa = A.tut ? 0 : B.tut ? 1 : 0.5, pb = 1 - pa;
      p.x += mx * pa; p.y += my * pa;
      if (pb > 0) { var qa = Q[ej], qb = Q[(ej + 1) % n]; qa.x -= mx * pb * (1 - et); qa.y -= my * pb * (1 - et); qb.x -= mx * pb * et; qb.y -= my * pb * et; }
      if (!A.tut) { p.px += (p.x - p.px) * 0.15; p.py += (p.y - p.py) * 0.15; }
      oldu = true;
    }
    return oldu;
  }
  function adim() {
    var i, j, A, B, q;
    for (i = 0; i < jl.length; i++) {
      A = jl[i]; A.yas += DT;
      if (A.buyu < 1) A.buyu = Math.min(1, A.buyu + DT * 2.2);
      if (A.olcek < 1) A.olcek = Math.min(1, A.olcek + DT * 4.5);
      if (A.kaynas > 0) A.kaynas = Math.max(0, A.kaynas - DT * 1.6);
      /* gövde hızı (ağırlık merkezi) hava sürtünmesiyle yavaşlar; iç titreşim az sönümlenir → jöle gibi sallanır */
      var gvx = 0, gvy = 0;
      for (j = 0; j < A.n; j++) { q = A.p[j]; gvx += q.x - q.px; gvy += q.y - q.py; }
      gvx /= A.n; gvy /= A.n;
      var ic = A.tut ? 0.985 : SURT, hv = A.tut ? 0.06 : HAVA;
      for (j = 0; j < A.n; j++) {
        q = A.p[j]; var vx = (q.x - q.px - gvx) * ic + gvx * (1 - hv), vy = (q.y - q.py - gvy) * ic + gvy * (1 - hv);
        q.px = q.x; q.py = q.y; q.x += vx; q.y += vy + G * DT * DT;
      }
      if (A.tut) {
        /* parmakla tutulan jöle üst kısmından çekilir: alt kısmı geriden gelir, sarkar ve sallanır */
        var hx = Math.max(A.r * 0.6, Math.min(W - A.r * 0.6, isaret ? isaret.x : A.cx)), hy = Math.max(RAY_Y - 6, Math.min(CIZGI - A.r * 0.45, isaret ? isaret.y : A.cy)) + A.r * 0.2;
        var sc = A.olcek * A.buyu;
        for (j = 0; j < A.n; j++) {
          q = A.p[j]; var ry = A.rest[2 * j + 1], w = ry < -A.r * 0.3 ? 0.11 : ry < A.r * 0.3 ? 0.06 : 0.03;
          q.x += (hx + A.rest[2 * j] * sc - q.x) * w; q.y += (hy + ry * sc - q.y) * w;
        }
      }
    }
    /* çarpma algısı: gövde hızı bir adımda sert düştüyse jöle bir yere çarpmıştır */
    for (i = 0; i < jl.length; i++) { A = jl[i]; A.oncekiV = A.gV || 0; }
    temas.length = 0;
    /* temaslar alttan üste çözülür: alttaki jöle üstündekinin ağırlığını taşır, yığın çökmez */
    sira2 = jl.slice().sort(function (a, b) { return b.cy - a.cy; });
    var tekrar = jl.length > 30 ? Math.min(2, TEKRAR) : TEKRAR;   /* kutu çok doluyken zayıf telefonlar yorulmasın */
    for (var it = 0; it < tekrar; it++) {
      for (i = 0; i < jl.length; i++) { A = jl[i]; A.sekil(A.tut ? 0.045 : A.kaynas > 0 ? SEKIL + 0.03 * A.kaynas : SEKIL); for (j = 0; j < A.n; j++) duvar(A.p[j]); A.merkez(); }
      for (i = 0; i < sira2.length; i++) for (j = i + 1; j < sira2.length; j++) {
        A = sira2[i]; B = sira2[j];
        var dx = A.cx - B.cx, dy = A.cy - B.cy, rr = A.R + B.R + 2;
        if (it === 0 && A.v === B.v && A.v > 0 && !A.tut && !B.tut) {
          var ce = (A.r + B.r) * 1.35, d2 = dx * dx + dy * dy;
          if (d2 < ce * ce && d2 > 1) { var dl = Math.sqrt(d2), ck = 0.045 * (1 - dl / ce) / dl, k3; for (k3 = 0; k3 < A.n; k3++) { A.p[k3].x -= dx * ck; A.p[k3].y -= dy * ck; } for (k3 = 0; k3 < B.n; k3++) { B.p[k3].x += dx * ck; B.p[k3].y += dy * ck; } }
        }
        if (dx * dx + dy * dy > rr * rr) continue;
        /* derin iç içe geçme (birleşme büyümesi, hızlı çarpma): merkezleri ayır ki halkalar dolanmasın */
        var dd = Math.sqrt(dx * dx + dy * dy) || 0.01, minD = (A.r * A.olcek * A.buyu + B.r * B.olcek * B.buyu) * CEKIRDEK;
        if (dd < minD) {
          var it2 = (minD - dd) / dd * 0.5, wa = A.tut ? 0 : B.tut ? 1 : B.r * B.r / (A.r * A.r + B.r * B.r), wb = A.tut ? 1 : B.tut ? 0 : 1 - wa, k2;
          for (k2 = 0; k2 < A.n; k2++) { A.p[k2].x += dx * it2 * wa * 2; A.p[k2].y += dy * it2 * wa * 2; }
          for (k2 = 0; k2 < B.n; k2++) { B.p[k2].x -= dx * it2 * wb * 2; B.p[k2].y -= dy * it2 * wb * 2; }
          A.merkez(); B.merkez();
        }
        var t1 = carpis(A, B), t2 = carpis(B, A);
        if ((t1 || t2) && A.v === B.v && A.v > 0 && !A.tut && !B.tut) temas.push([A, B]);
      }
    }
    for (i = 0; i < temas.length; i++) birlestir(temas[i][0], temas[i][1]);
    for (i = 0; i < jl.length; i++) {
      A = jl[i]; var sx2 = 0, sy2 = 0; for (j = 0; j < A.n; j++) { sx2 += A.p[j].x - A.p[j].px; sy2 += A.p[j].y - A.p[j].py; }
      var gv = Math.sqrt(sx2 * sx2 + sy2 * sy2) / A.n / DT; A.gV = gv; if (A.pitBekle > 0) A.pitBekle -= DT;
      var dus = (A.oncekiV || 0) - gv;
      if (!A.tut && dus > 260 && !(A.pitBekle > 0)) { A.pitBekle = 0.22; carpti(A, Math.min(1, dus / 900)); }
    }
  }
  function birlestir(A, B) {
    if (jl.indexOf(A) < 0 || jl.indexOf(B) < 0) return;
    A.merkez(); B.merkez();
    var wa = A.r * A.r, wb = B.r * B.r, x = (A.cx * wa + B.cx * wb) / (wa + wb), y = (A.cy * wa + B.cy * wb) / (wa + wb);
    var hep = A.p.concat(B.p), vx = 0, vy = 0; hep.forEach(function (q) { vx += q.x - q.px; vy += q.y - q.py; }); vx /= hep.length; vy /= hep.length;
    jl.splice(jl.indexOf(A), 1); jl.splice(jl.indexOf(B), 1);
    var v = A.v * 2, Y = new Jole(v, x, y, 1); Y.pat = 1; Y.yas = 0.3; Y.kaynas = 1;
    /* her yön için iki jölenin o yöndeki en uzak kenarını bul: yeni jöle bu hatla başlar */
    var aci = hep.map(function (q) { return Math.atan2(q.y - y, q.x - x); }), uz = hep.map(function (q) { return Math.sqrt((q.x - x) * (q.x - x) + (q.y - y) * (q.y - y)); });
    var pen = Math.PI * 2 / Y.n * 1.3, sinir = [];
    for (var k = 0; k < Y.n; k++) {
      var th = Math.atan2(Y.rest[2 * k + 1], Y.rest[2 * k]), en = -1;
      for (var m = 0; m < hep.length; m++) { var fa = Math.abs(((aci[m] - th + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (fa < pen && uz[m] > en) en = uz[m]; }
      sinir.push(en);
    }
    for (k = 0; k < Y.n; k++) if (sinir[k] < 0) { var a2 = sinir[(k + Y.n - 1) % Y.n], b2 = sinir[(k + 1) % Y.n]; sinir[k] = Math.max(a2, b2, Math.min(A.r, B.r)); }
    /* başlangıç hattı duvar/zemin dışına taşmasın; taşarsa düzeltme hıza dönüşüp jöleyi zıplatmasın diye önce düzeltilir, sonra hız verilir */
    Y.p.forEach(function (q, k) { var th = Math.atan2(Y.rest[2 * k + 1], Y.rest[2 * k]), d = sinir[k] * 0.96; q.x = x + Math.cos(th) * d; q.y = y + Math.sin(th) * d; q.px = q.x; q.py = q.y; duvar(q); q.px = q.x - vx; q.py = q.y - vy; });
    jl.push(Y);
    kazan(v, x, y, Y.r);
    copTemizle(x, y, Y.r);
    if (window.Hesap && Hesap.planla) try { Hesap.planla(); } catch (e) {}
  }

  /* birleşme dalgası: yakındaki gri jöleleri eritir */
  function copTemizle(x, y, r) {
    var silinen = 0;
    for (var i = jl.length - 1; i >= 0; i--) {
      var g = jl[i]; if (g.v !== 0 || g.tut) continue; g.merkez();
      var dx = g.cx - x, dy = g.cy - y, menzil = r * 1.55 + g.r;
      if (dx * dx + dy * dy < menzil * menzil) {
        jl.splice(i, 1); silinen++;
        for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2, s2 = 90 + Math.random() * 160; fx.push({ t: 0, x: g.cx, y: g.cy, vx: Math.cos(a) * s2, vy: Math.sin(a) * s2 - 60, r: 2 + Math.random() * 3.5, c: "#b8b2c8" }); }
        fx.push({ t: 0, x: g.cx, y: g.cy, r: g.r, c: "#d6d1e4", halka: true });
      }
    }
    if (silinen) { puan += 5 * silinen; puanEl.textContent = puan; ses.temiz(); yazi.push({ t: 0, x: x, y: y + r * 0.5, s: "çöp temizlendi" + (silinen > 1 ? " ×" + silinen : ""), c: "#d6d1e4" }); }
  }
  /* gri jöle yağdır: önce üstte uyarı çıkar, 1,2 sn sonra düşer */
  var copKuyruk = [];
  function copGelsin(n, kaynak) { for (var i = 0; i < n; i++) copKuyruk.push({ t: 1.2 + i * 0.35, x: 40 + Math.random() * (W - 80), kaynak: kaynak || "" }); if (n) ses.cop(); }
  function copIlerle(dt) {
    for (var i = copKuyruk.length - 1; i >= 0; i--) {
      var c = copKuyruk[i]; c.t -= dt;
      if (c.t <= 0) { copKuyruk.splice(i, 1); var g = new Jole(0, c.x, -26, 1); g.p.forEach(function (q) { q.py = q.y - 3; }); jl.push(g); }
    }
  }
  function carpti(A, guc) {
    ses.pit(A.v, guc);
    if (guc > 0.45 && navigator.vibrate) try { navigator.vibrate(6); } catch (e) {}
    var en = -1e9, ex = A.cx; for (var i = 0; i < A.n; i++) if (A.p[i].y > en) { en = A.p[i].y; ex = A.p[i].x; }
    fx.push({ t: 0, x: ex, y: en, r: A.r * 0.7, c: renk(A.v), ezil: true, g: guc });
  }
  /* birleşme ödülü: puan, rekor, en büyük, ses, efekt (kutuda da rayda da) */
  var kombo = 0, sonBirlesme = 0;
  function kazan(v, x, y, rr) {
    var simdi = performance.now(); kombo = simdi - sonBirlesme < 1400 ? kombo + 1 : 1; sonBirlesme = simdi;
    var kc = Math.min(kombo, 5), ek = kc > 1 ? Math.round(v * (kc - 1) * 0.5) : 0;   /* çarpan en fazla ×5: hızlı hızlı tıklamakla puan şişmez */
    if (kombo > 1 && kombo <= 5) tekYazi("kombo", { t: 0, x: W / 2, y: 190, s: "Kombo ×" + kombo + "!", c: "#ffd36b", buyuk: true });
    if (typeof saldiri === "function") saldiri(v, kombo);
    birlesme++; puan += v + ek; puanEl.textContent = puan; puanEl.parentNode.classList.remove("zipla"); void puanEl.offsetWidth; puanEl.parentNode.classList.add("zipla");
    var yeniRekor = false;
    var bk = MODBEST[mod];
    if (bk && puan > best) { best = puan; bestEl.textContent = best; try { localStorage.setItem(bk, String(best)); } catch (e) {} if (mod === "zaman") $("dRakipPuan").textContent = best; if (!rekorDendi && best0 > 0) { rekorDendi = true; yeniRekor = true; } }
    if (v > enBuyuk) { enBuyuk = v; try { localStorage.setItem("jl_max", String(enBuyuk)); } catch (e) {} buyukCiz(); if (v >= 64) mesaj(v + " jölesi ilk kez! 🎉"); }
    if (yeniRekor) mesaj("Yeni rekor! 🏆");
    ses.birles(v); if (navigator.vibrate && v >= 32) try { navigator.vibrate(12); } catch (e) {}
    var c = renk(v), k;
    fx.push({ t: 0, x: x, y: y, r: rr, c: c, halka: true });
    for (k = 0; k < Math.min(18, 6 + Math.log(v) / Math.LN2 * 1.2); k++) { var a = Math.random() * Math.PI * 2, s = 120 + Math.random() * 220; fx.push({ t: 0, x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, r: 2.5 + Math.random() * 4, c: c }); }
    yazi.push({ t: 0, x: x, y: y - rr * 0.4, s: "+" + v, c: c });
    if (v >= 256 && !azalt) salla = Math.min(1, 0.35 + v / 4096);
  }

  /* ---------- taşma: çizginin üstünde duran jöle 2 sn kalırsa biter ---------- */
  function tasmaBak(dt) {
    var uyari = false;
    for (var i = 0; i < jl.length; i++) {
      var A = jl[i]; if (A.tut || A.yas < 1.4) continue;
      var ust = 1e9; for (var j = 0; j < A.n; j++) if (A.p[j].y < ust) ust = A.p[j].y;
      if (ust < CIZGI && A.hiz() < 70) { uyari = true; break; }
    }
    tasma = uyari ? tasma + dt : Math.max(0, tasma - dt * 2);
    if (tasma > 2.1) oyunBitti();
  }

  /* ---------- çizim ---------- */
  function yol(A, ox, oy) {
    var P = A.p, n = A.n; ctx.beginPath();
    ctx.moveTo((P[n - 1].x + P[0].x) / 2 - ox, (P[n - 1].y + P[0].y) / 2 - oy);
    for (var i = 0; i < n; i++) { var a = P[i], b = P[(i + 1) % n]; ctx.quadraticCurveTo(a.x - ox, a.y - oy, (a.x + b.x) / 2 - ox, (a.y + b.y) / 2 - oy); }
    ctx.closePath();
  }
  /* her sayı için bir kez hazırlanır: renk geçişi (jölenin merkezine göre), kenar rengi ve sayının resmi */
  var boya = {};
  function acik(hex, k) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255; return "rgb(" + Math.round(r + (255 - r) * k) + "," + Math.round(g + (255 - g) * k) + "," + Math.round(b + (255 - b) * k) + ")"; }
  function boyaAl(v) {
    var b = boya[v]; if (b) return b;
    var c = renk(v), r = yaricap(v), k = (cv.width / W) || 2, s = v === 0 ? "" : String(v), fs = r * (s.length <= 1 ? 0.78 : s.length === 2 ? 0.66 : s.length === 3 ? 0.52 : 0.42);
    /* jöle: içi açık ve ışık geçiren, kenara doğru koyulaşan renk */
    var gr = ctx.createRadialGradient(-r * 0.12, -r * 0.2, r * 0.05, 0, 0, r * 1.15);
    gr.addColorStop(0, acik(c, 0.45)); gr.addColorStop(0.55, c); gr.addColorStop(0.9, koyu(c, 0.8)); gr.addColorStop(1, koyu(c, 0.66));
    var yc = document.createElement("canvas"), x = yc.getContext("2d"), w = Math.ceil(fs * s.length * 0.75 + fs * 0.6), h = Math.ceil(fs * 1.3);
    yc.width = Math.ceil(w * k); yc.height = Math.ceil(h * k); x.scale(k, k);
    if (v === 0) { w = r * 1.4; h = r; yc.width = Math.ceil(w * k); yc.height = Math.ceil(h * k); x.setTransform(k, 0, 0, k, 0, 0); x.strokeStyle = "rgba(40,30,55,.75)"; x.fillStyle = "rgba(40,30,55,.75)"; x.lineWidth = r * 0.09; x.lineCap = "round";
      x.beginPath(); x.moveTo(w * 0.24, h * 0.3); x.lineTo(w * 0.42, h * 0.38); x.moveTo(w * 0.76, h * 0.3); x.lineTo(w * 0.58, h * 0.38); x.stroke();
      x.beginPath(); x.arc(w * 0.36, h * 0.5, r * 0.07, 0, Math.PI * 2); x.arc(w * 0.64, h * 0.5, r * 0.07, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.arc(w * 0.5, h * 0.92, r * 0.16, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); }
    else { x.font = "900 " + fs.toFixed(1) + "px Nunito, system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "rgba(24,14,36,.78)"; x.fillText(s, w / 2, h / 2 + fs * 0.06); }
    b = boya[v] = { gr: gr, kenar: koyu(c, 0.55), yazi: yc, yw: w, yh: h };
    return b;
  }
  var KABARCIK = [[0.38, 0.3, 0.07], [0.5, -0.05, 0.045], [-0.42, 0.38, 0.055]];
  function joleCiz(A, zaman) {
    var b = boyaAl(A.v), cx = A.cx, cy = A.cy, r = A.r, i;
    ctx.save(); ctx.translate(cx, cy);
    yol(A, cx, cy);
    ctx.globalAlpha = 0.9; ctx.fillStyle = b.gr; ctx.fill();
    ctx.globalAlpha = 0.85; ctx.lineWidth = 2; ctx.strokeStyle = b.kenar; ctx.stroke(); ctx.globalAlpha = 1;
    /* ıslak parıltı: üst kenara yakın ince bir yay + küçük bir nokta */
    ctx.save(); ctx.rotate(A.aci * 0.25);
    ctx.globalAlpha = 0.55; ctx.strokeStyle = "#fff"; ctx.lineCap = "round"; ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.68, Math.PI * 1.08, Math.PI * 1.42); ctx.stroke();
    ctx.globalAlpha = 0.7; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.62, Math.max(1.4, r * 0.055), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    /* jölenin içindeki küçük kabarcıklar jöleyle birlikte döner */
    ctx.save(); ctx.rotate(A.aci); ctx.globalAlpha = 0.28; ctx.fillStyle = "#fff";
    for (i = 0; i < KABARCIK.length; i++) { var kb = KABARCIK[i]; ctx.beginPath(); ctx.arc(kb[0] * r, kb[1] * r, Math.max(1.2, kb[2] * r), 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
    /* sayı jöleyle döner ama baş aşağı olmaz: açı ±35°'de kalır */
    var ya = A.aci; while (ya > Math.PI) ya -= Math.PI * 2; while (ya < -Math.PI) ya += Math.PI * 2;
    if (A.yaziAci === undefined) A.yaziAci = 0; var hedefA = Math.max(-0.6, Math.min(0.6, ya)); A.yaziAci += (hedefA - A.yaziAci) * 0.2;
    ctx.rotate(A.yaziAci);
    var pk = A.pat > 0 ? 1 + Math.sin(A.pat * Math.PI) * 0.18 : 1;
    ctx.drawImage(b.yazi, -b.yw / 2 * pk, -b.yh / 2 * pk, b.yw * pk, b.yh * pk);
    ctx.restore();
  }
  var hapBoya = {};
  function hap(x, y, w, h, c, v, kx, ky) {
    ctx.save(); ctx.translate(x, y); ctx.scale(kx, ky);
    var r = h / 2; ctx.beginPath(); ctx.moveTo(-w / 2 + r, -r); ctx.lineTo(w / 2 - r, -r); ctx.arc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(-w / 2 + r, r); ctx.arc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
    var hb = hapBoya[v + ":" + h]; if (!hb) { var gr = ctx.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.25, c); gr.addColorStop(1, koyu(c, 0.75)); hb = hapBoya[v + ":" + h] = { gr: gr, k: koyu(c, 0.6) }; }
    ctx.fillStyle = hb.gr; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = hb.k; ctx.stroke();
    ctx.font = "900 " + (h * 0.58).toFixed(1) + "px Nunito, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "rgba(24,14,36,.82)"; ctx.fillText(String(v), 0, h * 0.04);
    ctx.restore();
  }
  function kutuYolu(ic) {
    var e = ic ? 0 : 5; ctx.beginPath();
    ctx.moveTo(-e, -18); ctx.lineTo(-e, H - PAH + e * 0.4); ctx.lineTo(PAH - e * 0.4, H + e); ctx.lineTo(W - PAH + e * 0.4, H + e); ctx.lineTo(W + e, H - PAH + e * 0.4); ctx.lineTo(W + e, -18);
  }
  /* değişmeyen katmanlar (zemin + tümsekler arkada, çerçeve önde) ayrı tuvallere bir kez çizilir; her karede sadece jöleler çizilir */
  var katmanHazir = false, sallaVar = false;
  function katmanlar() {
    var dpr = cv.width / (W * olcek), k = dpr * olcek, i, c0 = ctx;
    [arka, on].forEach(function (c) { c.width = cv.width; c.height = cv.height; c.style.width = cv.style.width; c.style.height = cv.style.height; });
    ctx = arka.getContext("2d"); ctx.setTransform(k, 0, 0, k, 0, 0);
    kutuYolu(true); ctx.lineTo(0, -18); ctx.closePath();
    var bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#1b1430"); bg.addColorStop(0.3, "#120d22"); bg.addColorStop(1, "#0b0816"); ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.035)"; ctx.fillRect(0, RAY_Y - 30, W, 60);
    ctx.fillStyle = "rgba(255,255,255,.18)"; for (i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(raySlot(i), 6, 2.2, 0, Math.PI * 2); ctx.fill(); }
    for (var s2 = 0; s2 < 2; s2++) {
      var cx = s2 ? W : 0; ctx.beginPath(); ctx.arc(cx, TUM_Y, TUM_R, s2 ? Math.PI / 2 : -Math.PI / 2, s2 ? Math.PI * 1.5 : Math.PI / 2); ctx.closePath();
      var tg = ctx.createRadialGradient(cx, TUM_Y, 4, cx, TUM_Y, TUM_R); tg.addColorStop(0, "#7d7398"); tg.addColorStop(1, "#4a4262"); ctx.fillStyle = tg; ctx.fill();
      ctx.fillStyle = "#c9c2dc"; ctx.beginPath(); ctx.arc(cx + (s2 ? -9 : 9), TUM_Y, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx = on.getContext("2d"); ctx.setTransform(k, 0, 0, k, 0, 0);
    kutuYolu(false); ctx.lineJoin = "round"; ctx.lineWidth = 9; ctx.strokeStyle = "#3a3152"; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.stroke();
    ctx = c0; katmanHazir = true;
  }
  function ciz(zaman) {
    var dpr = cv.width / (W * olcek);
    if (!katmanHazir || arka.width !== cv.width || arka.height !== cv.height) katmanlar();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    /* sallanma: üç katman birlikte, ekran kartında (çizim maliyeti yok) */
    if (salla > 0) { yigin.style.transform = "translate(" + ((Math.random() - 0.5) * 7 * salla * olcek).toFixed(1) + "px," + ((Math.random() - 0.5) * 7 * salla * olcek).toFixed(1) + "px)"; sallaVar = true; }
    else if (sallaVar) { yigin.style.transform = ""; sallaVar = false; }
    ctx.setTransform(dpr * olcek, 0, 0, dpr * olcek, 0, 0);
    ctx.save();
    /* taşma çizgisi */
    var tehlike = Math.min(1, tasma / 2.1);
    ctx.save(); ctx.setLineDash([8, 9]); ctx.lineWidth = 2;
    ctx.strokeStyle = tehlike > 0 ? "rgba(255," + Math.round(120 - tehlike * 90) + "," + Math.round(140 - tehlike * 100) + "," + (0.35 + 0.5 * Math.abs(Math.sin(zaman / 120))) + ")" : "rgba(255,255,255,.12)";
    ctx.beginPath(); ctx.moveTo(6, CIZGI); ctx.lineTo(W - 6, CIZGI); ctx.stroke(); ctx.restore();
    /* jöleler */
    for (var i = 0; i < jl.length; i++) if (!jl[i].tut) joleCiz(jl[i], zaman);
    /* efektler */
    for (i = 0; i < fx.length; i++) {
      var f = fx[i];
      if (f.ezil) { var ek = f.t / 0.35; ctx.globalAlpha = Math.max(0, (1 - ek) * 0.35 * f.g + 0.05 * (1 - ek)); ctx.strokeStyle = f.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(f.x, f.y - 2, f.r * (0.6 + ek * 0.9), f.r * 0.16 * (1 - ek * 0.5), 0, 0, Math.PI * 2); ctx.stroke(); }
      else if (f.halka) { ctx.globalAlpha = Math.max(0, 1 - f.t / 0.45); ctx.lineWidth = 4 * (1 - f.t / 0.45) + 1; ctx.strokeStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.7 + f.t * 1.6), 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.globalAlpha = Math.max(0, 1 - f.t / 0.7); ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 - f.t * 0.6), 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (i = 0; i < yazi.length; i++) {
      var y = yazi[i]; ctx.globalAlpha = Math.max(0, 1 - y.t / 0.9); ctx.font = "900 " + (y.buyuk ? 30 : 20) + "px Nunito, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(10,6,20,.8)";
      ctx.strokeText(y.s, y.x, y.y - y.t * 46); ctx.fillStyle = y.c; ctx.fillText(y.s, y.x, y.y - y.t * 46);
    }
    ctx.globalAlpha = 1;
    /* ray: bekleyen jöleler, hafif salınım */
    for (i = 0; i < ray.length; i++) {
      var p = ray[i]; if (p.bos) continue; var b = rayBoy(p.v), dal = Math.sin(zaman / 420 + p.faz) * 0.05;
      var pp = p.pat > 0 ? 1 + Math.sin(p.pat * Math.PI) * 0.22 : 1;
      hap(p.x, RAY_Y + Math.sin(zaman / 610 + p.faz) * 1.5, b.w, b.h, renk(p.v), p.v, (1 + dal) * pp, (1 - dal) * pp);
    }
    /* gelen çöp uyarısı */
    for (i = 0; i < copKuyruk.length; i++) {
      var cq = copKuyruk[i], ya2 = Math.max(0, Math.min(1, (1.2 - cq.t) / 0.3)), yan = 0.5 + 0.5 * Math.sin(zaman / 90);
      ctx.globalAlpha = 0.35 + 0.5 * yan; ctx.fillStyle = "#b8b2c8"; ctx.beginPath(); ctx.moveTo(cq.x, CIZGI - 4); ctx.lineTo(cq.x - 9, CIZGI - 18); ctx.lineTo(cq.x + 9, CIZGI - 18); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.6 * ya2; ctx.setLineDash([3, 6]); ctx.strokeStyle = "#b8b2c8"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cq.x, CIZGI); ctx.lineTo(cq.x, H - 8); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
    /* sağ kapı: yeni jöle girerken parlar */
    ctx.fillStyle = "rgba(255,255,255," + (0.25 + kapiParla * 0.75) + ")"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(W - 5, RAY_Y - 20, 4, 40, 2) : ctx.rect(W - 5, RAY_Y - 20, 4, 40); ctx.fill();
    /* tutulan jöle en üstte + parmak izi */
    if (tutulan) {
      /* tutulan jölenin arkasında yumuşak bir hale: sayıyı kapatmaz */
      tutulan.merkez(); var hr = tutulan.R + 10 + Math.sin(zaman / 160) * 2;
      var hg = ctx.createRadialGradient(tutulan.cx, tutulan.cy, tutulan.R * 0.6, tutulan.cx, tutulan.cy, hr + 8);
      hg.addColorStop(0, "rgba(255,255,255,.28)"); hg.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(tutulan.cx, tutulan.cy, hr + 8, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.setLineDash([4, 7]); ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tutulan.cx, tutulan.cy + tutulan.R + 4); ctx.lineTo(tutulan.cx, H - 6); ctx.stroke(); ctx.restore();
      joleCiz(tutulan, zaman);
    }
    ctx.restore();
  }

  /* ---------- döngü ---------- */
  function kare(t) {
    if (!calisiyor) return;
    requestAnimationFrame(kare);
    if (son) akicilikBak(t - son);
    var dt = son ? Math.min(0.05, (t - son) / 1000) : 1 / 60; son = t;
    if (!bitti) {
      birikim += dt; var adet = 0;
      while (birikim >= DT && adet < 5) { adim(); birikim -= DT; adet++; }
      if (adet >= 5) birikim = 0;
      tasmaBak(dt);
      copIlerle(dt);
    }
    if (mod === "duello") dSureBak(); else if (mod === "zaman") zamanBak();
    /* rayda birleştirme: tuttuğun jöleyi raydaki aynı sayının üstüne getirirsen orada birleşirler */
    if (tutulan && !bitti) {
      var T = tutulan; T.merkez();
      for (var ri = 0; ri < ray.length; ri++) {
        var rp = ray[ri]; if (rp.bos) continue; var rb = rayBoy(rp.v);
        if (rp.v === T.v && Math.abs(T.cx - rp.x) < rb.w / 2 + T.r * 0.3 && Math.abs(T.cy - RAY_Y) < rb.h / 2 + T.r * 0.45) {
          jl.splice(jl.indexOf(T), 1); yuvaKapat(T); tutulan = null; isaret = null;
          rp.v *= 2; rp.pat = 1; kazan(rp.v, rp.x, RAY_Y + 34, rayBoy(rp.v).h * 0.8);
          mesaj("Rayda birleşti: " + rp.v + " 🫧");
          break;
        }
      }
    }
    /* ray kayması */
    for (var i = 0; i < ray.length; i++) { var h = raySlot(i); ray[i].x += (h - ray[i].x) * Math.min(1, dt * 7); if (ray[i].pat > 0) ray[i].pat = Math.max(0, ray[i].pat - dt * 3); }
    kapiParla = Math.max(0, kapiParla - dt * 2.2);
    for (i = fx.length - 1; i >= 0; i--) { var f = fx[i]; f.t += dt; if (!f.halka && !f.ezil) { f.vy += 700 * dt; f.x += f.vx * dt; f.y += f.vy * dt; } if (f.t > (f.ezil ? 0.35 : f.halka ? 0.45 : 0.7)) fx.splice(i, 1); }
    for (i = yazi.length - 1; i >= 0; i--) { yazi[i].t += dt; if (yazi[i].t > 0.9) yazi.splice(i, 1); }
    for (i = 0; i < jl.length; i++) if (jl[i].pat > 0) jl[i].pat = Math.max(0, jl[i].pat - dt * 3);
    salla = Math.max(0, salla - dt * 2.5);
    ciz(t);
  }
  /* uyarlanır çözünürlük: telefon zorlanırsa (kareler uzarsa) tuvalin piksel yoğunluğu adım adım düşer, oyun akıcı kalır */
  var cozunurluk = 2, ortKare = 16.7, yavasSure = 0;
  function akicilikBak(dtMs) {
    if (dtMs <= 0 || dtMs > 250) return;
    ortKare = ortKare * 0.94 + dtMs * 0.06;
    yavasSure = ortKare > 21 ? yavasSure + dtMs : 0;
    if (yavasSure > 1500 && cozunurluk > 1.2 && (window.devicePixelRatio || 1) > 1.2) { cozunurluk = Math.max(1.2, Math.min(cozunurluk, window.devicePixelRatio || 1) - 0.3); yavasSure = 0; ortKare = 16.7; boyutla(); }
  }
  function boyutla() {
    var bw = wrap.clientWidth, bh = wrap.clientHeight; if (!bw || !bh) return;
    olcek = Math.min(bw / W, bh / H);
    var dpr = Math.min(window.devicePixelRatio || 1, cozunurluk);
    cv.style.width = Math.round(W * olcek) + "px"; cv.style.height = Math.round(H * olcek) + "px";
    cv.width = Math.round(W * olcek * dpr); cv.height = Math.round(H * olcek * dpr); boya = {}; hapBoya = {}; katmanHazir = false;
  }
  addEventListener("resize", boyutla);
  /* düello düğmesi açılıp kapanınca (ya da başlık değişince) kutunun alanı değişir; kutu yeniden ölçülsün */
  var boyutBek = 0;
  function boyutSonra() { if (boyutBek) return; boyutBek = requestAnimationFrame(function () { boyutBek = 0; var ow = cv.style.width, oh = cv.style.height; boyutla(); if (cv.style.width !== ow || cv.style.height !== oh) katmanHazir = false; }); }
  if (window.ResizeObserver) try { new ResizeObserver(boyutSonra).observe(wrap); } catch (e) {}
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { son = 0; birak(); if (mod === "zaman" && zBitis && !bitti) zKalan = zBitis - Date.now(); }
    else if (mod === "zaman" && zKalan > 0 && !bitti) { zBitis = Date.now() + zKalan; zKalan = 0; }
  });


  /* ---------- Jöle Düellosu (canlı) ----------
     joled/mac = { n, durum: davet|geri|bitti|iptal, davet, a, b, tohum, nabiz (davet eden bekliyor), basla, puan:{uid}, cop:{uid: yolladığı toplam çöp}, son:{uid:{puan,sebep}}, kazanan, bitti }
     İkimiz de jöle sayfasındayken biri çağırır, öbürü katılır; 3-2-1 sonra aynı tohumla aynı jöleler gelir, 2,5 dakika.
     32 ve üstü birleşme (ve 3+ kombo) karşı tarafa gri çöp jöle yollar. Süre bitince puanı yüksek olan kazanır; kutusu dolan erken durur. */
  var DSURE = 150, dDb = null, dRef = null, dSeriRef = null, ben = null, rakip = null, rakipAd = "Rakip", dMac = null, dN = -1, gonderilen = 0, alinan = 0, dYazT = 0, dBitis = 0, dOyunda = false, dBittim = false, dSonN = -1, dRed = -1, dBekleyen = false, dNabizT = 0, dZamanAsimi = 0, dSonRakipPuan = 0, dSonTekrarT = 0, secSure = 150, secCop = true, dAktif = 150, dCopAcik = true, dZorla = 0, dHazir = false, dSeriVeri = null;
  function sureMetin(s) { return s === 150 ? "2,5 dakika" : s % 60 ? String(Math.round(s / 6) / 10).replace(".", ",") + " dakika" : s / 60 + " dakika"; }
  function gelenDavet() { return !!(dMac && dMac.durum === "davet" && dMac.davet !== ben && davetTaze(dMac)); }
  function rngKur(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function tk(o, k, v) { var x = {}; x[k] = v; return x; }
  function zDamga() { return window.firebase && firebase.firestore && firebase.firestore.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : Date.now(); }
  function davetTaze(d) { return d && d.durum === "davet" && d.nabiz && Math.abs(Date.now() - d.nabiz) < 25000; }
  function duelloGorunum() {
    var duel = mod === "duello", zam = mod === "zaman";
    $("jduel").hidden = !(duel || zam); document.querySelector(".jhead").style.display = duel || zam ? "none" : "";
    $("dSureAlt").textContent = zam ? "zamana karşı ⏱" : "düello ⚔️";
    if (zam) { $("dRakipAd").textContent = "En iyi"; $("dRakipPuan").textContent = best; $("dBenPuan").textContent = puan; sureYaz(ZSURE * 1000); }
    boyutSonra();
  }
  function zamanBak() {
    var simdi = Date.now(), dur = !$("modlar").hidden || !$("intro").hidden || !$("dDavet").hidden;
    if (dur && zBitis && !bitti) zBitis += simdi - (zamanBak.t || simdi);   /* mod ekranı ya da yardım açıkken süre durur */
    zamanBak.t = simdi;
    if (bitti) return;
    var kalan = zBitis ? zBitis - Date.now() : ZSURE * 1000; sureYaz(kalan); $("dBenPuan").textContent = puan;
    if (zBitis && kalan <= 0) oyunBitti("sure");
  }
  function overGizle() { ["dDavet", "dBekle", "dSon"].forEach(function (id) { $(id).hidden = true; }); }
  function sureYaz(ms) { var s2 = Math.max(0, Math.ceil(ms / 1000)); $("dSure").textContent = Math.floor(s2 / 60) + ":" + ("0" + s2 % 60).slice(-2); $("dSure").parentNode.classList.toggle("az", s2 <= 15); }
  /* davet et */
  function dDavetEt() {
    if (!dRef || !rakip) { mesaj("Arkadaşın henüz odaya katılmadı."); return; }
    var d = { n: (dMac && dMac.n || 0) + 1, durum: "davet", davet: ben, a: ben, b: rakip, tohum: Math.floor(Math.random() * 2147483646) + 1, nabiz: Date.now(), basla: 0, sure: dZorla || secSure, copAcik: !!secCop, puan: {}, cop: {}, son: {}, kazanan: "", bitti: false, t: zDamga() };
    dBekleyen = true; $("dBekleBaslik").textContent = rakipAd + " bekleniyor…"; $("dBekleMetin").textContent = rakipAd + " Jöle'yi açınca davetini görecek; katılınca 3-2-1 ile birlikte başlarsınız.";
    overGizle(); $("over").hidden = true; $("modlar").hidden = true; $("dBekle").hidden = false;
    dRef.set(d).catch(function () { $("dBekle").hidden = true; dBekleyen = false; mesaj("Davet gönderilemedi, bağlantına bak."); modAc(); });
    clearInterval(dNabizT); dNabizT = setInterval(function () { if (dBekleyen && dMac && dMac.durum === "davet" && dMac.davet === ben) dRef.set({ nabiz: Date.now() }, { merge: true }).catch(function () {}); else clearInterval(dNabizT); }, 6000);
  }
  function dVazgec() { dBekleyen = false; clearInterval(dNabizT); $("dBekle").hidden = true; modAc(); if (dMac && dMac.durum === "davet" && dMac.davet === ben) dRef.set({ durum: "iptal" }, { merge: true }).catch(function () {}); }
  function dKatil() { if (!dMac || !davetTaze(dMac)) { $("dDavet").hidden = true; mesaj("Davetin süresi geçti."); return; } $("dDavet").hidden = true; dRef.set({ durum: "geri", basla: Date.now() }, { merge: true }).catch(function () { mesaj("Katılamadım, bağlantına bak."); }); }
  /* geri sayım ve başlangıç */
  function dBaslat(d) {
    dN = d.n; dBekleyen = false; clearInterval(dNabizT); overGizle(); $("over").hidden = true; $("intro").hidden = true; $("modlar").hidden = true;
    dAktif = d.sure || DSURE; dCopAcik = d.copAcik !== false; secSure = dAktif; secCop = dCopAcik;   /* rövanş aynı ayarlarla */
    mod = "duello"; rast = rngKur(d.tohum); gonderilen = 0; alinan = (d.cop && d.cop[rakip]) || 0; dBittim = false; dOyunda = false; dSonRakipPuan = 0;
    basla(); bitti = true; $("dBenPuan").textContent = 0; $("dRakipPuan").textContent = 0; $("dRakipAd").textContent = rakipAd; sureYaz(dAktif * 1000); $("dGeriAlt").textContent = "aynı jöleler, " + sureMetin(dAktif) + (dCopAcik ? "" : " · çöp yok");
    var g = $("dGeri"), sayi = 3; g.hidden = false; $("dGeriSayi").textContent = sayi; $("dGeriSayi").classList.remove("uzun"); ses.tut();
    var zt = setInterval(function () {
      sayi--; var b = $("dGeriSayi");
      if (sayi > 0) { b.textContent = sayi; b.style.animation = "none"; void b.offsetWidth; b.style.animation = ""; ses.tut(); return; }
      clearInterval(zt); b.textContent = "Başla!"; b.classList.add("uzun"); b.style.animation = "none"; void b.offsetWidth; b.style.animation = ""; ses.birles(64);
      setTimeout(function () { g.hidden = true; }, 600);
      bitti = false; dOyunda = true; dBitis = Date.now() + dAktif * 1000; mesaj("Aynı jöleler ikinize de geliyor; bol şans ⚔️");
    }, 900);
  }
  function dSureBak() {
    if (!dOyunda) return;
    var kalan = dBitis - Date.now(); sureYaz(kalan);
    $("dBenPuan").textContent = puan;
    var simdi = Date.now(); if (simdi - dYazT > 1300) { dYazT = simdi; dYaz(); }
    if (kalan <= 0) dBitir("sure");
  }
  function dYaz() { if (!dRef || dN < 0) return; var o = { puan: tk({}, ben, puan), cop: tk({}, ben, gonderilen) }; o.puan[ben] = puan; o.cop[ben] = gonderilen; dRef.set(o, { merge: true }).catch(function () {}); }
  /* büyük birleşmeler rakibe çöp yollar */
  /* aynı türden yazı üst üste binmesin: eskisini kaldır, yenisini koy */
  function tekYazi(tur, o) { for (var i = yazi.length - 1; i >= 0; i--) if (yazi[i].tur === tur) yazi.splice(i, 1); o.tur = tur; yazi.push(o); }
  function saldiri(v, kmb) {
    if (mod !== "duello" || !dOyunda || !dCopAcik) return;
    var n = v >= 32 ? Math.round(Math.log(v) / Math.LN2) - 4 : 0; if (kmb === 3 || kmb === 6) n++;
    if (!n) return;
    gonderilen += n; dYazT = 0;
    var top = n; yazi.forEach(function (y) { if (y.tur === "cop") top += y.n || 0; });
    tekYazi("cop", { t: 0, x: W / 2, y: 236, s: top + " çöp → " + rakipAd + " 😈", c: "#c9c2dc", buyuk: true, n: top });
  }
  function dBitir(sebep) {
    if (dBittim || mod !== "duello") return;
    dBittim = true; dOyunda = false; bitti = true; birak(); ses.bitti();
    var o = { son: {}, puan: {} }; o.son[ben] = { puan: puan, sebep: sebep }; o.puan[ben] = puan;
    if (dRef) dRef.set(o, { merge: true }).catch(function () {});
    /* yazım kaybolursa diye: sonuç çıkana kadar kendi sonucunu birkaç saniyede bir yeniden yaz */
    var nB = dN, tekrar = 0; clearInterval(dSonTekrarT);
    dSonTekrarT = setInterval(function () {
      if (dSonN === nB || dN !== nB || ++tekrar > 20) { clearInterval(dSonTekrarT); return; }
      if (dRef && (!dMac || dMac.n !== nB || !dMac.son || !dMac.son[ben])) dRef.set(o, { merge: true }).catch(function () {});
    }, 3000);
    $("dSonUst").textContent = sebep === "tasma" ? "kutun doldu 🫧" : "süre bitti ⏱";
    $("dSonBaslik").textContent = rakipAd + " bekleniyor…"; $("dSonBen").textContent = puan; $("dSonO").textContent = (dMac && dMac.puan && dMac.puan[rakip]) || 0; $("dSonOAd").textContent = rakipAd;
    $("dSonMetin").textContent = sebep === "tasma" ? "Senin kutun doldu; " + rakipAd + " süresi bitene kadar oynuyor." : rakipAd + "'nin de oyunu bitince sonuç çıkacak.";
    $("dRovans").hidden = true; $("dTek").hidden = true;
    setTimeout(function () { if (!$("dSon").hidden || dSonN === dN) return; $("dSon").hidden = false; }, 700);
    /* rakip çıkıp gittiyse: sürenin bitiminden 25 sn sonra son bilinen puanıyla bitir */
    clearTimeout(dZamanAsimi);
    dZamanAsimi = setTimeout(function () {
      if (!dMac || dMac.n !== dN || (dMac.son && dMac.son[rakip])) return;
      var o2 = { son: {} }; o2.son[rakip] = { puan: (dMac.puan && dMac.puan[rakip]) || 0, sebep: "ayrildi" }; dRef.set(o2, { merge: true }).catch(function () {});
    }, Math.max(0, dBitis - Date.now()) + 25000);
  }
  function dSonuc(d) {
    if (dSonN === d.n) return; dSonN = d.n; clearTimeout(dZamanAsimi); clearInterval(dSonTekrarT);
    var bp = d.son[ben].puan || 0, op = d.son[rakip].puan || 0, kz = bp > op ? ben : op > bp ? rakip : "";
    $("dSonUst").textContent = "düello bitti ⚔️";
    $("dSonBaslik").textContent = kz === ben ? "Kazandın! 🏆" : kz ? rakipAd + " kazandı" : "Berabere 🤝";
    $("dSonBen").textContent = bp; $("dSonO").textContent = op; $("dSonOAd").textContent = rakipAd;
    $("dSonMetin").textContent = d.son[rakip].sebep === "ayrildi" ? rakipAd + " oyundan çıktı; son puanıyla sayıldı." : d.son[rakip].sebep === "tasma" ? rakipAd + "'nin kutusu doldu." : d.son[ben].sebep === "tasma" ? "Senin kutun dolmuştu." : "";
    $("dRovans").hidden = false; $("dTek").hidden = false; $("dSon").hidden = false;
    if (kz === ben) { ses.birles(512); salla = 0.4; }
    if (!d.bitti) dRef.set({ durum: "bitti", bitti: true, kazanan: kz }, { merge: true }).catch(function () {});
    /* seri: bir kez yazılır (önce yazan kazanır), akışa da bir haber */
    if (dSeriRef) dDb.runTransaction(function (tx) {
      return tx.get(dSeriRef).then(function (sn) {
        var s3 = sn.exists ? sn.data() : { g: {}, b: 0, oyun: 0, son: [] };
        if ((s3.oyun || 0) >= d.n) throw new Error("var");
        var g = {}, k; for (k in (s3.g || {})) g[k] = s3.g[k]; if (kz) g[kz] = (g[kz] || 0) + 1;
        var sl = (s3.son || []).slice(-9); sl.push({ n: d.n, k: kz, s: "" });
        tx.set(dSeriRef, { g: g, b: (s3.b || 0) + (kz ? 0 : 1), oyun: d.n, son: sl, t: zDamga() });
      });
    }).then(function () {
      dDb.collection("akis").add({ uid: kz || ben, o: "joled", k: kz ? "kazandi" : "berabere", v: kz === rakip ? op : bp, t: zDamga() }).catch(function () {});
    }).catch(function () {});
  }
  function dGeldi(d) {
    var once = dMac; dMac = d;
    if (!d || !ben) { duelloBtnCiz(); return; }
    var benim = d.a === ben || d.b === ben;
    if (d.durum === "davet" && d.davet !== ben && davetTaze(d) && dRed !== d.n && !dOyunda && !(mod === "duello" && !dBittim)) { $("dSon").hidden = true; $("dBekle").hidden = true; $("modlar").hidden = true; $("dDavetBaslik").textContent = rakipAd + (dSonN >= 0 ? " rövanş istiyor ⚔️" : " seni düelloya çağırıyor");
      $("dDavetMetin").textContent = "Aynı jölelerle, aynı anda, " + sureMetin(d.sure || DSURE) + ". " + (d.copAcik === false ? "Çöp jöle yok; sadece puan yarışı." : "Büyük birleşmeler karşı tarafa gri çöp jöle yollar."); $("dDavet").hidden = false; }
    else $("dDavet").hidden = true;
    if (d.durum !== "davet" || d.davet !== ben) { if (dBekleyen && d.durum !== "geri") { dBekleyen = false; $("dBekle").hidden = true; } }
    if (d.durum === "geri" && benim && d.n !== dN && Math.abs(Date.now() - (d.basla || 0)) < 15000) { dBaslat(d); }
    if (mod === "duello" && d.n === dN) {
      var oc = (d.cop && d.cop[rakip]) || 0;
      if (oc > alinan && dOyunda) { var n = oc - alinan; alinan = oc; copGelsin(n, "rakip"); mesaj(rakipAd + " sana " + n + " çöp jöle yolladı! 😤"); }
      else if (oc > alinan) alinan = oc;
      var rp = (d.puan && d.puan[rakip]) || 0; $("dRakipPuan").textContent = rp; if (!$("dSon").hidden && !(d.son && d.son[ben] && d.son[rakip])) $("dSonO").textContent = rp;
      if (d.son && d.son[ben] && d.son[rakip]) dSonuc(d);
    }
    duelloBtnCiz();
  }
  function duelloBtnCiz() { $("modBtn").classList.toggle("davet", gelenDavet()); modDuelCiz(); }
  function dTekeDon() { mod = "tek"; rast = Math.random; dN = -1; overGizle(); modAc(); }

  /* ---------- mod ekranı: oyuna girince ilk bu çıkar ---------- */
  function modDuelCiz() {
    var kapali = !ben || !rakip, gelen = gelenDavet();
    $("mDuel").classList.toggle("kapali", kapali); $("mDuel").classList.toggle("davet", gelen);
    $("mDuelAd").textContent = rakip ? rakipAd + " ile düello" : "Düello";
    var g = (dSeriVeri && dSeriVeri.g) || {}, bs = ben && g[ben] || 0, os = rakip && g[rakip] || 0;
    $("mDuelAlt").textContent = gelen ? rakipAd + " seni çağırıyor! Dokun, katıl." : !dHazir ? "Bağlanıyor…" : !ben ? "Düello için bir odaya katıl." : !rakip ? "Arkadaşın henüz odaya katılmadı." : "Canlı, aynı anda, aynı jöleler.";
    $("mbduel").textContent = bs + os ? bs + " – " + os : "";
    if (kapali) $("mDuelAyar").hidden = true;
  }
  function modAc() {
    ["tek", "sakin", "zaman"].forEach(function (m) { var b = bestOku(m); $("mb" + m).textContent = b ? "en iyi " + b : ""; });
    $("mDevam").hidden = !(mod !== "duello" && atis > 0 && !bitti);
    modDuelCiz(); $("over").hidden = true; $("modlar").hidden = false;
  }
  function modSec(m) {
    mod = m; rast = Math.random; dN = -1; best = bestOku(m); bestEl.textContent = best;
    $("modlar").hidden = true; overGizle(); basla();
    mesaj(m === "zaman" ? "İlk atışla 2 dakika başlar ⏱" : m === "sakin" ? "Sakin mod: çöp yok, acele yok 🌙" : "Bir jöleyi tut, kutuya fırlat 👆");
  }
  function cipSec(kutu, al) { kutu.onclick = function (e) { var t = e.target; while (t && t !== kutu && t.tagName !== "BUTTON") t = t.parentNode; if (!t || t === kutu) return; [].forEach.call(kutu.children, function (c) { c.classList.toggle("on", c === t); }); al(t); }; }
  cipSec($("mSure"), function (t) { secSure = +t.getAttribute("data-s"); });
  cipSec($("mCop"), function (t) { secCop = t.getAttribute("data-c") === "1"; });
  [].forEach.call(document.querySelectorAll(".jmod[data-m]"), function (b) { b.onclick = function () { sesHazir(); modSec(b.getAttribute("data-m")); }; });
  $("mDuelBas").onclick = function () {
    sesHazir(); if ($("mDuel").classList.contains("kapali")) return;
    if (gelenDavet()) { $("modlar").hidden = true; dKatil(); return; }
    $("mDuelAyar").hidden = !$("mDuelAyar").hidden;
  };
  $("mDavet").onclick = function () { sesHazir(); if (gelenDavet()) { $("modlar").hidden = true; dKatil(); return; } dDavetEt(); };
  $("mDevam").onclick = function () { $("modlar").hidden = true; };
  $("modBtn").onclick = function () { sesHazir(); modAc(); };
  $("overMod").onclick = function () { modAc(); };
  $("dKatil").onclick = function () { sesHazir(); dKatil(); };
  $("dReddet").onclick = function () { dRed = dMac ? dMac.n : -1; $("dDavet").hidden = true; if (mod === "duello" || atis === 0 || bitti) { if (mod === "duello") mod = "tek"; modAc(); } };
  $("dVazgec").onclick = dVazgec;
  $("dRovans").onclick = function () { sesHazir(); if (dMac && dMac.durum === "davet" && dMac.davet !== ben && davetTaze(dMac)) { $("dSon").hidden = true; dKatil(); return; } dDavetEt(); };
  $("dTek").onclick = function () { dTekeDon(); };
  /* rakip: odanın öbür koltuğu (a ↔ b); öbür koltuk boşsa düello kapalı */
  function rakipBak() {
    if (!ben) return; var o = Hesap.oda && Hesap.oda();
    rakip = o && o.dolu ? (ben === "a" ? "b" : "a") : null;
    rakipAd = Hesap.gorunenAd(ben === "a" ? "b" : "a") || "Arkadaşın"; dHazir = true; duelloBtnCiz();
  }
  if (window.Hesap) Hesap.izle(function (k) {
    if (!k) { dHazir = true; modDuelCiz(); return; }
    if (!k.kesin || ben) return; ben = k.uid;
    if (Hesap.odaIzle) Hesap.odaIzle(rakipBak);
    Hesap.db().then(function (db) {
      dDb = db; dRef = db.collection("joled").doc("mac"); dSeriRef = db.collection("joled").doc("seri");
      rakipBak();
      dSeriRef.onSnapshot(function (sn) { dSeriVeri = sn.exists ? sn.data() : null; modDuelCiz(); }, function () {});
      dRef.onSnapshot(function (sn) { dGeldi(sn.exists ? sn.data() : null); }, function () {});
      setInterval(duelloBtnCiz, 5000);
    }).catch(function () {});
  });

  /* ---------- arayüz ---------- */
  function mesaj(t) { msgEl.textContent = t; clearTimeout(mesaj.z); if (t) mesaj.z = setTimeout(function () { msgEl.textContent = ""; }, 2600); }
  function buyukCiz() { var v = enBuyuk || 0; buyukEl.textContent = v || "–"; buyukEl.style.background = v ? renk(v) : ""; buyukEl.parentNode.classList.toggle("var", !!v); }
  function basla() {
    jl = []; ray = []; fx = []; yazi = []; copKuyruk = []; tutulan = null; isaret = null; puan = 0; tasma = 0; birlesme = 0; atis = 0; kombo = 0; bitti = false; best0 = best; rekorDendi = false; zBitis = 0; zKalan = 0;
    puanEl.textContent = 0; $("over").hidden = true; rayDoldur(true); duelloGorunum(); mesaj("Bir jöleyi tut, kutuya fırlat 👆");
  }
  function oyunBitti(sebep) {
    if (mod === "duello") { dBitir("tasma"); return; }
    $("overUst").textContent = sebep === "sure" ? "süre bitti ⏱" : "kutu doldu 🫧";
    if (bitti) return; bitti = true; birak(); ses.bitti();
    var rek = puan > best0 && best0 > 0;
    $("overPuan").textContent = puan;
    var enIyiJ = 0; jl.forEach(function (j) { if (j.v > enIyiJ) enIyiJ = j.v; });
    $("overText").textContent = rek ? "Yeni rekor! 🏆" : enIyiJ >= 1024 ? "Kutuda " + enIyiJ + " vardı, efsane 🌟" : enIyiJ >= 256 ? "Kutuda " + enIyiJ + " vardı, fena değil 😌" : (sebep === "sure" ? "Süre doldu, bir daha?" : "Kutu doldu, bir daha?");
    $("overBest").textContent = (MODAD[mod] || "") + " · en iyi " + best + " · " + birlesme + " birleşme";
    setTimeout(function () { $("over").hidden = false; }, 650);
    if (window.Hesap && Hesap.planla) try { Hesap.planla(); } catch (e) {}
  }
  $("tekrar").onclick = function () { sesHazir(); basla(); };
  $("sesBtn").onclick = function () { sesAcik = !sesAcik; try { localStorage.setItem("jl_ses", sesAcik ? "1" : "0"); } catch (e) {} this.textContent = sesAcik ? "🔊" : "🔈"; sesHazir(); };
  $("sesBtn").textContent = sesAcik ? "🔊" : "🔈";
  $("yardimBtn").onclick = function () { $("intro").hidden = false; };
  $("introGo").onclick = function () { sesHazir(); $("intro").hidden = true; try { localStorage.setItem("jl_intro", "1"); } catch (e) {} if (mod !== "duello" && atis === 0 && $("dDavet").hidden && $("dBekle").hidden) modAc(); };
  var introVar = false; try { if (localStorage.getItem("jl_intro") !== "1") { $("intro").hidden = false; introVar = true; } } catch (e) {}
  buyukCiz(); boyutla(); basla();
  if (!introVar) modAc();
  calisiyor = true; requestAnimationFrame(kare);
  setTimeout(boyutla, 60);

  /* test kancaları */
  if (location.hash === "#test") window.__jl = {
    ekle: function (v, x, y, vx, vy) { var j = new Jole(v, x, y, 1); if (vx || vy) j.p.forEach(function (q) { q.px = q.x - (vx || 0) * DT; q.py = q.y - (vy || 0) * DT; }); jl.push(j); return j; },
    durum: function () { return { n: jl.length, puan: puan, bitti: bitti, tasma: tasma, ray: ray.map(function (r) { return r.bos ? 0 : r.v; }), jole: jl.map(function (j) { j.merkez(); return { v: j.v, x: Math.round(j.cx), y: Math.round(j.cy), r: Math.round(j.r) }; }) }; },
    olcek: function () { return olcek; }, coz: function () { return cozunurluk; },
    oranlar: function () { return jl.map(function (j) { var a = 1e9, b = -1e9, c = 1e9, d = -1e9; j.p.forEach(function (q) { a = Math.min(a, q.x); b = Math.max(b, q.x); c = Math.min(c, q.y); d = Math.max(d, q.y); }); return j.v + ":" + ((b - a) / (d - c)).toFixed(2); }); },
    cop: function (n) { copGelsin(n || 1); }, dSure: function (sn) { dZorla = sn; }, ayar: function (c, b, t) { if (c) CEKIRDEK = c; if (b) BASINC = b; if (t) TEKRAR = t; }, sikisma: function () {
      var oran = [], ust = 1e9, kap = 0, cift = 0, x, y, i, k;
      jl.forEach(function (A) { var al = 0, P = A.p; for (var i2 = 0; i2 < A.n; i2++) { var q = P[i2], w = P[(i2 + 1) % A.n]; al += q.x * w.y - w.x * q.y; if (q.y < ust) ust = q.y; } oran.push(+(al * 0.5 / (Math.PI * A.r * A.r * A.olcek * A.olcek * A.buyu * A.buyu)).toFixed(2)); });
      for (y = 0; y < H; y += 4) for (x = 0; x < W; x += 4) { k = 0; for (i = 0; i < jl.length; i++) if (jl[i].icinde(x, y)) k++; if (k) kap++; if (k > 1) cift++; }
      var ort = oran.reduce(function (a2, b2) { return a2 + b2; }, 0) / (oran.length || 1);
      return { n: jl.length, ort: +ort.toFixed(2), enAz: Math.min.apply(null, oran), ortusme: kap ? +(cift / kap).toFixed(3) : 0, ust: Math.round(ust), tasma: +tasma.toFixed(2), bitti: bitti };
    }, mod: function () { return mod; }, zaman: function (ms) { zBitis = Date.now() + ms; }, dDurum: function () { return { mod: mod, dN: dN, oyunda: dOyunda, bittim: dBittim, gonderilen: gonderilen, alinan: alinan, mac: dMac, rakip: rakip, kuyruk: copKuyruk.length }; }, cop0: function (x, y) { jl.push(new Jole(0, x, y, 1)); },
    rayKur: function (L) { ray = L.map(function (v, i) { return { v: v, x: raySlot(i), gir: 1, faz: i, id: ++sira }; }); }, tutulanY: function () { if (!tutulan) return null; tutulan.merkez(); return Math.round(tutulan.cy); }, bitir: oyunBitti, basla: basla,
    olc: function () { var t0 = performance.now(), i; for (i = 0; i < 60; i++) adim(); var t1 = performance.now(); for (i = 0; i < 20; i++) ciz(performance.now()); var t2 = performance.now(); return { adim: (t1 - t0) / 60, ciz: (t2 - t1) / 20 }; }
  };
})();
