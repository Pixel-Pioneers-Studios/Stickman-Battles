#!/bin/bash
# tools/brain/habitgen.sh — after the ceiling test: can ONE net with memory win the prize? DEV ONLY.
#
# A generalist trains from the shipped brain against the shipped brain carrying a habit
# drawn per match ('none' = no habit, so it cannot assume one). Then it plays each habit
# twice: as is, and with its memory cleared every 3 s (60 decisions). Clearing every
# decision also costs it vs the plain opponent (the net leans on the memory path as plain
# capacity), so 3 s is the fair arm: short-term state kept, nothing carried between habit
# firings. Adapting = the 3 s arm does clearly worse on the habits than on plain.
#
# Usage: tools/brain/habitgen.sh [hours=3] [habits="masher,blocker,none"] [dir name=gen] [eval habits=habits]
# Eval habits may include ones it never trained on (seq-test: cycles held out of seq-train).
# Waits for AC power first. Results: data/brain-habit/ceiling.log
cd "$(dirname "$0")/../.." || exit 1
HOURS=${1:-3}; HABITS=${2:-"masher,blocker,none"}
NAME=${3:-gen}; EVALS=${4:-$HABITS}
OUT=data/brain-habit; LOG=$OUT/ceiling.log; d=$OUT/$NAME
say() { echo "[$(date '+%a %H:%M:%S')] $*" | tee -a $LOG; }
# hunteval.js sometimes stalls ~16 min (seen Oct 14, plain habits too): 10 min cap, one retry if
# no JSON came out. (perl alarm + exec did not stop node, hence the sleeping killer.)
evalrun() { local json=$1; shift
  for t in 1 2; do
    rm -f $json
    node tools/brain/hunteval.js --json=$json "$@" & local pid=$!
    ( sleep 600; kill $pid 2>/dev/null ) & local dog=$!
    wait $pid; kill $dog 2>/dev/null
    [ -f $json ] && return
  done; }

until pmset -g batt | grep -q "AC Power"; do sleep 60; done
if [ ! -f $d/latest.json ]; then
  mkdir -p $d
  cp data/brain/latest.json data/brain/state.json $d/
  cp data/brain/latest.json $d/target.json
fi
# The shipped brain's baseline on each habit, if not measured yet.
BASE=$(node -e 'console.log(require("./data/brain/latest.json").iter)')
for v in $(echo $EVALS | tr ',' ' '); do
  [ $v = none ] || [ -f $OUT/base-$BASE-vs-$v.json ] && continue
  evalrun $OUT/base-$BASE-vs-$v.json --eps=200 --no-mirror --port=8141 --ckpt=data/brain/latest.json --target=data/brain/latest.json --habit=$v > $OUT/base-$BASE-vs-$v.out 2>&1
  say "base $BASE vs $v: $(cat $OUT/base-$BASE-vs-$v.json 2>/dev/null)"
done
say "generalist $NAME: $HOURS h vs habits $HABITS"
# train.js can die at startup (Oct 14: worker page-load timeout) and leave the net untouched,
# so retry with the hours left (it resumes from $d) and refuse to evaluate an untrained net.
iterof() { node -e 'console.log(require("./"+process.argv[1]).iter)' $d/state.json; }
it0=$(iterof); t0=$SECONDS
for try in 1 2 3; do
  left=$(echo "$HOURS - ($SECONDS - $t0) / 3600" | bc -l)
  [ $(echo "$left < 0.1" | bc) = 1 ] && break
  node tools/brain/train.js --dir=$d --hunt=$d/target.json --habit=$HABITS --torch --threads=2 --workers=3 --hours=$left >> $d/train.out 2>&1
  say "generalist stopped (try $try, iter $it0 -> $(iterof)): $(tail -1 $d/train.out)"
done
[ "$(iterof)" = "$it0" ] && { say "generalist never trained (iter still $it0), skipping evals"; exit 1; }

for v in $(echo $EVALS | tr ',' ' '); do
  hab="--habit=$v"; [ $v = none ] && hab=""
  for w in 0 60; do
    evalrun $OUT/$NAME-vs-$v-wipe$w.json --eps=200 --no-mirror --port=8141 --ckpt=$d/latest.json --target=data/brain/latest.json $hab --wipe=$w \
      > $OUT/$NAME-vs-$v-wipe$w.out 2>&1
    say "$NAME vs $v wipe=$w: $(cat $OUT/$NAME-vs-$v-wipe$w.json 2>/dev/null)"
  done
done
say "done"
