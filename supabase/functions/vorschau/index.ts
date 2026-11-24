// Ahoi · Edge Function „vorschau“
// Holt Titel und Bild eines geteilten Links (z. B. Airbnb) für die Wishlist.
// Nur für angemeldete Mitglieder („Verify JWT“ an). Liest höchstens 1,5 MB und wartet höchstens 8 Sekunden.
// Klappt es nicht (manche Seiten sperren solche Abrufe), antwortet sie mit leeren Feldern; die App bietet dann ein eigenes Foto an.

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const antwort = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { "Content-Type": "application/json", ...CORS } });

function meta(html: string, namen: string[]) {
  for (const n of namen) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*>`, "i"), tag = html.match(re)?.[0];
    const inhalt = tag?.match(/content=["']([^"']*)["']/i)?.[1];
    if (inhalt) return inhalt;
  }
  return null;
}
const entschluesseln = (s: string | null) => s && s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const { url } = await req.json().catch(() => ({}));
    let u: URL;
    try { u = new URL(String(url)); } catch { return antwort({ ok: false }); }
    if (u.protocol !== "https:" || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) return antwort({ ok: false });
    // Seite laden; eine Weiterleitung per <meta http-equiv="refresh"> (z. B. Airbnb auf die Länderseite) wird einmal mitgemacht
    let ziel = u.href, html = "";
    for (let runde = 0; runde < 3; runde++) {
      const r = await fetch(ziel, {
        redirect: "follow", signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", "Accept-Language": "en-US,en;q=0.9", "Accept": "text/html" },
      });
      if (!r.ok || !r.body) return antwort({ ok: false, ziel: r.url });
      ziel = r.url;
      // nur den Anfang lesen, die Vorschau-Angaben stehen oben
      const leser = r.body.getReader(); html = ""; let menge = 0;
      while (menge < 1_500_000) { const { done, value } = await leser.read(); if (done) break; menge += value.length; html += new TextDecoder().decode(value, { stream: true }); if (/<\/head>/i.test(html)) break; }
      leser.cancel().catch(() => {});
      const weiter = html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'>]+)["']/i)?.[1];
      if (!weiter || meta(html, ["og:title"])) break;
      ziel = new URL(entschluesseln(weiter)!.replace(/^['"]|['"]$/g, ""), ziel).href;
      if (!ziel.startsWith("https://")) break;
    }
    const titel = entschluesseln(meta(html, ["og:title", "twitter:title"]) || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || null);
    let bild = entschluesseln(meta(html, ["og:image", "og:image:secure_url", "twitter:image"]));
    if (bild && bild.startsWith("//")) bild = "https:" + bild;
    if (bild && !bild.startsWith("https://")) bild = null;
    const brauchbar = titel && !/^(weiterleitung|redirect|just a moment|access denied)/i.test(titel) ? titel : null;
    return antwort({ ok: !!(brauchbar || bild), titel: brauchbar?.slice(0, 160) || null, bild: bild?.slice(0, 800) || null, ziel });
  } catch (_e) {
    return antwort({ ok: false });
  }
});
