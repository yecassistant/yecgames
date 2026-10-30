/* Tepe Savaşı – iki kişilik, sıra tabanlı topçu savaşı (Worms tarzı). Ortak altyapı: duello.js (tepe/mac, tepe/seri).
   Dünya: 2400×1100 px, yıkılabilir arazi (bit maskesi + boyanmış tuval), su seviyesi altı ölüm.
   mac = { n, v, a, b, baslayan, seed, harita: "dag"|"ada"|"kanyon", adet: 3|4, tur, sira, ruzgar (-1..1),
           kurt: {uid: [{x, y, hp}]}, kraterler: [x, y, r, …] (düz dizi), cephane: {uid: {silah: adet}}, siradaki: {uid: i},
           son: { n, u, i, yol: [x, y, …], atis: {w, a, p, f, tx, ty}, ruzgar, once: {kurt, kc} } | null, bitti, sonuc, kazanan, t }
   Akış: sırası gelen kendi tarafında yürür, nişan alır, ateşler; fizik yerelde çözülür, sonuç (konumlar, canlar, kraterler) yazılır.
   Öbürü girince "son" kaydından atışı baştan oynatır (aynı tohumlu rastgelelik), bitince yazılan sonuca oturur. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function ses(n, o) { if (window.TpSes) window.TpSes.play(n, o); }
  /* ---------- sabitler ---------- */
  var W = 2400, H = 1100, SU = H - 70, R = 9, G = 430, RUZGAR_IVME = 150;
  /* takım adları: ilk solucan oyuncunun takma adı, kalanı tatlı/tuzlu takım */
  var ADLAR = { a: ["A", "Muffin", "Sufle", "Kurabiye"], b: ["B", "Tost", "Simit", "Poğaça"] };
  var RENK = { a: { ana: "#ff7aa8", koyu: "#c9457a", acik: "#ffd1e1", yazi: "#ff9fc0" }, b: { ana: "#6f8cff", koyu: "#3b55c9", acik: "#d4ddff", yazi: "#a9b9ff" } };
  var SILAH = {
    bazuka: { ad: "Bazuka", ik: "🚀", tip: "mermi", hiz: 1050, ruzgar: true, carp: true, patla: [42, 48] },
    bomba: { ad: "El bombası", ik: "💣", tip: "mermi", hiz: 820, sek: true, fitil: true, patla: [42, 48] },
    misket: { ad: "Misket bombası", ik: "🎆", tip: "mermi", hiz: 820, sek: true, fitil: true, ruzgar: true, patla: [26, 24], parca: { n: 5, hiz: 280, patla: [24, 22] } },
    dinamit: { ad: "Dinamit", ik: "🧨", tip: "mermi", hiz: 620, sek: true, fitil: true, agir: true, patla: [78, 75] },
    pompali: { ad: "Pompalı", ik: "🔫", tip: "isin", patla: [15, 24] },
    sopa: { ad: "Beyzbol sopası", ik: "🏏", tip: "sopa" },
    yumruk: { ad: "Ejder yumruğu", ik: "🥊", tip: "sopa", yumruk: true },
    mayin: { ad: "Mayın", ik: "🔴", tip: "mermi", hiz: 560, sek: true, mayin: true, agir: true, patla: [40, 45] },
    koyun: { ad: "Koyun", ik: "🐑", tip: "mermi", hiz: 300, sek: true, koyun: true, sure: 5, patla: [56, 62] },
    muz: { ad: "Muz bombası", ik: "🍌", tip: "mermi", hiz: 780, sek: true, fitil: true, patla: [44, 50], parca: { n: 5, hiz: 340, patla: [42, 40] } },
    karpuz: { ad: "Karpuz bombası", ik: "🍉", tip: "mermi", hiz: 760, sek: true, fitil: true, patla: [50, 55], parca: { n: 6, hiz: 360, patla: [46, 46] } },
    molotof: { ad: "Ateş topu", ik: "🔥", tip: "mermi", hiz: 900, carp: true, ruzgar: true, alev: true, patla: [20, 12] },
    lazer: { ad: "Lazer", ik: "⚡", tip: "isin", lazer: true },
    gudumlu: { ad: "Güdümlü füze", ik: "🎯", tip: "hedef", patla: [44, 50] },
    hava: { ad: "Hava saldırısı", ik: "✈️", tip: "hedef", patla: [32, 30] },
    deprem: { ad: "Deprem", ik: "🌋", tip: "aninda" },
    kazma: { ad: "Kazma", ik: "⛏️", tip: "isin", kazma: true },
    isinla: { ad: "Işınlanma", ik: "✨", tip: "hedef" }
  };
  var SILAH_SIRA = ["bazuka", "bomba", "misket", "dinamit", "pompali", "sopa", "yumruk", "mayin", "koyun", "muz", "karpuz", "molotof", "lazer", "gudumlu", "hava", "deprem", "kazma", "isinla"];
  /* sınırlı silahlar: başlangıç adedi (0 = yalnız gökten düşen sandıktan çıkar) */
  var CEPHANE0 = { misket: 3, dinamit: 2, muz: 1, hava: 1, isinla: 2, mayin: 2, koyun: 1, yumruk: 2, lazer: 1, kazma: 3, karpuz: 0, molotof: 0, gudumlu: 0, deprem: 0 };
  var SANDIK_SILAH = ["dinamit", "dinamit", "muz", "karpuz", "karpuz", "molotof", "molotof", "gudumlu", "gudumlu", "deprem", "koyun", "koyun", "mayin", "lazer", "hava", "misket", "isinla"];
  function sinirli(w) { return Object.prototype.hasOwnProperty.call(CEPHANE0, w); }
  var seciliAdet = 4, seciliHarita = "dag";
  try { seciliAdet = localStorage.getItem("tp_adet") === "3" ? 3 : 4; seciliHarita = localStorage.getItem("tp_harita") || "dag"; } catch (e) {}
  if (["dag", "ada", "kanyon"].indexOf(seciliHarita) < 0) seciliHarita = "dag";
  var HARITA_AD = { dag: "Dağ", ada: "Adalar", kanyon: "Kanyon" };

  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(x, y) { var h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function sm(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  /* ---------- arazi ---------- */
  function yuzey(seed, tip) {
    var r = rng(seed * 7 + 11), s = new Float32Array(W);
    function gur(n) { var p = []; for (var i = 0; i <= n + 1; i++) p.push(r()); return function (x) { var t = x / W * n, i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return p[i] * (1 - u) + p[i + 1] * u; }; }
    var a = gur(5), b = gur(13), c = gur(41), d = gur(3);
    var adalar = [0.17 + r() * 0.06, 0.5 + (r() - 0.5) * 0.06, 0.83 - r() * 0.06];
    for (var x = 0; x < W; x++) {
      var u = x / W, h;
      if (tip === "ada") {
        var e = 0; adalar.forEach(function (m, k) { e = Math.max(e, Math.exp(-Math.pow((u - m) / (k === 1 ? 0.1 : 0.085), 2))); });
        h = (e > 0.1 ? 1 : e * 10) * (0.22 + e * 0.32 + 0.12 * a(x) + 0.07 * b(x) + 0.02 * c(x)) ;
      } else if (tip === "kanyon") {
        h = 0.58 + 0.1 * a(x) + 0.06 * b(x) + 0.02 * c(x) - 0.42 * Math.exp(-Math.pow((u - 0.5) / 0.11, 2)) + 0.05 * Math.exp(-Math.pow((u - 0.5) / 0.03, 2));
      } else {
        h = 0.22 + 0.32 * a(x) + 0.12 * b(x) + 0.025 * c(x) + 0.26 * Math.exp(-Math.pow((u - 0.35 - d(0) * 0.3) / 0.13, 2));
      }
      h *= sm(0, 150, x) * sm(0, 150, W - x);
      s[x] = H - h * H * 0.86;
    }
    return s;
  }
  function magaralar(seed, tip, s) {
    var r = rng(seed * 13 + 5), L = [], n = tip === "ada" ? 2 : 5;
    for (var k = 0; k < n * 6 && L.length < n; k++) {
      var cx = 150 + r() * (W - 300), ust = s[Math.round(cx)], cy = ust + 80 + r() * 160, rx = 45 + r() * 70, ry = 22 + r() * 22;
      if (cy + ry > SU - 25 || cy - ry < ust + 40) continue;
      L.push([cx, cy, rx, ry, (r() - 0.5) * 0.6]);
    }
    return L;
  }
  var mask = new Uint8Array(W * H), tcv = document.createElement("canvas"), tctx, bcv = document.createElement("canvas"), bctx;
  tcv.width = W; tcv.height = H; tctx = tcv.getContext("2d"); bcv.width = W; bcv.height = H; bctx = bcv.getContext("2d");   /* bcv: oyukların arkasında görünen koyu toprak */
  var harita = { seed: 0, tip: "", kc: 0, yuz: null };
  function solid(x, y) { x = x | 0; y = y | 0; if (x < 0 || x >= W || y < 0) return false; if (y >= H) return true; return mask[y * W + x] === 1; }
  function araziKur(seed, tip, kraterler) {
    var s = yuzey(seed, tip), img = tctx.createImageData(W, H), p = img.data, i, x, y;
    mask.fill(0);
    var tema = tip === "kanyon" ? [[181, 101, 58], [140, 72, 42], [120, 60, 36]] : tip === "ada" ? [[201, 162, 107], [150, 105, 62], [110, 76, 45]] : [[141, 95, 53], [112, 74, 42], [88, 58, 34]];
    for (x = 0; x < W; x++) {
      var y0 = Math.max(0, Math.ceil(s[x]));
      for (y = y0; y < H; y++) {
        i = y * W + x; mask[i] = 1;
        var d = y - s[x], n = hash(x, y), k = i * 4, rr, gg, bb;
        if (d < 2.5) { rr = 150; gg = 214; bb = 96; }
        else if (d < 8) { rr = 98 + n * 20; gg = 168 + n * 24; bb = 66; }
        else if (d < 13) { var t = (d - 8) / 5; rr = 98 * (1 - t) + tema[0][0] * t; gg = 168 * (1 - t) + tema[0][1] * t; bb = 66 * (1 - t) + tema[0][2] * t; }
        else {
          var dd = Math.min(1, (d - 13) / 260), c0 = tema[0], c1 = dd < 0.5 ? tema[1] : tema[2], tt = dd < 0.5 ? dd * 2 : (dd - 0.5) * 2;
          if (dd >= 0.5) c0 = tema[1];
          rr = c0[0] * (1 - tt) + c1[0] * tt; gg = c0[1] * (1 - tt) + c1[1] * tt; bb = c0[2] * (1 - tt) + c1[2] * tt;
          if (tip === "kanyon") { var band = Math.sin(y * 0.09 + Math.sin(x * 0.004) * 3) * 10; rr += band; gg += band * 0.6; bb += band * 0.4; }
          var sp = (n - 0.5) * 22; rr += sp; gg += sp; bb += sp;
          if (n > 0.996) { rr *= 0.6; gg *= 0.6; bb *= 0.62; }
        }
        p[k] = rr; p[k + 1] = gg; p[k + 2] = bb; p[k + 3] = 255;
      }
    }
    /* taşlar */
    var r = rng(seed * 3 + 1);
    tctx.putImageData(img, 0, 0);
    bctx.clearRect(0, 0, W, H); bctx.drawImage(tcv, 0, 0); bctx.globalCompositeOperation = "destination-out"; bctx.fillStyle = "#000"; bctx.beginPath(); bctx.moveTo(0, 0); for (x = 0; x < W; x += 8) bctx.lineTo(x, s[x] + 28); bctx.lineTo(W, s[W - 1] + 28); bctx.lineTo(W, 0); bctx.closePath(); bctx.fill(); bctx.globalCompositeOperation = "source-atop"; bctx.fillStyle = "rgba(25,14,8,.68)"; bctx.fillRect(0, 0, W, H); bctx.globalCompositeOperation = "source-over";
    for (var t = 0; t < 70; t++) { var sx = r() * W, sy = s[Math.round(sx) | 0] + 30 + r() * 300; if (sy > H) continue; tctx.globalCompositeOperation = "source-atop"; tctx.fillStyle = "rgba(60,45,35," + (0.25 + r() * 0.2) + ")"; tctx.beginPath(); tctx.ellipse(sx, sy, 6 + r() * 12, 4 + r() * 8, r() * 3, 0, 7); tctx.fill(); tctx.fillStyle = "rgba(255,255,255,.08)"; tctx.beginPath(); tctx.ellipse(sx - 2, sy - 2, 3 + r() * 5, 2 + r() * 3, 0, 0, 7); tctx.fill(); }
    tctx.globalCompositeOperation = "source-over";
    /* çim tutamları */
    for (x = 4; x < W; x += 3) { if (s[x] > SU - 6) continue; var hh = 3 + hash(x, 7) * 6; tctx.strokeStyle = hash(x, 9) > 0.5 ? "#7cc84f" : "#5fae3d"; tctx.lineWidth = 1.4; tctx.beginPath(); tctx.moveTo(x, s[x] + 1); tctx.lineTo(x + (hash(x, 3) - 0.5) * 4, s[x] - hh); tctx.stroke(); }
    harita.seed = seed; harita.tip = tip; harita.yuz = s; harita.kc = 0;
    magaralar(seed, tip, s).forEach(function (m) { oyuk(m[0], m[1], m[2], m[3], m[4]); });
    (kraterler || []).forEach(function (v, j) { if (j % 3 === 0) krater(kraterler[j], kraterler[j + 1], kraterler[j + 2], true); });
    harita.kc = (kraterler || []).length / 3;
  }
  function oyuk(cx, cy, rx, ry, rot) {
    var c = Math.cos(rot), sn = Math.sin(rot), m = Math.max(rx, ry) + 2;
    for (var y = Math.max(0, Math.floor(cy - m)); y < Math.min(H, cy + m); y++) for (var x = Math.max(0, Math.floor(cx - m)); x < Math.min(W, cx + m); x++) {
      var dx = x - cx, dy = y - cy, u = (dx * c + dy * sn) / rx, v = (-dx * sn + dy * c) / ry; if (u * u + v * v <= 1) mask[y * W + x] = 0;
    }
    tctx.save(); tctx.translate(cx, cy); tctx.rotate(rot);
    tctx.globalCompositeOperation = "destination-out"; tctx.fillStyle = "#000"; tctx.beginPath(); tctx.ellipse(0, 0, rx, ry, 0, 0, 7); tctx.fill();
    tctx.globalCompositeOperation = "source-atop"; tctx.strokeStyle = "rgba(40,24,14,.55)"; tctx.lineWidth = 7; tctx.beginPath(); tctx.ellipse(0, 0, rx + 1, ry + 1, 0, 0, 7); tctx.stroke();
    tctx.restore(); tctx.globalCompositeOperation = "source-over";
  }
  function krater(x, y, r, sessiz) {
    var r2 = r * r;
    for (var yy = Math.max(0, Math.floor(y - r)); yy <= Math.min(H - 1, y + r); yy++) for (var xx = Math.max(0, Math.floor(x - r)); xx <= Math.min(W - 1, x + r); xx++) { var dx = xx - x, dy = yy - y; if (dx * dx + dy * dy <= r2) mask[yy * W + xx] = 0; }
    tctx.globalCompositeOperation = "destination-out"; tctx.fillStyle = "#000"; tctx.beginPath(); tctx.arc(x, y, r, 0, 7); tctx.fill();
    tctx.globalCompositeOperation = "source-atop"; tctx.strokeStyle = "rgba(38,22,12,.75)"; tctx.lineWidth = 6; tctx.beginPath(); tctx.arc(x, y, r + 2, 0, 7); tctx.stroke();
    tctx.strokeStyle = "rgba(20,10,5,.35)"; tctx.lineWidth = 3; tctx.beginPath(); tctx.arc(x, y, r + 6, 0, 7); tctx.stroke();
    tctx.globalCompositeOperation = "source-over";
  }
  function carpisir(x, y, r) {
    if (solid(x, y)) return true;
    for (var k = 0; k < 12; k++) { var a = k * Math.PI / 6; if (solid(x + Math.cos(a) * r, y + Math.sin(a) * r)) return true; }
    return solid(x + r * 0.5, y + r * 0.5) || solid(x - r * 0.5, y + r * 0.5);
  }
  function normal(x, y, rad) {
    var sx = 0, sy = 0;
    for (var dy = -rad; dy <= rad; dy += 2) for (var dx = -rad; dx <= rad; dx += 2) if (dx * dx + dy * dy <= rad * rad && solid(x + dx, y + dy)) { sx += dx; sy += dy; }
    var L = Math.hypot(sx, sy); return L < 1e-6 ? { x: 0, y: -1 } : { x: -sx / L, y: -sy / L };
  }

  /* ---------- oyun durumu ---------- */
  var D = null, G_ = null, ME = null, OTHER = null;
  var S = { kurt: {}, takim: [], mermi: [], parca: [], yazi: [], izler: [], mezar: [], ruzgar: 0, kraterler: [], cephane: {}, nesne: [], alev: [] };
  var mod = "yok";                        /* yok | bekle | hareket | atis | tekrar | bitti */
  var aktif = null, enerji = 100, silah = "bazuka", fitil = 3, nisan = { a: -0.6, p: 0.6, var: false }, hedef = null, yol = [], yolT = 0, cozT = 0, atisT = 0;
  var bekleyen = null, simRng = Math.random, gorulen = {}, sonYazilan = -1, tekrarIs = null, ilkKurulum = true, turDegisim = 0;
  var kamera = { x: W / 2, y: H / 2, z: 0.5, hx: W / 2, hy: H / 2, hz: 0.5, serbest: 0, salla: 0 };

  function takimAd(uid) { var k = (D && D.kul[uid]) || uid, L = (ADLAR[k] || ADLAR.a).slice(); var ad = D && D.adlar && D.adlar[uid]; if (ad) L[0] = ad; return L; }
  function takimRenk(uid) { var k = (D && D.kul[uid]) || uid; return RENK[k] || RENK.b; }
  function durumYukle(d, kurtKaynak, nesneKaynak) {
    S.kurt = {}; S.takim = [d.a, d.b];
    [d.a, d.b].forEach(function (u) {
      var adlar = takimAd(u);
      S.kurt[u] = ((kurtKaynak || d.kurt)[u] || []).map(function (k, i) { return { x: k.x, y: k.y, hp: k.hp, ad: adlar[i] || "?", u: u, i: i, vx: 0, vy: 0, hava: false, olu: k.hp <= 0, bogul: false, yon: k.yon || (k.x < W / 2 ? 1 : -1), hasar: 0, dus: 0, gor: k.hp, bob: Math.random() * 6 }; });
    });
    S.cephane = JSON.parse(JSON.stringify(d.cephane || {}));
    S.ruzgar = d.ruzgar || 0;
    S.nesne = nesneYukle(nesneKaynak || d.nesne); S.alev = [];
  }
  /* gökten düşen sandıklar ve haritada bekleyen mayınlar: dokümanda "nesne" dizisi */
  function nesneYukle(L) { return (L || []).map(function (o) { return { t: o.t, s: o.s || "", w: o.w || "", n: o.n || 0, x: o.x, y: o.y, vy: 0, yer: false, kur: 0, tetik: -1, id: o.id || 0 }; }); }
  function nesneAnlik() { return S.nesne.filter(function (o) { return !o.sil; }).map(function (o) { var r = { t: o.t, x: Math.round(o.x), y: Math.round(o.y), id: o.id || 0 }; if (o.t === "sandik") { r.s = o.s; if (o.s === "silah") { r.w = o.w; r.n = o.n; } } return r; }); }
  function kalanU(u, w) { if (!sinirli(w)) return Infinity; var c = S.cephane[u] || {}; return c[w] === undefined ? CEPHANE0[w] : c[w]; }
  function tumKurt() { var L = []; S.takim.forEach(function (u) { (S.kurt[u] || []).forEach(function (k) { L.push(k); }); }); return L; }
  function canli(u) { return (S.kurt[u] || []).filter(function (k) { return !k.olu; }); }

  /* ---------- fizik ---------- */
  function yereOtur(k) { var n = 0; while (carpisir(k.x, k.y, R) && n < 14) { k.y -= 1; n++; } n = 0; while (!carpisir(k.x, k.y + 1, R) && n < 3) { k.y += 1; n++; } }
  function kurtAdim(k, dt) {
    if (k.olu) return;
    if (k.y - R > SU) { bogul(k); return; }
    if (!k.hava) { if (!carpisir(k.x, k.y + 2, R)) { k.hava = true; k.vx = 0; k.vy = 0; } else return; }
    k.vy += G * dt;
    var sp = Math.hypot(k.vx, k.vy), n = Math.max(1, Math.ceil(sp * dt / 1.5));
    for (var s = 0; s < n; s++) {
      var nx = k.x + k.vx * dt / n, ny = k.y + k.vy * dt / n;
      if (nx < -60 || nx > W + 60) { k.x = nx; k.y = ny; continue; }
      if (carpisir(nx, ny, R)) {
        var no = normal(nx, ny, R + 3), vn = k.vx * no.x + k.vy * no.y;
        if (vn < 0) {
          if (no.y < -0.45 && -vn > 360) { var dh = Math.min(40, Math.round((-vn - 360) / 9)); if (dh > 0) hasarVer(k, dh); }
          var e = 0.32, tx = k.vx - vn * no.x, ty = k.vy - vn * no.y;
          k.vx = tx * 0.72 - e * vn * no.x; k.vy = ty * 0.72 - e * vn * no.y;
        }
        var g = 0; while (carpisir(k.x, k.y, R) && g < 10) { k.x += no.x; k.y += no.y; g++; }
        if (Math.hypot(k.vx, k.vy) < 55 && no.y < -0.5) { k.hava = false; k.vx = 0; k.vy = 0; yereOtur(k); }
        break;
      }
      k.x = nx; k.y = ny;
    }
  }
  function bogul(k) { if (k.olu) return; k.olu = true; k.bogul = true; var once = k.hp; k.hp = 0; k.hasar += once; yaziEkle(k.x, SU - 20, "boğuldu", "#bfe6ff"); suSicrat(k.x); ses("su"); }
  function hasarVer(k, h) { if (k.olu || h <= 0) return; h = Math.min(h, k.hp); k.hp -= h; k.hasar += h; yaziEkle(k.x, k.y - 26, "-" + h, takimRenk(k.u).yazi); if (Math.random() < 0.7) ses("ah"); }
  function patla(x, y, r, h, guc, sahip) {
    x = Math.round(x); y = Math.round(y); r = Math.round(r);
    krater(x, y, r); S.kraterler.push(x, y, r);
    tumKurt().forEach(function (k) {
      if (k.olu) return; var dx = k.x - x, dy = k.y - y, d = Math.hypot(dx, dy), RR = r + 16;
      if (d >= RR) return; var f = 1 - d / RR;
      if (h) hasarVer(k, Math.max(1, Math.round(h * (0.3 + 0.7 * f))));
      var ux = d < 1 ? 0 : dx / d, uy = d < 1 ? -1 : dy / d; uy -= 0.7; var L = Math.hypot(ux, uy); ux /= L; uy /= L;
      var v = (guc || 1) * (220 + 380 * f) * Math.min(1.4, r / 40);
      k.vx += ux * v; k.vy += uy * v; k.hava = true;
    });
    S.mermi.forEach(function (m) { if (!m.sek) return; var dx = m.x - x, dy = m.y - y, d = Math.hypot(dx, dy); if (d < r + 20 && d > 1) { m.vx += dx / d * 250; m.vy += dy / d * 250 - 120; m.dur = false; m.yerde = false; } });
    S.nesne.forEach(function (o) {
      if (o.sil) return; var d = Math.hypot(o.x - x, o.y - y); if (d > r + 12) return;
      if (o.t === "mayin") { if (o.tetik < 0) o.tetik = 0.25; }
      else { o.sil = true; isikSac(o.x, o.y); yaziEkle(o.x, o.y - 18, "sandık patladı", "#ffe9a8"); }
    });
    patlamaEfekt(x, y, r);
    kamera.salla = Math.min(18, kamera.salla + r * 0.28);
    ses("patla", { g: r / 45 });
  }
  function mermiAdim(m, dt) {
    m.yas += dt;
    if (m.fitil !== null && m.fitil !== undefined) { m.fitil -= dt; if (m.fitil <= 0) { mermiPatla(m); return; } }
    if (m.dur) { if (!solid(m.x, m.y + 4)) m.dur = false; else if (m.mayin) { mayinKur(m); return; } else return; }
    if (m.koyun) {                                                        /* koyun: yerdeyken yürür, önü kapanınca zıplar */
      if (m.yerde) { if (!solid(m.x, m.y + 5)) m.yerde = false; else { m.vx = m.yon * 95; if (solid(m.x + m.yon * 8, m.y - 3)) { m.vy = -250; m.yerde = false; ses("zipla"); } else m.vy = 0; } }
      if (m.x < 15 || m.x > W - 15) m.yon = -m.yon;
    }
    if (m.gud && m.yas > 0.35) {                                          /* güdümlü füze: hedefe döner, hızlanır */
      var ist = Math.atan2(m.gud.ty - m.y, m.gud.tx - m.x), su = Math.atan2(m.vy, m.vx), fark = Math.atan2(Math.sin(ist - su), Math.cos(ist - su)), don = Math.max(-5 * dt, Math.min(5 * dt, fark)), hz = Math.min(720, Math.hypot(m.vx, m.vy) + 500 * dt);
      m.vx = Math.cos(su + don) * hz; m.vy = Math.sin(su + don) * hz; if (m.yas > 7) { mermiPatla(m); return; }
    } else
    m.vy += G * dt; if (m.ruzgar) m.vx += S.ruzgar * RUZGAR_IVME * dt;
    var sp = Math.hypot(m.vx, m.vy), n = Math.max(1, Math.ceil(sp * dt / 2));
    for (var s = 0; s < n; s++) {
      var nx = m.x + m.vx * dt / n, ny = m.y + m.vy * dt / n;
      if (m.carp) {
        var vur = null; tumKurt().forEach(function (k) { if (!k.olu && !vur && !(k === m.sahip && m.yas < 0.2) && Math.hypot(k.x - nx, k.y - ny) < R + 3) vur = k; });
        if (vur || solid(nx, ny)) { m.x = nx; m.y = ny; mermiPatla(m); return; }
      } else if (solid(nx, ny) || solid(nx, ny + 2)) {
        var no = normal(nx, ny, 6), vn = m.vx * no.x + m.vy * no.y;
        var ez = m.agir ? 0.22 : 0.45, sur = m.agir ? 0.6 : 0.8;
        if (vn < 0) { var tx = m.vx - vn * no.x, ty = m.vy - vn * no.y; m.vx = tx * sur - ez * vn * no.x; m.vy = ty * sur - ez * vn * no.y; if (-vn > 60) ses("sek"); }
        var g = 0; while (solid(m.x, m.y) && g < 8) { m.x += no.x; m.y += no.y; g++; }
        if (m.koyun && no.y < -0.5) { m.yerde = true; m.vy = 0; }
        else if (Math.hypot(m.vx, m.vy) < 30 && no.y < -0.4) { m.vx = 0; m.vy = 0; m.dur = true; }
        break;
      }
      m.x = nx; m.y = ny;
    }
    m.don += (m.vx * 0.012) * dt * 60 * (m.sek ? 1 : 0);
    if (m.tip === "bazuka" || m.tip === "hava" || m.tip === "gudumlu") { if (Math.random() < 0.8) S.parca.push({ x: m.x - m.vx * 0.01, y: m.y - m.vy * 0.01, vx: (Math.random() - 0.5) * 20, vy: -10, o: 0.6, b: 3 + Math.random() * 3, buyu: 14, renk: "200,200,200", tip: "duman" }); }
    if (m.y > SU + 6) { m.sil = true; suSicrat(m.x); ses("su"); }
    if (m.x < -400 || m.x > W + 400) m.sil = true;
  }
  function mermiPatla(m) {
    if (m.sil) return; m.sil = true;
    var P = m.patla; patla(m.x, m.y, P[0], P[1], 1, m.sahip);
    if (m.alev) { for (var j = 0; j < 10; j++) { var aa = -Math.PI / 2 + (simRng() - 0.5) * 2.4, vv = 90 + simRng() * 220; S.alev.push({ x: m.x, y: m.y - 6, vx: Math.cos(aa) * vv, vy: Math.sin(aa) * vv, omur: 3 + simRng() * 1.5, tik: simRng() * 0.4, yer: false }); } ses("hava"); }
    if (m.parca) {
      for (var i = 0; i < m.parca.n; i++) {
        var a = -Math.PI / 2 + (i - (m.parca.n - 1) / 2) * 0.42 + (simRng() - 0.5) * 0.25, v = m.parca.hiz * (0.75 + simRng() * 0.5);
        S.mermi.push({ tip: "parca", x: m.x, y: m.y - 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v, yas: 0, fitil: null, carp: true, sek: false, ruzgar: m.ruzgar, patla: m.parca.patla, sahip: null, don: 0, ik: m.tip });
      }
    }
  }
  /* ---------- sandıklar, mayınlar, alevler ---------- */
  var nesneSay = 0;
  function mayinKur(m) { m.sil = true; S.nesne.push({ t: "mayin", x: m.x, y: m.y, vy: 0, yer: true, kur: 1.2, tetik: -1, id: ++nesneSay + Math.round(m.x) * 1000 }); }
  function sandikAl(o, k) {
    o.sil = true; isikSac(o.x, o.y);
    if (o.s === "can") { k.hp += 25; k.gor = k.gor; yaziEkle(k.x, k.y - 34, "+25 ❤️", "#9ef0b0"); }
    else { var c = S.cephane[k.u] = S.cephane[k.u] || {}; c[o.w] = kalanU(k.u, o.w) + (o.n || 1); yaziEkle(k.x, k.y - 34, "+" + SILAH[o.w].ik + " ×" + (o.n || 1), "#ffe9a8"); if (k.u === ME) setTimeout(arayuz, 0); }
    ses("isinla");
  }
  function nesneAdim(dt) {
    S.nesne.forEach(function (o) {
      if (o.sil) return;
      if (o.y > SU + 4) { o.sil = true; suSicrat(o.x); return; }
      var alt = o.t === "sandik" ? 9 : 4;
      if (!solid(o.x, o.y + alt + 1)) { o.yer = false; o.vy = o.t === "sandik" ? Math.min(o.vy + G * dt, 120) : o.vy + G * dt; o.y += o.vy * dt; var g = 0; while (solid(o.x, o.y + alt) && g < 20) { o.y -= 1; g++; o.vy = 0; o.yer = true; } }
      else { o.vy = 0; o.yer = true; var g2 = 0; while (solid(o.x, o.y + alt - 1) && g2 < 20) { o.y -= 1; g2++; } }
      if (o.t === "sandik") { tumKurt().forEach(function (k) { if (!o.sil && !k.olu && Math.hypot(k.x - o.x, k.y - o.y) < 20) sandikAl(o, k); }); return; }
      if (o.kur > 0) { o.kur -= dt; return; }
      if (o.tetik < 0) { tumKurt().forEach(function (k) { if (!k.olu && Math.hypot(k.x - o.x, k.y - o.y) < 28) o.tetik = 1; }); if (o.tetik > 0) ses("sec"); }
      else { o.tetik -= dt; if (o.tetik <= 0) { o.sil = true; patla(o.x, o.y, SILAH.mayin.patla[0], SILAH.mayin.patla[1], 1); } }
    });
    S.nesne = S.nesne.filter(function (o) { return !o.sil; });
  }
  function alevAdim(dt) {
    S.alev.forEach(function (f) {
      f.omur -= dt;
      if (!f.yer) { f.vy += G * dt; var nx = f.x + f.vx * dt, ny = f.y + f.vy * dt; if (solid(nx, ny + 2)) { f.yer = true; f.vx = 0; f.vy = 0; var g = 0; while (solid(f.x, f.y + 1) && g < 10) { f.y -= 1; g++; } } else { f.x = nx; f.y = ny; } if (f.y > SU) f.omur = 0; }
      f.tik -= dt; if (f.tik <= 0) { f.tik = 0.5; tumKurt().forEach(function (k) { if (!k.olu && Math.hypot(k.x - f.x, k.y - f.y) < 16) hasarVer(k, 3); }); }
    });
    S.alev = S.alev.filter(function (f) { return f.omur > 0; });
  }
  /* yeni tur için gökten sandık (yazan taraf belirler; aynı tohumdan) */
  function sandikUret(d, tur) {
    var r = rng(((d.seed || 1) + tur * 7777) >>> 0), say = S.nesne.filter(function (o) { return o.t === "sandik"; }).length;
    if (say >= 3 || r() > 0.55) return null;
    for (var i = 0; i < 14; i++) {
      var x = Math.round(150 + r() * (W - 300)), y = 0; while (y < SU - 30 && !solid(x, y)) y += 6;
      if (y >= SU - 30) continue;
      var can = r() < 0.32, w = SANDIK_SILAH[Math.floor(r() * SANDIK_SILAH.length)], n = (w === "deprem" || w === "gudumlu" || w === "hava") ? 1 : 1 + (r() < 0.35 ? 1 : 0);
      return { t: "sandik", s: can ? "can" : "silah", w: can ? "" : w, n: can ? 0 : n, x: x, y: -60, id: tur };
    }
    return null;
  }
  /* ateş: kendi turunda da tekrarda da aynı yol */
  function ates(k, a) {
    var w = SILAH[a.w]; if (!w) return;
    k.yon = Math.cos(a.a) >= 0 ? 1 : -1;
    if (sinirli(a.w)) { var kl = kalanU(k.u, a.w), c = S.cephane[k.u] = S.cephane[k.u] || {}; c[a.w] = Math.max(0, kl - 1); }
    var mx = k.x + Math.cos(a.a) * 14, my = k.y - 3 + Math.sin(a.a) * 14;
    if (w.tip === "mermi") {
      var v = 140 + a.p * (w.hiz - 140);
      S.mermi.push({ tip: a.w, x: mx, y: my, vx: Math.cos(a.a) * v, vy: Math.sin(a.a) * v, yas: 0, fitil: w.fitil ? a.f : w.sure || null, carp: !!w.carp, sek: !!w.sek, ruzgar: !!w.ruzgar, patla: w.patla, parca: w.parca, sahip: k, don: 0, agir: !!w.agir, mayin: !!w.mayin, koyun: !!w.koyun, alev: !!w.alev, yon: Math.cos(a.a) >= 0 ? 1 : -1 });
      ses(w.carp ? "firlat" : w.koyun ? "zipla" : "at");
    } else if (w.tip === "birak") {
      S.mermi.push({ tip: "dinamit", x: k.x + k.yon * 8, y: k.y - 4, vx: k.yon * 40, vy: -60, yas: 0, fitil: 5, carp: false, sek: true, ruzgar: false, patla: w.patla, sahip: k, don: 0 });
      ses("at");
    } else if (w.lazer) {
      lazerAt(k, a.a); atisT = 0.8;
    } else if (w.kazma) {
      kazmaAt(k, a.a); atisT = 0.6;
    } else if (w.tip === "isin") {
      pompaAt(k, a.a, 0); setTimeout(function () { if (!k.olu && (mod === "atis" || mod === "tekrar")) pompaAt(k, a.a, 1); }, 650); atisT = 1.1;
    } else if (w.yumruk) {
      ses("sopa"); var ux0 = k.yon, hit = false;
      tumKurt().forEach(function (o) { if (o === k || o.olu) return; var dx = o.x - k.x, dy = o.y - k.y; if (Math.abs(dy) < 26 && dx * ux0 > -6 && Math.abs(dx) < 30) { hasarVer(o, 30); o.vx = ux0 * 140; o.vy = -720; o.hava = true; hit = true; } });
      k.vx = ux0 * 60; k.vy = -330; k.hava = true; kamera.salla = hit ? 10 : 3;
      S.izler.push({ tip: "sopa", x: k.x, y: k.y - 10, a: -Math.PI / 2, o: 1 });
    } else if (w.tip === "aninda") {
      ses("patla", { g: 1.3 }); kamera.salla = 24; atisT = 1.2;
      tumKurt().forEach(function (o) { if (o.olu) return; hasarVer(o, 10); o.vx = (simRng() - 0.5) * 300; o.vy = -(140 + simRng() * 220); o.hava = true; });
    } else if (a.w === "gudumlu") {
      ses("firlat"); var gy = k.yon;
      S.mermi.push({ tip: "gudumlu", x: k.x + gy * 10, y: k.y - 10, vx: gy * 120, vy: -520, yas: 0, fitil: null, carp: true, sek: false, ruzgar: false, patla: w.patla, sahip: k, don: 0, gud: { tx: a.tx, ty: a.ty } });
    } else if (w.tip === "sopa") {
      ses("sopa"); var px = k.x + Math.cos(a.a) * 16, py = k.y + Math.sin(a.a) * 16;
      tumKurt().forEach(function (o) { if (o === k || o.olu) return; if (Math.hypot(o.x - px, o.y - py) < 30) { hasarVer(o, 30); var ux = Math.cos(a.a), uy = Math.sin(a.a) - 0.35, L = Math.hypot(ux, uy); o.vx = ux / L * 640; o.vy = uy / L * 640; o.hava = true; kamera.salla = 8; } });
      S.izler.push({ tip: "sopa", x: k.x, y: k.y, a: a.a, o: 1 });
    } else if (a.w === "hava") {
      ses("hava");
      for (var i = 0; i < 5; i++) S.mermi.push({ tip: "hava", x: a.tx + (i - 2) * 34 - S.ruzgar * 120, y: -80 - i * 40, vx: S.ruzgar * 60 + (k.x < a.tx ? 40 : -40), vy: 260, yas: 1, fitil: null, carp: true, sek: false, ruzgar: true, patla: w.patla, sahip: null, don: 0 });
    } else if (a.w === "isinla") {
      ses("isinla"); isikSac(k.x, k.y); k.x = a.tx; k.y = a.ty; k.hava = true; k.vx = 0; k.vy = 0; isikSac(k.x, k.y);
    }
  }
  function lazerAt(k, a) {                                                /* lazer: yol üstündeki herkesi deler, toprağa 60 px girer */
    ses("isinla"); var x = k.x + Math.cos(a) * 14, y = k.y - 3 + Math.sin(a) * 14, ux = Math.cos(a), uy = Math.sin(a), x0 = x, y0 = y, vurulan = [], ici = 0, oyma = 0;
    for (var s = 0; s < 900; s++) {
      x += ux * 2; y += uy * 2;
      tumKurt().forEach(function (o) { if (o !== k && !o.olu && vurulan.indexOf(o) < 0 && Math.hypot(o.x - x, o.y - y) < R + 2) { vurulan.push(o); hasarVer(o, 28); o.vx += ux * 260; o.vy += uy * 260 - 140; o.hava = true; } });
      if (solid(x, y)) { ici += 2; if (ici - oyma >= 10) { oyma = ici; krater(Math.round(x), Math.round(y), 6); S.kraterler.push(Math.round(x), Math.round(y), 6); } if (ici > 60) break; }
      if (y > SU || x < 0 || x > W || y < -400) break;
    }
    S.izler.push({ tip: "lazer", x0: x0, y0: y0, x1: x, y1: y, o: 1 });
  }
  function kazmaAt(k, a) {                                                /* kazma: bakılan yöne tünel açar, kimseye vurmaz */
    ses("sopa"); var ux = Math.cos(a), uy = Math.sin(a);
    for (var i = 1; i <= 11; i++) { var x = Math.round(k.x + ux * i * 9), y = Math.round(k.y - 2 + uy * i * 9); if (!solid(x, y) && !solid(x, y + 8) && i > 2) continue; krater(x, y, 13); S.kraterler.push(x, y, 13); }
    for (var j = 0; j < 14; j++) { var aa = a + (Math.random() - 0.5) * 1.2, vv = 80 + Math.random() * 160; S.parca.push({ x: k.x + ux * 40, y: k.y + uy * 40, vx: Math.cos(aa) * vv, vy: Math.sin(aa) * vv, o: 1, b: 2 + Math.random() * 2, buyu: 0, renk: "110,72,40", tip: "toprak", omur: 0.8, g: true }); }
    kamera.salla = 4;
  }
  function pompaAt(k, a, j) {
    ses("pompa"); var x = k.x + Math.cos(a) * 14, y = k.y - 3 + Math.sin(a) * 14, ux = Math.cos(a), uy = Math.sin(a), x0 = x, y0 = y;
    for (var s = 0; s < 700; s++) {
      x += ux * 2; y += uy * 2;
      var vur = null; tumKurt().forEach(function (o) { if (o !== k && !o.olu && !vur && Math.hypot(o.x - x, o.y - y) < R + 1) vur = o; });
      if (vur) { hasarVer(vur, 25); vur.vx += ux * 320; vur.vy += uy * 320 - 120; vur.hava = true; patla(x, y, 8, 0, 0.3); break; }
      if (solid(x, y)) { patla(x, y, SILAH.pompali.patla[0], 0, 0.5); tumKurt().forEach(function (o) { if (!o.olu && Math.hypot(o.x - x, o.y - y) < 22) hasarVer(o, 10); }); break; }
      if (y > SU || x < 0 || x > W || y < -400) break;
    }
    S.izler.push({ tip: "cizgi", x0: x0, y0: y0, x1: x, y1: y, o: 1 });
  }
  /* ---------- efektler ---------- */
  function patlamaEfekt(x, y, r) {
    S.izler.push({ tip: "flas", x: x, y: y, r: r * 1.5, o: 1 }); S.izler.push({ tip: "halka", x: x, y: y, r: r * 0.6, R: r * 2.2, o: 1 });
    var n = Math.min(26, 8 + r * 0.35);
    for (var i = 0; i < n; i++) { var a = Math.random() * 7, v = 60 + Math.random() * r * 6; S.parca.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, o: 1, b: 3 + Math.random() * r * 0.18, buyu: -2, renk: Math.random() < 0.5 ? "255,190,60" : "255,110,40", tip: "ates", omur: 0.35 + Math.random() * 0.3 }); }
    for (i = 0; i < n * 0.7; i++) { a = Math.random() * 7; v = 20 + Math.random() * 60; S.parca.push({ x: x + Math.cos(a) * r * 0.4, y: y + Math.sin(a) * r * 0.4, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, o: 0.8, b: r * 0.25 + Math.random() * 8, buyu: 26, renk: "90,84,80", tip: "duman", omur: 1.3 + Math.random() * 0.7 }); }
    for (i = 0; i < n; i++) { a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6; v = 120 + Math.random() * 320; S.parca.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, o: 1, b: 1.5 + Math.random() * 2.5, buyu: 0, renk: Math.random() < 0.5 ? "110,72,40" : "80,52,30", tip: "toprak", omur: 1 + Math.random() * 0.6, g: true }); }
  }
  function suSicrat(x) { for (var i = 0; i < 16; i++) { var a = -Math.PI / 2 + (Math.random() - 0.5) * 1.4, v = 100 + Math.random() * 220; S.parca.push({ x: x, y: SU, vx: Math.cos(a) * v, vy: Math.sin(a) * v, o: 0.9, b: 2 + Math.random() * 3, buyu: 0, renk: "190,230,255", tip: "su", omur: 0.8, g: true }); } }
  function isikSac(x, y) { for (var i = 0; i < 20; i++) { var a = Math.random() * 7, v = 30 + Math.random() * 90; S.parca.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, o: 1, b: 2 + Math.random() * 2, buyu: -1, renk: "255,240,170", tip: "ates", omur: 0.7 }); } }
  function yaziEkle(x, y, t, renk) { S.yazi.push({ x: x, y: y, t: t, renk: renk, o: 1.6 }); }
  function efektAdim(dt) {
    S.parca.forEach(function (p) { p.omur = (p.omur || 1) - dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += G * dt; else { p.vx *= 0.96; p.vy = p.vy * 0.96 - (p.tip === "duman" ? 14 * dt : 0); } p.b = Math.max(0.5, p.b + p.buyu * dt); if (p.tip === "duman") p.vx += S.ruzgar * 30 * dt; });
    S.parca = S.parca.filter(function (p) { return p.omur > 0 && p.y < H + 20; });
    S.izler.forEach(function (z) { z.o -= dt * (z.tip === "flas" ? 6 : z.tip === "halka" ? 3 : 2.2); });
    S.izler = S.izler.filter(function (z) { return z.o > 0; });
    S.yazi.forEach(function (y) { y.o -= dt * 0.8; y.y -= 24 * dt; }); S.yazi = S.yazi.filter(function (y) { return y.o > 0; });
    kamera.salla *= Math.pow(0.02, dt);
  }

  /* ---------- tur ---------- */
  function ilkCanli(u, bas) { var L = S.kurt[u] || [], n = L.length; for (var j = 0; j < n; j++) { var k = L[(bas + j) % n]; if (!k.olu) return k; } return null; }
  function turBaslat() {
    if (!G_ || G_.bitti || G_.sira !== ME) return;
    aktif = ilkCanli(ME, (G_.siradaki && G_.siradaki[ME]) || 0);
    if (!aktif) return;
    mod = "hareket"; enerji = 100; yol = [aktif.x, aktif.y]; yolT = 0; nisan.var = false; hedef = null; basNesne = nesneAnlik();
    if (!S.cephane[ME]) S.cephane[ME] = {};
    if (kalanCephane(silah) <= 0) silah = "bazuka";
    simRng = rng(((G_.seed || 1) + (G_.tur || 0) * 7919) >>> 0);
    odakla(aktif.x, aktif.y - 40, Math.max(kamera.z, 0.9)); kamera.serbest = 0;
    ses("sira"); arayuz(); canliOnce = ""; canliGonder(true);
  }
  var basNesne = null;
  function kalanCephane(w) { return kalanU(ME, w); }
  function atesEt(a) {
    if (mod !== "hareket" || !aktif) return;
    if (kalanCephane(a.w) <= 0) { D.msg("Bu silah bitti."); return; }
    yol.push(Math.round(aktif.x), Math.round(aktif.y));
    bekleyen = { a: a, i: aktif.i, yol: yolSikistir(yol), ruzgar: S.ruzgar, once: anlik(), nesne: basNesne || nesneAnlik() };
    mod = "atis"; cozT = 0; atisT = 0; turDegisim = 0;
    tumKurt().forEach(function (k) { k.hasar = 0; });
    if (a.w !== "pas") ates(aktif, a);
    canliAtisGonder(bekleyen);
    arayuz();
  }
  function yolSikistir(L) { var out = L.map(function (v) { return Math.round(v); }); while (out.length > 80) { var y = []; for (var i = 0; i < out.length; i += 4) { y.push(out[i], out[i + 1]); } if (y[y.length - 2] !== out[out.length - 2]) y.push(out[out.length - 2], out[out.length - 1]); out = y; } return out; }
  function anlik() { var k = {}; S.takim.forEach(function (u) { k[u] = (S.kurt[u] || []).map(function (w) { return { x: Math.round(w.x), y: Math.round(w.y), hp: Math.max(0, Math.round(w.hp)), yon: w.yon }; }); }); return k; }
  function sakinMi() {
    if (S.mermi.length) return false; if (atisT > 0) return false; if (S.alev.length) return false;
    if (S.nesne.some(function (o) { return o.tetik > 0 || (!o.yer && o.y > 0); })) return false;
    return tumKurt().every(function (k) { return k.olu || !k.hava; });
  }
  function cozumAdim(dt) {
    if (atisT > 0) atisT -= dt;
    turDegisim += dt;
    if (sakinMi()) cozT += dt; else cozT = 0;
    if (cozT > 0.5 || turDegisim > 20) {
      if (mod === "atis") { try { turuYaz(); } catch (e) { try { console.warn("tp-yaz", e && e.stack); } catch (x) {} mod = "atis"; cozT = -2; } } else if (mod === "tekrar") tekrarBitti();
    }
  }
  function turuYaz() {
    if (mod !== "atis") return; mod = "yaziyor";
    tumKurt().forEach(function (k) { if (!k.olu && k.hp <= 0) olum(k); });
    var b = bekleyen, d0 = G_, ben = ME, on = OTHER;
    var kurt = anlik(), canB = canli(ben).length, canO = canli(on).length;
    var bitti = !canB || !canO, kazanan = bitti ? (canB && !canO ? ben : !canB && canO ? on : null) : null;
    var r = rng((d0.seed + (d0.tur + 1) * 104729) >>> 0); var yeniRuzgar = Math.round(((r() * 2 - 1) * (0.35 + r() * 0.65)) * 100) / 100;
    var yeniS = sandikUret(d0, (d0.tur || 0) + 1); if (yeniS) S.nesne.push(nesneYukle([yeniS])[0]);
    var sirada = {}; sirada[ben] = ((b.i + 1) % (S.kurt[ben] || [1]).length); sirada[on] = (d0.siradaki && d0.siradaki[on]) || 0;
    var upd = { kurt: kurt, kraterler: S.kraterler.slice(), cephane: S.cephane, nesne: nesneAnlik(), siradaki: sirada, ruzgar: yeniRuzgar, tur: (d0.tur || 0) + 1, v: d0.v + 1,
      son: { n: (d0.tur || 0) + 1, u: ben, i: b.i, yol: b.yol, atis: b.a, ruzgar: b.ruzgar, once: { kurt: b.once, kc: harita.kc, nesne: b.nesne } }, t: firebase.firestore.FieldValue.serverTimestamp() };
    if (bitti) { upd.bitti = true; upd.sonuc = kazanan ? "dustu" : "berabere"; upd.kazanan = kazanan; upd.sira = ""; } else upd.sira = on;
    delete upd.t; upd = JSON.parse(JSON.stringify(upd)); upd.t = firebase.firestore.FieldValue.serverTimestamp();   /* tanımsız alan kalmasın (Firestore kabul etmez) */
    sonYazilan = upd.son.n; gorulen[G_.n] = upd.son.n; gorKaydet();
    var dene = 0;
    (function yaz() {
      D.db.runTransaction(function (tx) {
        return tx.get(D.ref).then(function (snap) {
          var d = snap.data(); if (!d || d.bitti || d.sira !== ben || d.n !== d0.n || d.v !== d0.v) throw new Error("sira");
          tx.set(D.ref, upd, { merge: true });
        });
      }).then(function () { harita.kc = S.kraterler.length / 3; if (bitti) D.bitirenBenim = true; mod = "bekle"; arayuz(); })
        .catch(function (e) { try { console.warn("tp-yaz", e && (e.stack || e.message || e)); } catch (x) {} if (String(e && e.message) === "sira") { D.msg("Sıra değişmiş; yeniden yükleniyor."); mod = "bekle"; setTimeout(function () { location.reload(); }, 1200); return; } if (++dene < 4) setTimeout(yaz, 1200 * dene); else { D.msg("Bağlantı yok; tekrar denemek için dokun.", true); mod = "yazamadi"; G_._yaz = yaz; } });
    })();
  }
  function olum(k) { k.olu = true; k.hp = 0; if (!k.bogul) { S.izler.push({ tip: "flas", x: k.x, y: k.y, r: 26, o: 1 }); } }
  /* öbürünün atışını izle */
  function tekrarBaslat(d) {
    var s = d.son; if (!s || !s.once) { durumUygula(d); return; }
    durumYukle(d, s.once.kurt, s.once.nesne || d.nesne);
    var kc = s.once.kc || 0;
    if (harita.seed !== d.seed || harita.kc !== kc || S.kraterler.length !== kc * 3) { araziKur(d.seed, d.harita, (d.kraterler || []).slice(0, kc * 3)); }
    S.kraterler = (d.kraterler || []).slice(0, kc * 3); S.mermi = [];
    S.ruzgar = s.ruzgar || 0;
    var k = (S.kurt[s.u] || [])[s.i]; if (!k) { durumUygula(d); return; }
    mod = "tekrar"; aktif = k; simRng = rng(((d.seed || 1) + ((s.n || 1) - 1) * 7919) >>> 0);
    tumKurt().forEach(function (w) { w.hasar = 0; });
    tekrarIs = { d: d, yol: s.yol || [], j: 2, bekle: 0.3, atis: s.atis, atildi: false };
    if (tekrarIs.yol.length >= 2) { k.x = tekrarIs.yol[0]; k.y = tekrarIs.yol[1]; }
    odakla(k.x, k.y - 40, Math.max(0.8, kamera.z)); kamera.serbest = 0;
    arayuz();
  }
  function tekrarAdim(dt) {
    var t = tekrarIs; if (!t) return; var k = aktif;
    if (t.bekle > 0) { t.bekle -= dt; return; }
    if (!t.atildi) {
      if (t.j < t.yol.length) {
        var tx = t.yol[t.j], ty = t.yol[t.j + 1], dx = tx - k.x, dy = ty - k.y, L = Math.hypot(dx, dy), st = 240 * dt;
        if (Math.abs(dx) > 0.5) k.yon = dx > 0 ? 1 : -1;
        if (L <= st) { k.x = tx; k.y = ty; t.j += 2; } else { k.x += dx / L * st; k.y += dy / L * st; k.yuruT = 1; k.yuruAn = 0.12; }
        return;
      }
      t.atildi = true; t.nisanT = 0.4; nisan.a = t.atis.a; nisan.p = t.atis.p; nisan.var = true; return;
    }
    if (t.nisanT > 0) { t.nisanT -= dt; if (t.nisanT <= 0) { nisan.var = false; mod = "tekrar"; cozT = 0; atisT = 0; turDegisim = 0; if (t.atis.w !== "pas") ates(k, t.atis); else yaziEkle(k.x, k.y - 30, "pas", "#fff"); t.atesli = true; } return; }
  }
  function tekrarBitti() {
    var canliTur = tekrarIs && tekrarIs.canli;
    var d = tekrarIs ? tekrarIs.d : G_; tekrarIs = null;
    tumKurt().forEach(function (k) { if (!k.olu && k.hp <= 0) olum(k); });
    if (canliTur) {                                                        /* canlı izlenen atış bitti: kesin sonucu bekle ya da hemen otur */
      if (G_ && G_.son && G_.son.n >= canliTur) { gorulen[G_.n] = G_.son.n; gorKaydet(); durumUygula(G_, true); }
      else { mod = "canliBekle"; arayuz(); }
      return;
    }
    gorulen[d.n] = d.son ? d.son.n : 0; gorKaydet();
    var son = G_ || d;
    if (son.n === d.n && son.son && son.son.u !== ME && son.son.n > gorulen[d.n]) { tekrarBaslat(son); return; }
    durumUygula(son.n === d.n ? son : d, true);
  }
  /* yazılı duruma otur (arazi farklıysa baştan kur) */
  function durumUygula(d, yumusak) {
    var kr = d.kraterler || [];
    var ayni = harita.seed === d.seed && S.kraterler.length === kr.length && S.kraterler.every(function (v, i) { return v === kr[i]; });
    if (!ayni) { araziKur(d.seed, d.harita, kr); }
    S.kraterler = kr.slice(); harita.kc = kr.length / 3;
    var eski = {}; tumKurt().forEach(function (k) { eski[k.u + ":" + k.i] = k; });
    durumYukle(d);
    if (yumusak) tumKurt().forEach(function (k) { var e = eski[k.u + ":" + k.i]; if (e && Math.hypot(e.x - k.x, e.y - k.y) < 60) { k.yon = e.yon; } });
    S.mermi = [];
    mod = d.bitti ? "bitti" : "bekle"; aktif = null;
    if (!d.bitti && d.sira === ME) turBaslat(); else if (!d.bitti) { var sonraki = ilkCanli(d.sira, (d.siradaki && d.siradaki[d.sira]) || 0); if (sonraki) odakla(sonraki.x, sonraki.y - 40, Math.max(0.6, Math.min(kamera.z, 1))); }
    arayuz();
  }
  function gorKaydet() { try { localStorage.setItem("tp_gor", JSON.stringify(gorulen)); } catch (e) {} }
  try { gorulen = JSON.parse(localStorage.getItem("tp_gor") || "{}") || {}; } catch (e) { gorulen = {}; }

  /* ---------- canlı izleme: sırası gelen kendi "tepe/canli_<uid>" dokümanına yürüyüşünü, nişanını ve atışını yazar ---------- */
  var canliRef = null, canliDinle = null, canliSon = 0, canliOnce = "", canliW = "bazuka", canliHedef = null, canliOynanan = { n: -1, tur: -1 };
  function canliKur() {
    if (canliRef || !D.db || !ME || !OTHER) return;
    canliRef = D.db.collection("tepe").doc("canli_" + ME);
    canliDinle = D.db.collection("tepe").doc("canli_" + OTHER).onSnapshot(function (snap) { if (snap.exists) canliGeldi(snap.data()); }, function () {});
  }
  function canliGonder(zorla) {
    if (!canliRef || !aktif || !G_) return;
    var simdi = Date.now(); if (!zorla && simdi - canliSon < 220) return;
    var v = { sira: ME, n: G_.n, tur: G_.tur || 0, i: aktif.i, x: Math.round(aktif.x), y: Math.round(aktif.y), yon: aktif.yon, a: r3(nisan.a), p: r3(nisan.p), nv: !!nisan.var, w: silah, yu: yuruYon ? 1 : 0, atis: null };
    var k = JSON.stringify(v); if (k === canliOnce) return; canliOnce = k; canliSon = simdi;
    v.zt = simdi; canliRef.set(v).catch(function () {});
  }
  function canliAtisGonder(b) {
    if (!canliRef || !G_ || !b) return;
    var v = { sira: ME, n: G_.n, tur: G_.tur || 0, i: b.i, x: Math.round(aktif.x), y: Math.round(aktif.y), yon: aktif.yon, a: b.a.a, p: b.a.p, nv: false, w: b.a.w, yu: 0, zt: Date.now(),
      atis: JSON.parse(JSON.stringify({ a: b.a, once: b.once, nesne: b.nesne, ruzgar: b.ruzgar, kc: harita.kc })) };
    canliOnce = ""; canliRef.set(v).catch(function () {});
  }
  function canliGeldi(c) {
    if (!G_ || G_.bitti || G_.sira !== OTHER || c.sira !== OTHER || c.n !== G_.n || (c.tur || 0) !== (G_.tur || 0)) return;
    if (Date.now() - (c.zt || 0) > 180000) return;
    if (mod === "tekrar" || mod === "atis" || mod === "yaziyor" || mod === "hareket") return;
    var k = (S.kurt[OTHER] || [])[c.i]; if (!k || k.olu) return;
    if (c.atis) {                                                          /* atış: aynı başlangıçtan aynı fizikle hemen oynat */
      if (canliOynanan.n === c.n && canliOynanan.tur === c.tur + 1) return;
      var at = c.atis; if (at.kc !== harita.kc) return;                    /* arazi farklı: kesin sonuç gelince baştan izlenir */
      canliOynanan = { n: c.n, tur: c.tur + 1 };
      durumYukle(G_, at.once, at.nesne); S.mermi = []; S.ruzgar = at.ruzgar || 0;
      aktif = S.kurt[OTHER][c.i]; if (!aktif) return;
      mod = "tekrar"; simRng = rng(((G_.seed || 1) + (c.tur || 0) * 7919) >>> 0);
      tumKurt().forEach(function (w) { w.hasar = 0; });
      tekrarIs = { d: G_, yol: [], j: 0, bekle: 0, atis: at.a, atildi: true, nisanT: 0, atesli: true, canli: c.tur + 1 };
      nisan.var = false; cozT = 0; atisT = 0; turDegisim = 0;
      if (at.a.w !== "pas") ates(aktif, at.a); else yaziEkle(aktif.x, aktif.y - 30, "pas", "#fff");
      kamera.serbest = 0; arayuz(); return;
    }
    if (mod !== "canli") { mod = "canli"; aktif = k; odakla(k.x, k.y - 40, Math.max(kamera.z, 0.9)); kamera.serbest = 0; ses("sira"); arayuz(); }
    aktif = k; canliHedef = { x: c.x, y: c.y, yu: c.yu }; k.yon = c.yon || k.yon;
    nisan.a = c.a; nisan.p = c.p; nisan.var = !!c.nv; canliW = SILAH[c.w] ? c.w : "bazuka";
  }
  function canliAdim(dt) {
    var k = aktif, h = canliHedef; if (!k || !h) return;
    var dx = h.x - k.x, dy = h.y - k.y, L = Math.hypot(dx, dy);
    if (L > 300) { k.x = h.x; k.y = h.y; return; }
    if (L > 0.5) { var st = Math.max(70, L * 6) * dt; if (st >= L) { k.x = h.x; k.y = h.y; } else { k.x += dx / L * st; k.y += dy / L * st; } if (Math.abs(dx) > 1) { k.yuruT = 1; k.yuruAn = 0.12; } }
  }

  /* ---------- Duello ---------- */
  D = window.Duello({
    kol: "tepe", sayfa: "tepe", sub: "sub", ses: "TpSes", helpKey: "tepe_help",
    startText: "Herkesin 3–4 kişilik takımı haritaya dağılır. Sırayla yürü, nişan al, ateşle; takımı ayakta kalan kazanır.",
    yeniDoc: function (d, me, ot) {
      var baslayan = d && d.baslayan ? (d.baslayan === me ? ot : me) : me, seed = (Math.random() * 2147483647) | 0, tip = seciliHarita, adet = seciliAdet;
      var s = yuzey(seed, tip), r = rng(seed + 99), kara = [];
      for (var x = 120; x < W - 120; x += 4) if (s[x] < SU - 50) kara.push(x);
      var n = adet * 2, kurt = {}, cep = {}, sira = {}, yer = [];
      kurt[me] = []; kurt[ot] = [];
      for (var i = 0; i < n; i++) { var dilim = kara.slice(Math.floor(i * kara.length / n), Math.floor((i + 1) * kara.length / n)); var px = dilim.length ? dilim[Math.floor(dilim.length * (0.25 + r() * 0.5))] : 200 + i * 200; yer.push(px); }
      for (i = yer.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = yer[i]; yer[i] = yer[j]; yer[j] = t; }
      yer.forEach(function (px, i) { var u = i % 2 ? ot : me; kurt[u].push({ x: px, y: Math.round(s[px] - R - 1), hp: 100 }); });
      cep[me] = {}; cep[ot] = {}; sira[me] = 0; sira[ot] = 0;
      var rr = Math.round((r() * 2 - 1) * 0.6 * 100) / 100;
      return { a: me, b: ot, baslayan: baslayan, seed: seed, harita: tip, adet: adet, tur: 0, sira: baslayan, ruzgar: rr, kurt: kurt, kraterler: [], cephane: cep, siradaki: sira, son: null };
    },
    onMac: function (d, ilk) { macGeldi(d, ilk); },
    onYok: function () { G_ = null; mod = "yok"; arayuz(); },
    bitisGecikme: 1400,
    bitis: function (d) {
      var ad = D.adlar[D.other] || "Rakip", kazandim = d.kazanan === D.me;
      var baslik = d.sonuc === "pes" ? (kazandim ? ad + " pes etti — kazandın" : "Pes ettin") : !d.kazanan ? "İki takım da düştü — berabere" : kazandim ? "Kazandın! Tepe senin 🏆" : ad + " kazandı";
      return { kick: "Savaş " + d.n + " · " + (HARITA_AD[d.harita] || "") + " · " + (d.tur || 0) + " tur", baslik: baslik, metin: "Yeni savaşta ilk atış " + (d.baslayan === D.me ? D.ekIn(ad) : "senin") + "." };
    },
    seriKod: function (d) { return d.sonuc === "pes" ? 99 : Math.min(98, d.tur || 0); }
  });
  function macGeldi(d, ilk) {
    ME = D.me; OTHER = D.other || (d.a === ME ? d.b : d.a); canliKur();
    var onceki = G_; G_ = d;
    if (ilk || !onceki || onceki.n !== d.n) {
      S.kraterler = []; harita.seed = -1; S.parca = []; S.izler = []; S.yazi = [];
      var s = d.son;
      if (s && s.u !== ME && (gorulen[d.n] || 0) < s.n) tekrarBaslat(d);
      else { durumUygula(d); if (ilkKurulum) { kamera.x = kamera.hx; kamera.y = kamera.hy; kamera.z = kamera.hz; } }
      ilkKurulum = false; arayuz(); return;
    }
    if (d.son && d.son.u !== ME && canliOynanan.n === d.n && canliOynanan.tur === d.son.n && d.son.n > (gorulen[d.n] || 0)) {
      if (mod === "tekrar" && tekrarIs && tekrarIs.canli) { arayuz(); return; }           /* canlı simülasyon sürüyor; bitince oturur */
      gorulen[d.n] = d.son.n; gorKaydet(); durumUygula(d, true); return;
    }
    if (d.son && d.son.n > (gorulen[d.n] || 0) && d.son.u !== ME) { if (mod === "tekrar") { tekrarIs && (tekrarIs.sonraki = d); return; } tekrarBaslat(d); return; }
    if (mod === "atis" || mod === "yaziyor" || mod === "tekrar") { arayuz(); return; }
    if (mod === "canli" && !d.bitti && d.sira === OTHER) { arayuz(); return; }
    if (d.bitti && mod !== "bitti") { durumUygula(d); return; }
    if (!d.bitti && d.sira === ME && mod !== "hareket") { durumUygula(d); return; }
    arayuz();
  }

  /* ---------- çizim ---------- */
  var cv = $("cv"), ctx = cv.getContext("2d"), CW = 1, CH = 1, DPR = 1;
  function boyut() { DPR = Math.min(window.devicePixelRatio || 1, 2); CW = innerWidth; CH = innerHeight; cv.width = Math.round(CW * DPR); cv.height = Math.round(CH * DPR); cv.style.width = CW + "px"; cv.style.height = CH + "px"; zSinir(); }
  function zMin() { var a = CW / (W + 200), b = CH / (H + 120); return CH > CW ? Math.max(a, b * 0.55) : Math.max(a, b); }
  function zSinir() { kamera.hz = Math.max(zMin(), Math.min(2.4, kamera.hz)); }
  addEventListener("resize", boyut); boyut(); kamera.z = kamera.hz = zMin();
  function odakla(x, y, z) { kamera.hx = x; kamera.hy = y; if (z) kamera.hz = z; zSinir(); }
  /* arka plan */
  var arka = document.createElement("canvas"); arka.width = 1200; arka.height = 600;
  (function () {
    var x = arka.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 600); g.addColorStop(0, "#5fb2ec"); g.addColorStop(0.55, "#a9dcf5"); g.addColorStop(1, "#e9f6ef");
    x.fillStyle = g; x.fillRect(0, 0, 1200, 600);
    x.fillStyle = "rgba(255,248,214,.9)"; x.beginPath(); x.arc(930, 120, 46, 0, 7); x.fill(); x.fillStyle = "rgba(255,248,214,.25)"; x.beginPath(); x.arc(930, 120, 80, 0, 7); x.fill();
    [[0.42, "#9cc7d9", 0.55], [0.55, "#86b4c4", 0.75]].forEach(function (L, j) {
      x.fillStyle = L[1]; x.beginPath(); x.moveTo(0, 600);
      for (var i = 0; i <= 1200; i += 20) x.lineTo(i, 600 * L[0] + Math.sin(i * 0.006 + j * 2) * 60 + Math.sin(i * 0.017 + j) * 25 + 80);
      x.lineTo(1200, 600); x.fill();
    });
  })();
  var bulutlar = []; for (var bi = 0; bi < 7; bi++) bulutlar.push({ x: Math.random() * W, y: 60 + Math.random() * 260, s: 0.6 + Math.random() * 0.9 });
  function bulut(x, y, s) { ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.beginPath(); ctx.arc(x, y, 26 * s, 0, 7); ctx.arc(x + 30 * s, y - 12 * s, 32 * s, 0, 7); ctx.arc(x + 64 * s, y, 24 * s, 0, 7); ctx.arc(x + 30 * s, y + 6 * s, 26 * s, 0, 7); ctx.fill(); }
  function kurtCiz(k, t) {
    var rk = takimRenk(k.u), x = k.x, y = k.y, kul = D && D.kul[k.u];
    if (k.olu) {
      if (k.bogul) return;
      ctx.fillStyle = "#9aa0a6"; ctx.strokeStyle = "#5f656b"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 7, y + R); ctx.lineTo(x - 7, y - 4); ctx.arc(x, y - 4, 7, Math.PI, 0); ctx.lineTo(x + 7, y + R); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#6c7278"; ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 2); ctx.moveTo(x - 3, y - 4); ctx.lineTo(x + 3, y - 4); ctx.stroke();
      return;
    }
    var yuru = k.yuruT && k.yuruAn > 0, bob = yuru ? Math.abs(Math.sin(t * 14)) * 1.6 : Math.sin(t * 2 + k.bob) * 0.5, yon = k.yon || 1;
    ctx.save(); ctx.translate(x, y - bob);
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(0, R + bob - 0.5, 8, 2.4, 0, 0, 7); ctx.fill();
    /* ayaklar */
    var ad = yuru ? Math.sin(t * 14) * 2.5 : 0;
    ctx.fillStyle = rk.koyu; ctx.beginPath(); ctx.ellipse(-4 + ad, R - 1 + bob, 3.6, 2.4, 0, 0, 7); ctx.ellipse(4 - ad, R - 1 + bob, 3.6, 2.4, 0, 0, 7); ctx.fill();
    /* gövde */
    var g = ctx.createRadialGradient(-3, -4, 2, 0, 0, 12); g.addColorStop(0, rk.acik); g.addColorStop(1, rk.ana);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 9.5, 10.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(yon * 1.5, 4, 5, 4.5, 0, 0, 7); ctx.fill();
    /* yüz */
    var bak = Math.cos(nisanAci(k)) * 1.6;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(yon * 2 - 2.6, -3, 2.6, 3.2, 0, 0, 7); ctx.ellipse(yon * 2 + 2.6, -3, 2.6, 3.2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#2a1c22"; ctx.beginPath(); ctx.arc(yon * 2 - 2.6 + bak * 0.6, -2.6, 1.4, 0, 7); ctx.arc(yon * 2 + 2.6 + bak * 0.6, -2.6, 1.4, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(255,120,150,.45)"; ctx.beginPath(); ctx.arc(yon * 2 - 5.2, 1, 1.6, 0, 7); ctx.arc(yon * 2 + 5.2, 1, 1.6, 0, 7); ctx.fill();
    ctx.strokeStyle = "#5a2a3a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(yon * 2, 0.6, 1.8, 0.2, Math.PI - 0.2); ctx.stroke();
    /* başlık */
    if (kul === "a") { ctx.fillStyle = rk.koyu; ctx.beginPath(); ctx.ellipse(0, -8.5, 9, 4.6, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-9, -9, 18, 2.2); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, -13.4, 2.6, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = rk.koyu; ctx.beginPath(); ctx.ellipse(0, -8, 8.8, 4.8, 0, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.ellipse(yon * 7, -8, 6, 1.8, 0, 0, 7); ctx.fill(); }
    ctx.restore();
    /* silah */
    if (k === aktif && (mod === "hareket" || ((mod === "tekrar" || mod === "canli") && nisan.var) || mod === "canli")) {
      var a = nisan.a, w = SILAH[mod === "tekrar" && tekrarIs ? tekrarIs.atis.w : mod === "canli" ? canliW : silah] || SILAH.bazuka;
      ctx.save(); ctx.translate(x, y - 3); ctx.rotate(a); if (Math.cos(a) < 0) ctx.scale(1, -1);
      if (w.tip === "sopa") { ctx.fillStyle = "#c58b4a"; ctx.fillRect(4, -1.5, 18, 3); ctx.fillRect(18, -2.5, 6, 5); }
      else if (w.tip === "mermi" && silahAd(w) === "Bazuka") { ctx.fillStyle = "#4a6b3a"; ctx.fillRect(2, -3, 20, 6); ctx.fillStyle = "#2f4626"; ctx.fillRect(20, -3.5, 4, 7); }
      else if (w.tip === "isin" && !w.lazer && !w.kazma) { ctx.fillStyle = "#5b4636"; ctx.fillRect(2, -2, 10, 4); ctx.fillStyle = "#333"; ctx.fillRect(10, -1.6, 12, 3.2); }
      else { ctx.font = "13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(w.ik, 14, 0); }
      ctx.restore();
    }
  }
  function silahAd(w) { return w.ad; }
  function nisanAci(k) { return k === aktif ? nisan.a : (k.yon > 0 ? -0.3 : Math.PI + 0.3); }
  function etiketCiz(k) {
    if (k.olu) return; var rk = takimRenk(k.u), t = k.ad + "  " + Math.max(0, Math.round(k.gor));
    ctx.font = "800 9px Nunito, system-ui, sans-serif"; var w = ctx.measureText(t).width + 10;
    ctx.fillStyle = "rgba(20,14,30,.62)"; yuvarlakDik(k.x - w / 2, k.y - 33, w, 13, 6); ctx.fill();
    ctx.fillStyle = rk.yazi; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, k.x, k.y - 26.2);
  }
  function yuvarlakDik(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function mermiCiz(m) {
    ctx.save(); ctx.translate(m.x, m.y);
    if (m.tip === "koyun") { ctx.scale(-(m.yon || 1), 1); ctx.font = "16px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🐑", 0, -2 - (m.yerde ? Math.abs(Math.sin(m.yas * 14)) * 2 : 0)); }
    else if (m.tip === "mayin") { mayinSekil(0, 0, m.yas); }
    else if (m.tip === "bazuka" || m.tip === "hava" || m.tip === "gudumlu") { ctx.rotate(Math.atan2(m.vy, m.vx)); ctx.fillStyle = "#3d5a33"; ctx.fillRect(-7, -2.5, 12, 5); ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.moveTo(5, -2.5); ctx.lineTo(9, 0); ctx.lineTo(5, 2.5); ctx.fill(); ctx.fillStyle = "#ffb347"; ctx.beginPath(); ctx.moveTo(-7, -2); ctx.lineTo(-12 - Math.random() * 4, 0); ctx.lineTo(-7, 2); ctx.fill(); }
    else if (m.tip === "parca") { ctx.fillStyle = m.ik === "muz" ? "#f6d743" : "#e84a5f"; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill(); }
    else {
      ctx.rotate(m.don); ctx.font = (m.tip === "dinamit" ? 14 : 12) + "px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(SILAH[m.tip] ? SILAH[m.tip].ik : "•", 0, 0);
    }
    ctx.restore();
    if (m.fitil !== null && m.fitil !== undefined && m.fitil > 0) { ctx.font = "900 10px Nunito, sans-serif"; ctx.fillStyle = m.fitil < 1.5 ? "#ff6b6b" : "#fff"; ctx.textAlign = "center"; ctx.fillText(Math.ceil(m.fitil), m.x, m.y - 12); }
  }
  function mayinSekil(x, y, t, hizli) {
    ctx.fillStyle = "#3a3f44"; ctx.beginPath(); ctx.ellipse(x, y + 1, 7, 4.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#5c636a"; ctx.beginPath(); ctx.ellipse(x, y - 0.5, 5, 3, 0, Math.PI, 0); ctx.fill();
    var yan = hizli ? Math.sin(t * 30) > 0 : Math.sin(t * 5) > 0.3; ctx.fillStyle = yan ? "#ff3b3b" : "#7a1d1d"; ctx.beginPath(); ctx.arc(x, y - 3, 1.8, 0, 7); ctx.fill();
  }
  function nesneCiz(o, t) {
    if (o.t === "mayin") { mayinSekil(o.x, o.y, t, o.tetik > 0); return; }
    var x = o.x, y = o.y, can = o.s === "can";
    if (!o.yer && o.y > -40) {                                           /* paraşüt */
      ctx.strokeStyle = "rgba(60,40,30,.7)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x - 15, y - 30); ctx.moveTo(x + 8, y - 8); ctx.lineTo(x + 15, y - 30); ctx.stroke();
      ctx.fillStyle = can ? "#ff9fc0" : "#ffd15c"; ctx.beginPath(); ctx.arc(x, y - 30, 17, Math.PI, 0); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.arc(x - 5, y - 30, 17, Math.PI, Math.PI * 1.35); ctx.lineTo(x, y - 30); ctx.fill();
    }
    ctx.fillStyle = can ? "#f6f3ee" : "#b5793f"; ctx.strokeStyle = can ? "#c9b9a6" : "#6d4220"; ctx.lineWidth = 1.5;
    ctx.fillRect(x - 9, y - 9, 18, 17); ctx.strokeRect(x - 9, y - 9, 18, 17);
    if (can) { ctx.fillStyle = "#e84a5f"; ctx.fillRect(x - 2, y - 6, 4, 11); ctx.fillRect(x - 6, y - 2.5, 12, 4); }
    else { ctx.strokeStyle = "#6d4220"; ctx.beginPath(); ctx.moveTo(x - 9, y - 1); ctx.lineTo(x + 9, y - 1); ctx.stroke(); ctx.font = "900 10px Nunito, sans-serif"; ctx.fillStyle = "#fff3c4"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", x, y + 0.5 + Math.sin(t * 3) * 0.5); }
  }
  function alevCiz(f, t) {
    var s = Math.min(1, f.omur) * (5 + Math.sin(t * 18 + f.x) * 1.5);
    ctx.fillStyle = "rgba(255,120,30,.85)"; ctx.beginPath(); ctx.ellipse(f.x, f.y - s * 0.6, s * 0.7, s * 1.2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "rgba(255,220,90,.95)"; ctx.beginPath(); ctx.ellipse(f.x, f.y - s * 0.4, s * 0.35, s * 0.7, 0, 0, 7); ctx.fill();
    if (Math.random() < 0.15) S.parca.push({ x: f.x, y: f.y - 8, vx: (Math.random() - 0.5) * 10, vy: -20, o: 0.5, b: 2, buyu: 10, renk: "90,84,80", tip: "duman", omur: 0.8 });
  }
  function suCiz(t) {
    var x0 = kamera.x - CW / 2 / kamera.z - 40, x1 = kamera.x + CW / 2 / kamera.z + 40;
    var g = ctx.createLinearGradient(0, SU - 10, 0, H + 200); g.addColorStop(0, "rgba(70,150,215,.85)"); g.addColorStop(1, "rgba(25,70,140,.95)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, H + 400);
    for (var x = x0; x <= x1; x += 16) ctx.lineTo(x, SU + Math.sin(x * 0.03 + t * 2) * 3 + Math.sin(x * 0.011 - t * 1.3) * 2.5);
    ctx.lineTo(x1, H + 400); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2; ctx.beginPath();
    for (x = x0; x <= x1; x += 16) { var yy = SU + Math.sin(x * 0.03 + t * 2) * 3 + Math.sin(x * 0.011 - t * 1.3) * 2.5; if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
    ctx.stroke();
  }
  function izYolu(k) {
    var w = SILAH[silah]; if (!w || (w.tip !== "mermi" && w.tip !== "isin")) return;
    var a = nisan.a, x = k.x + Math.cos(a) * 14, y = k.y - 3 + Math.sin(a) * 14;
    ctx.fillStyle = "rgba(255,255,255,.85)";
    if (w.tip === "isin") { for (var i = 1; i < 14; i++) { ctx.beginPath(); ctx.arc(x + Math.cos(a) * i * 10, y + Math.sin(a) * i * 10, 1.4, 0, 7); ctx.fill(); } return; }
    var v = 140 + nisan.p * (w.hiz - 140), vx = Math.cos(a) * v, vy = Math.sin(a) * v, dt = 1 / 60;
    for (var s = 0; s < 22; s++) { for (var q = 0; q < 2; q++) { vy += G * dt; if (w.ruzgar) vx += S.ruzgar * RUZGAR_IVME * dt; x += vx * dt; y += vy * dt; } if (solid(x, y)) break; ctx.globalAlpha = 1 - s / 22; ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  var sonT = 0, saat = 0;
  function ciz() {
    var t = saat;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.drawImage(arka, 0, 0, 1200, 600, -((kamera.x / W) * 140), -40 - ((kamera.y / H) * 40), CW + 200, CH + 120);
    var sx = (Math.random() - 0.5) * kamera.salla, sy = (Math.random() - 0.5) * kamera.salla;
    ctx.setTransform(DPR * kamera.z, 0, 0, DPR * kamera.z, DPR * (CW / 2 - kamera.x * kamera.z + sx), DPR * (CH / 2 - kamera.y * kamera.z + sy));
    bulutlar.forEach(function (b) { bulut(b.x, b.y, b.s); });
    /* sadece ekranda görünen parçayı çiz (2400×1100'lük iki katmanın tamamını her karede çizmek kasıyordu) */
    var gx = Math.max(0, Math.floor(kamera.x - CW / 2 / kamera.z - 24)), gy = Math.max(0, Math.floor(kamera.y - CH / 2 / kamera.z - 24)),
        gw = Math.min(W - gx, Math.ceil(CW / kamera.z + 48)), gh = Math.min(H - gy, Math.ceil(CH / kamera.z + 48));
    if (gw > 0 && gh > 0) { ctx.drawImage(bcv, gx, gy, gw, gh, gx, gy, gw, gh); ctx.drawImage(tcv, gx, gy, gw, gh, gx, gy, gw, gh); }
    S.izler.forEach(function (z) {
      if (z.tip === "flas") { var g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r); g.addColorStop(0, "rgba(255,255,230," + z.o + ")"); g.addColorStop(0.4, "rgba(255,190,80," + z.o * 0.8 + ")"); g.addColorStop(1, "rgba(255,120,40,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill(); }
      else if (z.tip === "halka") { ctx.strokeStyle = "rgba(255,255,255," + z.o * 0.6 + ")"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y, z.r + (z.R - z.r) * (1 - z.o), 0, 7); ctx.stroke(); }
      else if (z.tip === "cizgi") { ctx.strokeStyle = "rgba(255,240,180," + z.o + ")"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(z.x0, z.y0); ctx.lineTo(z.x1, z.y1); ctx.stroke(); }
      else if (z.tip === "lazer") { ctx.strokeStyle = "rgba(120,255,255," + z.o * 0.5 + ")"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(z.x0, z.y0); ctx.lineTo(z.x1, z.y1); ctx.stroke(); ctx.strokeStyle = "rgba(255,255,255," + z.o + ")"; ctx.lineWidth = 2; ctx.stroke(); }
      else if (z.tip === "sopa") { ctx.strokeStyle = "rgba(255,255,255," + z.o + ")"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(z.x, z.y - 3, 22, z.a - 0.9, z.a + 0.4); ctx.stroke(); }
    });
    S.nesne.forEach(function (o) { nesneCiz(o, t); });
    tumKurt().forEach(function (k) { kurtCiz(k, t); });
    S.alev.forEach(function (f) { alevCiz(f, t); });
    if (mod === "hareket" && aktif) { izYolu(aktif); nisanCiz(aktif); }
    if ((mod === "tekrar" || mod === "canli") && aktif && nisan.var) nisanCiz(aktif);
    S.mermi.forEach(mermiCiz);
    S.parca.forEach(function (p) { var o = Math.max(0, Math.min(1, p.omur * 1.5)) * p.o; ctx.fillStyle = "rgba(" + p.renk + "," + o + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, p.b, 0, 7); ctx.fill(); });
    suCiz(t);
    tumKurt().forEach(etiketCiz);
    if (aktif && !aktif.olu && (mod === "hareket" || mod === "tekrar" || mod === "canli")) { var ay = aktif.y - 44 - Math.abs(Math.sin(t * 4)) * 5; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(aktif.x - 6, ay); ctx.lineTo(aktif.x + 6, ay); ctx.lineTo(aktif.x, ay + 7); ctx.fill(); }
    if (hedef && mod === "hareket") { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hedef.x, hedef.y, 14, 0, 7); ctx.moveTo(hedef.x - 20, hedef.y); ctx.lineTo(hedef.x + 20, hedef.y); ctx.moveTo(hedef.x, hedef.y - 20); ctx.lineTo(hedef.x, hedef.y + 20); ctx.stroke(); }
    S.yazi.forEach(function (y) { ctx.font = "900 15px Nunito, system-ui, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 3.5; ctx.strokeStyle = "rgba(20,10,30," + Math.min(1, y.o) * 0.8 + ")"; ctx.strokeText(y.t, y.x, y.y); ctx.fillStyle = y.renk; ctx.globalAlpha = Math.min(1, y.o); ctx.fillText(y.t, y.x, y.y); ctx.globalAlpha = 1; });
  }
  function nisanCiz(k) {
    var a = nisan.a, cx = k.x + Math.cos(a) * 48, cy = k.y - 3 + Math.sin(a) * 48;
    ctx.strokeStyle = "rgba(255,80,80,.95)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 7); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 3, cy); ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 10, cy); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy - 3); ctx.moveTo(cx, cy + 3); ctx.lineTo(cx, cy + 10); ctx.stroke();
    var w = SILAH[mod === "tekrar" && tekrarIs ? tekrarIs.atis.w : mod === "canli" ? canliW : silah];
    if (nisan.var && w && w.tip === "mermi") {
      for (var i = 0; i < 12; i++) { var f = i / 12; if (f > nisan.p) break; var rr = 2 + f * 5; ctx.fillStyle = "hsl(" + (60 - f * 60) + ",95%,55%)"; ctx.beginPath(); ctx.arc(k.x + Math.cos(a) * (16 + f * 60), k.y - 3 + Math.sin(a) * (16 + f * 60), rr, 0, 7); ctx.fill(); }
    }
  }

  /* ---------- döngü ---------- */
  var yuruYon = 0, adimT = 0;
  function dongu(ts) {
    requestAnimationFrame(dongu);
    var dt = sonT ? Math.min(0.05, (ts - sonT) / 1000) : 0.016; sonT = ts; saat += dt;
    var adim = 1 / 120, kalan = dt;
    while (kalan > 1e-6) {
      var h = Math.min(adim, kalan); kalan -= h;
      if (mod === "hareket" && aktif && !aktif.olu) yuruAdim(h);
      if (mod === "tekrar") tekrarAdim(h);
      if (mod === "canli") canliAdim(h);
      tumKurt().forEach(function (k) { if (!(mod === "tekrar" && k === aktif && tekrarIs && !tekrarIs.atesli) && !(mod === "canli" && k === aktif)) kurtAdim(k, h); });
      S.mermi.forEach(function (m) { mermiAdim(m, h); }); S.mermi = S.mermi.filter(function (m) { return !m.sil; });
      if (mod !== "yok") { nesneAdim(h); alevAdim(h); }
    }
    tumKurt().forEach(function (k) { if (k.yuruAn > 0) k.yuruAn -= dt; k.gor += (k.hp - k.gor) * Math.min(1, dt * 4); });
    if (mod === "atis" || (mod === "tekrar" && tekrarIs && tekrarIs.atesli)) cozumAdim(dt);
    if (mod === "hareket") canliGonder(false);
    efektAdim(dt);
    bulutlar.forEach(function (b) { b.x += (8 + S.ruzgar * 40) * b.s * dt; if (b.x > W + 200) b.x = -200; if (b.x < -220) b.x = W + 180; });
    kameraAdim(dt);
    ciz();
    if (Math.floor(saat * 4) !== Math.floor((saat - dt) * 4)) arayuzCan();
  }
  function yuruAdim(dt) {
    var k = aktif;
    if (k.hava || !yuruYon || enerji <= 0) return;
    k.yon = yuruYon; var dx = yuruYon * 58 * dt, nx = k.x + dx, ok = false;
    if (nx < 10 || nx > W - 10) return;
    for (var u = 0; u <= 8; u++) if (!carpisir(nx, k.y - u, R)) { k.x = nx; k.y -= u; ok = true; break; }
    if (!ok) return;
    var dus = 0; while (!carpisir(k.x, k.y + 1, R) && dus < 9) { k.y += 1; dus++; }
    if (dus >= 9) { k.hava = true; k.vx = yuruYon * 40; k.vy = 0; }
    enerji = Math.max(0, enerji - Math.abs(dx) * 0.38); k.yuruT = 1; k.yuruAn = 0.12;
    adimT += dt; if (adimT > 0.26) { adimT = 0; ses("adim"); }
    yolT += dt; if (yolT > 0.2) { yolT = 0; yol.push(Math.round(k.x), Math.round(k.y)); }
    if (!kamera.serbest) odakla(k.x, k.y - 40);
  }
  function zipla() { var k = aktif; if (mod !== "hareket" || !k || k.hava || enerji < 6) return; yol.push(Math.round(k.x), Math.round(k.y)); k.hava = true; k.vx = k.yon * 135; k.vy = -255; enerji -= 6; ses("zipla"); setTimeout(function () { if (aktif === k) yol.push(Math.round(k.x), Math.round(k.y)); }, 450); }
  function kameraAdim(dt) {
    if (kamera.serbest > 0) kamera.serbest -= dt;
    var odak = null;
    if (!kamera.serbest) {
      if (S.mermi.length) { var m = S.mermi[0]; odak = [m.x, m.y]; }
      else if (mod === "canli" && aktif) odak = [aktif.x, aktif.y - 40];
      else if ((mod === "tekrar" || mod === "atis") && aktif) { var hv = tumKurt().filter(function (k) { return k.hava && !k.olu; })[0]; odak = hv ? [hv.x, hv.y - 30] : null; }
      if (odak) { kamera.hx = odak[0]; kamera.hy = odak[1]; }
    }
    var f = Math.min(1, dt * (S.mermi.length ? 5 : 3));
    kamera.x += (kamera.hx - kamera.x) * f; kamera.y += (kamera.hy - kamera.y) * f; kamera.z += (kamera.hz - kamera.z) * Math.min(1, dt * 4);
    var yw = CW / 2 / kamera.z, yh = CH / 2 / kamera.z;
    kamera.x = Math.max(-100 + yw, Math.min(W + 100 - yw, kamera.x)); if (yw * 2 > W + 200) kamera.x = W / 2;
    kamera.y = Math.max(-300 + yh, Math.min(H + 50 - yh, kamera.y)); if (yh * 2 > H + 350) kamera.y = H / 2 - 100;
  }

  /* ---------- dokunma ---------- */
  var PT = {}, jest = null;
  function dunya(cx, cy) { return { x: (cx - CW / 2) / kamera.z + kamera.x, y: (cy - CH / 2) / kamera.z + kamera.y }; }
  function ekran(x, y) { return { x: (x - kamera.x) * kamera.z + CW / 2, y: (y - kamera.y) * kamera.z + CH / 2 }; }
  cv.addEventListener("pointerdown", function (e) {
    e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    PT[e.pointerId] = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY };
    var n = Object.keys(PT).length;
    if (n === 2) { var k = Object.keys(PT), a = PT[k[0]], b = PT[k[1]]; jest = { tip: "zoom", d: Math.hypot(a.x - b.x, a.y - b.y), z: kamera.hz }; nisan.var = false; return; }
    var w = SILAH[silah];
    if (mod === "hareket" && aktif && w.tip !== "hedef" && w.tip !== "birak" && w.tip !== "aninda") {
      var s = ekran(aktif.x, aktif.y);
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < 70) { jest = { tip: "nisan" }; nisan.var = true; nisanGuncelle(e.clientX, e.clientY); return; }
    }
    jest = { tip: "kaydir", x: e.clientX, y: e.clientY, hx: kamera.x, hy: kamera.y, tik: true };
  });
  cv.addEventListener("pointermove", function (e) {
    var p = PT[e.pointerId]; if (!p) return; p.x = e.clientX; p.y = e.clientY;
    if (!jest) return;
    if (jest.tip === "zoom") { var k = Object.keys(PT); if (k.length < 2) return; var a = PT[k[0]], b = PT[k[1]], d = Math.hypot(a.x - b.x, a.y - b.y); kamera.hz = jest.z * d / jest.d; zSinir(); kamera.z = kamera.hz; kamera.serbest = 3; return; }
    if (jest.tip === "nisan") { nisanGuncelle(e.clientX, e.clientY); return; }
    if (jest.tip === "kaydir") { var dx = e.clientX - jest.x, dy = e.clientY - jest.y; if (Math.hypot(dx, dy) > 8) jest.tik = false; kamera.hx = kamera.x = jest.hx - dx / kamera.z; kamera.hy = kamera.y = jest.hy - dy / kamera.z; kamera.serbest = 3.5; }
  });
  function birak(e) {
    var p = PT[e.pointerId]; delete PT[e.pointerId];
    if (!jest) return;
    if (jest.tip === "nisan") { jest = null; if (nisan.var && nisan.p > 0.06) { nisan.var = false; atesEt({ w: silah, a: r3(nisan.a), p: r3(nisan.p), f: fitil }); } else nisan.var = false; return; }
    if (jest.tip === "kaydir" && jest.tik && p && mod === "hareket" && SILAH[silah].tip === "hedef") { var w = dunya(p.x, p.y); hedefSec(w.x, w.y); }
    if (!Object.keys(PT).length) jest = null;
  }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  cv.addEventListener("pointerup", birak); cv.addEventListener("pointercancel", birak);
  cv.addEventListener("wheel", function (e) { e.preventDefault(); kamera.hz *= Math.pow(1.0015, -e.deltaY); zSinir(); kamera.serbest = 3; }, { passive: false });
  function nisanGuncelle(cx, cy) {
    var s = ekran(aktif.x, aktif.y - 3), dx = s.x - cx, dy = s.y - cy, L = Math.hypot(dx, dy);
    if (L < 6) return; nisan.a = Math.atan2(dy, dx); nisan.p = Math.min(1, L / 130); aktif.yon = Math.cos(nisan.a) >= 0 ? 1 : -1;
    if (SILAH[silah].tip !== "mermi") nisan.p = 1;
  }
  function hedefSec(x, y) {
    if (silah === "isinla") { if (carpisir(x, y, R + 1) || y > SU - 20 || x < 20 || x > W - 20) { D.msg("Oraya ışınlanamazsın."); return; } }
    if (silah === "hava" && (x < 0 || x > W)) return;
    hedef = { x: Math.round(x), y: Math.round(y) }; ses("sec"); arayuz();
  }
  /* tuşlar */
  function basili(el, yon) {
    el.addEventListener("pointerdown", function (e) { e.preventDefault(); yuruYon = yon; kamera.serbest = 0; try { el.setPointerCapture(e.pointerId); } catch (x) {} });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (ev) { el.addEventListener(ev, function () { if (yuruYon === yon) yuruYon = 0; }); });
  }
  basili($("bSol"), -1); basili($("bSag"), 1);
  $("bZipla").onclick = zipla;
  $("bPas").onclick = function () { if (mod === "hareket") atesEt({ w: "pas", a: 0, p: 0, f: 0 }); };
  $("bAtes").onclick = function () {
    if (mod !== "hareket") return; var w = SILAH[silah];
    if (w.tip === "birak" || w.tip === "aninda") atesEt({ w: silah, a: aktif.yon > 0 ? 0 : 3.142, p: 0, f: 5 });
    else if (w.tip === "hedef" && hedef) atesEt({ w: silah, a: 0, p: 0, f: 0, tx: hedef.x, ty: hedef.y });
  };
  addEventListener("keydown", function (e) {
    if (mod !== "hareket") return;
    if (e.key === "ArrowLeft") yuruYon = -1; else if (e.key === "ArrowRight") yuruYon = 1; else if (e.key === "ArrowUp" || e.key === " ") zipla();
  });
  addEventListener("keyup", function (e) { if (e.key === "ArrowLeft" || e.key === "ArrowRight") yuruYon = 0; });
  $("bSilah").onclick = function () { if (mod !== "hareket") return; silahGrid(); $("silahlar").hidden = false; ses("sec"); };
  $("silahKapat").onclick = function () { $("silahlar").hidden = true; };
  $("silahlar").addEventListener("click", function (e) { if (e.target === $("silahlar")) $("silahlar").hidden = true; });
  function silahGrid() {
    $("silahGrid").innerHTML = SILAH_SIRA.map(function (id) { var w = SILAH[id], c = kalanCephane(id); return '<button type="button" class="tps' + (id === silah ? " on" : "") + (c <= 0 ? " yok" : "") + '" data-w="' + id + '"' + (c <= 0 ? " disabled" : "") + '><span>' + w.ik + "</span><b>" + w.ad + "</b><small>" + (c === Infinity ? "∞" : c > 0 ? "×" + c : CEPHANE0[id] === 0 ? "📦 sandıktan" : "bitti") + "</small></button>"; }).join("");
  }
  $("silahGrid").addEventListener("click", function (e) { var b = e.target.closest ? e.target.closest("button[data-w]") : null; if (!b || b.disabled) return; silah = b.getAttribute("data-w"); hedef = null; $("silahlar").hidden = true; ses("sec"); arayuz(); });
  $("fitil").addEventListener("click", function (e) { var b = e.target.closest ? e.target.closest("button[data-f]") : null; if (!b) return; fitil = +b.getAttribute("data-f"); ses("sec"); arayuz(); });
  $("msg").addEventListener("click", function () { if (mod === "yazamadi" && G_ && G_._yaz) { mod = "yaziyor"; G_._yaz(); } });

  /* ---------- arayüz ---------- */
  function arayuzCan() {
    if (!G_) return;
    var a = ME, b = OTHER; if (!a) return;
    function top(u) { return (S.kurt[u] || []).reduce(function (s, k) { return s + Math.max(0, Math.round(k.gor)); }, 0); }
    var mx = (G_.adet || 4) * 100;
    $("canMe").style.width = Math.max(0, Math.min(100, top(a) / mx * 100)) + "%"; $("canMe").textContent = top(a);
    $("canOther").style.width = Math.max(0, Math.min(100, top(b) / mx * 100)) + "%"; $("canOther").textContent = top(b);
    $("canMe").style.background = takimRenk(a).ana; $("canOther").style.background = takimRenk(b).ana;
    $("enerjiBar").style.width = enerji + "%";
  }
  function arayuz() {
    var benim = mod === "hareket";
    $("kontrol").hidden = !benim; $("bResign").hidden = !G_ || G_.bitti || !benim;
    var r = S.ruzgar || 0; $("ruzgarBar").style.width = Math.abs(r) * 50 + "%"; $("ruzgarBar").style.left = r >= 0 ? "50%" : (50 - Math.abs(r) * 50) + "%"; $("ruzgarBar").className = r >= 0 ? "sag" : "sol";
    var t = "";
    if (!G_) t = "Bağlanıyor…";
    else if (G_.bitti && mod !== "tekrar") t = G_.kazanan === ME ? "Kazandın 🏆" : G_.kazanan ? "Kaybettin" : "Berabere";
    else if (mod === "tekrar" || mod === "canli" || mod === "canliBekle") t = (D.adlar[OTHER] || "Rakip") + " oynuyor…";
    else if (mod === "hareket") t = "Sıra sende · " + (aktif ? aktif.ad : "");
    else if (mod === "atis" || mod === "yaziyor") t = "…";
    else if (mod === "yazamadi") t = "Kaydedilemedi";
    else t = "Sıra " + (D.adlar[G_.sira] ? D.ekDe(D.adlar[G_.sira]) : "onda");
    $("turnTxt").textContent = t;
    var w = SILAH[silah]; $("silahIk").textContent = w.ik; $("silahAd").textContent = w.ad + (kalanCephane(silah) !== Infinity ? " ×" + kalanCephane(silah) : "");
    $("fitil").hidden = !w.fitil; [].forEach.call($("fitil").querySelectorAll("button"), function (b) { b.classList.toggle("on", +b.getAttribute("data-f") === fitil); });
    $("bAtes").hidden = !(w.tip === "birak" || w.tip === "aninda" || (w.tip === "hedef" && hedef));
    $("ipucu").textContent = !benim ? "" : w.tip === "hedef" ? (hedef ? "Hedef seçildi · Ateş!" : silah === "isinla" ? "Haritada gideceğin yere dokun" : silah === "gudumlu" ? "Füzenin gideceği yere dokun" : "Haritada vuracağın yere dokun") : w.tip === "aninda" ? "Herkesi sallar, 10 hasar · Ateş!" : w.koyun ? "Koyunu at, 5 sn yürüyüp patlar" : w.mayin ? "At; biri yaklaşınca patlar" : w.kazma ? "Kazmak istediğin yöne çek, bırak" : w.lazer ? "Hizadaki herkesi deler · çek, bırak" : w.yumruk ? "Yanındakini havaya uçurur · çek, bırak" : "Karakterini tut, geri çek, bırak";
    $("pMe").classList.toggle("on", benim); $("pOther").classList.toggle("on", mod === "tekrar" || mod === "canli" || (G_ && !G_.bitti && G_.sira === OTHER));
    arayuzCan();
  }
  $("bResign").onclick = function () { if (!G_ || G_.bitti) return; $("confirm").hidden = false; };
  $("confirmNo").onclick = function () { $("confirm").hidden = true; };
  $("confirmYes").onclick = function () {
    $("confirm").hidden = true; if (!G_ || G_.bitti) return; D.bitirenBenim = true;
    D.ref.set({ bitti: true, sonuc: "pes", kazanan: D.other, sira: "", v: (G_.v || 0) + 1, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () { D.bitirenBenim = false; D.msg("Olmadı, tekrar dene."); });
  };
  /* seçimler (başlangıç / bitiş kartı) */
  function secimCiz() {
    [].forEach.call(document.querySelectorAll("[data-adet-seg] button"), function (b) { b.classList.toggle("on", +b.getAttribute("data-adet") === seciliAdet); });
    [].forEach.call(document.querySelectorAll("[data-harita-seg] button"), function (b) { b.classList.toggle("on", b.getAttribute("data-harita") === seciliHarita); });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-adet-seg] button, [data-harita-seg] button") : null; if (!b) return;
    if (b.hasAttribute("data-adet")) seciliAdet = +b.getAttribute("data-adet"); else seciliHarita = b.getAttribute("data-harita");
    try { localStorage.setItem("tp_adet", String(seciliAdet)); localStorage.setItem("tp_harita", seciliHarita); } catch (x) {}
    secimCiz(); ses("sec");
  });
  secimCiz();
  /* bitiş kartı: tekrar bitince göster */
  var _bit = D.bitisGoster; D.bitisGoster = function () { if (mod === "tekrar" || mod === "canliBekle") { setTimeout(D.bitisGoster, 600); return; } _bit(); };
  requestAnimationFrame(dongu);
  arayuz();
  if (location.hash === "#test") window.__tp = {
    S: S, durum: function () { return { mod: mod, aktif: aktif ? [aktif.u, aktif.i, Math.round(aktif.x), Math.round(aktif.y)] : null, G: G_ ? JSON.parse(JSON.stringify(G_, function (k, v) { return k === "_yaz" ? undefined : v; })) : null, me: ME, kc: S.kraterler.length / 3, enerji: enerji, silah: silah, kurtlar: tumKurt().map(function (k) { return [k.u === ME ? "ben" : "o", k.i, Math.round(k.x), Math.round(k.y), k.hp, k.olu]; }) }; },
    ates: function (w, a, p, f, tx, ty) { if (SILAH[w]) silah = w; if (tx !== undefined) hedef = { x: tx, y: ty }; atesEt({ w: w, a: a, p: p, f: f || 3, tx: tx, ty: ty }); },
    yuru: function (y, sn) { yuruYon = y; setTimeout(function () { yuruYon = 0; }, sn * 1000); }, zipla: zipla, kamera: kamera, solid: solid, tcv: tcv, bcv: bcv, ekran: ekran,
    nisan: function (a, p) { nisan.a = a; nisan.p = p; nisan.var = true; }, odakla: odakla, yeni: D.yeniOyun,
    ver: function (w, n) { var c = S.cephane[ME] = S.cephane[ME] || {}; c[w] = n; arayuz(); },
    sandikAt: function (dx, tur) { var k = aktif; S.nesne.push(nesneYukle([{ t: "sandik", s: tur || "silah", w: "karpuz", n: 2, x: k.x + dx, y: k.y - 200 }])[0]); },
    nesne: function () { return S.nesne.map(function (o) { return [o.t, o.s, o.w, Math.round(o.x), Math.round(o.y), o.yer]; }); }, alev: function () { return S.alev.length; }, kalan: function (w) { return kalanCephane(w); },
    hedefKurt: function () { var o = canli(OTHER)[0]; return o ? [o.x, o.y] : null; }
  };
})();
