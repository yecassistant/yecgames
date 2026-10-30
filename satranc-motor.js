/* Satranç motoru – kural seti (hamle üretimi, şah/mat/pat, rok, geçerken alma, terfi, 50 hamle, üç tekrar, yetersiz materyal).
   Tahta: 64 elemanlı dizi, 0 = a8 … 7 = h8, 56 = a1 … 63 = h1. Beyaz taşlar büyük harf (P N B R Q K), siyah küçük, boş "".
   Durum: { b: tahta, w: sıra ("w"/"b"), c: rok hakları {K,Q,k,q}, ep: geçerken alma karesi (-1 yok), h: yarım hamle sayacı, n: hamle no }
   Hamle: { f: kaynak, t: hedef, p: terfi taşı ("q","r","b","n" ya da ""), x: alınan taş, e: geçerken alma, k: rok ("K"/"Q"/"") }
   Hem tarayıcıda (window.SatrancMotor) hem Node'da (module.exports) çalışır; test için perft var. */
(function (root) {
  "use strict";
  var BASLANGIC = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  var FILE = "abcdefgh";
  function kare(i) { return FILE.charAt(i & 7) + (8 - (i >> 3)); }
  function idx(s) { return (8 - +s.charAt(1)) * 8 + FILE.indexOf(s.charAt(0)); }
  function beyazMi(p) { return p !== "" && p === p.toUpperCase(); }
  function fenOku(fen) {
    var parts = fen.split(/\s+/), rows = parts[0].split("/"), b = [], i, j, c;
    for (i = 0; i < 8; i++) for (j = 0; j < rows[i].length; j++) { c = rows[i].charAt(j); if (c >= "1" && c <= "8") { for (var k = 0; k < +c; k++) b.push(""); } else b.push(c); }
    var cs = parts[2] || "-";
    return { b: b, w: parts[1] === "b" ? "b" : "w", c: { K: cs.indexOf("K") >= 0, Q: cs.indexOf("Q") >= 0, k: cs.indexOf("k") >= 0, q: cs.indexOf("q") >= 0 }, ep: parts[3] && parts[3] !== "-" ? idx(parts[3]) : -1, h: +(parts[4] || 0), n: +(parts[5] || 1) };
  }
  function fenYaz(st) {
    var out = "", i, bos;
    for (var r = 0; r < 8; r++) { bos = 0; for (var f = 0; f < 8; f++) { i = r * 8 + f; if (st.b[i] === "") bos++; else { if (bos) { out += bos; bos = 0; } out += st.b[i]; } } if (bos) out += bos; if (r < 7) out += "/"; }
    var cs = (st.c.K ? "K" : "") + (st.c.Q ? "Q" : "") + (st.c.k ? "k" : "") + (st.c.q ? "q" : "");
    return out + " " + st.w + " " + (cs || "-") + " " + (st.ep >= 0 ? kare(st.ep) : "-") + " " + st.h + " " + st.n;
  }
  function kopya(st) { return { b: st.b.slice(), w: st.w, c: { K: st.c.K, Q: st.c.Q, k: st.c.k, q: st.c.q }, ep: st.ep, h: st.h, n: st.n }; }

  var AT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  var SAH = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var FIL = [[-1, -1], [-1, 1], [1, -1], [1, 1]], KALE = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  /* sq karesine beyaz (byWhite=true) ya da siyah saldırıyor mu? */
  function saldiri(b, sq, byWhite) {
    var r = sq >> 3, f = sq & 7, i, d, rr, ff, p;
    var pawn = byWhite ? "P" : "p", pr = byWhite ? r + 1 : r - 1;
    if (pr >= 0 && pr < 8) { if (f > 0 && b[pr * 8 + f - 1] === pawn) return true; if (f < 7 && b[pr * 8 + f + 1] === pawn) return true; }
    for (i = 0; i < 8; i++) { rr = r + AT[i][0]; ff = f + AT[i][1]; if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && b[rr * 8 + ff] === (byWhite ? "N" : "n")) return true; }
    for (i = 0; i < 8; i++) { rr = r + SAH[i][0]; ff = f + SAH[i][1]; if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && b[rr * 8 + ff] === (byWhite ? "K" : "k")) return true; }
    for (i = 0; i < 4; i++) {
      d = FIL[i]; rr = r + d[0]; ff = f + d[1];
      while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) { p = b[rr * 8 + ff]; if (p !== "") { if (byWhite ? (p === "B" || p === "Q") : (p === "b" || p === "q")) return true; break; } rr += d[0]; ff += d[1]; }
      d = KALE[i]; rr = r + d[0]; ff = f + d[1];
      while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) { p = b[rr * 8 + ff]; if (p !== "") { if (byWhite ? (p === "R" || p === "Q") : (p === "r" || p === "q")) return true; break; } rr += d[0]; ff += d[1]; }
    }
    return false;
  }
  function sahKaresi(b, white) { var k = white ? "K" : "k"; for (var i = 0; i < 64; i++) if (b[i] === k) return i; return -1; }
  function sahta(st, white) { var k = sahKaresi(st.b, white); return k >= 0 && saldiri(st.b, k, !white); }

  /* yarı-geçerli hamleler */
  function hamOlustur(st) {
    var b = st.b, white = st.w === "w", out = [], i, p, r, f, rr, ff, j, d, q;
    function ekle(from, to, extra) { var m = { f: from, t: to, p: "", x: b[to], e: false, k: "" }; if (extra) for (var key in extra) m[key] = extra[key]; out.push(m); }
    function dusman(x) { return x !== "" && beyazMi(x) !== white; }
    for (i = 0; i < 64; i++) {
      p = b[i]; if (p === "" || beyazMi(p) !== white) continue;
      r = i >> 3; f = i & 7; var pl = p.toLowerCase();
      if (pl === "p") {
        var dir = white ? -1 : 1, start = white ? 6 : 1, last = white ? 0 : 7; rr = r + dir;
        if (rr >= 0 && rr < 8) {
          if (b[rr * 8 + f] === "") {
            if (rr === last) ["q", "r", "b", "n"].forEach(function (pp) { ekle(i, rr * 8 + f, { p: pp }); }); else ekle(i, rr * 8 + f);
            if (r === start && b[(r + 2 * dir) * 8 + f] === "") ekle(i, (r + 2 * dir) * 8 + f);
          }
          for (j = -1; j <= 1; j += 2) {
            ff = f + j; if (ff < 0 || ff > 7) continue; q = rr * 8 + ff;
            if (dusman(b[q])) { if (rr === last) ["q", "r", "b", "n"].forEach(function (pp) { ekle(i, q, { p: pp }); }); else ekle(i, q); }
            else if (q === st.ep) ekle(i, q, { e: true, x: white ? "p" : "P" });
          }
        }
      } else if (pl === "n") {
        for (j = 0; j < 8; j++) { rr = r + AT[j][0]; ff = f + AT[j][1]; if (rr < 0 || rr > 7 || ff < 0 || ff > 7) continue; q = rr * 8 + ff; if (b[q] === "" || dusman(b[q])) ekle(i, q); }
      } else if (pl === "k") {
        for (j = 0; j < 8; j++) { rr = r + SAH[j][0]; ff = f + SAH[j][1]; if (rr < 0 || rr > 7 || ff < 0 || ff > 7) continue; q = rr * 8 + ff; if (b[q] === "" || dusman(b[q])) ekle(i, q); }
        /* rok: haklar, aradaki kareler boş, şah şahta değil, geçtiği ve vardığı kare saldırı altında değil */
        var home = white ? 60 : 4;
        if (i === home && !saldiri(b, home, !white)) {
          if ((white ? st.c.K : st.c.k) && b[home + 1] === "" && b[home + 2] === "" && b[home + 3] === (white ? "R" : "r") && !saldiri(b, home + 1, !white) && !saldiri(b, home + 2, !white)) ekle(i, home + 2, { k: "K" });
          if ((white ? st.c.Q : st.c.q) && b[home - 1] === "" && b[home - 2] === "" && b[home - 3] === "" && b[home - 4] === (white ? "R" : "r") && !saldiri(b, home - 1, !white) && !saldiri(b, home - 2, !white)) ekle(i, home - 2, { k: "Q" });
        }
      } else {
        var dirs = pl === "b" ? FIL : pl === "r" ? KALE : FIL.concat(KALE);
        for (j = 0; j < dirs.length; j++) {
          d = dirs[j]; rr = r + d[0]; ff = f + d[1];
          while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) { q = rr * 8 + ff; if (b[q] === "") ekle(i, q); else { if (dusman(b[q])) ekle(i, q); break; } rr += d[0]; ff += d[1]; }
        }
      }
    }
    return out;
  }
  function uygula(st, m) {
    var s = kopya(st), b = s.b, p = b[m.f], white = s.w === "w", pl = p.toLowerCase();
    s.ep = -1;
    if (pl === "p" || m.x !== "") s.h = 0; else s.h++;
    b[m.t] = m.p ? (white ? m.p.toUpperCase() : m.p) : p; b[m.f] = "";
    if (m.e) b[m.t + (white ? 8 : -8)] = "";
    if (pl === "p" && Math.abs(m.t - m.f) === 16) s.ep = (m.f + m.t) / 2;
    if (m.k === "K") { b[m.t + 1] = ""; b[m.t - 1] = white ? "R" : "r"; }
    if (m.k === "Q") { b[m.t - 2] = ""; b[m.t + 1] = white ? "R" : "r"; }
    if (pl === "k") { if (white) { s.c.K = false; s.c.Q = false; } else { s.c.k = false; s.c.q = false; } }
    if (m.f === 63 || m.t === 63) s.c.K = false; if (m.f === 56 || m.t === 56) s.c.Q = false;
    if (m.f === 7 || m.t === 7) s.c.k = false; if (m.f === 0 || m.t === 0) s.c.q = false;
    if (!white) s.n++;
    s.w = white ? "b" : "w";
    return s;
  }
  function hamleler(st) {
    var ham = hamOlustur(st), out = [], white = st.w === "w";
    for (var i = 0; i < ham.length; i++) { var s = uygula(st, ham[i]); if (!sahta(s, white)) out.push(ham[i]); }
    return out;
  }
  function yetersiz(b) {
    var n = 0, i, p, bish = [], kn = 0;
    for (i = 0; i < 64; i++) { p = b[i]; if (p === "" || p.toLowerCase() === "k") continue; var pl = p.toLowerCase(); if (pl === "p" || pl === "r" || pl === "q") return false; n++; if (pl === "n") kn++; else bish.push(((i >> 3) + (i & 7)) & 1); }
    if (n === 0) return true;
    if (n === 1) return true;                                                  /* K+B / K+N */
    if (kn === 0) { for (i = 1; i < bish.length; i++) if (bish[i] !== bish[0]) return false; return true; }   /* aynı renk karelerde filler */
    return false;
  }
  function anahtar(st) { return st.b.map(function (x) { return x || "."; }).join("") + st.w + (st.c.K ? "K" : "") + (st.c.Q ? "Q" : "") + (st.c.k ? "k" : "") + (st.c.q ? "q" : "") + st.ep; }
  /* durum: "" | "sah" | "mat" | "pat" | "yetersiz" | "50" ; tekrar üç kez oluşumu çağıran taraf geçmişten bakar */
  function durum(st, legal) {
    var white = st.w === "w", sah = sahta(st, white);
    if (!legal.length) return sah ? "mat" : "pat";
    if (yetersiz(st.b)) return "yetersiz";
    if (st.h >= 100) return "50";
    return sah ? "sah" : "";
  }
  /* hamle metni: "e2e4", terfi "e7e8q" */
  function hamleYaz(m) { return kare(m.f) + kare(m.t) + (m.p || ""); }
  function hamleBul(legal, txt) { for (var i = 0; i < legal.length; i++) if (hamleYaz(legal[i]) === txt) return legal[i]; return null; }
  /* cebirsel gösterim (Türkçe harfler: Ş V K F A) */
  var TR = { k: "Ş", q: "V", r: "K", b: "F", n: "A", p: "" };
  function san(st, m, legal) {
    if (m.k === "K") return "O-O"; if (m.k === "Q") return "O-O-O";
    var p = st.b[m.f].toLowerCase(), s = TR[p], i, amb = [], o;
    if (p !== "p") {
      for (i = 0; i < legal.length; i++) { o = legal[i]; if (o.t === m.t && o.f !== m.f && st.b[o.f].toLowerCase() === p) amb.push(o.f); }
      if (amb.length) {
        var sameFile = false, sameRank = false;
        for (i = 0; i < amb.length; i++) { if ((amb[i] & 7) === (m.f & 7)) sameFile = true; if ((amb[i] >> 3) === (m.f >> 3)) sameRank = true; }
        if (!sameFile) s += FILE.charAt(m.f & 7); else if (!sameRank) s += (8 - (m.f >> 3)); else s += kare(m.f);
      }
    } else if (m.x !== "") s += FILE.charAt(m.f & 7);
    if (m.x !== "") s += "x";
    s += kare(m.t);
    if (m.p) s += "=" + TR[m.p];
    var after = uygula(st, m), al = hamleler(after), d = durum(after, al);
    if (d === "mat") s += "#"; else if (sahta(after, after.w === "w")) s += "+";
    return s;
  }
  /* hamle listesinden konumu kur; geçersiz hamlede null döner */
  function oyna(moves, baslangicFen) {
    var st = fenOku(baslangicFen || BASLANGIC), hist = [anahtar(st)], sanlar = [], son = null;
    for (var i = 0; i < moves.length; i++) {
      var legal = hamleler(st), m = hamleBul(legal, moves[i]);
      if (!m) return null;
      sanlar.push(san(st, m, legal)); son = m; st = uygula(st, m); hist.push(anahtar(st));
    }
    var legal2 = hamleler(st), d = durum(st, legal2);
    if (d !== "mat" && d !== "pat") { var k = hist[hist.length - 1], c = 0; for (var j = 0; j < hist.length; j++) if (hist[j] === k) c++; if (c >= 3) d = "tekrar"; }
    return { st: st, legal: legal2, durum: d, san: sanlar, son: son, hist: hist };
  }
  function perft(st, depth) { if (depth === 0) return 1; var l = hamleler(st), n = 0; for (var i = 0; i < l.length; i++) n += depth === 1 ? 1 : perft(uygula(st, l[i]), depth - 1); return n; }
  var M = { BASLANGIC: BASLANGIC, kare: kare, idx: idx, fenOku: fenOku, fenYaz: fenYaz, hamleler: hamleler, uygula: uygula, durum: durum, sahta: sahta, san: san, hamleYaz: hamleYaz, hamleBul: hamleBul, oyna: oyna, perft: perft, beyazMi: beyazMi, yetersiz: yetersiz, sahKaresi: sahKaresi };
  if (typeof module !== "undefined" && module.exports) module.exports = M; else root.SatrancMotor = M;
})(typeof window !== "undefined" ? window : this);
