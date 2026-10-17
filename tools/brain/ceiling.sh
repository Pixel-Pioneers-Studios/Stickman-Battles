#!/bin/bash
# tools/brain/ceiling.sh — the ceiling test for in-match adaptation. DEV ONLY.
#
# How much is it worth to KNOW an opponent's habit? For each habit (js/smb-brain.js
# HABITS) a specialist trains for a while against the shipped brain carrying only that
# habit. Then every specialist plays every habit. If each specialist is clearly best on
# its own habit and worse on the others, reading the habit has a prize and a memory can
# be trained to win it; if the specialists are no better than each other, it does not.
#
# Usage: tools/brain/ceiling.sh [hours per specialist=1] [habits="masher blocker"]
# Waits for AC power first. Results: data/brain-habit/ceiling.log
cd "$(dirname "$0")/../.." || exit 1
HOURS=${1:-1}; HABITS=${2:-"masher blocker"}
OUT=data/brain-habit; LOG=$OUT/ceiling.log
mkdir -p $OUT
say() { echo "[$(date '+%a %H:%M:%S')] $*" | tee -a $LOG; }

until pmset -g batt | grep -q "AC Power"; do sleep 60; done
say "on AC; ceiling test: $HOURS h per specialist, habits: $HABITS"

for h in $HABITS; do
  d=$OUT/spec-$h
  if [ ! -f $d/latest.json ]; then
    mkdir -p $d
    cp data/brain/latest.json data/brain/state.json $d/
    cp data/brain/latest.json $d/target.json
  fi
  say "training specialist vs $h"
  node tools/brain/train.js --dir=$d --hunt=$d/target.json --habit=$h --torch --threads=2 --workers=3 --hours=$HOURS > $d/train.out 2>&1
  say "specialist $h stopped: $(tail -1 $d/train.out)"
done

for h in $HABITS; do
  for v in $HABITS plain; do
    hab="--habit=$v"; [ $v = plain ] && hab=""
    node tools/brain/hunteval.js --eps=200 --no-mirror --port=8141 --ckpt=$OUT/spec-$h/latest.json --target=data/brain/latest.json $hab \
      --json=$OUT/spec-$h-vs-$v.json > $OUT/spec-$h-vs-$v.out 2>&1
    say "specialist $h vs $v: $(cat $OUT/spec-$h-vs-$v.json 2>/dev/null)"
  done
done
say "done"
