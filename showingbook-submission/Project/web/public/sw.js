// Caches the app shell so ShowingBook opens quickly and installs as a PWA.
// API calls (/api/...) are never cached: data always comes from the server.
var C = 'showingbook-v3';
var SHELL = ['./', 'index.html', 'css/styles.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
  'js/theme-init.js', 'js/main.js', 'js/config.js', 'js/constants.js', 'js/util.js', 'js/api.js', 'js/store.js', 'js/router.js', 'js/dialog.js',
  'js/messages.js', 'js/theme.js', 'js/pwa.js', 'js/auth.js',
  'js/views/calendar.js', 'js/views/leads.js', 'js/views/listings.js', 'js/views/tasks.js', 'js/views/reports.js', 'js/views/team.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(C).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) {
    return Promise.all(k.filter(function (x) { return x !== C; }).map(function (x) { return caches.delete(x); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request, url = new URL(r.url);
  if (r.method !== 'GET' || url.pathname.indexOf('/api/') === 0) return;
  // Network first (so updates arrive), cache as the offline fallback.
  e.respondWith(fetch(r).then(function (res) {
    if (res && res.ok && url.origin === location.origin) { var cp = res.clone(); caches.open(C).then(function (c) { c.put(r, cp); }); }
    return res;
  }).catch(function () { return caches.match(r).then(function (hit) { return hit || caches.match('index.html'); }); }));
});
