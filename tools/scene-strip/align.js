const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT='/Users/aarushgupta/Developer/Personal/Stickman-Battles';
function walk(d){let o=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?o=o.concat(walk(p)):e.name.endsWith('.js')&&o.push(p);}return o;}
const ctx={window:{},console};ctx.window.window=ctx.window;ctx.STORY_CHAPTER_REGISTRY=[];vm.createContext(ctx);
for(const f of walk(ROOT+'/js/story/acts')){try{vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});}catch(e){console.error('ERR',f,e.message);}}
for(const f of walk(ROOT+'/js/story/scenes')){vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});}
function parse(lines){var beats=[],group=[];function pushRun(r){if(!r.length)return;var q=r.some(l=>l.trim().charAt(0)==='"');var sp='none';if(q){var lo=r.join(' ').toLowerCase();sp=(lo.includes('your voice')||lo.includes('you said')||lo.includes('you replied')||lo.includes('you asked'))?'player':'npc';}beats.push({lines:r.filter(l=>l.trim()!==''),speaker:sp});}
function flush(){if(!group.length)return;var cur=[],cq=null;for(const g of group){var isQ=g.trim().charAt(0)==='"';if(cq===null)cq=isQ;if(isQ!==cq){pushRun(cur);cur=[];cq=isQ;}cur.push(g);}pushRun(cur);group=[];}
for(const l of lines){if(l==='')flush();else group.push(l);}flush();return beats;}
const want=process.argv.slice(2).map(Number);
const S=ctx.window.STORY_SCENE_SPECS;
for(const ch of ctx.STORY_CHAPTER_REGISTRY){ if(want.length&&!want.includes(ch.id))continue; const sp=S[ch.id]; if(!sp)continue;
 const lines=ch.narrative||ch.lines||ch.text||[]; const b=parse(lines);
 // afterNarrative plays after the branch beat, staged from the same spec at an offset of the narrative's beat count.
 const nMain=b.length; if(Array.isArray(ch.afterNarrative)) parse(ch.afterNarrative).forEach(x=>{x.after=true;b.push(x);});
 console.log(`\n=== id ${ch.id} "${ch.title}" text ${b.length}${b.length!==nMain?' ('+nMain+'+'+(b.length-nMain)+' after)':''} / staged ${sp.beats.length}  arena=${ch.arena||ch.style} type=${ch.type||''} opp=${ch.opponentName||''}`);
 b.forEach((x,i)=>{const t=x.lines.join(' ');const c=t.length;console.log(`  [${i}]${x.after?'A':''} ${x.speaker} ${c}ch typed@${Math.round(.84*c)} len~${Math.round(Math.max(.84*c+80,2.5*c))}: ${t}`);});
}
