// Ahoi – Grundlagen für Prototyp und echte App: Sprache, Übersetzung, Modus
// Echte App: mrsvenoliver.github.io/ahoi/ · Prototyp mit Beispieldaten: …/ahoi/prototyp/
const ECHT = !/\/prototyp\//.test(location.pathname);
document.documentElement.classList.toggle("echt", ECHT);
// App-Sprachen: Deutsch, Englisch, Slowakisch. Standard ist die iPhone-Sprache, im Profil änderbar.
const SPRACHEN = { de: "Deutsch", en: "English", sk: "Slovenčina" };
const SPRACHE = (() => {
  try { const g = localStorage.getItem("ahoi-sprache"); if (SPRACHEN[g]) return g; } catch (e) {}
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

