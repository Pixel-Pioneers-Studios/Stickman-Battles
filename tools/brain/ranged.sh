#!/bin/bash
# tools/brain/ranged.sh — ranged ceiling test. DEV ONLY.
#
# The brain wins ~5-27% holding a ranged weapon against itself and ~50% with melee (tools/brain/weaponread.js,
# Oct 21). Skill or balance? A ranged specialist (a copy of 17628 that always holds a ranged weapon, with a class
# that names it or names none) hunts 17628 for two blocks, evaluated after each:
#   climbs well above the mirror (17628 itself holding ranged)  ->  ranged play is learnable, a skill gap
#   stays near the mirror                                       ->  ranged weapons are weak in the game: balance
#   After block 2 the specialist also plays with melee kits, to show what specializing cost it.
# Results in data/brain-ranged/night.log. Never touches data/brain/latest.json.
#
# Usage: tools/brain/ranged.sh [hours per block=3]
cd "$(dirname "$0")/../.."
HB=${1:-3}
D=data/brain-ranged; LOG=$D/night.log; O=$D/evals
TARGET=data/brain/sovereign-17628-clone.json
mkdir -p $O
if [ ! -f $D/latest.json ]; then
  cp data/brain-clonerun/latest.json data/brain-clonerun/state.json $D/
  cp $TARGET $D/target.json
fi
say() { echo "[$(date '+%H:%M:%S')] $*" | tee -a $LOG; }
iterof() { node -e 'try{console.log(require("./"+process.argv[1]).iter)}catch(e){console.log(-1)}' $1/state.json; }
left() { node -e 'const l=+process.argv[2]-(Date.now()/1e3-+process.argv[1])/3600;console.log(Math.max(0,l).toFixed(3))' $1 $2; }
phase() {
  local hours=$1; local t0=$(date +%s) i0=$(iterof $D)
  for try in 1 2 3; do
    local h=$(left $t0 $hours)
    awk "BEGIN{exit !($h > 0.05)}" || break
    say "  train.js try $try, $h h"
    node tools/brain/train.js --dir=$D --hunt=$D/target.json --brainkit=rangedClass --torch --threads=2 --workers=3 --hours=$h >> $D/train.out 2>&1
    say "  train.js exit $?, iter $(iterof $D)"
  done
  [ "$(iterof $D)" != "$i0" ]
}
ev() {
  local out=$1; shift
  node tools/brain/hunteval.js --eps=200 --port=8143 --target=$D/target.json "$@" > $out.out 2>&1 &
  local pid=$!; ( sleep 2400; kill $pid 2>/dev/null ) & local wd=$!
  wait $pid; kill $wd 2>/dev/null
  say "  $(basename $out): $(grep -E '  (mirror|hunter)  win' $out.out | tr -s ' ' | tr '\n' ';')"
  grep -E '^  (dmgDealt|dmgTaken|swings|swingHits|abilities|abilityHits|supers|jumps|shieldRaises) ' $out.out | tr -s ' ' | sed 's/^/      /' >> $LOG
}

until pmset -g batt | grep -q "AC Power"; do sleep 60; done
say "ranged night start: 2 x $HB h, specialist from iter $(iterof $D), target $TARGET"
for b in 1 2; do
  say "BLOCK $b"
  phase $HB || { say "block $b did not advance"; break; }
  # mirror arm = 17628 itself holding ranged (the baseline); hunter arm = the specialist holding ranged
  ev $O/block$b-ranged --ckpt=$D/latest.json --brainkit=rangedClass
done
ev $O/spec-melee --ckpt=$D/latest.json --no-mirror
say "night end"
