'use strict';
// smb-finisher-weapon2.js — finishers for the 11 weapons missing them (loads after smb-finisher-weapon.js)
// Depends on: smb-finisher-helpers.js, smb-finisher-weapon.js (WEAPON_FINISHERS, _wfDef, _wfBaseSetup, _wfTick, _wfDrawAura)

Object.assign(WEAPON_FINISHERS, {

  // ── katana ───────────────────────────────────────────────────
  katana: _wfDef('IAIJUTSU','rgba(200,225,255,1)',128,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.cutA=0; data.splitA=0; data.clickF=0;
      // Attacker ends up behind the target (opposite side), sheathing
      data.behindX = data.dir>0 ? data.tx0+tgt.w+18 : data.tx0-att.w-18;
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); }},
        {frame:30,fn(){ CinCam.slowMo(0.07); CinCam.zoomTo(1.66); CinCam.focusMidpoint(att,tgt); if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=14; }},
        {frame:44,fn(){
          // INSTANT CUT — attacker is already behind, thin line crosses target
          data.cutA=1; data.clickF=10;
          CinCam.slowMo(1.0); CinCam.shake(20);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:3});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(tgt.cx(),tgt.cy(),'#cce6ff',24);
          CinCam.focusOn(tgt); CinCam.zoomTo(1.4);
        }},
        {frame:54,fn(){
          // DELAYED split — the sheathe "clicks", wound opens
          data.splitA=1; data.shockR=1; data.shockAlpha=1;
          CinCam.shake(34);
          spawnParticles(tgt.cx(),tgt.cy(),'#ffffff',30);
          spawnParticles(tgt.cx(),tgt.cy(),'#aaccff',18);
          CinCam.zoomTo(1.32);
        }},
        {frame:98,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,128,data);
      if(data.cutA>0&&timer>54) data.cutA=Math.max(0,data.cutA-0.05);
      if(data.splitA>0) data.splitA=Math.max(0,data.splitA-0.03);
      if(data.clickF>0) data.clickF--;
      if(timer<12){ att.x=data.ax0;att.y=data.ay0; tgt.x=data.tx0;tgt.y=data.ty0; data.auraAlpha=0; }
      else if(timer<44){
        // Attacker stands PERFECTLY STILL, aura tightens
        const p=(timer-12)/32;
        att.x=data.ax0; att.y=data.ay0; tgt.x=data.tx0;tgt.y=data.ty0;
        data.auraAlpha=p*0.85; data.auraR=18+p*22;
      }
      else if(timer<54){
        // Already behind; target frozen mid-cut
        att.x=data.behindX; att.y=data.ay0;
        tgt.x=data.tx0; tgt.y=data.ty0;
        data.auraAlpha=Math.max(0,data.auraAlpha-0.04);
      }
      else{
        // Target collapses straight DOWN
        att.x=data.behindX; att.y=data.ay0;
        const p=Math.min(1,(timer-54)/52);
        tgt.x=data.tx0; tgt.y=data.ty0+_finEaseIn(p)*62;
        data.auraAlpha=Math.max(0,data.auraAlpha-0.03);
      }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.5);
      _wfDrawAura(ctx,att,'rgba(200,225,255,1)',data.auraAlpha,data.auraR,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      // Thin instantaneous cut line across the target
      if(data.cutA>0){
        ctx.strokeStyle=`rgba(235,245,255,${data.cutA})`; ctx.lineWidth=1.5+data.cutA*2;
        ctx.shadowColor='#cce6ff'; ctx.shadowBlur=24*data.cutA;
        ctx.beginPath();
        ctx.moveTo(data.tx0-26,data.ty0+tgt.h*0.18);
        ctx.lineTo(data.tx0+tgt.w+26,data.ty0+tgt.h*0.7);
        ctx.stroke();
      }
      // Delayed split — wound opens, two halves separate slightly
      if(data.splitA>0){
        ctx.strokeStyle=`rgba(255,255,255,${data.splitA})`; ctx.lineWidth=2+data.splitA*5;
        ctx.shadowColor='#ffffff'; ctx.shadowBlur=30*data.splitA;
        ctx.beginPath();
        ctx.moveTo(data.tx0-30,data.ty0+tgt.h*0.16);
        ctx.lineTo(data.tx0+tgt.w+30,data.ty0+tgt.h*0.72);
        ctx.stroke();
      }
      ctx.restore();
      if(timer>=54&&timer<=63) _finFlash(ctx,(63-timer)/9*0.7,210,230,255);
      if(timer>58&&timer<112) _finSubtitle(ctx,'"You were already cut before you saw me move."',t);
      _finTitle(ctx,'IAIJUTSU',t,'rgba(200,225,255,1)');
    }
  ),

  // ── whip ─────────────────────────────────────────────────────
  whip: _wfDef('JUDGMENT LASH','rgba(255,190,60,1)',130,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.cracks=[]; data.coilA=0;
      data.apexY=data.ty0-110;
      const _floorPl=currentArena&&currentArena.platforms&&currentArena.platforms.find(pl=>pl.isFloor&&!pl.isFloorDisabled);
      data.groundY=_floorPl?_floorPl.y:GAME_H-120;
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); }},
        {frame:28,fn(){ CinCam.slowMo(0.07); CinCam.zoomTo(1.5); CinCam.focusMidpoint(att,tgt); data.coilA=1; if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=14; }},
        {frame:38,fn(){
          // YANK airborne
          CinCam.slowMo(0.5); CinCam.focusOn(tgt); CinCam.zoomTo(1.55);
          spawnParticles(tgt.cx(),tgt.cy(),'#ffcc44',22);
        }},
        {frame:56,fn(){ data.cracks.push({x:tgt.cx()-tgt.w,y:data.apexY,f:8}); CinCam.shake(16); spawnParticles(tgt.cx()-tgt.w,data.apexY,'#ffffff',12); }},
        {frame:64,fn(){ data.cracks.push({x:tgt.cx()+tgt.w,y:data.apexY-10,f:8}); CinCam.shake(16); spawnParticles(tgt.cx()+tgt.w,data.apexY-10,'#ffffff',12); }},
        {frame:72,fn(){ data.cracks.push({x:tgt.cx(),y:data.apexY+8,f:8}); CinCam.shake(18); spawnParticles(tgt.cx(),data.apexY+8,'#ffffff',12); }},
        {frame:82,fn(){
          // SLAM down into the ground
          data.shockR=1; data.shockAlpha=1;
          CinCam.slowMo(1.0); CinCam.shake(50);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:3});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(tgt.cx(),data.groundY-16,'#ffaa22',54);
          spawnParticles(tgt.cx(),data.groundY-16,'#ffffff',20);
          CinCam.focusMidpoint(att,tgt); CinCam.zoomTo(1.32);
        }},
        {frame:104,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,130,data);
      if(data.coilA>0&&timer>38) data.coilA=Math.max(0,data.coilA-0.06);
      for(const c of data.cracks) if(c.f>0) c.f--;
      att.x=data.ax0; att.y=data.ay0;
      if(timer<12){ tgt.x=data.tx0;tgt.y=data.ty0; data.auraAlpha=0; }
      else if(timer<28){ const p=(timer-12)/16; tgt.x=data.tx0;tgt.y=data.ty0; data.auraAlpha=p*0.7; data.auraR=22+p*22; }
      else if(timer<38){ const p=(timer-28)/10; tgt.x=data.tx0;tgt.y=data.ty0-_finEaseOut(p)*18; data.auraAlpha=0.82; data.auraR=46; }
      else if(timer<56){ const p=(timer-38)/18; tgt.x=data.tx0; tgt.y=_finLerp(data.ty0-18,data.apexY,_finEaseOut(p)); data.auraAlpha=Math.max(0,data.auraAlpha-0.03); }
      else if(timer<82){
        // Cracking in the air, slight jitter
        tgt.x=data.tx0+Math.sin(timer*0.7)*5; tgt.y=data.apexY+Math.cos(timer*0.6)*4;
      }
      else{
        const p=Math.min(1,(timer-82)/22);
        tgt.x=data.tx0; tgt.y=_finLerp(data.apexY,data.groundY-tgt.h,_finEaseIn(p));
        data.auraAlpha=Math.max(0,data.auraAlpha-0.04);
      }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.44);
      _wfDrawAura(ctx,att,'rgba(255,190,60,1)',data.auraAlpha,data.auraR,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      // The lash itself — curving line from attacker hand to target
      if(timer>=20&&timer<82){
        ctx.strokeStyle='rgba(255,200,80,0.85)'; ctx.lineWidth=3; ctx.shadowColor='#ffbb33'; ctx.shadowBlur=18;
        const hx=att.cx()+data.dir*12, hy=att.cy()-6;
        ctx.beginPath(); ctx.moveTo(hx,hy);
        ctx.quadraticCurveTo((hx+tgt.cx())/2,Math.min(hy,tgt.cy())-30,tgt.cx(),tgt.cy());
        ctx.stroke();
      }
      // Crack snap flashes
      for(const c of data.cracks){ if(c.f>0){
        const a=c.f/8;
        _finImpactLines(ctx,c.x,c.y,8,26*a,'#ffffff',2+a*3);
      }}
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(255,190,60,${data.shockAlpha})`; ctx.lineWidth=6; ctx.shadowColor='#ffbb33'; ctx.shadowBlur=28;
        ctx.beginPath(); ctx.arc(tgt.cx(),data.groundY,data.shockR,Math.PI,0); ctx.stroke();
        _finImpactLines(ctx,tgt.cx(),data.groundY,14,data.shockR*0.5,'#ffcc44',4);
      }
      ctx.restore();
      if(timer>=82&&timer<=91) _finFlash(ctx,(91-timer)/9*0.72,255,190,60);
      if(timer>56&&timer<112) _finSubtitle(ctx,'"Down on your knees. Justice is loud."',t);
      _finTitle(ctx,'JUDGMENT LASH',t,'rgba(255,190,60,1)');
    }
  ),

  // ── flail ────────────────────────────────────────────────────
  flail: _wfDef('WRECKING BALL','rgba(170,175,185,1)',126,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.orbit=0; data.orbitR=30; data.ballX=0; data.ballY=0;
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); }},
        {frame:34,fn(){ CinCam.slowMo(0.07); CinCam.zoomTo(1.5); CinCam.focusMidpoint(att,tgt); if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=14; }},
        {frame:44,fn(){
          // RELEASE — massive horizontal smash
          CinCam.slowMo(1.0); CinCam.shake(56);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:3});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          data.shockR=1; data.shockAlpha=1;
          spawnParticles(tgt.cx(),tgt.cy(),'#999999',56);
          spawnParticles(tgt.cx(),tgt.cy(),'#cccccc',22);
          CinCam.focusOn(tgt); CinCam.zoomTo(1.32);
        }},
        {frame:96,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,126,data);
      att.x=data.ax0; att.y=data.ay0;
      if(timer<12){ data.ballX=att.cx()+data.dir*30; data.ballY=att.cy(); tgt.x=data.tx0;tgt.y=data.ty0; data.auraAlpha=0; }
      else if(timer<44){
        // Ball orbits attacker, faster and faster, radius grows
        const p=(timer-12)/32;
        data.orbit+=0.18+p*0.5; data.orbitR=30+p*22;
        data.ballX=att.cx()+Math.cos(data.orbit)*data.orbitR*data.dir;
        data.ballY=att.cy()+Math.sin(data.orbit)*data.orbitR*0.7;
        tgt.x=data.tx0;tgt.y=data.ty0;
        data.auraAlpha=p*0.85; data.auraR=26+p*26;
      }
      else{
        // Released into target; target tumbles horizontally
        const p=Math.min(1,(timer-44)/52);
        data.ballX=_finLerp(att.cx()+data.dir*52,tgt.cx(),Math.min(1,p*3));
        data.ballY=tgt.cy();
        tgt.x=data.tx0+data.dir*_finEaseOut(p)*100; tgt.y=data.ty0-_finEaseOut(p)*18;
        data.auraAlpha=Math.max(0,data.auraAlpha-0.04);
      }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.46);
      _wfDrawAura(ctx,att,'rgba(170,175,185,1)',data.auraAlpha,data.auraR,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      // Chain from attacker hand to ball
      if(timer>=12&&timer<60){
        ctx.strokeStyle='rgba(120,120,130,0.85)'; ctx.lineWidth=2.5; ctx.shadowColor='#888'; ctx.shadowBlur=6;
        ctx.beginPath(); ctx.moveTo(att.cx()+data.dir*8,att.cy()-4); ctx.lineTo(data.ballX,data.ballY); ctx.stroke();
        // The iron ball
        const grd=ctx.createRadialGradient(data.ballX-4,data.ballY-4,2,data.ballX,data.ballY,13);
        grd.addColorStop(0,'#dddddd'); grd.addColorStop(1,'#555a63');
        ctx.fillStyle=grd; ctx.shadowColor='#aaa'; ctx.shadowBlur=14;
        ctx.beginPath(); ctx.arc(data.ballX,data.ballY,13,0,Math.PI*2); ctx.fill();
      }
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(190,195,205,${data.shockAlpha})`; ctx.lineWidth=6; ctx.shadowColor='#aaa'; ctx.shadowBlur=26;
        ctx.beginPath(); ctx.arc(tgt.cx(),tgt.cy(),data.shockR,0,Math.PI*2); ctx.stroke();
        _finImpactLines(ctx,tgt.cx(),tgt.cy(),12,data.shockR*0.55,'#cccccc',4);
      }
      ctx.restore();
      if(timer>=44&&timer<=52) _finFlash(ctx,(52-timer)/8*0.6,200,205,215);
      if(timer>56&&timer<108) _finSubtitle(ctx,'"Nothing left standing."',t);
      _finTitle(ctx,'WRECKING BALL',t,'rgba(170,175,185,1)');
    }
  ),

  // ── electricstaff ────────────────────────────────────────────
  electricstaff: _wfDef('OVERLOAD','rgba(60,220,255,1)',128,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.cageA=0; data.pillarA=0; data.cageBars=8;
      const _floorPl=currentArena&&currentArena.platforms&&currentArena.platforms.find(pl=>pl.isFloor&&!pl.isFloorDisabled);
      data.groundY=_floorPl?_floorPl.y:GAME_H-120;
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); }},
        {frame:30,fn(){
          // Staff plants — cage of vertical lightning bars forms
          data.cageA=1; CinCam.slowMo(0.07); CinCam.zoomTo(1.5); CinCam.focusOn(tgt);
          spawnParticles(tgt.cx(),tgt.cy(),'#44ddff',24);
          if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=14;
        }},
        {frame:48,fn(){
          // PILLAR detonates the cage
          data.pillarA=1; data.shockR=1; data.shockAlpha=1;
          CinCam.slowMo(1.0); CinCam.shake(46);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:3});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(tgt.cx(),tgt.cy(),'#66e6ff',54);
          spawnParticles(tgt.cx(),tgt.cy(),'#ffffff',24);
          CinCam.zoomTo(1.34);
        }},
        {frame:100,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,128,data);
      if(data.cageA>0&&timer>48) data.cageA=Math.max(0,data.cageA-0.08);
      if(data.pillarA>0) data.pillarA=Math.max(0,data.pillarA-0.04);
      att.x=data.ax0; att.y=data.ay0;
      if(timer<12){ tgt.x=data.tx0;tgt.y=data.ty0; data.auraAlpha=0; }
      else if(timer<48){ const p=(timer-12)/36; tgt.x=data.tx0;tgt.y=data.ty0; data.auraAlpha=p*0.8; data.auraR=24+p*24; }
      else{ const p=Math.min(1,(timer-48)/52); tgt.x=data.tx0; tgt.y=data.ty0-_finEaseOut(p)*14; data.auraAlpha=Math.max(0,data.auraAlpha-0.04); }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.48);
      _wfDrawAura(ctx,att,'rgba(60,220,255,1)',data.auraAlpha,data.auraR,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      // Cage of vertical lightning bars around the target
      if(data.cageA>0){
        const cx=data.tx0+tgt.w/2, top=data.ty0-44;
        for(let i=0;i<data.cageBars;i++){
          const a=(i/data.cageBars)*Math.PI*2;
          const bx=cx+Math.cos(a)*40;
          _finLightning(ctx,bx,top,bx+Math.sin(timer*0.5+i)*5,data.groundY,`rgba(120,230,255,${data.cageA})`,2.5,6);
        }
      }
      // Detonating pillar
      if(data.pillarA>0){
        const cx=tgt.cx();
        const grd=ctx.createLinearGradient(cx,data.groundY,cx,data.ty0-90);
        grd.addColorStop(0,`rgba(255,255,255,${data.pillarA})`);
        grd.addColorStop(0.5,`rgba(80,220,255,${data.pillarA*0.7})`);
        grd.addColorStop(1,'rgba(60,220,255,0)');
        ctx.fillStyle=grd; ctx.fillRect(cx-22,data.ty0-90,44,data.groundY-(data.ty0-90));
        _finLightning(ctx,cx,data.ty0-90,cx,data.groundY,`rgba(255,255,255,${data.pillarA})`,4,7);
      }
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(60,220,255,${data.shockAlpha})`; ctx.lineWidth=5; ctx.shadowColor='#44ddff'; ctx.shadowBlur=28;
        ctx.beginPath(); ctx.arc(tgt.cx(),tgt.cy(),data.shockR,0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
      if(timer>=48&&timer<=57) _finFlash(ctx,(57-timer)/9*0.72,120,230,255);
      if(timer>54&&timer<110) _finSubtitle(ctx,'"Too much current for one body."',t);
      _finTitle(ctx,'OVERLOAD',t,'rgba(60,220,255,1)');
    }
  ),

  // ── shield ───────────────────────────────────────────────────
  shield: _wfDef('AEGIS BREAK','rgba(90,150,255,1)',126,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.wallA=0; data.shatterA=0; data.lines=0; data.shards=[];
      // Wall materializes just past the target in the charge direction
      data.wallX = data.tx0 + (data.dir>0 ? tgt.w+30 : -30);
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); }},
        {frame:30,fn(){ CinCam.slowMo(0.07); CinCam.zoomTo(1.55); CinCam.focusMidpoint(att,tgt); data.wallA=1; if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=14; }},
        {frame:40,fn(){
          // PIN against the hard-light wall
          CinCam.slowMo(0.45); CinCam.shake(20); CinCam.focusOn(tgt);
          spawnParticles(data.wallX,tgt.cy(),'#88bbff',22);
        }},
        {frame:54,fn(){
          // Wall SHATTERS, target through it
          data.shatterA=1; data.shockR=1; data.shockAlpha=1;
          for(let i=0;i<10;i++) data.shards.push({x:data.wallX,y:tgt.cy()+(i-5)*9,vx:data.dir*(2+Math.random()*4),vy:(Math.random()-0.5)*5,a:1});
          CinCam.slowMo(1.0); CinCam.shake(48);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:3});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(data.wallX,tgt.cy(),'#cce0ff',46);
          spawnParticles(data.wallX,tgt.cy(),'#ffd866',20);
          CinCam.zoomTo(1.32);
        }},
        {frame:100,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,126,data);
      if(data.wallA>0&&timer>54) data.wallA=Math.max(0,data.wallA-0.08);
      if(data.shatterA>0) data.shatterA=Math.max(0,data.shatterA-0.03);
      for(const s of data.shards){ s.x+=s.vx; s.y+=s.vy; s.a=Math.max(0,s.a-0.025); }
      if(timer<12){ att.x=data.ax0;att.y=data.ay0; tgt.x=data.tx0;tgt.y=data.ty0; data.auraAlpha=0; data.lines=0; }
      else if(timer<40){
        // CHARGE with shield raised, speed lines
        const p=(timer-12)/28;
        att.x=_finLerp(data.ax0,data.tx0-data.dir*(att.w+6),_finEaseIn(p)); att.y=data.ay0;
        tgt.x=data.tx0;tgt.y=data.ty0;
        data.auraAlpha=p*0.85; data.auraR=24+p*26; data.lines=p;
      }
      else if(timer<54){
        // Pinned against wall
        att.x=data.tx0-data.dir*(att.w+6); att.y=data.ay0;
        tgt.x=data.dir>0?data.wallX-tgt.w:data.wallX; tgt.y=data.ty0;
        data.auraAlpha=Math.max(0,data.auraAlpha-0.03); data.lines=0;
      }
      else{
        // Through the broken wall
        att.x=data.tx0-data.dir*(att.w+6); att.y=data.ay0;
        const p=Math.min(1,(timer-54)/46);
        tgt.x=(data.dir>0?data.wallX-tgt.w:data.wallX)+data.dir*_finEaseOut(p)*42;
        tgt.y=data.ty0-_finEaseOut(p)*16;
        data.auraAlpha=Math.max(0,data.auraAlpha-0.04);
      }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.44);
      _wfDrawAura(ctx,att,'rgba(90,150,255,1)',data.auraAlpha,data.auraR,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      // Speed lines during the charge
      if(data.lines>0){
        ctx.strokeStyle=`rgba(180,210,255,${data.lines*0.7})`; ctx.lineWidth=2;
        for(let i=0;i<6;i++){ const ly=att.cy()+(i-3)*9; ctx.beginPath(); ctx.moveTo(att.cx()-data.dir*40,ly); ctx.lineTo(att.cx()-data.dir*12,ly); ctx.stroke(); }
      }
      // Hard-light wall
      if(data.wallA>0){
        ctx.fillStyle=`rgba(120,170,255,${data.wallA*0.4})`;
        ctx.strokeStyle=`rgba(255,216,102,${data.wallA})`; ctx.lineWidth=3; ctx.shadowColor='#88bbff'; ctx.shadowBlur=20;
        ctx.beginPath(); ctx.rect(data.wallX-6,tgt.cy()-46,12,92); ctx.fill(); ctx.stroke();
      }
      // Shatter shards
      for(const s of data.shards){ if(s.a>0){
        ctx.fillStyle=`rgba(200,224,255,${s.a})`; ctx.shadowColor='#88bbff'; ctx.shadowBlur=10;
        ctx.fillRect(s.x-3,s.y-3,6,6);
      }}
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(255,216,102,${data.shockAlpha})`; ctx.lineWidth=5; ctx.shadowColor='#ffd866'; ctx.shadowBlur=24;
        ctx.beginPath(); ctx.arc(tgt.cx(),tgt.cy(),data.shockR,0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
      if(timer>=54&&timer<=63) _finFlash(ctx,(63-timer)/9*0.7,150,190,255);
      if(timer>58&&timer<110) _finSubtitle(ctx,'"A shield is only a wall you carry."',t);
      _finTitle(ctx,'AEGIS BREAK',t,'rgba(90,150,255,1)');
    }
  ),

  // ── broomstick ───────────────────────────────────────────────
  broomstick: _wfDef('CLEAN SWEEP','rgba(210,170,110,1)',124,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.loopT=0; data.dustA=0; data.trail=[];
      data.loopCX=(data.ax0+data.tx0)/2; data.loopCY=data.ty0-90; data.loopR=55;
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); }},
        {frame:24,fn(){ CinCam.slowMo(0.6); CinCam.zoomTo(1.2); CinCam.focusMidpoint(att,tgt); }},
        {frame:40,fn(){ CinCam.slowMo(0.07); CinCam.zoomTo(1.5); CinCam.focusOn(tgt); if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=14; }},
        {frame:48,fn(){
          // DIVE-RAM
          data.dustA=1; data.shockR=1; data.shockAlpha=1;
          CinCam.slowMo(1.0); CinCam.shake(44);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:3});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(tgt.cx(),tgt.cy(),'#caa56e',52);
          spawnParticles(tgt.cx(),tgt.cy(),'#e8d3a0',22);
          CinCam.zoomTo(1.32);
        }},
        {frame:98,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,124,data);
      if(data.dustA>0&&timer>48) data.dustA=Math.max(0,data.dustA-0.04);
      for(const g of data.trail) g.a=Math.max(0,g.a-0.04);
      data.trail=data.trail.filter(g=>g.a>0);
      tgt.x=data.tx0; if(timer<48) tgt.y=data.ty0;
      if(timer<12){ att.x=data.ax0;att.y=data.ay0; data.auraAlpha=0; }
      else if(timer<48){
        // Aerial loop above
        const p=(timer-12)/36; data.loopT=p;
        const ang=-Math.PI/2 - p*Math.PI*2*data.dir;
        att.x=data.loopCX+Math.cos(ang)*data.loopR - att.w/2;
        att.y=data.loopCY+Math.sin(ang)*data.loopR;
        data.auraAlpha=p*0.7; data.auraR=22+p*22;
        if(timer%2===0) data.trail.push({x:att.cx(),y:att.cy(),a:0.6});
      }
      else{
        // Dive-rammed: target tumbles down/away
        att.x=data.tx0+data.dir*(tgt.w*0.3); att.y=data.ty0-10;
        const p=Math.min(1,(timer-48)/50);
        tgt.x=data.tx0+data.dir*_finEaseOut(p)*40; tgt.y=data.ty0+_finEaseOut(p)*30;
        data.auraAlpha=Math.max(0,data.auraAlpha-0.04);
      }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.42);
      _wfDrawAura(ctx,att,'rgba(210,170,110,1)',data.auraAlpha,data.auraR,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      // Dust trail of the loop
      for(const g of data.trail){
        ctx.fillStyle=`rgba(202,165,110,${g.a*0.5})`; ctx.shadowColor='#caa56e'; ctx.shadowBlur=12;
        ctx.beginPath(); ctx.arc(g.x,g.y,7,0,Math.PI*2); ctx.fill();
      }
      // Dust storm burst on impact
      if(data.dustA>0){
        for(let i=0;i<10;i++){ const a=(i/10)*Math.PI*2;
          ctx.fillStyle=`rgba(232,211,160,${data.dustA*0.45})`;
          ctx.beginPath(); ctx.arc(tgt.cx()+Math.cos(a)*22*(1-data.dustA+0.4),tgt.cy()+Math.sin(a)*16,8,0,Math.PI*2); ctx.fill();
        }
      }
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(210,170,110,${data.shockAlpha})`; ctx.lineWidth=5; ctx.shadowColor='#caa56e'; ctx.shadowBlur=22;
        ctx.beginPath(); ctx.arc(tgt.cx(),tgt.cy(),data.shockR,0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
      if(timer>=48&&timer<=56) _finFlash(ctx,(56-timer)/8*0.6,230,210,160);
      if(timer>54&&timer<108) _finSubtitle(ctx,'"Time to sweep up the trash."',t);
      _finTitle(ctx,'CLEAN SWEEP',t,'rgba(210,170,110,1)');
    }
  ),

  // ── peashooter ───────────────────────────────────────────────
  peashooter: _wfDef('FULL BLOOM','rgba(90,210,90,1)',122,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.peas=[]; data.crank=0; data.bonkA=0;
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); }},
        {frame:30,fn(){
          // Crank done — fire a converging hail of peas
          CinCam.slowMo(0.07); CinCam.zoomTo(1.5); CinCam.focusOn(tgt);
          for(let i=0;i<16;i++){ const a=(i/16)*Math.PI*2; data.peas.push({x:tgt.cx()+Math.cos(a)*150,y:tgt.cy()+Math.sin(a)*120,tx:tgt.cx(),ty:tgt.cy(),p:0,sp:0.05+Math.random()*0.04,done:false}); }
          if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=14;
        }},
        {frame:40,fn(){
          CinCam.slowMo(1.0); CinCam.shake(30); data.shockR=1; data.shockAlpha=1;
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:3});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(tgt.cx(),tgt.cy(),'#55cc55',44);
          spawnParticles(tgt.cx(),tgt.cy(),'#aaffaa',18);
          CinCam.zoomTo(1.34);
        }},
        {frame:78,fn(){
          // one last comedic pea bonk
          data.bonkA=1; CinCam.shake(14);
          spawnParticles(tgt.cx(),tgt.cy()-10,'#aaffaa',10);
        }},
        {frame:96,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,122,data);
      data.crank+=timer<30?0.4:0;
      if(data.bonkA>0) data.bonkA=Math.max(0,data.bonkA-0.06);
      for(const pe of data.peas){ if(!pe.done){ pe.p=Math.min(1,pe.p+pe.sp); pe.x=_finLerp(pe.x,pe.tx,_finEaseIn(pe.p)*0.4); pe.y=_finLerp(pe.y,pe.ty,_finEaseIn(pe.p)*0.4); if(pe.p>=1)pe.done=true; } }
      att.x=data.ax0; att.y=data.ay0;
      if(timer<12){ tgt.x=data.tx0;tgt.y=data.ty0; data.auraAlpha=0; }
      else if(timer<40){ const p=(timer-12)/28; tgt.x=data.tx0;tgt.y=data.ty0; data.auraAlpha=p*0.6; data.auraR=20+p*18; }
      else{
        // Ragdolled: jitter then settle, dip down
        const p=Math.min(1,(timer-40)/55);
        tgt.x=data.tx0+Math.sin(timer*0.8)*4*(1-p); tgt.y=data.ty0+_finEaseOut(p)*26;
        data.auraAlpha=Math.max(0,data.auraAlpha-0.05);
      }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.38);
      _wfDrawAura(ctx,att,'rgba(90,210,90,1)',data.auraAlpha,data.auraR,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      // converging hail of peas
      for(const pe of data.peas){ if(pe.p<1){
        ctx.fillStyle='rgba(110,220,90,0.95)'; ctx.shadowColor='#66cc44'; ctx.shadowBlur=8;
        ctx.beginPath(); ctx.arc(pe.x,pe.y,4,0,Math.PI*2); ctx.fill();
      }}
      // last bonk pea
      if(data.bonkA>0){
        ctx.fillStyle=`rgba(150,240,120,${data.bonkA})`; ctx.shadowColor='#88dd66'; ctx.shadowBlur=12;
        ctx.beginPath(); ctx.arc(tgt.cx(),tgt.cy()-14-(1-data.bonkA)*8,5,0,Math.PI*2); ctx.fill();
      }
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(90,210,90,${data.shockAlpha})`; ctx.lineWidth=4; ctx.shadowColor='#66cc44'; ctx.shadowBlur=20;
        ctx.beginPath(); ctx.arc(tgt.cx(),tgt.cy(),data.shockR,0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
      if(timer>=40&&timer<=48) _finFlash(ctx,(48-timer)/8*0.5,120,230,110);
      if(timer>52&&timer<104) _finSubtitle(ctx,'"Hope you like your greens."',t);
      _finTitle(ctx,'FULL BLOOM',t,'rgba(90,210,90,1)');
    }
  ),

  // ── slingshot ────────────────────────────────────────────────
  slingshot: _wfDef('ORBITAL STONE','rgba(255,150,40,1)',132,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.stoneY=0; data.stoneUp=true; data.craterA=0; data.lookA=0;
      const _floorPl=currentArena&&currentArena.platforms&&currentArena.platforms.find(pl=>pl.isFloor&&!pl.isFloorDisabled);
      data.groundY=_floorPl?_floorPl.y:GAME_H-120;
      data.stoneX=data.tx0+tgt.w/2;
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); }},
        {frame:26,fn(){ CinCam.slowMo(0.5); CinCam.zoomTo(1.4); CinCam.focusOn(att); }},
        {frame:46,fn(){
          // beat of silence — both look up
          data.lookA=1; CinCam.slowMo(0.18); CinCam.zoomTo(1.2); CinCam.focusMidpoint(att,tgt);
        }},
        {frame:64,fn(){ data.stoneUp=false; CinCam.zoomTo(1.45); CinCam.focusOn(tgt); }},
        {frame:74,fn(){
          // METEOR crash + crater shockwave
          data.craterA=1; data.shockR=1; data.shockAlpha=1;
          CinCam.slowMo(1.0); CinCam.shake(60);
          spawnParticles(data.stoneX,data.groundY-16,'#ff8822',60);
          spawnParticles(data.stoneX,data.groundY-16,'#ffcc66',26);
          CinCam.zoomTo(1.32);
        }},
        {frame:104,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,132,data);
      if(data.craterA>0&&timer>74) data.craterA=Math.max(0,data.craterA-0.04);
      att.x=data.ax0; att.y=data.ay0; tgt.x=data.tx0; if(timer<74) tgt.y=data.ty0;
      if(timer<26){ data.stoneY=att.cy(); data.auraAlpha=timer>=12?((timer-12)/14)*0.6:0; data.auraR=22; }
      else if(timer<64){
        // Stone fires straight UP, decelerating
        const p=(timer-26)/38;
        data.stoneY=_finLerp(att.cy(),-40,_finEaseOut(p));
        data.auraAlpha=Math.max(0,(data.auraAlpha||0)-0.02);
      }
      else if(timer<74){
        // Crash down
        const p=(timer-64)/10;
        data.stoneY=_finLerp(-40,data.groundY-12,_finEaseIn(p));
      }
      else{
        data.stoneY=data.groundY-12;
        const p=Math.min(1,(timer-74)/52);
        tgt.y=data.ty0+_finEaseOut(p)*22;
      }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.44);
      _wfDrawAura(ctx,att,'rgba(255,150,40,1)',data.auraAlpha||0,data.auraR||22,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      // The orbital stone
      if(timer>=26&&timer<74){
        const sr=timer<64?9:18;
        if(!data.stoneUp){ // flaming trail on descent
          ctx.strokeStyle='rgba(255,150,40,0.7)'; ctx.lineWidth=10; ctx.shadowColor='#ff8822'; ctx.shadowBlur=26;
          ctx.beginPath(); ctx.moveTo(data.stoneX,data.stoneY-40); ctx.lineTo(data.stoneX,data.stoneY); ctx.stroke();
        }
        const grd=ctx.createRadialGradient(data.stoneX-4,data.stoneY-4,2,data.stoneX,data.stoneY,sr);
        grd.addColorStop(0,'#ffddaa'); grd.addColorStop(1,'#aa5511');
        ctx.fillStyle=grd; ctx.shadowColor='#ff8822'; ctx.shadowBlur=20;
        ctx.beginPath(); ctx.arc(data.stoneX,data.stoneY,sr,0,Math.PI*2); ctx.fill();
      }
      // Crater shockwave
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(255,150,40,${data.shockAlpha})`; ctx.lineWidth=7; ctx.shadowColor='#ff8822'; ctx.shadowBlur=30;
        ctx.beginPath(); ctx.arc(data.stoneX,data.groundY,data.shockR,Math.PI,0); ctx.stroke();
        _finImpactLines(ctx,data.stoneX,data.groundY,16,data.shockR*0.5,'#ffcc66',5);
      }
      ctx.restore();
      if(timer>=74&&timer<=84) _finFlash(ctx,(84-timer)/10*0.78,255,150,40);
      if(timer>52&&timer<114) _finSubtitle(ctx,'"What goes up... lands on you."',t);
      _finTitle(ctx,'ORBITAL STONE',t,'rgba(255,150,40,1)');
    }
  ),

  // ── paperairplane ────────────────────────────────────────────
  paperairplane: _wfDef('A THOUSAND FOLDS','rgba(190,215,255,1)',126,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.planes=[]; data.crossA=0;
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); }},
        {frame:26,fn(){
          // Spawn planes from all screen edges
          CinCam.slowMo(0.3); CinCam.zoomTo(1.4); CinCam.focusOn(tgt);
          for(let i=0;i<14;i++){ const a=(i/14)*Math.PI*2; data.planes.push({a, r:170, ang:a, sp:0.04+Math.random()*0.03}); }
        }},
        {frame:48,fn(){ CinCam.slowMo(0.07); CinCam.zoomTo(1.55); if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=14; }},
        {frame:56,fn(){
          // STRIKE together — single cross flash
          data.crossA=1; data.shockR=1; data.shockAlpha=1;
          CinCam.slowMo(1.0); CinCam.shake(38);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:3});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(tgt.cx(),tgt.cy(),'#cce0ff',48);
          spawnParticles(tgt.cx(),tgt.cy(),'#ffffff',22);
          CinCam.zoomTo(1.34);
        }},
        {frame:100,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,126,data);
      if(data.crossA>0) data.crossA=Math.max(0,data.crossA-0.045);
      for(const pl of data.planes){ if(timer<56){ pl.r=Math.max(8,pl.r-3.4); pl.ang+=pl.sp; } }
      att.x=data.ax0; att.y=data.ay0;
      if(timer<56){ tgt.x=data.tx0;tgt.y=data.ty0; const p=Math.min(1,(timer-12)/40); data.auraAlpha=p*0.6; data.auraR=20+p*18; }
      else{ const p=Math.min(1,(timer-56)/44); tgt.x=data.tx0+data.dir*_finEaseOut(p)*40; tgt.y=data.ty0-_finEaseOut(p)*18; data.auraAlpha=Math.max(0,data.auraAlpha-0.05); }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.44);
      _wfDrawAura(ctx,att,'rgba(190,215,255,1)',data.auraAlpha,data.auraR,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      // Spiralling paper planes converging on the target
      if(timer<58){
        for(const pl of data.planes){
          const px=tgt.cx()+Math.cos(pl.ang)*pl.r, py=tgt.cy()+Math.sin(pl.ang)*pl.r;
          const dir=pl.ang+Math.PI;
          ctx.save(); ctx.translate(px,py); ctx.rotate(dir);
          ctx.fillStyle='rgba(225,235,255,0.95)'; ctx.shadowColor='#bcd6ff'; ctx.shadowBlur=8;
          ctx.beginPath(); ctx.moveTo(7,0); ctx.lineTo(-6,4); ctx.lineTo(-3,0); ctx.lineTo(-6,-4); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      }
      // Single cross flash on strike
      if(data.crossA>0){
        ctx.strokeStyle=`rgba(255,255,255,${data.crossA})`; ctx.lineWidth=2+data.crossA*5; ctx.shadowColor='#cce0ff'; ctx.shadowBlur=28*data.crossA;
        const L=58;
        ctx.beginPath(); ctx.moveTo(tgt.cx()-L,tgt.cy()-L); ctx.lineTo(tgt.cx()+L,tgt.cy()+L); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tgt.cx()+L,tgt.cy()-L); ctx.lineTo(tgt.cx()-L,tgt.cy()+L); ctx.stroke();
      }
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(190,215,255,${data.shockAlpha})`; ctx.lineWidth=4; ctx.shadowColor='#bcd6ff'; ctx.shadowBlur=22;
        ctx.beginPath(); ctx.arc(tgt.cx(),tgt.cy(),data.shockR,0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
      if(timer>=56&&timer<=65) _finFlash(ctx,(65-timer)/9*0.66,210,230,255);
      if(timer>52&&timer<110) _finSubtitle(ctx,'"A thousand cuts, all at once."',t);
      _finTitle(ctx,'A THOUSAND FOLDS',t,'rgba(190,215,255,1)');
    }
  ),

  // ── boomerang ────────────────────────────────────────────────
  boomerang: _wfDef('INFINITE RETURN','rgba(220,175,70,1)',126,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.angA=0; data.angB=Math.PI; data.spin=0; data.hits=[];
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); }},
        {frame:24,fn(){ CinCam.slowMo(0.3); CinCam.zoomTo(1.5); CinCam.focusOn(tgt); }},
        {frame:50,fn(){ CinCam.slowMo(0.07); CinCam.zoomTo(1.58); if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=14; }},
        {frame:58,fn(){
          // BOTH strike at once
          data.shockR=1; data.shockAlpha=1;
          CinCam.slowMo(1.0); CinCam.shake(44);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:3});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(tgt.cx(),tgt.cy(),'#d4a838',46);
          spawnParticles(tgt.cx(),tgt.cy(),'#ffdd88',20);
          CinCam.zoomTo(1.34);
        }},
        {frame:100,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,126,data);
      data.spin+=0.6;
      for(const h of data.hits) h.f--;
      data.hits=data.hits.filter(h=>h.f>0);
      // Speed of orbit accelerates
      if(timer<58){ const sp=0.1+((timer-12)/46)*0.32; data.angA+=sp; data.angB-=sp;
        // register hit flashes when a boomerang crosses the target center (x ~ 0)
        if(timer%6===0){ data.hits.push({x:tgt.cx(),y:tgt.cy(),f:5}); }
      }
      att.x=data.ax0; att.y=data.ay0;
      if(timer<58){ tgt.x=data.tx0+Math.sin(timer*0.5)*3; tgt.y=data.ty0; const p=Math.min(1,(timer-12)/46); data.auraAlpha=p*0.7; data.auraR=22+p*22; }
      else{ const p=Math.min(1,(timer-58)/42); tgt.x=data.tx0+data.dir*_finEaseOut(p)*42; tgt.y=data.ty0-_finEaseOut(p)*16; data.auraAlpha=Math.max(0,data.auraAlpha-0.05); }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.44);
      _wfDrawAura(ctx,att,'rgba(220,175,70,1)',data.auraAlpha,data.auraR,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      // Two counter-orbiting boomerangs
      if(timer<60){
        const R=46;
        for(const o of [{ang:data.angA,c:1},{ang:data.angB,c:-1}]){
          const bx=tgt.cx()+Math.cos(o.ang)*R, by=tgt.cy()+Math.sin(o.ang)*R*0.7;
          ctx.save(); ctx.translate(bx,by); ctx.rotate(data.spin*o.c);
          ctx.strokeStyle='rgba(220,175,70,0.95)'; ctx.lineWidth=4; ctx.shadowColor='#d4a838'; ctx.shadowBlur=14;
          ctx.beginPath(); ctx.moveTo(-9,-2); ctx.lineTo(0,2); ctx.lineTo(9,-2); ctx.stroke();
          ctx.restore();
        }
      }
      // Hit flashes on each pass
      for(const h of data.hits){ if(h.f>0){ const a=h.f/5; _finImpactLines(ctx,h.x,h.y,6,22*a,'#ffdd88',2+a*2); } }
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(220,175,70,${data.shockAlpha})`; ctx.lineWidth=5; ctx.shadowColor='#d4a838'; ctx.shadowBlur=24;
        ctx.beginPath(); ctx.arc(tgt.cx(),tgt.cy(),data.shockR,0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
      if(timer>=58&&timer<=66) _finFlash(ctx,(66-timer)/8*0.66,230,190,90);
      if(timer>52&&timer<110) _finSubtitle(ctx,'"It always comes back around."',t);
      _finTitle(ctx,'INFINITE RETURN',t,'rgba(220,175,70,1)');
    }
  ),

  // ── flamethrower ─────────────────────────────────────────────
  flamethrower: _wfDef('INCINERATE','rgba(255,110,30,1)',128,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.tornadoA=0; data.skyA=0; data.detA=0; data.emberY=0;
      const _floorPl=currentArena&&currentArena.platforms&&currentArena.platforms.find(pl=>pl.isFloor&&!pl.isFloorDisabled);
      data.groundY=_floorPl?_floorPl.y:GAME_H-120;
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); }},
        {frame:28,fn(){
          // Flame tornado spirals up, sky glows
          data.tornadoA=1; data.skyA=1;
          CinCam.slowMo(0.4); CinCam.zoomTo(1.45); CinCam.focusOn(tgt);
        }},
        {frame:50,fn(){ CinCam.slowMo(0.07); CinCam.zoomTo(1.55); if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=14; }},
        {frame:58,fn(){
          // COLLAPSE inward into one detonation
          data.detA=1; data.shockR=1; data.shockAlpha=1;
          CinCam.slowMo(1.0); CinCam.shake(54);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:3});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(tgt.cx(),tgt.cy(),'#ff5511',60);
          spawnParticles(tgt.cx(),tgt.cy(),'#ffaa33',28);
          CinCam.zoomTo(1.32);
        }},
        {frame:102,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,128,data);
      if(timer>=58){ if(data.tornadoA>0) data.tornadoA=Math.max(0,data.tornadoA-0.12); if(data.detA>0) data.detA=Math.max(0,data.detA-0.035); data.emberY+=2; }
      if(data.skyA>0&&timer>58) data.skyA=Math.max(0,data.skyA-0.03);
      att.x=data.ax0; att.y=data.ay0;
      if(timer<58){ tgt.x=data.tx0;tgt.y=data.ty0; const p=Math.min(1,(timer-12)/46); data.auraAlpha=p*0.7; data.auraR=24+p*22; }
      else{ const p=Math.min(1,(timer-58)/44); tgt.x=data.tx0; tgt.y=data.ty0+_finEaseOut(p)*22; data.auraAlpha=Math.max(0,data.auraAlpha-0.04); }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.42);
      // Sky glow (screen-space warm wash)
      if(data.skyA>0){ _finFlash(ctx,data.skyA*0.16,255,120,40); }
      _wfDrawAura(ctx,att,'rgba(255,110,30,1)',data.auraAlpha,data.auraR,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      // Flame tornado spiralling up around the target
      if(data.tornadoA>0){
        for(let i=0;i<26;i++){
          const ph=i/26;
          const ang=ph*Math.PI*6 + timer*0.4;
          const rad=(14+ph*30)*(timer<58?1:data.tornadoA);
          const fx=tgt.cx()+Math.cos(ang)*rad;
          const fy=(data.groundY-8) - ph*(data.groundY-(data.ty0-70));
          const a=data.tornadoA*(0.5+ph*0.4);
          ctx.fillStyle=`rgba(255,${100+i*4},30,${a})`; ctx.shadowColor='#ff6622'; ctx.shadowBlur=14;
          ctx.beginPath(); ctx.arc(fx,fy,5+ph*4,0,Math.PI*2); ctx.fill();
        }
      }
      // Detonation core + rising embers
      if(data.detA>0){
        const grd=ctx.createRadialGradient(tgt.cx(),tgt.cy(),4,tgt.cx(),tgt.cy(),40);
        grd.addColorStop(0,`rgba(255,240,200,${data.detA})`);
        grd.addColorStop(0.5,`rgba(255,140,40,${data.detA*0.7})`);
        grd.addColorStop(1,'rgba(255,80,20,0)');
        ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(tgt.cx(),tgt.cy(),40,0,Math.PI*2); ctx.fill();
        for(let i=0;i<8;i++){ const a=(i/8)*Math.PI*2;
          ctx.fillStyle=`rgba(255,170,60,${data.detA*0.8})`;
          ctx.beginPath(); ctx.arc(tgt.cx()+Math.cos(a)*18,tgt.cy()-data.emberY+Math.sin(a)*8,3,0,Math.PI*2); ctx.fill();
        }
      }
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(255,110,30,${data.shockAlpha})`; ctx.lineWidth=6; ctx.shadowColor='#ff6622'; ctx.shadowBlur=28;
        ctx.beginPath(); ctx.arc(tgt.cx(),tgt.cy(),data.shockR,0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
      if(timer>=58&&timer<=67) _finFlash(ctx,(67-timer)/9*0.78,255,120,40);
      if(timer>54&&timer<112) _finSubtitle(ctx,'"Burn bright. Then burn out."',t);
      _finTitle(ctx,'INCINERATE',t,'rgba(255,110,30,1)');
    }
  ),

});
