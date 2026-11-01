'use strict';
// smb-pixel-vfx-game.js: where the game triggers the pixel-art VFX (smb-pixel-vfx.js, js/vfx/).
// Direct calls: pixelSwingFX (Fighter.attack), pixelHitFX (dealDamage), pixelBlastFX (bombs, Cataclysm),
// pixelPickupFX (BR / Endless pickups). Everything that is a change of state rather than an event
// (heals, respawns, supers, shields, teleports, dashes) is read by pixelVfxWatch() once a frame, so none of
// the many places that heal or teleport a fighter needs touching. Render-only; never changes game state.

const _pvQuiet = () => {};
// Melee swing archetypes. Thrusts and jabs get a thin crescent along their short arc; ranged archetypes have no swing.
const _PV_ARC_SWINGS = { slash: 1, iai: 1, cleave: 1, sweep: 1, smash: 1, whirl: 1, strike: 1, thrust: 1, jab: 1 };
const _PV_HEAVY_SWINGS = { smash: 1, sweep: 1, cleave: 1 };

function _pvOn() { return typeof PixelVFX !== 'undefined'; }

/** Crescent along the weapon's own swing arc, from WEAPON_SWINGS. True when it replaced the ribbon trail. */
function pixelSwingFX(f) {
  if (!_pvOn() || !f || f.isBoss || !f.weapon || f.weapon.type !== 'melee') return false;
  const g = typeof WEAPON_SWINGS !== 'undefined' ? WEAPON_SWINGS[f.weaponKey] : null;
  if (!g || !_PV_ARC_SWINGS[g.archetype]) return false;
  const heavy = !!_PV_HEAVY_SWINGS[g.archetype];
  const dur = (g.dur || 10) / 60;
  const fx = PixelVFX.spawn('slash', {
    x: f.cx(), y: f.y + FIG_HEAD_R * 2 + 2 + FIG_NECK,     // the shoulder the arm swings from
    facing: f.facing || 1,
    radius: FIG_ARM_LEN + (g.tipLen || 26) * 1.5,
    width: heavy ? 17 : 12,
    from: g.a0, to: g.a1, squash: 1, tilt: 0,
    sweep: Math.max(0.04, dur * 0.55), hold: 0.03, trail: heavy ? 0.2 : 0.14,
    sparks: 0, shake: _pvQuiet,
  });
  if (fx) f._pvSlashT = (g.dur || 10) + 8;
  return !!fx;
}

/** Hit flash on every hit, blood on clean ones. True when it drew the blood, so spawnBlood can stand down. */
function pixelHitFX(attacker, target, dmg, guardUp, isSplash) {
  if (!_pvOn() || !target || !(dmg > 0)) return false;
  const dir = attacker ? (target.cx() >= attacker.cx() ? 1 : -1) : (target.facing ? -target.facing : 1);
  const ang = (dir > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.5;
  const x = target.cx() - dir * 8, y = target.cy() - 8;
  if (guardUp) {
    PixelVFX.spawn('impact', { kind: 'ricochet', x, y, angle: ang, size: 0.6, shake: _pvQuiet });
    if (target._pvShield && target._pvShield.hit) target._pvShield.hit(x, y);
    return false;
  }
  PixelVFX.spawn('impact', { x, y, angle: ang, size: Math.max(0.4, Math.min(1.1, 0.35 + dmg / 36)), shake: _pvQuiet });
  if (isSplash || !attacker || target.isBoss || dmg < 6) return false;
  return !!PixelVFX.spawn('blood', {
    x: target.cx(), y: target.cy() - 4,
    angle: dir > 0 ? -0.35 : Math.PI + 0.35,
    amount: Math.max(0.18, Math.min(0.9, dmg / 42)), size: 0.65, stainLife: 4,
    shake: _pvQuiet,
  });
}

/** Bomb, Cataclysm and other blasts. giga adds a fire patch and drifting embers. */
function pixelBlastFX(x, y, giga, size) {
  if (!_pvOn()) return false;
  const s = size || (giga ? 1 : 0.55);
  const fx = PixelVFX.spawn('explosion', { x, y, size: s, chunks: giga ? 22 : 10, shockwave: giga ? 80 : 46, shake: _pvQuiet });
  if (fx && giga) {
    const g = PixelVFX.groundFn(y - 10)(x);
    const gy = isFinite(g) ? g : y + 20;
    PixelVFX.spawn('fire', { box: [x - 40, gy - 30, 80, 30], size: 0.8, duration: 1.6 });
    const em = PixelVFX.spawn('embers', { area: { x: x - 90, y: gy - 160, w: 180, h: 160 }, density: 0.5, heat: false });
    if (em && em.stop) setTimeout(() => em.stop(), 1600);
  }
  return !!fx;
}

/** An item flying into the fighter who picked it up. */
function pixelPickupFX(f, x, y, item) {
  if (!_pvOn() || !f) return false;
  return !!PixelVFX.spawn('pickup', { x, y, actor: PixelVFX.actor(f), item: item || 'orb', wait: 0.05, shake: _pvQuiet });
}

/** TrueForm black hole, lasting as long as the gameplay hole. */
function pixelBlackHoleFX(bh) {
  if (!_pvOn() || !bh) return null;
  return PixelVFX.spawn('blackHole', { x: bh.x, y: bh.y, radius: Math.round((bh.r || 52) * 0.5), life: (bh.maxTimer || 360) / 60, shake: _pvQuiet });
}

// The pack's palettes are fixed per effect; these re-tint them to a fighter or domain colour,
// white-hot at index 0 down to near-black, the order every ramp in js/vfx/ uses.
const _PV_RAMP_STOPS = [[1, 0.85], [0.75, 0.5], [0.4, 0.15], [0, 0], [0, -0.25], [0, -0.45], [0, -0.65], [0, -0.8]];
function _pvShades(hex) {
  const v = parseInt(String(hex || '#ffffff').replace('#', '').slice(0, 6), 16) || 0xffffff;
  const c = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  return _PV_RAMP_STOPS.map(([w, d]) => c.map(k => Math.round(d >= 0 ? k + (255 - k) * Math.max(w, d) : k * (1 + d))));
}
function _pvRamp(hex) { return _pvShades(hex).map(([r, g, b]) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0); }
function _pvRampHex(hex) { return _pvShades(hex).slice(0, 7).map(c => '#' + c.map(k => k.toString(16).padStart(2, '0')).join('')); }
function _pvColor(f) {
  const d = f && f._comboDomain;
  return (d && d.def && d.def.color) || (f && f.color) || '#8ff0ff';
}

/** Super: the fighter's colour bursts out of them, with a thin pillar and a ring. */
function pixelSuperFX(f) {
  if (!_pvOn() || !f || f.isBoss) return false;
  const col = _pvColor(f), feet = f.y + f.h;
  PixelVFX.on(f, 'powerUp', { size: 1.15, palette: _pvRampHex(col), shake: _pvQuiet });
  PixelVFX.spawn('holyLight', { x: f.cx(), y: feet, width: 5, hold: 0.12, colors: _pvRamp(col), shake: _pvQuiet, darken: _pvQuiet });
  PixelVFX.spawn('explosion', { x: f.cx(), y: feet - 4, size: 0.35, chunks: 0, shockwave: 120, shake: _pvQuiet });
  return true;
}

/** Q ability: a short charge spark at the weapon, and a backhand arc for melee weapons. */
function pixelAbilityFX(f) {
  if (!_pvOn() || !f || f.isBoss || !f.weapon) return false;
  const col = _pvColor(f), ramp = _pvRamp(col);
  PixelVFX.on(f, 'energy', { kind: 'charge', charge: 0.22, radius: 18, colors: ramp, shake: _pvQuiet, flash: _pvQuiet });
  if (f.weapon.type === 'melee') {
    const g = typeof WEAPON_SWINGS !== 'undefined' ? WEAPON_SWINGS[f.weaponKey] : null;
    PixelVFX.spawn('slash', {
      x: f.cx(), y: f.y + FIG_HEAD_R * 2 + 2 + FIG_NECK, facing: f.facing || 1,
      radius: FIG_ARM_LEN + ((g && g.tipLen) || 26) * 1.9, width: 20,
      from: g ? g.a1 : 1.2, to: g ? g.a0 - 0.9 : -2.2,    // reversed and over-rotated: reads apart from a basic swing
      squash: 0.8, tilt: 0, sweep: 0.11, hold: 0.04, trail: 0.24, sparks: 6,
      ramp, sparkRamp: ramp, shake: _pvQuiet,
    });
  }
  return true;
}

/** Domain charge-up: energy gathers on the rising fighter for the whole rise. */
function pixelDomainRiseFX(f, color, secs) {
  if (!_pvOn() || !f) return null;
  return PixelVFX.on(f, 'energy', { kind: 'charge', charge: secs || 5, radius: 46, colors: _pvRamp(color || _pvColor(f)), shake: _pvQuiet });
}

/** Domain open: a pillar, a ground shockwave and a burst, all in the domain's colour. Combo domains are the small one. */
function pixelDomainOpenFX(f, color, big) {
  if (!_pvOn() || !f) return false;
  const col = color || _pvColor(f), feet = f.y + f.h, k = big ? 1 : 0.6;
  PixelVFX.spawn('holyLight', { x: f.cx(), y: feet, width: Math.round(22 * k), hold: big ? 0.7 : 0.25, colors: _pvRamp(col), shake: _pvQuiet });
  PixelVFX.spawn('explosion', { x: f.cx(), y: feet - 4, size: 0.5 * k, chunks: 0, shockwave: Math.round(220 * k), shake: _pvQuiet });
  PixelVFX.on(f, 'powerUp', { size: 1.4 * k, palette: _pvRampHex(col), shake: _pvQuiet });
  f._pvAuraT = 150;
  return true;
}

/** Finisher impact beats (smb-finisher-engine.js holds). The last beat is the kill: blood, pillar and a wide ring. */
function pixelFinisherHitFX(att, tgt, last) {
  if (!_pvOn() || !tgt) return false;
  const col = _pvColor(att), dir = att ? (tgt.cx() >= att.cx() ? 1 : -1) : 1, feet = tgt.y + tgt.h;
  PixelVFX.spawn('impact', { x: tgt.cx() - dir * 6, y: tgt.cy() - 8, angle: dir > 0 ? 0 : Math.PI, size: last ? 1.4 : 1, shake: _pvQuiet });
  PixelVFX.spawn('explosion', { x: tgt.cx(), y: feet - 4, size: last ? 0.4 : 0.25, chunks: 0, shockwave: last ? 200 : 90, shake: _pvQuiet });
  if (!last) return true;
  if (!tgt.isBoss) PixelVFX.spawn('blood', { x: tgt.cx(), y: tgt.cy() - 4, angle: dir > 0 ? -0.5 : Math.PI + 0.5, amount: 1, size: 0.8, stainLife: 4, shake: _pvQuiet });
  PixelVFX.spawn('holyLight', { x: tgt.cx(), y: feet, width: 12, hold: 0.3, colors: _pvRamp(col), shake: _pvQuiet, darken: _pvQuiet });
  if (att) PixelVFX.on(att, 'powerUp', { size: 0.9, palette: _pvRampHex(col), shake: _pvQuiet });
  return true;
}

// Hand-drawn effect code that the pixel pass takes over (PixelVFX.wrap). Wrapped once, on the first frame,
// because these files load after this one. Fighters, platforms, backgrounds and the HUD are not in here.
const _PV_PASS_FNS = [
  'drawBossBeams', 'drawBossSpikes', 'drawBossWarnings', 'drawBossParadoxForeshadow',
  'drawSpartanRageEffects', 'drawClassEffects', 'drawCurseAuras',
  'drawTFBlackHoles', 'drawTFGravityWells', 'drawTFMeteorCrash', 'drawTFClones', 'drawTFShockwaves', 'drawTFPhaseShift',
  'drawTFRealityTear', 'drawTFCalcStrike', 'drawTFMathBubble', 'drawTFRealityOverride', 'drawTFBurnTrail',
  'drawTFGammaBeam', 'drawTFNeutronStar', 'drawTFGalaxySweep', 'drawTFMultiverse', 'drawTFSupernova', 'drawTFDimensionPunch',
  'drawPhaseTransitionRings', 'drawCinematicWorldEffects', 'drawCinematicImpactWorldEffects', 'drawCinSpeedLines',
  'drawCinMotionTrails', 'drawParadoxEffects', 'drawDivineSummon', 'drawMapPerks',
];
let _pvPassWrapped = false;
function _pvWrapPassFns() {
  _pvPassWrapped = true;
  for (const n of _PV_PASS_FNS) PixelVFX.wrap(window, n);
  if (typeof DomainManager !== 'undefined') { PixelVFX.wrap(DomainManager, 'draw'); PixelVFX.wrap(DomainManager, 'drawHazards'); }
  if (typeof ComboDomain !== 'undefined') { PixelVFX.wrap(ComboDomain, 'draw'); PixelVFX.wrap(ComboDomain, 'drawWorld'); }
  if (typeof Projectile !== 'undefined') PixelVFX.wrap(Projectile.prototype, 'draw');
}

// Per-frame state watcher. Each fighter carries its last-seen values in _pv.
function pixelVfxWatch() {
  if (!_pvOn() || typeof players === 'undefined') return;
  if (!_pvPassWrapped) _pvWrapPassFns();
  const list = players.concat(typeof minions !== 'undefined' ? minions : []);
  for (const f of list) {
    if (!f || typeof f.cx !== 'function') continue;
    const prev = f._pv;
    const now = { hp: f.health, sm: f.superMeter || 0, x: f.cx(), y: f.y + f.h, vx: f.vx || 0 };
    f._pv = now;
    if (f._pvSlashT > 0) f._pvSlashT--;

    // Shield dome while guarding. The fighter's own bubble steps aside for it (Fighter.draw).
    if (f.shielding && f.health > 0 && !f.isBoss && !f._pvShield) {
      f._pvShield = PixelVFX.on(f, 'shield', { radius: 34, hold: 1e6, hits: [], shake: _pvQuiet });
    } else if (f._pvShield && (!f.shielding || f.health <= 0)) {
      if (f._pvShield.drop) f._pvShield.drop();
      f._pvShield = null;
    }
    if (!prev || f.isBoss) continue;

    if (prev.hp <= 0 && now.hp > 0) {
      PixelVFX.spawn('holyLight', { x: now.x, y: now.y, hold: 0.45, width: 9, shake: _pvQuiet });
      continue;
    }
    if (now.hp <= 0) continue;
    if (now.hp - prev.hp >= 5) PixelVFX.on(f, 'heal', { count: Math.min(18, 6 + Math.round((now.hp - prev.hp) / 4)) });
    // Domain aura: a faint tinted power-up pulse every 2.4 s for as long as the fighter holds a domain.
    const _dom = f._comboDomain || (typeof DomainManager !== 'undefined' && DomainManager.ownsDomain && DomainManager.ownsDomain(f));
    if (!_dom) f._pvAuraT = 0;
    else if (f._pvAuraT > 0) f._pvAuraT--;
    else {
      f._pvAuraT = 144;
      PixelVFX.on(f, 'powerUp', { size: 0.5, palette: _pvRampHex(_pvColor(f)), shake: _pvQuiet, flash: _pvQuiet });
    }

    // Teleport: a horizontal jump no run or knockback covers in one frame.
    const dx = now.x - prev.x, dy = now.y - prev.y;
    if (Math.abs(dx) > 150 && Math.abs(dy) < 60) {
      PixelVFX.spawn('movement', { kind: 'blink', x: prev.x, y: prev.y, to: now.x, shake: _pvQuiet });
    } else if (f.onGround && Math.abs(now.vx) > 11 && Math.abs(prev.vx) < 7 &&
               f.state !== 'hurt' && f.state !== 'ragdoll' && f.state !== 'stunned') {
      PixelVFX.spawn('movement', { kind: 'dash', x: prev.x, y: now.y, facing: Math.sign(now.vx), distance: 110, time: 0.12, shake: _pvQuiet });
    }
  }
}
