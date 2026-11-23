# Ahoi – Fahrplan

## Phase 0 – Prototyp (fertig)
- [x] Konzept, Anforderungen, Ablagesystem, Logo, App-Icons
- [x] Prototyp online mit Beispieldaten: https://mrsvenoliver.github.io/ahoi/prototyp/
- [x] Drei Oberflächen (Modern, Mission, Abenteuer), drei Sprachen (DE, EN, SK)
- [x] Karte, Wer ist wo?, Reisen, Chat mit Übersetzung, Ideen, Familie, Profil

## Beta-Start: Schritte bis zum Einladen der Freunde
Entschieden am 23.11.2026 (A + C + E): Anmeldung zuerst nur mit E-Mail-Code; zuerst gehen Anmeldung, Profilfoto, Standort, „Wer ist wo?“ und Einladungen live, der Rest bleibt vorerst Beispieldaten; Claude richtet Supabase im Browser ein, Sven meldet sich dafür einmal an.

- [x] Datenbank-Grundlagen geschrieben und geprüft: `supabase/01-grundlagen.sql` (Profile, Einladungen mit Freigabe, Geistermodus, private Profilbilder, Sicherheitsregeln)
- [ ] Supabase-Projekt anlegen (Frankfurt), Grundlagen ausführen, E-Mail-Code einschalten, Sven als Admin
- [ ] App an Supabase anbinden: Anmeldung, erster Start, Foto, Standort, „Wer ist wo?“, Einladungen
- [ ] Test mit Sven, dann 2–3 Freunde

1. **Datenbank und Konten:** Supabase-Projekt (kostenlos, Server in Frankfurt), Tabellen, Sicherheitsregeln (jeder sieht nur seine Freunde), Speicher für Profilbilder
2. **Anmeldung:** E-Mail-Code; Google später oder sofort (braucht ein Google-Cloud-Konto)
3. **Einladungen:** Einladungslink, Sven gibt jede Person frei; erster Start: Name, Foto, Sprache, Standort-Erlaubnis, Anleitung „Zum Home-Bildschirm“
4. **Profil und Standort:** Foto hochladen (zugeschnitten, verkleinert), Status-Satz; Standort beim Öffnen der App aktualisieren (Stadt-genau), Geistermodus
5. **Echte Daten:** Wer ist wo?, Reisen und Treffer, Ideen (Link-Vorschau über eine Server-Funktion), Chat in Echtzeit, Übersetzung (DeepL API Free)
6. **Mitteilungen:** Push auf iPhone (nur wenn die App auf dem Home-Bildschirm liegt, ab iOS 16.4) und Android
7. **Feedback und Verwaltung:** Feedback-Liste und Admin-Bereich für Sven, kurzer Datenschutz-Hinweis mit Zustimmung, wöchentliche Sicherung und Wachhalte-Aufruf für Supabase
8. **Beta-Start:** zuerst 2–3 Freunde, dann bis 10

## Später
- Familien-Zugang mit echten Einladungen, Netzwerk („Kenne ich“)
- KI-Funktionen, Apple-Login und App Store, offizieller Name
