# Nomad App – Anforderungen (Stand 23.11.2026)

Gesammelte Wünsche und Entscheidungen von Sven. Gebaut wird erst, wenn die Anforderungen vollständig geklärt sind.

## Rahmen
- Testphase über Wochen/Monate, nur auf Einladung, anfangs max. 10 Leute
- Skalierbarkeit im Hinterkopf: später evtl. App Store und weitere Sprachen
- Sprachen schon in der Beta: die komplette App auf Deutsch, Englisch oder Slowakisch; automatisch nach Handysprache (Deutsch → Deutsch, Slowakisch → Slowakisch, alles andere → Englisch); kleine Flagge am Profilknopf zeigt die Sprache, im Profil unter „Darstellung“ als klassische Einstellungszeile (Sprache › aktueller Wert), Auswahlliste mit Haken; Ortsnamen auf der Karte und Chat-Übersetzung folgen der Sprache; Texte der App stehen in einer eigenen Datei (texte.js), Nachrichten der Freunde bleiben im Original
- Fast alle nutzen iPhone, mindestens eine Person Android; zusätzlich normale Website für Desktop
- Interner Arbeitsname: Ahoi; der Prototyp heißt auf dem Home-Bildschirm „Ahoi Test“ und hat ein blaues Symbol
- Logo: A Kompassrose mit zwei Pins (Schatzkarten-Stil, ohne Text); Entwürfe heißen ahoi_logo_a-kompass_01.png usw., Endstand ahoi_logo_master.png
- Offizieller Name: später; soll "Nomad" enthalten und wie ein Name klingen ("Nomadi", "Nomadia", "Nomado" bereits vergeben)
- Supabase-Keepalive: wöchentlicher automatischer Aufruf über GitHub Actions

## Design: drei Oberflächen
- Drei komplett eigenständige Oberflächen mit gleichem Inhalt und gleichen Funktionen: Kartenfarben, Schrift, Knöpfe, Symbole, Fensterformen, Leiste unten und Animationen sind je Stil eigen
- Wahl im Profil unter „Stil“ (mit kleinen Vorschaubildern); gemerkt auf dem Gerät; Standard für neue Nutzer: Modern
- **Modern (Standard):** klar und hell nach Apples Gestaltung in iOS 26: helle Karte mit hellblauem Meer, Apple-Schrift, ein Akzentblau; Glas wie „Liquid Glass“ (starke Unschärfe, helle Lichtkante, Schimmer) für Leiste, Knöpfe, Fenster und Symbole; Knöpfe oben als einzelne Glas-Kreise; Pins mit weißem Rand, Chat-Blasen wie bei iMessage; Bewegung: Glasflächen federn beim Öffnen, Entfernungen zählen hoch
- **Mission:** Navy-Lagezentrum im Stil der Bond-Filme: dunkles Marineblau, Cyan und Bernstein, Kennungsleiste oben („Ahoi · nur für Freunde“), feines Raster und Bildschirmlinien über der Karte, Entfernungsringe 1.000 / 2.500 / 5.000 km um den eigenen Standort, Rufnamen unter den Pins, Koordinaten- und UTC-Anzeige, Titel in Schablonenschrift (Saira Stencil), Daten in JetBrains Mono, Fließtext normal wie in einer klassischen App, eckige Formen mit Eckmarken, Radar als Startbild; Bewegung: Radarstrahl zieht über die Karte, beim Antippen erfasst ein Zielrahmen die Person
- **Abenteuer:** verspielte Schatzkarte: Pergament mit Papierkorn, Handschrift (Caveat) für Überschriften, Kompass, der sich beim Verschieben dreht, liebevoll gezeichnete Figuren auf dem Meer, jede genau einmal (Wal, Seedrache, Krake), bei jedem Öffnen in anderen Meeren; zwei verschiedene Boote (Segelschiff, Dschunke) auf wechselnden Routen, davon ist auf dem Bildschirm immer nur eines zu sehen; nie über Land (geprüft); ein paar Wellen; nur in der Weltansicht; Pins erscheinen wie mit Tinte gezeichnet, Wolkenschatten ziehen langsam über die Karte; Chat-Symbol als gezeichnete Sprechblase; Knöpfe mit Tiefe
- Logo oben links in allen Stilen; Karte füllt immer den ganzen Bildschirm
- Darf nicht ruckeln: Vektorkarte über den Grafikchip, nur flüssige Animationsarten; bei „Bewegung reduzieren“ keine Animationen

## Aufbau der App
- Überschrift der Liste: „Wer ist wo?“ (mit Fragezeichen in allen Sprachen)
- Leiste unten: Karte · Reisen · Chat · Ideen
- Profil als rundes Foto oben rechts; Reihenfolge im Profil: oben Foto, Name und Status · Status-Auswahl · Darstellung (Sprache, Stil als drei kleine Farbverläufe) · Freunde (Einladen, Freundeskreise, Partner) · Länder und Rückblicke · Familie · Privatsphäre · Mitteilungen · Konto · Mehr (Feedback)

## Kartengenauigkeit (feste Regel, kein Spielraum)
- Echte Kartendaten aus OpenStreetMap für Küsten, Grenzen und Städte; alle drei Stile entstehen nur über Farben, Linien und Schrift
- Nichts wird von Hand nachgezeichnet oder verschoben
- Länderfarben und Grenzlinien aus demselben Datensatz, damit sie deckungsgleich sind
- Entfernungen geodätisch auf dem Erdellipsoid berechnet (auf wenige Meter genau)
- Zoom von der ganzen Welt bis Straßenebene
- Ortsnamen in der Sprache des iPhones
- Liegen Pins übereinander, zeigt ein gemeinsamer Pin die Gesichter leicht überlappend plus die Anzahl der Personen
- Kartenform: flache Weltkarte (wie Google Maps), kein Globus; Lage, Grenzen und Entfernungen bleiben exakt, nur die Flächen nahe den Polen wirken größer als in Wirklichkeit

## Profil und Login
- Nur echtes Profilbild (Foto-Upload), Pins zeigen das Foto
- Login: E-Mail-Adresse und Passwort, ohne Bestätigungsmail (die App verschickt keine E-Mails); iPhone kann das Passwort im Schlüsselbund speichern und mit Face ID ausfüllen; man bleibt angemeldet, bis man sich abmeldet; Passwort im Profil änderbar; vergessenes Passwort setzt Sven im Admin-Bereich neu; E-Mail-Adresse im Profil korrigierbar; Google und Apple später
- Paare: in der Info-Karte einer Person „❤️ Wir sind ein Paar“ antippen, die andere Person bestätigt; im Profil zeigt „Partner“ den Stand; keine Frage beim Anmelden; Herz erscheint automatisch nur, wenn beide am selben Ort sind; keine Verbindungslinie auf der Karte; beim Antippen einer Person erscheint nur diese Person, nie der Partner oder andere Freunde
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

## Ortstipps
- Zweiter Reiter in „Ideen“: Unterkünfte | Tipps
- Tipp: Ort, Art (Café, Essen, Erleben, Arbeiten, Praktisches), kurzer Text; Daumen hoch von Freunden, sortiert nach Daumen
- Filter nach Ländern; in der Info-Karte einer Person „💡 3 Tipps zu Lissabon“, führt direkt zu den Tipps dieses Ortes

## KI
- Zum Start weglassen (zu kompliziert am Anfang); später gewünscht: Screenshots/Tickets auslesen, Treffpunkt vorschlagen, Reise- und Wohntipps, Chat-Zusammenfassung
- Ohne KI: Screenshot/Ticketfoto wird an den Reiseplan angehängt, Ort und Datum trägt man selbst ein

## Technik-Entscheidungen
- GitHub-Konto vorhanden
- Öffentliches Repository, Hosting kostenlos über GitHub Pages

## Gadgets
- Meine Länder: im Profil eine Zeile „Meine Länder · 12 ›“; eigene Seite mit Freirubbel-Weltkarte (besuchte Länder farbig nach Kontinent, Rest abgedeckt; Antippen rubbelt frei oder deckt ab), Fortschrittsring „x von 7 Kontinenten“, Liste nach Kontinenten, Bearbeiten über die Suchliste. Länder aus Reisen kommen automatisch dazu
- Freunde sehen in der Info-Karte „🌍 23 Länder“
- Pionier 🚩: wer als Erster aus dem Freundeskreis in einem Land war, bekommt eine Fahne in der Länderliste; kurze Meldung im Chat „Alle“. Keine Abzeichen-Sammlung
- Dein Nomadenjahr: Jahresrückblick zum Durchtippen (wie Spotify Wrapped), öffnet sich einmal von selbst zwischen 15. Dezember und 15. Januar, jederzeit über das Profil: neue Länder, Kilometer, Treffen mit Freunden, längster Aufenthalt, Pionier-Länder; Hintergrund ist die Weltkarte im gewählten Stil, besuchte Länder leuchten, die Karte schwenkt pro Seite
- Dein erstes Halbjahr: kürzerer Rückblick, öffnet sich einmal im Juli
- Freundeskreise: nur ein Filter für einen selbst (Chips „Alle · ⭐ Lieblingsleute · 🏄 Surf-Crew“ unter „Wer ist wo?“, wirkt auf Karte und Liste); anlegen im Profil mit Symbol, Name und Personen; ändern nichts daran, wer einen sieht
- Keine Abzeichen
- Ortszeit der Freunde
- „Neu dabei: Name 👋“ oben auf der Karte, wenn jemand dazugekommen ist
- „Freund einladen“ auch unten in „Wer ist wo?“
- Feedback in der Beta: kleine Lasche „Feedback“ am rechten Rand auf jedem Bildschirm
- Countdown zum Treffen
- Status zum Antippen (kurz, damit er in „Wer ist wo?“ lesbar bleibt): ☕ Lust auf Treffen · 🌱 Neu angekommen · 🔍 Suche Unterkunft · 👥 Suche Mitreisende · 💻 Arbeitsphase · 🏄 Sport · 🧗 Abenteuer · 🏡 An meiner Basis · 🔕 Nicht stören · ✏️ Eigener Text (höchstens 24 Zeichen). Nochmal antippen entfernt ihn. Sichtbar in der Info-Karte und in „Wer ist wo?“ unter dem Namen

## Familien-Zugang (nur zuschauen)
- Für Eltern, Geschwister u. a., die keine Nomaden sind (wie ein AirTag auf dem Bildschirm)
- Ein Knopf „Einladen“ fragt zuerst: 🧭 Nomaden-Freund (sieht alle Freunde, Sven gibt frei) oder 🏡 Familie (sieht nur dich, ohne Freigabe)
- Familie meldet sich nur mit Name, E-Mail und Passwort an, Profilfoto freiwillig; sie gibt keine Orte oder Reisen an
- Jeder Nomade lädt seine eigene Familie ein und kann sie jederzeit wieder ausschalten
- Die Familie sieht nur, wer sie eingeladen hat: Ort, Ortszeit, nächste Reise, alle geplanten Reisen und Vielleicht-Pläne
- Teilt selbst nichts und erscheint für niemanden auf der Karte
- Eigene Ansicht ohne Leiste; nächste Reise in drei Zeilen (Überschrift, Ort, Daten mit Nächten); Antippen zeigt den Ort auf der Karte
- Optional: eigenen Standort nur für sich einschalten, um die Entfernung zu sehen (bleibt auf dem Gerät)
- Im Profil des Nomaden: Liste der Familie mit Schalter „sieht dich“ / „pausiert“; Vorschau „So sieht sie es“
- Familie kann Sprache wählen und sich abmelden, sonst nichts

## Netzwerk und Einladungen
- Persönliche Einladungen von Sven: vorab freigegeben, 30 Tage gültig, optional „lebenslang kostenlos“
- Einladungen per Link: ein Mitglied tippt „Freund einladen“ und schickt den Link über den Teilen-Knopf (WhatsApp o. Ä.); die neue Person registriert sich mit E-Mail, Passwort und Name und sieht „Wartet auf Freigabe“; Sven bekommt eine Mitteilung und gibt frei oder lehnt ab; jeder Link gilt einmal und 14 Tage; ohne Link keine Registrierung
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
