// Ahoi – Grundlagen für Prototyp und echte App: Sprache, Übersetzung, Modus
// Echte App: mrsvenoliver.github.io/ahoi/ · Prototyp mit Beispieldaten: …/ahoi/prototyp/
const ECHT = !/\/prototyp\//.test(location.pathname);
document.documentElement.classList.toggle("echt", ECHT);
// Fehler in der App sammeln; die echte App schickt sie nach der Anmeldung an Sven (fehlerSenden in start.js).
// Gleiche Fehler nur einmal, höchstens 10 pro Sitzung; Netzwerk-Aussetzer zählen nicht.
const APP_FEHLER = [];
function fehlerStelle(stack) {
  return String(stack || "").split("\n").map(z => (/([\w.-]+\.(?:js|html))(?:\?[^:\s)]*)?:(\d+):(\d+)/.exec(z) || []).slice(1).join(":")).filter(Boolean).slice(0, 3).join(" < ");
}
function fehlerMerken(meldung, stelle) {
  meldung = String(meldung || "").replace(/\s+/g, " ").trim();
  if (!meldung || /^Script error\.?$|ResizeObserver loop|AbortError|Load failed|NetworkError|Failed to fetch|network connection was lost|Importing a module script failed/i.test(meldung)) return;
  const k = meldung + "|" + (stelle || "");
  if (APP_FEHLER.length >= 10 || APP_FEHLER.some(f => f.k === k)) return;
  APP_FEHLER.push({ k, meldung: meldung.slice(0, 500), stelle: String(stelle || "").slice(0, 300), raus: false });
  if (typeof fehlerSenden === "function") fehlerSenden();
}
window.addEventListener("error", e => {
  if (!e.message) return;
  fehlerMerken(e.message, fehlerStelle(e.error && e.error.stack) || (e.filename ? `${e.filename.split("/").pop().split("?")[0]}:${e.lineno}:${e.colno}` : ""));
});
window.addEventListener("unhandledrejection", e => {
  const r = e.reason;
  if (r && typeof r === "object" && "code" in r && !(r instanceof Error)) return; // Antworten von Supabase, keine Programmfehler
  fehlerMerken(r && (r.message || String(r)), fehlerStelle(r && r.stack));
});
// App-Sprachen: Deutsch, Englisch, Slowakisch. Standard ist die iPhone-Sprache, im Profil änderbar.
const SPRACHEN = { de: "Deutsch", en: "English", sk: "Slovenčina" };
// Echte App und Prototyp merken sich die Sprache getrennt (sie liegen unter derselben Adresse)
const SPRACH_SCHLUESSEL = ECHT ? "ahoi-echt-sprache" : "ahoi-sprache";
const SPRACHE = (() => {
  try { const g = localStorage.getItem(SPRACH_SCHLUESSEL); if (SPRACHEN[g]) return g; } catch (e) {}
  const n = (navigator.language || "de").toLowerCase();
  return n.startsWith("de") ? "de" : n.startsWith("sk") ? "sk" : "en";
})();
const LOC = { de: "de-DE", en: "en-GB", sk: "sk-SK" }[SPRACHE];
document.documentElement.lang = SPRACHE;
const FEHLT = new Set();
// t("Deutscher Text", { platzhalter: wert }) gibt den Text in der App-Sprache zurück
function t(de, w) {
  const schluessel = de.replace(/\u00ad/g, ""), basis = de.split("|")[0];
  let s = basis;
  if (SPRACHE !== "de") { const e = TEXTE[schluessel]; if (e) s = e[SPRACHE === "en" ? 0 : 1]; else FEHLT.add(schluessel); }
  if (w) for (const k in w) s = s.split("{" + k + "}").join(w[k]);
  return s;
}
const hatText = de => SPRACHE === "de" || !!TEXTE[de.replace(/\u00ad/g, "")];
// Feste Texte der Seite (HTML) einmal übersetzen
(function seiteUebersetzen() {
  if (SPRACHE === "de") return;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), knoten = [];
  while (w.nextNode()) knoten.push(w.currentNode);
  for (const n of knoten) {
    if (n.parentElement.closest("script,style,svg,noscript")) continue;
    const roh = n.nodeValue, kern = roh.trim();
    if (!kern || !/\p{L}/u.test(kern) || !hatText(kern)) continue;
    n.nodeValue = roh.replace(kern, t(kern));
  }
  document.body.querySelectorAll("[placeholder],[title],[aria-label],[data-hinweis]").forEach(el => ["placeholder", "title", "aria-label", "data-hinweis"].forEach(a => { const v = el.getAttribute(a); if (v && hatText(v)) el.setAttribute(a, t(v)); }));
})();

