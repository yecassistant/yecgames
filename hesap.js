/* Hesap – YEC Games: üyeliksiz oda sistemi (Firebase anonim giriş + Firestore).
   Kimse e-posta/şifre vermez. Cihaz, Firebase'den rastgele bir kimlik alır; kişi bir odanın A ya da B koltuğuna oturur.
   Oyunların gördüğü oyuncu kimliği koltuk harfidir ("a" / "b"): telefon değişse bile koltuk aynı kalır, kayıtlar bozulmaz.

   Bulut yapısı:
     odalar/{oda}                   = { kod, kodSon, koltuk: { a: {uid, ad, anahtar}, b: {uid|null, ad, anahtar} }, ayar: {cumle, tema, kelimeler}, t }
     kodlar/{kod}                   = { oda, son }                     (katılım kodu → oda; 24 saat)
     kisiler/{fuid}                 = { oda, koltuk }                  (cihaz kimliği → oda; yerel kayıt silinirse bulunsun)
     odalar/{oda}/oyuncular/{a|b}   = { kul, ad, d: {anahtar: değer}, dt: {anahtar: ms}, son: {o, t}, t }   (ilerleme + "şu an burada")
     odalar/{oda}/{oyun}/mac|seri   = oyun kayıtları (duello.js)    ·  odalar/{oda}/akis/{id} = { uid, o, k, v, t }
   Oyunlar hiçbir şey bilmez: Hesap.db() odanın altını gösteren bir sarmalayıcı döndürür; db.collection("xox") → odalar/{oda}/xox.
   İlerleme eşitleme: oyun localStorage'a yazar, birkaç saniye içinde koltuğun bulut kaydıyla "en iyisi kalır" kuralıyla birleşir. */
(function () {
  "use strict";
  /* deneme modu (?deneme=1): deneme.js sahte bir firebase sunar, burası aynen çalışır */
  var CFG = window.YEC_FIREBASE || { apiKey: "", authDomain: "", projectId: "", appId: "" };   /* yapilandirma.js'den gelir */
  var SDK = "https://www.gstatic.com/firebasejs/12.17.1/";
  var ZAMAN_ASIMI = 4000, DEBOUNCE = 1800, NABIZ = 300000, KOD_SURE = 24 * 3600 * 1000;
  var ABC = "ABCDEFGHJKLMNPRSTUVYZ23456789";

  /* ---- eşitlenen anahtarlar ve birleştirme kuralı ---- */
  var K = {
    kb_max: "max", kb_lvl: "max", kb_bonus: "max", kb_rozet: "max", kb_hint: "max", kb_done: "flag", kb_end: "flag", kb_new31: "flag", kb_wait: "flag", kb_intro: "flag", kb_state: "new",
    ok_max: "max", ok_lvl: "max", ok_hint: "max", ok_intro: "flag", ok_stars: "stars", ok_best: "best", ok_state: "new",
    pm_best: "max", pm_sufle: "max", pm_muffin2: "flag", pm_tost2: "flag", pm_kalp1: "flag", pm_hediye1: "flag",
    sef_best: "max", sef_oda: "new",
    stb_best: "max", stb_oyun: "max", yk_best: "max", yk_seviye: "max",
    gk_start: "min", gk_stat: "new", gk_help: "flag", qg_last: "new"
  };
  function kural(k) { return K[k] || (k.indexOf("gk_d") === 0 ? "new" : null); }

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function lsj(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function arr(v) { try { var a = JSON.parse(v); return a instanceof Array ? a : []; } catch (e) { return []; } }
  function now() { return Date.now(); }
  function rastgele(n) { var s = "", a = new Uint32Array(n); try { crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 1e9); } for (var j = 0; j < n; j++) s += ABC.charAt(a[j] % ABC.length); return s; }

  function birlestir(k, a, ta, b, tb) {
    if (a === null || a === undefined) return b; if (b === null || b === undefined) return a;
    var r = kural(k), i, o;
    if (r === "max") return num(b) > num(a) ? b : a;
    if (r === "min") { if (k === "gk_start") return b < a ? b : a; var na = num(a), nb = num(b); return nb > 0 && (na === 0 || nb < na) ? b : a; }
    if (r === "flag") return a === "1" || b === "1" ? "1" : (tb > ta ? b : a);
    if (r === "stars") { var A = arr(a), B = arr(b), n1 = Math.max(A.length, B.length); o = []; for (i = 0; i < n1; i++) o[i] = Math.max(num(A[i]), num(B[i])); return JSON.stringify(o); }
    if (r === "best") { var C = arr(a), D = arr(b), n2 = Math.max(C.length, D.length); o = []; for (i = 0; i < n2; i++) { var x = num(C[i]), y = num(D[i]); o[i] = x > 0 && y > 0 ? Math.min(x, y) : (x || y || 0); } return JSON.stringify(o); }
    return tb > ta ? b : a;
  }
  var T = lsj("hs_t") || {}, dirty = false;
  function damga(k) { T[k] = now(); dirty = true; ls("hs_t", JSON.stringify(T)); planla(); }
  try {
    var P = Storage.prototype, _set = P.setItem, _rem = P.removeItem;
    P.setItem = function (k, v) { _set.apply(this, arguments); if (this === localStorage && kural(k) && !sessiz) damga(k); };
    P.removeItem = function (k) { _rem.apply(this, arguments); if (this === localStorage && kural(k) && !sessiz) damga(k); };
  } catch (e) {}
  var sessiz = false;
  function yerel() { var d = {}, dt = {}, i, k; try { for (i = 0; i < localStorage.length; i++) { k = localStorage.key(i); if (kural(k)) { d[k] = localStorage.getItem(k); dt[k] = T[k] || 0; } } } catch (e) {} return { d: d, dt: dt }; }
  function birles(cl, yr) {
    var d = {}, dt = {}, k, keys = {}, c = cl && cl.d || {}, ct = cl && cl.dt || {};
    for (k in c) keys[k] = 1; for (k in yr.d) keys[k] = 1;
    for (k in keys) { var v = birlestir(k, c[k], ct[k] || 0, yr.d[k], yr.dt[k] || 0); if (v === null || v === undefined) continue; d[k] = v; dt[k] = Math.max(ct[k] || 0, yr.dt[k] || 0) || now(); }
    return { d: d, dt: dt };
  }
  function yerelYaz(m) { sessiz = true; try { for (var k in m.d) { if (ls(k) !== m.d[k]) ls(k, m.d[k]); T[k] = m.dt[k]; } ls("hs_t", JSON.stringify(T)); } catch (e) {} sessiz = false; }
  function ayni(a, b) { var k; for (k in a) if (a[k] !== b[k]) return false; for (k in b) if (!(k in a)) return false; return true; }
  function temizle() { sessiz = true; try { var sil = [], i; for (i = 0; i < localStorage.length; i++) if (kural(localStorage.key(i))) sil.push(localStorage.key(i)); sil.forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {} T = {}; ls("hs_t", null); sessiz = false; }

  /* ---- Firebase ---- */
  var fb = null, auth = null, db = null, user = null, hazir = false, hazirCb = [], bulut = null, senk = false, sdkHata = false, oyunKodu = document.body.getAttribute("data-page") || "";
  var oda = lsj("yg_oda");
  /* tema: oda ayarından gelir, yerelde de tutulur ki sayfa açılır açılmaz uygulansın */
  try { var tema0 = ls("yg_tema"); if (tema0 && tema0 !== "mor") document.body.setAttribute("data-tema", tema0); } catch (e) {}                                          /* {oda, koltuk, ad, anahtar, adlar:{a,b}} — bu cihazın oturduğu koltuk */
  var odaVeri = null, odaCb = [], odaDinliyor = false, sarma = null;
  function script(src) { return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.async = true; s.onload = res; s.onerror = function () { rej(new Error(src)); }; document.head.appendChild(s); }); }
  function sdkYukle() { if (window.firebase && firebase.firestore && firebase.auth) return Promise.resolve(); return script(SDK + "firebase-app-compat.js").then(function () { return Promise.all([script(SDK + "firebase-auth-compat.js"), script(SDK + "firebase-firestore-compat.js")]); }); }
  function kur() {
    if (fb) return fb;
    fb = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(CFG);
    auth = firebase.auth(); db = firebase.firestore();
    try { db.settings({ experimentalAutoDetectLongPolling: true, merge: true }); } catch (e) {}
    try { auth.languageCode = "tr"; } catch (e) {}
    return fb;
  }
  function tms(t) { return t && typeof t.toMillis === "function" ? t.toMillis() : (typeof t === "number" ? t : 0); }
  function st() { return firebase.firestore.FieldValue.serverTimestamp(); }
  function odaRef() { return db.collection("odalar").doc(oda.oda); }
  /* oyunların gördüğü "db": odanın altı */
  function sarmala() {
    if (sarma) return sarma;
    sarma = { collection: function (n) { return odaRef().collection(n); }, runTransaction: function (f) { return db.runTransaction(f); }, oda: function () { return odaRef(); }, ham: db };
    return sarma;
  }
  function gorunenAd(kul) { var o = odaVeri || (oda && oda.adlar ? { koltuk: { a: { ad: oda.adlar.a }, b: { ad: oda.adlar.b } } } : null); var ad = o && o.koltuk && o.koltuk[kul] && o.koltuk[kul].ad; return ad || (kul === "a" ? "A" : kul === "b" ? "B" : ""); }
  function kim() {
    if (!oda) return null;
    return { uid: oda.koltuk, kul: oda.koltuk, ad: gorunenAd(oda.koltuk), kesin: !!user };
  }
  function odaDinle() {
    if (odaDinliyor || !db || !oda) return; odaDinliyor = true;
    odaRef().onSnapshot(function (snap) {
      if (!snap.exists) { odaVeri = null; odaCb.forEach(function (f) { try { f(null); } catch (e) {} }); if (oda) { ayril(); temizle(); location.href = "baslat.html?silindi=1"; } return; }
      odaVeri = snap.data();
      /* bu koltuk kurtarma anahtarıyla başka cihaza taşındıysa burası artık üye değil */
      if (user && odaVeri.koltuk && odaVeri.koltuk[oda.koltuk] && odaVeri.koltuk[oda.koltuk].uid && odaVeri.koltuk[oda.koltuk].uid !== user.uid) { ayril(); location.href = "baslat.html?tasindi=1"; return; }
      try { var tm = (odaVeri.ayar && odaVeri.ayar.tema) || "mor"; if (ls("yg_tema") !== tm) { ls("yg_tema", tm); document.body.setAttribute("data-tema", tm === "mor" ? "" : tm); } var cm = (odaVeri.ayar && odaVeri.ayar.cumle) || ""; if (cm) ls("yg_cumle", cm); else ls("yg_cumle", null); } catch (e) {}
      try { oda.adlar = { a: odaVeri.koltuk.a.ad, b: odaVeri.koltuk.b.ad }; if (odaVeri.koltuk[oda.koltuk]) oda.ad = odaVeri.koltuk[oda.koltuk].ad; ls("yg_oda", JSON.stringify(oda)); } catch (e) {}
      odaCb.forEach(function (f) { try { f(odaVeri); } catch (e) {} }); durum();
    }, function (e) {
      /* kurallar okumayı reddetti: oda silinmiş ya da bu koltuk başka cihaza taşınmış demektir */
      if (e && e.code === "permission-denied") { ayril(); location.href = "baslat.html?tasindi=1"; }
    });
  }

  /* ---- ilerleme eşitleme (koltuk belgesi) ---- */
  function esitle() {
    var son = ls("hs_last"), kimlik = oda.oda + "/" + oda.koltuk;
    if (son && son !== kimlik) temizle();                            /* bu cihaz başka bir odaya/koltuğa bağlanmış: eski kayıtlar karışmasın */
    var ref = odaRef().collection("oyuncular").doc(oda.koltuk), yr = yerel();
    return ref.get().then(function (snap) {
      var cl = snap.exists ? snap.data() : null;
      var m = birles(cl, yr); yerelYaz(m); bulut = m;
      ls("hs_last", kimlik);
      var degisti = !cl || !ayni(cl.d || {}, m.d);
      var p = degisti ? ref.set({ kul: oda.koltuk, ad: oda.ad || "", d: m.d, dt: m.dt, t: st(), son: { o: oyunKodu, t: st() } }, { merge: true }) : nabiz();
      return p.then(function () { senk = true; durum(); });
    }).catch(function (e) { if (!bulut) setTimeout(function () { if (user && oda && !bulut) esitle().then(bitti, bitti); }, 8000); throw e; });
  }
  var planT = 0, gonderiyor = false;
  function planla() { if (!user || !db || !oda) return; clearTimeout(planT); planT = setTimeout(gonder, DEBOUNCE); }
  function gonder() {
    if (!user || !db || !oda || !bulut || gonderiyor) { if (gonderiyor || (user && oda && !bulut)) planla(); return; }
    var yr = yerel(), onceki = bulut ? bulut.d : {}, m = birles(bulut, yr);
    if (ayni(m.d, onceki)) { dirty = false; return; }
    gonderiyor = true; dirty = false;
    var ref = odaRef().collection("oyuncular").doc(oda.koltuk), son = null;
    db.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) { var cl = snap.exists ? snap.data() : null; son = birles(cl, yerel()); tx.set(ref, { d: son.d, dt: son.dt, t: st(), son: { o: oyunKodu, t: st() } }, { merge: true }); });
    }).then(function () { olaylar(onceki, son.d); yerelYaz(son); bulut = son; gonderiyor = false; if (dirty) planla(); })
      .catch(function () { gonderiyor = false; dirty = true; setTimeout(planla, 5000); });
  }
  function nabiz() {
    if (!user || !db || !oda || document.hidden) return Promise.resolve();
    return odaRef().collection("oyuncular").doc(oda.koltuk).set({ kul: oda.koltuk, ad: oda.ad || "", son: { o: oyunKodu, t: st() } }, { merge: true }).catch(function () {});
  }
  function olay(o, k, v) { if (!user || !db || !oda) return Promise.resolve(); return odaRef().collection("akis").add({ uid: oda.koltuk, o: o, k: k, v: v, t: st() }).catch(function () {}); }
  function olaylar(a, b) {
    function artti(k) { return num(b[k]) > num(a[k]); }
    if (artti("ok_max")) { var s = arr(b.ok_stars), L = num(b.ok_max); olay("ok", "bolum", L * 10 + Math.min(3, num(s[L - 1]))); }
    if (artti("kb_max")) olay("kelime", "bolum", num(b.kb_max));
    if (artti("kb_rozet")) olay("kelime", "rozet", num(b.kb_rozet));
    if (artti("pm_best")) olay("kase", "rekor", num(b.pm_best));
    if (artti("pm_sufle")) olay("kase", "sufle", num(b.pm_sufle));
    ["pm_muffin2", "pm_tost2", "pm_kalp1"].forEach(function (k) { if (b[k] === "1" && a[k] !== "1") olay("kase", k, 1); });
    if (artti("sef_best")) olay("plan", "rekor", num(b.sef_best));
    if (num(b.stb_best) > num(a.stb_best) && num(b.stb_best) >= 5) olay("stilobat", "rekor", num(b.stb_best));
    if (num(b.yk_seviye) > num(a.yk_seviye) && num(b.yk_seviye) >= 2) olay("yikim", "seviye", num(b.yk_seviye));
    for (var k in b) if (k.indexOf("gk_d") === 0 && b[k] !== a[k]) { try { var g = JSON.parse(b[k]), g0 = a[k] ? JSON.parse(a[k]) : null; if (g && g.s !== "p" && (!g0 || g0.s === "p")) olay("gunun", g.s === "w" ? "buldu" : "bulamadi", g.g ? g.g.length : 0); } catch (e) {} }
  }

  /* ---- başlat ---- */
  function bitti() { if (hazir) return; hazir = true; hazirCb.forEach(function (f) { try { f(); } catch (e) {} }); hazirCb = []; }
  function hazirOl(f) { if (hazir) f(); else hazirCb.push(f); }
  setTimeout(bitti, ZAMAN_ASIMI);
  var baglandi = false, girisSoz = null;
  function baglan() {
    if (baglandi) return girisSoz; baglandi = true;
    girisSoz = sdkYukle().then(function () {
      kur();
      return new Promise(function (res, rej) {
        auth.onAuthStateChanged(function (u) {
          if (u) { user = u; durum(); if (oda) { odaDinle(); esitle().then(bitti, bitti); } else { kisiBul().then(bitti, bitti); } res(u); return; }
          auth.signInAnonymously().catch(function (e) { sdkHata = true; bitti(); durum(); rej(e); });
        });
      });
    }).catch(function (e) { sdkHata = true; baglandi = false; bitti(); durum(); throw e; });   /* başarısızsa bir sonraki denemede yeniden bağlanmayı dene */
    return girisSoz;
  }
  /* yerel kayıt yoksa ama cihaz kimliği duruyorsa: kisiler/{fuid} üzerinden odayı geri bul */
  function kisiBul() {
    return db.collection("kisiler").doc(user.uid).get().then(function (s) {
      if (!s.exists) return;
      var k = s.data(); return db.collection("odalar").doc(k.oda).get().then(function (o) {
        if (!o.exists) return; var v = o.data(), kt = v.koltuk && v.koltuk[k.koltuk]; if (!kt || kt.uid !== user.uid) return;
        oda = { oda: k.oda, koltuk: k.koltuk, ad: kt.ad, anahtar: kt.anahtar, adlar: { a: v.koltuk.a.ad, b: v.koltuk.b.ad } }; ls("yg_oda", JSON.stringify(oda));
        odaDinle(); return esitle();
      });
    }).catch(function () {});
  }
  if (oda) baglan(); else bitti();                                  /* odası olmayan cihazda Firebase ancak oda açarken yüklenir */
  setInterval(function () { if (dirty) planla(); if (user && !document.hidden) nabiz(); }, NABIZ);
  function flush() { if (dirty && user && db) { clearTimeout(planT); gonder(); } }
  addEventListener("pagehide", flush); document.addEventListener("visibilitychange", function () { if (document.hidden) flush(); else gorundu(); });
  var sonGorundu = 0;
  function gorundu() { var t = now(); if (t - sonGorundu < 15000) return; sonGorundu = t; if (user && db) nabiz(); }
  addEventListener("pageshow", function (e) { if (e.persisted) gorundu(); }); addEventListener("focus", gorundu);

  /* ---- oda işlemleri ---- */
  function adTemizle(ad) { return String(ad || "").replace(/\s+/g, " ").trim().slice(0, 16); }
  function odaKur(ad) {
    ad = adTemizle(ad); if (!ad) return Promise.reject(new Error("ad"));
    return baglan().then(function () {
      var id = rastgele(6), kod = rastgele(8), anahtar = rastgele(8), ref = db.collection("odalar").doc(id);
      var doc = { kod: kod, kodSon: now() + KOD_SURE, t: st(), koltuk: { a: { uid: user.uid, ad: ad, anahtar: anahtar, onay: now() }, b: { uid: null, ad: "", anahtar: rastgele(8) } }, ayar: { cumle: "", tema: "mor", kelimeler: { ciz: [], yasak: [] } } };
      var b = db.batch(); b.set(ref, doc); b.set(db.collection("kodlar").doc(kod), { oda: id, son: now() + KOD_SURE }); b.set(db.collection("kisiler").doc(user.uid), { oda: id, koltuk: "a" }); b.set(ref.collection("oyuncular").doc("a"), { kul: "a", ad: ad, t: st() });
      return b.commit().then(function () {
        oda = { oda: id, koltuk: "a", ad: ad, anahtar: anahtar, adlar: { a: ad, b: "" } }; ls("yg_oda", JSON.stringify(oda)); ls("hs_last", null); sarma = null;
        odaDinle(); return esitle().catch(function () {}).then(function () { return { oda: id, kod: kod, anahtar: id + "-A-" + anahtar }; });
      });
    });
  }
  function kodTemizle(k) { return String(k || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function katil(kod, ad) {
    ad = adTemizle(ad); kod = kodTemizle(kod);
    if (!ad) return Promise.reject(new Error("ad")); if (kod.length !== 8) return Promise.reject(new Error("kod"));
    return baglan().then(function () {
      return db.collection("kodlar").doc(kod).get().then(function (s) {
        if (!s.exists) throw new Error("yok");
        var k = s.data(); if (num(k.son) < now()) throw new Error("eski");
        if (oda && oda.oda === k.oda) throw new Error("kendin");
        var ref = db.collection("odalar").doc(k.oda), anahtar = rastgele(8);
        /* oda belgesi katılmadan önce okunamaz (kurallar); körlemesine yazılır, kurallar B koltuğunun boş ve kodun geçerli olduğuna bakar */
        return ref.update({ "koltuk.b": { uid: user.uid, ad: ad, anahtar: anahtar, onay: now() }, kanit: kod, t: st() })
          .catch(function (e) { var c = e && e.code; throw new Error(c === "not-found" ? "yok" : c === "permission-denied" ? "dolu" : (e && e.message) || "hata"); })
          .then(function () { return ref.get(); })
          .then(function (o) {
            var v = o.exists ? o.data() : null; if (!v || !v.koltuk || !v.koltuk.b || v.koltuk.b.uid !== user.uid) throw new Error("dolu");
            var b = db.batch(); b.set(db.collection("kisiler").doc(user.uid), { oda: k.oda, koltuk: "b" }); b.set(ref.collection("oyuncular").doc("b"), { kul: "b", ad: ad, t: st() }); b.delete(db.collection("kodlar").doc(kod));
            return b.commit().catch(function () {}).then(function () {
              oda = { oda: k.oda, koltuk: "b", ad: ad, anahtar: anahtar, adlar: { a: v.koltuk.a.ad || "", b: ad } }; ls("yg_oda", JSON.stringify(oda)); ls("hs_last", null); sarma = null;
              odaDinle(); return esitle().catch(function () {}).then(function () { return { oda: k.oda, anahtar: k.oda + "-B-" + anahtar }; });
            });
          });
      });
    });
  }
  /* kurtarma anahtarı: ODA-K-ANAHTAR → o koltuğa bu cihaz oturur */
  function geriDon(anahtar) {
    var p = String(anahtar || "").toUpperCase().replace(/\s/g, "").split("-");
    if (p.length !== 3 || (p[1] !== "A" && p[1] !== "B")) return Promise.reject(new Error("bicim"));
    var id = p[0], k = p[1].toLowerCase(), gizli = p[2];
    return baglan().then(function () {
      var ref = db.collection("odalar").doc(id), upd = { kanit: gizli, t: st() }; upd["koltuk." + k + ".uid"] = user.uid;
      return ref.update(upd).then(function () { return ref.get(); }).then(function (o) {
        if (!o.exists) throw new Error("yok"); var v = o.data(), kt = v.koltuk[k];
        oda = { oda: id, koltuk: k, ad: kt.ad, anahtar: kt.anahtar, adlar: { a: v.koltuk.a.ad, b: v.koltuk.b.ad } }; ls("yg_oda", JSON.stringify(oda)); ls("hs_last", null); sarma = null;
        db.collection("kisiler").doc(user.uid).set({ oda: id, koltuk: k }).catch(function () {});
        odaDinle(); return esitle().catch(function () {}).then(function () { return { oda: id, koltuk: k }; });
      }).catch(function (e) { var c = e && e.code; throw new Error(c === "permission-denied" || c === "not-found" || (e && e.message === "yok") ? "yanlis" : (e && e.message) || "hata"); });
    });
  }
  function ayarYaz(ayar) { if (!oda) return Promise.reject(new Error("oda")); return baglan().then(function () { var u = {}; for (var k in ayar) u["ayar." + k] = ayar[k]; u.t = st(); return odaRef().update(u); }); }
  function adYaz(ad) { ad = adTemizle(ad); if (!oda || !ad) return Promise.reject(new Error("ad")); return baglan().then(function () { var u = { t: st() }; u["koltuk." + oda.koltuk + ".ad"] = ad; return odaRef().update(u).then(function () { oda.ad = ad; ls("yg_oda", JSON.stringify(oda)); return odaRef().collection("oyuncular").doc(oda.koltuk).set({ ad: ad }, { merge: true }); }); }); }
  function yeniKod() { if (!oda) return Promise.reject(new Error("oda")); return baglan().then(function () { var kod = rastgele(8), b = db.batch(); b.update(odaRef(), { kod: kod, kodSon: now() + KOD_SURE }); b.set(db.collection("kodlar").doc(kod), { oda: oda.oda, son: now() + KOD_SURE }); return b.commit().then(function () { return kod; }); }); }
  function ayril() { flush(); ls("yg_oda", null); ls("hs_last", null); oda = null; odaVeri = null; sarma = null; if (user && db) db.collection("kisiler").doc(user.uid).delete().catch(function () {}); }
  /* odayı sil: alt koleksiyonlar dahil (iki taraf için de biter) */
  function odayiSil() {
    if (!oda) return Promise.reject(new Error("oda"));
    return baglan().then(function () {
      var r = odaRef(), kols = ["oyuncular", "akis", "sohbet", "hafiza", "sayi", "xox", "tepe", "satranc", "amiral", "asmaca", "zincir", "sonkart", "dort", "ciz", "kelimeavi", "takvim"];
      return Promise.all(kols.map(function (k) { return r.collection(k).get().then(function (s) { var b = db.batch(); s.forEach(function (d) { b.delete(d.ref); }); return b.commit(); }).catch(function () {}); }))
        .then(function () { return r.get(); }).then(function (o) { var v = o.exists ? o.data() : null, b = db.batch(); if (v && v.kod) b.delete(db.collection("kodlar").doc(v.kod)); b.delete(r); b.delete(db.collection("kisiler").doc(user.uid)); return b.commit(); })
        .then(function () { ayril(); temizle(); });
    });
  }

  /* ---- menü önbelleği ----
     Menü her açılışta 12 maç belgesini okumasın: bir oyunun yerel kopyası, ben o oyuna girmediysem,
     arkadaşım o oyunda görünmediyse (oyuncular/{öteki}.son) ve 15 dakikadan yeniyse yeniden okunmaz. */
  var MC_SURE = 900000, MC_PAY = 120000, MC_OYUN = ["sayi", "amiral", "kelimeavi", "xox", "tepe", "zincir", "sonkart", "dort", "ciz", "asmaca", "satranc", "hafiza"], digerSon = null;
  if (MC_OYUN.indexOf(oyunKodu) >= 0) ls("yg_mz_" + oyunKodu, String(now()));          /* bu oyuna girildi: menüdeki kopyası eskidi */
  function ms(t) { return t && t.toMillis ? t.toMillis() : num(t); }
  function incelt(v, d) {   /* önbelleğe hafif kopya: uzun diziler yalnız boyuyla, uzun yazılar boş */
    if (Array.isArray(v)) return v.length > 60 ? new Array(v.length) : v.map(function (x) { return incelt(x, d + 1); });
    if (v && typeof v === "object") { if (v.toMillis) return v.toMillis(); var o = {}; for (var k in v) o[k] = d > 5 ? null : incelt(v[k], d + 1); return o; }
    return typeof v === "string" && v.length > 300 ? "" : v;
  }
  function snapGibi(v) { return { exists: !!v, data: function () { return v; } }; }
  /* öteki koltuğun oyuncu belgesi canlı izlenir: menüde "şu an XOX'ta / en son 14:20, Satranç" ve önbelleğin tazeliği için */
  var digerSozC = null, digerVeri = null, digerCb = [];
  function digerDinle() {
    if (digerSozC) return digerSozC;
    digerSozC = window.Hesap.db().then(function (d) {
      return new Promise(function (res) {
        d.collection("oyuncular").doc(oda.koltuk === "a" ? "b" : "a").onSnapshot(function (s) {
          digerVeri = s.exists ? s.data() : null; digerSon = (digerVeri && digerVeri.son) || null; res();
          digerCb.forEach(function (f) { try { f(digerVeri); } catch (e) {} });
        }, function () { res(); });
      });
    }).catch(function () {});
    return digerSozC;
  }
  function digerIzle(f) { digerCb.push(f); if (digerVeri) f(digerVeri); digerDinle(); }
  function macOku(kol, belge) {
    if (!oda) return Promise.reject(new Error("oda"));
    belge = belge || "mac";
    var anah = "yg_mc_" + oda.oda + "_" + kol + (belge === "mac" ? "" : "_" + belge), c = null, z = num(ls("yg_mz_" + kol));
    try { c = JSON.parse(ls(anah) || "null"); } catch (e) {}
    return window.Hesap.db().then(function (d) {
      return digerDinle().then(function () {
        var taze = c && now() - c.t < MC_SURE && c.t > z && !(digerSon && digerSon.o === kol && ms(digerSon.t) > c.t - MC_PAY);
        if (taze) return snapGibi(c.d);
        return d.collection(kol).doc(belge).get().then(function (s) {
          var v = s.exists ? incelt(s.data(), 0) : null;
          try { localStorage.setItem(anah, JSON.stringify({ t: now(), d: v })); } catch (e) {}
          return snapGibi(v);
        });
      });
    });
  }

  /* ---- dışa açılan arayüz ---- */
  var durumCb = [];
  function durum() { durumCb.forEach(function (f) { try { f(kim()); } catch (e) {} }); }
  window.Hesap = {
    kim: kim,
    izle: function (f) { durumCb.push(f); f(kim()); },
    hazir: hazirOl,
    gorunenAd: gorunenAd,
    oda: function () { return oda ? { oda: oda.oda, koltuk: oda.koltuk, ad: oda.ad, anahtar: oda.oda + "-" + oda.koltuk.toUpperCase() + "-" + oda.anahtar, kod: odaVeri ? odaVeri.kod : null, kodSon: odaVeri ? odaVeri.kodSon : 0, ayar: odaVeri ? odaVeri.ayar : null, dolu: !!(odaVeri && odaVeri.koltuk.b.uid), veri: odaVeri } : null; },
    odaIzle: function (f) { odaCb.push(f); if (odaVeri) f(odaVeri); },
    oyun: function (list) { hazirOl(function () { (function sira(i) { if (i >= list.length) return; var s = document.createElement("script"); s.src = list[i]; s.onload = s.onerror = function () { sira(i + 1); }; document.body.appendChild(s); })(0); }); },
    odaKur: odaKur, katil: katil, geriDon: geriDon, ayarYaz: ayarYaz, adYaz: adYaz, yeniKod: yeniKod, ayril: ayril, odayiSil: odayiSil,
    macOku: macOku,
    digerIzle: digerIzle,
    zaman: ms,
    db: function () { if (!oda) return Promise.reject(new Error("oda")); return baglan().then(function () { return sarmala(); }); },
    fb: function () { return baglan().then(function () { return firebase; }); },
    tms: tms, kural: kural, birlestir: birlestir, birles: birles, yerel: yerel,
    senk: function () { return senk; },
    _test: function () { return { hazir: hazir, user: !!user, oda: oda, bulut: bulut, dirty: dirty, sdkHata: sdkHata, senk: senk }; }
  };
})();
