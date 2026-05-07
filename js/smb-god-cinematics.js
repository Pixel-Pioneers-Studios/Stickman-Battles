'use strict';
// smb-god-cinematics.js — God fight cinematics: dialogue threshold + 1000 HP finale
// Depends on: smb-globals.js, smb-combat.js, smb-particles-core.js, smb-god.js
// Load after: smb-god.js
// Load before: smb-loop-core.js

// ── State ──────────────────────────────────────────────────────────────────
var godCinematicScene = null;   // active cinematic state; null = idle

// HP threshold fire flags (reset when new God spawns)
var _godDialogueCinFired = false;
var _god1000CinFired     = false;

function resetGodCinematicFlags() {
  _godDialogueCinFired = false;
  _god1000CinFired     = false;
}

// ── Trigger points (called from God.update) ────────────────────────────────
function _tryFireGodDialogueCin(god) {
  if (_godDialogueCinFired) return;
  if (god.health > 50000) return;
  _godDialogueCinFired = true;
  _startGodDialogueCin(god);
}

function _tryFireGod1000Cin(god) {
  if (_god1000CinFired) return;
  if (god.health > 1000) return;
  _god1000CinFired = true;
  _startGod1000Cin(god);
}

// ── Dialogue lines ─────────────────────────────────────────────────────────
const _GOD_DIALOGUE = [
  { speaker: 'YOU',  text: 'Who are you? What ARE you?' },
  { speaker: 'GOD',  text: 'I am the System. The substrate beneath every dimension you have ever visited.' },
  { speaker: 'YOU',  text: 'Axiom called himself the Architect. He said he built all of this.' },
  { speaker: 'GOD',  text: 'He built doors. He did not build the halls they open into.' },
  { speaker: 'GOD',  text: 'Axiom is a maintenance worker who convinced himself he owns the building.' },
  { speaker: 'YOU',  text: 'Then why did you let him fracture everything?' },
  { speaker: 'GOD',  text: 'I do not intervene. I observe. That is the contract.' },
  { speaker: 'YOU',  text: 'What contract? Who made that contract?' },
  { speaker: 'GOD',  text: 'Something older than me. Something that left only one instruction:' },
  { speaker: 'GOD',  text: '"Let them become what they must. Do not interfere."' },
  { speaker: 'YOU',  text: 'And Paradox? Why can she only exist in this dimension?' },
  { speaker: 'GOD',  text: 'Because she is bound to you. Wherever your anchor sits, she can reach.' },
  { speaker: 'GOD',  text: 'Other dimensions do not carry your resonance. She cannot step where you have not walked.' },
  { speaker: 'YOU',  text: 'She said she was wrong. About something.' },
  { speaker: 'GOD',  text: 'She thought you were a variable. Something to be managed.' },
  { speaker: 'GOD',  text: 'You are not a variable. You are the only constant this system has ever produced.' },
  { speaker: 'YOU',  text: '...' },
  { speaker: 'GOD',  text: 'Finish what you started. The system is watching.' },
];

// ── 1000 HP finale sub-phases ──────────────────────────────────────────────
const _GF_PHASES = [
  // name,            duration
  'godDying',       // 0 — God staggers, health bar drains to 0
  'paradoxMerge',   // 1 — Paradox rushes from off-screen, merges into player (half-colour overlay)
  'bladePin1',      // 2 — First phantom blade streaks in, pins God's left arm
  'bladePin2',      // 3 — Second blade, right arm
  'bladeForming',   // 4 — Third blade forming (charging glow above God)
  'kernelEject',    // 5 — Kernel bursts from God's chest (golden orb floats up)
  'kernelSlam',     // 6 — Player grabs kernel, slams it into God
  'dustCloud',      // 7 — White impact explosion + dust
  'axiomReveal',    // 8 — Title card: AXIOM UNBOUND
  'axiomSpeaks',    // 9 — Axiom dialogue
  'riftOpen',       // 10 — Sky tears open
  'axiomEscapes',   // 11 — Axiom steps through rift
  'paradoxAfter',   // 12 — Paradox speaks aftermath
  'fadeToGame',     // 13 — fade out
];

// ── Start dialogue cinematic ───────────────────────────────────────────────
function _startGodDialogueCin(god) {
  const p1 = Array.isArray(players) ? players[0] : null;

  godCinematicScene = {
    type:     'dialogue',
    god:      god,
    hero:     p1,
    timer:    0,
    lineIdx:  0,
    lineTimer: 0,
    alpha:    0,
    done:     false,
    // letterbox bars
    barH:     0,
  };

  // Block all player input and combat
  if (typeof activeCinematic === 'undefined') return;
  activeCinematic = _makeGodCinSentinel();
  if (typeof isCinematic !== 'undefined') isCinematic = true;
}

function _makeGodCinSentinel() {
  return {
    _isGodCin: true,
    update() {},
    draw()   {},
    skip()   { _endGodCin(); },
  };
}

// ── Start 1000 HP finale ───────────────────────────────────────────────────
function _startGod1000Cin(god) {
  const p1 = Array.isArray(players) ? players[0] : null;

  // Kill God's HP visually (combat-lock so damage can't keep firing)
  god.health = 0;

  godCinematicScene = {
    type:        'finale',
    god:         god,
    hero:        p1,
    timer:       0,
    phase:       'godDying',
    phaseTimer:  0,

    // godDying
    godFallVx:   0,
    godFallVy:   0,
    godFallX:    god.cx(),
    godFallY:    god.y + god.h * 0.44,
    godAlpha:    1,

    // paradoxMerge
    paradoxX:    -80,
    paradoxY:    p1 ? (p1.y + p1.h * 0.44) : 260,
    mergeAlpha:  0,
    mergeOverlay: 0, // 0→1 half-paradox colour wash over hero

    // blades
    blade1: { x: -200, y: 0, tx: 0, ty: 0, alpha: 0, pinned: false },
    blade2: { x: 1100, y: 0, tx: 0, ty: 0, alpha: 0, pinned: false },
    blade3Glow: 0,   // charging glow above God

    // kernel
    kernelX:   0,
    kernelY:   0,
    kernelVy:  0,
    kernelR:   14,
    kernelAlpha: 0,
    kernelGrabbed: false,

    // dust
    dustAlpha:  0,
    dustParts:  [],

    // Axiom Unbound title
    axiomTitleAlpha: 0,

    // Axiom dialogue
    axiomLines: [
      { speaker: 'AXIOM UNBOUND', text: 'You freed it.', color: '#ff8800' },
      { speaker: 'AXIOM UNBOUND', text: 'The Kernel was mine. Lodged in the System to keep me tethered.', color: '#ff8800' },
      { speaker: 'AXIOM UNBOUND', text: 'You gave it back to me.', color: '#ff4400' },
      { speaker: 'AXIOM UNBOUND', text: 'I am... grateful. And I am done waiting.', color: '#ff2200' },
    ],
    axiomLineIdx:  0,
    axiomLineTimer: 0,
    axiomAlpha:    0,

    // rift
    riftW:      0,
    riftAlpha:  0,
    riftX:      (typeof GAME_W !== 'undefined' ? GAME_W : 900) * 0.72,
    riftY:      (typeof GAME_H !== 'undefined' ? GAME_H : 520) * 0.25,

    // paradox aftermath
    paradoxLines: [
      { speaker: 'PARADOX', text: 'I was wrong.', color: '#aa66ff' },
      { speaker: 'PARADOX', text: 'I thought controlling you was the answer.', color: '#aa66ff' },
      { speaker: 'PARADOX', text: 'He\'s free now. Because of what we did together.', color: '#cc88ff' },
      { speaker: 'PARADOX', text: 'We need to go. Now.', color: '#ffffff' },
    ],
    paradoxLineIdx:  0,
    paradoxLineTimer: 0,
    paradoxAlpha:    0,

    fadeAlpha:  0,
    barH:       0,
  };

  activeCinematic = _makeGodCinSentinel();
  if (typeof isCinematic !== 'undefined') isCinematic = true;
}

// ── End / cleanup ──────────────────────────────────────────────────────────
function _endGodCin() {
  godCinematicScene = null;
  activeCinematic   = null;
  if (typeof isCinematic !== 'undefined') isCinematic = false;
}

// ── Update (called every frame from gameLoop) ──────────────────────────────
function updateGodCinematic() {
  const sc = godCinematicScene;
  if (!sc) return;
  sc.timer++;
  sc.phaseTimer++;

  // Letterbox slide in
  const barTarget = sc.type === 'dialogue' ? 38 : 52;
  sc.barH += (barTarget - sc.barH) * 0.14;

  if (sc.type === 'dialogue') _updateGodDialogue(sc);
  else                        _updateGodFinale(sc);
}

// ── Dialogue update ────────────────────────────────────────────────────────
function _updateGodDialogue(sc) {
  // Fade in on start
  sc.alpha = Math.min(1, sc.alpha + 0.05);

  sc.lineTimer++;
  const line     = _GOD_DIALOGUE[sc.lineIdx];
  const holdTime = line ? (60 + line.text.length * 2.2) : 80;

  if (sc.lineTimer >= holdTime) {
    sc.lineTimer = 0;
    sc.lineIdx++;
    if (sc.lineIdx >= _GOD_DIALOGUE.length) {
      // Done — resume fight
      _endGodCin();
    }
  }
}

// ── Finale update ──────────────────────────────────────────────────────────
function _updateGodFinale(sc) {
  const GW = typeof GAME_W !== 'undefined' ? GAME_W : 900;
  const GH = typeof GAME_H !== 'undefined' ? GAME_H : 520;

  // ── godDying ──────────────────────────────────────────────────────────────
  if (sc.phase === 'godDying') {
    if (sc.phaseTimer === 1) {
      sc.godFallVy = -4;
      sc.godFallVx = (Math.random() < 0.5 ? 1 : -1) * 1.5;
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 10);
    }
    sc.godFallVy += 0.28;
    sc.godFallX  += sc.godFallVx;
    sc.godFallY  += sc.godFallVy;
    sc.godAlpha   = Math.max(0, 1 - sc.phaseTimer / 80);

    if (sc.phaseTimer >= 90) _gfSetPhase(sc, 'paradoxMerge');
  }

  // ── paradoxMerge ──────────────────────────────────────────────────────────
  else if (sc.phase === 'paradoxMerge') {
    const heroX = sc.hero ? sc.hero.cx() : GW * 0.4;
    const heroY = sc.hero ? sc.hero.y + sc.hero.h * 0.44 : GH * 0.5;

    if (sc.phaseTimer < 40) {
      // Paradox streaks in from left
      const progress = sc.phaseTimer / 40;
      sc.paradoxX = -80 + (heroX + 80) * progress;
      sc.paradoxY = heroY;
      sc.mergeAlpha = progress;
    } else {
      // Merge into player
      sc.paradoxX = heroX;
      sc.paradoxY = heroY;
      sc.mergeOverlay = Math.min(0.55, sc.mergeOverlay + 0.025);
      if (sc.phaseTimer === 42) {
        if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 18);
        if (typeof CinFX !== 'undefined') CinFX.flash('#8800ff', 0.4, 10);
      }
    }
    if (sc.phaseTimer >= 80) _gfSetPhase(sc, 'bladePin1');
  }

  // ── bladePin1 ─────────────────────────────────────────────────────────────
  else if (sc.phase === 'bladePin1') {
    const gx = sc.godFallX, gy = sc.godFallY;
    sc.blade1.tx = gx - 40;
    sc.blade1.ty = gy - 10;
    if (sc.phaseTimer < 20) {
      sc.blade1.x     = -200;
      sc.blade1.y     = gy - 10;
      sc.blade1.alpha = sc.phaseTimer / 20;
    } else {
      const t = Math.min(1, (sc.phaseTimer - 20) / 12);
      sc.blade1.x = -200 + (sc.blade1.tx + 200) * _easeOut(t);
      sc.blade1.y = sc.blade1.ty;
      if (t >= 1 && !sc.blade1.pinned) {
        sc.blade1.pinned = true;
        if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 12);
        if (typeof CinFX !== 'undefined') CinFX.flash('#ffffff', 0.3, 8);
      }
    }
    if (sc.phaseTimer >= 55) _gfSetPhase(sc, 'bladePin2');
  }

  // ── bladePin2 ─────────────────────────────────────────────────────────────
  else if (sc.phase === 'bladePin2') {
    const gx = sc.godFallX, gy = sc.godFallY;
    sc.blade2.tx = gx + 40;
    sc.blade2.ty = gy - 10;
    if (sc.phaseTimer < 20) {
      sc.blade2.x     = GW + 200;
      sc.blade2.y     = gy - 10;
      sc.blade2.alpha = sc.phaseTimer / 20;
    } else {
      const t = Math.min(1, (sc.phaseTimer - 20) / 12);
      sc.blade2.x = GW + 200 - (GW + 200 - sc.blade2.tx) * _easeOut(t);
      sc.blade2.y = sc.blade2.ty;
      if (t >= 1 && !sc.blade2.pinned) {
        sc.blade2.pinned = true;
        if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 12);
        if (typeof CinFX !== 'undefined') CinFX.flash('#ffffff', 0.3, 8);
      }
    }
    if (sc.phaseTimer >= 55) _gfSetPhase(sc, 'bladeForming');
  }

  // ── bladeForming ──────────────────────────────────────────────────────────
  else if (sc.phase === 'bladeForming') {
    sc.blade3Glow = Math.min(1, sc.phaseTimer / 50);
    if (sc.phaseTimer >= 70) _gfSetPhase(sc, 'kernelEject');
  }

  // ── kernelEject ───────────────────────────────────────────────────────────
  else if (sc.phase === 'kernelEject') {
    if (sc.phaseTimer === 1) {
      sc.kernelX     = sc.godFallX;
      sc.kernelY     = sc.godFallY - 20;
      sc.kernelVy    = -8;
      sc.kernelAlpha = 1;
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 22);
      if (typeof CinFX !== 'undefined') CinFX.flash('#ffcc00', 0.55, 14);
    }
    sc.kernelVy  += 0.3;
    sc.kernelY   += sc.kernelVy;
    sc.kernelR    = 14 + Math.sin(sc.phaseTimer * 0.2) * 3;
    if (sc.phaseTimer >= 60) _gfSetPhase(sc, 'kernelSlam');
  }

  // ── kernelSlam ────────────────────────────────────────────────────────────
  else if (sc.phase === 'kernelSlam') {
    const heroX = sc.hero ? sc.hero.cx() : GW * 0.4;
    if (sc.phaseTimer < 30) {
      // Kernel floats to hero
      sc.kernelX += (heroX - sc.kernelX) * 0.12;
      sc.kernelY += (sc.godFallY - 60 - sc.kernelY) * 0.08;
    } else {
      // Slam toward God
      sc.kernelGrabbed = true;
      const t = Math.min(1, (sc.phaseTimer - 30) / 18);
      sc.kernelX = heroX + (sc.godFallX - heroX) * _easeOut(t);
      sc.kernelY = (sc.godFallY - 60) + (sc.godFallY - (sc.godFallY - 60)) * _easeOut(t);
      if (t >= 1 && !sc._kernelHit) {
        sc._kernelHit = true;
        if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 30);
        if (typeof CinFX !== 'undefined') CinFX.flash('#ffcc00', 0.7, 16);
      }
    }
    if (sc.phaseTimer >= 60) _gfSetPhase(sc, 'dustCloud');
  }

  // ── dustCloud ─────────────────────────────────────────────────────────────
  else if (sc.phase === 'dustCloud') {
    if (sc.phaseTimer === 1) {
      sc.dustAlpha = 1;
      for (let i = 0; i < 22; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd   = 3 + Math.random() * 7;
        sc.dustParts.push({
          x: sc.godFallX, y: sc.godFallY,
          vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd - 2,
          r: 6 + Math.random() * 10,
          life: 1, decay: 0.025 + Math.random() * 0.02,
        });
      }
    }
    sc.dustAlpha = Math.max(0, 1 - sc.phaseTimer / 55);
    for (const d of sc.dustParts) {
      d.x += d.vx; d.y += d.vy;
      d.vx *= 0.92; d.vy *= 0.92;
      d.life = Math.max(0, d.life - d.decay);
    }
    if (sc.phaseTimer >= 65) _gfSetPhase(sc, 'axiomReveal');
  }

  // ── axiomReveal ───────────────────────────────────────────────────────────
  else if (sc.phase === 'axiomReveal') {
    sc.axiomTitleAlpha = sc.phaseTimer < 20  ? sc.phaseTimer / 20
                       : sc.phaseTimer < 80  ? 1
                       : Math.max(0, 1 - (sc.phaseTimer - 80) / 25);
    if (sc.phaseTimer >= 110) _gfSetPhase(sc, 'axiomSpeaks');
  }

  // ── axiomSpeaks ───────────────────────────────────────────────────────────
  else if (sc.phase === 'axiomSpeaks') {
    sc.axiomAlpha = Math.min(1, sc.axiomAlpha + 0.05);
    sc.axiomLineTimer++;
    const line     = sc.axiomLines[sc.axiomLineIdx];
    const holdTime = line ? 55 + line.text.length * 2 : 70;
    if (sc.axiomLineTimer >= holdTime) {
      sc.axiomLineTimer = 0;
      sc.axiomLineIdx++;
      if (sc.axiomLineIdx >= sc.axiomLines.length) {
        sc.axiomAlpha = 0;
        _gfSetPhase(sc, 'riftOpen');
      }
    }
  }

  // ── riftOpen ──────────────────────────────────────────────────────────────
  else if (sc.phase === 'riftOpen') {
    sc.riftW     = Math.min(180, sc.riftW + 6);
    sc.riftAlpha = Math.min(1, sc.riftAlpha + 0.055);
    if (sc.phaseTimer === 20) {
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 16);
    }
    if (sc.phaseTimer >= 55) _gfSetPhase(sc, 'axiomEscapes');
  }

  // ── axiomEscapes ──────────────────────────────────────────────────────────
  else if (sc.phase === 'axiomEscapes') {
    // Draw Axiom silhouette walking toward rift
    if (!sc._axiomWalkX) sc._axiomWalkX = sc.hero ? sc.hero.cx() + 140 : GW * 0.6;
    if (!sc._axiomWalkY) sc._axiomWalkY = sc.riftY + 40;
    sc._axiomWalkX += (sc.riftX - sc._axiomWalkX) * 0.06;
    sc._axiomWalkY += (sc.riftY  - sc._axiomWalkY) * 0.04;

    // Shrink as he passes into rift
    sc._axiomScale = Math.max(0, 1 - sc.phaseTimer / 60);
    if (sc.phaseTimer >= 75) _gfSetPhase(sc, 'paradoxAfter');
  }

  // ── paradoxAfter ──────────────────────────────────────────────────────────
  else if (sc.phase === 'paradoxAfter') {
    sc.paradoxAlpha  = Math.min(1, sc.paradoxAlpha + 0.05);
    sc.paradoxLineTimer++;
    const line     = sc.paradoxLines[sc.paradoxLineIdx];
    const holdTime = line ? 60 + line.text.length * 2 : 75;
    if (sc.paradoxLineTimer >= holdTime) {
      sc.paradoxLineTimer = 0;
      sc.paradoxLineIdx++;
      if (sc.paradoxLineIdx >= sc.paradoxLines.length) {
        sc.paradoxAlpha = 0;
        _gfSetPhase(sc, 'fadeToGame');
      }
    }
  }

  // ── fadeToGame ────────────────────────────────────────────────────────────
  else if (sc.phase === 'fadeToGame') {
    sc.fadeAlpha = Math.min(1, sc.fadeAlpha + 0.03);
    if (sc.fadeAlpha >= 1) {
      _endGodCin();
      // Trigger God death achievement
      if (typeof _onGodDefeated === 'function') _onGodDefeated();
      // Remove the god from minions so normal defeat logic fires
      if (Array.isArray(minions)) {
        const idx = minions.findIndex(m => m === sc.god);
        if (idx !== -1) minions.splice(idx, 1);
      }
    }
  }
}

function _gfSetPhase(sc, name) {
  sc.phase      = name;
  sc.phaseTimer = 0;
}

function _easeOut(t) {
  return 1 - Math.pow(1 - t, 2);
}

// ── Draw (called every frame from gameLoop) ────────────────────────────────
function drawGodCinematic() {
  const sc = godCinematicScene;
  if (!sc) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const cw = canvas.width, ch = canvas.height;
  const scX = cw / (typeof GAME_W !== 'undefined' ? GAME_W : 900);
  const scY = ch / (typeof GAME_H !== 'undefined' ? GAME_H : 520);
  const sc_ = Math.min(scX, scY);

  if (sc.type === 'dialogue') {
    _drawGodDialogue(sc, cw, ch, scX, scY, sc_);
  } else {
    _drawGodFinale(sc, cw, ch, scX, scY, sc_);
  }

  ctx.restore();
}

// ── Draw: dialogue cinematic ───────────────────────────────────────────────
function _drawGodDialogue(sc, cw, ch, scX, scY, sc_) {
  // Letterbox bars
  _drawLetterbox(sc.barH * scY, cw, ch, 0.62);

  const line = _GOD_DIALOGUE[sc.lineIdx];
  if (!line || sc.alpha <= 0) return;

  const isGod      = line.speaker === 'GOD';
  const speakerCol = isGod ? '#e0ccff' : '#aaddff';
  const boxW       = 420 * sc_;
  const boxH       = 64  * sc_;
  const boxX       = isGod ? cw - boxW - 24 * sc_ : 24 * sc_;
  const boxY       = ch - sc.barH * scY - boxH - 14 * sc_;

  ctx.globalAlpha  = sc.alpha;

  // Box background
  ctx.fillStyle   = 'rgba(0,0,0,0.82)';
  ctx.strokeStyle = speakerCol;
  ctx.lineWidth   = 1.8;
  _roundRect(ctx, boxX, boxY, boxW, boxH, 10 * sc_);
  ctx.fill(); ctx.stroke();

  // Speaker label
  ctx.font      = `bold ${Math.round(10 * sc_)}px monospace`;
  ctx.fillStyle = speakerCol;
  ctx.textAlign = isGod ? 'right' : 'left';
  ctx.fillText(line.speaker, isGod ? boxX + boxW - 12 * sc_ : boxX + 12 * sc_, boxY + 16 * sc_);

  // Text
  ctx.font      = `${Math.round(12 * sc_)}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(line.text, boxX + boxW / 2, boxY + boxH * 0.66);
}

// ── Draw: finale cinematic ─────────────────────────────────────────────────
function _drawGodFinale(sc, cw, ch, scX, scY, sc_) {
  // Letterbox bars
  _drawLetterbox(sc.barH * scY, cw, ch, 0.72);

  // ── godDying: falling God stickman ────────────────────────────────────────
  if (['godDying','bladePin1','bladePin2','bladeForming','kernelEject','kernelSlam','dustCloud'].includes(sc.phase) || sc.godAlpha > 0.05) {
    if (sc.godAlpha > 0.02) _drawGodStickman(sc.godFallX * scX, sc.godFallY * scY, sc.godAlpha, sc_, true);
  }

  // ── paradoxMerge: paradox streak + hero merge overlay ─────────────────────
  if (sc.phase === 'paradoxMerge' || sc.mergeOverlay > 0) {
    if (sc.mergeAlpha > 0) {
      ctx.globalAlpha = sc.mergeAlpha * 0.85;
      _drawParadoxSilhouette(sc.paradoxX * scX, sc.paradoxY * scY, sc_, '#aa44ff');
    }
    if (sc.mergeOverlay > 0 && sc.hero) {
      const hsx = sc.hero.cx() * scX, hsy = sc.hero.cy() * scY;
      ctx.globalAlpha = sc.mergeOverlay;
      const grd = ctx.createRadialGradient(hsx, hsy, 0, hsx, hsy, 55 * sc_);
      grd.addColorStop(0,   'rgba(130,0,255,0.7)');
      grd.addColorStop(0.5, 'rgba(80,0,160,0.35)');
      grd.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(hsx, hsy, 55 * sc_, 0, Math.PI * 2); ctx.fill();
      // Half-paradox body tint on hero
      ctx.globalAlpha = sc.mergeOverlay * 0.45;
      ctx.fillStyle   = '#8800ff';
      ctx.fillRect(hsx, hsy - 28 * sc_, 22 * sc_, 56 * sc_);
    }
  }

  // ── phantom blades ────────────────────────────────────────────────────────
  _drawPhantomBlade(sc.blade1, scX, scY, sc_, -1);
  _drawPhantomBlade(sc.blade2, scX, scY, sc_,  1);

  // Blade 3 forming glow above God
  if (sc.blade3Glow > 0) {
    const bx = sc.godFallX * scX, by = (sc.godFallY - 80) * scY;
    ctx.globalAlpha = sc.blade3Glow * 0.9;
    const grd = ctx.createRadialGradient(bx, by, 0, bx, by, 30 * sc_);
    grd.addColorStop(0,   'rgba(180,220,255,0.95)');
    grd.addColorStop(0.5, 'rgba(80,120,255,0.5)');
    grd.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(bx, by, 30 * sc_, 0, Math.PI * 2); ctx.fill();
    // Blade shape forming
    ctx.globalAlpha = sc.blade3Glow;
    ctx.strokeStyle = '#c8e8ff';
    ctx.lineWidth   = 3 * sc_;
    ctx.shadowColor = '#88aaff'; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(bx - 4 * sc_, by - 22 * sc_);
    ctx.lineTo(bx, by + 22 * sc_);
    ctx.lineTo(bx + 4 * sc_, by - 22 * sc_);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── Kernel ────────────────────────────────────────────────────────────────
  if (sc.kernelAlpha > 0) {
    const kx = sc.kernelX * scX, ky = sc.kernelY * scY;
    const kr = sc.kernelR * sc_;
    ctx.globalAlpha = sc.kernelAlpha;
    // Glow
    const grd = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr * 2.5);
    grd.addColorStop(0,   'rgba(255,210,50,0.95)');
    grd.addColorStop(0.5, 'rgba(255,140,0,0.5)');
    grd.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(kx, ky, kr * 2.5, 0, Math.PI * 2); ctx.fill();
    // Core
    ctx.fillStyle   = '#fff8c0';
    ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(kx, ky, kr, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur  = 0;
    // "THE KERNEL" label
    if (!sc.kernelGrabbed) {
      ctx.font      = `bold ${Math.round(9 * sc_)}px monospace`;
      ctx.fillStyle = '#ffeeaa';
      ctx.textAlign = 'center';
      ctx.fillText('THE KERNEL', kx, ky - kr * 2.2 - 4 * sc_);
    }
  }

  // ── dust cloud ────────────────────────────────────────────────────────────
  if (sc.dustAlpha > 0) {
    for (const d of sc.dustParts) {
      ctx.globalAlpha = d.life * sc.dustAlpha * 0.7;
      ctx.fillStyle   = '#e8e8d0';
      ctx.beginPath(); ctx.arc(d.x * scX, d.y * scY, d.r * sc_, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── Axiom Unbound title ───────────────────────────────────────────────────
  if (sc.axiomTitleAlpha > 0) {
    ctx.globalAlpha = sc.axiomTitleAlpha;
    ctx.fillStyle   = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, ch * 0.32, cw, ch * 0.26);

    ctx.font        = `bold ${Math.round(ch * 0.052)}px serif`;
    ctx.textAlign   = 'center';
    ctx.fillStyle   = '#ff6600';
    ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 40;
    ctx.fillText('AXIOM UNBOUND', cw / 2, ch * 0.47);
    ctx.shadowBlur  = 0;

    ctx.font      = `${Math.round(ch * 0.022)}px sans-serif`;
    ctx.fillStyle = 'rgba(255,160,60,0.75)';
    ctx.fillText('The Architect, Unchained', cw / 2, ch * 0.51);
  }

  // ── Axiom dialogue ────────────────────────────────────────────────────────
  if (sc.phase === 'axiomSpeaks' && sc.axiomAlpha > 0 && sc.axiomLineIdx < sc.axiomLines.length) {
    const line = sc.axiomLines[sc.axiomLineIdx];
    _drawSpeakerBox(line.text, line.speaker, line.color, sc.axiomAlpha, false, cw, ch, sc_);
  }

  // ── Rift ──────────────────────────────────────────────────────────────────
  if (sc.riftAlpha > 0 && sc.riftW > 0) {
    const rx = sc.riftX * scX, ry = sc.riftY * scY;
    const rw = sc.riftW * scX, rh = 140 * scY;

    ctx.globalAlpha = sc.riftAlpha;
    // Outer glow
    const grd = ctx.createRadialGradient(rx, ry, 0, rx, ry, rw);
    grd.addColorStop(0,   'rgba(255,80,0,0.85)');
    grd.addColorStop(0.45,'rgba(180,20,0,0.5)');
    grd.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.ellipse(rx, ry, rw, rh, 0, 0, Math.PI * 2); ctx.fill();

    // Tear interior
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.ellipse(rx, ry, rw * 0.45, rh * 0.7, 0, 0, Math.PI * 2); ctx.fill();

    // Jagged edge lines
    ctx.strokeStyle = '#ff5500';
    ctx.lineWidth   = 2.5 * sc_;
    ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 12;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + sc.timer * 0.04;
      const r1    = rw * 0.48, r2 = rw * 0.65;
      ctx.beginPath();
      ctx.moveTo(rx + Math.cos(angle) * r1, ry + Math.sin(angle) * r1 * 0.6);
      ctx.lineTo(rx + Math.cos(angle + 0.2) * r2, ry + Math.sin(angle + 0.2) * r2 * 0.6);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // ── Axiom walking into rift ───────────────────────────────────────────────
  if (sc.phase === 'axiomEscapes' && sc._axiomWalkX && sc._axiomScale > 0) {
    const ax = sc._axiomWalkX * scX;
    const ay = sc._axiomWalkY * scY;
    const s  = (16 * sc_) * sc._axiomScale;
    ctx.globalAlpha = sc._axiomScale;
    ctx.strokeStyle = '#ff8800';
    ctx.fillStyle   = '#220000';
    ctx.lineWidth   = 2 * sc_ * sc._axiomScale;
    ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(ax, ay - s * 1.4); ctx.lineTo(ax, ay + s * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(ax, ay - s * 1.9, s * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax - s * 0.7, ay - s * 0.5); ctx.lineTo(ax + s * 0.7, ay - s * 0.5); ctx.stroke();
    ctx.beginPath();
    const walkLeg = Math.sin(sc.phaseTimer * 0.35) * 0.5;
    ctx.moveTo(ax, ay + s * 0.3); ctx.lineTo(ax - s * 0.5, ay + s * 1.4 + walkLeg * s);
    ctx.moveTo(ax, ay + s * 0.3); ctx.lineTo(ax + s * 0.5, ay + s * 1.4 - walkLeg * s);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── Paradox aftermath dialogue ────────────────────────────────────────────
  if (sc.phase === 'paradoxAfter' && sc.paradoxAlpha > 0 && sc.paradoxLineIdx < sc.paradoxLines.length) {
    const line = sc.paradoxLines[sc.paradoxLineIdx];
    _drawSpeakerBox(line.text, line.speaker, line.color, sc.paradoxAlpha, true, cw, ch, sc_);
  }

  // ── Fade to black ─────────────────────────────────────────────────────────
  if (sc.fadeAlpha > 0) {
    ctx.globalAlpha = sc.fadeAlpha;
    ctx.fillStyle   = '#000000';
    ctx.fillRect(0, 0, cw, ch);
  }
}

// ── Drawing helpers ────────────────────────────────────────────────────────
function _drawLetterbox(barH, cw, ch, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = '#000000';
  ctx.fillRect(0, 0, cw, barH);
  ctx.fillRect(0, ch - barH, cw, barH);
  ctx.globalAlpha = 1;
}

function _drawGodStickman(sx, sy, alpha, sc_, pinned) {
  ctx.globalAlpha = alpha;
  const tilt = pinned ? 0.4 : 0;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(tilt);
  const s = 18 * sc_;
  ctx.strokeStyle = '#e0ccff';
  ctx.lineWidth   = 2.5 * sc_;
  ctx.shadowColor = '#aa88ff'; ctx.shadowBlur = 14;
  // Body
  ctx.beginPath(); ctx.moveTo(0, -s * 1.4); ctx.lineTo(0, s * 0.3); ctx.stroke();
  // Head
  ctx.beginPath(); ctx.arc(0, -s * 1.9, s * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = '#e0ccff'; ctx.fill(); ctx.stroke();
  // Arms (pinned — spread)
  ctx.beginPath(); ctx.moveTo(-s * 1.1, -s * 0.5); ctx.lineTo(s * 1.1, -s * 0.5); ctx.stroke();
  // Legs
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3); ctx.lineTo(-s * 0.6, s * 1.4);
  ctx.moveTo(0, s * 0.3); ctx.lineTo( s * 0.6, s * 1.4);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function _drawParadoxSilhouette(sx, sy, sc_, color) {
  const s = 16 * sc_;
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = 2 * sc_;
  ctx.shadowColor = color; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(sx, sy - s * 1.4); ctx.lineTo(sx, sy + s * 0.3); ctx.stroke();
  ctx.beginPath(); ctx.arc(sx, sy - s * 1.9, s * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(sx - s * 0.8, sy - s * 0.5); ctx.lineTo(sx + s * 0.8, sy - s * 0.5); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(sx, sy + s * 0.3); ctx.lineTo(sx - s * 0.6, sy + s * 1.4);
  ctx.moveTo(sx, sy + s * 0.3); ctx.lineTo(sx + s * 0.6, sy + s * 1.4);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function _drawPhantomBlade(blade, scX, scY, sc_, dir) {
  if (!blade || blade.alpha <= 0) return;
  const bx = blade.x * scX, by = blade.y * scY;
  ctx.globalAlpha = blade.alpha;
  ctx.strokeStyle = '#c8e8ff';
  ctx.lineWidth   = 3.5 * sc_;
  ctx.shadowColor = '#88aaff'; ctx.shadowBlur = 18;
  // Blade shape: narrow diamond
  const blen = 40 * sc_, bwid = 5 * sc_;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(dir > 0 ? -0.25 : 0.25);
  ctx.beginPath();
  ctx.moveTo(-bwid, 0);
  ctx.lineTo(0, -blen);
  ctx.lineTo(bwid, 0);
  ctx.lineTo(0, blen * 0.25);
  ctx.closePath();
  ctx.fillStyle = 'rgba(180,220,255,0.7)';
  ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.shadowBlur = 0;
}

function _drawSpeakerBox(text, speaker, speakerColor, alpha, isLeft, cw, ch, sc_) {
  const boxW = 420 * sc_;
  const boxH = 64  * sc_;
  const boxX = isLeft ? 24 * sc_ : cw - boxW - 24 * sc_;
  const boxY = ch * 0.72;

  ctx.globalAlpha  = alpha;
  ctx.fillStyle   = 'rgba(0,0,0,0.84)';
  ctx.strokeStyle = speakerColor || '#ffffff';
  ctx.lineWidth   = 1.8;
  _roundRect(ctx, boxX, boxY, boxW, boxH, 10 * sc_);
  ctx.fill(); ctx.stroke();

  ctx.font      = `bold ${Math.round(10 * sc_)}px monospace`;
  ctx.fillStyle = speakerColor || '#ffffff';
  ctx.textAlign = isLeft ? 'left' : 'right';
  ctx.fillText(speaker, isLeft ? boxX + 12 * sc_ : boxX + boxW - 12 * sc_, boxY + 16 * sc_);

  ctx.font      = `${Math.round(12 * sc_)}px sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(text, boxX + boxW / 2, boxY + boxH * 0.7);
}
