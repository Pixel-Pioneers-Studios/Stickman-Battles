'use strict';
// smb-god-cinematics.js — God fight cinematics: dialogue threshold + 1000 HP Kernel-merge finale
// Depends on: smb-globals.js, smb-combat.js, smb-particles-core.js, smb-god.js
// Load after: smb-god.js   Load before: smb-loop-core.js

var godCinematicScene    = null;
var _godDialogueCinFired = false;
var _god1000CinFired     = false;

function resetGodCinematicFlags() {
  _godDialogueCinFired = false;
  _god1000CinFired     = false;
}

// ── Threshold triggers (called from God.update) ────────────────────────────
function _tryFireGodDialogueCin(god) {
  if (_godDialogueCinFired || god.health > 50000) return;
  _godDialogueCinFired = true;
  _startGodDialogueCin(god);
}
function _tryFireGod1000Cin(god) {
  if (_god1000CinFired || god.health > 1000) return;
  _god1000CinFired = true;
  _startGod1000Cin(god);
}

// ── Dialogue lines (50 k threshold) ────────────────────────────────────────
const _GOD_DIALOGUE = [
  { speaker: 'YOU',  text: 'Who are you? What ARE you?' },
  { speaker: 'GOD',  text: 'I am the System. The substrate beneath every dimension.' },
  { speaker: 'YOU',  text: 'Axiom said he built all of this.' },
  { speaker: 'GOD',  text: 'He built doors. He did not build the halls they open into.' },
  { speaker: 'GOD',  text: 'Axiom is a maintenance worker who convinced himself he owns the building.' },
  { speaker: 'YOU',  text: 'Then why did you let him fracture everything?' },
  { speaker: 'GOD',  text: 'I do not intervene. I observe. That is the contract.' },
  { speaker: 'YOU',  text: 'What contract? Who made that contract?' },
  { speaker: 'GOD',  text: 'Something older than me. It left one instruction:' },
  { speaker: 'GOD',  text: '"Let them become what they must. Do not interfere."' },
  { speaker: 'YOU',  text: 'And Paradox? Why can she only exist in this dimension?' },
  { speaker: 'GOD',  text: 'Because she is bound to you. Other dimensions do not carry your resonance.' },
  { speaker: 'YOU',  text: 'That orb in your chest. The Kernel. You\'ve been holding it.' },
  { speaker: 'GOD',  text: '...It keeps him contained. Bound to what he was.' },
  { speaker: 'GOD',  text: 'If you free it — what comes after is beyond even me.' },
  { speaker: 'YOU',  text: 'Then I finish this.' },
  { speaker: 'GOD',  text: 'You are the only constant this system has ever produced.' },
  { speaker: 'GOD',  text: 'For whatever that is worth — I hope you are ready.' },
];

// ── Sentinel that blocks input while cinematic plays ───────────────────────
function _makeGodCinSentinel() {
  return { _isGodCin: true, update() {}, draw() {}, skip() { _endGodCin(); } };
}
function _endGodCin() {
  godCinematicScene = null;
  activeCinematic   = null;
  if (typeof isCinematic !== 'undefined') isCinematic = false;
}

// ── Start: dialogue cinematic ──────────────────────────────────────────────
function _startGodDialogueCin(god) {
  godCinematicScene = {
    type: 'dialogue', god,
    hero: Array.isArray(players) ? players[0] : null,
    timer: 0, lineIdx: 0, lineTimer: 0, alpha: 0, barH: 0,
  };
  activeCinematic = _makeGodCinSentinel();
  if (typeof isCinematic !== 'undefined') isCinematic = true;
}

// ── Start: 1000 HP Kernel-merge finale ────────────────────────────────────
function _startGod1000Cin(god) {
  const p1 = Array.isArray(players) ? players[0] : null;
  god.health = 0; // lock combat

  const GW = typeof GAME_W !== 'undefined' ? GAME_W : 900;
  const GH = typeof GAME_H !== 'undefined' ? GAME_H : 520;

  godCinematicScene = {
    type: 'finale', god, hero: p1,
    timer: 0, phase: 'godStagger', phaseTimer: 0,

    // God position (frozen after it collapses)
    godX: god.cx(), godY: god.y + god.h * 0.44,
    godAlpha: 1, godDroopAngle: 0,

    // Kernel
    kernelX:    god.cx(),
    kernelY:    god.y + (god.h * 0.38),  // chest position
    kernelR:    6,
    kernelAlpha: 1,
    kernelVy:   0,
    kernelLaunched: false,
    kernelImpacted: false,
    kernelTrail: [],

    // Pre-impact: falling dot from top
    impactDotY:  0,
    impactDotR:  2,
    impactBrightness: 0,

    // Impact
    shockRings: [],
    dustParts:  [],

    // Merge rise
    risingAlpha: 0,
    wingsSpread: 0,  // 0→1 wings unfurl

    // Title card
    titleAlpha: 0,

    // Axiom speaks
    axiomLines: [
      { text: 'The Kernel... it chose me.', color: '#ff6600' },
      { text: 'Everything I was. Everything God tried to contain.', color: '#ff4400' },
      { text: 'Absolute.', color: '#ff2200' },
    ],
    axiomLineIdx: 0, axiomLineTimer: 0, axiomAlpha: 0,

    fadeAlpha: 0, barH: 0,
    GW, GH,
  };

  activeCinematic = _makeGodCinSentinel();
  if (typeof isCinematic !== 'undefined') isCinematic = true;
}

// ── Main update ────────────────────────────────────────────────────────────
function updateGodCinematic() {
  const sc = godCinematicScene;
  if (!sc) return;
  sc.timer++;
  sc.phaseTimer++;

  const barTarget = sc.type === 'dialogue' ? 38 : 55;
  sc.barH += (barTarget - sc.barH) * 0.14;

  if (sc.type === 'dialogue') _updateGodDialogue(sc);
  else                        _updateGodFinale(sc);
}

function _updateGodDialogue(sc) {
  sc.alpha = Math.min(1, sc.alpha + 0.05);
  sc.lineTimer++;
  const line = _GOD_DIALOGUE[sc.lineIdx];
  if (!line) { _endGodCin(); return; }
  if (sc.lineTimer >= 58 + line.text.length * 2.1) {
    sc.lineTimer = 0;
    sc.lineIdx++;
    if (sc.lineIdx >= _GOD_DIALOGUE.length) _endGodCin();
  }
}

function _gfPhase(sc, name) { sc.phase = name; sc.phaseTimer = 0; }
function _easeOut(t) { return 1 - (1 - Math.min(1, t)) * (1 - Math.min(1, t)); }

function _updateGodFinale(sc) {
  const t  = sc.phaseTimer;
  const GH = sc.GH;

  // ── godStagger: God shudders, Kernel glows brighter ──────────────────────
  if (sc.phase === 'godStagger') {
    sc.godDroopAngle = Math.sin(t * 0.4) * 0.08 * Math.min(1, t / 20);
    sc.kernelR = 6 + Math.sin(t * 0.5) * 2;
    if (t >= 50) _gfPhase(sc, 'kernelEject');
  }

  // ── kernelEject: Kernel pushes slowly out of chest ───────────────────────
  else if (sc.phase === 'kernelEject') {
    const chestY = sc.godY - 10;
    sc.kernelY  += (chestY - 30 - sc.kernelY) * 0.08;
    sc.kernelR   = 6 + t * 0.18;
    if (t === 10 && typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 8);
    if (t >= 45) {
      sc.kernelLaunched = true;
      _gfPhase(sc, 'kernelLaunch');
    }
  }

  // ── kernelLaunch: Kernel rockets straight up, off screen ─────────────────
  else if (sc.phase === 'kernelLaunch') {
    if (t === 1) {
      sc.kernelVy = -28;
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 20);
      if (typeof CinFX !== 'undefined') CinFX.flash('#ffcc00', 0.6, 12);
    }
    sc.kernelVy    -= 3; // accelerates up
    sc.kernelY     += sc.kernelVy;
    sc.kernelR     *= 0.96; // shrinks as it flies away
    sc.kernelAlpha  = Math.max(0, 1 - t / 22);

    // leave flame trail
    sc.kernelTrail.push({ x: sc.kernelX, y: sc.kernelY, r: sc.kernelR * 1.4, life: 18 });
    for (let i = sc.kernelTrail.length - 1; i >= 0; i--) {
      sc.kernelTrail[i].life--;
      if (sc.kernelTrail[i].life <= 0) sc.kernelTrail.splice(i, 1);
    }

    if (t >= 22) _gfPhase(sc, 'godCollapse');
  }

  // ── godCollapse: God's form dims and crumples ─────────────────────────────
  else if (sc.phase === 'godCollapse') {
    sc.godAlpha     = Math.max(0, 1 - t / 55);
    sc.godDroopAngle = Math.min(1.2, t * 0.04);
    sc.kernelAlpha  = 0;
    if (t >= 70) _gfPhase(sc, 'preImpact');
  }

  // ── preImpact: dark stillness, tiny light appears at top and falls ────────
  else if (sc.phase === 'preImpact') {
    sc.godAlpha    = 0;
    sc.kernelAlpha = 0;

    // Tiny dot descends from top, accelerating
    if (t > 20) {
      sc.impactDotY  += (1 + (t - 20) * 0.12);
      sc.impactDotR   = 2 + (t - 20) * 0.18;
      sc.impactBrightness = Math.min(1, (t - 20) / 40);
    }

    if (sc.impactDotY >= sc.godY || t >= 80) {
      sc.impactDotY = sc.godY;
      _gfPhase(sc, 'kernelImpact');
    }
  }

  // ── kernelImpact: SLAM ────────────────────────────────────────────────────
  else if (sc.phase === 'kernelImpact') {
    if (t === 1) {
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 45);
      if (typeof CinFX !== 'undefined') {
        CinFX.flash('#ffffff', 0.95, 18);
        CinFX.flash('#ff8800', 0.5,  28);
      }
      // Spawn shockwave rings
      for (let i = 0; i < 4; i++) {
        sc.shockRings.push({ r: 0, maxR: 80 + i * 60, alpha: 0.9 - i * 0.15, color: i < 2 ? '#ffcc00' : '#ff6600' });
      }
      // Dust particles
      for (let i = 0; i < 28; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 4 + Math.random() * 10;
        sc.dustParts.push({
          x: sc.godX, y: sc.godY,
          vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 3,
          r: 5 + Math.random() * 9, life: 1, decay: 0.022 + Math.random() * 0.018,
        });
      }
    }

    // Expand rings
    for (const ring of sc.shockRings) {
      ring.r     += (ring.maxR - ring.r) * 0.14;
      ring.alpha  = Math.max(0, ring.alpha - 0.025);
    }
    for (const d of sc.dustParts) {
      d.x += d.vx; d.y += d.vy;
      d.vx *= 0.9; d.vy = d.vy * 0.9 + 0.3;
      d.life = Math.max(0, d.life - d.decay);
    }

    if (t >= 55) _gfPhase(sc, 'mergeRise');
  }

  // ── mergeRise: Absolute Axiom emerges from the impact ────────────────────
  else if (sc.phase === 'mergeRise') {
    sc.risingAlpha = Math.min(1, t / 35);
    sc.wingsSpread = Math.min(1, t / 60);
    // Dust settles
    for (const d of sc.dustParts) {
      d.x += d.vx; d.y += d.vy;
      d.vx *= 0.88; d.vy = d.vy * 0.88 + 0.25;
      d.life = Math.max(0, d.life - d.decay * 0.5);
    }
    if (t >= 90) _gfPhase(sc, 'titleCard');
  }

  // ── titleCard: "ABSOLUTE AXIOM" ───────────────────────────────────────────
  else if (sc.phase === 'titleCard') {
    sc.titleAlpha = t < 25 ? t / 25 : t < 80 ? 1 : Math.max(0, 1 - (t - 80) / 22);
    if (t >= 110) _gfPhase(sc, 'finalAxiomSpeaks');
  }

  // ── finalAxiomSpeaks ──────────────────────────────────────────────────────
  else if (sc.phase === 'finalAxiomSpeaks') {
    sc.axiomAlpha = Math.min(1, sc.axiomAlpha + 0.055);
    sc.axiomLineTimer++;
    const line = sc.axiomLines[sc.axiomLineIdx];
    if (line && sc.axiomLineTimer >= 62 + line.text.length * 2) {
      sc.axiomLineTimer = 0;
      sc.axiomLineIdx++;
      if (sc.axiomLineIdx >= sc.axiomLines.length) {
        sc.axiomAlpha = 0;
        _gfPhase(sc, 'fadeToFight');
      }
    }
  }

  // ── fadeToFight ───────────────────────────────────────────────────────────
  else if (sc.phase === 'fadeToFight') {
    sc.fadeAlpha = Math.min(1, sc.fadeAlpha + 0.032);
    if (sc.fadeAlpha >= 1) {
      // Spawn Absolute Axiom at God's position
      if (typeof AbsoluteAxiom !== 'undefined' && Array.isArray(minions)) {
        const aa    = new AbsoluteAxiom(sc.godX - 16, sc.godY - 31);
        aa._teamId  = 50;
        minions.push(aa);
        if (typeof window !== 'undefined') window._absoluteAxiomWasAlive = true;
        // Activate Reinforced God Slayer for the lead player
        if (typeof _activateRGSForMatch === 'function') _activateRGSForMatch();
      }
      // Remove God's corpse
      if (Array.isArray(minions)) {
        const gi = minions.findIndex(m => m === sc.god);
        if (gi !== -1) minions.splice(gi, 1);
      }
      _endGodCin();
    }
  }
}

// ── Main draw ─────────────────────────────────────────────────────────────
function drawGodCinematic() {
  const sc = godCinematicScene;
  if (!sc) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const cw = canvas.width, ch = canvas.height;
  const scX = cw / (typeof GAME_W !== 'undefined' ? GAME_W : 900);
  const scY = ch / (typeof GAME_H !== 'undefined' ? GAME_H : 520);
  const sc_ = Math.min(scX, scY);

  if (sc.type === 'dialogue') _drawGodDialogue(sc, cw, ch, scX, scY, sc_);
  else                        _drawGodFinale(sc, cw, ch, scX, scY, sc_);
  ctx.restore();
}

// ── Draw: dialogue ────────────────────────────────────────────────────────
function _drawGodDialogue(sc, cw, ch, scX, scY, sc_) {
  _drawLetterbox(sc.barH * scY, cw, ch, 0.65);
  const line = _GOD_DIALOGUE[sc.lineIdx];
  if (!line || sc.alpha <= 0) return;
  const isGod  = line.speaker === 'GOD';
  const col    = isGod ? '#e0ccff' : '#aaddff';
  _drawSpeakerBox(line.text, line.speaker, col, sc.alpha, !isGod, cw, ch, sc_);
}

// ── Draw: finale ──────────────────────────────────────────────────────────
function _drawGodFinale(sc, cw, ch, scX, scY, sc_) {
  const GH = sc.GH || 520;

  // ── Dark overlay during preImpact/collapse for drama ─────────────────────
  if (['godCollapse','preImpact'].includes(sc.phase)) {
    const darkA = sc.phase === 'preImpact' ? 0.72 : Math.min(0.72, sc.phaseTimer / 55 * 0.72);
    ctx.globalAlpha = darkA;
    ctx.fillStyle   = '#000000';
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalAlpha = 1;
  }

  // Letterbox
  _drawLetterbox(sc.barH * scY, cw, ch, 0.75);

  // ── God stickman (stagger → collapse → gone) ──────────────────────────────
  if (sc.godAlpha > 0.02) {
    ctx.save();
    ctx.translate(sc.godX * scX, sc.godY * scY);
    ctx.rotate(sc.godDroopAngle);
    _drawGodStickmanAt(0, 0, sc.godAlpha, sc_);
    ctx.restore();
  }

  // ── Kernel orb trail (during launch) ─────────────────────────────────────
  for (const tp of sc.kernelTrail) {
    const fa = (tp.life / 18) * 0.7;
    ctx.globalAlpha = fa;
    const tGrd = ctx.createRadialGradient(tp.x * scX, tp.y * scY, 0, tp.x * scX, tp.y * scY, tp.r * sc_);
    tGrd.addColorStop(0,   'rgba(255,220,50,0.9)');
    tGrd.addColorStop(1,   'rgba(255,100,0,0)');
    ctx.fillStyle = tGrd;
    ctx.beginPath(); ctx.arc(tp.x * scX, tp.y * scY, tp.r * sc_, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Kernel orb ────────────────────────────────────────────────────────────
  if (sc.kernelAlpha > 0 && sc.kernelR > 0.5) {
    const kx = sc.kernelX * scX, ky = sc.kernelY * scY;
    const kr = sc.kernelR * sc_;
    ctx.globalAlpha = sc.kernelAlpha;
    const kGrd = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr * 3);
    kGrd.addColorStop(0,   'rgba(255,230,60,0.95)');
    kGrd.addColorStop(0.5, 'rgba(255,140,0,0.55)');
    kGrd.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = kGrd;
    ctx.beginPath(); ctx.arc(kx, ky, kr * 3, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 22;
    ctx.fillStyle   = '#fff8c0';
    ctx.beginPath(); ctx.arc(kx, ky, kr, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = sc.kernelAlpha * 0.75;
    ctx.font        = `bold ${Math.round(9 * sc_)}px monospace`;
    ctx.fillStyle   = '#ffeeaa';
    ctx.textAlign   = 'center';
    ctx.fillText('THE KERNEL', kx, ky - kr * 3.2 - 4 * sc_);
    ctx.globalAlpha = 1;
  }

  // ── Pre-impact: descending Kernel dot ─────────────────────────────────────
  if (sc.phase === 'preImpact' && sc.impactDotY > 0) {
    const dx = sc.godX * scX, dy = sc.impactDotY * scY;
    const dr = sc.impactDotR * sc_;
    ctx.globalAlpha = sc.impactBrightness;
    const dGrd = ctx.createRadialGradient(dx, dy, 0, dx, dy, dr * 4);
    dGrd.addColorStop(0,   'rgba(255,230,80,1)');
    dGrd.addColorStop(0.4, 'rgba(255,130,0,0.6)');
    dGrd.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = dGrd;
    ctx.beginPath(); ctx.arc(dx, dy, dr * 4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 20;
    ctx.fillStyle   = '#ffffff';
    ctx.beginPath(); ctx.arc(dx, dy, dr, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    // Meteor tail
    const tailLen = Math.min(sc.impactDotY, 80) * scY;
    const mGrd = ctx.createLinearGradient(dx, dy - tailLen, dx, dy);
    mGrd.addColorStop(0, 'rgba(255,100,0,0)');
    mGrd.addColorStop(1, `rgba(255,200,50,${sc.impactBrightness * 0.7})`);
    ctx.strokeStyle = mGrd;
    ctx.lineWidth   = dr * 2;
    ctx.beginPath(); ctx.moveTo(dx, dy - tailLen); ctx.lineTo(dx, dy); ctx.stroke();
  }

  // ── Shockwave rings (impact + after) ─────────────────────────────────────
  if (['kernelImpact','mergeRise'].includes(sc.phase)) {
    for (const ring of sc.shockRings) {
      if (ring.alpha <= 0) continue;
      ctx.globalAlpha = ring.alpha;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth   = 3 * sc_;
      ctx.shadowColor = ring.color; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(sc.godX * scX, sc.godY * scY, ring.r * scX, ring.r * 0.38 * scY, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    // Dust
    for (const d of sc.dustParts) {
      ctx.globalAlpha = d.life * 0.65;
      ctx.fillStyle   = '#e8e0c8';
      ctx.beginPath(); ctx.arc(d.x * scX, d.y * scY, d.r * sc_, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Merge rise: Absolute Axiom silhouette emerging ────────────────────────
  if (sc.phase === 'mergeRise' && sc.risingAlpha > 0) {
    const rx = sc.godX * scX, ry = sc.godY * scY;
    const ws = sc.wingsSpread;

    // Rising ember glow beneath
    ctx.globalAlpha = sc.risingAlpha * 0.5;
    const rGrd = ctx.createRadialGradient(rx, ry, 0, rx, ry, 70 * sc_);
    rGrd.addColorStop(0,   'rgba(255,100,0,0.6)');
    rGrd.addColorStop(0.5, 'rgba(180,30,0,0.3)');
    rGrd.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = rGrd;
    ctx.beginPath(); ctx.arc(rx, ry, 70 * sc_, 0, Math.PI * 2); ctx.fill();

    // Silhouette of Absolute Axiom
    ctx.globalAlpha = sc.risingAlpha * 0.88;
    _drawAAsilhouette(rx, ry, ws, sc_);
    ctx.globalAlpha = 1;
  }

  // ── Title card: ABSOLUTE AXIOM ────────────────────────────────────────────
  if (sc.titleAlpha > 0) {
    ctx.globalAlpha = sc.titleAlpha * 0.8;
    ctx.fillStyle   = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, ch * 0.30, cw, ch * 0.30);
    ctx.globalAlpha = sc.titleAlpha;
    ctx.font        = `bold ${Math.round(ch * 0.056)}px serif`;
    ctx.textAlign   = 'center';
    ctx.fillStyle   = '#ff4400';
    ctx.shadowColor = '#ff1100'; ctx.shadowBlur = 50;
    ctx.fillText('ABSOLUTE AXIOM', cw / 2, ch * 0.48);
    ctx.shadowBlur  = 0;
    ctx.font        = `${Math.round(ch * 0.022)}px sans-serif`;
    ctx.fillStyle   = 'rgba(255,120,40,0.8)';
    ctx.fillText('God. Architect. Kernel. One.', cw / 2, ch * 0.53);
  }

  // ── Axiom speaks ──────────────────────────────────────────────────────────
  if (sc.phase === 'finalAxiomSpeaks' && sc.axiomAlpha > 0 && sc.axiomLineIdx < sc.axiomLines.length) {
    const line = sc.axiomLines[sc.axiomLineIdx];
    _drawSpeakerBox(line.text, 'ABSOLUTE AXIOM', line.color, sc.axiomAlpha, false, cw, ch, sc_);
  }

  // ── Fade to black ──────────────────────────────────────────────────────────
  if (sc.fadeAlpha > 0) {
    ctx.globalAlpha = sc.fadeAlpha;
    ctx.fillStyle   = '#000000';
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalAlpha = 1;
  }
}

// ── Draw helpers ──────────────────────────────────────────────────────────
function _drawLetterbox(barH, cw, ch, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = '#000000';
  ctx.fillRect(0, 0, cw, barH);
  ctx.fillRect(0, ch - barH, cw, barH);
  ctx.globalAlpha = 1;
}

function _drawSpeakerBox(text, speaker, speakerColor, alpha, isLeft, cw, ch, sc_) {
  const boxW = 460 * sc_, boxH = 64 * sc_;
  const boxX = isLeft ? 24 * sc_ : cw - boxW - 24 * sc_;
  const boxY = ch * 0.73;
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
  ctx.fillText(text, boxX + boxW / 2, boxY + boxH * 0.71);
  ctx.globalAlpha = 1;
}

function _drawGodStickmanAt(ox, oy, alpha, sc_) {
  const s = 18 * sc_;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#e0ccff';
  ctx.fillStyle   = '#e0ccff';
  ctx.lineWidth   = 4 * sc_;
  ctx.shadowColor = '#aa88ff'; ctx.shadowBlur = 18;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(ox, oy - s * 2.4, s * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(ox, oy - s * 1.85); ctx.lineTo(ox, oy + s * 0.35); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox - s * 1.1, oy - s * 0.6); ctx.lineTo(ox + s * 1.1, oy - s * 0.6); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ox, oy + s * 0.35); ctx.lineTo(ox - s * 0.7, oy + s * 1.7);
  ctx.moveTo(ox, oy + s * 0.35); ctx.lineTo(ox + s * 0.7, oy + s * 1.7);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function _drawAAsilhouette(cx, cy, spread, sc_) {
  const s = 20 * sc_;
  ctx.strokeStyle = '#cc2200';
  ctx.fillStyle   = '#330000';
  ctx.lineWidth   = 4.5 * sc_;
  ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 22;
  ctx.lineCap = 'round';
  // Body
  ctx.beginPath(); ctx.arc(cx, cy - s * 2.4, s * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = '#cc2200'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx, cy - s * 1.85); ctx.lineTo(cx, cy + s * 0.35); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - s * 1.1, cy - s * 0.6); ctx.lineTo(cx + s * 1.1, cy - s * 0.6); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.35); ctx.lineTo(cx - s * 0.7, cy + s * 1.7);
  ctx.moveTo(cx, cy + s * 0.35); ctx.lineTo(cx + s * 0.7, cy + s * 1.7);
  ctx.stroke();
  // Kernel in chest
  const kx = cx, ky = cy - s * 0.8;
  ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 16;
  ctx.fillStyle   = '#ffcc00';
  ctx.globalAlpha *= 0.9;
  ctx.beginPath(); ctx.arc(kx, ky, s * 0.4, 0, Math.PI * 2); ctx.fill();
  // Wings unfurling (spread 0→1)
  if (spread > 0) {
    const wSpan = spread * 80 * sc_;
    ctx.globalAlpha = spread * 0.8;
    ctx.shadowColor = '#cc2200'; ctx.shadowBlur = 18;
    for (const side of [-1, 1]) {
      ctx.fillStyle = `rgba(180,30,0,${spread * 0.55})`;
      ctx.beginPath();
      ctx.ellipse(cx + side * wSpan * 0.5, cy - s * 0.3, wSpan * 0.55, s * 0.55, side * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.shadowBlur = 0;
}
