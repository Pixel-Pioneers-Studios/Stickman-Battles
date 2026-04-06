// smb-boss-helpers.js
// Boss/TrueForm utility helpers: debug, TF arena mechanics, state reset, FallenGod class.
// Depends on: smb-globals.js, smb-boss-effects.js, smb-boss-cinematics.js
// Must load: AFTER smb-boss-effects.js, BEFORE smb-loop.js

// ============================================================
// TRUE FORM ADAPTIVE AI — DEBUG API
// Use via the game console (F1 → open console)
// ============================================================
function showAdaptationLevel() {
  const tf = players && players.find(p => p.isTrueForm);
  if (!tf) { console.warn('[TF-Adapt] No active TrueForm.'); return; }
  const al = tf.adaptationLevel.toFixed(1);
  const tier = al >= 90 ? 'PERFECTED' : al >= 75 ? 'MASTERED' : al >= 60 ? 'EVOLVED'
             : al >= 40 ? 'ADAPTING'  : al >= 20 ? 'LEARNING' : 'OBSERVING';
  console.log(`[TF-Adapt] Level: ${al}/100  Tier: ${tier}`);
  if (typeof showBossDialogue === 'function') showBossDialogue(`Adapt: ${al}% — ${tier}`, 180);
}

function showPlayerProfile() {
  const tf = players && players.find(p => p.isTrueForm);
  if (!tf) { console.warn('[TF-Adapt] No active TrueForm.'); return; }
  const p = tf._profile;
  console.log(
    '[TF-Adapt] Player Profile:\n' +
    `  Attack freq   : ${(p.attackFrequency  * 100).toFixed(0)}%\n` +
    `  Jump freq     : ${(p.jumpFrequency    * 100).toFixed(0)}%\n` +
    `  Dodge freq    : ${(p.dodgeFrequency   * 100).toFixed(0)}%\n` +
    `  Block freq    : ${(p.blockFrequency   * 100).toFixed(0)}%\n` +
    `  Pref. distance: ${p.distancePreference.toFixed(0)}px\n` +
    `  Repetition    : ${(p.repetitionScore  * 100).toFixed(0)}% predictable`
  );
  console.log(
    '[TF-Adapt] Behavior Multipliers:\n' +
    `  Dodge chance : ${(tf._adaptDodge * 100).toFixed(0)}%\n` +
    `  Atk frequency: ${(tf._adaptAtkFreq * 100).toFixed(0)}%\n` +
    `  Spacing      : ${tf._adaptSpacing.toFixed(0)}px\n` +
    `  Reaction lag : ${tf._adaptReact} ticks`
  );
}

function forceAdaptationLevel(value) {
  const tf = players && players.find(p => p.isTrueForm);
  if (!tf) { console.warn('[TF-Adapt] No active TrueForm.'); return; }
  tf.adaptationLevel = Math.max(0, Math.min(100, Number(value) || 0));
  // Force visual state update immediately
  tf._adaptOrbitMult = 1.0 + (tf.adaptationLevel / 100) * 1.4;
  tf._adaptGlowBoost = tf.adaptationLevel / 100;
  tf._adaptFlicker   = Math.max(0, (tf.adaptationLevel - 68) / 32);
  console.log(`[TF-Adapt] Forced adaptation level to ${tf.adaptationLevel.toFixed(1)}`);
  if (typeof showBossDialogue === 'function') showBossDialogue(`Forced: ${tf.adaptationLevel.toFixed(0)}%`, 150);
}

function tfWarpArena(key) {
  if (!ARENAS[key]) return;
  currentArenaKey = key;
  currentArena    = ARENAS[key];
  // Randomize layout if safe
  if (key !== 'lava') randomizeArenaLayout(key);
  generateBgElements();
  initMapPerks(key);
  // Reset floor state
  const floorPl = currentArena.platforms.find(p => p.isFloor);
  if (floorPl) floorPl.isFloorDisabled = false;
  tfFloorRemoved = false;
  if (settings.screenShake) screenShake = Math.max(screenShake, 22);
  spawnParticles(GAME_W / 2, GAME_H / 2, '#ffffff', 40);
}

function tfPortalTeleport(tf, target) {
  if (!target || !tf) return;
  const safePos = _bossFindSafeArenaPosition(tf, target.cx() + (target.facing || 1) * 48, target.y, {
    preferRaised: true,
    sideBias: target.facing || 1,
  });
  if (!safePos) {
    tf._finishAttackState && tf._finishAttackState('portal');
    return;
  }
  // Black portal flash
  spawnParticles(tf.cx(), tf.cy(), '#000000', 20);
  spawnParticles(tf.cx(), tf.cy(), '#ffffff', 10);
  setTimeout(() => {
    if (!gameRunning) return;
    const landed = _bossTeleportActor(tf, safePos.x + tf.w / 2, safePos.y, { preferRaised: true, sideBias: target.facing || 1 });
    if (!landed) {
      tf._finishAttackState && tf._finishAttackState('portal');
      return;
    }
    tf.facing = target.cx() > tf.cx() ? 1 : -1;
    spawnParticles(tf.cx(), tf.cy(), '#000000', 20);
    spawnParticles(tf.cx(), tf.cy(), '#ffffff', 10);
    if (settings.screenShake) screenShake = Math.max(screenShake, 12);
    tf._setAttackPhase && tf._setAttackPhase('recovery', 16, false);
  }, 350);
}

function tfSetSize(fighter, scale) {
  if (!fighter) return;
  // Restore original size first
  if (tfSizeTargets.has(fighter)) {
    const orig = tfSizeTargets.get(fighter);
    fighter.w = orig.w; fighter.h = orig.h;
  } else {
    tfSizeTargets.set(fighter, { w: fighter.w, h: fighter.h });
  }
  fighter.w        = Math.round(fighter.w * scale);
  fighter.h        = Math.round(fighter.h * scale);
  fighter.tfDrawScale = scale;
  fighter.drawScale   = scale;
}

function resetTFState() {
  forceResetGravity(); // clears gravityState, tfGravityInverted, tfGravityTimer

  tfControlsInverted    = false;
  tfControlsInvertTimer = 0;
  mirrorFlipped      = false; mirrorFlipTimer = 0; mirrorFlipWarning = 0;
  tfFloorRemoved     = false;
  tfFloorTimer       = 0;
  tfBlackHoles       = [];
  tfSizeTargets.clear();
  tfGravityWells     = [];
  tfMeteorCrash      = null;
  tfClones           = [];
  tfChainSlam        = null;
  tfGraspSlam        = null;
  tfDimensionPunch   = null;
  tfShockwaves       = [];
  tfPhaseShift       = null;
  tfRealityTear      = null;
  tfMathBubble       = null;
  tfCalcStrike       = null;
  tfGhostPaths       = null;
  tfRealityOverride  = null;
  tfGammaBeam        = null;
  tfBurnTrail        = null;
  tfNeutronStar      = null;
  tfGalaxySweep      = null;
  if (tfMultiverse) { tfMultiverse.shards && (tfMultiverse.shards.length = 0); tfMultiverse = null; }
  tfSupernova        = null;
  tfAttackRetryQueue = [];
  // Restore slow-motion if any attack left it in a reduced state
  if (slowMotion < 1.0) { slowMotion = 1.0; hitSlowTimer = 0; }
  // Reset dimension shift — always restore 2D on fight end
  if (tfDimensionIs3D) {
    tfDimensionIs3D = false;
    set3DView(settings.view3D ? 'settings' : false);
  }
  // Reset telegraph / warning system
  resetBossWarnings();
  // Restore void arena floor
  if (ARENAS.void) {
    const floorPl = ARENAS.void.platforms.find(p => p.isFloor);
    if (floorPl) floorPl.isFloorDisabled = false;
  }
  if (typeof resetQTEState === 'function') resetQTEState();
  // Reset intro-sequence state machine
  if (typeof tfCinematicState      !== 'undefined') tfCinematicState      = 'none';
  if (typeof paradoxDeathComplete  !== 'undefined') paradoxDeathComplete  = false;
  if (typeof absorptionComplete    !== 'undefined') absorptionComplete    = false;
  if (typeof tfAbsorptionScene     !== 'undefined') tfAbsorptionScene     = null;
  // Hide the controls-inverted DOM banner if it's still showing
  const _cib = document.getElementById('ctrlInvertedBanner');
  if (_cib) _cib.style.display = 'none';
}

// ============================================================
// FALLEN GOD  (Godfall arc boss — lore narrator / post-epilogue)
// ============================================================
class FallenGod extends Boss {
  constructor() {
    super();
    this.isFallenGod  = true;
    this.name         = 'FALLEN GOD';
    this.color        = '#ffaa00';
    // 1.5× the story-scaled health set by _startGameCore
    // (multiplied after construction, see smb-menu.js patch)
    this._healthMult  = 1.5;
    // Slightly slower beams — emphasises gravitas over speed
    this.beamCooldown = 36;
    this.minionCooldown = 24;
    // Unique draw tint (golden silhouette)
    this._fallenGodTint = true;
  }

  // Override draw to give a golden tint on top of base Boss rendering
  draw(ctx) {
    super.draw(ctx);
    if (!this._fallenGodTint) return;
    // Overlay a subtle golden rim around the entity
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.08 * Math.sin(Date.now() / 400);
    ctx.fillStyle   = '#ffcc44';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur  = 24;
    ctx.fillRect(this.x - 4, this.y - 4, this.w + 8, this.h + 8);
    ctx.restore();
  }
}

// ── Post-defeat backstory sequence for Fallen God ──────────────────────────
function startFallenGodBackstory() {
  const lines = [
    { delay: 400,  text: '"Before the fracture…"',                     color: '#ffcc44' },
    { delay: 2200, text: '"…there was one system. One truth."',         color: '#ffdd88' },
    { delay: 4200, text: '"I built the walls between dimensions."',     color: '#ffcc44' },
    { delay: 6200, text: '"So nothing could bleed through."',           color: '#ffee99' },
    { delay: 8200, text: '"The Creator was my student."',               color: '#ffcc44' },
    { delay: 10200,text: '"I taught them everything."',                 color: '#ffdd88' },
    { delay: 12200,text: '"They built the fracture anyway."',           color: '#ff8800' },
    { delay: 14200,text: '"I fell trying to stop it."',                 color: '#ffaa44' },
    { delay: 16200,text: '"Now you have done what I could not."',       color: '#ffffff'  },
    { delay: 18200,text: '"Remember the cost of what was broken."',     color: '#ffcc44' },
    { delay: 20500,text: null /* end */ },
  ];

  // Use the existing storyFightSubtitle / showBossDialogue infrastructure
  let _seq = [...lines];
  function _next() {
    if (!_seq.length) return;
    const entry = _seq.shift();
    if (!entry.text) return; // sentinel — sequence done
    setTimeout(() => {
      if (typeof showBossDialogue === 'function') {
        showBossDialogue(entry.text, 110);
      } else if (typeof storyFightSubtitle !== 'undefined') {
        storyFightSubtitle = { text: entry.text, timer: 110, maxTimer: 110, color: entry.color };
      }
      _next();
    }, entry.delay);
  }
  _next();
}

// ── 3D View helper ────────────────────────────────────────────────────────────
// mode: false = 2D, 'tf' = TrueForm dramatic 3D, 'settings' = gentle persistent 3D
function set3DView(mode) {
  const c = document.getElementById('gameCanvas');
  if (!c) return;
  c.classList.remove('view-3d', 'view-3d-tf');
  if (mode === 'tf')  c.classList.add('view-3d-tf');
  else if (mode)      c.classList.add('view-3d');
}
