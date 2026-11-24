// Ahoi – Service Worker
// App-Dateien: zuerst aus dem Netz (damit neue Stände sofort ankommen), ohne Netz aus dem Speicher.
// Schriften und Kartenbibliothek: aus dem Speicher, falls vorhanden (Kartenkacheln nicht, sonst wächst der Speicher endlos).
const SPEICHER = "ahoi-v1";
const KERN = ["./", "./index.html", "./texte.js", "./basis.js", "./start.js", "./app.js", "./supabase.js", "./weltkarte.json", "./manifest.webmanifest", "./laender-50m.geojson", "../icons/icon-192.png", "../icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  // Einzeln speichern: fehlt eine Datei, soll der Service Worker trotzdem laufen (sonst kein Push)
  e.waitUntil(caches.open(SPEICHER).then(c => Promise.all(KERN.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
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

// Push-Mitteilungen: zeigen und beim Antippen die App am richtigen Ort öffnen (Chat oder Ort-Frage)
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "Ahoi", body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Ahoi", {
    body: d.body || "", tag: d.tag || undefined, renotify: !!d.tag, icon: "../icons/icon-192.png", badge: "../icons/icon-192.png", data: { url: d.url || self.registration.scope }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const ziel = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(fenster => {
    const offen = fenster.find(f => f.url.startsWith(self.registration.scope));
    if (offen) { offen.postMessage({ ziel }); return offen.focus(); }
    return self.clients.openWindow(ziel);
  }));
});
