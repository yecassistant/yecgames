/* Tepe Savaşı – ses efektleri (ayrı modül, Web Audio ile üretilir). tp_ses=0 ile kapanır.
   patla(güç 0..1): gürültü patlaması + alçak gümleme · firlat: hışırtı · sek: tok tık · pompa · sopa · su · ah · sira · win/lose/draw */
(function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { window.TpSes = { play: function () {} }; return; }
  var on = true, ctx = null, master = null, touched = false, gurultu = null;
  try { on = localStorage.getItem("tp_ses") !== "0"; } catch (e) {}
  function init() {
    if (ctx || !on) return;
    try {
      try { ctx = new AC({ latencyHint: "interactive" }); } catch (e1) { ctx = new AC(); }
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5;
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(comp); comp.connect(ctx.destination);
      var n = ctx.sampleRate * 1.2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; gurultu = b;
    } catch (e) { ctx = null; }
  }
  function ready() { if (!on || !touched) return false; init(); if (!ctx) return false; if (ctx.state !== "running") { try { ctx.resume(); } catch (e) {} return false; } return true; }
  function tone(type, hz, t, a, peak, dec, glide) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(hz, t); if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, hz * glide), t + a + dec); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); o.connect(g); g.connect(master); o.start(t); o.stop(t + a + dec + 0.05); }
  function hisirti(t, sure, f, q, peak, tip, f2) {
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = gurultu;
    fl.type = tip || "lowpass"; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + sure); fl.Q.value = q || 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t, Math.random() * 0.3); s.stop(t + sure + 0.05);
  }
  var S = {
    patla: function (o) { var t = ctx.currentTime, k = Math.max(0.3, Math.min(1.4, (o && o.g) || 1)); hisirti(t, 0.5 + k * 0.5, 2400, 0.6, 0.5 * k, "lowpass", 180); tone("sine", 70, t, 0.005, 0.5 * k, 0.5 + k * 0.3, 0.45); tone("triangle", 140, t, 0.003, 0.18 * k, 0.18, 0.5); },
    firlat: function () { var t = ctx.currentTime; hisirti(t, 0.35, 900, 1.2, 0.18, "bandpass", 2600); tone("sine", 220, t, 0.01, 0.06, 0.2, 1.8); },
    at: function () { var t = ctx.currentTime; hisirti(t, 0.12, 1500, 1, 0.12, "bandpass", 600); },
    sek: function () { var t = ctx.currentTime; tone("triangle", 380, t, 0.002, 0.08, 0.06, 0.7); hisirti(t, 0.04, 1800, 1, 0.04, "bandpass"); },
    pompa: function () { var t = ctx.currentTime; hisirti(t, 0.28, 3200, 0.5, 0.45, "lowpass", 400); tone("sine", 110, t, 0.002, 0.25, 0.18, 0.5); },
    sopa: function () { var t = ctx.currentTime; hisirti(t, 0.12, 2400, 2, 0.3, "bandpass", 900); tone("triangle", 260, t, 0.002, 0.2, 0.12, 0.6); },
    su: function () { var t = ctx.currentTime; hisirti(t, 0.6, 1200, 0.8, 0.3, "lowpass", 300); tone("sine", 420, t + 0.05, 0.01, 0.06, 0.3, 0.4); },
    ah: function () { var t = ctx.currentTime, f = 520 + Math.random() * 160; tone("triangle", f, t, 0.01, 0.1, 0.16, 0.7); tone("sine", f * 1.5, t + 0.02, 0.01, 0.04, 0.12, 0.7); },
    adim: function () { var t = ctx.currentTime; hisirti(t, 0.05, 700, 1, 0.025, "bandpass"); },
    zipla: function () { var t = ctx.currentTime; tone("sine", 300, t, 0.005, 0.07, 0.15, 2); },
    sira: function () { var t = ctx.currentTime; tone("sine", 660, t, 0.005, 0.08, 0.2); tone("sine", 880, t + 0.1, 0.005, 0.08, 0.3); },
    sec: function () { var t = ctx.currentTime; tone("triangle", 700, t, 0.002, 0.05, 0.05); },
    isinla: function () { var t = ctx.currentTime; tone("sine", 400, t, 0.01, 0.08, 0.35, 3); tone("sine", 900, t + 0.08, 0.01, 0.05, 0.3, 0.5); },
    hava: function () { var t = ctx.currentTime; tone("sawtooth", 900, t, 0.05, 0.03, 0.8, 0.4); },
    win: function () { var t = ctx.currentTime; [0, 4, 7, 12].forEach(function (s, i) { tone("sine", 523.25 * Math.pow(2, s / 12), t + i * 0.13, 0.006, 0.08, 0.55); }); },
    lose: function () { var t = ctx.currentTime; tone("sine", 659.25, t, 0.01, 0.06, 0.35); tone("sine", 523.25, t + 0.18, 0.01, 0.05, 0.4); tone("sine", 440, t + 0.36, 0.01, 0.05, 0.6); },
    draw: function () { var t = ctx.currentTime; tone("sine", 587.33, t, 0.01, 0.06, 0.35); tone("sine", 587.33, t + 0.2, 0.01, 0.06, 0.5); }
  };
  var keep = null;
  function keepAlive() { if (keep || !ctx) return; try { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 30; g.gain.value = 0.0001; o.connect(g); g.connect(ctx.destination); o.start(); keep = o; } catch (e) {} }
  function unlock() { touched = true; if (!on) return; init(); if (!ctx) return; keepAlive(); if (ctx.state !== "running") { try { ctx.resume(); var sb = ctx.createBufferSource(); sb.buffer = ctx.createBuffer(1, 1, 22050); sb.connect(ctx.destination); sb.start(0); } catch (e) {} } }
  ["pointerdown", "touchend", "pointerup", "click", "keydown"].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && ctx) try { ctx.suspend(); } catch (e) {} });
  var son = {};
  window.TpSes = {
    play: function (n, o) { if (!S[n] || !ready()) return; var now = Date.now(); if (n !== "patla" && son[n] && now - son[n] < 45) return; son[n] = now; try { S[n](o); } catch (e) {} },
    toggle: function () { on = !on; try { localStorage.setItem("tp_ses", on ? "1" : "0"); } catch (e) {} return on; }
  };
})();
