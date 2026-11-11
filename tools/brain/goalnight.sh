#!/bin/bash
# tools/brain/goalnight.sh — goal-conditioned training from 20011: pi(a|s,h,g), g in {none, pressure, punish,
# antiair}. The input is widened with zero weights, so the start plays exactly like 20011.
#
#   Train    data/brain-goal (copied once from data/brain, which is only ever read), --objectives,
#            --twitchpen, hunters data/brain-skillclone2 + data/brain-ref15705 where they exist.
#   Evals    goalmatrix.js (does the best objective differ by style? do objectives change behaviour?) and
#            hunteval.js with objective none against 20011 (did the candidate get weaker or stronger?).
#   Waits for AC power. Results in data/brain-goal/night.log.
#
# Usage: [GOAL_DIR=data/brain-goal] [GOAL_TRAIN_ARGS="--objw=2.5 ..."] tools/brain/goalnight.sh [hours=4.5]
cd "$(dirname "$0")/../.." || exit 1
H=${1:-4.5}
B=${GOAL_DIR:-data/brain-goal}; LOG=$B/night.log; O=$B/evals
mkdir -p $O
say() { echo "[$(date '+%H:%M:%S')] $*" | tee -a $LOG; }
iterof() { node -e 'try{console.log(require("./"+process.argv[1]).iter)}catch(e){console.log(-1)}' $1/state.json; }
left() { node -e 'const l=+process.argv[2]-(Date.now()/1e3-+process.argv[1])/3600;console.log(Math.max(0,l).toFixed(3))' $1 $2; }
# wd <out file> <command...>: runs it with a 40 min watchdog kill.
wd() {
  local out=$1; shift
  "$@" > $out 2>&1 &
  local pid=$!; ( sleep ${WD_SECS:-2400}; kill $pid 2>/dev/null ) & local w=$!
  wait $pid; kill $w 2>/dev/null
}

say "waiting for AC power"
until pmset -g batt | grep -q "AC Power"; do sleep 60; done
if [ ! -f $B/latest.json ]; then
  cp data/brain/latest.json data/brain/state.json $B/ || { say "could not copy the 20011 checkpoint"; exit 1; }
  # The league pool is state.pool's snapshot files; without them every league opponent becomes the expert bot.
  mkdir -p $B/snapshots
  for f in $(node -e 'for (const p of require("./data/brain/state.json").pool || []) console.log(p.file)'); do
    cp data/brain/snapshots/$f $B/snapshots/ || { say "missing pool snapshot $f"; exit 1; }
  done
  say "copied data/brain/latest.json + state.json + $(ls $B/snapshots | wc -l | tr -d ' ') pool snapshots into $B"
fi

if wd $O/identity.out node tools/brain/goalidentity.js --ckpt=data/brain/latest.json --port=8144 && grep -q PASS $O/identity.out; then
  say "identity check: $(tail -1 $O/identity.out)"
else
  say "identity check FAILED: $(tail -1 $O/identity.out); aborting"; say "night end"; exit 1
fi

HUNT=""
for d in data/brain-skillclone2 data/brain-ref15705; do [ -f $d/latest.json ] && HUNT="$HUNT,$d"; done
HUNTARG=""; [ -n "$HUNT" ] && HUNTARG="--hunters=${HUNT#,}"

t0=$(date +%s); i0=$(iterof $B)
say "on AC; train from iter $i0 for $H h, objectives on, twitchpen 0.008, hunters: ${HUNT#,}, extra: $GOAL_TRAIN_ARGS"
for try in 1 2 3; do
  h=$(left $t0 $H)
  awk "BEGIN{exit !($h > 0.05)}" || break
  say "  train.js try $try, $h h"
  node tools/brain/train.js --dir=$B --torch --threads=2 --workers=3 --hours=$h \
    --objectives --twitchpen=0.008 $HUNTARG $GOAL_TRAIN_ARGS >> $B/train.out 2>&1
  say "  train.js exit $?, iter $(iterof $B)"
done
if [ "$(iterof $B)" = "$i0" ]; then say "training did not advance; no evals"; say "night end"; exit 1; fi
say "  last train line: $(grep '\[brain\] it ' $B/train.out | tail -1 | cut -c1-400)"

CAND=$B/latest.json
WD_SECS=14400 wd $O/matrix.out node tools/brain/goalmatrix.js --ckpt=$CAND --json=$O/matrix.json --port=8143 --eps=150 --hp=turtle:6.73,rushdown:7.66
say "  goalmatrix: $(grep -E '^verdict|^collapse' $O/matrix.out | tr '\n' ';')"
grep -E '^(style|turtle|rushdown)' $O/matrix.out | sed 's/^/      /' >> $LOG

wd $O/cand-vs-20011.out node tools/brain/hunteval.js --eps=200 --port=8141 --ckpt=$CAND --target=data/brain/latest.json --objective=none --json=$O/cand-vs-20011.json
say "  cand-vs-20011 (objective none): $(grep -E '  (mirror|hunter)  win' $O/cand-vs-20011.out | tr -s ' ' | tr '\n' ';')"
say "night end"
