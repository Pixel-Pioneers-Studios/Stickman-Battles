#!/bin/bash
# tools/brain/startupnight.sh — retrain Sovereign under swing startup (smb-globals.js SWING_STARTUP_*,
# SWING_SEEN_LAG), then test whether his memory now reads opponents. DEV ONLY.
#
#   1. data/brain-startup: from the shipped net, league training under the new rules
#   2. strength: candidate vs shipped (both under the new rules), 200 matches
#   3. adaptation: candidate and shipped vs habit opponents (timed-masher, timed-blocker, plain), memory
#      kept vs wiped every 60 decisions. Adapts = wiping costs clearly more on the habits than on plain,
#      and more than it costs the shipped net.
#
# Usage: tools/brain/startupnight.sh [hours=8]
# Waits for AC power. Resumes training if the dir exists. Log: data/brain-startup/night.log
cd "$(dirname "$0")/../.." || exit 1
H=${1:-8}
d=data/brain-startup; LOG=$d/night.log; SHIP=data/brain/latest.json
mkdir -p $d/snapshots $d/evals
say() { echo "[$(date '+%a %H:%M:%S')] $*" | tee -a $LOG; }
iterof() { node -e 'try { console.log(require("./" + process.argv[1]).iter) } catch (e) { console.log(0) }' $d/state.json; }
evalrun() { local json=$1; shift
  for t in 1 2; do
    rm -f $json
    node tools/brain/hunteval.js --json=$json "$@" & local pid=$!
    ( sleep 1200; kill $pid 2>/dev/null ) & local dog=$!
    wait $pid; kill $dog 2>/dev/null
    [ -f $json ] && return
  done; }
win() { node -e 'try { console.log(require("./" + process.argv[1]).hunter.win + "%") } catch (e) { console.log("?") }' $1; }

if [ ! -f $d/latest.json ]; then
  cp $SHIP $d/latest.json
  node -e '
    const fs = require("fs"), [d, src] = process.argv.slice(1), ck = JSON.parse(fs.readFileSync(src));
    const s = JSON.parse(fs.readFileSync("data/brain/state.json"));
    const f = "iter-" + String(ck.iter).padStart(5, "0") + ".json";
    fs.copyFileSync(src, d + "/snapshots/" + f);
    s.iter = ck.iter; s.pool = [{ iter: ck.iter, file: f }]; s.recent = [];
    fs.writeFileSync(d + "/state.json", JSON.stringify(s));' $d $SHIP
fi

until pmset -g batt | grep -q "AC Power"; do sleep 60; done
it0=$(iterof); t0=$SECONDS
say "on AC; startup retrain from iter $it0, $H h"
for try in 1 2 3 4; do
  left=$(echo "$H - ($SECONDS - $t0) / 3600" | bc -l)
  [ $(echo "$left < 0.1" | bc) = 1 ] && break
  node tools/brain/train.js --dir=$d --torch --threads=2 --workers=3 --hours=$left --twitchpen=0.008 >> $d/train.out 2>&1
  say "training stopped (try $try, iter $it0 -> $(iterof)): $(tail -1 $d/train.out)"
done
[ "$(iterof)" = "$it0" ] && { say "never trained (iter still $it0)"; exit 1; }

E=$d/evals
evalrun $E/cand-vs-ship.json --eps=200 --port=8186 --ckpt=$d/latest.json --target=$SHIP > $E/cand-vs-ship.out 2>&1
say "candidate $(iterof) vs shipped (new rules): mirror $(node -e 'try{console.log(require("./'$E'/cand-vs-ship.json").mirror.win+"%")}catch(e){console.log("?")}'), candidate $(win $E/cand-vs-ship.json)"
for who in cand ship; do
  ck=$d/latest.json; [ $who = ship ] && ck=$SHIP
  for v in timed-masher timed-blocker none; do
    hab="--habit=$v"; [ $v = none ] && hab=""
    for w in 0 60; do
      evalrun $E/$who-vs-$v-wipe$w.json --eps=200 --no-mirror --port=8186 --ckpt=$ck --target=$SHIP $hab --wipe=$w > $E/$who-vs-$v-wipe$w.out 2>&1
      say "$who vs $v wipe=$w: $(win $E/$who-vs-$v-wipe$w.json)"
    done
  done
done
say "done"
