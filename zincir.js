/* Kelime Zinciri – iki kişilik (zincir/mac, zincir/seri). Ortak altyapı: duello.js. Hazır zincirler: zincir-kelime.js
   İki mod:
   • "yaz" (biz yazalım): ikimiz de birbirimize bir zincir yazarız (başlangıç + 5–6 kelime). Herkes ötekinin yazdığı zinciri çözer.
       mac = { mod: "yaz", yer: {uid: karıştırılmış zincir JSON}, hazir: {uid: bool}, cz: {çözen uid: {acik: [], coz: [], k, bitti}}, puan: {uid}, sira, son, … }
       Sıra: bilen devam eder; bilemeyen (ya da pas diyen) kendi çözdüğü kelimenin bir harfini açar, sıra karşıya geçer. Zincirini bitiren bekler, öbürü kendi başına bitirir.
   • "hazir": ikimiz aynı hazır zinciri sırayla çözeriz. mac = { mod: "hazir", z, gecmis, acik: [], coz: [], k, puan, sira, son, … }
   Puan: bilinen kelimede kapalı kalan harf sayısı. Bütün harfleri açılan kelime puansız geçilir. Sonunda puanı çok olan kazanır. */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var Z = window.ZINCIRLER || [];
  function buyuk(s) { return String(s || "").toLocaleUpperCase("tr-TR").replace(/[^A-ZÇĞİÖŞÜ]/g, ""); }
  function harfler(w) { return Array.from ? Array.from(w) : w.split(""); }
  function kur(words) { var acik = [], coz = []; words.forEach(function (w, i) { acik.push(i === 0 ? harfler(w).length : 1); coz.push(i === 0 ? "-" : ""); }); return { acik: acik, coz: coz, k: 1, bitti: false }; }
  var seciliMod = "yaz"; try { seciliMod = localStorage.getItem("zc_mod") === "hazir" ? "hazir" : "yaz"; } catch (e) {}
  var MOD_NOT = { yaz: "İkimiz de birbirimize bir zincir yazarız; herkes ötekinin zincirini çözer.", hazir: "Hazır bir zinciri ikimiz sırayla çözeriz." };
  var D = window.Duello({
    kol: "zincir", sayfa: "zincir", sub: "sub", ses: "SdSes", helpKey: "zincir_help",
    startText: "Üstteki kelime açık; altındakiler bir öncekiyle anlamlı bir ikili kurar ama yalnız ilk harfleri görünür. Bilen devam eder, bilemeyince bir harf açılır, sıra geçer.",
    yeniDoc: function (d, ME, OTHER) {
      var baslayan = d && d.baslayan ? (d.baslayan === ME ? OTHER : ME) : ME, gecmis = (d && d.gecmis) || [], puan = {}, i;
      puan[ME] = 0; puan[OTHER] = 0;
      if (seciliMod === "yaz") {
        var yer = {}, hazir = {}; yer[ME] = ""; yer[OTHER] = ""; hazir[ME] = false; hazir[OTHER] = false;
        return { a: ME, b: OTHER, baslayan: baslayan, mod: "yaz", gecmis: gecmis, yer: yer, hazir: hazir, cz: {}, puan: puan, sira: "", son: null };
      }
      var adaylar = []; for (i = 0; i < Z.length; i++) if (gecmis.indexOf(i) < 0) adaylar.push(i);
      if (!adaylar.length) { adaylar = []; for (i = 0; i < Z.length; i++) if (i !== (d && d.z)) adaylar.push(i); gecmis = []; }
      var z = adaylar[Math.floor(Math.random() * adaylar.length)], st = kur(Z[z]);
      return { a: ME, b: OTHER, baslayan: baslayan, mod: "hazir", z: z, gecmis: gecmis.concat([z]).slice(-Math.max(1, Z.length - 3)), acik: st.acik, coz: st.coz, k: 1, puan: puan, sira: baslayan, son: null };
    },
    onMac: function (d, ilk) { macGeldi(d, ilk); },
    onYok: function () { G = null; $("score").hidden = true; $("alan").hidden = true; $("klavye").hidden = true; $("yazForm").hidden = true; $("bResign").hidden = true; },
    bitisGecikme: 900,
    bitis: function (d) {
      var ME = D.me, OTHER = D.other, ad = D.adlar[OTHER] || "Rakip", pm = (d.puan || {})[ME] || 0, po = (d.puan || {})[OTHER] || 0, kazandim = d.kazanan === ME;
      var baslik = d.sonuc === "pes" ? (kazandim ? ad + " pes etti — kazandın" : "Pes ettin") : !d.kazanan ? "Berabere! " + pm + "–" + po : kazandim ? "Kazandın! " + pm + "–" + po : ad + " kazandı " + po + "–" + pm;
      var metin;
      if (d.mod === "yaz") { var o = zincirOf(d, OTHER), m = zincirOf(d, ME); metin = (o ? D.ekIn(ad) + " zinciri: " + o.join(" → ") + ". " : "") + (m ? "Seninki: " + m.join(" → ") + ". " : ""); }
      else metin = (Z[d.z] || []).join(" → ") + ". ";
      return { kick: "Oyun " + d.n + " · zincir bitti", baslik: baslik, metin: metin + "Yeni oyunda ilk tahmin " + (d.baslayan === ME ? D.ekIn(ad) : "senin") + "." };
    },
    seriKod: function (d) { return d.sonuc === "pes" ? 99 : Math.min(98, ((d.puan || {})[d.kazanan] || 0)); }
  });
  var G = null, kaydirilan = "", yazilan = [], gonderiyor = false, sonGosterilen = "", gorunen = "ben";
  function snd(n) { if (window.SdSes) try { window.SdSes.play(n); } catch (e) {} }
  function renk(uid) { var k = uid === D.me ? ((window.Hesap && Hesap.kim()) || {}).kul : D.kul[uid]; return k === "a" ? "a" : "b"; }
  /* yazanın zinciri (yalnız bu cihazda çözülür) */
  function zincirOf(d, yazan) { if (!d || !d.yer || !d.yer[yazan]) return null; try { var j = JSON.parse(D.coz(d.yer[yazan], "zincir" + d.n + yazan)); return j && j.length >= 2 ? j : null; } catch (e) { return null; } }
  /* tahta: { words, acik, coz, k, bitti, cozen } — "ben": benim çözdüğüm, "o": onun çözdüğü (benim yazdığım) */
  function tahta(d, kim) {
    if (!d) return null;
    if (d.mod !== "yaz") return { words: Z[d.z] || [], acik: d.acik || [], coz: d.coz || [], k: d.k, bitti: !!d.bitti, ortak: true };
    var cozen = kim === "ben" ? D.me : D.other, yazan = kim === "ben" ? D.other : D.me, w = zincirOf(d, yazan), st = (d.cz || {})[cozen];
    if (!w || !st) return null;
    return { words: w, acik: st.acik || [], coz: st.coz || [], k: st.k, bitti: !!st.bitti || !!d.bitti, cozen: cozen };
  }
  function asama() { if (!G) return "kur"; if (G.bitti) return "bitti"; if (G.mod !== "yaz") return "oyun"; if (!G.hazir || !G.hazir[D.me]) return "yaz"; if (!G.hazir[D.other]) return "bekle"; return "oyun"; }
  function benimTahta() { return tahta(G, "ben"); }
  function kapali(T) { return T ? harfler(T.words[T.k] || "").length - (T.acik[T.k] || 0) : 0; }
  function siraBende() { return G && !G.bitti && asama() === "oyun" && G.sira === D.me && !gonderiyor; }

  /* ---- çizim ---- */
  function boyut(T) {
    var en = 1; ((T && T.words) || []).forEach(function (w) { en = Math.max(en, harfler(w).length); });
    var w = Math.min($("alan").clientWidth || 360, 520) - 70, k = Math.floor(Math.min(42, Math.max(20, (w - (en - 1) * 4) / en)));
    document.documentElement.style.setProperty("--zc-k", k + "px");
  }
  function tahtaHTML(T, benimSira, hepsi) {
    var html = "";
    T.words.forEach(function (w, i) {
      var L = harfler(w), ac = T.acik[i] || 0, kim = T.coz[i] || "", sinif = "zcsat", rozet = "";
      var cozuldu = i === 0 || kim === "x" || (kim && kim !== "-") || ac >= L.length;
      if (i === 0) sinif += " bas";
      else if (kim === "x") { sinif += " acildi"; rozet = '<i class="zcroz x">açıldı</i>'; }
      else if (kim) { sinif += " cozuldu " + renk(kim); rozet = '<i class="zcroz">' + (kim === D.me ? "sen" : (D.adlar[kim] || "o")) + "</i>"; }
      else if (i === T.k && !T.bitti) sinif += " simdi" + (benimSira ? " benim" : "");
      else sinif += " sonra";
      var kutular = L.map(function (h, j) {
        var g = cozuldu || j < ac, y = !g && i === T.k && !T.bitti && benimSira ? yazilan[j - ac] : "", goster = (G.bitti || hepsi) && !g;
        return '<span class="zch' + (g ? " acik" : y ? " yazi" : "") + (goster ? " bitis" : "") + '">' + (g ? h : y || (goster ? h : "")) + "</span>";
      }).join("");
      html += (i ? '<div class="zcbag" aria-hidden="true"><i></i></div>' : "") + '<div class="' + sinif + '" data-i="' + i + '"><div class="zckel">' + kutular + "</div>" + rozet + "</div>";
    });
    return html;
  }
  function ilerleme(T) { if (!T) return ""; var n = T.words.length - 1, c = 0; for (var i = 1; i < T.words.length; i++) if (T.coz[i]) c++; return c + "/" + n; }
  function ciz() {
    if (!G) return;
    var ME = D.me, OTHER = D.other, a = asama(), adO = D.adlar[OTHER] || "Rakip";
    $("score").hidden = false;
    $("yazForm").hidden = a !== "yaz";
    var bT = tahta(G, "ben"), oT = G.mod === "yaz" ? tahta(G, "o") : null;
    /* sekmeler: kendi çözdüğüm / onun benim zincirimdeki durumu */
    var sekmeVar = G.mod === "yaz" && (a === "oyun" || a === "bitti" || a === "bekle");
    $("sekme").hidden = !sekmeVar;
    if (a === "bekle") gorunen = "o";
    if (sekmeVar) {
      $("sekBen").innerHTML = D.ekIn(adO) + " zinciri <small>" + (bT ? "sen çözüyorsun · " + ilerleme(bT) : "yazılıyor…") + "</small>";
      $("sekO").innerHTML = "Senin zincirin <small>" + (oT ? adO + " · " + ilerleme(oT) : "") + "</small>";
      $("sekBen").classList.toggle("on", gorunen === "ben"); $("sekO").classList.toggle("on", gorunen === "o");
      $("sekBen").disabled = a === "bekle";
    }
    var T = G.mod === "yaz" && gorunen === "o" ? oT : bT, benimSira = siraBende() && T === bT;
    $("alan").hidden = !(a === "oyun" || a === "bitti" || a === "bekle") || !T;
    if (T) {
      boyut(T);
      var html = tahtaHTML(T, benimSira, G.mod === "yaz" && T === oT);
      if ($("zincir").getAttribute("data-h") !== html) {
        $("zincir").innerHTML = html; $("zincir").setAttribute("data-h", html);
        var cur = $("zincir").querySelector(".simdi"), anah = G.n + ":" + gorunen + ":" + T.k;
        if (cur && cur.scrollIntoView && kaydirilan !== anah) try { kaydirilan = anah; cur.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) { cur.scrollIntoView(false); }
      }
    }
    $("bekleNot").hidden = a !== "bekle";
    /* skor ve sıra */
    $("skorMe").textContent = (G.puan || {})[ME] || 0; $("skorOther").textContent = (G.puan || {})[OTHER] || 0;
    if (a === "bitti") { $("turnTxt").textContent = G.kazanan === ME ? "Kazandın" : G.kazanan ? "Kaybettin" : "Berabere"; $("turnSub").textContent = "zincir bitti"; }
    else if (a === "yaz") { $("turnTxt").textContent = "Zincirini yaz"; $("turnSub").textContent = adO + " çözecek"; }
    else if (a === "bekle") { $("turnTxt").textContent = "Bekle"; $("turnSub").textContent = adO + " yazıyor"; }
    else if (G.sira === ME) { $("turnTxt").textContent = "Sıra sende"; $("turnSub").textContent = bT ? bT.k + ". kelime · " + kapali(bT) + " puan" : ""; }
    else { $("turnTxt").textContent = "Sıra " + D.ekDe(adO); $("turnSub").textContent = oT && G.mod === "yaz" ? "senin zincirinde" : "bekliyorsun"; }
    $("turn").className = "hdturn" + (siraBende() || a === "yaz" ? " me" : " ot");
    $("pMe").className = "hdp" + (a === "oyun" && G.sira === ME ? " on" : ""); $("pOther").className = "hdp" + (a === "oyun" && G.sira === OTHER ? " on" : "");
    $("bResign").hidden = !!G.bitti;
    klavyeCiz();
  }
  function klavyeCiz() {
    var a = asama(), bT = benimTahta(), benim = siraBende() && gorunen === "ben";
    $("klavye").hidden = !G || a !== "oyun";
    $("klavye").classList.toggle("kapali", !benim);
    var dolu = bT && yazilan.length >= kapali(bT);
    $("bTahmin").disabled = !benim || !dolu; $("bPas").disabled = !benim; $("bSil").disabled = !benim || !yazilan.length;
    var adO = D.adlar[D.other] || "Rakip";
    $("klavyeNot").textContent = a !== "oyun" ? "" : siraBende() && gorunen !== "ben" ? "Sıra sende — üstten kendi çözdüğün zincire geç" : benim ? (yazilan.length ? "" : "Kelimeyi yaz, sonra Tahmin et") : adO + " düşünüyor…";
  }
  /* son hareket bildirimi */
  function sonGoster(ilk) {
    var s = G && G.son; if (!s) return; var k = G.n + ":" + s.u + ":" + s.k + ":" + s.t + ":" + s.d; if (k === sonGosterilen) return; sonGosterilen = k; if (ilk) return;
    var ben = s.u === D.me, ad = ben ? "Sen" : (D.adlar[s.u] || "Rakip"), sende = G.sira === D.me && !ben;
    if (s.t === "") D.msg(ad + " pas dedi, bir harf açıldı" + (sende ? ", sıra sende!" : "."));
    else if (s.d) { D.msg((ben ? "Bildin! " : ad + " bildi: ") + s.t + " +" + s.p); if (!ben) snd("found"); }
    else { D.msg((ben ? "Olmadı" : ad + " " + s.t + " dedi, olmadı") + " — bir harf açıldı" + (ben ? (G.sira === D.me ? "." : ", sıra geçti.") : sende ? ", sıra sende!" : ".")); if (!ben) snd("key"); }
    var onunTahtasi = G.mod === "yaz" && !ben, hedefGor = G.mod !== "yaz" || (ben ? gorunen === "ben" : gorunen === "o");
    if (hedefGor) { var sat = $("zincir").querySelector('[data-i="' + s.k + '"]'); if (sat) { sat.classList.remove("titre", "parla"); void sat.offsetWidth; sat.classList.add(s.d ? "parla" : "titre"); } }
    void onunTahtasi;
  }
  function macGeldi(d, ilk) {
    var onceki = G; G = d;
    var bo = onceki ? tahta(onceki, "ben") : null, bn = tahta(d, "ben");
    if (!onceki || onceki.n !== d.n || onceki.sira !== d.sira || (bo && bn && bo.k !== bn.k)) yazilan = [];
    if (!onceki || onceki.n !== d.n) { gorunen = "ben"; formKur(); }
    if (asama() === "oyun" && d.sira === D.me && (!onceki || onceki.sira !== D.me)) gorunen = "ben";     /* sıra bana geçince kendi zincirime dön */
    ciz(); sonGoster(ilk || !onceki || onceki.n !== d.n);
  }
  $("sekBen").onclick = function () { gorunen = "ben"; yazilan = []; ciz(); };
  $("sekO").onclick = function () { gorunen = "o"; ciz(); };

  /* ---- zincir yazma formu ---- */
  var ETIKET = ["Başlangıç (açık)", "2. kelime", "3. kelime", "4. kelime", "5. kelime", "6. kelime", "7. kelime (istersen)"];
  function formKur() {
    var f = $("yazListe"); if (f.childNodes.length) return;
    ETIKET.forEach(function (et, i) {
      var row = document.createElement("label"); row.className = "zcyrow" + (i === 0 ? " bas" : "") + (i === 6 ? " ops" : "");
      row.innerHTML = '<span class="zcyno">' + (i + 1) + '</span><input type="text" class="zcyin" data-i="' + i + '" maxlength="14" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="' + et + '">';
      f.appendChild(row);
    });
    var kayit = null; try { kayit = JSON.parse(localStorage.getItem("zc_taslak") || "null"); } catch (e) {}
    if (kayit && kayit.length) [].forEach.call(f.querySelectorAll("input"), function (inp, i) { inp.value = kayit[i] || ""; });
    f.addEventListener("input", function (e) {
      var inp = e.target; if (!inp.classList || !inp.classList.contains("zcyin")) return;
      var v = buyuk(inp.value); if (v !== inp.value) inp.value = v;
      try { localStorage.setItem("zc_taslak", JSON.stringify([].map.call(f.querySelectorAll("input"), function (x) { return x.value; }))); } catch (x) {}
      formKontrol();
    });
    f.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); var n = f.querySelector('input[data-i="' + (+e.target.getAttribute("data-i") + 1) + '"]'); if (n) n.focus(); else e.target.blur(); } });
    formKontrol();
  }
  function formKelimeler() { return [].map.call($("yazListe").querySelectorAll("input"), function (x) { return buyuk(x.value); }); }
  function formKontrol() {
    var w = formKelimeler(), eksik = 0, kotu = 0;
    w.forEach(function (x, i) { var L = harfler(x).length; if (i < 6 && !L) eksik++; if (L && (L < 2 || L > 12)) kotu++; });
    $("bKilitle").disabled = !!eksik || !!kotu || gonderiyor;
    $("yazNot").textContent = kotu ? "Kelimeler 2–12 harf olsun." : eksik ? "İlk 6 kutu dolu olmalı (7. istersen)." : "Hazır! Her kelime bir öncekiyle anlamlı bir ikili kursun.";
  }
  $("bKilitle").onclick = function () {
    if (asama() !== "yaz" || gonderiyor) return;
    var w = formKelimeler().filter(function (x, i) { return i < 6 || x; });
    var ME = D.me, OTHER = D.other; gonderiyor = true; formKontrol();
    D.db.runTransaction(function (tx) {
      return tx.get(D.ref).then(function (snap) {
        var d = snap.data(); if (!d || d.bitti || d.n !== G.n || d.mod !== "yaz") throw new Error("oyun");
        var upd = { yer: {}, hazir: {}, cz: {}, t: firebase.firestore.FieldValue.serverTimestamp(), v: d.v + 1 };
        upd.yer[ME] = D.gizle(JSON.stringify(w), "zincir" + d.n + ME); upd.hazir[ME] = true; upd.cz[OTHER] = kur(w);
        if (d.hazir && d.hazir[OTHER]) upd.sira = d.baslayan;
        tx.set(D.ref, upd, { merge: true });
      });
    }).then(function () { gonderiyor = false; try { localStorage.removeItem("zc_taslak"); } catch (e) {} [].forEach.call($("yazListe").querySelectorAll("input"), function (x) { x.value = ""; }); D.msg("Zincirin hazır, " + (D.adlar[D.other] || "rakip") + " çözecek."); snd("lock"); })
      .catch(function () { gonderiyor = false; formKontrol(); D.msg("Kaydedilemedi, tekrar dene."); });
  };

  /* ---- tahmin klavyesi ---- */
  function bas(h) { var T = benimTahta(); if (!siraBende() || gorunen !== "ben" || !T) return; if (yazilan.length >= kapali(T)) return; yazilan.push(h); snd("key"); ciz(); }
  function sil() { if (!siraBende() || !yazilan.length) return; yazilan.pop(); ciz(); }
  var SATIRLAR = ["ERTYUIOPĞÜ", "ASDFGHJKLŞİ", "ZCVBNMÖÇ"];
  (function () {
    var kv = $("tuslar");
    SATIRLAR.forEach(function (sat, r) {
      var row = document.createElement("div"); row.className = "zcsira";
      harfler(sat).forEach(function (h) { var b = document.createElement("button"); b.type = "button"; b.className = "zct"; b.textContent = h; b.setAttribute("data-h", h); row.appendChild(b); });
      if (r === 2) { var s = document.createElement("button"); s.type = "button"; s.className = "zct sil"; s.id = "bSil"; s.setAttribute("aria-label", "Sil"); s.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11v12H9l-6-6z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/></svg>'; row.appendChild(s); }
      kv.appendChild(row);
    });
    function tus(e) { var b = e.target.closest ? e.target.closest("button") : null; if (!b || b.disabled) return; e.preventDefault(); if (b.id === "bSil") sil(); else if (b.getAttribute("data-h")) bas(b.getAttribute("data-h")); }
    if (window.PointerEvent) kv.addEventListener("pointerdown", tus); else kv.addEventListener("click", tus);   /* basar basmaz: hızlı yazımda harf kaçmasın */
    addEventListener("keydown", function (e) {
      if (!G || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target && e.target.tagName === "INPUT") return;
      if (e.key === "Backspace") { e.preventDefault(); sil(); return; }
      if (e.key === "Enter") { e.preventDefault(); tahmin(); return; }
      var h = buyuk(e.key); if (h.length === 1) bas(h);
    });
  })();
  $("bTahmin").onclick = function () { tahmin(); };
  $("bPas").onclick = function () { if (siraBende() && gorunen === "ben") yaz(null); };
  function tahmin() {
    var T = benimTahta(); if (!siraBende() || gorunen !== "ben" || !T || yazilan.length < kapali(T)) return;
    yaz(harfler(T.words[T.k]).slice(0, T.acik[T.k]).join("") + yazilan.join(""));
  }
  /* tahmini uygula: st = {acik, coz, k}, words; dönüş: {dogru, p} */
  function uygula(st, words, t, ME) {
    var k = st.k, L = harfler(words[k]), dogru = t !== null && buyuk(t) === buyuk(words[k]), p = 0;
    if (dogru) { p = Math.max(1, L.length - st.acik[k]); st.acik[k] = L.length; st.coz[k] = ME; st.k = k + 1; }
    else { st.acik[k] = Math.min(L.length, st.acik[k] + 1); if (st.acik[k] >= L.length) { st.coz[k] = "x"; st.k = k + 1; } }
    if (st.k >= words.length) st.bitti = true;
    return { dogru: dogru, p: p, k: k };
  }
  /* tahmin/pas sonucunu hesapla (saf): hem anında ekranda göstermek hem de işlemde yazmak için */
  function hesapla(d, t, ME, OTHER) {
    var puan = {}; puan[d.a] = (d.puan || {})[d.a] || 0; puan[d.b] = (d.puan || {})[d.b] || 0;
    var upd = {}, r, sira, bitirdi = false;
    if (d.mod === "yaz") {
      var words = zincirOf(d, OTHER), cz = d.cz || {}, ben = JSON.parse(JSON.stringify(cz[ME] || null)), onun = cz[OTHER] || { bitti: true };
      if (!words || !ben) throw new Error("zincir");
      r = uygula(ben, words, t, ME); upd.cz = {}; upd.cz[ME] = ben;
      if (ben.bitti && onun.bitti) sira = "";
      else if (ben.bitti) sira = OTHER; else if (onun.bitti) sira = ME; else sira = r.dogru ? ME : OTHER;
      if (!sira) bitirdi = true;
    } else {
      var st = { acik: d.acik.slice(), coz: d.coz.slice(), k: d.k }, zn = Z[d.z];
      r = uygula(st, zn, t, ME); upd.acik = st.acik; upd.coz = st.coz; upd.k = st.k;
      sira = st.bitti ? "" : r.dogru ? ME : OTHER; if (st.bitti) bitirdi = true;
    }
    puan[ME] += r.p; upd.puan = puan; upd.sira = sira;
    upd.son = { u: ME, t: t === null ? "" : buyuk(t), d: r.dogru, k: r.k, p: r.p };
    if (bitirdi) { upd.bitti = true; upd.sonuc = "zincir"; upd.kazanan = puan[ME] > puan[OTHER] ? ME : puan[OTHER] > puan[ME] ? OTHER : null; }
    return { upd: upd, dogru: r.dogru, bitirdi: bitirdi };
  }
  function birlestir(a, b) { var o = JSON.parse(JSON.stringify(a)); (function m(x, y) { for (var k in y) { if (y[k] && typeof y[k] === "object" && !Array.isArray(y[k]) && x[k] && typeof x[k] === "object" && !Array.isArray(x[k])) m(x[k], y[k]); else x[k] = JSON.parse(JSON.stringify(y[k])); } })(o, b); return o; }
  function yaz(t) {
    var ME = D.me, OTHER = D.other, once = G, h;
    try { h = hesapla(once, t, ME, OTHER); } catch (e) { D.msg("Zincir okunamadı."); return; }
    /* anında göster: sunucu cevabını beklemeden */
    gonderiyor = true; yazilan = []; G = birlestir(once, h.upd); ciz(); sonGoster(false); snd(h.dogru ? "found" : "lock");
    var bitirdi = false;
    D.db.runTransaction(function (tx) {
      return tx.get(D.ref).then(function (snap) {
        var d = snap.data(); if (!d || d.bitti || d.sira !== ME || d.v !== once.v) throw new Error("sira");
        var r = hesapla(d, t, ME, OTHER), upd = r.upd; bitirdi = r.bitirdi;
        upd.v = d.v + 1; upd.t = firebase.firestore.FieldValue.serverTimestamp();
        tx.set(D.ref, upd, { merge: true });
      });
    }).then(function () { gonderiyor = false; if (bitirdi) D.bitirenBenim = true; if (G) ciz(); })
      .catch(function (e) { gonderiyor = false; G = once; sonGosterilen = ""; ciz(); D.msg(String(e && e.message) === "sira" ? "Sıra sende değil ya da zincir değişti." : "Bağlantı kurulamadı, tekrar dene."); });
  }
  $("bResign").onclick = function () { if (!G || G.bitti) return; $("confirm").hidden = false; };
  $("confirmNo").onclick = function () { $("confirm").hidden = true; };
  $("confirmYes").onclick = function () {
    $("confirm").hidden = true; if (!G || G.bitti) return; D.bitirenBenim = true;
    D.ref.set({ bitti: true, sonuc: "pes", kazanan: D.other, sira: "", v: (G.v || 0) + 1, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () { D.bitirenBenim = false; D.msg("Olmadı, tekrar dene."); });
  };
  /* mod seçimi (başlangıç ve bitiş kartında) */
  function modCiz() {
    [].forEach.call(document.querySelectorAll("[data-mod-seg] button"), function (b) { b.classList.toggle("on", b.getAttribute("data-mod") === seciliMod); });
    [].forEach.call(document.querySelectorAll("[data-mod-not]"), function (p) { p.textContent = MOD_NOT[seciliMod]; });
  }
  [].forEach.call(document.querySelectorAll("[data-mod-seg]"), function (s) {
    s.addEventListener("click", function (e) { var b = e.target.closest ? e.target.closest("button[data-mod]") : null; if (!b) return; seciliMod = b.getAttribute("data-mod"); try { localStorage.setItem("zc_mod", seciliMod); } catch (x) {} modCiz(); snd("key"); });
  });
  modCiz();
  addEventListener("resize", function () { if (G) ciz(); });
  if (location.hash === "#test") window.__zc = {
    state: function () { var T = benimTahta(); return { G: G, me: D.me, other: D.other, asama: asama(), yazilan: yazilan.slice(), kelimeler: T ? T.words.slice() : [], tahta: T, gorunen: gorunen }; },
    yaz: function (s) { yazilan = []; harfler(buyuk(s)).forEach(function (h) { yazilan.push(h); }); ciz(); }, tahmin: tahmin, pas: function () { yaz(null); }, yeni: D.yeniOyun,
    mod: function (m) { seciliMod = m; modCiz(); }, zincirYaz: function (L) { [].forEach.call($("yazListe").querySelectorAll("input"), function (x, i) { x.value = L[i] || ""; }); formKontrol(); }
  };
})();
