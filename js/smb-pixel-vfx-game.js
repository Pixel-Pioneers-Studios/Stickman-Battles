'use strict';
// smb-pixel-vfx-game.js: where the game triggers the pixel-art VFX (smb-pixel-vfx.js, js/vfx/).
// Direct calls: pixelSwingFX (Fighter.attack), pixelHitFX (dealDamage), pixelBlastFX (bombs, Cataclysm),
// pixelPickupFX (BR / Endless pickups). Everything that is a change of state rather than an event
// (heals, respawns, supers, shields, teleports, dashes) is read by pixelVfxWatch() once a frame, so none of
// the many places that heal or teleport a fighter needs touching. Render-only; never changes game state.

const _pvQuiet = () => {};
// Swing archetypes that read as an arc. Thrusts, whips and punches keep their own trails.
const _PV_ARC_SWINGS = { slash: 1, iai: 1, cleave: 1, sweep: 1, smash: 1 };
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

// Per-frame state watcher. Each fighter carries its last-seen values in _pv.
function pixelVfxWatch() {
  if (!_pvOn() || typeof players === 'undefined') return;
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
    if (prev.sm >= 90 && now.sm < 30) PixelVFX.on(f, 'powerUp', { size: 0.75, shake: _pvQuiet });

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
