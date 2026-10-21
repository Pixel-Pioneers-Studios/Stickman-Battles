'use strict';
/*
 * tools/level-spawn-audit.js — where does each story level start, and how far is the exit? (DEV ONLY)
 *
 *   node tools/level-spawn-audit.js            # chapters 0-40
 *   node tools/level-spawn-audit.js 0-185      # all; restart in chunks if a chapter wedges the page
 *
 * Launches each walkable chapter headless and prints its exit x and the player's spawn x after the
 * first few exploration frames. CHECK marks a spawn more than 700px in, or within 900px of the exit.
 * Region segments (33-35) and compact defense arenas (goal 550) are expected CHECKs.
 * Catches levels that are skippable or too short, which the level tester scores as easy WINs.
 */
const path=require('path'),fs=require('fs'),http=require('http');
const ROOT='/Users/aarushgupta/Developer/Personal/Stickman-Battles';
const [A,B]=(process.argv[2]||'0-40').split('-').map(Number);
const puppeteer=require(path.join(ROOT,'node_modules','puppeteer'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const srv=http.createServer((q,s)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(ROOT,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){s.writeHead(404);s.end();return;}s.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.html')?'text/html':'application/octet-stream'});fs.createReadStream(f).pipe(s);}).listen(+(process.env.P||8150));
(async()=>{
 const b=await puppeteer.launch({headless:'new',executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--mute-audio','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await b.newPage(); await page.setViewport({width:1280,height:760});
 await page.evaluateOnNewDocument(()=>{try{localStorage.setItem('smb_tutorialSeen','1')}catch(e){}});
 await page.goto('http://127.0.0.1:'+(process.env.P||8150)+'/index.html');
 await page.waitForFunction(()=>typeof STORY_CHAPTERS2!=='undefined'&&STORY_CHAPTERS2.length&&document.readyState==='complete',{timeout:90000});
 await sleep(1500);
 await page.evaluate(()=>{ if(typeof markTutorialSeen==='function')markTutorialSeen(); window.maybeStartFirstRun=()=>{}; _story2.prologueSeen=true;});
 await page.evaluate(()=>{const o=updateExploration; window.updateExploration=function(){ if(gameRunning&&players[0]&&_activeStory2Chapter&&_activeStory2Chapter.id===window.__want) window.__hits=(window.__hits||0)+1; return o.apply(this,arguments);};});
 console.log("id title mode exitX | spawnX");
 for(let id=A;id<=B;id++){
  const info=await page.evaluate(id=>{const c=STORY_CHAPTERS2[id];return c?{t:c.title,ex:c.type==='exploration'||c.walkFight===true,m:c.exploreMode||(c.walkFight?'walkFight':c.type||'fight')}:null;},id);
  if(!info||!info.ex){continue;}
  const row=[];
  for(const cam of [0]){
   await page.evaluate((id,cam)=>{ if(gameRunning&&typeof backToHome==='function')backToHome(); window.__sp=null; window.__hits=0; window.__want=id; camX=cam; window.__camForce=cam;
     const ch=STORY_CHAPTERS2[id]; _activeStory2Chapter=ch; _launchChapterWithGauntlet(ch);
     (function w(){ if(window.__sp)return; requestAnimationFrame(w); if(window.__hits>=3){ window.__sp={x:Math.round(players[0].x),g:exploreGoalX,sx:Math.round(players[0].spawnX)}; } else if(typeof camX!=='undefined' && !gameRunning) camX=window.__camForce; })();
   },id,cam);
   for(let i=0;i<40;i++){await sleep(250); const r=await page.evaluate(()=>window.__sp); if(r){row.push(r);break;} if(i%4===0) await page.mouse.click(640,706).catch(()=>{});}
   if(!row.length) row.push({x:'?',g:'?'});
  }
  console.log(id,info.t,info.m,row[0].g,"|",row[0].x,"spawnX",row[0].sx, (typeof row[0].x==="number"&&(row[0].x>700 || row[0].g-row[0].x<900))?'  <== CHECK':'');
 }
 await b.close(); srv.close();
})();
