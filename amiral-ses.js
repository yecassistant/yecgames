/* Amiral Battı – ses efektleri (ayrı modül). ab_ses=0 ile kapanır. */
(function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  var on = true, ctx = null, master = null, touched = false;
  try { on = localStorage.getItem("ab_ses") !== "0"; } catch (e) {}
  var VOL = 0.45;
  function init() { if (ctx || !on) return; try { try { ctx = new AC({ latencyHint: "interactive" }); } catch (e1) { ctx = new AC(); } var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6; master = ctx.createGain(); master.gain.value = VOL; master.connect(comp); comp.connect(ctx.destination); } catch (e) { ctx = null; } }
  function ready() { if (!on || !touched) return false; init(); if (!ctx) return false; if (ctx.state !== "running") { try { ctx.resume(); } catch (e) {} return false; } return true; }
  function tone(type, hz, t, a, peak, dec, glide) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(hz, t); if (glide) o.frequency.exponentialRampToValueAtTime(hz * glide, t + a + dec); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); o.connect(g); g.connect(master); o.start(t); o.stop(t + a + dec + 0.05); }
  var S = {
    select: function () { var t = ctx.currentTime; tone("triangle", 520, t, 0.002, 0.03, 0.05, 1.15); },
    miss: function () { var t = ctx.currentTime; var o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.25); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.35); },
    hit: function () { var t = ctx.currentTime; var n = ctx.createBufferSource(), buf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate), d = buf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2); n.buffer = buf; var g = ctx.createGain(); g.gain.value = 0.16; var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900; n.connect(f); f.connect(g); g.connect(master); n.start(t); tone("sine", 120, t, 0.003, 0.09, 0.22, 0.5); },
    sunk: function () { var t = ctx.currentTime; S.hit(); tone("sine", 196, t + 0.12, 0.01, 0.07, 0.5, 0.5); tone("sine", 146.8, t + 0.3, 0.01, 0.06, 0.7, 0.6); },
    win: function () { var t = ctx.currentTime; [0, 4, 7, 12].forEach(function (s, i) { tone("sine", 523.25 * Math.pow(2, s / 12), t + i * 0.13, 0.006, 0.07, 0.55); }); },
    lose: function () { var t = ctx.currentTime; tone("sine", 659.25, t, 0.01, 0.05, 0.35); tone("sine", 523.25, t + 0.18, 0.01, 0.045, 0.4); tone("sine", 440, t + 0.36, 0.01, 0.04, 0.6); },
    draw: function () { var t = ctx.currentTime; tone("sine", 587.33, t, 0.01, 0.05, 0.35); }
  };

  var pend = null, keep = null;
  function keepAlive() { if (keep || !ctx) return; try { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 30; g.gain.value = 0.0001; o.connect(g); g.connect(ctx.destination); o.start(); keep = o; } catch (e) {} }
  function retry() { [40, 150, 350].forEach(function (d) { setTimeout(function () { if (pend && ctx && ctx.state === "running") { var q = pend; pend = null; if (Date.now() - q.t < 600) try { S[q.n](); } catch (e) {} } }, d); }); }
  function unlock() { touched = true; if (!on) return; init(); if (!ctx) return; keepAlive(); if (ctx.state !== "running") { try { ctx.resume(); var sb = ctx.createBufferSource(); sb.buffer = ctx.createBuffer(1, 1, 22050); sb.connect(ctx.destination); sb.start(0); } catch (e) {} } if (pend) retry(); }
  ["pointerdown", "touchend", "pointerup", "click", "keydown"].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && ctx) try { ctx.suspend(); } catch (e) {} });
  window.AbSes = { play: function (n) { if (!S[n]) return; if (!ready()) { if (on) { pend = { n: n, t: Date.now() }; retry(); } return; } try { S[n](); } catch (e) {} }, on: function () { return on; } };
})();
