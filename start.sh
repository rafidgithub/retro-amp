#!/usr/bin/env bash
# Start RetroAmp locally and open it in the browser.
#   ./start.sh          → http://localhost:3000 (or the next free port)
#   ./start.sh 8080     → try port 8080 first
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is needed. Get it from https://nodejs.org" >&2
  exit 1
fi
major=$(node -p 'process.versions.node.split(".")[0]')
if [ "$major" -lt 18 ]; then
  echo "Found Node $major, but RetroAmp needs Node 18 or newer." >&2
  exit 1
fi

open_url() { open "$1" 2>/dev/null || xdg-open "$1" 2>/dev/null || true; }
port_busy() { lsof -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
is_retroamp() { curl -s --max-time 1 "http://localhost:$1/api/yt" | grep -q 'Pass q, list or v'; }

port="${1:-${PORT:-3000}}"
while port_busy "$port"; do
  if is_retroamp "$port"; then
    echo "RetroAmp is already running at http://localhost:$port"
    open_url "http://localhost:$port"
    exit 0
  fi
  echo "Port $port is taken, trying $((port + 1))…"
  port=$((port + 1))
done

url="http://localhost:$port"
# Open the browser once the server answers.
(
  for _ in $(seq 1 50); do
    if curl -s -o /dev/null --max-time 1 "$url"; then open_url "$url"; exit 0; fi
    sleep 0.2
  done
) &

echo "Starting RetroAmp at $url  (press Ctrl+C to stop)"
PORT="$port" exec node server.js
