# Nomad App – Anforderungen (Stand 22.11.2026)

Gesammelte Wünsche und Entscheidungen von Sven. Gebaut wird erst, wenn die Anforderungen vollständig geklärt sind.

## Rahmen
- Testphase über Wochen/Monate, nur auf Einladung, anfangs max. 10 Leute
- Skalierbarkeit im Hinterkopf: später evtl. App Store und weitere Sprachen
- Sprache: Deutsch und Englisch umschaltbar
- Fast alle nutzen iPhone, mindestens eine Person Android; zusätzlich normale Website für Desktop
- Interner Arbeitsname: Ahoi
- Logo: A Kompassrose mit zwei Pins (Schatzkarten-Stil, ohne Text); Entwürfe heißen ahoi_logo_a-kompass_01.png usw., Endstand ahoi_logo_master.png
- Offizieller Name: später; soll "Nomad" enthalten und wie ein Name klingen ("Nomadi", "Nomadia", "Nomado" bereits vergeben)
- Kartenstil: A Schatzkarte (Pergament, Sepia, handgezeichnete Küsten, Kompassrose), modern und schön integriert, wenige Knöpfe, übersichtlich
- Supabase-Keepalive: wöchentlicher automatischer Aufruf über GitHub Actions

## Design
- Schatzkarte nur in Farben und Logo: Pergament, Sepia, Terrakotta, Ozeanblau, Gold, Kompass-Logo
- Alles andere modern: klare Fenster, moderne Schrift, keine Papier-Textur, keine Zierwellen
- Schrift der App: Plus Jakarta Sans; Schriftzug "Ahoi" in Fraunces
- Kartenstil wählt jeder selbst: A Pergament, B Atlas modern, C Nacht-Gold; Standard: A; kein automatischer Wechsel
- Logo oben links rund in der runden Leiste
- Karte füllt immer den ganzen Bildschirm, keine leeren Ränder
- Dunkle Ansicht nur über Kartenstil C (Nachtblau mit Gold), kein automatischer Dunkelmodus
- Animationen lebendig: Pins ploppen auf, Reiselinien zeichnen sich, Kompass dreht sich beim Laden
- Darf nicht ruckeln: Vektorkarte über den Grafikchip, nur flüssige Animationsarten; Prüfung über den Karten-Prototyp

## Aufbau der App
- Leiste unten: Karte · Reisen · Chat · Ideen
- Profil als rundes Foto oben rechts; dort auch Kartenstil, Mitteilungen, Privatsphäre, Paar verknüpfen, Jemanden vorschlagen, Feedback

## Kartengenauigkeit (feste Regel, kein Spielraum)
- Echte Kartendaten aus OpenStreetMap für Küsten, Grenzen und Städte; der Schatzkarten-Look entsteht nur über Farben, Linien und Schrift
- Nichts wird von Hand nachgezeichnet oder verschoben
- Länderfarben und Grenzlinien aus demselben Datensatz, damit sie deckungsgleich sind
- Entfernungen geodätisch auf dem Erdellipsoid berechnet (auf wenige Meter genau)
- Zoom von der ganzen Welt bis Straßenebene
- Ortsnamen in der Sprache des iPhones
- Liegen Pins übereinander, zeigt ein gemeinsamer Pin die Gesichter leicht überlappend plus die Anzahl der Personen
- Kartenform: flache Weltkarte (wie Google Maps), kein Globus; Lage, Grenzen und Entfernungen bleiben exakt, nur die Flächen nahe den Polen wirken größer als in Wirklichkeit

## Profil und Login
- Nur echtes Profilbild (Foto-Upload), Pins zeigen das Foto
- Login: E-Mail-Code + Google; Apple-Login später mit dem App-Store-Schritt (Apple-Entwicklerkonto)
- Paare: einer fragt an, der andere bestätigt; keine Frage beim Anmelden; Herz erscheint automatisch nur, wenn beide am selben Ort sind; keine Verbindungslinie auf der Karte, Entfernungen stehen in „Wer ist wo“
- Freunde am selben Ort: gemeinsamer Pin mit 🤝
- Standort-Genauigkeit Standard: Stadt (jeder kann es ändern)

## Chat
- Normaler Gruppenchat mit allen Mitgliedern
- @-Erwähnungen, Emoji-Reaktionen, Fotos/Videos, Sprachnachrichten, Ort/Pin/Airbnb teilen
- Treffen werden nur über den Chat organisiert (keine eigene Treffen-Funktion)

## Reisepläne
- Nur Ort + Zeitraum (Ankunft/Abreise), keine Angabe von Flug, Zug o. Ä.
- Vielleicht-Pläne ohne genaue Daten (gestrichelt)
- Anzeige: Ort, Zeitraum, Anzahl Nächte

## Unterkunfts-Ideenliste
- Geteilt wird ein Link: in erster Linie Airbnb (direkte Erkennung), zusätzlich jede andere Webadresse
- Auf dem iPhone: in Airbnb „Teilen → Link kopieren“, in Ahoi „Link einfügen“ (iOS erlaubt Web-Apps nicht, im Teilen-Menü zu erscheinen; Android schon)
- Aus der Link-Vorschau automatisch: Foto, Art, Ort, Bewertung, Zimmer (bei Airbnb vorhanden)
- Plätze: Vorschlag aus Airbnb (Gästezahl), die teilende Person kann weniger freigeben; „Ich wäre dabei“ zählt die freien Plätze herunter, bei voll keine Zusage mehr möglich
- Preis pro Nacht und pro Person (nach Anzahl Zusagen); Preis von der teilenden Person bestätigt/eingetragen, da Airbnb-Preise vom Zeitraum abhängen
- Sichtbarkeit pro Idee: Alle / Freundeskreis / einzelne Personen; Freundeskreise (z. B. „Lieblingsleute“) im Profil anlegen
- Kommentare (Fragen), Herz, „Ich wäre dabei“ mit Benachrichtigung an die teilende Person
- Nach Ländern sortiert

## KI
- Zum Start weglassen (zu kompliziert am Anfang); später gewünscht: Screenshots/Tickets auslesen, Treffpunkt vorschlagen, Reise- und Wohntipps, Chat-Zusammenfassung
- Ohne KI: Screenshot/Ticketfoto wird an den Reiseplan angehängt, Ort und Datum trägt man selbst ein

## Technik-Entscheidungen
- GitHub-Konto vorhanden
- Öffentliches Repository, Hosting kostenlos über GitHub Pages

## Gadgets
- Länder-Sammlung (Stempel): Länder aus eingetragenen Reisen kommen automatisch dazu, frühere Länder trägt man über ＋ nach (Suchliste)
- Keine Abzeichen
- Ortszeit der Freunde
- Countdown zum Treffen
- Status-Satz

## Netzwerk und Einladungen
- Einladungen: Mitglieder schlagen vor, Sven gibt frei
- "Kenne ich"-Verbindungen (gegenseitig bestätigt) und gemeinsame Kontakte im Profil
- Ziel: Nomaden-Netzwerk kann wachsen

## Benachrichtigungen
- Treffer-Alarm: jeder stellt Nähe selbst ein (Stadt / Region / Land)
- Push-Arten: neue Chat-Nachricht, jemand in der Nähe, neuer Reiseplan, neue Unterkunfts-Idee
- Jeder wählt selbst frei, welche Push-Arten er bekommt (beliebige Kombination)

## Feedback und Admin
- Feedback-Button mit Screenshot-Anhang, Push an Sven, Feedback-Liste nur für Sven (Status offen/erledigt)
- Admin-Rechte für Sven: Mitglieder entfernen/sperren, Nachrichten löschen, Aktivitätsübersicht

## Datensicherung
- Komplette Kopie im Ordner Schreibtisch/Ahoi App auf Svens MacBook
- Zweite Kopie im GitHub-Repository
- Google Drive optional, nur wenn ausschließlich Sven Zugriff hat; wenn vermeidbar, auch ok
