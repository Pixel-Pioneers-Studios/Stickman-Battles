// Does the HUMAN get better against Sovereign as a match goes on?
// Share of all damage dealt by the human, by third of the match, and KO order.
const fs=require('fs');
const pool=[[0,0],[0,0],[0,0]], koPool=[[0,0],[0,0],[0,0]]; const rows=[];
for (const f of process.argv.slice(2)) {
  let j; try{ j=JSON.parse(fs.readFileSync(f,'utf8')); }catch(e){continue;}
  const fr=(j.frames||[]).filter(Boolean); if(!fr.length||fr[0].length!==2) continue;
  const si=fr[0].findIndex(p=>/SOVEREIGN/i.test(p.name||'')); if(si<0) continue; const hi=1-si;
  const ev=(j.events||[]).filter(e=>e.t==='dmg'&&e.v>0&&e.v<200); if(ev.length<60) continue;
  const end=Math.max(...j.events.map(e=>e.fc||0));
  const t=[[0,0],[0,0],[0,0]];
  for(const e of ev){const k=Math.min(2,Math.floor(3*e.fc/end)); t[k][e.p===si?0:1]+=e.v;}
  const kos=[[0,0],[0,0],[0,0]];
  for(const e of j.events){ if(e.t!=='ko'&&e.t!=='stock') continue; if(e.t!=='ko') continue; const k=Math.min(2,Math.floor(3*e.fc/end)); if(e.p===si)kos[k][0]++; else if(e.p===hi)kos[k][1]++; }
  const sh=t.map(x=>100*x[0]/(x[0]+x[1]||1));
  t.forEach((x,k)=>{pool[k][0]+=x[0];pool[k][1]+=x[1];koPool[k][0]+=kos[k][0];koPool[k][1]+=kos[k][1];});
  rows.push({f:f.replace(/.*\//,'').replace('smb_replay_sovereign_','').replace('.smbreplay',''),win:j.meta.winner==='P1'?'you':'sov',sh,d:sh[2]-sh[0]});
}
for(const r of rows) console.log(r.f.padEnd(22), r.win, r.sh.map(x=>x.toFixed(0).padStart(3)).join(' '), (r.d>=0?'+':'')+r.d.toFixed(0));
console.log('matches',rows.length);
console.log('pooled human damage share by third:', pool.map(x=>(100*x[0]/(x[0]+x[1])).toFixed(1)).join(' / '));
console.log('pooled KOs of Sov : KOs of human by third:', koPool.map(x=>x[0]+':'+x[1]).join('  '));
const d=rows.map(r=>r.d), m=d.reduce((a,b)=>a+b,0)/d.length, sd=Math.sqrt(d.reduce((a,b)=>a+(b-m)**2,0)/(d.length-1));
console.log('mean change last third - first third:', m.toFixed(1),'pts, SE',(sd/Math.sqrt(d.length)).toFixed(1), ' up in', d.filter(x=>x>0).length,'of',d.length);
