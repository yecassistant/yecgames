/* Oda Ayarları: takma ad, davet kodu, açılış cümlesi, özel kelimeler, tema, kurtarma anahtarı, ayrılma / silme. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  if (!window.Hesap) return;
  var tema = "mor", kaydediliyor = false;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function hata(t) { var e = $("ayErr"); e.textContent = t || ""; e.hidden = !t; }
  function kopyala(t, btn) {
    var p = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject();
    p.then(function () { var o = btn.textContent; btn.textContent = "Kopyalandı ✓"; setTimeout(function () { btn.textContent = o; }, 1600); }, function () { try { window.prompt("Kopyala:", t); } catch (e) {} });
  }
  function kelimeler(str, max) {
    return String(str || "").split(/[\n,;]+/).map(function (w) { return w.replace(/\s+/g, " ").trim().slice(0, 24); }).filter(function (w, i, a) { return w && a.indexOf(w) === i; }).slice(0, max);
  }
  function kartlar(str) {   /* "KELİME: y1, y2" satırları → [kelime, [yasaklar]] */
    return String(str || "").split(/\n+/).map(function (s) { var p = s.split(":"), k = p[0].replace(/\s+/g, " ").trim().slice(0, 24), y = p.length > 1 ? p.slice(1).join(":").split(/[,;]+/).map(function (x) { return x.trim().slice(0, 20); }).filter(Boolean).slice(0, 5) : []; return k ? [k, y] : null; }).filter(Boolean).slice(0, 60);
  }
  function temaSec(t) { tema = t; [].forEach.call($("ayTema").children, function (b) { b.classList.toggle("on", b.getAttribute("data-tema") === t); }); document.body.setAttribute("data-tema", t === "mor" ? "" : t); }
  $("ayTema").addEventListener("click", function (e) { var b = e.target.closest ? e.target.closest("button[data-tema]") : null; if (b) temaSec(b.getAttribute("data-tema")); });

  var dolduruldu = false;
  function ciz() {
    var k = Hesap.kim(), o = Hesap.oda();
    if (!k) { $("ayYok").hidden = false; $("ayVar").hidden = true; $("aySub").textContent = ""; return; }
    $("ayYok").hidden = true; $("ayVar").hidden = false; $("aySub").textContent = k.kesin ? "canlı" : "bağlanıyor…";
    var a = Hesap.gorunenAd("a"), b = Hesap.gorunenAd("b"), dolu = !!(o && o.dolu);
    $("ayAvaA").textContent = (a || "?").charAt(0).toUpperCase(); $("ayAdA").textContent = a + (k.kul === "a" ? " (sen)" : "");
    $("ayAvaB").textContent = dolu ? (b || "?").charAt(0).toUpperCase() : "+"; $("ayAvaB").classList.toggle("bos", !dolu);
    $("ayAdB").textContent = dolu ? b + (k.kul === "b" ? " (sen)" : "") : "Henüz katılmadı"; $("ayBnot").textContent = dolu ? "B koltuğu" : "kodu gönderince oturur";
    if (!dolduruldu) $("ayAd").value = k.ad || "";
    $("ayDavet").hidden = dolu;
    if (!dolu && o && o.kod) {
      $("ayKod").textContent = o.kod.slice(0, 4) + "-" + o.kod.slice(4);
      var kalan = (o.kodSon || 0) - Date.now(); $("ayKodNot").textContent = kalan > 0 ? "Kod " + Math.max(1, Math.round(kalan / 3600000)) + " saat daha geçerli." : "Bu kodun süresi dolmuş; yeni kod üret.";
      var metin = "YEC Games'te sana bir oda açtım 🎮 Kod: " + o.kod + "\n" + location.origin + location.pathname.replace(/[^/]*$/, "") + "baslat.html?m=katil&kod=" + o.kod;
      $("ayKodWa").href = "https://wa.me/?text=" + encodeURIComponent(metin);
    }
    $("ayAnahtar").textContent = o ? o.anahtar : "—";
    var ay = (o && o.ayar) || {};
    if (!dolduruldu && o && o.veri) {
      dolduruldu = true;
      $("ayCumle").value = ay.cumle || "";
      $("ayCiz").value = ((ay.kelimeler && ay.kelimeler.ciz) || []).join(", ");
      $("ayYasak").value = ((ay.kelimeler && ay.kelimeler.yasak) || []).map(function (c) { return c instanceof Array ? c[0] + (c[1] && c[1].length ? ": " + c[1].join(", ") : "") : String(c); }).join("\n");
      temaSec(ay.tema || "mor");
    }
  }
  Hesap.izle(ciz); Hesap.odaIzle(ciz);

  $("ayAdKaydet").onclick = function () {
    var b = this; b.disabled = true;
    Hesap.adYaz($("ayAd").value).then(function () { b.textContent = "Kaydedildi ✓"; setTimeout(function () { b.textContent = "Kaydet"; }, 1500); }, function () { hata("Ad kaydedilemedi."); }).then(function () { b.disabled = false; });
  };
  $("ayKodKopya").onclick = function () { var o = Hesap.oda(); if (o && o.kod) kopyala(o.kod, this); };
  $("ayKodYeni").onclick = function () { var b = this; b.disabled = true; Hesap.yeniKod().then(function () { dolduruldu = dolduruldu; }, function () { hata("Kod üretilemedi."); }).then(function () { b.disabled = false; }); };
  $("ayAnKopya").onclick = function () { var o = Hesap.oda(); if (o) kopyala(o.anahtar, this); };
  $("ayKaydet").onclick = function () {
    if (kaydediliyor) return; hata(""); kaydediliyor = true; var b = this; b.disabled = true;
    var ayar = { cumle: $("ayCumle").value.replace(/\s+/g, " ").trim().slice(0, 40), tema: tema, kelimeler: { ciz: kelimeler($("ayCiz").value, 60), yasak: kartlar($("ayYasak").value) } };
    Hesap.ayarYaz(ayar).then(function () {
      try { if (ayar.cumle) localStorage.setItem("yg_cumle", ayar.cumle); else localStorage.removeItem("yg_cumle"); localStorage.setItem("yg_tema", ayar.tema); } catch (e) {}
      b.textContent = "Kaydedildi ✓"; setTimeout(function () { b.textContent = "Kaydet"; }, 1600);
    }, function () { hata("Kaydedilemedi; bağlantını kontrol et."); }).then(function () { kaydediliyor = false; b.disabled = false; });
  };
  $("ayAyril").onclick = function () { if (!confirm("Bu cihaz odadan çıkarılsın mı? Anahtarınla geri dönebilirsin.")) return; Hesap.ayril(); location.href = "baslat.html?kal=1"; };
  $("aySil").onclick = function () {
    if (!confirm("Oda ikiniz için de silinecek: bütün oyun kayıtları, mesajlar ve ayarlar gider. Emin misin?")) return;
    if (!confirm("Son kez: geri alınamaz. Silinsin mi?")) return;
    var b = this; b.disabled = true; b.textContent = "Siliniyor…";
    Hesap.odayiSil().then(function () { location.href = "baslat.html?kal=1"; }, function () { b.disabled = false; b.textContent = "Odayı tamamen sil"; hata("Silinemedi; bağlantını kontrol et."); });
  };
})();
