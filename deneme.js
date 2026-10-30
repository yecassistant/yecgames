/* Deneme modu – siteyi buluta bağlanmadan, tek tarayıcıda iki cihaz gibi denemek için (?deneme=1).
   hesap.js'den ÖNCE yüklenir ve sahte bir "firebase" sunar: anonim giriş + Firestore benzeri, localStorage'da duran bir bulut (dn_store).
   Rol 1 ve rol 2 iki ayrı telefon sayılır: rol 2'nin bütün yerel kayıtları "r2:" önekiyle ayrılır; iki sekmede iki rolle oynanınca
   hamleler sekmeler arası canlı akar (storage olayı). Gerçek Firebase'e hiç bağlanmaz; hesap.js aynen çalışır (kurallar hariç). */
(function () {
  "use strict";
  if (!/[?&]deneme/.test(location.search)) return;
  var rol = "1"; try { rol = sessionStorage.getItem("dn_rol") === "2" ? "2" : "1"; } catch (e) {}
  var UID = "cihaz-" + rol, KEY = "dn_store", ONEK = rol === "2" ? "r2:" : "";
  /* ---- rol 2 için yerel kayıt ayrımı ---- */
  if (ONEK) try {
    var P = Storage.prototype, g = P.getItem, s = P.setItem, r = P.removeItem, k = P.key, LD = Object.getOwnPropertyDescriptor(P, "length");
    function ad(n) { return n === KEY ? n : ONEK + n; }
    function benim(n) { return n === KEY || n.indexOf(ONEK) === 0; }
    P.getItem = function (n) { return g.call(this, this === localStorage ? ad(n) : n); };
    P.setItem = function (n, v) { return s.call(this, this === localStorage ? ad(n) : n, v); };
    P.removeItem = function (n) { return r.call(this, this === localStorage ? ad(n) : n); };
    P.key = function (i) { if (this !== localStorage) return k.call(this, i); var all = [], j; for (j = 0; j < LD.get.call(this); j++) { var n = k.call(this, j); if (benim(n)) all.push(n === KEY ? n : n.slice(ONEK.length)); } return all[i] === undefined ? null : all[i]; };
    Object.defineProperty(P, "length", { configurable: true, get: function () { if (this !== localStorage) return LD.get.call(this); var c = 0, j; for (j = 0; j < LD.get.call(this); j++) if (benim(k.call(this, j))) c++; return c; } });
  } catch (e) {}

  /* ---- sahte bulut ---- */
  function oku() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function yaz(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function kopya(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function birles(a, b) { for (var k in b) { if (b[k] && typeof b[k] === "object" && !(b[k] instanceof Array) && a[k] && typeof a[k] === "object" && !(a[k] instanceof Array)) birles(a[k], b[k]); else a[k] = kopya(b[k]); } return a; }
  function noktaliYaz(o, yol, v) { var p = yol.split("."), i; for (i = 0; i < p.length - 1; i++) { if (!o[p[i]] || typeof o[p[i]] !== "object") o[p[i]] = {}; o = o[p[i]]; } if (v && v.__sil) delete o[p[p.length - 1]]; else o[p[p.length - 1]] = kopya(v); }
  var dinleyiciler = [], bildirimT = 0;
  function bildir() { clearTimeout(bildirimT); bildirimT = setTimeout(function () { dinleyiciler.slice().forEach(function (f) { try { f(); } catch (e) {} }); }, 0); }
  addEventListener("storage", function (e) { if (e.key === KEY) bildir(); });
  function dinle(f) { dinleyiciler.push(f); setTimeout(f, 0); return function () { var i = dinleyiciler.indexOf(f); if (i >= 0) dinleyiciler.splice(i, 1); }; }
  function docAl(path) { var st = oku(); return st.docs && st.docs[path]; }
  function docYaz(path, fn) { var st = oku(); st.docs = st.docs || {}; var v = fn(st.docs[path]); if (v === null) delete st.docs[path]; else st.docs[path] = v; yaz(st); bildir(); }
  function snapYap(ref) { var d = docAl(ref.path); return { id: ref.id, ref: ref, exists: !!d, data: function () { return d ? kopya(d) : undefined; } }; }
  function DocRef(path) {
    var self = { path: path, id: path.split("/").pop() };
    self.collection = function (n) { return ColRef(path + "/" + n); };
    self.get = function () { return Promise.resolve(snapYap(self)); };
    self.set = function (data, opts) { docYaz(path, function (eski) { if (opts && opts.merge && eski) return birles(eski, data); return kopya(data); }); return Promise.resolve(); };
    self.update = function (obj) { if (!docAl(path)) return Promise.reject({ code: "not-found", message: "not-found" }); docYaz(path, function (eski) { var o = eski || {}; for (var k in obj) noktaliYaz(o, k, obj[k]); return o; }); return Promise.resolve(); };
    self.delete = function () { docYaz(path, function () { return null; }); return Promise.resolve(); };
    self.onSnapshot = function (cb) { return dinle(function () { cb(snapYap(self)); }); };
    return self;
  }
  function ColRef(path, order, dir, lim) {
    function al() {
      var st = oku(), docs = st.docs || {}, items = [], p;
      for (p in docs) if (p.indexOf(path + "/") === 0 && p.slice(path.length + 1).indexOf("/") < 0) items.push({ ref: DocRef(p), d: docs[p] });
      if (order) items.sort(function (a, b) { var x = a.d[order] || 0, y = b.d[order] || 0; return dir === "desc" ? y - x : x - y; });
      if (lim) items = items.slice(0, lim);
      var L = items.map(function (it) { return { id: it.ref.id, ref: it.ref, exists: true, data: function () { return kopya(it.d); } }; });
      return { size: L.length, docs: L, empty: !L.length, forEach: function (fn) { L.forEach(fn); } };
    }
    return {
      path: path,
      doc: function (id) { return DocRef(path + "/" + (id || ("dn" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)))); },
      add: function (data) { var ref = this.doc(); return ref.set(data).then(function () { return ref; }); },
      orderBy: function (f, d) { return ColRef(path, f, d || "asc", lim); }, limit: function (n) { return ColRef(path, order, dir, n); },
      get: function () { return Promise.resolve(al()); },
      onSnapshot: function (cb) { return dinle(function () { cb(al()); }); }
    };
  }
  var db = {
    collection: function (n) { return ColRef(n); },
    doc: function (p) { return DocRef(p); },
    settings: function () {},
    batch: function () { var ops = []; var b = { set: function (ref, d, o) { ops.push(function () { return ref.set(d, o); }); return b; }, update: function (ref, d) { ops.push(function () { return ref.update(d); }); return b; }, delete: function (ref) { ops.push(function () { return ref.delete(); }); return b; }, commit: function () { return ops.reduce(function (p, op) { return p.then(op); }, Promise.resolve()); } }; return b; },
    runTransaction: function (fn) { var ops = []; var tx = { get: function (ref) { return ref.get(); }, set: function (ref, d, o) { ops.push(function () { return ref.set(d, o); }); }, update: function (ref, d) { ops.push(function () { return ref.update(d); }); }, delete: function (ref) { ops.push(function () { return ref.delete(); }); } }; return Promise.resolve(fn(tx)).then(function (r) { return ops.reduce(function (p, op) { return p.then(op); }, Promise.resolve()).then(function () { return r; }); }); }
  };
  var kullanici = { uid: UID, isAnonymous: true }, authCb = [];
  var auth = {
    currentUser: kullanici, languageCode: "tr",
    onAuthStateChanged: function (cb) { authCb.push(cb); setTimeout(function () { cb(auth.currentUser); }, 0); return function () {}; },
    signInAnonymously: function () { auth.currentUser = kullanici; authCb.forEach(function (cb) { setTimeout(function () { cb(kullanici); }, 0); }); return Promise.resolve({ user: kullanici }); },
    setPersistence: function () { return Promise.resolve(); }, signOut: function () { return Promise.resolve(); }
  };
  function firestore() { return db; }
  firestore.FieldValue = { serverTimestamp: function () { return Date.now(); }, delete: function () { return { __sil: true }; } };
  function authF() { return auth; } authF.Auth = { Persistence: { LOCAL: "local" } };
  window.firebase = { apps: [{}], app: function () { return {}; }, initializeApp: function () { return {}; }, auth: authF, firestore: firestore };
  window.YEC_FIREBASE = { apiKey: "deneme", authDomain: "deneme", projectId: "deneme", appId: "deneme" };
  window.__deneme = { rol: rol, uid: UID, store: oku, sifirla: function () { try { localStorage.removeItem(KEY); } catch (e) {} } };

  /* köşe rozeti: sol altta "D"; dokununca rol değiştir / sıfırla */
  function cubuk() {
    var b = document.createElement("div"); b.className = "dnbar"; b.setAttribute("role", "status");
    b.innerHTML = '<button type="button" id="dnBadge" aria-label="Deneme modu">D' + rol + '</button><div class="dnp"><b>DENEME</b><span>cihaz ' + rol + '</span><button type="button" id="dnRol">' + (rol === "1" ? "2. cihaza geç" : "1. cihaza geç") + '</button><button type="button" id="dnSifir">Sıfırla</button></div>';
    document.body.appendChild(b);
    var acikT = 0;
    b.querySelector("#dnBadge").onclick = function () { b.classList.toggle("open"); clearTimeout(acikT); if (b.classList.contains("open")) acikT = setTimeout(function () { b.classList.remove("open"); }, 6000); };
    b.querySelector("#dnRol").onclick = function () { try { sessionStorage.setItem("dn_rol", rol === "1" ? "2" : "1"); } catch (e) {} location.reload(); };
    b.querySelector("#dnSifir").onclick = function () { if (confirm("Deneme verisi silinsin mi?")) { try { localStorage.clear(); localStorage.removeItem(KEY); } catch (e) {} location.reload(); } };
    var css = document.createElement("style");
    css.textContent = ".dnbar{position:fixed;left:10px;bottom:max(10px,env(safe-area-inset-bottom));z-index:9999;display:flex;align-items:center;gap:8px;font:700 12px/1 Nunito,system-ui,sans-serif}" +
      ".dnbar #dnBadge{width:36px;height:36px;border-radius:50%;border:0;background:#f2c35b;color:#3b2a08;font:900 13px Nunito,system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.4),inset 0 0 0 2px rgba(255,255,255,.5);cursor:pointer}" +
      ".dnbar .dnp{display:none;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:#1b1020;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.18);white-space:nowrap}" +
      ".dnbar.open .dnp{display:flex}.dnbar b{color:#f2c35b;letter-spacing:.08em;font-size:10px}.dnbar span{color:#e9dcff}" +
      ".dnbar .dnp button{border:0;border-radius:999px;padding:6px 10px;background:#f2c35b;color:#3b2a08;font:800 12px Nunito,system-ui,sans-serif;cursor:pointer}.dnbar #dnSifir{background:rgba(255,255,255,.14);color:#fff}";
    document.head.appendChild(css);
  }
  if (document.body) cubuk(); else addEventListener("DOMContentLoaded", cubuk);
})();
