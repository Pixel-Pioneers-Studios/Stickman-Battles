// Narrative volume + runtime estimate for the story, or one file.
const fs=require("fs"),path=require("path");
function walk(d){let o=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?o=o.concat(walk(p)):e.name.endsWith(".js")&&o.push(p);}return o;}
global.STORY_CHAPTER_REGISTRY=[];
const only=process.argv[2];
const files=only?[only]:walk("js/story/acts");
for(const f of files){try{eval(fs.readFileSync(f,"utf8"))}catch(e){}}
const type=l=>l*0.014, hold=l=>Math.min(300,Math.max(45,60*(l/24)-l*0.014*60));
let beats=0,chars=0,sec=0;
for(const c of STORY_CHAPTER_REGISTRY){
  let bs=[],run=[];
  for(const l of(c.narrative||[])){if(l.trim()===""){if(run.length){bs.push(run.join(" "));run=[];}}else run.push(l);}
  if(run.length)bs.push(run.join(" "));
  for(const b of bs)sec+=type(b.length)+hold(b.length)/60;
  beats+=bs.length; chars+=(c.narrative||[]).join("").length;
}
console.log(`${beats} beats  ${chars} chars  ${(sec/60).toFixed(1)} min`);
