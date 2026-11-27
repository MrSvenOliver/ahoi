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
- `15-freunde-qr.sql`: Freundschaften im Hintergrund (alle sehen vorerst weiter alle), Ahoi-Name, persönlicher QR-Code (gleichzeitig Einladung, Sven gibt frei), Vorschläge „Kennst du sie?“
- `16-push-wahl.sql`: Push-Auswahl im Profil (Chat aus/Einzel+Gruppen/alle, Wishlist, Nähe, Treffer, Reisen, neue Leute, Ruhezeit 22–8 Uhr mit Warteschlange), Trigger für die Ereignisse; danach die Edge Function „push“ neu veröffentlichen (erst nach SQL 16!)
- `17-chat-ohne-alle.sql`: Der Chat „Alle“ ist raus (niemand kann mehr hineinschreiben, die App blendet ihn aus). Push für Chats: aus, einzel, gruppen oder alle; danach die Edge Function „push“ neu veröffentlichen (erst nach SQL 17!)
- `18-kreise-ohne-alle.sql`: Chat „Alle“ endgültig gelöscht; Freundeskreise in der Datenbank (Tabelle `kreis`, nur für die Person sichtbar, der der Kreis gehört)
- `19-ohne-kreise.sql`: Freundeskreise wieder entfernt (Tabelle `kreis` gelöscht)
- `20-wishlist-dabei-daten.sql`: Wer etwas auf die Wishlist stellt, kann selbst dabei sein oder nicht (`ersteller_dabei`); Zeitraum änderbar mit Push „Neue Daten“; Zusage = Reise in „Reisen“ (`reise.wunsch`, wandert bei neuen Daten mit); Profil-Link Calendly; danach die Edge Function „push“ neu veröffentlichen
- `21-wishlist-zimmer.sql`: Wer dabei ist, gibt Personen und Schlafzimmer an (`wunsch_dabei.personen/zimmer`, `wunsch.ersteller_personen/zimmer`); Plätze zählen Personen; danach die Edge Function „push“ neu veröffentlichen
- `22-wishlist-begleitung.sql`: Begleitung bei Zusagen (`begleitung`, `ersteller_begleitung`: Ahoi-Mitglied voll dabei mit Reise und Chat, oder Gast mit Namen); Reise für die Person, die teilt, gleich beim Anlegen
- `23-hilton.sql`: Wishlist-Reiter „Hilton“ (Tabellen `hilton` und `hilton_herz`): alle Mitglieder teilen Hilton-Hotels mit bis zu 5 Highlights, ohne Daten; ändern/löschen nur, wer geteilt hat, oder Admin
- `24-fehler-mitgenommen.sql`: Fehler aus der App (`app_fehler`, nur über `fehler_melden`, lesen nur Admin), Push „nimmt dich mit“ für Begleitung, Hilton ohne Pflicht-Link und mit eigenem Foto (`hilton.foto`); danach die Edge Function „push“ neu veröffentlichen
- `25-hilton-recherche.sql`: Hilton mit automatischer Recherche (Status, Kategorie, Lounge, Preis, Top 5 je Sprache); Mitglieder schreiben nur Name und Ort; (die Edge Function „hilton“ wurde mit 26 wieder abgeschafft)
- `26-hilton-chat.sql`: Hilton-Recherche über Claude im Chat: Mitglieder dürfen nur „neu recherchieren“ anfragen, geänderte Hotels warten wieder, Mitteilung „🏨 Hilton-Hotel wartet“ an den Admin; danach die Edge Function „push“ neu veröffentlichen
- `27-wunsch-loeschen.sql`: Wishlist-Unterkunft löschen mit Wahl „Reisen behalten“ oder „für alle absagen“ (`wunsch_loeschen`), Mitteilung an alle Beteiligten; Spalte `hilton.preis_am` für das Preis-Update; danach die Edge Function „push“ neu veröffentlichen
- `28-anfragen-push.sql`: Mitteilung bei Paar-Anfrage („❤️ {Name} möchte euch als Paar verknüpfen“) und Mitreise-Anfrage („👥 {Name} sagt, ihr reist zusammen“) an die angefragte Person (Schalter „Neue Leute und Anfragen“); offene Mitreise-Anfragen innerhalb einer Reisegruppe werden gelöscht; danach die Edge Function „push“ neu veröffentlichen
- `functions/vorschau/index.ts`: Edge Function „vorschau“ (Titel und Bild eines geteilten Links; „Verify JWT“ an, nur für angemeldete Mitglieder)
- `functions/push/index.ts`: Edge Function „push“ (im Dashboard unter Edge Functions angelegt; „Verify JWT“ aus, weil die Datenbank sie ohne Anmeldung aufruft; sie erzeugt ihre Push-Schlüssel selbst)

## Betrieb
- Wachhalten: `.github/workflows/wachhalten.yml` (Montag und Donnerstag)
- Sicherung: im privaten Repository `ahoi-backup`, jeden Sonntag, braucht das Geheimnis `SUPABASE_DB_URL`
