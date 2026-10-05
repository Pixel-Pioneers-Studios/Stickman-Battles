#!/usr/bin/env bash
# build-crazygames.sh — assemble a CrazyGames submission bundle.
#
# Usage:  build-crazygames.sh [full|saga1|saga2|saga3]     (default: full)
#
# The saga argument produces a standalone-game build of one slice of the story
# (see docs/SAGA_SPLIT_PLAN.md). It stamps ACTIVE_SAGA into the STAGED copy of
# js/story/smb-saga-structure.js and rewrites the title/OG metadata in the staged
# index.html. The repo itself is never modified — every build is derived, so a
# fix lands once and all three listings get it on the next deploy.
#
# Produces dist/stickman-evolution-crazygames.zip containing only the files the
# browser actually loads: index.html at the archive root, plus SMB.css, js/,
# images/ (minus the store/portal art), fonts/, the audio file, live-config.json
# and the favicon. Server code, docs, tools, replays, node_modules, the sibling
# games and the .env are all excluded.
#
# CrazyGames limits: <= 250MB total, <= 1500 files, <= 50MB before gameplay
# starts. The script prints all three so a regression is visible immediately.
set -euo pipefail

SAGA="${1:-full}"
case "$SAGA" in
  full)  SAGA_TITLE="Stickman Evolution: The 95th";              SLUG="crazygames" ;;
  saga1) SAGA_TITLE="Stickman Evolution: The Fragment";          SLUG="saga1-the-fragment" ;;
  saga2) SAGA_TITLE="Stickman Evolution: The Multiverse War";    SLUG="saga2-the-multiverse-war" ;;
  saga3) SAGA_TITLE="Stickman Evolution: The Substrate";         SLUG="saga3-the-substrate" ;;
  *) echo "unknown saga '$SAGA' (expected: full|saga1|saga2|saga3)" >&2; exit 2 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="$ROOT/dist"
STAGE="$OUT/$SLUG"
ZIP="$OUT/stickman-evolution-$SLUG.zip"

rm -rf "$STAGE" "$ZIP"
mkdir -p "$STAGE"

cd "$ROOT"
# mega-knight-evolution.mp3 is a Clash Royale voice line — not ours to ship on a
# portal, so it stays out and its loader is stripped below.
cp index.html SMB.css favicon.svg live-config.json "$STAGE/"
cp -R js fonts "$STAGE/"
mkdir -p "$STAGE/images"
# images/store holds portal cover art — uploaded through the dashboard, not shipped.
find images -maxdepth 1 -type f -exec cp {} "$STAGE/images/" \;
[ -d images/weapons ] && cp -R images/weapons "$STAGE/images/"
# Sovereign's learned priors, fetched at runtime by js/smb-sov-artifact.js.
# Without it he ships with a blank slate. The rest of data/ is lab output.
mkdir -p "$STAGE/data"
cp data/sov-artifact.json "$STAGE/data/"

# Strip anything that is not a runtime asset.
find "$STAGE" \( -name '.DS_Store' -o -name '*.smbreplay' -o -name '*.md' \) -delete

# Third-party audio. The megaknight buffer is optional (a missing one plays
# nothing). MusicManager is already a no-op on CrazyGames, so the YouTube API
# loader would only pull in an unused third-party player.
perl -ni -e "print unless /^SoundManager\.loadAudio\('megaknight'/" "$STAGE/js/smb-audio.js"
perl -0pi -e "s#<script>\s*if \(location\.protocol !== 'file:'\) \{\s*const _ytScript[^<]*</script>##" "$STAGE/index.html"
if grep -q "mega-knight-evolution" "$STAGE/js/smb-audio.js" || grep -q "youtube.com/iframe_api" "$STAGE/index.html"; then
  echo "failed to strip third-party audio from the staged bundle" >&2; exit 1
fi

# ── Saga stamping ────────────────────────────────────────────────────────────
# Applied to the STAGED copy only. `full` is the source's own default, so it is
# left untouched and its bundle is byte-identical to an unstamped build.
if [ "$SAGA" != "full" ]; then
  SAGA_FILE="$STAGE/js/story/smb-saga-structure.js"
  [ -f "$SAGA_FILE" ] || { echo "missing $SAGA_FILE — is the saga layer present?" >&2; exit 1; }

  perl -pi -e "s/^const ACTIVE_SAGA = '.*';/const ACTIVE_SAGA = '$SAGA';/" "$SAGA_FILE"
  grep -q "^const ACTIVE_SAGA = '$SAGA';" "$SAGA_FILE" \
    || { echo "failed to stamp ACTIVE_SAGA into $SAGA_FILE" >&2; exit 1; }

  # Title / share metadata. The long form carries the marketing suffix; replace
  # it first so the bare-name pass cannot partially rewrite it.
  perl -pi -e "s/\QStickman Evolution: The 95th — Free Browser Action Fighter\E/$SAGA_TITLE — Free Browser Action Fighter/g" "$STAGE/index.html"
  perl -pi -e "s/\QStickman Evolution: The 95th\E/$SAGA_TITLE/g" "$STAGE/index.html"
  # Sitelock lock screen names the game too.
  perl -pi -e "s/\QStickman Evolution: The 95th\E/$SAGA_TITLE/g" "$STAGE/js/smb-sitelock.js"

  echo "stamped: ACTIVE_SAGA=$SAGA  title=\"$SAGA_TITLE\""
fi

cd "$STAGE"
zip -qr "$ZIP" . -x '.*'

FILES=$(find "$STAGE" -type f | wc -l | tr -d ' ')
TOTAL=$(du -sh "$STAGE" | cut -f1)
echo "saga:    $SAGA"
echo "title:   $SAGA_TITLE"
echo "bundle:  $ZIP"
echo "files:   $FILES  (limit 1500)"
echo "size:    $TOTAL unpacked, $(du -h "$ZIP" | cut -f1) zipped  (limit 250MB)"
echo
echo "Startup payload (everything fetched before gameplay start; limit 50MB):"
du -ch "$STAGE/index.html" "$STAGE/SMB.css" "$STAGE/js" "$STAGE/fonts" "$STAGE/images" 2>/dev/null | tail -1
