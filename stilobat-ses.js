/* Stilobat – ses efektleri (ayrı modül). KALDIRMAK İÇİN: stilobat.html'deki stilobat-ses.js satırını silmek yeterli.
   Tarz: Stack benzeri — gürültü yok, hepsi yumuşak marimba/ksilofon çubuğu sesi. place: üç nota (kesik küçük/orta/büyük → mi/re/si), blok küçüldükçe hafif tizleşir, küçük rastgele sapma
   perfect: pentatonik yukarı çıkan çan (seri arttıkça tizleşir) · grow: kısa arpej · record: üç notalı çan · over: pes, yumuşak iniş. Düşen parça sessiz. ku_ses=0 ile kapanır. */
(function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { window.KuSes = { play: function () {}, toggle: function () { return false; }, on: function () { return false; } }; return; }
  var on = true, ctx = null, master = null, touched = false;
  try { on = localStorage.getItem("ku_ses") !== "0"; } catch (e) {}
  var VOL = 0.85;
  function init() { if (ctx || !on) return; try { try { ctx = new AC({ latencyHint: "interactive" }); } catch (e1) { ctx = new AC(); } var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5; master = ctx.createGain(); master.gain.value = VOL; master.connect(comp); comp.connect(ctx.destination); } catch (e) { ctx = null; } }
  function ready() { if (!on || !touched) return false; init(); if (!ctx) return false; if (ctx.state !== "running") { try { ctx.resume(); } catch (e) {} return false; } return true; }
  function tone(type, hz, t, a, peak, dec, glide) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(hz, t); if (glide) o.frequency.exponentialRampToValueAtTime(hz * glide, t + a + dec); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); o.connect(g); g.connect(master); o.start(t); o.stop(t + a + dec + 0.05); }
  function nota(hz, t, peak, dec) { tone("sine", hz, t, 0.004, peak, dec); tone("triangle", hz * 2, t, 0.004, peak * 0.25, dec * 0.6); tone("sine", hz * 3, t, 0.003, peak * 0.08, dec * 0.35); }   /* ksilofon benzeri */
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36];
  /* Sol (G4=392 Hz) referanslı yarım ton dizileri: her akor için 8 notalık arpej (yukarı, tepede küçük dönüş) */
  var MELODI = [
    [5, 9, 12, 17, 21, 17, 24, 21],    /* Do */
    [2, 5, 9, 14, 17, 14, 21, 17],     /* La minör */
    [-2, 2, 5, 10, 14, 10, 17, 14],    /* Fa */
    [0, 4, 7, 12, 16, 12, 19, 16],     /* Sol */
    [5, 9, 12, 17, 21, 24, 21, 17],    /* Do */
    [-2, 2, 5, 10, 14, 17, 14, 10],    /* Fa */
    [0, 4, 7, 12, 16, 19, 16, 12],     /* Sol */
    [5, 12, 9, 17, 12, 21, 17, 24]     /* Do (kapanış) */
  ];
  function rnd(a, b) { return a + Math.random() * (b - a); }
  /* marimba/ksilofon çubuğu: temel + 4. kısmi (kısa) + tokmak dokunuşu (sinüs, gürültü yok) → yumuşak, "tatlı" tın */
  function cubuk(hz, t, peak, dec, parlak) {
    tone("sine", hz, t, 0.003, peak, dec);
    tone("sine", hz * 4.0, t, 0.002, peak * (parlak ? 0.22 : 0.12), Math.min(0.16, dec * 0.35));
    tone("sine", hz * 9.9, t, 0.002, peak * 0.03, 0.05);
    tone("triangle", 1500 + hz * 0.5, t, 0.001, peak * 0.1, 0.012);          /* tokmak "tık" */
  }
  var S = {
    /* blok oturma: yumuşak ahşap "tok". Kesik küçükse mi (E4), ortaysa re (D4), büyükse si (B3): yumuşak bir akorun üç notası; büyük kesikte biraz daha kısa ve boğuk */
    place: function (o) {
      o = o || {}; var t = ctx.currentTime, kes = o.kes || 0, boy = o.boy === undefined ? 1 : o.boy, det = rnd(0.985, 1.015);
      var hz = (kes < 0.15 ? 329.63 : kes < 0.5 ? 293.66 : 246.94) * det * (1 + (1 - boy) * 0.12);
      var dec = kes < 0.15 ? 0.22 : kes < 0.5 ? 0.18 : 0.14, peak = kes < 0.15 ? 0.1 : kes < 0.5 ? 0.11 : 0.12;
      cubuk(hz, t, peak, dec, false);
      tone("sine", 82 * det, t, 0.004, 0.05 + kes * 0.04, 0.12 + kes * 0.06);  /* hafif gövde "tump" */
    },
    /* tam oturtma: parlak çan, seri arttıkça pentatonik yukarı (ses yükselmez, sadece tizleşir) */
    /* tam oturtma: bitmeyen melodi. Oyundaki her "mükemmel" bir sonraki notayı çalar: akorlar sırayla değişir
       (Do – La minör – Fa – Sol – Do – Fa – Sol – Do), her akorda 8 notalık yükselen arpej; 64 notada bir ton yükselir,
       üç turda bir başa döner. Seri büyüdükçe altta yumuşak akor tabanı ve parlak üst ses eklenir. */
    perfect: function (o) {
      o = typeof o === "object" && o ? o : { combo: o || 1, n: o || 1 };
      var t = ctx.currentTime, n = Math.max(0, (o.n || 1) - 1), combo = o.combo || 1;
      var faz = Math.floor(n / 8) % MELODI.length, adim = n % 8, tur = Math.floor(n / 64) % 3, ton = [0, -3, 2][tur];
      var yari = MELODI[faz][adim] + ton, hz = 392 * Math.pow(2, yari / 12);
      cubuk(hz, t, 0.095, 0.6, true);
      if (adim === 0 || combo >= 3) cubuk(98 * Math.pow(2, (MELODI[faz][0] + ton) / 12), t, 0.05, 0.9, false);   /* akor kökü, pes */
      if (combo >= 5) tone("sine", hz * 2, t + 0.03, 0.01, 0.022, 0.5);
      if (combo >= 8 && adim % 2 === 0) cubuk(hz * 1.5, t + 0.09, 0.035, 0.4, true);
    },
    grow: function () { var t = ctx.currentTime; [0, 4, 7, 12].forEach(function (s, i) { cubuk(659.25 * Math.pow(2, s / 12), t + i * 0.06, 0.06, 0.4, true); }); },
    record: function () { var t = ctx.currentTime; cubuk(1046.5, t, 0.07, 0.5, true); cubuk(1318.5, t + 0.12, 0.07, 0.6, true); cubuk(1568, t + 0.24, 0.07, 0.9, true); },
    over: function () { var t = ctx.currentTime; tone("sine", 110, t, 0.006, 0.12, 0.35, 0.8); cubuk(196, t + 0.05, 0.06, 0.5, false); cubuk(146.83, t + 0.3, 0.05, 0.8, false); }
  };
  var pend = null, keep = null;
  function keepAlive() { if (keep || !ctx) return; try { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 30; g.gain.value = 0.0001; o.connect(g); g.connect(ctx.destination); o.start(); keep = o; } catch (e) {} }
  function retry() { [40, 150, 350].forEach(function (d) { setTimeout(function () { if (pend && ctx && ctx.state === "running") { var q = pend; pend = null; if (Date.now() - q.t < 600) try { S[q.n](q.o); } catch (e) {} } }, d); }); }
  function unlock() { touched = true; if (!on) return; init(); if (!ctx) return; keepAlive(); if (ctx.state !== "running") { try { ctx.resume(); var sb = ctx.createBufferSource(); sb.buffer = ctx.createBuffer(1, 1, 22050); sb.connect(ctx.destination); sb.start(0); } catch (e) {} } if (pend) retry(); }
  ["pointerdown", "touchend", "pointerup", "click", "keydown"].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && ctx) try { ctx.suspend(); } catch (e) {} });
  window.KuSes = {
    play: function (n, o) { if (!S[n]) return; if (!ready()) { if (on) { pend = { n: n, o: o, t: Date.now() }; retry(); } return; } try { S[n](o); } catch (e) {} },
    toggle: function () { on = !on; try { localStorage.setItem("ku_ses", on ? "1" : "0"); } catch (e) {} if (on) { touched = true; init(); if (ctx) try { ctx.resume(); } catch (e) {} } return on; },
    on: function () { return on; }
  };
})();
