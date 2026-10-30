/* Son Kart – iki kişilik (+ istersen bot). Ortak altyapı: duello.js (sonkart/mac, sonkart/seri). Kurallar ve botlar: sonkart-kural.js
   mac = { n, v, a, b, baslayan, tip: "2"|"3", botZ: "orta"|"zor", …motor durumu (mod, oyuncular, el, deste, atik, renk, yon, sira, ceza, cekti, cekilen, yok, son), bitti, sonuc, kazanan }
   Bot kazanırsa kazanan = null, sonuc = "bot". Botun sırasını, son hamleyi yapan kişinin telefonu oynatır (o yoksa öbürü birkaç saniye sonra devralır). */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var UK = window.SonKartKural, MOTOR = ["mod", "oyuncular", "el", "deste", "atik", "renk", "yon", "sira", "ceza", "cekti", "cekilen", "yok", "son", "bitti", "kazanan"];
  var RENK_AD = { r: "Kırmızı", y: "Sarı", g: "Yeşil", b: "Mavi" };
  var sec = { tip: "2", bot: "orta", mod: "klasik" };
  try { var ks = JSON.parse(localStorage.getItem("uk_sec") || "null"); if (ks) { if (ks.tip === "3") sec.tip = "3"; if (ks.bot === "zor") sec.bot = "zor"; if (UK.MODLAR[ks.mod]) sec.mod = ks.mod; } } catch (e) {}

  var D = window.Duello({
    kol: "sonkart", sayfa: "sonkart", sub: "sub", ses: "UkSes", helpKey: "sonkart_help",
    startText: "Herkese 7 kart; rengine ya da sayısına uyanı at, elini ilk bitiren kazanır. Kimlerin oynayacağını ve modu seç.",
    yeniDoc: function (d, ME, OTHER) {
      var baslayan = d && d.baslayan ? (d.baslayan === ME ? OTHER : ME) : ME;
      var oyuncular = sec.tip === "3" ? [ME, "bot", OTHER] : [ME, OTHER];
      var S = UK.kur(oyuncular, sec.mod, Math.random, baslayan), doc = { a: ME, b: OTHER, baslayan: baslayan, tip: sec.tip, botZ: sec.tip === "3" ? sec.bot : "" };
      MOTOR.forEach(function (k) { doc[k] = S[k]; });
      return doc;
    },
    onMac: function (d, ilk) { macGeldi(d, ilk); },
    onYok: function () { G = null; ["rakipler", "masa", "durum", "alt"].forEach(function (x) { $(x).hidden = true; }); $("el").innerHTML = ""; },
    bitisGecikme: 1300,
    bitis: function (d) {
      var ME = D.me, ad = D.adlar[D.other] || "Rakip", kazandim = d.kazanan === ME, m = (UK.MODLAR[d.mod] || {}).ad || "";
      var baslik = d.sonuc === "pes" ? (kazandim ? ad + " pes etti — kazandın" : "Pes ettin") : d.sonuc === "bot" ? "Bot kazandı 🤖" : kazandim ? "Son kart! Kazandın 🎉" : ad + " kazandı";
      var kalan = (d.el && d.el[ME]) ? d.el[ME].length : 0;
      return { kick: "Oyun " + d.n + " · " + m + (d.tip === "3" ? " · bot " + d.botZ : ""), baslik: baslik, metin: (kazandim ? "Elinde kart kalmadı." : "Elinde " + kalan + " kart kalmıştı.") + " Yeni oyunda ilk hamle " + (d.baslayan === ME ? D.ekIn(ad) : "senin") + "." };
    },
    seriKod: function (d) { if (d.sonuc === "pes") return 99; var t = 0; for (var k in (d.el || {})) if (k !== d.kazanan) t += d.el[k].length; return Math.min(98, t); }
  });
  var G = null, gonderiyor = false, botZaman = null, benSurdum = false, sonOlay = "", bekleyenKart = null;
  function snd(n) { if (window.UkSes) try { window.UkSes.play(n); } catch (e) {} }
  function motor(d) { var S = {}; MOTOR.forEach(function (k) { S[k] = d[k] === undefined ? null : JSON.parse(JSON.stringify(d[k])); }); S.ceza = S.ceza || 0; S.yok = S.yok || {}; S.cekilen = S.cekilen || ""; return S; }
  function tamDoc(d, upd) {
    var o = {}; for (var k in d) if (k !== "t") o[k] = d[k];
    o = JSON.parse(JSON.stringify(o)); upd = JSON.parse(JSON.stringify(upd, function (k, v) { return k === "t" ? undefined : v; }));
    for (k in upd) o[k] = upd[k]; o.t = firebase.firestore.FieldValue.serverTimestamp(); return o;
  }
  function ad(id) { return id === "bot" ? "Bot" : id === D.me ? "Sen" : (D.adlar[id] || "Rakip"); }
  function siraBende() { return G && !G.bitti && G.sira === D.me && !gonderiyor; }

  /* ---------- kart çizimi ---------- */
  var SVG = {
    s: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" stroke-width="5"/><path d="M11 29L29 11" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>',
    r: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16a10 10 0 0 1 17-5l3 3"/><path d="M31 8v7h-7"/><path d="M30 24a10 10 0 0 1-17 5l-3-3"/><path d="M9 32v-7h7"/></svg>',
    jok: '<svg viewBox="0 0 40 40"><path d="M20 20V5a15 15 0 0 1 15 15z" fill="#e8505b"/><path d="M20 20h15a15 15 0 0 1-15 15z" fill="#3b82f6"/><path d="M20 20v15A15 15 0 0 1 5 20z" fill="#f6c445"/><path d="M20 20H5A15 15 0 0 1 20 5z" fill="#36b37e"/><circle cx="20" cy="20" r="15" fill="none" stroke="#fff" stroke-width="2.5"/></svg>'
  };
  function kartHTML(k, ek) {
    var r = UK.renkOf(k) || "w", d = UK.degerOf(k), kose = d, orta;
    if (d === "s") { orta = SVG.s; kose = "⊘"; }
    else if (d === "r") { orta = SVG.r; kose = "⇄"; }
    else if (d === "d") { orta = "<b>+2</b>"; kose = "+2"; }
    else if (d === "w") { orta = SVG.jok; kose = "★"; }
    else if (d === "w4") { orta = SVG.jok + "<b class='ukart4'>+4</b>"; kose = "+4"; }
    else orta = "<b>" + d + "</b>";
    return '<div class="uk ' + r + (/^[0-9]$/.test(d) ? " sayi" : " eylem") + (ek ? " " + ek : "") + '" data-k="' + k + '"><i class="ukk ust">' + kose + '</i><span class="ukorta">' + orta + '</span><i class="ukk alt">' + kose + "</i></div>";
  }
  /* kart arkası deseni: düşük opaklıkta, odadaki iki takma ad karışık (adlar değişince desen de yenilenir) */
  function desenKur() {
    var A = (window.Hesap && Hesap.gorunenAd("a")) || "A", B = (window.Hesap && Hesap.gorunenAd("b")) || "B";
    function kisa(x) { x = String(x || "").trim(); return x.length > 6 ? x.slice(0, 6) : x || "·"; }
    A = kisa(A); B = kisa(B);
    var t = [], yaz = [[A, 8, 20, -16], [B, 52, 34, 14], [B, 2, 62, 10], [A, 58, 76, -12], [A, 30, 50, 4], [B, 20, 96, -8], [A, 66, 104, 18]];
    yaz.forEach(function (w) { var ben = w[0] === A; t.push('<text x="' + w[1] + '" y="' + w[2] + '" transform="rotate(' + w[3] + " " + w[1] + " " + w[2] + ')" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="' + (ben ? 14 : 12) + '" fill="#ffffff" fill-opacity="' + (ben ? 0.16 : 0.12) + '">' + w[0].replace(/[<>&]/g, "") + "</text>"); });
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="110">' + t.join("") + "</svg>";
    document.documentElement.style.setProperty("--uk-desen", 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")');
  }
  desenKur(); if (window.Hesap && Hesap.odaIzle) Hesap.odaIzle(desenKur);

  /* ---------- çizim ---------- */
  function oyunSirasi() { var L = G.oyuncular || [], i = L.indexOf(D.me), out = []; for (var j = 1; j < L.length; j++) out.push(L[(i + j) % L.length]); return out; }
  function boyut() {
    var w = Math.min(innerWidth, 560), h = innerHeight;
    var kw = Math.max(52, Math.min(78, Math.floor(Math.min(w / 5.6, (h - 420) / 1.6 + 52))));
    document.documentElement.style.setProperty("--uk-w", kw + "px");
    elDiz();
  }
  function elDiz() {                                                         /* eldeki kartlar sığsın: üst üste bindir */
    var el = $("el"), K = el.children, n = K.length; if (!n) return;
    var kw = K[0].offsetWidth || 64, en = el.clientWidth - 8, aralik = n > 1 ? Math.min(kw + 6, (en - kw) / (n - 1)) : 0;
    aralik = Math.max(kw * 0.28, aralik);
    for (var i = 0; i < n; i++) K[i].style.marginLeft = i ? (aralik - kw) + "px" : "0";
    el.classList.toggle("tasar", (n - 1) * aralik + kw > en);
  }
  function sirala(L) {
    var R = { r: 0, y: 1, g: 2, b: 3, w: 4 }, V = function (k) { var d = UK.degerOf(k); return /^[0-9]$/.test(d) ? +d : { s: 10, r: 11, d: 12, w: 13, w4: 14 }[d]; };
    return L.slice().sort(function (a, b) { return R[UK.renkOf(a) || "w"] - R[UK.renkOf(b) || "w"] || V(a) - V(b); });
  }
  function ciz() {
    if (!G) return;
    var ME = D.me, S = motor(G), benim = siraBende();
    ["rakipler", "masa", "durum", "alt"].forEach(function (x) { $(x).hidden = false; });
    /* rakipler */
    var sira = oyunSirasi();
    $("pBot").hidden = sira.indexOf("bot") < 0;
    sira.forEach(function (id) {
      var kutu = id === "bot" ? $("pBot") : $("pOther"); kutu.setAttribute("data-id", id);
      var n = (G.el[id] || []).length, yel = kutu.querySelector(".ukyelpaze"), goster = Math.min(n, 12), html = "";
      for (var i = 0; i < goster; i++) html += '<span class="uk arka mini" style="--i:' + (i - (goster - 1) / 2) + '"></span>';
      if (yel.getAttribute("data-n") !== String(n)) { yel.innerHTML = html; yel.setAttribute("data-n", n); }
      kutu.querySelector(".uksay").textContent = n + " kart" + (id === "bot" ? " · " + (G.botZ === "zor" ? "zor" : "orta") : "");
      kutu.classList.toggle("sira", !G.bitti && G.sira === id); kutu.classList.toggle("sonkart", n === 1 && !G.bitti);
      if (sira.length === 2) kutu.style.order = sira.indexOf(id);
    });
    /* masa */
    var tepe = G.atik.slice(-3), atikHTML = tepe.map(function (k, i) { return '<div class="ukatikk" style="--r:' + (((G.atik.length - tepe.length + i) * 37) % 24 - 12) + 'deg;--o:' + (i === tepe.length - 1 ? 1 : 0.9) + '">' + kartHTML(k) + "</div>"; }).join("");
    if ($("atik").getAttribute("data-h") !== atikHTML) { $("atik").innerHTML = atikHTML; $("atik").setAttribute("data-h", atikHTML); }
    $("desteSay").textContent = G.deste.length;
    $("renk").className = "ukrenk " + G.renk; $("renkAd").textContent = RENK_AD[G.renk] || "";
    $("yon").classList.toggle("ters", G.yon < 0); $("yon").hidden = (G.oyuncular || []).length < 3;
    $("ceza").hidden = !G.ceza; $("ceza").textContent = "+" + G.ceza + " birikti";
    $("deste").classList.toggle("cekilir", benim && !G.cekti);
    /* durum */
    var t, alt = "";
    if (G.bitti) { t = G.kazanan === ME ? "Kazandın!" : G.sonuc === "bot" ? "Bot kazandı" : G.kazanan ? ad(G.kazanan) + " kazandı" : "Bitti"; }
    else if (G.sira === ME) { t = gonderiyor ? "…" : "Sıra sende"; alt = G.ceza ? "+" + G.ceza + " ya yığ ya çek" : G.cekti ? "çektiğini at ya da pas" : UK.oynanabilirler(S, ME).length ? "uyan bir kart at" : "atacak kart yok, desteden çek"; }
    else { t = G.sira === "bot" ? "Bot düşünüyor…" : "Sıra " + D.ekDe(ad(G.sira)); alt = ""; }
    $("turnTxt").textContent = t; $("turnSub").textContent = alt; $("durum").classList.toggle("ben", benim);
    /* el */
    var el = sirala(G.el[ME] || []), okler = benim ? UK.oynanabilirler(S, ME) : [];
    var elHTML = el.map(function (k) { return '<button type="button" class="ukkb' + (okler.indexOf(k) >= 0 ? " ok" : benim ? " soluk" : "") + (bekleyenKart === k ? " secili" : "") + '" data-k="' + k + '">' + kartHTML(k) + "</button>"; }).join("");
    if ($("el").getAttribute("data-h") !== elHTML) { $("el").innerHTML = elHTML; $("el").setAttribute("data-h", elHTML); elDiz(); }
    /* düğmeler */
    var n = (G.el[ME] || []).length;
    $("bUno").disabled = !benim || n !== 2; $("bUno").classList.toggle("hazir", benim && n === 2); $("bUno").classList.toggle("basili", unoBasili && n === 2);
    $("bPas").hidden = !(benim && G.cekti); $("bResign").hidden = !!G.bitti;
    $("pMe").classList.toggle("on", benim); $("alt").classList.toggle("sonkart", n === 1 && !G.bitti);
  }

  /* ---------- olay bildirimi + uçan kart ---------- */
  function kutuRect(id) { if (id === D.me) return $("el").getBoundingClientRect(); var k = id === "bot" ? $("pBot") : $("pOther"); return k.getBoundingClientRect(); }
  function ucur(kod, nereden, nereye, arka) {
    var a = nereden, b = nereye; if (!a || !b) return;
    var f = document.createElement("div"); f.className = "ukucan"; f.innerHTML = arka ? '<span class="uk arka"></span>' : kartHTML(kod);
    var w = b.width || 70; f.style.left = (a.left + a.width / 2) + "px"; f.style.top = (a.top + a.height / 2) + "px"; document.body.appendChild(f);
    var dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
    requestAnimationFrame(function () { f.style.transform = "translate(-50%,-50%) translate(" + dx + "px," + dy + "px) rotate(" + (Math.random() * 24 - 12) + "deg)"; f.style.opacity = "1"; });
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 520); void w;
  }
  function olayGoster(ilk) {
    var s = G && G.son; if (!s) return; var k = G.n + ":" + G.v + ":" + JSON.stringify(s); if (k === sonOlay) return; sonOlay = k; if (ilk) return;
    var kim = ad(s.u), ben = s.u === D.me, m = "";
    if (s.t === "oyna") {
      var d = UK.degerOf(s.k), ne = d === "s" ? "pas kartı" : d === "r" ? "yön kartı" : d === "d" ? "+2" : d === "w" ? "renk seç" : d === "w4" ? "+4" : (RENK_AD[UK.renkOf(s.k)] || "") + " " + d;
      m = (ben ? "Sen" : kim) + " " + ne + " attı";
      if (s.renk) m += " · renk " + (RENK_AD[s.renk] || "").toLowerCase();
      if (s.ek && s.n) m += " · " + ad(s.ek) + " " + s.n + " kart çekti";
      else if (s.ek && d === "s") m += " · " + ad(s.ek) + " atlandı";
      if (s.hedef) m += " · " + ad(s.hedef) + " ile eller değişti";
      if (s.donus) m += " · eller döndü";
      if (s.uno) { m += " · Son kart!"; snd("uno"); }
      if (s.unoCeza) { m += " · UNO demeyi unuttu, +2 ceza"; snd("ceza"); }
      if (!ben) ucur(s.k, kutuRect(s.u), $("atik").getBoundingClientRect());
      snd("kart");
    } else if (s.t === "cek") { m = (ben ? "Sen " : kim + " ") + (s.n > 1 ? s.n + " kart" : "kart") + " çekti" + (s.gecti ? ", sıra geçti" : ""); snd("cek"); if (!ben) ucur("", $("deste").getBoundingClientRect(), kutuRect(s.u), true); }
    else if (s.t === "ceza") { m = (ben ? "Sen" : kim) + " " + s.n + " kart çekti (birikmiş ceza)"; snd("ceza"); }
    else if (s.t === "pas") m = (ben ? "Sen" : kim) + " pas geçti";
    if (G.sira === D.me && !G.bitti && !ben) { m += " — sıra sende"; setTimeout(function () { snd("sira"); }, 250); }
    D.msg(m);
  }

  /* ---------- hamle (anında göster, sonra işlemle yaz) ---------- */
  var unoBasili = false;
  function hamle(h) {
    if (!siraBende()) return;
    var once = G, S = motor(once), S2, ME = D.me;
    if (h.t === "oyna" && (G.el[ME] || []).length === 2) h.uno = unoBasili;
    try { S2 = UK.uygula(S, ME, h); } catch (e) { D.msg("Bu hamle olmuyor."); return; }
    if (h.t === "oyna") { var kb = $("el").querySelector('.ukkb[data-k="' + h.k + '"]'); ucur(h.k, kb ? kb.getBoundingClientRect() : $("el").getBoundingClientRect(), $("atik").getBoundingClientRect()); }
    if (h.t === "cek") ucur("", $("deste").getBoundingClientRect(), $("el").getBoundingClientRect(), true);
    gonderiyor = true; bekleyenKart = null; unoBasili = false;
    var yeni = JSON.parse(JSON.stringify(once, function (k, v) { return k === "t" ? undefined : v; })); MOTOR.forEach(function (k) { yeni[k] = S2[k]; });
    if (S2.bitti) { yeni.sonuc = S2.kazanan === "bot" ? "bot" : "bitti"; yeni.kazanan = S2.kazanan === "bot" ? null : S2.kazanan; }
    yeni.v = once.v + 1; G = yeni; ciz(); olayGoster(false);
    var bitirdi = false;
    D.db.runTransaction(function (tx) {
      return tx.get(D.ref).then(function (snap) {
        var d = snap.data(); if (!d || d.bitti || d.sira !== ME || d.v !== once.v || d.n !== once.n) throw new Error("sira");
        var R = UK.uygula(motor(d), ME, h), upd = { v: d.v + 1, t: firebase.firestore.FieldValue.serverTimestamp() };
        MOTOR.forEach(function (k) { upd[k] = R[k]; });
        if (R.bitti) { bitirdi = true; upd.sonuc = R.kazanan === "bot" ? "bot" : "bitti"; upd.kazanan = R.kazanan === "bot" ? null : R.kazanan; }
        tx.set(D.ref, tamDoc(d, upd));                                     /* birleştirme değil: eski "son" alanları karışmasın */
      });
    }).then(function () { gonderiyor = false; benSurdum = true; if (bitirdi) D.bitirenBenim = true; ciz(); botPlanla(); })
      .catch(function (e) { gonderiyor = false; G = once; sonOlay = ""; ciz(); D.msg(String(e && e.message) === "sira" ? "Sıra sende değil ya da masa değişti." : "Bağlantı kurulamadı, tekrar dene."); });
  }
  /* kart seçimi: renk seç / +4 → renk; 7–0 modunda 7 (3 kişide) → kişi */
  $("el").addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".ukkb") : null; if (!b || !siraBende()) return;
    var k = b.getAttribute("data-k"), S = motor(G);
    if (!UK.oynanabilir(S, D.me, k)) { D.msg(G.ceza ? "Ceza birikti: ya yığarsın ya desteden çekersin." : G.cekti ? "Çektikten sonra yalnız çektiğin kartı atabilirsin." : "Bu kart uymuyor."); b.classList.remove("titre"); void b.offsetWidth; b.classList.add("titre"); return; }
    if (UK.vahsi(k)) { bekleyenKart = k; ciz(); $("renkSec").hidden = false; snd("sec"); return; }
    if (UK.degerOf(k) === "7" && UK.ozellik(G.mod).yedisifir && G.oyuncular.length > 2 && G.el[D.me].length > 1) { hedefSor(k); return; }
    hamle({ t: "oyna", k: k });
  });
  [].forEach.call(document.querySelectorAll("#renkSec [data-r]"), function (b) { b.onclick = function () { var k = bekleyenKart; $("renkSec").hidden = true; if (k) hamle({ t: "oyna", k: k, renk: b.getAttribute("data-r") }); }; });
  $("renkIptal").onclick = function () { $("renkSec").hidden = true; bekleyenKart = null; ciz(); };
  function hedefSor(k) {
    $("hedefler").innerHTML = G.oyuncular.filter(function (id) { return id !== D.me; }).map(function (id) { return '<button type="button" class="hsbtn" data-h="' + id + '">' + ad(id) + " · " + G.el[id].length + " kart</button>"; }).join("");
    [].forEach.call($("hedefler").querySelectorAll("button"), function (b) { b.onclick = function () { $("hedefSec").hidden = true; hamle({ t: "oyna", k: k, hedef: b.getAttribute("data-h") }); }; });
    $("hedefSec").hidden = false;
  }
  $("hedefIptal").onclick = function () { $("hedefSec").hidden = true; };
  $("deste").onclick = function () { if (!siraBende()) return; if (G.cekti) { D.msg("Bir kere çektin; at ya da pas geç."); return; } hamle({ t: "cek" }); };
  $("bPas").onclick = function () { hamle({ t: "pas" }); };
  $("bUno").onclick = function () { if (!siraBende() || G.el[D.me].length !== 2) return; unoBasili = !unoBasili; if (unoBasili) { snd("sonkart"); D.msg("“Son kart!” dedin — şimdi kartını at."); } ciz(); };

  /* ---------- bot ---------- */
  function botPlanla() {
    clearTimeout(botZaman); if (!G || G.bitti || G.sira !== "bot") return;
    var surucu = G.son && (G.son.u === D.me || (G.son.u === "bot" && benSurdum)), v = G.v, n = G.n;
    botZaman = setTimeout(function () { botOyna(n, v); }, surucu ? 1100 : 4500);
  }
  function botOyna(n, v) {
    if (!G || G.bitti || G.sira !== "bot" || G.v !== v || G.n !== n) return;
    D.db.runTransaction(function (tx) {
      return tx.get(D.ref).then(function (snap) {
        var d = snap.data(); if (!d || d.bitti || d.sira !== "bot" || d.v !== v || d.n !== n) throw new Error("gecti");
        var S = motor(d), h = UK.botHamle(S, "bot", d.botZ || "orta"), R = UK.uygula(S, "bot", h), upd = { v: d.v + 1 };
        MOTOR.forEach(function (k) { upd[k] = R[k]; });
        if (R.bitti) { upd.sonuc = R.kazanan === "bot" ? "bot" : "bitti"; upd.kazanan = R.kazanan === "bot" ? null : R.kazanan; }
        tx.set(D.ref, tamDoc(d, upd));
      });
    }).then(function () { benSurdum = true; }).catch(function () { benSurdum = false; });
  }

  function macGeldi(d, ilk) {
    var onceki = G; G = d;
    if (ilk || !onceki || onceki.n !== d.n) { unoBasili = false; bekleyenKart = null; benSurdum = false; }
    if (d.son && d.son.u !== D.me && d.son.u !== "bot") benSurdum = false;
    if (!gonderiyor) { ciz(); olayGoster(ilk || !onceki || onceki.n !== d.n); }
    botPlanla();
  }
  addEventListener("resize", function () { boyut(); });
  boyut();

  /* ---------- kurulum seçimleri ---------- */
  function secCiz() {
    [].forEach.call(document.querySelectorAll("[data-sec]"), function (box) {
      var ne = box.getAttribute("data-sec");
      if (ne === "mod" && !box.childNodes.length) box.innerHTML = Object.keys(UK.MODLAR).map(function (m) { return '<button type="button" data-v="' + m + '"><b>' + UK.MODLAR[m].ad + "</b><small>" + UK.MODLAR[m].acik + "</small></button>"; }).join("");
      [].forEach.call(box.querySelectorAll("button[data-v]"), function (b) { b.classList.toggle("on", b.getAttribute("data-v") === sec[ne]); });
      if (ne === "bot") box.hidden = sec.tip !== "3";
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("[data-sec] button[data-v]") : null; if (!b) return;
    sec[b.parentNode.getAttribute("data-sec")] = b.getAttribute("data-v");
    try { localStorage.setItem("uk_sec", JSON.stringify(sec)); } catch (x) {}
    secCiz(); snd("sec");
  });
  secCiz();
  $("bResign").onclick = function () { if (!G || G.bitti) return; $("confirm").hidden = false; };
  $("confirmNo").onclick = function () { $("confirm").hidden = true; };
  $("confirmYes").onclick = function () {
    $("confirm").hidden = true; if (!G || G.bitti) return; D.bitirenBenim = true; clearTimeout(botZaman);
    D.ref.set({ bitti: true, sonuc: "pes", kazanan: D.other, sira: "", v: (G.v || 0) + 1, t: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(function () { D.bitirenBenim = false; D.msg("Olmadı, tekrar dene."); });
  };
  if (location.hash === "#test") window.__uk = {
    state: function () { return { G: G, me: D.me, other: D.other, gonderiyor: gonderiyor, ok: G && G.sira === D.me ? UK.oynanabilirler(motor(G), D.me) : [] }; },
    hamle: hamle, sonkart: function () { unoBasili = true; }, sec: function (s) { for (var k in s) sec[k] = s[k]; secCiz(); }, yeni: D.yeniOyun, UK: UK,
    botla: function (zorluk) { if (!siraBende()) return false; var h = UK.botHamle(motor(G), D.me, zorluk || "zor"); if (h.t === "oyna" && G.el[D.me].length === 2) unoBasili = true; hamle(h); return h; }
  };
})();
