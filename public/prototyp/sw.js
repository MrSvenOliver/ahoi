// Ahoi – Service Worker
// App-Dateien: zuerst aus dem Netz (damit neue Stände sofort ankommen), ohne Netz aus dem Speicher.
// Schriften und Kartenbibliothek: aus dem Speicher, falls vorhanden (Kartenkacheln nicht, sonst wächst der Speicher endlos).
const SPEICHER = "ahoi-v1";
const KERN = ["./", "./index.html", "./manifest.webmanifest", "./laender-50m.geojson", "../icons/icon-192.png", "../icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SPEICHER).then(c => c.addAll(KERN)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== SPEICHER).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.endsWith("version.json")) return; // immer frisch
  const eigen = url.origin === location.origin;
  if (eigen) {
    e.respondWith(fetch(req).then(r => { const k = r.clone(); caches.open(SPEICHER).then(c => c.put(req, k)); return r; }).catch(() => caches.match(req, { ignoreSearch: true })));
  } else if (/fonts\.(googleapis|gstatic)\.com|unpkg\.com/.test(url.host)) {
    e.respondWith(caches.match(req).then(t => t || fetch(req).then(r => { if (r.ok) { const k = r.clone(); caches.open(SPEICHER).then(c => c.put(req, k)); } return r; })));
  }
});
