# Nomad App – Anforderungen (Stand 22.11.2026)

Gesammelte Wünsche und Entscheidungen von Sven. Gebaut wird erst, wenn die Anforderungen vollständig geklärt sind.

## Rahmen
- Testphase über Wochen/Monate, nur auf Einladung, anfangs max. 10 Leute
- Skalierbarkeit im Hinterkopf: später evtl. App Store und weitere Sprachen
- Sprachen schon in der Beta: die komplette App auf Deutsch, Englisch oder Slowakisch; automatisch nach Handysprache (Deutsch → Deutsch, Slowakisch → Slowakisch, alles andere → Englisch); kleine Flagge am Profilknopf zeigt die Sprache, im Profil ganz oben dezent per Flagge umstellbar; Ortsnamen auf der Karte und Chat-Übersetzung folgen der Sprache; Texte der App stehen in einer eigenen Datei (texte.js), Nachrichten der Freunde bleiben im Original
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
- Profil als rundes Foto oben rechts; dort Kacheln (Freund einladen, Freundeskreise, Paar verknüpfen), Länder-Sammlung, Kartenstil, Familie, Mitteilungen, Privatsphäre

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
- Paare: einer fragt an, der andere bestätigt; keine Frage beim Anmelden; Herz erscheint automatisch nur, wenn beide am selben Ort sind; keine Verbindungslinie auf der Karte; beim Antippen einer Person erscheint nur diese Person, nie der Partner oder andere Freunde
- Freunde am selben Ort: gemeinsamer Pin mit 🤝
- Standort-Genauigkeit Standard: Stadt (jeder kann es ändern)

## Chat
- Chatliste: „Alle“ oben (nur in der Beta, kann stummgeschaltet werden), darunter Reisegruppen und Einzelchats
- Einzelchat: Person auf der Karte antippen → „Nachricht schreiben“
- Reisegruppen: selbst erstellen (Name + Personen) oder automatisch aus einem Treffer und sobald jemand bei einer Idee dabei ist
- Gedrückt halten: Einzelchat löschen (nur bei mir) · Gruppe verlassen (die anderen sehen „… hat die Gruppe verlassen“) · Stummschalten
- Übersetzung wie bei Airbnb: Original zuerst; Knopf „Übersetzen“ zeigt alle fremdsprachigen Nachrichten in der iPhone-Sprache; pro Nachricht „Übersetzt aus … · Original anzeigen“ (später DeepL API Free über Supabase, jede Übersetzung wird einmal gespeichert)
- @-Erwähnungen, Emoji-Reaktionen, Fotos/Videos, Sprachnachrichten, Ort/Pin/Airbnb teilen
- Treffen werden nur über den Chat organisiert (keine eigene Treffen-Funktion)

## Reisepläne
- Nur Ort + Zeitraum (Ankunft/Abreise), keine Angabe von Flug, Zug o. Ä.
- Vielleicht-Pläne ohne genaue Daten (gestrichelt)
- Anzeige: Ort, Zeitraum, Anzahl Nächte

## Unterkunfts-Ideenliste
- Teilen als Ein-Tipp-Ablauf: 3-Schritte-Hinweis (Airbnb öffnen → Teilen → Link kopieren) und großer Knopf „Airbnb-Link einfügen“
- Auf dem iPhone ist das Kopieren nötig (iOS lässt Web-Apps nicht im Teilen-Menü erscheinen; Android schon)
- Aus dem Link automatisch: Foto, Art, Ort, Bewertung, Schlafzimmer, Gästezahl
- Im Vordergrund der Karte: Schlafzimmer, Gäste/Plätze, freie Plätze
- Weitere Angaben freiwillig und eingeklappt: anderer Link, Notiz, Zeitraum, Preis pro Nacht (nur für den Rechner „pro Person“), Plätze begrenzen, Sichtbarkeit (Alle / Freundeskreis / Einzeln)
- „Preis ansehen“ öffnet Airbnb mit Zeitraum und Personenzahl (aktueller Preis und Verfügbarkeit kommen immer von Airbnb)
- „Ich wäre dabei“ zählt freie Plätze herunter, Benachrichtigung an die teilende Person, man kommt automatisch in die Gruppe der Idee
- „Gebucht“ (für alle, die dabei sind): trägt die Reise für alle Beteiligten ein; ohne Zeitraum öffnet sich das Reise-Formular mit dem Ort
- Nach dem Abreisetag verschwindet die Idee von selbst
- Kommentare, Herz, Filter nach Ländern

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
- Profil: Freund einladen, Freundeskreise, Paar verknüpfen als gut sichtbare Kacheln oben; „Freund einladen“ auch unten in „Wer ist wo“
- Feedback in der Beta: kleine Lasche „Feedback“ am rechten Rand auf jedem Bildschirm
- Countdown zum Treffen
- Status-Satz

## Familien-Zugang (nur zuschauen)
- Für Eltern, Geschwister u. a., die keine Nomaden sind (wie ein AirTag auf dem Bildschirm)
- Jeder Nomade lädt seine eigene Familie ein und kann sie jederzeit wieder ausschalten
- Die Familie sieht nur, wer sie eingeladen hat: Ort, Ortszeit, nächste Reise, alle geplanten Reisen und Vielleicht-Pläne
- Teilt selbst nichts und erscheint für niemanden auf der Karte
- Eigene Ansicht ohne Leiste; nächste Reise in drei Zeilen (Überschrift, Ort, Daten mit Nächten); Antippen zeigt den Ort auf der Karte
- Optional: eigenen Standort nur für sich einschalten, um die Entfernung zu sehen

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
