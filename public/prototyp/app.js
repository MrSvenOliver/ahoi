// ---------- Leute: echte App aus der Datenbank, Prototyp mit Beispieldaten ----------
const leute = ECHT ? ECHT_DATEN.leute : [
  { id: "du",    name: "Du",    ort: "Málaga",      land: "ES", lat: 36.7213, lon: -4.4214,  tz: "Europe/Madrid",       farbe: "#7a5a3a" },
  { id: "alex",  name: "Alex",  ort: "Lissabon",    land: "PT", lat: 38.7223, lon: -9.1393,  tz: "Europe/Lisbon",       farbe: "#c0582f", paar: "p1" },
  { id: "sam",   name: "Sam",   ort: "Bratislava",  land: "SK", lat: 48.1486, lon: 17.1077,  tz: "Europe/Bratislava",   farbe: "#3f6b8a", paar: "p1" },
  { id: "lea",   name: "Lea",   ort: "Canggu, Bali",land: "ID", lat: -8.6478, lon: 115.1385, tz: "Asia/Makassar",       farbe: "#6f8a3a", paar: "p2", links: { instagram: "lea.unterwegs", web: "https://example.com" } },
  { id: "nico",  name: "Nico",  ort: "Canggu, Bali",land: "ID", lat: -8.6478, lon: 115.1385, tz: "Asia/Makassar",       farbe: "#4f7a6a", paar: "p2" },
  { id: "mia",   name: "Mia",   ort: "Mexiko-Stadt",land: "MX", lat: 19.4326, lon: -99.1332, tz: "America/Mexico_City", farbe: "#a8467a" },
  { id: "jonas", name: "Jonas", ort: "Chiang Mai",  land: "TH", lat: 18.7883, lon: 98.9853,  tz: "Asia/Bangkok",        farbe: "#b98a2e" },
  { id: "ben",   name: "Ben",   ort: "Chiang Mai",  land: "TH", lat: 18.7953, lon: 98.9620,  tz: "Asia/Bangkok",        farbe: "#5a6fa0" },
  { id: "kim",   name: "Kim",   ort: "Málaga",      land: "ES", lat: 36.7213, lon: -4.4214,  tz: "Europe/Madrid",       farbe: "#8a6fb0" },
];
// Beispieldaten: Status und Anzahl Länder der Freunde
if (!ECHT) {
Object.assign(leute.find(p => p.id === "alex"), { status: "treffen", laender: 23 });
Object.assign(leute.find(p => p.id === "sam"), { status: "basis", laender: 9 });
Object.assign(leute.find(p => p.id === "lea"), { status: "sport", laender: 31 });
Object.assign(leute.find(p => p.id === "nico"), { laender: 18 });
Object.assign(leute.find(p => p.id === "mia"), { status: "angekommen", laender: 14, stand: new Date(Date.now() - 4 * 864e5).toISOString() });
Object.assign(leute.find(p => p.id === "jonas"), { status: "arbeit", laender: 27 });
Object.assign(leute.find(p => p.id === "ben"), { laender: 12 });
Object.assign(leute.find(p => p.id === "kim"), { status: "treffen", laender: 16 });
}
// Status zum Antippen; „Unterwegs“ gibt es bewusst nicht, das ist bei Nomaden immer so
const STATUS_VORLAGEN = { treffen: "☕ Lust auf Treffen", angekommen: "🌱 Neu angekommen", unterkunft: "🔍 Suche Unterkunft", mitreisende: "👥 Suche Mitreisende", arbeit: "💻 Arbeitsphase", sport: "🏄 Sport", abenteuer: "🧗 Abenteuer", basis: "🏡 An meiner Basis", ruhe: "🔕 Nicht stören" };
const statusAusDb = v => !v ? null : STATUS_VORLAGEN[v] ? v : { text: v };
if (ECHT) leute.forEach(p => p.status = statusAusDb(p.statusRoh));
else try {
  const g = localStorage.getItem("ahoi-status"), am = +localStorage.getItem("ahoi-status-am") || 0;
  leute[0].status = g === null ? "sport" : Date.now() - am > 864e5 && am ? null : JSON.parse(g);
  leute[0].statusAm = g === null ? Date.now() : am || Date.now();
} catch (e) { leute[0].status = "sport"; }
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
// Ein Ort ist so aktuell wie das letzte Öffnen der App. Älter als ein Tag: „zuletzt vor X Tagen“, und die App fragt nicht nach „zusammen unterwegs“.
const ortAlterTage = p => p && p.stand ? Math.floor((Date.now() - new Date(p.stand)) / 864e5) : 0;
const ortAktuell = p => ortAlterTage(p) < 1;
const ortAlterText = p => { const n = ortAlterTage(p); return n < 1 ? "" : "🕓 " + (n === 1 ? t("gestern") : t("vor {n} Tagen", { n })); };
const km = d => d < 1 ? t("Am selben Ort") : d.toLocaleString(LOC, { maximumFractionDigits: d < 10 ? 1 : 0 }) + " km";

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
// Zeitunterschied zur eigenen Uhr (Zeitzone des Geräts, auf dem man gerade schaut), in Stunden
const MEINE_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
function tzVersatz(tz) { try { const d = new Date(); d.setSeconds(0, 0); return Math.round((new Date(d.toLocaleString("en-US", { timeZone: tz })) - new Date(d.toLocaleString("en-US", { timeZone: "UTC" }))) / 6e4); } catch (e) { return 0; } }
const zeitDiff = tz => (tzVersatz(tz) - tzVersatz(MEINE_TZ)) / 60;
const stunden = h => Math.abs(h).toLocaleString(LOC, { maximumFractionDigits: 2 });
// kurz: „+6 Std.“ · lang: „6 Std. später als bei dir“
const zeitDiffKurz = tz => { const h = zeitDiff(tz); return h ? `${h > 0 ? "+" : "−"}${t("{n} Std.", { n: stunden(h) })}` : ""; };
const zeitDiffLang = tz => { const h = zeitDiff(tz); return !h ? t("gleiche Uhrzeit wie bei dir") : t(h > 0 ? "{n} Std. später als bei dir" : "{n} Std. früher als bei dir", { n: stunden(h) }); };
const kuerzel = n => n === t("Du") ? t("DU") : n.slice(0, 2).toUpperCase();
// Gesicht: Foto, sonst Farbe mit Kürzel
const kopfStil = p => p.bild ? `background:${p.farbe} url('${p.bild}') center/cover` : `background:${p.farbe}`;
const kopfText = p => p.bild ? "" : kuerzel(p.echterName || p.name);

// Einzahl und Mehrzahl (Slowakisch hat eine eigene Form für 2–4)
const ZAEHLWOERTER = {
  freunde: { de: ["Freund", "Freunde"], en: ["friend", "friends"], sk: ["priateľ", "priatelia", "priateľov"] },
  laender: { de: ["Land", "Länder"], en: ["country", "countries"], sk: ["krajina", "krajiny", "krajín"] }
};
function anzahl(n, art) {
  const w = ZAEHLWOERTER[art][SPRACHE] || ZAEHLWOERTER[art].de;
  const wort = n === 1 ? w[0] : SPRACHE === "sk" ? (n >= 2 && n <= 4 ? w[1] : w[2]) : w[1];
  return `${n} ${wort}`;
}

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
    ideen: '<path d="M12 20.5s-7.6-4.6-9.5-9.3C1.1 7.8 3.2 4.8 6.5 4.8c2.3 0 3.8 1.4 5.5 3.4 1.7-2 3.2-3.4 5.5-3.4 3.3 0 5.4 3 4 6.4-1.9 4.7-9.5 9.3-9.5 9.3Z"/>',
    welt: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
    ich: '<path d="M20 4 4 11.2l7.2 1.6L12.8 20Z"/>'
  },
  mission: {
    karte: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 18.4 5.6"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    reisen: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h5a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h5"/>',
    chat: '<circle cx="12" cy="10" r="2"/><path d="M12 12v9M8.5 6.5a5 5 0 0 0 0 7M15.5 6.5a5 5 0 0 1 0 7M5.5 3.5a9 9 0 0 0 0 13M18.5 3.5a9 9 0 0 1 0 13"/>',
    ideen: '<path d="M12 3.5 14.6 9l6 .6-4.5 4 1.3 5.9L12 16.5l-5.4 3 1.3-5.9-4.5-4 6-.6Z"/>',
    welt: '<circle cx="12" cy="12" r="7.5"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5"/>',
    ich: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>'
  },
  abenteuer: {
    karte: '<path d="M6 4h12v14a2 2 0 0 1-2 2H6"/><path d="M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2 2 2 0 0 0 2-2V6"/><path d="M12 9l3 3M15 9l-3 3"/><path d="M10.5 16.5c1.5-1.2 3.2-1.2 5 0" stroke-dasharray="1.4 1.8"/>',
    reisen: '<path d="M12 3v13M12 4l6.5 10H12M12 6.5 7 14h5"/><path d="M3 17h18l-2.5 3.5h-13Z"/>',
    chat: '<path d="M4.5 7c0-1.6 1.2-2.8 2.8-2.8h9.4c1.6 0 2.8 1.2 2.8 2.8v6c0 1.6-1.2 2.8-2.8 2.8H11.2L7 19.6v-3.8h0c-1.4 0-2.5-1.2-2.5-2.7Z"/><path d="M8 8.6c1-.7 2-.7 3 0s2 .7 3 0 2-.7 2.6 0M8 12h5"/>',
    ideen: '<path d="M12 20.5s-7.6-4.6-9.5-9.3C1.1 7.8 3.2 4.8 6.5 4.8c2.3 0 3.8 1.4 5.5 3.4 1.7-2 3.2-3.4 5.5-3.4 3.3 0 5.4 3 4 6.4-1.9 4.7-9.5 9.3-9.5 9.3Z"/><path d="M8 9.5c.6-1 1.6-1.4 2.5-1" stroke-dasharray="1.5 1.5"/>',
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
  gruppenPruefen();
  pinsSetzen();
  dekoSetzen();
  map.once("idle", () => setTimeout(() => document.getElementById("start").classList.add("weg"), 300));
  if (!ECHT && !nachbarnGefragt) { nachbarnGefragt = true; setTimeout(nachbarnFragen, 2600); }
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
// Meeresfiguren: bei jedem Öffnen in anderen Meeren. Alle Stellen und Routen sind gegen die Landflächen geprüft
// (in der Weltansicht liegt die ganze Figur auf Wasser; nur winzige Inseln, die dort ein Punkt sind, zählen nicht).
const TIER_MEERE = { nordatlantik: [-40, 32], nordostatlantik: [-25, 48], suedatlantik: [-18, -28], nordpazifik: [-155, 28], westpazifik: [150, 18], ostpazifik: [-112, 8], suedpazifik: [-115, -35], indik: [78, -22], suedlicher: [0, -52] };
const BOOT_ROUTEN = {
  schiff: { nordatlantik: [[-44.2, 28], [-56.3, 33.1]], nordostatlantik: [[-20.8, 45.2], [-36.5, 43.2]], suedatlantik: [[-23.2, -31.9], [-18.5, -20.5]], nordpazifik: [[-149.7, 31.1], [-144.9, 22.9]], ostpazifik: [[-105.9, 3.9], [-121.2, -2.7]], suedpazifik: [[-114.9, -38.2], [-129.4, -36.9]], suedlicher: [[-4.5, -57], [8, -60.6]] },
  dschunke: { westpazifik: [[147, 19.3], [144.6, 7.9]], tasmansee: [[164.2, -36.8], [165.6, -27.7]], indik: [[72.8, -22.4], [91.7, -19.5]], arabisches: [[66.2, 12.7], [65.7, 0.9]] }
};
const WELLEN_ORTE = [[-30, 2], [-18, -30], [90, -32], [-170, 6], [-100, -48], [-40, 20], [-130, -15], [70, -35], [-150, 40], [120, -45]];
const mischen = l => l.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
const MEER_AUSWAHL = (() => {
  // Drei Tiere in drei verschiedenen, weit auseinanderliegenden Meeren
  const genommen = [];
  for (const name of mischen(Object.keys(TIER_MEERE))) {
    const p = TIER_MEERE[name];
    if (genommen.every(([, q]) => Math.hypot(p[0] - q[0], p[1] - q[1]) > 40)) genommen.push([name, p]);
    if (genommen.length === 3) break;
  }
  const belegt = genommen.map(([n]) => n);
  const boot = typ => { const frei = Object.keys(BOOT_ROUTEN[typ]).filter(n => !belegt.includes(n)); const n = mischen(frei)[0]; belegt.push(n); return BOOT_ROUTEN[typ][n]; };
  const tiere = mischen(["wal", "drache", "krake"]).map((typ, i) => ({ typ, klasse: "meer-" + typ, pos: genommen[i][1] }));
  const s = boot("schiff"), d = boot("dschunke");
  return { tiere, schiffe: [{ typ: "schiff", a: s[0], b: s[1], dauer: 80 }, { typ: "dschunke", a: d[0], b: d[1], dauer: 95 }], wellen: mischen(WELLEN_ORTE).slice(0, 5) };
})();
const SCHIFFE = MEER_AUSWAHL.schiffe, TIERE = MEER_AUSWAHL.tiere, WELLEN = MEER_AUSWAHL.wellen;
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
  if (!schleier) { schleier = document.createElement("div"); schleier.className = "karten-schleier"; const leinwand = map.getCanvas(); leinwand.parentNode.insertBefore(schleier, leinwand.nextSibling);
    // Mission: Radarstrahl · Abenteuer: Wolkenschatten (nur sichtbar im jeweiligen Stil)
    ["radar-strahl", "wolken"].forEach(k => { const d = document.createElement("div"); d.className = k; d.setAttribute("aria-hidden", "true"); schleier.after(d); }); }
  if (stil === "abenteuer") { meerSetzen(); kompassDrehen(); } else meerAufraeumen();
  if (stil === "mission") hudSchreiben();
}

// Entfernungsringe um den eigenen Standort (nur Mission): echte Kreise auf der Erdkugel, 1000 / 2500 / 5000 km
// Mission: der Radarstrahl dreht sich immer um deinen Ort, auch beim Verschieben und Zoomen der Karte
function radarAusrichten() {
  const el = document.querySelector(".radar-strahl"), du = ich();
  if (!el || stil !== "mission" || !du || du.lat == null) return;
  const p = map.project([du.lon, du.lat]);
  el.style.setProperty("--rx", p.x.toFixed(1) + "px"); el.style.setProperty("--ry", p.y.toFixed(1) + "px");
}
map.on("move", radarAusrichten); map.on("resize", radarAusrichten);
function ringeZeichnen() {
  const du = ich(), R = 6371.0088, rad = Math.PI / 180, ringe = [1000, 2500, 5000];
  if (du.lat == null) return;
  radarAusrichten();
  const ohneOrt = du.lat == null; // Familien-Konto ohne eigenen Ort: keine Ringe
  const kreis = km => { if (ohneOrt) return []; const d = km / R, la = du.lat * rad, lo = du.lon * rad, pkt = [];
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
// Reisegruppen: Am selben Ort sein heißt noch nicht zusammen unterwegs. Wer zusammen reist, bestätigt das gegenseitig.
// Paare in einer Gruppe werden mit ❤️ verbunden. Zieht jemand weiter (über NAH_KM weg), fällt er aus der Gruppe; bleibt nur einer, endet sie.
let reisegruppen = ECHT ? [] : [{ id: "g-chiangmai", leute: ["jonas", "ben"] }];
if (!ECHT) try { const g = JSON.parse(localStorage.getItem("ahoi-reisegruppen") || "null"); if (Array.isArray(g)) reisegruppen = g; } catch (e) {}
const gruppenSpeichern = () => { if (!ECHT) try { localStorage.setItem("ahoi-reisegruppen", JSON.stringify(reisegruppen)); } catch (e) {} };
const gruppeVon = id => reisegruppen.find(g => g.leute.includes(id));
function gruppenPruefen() {
  let geaendert = false;
  reisegruppen.forEach(g => {
    const da = g.leute.map(id => leute.find(p => p.id === id)).filter(p => p && p.lat != null);
    const bleiben = da.filter(p => da.some(q => q !== p && entfernungKm(p.lat, p.lon, q.lat, q.lon) < NAH_KM)).map(p => p.id);
    if (bleiben.length !== g.leute.length) { g.leute = bleiben; geaendert = true; }
  });
  const vorher = reisegruppen.length;
  reisegruppen = reisegruppen.filter(g => g.leute.length > 1);
  if (geaendert || vorher !== reisegruppen.length) gruppenSpeichern();
}
const rufname = p => p.id === "du" ? t("Du") : p.name;
// „Alex ❤️ Sam · Lea · Mia“
function gruppenText(ps) {
  const fertig = new Set(), teile = [];
  for (const p of ps) {
    if (fertig.has(p.id)) continue; fertig.add(p.id);
    const partner = p.paar && ps.find(q => q.id !== p.id && q.paar === p.paar && !fertig.has(q.id));
    if (partner) { fertig.add(partner.id); teile.push(`${ohneHtml(rufname(p))} ❤️ ${ohneHtml(rufname(partner))}`); } else teile.push(ohneHtml(rufname(p)));
  }
  return teile.join(" · ");
}
// Wer am selben Ort ist, zerfällt in Reisegruppen, Paare und Einzelne
function ortTeilen(g) {
  const ids = new Set(g.map(p => p.id)), gruppen = [], frei = [];
  for (const rg of reisegruppen) { const drin = g.filter(p => rg.leute.includes(p.id)); if (drin.length > 1) { gruppen.push(drin); drin.forEach(p => ids.delete(p.id)); } }
  const rest = g.filter(p => ids.has(p.id));
  for (const p of rest) {
    if (frei.includes(p) || gruppen.some(x => x.includes(p))) continue;
    const partner = p.paar && rest.find(q => q !== p && q.paar === p.paar);
    if (partner) gruppen.push([p, partner]); else frei.push(p);
  }
  return { gruppen, frei: frei.filter(p => !gruppen.some(x => x.includes(p))) };
}
// Familien-Zugang: sieht nur die Personen, die ihn freigeschaltet haben; den eigenen Standort nur, wenn selbst gewählt
// Beispiel: Mama wurde von dir und von Alex eingeladen. Ihr eigener Standort erscheint nur, wenn sie ihn selbst einschaltet.
let FAMILIE_SIEHT = ["du", "alex"];
const BETRACHTER = { id: "betrachter", name: t("Ich"), ort: t("Köln"), land: "DE", lat: 50.9375, lon: 6.9603, tz: "Europe/Berlin", farbe: "#8a8478" };
let familieModus = false, familieMitStandort = false;
const sichtbareLeute = () => familieModus ? [...leute.filter(p => FAMILIE_SIEHT.includes(p.id)), ...(familieMitStandort ? [BETRACHTER] : [])] : imKreis(leute);
// Freundeskreise sind nur ein Filter für einen selbst; wer einen sehen kann, ändert sich dadurch nicht
const KREIS_SYMBOLE = ["⭐", "🏄", "🍻", "🏔️", "💼", "❤️", "🌴", "🎒"];
let kreise = ECHT ? [] : [{ id: "lieblinge", name: t("Lieblingsleute"), symbol: "⭐", leute: ["lea", "nico", "alex"] }, { id: "surf", name: t("Surf-Crew"), symbol: "🏄", leute: ["lea", "nico", "mia"] }];
if (!ECHT) try { const g = JSON.parse(localStorage.getItem("ahoi-kreise") || "null"); if (Array.isArray(g)) kreise = g; } catch (e) {}
let kreisFilter = "alle";
const imKreis = liste => { const k = kreise.find(x => x.id === kreisFilter); return k ? liste.filter(p => p.id === "du" || k.leute.includes(p.id)) : liste; };
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
    // ❤️ = Paar am selben Ort · 👥 = bestätigte Reisegruppe · Zahl = mehrere Personen, nicht zusammen unterwegs
    const teil = h.gruppen.length === 1 ? ortTeilen(h.gruppen[0]) : null;
    const eineGruppe = teil && !teil.frei.length && teil.gruppen.length === 1;
    if (eineGruppe && istPaar(h.gruppen[0])) innen.innerHTML += `<div class="herz" style="left:${breite - 20}px">❤️</div>`;
    else if (eineGruppe) innen.innerHTML += `<div class="herz" style="left:${breite - 20}px">👥</div>`;
    else if (leuteHier.length > 1) innen.innerHTML += `<div class="pin-zahl" style="left:${breite - 16}px">${leuteHier.length}</div>`;
    innen.innerHTML += `<div class="pin-spitze" style="left:${breite / 2 - 5}px"></div>`;
    innen.innerHTML += `<div class="pin-rufname">${ohneHtml(leuteHier[0].name)}${leuteHier.length > 1 ? " +" + (leuteHier.length - 1) : ""}</div>`;
    el.appendChild(innen);
    el.setAttribute("role", "button"); el.tabIndex = 0;
    el.setAttribute("aria-label", leuteHier.map(p => p.name).join(", ") + " – " + leuteHier[0].ort);
    el.addEventListener("keydown", e => { if (e.key === "Enter") el.click(); });
    el.addEventListener("click", e => {
      e.stopPropagation();
      if (stil === "mission") zielErfassen(innen);
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

// Mission: Zielrahmen, der sich auf die angetippte Person zusammenzieht
function zielErfassen(innen) {
  if (ruhig) return;
  innen.querySelectorAll(".ziel").forEach(z => z.remove());
  const z = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  z.setAttribute("class", "ziel"); z.setAttribute("viewBox", "0 0 60 60");
  z.innerHTML = '<path d="M2 16V2h14M44 2h14v14M58 44v14H44M16 58H2V44" fill="none" stroke="currentColor" stroke-width="2.5"/>';
  innen.appendChild(z); setTimeout(() => z.remove(), 2600);
}
// Modern: Entfernungen zählen beim Öffnen hoch
function hochzaehlen(wurzel) {
  if (stil !== "modern" || ruhig || !wurzel) return;
  wurzel.querySelectorAll("[data-km]").forEach(el => {
    const ziel = +el.dataset.km; if (!(ziel >= 2)) return;
    const start = performance.now(), dauer = 750;
    const schritt = jetzt => { const f = Math.min(1, (jetzt - start) / dauer), e = 1 - Math.pow(1 - f, 3); el.textContent = km(Math.max(1, ziel * e)); if (f < 1) requestAnimationFrame(schritt); };
    requestAnimationFrame(schritt);
  });
}
// ---------- Liste und Infokarte ----------
function listeAufbauen() {
  const du = ich();
  const andere = sichtbareLeute().filter(p => p.id !== "du").map(p => ({ ...p, d: du.lat == null ? 0 : entfernungKm(du.lat, du.lon, p.lat, p.lon) })).sort((x, y) => x.d - y.d);
  const laenderZahl = new Set(andere.map(p => p.land)).size;
  document.getElementById("zusammenfassung").textContent = `${anzahl(andere.length, "freunde")} · ${anzahl(laenderZahl, "laender")} · ${versionText(VERSION)}`;
  const ul = document.getElementById("liste"); ul.innerHTML = "";
  for (const p of andere) {
    let paarText = "";
    const rg = gruppeVon(p.id), dabei = rg ? rg.leute.filter(id => id !== p.id).map(person).filter(Boolean) : [];
    if (dabei.length) paarText = ` · ${t("mit")} ${dabei.map(q => q.id === "du" ? t("dir") : ohneHtml(q.name)).join(", ")}`;
    const li = document.createElement("li");
    li.innerHTML = `<div class="ava" style="${kopfStil(p)}">${kopfText(p)}</div>
      <div class="zeile"><b>${ohneHtml(p.name)}</b><span>${flagge(p.land)} ${ohneHtml(p.ort)} · ${ortAktuell(p) ? uhrzeit(p.tz) + t(" Uhr") : `<i class="ort-alt">${ortAlterText(p)}</i>`}${paarText}</span>${statusText(p) ? `<small class="status-klein">${ohneHtml(statusText(p))}</small>` : ""}</div>
      ${p.d < 1 ? `<div class="weite"><b class="gleicher-ort">${t("Am selben Ort")}</b>${zeitDiffKurz(p.tz) ? `<span class="zeit-diff">${zeitDiffKurz(p.tz)}</span>` : ""}</div>` : `<div class="weite"><b data-km="${p.d}">${km(p.d)}</b><span>${t("von dir")}</span>${zeitDiffKurz(p.tz) ? `<span class="zeit-diff">🕐 ${zeitDiffKurz(p.tz)}</span>` : ""}</div>`}`;
    li.onclick = () => { if (!familieModus) return steckbriefOeffnen(person(p.id)); zuPerson(p); infoZeigen([p]); };
    ul.appendChild(li);
  }
  if (!andere.length) ul.innerHTML = `<li class="leer-hinweis">${t("Noch keine Freunde hier. Lade jemanden ein!")}</li>`;
}

function infoZeigen(gruppe) {
  const du = familieModus ? BETRACHTER : ich(), p = gruppe[0], info = document.getElementById("info");
  const name = gruppe.map(x => x.name).join(" & ");
  let text = (gruppe.length === 1 && statusText(p) && !familieModus ? `<span class="status-zeile">${ohneHtml(statusText(p))}</span><br>` : "") + `${flagge(p.land)} <b>${ohneHtml(p.ort)}</b> · ${t("Ortszeit")} <b>${uhrzeit(p.tz)}${t(" Uhr")}</b>${p.id !== "du" && zeitDiffKurz(p.tz) ? ` <span class="zeit-diff">${zeitDiffKurz(p.tz)}</span>` : ""}` + (gruppe.length === 1 && !ortAktuell(p) ? `<br><i class="ort-alt">${ortAlterText(p)}</i>` : "");
  const abstand = p.id !== du.id && du.lat != null ? entfernungKm(du.lat, du.lon, p.lat, p.lon) : null;
  if (abstand != null && (!familieModus || familieMitStandort) && !gruppe.some(x => x.id === du.id)) text += abstand < 1 ? `<br>📍 <b>${t("Am selben Ort")}</b>` : `<br>${t("Entfernung zu dir:")} <b data-km="${abstand}">${km(abstand)}</b>`;
  if (gruppe.length > 1) {
    const teil = ortTeilen(gruppe);
    if (istPaar(gruppe)) text += `<br>${t("❤️ Paar · gerade zusammen unterwegs")}`;
    else {
      teil.gruppen.forEach(g => text += `<br>${g.length === 2 && istPaar(g) ? "❤️" : "👥"} ${t("Zusammen unterwegs:")} <b>${gruppenText(g)}</b>`);
      if (teil.frei.length) text += `<br>📍 ${t("Am selben Ort:")} ${teil.frei.map(x => ohneHtml(rufname(x))).join(", ")}`;
    }
  } else if (!familieModus) { const rg = gruppeVon(p.id); if (rg) text += `<br>👥 ${t("Reist mit")} <b>${gruppenText(rg.leute.filter(id => id !== p.id).map(person).filter(Boolean))}</b>`; }
  if (gruppe.length === 1 && !familieModus) { const n = p.id === "du" ? laenderZahl() : p.laender; if (n) text += `<br>🌍 ${anzahl(n, "laender")}`; }
  info.querySelector("h3").textContent = name;
  info.querySelector("p").innerHTML = text;
  const chatKnopf = document.getElementById("info-chat");
  chatKnopf.style.display = !familieModus && gruppe.length === 1 && p.id !== "du" ? "inline-block" : "none";
  chatKnopf.onclick = () => einzelChat(p.id);
  const tippKnopf = document.getElementById("info-tipps"), tippZahl = TIPPS_AN && !familieModus && !ECHT ? tipps.filter(x => x.ort === p.ort).length : 0;
  tippKnopf.style.display = tippZahl ? "inline-block" : "none";
  tippKnopf.textContent = tippZahl ? t("💡 {n} Tipps zu {ort}", { n: tippZahl, ort: p.ort }) : "";
  tippKnopf.onclick = () => { tippsOrt = p.ort; ideenReiter = "tipps"; seiteZeigen("ideen"); ideenAufbauen(); };
  paarKnopfSetzen(gruppe);
  gruppeKnopfSetzen(gruppe);
  const sbBox = document.getElementById("info-steckbriefe");
  sbBox.innerHTML = familieModus ? "" : gruppe.slice(0, 4).map((x, i) => `<button class="knopf-leise" data-sb="${i}">🪪 ${gruppe.length > 1 ? ohneHtml(rufname(x)) : t("Steckbrief")}</button>`).join("");
  sbBox.querySelectorAll("button").forEach(b => b.onclick = () => steckbriefOeffnen(gruppe[+b.dataset.sb]));
  info.classList.remove("offen"); void info.offsetWidth;
  info.classList.add("offen");
  hochzaehlen(info);
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
  if (offen && !blattOffen) hochzaehlen(document.getElementById("liste"));
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
// Service Worker: in der echten App kommt app.js erst nach der Anmeldung, dann ist „load“ schon vorbei
const swAnmelden = () => navigator.serviceWorker.register("sw.js").catch(() => null);
if ("serviceWorker" in navigator) { if (document.readyState === "complete") swAnmelden(); else window.addEventListener("load", swAnmelden); }

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
  modern: '<span class="vorschau" style="background:linear-gradient(120deg,#e9f2fb 0%,#9cc7ee 55%,#0a84ff 100%)"></span>',
  mission: '<span class="vorschau" style="background:linear-gradient(120deg,#06101c 0%,#0f2c44 55%,#5fd4ea 100%)"></span>',
  abenteuer: '<span class="vorschau" style="background:linear-gradient(120deg,#f3e6c9 0%,#d9b77e 55%,#c0582f 100%)"></span>'
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
const seiten = ["reisen", "reise-neu", "chat", "unterhaltung", "gruppe-neu", "ideen", "idee-neu", "tipp-neu", "profil", "meine-laender", "laender", "feedback", "verwaltung", "konto", "kreise", "links", "freunde"];
const TAB_VON = { "reise-neu": "reisen", "idee-neu": "ideen", "tipp-neu": "ideen", "unterhaltung": "chat", "gruppe-neu": "chat" };
function seiteZeigen(name) {
  for (const s of seiten) document.getElementById("seite-" + s).classList.toggle("offen", s === name);
  document.querySelectorAll("#leiste button").forEach(b => b.setAttribute("aria-current", b.dataset.seite === name ? "page" : "false"));
  document.querySelectorAll("#leiste button").forEach(b => b.classList.toggle("aktiv", b.dataset.seite === (TAB_VON[name] || name)));
  document.getElementById("info").classList.remove("offen");
  document.documentElement.classList.toggle("seite-auf", seiten.includes(name));
  if (name === "chat") chatListeAufbauen();
  if (name === "ideen") { ideenAufbauen(); if (ECHT) wishlistLaden().catch(() => {}); }
  if (name === "karte") { blattSetzen(false); map.resize(); }
}
document.querySelectorAll("#leiste button").forEach(b => b.onclick = () => seiteZeigen(b.dataset.seite));
let vorFeedback = "karte";
function feedbackOeffnen() { const offen = seiten.find(n => document.getElementById("seite-" + n).classList.contains("offen")); vorFeedback = offen || "karte"; seiteZeigen("feedback"); }
function feedbackSchliessen() { seiteZeigen(vorFeedback); }
document.getElementById("feedback-lasche").onclick = feedbackOeffnen;
document.querySelectorAll("[data-hinweis]").forEach(b => b.onclick = () => hinweis(b.dataset.hinweis));
document.querySelectorAll("[data-zurueck]").forEach(b => b.onclick = () => b.dataset.zurueck === "__zurueck" ? feedbackSchliessen() : seiteZeigen(b.dataset.zurueck));
// Zurückwischen wie bei WhatsApp: vom linken Rand nach rechts ziehen = einen Schritt zurück
// (Chat → Chat-Übersicht → Karte; Unterseiten wie mit ihrem Zurück-Knopf)
function zurueckSchritt() {
  const name = seiten.find(n => document.getElementById("seite-" + n).classList.contains("offen"));
  if (!name) return null;
  if (name === "unterhaltung") return () => document.getElementById("gespraech-zurueck").click();
  if (name === "feedback") return feedbackSchliessen;
  const knopf = document.querySelector(`#seite-${name} .seite-kopf [data-zurueck]`);
  return knopf ? () => knopf.click() : () => seiteZeigen("karte");
}
(() => {
  let seite = null, x0 = 0, y0 = 0, t0 = 0, dx = 0, an = false;
  document.addEventListener("touchstart", e => {
    seite = null; an = false; dx = 0;
    const p = e.touches[0];
    if (e.touches.length !== 1 || p.clientX > 24 || document.querySelector("#aktion-blatt.offen, .steckbrief.offen, .foto-gross.offen")) return;
    const name = seiten.find(n => document.getElementById("seite-" + n).classList.contains("offen"));
    if (!name) return;
    seite = document.getElementById("seite-" + name); x0 = p.clientX; y0 = p.clientY; t0 = Date.now();
  }, { passive: true });
  document.addEventListener("touchmove", e => {
    if (!seite) return;
    const p = e.touches[0], mx = p.clientX - x0, my = p.clientY - y0;
    if (!an) { if (Math.abs(my) > 10 && Math.abs(my) > mx) { seite = null; return; } if (mx < 10) return; an = true; seite.style.transition = "none"; }
    dx = Math.max(0, mx); seite.style.transform = `translateX(${dx}px)`;
  }, { passive: true });
  const ende = () => {
    if (!seite) return;
    const s = seite; seite = null;
    if (!an) return;
    const weiter = dx > innerWidth * 0.33 || (dx > 50 && dx / (Date.now() - t0) > 0.5);
    s.style.transition = "transform 0.18s ease";
    s.style.transform = weiter ? `translateX(${innerWidth}px)` : "";
    setTimeout(() => { if (weiter) { const zurueck = zurueckSchritt(); if (zurueck) zurueck(); } s.style.transition = ""; s.style.transform = ""; }, 180);
  };
  document.addEventListener("touchend", ende); document.addEventListener("touchcancel", ende);
})();
document.getElementById("profil-knopf").onclick = () => seiteZeigen("profil");
document.getElementById("reise-neu").onclick = () => seiteZeigen("reise-neu");
document.getElementById("reise-an").addEventListener("change", e => { const ab = document.getElementById("reise-ab"); ab.min = e.target.value; if (ab.value && ab.value < e.target.value) ab.value = e.target.value; });
// Reise eintragen: Ort aus der Suche, feste Daten oder ein Vielleicht mit Monat
let reiseOrt = null;
function reiseFormularLeeren() {
  reiseOrt = null;
  ["reise-ort", "reise-an", "reise-ab", "reise-monat"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("reise-gewaehlt").textContent = ""; document.getElementById("reise-orte").innerHTML = "";
  document.getElementById("reise-vielleicht").classList.remove("an"); reiseArtZeigen();
  const heute = new Date().toISOString().slice(0, 10);
  document.getElementById("reise-an").min = heute; document.getElementById("reise-ab").min = heute;
  document.getElementById("reise-monat").min = heute.slice(0, 7);
}
function reiseArtZeigen() {
  const viel = document.getElementById("reise-vielleicht").classList.contains("an");
  document.getElementById("reise-daten").hidden = viel; document.getElementById("reise-monat-zeile").hidden = !viel;
}
document.getElementById("reise-vielleicht").addEventListener("click", () => setTimeout(reiseArtZeigen));
ortSucheVerbinden(document.getElementById("reise-ort"), document.getElementById("reise-orte"), async o => {
  reiseOrt = o; document.getElementById("reise-gewaehlt").textContent = `${flagge(o.land)} ${o.ort}${o.ganzesLand ? " · " + t("Ort noch offen") : ""}`;
  document.getElementById("reise-orte").innerHTML = ""; document.getElementById("reise-ort").value = "";
}, true);
document.getElementById("reise-neu").addEventListener("click", reiseFormularLeeren);
document.getElementById("reise-speichern").onclick = async e => {
  if (!ECHT) { hinweis(t("Im Prototyp wird nichts gespeichert")); return seiteZeigen("reisen"); }
  if (!reiseOrt) return hinweis(t("Bitte einen Ort aus der Liste wählen"));
  const viel = document.getElementById("reise-vielleicht").classList.contains("an");
  const daten = { ort: reiseOrt.ort, land: reiseOrt.land, lat: reiseOrt.lat, lon: reiseOrt.lon, vielleicht: viel };
  if (viel) { daten.monat = document.getElementById("reise-monat").value; if (!daten.monat) return hinweis(t("Bitte einen Monat wählen")); }
  else {
    daten.ankunft = document.getElementById("reise-an").value; daten.abreise = document.getElementById("reise-ab").value;
    if (!daten.ankunft || !daten.abreise) return hinweis(t("Bitte Ankunft und Abreise wählen"));
    if (daten.abreise < daten.ankunft) return hinweis(t("Die Abreise liegt vor der Ankunft"));
  }
  beschaeftigt(e.target, true);
  const { error } = await SB.from("reise").insert(daten);
  beschaeftigt(e.target, false);
  if (error) return hinweis(t("Speichern hat nicht geklappt"));
  hinweis(t("Reise gespeichert")); seiteZeigen("reisen"); reisenLaden();
};
document.querySelectorAll(".schalter").forEach(b => b.onclick = () => b.classList.toggle("an"));
document.querySelectorAll(".segmente.klein").forEach(box => box.querySelectorAll("button").forEach(b => b.onclick = () => { box.querySelectorAll("button").forEach(x => x.classList.remove("aktiv")); b.classList.add("aktiv"); }));

const person = id => leute.find(p => p.id === id) || (ECHT ? (ECHT_DATEN.alle || []).find(p => p.id === id) : undefined);
const ava = (p, gross) => `<div class="klein-ava" style="${kopfStil(p)}${gross ? ";width:42px;height:42px" : ""}">${kopfText(p)}</div>`;

// ---------- Reisen ----------
const reisen = ECHT ? [] : [
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
if (!ECHT) reisen.forEach(r => r.ziel = t(r.ziel));
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
    const ps = r.wer.map(person).filter(Boolean);
    if (!ps.length) continue;
    const gesichter = ps.slice(0, 2).map((p, i) => `<div class="klein-ava" style="left:${ps.length > 1 ? i * 20 : 10}px;z-index:${2 - i};${kopfStil(p)}">${kopfText(p)}</div>`).join("");
    const naechte = r.von ? Math.round((datum(r.bis) - datum(r.von)) / 864e5) : null;
    html += `<div class="kasten reise${r.vielleicht ? " vielleicht" : ""}${ECHT && r.wer[0] === "du" ? " eigen" : ""}"${r.id ? ` data-reise="${r.id}"` : ""}>
      <div class="gesichter">${gesichter}</div>
      <div class="text"><span class="wer">${ps.map(p => p.name).join(" & ")}</span>
        <span class="ziel">${r.land ? flagge(r.land) : "📍"}&nbsp;&nbsp;${ohneHtml(r.ziel)}</span>
        <span class="wann">${r.von ? kurz(r.von) + " – " + kurz(r.bis) : t("irgendwann im {m}", { m: datum(r.monat + "-01").toLocaleDateString(LOC, { month: "long" }) })}</span></div>
      <div class="art">${r.vielleicht ? '<span class="vielleicht-text">' + t("Vielleicht") + '</span>' : `<b>${naechte}</b><small>${t(naechte === 1 ? "Nacht" : "Nächte")}</small>`}</div></div>`;
  }
  document.getElementById("reise-liste").innerHTML = html || (ECHT ? `<div class="bald"><div style="font-size:44px">✈️</div><b>${t("Noch keine Reisen")}</b>${t("Trag deine nächste Reise ein. Wenn Freunde zur selben Zeit am selben Ort sind, zeigt Ahoi euch einen Treffer.")}</div>` : "");
  if (ECHT) document.querySelectorAll("#reise-liste .reise.eigen").forEach(k => k.onclick = () => {
    const r = reisen.find(x => x.id === k.dataset.reise);
    fragen(`${r.ziel} · ${r.von ? kurz(r.von) + " – " + kurz(r.bis) : monatName(r.monat)}`, [[t("Reise löschen"), async () => {
      const { error } = await SB.from("reise").delete().eq("id", r.id);
      if (error) return hinweis(t("Das hat nicht geklappt"));
      hinweis(t("Reise gelöscht")); reisenLaden();
    }, true]]);
  });
}

// ---------- Chat ----------
// Chatliste: „Alle“ (nur in der Beta), Reisegruppen (selbst erstellt oder automatisch aus Treffer/Idee), Einzelchats.
// Fremdsprachige Nachrichten tragen ihre Übersetzung mit (später DeepL über Supabase, je Sprache einmal gespeichert).
const chats = ECHT ? [] : [
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
const UNBEKANNT = { id: "?", name: "?", farbe: "#9a9a9a", ort: "", land: "", tz: "UTC" };
const personOder = id => person(id) || UNBEKANNT;
const chatName = c => c.art === "einzel" ? personOder(c.mit).name : c.name;
// Bild eines Chats: Einzelchat = Profilbild der Person, Gruppe = ihr Emoji, „Alle“ = Weltkugel
const GRUPPEN_EMOJIS = ["👥", "🏄", "🌴", "🏝️", "☕", "🍻", "🍜", "🧗", "🏔️", "⛵", "🚐", "🎉", "💻", "🌍", "🔥", "❤️"];
const gruppenEmoji = c => c.emoji || (c.herkunft === "Idee" ? "🏠" : c.herkunft === "Treffer" ? "🧭" : "👥");
function chatBild(c) {
  if (c.art === "einzel") { const p = personOder(c.mit); return { stil: kopfStil(p), inhalt: kopfText(p), person: true }; }
  return { stil: "", inhalt: c.art === "alle" ? "🌍" : gruppenEmoji(c), person: false };
}
const istFremd = n => n.lang && n.lang !== SPRACHE && n.ue && n.ue[SPRACHE];
function vorschau(c) {
  const n = c.nachrichten[c.nachrichten.length - 1];
  if (!n) return t("Noch keine Nachricht");
  if (n.system) return n.system.replace(/<[^>]+>/g, "");
  const wer = c.art !== "einzel" ? (n.von === "du" ? t("Du") : personOder(n.von).name) + ": " : n.von === "du" ? t("Du") + ": " : "";
  if (n.sprache) return wer + t("🎤 Sprachnachricht");
  if (n.foto) return wer + "📷 " + (n.text || t("Foto"));
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
    const b = chatBild(c), bild = `<div class="bildchen${b.person ? " person" : ""}" style="${b.stil}">${b.inhalt}</div>`;
    const marke = c.art === "alle" ? '<span class="marke-klein">Beta</span>' : c.herkunft ? `<span class="marke-klein">${t("aus " + c.herkunft)}</span>` : "";
    // Nach links wischen: Einzelchat löschen (nur bei dir) oder Gruppe verlassen; „Alle“ bleibt
    const wisch = c.art === "alle" ? "" : `<button class="wisch-knopf" tabindex="-1">${c.art === "gruppe" ? t("Verlassen") : t("Löschen")}</button>`;
    return `<li class="chat-zeile wisch" data-id="${c.id}">${wisch}<div class="zeile-vorn">${bild}<div class="mitte"><b>${ohneHtml(chatName(c))} ${marke}${c.stumm ? " 🔕" : ""}</b><span>${ohneHtml(vorschau(c))}</span></div>${c.ungelesen ? `<div class="ungelesen">${c.ungelesen}</div>` : ""}</div></li>`;
  }).join("");
  document.querySelectorAll(".chat-zeile").forEach(z => {
    const c = chats.find(x => x.id === z.dataset.id), vorn = z.querySelector(".zeile-vorn"), knopf = z.querySelector(".wisch-knopf");
    let timer = null, lang = false, startX = 0, startY = 0, dx = 0, zieht = false, offen = false;
    const setzen = x => { vorn.style.transform = x ? `translateX(${x}px)` : ""; };
    const zu = () => { offen = false; setzen(0); };
    z.addEventListener("pointerdown", e => {
      lang = false; zieht = false; startX = e.clientX; startY = e.clientY; dx = 0;
      document.querySelectorAll(".chat-zeile.wisch").forEach(x => { if (x !== z) x.querySelector(".zeile-vorn").style.transform = ""; });
      timer = setTimeout(() => { if (!zieht) { lang = true; chatAktionen(c); } }, 550);
    });
    z.addEventListener("pointermove", e => {
      if (e.buttons === 0 && e.pointerType === "mouse") return;
      const mx = e.clientX - startX, my = e.clientY - startY;
      if (Math.abs(my) > 6 || Math.abs(mx) > 6) clearTimeout(timer);
      if (!knopf || (!zieht && (Math.abs(mx) < 8 || Math.abs(my) > Math.abs(mx)))) return;
      zieht = true; z.classList.add("zieht");
      dx = Math.max(-130, Math.min(0, (offen ? -96 : 0) + mx)); setzen(dx);
    });
    const loslassen = () => {
      clearTimeout(timer);
      if (!zieht) return;
      z.classList.remove("zieht");
      if (dx < -170) { zu(); return knopf.click(); }
      offen = dx < -48; setzen(offen ? -96 : 0);
      setTimeout(() => { zieht = false; }, 50);
    };
    ["pointerup", "pointercancel"].forEach(ev => z.addEventListener(ev, loslassen));
    z.addEventListener("pointerleave", () => clearTimeout(timer));
    z.addEventListener("contextmenu", e => { e.preventDefault(); clearTimeout(timer); lang = true; chatAktionen(c); });
    vorn.addEventListener("click", () => { if (zieht) return; if (offen) return zu(); if (!lang) gespraechOeffnen(c); });
    if (knopf) knopf.onclick = () => {
      if (c.art === "gruppe") return fragen(t("Gruppe „{name}“ verlassen?", { name: chatName(c) }), [[t("Gruppe verlassen"), () => { gruppeVerlassen(c); chatListeAufbauen(); }, true]]);
      chats.splice(chats.indexOf(c), 1); if (ECHT) chatAusblenden(c);
      hinweis(t("Nur bei dir gelöscht – {name} sieht den Chat weiter", { name: personOder(c.mit).name }));
      chatListeAufbauen();
    };
  });
  chatPunkt();
}
function chatAktionen(c) {
  const blatt = document.getElementById("aktion-blatt");
  document.getElementById("aktion-titel").textContent = chatName(c);
  const stummKnopf = [t(c.stumm ? "🔔 Wieder einschalten" : "🔕 Stummschalten"), () => chatStummSetzen(c, !c.stumm)];
  const knoepfe = c.art === "alle" ? [stummKnopf]
    : c.art === "gruppe" ? [stummKnopf, [t("😀 Emoji ändern"), () => gruppenEmojiAendern(c)], [t("Gruppe verlassen"), () => gruppeVerlassen(c), true]]
    : [[t("Chat löschen (nur bei dir)"), () => { chats.splice(chats.indexOf(c), 1); if (ECHT) chatAusblenden(c); hinweis(t("Nur bei dir gelöscht – {name} sieht den Chat weiter", { name: person(c.mit).name })); }, true]];
  const box = document.getElementById("aktion-knoepfe"); box.innerHTML = "";
  knoepfe.forEach(([t, f, gefahr]) => { const b = document.createElement("button"); b.className = "knopf-leise" + (gefahr ? " gefahr" : ""); b.textContent = t; b.onclick = () => { blatt.classList.remove("offen"); f(); chatListeAufbauen(); }; box.appendChild(b); });
  blatt.classList.add("offen");
}
function gruppenEmojiAendern(c) {
  const blatt = document.getElementById("aktion-blatt");
  document.getElementById("aktion-titel").textContent = t("Emoji für „{name}“", { name: chatName(c) });
  const box = document.getElementById("aktion-knoepfe"); box.innerHTML = '<div class="emoji-wahl" style="justify-content:center"></div>';
  emojiWahlAufbauen(box.firstChild, gruppenEmoji(c), async e => {
    blatt.classList.remove("offen");
    if (ECHT) { const { error } = await SB.rpc("chat_emoji_setzen", { c: c.id, emoji: e }); if (error) return hinweis(t("Das hat nicht geklappt")); }
    c.emoji = e; chatListeAufbauen();
    if (aktuellerChat === c) document.getElementById("gespraech-bild").innerHTML = e;
  });
  setTimeout(() => blatt.classList.add("offen"), 30);
}
// Stumm: im Prototyp nur auf dem Gerät, in der echten App in der Datenbank (dann kommt für diesen Chat kein Push)
async function chatStummSetzen(c, stumm) {
  if (ECHT) {
    const { error } = stumm ? await SB.from("chat_stumm").insert({ chat: c.id }) : await SB.from("chat_stumm").delete().eq("chat", c.id).eq("person", ECHT_DATEN.uid);
    if (error && !/duplicate/.test(error.message)) return hinweis(t("Das hat nicht geklappt"));
  }
  c.stumm = stumm; glockeSetzen(); chatListeAufbauen();
  hinweis(stumm ? t("🔕 Stumm: für „{name}“ kommen keine Mitteilungen", { name: chatName(c) }) : t("🔔 Mitteilungen für „{name}“ an", { name: chatName(c) }));
}
// Glocke im Chat: Ist Push auf diesem Gerät noch aus, schaltet sie Push ein; sonst schaltet sie diesen Chat stumm oder wieder laut
function glockeSetzen() {
  const g = document.getElementById("chat-glocke"), c = aktuellerChat; if (!c) return;
  const pushAn = ECHT ? PUSH.an : true;
  g.textContent = !pushAn || c.stumm ? "🔕" : "🔔";
  g.classList.toggle("aus", !pushAn || !!c.stumm);
  g.title = !pushAn ? t("Push für neue Nachrichten einschalten") : c.stumm ? t("Mitteilungen für diesen Chat einschalten") : t("Diesen Chat stummschalten");
  g.setAttribute("aria-label", g.title);
}
document.getElementById("chat-glocke").onclick = () => {
  const c = aktuellerChat; if (!c) return;
  if (ECHT && !PUSH.an) return pushEinschalten();
  chatStummSetzen(c, !c.stumm);
};
document.getElementById("aktion-abbrechen").onclick = () => document.getElementById("aktion-blatt").classList.remove("offen");
document.getElementById("aktion-blatt").onclick = e => { if (e.target.id === "aktion-blatt") e.target.classList.remove("offen"); };
function gruppeVerlassen(c) {
  if (ECHT) return chatVerlassenEcht(c);
  c.nachrichten.push({ system: t("<b>Du</b> hast die Gruppe verlassen") });
  chats.splice(chats.indexOf(c), 1);
  hinweis("Die anderen sehen: „Du hast die Gruppe verlassen“");
}
function gespraechOeffnen(c) {
  aktuellerChat = c; c.ungelesen = 0;
  document.getElementById("gespraech-name").textContent = chatName(c);
  const kb = chatBild(c), kopfBild = document.getElementById("gespraech-bild");
  kopfBild.setAttribute("style", kb.stil); kopfBild.innerHTML = kb.inhalt;
  glockeSetzen();
  const p = c.art === "einzel" && personOder(c.mit);
  document.getElementById("gespraech-unter").textContent = c.art === "alle" ? t("Alle Mitglieder · nur in der Beta") : c.art === "gruppe" ? c.mitglieder.map(id => id === "du" ? t("Du") : personOder(id).name).join(", ") : p.ort ? `${flagge(p.land)} ${p.ort} · ${uhrzeit(p.tz)}${t(" Uhr")}` : "";
  if (ECHT) chatGelesen(c);
  document.getElementById("uebersetzen").style.display = c.nachrichten.some(istFremd) ? "" : "none";
  seiteZeigen("unterhaltung");
  chatAufbauen(); chatPunkt();
}
function einzelChat(id) {
  if (ECHT) return einzelChatEcht(id);
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
    const p = personOder(n.von), ich = n.von === "du";
    const zeigUe = istFremd(n) && an && !n.original;
    let inhalt = n.text ? textMitErwaehnung(zeigUe ? n.ue[SPRACHE] : n.text) : "";
    if (istFremd(n) && an) inhalt += `<span class="ue-hinweis">${t(zeigUe ? "Übersetzt aus {s}" : "Original auf {s}", { s: spracheName(n.lang) })} · <button data-k="${k}">${t(zeigUe ? "Original anzeigen" : "Übersetzung anzeigen")}</button></span>`;
    if (n.ort) inhalt = `<div class="ortkarte"><div class="ikon">📍</div><div><b>${n.ort}</b><br><span style="font-size:13px;opacity:.8">${ohneHtml(zeigUe ? n.ue[SPRACHE] : n.text)}</span></div></div>`;
    if (n.sprache) inhalt = `<div class="sprache">▶︎<div class="welle"></div>${n.sprache}</div>`;
    if (n.foto) inhalt = `<img class="chat-foto" src="${fotoLinks[n.foto] || n.foto}" alt="${t("Foto")}" loading="lazy" data-gross>` + (inhalt ? `<div class="foto-text">${inhalt}</div>` : "");
    const nameZeigen = !ich && c.art !== "einzel";
    return `<div class="msg${ich ? " ich" : ""}">${ich ? "" : ava(p)}<div class="blase${n.foto ? " mit-foto" : ""}">${nameZeigen ? `<small>${p.name}</small>` : ""}${inhalt}${n.reaktion ? `<span class="reaktionen">${n.reaktion}</span>` : ""}</div></div>`;
  }).join("");
  v.querySelectorAll(".ue-hinweis button").forEach(b => b.onclick = () => { const n = c.nachrichten[b.dataset.k]; n.original = !n.original; chatAufbauen(); });
  v.querySelectorAll("img[data-gross]").forEach(i => { i.onclick = () => { const g = document.getElementById("foto-gross"); g.querySelector("img").src = i.src; g.classList.add("offen"); }; if (!i.complete) i.onload = () => { if (v.scrollHeight - v.scrollTop - v.clientHeight < 400) v.scrollTop = v.scrollHeight; }; });
  v.scrollTop = v.scrollHeight;
}
document.getElementById("uebersetzen").onclick = () => { const c = aktuellerChat; uebersetzt[c.id] = !uebersetzt[c.id]; c.nachrichten.forEach(n => delete n.original); chatAufbauen(); };
document.getElementById("gespraech-zurueck").onclick = () => seiteZeigen("chat");
function senden() {
  const feld = document.getElementById("chat-text"), t = feld.value.trim();
  if (!t || !aktuellerChat) return;
  if (ECHT) return chatSendenEcht(feld, t);
  aktuellerChat.nachrichten.push({ von: "du", text: t }); feld.value = "";
  chatAufbauen();
}
document.getElementById("chat-senden").onclick = senden;
// Tastatur bleibt beim Senden offen: sonst verschiebt sich die Leiste zwischen Drücken und Loslassen und der Tipp geht ins Leere
document.getElementById("chat-senden").addEventListener("pointerdown", e => e.preventDefault());
document.getElementById("chat-senden").addEventListener("mousedown", e => e.preventDefault());
document.getElementById("foto-gross").onclick = e => e.currentTarget.classList.remove("offen");
document.getElementById("chat-foto").onclick = () => { if (!ECHT) return hinweis(t("Im Prototyp wird nichts gesendet")); document.getElementById("chat-foto-datei").click(); };
document.getElementById("chat-foto-datei").addEventListener("change", e => { const d = e.target.files[0]; e.target.value = ""; chatFotoSenden(d); });
document.getElementById("chat-mikro").onclick = () => hinweis("Gedrückt halten zum Aufnehmen – kommt mit dem echten Chat");
document.getElementById("chat-text").addEventListener("keydown", e => { if (e.key === "Enter") senden(); });
document.getElementById("chat-text").addEventListener("focus", () => document.documentElement.classList.add("tippt"));
document.getElementById("chat-text").addEventListener("blur", () => document.documentElement.classList.remove("tippt"));
// Neue Gruppe
const gruppeAuswahl = new Set();
let gruppeEmojiWahl = "👥";
function emojiWahlAufbauen(box, aktiv, beiWahl) {
  box.innerHTML = GRUPPEN_EMOJIS.map(e => `<button type="button" role="radio" aria-checked="${e === aktiv}" class="${e === aktiv ? "aktiv" : ""}">${e}</button>`).join("");
  box.querySelectorAll("button").forEach(b => b.onclick = () => { box.querySelectorAll("button").forEach(x => { x.classList.remove("aktiv"); x.setAttribute("aria-checked", "false"); }); b.classList.add("aktiv"); b.setAttribute("aria-checked", "true"); beiWahl(b.textContent); });
}
document.getElementById("gruppe-neu-knopf").onclick = () => {
  gruppeAuswahl.clear(); document.getElementById("gruppe-name").value = "";
  gruppeEmojiWahl = "👥"; emojiWahlAufbauen(document.getElementById("gruppe-emoji"), gruppeEmojiWahl, e => { gruppeEmojiWahl = e; });
  document.getElementById("gruppe-leute").innerHTML = leute.filter(p => p.id !== "du").map(p => `<button data-id="${p.id}">${p.name}</button>`).join("");
  document.querySelectorAll("#gruppe-leute button").forEach(b => b.onclick = () => { b.classList.toggle("aktiv"); gruppeAuswahl.has(b.dataset.id) ? gruppeAuswahl.delete(b.dataset.id) : gruppeAuswahl.add(b.dataset.id); });
  seiteZeigen("gruppe-neu");
};
document.getElementById("gruppe-erstellen").onclick = () => {
  if (!gruppeAuswahl.size) return hinweis("Bitte mindestens eine Person auswählen");
  const name = document.getElementById("gruppe-name").value.trim() || [...gruppeAuswahl].map(id => person(id).name).join(", ");
  if (ECHT) return gruppeErstellenEcht(name, [...gruppeAuswahl], gruppeEmojiWahl);
  const c = { id: "g-" + Date.now(), art: "gruppe", name, emoji: gruppeEmojiWahl, mitglieder: ["du", ...gruppeAuswahl], nachrichten: [{ system: t("<b>Du</b> hast die Gruppe erstellt") }] };
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
  { id: "lissabon", von: "lea", art: "Wohnung", ort: "Lissabon", land: "PT", bewertung: "4,9", zimmer: "2 Schlafzimmer", gaeste: 4, notiz: "Für Januar?", anreise: "2027-01-08", abreise: "2027-01-20", preis: 1150, plaetze: 4, dabei: ["nico"], sicht: "🌍 Alle", herzen: 4, kommentare: 3, quelle: "Airbnb", farbe: "linear-gradient(135deg,#e9c99a,#c0582f)" },
  { id: "ericeira", von: "alex", art: "Haus", ort: "Ericeira", land: "PT", bewertung: "4,8", zimmer: "3 Schlafzimmer", gaeste: 8, notiz: "Direkt am Surfstrand", anreise: "2027-02-13", abreise: "2027-02-20", preis: null, plaetze: 6, dabei: ["sam", "du"], sicht: "👥 Lieblingsleute", herzen: 2, kommentare: 1, quelle: "Airbnb", farbe: "linear-gradient(135deg,#bcd6d8,#3f6b8a)" },
  { id: "canggu", von: "jonas", art: "Villa", ort: "Canggu", land: "ID", bewertung: "4,95", zimmer: "4 Schlafzimmer", gaeste: 8, notiz: "", zeitraum: "März", preis: 2500, plaetze: 6, dabei: ["ben", "lea", "nico", "mia", "alex"], sicht: "🌍 Alle", herzen: 5, kommentare: 6, quelle: "Airbnb", farbe: "linear-gradient(135deg,#cfe0b8,#6f8a3a)" },
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
  if (i.echt && !/airbnb\./i.test(i.link)) return i.link;
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
      <div class="tipp-fuss"><span><span class="klein-ava" style="background:${p.farbe}">${kuerzel(p.name)}</span>${x.von === "du" ? t("Du") : p.name}${x.echt && x.von === "du" ? ` · <button class="tipp-weg" data-i="${tipps.indexOf(x)}">${t("Löschen")}</button>` : ""}</span><button class="daumen${an ? " an" : ""}" data-i="${tipps.indexOf(x)}">👍 ${x.daumen.length}</button></div></div>`;
  }).join("") || (ECHT ? `<p class="hinweis-band">${t("Noch keine Tipps. Teile ein Café, ein Essen oder einen Ort, den du magst, mit „+ Tipp“.")}</p>` : "");
  document.querySelectorAll("#tipps-liste .daumen").forEach(b => b.onclick = async () => {
    const x = tipps[b.dataset.i], k = x.daumen.indexOf("du");
    if (x.echt) { const r = k >= 0 ? await SB.from("tipp_daumen").delete().eq("tipp", x.id).eq("person", ECHT_DATEN.uid) : await SB.from("tipp_daumen").insert({ tipp: x.id }); if (r.error) return hinweis(t("Das hat nicht geklappt")); }
    if (k >= 0) x.daumen.splice(k, 1); else x.daumen.push("du"); tippsAufbauen();
  });
  document.querySelectorAll("#tipps-liste .tipp-weg").forEach(b => b.onclick = () => fragen(t("Tipp löschen?"), [[t("Löschen"), async () => {
    const x = tipps[b.dataset.i]; const { error } = await SB.from("tipp").delete().eq("id", x.id);
    if (error) return hinweis(t("Das hat nicht geklappt")); tipps.splice(tipps.indexOf(x), 1); tippsAufbauen();
  }, true]]));
}
// Ortstipps sind vorerst ausgeblendet (Entscheidung 24.11.2026); Daten und Code bleiben für später
const TIPPS_AN = false;
function ideenAufbauen() {
  if (!TIPPS_AN) ideenReiter = "unterkunft";
  document.getElementById("ideen-reiter").hidden = !TIPPS_AN;
  document.querySelectorAll("#ideen-reiter button").forEach(b => b.classList.toggle("aktiv", b.dataset.r === ideenReiter));
  document.getElementById("bereich-unterkunft").style.display = ideenReiter === "unterkunft" ? "" : "none";
  document.getElementById("bereich-tipps").style.display = ideenReiter === "tipps" ? "" : "none";
  document.getElementById("idee-neu").textContent = t(ideenReiter === "tipps" ? "+ Tipp" : "+ Teilen");
  if (ideenReiter === "tipps") tippsAufbauen();
  const laender = ["alle", ...new Set(ideen.map(i => i.land).filter(Boolean))];
  document.getElementById("ideen-filter").innerHTML = laender.map(l => `<button data-l="${l}" class="${l === ideenFilter ? "aktiv" : ""}">${l === "alle" ? t("Alle|Filter") : flagge(l) + " " + new Intl.DisplayNames([SPRACHE], { type: "region" }).of(l)}</button>`).join("");
  document.querySelectorAll("#ideen-filter button").forEach(b => b.onclick = () => { ideenFilter = b.dataset.l; ideenAufbauen(); });
  document.getElementById("ideen-liste").innerHTML = ideen.map((i, n) => {
    if (ideenFilter !== "alle" && i.land !== ideenFilter) return "";
    if (i.abreise && i.abreise < new Date().toISOString().slice(0, 10)) return "";
    const belegt = 1 + i.dabei.length, frei = i.plaetze ? Math.max(0, i.plaetze - belegt) : 99, ichDabei = i.dabei.includes("du"), eigen = i.von === "du";
    const proPerson = Math.round(i.preis / belegt);
    // Echte Einträge: Titel aus der Vorschau, z. B. „Wohnung in Lissabon · ★4,9 · 2 Schlafzimmer“
    const teile = i.echt && i.titel ? i.titel.split(" · ") : null;
    const kopf = teile ? ohneHtml(teile[0]) : i.echt ? ohneHtml(i.ort) : t("{art} in {ort}", { art: i.art, ort: i.ort });
    const bildStil = i.bild ? `background:var(--trenner) center / cover url('${String(i.bild).replace(/['"()\\]/g, c => encodeURIComponent(c))}')` : `background:${i.farbe}`;
    const kz = i.echt ? wunschZahlen(i) : null;
    const zellen = kz ? [kz.zimmer && [`🛏 ${kz.zimmer}`, t(kz.zimmer === 1 ? "Schlafzimmer|1" : "Schlafzimmer")], kz.betten && [`🛌 ${kz.betten}`, t(kz.betten === 1 ? "Bett" : "Betten")], i.gaeste && [`👥 ${i.gaeste}`, t("Gäste max.")], i.plaetze && [frei ? `${frei}` : t("Voll"), t(frei ? "Plätze frei" : "alle vergeben"), !frei]].filter(Boolean) : [];
    const zahlen = !i.echt ? `<div class="zahlen">
          <div><b>🛏 ${parseInt(i.zimmer) || "–"}</b><small>${t("Schlafzimmer")}</small></div>
          <div><b>👥 ${i.plaetze}</b><small>${i.plaetze < i.gaeste ? t("von {n} Gästen", { n: i.gaeste }) : t("Gäste")}</small></div>
          <div class="${frei ? "" : "voll"}"><b>${frei ? frei : t("Voll")}</b><small>${t(frei ? "Plätze frei" : "alle vergeben")}</small></div>
        </div>` : zellen.length ? `<div class="zahlen" style="grid-template-columns:repeat(${zellen.length},1fr)">${zellen.map(([w, l, voll]) => `<div class="${voll ? "voll" : ""}"><b>${w}</b><small>${l}</small></div>`).join("")}</div>` : "";
    const chatKnopf = !i.echt ? `<button class="knopf-leise">💬 ${i.kommentare}</button>` : (i.chat && (eigen || ichDabei)) ? `<button class="knopf-leise idee-chat" data-n="${n}">💬 ${t("Gruppe")}</button>` : eigen ? "" : `<button class="knopf-leise idee-chat" data-n="${n}">💬 ${ohneHtml(person(i.von).name)}</button>`;
    return `
    <div class="kasten idee">
      <div class="bild" style="${bildStil}"><span class="quelle">${ohneHtml(i.quelle || "")}</span>${i.echt ? "" : `<span class="sicht">${i.sicht}</span>`}${i.gebucht ? '<span class="gebucht">' + t("✅ Gebucht") + '</span>' : ""}<button class="herzen${i.herzIch ? " an" : ""}" data-n="${n}">❤️ ${i.herzen}</button></div>
      <div class="inhalt">
        <b>${kopf} ${i.land ? flagge(i.land) : ""}</b>
        <span class="ort">${[i.echt && teile && !teile[0].includes(i.ort) ? ohneHtml(i.ort) : "", i.bewertung ? "★ " + i.bewertung : "", i.anreise ? kurz(i.anreise) + "–" + kurz(i.abreise) : i.zeitraum].filter(Boolean).join(" · ")}</span>
        ${kz && kz.rest ? `<span class="extra">${ohneHtml(kz.rest)}</span>` : ""}
        <div class="geteilt">${ava(person(i.von))}<span><b>${eigen ? t("Du") : person(i.von).name}</b>${i.notiz ? "„" + ohneHtml(i.notiz) + "“" : t("hat das geteilt")}</span></div>
        ${zahlen}
        ${i.preis ? `<div class="rechner">💶 ${i.preis.toLocaleString(LOC)} € ${t("gesamt")} · <b>${t("{n} € pro Person", { n: proPerson.toLocaleString(LOC) })}</b> ${t("bei {n}", { n: belegt })}</div>` : ""}
        <div class="dabei-leiste"><div class="dabei-gesichter">${[i.von, ...i.dabei].map(id => ava(person(id))).join("")}</div></div>
        <div class="aktionen">
          ${i.gebucht ? `<button class="knopf-gross ist-dabei" disabled style="opacity:1">${t("✅ Gebucht · steht in Reisen")}</button>` : i.echt && eigen ? `<button class="knopf-gross ist-dabei" disabled style="opacity:1">${t("✓ Dein Vorschlag · du bist dabei")}</button>` : `<button class="knopf-gross dabei-knopf ${ichDabei ? "ist-dabei" : ""}" data-n="${n}" ${!frei && !ichDabei ? "disabled" : ""}>${t(ichDabei ? "✓ Du bist dabei" : frei ? "🙋 Ich wäre dabei" : "Leider voll")}</button>`}
          ${chatKnopf}
        </div>
        <div class="aktionen" style="margin-top:8px">
          <a class="knopf-leise" href="${ohneHtml(ansehenLink(i))}" target="_blank" rel="noopener" style="text-decoration:none;flex:1;text-align:center">${t(i.anreise ? "Preis ansehen ↗" : "Ansehen ↗")}</a>
          ${(ichDabei || eigen) && !i.gebucht && (!i.echt || i.anreise) ? `<button class="knopf-leise gebucht-knopf" data-n="${n}" style="flex:1">${t("✓ Gebucht")}</button>` : ""}
          ${i.echt && eigen ? `<button class="knopf-leise preis-knopf" data-n="${n}">💶 ${t(i.preis ? "Preis ändern" : "Preis eintragen")}</button><button class="knopf-leise idee-weg" data-n="${n}" aria-label="${t("Löschen")}">🗑</button>` : ""}
        </div>
      </div></div>`;
  }).join("") || (ECHT ? `<p class="hinweis-band">${t("Noch nichts auf der Wishlist. Teile eine Unterkunft, die dir gefällt, mit „+ Teilen“.")}</p>` : "");
  if (ECHT) return wishlistKnoepfe();
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
let tippOrtWahl = null;
document.getElementById("tipp-ort").addEventListener("input", () => { tippOrtWahl = null; });
ortSucheVerbinden(document.getElementById("tipp-ort"), document.getElementById("tipp-orte"), o => { tippOrtWahl = o; document.getElementById("tipp-ort").value = o.ort; document.getElementById("tipp-orte").innerHTML = ""; });
document.getElementById("tipp-speichern").onclick = async e => {
  const ort = document.getElementById("tipp-ort").value.trim(), text = document.getElementById("tipp-text").value.trim();
  if (!ort || !text) return hinweis(t("Bitte Ort und Tipp ausfüllen"));
  if (ECHT) {
    const o = tippOrtWahl && tippOrtWahl.ort === ort ? tippOrtWahl : { ort, land: ich().land || null, lat: null, lon: null };
    beschaeftigt(e.target, true);
    const { error } = await SB.from("tipp").insert({ ort: o.ort, land: o.land, lat: o.lat, lon: o.lon, art: document.querySelector("#tipp-arten .aktiv").dataset.a, text });
    beschaeftigt(e.target, false);
    if (error) return hinweis(t("Das hat nicht geklappt"));
    tippsOrt = null; tippsFilter = "alle"; seiteZeigen("ideen"); await wishlistLaden(); hinweis(t("Tipp geteilt")); return;
  }
  const bekannt = [...leute, ...tipps].find(x => x.ort.toLowerCase() === ort.toLowerCase());
  tipps.unshift({ von: "du", ort, land: bekannt ? bekannt.land : ich().land, art: document.querySelector("#tipp-arten .aktiv").dataset.a, text, daumen: [] });
  tippsOrt = null; tippsFilter = "alle"; seiteZeigen("ideen"); ideenAufbauen(); hinweis(t("Tipp geteilt"));
};
// Zwischenablage lesen: Airbnb legt einen Link (nicht nur Text) ab. Mit clipboard.read() bietet Safari dafür „Einfügen“ an,
// readText() allein zeigt bei Links nur ein ausgegrautes „Einfügen“. Klappt beides nicht: ins Feld springen.
async function zwischenablageLesen() {
  const c = navigator.clipboard;
  if (c && c.read) {
    try {
      for (const item of await c.read()) for (const typ of ["text/uri-list", "text/plain", "text/html"]) if (item.types.includes(typ)) {
        let v = await (await item.getType(typ)).text();
        if (typ === "text/uri-list") v = v.split(/\r?\n/).find(z => z && !z.startsWith("#")) || "";
        if (v.trim()) return v.trim();
      }
    } catch (e) {}
    return null;
  }
  if (c && c.readText) { try { return (await c.readText()).trim() || null; } catch (e) {} }
  return null;
}
document.getElementById("einfuegen").onclick = async () => {
  const feld = document.getElementById("idee-link"), v = await zwischenablageLesen(), link = linkAus(v);
  if (link) { feld.value = link; return vorschauZeigen(); }
  feld.focus(); hinweis(t("Tippe lange ins Link-Feld und wähle „Einfügen“"));
};
document.getElementById("idee-link").addEventListener("input", () => { clearTimeout(vorschauZeigen.uhr); vorschauZeigen.uhr = setTimeout(vorschauZeigen, 500); });
// Airbnb hängt den gewählten Zeitraum an den Link: …/rooms/123?check_in=2027-05-03&check_out=2027-05-07&adults=2
function zeitraumAusLink(l) {
  try { const q = new URL(l).searchParams, an = q.get("check_in") || q.get("checkin"), ab = q.get("check_out") || q.get("checkout"); return /^\d{4}-\d{2}-\d{2}$/.test(an || "") && /^\d{4}-\d{2}-\d{2}$/.test(ab || "") && ab > an ? { an, ab } : null; } catch (e) { return null; }
}
// Link aus geteiltem Text holen (Airbnb teilt oft „Schau dir das an: https://…“)
const linkAus = v => { const m = String(v || "").match(/https:\/\/[^\s"'<>]+/i); return m ? m[0] : null; };
const quelleVon = link => { try { const h = new URL(link).hostname.replace(/^www\./, ""); return /airbnb|abnb\.me/.test(h) ? "Airbnb" : /booking\./.test(h) ? "Booking" : h.split(".").slice(-2).join("."); } catch (e) { return ""; } };
let ideeVorschau = null, ideeOrt = null, ideeFoto = null;
async function vorschauEcht(link) {
  const box = document.getElementById("idee-vorschau");
  box.style.display = "flex"; box.innerHTML = `<div class="vb"></div><div><b>${t("Vorschau wird geladen …")}</b></div>`;
  let v = null;
  try { const r = await SB.functions.invoke("vorschau", { body: { url: link } }); v = r.data && r.data.ok ? r.data : null; } catch (e) {}
  if (linkAus(document.getElementById("idee-link").value) !== link) return;
  ideeVorschau = v ? { titel: v.titel, bild: v.bild, gaeste: v.gaeste || null } : null;
  const zeit = zeitraumAusLink(link) || (v && v.ziel && zeitraumAusLink(v.ziel));
  if (zeit) { document.getElementById("idee-an").value = zeit.an; document.getElementById("idee-ab").value = zeit.ab; document.querySelector("#seite-idee-neu .mehr-optionen").open = true; }
  if (v && v.gaeste && !plaetze) { plaetze = Math.min(30, Math.max(2, v.gaeste)); plaetzeZeigen(); }
  const bild = ideeFoto ? URL.createObjectURL(ideeFoto) : v && v.bild;
  box.innerHTML = `<div class="vb" style="${bild ? `background-image:url('${bild.replace(/'/g, "%27")}')` : ""}"></div><div><b>${ohneHtml((v && v.titel) || quelleVon(link))}</b><small>${v ? (v.bild ? t("Bild und Titel übernommen") : t("Kein Bild gefunden, du kannst ein eigenes Foto dazulegen")) + (v.gaeste ? " · " + t("bis {n} Gäste", { n: v.gaeste }) : "") + (zeit ? " · " + t("Zeitraum {von}–{bis} übernommen", { von: kurz(zeit.an), bis: kurz(zeit.ab) }) : "") : t("Keine Vorschau möglich, du kannst ein eigenes Foto dazulegen")}</small></div>`;
  // Ort vorschlagen, wenn der Titel ihn nennt („… in Lissabon“)
  // Airbnb englisch: „Tiny home in Mickleton · ★4.9“, deutsch: „Tiny House · Mickleton · ★4,9“
  const teile = v && v.titel ? v.titel.split(" · ") : [], ortFeld = document.getElementById("idee-ort");
  const m = (teile[0] || "").match(/ in ([^·,]+)$/) || (teile[1] && !/[★\d]/.test(teile[1]) ? [null, teile[1]] : null);
  if (m && !ortFeld.value.trim()) { ortFeld.value = m[1].trim(); ortFeld.dispatchEvent(new Event("input")); }
}
function vorschauZeigen() {
  const v = document.getElementById("idee-link").value.trim(), box = document.getElementById("idee-vorschau");
  if (!v) { box.style.display = "none"; ideeVorschau = null; return; }
  if (ECHT) { const l = linkAus(v); if (l) { if (l !== v) document.getElementById("idee-link").value = l; vorschauEcht(l); } return; }
  const airbnb = /(airbnb\.[a-z.]+\/(rooms|h)\/|abnb\.me\/)/i.test(v);
  box.style.display = "block";
  box.innerHTML = airbnb
    ? `✅ <b>${t("Airbnb erkannt")}</b><br><span style='font-size:13px;color:var(--text-leise)'>${t("Foto, Art, Ort, Bewertung, Schlafzimmer und Gäste werden automatisch übernommen (im Prototyp noch Beispiel).")}</span>`
    : `🔗 <b>${t("Webseite erkannt")}</b><br><span style='font-size:13px;color:var(--text-leise)'>${t("Titel und Bild kommen aus der Vorschau der Seite.")}</span>`;
}
let plaetze = null;
const plaetzeZeigen = () => { document.getElementById("pl-zahl").textContent = plaetze || "–"; };
document.getElementById("pl-minus").onclick = () => { plaetze = !plaetze || plaetze <= 2 ? null : plaetze - 1; plaetzeZeigen(); };
document.getElementById("pl-plus").onclick = () => { plaetze = plaetze ? Math.min(30, plaetze + 1) : 2; plaetzeZeigen(); };
document.getElementById("idee-ort").addEventListener("input", () => { ideeOrt = null; });
ortSucheVerbinden(document.getElementById("idee-ort"), document.getElementById("idee-orte"), o => { ideeOrt = o; document.getElementById("idee-ort").value = o.ort; document.getElementById("idee-orte").innerHTML = ""; });
document.getElementById("idee-foto").addEventListener("change", e => {
  ideeFoto = e.target.files[0] || null;
  document.getElementById("idee-foto-text").textContent = ideeFoto ? t("📷 Foto ausgewählt · ändern") : t("📷 Eigenes Foto dazulegen (freiwillig)");
  const vb = document.querySelector("#idee-vorschau .vb"); if (vb && ideeFoto) vb.style.backgroundImage = `url('${URL.createObjectURL(ideeFoto)}')`;
});
function ideeFormularLeeren() {
  ["idee-link", "idee-ort", "idee-notiz", "idee-an", "idee-ab", "idee-preis"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("idee-vorschau").style.display = "none"; document.getElementById("idee-orte").innerHTML = "";
  ideeVorschau = null; ideeOrt = null; ideeFoto = null; plaetze = null; plaetzeZeigen();
  document.getElementById("idee-foto").value = ""; document.getElementById("idee-foto-text").textContent = t("📷 Eigenes Foto dazulegen (freiwillig)");
}
async function wunschSpeichern(knopf) {
  const link = linkAus(document.getElementById("idee-link").value);
  if (!link) return hinweis(t("Bitte einen Link einfügen"));
  const ortText = document.getElementById("idee-ort").value.trim();
  if (!ideeOrt || ideeOrt.ort !== ortText) return hinweis(t("Bitte den Ort aus der Liste wählen"));
  const an = document.getElementById("idee-an").value || null, ab = document.getElementById("idee-ab").value || null;
  if ((an && !ab) || (!an && ab) || (an && ab && ab < an)) return hinweis(t("Bitte Anreise und Abreise prüfen"));
  const preis = parseInt(document.getElementById("idee-preis").value.replace(/\D/g, "")) || null;
  beschaeftigt(knopf, true);
  try {
    let foto = null;
    if (ideeFoto) {
      const b = await createImageBitmap(ideeFoto).catch(() => new Promise((ok, nein) => { const i = new Image(); i.onload = () => ok(i); i.onerror = nein; i.src = URL.createObjectURL(ideeFoto); }));
      const f = Math.min(1, 1600 / Math.max(b.width, b.height)), cv = document.createElement("canvas");
      cv.width = Math.round(b.width * f); cv.height = Math.round(b.height * f); cv.getContext("2d").drawImage(b, 0, 0, cv.width, cv.height);
      const blob = await new Promise(ok => cv.toBlob(ok, "image/jpeg", 0.8));
      foto = `${ECHT_DATEN.uid}/${crypto.randomUUID()}.jpg`;
      const up = await SB.storage.from("wunschbilder").upload(foto, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
    }
    const { error } = await SB.from("wunsch").insert({ link, titel: ideeVorschau && ideeVorschau.titel || null, bild_url: ideeVorschau && ideeVorschau.bild || null, gaeste: ideeVorschau && ideeVorschau.gaeste || null, foto, quelle: quelleVon(link),
      ort: ideeOrt.ort, land: ideeOrt.land, lat: ideeOrt.lat, lon: ideeOrt.lon, anreise: an, abreise: ab, preis, plaetze, notiz: document.getElementById("idee-notiz").value.trim() || null });
    if (error) { if (foto) SB.storage.from("wunschbilder").remove([foto]).catch(() => {}); throw error; }
    ideeFormularLeeren(); ideenReiter = "unterkunft"; seiteZeigen("ideen"); await wishlistLaden(); hinweis(t("Auf der Wishlist geteilt"));
  } catch (e) { hinweis(t("Teilen hat nicht geklappt")); }
  beschaeftigt(knopf, false);
}
document.querySelectorAll("#sicht-wahl button").forEach(b => b.onclick = () => {
  document.querySelectorAll("#sicht-wahl button").forEach(x => x.classList.toggle("aktiv", x === b));
  const d = document.getElementById("sicht-detail"), art = b.dataset.s;
  d.style.display = art === "alle" ? "none" : "block";
  if (art === "kreis") d.innerHTML = kreise.map((k, i) => `<div class="zeile-einst"><div>${k.symbol} ${ohneHtml(k.name)}<small>${k.leute.map(person).filter(Boolean).map(p => p.name).join(", ")}</small></div><button class="schalter${i ? "" : " an"}"></button></div>`).join("") + `<button class="knopf-leise" style="margin-top:8px">${t("+ Neuer Kreis")}</button>`;
  if (art === "einzeln") d.innerHTML = `<div class="chips" style="flex-wrap:wrap;margin:0;padding:0">${leute.filter(p => p.id !== "du").map(p => `<button>${p.name}</button>`).join("")}</div>`;
  d.querySelectorAll(".schalter").forEach(x => x.onclick = () => x.classList.toggle("an"));
  d.querySelectorAll(".chips button").forEach(x => x.onclick = () => x.classList.toggle("aktiv"));
});
document.getElementById("idee-speichern").onclick = e => { if (ECHT) return wunschSpeichern(e.target); hinweis(t("Im Prototyp wird nichts geteilt")); seiteZeigen("ideen"); };
// Airbnb-Titel zerlegen: „Tiny home in Mickleton · ★4.9 · 1 bedroom · 1 bed · 1 bath“ (auch deutsch)
function wunschZahlen(i) {
  const teile = (i.titel || "").split(" · ").slice(1), zahl = re => { for (const x of teile) { const m = x.match(re); if (m) return +m[1]; } return null; };
  const zimmer = zahl(/^(\d+)\s*(?:bedrooms?|Schlafzimmer|spáln)/i), betten = zahl(/^(\d+)\s*(?:beds?|Betten|Bett|post)(?!\w)/i);
  const rest = teile.filter(x => !/^\d+\s*(?:bedrooms?|Schlafzimmer|beds?|Betten|Bett|baths?|bathrooms?|Badezimmer|Bad|private|shared|spáln|post|kúpe)/i.test(x) && x !== i.ort).join(" · ");
  return { zimmer, betten, rest };
}
// ---------- Wishlist in der echten App: laden und Knöpfe ----------
const wunschBilder = {};
async function wishlistLaden() {
  if (!ECHT || familieModus || ECHT_DATEN.profil.art === "familie") return;
  const [w, d, h, tp, td] = await Promise.all([
    SB.from("wunsch").select("*").order("erstellt_am", { ascending: false }), SB.from("wunsch_dabei").select("wunsch, person"), SB.from("wunsch_herz").select("wunsch, person"),
    SB.from("tipp").select("*").order("erstellt_am", { ascending: false }), SB.from("tipp_daumen").select("tipp, person")
  ]);
  if (!w.error && !d.error && !h.error) {
    const fotos = w.data.map(x => x.foto).filter(f => f && !wunschBilder[f]);
    if (fotos.length) { const r = await SB.storage.from("wunschbilder").createSignedUrls(fotos, 86400); (r.data || []).forEach(x => { if (x.signedUrl) wunschBilder[x.path] = x.signedUrl; }); }
    ideen.splice(0, ideen.length, ...w.data.map(x => {
      const herz = h.data.filter(y => y.wunsch === x.id), f = farbeVon(x.id);
      return { id: x.id, echt: true, von: idVon(x.von), titel: x.titel, ort: x.ort, land: x.land, lat: x.lat, lon: x.lon, link: x.link, quelle: x.quelle || quelleVon(x.link),
        bild: x.foto ? wunschBilder[x.foto] : x.bild_url, notiz: x.notiz || "", anreise: x.anreise, abreise: x.abreise, preis: x.preis, plaetze: x.plaetze, gaeste: x.gaeste, foto: x.foto,
        dabei: d.data.filter(y => y.wunsch === x.id).map(y => idVon(y.person)), herzen: herz.length, herzIch: herz.some(y => y.person === ECHT_DATEN.uid),
        gebucht: x.gebucht, chat: x.chat, farbe: `linear-gradient(135deg, ${f}66, ${f})` };
    }).filter(i => person(i.von) && !(i.abreise && i.abreise < new Date().toISOString().slice(0, 10) && !i.gebucht)));
  }
  if (!tp.error && !td.error) tipps.splice(0, tipps.length, ...tp.data.map(x => ({ id: x.id, echt: true, von: idVon(x.von), ort: x.ort, land: x.land, art: x.art, text: x.text, daumen: td.data.filter(y => y.tipp === x.id).map(y => idVon(y.person)) })).filter(x => person(x.von)));
  if (document.getElementById("seite-ideen").classList.contains("offen")) ideenAufbauen();
}
function wishlistKnoepfe() {
  const i = b => ideen[b.dataset.n];
  document.querySelectorAll(".herzen").forEach(b => b.onclick = async () => {
    const x = i(b), r = x.herzIch ? await SB.from("wunsch_herz").delete().eq("wunsch", x.id).eq("person", ECHT_DATEN.uid) : await SB.from("wunsch_herz").insert({ wunsch: x.id });
    if (r.error) return hinweis(t("Das hat nicht geklappt"));
    x.herzIch = !x.herzIch; x.herzen += x.herzIch ? 1 : -1; ideenAufbauen();
  });
  document.querySelectorAll(".dabei-knopf").forEach(b => b.onclick = async () => {
    const x = i(b), ja = !x.dabei.includes("du");
    beschaeftigt(b, true);
    const { error } = await SB.rpc("wunsch_dabei_setzen", { w: x.id, ja });
    beschaeftigt(b, false);
    if (error) return hinweis(/voll/i.test(error.message) ? t("Leider voll") : t("Das hat nicht geklappt"));
    hinweis(ja ? t("Du bist dabei · {name} sieht das in eurer Gruppe im Chat", { name: person(x.von).name }) : t("Du bist nicht mehr dabei"));
    await wishlistLaden(); chatsLaden().catch(() => {});
  });
  document.querySelectorAll(".gebucht-knopf").forEach(b => b.onclick = () => {
    const x = i(b), wer = [x.von, ...x.dabei].map(id => id === "du" ? t("dich") : person(id).name).join(", ");
    fragen(t("Gebucht? Die Reise wird eingetragen für {wer}.", { wer }), [[t("✓ Ja, gebucht"), async () => {
      const { error } = await SB.rpc("wunsch_gebucht", { w: x.id });
      if (error) return hinweis(t("Das hat nicht geklappt"));
      hinweis(t("In Reisen eingetragen für {wer}", { wer })); await wishlistLaden(); reisenLaden();
    }]]);
  });
  document.querySelectorAll(".idee-chat").forEach(b => b.onclick = async () => {
    const x = i(b);
    if (x.chat && (x.von === "du" || x.dabei.includes("du"))) { await chatsLaden(); const c = chats.find(y => y.id === x.chat); if (c) return gespraechOeffnen(c); }
    einzelChat(x.von);
  });
  document.querySelectorAll(".preis-knopf").forEach(b => b.onclick = () => {
    const x = i(b);
    fragen(t("Gesamtpreis"), [[t("Speichern"), async () => {
      const roh = (document.getElementById("preis-feld") || {}).value || "", preis = parseInt(roh.replace(/\D/g, "")) || null;
      const { error } = await SB.from("wunsch").update({ preis }).eq("id", x.id);
      if (error) return hinweis(t("Speichern hat nicht geklappt"));
      x.preis = preis; ideenAufbauen(); hinweis(t("Gespeichert"));
    }]]);
    document.getElementById("aktion-titel").innerHTML = `${t("Gesamtpreis")}<small class="aktion-text">${t("Der Preis für den ganzen Aufenthalt, so wie Airbnb ihn bei deinen Daten anzeigt. Ahoi teilt ihn durch alle, die dabei sind.")}</small><input id="preis-feld" class="ort-suche" inputmode="numeric" placeholder="€" value="${x.preis || ""}" autocomplete="off">`;
    setTimeout(() => document.getElementById("preis-feld").focus(), 50);
  });
  document.querySelectorAll(".idee-weg").forEach(b => b.onclick = () => fragen(t("Von der Wishlist löschen?"), [[t("Löschen"), async () => {
    const x = i(b); const { error } = await SB.from("wunsch").delete().eq("id", x.id);
    if (error) return hinweis(t("Das hat nicht geklappt"));
    if (x.foto) SB.storage.from("wunschbilder").remove([x.foto]).catch(() => {});
    await wishlistLaden();
  }, true]]));
}
// ---------- Familien-Ansicht ----------
function naechsteReise(id) {
  const heute = new Date().toISOString().slice(0, 10);
  return reisen.filter(r => r.wer.includes(id) && r.von && r.bis >= heute).sort((a, b) => a.von.localeCompare(b.von))[0];
}
function familieAufbauen() {
  const du = BETRACHTER, sichtbar = leute.filter(p => FAMILIE_SIEHT.includes(p.id) && p.lat != null);
  if (!sichtbar.length) { document.getElementById("familie-karten").innerHTML = `<p class="fam-leer">${t("Gerade teilt niemand seinen Ort mit dir.")}</p>`; return; }
  document.getElementById("familie-karten").innerHTML = sichtbar.map(p => {
    const r = naechsteReise(p.id), heute = new Date().toISOString().slice(0, 10);
    const naechte = r ? Math.round((datum(r.bis) - datum(r.von)) / 864e5) : 0;
    const weitere = reisen.filter(x => x !== r && x.wer.includes(p.id) && (x.vielleicht || x.bis >= heute));
    return `<div class="fam-karte" data-id="${p.id}"><div class="ava" style="${kopfStil(p)}">${kopfText(p)}</div><div style="flex:1">
      <b class="fam-name">${ohneHtml(p.name)}</b><div class="wo">${flagge(p.land)}&nbsp; ${t(p.id === "du" ? "bist in" : "ist in")} <b style="display:inline;font-size:16px">${ohneHtml(p.ort)}</b></div>
      <div class="klein">${t("Dort ist es {z} Uhr", { z: uhrzeit(p.tz) })} · ${zeitDiffLang(p.tz)}${familieMitStandort ? " · " + (entfernungKm(du.lat, du.lon, p.lat, p.lon) < 1 ? t("Am selben Ort") : t("{km} von dir", { km: km(entfernungKm(du.lat, du.lon, p.lat, p.lon)) })) : ""}</div>
      ${r ? `<div class="naechste"><span class="nr-titel">${t("✈︎ Nächste Reise")}</span><span class="nr-ort">${flagge(r.land)}&nbsp; ${ohneHtml(r.ziel)}</span><span class="nr-daten">${kurz(r.von)} – ${kurz(r.bis)} · ${naechte} ${t(naechte === 1 ? "Nacht" : "Nächte")}</span></div>` : ""}
      ${weitere.length ? `<div class="weitere">${weitere.map(x => `${flagge(x.land)} ${ohneHtml(x.ziel)} · ${x.von ? kurz(x.von) + "–" + kurz(x.bis) : t("vielleicht im {m}", { m: datum(x.monat + "-01").toLocaleDateString(LOC, { month: "long" }) })}`).join("<br>")}</div>` : ""}
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
  const mitOrt = sichtbareLeute().filter(p => p.lat != null);
  if (an && mitOrt.length) { const b = new maplibregl.LngLatBounds(); mitOrt.forEach(p => b.extend([p.lon, p.lat])); map.fitBounds(b, { padding: { top: 120, bottom: Math.min(window.innerHeight * 0.62, document.getElementById("familie-blatt").offsetHeight + 40), left: 60, right: 60 }, maxZoom: 6, duration: 900 }); }
}
document.getElementById("familie-start").onclick = () => familieSetzen(true);
document.getElementById("familie-ende").onclick = () => familieSetzen(false);
document.getElementById("familie-standort").onclick = async e => {
  const k = e.currentTarget, an = !k.classList.contains("an");
  // Echte App: der eigene Standort bleibt nur auf diesem Gerät und wird nirgends gespeichert
  if (an && ECHT) { try { const c = await geraetePosition(); Object.assign(BETRACHTER, { lat: c.latitude, lon: c.longitude }); } catch (err) { return hinweis(t("Standort nicht erlaubt")); } }
  k.classList.toggle("an", an); familieMitStandort = an; familieAufbauen(); pinsSetzen();
};

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
    try { localStorage.setItem(SPRACH_SCHLUESSEL, b.dataset.s); } catch (e) {}
    location.reload();
  });
  blatt.classList.add("offen");
};

// ---------- Status ----------
// Ein Knopf zeigt den aktuellen Status; Tippen öffnet die Auswahl. Ein Status gilt 24 Stunden (danach zeigt ihn niemand mehr).
const STATUS_DAUER = 864e5;
function statusRest(du) {
  const am = ECHT ? (ECHT_DATEN.profil.status_am ? new Date(ECHT_DATEN.profil.status_am).getTime() : Date.now()) : du.statusAm || Date.now();
  return Math.max(0, am + STATUS_DAUER - Date.now());
}
function statusAufbauen() {
  const du = ich(), text = statusText(du), k = document.getElementById("status-knopf");
  document.getElementById("mein-status-anzeige").textContent = text || t("Kein Status");
  document.getElementById("status-knopf-text").textContent = text || t("＋ Status setzen");
  const rest = text ? statusRest(du) : 0, std = Math.ceil(rest / 36e5);
  document.getElementById("status-knopf-zeit").textContent = !text ? "" : std <= 1 ? t("noch unter 1 Std.") : t("noch {n} Std.", { n: std });
  k.classList.toggle("leer", !text);
}
function statusWahl() {
  const du = ich(), eigen = du.status && !STATUS_VORLAGEN[du.status];
  const blatt = document.getElementById("aktion-blatt");
  document.getElementById("aktion-titel").textContent = t("Was steht bei dir an?");
  const box = document.getElementById("aktion-knoepfe"); box.innerHTML = "";
  const knopf = (text, aktiv, f, gefahr) => { const b = document.createElement("button"); b.className = "knopf-leise" + (aktiv ? " aktiv" : "") + (gefahr ? " gefahr" : ""); b.textContent = text; b.onclick = () => { blatt.classList.remove("offen"); f(); }; box.appendChild(b); };
  Object.keys(STATUS_VORLAGEN).forEach(k => knopf(t(STATUS_VORLAGEN[k]) + (du.status === k ? "  ✓" : ""), du.status === k, () => statusSetzen(k)));
  knopf(eigen ? "✏️ " + du.status.text + "  ✓" : t("✏️ Eigener"), eigen, () => { const e = document.getElementById("status-eigen"); e.classList.add("offen"); document.getElementById("status-text").value = eigen ? du.status.text : ""; document.getElementById("status-text").focus(); });
  if (du.status) knopf(t("Status entfernen"), false, () => statusSetzen(null), true);
  blatt.classList.add("offen");
}
document.getElementById("status-knopf").onclick = statusWahl;
function statusSetzen(wert) {
  ich().status = wert; ich().statusAm = Date.now();
  if (ECHT) { ECHT_DATEN.profil.status_am = wert ? new Date().toISOString() : null; SB.from("profile").update({ status: wert && wert.text ? wert.text : wert }).eq("id", ECHT_DATEN.uid).then(r => { if (r.error) hinweis(t("Speichern hat nicht geklappt")); }); }
  else try { localStorage.setItem("ahoi-status", JSON.stringify(wert)); localStorage.setItem("ahoi-status-am", String(Date.now())); } catch (e) {}
  document.getElementById("status-eigen").classList.remove("offen");
  statusAufbauen(); listeAufbauen();
  if (wert) hinweis(t("Status gesetzt · gilt 24 Stunden"));
}
document.getElementById("status-ok").onclick = () => { const v = document.getElementById("status-text").value.trim(); statusSetzen(v ? { text: v } : null); };
document.getElementById("status-text").addEventListener("keydown", e => { if (e.key === "Enter") document.getElementById("status-ok").click(); });
statusAufbauen();

// ---------- Dein Nomadenjahr (Rückblick zum Durchtippen) ----------
const JAHR = new Date().getFullYear();
document.getElementById("jahr-name").textContent = t("Dein Nomadenjahr {jahr}", { jahr: JAHR });
// Hintergrund: die Weltkarte im gewählten Stil, besuchte Länder leuchten; pro Seite schwenkt die Karte woandershin
const RB_KARTE = {
  modern: { meer: "#dce9f5", land: "#f7f7f4", rand: "#c9d3dc", besucht: "#0a84ff", schleier: "linear-gradient(180deg,rgba(255,255,255,.78) 0%,rgba(255,255,255,.35) 45%,rgba(255,255,255,.85) 100%)" },
  mission: { meer: "#06101c", land: "#0d1d30", rand: "#2f8aa6", besucht: "#5fd4ea", schleier: "linear-gradient(180deg,rgba(6,16,28,.85) 0%,rgba(6,16,28,.35) 45%,rgba(6,16,28,.9) 100%)" },
  abenteuer: { meer: "#bcc7bd", land: "#efe0c0", rand: "#8a6a48", besucht: "#c0582f", schleier: "linear-gradient(180deg,rgba(239,224,192,.85) 0%,rgba(239,224,192,.3) 45%,rgba(239,224,192,.9) 100%)" }
};
// Kartenausschnitt je Seite: [Mitte x, Mitte y im Kartenbild 0–360 / 6–148, Vergrößerung]
const RB_BLICK = [[180, 70, 1.15], [200, 60, 1.6], [180, 75, 1.05], [215, 55, 2.1], [176, 52, 3.2], [241, 60, 1.6], [180, 70, 1.15]];
const RB_BLICK_HALB = [[180, 70, 1.15], [265, 80, 1.8], [180, 75, 1.05], [190, 50, 2.4], [278, 72, 3], [180, 70, 1.15]];
async function rbKarteZeichnen() {
  if (!welt) { try { welt = await (await fetch("weltkarte.json")).json(); } catch (e) { welt = []; } }
  const f = RB_KARTE[stil], svg = document.getElementById("rb-karte");
  svg.innerHTML = `<rect x="0" y="6" width="360" height="142" fill="${f.meer}"/>` + welt.map(l => `<path d="${l.d}" fill="${besucht.includes(l.i) ? f.besucht : f.land}" fill-opacity="${besucht.includes(l.i) ? 0.85 : 1}" stroke="${f.rand}" stroke-width=".2"/>`).join("");
  document.getElementById("rb-schleier").style.background = f.schleier;
}
let rbArt = "jahr";
function rueckblickFolien() {
  const pio = PIONIER.filter(cc => besucht.includes(cc));
  if (rbArt === "halbjahr") {
    const neu = ["VN", "TH", "ID"].filter(cc => besucht.includes(cc)), km = 18420;
    return [
      `<p class="rb-klein">Ahoi · ${t("Januar bis Juni")}</p><p class="rb-mittel">${t("Dein erstes Halbjahr {jahr}", { jahr: JAHR })}</p><p class="rb-text">${t("Tippe rechts zum Weiterblättern, links zurück.")}</p>`,
      `<p class="rb-klein">${t("Neue Länder")}</p><p class="rb-gross">${neu.length}</p><div class="rb-flaggen">${neu.map(flagge).join("")}</div>`,
      `<p class="rb-klein">${t("Zurückgelegt")}</p><p class="rb-gross">${km.toLocaleString(LOC)}<span style="font-size:.4em"> km</span></p><p class="rb-text">${t("Halbzeit. Das ist {x}-mal um die Erde.", { x: (km / 40075).toLocaleString(LOC, { maximumFractionDigits: 2 }) })}</p>`,
      `<p class="rb-klein">${t("Treffen mit Freunden")}</p><p class="rb-gross">6</p><p class="rb-text">${t("Am häufigsten mit {name}: {n}-mal.", { name: "Jonas", n: 3 })}</p>`,
      `<p class="rb-klein">${t("Am längsten warst du in")}</p><p class="rb-mittel">${flagge("TH")} Chiang Mai</p><p class="rb-text">${t("{n} Nächte", { n: 34 })}</p>`,
      `<p class="rb-mittel">${t("Auf ein starkes zweites Halbjahr!")}</p><p class="rb-text">${t("Wohin geht es als Nächstes?")}</p><button class="rb-ende" id="rb-ende">${t("Schließen")}</button>`
    ];
  }
  const neu = ["VN", "HR", "GR", "MX", "TH"].filter(cc => besucht.includes(cc)), km = 41230, um = (km / 40075).toLocaleString(LOC, { maximumFractionDigits: 2 });
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
  const blick = (rbArt === "halbjahr" ? RB_BLICK_HALB : RB_BLICK)[rbStand] || RB_BLICK[0];
  // Karte so verschieben, dass der Blickpunkt in der Bildmitte liegt (Kartenbild 360 × 142 Einheiten)
  document.getElementById("rb-karte").style.transform = `translate(-50%, -50%) scale(${blick[2]}) translate(${(180 - blick[0]) / 360 * 100}%, ${(77 - blick[1]) / 142 * 100}%)`;
  const folie = document.getElementById("rb-folie");
  folie.innerHTML = `<div class="rb-folie-ein">${folien[rbStand]}</div>`;
  document.getElementById("rb-balken").innerHTML = folien.map((_, i) => `<span class="${i < rbStand ? "fertig" : i === rbStand ? "laeuft" : ""}"><i></i></span>`).join("");
  const ende = document.getElementById("rb-ende"); if (ende) ende.onclick = rueckblickSchliessen;
  clearTimeout(rbUhr);
  if (rbStand < folien.length - 1) rbUhr = setTimeout(() => rueckblickZeigen(rbStand + 1), 6000);
}
async function rueckblickOeffnen(art) {
  rbArt = art;
  await rbKarteZeichnen();
  document.getElementById("rueckblick").classList.add("offen");
  rueckblickZeigen(0);
}
function rueckblickSchliessen() { clearTimeout(rbUhr); document.getElementById("rueckblick").classList.remove("offen"); }
document.getElementById("jahr-zeile").onclick = () => rueckblickOeffnen("jahr");
document.getElementById("halbjahr-zeile").onclick = () => rueckblickOeffnen("halbjahr");
document.getElementById("halbjahr-name").textContent = t("Dein erstes Halbjahr {jahr}", { jahr: JAHR });
document.getElementById("rb-rechts").onclick = () => rueckblickZeigen(rbStand + 1);
document.getElementById("rb-links").onclick = () => rueckblickZeigen(rbStand - 1);
document.getElementById("rb-zu").onclick = rueckblickSchliessen;
// Von selbst: der Jahresrückblick einmal zwischen 15. Dezember und 15. Januar, das Halbjahr einmal im Juli
function rueckblickVonSelbst() {
  if (ECHT) return; // in der echten App erst, wenn echte Reisedaten da sind
  const d = new Date(), m = d.getMonth(), tag = d.getDate();
  let art = null, schluessel = null;
  if ((m === 11 && tag >= 15) || (m === 0 && tag <= 15)) { art = "jahr"; schluessel = "ahoi-rb-jahr-" + (m === 0 ? JAHR - 1 : JAHR); }
  else if (m === 6) { art = "halbjahr"; schluessel = "ahoi-rb-halbjahr-" + JAHR; }
  if (!art) return;
  try { if (localStorage.getItem(schluessel)) return; localStorage.setItem(schluessel, "1"); } catch (e) { return; }
  setTimeout(() => rueckblickOeffnen(art), 5200);
}

// ---------- Länder-Sammlung ----------
const LAENDER_SCHLUESSEL = ECHT ? "ahoi-echt-laender" : "ahoi-laender";
// Länder zählen wie bei den Vereinten Nationen: 193 Mitglieder plus Vatikan und Palästina.
// Überseegebiete (St. Martin, Sint Maarten, Puerto Rico, Grönland …) zählen für ihr Mutterland.
// Die Antarktis zählt nicht als Land, aber für die 7 Kontinente.
const STAATEN = new Set("AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI CV KH CM CA CF TD CL CN CO KM CG CD CR CI HR CU CY CZ KP DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PA PG PY PE PH PL PT QA KR RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VE VN YE ZM ZW VA PS".split(" "));
const GEBIET_ZU = { AI: "GB", AS: "US", AW: "NL", AX: "FI", BL: "FR", BM: "GB", BQ: "NL", BV: "NO", CC: "AU", CK: "NZ", CW: "NL", CX: "AU", FK: "GB", FO: "DK", GF: "FR", GG: "GB", GI: "GB", GL: "DK", GP: "FR", GS: "GB", GU: "US", HK: "CN", HM: "AU", IM: "GB", IO: "GB", JE: "GB", KY: "GB", MF: "FR", MO: "CN", MP: "US", MQ: "FR", MS: "GB", NC: "FR", NF: "AU", NU: "NZ", PF: "FR", PM: "FR", PN: "GB", PR: "US", RE: "FR", SH: "GB", SJ: "NO", SX: "NL", TC: "GB", TF: "FR", TK: "NZ", UM: "US", VG: "GB", VI: "US", WF: "FR", YT: "FR" };
const staatVon = cc => !cc ? null : STAATEN.has(cc) || cc === "AQ" ? cc : GEBIET_ZU[cc] || null;
const laenderZahl = () => besucht.filter(cc => STAATEN.has(cc)).length;
let laenderUhr = null;
function besuchtSpeichern() {
  try { localStorage.setItem(LAENDER_SCHLUESSEL, JSON.stringify(besucht)); } catch (e) {}
  // Echte App: kurz sammeln, dann ins Profil schreiben, damit Freunde sie im Steckbrief sehen
  if (ECHT && ECHT_DATEN.uid && !familieModus) { clearTimeout(laenderUhr); laenderUhr = setTimeout(() => SB.from("profile").update({ laender: besucht.filter(cc => STAATEN.has(cc) || cc === "AQ") }).eq("id", ECHT_DATEN.uid).then(x => { if (x.error) hinweis(t("Speichern hat nicht geklappt")); }), 800); }
}
function landDazu(cc) { const s = staatVon(cc); if (!s || besucht.includes(s)) return false; besucht.push(s); besuchtSpeichern(); return true; }
let besucht = ECHT ? [] : ["DE", "ES", "PT", "SK", "IT", "FR", "TH", "VN", "ID", "MX", "GR", "HR"];
try { const g = JSON.parse(localStorage.getItem(LAENDER_SCHLUESSEL) || "null"); if (Array.isArray(g)) besucht = g; } catch (e) {}
// Ältere Einträge (eigene Gebiete) auf die Staaten umstellen
{ const sauber = [...new Set(besucht.map(staatVon).filter(Boolean))]; if (sauber.length !== besucht.length || sauber.some((c, i) => c !== besucht[i])) { besucht = sauber; besuchtSpeichern(); } }
if (ECHT && ich().land) landDazu(ich().land);
const landName = cc => { try { return new Intl.DisplayNames([SPRACHE], { type: "region" }).of(cc); } catch (e) { return cc; } };
// Meine Länder: im Profil nur eine Zeile, eigene Seite mit Freirubbel-Karte
const KONTINENTE = { EU: "Europa", AS: "Asien", AF: "Afrika", NA: "Nordamerika", SA: "Südamerika", OC: "Ozeanien", AN: "Antarktis" };
let PIONIER = ECHT ? [] : ["VN", "HR"], PIONIERE_ALLE = {}; // Land → Person, die als Erste dort war (echte App: aus dem Orte-Verlauf)
const KONT_FARBEN = {
  modern: { EU: "#0a84ff", AS: "#ff9f0a", AF: "#ff375f", NA: "#30d158", SA: "#bf5af2", OC: "#40c8e0", AN: "#8e8e93", zu: "#d5d8de", meer: "#eef2f6", rand: "#ffffff" },
  mission: { EU: "#5fd4ea", AS: "#5fd4ea", AF: "#5fd4ea", NA: "#5fd4ea", SA: "#5fd4ea", OC: "#5fd4ea", AN: "#5fd4ea", zu: "#11263a", meer: "#06101c", rand: "#2b6f8a" },
  abenteuer: { EU: "#c0582f", AS: "#b8913f", AF: "#8a5a33", NA: "#6b7f3e", SA: "#b0503a", OC: "#4f6f86", AN: "#8a8478", zu: "#d6c7a2", meer: "#c9d3c7", rand: "#8a6a48" }
};
let welt = null;
function stempelAufbauen() {
  document.getElementById("laender-wert").textContent = laenderZahl();
  if (document.getElementById("seite-meine-laender").classList.contains("offen")) meineLaenderAufbauen();
}
document.getElementById("laender-zeile").onclick = () => { seiteZeigen("meine-laender"); meineLaenderAufbauen(); };
document.getElementById("ml-bearbeiten").onclick = () => { seiteZeigen("laender"); laenderListe(""); };
async function meineLaenderAufbauen() {
  if (!welt) { try { welt = await (await fetch("weltkarte.json")).json(); } catch (e) { welt = []; } }
  const f = KONT_FARBEN[stil], kontVon = Object.fromEntries(welt.map(l => [l.i, l.k]));
  const kont = [...new Set(besucht.map(cc => kontVon[cc]).filter(k => k && k !== "AN"))];
  document.getElementById("ml-zahl").textContent = anzahl(laenderZahl(), "laender");
  document.getElementById("ml-kont").textContent = t("{n} von 7 Kontinenten", { n: kont.length + (besucht.some(cc => kontVon[cc] === "AN") ? 1 : 0) });
  const pio = PIONIER.filter(cc => besucht.includes(cc));
  document.getElementById("ml-pionier").textContent = pio.length ? t("🚩 {n}× Pionier", { n: pio.length }) : "";
  const anteil = Math.min(1, (kont.length + (besucht.some(cc => kontVon[cc] === "AN") ? 1 : 0)) / 7), umfang = 2 * Math.PI * 27;
  document.getElementById("ml-ring").style.strokeDasharray = `${(anteil * umfang).toFixed(1)} ${umfang.toFixed(1)}`;
  document.getElementById("ml-ring-text").textContent = `${Math.round(anteil * 7)}/7`;
  const svg = document.getElementById("rubbelkarte");
  svg.innerHTML = `<rect x="0" y="6" width="360" height="142" fill="${f.meer}"/>` +
    welt.map(l => { const frei = besucht.includes(l.i); return `<path class="${frei ? "frei" : ""}" d="${l.d}" fill="${frei ? (f[l.k] || f.EU) : f.zu}" stroke="${f.rand}"><title>${landName(l.i)}</title></path>`; }).join("");
  const gruppen = {};
  besucht.forEach(cc => { const k = kontVon[cc] || "EU"; (gruppen[k] = gruppen[k] || []).push(cc); });
  document.getElementById("ml-kontinente").innerHTML = Object.keys(KONTINENTE).filter(k => gruppen[k]).map(k =>
    `<div class="kontinent"><b>${t(KONTINENTE[k])} · ${gruppen[k].length}</b><div class="laender-chips">${gruppen[k].sort((a, b) => landName(a).localeCompare(landName(b), SPRACHE)).map(cc => `<span>${flagge(cc)} ${landName(cc)}${PIONIER.includes(cc) ? " 🚩" : ""}</span>`).join("")}</div></div>`).join("");
}
function laenderListe(suche) {
  const alle = [...STAATEN, "AQ"]
    .map(cc => [cc, landName(cc)]).sort((a, b) => a[1].localeCompare(b[1], SPRACHE))
    .filter(([cc, n]) => !suche || n.toLowerCase().includes(suche.toLowerCase()));
  const box = document.getElementById("land-liste");
  box.innerHTML = alle.map(([cc, n]) => `<div class="land-zeile${besucht.includes(cc) ? " an" : ""}" data-cc="${cc}"><span>${flagge(cc)}&nbsp;&nbsp;${n}</span><span class="haken">✓</span></div>`).join("");
  box.querySelectorAll(".land-zeile").forEach(z => z.onclick = () => {
    const cc = z.dataset.cc, i = besucht.indexOf(cc);
    if (i >= 0) besucht.splice(i, 1); else besucht.push(cc);
    besuchtSpeichern();
    z.classList.toggle("an"); stempelAufbauen(); if (!document.getElementById("seite-laender").classList.contains("offen")) return;
  });
}
document.getElementById("land-suche").addEventListener("input", e => laenderListe(e.target.value));
stempelAufbauen();
if (!ECHT) { reisenAufbauen(); chatListeAufbauen(); ideenAufbauen(); }


// ---------- Freundeskreise: Filter-Chips und Verwaltung ----------
function kreisChipsAufbauen() {
  const box = document.getElementById("kreis-chips");
  box.innerHTML = kreise.length ? [`<button data-k="alle" class="${kreisFilter === "alle" ? "aktiv" : ""}">${t("Alle|Filter")}</button>`, ...kreise.map(k => `<button data-k="${k.id}" class="${kreisFilter === k.id ? "aktiv" : ""}">${k.symbol} ${ohneHtml(k.name)}</button>`)].join("") : "";
  box.querySelectorAll("button").forEach(b => b.onclick = e => { e.stopPropagation(); kreisFilter = b.dataset.k; kreisChipsAufbauen(); pinsSetzen(); listeAufbauen(); });
  document.getElementById("kreise-wert").textContent = kreise.length || "";
}
document.getElementById("kreis-chips").addEventListener("pointerdown", e => e.stopPropagation());
function kreiseSpeichern() { if (!ECHT) try { localStorage.setItem("ahoi-kreise", JSON.stringify(kreise)); } catch (e) {} kreisChipsAufbauen(); }
let neuerKreis = null;
function kreiseSeiteAufbauen() {
  document.getElementById("kreis-liste").innerHTML = kreise.map(k => `<div class="kasten kreis"><div class="kreis-symbol">${k.symbol}</div><div class="zeile"><b>${ohneHtml(k.name)}</b><div class="gesichter">${k.leute.map(person).filter(Boolean).map(p => ava(p)).join("")}</div></div><button class="knopf-leise" data-weg="${k.id}" aria-label="${t("Entfernen")}">✕</button></div>`).join("") || `<p class="hinweis-band">${t("Noch keine Kreise")}</p>`;
  document.querySelectorAll("#kreis-liste [data-weg]").forEach(b => b.onclick = () => { kreise = kreise.filter(k => k.id !== b.dataset.weg); if (kreisFilter === b.dataset.weg) kreisFilter = "alle"; kreiseSpeichern(); kreiseSeiteAufbauen(); pinsSetzen(); listeAufbauen(); });
  const form = document.getElementById("kreis-neu");
  form.hidden = !neuerKreis; document.getElementById("kreis-plus").hidden = !!neuerKreis;
  if (!neuerKreis) return;
  document.getElementById("kreis-symbole").innerHTML = KREIS_SYMBOLE.map(z => `<button data-z="${z}" class="${neuerKreis.symbol === z ? "aktiv" : ""}">${z}</button>`).join("");
  document.querySelectorAll("#kreis-symbole button").forEach(b => b.onclick = () => { neuerKreis.symbol = b.dataset.z; kreiseSeiteAufbauen(); });
  document.getElementById("kreis-leute").innerHTML = leute.filter(p => p.id !== "du").map(p => `<button data-p="${p.id}" class="${neuerKreis.leute.includes(p.id) ? "aktiv" : ""}">${ohneHtml(p.name)}</button>`).join("");
  document.querySelectorAll("#kreis-leute button").forEach(b => b.onclick = () => { const i = neuerKreis.leute.indexOf(b.dataset.p); if (i >= 0) neuerKreis.leute.splice(i, 1); else neuerKreis.leute.push(b.dataset.p); kreiseSeiteAufbauen(); });
}
document.getElementById("kreis-name").addEventListener("input", e => { if (neuerKreis) neuerKreis.name = e.target.value; });
document.getElementById("kreis-plus").onclick = () => { neuerKreis = { id: "k" + Date.now(), name: "", symbol: "⭐", leute: [] }; document.getElementById("kreis-name").value = ""; kreiseSeiteAufbauen(); document.getElementById("kreis-name").focus(); };
document.getElementById("kreis-speichern").onclick = () => {
  if (!neuerKreis.name.trim()) return hinweis(t("Bitte einen Namen eingeben"));
  if (!neuerKreis.leute.length) return hinweis(t("Bitte mindestens eine Person wählen"));
  neuerKreis.name = neuerKreis.name.trim(); kreise.push(neuerKreis); neuerKreis = null; kreiseSpeichern(); kreiseSeiteAufbauen(); hinweis(t("Kreis gespeichert"));
};
document.getElementById("kreise-zeile").onclick = () => { neuerKreis = null; seiteZeigen("kreise"); kreiseSeiteAufbauen(); };
kreisChipsAufbauen();

// ---------- Paar: in der Info-Karte „Wir sind ein Paar“, die andere Person bestätigt ----------
let paarAnfrage = null;
const meinPartner = () => ich().paar ? leute.find(p => p.id !== "du" && p.paar === ich().paar) : null;
function paarWertZeigen() { const p = meinPartner(); document.getElementById("paar-wert").textContent = p ? "❤️ " + p.name : paarAnfrage ? t("Anfrage gesendet") : t("Nicht verknüpft"); }
function paarLoesen() {
  const p = meinPartner(); if (!p) return;
  fragen(t("Verknüpfung mit {name} lösen?", { name: p.name }), [[t("Lösen"), async () => {
    if (ECHT) { const { error } = await SB.rpc("paar_loesen"); if (error) return hinweis(t("Das hat nicht geklappt")); }
    delete p.paar; delete ich().paar; paarWertZeigen(); pinsSetzen(); listeAufbauen(); hinweis(t("Verknüpfung gelöst"));
  }, true]]);
}
function paarKnopfSetzen(gruppe) {
  const k = document.getElementById("info-paar"), p = gruppe[0];
  const zeigen = !familieModus && gruppe.length === 1 && p.id !== "du" && (!p.paar || p.paar === ich().paar);
  k.style.display = zeigen ? "inline-block" : "none";
  if (!zeigen) return;
  const istPartner = ich().paar && p.paar === ich().paar;
  k.textContent = istPartner ? t("❤️ Ihr seid ein Paar") : paarAnfrage === p.id ? t("❤️ Anfrage gesendet") : t("❤️ Wir sind ein Paar");
  k.onclick = () => {
    if (istPartner) return paarLoesen();
    if (paarAnfrage === p.id) return;
    if (meinPartner()) return hinweis(t("Du bist schon mit {name} verknüpft", { name: meinPartner().name }));
    fragen(t("Mit {name} als Paar verknüpfen? {name} bestätigt. Danach zeigt die Karte ❤️, wenn ihr am selben Ort seid.", { name: p.name }), [[t("Anfrage senden"), () => {
      if (ECHT) return paarEchtAnfragen(p, gruppe);
      paarAnfrage = p.id; paarWertZeigen(); paarKnopfSetzen(gruppe); hinweis(t("Anfrage an {name} gesendet", { name: p.name }));
      // Prototyp: die Bestätigung kommt nach kurzer Zeit von selbst
      setTimeout(() => { if (paarAnfrage !== p.id) return; paarAnfrage = null; ich().paar = p.paar = "p-du"; paarWertZeigen(); pinsSetzen(); hinweis(t("{name} hat bestätigt ❤️", { name: p.name })); if (document.getElementById("info").classList.contains("offen")) paarKnopfSetzen(gruppe); }, 3500);
    }]]);
  };
}
// ---------- Steckbrief: eine Person auf einen Blick (zuerst nur im Prototyp) ----------
// Modern: Farbverlauf, Zahlen zählen hoch · Mission: Personalakte mit Scan · Abenteuer: Reisepass mit Länderstempeln
const STEMPEL_FARBEN = ["#2f5d8a", "#a8322a", "#2f6b4a", "#6a3f8a", "#8a5a1e"];
const BEISPIEL_LAENDER = "ES PT FR IT DE GR HR NL GB AT CZ HU TH VN ID MY SG JP KH LA MX US CO PE AR BR MA ZA TR AU NZ IN LK PH CH BE IE SK PL DK SE NO CR CL EG KE TZ GE AL ME".split(" ");
function laenderVon(p) {
  if (p.id === "du") return besucht.filter(cc => STAATEN.has(cc) || cc === "AQ");
  if (ECHT) return p.laenderListe && p.laenderListe.length ? p.laenderListe : null;
  if (!p.laender) return null;
  // Prototyp: feste, aber zufällig wirkende Auswahl passend zur Länderzahl
  let saat = [...p.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const zufall = () => (saat = (saat * 1103515245 + 12345) >>> 0) / 4294967296;
  const pool = BEISPIEL_LAENDER.filter(c => c !== p.land);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(zufall() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return [p.land, ...pool].slice(0, p.laender);
}
function naechsteReiseSteckbrief(id) {
  const heute = new Date().toISOString().slice(0, 10), monat = heute.slice(0, 7);
  return reisen.filter(r => r.wer.includes(id) && (r.vielleicht ? r.monat >= monat : r.bis >= heute)).sort((a, b) => reiseSchluessel(a).localeCompare(reiseSchluessel(b)))[0];
}
async function steckbriefOeffnen(p) {
  if (!welt) { try { welt = await (await fetch("weltkarte.json")).json(); } catch (e) { welt = []; } }
  const selbst = p.id === "du", du = ich(), laender = laenderVon(p) || [];
  const kontVon = Object.fromEntries(welt.map(l => [l.i, l.k]));
  const kont = new Set(laender.map(cc => kontVon[cc]).filter(Boolean)).size;
  const zahl = laender.filter(cc => STAATEN.has(cc)).length;
  const pio = selbst ? PIONIER.filter(cc => besucht.includes(cc)).length : Object.values(PIONIERE_ALLE).filter(u => u === p.uid).length;
  const abstand = !selbst && du.lat != null && p.lat != null ? entfernungKm(du.lat, du.lon, p.lat, p.lon) : null;
  // Mit wem unterwegs: bestätigte Reisegruppe, sonst der Partner, wenn er am selben Ort ist
  const rg = gruppeVon(p.id), partner = p.paar && leute.find(q => q.id !== p.id && q.paar === p.paar && q.lat != null && p.lat != null && entfernungKm(p.lat, p.lon, q.lat, q.lon) < NAH_KM);
  const mit = rg ? rg.leute.filter(id => id !== p.id).map(person).filter(Boolean) : partner ? [partner] : [];
  const reise = naechsteReiseSteckbrief(p.id);
  const name = selbst ? (p.echterName || t("Du")) : p.name;
  const akte = "AH-" + String([...p.id].reduce((a, c) => a + c.charCodeAt(0) * 7, 0) % 9000 + 1000);
  const titel = { modern: "", mission: `${t("Personalakte")} · ${akte} · ${t("Freigegeben")}`, abenteuer: t("Reisepass") }[stil];
  const f = { modern: { meer: "#e9eef4", land: "#dde2e8", an: "#0a84ff", rand: "#ffffff" }, mission: { meer: "#06101c", land: "#0d1d30", an: "#5fd4ea", rand: "#1d4a5e" }, abenteuer: { meer: "#cfd6c4", land: "#ecdcb6", an: "#c0582f", rand: "#b39a72" } }[stil];
  let nr = 0;
  const karte = `<svg viewBox="0 6 360 142" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><rect x="0" y="6" width="360" height="142" fill="${f.meer}"/>` +
    welt.map(l => laender.includes(l.i) ? `<path class="an" style="--i:${nr++}" d="${l.d}" fill="${f.an}" stroke="${f.rand}" stroke-width=".25"/>` : `<path d="${l.d}" fill="${f.land}" stroke="${f.rand}" stroke-width=".25"/>`).join("") +
    (p.lat != null ? `<circle class="sb-ring" cx="${(p.lon + 180).toFixed(1)}" cy="${(90 - p.lat).toFixed(1)}" r="2.4" fill="none" stroke="${stil === "mission" ? "#e8a33a" : "#ff375f"}" stroke-width=".8"/><circle cx="${(p.lon + 180).toFixed(1)}" cy="${(90 - p.lat).toFixed(1)}" r="1.8" fill="${stil === "mission" ? "#e8a33a" : "#ff375f"}" stroke="#fff" stroke-width=".5"/>` : "") + `</svg>`;
  const feld = (label, wert, breit) => `<div class="sb-feld${breit ? " sb-breit" : ""}"><span>${label}</span><b>${wert}</b></div>`;
  let felder = feld(ortAktuell(p) ? t("Gerade in") : t("Zuletzt in"), p.ort ? `${flagge(p.land)} ${ohneHtml(p.ort)}${ortAktuell(p) ? "" : `<small class="ort-alt sb-klein">${ortAlterText(p)}</small>`}` : "–") +
    feld(t("Ortszeit"), `${uhrzeit(p.tz)}${t(" Uhr")}${selbst ? "" : `<small class="sb-klein">${zeitDiffLang(p.tz)}</small>`}`);
  if (abstand != null) felder += feld(t("Entfernung"), abstand < 1 ? t("Am selben Ort") : km(abstand), true);
  if (mit.length) felder += feld(t("Reist mit"), ((!rg && partner) || (mit.length === 1 && mit[0].paar && mit[0].paar === p.paar) ? "❤️ " : "") + gruppenText(mit), true);
  if (reise) felder += feld(t("Nächste Reise"), `${reise.land ? flagge(reise.land) : "📍"} ${ohneHtml(reise.ziel)} · ${reise.von ? kurz(reise.von) + " – " + kurz(reise.bis) : t("irgendwann im {m}", { m: datum(reise.monat + "-01").toLocaleDateString(LOC, { month: "long" }) })}`, true);
  const zahlen = laenderVon(p) ? `<div class="sb-zahlen"><div><b data-zahl="${zahl}">${zahl}</b><span>${t(zahl === 1 ? "Land" : "Länder")}</span></div><div><b>${kont}/7</b><span>${t("Kontinente")}</span></div><div><b>${pio ? pio + "×" : "–"}</b><span>${t("Pionier")}</span></div></div><div class="sb-karte">${karte}</div>` : "";
  const sortiert = laender.filter(cc => STAATEN.has(cc)).slice(0, 11);
  const stempel = sortiert.length ? `<div class="sb-stempel">${sortiert.map((cc, i) => `<span class="stempel-ink${i % 3 === 1 ? " eckig" : ""}" style="--i:${i};--r:${((i * 37) % 26) - 13}deg;--sf:${STEMPEL_FARBEN[i % STEMPEL_FARBEN.length]}">${flagge(cc)}<small>${cc}</small></span>`).join("")}${zahl > sortiert.length ? `<span class="stempel-mehr">+${zahl - sortiert.length}</span>` : ""}</div>` : "";
  const linksHtml = Object.entries((selbst ? meineLinks : p.links) || {}).map(([k, v]) => { const u = linkZiel(k, v), a = LINK_ARTEN.find(x => x[0] === k); return u && a ? `<a href="${ohneHtml(u)}" target="_blank" rel="noopener">${a[1]}</a>` : ""; }).join("");
  const knoepfe = (linksHtml ? `<div class="sb-links">${linksHtml}</div>` : "") + (selbst ? "" : `<div class="sb-knoepfe"><button class="knopf-leise" id="sb-karte-zeigen">📍 ${t("Auf der Karte")}</button><button class="knopf-leise" id="sb-nachricht">💬 ${t("Nachricht")}</button></div>`);
  const blatt = document.getElementById("sb-blatt");
  blatt.style.setProperty("--sb-farbe", p.farbe || "#0a84ff");
  blatt.innerHTML = `<button class="sb-zu" id="sb-zu" aria-label="${t("Schließen")}">✕</button>
    <div class="sb-kopf"><div class="sb-titelzeile">${titel}</div>
      <div class="sb-bild" style="${kopfStil(p)}">${kopfText(p)}<span class="sb-scan"></span></div>
      <h2 class="sb-name">${ohneHtml(name)}</h2><div class="sb-status">${ohneHtml(statusText(p))}</div>
      <span class="sb-freigabe">${t("Aktiv")}</span></div>
    <div class="sb-felder">${felder}</div>${zahlen}${stempel}${knoepfe}`;
  blatt.scrollTop = 0;
  const sb = document.getElementById("steckbrief");
  sb.classList.remove("zu"); sb.classList.add("offen");
  document.getElementById("sb-zu").onclick = steckbriefZu;
  const zk = document.getElementById("sb-karte-zeigen"); if (zk) zk.onclick = () => { steckbriefZu(); seiteZeigen("karte"); zuPerson(p); };
  const nk = document.getElementById("sb-nachricht"); if (nk) nk.onclick = () => { steckbriefZu(); einzelChat(p.id); };
  if (ruhig) return;
  if (stil === "modern") blatt.querySelectorAll("[data-zahl]").forEach(el => { const ziel = +el.dataset.zahl, start = performance.now(); const schritt = j => { const q = Math.min(1, (j - start - 300) / 900); if (q < 0) return requestAnimationFrame(schritt); el.textContent = Math.round(ziel * (1 - Math.pow(1 - q, 3))); if (q < 1) requestAnimationFrame(schritt); }; el.textContent = "0"; requestAnimationFrame(schritt); });
  if (stil === "mission") { const n = blatt.querySelector(".sb-name"), voll = n.textContent; n.textContent = ""; n.classList.add("tippt"); let i = 0; const tippen = () => { n.textContent = voll.slice(0, ++i); if (i < voll.length) setTimeout(tippen, 55); else setTimeout(() => n.classList.remove("tippt"), 900); }; setTimeout(tippen, 450); }
}
function steckbriefZu() {
  const sb = document.getElementById("steckbrief");
  if (!sb.classList.contains("offen")) return;
  sb.classList.add("zu");
  setTimeout(() => sb.classList.remove("offen", "zu"), ruhig ? 0 : 240);
}
document.getElementById("sb-hinten").onclick = steckbriefZu;
document.addEventListener("keydown", e => { if (e.key === "Escape") steckbriefZu(); });
document.getElementById("steckbrief-selbst").onclick = () => steckbriefOeffnen(ich());

// ---------- Profil: Social Media und Webseite (freiwillig, klein im Steckbrief) ----------
const LINK_ARTEN = [["instagram", "Instagram", "@name"], ["tiktok", "TikTok", "@name"], ["x", "X", "@name"], ["facebook", "Facebook", "Name oder Link"], ["linkedin", "LinkedIn", "Name oder Link"], ["web", "Webseite", "https://…"]];
function linkZiel(k, v) {
  v = String(v || "").trim(); if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v.replace(/^http:/i, "https:");
  const n = encodeURIComponent(v.replace(/^@/, "").replace(/\s+/g, ""));
  return { instagram: `https://instagram.com/${n}`, tiktok: `https://www.tiktok.com/@${n}`, x: `https://x.com/${n}`, facebook: `https://facebook.com/${n}`, linkedin: `https://www.linkedin.com/in/${n}`, web: `https://${v.replace(/\s+/g, "")}` }[k] || null;
}
let meineLinks = {};
function linksWertZeigen() { const n = Object.keys(meineLinks).length; document.getElementById("links-wert").textContent = n ? t("{n} eingetragen", { n }) : t("Freiwillig"); }
function linksSeiteAufbauen() {
  document.getElementById("links-felder").innerHTML = LINK_ARTEN.map(([k, name, ph]) => `<label>${name}<input data-link="${k}" maxlength="200" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="${k === "web" || k === "linkedin" || k === "facebook" ? "url" : "text"}" placeholder="${ohneHtml(t(ph))}" value="${ohneHtml(meineLinks[k] || "")}"></label>`).join("");
}
document.getElementById("links-zeile").onclick = () => { linksSeiteAufbauen(); seiteZeigen("links"); };
document.getElementById("links-speichern").onclick = async e => {
  const neu = {};
  document.querySelectorAll("#links-felder [data-link]").forEach(f => { const v = f.value.trim(); if (v) neu[f.dataset.link] = v.slice(0, 200); });
  if (ECHT) {
    beschaeftigt(e.target, true);
    const { error } = await SB.from("profile").update({ links: neu }).eq("id", ECHT_DATEN.uid);
    beschaeftigt(e.target, false);
    if (error) return hinweis(t("Speichern hat nicht geklappt"));
  } else { try { localStorage.setItem("ahoi-links", JSON.stringify(neu)); } catch (x) {} }
  meineLinks = neu; linksWertZeigen(); seiteZeigen("profil"); hinweis(t("Gespeichert"));
};
if (!ECHT) { try { meineLinks = JSON.parse(localStorage.getItem("ahoi-links") || "{}"); } catch (e) {} }
linksWertZeigen();

// ---------- Freunde: Ahoi-Name, QR-Code, Scannen, Vorschläge (Entscheidung C + E: alle sehen weiter alle) ----------
const FREUNDE = { name: null, code: null, freunde: [], rein: [], raus: [], vorschlaege: [] };
const einladeLink = code => location.origin + location.pathname.replace(/index\.html$/, "").replace(/prototyp\/$/, "") + "?einladung=" + code;
const pidVon = uid => ECHT ? idVon(uid) : uid;
const nameVonUid = uid => { const p = person(pidVon(uid)) || (ECHT_DATEN && ECHT_DATEN.alle || []).find(x => x.uid === uid); return p ? (p.echterName || p.name) : "?"; };
async function freundeLaden() {
  if (!ECHT || familieModus || ECHT_DATEN.profil.art === "familie") return;
  const uid = ECHT_DATEN.uid;
  const [n, c, f, a, v] = await Promise.all([SB.from("profile").select("ahoi_name").eq("id", uid).maybeSingle(), SB.rpc("mein_qr_code"), SB.from("freundschaft").select("a, b"), SB.from("freund_anfrage").select("von, an"), SB.rpc("freund_vorschlaege")]);
  if (!n.error && n.data) FREUNDE.name = n.data.ahoi_name;
  if (!c.error) FREUNDE.code = c.data;
  document.getElementById("freunde-zeile").hidden = !!c.error || !c.data;
  if (!f.error) FREUNDE.freunde = f.data.map(x => x.a === uid ? x.b : x.a);
  if (!a.error) { FREUNDE.rein = a.data.filter(x => x.an === uid).map(x => x.von); FREUNDE.raus = a.data.filter(x => x.von === uid).map(x => x.an); }
  if (!v.error) FREUNDE.vorschlaege = v.data || [];
  document.getElementById("freunde-zahl").textContent = FREUNDE.rein.length || "";
  if (document.getElementById("seite-freunde").classList.contains("offen")) freundeAufbauen();
}
async function freundeAufbauen() {
  const qrBox = document.getElementById("qr-bild");
  const code = ECHT ? FREUNDE.code : "qbeispiel", name = ECHT ? FREUNDE.name : "du.unterwegs";
  document.getElementById("ahoi-name").textContent = "@" + (name || "…");
  if (code) {
    try { if (typeof qrcode === "undefined") await skriptLaden("qrcode.js?v=" + VERSION); const q = qrcode(0, "M"); q.addData(einladeLink(code)); q.make(); qrBox.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
    catch (e) { qrBox.textContent = ""; }
  }
  const zeile = (uid, unter, knoepfe) => `<div class="freund-zeile">${ava(person(pidVon(uid)) || { name: nameVonUid(uid), farbe: farbeVon(uid) })}<div><b>${ohneHtml(nameVonUid(uid))}</b>${unter ? `<small>${unter}</small>` : ""}</div>${knoepfe || ""}</div>`;
  const rein = ECHT ? FREUNDE.rein : [];
  document.getElementById("freund-anfragen").innerHTML = rein.length ? `<h2>${t("Möchten sich mit dir verbinden")}</h2><div class="kasten">${rein.map(u => zeile(u, "", `<button class="knopf-gross" data-ja="${u}">${t("Annehmen")}</button><button class="knopf-leise" data-nein="${u}" aria-label="${t("Ablehnen")}">✕</button>`)).join("")}</div>` : "";
  const vs = ECHT ? FREUNDE.vorschlaege : [{ id: "tom", name: "Tom", gemeinsam: 2, ueber: ["Lea", "Nico"] }];
  document.getElementById("freund-vorschlaege").innerHTML = vs.length ? `<h2>${t("Kennst du sie?")}</h2><div class="kasten">${vs.map(v => `<div class="freund-zeile">${ava({ name: v.name, farbe: farbeVon(v.id) })}<div><b>${ohneHtml(v.name)}</b><small>${ohneHtml(v.gemeinsam > 2 ? t("kennt {a}, {b} und {n} weitere", { a: v.ueber[0], b: v.ueber[1], n: v.gemeinsam - 2 }) : v.ueber.length > 1 ? t("kennt {a} und {b}", { a: v.ueber[0], b: v.ueber[1] }) : t("kennt {a}", { a: v.ueber[0] }))}</small></div><button class="knopf-leise" data-kenne="${v.id}">${t("Kenne ich")}</button></div>`).join("")}</div>` : "";
  const liste = ECHT ? FREUNDE.freunde : leute.filter(p => p.id !== "du").map(p => p.id);
  document.getElementById("freunde-titel").textContent = t("Deine Freunde ({n})", { n: liste.length });
  document.getElementById("freunde-liste").innerHTML = liste.length ? liste.map(u => zeile(u, FREUNDE.raus.includes(u) ? t("Anfrage gesendet") : "")).join("") : `<p class="hinweis-band" style="margin:4px 0">${t("Noch keine Freunde. Zeig deinen Code!")}</p>`;
  document.querySelectorAll("[data-ja],[data-nein]").forEach(b => b.onclick = async () => {
    const ja = !!b.dataset.ja, ziel = b.dataset.ja || b.dataset.nein;
    const { error } = await SB.rpc("freund_antworten", { ziel, ja }); if (error) return hinweis(t("Das hat nicht geklappt"));
    if (ja) hinweis(t("Ihr seid jetzt befreundet: {name}", { name: nameVonUid(ziel) })); freundeLaden();
  });
  document.querySelectorAll("[data-kenne]").forEach(b => b.onclick = async () => {
    if (!ECHT) return hinweis(t("Anfrage gesendet (Beispiel)"));
    const { data, error } = await SB.rpc("freund_anfragen", { ziel: b.dataset.kenne }); if (error) return hinweis(t("Das hat nicht geklappt"));
    hinweis(data === "befreundet" ? t("Ihr seid jetzt befreundet: {name}", { name: nameVonUid(b.dataset.kenne) }) : t("Anfrage gesendet")); freundeLaden();
  });
}
document.getElementById("freunde-zeile").onclick = () => { seiteZeigen("freunde"); freundeAufbauen(); freundeLaden().catch(() => {}); };
document.getElementById("ahoi-name-aendern").onclick = () => { const f = document.getElementById("ahoi-name-feld"); f.hidden = !f.hidden; const e = document.getElementById("ahoi-name-eingabe"); e.value = FREUNDE.name || ""; if (!f.hidden) e.focus(); };
document.getElementById("ahoi-name-ok").onclick = async e => {
  const neu = document.getElementById("ahoi-name-eingabe").value.trim().toLowerCase().replace(/^@/, "");
  if (!/^[a-z0-9][a-z0-9._]{2,19}$/.test(neu)) return hinweis(t("3–20 Zeichen: Buchstaben, Zahlen, Punkt oder Unterstrich"));
  if (!ECHT) return hinweis(t("Im Prototyp wird nichts gespeichert"));
  beschaeftigt(e.target, true);
  const { error } = await SB.from("profile").update({ ahoi_name: neu }).eq("id", ECHT_DATEN.uid);
  beschaeftigt(e.target, false);
  if (error) return hinweis(/duplicate|unique/i.test(error.message) ? t("Der Name ist schon vergeben") : t("Speichern hat nicht geklappt"));
  FREUNDE.name = neu; document.getElementById("ahoi-name-feld").hidden = true; freundeAufbauen(); hinweis(t("Gespeichert"));
};
document.getElementById("freund-suchen").onclick = () => {
  fragen(t("Ahoi-Name suchen"), [[t("Suchen"), async () => {
    const name = (document.getElementById("freund-suche-feld") || {}).value || "";
    if (!ECHT) return hinweis(t("Im Prototyp nur Beispiel"));
    const { data } = await SB.rpc("freund_suchen", { name });
    if (!data) return hinweis(t("Niemand mit diesem Ahoi-Namen gefunden"));
    if (data.id === ECHT_DATEN.uid) return hinweis(t("Das bist du selbst"));
    fragen(t("{name} gefunden (@{n})", { name: data.name, n: data.ahoi_name }), [[t("Verbinden"), async () => {
      const r = await SB.rpc("freund_anfragen", { ziel: data.id }); if (r.error) return hinweis(t("Das hat nicht geklappt"));
      hinweis(r.data === "schon" ? t("Ihr seid schon befreundet") : r.data === "befreundet" ? t("Ihr seid jetzt befreundet: {name}", { name: data.name }) : t("Anfrage gesendet")); freundeLaden();
    }]]);
  }]]);
  const titel = document.getElementById("aktion-titel");
  titel.innerHTML = `${t("Ahoi-Name suchen")}<input id="freund-suche-feld" class="ort-suche" placeholder="@name" autocomplete="off" autocapitalize="off" spellcheck="false">`;
  setTimeout(() => document.getElementById("freund-suche-feld").focus(), 50);
};
// Scannen mit der Kamera (jsQR, nur bei Bedarf geladen)
let scanStrom = null;
function scannerZu() { document.getElementById("scanner").classList.remove("offen"); if (scanStrom) scanStrom.getTracks().forEach(s => s.stop()); scanStrom = null; }
document.getElementById("scanner-zu").onclick = scannerZu;
document.getElementById("qr-scannen").onclick = async () => {
  if (!ECHT) return hinweis(t("Im Prototyp nur Beispiel"));
  const box = document.getElementById("scanner"), video = document.getElementById("scanner-video"), text = document.getElementById("scanner-text");
  try {
    if (typeof jsQR === "undefined") await skriptLaden("jsqr.js?v=" + VERSION);
    scanStrom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
  } catch (e) { return hinweis(t("Kamera nicht erlaubt. Du kannst den Code auch mit der normalen Kamera-App scannen.")); }
  text.textContent = t("Halte die Kamera auf einen Ahoi-Code"); box.classList.add("offen");
  video.srcObject = scanStrom; await video.play().catch(() => {});
  const cv = document.createElement("canvas"), cx = cv.getContext("2d", { willReadFrequently: true });
  const schritt = async () => {
    if (!scanStrom) return;
    if (video.readyState >= 2) {
      const w = 480, h = Math.round(w * video.videoHeight / video.videoWidth) || 480; cv.width = w; cv.height = h; cx.drawImage(video, 0, 0, w, h);
      const r = jsQR(cx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
      if (r && r.data) {
        const m = r.data.match(/[?&]einladung=(q[0-9a-f]{32})/);
        if (!m) { text.textContent = t("Das ist kein Ahoi-Code"); }
        else { scannerZu(); return qrVerbinden(m[1]); }
      }
    }
    requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
};
async function qrVerbinden(code) {
  const { data, error } = await SB.rpc("freund_per_qr", { code });
  if (error || !data) return hinweis(t("Der Code passt zu keinem Mitglied"));
  if (data.selbst) return hinweis(t("Das ist dein eigener Code"));
  hinweis(t("Ihr seid jetzt befreundet: {name}", { name: data.name })); freundeLaden();
}

// ---------- Reisegruppe: „Reist du zusammen mit …?“ ----------
let gruppenAnfrage = null;
function gruppeBeitreten(p, still) {
  if (ECHT) return gruppeEchtAnfragen(p);
  // Prototyp: die andere Person bestätigt nach kurzer Zeit von selbst
  gruppenAnfrage = p.id; hinweis(t("Anfrage an {name} gesendet", { name: p.name }));
  setTimeout(() => {
    if (gruppenAnfrage !== p.id) return; gruppenAnfrage = null;
    const meine = gruppeVon("du"), seine = gruppeVon(p.id);
    if (meine && seine && meine !== seine) { meine.leute.push(...seine.leute.filter(id => !meine.leute.includes(id))); reisegruppen = reisegruppen.filter(g => g !== seine); }
    else if (meine) { if (!meine.leute.includes(p.id)) meine.leute.push(p.id); }
    else if (seine) seine.leute.push("du");
    else reisegruppen.push({ id: "g-" + Date.now(), leute: ["du", p.id] });
    gruppenSpeichern(); pinsSetzen(); listeAufbauen();
    hinweis(t("{name} hat bestätigt: ihr reist zusammen", { name: p.name }));
    if (document.getElementById("info").classList.contains("offen")) infoZeigen(infoGruppe);
  }, 3500);
}
async function reisegruppeVerlassen() {
  const g = gruppeVon("du"); if (!g) return;
  if (ECHT) { const { error } = await SB.rpc("gruppe_verlassen"); if (error) return hinweis(t("Das hat nicht geklappt")); }
  g.leute = g.leute.filter(id => id !== "du");
  reisegruppen = reisegruppen.filter(x => x.leute.length > 1);
  gruppenSpeichern(); pinsSetzen(); listeAufbauen(); hinweis(t("Du reist jetzt allein weiter"));
  if (document.getElementById("info").classList.contains("offen")) infoZeigen(infoGruppe);
}
let infoGruppe = null;
var nachbarnGefragt = false;
function gruppeKnopfSetzen(gruppe) {
  infoGruppe = gruppe;
  const k = document.getElementById("info-gruppe"), du = ich();
  const meine = gruppeVon("du");
  const nahe = gruppe.filter(p => p.id !== "du" && du.lat != null && entfernungKm(du.lat, du.lon, p.lat, p.lon) < NAH_KM);
  const zeigen = !familieModus && (nahe.length > 0 || (meine && gruppe.some(p => p.id === "du")));
  k.style.display = zeigen ? "inline-block" : "none";
  if (!zeigen) return;
  const offen = nahe.filter(p => !meine || !meine.leute.includes(p.id));
  if (!offen.length) { k.textContent = t("👥 Gruppe verlassen"); k.onclick = () => fragen(t("Nicht mehr zusammen unterwegs? Die anderen sehen dich dann wieder einzeln."), [[t("Gruppe verlassen"), reisegruppeVerlassen, true]]); return; }
  const p = offen[0];
  k.textContent = gruppenAnfrage === p.id || (ECHT && ANFRAGEN.mitreiseRaus.includes(p.id)) ? t("👥 Anfrage gesendet") : offen.length === 1 ? t("👥 Mit {name} unterwegs", { name: p.name }) : t("👥 Zusammen unterwegs");
  k.onclick = () => { if (gruppenAnfrage === p.id || (ECHT && ANFRAGEN.mitreiseRaus.includes(p.id))) return; offen.length === 1 ? gruppeBeitreten(p) : fragen(t("Mit wem reist du zusammen?"), offen.map(q => [q.name, () => gruppeBeitreten(q)])); };
}
const nachbarnDieseSitzung = new Set(); // „Abbrechen“ fragt erst beim nächsten Start wieder
// Beim Öffnen: Ist jemand in deiner Nähe, mit dem du noch nicht als Gruppe unterwegs bist, fragt die App einmal pro Ort nach
function nachbarnFragen() {
  if (familieModus) return;
  if (document.getElementById("aktion-blatt").classList.contains("offen")) return setTimeout(nachbarnFragen, 1500);
  const du = ich(); if (du.lat == null) return;
  let gefragt = {}; try { gefragt = JSON.parse(localStorage.getItem("ahoi-gefragt") || "{}"); } catch (e) {}
  const meine = gruppeVon("du");
  const offen = ECHT ? [...ANFRAGEN.mitreiseRaus, ...ANFRAGEN.mitreiseRein] : [];
  const p = leute.find(q => q.id !== "du" && q.lat != null && ortAktuell(q) && entfernungKm(du.lat, du.lon, q.lat, q.lon) < NAH_KM && !(meine && meine.leute.includes(q.id)) && !offen.includes(q.id) && !gefragt[q.id + "|" + du.ort] && !nachbarnDieseSitzung.has(q.id + "|" + du.ort));
  if (!p) return;
  nachbarnDieseSitzung.add(p.id + "|" + du.ort);
  const merken = () => { gefragt[p.id + "|" + du.ort] = 1; try { localStorage.setItem("ahoi-gefragt", JSON.stringify(gefragt)); } catch (e) {} };
  const wo = entfernungKm(du.lat, du.lon, p.lat, p.lon) < 1 ? t("ist auch in {ort}", { ort: du.ort }) : t("ist in deiner Nähe ({ort})", { ort: p.ort });
  fragen(t("{name} {wo}. Reist ihr zusammen?", { name: p.name, wo }), [
    [t("Ja, wir reisen zusammen"), () => { merken(); gruppeBeitreten(p); setTimeout(nachbarnFragen, 4500); }],
    [t("Nein, nur am selben Ort"), () => { merken(); setTimeout(nachbarnFragen, 600); }]
  ]);
}
document.getElementById("paar-zeile").onclick = () => meinPartner() ? paarLoesen() : fragen(t("So verknüpfst du dich: Tippe auf der Karte auf deinen Partner und dann auf „❤️ Wir sind ein Paar“."), [[t("Verstanden"), () => {}]]);
paarWertZeigen();

// ---------- Einladen: zuerst fragen, wen ----------
function einladenWahl() {
  const blatt = document.getElementById("aktion-blatt");
  document.getElementById("aktion-titel").textContent = t("Wen lädst du ein?");
  const box = document.getElementById("aktion-knoepfe"); box.innerHTML = "";
  [[t("🧭 Nomaden-Freund"), t("Ist selbst unterwegs: sieht alle auf der Karte, chattet mit und trägt eigene Reisen ein."), nomadeEinladen],
   [t("🏡 Familie"), t("Bleibt zu Hause und möchte nur dich im Blick behalten. Bekommt eine schlanke Ansicht."), familieErklaeren]].forEach(([titel, text, f]) => {
    const b = document.createElement("button"); b.className = "knopf-leise wahl-knopf"; b.innerHTML = `<b>${titel}</b><small>${text}</small>`;
    b.onclick = () => { blatt.classList.remove("offen"); f(); }; box.appendChild(b);
  });
  blatt.classList.add("offen");
}
const nomadeEinladen = () => ECHT ? freundEinladen() : hinweis(t("Einladungslink erstellt (Beispiel)"));
// Familie: erst zeigen, was sie bekommt, dann den Link erstellen
function familieErklaeren() {
  fragen(t("🏡 Familie einladen"), [
    [t("Link erstellen und teilen"), familieEinladen],
    [t("So sieht es für sie aus"), () => document.getElementById("familie-start").click()]
  ]);
  const titel = document.getElementById("aktion-titel");
  titel.innerHTML = `${t("🏡 Familie einladen")}<small class="aktion-text">${t("Für Eltern, Geschwister und alle, die nicht mitreisen. Sie sehen nur dich: wo du gerade bist, wohin du als Nächstes reist und wie spät es bei dir ist. Für sie gibt es keinen Chat, keine anderen Freunde und nichts einzutragen. Du kannst das jederzeit pausieren.")}</small>`;
}
async function familieEinladen() {
  if (!ECHT) return hinweis(t("Familien-Link erstellt (Beispiel): sieht nur dich"));
  try {
    const { data, error } = await SB.from("einladung").insert({ von: ECHT_DATEN.uid, art: "familie" }).select("code").single();
    if (error) throw error;
    const link = location.origin + location.pathname.replace(/index\.html$/, "") + "?einladung=" + data.code;
    const text = t("Mit Ahoi siehst du, wo ich gerade bin und wohin ich reise. Dein Link (nur für dich, 14 Tage gültig):");
    if (navigator.share) { try { await navigator.share({ title: "Ahoi", text, url: link }); } catch (e) {} return; }
    try { await navigator.clipboard.writeText(text + " " + link); hinweis(t("Link kopiert")); }
    catch (e) { fragen(link, [[t("Schließen"), () => {}]]); }
  } catch (e) { hinweis(t("Einladen hat nicht geklappt")); }
}
async function familieListeAufbauen() {
  const box = document.getElementById("familie-liste");
  const { data, error } = await SB.from("familie_sicht").select("familie, aktiv").eq("nomade", ECHT_DATEN.uid);
  if (error) { box.innerHTML = ""; return; }
  const namen = {};
  if (data.length) { const r = await SB.from("profile").select("id, name").in("id", data.map(x => x.familie)); (r.data || []).forEach(p => namen[p.id] = p.name); }
  box.innerHTML = data.map(x => `<div class="zeile-einst"><div>${ohneHtml(namen[x.familie] || "?")}<small>${x.aktiv ? t("sieht dich") : t("pausiert")}</small></div><button class="schalter${x.aktiv ? " an" : ""}" data-fam="${x.familie}" aria-label="${t("darf mich sehen")}"></button></div>`).join("");
  box.querySelectorAll("[data-fam]").forEach(b => b.onclick = async e => {
    e.stopPropagation();
    const an = !b.classList.contains("an");
    const { error } = await SB.from("familie_sicht").update({ aktiv: an }).eq("nomade", ECHT_DATEN.uid).eq("familie", b.dataset.fam);
    if (error) return hinweis(t("Das hat nicht geklappt"));
    familieListeAufbauen();
  });
}
document.getElementById("einladen-unten").onclick = einladenWahl;
document.getElementById("einladen-zeile").onclick = nomadeEinladen;
document.getElementById("familie-einladen").onclick = familieErklaeren;

// ---------- Echte App: Reisen und Treffer ----------
async function reisenLaden() {
  const { data, error } = await SB.from("reise").select("*").order("ankunft", { nullsFirst: false });
  if (error) return hinweis(t("Laden hat nicht geklappt"));
  const heute = new Date().toISOString().slice(0, 10), monatJetzt = heute.slice(0, 7);
  const neu = data.filter(r => r.vielleicht ? r.monat >= monatJetzt : r.abreise >= heute).map(r => ({
    id: r.id, wer: [r.von === ECHT_DATEN.uid ? "du" : r.von], ziel: r.ort, land: r.land, lat: r.lat, lon: r.lon,
    von: r.vielleicht ? null : r.ankunft, bis: r.vielleicht ? null : r.abreise, monat: r.vielleicht ? r.monat : null, vielleicht: r.vielleicht
  }));
  reisen.splice(0, reisen.length, ...neu);
  reisenAufbauen(); trefferAufbauen();
  if (familieModus) familieAufbauen();
}
// Reisen in ein ganzes Land (Ort noch offen) haben keine Koordinaten; sie treffen sich über das Land
const nurLand = x => x.lat == null && !!x.land;
const nahe = (a, b) => !!a && !!b && (a.lat != null && b.lat != null ? entfernungKm(a.lat, a.lon, b.lat, b.lon) < NAH_KM : (nurLand(a) || nurLand(b)) && a.land === b.land);
// Treffer: Nur was stimmt. Gleicher Ort heißt dieselbe Stadt (unter GLEICH_KM); bis NAH_KM ist es „in der Nähe“ mit beiden Orten.
// Reisen in ein ganzes Land treffen sich als „beide in Vietnam“. „Vielleicht“-Reisen zählen nicht.
const GLEICH_KM = 15;
const abstandOrte = (a, b) => a && b && a.lat != null && b.lat != null ? entfernungKm(a.lat, a.lon, b.lat, b.lon) : null;
function naeheArt(a, b) {
  const d = abstandOrte(a, b);
  if (d != null) return d < GLEICH_KM ? "gleich" : d < NAH_KM ? "nah" : null;
  return (nurLand(a) || nurLand(b)) && a.land && a.land === b.land ? "land" : null;
}
function trefferFinden() {
  const heute = new Date().toISOString().slice(0, 10), du = ich(), treffer = [];
  const bald = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const fest = reisen.filter(r => r.von), meine = fest.filter(r => r.wer[0] === "du" && r.bis >= heute), andere = fest.filter(r => r.wer[0] !== "du" && r.bis >= heute);
  const dazu = (art, x) => {
    const alt = treffer.find(y => y.art === art && y.ort === x.ort && y.ort2 === x.ort2 && y.von === x.von && y.bis === x.bis);
    if (alt) { if (!alt.wer.includes(x.wer)) alt.wer.push(x.wer); } else treffer.push({ art, ...x, wer: [x.wer] });
  };
  // Beide reisen zur selben Zeit an denselben Ort (oder in die Nähe, oder ins selbe Land)
  for (const m of meine) for (const a of andere) {
    const von = m.von > a.von ? m.von : a.von, bis = m.bis < a.bis ? m.bis : a.bis;
    if (von > bis) continue;
    const art = naeheArt(m, a);
    if (art === "gleich") dazu("reise", { ort: m.ziel, land: m.land, wer: a.wer[0], von, bis });
    else if (art === "nah") dazu("nah", { ort: m.ziel, ort2: a.ziel, land: m.land, km: abstandOrte(m, a), wer: a.wer[0], von, bis });
    else if (art === "land") dazu("land", { ort: landName(m.land), land: m.land, wer: a.wer[0], von, bis });
  }
  // Jemand reist dorthin, wo du gerade bist (in den nächsten 60 Tagen und solange du keine Reise woandershin hast)
  for (const a of andere) {
    if (a.von > bald(60) || !ortAktuell(du)) continue;
    const wegDann = meine.some(m => m.von <= a.bis && m.bis >= a.von && !naeheArt(m, a));
    const art = naeheArt(du, a);
    if (!wegDann && art === "gleich") dazu("kommt", { ort: a.ziel, land: a.land, wer: a.wer[0], von: a.von < heute ? heute : a.von, bis: a.bis });
    else if (!wegDann && art === "nah") dazu("kommt-nah", { ort: a.ziel, ort2: du.ort, land: a.land, km: abstandOrte(du, a), wer: a.wer[0], von: a.von < heute ? heute : a.von, bis: a.bis });
  }
  // Du reist bald dorthin, wo jemand gerade ist (nur Reisen in den nächsten 14 Tagen und nur bei aktuellem Ort)
  for (const m of meine) {
    if (m.von > bald(14)) continue;
    for (const p of leute) if (p.id !== "du" && ortAktuell(p) && naeheArt(m, p) === "gleich") dazu("dort", { ort: m.ziel, land: m.land, wer: p.id, von: m.von, bis: m.bis });
  }
  return treffer.sort((a, b) => a.von.localeCompare(b.von));
}
// Monat und Jahr für die Überschrift: „März 2026“, „März – April 2026“, „Dezember 2026 – Januar 2027“
function monatSpanne(von, bis) {
  const a = datum(von), b = datum(bis), m = d => d.toLocaleDateString(LOC, { month: "long" }), j = d => d.getFullYear();
  if (j(a) !== j(b)) return `${m(a)} ${j(a)} – ${m(b)} ${j(b)}`;
  return a.getMonth() === b.getMonth() ? `${m(a)} ${j(a)}` : `${m(a)} – ${m(b)} ${j(a)}`;
}
// Alle Treffer nach demselben Muster:
// Überschrift „Symbol · Wer · Beziehung (Monat Jahr)“, darunter „Flagge · Zeitraum · wo genau“.
// Farbig mit 📍 = selber Ort, hell mit 🧭 = in der Nähe, 🌍 = nur im selben Land.
function trefferAufbauen() {
  const namen = ids => ids.map(person).filter(Boolean).map(p => p.name).join(" & ");
  document.getElementById("treffer-liste").innerHTML = trefferFinden().map(x => {
    const zeit = `${kurz(x.von)} – ${kurz(x.bis)}`, wer = ohneHtml(namen(x.wer)), ort = ohneHtml(x.ort || ""), ort2 = ohneHtml(x.ort2 || "");
    const beide = x.wer.length > 1 ? "ihr alle in {ort}" : "ihr beide in {ort}";
    const muster = {
      reise: () => ["📍", t("{namen} am selben Ort", { namen: wer }), t(beide, { ort }), false],
      nah: () => ["🧭", t("{namen} in der Nähe", { namen: wer }), t("du in {ort}, {namen} in {ort2} · {km}", { ort, namen: wer, ort2, km: km(x.km) }), true],
      land: () => ["🌍", t("{namen} im selben Land", { namen: wer }), t(x.wer.length > 1 ? "ihr alle in {ort}, wo genau ist noch offen" : "ihr beide in {ort}, wo genau ist noch offen", { ort }), true],
      kommt: () => ["📍", t("{namen} kommt zu dir", { namen: wer }), t(beide, { ort }), false],
      "kommt-nah": () => ["🧭", t("{namen} kommt in deine Nähe", { namen: wer }), t("du in {ort}, {namen} in {ort2} · {km}", { ort: ort2, namen: wer, ort2: ort, km: km(x.km) }), true],
      dort: () => ["📍", t("{namen} ist dort, wo du hinreist", { namen: wer }), t(beide, { ort }), false]
    };
    const [symbol, kopf, wo, leise] = (muster[x.art] || muster.dort)();
    return `<div class="kasten treffer${leise ? " leise" : ""}"><b>${symbol} ${kopf} <small class="treffer-wann">(${monatSpanne(x.von, x.bis)})</small></b><span>${x.land ? flagge(x.land) + " " : ""}${zeit} · ${wo}</span></div>`;
  }).join("");
}

// ---------- Feedback: Fehler, Ideen, Sonstiges an Sven ----------
async function feedbackSenden(knopf) {
  const text = document.getElementById("fb-text").value.trim();
  if (!text) return hinweis(t("Bitte kurz beschreiben, was dir aufgefallen ist"));
  if (!ECHT) { hinweis(t("Danke! Im Prototyp wird nichts gesendet")); return feedbackSchliessen(); }
  const art = (document.querySelector("#fb-arten .aktiv") || {}).dataset?.art || "fehler", datei = document.getElementById("fb-bild").files[0];
  beschaeftigt(knopf, true);
  try {
    let bild = null;
    if (datei) {
      const b = await createImageBitmap(datei), f = Math.min(1, 1600 / Math.max(b.width, b.height)), c = document.createElement("canvas");
      c.width = Math.round(b.width * f); c.height = Math.round(b.height * f); c.getContext("2d").drawImage(b, 0, 0, c.width, c.height);
      const blob = await new Promise(ok => c.toBlob(ok, "image/jpeg", 0.85));
      bild = `${ECHT_DATEN.uid}/${Date.now()}.jpg`;
      const r = await SB.storage.from("feedback").upload(bild, blob, { contentType: "image/jpeg" });
      if (r.error) throw r.error;
    }
    const geraet = `${stil} · ${SPRACHE} · ${VERSION} · ${navigator.userAgent.replace(/^Mozilla\/5\.0 /, "").slice(0, 120)}`;
    const { error } = await SB.from("feedback").insert({ art, text, bild, geraet });
    if (error) throw error;
    document.getElementById("fb-text").value = ""; document.getElementById("fb-bild").value = ""; document.getElementById("fb-bild-name").textContent = "";
    hinweis(t("Danke! Ist bei Sven angekommen")); feedbackSchliessen();
  } catch (e) { hinweis(t("Senden hat nicht geklappt")); }
  beschaeftigt(knopf, false);
}
document.getElementById("fb-senden").onclick = e => feedbackSenden(e.target);
document.getElementById("fb-bild").addEventListener("change", e => { document.getElementById("fb-bild-name").textContent = e.target.files[0] ? "📎 " + e.target.files[0].name : ""; });
const FB_ART = { fehler: "🐞", idee: "💡", sonstiges: "💬" };
async function feedbackListeAufbauen() {
  const box = document.getElementById("feedback-liste");
  const { data, error } = await SB.from("feedback").select("*").order("erledigt").order("erstellt_am", { ascending: false }).limit(100);
  if (error) { box.innerHTML = ""; return; }
  const pfade = data.filter(f => f.bild).map(f => f.bild), urls = {};
  if (pfade.length) { const r = await SB.storage.from("feedback").createSignedUrls(pfade, 3600); (r.data || []).forEach(d => { if (d.signedUrl) urls[d.path] = d.signedUrl; }); }
  const name = id => ((mitgliederDaten.find(m => m.id === id) || {}).name) || "?";
  box.innerHTML = data.length ? data.map(f => `<div class="kasten fb-eintrag${f.erledigt ? " erledigt" : ""}"><div class="fb-kopf"><span>${FB_ART[f.art] || "💬"} ${ohneHtml(name(f.von))}</span><span>${new Date(f.erstellt_am).toLocaleString(LOC, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div><p>${ohneHtml(f.text)}</p><div class="fb-fuss">${urls[f.bild] ? `<a class="knopf-leise" href="${urls[f.bild]}" target="_blank" rel="noopener">📎 ${t("Screenshot")}</a>` : ""}<button class="knopf-leise" data-fb="${f.id}" data-ok="${f.erledigt ? 0 : 1}">${f.erledigt ? t("Wieder öffnen") : "✓ " + t("Erledigt")}</button></div></div>`).join("") : `<p class="hinweis-band" style="margin:4px 0">${t("Noch kein Feedback")}</p>`;
  box.querySelectorAll("[data-fb]").forEach(b => b.onclick = async () => {
    b.disabled = true;
    const { error } = await SB.from("feedback").update({ erledigt: b.dataset.ok === "1" }).eq("id", b.dataset.fb);
    if (error) { b.disabled = false; return hinweis(t("Das hat nicht geklappt")); }
    feedbackListeAufbauen(); verwaltungLaden().catch(() => {});
  });
}

// ---------- Neu dabei: kurzer Hinweis, wenn ein Nomade dazugekommen ist ----------
function neuDabeiPruefen() {
  if (!ECHT || familieModus) return;
  const jetzt = (ECHT_DATEN.alle || []).filter(p => p.id !== "du").map(p => p.uid);
  let bekannt = null; try { bekannt = JSON.parse(localStorage.getItem("ahoi-bekannt") || "null"); } catch (e) {}
  try { localStorage.setItem("ahoi-bekannt", JSON.stringify(jetzt)); } catch (e) {}
  if (!Array.isArray(bekannt)) return; // erstes Mal: nur merken
  const neu = (ECHT_DATEN.alle || []).filter(p => p.id !== "du" && !bekannt.includes(p.uid));
  if (neu.length) neuBannerZeigen(neu);
}
function neuBannerZeigen(neu) {
  const b = document.getElementById("neu-banner");
  b.textContent = "👋 " + t("Neu dabei: {namen}", { namen: neu.map(p => p.name).join(", ") });
  b.hidden = false;
  b.onclick = () => { b.hidden = true; const p = leute.find(x => x.id === neu[0].id); if (p) { zuPerson(p); infoZeigen([p]); } };
  clearTimeout(neuBannerZeigen.uhr); neuBannerZeigen.uhr = setTimeout(() => b.hidden = true, 7000);
}
if (!ECHT) { let gezeigt = null; try { gezeigt = localStorage.getItem("ahoi-proto-neu"); localStorage.setItem("ahoi-proto-neu", "1"); } catch (e) {} if (!gezeigt) setTimeout(() => neuBannerZeigen([leute.find(p => p.id === "mia")]), 6000); }

// ---------- Echte App: Profil, Ort, Einladen, Verwaltung ----------
const BALD = {};
function fragen(titel, knoepfe) {
  const blatt = document.getElementById("aktion-blatt");
  document.getElementById("aktion-abbrechen").style.display = "";
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
// ---------- Echte App: Chat (Alle, Gruppen, Einzelchats) mit Supabase Realtime ----------
// Gelesen-Stand und „nur bei mir gelöscht“ merkt sich das Gerät; neue Nachrichten kommen sofort über Realtime.
const CHAT_SPEICHER = "ahoi-chat";
let chatStand = { gelesen: {}, weg: {} };
try { chatStand = Object.assign(chatStand, JSON.parse(localStorage.getItem(CHAT_SPEICHER) || "{}")); } catch (e) {}
const chatStandSpeichern = () => { try { localStorage.setItem(CHAT_SPEICHER, JSON.stringify(chatStand)); } catch (e) {} };
function nachrichtAusDb(x) {
  const von = x.von ? idVon(x.von) : null;
  if (x.system) { const name = von === "du" ? t("Du") : personOder(von).name; return { id: x.id, von, system: `<b>${ohneHtml(name)}</b> ${t(x.text === "erstellt" ? (von === "du" ? "hast die Gruppe erstellt" : "hat die Gruppe erstellt") : (von === "du" ? "hast die Gruppe verlassen" : "hat die Gruppe verlassen"))}` }; }
  return { id: x.id, von, text: x.text, am: x.am, foto: x.foto || null };
}
// Chat-Fotos: privat gespeichert, angezeigt über zeitlich begrenzte Links (24 Std., beim Neuladen erneuert)
const fotoLinks = {};
async function fotoLinksHolen(pfade) {
  const fehlen = [...new Set(pfade.filter(p => p && !fotoLinks[p]))];
  if (!fehlen.length) return;
  const { data } = await SB.storage.from("chatfotos").createSignedUrls(fehlen, 86400);
  (data || []).forEach(d => { if (d.signedUrl) fotoLinks[d.path] = d.signedUrl; });
}
async function chatFotoSenden(datei) {
  const c = aktuellerChat; if (!c || !datei) return;
  const knopf = document.getElementById("chat-foto"), feld = document.getElementById("chat-text"), text = feld.value.trim();
  beschaeftigt(knopf, true);
  try {
    const b = await createImageBitmap(datei).catch(() => new Promise((ok, nein) => { const i = new Image(); i.onload = () => ok(i); i.onerror = nein; i.src = URL.createObjectURL(datei); }));
    const f = Math.min(1, 1600 / Math.max(b.width, b.height)), cv = document.createElement("canvas");
    cv.width = Math.round(b.width * f); cv.height = Math.round(b.height * f); cv.getContext("2d").drawImage(b, 0, 0, cv.width, cv.height);
    const blob = await new Promise(ok => cv.toBlob(ok, "image/jpeg", 0.8));
    const pfad = `${c.id}/${crypto.randomUUID()}.jpg`;
    const hoch = await SB.storage.from("chatfotos").upload(pfad, blob, { contentType: "image/jpeg" });
    if (hoch.error) throw hoch.error;
    fotoLinks[pfad] = URL.createObjectURL(blob); // eigenes Foto sofort zeigen
    const { data, error } = await SB.from("nachricht").insert({ chat: c.id, text, foto: pfad, sprache: SPRACHE }).select("id, chat, von, text, system, am, foto").single();
    if (error) { SB.storage.from("chatfotos").remove([pfad]).catch(() => {}); throw error; }
    if (text) feld.value = "";
    nachrichtDazu(data);
  } catch (e) { hinweis(t("Foto senden hat nicht geklappt")); }
  beschaeftigt(knopf, false);
}
function chatGelesen(c) {
  c.ungelesen = 0;
  const letzte = c.nachrichten[c.nachrichten.length - 1];
  if (letzte && letzte.id) { chatStand.gelesen[c.id] = letzte.id; chatStandSpeichern(); }
  chatPunkt();
}
function chatAusblenden(c) { const letzte = c.nachrichten[c.nachrichten.length - 1]; chatStand.weg[c.id] = letzte ? letzte.id || 0 : 0; chatStandSpeichern(); }
let chatsGeladen = false;
async function chatsLaden() {
  if (!ECHT || familieModus || ECHT_DATEN.profil.art === "familie") return;
  const [k, m, n] = await Promise.all([
    SB.from("chat").select("id, art, name, emoji, erstellt_am"), SB.from("chat_mitglied").select("chat, person"),
    SB.from("nachricht").select("id, chat, von, text, system, am, foto").order("id", { ascending: false }).limit(800)
  ]);
  if (k.error || m.error || n.error) return;
  await fotoLinksHolen(n.data.map(x => x.foto)).catch(() => {});
  const st = await SB.from("chat_stumm").select("chat");
  const stumm = new Set(st.error ? [] : st.data.map(x => x.chat));
  const neu = k.data.map(x => {
    const mit = m.data.filter(y => y.chat === x.id).map(y => idVon(y.person));
    const nachrichten = n.data.filter(y => y.chat === x.id).reverse().map(nachrichtAusDb);
    const gelesen = chatStand.gelesen[x.id] || 0;
    return { id: x.id, art: x.art, name: x.art === "alle" ? t("Alle") : x.name, emoji: x.emoji, stumm: stumm.has(x.id), mitglieder: mit, mit: x.art === "einzel" ? mit.find(id => id !== "du") : null, nachrichten, erstellt: x.erstellt_am,
      ungelesen: nachrichten.filter(y => y.id > gelesen && y.von !== "du" && !y.system).length };
  }).filter(c => !(c.art === "einzel" && c.id in chatStand.weg && !c.nachrichten.some(y => y.id > chatStand.weg[c.id])));
  // Reihenfolge: „Alle“ zuerst, dann nach letzter Nachricht
  const zuletzt = c => { const l = c.nachrichten[c.nachrichten.length - 1]; return l ? l.id : 0; };
  neu.sort((a, b) => (a.art === "alle" ? -1 : b.art === "alle" ? 1 : zuletzt(b) - zuletzt(a)));
  if (!chatsGeladen) neu.forEach(c => { if (c.art === "alle" && !(c.id in chatStand.gelesen)) { c.ungelesen = Math.min(c.ungelesen, 3); } });
  chats.splice(0, chats.length, ...neu);
  if (aktuellerChat) aktuellerChat = chats.find(c => c.id === aktuellerChat.id) || null;
  chatsGeladen = true;
  if (document.getElementById("seite-chat").classList.contains("offen")) chatListeAufbauen(); else chatPunkt();
  if (aktuellerChat && document.getElementById("seite-unterhaltung").classList.contains("offen")) { chatAufbauen(); chatGelesen(aktuellerChat); }
}
async function nachrichtDazu(x) {
  const c = chats.find(y => y.id === x.chat);
  if (!c) return chatsLaden();
  if (c.nachrichten.some(y => y.id === x.id)) return;
  if (x.foto) { await fotoLinksHolen([x.foto]).catch(() => {}); if (c.nachrichten.some(y => y.id === x.id)) return; }
  c.nachrichten.push(nachrichtAusDb(x));
  if (c.art === "einzel") delete chatStand.weg[c.id];
  const offen = aktuellerChat === c && document.getElementById("seite-unterhaltung").classList.contains("offen") && document.visibilityState === "visible";
  if (offen) { chatAufbauen(); chatGelesen(c); }
  else if (idVon(x.von) !== "du" && !x.system) c.ungelesen = (c.ungelesen || 0) + 1;
  chats.sort((a, b) => (a.art === "alle" ? -1 : b.art === "alle" ? 1 : (b.nachrichten.at(-1)?.id || 0) - (a.nachrichten.at(-1)?.id || 0)));
  if (document.getElementById("seite-chat").classList.contains("offen")) chatListeAufbauen(); else chatPunkt();
}
let chatKanal = null;
function chatVerbinden() {
  if (chatKanal) return;
  chatKanal = SB.channel("nachrichten").on("postgres_changes", { event: "INSERT", schema: "public", table: "nachricht" }, e => nachrichtDazu(e.new)).subscribe();
}
async function chatSendenEcht(feld, text) {
  const c = aktuellerChat; feld.value = "";
  const { data, error } = await SB.from("nachricht").insert({ chat: c.id, text, sprache: SPRACHE }).select("id, chat, von, text, system, am, foto").single();
  if (error) { feld.value = text; return hinweis(t("Senden hat nicht geklappt")); }
  nachrichtDazu(data);
}
async function einzelChatEcht(id) {
  const p = person(id); if (!p || !p.uid) return;
  const { data, error } = await SB.rpc("einzelchat", { ziel: p.uid });
  if (error) return hinweis(t("Das hat nicht geklappt"));
  delete chatStand.weg[data]; chatStandSpeichern();
  await chatsLaden();
  let c = chats.find(x => x.id === data);
  if (!c) { c = { id: data, art: "einzel", mit: id, mitglieder: ["du", id], nachrichten: [] }; chats.splice(1, 0, c); }
  gespraechOeffnen(c);
}
async function gruppeErstellenEcht(name, ids, emoji) {
  const { data, error } = await SB.rpc("gruppe_erstellen", { name, leute: ids.map(id => person(id)?.uid).filter(Boolean), emoji: emoji || null });
  if (error) return hinweis(t("Das hat nicht geklappt"));
  await chatsLaden();
  const c = chats.find(x => x.id === data); if (c) gespraechOeffnen(c); else seiteZeigen("chat");
}
async function chatVerlassenEcht(c) {
  const { error } = await SB.rpc("chat_verlassen", { c: c.id });
  if (error) return hinweis(t("Das hat nicht geklappt"));
  hinweis(t("Du hast die Gruppe verlassen")); await chatsLaden(); seiteZeigen("chat");
}

// ---------- Push-Mitteilungen (echte App) ----------
// Funktioniert auf dem iPhone nur, wenn Ahoi auf dem Home-Bildschirm liegt (ab iOS 16.4). Die Schlüssel kommen vom Server.
// abo = dieses Gerät ist angemeldet; chat / ort = was man bekommen möchte (gilt für alle Geräte)
// abo = dieses Gerät bekommt Push; wahl = was man bekommen möchte (gilt für alle Geräte, steht im Profil)
const PUSH = { abo: false, neu: false, geht: "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
  wahl: { push_chat: true, push_chat_art: "gruppen", push_ort: true, push_wunsch_neu: false, push_wunsch_dabei: true, push_wunsch_update: true, push_naehe: true, push_treffer: true, push_reise: false, push_leute: true, push_ruhe: true } };
Object.defineProperty(PUSH, "an", { get: () => PUSH.abo && (PUSH.neu ? PUSH.wahl.push_chat_art !== "aus" : PUSH.wahl.push_chat) }); // für die Glocke im Chat
// Auswahl (Entscheidung vom 24.11.2026); die neuen Schalter erscheinen, sobald die Datenbank sie kennt (SQL 16)
const PUSH_GRUPPEN = [
  ["🏡", "Wishlist", [["push_wunsch_neu", "Neuer Eintrag"], ["push_wunsch_dabei", "Jemand ist bei meinem Eintrag dabei"], ["push_wunsch_update", "Gebucht oder neuer Preis"]]],
  ["📍", "Orte und Reisen", [["push_naehe", "Ein Freund ist in deiner Nähe", "unter 50 km"], ["push_treffer", "Neuer Treffer", "gleiche Zeit, gleicher Ort"], ["push_reise", "Ein Freund trägt eine Reise ein"], ["push_ort", "Nachfrage zu deinem Ort", "höchstens einmal im Monat"]]],
  ["🤝", "Freunde", [["push_leute", "Neue Leute und Anfragen"]]],
  ["🌙", "Ruhezeit", [["push_ruhe", "Nachts still (22–8 Uhr)", "was nachts kommt, siehst du morgens"]]]
];
const alsApp = () => window.navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
const istIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const b64 = s => { const p = "=".repeat((4 - (s.length % 4)) % 4), roh = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...roh].map(c => c.charCodeAt(0))); };
const abwarten = (v, ms) => Promise.race([v, new Promise((_, nein) => setTimeout(() => nein(new Error("Zeit")), ms))]);
async function aboSpeichern(sub) {
  const k = sub.toJSON().keys;
  return SB.from("push_abo").upsert({ endpunkt: sub.endpoint, p256dh: k.p256dh, auth: k.auth, geraet: navigator.userAgent.slice(0, 120) });
}
async function pushPruefen() {
  if (!ECHT || !PUSH.geht) return pushAnzeigen();
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    PUSH.abo = !!sub && Notification.permission === "granted";
    if (sub) await aboSpeichern(sub);
  } catch (e) {}
  pushAnzeigen();
}
function pushAnzeigen() {
  const geraet = !PUSH.geht ? (istIphone() && !alsApp() ? t("Erst Ahoi zum Home-Bildschirm hinzufügen") : t("Auf diesem Gerät nicht möglich")) : typeof Notification !== "undefined" && Notification.permission === "denied" ? t("In den Einstellungen des Handys blockiert") : null;
  const sch = document.getElementById("push-schalter");
  sch.classList.toggle("an", PUSH.abo); sch.setAttribute("aria-pressed", PUSH.abo ? "true" : "false");
  document.getElementById("push-zustand").textContent = geraet || (PUSH.abo ? t("Eingeschaltet. Wähle unten, was du bekommen möchtest.") : t("Aus"));
  const box = document.getElementById("push-wahl"), w = PUSH.wahl;
  box.classList.toggle("aus", !PUSH.abo);
  const schalter = ([k, name, unter]) => `<div class="zeile-einst"><div>${t(name)}${unter ? `<small>${t(unter)}</small>` : ""}</div><button class="schalter${w[k] ? " an" : ""}" data-push="${k}" aria-pressed="${w[k] ? "true" : "false"}" aria-label="${t(name)}"></button></div>`;
  const chat = PUSH.neu
    ? `<div class="segmente klein" id="chat-wahl">${[["aus", "Aus"], ["gruppen", "Einzel und Gruppen"], ["alle", "Alle Chats"]].map(([a, n]) => `<button data-chat="${a}" class="${w.push_chat_art === a ? "aktiv" : ""}">${t(n)}</button>`).join("")}</div>`
    : schalter(["push_chat", "Neue Chat-Nachrichten"]);
  box.innerHTML = `<div class="push-gruppe">💬 ${t("Chat")}</div>${chat}<p class="hinweis-band" style="margin:4px 0 0;text-align:left">${t("Einzelne Chats schaltest du im Chat mit der Glocke 🔔 stumm.")}</p>` +
    (PUSH.neu ? PUSH_GRUPPEN : [["📍", "Orte und Reisen", [["push_ort", "Nachfrage zu deinem Ort", "höchstens einmal im Monat"]]]]).map(([sym, titel, liste]) => `<div class="push-gruppe">${sym} ${t(titel)}</div>${liste.map(schalter).join("")}`).join("");
  box.querySelectorAll("[data-push]").forEach(b => b.onclick = () => pushWahlSetzen({ [b.dataset.push]: !w[b.dataset.push] }));
  box.querySelectorAll("[data-chat]").forEach(b => b.onclick = () => pushWahlSetzen({ push_chat_art: b.dataset.chat, push_chat: b.dataset.chat !== "aus" }));
  glockeSetzen();
}
// Gerät für Push anmelden (fragt einmal nach der Erlaubnis); true, wenn es geklappt hat
async function pushAbo() {
  if (!ECHT) { hinweis(t("Im Prototyp gibt es keine Push-Mitteilungen")); return false; }
  if (!PUSH.geht) { hinweis(istIphone() && !alsApp() ? t("Auf dem iPhone: Ahoi über Teilen → „Zum Home-Bildschirm“ hinzufügen und von dort öffnen") : t("Dieses Gerät kann keine Push-Mitteilungen")); return false; }
  if (PUSH.abo) return true;
  try {
    const erlaubt = await Notification.requestPermission();
    if (erlaubt !== "granted") { pushAnzeigen(); hinweis(t("Mitteilungen sind am Handy nicht erlaubt")); return false; }
    let { data: schluessel } = await SB.rpc("push_schluessel_oeffentlich");
    if (!schluessel) { await fetch(SB_URL + "/functions/v1/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {}); ({ data: schluessel } = await SB.rpc("push_schluessel_oeffentlich")); }
    if (!schluessel) { hinweis(t("Push ist gerade nicht erreichbar")); return false; }
    await swAnmelden();
    const reg = await abwarten(navigator.serviceWorker.ready, 10000);
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(schluessel) });
    const a = await aboSpeichern(sub);
    if (a.error) throw a.error;
    PUSH.abo = true; return true;
  } catch (e) { hinweis(t("Push hat nicht geklappt")); pushAnzeigen(); return false; }
}
async function pushWahlSetzen(neu) {
  if (!ECHT) { Object.assign(PUSH.wahl, neu); return pushAnzeigen(); }
  const { error } = await SB.from("profile").update(neu).eq("id", ECHT_DATEN.uid);
  if (error) return hinweis(t("Speichern hat nicht geklappt"));
  Object.assign(PUSH.wahl, neu); pushAnzeigen();
}
// Gerät abmelden: keine Push-Mitteilungen mehr auf diesem Handy (die Auswahl bleibt für andere Geräte)
async function pushAbmelden() {
  try {
    const reg = await navigator.serviceWorker.getRegistration(), sub = reg && await reg.pushManager.getSubscription();
    if (sub) { await SB.from("push_abo").delete().eq("endpunkt", sub.endpoint); await sub.unsubscribe(); }
  } catch (e) {}
  PUSH.abo = false; pushAnzeigen(); hinweis(t("🔕 Keine Push-Mitteilungen mehr auf diesem Gerät"));
}
// Für die Glocke im Chat: Push einschalten (Gerät anmelden und Chat-Mitteilungen an)
async function pushEinschalten() {
  if (!(await pushAbo())) return;
  pushAnzeigen();
  if (!PUSH.an) await pushWahlSetzen(PUSH.neu ? { push_chat_art: "gruppen", push_chat: true } : { push_chat: true });
  hinweis(t("🔔 Push ist an: neue Nachrichten kommen aufs Handy"));
}
document.getElementById("push-schalter").onclick = async () => {
  if (PUSH.abo) return pushAbmelden();
  if (await pushAbo()) { pushAnzeigen(); hinweis(t("🔔 Push ist an. Wähle unten, was du bekommen möchtest.")); }
};
// Aus einer Mitteilung geöffnet: Chat oder Ort-Frage direkt zeigen
function pushZiel(url) {
  const q = new URL(url, location.href).searchParams;
  if (q.get("chat")) { const c = chats.find(x => x.id === q.get("chat")); if (c) gespraechOeffnen(c); else chatsLaden().then(() => { const c2 = chats.find(x => x.id === q.get("chat")); if (c2) gespraechOeffnen(c2); }); }
  if (q.get("ort") === "frage") ortNachfragen(true);
  if (q.get("rundruf")) try { localStorage.setItem("ahoi-rundruf", Math.max(+q.get("rundruf"), +localStorage.getItem("ahoi-rundruf") || 0)); } catch (e) {}
}
if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", e => { if (e.data && e.data.ziel) pushZiel(e.data.ziel); });

// ---------- Ort-Nachfrage beim Öffnen ----------
// 1. Sagt der Reiseplan, dass du heute woanders bist: „Laut deinem Reiseplan bist du jetzt in Košice. Stimmt das?“
// 2. Sonst, wenn der Ort seit 30 Tagen nicht neu war: „Bist du noch in Águilas?“ (je Ort höchstens einmal am Tag)
async function ortNachfragen(sofort) {
  if (!ECHT || familieModus || ECHT_DATEN.profil.geist) return;
  if (document.getElementById("aktion-blatt").classList.contains("offen")) return setTimeout(() => ortNachfragen(sofort), 1500);
  const du = ich(), heute = new Date().toISOString().slice(0, 10);
  let gefragt = {}; try { gefragt = JSON.parse(localStorage.getItem("ahoi-ortfrage") || "{}"); } catch (e) {}
  const merken = k => { gefragt[k] = heute; try { localStorage.setItem("ahoi-ortfrage", JSON.stringify(gefragt)); } catch (e) {} };
  const reise = reisen.find(r => r.wer[0] === "du" && r.von && r.von <= heute && r.bis >= heute);
  const woanders = reise && (reise.lat == null ? reise.land !== du.land : du.lat == null || entfernungKm(du.lat, du.lon, reise.lat, reise.lon) > GLEICH_KM);
  const zumOrt = () => { seiteZeigen("profil"); setTimeout(async () => { const k = document.getElementById("ort-gps"); k.scrollIntoView({ behavior: ruhig ? "auto" : "smooth", block: "center" }); beschaeftigt(k, true); const ok = await ortPerGps(); beschaeftigt(k, false); if (!ok) document.getElementById("ort-suche").focus(); }, 350); };
  const bestaetigen = async () => { const { error } = await SB.rpc("ort_bestaetigen"); if (!error) { du.stand = new Date().toISOString(); hinweis(t("Danke! Ort bestätigt")); listeAufbauen(); } };
  if (woanders) {
    const k = "reise|" + reise.ziel + "|" + reise.von;
    if (!sofort && gefragt[k] === heute) return nachbarnFragen();
    merken(k);
    return fragen(t("Laut deinem Reiseplan bist du jetzt in {ort}. Stimmt das?", { ort: reise.ziel }), [
      [reise.lat != null ? t("Ja, ich bin in {ort}", { ort: reise.ziel }) : t("Ja, Ort aktualisieren"), () => reise.lat != null ? neuerOrt({ ort: reise.ziel, land: reise.land, lat: reise.lat, lon: reise.lon }) : zumOrt()],
      ...(du.ort ? [[t("Nein, noch in {ort}", { ort: du.ort }), bestaetigen]] : []),
      [t("Ich bin woanders"), zumOrt]
    ]);
  }
  if (du.ort && (sofort || ortAlterTage(du) >= 30)) {
    const k = "noch|" + du.ort;
    if (!sofort && gefragt[k] === heute) return nachbarnFragen();
    merken(k);
    return fragen(t("Bist du noch in {ort}?", { ort: du.ort }), [[t("Ja, noch hier"), bestaetigen], [t("Nein, ich bin weitergezogen"), zumOrt]]);
  }
  nachbarnFragen();
}

// ---------- Neu in Ahoi: nach jedem App-Update einmal eine kurze Übersicht ----------
// Bei jedem Update oben einen Eintrag ergänzen (neueste zuerst). Wer neu dabei ist, sieht nur den neuesten.
const NEUIGKEITEN = [
  { id: "2026-11-24-freunde-push", punkte: [
    "🤝 Neu im Profil: dein Ahoi-Code. Zeig ihn Leuten, die du unterwegs triffst, oder scanne ihren Code.",
    "💡 „Kennst du sie?“ schlägt Freunde deiner Freunde vor.",
    "🔔 Unter Profil → Mitteilungen wählst du selbst, wofür du Push bekommst, mit Ruhezeit nachts."
  ] },
  { id: "2026-11-24-gesamtpreis", punkte: [
    "💶 Wishlist: Du trägst den Gesamtpreis ein, so wie Airbnb ihn bei deinen Daten zeigt. Ahoi teilt ihn durch alle, die dabei sind.",
    "✨ Oben ist nichts mehr milchig."
  ] },
  { id: "2026-11-24-feinschliff", punkte: [
    "🛏 Die Wishlist zeigt Schlafzimmer, Betten und wie viele Gäste reinpassen.",
    "📋 „Link einfügen“ klappt jetzt mit Airbnb-Links.",
    "✨ Oben ist mehr Abstand zur Statusleiste, nichts wirkt mehr verschwommen."
  ] },
  { id: "2026-11-24-wishlist", punkte: [
    "💛 Die Wishlist ist da: Unterkünfte teilen und sehen, wer dabei wäre.",
    "🔗 Im Profil kannst du Instagram, TikTok & Co. und deine Webseite eintragen.",
    "🏡 Familie einladen hat einen eigenen Knopf mit kurzer Erklärung."
  ] },
  { id: "2026-11-24-fotos", punkte: [
    "📷 Fotos im Chat: Kamera-Knopf neben dem Textfeld.",
    "🧭 Treffer zeigen Monat, Jahr und Länderflagge.",
    "👈 Vom linken Rand nach rechts wischen geht einen Schritt zurück.",
    "📍 Dein Ort kommt jetzt nur noch über „Aktualisieren“.",
    "💛 Aus „Ideen“ wird die Wishlist."
  ] },
  { id: "2026-11-24-push2", punkte: [
    "🔔 Push lässt sich jetzt einschalten: Profil → Mitteilungen → „Neue Chat-Nachrichten“.",
    "📍 Die Nachfrage zu deinem Ort hat einen eigenen Schalter."
  ] },
  { id: "2026-11-24-push", punkte: [
    "🔔 Push für neue Nachrichten: einschalten unter Profil → Mitteilungen oder mit der Glocke im Chat.",
    "💬 Chats zeigen das Profilbild. Nach links wischen löscht einen Chat, Gruppen bekommen ein eigenes Emoji.",
    "☕ Status mit einem Tipp setzen. Er gilt 24 Stunden.",
    "📍 Sagt dein Reiseplan, dass du woanders bist, fragt Ahoi kurz nach."
  ] },
  { id: "2026-11-23-treffer", punkte: [
    "🧭 Treffer stimmen genauer: „gleichzeitig dort“ heißt jetzt dieselbe Stadt. Ist jemand nur in der Nähe, steht sein Ort mit Entfernung dabei.",
    "🏙️ Ortsnamen wie vor Ort: Prešov statt „Eperies“, Košice statt „Kaschau“.",
    "📡 Mission: Der Radar dreht sich immer um deinen Ort, auch beim Verschieben der Karte."
  ] },
  { id: "2026-11-23-chat", punkte: [
    "💬 Der Chat ist da: ein gemeinsamer Chat für alle, eigene Gruppen und Einzelchats. Nachrichten kommen sofort an.",
    "🪪 Im Steckbrief und auf der Karte: „Nachricht“ öffnet direkt den Chat mit der Person.",
    "🚩 Pionier: Ab jetzt merkt sich Ahoi, wer aus dem Freundeskreis als Erster in einem Land war."
  ] },
  { id: "2026-11-23-gruppen", punkte: [
    "👥 Reist ihr zusammen? Sind Freunde in deiner Nähe, fragt Ahoi kurz nach. Paare stehen mit ❤️ zusammen.",
    "🪪 Steckbrief: Tipp in „Wer ist wo?“ auf einen Namen und sieh Länder, nächste Reise und Ortszeit.",
    "🕐 Der Zeitunterschied zu jedem Freund steht jetzt direkt dabei.",
    "🌍 Länder zählen wie bei der UN: 195 Staaten, Überseegebiete gehören zum Mutterland.",
    "✈️ Reiseziele: auch Tokio, Kuala Lumpur und ganze Länder wie „Malaysia“."
  ] }
];
function neuigkeitenZeigen() {
  if (familieModus) return;
  const blatt = document.getElementById("aktion-blatt");
  if (blatt.classList.contains("offen")) return setTimeout(neuigkeitenZeigen, 1500);
  let gesehen = null; try { gesehen = localStorage.getItem("ahoi-neuigkeiten"); } catch (e) {}
  const bis = NEUIGKEITEN.findIndex(n => n.id === gesehen);
  const neu = bis === -1 ? NEUIGKEITEN.slice(0, 1) : NEUIGKEITEN.slice(0, bis);
  if (!neu.length) return;
  const merken = () => { try { localStorage.setItem("ahoi-neuigkeiten", NEUIGKEITEN[0].id); } catch (e) {} };
  document.getElementById("aktion-titel").textContent = t("✨ Neu in Ahoi");
  const box = document.getElementById("aktion-knoepfe");
  box.innerHTML = `<ul class="neu-liste">${neu.flatMap(n => n.punkte).slice(0, 6).map(x => `<li>${t(x)}</li>`).join("")}</ul>`;
  const los = document.createElement("button"); los.className = "knopf-gross"; los.textContent = t("Los geht's");
  los.onclick = () => { merken(); blatt.classList.remove("offen"); };
  box.appendChild(los);
  document.getElementById("aktion-abbrechen").style.display = "none";
  blatt.classList.add("offen");
  merken();
}
setTimeout(neuigkeitenZeigen, ECHT ? 2200 : 2000);

// ---------- Echte App: Paare, Reisegruppen, Länder und offene Anfragen aus der Datenbank ----------
const ANFRAGEN = { paarRein: [], mitreiseRein: [], mitreiseRaus: [] };
const idVon = uid => uid === ECHT_DATEN.uid ? "du" : uid;
let ersteVerbindungen = true;
async function verbindungenLaden() {
  if (!ECHT || familieModus || ECHT_DATEN.profil.art === "familie") return;
  const uid = ECHT_DATEN.uid;
  const [lae, paare, mitgl, anfr, pio] = await Promise.all([
    SB.from("profile").select("id, laender, status_am, push_chat, push_ort, links"), SB.from("paar").select("von, an, bestaetigt"),
    SB.from("reisegruppe_mitglied").select("person, gruppe"), SB.from("mitreise_anfrage").select("von, an"), SB.rpc("pioniere")
  ]);
  // Pionier: wer aus dem Freundeskreis als Erster in einem Land war (seit Beginn des Orte-Verlaufs)
  if (!pio.error && Array.isArray(pio.data)) {
    PIONIERE_ALLE = Object.fromEntries(pio.data.map(x => [x.land, x.person]));
    PIONIER = pio.data.filter(x => x.person === uid).map(x => x.land);
  }
  // Länder: eigene Liste aus der Datenbank; ist sie dort noch leer, die vom Gerät hochladen
  if (!lae.error) {
    const proId = Object.fromEntries(lae.data.map(x => [x.id, (x.laender || []).map(staatVon).filter(Boolean)]));
    [...leute, ...(ECHT_DATEN.alle || [])].forEach(p => { const l = proId[p.uid]; if (l && p.id !== "du") { p.laenderListe = l; p.laender = l.filter(cc => STAATEN.has(cc)).length; } });
    const linksVon = Object.fromEntries(lae.data.map(x => [x.id, x.links || {}]));
    [...leute, ...(ECHT_DATEN.alle || [])].forEach(p => { if (p.uid && linksVon[p.uid]) p.links = linksVon[p.uid]; });
    if (linksVon[uid]) { meineLinks = linksVon[uid]; linksWertZeigen(); }
    const ichRoh = lae.data.find(x => x.id === uid);
    if (ichRoh) {
      ECHT_DATEN.profil.status_am = ichRoh.status_am; PUSH.wahl.push_chat = ichRoh.push_chat !== false; PUSH.wahl.push_ort = ichRoh.push_ort !== false;
      const r = await SB.from("profile").select("push_chat_art, push_wunsch_neu, push_wunsch_dabei, push_wunsch_update, push_naehe, push_treffer, push_reise, push_leute, push_ruhe").eq("id", uid).maybeSingle();
      PUSH.neu = !r.error && !!r.data; if (PUSH.neu) Object.assign(PUSH.wahl, r.data);
      pushAnzeigen(); statusAufbauen();
    }
    const meine = proId[uid] || [];
    if (!meine.length && besucht.length) besuchtSpeichern();
    else if (meine.length) { besucht = [...new Set(meine)]; try { localStorage.setItem(LAENDER_SCHLUESSEL, JSON.stringify(besucht)); } catch (e) {} if (ich().land && landDazu(ich().land)) {} stempelAufbauen(); }
  }
  // Paare: bestätigte bekommen eine gemeinsame Kennung, offene Anfragen an mich werden gefragt
  if (!paare.error) {
    leute.forEach(p => delete p.paar); paarAnfrage = null; ANFRAGEN.paarRein = [];
    for (const x of paare.data) {
      const a = person(idVon(x.von)), b = person(idVon(x.an));
      if (x.bestaetigt) { const k = "p-" + [x.von, x.an].sort().join("-"); if (a) a.paar = k; if (b) b.paar = k; }
      else if (x.von === uid) paarAnfrage = idVon(x.an);
      else if (x.an === uid) ANFRAGEN.paarRein.push(idVon(x.von));
    }
    paarWertZeigen();
  }
  // Reisegruppen
  if (!mitgl.error) {
    const nachGruppe = {};
    mitgl.data.forEach(x => (nachGruppe[x.gruppe] = nachGruppe[x.gruppe] || []).push(idVon(x.person)));
    reisegruppen = Object.entries(nachGruppe).map(([id, ids]) => ({ id, leute: ids })).filter(g => g.leute.length > 1);
  }
  if (!anfr.error) {
    ANFRAGEN.mitreiseRaus = anfr.data.filter(x => x.von === uid).map(x => idVon(x.an));
    ANFRAGEN.mitreiseRein = anfr.data.filter(x => x.an === uid).map(x => idVon(x.von));
  }
  pinsSetzen(); listeAufbauen();
  if (ersteVerbindungen) { ersteVerbindungen = false; setTimeout(anfragenBeantworten, 2800); }
  else anfragenBeantworten();
}
// Offene Anfragen an mich: der Reihe nach fragen (je Sitzung einmal)
const schonGefragt = new Set();
function anfragenBeantworten() {
  if (document.getElementById("aktion-blatt").classList.contains("offen")) return setTimeout(anfragenBeantworten, 1500);
  const pid = ANFRAGEN.paarRein.find(id => !schonGefragt.has("p" + id) && person(id));
  if (pid) {
    const p = person(pid); schonGefragt.add("p" + pid);
    return fragen(t("{name} möchte euch als Paar verknüpfen. Seid ihr ein Paar?", { name: p.name }), [
      [t("Ja, wir sind ein Paar ❤️"), () => anfrageAntworten("paar_antworten", pid, true)],
      [t("Nein"), () => anfrageAntworten("paar_antworten", pid, false)]]);
  }
  const mid = ANFRAGEN.mitreiseRein.find(id => !schonGefragt.has("m" + id) && person(id));
  if (mid) {
    const p = person(mid); schonGefragt.add("m" + mid);
    return fragen(t("{name} sagt, ihr reist gerade zusammen. Stimmt das?", { name: p.name }), [
      [t("Ja, wir reisen zusammen"), () => anfrageAntworten("mitreisen_antworten", mid, true)],
      [t("Nein, nur am selben Ort"), () => anfrageAntworten("mitreisen_antworten", mid, false)]]);
  }
  if (!ortGefragt) { ortGefragt = true; return ortNachfragen(); }
  nachbarnFragen();
}
let ortGefragt = false;
async function anfrageAntworten(fn, id, ja) {
  const { data, error } = await SB.rpc(fn, { ziel: person(id).uid, ja });
  if (error) return hinweis(t("Das hat nicht geklappt"));
  if (ja && data === "vergeben") hinweis(t("Einer von euch ist schon mit jemandem verknüpft"));
  else if (ja && fn === "paar_antworten") hinweis(t("{name} und du seid jetzt ein Paar ❤️", { name: person(id).name }));
  else if (ja) hinweis(t("Ihr reist jetzt zusammen 👥"));
  await verbindungenLaden();
}
async function paarEchtAnfragen(p, gruppe) {
  const { data, error } = await SB.rpc("paar_anfragen", { ziel: p.uid });
  if (error) return hinweis(t("Das hat nicht geklappt"));
  if (data === "vergeben") return hinweis(t("{name} ist schon mit jemandem verknüpft", { name: p.name }));
  if (data === "bestaetigt") hinweis(t("{name} und du seid jetzt ein Paar ❤️", { name: p.name }));
  else hinweis(t("Anfrage an {name} gesendet. {name} bestätigt in der App.", { name: p.name }));
  await verbindungenLaden(); paarKnopfSetzen(gruppe);
}
async function gruppeEchtAnfragen(p) {
  const { data, error } = await SB.rpc("mitreisen_anfragen", { ziel: p.uid });
  if (error) return hinweis(t("Das hat nicht geklappt"));
  hinweis(data === "zusammen" ? t("{name} hat bestätigt: ihr reist zusammen", { name: p.name }) : data === "schon" ? t("Ihr reist schon zusammen") : t("Anfrage an {name} gesendet. {name} bestätigt in der App.", { name: p.name }));
  await verbindungenLaden();
  if (document.getElementById("info").classList.contains("offen") && infoGruppe) infoZeigen(infoGruppe);
}
async function echtAktualisieren() {
  try {
    const neu = await leuteLaden();
    if (!neu.some(p => p.id === "du")) return;
    neu.forEach(p => { p.status = statusAusDb(p.statusRoh); });
    leute.splice(0, leute.length, ...neu);
    pinsSetzen(); listeAufbauen(); meinBildZeigen(); trefferAufbauen(); neuDabeiPruefen();
    await verbindungenLaden();
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
    else if (!ECHT_DATEN.profil.standort_am || Date.now() - new Date(ECHT_DATEN.profil.standort_am) > 6 * 36e5) { await SB.rpc("ort_bestaetigen"); ECHT_DATEN.profil.standort_am = new Date().toISOString(); if (ich()) ich().stand = ECHT_DATEN.profil.standort_am; }
  } catch (e) {}
}
// Ort nur über die echte Ortung; die Stadtsuche erscheint erst, wenn die Ortung nicht erlaubt ist oder nichts findet
async function ortPerGps() {
  try { await neuerOrt(await standortErmitteln()); document.getElementById("ort-suche").hidden = true; return true; }
  catch (err) {
    const feld = document.getElementById("ort-suche"); feld.hidden = false;
    hinweis(err && err.code === 1 ? t("Standort nicht erlaubt. Such deine Stadt einfach unten.") : t("Standort nicht gefunden. Such deine Stadt einfach unten."));
    return false;
  }
}
async function neuerOrt(o) {
  await standortSpeichern(o);
  meinOrtZeigen(); hinweis(t("Ort gespeichert"));
  if (landDazu(o.land)) stempelAufbauen();
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
  const { data, error } = await SB.from("profile").select("id,name,freigegeben,ist_admin,eingeladen_von,erstellt_am,gratis,art").order("erstellt_am");
  if (error) throw error;
  mitgliederDaten = data;
  const offen = await SB.from("feedback").select("id", { count: "exact", head: true }).eq("erledigt", false);
  const zahl = data.filter(x => !x.freigegeben).length + (offen.count || 0);
  document.getElementById("wartende-zahl").textContent = zahl || "";
  return data;
}
function startPasswort() {
  const z = "abcdefghjkmnpqrstuvwxyz23456789", r = crypto.getRandomValues(new Uint32Array(10));
  return "Ahoi-" + [...r].map(x => z[x % z.length]).join("");
}
// Mitteilung an alle (nur Admin): sofort oder geplant; verschickt wird von der Edge Function „push“
const rundrufZeitKnopf = () => { const v = document.getElementById("rundruf-zeit").value; document.getElementById("rundruf-senden").textContent = v && new Date(v) > new Date(Date.now() + 60e3) ? t("Planen") : t("Jetzt senden"); };
async function rundrufListe() {
  const box = document.getElementById("rundruf-liste");
  const { data, error } = await SB.from("rundruf").select("id,text,senden_am,raus").order("senden_am", { ascending: false }).limit(8);
  if (error) { box.innerHTML = ""; return; }
  const wann = iso => new Date(iso).toLocaleString(LOC, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  box.innerHTML = data.map(r => `<div class="rundruf-eintrag"><div><b>${ohneHtml(r.text)}</b><small>${r.raus ? t("Verschickt {zeit}", { zeit: wann(r.senden_am) }) : t("Geplant für {zeit}", { zeit: wann(r.senden_am) })}</small></div>${r.raus ? "" : `<button class="knopf-leise" data-rundruf-weg="${r.id}" aria-label="${t("Löschen")}">✕</button>`}</div>`).join("");
  box.querySelectorAll("[data-rundruf-weg]").forEach(b => b.onclick = () => fragen(t("Geplante Mitteilung löschen?"), [[t("Löschen"), async () => {
    const { error } = await SB.from("rundruf").delete().eq("id", b.dataset.rundrufWeg).eq("raus", false);
    hinweis(error ? t("Das hat nicht geklappt") : t("Gelöscht")); rundrufListe();
  }, true]]));
}
document.getElementById("rundruf-zeit").addEventListener("input", rundrufZeitKnopf);
document.getElementById("rundruf-senden").onclick = e => {
  const feld = document.getElementById("rundruf-text"), text = feld.value.trim(), v = document.getElementById("rundruf-zeit").value;
  if (!text) return hinweis(t("Bitte erst einen Text schreiben"));
  if (!ECHT) return hinweis(t("Im Prototyp wird nichts gesendet"));
  const spaeter = v && new Date(v) > new Date(Date.now() + 60e3);
  fragen(spaeter ? t("Mitteilung für {zeit} an alle planen?", { zeit: new Date(v).toLocaleString(LOC, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) }) : t("Jetzt an alle senden?"), [[spaeter ? t("Planen") : t("Senden"), async () => {
    beschaeftigt(e.target, true);
    const { error } = await SB.from("rundruf").insert({ text, senden_am: spaeter ? new Date(v).toISOString() : new Date().toISOString() });
    beschaeftigt(e.target, false);
    if (error) return hinweis(t("Das hat nicht geklappt"));
    feld.value = ""; document.getElementById("rundruf-zeit").value = ""; rundrufZeitKnopf();
    hinweis(spaeter ? t("Geplant") : t("Gesendet")); setTimeout(rundrufListe, spaeter ? 0 : 2500);
  }]]);
};
// Für alle ohne Push auf diesem Gerät: die letzte Mitteilung an alle (höchstens 7 Tage alt) einmal in der App zeigen
async function rundrufZeigen() {
  if (!ECHT) return;
  if (document.getElementById("aktion-blatt").classList.contains("offen")) return setTimeout(rundrufZeigen, 2000);
  let gesehen = 0; try { gesehen = +localStorage.getItem("ahoi-rundruf") || 0; } catch (e) {}
  const { data } = await SB.from("rundruf").select("id,text").gt("senden_am", new Date(Date.now() - 7 * 864e5).toISOString()).order("id", { ascending: false }).limit(1);
  const r = data && data[0];
  if (!r || r.id <= gesehen) return;
  try { localStorage.setItem("ahoi-rundruf", r.id); } catch (e) {}
  if (PUSH.abo) return; // kam schon per Push
  fragen(r.text, [[t("Schön 🙂"), () => {}]]);
  document.getElementById("aktion-abbrechen").style.display = "none";
}
async function verwaltungAufbauen() {
  try { await verwaltungLaden(); } catch (e) { return hinweis(t("Laden hat nicht geklappt")); }
  feedbackListeAufbauen(); rundrufListe();
  const nameVon = id => (mitgliederDaten.find(x => x.id === id) || {}).name || "?";
  const tag = iso => new Date(iso).toLocaleDateString(LOC, { day: "numeric", month: "short" });
  const wartende = mitgliederDaten.filter(x => !x.freigegeben), mitglieder = mitgliederDaten.filter(x => x.freigegeben);
  const boxW = document.getElementById("wartende"), boxM = document.getElementById("mitglieder");
  boxW.innerHTML = wartende.length ? wartende.map(x => `<div class="mitglied"><div class="zeile"><b>${ohneHtml(x.name || "?")}</b><small>${t("eingeladen von {name}", { name: ohneHtml(nameVon(x.eingeladen_von)) })} · ${tag(x.erstellt_am)}</small></div><button class="knopf-gross" data-frei="${x.id}">${t("Freigeben")}</button><button class="knopf-leise" data-weg="${x.id}" aria-label="${t("Ablehnen")}">✕</button></div>`).join("") : `<p class="hinweis-band" style="margin:4px 0">${t("Niemand wartet gerade")}</p>`;
  boxM.innerHTML = mitglieder.map(x => `<div class="mitglied"><div class="zeile"><b>${ohneHtml(x.name || "?")}${x.ist_admin ? " · Admin" : ""}${x.gratis ? " · ♾️" : ""}</b><small>${x.art === "familie" ? "🏡 " + t("Familie von {name}", { name: ohneHtml(nameVon(x.eingeladen_von)) }) : x.eingeladen_von ? t("eingeladen von {name}", { name: ohneHtml(nameVon(x.eingeladen_von)) }) : t("Gründer")}</small></div>${x.id === ECHT_DATEN.uid ? "" : `<button class="knopf-leise" data-pw="${x.id}">${t("Passwort")}</button><button class="knopf-leise" data-weg="${x.id}" aria-label="${t("Entfernen")}">✕</button>`}</div>`).join("");
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
function familieEchtStarten() {
  // Familien-Konto: schlanke Ansicht mit den Nomaden, die eingeladen haben
  FAMILIE_SIEHT = leute.filter(x => x.id !== "du").map(x => x.id);
  Object.assign(BETRACHTER, { name: t("Ich"), lat: null, lon: null, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
  document.getElementById("fam-kopf").textContent = t("Ahoi, {name} 👋", { name: ECHT_DATEN.profil.name || "" });
  const ende = document.getElementById("familie-ende"); ende.textContent = t("Abmelden"); ende.onclick = () => fragen(t("Abmelden?"), [[t("Abmelden"), abmelden, true]]);
  document.getElementById("familie-sprache").onclick = () => document.getElementById("sprache-zeile").click();
  document.getElementById("feedback-lasche").hidden = true;
  familieSetzen(true); reisenLaden(); setTimeout(rundrufZeigen, 4000);
  document.addEventListener("visibilitychange", async () => { if (document.visibilityState === "visible") { try { const neu = await leuteLaden(); leute.splice(0, leute.length, ...neu); FAMILIE_SIEHT = leute.filter(x => x.id !== "du").map(x => x.id); familieAufbauen(); pinsSetzen(); reisenLaden(); } catch (e) {} } });
}
function echtEinrichten() {
  const p = ECHT_DATEN.profil;
  if (p.art === "familie") return familieEchtStarten();
  familieListeAufbauen(); setTimeout(neuDabeiPruefen, 2500);
  verbindungenLaden().catch(() => {});
  chatsLaden().then(chatVerbinden).then(() => { if (/[?&](chat|ort|rundruf)=/.test(location.search)) { pushZiel(location.href); history.replaceState(null, "", location.pathname); } }).catch(() => {});
  setTimeout(pushPruefen, 1500); setTimeout(rundrufZeigen, 6000);
  // Vorschau „So sieht sie es“: die Familie sieht nur dich
  document.getElementById("familie-start").onclick = () => { FAMILIE_SIEHT = ["du"]; document.getElementById("fam-kopf").textContent = t("So sieht deine Familie dich"); document.getElementById("familie-ende").textContent = t("Zurück"); familieSetzen(true); };
  // Freunde laden; wurde ein QR-Link eines Mitglieds geöffnet, gleich verbinden
  document.getElementById("freunde-zeile").hidden = true;
  freundeLaden().catch(() => {});
  try { const qr = localStorage.getItem("ahoi-einladung"); localStorage.removeItem("ahoi-einladung"); if (qr && /^q[0-9a-f]{32}$/.test(qr)) setTimeout(() => qrVerbinden(qr), 2500); } catch (e) {}
  // Wishlist: Beispieldaten weg, echte laden
  ideen.length = 0; tipps.length = 0; wishlistLaden().catch(() => {});
  // Bereiche, die noch nicht live sind
  for (const [seite, [symbol, titel, text]] of Object.entries(BALD))
    document.getElementById("seite-" + seite).innerHTML = `<div class="seite-kopf"><h1>${t(titel)}</h1></div><div class="bald"><div style="font-size:44px">${symbol}</div><b>${t("Kommt bald")}</b>${t(text)}<p><a href="prototyp/">${t("Im Prototyp schon ansehen")}</a></p></div>`;
  document.querySelectorAll("#leiste .punkt").forEach(el => el.remove());
  reisenLaden();
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
    await ortPerGps();
    beschaeftigt(e.target, false);
  };
  ortSucheVerbinden(document.getElementById("ort-suche"), document.getElementById("ort-treffer"), async o => { await neuerOrt(o); document.getElementById("ort-treffer").innerHTML = ""; document.getElementById("ort-suche").value = ""; });

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
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { echtAktualisieren(); standortStill(); rundrufZeigen(); wishlistLaden().catch(() => {}); reisenLaden(); chatsLaden().catch(() => {}); if (p.ist_admin) verwaltungLaden().catch(() => {}); } });
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
rueckblickVonSelbst();
setInterval(listeAufbauen, 60000);
