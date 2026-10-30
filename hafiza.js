/* Hafıza Düellosu – iki kişilik, sıra tabanlı hafıza oyunu (Firestore üzerinden; aynı anda çevrimiçi olmak gerekmez).
   Bulut: hafiza/mac (aktif oyun) ve hafiza/seri (galibiyet sayıları).
   mac = { n, v, deste[30], sahip (30 karakter: . boş / uid'nin ilk harfi? hayır: "0" boş, "1" ben? → uid eşlemesi: sahip[i] = kısa kod), acilan[0-2], sonuc ""|"es"|"yok",
           sira (uid), baslayan (uid), hamleler [{u,a,b,es}], skor {uid:n}, bitti, kazanan, gorulen {uid: görülen hamle sayısı}, t }
   Hamle tek yazımla gider (işlem içinde): ikinci kart açılınca eşleşme de, sıra da aynı anda kaydedilir.
   Kaçırılan hamleler: hamleler[gorulen[ben]..] arasında rakibin hamleleri tek tek gösterilir (tekrar), sonra gorulen güncellenir. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var KART = ["yabanmersini", "kiraz", "cilek", "karpuz", "muffin", "tost", "kalp", "sufle", "lavanta", "sakayik", "lilyum", "americano", "kedi", "tiyatro", "sinema"];
  var AD = { yabanmersini: "Yaban mersini", kiraz: "Kiraz", cilek: "Çilek", karpuz: "Karpuz", muffin: "Muffin", tost: "Atom tost", kalp: "Kalp", sufle: "Sufle", lavanta: "Lavanta", sakayik: "Şakayık", lilyum: "Lilyum", americano: "Americano", kedi: "Kedi", tiyatro: "Tiyatro", sinema: "Sinema" };
  var COLS = 5, ROWS = 6, N = COLS * ROWS, GOSTER = 1250, TEKRAR = 1150;
  var ME = null, OTHER = null, ADLAR = {}, KUL = {}, db = null, ref = null, seriRef = null, G = null, hazirMi = false;
  var kartlar = [], acikYerel = [], mesgul = false, seen = -1, tekrarKuyruk = [], tekrarda = false, missT = 0, sonV = -1, bittiGosterildi = -1;
  function snd(n) { if (window.HdSes) try { window.HdSes.play(n); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  /* Türkçe ekler: Ayşe'de / Mert'te, Ayşe'nin / Mert'in */
  function sonUnlu(ad) { var m = String(ad).toLowerCase().match(/[aeıioöuü](?![\s\S]*[aeıioöuü])/); return m ? m[0] : "a"; }
  function ekDe(ad) { var v = sonUnlu(ad); return ad + "'" + (/[fstkçşhp]$/i.test(ad) ? "t" : "d") + (/[aıou]/.test(v) ? "a" : "e"); }
  function ekIn(ad) { var v = sonUnlu(ad), h = /[aı]/.test(v) ? "ı" : /[ou]/.test(v) ? "u" : /[öü]/.test(v) ? "ü" : "i"; return ad + "'" + (/[aeıioöuü]$/i.test(ad) ? "n" : "") + h + "n"; }

  /* ---- tahta ---- */
  var board = $("board"), wrap = $("wrap"), stage = $("stage");
  for (var i = 0; i < N; i++) {
    var b = document.createElement("button"); b.type = "button"; b.className = "hdk"; b.setAttribute("data-i", i); b.setAttribute("aria-label", "Kart " + (i + 1));
    b.innerHTML = '<span class="hdkin"><span class="hdkb"><svg viewBox="0 0 64 44" aria-hidden="true"><path d="M8 38L4 12l14 11L32 4l14 19 14-11-4 26z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/></svg></span><span class="hdkf"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#f-kiraz"/></svg></span></span>';
    board.appendChild(b); kartlar.push(b);
  }
  function fit() {
    var vh = (window.visualViewport && window.visualViewport.height) || innerHeight;
    var bs = getComputedStyle(document.body), pt = parseFloat(bs.paddingTop) || 0, pb = parseFloat(bs.paddingBottom) || 0;
    stage.style.height = Math.max(330, vh - pt - pb) + "px";
    var w = wrap.clientWidth, h = wrap.clientHeight, gap = 7;
    var s = Math.floor(Math.min((w - gap * (COLS - 1)) / COLS, (h - gap * (ROWS - 1)) / ROWS, 82));
    board.style.setProperty("--hd-k", Math.max(40, s) + "px");
  }
  addEventListener("resize", fit); addEventListener("orientationchange", function () { setTimeout(fit, 250); });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", fit);
  fit();

  function kisa(uid) { return uid === ME ? "me" : "ot"; }
  function setIcon(i, id) { var u = kartlar[i].querySelector("use"); u.setAttribute("href", "#f-" + id); u.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#f-" + id); }
  /* görünümü çiz: sahipli kartlar hep açık; acikYerel geçici açıklar; kalanlar kapalı */
  function ciz() {
    if (!G) return;
    var sahip = G.sahip || [], benim = G.sira === ME && !G.bitti && !tekrarda && !mesgul;
    for (var i = 0; i < N; i++) {
      var k = kartlar[i], s = sahip[i] || "", open = !!s || acikYerel.indexOf(i) >= 0;
      if (open) setIcon(i, KART[G.deste[i]]);
      k.className = "hdk" + (open ? " acik" : "") + (s ? " sahip " + (s === ME ? "me" : "ot") : "");
      if (s) k.setAttribute("data-k", (ADLAR[s] || "?").charAt(0).toUpperCase());
      k.disabled = !benim || !!s || acikYerel.indexOf(i) >= 0;
    }
    $("skorMe").textContent = (G.skor && G.skor[ME]) || 0; $("skorOther").textContent = (G.skor && OTHER && G.skor[OTHER]) || 0;
    var kalan = 15 - (((G.skor && G.skor[ME]) || 0) + ((G.skor && OTHER && G.skor[OTHER]) || 0));
    if (G.bitti) { $("turnTxt").textContent = G.kazanan === ME ? "Kazandın" : "Kaybettin"; $("turnSub").textContent = "oyun bitti"; }
    else if (tekrarda) { $("turnTxt").textContent = ADLAR[OTHER] || "Rakip"; $("turnSub").textContent = "hamleleri gösteriliyor"; }
    else if (G.sira === ME) { $("turnTxt").textContent = "Sıra sende"; $("turnSub").textContent = acikYerel.length === 1 ? "ikinci kartı aç" : kalan + " çift kaldı"; }
    else { $("turnTxt").textContent = "Sıra " + (ADLAR[OTHER] ? ekDe(ADLAR[OTHER]) : "onda"); $("turnSub").textContent = kalan + " çift kaldı"; }
    $("turn").className = "hdturn" + (G.bitti ? "" : G.sira === ME && !tekrarda ? " me" : " ot");
    $("pMe").className = "hdp" + (!G.bitti && G.sira === ME ? " on" : ""); $("pOther").className = "hdp" + (!G.bitti && G.sira === OTHER ? " on" : "");
  }
  function msg(t, kalici) { var m = $("msg"); m.textContent = t; clearTimeout(msg.t); if (!kalici) msg.t = setTimeout(function () { m.textContent = ""; }, 2600); }
  function cap(t) { var c = $("cap"); if (!t) { c.hidden = true; return; } c.textContent = t; c.hidden = false; }

  /* ---- hamle ---- */
  function tikla(i) {
    if (!G || G.bitti || G.sira !== ME || tekrarda || mesgul) return;
    if ((G.sahip || [])[i] || acikYerel.indexOf(i) >= 0) return;
    if (acikYerel.length >= 2) return;
    acikYerel.push(i); snd("flip"); ciz();
    if (acikYerel.length === 1) { yaz(function (d) { d.acilan = [i]; d.sonuc = ""; }); return; }
    var a = acikYerel[0], b = i, es = G.deste[a] === G.deste[b];
    mesgul = true; ciz();
    yaz(function (d) {
      var sahip = d.sahip.slice(); if (es) { sahip[a] = ME; sahip[b] = ME; }
      var skor = {}; for (var k in d.skor) skor[k] = d.skor[k]; if (es) skor[ME] = (skor[ME] || 0) + 1;
      var ham = (d.hamleler || []).slice(); ham.push({ u: ME, a: a, b: b, es: es });
      var toplam = 0; for (var k2 in skor) toplam += skor[k2];
      d.sahip = sahip; d.skor = skor; d.hamleler = ham; d.acilan = [a, b]; d.sonuc = es ? "es" : "yok"; d.sira = es ? ME : OTHER;
      if (toplam >= 15) { d.bitti = true; d.kazanan = (skor[ME] || 0) > (skor[OTHER] || 0) ? ME : OTHER; }
    }, function () {
      if (es) { snd("match"); msg(AD[KART[G.deste[a]]] + " çifti senin" + (G.sira === ME && !G.bitti ? " · bir daha oyna" : "")); }
      else { snd("miss"); msg("Eş değil, sıra " + (ADLAR[OTHER] || "karşıda") + "."); }
      setTimeout(function () { acikYerel = []; mesgul = false; ciz(); }, es ? 350 : GOSTER);
    });
  }
  /* işlem: güncel dokümanı al, değiştir, yaz; sıra bende değilse iptal */
  function yaz(degistir, sonra) {
    var yeniV = 0;
    db.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        var d = snap.data(); if (!d || d.bitti || d.sira !== ME) throw new Error("sira");
        degistir(d); d.v = (d.v || 0) + 1; yeniV = d.v; d.t = firebase.firestore.FieldValue.serverTimestamp();
        tx.set(ref, d);
      });
    }).then(function () { if (sonra) sonra(); }).catch(function (e) {
      acikYerel = []; mesgul = false; ciz();
      msg(String(e && e.message) === "sira" ? "Sıra sende değil." : "Bağlantı kurulamadı, tekrar dene.");
    });
  }

  /* ---- yeni oyun ---- */
  function deste() { var d = [], i; for (i = 0; i < 15; i++) { d.push(i); d.push(i); } for (i = d.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = d[i]; d[i] = d[j]; d[j] = t; } return d; }
  function yeniOyun() {
    if (!OTHER) { msg("Arkadaşın henüz odaya katılmadı.", true); return; }
    $("startGo").disabled = true; $("doneNew").disabled = true;
    db.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        var d = snap.exists ? snap.data() : null;
        if (d && !d.bitti) return;                                            /* biri çoktan başlatmış */
        var baslayan = d && d.kazanan ? (d.kazanan === ME ? OTHER : ME) : ME, skor = {}, gorulen = {};
        skor[ME] = 0; skor[OTHER] = 0; gorulen[ME] = 0; gorulen[OTHER] = 0;
        var sahip = []; for (var i = 0; i < N; i++) sahip.push("");
        tx.set(ref, { n: (d && d.n || 0) + 1, v: 1, deste: deste(), sahip: sahip, acilan: [], sonuc: "", sira: baslayan, baslayan: baslayan, hamleler: [], skor: skor, bitti: false, kazanan: null, gorulen: gorulen, t: firebase.firestore.FieldValue.serverTimestamp() });
      });
    }).then(function () { $("startGo").disabled = false; $("doneNew").disabled = false; $("start").hidden = true; $("done").hidden = true; seen = 0; })
      .catch(function () { $("startGo").disabled = false; $("doneNew").disabled = false; msg("Başlatılamadı, tekrar dene."); });
  }
  $("startGo").onclick = yeniOyun; $("doneNew").onclick = yeniOyun;
  $("doneClose").onclick = function () { $("done").hidden = true; };
  $("bHelp").onclick = function () { $("help").hidden = false; };
  $("helpGo").onclick = function () { $("help").hidden = true; try { localStorage.setItem("hd_help", "1"); } catch (e) {} };
  board.addEventListener("click", function (e) { var b = e.target && e.target.closest ? e.target.closest("button.hdk") : null; if (b && !b.disabled) tikla(+b.getAttribute("data-i")); });

  /* ---- rakibin hamlelerini göster (canlı ya da kaçırılmış) ---- */
  function tekrarEkle(from) {
    var ham = G.hamleler || [], n0 = tekrarKuyruk.length;
    for (var i = Math.max(0, from); i < ham.length; i++) if (ham[i].u !== ME) tekrarKuyruk.push({ i: i, m: ham[i] });
    seen = ham.length;
    if (tekrarKuyruk.length === n0) { gorulenYaz(); return; }            /* sadece kendi hamlelerim: gösterilecek bir şey yok */
    if (!tekrarda) tekrarCalistir();
  }
  function tekrarCalistir() {
    if (!tekrarKuyruk.length) { tekrarda = false; cap(""); acikYerel = []; ciz(); gorulenYaz(); return; }
    tekrarda = true; var q = tekrarKuyruk.shift(), m = q.m, ad = ADLAR[OTHER] || "Rakip";
    var cok = tekrarKuyruk.length;
    acikYerel = [m.a, m.b]; snd("flip"); ciz();
    cap(ad + " açtı: " + AD[KART[G.deste[m.a]]] + " · " + AD[KART[G.deste[m.b]]] + (m.es ? " — eşleşti!" : "") + (cok ? "  (" + cok + " hamle daha)" : ""));
    if (m.es) snd("match");
    setTimeout(function () { acikYerel = []; ciz(); setTimeout(tekrarCalistir, 160); }, TEKRAR);
  }
  function gorulenYaz() {
    if (!G || !ME) return;
    var g = G.gorulen || {}; if ((g[ME] || 0) >= seen) return;
    var upd = {}; upd[ME] = seen;
    ref.set({ gorulen: upd }, { merge: true }).catch(function () {});
  }
  $("cap").addEventListener("click", function () { tekrarKuyruk = []; });   /* dokununca geç */

  /* ---- bulut dinle ---- */
  var seri = null;
  function altYaz() {
    if (!ME) return;
    var g = (seri && seri.g) || {}, a = g[ME] || 0, b = OTHER ? (g[OTHER] || 0) : 0;
    $("hdSub").textContent = seri && seri.oyun ? "Seri " + a + " – " + b + (a === b ? " · berabere" : a > b ? " · öndesin" : " · " + (ADLAR[OTHER] || "rakip") + " önde") : "İlk oyun";
  }
  function dinle() {
    seriRef.onSnapshot(function (snap) { seri = snap.exists ? snap.data() : null; altYaz(); }, function () {});
    if (OTHER) rakipIzle();
    ref.onSnapshot(function (snap) {
      var d = snap.exists ? snap.data() : null;
      altYaz();
      if (!d) { G = null; $("score").hidden = true; $("start").hidden = false; $("startKick").textContent = "İlk oyun"; baslatKarti(); ciz(); return; }
      var ilk = !G || G.n !== d.n;
      G = d; $("score").hidden = false; $("start").hidden = true;
      if (ilk) { acikYerel = []; mesgul = false; tekrarKuyruk = []; tekrarda = false; cap(""); seen = (d.gorulen && d.gorulen[ME]) || 0; bittiGosterildi = -1; $("done").hidden = true; }
      /* rakip bir kart açmış, ikincisini bekliyor: canlı göster */
      if (d.sira !== ME && !d.bitti && d.acilan && d.acilan.length === 1 && !tekrarda) acikYerel = d.acilan.slice();
      else if (!tekrarda && !mesgul && d.sira === ME && d.acilan && d.acilan.length === 1 && acikYerel.length === 0) acikYerel = d.acilan.slice();   /* benim yarım kalan hamlem (başka cihazdan) */
      else if (!tekrarda && !mesgul && d.acilan && d.acilan.length !== 1 && acikYerel.length === 1 && d.sira !== ME) acikYerel = [];
      /* görülmemiş hamleler */
      var ham = d.hamleler || [];
      if (ham.length > seen) tekrarEkle(seen);
      ciz();
      if (d.bitti) seriGuncelle();
      if (d.bitti && bittiGosterildi !== d.n && !tekrarda) bitisGoster();
      else if (d.bitti && bittiGosterildi !== d.n) { var iv = setInterval(function () { if (!tekrarda) { clearInterval(iv); bitisGoster(); } }, 300); }
    }, function () { $("hdSub").textContent = "Bağlantı yok"; msg("Bağlantı kurulamadı.", true); });
  }
  function bitisGoster() {
    if (!G || !G.bitti || bittiGosterildi === G.n) return; bittiGosterildi = G.n;
    var ben = (G.skor && G.skor[ME]) || 0, o = (G.skor && G.skor[OTHER]) || 0, kazandim = G.kazanan === ME;
    $("doneKick").textContent = "Oyun " + G.n + " bitti";
    $("doneTitle").textContent = kazandim ? "Kazandın!" : (ADLAR[OTHER] || "Rakip") + " kazandı";
    $("doneText").textContent = kazandim ? "Yeni oyunda ilk hamle " + (ADLAR[OTHER] ? ekIn(ADLAR[OTHER]) : "onun") + ". Oyunu ikimizden biri kurabilir." : "Yeni oyunda ilk hamle senin.";
    $("doneStats").innerHTML = "<div><b>" + ben + "</b><span>" + esc(ADLAR[ME] || "sen") + "</span></div><div><b>" + o + "</b><span>" + esc(ADLAR[OTHER] || "rakip") + "</span></div>";
    $("doneNew").textContent = kazandim ? "Yeni oyunu kur" : "Yeni oyunu başlat";
    $("done").hidden = false; snd(kazandim ? "win" : "lose");
  }

  /* ilk oyun kartı: rakip henüz hiç giriş yapmadıysa düğme kapalı */
  function baslatKarti() {
    if (OTHER) { $("startTitle").textContent = "Hazır mısın?"; $("startText").textContent = "Kartları sen karıştır, ilk hamle senin."; $("startGo").disabled = false; }
    else { $("startTitle").textContent = "Arkadaşın henüz odada değil"; $("startText").textContent = "Oda kodunu ona gönder; katılınca oyunu buradan başlatabilirsin; girer girmez burası kendini günceller."; $("startGo").disabled = true; }
  }
  function rakipGoster() {
    if (OTHER) { $("avaOther").textContent = (ADLAR[OTHER] || "?").charAt(0).toUpperCase(); $("avaOther").className = "hsava " + (KUL[OTHER] === "a" ? "a" : "b"); $("adOther").textContent = ADLAR[OTHER]; }
    else { $("avaOther").textContent = digerAd.charAt(0).toUpperCase(); $("adOther").textContent = digerAd; }
  }
  var digerAd = "Rakip", dinliyor = false;
  /* ---- başlat: giriş + rakip + dinleme ---- */
  function basla() {
    var k = Hesap.kim(), ip = null;
    try { ip = JSON.parse(localStorage.getItem("yg_oda") || "null"); } catch (e) {}
    if (!k) { if (ip && !Hesap._test().sdkHata && !hazirMi) { $("hdSub").textContent = "Bağlanıyor…"; return; } $("gate").hidden = false; $("hdSub").textContent = ""; return; }
    if (!k.kesin || hazirMi) return;
    hazirMi = true; ME = k.uid; ADLAR[ME] = k.ad; KUL[ME] = k.kul; $("gate").hidden = true;
    digerAd = Hesap.gorunenAd(k.kul === "a" ? "b" : "a");                 /* iki hesap var: öteki kim, baştan belli */
    $("avaMe").textContent = (k.ad || "?").charAt(0).toUpperCase(); $("avaMe").className = "hsava " + k.kul; $("adMe").textContent = k.ad;
    $("avaOther").className = "hsava " + (k.kul === "a" ? "b" : "a"); rakipGoster();
    Hesap.db().then(function (d) {
      db = d; ref = db.collection("hafiza").doc("mac"); seriRef = db.collection("hafiza").doc("seri");
      /* rakip: oyuncular koleksiyonunu canlı izle — ilk kez giriş yaptığı an burada belirir */
      db.collection("oyuncular").onSnapshot(function (snap) {
        var yeni = null;
        snap.forEach(function (doc) { var p = doc.data(); if (doc.id !== ME) { yeni = doc.id; ADLAR[yeni] = (p.kul && Hesap.gorunenAd(p.kul)) || p.ad || "Rakip"; KUL[yeni] = p.kul; } });
        if (yeni && !OTHER) {
          OTHER = yeni; rakipGoster(); rakipIzle();
          if (dinliyor) { baslatKarti(); msg(ADLAR[OTHER] + " odaya katıldı, oyun başlayabilir."); ciz(); }
        }
        if (!dinliyor) {
          dinliyor = true;
          if (!OTHER) msg("Arkadaşın henüz odaya katılmadı; katılınca oyun başlar.", true);
          try { if (localStorage.getItem("hd_help") !== "1") $("help").hidden = false; } catch (e) {}
          dinle();
        }
      }, function () { $("hdSub").textContent = "Bağlantı yok"; msg("Bağlantı kurulamadı.", true); });
    }).catch(function () { $("hdSub").textContent = "Bağlantı yok"; msg("Bağlantı kurulamadı.", true); });
  }
  function rakipIzle() {
    db.collection("oyuncular").doc(OTHER).onSnapshot(function (snap) {
      var p = snap.exists ? snap.data() : null, t = p && p.son && p.son.t ? Hesap.tms(p.son.t) : 0;
      $("avaOther").classList.toggle("cevrimici", !!(t && Date.now() - t < 390000 && p.son.o === "hafiza"));
    }, function () {});
  }
  Hesap.izle(function () { basla(); });
  Hesap.hazir(function () { if (!Hesap.kim()) basla(); });

  /* oyun bitince seri + akış (bitiren taraf yazar) */
  var seriYazildi = -1;
  function seriGuncelle() {
    if (!G || !G.bitti || seriYazildi === G.n) return; seriYazildi = G.n;
    var son = G.hamleler && G.hamleler.length ? G.hamleler[G.hamleler.length - 1] : null;
    var ben = (G.skor && G.skor[ME]) || 0, o = (G.skor && G.skor[OTHER]) || 0, kazandim = G.kazanan === ME, n = G.n, kazanan = G.kazanan;
    setTimeout(function () { seriYaz(n, ben, o, kazandim, kazanan); }, son && son.u === ME ? 0 : 5000);   /* son hamleyi yapan hemen; diğeri yedek olarak 5 sn sonra */
  }
  function seriYaz(n, ben, o, kazandim, kazanan) {
    db.runTransaction(function (tx) {
      return tx.get(seriRef).then(function (snap) {
        var s = snap.exists ? snap.data() : { g: {}, oyun: 0, son: [] };
        if (s.oyun >= n) throw new Error("var");
        var g = {}; for (var k in s.g) g[k] = s.g[k]; g[kazanan] = (g[kazanan] || 0) + 1;
        var sonlar = (s.son || []).slice(-9); var r = { n: n, k: kazanan, s: {} }; r.s[ME] = ben; r.s[OTHER] = o; sonlar.push(r);
        tx.set(seriRef, { g: g, oyun: n, son: sonlar, t: firebase.firestore.FieldValue.serverTimestamp() });
      });
    }).then(function () {
      db.collection("akis").add({ uid: ME, o: "hafiza", k: kazandim ? "kazandi" : "kaybetti", v: ben * 100 + o, t: firebase.firestore.FieldValue.serverTimestamp() }).catch(function () {});
    }).catch(function () {});
  }

  if (location.hash === "#test") window.__hd = { state: function () { return { G: G, me: ME, other: OTHER, acik: acikYerel.slice(), tekrarda: tekrarda, seen: seen, kuyruk: tekrarKuyruk.length }; }, tikla: tikla, yeni: yeniOyun };
})();
