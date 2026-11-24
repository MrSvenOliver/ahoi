// Ahoi · Edge Function „push“
// Verschickt Push-Mitteilungen. Aufrufe kommen aus der Datenbank (Trigger) und von pg_cron, ohne Anmeldung („Verify JWT“ aus).
// Sie verschickt nur, was in der Datenbank steht, und jedes Ereignis höchstens einmal (push_raus, push_gesendet).
// Jede Person bestimmt selbst, was sie bekommt (Profil → Mitteilungen), dazu die Ruhezeit 22–8 Uhr nach ihrer Ortszeit:
// was nachts käme, wartet in push_warten und geht morgens raus.
// Die Push-Schlüssel (VAPID) erzeugt sie beim ersten Aufruf selbst und legt sie in push_schluessel ab.
// Datenbankzugriff direkt über SUPABASE_DB_URL (steht jeder Edge Function automatisch zur Verfügung).
import webpush from "npm:web-push@3.6.7";
import postgres from "npm:postgres@3.4.5";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 2, prepare: false });
const APP = "https://mrsvenoliver.github.io/ahoi/";

const TEXTE: Record<string, Record<string, string>> = {
  de: {
    alle: "Alle", noch: "Bist du noch in {ort}?", nochText: "Tippe kurz, damit deine Freunde wissen, wo du bist.", plan: "Laut deinem Reiseplan bist du jetzt in {ort}", planText: "Stimmt das? Tippe, um deinen Ort zu bestätigen.",
    wunschNeu: "🏡 {name} teilt eine Unterkunft in {ort}", wunschDabei: "🙋 {name} ist dabei: {ort}", wunschGebucht: "✅ Gebucht: {ort}", wunschPreis: "💶 Neuer Preis für {ort}: {pp} € pro Person",
    reise: "✈️ {name} reist nach {ort} · {zeit}", treffer: "🧭 Treffer: {name} ist auch in {ort} · {zeit}", kommt: "🧭 {name} kommt nach {ort} · {zeit}",
    naehe: "📍 {name} ist in deiner Nähe: {ort}", neu: "👋 Neu bei Ahoi: {name}", anfrage: "🤝 {name} möchte sich mit dir verbinden",
  },
  en: {
    alle: "Everyone", noch: "Still in {ort}?", nochText: "Tap so your friends know where you are.", plan: "According to your travel plan you're in {ort} now", planText: "Is that right? Tap to confirm your location.",
    wunschNeu: "🏡 {name} shares a place in {ort}", wunschDabei: "🙋 {name} is in: {ort}", wunschGebucht: "✅ Booked: {ort}", wunschPreis: "💶 New price for {ort}: {pp} € per person",
    reise: "✈️ {name} is going to {ort} · {zeit}", treffer: "🧭 Match: {name} is in {ort} too · {zeit}", kommt: "🧭 {name} is coming to {ort} · {zeit}",
    naehe: "📍 {name} is near you: {ort}", neu: "👋 New on Ahoi: {name}", anfrage: "🤝 {name} wants to connect with you",
  },
  sk: {
    alle: "Všetci", noch: "Si ešte v {ort}?", nochText: "Ťukni, aby priatelia vedeli, kde si.", plan: "Podľa tvojho plánu ciest si teraz v {ort}", planText: "Je to tak? Ťukni a potvrď svoju polohu.",
    wunschNeu: "🏡 {name} zdieľa ubytovanie v {ort}", wunschDabei: "🙋 {name} ide tiež: {ort}", wunschGebucht: "✅ Rezervované: {ort}", wunschPreis: "💶 Nová cena za {ort}: {pp} € na osobu",
    reise: "✈️ {name} cestuje do {ort} · {zeit}", treffer: "🧭 Zhoda: {name} je tiež v {ort} · {zeit}", kommt: "🧭 {name} príde do {ort} · {zeit}",
    naehe: "📍 {name} je blízko teba: {ort}", neu: "👋 Nový v Ahoi: {name}", anfrage: "🤝 {name} sa chce s tebou spojiť",
  },
};
const ORT_LOC: Record<string, string> = { de: "de-DE", en: "en-GB", sk: "sk-SK" };
type Werte = Record<string, string | number>;
function text(sprache: string | null, k: string, w: Werte | string = {}) {
  const werte: Werte = typeof w === "string" ? { ort: w } : w;
  let s = (TEXTE[sprache || "de"] || TEXTE.de)[k] || TEXTE.de[k];
  for (const [n, v] of Object.entries(werte)) s = s.split(`{${n}}`).join(String(v));
  return s;
}
const tag = (d: Date | string, sprache: string | null) => new Date(d).toLocaleDateString(ORT_LOC[sprache || "de"] || "de-DE", { day: "numeric", month: "numeric", timeZone: "UTC" });
const zeitraum = (von: Date | string, bis: Date | string, sprache: string | null) => `${tag(von, sprache)}–${tag(bis, sprache)}`;

async function schluessel() {
  const [da] = await sql`select oeffentlich, privat from public.push_schluessel where id = 1`;
  if (da) return da;
  const k = webpush.generateVAPIDKeys();
  await sql`insert into public.push_schluessel (id, oeffentlich, privat) values (1, ${k.publicKey}, ${k.privateKey}) on conflict (id) do nothing`;
  const [neu] = await sql`select oeffentlich, privat from public.push_schluessel where id = 1`;
  return neu;
}
// Jedes Ereignis nur einmal (Schlüssel z. B. „reise:<id>“)
async function erstesMal(schl: string) {
  const r = await sql`insert into public.push_gesendet (schluessel) values (${schl}) on conflict do nothing returning schluessel`;
  return r.length > 0;
}

// Ruhezeit: Minuten bis 8 Uhr Ortszeit, wenn es gerade zwischen 22 und 8 Uhr ist (sonst 0)
function ruheMinuten(zeitzone: string | null) {
  try {
    const teile = new Intl.DateTimeFormat("en-GB", { timeZone: zeitzone || "UTC", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
    const h = Number(teile.find((t) => t.type === "hour")!.value), m = Number(teile.find((t) => t.type === "minute")!.value);
    if (h >= 22) return (24 - h + 8) * 60 - m;
    if (h < 8) return (8 - h) * 60 - m;
  } catch (_e) { /* unbekannte Zeitzone: sofort senden */ }
  return 0;
}

type Inhalt = { title: string; body: string; url: string; tag: string };
async function senden(personId: string, inhalt: Inhalt) {
  const abos = await sql`select endpunkt, p256dh, auth from public.push_abo where person = ${personId}`;
  let raus = 0;
  await Promise.all(abos.map(async (a) => {
    try {
      await webpush.sendNotification({ endpoint: a.endpunkt, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(inhalt), { TTL: 86400 });
      raus++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sql`delete from public.push_abo where endpunkt = ${a.endpunkt}`; // Abo gibt es nicht mehr
    }
  }));
  return raus;
}
// An mehrere Personen: jede in ihrer Sprache; in der Ruhezeit in die Warteschlange (gleicher tag ersetzt ältere)
async function verschicken(personen: string[], inhalt: (sprache: string | null) => Inhalt) {
  if (!personen.length) return 0;
  const leute = await sql`select p.id, p.sprache, p.zeitzone, p.push_ruhe from public.profile p
                          where p.id = any(${personen}::uuid[]) and exists (select 1 from public.push_abo a where a.person = p.id)`;
  let raus = 0;
  for (const p of leute) {
    const i = inhalt(p.sprache), warten = p.push_ruhe ? ruheMinuten(p.zeitzone) : 0;
    if (warten > 0) {
      await sql`insert into public.push_warten (person, tag, inhalt, ab) values (${p.id}, ${i.tag}, ${sql.json(i)}, now() + ${warten + " minutes"}::interval)
                on conflict (person, tag) do update set inhalt = excluded.inhalt, ab = excluded.ab`;
    } else raus += await senden(p.id, i);
  }
  return raus;
}
async function wartendeSenden() {
  const faellig = await sql`delete from public.push_warten where ab <= now() returning person, inhalt`;
  let raus = 0;
  for (const w of faellig) raus += await senden(w.person, w.inhalt);
  return raus;
}
const nameVon = async (id: string) => ((await sql`select name from public.profile where id = ${id}`)[0]?.name as string) || "Ahoi";

// ---------- Chat ----------
async function chatNachricht(id: number) {
  // Jede Nachricht nur einmal: erst als verschickt markieren, dann senden
  const [n] = await sql`update public.nachricht set push_raus = true where id = ${id} and not push_raus and not system returning id, chat, von, text`;
  if (!n) return 0;
  const [chat] = await sql`select id, art, name, emoji from public.chat where id = ${n.chat}`;
  if (!chat) return 0;
  // push_chat_art: „alle“ = jeder Chat, „gruppen“ = Einzel- und Gruppenchats, „aus“ = keine
  const empfaenger = chat.art === "alle"
    ? await sql`select id from public.profile where freigegeben and art = 'nomade' and push_chat_art = 'alle' and id is distinct from ${n.von}
                and id not in (select person from public.chat_stumm where chat = ${chat.id})`
    : await sql`select p.id from public.chat_mitglied m join public.profile p on p.id = m.person
                where m.chat = ${chat.id} and p.push_chat_art <> 'aus' and p.id is distinct from ${n.von}
                and p.id not in (select person from public.chat_stumm where chat = ${chat.id})`;
  const name = await nameVon(n.von);
  return verschicken(empfaenger.map((x) => x.id), (sprache) => ({
    // Kurz halten: 💬 und wer schreibt (Person oder Gruppe), ohne Nachrichtentext.
    // Das iPhone setzt darunter selbst „von Ahoi“, so bleibt es bei zwei Zeilen.
    title: `💬 ${chat.art === "einzel" ? name : chat.art === "alle" ? text(sprache, "alle") : chat.name}`,
    body: "",
    url: `${APP}?chat=${chat.id}`,
    tag: `chat-${chat.id}`,
  }));
}

// ---------- Wishlist ----------
async function wunschEreignis(art: string, wunschId: string, wer: string | null) {
  const [w] = await sql`select id, von, ort, preis, gebucht from public.wunsch where id = ${wunschId}`;
  if (!w) return 0;
  const url = `${APP}?wishlist=1`;
  if (art === "wunsch_neu") {
    if (!(await erstesMal(`wunsch_neu:${w.id}`))) return 0;
    const an = await sql`select id from public.profile where freigegeben and art = 'nomade' and push_wunsch_neu and id <> ${w.von}`;
    const name = await nameVon(w.von);
    return verschicken(an.map((x) => x.id), (s) => ({ title: text(s, "wunschNeu", { name, ort: w.ort }), body: "", url, tag: `wunsch-${w.id}` }));
  }
  if (art === "wunsch_dabei") {
    if (!wer || !(await sql`select 1 from public.wunsch_dabei where wunsch = ${w.id} and person = ${wer}`).length) return 0;
    if (!(await erstesMal(`wunsch_dabei:${w.id}:${wer}`))) return 0;
    const an = await sql`select id from public.profile where id = ${w.von} and push_wunsch_dabei`;
    const name = await nameVon(wer);
    return verschicken(an.map((x) => x.id), (s) => ({ title: text(s, "wunschDabei", { name, ort: w.ort }), body: "", url, tag: `wunsch-${w.id}` }));
  }
  // Gebucht oder neuer Preis: an alle, die dabei sind (und die Person, die geteilt hat), außer wer es geändert hat
  if (art === "wunsch_gebucht" && !w.gebucht) return 0;
  if (!(await erstesMal(art === "wunsch_gebucht" ? `wunsch_gebucht:${w.id}` : `wunsch_preis:${w.id}:${w.preis}`))) return 0;
  const an = await sql`select p.id from public.profile p where p.push_wunsch_update and p.id is distinct from ${wer}
                       and (p.id = ${w.von} or p.id in (select person from public.wunsch_dabei where wunsch = ${w.id}))`;
  const [{ n }] = await sql`select count(*)::int + 1 as n from public.wunsch_dabei where wunsch = ${w.id}`;
  const pp = w.preis ? Math.round(w.preis / n) : 0;
  return verschicken(an.map((x) => x.id), (s) => ({ title: art === "wunsch_gebucht" ? text(s, "wunschGebucht", w.ort) : text(s, "wunschPreis", { ort: w.ort, pp: pp.toLocaleString(ORT_LOC[s || "de"]) }), body: "", url, tag: `wunsch-${w.id}` }));
}

// ---------- Reisen und Treffer ----------
async function reiseEreignis(reiseId: string) {
  const [r] = await sql`select id, von, ort, land, lat, lon, ankunft, abreise, erstellt_am from public.reise where id = ${reiseId} and not vielleicht`;
  if (!r || !(await erstesMal(`reise:${r.id}`))) return 0;
  const name = await nameVon(r.von);
  const url = `${APP}?reisen=1`;
  let raus = 0;
  // Neue Reise: an Freunde, die das wollen
  const freunde = await sql`select case when a = ${r.von} then b else a end as id from public.freundschaft where a = ${r.von} or b = ${r.von}`;
  const ids = freunde.map((x) => x.id);
  if (ids.length) {
    const an = await sql`select id from public.profile where id = any(${ids}::uuid[]) and push_reise`;
    raus += await verschicken(an.map((x) => x.id), (s) => ({ title: text(s, "reise", { name, ort: r.ort, zeit: zeitraum(r.ankunft, r.abreise, s) }), body: "", url, tag: `reise-${r.id}` }));
  }
  if (r.lat == null) return raus;
  // Treffer: andere sind zur gleichen Zeit am gleichen Ort (unter 15 km); zusammen gebuchte Reisen zählen nicht
  const treffer = await sql`select x.von, greatest(x.ankunft, ${r.ankunft}::date) as von_d, least(x.abreise, ${r.abreise}::date) as bis_d from public.reise x
    where x.von <> ${r.von} and not x.vielleicht and x.lat is not null and x.ankunft <= ${r.abreise} and x.abreise >= ${r.ankunft}
      and public.abstand_km(x.lat, x.lon, ${r.lat}, ${r.lon}) < 15
      and not (x.ort = ${r.ort} and x.ankunft = ${r.ankunft} and x.abreise = ${r.abreise} and abs(extract(epoch from x.erstellt_am - ${r.erstellt_am}::timestamptz)) < 300)`;
  for (const t of treffer) {
    if (!(await erstesMal(`treffer:${[r.von, t.von].sort().join(":")}:${r.ort}:${t.von_d.toISOString().slice(0, 10)}`))) continue;
    const andere = await nameVon(t.von);
    const an1 = await sql`select id from public.profile where id = ${t.von} and push_treffer`;
    raus += await verschicken(an1.map((x) => x.id), (s) => ({ title: text(s, "treffer", { name, ort: r.ort, zeit: zeitraum(t.von_d, t.bis_d, s) }), body: "", url, tag: `treffer-${r.id}` }));
    const an2 = await sql`select id from public.profile where id = ${r.von} and push_treffer`;
    raus += await verschicken(an2.map((x) => x.id), (s) => ({ title: text(s, "treffer", { name: andere, ort: r.ort, zeit: zeitraum(t.von_d, t.bis_d, s) }), body: "", url, tag: `treffer-${r.id}-${t.von}` }));
  }
  // Kommt zu dir: jemand ist gerade dort (Ort aktuell, unter 15 km) und die Reise beginnt in den nächsten 60 Tagen
  if (new Date(r.ankunft).getTime() - Date.now() < 60 * 864e5) {
    const dort = await sql`select id from public.profile where id <> ${r.von} and freigegeben and art = 'nomade' and not geist and push_treffer
      and lat is not null and standort_am > now() - interval '30 days' and public.abstand_km(lat, lon, ${r.lat}, ${r.lon}) < 15`;
    for (const p of dort) {
      if (!(await erstesMal(`kommt:${r.id}:${p.id}`))) continue;
      raus += await verschicken([p.id], (s) => ({ title: text(s, "kommt", { name, ort: r.ort, zeit: zeitraum(r.ankunft, r.abreise, s) }), body: "", url, tag: `kommt-${r.id}` }));
    }
  }
  return raus;
}

// ---------- Ort: ein Freund ist in der Nähe angekommen (unter 50 km) ----------
async function ortEreignis(personId: string) {
  const [p] = await sql`select id, name, ort, lat, lon from public.profile where id = ${personId} and freigegeben and not geist and lat is not null`;
  if (!p || !(await erstesMal(`ort:${p.id}:${p.ort}:${new Date().toISOString().slice(0, 10)}`))) return 0;
  const an = await sql`select q.id from public.profile q
    where q.id <> ${p.id} and q.freigegeben and q.art = 'nomade' and q.push_naehe and not q.geist and q.lat is not null
      and q.standort_am > now() - interval '30 days' and public.abstand_km(q.lat, q.lon, ${p.lat}, ${p.lon}) < 50
      and exists (select 1 from public.freundschaft f where f.a = least(q.id, ${p.id}::uuid) and f.b = greatest(q.id, ${p.id}::uuid))`;
  return verschicken(an.map((x) => x.id), (s) => ({ title: text(s, "naehe", { name: p.name, ort: p.ort }), body: "", url: APP, tag: `naehe-${p.id}` }));
}

// ---------- Neue Leute und Anfragen ----------
async function neuDabei(personId: string) {
  const [p] = await sql`select id, name from public.profile where id = ${personId} and freigegeben and art = 'nomade'`;
  if (!p || !(await erstesMal(`neu:${p.id}`))) return 0;
  const an = await sql`select id from public.profile where freigegeben and art = 'nomade' and push_leute and id <> ${p.id}`;
  return verschicken(an.map((x) => x.id), (s) => ({ title: text(s, "neu", { name: p.name }), body: "", url: APP, tag: `neu-${p.id}` }));
}
async function anfrage(von: string, an: string) {
  if (!(await sql`select 1 from public.freund_anfrage where von = ${von} and an = ${an}`).length) return 0;
  if (!(await erstesMal(`anfrage:${von}:${an}:${new Date().toISOString().slice(0, 10)}`))) return 0;
  const ziel = await sql`select id from public.profile where id = ${an} and push_leute`;
  const name = await nameVon(von);
  return verschicken(ziel.map((x) => x.id), (s) => ({ title: text(s, "anfrage", { name }), body: "", url: `${APP}?freunde=1`, tag: `anfrage-${von}` }));
}

// ---------- Ort-Frage (täglich über pg_cron) ----------
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

// ---------- Mitteilung an alle (Sven, Verwaltung) ----------
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
const uuid = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const k = await schluessel();
    webpush.setVapidDetails(APP, k.oeffentlich, k.privat);
    const b = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    let raus = 0;
    if (Number.isInteger(b.nachricht)) raus = await chatNachricht(b.nachricht);
    else if (b.ortfrage) raus = await ortFrage();
    else if (b.rundruf) raus = await rundrufe();
    else if (b.warten) raus = await wartendeSenden();
    else if (["wunsch_neu", "wunsch_dabei", "wunsch_gebucht", "wunsch_preis"].includes(b.ereignis) && uuid(b.wunsch)) raus = await wunschEreignis(b.ereignis, b.wunsch, uuid(b.wer));
    else if (b.ereignis === "reise" && uuid(b.reise)) raus = await reiseEreignis(b.reise);
    else if (b.ereignis === "ort" && uuid(b.person)) raus = await ortEreignis(b.person);
    else if (b.ereignis === "neu_dabei" && uuid(b.person)) raus = await neuDabei(b.person);
    else if (b.ereignis === "anfrage" && uuid(b.von) && uuid(b.an)) raus = await anfrage(b.von, b.an);
    return new Response(JSON.stringify({ ok: true, raus }), { headers: { "Content-Type": "application/json", ...CORS } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, fehler: String(e) }), { status: 500, headers: { "Content-Type": "application/json", ...CORS } });
  }
});
