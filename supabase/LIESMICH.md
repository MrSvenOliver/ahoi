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
