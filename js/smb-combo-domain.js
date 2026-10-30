// smb-combo-domain.js: Combo Domain. A 10-hit combo opens a domain themed on the
// owner's weapon for 5 seconds. Every hit the owner lands is a direct hit: guards,
// parries, counter stances and projectile deflects/sidesteps don't stop it, shots fly
// straight, and melee swings reach a little further. Each weapon adds its own buff.
// Separate from Conviction (smb-domain.js), which is class-based and opens on the 5th super.
// Loads after smb-combat, smb-particles-core, smb-fighter, smb-domain. Before smb-loop-core.
// Hooks: dealDamage (hit count, guard/counter bypass, comboDomainOnHit), Fighter melee arc,
// spawnBullet spread, Projectile deflects.

'use strict';

const COMBO_DOMAIN_HITS      = 10;
const COMBO_DOMAIN_WINDOW    = 210;  // max gap between hits; matches the COMBO HUD (_HFB_COMBO_WINDOW)
const COMBO_DOMAIN_FRAMES    = 300;  // 5s
const COMBO_DOMAIN_MELEE_PAD = 18;   // extra px on the melee arc test
const COMBO_DOMAIN_DOT_EVERY = 20;   // frames between bleed/burn ticks

// buff keys:
//   power     +35% damage (existing _powerBuff)
//   haste     +35% run speed (existing _speedBuff)
//   rapid     attack and ability cooldowns recover twice as fast
//   lifesteal fraction of damage dealt returned as health
//   bleed     hits leave a 4-tick DoT (burn is the same with fire colours)
//   chain     each hit arcs to the nearest other enemy for half damage
//   quake     each hit sends a shockwave hitting enemies near the target
//   meter     extra super meter per hit
//   guard     guard meter refills while the domain is up
const COMBO_DOMAIN_DEFS = {
  sword:         { name: 'Edge Sanctum',      color: '#cfe0ff', buff: { power: true, bleed: true },     desc: '+35% damage, cuts bleed' },
  hammer:        { name: 'Quake Hall',        color: '#ffaa55', buff: { quake: true, power: true },     desc: 'Every hit sends a shockwave' },
  gun:           { name: 'Kill Zone',         color: '#ffcc33', buff: { rapid: true, chain: true },     desc: 'Double fire rate, rounds ricochet' },
  axe:           { name: "Woodsman's Grove",  color: '#88cc55', buff: { bleed: true, lifesteal: 0.2 },  desc: 'Cuts bleed, 20% lifesteal' },
  spear:         { name: 'Phalanx Line',      color: '#ddddaa', buff: { chain: true, haste: true },     desc: 'Thrusts pierce to a second foe' },
  bow:           { name: "Hunter's Clearing", color: '#66ff99', buff: { rapid: true, meter: 6 },        desc: 'Double draw speed, super charges fast' },
  shield:        { name: 'Bulwark Keep',      color: '#99ddff', buff: { guard: true, lifesteal: 0.25 }, desc: 'Guard refills, 25% lifesteal' },
  scythe:        { name: "Reaper's Field",    color: '#bb66ff', buff: { lifesteal: 0.4 },               desc: '40% lifesteal' },
  fryingpan:     { name: 'Hot Kitchen',       color: '#ff7733', buff: { burn: true, quake: true },      desc: 'Hits burn and splash' },
  broomstick:    { name: 'Sweeping Gale',     color: '#ccffee', buff: { haste: true, rapid: true },     desc: 'Faster feet, faster swings' },
  combat:        { name: 'Fight Pit',         color: '#ff5555', buff: { rapid: true, power: true },     desc: 'Faster, harder punches' },
  peashooter:    { name: 'Garden Barrage',    color: '#77ee44', buff: { rapid: true, meter: 4 },        desc: 'Double fire rate' },
  slingshot:     { name: 'Ricochet Yard',     color: '#ddbb88', buff: { chain: true, power: true },     desc: 'Stones ricochet to a second foe' },
  paperairplane: { name: 'Paper Sky',         color: '#f4f4ff', buff: { chain: true, haste: true },     desc: 'Planes glide on to a second foe' },
  flail:         { name: 'Wrecking Circle',   color: '#bbbbbb', buff: { quake: true, lifesteal: 0.15 }, desc: 'Every hit sends a shockwave' },
  whip:          { name: 'Lash Arena',        color: '#dd8844', buff: { chain: true, bleed: true },     desc: 'Lashes bleed and snap to a second foe' },
  boomerang:     { name: 'Returning Winds',   color: '#55ddcc', buff: { chain: true, rapid: true },     desc: 'Throws arc to a second foe' },
  katana:        { name: 'Iaido Garden',      color: '#ff88aa', buff: { power: true, haste: true },     desc: '+35% damage and speed' },
  flamethrower:  { name: 'Inferno Pit',       color: '#ff5522', buff: { burn: true, power: true },      desc: 'Everything burns' },
  electricstaff: { name: 'Storm Conduit',     color: '#66ccff', buff: { chain: true, meter: 4 },        desc: 'Lightning arcs to a second foe' },
  nullblade:     { name: 'Null Zone',         color: '#8899aa', buff: { power: true, meter: 6 },        desc: '+35% damage, super charges fast' },
  voidblade:     { name: 'Void Hollow',       color: '#9944ff', buff: { lifesteal: 0.25, haste: true }, desc: '25% lifesteal, +35% speed' },
  shockrifle:    { name: 'Overcharge Grid',   color: '#44ffff', buff: { chain: true, power: true },     desc: 'Shots arc to a second foe' },
  cataclysm:     { name: 'Ruin Field',        color: '#ff3300', buff: { quake: true, power: true },     desc: 'Every hit sends a shockwave' },
  lantern:       { name: 'Ghostlight Hall',   color: '#aaffdd', buff: { burn: true, lifesteal: 0.2 },   desc: 'Spirit fire, 20% lifesteal' },
  bomb:          { name: 'Blast Radius',      color: '#ff8800', buff: { quake: true, rapid: true },     desc: 'Bigger blasts, faster throws' },
  fragment:      { name: 'Shard Storm',       color: '#bbeeff', buff: { bleed: true, rapid: true },     desc: 'Shards bleed, faster strikes' },
  knives:        { name: 'Thousand Cuts',     color: '#dddddd', buff: { bleed: true, rapid: true },     desc: 'Knives bleed, faster throws' },
  glassblade:    { name: 'Mirror Hall',       color: '#aaeeff', buff: { power: true, bleed: true },     desc: '+35% damage, cuts bleed' },
  anchor:        { name: 'Abyssal Depths',    color: '#3366aa', buff: { quake: true, lifesteal: 0.15 }, desc: 'Every hit sends a shockwave' },
  crossbow:      { name: 'Bolt Range',        color: '#cc9966', buff: { power: true, meter: 6 },        desc: '+35% damage, super charges fast' },
};
const COMBO_DOMAIN_DEFAULT = { name: 'Combo Domain', color: '#ffffff', buff: { power: true }, desc: '+35% damage' };

const ComboDomain = (() => {
  const _domains = [];      // { owner, def, timer }
  const _pending = [];      // chain/quake hits resolved next frame, never inside dealDamage
  const _dotted  = new Set();

  function _def(owner) {
    return COMBO_DOMAIN_DEFS[owner.weaponKey] || COMBO_DOMAIN_DEFAULT;
  }

  function _foes(owner) {
    const out = [];
    const pools = [players,
      typeof minions !== 'undefined' ? minions : [],
      typeof trainingDummies !== 'undefined' ? trainingDummies : []];
    for (const pool of pools) {
      for (const f of pool) {
        if (f && f !== owner && f.health > 0 && isHostileTarget(owner, f)) out.push(f);
      }
    }
    return out;
  }

  function _open(owner) {
    const def = _def(owner);
    const d = { owner, def, timer: COMBO_DOMAIN_FRAMES };
    _domains.push(d);
    owner._comboDomain = d;
    owner._cdomHits    = 0;
    spawnParticles(owner.cx(), owner.cy(), def.color, 30);
    spawnParticles(owner.cx(), owner.cy(), '#ffffff', 14);
    screenShake = Math.max(screenShake, 10);
    if (typeof SoundManager !== 'undefined' && SoundManager.superActivate) SoundManager.superActivate();
    if (typeof queueAnnouncement === 'function') queueAnnouncement(def.name.toUpperCase() + ': DOMAIN OPEN', def.color);
  }

  function _close(d) {
    const i = _domains.indexOf(d);
    if (i >= 0) _domains.splice(i, 1);
    if (d.owner) {
      d.owner._comboDomain = null;
      d.owner._cdomHits    = 0;
      d.owner._cdomHealPool = 0;
    }
  }

  // Called from dealDamage after health is applied. Records only; no nested damage here.
  function onHit(attacker, target, dmg, isDot, isSplash) {
    const d = attacker && attacker._comboDomain;
    if (!d || !target || target === attacker || dmg <= 0) return;
    const b = d.def.buff;
    if (b.lifesteal && attacker.health > 0) {
      attacker._cdomHealPool = (attacker._cdomHealPool || 0) + dmg * b.lifesteal;
      const _h = Math.min(Math.floor(attacker._cdomHealPool), attacker.maxHealth - attacker.health);
      if (_h >= 1) {
        attacker._cdomHealPool -= _h;
        attacker.health += _h;
        if (settings.dmgNumbers) damageTexts.push(new DamageText(attacker.cx(), attacker.y - 20, '+' + _h, '#44ff44'));
      }
    }
    if (isDot || isSplash) return;
    if (b.meter && !attacker.superActive) {
      attacker.superMeter = Math.min(100, (attacker.superMeter || 0) + b.meter);
      if (!attacker.superReady && attacker.superMeter >= 100) {
        attacker.superReady      = true;
        attacker.superFlashTimer = 90;
      }
    }
    if ((b.bleed || b.burn) && target.health > 0) {
      target._cdomDot = { owner: attacker, left: 4, next: COMBO_DOMAIN_DOT_EVERY, burn: !!b.burn,
                          dmg: Math.max(1, Math.round(dmg * 0.12)) };
      _dotted.add(target);
    }
    if (b.chain) _pending.push({ kind: 'chain', owner: attacker, target, dmg });
    if (b.quake) _pending.push({ kind: 'quake', owner: attacker, target, dmg });
  }

  function _resolvePending() {
    while (_pending.length) {
      const e = _pending.shift();
      if (!e.owner || e.owner.health <= 0) continue;
      const tx = e.target.cx(), ty = e.target.cy();
      if (e.kind === 'chain') {
        let best = null, bestD = 240;
        for (const f of _foes(e.owner)) {
          if (f === e.target) continue;
          const dd = Math.hypot(f.cx() - tx, f.cy() - ty);
          if (dd < bestD) { bestD = dd; best = f; }
        }
        if (!best) continue;
        dealDamage(e.owner, best, Math.max(1, Math.round(e.dmg * 0.5)), 4, 1.0, true, 0);
        const steps = 6;
        for (let i = 1; i <= steps; i++) {
          spawnParticles(tx + (best.cx() - tx) * i / steps, ty + (best.cy() - ty) * i / steps, e.owner._comboDomain ? e.owner._comboDomain.def.color : '#ffffff', 1);
        }
      } else if (e.kind === 'quake') {
        for (const f of _foes(e.owner)) {
          if (f === e.target) continue;
          if (Math.hypot(f.cx() - tx, f.cy() - ty) > 110) continue;
          dealDamage(e.owner, f, Math.max(1, Math.round(e.dmg * 0.45)), 8, 1.0, true, 0);
        }
        spawnParticles(tx, e.target.y + e.target.h, '#ccbb99', 12);
        screenShake = Math.max(screenShake, 5);
      }
    }
  }

  function _tickDots() {
    for (const f of _dotted) {
      const dot = f._cdomDot;
      if (!dot || f.health <= 0 || dot.left <= 0) { f._cdomDot = null; _dotted.delete(f); continue; }
      if (--dot.next > 0) continue;
      dot.next = COMBO_DOMAIN_DOT_EVERY;
      dot.left--;
      dealDamage(dot.owner, f, dot.dmg, 0, 0, true, 0, true);
      spawnParticles(f.cx(), f.cy(), dot.burn ? '#ff6622' : '#cc1122', 4);
    }
  }

  function update() {
    if (!gameRunning || typeof players === 'undefined') return;
    if (activeCinematic) return;
    _resolvePending();
    _tickDots();

    for (const p of players) {
      if (!p || p.health <= 0 || p._comboDomain || p.isAI || p.isRemote || p.isBoss || p.isTrueForm) continue;
      if ((p._cdomHits || 0) >= COMBO_DOMAIN_HITS) _open(p);
    }

    for (let i = _domains.length - 1; i >= 0; i--) {
      const d = _domains[i];
      const o = d.owner;
      if (!o || o.health <= 0 || players.indexOf(o) < 0) { _close(d); continue; }
      const b = d.def.buff;
      if (b.power) o._powerBuff = Math.max(o._powerBuff || 0, 2);
      if (b.haste) o._speedBuff = Math.max(o._speedBuff || 0, 2);
      if (b.rapid) {
        if (o.cooldown > 0)        o.cooldown--;
        if (o.abilityCooldown > 0) o.abilityCooldown--;
      }
      if (b.guard && SHIELD_RULES === 'pool' && !o.shielding) {
        o.shieldHP = Math.min(SHIELD_POOL_MAX, (o.shieldHP || 0) + 0.5);
      }
      if (frameCount % 6 === 0) spawnParticles(o.cx() + (Math.random() - 0.5) * 40, o.y + o.h, d.def.color, 1);
      if (--d.timer <= 0) _close(d);
    }
  }

  function _rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // Screen-space tint, drawn with the Conviction tint before world entities.
  function draw() {
    if (!gameRunning || _domains.length === 0) return;
    const d = _domains[0];
    const fade = Math.min(1, (COMBO_DOMAIN_FRAMES - d.timer) / 15, d.timer / 30);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = _rgba(d.def.color, 0.10 * fade);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  // World-space aura ring around each owner.
  function drawWorld() {
    if (!gameRunning) return;
    for (const d of _domains) {
      const o = d.owner;
      const t = frameCount * 0.05;
      const fade = Math.min(1, (COMBO_DOMAIN_FRAMES - d.timer) / 15, d.timer / 30);
      const r = 46 + Math.sin(t * 2) * 3;
      ctx.save();
      ctx.globalAlpha = 0.75 * fade;
      ctx.strokeStyle = d.def.color;
      ctx.shadowColor = d.def.color;
      ctx.shadowBlur  = 12;
      ctx.lineWidth   = 2.5;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -t * 20;
      ctx.beginPath();
      ctx.ellipse(o.cx(), o.cy(), r, r * 0.9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.35 * fade;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.ellipse(o.cx(), o.y + o.h, r * 1.2, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawHUD() {
    if (!gameRunning || _domains.length === 0) return;
    const cW = canvas.width, cH = canvas.height;
    const BAR_W = 160, BAR_H = 6;
    const convictionUp = typeof DomainManager !== 'undefined' && DomainManager.anyActive();
    let y = cH * 0.09 + (convictionUp ? 34 : 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textAlign = 'center';
    for (const d of _domains) {
      const frac = d.timer / COMBO_DOMAIN_FRAMES;
      const bx = cW / 2 - BAR_W / 2;
      const title = d.def.name + '  ·  DIRECT HIT';
      ctx.font        = 'bold 13px Arial';
      ctx.lineWidth   = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(title, cW / 2, y);
      ctx.fillStyle   = d.def.color;
      ctx.shadowColor = d.def.color;
      ctx.shadowBlur  = 10;
      ctx.fillText(title, cW / 2, y);
      ctx.shadowBlur = 0;
      ctx.fillStyle  = 'rgba(0,0,0,0.52)';
      ctx.fillRect(bx, y + 4, BAR_W, BAR_H);
      ctx.fillStyle  = d.def.color;
      ctx.fillRect(bx, y + 4, BAR_W * frac, BAR_H);
      ctx.font       = '11px Arial';
      ctx.strokeText(d.def.desc, cW / 2, y + 23);
      ctx.fillStyle  = '#ffffff';
      ctx.fillText(d.def.desc, cW / 2, y + 23);
      y += 38;
    }
    ctx.restore();
  }

  function reset() {
    for (const d of _domains.slice()) _close(d);
    _pending.length = 0;
    for (const f of _dotted) f._cdomDot = null;
    _dotted.clear();
    if (typeof players !== 'undefined') for (const p of players) if (p) p._cdomHits = 0;
  }

  return { update, onHit, draw, drawWorld, drawHUD, reset, defFor: _def,
           isActive: (f) => !!(f && f._comboDomain) };
})();

function comboDomainOnHit(attacker, target, dmg, isDot, isSplash) {
  ComboDomain.onHit(attacker, target, dmg, isDot, isSplash);
}
