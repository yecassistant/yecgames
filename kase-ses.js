/* Meyve Kasesi – ses efektleri (ayrı modül)
   KALDIRMAK İÇİN: kase.html'deki <script src="kase-ses.js"> satırını silmek yeterli; oyun sessiz çalışmaya devam eder.
   Sesler: meyve düşünce çok hafif "tup", birleşince baloncuk gibi "pop" (meyve büyüdükçe kalınlaşır, kombo yaptıkça incelir),
   sürpriz meyvede parıltı, iki kalp birleşince sufle melodisi (animasyonla aynı anda), rekor kırınca iki nota, kase taşınca yumuşak iniş.
   Sesler tarayıcıda anlık üretilir (dosya yok). Kapatma: kasenin sol altındaki hoparlör; tercih pm_ses (1/0). iPhone sessiz moddayken iOS çalmaz. */
(function () {
  "use strict";
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  var on = true, ctx = null, master = null, touched = false, lastPop = -1;
  try { on = localStorage.getItem("pm_ses") !== "0"; } catch (e) {}
  var VOL = 0.5;
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
  function semi(f, s) { return f * Math.pow(2, s / 12); }
  var S = {
    /* meyve düşünce: çok hafif, kısa "tup" */
    drop: function () { var t = ctx.currentTime; tone("sine", 430 * (0.96 + Math.random() * 0.08), t, 0.004, 0.032, 0.09, 0.62); },
    /* birleşince: baloncuk "pop" — yükselen kısa ton; büyük meyvede biraz gövde, komboda ince parıltı */
    merge: function (o) {
      var t = ctx.currentTime, L = (o && o.L) || 1, c = Math.min(6, (o && o.c) || 1);
      if (t - lastPop < 0.04) return; lastPop = t;                       /* zincirleme birleşmede üst üste binmesin */
      var f = 1046.5 * Math.pow(2, -(L - 1) * 1.6 / 12) * Math.pow(2, (c - 1) * 2 / 12) * (0.985 + Math.random() * 0.03);
      tone("sine", f * 0.72, t, 0.004, 0.1, 0.13, 1.6);
      if (L >= 5) tone("triangle", f / 2, t, 0.006, 0.035, 0.2, 0.9);
      if (c >= 2) tone("sine", f * 2, t + 0.05, 0.003, 0.025, 0.18);
    },
    /* sürpriz meyve (muffin, tost, kalp): yukarı doğru parıltı */
    gizli: function () { var t = ctx.currentTime; [0, 7, 12, 19].forEach(function (s, i) { tone("triangle", semi(1318.5, s), t + 0.08 + i * 0.07, 0.004, 0.04, 0.3); }); },
    /* iki kalp → büyük boy sufle: animasyonla aynı zamanlama */
    sufle: function () {
      var t = ctx.currentTime, i;
      tone("sine", 1568, t + 0.27, 0.003, 0.05, 0.5); tone("sine", 2093, t + 0.29, 0.003, 0.035, 0.45);                 /* parlama */
      tone("sine", 220, t + 0.62, 0.05, 0.045, 0.45, 2.4);                                                               /* sufle kabarır */
      [0, 4, 7, 12].forEach(function (s, k) { var tt = t + 0.68 + k * 0.13; tone("sine", semi(523.25, s), tt, 0.006, 0.08, 0.6); tone("sine", semi(1046.5, s), tt, 0.004, 0.02, 0.35); });
      [0, 4, 7].forEach(function (s) { tone("triangle", semi(523.25, s), t + 1.24, 0.03, 0.022, 1.1); });                  /* yumuşak akor */
      tone("sine", 620, t + 1.41, 0.003, 0.07, 0.12, 1.7);                                                               /* çilek "plop" */
      for (i = 0; i < 6; i++) tone("sine", 2600 + Math.random() * 1400, t + 1.35 + i * 0.12 + Math.random() * 0.05, 0.002, 0.008, 0.05);   /* pudra şekeri */
      tone("sine", 1975.5, t + 3.18, 0.003, 0.035, 0.3); tone("sine", 2637, t + 3.26, 0.003, 0.025, 0.3);                 /* zincire yerleşir */
    },
    /* yeni rekor: iki nota */
    rekor: function () { var t = ctx.currentTime; tone("sine", 783.99, t, 0.005, 0.07, 0.35); tone("sine", 1046.5, t + 0.12, 0.005, 0.08, 0.6); tone("sine", 2093, t + 0.12, 0.003, 0.015, 0.4); },
    /* kase taştı: yumuşak, üzmeyen iniş */
    bitti: function () { var t = ctx.currentTime; tone("sine", 659.25, t, 0.01, 0.05, 0.35); tone("sine", 523.25, t + 0.18, 0.01, 0.045, 0.4); tone("sine", 440, t + 0.36, 0.01, 0.04, 0.6); }
  };
  window.PmSes = { play: function (n, o) { if (!S[n]) return; if (!ready()) { if (on) { pend = { n: n, o: o, t: Date.now() }; retry(); } return; } try { S[n](o); } catch (e) {} }, on: function () { return on; } };

  /* hoparlör butonu: kasenin sol alt köşesi (kasenin kavisli dibinin dışında kalan boş köşe; meyve oraya düşmez) */
  var wrap = document.getElementById("bowlwrap");
  if (wrap) {
    var b = document.createElement("button"); b.type = "button"; b.className = "pmses"; b.id = "bSes";
    var ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11"/></svg>';
    var ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
    var draw = function () { b.innerHTML = on ? ICON_ON : ICON_OFF; b.setAttribute("aria-label", on ? "Sesi kapat" : "Sesi aç"); b.classList.toggle("off", !on); };
    b.onclick = function () { on = !on; try { localStorage.setItem("pm_ses", on ? "1" : "0"); } catch (e) {} if (!on && ctx) try { ctx.suspend(); } catch (e) {} draw(); if (on) { touched = true; window.PmSes.play("merge", { L: 3, c: 1 }); } };
    wrap.appendChild(b); draw();
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
