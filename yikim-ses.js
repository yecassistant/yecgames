/* Yıkım – ses efektleri (ayrı modül). yk_ses=0 ile kapanır.
   Yumuşak, kısık, tırmalamayan tınılar: her şey alçak geçiren süzgeçten geçer; kare/testere dalga yok.
   Kırılma: 3 aile (yumuşak çan, tahta marimba, su damlası), aynı aile art arda gelmez; seri uzadıkça pentatonik dizide yükselir.
   Ateş modunda kırılmalar daha dolgun ve bir oktav alçak. Siyah: tok ama kısa "puf" + inen üç nota. Seviye: hafif çan arpeji. */
(function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { window.YkSes = { play: function () {}, toggle: function () { return false; }, on: function () { return false; } }; return; }
  var on = true, ctx = null, master = null, touched = false, sonAile = -1, sonCal = 0, gurultu = null;
  try { on = localStorage.getItem("yk_ses") !== "0"; } catch (e) {}
  function init() {
    if (ctx || !on) return;
    try {
      try { ctx = new AC({ latencyHint: "interactive" }); } catch (e1) { ctx = new AC(); }
      var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 5200; lp.Q.value = 0.5;      /* tiz uçları yumuşat */
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
      master = ctx.createGain(); master.gain.value = 0.42; master.connect(lp); lp.connect(comp); comp.connect(ctx.destination);
      var n = ctx.sampleRate * 0.5, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; gurultu = b;
    } catch (e) { ctx = null; }
  }
  function ready() { if (!on || !touched) return false; init(); if (!ctx) return false; if (ctx.state !== "running") { try { ctx.resume(); } catch (e) {} return false; } return true; }
  function tone(type, hz, t, a, peak, dec, glide) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(hz, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, hz * glide), t + a + dec);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + a + dec + 0.05);
  }
  function hisirti(t, sure, f, q, peak, tip) {
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = gurultu;
    fl.type = tip || "bandpass"; fl.frequency.value = f; fl.Q.value = q || 1;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + sure + 0.05);
  }
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  var AILE = [
    function (hz, t, guc) { tone("sine", hz, t, 0.003, 0.11 * guc, 0.22, 0.98); tone("sine", hz * 2.01, t, 0.002, 0.035 * guc, 0.12); tone("triangle", hz * 3, t + 0.003, 0.002, 0.012 * guc, 0.06); },  /* yumuşak çan */
    function (hz, t, guc) { tone("sine", hz * 0.5, t, 0.002, 0.13 * guc, 0.16); tone("sine", hz * 2, t, 0.001, 0.025 * guc, 0.05); hisirti(t, 0.03, 1600, 1.2, 0.035 * guc); },                               /* tahta marimba */
    function (hz, t, guc) { tone("sine", hz * 0.8, t, 0.003, 0.1 * guc, 0.11, 1.5); tone("sine", hz * 1.6, t + 0.012, 0.002, 0.03 * guc, 0.07, 1.3); }                                                   /* su damlası */
  ];
  var S = {
    kir: function (o) {
      var t = ctx.currentTime, seri = Math.max(0, (o && o.seri) || 0), atesli = o && o.ates, aile;
      do { aile = Math.floor(Math.random() * AILE.length); } while (aile === sonAile && AILE.length > 1);
      sonAile = aile;
      var hz = 440 * Math.pow(2, PENTA[seri % PENTA.length] / 12) * (seri >= PENTA.length ? 1.5 : 1) * (0.995 + Math.random() * 0.01);
      if (atesli) { hz *= 0.5; tone("sine", 65, t, 0.004, 0.08, 0.16, 0.7); }
      AILE[aile](hz, t, 1);
    },
    sek: function () { var t = ctx.currentTime; tone("sine", 160, t, 0.004, 0.05, 0.09, 0.75); hisirti(t, 0.04, 900, 0.8, 0.02); },
    olum: function () { var t = ctx.currentTime; hisirti(t, 0.16, 300, 0.7, 0.14, "lowpass"); tone("sine", 110, t, 0.004, 0.14, 0.3, 0.55); tone("sine", 392, t + 0.16, 0.012, 0.06, 0.28); tone("sine", 329.6, t + 0.34, 0.012, 0.055, 0.3); tone("sine", 261.6, t + 0.54, 0.012, 0.05, 0.55); },
    ates: function () { var t = ctx.currentTime; hisirti(t, 0.5, 700, 0.6, 0.07, "bandpass"); tone("sine", 180, t, 0.08, 0.06, 0.45, 2.6); tone("sine", 360, t + 0.05, 0.08, 0.04, 0.4, 2.2); },
    seviye: function () { var t = ctx.currentTime; [0, 4, 7, 12, 16].forEach(function (s, i) { tone("sine", 523.25 * Math.pow(2, s / 12), t + i * 0.1, 0.006, 0.08, 0.5); tone("sine", 1046.5 * Math.pow(2, s / 12), t + i * 0.1, 0.004, 0.015, 0.25); }); hisirti(t + 0.3, 0.5, 3000, 0.5, 0.015, "highpass"); },
    rekor: function () { var t = ctx.currentTime; [0, 7, 12, 19].forEach(function (s, i) { tone("sine", 659.25 * Math.pow(2, s / 12), t + i * 0.11, 0.006, 0.06, 0.5); }); }
  };
  var pend = null, keep = null;
  function keepAlive() { if (keep || !ctx) return; try { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 30; g.gain.value = 0.0001; o.connect(g); g.connect(ctx.destination); o.start(); keep = o; } catch (e) {} }
  function retry() { [40, 150, 350].forEach(function (d) { setTimeout(function () { if (pend && ctx && ctx.state === "running") { var q = pend; pend = null; if (Date.now() - q.t < 600) try { S[q.n](q.o); } catch (e) {} } }, d); }); }
  function unlock() { touched = true; if (!on) return; init(); if (!ctx) return; keepAlive(); if (ctx.state !== "running") { try { ctx.resume(); var sb = ctx.createBufferSource(); sb.buffer = ctx.createBuffer(1, 1, 22050); sb.connect(ctx.destination); sb.start(0); } catch (e) {} } if (pend) retry(); }
  ["pointerdown", "touchend", "pointerup", "click", "keydown"].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && ctx) try { ctx.suspend(); } catch (e) {} });
  window.YkSes = {
    play: function (n, o) {
      if (!S[n]) return;
      if (n === "kir") { var now = Date.now(); if (now - sonCal < 55) return; sonCal = now; }              /* çok hızlı kırılmada sesler üst üste binmesin */
      if (!ready()) { if (on) { pend = { n: n, o: o, t: Date.now() }; retry(); } return; }
      try { S[n](o); } catch (e) {}
    },
    toggle: function () { on = !on; try { localStorage.setItem("yk_ses", on ? "1" : "0"); } catch (e) {} if (on) { touched = true; init(); if (ctx) try { ctx.resume(); } catch (e) {} } return on; },
    on: function () { return on; }
  };
})();
