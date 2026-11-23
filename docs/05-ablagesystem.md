# Ahoi – Ablagesystem (Stand 22.11.2026)

## Grundprinzip
- Drei Orte, jeder mit einer klaren Aufgabe:
  - **GitHub `ahoi` (öffentlich):** Code, Design-Endstände, Doku. Daraus läuft die App über GitHub Pages.
  - **GitHub `ahoi-backup` (privat):** wöchentliche Sicherung der Datenbank (Mitglieder, Chats, Reisepläne). Enthält persönliche Daten, deshalb privat.
  - **Mac `Schreibtisch/Ahoi App`:** vollständige Kopie von allem plus private Dinge, die nicht ins Internet gehören.
- Claude-Projekt "Nomad App": spiegelt die Doku aus `app/docs/` als Gedächtnis für neue Chats.
- Passwörter und Schlüssel liegen nie in Dateien, nur im Passwort-Manager bzw. geschützt bei Supabase/GitHub.

## Ordnerstruktur Mac
```
Ahoi App/
├── app/                      = Inhalt des öffentlichen GitHub-Archivs "ahoi"
│   ├── docs/
│   │   ├── 01-konzept.md
│   │   ├── 02-anforderungen.md
│   │   ├── 03-entscheidungen.md     (Logbuch: Datum + Entscheidung)
│   │   ├── 04-fahrplan.md
│   │   └── 05-ablagesystem.md
│   ├── design/
│   │   ├── logo/                    (gewähltes Logo, Endstand)
│   │   ├── kartenstil/              (gewählte Stilvorlage)
│   │   └── farben-schriften.md
│   ├── public/icons/                (App-Icons in allen Größen, erstellt von Claude)
│   ├── public/prototyp/             (Code der App; Prototyp und echte App nutzen denselben Code)
│   ├── werkzeuge/app-bauen.sh       (baut daraus die echte App unter …/ahoi/)
│   ├── supabase/                    (Datenbank-Aufbau)
│   └── .github/workflows/           (automatisches Veröffentlichen, wöchentlicher Wecker, Backup)
│
└── privat/                   = nur auf dem Mac, nie öffentlich
    ├── 01-entwuerfe/
    │   ├── logo/
    │   └── kartenstil/
    ├── 02-prompts/                  (alle ChatGPT-Prompts als Textdateien)
    ├── 03-mitglieder/               (wer eingeladen wurde, Kontaktdaten)
    ├── 04-feedback/                 (Exporte aus der Feedback-Liste)
    └── 05-backups/                  (Kopien der Datenbank-Sicherungen)
```

## Dateinamen
- Schema: `ahoi_<bereich>_<motiv>_<nummer>.<endung>`
- Nur Kleinbuchstaben, keine Leerzeichen, keine Umlaute (ä → ae), Bindestrich innerhalb eines Teils, Unterstrich zwischen den Teilen
- Buchstabe = Prompt-Option aus dem Chat, Nummer = Durchgang in ChatGPT (01, 02, …)
- Beispiele:
  - `ahoi_logo_a-kompass_01.png`
  - `ahoi_logo_a-kompass_02.png`
  - `ahoi_kartenstil_a-schatzkarte_01.png`
  - `ahoi_prompt_logo-a-kompass.txt`
- Gewählter Endstand: `ahoi_logo_master.png` (mind. 1024×1024 px) → `app/design/logo/`
- Daneben `ahoi_logo_vollflaeche_1024.png`: Logo ohne weiße Ecken, Grundlage für alle Icons (iPhone und Android runden die Ecken selbst ab)
- Daraus erstellt Claude die festen Icon-Dateien (Namen sind technisch vorgegeben): `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon.ico`
- Datenbank-Sicherungen: `ahoi_backup_JJJJ-MM-TT.sql`

## Arbeitsablauf
1. Entwürfe aus ChatGPT → `privat/01-entwuerfe/…` mit Schema-Namen
2. Entscheidung im Chat → Eintrag in `03-entscheidungen.md`
3. Endstand → `app/design/…`
4. Claude baut in der Cloud, lädt zu GitHub hoch und legt nach jeder Sitzung eine aktuelle Kopie in `Schreibtisch/Ahoi App/app/`
5. Wöchentlich automatisch: Wecker für Supabase + Datenbank-Sicherung nach `ahoi-backup`
