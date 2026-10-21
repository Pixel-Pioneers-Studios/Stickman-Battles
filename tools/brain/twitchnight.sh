#!/bin/bash
# tools/brain/twitchnight.sh — one night: the skilled clone re-hunts the live Sovereign (17628), then
# 17628 trains on with a twitch penalty, the new clone and 15705 in its league. DEV ONLY.
#
#   Phase A  data/brain-skillclone2: skilled clone (copy of data/brain-skillclone) hunts 17628, held
#            near the user's play by --ref (the raw clone) --refkl.
#   Phase B  data/brain-tonight: 17628 trains with --twitchpen, and data/brain-skillclone2 +
#            data/brain-ref15705 as 40% of its league (15705 is there to win back the head-to-head).
#   Evals    hunteval.js, 200 matches per arm, results in data/brain-tonight/night.log.
#            Never touches data/brain/latest.json.
#
# Usage: tools/brain/twitchnight.sh [hoursA=2.5] [hoursB=5] [twitchpen=0.008] [refkl=0.03]
cd "$(dirname "$0")/../.."
HA=${1:-2.5}; HB=${2:-5}; PEN=${3:-0.008}; KL=${4:-0.03}
LOG=data/brain-tonight/night.log
LIVE=data/brain/sovereign-17628-clone.json
REF15705=data/brain-ref15705/latest.json
A=data/brain-skillclone2; B=data/brain-tonight
say() { echo "[$(date '+%H:%M:%S')] $*" | tee -a $LOG; }
iterof() { node -e 'try{console.log(require("./"+process.argv[1]).iter)}catch(e){console.log(-1)}' $1/state.json; }
left() { node -e 'const l=+process.argv[2]-(Date.now()/1e3-+process.argv[1])/3600;console.log(Math.max(0,l).toFixed(3))' $1 $2; }
phase() {
  local dir=$1 hours=$2; shift 2
  local t0=$(date +%s) i0=$(iterof $dir)
  for try in 1 2 3; do
    local h=$(left $t0 $hours)
    awk "BEGIN{exit !($h > 0.05)}" || break
    say "  train.js try $try, $h h: $*"
    node tools/brain/train.js --dir=$dir --torch --threads=2 --workers=3 --hours=$h "$@" >> $dir/train.out 2>&1
    say "  train.js exit $?, iter $(iterof $dir)"
  done
  [ "$(iterof $dir)" != "$i0" ]
}
ev() {
  local out=$1; shift
  node tools/brain/hunteval.js --eps=200 --port=8141 "$@" > $out.out 2>&1 &
  local pid=$!; ( sleep 2400; kill $pid 2>/dev/null ) & local wd=$!
  wait $pid; kill $wd 2>/dev/null
  say "  $(basename $out): $(grep -E '  (mirror|hunter)  win' $out.out | tr -s ' ' | tr '\n' ';')"
  grep -E '^  (turns|twitchTurns|swings|jumps|abilities|supers|shieldRaises|swingHits) ' $out.out | tr -s ' ' | sed 's/^/      /' >> $LOG
}
O=$B/evals; mkdir -p $O

say "night start: phase A ${HA} h (refkl $KL), phase B ${HB} h (twitchpen $PEN)"
say "PHASE A: skilled clone from iter $(iterof $A) vs $LIVE"
phase $A $HA --hunt=$LIVE --ref=data/brain-clone/latest.json --refkl=$KL || say "phase A did not advance"
say "PHASE A done at iter $(iterof $A)"
ev $O/skillclone2-vs-17628 --ckpt=$A/latest.json --target=$LIVE --sample --no-mirror

say "PHASE B: Sovereign from iter $(iterof $B), hunters $A + 15705, twitchpen $PEN"
if phase $B $HB --hunters=$A,data/brain-ref15705 --twitchpen=$PEN; then
  CAND=$B/latest.json
  say "PHASE B done at iter $(iterof $B)"
  ev $O/cand-vs-17628        --ckpt=$CAND --target=$LIVE
  ev $O/cand-vs-15705        --ckpt=$CAND --target=$REF15705 --no-mirror
  ev $O/skillclone2-vs-cand  --ckpt=$A/latest.json --target=$CAND --sample --no-mirror
  ev $O/oldclone-vs-cand     --ckpt=data/brain-skillclone/latest.json --target=$CAND --sample --no-mirror
else
  say "phase B did not advance"
fi
say "night end"
