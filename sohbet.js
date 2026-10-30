/* Emoji sohbeti: 2 kişilik oyunlarda ve menüde sağ kenarda küçük bir sekme.
   Firestore: sohbet/{uid} = { e: emoji, o: sayfa, n: sayaç, t: zaman, ad }  — her kişinin tek belgesi, karşı tarafınkini dinleriz.
   Hangi oyunda olursak olalım, gönderilen emoji öbürünün açık sayfasında uçar. Sonra yazı da eklenebilir (alan: y). */
(function () {
  "use strict";
  if (window.__sohbet) return; window.__sohbet = true;
  var EMOJI = ["🫣", "🫠", "😬", "😁", "😅", "🥲", "🙃", "🥰", "😵‍💫", "😵", "😂", "😘", "🔥", "👏", "☕"];
  var SAYFA = { oyunlar: "menüden", hafiza: "Hafıza'dan", sayi: "Sayı Düellosu'ndan", xox: "XOX'tan", tepe: "Tepe Savaşı'ndan", satranc: "Satranç'tan", amiral: "Amiral Battı'dan", asmaca: "Adam Asmaca'dan", zincir: "Kelime Zinciri'nden", sonkart: "Son Kart'tan", dort: "Dört Taş'tan", ciz: "Çiz Bil'den", kelimeavi: "Kelime Avı'ndan" };
  var sayfa = document.body.getAttribute("data-page") || "";
  var me = null, other = null, db = null, sayac = 0, sonGonder = 0, gorulen = 0, kurulu = false;
  try { gorulen = +localStorage.getItem("sh_gorulen") || 0; } catch (e) {}

  /* ---- arayüz ---- */
  var kok = document.createElement("div"); kok.className = "shkok"; kok.hidden = true;
  kok.innerHTML = '<button type="button" class="shsekme" aria-label="Emoji gönder" aria-expanded="false"><span class="shsimge">💬</span><i class="shnokta" hidden></i></button>' +
    '<div class="shtepsi" role="menu" hidden>' + EMOJI.map(function (e) { return '<button type="button" class="shem" role="menuitem">' + e + '</button>'; }).join("") +
    '<form class="shyaz" autocomplete="off"><input class="shin" type="text" maxlength="60" placeholder="Bir şey yaz…" enterkeyhint="send" aria-label="Mesaj"><button type="submit" class="shgit" aria-label="Gönder">➤</button></form></div>';
  var form = kok.querySelector(".shyaz"), girdi = kok.querySelector(".shin");
  var sekme = kok.querySelector(".shsekme"), tepsi = kok.querySelector(".shtepsi"), nokta = kok.querySelector(".shnokta");
  /* konum: elle sürüklendiyse o sayfa için hatırlanır; yoksa oyunun düğmelerine/tahtasına denk gelmeyen boş bir yer aranır */
  var yy = 0.58, elle = false, YK = "sh_y_" + sayfa;
  try { var k0 = parseFloat(localStorage.getItem(YK)); if (k0 > 0.1 && k0 < 0.9) { yy = k0; elle = true; } } catch (e) {}
  function yer() { kok.style.top = Math.round(yy * innerHeight) + "px"; }
  var ETKIN = "button,a,input,select,textarea,label,[role=button],[onclick],canvas,.stsq,.hdk,.abc,.dtk,.kah,.katablo";
  function engelVar(y) {
    var xs = [innerWidth - 6, innerWidth - 40], ys = [y - 24, y, y + 24];
    for (var i = 0; i < xs.length; i++) for (var j = 0; j < ys.length; j++) {
      var el = document.elementsFromPoint(xs[i], ys[j]);
      for (var k = 0; k < el.length; k++) {
        var e = el[k]; if (kok.contains(e)) continue;
        var t = e.closest && e.closest(ETKIN); if (!t) continue;
        if (t.tagName === "CANVAS") { var rc = t.getBoundingClientRect(); if (rc.width * rc.height > innerWidth * innerHeight * 0.6) continue; }   /* tam ekran oyun tuvali (Tepe) engel sayılmaz */
        if (t.closest("[hidden]")) continue;
        return true;
      }
    }
    return false;
  }
  function bosYer() {
    if (elle || !document.body.contains(kok) || !tepsi.hidden) return;
    var simdi = Date.now(); if (bosYer.son && simdi - bosYer.son < 1500) { clearTimeout(bosYer.g); bosYer.g = setTimeout(bosYer, 1600 - (simdi - bosYer.son)); return; } bosYer.son = simdi;
    var gizli = kok.style.visibility; kok.style.visibility = "hidden";
    var en = null, h = innerHeight;
    for (var f = 0.12; f <= 0.881; f += 0.03) { var y = f * h; if (!engelVar(y)) { if (en === null || Math.abs(f - 0.58) < Math.abs(en - 0.58)) en = f; } }
    kok.style.visibility = gizli;
    if (en !== null) { yy = en; yer(); }
  }
  function ac(a) { if (!a && document.activeElement === girdi) girdi.blur(); tepsi.hidden = !a; sekme.setAttribute("aria-expanded", a ? "true" : "false"); kok.classList.toggle("acik", a); if (a) nokta.hidden = true; }

  /* sekme yukarı-aşağı sürüklenebilir (oyunun düğmesine denk gelirse çekip kenara alırsın) */
  var bas = null, kaydi = false;
  sekme.addEventListener("pointerdown", function (e) { bas = { y: e.clientY, yy: yy }; kaydi = false; try { sekme.setPointerCapture(e.pointerId); } catch (x) {} });
  sekme.addEventListener("pointermove", function (e) {
    if (!bas) return; var d = e.clientY - bas.y; if (!kaydi && Math.abs(d) < 8) return;
    kaydi = true; ac(false); yy = Math.max(0.12, Math.min(0.88, bas.yy + d / innerHeight)); yer();
  });
  sekme.addEventListener("pointerup", function () { if (kaydi) { try { localStorage.setItem(YK, yy.toFixed(3)); elle = true; } catch (x) {} } bas = null; });
  sekme.addEventListener("pointercancel", function () { bas = null; });
  sekme.addEventListener("click", function () { if (kaydi) { kaydi = false; return; } ac(tepsi.hidden); });
  document.addEventListener("pointerdown", function (e) { if (!tepsi.hidden && !kok.contains(e.target)) ac(false); }, true);
  [].forEach.call(kok.querySelectorAll(".shem"), function (b) { b.addEventListener("click", function () { gonder(b.textContent); }); });
  addEventListener("resize", function () { if (document.activeElement !== girdi) { yer(); clearTimeout(bosYer.t); bosYer.t = setTimeout(bosYer, 300); } });
  /* yazarken tuşlar oyuna gitmesin (Dört Taş'ta 1-7, Tepe'de oklar, Asmaca/Zincir'de harfler) */
  ["keydown", "keyup", "keypress"].forEach(function (ev) { girdi.addEventListener(ev, function (e) { e.stopPropagation(); }); });
  form.addEventListener("submit", function (e) {
    e.preventDefault(); var y = girdi.value.replace(/\s+/g, " ").trim().slice(0, 60); if (!y) return;
    if (gonder(null, y)) girdi.value = "";
  });

  function ucur(emo, benden) {
    var r = sekme.getBoundingClientRect(), n = benden ? 1 : 5;
    for (var i = 0; i < n; i++) (function (i) {
      var u = document.createElement("span"); u.className = "shucan" + (benden ? " ben" : ""); u.textContent = emo;
      u.style.left = (r.left - 10 - (benden ? 0 : Math.random() * 90)) + "px"; u.style.top = (r.top + (benden ? 0 : Math.random() * 30 - 15)) + "px";
      u.style.animationDelay = (i * 0.12) + "s";
      if (!benden && i === 0) u.classList.add("ilk");
      document.body.appendChild(u); setTimeout(function () { if (u.parentNode) u.parentNode.removeChild(u); }, 2200 + i * 120);
    })(i);
  }
  var sonBalon = null;
  function balon(metin, benim) {
    if (sonBalon && sonBalon.parentNode) sonBalon.parentNode.removeChild(sonBalon);
    var b = sonBalon = document.createElement("div"); b.className = "shbalon" + (benim ? " ben" : ""); b.textContent = metin;
    var rr = sekme.getBoundingClientRect(); b.style.top = (rr.bottom + 46 > innerHeight ? rr.top - 52 : rr.bottom + 8) + "px";
    var sure = Math.min(9000, 2600 + metin.length * 90);
    b.addEventListener("click", function () { b.classList.add("git"); });
    document.body.appendChild(b); setTimeout(function () { b.classList.add("git"); }, sure); setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, sure + 500);
  }


  /* ---- gönder / dinle ---- */
  function gonder(emo, yazi) {
    if (!db || !me) return false; var simdi = Date.now(); if (simdi - sonGonder < 900) return false; sonGonder = simdi;
    sayac++; var k = Hesap.kim() || {};
    var v = { e: emo || "", o: sayfa, n: sayac, t: simdi, ad: k.ad || "" }; if (yazi) v.y = yazi;
    ac(false);
    if (yazi) balon("Sen: " + yazi, true); else ucur(emo, true);
    db.collection("sohbet").doc(me).set(v).catch(function () { balon("Gönderilemedi, bağlantıya bak."); });
    return true;
  }

  function geldi(d) {
    if (!d || !d.n || (!d.e && !d.y)) return;
    var yeni = d.n !== gorulen && Math.abs(Date.now() - (d.t || 0)) < 45000;
    gorulen = d.n; try { localStorage.setItem("sh_gorulen", String(d.n)); } catch (e) {}
    if (!yeni) return;
    var nereden = d.o && d.o !== sayfa && SAYFA[d.o] ? " · " + SAYFA[d.o] : "";
    if (d.y) balon((d.ad || "O") + ": " + String(d.y).slice(0, 60) + nereden);
    else { ucur(d.e, false); balon((d.ad || "O") + " " + d.e + nereden); }
    if (tepsi.hidden) nokta.hidden = false;
    try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) {}
  }
  function kur(k) {
    if (kurulu || !k || !k.uid) return; kurulu = true; me = k.uid;
    Hesap.db().then(function (d) {
      db = d;
      d.collection("sohbet").doc(me).get().then(function (s) { var v = s.exists ? s.data() : null; if (v && v.n > sayac) sayac = v.n; }).catch(function () {});
      d.collection("oyuncular").get().then(function (snap) {
        snap.forEach(function (doc) { if (doc.id !== me) other = doc.id; });
        if (!other) return;
        document.body.appendChild(kok); kok.hidden = false; yer(); [300, 1500, 4000].forEach(function (t) { setTimeout(bosYer, t); });
        /* kartlar açılıp kapanınca (başla, bitiş, yardım) yerleşim değişir: yeniden boş yer bul */
        try { new MutationObserver(function () { clearTimeout(bosYer.m); bosYer.m = setTimeout(bosYer, 250); }).observe(document.body, { attributes: true, attributeFilter: ["hidden"], subtree: true }); } catch (e) {}
        d.collection("sohbet").doc(other).onSnapshot(function (s) { geldi(s.exists ? s.data() : null); }, function () {});
      }).catch(function () {});
    }).catch(function () {});
  }
  function basla() { if (window.Hesap) Hesap.izle(function (k) { if (k && k.kesin) kur(k); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", basla); else basla();
  if (location.hash === "#test") window.__sh = { gonder: gonder, durum: function () { return { me: me, other: other, sayac: sayac, gorulen: gorulen, gorunur: !kok.hidden }; } };
})();
