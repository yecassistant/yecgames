/* Kelime Bahçesi – ses efektleri (ayrı modül)
   KALDIRMAK İÇİN: kelime.html'deki <script src="kelime-ses.js"> satırını silmek yeterli; oyun sessiz çalışmaya devam eder.
   Sadece 4 an: kelime bulununca "tın", bonus kelimede iki notalık parıltı, yanlış kelimede çok kısık "pıt", bölüm sonu / rozette kısa çan melodisi.
   Sesler tarayıcıda anlık üretilir (dosya yok). Kapatma: Bonus'un yanındaki hoparlör; tercih kb_ses (1/0). iPhone sessiz moddayken iOS çalmaz. */
(function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  var on = true, ctx = null, master = null, touched = false, n = 0;
  try { on = localStorage.getItem("kb_ses") !== "0"; } catch (e) {}
  var VOL = 0.5;
  var P = [0, 2, 4, 7, 9, 12, 14, 16];                     /* pentatonik: hep uyumlu, her seferinde biraz farklı nota */
  function f(semi) { return 659.25 * Math.pow(2, semi / 12); }   /* E5 tabanlı, yumuşak */
  function init() {
    if (ctx || !on) return;
    try {
      try { ctx = new AC({ latencyHint: "interactive" }); } catch (e1) { ctx = new AC(); }   /* en düşük gecikme */
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6;
      master = ctx.createGain(); master.gain.value = VOL; master.connect(comp); comp.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }
  function ready() { if (!on || !touched) return false; init(); if (!ctx) return false; if (ctx.state !== "running") { try { ctx.resume(); } catch (e) {} return false; } return true; }
  function tone(type, hz, t, a, peak, dec, glide) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(hz, t); if (glide) o.frequency.exponentialRampToValueAtTime(hz * glide, t + a + dec);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + a + dec + 0.05);
  }
  function pick() { return P[Math.floor(Math.random() * 5)]; }
  var S = {
    /* kelime bulununca: kısa, tatlı "tın" (çan tınısı: ana ton + hafif üst ton) */
    found: function () { var t = ctx.currentTime, s = pick(); tone("sine", f(s), t, 0.006, 0.09, 0.42); tone("sine", f(s) * 2.01, t, 0.004, 0.025, 0.25); },
    /* bonus: iki notalık parıltı */
    bonus: function () { var t = ctx.currentTime, s = pick(); tone("triangle", f(s + 7), t, 0.005, 0.05, 0.28); tone("triangle", f(s + 12), t + 0.09, 0.005, 0.05, 0.38); tone("sine", f(s + 24), t + 0.09, 0.003, 0.012, 0.2); },
    /* yanlış: neredeyse duyulmayan, kısa "pıt" */
    wrong: function () { var t = ctx.currentTime; tone("sine", 260, t, 0.003, 0.03, 0.07, 0.8); },
    /* bölüm sonu: kısa çan melodisi (3 nota, her bölümde küçük farkla) */
    level: function () { var t = ctx.currentTime, b = [[0, 4, 7], [2, 7, 9], [0, 7, 12], [4, 7, 12]][n++ % 4]; b.forEach(function (s, i) { tone("sine", f(s), t + i * 0.13, 0.006, 0.06, 0.55); tone("sine", f(s) * 2, t + i * 0.13, 0.004, 0.012, 0.3); }); },
    /* rozet: biraz daha parlak, 4 notalık çan */
    rozet: function () { var t = ctx.currentTime; [0, 4, 7, 12].forEach(function (s, i) { tone("triangle", f(s), t + i * 0.12, 0.006, 0.06, 0.6); tone("sine", f(s) * 2, t + i * 0.12, 0.004, 0.015, 0.35); }); }
  };
  window.KbSes = { play: function (name) { if (!S[name]) return; if (!ready()) { if (on) { pend = { n: name, t: Date.now() }; retry(); } return; } try { S[name](); } catch (e) {} }, on: function () { return on; } };

  /* hoparlör butonu: "Bonus" kutusunun soluna küçük bir buton */
  var bonus = document.getElementById("bonusNo"), span = bonus && bonus.parentNode;
  if (span && span.parentNode) {
    var row = document.createElement("div"); row.className = "ksesrow";
    var b = document.createElement("button"); b.type = "button"; b.className = "kses"; b.id = "bSes";
    function draw() { b.textContent = on ? "🔊" : "🔇"; b.setAttribute("aria-label", on ? "Sesi kapat" : "Sesi aç"); b.classList.toggle("off", !on); }
    b.onclick = function () { on = !on; try { localStorage.setItem("kb_ses", on ? "1" : "0"); } catch (e) {} if (!on && ctx) try { ctx.suspend(); } catch (e) {} draw(); if (on) { touched = true; window.KbSes.play("found"); } };
    span.parentNode.insertBefore(row, span); row.appendChild(b); row.appendChild(span); draw();
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
