/* Oda Döşe — çizim tabanlı oda döşeme oyunu (iç mimari). Doğru cevap yok; parça seç, sürükle, renk ver, mimar onayına sun.
   Oda localStorage'da saklanır (sef_oda). Paylaş: SVG → PNG → iOS paylaşım menüsü (yoksa büyük görsel + basılı tut). */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var SVG_NS = "http://www.w3.org/2000/svg", XLINK = "http://www.w3.org/1999/xlink";
  var W = 400, H = 320, WALL_H = 215; /* sahne ölçüleri: duvar 0–215, zemin 215–320 */

  /* ---------- renk paletleri ---------- */
  var WALLS = [
    { ad: "lavanta", c: "#e9e1f7" }, { ad: "şakayık", c: "#fbe3ec" }, { ad: "lilyum", c: "#fff1cf" },
    { ad: "adaçayı", c: "#dfeee2" }, { ad: "bej", c: "#f3ebe0" }, { ad: "gök", c: "#e3eef8" }, { ad: "beyaz", c: "#fbfaf7" }, { ad: "gece", c: "#3f3a5c" }
  ];
  var FLOORS = [
    { ad: "açık ahşap", c: "#e3c9a3", l: "#d1b48a" }, { ad: "koyu ahşap", c: "#b58a5c", l: "#a07648" }, { ad: "taş", c: "#d9d6d2", l: "#c6c2bd" },
    { ad: "karo", c: "#efe7fb", l: "#dccdf2" }, { ad: "parke gri", c: "#c7bfb8", l: "#b3aaa2" }
  ];
  var MOB = ["#9b7fd1", "#ec6f9a", "#7fa98a", "#e2b04a", "#d98b6a", "#4e5d8a", "#e9dcc9", "#3d2a3f"];   /* mobilya */
  var WOOD = ["#c58f5a", "#8c6239", "#e3c9a3", "#f5f1ea", "#3d2a3f"];                                      /* ahşap / çerçeve */
  var CAT = ["#8d8d9c", "#e9a15b", "#3d2a3f", "#f5f1ea", "#b48a6e"];
  var FRAME = ["#d9a441", "#f5f1ea", "#9b7fd1", "#3d2a3f", "#c58f5a"];
  var POT = ["#d98b6a", "#9b7fd1", "#f5f1ea", "#3d2a3f", "#7fa98a"];

  /* ---------- parçalar (100×100 kutu; zemin parçaları alt-orta, duvar parçaları merkez hizalı) ---------- */
  var TYPES = {
    koltuk: { ad: "Koltuk", zone: "floor", w: 150, cols: MOB, c: 0, layer: 1, svg:
      '<rect x="8" y="56" width="84" height="34" rx="10" fill="currentColor"/><rect x="14" y="40" width="72" height="26" rx="9" fill="currentColor"/>' +
      '<rect x="3" y="60" width="15" height="32" rx="7" fill="currentColor"/><rect x="82" y="60" width="15" height="32" rx="7" fill="currentColor"/>' +
      '<rect x="20" y="62" width="28" height="18" rx="6" fill="#fff" opacity=".32"/><rect x="52" y="62" width="28" height="18" rx="6" fill="#fff" opacity=".32"/>' +
      '<rect x="14" y="90" width="7" height="8" rx="2" fill="#7a5a3a"/><rect x="79" y="90" width="7" height="8" rx="2" fill="#7a5a3a"/>' },
    berjer: { ad: "Berjer", zone: "floor", w: 90, cols: MOB, c: 1, layer: 1, svg:
      '<rect x="18" y="30" width="64" height="40" rx="14" fill="currentColor"/><rect x="12" y="58" width="76" height="30" rx="10" fill="currentColor"/>' +
      '<rect x="8" y="56" width="16" height="34" rx="8" fill="currentColor"/><rect x="76" y="56" width="16" height="34" rx="8" fill="currentColor"/>' +
      '<rect x="26" y="64" width="48" height="18" rx="7" fill="#fff" opacity=".32"/>' +
      '<rect x="18" y="88" width="7" height="10" rx="2" fill="#7a5a3a"/><rect x="75" y="88" width="7" height="10" rx="2" fill="#7a5a3a"/>' },
    sehpa: { ad: "Sehpa", zone: "floor", w: 90, cols: WOOD, c: 0, layer: 1, svg:
      '<ellipse cx="50" cy="64" rx="44" ry="12" fill="currentColor"/><ellipse cx="50" cy="60" rx="44" ry="12" fill="#fff" opacity=".22"/>' +
      '<rect x="14" y="68" width="5" height="30" rx="2" fill="currentColor"/><rect x="81" y="68" width="5" height="30" rx="2" fill="currentColor"/>' +
      '<rect x="47" y="72" width="5" height="26" rx="2" fill="currentColor" opacity=".8"/>' },
    kitaplik: { ad: "Kitaplık", zone: "floor", w: 90, cols: WOOD, c: 1, layer: 1, svg:
      '<rect x="12" y="4" width="76" height="94" rx="4" fill="currentColor"/><rect x="18" y="10" width="64" height="24" fill="#fff" opacity=".35"/>' +
      '<rect x="18" y="40" width="64" height="24" fill="#fff" opacity=".35"/><rect x="18" y="70" width="64" height="22" fill="#fff" opacity=".35"/>' +
      '<rect x="20" y="14" width="7" height="20" fill="#9b7fd1"/><rect x="28" y="18" width="6" height="16" fill="#ec6f9a"/><rect x="35" y="12" width="8" height="22" fill="#e2b04a"/><rect x="44" y="20" width="6" height="14" fill="#7fa98a"/><rect x="52" y="16" width="9" height="18" fill="#4e5d8a"/>' +
      '<rect x="22" y="46" width="22" height="6" fill="#ec6f9a"/><rect x="22" y="52" width="26" height="6" fill="#9b7fd1"/><rect x="22" y="58" width="18" height="6" fill="#e2b04a"/><circle cx="68" cy="54" r="7" fill="#7fa98a"/><rect x="63" y="58" width="10" height="6" fill="#d98b6a"/>' +
      '<rect x="20" y="74" width="8" height="18" fill="#7fa98a"/><rect x="29" y="78" width="7" height="14" fill="#d98b6a"/><rect x="37" y="72" width="9" height="20" fill="#9b7fd1"/><rect x="47" y="80" width="6" height="12" fill="#ec6f9a"/><rect x="55" y="76" width="8" height="16" fill="#e2b04a"/>' },
    hali: { ad: "Halı", zone: "floor", w: 190, cols: MOB, c: 0, layer: 0, svg:
      '<rect x="2" y="66" width="96" height="32" rx="10" fill="currentColor"/><rect x="8" y="71" width="84" height="22" rx="7" fill="#fff" opacity=".28"/>' +
      '<rect x="14" y="76" width="72" height="12" rx="5" fill="currentColor" opacity=".55"/>' },
    lambader: { ad: "Lambader", zone: "floor", w: 64, cols: MOB, c: 3, layer: 2, svg:
      '<path d="M30 12h40l10 30H20z" fill="currentColor"/><path d="M30 12h40l10 30H20z" fill="#fff" opacity=".25"/>' +
      '<ellipse cx="50" cy="44" rx="30" ry="6" fill="#fff6c8" opacity=".9"/><rect x="48" y="42" width="4" height="48" fill="#3d2a3f"/>' +
      '<ellipse cx="50" cy="94" rx="18" ry="4" fill="#3d2a3f"/>' },
    masalambasi: { ad: "Masa lambası", kisa: "Lamba", zone: "floor", w: 40, cols: MOB, c: 1, layer: 2, svg:
      '<path d="M28 30h44l8 28H20z" fill="currentColor"/><path d="M28 30h44l8 28H20z" fill="#fff" opacity=".25"/>' +
      '<rect x="47" y="58" width="6" height="30" fill="#3d2a3f"/><ellipse cx="50" cy="92" rx="16" ry="5" fill="#3d2a3f"/>' },
    sarkit: { ad: "Sarkıt lamba", kisa: "Sarkıt", zone: "ceil", w: 54, cols: MOB, c: 3, layer: 2, svg:
      '<rect x="49" y="0" width="2" height="40" fill="#3d2a3f"/><path d="M24 40h52l10 30H14z" fill="currentColor"/><path d="M24 40h52l10 30H14z" fill="#fff" opacity=".22"/>' +
      '<ellipse cx="50" cy="72" rx="30" ry="7" fill="#fff6c8" opacity=".9"/>' },
    tablo: { ad: "Tablo", kisa: "Tablo", zone: "wall", w: 64, cols: FRAME, c: 0, layer: 2, svg:
      '<rect x="14" y="4" width="72" height="92" rx="4" fill="currentColor"/><rect x="21" y="11" width="58" height="78" fill="#fde3d1"/>' +
      '<rect x="21" y="52" width="58" height="37" fill="#b9d9c4"/><circle cx="60" cy="30" r="9" fill="#f6c64a"/><path d="M21 70l14-18 12 14 9-9 23 25H21z" fill="#6f9a7c"/><path d="M21 76l9-10 10 11 7-6 32 18H21z" fill="#4f7a5e"/>' },
    pencere: { ad: "Şehir manzaralı pencere", kisa: "Pencere", zone: "wall", w: 130, cols: MOB, c: 6, layer: 1, svg:
      '<rect x="18" y="12" width="64" height="76" rx="3" fill="#f5f1ea"/><rect x="22" y="16" width="56" height="68" fill="#dcecf7"/>' +
      '<g fill="#b8a9d9" opacity=".75"><rect x="22" y="66" width="56" height="18"/><path d="M34 66a9 9 0 0 1 18 0zM54 66a7 7 0 0 1 14 0z"/><rect x="29" y="44" width="2" height="22"/><rect x="51" y="46" width="2" height="20"/><rect x="66" y="48" width="2" height="18"/></g>' +
      '<rect x="49" y="16" width="2" height="68" fill="#f5f1ea"/><rect x="22" y="49" width="56" height="2" fill="#f5f1ea"/>' +
      '<path d="M8 10h22v84H8z" fill="currentColor"/><path d="M70 10h22v84H70z" fill="currentColor"/><rect x="4" y="6" width="92" height="5" rx="2" fill="#3d2a3f"/>' },
    monstera: { ad: "Monstera", zone: "floor", w: 76, cols: POT, c: 0, layer: 2, svg:
      '<g fill="#5c9a6c"><path d="M50 70C40 60 28 40 36 22c8 10 10 22 14 40z"/><path d="M52 70c8-14 24-28 36-24-8 6-18 14-28 26z"/><path d="M48 72C30 62 14 50 16 36c12 4 24 18 32 34z"/><path d="M54 72c2-18 10-36 26-44-2 14-10 30-22 44z"/></g>' +
      '<path d="M32 70h36l-4 28H36z" fill="currentColor"/><rect x="30" y="66" width="40" height="7" rx="2" fill="currentColor" opacity=".8"/>' },
    lavanta: { ad: "Lavanta saksısı", kisa: "Lavanta", zone: "floor", w: 48, cols: POT, c: 2, layer: 2, svg:
      '<g stroke="#6f9a5a" stroke-width="2.5" fill="none"><path d="M50 72V30M40 72V36M60 72V34M34 72V46M66 72V44"/></g>' +
      '<g fill="#9b7fd1"><circle cx="50" cy="22" r="4"/><circle cx="50" cy="30" r="4"/><circle cx="40" cy="28" r="3.5"/><circle cx="40" cy="36" r="3.5"/><circle cx="60" cy="26" r="3.5"/><circle cx="60" cy="34" r="3.5"/><circle cx="34" cy="40" r="3"/><circle cx="34" cy="47" r="3"/><circle cx="66" cy="38" r="3"/><circle cx="66" cy="45" r="3"/></g>' +
      '<path d="M34 72h32l-3 26H37z" fill="currentColor"/><rect x="31" y="68" width="38" height="6" rx="2" fill="currentColor" opacity=".8"/>' },
    sakayik: { ad: "Şakayık vazosu", kisa: "Şakayık", zone: "floor", w: 48, cols: POT, c: 2, layer: 2, svg:
      '<g stroke="#6f9a5a" stroke-width="2.5" fill="none"><path d="M50 70V40M38 70V44M62 70V46"/></g>' +
      '<g fill="#ec6f9a"><circle cx="50" cy="32" r="12"/><circle cx="36" cy="42" r="9"/><circle cx="64" cy="43" r="9"/></g><g fill="#f7a9c4"><circle cx="50" cy="32" r="7"/><circle cx="36" cy="42" r="5"/><circle cx="64" cy="43" r="5"/></g>' +
      '<path d="M38 70h24l-2 28H40z" fill="currentColor"/><rect x="36" y="66" width="28" height="6" rx="2" fill="currentColor" opacity=".8"/>' },
    lilyum: { ad: "Lilyum vazosu", kisa: "Lilyum", zone: "floor", w: 48, cols: POT, c: 3, layer: 2, svg:
      '<g stroke="#6f9a5a" stroke-width="2.5" fill="none"><path d="M46 70V38M58 70V44"/></g>' +
      '<g fill="#f6b73c"><path d="M46 36l6-14 2 12 10-6-6 10 12 2-12 4 6 10-10-6-2 12-6-12-10 6 6-10-12-4 12-2-6-10 10 6z"/><path d="M58 44l4-10 2 8 7-4-4 7 8 1-8 3 4 7-7-4-2 8-4-8-7 4 4-7-8-3 8-1-4-7 7 4z" opacity=".9"/></g>' +
      '<path d="M38 70h24l-2 28H40z" fill="currentColor"/><rect x="36" y="66" width="28" height="6" rx="2" fill="currentColor" opacity=".8"/>' },
    kedi: { ad: "Kedi", zone: "floor", w: 60, cols: CAT, c: 0, layer: 3, svg:
      '<path d="M30 98c-4-14 2-34 18-38 18 4 24 24 20 38z" fill="currentColor"/><path d="M62 90c10 2 22-6 22-18 0-6-6-6-6 0 0 6-6 12-16 12z" fill="currentColor"/>' +
      '<circle cx="48" cy="52" r="15" fill="currentColor"/><path d="M36 44l-2-16 12 8zM60 44l2-16-12 8z" fill="currentColor"/>' +
      '<g fill="#3d2a3f"><ellipse cx="43" cy="52" rx="2.2" ry="3"/><ellipse cx="53" cy="52" rx="2.2" ry="3"/></g><path d="M46 58h4l-2 2z" fill="#ec6f9a"/>' +
      '<g stroke="#3d2a3f" stroke-width="1" opacity=".5"><path d="M30 56h10M30 60h10M56 56h10M56 60h10"/></g>' },
    kitaplar: { ad: "Kitap yığını", kisa: "Kitaplar", zone: "floor", w: 40, cols: MOB, c: 5, layer: 3, svg:
      '<rect x="22" y="80" width="56" height="12" rx="2" fill="currentColor"/><rect x="26" y="68" width="50" height="12" rx="2" fill="#ec6f9a"/><rect x="24" y="56" width="48" height="12" rx="2" fill="#e2b04a"/>' +
      '<rect x="30" y="44" width="40" height="12" rx="2" fill="#7fa98a"/><rect x="22" y="92" width="56" height="4" fill="#000" opacity=".1"/>' },
    kahve: { ad: "Americano", zone: "floor", w: 26, cols: MOB, c: 6, layer: 3, svg:
      '<path d="M26 54h44l-6 40H32z" fill="currentColor"/><path d="M70 60h8a8 8 0 0 1 0 18h-8" fill="none" stroke="currentColor" stroke-width="5"/>' +
      '<ellipse cx="48" cy="54" rx="22" ry="5" fill="#5a3a2a"/><g stroke="#b9a1ea" stroke-width="2.5" fill="none" opacity=".8"><path d="M40 44c4-6-4-10 0-16M52 44c4-6-4-10 0-16"/></g>' },
    tost: { ad: "Atom tost", zone: "floor", w: 36, cols: MOB, c: 6, layer: 3, svg:
      '<ellipse cx="50" cy="88" rx="40" ry="9" fill="currentColor"/><ellipse cx="50" cy="86" rx="40" ry="9" fill="#fff" opacity=".4"/>' +
      '<path d="M22 60h56v22H22z" fill="#e9b96e"/><path d="M22 60c0-10 8-14 14-10 4-8 20-8 28 0 6-4 14 0 14 10z" fill="#f1c98a"/>' +
      '<rect x="24" y="68" width="52" height="6" fill="#f6b73c"/><rect x="24" y="74" width="52" height="4" fill="#c94c3f"/>' },
    muffin: { ad: "Yaban mersinli muffin", kisa: "Muffin", zone: "floor", w: 28, cols: MOB, c: 6, layer: 3, svg:
      '<path d="M30 66h40l-4 30H34z" fill="#d9a441"/><path d="M22 66c0-18 56-18 56 0z" fill="#e9c27a"/>' +
      '<g fill="#4e5d8a"><circle cx="38" cy="58" r="3"/><circle cx="52" cy="54" r="3"/><circle cx="62" cy="60" r="2.6"/><circle cx="46" cy="64" r="2.4"/></g>' +
      '<g stroke="currentColor" stroke-width="2" opacity=".5"><path d="M34 70v24M44 68v28M56 68v28M66 70v24"/></g>' },
    yastik: { ad: "Yastık", zone: "floor", w: 38, cols: MOB, c: 2, layer: 3, svg:
      '<path d="M22 60q28-8 56 0q-8 20 0 38q-28-8-56 0q8-18 0-38z" fill="currentColor"/><path d="M30 66q20-6 40 0q-6 14 0 26q-20-6-40 0q6-12 0-26z" fill="#fff" opacity=".22"/>' },
    ayna: { ad: "Ayna", zone: "wall", w: 56, cols: FRAME, c: 0, layer: 2, svg:
      '<circle cx="50" cy="50" r="42" fill="currentColor"/><circle cx="50" cy="50" r="34" fill="#dcecf7"/><path d="M30 60c6-20 20-30 38-32" stroke="#fff" stroke-width="5" fill="none" opacity=".8" stroke-linecap="round"/>' },
    saat: { ad: "Duvar saati", kisa: "Saat", zone: "wall", w: 40, cols: FRAME, c: 3, layer: 2, svg:
      '<circle cx="50" cy="50" r="40" fill="currentColor"/><circle cx="50" cy="50" r="33" fill="#fbfaf7"/><g stroke="#3d2a3f" stroke-width="4" stroke-linecap="round"><path d="M50 50V28M50 50l14 8"/></g><circle cx="50" cy="50" r="3" fill="#ec6f9a"/>' },
    raf: { ad: "Raf", zone: "wall", w: 96, cols: WOOD, c: 0, layer: 2, svg:
      '<rect x="6" y="60" width="88" height="7" rx="2" fill="currentColor"/>' +
      '<rect x="14" y="40" width="7" height="20" fill="#9b7fd1"/><rect x="22" y="44" width="6" height="16" fill="#ec6f9a"/><rect x="29" y="38" width="8" height="22" fill="#e2b04a"/>' +
      '<path d="M58 60h12l-1-10H59z" fill="#d98b6a"/><g fill="#5c9a6c"><circle cx="61" cy="44" r="5"/><circle cx="67" cy="41" r="5"/><circle cx="64" cy="37" r="4"/></g>' +
      '<rect x="78" y="48" width="10" height="12" rx="2" fill="#4e5d8a"/>' },
    afis: { ad: "Tiyatro afişi", kisa: "Tiyatro", zone: "wall", w: 60, cols: MOB, c: 7, layer: 2, svg:
      '<rect x="18" y="4" width="64" height="92" rx="3" fill="currentColor"/><rect x="24" y="10" width="52" height="80" fill="#fbe3ec"/>' +
      '<g fill="#ec6f9a"><path d="M32 36c0 16 12 24 18 24s18-8 18-24c-10 4-26 4-36 0z"/></g><g fill="#3d2a3f"><ellipse cx="42" cy="44" rx="4" ry="3"/><ellipse cx="58" cy="44" rx="4" ry="3"/><path d="M42 54q8 6 16 0" fill="none" stroke="#3d2a3f" stroke-width="2.5"/></g>' +
      '<rect x="32" y="70" width="36" height="4" rx="2" fill="#9b7fd1"/><rect x="38" y="78" width="24" height="4" rx="2" fill="#9b7fd1" opacity=".6"/>' },
    sinema: { ad: "Film afişi", kisa: "Sinema", zone: "wall", w: 60, cols: MOB, c: 5, layer: 2, svg:
      '<rect x="18" y="4" width="64" height="92" rx="3" fill="currentColor"/><rect x="24" y="10" width="52" height="80" fill="#3d2a3f"/>' +
      '<g fill="#f6b73c"><path d="M50 22l6 14 15 2-11 10 3 15-13-7-13 7 3-15-11-10 15-2z"/></g>' +
      '<rect x="24" y="10" width="52" height="6" fill="#fbfaf7" opacity=".2"/><rect x="24" y="84" width="52" height="6" fill="#fbfaf7" opacity=".2"/><rect x="32" y="70" width="36" height="4" rx="2" fill="#f5f1ea" opacity=".8"/>' }
  };
  var ORDER = ["koltuk", "berjer", "hali", "sehpa", "kitaplik", "pencere", "tablo", "lambader", "sarkit", "monstera", "lavanta", "sakayik", "lilyum", "kedi", "kahve", "muffin", "tost", "yastik", "kitaplar", "masalambasi", "raf", "ayna", "saat", "afis", "sinema"];

  /* ---------- durum ---------- */
  var scene = { wall: 0, floor: 0, items: [] }, sel = -1, uid = 1;
  var svg = $("oda"), layer = $("items"), stageEl = document.querySelector("main"), hintEl = $("odaHint");
  try { var saved = JSON.parse(localStorage.getItem("sef_oda") || "null"); if (saved && saved.items) { scene = saved; scene.items.forEach(function (it) { it.id = uid++; }); } } catch (e) {}
  function save() { try { localStorage.setItem("sef_oda", JSON.stringify(scene)); } catch (e) {} }
  function burst(n) { if (window.__burst) try { window.__burst(n); } catch (e) {} }
  function hint(t) { hintEl.textContent = t; }

  /* ---------- sembolleri tanımla ---------- */
  var defs = document.createElementNS(SVG_NS, "defs");
  ORDER.forEach(function (k) {
    var s = document.createElementNS(SVG_NS, "symbol"); s.setAttribute("id", "sym-" + k); s.setAttribute("viewBox", "0 0 100 100"); s.innerHTML = TYPES[k].svg; defs.appendChild(s);
  });
  svg.insertBefore(defs, svg.firstChild);

  /* ---------- oda zemini ---------- */
  function paintRoom() {
    var w = WALLS[scene.wall], f = FLOORS[scene.floor];
    $("wall").setAttribute("fill", w.c); $("floor").setAttribute("fill", f.c);
    var lines = $("planks"); lines.innerHTML = "";
    for (var i = 1; i < 10; i++) { var r = document.createElementNS(SVG_NS, "rect"); r.setAttribute("x", 0); r.setAttribute("y", WALL_H + i * 10.5); r.setAttribute("width", W); r.setAttribute("height", 1.2); r.setAttribute("fill", f.l); lines.appendChild(r); }
    $("skirt").setAttribute("fill", scene.wall === 7 ? "#5a5478" : "#fbfaf7");
  }

  /* ---------- parça çizimi ---------- */
  function sorted() { return scene.items.slice().sort(function (a, b) { var la = TYPES[a.t].layer, lb = TYPES[b.t].layer; return la !== lb ? la - lb : a.y - b.y; }); }
  function itemNode(it) {
    var T = TYPES[it.t], g = document.createElementNS(SVG_NS, "g"), u = document.createElementNS(SVG_NS, "use");
    g.setAttribute("class", "it" + (it.id === sel ? " on" : "")); g.setAttribute("data-id", it.id); g.style.color = T.cols[it.c % T.cols.length];
    var w = T.w * it.s, ax = -w / 2, ay = T.zone === "wall" || T.zone === "ceil" ? -w / 2 : -w;
    u.setAttributeNS(XLINK, "xlink:href", "#sym-" + it.t); u.setAttribute("href", "#sym-" + it.t);
    u.setAttribute("x", ax); u.setAttribute("y", ay); u.setAttribute("width", w); u.setAttribute("height", w);
    if (it.id === sel) { var r = document.createElementNS(SVG_NS, "rect"); r.setAttribute("class", "selbox"); r.setAttribute("x", ax - 3); r.setAttribute("y", ay - 3); r.setAttribute("width", w + 6); r.setAttribute("height", w + 6); r.setAttribute("rx", 8); g.appendChild(r); }
    g.appendChild(u);
    g.setAttribute("transform", "translate(" + it.x.toFixed(1) + " " + it.y.toFixed(1) + ") scale(" + (it.f ? -1 : 1) + " 1)");
    return g;
  }
  function render() {
    layer.innerHTML = "";
    sorted().forEach(function (it) { layer.appendChild(itemNode(it)); });
    tools(); save(); $("cnt").textContent = scene.items.length;
  }
  function find(id) { for (var i = 0; i < scene.items.length; i++) if (scene.items[i].id === id) return scene.items[i]; return null; }
  function clamp(it) {
    var T = TYPES[it.t], w = T.w * it.s;
    if (T.zone === "floor") { it.y = Math.max(WALL_H + 6, Math.min(H - 2, it.y)); }
    else if (T.zone === "ceil") { it.y = Math.max(w / 2 - 20, Math.min(WALL_H - 30, it.y)); }
    else { it.y = Math.max(w / 2 + 4, Math.min(WALL_H - w / 2 + 10, it.y)); }
    it.x = Math.max(w * 0.25, Math.min(W - w * 0.25, it.x));
  }

  /* ---------- tepsi ---------- */
  var tray = $("tray");
  ORDER.forEach(function (k) {
    var T = TYPES[k], b = document.createElement("button"); b.type = "button"; b.className = "tp"; b.title = T.ad;
    b.innerHTML = '<svg viewBox="0 0 100 100" style="color:' + T.cols[T.c] + '"><use href="#sym-' + k + '" xlink:href="#sym-' + k + '"/></svg><span></span>'; b.lastChild.textContent = T.kisa || T.ad;
    b.onclick = function () { add(k); };
    tray.appendChild(b);
  });
  function add(k) {
    var T = TYPES[k], it = { id: uid++, t: k, x: W * 0.3 + Math.random() * W * 0.4, y: 0, s: 1, f: 0, c: T.c };
    it.y = T.zone === "floor" ? WALL_H + 40 + Math.random() * 50 : T.zone === "ceil" ? 40 : 90 + Math.random() * 40;
    clamp(it); scene.items.push(it); sel = it.id; render();
    hint(T.ad + " eklendi — sürükle, renk ver");
    if (k === "tablo") hint("Tablo duvarda. Galeri havası 🖼️");
    if (k === "kedi") hint("Kedi geldi. Artık oda onun, sen misafirsin 🐈");
    if (k === "tost") hint("Tost tabağı geldi. Kokusu buraya kadar 🍞");
    if (k === "pencere") hint("Pencereden şehir görünüyor 🌆");
  }

  /* ---------- sürükleme ---------- */
  var drag = null;
  function pt(e) {
    var r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  svg.addEventListener("pointerdown", function (e) {
    var t = e.target; while (t && t !== svg && !(t.getAttribute && t.getAttribute("data-id"))) t = t.parentNode;
    if (!t || t === svg) { if (sel !== -1) { sel = -1; render(); } return; }
    var id = +t.getAttribute("data-id"), it = find(id); if (!it) return;
    e.preventDefault();
    if (sel !== id) { sel = id; render(); t = layer.querySelector('[data-id="' + id + '"]'); }
    var p = pt(e); drag = { it: it, dx: it.x - p.x, dy: it.y - p.y, node: t, moved: false };
    try { svg.setPointerCapture(e.pointerId); } catch (err) {}
  });
  svg.addEventListener("pointermove", function (e) {
    if (!drag) return; e.preventDefault();
    var p = pt(e), it = drag.it; it.x = p.x + drag.dx; it.y = p.y + drag.dy; clamp(it); drag.moved = true;
    drag.node.setAttribute("transform", "translate(" + it.x.toFixed(1) + " " + it.y.toFixed(1) + ") scale(" + (it.f ? -1 : 1) + " 1)");
  });
  function endDrag(e) { if (!drag) return; var m = drag.moved; drag = null; if (m) render(); }
  svg.addEventListener("pointerup", endDrag); svg.addEventListener("pointercancel", endDrag);

  /* ---------- araçlar ---------- */
  var toolsSel = $("toolsSel"), toolsRoom = $("toolsRoom");
  function tools() { var on = sel !== -1 && find(sel); toolsSel.hidden = !on; toolsRoom.hidden = !!on; }
  $("tColor").onclick = function () { var it = find(sel); if (!it) return; it.c = (it.c + 1) % TYPES[it.t].cols.length; render(); };
  $("tFlip").onclick = function () { var it = find(sel); if (!it) return; it.f = it.f ? 0 : 1; render(); };
  $("tBig").onclick = function () { var it = find(sel); if (!it) return; it.s = Math.min(1.7, +(it.s + 0.12).toFixed(2)); clamp(it); render(); };
  $("tSmall").onclick = function () { var it = find(sel); if (!it) return; it.s = Math.max(0.55, +(it.s - 0.12).toFixed(2)); clamp(it); render(); };
  $("tDel").onclick = function () { var it = find(sel); if (!it) return; scene.items = scene.items.filter(function (x) { return x.id !== sel; }); sel = -1; render(); hint("Kaldırıldı. Minimalizm de bir tercih 😌"); };
  $("tDone").onclick = function () { sel = -1; render(); };
  $("rWall").onclick = function () { scene.wall = (scene.wall + 1) % WALLS.length; paintRoom(); save(); hint("Duvar: " + WALLS[scene.wall].ad); };
  $("rFloor").onclick = function () { scene.floor = (scene.floor + 1) % FLOORS.length; paintRoom(); save(); hint("Zemin: " + FLOORS[scene.floor].ad); };
  var clearArmed = false;
  $("rClear").onclick = function () {
    if (!clearArmed) { clearArmed = true; this.textContent = "Emin misin?"; hint("Bir daha dokunursan oda boşalır."); var b = this; setTimeout(function () { clearArmed = false; b.textContent = "🗑"; }, 2500); return; }
    clearArmed = false; this.textContent = "🗑"; scene.items = []; sel = -1; render(); hint("Taşınma günü. Tepsiden yeniden başla 📦");
  };

  /* ---------- mimar onayı ---------- */
  function count(t) { return scene.items.filter(function (i) { return i.t === t; }).length; }
  function has(list) { return list.some(function (t) { return count(t) > 0; }); }
  $("rCheck").onclick = function () {
    var pts = 0, notes = [];
    if (!scene.items.length) { notes.push("Boş oda. Minimalizm derler ama bu fazla minimal 😅"); }
    if (has(["koltuk", "berjer"])) { pts += 2; notes.push("Oturacak yer var ✓"); } else if (scene.items.length) notes.push("Koltuk yok; misafir ayakta mı oturacak? 🪑");
    if (count("hali")) { pts += 1; notes.push("Halı: ayaklar üşümez ✓"); }
    if (has(["lambader", "sarkit", "masalambasi"])) { pts += 1; notes.push("Işık çözülmüş ✓"); } else if (scene.items.length) notes.push("Lamba yok; akşam karanlıkta kalırsın 💡");
    var plants = count("monstera") + count("lavanta") + count("sakayik") + count("lilyum");
    if (plants) { pts += 1; notes.push(plants >= 4 ? "Bitki çok: bu oda değil, sera 🌿" : "Yeşillik var ✓"); }
    var fl = (count("lavanta") ? 1 : 0) + (count("sakayik") ? 1 : 0) + (count("lilyum") ? 1 : 0);
    if (fl) { pts += Math.min(2, fl); notes.push(fl === 3 ? "Lavanta, şakayık, lilyum: üçü de burada 💐" : "Çiçekler masada ✓"); }
    if (count("kedi")) { pts += 1; notes.push(count("kedi") > 1 ? "Kediler odayı teslim aldı 🐈🐈" : "Kedi onayı alındı 🐈"); }
    if (count("tablo")) { pts += 1; notes.push("Duvarda tablo var ✓ 🖼️"); }
    if (has(["kahve", "muffin", "tost"])) { pts += 1; notes.push("Menü tamam: " + ["kahve", "muffin", "tost"].filter(function (t) { return count(t); }).map(function (t) { return TYPES[t].ad.toLowerCase(); }).join(", ") + " ☕"); }
    if (count("pencere")) { pts += 1; notes.push("Manzaralı pencere ✓ 🌆"); }
    if (has(["kitaplik", "kitaplar", "raf"])) { pts += 1; notes.push("Kitaplar yerinde ✓"); }
    if (has(["afis", "sinema"])) { pts += 1; notes.push("Tiyatro/sinema köşesi ✓"); }
    if (scene.items.length > 16) { pts -= 1; notes.push("Biraz kalabalık oldu. Nefes alsın 😅"); }
    pts = Math.max(0, Math.min(10, pts));
    var title = pts >= 9 ? "Dergilik oda ✨" : pts >= 6 ? "Rahat ve sıcak 🧶" : pts >= 3 ? "Başlangıç iyi, devam 🛠️" : "Taşınma günü gibi 📦";
    $("ovScore").textContent = pts + "/10"; $("ovTitle").textContent = title;
    var ul = $("ovNotes"); ul.innerHTML = ""; notes.slice(0, 7).forEach(function (n) { var li = document.createElement("li"); li.textContent = n; ul.appendChild(li); });
    $("over").hidden = false; burst(10 + pts * 3);
  };
  $("ovClose").onclick = function () { $("over").hidden = true; };

  /* ---------- paylaş: SVG → PNG ---------- */
  function toPng(cb) {
    var clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", SVG_NS); clone.setAttribute("xmlns:xlink", XLINK); clone.setAttribute("width", 800); clone.setAttribute("height", 640);
    var sb = clone.querySelectorAll(".selbox"); for (var i = 0; i < sb.length; i++) sb[i].parentNode.removeChild(sb[i]);
    var src = new XMLSerializer().serializeToString(clone);
    var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
    var im = new Image();
    im.onload = function () {
      var c = document.createElement("canvas"), S = 2; c.width = 800 * S; c.height = 700 * S; var x = c.getContext("2d");
      x.fillStyle = "#fbfaf7"; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(im, 0, 0, 800 * S, 640 * S);
      x.fillStyle = "#6e52a8"; x.font = "bold " + (22 * S) + "px Nunito, -apple-system, Helvetica, sans-serif"; x.textAlign = "center";
      x.fillText("Oda Döşe 🛋️", 400 * S, 678 * S);
      try { c.toBlob(function (b) { cb(b, c.toDataURL("image/png")); }, "image/png"); } catch (e) { cb(null, null); }
    };
    im.onerror = function () { cb(null, null); };
    im.src = url;
  }
  function share() {
    hint("Görsel hazırlanıyor…");
    toPng(function (blob, dataUrl) {
      if (!blob) { hint("Görsel oluşturulamadı; ekran görüntüsü al 📸"); return; }
      var file = null; try { file = new File([blob], "sefin-odasi.png", { type: "image/png" }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        navigator.share({ files: [file], title: "Oda Döşe" }).then(function () { hint(""); }).catch(function () { hint(""); });
      } else {
        $("lbImg").src = dataUrl; $("lightbox").hidden = false; hint("Görsele basılı tutup kaydedebilirsin.");
      }
    });
  }
  $("rShare").onclick = share; $("ovShare").onclick = function () { $("over").hidden = true; share(); };
  $("lightbox").onclick = function () { this.hidden = true; };

  /* ---------- tek ekrana sığdır ---------- */
  function measure() {
    var wrap = svg.parentNode, cs = getComputedStyle(stageEl), bs = getComputedStyle(document.body), used = 0;
    used += (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) + (parseFloat(bs.paddingTop) || 0) + (parseFloat(bs.paddingBottom) || 0);
    var g = parseFloat(cs.rowGap || cs.gap); if (isNaN(g)) g = 10;
    var kids = stageEl.children, n = 0;
    for (var k = 0; k < kids.length; k++) { n++; if (kids[k] !== wrap) used += kids[k].offsetHeight; }
    used += g * (n - 1);
    var maxW = Math.min(stageEl.clientWidth, 440), maxH = Math.max(160, innerHeight - used);
    var w = Math.min(maxW, maxH * W / H);
    wrap.style.width = w + "px"; wrap.style.height = (w * H / W) + "px";
  }
  function refit() { measure(); }
  addEventListener("resize", refit); addEventListener("orientationchange", function () { setTimeout(refit, 250); });
  addEventListener("load", function () { setTimeout(refit, 300); });

  paintRoom(); render(); measure();
  hint(scene.items.length ? "Odan kaldığı gibi duruyor. Devam et 🛋️" : "Tepsiden parça seç, odaya yerleştir. Doğru cevap yok 🛋️");

  if (location.hash === "#test") window.__oda = { scene: function () { return scene; }, add: add, sel: function () { return sel; }, toPng: toPng };
})();
