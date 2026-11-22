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
- Paare: einer fragt an, der andere bestätigt
- Standort-Genauigkeit Standard: Stadt (jeder kann es ändern)

## Chat
- Normaler Gruppenchat mit allen Mitgliedern
- @-Erwähnungen, Emoji-Reaktionen, Fotos/Videos, Sprachnachrichten, Ort/Pin/Airbnb teilen
- Treffen werden nur über den Chat organisiert (keine eigene Treffen-Funktion)

## Reisepläne
- Kalender-Auswahl wie bei Booking/Airbnb
- Screenshot hochladen (z. B. Airbnb-Buchung) oder Flugticket fotografieren – KI liest aus
- Flugnummer + Datum eingeben (wie Flighty)
- Vielleicht-Pläne (unsicher markiert)

## Unterkunfts-Ideenliste
- Airbnbs und andere Unterkünfte teilen, mit Links direkt zu Airbnb, nach Ländern sortiert
- Optional Zeitraum oder frei/flexibel
- Herz/Abstimmung, "Ich wäre dabei" mit eigenem Wunsch-Zeitraum, Kommentare, Kostenrechner (pro Nacht/pro Person)

## KI
- Zum Start weglassen (zu kompliziert am Anfang); später gewünscht: Screenshots/Tickets auslesen, Treffpunkt vorschlagen, Reise- und Wohntipps, Chat-Zusammenfassung
- Ohne KI: Screenshot/Ticketfoto wird an den Reiseplan angehängt, Ort und Datum trägt man selbst ein

## Technik-Entscheidungen
- GitHub-Konto vorhanden
- Öffentliches Repository, Hosting kostenlos über GitHub Pages

## Gadgets
- Länder-Sammlung (Stempel im Reisepass-Look)
- Ortszeit der Freunde
- Countdown zum Treffen
- Abzeichen
- Status-Satz am Pin

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
