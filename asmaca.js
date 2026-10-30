/* Adam Asmaca – iki kişilik, eş zamanlı (asmaca/mac, asmaca/seri). Ortak altyapı: duello.js. Kelimeler: yasak-kart.js listesinden.
   İki mod: "oto" → oyun kurulunca ikimize de aynı 5 kelime gelir (kısadan uzuna); "yaz" → herkes öbürüne 3 kelime (+ipucu) yazar
   (yazilan[uid] = uid'in YAZDIĞI, öbürü çözer; hazir[uid]), ikisi de yazınca herkes kendisine yazılanları çözer. Herkes kendi hızında çözer, kimse kimseyi beklemez; üstte iki tarafın
   ilerlemesi canlı görünür. Her kelimede 7 hak; ipucu almak 1 hak. Bulunan kelime 10 − hata puan (en az 4), asılırsa 0.
   İkimiz de bitirince puanlar karşılaştırılır (eşitse berabere).
   mac = { n, v, a, b, kelimeler: [gizli ×5], ipuclari: [gizli ×5], ilerleme: {uid: {i, t, ip, s: [{b, h, p, t, ip}]}}, sira: "",
           bitti, sonuc: "" | "puan" | "berabere" | "pes", kazanan, t }
   Herkes ilerleme içinde yalnızca kendi anahtarını yazar; ikinci bitiren sonucu yazar (kurallar: firestore-kurallar.txt, asmaca bölümü).
   Eski sürümün (birbirine kelime yazılan) yarım kalmış oyunu "Yeni sürüm" kartıyla yenisine çevrilir. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var HAK = 7, ADET_OTO = 5, ADET_YAZ = 3, ABC = "ERTYUIOPĞÜASDFGHJKLŞİZCVBNMÖÇ", SATIR = ["ERTYUIOPĞÜ", "ASDFGHJKLŞİ", "ZCVBNMÖÇ"];
  function buyut(s) { return String(s || "").toLocaleUpperCase("tr").replace(/Â/g, "A").replace(/Î/g, "İ").replace(/Û/g, "U"); }
  function buyukIlk(w) { w = String(w || ""); return w.charAt(0).toLocaleUpperCase("tr") + w.slice(1); }
  function harfSay(w) { return String(w).replace(/ /g, "").length; }
  /* kelime havuzu: Yasak Kelime kartları; klavyede olan harflerle yazılabilen, 4–14 harfliler. İpucu: kartın ilk yasak kelimesi */
  var HAVUZ = (window.YASAK_KART || []).map(function (k) { return [buyut(k[0]).replace(/\s+/g, " ").trim(), k[1] && k[1][0] ? buyukIlk(k[1][0]) : ""]; })
    .filter(function (x) { var h = x[0].replace(/ /g, ""); if (h.length < 4 || h.length > 14 || x[0].split(" ").length > 2) return false; for (var i = 0; i < h.length; i++) if (ABC.indexOf(h.charAt(i)) < 0) return false; return true; });
  function anahtar(n, i) { return "asmaca" + n + "-" + i; }
  function bosIlerleme() { return { i: 0, t: "", ip: false, s: [] }; }
  function kopya(o) { return JSON.parse(JSON.stringify(o)); }
  function duzelt(il) { il = il && typeof il === "object" ? il : bosIlerleme(); if (!(il.s instanceof Array)) il.s = []; il.t = String(il.t || ""); il.ip = !!il.ip; il.i = il.s.length; return il; }
  function karistir(a) { for (var j = a.length - 1; j > 0; j--) { var r = Math.floor(Math.random() * (j + 1)), x = a[j]; a[j] = a[r]; a[r] = x; } return a; }
  function kelimeSec(d) {
    var once = {}, gor = [], taze = [], eski = [];
    if (d && d.kelimeler && d.kelimeler.forEach) d.kelimeler.forEach(function (g, i) { once[D.coz(g, anahtar(d.n, i))] = 1; });
    try { gor = JSON.parse(localStorage.getItem("asmaca_gordum") || "[]"); } catch (e) {}
    if (!(gor instanceof Array)) gor = [];
    HAVUZ.forEach(function (x) { if (!once[x[0]]) (gor.indexOf(x[0]) < 0 ? taze : eski).push(x); });
    var sec = karistir(taze).concat(karistir(eski)).slice(0, ADET_OTO);
    var kel = sec.map(function (x) { return x[0]; }), max = Math.max(0, HAVUZ.length - 15);
    gor = gor.filter(function (w) { return kel.indexOf(w) < 0; }).concat(kel); if (gor.length > max) gor = gor.slice(gor.length - max);
    try { localStorage.setItem("asmaca_gordum", JSON.stringify(gor)); } catch (e) {}
    return sec.sort(function (a, b) { return harfSay(a[0]) - harfSay(b[0]); });   /* kısadan uzuna */
  }

  var D = window.Duello({
    kol: "asmaca", sayfa: "asmaca", sub: "sub", ses: "AmSes",
    startText: "İkimize de aynı 5 kelime geliyor; herkes kendi hızında çözüyor, kimse kimseyi beklemiyor. İkimiz de bitirince puanlar karşılaştırılıyor.",
    eskiMi: function (d) { return !!d && !d.ilerleme; },
    yeniDoc: function (d, ME, OTHER) {
      var n = (d && d.n || 0) + 1, il = {}, mod = modSec();
      il[ME] = bosIlerleme(); il[OTHER] = bosIlerleme();
      if (mod === "yaz") {
        var yz = {}, yi = {}, hz = {}; yz[ME] = []; yz[OTHER] = []; yi[ME] = []; yi[OTHER] = []; hz[ME] = false; hz[OTHER] = false;
        return { a: ME, b: OTHER, sira: "", mod: "yaz", adet: ADET_YAZ, ilerleme: il, kelimeler: [], ipuclari: [], yazilan: yz, yazIp: yi, hazir: hz };
      }
      var sec = kelimeSec(d);
      return { a: ME, b: OTHER, sira: "", mod: "oto", adet: ADET_OTO, ilerleme: il,
        kelimeler: sec.map(function (x, i) { return D.gizle(x[0], anahtar(n, i)); }),
        ipuclari: sec.map(function (x, i) { return D.gizle(x[1], anahtar(n, i) + "ip"); }) };
    },
    onMac: function (d, ilk) {
      var onceki = G; G = d;
      if (ilk || !ben) {
        kelimeleriCoz(d);
        ben = duzelt(kopya((d.ilerleme && d.ilerleme[D.me]) || bosIlerleme())); bakilan = ben.i; kirli = false; sonCizim = {}; sonKelime = null;
        if (ilk) yazTemizle();
      } else {
        if (d.mod === "yaz" && (!kelimeler.length || !onceki || !onceki.hazir || !onceki.hazir[D.other]) && d.hazir && d.hazir[D.other]) { kelimeleriCoz(d); snd("key"); D.msg((D.adlar[D.other] || "O") + " kelimelerini yazdı, çözebilirsin ✍️"); }
        var bulut = d.ilerleme && d.ilerleme[D.me];                       /* başka cihazdan ilerlediysem onu al */
        if (bulut && !kaydediyor && !kirli && adim(bulut) > adim(ben)) { ben = duzelt(kopya(bulut)); if (bakilan > ben.i) bakilan = ben.i; }
      }
      if (onceki && !ilk && D.other) {                                    /* onun ilerlemesi: kartında kısa bir parıltı */
        var eskiO = duzelt(onceki.ilerleme && onceki.ilerleme[D.other]), yeniO = duzelt(d.ilerleme && d.ilerleme[D.other]);
        if (yeniO.s.length > eskiO.s.length) { var p = $("pOther"); p.classList.remove("parla"); void p.offsetWidth; p.classList.add("parla"); }
      }
      ciz();
    },
    onYok: function () { G = null; ben = null; ["score", "oyun", "ozet"].forEach(function (id) { $(id).hidden = true; }); $("bResign").hidden = true; },
    bitis: function (d) {
      var ME = D.me, OTHER = D.other, ad = D.adlar[OTHER] || "Rakip", pm = toplam(d, ME), po = toplam(d, OTHER), kazandim = d.kazanan === ME;
      var baslik = d.sonuc === "pes" ? (kazandim ? ad + " pes etti — kazandın" : "Pes ettin")
        : d.sonuc === "berabere" ? "Berabere! " + pm + " – " + po
        : kazandim ? "Kazandın! " + pm + " – " + po + " 🤍" : ad + " kazandı · " + po + " – " + pm;
      var bm = bulunan(ilOf(ME)), bo = bulunan(ilOf(OTHER));
      var metin = d.sonuc === "pes" ? "Kelimeler açıldı." : adet() + " kelimenin " + bm + " tanesini sen, " + bo + " tanesini " + ad + " buldu.";
      return { kick: "Oyun " + d.n + " bitti", baslik: baslik, metin: metin, ek: '<table class="amtablo">' + tabloIc() + "</table>" };
    },
    bitisGecikme: function () { return bakilan < (ben ? ben.i : 0) ? 1700 : 300; },   /* son kelimenin sonucu bir an görünsün */
    seriKod: function (d) { return d.sonuc === "pes" ? 99 : d.kazanan ? Math.min(98, toplam(d, d.kazanan)) : 0; },
    helpKey: "asmaca_help2"
  });
  var G = null, ben = null, bakilan = 0, kelimeler = [], ipuclari = [], kirli = false, kaydediyor = false, sonCizim = {}, sonKelime = null, sonIpHtml = "";
  function adet() { return (G && G.adet) || ADET_OTO; }
  function ekE(ad) { var k = String(ad).toLocaleLowerCase("tr"), v = k.match(/[aeıioöuü](?=[^aeıioöuü]*$)/), on = v && "eiöü".indexOf(v[0]) >= 0; return ad + "'" + (/[aeıioöuü]$/.test(k) ? "y" : "") + (on ? "e" : "a"); }   /* Büşra'ya, Yunus'a */
  function yazAnahtar(n, i, yazan) { return anahtar(n, i) + "-" + yazan; }
  function kelimeleriCoz(d) {                                                /* bana düşen kelimeler: oto → ortak liste, yaz → onun yazdıkları */
    if (d.mod === "yaz") {
      var y = (d.yazilan && d.yazilan[D.other]) || [], yi = (d.yazIp && d.yazIp[D.other]) || [];
      kelimeler = y.map(function (g, i) { return D.coz(g, yazAnahtar(d.n, i, D.other)); });
      ipuclari = yi.map(function (g, i) { return D.coz(g, yazAnahtar(d.n, i, D.other) + "ip"); });
    } else {
      kelimeler = (d.kelimeler || []).map(function (g, i) { return D.coz(g, anahtar(d.n, i)); });
      ipuclari = (d.ipuclari || []).map(function (g, i) { return D.coz(g, anahtar(d.n, i) + "ip"); });
    }
  }
  function benimYazdiklarim() { if (!G || G.mod !== "yaz") return []; return ((G.yazilan && G.yazilan[D.me]) || []).map(function (g, i) { return D.coz(g, yazAnahtar(G.n, i, D.me)); }); }
  /* mod seçimi (başlangıç ve bitiş kartlarındaki düğmeler; son seçim hatırlanır) */
  function modSec() { var m = "oto"; try { m = localStorage.getItem("asmaca_mod") === "yaz" ? "yaz" : "oto"; } catch (e) {} return m; }
  function modYaz() {
    var m = modSec();
    ["startSec", "doneSec"].forEach(function (id) { var el = $(id); if (!el) return; [].forEach.call(el.querySelectorAll("button"), function (b) { b.classList.toggle("on", b.getAttribute("data-mod") === m); }); });
    var st = $("startText"); if (st && D.other) st.textContent = m === "yaz" ? "Herkes öbürüne 3 kelime yazıyor (istersen ipucuyla), sonra herkes kendisine yazılanları kendi hızında çözüyor." : "İkimize de aynı 5 kelime geliyor; herkes kendi hızında çözüyor, kimse kimseyi beklemiyor. İkimiz de bitirince puanlar karşılaştırılıyor.";
  }
  ["startSec", "doneSec"].forEach(function (id) { var el = $(id); if (el) el.addEventListener("click", function (e) { var b = e.target.closest ? e.target.closest("button[data-mod]") : null; if (!b) return; try { localStorage.setItem("asmaca_mod", b.getAttribute("data-mod")); } catch (x) {} snd("key"); modYaz(); }); });
  modYaz(); setInterval(modYaz, 1500);
  function snd(n) { if (window.AmSes) try { window.AmSes.play(n); } catch (e) {} }
  function hataT(w, t) { var n = 0; for (var i = 0; i < t.length; i++) if (w.indexOf(t.charAt(i)) < 0) n++; return n; }
  function buldu(w, t) { if (!w) return false; for (var i = 0; i < w.length; i++) { var c = w.charAt(i); if (c !== " " && t.indexOf(c) < 0) return false; } return true; }
  function puanOf(b, h) { return b ? Math.max(4, 10 - h) : 0; }
  function toplamIl(il) { var p = 0; ((il && il.s) || []).forEach(function (x) { p += +x.p || 0; }); return p; }
  function bulunan(il) { var n = 0; ((il && il.s) || []).forEach(function (x) { if (x.b) n++; }); return n; }
  function ilOf(uid) { return uid === D.me && ben ? ben : duzelt(G && G.ilerleme && G.ilerleme[uid]); }
  function toplam(d, uid) { return toplamIl(d === G ? ilOf(uid) : duzelt(d && d.ilerleme && d.ilerleme[uid])); }
  function adim(il) { il = duzelt(il); return il.s.length * 1000 + il.t.length * 2 + (il.ip ? 1 : 0); }

  function asama() {                                                       /* kur | yaz | bekle | coz | arada (kelime bitti, sonrakine geçilecek) | bitirdim | bitti */
    if (!G || !ben) return "kur";
    if (G.bitti && !(bakilan < ben.i && bakilan < adet())) return "bitti";
    if (G.mod === "yaz") { if (!G.hazir || !G.hazir[D.me]) return "yaz"; if (!G.hazir[D.other]) return "bekle"; }
    if (bakilan < ben.i && bakilan < adet()) return "arada";
    if (G.bitti) return "bitti";
    if (ben.i >= adet()) return "bitirdim";
    return "coz";
  }
  /* ---- "biz yazalım": kelime girişi ---- */
  function temizKelime(v) { return buyut(v).replace(/[^A-ZÇĞİÖŞÜ ]/g, "").replace(/[QWX]/g, "").replace(/\s+/g, " ").replace(/^ /, ""); }
  function gecerli(w) { var t = w.trim(), h = t.replace(/ /g, "").length; if (!t) return "boş"; if (h < 3) return "en az 3 harf"; if (h > 14) return "en çok 14 harf"; if (t.split(" ").length > 2) return "en çok 2 kelime"; for (var i = 0; i < h; i++) if (ABC.indexOf(t.replace(/ /g, "").charAt(i)) < 0) return "sadece harf"; return ""; }
  var yazKutu = [];
  (function () {
    var l = $("yazListe"); if (!l) return;
    for (var i = 0; i < ADET_YAZ; i++) {
      var r = document.createElement("div"); r.className = "amyazsatir";
      r.innerHTML = '<span class="amno">' + (i + 1) + '</span><div class="amyazkutu"><input type="text" class="aminput kelime" maxlength="16" autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" placeholder="KELİME"><input type="text" class="aminput ipucu" maxlength="36" autocomplete="off" placeholder="İpucu (isteğe bağlı)"></div>';
      l.appendChild(r); yazKutu.push({ k: r.querySelector(".kelime"), i: r.querySelector(".ipucu") });
    }
    yazKutu.forEach(function (q, i) {
      q.k.addEventListener("input", function () { var p = q.k.selectionStart, v = temizKelime(q.k.value); if (v !== q.k.value) { q.k.value = v; try { q.k.setSelectionRange(p, p); } catch (e) {} } yazKontrol(); });
      q.k.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); q.i.focus(); } });
      q.i.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); if (i + 1 < yazKutu.length) yazKutu[i + 1].k.focus(); else $("bKilit").click(); } });
    });
  })();
  var gonderiyor = false;
  function yazKontrol() {
    var hata = "", say = 0, gorulen = {};
    yazKutu.forEach(function (q, i) { var v = q.k.value.trim(), e = v ? gecerli(v) : "boş"; if (v && e) hata = hata || (i + 1) + ". kelime: " + e; if (v && !e) { if (gorulen[v]) hata = hata || "aynı kelimeyi iki kez yazdın"; gorulen[v] = 1; say++; } });
    var tamam = !hata && say === ADET_YAZ;
    $("bKilit").disabled = !tamam || gonderiyor;
    $("yazNot").textContent = hata || (tamam ? "Hazır. Gönderince " + (D.adlar[D.other] || "o") + " bunları çözmeye başlar." : "Her kelime 3–14 harf, en çok 2 kelime. İpucu isteğe bağlı.");
    $("yazNot").className = "amnot" + (hata ? " uyari" : "");
  }
  function yazTemizle() { yazKutu.forEach(function (q) { q.k.value = ""; q.i.value = ""; }); if (yazKutu.length) yazKontrol(); }
  if ($("bKilit")) $("bKilit").onclick = function () {
    if (asama() !== "yaz" || gonderiyor) return;
    var kel = yazKutu.map(function (q) { return q.k.value.trim(); }), ip = yazKutu.map(function (q) { return q.i.value.trim().slice(0, 36); });
    for (var i = 0; i < kel.length; i++) if (gecerli(kel[i])) { yazKontrol(); return; }
    gonderiyor = true; yazKontrol();
    var ME = D.me, n = G.n;
    D.db.runTransaction(function (tx) {
      return tx.get(D.ref).then(function (snap) {
        var d = snap.data(); if (!d || d.bitti || d.n !== n || d.mod !== "yaz") throw new Error("oyun");
        var upd = { yazilan: {}, yazIp: {}, hazir: {}, v: (d.v || 0) + 1, t: firebase.firestore.FieldValue.serverTimestamp() };
        upd.yazilan[ME] = kel.map(function (w, i) { return D.gizle(w, yazAnahtar(n, i, ME)); });
        upd.yazIp[ME] = ip.map(function (w, i) { return D.gizle(w, yazAnahtar(n, i, ME) + "ip"); });
        upd.hazir[ME] = true;
        tx.set(D.ref, upd, { merge: true });
      });
    }).then(function () { gonderiyor = false; snd("found"); D.msg("Kelimelerin gönderildi 🤫"); yazKutu.forEach(function (q) { try { q.k.blur(); q.i.blur(); } catch (e) {} }); })
      .catch(function () { gonderiyor = false; yazKontrol(); D.msg("Gönderilemedi, tekrar dene."); });
  };

  /* ---- klavye ---- */
  var klavye = $("klavye"), TUS = {};
  SATIR.forEach(function (sat) {
    var r = document.createElement("div"); r.className = "amsatir";
    sat.split("").forEach(function (h) { var b = document.createElement("button"); b.type = "button"; b.className = "amk"; b.textContent = h; b.setAttribute("data-h", h); r.appendChild(b); TUS[h] = b; });
    klavye.appendChild(r);
  });
  klavye.addEventListener("click", function (e) { var b = e.target && e.target.closest ? e.target.closest("button.amk") : null; if (!b || b.disabled) return; tahmin(b.getAttribute("data-h")); });
  addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var a = asama();
    if (a === "arada" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); sonraki(); return; }
    if (a !== "coz") return;
    var h = buyut(e.key); if (h.length === 1 && ABC.indexOf(h) >= 0) { e.preventDefault(); tahmin(h); }
  });

  /* ---- oynanış ---- */
  function tahmin(h) {
    if (asama() !== "coz") return;
    var w = kelimeler[ben.i]; if (!w || ben.t.indexOf(h) >= 0) return;
    ben.t += h;
    var dogru = w.indexOf(h) >= 0, hn = hataT(w, ben.t) + (ben.ip ? 1 : 0), son = buldu(w, ben.t) ? "buldu" : hn >= HAK ? "asildi" : "";
    snd(son === "buldu" ? "found" : son === "asildi" ? "hang" : dogru ? "hit" : "miss");
    if (son === "buldu") D.msg("Buldun! +" + puanOf(true, hn) + " puan");
    else if (son === "asildi") D.msg("Adam asıldı…");
    else if (dogru) { var say = 0; for (var i = 0; i < w.length; i++) if (w.charAt(i) === h) say++; D.msg(say > 1 ? h + " · " + say + " tane 👀" : "Var! " + h); }
    else D.msg(h + " yok · " + (HAK - hn) + " hak kaldı");
    if (son) kelimeBitir(son === "buldu", hn);
    ciz(); kaydet();
  }
  function kelimeBitir(b, hn) {
    ben.s = ben.s.concat([{ b: b ? 1 : 0, h: hn, p: puanOf(b, hn), t: ben.t, ip: !!ben.ip }]);
    ben.i = ben.s.length; ben.t = ""; ben.ip = false;
  }
  function ipucuAl() {
    if (asama() !== "coz" || ben.ip) return;
    var w = kelimeler[ben.i], hn = hataT(w, ben.t);
    if (HAK - hn <= 1) return;                                              /* son hakla ipucu alınmaz, adam asılmasın */
    ben.ip = true; snd("key"); D.msg("İpucu açıldı · " + (HAK - hn - 1) + " hak kaldı");
    ciz(); kaydet();
  }
  function sonraki() {
    if (asama() !== "arada") return;
    bakilan++; snd("key"); $("msg").textContent = ""; ciz();
  }
  $("ipucu").addEventListener("click", function (e) { var b = e.target && e.target.closest ? e.target.closest("#bIpucu") : null; if (b && !b.disabled) ipucuAl(); });
  $("bSonraki").onclick = sonraki;
  $("bYeni").onclick = function () { D.yeniOyun(); };

  /* ---- kayıt: kendi ilerlememi yazarım; ikimiz de bitirdiysek sonucu da ---- */
  function kaydet() {
    if (!G || !ben) return;
    if (kaydediyor) { kirli = true; return; }
    kaydediyor = true; kirli = false;
    var ME = D.me, OTHER = D.other, n = G.n, yolla = kopya(ben), bitirdi = false;
    D.db.runTransaction(function (tx) {
      return tx.get(D.ref).then(function (snap) {
        var d = snap.data(); if (!d || d.bitti || d.n !== n || !d.ilerleme) throw new Error("oyun");
        var upd = { ilerleme: {}, v: (d.v || 0) + 1, t: firebase.firestore.FieldValue.serverTimestamp() }; upd.ilerleme[ME] = yolla;
        var o = duzelt(d.ilerleme[OTHER]);
        var ad = d.adet || ADET_OTO;
        if (yolla.i >= ad && o.i >= ad) {                               /* ikimiz de bitirdik: sonuç */
          bitirdi = true; upd.bitti = true;
          var pm = toplamIl(yolla), po = toplamIl(o);
          if (pm === po) { upd.sonuc = "berabere"; upd.kazanan = null; } else { upd.sonuc = "puan"; upd.kazanan = pm > po ? ME : OTHER; }
        }
        tx.set(D.ref, upd, { merge: true });
      });
    }).then(function () {
      kaydediyor = false; if (bitirdi) D.bitirenBenim = true;
      if (kirli) kaydet();
    }).catch(function (e) {
      kaydediyor = false;
      if (e && e.message === "oyun") { kirli = false; return; }
      setTimeout(function () { if (G && !G.bitti && G.n === n) kaydet(); }, 1500);   /* bağlantı koptuysa sessizce yeniden dene */
    });
  }

  /* ---- çizim ---- */
  function esc(s) { return D.esc(s); }
  function cizimGuncelle(hn, durum, k) {
    var svg = $("cizim"), parcalar = svg.querySelectorAll(".pp"), once = sonCizim[k];
    for (var i = 0; i < parcalar.length; i++) {
      var on = i < hn, el = parcalar[i];
      if (on && !el.classList.contains("on")) { el.classList.add("on"); if (once !== undefined && i >= once) el.classList.add("taze"); else el.classList.remove("taze"); }
      else if (!on) el.classList.remove("on", "taze");
    }
    sonCizim = {}; sonCizim[k] = hn;
    svg.setAttribute("class", "amcizim" + (durum === "buldu" ? " kurtuldu" : durum === "asildi" ? " asildi" : "") + (hn >= 2 ? " basli" : ""));
    var hak = ""; for (var j = 0; j < HAK; j++) hak += '<i class="' + (j < hn ? "gitti" : "") + '"></i>';
    $("hak").innerHTML = hak;
  }
  function kelimeCiz(k, w, t, acikGoster, durum) {
    var onceT = sonKelime && sonKelime.k === k && sonKelime.n === G.n ? sonKelime.t : null, h = "";
    w.split(" ").forEach(function (kel) {
      h += '<span class="amgrup">';
      for (var i = 0; i < kel.length; i++) {
        var c = kel.charAt(i), ac = t.indexOf(c) >= 0, taze = ac && onceT !== null && onceT.indexOf(c) < 0;
        h += '<span class="amharf' + (ac ? " acik" : acikGoster ? " sadece" : "") + (taze ? " taze" : "") + (durum === "asildi" && !ac ? " kacan" : "") + '"><b>' + (ac || acikGoster ? esc(c) : "") + "</b></span>";
      }
      h += "</span>";
    });
    $("kelime").innerHTML = h;
    sonKelime = { k: k, n: G.n, t: t };
    var uzun = harfSay(w);
    $("kelime").className = "amkelime" + (uzun > 11 ? " cokuzun" : uzun > 8 ? " uzun" : "");
  }
  function nokCiz(el, il) {
    il = duzelt(il); var h = "";
    for (var k = 0; k < adet(); k++) { var x = il.s[k]; h += '<i class="' + (x ? (x.b ? "ok" : "no") : k === il.i ? "su" : "") + '"></i>'; }
    if (el.innerHTML !== h) el.innerHTML = h;
  }
  function hucre(il, k) {
    var x = il.s[k];
    if (!x) return '<td class="bek">' + (k === il.i ? "çözüyor" : "…") + "</td>";
    return x.b ? '<td class="ok">✓ <b>' + x.p + "</b><small>" + (x.h ? x.h + " hata" : "hatasız") + "</small></td>" : '<td class="no">✗ <b>0</b><small>asıldı</small></td>';
  }
  function tabloIc() {
    var me = ilOf(D.me), ot = ilOf(D.other), h = "<thead><tr><th></th><th>" + esc(D.adlar[D.me] || "Sen") + "</th><th>" + esc(D.adlar[D.other] || "O") + "</th></tr></thead><tbody>";
    var benimki = benimYazdiklarim();
    for (var k = 0; k < adet(); k++) h += '<tr><td class="kel">' + esc(kelimeler[k] || "?") + (benimki.length ? '<small class="amonun">' + esc(benimki[k] || "?") + "</small>" : "") + "</td>" + hucre(me, k) + hucre(ot, k) + "</tr>";
    return h + "</tbody><tfoot><tr><td>Toplam</td><td>" + toplamIl(me) + "</td><td>" + toplamIl(ot) + "</td></tr></tfoot>";
  }

  function ciz() {
    if (!G || !ben) return;
    var a = asama(), ME = D.me, OTHER = D.other, ot = ilOf(OTHER), adO = D.adlar[OTHER] || "O";
    $("score").hidden = false;
    nokCiz($("nokMe"), ben); nokCiz($("nokOther"), ot);
    $("puanMe").textContent = toplamIl(ben); $("puanOther").textContent = toplamIl(ot);
    $("pMe").className = "hdp" + (a === "coz" || a === "arada" ? " on" : "");
    $("pOther").classList.toggle("on", !G.bitti && ot.i < adet());
    var oyunda = a === "coz" || a === "arada";
    $("oyun").hidden = !oyunda; $("ozet").hidden = oyunda || a === "yaz" || a === "bekle";
    $("yaz").hidden = a !== "yaz"; $("bekle").hidden = a !== "bekle";
    $("bResign").hidden = !(oyunda || a === "yaz" || a === "bekle") || !!G.bitti;
    if (a === "yaz") { $("yazBaslik").textContent = (D.adlar[OTHER] ? ekE(D.adlar[OTHER]) : "Ona") + " " + ADET_YAZ + " kelime yaz ✍️"; yazKontrol(); return; }
    if (a === "bekle") {
      $("bekleNot").textContent = adO + " sana kelimelerini yazıyor… o gönderince burada çözmeye başlarsın.";
      $("bekleListe").innerHTML = benimYazdiklarim().map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("");
      return;
    }
    if (oyunda) {
      var k = a === "arada" ? bakilan : ben.i, w = kelimeler[k] || "", kay = a === "arada" ? ben.s[k] : ben, t = kay.t || "", ip = !!kay.ip;
      var hn = hataT(w, t) + (ip ? 1 : 0), dur = a === "arada" ? (kay.b ? "buldu" : "asildi") : "";
      $("kelNo").textContent = "Kelime " + (k + 1) + "/" + adet();
      cizimGuncelle(Math.min(HAK, hn), dur, k);
      kelimeCiz(k, w, t, dur === "asildi", dur);
      var ipH = ip ? "<span>İpucu</span> " + esc(ipuclari[k] || "—")
        : a === "coz" && ipuclari[k] ? '<button type="button" class="amipbtn" id="bIpucu"' + (HAK - hn <= 1 ? " disabled" : "") + ">💡 İpucu al <small>1 hak</small></button>" : "";
      if (ipH !== sonIpHtml) { $("ipucu").innerHTML = ipH; sonIpHtml = ipH; }
      var yan = ""; for (var i = 0; i < t.length; i++) if (w.indexOf(t.charAt(i)) < 0) yan += t.charAt(i) + " ";
      $("yanlis").textContent = yan ? "Olmayanlar: " + yan.trim() : "";
      $("sonuc").hidden = a !== "arada";
      if (a === "arada") { $("sonuc").className = "amsonuc " + dur; $("sonuc").innerHTML = kay.b ? "Buldun! <b>+" + kay.p + "</b>" : "Asıldı… <b>0</b>"; }
      klavye.hidden = a !== "coz"; $("bSonraki").hidden = a !== "arada";
      $("bSonraki").textContent = k + 1 >= adet() ? "Sonuçları gör" : "Sonraki kelime →";
      ABC.split("").forEach(function (h) {
        var b = TUS[h], denendi = t.indexOf(h) >= 0, cls = "amk" + (denendi ? (w.indexOf(h) >= 0 ? " dogru" : " yanlis") : "");
        if (b.className !== cls) b.className = cls; b.disabled = a !== "coz" || denendi;
      });
    } else {
      var bitti = a === "bitti", pm = toplamIl(ben), po = toplamIl(ot);
      $("ozBaslik").textContent = !bitti ? "Bitirdin! 🎉" : G.sonuc === "pes" ? (G.kazanan === ME ? adO + " pes etti" : "Pes ettin") : G.kazanan === ME ? "Kazandın! 🤍" : G.kazanan ? adO + " kazandı" : "Berabere!";
      $("ozPuan").innerHTML = bitti && G.sonuc !== "pes" ? pm + " <i>–</i> " + po : pm + " <small>puan</small>";
      $("ozNot").textContent = bitti ? (G.sonuc === "pes" ? "Kelimeler açıldı." : G.mod === "yaz" ? "Yeni oyunda yine birbirinize yazarsınız." : "Yeni oyunda yine ikinize aynı kelimeler gelir.") : ot.i >= adet() ? "Sonuç hesaplanıyor…" : G.mod === "yaz" && !(G.hazir && G.hazir[OTHER]) ? adO + " henüz kelimelerini yazmadı; o da bitirince sonuç burada çıkacak." : adO + " şu an " + (ot.i + 1) + ". kelimede; o da bitirince sonuç burada çıkacak.";
      $("ozTablo").innerHTML = tabloIc();
      $("bYeni").hidden = !bitti;
    }
  }

  $("bResign").onclick = function () { if (!G || G.bitti) return; $("confirm").hidden = false; };
  $("confirmNo").onclick = function () { $("confirm").hidden = true; };
  $("confirmYes").onclick = function () {
    $("confirm").hidden = true; if (!G || G.bitti) return; D.bitirenBenim = true;
    D.ref.set({ bitti: true, sonuc: "pes", kazanan: D.other, sira: "", v: (G.v || 0) + 1, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () { D.bitirenBenim = false; D.msg("Olmadı, tekrar dene."); });
  };
  if (location.hash === "#test") window.__am = {
    state: function () { return { G: G, me: D.me, other: D.other, asama: asama(), ben: ben, bakilan: bakilan, kelimeler: kelimeler, ipuclari: ipuclari, havuz: HAVUZ.length, mod: modSec() }; },
    tahmin: tahmin, ipucu: ipucuAl, sonraki: sonraki, yeni: D.yeniOyun,
    yaz: function (kel, ip) { yazKutu.forEach(function (q, i) { q.k.value = temizKelime(kel[i] || ""); q.i.value = (ip && ip[i]) || ""; }); yazKontrol(); $("bKilit").click(); }, temiz: temizKelime
  };
})();
