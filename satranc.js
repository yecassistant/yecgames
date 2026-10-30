/* Satranç – iki kişilik, sıra tabanlı (Firestore satranc/mac ve satranc/seri). Kurallar satranc-motor.js'de.
   mac = { n, v, beyaz (uid), siyah (uid), hamleler ["e2e4", …], fen, sira (uid), bitti, sonuc ""|"mat"|"pat"|"pes"|"anlasma"|"yetersiz"|"50"|"tekrar", kazanan uid|null, teklif uid|"", t }
   Hamle tek yazımla (işlem içinde doğrulanarak) gider; rakibin hamlesi gelince taş kayarak oynar. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var M = window.SatrancMotor;
  var ME = null, OTHER = null, ADLAR = {}, KUL = {}, db = null, ref = null, seriRef = null, G = null, P = null, hazirMi = false, digerAd = "Rakip", dinliyor = false;
  var sel = -1, hedef = [], renk = "w", seen = -1, bittiGosterildi = -1, seriYazildi = -1, yaziyor = false, seri = null, bitirenBenim = false, ucusta = false;
  var AD_TAS = { p: "Piyon", n: "At", b: "Fil", r: "Kale", q: "Vezir", k: "Şah" }, DEGER = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  function snd(n) { if (window.StSes) try { window.StSes.play(n); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function sonUnlu(ad) { var m = String(ad).toLowerCase().match(/[aeıioöuü](?![\s\S]*[aeıioöuü])/); return m ? m[0] : "a"; }
  function ekDe(ad) { var v = sonUnlu(ad); return ad + "'" + (/[fstkçşhp]$/i.test(ad) ? "t" : "d") + (/[aıou]/.test(v) ? "a" : "e"); }
  function ekIn(ad) { var v = sonUnlu(ad), h = /[aı]/.test(v) ? "ı" : /[ou]/.test(v) ? "u" : /[öü]/.test(v) ? "ü" : "i"; return ad + "'" + (/[aeıioöuü]$/i.test(ad) ? "n" : "") + h + "n"; }
  function ekI(ad) { var v = sonUnlu(ad), h = /[aı]/.test(v) ? "ı" : /[ou]/.test(v) ? "u" : /[öü]/.test(v) ? "ü" : "i"; return ad + "'" + (/[aeıioöuü]$/i.test(ad) ? "y" : "") + h; }
  function tasSvg(p) { return '<svg class="' + (M.beyazMi(p) ? "pw" : "pb") + '" viewBox="0 0 100 100" aria-hidden="true"><use href="#pz-' + p.toLowerCase() + '"/></svg>'; }

  /* ---- tahta ---- */
  var board = $("board"), wrap = $("wrap"), stage = $("stage"), kareler = [];
  for (var i = 0; i < 64; i++) { var b = document.createElement("button"); b.type = "button"; b.className = "stsq"; b.setAttribute("data-d", i); board.appendChild(b); kareler.push(b); }
  function fit() {
    var vh = (window.visualViewport && window.visualViewport.height) || innerHeight;
    var bs = getComputedStyle(document.body), pt = parseFloat(bs.paddingTop) || 0, pb = parseFloat(bs.paddingBottom) || 0;
    stage.style.height = Math.max(320, vh - pt - pb) + "px";
    var w = wrap.clientWidth, h = wrap.clientHeight, s = Math.floor(Math.min(w, h) / 8);
    board.style.setProperty("--st-k", Math.max(30, s) + "px");
  }
  addEventListener("resize", fit); addEventListener("orientationchange", function () { setTimeout(fit, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", fit);
  fit();
  function gor(i) { return renk === "b" ? 63 - i : i; }         /* tahta karesi → ekran yuvası */
  function sahtaKare() { if (!P) return -1; var white = P.st.w === "w"; return M.sahta(P.st, white) ? M.sahKaresi(P.st.b, white) : -1; }
  function ciz() {
    if (!P) return;
    var b = P.st.b, benim = G && !G.bitti && G.sira === ME && !yaziyor && !ucusta, son = P.son, chk = sahtaKare();
    for (var i = 0; i < 64; i++) {
      var d = gor(i), k = kareler[d], p = b[i], h = hedef.indexOf(i) >= 0;
      var cls = "stsq " + ((((i >> 3) + (i & 7)) & 1) ? "d" : "l") + (i === sel ? " sel" : "") + (h ? (p || (P.st.b[sel] && P.st.b[sel].toLowerCase() === "p" && (i & 7) !== (sel & 7)) ? " cap" : " hint") : "") + (son && (son.f === i || son.t === i) ? " last" : "") + (chk === i ? " chk" : "");
      var html = p ? tasSvg(p) : "";
      if (d >= 56) html += '<i class="kf">' + "abcdefgh".charAt(i & 7) + "</i>";
      if (d % 8 === 0) html += '<i class="cr">' + (8 - (i >> 3)) + "</i>";
      if (k.className !== cls) k.className = cls;
      if (k.getAttribute("data-h") !== html) { k.innerHTML = html; k.setAttribute("data-h", html); }
      k.setAttribute("data-i", i);
      k.disabled = !benim;
    }
    /* oyuncu çubukları, sıra, alınan taşlar */
    var beyazBen = renk === "w";
    $("clrMe").className = "stclr " + (beyazBen ? "w" : "b"); $("clrOther").className = "stclr " + (beyazBen ? "b" : "w");
    alinanlar();
    var kalan = "";
    if (G.bitti) { $("turnTxt").textContent = sonucBaslik(true); $("turnSub").textContent = "oyun bitti"; }
    else if (G.sira === ME) { $("turnTxt").textContent = "Sıra sende"; $("turnSub").textContent = P.durum === "sah" ? "şahtasın!" : sel >= 0 ? "kareye dokun" : "taşa dokun"; }
    else { $("turnTxt").textContent = "Sıra " + (ADLAR[OTHER] ? ekDe(ADLAR[OTHER]) : "onda"); $("turnSub").textContent = P.durum === "sah" ? "şah çektin" : "bekliyorsun"; }
    $("turn").className = "stturn" + (G.bitti ? "" : G.sira === ME ? " me" : " ot");
    $("pMe").classList.toggle("on", !G.bitti && G.sira === ME); $("pOther").classList.toggle("on", !G.bitti && G.sira === OTHER);
    hamleListesi();
    /* düğmeler */
    var aktif = G && !G.bitti && OTHER;
    $("btns").hidden = !aktif || G.teklif === OTHER; $("offer").hidden = !(aktif && G.teklif === OTHER);
    if (aktif) { $("bDraw").disabled = G.teklif === ME; $("bDraw").textContent = G.teklif === ME ? "Teklif gönderildi" : "Berabere teklif et"; $("offerTxt").textContent = (ADLAR[OTHER] || "Rakip") + " berabere teklif ediyor."; }
  }
  function alinanlar() {
    var b = P.st.b, say = { w: {}, b: {} }, i, p;
    for (i = 0; i < 64; i++) { p = b[i]; if (p) say[M.beyazMi(p) ? "w" : "b"][p.toLowerCase()] = (say[M.beyazMi(p) ? "w" : "b"][p.toLowerCase()] || 0) + 1; }
    var ilk = { p: 8, n: 2, b: 2, r: 2, q: 1 }, puan = { w: 0, b: 0 };
    function liste(renkAlan) {                                            /* renkAlan'ın aldığı taşlar = karşı rengin eksikleri */
      var kars = renkAlan === "w" ? "b" : "w", html = "";
      ["q", "r", "b", "n", "p"].forEach(function (t) { var n = Math.max(0, ilk[t] - (say[kars][t] || 0)); puan[renkAlan] += n * DEGER[t]; for (var j = 0; j < n; j++) html += tasSvg(kars === "w" ? t.toUpperCase() : t); });
      return html;
    }
    var hm = liste(renk), ho = liste(renk === "w" ? "b" : "w"), fark = puan[renk] - puan[renk === "w" ? "b" : "w"];
    $("capMe").innerHTML = hm + (fark > 0 ? "<b>+" + fark + "</b>" : ""); $("capOther").innerHTML = ho + (fark < 0 ? "<b>+" + (-fark) + "</b>" : "");
  }
  function hamleListesi() {
    var el = $("moves"), s = P.san, html = "";
    for (var i = 0; i < s.length; i++) html += (i % 2 === 0 ? '<i>' + (i / 2 + 1) + ".</i>" : "") + '<span' + (i === s.length - 1 ? ' class="on"' : "") + ">" + esc(s[i]) + "</span>";
    el.innerHTML = html || '<em>Henüz hamle yok.</em>'; el.scrollLeft = el.scrollWidth;
  }
  function msg(t, kalici) { var m = $("msg"); m.textContent = t; clearTimeout(msg.t); if (!kalici) msg.t = setTimeout(function () { m.textContent = ""; }, 2600); }

  /* ---- dokunma ---- */
  board.addEventListener("click", function (e) {
    var k = e.target && e.target.closest ? e.target.closest("button.stsq") : null; if (!k || k.disabled) return;
    tikla(+k.getAttribute("data-i"));
  });
  function tikla(i) {
    if (!G || G.bitti || G.sira !== ME || yaziyor || ucusta || !P) return;
    var p = P.st.b[i], benimTas = p && (M.beyazMi(p) === (renk === "w"));
    if (sel >= 0 && hedef.indexOf(i) >= 0) {
      var secenek = P.legal.filter(function (m) { return m.f === sel && m.t === i; });
      if (secenek.length > 1) { terfiSor(secenek); return; }
      hamleYap(secenek[0]); return;
    }
    if (benimTas) {
      if (sel === i) { sel = -1; hedef = []; ciz(); return; }
      sel = i; hedef = P.legal.filter(function (m) { return m.f === i; }).map(function (m) { return m.t; });
      if (!hedef.length) msg(AD_TAS[p.toLowerCase()] + " şu an oynayamaz."); else snd("select");
      ciz(); return;
    }
    if (sel >= 0) { sel = -1; hedef = []; ciz(); }
  }
  function terfiSor(secenek) {
    var row = $("promoRow"); row.innerHTML = "";
    ["q", "r", "b", "n"].forEach(function (t) {
      var m = null; for (var i = 0; i < secenek.length; i++) if (secenek[i].p === t) m = secenek[i];
      if (!m) return;
      var b = document.createElement("button"); b.type = "button"; b.className = "stpromob"; b.innerHTML = tasSvg(renk === "w" ? t.toUpperCase() : t) + "<span>" + AD_TAS[t] + "</span>";
      b.onclick = function () { $("promo").hidden = true; hamleYap(m); };
      row.appendChild(b);
    });
    $("promo").hidden = false;
  }
  /* hamle: önce yerelde oyna (hız hissi), sonra işlemle yaz; yazılamazsa geri al */
  function hamleYap(m) {
    var txt = M.hamleYaz(m), onceki = P, yeniListe = (G.hamleler || []).concat([txt]), yeni = M.oyna(yeniListe);
    if (!yeni) { msg("Bu hamle olmuyor."); return; }
    sel = -1; hedef = []; yaziyor = true; seen = yeniListe.length;
    var sonuc = sonucHesapla(yeni.durum, ME);
    ucus(m.f, m.t, function () { P = yeni; ciz(); });
    snd(yeni.durum === "mat" ? "win" : yeni.durum === "sah" ? "check" : m.x ? "capture" : "move");
    if (yeni.durum === "sah") msg("Şah!"); else if (m.k) msg("Rok."); else if (m.e) msg("Geçerken aldın."); else if (m.p) msg(AD_TAS[m.p] + " oldu.");
    db.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        var d = snap.data(); if (!d || d.bitti || d.sira !== ME || d.v !== G.v) throw new Error("sira");
        var r = M.oyna((d.hamleler || []).concat([txt])); if (!r) throw new Error("gecersiz");
        var upd = { hamleler: (d.hamleler || []).concat([txt]), v: d.v + 1, sira: OTHER, teklif: "", fen: M.fenYaz(r.st), t: firebase.firestore.FieldValue.serverTimestamp() };
        var s = sonucHesapla(r.durum, ME); if (s) { upd.bitti = true; upd.sonuc = s.sonuc; upd.kazanan = s.kazanan; }
        tx.set(ref, upd, { merge: true });
      });
    }).then(function () { yaziyor = false; if (sonuc) bitirenBenim = true; })
      .catch(function (e) { yaziyor = false; P = onceki; ciz(); msg(String(e && e.message) === "sira" ? "Sıra sende değil ya da tahta değişti." : "Bağlantı kurulamadı, tekrar dene."); });
  }
  function sonucHesapla(durum, oynayan) {
    if (durum === "mat") return { sonuc: "mat", kazanan: oynayan };
    if (durum === "pat" || durum === "yetersiz" || durum === "50" || durum === "tekrar") return { sonuc: durum, kazanan: null };
    return null;
  }
  /* taş kayışı: f → t yuvaları arasında klon uçar */
  function ucus(f, t, sonra) {
    var a = kareler[gor(f)], b = kareler[gor(t)], svg = a.querySelector("svg.pw, svg.pb");
    if (!svg) { sonra(); return; }
    var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), rw = wrap.getBoundingClientRect();
    var fly = document.createElement("div"); fly.className = "stfly"; fly.innerHTML = svg.outerHTML;
    fly.style.width = ra.width + "px"; fly.style.height = ra.height + "px"; fly.style.left = (ra.left - rw.left) + "px"; fly.style.top = (ra.top - rw.top) + "px";
    wrap.appendChild(fly); svg.style.visibility = "hidden"; ucusta = true;
    requestAnimationFrame(function () { requestAnimationFrame(function () { fly.style.transform = "translate(" + (rb.left - ra.left) + "px," + (rb.top - ra.top) + "px)"; }); });
    setTimeout(function () { if (fly.parentNode) fly.parentNode.removeChild(fly); ucusta = false; sonra(); }, 240);
  }

  /* ---- teklif / pes ---- */
  $("bDraw").onclick = function () {
    if (!G || G.bitti || G.teklif === ME) return;
    ref.set({ teklif: ME, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).then(function () { msg("Berabere teklifi gönderildi."); }).catch(function () { msg("Gönderilemedi."); });
  };
  $("bAccept").onclick = function () {
    if (!G || G.bitti || G.teklif !== OTHER) return;
    bitirenBenim = true;
    ref.set({ bitti: true, sonuc: "anlasma", kazanan: null, teklif: "", v: (G.v || 0) + 1, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () { bitirenBenim = false; msg("Olmadı, tekrar dene."); });
  };
  $("bDecline").onclick = function () { if (!G || G.teklif !== OTHER) return; ref.set({ teklif: "", t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () {}); };
  $("bResign").onclick = function () { if (!G || G.bitti) return; $("confirm").hidden = false; };
  $("confirmNo").onclick = function () { $("confirm").hidden = true; };
  $("confirmYes").onclick = function () {
    $("confirm").hidden = true; if (!G || G.bitti) return; bitirenBenim = true;
    ref.set({ bitti: true, sonuc: "pes", kazanan: OTHER, teklif: "", v: (G.v || 0) + 1, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () { bitirenBenim = false; msg("Olmadı, tekrar dene."); });
  };

  /* ---- yeni oyun ---- */
  function yeniOyun() {
    if (!OTHER) { msg("Arkadaşın henüz odaya katılmadı.", true); return; }
    $("startGo").disabled = true; $("doneNew").disabled = true;
    db.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        var d = snap.exists ? snap.data() : null;
        if (d && !d.bitti) return;
        var beyaz = d ? (d.siyah === ME || d.siyah === OTHER ? d.siyah : ME) : ME, siyah = beyaz === ME ? OTHER : ME;
        tx.set(ref, { n: (d && d.n || 0) + 1, v: 1, beyaz: beyaz, siyah: siyah, hamleler: [], fen: M.BASLANGIC, sira: beyaz, bitti: false, sonuc: "", kazanan: null, teklif: "", t: firebase.firestore.FieldValue.serverTimestamp() });
      });
    }).then(function () { $("startGo").disabled = false; $("doneNew").disabled = false; $("start").hidden = true; $("done").hidden = true; })
      .catch(function () { $("startGo").disabled = false; $("doneNew").disabled = false; msg("Kurulamadı, tekrar dene."); });
  }
  $("startGo").onclick = yeniOyun; $("doneNew").onclick = yeniOyun;
  $("doneClose").onclick = function () { $("done").hidden = true; };
  $("bHelp").onclick = function () { $("help").hidden = false; };
  $("helpGo").onclick = function () { $("help").hidden = true; try { localStorage.setItem("st_help", "1"); } catch (e) {} };
  function baslatKarti() {
    if (OTHER) { $("startTitle").textContent = "Hazır mısın?"; $("startText").textContent = "Oyunu kuran beyaz oynar, ilk hamle onun. Sonraki oyunlarda renkler değişir."; $("startGo").disabled = false; }
    else { $("startTitle").textContent = "Arkadaşın henüz odada değil"; $("startText").textContent = "Oda kodunu ona gönder; katılınca oyunu buradan kurabilirsin; girer girmez burası kendini günceller."; $("startGo").disabled = true; }
  }

  /* ---- bulut ---- */
  function altYaz() {
    if (!ME) return;
    var g = (seri && seri.g) || {}, a = g[ME] || 0, b = OTHER ? (g[OTHER] || 0) : 0, be = (seri && seri.b) || 0;
    $("stSub").textContent = seri && seri.oyun ? "Seri " + a + " – " + b + (be ? " · " + be + " berabere" : "") : "İlk oyun";
  }
  function rakipGoster() {
    if (OTHER) { $("avaOther").textContent = (ADLAR[OTHER] || "?").charAt(0).toUpperCase(); $("avaOther").className = "hsava " + (KUL[OTHER] === "a" ? "a" : "b"); $("adOther").textContent = ADLAR[OTHER]; }
    else { $("avaOther").textContent = digerAd.charAt(0).toUpperCase(); $("adOther").textContent = digerAd; }
  }
  function rakipIzle() {
    db.collection("oyuncular").doc(OTHER).onSnapshot(function (snap) {
      var p = snap.exists ? snap.data() : null, t = p && p.son && p.son.t ? Hesap.tms(p.son.t) : 0;
      $("avaOther").classList.toggle("cevrimici", !!(t && Date.now() - t < 390000 && p.son.o === "satranc"));
    }, function () {});
  }
  function dinle() {
    seriRef.onSnapshot(function (snap) { seri = snap.exists ? snap.data() : null; altYaz(); }, function () {});
    if (OTHER) rakipIzle();
    ref.onSnapshot(function (snap) {
      var d = snap.exists ? snap.data() : null;
      altYaz();
      if (!d) { G = null; P = M.oyna([]); renk = "w"; $("pMe").hidden = false; $("pOther").hidden = false; $("turn").hidden = true; $("start").hidden = false; $("startKick").textContent = "İlk oyun"; baslatKarti(); cizBos(); return; }
      var ilk = !G || G.n !== d.n;
      G = d; renk = d.beyaz === ME ? "w" : "b";
      var yeni = M.oyna(d.hamleler || []);
      if (!yeni) { msg("Oyun kaydı okunamadı.", true); return; }
      $("pMe").hidden = false; $("pOther").hidden = false; $("turn").hidden = false; $("start").hidden = true;
      if (ilk) { sel = -1; hedef = []; seen = (d.hamleler || []).length; bittiGosterildi = -1; bitirenBenim = false; $("done").hidden = true; $("promo").hidden = true; $("confirm").hidden = true; P = yeni; ciz(); }
      else if ((d.hamleler || []).length > seen && yeni.son) {
        /* rakibin (ya da başka cihazımdaki) hamlesi: kayarak gelsin */
        seen = d.hamleler.length; var son = yeni.son;
        snd(yeni.durum === "mat" ? (d.kazanan === ME ? "win" : "lose") : yeni.durum === "sah" ? "check" : son.x ? "capture" : "move");
        if (P && !yaziyor) ucus(son.f, son.t, function () { P = yeni; ciz(); if (yeni.durum === "sah" && G.sira === ME) msg("Şahtasın!"); });
        else { P = yeni; ciz(); }
      } else { if (!yaziyor) { P = yeni; ciz(); } }
      if (d.bitti) { seriGuncelle(); if (bittiGosterildi !== d.n) setTimeout(bitisGoster, ucusta ? 300 : 0); }
      if (d.teklif === OTHER && !d.bitti) msg((ADLAR[OTHER] || "Rakip") + " berabere teklif ediyor.", true);
      else if ($("msg").textContent.indexOf("berabere teklif") >= 0) msg("");
    }, function () { $("stSub").textContent = "Bağlantı yok"; msg("Bağlantı kurulamadı.", true); });
  }
  function cizBos() { var p = M.oyna([]); var g0 = G; G = { bitti: true, sira: "", hamleler: [], teklif: "" }; P = p; renk = "w"; sel = -1; hedef = []; ciz(); G = g0; $("turn").hidden = true; $("btns").hidden = true; $("offer").hidden = true; $("turnTxt").textContent = "—"; }
  function sonucBaslik(kisa) {
    var s = G.sonuc, kazandim = G.kazanan === ME, ad = ADLAR[OTHER] || "Rakip";
    if (s === "mat") return kazandim ? (kisa ? "Mat! Kazandın" : "Mat! Kazandın") : (kisa ? "Mat. " + ad + " kazandı" : "Mat. " + ad + " kazandı");
    if (s === "pes") return kazandim ? ad + " pes etti" : "Pes ettin";
    if (s === "pat") return "Pat — berabere";
    if (s === "anlasma") return "Anlaşmalı berabere";
    if (s === "yetersiz") return "Yetersiz materyal — berabere";
    if (s === "50") return "Elli hamle — berabere";
    if (s === "tekrar") return "Üç tekrar — berabere";
    return "Oyun bitti";
  }
  function bitisGoster() {
    if (!G || !G.bitti || bittiGosterildi === G.n) return; bittiGosterildi = G.n;
    var kazandim = G.kazanan === ME, berabere = !G.kazanan, ad = ADLAR[OTHER] || "Rakip", sonrakiBeyaz = G.siyah === ME;
    $("doneKick").textContent = "Oyun " + G.n + " · " + Math.ceil((G.hamleler || []).length / 2) + " hamle";
    $("doneTitle").textContent = sonucBaslik(false) + (kazandim && G.sonuc === "pes" ? " — kazandın" : "");
    $("doneText").textContent = "Yeni oyunda " + (sonrakiBeyaz ? "sen beyazsın, ilk hamle senin." : ad + " beyaz, ilk hamle onun.") + " Oyunu ikimizden biri kurabilir.";
    var g = (seri && seri.g) || {}, a = (g[ME] || 0) + (kazandim && (!seri || seri.oyun < G.n) ? 1 : 0), b = (g[OTHER] || 0) + (!kazandim && !berabere && (!seri || seri.oyun < G.n) ? 1 : 0);
    $("doneStats").innerHTML = "<div><b>" + a + "</b><span>" + esc(ADLAR[ME] || "sen") + "</span></div><div><b>" + b + "</b><span>" + esc(ad) + "</span></div>";
    $("doneNew").textContent = "Yeni oyun";
    $("done").hidden = false; snd(berabere ? "draw" : kazandim ? "win" : "lose");
  }
  /* seri + akış: bitiren taraf hemen, diğeri 5 sn sonra yedek olarak */
  function seriGuncelle() {
    if (!G || !G.bitti || seriYazildi === G.n) return; seriYazildi = G.n;
    var n = G.n, kazanan = G.kazanan || "", sonuc = G.sonuc, ham = (G.hamleler || []).length;
    var benBitirdim = bitirenBenim || (ham > 0 && ((ham % 2 === 1) === (G.beyaz === ME)) && ["mat", "pat", "yetersiz", "50", "tekrar"].indexOf(sonuc) >= 0);
    setTimeout(function () { seriYaz(n, kazanan, sonuc); }, benBitirdim ? 0 : 5000);
  }
  function seriYaz(n, kazanan, sonuc) {
    var kod = { mat: 1, pes: 2, pat: 3, anlasma: 4, yetersiz: 5, "50": 6, tekrar: 7 }[sonuc] || 0;
    db.runTransaction(function (tx) {
      return tx.get(seriRef).then(function (snap) {
        var s = snap.exists ? snap.data() : { g: {}, b: 0, oyun: 0, son: [] };
        if (s.oyun >= n) throw new Error("var");
        var g = {}; for (var k in s.g) g[k] = s.g[k]; if (kazanan) g[kazanan] = (g[kazanan] || 0) + 1;
        var sonlar = (s.son || []).slice(-9); sonlar.push({ n: n, k: kazanan, s: sonuc });
        tx.set(seriRef, { g: g, b: (s.b || 0) + (kazanan ? 0 : 1), oyun: n, son: sonlar, t: firebase.firestore.FieldValue.serverTimestamp() });
      });
    }).then(function () {
      db.collection("akis").add({ uid: ME, o: "satranc", k: !kazanan ? "berabere" : kazanan === ME ? "kazandi" : "kaybetti", v: n * 10 + kod, t: firebase.firestore.FieldValue.serverTimestamp() }).catch(function () {});
    }).catch(function () {});
  }

  /* ---- başlat ---- */
  function basla() {
    var k = Hesap.kim(), ip = null;
    try { ip = JSON.parse(localStorage.getItem("yg_oda") || "null"); } catch (e) {}
    if (!k) { if (ip && !Hesap._test().sdkHata && !hazirMi) { $("stSub").textContent = "Bağlanıyor…"; return; } $("gate").hidden = false; $("stSub").textContent = ""; return; }
    if (!k.kesin || hazirMi) return;
    hazirMi = true; ME = k.uid; ADLAR[ME] = k.ad; KUL[ME] = k.kul; $("gate").hidden = true;
    digerAd = Hesap.gorunenAd(k.kul === "a" ? "b" : "a");
    $("avaMe").textContent = (k.ad || "?").charAt(0).toUpperCase(); $("avaMe").className = "hsava " + k.kul; $("adMe").textContent = k.ad;
    $("avaOther").className = "hsava " + (k.kul === "a" ? "b" : "a"); rakipGoster();
    Hesap.db().then(function (d) {
      db = d; ref = db.collection("satranc").doc("mac"); seriRef = db.collection("satranc").doc("seri");
      db.collection("oyuncular").onSnapshot(function (snap) {
        var yeni = null;
        snap.forEach(function (doc) { var p = doc.data(); if (doc.id !== ME) { yeni = doc.id; ADLAR[yeni] = (p.kul && Hesap.gorunenAd(p.kul)) || p.ad || "Rakip"; KUL[yeni] = p.kul; } });
        if (yeni && !OTHER) { OTHER = yeni; rakipGoster(); rakipIzle(); if (dinliyor) { baslatKarti(); msg(ADLAR[OTHER] + " odaya katıldı, oyun kurulabilir."); if (G) ciz(); } }
        if (!dinliyor) {
          dinliyor = true;
          if (!OTHER) msg("Arkadaşın henüz odaya katılmadı; katılınca oyun başlar.", true);
          try { if (localStorage.getItem("st_help") !== "1") $("help").hidden = false; } catch (e) {}
          dinle();
        }
      }, function () { $("stSub").textContent = "Bağlantı yok"; msg("Bağlantı kurulamadı.", true); });
    }).catch(function () { $("stSub").textContent = "Bağlantı yok"; msg("Bağlantı kurulamadı.", true); });
  }
  Hesap.izle(function () { basla(); });
  Hesap.hazir(function () { if (!Hesap.kim()) basla(); });
  P = M.oyna([]); (function () { var g0 = G; G = { bitti: true, hamleler: [], teklif: "" }; renk = "w"; ciz(); G = g0; $("turn").hidden = true; $("btns").hidden = true; $("offer").hidden = true; })();

  if (location.hash === "#test") window.__st = { state: function () { return { G: G, me: ME, other: OTHER, renk: renk, sel: sel, hedef: hedef.slice(), fen: P ? M.fenYaz(P.st) : "", durum: P ? P.durum : "", san: P ? P.san.slice() : [], yaziyor: yaziyor, ucusta: ucusta, seen: seen }; }, tikla: tikla, yeni: yeniOyun, hamle: function (txt) { var m = M.hamleBul(P.legal, txt); if (m) hamleYap(m); return !!m; }, M: M };
})();
