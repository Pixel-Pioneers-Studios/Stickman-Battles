#!/bin/bash
# Renders every film shot at 1080p, three at a time. FRAMES per shot come from `node film/run.js measure <shot>`.
cd "$(dirname "$0")/.."
run() { PORT=$1 FRAMES=$3 node film/run.js capture $2 land > work/film-$2.log 2>&1; echo "$2 exit $?" >> work/film-render.log; }
: > work/film-render.log
run 8501 a1-open 980 & run 8504 a1-clash 1300 & run 8507 a2-patterns 808 & wait
run 8501 a2-dominion 803 & run 8504 a2-fall 700 & run 8507 a3-bearers 841 & wait
run 8501 a3-unwritten 536 & run 8504 a3-final 1754 & wait
cat work/film-render.log
