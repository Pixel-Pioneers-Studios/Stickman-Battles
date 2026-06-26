'use strict';
// smb-drawing-effects.js — Boss beams, cinematic overlay, phase rings, boss spikes, accessories, curse auras, spartan rage, lightning bolts, class effects
// Depends on: smb-globals.js, smb-data-arenas.js, smb-particles-core.js

// ============================================================
// BOSS BEAMS
// ============================================================
function drawBossBeams() {
  for (const b of bossBeams) {
    ctx.save();
    if (b.phase === 'warning') {
      const progress = 1 - b.warningTimer / 300;
      const flicker  = Math.sin(frameCount * 0.35 + b.x * 0.05) * 0.1;
      ctx.globalAlpha = clamp(0.15 + progress * 0.40 + flicker, 0.05, 0.65);
      ctx.strokeStyle = '#dd77ff';
      ctx.lineWidth   = 5 + progress * 7;
      ctx.shadowColor = '#9900ee';
      ctx.shadowBlur  = 20;
      ctx.setLineDash([22, 14]);
      ctx.beginPath();
      ctx.moveTo(b.x, 462);
      ctx.lineTo(b.x, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      // Pulsing ground indicator
      const pulse = 8 + progress * 14 + Math.sin(frameCount * 0.4) * 4;
      ctx.globalAlpha = 0.75;
      ctx.fillStyle   = '#ff44ff';
      ctx.shadowBlur  = 24;
      ctx.beginPath();
      ctx.arc(b.x, 462, pulse, 0, Math.PI * 2);
      ctx.fill();
      // Countdown text
      const secs = Math.ceil(b.warningTimer / 60);
      ctx.globalAlpha = 0.9;
      ctx.font        = 'bold 11px Arial';
      ctx.fillStyle   = '#ffffff';
      ctx.textAlign   = 'center';
      ctx.shadowBlur  = 6;
      ctx.fillText(secs + 's', b.x, 448);
    } else if (b.phase === 'active') {
      ctx.globalAlpha = 0.9;
      // Outer glow
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth   = 24;
      ctx.shadowColor = '#cc00ff';
      ctx.shadowBlur  = 55;
      ctx.beginPath();
      ctx.moveTo(b.x, GAME_H);
      ctx.lineTo(b.x, 0);
      ctx.stroke();
      // Core beam
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 8;
      ctx.shadowBlur  = 20;
      ctx.beginPath();
      ctx.moveTo(b.x, GAME_H);
      ctx.lineTo(b.x, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ============================================================
// CINEMATIC OVERLAY — letterbox bars + vignette (drawn in screen space)
// ============================================================
function drawCinematicOverlay() {
  if (!activeCinematic) return;
  const cw = canvas.width, ch = canvas.height;
  const t  = activeCinematic.timer / 60;
  const totalSec  = activeCinematic.durationFrames / 60;
  const inAlpha   = Math.min(1, t / 0.3);
  const outAlpha  = Math.min(1, (totalSec - t) / 0.3);
  const barAlpha  = Math.min(inAlpha, outAlpha);

  // Letterbox bars
  const barH = Math.round(ch * 0.082);
  ctx.globalAlpha = barAlpha;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0,         cw, barH);
  ctx.fillRect(0, ch - barH, cw, barH);

  // Edge vignette — gradient cached; rebuild only when canvas.width changes
  ctx.globalAlpha = barAlpha * 0.38;
  if (!drawCinematicOverlay._vigCache || drawCinematicOverlay._vigCacheW !== cw) {
    const _vg = ctx.createLinearGradient(0, 0, cw, 0);
    _vg.addColorStop(0,    'rgba(0,0,0,0.85)');
    _vg.addColorStop(0.13, 'rgba(0,0,0,0)');
    _vg.addColorStop(0.87, 'rgba(0,0,0,0)');
    _vg.addColorStop(1,    'rgba(0,0,0,0.85)');
    drawCinematicOverlay._vigCache  = _vg;
    drawCinematicOverlay._vigCacheW = cw;
  }
  ctx.fillStyle = drawCinematicOverlay._vigCache;
  ctx.fillRect(0, barH, cw, ch - barH * 2);

  // Per-frame anime FX (screen-space draw pass — runs between bars and phase label)
  if (typeof activeCinematic.draw === 'function') {
    ctx.save();
    ctx.globalAlpha = 1;
    activeCinematic.draw(ctx, t);
    ctx.restore();
  }

  // Phase label (if set by the cinematic sequence)
  const labelAlpha = Math.max(0,
    Math.min(1, (t - 0.9) / 0.25) * Math.min(1, (totalSec - t - 0.25) / 0.25));
  if (labelAlpha > 0 && activeCinematic._phaseLabel) {
    ctx.globalAlpha = labelAlpha;
    ctx.font        = `bold ${Math.round(ch * 0.042)}px Arial`;
    ctx.textAlign   = 'center';
    ctx.fillStyle   = activeCinematic._phaseLabel.color || '#ffffff';
    ctx.shadowColor = activeCinematic._phaseLabel.color || '#cc00ee';
    ctx.shadowBlur  = 30;
    ctx.fillText(activeCinematic._phaseLabel.text, cw / 2, ch / 2);
    ctx.shadowBlur  = 0;
  }
  // Screen flash (from CinFX.flash)
  if (cinScreenFlash && cinScreenFlash.timer > 0) {
    const fa = (cinScreenFlash.timer / cinScreenFlash.maxTimer) * cinScreenFlash.alpha;
    ctx.globalAlpha = Math.max(0, fa);
    ctx.fillStyle   = cinScreenFlash.color || '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    cinScreenFlash.timer--;
    if (cinScreenFlash.timer <= 0) cinScreenFlash = null;
  }

  ctx.globalAlpha = 1;
}

// ============================================================
// PHASE TRANSITION RINGS
// ============================================================
function drawPhaseTransitionRings() {
  for (let i = phaseTransitionRings.length - 1; i >= 0; i--) {
    const ring = phaseTransitionRings[i];
    ring.timer--;
    if (ring.timer <= 0) { phaseTransitionRings.splice(i, 1); continue; }
    const prog  = 1 - ring.timer / ring.maxTimer;
    const curR  = ring.r + prog * (ring.maxR - ring.r);
    const alpha = ring.timer < 20 ? ring.timer / 20 : 1 - prog * 0.55;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.strokeStyle = ring.color;
    ctx.lineWidth   = Math.max(0.5, (ring.lineWidth || 3) * (1 - prog * 0.7));
    ctx.shadowColor = ring.color;
    ctx.shadowBlur  = 16;
    ctx.beginPath();
    ctx.arc(ring.cx, ring.cy, Math.max(0.1, curR), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ============================================================
// BOSS SPIKES
// ============================================================
function drawBossSpikes() {
  for (const sp of bossSpikes) {
    if (sp.done || sp.h <= 0) continue;
    const baseY = 460;
    const tipY  = baseY - sp.h;
    ctx.save();
    ctx.shadowColor = '#cc00ff';
    ctx.shadowBlur  = 12;
    // Spike body (tapered rectangle, 10px base → 2px tip)
    ctx.beginPath();
    ctx.moveTo(sp.x - 3,   baseY);
    ctx.lineTo(sp.x + 3,   baseY);
    ctx.lineTo(sp.x + 0.5, tipY);
    ctx.lineTo(sp.x - 0.5, tipY);
    ctx.closePath();
    ctx.fillStyle = '#aaaacc';
    ctx.fill();
    ctx.strokeStyle = '#cc00ff';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}

// ============================================================
// SPARTAN RAGE VISUALS  (Kratos class perk active)
// ============================================================
function drawAccessory(fighter, cx, headCY, shoulderY, hipY, facing, headR) {
  const hat  = fighter.hat  || 'none';
  const cape = fighter.cape || 'none';
  if (hat === 'none' && cape === 'none') return;
  ctx.save();

  // --- CAPE (ribbon bezier — draw behind body) ---
  if (cape !== 'none') {
    const _capeT  = (typeof frameCount !== 'undefined' ? frameCount : 0);
    const _cd     = -facing;  // trails opposite to facing
    const _wv     = Math.sin(_capeT * 0.13 + fighter.x * 0.04) * 4
                  + Math.sin(_capeT * 0.07 + fighter.y * 0.03) * 2;
    const _drp    = Math.sin(_capeT * 0.10) * 1.5;

    // Short: tip just below hips; long/royal: extends well below hips
    const _tipDrop = cape === 'short' ? 8 : 26;
    const _reach   = cape === 'short' ? 32 : 44;
    const _tipX = cx + _cd * (_reach + _wv);
    const _tipY = hipY + _tipDrop + _drp;

    // Cape fill color: short/long/royal each get a distinct tone
    const _fillColor = cape === 'royal' ? 'rgba(160,10,10,0.9)'
                     : cape === 'long'  ? 'rgba(120,10,10,0.85)'
                     :                    'rgba(180,20,20,0.80)';

    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // Filled body of cape
    ctx.beginPath();
    ctx.moveTo(cx + _cd * 2, shoulderY - 10);
    ctx.bezierCurveTo(
      cx + _cd * (_reach * 0.85 + _wv * 0.5), shoulderY + 2,
      cx + _cd * (_reach * 1.15 + _wv * 0.8), hipY - 5,
      _tipX, _tipY);
    ctx.bezierCurveTo(
      cx + _cd * (_reach * 0.55 + _wv * 0.4), hipY + _tipDrop * 0.4,
      cx + _cd * (_reach * 0.25 + _wv * 0.2), hipY - 6,
      cx + _cd * 3, shoulderY + 2);
    ctx.closePath();
    ctx.fillStyle   = _fillColor;
    ctx.shadowColor = '#aa0000';
    ctx.shadowBlur  = 12;
    ctx.fill();

    // Outer edge stroke
    ctx.strokeStyle = cape === 'royal' ? '#cc1111' : '#991111';
    ctx.lineWidth   = 1.5;
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.moveTo(cx + _cd * 2, shoulderY - 10);
    ctx.bezierCurveTo(
      cx + _cd * (_reach * 0.85 + _wv * 0.5), shoulderY + 2,
      cx + _cd * (_reach * 1.15 + _wv * 0.8), hipY - 5,
      _tipX, _tipY);
    ctx.stroke();

    // Royal cape: gold trim crease
    if (cape === 'royal') {
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth   = 1.4;
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur  = 10;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + _cd * 3, shoulderY - 2);
      ctx.bezierCurveTo(
        cx + _cd * (_reach * 0.55 + _wv * 0.3), hipY - 8,
        cx + _cd * (_reach * 0.75 + _wv * 0.5), hipY + 4,
        _tipX - _cd * 5, _tipY - 5);
      ctx.stroke();
    } else {
      // Fold crease on short/long capes
      ctx.strokeStyle = 'rgba(255,80,80,0.35)';
      ctx.lineWidth   = 1;
      ctx.shadowBlur  = 0;
      ctx.beginPath();
      ctx.moveTo(cx + _cd * 3, shoulderY - 2);
      ctx.bezierCurveTo(
        cx + _cd * (_reach * 0.5 + _wv * 0.3), hipY - 8,
        cx + _cd * (_reach * 0.65 + _wv * 0.5), hipY + 4,
        _tipX - _cd * 5, _tipY - 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- HAT (draw above head) ---
  if (hat !== 'none') {
    ctx.fillStyle   = '#333';
    ctx.strokeStyle = '#222';
    ctx.lineWidth   = 1;
    const hatTop = headCY - headR;
    if (hat === 'cap') {
      ctx.fillStyle = '#444';
      ctx.beginPath();
      ctx.ellipse(cx, hatTop, headR + 1, 5, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx - headR - 1, hatTop - 7, headR * 2 + 2, 8);
      ctx.fillStyle = '#555';
      ctx.fillRect(cx + facing * headR, hatTop - 2, facing * 6, 4);
    } else if (hat === 'crown') {
      ctx.fillStyle = '#ffcc00';
      const bY = hatTop - 2;
      ctx.fillRect(cx - headR + 2, bY - 8, headR * 2 - 4, 8);
      ctx.beginPath();
      ctx.moveTo(cx - headR + 2, bY - 8);
      ctx.lineTo(cx - headR + 2 + 4, bY - 13);
      ctx.lineTo(cx, bY - 10);
      ctx.lineTo(cx + headR - 6, bY - 13);
      ctx.lineTo(cx + headR - 2, bY - 8);
      ctx.closePath(); ctx.fill();
    } else if (hat === 'wizard') {
      ctx.fillStyle = '#660099';
      ctx.beginPath();
      ctx.moveTo(cx - headR + 1, hatTop + 1);
      ctx.lineTo(cx + headR - 1, hatTop + 1);
      ctx.lineTo(cx + facing * 2, hatTop - 22);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(cx - headR - 3, hatTop - 2, headR * 2 + 6, 5);
    } else if (hat === 'headband') {
      ctx.fillStyle = '#cc2200';
      ctx.fillRect(cx - headR, headCY - 4, headR * 2, 4);
    }
  }

  ctx.restore();
}

// ── STORY CHARACTER APPEARANCE OVERLAYS ──────────────────────────────────────
// Drawn on top of the base stickman. Each named story character gets distinctive
// hair, markings, or accessories that make them visually unique at a glance.
function drawStoryCharacterOverlay(fighter, cx, headCY, shoulderY, hipY, f, headR) {
  const id = fighter.storyCharId;
  if (!id) return;
  ctx.save();

  if (id === 'veran') {
    // Tech visor strip across forehead
    ctx.fillStyle = 'rgba(0,180,255,0.55)';
    ctx.beginPath(); ctx.roundRect(cx - headR + 2, headCY - headR + 1, headR * 2 - 4, 4, 1.5); ctx.fill();
    ctx.strokeStyle = 'rgba(120,220,255,0.85)'; ctx.lineWidth = 0.8; ctx.stroke();
    // Lens dots on visor
    ctx.fillStyle = 'rgba(200,240,255,0.8)';
    ctx.beginPath(); ctx.arc(cx - 4, headCY - headR + 3, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 4, headCY - headR + 3, 1.5, 0, Math.PI * 2); ctx.fill();
    // Short swept hair above head (3 curved strokes)
    ctx.strokeStyle = '#3377cc'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 5, headCY - headR + 1); ctx.quadraticCurveTo(cx - 2, headCY - headR - 5, cx + 3, headCY - headR - 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, headCY - headR);         ctx.quadraticCurveTo(cx + 3, headCY - headR - 7, cx + 8, headCY - headR - 4); ctx.stroke();
    // Jacket collar lines at neck
    ctx.strokeStyle = '#2255aa'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - 5, shoulderY - 2); ctx.lineTo(cx - 2, shoulderY + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 5, shoulderY - 2); ctx.lineTo(cx + 2, shoulderY + 5); ctx.stroke();

  } else if (id === 'herald') {
    // Hollow void cracks across face — faint purple fracture lines
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#8833ff'; ctx.lineWidth = 1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 5, headCY - 6); ctx.lineTo(cx + 3, headCY + 2); ctx.lineTo(cx + 1, headCY + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 3, headCY - 4); ctx.lineTo(cx + 7, headCY + 1); ctx.stroke();
    // Fading extremity — bleed-out effect at wrist
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#8833ff';
    ctx.beginPath(); ctx.arc(cx - 14, shoulderY + 12, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 14, shoulderY + 12, 4, 0, Math.PI * 2); ctx.fill();
    // Hollow glow ring around head
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#6600cc'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, headCY, headR + 4, 0, Math.PI * 2); ctx.stroke();

  } else if (id === 'second_architect') {
    // Long nature-flowing hair — two curved sweeps either side
    ctx.strokeStyle = '#228833'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - headR + 2, headCY - 4);
    ctx.quadraticCurveTo(cx - headR - 6, headCY + 8, cx - headR - 3, hipY - 10); ctx.stroke();
    ctx.strokeStyle = '#33aa44'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - headR + 1, headCY - 2);
    ctx.quadraticCurveTo(cx - headR - 4, headCY + 6, cx - headR - 1, hipY - 14); ctx.stroke();
    // Top hair tufts
    ctx.strokeStyle = '#33aa44'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx - 4, headCY - headR + 1); ctx.quadraticCurveTo(cx - 6, headCY - headR - 6, cx - 2, headCY - headR - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 2, headCY - headR);     ctx.quadraticCurveTo(cx + 5, headCY - headR - 5, cx + 7, headCY - headR - 2); ctx.stroke();
    // Cloth wrap strip on torso
    ctx.globalAlpha = 0.45; ctx.fillStyle = '#115522';
    ctx.beginPath(); ctx.roundRect(cx - 6, shoulderY + 8, 12, 5, 1); ctx.fill();
    ctx.globalAlpha = 0.7; ctx.strokeStyle = '#33aa55'; ctx.lineWidth = 0.8; ctx.stroke();

  } else if (id === 'third_architect') {
    // Spiky forward-swept hair
    ctx.strokeStyle = '#1144aa'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let _ti = 0; _ti < 4; _ti++) {
      const _tx = cx - 6 + _ti * 4;
      ctx.beginPath(); ctx.moveTo(_tx, headCY - headR + 2);
      ctx.lineTo(_tx + f * 3, headCY - headR - 6 - _ti * 1.5); ctx.stroke();
    }
    // Angular cheek scar — sharp diagonal mark
    ctx.globalAlpha = 0.65; ctx.strokeStyle = '#aabbcc'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx + f * 4, headCY + 2); ctx.lineTo(cx + f * 7, headCY + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + f * 5, headCY + 1); ctx.lineTo(cx + f * 8, headCY + 5); ctx.stroke();
    // Mission-focused glare: thin shadow under brows
    ctx.globalAlpha = 0.4; ctx.fillStyle = '#000033';
    ctx.beginPath(); ctx.ellipse(cx, headCY - 4, headR - 3, 2, 0, 0, Math.PI); ctx.fill();

  } else if (id === 'enforcer') {
    // No hair — heavy brow ridge
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#770000';
    ctx.beginPath(); ctx.roundRect(cx - headR + 3, headCY - headR - 1, headR * 2 - 6, 3, 1); ctx.fill();
    // Battle scar — diagonal slash across face
    ctx.globalAlpha = 0.75; ctx.strokeStyle = '#cc0000'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(cx - 6, headCY - 5); ctx.lineTo(cx + 4, headCY + 5); ctx.stroke();
    // Shoulder spikes (bulk markers)
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#881111';
    ctx.beginPath(); ctx.arc(cx - 10, shoulderY + 2, 4, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 10, shoulderY + 2, 4, Math.PI, 0); ctx.fill();

  } else if (id === 'god') {
    // Divine halo — golden ring above head
    const _godPulse = 0.7 + 0.3 * Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.06);
    ctx.globalAlpha = _godPulse * 0.75;
    ctx.strokeStyle = '#ffe060'; ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(cx, headCY - headR - 7, headR + 2, 4, 0, 0, Math.PI * 2); ctx.stroke();
    // Flowing light hair
    ctx.shadowBlur = 0; ctx.globalAlpha = 0.65;
    ctx.strokeStyle = '#ffe8aa'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - headR + 1, headCY); ctx.quadraticCurveTo(cx - headR - 8, shoulderY - 5, cx - headR - 4, hipY - 8); ctx.stroke();
    ctx.strokeStyle = '#ffeecc'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - headR + 2, headCY + 2); ctx.quadraticCurveTo(cx - headR - 5, shoulderY, cx - headR - 2, hipY - 14); ctx.stroke();
    // Radiant lines from body
    ctx.globalAlpha = 0.2; ctx.strokeStyle = '#ffee88'; ctx.lineWidth = 1;
    for (let _gi = 0; _gi < 6; _gi++) {
      const _ga = _gi * Math.PI / 3 + (typeof frameCount !== 'undefined' ? frameCount : 0) * 0.008;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(_ga) * 12, headCY + Math.sin(_ga) * 12);
      ctx.lineTo(cx + Math.cos(_ga) * 22, headCY + Math.sin(_ga) * 22); ctx.stroke();
    }

  } else if (id === 'absolute_axiom') {
    // Geometric energy wings behind shoulders
    const _aaPulse = 0.6 + 0.4 * Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.1);
    ctx.globalAlpha = _aaPulse * 0.6;
    ctx.strokeStyle = '#cc88ff'; ctx.lineWidth = 1.8;
    ctx.shadowColor = '#aa44ff'; ctx.shadowBlur = 12;
    // Left wing
    ctx.beginPath(); ctx.moveTo(cx - 8, shoulderY + 2); ctx.lineTo(cx - 18, shoulderY - 8); ctx.lineTo(cx - 14, shoulderY + 10); ctx.stroke();
    // Right wing
    ctx.beginPath(); ctx.moveTo(cx + 8, shoulderY + 2); ctx.lineTo(cx + 18, shoulderY - 8); ctx.lineTo(cx + 14, shoulderY + 10); ctx.stroke();
    // Glowing eye sockets
    ctx.shadowBlur = 8; ctx.globalAlpha = _aaPulse * 0.7;
    ctx.fillStyle = '#cc88ff';
    ctx.beginPath(); ctx.arc(cx + f * 4, headCY - 3, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - f * 2, headCY - 3, 1.4, 0, Math.PI * 2); ctx.fill();
    // Geometric chest rune
    ctx.shadowBlur = 0; ctx.globalAlpha = 0.5; ctx.strokeStyle = '#aa44ff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, shoulderY + 3); ctx.lineTo(cx - 5, shoulderY + 12); ctx.lineTo(cx, shoulderY + 9); ctx.lineTo(cx + 5, shoulderY + 12); ctx.closePath(); ctx.stroke();

  } else if (id === 'null_companion') {
    // Void streak across face — diagonal erasure mark
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#aa00ff'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 7, headCY - 5); ctx.lineTo(cx + 5, headCY + 4); ctx.stroke();
    // Short battle-worn hair
    ctx.strokeStyle = '#660099'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx - 3, headCY - headR + 2); ctx.lineTo(cx - 5, headCY - headR - 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 2, headCY - headR + 1); ctx.lineTo(cx + 4, headCY - headR - 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 6, headCY - headR + 3); ctx.lineTo(cx + 7, headCY - headR - 4); ctx.stroke();
    // Dark void energy at wrists
    const _nullPulse = 0.4 + 0.3 * Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.12);
    ctx.globalAlpha = _nullPulse;
    ctx.strokeStyle = '#8800ee'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx - 14, shoulderY + 14, 3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 14, shoulderY + 14, 3, 0, Math.PI * 2); ctx.stroke();

  } else if (id === 'vael') {
    // Scout goggles — two lens circles with bridge
    ctx.fillStyle = '#112244'; ctx.beginPath(); ctx.arc(cx - 4, headCY - 3, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 4, headCY - 3, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2255cc'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = '#3366dd'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(cx - 0.5, headCY - 3); ctx.lineTo(cx + 0.5, headCY - 3); ctx.stroke();
    // Lens glint
    ctx.fillStyle = 'rgba(100,160,255,0.55)';
    ctx.beginPath(); ctx.arc(cx - 5, headCY - 4, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 3, headCY - 4, 1.2, 0, Math.PI * 2); ctx.fill();
    // Speed stripe on torso
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#0044ff'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx - 6, shoulderY + 6); ctx.lineTo(cx + 4, shoulderY + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 4, shoulderY + 10); ctx.lineTo(cx + 6, shoulderY + 10); ctx.stroke();

  } else if (id === 'seraph') {
    // Feathery wing traces — soft, curved strokes behind shoulders
    const _srPulse = 0.5 + 0.4 * Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.07);
    ctx.globalAlpha = _srPulse * 0.45;
    ctx.strokeStyle = '#aaeeff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    // Left feather traces
    ctx.beginPath(); ctx.moveTo(cx - 8, shoulderY + 2); ctx.quadraticCurveTo(cx - 18, shoulderY - 10, cx - 22, shoulderY + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 7, shoulderY + 5); ctx.quadraticCurveTo(cx - 16, shoulderY - 4,  cx - 20, shoulderY + 10); ctx.stroke();
    // Right feather traces
    ctx.beginPath(); ctx.moveTo(cx + 8, shoulderY + 2); ctx.quadraticCurveTo(cx + 18, shoulderY - 10, cx + 22, shoulderY + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 7, shoulderY + 5); ctx.quadraticCurveTo(cx + 16, shoulderY - 4,  cx + 20, shoulderY + 10); ctx.stroke();
    // Soft glow ring around head
    ctx.globalAlpha = _srPulse * 0.25; ctx.strokeStyle = '#88eeff'; ctx.lineWidth = 4;
    ctx.shadowColor = '#aaeeff'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(cx, headCY, headR + 3, 0, Math.PI * 2); ctx.stroke();

  } else if (id === 'thresh') {
    // Impact fracture lines radiating from shoulders — grief compressed into force
    const _tPulse = 0.5 + 0.3 * Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.05);
    ctx.globalAlpha = _tPulse * 0.65;
    ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    // Cracks radiating outward from shoulders
    ctx.beginPath(); ctx.moveTo(cx - 8, shoulderY); ctx.lineTo(cx - 20, shoulderY - 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 8, shoulderY + 2); ctx.lineTo(cx - 22, shoulderY + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 8, shoulderY); ctx.lineTo(cx + 20, shoulderY - 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 8, shoulderY + 2); ctx.lineTo(cx + 22, shoulderY + 4); ctx.stroke();
    // Heavy brow — thick ridge
    ctx.globalAlpha = 0.7; ctx.fillStyle = '#cc3300';
    ctx.beginPath(); ctx.roundRect(cx - headR + 4, headCY - headR - 1, headR * 2 - 8, 4, 1); ctx.fill();
    // Impact glow at fists (forearm position approximation)
    ctx.globalAlpha = _tPulse * 0.55;
    ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 8;
    ctx.strokeStyle = '#ff6622'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx - 16, shoulderY + 16, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 16, shoulderY + 16, 4, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawCurseAuras() {
  const CURSE_COLORS = {
    curse_slow:    '#4488ff',
    curse_weak:    '#222244',
    curse_fragile: '#ff8800',
  };
  for (const p of players) {
    if (!p.curses || p.curses.length === 0 || p.health <= 0) continue;
    ctx.save();
    let ringOffset = 0;
    for (const curse of p.curses) {
      const col = CURSE_COLORS[curse.type];
      if (!col) continue;
      const pulse = 0.3 + Math.abs(Math.sin(frameCount * 0.08 + ringOffset)) * 0.5;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = col;
      ctx.lineWidth   = 2.5;
      ctx.shadowColor = col;
      ctx.shadowBlur  = 10;
      const r = 22 + ringOffset * 6;
      ctx.beginPath();
      ctx.arc(p.cx(), p.cy() - p.h * 0.1, r, 0, Math.PI * 2);
      ctx.stroke();
      ringOffset++;
    }
    ctx.restore();
  }
}

function drawSpartanRageEffects() {
  let anyRage = false;
  for (const p of players) {
    if (!(p.spartanRageTimer > 0)) continue;
    anyRage = true;
    const pct = Math.min(1, p.spartanRageTimer / 300);
    const pcx = p.cx(), pcy = p.cy();
    ctx.save();
    // Radial aura
    const grad = ctx.createRadialGradient(pcx, pcy, 0, pcx, pcy, 52 + Math.sin(frameCount * 0.12) * 6);
    grad.addColorStop(0,   `rgba(255,100,0,${0.32 * pct})`);
    grad.addColorStop(0.5, `rgba(255,60,0,${0.18 * pct})`);
    grad.addColorStop(1,   'rgba(255,30,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pcx, pcy, 58, 0, Math.PI * 2);
    ctx.fill();
    // Pulsing outline ring
    ctx.strokeStyle = `rgba(255,140,0,${0.65 * pct})`;
    ctx.lineWidth   = 2.5;
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur  = 18;
    ctx.beginPath();
    ctx.arc(pcx, pcy, 34 + Math.sin(frameCount * 0.18) * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Floating ember particles every 3 frames
    if (frameCount % 3 === 0 && settings.particles && particles.length < MAX_PARTICLES) {
      const _ang = Math.random() * Math.PI * 2;
      const _r   = 16 + Math.random() * 24;
      const _p = _getParticle();
      _p.x = pcx + Math.cos(_ang) * _r; _p.y = pcy + Math.sin(_ang) * _r;
      _p.vx = (Math.random() - 0.5) * 1.8; _p.vy = -2.0 - Math.random() * 2.2;
      _p.color = Math.random() < 0.65 ? '#ff6600' : '#ff9900';
      _p.size = 1.6 + Math.random() * 2.2; _p.life = 28 + Math.random() * 22; _p.maxLife = 50;
      particles.push(_p);
    }
  }
  // Screen orange tint — only once regardless of how many have rage
  if (anyRage) {
    const _tintA = 0.055 + Math.sin(frameCount * 0.09) * 0.025;
    ctx.save();
    ctx.globalAlpha = _tintA;
    ctx.fillStyle   = '#ff5500';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.restore();
  }
}

// ============================================================
// CLASS VISUAL EFFECTS (Thor lightning arcs, Ninja shadow trail, etc.)
// ============================================================
function spawnLightningBolt(x, targetY) {
  // Build a jagged segmented path from top of screen down to target
  const segments = [];
  let cx = x + (Math.random() - 0.5) * 60;
  let cy = 0;
  const steps = 10 + Math.floor(Math.random() * 6);
  for (let i = 0; i <= steps; i++) {
    segments.push({ x: cx, y: cy });
    cy = targetY * (i / steps);
    cx = x + (Math.random() - 0.5) * 40 * (1 - i / steps);
  }
  segments.push({ x, y: targetY });
  lightningBolts.push({ x, y: targetY, timer: 18, segments });
}

function updateAndDrawLightningBolts() {
  for (let i = lightningBolts.length - 1; i >= 0; i--) {
    const bolt = lightningBolts[i];
    bolt.timer--;
    if (bolt.timer <= 0) { lightningBolts.splice(i, 1); continue; }
    const alpha = bolt.timer / 18;
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,120,${alpha})`;
    ctx.lineWidth   = 2.5;
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
    for (let j = 1; j < bolt.segments.length; j++) {
      ctx.lineTo(bolt.segments[j].x, bolt.segments[j].y);
    }
    ctx.stroke();
    // Inner bright core
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.8})`;
    ctx.lineWidth   = 1;
    ctx.shadowBlur  = 4;
    ctx.beginPath();
    ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
    for (let j = 1; j < bolt.segments.length; j++) {
      ctx.lineTo(bolt.segments[j].x, bolt.segments[j].y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

const classTrails = []; // {x, y, color, alpha, size, life}

function drawClassEffects() {
  // Update + draw shadow trails
  for (let i = classTrails.length - 1; i >= 0; i--) {
    const t = classTrails[i];
    t.alpha -= 0.04;
    t.life--;
    if (t.life <= 0) { classTrails.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha = Math.max(0, t.alpha);
    ctx.fillStyle   = t.color;
    ctx.beginPath();
    ctx.roundRect(t.x, t.y, 22, 60, 4);
    ctx.fill();
    ctx.restore();
  }

  for (const p of players) {
    if (p.health <= 0 || p.backstageHiding) continue;

    // THOR: Periodic lightning arc toward target + electric sparks on body
    if (p.charClass === 'thor') {
      // Ambient crackling particles
      if (frameCount % 8 === 0 && settings.particles && particles.length < MAX_PARTICLES) {
        const a = Math.random() * Math.PI * 2;
        const _p = _getParticle();
        _p.x = p.cx() + Math.cos(a) * 14; _p.y = p.cy() + Math.sin(a) * 14;
        _p.vx = (Math.random()-0.5)*2; _p.vy = -1.5 - Math.random()*1.5;
        _p.color = Math.random() < 0.6 ? '#ffff44' : '#aaddff';
        _p.size = 1.5 + Math.random()*2; _p.life = 14 + Math.random()*10; _p.maxLife = 24;
        particles.push(_p);
      }
      // Lightning arc toward target every 55 frames
      if (p.target && p.target.health > 0 && frameCount % 55 === 0) {
        const tx = p.target.cx(), ty = p.target.cy();
        const sx2 = p.cx(), sy2 = p.cy();
        const steps = 7;
        for (let si = 0; si < steps && particles.length < MAX_PARTICLES; si++) {
          const prog = si / steps;
          const jx   = sx2 + (tx - sx2) * prog + (Math.random()-0.5)*30;
          const jy   = sy2 + (ty - sy2) * prog + (Math.random()-0.5)*20;
          const _p = _getParticle();
          _p.x = jx; _p.y = jy; _p.vx = 0; _p.vy = 0;
          _p.color = '#ffffaa'; _p.size = 2.5; _p.life = 8; _p.maxLife = 8;
          particles.push(_p);
        }
      }
    }

    // NINJA: Shadow trail during fast movement
    if (p.charClass === 'ninja' && Math.abs(p.vx) > 5 && frameCount % 4 === 0) {
      classTrails.push({ x: p.x, y: p.y, color: 'rgba(0,200,80,0.45)', alpha: 0.45, size: 1, life: 14 });
    }

    // KRATOS: Ember sparks when in Spartan Rage (already handled by drawSpartanRageEffects)
    // Extra hit flash crackle when rage is active and hit
    if (p.charClass === 'kratos' && p.spartanRageTimer > 0 && p.hurtTimer > 0) {
      if (settings.particles) {
        for (let k = 0; k < 3 && particles.length < MAX_PARTICLES; k++) {
          const _p = _getParticle();
          _p.x = p.cx() + (Math.random()-0.5)*20; _p.y = p.cy() + (Math.random()-0.5)*20;
          _p.vx = (Math.random()-0.5)*4; _p.vy = -2-Math.random()*3;
          _p.color = '#ff8800'; _p.size = 2+Math.random()*2; _p.life = 12; _p.maxLife = 12;
          particles.push(_p);
        }
      }
    }

    // GUNNER: Muzzle flash lingering glow on weapon arm (cosmetic)
    if (p.charClass === 'gunner' && p.attackTimer > 0 && p.attackTimer === p.attackDuration) {
      if (settings.particles) {
        spawnParticles(p.cx() + p.facing * 28, p.y + 22, '#ffdd00', 5);
      }
    }
  }
}

