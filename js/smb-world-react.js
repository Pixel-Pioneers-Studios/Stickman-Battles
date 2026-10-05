'use strict';
// smb-world-react.js — the arena answers a blow instead of only the body taking it.
// Air pressure, ground kick-up, impact light, skid scuffs, weapon scrapes, and
// loose matter that the next hit blows around.
// Depends on: smb-globals.js, smb-particles-core.js, smb-destruction.js
//
// PURELY VISUAL, same contract as smb-destruction.js: nothing here is read by
// collision, AI, pickSafeSpawn(), or the network layer, and platform geometry
// is never mutated.

const WR_MAX_MOTES  = 180;
const WR_MAX_WAVES  = 8;
const WR_MAX_LIGHTS = 6;
const WR_MAX_SCUFFS = 36;
const WR_WAVE_SPEED = 18;   // px/frame the pressure front travels before it reaches the ground

let _wrMotes   = [];   // loose arena matter: { kind, x, y, vx, vy, size, color, life, maxLife, rot, vr, ph }
let _wrWaves   = [];   // air pressure fronts: { x, y, ang, r, maxR, life, maxLife }
let _wrRings   = [];   // pressure meeting a surface: { x, y, r, maxR, life, maxLife, color }
let _wrLights  = [];   // impact light thrown onto the world: { x, y, r, color, life, maxLife, a }
let _wrScuffs  = [];   // skid / gouge marks, platform-local: { pl, lx0, lx1, ly, w, color, life, maxLife }
let _wrPending = [];   // ground reactions waiting for the pressure front: { t, x, pl, power, dir }

// What each world is made of when something kicks it loose. `air: false`
// means there is nothing to carry a pressure wave (space), so only light and
// the surface itself react.
const WR_MATTER = {
  grass:      { kind: 'leaf',   colors: ['#6fa84a', '#8cc35c', '#4f8a35'] },
  forest:     { kind: 'leaf',   colors: ['#5c8a3a', '#a07a3a', '#7aa04a', '#b8862e'] },
  rural:      { kind: 'leaf',   colors: ['#7aa04a', '#a8903a'] },
  homeYard:   { kind: 'leaf',   colors: ['#6fa84a', '#8cc35c'] },
  suburb:     { kind: 'leaf',   colors: ['#6fa84a', '#a07a3a'] },
  ice:        { kind: 'snow',   colors: ['#ffffff', '#dff2ff', '#c8e6ff'] },
  clouds:     { kind: 'snow',   colors: ['#ffffff', '#eef4ff'] },
  lava:       { kind: 'ember',  colors: ['#ffb040', '#ff6a20', '#ffe080'] },
  volcano:    { kind: 'ember',  colors: ['#ffb040', '#ff6a20', '#ffe080'] },
  damnation:  { kind: 'ember',  colors: ['#ff5030', '#ffa040'] },
  underwater: { kind: 'bubble', colors: ['#bfefff', '#8fd8ff'] },
  cyberpunk:  { kind: 'spark',  colors: ['#40f0ff', '#ff40c0', '#ffffff'] },
  neonGrid:   { kind: 'spark',  colors: ['#40f0ff', '#ff40c0'] },
  warpzone:   { kind: 'spark',  colors: ['#c080ff', '#60e0ff'] },
  mushroom:   { kind: 'spore',  colors: ['#e8a0ff', '#ffd0f0', '#a0f0ff'] },
  haunted:    { kind: 'spore',  colors: ['#a0ffb0', '#d0d0ff'] },
  desert:     { kind: 'dust',   colors: ['#e0c080', '#c9a560', '#f0d8a0'] },
  space:      { kind: 'none',   air: false },
};

function _wrMatter() {
  const a = (typeof currentArena !== 'undefined' && currentArena) ? currentArena : null;
  const key = (a && (a.themeKey || a.designerBase)) || (typeof currentArenaKey !== 'undefined' ? currentArenaKey : '');
  const m = WR_MATTER[key];
  if (m) return m;
  // Everything else throws up dust the colour of its own ground.
  const base = (typeof _destSurfaceColor === 'function') ? _destSurfaceColor() : '#8a8a8a';
  const lit  = (typeof _destShade === 'function') ? _destShade(base, 0.35) : '#b0b0b0';
  const pale = (typeof _destShade === 'function') ? _destShade(base, 0.55) : '#d0d0d0';
  return { kind: 'dust', colors: [lit, pale] };
}

function _wrOn() {
  return !(typeof settings !== 'undefined' && settings && !settings.particles);
}

// Topmost surface at or below (x, y) within `reach` px, ignoring disabled floors.
function _wrSurfaceBelow(x, y, reach) {
  if (typeof currentArena === 'undefined' || !currentArena || !currentArena.platforms) return null;
  let best = null, bestD = reach;
  for (const p of currentArena.platforms) {
    if (p.isFloorDisabled) continue;
    if (x < p.x || x > p.x + p.w) continue;
    const d = p.y - y;
    if (d >= -4 && d < bestD) { bestD = d; best = p; }
  }
  return best;
}

// ── Motes ───────────────────────────────────────────────────
function _wrMote(kind, x, y, vx, vy, color, sizeMul) {
  if (_wrMotes.length >= WR_MAX_MOTES) _wrMotes.shift();
  const s = sizeMul || 1;
  let life, size;
  switch (kind) {
    case 'leaf':   life = 90 + Math.random() * 60; size = (2.2 + Math.random() * 1.8) * s; break;
    case 'snow':   life = 70 + Math.random() * 40; size = (1.2 + Math.random() * 1.6) * s; break;
    case 'ember':  life = 40 + Math.random() * 30; size = (1.0 + Math.random() * 1.4) * s; break;
    case 'bubble': life = 60 + Math.random() * 40; size = (1.6 + Math.random() * 2.4) * s; break;
    case 'spark':  life = 18 + Math.random() * 14; size = (0.8 + Math.random() * 1.0) * s; break;
    case 'spore':  life = 90 + Math.random() * 50; size = (1.2 + Math.random() * 1.4) * s; break;
    default:       life = 34 + Math.random() * 26; size = (2.6 + Math.random() * 3.0) * s; break;
  }
  _wrMotes.push({ kind, x, y, vx, vy, color, size, life, maxLife: life,
                  rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
                  ph: Math.random() * Math.PI * 2 });
}

// Matter kicked off a surface, travelling outward along it.
function _wrKickAlong(x, surfY, power, dirBias) {
  const m = _wrMatter();
  if (m.kind === 'none') return;
  const n = Math.round(5 + power * 13);
  for (let i = 0; i < n; i++) {
    const side = (dirBias && Math.random() < 0.65) ? dirBias : (Math.random() < 0.5 ? -1 : 1);
    const sp   = (1.2 + Math.random() * 3.6) * (0.55 + power * 0.6);
    let vy = -(0.3 + Math.random() * 1.5) * (0.6 + power * 0.5);
    // Light matter is thrown higher than it is pushed sideways.
    if (m.kind === 'leaf' || m.kind === 'snow' || m.kind === 'spore') vy *= 2.0;
    if (m.kind === 'ember' || m.kind === 'spark') vy *= 2.6;
    const c = m.colors[Math.floor(Math.random() * m.colors.length)];
    _wrMote(m.kind, x + (Math.random() - 0.5) * 14, surfY - 1 - Math.random() * 3,
            side * sp, vy, c, m.kind === 'dust' ? 0.7 + power * 0.5 : 1);
  }
}

// ── Impulse: everything loose near a blow gets shoved by it ──
function _wrImpulse(x, y, power) {
  const R  = 60 + power * 110;
  const R2 = R * R;
  const push = (o, k) => {
    const dx = o.x - x, dy = o.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 > R2 || d2 < 1) return 0;
    const d = Math.sqrt(d2);
    const f = (1 - d / R) * power * k;
    o.vx += (dx / d) * f;
    o.vy += (dy / d) * f - f * 0.25;
    return f;
  };
  for (const o of _wrMotes) push(o, 4.2);
  if (typeof particles !== 'undefined' && particles) {
    for (const o of particles) if (!o.isBlood) push(o, 2.0);
  }
  if (typeof debrisChunks !== 'undefined' && debrisChunks) {
    for (const c of debrisChunks) {
      const f = push(c, 3.2);
      // Rubble that had already settled hops again.
      if (f > 0.4 && c.bounces >= 2) { c.bounces = 1; c.vy = Math.min(c.vy, -f * 1.4); c.vr = (Math.random() - 0.5) * 0.4; }
    }
  }
}

function _wrLight(x, y, color, power) {
  if (_wrLights.length >= WR_MAX_LIGHTS) _wrLights.shift();
  const life = Math.round(9 + power * 7);
  _wrLights.push({ x, y, color, r: 70 + power * 120, a: Math.min(0.42, 0.14 + power * 0.18), life, maxLife: life });
}

function _wrScuff(pl, x0, x1, w, color, life) {
  if (_wrScuffs.length >= WR_MAX_SCUFFS) _wrScuffs.shift();
  const s = { pl, lx0: x0 - pl.x, lx1: x1 - pl.x, ly: 1, w, color, life, maxLife: life };
  _wrScuffs.push(s);
  return s;
}

function _wrScuffColor() {
  const base = (typeof _destSurfaceColor === 'function') ? _destSurfaceColor() : '#8a8a8a';
  if (typeof _destShade !== 'function') return '#333333';
  return _destShade(base, (typeof _destLum === 'function' && _destLum(base) > 0.45) ? -0.5 : -0.32);
}

// ── Public: a hit landed ────────────────────────────────────
// Called from dealDamage() after knockback is applied. `guarded` hits still
// move the air, just far less.
function worldReactHit(attacker, target, dmg, kb, guarded, isSplash) {
  if (!_wrOn() || !target || typeof target.cx !== 'function') return;
  if (!attacker || dmg < 3) return;

  const w = attacker.weapon || null;
  let power = dmg / 28;
  if (w && w.weaponType === 'heavy') power *= 1.25;
  if (attacker.isBoss || attacker.isTrueForm) power *= 1.3;
  if (guarded)  power *= 0.4;
  if (isSplash) power *= 0.5;
  power = Math.max(0.15, Math.min(1.8, power));

  const hx = target.cx(), hy = target.cy();
  let dx = hx - attacker.cx(), dy = hy - attacker.cy();
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) { dx = attacker.facing || 1; dy = 0; }
  const dir = dx >= 0 ? 1 : -1;
  const m = _wrMatter();

  // Light: the flash lands on the ground and the scenery, not just the body.
  const col = (attacker.isBoss || attacker.isTrueForm) ? '#d8a0ff'
            : guarded ? '#bfe0ff'
            : (w && w.type === 'ranged') ? '#ffe0b0'
            : (w && w.weaponType === 'heavy') ? '#ffd2a0' : '#eaf4ff';
  if (power >= 0.3) _wrLight(hx, hy, col, power);

  // Pressure front through the air, stretched along the line of the blow.
  if (m.air !== false && power >= 0.35) {
    if (_wrWaves.length >= WR_MAX_WAVES) _wrWaves.shift();
    const life = Math.round(12 + power * 6);
    _wrWaves.push({ x: hx, y: hy, ang: Math.atan2(dy, dx), r: 6, maxR: 30 + power * 50, life, maxLife: life });
  }

  _wrImpulse(hx, hy, power);

  // The ground under the blow answers once the pressure reaches it.
  if ((target._wrGroundCd || 0) <= 0) {
    const pl = _wrSurfaceBelow(hx, hy, 150);
    if (pl) {
      target._wrGroundCd = 5;
      const drop = Math.max(0, pl.y - hy);
      _wrPending.push({ t: Math.round(drop / WR_WAVE_SPEED), x: hx, pl, power: power * (1 - drop / 220), dir,
                        crack: !guarded && power >= 0.9 && drop < 60 });
    }
  }

  // Hard knockback drags the body along the floor; the update loop draws it.
  if (!guarded && kb >= 7) target._wrSkid = Math.max(target._wrSkid || 0, 34);
}

// ── Public: a projectile struck a platform ──────────────────
function worldReactProjectile(proj, pl) {
  if (!_wrOn() || !proj || !pl || proj._isFlame || proj._flameFx) return;
  if (typeof gameMode !== 'undefined' && gameMode === 'battleroyale' &&
      typeof _brIsAudibleHit === 'function' && !_brIsAudibleHit(proj.owner, proj.owner)) return;
  const power = Math.max(0.2, Math.min(1.1, (proj.damage || 8) / 20));
  const px = proj.x - proj.vx;
  const side = px <= pl.x || px >= pl.x + pl.w;
  if (typeof spawnImpact === 'function') {
    if (side) {
      const ej = proj.vx > 0 ? -1 : 1;
      spawnImpact(proj.vx > 0 ? pl.x : pl.x + pl.w, proj.y, power * 0.55,
                  { pl, axis: 'v', eject: ej, shake: 0, chunks: 1 + Math.round(power * 2), noScar: power < 0.45 });
    } else {
      spawnImpact(proj.x, pl.y, power * 0.55,
                  { pl, shake: 0, chunks: 1 + Math.round(power * 2), noScar: power < 0.45 });
      _wrKickAlong(proj.x, pl.y, power * 0.5, proj.vx > 0 ? 1 : -1);
    }
  }
  _wrLight(proj.x, proj.y, '#ffe0b0', power * 0.6);
  _wrImpulse(proj.x, proj.y, power * 0.5);
}

// ── Per-frame update ────────────────────────────────────────
function updateWorldReact() {
  const ts = (typeof slowMotion === 'number' && slowMotion > 0) ? slowMotion : 1;

  for (let i = _wrPending.length - 1; i >= 0; i--) {
    const e = _wrPending[i];
    if ((e.t -= ts) > 0) continue;
    _wrPending.splice(i, 1);
    if (!e.pl || e.pl.isFloorDisabled || e.power < 0.1) continue;
    const gx = Math.max(e.pl.x, Math.min(e.pl.x + e.pl.w, e.x));
    if (_wrMatter().air !== false) {
      _wrKickAlong(gx, e.pl.y, e.power, e.dir);
      _wrRings.push({ x: gx, y: e.pl.y, r: 4, maxR: 30 + e.power * 70, life: 16, maxLife: 16,
                      color: _wrMatter().colors ? _wrMatter().colors[0] : '#cccccc' });
      if (_wrRings.length > WR_MAX_WAVES) _wrRings.shift();
    }
    if (e.crack && typeof spawnImpact === 'function') {
      spawnImpact(gx, e.pl.y, Math.min(1.2, e.power * 0.75),
                  { pl: e.pl, shake: 0, chunks: Math.round(2 + e.power * 3), noScar: e.power < 1.15 });
    }
  }

  for (let i = _wrWaves.length - 1; i >= 0; i--) {
    const w = _wrWaves[i];
    w.life -= ts;
    w.r += (w.maxR - w.r) * 0.28 * ts;
    if (w.life <= 0) _wrWaves.splice(i, 1);
  }
  for (let i = _wrRings.length - 1; i >= 0; i--) {
    const r = _wrRings[i];
    r.life -= ts;
    r.r += (r.maxR - r.r) * 0.2 * ts;
    if (r.life <= 0) _wrRings.splice(i, 1);
  }
  for (let i = _wrLights.length - 1; i >= 0; i--) {
    if ((_wrLights[i].life -= ts) <= 0) _wrLights.splice(i, 1);
  }
  for (let i = _wrScuffs.length - 1; i >= 0; i--) {
    if ((_wrScuffs[i].life -= ts) <= 0) _wrScuffs.splice(i, 1);
  }

  for (let i = _wrMotes.length - 1; i >= 0; i--) {
    const o = _wrMotes[i];
    o.ph += 0.12 * ts;
    switch (o.kind) {
      case 'leaf':
        o.vy = Math.min(o.vy + 0.05 * ts, 1.1);
        o.vx *= Math.pow(0.97, ts);
        o.x  += Math.sin(o.ph) * 0.7 * ts;
        o.rot += (o.vr + Math.sin(o.ph) * 0.06) * ts;
        break;
      case 'snow': case 'spore':
        o.vy = Math.min(o.vy + 0.025 * ts, o.kind === 'snow' ? 0.8 : 0.3);
        o.vx *= Math.pow(0.95, ts);
        o.x  += Math.sin(o.ph) * 0.35 * ts;
        break;
      case 'ember':
        o.vy -= 0.04 * ts;
        o.vx *= Math.pow(0.95, ts);
        o.x  += Math.sin(o.ph * 1.6) * 0.3 * ts;
        break;
      case 'bubble':
        o.vy = Math.max(o.vy - 0.05 * ts, -1.6);
        o.vx *= Math.pow(0.9, ts);
        o.x  += Math.sin(o.ph * 1.3) * 0.45 * ts;
        break;
      case 'spark':
        o.vy += 0.28 * ts;
        break;
      default: // dust: billows, spreads, settles
        o.vy = o.vy * Math.pow(0.9, ts) + 0.02 * ts;
        o.vx *= Math.pow(0.91, ts);
        o.size += 0.06 * ts;
        break;
    }
    o.x += o.vx * ts;
    o.y += o.vy * ts;
    o.life -= ts;
    if (o.life <= 0 || o.y > GAME_H + 80) _wrMotes.splice(i, 1);
  }

  _wrUpdateFighters(ts);
}

// Skids from knockback, and weapon tips dragged across the ground.
function _wrUpdateFighters(ts) {
  const pool = [];
  if (typeof players !== 'undefined' && players) pool.push(...players);
  if (typeof minions !== 'undefined' && minions) pool.push(...minions);
  const m = _wrMatter();
  for (const f of pool) {
    if (!f || f.health <= 0) continue;
    if (f._wrGroundCd > 0) f._wrGroundCd -= ts;

    if (f._wrSkid > 0) {
      f._wrSkid -= ts;
      const spd = Math.abs(f.vx || 0);
      if (f.onGround && spd > 3.2) {
        const fx = f.cx(), fy = f.y + f.h;
        const pl = _wrSurfaceBelow(fx, fy - 2, 8);
        if (pl) {
          // One continuous scuff per slide, extended while it lasts.
          const s = f._wrScuffRef;
          if (s && s.pl === pl && f._wrScuffFrame === frameCount - 1) {
            const lx = fx - pl.x;
            if (lx < s.lx0) s.lx0 = lx; else if (lx > s.lx1) s.lx1 = lx;
            s.life = s.maxLife;
          } else {
            f._wrScuffRef = _wrScuff(pl, fx, fx, Math.min(3, 1.2 + spd * 0.12), _wrScuffColor(), 360);
          }
          f._wrScuffFrame = frameCount;
          if (m.kind !== 'none' && (frameCount & 1) === 0) {
            const back = f.vx > 0 ? -1 : 1;
            const c = m.colors[Math.floor(Math.random() * m.colors.length)];
            _wrMote(m.kind, fx - back * 4, pl.y - 2, back * (0.5 + Math.random() * 1.5) + f.vx * 0.15,
                    -(0.4 + Math.random() * 1.4) * (m.kind === 'dust' ? 1 : 1.8), c, 0.8);
          }
        }
      }
    }

    // Weapon tip dragged through a surface mid-swing: sparks for metal on
    // stone, a gouge, and a little of whatever the ground is made of.
    if (f._wrScrapeCd > 0) f._wrScrapeCd -= ts;
    const tip = f._weaponTip;
    if (tip && tip.attacking && f.attackTimer > 0 && f.weapon && f.weapon.type === 'melee' && !(f._wrScrapeCd > 0)) {
      const pl = _wrSurfaceBelow(tip.x, tip.y - 6, 14);
      if (pl && tip.y >= pl.y - 4) {
        f._wrScrapeCd = 2;
        const heavy = f.weapon.weaponType === 'heavy';
        if (typeof spawnParticlesDir === 'function') {
          spawnParticlesDir(tip.x, pl.y - 1, heavy ? '#ffcf80' : '#fff2c8', heavy ? 4 : 3, -(f.facing || 1), -0.8, 0.6);
        }
        const fresh = frameCount - (f._wrScrapeLast || -99) > 4;
        if (fresh && m.kind !== 'none') _wrKickAlong(tip.x, pl.y, heavy ? 0.5 : 0.25, f.facing || 1);
        _wrScuff(pl, tip.x - 4, tip.x + 4, heavy ? 2 : 1.2, _wrScuffColor(), 300);
        f._wrScrapeLast = frameCount;
        if (fresh) _wrImpulse(tip.x, pl.y, heavy ? 0.35 : 0.2);
      }
    }
  }
}

// ── Draw: on the world, under the fighters (call after drawSurfaceScars) ──
function drawWorldReactBack() {
  if (typeof currentArena === 'undefined' || !currentArena || !currentArena.platforms) return;

  for (const s of _wrScuffs) {
    const pl = s.pl;
    if (!pl || pl.isFloorDisabled || currentArena.platforms.indexOf(pl) < 0) continue;
    const t = s.life / s.maxLife;
    const a = t > 0.7 ? 1 : t / 0.7;
    const x0 = pl.x + s.lx0, x1 = pl.x + s.lx1;
    if (x1 - x0 < 1) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(pl.x, pl.y, pl.w, pl.h);
    ctx.clip();
    ctx.globalAlpha = 0.5 * a;
    ctx.fillStyle = s.color;
    ctx.fillRect(x0, pl.y + s.ly, x1 - x0, s.w);
    ctx.globalAlpha = 0.28 * a;
    ctx.fillRect(x0 + 2, pl.y + s.ly + s.w + 1, Math.max(0, x1 - x0 - 4), 0.8);
    ctx.restore();
  }

  for (const r of _wrRings) {
    const t = r.life / r.maxLife;
    ctx.save();
    ctx.globalAlpha = 0.45 * t;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 1.2 + 2.2 * t;
    ctx.beginPath();
    ctx.ellipse(r.x, r.y - 1, r.r, Math.max(1, r.r * 0.16), 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (_wrLights.length) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const L of _wrLights) {
      const t = L.life / L.maxLife;
      const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
      g.addColorStop(0, L.color);
      g.addColorStop(0.35, L.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = L.a * t * t;
      ctx.fillStyle = g;
      ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ── Draw: in the air, with the particle pass ────────────────
function drawWorldReactFront() {
  for (const w of _wrWaves) {
    const t = w.life / w.maxLife;
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(w.ang);
    // A faint dark band trailing a bright leading edge, both only on the side
    // the blow travelled: air being shoved, not one more coloured ring.
    ctx.globalAlpha = 0.09 * t;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3 * t + 0.6;
    ctx.beginPath();
    ctx.ellipse(w.r * 0.22, 0, w.r * 0.95, w.r * 0.8, 0, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
    ctx.globalAlpha = 0.42 * t;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6 * t + 0.4;
    ctx.beginPath();
    ctx.ellipse(w.r * 0.22, 0, w.r * 1.05, w.r * 0.85, 0, -Math.PI * 0.38, Math.PI * 0.38);
    ctx.stroke();
    ctx.restore();
  }

  if (!_wrMotes.length) { ctx.globalAlpha = 1; return; }
  ctx.save();
  for (const o of _wrMotes) {
    const t = o.life / o.maxLife;
    const fade = t > 0.4 ? 1 : t / 0.4;
    switch (o.kind) {
      case 'leaf':
        ctx.globalAlpha = 0.9 * fade;
        ctx.fillStyle = o.color;
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.rotate(o.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, o.size, o.size * 0.42 * (0.4 + Math.abs(Math.cos(o.ph))), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      case 'bubble':
        ctx.globalAlpha = 0.6 * fade;
        ctx.strokeStyle = o.color;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.size, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'ember': case 'spark': case 'spore':
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (o.kind === 'spore' ? 0.5 : 0.9) * fade * (o.kind === 'ember' ? 0.7 + 0.3 * Math.sin(o.ph * 3) : 1);
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        break;
      case 'snow':
        ctx.globalAlpha = 0.85 * fade;
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.size, 0, Math.PI * 2);
        ctx.fill();
        break;
      default:
        ctx.globalAlpha = 0.32 * fade;
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.size, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function resetWorldReact() {
  _wrMotes = []; _wrWaves = []; _wrRings = []; _wrLights = []; _wrScuffs = []; _wrPending = [];
}

if (typeof window !== 'undefined') {
  window.worldReactHit        = worldReactHit;
  window.worldReactProjectile = worldReactProjectile;
  window.resetWorldReact      = resetWorldReact;
}
