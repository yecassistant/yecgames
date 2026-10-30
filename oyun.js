/* Bahçe Planı – bahçe planı (8×8), blok bulmaca.
   Parçaları yerleştirdikçe çiçekler birbirine sarmaşıkla bağlanır; satır/sütun dolunca "açar" ve temizlenir.
   1019p: blok oyunu hissi – parça parmakla büyüyerek kalkar, plana gölgesi düşer, dolacak satır/sütun önceden parlar,
   yerleşince hücreler sırayla "tık" diye oturur, temizlenen hatlar ortadan dışa dalga gibi açılıp yaprak saçar,
   puan sayarak artar, art arda temizlemede "Kombo" serisi, sığmayan parça tepsiye geri süzülür, oyun sonu plan solar.
   Ses: yumuşak, kısa tonlar (sağ alttaki düğmeyle kapanır, "sef_ses"). Kayıt anahtarları aynı: sef_best. */
(function () {
  "use strict";
  var N = 8, grid = [], score = 0, shown = 0, moves = 0, best = 0, tray = [], selected = -1, cellPx = 36, gap = 3, PAD = 6;
  var combo = 0, sonTemiz = -9, kilit = false, bitti = false, gold = [], hakYenile = 1, hakDondur = 2, rekorDendi = false, best0 = 0, sonHakPuan = 0;
  var $ = function (id) { return document.getElementById(id); };
  var board = $("board"), vines = $("vines"), trayEl = $("tray"), msgEl = $("gmsg"), scoreEl = $("score"), bestEl = $("best"), over = $("over"), wrapEl = board.parentNode;
  var fx = document.createElement("div"); fx.className = "sfx"; fx.setAttribute("aria-hidden", "true"); wrapEl.appendChild(fx);
  var FL = {   /* çiçek: svg anahtarı, adı, en/boy oranı, yaprak rengi */
    lav:  { key: "lav",  ad: "Lavanta",  w: 0.46, h: 0.96, emo: "💜", c: ["#b9a1ea", "#9b7fd1"] },
    peo:  { key: "peo",  ad: "Şakayık",  w: 0.92, h: 0.92, emo: "🌸", c: ["#f7a9c4", "#ec6f9a"] },
    lil:  { key: "lil",  ad: "Lilyum",   w: 0.92, h: 0.92, emo: "🌼", c: ["#ffd56b", "#f6b93b"] },
    pink: { key: "lil2", ad: "Beyaz lilyum", w: 0.92, h: 0.92, emo: "🤍", c: ["#ffffff", "#fbd3e0"] },
    leaf: { key: "peo3", ad: "Şeftali şakayık", w: 0.92, h: 0.92, emo: "🍑", c: ["#fbb98c", "#f59a6b"] }
  };
  var COLORS = ["lav", "peo", "lil", "pink", "leaf"];
  var SHAPES = [
    [[0, 0]],
    [[0, 0], [0, 1]], [[0, 0], [1, 0]],
    [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
    [[0, 0], [0, 1], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 0]], [[0, 0], [0, 1], [1, 1]], [[0, 1], [1, 0], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [0, 1], [1, 0], [2, 0]], [[0, 0], [0, 1], [1, 1], [2, 1]], [[0, 1], [1, 1], [2, 1], [2, 0]],
    [[0, 0], [0, 1], [0, 2], [1, 1]], [[0, 1], [1, 0], [1, 1], [1, 2]], [[0, 0], [1, 0], [1, 1], [2, 0]], [[0, 1], [1, 0], [1, 1], [2, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]], [[0, 1], [0, 2], [1, 0], [1, 1]]
  ];
  var CLEAR = ["açtı 🏗️", "sırası tamam, mimari onay ✓", "hizaya girdi, statik tuttu 📐", "dizildi; ruhsat çıktı 😅", "tamam, şantiye tertemiz"];
  var NOPE = ["Oraya sığmaz", "Kolon çakıştı 😅", "Kat planı uymuyor", "Mimar bakışıyla tekrar dene"];
  var PLACE = ["Yerleşti.", "Güzel.", "Tam oturdu.", "Devam.", "Plan büyüyor."];
  var KOMBO = ["Kombo", "Süper", "Harika", "Muhteşem", "Efsane"];
  var OVGU = ["", "Güzel!", "Harika!", "Muhteşem!", "Efsane!", "Efsane!"];
  /* parça ağırlıkları: küçük ve orta parçalar daha sık gelir (oyun akıcı olsun), büyükler ara sıra */
  var AGIRLIK = [6, 8, 8, 7, 7, 4, 4, 2, 2, 6, 2, 7, 7, 7, 7, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3];
  var TOPLAM_AG = AGIRLIK.reduce(function (a, b) { return a + b; }, 0);
  function agirlikliSekil() { var r = Math.random() * TOPLAM_AG; for (var i = 0; i < SHAPES.length; i++) { r -= AGIRLIK[i]; if (r < 0) return SHAPES[i]; } return SHAPES[0]; }
  function dondurSekil(sh) { var maxR = 0; sh.forEach(function (q) { if (q[0] > maxR) maxR = q[0]; }); var out = sh.map(function (q) { return [q[1], maxR - q[0]]; }); out.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }); return out; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function burst(n) { try { if (window.__burst) window.__burst(n); } catch (e) {} }
  function flowerImg(color, size) {
    var f = FL[color];
    if (!window.__flower) return null;
    var img = window.__flower(f.key, Math.round(size * f.w), Math.round(size * f.h));
    img.className = "fl"; return img;
  }
  function azalt() { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }

  /* ---------- ses: yumuşak tonlar (Web Audio; ilk dokunuşta açılır) ---------- */
  var Ses = (function () {
    var AC = window.AudioContext || window.webkitAudioContext, ctx = null, master = null, on = true;
    try { on = localStorage.getItem("sef_ses") !== "0"; } catch (e) {}
    function init() { if (ctx || !AC) return; try { try { ctx = new AC({ latencyHint: "interactive" }); } catch (e1) { ctx = new AC(); } master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination); } catch (e) { ctx = null; } }
    function unlock() { if (!on) return; init(); if (ctx && ctx.state !== "running") try { ctx.resume(); } catch (e) {} }
    ["pointerdown", "touchend", "click"].forEach(function (ev) { addEventListener(ev, unlock, { passive: true, capture: true }); });
    function ton(hz, t, dur, peak, type) {
      var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || "sine"; o.frequency.setValueAtTime(hz, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
    }
    var PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
    return {
      on: function () { return on; },
      toggle: function () { on = !on; try { localStorage.setItem("sef_ses", on ? "1" : "0"); } catch (e) {} if (on) unlock(); return on; },
      play: function (n, k) {
        if (!on || !ctx || ctx.state !== "running") return; var t = ctx.currentTime + 0.005;
        try {
          if (n === "al") ton(660, t, 0.08, 0.08, "triangle");
          else if (n === "koy") { ton(196 + (k || 0) * 6, t, 0.16, 0.22, "sine"); ton(392, t, 0.05, 0.05, "triangle"); }
          else if (n === "yok") { ton(220, t, 0.09, 0.1, "triangle"); ton(185, t + 0.07, 0.12, 0.08, "triangle"); }
          else if (n === "temiz") { var s = Math.min(3, (k || 1) - 1); for (var i = 0; i < 4 + s; i++) ton(PENTA[(i + s) % PENTA.length], t + i * 0.055, 0.32, 0.12, "sine"); }
          else if (n === "kombo") { for (var j = 0; j < 3; j++) ton(PENTA[Math.min(7, 3 + j + Math.min(2, k || 0))] * (j === 2 ? 1 : 1), t + j * 0.07, 0.4, 0.1, "triangle"); }
          else if (n === "bitti") { [523.25, 440, 392, 329.63].forEach(function (f, i) { ton(f, t + i * 0.12, 0.35, 0.1, "sine"); }); }
          else if (n === "rekor") { [659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) { ton(f, t + i * 0.09, 0.4, 0.1, "triangle"); }); }
        } catch (e) {}
      }
    };
  })();
  function snd(n, k) { Ses.play(n, k); }

  try { best = +localStorage.getItem("sef_best") || 0; } catch (e) {}
  bestEl.textContent = best;

  /* ---------- ölçü ---------- */
  function measure() {
    var stage = wrapEl.parentNode;
    var w = Math.min(wrapEl.clientWidth, 400);
    var byW = Math.floor((w - PAD * 2 - gap * (N - 1)) / N);
    /* üst bar + tepsi + mesaj satırı + boşluklar ölçülür; kalan yükseklik plana verilir → tek ekran, kaydırma yok */
    var used = 0;
    try {
      var cs = getComputedStyle(stage), bs = getComputedStyle(document.body);
      used += (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) + (parseFloat(bs.paddingTop) || 0) + (parseFloat(bs.paddingBottom) || 0);
      var g = parseFloat(cs.rowGap || cs.gap); if (isNaN(g)) g = 10;
      var kids = stage.children, n = 0;
      for (var k = 0; k < kids.length; k++) { n++; if (kids[k] !== wrapEl) used += kids[k].offsetHeight; }
      used += g * (n - 1);
    } catch (e) { used = 48 + 84 + 40 + 52; }
    var vh = (window.visualViewport && window.visualViewport.height) || innerHeight;
    var byH = Math.floor((vh - used - PAD * 2 - gap * (N - 1)) / N);
    cellPx = Math.max(22, Math.min(byW, byH, 48));
    var inner = cellPx * N + gap * (N - 1);
    board.style.width = (inner + PAD * 2) + "px";
    var cells = board.children;
    for (var i = 0; i < cells.length; i++) { cells[i].style.width = cellPx + "px"; cells[i].style.height = cellPx + "px"; }
    vines.setAttribute("viewBox", "0 0 " + inner + " " + inner);
    vines.style.width = inner + "px"; vines.style.height = inner + "px";
  }

  /* ---------- plan ---------- */
  function buildBoard() {
    board.innerHTML = ""; grid = [];
    for (var r = 0; r < N; r++) {
      grid.push([]);
      for (var c = 0; c < N; c++) {
        grid[r].push(0); if (c === 0) gold[r] = []; gold[r][c] = 0;
        var d = document.createElement("div"); d.className = "cell"; d.dataset.r = r; d.dataset.c = c; d.dataset.v = "";
        board.appendChild(d);
      }
    }
    measure();
  }
  function cellEl(r, c) { return board.children[r * N + c]; }
  function paint() {
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var el = cellEl(r, c), v = grid[r][c] || "";
      if (v && el.className.indexOf("bloom") >= 0) { el.classList.remove("bloom"); el.style.animationDelay = ""; }
      if (el.dataset.v !== v) {
        el.dataset.v = v; el.innerHTML = "";
        if (v) { var img = flowerImg(v, cellPx); if (img) el.appendChild(img); }
      }
      var cls = "cell" + (v ? " f-" + v + " dolu" : "");
      if (el.className.indexOf(" yeni") >= 0 && v) cls += " yeni";
      if (bitti && v) cls += " sol";
      if (v && gold[r][c]) cls += " altin";
      if (el.className !== cls) el.className = cls;
    }
    drawVines();
  }
  /* sarmaşık: yan yana duran çiçeklerin arasına sap + yaprak */
  function drawVines() {
    var s = cellPx + gap, half = cellPx / 2, d = "", leaves = "", k = 0.62;
    function center(r, c) { return [c * s + half, r * s + half]; }
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      if (!grid[r][c]) continue;
      if (c + 1 < N && grid[r][c + 1]) {
        var a = center(r, c), b = center(r, c + 1), mxh = (a[0] + b[0]) / 2, my = a[1] - half * 0.42;
        d += "M" + (a[0] + half * k) + " " + a[1] + " Q" + mxh + " " + my + " " + (b[0] - half * k) + " " + b[1] + " ";
        leaves += "<ellipse cx='" + mxh + "' cy='" + (my + half * 0.16) + "' rx='" + (half * 0.3) + "' ry='" + (half * 0.15) + "' transform='rotate(-28 " + mxh + " " + (my + half * 0.16) + ")'/>";
      }
      if (r + 1 < N && grid[r + 1][c]) {
        var a2 = center(r, c), b2 = center(r + 1, c), myv = (a2[1] + b2[1]) / 2, mx = a2[0] + half * 0.42;
        d += "M" + a2[0] + " " + (a2[1] + half * k) + " Q" + mx + " " + myv + " " + b2[0] + " " + (b2[1] - half * k) + " ";
        leaves += "<ellipse cx='" + (mx - half * 0.16) + "' cy='" + myv + "' rx='" + (half * 0.15) + "' ry='" + (half * 0.3) + "' transform='rotate(-28 " + (mx - half * 0.16) + " " + myv + ")'/>";
      }
    }
    vines.innerHTML = d ? "<path d='" + d + "' fill='none' stroke='#5f9a70' stroke-width='3' stroke-linecap='round' opacity='.9'/><g fill='#8cc29b' opacity='.95'>" + leaves + "</g>" : "";
  }
  function canPlace(shape, r0, c0) {
    for (var i = 0; i < shape.length; i++) {
      var r = r0 + shape[i][0], c = c0 + shape[i][1];
      if (r < 0 || c < 0 || r >= N || c >= N || grid[r][c]) return false;
    }
    return true;
  }
  function anyFits(shape) {
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (canPlace(shape, r, c)) return true;
    return false;
  }
  /* bu parça buraya konunca dolacak satır/sütunlar */
  function dolacak(shape, r0, c0) {
    var tmp = {}, rows = [], cols = [], r, c;
    shape.forEach(function (s) { tmp[(r0 + s[0]) + "," + (c0 + s[1])] = 1; });
    for (r = 0; r < N; r++) { var f = true; for (c = 0; c < N; c++) if (!grid[r][c] && !tmp[r + "," + c]) { f = false; break; } if (f) rows.push(r); }
    for (c = 0; c < N; c++) { var g = true; for (r = 0; r < N; r++) if (!grid[r][c] && !tmp[r + "," + c]) { g = false; break; } if (g) cols.push(c); }
    return { rows: rows, cols: cols };
  }
  var onizleKey = "";
  function preview(p, r0, c0) {
    var ok = canPlace(p.shape, r0, c0), key = r0 + "," + c0 + "," + ok;
    if (key === onizleKey) return; onizleKey = key;
    clearPreview(true);
    for (var i = 0; i < p.shape.length; i++) {
      var r = r0 + p.shape[i][0], c = c0 + p.shape[i][1];
      if (r < 0 || c < 0 || r >= N || c >= N) continue;
      var el = cellEl(r, c); el.classList.add(ok ? "ok" : "bad");
      if (ok) { var im = flowerImg(p.color, cellPx); if (im) { im.className = "fl prev"; el.appendChild(im); } el.classList.add("pf-" + p.color); }
    }
    if (ok) {
      var d = dolacak(p.shape, r0, c0);
      d.rows.forEach(function (rr) { for (var cc = 0; cc < N; cc++) cellEl(rr, cc).classList.add("parla"); });
      d.cols.forEach(function (cc) { for (var rr = 0; rr < N; rr++) cellEl(rr, cc).classList.add("parla"); });
    }
  }
  function clearPreview(keepKey) {
    if (!keepKey) onizleKey = "";
    var cells = board.children;
    for (var i = 0; i < cells.length; i++) {
      var el = cells[i];
      if (el.className.indexOf("ok") < 0 && el.className.indexOf("bad") < 0 && el.className.indexOf("parla") < 0 && el.className.indexOf("pf-") < 0) continue;
      el.classList.remove("ok", "bad", "parla", "pf-lav", "pf-peo", "pf-lil", "pf-pink", "pf-leaf");
      var pv = el.querySelector(".prev"); if (pv) el.removeChild(pv);
    }
  }
  /* yerleştirilen parçanın komşularında aynı çiçek varsa sarmaşık bonusu */
  function vineBonus(shape, r0, c0, color) {
    var n = 0, seen = {};
    shape.forEach(function (s) {
      var r = r0 + s[0], c = c0 + s[1];
      [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(function (q) {
        var k = q[0] + "," + q[1];
        if (q[0] >= 0 && q[1] >= 0 && q[0] < N && q[1] < N && grid[q[0]][q[1]] === color && !seen[k]) { seen[k] = 1; n++; }
      });
    });
    return n;
  }

  /* ---------- efektler ---------- */
  function hucreMerkez(r, c) { return [PAD + c * (cellPx + gap) + cellPx / 2, PAD + r * (cellPx + gap) + cellPx / 2]; }
  function fxPos() { var b = board.getBoundingClientRect(), w = wrapEl.getBoundingClientRect(); return [b.left - w.left, b.top - w.top]; }
  function yazi(t, x, y, cls) {
    var o = fxPos(), el = document.createElement("div"); el.className = "sfxt " + (cls || ""); el.textContent = t;
    el.style.left = (o[0] + x) + "px"; el.style.top = (o[1] + y) + "px"; fx.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1300);
  }
  function yapraklar(list, color) {
    if (azalt()) return;
    var o = fxPos(), cols = FL[color] ? FL[color].c : ["#f7a9c4", "#ec6f9a"], n = 0;
    list.forEach(function (rc, i) {
      if (n > 44 || i % 2) return;
      var m = hucreMerkez(rc[0], rc[1]);
      for (var k = 0; k < 2; k++) {
        n++;
        var p = document.createElement("i"); p.className = "sfxp";
        var a = Math.random() * 6.283, d = cellPx * (0.9 + Math.random() * 1.4);
        p.style.left = (o[0] + m[0]) + "px"; p.style.top = (o[1] + m[1]) + "px"; p.style.background = cols[k % 2];
        p.style.setProperty("--dx", Math.round(Math.cos(a) * d) + "px"); p.style.setProperty("--dy", Math.round(Math.sin(a) * d - cellPx * 0.6) + "px");
        p.style.setProperty("--r", Math.round(Math.random() * 360) + "deg"); p.style.animationDelay = (rc[2] || 0) + "ms";
        fx.appendChild(p);
        (function (pp) { setTimeout(function () { if (pp.parentNode) pp.parentNode.removeChild(pp); }, 1100 + (rc[2] || 0)); })(p);
      }
    });
  }
  var sayT = 0;
  function puanYaz() {
    cancelAnimationFrame(sayT);
    var from = shown, to = score, t0 = 0;
    if (to - from <= 0 || azalt()) { shown = to; scoreEl.textContent = to; return; }
    scoreEl.parentNode.classList.remove("artti"); void scoreEl.offsetWidth; scoreEl.parentNode.classList.add("artti");
    function f(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 420); k = 1 - (1 - k) * (1 - k); shown = Math.round(from + (to - from) * k); scoreEl.textContent = shown; if (k < 1) sayT = requestAnimationFrame(f); }
    sayT = requestAnimationFrame(f);
  }

  function place(idx, r0, c0) {
    var p = tray[idx];
    if (bitti) return false;
    if (!p || !canPlace(p.shape, r0, c0)) { msg(pick(NOPE)); snd("yok"); return false; }
    var bonus = vineBonus(p.shape, r0, c0, p.color);
    for (var i = 0; i < p.shape.length; i++) { grid[r0 + p.shape[i][0]][c0 + p.shape[i][1]] = p.color; gold[r0 + p.shape[i][0]][c0 + p.shape[i][1]] = p.altin === i ? 1 : 0; }
    var koyPuan = p.shape.length * 10 + bonus * 5;
    score += koyPuan; moves++;
    tray[idx] = null; selected = -1;
    clearPreview(); paint();
    /* yerleşme: hücreler sırayla tık diye oturur */
    p.shape.forEach(function (s, j) { var el = cellEl(r0 + s[0], c0 + s[1]); el.classList.remove("yeni"); void el.offsetWidth; el.style.animationDelay = (j * 14) + "ms"; el.classList.add("yeni"); });
    setTimeout(function () { p.shape.forEach(function (s) { var el = cellEl(r0 + s[0], c0 + s[1]); el.classList.remove("yeni"); el.style.animationDelay = ""; }); }, 360);
    snd("koy", p.shape.length);
    renderTray();
    var merkez = [0, 0]; p.shape.forEach(function (s) { merkez[0] += r0 + s[0]; merkez[1] += c0 + s[1]; }); merkez[0] /= p.shape.length; merkez[1] /= p.shape.length;
    var mb = hucreMerkez(merkez[0], merkez[1]);
    var cleared = clearLines(merkez);
    if (cleared.n) {
      combo = moves - sonTemiz <= 3 ? combo + 1 : 1; sonTemiz = moves;
      /* satır puanı: 1 hat 100, 2 hat 300, 3 hat 600, 4 hat 1000 … × kombo; altın çiçek ×2; plan tamamen boşaldıysa +1500 */
      var kazan = 50 * cleared.n * (cleared.n + 1) * Math.max(1, combo);
      if (cleared.altin) kazan *= 2;
      var bos = grid.every(function (row) { return row.every(function (v) { return !v; }); });
      if (bos) kazan += 1500;
      score += kazan;
      var m = hucreMerkez(cleared.cy, cleared.cx);
      yazi("+" + (kazan + koyPuan), m[0], m[1], cleared.n > 1 || combo > 2 ? "buyuk" : "");
      var orta = hucreMerkez((N - 1) / 2, (N - 1) / 2);
      var baslik = bos ? "Tertemiz plan! +1500" : cleared.altin ? "Altın çiçek ×2 ✨" : combo > 1 ? KOMBO[Math.min(KOMBO.length - 1, combo - 2)] + " ×" + combo : cleared.n > 1 ? OVGU[Math.min(5, cleared.n)] : "";
      if (baslik) setTimeout(function () { yazi(baslik, orta[0], orta[1] - cellPx, "kombo"); snd("kombo", combo); }, 120);
      if ((cleared.n > 1 || bos) && !azalt()) { board.classList.remove("sars"); void board.offsetWidth; board.classList.add("sars"); }
      msg(FL[cleared.color].ad + (cleared.n > 1 ? " ×" + cleared.n : "") + " " + pick(CLEAR) + " " + FL[cleared.color].emo);
      snd("temiz", cleared.n);
      burst(10 + cleared.n * 8 + (bos ? 30 : 0));
      /* hak kazanma: 3'lü kombo → +1 yenile, her 2 hat birden → +1 döndür */
      if (combo > 0 && combo % 3 === 0) { hakYenile++; setTimeout(function () { yazi("+1 Yenile 🔄", orta[0], orta[1] + cellPx, "kucuk"); }, 500); }
      if (cleared.n >= 2) { hakDondur++; setTimeout(function () { yazi("+1 Döndür ⟳", orta[0], orta[1] + cellPx * 1.8, "kucuk"); }, 650); }
    } else {
      if (moves - sonTemiz > 3) combo = 0;
      yazi("+" + koyPuan, mb[0], mb[1], "kucuk");
      if (bonus) msg("Sarmaşık bağlandı, +" + bonus * 5 + " 🌿");
      else if (moves === 1) msg("Yan yana gelen çiçekleri sarmaşık bağlar 🌿");
      else msg(pick(PLACE));
    }
    /* her 2500 puanda bir +1 yenile */
    while (score - sonHakPuan >= 2500) { sonHakPuan += 2500; hakYenile++; }
    if (!rekorDendi && best0 > 0 && score > best0) { rekorDendi = true; var o2 = hucreMerkez((N - 1) / 2, (N - 1) / 2); setTimeout(function () { yazi("Yeni rekor! 🏆", o2[0], o2[1] + cellPx * 0.6, "kombo rekor"); snd("rekor"); burst(40); }, cleared.n ? 700 : 150); }
    puanYaz(); kombogoster(); haklar();
    if (!tray[0] && !tray[1] && !tray[2]) setTimeout(function () { if (!bitti) { fillTray(true); checkOver(); } }, cleared.n ? 260 : 120);
    else checkOver();
    return true;
  }
  /* dolu satır/sütunlar: yerleşen parçanın ortasından dışa doğru dalga gibi açılır */
  function clearLines(merkez) {
    var rows = [], cols = [], r, c, count = {}, top = "peo", topN = 0, list = [], seen = {}, altin = false;
    for (r = 0; r < N; r++) { var full = true; for (c = 0; c < N; c++) if (!grid[r][c]) { full = false; break; } if (full) rows.push(r); }
    for (c = 0; c < N; c++) { var fullc = true; for (r = 0; r < N; r++) if (!grid[r][c]) { fullc = false; break; } if (fullc) cols.push(c); }
    if (!rows.length && !cols.length) return { n: 0 };
    function take(rr, cc) {
      var k = rr + "," + cc; if (seen[k]) return; seen[k] = 1;
      var v = grid[rr][cc]; if (v) { count[v] = (count[v] || 0) + 1; if (count[v] > topN) { topN = count[v]; top = v; } }
      var dly = Math.round(Math.sqrt((rr - merkez[0]) * (rr - merkez[0]) + (cc - merkez[1]) * (cc - merkez[1])) * 24);
      if (gold[rr][cc]) altin = true;
      list.push([rr, cc, dly]);
    }
    rows.forEach(function (rr) { for (var cc = 0; cc < N; cc++) take(rr, cc); });
    cols.forEach(function (cc) { for (var rr = 0; rr < N; rr++) take(rr, cc); });
    var maxD = 0, cy = 0, cx = 0;
    list.forEach(function (x) { var el = cellEl(x[0], x[1]); el.style.animationDelay = x[2] + "ms"; el.classList.remove("yeni"); el.classList.add("bloom"); if (x[2] > maxD) maxD = x[2]; grid[x[0]][x[1]] = 0; gold[x[0]][x[1]] = 0; });
    rows.forEach(function (rr) { cy += rr; cx += (N - 1) / 2; }); cols.forEach(function (cc) { cy += (N - 1) / 2; cx += cc; });
    yapraklar(list, top); drawVines();
    /* animasyon bitince boşalan hücreler yenilenir; bu arada oynamaya devam edilebilir (kilit yok) */
    setTimeout(function () {
      list.forEach(function (x) { var el = cellEl(x[0], x[1]); el.classList.remove("bloom"); el.style.animationDelay = ""; if (!grid[x[0]][x[1]]) el.dataset.v = "~"; });
      paint(); renderTray();
    }, maxD + 300);
    var n = rows.length + cols.length, ort = (N - 1) / 2;
    return { n: n, color: top, cy: cy / n, cx: cx / n, altin: altin };
  }
  function dondurSigar(p) { var sh = p.shape; for (var k = 0; k < 3; k++) { sh = dondurSekil(sh); if (anyFits(sh)) return true; } return false; }
  function checkOver() {
    var any = false;
    tray.forEach(function (p) { if (p && anyFits(p.shape)) any = true; });
    if (any || bitti) { haklar(); return; }
    var dondurIse = hakDondur > 0 && tray.some(function (p) { return p && dondurSigar(p); });
    if (hakYenile > 0 || dondurIse) { msg(dondurIse ? "Sığmıyor ama döndürünce sığar ⟳ Parçayı seç, Döndür'e bas" : "Sığacak yer yok — Yenile'ye bas, yeni parçalar gelsin 🔄"); haklar(true); return; }
    bitti = true;
    var rekor = score > best0 && score > 0;
    if (score > best) { best = score; try { localStorage.setItem("sef_best", String(best)); } catch (e) {} bestEl.textContent = best; }
    $("overScore").textContent = score;
    $("overText").textContent = (rekor ? "Yeni rekor! " : "") + (score > 6000 ? "Bu bahçe onaylandı. Tebrikler 🏗️" : score > 2500 ? "Fena değil, mimar gözü belli 😅" : "Isınma turuydu. Bir daha?");
    msg("Sığacak yer kalmadı…");
    /* plan satır satır solar, sonra kart */
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { var el = cellEl(r, c); if (grid[r][c]) { el.style.animationDelay = (r * 60 + c * 12) + "ms"; el.classList.add("sol"); } }
    setTimeout(function () { snd(rekor ? "rekor" : "bitti"); }, 300);
    setTimeout(function () { over.hidden = false; burst(rekor ? 60 : 30); }, azalt() ? 200 : 1100);
  }
  function msg(t) { msgEl.textContent = t; }

  /* ---------- tepsi ---------- */
  function newPiece() { var sh = agirlikliSekil(), p = { shape: sh, color: pick(COLORS) }; if (Math.random() < 0.12) p.altin = Math.floor(Math.random() * sh.length); return p; }
  /* üç parça sırayla yerleştirilebiliyor mu? (satır temizleme dahil, ilk sığan yere koyarak; 6 sıralamadan biri yeterli) */
  function hepsiSigar(ps) {
    var sira = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    for (var k = 0; k < sira.length; k++) {
      var g = grid.map(function (row) { return row.slice(); }), ok = true;
      for (var j = 0; j < 3 && ok; j++) {
        var sh = ps[sira[k][j]].shape, yer = null;
        for (var r = 0; r < N && !yer; r++) for (var c = 0; c < N && !yer; c++) { var t = true; for (var q = 0; q < sh.length; q++) { var rr = r + sh[q][0], cc = c + sh[q][1]; if (rr >= N || cc >= N || g[rr][cc]) { t = false; break; } } if (t) yer = [r, c]; }
        if (!yer) { ok = false; break; }
        sh.forEach(function (q) { g[yer[0] + q[0]][yer[1] + q[1]] = 1; });
        var fr = [], fc = [];
        for (var a = 0; a < N; a++) { if (g[a].every(Boolean)) fr.push(a); var col = true; for (var b = 0; b < N; b++) if (!g[b][a]) { col = false; break; } if (col) fc.push(a); }
        fr.forEach(function (a) { for (var b = 0; b < N; b++) g[a][b] = 0; }); fc.forEach(function (a) { for (var b = 0; b < N; b++) g[b][a] = 0; });
      }
      if (ok) return true;
    }
    return false;
  }
  function fillTray(anim) {
    /* üçü de sığacak bir set ara (akıcı oyun); bulamazsa en az biri sığan set */
    var yedek = null;
    for (var d = 0; d < 40; d++) {
      var t = [newPiece(), newPiece(), newPiece()];
      if (hepsiSigar(t)) { tray = t; yedek = null; break; }
      if (!yedek && t.some(function (p) { return anyFits(p.shape); })) yedek = t;
      tray = t;
    }
    if (yedek) tray = yedek;
    renderTray(anim);
  }
  function pieceNode(p, mini) {
    var rows = 0, cols = 0;
    p.shape.forEach(function (s) { rows = Math.max(rows, s[0] + 1); cols = Math.max(cols, s[1] + 1); });
    var size = mini ? miniSize(p) : cellPx;
    var g = mini ? 2 : gap;
    var el = document.createElement("div"); el.className = "piece";
    el.style.width = (cols * size + (cols - 1) * g) + "px"; el.style.height = (rows * size + (rows - 1) * g) + "px";
    p.shape.forEach(function (s) {
      var d = document.createElement("i"); d.className = "f-" + p.color + (p.altin === p.shape.indexOf(s) ? " altin" : "");
      d.style.width = size + "px"; d.style.height = size + "px"; d.style.left = (s[1] * (size + g)) + "px"; d.style.top = (s[0] * (size + g)) + "px";
      var img = flowerImg(p.color, size); if (img) d.appendChild(img);
      el.appendChild(d);
    });
    return el;
  }
  function miniSize(p) {
    var rows = 0, cols = 0; p.shape.forEach(function (s) { rows = Math.max(rows, s[0] + 1); cols = Math.max(cols, s[1] + 1); });
    var slotW = Math.max(60, (trayEl.clientWidth - 24) / 3 - 8), byFit = Math.floor((slotW - (cols - 1) * 2) / cols);
    return Math.max(12, Math.min(26, Math.floor(cellPx * 0.62), byFit, Math.floor((72 - (rows - 1) * 2) / rows)));
  }
  function renderTray(anim) {
    trayEl.innerHTML = "";
    tray.forEach(function (p, i) {
      var slot = document.createElement("div"); slot.className = "slot" + (i === selected ? " sel" : "");
      if (p) {
        var node = pieceNode(p, true); node.dataset.i = i; slot.appendChild(node);
        if (!anyFits(p.shape)) slot.classList.add("dead");
        if (anim && !azalt()) { node.classList.add("gelir"); node.style.animationDelay = (i * 70) + "ms"; }
      }
      trayEl.appendChild(slot);
    });
  }

  /* ---------- sürükle / dokun ---------- */
  var drag = null;
  function cellFromPoint(x, y) {
    var rect = board.getBoundingClientRect();
    return { r: Math.round((y - rect.top - PAD - cellPx / 2) / (cellPx + gap)), c: Math.round((x - rect.left - PAD - cellPx / 2) / (cellPx + gap)) };
  }
  function closestPiece(t) { while (t && t !== trayEl) { if (t.classList && t.classList.contains("piece")) return t; t = t.parentNode; } return null; }
  trayEl.addEventListener("pointerdown", function (e) {
    if (bitti || drag) return;
    var node = closestPiece(e.target); if (!node) return;
    e.preventDefault();
    var i = +node.dataset.i, p = tray[i]; if (!p) return;
    var src = node.getBoundingClientRect();
    var ghost = pieceNode(p, false); ghost.className = "piece ghost";
    document.body.appendChild(ghost);
    var w = parseFloat(ghost.style.width), h = parseFloat(ghost.style.height), k0 = src.width / w;
    drag = { i: i, p: p, ghost: ghost, node: node, moved: false, x0: e.clientX, y0: e.clientY, w: w, h: h, pid: e.pointerId };
    /* tepsideki küçük hâlinden parmağın üstündeki tam boyuna büyüyerek kalkar */
    ghost.style.left = src.left + "px"; ghost.style.top = src.top + "px"; ghost.style.transformOrigin = "0 0"; ghost.style.transform = "scale(" + k0 + ")";
    node.style.visibility = "hidden";
    void ghost.offsetWidth; ghost.classList.add("kalk");
    moveGhost(e.clientX, e.clientY);
    snd("al");
    try { trayEl.setPointerCapture(e.pointerId); } catch (err) {}
  });
  function moveGhost(x, y) {
    var lift = Math.max(36, cellPx * 1.2);
    var ox = x - drag.w / 2, oy = y - drag.h - lift;   /* parça parmağın üstünde dursun */
    drag.ghost.style.left = ox + "px"; drag.ghost.style.top = oy + "px"; drag.ghost.style.transform = "scale(1)";
    var cp = cellFromPoint(ox + cellPx / 2, oy + cellPx / 2);
    var ic = cp.r >= -1 && cp.c >= -1 && cp.r < N && cp.c < N;
    if (ic && (drag.moved || selected < 0)) preview(drag.p, cp.r, cp.c); else clearPreview();
    drag.cp = ic ? cp : null;
  }
  trayEl.addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.pid) return;
    if (Math.abs(e.clientX - drag.x0) > 6 || Math.abs(e.clientY - drag.y0) > 6) drag.moved = true;
    moveGhost(e.clientX, e.clientY);
  });
  function geriGonder(d) {
    /* sığmadı: tepsideki yerine süzülerek döner */
    var r = d.node.getBoundingClientRect(), g = d.ghost;
    if (azalt() || !r.width) { if (g.parentNode) g.parentNode.removeChild(g); d.node.style.visibility = ""; return; }
    g.classList.add("don"); g.style.left = r.left + "px"; g.style.top = r.top + "px"; g.style.transform = "scale(" + (r.width / d.w) + ")";
    setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); d.node.style.visibility = ""; }, 230);
  }
  function endDrag(e, iptal) {
    if (!drag || (e && e.pointerId !== drag.pid)) return;
    var d = drag; drag = null;
    clearPreview();
    if (!d.moved && !iptal) {
      if (d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost); d.node.style.visibility = "";
      selected = (selected === d.i) ? -1 : d.i; renderTray(); haklar(); msg(selected >= 0 ? "Şimdi plana dokun 👇" + (hakDondur > 0 ? " (Döndür ⟳ de olur)" : "") : ""); return;
    }
    var cp = d.cp;
    if (!iptal && cp && canPlace(d.p.shape, cp.r, cp.c)) { if (d.ghost.parentNode) d.ghost.parentNode.removeChild(d.ghost); place(d.i, cp.r, cp.c); return; }
    if (!iptal && cp) { msg(pick(NOPE)); snd("yok"); } else if (!iptal) msg("Plana bırak");
    geriGonder(d);
  }
  trayEl.addEventListener("pointerup", function (e) { endDrag(e, false); });
  trayEl.addEventListener("pointercancel", function (e) { endDrag(e, true); });
  board.addEventListener("click", function (e) {
    if (bitti) return;
    if (selected < 0) { msg("Önce tepsiden bir çiçek seç 👇"); return; }
    var t = e.target; while (t && t !== board && !(t.classList && t.classList.contains("cell"))) t = t.parentNode;
    if (!t || t === board) return;
    place(selected, +t.dataset.r, +t.dataset.c);
  });

  /* ---------- kombo göstergesi ve haklar (Yenile / Döndür) ---------- */
  var komboEl = document.createElement("div"); komboEl.className = "sefkombo"; komboEl.hidden = true; wrapEl.appendChild(komboEl);
  function kombogoster() {
    var kalan = 3 - (moves - sonTemiz);
    if (combo > 0 && kalan > 0 && !bitti) { komboEl.hidden = false; komboEl.innerHTML = "🔥 Kombo ×" + combo + " <i>" + new Array(kalan + 1).join("●") + new Array(4 - kalan).join("○") + "</i>"; }
    else komboEl.hidden = true;
  }
  var hakKutu = document.createElement("div"); hakKutu.className = "sefhak";
  hakKutu.innerHTML = '<button type="button" id="bYenile">🔄 Yenile <b></b></button><button type="button" id="bDondur">⟳ Döndür <b></b></button>';
  trayEl.parentNode.insertBefore(hakKutu, trayEl.nextSibling);
  var bYen = hakKutu.querySelector("#bYenile"), bDon = hakKutu.querySelector("#bDondur");
  function haklar(vurgula) {
    bYen.querySelector("b").textContent = hakYenile; bDon.querySelector("b").textContent = hakDondur;
    bYen.disabled = hakYenile < 1 || bitti; bDon.disabled = hakDondur < 1 || bitti;
    bYen.classList.toggle("nabiz", !!vurgula && hakYenile > 0); bDon.classList.toggle("nabiz", !!vurgula && hakDondur > 0);
    bDon.classList.toggle("hazir", selected >= 0 && hakDondur > 0);
  }
  bYen.onclick = function () {
    if (bitti || hakYenile < 1) return;
    hakYenile--; selected = -1; fillTray(true); snd("al"); msg("Yeni parçalar geldi 🔄"); haklar(); checkOver();
  };
  bDon.onclick = function () {
    if (bitti || hakDondur < 1) return;
    if (selected < 0 || !tray[selected]) { msg("Önce döndürmek istediğin parçaya dokun, sonra Döndür ⟳"); return; }
    var p = tray[selected], eski = p.shape; p.shape = dondurSekil(p.shape);
    if (p.altin !== undefined) { var hedef = eski[p.altin], mr = 0; eski.forEach(function (q) { if (q[0] > mr) mr = q[0]; }); var yeni = [hedef[1], mr - hedef[0]]; p.altin = p.shape.findIndex ? p.shape.findIndex(function (q) { return q[0] === yeni[0] && q[1] === yeni[1]; }) : 0; }
    hakDondur--; snd("al"); renderTray(); haklar(); msg("Döndü ⟳ Şimdi plana sürükle ya da dokun"); checkOver();
  };

  /* ---------- ses düğmesi ---------- */
  (function () {
    var b = document.createElement("button"); b.type = "button"; b.className = "grestart sefses"; b.setAttribute("aria-label", "Ses");
    function ciz() { b.textContent = Ses.on() ? "🔊" : "🔈"; b.classList.toggle("off", !Ses.on()); }
    b.onclick = function () { Ses.toggle(); ciz(); }; ciz();
    var rs = $("restart"); rs.parentNode.insertBefore(b, rs);
  })();

  /* ---------- başlat ---------- */
  function start() {
    score = 0; shown = 0; moves = 0; combo = 0; sonTemiz = -9; kilit = false; bitti = false; hakYenile = 1; hakDondur = 2; rekorDendi = false; best0 = best; sonHakPuan = 0;
    scoreEl.textContent = 0; over.hidden = true; selected = -1; fx.innerHTML = "";
    buildBoard(); fillTray(true); drawVines(); kombogoster(); haklar();
    msg("Sürükle ya da seç, sonra plana dokun 🌿");
  }
  $("restart").onclick = start; $("again2").onclick = start;
  var fitT = 0, sonW = 0, sonH = 0;
  function refit() {
    var w = innerWidth, h = (window.visualViewport && window.visualViewport.height) || innerHeight;
    if (w === sonW && Math.abs(h - sonH) < 2) return; sonW = w; sonH = h;
    measure(); for (var i = 0; i < board.children.length; i++) board.children[i].dataset.v = "~"; paint(); renderTray(); drawVines();
  }
  function refitSonra() { clearTimeout(fitT); fitT = setTimeout(refit, 90); }
  addEventListener("resize", refitSonra);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", refitSonra);
  addEventListener("orientationchange", function () { setTimeout(refit, 250); });
  /* iOS: araç çubukları yerleşince ölçüyü bir kez daha al */
  addEventListener("load", function () { setTimeout(function () { sonW = 0; refit(); }, 300); });
  /* test kancası: oyun.html#test */
  if (location.hash === "#test") {
    window.__sef = {
      fillRow: function (r, n, col) { for (var c = 0; c < n; c++) grid[r][c] = col || "lav"; paint(); },
      fillAll: function () { for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) grid[r][c] = "lav"; paint(); },
      setTray: function (shapes, col, altin) { tray = shapes.map(function (s, i) { var p = { shape: s, color: col || "peo" }; if (altin && altin[i] !== undefined) p.altin = altin[i]; return p; }); selected = -1; renderTray(); },
      haklar: function (y, d) { hakYenile = y; hakDondur = d; haklar(); }, hepsiSigar: hepsiSigar,
      check: checkOver, score: function () { return score; }, grid: function () { return grid; }, place: place,
      state: function () { return { combo: combo, kilit: kilit, bitti: bitti, cellPx: cellPx, tray: tray, yenile: hakYenile, dondur: hakDondur, selected: selected }; }
    };
  }
  start();
  sonW = innerWidth; sonH = (window.visualViewport && window.visualViewport.height) || innerHeight;
})();
