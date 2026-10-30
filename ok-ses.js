/* Eros'un Oku – ses efektleri (ayrı modül)
   KALDIRMAK İÇİN: ok.html'deki <script src="ok-ses.js"> satırını silmek yeterli; oyun sessiz çalışmaya devam eder.
   Sesler dosya değil, tarayıcıda anlık üretilir (Web Audio) → indirme yok, kasma yok.
   Kapatma: alttaki hoparlör butonu; tercih ok_ses (1/0) olarak hatırlanır. iPhone sessiz moddayken iOS web seslerini zaten çalmaz. */
(function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  var on = true, ctx = null, master = null, noiseBuf = null, lastSlide = -1, step = 0, touched = false;
  try { on = localStorage.getItem("ok_ses") !== "0"; } catch (e) {}
  var VOL = 0.55;                                           /* genel ses seviyesi: kısık-orta */
  var SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];          /* pentatonik: art arda notalar hep uyumlu */

  function init() {
    if (ctx || !on) return;
    try {
      try { ctx = new AC({ latencyHint: "interactive" }); } catch (e1) { ctx = new AC(); }   /* en düşük gecikme */
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6;
      master = ctx.createGain(); master.gain.value = VOL; master.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }
  function ready() { if (!on || !touched) return false; init(); if (!ctx) return false; if (ctx.state !== "running") { try { ctx.resume(); } catch (e) {} return false; } return true; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function tone(type, f0, f1, t, a, peak, dec) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + a + dec);
    env(g, t, a, peak, dec); o.connect(g); g.connect(master); o.start(t); o.stop(t + a + dec + 0.05);
  }
  function noise(t, dur, type, f0, f1, q, peak) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.012, peak, dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.2); s.stop(t + dur + 0.05);
  }
  function note(n) { return 523.25 * Math.pow(2, SCALE[((n % SCALE.length) + SCALE.length) % SCALE.length] / 12); }   /* C5 tabanlı */

  var S = {
    /* ok kayıp çıkınca: yumuşak "fşşt" + bölüm ilerledikçe yükselen minik bir nota (her seferinde biraz farklı) */
    slide: function (o) {
      var now = ctx.currentTime; if (now - lastSlide < 0.045) return; lastSlide = now;
      var k = rnd(0.85, 1.15), dur = rnd(0.16, 0.24);
      noise(now, dur, "bandpass", 900 * k, 3200 * k, 1.1, 0.16);
      var n = o && o.k !== undefined ? o.k : step++;
      tone("sine", note(n), note(n) * 1.004, now + 0.02, 0.008, 0.035, 0.22);
    },
    /* çarpma: kısa, boğuk "tok" */
    bump: function () {
      var now = ctx.currentTime, k = rnd(0.92, 1.08);
      tone("sine", 150 * k, 70 * k, now, 0.004, 0.22, 0.16);
      noise(now, 0.06, "lowpass", 700, 300, 0.7, 0.08);
    },
    /* son ok kalbe saplanınca: "tak", ardından iki notalık çan ve kalp atışıyla iki "dum" */
    hit: function () {
      var now = ctx.currentTime, k = rnd(0.95, 1.05);
      noise(now, 0.07, "lowpass", 1400, 500, 0.8, 0.14);
      tone("sine", 210 * k, 95 * k, now, 0.003, 0.2, 0.14);
      var base = [[0, 4], [2, 7], [4, 9]][Math.floor(Math.random() * 3)];
      tone("triangle", note(base[0] + 5), 0, now + 0.12, 0.01, 0.07, 0.7);
      tone("triangle", note(base[1] + 5), 0, now + 0.26, 0.01, 0.06, 0.9);
      tone("sine", 64, 50, now + 0.55, 0.01, 0.18, 0.16);
      tone("sine", 60, 46, now + 0.85, 0.01, 0.14, 0.16);
    },
    hint: function () { var now = ctx.currentTime; tone("sine", note(7), 0, now, 0.01, 0.04, 0.35); tone("sine", note(9), 0, now + 0.08, 0.01, 0.035, 0.35); },
    fail: function () { var now = ctx.currentTime; tone("triangle", note(4), note(4) * 0.97, now, 0.01, 0.05, 0.35); tone("triangle", note(0) / 2, note(0) / 2 * 0.95, now + 0.18, 0.01, 0.05, 0.55); },
    level: function () { step = 0; }                         /* yeni bölümde nota sırası baştan */
  };
  window.OkSes = {
    play: function (name, o) { if (name === "level") { S.level(); return; } if (!S[name]) return; if (!ready()) { if (on) { pend = { n: name, o: o, t: Date.now() }; retry(); } return; } try { S[name](o); } catch (e) {} },
    on: function () { return on; }
  };

  /* hoparlör butonu: alt çubuğa, bölümler butonunun soluna eklenir */
  var foot = document.querySelector(".okfoot"), lv = document.getElementById("bLevels");
  if (foot && lv) {
    var b = document.createElement("button"); b.type = "button"; b.className = "okbtn oksound"; b.id = "bSound";
    var ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
    var ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
    function draw() { b.innerHTML = on ? ICON_ON : ICON_OFF; b.setAttribute("aria-label", on ? "Sesi kapat" : "Sesi aç"); b.classList.toggle("off", !on); }
    b.onclick = function () {
      on = !on; try { localStorage.setItem("ok_ses", on ? "1" : "0"); } catch (e) {}
      if (!on && ctx) try { ctx.suspend(); } catch (e) {}
      draw(); if (on) { touched = true; window.OkSes.play("hint"); }
    };
    draw(); foot.insertBefore(b, lv);
  }
  /* iPhone'da ses motoru ancak parmak kalkınca (touchend / click) açılır; pointerdown iOS'ta "dokunuş" sayılmaz.
     Kilit açılırken sessiz tek örnek çalınır (eski iOS'lar için); kilit kapalıyken istenen son ses (ör. ilk dokunuşun sesi) açılır açılmaz çalar. */
  var pend = null, keep = null;
  /* iPhone'da ses donanımı boşta "uyuyup" bir sonraki sesi geciktirmesin diye duyulmayacak kadar kısık, çok pes bir ton açık tutulur (sayfa gizlenince durur) */
  function keepAlive() { if (keep || !ctx) return; try { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 30; g.gain.value = 0.0001; o.connect(g); g.connect(ctx.destination); o.start(); keep = o; } catch (e) {} }
  function unlock() {
    touched = true;
    if (!on) return;
    init(); if (!ctx) return;
    keepAlive();
    if (ctx.state !== "running") { try { ctx.resume(); var sb = ctx.createBufferSource(); sb.buffer = ctx.createBuffer(1, 1, 22050); sb.connect(ctx.destination); sb.start(0); } catch (e) {} }
    if (pend) retry();
  }
  function retry() {                                        /* bekleyen sesi, motor açılır açılmaz çal (0.6 sn'den eskiyse çalma) */
    [40, 150, 350].forEach(function (d) { setTimeout(function () {
      if (pend && ctx && ctx.state === "running") { var q = pend; pend = null; if (Date.now() - q.t < 600) try { S[q.n](q.o); } catch (e) {} }
    }, d); });
  }
  ["pointerdown", "touchend", "pointerup", "click", "keydown"].forEach(function (ev) { document.addEventListener(ev, unlock, { capture: true, passive: true }); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && ctx) try { ctx.suspend(); } catch (e) {} });
})();
