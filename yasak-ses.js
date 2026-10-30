/* Tabu – ses efektleri (ayrı modül). tu_ses=0 ile kapanır. */
(function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  var on = true, ctx = null, master = null, touched = false;
  try { on = localStorage.getItem("tu_ses") !== "0"; } catch (e) {}
  var VOL = 0.45;
  function init() { if (ctx || !on) return; try { try { ctx = new AC({ latencyHint: "interactive" }); } catch (e1) { ctx = new AC(); } var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6; master = ctx.createGain(); master.gain.value = VOL; master.connect(comp); comp.connect(ctx.destination); } catch (e) { ctx = null; } }
  function ready() { if (!on || !touched) return false; init(); if (!ctx) return false; if (ctx.state !== "running") { try { ctx.resume(); } catch (e) {} return false; } return true; }
  function tone(type, hz, t, a, peak, dec, glide) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(hz, t); if (glide) o.frequency.exponentialRampToValueAtTime(hz * glide, t + a + dec); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); o.connect(g); g.connect(master); o.start(t); o.stop(t + a + dec + 0.05); }
  var S = {
    cek: function () { var t = ctx.currentTime; tone("triangle", 520, t, 0.003, 0.05, 0.08, 1.4); tone("sine", 880, t + 0.05, 0.004, 0.05, 0.2); },
    gonder: function () { var t = ctx.currentTime; tone("sine", 660, t, 0.004, 0.06, 0.16, 1.25); tone("sine", 990, t + 0.08, 0.004, 0.05, 0.25); },
    ac: function () { var t = ctx.currentTime; tone("sine", 440, t, 0.004, 0.05, 0.18); tone("sine", 554.37, t + 0.07, 0.004, 0.05, 0.22); },
    dogru: function () { var t = ctx.currentTime; [0, 4, 7, 12].forEach(function (s, i) { tone("sine", 587.33 * Math.pow(2, s / 12), t + i * 0.08, 0.005, 0.065, 0.4); }); },
    yanlis: function () { var t = ctx.currentTime; tone("triangle", 233, t, 0.004, 0.08, 0.14, 0.85); tone("sine", 116, t, 0.004, 0.05, 0.18); },
    sure: function () { var t = ctx.currentTime; [0, 0.16, 0.32].forEach(function (d) { tone("square", 880, t + d, 0.002, 0.025, 0.07); }); },
    pas: function () { var t = ctx.currentTime; tone("sine", 760, t, 0.003, 0.045, 0.13, 0.55); tone("triangle", 380, t + 0.03, 0.003, 0.025, 0.1, 0.7); },
    tik: function () { var t = ctx.currentTime; tone("square", 1250, t, 0.001, 0.018, 0.035); tone("sine", 625, t, 0.001, 0.02, 0.05); },
    win: function () { var t = ctx.currentTime; [0, 4, 7, 12].forEach(function (s, i) { tone("sine", 523.25 * Math.pow(2, s / 12), t + i * 0.13, 0.006, 0.07, 0.55); }); },
    lose: function () { var t = ctx.currentTime; tone("sine", 659.25, t, 0.01, 0.05, 0.35); tone("sine", 523.25, t + 0.18, 0.01, 0.045, 0.4); tone("sine", 440, t + 0.36, 0.01, 0.04, 0.6); },
    draw: function () { var t = ctx.currentTime; tone("sine", 587.33, t, 0.01, 0.05, 0.35); tone("sine", 587.33, t + 0.2, 0.01, 0.05, 0.5); }
  };

  var pend = null, keep = null;
  function keepAlive() { if (keep || !ctx) return; try { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 30; g.gain.value = 0.0001; o.connect(g); g.connect(ctx.destination); o.start(); keep = o; } catch (e) {} }
  function retry() { [40, 150, 350].forEach(function (d) { setTimeout(function () { if (pend && ctx && ctx.state === "running") { var q = pend; pend = null; if (Date.now() - q.t < 600) try { S[q.n](); } catch (e) {} } }, d); }); }
  function unlock() { touched = true; if (!on) return; init(); if (!ctx) return; keepAlive(); if (ctx.state !== "running") { try { ctx.resume(); var sb = ctx.createBufferSource(); sb.buffer = ctx.createBuffer(1, 1, 22050); sb.connect(ctx.destination); sb.start(0); } catch (e) {} } if (pend) retry(); }
  ["pointerdown", "touchend", "pointerup", "click", "keydown"].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && ctx) try { ctx.suspend(); } catch (e) {} });
  window.TuSes = { play: function (n) { if (!S[n]) return; if (!ready()) { if (on) { pend = { n: n, t: Date.now() }; retry(); } return; } try { S[n](); } catch (e) {} }, on: function () { return on; } };
})();
