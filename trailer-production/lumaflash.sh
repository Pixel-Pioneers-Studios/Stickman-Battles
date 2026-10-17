#!/bin/sh
# Counts white-outs in a clip from its average brightness: a frame is "washed"
# when it is much brighter than the median of the three seconds around it.
#   sh lumaflash.sh work/audit/duel.mov
for f in "$@"; do
ffmpeg -hide_banner -loglevel error -i "$f" -vf "scale=160:90,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-" -an -f null - 2>/dev/null | grep YAVG | cut -d= -f2 | node -e '
const y=require("fs").readFileSync(0,"utf8").trim().split("\n").map(Number);let ev=0,fr=0,inF=false,runs=[],st=0;
for(let i=0;i<y.length;i++){const w=y.slice(Math.max(0,i-90),i+90).sort((a,b)=>a-b);const med=w[w.length>>1];const hot=y[i]>med+28;if(hot){fr++;if(!inF){ev++;st=i;}}else if(inF)runs.push(st+"+"+(i-st));inF=hot;}
console.log(process.argv[1],"white-outs",ev,"washed frames",fr,"of",y.length,"=",(ev/(y.length/3600)).toFixed(0)+"/min,",(100*fr/y.length).toFixed(1)+"%","\n  runs(frame+len):",runs.join(" "))' "$f"
done
