/* Tabu – yüz yüze (tek telefon, sesli). Online altyapı yok; her şey bu telefonda kalır, buluta bir şey yazılmaz.
   Akış: kurulum (adlar, süre, tur, pas) → "sıra X'te" (telefonu ver) → tur: kart + süre; Doğru (+1) / Tabu (−1) / Pas → tur özeti → … → oyun sonu.
   Puan anlatana yazılır; en çok puanı toplayan kazanır ("en iyi anlatan"). Kartlar: yasak-kart.js — görülen kartlar
   tabu_gordum'da sırayla tutulur, yeni oyunda önce hiç görülmemişler, sonra en eski görülenler gelir. Ses: yasak-ses.js (TuSes). */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, String(v)); } catch (e) {} return null; }
  function oku(k, d) { try { var v = JSON.parse(ls(k) || "null"); return v == null ? d : v; } catch (e) { return d; } }
  function snd(n) { if (window.TuSes) try { window.TuSes.play(n); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function buyukIlk(w) { return w ? w.charAt(0).toLocaleUpperCase("tr") + w.slice(1) : w; }
  function ekDe(ad) {                                                 /* "Ayşe" → "Ayşe'de", "Mert" → "Mert'te" */
    var s = String(ad || ""), k = s.toLocaleLowerCase("tr"), v = k.match(/[aeıioöuü](?=[^aeıioöuü]*$)/), son = k.slice(-1);
    return s + "'" + ("çfhkpsşt".indexOf(son) >= 0 ? "t" : "d") + (v && "eiöü".indexOf(v[0]) >= 0 ? "e" : "a");
  }
  function kar(a) { for (var j = a.length - 1; j > 0; j--) { var r = Math.floor(Math.random() * (j + 1)), t = a[j]; a[j] = a[r]; a[r] = t; } return a; }
  var KART = (window.YASAK_KART || []).slice();
  /* odaya özel kartlar (Oda Ayarları): [kelime, [yasaklar]] — yasak yazılmadıysa kelimenin kendisi yasak */
  try { var ozelK = window.Hesap && Hesap.oda() && Hesap.oda().ayar && Hesap.oda().ayar.kelimeler && Hesap.oda().ayar.kelimeler.yasak; (ozelK || []).forEach(function (c) { if (c instanceof Array && c[0]) KART.push([String(c[0]), (c[1] && c[1].length ? c[1] : [String(c[0])]).slice(0, 5), true]); }); } catch (e) {}
  var RM = false; try { RM = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var ayar = { sure: 60, tur: 3, pas: 3 }, adlar = ["Sen", "Arkadaşın"], puan = [0, 0], bilinen = [0, 0], ilkAnlatan = 0;
  var turNo = 0, deste = [], kartNo = -1, kayit = [], pasKalan = 3, bitis = 0, durdu = false, kalanMs = 0, tik = 0, sonTik = -1, sonIslem = 0, kilit = null;

  /* ---------- ekranlar ---------- */
  var EKR = ["kurulum", "sira", "oyun", "turSonu", "son"];
  function goster(id) { EKR.forEach(function (e) { $(e).hidden = e !== id; }); try { $(id).scrollTop = 0; } catch (e) {} }
  function ekran() { for (var i = 0; i < EKR.length; i++) if (!$(EKR[i]).hidden) return EKR[i]; return ""; }

  /* ---------- kurulum ---------- */
  (function () {
    var k = oku("tu_adlar", null);
    if (k && k.length === 2 && k[0] && k[1]) adlar = [String(k[0]), String(k[1])];
    else { var h = null; try { h = window.Hesap && Hesap.kim && Hesap.kim(); } catch (e) {} if (h) adlar = [h.ad || "Sen", Hesap.gorunenAd(h.kul === "a" ? "b" : "a") || "Arkadaşın"]; }
    $("ad1").value = adlar[0]; $("ad2").value = adlar[1];
    var a = oku("tu_ayar", null);
    if (a) { if ([45, 60, 90].indexOf(a.sure) >= 0) ayar.sure = a.sure; if ([2, 3, 4].indexOf(a.tur) >= 0) ayar.tur = a.tur; if ([1, 3, 5].indexOf(a.pas) >= 0) ayar.pas = a.pas; }
    [["segSure", "sure"], ["segTur", "tur"], ["segPas", "pas"]].forEach(function (x) {
      var bs = $(x[0]).querySelectorAll("button");
      function isle() { [].forEach.call(bs, function (c) { var on = +c.getAttribute("data-v") === ayar[x[1]]; c.classList.toggle("on", on); c.setAttribute("aria-pressed", on ? "true" : "false"); }); }
      [].forEach.call(bs, function (b) { b.onclick = function () { ayar[x[1]] = +b.getAttribute("data-v"); isle(); snd("cek"); }; });
      isle();
    });
  })();
  function temiz(s) { return String(s || "").replace(/\s+/g, " ").trim().slice(0, 14); }
  function karistir() {
    var g = oku("tabu_gordum", []), gor = {}, eski = [], taze = [];
    if (!(g instanceof Array)) g = [];
    g.forEach(function (n) { if (typeof n === "number" && n >= 0 && n < KART.length && !gor[n]) { gor[n] = 1; eski.push(n); } });
    for (var i = 0; i < KART.length; i++) if (!gor[i]) taze.push(i);
    deste = kar(taze).concat(eski);                                   /* önce hiç görülmemişler, sonra en eski görülenler */
  }
  function gordum(no) {
    var g = oku("tabu_gordum", []); if (!(g instanceof Array)) g = [];
    g = g.filter(function (n) { return n !== no && typeof n === "number"; }); g.push(no);
    var max = Math.max(0, KART.length - 20); if (g.length > max) g = g.slice(g.length - max);
    ls("tabu_gordum", JSON.stringify(g));
  }
  $("bBasla").onclick = function () {
    var a1 = temiz($("ad1").value) || "1. oyuncu", a2 = temiz($("ad2").value) || "2. oyuncu";
    if (a1.toLocaleLowerCase("tr") === a2.toLocaleLowerCase("tr")) a2 = (a2 + " 2").slice(0, 16);
    adlar = [a1, a2]; $("ad1").value = a1; $("ad2").value = a2;
    ls("tu_adlar", JSON.stringify(adlar)); ls("tu_ayar", JSON.stringify(ayar));
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {}
    snd("gonder"); yeniOyun(0);
  };
  function yeniOyun(ilk) { ilkAnlatan = ilk; puan = [0, 0]; bilinen = [0, 0]; turNo = 0; karistir(); siraGoster(); }

  /* ---------- sıra: telefonu ver ---------- */
  function anlatan() { return (ilkAnlatan + turNo) % 2; }
  function toplamTur() { return ayar.tur * 2; }
  function siraGoster() {
    var a = anlatan(), b = 1 - a;
    $("siraAd").textContent = adlar[a];
    $("siraTxt").textContent = "anlatıyor · tur " + (turNo + 1) + "/" + toplamTur();
    $("siraNot").innerHTML = "Telefonu <b>" + esc(adlar[a]) + "</b> alsın, <b>" + esc(adlar[b]) + "</b> ekrana bakmasın 🙈<br>" + ayar.sure + " saniye · " + ayar.pas + " pas hakkı";
    $("skorTablo").innerHTML = adlar.map(function (ad, i) { return '<div class="' + (i === a ? "on" : "") + '"><small>' + esc(ad) + "</small><b>" + puan[i] + "</b></div>"; }).join("");
    $("sub").textContent = "tur " + (turNo + 1) + "/" + toplamTur();
    goster("sira");
  }
  $("bHazir").onclick = function () { turBasla(); };

  /* ---------- tur ---------- */
  function turBasla() {
    kayit = []; pasKalan = ayar.pas; durdu = false; sonTik = -1; sonIslem = 0;
    bitis = Date.now() + ayar.sure * 1000;
    $("anlatanAd").textContent = adlar[anlatan()] + " anlatıyor";
    $("oyun").classList.remove("durdu");
    turPuanYaz(); goster("oyun"); yeniKart(); snd("ac");
    clearInterval(tik); tik = setInterval(sureTik, 100); sureTik();
    uyanik(true);
  }
  function yeniKart() {
    if (!deste.length) karistir();
    kartNo = deste.shift(); gordum(kartNo);
    var k = KART[kartNo] || ["—", []];
    $("kKelime").textContent = k[0];
    $("kYasak").innerHTML = k[1].map(function (w) { return "<li>" + esc(buyukIlk(w)) + "</li>"; }).join("");
    var c = $("kart"); c.classList.remove("yeni"); void c.offsetWidth; c.classList.add("yeni");
    $("pasKalan").textContent = pasKalan ? pasKalan + " hak" : "bitti"; $("bPas").disabled = pasKalan <= 0;
  }
  function turPuani() { var p = 0; kayit.forEach(function (x) { p += x.s === "dogru" ? 1 : x.s === "yasak" ? -1 : 0; }); return p; }
  function turPuanYaz() { var p = turPuani(); $("turPuan").textContent = (p > 0 ? "+" : "") + p; }
  function islem(s) {
    if ($("oyun").hidden || durdu || bitis - Date.now() <= 0) return;
    var now = Date.now(); if (now - sonIslem < 150) return;           /* iki düğmeye birden dokunulursa tek sayılsın (aynı düğmeye çift dokunuşu app.js zaten engelliyor) */
    if (s === "pas" && pasKalan <= 0) return;
    sonIslem = now;
    var k = KART[kartNo]; kayit.push({ k: k ? k[0] : "", s: s }); if (s === "pas") pasKalan--;
    snd(s === "dogru" ? "dogru" : s === "yasak" ? "yanlis" : "pas");
    ucur(s); turPuanYaz(); yeniKart();
    try { if (navigator.vibrate) navigator.vibrate(s === "yasak" ? [30, 40, 30] : 15); } catch (e) {}
  }
  function ucur(s) {                                                  /* eski kart sağa (doğru) / sola (tabu) / yukarı (pas) uçar, +1/−1 yükselir */
    var sah = $("oyun"), c = $("kart");
    var chip = document.createElement("div"); chip.className = "tuuc " + s; chip.textContent = s === "dogru" ? "+1" : s === "yasak" ? "−1" : "pas";
    chip.style.top = Math.round(c.offsetTop + c.offsetHeight * 0.32) + "px";
    sah.appendChild(chip); setTimeout(function () { if (chip.parentNode) chip.parentNode.removeChild(chip); }, 800);
    if (RM) return;
    var kl = c.cloneNode(true); kl.removeAttribute("id"); [].forEach.call(kl.querySelectorAll("[id]"), function (e) { e.removeAttribute("id"); });
    kl.className = "tukart ucan " + (s === "dogru" ? "sag" : s === "yasak" ? "sol" : "yukari");
    kl.style.left = c.offsetLeft + "px"; kl.style.top = c.offsetTop + "px"; kl.style.width = c.offsetWidth + "px"; kl.style.height = c.offsetHeight + "px";
    sah.appendChild(kl); setTimeout(function () { if (kl.parentNode) kl.parentNode.removeChild(kl); }, 460);
  }
  $("bDogru").onclick = function () { islem("dogru"); };
  $("bTabu").onclick = function () { islem("yasak"); };
  $("bPas").onclick = function () { islem("pas"); };
  document.addEventListener("keydown", function (e) {                 /* bilgisayarda: → doğru, ← tabu, ↑ pas */
    if ($("oyun").hidden || /INPUT|TEXTAREA/.test((e.target && e.target.tagName) || "")) return;
    var s = e.key === "ArrowRight" ? "dogru" : e.key === "ArrowLeft" ? "yasak" : e.key === "ArrowUp" ? "pas" : "";
    if (s) { e.preventDefault(); islem(s); }
  });
  function sureTik() {
    if (durdu || $("oyun").hidden) return;
    var ms = Math.max(0, bitis - Date.now()), sn = Math.ceil(ms / 1000);
    $("sureBar").style.transform = "scaleX(" + (ms / (ayar.sure * 1000)).toFixed(4) + ")";
    $("sureTxt").textContent = sn + " sn";
    $("sure").classList.toggle("az", sn <= 10);
    if (sn <= 5 && sn > 0 && sn !== sonTik) { sonTik = sn; snd("tik"); }
    if (ms <= 0) turBitti();
  }
  function turBitti() {
    clearInterval(tik); tik = 0; uyanik(false);
    var a = anlatan(), b = 1 - a, p = turPuani(), d = 0, t = 0, ps = 0;
    kayit.forEach(function (x) { if (x.s === "dogru") d++; else if (x.s === "yasak") t++; else ps++; });
    puan[a] += p; bilinen[a] += d;
    $("tsBaslik").textContent = "Süre doldu!";
    $("tsPuan").textContent = (p > 0 ? "+" : "") + p; $("tsPuan").className = "tubig" + (p < 0 ? " eksi" : "");
    $("tsOzet").innerHTML = "<b>" + esc(adlar[a]) + "</b> anlattı, <b>" + esc(adlar[b]) + "</b> " + (d ? d + " kart bildi" : "hiç kart bilemedi") + (t || ps ? "<br>" + [t ? t + " tabu" : "", ps ? ps + " pas" : ""].filter(Boolean).join(" · ") : "");
    $("tsListe").innerHTML = kayit.length ? kayit.map(function (x) { return '<li class="' + x.s + '"><i>' + (x.s === "dogru" ? "✓" : x.s === "yasak" ? "✗" : "↷") + "</i>" + esc(x.k) + "</li>"; }).join("") : '<li class="bos">Bu turda kart geçmedi</li>';
    $("bDevam").textContent = turNo + 1 >= toplamTur() ? "Sonucu gör" : "Sıra " + ekDe(adlar[b]) + " →";
    snd("sure"); goster("turSonu");
  }
  $("bDevam").onclick = function () { turNo++; if (turNo >= toplamTur()) sonGoster(); else { snd("cek"); siraGoster(); } };

  /* ---------- oyun sonu ---------- */
  function sonGoster() {
    var k = puan[0] === puan[1] ? -1 : puan[0] > puan[1] ? 0 : 1;
    $("sonBaslik").textContent = k < 0 ? "Berabere! 🤝" : adlar[k] + " kazandı! 🏆";
    $("sonSkor").innerHTML = adlar.map(function (ad, i) { return '<div class="' + (i === k ? "on" : "") + '"><small>' + esc(ad) + "</small><b>" + puan[i] + "</b><em>" + bilinen[i] + " kart anlattı</em></div>"; }).join("");
    $("sonNot").textContent = k < 0 ? "Tam başa baş geçti." : "En iyi anlatan: " + adlar[k] + " 🗣️";
    $("sub").textContent = "oyun bitti";
    ls("tu_oyun", (+ls("tu_oyun") || 0) + 1);
    snd(k < 0 ? "draw" : "win"); goster("son");
    if (k >= 0) try { if (window.__burst) window.__burst(70); } catch (e) {}
  }
  $("bTekrar").onclick = function () { snd("gonder"); yeniOyun(1 - ilkAnlatan); };   /* yeni oyunda öbürü başlar */
  $("bAyar").onclick = function () { $("sub").textContent = "yüz yüze · sesli"; goster("kurulum"); };

  /* ---------- yardım, çıkış onayı, duraklatma, ekran açık kalsın ---------- */
  $("bHelp").onclick = function () { duraklat(true); $("help").hidden = false; };
  $("helpGo").onclick = function () { $("help").hidden = true; ls("tabu_help", "1"); duraklat(false); };
  if (ls("tabu_help") !== "1") $("help").hidden = false;
  var geri = document.querySelector(".hdbar a.gkbtn");
  if (geri) geri.addEventListener("click", function (e) { var ek = ekran(); if (ek === "sira" || ek === "oyun" || ek === "turSonu") { e.preventDefault(); duraklat(true); $("cikis").hidden = false; } });
  $("cikisHayir").onclick = function () { $("cikis").hidden = true; duraklat(false); };
  $("cikisEvet").onclick = function () { clearInterval(tik); uyanik(false); location.href = "oyunlar.html"; };
  function duraklat(evet) {
    if ($("oyun").hidden) return;
    if (evet) { if (durdu) return; durdu = true; kalanMs = Math.max(0, bitis - Date.now()); clearInterval(tik); tik = 0; $("oyun").classList.add("durdu"); return; }
    if (!durdu || !$("help").hidden || !$("cikis").hidden || document.hidden) return;
    durdu = false; bitis = Date.now() + kalanMs; $("oyun").classList.remove("durdu");
    clearInterval(tik); tik = setInterval(sureTik, 100); sureTik(); uyanik(true);
  }
  document.addEventListener("visibilitychange", function () { duraklat(document.hidden); });
  function uyanik(ac) {
    try {
      if (ac) {
        if (!kilit && navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request("screen").then(function (k) {
          kilit = k; try { k.addEventListener("release", function () { if (kilit === k) kilit = null; }); } catch (e) {}
          if ($("oyun").hidden) { k.release().catch(function () {}); kilit = null; }
        }).catch(function () {});
      } else if (kilit) { var k = kilit; kilit = null; k.release().catch(function () {}); }
    } catch (e) {}
  }

  goster("kurulum");
  if (location.hash === "#test") window.__tu = {
    durum: function () { return { ekran: ekran(), puan: puan.slice(), bilinen: bilinen.slice(), turNo: turNo, toplam: toplamTur(), anlatan: anlatan(), adlar: adlar.slice(), kart: KART[kartNo] ? KART[kartNo][0] : null, pasKalan: pasKalan, kayit: kayit.slice(), durdu: durdu, deste: deste.length, ayar: ayar }; },
    bitir: function () { bitis = Date.now() - 1; kalanMs = 0; if (!durdu) sureTik(); },
    ekDe: ekDe
  };
})();
