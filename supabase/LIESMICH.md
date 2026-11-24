# Datenbank (Supabase)

- Projekt: `ahoi` in der Organisation „Ahoi“, kostenloser Tarif, Server in Frankfurt (eu-central-1)
- Adresse: https://zsmulyttciqruuqrcebv.supabase.co
- Öffentlicher Schlüssel für die App (darf im Browser stehen, die Sicherheitsregeln schützen die Daten): `sb_publishable_o5czNn9EsdZkQzMapyWBtw_QooxP6Zt`
- Der geheime Schlüssel und das Datenbank-Passwort stehen nur im Supabase-Dashboard, nie in diesem Repository
- Anmeldung bei Supabase: über Svens GitHub-Konto

## Einstellungen
- Anmeldung mit E-Mail und Passwort, Bestätigungsmail aus (die App verschickt keine E-Mails)
- Registrierung nur mit gültigem Einladungslink (siehe `01-grundlagen.sql`); das erste Konto wird Admin
- Tabellen werden nicht automatisch für die App freigegeben; Freigaben stehen am Ende von `01-grundlagen.sql`

## Dateien
- `01-grundlagen.sql`: Profile, Einladungen, Fotos, Sicherheitsregeln (am 23.11.2026 eingespielt)
- `02-verwaltung.sql`: Admin setzt ein neues Startpasswort, wenn jemand sein Passwort vergessen hat
- `03-vorab-einladungen.sql`: persönliche Einladungen von Sven (sofort frei, 30 Tage, lebenslang kostenlos)
- `04-reisen-feedback.sql`: Reisen (fest oder vielleicht) und Feedback mit Screenshots
- `05-familie.sql`: Familien-Zugang, Orte nur noch über die geschützte Ansicht
- `06-paare-gruppen-laender.sql`: Paare, Reisegruppen („Reist ihr zusammen?“) und besuchte Länder im Profil
- `07-orte-verlauf.sql`: Orte-Verlauf (für Rückblicke) und „Pionier“
- `08-chat.sql`: Chat (Alle, Gruppen, Einzelchats) mit Realtime
- `09-status-push-emoji.sql`: Status gilt 24 Stunden, Gruppen-Emoji, Push (Abos, stumme Chats, Trigger an die Edge Function, tägliche Ort-Frage über pg_cron)
- `10-push-ort.sql`: eigener Schalter für die monatliche Nachfrage zum Ort
- `11-mitteilung-an-alle.sql`: Mitteilung an alle (nur Admin), sofort oder geplant; pg_cron prüft alle 5 Minuten
- `12-chat-fotos.sql`: Fotos im Chat (privater Speicher „chatfotos“, nur für Leute im Chat)
- `13-wishlist-links.sql`: Wishlist (Unterkünfte mit „Ich wäre dabei“, Gebucht → Reise, Ortstipps) und Social-Media-Links im Profil
- `14-wishlist-gaeste.sql`: maximale Gästezahl aus der Airbnb-Vorschau
- `functions/vorschau/index.ts`: Edge Function „vorschau“ (Titel und Bild eines geteilten Links; „Verify JWT“ an, nur für angemeldete Mitglieder)
- `functions/push/index.ts`: Edge Function „push“ (im Dashboard unter Edge Functions angelegt; „Verify JWT“ aus, weil die Datenbank sie ohne Anmeldung aufruft; sie erzeugt ihre Push-Schlüssel selbst)

## Betrieb
- Wachhalten: `.github/workflows/wachhalten.yml` (Montag und Donnerstag)
- Sicherung: im privaten Repository `ahoi-backup`, jeden Sonntag, braucht das Geheimnis `SUPABASE_DB_URL`
