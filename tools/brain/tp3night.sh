#!/bin/bash
# tools/brain/tp3night.sh — Nov 15 night: continue ship candidate 24212 (gen-startup-tp2) with the same habits +
# twitch penalty as gen-startup-tp3, then breadth eval the result (field adds 24212). DEV ONLY.
# Usage: tools/brain/tp3night.sh [hours=7]   Log: data/brain-habit/tp3night.log
cd "$(dirname "$0")/../.." || exit 1
HOURS=${1:-7}
OUT=data/brain-habit/breadth; LOG=data/brain-habit/tp3night.log; mkdir -p $OUT
say() { echo "[$(date '+%a %H:%M:%S')] $*" | tee -a $LOG; }
evalrun() { local json=$1; shift
  for t in 1 2; do
    rm -f $json
    node tools/brain/hunteval.js --json=$json "$@" & local pid=$!
    ( sleep 600; kill $pid 2>/dev/null ) & local dog=$!
    wait $pid; kill $dog 2>/dev/null
    [ -f $json ] && return
  done; }
FIELD="h1=data/brain-hunter/latest.json h2=data/brain-hunter2/latest.json h3=data/brain-hunter3/latest.json h4=data/brain-hunter4/latest.json 15705=data/brain/sovereign-15705.json 14672=data/brain-habit/spec-blocker/latest.json 14254=data/brain-habit/gen/latest.json 23116=data/brain-startup/latest.json 20011=data/brain/sovereign-20011-cand.json 24212=data/brain-habit/gen-startup-tp2/latest.json"
breadth() { local name=$1 ck=$2
  for e in $FIELD; do
    local tn=${e%%=*} tp=${e#*=}
    [ "$tp" = "$ck" ] && continue
    local j=$OUT/$name-vs-$tn.json
    [ -f $j ] && continue
    evalrun $j --eps=200 --no-mirror --port=8141 --ckpt=$ck --target=$tp > ${j%.json}.out 2>&1
    say "$name vs $tn: $(node -e 'const r=require("./"+process.argv[1]);const s=r.hunter.stats||{};console.log("win",r.hunter.win,"twitch/min",s.frames?Math.round(s.twitchTurns/(s.frames/3600)):"?")' $j 2>/dev/null || echo FAILED)"
  done; }

until pmset -g batt | grep -q "AC Power"; do sleep 60; done
# Note: data/brain/latest.json is the 24212 test swap, so habitgen's wipe evals here are vs 24212 (its parent).
d=data/brain-habit/gen-startup-tp3
if [ ! -f $d/latest.json ]; then
  mkdir -p $d
  cp data/brain-habit/gen-startup-tp2/{latest,state,target}.json $d/
fi
say "gen-startup-tp3 from 24212, $HOURS h"
HABIT_TRAIN_ARGS=--twitchpen=0.008 tools/brain/habitgen.sh $HOURS "timed-masher,timed-blocker,none" gen-startup-tp3
NEW=$(node -e 'console.log(require("./"+process.argv[1]).iter)' $d/latest.json)
[ "$NEW" = 24212 ] && { say "continuation never trained, skipping its breadth"; exit 1; }
breadth $NEW $d/latest.json
say "done"
