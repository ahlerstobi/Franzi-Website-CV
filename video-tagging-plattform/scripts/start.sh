#!/bin/bash
# Startet einen lokalen Webserver und oeffnet die Plattform im Browser.
cd "$(dirname "$0")/.."

open_url() {
  if command -v open >/dev/null 2>&1; then open "$1"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$1" >/dev/null 2>&1
  else echo "Bitte im Browser oeffnen: $1"; fi
}

PORT=8080
while (exec 3<>/dev/tcp/127.0.0.1/$PORT) 2>/dev/null; do PORT=$((PORT+1)); done
URL="http://localhost:$PORT/"

if command -v python3 >/dev/null 2>&1 && python3 -c "" >/dev/null 2>&1; then
  SERVER=(python3 -m http.server "$PORT" --bind 127.0.0.1)
elif command -v node >/dev/null 2>&1 && command -v npx >/dev/null 2>&1; then
  SERVER=(npx --yes http-server -p "$PORT" -a 127.0.0.1 -c-1 -s)
else
  echo "Weder Python 3 noch Node.js gefunden - oeffne die Seite direkt als Datei."
  echo "Hinweis: Das eingebettete YouTube-Video wird dann evtl. nicht abgespielt."
  open_url "index.html"
  exit 0
fi

echo ""
echo "  Video Tagging Plattform laeuft unter: $URL"
echo "  Dieses Fenster offen lassen. Zum Beenden Strg+C druecken."
echo ""
( sleep 1; open_url "$URL" ) &
exec "${SERVER[@]}"
