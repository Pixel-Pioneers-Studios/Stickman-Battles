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
  // Guard: only play once ever (persisted) and once per session.
  // Without this the full 35-second sequence re-fires on every repeated defeat.
  try { if (localStorage.getItem('smb_fallenGodBackstoryPlayed')) return; } catch (e) { /* ignore */ }
  if (storyEventFired && storyEventFired['_fallenGodBackstory']) return;
  if (storyEventFired) storyEventFired['_fallenGodBackstory'] = true;
  try { localStorage.setItem('smb_fallenGodBackstoryPlayed', '1'); } catch (e) { /* ignore */ }

  // The Fallen God narrates Axiom's full story — who he was, what happened,
  // and why True Form exists. This plays after the Fallen God is defeated.
  //
  // CANON (do not alter sequence):
  //   Axiom was a hero. He gathered allies — his closest friends.
  //   They found a fracture leading to a separate multiversal layer.
  //   Inside it: power to reshape reality, to create and destroy.
  //   That power corrupted perception. Identity collapsed. War began.
  //   Each of them seized a branch and became its ruler.
  //   Axiom seized this one. The Creator shell is the interface.
  //   True Form is what Axiom became.
  //   Paradox was built during the war to fight beside Axiom.
  //   An error in its construction caused it to turn against everyone.
  //   That is the fight you witnessed in the void arena.
  const lines = [
    { delay:   400, text: '"I watched it happen. All of it."',                             color: '#ffcc44' },
    { delay:  2400, text: '"Axiom was a hero before any of this."',                        color: '#ffee88' },
    { delay:  4400, text: '"He proved himself. Others like him found him."',               color: '#ffdd88' },
    { delay:  6400, text: '"They became his closest allies. His friends."',                color: '#ffcc44' },
    { delay:  8400, text: '"Together they discovered the fracture."',                      color: '#ffee99' },
    { delay: 10400, text: '"A tear between multiversal layers. They went through it."',    color: '#ffcc44' },
    { delay: 12400, text: '"Inside: power without limit. Reality bending to their will."', color: '#ffaa00' },
    { delay: 14400, text: '"That power does not stay in your hands. It enters your mind."',color: '#ff8800' },
    { delay: 16400, text: '"They stopped recognising each other. Trust became war."',      color: '#ff6600' },
    { delay: 18400, text: '"Each of them took a branch. Became its ruler."',               color: '#ffcc44' },
    { delay: 20400, text: '"Axiom took this one. He built the Creator as its shell."',     color: '#ffee88' },
    { delay: 22400, text: '"True Form is what he became inside it."',                      color: '#ffffff'  },
    { delay: 24400, text: '"During the war he built Paradox — a weapon to fight beside him."', color: '#aaddff' },
    { delay: 26400, text: '"An error in its construction. Paradox turned against everything."', color: '#88aaff' },
    { delay: 28400, text: '"That fight in the void arena — that was the error playing out."',    color: '#aaddff' },
    { delay: 30400, text: '"Now you have done what I could not."',                         color: '#ffffff'  },
    { delay: 32400, text: '"Remember what he was. And what the fracture cost."',           color: '#ffcc44' },
    { delay: 34800, text: null /* end */ },
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
