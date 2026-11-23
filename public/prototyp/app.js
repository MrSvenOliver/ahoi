// ---------- Leute: echte App aus der Datenbank, Prototyp mit Beispieldaten ----------
const leute = ECHT ? ECHT_DATEN.leute : [
  { id: "du",    name: "Du",    ort: "Málaga",      land: "ES", lat: 36.7213, lon: -4.4214,  tz: "Europe/Madrid",       farbe: "#7a5a3a" },
  { id: "alex",  name: "Alex",  ort: "Lissabon",    land: "PT", lat: 38.7223, lon: -9.1393,  tz: "Europe/Lisbon",       farbe: "#c0582f", paar: "p1" },
  { id: "sam",   name: "Sam",   ort: "Bratislava",  land: "SK", lat: 48.1486, lon: 17.1077,  tz: "Europe/Bratislava",   farbe: "#3f6b8a", paar: "p1" },
  { id: "lea",   name: "Lea",   ort: "Canggu, Bali",land: "ID", lat: -8.6478, lon: 115.1385, tz: "Asia/Makassar",       farbe: "#6f8a3a", paar: "p2" },
  { id: "nico",  name: "Nico",  ort: "Canggu, Bali",land: "ID", lat: -8.6478, lon: 115.1385, tz: "Asia/Makassar",       farbe: "#4f7a6a", paar: "p2" },
  { id: "mia",   name: "Mia",   ort: "Mexiko-Stadt",land: "MX", lat: 19.4326, lon: -99.1332, tz: "America/Mexico_City", farbe: "#a8467a" },
  { id: "jonas", name: "Jonas", ort: "Chiang Mai",  land: "TH", lat: 18.7883, lon: 98.9853,  tz: "Asia/Bangkok",        farbe: "#b98a2e" },
  { id: "ben",   name: "Ben",   ort: "Chiang Mai",  land: "TH", lat: 18.7953, lon: 98.9620,  tz: "Asia/Bangkok",        farbe: "#5a6fa0" },
];
// Beispieldaten: Status und Anzahl Länder der Freunde
if (!ECHT) {
Object.assign(leute.find(p => p.id === "alex"), { status: "treffen", laender: 23 });
Object.assign(leute.find(p => p.id === "sam"), { status: "basis", laender: 9 });
Object.assign(leute.find(p => p.id === "lea"), { status: "sport", laender: 31 });
Object.assign(leute.find(p => p.id === "nico"), { laender: 18 });
Object.assign(leute.find(p => p.id === "mia"), { status: "angekommen", laender: 14 });
Object.assign(leute.find(p => p.id === "jonas"), { status: "arbeit", laender: 27 });
Object.assign(leute.find(p => p.id === "ben"), { laender: 12 });
}
// Status zum Antippen; „Unterwegs“ gibt es bewusst nicht, das ist bei Nomaden immer so
const STATUS_VORLAGEN = { treffen: "☕ Lust auf ein Treffen", angekommen: "🌱 Gerade angekommen, Tipps willkommen", unterkunft: "🔍 Suche Unterkunft", mitreisende: "👥 Suche Mitreisende", arbeit: "💻 Arbeitsphase", sport: "🏄 Sport und Abenteuer", basis: "🏡 An meiner Basis", ruhe: "🔕 Bitte nicht stören" };
const statusAusDb = v => !v ? null : STATUS_VORLAGEN[v] ? v : { text: v };
if (ECHT) leute.forEach(p => p.status = statusAusDb(p.statusRoh));
else try { const g = localStorage.getItem("ahoi-status"); leute[0].status = g === null ? "sport" : JSON.parse(g); } catch (e) { leute[0].status = "sport"; }
const statusText = p => !p.status ? "" : STATUS_VORLAGEN[p.status] ? t(STATUS_VORLAGEN[p.status]) : (p.status.text || "");
const ich = () => leute.find(p => p.id === "du");
if (!ECHT) leute.forEach(p => p.ort = t(p.ort));
ich().name = t("Du");

// ---------- Entfernung auf dem Erdellipsoid (Vincenty, WGS84) ----------
function entfernungKm(lat1, lon1, lat2, lon2) {
  const a = 6378137, f = 1 / 298.257223563, b = (1 - f) * a, rad = Math.PI / 180;
  const L = (lon2 - lon1) * rad;
  const U1 = Math.atan((1 - f) * Math.tan(lat1 * rad)), U2 = Math.atan((1 - f) * Math.tan(lat2 * rad));
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1), sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
  let lambda = L, iter = 0, sinSigma, cosSigma, sigma, cosSqAlpha, cos2SigmaM;
  do {
    const sinL = Math.sin(lambda), cosL = Math.cos(lambda);
    sinSigma = Math.sqrt((cosU2 * sinL) ** 2 + (cosU1 * sinU2 - sinU1 * cosU2 * cosL) ** 2);
    if (sinSigma === 0) return 0;
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosL;
    sigma = Math.atan2(sinSigma, cosSigma);
    const sinAlpha = cosU1 * cosU2 * sinL / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;
    cos2SigmaM = cosSqAlpha ? cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha : 0;
    const C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    const prev = lambda;
    lambda = L + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));
    if (Math.abs(lambda - prev) < 1e-12) break;
  } while (++iter < 200);
  if (iter >= 200) { // Rückfall für fast gegenüberliegende Punkte: Großkreis
    const R = 6371.0088, dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const uSq = cosSqAlpha * (a * a - b * b) / (b * b);
  const A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const dSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM ** 2) - B / 6 * cos2SigmaM * (-3 + 4 * sinSigma ** 2) * (-3 + 4 * cos2SigmaM ** 2)));
  return b * A * (sigma - dSigma) / 1000;
}
const km = d => d < 1 ? t("hier") : d.toLocaleString(LOC, { maximumFractionDigits: d < 10 ? 1 : 0 }) + " km";

// Großkreis-Linie (kürzester Weg auf der Kugel) als Punktfolge
function grosskreis(lon1, lat1, lon2, lat2, n = 128) {
  const r = Math.PI / 180, toV = (lo, la) => [Math.cos(la * r) * Math.cos(lo * r), Math.cos(la * r) * Math.sin(lo * r), Math.sin(la * r)];
  const A = toV(lon1, lat1), B = toV(lon2, lat2);
  const w = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s1 = Math.sin((1 - t) * w) / Math.sin(w), s2 = Math.sin(t * w) / Math.sin(w);
    const x = s1 * A[0] + s2 * B[0], y = s1 * A[1] + s2 * B[1], z = s1 * A[2] + s2 * B[2];
    pts.push([Math.atan2(y, x) / r, Math.atan2(z, Math.hypot(x, y)) / r]);
  }
  return pts;
}
const flagge = cc => cc.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt()));
const uhrzeit = tz => new Intl.DateTimeFormat(LOC, { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date());
const kuerzel = n => n === t("Du") ? t("DU") : n.slice(0, 2).toUpperCase();
// Gesicht: Foto, sonst Farbe mit Kürzel
const kopfStil = p => p.bild ? `background:${p.farbe} url('${p.bild}') center/cover` : `background:${p.farbe}`;
const kopfText = p => p.bild ? "" : kuerzel(p.name);

// ---------- Farben der Karte (hell / dunkel) ----------
const dunkel = window.matchMedia("(prefers-color-scheme: dark)");
const PALETTEN = {
  // Modern: helles, ruhiges Kartenbild wie Apple Karten
  modern: {
    papier: "#f2f2ef", wasser: "#c3dbee", wasserTinte: "#4f7fa6", wald: "#d7e9cf", wiese: "#e2eedb", sand: "#f1ead8", eis: "#ffffff",
    stadt: "#eaeae6", haus: "#e1e1dc", hausRand: "#d2d2cc", strasseGross: "#f3c35f", strasseMittel: "#ffffff", strasseKlein: "#ffffff",
    tinte: "#1d1d1f", tinteLeise: "#6e6e73", grenze: "#b3b3bb", halo: "#f7f7f5", relief: 0.05, landDeckkraft: 0.34, versal: false
  },
  // Mission: Navy-Lagezentrum mit Cyan und Bernstein
  mission: {
    papier: "#0d1d30", wasser: "#06101c", wasserTinte: "#3f8fa8", wald: "#0f2236", wiese: "#0f2236", sand: "#10243a", eis: "#132a40",
    stadt: "#11263d", haus: "#163150", hausRand: "#1f4466", strasseGross: "#e8a33a", strasseMittel: "#2b6f8a", strasseKlein: "#1b3a55",
    tinte: "#8fe0f0", tinteLeise: "#4f8fa6", grenze: "#2f8aa6", halo: "#06101c", relief: 0.05, landDeckkraft: 0.26, versal: true
  },
  // Abenteuer: Schatzkarte in Pergament und Sepia
  abenteuer: {
    papier: "#efe0c0", wasser: "#bcc7bd", wasserTinte: "#5d7a86", wald: "#d3c896", wiese: "#dfd3a5", sand: "#ead7a6", eis: "#f6f0e2",
    stadt: "#e6d3ab", haus: "#d9c5a0", hausRand: "#bea47c", strasseGross: "#b07a45", strasseMittel: "#c49c70", strasseKlein: "#d1bb94",
    tinte: "#4a3220", tinteLeise: "#7a5a3a", grenze: "#8a6a48", halo: "#f3e6c9", relief: 0.14, landDeckkraft: 0.42, versal: false
  }
};
const STILE = ["modern", "mission", "abenteuer"];
let stil = document.documentElement.dataset.stil || "modern";
const kartenStil = () => stil;
const P = () => PALETTEN[stil];
function oberflaecheAnwenden() {
  const c = P(), r = document.documentElement;
  r.dataset.stil = stil;
  // Streifen oben (Statusleiste) in der Farbe des Meeres auf der Karte
  document.getElementById("theme-farbe").setAttribute("content", c.wasser);
  r.style.setProperty("--karte-hinten", c.wasser);
  symboleSetzen();
}
// Symbole pro Stil (Leiste unten und Knöpfe oben)
const SYMBOLE = {
  modern: {
    karte: '<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z"/><path d="M9 4v13.5M15 6.5V20"/>',
    reisen: '<path d="M10.5 13.5 3 11l1.5-1.5 7.5 1 4-4.5a2 2 0 0 1 3 3l-4.5 4 1 7.5-1.5 1.5-2.5-7.5-3 3v2.5L7 22l-1-3-3-1 1.5-1.5H7l3.5-3Z"/>',
    chat: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V16h0A2 2 0 0 1 4 14Z"/>',
    ideen: '<path d="M3 11 12 4l9 7v9h-6v-6H9v6H3v-9Z"/>',
    welt: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
    ich: '<path d="M20 4 4 11.2l7.2 1.6L12.8 20Z"/>'
  },
  mission: {
    karte: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 18.4 5.6"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    reisen: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h5a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h5"/>',
    chat: '<circle cx="12" cy="10" r="2"/><path d="M12 12v9M8.5 6.5a5 5 0 0 0 0 7M15.5 6.5a5 5 0 0 1 0 7M5.5 3.5a9 9 0 0 0 0 13M18.5 3.5a9 9 0 0 1 0 13"/>',
    ideen: '<path d="M4 20V9.5L12 4l8 5.5V20Z"/><circle cx="12" cy="13.5" r="3"/><path d="M12 9v1.5M12 16.5V18M7.5 13.5H9M15 13.5h1.5"/>',
    welt: '<circle cx="12" cy="12" r="7.5"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5"/>',
    ich: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>'
  },
  abenteuer: {
    karte: '<path d="M6 4h12v14a2 2 0 0 1-2 2H6"/><path d="M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2 2 2 0 0 0 2-2V6"/><path d="M12 9l3 3M15 9l-3 3"/><path d="M10.5 16.5c1.5-1.2 3.2-1.2 5 0" stroke-dasharray="1.4 1.8"/>',
    reisen: '<path d="M12 3v13M12 4l6.5 10H12M12 6.5 7 14h5"/><path d="M3 17h18l-2.5 3.5h-13Z"/>',
    chat: '<path d="M10 3h4v3l1.5 2.5V19a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V8.5L10 6Z"/><path d="M10.5 11.5h3M10.5 14h3M10.5 16.5h2"/>',
    ideen: '<path d="M2.5 20h19M5 20l7-15 7 15M12 5v15M9.5 20 12 15l2.5 5"/>',
    welt: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>',
    ich: '<circle cx="12" cy="5.5" r="2"/><path d="M12 7.5V21M8.5 11h7M5 14.5a7 7 0 0 0 14 0M3.5 15.5 5 14l1.5 1.5M17.5 15.5 19 14l1.5 1.5"/>'
  }
};
function symbolSvg(innen, dicke) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${dicke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${innen}</svg>`; }
function symboleSetzen() {
  const s = SYMBOLE[stil], dicke = stil === "mission" ? 1.5 : stil === "abenteuer" ? 1.7 : 1.8;
  document.querySelectorAll("#leiste button").forEach(b => { const alt = b.querySelector("svg"); if (alt && s[b.dataset.seite]) alt.outerHTML = symbolSvg(s[b.dataset.seite], dicke); });
  const w = document.querySelector("#knopf-welt svg"), i = document.querySelector("#knopf-ich svg");
  if (w) w.outerHTML = symbolSvg(s.welt, dicke);
  if (i) i.outerHTML = symbolSvg(s.ich, dicke);
}
function stilAnpassen(stil) {
  const c = P();
  stil.projection = { type: "mercator" };
  const weg = id => /^(poi_|highway-shield|road_shield|building-3d|park_outline|boundary_3$)/.test(id);
  stil.layers = stil.layers.filter(l => !weg(l.id));
  for (const l of stil.layers) {
    const id = l.id; l.paint = l.paint || {}; l.layout = l.layout || {};
    if (l.type === "background") l.paint["background-color"] = c.papier;
    else if (id === "natural_earth") { l.paint = { "raster-saturation": -1, "raster-contrast": 0.1, "raster-opacity": ["interpolate", ["linear"], ["zoom"], 0, c.relief, 6, c.relief * 0.6, 8, 0] }; }
    else if (id === "water") { l.paint["fill-color"] = c.wasser; l.paint["fill-opacity"] = 1; delete l.paint["fill-outline-color"]; }
    else if (id.startsWith("waterway") && l.type === "line") { l.paint["line-color"] = c.wasserTinte; l.paint["line-opacity"] = 0.6; }
    else if (id === "park") { l.paint["fill-color"] = c.wald; l.paint["fill-opacity"] = 0.45; }
    else if (id === "landcover_wood") { l.paint["fill-color"] = c.wald; l.paint["fill-opacity"] = 0.55; }
    else if (id === "landcover_grass" || id === "landcover_wetland") { l.paint["fill-color"] = c.wiese; l.paint["fill-opacity"] = 0.5; }
    else if (id === "landcover_sand") { l.paint["fill-color"] = c.sand; l.paint["fill-opacity"] = 0.7; }
    else if (id === "landcover_ice") { l.paint["fill-color"] = c.eis; l.paint["fill-opacity"] = 0.85; }
    else if (id.startsWith("landuse") || id.startsWith("aeroway_fill") || id === "road_area_pattern") { if (l.type === "fill") { l.paint["fill-color"] = c.stadt; l.paint["fill-opacity"] = 0.6; delete l.paint["fill-pattern"]; } }
    else if (id === "building") { l.paint["fill-color"] = c.haus; l.paint["fill-outline-color"] = c.hausRand; l.paint["fill-opacity"] = 0.9; }
    else if (l["source-layer"] === "transportation" && l.type === "line") {
      if (id.includes("casing")) { l.layout.visibility = "none"; continue; }
      const farbe = /motorway|trunk_primary/.test(id) ? c.strasseGross : /secondary_tertiary|link|rail/.test(id) ? c.strasseMittel : c.strasseKlein;
      l.paint["line-color"] = farbe;
      if (/rail/.test(id)) l.paint["line-opacity"] = 0.7;
    }
    else if (id.startsWith("aeroway")) { if (l.type === "line") l.paint["line-color"] = c.strasseKlein; }
    else if (id === "boundary_2" || id === "boundary_disputed") {
      // Ab Zoom 5 übernehmen die genauen OpenStreetMap-Grenzen
      l.minzoom = 5;
      l.paint["line-color"] = c.grenze;
      l.paint["line-dasharray"] = id === "boundary_disputed" ? [1, 2] : [3, 1.6];
      l.paint["line-opacity"] = ["interpolate", ["linear"], ["zoom"], 5, 0, 6, 0.85];
    }
    if (l.type === "symbol" && l.layout["text-field"]) {
      // Ortsnamen in der App-Sprache, sonst im Originalnamen
      if (l["source-layer"] !== "transportation_name") l.layout["text-field"] = ["coalesce", ["get", "name:" + SPRACHE], ["get", "name:latin"], ["get", "name"]];
      l.paint["text-color"] = /water/.test(id) ? c.wasserTinte : (/country/.test(id) ? c.tinteLeise : c.tinte);
      l.paint["text-halo-color"] = c.halo;
      l.paint["text-halo-width"] = 1.4;
      l.paint["text-halo-blur"] = 0.5;
      if (/country/.test(id)) { l.layout["text-letter-spacing"] = c.versal ? 0.18 : 0.04; l.layout["text-transform"] = c.versal ? "uppercase" : "none"; }
      else if (c.versal && /place/.test(id)) { l.layout["text-transform"] = "uppercase"; l.layout["text-letter-spacing"] = 0.1; }
      if (stil === "abenteuer" && /water_name|waterway/.test(id)) l.layout["text-font"] = ["Noto Sans Italic"];
      if (/water_name/.test(id)) { l.layout["text-letter-spacing"] = 0.08; l.minzoom = Math.max(l.minzoom || 0, 2); }
    }
  }
  return stil;
}

// ---------- Karte ----------
// Kleinster Zoom, bei dem die Weltkarte den Bildschirm in der Höhe ganz ausfüllt (keine leeren Ränder)
// Startansicht: etwas näher und weiter südlich, damit nicht Grönland und die Arktis den Bildschirm füllen
const START_MITTE = [15, 18];
function startZoom() { return fuellZoom() + 0.35; }
function fuellZoom() { return Math.max(0, Math.log2(window.innerHeight / 512) + 0.05); }
window.addEventListener("resize", () => { map.resize(); map.setMinZoom(fuellZoom()); blattSetzen(blattOffen); });
const map = new maplibregl.Map({
  container: "map",
  style: { version: 8, sources: {}, layers: [] },
  center: START_MITTE,
  zoom: startZoom(),
  minZoom: fuellZoom(),
  maxZoom: 18,
  pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
  attributionControl: { compact: true },
  renderWorldCopies: true,
  dragRotate: false,
  pitchWithRotate: false,
  touchPitch: false,
  fadeDuration: 150
});
map.touchZoomRotate.disableRotation();



let laender = null;
async function stilLaden() {
  const [stil, geo] = await Promise.all([
    fetch("https://tiles.openfreemap.org/styles/liberty").then(r => r.json()),
    laender ? Promise.resolve(laender) : fetch("laender-50m.geojson").then(r => r.json())
  ]);
  laender = geo;
  map.setStyle(stilAnpassen(stil), { diff: false });
  map.once("style.load", ebenenHinzufuegen);
}

function landFarben() {
  const proLand = {};
  for (const p of leute) (proLand[p.land] = proLand[p.land] || []).push(p);
  const zuordnung = ["match", ["get", "iso"]];
  for (const [land, ps] of Object.entries(proLand)) {
    const paare = new Set(ps.map(p => p.paar || p.id));
    zuordnung.push(land, paare.size === 1 ? ps[0].farbe : P().tinteLeise);
  }
  zuordnung.push("rgba(0,0,0,0)");
  return { zuordnung, laenderMitLeuten: Object.keys(proLand) };
}

function ebenenHinzufuegen() {
  const c = P();

  // Ländergrenzen und Länderfarben aus demselben Datensatz (Natural Earth 1:50 Mio.), bis Zoom 6
  map.addSource("laender", { type: "geojson", data: laender, tolerance: 0.2 });
  const { zuordnung, laenderMitLeuten } = landFarben();
  const vorBeschriftung = "waterway_line_label";
  map.addLayer({ id: "laender-farbe", type: "fill", source: "laender", maxzoom: 7,
    filter: ["in", ["get", "iso"], ["literal", laenderMitLeuten]],
    paint: { "fill-color": zuordnung, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 0, c.landDeckkraft, 4.5, c.landDeckkraft * 0.76, 6.5, 0] } }, vorBeschriftung);
  map.addLayer({ id: "laender-linie", type: "line", source: "laender", maxzoom: 7,
    paint: { "line-color": c.grenze, "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.5, 5, 1.1], "line-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.85, 5.5, 0.85, 6.5, 0] } }, vorBeschriftung);

  if (stil === "mission") ringeZeichnen();
  pinsSetzen();
  dekoSetzen();
  map.once("idle", () => setTimeout(() => document.getElementById("start").classList.add("weg"), 300));
}

// ---------- Deko pro Stil ----------
// Nur Schmuck: Raster und Anzeige bei Mission, Kompass und Figuren auf dem Meer bei Abenteuer. Karte und Inhalt bleiben gleich.
const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let meerMarker = [], meerUhr = null, meerFahren = null;
const FIGUREN = {
  schiff: '<svg viewBox="0 0 60 52"><path d="M8 44c6 2 12 2 18 0s12-2 18 0 9 1.5 12 0" fill="none" stroke="#5d7a86" stroke-width="1.3" stroke-linecap="round" opacity=".7"/><path d="M6 33h48l-6 9c-1 1.5-2.5 2-4 2H16c-1.5 0-3-.5-4-2z" fill="url(#rumpf)" stroke="#4a3220" stroke-width="1.3" stroke-linejoin="round"/><path d="M8.5 36.5h43" stroke="#d9a441" stroke-width="1.2"/><circle cx="20" cy="39.5" r="1.2" fill="#3a2414"/><circle cx="30" cy="39.5" r="1.2" fill="#3a2414"/><circle cx="40" cy="39.5" r="1.2" fill="#3a2414"/><path d="M24 33V5M38 33V12" stroke="#4a3220" stroke-width="1.5"/><path d="M24.6 7c8 3 10 13 0 23z" fill="url(#segel)" stroke="#4a3220" stroke-width="1.2" stroke-linejoin="round"/><path d="M23.4 9c-7 3-9 12-1 19h1z" fill="url(#segel)" stroke="#4a3220" stroke-width="1.2" stroke-linejoin="round"/><path d="M38.6 14c6 2.5 7 10 0 16z" fill="url(#segel)" stroke="#4a3220" stroke-width="1.2" stroke-linejoin="round"/><path d="M24 5l8 2.2-8 2.3z" fill="#c0582f" stroke="#4a3220" stroke-width=".9"/><path d="M54 33l4-3" stroke="#4a3220" stroke-width="1.3" stroke-linecap="round"/></svg>',
  dschunke: '<svg viewBox="0 0 60 52"><path d="M8 45c6 2 12 2 18 0s12-2 18 0 9 1.5 12 0" fill="none" stroke="#5d7a86" stroke-width="1.3" stroke-linecap="round" opacity=".7"/><path d="M7 35h40l5-7h5l-3 8c-1 4-5 7-10 7H17c-5 0-8-3-10-8z" fill="url(#rumpf)" stroke="#4a3220" stroke-width="1.3" stroke-linejoin="round"/><path d="M9 38.5h41" stroke="#d9a441" stroke-width="1.1"/><path d="M30 35V4M15 35V13M44 33V18" stroke="#4a3220" stroke-width="1.4"/><path d="M30.6 6 42 9.5l1.6 22H30.6z" fill="url(#dschunkensegel)" stroke="#4a3220" stroke-width="1.1" stroke-linejoin="round"/><path d="M31 12.5h11.6M31 18h12M31 23.5h12.3M31 29h12.5" stroke="#5e2614" stroke-width=".8"/><path d="M15.6 14.5 23 17l1 14h-8.4z" fill="url(#dschunkensegel)" stroke="#4a3220" stroke-width="1.1" stroke-linejoin="round"/><path d="M16 19.5h7.2M16 24.5h7.6M16 29h8" stroke="#5e2614" stroke-width=".8"/><path d="M44.5 19.5 50 22l.6 9h-6.1z" fill="url(#dschunkensegel)" stroke="#4a3220" stroke-width="1" stroke-linejoin="round"/><path d="M30 4l5 1.6-5 1.6z" fill="#d9a441" stroke="#4a3220" stroke-width=".8"/></svg>',
  wal: '<svg viewBox="0 0 64 40"><path d="M3 31c5 2 10 2 15 0s10-2 15 0 10 2 15 0 10-2 13 0" fill="none" stroke="#5d7a86" stroke-width="1.3" stroke-linecap="round" opacity=".75"/><path d="M6 24c0-8 10-13 22-13 10 0 17 4 21 9 3-3 6-6 9-10 1 4 0 8-2 11 3 1 5 3 6 6-4-1-8-1-11 1-4 4-11 6-22 6C14 34 6 31 6 24z" fill="url(#walkoerper)" stroke="#33495a" stroke-width="1.3" stroke-linejoin="round"/><path d="M9 27c6 3 15 4 25 2" fill="none" stroke="#c9d8de" stroke-width="2.2" stroke-linecap="round"/><path d="M12 30.5h6M16 31.5h6M20 32h6" stroke="#9fb4bd" stroke-width=".8" stroke-linecap="round"/><circle cx="15" cy="21.5" r="1.5" fill="#1f2d36"/><circle cx="15.5" cy="21" r=".45" fill="#fff"/><path d="M10 25c2 1 4 1 6 0" fill="none" stroke="#33495a" stroke-width="1" stroke-linecap="round"/><path d="M29 22c2 2 2 5 0 7" fill="none" stroke="#33495a" stroke-width="1.1" stroke-linecap="round"/></svg><svg class="fontaene" viewBox="0 0 18 20"><path d="M9 20v-8M9 12c-2-4-5-6-8-6M9 12c2-4 5-6 8-6M9 13c-1-5 0-9 0-12" stroke="#7fa0ad" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="1.5" cy="8.5" r="1" fill="#7fa0ad"/><circle cx="16.5" cy="8.5" r="1" fill="#7fa0ad"/><circle cx="9" cy="1" r="1" fill="#7fa0ad"/></svg>',
  drache: '<svg viewBox="0 0 72 37"><path d="M0 30c4-2.4 7-2.4 11 0s7 2.4 11 0 7-2.4 11 0 7 2.4 11 0 7-2.4 11 0 7 2.4 11 0" fill="none" stroke="#5d7a86" stroke-width="1.2" stroke-linecap="round" opacity=".75"/><g class="buckel"><path d="M27 30c0-13 14-13 14 0" fill="none" stroke="#1f4a3b" stroke-width="7.5" stroke-linecap="round"/><path d="M27 30c0-13 14-13 14 0" fill="none" stroke="url(#drachenhaut)" stroke-width="5" stroke-linecap="round"/><path d="M32 19.5l2-4 1.5 4" fill="#c0582f" stroke="#1f4a3b" stroke-width=".8"/></g><g class="buckel b2"><path d="M47 30c0-10 11-10 11 0" fill="none" stroke="#1f4a3b" stroke-width="6.5" stroke-linecap="round"/><path d="M47 30c0-10 11-10 11 0" fill="none" stroke="url(#drachenhaut)" stroke-width="4.2" stroke-linecap="round"/><path d="M51 22l1.6-3.4 1.4 3.4" fill="#c0582f" stroke="#1f4a3b" stroke-width=".8"/></g><g class="buckel b3"><path d="M62 30c1-4 3.5-6 7-6.5" fill="none" stroke="#1f4a3b" stroke-width="4.6" stroke-linecap="round"/><path d="M62 30c1-4 3.5-6 7-6.5" fill="none" stroke="url(#drachenhaut)" stroke-width="2.6" stroke-linecap="round"/><path d="M68 23.5l4-4.5-.5 6.5z" fill="#c0582f" stroke="#1f4a3b" stroke-width=".8" stroke-linejoin="round"/></g><path d="M20 30c-1-9-1-15 1-19" fill="none" stroke="#1f4a3b" stroke-width="7.5" stroke-linecap="round"/><path d="M20 30c-1-9-1-15 1-19" fill="none" stroke="url(#drachenhaut)" stroke-width="5" stroke-linecap="round"/><path d="M24 12c-1-5-6-7-12-6-4 .6-7 2.6-8 5 3 .4 6 .8 8 2 4 2 9 2 12-1z" fill="url(#drachenhaut)" stroke="#1f4a3b" stroke-width="1.2" stroke-linejoin="round"/><path d="M4.5 11.5c2 .4 4 1.2 6 1.6" fill="none" stroke="#1f4a3b" stroke-width=".9" stroke-linecap="round"/><circle cx="14.5" cy="8.6" r="1.7" fill="#f6ead0" stroke="#1f4a3b" stroke-width=".6"/><circle cx="14.2" cy="8.6" r=".8" fill="#1b1b1b"/><path d="M18 6l2-4.5 1 4.2 2.4-3 .2 4.6" fill="#c0582f" stroke="#1f4a3b" stroke-width=".8" stroke-linejoin="round"/><path d="M4 11.4 0 11l2.5 1.2L.4 14" fill="none" stroke="#c0582f" stroke-width=".9" stroke-linecap="round"/></svg>',
  krake: '<svg viewBox="0 0 62 46"><path d="M0 38.6c4-2.4 7-2.4 11 0s7 2.4 11 0 7-2.4 11 0 7 2.4 11 0 7-2.4 11 0 4 1.6 7 .8" fill="none" stroke="#5d7a86" stroke-width="1.2" stroke-linecap="round" opacity=".75"/><g class="arm l2"><path class="arm " d="M21 38.4c-4.6.9-9.4.7-13.2-1.6-2-1.2-1.9-3.6.1-3.5-.2 1.2.6 2.1 2 2.6 3.4 1.1 7.4 1 11.1.3z" fill="url(#krakenhaut)" stroke="#4a1a26" stroke-width="1.1" stroke-linejoin="round"/></g><g class="arm r2"><path class="arm " d="M41 38.4c4.6.9 9.4.7 13.2-1.6 2-1.2 1.9-3.6-.1-3.5.2 1.2-.6 2.1-2 2.6-3.4 1.1-7.4 1-11.1.3z" fill="url(#krakenhaut)" stroke="#4a1a26" stroke-width="1.1" stroke-linejoin="round"/></g><g class="arm l"><path class="arm " d="M23 38C16 36 9.5 31 8.2 24.5 7 18.6 10.6 14.4 14.8 15.6c2.2.6 2.6 3.4.6 4-1.4.4-2.4-.6-2-1.6-1.6.9-2.4 3.2-1.4 6.2 1.6 4.6 6 7.8 11.6 9.2z" fill="url(#krakenhaut)" stroke="#4a1a26" stroke-width="1.1" stroke-linejoin="round"/></g><g class="arm r"><path class="arm " d="M39 38c7-2 13.5-7 14.8-13.5 1.2-5.9-2.4-10.1-6.6-8.9-2.2.6-2.6 3.4-.6 4 1.4.4 2.4-.6 2-1.6 1.6.9 2.4 3.2 1.4 6.2-1.6 4.6-6 7.8-11.6 9.2z" fill="url(#krakenhaut)" stroke="#4a1a26" stroke-width="1.1" stroke-linejoin="round"/></g><circle cx="12.2" cy="21.6" r="0.75" fill="#f6cbd3" opacity=".9"/><circle cx="12.6" cy="25.4" r="0.9" fill="#f6cbd3" opacity=".9"/><circle cx="14.6" cy="29.2" r="1" fill="#f6cbd3" opacity=".9"/><circle cx="18" cy="32.2" r="1" fill="#f6cbd3" opacity=".9"/><circle cx="49.8" cy="21.6" r="0.75" fill="#f6cbd3" opacity=".9"/><circle cx="49.4" cy="25.4" r="0.9" fill="#f6cbd3" opacity=".9"/><circle cx="47.4" cy="29.2" r="1" fill="#f6cbd3" opacity=".9"/><circle cx="44" cy="32.2" r="1" fill="#f6cbd3" opacity=".9"/><circle cx="10.5" cy="35.6" r="0.7" fill="#f6cbd3" opacity=".9"/><circle cx="14.2" cy="36.4" r="0.75" fill="#f6cbd3" opacity=".9"/><circle cx="51.5" cy="35.6" r="0.7" fill="#f6cbd3" opacity=".9"/><circle cx="47.8" cy="36.4" r="0.75" fill="#f6cbd3" opacity=".9"/><path d="M22.4 38c-2.8-9.4-1.6-20 4.2-25.4 4.6-4.2 11.6-2.6 13.6 3.4 2 6 .4 14-1.8 22z" fill="url(#krakenhaut)" stroke="#4a1a26" stroke-width="1.3" stroke-linejoin="round"/><path d="M27.6 15.4c1.6-2 4.4-2.8 6.6-1.8" fill="none" stroke="#e9a3ae" stroke-width="1.3" stroke-linecap="round" opacity=".8"/><circle cx="34.6" cy="20" r="1" fill="#e9a3ae" opacity=".7"/><circle cx="29.4" cy="22.4" r=".8" fill="#e9a3ae" opacity=".7"/><circle cx="36.8" cy="24.6" r=".7" fill="#e9a3ae" opacity=".7"/><path d="M23.2 27.2c1.4-1.6 3.6-1.8 5-.4M33.4 26.8c1.4-1.4 3.6-1.2 4.8.4" fill="none" stroke="#4a1a26" stroke-width="1" stroke-linecap="round"/><ellipse cx="26" cy="30" rx="2.6" ry="2.3" fill="#f6ead0" stroke="#4a1a26" stroke-width=".7"/><ellipse cx="35.8" cy="30" rx="2.6" ry="2.3" fill="#f6ead0" stroke="#4a1a26" stroke-width=".7"/><rect x="24.5" y="29.4" width="3" height="1.2" rx=".6" fill="#1b1b1b"/><rect x="34.3" y="29.4" width="3" height="1.2" rx=".6" fill="#1b1b1b"/><g class="arm vorne"><path class="arm " d="M29.5 37.5c-.4 2.8-2 5-4.6 5.6-2 .5-3.2-1.2-2-2.2.5.8 1.4 1 2.3.6 1.5-.6 2.4-2.2 2.6-4.4z" fill="url(#krakenhaut)" stroke="#4a1a26" stroke-width="1.1" stroke-linejoin="round"/></g></svg>',
  welle: '<svg viewBox="0 0 34 12"><path d="M1 8c3-4 6-4 8 0s5 4 8 0 5-4 8 0 5 4 8 0" fill="none" stroke="#5d7a86" stroke-width="1.3" stroke-linecap="round"/></svg>'
};
// Zwei verschiedene Boote; auf dem Bildschirm ist immer höchstens eines zu sehen
const SCHIFFE = [{ typ: "schiff", a: [-46, 26], b: [-26, 16], dauer: 80 }, { typ: "dschunke", a: [58, -9], b: [82, -17], dauer: 95 }];
// Jedes Tier und Fabelwesen genau einmal: Wal im Nordatlantik, Seedrache im Nordpazifik, Krake im Südpazifik
const TIERE = [{ typ: "wal", klasse: "meer-wal", pos: [-38, 47] }, { typ: "drache", klasse: "meer-drache", pos: [-152, 27] }, { typ: "krake", klasse: "meer-krake", pos: [-118, -33] }];
const WELLEN = [[-30, 2], [-18, -30], [90, -32], [-170, 6], [-100, -48]];
function meerFigur(html, klasse, pos) {
  const el = document.createElement("div"); el.className = "meer"; el.innerHTML = `<div class="${klasse}">${html}</div>`;
  const m = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(pos).addTo(map);
  meerMarker.push(m); return m;
}
function meerAufraeumen() { meerMarker.forEach(m => m.remove()); meerMarker = []; clearInterval(meerUhr); meerUhr = null; if (meerFahren) map.off("move", meerFahren); meerFahren = null; }
function meerSetzen() {
  meerAufraeumen();
  WELLEN.forEach((p, i) => { const m = meerFigur(FIGUREN.welle, "meer-welle", p); m.getElement().firstChild.style.animationDelay = (i * 0.37) + "s"; });
  TIERE.forEach(tier => meerFigur(FIGUREN[tier.typ], tier.klasse, tier.pos));
  const schiffe = SCHIFFE.map((s, i) => ({ ...s, m: meerFigur(FIGUREN[s.typ], "meer-figur", s.a), start: i * 23 }));
  const fahren = () => {
    const jetzt = Date.now() / 1000;
    for (const s of schiffe) {
      const phase = ((jetzt + s.start) % (2 * s.dauer)) / s.dauer, hin = phase < 1, f = hin ? phase : 2 - phase;
      const w = (1 - Math.cos(f * Math.PI)) / 2;
      s.m.setLngLat([s.a[0] + (s.b[0] - s.a[0]) * w, s.a[1] + (s.b[1] - s.a[1]) * w]);
      s.m.getElement().firstChild.classList.toggle("links", (s.b[0] > s.a[0]) !== hin);
    }
    // Liegen mehrere Boote im Bild, bleibt nur das zur Bildmitte nächste sichtbar
    const bw = window.innerWidth, bh = window.innerHeight, sichtbar = schiffe.filter(s => { const r = s.m.getElement().getBoundingClientRect(); return r.right > 0 && r.left < bw && r.bottom > 0 && r.top < bh; });
    const nah = sichtbar.sort((x, y) => { const rx = x.m.getElement().getBoundingClientRect(), ry = y.m.getElement().getBoundingClientRect(); return Math.hypot(rx.left - bw / 2, rx.top - bh / 2) - Math.hypot(ry.left - bw / 2, ry.top - bh / 2); })[0];
    schiffe.forEach(s => s.m.getElement().classList.toggle("verdeckt", sichtbar.includes(s) && s !== nah));
  };
  meerFahren = fahren; map.on("move", fahren);
  fahren();
  if (!ruhig) meerUhr = setInterval(fahren, 120);
  meerSichtbarkeit();
}
function meerSichtbarkeit() { const weit = map.getZoom() < 5.5; meerMarker.forEach(m => m.getElement().classList.toggle("weg", !weit)); }
map.on("zoomend", () => { if (meerMarker.length) meerSichtbarkeit(); });
function hudSchreiben() {
  const c = map.getCenter(), z = new Date();
  const k = (v, p, n) => Math.abs(v).toFixed(2) + "°" + (v >= 0 ? p : n);
  document.getElementById("hud").innerHTML = `${k(c.lat, "N", "S")} · ${k(c.lng, "E", "W")}<br>ZOOM ${map.getZoom().toFixed(1)} · <b>${String(z.getUTCHours()).padStart(2, "0")}:${String(z.getUTCMinutes()).padStart(2, "0")}Z</b>`;
}
function kompassDrehen() { document.getElementById("kompass-deko").style.transform = `rotate(${(map.getCenter().lng * 0.6).toFixed(1)}deg)`; }
map.on("move", () => { if (stil === "mission") hudSchreiben(); else if (stil === "abenteuer") kompassDrehen(); });
setInterval(() => { if (stil === "mission") hudSchreiben(); }, 30000);
function dekoSetzen() {
  let schleier = document.querySelector(".karten-schleier");
  if (!schleier) { schleier = document.createElement("div"); schleier.className = "karten-schleier"; const leinwand = map.getCanvas(); leinwand.parentNode.insertBefore(schleier, leinwand.nextSibling); }
  if (stil === "abenteuer") { meerSetzen(); kompassDrehen(); } else meerAufraeumen();
  if (stil === "mission") hudSchreiben();
}

// Entfernungsringe um den eigenen Standort (nur Mission): echte Kreise auf der Erdkugel, 1000 / 2500 / 5000 km
function ringeZeichnen() {
  const du = ich(), R = 6371.0088, rad = Math.PI / 180, ringe = [1000, 2500, 5000];
  const kreis = km => { const d = km / R, la = du.lat * rad, lo = du.lon * rad, pkt = [];
    for (let i = 0; i <= 180; i++) { const b = (i / 180) * 2 * Math.PI;
      const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
      const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
      pkt.push([lo2 / rad, la2 / rad]); }
    return pkt; };
  const linien = ringe.map(km => ({ type: "Feature", properties: { km }, geometry: { type: "LineString", coordinates: kreis(km) } }));
  const schilder = ringe.map(km => ({ type: "Feature", properties: { text: km.toLocaleString(LOC) + " km" }, geometry: { type: "Point", coordinates: kreis(km)[0] } }));
  map.addSource("ringe", { type: "geojson", data: { type: "FeatureCollection", features: linien } });
  map.addSource("ringe-text", { type: "geojson", data: { type: "FeatureCollection", features: schilder } });
  map.addLayer({ id: "ringe", type: "line", source: "ringe", paint: { "line-color": "#5fd4ea", "line-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.45, 6, 0.25], "line-width": 1, "line-dasharray": [3, 3] } });
  map.addLayer({ id: "ringe-text", type: "symbol", source: "ringe-text", layout: { "text-field": ["get", "text"], "text-font": ["Noto Sans Regular"], "text-size": 10, "text-letter-spacing": 0.1, "text-offset": [0, -0.8] }, paint: { "text-color": "#e8a33a", "text-halo-color": "#06101c", "text-halo-width": 1.5 } });
}

// ---------- Pins ----------
let marker = [];
const NAH_KM = 50;
// Ein Herz gibt es nur, wenn genau zwei Personen zusammen sind UND beide ihr Paar gegenseitig bestätigt haben
const istPaar = g => g.length === 2 && g[0].paar && g[0].paar === g[1].paar;
// Familien-Zugang: sieht nur die Personen, die ihn freigeschaltet haben; den eigenen Standort nur, wenn selbst gewählt
// Beispiel: Mama wurde von dir und von Alex eingeladen. Ihr eigener Standort erscheint nur, wenn sie ihn selbst einschaltet.
const FAMILIE_SIEHT = ["du", "alex"];
const BETRACHTER = { id: "betrachter", name: t("Ich"), ort: t("Köln"), land: "DE", lat: 50.9375, lon: 6.9603, tz: "Europe/Berlin", farbe: "#8a8478" };
let familieModus = false, familieMitStandort = false;
const sichtbareLeute = () => familieModus ? [...leute.filter(p => FAMILIE_SIEHT.includes(p.id)), ...(familieMitStandort ? [BETRACHTER] : [])] : leute;
const selbstId = () => familieModus ? "betrachter" : "du";
function gruppenBilden() {
  const gruppen = [];
  for (const p of sichtbareLeute()) {
    const g = gruppen.find(g => g.some(q => entfernungKm(p.lat, p.lon, q.lat, q.lon) < NAH_KM));
    g ? g.push(p) : gruppen.push([p]);
  }
  return gruppen;
}
// Pins, die sich auf dem Bildschirm überdecken würden, werden zu einem Pin zusammengefasst:
// Gesichter leicht überlappend nebeneinander, dazu eine Zahl, wie viele Personen es sind.
const PIN_ABSTAND_PX = 46;
let ersteDarstellung = true;
function pinsSetzen() {
  marker.forEach(m => m.remove()); marker = [];
  const haufen = [];
  for (const g of gruppenBilden()) {
    const pt = map.project([g[0].lon, g[0].lat]);
    const h = haufen.find(h => Math.hypot(h.x - pt.x, h.y - pt.y) < PIN_ABSTAND_PX);
    if (h) { h.gruppen.push(g); } else haufen.push({ x: pt.x, y: pt.y, gruppen: [g] });
  }
  haufen.forEach((h, i) => {
    const leuteHier = h.gruppen.flat();
    const n = Math.min(leuteHier.length, 3), breite = 46 + (n - 1) * 18;
    const el = document.createElement("div");
    el.className = "pin" + (leuteHier.some(p => p.id === selbstId()) ? " pin-du" : "");
    el.style.width = breite + "px";
    const innen = document.createElement("div"); innen.className = "pin-innen";
    innen.style.width = breite + "px";
    if (ersteDarstellung) innen.style.animationDelay = (0.15 + i * 0.09) + "s"; else innen.style.animation = "none";
    if (leuteHier[0].id === selbstId()) innen.innerHTML = '<div class="puls"></div>';
    leuteHier.slice(0, 3).forEach((p, j) => { const plus = leuteHier.length > 3 && j === 2; innen.innerHTML += `<div class="pin-kopf" style="left:${3 + j * 18}px;${plus ? `background:${p.farbe}` : kopfStil(p)};z-index:${3 - j}">${plus ? "+" + (leuteHier.length - 2) : kopfText(p)}</div>`; });
    // ❤️ = bestätigtes Paar am selben Ort · 🤝 = Freunde am selben Ort · Zahl = Pins liegen nur auf dem Bildschirm übereinander
    if (h.gruppen.length === 1 && istPaar(h.gruppen[0])) innen.innerHTML += `<div class="herz" style="left:${breite - 20}px">❤️</div>`;
    else if (h.gruppen.length === 1 && leuteHier.length > 1) innen.innerHTML += `<div class="herz" style="left:${breite - 20}px">🤝</div>`;
    else if (leuteHier.length > 1) innen.innerHTML += `<div class="pin-zahl" style="left:${breite - 16}px">${leuteHier.length}</div>`;
    innen.innerHTML += `<div class="pin-spitze" style="left:${breite / 2 - 5}px"></div>`;
    innen.innerHTML += `<div class="pin-rufname">${ohneHtml(leuteHier[0].name)}${leuteHier.length > 1 ? " +" + (leuteHier.length - 1) : ""}</div>`;
    el.appendChild(innen);
    el.setAttribute("role", "button"); el.tabIndex = 0;
    el.setAttribute("aria-label", leuteHier.map(p => p.name).join(", ") + " – " + leuteHier[0].ort);
    el.addEventListener("keydown", e => { if (e.key === "Enter") el.click(); });
    el.addEventListener("click", e => {
      e.stopPropagation();
      if (h.gruppen.length === 1) return infoZeigen(h.gruppen[0]);
      // Mehrere Orte übereinander: so weit hineinzoomen, dass sie sich trennen
      const b = new maplibregl.LngLatBounds();
      leuteHier.forEach(p => b.extend([p.lon, p.lat]));
      map.fitBounds(b, { padding: { top: 120, bottom: 160, left: 60, right: 60 }, maxZoom: 11, duration: 900 });
    });
    const ll = map.unproject([h.x, h.y]);
    const anker = h.gruppen.length === 1 ? [h.gruppen[0][0].lon, h.gruppen[0][0].lat] : [ll.lng, ll.lat];
    marker.push(new maplibregl.Marker({ element: el, anchor: "bottom", opacityWhenCovered: "0" }).setLngLat(anker).addTo(map));
  });
  ersteDarstellung = false;
}
let letzterPinZoom = null;
map.on("zoomend", () => { if (letzterPinZoom === null || Math.abs(map.getZoom() - letzterPinZoom) > 0.2) { letzterPinZoom = map.getZoom(); pinsSetzen(); } });

// ---------- Liste und Infokarte ----------
function listeAufbauen() {
  const du = ich();
  const andere = leute.filter(p => p.id !== "du").map(p => ({ ...p, d: entfernungKm(du.lat, du.lon, p.lat, p.lon) })).sort((x, y) => x.d - y.d);
  const laenderZahl = new Set(andere.map(p => p.land)).size;
  document.getElementById("zusammenfassung").textContent = `${t("{n} Freunde", { n: andere.length })} · ${t("{n} Länder", { n: laenderZahl })} · ${versionText(VERSION)}`;
  const ul = document.getElementById("liste"); ul.innerHTML = "";
  for (const p of andere) {
    let paarText = "";
    const dabei = leute.filter(q => q.id !== p.id && q.id !== "du" && entfernungKm(p.lat, p.lon, q.lat, q.lon) < NAH_KM);
    if (dabei.length) paarText = ` · ${t("mit")} ${dabei.map(q => q.name).join(", ")}`;
    const li = document.createElement("li");
    li.innerHTML = `<div class="ava" style="${kopfStil(p)}">${kopfText(p)}</div>
      <div class="zeile"><b>${ohneHtml(p.name)}</b><span>${flagge(p.land)} ${ohneHtml(p.ort)} · ${uhrzeit(p.tz)}${t(" Uhr")}${paarText}</span>${statusText(p) ? `<small class="status-klein">${ohneHtml(statusText(p))}</small>` : ""}</div>
      <div class="weite"><b>${km(p.d)}</b><span>${t("von dir")}</span></div>`;
    li.onclick = () => { zuPerson(p); infoZeigen([p]); };
    ul.appendChild(li);
  }
  if (!andere.length) ul.innerHTML = `<li class="leer-hinweis">${t("Noch keine Freunde hier. Lade jemanden ein!")}</li>`;
}

function infoZeigen(gruppe) {
  const du = familieModus ? BETRACHTER : ich(), p = gruppe[0], info = document.getElementById("info");
  const name = gruppe.map(x => x.name).join(" & ");
  let text = (gruppe.length === 1 && statusText(p) && !familieModus ? `<span class="status-zeile">${ohneHtml(statusText(p))}</span><br>` : "") + `${flagge(p.land)} <b>${ohneHtml(p.ort)}</b> · ${t("Ortszeit")} <b>${uhrzeit(p.tz)}${t(" Uhr")}</b>`;
  if (p.id !== du.id && (!familieModus || familieMitStandort)) text += `<br>${t("Entfernung zu dir:")} <b>${km(entfernungKm(du.lat, du.lon, p.lat, p.lon))}</b>`;
  if (istPaar(gruppe)) text += `<br>${t("❤️ Paar · gerade zusammen unterwegs")}`;
  else if (gruppe.length > 1) text += `<br>${t("🤝 Zusammen unterwegs")}`;
  if (gruppe.length === 1 && !familieModus) { const n = p.id === "du" ? besucht.length : p.laender; if (n) text += `<br>${t("🌍 {n} Länder", { n })}`; }
  info.querySelector("h3").textContent = name;
  info.querySelector("p").innerHTML = text;
  const chatKnopf = document.getElementById("info-chat");
  chatKnopf.style.display = !ECHT && !familieModus && gruppe.length === 1 && p.id !== "du" ? "inline-block" : "none";
  chatKnopf.onclick = () => einzelChat(p.id);
  const tippKnopf = document.getElementById("info-tipps"), tippZahl = familieModus || ECHT ? 0 : tipps.filter(x => x.ort === p.ort).length;
  tippKnopf.style.display = tippZahl ? "inline-block" : "none";
  tippKnopf.textContent = tippZahl ? t("💡 {n} Tipps zu {ort}", { n: tippZahl, ort: p.ort }) : "";
  tippKnopf.onclick = () => { tippsOrt = p.ort; ideenReiter = "tipps"; seiteZeigen("ideen"); ideenAufbauen(); };
  info.classList.add("offen");
  blattSetzen(false);
}
document.getElementById("info-zu").onclick = () => document.getElementById("info").classList.remove("offen");
map.on("click", () => { document.getElementById("info").classList.remove("offen"); if (blattOffen) blattSetzen(false); });

function zuPerson(p) {
  blattSetzen(false);
  map.flyTo({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), 9), speed: 1.4, curve: 1.5, essential: true });
}

// ---------- Unteres Fenster: ziehen oder antippen ----------
const blatt = document.getElementById("blatt"), blattKopf = document.getElementById("blatt-kopf");
let blattOffen = false, blattY = 0;
const breit = () => window.matchMedia("(min-width: 900px)").matches;
const blattZuY = () => blatt.offsetHeight - blattKopf.offsetHeight - parseFloat(getComputedStyle(blatt).paddingBottom || 0);
function blattPos(y) {
  blattY = y;
  blatt.style.transform = `translateY(${y}px)`;
}
function blattSetzen(offen) {
  blattOffen = offen && true;
  blatt.classList.toggle("offen", blattOffen);
  blattKopf.setAttribute("aria-expanded", blattOffen);
  blattPos(blattOffen ? 0 : blattZuY());
  document.documentElement.style.setProperty("--blatt-sichtbar", (blatt.offsetHeight - blattZuY() + (parseFloat(getComputedStyle(blatt).bottom) || 0)) + "px");
}
// Höhe neu messen, wenn sich der Kopf ändert (Schrift geladen, Stil oder Sprache gewechselt)
if (window.ResizeObserver) new ResizeObserver(() => blattSetzen(blattOffen)).observe(blattKopf);
let zug = null;
blattKopf.addEventListener("pointerdown", e => {
  if (breit()) return;
  zug = { startY: e.clientY, startPos: blattY, letzteY: e.clientY, letzteZeit: performance.now(), tempo: 0, bewegt: false };
  blatt.style.transition = "none";
  blattKopf.setPointerCapture(e.pointerId);
});
blattKopf.addEventListener("pointermove", e => {
  if (!zug) return;
  const dy = e.clientY - zug.startY;
  if (Math.abs(dy) > 5) zug.bewegt = true;
  const zu = blattZuY();
  let y = zug.startPos + dy;
  if (y < 0) y = y / 4; if (y > zu) y = zu + (y - zu) / 4; // leichter Widerstand an den Enden
  blattPos(y);
  blatt.classList.add("offen");
  blatt.querySelector(".liste").style.opacity = Math.max(0, Math.min(1, 1 - y / zu));
  const jetzt = performance.now();
  zug.tempo = (e.clientY - zug.letzteY) / Math.max(1, jetzt - zug.letzteZeit);
  zug.letzteY = e.clientY; zug.letzteZeit = jetzt;
});
const zugEnde = () => {
  if (!zug) return;
  blatt.style.transition = "";
  blatt.querySelector(".liste").style.opacity = "";
  if (!zug.bewegt) blattSetzen(!blattOffen);
  else if (zug.tempo < -0.3) blattSetzen(true);
  else if (zug.tempo > 0.3) blattSetzen(false);
  else blattSetzen(blattY < blattZuY() / 2);
  zug = null;
};
blattKopf.addEventListener("pointerup", zugEnde);
blattKopf.addEventListener("pointercancel", zugEnde);
window.addEventListener("resize", () => blattSetzen(blattOffen));
document.getElementById("knopf-welt").onclick = () => {
  document.getElementById("info").classList.remove("offen");
  map.flyTo({ center: START_MITTE, zoom: startZoom(), speed: 1.2, essential: true });
};

function leisteRaum() { const l = document.getElementById("leiste"); return l.offsetParent === null ? 0 : Math.max(0, window.innerHeight - l.getBoundingClientRect().top); }
function hinweis(t) {
  const h = document.getElementById("hinweis"); h.textContent = hatText(t) ? window.t(t) : t; h.classList.add("zeigen");
  clearTimeout(hinweis.t); hinweis.t = setTimeout(() => h.classList.remove("zeigen"), 2600);
}

// Echter Standort: bleibt nur auf diesem Gerät, wird nirgendwo gespeichert
document.getElementById("knopf-ich").onclick = () => {
  if (!navigator.geolocation) return hinweis("Standort wird hier nicht unterstützt");
  hinweis("Standort wird gesucht …");
  navigator.geolocation.getCurrentPosition(pos => {
    const du = ich();
    du.lat = pos.coords.latitude; du.lon = pos.coords.longitude; du.ort = t("Dein Standort");
    du.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    pinsSetzen(); listeAufbauen();
    map.flyTo({ center: [du.lon, du.lat], zoom: 11, speed: 1.4, essential: true });
    hinweis(t("Genauigkeit: ± {n} m", { n: Math.round(pos.coords.accuracy) }));
  }, () => hinweis("Standort nicht freigegeben"), { enableHighAccuracy: true, timeout: 12000 });
};

// Dunkelmodus folgt dem iPhone


// ---------- Offline-Start ----------
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));

// ---------- Neue Version automatisch laden ----------
const VERSION = "__VERSION__";
function versionText(v) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(v);
  if (!m) return t("Entwurf");
  const d = new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]));
  return t("Stand") + " " + d.toLocaleString(LOC, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
async function aufNeueVersionPruefen() {
  if (VERSION.startsWith("__")) return;
  try {
    const j = await fetch("version.json?t=" + Date.now(), { cache: "no-store" }).then(r => r.json());
    if (j.version && j.version !== VERSION) {
      const schluessel = "ahoi-neu-" + j.version;
      let schonVersucht = false;
      try { schonVersucht = sessionStorage.getItem(schluessel); sessionStorage.setItem(schluessel, "1"); } catch (e) {}
      if (!schonVersucht) location.replace(location.pathname + "?v=" + j.version);
    }
  } catch (e) {}
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") aufNeueVersionPruefen(); });
aufNeueVersionPruefen();

// ---------- Stil-Auswahl ----------
const STIL_VORSCHAU = {
  modern: '<span class="vorschau" style="background:#c3dbee"><i style="left:-10%;top:20%;width:70%;height:55%;background:#f2f2ef;border-radius:45%"></i><i style="left:38%;top:34%;width:14px;height:14px;border-radius:50%;background:#0071e3;border:2px solid #fff"></i><i style="left:12%;right:12%;bottom:6%;height:9px;border-radius:9px;background:rgba(255,255,255,.9)"></i></span>',
  mission: '<span class="vorschau" style="background:#06101c;background-image:linear-gradient(rgba(95,212,234,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(95,212,234,.15) 1px,transparent 1px);background-size:9px 9px"><i style="left:-10%;top:20%;width:70%;height:55%;border:1px solid #2f8aa6;border-radius:45%"></i><i style="left:38%;top:34%;width:13px;height:13px;border-radius:4px;border:1.5px solid #e8a33a"></i><i style="left:6%;right:6%;bottom:6%;height:1px;background:#5fd4ea"></i></span>',
  abenteuer: '<span class="vorschau" style="background:#bcc7bd"><i style="left:-10%;top:20%;width:70%;height:55%;background:#efe0c0;border:1.5px solid #8a6a48;border-radius:45%"></i><i style="left:38%;top:34%;width:14px;height:14px;border-radius:50%;background:#c0582f;border:2px solid #b8913f"></i><i style="right:8%;top:10%;width:14px;height:14px;border-radius:50%;border:1px solid #7a5a3a"></i></span>'
};
function stilWahlAufbauen() {
  const box = document.getElementById("stil-wahl");
  box.innerHTML = STILE.map(k => `<button data-stil="${k}" role="radio" aria-checked="${k === stil}" class="${k === stil ? "aktiv" : ""}">${STIL_VORSCHAU[k]}${t({ modern: "Modern", mission: "Mission", abenteuer: "Abenteuer" }[k])}</button>`).join("");
  box.querySelectorAll("button").forEach(b => b.onclick = () => stilWechseln(b.dataset.stil));
}
function stilWechseln(neu) {
  if (neu === stil) return;
  stil = neu;
  try { localStorage.setItem("ahoi-oberflaeche", stil); } catch (e) {}
  oberflaecheAnwenden(); stilWahlAufbauen(); blattSetzen(blattOffen);
  stilLaden();
}
// ---------- Bereiche wechseln ----------
const seiten = ["reisen", "reise-neu", "chat", "unterhaltung", "gruppe-neu", "ideen", "idee-neu", "tipp-neu", "profil", "meine-laender", "laender", "feedback", "verwaltung", "konto"];
const TAB_VON = { "reise-neu": "reisen", "idee-neu": "ideen", "tipp-neu": "ideen", "unterhaltung": "chat", "gruppe-neu": "chat" };
function seiteZeigen(name) {
  for (const s of seiten) document.getElementById("seite-" + s).classList.toggle("offen", s === name);
  document.querySelectorAll("#leiste button").forEach(b => b.setAttribute("aria-current", b.dataset.seite === name ? "page" : "false"));
  document.querySelectorAll("#leiste button").forEach(b => b.classList.toggle("aktiv", b.dataset.seite === (TAB_VON[name] || name)));
  document.getElementById("info").classList.remove("offen");
  if (name === "chat" && !ECHT) chatListeAufbauen();
  if (name === "karte") { blattSetzen(false); map.resize(); }
}
document.querySelectorAll("#leiste button").forEach(b => b.onclick = () => seiteZeigen(b.dataset.seite));
let vorFeedback = "karte";
function feedbackOeffnen() { const offen = seiten.find(n => document.getElementById("seite-" + n).classList.contains("offen")); vorFeedback = offen || "karte"; seiteZeigen("feedback"); }
function feedbackSchliessen() { seiteZeigen(vorFeedback); }
document.getElementById("feedback-lasche").onclick = feedbackOeffnen;
document.querySelectorAll("[data-hinweis]").forEach(b => b.onclick = () => hinweis(b.dataset.hinweis));
document.querySelectorAll("[data-zurueck]").forEach(b => b.onclick = () => b.dataset.zurueck === "__zurueck" ? feedbackSchliessen() : seiteZeigen(b.dataset.zurueck));
document.getElementById("profil-knopf").onclick = () => seiteZeigen("profil");
document.getElementById("reise-neu").onclick = () => seiteZeigen("reise-neu");
document.getElementById("reise-an").addEventListener("change", e => { const ab = document.getElementById("reise-ab"); ab.min = e.target.value; if (ab.value && ab.value < e.target.value) ab.value = e.target.value; });
document.getElementById("reise-speichern").onclick = () => { hinweis("Speichern kommt in Phase 3"); seiteZeigen("reisen"); };
document.querySelectorAll(".schalter").forEach(b => b.onclick = () => b.classList.toggle("an"));
document.querySelectorAll(".segmente.klein").forEach(box => box.querySelectorAll("button").forEach(b => b.onclick = () => { box.querySelectorAll("button").forEach(x => x.classList.remove("aktiv")); b.classList.add("aktiv"); }));

const person = id => leute.find(p => p.id === id);
const ava = (p, gross) => `<div class="klein-ava" style="${kopfStil(p)}${gross ? ";width:42px;height:42px" : ""}">${kopfText(p)}</div>`;

// ---------- Reisen ----------
const reisen = [
  { wer: ["alex"], ziel: "Marrakesch", land: "MA", von: "2026-12-03", bis: "2026-12-14" },
  { wer: ["sam"], ziel: "Wien", land: "AT", von: "2026-12-10", bis: "2026-12-12" },
  { wer: ["mia"], ziel: "Oaxaca", land: "MX", von: "2026-12-20", bis: "2027-01-05" },
  { wer: ["du"], ziel: "Lissabon", land: "PT", von: "2027-01-10", bis: "2027-01-15" },
  { wer: ["lea", "nico"], ziel: "Lissabon", land: "PT", von: "2027-01-08", bis: "2027-01-20" },
  { wer: ["jonas", "ben"], ziel: "Vietnam", land: "VN", monat: "2027-02", vielleicht: true },
  { wer: ["alex"], ziel: "Porto", land: "PT", von: "2027-02-01", bis: "2027-02-10" },
  { wer: ["du"], ziel: "Mexiko", land: "MX", monat: "2027-03", vielleicht: true },
  { wer: ["alex"], ziel: "Kapstadt", land: "ZA", monat: "2027-04", vielleicht: true },
];
reisen.forEach(r => r.ziel = t(r.ziel));
const reiseSchluessel = r => r.von || r.monat + "-32";
const datum = iso => new Date(iso + "T12:00:00");
const kurz = iso => datum(iso).toLocaleDateString(LOC, { day: "numeric", month: "numeric" });
const monatName = iso => datum(iso.length === 7 ? iso + "-01" : iso).toLocaleDateString(LOC, { month: "long", year: "numeric" });
function reisenAufbauen() {
  reisen.sort((a, b) => reiseSchluessel(a).localeCompare(reiseSchluessel(b)));
  let html = "", monat = "";
  for (const r of reisen) {
    const m = monatName(r.von || r.monat);
    if (m !== monat) { monat = m; html += `<h2>${m}</h2>`; }
    const ps = r.wer.map(person);
    const gesichter = ps.slice(0, 2).map((p, i) => `<div class="klein-ava" style="left:${ps.length > 1 ? i * 20 : 10}px;z-index:${2 - i};background:${p.farbe}">${kuerzel(p.name)}</div>`).join("");
    const naechte = r.von ? Math.round((datum(r.bis) - datum(r.von)) / 864e5) : null;
    html += `<div class="kasten reise${r.vielleicht ? " vielleicht" : ""}">
      <div class="gesichter">${gesichter}</div>
      <div class="text"><span class="wer">${ps.map(p => p.name).join(" & ")}</span>
        <span class="ziel">${flagge(r.land)}&nbsp;&nbsp;${r.ziel}</span>
        <span class="wann">${r.von ? kurz(r.von) + " – " + kurz(r.bis) : t("irgendwann im {m}", { m: datum(r.monat + "-01").toLocaleDateString(LOC, { month: "long" }) })}</span></div>
      <div class="art">${r.vielleicht ? '<span class="vielleicht-text">' + t("Vielleicht") + '</span>' : `<b>${naechte}</b><small>${t(naechte === 1 ? "Nacht" : "Nächte")}</small>`}</div></div>`;
  }
  document.getElementById("reise-liste").innerHTML = html;
}

// ---------- Chat ----------
// Chatliste: „Alle“ (nur in der Beta), Reisegruppen (selbst erstellt oder automatisch aus Treffer/Idee), Einzelchats.
// Fremdsprachige Nachrichten tragen ihre Übersetzung mit (später DeepL über Supabase, je Sprache einmal gespeichert).
const chats = [
  { id: "alle", art: "alle", name: "Alle", ungelesen: 1, nachrichten: [
    { system: "<b>Lea</b> hat eine Reise eingetragen: Lissabon, 8.–20.1." },
    { von: "lea", text: "Wer ist im Januar noch in Portugal? 🇵🇹", lang: "de", ue: { en: "Who else is in Portugal in January? 🇵🇹", sk: "Kto ešte bude v januári v Portugalsku? 🇵🇹" }, reaktion: "👍 2" },
    { von: "alex", text: "Ich bin bis Mitte Dezember in Marrakesch, danach wieder Lissabon!", lang: "de", ue: { en: "I'm in Marrakesh until mid-December, then back to Lisbon!", sk: "Do polovice decembra som v Marakéši, potom zase v Lisabone!" } },
    { von: "lea", ort: "Lissabon · Alfama", text: "Hier haben wir unser Airbnb", lang: "de", ue: { en: "This is where our Airbnb is", sk: "Tu máme naše Airbnb" } },
    { system: "🧭 Treffer: <b>Du</b>, <b>Lea</b> & <b>Nico</b> seid vom 10. bis 15.1. in Lissabon" },
    { von: "nico", text: "@Du perfekt, dann gehen wir zusammen surfen 🏄", lang: "de", ue: { en: "@You perfect, then we'll go surfing together 🏄", sk: "@Ty super, tak pôjdeme spolu surfovať 🏄" }, reaktion: "❤️ 3" },
    { system: "🚩 Neues Pionier-Land: <b>Mia</b> war vor allen anderen in Kolumbien" },
    { von: "jonas", text: "Anyone around Chiang Mai in February? We found a great coworking space 🙌", lang: "en", ue: { de: "Ist im Februar jemand in der Nähe von Chiang Mai? Wir haben einen tollen Coworking-Space gefunden 🙌", sk: "Je niekto vo februári v okolí Chiang Mai? Našli sme skvelý coworking 🙌" } },
    { von: "mia", sprache: "0:14" },
  ] },
  { id: "lissabon", art: "gruppe", name: "Lissabon im Januar", herkunft: "Treffer", mitglieder: ["du", "lea", "nico"], ungelesen: 1, nachrichten: [
    { system: "🧭 Gruppe aus dem Treffer: <b>Du</b>, <b>Lea</b> & <b>Nico</b> in Lissabon" },
    { von: "lea", text: "Wir kommen am 8. an, du am 10.?", lang: "de", ue: { en: "We arrive on the 8th, you on the 10th?", sk: "My prídeme 8., ty 10.?" } },
    { von: "nico", text: "Surfbretter leihen wir vor Ort 🏄", lang: "de", ue: { en: "We'll rent surfboards there 🏄", sk: "Surfy si požičiame na mieste 🏄" } },
  ] },
  { id: "idee-ericeira", art: "gruppe", name: "Haus in Ericeira", herkunft: "Idee", idee: "ericeira", mitglieder: ["alex", "sam", "du"], nachrichten: [
    { system: "🏠 Gruppe aus der Idee von <b>Alex</b>: Haus in Ericeira" },
    { von: "sam", text: "Februar passt mir gut!", lang: "de", ue: { en: "February works for me!", sk: "Február mi vyhovuje!" } },
  ] },
  { id: "e-mia", art: "einzel", mit: "mia", ungelesen: 1, nachrichten: [
    { von: "mia", text: "¡Hola! ¿Cuándo vienes a México? 🌮", lang: "es", ue: { de: "Hallo! Wann kommst du nach Mexiko? 🌮", en: "Hi! When are you coming to Mexico? 🌮", sk: "Ahoj! Kedy prídeš do Mexika? 🌮" } },
    { von: "du", text: "Vielleicht im März!" },
    { von: "mia", text: "¡Perfecto! Te guardo una habitación en Oaxaca.", lang: "es", ue: { de: "Perfekt! Ich halte dir ein Zimmer in Oaxaca frei.", en: "Perfect! I'll keep a room free for you in Oaxaca.", sk: "Super! Nechám ti voľnú izbu v Oaxace." } },
  ] },
  { id: "e-alex", art: "einzel", mit: "alex", nachrichten: [
    { von: "alex", text: "Bist du im Dezember noch in Málaga?", lang: "de", ue: { en: "Are you still in Málaga in December?", sk: "Budeš v decembri ešte v Málage?" } },
  ] },
];
// Was die App selbst schreibt, erscheint in der App-Sprache; was Freunde schreiben, bleibt im Original
chats.forEach(c => {
  if (c.art !== "einzel") c.name = t(c.name);
  c.nachrichten.forEach(n => { if (n.system) n.system = t(n.system); if (n.ort) n.ort = t(n.ort); if (n.von === "du" && n.text) n.text = t(n.text); });
});
let aktuellerChat = null;
const uebersetzt = {};
const ohneHtml = t => String(t).replace(/[&<>"']/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[z]);
function textMitErwaehnung(t) { return ohneHtml(t).replace(/@(\p{L}+)/gu, '<span class="erwaehnung">@$1</span>'); }
const spracheName = code => new Intl.DisplayNames([SPRACHE], { type: "language" }).of(code);
const chatName = c => c.art === "einzel" ? person(c.mit).name : c.name;
const istFremd = n => n.lang && n.lang !== SPRACHE && n.ue && n.ue[SPRACHE];
function vorschau(c) {
  const n = c.nachrichten[c.nachrichten.length - 1];
  if (!n) return t("Noch keine Nachricht");
  if (n.system) return n.system.replace(/<[^>]+>/g, "");
  const wer = c.art !== "einzel" ? (n.von === "du" ? t("Du") : person(n.von).name) + ": " : n.von === "du" ? t("Du") + ": " : "";
  if (n.sprache) return wer + t("🎤 Sprachnachricht");
  if (n.ort) return wer + "📍 " + n.ort;
  return wer + (istFremd(n) && uebersetzt[c.id] ? n.ue[SPRACHE] : n.text);
}
function chatPunkt() {
  const summe = chats.reduce((s, c) => s + (c.ungelesen || 0), 0), knopf = document.querySelector('#leiste [data-seite="chat"]');
  let punkt = knopf.querySelector(".punkt");
  if (!summe) return punkt?.remove();
  if (!punkt) { punkt = document.createElement("span"); punkt.className = "punkt"; knopf.appendChild(punkt); }
  punkt.textContent = summe;
}
function chatListeAufbauen() {
  const reihe = [...chats.filter(c => c.art === "alle"), ...chats.filter(c => c.art !== "alle")];
  document.getElementById("chat-liste").innerHTML = reihe.map(c => {
    let bild;
    if (c.art === "einzel") { const p = person(c.mit); bild = `<div class="bildchen person" style="background:${p.farbe}">${kuerzel(p.name)}</div>`; }
    else bild = `<div class="bildchen">${c.art === "alle" ? "🌍" : c.herkunft === "Idee" ? "🏠" : c.herkunft === "Treffer" ? "🧭" : "👥"}</div>`;
    const marke = c.art === "alle" ? '<span class="marke-klein">Beta</span>' : c.herkunft ? `<span class="marke-klein">${t("aus " + c.herkunft)}</span>` : "";
    return `<li class="chat-zeile" data-id="${c.id}">${bild}<div class="mitte"><b>${ohneHtml(chatName(c))} ${marke}${c.stumm ? " 🔕" : ""}</b><span>${ohneHtml(vorschau(c))}</span></div>${c.ungelesen ? `<div class="ungelesen">${c.ungelesen}</div>` : ""}</li>`;
  }).join("");
  document.querySelectorAll(".chat-zeile").forEach(z => {
    const c = chats.find(x => x.id === z.dataset.id);
    let timer = null, lang = false;
    z.addEventListener("pointerdown", () => { lang = false; timer = setTimeout(() => { lang = true; chatAktionen(c); }, 550); });
    ["pointerup", "pointerleave", "pointercancel", "pointermove"].forEach(ev => z.addEventListener(ev, e => { if (ev !== "pointermove" || Math.abs(e.movementY) > 3) clearTimeout(timer); }));
    z.addEventListener("contextmenu", e => { e.preventDefault(); clearTimeout(timer); lang = true; chatAktionen(c); });
    z.addEventListener("click", () => { if (!lang) gespraechOeffnen(c); });
  });
  chatPunkt();
}
function chatAktionen(c) {
  const blatt = document.getElementById("aktion-blatt");
  document.getElementById("aktion-titel").textContent = chatName(c);
  const knoepfe = c.art === "alle" ? [[t(c.stumm ? "🔔 Wieder einschalten" : "🔕 Stummschalten"), () => { c.stumm = !c.stumm; }]]
    : c.art === "gruppe" ? [[t("🔕 Stummschalten"), () => { c.stumm = !c.stumm; }], [t("Gruppe verlassen"), () => gruppeVerlassen(c), true]]
    : [[t("Chat löschen (nur bei dir)"), () => { chats.splice(chats.indexOf(c), 1); hinweis(t("Nur bei dir gelöscht – {name} sieht den Chat weiter", { name: person(c.mit).name })); }, true]];
  const box = document.getElementById("aktion-knoepfe"); box.innerHTML = "";
  knoepfe.forEach(([t, f, gefahr]) => { const b = document.createElement("button"); b.className = "knopf-leise" + (gefahr ? " gefahr" : ""); b.textContent = t; b.onclick = () => { blatt.classList.remove("offen"); f(); chatListeAufbauen(); }; box.appendChild(b); });
  blatt.classList.add("offen");
}
document.getElementById("aktion-abbrechen").onclick = () => document.getElementById("aktion-blatt").classList.remove("offen");
document.getElementById("aktion-blatt").onclick = e => { if (e.target.id === "aktion-blatt") e.target.classList.remove("offen"); };
function gruppeVerlassen(c) {
  c.nachrichten.push({ system: t("<b>Du</b> hast die Gruppe verlassen") });
  chats.splice(chats.indexOf(c), 1);
  hinweis("Die anderen sehen: „Du hast die Gruppe verlassen“");
}
function gespraechOeffnen(c) {
  aktuellerChat = c; c.ungelesen = 0;
  document.getElementById("gespraech-name").textContent = chatName(c);
  const p = c.art === "einzel" && person(c.mit);
  document.getElementById("gespraech-unter").textContent = c.art === "alle" ? t("Alle Mitglieder · nur in der Beta") : c.art === "gruppe" ? c.mitglieder.map(id => person(id).name).join(", ") : `${flagge(p.land)} ${p.ort} · ${uhrzeit(p.tz)}${t(" Uhr")}`;
  document.getElementById("uebersetzen").style.display = c.nachrichten.some(istFremd) ? "" : "none";
  seiteZeigen("unterhaltung");
  chatAufbauen(); chatPunkt();
}
function einzelChat(id) {
  let c = chats.find(x => x.art === "einzel" && x.mit === id);
  if (!c) { c = { id: "e-" + id, art: "einzel", mit: id, nachrichten: [] }; chats.splice(1, 0, c); }
  gespraechOeffnen(c);
}
function chatAufbauen() {
  const c = aktuellerChat, an = !!uebersetzt[c.id], v = document.getElementById("verlauf");
  const knopf = document.getElementById("uebersetzen");
  knopf.classList.toggle("an", an); knopf.setAttribute("aria-pressed", an); knopf.textContent = t(an ? "🌐 Original" : "🌐 Übersetzen");
  v.innerHTML = (an ? `<div class="ue-band">${t("Nachrichten in anderen Sprachen werden auf {s} angezeigt", { s: spracheName(SPRACHE) })}</div>` : "") + c.nachrichten.map((n, k) => {
    if (n.system) return `<div class="system">${n.system}</div>`;
    const p = person(n.von), ich = n.von === "du";
    const zeigUe = istFremd(n) && an && !n.original;
    let inhalt = n.text ? textMitErwaehnung(zeigUe ? n.ue[SPRACHE] : n.text) : "";
    if (istFremd(n) && an) inhalt += `<span class="ue-hinweis">${t(zeigUe ? "Übersetzt aus {s}" : "Original auf {s}", { s: spracheName(n.lang) })} · <button data-k="${k}">${t(zeigUe ? "Original anzeigen" : "Übersetzung anzeigen")}</button></span>`;
    if (n.ort) inhalt = `<div class="ortkarte"><div class="ikon">📍</div><div><b>${n.ort}</b><br><span style="font-size:13px;opacity:.8">${ohneHtml(zeigUe ? n.ue[SPRACHE] : n.text)}</span></div></div>`;
    if (n.sprache) inhalt = `<div class="sprache">▶︎<div class="welle"></div>${n.sprache}</div>`;
    const nameZeigen = !ich && c.art !== "einzel";
    return `<div class="msg${ich ? " ich" : ""}">${ich ? "" : ava(p)}<div class="blase">${nameZeigen ? `<small>${p.name}</small>` : ""}${inhalt}${n.reaktion ? `<span class="reaktionen">${n.reaktion}</span>` : ""}</div></div>`;
  }).join("");
  v.querySelectorAll(".ue-hinweis button").forEach(b => b.onclick = () => { const n = c.nachrichten[b.dataset.k]; n.original = !n.original; chatAufbauen(); });
  v.scrollTop = v.scrollHeight;
}
document.getElementById("uebersetzen").onclick = () => { const c = aktuellerChat; uebersetzt[c.id] = !uebersetzt[c.id]; c.nachrichten.forEach(n => delete n.original); chatAufbauen(); };
document.getElementById("gespraech-zurueck").onclick = () => seiteZeigen("chat");
function senden() {
  const feld = document.getElementById("chat-text"), t = feld.value.trim();
  if (!t || !aktuellerChat) return;
  aktuellerChat.nachrichten.push({ von: "du", text: t }); feld.value = "";
  chatAufbauen();
}
document.getElementById("chat-senden").onclick = senden;
document.getElementById("chat-mikro").onclick = () => hinweis("Gedrückt halten zum Aufnehmen – kommt mit dem echten Chat");
document.getElementById("chat-text").addEventListener("keydown", e => { if (e.key === "Enter") senden(); });
document.getElementById("chat-text").addEventListener("focus", () => document.documentElement.classList.add("tippt"));
document.getElementById("chat-text").addEventListener("blur", () => document.documentElement.classList.remove("tippt"));
// Neue Gruppe
const gruppeAuswahl = new Set();
document.getElementById("gruppe-neu-knopf").onclick = () => {
  gruppeAuswahl.clear(); document.getElementById("gruppe-name").value = "";
  document.getElementById("gruppe-leute").innerHTML = leute.filter(p => p.id !== "du").map(p => `<button data-id="${p.id}">${p.name}</button>`).join("");
  document.querySelectorAll("#gruppe-leute button").forEach(b => b.onclick = () => { b.classList.toggle("aktiv"); gruppeAuswahl.has(b.dataset.id) ? gruppeAuswahl.delete(b.dataset.id) : gruppeAuswahl.add(b.dataset.id); });
  seiteZeigen("gruppe-neu");
};
document.getElementById("gruppe-erstellen").onclick = () => {
  if (!gruppeAuswahl.size) return hinweis("Bitte mindestens eine Person auswählen");
  const name = document.getElementById("gruppe-name").value.trim() || [...gruppeAuswahl].map(id => person(id).name).join(", ");
  const c = { id: "g-" + Date.now(), art: "gruppe", name, mitglieder: ["du", ...gruppeAuswahl], nachrichten: [{ system: t("<b>Du</b> hast die Gruppe erstellt") }] };
  chats.splice(1, 0, c); gespraechOeffnen(c);
};
// Automatische Gruppe, sobald man bei einer Idee dabei ist
function ideeGruppe(i, dazu) {
  let c = chats.find(x => x.idee === i.id);
  if (dazu) {
    if (!c) { c = { id: "idee-" + i.id, art: "gruppe", name: t("{art} in {ort}", { art: i.art, ort: i.ort }), herkunft: "Idee", idee: i.id, mitglieder: [i.von, ...i.dabei], nachrichten: [{ system: t("🏠 Gruppe aus der Idee von <b>{name}</b>: {titel}", { name: person(i.von).name, titel: t("{art} in {ort}", { art: i.art, ort: i.ort }) }) }] }; chats.splice(1, 0, c); }
    else if (!c.mitglieder.includes("du")) { c.mitglieder.push("du"); c.nachrichten.push({ system: t("<b>Du</b> bist dazugekommen") }); }
  } else if (c) { chats.splice(chats.indexOf(c), 1); }
  return c;
}

// ---------- Ideen ----------
// Jede Idee ist ein geteilter Link. Bei Airbnb liest die App Foto, Art, Ort und Bewertung aus der Vorschau des Links.
// Plätze und Preis legt die teilende Person fest (vorausgefüllt, sofern die Seite sie verrät).
const ideen = [
  { id: "lissabon", von: "lea", art: "Wohnung", ort: "Lissabon", land: "PT", bewertung: "4,9", zimmer: "2 Schlafzimmer", gaeste: 4, notiz: "Für Januar?", anreise: "2027-01-08", abreise: "2027-01-20", preis: 96, plaetze: 4, dabei: ["nico"], sicht: "🌍 Alle", herzen: 4, kommentare: 3, quelle: "Airbnb", farbe: "linear-gradient(135deg,#e9c99a,#c0582f)" },
  { id: "ericeira", von: "alex", art: "Haus", ort: "Ericeira", land: "PT", bewertung: "4,8", zimmer: "3 Schlafzimmer", gaeste: 8, notiz: "Direkt am Surfstrand", anreise: "2027-02-13", abreise: "2027-02-20", preis: null, plaetze: 6, dabei: ["sam", "du"], sicht: "👥 Lieblingsleute", herzen: 2, kommentare: 1, quelle: "Airbnb", farbe: "linear-gradient(135deg,#bcd6d8,#3f6b8a)" },
  { id: "canggu", von: "jonas", art: "Villa", ort: "Canggu", land: "ID", bewertung: "4,95", zimmer: "4 Schlafzimmer", gaeste: 8, notiz: "", zeitraum: "März", preis: 180, plaetze: 6, dabei: ["ben", "lea", "nico", "mia", "alex"], sicht: "🌍 Alle", herzen: 5, kommentare: 6, quelle: "Airbnb", farbe: "linear-gradient(135deg,#cfe0b8,#6f8a3a)" },
  { id: "chiangmai", von: "ben", art: "Gästehaus", ort: "Chiang Mai", land: "TH", bewertung: "", zimmer: "1 Schlafzimmer", gaeste: 3, notiz: "Günstig für länger", zeitraum: "flexibel", preis: null, plaetze: 3, dabei: [], sicht: "👤 3 Personen", herzen: 1, kommentare: 0, quelle: "booking.com", farbe: "linear-gradient(135deg,#f0dca8,#b98a2e)" },
];
ideen.forEach(i => { i.art = t(i.art); i.ort = t(i.ort); if (i.zeitraum) i.zeitraum = t(i.zeitraum); i.sicht = t(i.sicht); });
let ideenFilter = "alle", ideenReiter = "unterkunft", tippsFilter = "alle", tippsOrt = null;
// Ortstipps von Freunden (Beispieldaten); Text bleibt in der Sprache der Person, die ihn geschrieben hat
const TIPP_ARTEN = { cafe: "☕ Café", essen: "🍽️ Essen", erleben: "🏄 Erleben", arbeiten: "💻 Arbeiten", praktisch: "🧭 Praktisches" };
const tipps = [
  { von: "lea", ort: "Lissabon", land: "PT", art: "cafe", text: "Kleines Café am Aussichtspunkt in Graça: morgens fast leer, mit Blick über die ganze Stadt.", daumen: ["alex", "nico"] },
  { von: "alex", ort: "Lissabon", land: "PT", art: "arbeiten", text: "Coworking in Cais do Sodré mit schnellem WLAN, Tagespass möglich.", daumen: ["lea"] },
  { von: "nico", ort: "Lissabon", land: "PT", art: "erleben", text: "Surfstunden in Carcavelos, mit dem Zug in etwa 20 Minuten erreichbar.", daumen: [] },
  { von: "jonas", ort: "Chiang Mai", land: "TH", art: "essen", text: "Khao Soi auf dem Sonntags-Nachtmarkt, unbedingt probieren.", daumen: ["ben", "mia"] },
  { von: "ben", ort: "Chiang Mai", land: "TH", art: "praktisch", text: "SIM-Karte direkt am Flughafen holen, im Zentrum ist es umständlicher.", daumen: ["jonas"] },
  { von: "lea", ort: "Canggu, Bali", land: "ID", art: "erleben", text: "Sonnenuntergang am Echo Beach, früh da sein für einen guten Platz.", daumen: ["nico", "alex", "jonas"] },
  { von: "mia", ort: "Oaxaca", land: "MX", art: "essen", text: "Kochkurs für Mole auf dem Markt, sehr zu empfehlen.", daumen: [] }
];
tipps.forEach(x => x.ort = t(x.ort));
// „Preis ansehen“: öffnet die Unterkunft mit Zeitraum und Personenzahl; aktueller Preis und Verfügbarkeit kommen immer von der Seite selbst.
// Im Prototyp gibt es keine echten Inserat-Links, deshalb die Suche am Ort.
function ansehenLink(i) {
  const leuteZahl = 1 + i.dabei.length;
  if (i.quelle === "booking.com") { const u = new URL("https://www.booking.com/searchresults.html"); u.searchParams.set("ss", i.ort); u.searchParams.set("group_adults", leuteZahl); if (i.anreise) { u.searchParams.set("checkin", i.anreise); u.searchParams.set("checkout", i.abreise); } return u.href; }
  const echt = !!i.link, u = new URL(i.link || `https://www.airbnb.de/s/${encodeURIComponent(i.ort)}/homes`);
  if (i.anreise) { u.searchParams.set(echt ? "check_in" : "checkin", i.anreise); u.searchParams.set(echt ? "check_out" : "checkout", i.abreise); }
  u.searchParams.set("adults", leuteZahl);
  return u.href;
}
// „Gebucht“: aus der Idee wird eine Reise für alle, die dabei sind
function gebuchtMelden(i) {
  const wer = [i.von, ...i.dabei];
  if (!i.anreise) {
    seiteZeigen("reise-neu");
    document.querySelector("#seite-reise-neu input").value = i.ort;
    return hinweis("Nur noch die Daten eintragen");
  }
  i.gebucht = true;
  reisen.push({ wer, ziel: i.ort, land: i.land, von: i.anreise, bis: i.abreise });
  reisenAufbauen();
  const c = ideeGruppe(i, true); c.nachrichten.push({ system: t("✅ <b>Gebucht!</b> {titel}, {daten} steht jetzt in den Reisen", { titel: t("{art} in {ort}", { art: i.art, ort: i.ort }), daten: kurz(i.anreise) + "–" + kurz(i.abreise) }) });
  ideenAufbauen();
  hinweis(t("In Reisen eingetragen für {wer}", { wer: wer.map(id => id === "du" ? t("dich") : person(id).name).join(", ") }));
}
function tippsAufbauen() {
  const laender = ["alle", ...new Set(tipps.map(x => x.land))];
  document.getElementById("tipps-filter").innerHTML = (tippsOrt ? `<button class="aktiv" data-ort="1">📍 ${ohneHtml(tippsOrt)} ✕</button>` : "") +
    laender.map(l => `<button data-l="${l}" class="${!tippsOrt && l === tippsFilter ? "aktiv" : ""}">${l === "alle" ? t("Alle|Filter") : flagge(l) + " " + landName(l)}</button>`).join("");
  document.querySelectorAll("#tipps-filter button").forEach(b => b.onclick = () => { if (b.dataset.ort) tippsOrt = null; else { tippsOrt = null; tippsFilter = b.dataset.l; } tippsAufbauen(); });
  const sichtbar = tipps.filter(x => tippsOrt ? x.ort === tippsOrt : tippsFilter === "alle" || x.land === tippsFilter).sort((a, b) => b.daumen.length - a.daumen.length);
  document.getElementById("tipps-liste").innerHTML = sichtbar.map(x => {
    const p = person(x.von), an = x.daumen.includes("du");
    return `<div class="kasten tipp"><div class="tipp-kopf"><span class="tipp-art">${t(TIPP_ARTEN[x.art])}</span><span>${flagge(x.land)} ${ohneHtml(x.ort)}</span></div>
      <p>${ohneHtml(x.text)}</p>
      <div class="tipp-fuss"><span><span class="klein-ava" style="background:${p.farbe}">${kuerzel(p.name)}</span>${p.name}</span><button class="daumen${an ? " an" : ""}" data-i="${tipps.indexOf(x)}">👍 ${x.daumen.length}</button></div></div>`;
  }).join("");
  document.querySelectorAll("#tipps-liste .daumen").forEach(b => b.onclick = () => { const x = tipps[b.dataset.i], k = x.daumen.indexOf("du"); if (k >= 0) x.daumen.splice(k, 1); else x.daumen.push("du"); tippsAufbauen(); });
}
function ideenAufbauen() {
  document.querySelectorAll("#ideen-reiter button").forEach(b => b.classList.toggle("aktiv", b.dataset.r === ideenReiter));
  document.getElementById("bereich-unterkunft").style.display = ideenReiter === "unterkunft" ? "" : "none";
  document.getElementById("bereich-tipps").style.display = ideenReiter === "tipps" ? "" : "none";
  document.getElementById("idee-neu").textContent = t(ideenReiter === "tipps" ? "+ Tipp" : "+ Teilen");
  if (ideenReiter === "tipps") tippsAufbauen();
  const laender = ["alle", ...new Set(ideen.map(i => i.land))];
  document.getElementById("ideen-filter").innerHTML = laender.map(l => `<button data-l="${l}" class="${l === ideenFilter ? "aktiv" : ""}">${l === "alle" ? t("Alle|Filter") : flagge(l) + " " + new Intl.DisplayNames([SPRACHE], { type: "region" }).of(l)}</button>`).join("");
  document.querySelectorAll("#ideen-filter button").forEach(b => b.onclick = () => { ideenFilter = b.dataset.l; ideenAufbauen(); });
  document.getElementById("ideen-liste").innerHTML = ideen.map((i, n) => {
    if (ideenFilter !== "alle" && i.land !== ideenFilter) return "";
    if (i.abreise && i.abreise < new Date().toISOString().slice(0, 10)) return "";
    const belegt = 1 + i.dabei.length, frei = Math.max(0, i.plaetze - belegt), ichDabei = i.dabei.includes("du");
    const proPerson = Math.round(i.preis / belegt);
    return `
    <div class="kasten idee">
      <div class="bild" style="background:${i.farbe}"><span class="quelle">${i.quelle}</span><span class="sicht">${i.sicht}</span>${i.gebucht ? '<span class="gebucht">' + t("✅ Gebucht") + '</span>' : ""}<button class="herzen" data-n="${n}">❤️ ${i.herzen}</button></div>
      <div class="inhalt">
        <b>${t("{art} in {ort}", { art: i.art, ort: i.ort })} ${flagge(i.land)}</b>
        <span class="ort">${[i.bewertung ? "★ " + i.bewertung : "", i.anreise ? kurz(i.anreise) + "–" + kurz(i.abreise) : i.zeitraum].filter(Boolean).join(" · ")}</span>
        <div class="geteilt">${ava(person(i.von))}<span><b>${person(i.von).name}</b><br>${i.notiz ? "„" + ohneHtml(i.notiz) + "“" : t("hat das geteilt")}</span></div>
        <div class="zahlen">
          <div><b>🛏 ${parseInt(i.zimmer) || "–"}</b><small>${t("Schlafzimmer")}</small></div>
          <div><b>👥 ${i.plaetze}</b><small>${i.plaetze < i.gaeste ? t("von {n} Gästen", { n: i.gaeste }) : t("Gäste")}</small></div>
          <div class="${frei ? "" : "voll"}"><b>${frei ? frei : t("Voll")}</b><small>${t(frei ? "Plätze frei" : "alle vergeben")}</small></div>
        </div>
        ${i.preis ? `<div class="rechner">💶 ${i.preis} € / ${t("Nacht")} · <b>${t("{n} € pro Person", { n: proPerson })}</b> ${t("bei {n}", { n: belegt })}</div>` : ""}
        <div class="dabei-leiste"><div class="dabei-gesichter">${[i.von, ...i.dabei].map(id => ava(person(id))).join("")}</div></div>
        <div class="aktionen">
          ${i.gebucht ? `<button class="knopf-gross ist-dabei" disabled style="opacity:1">${t("✅ Gebucht · steht in Reisen")}</button>` : `<button class="knopf-gross dabei-knopf ${ichDabei ? "ist-dabei" : ""}" data-n="${n}" ${!frei && !ichDabei ? "disabled" : ""}>${t(ichDabei ? "✓ Du bist dabei" : frei ? "🙋 Ich wäre dabei" : "Leider voll")}</button>`}
          <button class="knopf-leise">💬 ${i.kommentare}</button>
        </div>
        <div class="aktionen" style="margin-top:8px">
          <a class="knopf-leise" href="${ansehenLink(i)}" target="_blank" rel="noopener" style="text-decoration:none;flex:1;text-align:center">${t(i.anreise ? "Preis ansehen ↗" : "Ansehen ↗")}</a>
          ${(ichDabei || i.von === "du") && !i.gebucht ? `<button class="knopf-leise gebucht-knopf" data-n="${n}" style="flex:1">${t("✓ Gebucht")}</button>` : ""}
        </div>
      </div></div>`;
  }).join("");
  document.querySelectorAll(".herzen").forEach(b => b.onclick = () => { ideen[b.dataset.n].herzen++; ideenAufbauen(); });
  document.querySelectorAll(".dabei-knopf").forEach(b => b.onclick = () => {
    const i = ideen[b.dataset.n], k = i.dabei.indexOf("du");
    if (k >= 0) { i.dabei.splice(k, 1); ideeGruppe(i, false); }
    else { i.dabei.push("du"); ideeGruppe(i, true); hinweis(t("{name} wird benachrichtigt · Gruppe im Chat", { name: person(i.von).name })); }
    ideenAufbauen();
  });
  document.querySelectorAll(".gebucht-knopf").forEach(b => b.onclick = () => gebuchtMelden(ideen[b.dataset.n]));
}

// ---------- Profil: Mitteilungen ----------
document.getElementById("mitteilungen").innerHTML = [["Neue Chat-Nachricht", "Bei Erwähnungen immer"], ["Jemand ist in der Nähe", "Nach deiner Treffer-Einstellung"], ["Neuer Reiseplan", "Wenn ein Freund eine Reise einträgt"], ["Neue Unterkunfts-Idee", ""]]
  .map(([a, u], i) => `<div class="zeile-einst"><div>${t(a)}${u ? `<small>${t(u)}</small>` : ""}</div><button class="schalter${i < 2 ? " an" : ""}"></button></div>`).join("");
document.querySelectorAll("#mitteilungen .schalter").forEach(b => b.onclick = () => b.classList.toggle("an"));

document.getElementById("idee-neu").onclick = () => {
  if (ideenReiter !== "tipps") return seiteZeigen("idee-neu");
  document.getElementById("tipp-ort").value = tippsOrt || ich().ort; document.getElementById("tipp-text").value = "";
  document.getElementById("tipp-arten").innerHTML = Object.keys(TIPP_ARTEN).map((k, i) => `<button data-a="${k}" class="${i === 0 ? "aktiv" : ""}">${t(TIPP_ARTEN[k])}</button>`).join("");
  document.querySelectorAll("#tipp-arten button").forEach(b => b.onclick = () => document.querySelectorAll("#tipp-arten button").forEach(x => x.classList.toggle("aktiv", x === b)));
  seiteZeigen("tipp-neu");
};
document.querySelectorAll("#ideen-reiter button").forEach(b => b.onclick = () => { ideenReiter = b.dataset.r; ideenAufbauen(); });
document.getElementById("tipp-speichern").onclick = () => {
  const ort = document.getElementById("tipp-ort").value.trim(), text = document.getElementById("tipp-text").value.trim();
  if (!ort || !text) return hinweis(t("Bitte Ort und Tipp ausfüllen"));
  const bekannt = [...leute, ...tipps].find(x => x.ort.toLowerCase() === ort.toLowerCase());
  tipps.unshift({ von: "du", ort, land: bekannt ? bekannt.land : ich().land, art: document.querySelector("#tipp-arten .aktiv").dataset.a, text, daumen: [] });
  tippsOrt = null; tippsFilter = "alle"; seiteZeigen("ideen"); ideenAufbauen(); hinweis(t("Tipp geteilt"));
};
document.getElementById("einfuegen").onclick = async () => {
  try { document.getElementById("idee-link").value = await navigator.clipboard.readText(); vorschauZeigen(); }
  catch (e) { document.querySelector(".mehr-optionen").open = true; hinweis("Link bitte ins Feld einfügen"); document.getElementById("idee-link").focus(); }
};
document.getElementById("idee-link").addEventListener("input", vorschauZeigen);
function vorschauZeigen() {
  const v = document.getElementById("idee-link").value.trim(), box = document.getElementById("idee-vorschau");
  if (!v) { box.style.display = "none"; return; }
  const airbnb = /(airbnb\.[a-z.]+\/(rooms|h)\/|abnb\.me\/)/i.test(v);
  box.style.display = "block";
  box.innerHTML = airbnb
    ? `✅ <b>${t("Airbnb erkannt")}</b><br><span style='font-size:13px;color:var(--text-leise)'>${t("Foto, Art, Ort, Bewertung, Schlafzimmer und Gäste werden automatisch übernommen (im Prototyp noch Beispiel).")}</span>`
    : `🔗 <b>${t("Webseite erkannt")}</b><br><span style='font-size:13px;color:var(--text-leise)'>${t("Titel und Bild kommen aus der Vorschau der Seite.")}</span>`;
}
let plaetze = 8;
document.getElementById("pl-minus").onclick = () => { plaetze = Math.max(2, plaetze - 1); document.getElementById("pl-zahl").textContent = plaetze; };
document.getElementById("pl-plus").onclick = () => { plaetze = Math.min(8, plaetze + 1); document.getElementById("pl-zahl").textContent = plaetze; };
const kreise = { "Lieblingsleute": ["alex", "sam", "lea", "nico"], "Bali-Crew": ["lea", "nico", "jonas"] };
document.querySelectorAll("#sicht-wahl button").forEach(b => b.onclick = () => {
  document.querySelectorAll("#sicht-wahl button").forEach(x => x.classList.toggle("aktiv", x === b));
  const d = document.getElementById("sicht-detail"), art = b.dataset.s;
  d.style.display = art === "alle" ? "none" : "block";
  if (art === "kreis") d.innerHTML = Object.entries(kreise).map(([n, ids], i) => `<div class="zeile-einst"><div>${n}<small>${ids.map(id => person(id).name).join(", ")}</small></div><button class="schalter${i ? "" : " an"}"></button></div>`).join("") + `<button class="knopf-leise" style="margin-top:8px">${t("+ Neuer Kreis")}</button>`;
  if (art === "einzeln") d.innerHTML = `<div class="chips" style="flex-wrap:wrap;margin:0;padding:0">${leute.filter(p => p.id !== "du").map(p => `<button>${p.name}</button>`).join("")}</div>`;
  d.querySelectorAll(".schalter").forEach(x => x.onclick = () => x.classList.toggle("an"));
  d.querySelectorAll(".chips button").forEach(x => x.onclick = () => x.classList.toggle("aktiv"));
});
document.getElementById("idee-speichern").onclick = () => { hinweis("Teilen kommt in Phase 5"); seiteZeigen("ideen"); };
// ---------- Familien-Ansicht ----------
function naechsteReise(id) {
  const heute = new Date().toISOString().slice(0, 10);
  return reisen.filter(r => r.wer.includes(id) && r.von && r.bis >= heute).sort((a, b) => a.von.localeCompare(b.von))[0];
}
function familieAufbauen() {
  const du = BETRACHTER;
  document.getElementById("familie-karten").innerHTML = leute.filter(p => FAMILIE_SIEHT.includes(p.id)).map(p => {
    const r = naechsteReise(p.id), heute = new Date().toISOString().slice(0, 10);
    const naechte = r ? Math.round((datum(r.bis) - datum(r.von)) / 864e5) : 0;
    const weitere = reisen.filter(x => x !== r && x.wer.includes(p.id) && (x.vielleicht || x.bis >= heute));
    return `<div class="fam-karte" data-id="${p.id}"><div class="ava" style="background:${p.farbe}">${kuerzel(p.name)}</div><div style="flex:1">
      <b class="fam-name">${p.name}</b><div class="wo">${flagge(p.land)}&nbsp; ${t(p.id === "du" ? "bist in" : "ist in")} <b style="display:inline;font-size:16px">${p.ort}</b></div>
      <div class="klein">${t("Dort ist es {z} Uhr", { z: uhrzeit(p.tz) })}${familieMitStandort ? " · " + t("{km} von dir", { km: km(entfernungKm(du.lat, du.lon, p.lat, p.lon)) }) : ""}</div>
      ${r ? `<div class="naechste"><span class="nr-titel">${t("✈︎ Nächste Reise")}</span><span class="nr-ort">${flagge(r.land)}&nbsp; ${r.ziel}</span><span class="nr-daten">${kurz(r.von)} – ${kurz(r.bis)} · ${naechte} ${t(naechte === 1 ? "Nacht" : "Nächte")}</span></div>` : ""}
      ${weitere.length ? `<div class="weitere">${weitere.map(x => `${flagge(x.land)} ${x.ziel} · ${x.von ? kurz(x.von) + "–" + kurz(x.bis) : t("vielleicht im {m}", { m: datum(x.monat + "-01").toLocaleDateString(LOC, { month: "long" }) })}`).join("<br>")}</div>` : ""}
    </div></div>`;
  }).join("");
  document.querySelectorAll(".fam-karte").forEach(k => k.onclick = () => { const p = leute.find(x => x.id === k.dataset.id); map.flyTo({ center: [p.lon, p.lat], zoom: 10, speed: 1.3, essential: true }); });
}
function familieSetzen(an) {
  familieModus = an;
  document.documentElement.classList.toggle("familie", an);
  seiteZeigen("karte");
  if (an) familieAufbauen();
  pinsSetzen();
  if (an) { const b = new maplibregl.LngLatBounds(); sichtbareLeute().forEach(p => b.extend([p.lon, p.lat])); map.fitBounds(b, { padding: { top: 120, bottom: Math.min(window.innerHeight * 0.62, document.getElementById("familie-blatt").offsetHeight + 40), left: 60, right: 60 }, maxZoom: 6, duration: 900 }); }
}
document.getElementById("familie-start").onclick = () => familieSetzen(true);
document.getElementById("familie-ende").onclick = () => familieSetzen(false);
document.getElementById("familie-standort").onclick = e => { e.currentTarget.classList.toggle("an"); familieMitStandort = e.currentTarget.classList.contains("an"); familieAufbauen(); pinsSetzen(); };

// ---------- Sprache ----------
// Klassisch wie in den Einstellungen einer App: Zeile mit aktuellem Wert, Auswahlliste mit Haken
const FLAGGE_SPRACHE = { de: "🇩🇪", en: "🇬🇧", sk: "🇸🇰" };
document.getElementById("sprach-marke").textContent = FLAGGE_SPRACHE[SPRACHE];
document.getElementById("sprache-wert").textContent = FLAGGE_SPRACHE[SPRACHE] + " " + SPRACHEN[SPRACHE];
document.getElementById("sprache-zeile").onclick = () => {
  const blatt = document.getElementById("aktion-blatt");
  document.getElementById("aktion-titel").textContent = t("Sprache");
  document.getElementById("aktion-knoepfe").innerHTML = `<div class="sprach-liste" role="radiogroup">${Object.entries(SPRACHEN).map(([k, n]) =>
    `<button class="sprach-option${k === SPRACHE ? " aktiv" : ""}" role="radio" aria-checked="${k === SPRACHE}" data-s="${k}"><span class="flagge">${FLAGGE_SPRACHE[k]}</span><span class="name">${n}</span><span class="haken">✓</span></button>`).join("")}</div>
    <p class="sprach-hinweis">${t("Standard ist die Sprache deines Handys.")}</p>`;
  document.querySelectorAll(".sprach-option").forEach(b => b.onclick = () => {
    if (b.dataset.s === SPRACHE) return blatt.classList.remove("offen");
    try { localStorage.setItem("ahoi-sprache", b.dataset.s); } catch (e) {}
    location.reload();
  });
  blatt.classList.add("offen");
};

// ---------- Status ----------
function statusAufbauen() {
  const du = ich(), eigen = du.status && !STATUS_VORLAGEN[du.status];
  document.getElementById("mein-status-anzeige").textContent = statusText(du) || t("Kein Status");
  document.getElementById("status-chips").innerHTML = Object.keys(STATUS_VORLAGEN).map(k => `<button data-k="${k}" class="${du.status === k ? "aktiv" : ""}">${t(STATUS_VORLAGEN[k])}</button>`).join("") +
    `<button data-k="__eigen" class="${eigen ? "aktiv" : ""}">${eigen ? "✏️ " + ohneHtml(du.status.text) : t("✏️ Eigener")}</button>`;
  document.querySelectorAll("#status-chips button").forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if (k === "__eigen") { const box = document.getElementById("status-eigen"); box.classList.toggle("offen"); document.getElementById("status-text").value = eigen ? du.status.text : ""; if (box.classList.contains("offen")) document.getElementById("status-text").focus(); return; }
    statusSetzen(du.status === k ? null : k);
  });
}
function statusSetzen(wert) {
  ich().status = wert;
  if (ECHT) SB.from("profile").update({ status: wert && wert.text ? wert.text : wert }).eq("id", ECHT_DATEN.uid).then(r => { if (r.error) hinweis(t("Speichern hat nicht geklappt")); });
  else try { localStorage.setItem("ahoi-status", JSON.stringify(wert)); } catch (e) {}
  document.getElementById("status-eigen").classList.remove("offen");
  statusAufbauen(); listeAufbauen();
}
document.getElementById("status-ok").onclick = () => { const v = document.getElementById("status-text").value.trim(); statusSetzen(v ? { text: v } : null); };
document.getElementById("status-text").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("status-ok").click(); });
statusAufbauen();

// ---------- Dein Nomadenjahr (Rückblick zum Durchtippen) ----------
const JAHR = new Date().getFullYear();
document.getElementById("jahr-name").textContent = t("Dein Nomadenjahr {jahr}", { jahr: JAHR });
const RB_FARBEN = {
  modern: ["linear-gradient(160deg,#0a84ff,#5e5ce6)", "linear-gradient(160deg,#ff9f0a,#ff375f)", "linear-gradient(160deg,#30d158,#0a84ff)", "linear-gradient(160deg,#bf5af2,#ff375f)", "linear-gradient(160deg,#ff375f,#ff9f0a)", "linear-gradient(160deg,#5e5ce6,#bf5af2)", "linear-gradient(160deg,#0071e3,#30d158)"],
  mission: Array(7).fill("radial-gradient(ellipse at 30% 20%,#0d2238,#06101c 70%)"),
  abenteuer: ["#efe0c0", "#e9d6ad", "#efe0c0", "#e6d0a3", "#efe0c0", "#e9d6ad", "#efe0c0"]
};
function rueckblickFolien() {
  const neu = ["VN", "HR", "GR", "MX", "TH"].filter(cc => besucht.includes(cc)), km = 41230, um = (km / 40075).toLocaleString(LOC, { maximumFractionDigits: 2 });
  const pio = PIONIER.filter(cc => besucht.includes(cc));
  return [
    `<p class="rb-klein">Ahoi · ${JAHR}</p><p class="rb-mittel">${t("Dein Nomadenjahr {jahr}", { jahr: JAHR })}</p><p class="rb-text">${t("Tippe rechts zum Weiterblättern, links zurück.")}</p>`,
    `<p class="rb-klein">${t("Neue Länder")}</p><p class="rb-gross">${neu.length}</p><div class="rb-flaggen">${neu.map(flagge).join("")}</div>`,
    `<p class="rb-klein">${t("Zurückgelegt")}</p><p class="rb-gross">${km.toLocaleString(LOC)}<span style="font-size:.4em"> km</span></p><p class="rb-text">${t("Das ist {x}-mal um die Erde.", { x: um })}</p>`,
    `<p class="rb-klein">${t("Treffen mit Freunden")}</p><p class="rb-gross">14</p><p class="rb-text">${t("Am häufigsten mit {name}: {n}-mal.", { name: "Lea", n: 5 })}</p>`,
    `<p class="rb-klein">${t("Am längsten warst du in")}</p><p class="rb-mittel">${flagge("ES")} Málaga</p><p class="rb-text">${t("{n} Nächte", { n: 62 })}</p>`,
    `<p class="rb-klein">🚩 ${t("Pionier")}</p><p class="rb-gross">${pio.length}×</p><p class="rb-text">${t("Hier warst du vor allen anderen aus dem Freundeskreis:")} ${pio.map(cc => flagge(cc) + " " + landName(cc)).join(", ")}</p>`,
    `<p class="rb-mittel">${t("Ahoi bis nächstes Jahr!")}</p><p class="rb-text">${t("Wohin geht es als Nächstes?")}</p><button class="rb-ende" id="rb-ende">${t("Schließen")}</button>`
  ];
}
let rbStand = 0, rbUhr = null;
function rueckblickZeigen(n) {
  const folien = rueckblickFolien(); rbStand = Math.max(0, Math.min(n, folien.length - 1));
  const folie = document.getElementById("rb-folie");
  folie.style.background = RB_FARBEN[stil][rbStand % 7];
  if (stil === "abenteuer") folie.style.backgroundImage = "var(--korn)";
  folie.innerHTML = `<div class="rb-folie-ein">${folien[rbStand]}</div>`;
  document.getElementById("rb-balken").innerHTML = folien.map((_, i) => `<span class="${i < rbStand ? "fertig" : i === rbStand ? "laeuft" : ""}"><i></i></span>`).join("");
  const ende = document.getElementById("rb-ende"); if (ende) ende.onclick = rueckblickSchliessen;
  clearTimeout(rbUhr);
  if (rbStand < folien.length - 1) rbUhr = setTimeout(() => rueckblickZeigen(rbStand + 1), 6000);
}
function rueckblickSchliessen() { clearTimeout(rbUhr); document.getElementById("rueckblick").classList.remove("offen"); }
document.getElementById("jahr-zeile").onclick = () => { document.getElementById("rueckblick").classList.add("offen"); rueckblickZeigen(0); };
document.getElementById("rb-rechts").onclick = () => rueckblickZeigen(rbStand + 1);
document.getElementById("rb-links").onclick = () => rueckblickZeigen(rbStand - 1);
document.getElementById("rb-zu").onclick = rueckblickSchliessen;

// ---------- Länder-Sammlung ----------
const LAENDER_SCHLUESSEL = ECHT ? "ahoi-echt-laender" : "ahoi-laender";
let besucht = ECHT ? [] : ["DE", "ES", "PT", "SK", "IT", "FR", "TH", "VN", "ID", "MX", "GR", "HR"];
try { const g = JSON.parse(localStorage.getItem(LAENDER_SCHLUESSEL) || "null"); if (Array.isArray(g)) besucht = g; } catch (e) {}
if (ECHT && ich().land && !besucht.includes(ich().land)) { besucht.push(ich().land); try { localStorage.setItem(LAENDER_SCHLUESSEL, JSON.stringify(besucht)); } catch (e) {} }
const landName = cc => { try { return new Intl.DisplayNames([SPRACHE], { type: "region" }).of(cc); } catch (e) { return cc; } };
// Meine Länder: im Profil nur eine Zeile, eigene Seite mit Freirubbel-Karte
const KONTINENTE = { EU: "Europa", AS: "Asien", AF: "Afrika", NA: "Nordamerika", SA: "Südamerika", OC: "Ozeanien", AN: "Antarktis" };
const PIONIER = ECHT ? [] : ["VN", "HR"];
const KONT_FARBEN = {
  modern: { EU: "#0a84ff", AS: "#ff9f0a", AF: "#ff375f", NA: "#30d158", SA: "#bf5af2", OC: "#40c8e0", AN: "#8e8e93", zu: "#d5d8de", meer: "#eef2f6", rand: "#ffffff" },
  mission: { EU: "#5fd4ea", AS: "#5fd4ea", AF: "#5fd4ea", NA: "#5fd4ea", SA: "#5fd4ea", OC: "#5fd4ea", AN: "#5fd4ea", zu: "#11263a", meer: "#06101c", rand: "#2b6f8a" },
  abenteuer: { EU: "#c0582f", AS: "#b8913f", AF: "#8a5a33", NA: "#6b7f3e", SA: "#b0503a", OC: "#4f6f86", AN: "#8a8478", zu: "#d6c7a2", meer: "#c9d3c7", rand: "#8a6a48" }
};
let welt = null;
function stempelAufbauen() {
  document.getElementById("laender-wert").textContent = besucht.length;
  if (document.getElementById("seite-meine-laender").classList.contains("offen")) meineLaenderAufbauen();
}
document.getElementById("laender-zeile").onclick = () => { seiteZeigen("meine-laender"); meineLaenderAufbauen(); };
document.getElementById("ml-bearbeiten").onclick = () => { seiteZeigen("laender"); laenderListe(""); };
async function meineLaenderAufbauen() {
  if (!welt) { try { welt = await (await fetch("weltkarte.json")).json(); } catch (e) { welt = []; } }
  const f = KONT_FARBEN[stil], kontVon = Object.fromEntries(welt.map(l => [l.i, l.k]));
  const kont = [...new Set(besucht.map(cc => kontVon[cc]).filter(k => k && k !== "AN"))];
  document.getElementById("ml-zahl").textContent = t("{n} Länder", { n: besucht.length });
  document.getElementById("ml-kont").textContent = t("{n} von 7 Kontinenten", { n: kont.length + (besucht.some(cc => kontVon[cc] === "AN") ? 1 : 0) });
  const pio = PIONIER.filter(cc => besucht.includes(cc));
  document.getElementById("ml-pionier").textContent = pio.length ? t("🚩 {n}× Pionier", { n: pio.length }) : "";
  const anteil = Math.min(1, (kont.length + (besucht.some(cc => kontVon[cc] === "AN") ? 1 : 0)) / 7), umfang = 2 * Math.PI * 27;
  document.getElementById("ml-ring").style.strokeDasharray = `${(anteil * umfang).toFixed(1)} ${umfang.toFixed(1)}`;
  document.getElementById("ml-ring-text").textContent = `${Math.round(anteil * 7)}/7`;
  const svg = document.getElementById("rubbelkarte");
  svg.innerHTML = `<defs><pattern id="kratzer" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="3" height="3" fill="${f.zu}"/><path d="M0 0v3" stroke="rgba(255,255,255,.35)" stroke-width=".6"/></pattern></defs><rect x="0" y="6" width="360" height="142" fill="${f.meer}"/>` +
    welt.map(l => { const frei = besucht.includes(l.i); return `<path data-cc="${l.i}" class="${frei ? "frei" : ""}" d="${l.d}" fill="${frei ? (f[l.k] || f.EU) : "url(#kratzer)"}" stroke="${f.rand}"><title>${landName(l.i)}</title></path>`; }).join("");
  svg.querySelectorAll("path").forEach(pfad => pfad.onclick = () => {
    const cc = pfad.dataset.cc, i = besucht.indexOf(cc);
    if (i >= 0) besucht.splice(i, 1); else { besucht.push(cc); hinweis(t("{land} freigerubbelt", { land: landName(cc) })); }
    try { localStorage.setItem(LAENDER_SCHLUESSEL, JSON.stringify(besucht)); } catch (e) {}
    stempelAufbauen();
  });
  const gruppen = {};
  besucht.forEach(cc => { const k = kontVon[cc] || "EU"; (gruppen[k] = gruppen[k] || []).push(cc); });
  document.getElementById("ml-kontinente").innerHTML = Object.keys(KONTINENTE).filter(k => gruppen[k]).map(k =>
    `<div class="kontinent"><b>${t(KONTINENTE[k])} · ${gruppen[k].length}</b><div class="laender-chips">${gruppen[k].sort((a, b) => landName(a).localeCompare(landName(b), SPRACHE)).map(cc => `<span>${flagge(cc)} ${landName(cc)}${PIONIER.includes(cc) ? " 🚩" : ""}</span>`).join("")}</div></div>`).join("");
}
function laenderListe(suche) {
  if (!laender) return hinweis("Einen Moment, Länder werden geladen …");
  const alle = [...new Set(laender.features.map(f => f.properties.iso).filter(c => /^[A-Z]{2}$/.test(c)))]
    .map(cc => [cc, landName(cc)]).sort((a, b) => a[1].localeCompare(b[1], SPRACHE))
    .filter(([cc, n]) => !suche || n.toLowerCase().includes(suche.toLowerCase()));
  const box = document.getElementById("land-liste");
  box.innerHTML = alle.map(([cc, n]) => `<div class="land-zeile${besucht.includes(cc) ? " an" : ""}" data-cc="${cc}"><span>${flagge(cc)}&nbsp;&nbsp;${n}</span><span class="haken">✓</span></div>`).join("");
  box.querySelectorAll(".land-zeile").forEach(z => z.onclick = () => {
    const cc = z.dataset.cc, i = besucht.indexOf(cc);
    if (i >= 0) besucht.splice(i, 1); else besucht.push(cc);
    try { localStorage.setItem(LAENDER_SCHLUESSEL, JSON.stringify(besucht)); } catch (e) {}
    z.classList.toggle("an"); stempelAufbauen(); if (!document.getElementById("seite-laender").classList.contains("offen")) return;
  });
}
document.getElementById("land-suche").addEventListener("input", e => laenderListe(e.target.value));
stempelAufbauen();
if (!ECHT) { reisenAufbauen(); chatListeAufbauen(); ideenAufbauen(); }


// ---------- Echte App: Profil, Ort, Einladen, Verwaltung ----------
const BALD = {
  reisen: ["✈️", "Reisen", "Hier trägst du bald deine Reisen ein und siehst, wann ihr euch über den Weg lauft."],
  chat: ["💬", "Chat", "Der Chat mit deinen Freunden kommt als Nächstes."],
  ideen: ["🏡", "Ideen", "Unterkunfts-Ideen und Ortstipps kommen bald."]
};
function fragen(titel, knoepfe) {
  const blatt = document.getElementById("aktion-blatt");
  document.getElementById("aktion-titel").textContent = titel;
  const box = document.getElementById("aktion-knoepfe"); box.innerHTML = "";
  knoepfe.forEach(([text, f, gefahr]) => { const b = document.createElement("button"); b.className = "knopf-leise" + (gefahr ? " gefahr" : ""); b.textContent = text; b.onclick = () => { blatt.classList.remove("offen"); f(); }; box.appendChild(b); });
  blatt.classList.add("offen");
}
function meinBildZeigen() {
  const du = ich(), bild = document.getElementById("profil-bild"), knopf = document.getElementById("profil-knopf");
  [bild, knopf].forEach(el => { el.classList.toggle("mit-bild", !!du.bild); el.style.backgroundImage = du.bild ? `url('${du.bild}')` : ""; });
}
function meinOrtZeigen() { const p = ECHT_DATEN.profil; document.getElementById("mein-ort").textContent = p.ort ? `${flagge(p.land)} ${p.ort}` : t("Noch kein Ort"); }
async function echtAktualisieren() {
  try {
    const neu = await leuteLaden();
    if (!neu.some(p => p.id === "du")) return;
    neu.forEach(p => { p.status = statusAusDb(p.statusRoh); });
    leute.splice(0, leute.length, ...neu);
    pinsSetzen(); listeAufbauen(); meinBildZeigen();
  } catch (e) {}
}
// Beim Öffnen: Standort still aktualisieren, wenn er erlaubt ist und sich die Stadt geändert hat
async function standortStill() {
  try {
    if (!navigator.permissions) return;
    const st = await navigator.permissions.query({ name: "geolocation" });
    if (st.state !== "granted" || ECHT_DATEN.profil.geist) return;
    const o = await standortErmitteln();
    if (o.ort !== ECHT_DATEN.profil.ort || o.land !== ECHT_DATEN.profil.land) { await standortSpeichern(o); meinOrtZeigen(); await echtAktualisieren(); }
  } catch (e) {}
}
async function neuerOrt(o) {
  await standortSpeichern(o);
  meinOrtZeigen(); hinweis(t("Ort gespeichert"));
  if (!besucht.includes(o.land)) { besucht.push(o.land); try { localStorage.setItem(LAENDER_SCHLUESSEL, JSON.stringify(besucht)); } catch (e) {} stempelAufbauen(); }
  await echtAktualisieren();
}
async function freundEinladen() {
  try {
    const { data, error } = await SB.from("einladung").insert({ von: ECHT_DATEN.uid }).select("code").single();
    if (error) throw error;
    const link = location.origin + location.pathname.replace(/index\.html$/, "") + "?einladung=" + data.code;
    const text = t("Komm zu Ahoi, unserer Karte für Nomaden-Freunde. Der Link gilt 14 Tage und nur für dich:");
    if (navigator.share) { try { await navigator.share({ title: "Ahoi", text, url: link }); } catch (e) {} return; }
    try { await navigator.clipboard.writeText(text + " " + link); hinweis(t("Link kopiert")); }
    catch (e) { fragen(link, [[t("Schließen"), () => {}]]); }
  } catch (e) { hinweis(t("Einladen hat nicht geklappt")); }
}
// Verwaltung (nur Admin): Freigeben, Ablehnen, Passwort neu, Entfernen
let mitgliederDaten = [];
async function verwaltungLaden() {
  const { data, error } = await SB.from("profile").select("id,name,freigegeben,ist_admin,eingeladen_von,erstellt_am").order("erstellt_am");
  if (error) throw error;
  mitgliederDaten = data;
  const zahl = data.filter(x => !x.freigegeben).length;
  document.getElementById("wartende-zahl").textContent = zahl || "";
  return data;
}
function startPasswort() {
  const z = "abcdefghjkmnpqrstuvwxyz23456789", r = crypto.getRandomValues(new Uint32Array(10));
  return "Ahoi-" + [...r].map(x => z[x % z.length]).join("");
}
async function verwaltungAufbauen() {
  try { await verwaltungLaden(); } catch (e) { return hinweis(t("Laden hat nicht geklappt")); }
  const nameVon = id => (mitgliederDaten.find(x => x.id === id) || {}).name || "?";
  const tag = iso => new Date(iso).toLocaleDateString(LOC, { day: "numeric", month: "short" });
  const wartende = mitgliederDaten.filter(x => !x.freigegeben), mitglieder = mitgliederDaten.filter(x => x.freigegeben);
  const boxW = document.getElementById("wartende"), boxM = document.getElementById("mitglieder");
  boxW.innerHTML = wartende.length ? wartende.map(x => `<div class="mitglied"><div class="zeile"><b>${ohneHtml(x.name || "?")}</b><small>${t("eingeladen von {name}", { name: ohneHtml(nameVon(x.eingeladen_von)) })} · ${tag(x.erstellt_am)}</small></div><button class="knopf-gross" data-frei="${x.id}">${t("Freigeben")}</button><button class="knopf-leise" data-weg="${x.id}" aria-label="${t("Ablehnen")}">✕</button></div>`).join("") : `<p class="hinweis-band" style="margin:4px 0">${t("Niemand wartet gerade")}</p>`;
  boxM.innerHTML = mitglieder.map(x => `<div class="mitglied"><div class="zeile"><b>${ohneHtml(x.name || "?")}${x.ist_admin ? " · Admin" : ""}</b><small>${x.eingeladen_von ? t("eingeladen von {name}", { name: ohneHtml(nameVon(x.eingeladen_von)) }) : t("Gründer")}</small></div>${x.id === ECHT_DATEN.uid ? "" : `<button class="knopf-leise" data-pw="${x.id}">${t("Passwort")}</button><button class="knopf-leise" data-weg="${x.id}" aria-label="${t("Entfernen")}">✕</button>`}</div>`).join("");
  document.querySelectorAll("[data-frei]").forEach(b => b.onclick = async () => {
    b.disabled = true;
    const { error } = await SB.from("profile").update({ freigegeben: true }).eq("id", b.dataset.frei);
    if (error) { b.disabled = false; return hinweis(t("Das hat nicht geklappt")); }
    hinweis(t("Freigegeben")); verwaltungAufbauen(); echtAktualisieren();
  });
  document.querySelectorAll("[data-weg]").forEach(b => b.onclick = () => {
    const x = mitgliederDaten.find(m => m.id === b.dataset.weg);
    fragen(t("{name} entfernen? Die Person sieht danach nichts mehr.", { name: x.name || "?" }), [[t("Entfernen"), async () => {
      const { error } = await SB.from("profile").delete().eq("id", x.id);
      if (error) return hinweis(t("Das hat nicht geklappt"));
      hinweis(t("Entfernt")); verwaltungAufbauen(); echtAktualisieren();
    }, true]]);
  });
  document.querySelectorAll("[data-pw]").forEach(b => b.onclick = () => {
    const x = mitgliederDaten.find(m => m.id === b.dataset.pw);
    fragen(t("Neues Startpasswort für {name} setzen?", { name: x.name || "?" }), [[t("Ja, neu setzen"), async () => {
      const neu = startPasswort();
      const { error } = await SB.rpc("admin_passwort_setzen", { person: x.id, neu });
      if (error) return hinweis(t("Das hat nicht geklappt"));
      fragen(t("Neues Passwort für {name}: {pw}", { name: x.name || "?", pw: neu }), [[t("Kopieren"), () => { navigator.clipboard && navigator.clipboard.writeText(neu).then(() => hinweis(t("Kopiert"))); }]]);
    }, true]]);
  });
}
function echtEinrichten() {
  const p = ECHT_DATEN.profil;
  // Bereiche, die noch nicht live sind
  for (const [seite, [symbol, titel, text]] of Object.entries(BALD))
    document.getElementById("seite-" + seite).innerHTML = `<div class="seite-kopf"><h1>${t(titel)}</h1></div><div class="bald"><div style="font-size:44px">${symbol}</div><b>${t("Kommt bald")}</b>${t(text)}<p><a href="prototyp/">${t("Im Prototyp schon ansehen")}</a></p></div>`;
  document.querySelectorAll("#leiste .punkt").forEach(el => el.remove());
  // Profil
  document.getElementById("profil-name").textContent = p.name || t("Du");
  document.getElementById("konto-email").textContent = ECHT_DATEN.email || "";
  document.getElementById("konto-email-feld").value = ECHT_DATEN.email || "";
  meinBildZeigen(); meinOrtZeigen();
  const geist = document.getElementById("geist-schalter");
  geist.classList.toggle("an", !!p.geist);
  geist.onclick = async () => {
    const an = !geist.classList.contains("an");
    geist.classList.toggle("an", an);
    const { error } = await SB.from("profile").update({ geist: an }).eq("id", ECHT_DATEN.uid);
    if (error) { geist.classList.toggle("an", !an); return hinweis(t("Das hat nicht geklappt")); }
    p.geist = an; hinweis(an ? t("Geistermodus an: niemand sieht deinen Ort") : t("Geistermodus aus"));
  };
  document.getElementById("profil-foto").addEventListener("change", async e => {
    const datei = e.target.files[0]; if (!datei) return;
    const bild = document.getElementById("profil-bild"); bild.classList.add("laedt");
    try { ich().bild = await fotoHochladen(datei); meinBildZeigen(); pinsSetzen(); hinweis(t("Foto gespeichert")); }
    catch (err) { hinweis(t("Foto hochladen hat nicht geklappt")); }
    bild.classList.remove("laedt"); e.target.value = "";
  });
  document.getElementById("ort-gps").onclick = async e => {
    beschaeftigt(e.target, true);
    try { await neuerOrt(await standortErmitteln()); } catch (err) { hinweis(err && err.code === 1 ? t("Standort nicht erlaubt") : t("Standort nicht gefunden")); }
    beschaeftigt(e.target, false);
  };
  ortSucheVerbinden(document.getElementById("ort-suche"), document.getElementById("ort-treffer"), async o => { await neuerOrt(o); document.getElementById("ort-treffer").innerHTML = ""; document.getElementById("ort-suche").value = ""; });
  ["einladen-zeile", "einladen-unten"].forEach(id => document.getElementById(id).onclick = freundEinladen);
  document.getElementById("passwort-zeile").onclick = () => seiteZeigen("konto");
  document.getElementById("abmelden-zeile").onclick = () => fragen(t("Abmelden?"), [[t("Abmelden"), abmelden, true]]);
  document.getElementById("form-passwort").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target, knopf = f.querySelector("button[type=submit]");
    if (f.passwort.value.length < 8) return hinweis(t("Mindestens 8 Zeichen"));
    beschaeftigt(knopf, true);
    const { error } = await SB.auth.updateUser({ password: f.passwort.value });
    beschaeftigt(knopf, false);
    if (error) return hinweis(fehlerText(error));
    f.reset(); hinweis(t("Passwort geändert")); seiteZeigen("profil");
  });
  if (p.ist_admin) {
    document.getElementById("verwaltung-titel").hidden = false;
    document.getElementById("verwaltung-kasten").hidden = false;
    document.getElementById("verwaltung-zeile").onclick = () => { seiteZeigen("verwaltung"); verwaltungAufbauen(); };
    verwaltungLaden().catch(() => {});
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { echtAktualisieren(); standortStill(); if (p.ist_admin) verwaltungLaden().catch(() => {}); } });
  setTimeout(standortStill, 3000);
}
if (ECHT) echtEinrichten();

// ---------- Start ----------
oberflaecheAnwenden();
stilWahlAufbauen();
listeAufbauen();
blattSetzen(false);
document.fonts && document.fonts.ready.then(() => blattSetzen(blattOffen));
stilLaden().catch(() => hinweis("Karte konnte nicht geladen werden"));
setTimeout(() => document.getElementById("start").classList.add("weg"), 4500);
setInterval(listeAufbauen, 60000);
