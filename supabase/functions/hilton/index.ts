// Ahoi · Edge Function „hilton“
// Recherchiert ein Hilton-Hotel, das ein Mitglied mit Name und Ort auf die Wishlist gesetzt hat:
// offizielle Seite auf hilton.com, Foto, Kategorie, Executive Lounge, ungefährer Zimmerpreis, Top 5 auf DE/EN/SK.
// Die Suche macht Claude über die Anthropic-API (Websuche). Schlüssel als Secret ANTHROPIC_API_KEY (trägt Sven selbst ein).
// Nur für angemeldete Mitglieder („Verify JWT“ an); nur wer das Hotel geteilt hat oder der Admin darf recherchieren lassen.
// Höchstens 30 Recherchen pro Tag für alle zusammen (Kostenbremse). Antwortet sofort, die Recherche läuft im Hintergrund.
import postgres from "npm:postgres@3.4.5";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 2, prepare: false });
const SCHLUESSEL = Deno.env.get("ANTHROPIC_API_KEY");
const MODELL = "claude-sonnet-5-5";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const antwort = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { "Content-Type": "application/json", ...CORS } });
const uuid = (x: unknown) => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x);

// Wer ruft? Das Gateway hat das Token schon geprüft („Verify JWT“), hier nur die Person auslesen.
function wer(req: Request): string | null {
  try {
    const t = (req.headers.get("authorization") || "").replace(/^Bearer /i, "").split(".")[1];
    const p = JSON.parse(atob(t.replace(/-/g, "+").replace(/_/g, "/")));
    return uuid(p.sub) ? p.sub : null;
  } catch { return null; }
}

const ANWEISUNG = `Du recherchierst Hilton-Hotels für eine private Reise-App von Freunden. Viele haben Hilton Honors Gold oder Diamond.
Finde das genannte Hotel (Marken von Hilton) und dessen offizielle Seite auf hilton.com. Nutze nur Fakten aus Suchergebnissen und geladenen Seiten, erfinde nichts.

Top 5: die fünf wichtigsten Besonderheiten, kurz (höchstens 70 Zeichen), sachlich, ohne Werbesprache. Reihenfolge nach Bedeutung:
- Executive Lounge immer zuerst nennen, wenn es eine gibt, mit dem Zusatz „Zugang mit Diamond, mit Gold oft per Upgrade“. Bei DoubleTree, Hilton und Conrad in Asien besonders genau prüfen.
- Danach z. B. Spa, Pool oder Rooftop-Pool, Golf-Resort, Beach-Resort oder direkt am Strand, Lage im Stadtzentrum, besonderes Design, Frühstück, Ausblick, Nähe zu Flughafen oder Sehenswürdigkeiten.
Kategorie nach Marke: luxury (Waldorf Astoria, Conrad, LXR, NoMad), premium (Hilton Hotels & Resorts, Curio Collection, Canopy, Signia),
classic (DoubleTree, Embassy Suites, Tapestry, Motto, Tempo, Hilton Garden Inn, Homewood Suites), budget (Hampton, Tru, Home2 Suites, Spark).
Preis: typischer Preis für ein Standardzimmer pro Nacht in Euro, als ganze Zahl aus den Suchergebnissen geschätzt (Durchschnitt, keine Spitzenzeiten); null, wenn nicht ermittelbar.
Lounge: true, wenn das Hotel eine Executive Lounge hat; false, wenn klar keine; null, wenn unklar.
Bild: die https-Adresse eines Fotos des Hotels von hilton.com, falls du eine siehst, sonst null.

Antworte am Ende ausschließlich mit einem JSON-Objekt, ohne weiteren Text:
{"gefunden":true,"name":"offizieller Hotelname","ort":"Stadt oder Ort","land":"ISO-3166 Alpha-2, z. B. NL","link":"https://www.hilton.com/en/hotels/…","bild":null,"kategorie":"luxury|premium|classic|budget","lounge":true,"preis_ca":120,"top5":{"de":["…"],"en":["…"],"sk":["…"]},"quellen":["https://…"]}
Gibt es kein passendes Hilton-Hotel: {"gefunden":false,"grund":"kurzer Grund auf Deutsch"}`;

// Marke → Kategorie (sicherer als die Einschätzung der KI, wenn die Marke im Namen steht)
function kategorieAusName(name: string): string | null {
  const n = name.toLowerCase();
  if (/waldorf astoria|conrad|\blxr\b|nomad/.test(n)) return "luxury";
  if (/hampton|\btru by|home2|spark by|livsmart/.test(n)) return "budget";
  if (/doubletree|embassy suites|tapestry|motto|tempo by|garden inn|homewood/.test(n)) return "classic";
  if (/canopy|curio|signia/.test(n)) return "premium";
  return null;
}

// Foto von der Hotelseite (og:image); viele Seiten sperren Server-Abrufe, dann bleibt es beim Bild aus der Recherche
async function fotoVonSeite(link: string): Promise<string | null> {
  try {
    const r = await fetch(link, { redirect: "follow", signal: AbortSignal.timeout(8000), headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "Accept-Language": "en-US,en;q=0.9", "Accept": "text/html" } });
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 1_500_000);
    const tag = html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i)?.[0];
    let bild = tag?.match(/content=["']([^"']+)["']/i)?.[1]?.replace(/&amp;/g, "&") || null;
    if (bild?.startsWith("//")) bild = "https:" + bild;
    return bild?.startsWith("https://") ? bild.slice(0, 1000) : null;
  } catch { return null; }
}

async function claudeFragen(name: string, ort: string) {
  const nachrichten: unknown[] = [{ role: "user", content: `Hotel: ${name}\nOrt: ${ort}` }];
  for (let runde = 0; runde < 4; runde++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: AbortSignal.timeout(110_000),
      headers: { "x-api-key": SCHLUESSEL!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODELL, max_tokens: 3000, system: ANWEISUNG, messages: nachrichten, tools: [
        { type: "web_search_20250305", name: "web_search", max_uses: 5 },
        { type: "web_fetch_20250910", name: "web_fetch", max_uses: 3, allowed_domains: ["hilton.com"], max_content_tokens: 20000 },
      ] }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(`API ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
    // Lange Suchen pausieren manchmal („pause_turn“): dann mit der bisherigen Antwort weitermachen
    if (d.stop_reason === "pause_turn") { nachrichten.push({ role: "assistant", content: d.content }); continue; }
    const text = (d.content || []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n");
    const roh = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    return JSON.parse(roh);
  }
  throw new Error("Recherche nicht fertig geworden");
}

const kurz = (x: unknown, n: number) => typeof x === "string" && x.trim() ? x.trim().slice(0, n) : null;
const liste = (x: unknown) => Array.isArray(x) ? x.map((s) => kurz(s, 90)).filter(Boolean).slice(0, 5) as string[] : [];

async function recherchieren(id: string, name: string, ort: string) {
  try {
    const j = await claudeFragen(name, ort);
    if (!j || j.gefunden === false) {
      await sql`update public.hilton set status = 'fehler', notiz = ${kurz(j?.grund, 300) || "Nicht gefunden"} where id = ${id}`;
      return;
    }
    const link = kurz(j.link, 600);
    const linkOk = link && /^https:\/\/([a-z0-9-]+\.)*hilton\.com\//i.test(link) ? link : null;
    let bild = linkOk ? await fotoVonSeite(linkOk) : null;
    if (!bild && typeof j.bild === "string" && /^https:\/\//.test(j.bild)) bild = j.bild.slice(0, 1000);
    const offiziell = kurz(j.name, 120) || name;
    const kat = kategorieAusName(offiziell) || (["luxury", "premium", "classic", "budget"].includes(j.kategorie) ? j.kategorie : null);
    const land = typeof j.land === "string" && /^[A-Z]{2}$/.test(j.land) ? j.land : null;
    const preis = Number.isFinite(j.preis_ca) && j.preis_ca > 0 && j.preis_ca < 10000 ? Math.round(j.preis_ca) : null;
    const texte = { de: liste(j.top5?.de), en: liste(j.top5?.en), sk: liste(j.top5?.sk) };
    const quellen = Array.isArray(j.quellen) ? j.quellen.filter((q: unknown) => typeof q === "string").slice(0, 8).join("\n") : "";
    await sql`update public.hilton set status = 'fertig', name = ${offiziell}, ort = ${kurz(j.ort, 120) || ort}, land = ${land},
      link = ${linkOk}, bild_url = ${bild}, kategorie = ${kat}, lounge = ${typeof j.lounge === "boolean" ? j.lounge : null}, preis_ca = ${preis},
      texte = ${sql.json(texte)}, highlights = ${texte.de}, notiz = ${quellen.slice(0, 2000) || null} where id = ${id}`;
  } catch (e) {
    console.error("hilton", id, String(e));
    await sql`update public.hilton set status = 'fehler', notiz = ${String(e).slice(0, 300)} where id = ${id}`.catch(() => {});
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const ich = wer(req);
    const { hotel } = await req.json().catch(() => ({}));
    if (!ich || !uuid(hotel)) return antwort({ ok: false, grund: "anfrage" }, 400);
    const [h] = await sql`select h.id, h.name, coalesce(h.ort_eingabe, h.ort) as ort, h.von, h.status, h.recherche_am,
        (select ist_admin from public.profile where id = ${ich}) as admin
      from public.hilton h where h.id = ${hotel}`;
    if (!h || (h.von !== ich && !h.admin)) return antwort({ ok: false, grund: "verboten" }, 403);
    if (h.status === "recherche" && h.recherche_am && Date.now() - new Date(h.recherche_am).getTime() < 180_000) return antwort({ ok: true, laeuft: true });
    if (!SCHLUESSEL) {
      await sql`update public.hilton set status = 'fehler', notiz = 'Kein API-Schlüssel hinterlegt' where id = ${hotel}`;
      return antwort({ ok: false, grund: "schluessel" });
    }
    const [{ n }] = await sql`select count(*)::int as n from public.hilton where recherche_am > now() - interval '1 day'`;
    if (n >= 30) return antwort({ ok: false, grund: "limit" });
    await sql`update public.hilton set status = 'recherche', recherche_am = now(), notiz = null where id = ${hotel}`;
    const arbeit = recherchieren(h.id, h.name, h.ort || "");
    // Im Hintergrund weiterlaufen lassen, damit die App nicht warten muss
    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime;
    if (rt?.waitUntil) rt.waitUntil(arbeit); else await arbeit;
    return antwort({ ok: true, laeuft: true });
  } catch (e) {
    console.error("hilton", String(e));
    return antwort({ ok: false }, 500);
  }
});
