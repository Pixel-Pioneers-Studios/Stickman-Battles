'use strict';
// smb-finisher-helpers.js — Shared drawing helpers + dialogue lookup for all finishers
// Depends on: smb-globals.js (ctx, GAME_W, GAME_H, canvas)
// Must load BEFORE all smb-finisher-*.js files

// ============================================================
// FINISHER SYSTEM — CinematicManager-powered
// ============================================================
// Architecture:
//   triggerFinisher(attacker, target)
//     → picks a finisher definition
//     → sets activeFinisher { attacker, target, timer, def, data }
//     → sets activeCinematic sentinel (blocks processInput + AI)
//     → runs def.timeline via CinematicManager each frame
//
// Global hooks used:
//   activeCinematic   — blocks processInput() / updateAI()
//   slowMotion        — scales physics in Fighter.update()
//   cinematicCamOverride / cinematicZoomTarget / cinematicFocusX/Y
//   screenShake
// ============================================================

// ── Easing helpers ───────────────────────────────────────────
function _finLerp(a, b, t)  { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function _finEaseOut(t)     { t = Math.max(0,Math.min(1,t)); return 1-(1-t)*(1-t); }
function _finEaseIn(t)      { t = Math.max(0,Math.min(1,t)); return t*t; }
function _finEaseInOut(t)   { t = Math.max(0,Math.min(1,t)); return t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2; }
function _finEaseBounce(t)  { t = Math.max(0,Math.min(1,t)); if(t<1/2.75) return 7.5625*t*t; if(t<2/2.75){ t-=1.5/2.75; return 7.5625*t*t+0.75; } if(t<2.5/2.75){ t-=2.25/2.75; return 7.5625*t*t+0.9375; } t-=2.625/2.75; return 7.5625*t*t+0.984375; }

// ── Canvas: game-space transform (use when drawing in game coords) ─
function _finGameTransform() {
  const bs = Math.min(canvas.width/GAME_W, canvas.height/GAME_H);
  const scX = bs * camZoomCur, scY = bs * camZoomCur;
  return { scX, scY, ox: canvas.width/2 - camXCur*scX, oy: canvas.height/2 - camYCur*scY };
}

// ── Canvas: impact lines ─────────────────────────────────────
function _finImpactLines(ctx, gx, gy, count, len, color, lw) {
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = lw || 2;
  ctx.shadowColor = color; ctx.shadowBlur = 12;
  for (let i = 0; i < count; i++) {
    const a = (i/count) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(gx + Math.cos(a)*len*0.25, gy + Math.sin(a)*len*0.25);
    ctx.lineTo(gx + Math.cos(a)*len,      gy + Math.sin(a)*len);
    ctx.stroke();
  }
  ctx.restore();
}

// ── Canvas: lightning bolt ───────────────────────────────────
function _finLightning(ctx, x1, y1, x2, y2, color, lw, segs) {
  segs = segs || 8;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = lw || 3;
  ctx.shadowColor = color; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(x1, y1);
  for (let i = 1; i <= segs; i++) {
    const t2 = i/segs;
    const j = i<segs ? (Math.random()-0.5)*24 : 0;
    ctx.lineTo(x1+(x2-x1)*t2+j, y1+(y2-y1)*t2+j);
  }
  ctx.stroke();
  ctx.restore();
}

// ── Canvas: screen flash (screen-space) ─────────────────────
function _finFlash(ctx, alpha, r, g, b) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = `rgba(${r||255},${g||255},${b||255},${Math.min(1,alpha)})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// ── Canvas: letterbox bars ───────────────────────────────────
function _finBars(ctx, progress) {
  const bh = canvas.height * 0.09 * Math.max(0, Math.min(1, progress));
  if (bh < 1) return;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = 'rgba(0,0,0,0.92)';
  ctx.fillRect(0, 0, canvas.width, bh);
  ctx.fillRect(0, canvas.height-bh, canvas.width, bh);
  ctx.restore();
}

// ── Canvas: finisher title card (screen-space) ───────────────
function _finTitle(ctx, name, t, accentColor) {
  const alpha = t < 0.18 ? t/0.18 : t > 0.68 ? Math.max(0,(0.82-t)/0.14) : 1;
  if (alpha <= 0) return;
  accentColor = accentColor || 'rgba(200,80,255,0.95)';
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  const cx = canvas.width/2, cy = canvas.height * 0.135;
  const tw = Math.min(canvas.width * 0.72, 540);
  const bh = canvas.height * 0.075;
  // pill background
  ctx.fillStyle = `rgba(0,0,0,${alpha*0.6})`;
  ctx.beginPath(); ctx.roundRect(cx-tw/2, cy-bh*0.6, tw, bh, bh/2); ctx.fill();
  // accent glow line
  ctx.strokeStyle = accentColor.replace(')',`,${alpha*0.7})`).replace('rgba(','rgba(').replace('0.95','0.7');
  ctx.lineWidth = 2;
  ctx.shadowColor = accentColor; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.moveTo(cx-tw*0.38, cy+bh*0.38); ctx.lineTo(cx+tw*0.38, cy+bh*0.38); ctx.stroke();
  // text
  ctx.shadowColor = accentColor; ctx.shadowBlur = 28;
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.font = `900 ${Math.floor(canvas.width*0.042)}px Arial`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name, cx, cy);
  ctx.restore();
}

// ── Canvas: dialogue subtitle (screen-space) ─────────────────
function _finSubtitle(ctx, text, t, yFrac) {
  const alpha = t < 0.15 ? t/0.15 : t > 0.7 ? Math.max(0,(0.85-t)/0.15) : 1;
  if (alpha <= 0) return;
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  const cx = canvas.width/2, cy = canvas.height*(yFrac||0.88);
  ctx.font = `italic ${Math.floor(canvas.width*0.022)}px Arial`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8;
  ctx.fillStyle = `rgba(220,220,220,${alpha})`;
  ctx.fillText(text, cx, cy);
  ctx.restore();
}

// ── Canvas: vignette (dark edges) ───────────────────────────
function _finVignette(ctx, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.setTransform(1,0,0,1,0,0);
  const grd = ctx.createRadialGradient(
    canvas.width/2, canvas.height/2, canvas.height*0.18,
    canvas.width/2, canvas.height/2, canvas.height*1.0
  );
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, `rgba(0,0,0,${Math.min(0.85, alpha)})`);
  ctx.fillStyle = grd; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.restore();
}

// ── Cinematic face close-up (screen-space) ──────────────────
// Draws a large both-eyes face at screen position sx, sy.
// scale: size multiplier (1 = game-size; 4 = 4× bigger).
// exprOverride: 'neutral'|'cool'|'focused'|'intense'|'serene' or null to read fighter.expressionState
function _drawFaceCloseup(ctx, fighter, sx, sy, scale, exprOverride) {
  const col  = fighter ? fighter.color : '#333';
  const expr = exprOverride || (fighter && fighter.expressionState) || 'neutral';
  const s    = (fighter && fighter.state) || 'idle';
  const r    = 11 * scale;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Head
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth   = scale * 1.5;
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.stroke();

  const eyeOffX = r * 0.36;
  const eyeOffY = r * -0.18;
  const eyeR    = r * 0.27;
  const pupilR  = eyeR * 0.53;
  const lidH    = eyeR * 0.65;

  for (const side of [-1, 1]) {
    const ex = sx + side * eyeOffX;
    const ey = sy + eyeOffY;

    // Sclera
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI * 2); ctx.fill();

    // Half-lid
    if (expr === 'cool' || expr === 'serene') {
      ctx.fillStyle = col;
      ctx.fillRect(ex - eyeR - 0.5, ey - eyeR, (eyeR + 0.5) * 2, lidH);
    }

    // Pupil — angled slightly toward center (facing viewer)
    ctx.fillStyle = s === 'hurt' ? '#cc0000' : '#111';
    ctx.beginPath();
    ctx.arc(ex - side * eyeR * 0.12, ey, pupilR, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrow
    const browBaseY  = ey - eyeR - r * 0.12;
    const browInnerX = ex - side * eyeR * 0.45; // toward nose
    const browOuterX = ex + side * eyeR * 0.85; // toward ear
    let   biY = browBaseY, boY = browBaseY;
    if (s === 'hurt') {
      biY -= eyeR * 0.5; boY += eyeR * 0.2;                   // worried ↗
    } else if (s === 'attacking' || expr === 'focused' || expr === 'intense') {
      biY += eyeR * 0.5; boY -= eyeR * 0.2;                   // determined ↘
    } else if (expr === 'cool') {
      biY += eyeR * 0.3; boY -= eyeR * 0.1;                   // cool slight ↘
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineWidth   = scale * 1.8;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(browOuterX, boY);
    ctx.lineTo(browInnerX, biY);
    ctx.stroke();
  }

  // Mouth
  const mX = sx, mY = sy + r * 0.35, mR = r * 0.32;
  ctx.lineWidth = scale * 1.5;
  if (s === 'hurt') {
    ctx.strokeStyle = '#ff3333';
    ctx.beginPath(); ctx.arc(mX, mY, mR, 0, Math.PI); ctx.stroke();
  } else if (expr === 'cool' || expr === 'serene') {
    // Smirk: inner corner flat, outer corner lifts
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.moveTo(mX - mR, mY + mR * 0.3);
    ctx.quadraticCurveTo(mX, mY + mR * 0.5, mX + mR, mY);
    ctx.stroke();
  } else if (expr === 'intense') {
    ctx.strokeStyle = '#ff3333';
    ctx.beginPath();
    ctx.moveTo(mX - mR * 0.7, mY + mR * 0.3);
    ctx.lineTo(mX + mR * 0.7, mY + mR * 0.3);
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.arc(mX, mY - mR * 0.3, mR, 0, Math.PI, true);
    ctx.stroke();
  }

  ctx.restore();
}

// CinCam, _makeTimeline, _tickTimeline, _makeFinisherSentinel
// are all defined in smc-cinematics.js (loaded before this file).

// ── Per-character dialogue pools ─────────────────────────────
const _FIN_DIALOGUE = {
  trueform: [
    'I will uncode you.',
    'You are an error.',
    'Removed.',
    'You never existed.',
    'End of instance.',
  ],
  creator: [
    'I wrote you. I can delete you.',
    'Back to nothing.',
    'I designed your defeat.',
    'You had no say in this.',
    'This was never a fair fight.',
  ],
  yeti: [
    'CRUSH.',
    'BREAK.',
    'NOTHING.',
    'FALL.',
    'GONE.',
  ],
  beast: [
    "You don't belong here.",
    'The wild takes you.',
    'This is my domain.',
    'Nature always wins.',
    'Prey.',
  ],
};

// ============================================================
// BOSS FINISHER 1: VOID SLAM
// Theme: raw power — boss grabs player, lifts, slams
