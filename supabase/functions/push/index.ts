// Ahoi · Edge Function „push“
// Verschickt Push-Mitteilungen: bei neuen Chat-Nachrichten (Aufruf aus der Datenbank, Trigger push_ausloesen)
// und einmal täglich die Ort-Frage (Aufruf über pg_cron), dazu Svens Mitteilungen an alle (Tabelle rundruf). Ohne Anmeldung erreichbar („Verify JWT“ aus):
// Sie verschickt nur, was in der Datenbank steht, jede Nachricht nur einmal und die Ort-Frage höchstens einmal im Monat.
// Die Push-Schlüssel (VAPID) erzeugt sie beim ersten Aufruf selbst und legt sie in push_schluessel ab.
// Datenbankzugriff direkt über SUPABASE_DB_URL (steht jeder Edge Function automatisch zur Verfügung).
import webpush from "npm:web-push@3.6.7";
import postgres from "npm:postgres@3.4.5";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 2, prepare: false });
const APP = "https://mrsvenoliver.github.io/ahoi/";

const TEXTE: Record<string, Record<string, string>> = {
  de: { alle: "Alle", noch: "Bist du noch in {ort}?", nochText: "Tippe kurz, damit deine Freunde wissen, wo du bist.", plan: "Laut deinem Reiseplan bist du jetzt in {ort}", planText: "Stimmt das? Tippe, um deinen Ort zu bestätigen." },
  en: { alle: "Everyone", noch: "Still in {ort}?", nochText: "Tap so your friends know where you are.", plan: "According to your travel plan you're in {ort} now", planText: "Is that right? Tap to confirm your location." },
  sk: { alle: "Všetci", noch: "Si ešte v {ort}?", nochText: "Ťukni, aby priatelia vedeli, kde si.", plan: "Podľa tvojho plánu ciest si teraz v {ort}", planText: "Je to tak? Ťukni a potvrď svoju polohu." },
};
const text = (sprache: string | null, k: string, ort = "") => (TEXTE[sprache || "de"] || TEXTE.de)[k].replace("{ort}", ort);

async function schluessel() {
  const [da] = await sql`select oeffentlich, privat from public.push_schluessel where id = 1`;
  if (da) return da;
  const k = webpush.generateVAPIDKeys();
  await sql`insert into public.push_schluessel (id, oeffentlich, privat) values (1, ${k.publicKey}, ${k.privateKey}) on conflict (id) do nothing`;
  const [neu] = await sql`select oeffentlich, privat from public.push_schluessel where id = 1`;
  return neu;
}

type Inhalt = { title: string; body: string; url: string; tag: string };
async function verschicken(personen: string[], inhalt: (sprache: string | null) => Inhalt) {
  if (!personen.length) return 0;
  const abos = await sql`select a.endpunkt, a.p256dh, a.auth, p.sprache from public.push_abo a join public.profile p on p.id = a.person where a.person = any(${personen}::uuid[])`;
  let raus = 0;
  await Promise.all(abos.map(async (a) => {
    try {
      await webpush.sendNotification({ endpoint: a.endpunkt, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(inhalt(a.sprache)), { TTL: 86400 });
      raus++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sql`delete from public.push_abo where endpunkt = ${a.endpunkt}`; // Abo gibt es nicht mehr
    }
  }));
  return raus;
}

async function chatNachricht(id: number) {
  // Jede Nachricht nur einmal: erst als verschickt markieren, dann senden
  const [n] = await sql`update public.nachricht set push_raus = true where id = ${id} and not push_raus and not system returning id, chat, von, text`;
  if (!n) return 0;
  const [chat] = await sql`select id, art, name, emoji from public.chat where id = ${n.chat}`;
  if (!chat) return 0;
  const empfaenger = chat.art === "alle"
    ? await sql`select id from public.profile where freigegeben and art = 'nomade' and push_chat and id is distinct from ${n.von}
                and id not in (select person from public.chat_stumm where chat = ${chat.id})`
    : await sql`select p.id from public.chat_mitglied m join public.profile p on p.id = m.person
                where m.chat = ${chat.id} and p.push_chat and p.id is distinct from ${n.von}
                and p.id not in (select person from public.chat_stumm where chat = ${chat.id})`;
  const [von] = await sql`select name from public.profile where id = ${n.von}`;
  const name = von?.name || "Ahoi";
  return verschicken(empfaenger.map((x) => x.id), (sprache) => ({
    // Kurz halten: 💬 und wer schreibt (Person oder Gruppe), ohne Nachrichtentext.
    // Das iPhone setzt darunter selbst „von Ahoi“, so bleibt es bei zwei Zeilen.
    title: `💬 ${chat.art === "einzel" ? name : chat.art === "alle" ? text(sprache, "alle") : chat.name}`,
    body: "",
    url: `${APP}?chat=${chat.id}`,
    tag: `chat-${chat.id}`,
  }));
}

async function ortFrage() {
  // Mit Abo, freigegeben, nicht im Geistermodus, höchstens einmal im Monat gefragt:
  // laut Reiseplan heute woanders (über 15 km oder anderes Land), oder Ort seit 30 Tagen nicht neu
  const faellig = await sql`
    select p.id, p.ort, r.ort as reise_ort, (r.ort is not null) as woanders from public.profile p
    left join lateral (
      select x.ort from public.reise x where x.von = p.id and not x.vielleicht and x.ankunft <= current_date and x.abreise >= current_date
        and (x.lat is null and x.land is distinct from p.land
             or x.lat is not null and (p.lat is null or public.abstand_km(p.lat, p.lon, x.lat, x.lon) > 15))
      order by x.ankunft limit 1) r on true
    where p.freigegeben and p.art = 'nomade' and p.push_ort and not p.geist and p.ort is not null
      and exists (select 1 from public.push_abo a where a.person = p.id)
      and (p.ort_frage_am is null or p.ort_frage_am < now() - interval '30 days')
      and (r.ort is not null or p.standort_am is null or p.standort_am < now() - interval '30 days')`;
  let raus = 0;
  for (const p of faellig) {
    raus += await verschicken([p.id], (sprache) => p.woanders
      ? { title: text(sprache, "plan", p.reise_ort), body: text(sprache, "planText"), url: `${APP}?ort=frage`, tag: "ort" }
      : { title: text(sprache, "noch", p.ort), body: text(sprache, "nochText"), url: `${APP}?ort=frage`, tag: "ort" });
    await sql`update public.profile set ort_frage_am = now() where id = ${p.id}`;
  }
  return raus;
}

async function rundrufe() {
  // Fällige Mitteilungen an alle: erst als verschickt markieren, dann senden (so geht keine doppelt raus)
  const faellig = await sql`update public.rundruf set raus = true where not raus and senden_am <= now() returning id, text`;
  if (!faellig.length) return 0;
  const alle = (await sql`select id from public.profile where freigegeben`).map((x) => x.id);
  let raus = 0;
  for (const r of faellig) {
    const [kopf, ...rest] = String(r.text).trim().split("\n");
    raus += await verschicken(alle, () => ({ title: kopf.trim(), body: rest.join(" ").trim(), url: `${APP}?rundruf=${r.id}`, tag: `rundruf-${r.id}` }));
  }
  return raus;
}

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const k = await schluessel();
    webpush.setVapidDetails(APP, k.oeffentlich, k.privat);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    let raus = 0;
    if (Number.isInteger(body.nachricht)) raus = await chatNachricht(body.nachricht);
    else if (body.ortfrage) raus = await ortFrage();
    else if (body.rundruf) raus = await rundrufe();
    return new Response(JSON.stringify({ ok: true, raus }), { headers: { "Content-Type": "application/json", ...CORS } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, fehler: String(e) }), { status: 500, headers: { "Content-Type": "application/json", ...CORS } });
  }
});
