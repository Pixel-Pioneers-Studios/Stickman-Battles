'use strict';
// smb-finisher-weapon3.js — finishers for the Arsenal weapons (bomb, fragment, knives, glassblade, anchor, crossbow)
// Depends on: smb-finisher-helpers.js, smb-finisher-weapon.js (WEAPON_FINISHERS, _wfDef, _wfBaseSetup, _wfTick, _wfDrawAura, _wfPassThroughFace)

function _wf3GroundY() {
  const pl = currentArena && currentArena.platforms && currentArena.platforms.find(p => p.isFloor && !p.isFloorDisabled);
  return pl ? pl.y : GAME_H - 120;
}
function _wf3Hand(att, dir) {
  return { x: att.cx() + dir * 14, y: att.y + att.h * 0.36 };
}

Object.assign(WEAPON_FINISHERS, {

  // ── bomb ─────────────────────────────────────────────────────
  bomb: _wfDef('CHAIN REACTION','rgba(255,120,40,1)',130,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.blasts=[]; data.bigA=0;
      const h=_wf3Hand(att,data.dir); data.hx=h.x; data.hy=h.y;
      // Six stickies, thrown in pairs, clinging to the target's body
      const offs=[[0.30,0.22],[0.72,0.30],[0.20,0.52],[0.80,0.58],[0.35,0.82],[0.65,0.86]];
      data.stickies=offs.map((o,i)=>({ fx:o[0], fy:o[1], throwF:16+Math.floor(i/2)*8, landF:24+Math.floor(i/2)*8, popF:60+i*3, popped:false }));
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); }},
        {frame:18,fn(){ CinCam.slowMo(0.4); CinCam.zoomTo(1.42); CinCam.focusMidpoint(att,tgt); }},
        {frame:44,fn(){ CinCam.slowMo(0.07); CinCam.zoomTo(1.62); CinCam.focusOn(tgt); if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=16; }},
        {frame:60,fn(){ CinCam.slowMo(1.0); CinCam.zoomTo(1.5); }},
        {frame:80,fn(){
          // The chain meets in the middle — one blast for all six
          data.bigA=1; data.shockR=1; data.shockAlpha=1;
          CinCam.shake(58);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:3});
          if (typeof SoundManager!=='undefined'&&SoundManager.explosion) SoundManager.explosion();
          else if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(tgt.cx(),tgt.cy(),'#ff7a28',60);
          spawnParticles(tgt.cx(),tgt.cy(),'#ffd27a',28);
          spawnParticles(tgt.cx(),tgt.cy(),'#3a3a3a',24);
          CinCam.zoomTo(1.3);
        }},
        {frame:108,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,130,data);
      if(data.bigA>0&&timer>80) data.bigA=Math.max(0,data.bigA-0.03);
      for(const s of data.stickies){
        if(!s.popped&&timer>=s.popF){
          s.popped=true;
          const bx=data.tx0+tgt.w*s.fx, by=data.ty0+tgt.h*s.fy;
          data.blasts.push({x:bx,y:by,r:4,a:1});
          spawnParticles(bx,by,'#ff9a3a',10);
          if (typeof SoundManager!=='undefined'&&SoundManager.hit) SoundManager.hit();
          CinCam.shake(10);
        }
      }
      for(const b of data.blasts){ b.r+=3.2; b.a=Math.max(0,b.a-0.07); }
      att.x=data.ax0; att.y=data.ay0;
      data.auraAlpha=timer<44?Math.min(0.55,Math.max(0,(timer-12)/30)*0.55):Math.max(0,(data.auraAlpha||0)-0.02); data.auraR=24;
      if(timer<60){ tgt.x=data.tx0; tgt.y=data.ty0; }
      else if(timer<80){
        // Each pop kicks the target a little further off its feet
        const n=data.stickies.filter(s=>s.popped).length;
        tgt.x=data.tx0+data.dir*n*2+Math.sin(timer*2.3)*2; tgt.y=data.ty0-n*1.5;
      }
      else{
        const p=Math.min(1,(timer-80)/40);
        tgt.x=data.tx0+data.dir*(12+_finEaseOut(p)*110);
        tgt.y=data.ty0-9-Math.sin(p*Math.PI)*80+_finEaseIn(p)*20;
      }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.44);
      _wfDrawAura(ctx,att,'rgba(255,120,40,1)',data.auraAlpha||0,data.auraR||24,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      for(const s of data.stickies){
        if(timer<s.throwF||s.popped) continue;
        const ex=tgt.x+tgt.w*s.fx, ey=tgt.y+tgt.h*s.fy;
        let bx=ex, by=ey;
        if(timer<s.landF){
          const p=(timer-s.throwF)/(s.landF-s.throwF);
          bx=_finLerp(data.hx,ex,p); by=_finLerp(data.hy,ey,p)-Math.sin(p*Math.PI)*34;
        }
        ctx.shadowBlur=0;
        const g=ctx.createRadialGradient(bx-1.6,by-1.6,0.5,bx,by,5);
        g.addColorStop(0,'#6a4038'); g.addColorStop(1,'#2a1210');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(bx,by,5,0,Math.PI*2); ctx.fill();
        // Detonator lights blink faster as the pop approaches
        const period=Math.max(2,Math.floor((s.popF-timer)/3));
        if(timer>=s.landF&&(timer%(period*2))<period){
          ctx.fillStyle='#ff3a2a'; ctx.shadowColor='#ff3a2a'; ctx.shadowBlur=8;
          ctx.beginPath(); ctx.arc(bx,by-1,1.8,0,Math.PI*2); ctx.fill();
        }
      }
      for(const b of data.blasts){
        if(b.a<=0) continue;
        ctx.fillStyle=`rgba(255,170,70,${b.a*0.55})`; ctx.shadowColor='#ff7a28'; ctx.shadowBlur=18;
        ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=`rgba(255,230,160,${b.a})`; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(b.x,b.y,b.r*1.3,0,Math.PI*2); ctx.stroke();
      }
      if(data.bigA>0){
        const R=30+(1-data.bigA)*70;
        const grd=ctx.createRadialGradient(data.tx0+tgt.w/2,data.ty0+tgt.h/2,4,data.tx0+tgt.w/2,data.ty0+tgt.h/2,R);
        grd.addColorStop(0,`rgba(255,245,210,${data.bigA})`);
        grd.addColorStop(0.45,`rgba(255,140,40,${data.bigA*0.8})`);
        grd.addColorStop(1,'rgba(90,40,20,0)');
        ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(data.tx0+tgt.w/2,data.ty0+tgt.h/2,R,0,Math.PI*2); ctx.fill();
      }
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(255,120,40,${data.shockAlpha})`; ctx.lineWidth=7; ctx.shadowColor='#ff7a28'; ctx.shadowBlur=30;
        ctx.beginPath(); ctx.arc(data.tx0+tgt.w/2,data.ty0+tgt.h/2,data.shockR,0,Math.PI*2); ctx.stroke();
        _finImpactLines(ctx,data.tx0+tgt.w/2,data.ty0+tgt.h/2,14,data.shockR*0.55,'#ffd27a',4);
      }
      ctx.restore();
      if(timer>=80&&timer<=91) _finFlash(ctx,(91-timer)/11*0.8,255,170,80);
      if(timer>40&&timer<116) _finSubtitle(ctx,'"You were counting the wrong bombs."',t);
      _finTitle(ctx,'CHAIN REACTION',t,'rgba(255,120,40,1)');
    }
    , { swing:[{at:16,dur:8},{at:24,dur:8},{at:32,dur:8}], impact:60,
        holds:[{at:60,frames:3,shake:10,zoom:1.5},{at:80,frames:6,shake:30}] }
  ),

  // ── fragment ─────────────────────────────────────────────────
  fragment: _wfDef('THE LESSON','rgba(143,216,255,1)',130,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.pullA=0; data.waves=[]; data.laserA=0; data.laserW=0;
      data.pullX = data.dir>0 ? data.ax0+att.w+18 : data.ax0-tgt.w-18;
      data.punchF=[50,56,62,68];
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); CinCam.zoomTo(1.45); }},
        {frame:24,fn(){ CinCam.slowMo(0.4); CinCam.focusMidpoint(att,tgt); }},
        {frame:42,fn(){ CinCam.slowMo(0.07); CinCam.zoomTo(1.66); if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=8; }},
        {frame:50,fn(){ CinCam.slowMo(1.0); CinCam.zoomTo(1.55); }},
        {frame:76,fn(){
          // Fragment Laser from the centre
          data.laserA=1; data.shockR=1; data.shockAlpha=1;
          CinCam.shake(46);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:3});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(tgt.cx(),tgt.cy(),'#8fd8ff',48);
          spawnParticles(tgt.cx(),tgt.cy(),'#ffffff',22);
          CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt);
        }},
        {frame:106,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,130,data);
      for(let i=0;i<data.punchF.length;i++){
        if(timer===data.punchF[i]){
          data.waves.push({x:att.cx()+data.dir*(att.w*0.5+10),y:att.y+att.h*0.38,r:6,a:1});
          spawnParticles(tgt.cx()-data.dir*6,tgt.cy(),'#bfe9ff',10+i*3);
          if (typeof SoundManager!=='undefined'&&SoundManager.hit) SoundManager.hit();
          CinCam.shake(8+i*4);
        }
      }
      for(const w of data.waves){ w.r+=4.5; w.a=Math.max(0,w.a-0.06); }
      if(timer>=76){ data.laserW=Math.min(1,data.laserW+0.25); data.laserA=Math.max(0,data.laserA-(timer>88?0.045:0)); }
      att.x=data.ax0; att.y=data.ay0;
      if(timer<20){ tgt.x=data.tx0; tgt.y=data.ty0; data.pullA=0; data.auraAlpha=Math.max(0,(timer-12)/8)*0.4; data.auraR=20; }
      else if(timer<46){
        // The charge drags them in
        const p=(timer-20)/26;
        data.pullA=Math.min(1,p*1.4);
        tgt.x=_finLerp(data.tx0,data.pullX,_finEaseIn(p)); tgt.y=data.ty0;
        data.auraAlpha=0.4+p*0.5; data.auraR=20+p*30;
      }
      else if(timer<76){
        data.pullA=Math.max(0,data.pullA-0.1);
        // Each punch rocks them back a step; none lets them go
        const n=data.punchF.filter(f=>timer>=f).length;
        tgt.x=data.pullX+data.dir*n*3; tgt.y=data.ty0;
        data.auraAlpha=Math.max(0.3,data.auraAlpha-0.01);
      }
      else{
        const p=Math.min(1,(timer-76)/36);
        tgt.x=data.pullX+data.dir*(12+_finEaseOut(p)*150); tgt.y=data.ty0-Math.sin(p*Math.PI)*26;
        data.auraAlpha=Math.max(0,data.auraAlpha-0.04);
      }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.48);
      _wfDrawAura(ctx,att,'rgba(143,216,255,1)',data.auraAlpha,data.auraR,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      // Contracting pull rings
      if(data.pullA>0){
        for(let i=0;i<3;i++){
          const ph=((timer*0.035)+i/3)%1;
          const R=110*(1-ph)+12;
          ctx.strokeStyle=`rgba(143,216,255,${data.pullA*ph*0.8})`; ctx.lineWidth=2; ctx.shadowColor='#8fd8ff'; ctx.shadowBlur=14;
          ctx.beginPath(); ctx.arc(att.cx(),att.cy(),R,0,Math.PI*2); ctx.stroke();
        }
      }
      // Punch shockwaves — forward-facing arcs
      for(const w of data.waves){
        if(w.a<=0) continue;
        ctx.strokeStyle=`rgba(200,240,255,${w.a})`; ctx.lineWidth=3; ctx.shadowColor='#8fd8ff'; ctx.shadowBlur=18;
        const a0=data.dir>0?-0.9:Math.PI-0.9;
        ctx.beginPath(); ctx.arc(w.x,w.y,w.r,a0,a0+1.8); ctx.stroke();
      }
      // Fragment Laser
      if(data.laserA>0){
        const sx=att.cx()+data.dir*(att.w*0.5+12), sy=att.y+att.h*0.38, len=GAME_W;
        const hw=(6+data.laserW*12)*data.laserA;
        ctx.save(); ctx.translate(sx,sy); if(data.dir<0) ctx.scale(-1,1);
        const lg=ctx.createLinearGradient(0,-hw,0,hw);
        lg.addColorStop(0,'rgba(143,216,255,0)'); lg.addColorStop(0.5,`rgba(235,250,255,${data.laserA})`); lg.addColorStop(1,'rgba(143,216,255,0)');
        ctx.fillStyle=lg; ctx.shadowColor='#8fd8ff'; ctx.shadowBlur=30;
        ctx.fillRect(0,-hw,len,hw*2);
        ctx.fillStyle=`rgba(255,255,255,${data.laserA})`;
        ctx.fillRect(0,-hw*0.22,len,hw*0.44);
        ctx.restore();
        ctx.fillStyle=`rgba(235,250,255,${data.laserA})`; ctx.shadowColor='#8fd8ff'; ctx.shadowBlur=26;
        ctx.beginPath(); ctx.arc(sx,sy,hw*0.6,0,Math.PI*2); ctx.fill();
      }
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(143,216,255,${data.shockAlpha})`; ctx.lineWidth=5; ctx.shadowColor='#8fd8ff'; ctx.shadowBlur=24;
        ctx.beginPath(); ctx.arc(tgt.cx(),tgt.cy(),data.shockR,0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
      if(timer>=76&&timer<=86) _finFlash(ctx,(86-timer)/10*0.72,200,240,255);
      if(timer>46&&timer<116) _finSubtitle(ctx,'"This is what the fragment is for."',t);
      _finTitle(ctx,'THE LESSON',t,'rgba(143,216,255,1)');
    }
    , { swing:[{at:50,dur:5,antic:3},{at:56,dur:5,antic:0},{at:62,dur:5,antic:0},{at:68,dur:6,antic:0}], impact:50,
        holds:[{at:50,frames:2,shake:8,zoom:false},{at:68,frames:3,shake:14,zoom:false},{at:76,frames:6,shake:28}] }
  ),

  // ── knives ───────────────────────────────────────────────────
  knives: _wfDef('RECALL','rgba(205,214,224,1)',128,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.slashes=[]; data.caught=0;
      const h=_wf3Hand(att,data.dir); data.hx=h.x; data.hy=h.y;
      data.groundY=_wf3GroundY();
      // Every throw lands PAST them, on purpose
      data.knives=[];
      for(let i=0;i<6;i++){
        const far=data.tx0+tgt.w/2+data.dir*(56+i*20);
        data.knives.push({ ex:far, ey:data.groundY-2, throwF:16+i*3, landF:24+i*3, recF:52+i, retF:62+i, cut:false });
      }
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); }},
        {frame:18,fn(){ CinCam.slowMo(0.45); CinCam.zoomTo(1.25); CinCam.focusMidpoint(att,tgt); }},
        {frame:40,fn(){ CinCam.slowMo(0.07); CinCam.zoomTo(1.58); CinCam.focusOn(att); if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=12; }},
        {frame:52,fn(){ CinCam.slowMo(1.0); CinCam.zoomTo(1.5); CinCam.focusOn(tgt); }},
        {frame:58,fn(){
          data.shockR=1; data.shockAlpha=1;
          CinCam.shake(36);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:3});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(tgt.cx(),tgt.cy(),'#d7dde4',34);
          spawnParticles(tgt.cx(),tgt.cy(),'#ff4040',14);
        }},
        {frame:72,fn(){ CinCam.zoomTo(1.34); CinCam.focusMidpoint(att,tgt); }},
        {frame:104,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,128,data);
      for(const k of data.knives){
        if(k.cut||timer<k.recF) continue;
        const p=(timer-k.recF)/(k.retF-k.recF);
        const kx=_finLerp(k.ex,data.hx,p);
        if((data.dir>0&&kx<=tgt.cx())||(data.dir<0&&kx>=tgt.cx())){
          k.cut=true;
          const ky=_finLerp(k.ey,data.hy,p);
          data.slashes.push({x:tgt.cx(),y:ky,a:1,tilt:(k.ey-data.hy)/Math.max(1,Math.abs(k.ex-data.hx))});
          spawnParticles(tgt.cx(),ky,'#ffffff',6);
        }
      }
      for(const s of data.slashes) s.a=Math.max(0,s.a-0.035);
      data.caught=data.knives.filter(k=>timer>=k.retF).length;
      att.x=data.ax0; att.y=data.ay0;
      data.auraAlpha=(timer>=40&&timer<58)?Math.min(0.7,(timer-40)/12*0.7):Math.max(0,(data.auraAlpha||0)-0.04); data.auraR=26;
      if(timer<58){ tgt.x=data.tx0; tgt.y=data.ty0; }
      else{
        // Knives passing through drag them a step toward the thrower, then they fold
        const p=Math.min(1,(timer-58)/46);
        tgt.x=data.tx0-data.dir*_finEaseOut(Math.min(1,p*3))*14;
        tgt.y=data.ty0+_finEaseIn(p)*40;
      }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.44);
      _wfDrawAura(ctx,att,'rgba(205,214,224,1)',data.auraAlpha||0,data.auraR||26,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      const drawKnife=(x,y,ang,a)=>{
        ctx.save(); ctx.translate(x,y); ctx.rotate(ang); ctx.globalAlpha=a;
        ctx.shadowBlur=0;
        ctx.fillStyle='#2b2622'; ctx.fillRect(-11,-1.7,7,3.4);
        ctx.fillStyle='#d7dde4';
        ctx.beginPath(); ctx.moveTo(-4,-2.2); ctx.lineTo(10,0); ctx.lineTo(-4,2.2); ctx.closePath(); ctx.fill();
        ctx.restore();
      };
      for(const k of data.knives){
        if(timer<k.throwF||timer>=k.retF) continue;
        let x,y,ang;
        if(timer<k.landF){
          const p=(timer-k.throwF)/(k.landF-k.throwF);
          x=_finLerp(data.hx,k.ex,p); y=_finLerp(data.hy,k.ey,p);
          ang=Math.atan2(k.ey-data.hy,k.ex-data.hx);
        } else if(timer<k.recF){
          // Embedded, point first, with a faint glint as the recall winds up
          x=k.ex; y=k.ey; ang=Math.atan2(k.ey-data.hy,k.ex-data.hx);
          if(timer>=40){
            ctx.fillStyle=`rgba(230,240,255,${0.4+0.4*Math.sin(timer*0.9)})`; ctx.shadowColor='#e6f0ff'; ctx.shadowBlur=10;
            ctx.beginPath(); ctx.arc(x,y,2.2,0,Math.PI*2); ctx.fill();
          }
        } else {
          const p=_finEaseIn((timer-k.recF)/(k.retF-k.recF));
          x=_finLerp(k.ex,data.hx,p); y=_finLerp(k.ey,data.hy,p);
          ang=Math.atan2(data.hy-k.ey,data.hx-k.ex)+Math.PI;
          ctx.strokeStyle='rgba(215,225,235,0.55)'; ctx.lineWidth=1.5; ctx.shadowColor='#e6f0ff'; ctx.shadowBlur=8;
          ctx.beginPath(); ctx.moveTo(k.ex+(x-k.ex)*0.35,k.ey+(y-k.ey)*0.35); ctx.lineTo(x,y); ctx.stroke();
        }
        drawKnife(x,y,ang,1);
      }
      for(const s of data.slashes){
        if(s.a<=0) continue;
        const L=26;
        ctx.strokeStyle=`rgba(255,255,255,${s.a})`; ctx.lineWidth=1.5+s.a*2.5; ctx.shadowColor='#ff5050'; ctx.shadowBlur=14*s.a;
        ctx.beginPath(); ctx.moveTo(s.x-L,s.y-L*s.tilt); ctx.lineTo(s.x+L,s.y+L*s.tilt); ctx.stroke();
      }
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(205,214,224,${data.shockAlpha})`; ctx.lineWidth=3; ctx.shadowColor='#e6f0ff'; ctx.shadowBlur=18;
        ctx.beginPath(); ctx.arc(tgt.cx(),tgt.cy(),data.shockR,0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
      if(timer>=58&&timer<=66) _finFlash(ctx,(66-timer)/8*0.55,235,240,255);
      if(timer>30&&timer<112) _finSubtitle(ctx,'"I never missed. I was throwing early."',t);
      _finTitle(ctx,'RECALL',t,'rgba(205,214,224,1)');
    }
    , { swing:[{at:16,dur:6},{at:22,dur:6},{at:28,dur:6},{at:44,dur:10}], impact:58 }
  ),

  // ── glassblade ───────────────────────────────────────────────
  glassblade: _wfDef('SHATTERPOINT','rgba(191,230,238,1)',128,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.cutA=0; data.crackA=0; data.burstA=0; data.reformA=0;
      data.behindX = data.dir>0 ? data.tx0+tgt.w+40 : data.tx0-att.w-40;
      data.cx0=data.tx0+tgt.w/2; data.cy0=data.ty0+tgt.h*0.45;
      data.shards=[];
      for(let i=0;i<16;i++){
        const a=(i/16)*Math.PI*2+Math.random()*0.3, r=34+Math.random()*30;
        data.shards.push({ hx:data.cx0+Math.cos(a)*r, hy:data.cy0+Math.sin(a)*r*0.8, rot:Math.random()*6.28, spin:(Math.random()-0.5)*0.06, s:4+Math.random()*5 });
      }
      data.cracks=[];
      for(let i=0;i<9;i++){
        const a=(i/9)*Math.PI*2+Math.random()*0.4; const pts=[[0,0]]; let r=0;
        for(let j=0;j<4;j++){ r+=18+Math.random()*22; const aa=a+(Math.random()-0.5)*0.5; pts.push([Math.cos(aa)*r,Math.sin(aa)*r]); }
        data.cracks.push(pts);
      }
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); CinCam.zoomTo(1.42); }},
        {frame:28,fn(){ CinCam.slowMo(0.07); CinCam.zoomTo(1.6); CinCam.focusMidpoint(att,tgt); if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=10; }},
        {frame:38,fn(){
          // Through them — and the blade breaks on the way out
          data.cutA=1; data.crackA=1;
          CinCam.slowMo(0.12); CinCam.shake(22);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:2});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(data.cx0,data.cy0,'#e8fbff',26);
          CinCam.focusOn(tgt); CinCam.zoomTo(1.62);
        }},
        {frame:66,fn(){
          // Every shard comes home at once
          data.burstA=1; data.shockR=1; data.shockAlpha=1;
          CinCam.slowMo(1.0); CinCam.shake(44);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:3});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(data.cx0,data.cy0,'#bfe6ee',46);
          spawnParticles(data.cx0,data.cy0,'#ffffff',24);
          CinCam.zoomTo(1.34);
        }},
        {frame:84,fn(){ data.reformA=1; CinCam.focusMidpoint(att,tgt); }},
        {frame:104,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,128,data);
      if(data.cutA>0&&timer>40) data.cutA=Math.max(0,data.cutA-0.06);
      if(data.crackA>0&&timer>66) data.crackA=Math.max(0,data.crackA-0.03);
      if(data.burstA>0) data.burstA=Math.max(0,data.burstA-0.05);
      if(data.reformA>0) data.reformA=Math.max(0,data.reformA-0.035);
      for(const s of data.shards) s.rot+=s.spin;
      // The blade is in pieces from the cut until it reforms
      att._hideWeapon = timer>=38&&timer<84;
      if(timer<38){
        att.x=data.ax0; att.y=data.ay0;
        data.auraAlpha=Math.max(0,Math.min(0.8,(timer-12)/20*0.8)); data.auraR=18+Math.max(0,timer-12)*0.8;
      } else {
        att.x=data.behindX; att.y=data.ay0;
        data.auraAlpha=Math.max(0,data.auraAlpha-0.04);
      }
      if(timer<66){ tgt.x=data.tx0; tgt.y=data.ty0; }
      else{
        const p=Math.min(1,(timer-66)/44);
        tgt.x=data.tx0-data.dir*_finEaseOut(p)*10; tgt.y=data.ty0+_finEaseIn(p)*54;
      }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.48);
      _wfDrawAura(ctx,att,'rgba(191,230,238,1)',data.auraAlpha,data.auraR,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      // Cracks in the air itself, radiating from the cut
      if(data.crackA>0){
        ctx.strokeStyle=`rgba(225,248,255,${data.crackA*0.8})`; ctx.lineWidth=1.2; ctx.shadowColor='#bfe6ee'; ctx.shadowBlur=8;
        for(const c of data.cracks){
          ctx.beginPath(); ctx.moveTo(data.cx0+c[0][0],data.cy0+c[0][1]);
          for(let j=1;j<c.length;j++) ctx.lineTo(data.cx0+c[j][0],data.cy0+c[j][1]);
          ctx.stroke();
        }
      }
      if(data.cutA>0){
        ctx.strokeStyle=`rgba(245,253,255,${data.cutA})`; ctx.lineWidth=1.5+data.cutA*3; ctx.shadowColor='#bfe6ee'; ctx.shadowBlur=22*data.cutA;
        ctx.beginPath(); ctx.moveTo(data.tx0-30,data.cy0+10); ctx.lineTo(data.tx0+tgt.w+30,data.cy0-10); ctx.stroke();
      }
      // Suspended shards: fly out from the blade, hang, then converge
      if(timer>=38&&timer<68){
        for(const s of data.shards){
          let x,y;
          if(timer<48){ const p=_finEaseOut((timer-38)/10); x=_finLerp(data.cx0,s.hx,p); y=_finLerp(data.cy0,s.hy,p); }
          else if(timer<58){ x=s.hx+Math.sin(timer*0.2+s.rot)*1.2; y=s.hy+Math.cos(timer*0.2+s.rot)*1.2; }
          else { const p=_finEaseIn((timer-58)/8); x=_finLerp(s.hx,data.cx0,p); y=_finLerp(s.hy,data.cy0,p); }
          ctx.save(); ctx.translate(x,y); ctx.rotate(s.rot);
          ctx.fillStyle='rgba(215,245,252,0.85)'; ctx.strokeStyle='rgba(255,255,255,0.95)'; ctx.lineWidth=0.7;
          ctx.shadowColor='#bfe6ee'; ctx.shadowBlur=10;
          ctx.beginPath(); ctx.moveTo(s.s,0); ctx.lineTo(-s.s*0.6,s.s*0.45); ctx.lineTo(-s.s*0.4,-s.s*0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
      }
      if(data.burstA>0) _finImpactLines(ctx,data.cx0,data.cy0,16,40+(1-data.burstA)*50,'rgba(235,252,255,0.9)',2+data.burstA*2);
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(191,230,238,${data.shockAlpha})`; ctx.lineWidth=4; ctx.shadowColor='#bfe6ee'; ctx.shadowBlur=22;
        ctx.beginPath(); ctx.arc(data.cx0,data.cy0,data.shockR,0,Math.PI*2); ctx.stroke();
      }
      // The blade reforms in the attacker's hand
      if(data.reformA>0){
        ctx.fillStyle=`rgba(235,252,255,${data.reformA*0.8})`; ctx.shadowColor='#bfe6ee'; ctx.shadowBlur=20;
        ctx.beginPath(); ctx.arc(att.cx()+att.facing*18,att.y+att.h*0.42,4+(1-data.reformA)*10,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
      if(timer>=66&&timer<=75) _finFlash(ctx,(75-timer)/9*0.65,220,245,255);
      if(timer>44&&timer<112) _finSubtitle(ctx,'"It breaks every time. It never breaks first."',t);
      _finTitle(ctx,'SHATTERPOINT',t,'rgba(191,230,238,1)');
    }
    , { swing:{at:30,dur:8}, impact:38, face:_wfPassThroughFace(38),
        holds:[{at:38,frames:4,shake:16,zoom:false},{at:66,frames:5,shake:26}] }
  ),

  // ── anchor ───────────────────────────────────────────────────
  anchor: _wfDef('DEAD WEIGHT','rgba(130,160,185,1)',132,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.craterA=0;
      data.groundY=_wf3GroundY();
      data.pullX = data.dir>0 ? data.ax0+att.w+22 : data.ax0-tgt.w-22;
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); }},
        {frame:18,fn(){ CinCam.slowMo(0.5); CinCam.focusMidpoint(att,tgt); }},
        {frame:28,fn(){
          // Hooked
          CinCam.shake(14);
          if (typeof SoundManager!=='undefined'&&SoundManager.hit) SoundManager.hit();
          spawnParticles(tgt.cx(),tgt.cy(),'#9aa6b2',12);
        }},
        {frame:34,fn(){ CinCam.slowMo(0.4); CinCam.zoomTo(1.45); }},
        {frame:52,fn(){ CinCam.slowMo(0.07); CinCam.zoomTo(1.62); CinCam.focusMidpoint(att,tgt); if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=12; }},
        {frame:62,fn(){
          // Overhead, straight down through them and into the floor
          data.craterA=1; data.shockR=1; data.shockAlpha=1;
          CinCam.slowMo(1.0); CinCam.shake(60);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:3});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(tgt.cx(),data.groundY-6,'#8c96a0',50);
          spawnParticles(tgt.cx(),data.groundY-6,'#cfd8e0',22);
          CinCam.zoomTo(1.34);
        }},
        {frame:108,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,132,data);
      if(data.craterA>0&&timer>62) data.craterA=Math.max(0,data.craterA-0.022);
      // The anchor is on the chain, not in the hand, from the throw until the haul lands it back
      att._hideWeapon = timer>=18&&timer<48;
      att.x=data.ax0; att.y=data.ay0;
      data.auraAlpha=timer>=44&&timer<62?Math.min(0.75,(timer-44)/14*0.75):Math.max(0,(data.auraAlpha||0)-0.04); data.auraR=30;
      if(timer<34){ tgt.x=data.tx0; tgt.y=data.ty0; }
      else if(timer<48){
        const p=(timer-34)/14;
        tgt.x=_finLerp(data.tx0,data.pullX,_finEaseIn(p)); tgt.y=data.ty0-Math.sin(p*Math.PI)*16;
      }
      else if(timer<62){ tgt.x=data.pullX; tgt.y=data.ty0; }
      else{
        // Driven into the floor to the waist
        const p=Math.min(1,(timer-62)/6);
        tgt.x=data.pullX; tgt.y=data.ty0+_finEaseOut(p)*tgt.h*0.38;
      }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.46);
      _wfDrawAura(ctx,att,'rgba(130,160,185,1)',data.auraAlpha||0,data.auraR||30,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      const drawAnchor=(x,y,ang)=>{
        ctx.save(); ctx.translate(x,y); ctx.rotate(ang);
        ctx.fillStyle='#5a6068'; ctx.strokeStyle='#2a2e33'; ctx.lineWidth=1.2; ctx.shadowBlur=0;
        ctx.beginPath(); ctx.arc(-18,0,4.5,0,Math.PI*2); ctx.stroke();
        ctx.fillRect(-14,-2.5,33,5);
        ctx.fillRect(-9,-10,4,20);
        ctx.beginPath(); ctx.moveTo(19,-2); ctx.quadraticCurveTo(25,-14,11,-18); ctx.lineTo(14,-12); ctx.quadraticCurveTo(19,-9,17,-2); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(19,2); ctx.quadraticCurveTo(25,14,11,18); ctx.lineTo(14,12); ctx.quadraticCurveTo(19,9,17,2); ctx.closePath(); ctx.fill();
        ctx.restore();
      };
      if(timer>=18&&timer<48){
        const hand=_wf3Hand(att,data.dir);
        let axp,ayp;
        if(timer<28){ const p=(timer-18)/10; axp=_finLerp(hand.x,tgt.cx(),p); ayp=_finLerp(hand.y,tgt.cy(),p)-Math.sin(p*Math.PI)*30; }
        else { axp=tgt.cx(); ayp=tgt.cy(); }
        // Chain: links along a line that sags until it goes taut on the haul
        const sag = timer<34 ? 22 : Math.max(0,22-(timer-34)*3);
        const n=16;
        ctx.strokeStyle='#6c747c'; ctx.lineWidth=2;
        for(let i=0;i<n;i++){
          const u=i/n, u2=(i+0.6)/n;
          const x1=_finLerp(hand.x,axp,u), y1=_finLerp(hand.y,ayp,u)+Math.sin(u*Math.PI)*sag;
          const x2=_finLerp(hand.x,axp,u2), y2=_finLerp(hand.y,ayp,u2)+Math.sin(u2*Math.PI)*sag;
          ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
        }
        drawAnchor(axp,ayp,data.dir>0?0:Math.PI);
      }
      // Floor crater
      if(data.craterA>0){
        const cx=data.pullX+tgt.w/2;
        ctx.fillStyle=`rgba(30,32,36,${data.craterA*0.55})`;
        ctx.beginPath(); ctx.ellipse(cx,data.groundY+2,46,8,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=`rgba(200,210,220,${data.craterA*0.7})`; ctx.lineWidth=1.5;
        for(let i=0;i<7;i++){ const a=Math.PI+(i/6)*Math.PI; ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*20,data.groundY); ctx.lineTo(cx+Math.cos(a)*(46+i%3*10),data.groundY+Math.sin(a)*-3); ctx.stroke(); }
      }
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(130,160,185,${data.shockAlpha})`; ctx.lineWidth=7; ctx.shadowColor='#9fb6c8'; ctx.shadowBlur=26;
        ctx.beginPath(); ctx.arc(data.pullX+tgt.w/2,data.groundY,data.shockR,Math.PI,0); ctx.stroke();
      }
      ctx.restore();
      if(timer>=62&&timer<=72) _finFlash(ctx,(72-timer)/10*0.6,200,215,230);
      if(timer>40&&timer<116) _finSubtitle(ctx,'"Some things only sink."',t);
      _finTitle(ctx,'DEAD WEIGHT',t,'rgba(130,160,185,1)');
    }
    , { swing:[{at:16,dur:8},{at:52,dur:12,antic:8,anticAmt:0.9}], impact:62,
        holds:[{at:28,frames:2,shake:10,zoom:false},{at:62,frames:6,shake:34}] }
  ),

  // ── crossbow ─────────────────────────────────────────────────
  crossbow: _wfDef('PINNED','rgba(215,180,120,1)',128,
    (att,tgt,data)=>{ _wfBaseSetup(att,tgt,data); data.sightA=0; data.boltX=0; data.flying=false; data.dustA=0;
      const h=_wf3Hand(att,data.dir); data.hx=h.x+data.dir*18; data.hy=h.y;
      // Arenas rarely have a wall in reach, so the bolt stakes them to the floor behind them
      data.groundY=_wf3GroundY();
      data.pinX = data.tx0+data.dir*110;
      data.boltY = data.ty0+tgt.h*0.34;
      data.stakeX = data.pinX+tgt.w/2+data.dir*38;
      data.tl=_makeTimeline([
        {frame:0, fn(){ CinCam.zoomTo(1.3); CinCam.focusMidpoint(att,tgt); CinCam.slowMo(0.25); }},
        {frame:12,fn(){ CinCam.focusOn(att); CinCam.zoomTo(1.5); }},
        {frame:30,fn(){ CinCam.focusOn(tgt); CinCam.zoomTo(1.62); }},
        {frame:44,fn(){ CinCam.slowMo(0.07); if (typeof SoundManager!=='undefined') SoundManager._cosmicSilenceTimer=12; }},
        {frame:54,fn(){
          data.flying=true; CinCam.slowMo(1.0); CinCam.shake(12); CinCam.focusMidpoint(att,tgt); CinCam.zoomTo(1.35);
          spawnParticles(data.hx,data.hy,'#d8c9a8',8);
        }},
        {frame:58,fn(){
          data.shockR=1; data.shockAlpha=1;
          CinCam.shake(30);
          if (typeof CinFX!=='undefined'&&CinFX.impactFrame) CinFX.impactFrame([att,tgt],{dur:2});
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(tgt.cx(),data.boltY,'#e8dcc0',20);
        }},
        {frame:70,fn(){
          // THUNK — the tip buries itself in the floor
          data.dustA=1; CinCam.shake(42); CinCam.focusOn(tgt); CinCam.zoomTo(1.5);
          if (typeof SoundManager!=='undefined'&&SoundManager.heavyHit) SoundManager.heavyHit();
          spawnParticles(data.stakeX,data.groundY-4,'#a8998a',26);
        }},
        {frame:106,fn(){ CinCam.restore(); }},
      ]); },
    (att,tgt,timer,data)=>{ _tickTimeline(data.tl,timer); _wfTick(timer,128,data);
      if(timer>=18&&timer<54) data.sightA=Math.min(1,(timer-18)/14); else if(timer>=54) data.sightA=Math.max(0,data.sightA-0.2);
      if(data.dustA>0&&timer>70) data.dustA=Math.max(0,data.dustA-0.03);
      att.x=data.ax0; att.y=data.ay0;
      data.auraAlpha=timer>=30&&timer<54?0.5:Math.max(0,(data.auraAlpha||0)-0.05); data.auraR=22;
      if(timer<58){ tgt.x=data.tx0; tgt.y=data.ty0; }
      else if(timer<70){
        const p=(timer-58)/12;
        tgt.x=_finLerp(data.tx0,data.pinX,_finEaseOut(p)); tgt.y=data.ty0-Math.sin(p*Math.PI)*10;
      }
      else{
        // Pinned: slumps onto the bolt and stays
        const p=Math.min(1,(timer-70)/24);
        tgt.x=data.pinX+data.dir*_finEaseOut(p)*6; tgt.y=data.ty0+_finEaseOut(p)*14;
      }
      att.vx=0;att.vy=0;tgt.vx=0;tgt.vy=0; },
    (ctx,att,tgt,t,timer,data)=>{
      const {scX,scY,ox,oy}=_finGameTransform();
      _finBars(ctx,data.bars); _finVignette(ctx,0.5);
      _wfDrawAura(ctx,att,'rgba(215,180,120,1)',data.auraAlpha||0,data.auraR||22,scX,scY,ox,oy);
      ctx.save();ctx.setTransform(scX,0,0,scY,ox,oy);
      // Sight line tightening onto the target
      if(data.sightA>0){
        const ty=data.boltY;
        ctx.strokeStyle=`rgba(255,90,60,${data.sightA*0.55})`; ctx.lineWidth=1; ctx.setLineDash([6,5]);
        ctx.beginPath(); ctx.moveTo(data.hx,data.hy); ctx.lineTo(tgt.cx(),ty); ctx.stroke(); ctx.setLineDash([]);
        const R=22-data.sightA*12;
        ctx.strokeStyle=`rgba(255,110,80,${data.sightA})`; ctx.lineWidth=1.5; ctx.shadowColor='#ff6a50'; ctx.shadowBlur=8;
        ctx.beginPath(); ctx.arc(tgt.cx(),ty,R,0,Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tgt.cx()-R-5,ty); ctx.lineTo(tgt.cx()-R+3,ty); ctx.moveTo(tgt.cx()+R-3,ty); ctx.lineTo(tgt.cx()+R+5,ty); ctx.stroke();
      }
      const drawBolt=(x,y,a,rot)=>{
        ctx.save(); ctx.translate(x,y); if(data.dir<0) ctx.scale(-1,1); if(rot) ctx.rotate(rot);
        ctx.shadowBlur=0; ctx.globalAlpha=a;
        ctx.strokeStyle='#6b4a2b'; ctx.lineWidth=2.2;
        ctx.beginPath(); ctx.moveTo(-26,0); ctx.lineTo(0,0); ctx.stroke();
        ctx.fillStyle='#c9ced4'; ctx.beginPath(); ctx.moveTo(0,-3); ctx.lineTo(7,0); ctx.lineTo(0,3); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#b8a888'; ctx.beginPath(); ctx.moveTo(-26,0); ctx.lineTo(-31,-4); ctx.lineTo(-22,0); ctx.lineTo(-31,4); ctx.closePath(); ctx.fill();
        ctx.restore();
      };
      if(data.flying&&timer<58){
        const p=(timer-54)/4;
        const bx=_finLerp(data.hx,tgt.cx(),p), by=_finLerp(data.hy,data.boltY,p);
        ctx.strokeStyle='rgba(235,225,200,0.6)'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(data.hx,data.hy); ctx.lineTo(bx,by); ctx.stroke();
        drawBolt(bx,by,1);
      }
      if(timer>=58&&timer<70){
        // Bolt through the body — tip out the far side, fletching on the near side
        drawBolt(tgt.cx()+data.dir*(tgt.w*0.5+6),data.boltY+(tgt.y-data.ty0),1);
      }
      if(timer>=70){
        // Staked: the shaft runs from their chest down into the floor behind them
        const sx=tgt.cx()-data.dir*10, sy=data.boltY+(tgt.y-data.ty0);
        const dx=Math.abs(data.stakeX-sx), dy=data.groundY-sy;
        const rot=Math.atan2(dy,dx), len=Math.hypot(dx,dy);
        ctx.save(); ctx.translate(sx,sy); if(data.dir<0) ctx.scale(-1,1); ctx.rotate(rot);
        ctx.shadowBlur=0;
        ctx.strokeStyle='#6b4a2b'; ctx.lineWidth=2.4;
        ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(len+2,0); ctx.stroke();
        ctx.fillStyle='#b8a888'; ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(-16,-4); ctx.lineTo(-6,0); ctx.lineTo(-16,4); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      if(data.dustA>0){
        const wx=data.stakeX, wy=data.groundY;
        ctx.strokeStyle=`rgba(60,50,40,${data.dustA})`; ctx.lineWidth=1.4;
        for(let i=0;i<5;i++){ const a=Math.PI*(0.1+i*0.2); ctx.beginPath(); ctx.moveTo(wx,wy); ctx.lineTo(wx+Math.cos(a)*14,wy-Math.sin(a)*4); ctx.stroke(); }
        _finImpactLines(ctx,wx,wy-2,10,24+(1-data.dustA)*18,`rgba(200,185,160,${data.dustA})`,2);
      }
      if(data.shockR>0&&data.shockAlpha>0){
        ctx.strokeStyle=`rgba(215,180,120,${data.shockAlpha})`; ctx.lineWidth=3; ctx.shadowColor='#d7b478'; ctx.shadowBlur=18;
        ctx.beginPath(); ctx.arc(data.tx0+tgt.w/2,data.boltY,data.shockR*0.6,0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
      if(timer>=70&&timer<=78) _finFlash(ctx,(78-timer)/8*0.5,240,225,190);
      if(timer>36&&timer<114) _finSubtitle(ctx,'"One bolt. I only ever needed one."',t);
      _finTitle(ctx,'PINNED',t,'rgba(215,180,120,1)');
    }
    , { swing:{at:54,dur:6,antic:0}, impact:58, smear:false,
        holds:[{at:58,frames:3,shake:14,zoom:false},{at:70,frames:6,shake:30}] }
  ),

});
