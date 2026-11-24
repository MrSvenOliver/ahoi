// Ahoi · Edge Function „push“
// Verschickt Push-Mitteilungen: bei neuen Chat-Nachrichten (Aufruf aus der Datenbank, Trigger push_ausloesen)
// und einmal täglich die Ort-Frage (Aufruf über pg_cron). Ohne Anmeldung erreichbar („Verify JWT“ aus):
// Sie verschickt nur, was in der Datenbank steht, jede Nachricht nur einmal und die Ort-Frage höchstens einmal im Monat.
// Die Push-Schlüssel (VAPID) erzeugt sie beim ersten Aufruf selbst und legt sie in push_schluessel ab.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const APP = "https://mrsvenoliver.github.io/ahoi/";

const TEXTE: Record<string, Record<string, string>> = {
  de: { alle: "Alle", noch: "Bist du noch in {ort}?", nochText: "Tippe kurz, damit deine Freunde wissen, wo du bist.", plan: "Laut deinem Reiseplan bist du jetzt in {ort}", planText: "Stimmt das? Tippe, um deinen Ort zu bestätigen." },
  en: { alle: "Everyone", noch: "Still in {ort}?", nochText: "Tap so your friends know where you are.", plan: "According to your travel plan you're in {ort} now", planText: "Is that right? Tap to confirm your location." },
  sk: { alle: "Všetci", noch: "Si ešte v {ort}?", nochText: "Ťukni, aby priatelia vedeli, kde si.", plan: "Podľa tvojho plánu ciest si teraz v {ort}", planText: "Je to tak? Ťukni a potvrď svoju polohu." },
};
const text = (sprache: string | null, k: string, ort = "") => (TEXTE[sprache || "de"] || TEXTE.de)[k].replace("{ort}", ort);
const kuerzen = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

async function schluessel() {
  const { data } = await sb.from("push_schluessel").select("oeffentlich, privat").eq("id", 1).maybeSingle();
  if (data) return data;
  const k = webpush.generateVAPIDKeys();
  const { error } = await sb.from("push_schluessel").insert({ id: 1, oeffentlich: k.publicKey, privat: k.privateKey });
  if (error) { const { data: d } = await sb.from("push_schluessel").select("oeffentlich, privat").eq("id", 1).single(); return d!; }
  return { oeffentlich: k.publicKey, privat: k.privateKey };
}

type Inhalt = { title: string; body: string; url: string; tag: string };
async function verschicken(personen: string[], inhalt: (sprache: string | null) => Inhalt) {
  if (!personen.length) return 0;
  const { data: abos } = await sb.from("push_abo").select("endpunkt, p256dh, auth, person").in("person", personen);
  if (!abos?.length) return 0;
  const { data: profile } = await sb.from("profile").select("id, sprache").in("id", personen);
  const sprache = Object.fromEntries((profile || []).map((p) => [p.id, p.sprache]));
  let raus = 0;
  await Promise.all(abos.map(async (a) => {
    try {
      await webpush.sendNotification({ endpoint: a.endpunkt, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(inhalt(sprache[a.person])), { TTL: 86400 });
      raus++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sb.from("push_abo").delete().eq("endpunkt", a.endpunkt); // Abo gibt es nicht mehr
    }
  }));
  return raus;
}

async function chatNachricht(id: number) {
  // Jede Nachricht nur einmal: erst als verschickt markieren, dann senden
  const { data: n } = await sb.from("nachricht").update({ push_raus: true }).eq("id", id).eq("push_raus", false).eq("system", false).select("id, chat, von, text").maybeSingle();
  if (!n) return 0;
  const { data: chat } = await sb.from("chat").select("id, art, name, emoji").eq("id", n.chat).single();
  if (!chat) return 0;
  let personen: string[];
  if (chat.art === "alle") {
    const { data } = await sb.from("profile").select("id").eq("freigegeben", true).eq("art", "nomade");
    personen = (data || []).map((x) => x.id);
  } else {
    const { data } = await sb.from("chat_mitglied").select("person").eq("chat", chat.id);
    personen = (data || []).map((x) => x.person);
  }
  const [{ data: stumm }, { data: aus }, { data: von }] = await Promise.all([
    sb.from("chat_stumm").select("person").eq("chat", chat.id),
    sb.from("profile").select("id").eq("push_chat", false),
    sb.from("profile").select("name").eq("id", n.von).maybeSingle(),
  ]);
  const raus = new Set([n.von, ...(stumm || []).map((x) => x.person), ...(aus || []).map((x) => x.id)]);
  personen = personen.filter((p) => !raus.has(p));
  const name = von?.name || "Ahoi";
  return verschicken(personen, (sprache) => ({
    title: chat.art === "einzel" ? name : chat.art === "alle" ? `🌍 ${text(sprache, "alle")}` : `${chat.emoji || "👥"} ${chat.name}`,
    body: kuerzen(chat.art === "einzel" ? n.text : `${name}: ${n.text}`, 160),
    url: `${APP}?chat=${chat.id}`,
    tag: `chat-${chat.id}`,
  }));
}

const km = (a: number, b: number, c: number, d: number) => {
  const r = Math.PI / 180, x = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(x));
};
async function ortFrage() {
  const vor30 = new Date(Date.now() - 30 * 864e5).toISOString(), heute = new Date().toISOString().slice(0, 10);
  const { data: abos } = await sb.from("push_abo").select("person");
  const mitAbo = [...new Set((abos || []).map((x) => x.person))];
  if (!mitAbo.length) return 0;
  const { data: leute } = await sb.from("profile").select("id, ort, lat, lon, standort_am, ort_frage_am, geist, freigegeben, art").in("id", mitAbo);
  let raus = 0;
  for (const p of leute || []) {
    if (!p.freigegeben || p.art !== "nomade" || p.geist || !p.ort) continue;
    if (p.ort_frage_am && p.ort_frage_am > vor30) continue;
    const { data: reise } = await sb.from("reise").select("ort, lat, lon").eq("von", p.id).eq("vielleicht", false).lte("ankunft", heute).gte("abreise", heute).limit(1).maybeSingle();
    const woanders = reise && (reise.lat == null || p.lat == null || km(p.lat, p.lon, reise.lat, reise.lon) > 15);
    const alt = !p.standort_am || p.standort_am < vor30;
    if (!woanders && !alt) continue;
    raus += await verschicken([p.id], (sprache) => woanders
      ? { title: text(sprache, "plan", reise!.ort), body: text(sprache, "planText"), url: `${APP}?ort=frage`, tag: "ort" }
      : { title: text(sprache, "noch", p.ort), body: text(sprache, "nochText"), url: `${APP}?ort=frage`, tag: "ort" });
    await sb.from("profile").update({ ort_frage_am: new Date().toISOString() }).eq("id", p.id);
  }
  return raus;
}

Deno.serve(async (req) => {
  try {
    const k = await schluessel();
    webpush.setVapidDetails(APP, k.oeffentlich, k.privat);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    let raus = 0;
    if (Number.isInteger(body.nachricht)) raus = await chatNachricht(body.nachricht);
    else if (body.ortfrage) raus = await ortFrage();
    return new Response(JSON.stringify({ ok: true, raus }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, fehler: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
