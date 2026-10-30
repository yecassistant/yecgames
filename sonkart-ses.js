/* Son Kart – ses efektleri (Web Audio ile üretilir). uk_ses=0 ile kapanır.
   kart: kart atma hışırtısı · cek: kart çekme · sonkart: kısa fanfar · ceza: alçak vızıltı · sira: sıra sende · sec: seçim · win/lose/draw */
(function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { window.UkSes = { play: function () {} }; return; }
  var on = true, ctx = null, master = null, touched = false, gurultu = null;
  try { on = localStorage.getItem("uk_ses") !== "0"; } catch (e) {}
  function init() {
    if (ctx || !on) return;
    try {
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.45; master.connect(ctx.destination);
      var n = ctx.sampleRate * 0.6, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; gurultu = b;
    } catch (e) { ctx = null; }
  }
  function ready() { if (!on || !touched) return false; init(); if (!ctx) return false; if (ctx.state !== "running") { try { ctx.resume(); } catch (e) {} return false; } return true; }
  function tone(type, hz, t, a, peak, dec, glide) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(hz, t); if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, hz * glide), t + a + dec); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); o.connect(g); g.connect(master); o.start(t); o.stop(t + a + dec + 0.05); }
  function hisirti(t, sure, f, f2, peak) {
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = gurultu;
    fl.type = "bandpass"; fl.Q.value = 0.9; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + sure);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t, Math.random() * 0.2); s.stop(t + sure + 0.05);
  }
  var S = {
    kart: function () { var t = ctx.currentTime; hisirti(t, 0.12, 2600, 900, 0.35); tone("triangle", 520, t + 0.06, 0.003, 0.06, 0.06); },
    cek: function () { var t = ctx.currentTime; hisirti(t, 0.09, 1400, 2400, 0.22); hisirti(t + 0.07, 0.07, 1600, 2600, 0.12); },
    sonkart: function () { var t = ctx.currentTime; [0, 4, 7, 12].forEach(function (s, i) { tone("square", 523.25 * Math.pow(2, s / 12), t + i * 0.07, 0.004, 0.05, 0.16); }); },
    ceza: function () { var t = ctx.currentTime; tone("sawtooth", 160, t, 0.01, 0.07, 0.28, 0.7); tone("sawtooth", 120, t + 0.12, 0.01, 0.06, 0.3, 0.7); },
    sira: function () { var t = ctx.currentTime; tone("sine", 784, t, 0.005, 0.08, 0.22); tone("sine", 1046.5, t + 0.09, 0.005, 0.07, 0.3); },
    sec: function () { var t = ctx.currentTime; tone("triangle", 660, t, 0.003, 0.05, 0.06); },
    win: function () { var t = ctx.currentTime; [0, 4, 7, 12, 16].forEach(function (s, i) { tone("sine", 523.25 * Math.pow(2, s / 12), t + i * 0.12, 0.006, 0.08, 0.5); }); },
    lose: function () { var t = ctx.currentTime; tone("sine", 659.25, t, 0.01, 0.06, 0.35); tone("sine", 523.25, t + 0.18, 0.01, 0.05, 0.4); tone("sine", 440, t + 0.36, 0.01, 0.05, 0.6); },
    draw: function () { var t = ctx.currentTime; tone("sine", 587.33, t, 0.01, 0.06, 0.35); tone("sine", 587.33, t + 0.2, 0.01, 0.06, 0.5); }
  };
  function unlock() { touched = true; if (!on) return; init(); if (ctx && ctx.state !== "running") { try { ctx.resume(); } catch (e) {} } }
  ["pointerdown", "touchend", "click", "keydown"].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && ctx) try { ctx.suspend(); } catch (e) {} });
  window.UkSes = { play: function (n) { if (!S[n] || !ready()) return; try { S[n](); } catch (e) {} }, toggle: function () { on = !on; try { localStorage.setItem("uk_ses", on ? "1" : "0"); } catch (e) {} return on; } };
})();
