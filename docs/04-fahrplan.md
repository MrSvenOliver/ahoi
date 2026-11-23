# Ahoi – Fahrplan

## Phase 0 – Prototyp (fertig)
- [x] Konzept, Anforderungen, Ablagesystem, Logo, App-Icons
- [x] Prototyp online mit Beispieldaten: https://mrsvenoliver.github.io/ahoi/prototyp/
- [x] Drei Oberflächen (Modern, Mission, Abenteuer), drei Sprachen (DE, EN, SK)
- [x] Karte, Wer ist wo?, Reisen, Chat mit Übersetzung, Ideen, Familie, Profil

## Beta-Start: Schritte bis zum Einladen der Freunde
Entschieden am 23.11.2026 (A + C + E, danach geändert): Anmeldung mit E-Mail und Passwort ohne Bestätigungsmail; Einladung per Link, Sven gibt frei; zuerst gehen Anmeldung, Profilfoto, Standort, „Wer ist wo?“ und Einladungen live, der Rest bleibt vorerst Beispieldaten; Claude richtet Supabase im Browser ein, Sven meldet sich dafür einmal an.

- [x] Datenbank-Grundlagen geschrieben und geprüft: `supabase/01-grundlagen.sql` (Profile, Einladungslinks mit Freigabe, erstes Konto wird Admin, Geistermodus, private Profilbilder, Sicherheitsregeln)
- [x] Supabase-Projekt angelegt (Frankfurt, kostenlos), Grundlagen eingespielt und geprüft, Bestätigungsmail aus (23.11.2026)
- [x] Echte App unter https://mrsvenoliver.github.io/ahoi/ (Prototyp bleibt unter …/ahoi/prototyp/): Anmeldung, Registrierung mit Einladungslink, Warten auf Freigabe, erster Start mit Foto und Standort, echtes „Wer ist wo?“, Einladen, Verwaltung (Freigeben, Ablehnen, Startpasswort, Entfernen), Passwort ändern, Geistermodus
- [x] Sven registriert sich als Erster über …/ahoi/?einladung=start (wird Admin)
- [ ] Test mit Sven, dann 2–3 Freunde

1. **Datenbank und Konten:** Supabase-Projekt (kostenlos, Server in Frankfurt), Tabellen, Sicherheitsregeln (jeder sieht nur seine Freunde), Speicher für Profilbilder
2. **Anmeldung:** E-Mail und Passwort; Google später
3. **Einladungen:** Einladungslink von jedem Mitglied, Sven gibt jede Person frei; erster Start: Name, Foto, Sprache, Standort-Erlaubnis, Anleitung „Zum Home-Bildschirm“
4. **Profil und Standort:** Foto hochladen (zugeschnitten, verkleinert), Status-Satz; Standort beim Öffnen der App aktualisieren (Stadt-genau), Geistermodus
5. **Echte Daten:** Wer ist wo?, Reisen und Treffer, Ideen (Link-Vorschau über eine Server-Funktion), Chat in Echtzeit, Übersetzung (DeepL API Free)
6. **Mitteilungen:** Push auf iPhone (nur wenn die App auf dem Home-Bildschirm liegt, ab iOS 16.4) und Android
7. **Feedback und Verwaltung:** Feedback-Liste und Admin-Bereich für Sven, kurzer Datenschutz-Hinweis mit Zustimmung, wöchentliche Sicherung und Wachhalte-Aufruf für Supabase
8. **Beta-Start:** zuerst 2–3 Freunde, dann bis 10

## Erledigt nach dem Beta-Start
- [x] Sven registriert, fünf persönliche Einladungen verschickt (23.11.2026)
- [x] Echte Reisen mit Treffern, echtes Feedback mit Screenshot, Wachhalten, wöchentliche Sicherung (läuft seit 23.11.2026, erste Sicherung im Backup-Repository angekommen)

- [x] Familien-Zugang und „Neu dabei“-Hinweis (23.11.2026)
- [x] Länder nach den 195 Staaten, kein Freirubbeln, „Am selben Ort“, kein automatisches „zusammen“, Ortssuche mit Tokio & Co. und ganzen Ländern; Reisegruppen und Steckbrief im Prototyp (23.11.2026)
- [x] Paare, Reisegruppen, Meine Länder und Steckbrief in der echten App (SQL 06), „Neu in Ahoi“ nach jedem Update (23.11.2026)
- [x] Orte-Verlauf mit Pionier (SQL 07) und Chat mit Alle, Gruppen und Einzelchats (SQL 08) (23.11.2026)
- [x] Live-Test mit echten Testkonten (Nomade, Familie, Reise, Treffer, Feedback mit Bild, Geistermodus, Familie pausieren), danach Testdaten gelöscht; behoben: Absturz der Treffer in der Familienansicht, Standort ohne Ländercode, „1 Freunde“, doppelter Punkt im Treffer, Kürzel „DU“ statt eigener Initialen (23.11.2026)

## Als Nächstes in der echten App
- Freundeskreise in der Datenbank (bisher nur auf dem Gerät)
- Chat: Übersetzung (DeepL), Fotos, Orte, Sprachnachrichten
- Ideen und Ortstipps; Rückblicke aus dem Orte-Verlauf (sobald genug Daten da sind)
- Mitteilungen (Push)
- Freundschaften statt „alle sehen alle“, sobald die App wächst (Vorschlag: über Einladungslinks + QR-Code)

## Später
- Netzwerk („Kenne ich“)
- KI-Funktionen, Apple-Login und App Store, offizieller Name
