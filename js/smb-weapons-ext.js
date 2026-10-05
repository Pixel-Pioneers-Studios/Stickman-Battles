'use strict';
// smb-weapons-ext.js — runtime for Bomb, Fragment, Throwing Knives, Glass Blade,
// Anchor and Crossbow, plus the Demolitionist / Warden / Adept class passives.
// Depends on: smb-globals.js, smb-combat.js (dealDamage, isHostileTarget,
//             applyLaunch), smb-particles-core.js, smb-data-weapons.js
// Must load AFTER smb-fighter.js.
//
// Fighter calls in through six hooks, all typeof-guarded so this file is optional:
//   wxUpdateFighter(f)            per-frame, from Fighter.update()
//   wxDrawFighter(f)              world-space entity pass, from Fighter.draw()
//   wxDrawWeaponArt(f, k, atk)    in-hand art, from Fighter.drawWeapon()
//   wxResetFighter(f)             from Fighter.respawn()
//   wxDamageMods / wxKnockbackMods  from dealDamage()
// Weapon entries in WEAPONS reach the rest through customShot / customAttack /
// ability / superMove.
//
// Every hit goes through dealDamage(). Entities live on their owner, like the
// existing per-weapon hazards, and are listed in SMK2_OWNED_HAZARDS so Sovereign
// can see them.

// ── Shared helpers ───────────────────────────────────────────────────────────
function _wxAll() {
  const out = [];
  if (typeof players !== 'undefined' && Array.isArray(players)) for (const f of players) out.push(f);
  if (typeof trainingDummies !== 'undefined' && Array.isArray(trainingDummies)) for (const f of trainingDummies) out.push(f);
  if (typeof minions !== 'undefined' && Array.isArray(minions)) for (const f of minions) out.push(f);
  return out;
}

function _wxHostiles(owner) {
  return _wxAll().filter(f => f && f.health > 0 && isHostileTarget(owner, f));
}

function _wxPlatforms() {
  return (typeof currentArena !== 'undefined' && currentArena && currentArena.platforms) || [];
}

function _wxMapBottom() {
  return (typeof currentArena !== 'undefined' && currentArena && currentArena.mapBottom) || (GAME_H + 160);
}

function _wxFrame() { return typeof frameCount !== 'undefined' ? frameCount : 0; }

// Solid (non one-way) platform containing the point, or null.
function _wxSolidAt(x, y) {
  for (const pl of _wxPlatforms()) {
    if (pl.passUnder || pl.isHidden) continue;
    if (x > pl.x && x < pl.x + pl.w && y > pl.y && y < pl.y + pl.h) return pl;
  }
  return null;
}

// Lands a falling object of radius r on a platform top it crossed this frame.
function _wxLand(o, r) {
  if (o.vy < 0) return null;
  for (const pl of _wxPlatforms()) {
    if (pl.isHidden) continue;
    if (o.x < pl.x - 1 || o.x > pl.x + pl.w + 1) continue;
    if (o.py + r <= pl.y + 2 && o.y + r >= pl.y) { o.y = pl.y - r; return pl; }
  }
  return null;
}

// Body overlap test against a fighter's box, padded by r.
function _wxTouches(f, x, y, r) {
  return x > f.x - r && x < f.x + f.w + r && y > f.y - r && y < f.y + f.h + r;
}

// Hits dealt by these entities are tagged so the Glass Blade crack penalty,
// which scales the blade's own swings, leaves its shards alone.
let _wxInHit = false;
function _wxHit(owner, t, dmg, kb, iframes) {
  if (!t || t.health <= 0 || !owner) return false;
  const hp = t.health;
  _wxInHit = true;
  try { dealDamage(owner, t, Math.max(1, Math.round(dmg)), kb, 1.0, false, iframes == null ? 16 : iframes); }
  finally { _wxInHit = false; }
  return t.health < hp;
}

// dealDamage pushes away from the ATTACKER; a blast or a returning knife should
// push away from where it actually is.
function _wxPushFrom(t, x) {
  if (!t._lastHitCtx || t._lastHitCtx.frame !== _wxFrame()) return;
  const dir = (t.cx() - x) >= 0 ? 1 : -1;
  if (t.vx * dir < 0) t.vx = -t.vx;
}

// ability() plays a swing animation, and a melee swing arc deals weapon damage.
// For abilities where the weapon has left the hand, mark every hostile as already
// struck this swing so the animation cannot land (or hand out i-frames).
function _wxNoSwingHit(user) {
  if (!user.swingHitTargets) return;
  for (const t of _wxHostiles(user)) user.swingHitTargets.add(t);
}

// Per-target damage cap for multi-hit volleys (Recall, Fan of Steel, shards).
function _wxCapped(capMap, t, dmg, cap) {
  const used = capMap.get(t) || 0;
  const allowed = Math.min(dmg, cap - used);
  if (allowed <= 0) return 0;
  capMap.set(t, used + allowed);
  return allowed;
}

// World FX (blast rings, laser, shatter flashes), drawn once per frame.
const _wxFx = [];
function _wxAddFx(fx) { fx.t = 0; _wxFx.push(fx); if (_wxFx.length > 80) _wxFx.shift(); }

// ── Blast queue ──────────────────────────────────────────────────────────────
// Bomb explosions resolve together, once per frame. A target caught in several
// blasts at once takes the biggest in full plus half of the rest, capped — so
// six stickies on one body is a heavy hit, not six separate ones (the i-frames
// dealDamage grants after the first would swallow those anyway).
const _wxBlasts = [];
let _wxStepFrame = -1;

function _wxQueueBlast(owner, x, y, r, dmg, kb, giga) {
  if (owner && owner.charClass === 'demolitionist') r *= 1.2;
  _wxBlasts.push({ owner, x, y, r, dmg, kb, giga: !!giga });
  if (settings.particles) {
    spawnParticles(x, y, '#ff8a3d', giga ? 40 : 16);
    spawnParticles(x, y, '#ffd27a', giga ? 22 : 8);
    spawnParticles(x, y, '#555555', giga ? 18 : 6);
  }
  spawnRing(x, y);
  _wxAddFx({ kind: 'blast', x, y, r, max: giga ? 26 : 16 });
  screenShake = Math.max(screenShake, giga ? 34 : 10);
  if (typeof SoundManager !== 'undefined' && SoundManager.explosion) SoundManager.explosion();
}

function _wxResolveBlasts() {
  if (!_wxBlasts.length) return;
  const blasts = _wxBlasts.splice(0, _wxBlasts.length);
  const all = _wxAll();
  // Chain Reaction: a blast sets off every bomb it reaches in the same frame, so
  // the whole chain lands as one grouped hit instead of being eaten by i-frames.
  for (let i = 0; i < blasts.length; i++) {
    const b = blasts[i];
    for (const f of all) {
      if (!f || !f._wxBombs) continue;
      for (const bm of f._wxBombs) {
        if (bm.dead || Math.hypot(bm.x - b.x, bm.y - b.y) >= b.r + bm.r) continue;
        bm.dead = true;
        _wxQueueBlast(f, bm.x, bm.y, bm.blastR, bm.dmg, bm.kb, bm.giga);
        blasts.push(_wxBlasts.pop());
      }
    }
  }
  for (const t of all) {
    if (!t || t.health <= 0) continue;
    const hits = [];
    for (const b of blasts) {
      if (!b.owner || !isHostileTarget(b.owner, t)) continue;
      if (Math.hypot(t.cx() - b.x, t.cy() - b.y) < b.r + 14) hits.push(b);
    }
    if (!hits.length) continue;
    hits.sort((a, b) => b.dmg - a.dmg);
    const top = hits[0];
    let dmg = top.dmg, kb = top.kb;
    for (let i = 1; i < hits.length; i++) { dmg += hits[i].dmg * 0.5; kb += hits[i].kb * 0.25; }
    dmg = Math.min(dmg, Math.max(top.dmg, 36));
    kb  = Math.min(kb, Math.max(top.kb, 20));
    _wxHit(top.owner, t, dmg, kb);
    _wxPushFrom(t, top.x);
  }
  // Own blasts never hurt the thrower, but they do move them — the bomb-jump.
  const pushed = new Set();
  for (const b of blasts) {
    const o = b.owner;
    if (!o || o.health <= 0 || pushed.has(o)) continue;
    const d = Math.hypot(o.cx() - b.x, o.cy() - b.y);
    if (d > b.r) continue;
    pushed.add(o);
    const k = 1 - d / b.r * 0.5;
    if (o.charClass === 'demolitionist') {
      o.vy = Math.min(o.vy, b.giga ? -18 : -15);
    } else {
      const dir = (o.cx() - b.x) >= 0 ? 1 : -1;
      o.vx += dir * (b.giga ? 12 : 8) * k;
      o.vy = Math.min(o.vy, -(b.giga ? 15 : 11) * k);
    }
  }
}

// Once per frame: resolve blasts, age FX, recompute every fighter's move multiplier.
function _wxStep() {
  const fc = _wxFrame();
  if (fc === _wxStepFrame) return;
  _wxStepFrame = fc;
  _wxResolveBlasts();
  for (let i = _wxFx.length - 1; i >= 0; i--) { if (++_wxFx[i].t >= _wxFx[i].max) _wxFx.splice(i, 1); }

  const all = _wxAll();
  const stuck = new Map();
  for (const f of all) {
    if (!f || !f._wxBombs) continue;
    for (const bm of f._wxBombs) if (!bm.dead && bm.stuckTo) stuck.set(bm.stuckTo, (stuck.get(bm.stuckTo) || 0) + 1);
  }
  for (const f of all) {
    if (!f) continue;
    let m = 1;
    const n = stuck.get(f) || 0;
    if (n) m *= 1 - 0.05 * Math.min(n, 5);
    if (f._wxOverdrive > 0) m *= 1.25;
    if (f._wxCharge && f._wxCharge.t > 36 && f.charClass !== 'adept') m *= 0.6;
    if (f._wxBarrage) m *= 0.5;
    if (f._storyMoveMult && storyModeActive) m *= f._storyMoveMult;
    f._wxMoveMult = m === 1 ? 0 : m;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// BOMB
// ═════════════════════════════════════════════════════════════════════════════
const WX_STICKY_MAX = 6;

function _wxNewBomb(user, opt) {
  if (!user._wxBombs) user._wxBombs = [];
  const bm = Object.assign({
    x: user.cx() + user.facing * 16, y: user.y + 18, py: user.y + 18,
    vx: user.facing * 7.5 + (user.vx || 0) * 0.3, vy: -6.5,
    r: 7, fuse: 80, armed: 6, sticky: false, giga: false,
    stuckTo: null, offX: 0, offY: 0, onSurface: false,
    dmg: 14, kb: 11, blastR: 70, spin: 0, born: _wxFrame(), dead: false,
  }, opt);
  user._wxBombs.push(bm);
  return bm;
}

function wxThrowBomb(user, dmg) {
  _wxNewBomb(user, { dmg: dmg || 14 });
  spawnParticles(user.cx() + user.facing * 16, user.y + 18, '#ffb070', 4);
}

function _wxThrowSticky(user) {
  _wxNewBomb(user, {
    sticky: true, fuse: Infinity, armed: 0,
    vx: user.facing * 9 + (user.vx || 0) * 0.3, vy: -4,
    r: 6, dmg: 10, kb: 9, blastR: 62,
  });
  const mine = user._wxBombs.filter(b => b.sticky && !b.dead);
  if (mine.length > WX_STICKY_MAX) mine[0].fuse = 1;   // oldest goes off
  spawnParticles(user.cx() + user.facing * 16, user.y + 18, '#ff5040', 5);
}

// Q. A human's press is deferred: a quick tap throws a sticky on release, a
// hold sets them all off instead (see _wxBombInput). Bots throw at once and
// decide detonation from range in _wxBombAI.
function wxBombAbility(user) {
  if (user.isAI || !user.controls) { _wxThrowSticky(user); return; }
  user._wxQPending = true;
  user._abilityCdOverride = 0;
}

function _wxDetonateStickies(user) {
  let any = false;
  for (const bm of (user._wxBombs || [])) {
    if (bm.sticky && !bm.dead) { bm.fuse = 1; any = true; }
  }
  if (any) spawnParticles(user.cx(), user.y - 6, '#ff5040', 6);
  return any;
}

function wxGigaBomb(user) {
  _wxNewBomb(user, {
    giga: true, r: 16, fuse: 180, armed: 30,
    vx: user.facing * 6 + (user.vx || 0) * 0.3, vy: -7,
    dmg: 45, kb: 24, blastR: 200,
  });
  spawnParticles(user.cx(), user.cy(), '#ff8a3d', 20);
}

function _wxBombInput(user) {
  if (user.isAI || !user.controls || typeof keyHeldFrames === 'undefined') return;
  const held = keyHeldFrames[user.controls.ability] || 0;
  if (held >= 16 && !user._wxQDetonated) {
    if (_wxDetonateStickies(user)) { user._wxQDetonated = true; user._wxQPending = false; }
  }
  if (held === 0) {
    if (user._wxQPending && !user._wxQDetonated) {
      _wxThrowSticky(user);
      user.abilityCooldown = Math.max(user.abilityCooldown, user.weapon ? user.weapon.abilityCooldown : 45);
    }
    user._wxQPending = false;
    user._wxQDetonated = false;
  }
}

function _wxBombAI(user) {
  if (!user.isAI) return;
  let ready = false;
  for (const bm of (user._wxBombs || [])) {
    if (!bm.sticky || bm.dead) continue;
    if (bm.stuckTo && isHostileTarget(user, bm.stuckTo)) { ready = true; break; }
    for (const t of _wxHostiles(user)) {
      if (Math.hypot(t.cx() - bm.x, t.cy() - bm.y) < bm.blastR * 0.8) { ready = true; break; }
    }
    if (ready) break;
  }
  user._wxAIDetT = ready ? (user._wxAIDetT || 0) + 1 : 0;
  if (user._wxAIDetT >= 6) { _wxDetonateStickies(user); user._wxAIDetT = 0; }
}

function _wxUpdateBombs(user) {
  const list = user._wxBombs;
  if (!list || !list.length) return;
  const hostiles = _wxHostiles(user);
  for (const bm of list) {
    if (bm.dead) continue;
    if (bm.stuckTo) {
      if (bm.stuckTo.health <= 0) { bm.stuckTo = null; bm.vx = 0; bm.vy = 0; }
      else { bm.x = bm.stuckTo.cx() + bm.offX; bm.y = bm.stuckTo.y + bm.offY; }
    } else if (!bm.onSurface) {
      bm.py = bm.y;
      bm.vy += bm.giga ? 0.45 : 0.38;
      bm.x += bm.vx; bm.y += bm.vy;
      const wall = _wxSolidAt(bm.x, bm.y);
      if (wall && !(bm.py + bm.r <= wall.y + 2)) {
        if (bm.sticky) { bm.onSurface = true; }
        else { bm.x -= bm.vx; bm.vx = -bm.vx * 0.45; }
      }
      const pl = !bm.onSurface && _wxLand(bm, bm.r);
      if (pl) {
        if (bm.sticky) { bm.onSurface = true; bm.vx = 0; bm.vy = 0; }
        else {
          bm.vy = Math.abs(bm.vy) > 2.5 ? -bm.vy * 0.35 : 0;
          bm.vx *= bm.giga ? 0.94 : 0.965;   // roll
          if (Math.abs(bm.vx) < 0.05) bm.vx = 0;
        }
      }
      bm.spin += bm.vx / Math.max(4, bm.r);
      if (bm.y > _wxMapBottom()) { bm.dead = true; continue; }
      if (bm.sticky) {
        for (const t of hostiles) {
          if (_wxTouches(t, bm.x, bm.y, bm.r)) {
            bm.stuckTo = t; bm.offX = bm.x - t.cx(); bm.offY = Math.max(6, Math.min(t.h - 6, bm.y - t.y));
            spawnParticles(bm.x, bm.y, '#ff5040', 4);
            break;
          }
        }
      }
    }
    if (bm.armed > 0) bm.armed--;
    else if (!bm.sticky) {
      for (const t of hostiles) {
        if (_wxTouches(t, bm.x, bm.y, bm.r)) { bm.fuse = 0; break; }
      }
    }
    bm.fuse--;
    if (bm.fuse <= 0) {
      bm.dead = true;
      _wxQueueBlast(user, bm.x, bm.y, bm.blastR, bm.dmg, bm.kb, bm.giga);
    }
  }
  user._wxBombs = list.filter(b => !b.dead);
}

// ═════════════════════════════════════════════════════════════════════════════
// FRAGMENT
// ═════════════════════════════════════════════════════════════════════════════
const WX_FRAG_MAX_CHARGE = 90;
const WX_FRAG_BLAST_HOLD = 18;   // long enough to press Q and have the first punch land
const WX_FRAG_PULL_MIN   = 30;   // stop pulling at arm's length, never through the user
const WX_FRAG_YANK_TO    = 42;   // where the blast leaves its target: inside Barrage's first punch (62)

function wxFragmentAttack(user, _target) {
  if (user._wxCharge || user._wxBarrage) return;
  user._wxCharge = { t: 0, aiRelease: user.isAI ? 10 + Math.floor(Math.random() * 60) : 0 };
}

function _wxReleaseBlast(user) {
  const ch = user._wxCharge;
  user._wxCharge = null;
  if (!ch) return;
  const frac = Math.min(1, ch.t / WX_FRAG_MAX_CHARGE);
  const dmg = 7 + 13 * frac;
  const r   = 48 + 72 * frac;
  const cx = user.cx(), cy = user.cy();
  // The blast is a set-up, not a launcher: no knockback, and it yanks what it
  // hits to arm's length and holds it there, inside Barrage's first punch.
  let held = false;
  for (const t of _wxHostiles(user)) {
    if (Math.hypot(t.cx() - cx, t.cy() - cy) >= r + 12 || !_wxHit(user, t, dmg, 0) || t.shielding) continue;
    held = true;
    const gap = Math.abs(t.cx() - cx);
    // Ground friction (0.78) carries vx about 3.5x its value before it dies out.
    if (gap > WX_FRAG_YANK_TO && !t.isBoss && !t.isTrueForm)
      t.vx = (cx > t.cx() ? 1 : -1) * Math.min(12, (gap - WX_FRAG_YANK_TO) / 3.5);
    if (!((t._stunGuardUntil || -1) >= _wxFrame())) t.stunTimer = Math.max(t.stunTimer || 0, WX_FRAG_BLAST_HOLD);
  }
  _wxAddFx({ kind: 'fragblast', x: cx, y: cy, r, max: 14 });
  if (settings.particles) {
    spawnParticles(cx, cy, '#8fd8ff', 10 + Math.round(18 * frac));
    spawnParticles(cx, cy, '#ffffff', 4 + Math.round(8 * frac));
  }
  screenShake = Math.max(screenShake, 5 + Math.round(10 * frac));
  const w = user.weapon;
  user.cooldown = user.attackCooldownMult ? Math.max(1, Math.ceil(w.cooldown * user.attackCooldownMult)) : w.cooldown;
  user._attackStartFrame = _wxFrame();
  if (typeof CLASH_TIER_ATTACK !== 'undefined') user._attackKindTier = CLASH_TIER_ATTACK;
  user.attackDuration = 7;
  user.attackTimer = 7;
  user._jabAlt = !user._jabAlt;
  user.weaponHit = true;   // a blast is not a swing — no whiff punish
  // Bots take the opening the blast makes: Barrage a few frames later, once the
  // yank has brought the target in (see wxUpdateFighter).
  if (held && (user.isAI || !user.controls)) user._wxChainQ = 3;
  // A landed blast has no recovery: the target is held, so there is nothing to
  // punish, and the swing endlag after the blast's pose refused Q — Barrage
  // pressed right after a hit was dropped.
  user._skipSwingEndlag = held;
}

function _wxUpdateCharge(user) {
  const ch = user._wxCharge;
  if (!ch) return;
  if (user.weaponKey !== 'fragment' || user.health <= 0 || user.stunTimer > 0 || user.ragdollTimer > 0 || user.shielding) {
    user._wxCharge = null; return;
  }
  ch.t += user.charClass === 'adept' ? 1.25 : 1;
  // Charging pulls: hostiles within reach of the blast being built (plus a
  // margin) are drawn in, faster the longer it is held. Moved by position, not
  // velocity, so their own movement input can slow it but not erase it.
  const pf = Math.min(1, ch.t / WX_FRAG_MAX_CHARGE);
  const reach = 48 + 72 * pf + 90;
  for (const t of _wxHostiles(user)) {
    if (t.isBoss || t.isTrueForm) continue;
    const dx = user.cx() - t.cx(), d = Math.abs(dx);
    if (d <= WX_FRAG_PULL_MIN || d > reach || Math.abs(t.cy() - user.cy()) > 80) continue;
    t.x += Math.sign(dx) * Math.min(d - WX_FRAG_PULL_MIN, 1.5 + 2.5 * pf);
  }
  if (ch.t >= WX_FRAG_MAX_CHARGE) { _wxReleaseBlast(user); return; }
  if (user.isAI || !user.controls) {
    // Bots let go once the target is inside the blast they have built, or on a timer.
    const r = 48 + 72 * Math.min(1, ch.t / WX_FRAG_MAX_CHARGE);
    const t = user.target;
    const inside = t && t.health > 0 && Math.hypot(t.cx() - user.cx(), t.cy() - user.cy()) < r + 6;
    if (ch.t >= ch.aiRelease || (inside && ch.t >= 8)) _wxReleaseBlast(user);
  } else if (typeof keysDown !== 'undefined' && !keysDown.has(user.controls.attack)) {
    _wxReleaseBlast(user);
  }
}

// Q: four punches, each with a small shockwave, then the laser. At most
// 4×4 + 4×2 + 14 = 38 before multipliers.
const WX_BARRAGE_PUNCH = [0, 9, 18, 27];
const WX_BARRAGE_LASER = 40;
const WX_BARRAGE_END   = 56;

function wxFragmentBarrage(user) {
  user._wxCharge = null;
  const f = _wxFrame();
  const combo = (f - (user._comboLastFrame || 0) > 45) ? 0 : (user._comboHitCount || 0);
  user._wxBarrage = { t: 0, dir: user.facing || 1, waves: [], combo };
}

// The barrage is one move, so all of its hits count as ONE combo hit. Counted
// separately, its 7th (the last punch) tripped dealDamage's 7-hit auto-launch
// and threw the target out of the laser's line, and the 5th opened the air
// escape window halfway through.
// Punches and waves also hold the victim until the next punch, like a combo
// string does, unless an escape window (dealDamage's no-restun) is open.
function _wxBarrageHit(user, b, t, dmg, kb, iframes, hold) {
  user._comboHitCount = b.combo;
  user._comboLastFrame = _wxFrame();
  const landed = _wxHit(user, t, dmg, kb, iframes);
  if (landed) {
    if (!b.victim) b.victim = t;
    if (hold && !((t._stunGuardUntil || -1) >= _wxFrame())) t.stunTimer = Math.max(t.stunTimer || 0, hold);
  }
  return landed;
}

function _wxUpdateBarrage(user) {
  const b = user._wxBarrage;
  if (!b) return;
  if (user.health <= 0 || user.stunTimer > 0 || user.ragdollTimer > 0) { user._wxBarrage = null; return; }
  user.facing = b.dir;
  user.weaponHit = true;   // punches are not swings — the melee whiff punish must not cancel the combo
  // Follow the victim in. Every punch and wave pushes them back and the user
  // stood still, so from ~42px the gap reached 90px by the third punch (reach
  // 62) and punches three and four always missed.
  const v = b.victim;
  if (v && v.health > 0 && b.t < WX_BARRAGE_LASER) {
    const gap = (v.cx() - user.cx()) * b.dir;
    if (gap > 40 && gap < 180 && !(typeof user.isEdgeDanger === 'function' && user.isEdgeDanger(b.dir)))
      user.vx = b.dir * Math.min(12, (gap - 40) * 0.6);
  }
  if (WX_BARRAGE_PUNCH.includes(b.t)) {
    user.attackDuration = 7; user.attackTimer = 7; user._jabAlt = !user._jabAlt;
    const fx = user.cx() + b.dir * 22, fy = user.cy() - 4;
    for (const t of _wxHostiles(user)) {
      const rel = (t.cx() - user.cx()) * b.dir;
      if (rel > -10 && rel < 62 && Math.abs(t.cy() - user.cy()) < 50) _wxBarrageHit(user, b, t, 4, 3, 0, 14);
    }
    b.waves.push({ x: fx, y: fy, vx: b.dir * 9, life: 16, hit: new Set() });
    spawnParticles(fx, fy, '#8fd8ff', 6);
    screenShake = Math.max(screenShake, 4);
  }
  for (const w of b.waves) {
    if (w.life <= 0) continue;
    w.x += w.vx; w.life--;
    for (const t of _wxHostiles(user)) {
      if (w.hit.has(t)) continue;
      // Spent only when it connects. Punches and waves grant no i-frames: each
      // can hit once by construction, and a wave reaching the target on the
      // same frame as its punch used to meet that punch's i-frames and be lost.
      if (Math.abs(t.cx() - w.x) < 18 && Math.abs(t.cy() - w.y) < 42 && _wxBarrageHit(user, b, t, 2, 5, 0, 14)) {
        w.hit.add(t);
        _wxPushFrom(t, w.x - w.vx * 4);
      }
    }
  }
  if (b.t === WX_BARRAGE_LASER) {
    const x0 = user.cx(), y0 = user.cy();
    for (const t of _wxHostiles(user)) {
      const rel = (t.cx() - x0) * b.dir;
      if (rel > -6 && rel < 300 && Math.abs(t.cy() - y0) < 26) _wxBarrageHit(user, b, t, 14, 14);
    }
    _wxAddFx({ kind: 'laser', x: x0, y: y0, dir: b.dir, len: 300, max: 18 });
    spawnParticles(x0, y0, '#ffffff', 14);
    spawnParticles(x0 + b.dir * 40, y0, '#8fd8ff', 18);
    screenShake = Math.max(screenShake, 14);
  }
  b.t++;
  if (b.t >= WX_BARRAGE_END) user._wxBarrage = null;
}

// E: 8 seconds of everything turned up. Casting again while it runs stacks
// another 8s on top (banked time capped at 16s), but one unbroken Overdrive
// ends after 24s no matter how often it is refed. It used to reset to 8s on
// every cast, and the +30% damage refilled the bar inside that window, so a
// steady player kept it up indefinitely.
const WX_OVERDRIVE_FRAMES = 480;
const WX_OVERDRIVE_BANK_MAX = 960;
const WX_OVERDRIVE_CHAIN_MAX = 1440;
function wxFragmentOverdrive(user) {
  // Every other super pays its heal and domain charge when it connects
  // (dealDamage). Overdrive deals no damage, so it pays both on cast.
  if (user._superCountPending) {
    user._superCountPending = false;
    user._domainSuperCount = (user._domainSuperCount || 0) + 1;
  }
  const heal = Math.min(user._superHealPending || 0, user.maxHealth - user.health);
  user._superHealPending = 0;
  if (heal > 0) {
    user.health += heal;
    if (typeof damageTexts !== 'undefined' && typeof DamageText !== 'undefined')
      damageTexts.push(new DamageText(user.cx(), user.y - 30, '+' + heal, '#44ff88'));
    spawnParticles(user.cx(), user.cy(), '#44ff88', 14);
    if (typeof SoundManager !== 'undefined' && SoundManager.superHeal) SoundManager.superHeal();
  }
  if (user._wxOverdrive > 0) {
    const chainLeft = WX_OVERDRIVE_CHAIN_MAX - (user._wxOverdriveUp || 0);
    user._wxOverdrive = Math.max(0, Math.min(user._wxOverdrive + WX_OVERDRIVE_FRAMES, WX_OVERDRIVE_BANK_MAX, chainLeft));
  } else {
    user._wxOverdrive = WX_OVERDRIVE_FRAMES;
    user._wxOverdriveUp = 0;
  }
  user._wxExtraJumps = 1;
  spawnRing(user.cx(), user.cy());
  spawnParticles(user.cx(), user.cy(), '#8fd8ff', 30);
  spawnParticles(user.cx(), user.cy(), '#ffffff', 14);
  _wxAddFx({ kind: 'fragblast', x: user.cx(), y: user.cy(), r: 140, max: 22 });
}

function _wxUpdateOverdrive(user) {
  if (!(user._wxOverdrive > 0)) {
    if (user._wxExtraJumps) user._wxExtraJumps = 0;
    user._wxParryBurst = false;
    return;
  }
  user._wxOverdrive--;
  user._wxOverdriveUp = (user._wxOverdriveUp || 0) + 1;
  if (user._wxOverdriveUp >= WX_OVERDRIVE_CHAIN_MAX) user._wxOverdrive = 0;
  if (user.onGround) user._wxExtraJumps = 1;
  // Cooldowns recover 60% faster.
  if (user.cooldown > 0) user.cooldown = Math.max(0, user.cooldown - 0.6);
  if (user.abilityCooldown > 0) user.abilityCooldown = Math.max(0, user.abilityCooldown - 0.6);
  // Stronger shield: each raise starts with double HP. Under 'pool' rules the HP
  // is a meter that outlives the raise, so the bonus is capped and taken back on
  // lowering — otherwise every raise would double it again.
  const _pool = typeof SHIELD_RULES !== 'undefined' && SHIELD_RULES === 'pool';
  if (user.shielding && !user._wxShieldBoosted) {
    user.shieldHP = _pool ? Math.min(SHIELD_POOL_MAX * 2, (user.shieldHP || 0) * 2) : (user.shieldHP || 0) * 2;
    user._wxShieldBoosted = true;
  } else if (!user.shielding) {
    if (_pool && user._wxShieldBoosted) user.shieldHP = Math.min(SHIELD_POOL_MAX, user.shieldHP || 0);
    user._wxShieldBoosted = false;
  }
  if (user._wxParryBurst) {
    user._wxParryBurst = false;
    const cx = user.cx(), cy = user.cy();
    for (const t of _wxHostiles(user)) {
      if (Math.hypot(t.cx() - cx, t.cy() - cy) < 95) _wxHit(user, t, 16, 14, 0);
    }
    _wxAddFx({ kind: 'fragblast', x: cx, y: cy, r: 95, max: 16 });
    spawnParticles(cx, cy, '#8fd8ff', 22);
    screenShake = Math.max(screenShake, 14);
  }
  if (user._wxOverdrive <= 0) user._wxExtraJumps = 0;
  if (settings.particles && _wxFrame() % 5 === 0) {
    spawnParticles(user.cx() + (Math.random() - 0.5) * 20, user.y + user.h * Math.random(), '#8fd8ff', 1);
  }
}

// ── Fragment unlock ──────────────────────────────────────────────────────────
// Locked until the story chapter carrying `unlocksFragment` is cleared (the
// Compass Points, where Axiom shows Kael what the fragment is for). Read from the
// account flag first and the story record second, so saves that cleared the
// chapter before this weapon existed unlock it on load.
function wxIsFragmentUnlocked() {
  try {
    const a = typeof _getActiveAcctDirect === 'function' ? _getActiveAcctDirect() : null;
    if (a && a.data && a.data.unlocks && a.data.unlocks.fragment) return true;
  } catch (e) { /* no account system */ }
  if (typeof _story2 !== 'undefined' && _story2 && Array.isArray(_story2.defeated) &&
      typeof STORY_CHAPTERS2 !== 'undefined') {
    for (const id of _story2.defeated) {
      const ch = STORY_CHAPTERS2[id];
      if (ch && ch.unlocksFragment) return true;
    }
  }
  return false;
}

function wxUnlockFragmentStyle(announce) {
  const was = wxIsFragmentUnlocked();
  if (typeof setAccountFlag === 'function') {
    try { setAccountFlag(['unlocks', 'fragment'], true); } catch (e) { /* offline */ }
  }
  refreshFragmentOptions();
  if (announce && !was && typeof showToast === 'function') {
    showToast('Fragment style unlocked — new weapon and class: Fragment / Adept');
  }
}

// Adds (or removes) the Fragment weapon and Adept class in the loadout pickers.
function refreshFragmentOptions() {
  if (typeof document === 'undefined') return;
  const on = wxIsFragmentUnlocked();
  const pairs = [['p1Weapon', 'fragment', 'Fragment'], ['p2Weapon', 'fragment', 'Fragment'],
                 ['p1Class', 'adept', 'Adept'], ['p2Class', 'adept', 'Adept']];
  let changed = false;
  for (const [id, val, label] of pairs) {
    const sel = document.getElementById(id);
    if (!sel) continue;
    const opt = sel.querySelector('option[value="' + val + '"]');
    if (on && !opt) {
      const o = document.createElement('option');
      o.value = val; o.textContent = label;
      sel.appendChild(o); changed = true;
    } else if (!on && opt) {
      if (sel.value === val) sel.value = id.indexOf('Weapon') !== -1 ? 'sword' : 'none';
      opt.remove(); changed = true;
    }
  }
  if (changed && typeof _buildSelCardGrid === 'function' && typeof _WEAPON_CARD_DATA !== 'undefined') {
    _buildSelCardGrid('p1WeaponCards', 'p1Weapon', _WEAPON_CARD_DATA, 'p1', 'weapon');
    _buildSelCardGrid('p2WeaponCards', 'p2Weapon', _WEAPON_CARD_DATA, 'p2', 'weapon');
    _buildSelCardGrid('p1ClassCards',  'p1Class',  _CLASS_CARD_DATA,  'p1', 'class');
    _buildSelCardGrid('p2ClassCards',  'p2Class',  _CLASS_CARD_DATA,  'p2', 'class');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// THROWING KNIVES
// ═════════════════════════════════════════════════════════════════════════════
const WX_KNIVES = 6;
const WX_KNIFE_SPEED  = 18;
const WX_KNIFE_RECALL = 22;
const WX_KNIFE_SCALE  = 1.5;   // drawn size and hit pad grow together

function _wxKnifeState(user) {
  if (user._wxKnivesHeld == null) user._wxKnivesHeld = WX_KNIVES;
  if (!user._wxKnives) user._wxKnives = [];
}

function _wxLaunchKnife(user, vx, vy, dmg, capMap, cap) {
  user._wxKnives.push({
    x: user.cx() + user.facing * 14, y: user.y + 22, py: user.y + 22,
    vx, vy, dmg, state: 'fly', hit: new Set(), capMap: capMap || null, cap: cap || 0, life: 200,
  });
}

function wxThrowKnife(user, dmg) {
  _wxKnifeState(user);
  if (user._wxKnivesHeld <= 0) {
    // Out of knives: a quick slash with the last blade.
    for (const t of _wxHostiles(user)) {
      const rel = (t.cx() - user.cx()) * user.facing;
      if (rel > -8 && rel < 60 && Math.abs(t.cy() - user.cy()) < 45) _wxHit(user, t, 9, 6);
    }
    spawnParticles(user.cx() + user.facing * 30, user.cy(), '#c8d0da', 5);
    return;
  }
  user._wxKnivesHeld--;
  _wxLaunchKnife(user, user.facing * WX_KNIFE_SPEED, -0.6 + (Math.random() - 0.5) * 0.4, dmg || 9);
}

function wxRecallKnives(user, fromSuper) {
  _wxKnifeState(user);
  const out = user._wxKnives.filter(k => k.state !== 'recall');
  if (!out.length) { if (!fromSuper) user._abilityCdOverride = 0; return; }
  const capMap = fromSuper && user._wxFanCap ? user._wxFanCap : new Map();
  for (const k of out) {
    k.state = 'recall'; k.hit = new Set(); k.dmg = fromSuper ? 6 : 6;
    k.capMap = capMap; k.cap = fromSuper ? 45 : 24;
  }
  spawnParticles(user.cx(), user.cy(), '#c8d0da', 8);
}

function wxFanOfSteel(user) {
  _wxKnifeState(user);
  user._wxKnives = [];
  user._wxKnivesHeld = 0;
  user._wxFanCap = new Map();
  for (let i = 0; i < WX_KNIVES; i++) {
    const a = -0.35 + (i / (WX_KNIVES - 1)) * 0.7;
    _wxLaunchKnife(user, Math.cos(a) * WX_KNIFE_SPEED * user.facing, Math.sin(a) * WX_KNIFE_SPEED - 1, 9, user._wxFanCap, 45);
  }
  user._wxFanRecallAt = _wxFrame() + 40;
  screenShake = Math.max(screenShake, 10);
}

function _wxUpdateKnives(user) {
  if (user.weaponKey !== 'knives' && !(user._wxKnives && user._wxKnives.length)) return;
  _wxKnifeState(user);
  if (user._wxFanRecallAt && _wxFrame() >= user._wxFanRecallAt) {
    user._wxFanRecallAt = 0;
    wxRecallKnives(user, true);
  }
  // Bots with an empty hand call their knives home.
  if (user.isAI && user.weaponKey === 'knives' && user._wxKnivesHeld === 0 &&
      user.abilityCooldown <= 0 && user._wxKnives.length) {
    wxRecallKnives(user, false);
    user.abilityCooldown = user.weapon ? user.weapon.abilityCooldown : 150;
  }
  const hostiles = _wxHostiles(user);
  const hit = (k, t) => {
    let d = k.dmg;
    if (k.capMap) d = _wxCapped(k.capMap, t, d, k.cap);
    if (d > 0) { _wxHit(user, t, d, k.state === 'recall' ? 4 : 5, k.capMap ? 0 : 16); _wxPushFrom(t, k.x - k.vx * 3); }
    k.hit.add(t);
    spawnParticles(k.x, k.y, '#dddddd', 4);
  };
  for (const k of user._wxKnives) {
    if (k.state === 'fly' || k.state === 'drop') {
      k.py = k.y;
      k.vy += k.state === 'drop' ? 0.5 : 0.12;
      k.x += k.vx; k.y += k.vy;
      if (--k.life <= 0 && k.state === 'fly') { k.state = 'drop'; k.vx *= 0.2; }
      if (k.state === 'fly') {
        for (const t of hostiles) {
          if (k.hit.has(t) || !_wxTouches(t, k.x, k.y, 4 * WX_KNIFE_SCALE)) continue;
          hit(k, t);
          k.state = 'drop'; k.vx = -k.vx * 0.15; k.vy = -2;
          break;
        }
      }
      if (_wxSolidAt(k.x, k.y) && k.state === 'fly') { k.state = 'lodged'; k.x -= k.vx * 0.4; k.y -= k.vy * 0.4; }
      else if (_wxLand(k, 2)) { k.state = 'lodged'; }
      if (k.y > _wxMapBottom()) { k.gone = true; user._wxKnivesHeld++; }
    } else if (k.state === 'lodged') {
      if (_wxTouches(user, k.x, k.y, 8)) { k.gone = true; user._wxKnivesHeld++; }
    } else if (k.state === 'recall') {
      const dx = user.cx() - k.x, dy = user.cy() - k.y, d = Math.hypot(dx, dy) || 1;
      k.vx = dx / d * WX_KNIFE_RECALL; k.vy = dy / d * WX_KNIFE_RECALL;
      k.x += k.vx; k.y += k.vy;
      for (const t of hostiles) {
        if (k.hit.has(t) || !_wxTouches(t, k.x, k.y, 6 * WX_KNIFE_SCALE)) continue;
        hit(k, t);
      }
      if (d < WX_KNIFE_RECALL + 5) { k.gone = true; user._wxKnivesHeld++; }
    }
  }
  // `done` hides a harmless floor knife from Sovereign's hazard scan.
  for (const k of user._wxKnives) k.done = k.state === 'lodged';
  user._wxKnives = user._wxKnives.filter(k => !k.gone);
  user._wxKnivesHeld = Math.min(WX_KNIVES, user._wxKnivesHeld);
}

// ═════════════════════════════════════════════════════════════════════════════
// GLASS BLADE
// ═════════════════════════════════════════════════════════════════════════════
function _wxGlass(user) {
  if (!user._wxGlass) user._wxGlass = { cracks: 0, broken: 0, hp: user.health };
  return user._wxGlass;
}

function _wxShards(user, n, spread, speed, dmg, cap, forward) {
  if (!user._wxShards) user._wxShards = [];
  const capMap = new Map();
  for (let i = 0; i < n; i++) {
    let a;
    if (forward) a = -spread / 2 + (n === 1 ? 0.5 : i / (n - 1)) * spread;
    else a = (i / n) * Math.PI * 2;
    const vx = forward ? Math.cos(a) * speed * user.facing : Math.cos(a) * speed;
    const vy = forward ? Math.sin(a) * speed : Math.sin(a) * speed;
    user._wxShards.push({ x: user.cx(), y: user.cy(), vx, vy, life: 26, dmg, cap, capMap, hit: new Set(), rot: Math.random() * 6 });
  }
}

function _wxShatter(user, reformFrames) {
  const g = _wxGlass(user);
  g.broken = reformFrames;
  g.cracks = 0;
  _wxAddFx({ kind: 'shatter', x: user.cx() + user.facing * 24, y: user.cy(), max: 14 });
  spawnParticles(user.cx() + user.facing * 24, user.cy(), '#d8f6ff', 16);
  if (typeof SoundManager !== 'undefined' && SoundManager.clang) SoundManager.clang();
}

function wxShatterstep(user) {
  const g = _wxGlass(user);
  user.vx = user.facing * 15;
  user.vy = Math.min(user.vy, -2);
  _wxNoSwingHit(user);
  if (g.broken > 0) return;
  _wxShards(user, 5, 0.6, 13, 7, 21, true);
  _wxShatter(user, 150);
}

function wxMirrorwall(user) {
  const floorY = user.y + user.h;
  user._wxMirror = { x: user.cx() + user.facing * 48 - 5, y: floorY - 110, w: 10, h: 110, life: 300, reflects: 0 };
  spawnParticles(user.cx() + user.facing * 48, floorY - 55, '#d8f6ff', 18);
}

function _wxBurstMirror(user) {
  const m = user._wxMirror;
  if (!m) return;
  user._wxMirror = null;
  if (!user._wxShards) user._wxShards = [];
  const capMap = new Map();
  const cx = m.x + m.w / 2, cy = m.y + m.h / 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    user._wxShards.push({ x: cx, y: cy, vx: Math.cos(a) * 12, vy: Math.sin(a) * 12, life: 24, dmg: 8, cap: 24, capMap, hit: new Set(), rot: a });
  }
  _wxAddFx({ kind: 'shatter', x: cx, y: cy, max: 16 });
  spawnParticles(cx, cy, '#d8f6ff', 22);
  screenShake = Math.max(screenShake, 12);
  if (typeof SoundManager !== 'undefined' && SoundManager.clang) SoundManager.clang();
  if (user.superActive && !wxSuperOngoing(user)) user.superActive = false;
}

function _wxUpdateGlass(user) {
  if (user.weaponKey === 'glassblade') {
    const g = _wxGlass(user);
    // Every hit that got through the guard cracks the blade.
    if (user.health < g.hp - 0.5 && g.broken <= 0) {
      g.cracks++;
      spawnParticles(user.cx() + user.facing * 24, user.cy(), '#d8f6ff', 5);
      if (g.cracks >= 3) { _wxShards(user, 6, 0, 9, 6, 18, false); _wxShatter(user, 240); }
    }
    g.hp = user.health;
    if (g.broken > 0 && --g.broken === 0) spawnParticles(user.cx() + user.facing * 24, user.cy(), '#ffffff', 10);
  }
  if (user._wxShards && user._wxShards.length) {
    const hostiles = _wxHostiles(user);
    for (const s of user._wxShards) {
      s.x += s.vx; s.y += s.vy; s.vy += 0.2; s.rot += 0.4;
      if (--s.life <= 0 || _wxSolidAt(s.x, s.y)) { s.gone = true; continue; }
      for (const t of hostiles) {
        if (s.hit.has(t) || !_wxTouches(t, s.x, s.y, 4)) continue;
        s.hit.add(t);
        const d = _wxCapped(s.capMap, t, s.dmg, s.cap);
        if (d > 0) _wxHit(user, t, d, 4, 0);
        s.gone = true;
        break;
      }
    }
    user._wxShards = user._wxShards.filter(s => !s.gone);
  }
  const m = user._wxMirror;
  if (m) {
    if (--m.life <= 0 || user.health <= 0) { _wxBurstMirror(user); return; }
    if (typeof projectiles !== 'undefined' && Array.isArray(projectiles)) {
      for (const p of projectiles) {
        if (!p || p.active === false || !p.owner || p.owner === user) continue;
        if (!isHostileTarget(user, p.owner)) continue;
        if (p.x > m.x - 6 && p.x < m.x + m.w + 6 && p.y > m.y && p.y < m.y + m.h) {
          p.vx = -p.vx;
          p.x += p.vx * 2;
          p.owner = user;
          if (p.hitEntities && p.hitEntities.clear) p.hitEntities.clear();
          spawnParticles(p.x, p.y, '#ffffff', 5);
          if (++m.reflects >= 4) { _wxBurstMirror(user); return; }
        }
      }
    }
    for (const t of _wxHostiles(user)) {
      if (t.x < m.x + m.w && t.x + t.w > m.x && t.y < m.y + m.h && t.y + t.h > m.y) {
        _wxHit(user, t, 12, 10);
        _wxBurstMirror(user);
        return;
      }
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ANCHOR
// ═════════════════════════════════════════════════════════════════════════════
// No swinging while the anchor is out; returning true lets the ordinary swing run.
function wxAnchorAttackGate(user, _target) {
  return !user._wxAnchor;
}

function wxDropAnchor(user) {
  _wxNoSwingHit(user);
  const a = user._wxAnchor;
  if (a) {
    if (a.state !== 'embedded' || a.pull) { user._abilityCdOverride = 0; return; }
    a.pull = { mode: (a.hooked && a.hooked.health > 0) ? 'drag' : 'self', t: 0 };
    user._abilityCdOverride = user.weapon ? user.weapon.abilityCooldown : 170;
    spawnParticles(a.x, a.y, '#8a939c', 8);
    return;
  }
  user._wxAnchor = {
    x: user.cx() + user.facing * 16, y: user.cy() - 6, py: user.cy() - 6,
    vx: user.facing * 12, vy: -3.5, state: 'fly', hooked: null, offX: 0, offY: 0,
    life: 150, pull: null, rot: 0,
  };
  user._abilityCdOverride = 20;
}

function wxKeelhaul(user) {
  user._wxKeel = { t: 0, ang: 0, hitCd: new Map() };
  spawnParticles(user.cx(), user.cy(), '#8a939c', 16);
}

function _wxUpdateAnchor(user) {
  const a = user._wxAnchor;
  if (a) {
    if (user.health <= 0) { user._wxAnchor = null; }
    else if (a.state === 'fly') {
      a.py = a.y;
      a.vy += 0.35; a.x += a.vx; a.y += a.vy; a.rot += 0.3 * Math.sign(a.vx || 1);
      for (const t of _wxHostiles(user)) {
        if (!_wxTouches(t, a.x, a.y, 10)) continue;
        _wxHit(user, t, 12, 4);
        a.state = 'embedded'; a.hooked = t; a.offX = a.x - t.cx(); a.offY = Math.max(8, Math.min(t.h - 8, a.y - t.y));
        spawnParticles(a.x, a.y, '#cccccc', 8);
        break;
      }
      if (a.state === 'fly') {
        if (_wxSolidAt(a.x, a.y) || _wxLand(a, 6)) { a.state = 'embedded'; screenShake = Math.max(screenShake, 5); spawnParticles(a.x, a.y, '#aa9977', 8); }
        else if (a.y > _wxMapBottom() || Math.hypot(a.x - user.cx(), a.y - user.cy()) > 420) a.state = 'return';
      }
    } else if (a.state === 'embedded') {
      if (a.hooked) {
        if (a.hooked.health <= 0) a.hooked = null;
        else { a.x = a.hooked.cx() + a.offX; a.y = a.hooked.y + a.offY; }
      }
      if (a.pull) {
        a.pull.t++;
        if (a.pull.mode === 'drag' && a.hooked) {
          const t = a.hooked, dir = user.cx() > t.cx() ? 1 : -1;
          t.vx = dir * 13; t.vy = Math.min(t.vy, -1.5);
          if (Math.abs(t.cx() - user.cx()) < 50 || a.pull.t > 18) {
            _wxHit(user, t, 6, 3);
            user._wxAnchor = null;
          }
        } else {
          const dx = a.x - user.cx(), dy = a.y - user.cy(), d = Math.hypot(dx, dy) || 1;
          user.vx = dx / d * 16; user.vy = dy / d * 16;
          if (d < 34 || a.pull.t > 30) { user.vy = Math.min(user.vy, -4); user._wxAnchor = null; }
        }
      } else if (--a.life <= 0) {
        a.state = 'return'; a.hooked = null;
      }
    } else if (a.state === 'return') {
      const dx = user.cx() - a.x, dy = user.cy() - a.y, d = Math.hypot(dx, dy) || 1;
      a.x += dx / d * 16; a.y += dy / d * 16; a.rot += 0.3;
      if (d < 24) {
        user._wxAnchor = null;
        user.abilityCooldown = Math.max(user.abilityCooldown, 100);
      }
    }
  }
  const k = user._wxKeel;
  if (k) {
    if (user.health <= 0 || user.stunTimer > 0) { user._wxKeel = null; user.superActive = false; return; }
    k.t++;
    k.ang += 0.28;
    user.vx *= 0.7;
    const hx = user.cx() + Math.cos(k.ang) * 95, hy = user.cy() + Math.sin(k.ang) * 55;
    k.hx = hx; k.hy = hy;
    for (const [t, cd] of k.hitCd) { if (cd <= 1) k.hitCd.delete(t); else k.hitCd.set(t, cd - 1); }
    for (const t of _wxHostiles(user)) {
      const dx = user.cx() - t.cx();
      if (Math.abs(dx) < 230 && Math.abs(t.cy() - user.cy()) < 140) t.vx += Math.sign(dx) * 0.9;
      if (!k.hitCd.has(t) && _wxTouches(t, hx, hy, 16)) {
        _wxHit(user, t, 5, 3, 2);
        k.hitCd.set(t, 14);
        spawnParticles(hx, hy, '#cccccc', 5);
      }
    }
    if (k.t >= 70) {
      for (const t of _wxHostiles(user)) {
        if (Math.hypot(t.cx() - user.cx(), t.cy() - user.cy()) < 130) _wxHit(user, t, 26, 22);
      }
      spawnRing(user.cx(), user.y + user.h);
      spawnParticles(user.cx(), user.y + user.h, '#aa9977', 26);
      _wxAddFx({ kind: 'blast', x: user.cx(), y: user.y + user.h - 10, r: 130, max: 16 });
      screenShake = Math.max(screenShake, 24);
      user._wxKeel = null;
      user.superActive = false;
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// CROSSBOW
// ═════════════════════════════════════════════════════════════════════════════
function wxFireBolt(user, dmg, siege) {
  if (!user._wxBolts) user._wxBolts = [];
  user._wxBolts.push({
    x: user.cx() + user.facing * 16, y: user.y + 22,
    vx: user.facing * (siege ? 22 : 17), vy: siege ? 0 : -0.4,
    dmg: dmg || 18, siege: !!siege, hit: new Set(), last: null, life: siege ? 80 : 90, stuck: 0,
  });
  if (siege) { screenShake = Math.max(screenShake, 16); spawnParticles(user.cx() + user.facing * 20, user.y + 22, '#c89a5a', 14); }
}

// A surface just behind the target, in the bolt's direction of travel.
function _wxWallBehind(t, dir, gap) {
  const probeX = dir > 0 ? t.x + t.w + gap : t.x - gap;
  if (_wxSolidAt(probeX, t.cy())) return true;
  if (typeof _wallBounds === 'function') {
    const wb = _wallBounds();
    if (dir > 0 ? (t.x + t.w > wb.right - gap) : (t.x < wb.left + gap)) return true;
  }
  return false;
}

function _wxPin(t, frames) {
  if (!t || t.health <= 0) return;
  t.stunTimer = Math.max(t.stunTimer || 0, frames);
  t.vx = 0;
  t._wxPinned = frames;
  spawnParticles(t.cx(), t.cy(), '#c89a5a', 10);
  if (typeof damageTexts !== 'undefined' && typeof DamageText !== 'undefined' && settings.dmgNumbers) {
    damageTexts.push(new DamageText(t.cx(), t.y - 30, 'PINNED', '#e8c07a'));
  }
}

function wxTripwire(user) {
  let y = user.y + user.h;
  if (!user.onGround) {
    let best = null;
    for (const pl of _wxPlatforms()) {
      if (pl.isHidden || user.cx() < pl.x || user.cx() > pl.x + pl.w || pl.y < user.y + user.h - 2) continue;
      if (!best || pl.y < best.y) best = pl;
    }
    if (!best) { user._abilityCdOverride = 0; return; }
    y = best.y;
  }
  const x1 = user.cx() + user.facing * 30, x2 = user.cx() + user.facing * 230;
  user._wxWire = { x1: Math.min(x1, x2), x2: Math.max(x1, x2), y, life: 420, arm: 20, dir: user.facing, grow: 0 };
  spawnParticles(x1, y - 4, '#c89a5a', 6);
}

function _wxUpdateCrossbow(user) {
  if (user._wxBolts && user._wxBolts.length) {
    const hostiles = _wxHostiles(user);
    for (const b of user._wxBolts) {
      if (b.stuck > 0) { if (--b.stuck <= 0) b.gone = true; continue; }
      b.vy += b.siege ? 0 : 0.05;
      b.x += b.vx; b.y += b.vy;
      const dir = b.vx >= 0 ? 1 : -1;
      for (const t of hostiles) {
        if (b.hit.has(t) || !_wxTouches(t, b.x, b.y, 3)) continue;
        b.hit.add(t);
        _wxHit(user, t, b.dmg, b.siege ? 18 : 9);
        if (b.siege) { b.last = t; spawnParticles(b.x, b.y, '#e8c07a', 10); continue; }
        if (b.vy > 1.5 && !t.onGround) _wxPin(t, 30);
        else t._wxPinCheck = { frames: 12, dir };
        b.gone = true;
        break;
      }
      if (b.gone) continue;
      if (_wxSolidAt(b.x, b.y)) { b.stuck = 90; b.done = true; if (b.siege && b.last) _wxPin(b.last, 60); b.last = null; continue; }
      if (--b.life <= 0 || b.y > _wxMapBottom()) {
        if (b.siege && b.last) _wxPin(b.last, 60);
        b.gone = true;
      }
    }
    user._wxBolts = user._wxBolts.filter(b => !b.gone);
  }
  const w = user._wxWire;
  if (w) {
    if (w.grow < 1) w.grow = Math.min(1, w.grow + 0.125);
    if (w.arm > 0) w.arm--;
    else {
      for (const t of _wxHostiles(user)) {
        if (Math.abs(t.y + t.h - w.y) > 12 || t.cx() < w.x1 || t.cx() > w.x2) continue;
        _wxHit(user, t, 8, 2);
        t.stunTimer = Math.max(t.stunTimer || 0, 40);
        t.vy = Math.min(t.vy, -5);
        spawnParticles(t.cx(), w.y - 4, '#e8c07a', 12);
        if (settings.dmgNumbers && typeof damageTexts !== 'undefined') damageTexts.push(new DamageText(t.cx(), t.y - 30, 'TRIPPED', '#e8c07a'));
        user._wxWire = null;
        return;
      }
    }
    if (--w.life <= 0) user._wxWire = null;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// HOOKS
// ═════════════════════════════════════════════════════════════════════════════
function wxSuperOngoing(f) {
  return !!(f && (f._wxKeel || f._wxMirror || f._wxFanRecallAt ||
    (f._wxBombs && f._wxBombs.some(b => b.giga && !b.dead)) ||
    (f._wxBolts && f._wxBolts.some(b => b.siege && !b.stuck))));
}

function wxResetFighter(f) {
  f._wxBombs = [];
  f._wxQPending = false; f._wxQDetonated = false;
  f._wxCharge = null; f._wxBarrage = null;
  f._wxOverdrive = 0; f._wxOverdriveUp = 0; f._wxExtraJumps = 0; f._wxParryBurst = false;
  f._wxKnives = []; f._wxKnivesHeld = WX_KNIVES; f._wxFanRecallAt = 0;
  f._wxGlass = null; f._wxShards = []; f._wxMirror = null;
  f._wxAnchor = null; f._wxKeel = null;
  f._wxBolts = []; f._wxWire = null; f._wxPinned = 0; f._wxPinCheck = null;
  f._wxMoveMult = 0; f._wxWardenHits = 0;
}

function wxUpdateFighter(f) {
  _wxStep();
  if (!f || f.isRemote) return;
  if (f.weaponKey === 'bomb') { _wxBombInput(f); _wxBombAI(f); }
  _wxUpdateBombs(f);
  _wxUpdateCharge(f);
  if (f._wxChainQ > 0 && --f._wxChainQ === 0 && f.weaponKey === 'fragment' && f.target &&
      f.target.health > 0 && !(f.abilityCooldown > 0)) f.ability(f.target);
  _wxUpdateBarrage(f);
  _wxUpdateOverdrive(f);
  _wxUpdateKnives(f);
  _wxUpdateGlass(f);
  _wxUpdateAnchor(f);
  _wxUpdateCrossbow(f);
  // A crossbow hit pins the target if its knockback carries it into a wall.
  if (f._wxPinCheck) {
    if (_wxWallBehind(f, f._wxPinCheck.dir, 6)) { f._wxPinCheck = null; _wxPin(f, 30); }
    else if (--f._wxPinCheck.frames <= 0) f._wxPinCheck = null;
  }
  if (f._wxPinned > 0) { f._wxPinned--; f.vx = 0; }
}

function wxDamageMods(attacker, target, dmg) {
  let d = dmg;
  if (attacker) {
    if (attacker._wxOverdrive > 0) d *= 1.3;
    if (attacker.weaponKey === 'glassblade' && !_wxInHit && attacker._wxGlass) {
      const g = attacker._wxGlass;
      d *= g.broken > 0 ? 0.3 : (1 - 0.15 * g.cracks);
    }
  }
  if (target) {
    if (target._wxOverdrive > 0) d *= 0.7;
    if (target.charClass === 'warden') {
      target._wxWardenHits = (target._wxWardenHits || 0) + 1;
      if (target._wxWardenHits % 3 === 0) {
        d *= 0.5;
        spawnParticles(target.cx(), target.cy(), '#9aa7b4', 8);
      }
    }
  }
  return Math.max(1, Math.round(d));
}

function wxKnockbackMods(_attacker, target, kb) {
  // Moored: planted and mid-swing, the anchor-bearer does not move.
  if (target && target.weaponKey === 'anchor' && target.onGround && target.attackTimer > 0) return 0;
  return kb;
}

// ── Drawing ──────────────────────────────────────────────────────────────────
let _wxFxDrawFrame = -1;

function _wxDrawFx() {
  const fc = _wxFrame();
  if (fc === _wxFxDrawFrame) return;
  _wxFxDrawFrame = fc;
  for (const fx of _wxFx) {
    const p = fx.t / fx.max, a = 1 - p;
    ctx.save();
    if (fx.kind === 'blast') {
      ctx.globalAlpha = a * 0.55;
      const g = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, fx.r);
      g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.35, 'rgba(255,140,60,0.9)'); g.addColorStop(1, 'rgba(80,40,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (0.55 + 0.45 * p), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = '#ffd9a0'; ctx.lineWidth = 3 * a + 1;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (0.7 + 0.35 * p), 0, Math.PI * 2); ctx.stroke();
    } else if (fx.kind === 'fragblast') {
      ctx.globalAlpha = a * 0.5;
      ctx.fillStyle = 'rgba(143,216,255,0.35)';
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (0.6 + 0.4 * p), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a;
      ctx.shadowColor = '#8fd8ff'; ctx.shadowBlur = 16;
      ctx.strokeStyle = '#dff4ff'; ctx.lineWidth = 2.5 * a + 0.8;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (0.75 + 0.3 * p), 0, Math.PI * 2); ctx.stroke();
    } else if (fx.kind === 'laser') {
      const h = 22 * (1 - p * 0.7);
      const x1 = fx.x + fx.dir * fx.len;
      ctx.globalAlpha = a;
      ctx.shadowColor = '#8fd8ff'; ctx.shadowBlur = 24;
      const g = ctx.createLinearGradient(0, fx.y - h, 0, fx.y + h);
      g.addColorStop(0, 'rgba(143,216,255,0)'); g.addColorStop(0.5, 'rgba(235,250,255,1)'); g.addColorStop(1, 'rgba(143,216,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(Math.min(fx.x, x1), fx.y - h, Math.abs(x1 - fx.x), h * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.min(fx.x, x1), fx.y - h * 0.18, Math.abs(x1 - fx.x), h * 0.36);
    } else if (fx.kind === 'shatter') {
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 1.4;
      for (let i = 0; i < 7; i++) {
        const ang = i * 0.9 + 0.3, r0 = 6 + 26 * p, r1 = r0 + 10;
        ctx.beginPath();
        ctx.moveTo(fx.x + Math.cos(ang) * r0, fx.y + Math.sin(ang) * r0);
        ctx.lineTo(fx.x + Math.cos(ang) * r1, fx.y + Math.sin(ang) * r1);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function _wxDrawBomb(bm) {
  ctx.save();
  ctx.translate(bm.x, bm.y);
  const fc = _wxFrame();
  const g = ctx.createRadialGradient(-bm.r * 0.35, -bm.r * 0.35, 1, 0, 0, bm.r);
  g.addColorStop(0, bm.sticky ? '#6a4038' : '#5c5c5c'); g.addColorStop(1, bm.sticky ? '#2a1210' : '#161616');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, bm.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  if (bm.sticky) {
    // Tar ring + blinking detonator light.
    ctx.strokeStyle = 'rgba(40,20,10,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, bm.r + 1.5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = (fc % 30) < 15 ? '#ff3a2a' : '#661a14';
    ctx.beginPath(); ctx.arc(0, -bm.r * 0.2, 1.8, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.rotate(bm.spin);
    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(-2, -bm.r - 3, 4, 3);
    ctx.strokeStyle = '#a58a5a'; ctx.lineWidth = bm.giga ? 2 : 1.3;
    ctx.beginPath(); ctx.moveTo(0, -bm.r - 3); ctx.quadraticCurveTo(3, -bm.r - 7, 5, -bm.r - 8); ctx.stroke();
    ctx.shadowColor = '#ffb040'; ctx.shadowBlur = 8;
    ctx.fillStyle = (fc % 6) < 3 ? '#ffe39a' : '#ff8a3d';
    ctx.beginPath(); ctx.arc(5, -bm.r - 8, bm.giga ? 3 : 2, 0, Math.PI * 2); ctx.fill();
    if (bm.giga && bm.fuse < 60 && (fc % 10) < 5) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ff5030';
      ctx.beginPath(); ctx.arc(0, 0, bm.r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function _wxDrawKnife(x, y, ang, alpha) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang); ctx.scale(WX_KNIFE_SCALE, WX_KNIFE_SCALE);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#2b2622'; ctx.fillRect(-9, -1.4, 6, 2.8);
  ctx.fillStyle = '#d7dde4';
  ctx.beginPath(); ctx.moveTo(-3, -1.8); ctx.lineTo(8, 0); ctx.lineTo(-3, 1.8); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function wxDrawFighter(f) {
  if (typeof ctx === 'undefined' || !ctx) return;
  _wxDrawFx();
  const fc = _wxFrame();
  if (f._wxBombs) for (const bm of f._wxBombs) if (!bm.dead) _wxDrawBomb(bm);

  // Fragment charge: a gathering orb plus the ring it will fill.
  if (f._wxCharge) {
    const frac = Math.min(1, f._wxCharge.t / WX_FRAG_MAX_CHARGE);
    const r = 48 + 72 * frac;
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.35 * frac;
    ctx.strokeStyle = '#8fd8ff'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(f.cx(), f.cy(), r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.6 + 0.4 * frac;
    ctx.shadowColor = '#8fd8ff'; ctx.shadowBlur = 12 + 18 * frac;
    ctx.fillStyle = frac >= 0.98 && (fc % 4) < 2 ? '#ffffff' : '#bfe9ff';
    ctx.beginPath(); ctx.arc(f.cx(), f.cy(), 4 + 8 * frac, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  if (f._wxBarrage) {
    for (const w of f._wxBarrage.waves) {
      if (w.life <= 0) continue;
      ctx.save();
      ctx.globalAlpha = w.life / 16;
      ctx.strokeStyle = '#bfe9ff'; ctx.lineWidth = 2.5;
      ctx.shadowColor = '#8fd8ff'; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(w.x - w.vx * 2, w.y, 18, -Math.PI / 2.4, Math.PI / 2.4, w.vx < 0);
      ctx.stroke();
      ctx.restore();
    }
  }
  if (f._wxOverdrive > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(fc * 0.2);
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.12 * pulse;
    ctx.shadowColor = '#8fd8ff'; ctx.shadowBlur = 22;
    ctx.strokeStyle = '#8fd8ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(f.cx(), f.cy(), f.w * 0.9 + pulse * 4, f.h * 0.62 + pulse * 4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  if (f._wxKnives) {
    for (const k of f._wxKnives) {
      const ang = k.state === 'lodged' ? (k.lodgeAng != null ? k.lodgeAng : (k.lodgeAng = Math.atan2(k.vy, k.vx))) : Math.atan2(k.vy, k.vx);
      _wxDrawKnife(k.x, k.y, ang, 1);
    }
  }
  if (f.weaponKey === 'knives' && f._wxKnivesHeld != null && f.health > 0) {
    ctx.save();
    for (let i = 0; i < WX_KNIVES; i++) {
      ctx.fillStyle = i < f._wxKnivesHeld ? '#d7dde4' : 'rgba(120,120,120,0.35)';
      ctx.fillRect(f.cx() - 17 + i * 6, f.y - 14, 4, 2.5);
    }
    ctx.restore();
  }

  if (f._wxShards) {
    for (const s of f._wxShards) {
      ctx.save();
      ctx.translate(s.x, s.y); ctx.rotate(s.rot);
      ctx.fillStyle = 'rgba(220,248,255,0.9)';
      ctx.beginPath(); ctx.moveTo(-4, -1.5); ctx.lineTo(4, 0); ctx.lineTo(-2, 2); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  const m = f._wxMirror;
  if (m) {
    ctx.save();
    const a = Math.min(1, m.life / 30);
    ctx.globalAlpha = 0.55 * a;
    const g = ctx.createLinearGradient(m.x, 0, m.x + m.w, 0);
    g.addColorStop(0, 'rgba(200,240,255,0.5)'); g.addColorStop(0.5, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(200,240,255,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(m.x, m.y, m.w, m.h);
    ctx.globalAlpha = 0.9 * a;
    ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 1;
    ctx.strokeRect(m.x, m.y, m.w, m.h);
    for (let i = 0; i < m.reflects; i++) {
      ctx.beginPath(); ctx.moveTo(m.x, m.y + 20 + i * 22); ctx.lineTo(m.x + m.w, m.y + 32 + i * 22); ctx.stroke();
    }
    ctx.restore();
  }

  const an = f._wxAnchor;
  if (an) {
    const hx = f.cx() + f.facing * 10, hy = f.cy() - 4;
    ctx.save();
    ctx.strokeStyle = '#4a4238'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 2]);
    ctx.beginPath(); ctx.moveTo(hx, hy);
    ctx.quadraticCurveTo((hx + an.x) / 2, Math.max(hy, an.y) + 18, an.x, an.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.translate(an.x, an.y);
    ctx.rotate(an.state === 'embedded' ? Math.PI / 2 : an.rot);
    _wxAnchorShape(0.75);
    ctx.restore();
  }
  const k = f._wxKeel;
  if (k && k.hx != null) {
    ctx.save();
    ctx.strokeStyle = '#4a4238'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(f.cx(), f.cy()); ctx.lineTo(k.hx, k.hy); ctx.stroke();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#9aa3ad'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(f.cx(), f.cy(), 95, 55, 0, k.ang - 1.2, k.ang); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.translate(k.hx, k.hy); ctx.rotate(k.ang + Math.PI / 2);
    _wxAnchorShape(0.9);
    ctx.restore();
  }

  if (f._wxBolts) {
    for (const b of f._wxBolts) {
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
      const L = b.siege ? 26 : 16;
      ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = b.siege ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.fillStyle = '#c9ced4';
      ctx.beginPath(); ctx.moveTo(0, -2.5); ctx.lineTo(6, 0); ctx.lineTo(0, 2.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b8b0a0';
      ctx.fillRect(-L, -2.5, 4, 5);
      if (b.siege && !b.stuck) { ctx.globalAlpha = 0.4; ctx.fillStyle = '#e8c07a'; ctx.fillRect(-L - 30, -1, 30, 2); }
      ctx.restore();
    }
  }
  const w = f._wxWire;
  if (w) {
    const xa = w.dir > 0 ? w.x1 : w.x2;
    const xb = xa + (w.dir > 0 ? 1 : -1) * (w.x2 - w.x1) * w.grow;
    ctx.save();
    ctx.globalAlpha = w.arm > 0 ? 0.5 : 0.85;
    ctx.strokeStyle = '#d8c9a8'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xa, w.y - 6); ctx.lineTo(xb, w.y - 6); ctx.stroke();
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(xa - 1.5, w.y - 9, 3, 9);
    if (w.grow >= 1) ctx.fillRect(xb - 1.5, w.y - 9, 3, 9);
    ctx.restore();
  }
}

// Anchor silhouette in local space: shank along +x, crown at the far end.
function _wxAnchorShape(s) {
  const ctx = _weaponArtCtx();
  ctx.save();
  ctx.scale(s, s);
  ctx.fillStyle = '#5a6068'; ctx.strokeStyle = '#2a2e33'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(-16, 0, 4, 0, Math.PI * 2); ctx.stroke();
  ctx.fillRect(-13, -2.2, 30, 4.4);
  ctx.fillRect(-8, -9, 3.5, 18);
  ctx.beginPath();
  ctx.moveTo(17, -2); ctx.quadraticCurveTo(22, -13, 10, -16); ctx.lineTo(13, -11);
  ctx.quadraticCurveTo(17, -8, 15, -2); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(17, 2); ctx.quadraticCurveTo(22, 13, 10, 16); ctx.lineTo(13, 11);
  ctx.quadraticCurveTo(17, 8, 15, 2); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// In-hand art. Local frame: hand at the origin, weapon along +x, already mirrored.
function wxDrawWeaponArt(f, k, attacking) {
  const ctx = _weaponArtCtx();
  const fc = _wxFrame();
  if (k === 'bomb') {
    ctx.shadowBlur = 0;
    const g = ctx.createRadialGradient(4, -3, 1, 6, 0, 7);
    g.addColorStop(0, '#5c5c5c'); g.addColorStop(1, '#141414');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(6, 0, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#777'; ctx.fillRect(4.5, -9, 3, 3);
    ctx.strokeStyle = '#a58a5a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(6, -9); ctx.quadraticCurveTo(9, -12, 11, -12); ctx.stroke();
    ctx.shadowColor = '#ffb040'; ctx.shadowBlur = 6;
    ctx.fillStyle = (fc % 6) < 3 ? '#ffe39a' : '#ff8a3d';
    ctx.beginPath(); ctx.arc(11, -12, 1.6, 0, Math.PI * 2); ctx.fill();
  } else if (k === 'knives') {
    if ((f._wxKnivesHeld != null ? f._wxKnivesHeld : WX_KNIVES) <= 0 && !attacking) return;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2b2622'; ctx.fillRect(-2, -1.6, 8, 3.2);
    ctx.fillStyle = '#d7dde4';
    ctx.beginPath(); ctx.moveTo(6, -2.2); ctx.lineTo(21, 0); ctx.lineTo(6, 2.2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(6, -2.2); ctx.lineTo(21, 0); ctx.stroke();
  } else if (k === 'glassblade') {
    const g = f._wxGlass;
    ctx.fillStyle = '#2d2a28'; ctx.beginPath(); ctx.roundRect(-4, -2.4, 13, 4.8, 1); ctx.fill();
    ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.roundRect(9, -6.5, 4, 13, 1.2); ctx.fill();
    if (g && g.broken > 0) {
      ctx.fillStyle = 'rgba(210,245,255,0.7)';
      ctx.beginPath(); ctx.moveTo(13, -2.4); ctx.lineTo(18, -1); ctx.lineTo(16, 0.5); ctx.lineTo(19, 2); ctx.lineTo(13, 2.4); ctx.closePath(); ctx.fill();
      return;
    }
    const bg = ctx.createLinearGradient(0, -3, 0, 3);
    bg.addColorStop(0, 'rgba(235,252,255,0.95)'); bg.addColorStop(0.5, 'rgba(170,225,240,0.75)'); bg.addColorStop(1, 'rgba(120,190,215,0.85)');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.moveTo(13, -3); ctx.lineTo(47, -0.4); ctx.lineTo(49, 0); ctx.lineTo(47, 0.4); ctx.lineTo(13, 3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(13, -3); ctx.lineTo(49, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(15, 0.8); ctx.lineTo(44, 0.2); ctx.stroke();
    if (g && g.cracks > 0) {
      ctx.strokeStyle = 'rgba(40,70,90,0.8)'; ctx.lineWidth = 0.7;
      const cx = [22, 32, 40];
      for (let i = 0; i < g.cracks; i++) {
        ctx.beginPath(); ctx.moveTo(cx[i], -2.4); ctx.lineTo(cx[i] + 2, -0.3); ctx.lineTo(cx[i] - 1, 0.8); ctx.lineTo(cx[i] + 1.5, 2.3); ctx.stroke();
      }
    }
  } else if (k === 'anchor') {
    if (f._wxAnchor || f._wxKeel) return;
    ctx.shadowBlur = attacking ? 10 : 0;
    ctx.save(); ctx.translate(16, 0); _wxAnchorShape(1); ctx.restore();
  } else if (k === 'crossbow') {
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#6b4a2b'; ctx.beginPath(); ctx.roundRect(-4, -2.5, 30, 5, 1.5); ctx.fill();
    ctx.fillStyle = '#4a3320'; ctx.fillRect(-2, 1.5, 5, 7);
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(19, -13); ctx.quadraticCurveTo(26, 0, 19, 13); ctx.stroke();
    const drawn = f.cooldown <= 0;
    ctx.strokeStyle = '#d8c9a8'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(19, -13); ctx.lineTo(drawn ? 6 : 17, 0); ctx.lineTo(19, 13); ctx.stroke();
    if (drawn) {
      ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(28, 0); ctx.stroke();
      ctx.fillStyle = '#c9ced4';
      ctx.beginPath(); ctx.moveTo(28, -2); ctx.lineTo(33, 0); ctx.lineTo(28, 2); ctx.closePath(); ctx.fill();
    }
  } else if (k === 'fragment') {
    const col = f.color || '#cc4444';
    const hot = f._wxOverdrive > 0 || f._wxCharge || f._wxBarrage;
    ctx.shadowColor = '#8fd8ff'; ctx.shadowBlur = hot ? 16 : 7;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(3.2, 0, 5.0, 4.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(143,216,255,0.9)'; ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(223,244,255,0.85)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(-3, -1.5); ctx.lineTo(1, -0.5); ctx.lineTo(4, -2); ctx.stroke();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => { try { refreshFragmentOptions(); } catch (e) { /* menus not built */ } });
}
