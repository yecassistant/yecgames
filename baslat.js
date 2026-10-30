/* Başlat sayfası: oda aç / koda katıl / anahtarla geri dön. Hesap (hesap.js) ile konuşur, oda kurulunca kodu ve kurtarma anahtarını gösterir. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var geri = (location.search.match(/[?&]d=([a-z0-9_.-]+\.html)/i) || [])[1] || "oyunlar.html";
  var mod = (location.search.match(/[?&]m=(ac|katil|anahtar)/) || [])[1];
  $("kurGo").href = geri; $("katGo").href = geri;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function hata(id, t) { var e = $(id); e.textContent = t || ""; e.hidden = !t; }
  function goster(id) { ["secim", "fAc", "fKatil", "fAnahtar", "kuruldu", "katildin"].forEach(function (x) { $(x).hidden = x !== id; }); window.scrollTo(0, 0); }
  function kopyala(t, btn) {
    var p = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject();
    p.then(function () { var o = btn.textContent; btn.textContent = "Kopyalandı ✓"; setTimeout(function () { btn.textContent = o; }, 1600); }, function () { try { window.prompt("Kopyala:", t); } catch (e) {} });
  }
  function yapilandirmaVar() { var c = window.YEC_FIREBASE || {}; return !!(c.apiKey && c.apiKey.indexOf("BURAYA") < 0) || /[?&]deneme/.test(location.search); }

  /* zaten bir odası varsa doğrudan oyunlara */
  if (window.Hesap && Hesap.kim() && !mod && !/[?&]kal/.test(location.search)) { location.replace(geri); return; }
  if (/[?&]tasindi/.test(location.search)) { hata("secimNot", "Bu cihazın odayla bağı kalmadı: koltuk kurtarma anahtarıyla başka bir cihaza taşınmış ya da oda silinmiş olabilir. Anahtarın varsa odana geri dönebilirsin."); }
  if (/[?&]silindi/.test(location.search)) { hata("secimNot", "Oda silindi; bütün kayıtlar gitti. İstersen yeni bir oda açabilirsin."); }
  if (!yapilandirmaVar()) hata("secimNot", "Firebase ayarı yapılmamış: yapilandirma.js dosyasına proje bilgilerini yazmak gerekiyor.");

  [].forEach.call(document.querySelectorAll("[data-mod]"), function (b) { b.addEventListener("click", function () { var m = b.getAttribute("data-mod"); goster(m === "ac" ? "fAc" : m === "katil" ? "fKatil" : "fAnahtar"); var i = m === "ac" ? $("acAd") : m === "katil" ? $("kaAd") : $("anKey"); setTimeout(function () { try { i.focus(); } catch (e) {} }, 50); }); });
  [].forEach.call(document.querySelectorAll("[data-geri]"), function (b) { b.addEventListener("click", function () { goster("secim"); }); });
  if (mod) goster(mod === "ac" ? "fAc" : mod === "katil" ? "fKatil" : "fAnahtar");
  var kodAlan = $("kaKod");
  kodAlan.addEventListener("input", function () { var v = kodAlan.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8); kodAlan.value = v.length > 4 ? v.slice(0, 4) + "-" + v.slice(4) : v; });
  var ilkKod = (location.search.match(/[?&]kod=([A-Za-z0-9]{8})/) || [])[1]; if (ilkKod) { kodAlan.value = ilkKod.toUpperCase().slice(0, 4) + "-" + ilkKod.toUpperCase().slice(4); goster("fKatil"); }

  function mesaj(e) {
    var m = (e && e.message) || "";
    return { ad: "Takma adını yaz (en fazla 16 harf).", kod: "Kod 8 karakter olmalı.", yok: "Bu kod geçersiz: yanlış yazılmış, süresi dolmuş ya da oda çoktan dolmuş olabilir.", eski: "Bu kodun süresi dolmuş; arkadaşın Oda Ayarları'ndan yeni kod üretsin.", dolu: "Bu odaya katılınamadı: oda dolmuş ya da kodun süresi geçmiş olabilir. Arkadaşın Oda Ayarları'ndan yeni kod üretebilir.", kendin: "Bu senin kendi odan :)", bicim: "Anahtar biçimi: ODA-A-ANAHTAR (üç parça, tire ile).", yanlis: "Anahtar yanlış ya da bu oda artık yok." }[m] || "Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene." + ((e && (e.code || e.message)) ? " (" + String(e.code || e.message).slice(0, 60) + ")" : "");
  }
  function mesgul(btn, evet, yazi) { btn.disabled = evet; if (evet) { btn.dataset.o = btn.textContent; btn.textContent = yazi; } else if (btn.dataset.o) btn.textContent = btn.dataset.o; }

  $("fAc").onsubmit = function (e) {
    e.preventDefault(); hata("acErr", "");
    if (!$("acAd").value.trim()) { hata("acErr", "Takma adını yaz."); return; }
    if (!$("acOnay").checked) { hata("acErr", "Devam etmek için kutuyu işaretle."); return; }
    if (!window.Hesap) { hata("acErr", "Bağlantı kurulamadı."); return; }
    mesgul($("acGo"), true, "Oda kuruluyor…");
    Hesap.odaKur($("acAd").value).then(function (r) {
      $("kurKod").textContent = r.kod.slice(0, 4) + "-" + r.kod.slice(4); $("kurAnahtar").textContent = r.anahtar;
      var metin = "YEC Games'te sana bir oda açtım 🎮 Kod: " + r.kod + "\n" + location.origin + location.pathname.replace(/[^/]*$/, "") + "baslat.html?m=katil&kod=" + r.kod;
      $("kurWa").href = "https://wa.me/?text=" + encodeURIComponent(metin);
      $("kurKopya").onclick = function () { kopyala(r.kod, $("kurKopya")); }; $("kurAnKopya").onclick = function () { kopyala(r.anahtar, $("kurAnKopya")); };
      goster("kuruldu");
    }).catch(function (er) { hata("acErr", mesaj(er)); }).then(function () { mesgul($("acGo"), false); });
  };
  $("fKatil").onsubmit = function (e) {
    e.preventDefault(); hata("kaErr", "");
    if (!$("kaAd").value.trim()) { hata("kaErr", "Takma adını yaz."); return; }
    if (!$("kaOnay").checked) { hata("kaErr", "Devam etmek için kutuyu işaretle."); return; }
    if (!window.Hesap) { hata("kaErr", "Bağlantı kurulamadı."); return; }
    mesgul($("kaGo"), true, "Katılıyor…");
    Hesap.katil(kodAlan.value, $("kaAd").value).then(function (r) {
      var k = Hesap.kim() || {}; $("katAva").textContent = (k.ad || "?").charAt(0).toUpperCase(); $("katAva").className = "hsava b";
      $("katBaslik").textContent = "Hoş geldin, " + (k.ad || ""); $("katText").textContent = (Hesap.gorunenAd("a") || "Arkadaşın") + " ile aynı odadasınız. Oyunlar seni bekliyor.";
      $("katAnahtar").textContent = r.anahtar; $("katAnKopya").onclick = function () { kopyala(r.anahtar, $("katAnKopya")); };
      goster("katildin");
    }).catch(function (er) { hata("kaErr", mesaj(er)); }).then(function () { mesgul($("kaGo"), false); });
  };
  $("fAnahtar").onsubmit = function (e) {
    e.preventDefault(); hata("anErr", "");
    if (!window.Hesap) { hata("anErr", "Bağlantı kurulamadı."); return; }
    mesgul($("anGo"), true, "Bakılıyor…");
    Hesap.geriDon($("anKey").value).then(function () {
      var k = Hesap.kim() || {}; $("katAva").textContent = (k.ad || "?").charAt(0).toUpperCase(); $("katAva").className = "hsava " + (k.kul || "a");
      $("katBaslik").textContent = "Tekrar hoş geldin, " + (k.ad || ""); $("katText").textContent = "Koltuğuna oturdun; kayıtların ve oyunların yerinde.";
      $("katAnahtar").textContent = Hesap.oda().anahtar; $("katAnKopya").onclick = function () { kopyala(Hesap.oda().anahtar, $("katAnKopya")); };
      goster("katildin");
    }).catch(function (er) { hata("anErr", mesaj(er)); }).then(function () { mesgul($("anGo"), false); });
  };
})();
