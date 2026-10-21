#!/bin/sh
# sheet.sh <mov> <start-frame> <every> [cols] [rows] → <mov>.sheet.jpg: a numbered contact sheet for review.
in=$1; s=${2:-0}; n=${3:-10}; c=${4:-8}; r=${5:-4}
ffmpeg -loglevel error -y -i "$in" -vf "select='gte(n\,$s)*not(mod(n-$s\,$n))',scale=270:-1,tile=${c}x${r}" -frames:v 1 -vsync vfr "${in%.*}.sheet.jpg"
echo "${in%.*}.sheet.jpg"
