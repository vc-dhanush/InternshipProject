#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-5500}"
echo "Attendance dashboard → http://localhost:${PORT}/"
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT"
fi
if command -v python >/dev/null 2>&1; then
  exec python -m http.server "$PORT"
fi
echo "Python is required to serve locally. Opening the file instead."
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "index.html"
elif command -v open >/dev/null 2>&1; then
  open "index.html"
fi
