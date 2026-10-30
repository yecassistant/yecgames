/* YEC Games – ortak kod: servis çalışanı kaydı, dokunma korumaları, yaprak efekti (__burst), çiçek çizimleri (__flower), kaçan buton (__makeDodger). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var page = document.body.dataset.page;
  /* hızlandırıcı: sayfa geçişlerinde dosyalar telefondan gelsin (ana ekrandan açınca özellikle) – sw.js */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) && !/[?&]deneme/.test(location.search)) {
    addEventListener("load", function () { try { navigator.serviceWorker.register("sw.js").catch(function () {}); } catch (e) {} });
  }

  /* iPhone: çift dokunmayla yakınlaşmayı engelle (Safari user-scalable=no'yu dikkate almıyor; touch-action yetmezse JS yedeği).
     Yazı alanlarında devre dışı. Pinch'i de engelle. */
  var lastTouchEnd = 0, lastX = 0, lastY = 0, lastEl = null;
  function ctrlOf(t) { while (t && t !== document && !(t.tagName === "BUTTON" || t.tagName === "A")) t = t.parentNode; return t === document ? null : t; }
  document.addEventListener("touchend", function (e) {
    var tg = e.target, tag = tg && tg.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    var t = e.changedTouches && e.changedTouches[0], x = t ? t.clientX : 0, y = t ? t.clientY : 0, now = Date.now(), el = ctrlOf(tg) || tg;
    /* sadece aynı öğeye, aynı noktaya hızlı ikinci dokunuş (gerçek çift dokunma) engellenir; başka bir butona art arda dokunmak serbest */
    if (now - lastTouchEnd < 300 && el === lastEl && Math.abs(x - lastX) < 24 && Math.abs(y - lastY) < 24) e.preventDefault();
    lastTouchEnd = now; lastX = x; lastY = y; lastEl = el;
  }, { passive: false });
  document.addEventListener("gesturestart", function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener("touchmove", function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  /* yakınlaşmış kaldıysa sayfa açılırken ölçeği sıfırla */
  var vp = document.querySelector('meta[name="viewport"]');
  if (vp) addEventListener("pageshow", function () { var c = vp.getAttribute("content"); vp.setAttribute("content", c + ", minimum-scale=1"); setTimeout(function () { vp.setAttribute("content", c); }, 50); });

  /* Çift dokunma koruması: aynı buton/linke 350 ms içinde ikinci dokunuş yok sayılır
     (iPhone'da hızlı çift tıklama "Sonraki durak"ı iki kez tetikleyip soru atlatıyordu). */
  document.addEventListener("click", function (e) {
    var t = e.target; while (t && t !== document && !(t.tagName === "BUTTON" || (t.tagName === "A" && t.className.indexOf("btn") >= 0))) t = t.parentNode;
    if (!t || t === document) return;
    var now = Date.now();
    if (t.__lastTap && now - t.__lastTap < 350) { e.stopImmediatePropagation(); e.preventDefault(); return; }
    t.__lastTap = now;
  }, true);
  /* ---------- çiçek çizimleri ---------- */
  function lavender(c1, c2) {
    var s = '<svg viewBox="0 0 60 140" width="W" height="H" xmlns="http://www.w3.org/2000/svg"><path d="M30 140 Q28 80 30 20" stroke="#6fa77f" stroke-width="3" fill="none"/>';
    s += '<path d="M30 112 Q12 100 8 84 Q24 90 30 106Z" fill="#7fb68f"/><path d="M30 124 Q46 114 52 100 Q36 104 30 118Z" fill="#8cc29b"/>';
    for (var i = 0; i < 10; i++) {
      var y = 20 + i * 8.5, dx = (i % 2 ? 7 : -7), r = 6.2 - i * 0.25;
      s += '<ellipse cx="' + (30 + dx) + '" cy="' + y + '" rx="' + r + '" ry="' + (r * 1.35) + '" fill="' + (i % 2 ? c1 : c2) + '" transform="rotate(' + (dx > 0 ? 25 : -25) + ' ' + (30 + dx) + ' ' + y + ')"/>';
    }
    return s + '<ellipse cx="30" cy="12" rx="5" ry="8" fill="' + c1 + '"/></svg>';
  }
  function peony(c1, c2, c3) {
    var s = '<svg viewBox="0 0 120 120" width="W" height="H" xmlns="http://www.w3.org/2000/svg">', i;
    for (i = 0; i < 10; i++) s += '<ellipse cx="60" cy="30" rx="24" ry="30" fill="' + c1 + '" transform="rotate(' + (i * 36) + ' 60 60)"/>';
    for (i = 0; i < 8; i++) s += '<ellipse cx="60" cy="40" rx="17" ry="21" fill="' + c2 + '" transform="rotate(' + (i * 45 + 20) + ' 60 60)"/>';
    for (i = 0; i < 6; i++) s += '<ellipse cx="60" cy="49" rx="10" ry="13" fill="' + c3 + '" transform="rotate(' + (i * 60 + 5) + ' 60 60)"/>';
    return s + '<circle cx="60" cy="60" r="7" fill="' + c3 + '"/></svg>';
  }
  function lily(c1, c2) {
    var s = '<svg viewBox="0 0 120 120" width="W" height="H" xmlns="http://www.w3.org/2000/svg">', i;
    for (i = 0; i < 6; i++) {
      s += '<path d="M60 60 C46 40 50 14 60 4 C70 14 74 40 60 60Z" fill="' + c1 + '" transform="rotate(' + (i * 60) + ' 60 60)"/>';
      s += '<path d="M60 56 L60 18" stroke="' + c2 + '" stroke-width="2" stroke-dasharray="2 4" transform="rotate(' + (i * 60) + ' 60 60)"/>';
    }
    for (i = 0; i < 6; i++) s += '<line x1="60" y1="60" x2="60" y2="38" stroke="#9a6b3a" stroke-width="1.5" transform="rotate(' + (i * 60 + 30) + ' 60 60)"/><circle cx="60" cy="37" r="2.8" fill="#b8562b" transform="rotate(' + (i * 60 + 30) + ' 60 60)"/>';
    return s + '<circle cx="60" cy="60" r="6" fill="#bfe08a"/></svg>';
  }
  function leaf(c) {
    return '<svg viewBox="0 0 60 100" width="W" height="H" xmlns="http://www.w3.org/2000/svg"><path d="M30 98 C4 70 6 26 30 2 C54 26 56 70 30 98Z" fill="' + c + '"/><path d="M30 96 L30 10" stroke="#5a8f69" stroke-width="2"/></svg>';
  }
  var F = {
    lav: function () { return lavender("#9b7fd1", "#b9a1ea"); },
    lav2: function () { return lavender("#7d62c4", "#a58ae0"); },
    peo: function () { return peony("#f7a9c4", "#ec6f9a", "#d94f80"); },
    peo2: function () { return peony("#ffd0de", "#ff9ebd", "#f2709a"); },
    peo3: function () { return peony("#fde2c8", "#fbb98c", "#f08f5a"); },
    lil: function () { return lily("#ffd56b", "#e89a1c"); },
    lil2: function () { return lily("#ffffff", "#f39ab6"); },
    lil3: function () { return lily("#ff9fb8", "#d9406f"); },
    leaf: function () { return leaf("#8cc29b"); },
    leaf2: function () { return leaf("#6fa77f"); }
  };
  function svgEl(key, w, h) {
    var d = document.createElement("div");
    var img = new Image();
    img.alt = ""; img.decoding = "async"; img.draggable = false;
    img.width = Math.round(w); img.height = Math.round(h);
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(F[key]().replace('width="W"', 'width="' + w + '"').replace('height="H"', 'height="' + h + '"'));
    return img;
  }

  /* kenarlardaki çiçekler: telefonda az ve küçük, içeriğin üstüne binmesin */
  var phone = innerWidth < 520;
  var garden = document.createElement("div");
  garden.className = "garden"; garden.setAttribute("aria-hidden", "true");
  document.body.prepend(garden);
  (phone ? [
    ["peo2", { left: -34, top: -30 }, 84], ["lil", { right: -30, top: -26 }, 76],
    ["peo3", { left: -30, bottom: -34 }, 78], ["lav", { left: 34, bottom: -40 }, 30],
    ["peo", { right: -34, bottom: -34 }, 84], ["lav2", { right: 42, bottom: -40 }, 30]
  ] : [
    ["peo", { left: -40, top: -30 }, 140], ["lav", { left: 70, top: -20 }, 42], ["lil2", { left: 20, top: 80 }, 70],
    ["lil", { right: -30, top: -20 }, 115], ["peo2", { right: 60, top: 50 }, 80], ["lav2", { right: 18, top: -10 }, 40],
    ["peo3", { left: -40, bottom: -30 }, 130], ["lil3", { left: 70, bottom: 30 }, 82], ["lav", { left: 14, bottom: -20 }, 46],
    ["peo2", { right: -40, bottom: -30 }, 140], ["lil", { right: 70, bottom: 40 }, 76], ["lav2", { right: 112, bottom: -18 }, 44]
  ]).forEach(function (s, i) {
    var isLav = s[0].indexOf("lav") === 0, sz = s[2];
    var el = svgEl(s[0], sz, isLav ? sz * 2.3 : sz);
    Object.keys(s[1]).forEach(function (p) { el.style[p] = s[1][p] + "px"; });
    el.style.opacity = phone ? ".75" : ".92"; el.style.animationDelay = (-i * 0.7) + "s";
    garden.appendChild(el);
  });

  /* üstteki buket: yan yana dizilmiş, birbirine girmeyen bir çelenk */
  document.querySelectorAll(".bouquet").forEach(function (b) {
    var parts = [
      // [çiçek, sol, üst, genişlik, yükseklik, açı]
      ["leaf2", 82, 6, 40, 68, -30], ["leaf", 218, 6, 40, 68, 30],
      ["lav", 4, 14, 36, 84, -14], ["lav2", 300, 14, 36, 84, 14],
      ["lil", 38, 52, 76, 76, 0], ["lil3", 226, 52, 76, 76, 0],
      ["peo", 112, 22, 116, 116, 0],
      ["lil2", 96, 118, 48, 48, 0], ["peo3", 198, 118, 48, 48, 0]
    ];
    var scale = Math.min(1, b.clientWidth / 340);
    if (innerHeight < 700) scale = Math.min(scale, 0.8);
    if (page === "acik") scale = Math.min(scale, innerHeight < 700 ? 0.56 : 0.68);
    b.style.height = 170 * scale + "px";
    parts.forEach(function (p, i) {
      var el = svgEl(p[0], p[3] * scale, p[4] * scale);
      el.style.left = p[1] * scale + "px"; el.style.top = p[2] * scale + "px";
      el.style.setProperty("--r", p[5] + "deg"); el.style.animationDelay = (i * 0.07) + "s, " + (1 + i * 0.2) + "s";
      b.appendChild(el);
    });
  });

  /* ---------- yaprak yağmuru ---------- */
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cv = document.createElement("canvas"); cv.id = "petals"; document.body.appendChild(cv);
  var ctx = cv.getContext("2d"), P = [], raf = null, R = 1, lastT = 0;
  /* Hafif yaprak efekti: kısa ömür (≈1.5 sn), üst sınır (telefonda 40 yaprak), DPR 1, save/restore yok.
     Eski sürümde yapraklar ekranın çok üstünden yavaş düşüyor, 15 sn sürüyor ve üst üste binince telefonu kasıyordu. */
  var MAXP = innerWidth < 520 ? 40 : 70;
  function fit() {
    R = innerWidth < 520 ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(innerWidth * R); cv.height = Math.round(innerHeight * R);
    cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px";
  }
  fit(); addEventListener("resize", fit);
  var cols = ["#9b7fd1", "#b9a1ea", "#ec6f9a", "#f7a9c4", "#ffd56b", "#ffffff", "#ff9ebd", "#fbb98c"];
  function burst(n) {
    if (reduce) return;
    n = Math.round(n * (innerWidth < 520 ? 0.35 : 0.6));
    if (n < 4) n = 4;
    for (var i = 0; i < n; i++) P.push({ x: Math.random() * innerWidth, y: -16 - Math.random() * innerHeight * 0.12, s: 6 + Math.random() * 8,
      vy: 2.4 + Math.random() * 2.4, vx: -0.8 + Math.random() * 1.6, r: Math.random() * 6.28, vr: -0.08 + Math.random() * 0.16,
      c: cols[(Math.random() * cols.length) | 0], w: Math.random() * 6.28, life: 70 + Math.random() * 40 });
    if (P.length > MAXP) P.splice(0, P.length - MAXP);
    if (!raf) { lastT = 0; raf = requestAnimationFrame(loop); }
  }
  window.__burst = burst;
  window.__flower = svgEl;
  function loop(t) {
    var dt = lastT ? Math.min(2, (t - lastT) / 16.7) : 1; lastT = t;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    var keep = [], H = innerHeight + 24;
    for (var i = 0; i < P.length; i++) {
      var p = P[i];
      p.w += 0.05 * dt; p.x += (p.vx + Math.sin(p.w) * 0.9) * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.life -= dt;
      if (p.life <= 0 || p.y > H) continue;
      keep.push(p);
      var c = Math.cos(p.r), s = Math.sin(p.r);
      ctx.setTransform(c * R, s * R, -s * R, c * R, p.x * R, p.y * R);
      ctx.globalAlpha = p.life < 24 ? Math.max(0, p.life / 24) * 0.9 : 0.9;
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, p.s * 0.55, p.s, 0, 0, 6.28); ctx.fill();
    }
    P = keep;
    if (P.length) raf = requestAnimationFrame(loop);
    else { raf = null; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); }
  }

  /* ---------- kaçan buton: tıklanamaz "Hayır" ----------
     no: kaçan buton, yes: büyüyen buton, hint: alt satır, texts: butonun yazıları, hints: alt satır yazıları,
     yesTexts: {5: "...", 9: "..."} gibi adım→yazı, gone: kaçıp gidince yazılacak cümle */
  function makeDodger(no, yes, hint, texts, hints, yesTexts, gone) {
    var n = 0, last = 0;
    function growYes() {
      var k = Math.min(n, 6);
      yes.style.fontSize = (1.08 + k * 0.05) + "rem";
      yes.style.padding = (15 + k * 1.4) + "px " + (30 + k * 2) + "px";
      Object.keys(yesTexts).forEach(function (step) { if (n >= +step) yes.textContent = yesTexts[step]; });
      if (n >= 12) { no.hidden = true; hint.textContent = gone; }
    }
    function dodge(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      var now = Date.now(); if (now - last < 300) return; last = now;
      n++;
      if (no.classList.contains("parked")) {
        var r = no.getBoundingClientRect(); no.classList.remove("parked");
        no.style.left = r.left + "px"; no.style.top = r.top + "px"; void no.offsetWidth;
      }
      no.textContent = texts[(n - 1) % texts.length];
      try { if (navigator.vibrate) navigator.vibrate(18); } catch (err) {}
      var bw = no.offsetWidth, bh = no.offsetHeight, pad = 16;
      var yr = yes.getBoundingClientRect(), x, y, tries = 0;
      do {
        x = pad + Math.random() * Math.max(0, innerWidth - bw - pad * 2);
        y = pad + 40 + Math.random() * Math.max(0, innerHeight - bh - pad * 2 - 40);
        tries++;
      } while (tries < 20 && x < yr.right + 20 && x + bw > yr.left - 20 && y < yr.bottom + 20 && y + bh > yr.top - 20);
      no.style.left = x + "px"; no.style.top = y + "px";
      no.style.transform = "scale(" + Math.max(0.6, 1 - n * 0.04) + ") rotate(" + (Math.random() * 16 - 8) + "deg)";
      growYes();
      if (n < 12) hint.textContent = hints[Math.min(n, hints.length - 1)];
    }
    no.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") dodge(e); });
    no.addEventListener("pointerdown", dodge);
    no.addEventListener("touchstart", dodge, { passive: false });
    no.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); });
    no.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") dodge(e); });
  }
  window.__makeDodger = makeDodger;

  /* oyun bitti kartı: "… bak" düğmesinin yanına "Menüye dön" (iki kişilik oyunların hepsi aynı kalıbı kullanır) */
  (function () {
    var kapat = document.getElementById("doneClose"), yeni = document.getElementById("doneNew");
    var kart = document.getElementById("done");
    if (!kapat || !yeni || !kart || document.getElementById("doneMenu") || kart.querySelector('a[href="oyunlar.html"]')) return;
    var sira = document.createElement("div"); sira.className = "gkbtnrow gkbitsira";
    kapat.parentNode.insertBefore(sira, kapat); sira.appendChild(kapat);
    var m = document.createElement("a"); m.className = "gkghost"; m.id = "doneMenu"; m.href = "oyunlar.html"; m.textContent = "Menüye dön";
    sira.appendChild(m);
  })();   /* kase.html'deki hediye kutusunun "Hayır"ı da aynı mekanizmayı kullanır */

})();
