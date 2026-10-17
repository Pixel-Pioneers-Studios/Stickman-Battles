'use strict';
/*
 * tools/sov-possess.js — the possessed Sovereign (F7 / spirit) plays a Weekly
 * Challenge stage in the REAL game, many times. DEV ONLY.
 *
 * Reports wins, lives lost, damage both ways, how much of the fight he spent in
 * reach without swinging, what blocked the swings he asked for, and which
 * branch of his decision cascade he was in when he did not ask.
 *
 *   node tools/sov-possess.js [--stage=2] [--n=15] [--par=5] [--port=8140]
 *                             [--off=freeSwing,level]   SMK2_TUNE or BOT_TACTICS dials to switch off
 *
 * One browser per worker, never tabs: a background tab's game loop is frozen,
 * and a frozen match reads as Sovereign standing still for the whole fight.
 * Matches that time out or where he stood still >30% leave a trace-N.txt here.
 */
const fs=require('fs'),path=require('path'),http=require('http');
const ROOT=path.resolve(__dirname,'..');
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const m=a.match(/^--([^=]+)(?:=(.*))?$/);return m?[m[1],m[2]===undefined?true:m[2]]:[a,true];}));
const OUT=path.join(ROOT,'data','sov-possess'); fs.mkdirSync(OUT,{recursive:true});
const N=+args.n||6, PAR=+args.par||3, STAGE=args.stage===undefined?2:+args.stage, OFF=args.off?String(args.off).split(','):[], PORT=+args.port||8140;
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg'};
(async()=>{
  const server=await new Promise(res=>{const s=http.createServer((rq,rs)=>{let p=decodeURIComponent(rq.url.split('?')[0]);if(p==='/')p='/index.html';const fp=path.join(ROOT,p);
    if(!fp.startsWith(ROOT)||!fs.existsSync(fp)||fs.statSync(fp).isDirectory()){rs.writeHead(404);return rs.end();}
    rs.writeHead(200,{'Content-Type':MIME[path.extname(fp)]||'application/octet-stream'});fs.createReadStream(fp).pipe(rs);}).listen(PORT,()=>res(s));});
  const puppeteer=require(path.join(ROOT,'node_modules','puppeteer'));
  const mk=()=>puppeteer.launch({headless:'new',protocolTimeout:600000,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--mute-audio','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  const results=[]; let next=0;
  async function worker(w){
    const browser=await mk(); const page=await browser.newPage(); await page.setViewport({width:1000,height:640});
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.goto(`http://localhost:${PORT}/index.html`,{waitUntil:'load'}); await new Promise(r=>setTimeout(r,2500));
    while(next<N){ const i=next++;
      const r=await page.evaluate(async(STAGE,OFF)=>{
        const sleep=ms=>new Promise(r=>setTimeout(r,ms));
        for(const k of OFF){ if(k in BOT_TACTICS) BOT_TACTICS[k]=false; else SMK2_TUNE[k]=false; }
        try{ if(SovereignControl.active) SovereignControl.release(); }catch(e){}
        try{ if(typeof _hideLadderResult==='function')_hideLadderResult(); if(gameRunning) backToMenu(); }catch(e){}
        const d=WeeklyChallenge.def(), st=d.stages[STAGE];
        startLadderRung(0,{weekly:true,def:Object.assign({},st,{cardTitle:'T',p1Weapon:d.kit.weapon,p1Class:d.kit.cls,p1Lives:d.twist.p1Lives||3,p1HpMul:d.twist.p1HpMul||1,p2HpMul:d.twist.p2HpMul||1})});
        let t=0; while(!(gameRunning&&players.length>=2&&!(typeof gameLoading!=='undefined'&&gameLoading))&&t<200){await sleep(100);t++;}
        await sleep(600);
        const me=players[0], bot=players[1];
        const ok=SovereignControl.engage();
        const A={frames:0,noCall:0,sovCalls:0,fighterCalls:0,started:0,commit:{},veto:{}};
        if(!window.__fa){ window.__fa=Fighter.prototype.attack; window.__sa=SovereignMK2.prototype.attack; }
        const inReach=()=>{const dy=Math.abs((me.y+me.h)-(bot.y+bot.h)),dx=Math.abs(me.cx()-bot.cx());return dx<=120&&dy<=60&&me.cooldown<=0&&!(me.attackTimer>0)&&!(me.attackEndlag>0)&&!(me.stunTimer>0)&&!(me.ragdollTimer>0)&&bot.health>0&&me.health>0;};
        let called=false;
        Fighter.prototype.attack=function(){ if(this===me&&inReach()){A.fighterCalls++; const r=window.__fa.apply(this,arguments); if(this.attackTimer>0)A.started++; else { const k='guard:'+(bot.shielding?'shielding ':'')+(bot.invincible>0?'iframes ':'')+(this.onGround?'G':'air'); A.veto[k]=(A.veto[k]||0)+1; } return r;} return window.__fa.apply(this,arguments); };
        SovereignMK2.prototype.attack=function(){ if(this===me&&inReach()){A.sovCalls++; called=true; const pv=this._planVetoed||0,bh=this._baitHeld||0,fc=A.fighterCalls; const r=window.__sa.apply(this,arguments); if(A.fighterCalls===fc){const k=(this._planVetoed||0)>pv?'plan':(this._baitHeld||0)>bh?'bait':(bot.shielding?'freshshield':(this.stamina<15?'stamina':'iframe/other')); A.veto[k]=(A.veto[k]||0)+1;} return r;} return window.__sa.apply(this,arguments); };
        const ua=me.updateAI; me.updateAI=function(){ const ir=inReach(); called=false; this._lastCommit=null; const r=SovereignMK2.prototype.updateAI.apply(this,arguments); if(ir){A.frames++; if(!called){A.noCall++; const k=this._lastCommit||'?'; A.commit[k]=(A.commit[k]||0)+1;}} return r; };

        const S={ok,kit:me.weaponKey+'/'+(me.charClass||''),foe:bot.weaponKey+'/'+(bot.charClass||'')+' '+bot.aiDiff,arena:currentArenaKey,hp:[me.maxHealth,bot.maxHealth],
          n:0,air:0,apart:0,still:0,far:0,shield:0,meDeaths:[],botDeaths:[],dmgTo:0,dmgBy:0,supers:0,abil:0,swings:0,idle:{},inreach:0,reachReady:0,botSw:0,locked:0};
        S.A=A;
        let pm=me.health,pb=bot.health,lm=me.lives,lb=bot.lives,sm=me.superMeter,pat=0,pcd=0;
        const tick=()=>{ if(!(me.health>0&&bot.health>0)){pm=me.health;pb=bot.health;return;}
          S.n++; if(!me.onGround)S.air++; const dy=Math.abs((me.y+me.h)-(bot.y+bot.h)),dx=Math.abs(me.cx()-bot.cx());
          if(dy>60)S.apart++; if(dx>300)S.far++; if(me.onGround&&Math.abs(me.vx)<0.5&&!(me.attackTimer>0)&&!(me.stunTimer>0)&&!me.shielding)S.still++; if(me.shielding)S.shield++;
          const idle=me.onGround&&Math.abs(me.vx)<0.5&&!(me.attackTimer>0)&&!(me.stunTimer>0)&&!me.shielding&&!(me.ragdollTimer>0);
          if(idle){ const busy=(typeof MoveScene!=='undefined'&&MoveScene.isBusy(me)); const k=busy?'scene':me.attackEndlag>0?'endlag':me._landLag>0?'landlag':dy>60?(me.y<bot.y?'above':'below'):dx<=120?(me.cooldown>0?'reach_cd':'reach_ready'):dx<=300?(me.cooldown>0?'mid_cd':'mid_ready'):'far'; S.idle[k]=(S.idle[k]||0)+1; }
          if(dx<=120&&dy<=60){S.inreach++; if(me.cooldown<=0&&!(me.attackTimer>0)&&!(me.attackEndlag>0)&&!(me.stunTimer>0)&&!(me.ragdollTimer>0))S.reachReady++;}
          if(bot.attackTimer>0&&!S._bat)S.botSw++; S._bat=bot.attackTimer>0; if(me.stunTimer>0||me.ragdollTimer>0)S.locked++;
          if(me.health<pm)S.dmgBy+=pm-me.health; if(bot.health<pb)S.dmgTo+=pb-bot.health; pm=me.health;pb=bot.health;
          if(me.superMeter<sm-40)S.supers++; sm=me.superMeter; if(me.attackTimer>0&&!pat)S.swings++; pat=me.attackTimer>0; if((me.abilityCooldown||0)>pcd+10)S.abil++; pcd=me.abilityCooldown||0; };
        const where=f=>({x:Math.round(f.cx()),y:Math.round(f.y+f.h),hp:Math.round(f.health)});
        S.tr=[];let tk=0;const iv=setInterval(()=>{ try{ tick(); if(++tk%20===0&&S.tr.length<400)S.tr.push([Math.round(me.cx()),Math.round(me.y+me.h),+me.vx.toFixed(1),+me.vy.toFixed(1),me.onGround?'G':'a','|',Math.round(bot.cx()),Math.round(bot.y+bot.h),bot.onGround?'G':'a',bot._btNavFc>=frameCount-20?(bot._btJump?'fly':'nav'):'',Math.round(me.health),Math.round(bot.health),me._lastCommit,'cd'+Math.round(me.cooldown||0),'react'+(me.aiReact||0),me.target===bot?'':'TARGET?'].join(' '));
          if(me.lives<lm){S.meDeaths.push(Object.assign(where(me),{ring:me.health>0||me.y>520||me.cx()<-40||me.cx()>940}));lm=me.lives;}
          if(bot.lives<lb){S.botDeaths.push(where(bot));lb=bot.lives;} }catch(e){} },16);
        let w=0; const open=()=>{const el=document.getElementById('ladderResult');return el&&el.style.display!=='none';};
        while(!open()&&w<1500){await sleep(100);w++;}
        clearInterval(iv);
        S.result=open()?document.getElementById('ladderResultHead').textContent:'TIMEOUT'; S.secs=Math.round(w/10); S.meLives=me.lives; S.botLives=bot.lives; S.active=SovereignControl.active;
        return S;
      },STAGE,OFF);
      r.errs=errs.splice(0); results.push(r); if(r.still/Math.max(1,r.n)>0.3||/TIMEOUT/.test(r.result)) fs.writeFileSync(path.join(OUT,'trace-'+i+'.txt'),r.tr.join('\n'));
      const p=(a)=>(100*a/Math.max(1,r.n)).toFixed(0)+'%';
      console.log(`#${i} ${r.result.padEnd(13)} ${r.secs}s lives me ${r.meLives} bot ${r.botLives} | dmg dealt ${Math.round(r.dmgTo)} taken ${Math.round(r.dmgBy)} | air ${p(r.air)} apart ${p(r.apart)} far ${p(r.far)} still ${p(r.still)} guard ${p(r.shield)} | swings ${r.swings} Q ${r.abil} E ${r.supers} | my deaths ${JSON.stringify(r.meDeaths)}${r.errs.length?' ERR '+r.errs[0]:''}`);
    }
    await browser.close();
  }
  await Promise.all(Array.from({length:PAR},(_,w)=>worker(w)));
  const r0=results[0]; console.log(`\n${r0.kit} (hp ${r0.hp[0]}) vs ${r0.foe} (hp ${r0.hp[1]}) on ${r0.arena}  off:[${OFF}]  possession engaged: ${results.every(r=>r.ok)}`);
  const wins=results.filter(r=>/CLEARED/.test(r.result)).length;
  const sum=k=>results.reduce((a,r)=>a+r[k],0), n=sum('n');
  const deaths=results.flatMap(r=>r.meDeaths);
  console.log(`wins ${wins}/${results.length}  lives lost ${deaths.length} (ring-outs ${deaths.filter(d=>d.ring).length})  dmg dealt ${Math.round(sum('dmgTo'))} taken ${Math.round(sum('dmgBy'))}`);
  console.log(`air ${(100*sum('air')/n).toFixed(0)}%  apart in height ${(100*sum('apart')/n).toFixed(0)}%  >300px away ${(100*sum('far')/n).toFixed(0)}%  standing still ${(100*sum('still')/n).toFixed(0)}%  guard ${(100*sum('shield')/n).toFixed(0)}%  swings/min ${(sum('swings')/(n/3600)).toFixed(0)}`);
  const A={frames:0,noCall:0,sovCalls:0,fighterCalls:0,started:0,commit:{},veto:{}}; for(const r of results){ for(const k of ['frames','noCall','sovCalls','fighterCalls','started'])A[k]+=r.A[k]; for(const k in r.A.commit)A.commit[k]=(A.commit[k]||0)+r.A.commit[k]; for(const k in r.A.veto)A.veto[k]=(A.veto[k]||0)+r.A.veto[k]; }
  console.log(`AI frames in reach with a swing ready: ${A.frames}; attack never called on ${A.noCall}; called ${A.sovCalls}, reached the engine ${A.fighterCalls}, swing started ${A.started}`);
  console.log(' blocked by: '+Object.entries(A.veto).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+v).join('  '));
  console.log(' last commit when attack was not called: '+Object.entries(A.commit).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>k+' '+v).join('  '));
  const idle={}; for(const r of results) for(const k in r.idle) idle[k]=(idle[k]||0)+r.idle[k];
  console.log('standing still, by situation (% of live time): '+Object.entries(idle).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+(100*v/n).toFixed(1)+'%').join('  '));
  console.log(`in reach ${(100*sum('inreach')/n).toFixed(0)}% of the time; of that, free to swing but not swinging ${(100*sum('reachReady')/Math.max(1,sum('inreach'))).toFixed(0)}%   stunned ${(100*sum('locked')/n).toFixed(0)}%   bot swings/min ${(sum('botSw')/(n/3600)).toFixed(0)}`);
  server.close(); process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
