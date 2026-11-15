// What does the HUMAN do right after his own stun ends ("wake") or his swing misses ("whiff")?
// First new swing / guard / jump inside 48 game frames of the trigger, and how long he waits.
const fs=require('fs');
const q=(a,p)=>{if(!a.length)return NaN;const s=a.slice().sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p*s.length))];};
const all={wake:[],whiff:[]}; const rows=[];
for (const f of process.argv.slice(2)) {
  let j; try{ j=JSON.parse(fs.readFileSync(f,'utf8')); }catch(e){continue;}
  const fr=(j.frames||[]).filter(Boolean); if(!fr.length||fr[0].length!==2) continue;
  const si=fr[0].findIndex(p=>/SOVEREIGN/i.test(p.name||'')); if(si<0) continue; const hi=1-si; const N=j.meta.recordEveryN||1;
  const W=Math.round(48/N); const R={wake:{n:0,atk:[],grd:0,jmp:0,none:0},whiff:{n:0,atk:[],grd:0,jmp:0,none:0}};
  let hp0=0;
  for(let i=1;i<fr.length-W;i++){ const a=fr[i][hi],b=fr[i-1][hi],s=fr[i][si]; if(!a||!b||!s||a.hp<=0||a.lives!==b.lives) continue;
    if(a.atk>0&&!(b.atk>0)) hp0=s.hp;
    const wake=b.stn>0&&!(a.stn>0)&&!(a.rag>0), whiff=b.atk>0&&!(a.atk>0)&&s.hp>=hp0;
    const kind=wake?'wake':whiff?'whiff':null; if(!kind) continue;
    if(Math.abs(a.x-s.x)>220) continue;           // only when the other fighter is near enough to matter
    const r=R[kind]; r.n++; let got=false;
    for(let k=1;k<=W&&!got;k++){ const c=fr[i+k][hi],p=fr[i+k-1][hi]; if(!c||!p||c.lives!==a.lives) break;
      if(c.stn>0) break;                           // hit again before he chose
      if(c.atk>0&&!(p.atk>0)){ r.atk.push(k*N); got=true; }
      else if(c.sh&&!p.sh){ r.grd++; got=true; }
      else if(!c.g&&p.g){ r.jmp++; got=true; } }
    if(!got) r.none++; }
  const name=f.replace(/.*\//,'').replace('smb_replay_sovereign_','').replace('.smbreplay','');
  const cell=k=>{const r=R[k]; if(r.n<8) return '      (few)                 '; all[k].push({p:r.atk.length/r.n,med:q(r.atk,.5),iqr:q(r.atk,.75)-q(r.atk,.25),n:r.n});
    return `${String(r.n).padStart(3)}  swing ${(100*r.atk.length/r.n).toFixed(0).padStart(3)}% guard ${(100*r.grd/r.n).toFixed(0).padStart(2)}% jump ${(100*r.jmp/r.n).toFixed(0).padStart(2)}%  wait ${String(q(r.atk,.5)).padStart(2)}f (mid half ${q(r.atk,.25)}-${q(r.atk,.75)})`;};
  console.log(name.padEnd(18),'| wake',cell('wake'),'| whiff',cell('whiff'));
}
for(const k of ['wake','whiff']){const A=all[k]; const m=A.reduce((s,x)=>s+x.p,0)/A.length; const sd=Math.sqrt(A.reduce((s,x)=>s+(x.p-m)**2,0)/(A.length-1));
  const exp=Math.sqrt(A.reduce((s,x)=>s+m*(1-m)/x.n,0)/A.length);
  const meds=A.map(x=>x.med).filter(x=>x===x);
  console.log(`${k}: swings first ${(100*m).toFixed(0)}% of the time; match-to-match sd ${(100*sd).toFixed(0)} pts (chance alone would give ${(100*exp).toFixed(0)}); median wait by match ${q(meds,.1)}-${q(meds,.9)} f, typical within-match mid-half width ${q(A.map(x=>x.iqr).filter(x=>x===x),.5)} f`);}
