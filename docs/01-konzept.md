> Recherche-Stand vom 22.11.2026. Verbindlich sind 02-anforderungen.md und 03-entscheidungen.md.

# Nomad App – Konzept und Technik-Recherche

Stand: 22.11.2026

## 1. Kurz zusammengefasst

- Die App wird eine **Progressive Web App (PWA)**: eine Webseite, die sich wie eine App auf dem Home-Bildschirm speichern lässt, mit eigenem Icon, Vollbild und Push-Nachrichten. Ein Link reicht, kein App Store.
- **Code und Hosting:** GitHub-Repository, veröffentlicht über **GitHub Pages** (kostenlos, eigene Domain möglich).
- **Datenbank, Login, Chat:** **Supabase** (kostenloser Plan reicht für eine Freundesgruppe). Enthält Login per E-Mail-Code, Datenbank mit Geo-Funktionen (PostGIS), Echtzeit-Chat und Serverfunktionen für Push.
- **Karte:** **MapLibre GL JS** mit Kacheln von **OpenFreeMap** (kostenlos, kein API-Key, keine Cookies). Länder werden über eine Länder-GeoJSON eingefärbt. Google Maps nur optional für Ortssuche und „Route öffnen“.
- **Wichtigste technische Grenze:** Eine PWA kann den Standort nur abfragen, wenn die App geöffnet ist. Hintergrund-Tracking geht nur mit einer echten App (später per Capacitor aus demselben Code machbar).
- Deshalb ist neben dem aktuellen Standort die **Reiseplanung** („ab 3.12. in Lissabon“) das zweite Kernstück: Überschneidungen von Plänen findet die App auch ohne Live-Tracking.

## 2. Funktionen für den Start (MVP)

1. **Einladung per Link** – nur wer den Link mit Einladungscode hat, kann sich registrieren.
2. **Login mit E-Mail-Code** (6-stelliger Code), Handynummer optional als Kontaktfeld.
3. **Profil:** Name, Foto, eigene Farbe, optional Partner/Partnerin verknüpfen (Paar).
4. **Standort teilen:** Button „Ich bin hier“ + automatische Aktualisierung beim Öffnen der App. Genauigkeit wählbar: nur Land / Stadt / genau.
5. **Weltkarte:** Länder eingefärbt, Pins mit Profilbildern, Paar-Darstellung (siehe Abschnitt 4).
6. **Distanzen:** Liste „Wer ist wie weit von mir entfernt“, sortiert nach Entfernung.
7. **Reisepläne:** Ort + Zeitraum eintragen, Zeitleiste aller Freunde.
8. **Treffer-Alarm:** Push-Nachricht, wenn zwei oder mehr Leute gleichzeitig nah beieinander sind oder sein werden.
9. **Chat:** Gruppenchat für alle + Direktnachrichten + automatischer Chat für einen Treffer („Ihr seid beide in Portugal“).
10. **Geistermodus:** Standort vorübergehend verbergen.

Später: Treffen vorschlagen mit Kalendereintrag, Länder-Statistik („wer war wo“), Fotos pro Treffen, echte App im App Store.

## 3. Technik-Aufbau

| Baustein | Empfehlung | Warum |
|---|---|---|
| Frontend | HTML/CSS/JavaScript mit **Vite** und **Svelte** (oder reines JS) | Klein, schnell, gut für Handy; Claude kann es direkt bauen |
| App-Hülle | Web App Manifest + Service Worker | Home-Bildschirm-Icon, Vollbild, Offline-Start, Push |
| Hosting | **GitHub Pages**, Deploy automatisch über GitHub Actions | Kostenlos, 1 GB Seitengröße, 100 GB Traffic/Monat (weich) – mehr als genug |
| Backend | **Supabase** (Postgres + PostGIS, Auth, Realtime, Edge Functions) | Alles in einem, gratis bis 50.000 aktive Nutzer/Monat und 500 MB Datenbank |
| Karte | **MapLibre GL JS** + **OpenFreeMap** | Keine Kosten, keine Limits, kein Key |
| Länderformen | Natural-Earth-Länder als GeoJSON (eigene Datei im Repo) | Zum Einfärben der Länder |
| Land aus Koordinaten | **country-coder** (läuft offline im Browser) | Kein externer Dienst, Standort verlässt das Handy nur gerundet |
| Stadtname | **offline-geocode-city** (217 kB, offline) oder Supabase-Funktion | Stadt ohne Abfragen bei Google/OSM |
| Ortssuche (Reisepläne) | Photon/Nominatim (OSM) oder Google Places | Nominatim erlaubt max. 1 Anfrage pro Sekunde für die ganze App, für eine Freundesgruppe genug |
| Push | Web Push (VAPID) aus einer Supabase Edge Function | Funktioniert auf Android, Desktop und iPhone ab iOS 16.4 |
| Später echte App | **Capacitor** + Plugin @capgo/background-geolocation (kostenlos) | Hintergrund-Standort, gleicher Code |

### Datenbank (vereinfacht)

- `profiles` – Name, Foto, Farbe, Handy (optional), Paar-ID
- `couples` – zwei Profile, Paarfarbe
- `locations` – Profil, Koordinate (gerundet je nach Genauigkeit), Stadt, Ländercode, Zeitpunkt
- `plans` – Profil, Ort, Land, von/bis
- `rooms` / `messages` – Chats
- `push_subscriptions` – Geräte für Push
- `invites` – Einladungscodes

Zugriffsregeln (Row Level Security): Nur eingeloggte Mitglieder der Gruppe sehen Standorte. Jeder kann nur seine eigenen Daten ändern.

## 4. Weltkarte und Paar-Logik

**Länder einfärben**
- Land ist eingefärbt, sobald mindestens eine Person dort ist.
- Bei einer Person: Land in ihrer Farbe.
- Bei mehreren Personen im selben Land: Land in neutraler Akzentfarbe, Pins zeigen, wer dort ist (Avatar-Stapel mit Zahl).
- Hinweis: Wenn jede Person eine eigene Farbe hat, wird es ab ca. 8–10 Leuten unübersichtlich. Deshalb tragen die Pins die Hauptinformation, die Länderfarbe zeigt „hier ist jemand“.

**Paare**
- Zusammen am selben Ort (unter ca. 50 km): ein gemeinsamer Pin mit Doppel-Avatar und kleinem Paar-Symbol.
- Getrennt: zwei Pins in der Paarfarbe, verbunden mit einer gestrichelten Linie, darauf die Distanz („2.340 km“).
- In der Liste: „Alex & Sam – zusammen in Spanien“ oder „Alex in Spanien · Sam in der Slowakei (1.950 km)“.

**Distanz**
- Luftlinie per Haversine-Formel (im Browser) bzw. PostGIS `ST_Distance` (in der Datenbank).
- Anzeige in km, optional ungefähre Flugzeit.

## 5. Standort: was technisch geht

- Die App fragt beim Öffnen einmal nach dem Standort (Geolocation-API) und speichert ihn.
- Im Hintergrund kann eine Web-App auf dem iPhone keinen Standort abfragen; Background Sync wird auf iOS ebenfalls nicht unterstützt.
- Lösung für die Startphase:
  - Automatische Aktualisierung bei jedem Öffnen.
  - Push-Erinnerung, wenn der Standort älter als z. B. 5 Tage ist („Wo bist du gerade?“).
  - Reisepläne eintragen, damit Treffer auch vorausschauend gefunden werden.
- Für Nomaden reicht meist die Genauigkeit „Stadt“. Genaue Koordinaten nur, wenn jemand das aktiv will.

## 6. Treffer-Alarm („zufällig in der Nähe“)

- Bei jeder neuen Standortmeldung oder jedem neuen Reiseplan berechnet eine Datenbankfunktion die Abstände zu allen anderen.
- Drei Stufen (einstellbar):
  - **Gleiche Stadt** (unter 50 km) – Push an beide sofort
  - **Gleiche Region** (unter 300 km)
  - **Gleiches Land**
- Reisepläne: Überschneidung von Zeitraum und Ort → „Ihr seid vom 5. bis 8.12. beide in Lissabon“.
- Aus jedem Treffer entsteht automatisch ein kleiner Chat für die Beteiligten mit Buttons „Treffen vorschlagen“ und „In Google Maps öffnen“.
- Schutz vor Spam: pro Paar von Personen höchstens ein Alarm pro Ort und Woche.

## 7. Kommunikation

- Gruppenchat und Direktnachrichten über Supabase Realtime (Nachrichten erscheinen sofort).
- Push bei neuen Nachrichten, wenn die App geschlossen ist.
- Zusätzlich Schnellknöpfe: WhatsApp-Chat öffnen (wa.me-Link mit der hinterlegten Nummer), Anruf.
- Wer lieber in WhatsApp bleibt, kann die App nur für Karte und Alarm nutzen.

## 8. Anmeldung

- Supabase bietet Magic Links, E-Mail-Codes und SMS-Codes.
- Empfehlung: **E-Mail-Code statt Magic Link.** Auf dem iPhone hat die Home-Bildschirm-App einen eigenen, getrennten Speicher. Ein Magic Link aus der Mail öffnet sich in Safari, dort wäre man eingeloggt, in der App aber nicht. Ein 6-stelliger Code wird direkt in der App eingegeben.
- SMS-Login erst später: braucht einen kostenpflichtigen Anbieter wie Twilio. Die Handynummer wird beim Start nur als Kontaktfeld gespeichert.
- Für zuverlässige Mails eigenen SMTP-Versand einrichten (z. B. Resend oder Brevo), da der Standard-Versand von Supabase stark begrenzt ist.

## 9. Installation auf Handy und Desktop

- **iPhone:** Link in Safari öffnen → Teilen → „Zum Home-Bildschirm“. Seit iOS 26 öffnet sich jede so gespeicherte Seite standardmäßig als Web-App. Einen automatischen Installations-Knopf gibt es auf dem iPhone nicht, daher zeigt die App beim ersten Besuch eine kurze Anleitung mit Bildern.
- **Android:** Chrome zeigt „App installieren“, ein Tipp genügt.
- **Desktop:** gleiche Adresse im Browser, Layout mit Karte links und Liste/Chat rechts. In Chrome/Edge auch als Desktop-App installierbar.
- **Push auf dem iPhone** nur nach Installation auf dem Home-Bildschirm, und die Erlaubnis muss per Tipp auf einen Knopf angefragt werden.

## 10. Konnektoren und Dienste

**Für die Entwicklung (Claude + GitHub)**
- GitHub-Repository in Claude Code einbinden: Claude schreibt Code, macht Commits und Pull Requests.
- GitHub Actions: baut und veröffentlicht die App bei jeder Änderung automatisch auf GitHub Pages.
- Supabase-GitHub-Integration: Datenbank-Änderungen (Migrationen) liegen im Repo und werden mit ausgerollt.

**In der App**
- **OpenFreeMap / MapLibre:** Karte (kostenlos).
- **Google Maps:** optional. Knopf „In Google Maps öffnen“ ist ein einfacher Link und kostet nichts. Eingebettete Google-Karten oder Ortssuche über Google kosten ab bestimmten Mengen Geld; seit März 2025 gibt es pro Dienst ein Gratiskontingent (z. B. 10.000 Aufrufe/Monat bei den Basisdiensten). Für eine Freundesgruppe kostenlos, braucht aber ein Google-Cloud-Konto mit Zahlungsmethode.
- **Google Calendar / Apple Kalender:** Treffen als .ics-Datei oder Google-Kalender-Link exportieren (kein API-Key nötig).
- **WhatsApp:** wa.me-Links zu Personen.
- **Flugdaten (später):** Reiseplan aus einer Buchungsmail oder einer Flugnummer übernehmen.

## 11. Datenschutz

- Standortdaten sind personenbezogene Daten (DSGVO). Auch unter Freunden sinnvoll:
  - Einwilligung beim ersten Start, klar erklärt
  - Genauigkeit pro Person wählbar, Standard „Stadt“
  - Geistermodus
  - Konto und alle Daten mit einem Knopf löschen
  - Alte Standorte nach z. B. 30 Tagen automatisch löschen (nur der aktuelle bleibt)
- Supabase-Projekt in der EU-Region (Frankfurt) anlegen.
- OpenFreeMap setzt keine Cookies, das erspart ein Cookie-Banner.

## 12. App-Logo – Ideen

- **A:** Stilisierter Globus aus zwei Pins, die sich berühren (Treffen)
- **B:** Kompassrose, in der Mitte ein kleines Herz bzw. zwei Punkte
- **C:** Kreis aus mehreren farbigen Punkten auf einer Erdkugel (die Gruppe)
- **D:** Papierflieger, der eine Schleife um einen Pin zieht

Benötigte Größen: 192×192 und 512×512 px (Android/Manifest), 180×180 px (Apple Touch Icon), „maskable“-Variante mit Rand, Favicon.

## 13. Kosten

| Posten | Kosten |
|---|---|
| GitHub + GitHub Pages | 0 € |
| Supabase Free | 0 € |
| Karte (OpenFreeMap) | 0 € |
| E-Mail-Versand (Resend/Brevo Free) | 0 € |
| Eigene Domain (optional) | ca. 10–15 €/Jahr |
| Supabase Pro (optional) | 25 $/Monat |
| Apple Developer (nur für echte iPhone-App) | 99 $/Jahr |

**Achtung Supabase Free:** Ein Projekt pausiert nach 7 Tagen ohne Datenbank-Aktivität. Bei aktiver Nutzung kein Problem; als Absicherung reicht ein wöchentlicher automatischer Aufruf per GitHub Actions oder später der Pro-Plan.

## 14. Fahrplan

1. **Phase 1 – Grundgerüst (1 Sitzung):** Repo, GitHub Pages, Manifest, Icon, Installations-Anleitung, Karte mit Ländern.
2. **Phase 2 – Konten und Standort:** Supabase, Login per E-Mail-Code, Profil, Standort teilen, Pins und Länderfarben, Distanzliste, Paare.
3. **Phase 3 – Reisepläne und Treffer:** Pläne, Zeitleiste, Treffer-Berechnung.
4. **Phase 4 – Push und Chat:** Web Push, Gruppenchat, Direktnachrichten, Treffer-Chats.
5. **Phase 5 – Feinschliff:** Desktop-Layout, Datenschutz-Einstellungen, Statistiken.
6. **Phase 6 (optional):** Echte App mit Capacitor für Hintergrund-Standort.

## 15. Offene Entscheidungen

**Name der App**
- A: Nomad Circle
- B: Wo bist du?
- C: Crossings
- D: eigener Vorschlag

**Technik Frontend**
- E: Svelte (empfohlen, übersichtlicher bei wachsender App)
- F: reines HTML/JS (einfacher, wird aber ab Chat und Push unübersichtlich)

**Login**
- G: nur E-Mail-Code (empfohlen)
- H: E-Mail-Code + später SMS

**Karte**
- I: OpenFreeMap (kostenlos, empfohlen)
- J: Google Maps (vertrauter Look, Google-Cloud-Konto nötig)

**Weitere Fragen**
- Wie viele Leute ungefähr am Anfang?
- Eigene Domain gewünscht?
- Sprache der App: Deutsch, Englisch oder beides?
- GitHub-Konto vorhanden, und soll das Repo öffentlich oder privat sein? (GitHub Pages ist bei privaten Repos nur mit bezahltem GitHub-Plan möglich.)
