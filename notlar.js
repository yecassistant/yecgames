/* Notlar – odadaki iki kişinin birbirine bıraktığı küçük notlar. Sadece oyunlar menüsünde çıkar.
   notlar/{id} = { kimden, kime, metin (en çok 240), tema: gece | cicek | kahve | kutlama,
                   t: yazıldığı an, acilis: 0 (hemen) ya da ms (o saatten önce görünmez), okundu: null | an }
   Gelen not, açılış saati gelince menüde kartla çıkar; "Tamam" deyince okundu yazılır, gönderen geçmişte görür.
   Okunmamış notu gönderen geri alabilir (silinir). */
(function () {
  "use strict";
  var kart = document.getElementById("toNotlar");
  if (!kart || !window.Hesap) return;

  var MAX = 240, AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  var TEMA = {
    gece: { ad: "Gece", emo: "🌙" }, gunes: { ad: "Günaydın", emo: "☀️" }, cicek: { ad: "Çiçek", emo: "🌸" }, kahve: { ad: "Kahve", emo: "☕" },
    tatli: { ad: "Tatlı", emo: "🧁" }, kutlama: { ad: "Kutlama", emo: "🎉" }, kalp: { ad: "Kalp", emo: "💗" }, deniz: { ad: "Deniz", emo: "🐬" },
    yagmur: { ad: "Yağmur", emo: "🌧️" }, sonbahar: { ad: "Sonbahar", emo: "🍂" }, kar: { ad: "Kar", emo: "❄️" }, sinema: { ad: "Sinema", emo: "🍿" },
    kedi: { ad: "Kedi", emo: "🐱" }, uykucu: { ad: "Uykucu", emo: "😺" }, sifa: { ad: "Şifa", emo: "🍵" }
  };
  var SIRA = ["gece", "gunes", "cicek", "kahve", "tatli", "kutlama", "kalp", "deniz", "yagmur", "sonbahar", "kar", "sinema", "kedi", "uykucu", "sifa"];
  var db = null, ben = null, benKul = "", oteki = null, otekiAd = "", notlar = [], gosterilen = {}, kartAcik = false, basladi = false;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ms(t) { if (!t) return 0; if (typeof t === "number") return t; if (typeof t.toMillis === "function") return t.toMillis(); return 0; }
  function iki(n) { return (n < 10 ? "0" : "") + n; }
  function saat(d) { return iki(d.getHours()) + ":" + iki(d.getMinutes()); }
  function gunFark(t) { var a = new Date(t), b = new Date(); a.setHours(0, 0, 0, 0); b.setHours(0, 0, 0, 0); return Math.round((a - b) / 86400000); }
  function zaman(t) { if (!t) return ""; var d = new Date(t), f = gunFark(t); return (f === 0 ? "bugün" : f === -1 ? "dün" : f === 1 ? "yarın" : d.getDate() + " " + AYLAR[d.getMonth()]) + " " + saat(d); }
  function yaziZamani(n) { return ms(n.t) || n.acilis || Date.now(); }
  function acikMi(n) { return !n.acilis || n.acilis <= Date.now(); }
  function yonelme(ad) {                                            /* Ayşe'ye, Mert'e */
    var s = ad.toLocaleLowerCase("tr"), v = s.match(/[aeıioöuü]/g), son = v ? v[v.length - 1] : "a";
    return ad + "'" + (/[aeıioöuü]$/.test(s) ? "y" : "") + ("eiöü".indexOf(son) >= 0 ? "e" : "a");
  }
  function tost(t) {
    var el = $("nkTost"); if (!el) { el = document.createElement("div"); el.id = "nkTost"; el.className = "nktost"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = t; el.classList.add("on"); clearTimeout(tost.z); tost.z = setTimeout(function () { el.classList.remove("on"); }, 3200);
  }

  /* ---------- kart çizimleri ---------- */
  var AY_SVG = '<svg viewBox="0 0 88 88"><defs><radialGradient id="nkAyR" cx="38%" cy="40%" r="70%"><stop offset="0" stop-color="#fff6cf"/><stop offset="1" stop-color="#ffcf5e"/></radialGradient></defs>' +
    '<path d="M58 9A36 36 0 1 0 80 58A29 29 0 0 1 58 9Z" fill="url(#nkAyR)"/>' +
    '<path d="M23 47q5 5 10 0M40 51q4 4 8 0" stroke="#8a5a22" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="24" cy="57" r="4.5" fill="#ff9fbd" opacity=".75"/><circle cx="44" cy="61" r="4" fill="#ff9fbd" opacity=".75"/>' +
    '<path d="M31 61q3 3 6 0" stroke="#8a5a22" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
  function petal(cx, cy, rx, ry, n, renk, bas) { var s = ""; for (var i = 0; i < n; i++) s += '<ellipse cx="' + cx + '" cy="' + (cy - ry * 0.7) + '" rx="' + rx + '" ry="' + ry + '" fill="' + renk + '" transform="rotate(' + (bas + i * 360 / n) + ' ' + cx + ' ' + cy + ')"/>'; return s; }
  var CICEK_SVG = '<svg class="nkcizim nksalla" viewBox="0 0 160 92">' +
    '<path d="M80 92C72 74 60 66 44 64c6 13 19 23 36 28zM80 92c8-18 20-26 36-28-6 13-19 23-36 28z" fill="#86c296"/>' +
    '<path d="M32 92V40M128 92V44" stroke="#7aa877" stroke-width="2.4" stroke-linecap="round"/>' +
    [40, 47, 54, 61, 68].map(function (y, i) { return '<ellipse cx="' + (i % 2 ? 35 : 29) + '" cy="' + y + '" rx="3.6" ry="5.4" fill="' + (i < 2 ? "#b79cf2" : "#9b7fe0") + '"/>'; }).join("") +
    petal(128, 50, 6.5, 10, 5, "#ffd7a8", 0) + '<circle cx="128" cy="50" r="4.5" fill="#f2a03d"/>' +
    petal(80, 46, 14, 17, 6, "#fbbcd2", 0) + '<circle cx="80" cy="46" r="17" fill="#f59bbd"/><circle cx="80" cy="46" r="11.5" fill="#ec6f9a"/><circle cx="80" cy="46" r="5.5" fill="#d94f86"/></svg>';
  var KAHVE_SVG = '<svg class="nkcizim" viewBox="0 0 160 92">' +
    '<g class="nkbuhar" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="3" stroke-linecap="round"><path class="b1" d="M68 30c-5-5 5-9 0-14s5-9 0-13"/><path class="b2" d="M80 28c-5-5 5-9 0-14s5-9 0-13"/><path class="b3" d="M92 30c-5-5 5-9 0-14s5-9 0-13"/></g>' +
    '<ellipse cx="80" cy="85" rx="44" ry="6.5" fill="#f1dfcc"/>' +
    '<path d="M109 47c13 0 14 19 0 20" fill="none" stroke="#fffaf3" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M50 38h60l-6 38a8 8 0 0 1-8 7H64a8 8 0 0 1-8-7z" fill="#fffaf3"/>' +
    '<ellipse cx="80" cy="38" rx="30" ry="5" fill="#5a3218"/>' +
    '<path d="M80 69c-6-4-9-7-9-10a4.3 4.3 0 0 1 9-2 4.3 4.3 0 0 1 9 2c0 3-3 6-9 10z" fill="#ff8fb3"/></svg>';
  var KUTLAMA_SVG = '<svg class="nkcizim" viewBox="0 0 160 92">' +
    '<g class="nkparla"><path d="M80 10l9.5 19.5 21.5 3-15.5 15 3.7 21.3L80 58.8 60.8 68.8l3.7-21.3L49 32.5l21.5-3z" fill="#ffd36b" stroke="#fff3c4" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="74" cy="40" r="2.6" fill="#7a4b10"/><circle cx="86" cy="40" r="2.6" fill="#7a4b10"/><path d="M75 47q5 5 10 0" stroke="#7a4b10" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>' +
    '<g fill="#fff"><path d="M30 26l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M128 20l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z"/><path d="M122 62l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z"/><path d="M38 66l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z"/></g></svg>';
  function yuz(x1, x2, y, renk, acik) {                                /* göz + gülümseme + yanak */
    var g = acik ? '<circle cx="' + x1 + '" cy="' + y + '" r="2.6" fill="' + renk + '"/><circle cx="' + x2 + '" cy="' + y + '" r="2.6" fill="' + renk + '"/>'
      : '<path d="M' + (x1 - 4) + " " + y + "q4 4 8 0M" + (x2 - 4) + " " + y + 'q4 4 8 0" stroke="' + renk + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    var o = (x1 + x2) / 2;
    return g + '<path d="M' + (o - 4) + " " + (y + 7) + 'q4 4 8 0" stroke="' + renk + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '<circle cx="' + (x1 - 5) + '" cy="' + (y + 7) + '" r="3.6" fill="#ff8fb0" opacity=".6"/><circle cx="' + (x2 + 5) + '" cy="' + (y + 7) + '" r="3.6" fill="#ff8fb0" opacity=".6"/>';
  }
  var GUNES_SVG = (function () {
    var r = "";
    for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6, c = Math.cos(a), si = Math.sin(a); r += '<path d="M' + (80 + 29 * c).toFixed(1) + " " + (46 + 29 * si).toFixed(1) + "L" + (80 + 38 * c).toFixed(1) + " " + (46 + 38 * si).toFixed(1) + '"/>'; }
    var bulut = function (x, y, k) { return '<g transform="translate(' + x + " " + y + ") scale(" + k + ')" fill="#fff"><circle cx="0" cy="0" r="7"/><circle cx="9" cy="-4" r="9"/><circle cx="19" cy="0" r="7"/><rect x="0" y="-3" width="19" height="10" rx="5"/></g>'; };
    return '<svg class="nkcizim" viewBox="0 0 160 92"><g class="nkdon" stroke="#ffb02e" stroke-width="4.5" stroke-linecap="round">' + r + '</g><circle cx="80" cy="46" r="23" fill="#ffd23f"/>' + yuz(72, 88, 43, "#7a4b10", true) + bulut(16, 70, 1.1) + bulut(122, 22, .9) + "</svg>";
  })();
  var YAGMUR_SVG = '<svg class="nkcizim nksalla" viewBox="0 0 160 92"><g fill="#f3f7fd"><circle cx="60" cy="48" r="16"/><circle cx="82" cy="36" r="22"/><circle cx="104" cy="49" r="15"/><rect x="48" y="46" width="70" height="20" rx="10"/></g>' + yuz(73, 91, 50, "#4a5f86", false) +
    '<g class="nkdamla" fill="#bfe3ff"><path d="M62 72c3 4 3 7 0 8s-3-4 0-8z"/><path d="M82 76c3 4 3 7 0 8s-3-4 0-8z" class="d2"/><path d="M102 72c3 4 3 7 0 8s-3-4 0-8z" class="d3"/></g></svg>';
  var SONBAHAR_SVG = '<svg class="nkcizim nksalla" viewBox="0 0 160 92"><g transform="rotate(-28 46 52)"><ellipse cx="46" cy="52" rx="12" ry="21" fill="#e8742c"/><path d="M46 33v38" stroke="#b5501a" stroke-width="2"/></g>' +
    '<g transform="rotate(32 116 54)"><ellipse cx="116" cy="54" rx="11" ry="19" fill="#f2b134"/><path d="M116 37v34" stroke="#c98a1a" stroke-width="2"/></g>' +
    '<ellipse cx="80" cy="60" rx="17" ry="20" fill="#d9a066"/><path d="M61 46a19 13 0 0 1 38 0z" fill="#8a5a2b"/><path d="M61 46h38" stroke="#6b4220" stroke-width="2"/><path d="M80 33v-7" stroke="#6b4220" stroke-width="3.4" stroke-linecap="round"/>' + yuz(73, 87, 58, "#5a3414", true) + "</svg>";
  var KAR_SVG = '<svg class="nkcizim nksalla" viewBox="0 0 160 92"><path d="M60 62l-14-8M100 62l14-8" stroke="#8a5a2b" stroke-width="2.6" stroke-linecap="round"/><circle cx="80" cy="70" r="20" fill="#fff"/><circle cx="80" cy="38" r="15" fill="#fff"/>' +
    '<path d="M65 32a15 13 0 0 1 30 0z" fill="#b79cf2"/><rect x="63" y="29" width="34" height="5" rx="2.5" fill="#9b7fe0"/><circle cx="80" cy="18" r="4" fill="#fff"/>' +
    '<circle cx="75" cy="37" r="2.2" fill="#2b3a55"/><circle cx="85" cy="37" r="2.2" fill="#2b3a55"/><path d="M80 41l10 2.5-10 2.5z" fill="#ff8a3d"/><path d="M75 47q5 3 10 0" stroke="#2b3a55" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<rect x="65" y="51" width="30" height="6" rx="3" fill="#ff8fb3"/><rect x="86" y="54" width="6" height="15" rx="3" fill="#ec6f9a"/><circle cx="80" cy="66" r="2.2" fill="#2b3a55"/><circle cx="80" cy="75" r="2.2" fill="#2b3a55"/></svg>';
  var DENIZ_SVG = (function () {
    var dalga = function (y, h) { var d = "M0 " + y; for (var x = 0; x < 320; x += 20) d += " q10 " + (-h) + " 20 0"; return d + " L320 92 L0 92Z"; };
    return '<svg class="nkcizim" viewBox="0 0 160 92"><circle cx="30" cy="22" r="10" fill="#ffd23f"/><g class="nkyuz">' +
      '<path d="M86 33q4-15 15-3z" fill="#3f8fd0"/>' +
      '<path d="M34 66C46 40 70 29 96 30c14 .5 22 6 26 12l10 3c2 1 2 3 0 4l-12 2c-6 4-16 6-26 6-18 0-34 6-46 16-4 3-10 2-14-7z" fill="#58aee8"/>' +
      '<path d="M120 51c-8 5-20 7-30 7-17 0-32 6-44 15 10-4 22-5 32-8 16-4 30-5 42-14z" fill="#d4f0ff"/>' +
      '<path d="M40 69C34 64 26 60 17 60c6 5 8 9 8 11-2 3-5 7-9 13 10-2 18-6 24-11z" fill="#3f8fd0"/><path d="M86 56c0 7-4 12-12 14 3-5 4-9 3-13z" fill="#3f8fd0"/>' +
      '<circle cx="107" cy="41" r="2.8" fill="#163a5e"/><circle cx="108" cy="40" r=".9" fill="#fff"/><path d="M114 49q5 2 9-1" stroke="#163a5e" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="102" cy="48" r="3" fill="#ffb3cc" opacity=".7"/></g>' +
      '<defs><linearGradient id="nkDalgaG"><stop offset="0" stop-color="#000"/><stop offset=".18" stop-color="#fff"/><stop offset=".82" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>' +
      '<mask id="nkDalgaM" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="92"><rect width="160" height="92" fill="url(#nkDalgaG)"/></mask></defs>' +
      '<g mask="url(#nkDalgaM)"><g class="nkdalga"><path d="' + dalga(80, 5) + '" fill="#e6f7ff" opacity=".75"/></g><g class="nkdalga d2"><path d="' + dalga(85, 4) + '" fill="#fff"/></g></g></svg>';
  })();
  var TATLI_SVG = '<svg class="nkcizim nksalla" viewBox="0 0 160 92"><path d="M59 56h42l-6 32H65z" fill="#f48fb3"/><path d="M68 56l2 32M80 56v32M92 56l-2 32" stroke="#ec6f9a" stroke-width="3"/>' +
    '<path d="M56 58c-7 0-8-11 1-13-2-9 9-15 15-9 3-9 17-9 19 0 7-5 17 1 15 9 9 2 8 13 1 13z" fill="#fff4f8"/>' +
    '<circle cx="69" cy="47" r="4.2" fill="#5866d6"/><circle cx="90" cy="45" r="4.2" fill="#5866d6"/><circle cx="80" cy="52" r="4" fill="#4a57c4"/><circle cx="68" cy="46" r="1.2" fill="#fff"/><circle cx="89" cy="44" r="1.2" fill="#fff"/>' +
    '<circle cx="80" cy="29" r="6" fill="#e8455b"/><path d="M80 23q3-8 10-10" stroke="#5a8a3a" stroke-width="2" fill="none" stroke-linecap="round"/>' + yuz(73, 87, 70, "#7a2a4c", true) + "</svg>";
  var SINEMA_SVG = '<svg class="nkcizim" viewBox="0 0 160 92"><g class="nksek"><circle cx="112" cy="22" r="5" fill="#fff7d6"/><circle cx="115" cy="20" r="3" fill="#ffe08a"/></g>' +
    '<g fill="#fff7d6"><circle cx="62" cy="42" r="8"/><circle cx="73" cy="35" r="9"/><circle cx="86" cy="33" r="9"/><circle cx="97" cy="39" r="8"/><circle cx="79" cy="44" r="8"/><circle cx="92" cy="46" r="7"/><circle cx="66" cy="47" r="6"/></g>' +
    '<g fill="#ffe08a"><circle cx="70" cy="38" r="3"/><circle cx="90" cy="36" r="3"/><circle cx="82" cy="45" r="2.6"/></g>' +
    '<path d="M57 48h46l-6 40H63z" fill="#fff"/><path d="M66 48h8l-1 40h-7zM86 48h8l-1.6 40h-7z" fill="#e8455b"/>' + yuz(73, 87, 64, "#5a1020", true) + "</svg>";
  var KEDI_SVG = '<svg class="nkcizim" viewBox="0 0 160 92"><path d="M51 48l3-30 22 18zM109 48l-3-30-22 18z" fill="#f2a65a"/><path d="M56 42l2-17 12 11zM104 42l-2-17-12 11z" fill="#ffb3c7"/>' +
    '<ellipse cx="80" cy="60" rx="33" ry="27" fill="#f2a65a"/><path d="M72 36l2 9M80 34v10M88 36l-2 9" stroke="#d9853a" stroke-width="3" stroke-linecap="round"/>' +
    '<g class="nkgoz"><ellipse cx="68" cy="57" rx="4" ry="5" fill="#3a2410"/><ellipse cx="92" cy="57" rx="4" ry="5" fill="#3a2410"/><circle cx="69.3" cy="55.3" r="1.3" fill="#fff"/><circle cx="93.3" cy="55.3" r="1.3" fill="#fff"/></g>' +
    '<path d="M77 64h6l-3 3.4z" fill="#ff8fb3"/><path d="M80 67q-4 5-8 1M80 67q4 5 8 1" stroke="#3a2410" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path d="M60 66l-14-2M60 70l-13 3M100 66l14-2M100 70l13 3" stroke="#7a4a20" stroke-width="1.6" stroke-linecap="round" opacity=".7"/><circle cx="62" cy="68" r="4" fill="#ff8fb0" opacity=".5"/><circle cx="98" cy="68" r="4" fill="#ff8fb0" opacity=".5"/></svg>';
  var SIFA_SVG = '<svg class="nkcizim" viewBox="0 0 160 92"><g class="nkbuhar" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="3" stroke-linecap="round"><path class="b1" d="M70 30c-5-5 5-9 0-14s5-9 0-13"/><path class="b2" d="M84 28c-5-5 5-9 0-14s5-9 0-13"/></g>' +
    '<path d="M102 48c13 0 13 19 0 19" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M55 38h48v32a15 15 0 0 1-15 15H70a15 15 0 0 1-15-15z" fill="#fff"/>' +
    '<ellipse cx="79" cy="38" rx="24" ry="4.6" fill="#e0a43a"/><circle cx="101" cy="36" r="9" fill="#ffe36b" stroke="#f2c230" stroke-width="2"/><path d="M101 28v16M93 36h16M95.5 30.5l11 11M106.5 30.5l-11 11" stroke="#f2c230" stroke-width="1.2"/>' +
    yuz(71, 87, 55, "#2f6a4b", false) + '<g transform="rotate(-18 92 72)"><rect x="82" y="68" width="22" height="9" rx="4.5" fill="#ffd2b0"/><rect x="89.5" y="68" width="7" height="9" fill="#f2b38a"/></g></svg>';
  var KALP_SVG = '<svg class="nkcizim" viewBox="0 0 160 92"><g class="nkatar"><path d="M80 84C52 66 40 52 40 37a18 18 0 0 1 40-7 18 18 0 0 1 40 7c0 15-12 29-40 47z" fill="#ff4f86"/>' +
    '<ellipse cx="58" cy="34" rx="6" ry="4" fill="#fff" opacity=".45" transform="rotate(-30 58 34)"/>' + yuz(71, 89, 48, "#7a1033", false) + "</g></svg>";
  var UYKUCU_SVG = '<svg class="nkcizim" viewBox="0 0 160 92"><ellipse cx="80" cy="84" rx="50" ry="6" fill="#000" opacity=".12"/>' +
    '<path d="M44 70c0-20 18-34 40-34s38 12 38 30c0 10-8 16-20 16H58c-8 0-14-5-14-12z" fill="#c9cfdb"/>' +
    '<path d="M114 74c10 2 14-6 8-12" stroke="#c9cfdb" stroke-width="9" fill="none" stroke-linecap="round"/>' +
    '<g class="nknefes"><path d="M50 52l2-15 12 9zM74 46l6-13 6 13z" fill="#c9cfdb"/><path d="M53 49l1-8 6 5zM76 44l4-7 3 7z" fill="#ffb3c7"/>' +
    '<ellipse cx="66" cy="60" rx="20" ry="16" fill="#d7dce6"/>' +
    '<path d="M55 59q4 3 8 0M69 59q4 3 8 0" stroke="#4a5068" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M64 64h4l-2 2.4z" fill="#ff8fb3"/>' +
    '<circle cx="55" cy="66" r="3.4" fill="#ff8fb0" opacity=".55"/><circle cx="77" cy="66" r="3.4" fill="#ff8fb0" opacity=".55"/></g>' +
    '<path d="M96 52q6-4 10 0M100 60q6-4 10 0" stroke="#aab1c2" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>' +
    '<span class="nkz" style="left:56%;top:12px">z</span><span class="nkz z2" style="left:56%;top:12px">z</span><span class="nkz z3" style="left:56%;top:12px">Z</span>';
  var SAHNE = { uykucu: UYKUCU_SVG, cicek: CICEK_SVG, kahve: KAHVE_SVG, kutlama: KUTLAMA_SVG, gunes: GUNES_SVG, yagmur: YAGMUR_SVG, sonbahar: SONBAHAR_SVG, kar: KAR_SVG, deniz: DENIZ_SVG, tatli: TATLI_SVG, sinema: SINEMA_SVG, kedi: KEDI_SVG, sifa: SIFA_SVG, kalp: KALP_SVG };
  /* düşen (ya da yükselen) süsler: renk listesi, hız çarpanı, içerik */
  var DUSME = {
    cicek: {}, kutlama: { renk: ["#ffd36b", "#fff", "#7ee0c3", "#ff8fb3", "#9fd3ff"] }, yagmur: { hiz: .22 }, sonbahar: { renk: ["#e8742c", "#f2b134", "#c8452c", "#d9822b"], hiz: 1.15 },
    kar: { hiz: 1.25 }, kalp: { metin: "♥", hiz: 1.1 }, kedi: { metin: "♥", renk: ["#ff8fb3", "#ec6f9a", "#ffb3c7"], hiz: 1.2 }, uykucu: { metin: "♥", renk: ["#c9b8ff", "#ffb3c7"], hiz: 1.5 }, tatli: { renk: ["#ff8fb3", "#7ee0c3", "#ffd36b", "#9fd3ff", "#b79cf2"] }, deniz: { hiz: .9 }
  };
  var YIL = [[8, 18, 0], [22, 62, .6], [80, 14, 1.2], [88, 58, .3], [14, 84, 1.7], [72, 82, .9], [50, 8, 2]];
  var DUSEN = [[8, 0, 6.5], [22, 2.4, 7.5], [36, 1.1, 6], [52, 3.3, 8], [66, .5, 7], [80, 2.8, 6.4], [92, 1.7, 7.8], [15, 4.2, 7.2], [74, 4.8, 6.8], [44, 5.5, 7.4]];
  function sanat(t) {
    var duse = "", dz = DUSME[t];
    if (dz) duse = '<div class="nkduse" aria-hidden="true">' + DUSEN.map(function (d, i) {
      var k = dz.hiz || 1, sure = (d[2] * k).toFixed(2), gec = (d[1] * k).toFixed(2);
      return '<i class="nkd" style="left:' + d[0] + "%;animation-delay:" + gec + "s;-webkit-animation-delay:" + gec + "s;animation-duration:" + sure + "s;-webkit-animation-duration:" + sure + "s" +
        (dz.renk ? (dz.metin ? ";color:" : ";background:") + dz.renk[i % dz.renk.length] : "") + '">' + (dz.metin || "") + "</i>";
    }).join("") + "</div>";
    var sahne;
    if (t === "gece" || !SAHNE[t]) sahne = YIL.map(function (y) { return '<span class="nkyil" style="left:' + y[0] + '%;top:' + y[1] + '%;animation-delay:' + y[2] + 's;-webkit-animation-delay:' + y[2] + 's">✦</span>'; }).join("") +
      '<span class="nkay">' + AY_SVG + '</span><span class="nkz">z</span><span class="nkz z2">z</span><span class="nkz z3">Z</span>';
    else sahne = SAHNE[t];
    return duse + '<div class="nksahne" aria-hidden="true">' + sahne + "</div>";
  }
  function kartHTML(n, alt, btn) {
    var t = TEMA[n.tema] ? n.tema : "gece", m = String(n.metin || ""), boy = m.length > 130 ? " uzun" : m.length > 60 ? " orta" : "";
    return '<div class="nk nk-' + t + '" role="dialog" aria-label="Not">' + sanat(t) +
      '<div class="nkkagit"><span class="nkbant"></span><p class="nkmetin' + boy + '">' + esc(m).replace(/\n/g, "<br>") + "</p></div>" +
      '<p class="nkalt">' + esc(alt) + '</p><button type="button" class="nkbtn">' + esc(btn) + "</button></div>";
  }
  function kartGoster(n, alt, btn, kapaninca) {
    var ov = document.createElement("div"); ov.className = "gkover nkov nkkartov"; ov.innerHTML = kartHTML(n, alt, btn);
    document.body.appendChild(ov);
    var b = ov.querySelector(".nkbtn"); b.onclick = function () { if (ov.parentNode) ov.parentNode.removeChild(ov); if (kapaninca) kapaninca(); };
    try { b.focus({ preventScroll: true }); } catch (e) {}
  }
  function gelenAlt(n) { return n.acilis ? "⏰ " + zaman(n.acilis) + " için yazılmıştı" : zaman(yaziZamani(n)); }

  /* ---------- gelen not: açılış saati gelince sırayla kart ---------- */
  function bekleyenler() {
    return notlar.filter(function (n) { return n.kime === ben && !n.okundu && acikMi(n) && !gosterilen[n.id]; })
      .sort(function (a, b) { return (a.acilis || yaziZamani(a)) - (b.acilis || yaziZamani(b)); });
  }
  function sirayaBak() {
    if (kartAcik || !ben) return;
    if ($("qmAcilis")) { setTimeout(sirayaBak, 600); return; }      /* açılış animasyonu bitsin (bitince öğe kaldırılır) */
    var L = bekleyenler(); if (!L.length) return;
    var n = L[0]; gosterilen[n.id] = true; kartAcik = true;
    kartGoster(n, gelenAlt(n), "Tamam " + (TEMA[n.tema] || TEMA.gece).emo, function () {
      kartAcik = false;
      db.collection("notlar").doc(n.id).set({ okundu: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () {});
      setTimeout(sirayaBak, 380);
    });
  }

  /* ---------- menü kartı ---------- */
  function menuyuCiz() {
    var sub = $("notlarSub"), rozet = $("notlarBadge"); if (!sub) return;
    if (!oteki) { rozet.hidden = true; sub.textContent = "Arkadaşın odaya katılınca ona not bırakabilirsin."; return; }
    var gelenYolda = notlar.filter(function (n) { return n.kime === ben && !acikMi(n); }).sort(function (a, b) { return a.acilis - b.acilis; });
    var giden = notlar.filter(function (n) { return n.kimden === ben; }).sort(function (a, b) { return yaziZamani(b) - yaziZamani(a); })[0];
    rozet.hidden = !gelenYolda.length;
    if (gelenYolda.length) { rozet.textContent = gelenYolda.length === 1 ? "not yolda" : gelenYolda.length + " not yolda"; sub.textContent = "Sana bir not yolda 🔒 Açılış: " + zaman(gelenYolda[0].acilis); return; }
    if (giden) {
      if (!acikMi(giden)) sub.textContent = "Notun yolda ⏰ Açılış: " + zaman(giden.acilis);
      else if (giden.okundu) sub.textContent = "Son notun okundu ✓ " + zaman(ms(giden.okundu) || Date.now());
      else sub.textContent = "Notun gitti; " + otekiAd + " menüyü açınca görecek.";
      return;
    }
    sub.textContent = yonelme(otekiAd) + " küçük bir not bırak; menüyü açınca görür.";
  }

  /* ---------- not yaz ---------- */
  var yaz = { tema: "gece", zaman: "hemen" };
  function sabah() { var d = new Date(), h = new Date(); h.setHours(8, 0, 0, 0); if (h <= d) h.setDate(h.getDate() + 1); return h.getTime(); }
  function yerelDeger(t) { var d = new Date(t); return d.getFullYear() + "-" + iki(d.getMonth() + 1) + "-" + iki(d.getDate()) + "T" + iki(d.getHours()) + ":" + iki(d.getMinutes()); }
  function yereldenMs(v) { var m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(v || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : 0; }
  function yazAc(tema) {
    yaz.tema = tema || yaz.tema;
    var ov = $("nkYaz");
    if (!ov) {
      ov = document.createElement("div"); ov.className = "gkover nkov"; ov.id = "nkYaz"; ov.hidden = true;
      ov.innerHTML = '<div class="nkpanel" role="dialog" aria-label="Not yaz">' +
        '<h2>' + esc(yonelme(otekiAd)) + ' not 💌</h2>' +
        '<textarea class="nkta" id="nkMetin" maxlength="' + MAX + '" rows="4" placeholder="Bir not yaz…"></textarea><small class="nksay" id="nkSay">0/' + MAX + "</small>" +
        '<div class="nkbas">Kart</div><div class="nktemalar" id="nkTemalar">' + SIRA.map(function (t) {
          return '<button type="button" data-t="' + t + '"><i class="nksw nk-' + t + '">' + TEMA[t].emo + "</i><span>" + TEMA[t].ad + "</span></button>";
        }).join("") + "</div>" +
        '<div class="nkbas">Ne zaman açılsın?</div><div class="nkseg" id="nkZaman"><button type="button" data-z="hemen">Hemen</button><button type="button" data-z="sabah">Sabah 08:00<small id="nkSabahGun"></small></button><button type="button" data-z="ozel">Saat seç</button></div>' +
        '<input type="datetime-local" class="nksaat" id="nkSaat" hidden>' +
        '<p class="nkuyari" id="nkUyari" role="alert"></p>' +
        '<div class="nkbtns"><button type="button" class="nkikinci" id="nkOnizle">Önizle</button><button type="button" class="nkana" id="nkGonder">Gönder</button></div>' +
        '<button type="button" class="nkkapat" id="nkYazKapat">Vazgeç</button></div>';
      document.body.appendChild(ov);
      $("nkMetin").addEventListener("input", function () { $("nkSay").textContent = this.value.length + "/" + MAX; $("nkUyari").textContent = ""; });
      $("nkTemalar").onclick = function (e) { var b = e.target.closest ? e.target.closest("button") : null; if (b) { yaz.tema = b.getAttribute("data-t"); yazCiz(); } };
      $("nkZaman").onclick = function (e) { var b = e.target.closest ? e.target.closest("button") : null; if (b) { yaz.zaman = b.getAttribute("data-z"); yazCiz(); if (yaz.zaman === "ozel") try { $("nkSaat").focus(); } catch (er) {} } };
      $("nkYazKapat").onclick = function () { ov.hidden = true; };
      $("nkOnizle").onclick = function () { var m = $("nkMetin").value.trim(); kartGoster({ metin: m || "Notun burada görünecek.", tema: yaz.tema }, "Önizleme · " + otekiAd + " böyle görecek", "Kapat"); };
      $("nkGonder").onclick = gonder;
    }
    yazCiz(); ov.hidden = false;
    setTimeout(function () { try { $("nkMetin").focus(); } catch (e) {} }, 60);
  }
  function yazCiz() {
    [].forEach.call($("nkTemalar").children, function (b) { b.classList.toggle("on", b.getAttribute("data-t") === yaz.tema); });
    [].forEach.call($("nkZaman").children, function (b) { b.classList.toggle("on", b.getAttribute("data-z") === yaz.zaman); });
    $("nkSabahGun").textContent = gunFark(sabah()) === 0 ? "bugün" : "yarın";
    var s = $("nkSaat"); s.hidden = yaz.zaman !== "ozel";
    s.min = yerelDeger(Date.now() + 60000);
    if (!s.value) s.value = yerelDeger(sabah());
  }
  function gonder() {
    var m = $("nkMetin").value.trim(), uy = $("nkUyari");
    if (!m) { uy.textContent = "Önce bir şey yaz 🙂"; return; }
    if (!oteki) { uy.textContent = "Arkadaşın henüz odaya katılmadı; katılınca not gönderebilirsin."; return; }
    var ac = yaz.zaman === "hemen" ? 0 : yaz.zaman === "sabah" ? sabah() : yereldenMs($("nkSaat").value);
    if (yaz.zaman === "ozel" && (!ac || ac < Date.now() + 60000)) { uy.textContent = "İleride bir saat seç."; return; }
    var b = $("nkGonder"); b.disabled = true; b.textContent = "Gidiyor…";
    db.collection("notlar").add({ kimden: ben, kime: oteki, metin: m.slice(0, MAX), tema: yaz.tema, t: firebase.firestore.FieldValue.serverTimestamp(), acilis: ac, okundu: null })
      .then(function () {
        b.disabled = false; b.textContent = "Gönder"; $("nkMetin").value = ""; $("nkSay").textContent = "0/" + MAX; $("nkYaz").hidden = true;
        tost(ac ? "Not yolda 💌 Açılış: " + zaman(ac) : "Not gitti 💌 " + otekiAd + " menüyü açınca görecek.");
        if ($("nkListe") && !$("nkListe").hidden) { liste.sekme = "giden"; listeCiz(); }
      }, function () { b.disabled = false; b.textContent = "Gönder"; uy.textContent = "Gönderilemedi; internet bağlantına bakıp tekrar dene."; });
  }

  /* ---------- notlar (geçmiş) ---------- */
  var liste = { sekme: "gelen", silinecek: null };
  function listeAc() {
    var ov = $("nkListe");
    if (!ov) {
      ov = document.createElement("div"); ov.className = "gkover nkov"; ov.id = "nkListe"; ov.hidden = true;
      ov.innerHTML = '<div class="nkpanel" role="dialog" aria-label="Notlar"><h2>Notlar 💌</h2>' +
        '<button type="button" class="nkana nkyeni" id="nkYeni">＋ Yeni not yaz</button>' +
        '<div class="nkseg nksekme" id="nkSekme"><button type="button" data-s="gelen">Gelen</button><button type="button" data-s="giden">Giden</button></div>' +
        '<ul class="nkl" id="nkL"></ul><button type="button" class="nkkapat" id="nkListeKapat">Kapat</button></div>';
      document.body.appendChild(ov);
      $("nkYeni").onclick = function () { yazAc(); };
      $("nkListeKapat").onclick = function () { ov.hidden = true; liste.silinecek = null; };
      $("nkSekme").onclick = function (e) { var b = e.target.closest ? e.target.closest("button") : null; if (b) { liste.sekme = b.getAttribute("data-s"); liste.silinecek = null; listeCiz(); } };
      $("nkL").onclick = listeTik;
    }
    listeCiz(); ov.hidden = false;
  }
  function listeCiz() {
    var ul = $("nkL"); if (!ul) return;
    var gelen = liste.sekme === "gelen";
    [].forEach.call($("nkSekme").children, function (b) {
      var s = b.getAttribute("data-s"), say = notlar.filter(function (n) { return s === "gelen" ? n.kime === ben : n.kimden === ben; }).length;
      b.classList.toggle("on", s === liste.sekme); b.textContent = (s === "gelen" ? "Gelen" : "Giden") + (say ? " · " + say : "");
    });
    var L = notlar.filter(function (n) { return gelen ? n.kime === ben : n.kimden === ben; })
      .sort(function (a, b) { return (b.acilis || yaziZamani(b)) - (a.acilis || yaziZamani(a)); });
    if (!L.length) { ul.innerHTML = '<li class="nkbos">' + (gelen ? "Henüz gelen not yok." : "Henüz not göndermedin. Yukarıdan ilkini yaz 💌") + "</li>"; return; }
    ul.innerHTML = L.map(function (n) {
      var t = TEMA[n.tema] ? n.tema : "gece";
      if (gelen && !acikMi(n)) return '<li class="nki kilit"><span class="nkie nk-' + t + '">🔒</span><span class="nkit"><b>Bir not yolda</b><small>Açılış: ' + esc(zaman(n.acilis)) + "</small></span></li>";
      var alt = gelen ? (n.acilis ? "⏰ " + zaman(n.acilis) : zaman(yaziZamani(n))) :
        !acikMi(n) ? "⏰ Açılış: " + zaman(n.acilis) : n.okundu ? "✓ Okundu · " + zaman(ms(n.okundu) || Date.now()) : "Gitti · henüz açmadı";
      var geri = !gelen && !n.okundu ? '<button type="button" class="nkgeri" data-sil="' + esc(n.id) + '">' + (liste.silinecek === n.id ? "Emin misin?" : "Geri al") + "</button>" : "";
      return '<li class="nki' + (!gelen && n.okundu ? " okundu" : "") + '" data-id="' + esc(n.id) + '"><span class="nkie nk-' + t + '">' + TEMA[t].emo + '</span><span class="nkit"><b>' + esc(n.metin) + "</b><small>" + esc(alt) + "</small></span>" + geri + "</li>";
    }).join("");
  }
  function listeTik(e) {
    var sil = e.target.closest ? e.target.closest("[data-sil]") : null;
    if (sil) {
      var id = sil.getAttribute("data-sil");
      if (liste.silinecek !== id) { liste.silinecek = id; listeCiz(); return; }
      liste.silinecek = null; sil.disabled = true;
      db.collection("notlar").doc(id).delete().then(function () { tost("Not geri alındı."); }, function () { tost("Geri alınamadı; okunmuş olabilir."); listeCiz(); });
      return;
    }
    var li = e.target.closest ? e.target.closest("li[data-id]") : null; if (!li) return;
    var n = notlar.filter(function (x) { return x.id === li.getAttribute("data-id"); })[0]; if (!n) return;
    if (n.kime === ben) kartGoster(n, gelenAlt(n), "Kapat");
    else kartGoster(n, (n.okundu ? "✓ Okundu · " + zaman(ms(n.okundu) || Date.now()) : !acikMi(n) ? "⏰ Açılış: " + zaman(n.acilis) : "Henüz açmadı") + " · " + otekiAd + " böyle gördü", "Kapat");
  }

  /* ---------- başlat ---------- */
  kart.onclick = function () {
    if (!db) return;
    listeAc();
  };
  Hesap.izle(function (k) {
    if (!k || !k.kesin || basladi) return; basladi = true;
    ben = k.uid; benKul = k.kul || "";
    /* öbür kişi: odanın öbür koltuğu (a ↔ b); koltuk boşsa not gönderilemez */
    function otekiBak() { var o = Hesap.oda && Hesap.oda(); oteki = o && o.dolu ? (ben === "a" ? "b" : "a") : null; otekiAd = Hesap.gorunenAd(ben === "a" ? "b" : "a") || "Arkadaşın"; menuyuCiz(); }
    otekiBak(); if (Hesap.odaIzle) Hesap.odaIzle(otekiBak);
    Hesap.db().then(function (d) {
      db = d; kart.hidden = false; menuyuCiz();
      d.collection("notlar").onSnapshot(function (snap) {
        var L = []; snap.forEach(function (doc) { var x = doc.data(); x.id = doc.id; if (x.kimden === ben || x.kime === ben) L.push(x); });
        notlar = L; menuyuCiz(); listeCiz(); sirayaBak();
      }, function () { $("notlarSub").textContent = "Notlara şu an ulaşılamıyor."; });
      setInterval(function () { menuyuCiz(); listeCiz(); sirayaBak(); }, 30000);
    }).catch(function () {});
  });
})();
