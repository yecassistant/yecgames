/* Düello altyapısı – iki kişilik, sıra tabanlı oyunların ortak kısmı (Sayı Düellosu, Amiral Battı …).
   Yapar: giriş kapısı, rakibi bulma (oyuncular koleksiyonu canlı), çevrimiçi noktası, oyun kurma, seri + akış yazımı, bitiş kartı, başlık altı seri yazısı.
   Kullanım: var D = Duello({ kol: "sayi", sayfa: "sayi", yeniDoc: fn(d, ME, OTHER) → yeni oyun dokümanı, onMac: fn(d, ilk), onYok: fn(), bitis: fn(d) → { baslik, metin },
             seriKod: fn(d) → akış kodu (0–99), benBitirdim: fn(d) → bool, eskiMi: fn(d) → eski biçimli doküman mı (yeni oyunla değiştirilir) … });  D.me, D.other, D.adlar, D.db, D.ref, D.seriRef, D.digerAd, D.msg(), D.ekDe(), D.ekIn(), D.esc(), D.gizle(), D.coz() */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function sonUnlu(ad) { var m = String(ad).toLowerCase().match(/[aeıioöuü](?![\s\S]*[aeıioöuü])/); return m ? m[0] : "a"; }
  function ekDe(ad) { var v = sonUnlu(ad); return ad + "'" + (/[fstkçşhp]$/i.test(ad) ? "t" : "d") + (/[aıou]/.test(v) ? "a" : "e"); }
  function ekIn(ad) { var v = sonUnlu(ad), h = /[aı]/.test(v) ? "ı" : /[ou]/.test(v) ? "u" : /[öü]/.test(v) ? "ü" : "i"; return ad + "'" + (/[aeıioöuü]$/i.test(ad) ? "n" : "") + h + "n"; }
  function ekI(ad) { var v = sonUnlu(ad), h = /[aı]/.test(v) ? "ı" : /[ou]/.test(v) ? "u" : /[öü]/.test(v) ? "ü" : "i"; return ad + "'" + (/[aeıioöuü]$/i.test(ad) ? "y" : "") + h; }
  /* gizli veri: bulut konsolunda göz ucuyla okunmasın diye hafif karıştırma (şifreleme değil; oyuncular birbirine güveniyor) */
  function anahtar(k) { var h = 2166136261, s = String(k); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; } return h; }
  function akis(k, n) { var x = anahtar(k) || 1, out = []; for (var i = 0; i < n; i++) { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; out.push(x & 255); } return out; }
  function gizle(str, k) { var s = String(str), ks = akis(k, s.length), out = ""; for (var i = 0; i < s.length; i++) out += String.fromCharCode(s.charCodeAt(i) ^ ks[i]); try { return btoa(unescape(encodeURIComponent(out))); } catch (e) { return ""; } }
  function coz(b64, k) { try { var s = decodeURIComponent(escape(atob(b64))), ks = akis(k, s.length), out = ""; for (var i = 0; i < s.length; i++) out += String.fromCharCode(s.charCodeAt(i) ^ ks[i]); return out; } catch (e) { return ""; } }

  window.Duello = function (o) {
    var D = { me: null, other: null, adlar: {}, kul: {}, db: null, ref: null, seriRef: null, digerAd: "Rakip", seri: null, G: null, esc: esc, ekDe: ekDe, ekIn: ekIn, ekI: ekI, gizle: gizle, coz: coz, hazirMi: false, dinliyor: false, bittiGosterildi: -1, seriYazildi: -1, bitirenBenim: false };
    var sub = $(o.sub || "sub");
    D.msg = function (t, kalici) { var m = $("msg"); if (!m) return; m.textContent = t; clearTimeout(D.msg.t); if (!kalici) D.msg.t = setTimeout(function () { m.textContent = ""; }, 2800); };
    D.altYaz = function () {
      if (!D.me || !sub) return;
      var g = (D.seri && D.seri.g) || {}, a = g[D.me] || 0, b = D.other ? (g[D.other] || 0) : 0, be = (D.seri && D.seri.b) || 0;
      sub.textContent = D.seri && D.seri.oyun ? "Seri " + a + " – " + b + (be ? " · " + be + " berabere" : "") : "İlk oyun";
    };
    function rakipGoster() {
      if (D.other) { $("avaOther").textContent = (D.adlar[D.other] || "?").charAt(0).toUpperCase(); $("avaOther").className = "hsava " + D.other; $("adOther").textContent = D.adlar[D.other]; }
      else { $("avaOther").textContent = D.digerAd.charAt(0).toUpperCase(); $("adOther").textContent = D.digerAd; }
    }
    function rakipIzle() {
      D.db.collection("oyuncular").doc(D.other).onSnapshot(function (snap) {
        var p = snap.exists ? snap.data() : null, t = p && p.son && p.son.t ? Hesap.tms(p.son.t) : 0;
        $("avaOther").classList.toggle("cevrimici", !!(t && Date.now() - t < 390000 && p.son.o === o.sayfa));
      }, function () {});
    }
    D.baslatKarti = function () {
      if (D.other) { $("startTitle").textContent = o.startTitle || "Hazır mısın?"; $("startText").textContent = o.startText || ""; $("startGo").disabled = false; }
      else { $("startTitle").textContent = "Arkadaşın henüz odada değil"; $("startText").textContent = "Oda kodunu ona gönder; katıldığı an burası kendini günceller, oyunu kurabilirsin."; $("startGo").disabled = true; }
    };
    D.yeniOyun = function () {
      if (!D.other) { D.msg("Arkadaşın henüz odaya katılmadı.", true); return; }
      $("startGo").disabled = true; $("doneNew").disabled = true;
      D.db.runTransaction(function (tx) {
        return tx.get(D.ref).then(function (snap) {
          var d = snap.exists ? snap.data() : null;
          if (d && !d.bitti && !(o.eskiMi && o.eskiMi(d))) return;              /* eski sürümden kalmış yarım oyun yenisiyle değişebilir */
          var doc = o.yeniDoc(d, D.me, D.other); doc.n = (d && d.n || 0) + 1; doc.v = 1; doc.bitti = false; doc.sonuc = ""; doc.kazanan = null; doc.t = firebase.firestore.FieldValue.serverTimestamp();
          tx.set(D.ref, doc);
        });
      }).then(function () { $("startGo").disabled = false; $("doneNew").disabled = false; $("start").hidden = true; $("done").hidden = true; })
        .catch(function () { $("startGo").disabled = false; $("doneNew").disabled = false; D.msg("Kurulamadı, tekrar dene."); });
    };
    D.bitisGoster = function () {
      var G = D.G; if (!G || !G.bitti || D.bittiGosterildi === G.n) return; D.bittiGosterildi = G.n;
      var b = o.bitis(G), kazandim = G.kazanan === D.me, berabere = !G.kazanan;
      $("doneKick").textContent = b.kick || ("Oyun " + G.n);
      $("doneTitle").textContent = b.baslik; $("doneText").textContent = b.metin || "";
      var g = (D.seri && D.seri.g) || {}, yeni = !D.seri || D.seri.oyun < G.n, a = (g[D.me] || 0) + (kazandim && yeni ? 1 : 0), c = (g[D.other] || 0) + (!kazandim && !berabere && yeni ? 1 : 0);
      $("doneStats").innerHTML = "<div><b>" + a + "</b><span>" + esc(D.adlar[D.me] || "sen") + "</span></div><div><b>" + c + "</b><span>" + esc(D.adlar[D.other] || "rakip") + "</span></div>";
      if (b.ek) { var ek = $("doneEk"); if (ek) ek.innerHTML = b.ek; }
      $("done").hidden = false;
      if (window[o.ses]) try { window[o.ses].play(berabere ? "draw" : kazandim ? "win" : "lose"); } catch (e) {}
    };
    D.seriGuncelle = function () {
      var G = D.G; if (!G || !G.bitti || D.seriYazildi === G.n) return; D.seriYazildi = G.n;
      var n = G.n, kazanan = G.kazanan || "", sonuc = G.sonuc, kod = o.seriKod ? o.seriKod(G) : 0, ben = D.bitirenBenim || (o.benBitirdim ? o.benBitirdim(G) : false);
      setTimeout(function () {
        D.db.runTransaction(function (tx) {
          return tx.get(D.seriRef).then(function (snap) {
            var s = snap.exists ? snap.data() : { g: {}, b: 0, oyun: 0, son: [] };
            if (s.oyun >= n) throw new Error("var");
            var g = {}; for (var k in s.g) g[k] = s.g[k]; if (kazanan) g[kazanan] = (g[kazanan] || 0) + 1;
            var sonlar = (s.son || []).slice(-9); sonlar.push({ n: n, k: kazanan, s: sonuc });
            tx.set(D.seriRef, { g: g, b: (s.b || 0) + (kazanan ? 0 : 1), oyun: n, son: sonlar, t: firebase.firestore.FieldValue.serverTimestamp() });
          });
        }).then(function () {
          D.db.collection("akis").add({ uid: D.me, o: o.kol, k: !kazanan ? "berabere" : kazanan === D.me ? "kazandi" : "kaybetti", v: n * 100 + Math.min(99, kod), t: firebase.firestore.FieldValue.serverTimestamp() }).catch(function () {});
        }).catch(function () {});
      }, ben ? 0 : 5000);
    };
    function dinle() {
      D.seriRef.onSnapshot(function (snap) { D.seri = snap.exists ? snap.data() : null; D.altYaz(); }, function () {});
      if (D.other) rakipIzle();
      D.ref.onSnapshot(function (snap) {
        var d = snap.exists ? snap.data() : null;
        D.altYaz();
        if (!d || (o.eskiMi && o.eskiMi(d))) { D.G = null; $("start").hidden = false; $("startKick").textContent = d ? "Yeni sürüm" : "İlk oyun"; D.baslatKarti(); if (o.onYok) o.onYok(); return; }
        var ilk = !D.G || D.G.n !== d.n;
        D.G = d; $("start").hidden = true;
        if (ilk) { D.bittiGosterildi = -1; D.bitirenBenim = false; $("done").hidden = true; }
        o.onMac(d, ilk);
        if (d.bitti) { D.seriGuncelle(); if (D.bittiGosterildi !== d.n) setTimeout(D.bitisGoster, typeof o.bitisGecikme === "function" ? o.bitisGecikme() : (o.bitisGecikme || 0)); }
      }, function () { if (sub) sub.textContent = "Bağlantı yok"; D.msg("Bağlantı kurulamadı.", true); });
    }
    function basla() {
      var k = Hesap.kim();
      if (!k) { if (Hesap._test && Hesap._test().oda && !Hesap._test().sdkHata && !D.hazirMi) { if (sub) sub.textContent = "Bağlanıyor…"; return; } $("gate").hidden = false; if (sub) sub.textContent = ""; return; }
      if (!k.kesin || D.hazirMi) return;
      D.hazirMi = true; D.me = k.uid; D.adlar[D.me] = k.ad; D.kul[D.me] = k.kul; $("gate").hidden = true;
      var digerK = k.kul === "a" ? "b" : "a";
      D.digerAd = Hesap.gorunenAd(digerK) || "Arkadaşın";
      $("avaMe").textContent = (k.ad || "?").charAt(0).toUpperCase(); $("avaMe").className = "hsava " + k.kul; $("adMe").textContent = k.ad;
      $("avaOther").className = "hsava " + digerK; rakipGoster();
      Hesap.db().then(function (d) {
        D.db = d; D.ref = d.collection(o.kol).doc("mac"); D.seriRef = d.collection(o.kol).doc("seri");
        /* rakip: odanın öteki koltuğu dolunca belirir (oda belgesi canlı izlenir) */
        Hesap.odaIzle(function (v) {
          if (!v) return;
          var kt = v.koltuk && v.koltuk[digerK];
          if (kt && kt.ad) { D.adlar[digerK] = kt.ad; D.kul[digerK] = digerK; D.digerAd = kt.ad; }
          if (k.ad !== (v.koltuk[k.kul] || {}).ad && v.koltuk[k.kul] && v.koltuk[k.kul].ad) { D.adlar[D.me] = v.koltuk[k.kul].ad; $("adMe").textContent = D.adlar[D.me]; $("avaMe").textContent = D.adlar[D.me].charAt(0).toUpperCase(); }
          var yeni = kt && kt.uid ? digerK : null;
          if (yeni && !D.other) { D.other = yeni; rakipGoster(); rakipIzle(); if (D.dinliyor) { D.baslatKarti(); D.msg(D.adlar[D.other] + " odaya katıldı, oyun kurulabilir."); if (o.onRakip) o.onRakip(); } }
          else if (D.other) rakipGoster();
          if (!D.dinliyor) {
            D.dinliyor = true;
            if (!D.other) D.msg("Arkadaşın henüz odaya katılmadı; katılınca oyun başlar.", true);
            try { if (localStorage.getItem(o.helpKey || (o.kol + "_help")) !== "1") $("help").hidden = false; } catch (e) {}
            dinle();
          }
        });
      }).catch(function () { if (sub) sub.textContent = "Bağlantı yok"; D.msg("Bağlantı kurulamadı.", true); });
    }
    $("startGo").onclick = D.yeniOyun; $("doneNew").onclick = D.yeniOyun;
    $("doneClose").onclick = function () { $("done").hidden = true; };
    $("bHelp").onclick = function () { $("help").hidden = false; };
    $("helpGo").onclick = function () { $("help").hidden = true; try { localStorage.setItem(o.helpKey || (o.kol + "_help"), "1"); } catch (e) {} };
    Hesap.izle(function () { basla(); });
    Hesap.hazir(function () { if (!Hesap.kim()) basla(); });
    return D;
  };
})();
