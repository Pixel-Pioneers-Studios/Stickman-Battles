'use strict';
// smb-story-levels.js — authored story level maps (layout + world-space set dressing)
// Depends on: smb-globals.js (ctx, canvas, frameCount, GAME_W), smb-drawing-bg.js
//
// A walkable story chapter normally gets a seeded corridor and its arena's 900px
// backdrop mirrored across the whole world, so the map says nothing about where
// the chapter takes place. An entry here replaces both for that chapter:
//
//   layout(worldLen) → platforms added on top of the generated floor/underground
//                      (replaces the random surface plateaus)
//   floor(worldLen)  → optional floor segments replacing the single flat floor
//                      (not for walk→fight worlds, whose slabs carry the shafts)
//   backdrop(v)      → far parallax layers, drawn instead of the theme panels
//   back(v)          → world-anchored set pieces behind the fighters
//   surface(v, a, ph)→ the floor's top face (road, sidewalk, lawn edge) and the
//                      slab's cross-section. Called twice: ph 'back' before the
//                      set pieces (everything above the feet line) and ph
//                      'front' after the platforms (the lip and slab face), so
//                      props standing on the floor sit ON the road, not under it.
//
// `v` is the visible world rect { x, y, w, h }. Set pieces are world-anchored,
// so they sit at the place the story says they are. Collidable props are drawn
// from the same constants their platforms are built from, so art and collision
// cannot drift. Not used for multi-chapter regions (one-map stitched worlds).
// Chapter entries live in js/story/levels/chNN.js, loaded after this file.

const STORY_LEVELS = {};

function storyLevelFor(ch) {
  return (ch && STORY_LEVELS[ch.id]) || null;
}

function _storyLevelView() {
  const m = (typeof ctx.getTransform === 'function') ? ctx.getTransform() : null;
  if (!m || !m.a || !m.d) return null;
  const v = { x: -m.e / m.a, y: -m.f / m.d, w: canvas.width / m.a, h: canvas.height / m.d };
  return [v.x, v.y, v.w, v.h].every(Number.isFinite) ? v : null;
}

// One-map regions (STORY_REGIONS) stitch several chapters' 6000px segments into
// one world; `a.storyRegion` = [{ id, off, len }] for the segments with a map.
// Each visible segment's level draws in its own local coordinates (translated
// by `off`, clipped to its span) against a shim arena whose platforms and
// underground rects are shifted the same way — so a level never needs to know
// it is part of a region, provided it reads geometry from `a`, not currentArena.
function _storyRegionShim(a, sg) {
  const inSeg = p => p.x + p.w > sg.off - 400 && p.x < sg.off + sg.len + 400;
  const sh = p => Object.assign({}, p, { x: p.x - sg.off });
  return Object.assign({}, a, {
    platforms: (a.platforms || []).filter(inSeg).map(sh),
    undergroundRects: (a.undergroundRects || []).filter(inSeg).map(sh),
    storyLevel: sg.id, storyRegion: null,
  });
}
function _storyRegionCall(a, part, arg) {
  const v = _storyLevelView();
  if (!v) return false;
  let drew = false;
  for (const sg of a.storyRegion) {
    const lv = STORY_LEVELS[sg.id];
    if (!lv || typeof lv[part] !== 'function') continue;
    if (part === 'backdrop') {
      // The segment under the camera owns the sky and the far layers.
      const c = v.x + v.w / 2;
      if (c < sg.off || c >= sg.off + sg.len) continue;
    } else if (!_slVisible(v, sg.off, sg.off + sg.len)) continue;
    ctx.save();
    try {
      if (part === 'backdrop') {
        const sky = lv.sky || ['#0a0a1e', '#1a1a2e'];
        const g = ctx.createLinearGradient(0, v.y, 0, v.y + v.h);
        sky.forEach((c, i) => g.addColorStop(i / Math.max(1, sky.length - 1), c));
        ctx.fillStyle = g; ctx.fillRect(v.x - 10, v.y - 10, v.w + 20, v.h + 20);
      } else {
        ctx.beginPath(); ctx.rect(sg.off, v.y - 60, sg.len, v.h + 120); ctx.clip();
      }
      ctx.translate(sg.off, 0);
      lv[part]({ x: v.x - sg.off, y: v.y, w: v.w, h: v.h }, _storyRegionShim(a, sg), arg);
      drew = true;
    } catch (e) { if (!lv._warned) { lv._warned = true; console.warn('[story level]', part, e); } }
    ctx.restore();
  }
  return drew;
}

function _storyLevelCall(a, part, arg) {
  if (a && a.storyRegion) return _storyRegionCall(a, part, arg);
  if (!a || a.storyLevel == null) return false;
  const lv = STORY_LEVELS[a.storyLevel];
  if (!lv || typeof lv[part] !== 'function') return false;
  const v = _storyLevelView();
  if (!v) return false;
  ctx.save();
  try { lv[part](v, a, arg); }
  catch (e) { if (!lv._warned) { lv._warned = true; console.warn('[story level]', part, e); } }
  ctx.restore();
  return true;
}

// Arena-fight chapters (duels, assassinations — anything that is not a walkable
// world). An entry with `arena: { base, platforms(), worldWidth, ... }` builds a
// per-chapter arena under one temp key, on top of the base arena's rules
// (lava, gravity, modifiers), and the level's backdrop/back/surface draw on it.
// Called by every launcher in smb-story-engine-flow.js that sets selectedArena.
function storyLevelArenaKey(ch, fallbackKey) {
  const lv = storyLevelFor(ch);
  if (!lv || !lv.arena || typeof ARENAS === 'undefined') return fallbackKey;
  const A = lv.arena;
  const base = ARENAS[A.base || fallbackKey] || {};
  const key = '__storyarena__';
  const plats = A.platforms();
  ARENAS[key] = Object.assign({}, base, {
    sky:         lv.sky || base.sky || ['#0a0a1e', '#1a1a2e'],
    groundColor: lv.groundColor || base.groundColor,
    platColor:   lv.platColor || base.platColor,
    platEdge:    lv.platEdge || base.platEdge,
    platforms:   plats,
    isStoryOnly: true,
    storyLevel:  ch.id,
  }, A.props || {});
  if (typeof ARENA_BASE_PLATFORMS !== 'undefined') ARENA_BASE_PLATFORMS[key] = plats.map(p => ({ ...p }));
  return key;
}

function drawStoryLevelBackdrop(a) { return _storyLevelCall(a, 'backdrop'); }
function drawStoryLevelBack(a) {
  _storyLevelCall(a, 'surface', 'back');
  return _storyLevelCall(a, 'back');
}
function drawStoryLevelGround() { return _storyLevelCall(currentArena, 'surface', 'front'); }

// Deterministic 0..1 hash — set dressing must not re-roll per frame.
function _slHash(n) {
  let s = Math.imul((n | 0) ^ 0x5bd1e995, 2654435761);
  s ^= s >>> 15; s = Math.imul(s, 2246822519); s ^= s >>> 13;
  return (s >>> 0) / 4294967296;
}

// Draws `fn(localX)` in a layer that scrolls at `par` of the camera speed.
function _slParallax(v, par, fn) {
  ctx.save();
  ctx.translate(v.x * (1 - par), 0);
  fn(v.x * par, v.x * par + v.w);
  ctx.restore();
}

function _slVisible(v, x0, x1) { return x1 > v.x - 40 && x0 < v.x + v.w + 40; }

// ── Shared street furniture ──────────────────────────────────────────────────
function _slStreetLamp(x, G, lit) {
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(x - 3, G - 190, 6, 190);
  ctx.fillRect(x - 7, G - 8, 14, 8);
  ctx.beginPath();
  ctx.moveTo(x, G - 186); ctx.quadraticCurveTo(x + 4, G - 206, x + 30, G - 204);
  ctx.lineWidth = 4; ctx.strokeStyle = '#3a3f46'; ctx.stroke();
  ctx.fillStyle = '#2c3036';
  ctx.fillRect(x + 22, G - 207, 22, 7);
  if (lit) {
    const g = ctx.createRadialGradient(x + 33, G - 198, 2, x + 33, G - 198, 60);
    g.addColorStop(0, 'rgba(255,236,190,0.55)'); g.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 30, G - 260, 130, 130);
  }
  ctx.fillStyle = lit ? '#fff2cc' : '#9aa0a6';
  ctx.fillRect(x + 24, G - 200, 18, 3);
}

function _slHydrant(x, G) {
  ctx.fillStyle = '#9c2a22';
  ctx.fillRect(x - 7, G - 30, 14, 30);
  ctx.beginPath(); ctx.arc(x, G - 30, 7, Math.PI, 0); ctx.fill();
  ctx.fillRect(x - 11, G - 22, 22, 6);
  ctx.fillStyle = '#c4473c'; ctx.fillRect(x - 5, G - 29, 3, 26);
  ctx.fillStyle = '#6e1c16'; ctx.fillRect(x - 9, G - 3, 18, 3);
}

function _slCone(x, G) {
  ctx.fillStyle = '#d8661e';
  ctx.beginPath(); ctx.moveTo(x - 9, G - 2); ctx.lineTo(x - 2, G - 28); ctx.lineTo(x + 2, G - 28); ctx.lineTo(x + 9, G - 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#eee8dc'; ctx.fillRect(x - 6, G - 17, 12, 4);
  ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x - 12, G - 3, 24, 3);
}

function _slBarricade(x, G, w, label) {
  ctx.fillStyle = '#d9d4c8';
  ctx.fillRect(x, G - 34, w, 12);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, G - 34, w, 12); ctx.clip();
  ctx.fillStyle = '#d8661e';
  for (let s = -12; s < w + 12; s += 16) {
    ctx.beginPath(); ctx.moveTo(x + s, G - 22); ctx.lineTo(x + s + 8, G - 34); ctx.lineTo(x + s + 16, G - 34); ctx.lineTo(x + s + 8, G - 22); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#5a5650';
  ctx.fillRect(x + 4, G - 22, 3, 22); ctx.fillRect(x + w - 7, G - 22, 3, 22);
  if (label) {
    ctx.fillStyle = '#efe9da'; ctx.fillRect(x + w / 2 - 24, G - 52, 48, 16);
    ctx.fillStyle = '#2b2b2b'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, G - 41);
  }
}

// Side-on sedan. `x` is the left bumper; body sits on G.
function _slCar(x, G, w, body, opts) {
  opts = opts || {};
  const h = 30, cab = 26;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(x + w / 2, G, w / 2 + 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  // Cabin
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.20, G - h - 2);
  ctx.lineTo(x + w * 0.32, G - h - cab);
  ctx.lineTo(x + w * 0.70, G - h - cab);
  ctx.lineTo(x + w * 0.82, G - h - 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#26323c';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, G - h - 4); ctx.lineTo(x + w * 0.34, G - h - cab + 4);
  ctx.lineTo(x + w * 0.50, G - h - cab + 4); ctx.lineTo(x + w * 0.50, G - h - 4); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + w * 0.53, G - h - 4); ctx.lineTo(x + w * 0.53, G - h - cab + 4);
  ctx.lineTo(x + w * 0.68, G - h - cab + 4); ctx.lineTo(x + w * 0.77, G - h - 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(x + w * 0.36, G - h - cab + 6, 6, cab - 12);
  // Body
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(x + 4, G - 8); ctx.lineTo(x + 2, G - h + 8); ctx.quadraticCurveTo(x + 4, G - h, x + 16, G - h);
  ctx.lineTo(x + w - 12, G - h); ctx.quadraticCurveTo(x + w, G - h + 2, x + w - 1, G - h + 12); ctx.lineTo(x + w - 2, G - 8);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x + 4, G - 14, w - 6, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 10, G - h + 3, w - 24, 3);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + w * 0.51, G - h); ctx.lineTo(x + w * 0.51, G - 12); ctx.stroke();
  if (opts.doorOpen) {
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.moveTo(x + w * 0.30, G - h - 2); ctx.lineTo(x + w * 0.16, G - h - 12); ctx.lineTo(x + w * 0.14, G - 14); ctx.lineTo(x + w * 0.30, G - 12); ctx.fill();
    ctx.fillStyle = '#1a1f24'; ctx.fillRect(x + w * 0.31, G - h, w * 0.19, h - 12);
  }
  // Lights
  ctx.fillStyle = '#f2e8c8'; ctx.fillRect(x + w - 6, G - h + 6, 5, 6);
  const blink = opts.hazard && (frameCount % 50) < 25;
  ctx.fillStyle = blink ? '#ffb030' : '#8a2a1e'; ctx.fillRect(x + 2, G - h + 6, 4, 7);
  if (blink) {
    const g = ctx.createRadialGradient(x + 4, G - h + 9, 1, x + 4, G - h + 9, 26);
    g.addColorStop(0, 'rgba(255,170,40,0.5)'); g.addColorStop(1, 'rgba(255,170,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 24, G - h - 18, 54, 54);
  }
  if (opts.taxi) {
    ctx.fillStyle = '#20201c'; ctx.fillRect(x + w * 0.42, G - h - cab - 7, w * 0.16, 7);
    ctx.fillStyle = '#f4e9b0'; ctx.font = 'bold 6px Arial'; ctx.textAlign = 'center';
    ctx.fillText('TAXI', x + w * 0.5, G - h - cab - 1.5);
    ctx.fillStyle = '#20201c';
    for (let c = 0; c < w - 30; c += 10) ctx.fillRect(x + 14 + c, G - 20, 5, 4);
  }
  // Wheels
  for (const wx of [x + w * 0.2, x + w * 0.8]) {
    ctx.fillStyle = '#16181a'; ctx.beginPath(); ctx.arc(wx, G - 9, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7d8388'; ctx.beginPath(); ctx.arc(wx, G - 9, 4.5, 0, Math.PI * 2); ctx.fill();
  }
}

// Clapboard house front. Base on G; `x` is the left wall.
function _slHouse(x, G, w, wallH, roofH, wall, trim, roof, opts) {
  opts = opts || {};
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + 6, G - 4, w, 4);
  // Roof
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 16, G - wallH); ctx.lineTo(x + w * 0.5, G - wallH - roofH); ctx.lineTo(x + w + 16, G - wallH); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
  for (let r = 8; r < roofH; r += 9) {
    const t = r / roofH;
    ctx.beginPath();
    ctx.moveTo(x - 16 + (w * 0.5 + 16) * t, G - wallH - r); ctx.lineTo(x + w + 16 - (w * 0.5 + 16) * t, G - wallH - r); ctx.stroke();
  }
  if (opts.chimney != null) {
    ctx.fillStyle = '#6d4c3e';
    ctx.fillRect(x + opts.chimney, G - wallH - roofH * 0.9, 18, roofH * 0.55);
    ctx.fillStyle = '#4e352b'; ctx.fillRect(x + opts.chimney - 2, G - wallH - roofH * 0.9, 22, 5);
  }
  // Walls + siding
  ctx.fillStyle = wall; ctx.fillRect(x, G - wallH, w, wallH);
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  for (let y = G - wallH + 7; y < G; y += 7) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x, G - wallH, w, 5);
  ctx.fillStyle = trim; ctx.fillRect(x - 2, G - wallH, 4, wallH); ctx.fillRect(x + w - 2, G - wallH, 4, wallH);
  // Foundation
  ctx.fillStyle = '#8a8378'; ctx.fillRect(x - 2, G - 12, w + 4, 12);
}

function _slWindow(x, y, w, h, trim, lit, curtain) {
  ctx.fillStyle = trim; ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, lit ? '#f2dca0' : '#9fb8c8'); g.addColorStop(1, lit ? '#d9b46a' : '#5f7686');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (curtain) { ctx.fillStyle = curtain; ctx.fillRect(x, y, w * 0.22, h); ctx.fillRect(x + w * 0.78, y, w * 0.22, h); }
  ctx.fillStyle = trim; ctx.fillRect(x + w / 2 - 1.5, y, 3, h); ctx.fillRect(x, y + h / 2 - 1.5, w, 3);
  ctx.fillStyle = trim; ctx.fillRect(x - 6, y + h + 3, w + 12, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 3, y + 3, 4, h / 2 - 6);
}

function _slTree(x, G, s, leaf) {
  ctx.fillStyle = '#4a3a2c'; ctx.fillRect(x - 5 * s, G - 70 * s, 10 * s, 70 * s);
  const blobs = [[0, -96, 40], [-28, -78, 30], [28, -80, 32], [-12, -120, 28], [16, -116, 26]];
  ctx.fillStyle = leaf;
  for (const [dx, dy, r] of blobs) { ctx.beginPath(); ctx.arc(x + dx * s, G + dy * s, r * s, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (const [dx, dy, r] of blobs) { ctx.beginPath(); ctx.arc(x + dx * s + 6 * s, G + dy * s + 8 * s, r * s * 0.7, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,230,0.10)';
  ctx.beginPath(); ctx.arc(x - 14 * s, G - 112 * s, 18 * s, 0, Math.PI * 2); ctx.fill();
}

function _slShopfront(x, G, w, h, wall, sign, signColor, awning, lit) {
  ctx.fillStyle = wall; ctx.fillRect(x, G - h, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
  for (let y = G - h + 9; y < G - 90; y += 9) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, G - h, w, 6);
  // Upper windows
  for (let wx = x + 22; wx + 34 < x + w - 10; wx += 56) _slWindow(wx, G - h + 22, 34, 40, '#5b524a', _slHash(wx) < 0.4, null);
  // Sign band
  ctx.fillStyle = '#22252a'; ctx.fillRect(x + 8, G - 128, w - 16, 26);
  ctx.fillStyle = signColor; ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center';
  ctx.fillText(sign, x + w / 2, G - 109);
  // Glass
  ctx.fillStyle = '#3e3a36'; ctx.fillRect(x + 6, G - 98, w - 12, 98);
  const gl = ctx.createLinearGradient(0, G - 92, 0, G);
  gl.addColorStop(0, lit ? '#e6d6a6' : '#8fa3ae'); gl.addColorStop(1, lit ? '#a88a52' : '#4a5a64');
  ctx.fillStyle = gl; ctx.fillRect(x + 12, G - 92, w - 24, 86);
  ctx.fillStyle = '#3e3a36';
  for (let mx = x + 12 + (w - 24) / 3; mx < x + w - 14; mx += (w - 24) / 3) ctx.fillRect(mx - 2, G - 92, 4, 86);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath(); ctx.moveTo(x + 20, G - 92); ctx.lineTo(x + 40, G - 92); ctx.lineTo(x + 20, G - 50); ctx.fill();
  // Awning
  if (awning) {
    ctx.fillStyle = awning;
    ctx.beginPath(); ctx.moveTo(x + 2, G - 100); ctx.lineTo(x + w - 2, G - 100); ctx.lineTo(x + w + 8, G - 82); ctx.lineTo(x - 8, G - 82); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let s = x; s < x + w; s += 24) ctx.fillRect(s, G - 100, 10, 18);
  }
}

// Sky above y=0. drawBackground paints from y=0 down, so a level that climbs
// above the screen top must fill the space itself or the camera shows void.
function _slSkyAbove(v, top) {
  if (v.y >= 0) return;
  ctx.fillStyle = top;
  ctx.fillRect(v.x - 10, v.y - 10, v.w + 20, -v.y + 12);
}

// Floor-platform helper: segments at their own heights, all marked isFloor.
function _slFloorSeg(x, y, w, h) { return { x, y, w, h: h || (520 - y + 80), isFloor: true }; }

// Standable one-way top (art drawn separately) and a solid in-lane block.
function _slLedge(P, x, y, w) { P.push({ x, y, w, h: 10, passUnder: true, noDraw: true }); }
function _slBlock(P, x, y, w, h) { P.push({ x, y, w, h, isStructure: true, noDraw: true }); }
// Moving one-way top: sways by ±ax horizontally and/or ±ay vertically. `tag`
// lets the art find the live platform (_slPlat) since its position changes.
function _slMover(P, tag, x, y, w, ax, ay, speed, phase) {
  const pl = { x, y, w, h: 10, passUnder: true, noDraw: true, slTag: tag, oscSpeed: speed || 0.018, oscPhase: phase || 0 };
  if (ax) { pl.ox = x; pl.oscX = ax; }
  if (ay) { pl.oy = y; pl.oscY = ay; }
  P.push(pl);
}
function _slPlat(a, tag) { return (a && a.platforms || []).find(p => p.slTag === tag) || null; }

function _slBrick(x, y, w, h, base, mortar) {
  ctx.fillStyle = base; ctx.fillRect(x, y, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = mortar || 'rgba(0,0,0,0.16)'; ctx.lineWidth = 1;
  let row = 0;
  for (let by = y + 8; by < y + h; by += 8, row++) {
    ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + w, by); ctx.stroke();
    for (let bx = x + (row % 2 ? 9 : 0); bx < x + w; bx += 18) { ctx.beginPath(); ctx.moveTo(bx, by - 8); ctx.lineTo(bx, by); ctx.stroke(); }
  }
  // Weathering: a few darker bricks and a grime gradient toward the base
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  for (let k = 0; k < (w * h) / 900; k++) ctx.fillRect(x + _slHash(k + x) * w, y + _slHash(k * 3 + y) * h, 16, 7);
  const gr = ctx.createLinearGradient(0, y + h - 90, 0, y + h);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = gr; ctx.fillRect(x, y + h - 90, w, 90);
  ctx.restore();
}

// Grid of windows over a facade; litChance from a stable hash.
function _slWindowGrid(x, y, w, h, cols, rows, opt) {
  opt = opt || {};
  const cw = w / cols, rh = h / rows;
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const wx = x + c * cw + cw * 0.2, wy = y + r * rh + rh * 0.18;
    const ww = cw * 0.6, wh = rh * 0.62;
    const lit = _slHash(c * 31 + r * 7 + (opt.seed || 0)) < (opt.lit || 0.3);
    ctx.fillStyle = opt.frame || 'rgba(30,26,24,0.9)'; ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
    ctx.fillStyle = lit ? (opt.litColor || '#e9c77c') : (opt.dark || '#2c333a'); ctx.fillRect(wx, wy, ww, wh);
    if (lit && opt.glow) {
      ctx.fillStyle = 'rgba(255,210,130,0.10)'; ctx.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
    if (opt.sill !== false) { ctx.fillStyle = opt.sillColor || 'rgba(200,190,170,0.5)'; ctx.fillRect(wx - 4, wy + wh + 2, ww + 8, 3); }
  }
}

// Fire escape: a landing (railing + grate) at each y in `ys`, zig-zag stairs between.
function _slFireEscape(x, w, ys, col) {
  col = col || '#25282c';
  ctx.strokeStyle = col; ctx.fillStyle = col;
  for (const y of ys) {
    ctx.fillRect(x, y, w, 5);
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.lineTo(x + w, y - 26); ctx.stroke();
    ctx.lineWidth = 1.2;
    for (let rx = x; rx <= x + w; rx += 10) { ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx, y - 26); ctx.stroke(); }
    ctx.fillRect(x + 4, y + 5, 3, 10); ctx.fillRect(x + w - 7, y + 5, 3, 10);
  }
  const s = ys.slice().sort((a, b) => b - a);
  ctx.lineWidth = 2.5;
  for (let i = 0; i + 1 < s.length; i++) {
    const a = i % 2 ? x + 10 : x + w - 10, b = i % 2 ? x + w - 10 : x + 10;
    ctx.beginPath(); ctx.moveTo(a, s[i]); ctx.lineTo(b, s[i + 1] + 4); ctx.stroke();
  }
}

function _slDumpster(x, G, w, h, col) {
  ctx.fillStyle = col || '#2e5a46'; ctx.fillRect(x, G - h, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 4, G - h - 6, w + 8, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + 4, G - h + 4, w - 8, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 6, G - h + 14, w - 12, 3);
  ctx.fillStyle = '#16181a'; ctx.beginPath(); ctx.arc(x + 12, G - 3, 4, 0, Math.PI * 2); ctx.arc(x + w - 12, G - 3, 4, 0, Math.PI * 2); ctx.fill();
}

function _slCrate(x, y, s, col) {
  ctx.fillStyle = col || '#8a6a44'; ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = 'rgba(40,28,16,0.7)'; ctx.lineWidth = 2;
  ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
  ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + s - 3, y + s - 3); ctx.moveTo(x + s - 3, y + 3); ctx.lineTo(x + 3, y + s - 3); ctx.stroke();
  ctx.fillStyle = 'rgba(255,240,210,0.10)'; ctx.fillRect(x, y, s, 3);
}

function _slTrashBags(x, G, n) {
  for (let i = 0; i < n; i++) {
    const bx = x + i * 16 + _slHash(i + x) * 6, r = 10 + _slHash(i * 5 + x) * 6;
    ctx.fillStyle = i % 3 ? '#1d1f22' : '#2a2d31';
    ctx.beginPath(); ctx.ellipse(bx, G - r * 0.8, r, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.arc(bx - r * 0.4, G - r * 1.2, r * 0.3, 0, Math.PI * 2); ctx.fill();
  }
}

function _slPuddle(x, G, w, tint) {
  ctx.fillStyle = tint || 'rgba(150,170,200,0.22)';
  ctx.beginPath(); ctx.ellipse(x, G - 2, w / 2, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - w * 0.2, G - 3, w * 0.25, 1);
}

// Rising smoke/steam column; `dark` for fire smoke.
function _slSmoke(x, y, h, dark, seed) {
  for (let k = 0; k < 9; k++) {
    const t = ((frameCount * 0.6 + k * (h / 9) + (seed || 0) * 37) % h);
    const a = (1 - t / h) * (dark ? 0.32 : 0.18);
    const r = 10 + t * 0.22;
    ctx.fillStyle = dark ? `rgba(40,36,34,${a})` : `rgba(230,234,238,${a})`;
    ctx.beginPath(); ctx.arc(x + Math.sin(t * 0.03 + k) * 10 + t * 0.12, y - t, r, 0, Math.PI * 2); ctx.fill();
  }
}

// Flames over a base line, width w.
function _slFire(x, y, w, scale) {
  scale = scale || 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x + w / 2, y - 10 * scale, 2, x + w / 2, y - 10 * scale, w * 0.9 + 30);
  g.addColorStop(0, 'rgba(255,150,50,0.45)'); g.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = g; ctx.fillRect(x - w, y - w - 60 * scale, w * 3, w + 90 * scale);
  for (let k = 0; k < Math.max(3, w / 9); k++) {
    const fx = x + (k + 0.5) * (w / Math.max(3, w / 9));
    const fh = (22 + 18 * _slHash(k + x)) * scale * (0.8 + 0.35 * Math.sin(frameCount * 0.25 + k * 1.7));
    ctx.fillStyle = k % 2 ? 'rgba(255,120,30,0.75)' : 'rgba(255,190,70,0.75)';
    ctx.beginPath(); ctx.moveTo(fx - 7 * scale, y); ctx.quadraticCurveTo(fx - 6 * scale, y - fh * 0.6, fx + Math.sin(frameCount * 0.2 + k) * 3, y - fh);
    ctx.quadraticCurveTo(fx + 6 * scale, y - fh * 0.5, fx + 7 * scale, y); ctx.fill();
  }
  ctx.restore();
}

// A small portal: an elliptical rift with a bright rim. Used for the swarm of
// tears that open across the city in chapters 2+.
function _slPortal(x, y, r, hue, seed) {
  const t = frameCount * 0.04 + (seed || 0);
  const br = 0.8 + 0.2 * Math.sin(t * 2);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.6);
  g.addColorStop(0, `hsla(${hue},90%,70%,${0.35 * br})`); g.addColorStop(1, `hsla(${hue},90%,60%,0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
  ctx.restore();
  ctx.fillStyle = `hsl(${hue},60%,8%)`;
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.55, r, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.shadowColor = `hsl(${hue},90%,75%)`; ctx.shadowBlur = 12 * br;
  ctx.strokeStyle = `hsl(${hue},80%,88%)`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.55, r, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = `hsla(${hue},90%,80%,0.6)`; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.3, r * 0.7, Math.sin(t) * 0.3, 0, Math.PI * 2); ctx.stroke();
}

// Rubble heap (decor only), base on G.
function _slRubble(x, G, w, h, col) {
  ctx.fillStyle = col || '#6e6a64';
  ctx.beginPath(); ctx.moveTo(x, G);
  const n = Math.max(4, Math.floor(w / 14));
  for (let i = 0; i <= n; i++) {
    const px = x + (i / n) * w;
    const py = G - h * Math.sin(Math.PI * i / n) * (0.7 + 0.3 * _slHash(i + x));
    ctx.lineTo(px, py);
  }
  ctx.lineTo(x + w, G); ctx.closePath(); ctx.fill();
  for (let k = 0; k < n * 1.5; k++) {
    const bx = x + _slHash(k * 3 + x) * w, by = G - _slHash(k * 7 + x) * h * 0.8;
    ctx.fillStyle = k % 2 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.10)';
    ctx.fillRect(bx, by, 6 + _slHash(k) * 8, 4 + _slHash(k + 1) * 4);
  }
  ctx.strokeStyle = '#4c4038'; ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) { const rx = x + w * (0.25 + k * 0.22); ctx.beginPath(); ctx.moveTo(rx, G - h * 0.3); ctx.lineTo(rx + 14 - k * 9, G - h * 0.9 - 10); ctx.stroke(); }
}

// Rooftop furniture ----------------------------------------------------------
function _slAcUnit(x, y, w, h) {
  ctx.fillStyle = '#9aa1a6'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#7f868b'; ctx.fillRect(x, y, w, 4);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  for (let gx = x + 6; gx < x + w * 0.55; gx += 4) { ctx.beginPath(); ctx.moveTo(gx, y + 8); ctx.lineTo(gx, y + h - 6); ctx.stroke(); }
  ctx.fillStyle = '#3c4246'; ctx.beginPath(); ctx.arc(x + w * 0.78, y + h / 2 + 2, Math.min(w, h) * 0.26, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#9aa1a6'; ctx.lineWidth = 2;
  const a = frameCount * 0.3;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + w * 0.78, y + h / 2 + 2); ctx.lineTo(x + w * 0.78 + Math.cos(a + k * 2.1) * Math.min(w, h) * 0.22, y + h / 2 + 2 + Math.sin(a + k * 2.1) * Math.min(w, h) * 0.22); ctx.stroke(); }
}

function _slWaterTower(x, legTop, w, tankH) {
  // Legs from roof (legTop + legH) up to the deck at legTop
  ctx.strokeStyle = '#3a3330'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x + 6, legTop + 110); ctx.lineTo(x + 12, legTop); ctx.moveTo(x + w - 6, legTop + 110); ctx.lineTo(x + w - 12, legTop); ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x + 8, legTop + 100); ctx.lineTo(x + w - 10, legTop + 10); ctx.moveTo(x + w - 8, legTop + 100); ctx.lineTo(x + 10, legTop + 10); ctx.stroke();
  ctx.fillStyle = '#2e2926'; ctx.fillRect(x - 4, legTop, w + 8, 6);
  // Wooden tank with hoops and a conical cap
  const tg = ctx.createLinearGradient(x, 0, x + w, 0);
  tg.addColorStop(0, '#6e5440'); tg.addColorStop(0.5, '#8a6c52'); tg.addColorStop(1, '#5a4434');
  ctx.fillStyle = tg; ctx.fillRect(x + 4, legTop - tankH, w - 8, tankH);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
  for (let sx = x + 10; sx < x + w - 6; sx += 8) { ctx.beginPath(); ctx.moveTo(sx, legTop - tankH); ctx.lineTo(sx, legTop); ctx.stroke(); }
  ctx.strokeStyle = '#2a2624'; ctx.lineWidth = 2.5;
  for (const hy of [0.2, 0.5, 0.8]) { ctx.beginPath(); ctx.moveTo(x + 4, legTop - tankH * hy); ctx.lineTo(x + w - 4, legTop - tankH * hy); ctx.stroke(); }
  ctx.fillStyle = '#3c3532';
  ctx.beginPath(); ctx.moveTo(x - 2, legTop - tankH); ctx.lineTo(x + w / 2, legTop - tankH - 30); ctx.lineTo(x + w + 2, legTop - tankH); ctx.fill();
}

function _slAntenna(x, base, h, blink) {
  ctx.strokeStyle = '#4a4f55'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - h); ctx.stroke();
  ctx.lineWidth = 1;
  for (let k = 1; k < 5; k++) { const y = base - h * k / 5, s = (5 - k) * 3; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.stroke(); }
  if (blink && (frameCount % 80) < 40) {
    ctx.fillStyle = '#ff4433'; ctx.beginPath(); ctx.arc(x, base - h, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,60,40,0.25)'; ctx.beginPath(); ctx.arc(x, base - h, 9, 0, Math.PI * 2); ctx.fill();
  }
}

function _slDish(x, y, r, face) {
  ctx.fillStyle = '#5a6066'; ctx.fillRect(x - 2, y, 4, r);
  ctx.fillStyle = '#d6d9dc';
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.35, r, face * 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8c9196'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + face * r * 0.9, y - r * 0.2); ctx.stroke();
}

// Rooftop stair bulkhead: a box with a door and a little roof.
function _slBulkhead(x, G, w, h, wall) {
  _slBrick(x, G - h, w, h, wall || '#7a5446');
  ctx.fillStyle = '#3c3f44'; ctx.fillRect(x - 4, G - h - 6, w + 8, 8);
  ctx.fillStyle = '#4d5a62'; ctx.fillRect(x + w / 2 - 15, G - 64, 30, 64);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + w / 2 + 8, G - 34, 4, 3);
  ctx.fillStyle = '#ffd896'; ctx.fillRect(x + w / 2 - 4, G - 76, 8, 6);
}

function _slSkylight(x, G, w) {
  ctx.fillStyle = '#4a4e52'; ctx.fillRect(x, G - 14, w, 14);
  ctx.fillStyle = 'rgba(150,190,210,0.55)';
  ctx.beginPath(); ctx.moveTo(x + 4, G - 14); ctx.lineTo(x + w / 2, G - 34); ctx.lineTo(x + w - 4, G - 14); ctx.fill();
  ctx.strokeStyle = '#3a3e42'; ctx.lineWidth = 1.5; ctx.stroke();
}

// Parapet + roof surface used by the rooftop chapters.
function _slParapet(x0, x1, y, col) {
  ctx.fillStyle = col || '#8a7c6c'; ctx.fillRect(x0, y - 12, x1 - x0, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x0, y - 12, x1 - x0, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  for (let px = Math.ceil(x0 / 40) * 40; px < x1; px += 40) ctx.fillRect(px, y - 12, 1, 12);
}

// Chain-link fence panel.
function _slChainFence(x, G, w, h) {
  ctx.strokeStyle = 'rgba(150,156,160,0.55)'; ctx.lineWidth = 1;
  ctx.save(); ctx.beginPath(); ctx.rect(x, G - h, w, h); ctx.clip();
  for (let k = -h; k < w; k += 8) {
    ctx.beginPath(); ctx.moveTo(x + k, G); ctx.lineTo(x + k + h, G - h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + k + h, G); ctx.lineTo(x + k, G - h); ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#6c7276';
  for (let px = x; px <= x + w; px += Math.max(40, w / 4)) ctx.fillRect(px - 2, G - h - 4, 4, h + 4);
  ctx.fillRect(x, G - h - 4, w, 3);
}

// Caged wall lamp casting a cone of light down to G.
function _slWallLamp(x, y, G, warm) {
  const c = warm ? '255,206,140' : '200,220,255';
  const g = ctx.createLinearGradient(0, y, 0, G);
  g.addColorStop(0, `rgba(${c},0.32)`); g.addColorStop(1, `rgba(${c},0.06)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x - 6, y + 4); ctx.lineTo(x + 6, y + 4); ctx.lineTo(x + 70, G); ctx.lineTo(x - 70, G); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2a2c2e'; ctx.fillRect(x - 8, y - 6, 16, 10);
  ctx.fillStyle = `rgb(${c})`; ctx.fillRect(x - 5, y + 2, 10, 4);
}

// Bookshelf column (for the archive): `x,y` top-left, shelves of spines.
function _slBookshelf(x, y, w, h, wood) {
  ctx.fillStyle = wood || '#4a3424'; ctx.fillRect(x, y, w, h);
  const rows = Math.max(1, Math.floor(h / 34));
  for (let r = 0; r < rows; r++) {
    const sy = y + 6 + r * (h - 8) / rows, sh = (h - 8) / rows - 6;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x + 4, sy, w - 8, sh);
    let bx = x + 6;
    let k = 0;
    while (bx < x + w - 8) {
      const bw = 4 + _slHash(x + r * 13 + k) * 6, bh = sh * (0.7 + 0.28 * _slHash(k * 7 + r + x));
      if (_slHash(k * 3 + r * 5 + x) < 0.08) { bx += bw + 6; k++; continue; }
      const hue = [18, 32, 200, 350, 120, 40][Math.floor(_slHash(k + r * 9 + x) * 6)];
      ctx.fillStyle = `hsl(${hue},${25 + _slHash(k) * 25}%,${22 + _slHash(k + 2) * 18}%)`;
      ctx.fillRect(bx, sy + sh - bh, bw, bh);
      bx += bw + 1; k++;
    }
    ctx.fillStyle = wood || '#4a3424'; ctx.fillRect(x, sy + sh, w, 6);
  }
  ctx.fillStyle = 'rgba(255,230,190,0.08)'; ctx.fillRect(x, y, w, 3);
}

// A jagged sky crack (chapter 4's "cracks in porcelain").
function _slSkyCrack(pts, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = '#c9a2ff'; ctx.shadowBlur = 16;
  ctx.strokeStyle = `rgba(236,224,255,${alpha})`; ctx.lineWidth = 2;
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  ctx.lineWidth = 6; ctx.strokeStyle = `rgba(170,120,255,${alpha * 0.35})`; ctx.stroke();
  ctx.restore();
}

// Seeded jagged polyline helper for cracks.
function _slJag(x0, y0, x1, y1, n, amp, seed) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const j = (i === 0 || i === n) ? 0 : (_slHash(seed + i) - 0.5) * amp * 2;
    out.push([x0 + (x1 - x0) * t + j * 0.4, y0 + (y1 - y0) * t + j]);
  }
  return out;
}

// ── Generic floor surfaces ───────────────────────────────────────────────────
// `zones` = [{ x0, x1, kind, face }]. Every floor platform under a zone gets
// that surface at its own height, so raised/sunken floor segments are dressed
// too. kind: asphalt | sidewalk | lawn | alley | roof | rubble | tile | tunnel |
// parquet | mud | sandstone. face (slab cross-section): soil | brick | concrete | none.
const _SL_SURF = {
  asphalt:  { top: '#4a4c50', bot: '#2f3134', depth: 26, lip: 16, lipCol: '#2f3134' },
  sidewalk: { top: '#b4b0a6', bot: '#a8a49a', depth: 18, lip: 10, lipCol: '#9c988e', joints: 48 },
  lawn:     { top: '#6a8a48', bot: '#5f7e40', depth: 16, lip: 12, lipCol: '#5b7a3e' },
  alley:    { top: '#4a4744', bot: '#36332f', depth: 22, lip: 12, lipCol: '#2e2b28', wet: true, joints: 90 },
  roof:     { top: '#3d3d40', bot: '#2c2c2f', depth: 16, lip: 10, lipCol: '#7e7062', gravel: true },
  rubble:   { top: '#5a5650', bot: '#46423d', depth: 22, lip: 12, lipCol: '#3e3a35', cracked: true },
  tile:     { top: '#c9c3b6', bot: '#b2ac9f', depth: 20, lip: 10, lipCol: '#8e897f', joints: 40, shine: true },
  tunnel:   { top: '#4c4f52', bot: '#3a3d40', depth: 20, lip: 12, lipCol: '#303336', joints: 120, wet: true },
  parquet:  { top: '#6a4c34', bot: '#5a3e2a', depth: 16, lip: 10, lipCol: '#4a3222', joints: 22 },
  mud:      { top: '#5a4230', bot: '#3e2c1e', depth: 20, lip: 12, lipCol: '#2e2016', cracked: true },
  sandstone:{ top: '#9a8470', bot: '#7a6450', depth: 18, lip: 12, lipCol: '#5a4838', joints: 140 },
};

function _slSurfaces(v, a, ph, zones) {
  const front = ph === 'front';
  const floors = (a.platforms || []).filter(p => p.isFloor);
  const holes = front ? (a.undergroundRects || []).filter(r => r.kind === 'shaft').map(r => [r.x, r.x + r.w]) : [];
  for (const fl of floors) {
    for (const z of zones) {
      const x0 = Math.max(z.x0, fl.x, v.x - 20), x1 = Math.min(z.x1, fl.x + fl.w, v.x + v.w + 20);
      if (x1 <= x0) continue;
      const S = _SL_SURF[z.kind] || _SL_SURF.asphalt;
      const gy = fl.y, faceB = gy + Math.min(fl.h, 120);
      const y0 = front ? gy : gy - S.depth - 2, y1 = front ? faceB : gy;
      ctx.save();
      ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0);
      for (const [h0, h1] of holes) if (h1 > x0 && h0 < x1) ctx.rect(Math.max(h0, x0), y0, Math.min(h1, x1) - Math.max(h0, x0), y1 - y0);
      ctx.clip('evenodd');
      if (!front) {
        const g = ctx.createLinearGradient(0, gy - S.depth, 0, gy);
        g.addColorStop(0, S.top); g.addColorStop(1, S.bot);
        ctx.fillStyle = g; ctx.fillRect(x0, gy - S.depth, x1 - x0, S.depth);
        ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(x0, gy - S.depth, x1 - x0, 1.5);
        if (S.joints) {
          ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
          for (let jx = Math.ceil(x0 / S.joints) * S.joints; jx < x1; jx += S.joints) { ctx.beginPath(); ctx.moveTo(jx, gy - S.depth); ctx.lineTo(jx - 6, gy); ctx.stroke(); }
        }
        if (S.wet) {
          for (let k = Math.floor(x0 / 140); k * 140 < x1; k++) {
            if (_slHash(k * 3 + 1) < 0.5) continue;
            const px = k * 140 + _slHash(k) * 80;
            ctx.fillStyle = 'rgba(160,180,210,0.16)';
            ctx.beginPath(); ctx.ellipse(px, gy - S.depth * 0.45, 26 + _slHash(k + 5) * 30, 3.5, 0, 0, Math.PI * 2); ctx.fill();
          }
        }
        if (S.gravel) {
          ctx.fillStyle = 'rgba(160,156,150,0.25)';
          for (let k = Math.floor(x0 / 9); k * 9 < x1; k++) ctx.fillRect(k * 9 + _slHash(k) * 6, gy - S.depth + _slHash(k + 9) * S.depth, 1.5, 1.5);
        }
        if (S.cracked) {
          ctx.strokeStyle = 'rgba(20,18,16,0.6)'; ctx.lineWidth = 1.2;
          for (let k = Math.floor(x0 / 70); k * 70 < x1; k++) {
            const cx = k * 70 + _slHash(k) * 40;
            ctx.beginPath(); ctx.moveTo(cx, gy - S.depth); ctx.lineTo(cx + 8, gy - S.depth * 0.5); ctx.lineTo(cx + 2, gy); ctx.stroke();
          }
        }
        if (S.shine) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x0, gy - S.depth * 0.6, x1 - x0, 2); }
      } else {
        const face = z.face || 'soil';
        if (face === 'soil') {
          const sg = ctx.createLinearGradient(0, gy + S.lip, 0, faceB);
          sg.addColorStop(0, '#5a4a3a'); sg.addColorStop(0.35, '#4a3d31'); sg.addColorStop(1, '#2e2620');
          ctx.fillStyle = sg; ctx.fillRect(x0, gy + S.lip, x1 - x0, faceB - gy - S.lip);
          ctx.fillStyle = 'rgba(20,16,12,0.35)';
          for (let k = Math.floor(x0 / 37); k * 37 < x1; k++) {
            const sx = k * 37 + _slHash(k) * 30, sy = gy + 22 + _slHash(k + 77) * 56, r = 2 + _slHash(k + 13) * 4;
            ctx.beginPath(); ctx.ellipse(sx, sy, r * 1.4, r, 0, 0, Math.PI * 2); ctx.fill();
          }
        } else if (face === 'brick') {
          _slBrick(x0, gy + S.lip, x1 - x0, faceB - gy - S.lip, z.brick || '#6e4a3c');
          if (z.windows !== false) _slWindowGrid(Math.floor(x0 / 90) * 90, gy + S.lip + 14, Math.ceil((x1 - x0) / 90 + 1) * 90, 70, Math.ceil((x1 - x0) / 90 + 1), 1, { lit: 0.35, seed: z.x0 });
        } else if (face === 'concrete') {
          const cg = ctx.createLinearGradient(0, gy + S.lip, 0, faceB);
          cg.addColorStop(0, '#5d5f61'); cg.addColorStop(1, '#2f3133');
          ctx.fillStyle = cg; ctx.fillRect(x0, gy + S.lip, x1 - x0, faceB - gy - S.lip);
          ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
          for (let jx = Math.ceil(x0 / 160) * 160; jx < x1; jx += 160) { ctx.beginPath(); ctx.moveTo(jx, gy + S.lip); ctx.lineTo(jx, faceB); ctx.stroke(); }
        }
        ctx.fillStyle = S.lipCol; ctx.fillRect(x0, gy, x1 - x0, S.lip);
        ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x0, gy, x1 - x0, 1.5);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x0, gy + S.lip - 2, x1 - x0, 2);
      }
      ctx.restore();
    }
  }
}

// ── Boss arenas (arena.base 'creator') ───────────────────────────────────────
// The boss floor hazard (bossFloorState in smb-loop-core.js) is drawn by the
// creator/void theme drawers, which a story arena replaces — call this from the
// level's surface 'front' phase so the warning flash and the lava / missing
// floor still read. The floor slab is x0..x1 at G (the hazard line is 460).
function _slBossFloor(x0, x1, G) {
  if (typeof bossFloorState === 'undefined') return;
  if (bossFloorState === 'warning' && Math.sin(frameCount * 0.35) > 0) {
    ctx.fillStyle = bossFloorType === 'lava' ? 'rgba(255,70,0,0.55)' : 'rgba(20,0,60,0.70)';
    ctx.fillRect(x0, G, x1 - x0, 60);
  } else if (bossFloorState === 'hazard') {
    if (bossFloorType === 'lava' && typeof _drawLavaFloor === 'function') { _drawLavaFloor(G, 0.22, 20); return; }
    const g = ctx.createLinearGradient(0, G, 0, G + 200);
    g.addColorStop(0, 'rgba(20,0,60,0.92)'); g.addColorStop(0.3, 'rgba(8,0,30,0.97)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g; ctx.fillRect(x0 - 200, G - 2, x1 - x0 + 400, 400);
  }
}

// ── Relay / fracture-tech furniture (Veran's stations, collector nodes) ─────
// Crystal pillar: a faceted shard on a plinth, glowing in `hue`.
function _slCrystal(x, base, h, hue, seed) {
  const p = 0.65 + 0.35 * Math.sin(frameCount * 0.04 + (seed || 0));
  ctx.fillStyle = '#2a2c34'; ctx.fillRect(x - 22, base - 16, 44, 16);
  ctx.fillStyle = '#3a3e48'; ctx.fillRect(x - 26, base - 20, 52, 6);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, base - h * 0.55, 4, x, base - h * 0.55, h * 0.8);
  g.addColorStop(0, `hsla(${hue},90%,70%,${0.30 * p})`); g.addColorStop(1, `hsla(${hue},90%,60%,0)`);
  ctx.fillStyle = g; ctx.fillRect(x - h * 0.8, base - h * 1.35, h * 1.6, h * 1.6);
  ctx.restore();
  ctx.fillStyle = `hsla(${hue},70%,${55 + 15 * p}%,0.85)`;
  ctx.beginPath(); ctx.moveTo(x, base - h); ctx.lineTo(x + 14, base - h * 0.62); ctx.lineTo(x + 10, base - 20); ctx.lineTo(x - 10, base - 20); ctx.lineTo(x - 14, base - h * 0.62); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.moveTo(x, base - h); ctx.lineTo(x + 4, base - h * 0.6); ctx.lineTo(x, base - 22); ctx.lineTo(x - 5, base - h * 0.62); ctx.fill();
}

// Conduit: a thick pipe with energy pulses running along it (horizontal).
function _slConduit(x0, x1, y, hue, r) {
  r = r || 7;
  ctx.fillStyle = '#2a2e36'; ctx.fillRect(x0, y - r, x1 - x0, r * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x0, y - r + 2, x1 - x0, 2);
  ctx.fillStyle = `hsla(${hue},90%,65%,0.55)`; ctx.fillRect(x0, y - 1.5, x1 - x0, 3);
  for (let k = Math.floor(x0 / 160); k * 160 < x1; k++) {
    const px = k * 160 + ((frameCount * 3) % 160);
    if (px < x0 || px > x1) continue;
    ctx.fillStyle = `hsla(${hue},100%,85%,0.9)`; ctx.fillRect(px, y - 3, 22, 6);
  }
  ctx.fillStyle = '#1e2128';
  for (let k = Math.ceil(x0 / 120) * 120; k < x1; k += 120) ctx.fillRect(k - 4, y - r - 3, 8, r * 2 + 6);
}

// Wall of chalked equations (Veran writes on every surface).
const _SL_EQ = ['Δφ = ∮ κ·ds', 'ψ₉₅ ≠ ψ₉₄', 'r_f > 7.2 ⇒ seam', 'Ω(t) → harvest?', '∂S/∂t = −λS', 'k = 17 points', 'bond: body ∧ soul ∧ frag', 'λ ≈ 0.08 (phase)'];
function _slEquations(x, y, w, h, seed) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = 'rgba(230,236,240,0.45)'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
  for (let k = 0; k < Math.floor(h / 22); k++) {
    ctx.fillText(_SL_EQ[(k + (seed || 0)) % _SL_EQ.length], x + 6 + _slHash(k + (seed || 0)) * Math.max(0, w - 140), y + 18 + k * 22);
  }
  ctx.strokeStyle = 'rgba(230,236,240,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x + w * 0.7, y + h * 0.4, 18, 0, Math.PI * 1.6); ctx.stroke();
  ctx.restore();
}

// Holographic panel: a translucent screen with a slowly rotating wireframe.
function _slHolo(x, y, w, h, hue) {
  ctx.fillStyle = `hsla(${hue},80%,60%,0.10)`; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = `hsla(${hue},90%,70%,0.6)`; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) * 0.32, t = frameCount * 0.01;
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(cx, cy, r, r * Math.abs(Math.cos(t + k)), k * 1.05, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = `hsla(${hue},90%,80%,0.8)`;
  for (let k = 0; k < 4; k++) ctx.fillRect(x + 6, y + 6 + k * 6, 18 + ((frameCount >> 3) * 7 + k * 13) % 30, 2);
}

// ── War-Torn Dimension furniture (chapters 86–89) ───────────────────────────
// Burning sky: smoke banks, a fire glow on the horizon, flashes of distant
// impacts. Draw from a level's backdrop.
function _slWarSky(v, seed) {
  _slSkyAbove(v, '#1a0e08');
  _slParallax(v, 0.04, (l, r) => {
    const g = ctx.createLinearGradient(0, 200, 0, 440);
    g.addColorStop(0, 'rgba(255,110,40,0)'); g.addColorStop(1, 'rgba(255,110,40,0.35)');
    ctx.fillStyle = g; ctx.fillRect(l - 20, 200, r - l + 40, 240);
    for (let i = Math.floor(l / 220) - 1; i * 220 < r + 220; i++) {
      ctx.fillStyle = 'rgba(30,18,12,0.45)';
      ctx.beginPath(); ctx.ellipse(i * 220 + _slHash(i + (seed || 0)) * 100, 60 + _slHash(i + 1 + (seed || 0)) * 80, 180, 40, 0, 0, Math.PI * 2); ctx.fill();
    }
    const fk = Math.floor(frameCount / 23);
    if (_slHash(fk + (seed || 0)) < 0.35) {
      const fx = l + _slHash(fk * 7) * (r - l), fy = 250 + _slHash(fk * 3) * 120;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const fg = ctx.createRadialGradient(fx, fy, 2, fx, fy, 90);
      fg.addColorStop(0, 'rgba(255,200,120,0.45)'); fg.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = fg; ctx.fillRect(fx - 90, fy - 90, 180, 180);
      ctx.restore();
    }
  });
}

// Far battle line: silhouettes of siege towers, trebuchets and banners.
function _slWarLine(v, par, seed, col) {
  _slParallax(v, par, (l, r) => {
    ctx.fillStyle = col || '#2a1810';
    ctx.fillRect(l - 20, 410, r - l + 40, 30);
    for (let i = Math.floor(l / 130) - 1; i * 130 < r + 130; i++) {
      const x = i * 130 + _slHash(i + seed) * 60, k = _slHash(i + seed + 1);
      if (k < 0.3) { ctx.fillRect(x, 300, 40, 110); ctx.fillRect(x - 6, 292, 52, 10); for (let b = 0; b < 4; b++) ctx.fillRect(x - 6 + b * 14, 284, 8, 8); }
      else if (k < 0.55) { ctx.save(); ctx.translate(x + 20, 360); ctx.rotate(-0.5 + 0.3 * Math.sin(frameCount * 0.01 + i)); ctx.fillRect(-2, -70, 4, 90); ctx.restore(); ctx.fillRect(x, 380, 40, 30); }
      else if (k < 0.8) { ctx.fillRect(x + 10, 330, 3, 80); ctx.beginPath(); ctx.moveTo(x + 13, 330); ctx.lineTo(x + 40, 338 + Math.sin(frameCount * 0.05 + i) * 3); ctx.lineTo(x + 13, 350); ctx.fill(); }
    }
  });
}

// War banner on a pole, cloth rippling. `x` is the pole; base on G.
function _slBanner(x, G, h, col, seed) {
  ctx.fillStyle = '#3a2a1c'; ctx.fillRect(x - 2, G - h, 4, h);
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(x + 2, G - h + 4);
  for (let k = 0; k <= 6; k++) ctx.lineTo(x + 2 + k * 7, G - h + 4 + Math.sin(frameCount * 0.08 + k * 0.8 + (seed || 0)) * 3);
  for (let k = 6; k >= 0; k--) ctx.lineTo(x + 2 + k * 7, G - h + 44 + Math.sin(frameCount * 0.08 + k * 0.8 + (seed || 0)) * 3 + (k === 6 ? -8 : 0));
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 2, G - h + 30, 42, 4);
}

// Palisade of sharpened logs, base on G.
function _slPalisade(x, G, w, h) {
  for (let px = x; px < x + w; px += 14) {
    const ph = h - _slHash(px) * 18;
    ctx.fillStyle = (px / 14) % 2 ? '#5a3e26' : '#4e3620'; ctx.fillRect(px, G - ph, 12, ph);
    ctx.beginPath(); ctx.moveTo(px, G - ph); ctx.lineTo(px + 6, G - ph - 12); ctx.lineTo(px + 12, G - ph); ctx.fill();
  }
  ctx.fillStyle = '#3a2a1c'; ctx.fillRect(x, G - h * 0.7, w, 6); ctx.fillRect(x, G - h * 0.3, w, 6);
}

// Cheval de frise: crossed sharpened stakes, base on G.
function _slStakes(x, G, w) {
  ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, G - 14); ctx.lineTo(x + w, G - 14); ctx.stroke();
  ctx.lineWidth = 3;
  for (let k = 8; k < w; k += 18) { ctx.beginPath(); ctx.moveTo(k + x - 12, G); ctx.lineTo(k + x + 12, G - 32); ctx.moveTo(k + x + 12, G); ctx.lineTo(k + x - 12, G - 32); ctx.stroke(); }
}

// Shell crater rim (decor), centred on x.
function _slCrater(x, G, w) {
  ctx.fillStyle = '#1e140c'; ctx.beginPath(); ctx.ellipse(x, G - 2, w / 2, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4a3626';
  ctx.beginPath(); ctx.moveTo(x - w / 2 - 14, G); ctx.quadraticCurveTo(x - w / 2, G - 14, x - w / 2 + 10, G - 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + w / 2 + 14, G); ctx.quadraticCurveTo(x + w / 2, G - 14, x + w / 2 - 10, G - 2); ctx.fill();
}

// ── Fracture Coast (chapters 113–118) ────────────────────────────────────────
// The coast splits time into visible layers: every wave line is drawn three
// times — where it was (faint), where it is, where it will be (faint).
function _slTimeSea(v, top) {
  _slParallax(v, 0.2, (l, r) => {
    ctx.fillStyle = '#0a1830'; ctx.fillRect(l - 20, top, r - l + 40, 440 - top);
    for (const [dt, a] of [[-40, 0.12], [0, 0.45], [40, 0.18]]) {
      ctx.strokeStyle = `rgba(150,200,255,${a})`; ctx.lineWidth = 1.5;
      for (let row = 0; row < 4; row++) {
        ctx.beginPath();
        for (let x = Math.floor(l / 20) * 20 - 20; x <= r + 20; x += 20) ctx.lineTo(x, top + 14 + row * 22 + Math.sin(x * 0.02 + (frameCount + dt) * 0.03 + row) * 4);
        ctx.stroke();
      }
    }
  });
}

// ── Creator's domain (chapters 128–144) ──────────────────────────────────────
// "Compressed dimensional logic": a square lattice at a given density.
function _slLattice(x, y, w, h, a, step) {
  ctx.strokeStyle = `rgba(200,190,255,${a})`; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = x; gx <= x + w; gx += step) { ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); }
  for (let gy = y; gy <= y + h; gy += step) { ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); }
  ctx.stroke();
}

// ── Story scenes on level art ────────────────────────────────────────────────
// Narrative scenes (smb-story-narrative-scene.js, spec `bg: 'level'` with
// `level: { ch, x }`) can stand the figures in a chapter's authored map instead
// of a generic backdrop. Level code draws through the global `ctx`, which is
// bound to the game canvas, so the art is rendered there, copied into the scene
// canvas, and the game canvas's own pixels are put back (the menu runs a live
// background match behind the scene overlay).
let _slSceneSnap = null;
// Default scene spot for a chapter's own map: the duel point for walk→fight
// chapters, the opening stretch otherwise; a level can set `sceneX`.
function storyLevelSceneSpec(ch) {
  const lv = storyLevelFor(ch);
  if (!lv || typeof lv.back !== 'function') return null;
  return { ch: ch.id, x: lv.sceneX != null ? lv.sceneX : (ch.walkFight ? 3000 : 420) };
}
function drawStoryLevelScene(dst, w, h, footY, spec) {
  if (!spec) return false;
  const lv = STORY_LEVELS[spec.ch];
  if (!lv || typeof lv.back !== 'function') return false;
  const WL = 6000, G = 440;
  const a = { platforms: lv.floor ? lv.floor(WL) : [{ x: -3000, y: G, w: WL + 6000, h: 88, isFloor: true }], undergroundRects: [], storyLevel: spec.ch };
  if (typeof lv.layout === 'function') a.platforms.push(...lv.layout(WL));
  if (lv.arena) a.platforms = lv.arena.platforms();
  const cw = canvas.width, chh = canvas.height;
  if (!_slSceneSnap) _slSceneSnap = document.createElement('canvas');
  if (_slSceneSnap.width !== cw || _slSceneSnap.height !== chh) { _slSceneSnap.width = cw; _slSceneSnap.height = chh; }
  const snap = _slSceneSnap.getContext('2d');
  snap.clearRect(0, 0, cw, chh); snap.drawImage(canvas, 0, 0);
  const s = chh / 600;                       // ~600 world px tall on screen
  const viewW = cw / s;
  const topY = G - (footY / h) * 600;        // world 440 lands on the scene's foot line
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sky = lv.sky || ['#0a0a1e', '#1a1a2e'];
  const g = ctx.createLinearGradient(0, 0, 0, chh);
  g.addColorStop(0, sky[0]); g.addColorStop(1, sky[sky.length - 1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, cw, chh);
  ctx.setTransform(s, 0, 0, s, -(spec.x - viewW / 2) * s, -topY * s);
  ctx.fillStyle = lv.groundColor || '#222';
  ctx.fillRect(spec.x - viewW, G, viewW * 2, 600);
  for (const part of ['backdrop', 'surfaceBack', 'back', 'surfaceFront']) {
    const fn = part === 'surfaceBack' || part === 'surfaceFront' ? lv.surface : lv[part];
    if (typeof fn !== 'function') continue;
    const v = _storyLevelView();
    if (!v) break;
    ctx.save();
    try { fn(v, a, part === 'surfaceBack' ? 'back' : 'front'); } catch (e) { /* scene art is best-effort */ }
    ctx.restore();
  }
  ctx.restore();
  dst.drawImage(canvas, 0, 0, cw, chh, 0, 0, w, h);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cw, chh); ctx.drawImage(_slSceneSnap, 0, 0); ctx.restore();
  return true;
}

// ── Floating islands (fracture network / void chapters) ──────────────────────
// A torn-off chunk of some world: biome top surface + a jagged rock underside
// tapering into the void. Draw with ph='back' for the top face behind the feet
// and ph='front' for the lip and underside (after platforms).
const _SL_BIOME = {
  city:   { top: '#4a4c50', lip: '#2f3134', rock: '#3a3436' },
  forest: { top: '#5a7a3e', lip: '#486332', rock: '#3e3226' },
  ruins:  { top: '#8a8274', lip: '#6a6458', rock: '#4a443c' },
  ocean:  { top: '#c8b88a', lip: '#a8986a', rock: '#3a4a52' },
  crystal:{ top: '#5a5a7a', lip: '#3a3a5a', rock: '#22203a' },
  desert: { top: '#d8b878', lip: '#b8985a', rock: '#6a4a2e' },
  snow:   { top: '#e8eef2', lip: '#c8d2da', rock: '#4a5260' },
  void:   { top: '#1e1a2e', lip: '#2a2440', rock: '#0e0c18' },
};
function _slIsland(x0, x1, y, biome, ph, seed) {
  const B = _SL_BIOME[biome] || _SL_BIOME.void;
  if (ph === 'back') {
    ctx.fillStyle = B.top; ctx.fillRect(x0, y - 16, x1 - x0, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x0, y - 16, x1 - x0, 2);
    return;
  }
  // Underside: jagged taper
  ctx.fillStyle = B.rock;
  ctx.beginPath(); ctx.moveTo(x0, y + 10);
  const n = Math.max(4, Math.floor((x1 - x0) / 40));
  for (let i = 0; i <= n; i++) {
    const t = i / n, px = x0 + (x1 - x0) * t;
    const depth = (40 + 160 * Math.sin(Math.PI * t)) * (0.7 + 0.3 * _slHash(i + (seed || 0)));
    ctx.lineTo(px, y + 10 + depth);
  }
  ctx.lineTo(x1, y + 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < n; i++) ctx.fillRect(x0 + (i + 0.3) * (x1 - x0) / n, y + 20 + _slHash(i * 3 + (seed || 0)) * 40, 4, 30);
  // Lip
  ctx.fillStyle = B.lip; ctx.fillRect(x0, y, x1 - x0, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x0, y, x1 - x0, 1.5);
  // Torn edges glow faintly where the fracture cut them
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(190,150,255,0.35)'; ctx.fillRect(x0 - 1, y - 16, 2, 60); ctx.fillRect(x1 - 1, y - 16, 2, 60);
  ctx.restore();
}
