/* Buluşma Takvimi – ses efektleri (ayrı modül). KALDIRMAK İÇİN: takvim.html'deki <script src="takvim-ses.js"> satırını silmek yeterli.
   ac: gün işaretlenince kısa "tık" · kapa: işaret kalkınca kısık "pıt" · ortak: ikisi de boşsa iki notalık tın. tk_ses=0 ile kapanır. */
(function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  var on = true, ctx = null, master = null, touched = false;
  try { on = localStorage.getItem("tk_ses") !== "0"; } catch (e) {}
  var VOL = 0.45;
  function init() { if (ctx || !on) return; try { try { ctx = new AC({ latencyHint: "interactive" }); } catch (e1) { ctx = new AC(); } var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6; master = ctx.createGain(); master.gain.value = VOL; master.connect(comp); comp.connect(ctx.destination); } catch (e) { ctx = null; } }
  function ready() { if (!on || !touched) return false; init(); if (!ctx) return false; if (ctx.state !== "running") { try { ctx.resume(); } catch (e) {} return false; } return true; }
  function tone(type, hz, t, a, peak, dec, glide) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(hz, t); if (glide) o.frequency.exponentialRampToValueAtTime(hz * glide, t + a + dec); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); o.connect(g); g.connect(master); o.start(t); o.stop(t + a + dec + 0.05); }
  var S = {
    ac: function () { var t = ctx.currentTime; tone("triangle", 660, t, 0.003, 0.05, 0.08, 1.25); },
    kapa: function () { var t = ctx.currentTime; tone("sine", 300, t, 0.003, 0.035, 0.09, 0.8); },
    ortak: function () { var t = ctx.currentTime; tone("sine", 880, t, 0.005, 0.08, 0.35); tone("sine", 1318.5, t + 0.1, 0.005, 0.07, 0.45); tone("sine", 2637, t + 0.1, 0.003, 0.012, 0.3); }
  };

  var pend = null, keep = null;
  function keepAlive() { if (keep || !ctx) return; try { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 30; g.gain.value = 0.0001; o.connect(g); g.connect(ctx.destination); o.start(); keep = o; } catch (e) {} }
  function retry() { [40, 150, 350].forEach(function (d) { setTimeout(function () { if (pend && ctx && ctx.state === "running") { var q = pend; pend = null; if (Date.now() - q.t < 600) try { S[q.n](); } catch (e) {} } }, d); }); }
  function unlock() { touched = true; if (!on) return; init(); if (!ctx) return; keepAlive(); if (ctx.state !== "running") { try { ctx.resume(); var sb = ctx.createBufferSource(); sb.buffer = ctx.createBuffer(1, 1, 22050); sb.connect(ctx.destination); sb.start(0); } catch (e) {} } if (pend) retry(); }
  ["pointerdown", "touchend", "pointerup", "click", "keydown"].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && ctx) try { ctx.suspend(); } catch (e) {} });
  window.TkSes = { play: function (n) { if (!S[n]) return; if (!ready()) { if (on) { pend = { n: n, t: Date.now() }; retry(); } return; } try { S[n](); } catch (e) {} }, on: function () { return on; } };
})();
