'use strict';
// smb-finisher-rivals: Fallen God and Sovereign kill sets.
// Depends on: smb-finisher-helpers.js, smb-finisher-weapon.js (_wfDef, CLASS_FINISHERS), smb-finisher-weapon3.js (_wf3GroundY).

// He is a mentor even when he wins: every line sends the player back in.
const _FG_FIN_LINES = [
  'Again. You were closer that time.',
  'Rise. The lesson is not over.',
  'Every wall has a way over. Find it.',
  'You swung on reflex. Swing on purpose.',
  'I fell once too. I got up.',
];
const _SOV_FIN_LINES = [
  'I already took every way out.',
  'Nothing you did was new to me.',
  'I learned you. That was the whole fight.',
  'Next time I will know you sooner.',
  'You were readable from the first exchange.',
];
function _rivPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Screen-space light column at world x, top of the arena down to floorY.
function _fgDrawPillar(ctx, x, floorY, halfW, alpha) {
  if (alpha <= 0) return;
  const g = ctx.createLinearGradient(x - halfW, 0, x + halfW, 0);
  g.addColorStop(0,   'rgba(255,204,68,0)');
  g.addColorStop(0.3, `rgba(255,204,68,${alpha * 0.55})`);
  g.addColorStop(0.5, `rgba(255,242,192,${alpha})`);
  g.addColorStop(0.7, `rgba(255,204,68,${alpha * 0.55})`);
  g.addColorStop(1,   'rgba(255,204,68,0)');
  ctx.fillStyle = g;
  ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 30 * alpha;
  ctx.fillRect(x - halfW, -40, halfW * 2, floorY + 40);
  ctx.shadowBlur = 0;
}

// A wall of the Fallen God's: gold slab with a bright core, same read as his in-fight Wall.
function _fgDrawWall(ctx, x, floorY, h, alpha) {
  if (alpha <= 0 || h <= 0) return;
  const w = 16;
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, '#8a5a00'); g.addColorStop(0.5, '#ffcc44'); g.addColorStop(1, '#8a5a00');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 18;
  ctx.fillRect(x - w / 2, floorY - h, w, h);
  ctx.fillStyle = 'rgba(255,242,192,0.85)';
  ctx.fillRect(x - 2, floorY - h, 4, h);
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// Outline of a fighter-sized figure, for Sovereign's predicted positions.
function _sovDrawGhost(ctx, gx, gy, w, h, alpha, crossed) {
  if (alpha <= 0) return;
  const cx = gx + w / 2, headR = w * 0.42;
  ctx.strokeStyle = `rgba(255,70,40,${alpha})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 10 * alpha;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.arc(cx, gy + headR, headR, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, gy + headR * 2); ctx.lineTo(cx, gy + h * 0.66);
  ctx.moveTo(cx - w * 0.6, gy + h * 0.38); ctx.lineTo(cx + w * 0.6, gy + h * 0.38);
  ctx.moveTo(cx, gy + h * 0.66); ctx.lineTo(cx - w * 0.45, gy + h);
  ctx.moveTo(cx, gy + h * 0.66); ctx.lineTo(cx + w * 0.45, gy + h);
  ctx.stroke();
  ctx.setLineDash([]);
  if (crossed > 0) {
    const k = Math.min(1, crossed);
    ctx.strokeStyle = `rgba(255,40,0,${Math.min(1, alpha + 0.3)})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(gx - w * 0.6, gy - 6);
    ctx.lineTo(gx - w * 0.6 + (w * 2.2) * k, gy - 6 + (h + 12) * k);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

// FALLEN GOD 1: his Verdict, finished. A pillar tracks the target, locks, and strikes.
const FIN_FG_VERDICT = _wfDef('FINAL VERDICT', 'rgba(255,204,68,1)', 132,
  (att, tgt, data) => { _wfBaseSetup(att, tgt, data);
    data.floorY = _wf3GroundY(); data.line = _rivPick(_FG_FIN_LINES);
    data.pillarA = 0; data.pillarW = 34; data.trackA = 0; data.lift = 0;
    data.tl = _makeTimeline([
      { frame: 0,  fn() { CinCam.zoomTo(1.22); CinCam.focusMidpoint(att, tgt); CinCam.slowMo(0.3); } },
      { frame: 16, fn() { CinCam.focusOn(tgt); CinCam.zoomTo(1.35); } },
      { frame: 38, fn() { CinCam.slowMo(0.08); } },
      { frame: 46, fn() { CinCam.slowMo(1.0); CinCam.shake(30); CinCam.zoomTo(1.15);
          spawnParticles(tgt.cx(), data.floorY - 4, '#ffcc44', 40); spawnParticles(tgt.cx(), tgt.cy(), '#fff2c0', 18);
          data.shockR = 1; data.shockAlpha = 0.9;
          if (typeof SoundManager !== 'undefined' && SoundManager.heavyHit) SoundManager.heavyHit(); } },
      { frame: 108, fn() { CinCam.restore(); } },
    ]); },
  (att, tgt, timer, data) => { _tickTimeline(data.tl, timer); _wfTick(timer, 132, data);
    att.x = data.ax0; att.y = data.ay0;
    if (timer < 38)      { data.trackA = Math.min(1, timer / 16); data.auraAlpha = Math.min(0.8, timer / 30); data.auraR = 30 + timer * 0.8; }
    else if (timer < 46) { data.trackA = 1; data.pillarW = 34 - (timer - 38) * 3; }
    else if (timer < 54) { data.trackA = 0; data.pillarA = 1; data.pillarW = 30 + (timer - 46) * 2; }
    else                 { data.pillarA = Math.max(0, data.pillarA - 0.03); data.auraAlpha = Math.max(0, data.auraAlpha - 0.03); }
    // Held up in the light, then let fall.
    if (timer >= 46 && timer < 84)       data.lift = _finEaseOut((timer - 46) / 38) * 46;
    else if (timer >= 84 && timer < 98)  data.lift = 46 * (1 - _finEaseIn((timer - 84) / 14));
    else if (timer >= 98)                data.lift = 0;
    tgt.x = data.tx0; tgt.y = data.ty0 - data.lift;
    if (timer === 98) { CinCam.shake(10); spawnParticles(tgt.cx(), data.floorY - 2, '#ffcc44', 14); }
    att.vx = 0; att.vy = 0; tgt.vx = 0; tgt.vy = 0; },
  (ctx, att, tgt, t, timer, data) => {
    const { scX, scY, ox, oy } = _finGameTransform();
    _finBars(ctx, data.bars); _finVignette(ctx, 0.42);
    _wfDrawAura(ctx, att, 'rgba(255,204,68,1)', data.auraAlpha, data.auraR, scX, scY, ox, oy);
    ctx.save(); ctx.setTransform(scX, 0, 0, scY, ox, oy);
    if (data.trackA > 0) {
      // The reticle: a thin beam and a floor ring that narrow while it locks.
      ctx.globalAlpha = data.trackA * 0.7;
      _fgDrawPillar(ctx, tgt.cx(), data.floorY, Math.max(4, data.pillarW * 0.25), 0.6);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(255,204,68,${data.trackA * 0.9})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(tgt.cx(), data.floorY, data.pillarW, data.pillarW * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
    }
    _fgDrawPillar(ctx, data.tx0 + tgt.w / 2, data.floorY, data.pillarW, data.pillarA);
    if (data.shockR > 0 && data.shockAlpha > 0) {
      ctx.strokeStyle = `rgba(255,204,68,${data.shockAlpha})`; ctx.lineWidth = 4;
      ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.ellipse(data.tx0 + tgt.w / 2, data.floorY, data.shockR, data.shockR * 0.25, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    if (timer >= 46 && timer <= 52) _finFlash(ctx, (52 - timer) / 6 * 0.22, 255, 214, 120);
    if (timer > 58 && timer < 118) _finSubtitle(ctx, `"${data.line}"`, t);
    _finTitle(ctx, 'FINAL VERDICT', t, 'rgba(255,204,68,1)');
  },
  { swing: { at: 40, dur: 12 }, impact: 46 }
);

// FALLEN GOD 2: two walls rise either side of the target and close; the spear goes through the gap.
const FIN_FG_WALL_HOLDS = _wfDef('THE WALL HOLDS', 'rgba(255,204,68,1)', 138,
  (att, tgt, data) => { _wfBaseSetup(att, tgt, data);
    data.floorY = _wf3GroundY(); data.line = _rivPick(_FG_FIN_LINES);
    data.wallH = 0; data.wallA = 0; data.gap = 70;
    data.tl = _makeTimeline([
      { frame: 0,  fn() { CinCam.zoomTo(1.25); CinCam.focusOn(tgt); CinCam.slowMo(0.35); } },
      { frame: 12, fn() { CinCam.shake(8); spawnParticles(tgt.cx() - 70, data.floorY, '#ffcc44', 10); spawnParticles(tgt.cx() + 70, data.floorY, '#ffcc44', 10); } },
      { frame: 42, fn() { CinCam.zoomTo(1.5); CinCam.focusMidpoint(att, tgt); } },
      { frame: 62, fn() { CinCam.shake(14); } },
      { frame: 72, fn() { CinCam.slowMo(1.0); CinCam.shake(28); CinCam.zoomTo(1.25);
          spawnParticles(tgt.cx(), tgt.cy(), '#ffcc44', 34); spawnParticles(tgt.cx(), tgt.cy(), '#fff2c0', 14);
          data.shockR = 1; data.shockAlpha = 0.85;
          if (typeof SoundManager !== 'undefined' && SoundManager.heavyHit) SoundManager.heavyHit(); } },
      { frame: 96, fn() { CinCam.shake(10);
          spawnParticles(tgt.cx() - data.gap, data.floorY - 40, '#8a5a00', 18); spawnParticles(tgt.cx() + data.gap, data.floorY - 40, '#8a5a00', 18); } },
      { frame: 114, fn() { CinCam.restore(); } },
    ]); },
  (att, tgt, timer, data) => { _tickTimeline(data.tl, timer); _wfTick(timer, 138, data);
    tgt.x = data.tx0; tgt.y = data.ty0;
    const wallFull = tgt.h + 46;
    if (timer >= 12 && timer < 34)      { data.wallA = 1; data.wallH = wallFull * _finEaseOut((timer - 12) / 22); }
    if (timer >= 40 && timer < 64)      data.gap = _finLerp(70, tgt.w / 2 + 10, _finEaseIn((timer - 40) / 24));
    if (timer >= 96)                    { data.wallA = Math.max(0, 1 - (timer - 96) / 18); data.wallH = wallFull * data.wallA; }
    // Steps in to spear reach while the walls close.
    const reach = 56;
    if (timer < 44)       { att.x = data.ax0; }
    else if (timer < 66)  { att.x = _finLerp(data.ax0, data.tx0 - data.dir * reach, _finEaseInOut((timer - 44) / 22)); }
    else                  { att.x = data.tx0 - data.dir * reach; }
    att.y = data.ay0;
    if (timer >= 72 && timer < 104) { const p = (timer - 72) / 32; tgt.x = data.tx0 + data.dir * _finEaseOut(p) * 8; }
    att.vx = 0; att.vy = 0; tgt.vx = 0; tgt.vy = 0; },
  (ctx, att, tgt, t, timer, data) => {
    const { scX, scY, ox, oy } = _finGameTransform();
    _finBars(ctx, data.bars); _finVignette(ctx, 0.44);
    ctx.save(); ctx.setTransform(scX, 0, 0, scY, ox, oy);
    const mid = data.tx0 + tgt.w / 2;
    _fgDrawWall(ctx, mid - data.gap, data.floorY, data.wallH, data.wallA);
    _fgDrawWall(ctx, mid + data.gap, data.floorY, data.wallH, data.wallA);
    if (data.shockR > 0 && data.shockAlpha > 0) {
      ctx.strokeStyle = `rgba(255,204,68,${data.shockAlpha})`; ctx.lineWidth = 5;
      ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(tgt.cx(), tgt.cy(), data.shockR, 0, Math.PI * 2); ctx.stroke();
      _finImpactLines(ctx, tgt.cx(), tgt.cy(), 12, data.shockR * 0.5, '#ffcc44', 3);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    if (timer >= 72 && timer <= 78) _finFlash(ctx, (78 - timer) / 6 * 0.22, 255, 214, 120);
    if (timer > 80 && timer < 126) _finSubtitle(ctx, `"${data.line}"`, t);
    _finTitle(ctx, 'THE WALL HOLDS', t, 'rgba(255,204,68,1)');
  },
  { swing: { at: 64, dur: 12 }, impact: 72 }
);

// FALLEN GOD 3: his Fall. Up out of frame, down spear-first beside the target, ground waves out.
const FIN_FG_THE_FALL = _wfDef('THE FALL', 'rgba(255,204,68,1)', 142,
  (att, tgt, data) => { _wfBaseSetup(att, tgt, data);
    data.floorY = _wf3GroundY(); data.line = _rivPick(_FG_FIN_LINES);
    data.landX = data.tx0 - data.dir * 34; data.peakY = data.ay0 - 280;
    data.waves = []; data.glint = 0; data.trail = [];
    data.tl = _makeTimeline([
      { frame: 0,  fn() { CinCam.zoomTo(1.2); CinCam.focusMidpoint(att, tgt); CinCam.slowMo(0.4); } },
      { frame: 8,  fn() { spawnParticles(att.cx(), data.floorY, '#ffcc44', 14); CinCam.shake(6); } },
      { frame: 30, fn() { CinCam.slowMo(0.12); CinCam.zoomTo(1.05); CinCam.focusOn(tgt); data.glint = 1; } },
      { frame: 46, fn() { CinCam.slowMo(1.0); } },
      { frame: 56, fn() { CinCam.shake(34); CinCam.zoomTo(1.3);
          spawnParticles(tgt.cx(), data.floorY - 4, '#ffcc44', 44); spawnParticles(tgt.cx(), tgt.cy(), '#fff2c0', 16);
          data.waves.push({ x: data.landX + att.w / 2, dir: 1, life: 1 }, { x: data.landX + att.w / 2, dir: -1, life: 1 });
          data.shockR = 1; data.shockAlpha = 0.9;
          if (typeof SoundManager !== 'undefined' && SoundManager.heavyHit) SoundManager.heavyHit(); } },
      // The trail only ages while he moves, so after landing the dive would hang in the air.
      { frame: 64, fn() { if (typeof CinFX !== 'undefined' && CinFX.motionTrailOff) CinFX.motionTrailOff(att); } },
      { frame: 118, fn() { CinCam.restore(); } },
    ]); },
  (att, tgt, timer, data) => { _tickTimeline(data.tl, timer); _wfTick(timer, 142, data);
    if (timer < 8)        { att.x = data.ax0; att.y = data.ay0; }
    else if (timer < 30)  { const p = _finEaseOut((timer - 8) / 22); att.x = _finLerp(data.ax0, data.landX, p); att.y = _finLerp(data.ay0, data.peakY, p); }
    else if (timer < 46)  { att.x = data.landX; att.y = data.peakY; }
    else if (timer < 56)  { att.x = data.landX; att.y = _finLerp(data.peakY, data.ay0, _finEaseIn((timer - 46) / 10)); data.trail.push({ x: att.cx(), y: att.cy(), a: 0.8 }); }
    else                  { att.x = data.landX; att.y = data.ay0; }
    for (const tr of data.trail) tr.a = Math.max(0, tr.a - 0.06);
    data.trail = data.trail.filter(tr => tr.a > 0);
    data.glint = Math.max(0, data.glint - 0.05);
    // Thrown up and back off the impact, then down.
    if (timer < 56) { tgt.x = data.tx0; tgt.y = data.ty0; }
    else {
      const p = Math.min(1, (timer - 56) / 46);
      tgt.x = data.tx0 + data.dir * _finEaseOut(p) * 120;
      tgt.y = data.ty0 - Math.sin(p * Math.PI) * 70;
    }
    for (const w of data.waves) { w.x += w.dir * 9; w.life = Math.max(0, w.life - 0.025); }
    att.vx = 0; att.vy = 0; tgt.vx = 0; tgt.vy = 0; },
  (ctx, att, tgt, t, timer, data) => {
    const { scX, scY, ox, oy } = _finGameTransform();
    _finBars(ctx, data.bars); _finVignette(ctx, 0.42);
    ctx.save(); ctx.setTransform(scX, 0, 0, scY, ox, oy);
    if (data.glint > 0) {
      const gx = data.landX + att.w / 2, gy = data.peakY + att.h * 0.3;
      ctx.strokeStyle = `rgba(255,242,192,${data.glint})`; ctx.lineWidth = 2;
      ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.moveTo(gx - 22, gy); ctx.lineTo(gx + 22, gy); ctx.moveTo(gx, gy - 22); ctx.lineTo(gx, gy + 22); ctx.stroke();
      ctx.shadowBlur = 0;
    }
    for (const tr of data.trail) {
      ctx.fillStyle = `rgba(255,204,68,${tr.a * 0.5})`;
      ctx.fillRect(tr.x - 5, tr.y - 14, 10, 28);
    }
    for (const w of data.waves) {
      if (w.life <= 0) continue;
      ctx.fillStyle = `rgba(255,204,68,${w.life * 0.8})`;
      ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(w.x - w.dir * 18, data.floorY);
      ctx.quadraticCurveTo(w.x, data.floorY - 26 * w.life, w.x + w.dir * 10, data.floorY);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    if (data.shockR > 0 && data.shockAlpha > 0) {
      ctx.strokeStyle = `rgba(255,204,68,${data.shockAlpha})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(data.landX + att.w / 2, data.floorY, data.shockR, data.shockR * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    if (timer >= 56 && timer <= 62) _finFlash(ctx, (62 - timer) / 6 * 0.22, 255, 214, 120);
    if (timer > 66 && timer < 128) _finSubtitle(ctx, `"${data.line}"`, t);
    _finTitle(ctx, 'THE FALL', t, 'rgba(255,204,68,1)');
  },
  { swing: { at: 48, dur: 10 }, impact: 56 }
);

// SOVEREIGN 2: he shows the target every escape he had already read, cuts each one, then the real one.
const FIN_SOV_FORESIGHT = _wfDef('FORESIGHT', 'rgba(220,40,0,1)', 128,
  (att, tgt, data) => { _wfBaseSetup(att, tgt, data);
    data.line = _rivPick(_SOV_FIN_LINES); data.ghostA = 0; data.blink = 0;
    // Back off, jump, dodge through: the three outs.
    data.ghosts = [
      { dx: data.dir * 70,  dy: 0,   cutAt: 30 },
      { dx: data.dir * 10,  dy: -86, cutAt: 40 },
      { dx: -data.dir * 44, dy: 0,   cutAt: 50 },
    ];
    data.tl = _makeTimeline([
      { frame: 0,  fn() { CinCam.zoomTo(1.3); CinCam.focusOn(tgt); CinCam.slowMo(0.2); } },
      { frame: 30, fn() { CinCam.shake(6); } },
      { frame: 40, fn() { CinCam.shake(6); } },
      { frame: 50, fn() { CinCam.shake(6); } },
      { frame: 62, fn() { data.blink = 1; spawnParticles(att.cx(), att.cy(), '#cc2200', 16); } },
      { frame: 66, fn() { CinCam.slowMo(1.0); CinCam.shake(30); CinCam.zoomTo(1.45); CinCam.focusOn(tgt);
          spawnParticles(tgt.cx(), tgt.cy(), '#cc2200', 38); spawnParticles(tgt.cx(), tgt.cy(), '#000000', 14);
          data.shockR = 1; data.shockAlpha = 0.9;
          if (typeof CinFX !== 'undefined' && CinFX.impactFrame) CinFX.impactFrame([att, tgt], { dur: 3 });
          if (typeof SoundManager !== 'undefined' && SoundManager.heavyHit) SoundManager.heavyHit(); } },
      { frame: 104, fn() { CinCam.restore(); } },
    ]); },
  (att, tgt, timer, data) => { _tickTimeline(data.tl, timer); _wfTick(timer, 128, data);
    data.ghostA = timer < 12 ? timer / 12 : timer < 60 ? 1 : Math.max(0, 1 - (timer - 60) / 8);
    data.blink = Math.max(0, data.blink - 0.12);
    tgt.y = data.ty0;
    if (timer < 62)       { att.x = data.ax0; tgt.x = data.tx0; }
    else if (timer < 66)  { att.x = data.tx0 - data.dir * 30; tgt.x = data.tx0; }
    else { const p = Math.min(1, (timer - 66) / 40); att.x = data.tx0 - data.dir * 30; tgt.x = data.tx0 + data.dir * _finEaseOut(p) * 90; tgt.y = data.ty0 - _finEaseOut(p) * 16; }
    att.y = data.ay0;
    att.vx = 0; att.vy = 0; tgt.vx = 0; tgt.vy = 0; },
  (ctx, att, tgt, t, timer, data) => {
    const { scX, scY, ox, oy } = _finGameTransform();
    _finBars(ctx, data.bars); _finVignette(ctx, 0.5);
    ctx.save(); ctx.setTransform(scX, 0, 0, scY, ox, oy);
    for (const g of data.ghosts) {
      const crossed = timer >= g.cutAt ? (timer - g.cutAt) / 5 : 0;
      _sovDrawGhost(ctx, data.tx0 + g.dx, data.ty0 + g.dy, tgt.w, tgt.h, data.ghostA * 0.8, crossed);
    }
    if (data.blink > 0) {
      ctx.strokeStyle = `rgba(220,40,0,${data.blink})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(data.ax0 + att.w / 2, data.ay0 + att.h / 2); ctx.lineTo(att.cx(), att.cy()); ctx.stroke();
    }
    if (data.shockR > 0 && data.shockAlpha > 0) {
      ctx.strokeStyle = `rgba(220,40,0,${data.shockAlpha})`; ctx.lineWidth = 5;
      ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(tgt.cx(), tgt.cy(), data.shockR, 0, Math.PI * 2); ctx.stroke();
      _finImpactLines(ctx, tgt.cx(), tgt.cy(), 12, data.shockR * 0.45, '#ff3300', 3.5);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    if (timer >= 66 && timer <= 72) _finFlash(ctx, (72 - timer) / 6 * 0.6, 0, 0, 0);
    if (timer > 74 && timer < 118) _finSubtitle(ctx, `"${data.line}"`, t);
    _finTitle(ctx, 'FORESIGHT', t, 'rgba(220,40,0,1)');
  },
  { swing: { at: 62, dur: 10 }, impact: 66 }
);

// SOVEREIGN 3: four passes through the target, each from the side it last guarded, then the last cut lands.
const FIN_SOV_DISMANTLE = _wfDef('DISMANTLE', 'rgba(220,40,0,1)', 124,
  (att, tgt, data) => { _wfBaseSetup(att, tgt, data);
    data.line = _rivPick(_SOV_FIN_LINES); data.cuts = []; data.side = -1;
    data.passes = [16, 26, 36, 46];
    data.tl = _makeTimeline([
      { frame: 0,  fn() { CinCam.zoomTo(1.35); CinCam.focusOn(tgt); CinCam.slowMo(0.5); } },
      { frame: 50, fn() { CinCam.slowMo(0.05); CinCam.zoomTo(1.55); } },
      { frame: 64, fn() { CinCam.slowMo(1.0); CinCam.shake(32); CinCam.zoomTo(1.3);
          spawnParticles(tgt.cx(), tgt.cy(), '#cc2200', 40); spawnParticles(tgt.cx(), tgt.cy(), '#ff4400', 16);
          data.shockR = 1; data.shockAlpha = 0.9;
          if (typeof SoundManager !== 'undefined' && SoundManager.heavyHit) SoundManager.heavyHit(); } },
      { frame: 102, fn() { CinCam.restore(); } },
    ]); },
  (att, tgt, timer, data) => { _tickTimeline(data.tl, timer); _wfTick(timer, 124, data);
    const i = data.passes.indexOf(timer);
    if (i >= 0) {
      data.side = -data.side;
      const a = (i % 2 ? -1 : 1) * (0.5 + i * 0.18);
      data.cuts.push({ a, life: 1, hot: 1 });
      CinCam.shake(7);
      spawnParticles(tgt.cx(), tgt.cy(), '#cc2200', 10);
      if (typeof SoundManager !== 'undefined' && SoundManager.hit) SoundManager.hit();
    }
    for (const c of data.cuts) { c.hot = Math.max(0, c.hot - 0.08); if (timer >= 64) c.life = Math.max(0, c.life - 0.03); }
    // side -1 is his starting side of the target, +1 the far side.
    if (timer < 16) att.x = _finLerp(data.ax0, data.tx0 - data.dir * 42, _finEaseIn(timer / 16));
    else            att.x = data.tx0 + data.side * data.dir * 42;
    att.y = data.ay0;
    if (timer < 64) { tgt.x = data.tx0; tgt.y = data.ty0; }
    else { const p = Math.min(1, (timer - 64) / 40); tgt.x = data.tx0 - data.side * data.dir * _finEaseOut(p) * 80; tgt.y = data.ty0 - Math.sin(p * Math.PI) * 26; }
    att.vx = 0; att.vy = 0; tgt.vx = 0; tgt.vy = 0; },
  (ctx, att, tgt, t, timer, data) => {
    const { scX, scY, ox, oy } = _finGameTransform();
    _finBars(ctx, data.bars); _finVignette(ctx, 0.5);
    ctx.save(); ctx.setTransform(scX, 0, 0, scY, ox, oy);
    const cx = data.tx0 + tgt.w / 2, cy = data.ty0 + tgt.h / 2;
    for (const c of data.cuts) {
      if (c.life <= 0) continue;
      const len = 52, dx = Math.cos(c.a) * len, dy = Math.sin(c.a) * len;
      ctx.strokeStyle = `rgba(${220 + c.hot * 35},${40 + c.hot * 180},${c.hot * 160},${c.life})`;
      ctx.lineWidth = 2 + c.hot * 4;
      ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(cx - dx, cy - dy); ctx.lineTo(cx + dx, cy + dy); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    if (data.shockR > 0 && data.shockAlpha > 0) {
      ctx.strokeStyle = `rgba(220,40,0,${data.shockAlpha})`; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(tgt.cx(), tgt.cy(), data.shockR, 0, Math.PI * 2); ctx.stroke();
      _finImpactLines(ctx, tgt.cx(), tgt.cy(), 12, data.shockR * 0.45, '#ff3300', 3.5);
    }
    ctx.restore();
    if (timer >= 64 && timer <= 70) _finFlash(ctx, (70 - timer) / 6 * 0.2, 220, 40, 0);
    if (timer > 72 && timer < 114) _finSubtitle(ctx, `"${data.line}"`, t);
    _finTitle(ctx, 'DISMANTLE', t, 'rgba(220,40,0,1)');
  },
  { swing: [{ at: 14, dur: 6 }, { at: 24, dur: 6 }, { at: 34, dur: 6 }, { at: 44, dur: 6 }, { at: 58, dur: 8 }], impact: 64 }
);
