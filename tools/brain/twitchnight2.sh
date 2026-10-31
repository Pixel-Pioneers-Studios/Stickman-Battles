#!/bin/bash
# tools/brain/twitchnight2.sh — 20011 (twitchpen 0.008 took 17628 from 221 to 96 twitch/min) trains on
# with a stronger twitch penalty, same league as twitchnight.sh. Goal: low twitch WITHOUT the play filter.
#
#   Train    data/brain-twitch2 (copy of data/brain-tonight, iter 20011), --twitchpen, hunters
#            data/brain-skillclone2 + data/brain-ref15705.
#   Evals    hunteval.js, 200 matches per arm, results in data/brain-twitch2/night.log:
#            cand vs 20011 (mirror + hunter), cand vs 15705 raw, cand+filter vs 15705 raw (the live
#            setup is 15705 + filter), skilled clone vs cand. Never touches data/brain/latest.json.
#   Waits until the start hour (same day) and AC power first.
#
# Usage: tools/brain/twitchnight2.sh [hours=5] [twitchpen=0.025] [start hour=21]
cd "$(dirname "$0")/../.." || exit 1
H=${1:-5}; PEN=${2:-0.025}; START=${3:-21}
B=data/brain-twitch2; LOG=$B/night.log; O=$B/evals; mkdir -p $O
PREV=data/brain/sovereign-20011-cand.json; REF15705=data/brain-ref15705/latest.json
say() { echo "[$(date '+%H:%M:%S')] $*" | tee -a $LOG; }
iterof() { node -e 'try{console.log(require("./"+process.argv[1]).iter)}catch(e){console.log(-1)}' $1/state.json; }
left() { node -e 'const l=+process.argv[2]-(Date.now()/1e3-+process.argv[1])/3600;console.log(Math.max(0,l).toFixed(3))' $1 $2; }
ev() {
  local out=$1; shift
  node tools/brain/hunteval.js --eps=200 --port=8141 "$@" > $out.out 2>&1 &
  local pid=$!; ( sleep 2400; kill $pid 2>/dev/null ) & local wd=$!
  wait $pid; kill $wd 2>/dev/null
  say "  $(basename $out): $(grep -E '  (mirror|hunter)  win' $out.out | tr -s ' ' | tr '\n' ';')"
  grep -E '^  (stat|turns|twitchTurns|twitchAir|swings|jumps|abilities|supers|shieldRaises|swingHits) ' $out.out | tr -s ' ' | sed 's/^/      /' >> $LOG
}

say "waiting for ${START}:00 and AC power"
until [ $(date +%H) -ge $START ] && pmset -g batt | grep -q "AC Power"; do sleep 60; done
t0=$(date +%s); i0=$(iterof $B)
say "on AC; train from iter $i0 for $H h, twitchpen $PEN"
for try in 1 2 3; do
  h=$(left $t0 $H)
  awk "BEGIN{exit !($h > 0.05)}" || break
  say "  train.js try $try, $h h"
  node tools/brain/train.js --dir=$B --torch --threads=2 --workers=3 --hours=$h \
    --hunters=data/brain-skillclone2,data/brain-ref15705 --twitchpen=$PEN >> $B/train.out 2>&1
  say "  train.js exit $?, iter $(iterof $B)"
done
if [ "$(iterof $B)" = "$i0" ]; then say "training did not advance; no evals"; say "night end"; exit 1; fi

CAND=$B/latest.json
ev $O/cand-vs-20011         --ckpt=$CAND --target=$PREV
ev $O/cand-vs-15705         --ckpt=$CAND --target=$REF15705
ev $O/candfilter-vs-15705   --ckpt=$CAND --target=$REF15705 --turnaway=6 --turndz=30 --no-mirror
ev $O/skillclone2-vs-cand   --ckpt=data/brain-skillclone2/latest.json --target=$CAND --sample --no-mirror
say "night end"
