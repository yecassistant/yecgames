/* Yıkım – 3D kule kırma (Stack Ball tarzı). Çizim: three.js r149 (lib/three.min.js, siteye gömülü). Ses: yikim-ses.js (YkSes).
   Basılı tut → top aşağı iner, altındaki katı parçalar; bırak → zıplar. Siyah dilime çarparsa biter (alev modunda siyah da kırılır).
   Durmadan kırınca alev göstergesi dolar → ALEV: kısa süre her şeyi kırarsın. Kule bitince seviye atlarsın.
   Kırılma efektleri 3 türlü ve art arda aynısı gelmez: (1) dilimler savrulur, (2) küp kıvılcımlar saçılır, (3) halka dalgası + iri parçalar.
   Kayıt: yk_best (rekor puan, hesapla eşitlenir), yk_seviye (ulaşılan en yüksek seviye, eşitlenir), yk_lvl (bu cihazda kaldığın seviye). Test kancası: #test → window.__yk */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var THREE = window.THREE, cv = $("cv"), stage = $("stage");
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function snd(n, o) { if (window.YkSes) try { window.YkSes.play(n, o); } catch (e) {} }
  var renderer = null;
  try { if (!THREE) throw 0; renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: "high-performance" }); } catch (e) { renderer = null; }
  if (!renderer) { $("hata").hidden = false; $("intro").hidden = true; return; }

  /* ---- ölçüler ---- */
  var POLE_R = 0.5, R_IN = 0.56, R_OUT = 1.6, R_MID = 1.08, H = 0.24, PITCH = 0.34, S = 12, SEG = Math.PI * 2 / S, GAP = 0.025;
  var BALL_R = 0.19, G = 20, BOUNCE = 5.4, SMASH = 4.6, TWIST = 0.13;
  var BLACK = new THREE.Color("#1c1826");
  /* seviye paletleri: [halka üst rengi, halka alt rengi, top rengi, arka plan üst, arka plan alt, parlama] – modern, doygun ikililer */
  var PAL = [
    ["#ff7eb3", "#ff5c7a", "#2ee6ff", "#2a1a5e", "#120a2e", "#ff5c7a"],
    ["#a78bfa", "#6d4ae8", "#ffd93d", "#1c1a4a", "#0d0b26", "#8b6cff"],
    ["#ffd166", "#ff8e3c", "#3d63ff", "#3a1d3f", "#160a1c", "#ff8e3c"],
    ["#5ee6b8", "#1fb886", "#ff5c8a", "#0f2e3d", "#07171f", "#2bd8a2"],
    ["#7cc4ff", "#3a7bff", "#ff8a3c", "#111a46", "#070b22", "#4a8cff"],
    ["#ffb08a", "#ff6a3c", "#2ee6ff", "#2e1726", "#140912", "#ff6a3c"]
  ];

  /* ---- sahne ---- */
  var scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  scene.fog = new THREE.Fog(0x120a2e, 12, 30);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a1a4a, 0.55));
  var dl = new THREE.DirectionalLight(0xffffff, 0.75); dl.position.set(4, 7, 6); scene.add(dl);
  var dl2 = new THREE.DirectionalLight(0x9fb8ff, 0.3); dl2.position.set(-6, 2, -4); scene.add(dl2);        /* soğuk kenar ışığı */
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
  var tower = new THREE.Group(); scene.add(tower);

  /* dilim geometrisi: halkanın 1/12'si; şekil XY'de çizilip yatırılır (eksen Y) */
  function dilimShape(r0, r1, a0, a1) { var s = new THREE.Shape(); s.absarc(0, 0, r1, a0, a1, false); s.absarc(0, 0, r0, a1, a0, true); return s; }
  var segGeom = new THREE.ExtrudeGeometry(dilimShape(R_IN, R_OUT, GAP / 2, SEG - GAP / 2), { depth: H, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 1, curveSegments: 6 });
  segGeom.rotateX(-Math.PI / 2);                                          /* (x, y, z) → (x, z, -y): halka yatay, kalınlık yukarı */
  var C0 = new THREE.Vector3(R_MID * Math.cos(SEG / 2), H / 2, -R_MID * Math.sin(SEG / 2));   /* dilimin ağırlık merkezi (yerel) */
  var fragGeom = segGeom.clone(); fragGeom.translate(-C0.x, -C0.y, -C0.z);                    /* parçalar kendi merkezinde dönsün */
  var ringMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 34, specular: 0x3a3a3a });
  var poleTex = (function () { var c = document.createElement("canvas"); c.width = 4; c.height = 256; var x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "#ffffff"); g.addColorStop(0.5, "#f1ecff"); g.addColorStop(1, "#d9d2f2"); x.fillStyle = g; x.fillRect(0, 0, 4, 256); var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 6); return t; })();
  var poleMat = new THREE.MeshPhongMaterial({ map: poleTex, shininess: 12, specular: 0x222222 });
  var pole = null, base = null, rings = null, ringInfo = [];

  /* bitiş tabanı: damalı üst yüz */
  var damaTex = (function () { var c = document.createElement("canvas"); c.width = c.height = 128; var x = c.getContext("2d"); for (var i = 0; i < 8; i++) for (var j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? "#2b2233" : "#fffaf3"; x.fillRect(i * 16, j * 16, 16, 16); } var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t; })();
  var baseMats = [new THREE.MeshPhongMaterial({ color: 0xf2c35b, shininess: 20 }), new THREE.MeshPhongMaterial({ map: damaTex, shininess: 40 }), new THREE.MeshLambertMaterial({ color: 0xc99a3c })];
  /* yumuşak parlama dokusu (top halesi, çarpma flaşı) */
  var glowTex = (function () { var c = document.createElement("canvas"); c.width = c.height = 128; var x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();

  /* top + gölge + iz */
  var ballCol = new THREE.Color(0x2ee6ff);
  var ballMat = new THREE.MeshPhongMaterial({ color: 0x2ee6ff, shininess: 90, specular: 0xffffff, emissive: 0x0a3a44 });
  var ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 28, 18), ballMat); scene.add(ball);
  var haleMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x2ee6ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  var hale = new THREE.Sprite(haleMat); hale.scale.setScalar(BALL_R * 5); scene.add(hale);
  var flasMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  var flas = new THREE.Sprite(flasMat); flas.scale.setScalar(0.1); scene.add(flas); var flasT = 1;
  var golge = new THREE.Mesh(new THREE.CircleGeometry(BALL_R * 0.95, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  golge.rotation.x = -Math.PI / 2; scene.add(golge);
  var izler = [];
  for (var ii = 0; ii < 8; ii++) { var im = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x2ee6ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); im.scale.setScalar(BALL_R * (3.2 - ii * 0.3)); scene.add(im); izler.push(im); }

  /* ---- efekt havuzları ---- */
  var parcalar = [];                                                       /* (1) savrulan dilimler */
  for (var pi = 0; pi < 60; pi++) { var pm = new THREE.Mesh(fragGeom, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true })); pm.visible = false; scene.add(pm); parcalar.push({ m: pm, v: new THREE.Vector3(), w: new THREE.Vector3(), t: 0, omur: 0 }); }
  var KUP_N = 260, kupGeom = new THREE.BoxGeometry(0.13, 0.045, 0.09), kupMesh = new THREE.InstancedMesh(kupGeom, new THREE.MeshLambertMaterial({ color: 0xffffff }), KUP_N);   /* (2) konfeti pulları */
  kupMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); kupMesh.frustumCulled = false; scene.add(kupMesh);
  var kupler = [], SIFIR = new THREE.Matrix4().makeScale(0, 0, 0);
  for (var ki = 0; ki < KUP_N; ki++) { kupler.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), t: 0, omur: 0, s: 1 }); kupMesh.setMatrixAt(ki, SIFIR); kupMesh.setColorAt(ki, new THREE.Color(1, 1, 1)); }
  kupMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  var dalgalar = [];                                                       /* (3) halka dalgası */
  for (var di = 0; di < 5; di++) { var dm = new THREE.Mesh(new THREE.RingGeometry(R_OUT - 0.12, R_OUT + 0.06, 56, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); dm.rotation.x = -Math.PI / 2; dm.visible = false; scene.add(dm); dalgalar.push({ m: dm, t: 0, omur: 0 }); }
  var kupSira = 0, parcaSira = 0, dalgaSira = 0, sonEfekt = -1;

  /* ---- durum ---- */
  var W = 390, Hh = 700, camDist = 10, camY = 0;
  var level = Math.max(1, +ls("yk_lvl") || +ls("yk_seviye") || 1), best = +ls("yk_best") || 0, score = 0, levelStartScore = 0;
  var nRings = 0, top = 0, ballY = 1, vy = 0, holding = false, durum = "intro", seri = 0, ates = 0, atesli = false, omega = 1.6, sarsinti = 0, sonSek = 0, rekorDendi = false, bestStart = best;
  var bitisT = 0, olumT = 0;
  $("rekor").textContent = best;

  var _fit = "";
  function fit() {
    W = stage.clientWidth || innerWidth; Hh = stage.clientHeight || innerHeight;
    var pr = Math.min(window.devicePixelRatio || 1, 2), k = W + "x" + Hh + "@" + pr; if (k === _fit) return; _fit = k;
    renderer.setPixelRatio(pr);
    renderer.setSize(W, Hh, false);
    camera.aspect = W / Hh;
    var halfW = R_OUT + 0.45, tanV = Math.tan(camera.fov * Math.PI / 360);
    camDist = Math.max(7.2, Math.min(15, halfW / (tanV * camera.aspect)));
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", fit); addEventListener("orientationchange", function () { setTimeout(fit, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", fit);

  /* ---- kule kurulumu ---- */
  var tmpM = new THREE.Matrix4(), tmpC = new THREE.Color(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3(1, 1, 1);
  function ringY(i) { return -i * PITCH; }
  function kur() {
    if (rings) { tower.remove(rings); rings.dispose(); }
    if (pole) { tower.remove(pole); pole.geometry.dispose(); }
    if (base) { scene.remove(base); base.geometry.dispose(); }
    nRings = Math.min(96, 30 + level * 4); top = 0; seri = 0; ates = 0; atesli = false; ringInfo = [];
    omega = (1.45 + Math.min(1.25, level * 0.07)) * (level % 2 ? 1 : -1);
    tower.rotation.y = Math.random() * Math.PI * 2;
    var pal = PAL[(level - 1) % PAL.length], c1 = new THREE.Color(pal[0]), c2 = new THREE.Color(pal[1]);
    var olasilik = Math.min(0.62, 0.2 + level * 0.04), maxArk = Math.min(5, 2 + Math.floor(level / 2)), bas = Math.floor(Math.random() * S), adim = Math.random() < 0.5 ? 1 : -1;
    rings = new THREE.InstancedMesh(segGeom, ringMat, nRings * S); rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (var i = 0; i < nRings; i++) {
      var siyah = []; for (var k = 0; k < S; k++) siyah.push(false);
      if (i >= 3 && Math.random() < olasilik) {
        if (Math.random() < 0.7) bas = (bas + adim + S) % S;                /* siyahlar sarmal gibi kayar */
        var len = 1 + Math.floor(Math.random() * maxArk); for (var a = 0; a < len; a++) siyah[(bas + a) % S] = true;
        if (level >= 4 && Math.random() < 0.3) { var b2 = (bas + 6) % S, len2 = 1 + Math.floor(Math.random() * Math.min(3, maxArk)); for (var a2 = 0; a2 < len2; a2++) siyah[(b2 + a2) % S] = true; }
      }
      var renk = new THREE.Color().lerpColors(c1, c2, i / Math.max(1, nRings - 1)), tw = i * TWIST;
      if (i % 2) renk.offsetHSL(0, 0, 0.05);                                 /* kat kat hafif ton farkı (dilim dilim değil) */
      ringInfo.push({ siyah: siyah, renk: renk, tw: tw, kirik: false });
      for (var k2 = 0; k2 < S; k2++) {
        var idx = i * S + k2;
        tmpQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), tw + k2 * SEG); tmpV.set(0, ringY(i), 0); tmpM.compose(tmpV, tmpQ, tmpS);
        rings.setMatrixAt(idx, tmpM);
        rings.setColorAt(idx, siyah[k2] ? BLACK : renk);
      }
    }
    rings.instanceMatrix.needsUpdate = true; rings.instanceColor.needsUpdate = true;
    tower.add(rings);
    var poleH = nRings * PITCH + 20;
    pole = new THREE.Mesh(new THREE.CylinderGeometry(POLE_R, POLE_R, poleH, 32), poleMat); pole.position.y = H + 16 - poleH / 2; tower.add(pole);
    base = new THREE.Mesh(new THREE.CylinderGeometry(R_OUT + 0.15, R_OUT + 0.15, 0.5, 48), baseMats); base.position.y = ringY(nRings) - 0.25 + H; scene.add(base);
    ballY = H + BALL_R + 0.6; vy = 0; camY = ballY;
    ballCol.set(pal[2]);
    ball.visible = true; ball.scale.set(1, 1, 1); ballMat.color.copy(ballCol); ballMat.emissive.copy(ballCol).multiplyScalar(0.22); haleMat.color.copy(ballCol); haleMat.opacity = 0.5;
    scene.fog.color.set(pal[4]);
    stage.style.background = "radial-gradient(120% 70% at 50% 0%," + pal[3] + " 0%," + pal[4] + " 70%)";
    stage.style.setProperty("--yk-glow", pal[5]);
    $("lvA").textContent = level; $("lvB").textContent = level + 1; hud();
    ls("yk_lvl", level);
  }

  /* ---- topun altındaki dilim: gerçek dönüşümlerle (topa en yakın dilim merkezi) ---- */
  function altDilim(i) {
    var r = ringInfo[i], T = tower.rotation.y, enIyi = -1, enZ = -1e9;
    for (var k = 0; k < S; k++) { var g = r.tw + k * SEG + T, z = -C0.x * Math.sin(g) + C0.z * Math.cos(g), x = C0.x * Math.cos(g) + C0.z * Math.sin(g); var skor = z - Math.abs(x) * 0.001; if (skor > enZ) { enZ = skor; enIyi = k; } }
    return enIyi;
  }

  /* ---- efektler ---- */
  var yon = new THREE.Vector3();
  function efektSavrul(i, kac, guc) {
    var r = ringInfo[i], T = tower.rotation.y;
    for (var k = 0; k < S; k += (kac || 1)) {
      var p = parcalar[parcaSira++ % parcalar.length], g = r.tw + k * SEG + T;
      var cx = C0.x * Math.cos(g) + C0.z * Math.sin(g), cz = -C0.x * Math.sin(g) + C0.z * Math.cos(g);
      p.m.position.set(cx, ringY(i) + C0.y, cz); p.m.rotation.set(0, g, 0); p.m.visible = true;
      p.m.material.color.copy(r.siyah[k] ? BLACK : r.renk); p.m.material.opacity = 1;
      yon.set(cx, 0, cz).normalize();
      var hiz = (2.2 + Math.random() * 1.8) * (guc || 1);
      p.v.set(yon.x * hiz, 1.6 + Math.random() * 2.4, yon.z * hiz); p.w.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 9); p.t = 0; p.omur = 0.85 + Math.random() * 0.3;
    }
  }
  function efektKup(merkezY, renk, n, yaricap, hizCarpan, renk2) {
    for (var j = 0; j < n; j++) {
      var q = kupler[kupSira], idx = kupSira; kupSira = (kupSira + 1) % KUP_N;
      var a = Math.random() * Math.PI * 2, rr = (yaricap === undefined ? R_MID : yaricap) * (0.7 + Math.random() * 0.5);
      q.p.set(Math.cos(a) * rr, merkezY + (Math.random() - 0.3) * 0.2, Math.sin(a) * rr);
      var h = (2 + Math.random() * 4) * (hizCarpan || 1); q.v.set(Math.cos(a) * h, 1.5 + Math.random() * 3.5, Math.sin(a) * h);
      q.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); q.w.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
      q.t = 0; q.omur = 0.55 + Math.random() * 0.45; q.s = 0.6 + Math.random() * 0.9;
      tmpC.copy(renk2 && Math.random() < 0.4 ? renk2 : renk); tmpC.offsetHSL(0, 0, (Math.random() - 0.4) * 0.15); kupMesh.setColorAt(idx, tmpC);
    }
    kupMesh.instanceColor.needsUpdate = true;
  }
  function efektDalga(y, renk) {
    var d = dalgalar[dalgaSira++ % dalgalar.length]; d.m.position.y = y + H + 0.01; d.m.scale.set(0.75, 0.75, 1); d.m.material.color.copy(renk).lerp(new THREE.Color(1, 1, 1), 0.5); d.m.material.opacity = 0.9; d.m.visible = true; d.t = 0; d.omur = 0.5;
  }
  function kir(i) {
    var r = ringInfo[i]; r.kirik = true;
    for (var k = 0; k < S; k++) rings.setMatrixAt(i * S + k, SIFIR);
    rings.instanceMatrix.needsUpdate = true;
    var tur; do { tur = Math.floor(Math.random() * 3); } while (tur === sonEfekt);
    sonEfekt = tur;
    if (tur === 0) efektSavrul(i, 2, 0.9);
    else if (tur === 1) { efektKup(ringY(i) + H / 2, r.renk, 18, R_MID, 0.9, r.siyah.indexOf(true) >= 0 ? BLACK : null); efektSavrul(i, 6, 0.75); }
    else { efektDalga(ringY(i), r.renk); efektSavrul(i, 4, 1.15); }
    if (atesli) efektKup(ringY(i) + H, new THREE.Color("#ff8a3c"), 6, BALL_R * 2, 0.5, new THREE.Color("#ffd56b"));
    flasT = 0; flasMat.color.copy(r.renk).lerp(tmpC.set(0xffffff), 0.6); flas.position.set(0, ringY(i) + H + 0.05, R_MID);
    sarsinti = Math.max(sarsinti, 0.07);
    seri++; score += Math.min(12, seri) * (atesli ? 2 : 1);
    snd("kir", { seri: seri - 1, ates: atesli });
    if (!atesli) { ates = Math.min(1, ates + 1 / 13); if (ates >= 1) { atesli = true; snd("ates"); yaz("ALEV! 🔥"); } }
    if (seri === 15 || seri === 30 || seri === 50) yaz(seri === 15 ? "Harika!" : seri === 30 ? "Muhteşem!" : "Efsane!");
    if (!rekorDendi && bestStart > 0 && score > bestStart) { rekorDendi = true; yaz("Yeni rekor! 🏆"); snd("rekor"); }
    if (score > best) { best = score; ls("yk_best", best); }
    top = i + 1;
    hud();
  }
  var yaziT = 0;
  function yaz(t) { var el = $("yazi"); el.textContent = t; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on"); clearTimeout(yaziT); yaziT = setTimeout(function () { el.classList.remove("on"); }, 1200); }
  function hud() {
    $("puan").textContent = score; $("rekor").textContent = best;
    $("ilerleBar").style.transform = "scaleX(" + (nRings ? top / nRings : 0).toFixed(3) + ")";
    $("atesBar").style.transform = "scaleX(" + ates.toFixed(3) + ")"; $("ates").className = "ykates" + (atesli ? " yan" : "");
  }

  /* ---- ölüm / seviye ---- */
  function ol() {
    durum = "olum"; olumT = 0; holding = false; sarsinti = 0.35; snd("olum");
    efektKup(ballY, ballCol.clone(), 30, 0.1, 0.8, new THREE.Color("#ffffff"));
    ball.visible = false; hale.visible = false; izler.forEach(function (z) { z.material.opacity = 0; });
    setTimeout(function () {
      $("overKick").textContent = "Siyaha çarptın"; $("overPuan").textContent = score; $("overSeviye").textContent = level;
      $("overYuzde").textContent = Math.round(top / nRings * 100) + "%"; $("overRekor").textContent = best;
      $("over").hidden = false;
    }, 850);
  }
  function seviyeBitti() {
    durum = "bitis"; bitisT = 0; snd("seviye"); yaz("Seviye " + level + " tamam! ✨");
    var by = ringY(nRings) + H;
    for (var c = 0; c < 4; c++) efektKup(by + 0.3, new THREE.Color(PAL[c][0]), 22, R_OUT * 0.8, 1.2, new THREE.Color(PAL[c + 1][1]));
    level++; ls("yk_seviye", Math.max(level, +ls("yk_seviye") || 0)); ls("yk_lvl", level); levelStartScore = score;
  }
  function yeniden() { $("over").hidden = true; score = levelStartScore; rekorDendi = false; bestStart = best; kur(); durum = "oyun"; }

  /* ---- giriş ---- */
  function bas(e) {
    if (e && e.target && e.target.closest && e.target.closest("a, button, .ykover")) return;
    if (e && e.cancelable) e.preventDefault();
    if (durum === "intro") { $("intro").hidden = true; durum = "oyun"; }
    if (durum === "oyun") holding = true;
  }
  function birak() { if (holding && durum === "oyun" && vy <= 0) vy = BOUNCE * 0.55; holding = false; if (seri) seri = 0; }
  stage.addEventListener("pointerdown", bas);
  addEventListener("pointerup", birak); addEventListener("pointercancel", birak); addEventListener("blur", birak);
  addEventListener("keydown", function (e) { if (e.code === "Space" || e.key === " ") { e.preventDefault(); if (!e.repeat) bas(null); } });
  addEventListener("keyup", function (e) { if (e.code === "Space" || e.key === " ") birak(); });
  $("tekrar").onclick = function () { yeniden(); };
  (function () {
    var b = $("bSes"); function ciz() { b.classList.toggle("off", !(window.YkSes && window.YkSes.on())); }
    b.onclick = function (e) { e.stopPropagation(); if (window.YkSes) window.YkSes.toggle(); ciz(); }; setTimeout(ciz, 0);
  })();

  /* ---- döngü ---- */
  var lastT = 0, running = false, z0 = new THREE.Vector3();
  function adim(dt) {
    if (durum === "oyun" || durum === "intro" || durum === "bitis") tower.rotation.y += omega * dt;
    var topY = top < nRings ? ringY(top) + H : ringY(nRings) + H;        /* üstteki sağlam katın yüzeyi (yoksa taban) */
    if (durum === "oyun") {
      if (holding && top < nRings) {
        vy = -SMASH; ballY += vy * dt;
        var guvenlik = 0;
        while (top < nRings && ballY - BALL_R <= ringY(top) + H && guvenlik++ < 4) {
          var k = altDilim(top), siyah = ringInfo[top].siyah[k];
          if (siyah && !atesli) { ballY = ringY(top) + H + BALL_R; ol(); return; }
          kir(top);
        }
        if (atesli) { ates = Math.max(0, ates - dt * 0.42); if (ates <= 0) { atesli = false; } hud(); }
      } else {
        vy -= G * dt; ballY += vy * dt;
        if (!holding && !atesli && ates > 0) { ates = Math.max(0, ates - dt * 0.55); hud(); }
        if (!holding && atesli) { ates = Math.max(0, ates - dt * 0.9); if (ates <= 0) atesli = false; hud(); }
        if (ballY - BALL_R <= topY && vy < 0) {
          ballY = topY + BALL_R;
          if (top >= nRings) { seviyeBitti(); vy = BOUNCE * 0.8; }
          else { vy = BOUNCE; ball.scale.set(1.18, 0.78, 1.18); var t = performance.now(); if (t - sonSek > 260) { snd("sek"); sonSek = t; } }
        }
      }
    } else if (durum === "intro") {
      vy -= G * dt; ballY += vy * dt; if (ballY - BALL_R <= topY && vy < 0) { ballY = topY + BALL_R; vy = BOUNCE; ball.scale.set(1.18, 0.78, 1.18); }
    } else if (durum === "bitis") {
      bitisT += dt; vy -= G * dt; ballY += vy * dt; var by = ringY(nRings) + H; if (ballY - BALL_R <= by && vy < 0) { ballY = by + BALL_R; vy = BOUNCE * 0.7; }
      if (bitisT > 1.5) { kur(); durum = "oyun"; }
    } else if (durum === "olum") { olumT += dt; }
    /* top görünümü */
    ball.position.set(0, ballY, R_MID);
    ball.scale.x += (1 - ball.scale.x) * Math.min(1, dt * 12); ball.scale.y += (1 - ball.scale.y) * Math.min(1, dt * 12); ball.scale.z = ball.scale.x;
    ballMat.color.lerp(atesli ? tmpC.set(0xff6a2a) : ballCol, Math.min(1, dt * 8)); ballMat.emissive.lerp(atesli ? tmpC.set(0x8a2a00) : tmpC.copy(ballCol).multiplyScalar(0.22), Math.min(1, dt * 8));
    haleMat.color.lerp(atesli ? tmpC.set(0xff8a3c) : ballCol, Math.min(1, dt * 8));
    hale.position.copy(ball.position); hale.visible = ball.visible; var haleHedef = atesli ? 0.95 + Math.sin(performance.now() / 70) * 0.12 : (holding ? 0.75 : 0.5); haleMat.opacity += (haleHedef - haleMat.opacity) * Math.min(1, dt * 10); hale.scale.setScalar(BALL_R * (atesli ? 7 : 5));
    if (flasT < 1) { flasT = Math.min(1, flasT + dt * 5); flasMat.opacity = (1 - flasT) * 0.9; flas.scale.setScalar(0.6 + flasT * 2.6); flas.visible = true; } else flas.visible = false;
    golge.position.set(0, topY + 0.012, R_MID); var yuk = Math.max(0, ballY - BALL_R - topY); golge.material.opacity = ball.visible ? Math.max(0, 0.24 - yuk * 0.12) : 0; golge.scale.setScalar(1 + yuk * 0.25);
    /* iz: hızlı inişte arkada küçülen toplar */
    var izAcik = holding && durum === "oyun" && ball.visible;
    for (var z = 0; z < izler.length; z++) {
      var iz = izler[z]; iz.position.set(0, ballY + (z + 1) * 0.17, R_MID);
      iz.material.color.copy(ballMat.color); iz.material.opacity += ((izAcik ? 0.42 * (1 - z / izler.length) : 0) - iz.material.opacity) * Math.min(1, dt * 14); iz.visible = iz.material.opacity > 0.01;
    }
    /* parçalar */
    for (var p = 0; p < parcalar.length; p++) {
      var q = parcalar[p]; if (!q.m.visible) continue;
      q.t += dt; if (q.t >= q.omur) { q.m.visible = false; continue; }
      q.v.y -= 14 * dt; q.m.position.addScaledVector(q.v, dt); q.m.rotation.x += q.w.x * dt; q.m.rotation.y += q.w.y * dt; q.m.rotation.z += q.w.z * dt;
      q.m.material.opacity = Math.min(1, (q.omur - q.t) / 0.3);
      var e1 = q.t / q.omur, sc = e1 < 0.12 ? 1 + e1 * 1.2 : Math.max(0.05, 1.14 - (e1 - 0.12) * 1.2); q.m.scale.setScalar(sc);   /* önce hafif büyür sonra küçülerek kaybolur */
    }
    var kupDegisti = false;
    for (var c = 0; c < KUP_N; c++) {
      var u = kupler[c]; if (u.omur <= 0) continue;
      u.t += dt; kupDegisti = true;
      if (u.t >= u.omur) { u.omur = 0; kupMesh.setMatrixAt(c, SIFIR); continue; }
      u.v.y -= 12 * dt; u.p.addScaledVector(u.v, dt); u.r.x += u.w.x * dt; u.r.y += u.w.y * dt; u.r.z += u.w.z * dt;
      var s2 = u.s * (1 - u.t / u.omur); tmpQ.setFromEuler(u.r); tmpS.set(s2, s2, s2); tmpM.compose(u.p, tmpQ, tmpS); kupMesh.setMatrixAt(c, tmpM);
    }
    tmpS.set(1, 1, 1);
    if (kupDegisti) kupMesh.instanceMatrix.needsUpdate = true;
    for (var d = 0; d < dalgalar.length; d++) {
      var w = dalgalar[d]; if (!w.m.visible) continue; w.t += dt; if (w.t >= w.omur) { w.m.visible = false; continue; }
      var e = w.t / w.omur, g2 = 0.75 + (1 - Math.pow(1 - e, 3)) * 1.35; w.m.scale.set(g2, g2, 1); w.m.material.opacity = 0.9 * (1 - e) * (1 - e);
    }
    /* kamera */
    camY += (ballY - camY) * Math.min(1, dt * (holding ? 9 : 4));
    var sx = 0, sy = 0; if (sarsinti > 0) { sarsinti = Math.max(0, sarsinti - dt); sx = (Math.random() - 0.5) * sarsinti * 0.5; sy = (Math.random() - 0.5) * sarsinti * 0.5; }
    camera.position.set(sx, camY + camDist * 0.42 + sy, camDist);
    z0.set(0, camY - 1.15, 0); camera.lookAt(z0);
  }
  function loop(t) {
    if (!running) return;
    var dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016; lastT = t;
    adim(dt); renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  function basla() { if (!running) { running = true; lastT = 0; requestAnimationFrame(loop); } }
  document.addEventListener("visibilitychange", function () { if (document.hidden) { running = false; birak(); } else basla(); });

  fit(); kur(); basla();
  if (location.hash === "#test") window.__yk = {
    state: function () { return { durum: durum, level: level, top: top, nRings: nRings, score: score, best: best, ates: ates, atesli: atesli, ballY: ballY, holding: holding, seri: seri }; },
    alt: function () { return top < nRings ? { k: altDilim(top), siyah: ringInfo[top].siyah[altDilim(top)] } : null; },
    siyahsiz: function () { ringInfo.forEach(function (r) { r.siyah = r.siyah.map(function () { return false; }); }); },
    hepsiSiyah: function (i) { ringInfo[i].siyah = ringInfo[i].siyah.map(function () { return true; }); for (var k = 0; k < S; k++) rings.setColorAt(i * S + k, BLACK); rings.instanceColor.needsUpdate = true; },
    bas: function () { bas(null); }, birak: birak, kur: function (l) { if (l) level = l; kur(); }, ates: function () { ates = 1; atesli = true; },
    renderer: renderer
  };
})();
