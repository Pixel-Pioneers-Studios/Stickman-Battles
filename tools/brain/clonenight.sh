#!/bin/bash
# tools/brain/clonenight.sh — one night: a skilled clone of the user, then Sovereign trained against it. DEV ONLY.
#
#   Phase A  data/brain-skillclone: the behavior clone (tools/brain/clone_train.py) keeps training against the
#            target brain playing its top choice (a hunter run), held near the user's play by
#            --ref (the clone) --refkl. Result: an opponent that plays like the user AND wins.
#   Phase B  data/brain-clonerun: the target brain trains on, with the skilled clone (+ snapshots) as
#            40% of its league (train.js --hunters). Never touches data/brain/latest.json.
#   Evals    hunteval.js, 200 matches per arm, results in data/brain-clone/night.log.
#
# Usage: tools/brain/clonenight.sh [hoursA=3] [hoursB=3.5] [refkl=0.1]
cd "$(dirname "$0")/../.."
HA=${1:-3}; HB=${2:-3.5}; KL=${3:-0.1}
LOG=data/brain-clone/night.log
TARGET=data/brain-clone/target-15705.json
A=data/brain-skillclone; B=data/brain-clonerun
say() { echo "[$(date '+%H:%M:%S')] $*" | tee -a $LOG; }
iterof() { node -e 'try{console.log(require("./"+process.argv[1]).iter)}catch(e){console.log(-1)}' $1/state.json; }

# Hours left of a phase that started at $1 (epoch s) and lasts $2 hours.
left() { node -e 'const l=+process.argv[2]-(Date.now()/1e3-+process.argv[1])/3600;console.log(Math.max(0,l).toFixed(3))' $1 $2; }
# train.js can die at startup (worker page-load timeout); retry with the hours left, up to 3 times.
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
# One eval with a watchdog (hunteval.js can stall at browser close).
ev() {
  local out=$1; shift
  node tools/brain/hunteval.js --eps=200 --port=8141 "$@" > $out.out 2>&1 &
  local pid=$!; ( sleep 2400; kill $pid 2>/dev/null ) & local wd=$!
  wait $pid; kill $wd 2>/dev/null
  say "  $(basename $out): $(grep -E '  (mirror|hunter)  win' $out.out | tr -s ' ' | tr '\n' ';')"
  grep -E '^  (turns|twitchTurns|swings|jumps|abilities|supers|shieldRaises|swingHits) ' $out.out | tr -s ' ' | sed 's/^/      /' >> $LOG
}
O=data/brain-clone/evals; mkdir -p $O

say "night start: phase A ${HA} h (refkl $KL), phase B ${HB} h"
say "PHASE A: skilled clone from iter $(iterof $A) vs $TARGET"
phase $A $HA --hunt=$TARGET --ref=data/brain-clone/latest.json --refkl=$KL || say "phase A did not advance"
say "PHASE A done at iter $(iterof $A)"
ev $O/rawclone-vs-15705   --ckpt=data/brain-clone/latest.json --target=$TARGET --sample
ev $O/skillclone-vs-15705 --ckpt=$A/latest.json --target=$TARGET --sample

say "PHASE B: Sovereign from iter $(iterof $B) with $A in the league"
if phase $B $HB --hunters=$A; then
  CAND=$B/latest.json
  say "PHASE B done at iter $(iterof $B)"
  ev $O/cand-vs-15705        --ckpt=$CAND --target=$TARGET
  ev $O/skillclone-vs-cand   --ckpt=$A/latest.json --target=$CAND --sample --no-mirror
  ev $O/rawclone-vs-cand     --ckpt=data/brain-clone/latest.json --target=$CAND --sample --no-mirror
  ev $O/cand-twitchfilter    --ckpt=$CAND --target=$TARGET --turnaway=6 --turndz=30 --no-mirror
else
  say "phase B did not advance"
fi
say "night end"
