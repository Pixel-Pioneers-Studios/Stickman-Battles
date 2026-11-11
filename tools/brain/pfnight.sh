#!/bin/bash
# tools/brain/pfnight.sh — builds a Layer 2 portfolio with real counters, then tests whether picking
# between its nets mid-match adapts. DEV ONLY.
#
#   1. hunter5: exploiter of the shipped net (20011)
#   2. patch5:  the shipped net retrained with hunter5 in its league (fixes that hole, opens others)
#   3. hunter6: exploiter of patch5
#   4. tools/brain/pfeval.js: portfolio {shipped, patch5}, each alone and Thompson-sampled, vs both
#      hunters, the old hunters and the two nets themselves.
# Adapting = the sampled arm is close to the better single net on every opponent, while each single
# net loses badly to one of them.
#
# Usage: tools/brain/pfnight.sh [hours per training phase=1.5]
# Waits for AC power. Resumes: a phase whose dir has advanced is not retrained. Log: data/brain-portfolio/night.log
cd "$(dirname "$0")/../.." || exit 1
H=${1:-1.5}
OUT=data/brain-portfolio; LOG=$OUT/night.log
mkdir -p $OUT
say() { echo "[$(date '+%a %H:%M:%S')] $*" | tee -a $LOG; }
iterof() { node -e 'try { console.log(require("./" + process.argv[1]).iter) } catch (e) { console.log(0) }' $1/state.json; }
# A dir starting from checkpoint $2 (league state from data/brain, iter and pool rewritten to that checkpoint).
seed() { local d=$1 src=$2
  [ -f $d/latest.json ] && return
  mkdir -p $d/snapshots
  cp $src $d/latest.json
  node -e '
    const fs = require("fs"), [d, src] = process.argv.slice(1), ck = JSON.parse(fs.readFileSync(src));
    const s = JSON.parse(fs.readFileSync("data/brain/state.json"));
    const f = "iter-" + String(ck.iter).padStart(5, "0") + ".json";
    fs.copyFileSync(src, d + "/snapshots/" + f);
    s.iter = ck.iter; s.pool = [{ iter: ck.iter, file: f }]; s.recent = [];
    fs.writeFileSync(d + "/state.json", JSON.stringify(s));' $d $src; }
train() { local d=$1; shift
  local it0=$(iterof $d) t0=$SECONDS
  for try in 1 2 3; do
    left=$(echo "$H - ($SECONDS - $t0) / 3600" | bc -l)
    [ $(echo "$left < 0.1" | bc) = 1 ] && break
    node tools/brain/train.js --dir=$d --torch --threads=2 --workers=3 --hours=$left "$@" >> $d/train.out 2>&1
    say "$d stopped (try $try, iter $it0 -> $(iterof $d)): $(tail -1 $d/train.out)"
  done
  [ "$(iterof $d)" != "$it0" ]; }
evalrun() { local json=$1; shift
  for t in 1 2; do
    rm -f $json
    node tools/brain/hunteval.js --json=$json "$@" & local pid=$!
    ( sleep 900; kill $pid 2>/dev/null ) & local dog=$!
    wait $pid; kill $dog 2>/dev/null
    [ -f $json ] && return
  done; }
win() { node -e 'try { console.log(require("./" + process.argv[1]).hunter.win + "%") } catch (e) { console.log("?") }' $1; }

until pmset -g batt | grep -q "AC Power"; do sleep 60; done
SHIP=data/brain/latest.json
say "on AC; portfolio night, $H h per phase, shipped $(node -e 'console.log(require("./data/brain/latest.json").iter)')"

d=$OUT/hunter5; seed $d $SHIP; [ -f $d/target.json ] || cp $SHIP $d/target.json
if [ ! -f $OUT/hunter5-vs-ship.json ]; then
  train $d --hunt=$d/target.json || { say "hunter5 never trained"; exit 1; }
  evalrun $OUT/hunter5-vs-ship.json --eps=200 --no-mirror --port=8181 --ckpt=$d/latest.json --target=$SHIP > $OUT/hunter5-vs-ship.out 2>&1
fi
say "hunter5 vs shipped: $(win $OUT/hunter5-vs-ship.json)"

d=$OUT/patch5; seed $d $SHIP
if [ ! -f $OUT/patch5-vs-hunter5.json ]; then
  train $d --hunters=$OUT/hunter5 --twitchpen=0.008 || { say "patch5 never trained"; exit 1; }
  evalrun $OUT/patch5-vs-hunter5.json --eps=200 --no-mirror --port=8181 --ckpt=$d/latest.json --target=$OUT/hunter5/latest.json > $OUT/patch5-vs-hunter5.out 2>&1
  evalrun $OUT/patch5-vs-ship.json --eps=200 --no-mirror --port=8181 --ckpt=$d/latest.json --target=$SHIP > $OUT/patch5-vs-ship.out 2>&1
fi
say "patch5 vs hunter5: $(win $OUT/patch5-vs-hunter5.json); patch5 vs shipped: $(win $OUT/patch5-vs-ship.json)"

d=$OUT/hunter6; seed $d $OUT/patch5/latest.json; [ -f $d/target.json ] || cp $OUT/patch5/latest.json $d/target.json
if [ ! -f $OUT/hunter6-vs-patch5.json ]; then
  train $d --hunt=$d/target.json || { say "hunter6 never trained"; exit 1; }
  evalrun $OUT/hunter6-vs-patch5.json --eps=200 --no-mirror --port=8181 --ckpt=$d/latest.json --target=$OUT/patch5/latest.json > $OUT/hunter6-vs-patch5.out 2>&1
  evalrun $OUT/hunter6-vs-ship.json --eps=200 --no-mirror --port=8181 --ckpt=$d/latest.json --target=$SHIP > $OUT/hunter6-vs-ship.out 2>&1
fi
say "hunter6 vs patch5: $(win $OUT/hunter6-vs-patch5.json); hunter6 vs shipped: $(win $OUT/hunter6-vs-ship.json)"

node tools/brain/pfeval.js --nets=$SHIP,$OUT/patch5/latest.json \
  --opps=$OUT/hunter5/latest.json,$OUT/hunter6/latest.json,data/brain-hunter4/latest.json,$SHIP,$OUT/patch5/latest.json \
  --eps=200 --port=8182 --json=$OUT/pf-night.json > $OUT/pf-night.out 2>&1
say "portfolio eval done:"; grep -E "^vs|^  " $OUT/pf-night.out | tee -a $LOG
say "done"
