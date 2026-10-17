'use strict';
// ATK sandbox state, proxy factory, live-player context, helpers, _atkDeal, _atkResetEffects.
// Depends on: smb-globals.js, smb-fighter.js, smb-combat.js.

'use strict';

// Attack test sandbox (smb-attacktest.js).
// Attack viewer: preview any attack as a visual effect without spawning bosses.
//   In the console (GAMECONSOLE), run: atk help
// Admin kits: give a player boss or NPC attacks on Q (ability) and E (super).
//   atk class creator|trueform|yeti|beast [p1|p2], or atk class off.
// To add an attack, add an ATK_REGISTRY entry { label, desc, fn(ctx, target, opts) }.
// ctx is a proxy at the firer's position. It is never rendered.

// Global sandbox state
let _atkSafeMode     = false;
let _atkPauseBetween = true;
let _atkSpeed        = 1.0;
let _atkDamageScale  = 1.0;
let _atkDemoRunning  = false;

// Proxy factory. Mimics just enough of Boss or TrueForm for attack logic.
// Never pushed into players[], so it is never drawn or updated.
// isTF: true for the TrueForm spec, false for the Creator Boss spec.
// x, y: world position (defaults to arena centre).
function _atkMakeProxy(isTF, x, y) {
  const px = x !== undefined ? x : GAME_W / 2;
  const py = y !== undefined ? y : 300;
  const proxy = {
    // Position / size
    x: px - (isTF ? 9 : 16),
    y: py,
    w: isTF ? 18 : 33,
    h: isTF ? 50 : 90,
    vx: 0, vy: 0,
    facing: 1,
    onGround: true,
    // Identity flags
    isBoss: true,
    isTrueForm: !!isTF,
    isProxy: true,       // cleanup checks this
    health: 9999,
    maxHealth: isTF ? 5000 : 3000,
    invincible: 99999,
    // Cooldown buckets — all zeroed so _doSpecial can fire immediately
    _gravityCd:0,_warpCd:0,_holeCd:0,_floorCd:0,_invertCd:0,_sizeCd:0,_portalCd:0,
    _graspCd:0,_slashCd:0,_wellCd:0,_meteorCd:0,_cloneCd:0,_chainCd:0,
    _shockwaveCd:0,_teleportComboCd:0,_gravityCrushCd:0,
    _phaseShiftCd:0,_realityTearCd:0,_calcStrikeCd:0,
    _realityOverrideCd:0,_collapseStrikeCd:0,_grabCinCd:0,_dimensionCd:0,
    _gammaBeamCd:0,_neutronStarCd:0,_galaxySweepCd:0,_multiverseCd:0,_supernovaCd:0,
    _groundSlamCd:0,_gravPulseCd:0,_stormCd:0,
    // State needed by some attack helpers
    postSpecialPause:0, _pendingGroundSlam:null, _pendingGravPulse:null,
    _pendingSlash:null, _pendingShockwave:null, _pendingTeleportCombo:null,
    _pendingGravityCrush:null, _pendingCollapseStrike:null, _pendingChainMove:null,
    _desperationMode:false, _stillTimer:0, _runAwayTicks:0, _idleTicks:0,
    _lastSpecial:null, _lastLastSpecial:null, _aggressionBurstTimer:0,
    _cinematicFired: new Set(),
    _lastPhase:1,
    backstageHiding: false,
    // Attack state — required by TrueForm._doSpecial
    _tfAttackState: { name: null, phase: 'idle', timer: 0, locked: false },
    // Methods
    cx()  { return this.x + this.w / 2; },
    cy()  { return this.y + this.h / 2; },
    getPhase() { return 3; },  // phase 3 so every attack is available
    platformAbove() { return null; },
    isEdgeDanger()  { return false; },
    _startAttackState(name, startFrames = 0, locked = false) {
      this._tfAttackState = { name, phase: 'start', timer: startFrames, locked };
    },
    _setAttackPhase(phase, frames = 0, locked = false) {
      if (!this._tfAttackState.name) return;
      this._tfAttackState.phase  = phase;
      this._tfAttackState.timer  = frames;
      this._tfAttackState.locked = locked;
    },
    _finishAttackState(name = null) {
      if (name && this._tfAttackState.name && this._tfAttackState.name !== name) return;
      this._tfAttackState = { name: null, phase: 'idle', timer: 0, locked: false };
    },
  };

  // Borrow TrueForm's special methods, bound to the proxy
  if (isTF && typeof TrueForm !== 'undefined') {
    try {
      const tfProto = TrueForm.prototype;
      if (tfProto._doSpecial)  proxy._doSpecial  = tfProto._doSpecial.bind(proxy);
      if (tfProto._pickSpecial) proxy._pickSpecial = tfProto._pickSpecial.bind(proxy);
    } catch(_e) { /* missing methods are fine */ }
  }
  // Boss._bossFireSpecial, if present
  if (!isTF && typeof Boss !== 'undefined') {
    try {
      const bProto = Boss.prototype;
      if (bProto._bossFireSpecial) proxy._bossFireSpecial = bProto._bossFireSpecial.bind(proxy);
    } catch(_e) {}
  }

  return proxy;
}

// Live-player context for the admin kit.
/**
 * Like _atkMakeProxy, but position reads and writes go to `player` live.
 * This means:
 *  - AOE effects always originate from the player's current location.
 *  - Teleport attacks (reality slash, portal teleport, etc.) actually move
 *    the real player since setting ctx.x writes to player.x.
 *  - Physics attacks (meteor leap, neutron slam) modify player.vy/vx so
 *    the player's body executes the move for real.
 *  - bossRef stored in global attack state objects (tfGammaBeam, etc.)
 *    reads live position, so beam/sweep visuals track the player.
 */
function _atkMakePlayerCtx(player, isTF) {
  const ctx = {
    // Live getters/setters — reads and writes go to the real player
    get x()       { return player.x; },
    set x(v)      { player.x = v; },
    get y()       { return player.y; },
    set y(v)      { player.y = v; },
    get vx()      { return player.vx; },
    set vx(v)     { player.vx = v; },
    get vy()      { return player.vy; },
    set vy(v)     { player.vy = v; },
    get facing()  { return player.facing; },
    get onGround(){ return player.onGround; },
    get w()       { return player.w; },
    get h()       { return player.h; },
    cx()  { return player.cx(); },
    cy()  { return player.cy(); },
    // Identity — override so boss-method dispatch works
    isBoss: true,
    isTrueForm: !!isTF,
    isProxy: true,
    health: 9999, maxHealth: isTF ? 5000 : 3000,
    invincible: 99999,
    // All cooldowns zeroed so _doSpecial fires immediately
    _gravityCd:0,_warpCd:0,_holeCd:0,_floorCd:0,_invertCd:0,_sizeCd:0,_portalCd:0,
    _graspCd:0,_slashCd:0,_wellCd:0,_meteorCd:0,_cloneCd:0,_chainCd:0,
    _shockwaveCd:0,_teleportComboCd:0,_gravityCrushCd:0,
    _phaseShiftCd:0,_realityTearCd:0,_calcStrikeCd:0,
    _realityOverrideCd:0,_collapseStrikeCd:0,_grabCinCd:0,_dimensionCd:0,
    _gammaBeamCd:0,_neutronStarCd:0,_galaxySweepCd:0,_multiverseCd:0,_supernovaCd:0,
    _groundSlamCd:0,_gravPulseCd:0,_stormCd:0,
    postSpecialPause:0, _pendingGroundSlam:null, _pendingGravPulse:null,
    _pendingSlash:null, _pendingShockwave:null, _pendingTeleportCombo:null,
    _pendingGravityCrush:null, _pendingCollapseStrike:null, _pendingChainMove:null,
    _desperationMode:false, _stillTimer:0, _runAwayTicks:0, _idleTicks:0,
    _lastSpecial:null, _lastLastSpecial:null, _aggressionBurstTimer:0,
    _cinematicFired: new Set(),
    _lastPhase: 1,
    backstageHiding: false,
    // Attack state — required by TrueForm._doSpecial
    _tfAttackState: { name: null, phase: 'idle', timer: 0, locked: false },
    getPhase()      { return 3; },
    platformAbove() { return null; },
    isEdgeDanger()  { return false; },
    _startAttackState(name, startFrames = 0, locked = false) {
      this._tfAttackState = { name, phase: 'start', timer: startFrames, locked };
    },
    _setAttackPhase(phase, frames = 0, locked = false) {
      if (!this._tfAttackState.name) return;
      this._tfAttackState.phase  = phase;
      this._tfAttackState.timer  = frames;
      this._tfAttackState.locked = locked;
    },
    _finishAttackState(name = null) {
      if (name && this._tfAttackState.name && this._tfAttackState.name !== name) return;
      this._tfAttackState = { name: null, phase: 'idle', timer: 0, locked: false };
    },
  };
  // Attach boss methods
  if (isTF && typeof TrueForm !== 'undefined') {
    try {
      const tp = TrueForm.prototype;
      if (tp._doSpecial)   ctx._doSpecial   = tp._doSpecial.bind(ctx);
      if (tp._pickSpecial) ctx._pickSpecial  = tp._pickSpecial.bind(ctx);
    } catch(_e) {}
  }
  if (!isTF && typeof Boss !== 'undefined') {
    try {
      const bp = Boss.prototype;
      if (bp._bossFireSpecial) ctx._bossFireSpecial = bp._bossFireSpecial.bind(ctx);
    } catch(_e) {}
  }
  return ctx;
}

// Helpers
function _atkGetTarget() {
  if (typeof players === 'undefined') return null;
  return players.find(p => !p.isBoss && p.health > 0) || null;
}

// Best target for a kit-equipped player: any live entity other than the firer
function _atkGetKitTarget(firingPlayer) {
  if (typeof players === 'undefined') return null;
  return players.find(p => p !== firingPlayer && p.health > 0) || null;
}

// Teammate check. Survival team mode with friendly fire off means teammates are not hit.
function _atkIsTeammate(firingPlayer, target) {
  if (!firingPlayer || !target) return false;
  if (typeof survivalTeamMode === 'undefined' || !survivalTeamMode) return false;
  if (typeof survivalFriendlyFire !== 'undefined' && survivalFriendlyFire) return false;
  if (firingPlayer._teamId !== undefined && target._teamId !== undefined)
    return firingPlayer._teamId === target._teamId;
  return false;
}

// Valid AOE targets for a kit-equipped player (no firer, dead, or teammates)
function _atkGetAOETargets(firingPlayer) {
  if (typeof players === 'undefined') return [];
  return players.filter(p => p !== firingPlayer && p.health > 0 && !_atkIsTeammate(firingPlayer, p));
}

// Current kit firer, set in _atkKitFire so _atkDeal can use it as the attacker
let _atkCurrentFirer = null;

// Immune to GUI-triggered attacks for up to ~20s, so AOE cannot hit the player who fired it.
function _atkSetGuiFirer(player) {
  if (!player) return;
  player._guiAttackImmune = true;
  setTimeout(() => { if (player) player._guiAttackImmune = false; }, 20000);
}

function _atkDeal(attacker, target, dmg, kb) {
  if (_atkSafeMode) return;
  if (typeof dealDamage === 'function')
    dealDamage(attacker || _atkCurrentFirer, target, Math.round(dmg * _atkDamageScale), kb);
}

function _atkResetEffects() {
  if (typeof bossBeams        !== 'undefined') bossBeams        = [];
  if (typeof bossSpikes       !== 'undefined') bossSpikes       = [];
  if (typeof bossWarnings     !== 'undefined') bossWarnings     = [];
  if (typeof bossMetSafeZones !== 'undefined') bossMetSafeZones = [];
  if (typeof tfBlackHoles     !== 'undefined') tfBlackHoles     = [];
  if (typeof tfGravityWells   !== 'undefined') tfGravityWells   = [];
  if (typeof tfClones         !== 'undefined') tfClones         = [];
  if (typeof tfShockwaves     !== 'undefined') tfShockwaves     = [];
  if (typeof tfPhaseShift     !== 'undefined') tfPhaseShift     = null;
  if (typeof tfMeteorCrash    !== 'undefined') tfMeteorCrash    = null;
  if (typeof tfChainSlam      !== 'undefined') tfChainSlam      = null;
  if (typeof tfGraspSlam      !== 'undefined') tfGraspSlam      = null;
  if (typeof tfGammaBeam      !== 'undefined') tfGammaBeam      = null;
  if (typeof tfNeutronStar    !== 'undefined') tfNeutronStar    = null;
  if (typeof tfGalaxySweep    !== 'undefined') tfGalaxySweep    = null;
  if (typeof tfMultiverse     !== 'undefined') tfMultiverse     = null;
  if (typeof tfSupernova      !== 'undefined') tfSupernova      = null;
  if (typeof tfFloorRemoved   !== 'undefined' && tfFloorRemoved) {
    tfFloorRemoved = false;
    const fl = currentArena && currentArena.platforms.find(p => p.isFloor);
    if (fl) fl.isFloorDisabled = false;
  }
  if (typeof tfGravityInverted  !== 'undefined') tfGravityInverted  = false;
  if (typeof tfControlsInverted !== 'undefined') tfControlsInverted = false;
  if (typeof tfSizeTargets      !== 'undefined') tfSizeTargets.clear();
  _consoleOk('[ATK] All active attack effects cleared.');
}

