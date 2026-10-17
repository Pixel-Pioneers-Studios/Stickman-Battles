#!/usr/bin/env bash
# tools/dev/serve.sh — start the game locally and open it in the browser.
#
#   tools/dev/serve.sh            # full server (relay, lobbies, ban API) on :3001
#   tools/dev/serve.sh --static   # plain static files on :8080 (no server features)
#   tools/dev/serve.sh --no-open  # don't open a browser tab
#
# If something is already listening on the port, it reuses it instead of starting twice.
set -euo pipefail
cd "$(dirname "$0")/../.."

MODE=full; OPEN=1
for a in "$@"; do
  case "$a" in
    --static) MODE=static ;;
    --no-open) OPEN=0 ;;
  esac
done

if [ "$MODE" = static ]; then PORT=8080; else PORT="${PORT:-3001}"; fi
URL="http://localhost:$PORT/index.html"

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Already serving on :$PORT — reusing it."
else
  if [ "$MODE" = full ] && [ ! -d node_modules ]; then
    echo "node_modules missing — running npm install first."; npm install
  fi
  if [ "$MODE" = static ]; then
    python3 -m http.server "$PORT" >/tmp/smb-serve.log 2>&1 &
  else
    PORT="$PORT" node server.js >/tmp/smb-serve.log 2>&1 &
  fi
  PID=$!
  for _ in $(seq 1 40); do
    curl -fs -o /dev/null "$URL" && break
    kill -0 "$PID" 2>/dev/null || { echo "Server exited:"; cat /tmp/smb-serve.log; exit 1; }
    sleep 0.25
  done
  echo "Serving on :$PORT (pid $PID, log /tmp/smb-serve.log). Stop with: kill $PID"
fi

echo "$URL"
[ "$OPEN" = 1 ] && open "$URL"
exit 0
