#!/usr/bin/env bash
# build-school.sh — assemble the player copy that gets handed around as a zip.
#
# Usage:  build-school.sh
#
# Produces dist/stickman-evolution.zip: only what the browser loads (index.html,
# SMB.css, js/ including js/vendor/, fonts/, audio/, the in-game images, the two
# data files Sovereign reads at runtime) plus "HOW TO PLAY.txt". Docs, tools,
# server code, lab data, replays, store art, node_modules and the sibling games
# stay out, as do the owner/dev tools, and the scripts are minified. Unlike the CrazyGames build, music and sound effects are kept.
# The repo is never modified — every build is derived from it.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="$ROOT/dist"
STAGE="$OUT/stickman-evolution"
ZIP="$OUT/stickman-evolution.zip"

rm -rf "$STAGE" "$ZIP"
mkdir -p "$STAGE"

cd "$ROOT"
cp index.html SMB.css favicon.svg live-config.json "$STAGE/"
cp -R js fonts audio "$STAGE/"
mkdir -p "$STAGE/images"
# Loading-screen art, share/icon images and the weapon sprites. images/store
# (portal covers) and images/unused are not loaded by the game.
find images -maxdepth 1 -type f -exec cp {} "$STAGE/images/" \;
cp -R images/weapons "$STAGE/images/"
# Sovereign's learned priors and his trained brain. Without them he falls back
# to the hand-written cascade.
mkdir -p "$STAGE/data/brain"
cp data/sov-artifact.json "$STAGE/data/"
cp data/brain/latest.json "$STAGE/data/brain/"

# Owner and developer tools stay out of the player copy: the developer console
# (typed GAMECONSOLE), its local AI assistant, the F7 Sovereign possession
# toggle, the F10 live-ops dashboard, the owner toolbox, the attack sandbox,
# the QA harness and the camera recorder. Their script tags go with them; every
# call into them from the rest of the game is behind a typeof guard.
DEV_SCRIPTS=(
  smb-debug-console smb-ai-console smb-sovereign-control smb-admin-liveops-panel
  smb-owner-tools smb-attacktest-core smb-attacktest-exec smb-attacktest-registry
  smb-attacktest-commands smb-attacktest-gui smb-test-tools smb-camera-trace
)
for name in "${DEV_SCRIPTS[@]}"; do
  rm -f "$STAGE/js/$name.js"
  grep -v "src=\"./js/$name\.js" "$STAGE/index.html" > "$STAGE/index.html.tmp"
  mv "$STAGE/index.html.tmp" "$STAGE/index.html"
done

# Comments out, locals renamed, whitespace gone: reading the copy in VS Code
# stops being a guided tour. Behaviour is unchanged (see minify.js).
node "$ROOT/tools/package/minify.js" "$STAGE"

find "$STAGE" \( -name '.DS_Store' -o -name '*.smbreplay' -o -name '*.md' -o -name '*.map' \) -delete

cat > "$STAGE/HOW TO PLAY.txt" <<'TXT'
Stickman Evolution: The 95th

1. Open this folder in Visual Studio Code (File > Open Folder).
2. Install the "Live Server" extension if you don't have it.
3. Right-click index.html and choose "Open with Live Server".
   The game opens in your browser.

Playing with friends online: Online > Play With Friends, then send them the
lobby code. It works on school networks. Two players on one keyboard: Versus.

P1: A/D move, W jump, S shield, Space attack, Q ability, E super
P2: J/L move, I jump, K shield, ; attack, O ability, U super
Esc pauses.
TXT

cd "$OUT"
zip -qr "$ZIP" "stickman-evolution" -x '*/.*'

echo "bundle:  $ZIP"
echo "files:   $(find "$STAGE" -type f | wc -l | tr -d ' ')"
echo "size:    $(du -sh "$STAGE" | cut -f1) unpacked, $(du -h "$ZIP" | cut -f1) zipped"
