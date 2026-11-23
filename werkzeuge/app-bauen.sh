#!/usr/bin/env bash
# Baut die echte App unter public/ (Adresse …/ahoi/) aus dem gemeinsamen Code in public/prototyp/.
# Die echte App erkennt sich an der Adresse (ohne /prototyp/) und startet mit Anmeldung statt Beispieldaten.
# Die erzeugten Dateien stehen nicht im Repository (.gitignore); GitHub baut sie bei jeder Veröffentlichung neu.
set -euo pipefail
cd "$(dirname "$0")/../public"
for f in index.html basis.js start.js app.js texte.js supabase.js sw.js manifest.webmanifest weltkarte.json laender-50m.geojson papier.png; do
  cp "prototyp/$f" "$f"
done
# Symbole liegen von hier aus in icons/ statt ../icons/
sed -i.bak 's#\.\./icons/#icons/#g' index.html sw.js manifest.webmanifest && rm -f index.html.bak sw.js.bak manifest.webmanifest.bak
[ -f prototyp/version.json ] && cp prototyp/version.json version.json || true
echo "Echte App gebaut: public/index.html"
