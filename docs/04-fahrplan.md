# Ahoi – Fahrplan

## Phase 0 – Prototyp (fertig)
- [x] Konzept, Anforderungen, Ablagesystem, Logo, App-Icons
- [x] Prototyp online mit Beispieldaten: https://mrsvenoliver.github.io/ahoi/prototyp/
- [x] Drei Oberflächen (Modern, Mission, Abenteuer), drei Sprachen (DE, EN, SK)
- [x] Karte, Wer ist wo?, Reisen, Chat mit Übersetzung, Ideen, Familie, Profil

## Beta-Start: Schritte bis zum Einladen der Freunde
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
