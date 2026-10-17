'use strict';
// smb-sewer.js: the sewer, a river of waste that carries the whole fight.
// Depends on smb-globals.js, smb-data-arenas.js, smb-combat.js (dealDamage), smb-particles-core.js (spawnParticles).
//
// No platforms. Everything you can stand on is garbage riding one current at one speed, so
// holding position means walking upstream. Falling in costs health and ground, not the match.
//
// Inert unless currentArena.isSewer: every entry point returns on its first line.

// Recycling: a raft past _R respawns behind the field at _L, so new ground arrives upstream.
const SEWER_SPAWN_X   = -340;
const SEWER_DESPAWN_X = 2050;
const SEWER_GAP_MIN   = 90;    // clear water between consecutive rafts
const SEWER_GAP_MAX   = 210;

const SEWER_DMG_INTERVAL = 24;   // frames between sewage burn ticks
const SEWER_DMG          = 4;
// A little faster than the rafts (flowSpeed 1.05): a swimmer drifts but can climb onto the raft above.
const SEWER_SWEEP        = 1.6;  // px/frame a swimmer is dragged downstream
const SEWER_STROKE_VY    = -8.2; // swim stroke impulse
const SEWER_STROKE_CD    = 16;   // frames between strokes

// Camera-stress failsafe. Two fighters at opposite ends can make the camera frame a span it can't hold.
// Past SEWER_STRESS_ON the river closes the gap: waste between them sinks, and waste behind the
// trailing fighter speeds up to carry them. Honest play spreads 1000-1200, so the trigger sits past
// that and must persist, so a knockback doesn't count.
const SEWER_STRESS_ON    = 1500;
const SEWER_STRESS_OFF   = 1050;
const SEWER_STRESS_HOLD  = 120;  // frames the spread must persist before acting
const SEWER_CATCHUP      = 3.1;  // speed multiplier for rafts behind the field
const SEWER_TARGET_RAFTS = 8;    // river is topped back up to this many

var sewerScroll    = 0;    // shared scroll, drives all motion
var sewerFlowPhase = 0;
var sewerStressed  = false;
var sewerStressT   = 0;    // frames the failsafe has been engaged (for the HUD)
var sewerStressArm = 0;    // frames the spread has been over the trigger

// Does this fighter want to climb? Bots always do; a human strokes on jump.
function _sewerWantsUp(f) {
  if (f.isAI) return true;
  return !!(f.controls && typeof keysDown !== 'undefined' && keysDown.has(f.controls.jump));
}

function sewerActive() {
  return !!(typeof currentArena !== 'undefined' && currentArena && currentArena.isSewer);
}

function _sewerRafts() {
  return (currentArena.platforms || []).filter(p => p.raft && !p._sinking);
}

// Fighters that count for framing / stress. Corpses and plane cargo do not.
function _sewerFighters() {
  const all = (typeof players !== 'undefined' ? players : [])
    .concat(typeof minions !== 'undefined' ? minions : []);
  return all.filter(f => f && f.health > 0);
}

// Update
function updateSewer() {
  if (!sewerActive() || typeof gameRunning === 'undefined' || !gameRunning) return;
  const a = currentArena;
  const flow = a.flowSpeed || 1.05;
  sewerScroll    += flow;
  sewerFlowPhase += 0.035;

  const fighters = _sewerFighters();

  // Camera stress
  let minX = Infinity, maxX = -Infinity;
  for (const f of fighters) {
    if (f.cx() < minX) minX = f.cx();
    if (f.cx() > maxX) maxX = f.cx();
  }
  const spread = (fighters.length > 1 && isFinite(minX) && isFinite(maxX)) ? maxX - minX : 0;
  if (spread > SEWER_STRESS_ON) sewerStressArm++; else sewerStressArm = 0;
  if (!sewerStressed && sewerStressArm >= SEWER_STRESS_HOLD) sewerStressed = true;
  if (sewerStressed  && spread < SEWER_STRESS_OFF)           sewerStressed = false;
  sewerStressT = sewerStressed ? sewerStressT + 1 : 0;

  const midX = (minX + maxX) / 2;

  // Every raft drifts at one speed, except under the stress failsafe, so speed is per raft.
  const riders = fighters;
  for (const pl of a.platforms) {
    if (!pl.raft) continue;

    // Sinking rafts drop through the surface and are removed. They carry no one once under.
    if (pl._sinking) {
      pl.y += 1.35;
      pl._sinkA = (pl._sinkA === undefined ? 1 : pl._sinkA - 0.014);
      continue;
    }

    let speed = flow;
    if (sewerStressed) {
      // Behind the field (upstream of the midpoint): catch the stragglers up.
      if (pl.x + pl.w < midX) speed = flow * SEWER_CATCHUP;
      // Between them, carrying nobody: sink it so the gap can't be held.
      else if (pl.x > minX + 160 && pl.x + pl.w < maxX - 160) {
        const occupied = riders.some(f => {
          const feet = f.y + f.h;
          return f.onGround && feet >= pl.y - 6 && feet <= pl.y + 16 &&
                 f.x + f.w > pl.x && f.x < pl.x + pl.w;
        });
        if (!occupied) { pl._sinking = true; pl._sinkA = 1; continue; }
      }
    }

    const before = pl.x;
    pl.x += speed;
    const dx = pl.x - before;

    // Carry the rider. Moving the raft without them makes it read as ice.
    for (const f of riders) {
      if (!f.onGround) continue;
      const feet = f.y + f.h;
      if (feet < pl.y - 4 || feet > pl.y + 14) continue;
      if (f.x + f.w < before || f.x > before + pl.w) continue;
      f.x += dx;
    }
  }

  // Retire sunk rafts once they are under the surface.
  const surf = a.sewageY || 470;
  a.platforms = a.platforms.filter(p => !(p._sinking && p.y > surf + 70));

  // Recycle: rafts past the end respawn upstream.
  _sewerRecycle(a);

  // The sewage itself
  for (const f of riders) {
    const feet = f.y + f.h;
    // Two bands. IN the sewage ends at the surface, but the swim stroke keeps working a little above it,
    // because decks ride ~40px clear of the waterline. Otherwise you bob under the deck forever.
    const inWater = feet > surf;

    // Landing on anything ends the swim. A fighter on a raft must not get the swim stroke (-8.2)
    // instead of a jump (-16).
    if (f.onGround) { f._sewerWet = 0; f._sewerTick = 0; continue; }

    if (!inWater) {
      // Breaching: the stroke keeps working just after the feet clear the water, so a climb can reach
      // a deck. Only for fighters who were in the water, not ones jumping off solid footing.
      if (f._sewerWet > 0) {
        f._sewerWet--;
        if (f._sewerStroke > 0) f._sewerStroke--;
        else if (_sewerWantsUp(f)) { f.vy = SEWER_STROKE_VY; f._sewerStroke = SEWER_STROKE_CD; f.canDoubleJump = true; }
      } else {
        f._sewerTick = 0;
      }
      continue;
    }
    f._sewerWet = 26;   // frames of swim assist carried out of the water

    f._sewerTick = (f._sewerTick || 0) + 1;
    f.x += SEWER_SWEEP;
    f.vx *= 0.90;                                   // hard to swim across the current
    if (f.vy > 0) f.vy *= 0.55;                     // viscous: the fall stops fast
    if (feet > surf + 30) f.vy = Math.min(f.vy, -1.6);   // buoyancy

    // Getting out
    // Rafts are passUnder (rise through, land on top) and jump is the swim stroke, so the surface is
    // always one input away. Solid-sided rafts once walled swimmers out.
    if (f._sewerStroke > 0) f._sewerStroke--;
    if (_sewerWantsUp(f) && !f._sewerStroke) {
      f.vy = SEWER_STROKE_VY;
      f._sewerStroke = SEWER_STROKE_CD;
      f.canDoubleJump = true;                       // climbing out doesn't spend the double jump
      if (typeof spawnParticles === 'function') spawnParticles(f.cx(), surf, '#9fb04a', 6);
    }

    if (f._sewerTick % SEWER_DMG_INTERVAL === 1 && typeof dealDamage === 'function') {
      // Keep the climb across the burn. dealDamage's hitstun zeroes vy, which reset the rise every
      // 24 frames. Damage should cost health, not progress.
      const _vy = f.vy;
      dealDamage(null, f, SEWER_DMG, 0);
      if (_vy < 0) f.vy = Math.min(f.vy, _vy);
      if (typeof spawnParticles === 'function') spawnParticles(f.cx(), surf, '#6f7a33', 5);
    }
  }
}

// Keep the river stocked: rafts past the end are reused at the head of the queue, spaced randomly
// from the upstream-most raft. Never a solid floor.
function _sewerRecycle(a) {
  const rafts = _sewerRafts();
  let headX = Infinity;
  for (const r of rafts) if (r.x < headX) headX = r.x;
  if (!isFinite(headX)) headX = SEWER_SPAWN_X + 400;

  // Shape a raft and place it at the head of the queue.
  const reseat = (pl) => {
    const gap = SEWER_GAP_MIN + Math.random() * (SEWER_GAP_MAX - SEWER_GAP_MIN);
    pl.w = 120 + Math.round(Math.random() * 120);
    // Heights stay within one hop of the waterline, so you can board from the water.
    pl.y = Math.random() < 0.45 ? 430 - Math.round(Math.random() * 58) : 430;
    pl.x = Math.min(headX - gap - pl.w, SEWER_SPAWN_X);
    pl.h = 18;
    pl.raft = true; pl.passUnder = true;
    pl._sinking = false; pl._sinkA = 1;
    pl._bob = Math.random() * Math.PI * 2;
    headX = pl.x;
  };

  for (const pl of rafts) {
    if (pl.x > SEWER_DESPAWN_X) reseat(pl);
  }

  // Top the river back up. Rafts sunk by the stress failsafe are gone for good, so without this
  // the river empties over a long match.
  let live = _sewerRafts().length;
  let guard = 0;
  while (live < SEWER_TARGET_RAFTS && guard++ < 12) {
    const pl = { x: 0, y: 430, w: 160, h: 18 };
    reseat(pl);
    // The floor flag must exist, or pickSafeSpawn() returns null on respawn and the game crashes.
    if (!a.platforms.some(p => p.isFloor && !p._sinking)) pl.isFloor = true;
    a.platforms.push(pl);
    live++;
  }
}

// Draw: background (behind everything)
function drawSewerArena() {
  if (!sewerActive()) return;
  const a = currentArena;
  const surf = a.sewageY || 470;
  const t = sewerScroll;
  let L = (a.mapLeft || 0) - 400, W = ((a.mapRight || GAME_W) - (a.mapLeft || 0)) + 800;
  // Cover whatever the camera shows (fixed boxes left a flat band when the camera pulled back).
  const _v = typeof arenaViewRect === 'function' ? arenaViewRect() : null;
  if (_v) { const R = Math.max(L + W, _v.x + _v.w + 20); L = Math.min(L, _v.x - 20); W = R - L; }

  ctx.save();

  // Tunnel vault: a receding brick barrel. Courses scroll, so the world reads as moving.
  const vaultTop = -80;
  const vg = ctx.createLinearGradient(0, vaultTop, 0, surf);
  vg.addColorStop(0,   '#11170f');
  vg.addColorStop(0.55,'#1d2619');
  vg.addColorStop(1,   '#2a3020');
  ctx.fillStyle = vg;
  if (_v && _v.y < vaultTop) { ctx.fillStyle = '#11170f'; ctx.fillRect(L, _v.y - 10, W, vaultTop - _v.y + 12); ctx.fillStyle = vg; }
  ctx.fillRect(L, vaultTop, W, surf - vaultTop);

  ctx.strokeStyle = 'rgba(120,140,95,0.20)';
  ctx.lineWidth = 1;
  for (let row = 0; row < 11; row++) {
    const ry = vaultTop + 14 + row * 26;
    const par = 0.25 + row * 0.055;          // lower courses scroll faster
    const off = -((t * par) % 72);
    ctx.beginPath(); ctx.moveTo(L, ry); ctx.lineTo(L + W, ry); ctx.stroke();
    for (let bx = L + off + (row % 2 ? 0 : 36); bx < L + W; bx += 72) {
      ctx.beginPath(); ctx.moveTo(bx, ry); ctx.lineTo(bx, ry + 26); ctx.stroke();
    }
  }

  // Outfall pipes pouring into the flow.
  for (let i = 0; i < 6; i++) {
    const px = L + (((i * 380 - t * 0.45) % (W + 420)) + W + 420) % (W + 420) - 160;
    const py = 60 + (i % 2) * 62;
    ctx.fillStyle = '#2f3524';
    ctx.fillRect(px, py, 74, 46);
    ctx.fillStyle = '#151a10';
    ctx.fillRect(px + 8, py + 8, 58, 30);
    ctx.strokeStyle = '#3f4730'; ctx.lineWidth = 3;
    ctx.strokeRect(px, py, 74, 46);

    const pourX = px + 37;
    const sway  = Math.sin(sewerFlowPhase * 2 + i) * 5;
    const pg = ctx.createLinearGradient(0, py + 38, 0, surf);
    pg.addColorStop(0,   'rgba(150,175,80,0.42)');
    pg.addColorStop(0.5, 'rgba(130,155,70,0.16)');
    pg.addColorStop(1,   'rgba(120,140,60,0.04)');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(pourX - 8, py + 38);
    ctx.lineTo(pourX + 8, py + 38);
    ctx.lineTo(pourX + 4 + sway, surf);
    ctx.lineTo(pourX - 4 + sway, surf);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(180,200,110,0.5)';
    for (let d = 0; d < 3; d++) {
      const span = Math.max(20, surf - py - 50);
      const dy = py + 44 + ((t * 2.2 + d * 47 + i * 19) % span);
      ctx.fillRect(pourX - 2 + sway * ((dy - py) / (surf - py)), dy, 3, 9);
    }
    ctx.strokeStyle = 'rgba(160,180,90,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(pourX, surf + 2, 26 + Math.sin(sewerFlowPhase * 3 + i) * 5, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// Draw: the flow and the waste (after platforms). Rafts sit IN the sewage, and the garbage on each covers the slab.
function drawSewerFlow() {
  if (!sewerActive()) return;
  const a = currentArena;
  const surf = a.sewageY || 470;
  const t = sewerScroll;
  let L = (a.mapLeft || 0) - 400, W = ((a.mapRight || GAME_W) - (a.mapLeft || 0)) + 800;
  // Cover whatever the camera shows (see the background pass).
  const _v = typeof arenaViewRect === 'function' ? arenaViewRect() : null;
  if (_v) { const R = Math.max(L + W, _v.x + _v.w + 20); L = Math.min(L, _v.x - 20); W = R - L; }

  ctx.save();

  // Body of the flow
  const fg = ctx.createLinearGradient(0, surf - 10, 0, GAME_H + 260);
  fg.addColorStop(0,   '#7c8a35');
  fg.addColorStop(0.18,'#55602a');
  fg.addColorStop(1,   '#222a15');
  ctx.fillStyle = fg;
  ctx.fillRect(L, surf, W, GAME_H + 280 - surf);
  if (_v && _v.y + _v.h > GAME_H + 280) { ctx.fillStyle = '#222a15'; ctx.fillRect(L, GAME_H + 279, W, _v.y + _v.h - GAME_H - 270); }

  // Both wave trains share one scroll, so the flow moves as one body.
  for (let lane = 0; lane < 2; lane++) {
    ctx.strokeStyle = lane ? 'rgba(190,210,110,0.28)' : 'rgba(150,170,80,0.55)';
    ctx.lineWidth = lane ? 1.5 : 2.5;
    const amp = lane ? 3 : 5;
    ctx.beginPath();
    for (let x = L; x <= L + W; x += 10) {
      const y = surf + (lane ? 7 : 0)
        + Math.sin((x + t) * 0.021 + sewerFlowPhase + lane) * amp
        + Math.sin((x + t) * 0.047 + lane * 1.7) * (amp * 0.45);
      if (x === L) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Loose scum riding the current: same speed as everything else.
  for (let i = 0; i < 26; i++) {
    const dx = L + (((i * 173.5 + t) % W) + W) % W;
    const dy = surf + 12 + ((i * 37) % 52);
    const r  = 4 + (i % 4) * 3;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(60,70,30,0.75)' : 'rgba(105,120,50,0.62)';
    ctx.beginPath(); ctx.ellipse(dx, dy, r * 1.7, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
  }

  // The waste you stand on
  // Each raft is a heap in the water: body from deck to surface, junk on top, waterline.
  for (const pl of (a.platforms || [])) {
    if (!pl.raft) continue;
    const alpha = pl._sinking ? Math.max(0, pl._sinkA) : 1;
    if (alpha <= 0) continue;
    if (pl._bob === undefined) pl._bob = (pl.x * 0.013) % (Math.PI * 2);
    const bob = Math.sin(sewerFlowPhase * 1.6 + pl._bob) * 2.2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(0, bob);

    // Submerged mass
    ctx.fillStyle = '#3b3a24';
    ctx.beginPath();
    ctx.moveTo(pl.x - 6, pl.y + 4);
    ctx.lineTo(pl.x + pl.w + 6, pl.y + 4);
    ctx.lineTo(pl.x + pl.w - 10, surf + 20);
    ctx.lineTo(pl.x + 10, surf + 20);
    ctx.closePath(); ctx.fill();

    // Deck: bound planks and packed refuse
    ctx.fillStyle = '#5a5340';
    ctx.fillRect(pl.x - 4, pl.y - 2, pl.w + 8, 16);
    ctx.strokeStyle = '#7d6f4e'; ctx.lineWidth = 2;
    ctx.strokeRect(pl.x - 4, pl.y - 2, pl.w + 8, 16);
    ctx.strokeStyle = 'rgba(40,38,24,0.65)'; ctx.lineWidth = 1;
    for (let px = pl.x + 10; px < pl.x + pl.w; px += 26) {
      ctx.beginPath(); ctx.moveTo(px, pl.y - 2); ctx.lineTo(px, pl.y + 14); ctx.stroke();
    }

    // Junk heaped on the deck. Silhouettes only, kept low so it never blocks a landing. Seeded by width.
    const seed = Math.abs(Math.round(pl.w)) % 7;
    ctx.fillStyle = '#4a4630';
    for (let j = 0; j < 3; j++) {
      const jx = pl.x + 16 + ((j * 53 + seed * 29) % Math.max(20, pl.w - 40));
      const jw = 14 + ((j + seed) % 3) * 8;
      const jh = 8 + ((j + seed) % 3) * 5;
      ctx.fillRect(jx, pl.y - 2 - jh, jw, jh);
      ctx.strokeStyle = 'rgba(125,111,78,0.6)'; ctx.lineWidth = 1;
      ctx.strokeRect(jx, pl.y - 2 - jh, jw, jh);
    }
    // A barrel, on the wider rafts
    if (pl.w > 160) {
      const bx = pl.x + pl.w - 34;
      ctx.fillStyle = '#4f5230';
      ctx.beginPath(); ctx.ellipse(bx, pl.y - 12, 11, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(140,150,90,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(bx, pl.y - 12, 11, 14, 0, 0, Math.PI * 2); ctx.stroke();
    }

    // Waterline where the heap meets the flow
    ctx.strokeStyle = 'rgba(190,210,110,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(pl.x + pl.w / 2, surf + 3, pl.w * 0.55, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.globalAlpha = 1;

  // Bubbles surfacing
  for (let i = 0; i < 12; i++) {
    const bx = L + (((i * 211 + t * 0.6) % W) + W) % W;
    const ph = (sewerFlowPhase * 40 + i * 23) % 60;
    const by = surf + 44 - ph * 0.7;
    ctx.globalAlpha = Math.max(0, 1 - ph / 60) * 0.5;
    ctx.fillStyle = '#c3d488';
    ctx.beginPath(); ctx.arc(bx, by, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Fumes over the flow
  const hz = ctx.createLinearGradient(0, surf - 34, 0, surf + 24);
  hz.addColorStop(0, 'rgba(150,170,80,0)');
  hz.addColorStop(1, 'rgba(150,170,80,0.20)');
  ctx.fillStyle = hz;
  ctx.fillRect(L, surf - 34, W, 58);

  ctx.restore();
}
