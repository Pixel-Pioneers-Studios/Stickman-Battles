#!/usr/bin/env bash
# deploy-itch.sh — build the portal bundle and push it to itch.io with butler.
#
# Usage:  deploy-itch.sh [full|saga1|saga2|saga3] [user/game]     (default: full)
#         ITCH_TARGET=user/game deploy-itch.sh saga1   (default target: wronglysod/stickman-evolution)
#         DRY_RUN=1 deploy-itch.sh                                 (build + diff, no upload)
#
# Reuses build-crazygames.sh (same runtime-only bundle; sitelock already allows
# itch.io / itch.zone / hwcdn.net) and pushes the STAGED directory rather than
# the zip — butler diffs file-by-file, so a push after a small change uploads
# only the changed files.
#
# The channel is "html5". After the very first push, open the game's itch.io
# edit page once and tick "This file will be played in the browser" on the
# upload; later pushes keep that setting.
#
# Login: butler keeps credentials in ~/Library/Application Support/itch/butler_creds.
# Run `butler login` once if they are missing or expired.
set -euo pipefail

SAGA="${1:-full}"
TARGET="${2:-${ITCH_TARGET:-wronglysod/stickman-evolution}}"
CHANNEL="${ITCH_CHANNEL:-html5}"

if [ -z "$TARGET" ]; then
  echo "no itch target — pass user/game as the 2nd arg or set ITCH_TARGET" >&2; exit 2
fi
command -v butler >/dev/null || { echo "butler not on PATH (expected ~/.butler/butler)" >&2; exit 1; }

case "$SAGA" in
  full)  SLUG="crazygames" ;;
  saga1) SLUG="saga1-the-fragment" ;;
  saga2) SLUG="saga2-the-multiverse-war" ;;
  saga3) SLUG="saga3-the-substrate" ;;
  *) echo "unknown saga '$SAGA' (expected: full|saga1|saga2|saga3)" >&2; exit 2 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAGE="$ROOT/dist/$SLUG"

"$ROOT/tools/package/build-crazygames.sh" "$SAGA"

# Highest ?v= cache-bust tag in index.html is the build's version.
VERSION=$(grep -oE '\?v=[0-9.]+' "$ROOT/index.html" | cut -c4- | sort -t. -k1,1n -k2,2n -k3,3n | tail -1)

echo
echo "pushing $STAGE -> $TARGET:$CHANNEL  (version $VERSION)"
if [ -n "${DRY_RUN:-}" ]; then
  butler push --dry-run "$STAGE" "$TARGET:$CHANNEL" --userversion "$VERSION"
else
  butler push "$STAGE" "$TARGET:$CHANNEL" --userversion "$VERSION"
  # itch processes the build for a few seconds; status says "No channel" until then.
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12; do
    STATUS=$(butler status "$TARGET:$CHANNEL" 2>&1)
    echo "$STATUS" | grep -q "No channel" || break
    sleep 5
  done
  echo "$STATUS"
fi
