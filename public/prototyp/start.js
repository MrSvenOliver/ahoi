// Ahoi – Start: im Prototyp sofort die App laden; in der echten App erst Anmeldung, Freigabe und Standort
const SB_URL = "https://zsmulyttciqruuqrcebv.supabase.co";
const SB_KEY = "sb_publishable_o5czNn9EsdZkQzMapyWBtw_QooxP6Zt"; // öffentlicher Schlüssel, die Sicherheitsregeln schützen die Daten
let SB = null, ECHT_DATEN = null;
const maske = s => String(s ?? "").replace(/[&<>"']/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[z]);

function skriptLaden(src) {
  return new Promise((ok, fehler) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = fehler; document.body.appendChild(s); });
}
// Stand der Veröffentlichung: hängt an jeder Datei, damit das iPhone nie alte und neue Dateien mischt
const STAND = "__VERSION__";
function appLaden() { return skriptLaden("app.js?v=" + STAND); }

// ---------- Zugangs-Bildschirme ----------
const zugang = () => document.getElementById("zugang");
function zeige(name) {
  zugang().classList.add("offen");
  zugang().querySelectorAll(".zugang-teil").forEach(el => el.hidden = el.dataset.teil !== name);
  const fehler = zugang().querySelector(`[data-teil="${name}"] .zugang-fehler`); if (fehler) fehler.textContent = "";
  document.getElementById("start").classList.add("weg");
}
function fehlerZeigen(teil, text) { const el = zugang().querySelector(`[data-teil="${teil}"] .zugang-fehler`); if (el) el.textContent = text; }
function fehlerText(e) {
  const m = String(e && (e.message || e.error_description || e) || "");
  if (/invalid login credentials/i.test(m)) return t("E-Mail oder Passwort stimmt nicht.");
  if (/already registered|already been registered|exists/i.test(m)) return t("Für diese E-Mail gibt es schon ein Konto. Melde dich an.");
  if (/database error saving new user|Einladung/i.test(m)) return t("Der Einladungslink ist ungültig oder abgelaufen. Bitte um einen neuen.");
  if (/password/i.test(m) && /(short|least|characters)/i.test(m)) return t("Das Passwort ist zu kurz (mindestens 8 Zeichen).");
  if (/email/i.test(m) && /invalid/i.test(m)) return t("Bitte eine gültige E-Mail-Adresse eingeben.");
  if (/rate limit|too many/i.test(m)) return t("Zu viele Versuche. Bitte kurz warten.");
  if (/fetch|network|load failed/i.test(m)) return t("Keine Verbindung. Bitte Internet prüfen.");
  return t("Das hat nicht geklappt. Bitte nochmal versuchen.");
}
function beschaeftigt(knopf, an) { knopf.disabled = an; knopf.classList.toggle("laedt", an); }

// ---------- Standort: Stadt ermitteln (Photon, Daten aus OpenStreetMap) ----------
const PHOTON = "https://photon.komoot.io";
const photonSprache = () => ({ de: "de", en: "en" }[SPRACHE] || "default");
function ortAusMerkmalen(pr) {
  const ort = pr.city || (["city", "town", "village"].includes(pr.osm_value) ? pr.name : "") || pr.town || pr.village || pr.district || pr.county || pr.name || "";
  return { ort, land: pr.countrycode ? pr.countrycode.toUpperCase() : null };
}
// Stadt-genau: Mittelpunkt der Stadt statt des genauen Standorts
async function stadtMitte(ort, land, lat, lon) {
  try {
    const u = `${PHOTON}/api/?q=${encodeURIComponent(ort)}&lat=${lat}&lon=${lon}&limit=5&osm_tag=place&lang=${photonSprache()}`;
    const j = await (await fetch(u)).json();
    const f = (j.features || []).find(f => (f.properties.countrycode || "").toUpperCase() === land && ["city", "town", "village", "municipality"].includes(f.properties.osm_value));
    if (f) return { lat: +f.geometry.coordinates[1].toFixed(4), lon: +f.geometry.coordinates[0].toFixed(4) };
  } catch (e) {}
  return { lat: Math.round(lat * 10) / 10, lon: Math.round(lon * 10) / 10 };
}
function geraetePosition() {
  return new Promise((ok, fehler) => {
    if (!navigator.geolocation) return fehler(new Error("kein GPS"));
    navigator.geolocation.getCurrentPosition(p => ok(p.coords), fehler, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  });
}
async function standortErmitteln() {
  const c = await geraetePosition();
  const j = await (await fetch(`${PHOTON}/reverse?lat=${c.latitude}&lon=${c.longitude}&lang=${photonSprache()}`)).json();
  const pr = (j.features && j.features[0] && j.features[0].properties) || {};
  const { ort, land } = ortAusMerkmalen(pr);
  if (!ort || !/^[A-Z]{2}$/.test(land)) throw new Error("Ort unbekannt");
  const mitte = await stadtMitte(ort, land, c.latitude, c.longitude);
  return { ort, land, ...mitte };
}
// Große Städte mit Sonderstatus (Tokio = Präfektur, Kuala Lumpur = Bundesterritorium) führt OpenStreetMap nicht als „city“,
// Photon kennzeichnet sie aber mit type „city“. Mit mitLaendern (nur bei Reisen) sind auch ganze Länder wählbar, Ort noch offen.
const ORT_ARTEN = ["city", "town", "village", "municipality", "hamlet", "suburb", "island"];
async function orteSuchen(text, mitLaendern) {
  const j = await (await fetch(`${PHOTON}/api/?q=${encodeURIComponent(text)}&limit=12&osm_tag=place&lang=${photonSprache()}`)).json();
  const gesehen = new Set();
  return (j.features || []).filter(f => f.properties.countrycode && (ORT_ARTEN.includes(f.properties.osm_value) || f.properties.type === "city" || (mitLaendern && f.properties.osm_value === "country"))).map(f => {
    const pr = f.properties, land = pr.countrycode.toUpperCase();
    if (pr.osm_value === "country") return { ort: pr.name, land, lat: null, lon: null, ganzesLand: true, zusatz: t("Ganzes Land · Ort noch offen") };
    return { ort: pr.name, land, lat: +f.geometry.coordinates[1].toFixed(4), lon: +f.geometry.coordinates[0].toFixed(4), zusatz: [pr.state !== pr.name ? pr.state : null, pr.country].filter(Boolean).join(", ") };
  }).filter(o => { const k = o.ort + o.land; if (gesehen.has(k)) return false; gesehen.add(k); return true; })
    .sort((a, b) => (b.ganzesLand ? 1 : 0) - (a.ganzesLand ? 1 : 0)).slice(0, 7);
}
async function standortSpeichern(o) {
  const zeitzone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const { error } = await SB.from("profile").update({ ort: o.ort, land: o.land, lat: o.lat, lon: o.lon, zeitzone, standort_am: new Date().toISOString() }).eq("id", ECHT_DATEN.uid);
  if (error) throw error;
  Object.assign(ECHT_DATEN.profil, { ort: o.ort, land: o.land, lat: o.lat, lon: o.lon, zeitzone });
}

// ---------- Profilfoto: quadratisch zuschneiden, verkleinern, hochladen ----------
async function fotoHochladen(datei) {
  const bild = await createImageBitmap(datei).catch(() => new Promise((ok, fehler) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fehler; i.src = URL.createObjectURL(datei); }));
  const seite = Math.min(bild.width, bild.height), groesse = 480, c = document.createElement("canvas");
  c.width = c.height = groesse;
  c.getContext("2d").drawImage(bild, (bild.width - seite) / 2, (bild.height - seite) / 2, seite, seite, 0, 0, groesse, groesse);
  const blob = await new Promise(ok => c.toBlob(ok, "image/jpeg", 0.85));
  const pfad = `${ECHT_DATEN.uid}/foto-${Date.now()}.jpg`, alt = ECHT_DATEN.profil.foto;
  const { error } = await SB.storage.from("profilbilder").upload(pfad, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  const r = await SB.from("profile").update({ foto: pfad }).eq("id", ECHT_DATEN.uid);
  if (r.error) throw r.error;
  if (alt) SB.storage.from("profilbilder").remove([alt]).catch(() => {});
  ECHT_DATEN.profil.foto = pfad;
  const { data } = await SB.storage.from("profilbilder").createSignedUrl(pfad, 86400);
  return data && data.signedUrl;
}

// ---------- Daten laden ----------
function farbeVon(id) {
  const farben = ["#c0582f", "#3f6b8a", "#6f8a3a", "#4f7a6a", "#a8467a", "#b98a2e", "#5a6fa0", "#8a5a33", "#2f7a7a", "#9a4f8f"];
  let h = 0; for (const z of id) h = (h * 31 + z.charCodeAt(0)) >>> 0;
  return farben[h % farben.length];
}
async function profilLaden() {
  // Eigenes Profil über die geschützte Ansicht (die Tabelle selbst gibt keine Orte heraus)
  const { data, error } = await SB.from("wer_ist_wo").select("*").eq("id", ECHT_DATEN.uid).maybeSingle();
  if (error) throw error;
  ECHT_DATEN.profil = data;
  return data;
}
// Alle sichtbaren Mitglieder; ohne Standort (oder im Geistermodus) erscheinen sie nicht auf der Karte
async function leuteLaden() {
  const { data, error } = await SB.from("wer_ist_wo").select("*");
  if (error) throw error;
  const pfade = data.filter(r => r.foto).map(r => r.foto), urls = {};
  if (pfade.length) {
    const r = await SB.storage.from("profilbilder").createSignedUrls(pfade, 86400);
    (r.data || []).forEach(d => { if (d.signedUrl) urls[d.path] = d.signedUrl; });
  }
  const alle = data.map(r => ({ id: r.id === ECHT_DATEN.uid ? "du" : r.id, uid: r.id, name: r.id === ECHT_DATEN.uid ? t("Du") : r.name || "?", echterName: r.name, ort: r.ort, land: r.land, lat: r.lat, lon: r.lon, tz: r.zeitzone || "UTC", farbe: farbeVon(r.id), statusRoh: r.status, bild: urls[r.foto] || null, geist: r.geist, stand: r.standort_am }));
  ECHT_DATEN.alle = alle; // auch Mitglieder ohne Ort (für Reisen und Namen)
  const liste = alle.filter(p => p.lat != null && p.lon != null && p.land);
  liste.sort((a, b) => (a.id === "du" ? -1 : b.id === "du" ? 1 : 0));
  ECHT_DATEN.leute = liste;
  return liste;
}

// ---------- Ablauf ----------
async function weiter() {
  const p = await profilLaden();
  if (!p) return zeige("kein-zugang");
  if (!p.freigegeben) return zeige("warten");
  if (p.art === "familie") {
    // Familie: kein Ort, kein erster Start; sieht nur die Nomaden, die sie eingeladen haben
    await leuteLaden();
    if (!ECHT_DATEN.leute.some(x => x.id === "du")) ECHT_DATEN.leute.unshift({ id: "du", uid: p.id, name: t("Du"), echterName: p.name, ort: null, land: null, lat: null, lon: null, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", farbe: farbeVon(p.id), statusRoh: null, bild: null });
    zugang().classList.remove("offen");
    return appLaden();
  }
  if (p.lat == null && !p.geist) return ersterStart();
  await leuteLaden();
  if (!ECHT_DATEN.leute.some(x => x.id === "du")) {
    // Geistermodus: man selbst erscheint trotzdem für sich an seinem letzten Ort
    if (p.lat == null) return ersterStart();
    ECHT_DATEN.leute.unshift({ id: "du", uid: p.id, name: t("Du"), echterName: p.name, ort: p.ort, land: p.land, lat: p.lat, lon: p.lon, tz: p.zeitzone || "UTC", farbe: farbeVon(p.id), statusRoh: p.status, bild: null, geist: true });
  }
  zugang().classList.remove("offen");
  await appLaden();
}

function ersterStart() {
  zeige("erster-start");
  const ok = document.getElementById("es-weiter"), ortText = document.getElementById("es-ort");
  ortText.textContent = ECHT_DATEN.profil.ort ? `${ECHT_DATEN.profil.ort}` : "";
  ok.disabled = !ECHT_DATEN.profil.ort;
}

async function echtStarten() {
  document.getElementById("start").classList.remove("weg");
  try { await skriptLaden("supabase.js?v=" + STAND); } catch (e) { zeige("anmelden"); return fehlerZeigen("anmelden", t("Keine Verbindung. Bitte Internet prüfen.")); }
  SB = supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "ahoi-anmeldung" } });
  ECHT_DATEN = { uid: null, profil: null, leute: [] };
  // Einladungslink: …/ahoi/?einladung=CODE
  const q = new URLSearchParams(location.search), code = q.get("einladung");
  if (code) { try { localStorage.setItem("ahoi-einladung", code); } catch (e) {} history.replaceState(null, "", location.pathname); }
  let gespeicherterCode = null; try { gespeicherterCode = localStorage.getItem("ahoi-einladung"); } catch (e) {}
  const { data } = await SB.auth.getSession();
  if (data.session) {
    ECHT_DATEN.uid = data.session.user.id;
    ECHT_DATEN.email = data.session.user.email;
    try { await weiter(); } catch (e) { zeige("anmelden"); fehlerZeigen("anmelden", fehlerText(e)); }
    return;
  }
  if (gespeicherterCode) return registrierungZeigen(gespeicherterCode);
  zeige("anmelden");
}

async function registrierungZeigen(code) {
  zeige("registrieren");
  const titel = document.getElementById("reg-titel"), knopf = document.getElementById("reg-knopf");
  if (code === "start") { titel.textContent = t("Erstes Konto"); document.getElementById("reg-unter").textContent = t("Das erste Konto verwaltet Ahoi und gibt neue Freunde frei."); return; }
  titel.textContent = t("Willkommen bei Ahoi");
  knopf.disabled = true;
  try {
    const { data: info, error } = await SB.rpc("einladung_info", { c: code });
    if (error) throw error;
    const data = info && info.name;
    if (!data) { try { localStorage.removeItem("ahoi-einladung"); } catch (e) {} fehlerZeigen("registrieren", t("Der Einladungslink ist ungültig oder abgelaufen. Bitte um einen neuen.")); return; }
    document.getElementById("reg-unter").textContent = info.art === "familie"
      ? t("{name} möchte dir zeigen, wo {name} gerade ist und wohin die Reise geht. Du brauchst nur Name, E-Mail und ein Passwort.", { name: data })
      : info.frei ? t("{name} lädt dich ein. Leg dein Konto an, dann bist du sofort dabei.", { name: data })
      : t("{name} lädt dich ein. Leg dein Konto an, danach gibt Sven dich frei.", { name: data });
    knopf.disabled = false;
  } catch (e) { fehlerZeigen("registrieren", fehlerText(e)); }
}

// ---------- Formulare ----------
function formulareVerbinden() {
  document.getElementById("form-anmelden").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, knopf = f.querySelector("button[type=submit]");
    beschaeftigt(knopf, true);
    try {
      const { data, error } = await SB.auth.signInWithPassword({ email: f.email.value.trim(), password: f.passwort.value });
      if (error) throw error;
      ECHT_DATEN.uid = data.user.id; ECHT_DATEN.email = data.user.email;
      await weiter();
    } catch (err) { fehlerZeigen("anmelden", fehlerText(err)); }
    beschaeftigt(knopf, false);
  });
  document.getElementById("form-registrieren").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, knopf = f.querySelector("button[type=submit]");
    let code = null; try { code = localStorage.getItem("ahoi-einladung"); } catch (err) {}
    if (f.passwort.value.length < 8) return fehlerZeigen("registrieren", t("Das Passwort ist zu kurz (mindestens 8 Zeichen)."));
    if (!f.name.value.trim()) return fehlerZeigen("registrieren", t("Bitte deinen Namen eingeben."));
    beschaeftigt(knopf, true);
    try {
      const { data, error } = await SB.auth.signUp({ email: f.email.value.trim(), password: f.passwort.value, options: { data: { name: f.name.value.trim(), einladung: code, sprache: SPRACHE } } });
      if (error) throw error;
      if (!data.session) throw new Error("keine Sitzung");
      try { localStorage.removeItem("ahoi-einladung"); } catch (err) {}
      ECHT_DATEN.uid = data.user.id; ECHT_DATEN.email = data.user.email;
      await weiter();
    } catch (err) { fehlerZeigen("registrieren", fehlerText(err)); }
    beschaeftigt(knopf, false);
  });
  document.getElementById("zu-anmelden").onclick = () => zeige("anmelden");
  document.querySelectorAll("[data-abmelden]").forEach(b => b.onclick = abmelden);
  document.getElementById("warten-pruefen").onclick = async e => {
    beschaeftigt(e.target, true);
    try { await weiter(); if (zugang().classList.contains("offen") && !ECHT_DATEN.profil?.freigegeben) hinweisZugang(t("Noch nicht freigegeben")); } catch (err) { hinweisZugang(fehlerText(err)); }
    beschaeftigt(e.target, false);
  };
  // Erster Start: Foto und Standort
  document.getElementById("es-foto").addEventListener("change", async e => {
    const datei = e.target.files[0]; if (!datei) return;
    const bild = document.getElementById("es-bild");
    bild.classList.add("laedt");
    try { const url = await fotoHochladen(datei); bild.style.backgroundImage = `url("${url}")`; bild.textContent = ""; }
    catch (err) { fehlerZeigen("erster-start", fehlerText(err)); }
    bild.classList.remove("laedt");
  });
  document.getElementById("es-gps").onclick = async e => {
    beschaeftigt(e.target, true); fehlerZeigen("erster-start", "");
    try { const o = await standortErmitteln(); await standortSpeichern(o); ortGewaehlt(o); }
    catch (err) { fehlerZeigen("erster-start", err && err.code === 1 ? t("Standort nicht erlaubt. Such deine Stadt einfach unten.") : t("Standort nicht gefunden. Such deine Stadt einfach unten.")); }
    beschaeftigt(e.target, false);
  };
  ortSucheVerbinden(document.getElementById("es-suche"), document.getElementById("es-treffer"), async o => { await standortSpeichern(o); ortGewaehlt(o); });
  document.getElementById("es-weiter").onclick = async e => { beschaeftigt(e.target, true); try { await weiter(); } catch (err) { fehlerZeigen("erster-start", fehlerText(err)); } beschaeftigt(e.target, false); };
}
function ortGewaehlt(o) {
  document.getElementById("es-ort").textContent = `${o.land.replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt()))} ${o.ort}`;
  document.getElementById("es-weiter").disabled = false;
  document.getElementById("es-treffer").innerHTML = ""; document.getElementById("es-suche").value = "";
}
// Ortssuche mit Vorschlägen; wird auch im Profil benutzt
function ortSucheVerbinden(feld, liste, gewaehlt, mitLaendern) {
  let uhr = null, nr = 0;
  feld.addEventListener("input", () => {
    clearTimeout(uhr);
    const text = feld.value.trim();
    if (text.length < 2) { liste.innerHTML = ""; return; }
    uhr = setTimeout(async () => {
      const meine = ++nr;
      try {
        const orte = await orteSuchen(text, mitLaendern);
        if (meine !== nr) return;
        liste.innerHTML = orte.length ? orte.map((o, i) => `<button type="button" data-i="${i}">${o.land.replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt()))} <b>${maske(o.ort)}</b><small>${maske(o.zusatz)}</small></button>`).join("") : `<p>${t("Nichts gefunden")}</p>`;
        liste.querySelectorAll("button").forEach(b => b.onclick = async () => { b.disabled = true; try { await gewaehlt(orte[b.dataset.i]); } catch (err) { b.disabled = false; hinweisZugang(fehlerText(err)); } });
      } catch (err) { liste.innerHTML = `<p>${t("Keine Verbindung. Bitte Internet prüfen.")}</p>`; }
    }, 300);
  });
}
function hinweisZugang(text) {
  if (typeof hinweis === "function") return hinweis(text);
  const h = document.getElementById("hinweis"); h.textContent = text; h.classList.add("zeigen"); setTimeout(() => h.classList.remove("zeigen"), 2600);
}
async function abmelden() {
  try { await SB.auth.signOut(); } catch (e) {}
  location.replace(location.pathname);
}

// Sprachwahl schon vor der Anmeldung (kleines Symbol oben rechts)
function zugangSpracheVerbinden() {
  const FLAGGE = { de: "🇩🇪", en: "🇬🇧", sk: "🇸🇰" };
  const knopf = document.getElementById("zugang-sprache"), liste = document.getElementById("zugang-sprachen");
  knopf.textContent = `${FLAGGE[SPRACHE]} ${SPRACHE.toUpperCase()}`;
  liste.innerHTML = Object.keys(SPRACHEN).map(k => `<button type="button" data-s="${k}">${FLAGGE[k]} ${SPRACHEN[k]}${k === SPRACHE ? " ✓" : ""}</button>`).join("");
  knopf.onclick = () => { liste.hidden = !liste.hidden; };
  liste.querySelectorAll("button").forEach(b => b.onclick = () => { try { localStorage.setItem(SPRACH_SCHLUESSEL, b.dataset.s); } catch (e) {} location.reload(); });
}
if (!ECHT) appLaden();
else { zugangSpracheVerbinden(); formulareVerbinden(); echtStarten(); }
