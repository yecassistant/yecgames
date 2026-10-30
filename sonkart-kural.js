/* Son Kart kural motoru + botlar (saf işlevler; tarayıcıda window.SonKartKural, Node'da module.exports).
   Kart kodu: renk harfi + değer → "r7", "gs" (pas), "br" (yön), "yd" (+2); renksiz: "w" (renk seç), "w4" (+4).
   Durum: { mod, oyuncular: [id…], el: {id: [kod…]}, deste: [kod…] (sondan çekilir), atik: [kod…] (son eleman üstte), renk, yon: 1|-1,
            sira: id, ceza: biriken çekme (yığma), cekti: bu tur çekti mi, cekilen: çektiği kart (yalnız o oynanabilir), yok: {id: [renk…]} (botun hafızası),
            son: { u, t: "oyna"|"cek"|"pas"|"ceza", k, n, renk, hedef, unoCeza, ek }, bitti, kazanan }
   Modlar: klasik · yedisifir (7: biriyle el değiş, 0: eller yön yönünde döner) · yigma (+2/+4 üst üste) · cek (oynayacak kart çıkana kadar çek) · kaos (hepsi) */
(function (kok) {
  "use strict";
  var RENKLER = ["r", "y", "g", "b"];
  var MODLAR = {
    klasik: { ad: "Klasik", acik: "Bildiğimiz kurallar. +2 ve +4'ü yiyen çeker, sırası geçer." },
    yedisifir: { ad: "7–0", acik: "7 atan biriyle elini değişir; 0 atınca herkes elini sıradakine verir." },
    yigma: { ad: "Yığmalı", acik: "+2'nin üstüne +2 ya da +4, +4'ün üstüne +4 atılır; ceza birikir, atamayan hepsini çeker." },
    cek: { ad: "Çekene kadar", acik: "Atacak kartın yoksa oynanabilir kart çıkana kadar çekersin." },
    kaos: { ad: "Kaos", acik: "7–0, yığma ve çekene kadar çek bir arada." }
  };
  function ozellik(mod) { return { yedisifir: mod === "yedisifir" || mod === "kaos", yigma: mod === "yigma" || mod === "kaos", cek: mod === "cek" || mod === "kaos" }; }
  function renkOf(k) { return k.charAt(0) === "w" ? "" : k.charAt(0); }
  function degerOf(k) { return k.charAt(0) === "w" ? k : k.slice(1); }
  function vahsi(k) { return k.charAt(0) === "w"; }
  function karistir(L, rnd) { rnd = rnd || Math.random; for (var i = L.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = L[i]; L[i] = L[j]; L[j] = t; } return L; }
  function yeniDeste(rnd) {
    var L = [];
    RENKLER.forEach(function (r) {
      L.push(r + "0");
      for (var n = 1; n <= 9; n++) L.push(r + n, r + n);
      ["s", "r", "d"].forEach(function (x) { L.push(r + x, r + x); });
    });
    for (var i = 0; i < 4; i++) L.push("w", "w4");
    return karistir(L, rnd);
  }
  function kopya(S) { return JSON.parse(JSON.stringify(S)); }
  function kur(oyuncular, mod, rnd, baslayan) {
    var S = { mod: mod || "klasik", oyuncular: oyuncular.slice(), el: {}, deste: yeniDeste(rnd), atik: [], renk: "", yon: 1, sira: baslayan || oyuncular[0], ceza: 0, cekti: false, cekilen: "", yok: {}, son: null, bitti: false, kazanan: null };
    for (var t = 0; t < 7; t++) oyuncular.forEach(function (id) { (S.el[id] = S.el[id] || []).push(S.deste.pop()); });
    oyuncular.forEach(function (id) { S.yok[id] = []; });
    /* ilk açılan kart sayı olsun */
    var ilk = S.deste.pop(); while (!/^[rygb][0-9]$/.test(ilk)) { S.deste.unshift(ilk); ilk = S.deste.pop(); }
    S.atik.push(ilk); S.renk = renkOf(ilk);
    return S;
  }
  function ust(S) { return S.atik[S.atik.length - 1]; }
  function sonrakiId(S, adim) { var n = S.oyuncular.length, i = S.oyuncular.indexOf(S.sira); return S.oyuncular[(((i + (adim || 1) * S.yon) % n) + n * 4) % n]; }
  function cek1(S, rnd) {
    if (!S.deste.length) {
      var tepe = S.atik.pop(); S.deste = karistir(S.atik, rnd); S.atik = [tepe];
      if (!S.deste.length) return null;                                   /* bütün kartlar ellerde */
    }
    return S.deste.pop();
  }
  /* bu kart şimdi atılabilir mi */
  function oynanabilir(S, id, k) {
    if (S.bitti || S.sira !== id) return false;
    if (S.cekti && S.cekilen && k !== S.cekilen) return false;           /* çektikten sonra yalnız çekilen kart */
    var u = ust(S), oz = ozellik(S.mod);
    if (S.ceza > 0) { if (!oz.yigma) return false; var ud = degerOf(u); return ud === "w4" ? k === "w4" : (degerOf(k) === "d" || k === "w4"); }
    if (vahsi(k)) return true;
    return renkOf(k) === S.renk || (!vahsi(u) && degerOf(k) === degerOf(u));
  }
  function oynanabilirler(S, id) { return (S.el[id] || []).filter(function (k) { return oynanabilir(S, id, k); }); }
  function bitir(S, id) { S.bitti = true; S.kazanan = id; S.sira = ""; }
  function siraGec(S, adim) { S.sira = sonrakiId(S, adim); S.cekti = false; S.cekilen = ""; }
  /* oyna: kart el'den atılır, etkisi uygulanır. o = { renk, hedef, uno } */
  function oyna(S0, id, k, o, rnd) {
    o = o || {}; var S = kopya(S0), oz = ozellik(S.mod);
    if (!oynanabilir(S, id, k)) throw new Error("olmaz");
    var el = S.el[id], i = el.indexOf(k); el.splice(i, 1); S.atik.push(k);
    var son = { u: id, t: "oyna", k: k }; S.son = son;
    S.renk = vahsi(k) ? (RENKLER.indexOf(o.renk) >= 0 ? o.renk : "r") : renkOf(k); if (vahsi(k)) son.renk = S.renk;
    var y = S.yok[id] || []; S.yok[id] = y.filter(function (r) { return r !== S.renk; });
    if (!el.length) { bitir(S, id); return S; }
    if (el.length === 1 && !o.uno) {                                      /* UNO demeyi unuttu: 2 ceza */
      for (var c = 0; c < 2; c++) { var x = cek1(S, rnd); if (x) el.push(x); }
      son.unoCeza = 2;
    } else if (el.length === 1) son.uno = true;
    var d = degerOf(k), n = S.oyuncular.length;
    if (d === "s") { son.ek = sonrakiId(S, 1); siraGec(S, 2); }
    else if (d === "r") { if (n === 2) siraGec(S, 2); else { S.yon = -S.yon; siraGec(S, 1); } }
    else if (d === "d" || d === "w4") {
      var m = d === "d" ? 2 : 4;
      if (oz.yigma) { S.ceza += m; siraGec(S, 1); son.ceza = S.ceza; }
      else { var kurban = sonrakiId(S, 1), L = S.el[kurban]; for (var j = 0; j < m; j++) { var z = cek1(S, rnd); if (z) L.push(z); } son.ek = kurban; son.n = m; siraGec(S, 2); }
    }
    else if (d === "7" && oz.yedisifir && n > 1) {
      var h = o.hedef && o.hedef !== id && S.el[o.hedef] ? o.hedef : enAzKartli(S, id);
      var t = S.el[id]; S.el[id] = S.el[h]; S.el[h] = t; son.hedef = h; siraGec(S, 1);
    }
    else if (d === "0" && oz.yedisifir && n > 1) {
      var eller = S.oyuncular.map(function (p) { return S.el[p]; }), yeni = {};
      S.oyuncular.forEach(function (p, ix) { var al = (((ix + S.yon) % n) + n) % n; yeni[S.oyuncular[al]] = eller[ix]; });
      S.el = yeni; son.donus = true; siraGec(S, 1);
    }
    else siraGec(S, 1);
    return S;
  }
  function enAzKartli(S, id) { var en = null; S.oyuncular.forEach(function (p) { if (p !== id && (!en || S.el[p].length < S.el[en].length)) en = p; }); return en; }
  /* çek: ceza varsa hepsini çeker, sıra geçer; yoksa 1 (ya da "çekene kadar" modunda oynanabilir çıkana kadar) */
  function cek(S0, id, rnd) {
    var S = kopya(S0), oz = ozellik(S.mod);
    if (S.bitti || S.sira !== id || S.cekti) throw new Error("olmaz");
    var el = S.el[id];
    if (S.ceza > 0) {
      var m = S.ceza; for (var i = 0; i < m; i++) { var x = cek1(S, rnd); if (x) el.push(x); }
      S.ceza = 0; S.son = { u: id, t: "ceza", n: m }; siraGec(S, 1); return S;
    }
    if (!oynanabilirler(S, id).length && S.yok[id].indexOf(S.renk) < 0) S.yok[id].push(S.renk);
    var cekilen = "", say = 0;
    do { cekilen = cek1(S, rnd); if (!cekilen) break; el.push(cekilen); say++; } while (oz.cek && !kartUyar(S, cekilen) && say < 60);
    S.cekti = true; S.cekilen = cekilen || ""; S.son = { u: id, t: "cek", n: say };
    if (!cekilen || !kartUyar(S, cekilen)) { S.son.gecti = true; siraGec(S, 1); }
    return S;
  }
  function kartUyar(S, k) { var u = ust(S); return vahsi(k) || renkOf(k) === S.renk || (!vahsi(u) && degerOf(k) === degerOf(u)); }
  function pas(S0, id) {
    var S = kopya(S0); if (S.bitti || S.sira !== id || !S.cekti) throw new Error("olmaz");
    S.son = { u: id, t: "pas" }; siraGec(S, 1); return S;
  }

  /* ---------- botlar ---------- */
  function renkSay(el) { var c = { r: 0, y: 0, g: 0, b: 0 }; el.forEach(function (k) { var r = renkOf(k); if (r) c[r]++; }); return c; }
  function enCokRenk(el, bonus) { var c = renkSay(el), en = "r", ev = -1; RENKLER.forEach(function (r) { var v = c[r] + ((bonus && bonus.indexOf(r) >= 0) ? 1.5 : 0); if (v > ev) { ev = v; en = r; } }); return en; }
  /* dönüş: { t: "oyna", k, renk, hedef, uno } | { t: "cek" } | { t: "pas" } */
  function botHamle(S, id, zorluk, rnd) {
    rnd = rnd || Math.random; var el = S.el[id], L = oynanabilirler(S, id), oz = ozellik(S.mod), n = S.oyuncular.length;
    if (!L.length) return S.cekti ? { t: "pas" } : { t: "cek" };
    var siradaki = sonrakiId(S, 1), tehlike = (S.el[siradaki] || []).length <= 2, zor = zorluk === "zor";
    function puan(k) {
      var d = degerOf(k), r = renkOf(k), kalan = el.slice(), p = 0; kalan.splice(kalan.indexOf(k), 1);
      var c = renkSay(kalan), yeniRenk = r || enCokRenk(kalan);
      if (!zor) {                                                                     /* orta: çoğunlukla gelişigüzel, biraz renk sayar */
        p = rnd() * 4 + (r ? c[r] * 0.4 : -1.5);
        if (tehlike && (d === "d" || d === "w4")) p += 2;
        return p;
      }
      var ekTur = n === 2 && (d === "s" || d === "r" || ((d === "d" || d === "w4") && !oz.yigma));
      if (vahsi(k)) p -= (kalan.length <= 1 ? -3 : 5);                                /* jokerleri sona sakla */
      p += c[yeniRenk] * 1.1;                                                         /* atınca elimde o renkten çok kalsın */
      if (ekTur) { p += 3; var takip = kalan.filter(function (x) { return vahsi(x) || renkOf(x) === yeniRenk || degerOf(x) === d; }).length; p += takip ? 2.5 : -1; }
      if (/^[0-9]$/.test(d)) p += +d * 0.05;
      if (tehlike && (d === "d" || d === "w4" || d === "s" || (d === "r" && n === 2))) p += 10;   /* bitirmek üzere olanı durdur */
      if ((S.yok[siradaki] || []).indexOf(yeniRenk) >= 0) p += 2.5;                  /* sıradakinde olmayan renge çevir */
      if (oz.yedisifir && d === "7") { var h = enAzKartli(S, id); p += S.el[h].length + 1 < kalan.length ? 7 : -4; }
      if (oz.yedisifir && d === "0") { var onceki = S.oyuncular[(((S.oyuncular.indexOf(id) - S.yon) % n) + n) % n]; p += S.el[onceki].length < kalan.length ? 5 : -5; }
      return p;
    }
    var en = L[0], ep = -1e9; L.forEach(function (k) { var p = puan(k); if (p > ep) { ep = p; en = k; } });
    if (S.ceza > 0 && !zor && rnd() < 0.3) return S.cekti ? { t: "pas" } : { t: "cek" };   /* orta bot bazen yığmaz */
    var kalan = el.filter(function (k, i) { return i !== el.indexOf(en); });
    var renk = vahsi(en) ? enCokRenk(kalan.length ? kalan : el, zor ? S.yok[siradaki] : null) : "";
    var hedef = degerOf(en) === "7" && oz.yedisifir ? enAzKartli(S, id) : "";
    var uno = el.length === 2 ? (zor ? true : rnd() < 0.8) : false;
    return { t: "oyna", k: en, renk: renk, hedef: hedef, sonkart: uno };
  }
  function uygula(S, id, h, rnd) { return h.t === "oyna" ? oyna(S, id, h.k, h, rnd) : h.t === "pas" ? pas(S, id) : cek(S, id, rnd); }

  var UK = { RENKLER: RENKLER, MODLAR: MODLAR, ozellik: ozellik, renkOf: renkOf, degerOf: degerOf, vahsi: vahsi, yeniDeste: yeniDeste, kur: kur, ust: ust, sonrakiId: sonrakiId,
    oynanabilir: oynanabilir, oynanabilirler: oynanabilirler, oyna: oyna, cek: cek, pas: pas, botHamle: botHamle, uygula: uygula, kartUyar: kartUyar };
  if (typeof module !== "undefined" && module.exports) module.exports = UK; else kok.SonKartKural = UK;
})(typeof window !== "undefined" ? window : this);
