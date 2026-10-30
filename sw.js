/* YEC Games – hızlandırıcı (service worker).
   Ana ekrandan (uygulama gibi) açılınca her sayfa geçişinde css/js/yazı tipi/Firebase dosyaları yeniden indirilmesin diye telefonda saklar.
   - Sayfalar (html): önce ağ (en güncel sürüm), ağ 1,2 sn'de cevap vermezse ya da yoksa saklanan kopya → hem güncel hem hızlı.
   - Sürümlü dosyalar (?v=…), resimler, ses, Firebase SDK ve Google yazı tipleri: önce saklanan kopya, yoksa ağ.
   - Firestore / giriş istekleri hiç saklanmaz (canlı veri).
   Yeni sürüm yüklenince SURUM'u değiştirmek yeterli; eski saklananlar silinir. */
var SURUM = "yec-10";
var ONCE = ["oyunlar.html", "baslat.html", "manifest.webmanifest", "ikon/app-192.png", "ikon/logo-koyu.svg"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(SURUM).then(function (c) { return c.addAll(ONCE).catch(function () {}); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== SURUM; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function sakla(req, res) { if (res && (res.ok || res.type === "opaque")) { var k = res.clone(); caches.open(SURUM).then(function (c) { c.put(req, k); }); } return res; }
function oncedenSakli(req) {
  return caches.match(req).then(function (hit) {
    if (hit && /[?&]v=|firebasejs\/\d/.test(req.url)) return hit;           /* sürümlü dosya değişmez: ağa hiç gitme */
    var ag = fetch(req).then(function (res) { return sakla(req, res); });
    if (hit) { ag.catch(function () {}); return hit; }
    return ag;
  });
}
function onceAg(req) {
  return new Promise(function (resolve) {
    var bitti = false, zaman = setTimeout(function () { caches.match(req).then(function (hit) { if (hit && !bitti) { bitti = true; resolve(hit); } }); }, 1200);
    fetch(req).then(function (res) { sakla(req, res); if (!bitti) { bitti = true; clearTimeout(zaman); resolve(res); } })
      .catch(function () { caches.match(req).then(function (hit) { if (!bitti) { bitti = true; clearTimeout(zaman); resolve(hit || Response.error()); } }); });
  });
}
self.addEventListener("fetch", function (e) {
  var req = e.request; if (req.method !== "GET") return;
  var u = new URL(req.url);
  if (/firestore\.googleapis|identitytoolkit|securetoken|googleapis\.com\/(v1|identitytoolkit)/.test(u.href)) return;   /* canlı veri: dokunma */
  if (u.origin === self.location.origin) {
    if (req.mode === "navigate" || /\.html$|\/$/.test(u.pathname)) { e.respondWith(onceAg(req)); return; }
    if (/\.(js|css|png|jpg|jpeg|webp|svg|gif|mp3|wav|webmanifest|woff2?|glb)$/.test(u.pathname)) { e.respondWith(oncedenSakli(req)); return; }
    return;
  }
  if (/www\.gstatic\.com\/firebasejs\/|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(u.href)) { e.respondWith(oncedenSakli(req)); return; }
});
