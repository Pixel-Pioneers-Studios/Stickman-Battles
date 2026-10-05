// smb-pathfinding.js  v4 — predictive arc-based pathfinding
// Loaded before smb-fighter.js so Fighter can call all pf* helpers.

'use strict';

// ─────────────────────────────────────────────────────────────
// Physics constants (must match Fighter.update())
// ─────────────────────────────────────────────────────────────
const PF_GRAVITY  = 0.65;   // px / frame²
const PF_JUMP_VY  = 20;     // |vy| on ground jump  (vy = -20)
const PF_JUMP2_VY = 17;     // |vy| on double jump   (vy = -17)
const PF_BOT_SPD  = 5.2;    // representative bot vx (hard difficulty)
const PF_NODE_STEP = 220;   // spacing of interior graph nodes along a platform
const PF_MAX_INNER = 40;    // hard cap on interior nodes per platform
const PF_SIDE_OFF  = 70;    // stand-off from a destination platform's near edge
const PF_HEADROOM  = 60;    // min clearance above a surface for it to be standable

// ═════════════════════════════════════════════════════════════
// ARC SIMULATION
// ═════════════════════════════════════════════════════════════

/**
 * Simulate a jump parabola frame-by-frame.
 *
 * feetX, feetY  — launch position (bot horizontal center, bot feet Y)
 * vx            — horizontal speed (signed px/frame, constant throughout)
 * initVY        — initial vertical velocity (negative = upward)
 * arena         — currentArena object
 * useDouble     — fire a second jump at the apex of the first
 * skipPlatIdx   — platform index to skip for the first 8 frames (source platform)
 * maxFrames     — simulation limit (default 160)
 *
 * Returns:
 *   { landed, x, y, platIdx, frame, blocked, died, doubleUsed, arcPoints }
 */
// The arena's real gravity and fall cap, as Fighter.update applies them. A
// fixed 0.65 under-predicted every low-gravity jump by ~2x, so airborne
// correction steered bots toward landings they then sailed past.
function pfArenaGravity(arena) {
  const base = arena.isLowGravity ? 0.28 : arena.isHeavyGravity ? 0.95 : arena.earthPhysics ? 0.88 : PF_GRAVITY;
  return base * ((arena.modifiers && arena.modifiers.gravityMult) || 1);
}

function pfSimulateArc(feetX, feetY, vx, initVY, arena, useDouble, skipPlatIdx, maxFrames) {
  if (!arena || !arena.platforms) return { landed: false };
  const grav  = pfArenaGravity(arena);
  const vyMax = arena.isLowGravity ? 10 : 19;

  const MAX  = maxFrames || 160;
  const pls  = arena.platforms;
  const dyY  = arena.deathY  || (typeof GAME_H !== 'undefined' ? GAME_H + 80 : 700);
  const lavY = (arena.hasLava && arena.lavaY) ? arena.lavaY : Infinity;

  let x  = feetX;
  let y  = feetY;
  let vy = initVY;
  let firedDouble = false;
  let prevY = y;

  // Sparse arc points for debug visualisation (every 4 frames)
  const arcPoints = [[x, y]];

  for (let f = 0; f < MAX; f++) {
    prevY = y;

    // Fire double-jump near apex (vy crosses from negative to ≥ -1)
    if (useDouble && !firedDouble && vy >= -1) {
      vy = -PF_JUMP2_VY;
      firedDouble = true;
    }

    vy = Math.min(vy + grav, vyMax);
    x  += vx;
    y  += vy;

    if (f % 4 === 0) arcPoints.push([x, y]);

    // ── Landing check: feet crossing platform top while falling ──
    if (vy > 0) {
      for (let i = 0; i < pls.length; i++) {
        const pl = pls[i];
        if (pl.isFloorDisabled) continue;
        if (i === skipPlatIdx && f < 8) continue; // ignore launch platform briefly
        // Must enter from above (prevY was above the surface)
        if (x > pl.x + 2 && x < pl.x + pl.w - 2 &&
            prevY <= pl.y + 2 && y >= pl.y) {
          if (arena.hasLava && pl.y >= lavY) return { landed: false, died: true, frame: f, arcPoints };
          return { landed: true, x, y: pl.y, platIdx: i, frame: f, doubleUsed: firedDouble, arcPoints };
        }
      }
    }

    // ── Obstacle check: upward arc passing through platform body ──
    if (vy < 0) {
      for (let i = 0; i < pls.length; i++) {
        const pl = pls[i];
        if (pl.isFloorDisabled) continue;
        if (i === skipPlatIdx) continue;
        const ph = pl.h || 20;
        if (x > pl.x && x < pl.x + pl.w &&
            y > pl.y && y < pl.y + ph) {
          return { landed: false, blocked: true, frame: f, arcPoints };
        }
      }
    }

    // ── Death / lava ──────────────────────────────────────────
    if (y >= dyY || y >= lavY) return { landed: false, died: true, frame: f, arcPoints };
  }

  return { landed: false, frame: MAX, arcPoints };
}

// ─────────────────────────────────────────────────────────────
// pfPredictLanding(bot)
// Simulate bot's current velocity forward to find where it lands.
// Returns arc result or null.
// ─────────────────────────────────────────────────────────────
function pfPredictLanding(bot) {
  if (!currentArena) return null;
  // Find source platform index
  let srcIdx = -1;
  const pls = currentArena.platforms;
  for (let i = 0; i < pls.length; i++) {
    const pl = pls[i];
    if (bot.cx() > pl.x && bot.cx() < pl.x + pl.w &&
        bot.y + bot.h >= pl.y - 2 && bot.y + bot.h <= pl.y + 6) {
      srcIdx = i; break;
    }
  }
  return pfSimulateArc(
    bot.cx(), bot.y + bot.h,
    bot.vx, bot.vy,
    currentArena, false, srcIdx, 120
  );
}

// ─────────────────────────────────────────────────────────────
// pfCheckJumpValid(bot, targetPlatIdx, useDouble)
// Runtime check: will a jump from bot's current position land on
// the specified platform?
// ─────────────────────────────────────────────────────────────
function pfCheckJumpValid(bot, targetPlatIdx, useDouble) {
  if (!currentArena || !bot.onGround) return false;
  const tPl = currentArena.platforms[targetPlatIdx];
  if (!tPl) return false;

  const tCX = tPl.x + tPl.w * 0.5;
  const vx  = (tCX > bot.cx() ? 1 : -1) * Math.min(PF_BOT_SPD * 1.1, 13);

  // Find source platform
  let srcIdx = -1;
  for (let i = 0; i < currentArena.platforms.length; i++) {
    const pl = currentArena.platforms[i];
    if (bot.cx() > pl.x && bot.cx() < pl.x + pl.w &&
        bot.y + bot.h >= pl.y - 2 && bot.y + bot.h <= pl.y + 6) {
      srcIdx = i; break;
    }
  }

  const r = pfSimulateArc(bot.cx(), bot.y + bot.h, vx, -PF_JUMP_VY, currentArena, useDouble, srcIdx, 120);
  return r.landed && r.platIdx === targetPlatIdx;
}

// ─────────────────────────────────────────────────────────────
// pfAirborneCorrect(bot, spd)
// Called every AI tick when bot is airborne.
// Predicts landing; corrects trajectory if unsafe.
// Returns true if a correction was applied (caller skips movement).
// Only fires when bot is actually falling (vy > 0) to avoid
// interfering with intentional jump arcs.
// ─────────────────────────────────────────────────────────────
function pfAirborneCorrect(bot, spd) {
  if (bot.onGround || bot.isBoss || !bot.isAI) return false;
  if (!currentArena) return false;
  // Only correct when falling (vy > 0) — upward arc is deliberate
  if (bot.vy <= 0 && !bot._pfDoubleJumpPending) return false;

  const pred = pfPredictLanding(bot);
  if (!pred) return false;

  // Safe landing → no intervention
  if (pred.landed) return false;

  // ── Unsafe: try double-jump first ──────────────────────────
  if (bot.canDoubleJump && bot.vy > -2) {
    const djPred = pfSimulateArc(
      bot.cx(), bot.y + bot.h,
      bot.vx, -PF_JUMP2_VY,
      currentArena, false, -1, 100
    );
    if (djPred.landed) {
      bot.vy = -PF_JUMP2_VY;
      bot.canDoubleJump = false;
      bot._pfDoubleJumpPending = false;
      return true;
    }
  }

  // ── Try steering toward nearest safe node ──────────────────
  const graph = currentPlatformGraph;
  const safe  = graph ? pfClosestSafeNode(graph, bot.cx(), bot.y) : null;
  if (safe) {
    const rDir    = safe.x > bot.cx() ? 1 : -1;
    const newPred = pfSimulateArc(
      bot.cx(), bot.y + bot.h,
      rDir * spd, bot.vy,
      currentArena, bot.canDoubleJump, -1, 100
    );
    if (newPred.landed) {
      bot.vx = rDir * spd * 1.4;
      // Also use double jump if it helps reach the safe platform
      if (bot.canDoubleJump && bot.vy > 0) {
        bot.vy = -PF_JUMP2_VY; bot.canDoubleJump = false;
      }
      return true;
    }
  }

  // ── Last resort: reverse horizontal direction ───────────────
  if (bot.vy > 2) {
    bot.vx *= -0.7;
    return true;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────
// pfVoidAhead(bot, dir)
// Fast directional void scan (no arc simulation — O(n) scan).
// Returns true if no safe platform exists below the look-ahead point.
// ─────────────────────────────────────────────────────────────
function pfVoidAhead(bot, dir) {
  if (!currentArena) return false;
  const lookX = bot.cx() + dir * 52;
  const footY = bot.y + bot.h;
  const lavY  = currentArena.hasLava ? currentArena.lavaY  : Infinity;
  const dyY   = currentArena.deathY  || Infinity;

  // Still over a platform?
  for (const pl of currentArena.platforms) {
    if (pl.isFloorDisabled) continue;
    if (lookX > pl.x && lookX < pl.x + pl.w &&
        footY <= pl.y + 20 && footY >= pl.y - 12) return false;
  }

  // Scan downward for safe ground
  for (let dy = 0; dy < 220; dy += 12) {
    const testY = footY + dy;
    if (testY >= lavY || testY >= dyY) return true;
    for (const pl of currentArena.platforms) {
      if (pl.isFloorDisabled) continue;
      if (lookX > pl.x && lookX < pl.x + pl.w &&
          testY >= pl.y && testY <= pl.y + 28) return false;
    }
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// pfDropSafe(bot, dir)
// Runtime vertical scan: is there a safe platform below the
// edge the bot is about to walk off?
// ─────────────────────────────────────────────────────────────
function pfDropSafe(bot, dir) {
  if (!currentArena) return false;
  const arena  = currentArena;
  const edgeX  = dir > 0 ? bot.x + bot.w + 8 : bot.x - 8;
  const startY = bot.y + bot.h;
  const lavY   = arena.hasLava ? arena.lavaY : Infinity;
  const dyY    = arena.deathY  || Infinity;

  for (let dy = 10; dy < 300; dy += 10) {
    const testY = startY + dy;
    if (testY >= lavY || testY >= dyY) return false;
    for (const pl of arena.platforms) {
      if (pl.isFloorDisabled) continue;
      if (arena.hasLava && pl.y >= lavY) continue;
      if (edgeX > pl.x && edgeX < pl.x + pl.w &&
          testY >= pl.y && testY <= pl.y + 24) return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────
// Platform safety helpers
// ─────────────────────────────────────────────────────────────
function _pfPlatSafe(pl, arena) {
  if (!pl || pl.isFloorDisabled) return false;
  if (arena.hasLava && arena.lavaY && pl.y + (pl.h || 20) >= arena.lavaY) return false;
  return true;
}

// Safety weight 0–1 used to bias A* edge costs.
// Wider platforms and those far from lava are preferred.
function _pfPlatWeight(pl, arena) {
  if (!_pfPlatSafe(pl, arena)) return 0;
  let w = 1.0;
  if (pl.w < 30) w *= 0.40;
  else if (pl.w < 60) w *= 0.72;
  if (arena.hasLava && arena.lavaY && pl.y + 80 >= arena.lavaY) w *= 0.55;
  return Math.max(0.1, w);
}

// ═════════════════════════════════════════════════════════════
// GRAPH NODES + EDGES
// ═════════════════════════════════════════════════════════════

class PFNode {
  constructor(id, platIdx, x, y, role) {
    this.id = id; this.platIdx = platIdx;
    this.x = x;  this.y = y;  this.role = role;
  }
}

class PlatformGraph {
  constructor() {
    this.nodes     = [];
    this.edges     = new Map(); // nodeId → [{to, cost, action, meta}]
    this.platNodes = [];        // platNodes[platIdx] = [leftId, …, rightId] | null
    this.platMid   = [];        // platMid[platIdx]   = canonical mid node id
    this._nodeMap  = new Map();
  }
  _addNode(n) { this.nodes.push(n); this._nodeMap.set(n.id, n); }
  getNode(id) { return this._nodeMap.get(id) || null; }
  addEdge(fromId, toId, cost, action, meta) {
    if (!this.edges.has(fromId)) this.edges.set(fromId, []);
    this.edges.get(fromId).push({ to: toId, cost, action, meta: meta || {} });
  }
  neighbors(id) { return this.edges.get(id) || []; }
}

// Is there room to stand at (x, surfY)? A platform's top surface is only
// walkable if nothing else's underside is sitting on it. The exploration
// worlds seal their tunnel layer with full-height rock fill whose top edge is
// flush against the surface slab above, and those zero-clearance surfaces were
// being handed to A* as walkable nodes — routing bots into solid stone.
function _pfHeadroomFree(arena, platIdx, x, surfY) {
  for (let k = 0; k < arena.platforms.length; k++) {
    if (k === platIdx) continue;
    const pl = arena.platforms[k];
    if (!pl || pl.isFloorDisabled) continue;
    if (x <= pl.x || x >= pl.x + pl.w) continue;
    const under = pl.y + (pl.h || 20);          // this platform's underside
    if (under <= surfY + 2 && under > surfY - PF_HEADROOM) return false;
  }
  return true;
}

// Nearest node on a given platform to an x position (platforms now carry a
// variable number of nodes, so edge endpoints are looked up rather than indexed).
function _pfNearestNodeOnPlat(graph, platIdx, x) {
  const ids = graph.platNodes[platIdx];
  if (!ids || !ids.length) return null;
  let best = ids[0], bestD = Infinity;
  for (const id of ids) {
    const n = graph.getNode(id);
    if (!n) continue;
    const dx = Math.abs(n.x - x);
    if (dx < bestD) { bestD = dx; best = id; }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────
// buildPlatformGraph(arena)
// Arc-simulation-verified graph: every cross-platform edge is
// only added when pfSimulateArc confirms the bot actually lands
// on the intended destination.
// ─────────────────────────────────────────────────────────────
function buildPlatformGraph(arena) {
  if (!arena || !arena.platforms || !arena.platforms.length) return null;

  const graph  = new PlatformGraph();
  let   nextId = 0;

  // ── Step 1: nodes along each platform ────────────────────
  // Three nodes per platform (left/center/right) is fine for a 900px arena but
  // useless on the exploration worlds, whose floor and bedrock are single
  // platforms thousands of pixels wide: a bot standing at x=1300 had its
  // nearest node at the world centre, so pfClosestNode resolved it onto a
  // platform it wasn't even on and A* found no path at all. Long platforms now
  // carry interior nodes every PF_NODE_STEP px, capped so the build stays cheap.
  for (let i = 0; i < arena.platforms.length; i++) {
    const pl = arena.platforms[i];
    if (!_pfPlatSafe(pl, arena)) { graph.platNodes.push(null); continue; }

    const inset  = Math.min(12, pl.w * 0.1);
    const leftX  = pl.x + inset;
    const rightX = pl.x + pl.w - inset;
    const surfY  = pl.y;
    const span   = Math.max(0, rightX - leftX);

    // Interior sample count, bounded both ways.
    const inner = Math.max(1, Math.min(PF_MAX_INNER, Math.round(span / PF_NODE_STEP) - 1));
    const xs    = [leftX];
    for (let k = 1; k <= inner; k++) xs.push(leftX + (span * k) / (inner + 1));
    xs.push(rightX);

    const ids = [], kept = [];
    for (let k = 0; k < xs.length; k++) {
      if (!_pfHeadroomFree(arena, i, xs[k], surfY)) continue;
      const role = k === 0 ? 'left' : k === xs.length - 1 ? 'right' : 'center';
      const n = new PFNode(nextId++, i, xs[k], surfY, role);
      graph._addNode(n);
      ids.push(n.id); kept.push(xs[k]);
    }
    // Entirely buried surface (rock fill under a slab) — not a place to route to.
    if (!ids.length) { graph.platNodes.push(null); continue; }
    graph.platNodes.push(ids);
    // Mid node kept addressable: the cross-platform pass still wants one
    // canonical "anywhere on this platform" endpoint for long-range routing.
    graph.platMid[i] = ids[Math.floor(ids.length / 2)];

    // Walk edges: adjacent samples, bidirectional. A chain (rather than the old
    // all-pairs triangle) keeps edge count linear as node count grows and makes
    // A*'s costs reflect real travel time along the platform.
    for (let k = 0; k + 1 < ids.length; k++) {
      const w = Math.abs(kept[k + 1] - kept[k]) / PF_BOT_SPD;
      graph.addEdge(ids[k],     ids[k + 1], w, 'walk');
      graph.addEdge(ids[k + 1], ids[k],     w, 'walk');
    }
  }

  // ── Step 2: cross-platform edges via arc simulation ──────
  // Every candidate launch point is still arc-verified — the change from the
  // original pass is WHERE a bot is assumed to jump from. Launching only from
  // A's outer edge is correct for small arenas but silently drops every link
  // off a long platform: from the 6000px exploration bedrock the only launch
  // points considered were x=2 and x=5998, so nothing reachable from the middle
  // of the floor (a ledge, a structure, a vault's escape stub) was ever an
  // edge. Each pair now also tries the point on A directly beside B.
  for (let i = 0; i < arena.platforms.length; i++) {
    const nodesA = graph.platNodes[i];
    if (!nodesA) continue;
    const plA    = arena.platforms[i];
    const aCentX = plA.x + plA.w * 0.5;
    const aMinX  = plA.x + 2;
    const aMaxX  = plA.x + plA.w - 2;

    for (let j = 0; j < arena.platforms.length; j++) {
      if (i === j) continue;
      const nodesB = graph.platNodes[j];
      if (!nodesB) continue;
      const plB    = arena.platforms[j];
      if (!_pfPlatSafe(plB, arena)) continue;

      const bCentX   = plB.x + plB.w * 0.5;
      const bIsRight = bCentX >= aCentX;
      const launchY  = plA.y;   // bot feet at platform surface
      const bWeight  = _pfPlatWeight(plB, arena);
      const dY       = plB.y - plA.y; // positive = B is lower

      // Candidate launch points on A, best-first:
      //  1. beside B — stand off B's near edge by PF_SIDE_OFF so the arc rises
      //     alongside it and drifts on, rather than into its underside.
      //  2. A's outer edge facing B (the original, and the only one that works
      //     when A is short enough that its edge already is "beside B").
      const nearEdgeX = bIsRight ? plB.x : plB.x + plB.w;
      const cands     = [
        Math.max(aMinX, Math.min(aMaxX, nearEdgeX + (bIsRight ? -PF_SIDE_OFF : PF_SIDE_OFF))),
        bIsRight ? aMaxX : aMinX,
      ];

      for (let c = 0; c < cands.length; c++) {
        const launchX = cands[c];
        if (c > 0 && Math.abs(launchX - cands[0]) < 8) break; // same point — already tried
        const toB = bCentX - launchX;
        const vx  = (toB === 0 ? (bIsRight ? 1 : -1) : Math.sign(toB)) * PF_BOT_SPD;

        let r, action = null, mult = 1;
        if (dY <= 0) {
          // ── B is at same height or HIGHER — try jump, then doubleJump ──
          r = pfSimulateArc(launchX, launchY, vx, -PF_JUMP_VY, arena, false, i);
          if (r.landed && r.platIdx === j) { action = 'jump'; }
          else {
            r = pfSimulateArc(launchX, launchY, vx, -PF_JUMP_VY, arena, true, i);
            // penalise double: harder to execute
            if (r.landed && r.platIdx === j) { action = 'doubleJump'; mult = 1.35; }
          }
        } else {
          // ── B is LOWER — try drop (walk off edge, no initial upward vy) ──
          // Only from A's own ledge, walking outward. Fighters cannot drop
          // THROUGH a platform, but the arc sim skips the source platform for
          // 8 frames and so happily "fell" through it from the beside-B
          // candidate — an edge from the middle of A to a platform under A that
          // no fighter could take, and a bot that stood on it forever.
          const atEdge = (launchX === aMaxX && vx > 0) || (launchX === aMinX && vx < 0);
          if (!atEdge) continue;
          r = pfSimulateArc(launchX, launchY, vx, 0, arena, false, i);
          if (r.landed && r.platIdx === j) { action = 'drop'; }
        }
        if (!action) continue;

        // cost = air-time in "AI ticks" / platform quality
        const cost       = (r.frame / 15) * mult / bWeight;
        const fromNodeId = _pfNearestNodeOnPlat(graph, i, launchX);
        const toNodeId   = _pfNearestNodeOnPlat(graph, j, r.x);
        const midA       = graph.platMid[i];
        graph.addEdge(fromNodeId, toNodeId, cost, action, { arcPts: r.arcPoints });
        // Keep a link off A's canonical mid node so long-range routes that
        // haven't reached the launch sample yet can still see the transition.
        if (midA !== fromNodeId)
          graph.addEdge(midA, toNodeId, cost * 1.05, action, { arcPts: r.arcPoints });
        break; // this pair is linked; don't spend arcs on the other candidate
      }
    }
  }

  return graph;
}

// ═════════════════════════════════════════════════════════════
// GLOBAL STATE + BUILD
// ═════════════════════════════════════════════════════════════

let currentPlatformGraph = null;

function buildGraphForCurrentArena() {
  currentPlatformGraph = (typeof currentArena !== 'undefined' && currentArena)
    ? buildPlatformGraph(currentArena)
    : null;
}

// ═════════════════════════════════════════════════════════════
// NODE LOOKUP
// ═════════════════════════════════════════════════════════════

function pfClosestNode(graph, x, y) {
  if (!graph || !graph.nodes.length) return null;
  let best = null, bestD = Infinity;
  for (const n of graph.nodes) {
    const d = Math.abs(n.x - x) + Math.abs(n.y - y) * 2.5;
    if (d < bestD) { bestD = d; best = n; }
  }
  return best;
}

function pfClosestSafeNode(graph, x, y) {
  if (!graph || !graph.nodes.length) return null;
  let best = null, bestD = Infinity;
  for (const n of graph.nodes) {
    if (n.role !== 'center') continue;
    const d = Math.abs(n.x - x) + Math.abs(n.y - y) * 2.5;
    if (d < bestD) { bestD = d; best = n; }
  }
  return best || pfClosestNode(graph, x, y);
}

// ═════════════════════════════════════════════════════════════
// A*
// ═════════════════════════════════════════════════════════════

function pfAStar(graph, startId, goalId) {
  if (startId === goalId) return [{ nodeId: startId, action: 'walk' }];
  const goalNode = graph.getNode(goalId);
  if (!goalNode) return null;

  const open   = new Map(); // nodeId → {g, f, parent, action}
  const record = new Map(); // closed
  const closed = new Set();

  const h = (nid) => {
    const n = graph.getNode(nid);
    return n ? (Math.abs(n.x - goalNode.x) + Math.abs(n.y - goalNode.y)) / PF_BOT_SPD : 0;
  };

  open.set(startId, { g: 0, f: h(startId), parent: null, action: 'walk' });

  let iters = 0;
  while (open.size > 0 && iters++ < 900) {
    let curId = null, curF = Infinity;
    for (const [id, d] of open) { if (d.f < curF) { curF = d.f; curId = id; } }
    if (curId === null) break;

    if (curId === goalId) {
      const path = [];
      let c = curId;
      while (c !== null) {
        const r = record.get(c) || open.get(c);
        if (!r) break;
        path.unshift({ nodeId: c, action: r.action || 'walk' });
        c = r.parent;
      }
      return path;
    }

    const curData = open.get(curId);
    record.set(curId, curData);
    closed.add(curId);
    open.delete(curId);

    for (const edge of graph.neighbors(curId)) {
      if (closed.has(edge.to)) continue;
      const gNew = curData.g + edge.cost;
      const ex   = open.get(edge.to);
      if (!ex || gNew < ex.g)
        open.set(edge.to, { g: gNew, f: gNew + h(edge.to), parent: curId, action: edge.action });
    }
  }
  return null;
}

// ═════════════════════════════════════════════════════════════
// MAIN WAYPOINT QUERY
// ═════════════════════════════════════════════════════════════

function pfGetNextWaypoint(bot, targetX, targetY) {
  const graph = currentPlatformGraph;
  if (!graph || !graph.nodes.length) return null;

  // ── Path freshness ────────────────────────────────────────
  bot._pfPathAge = (bot._pfPathAge || 0) + 1;
  const targetMoved = !bot._pfLastTargetX ||
    Math.abs(bot._pfLastTargetX - targetX) > 80 ||
    Math.abs((bot._pfLastTargetY || 0) - targetY) > 80;

  if (!bot._pfPath || bot._pfPathAge >= 18 || targetMoved) {
    // Start from the platform under the bot's FEET when it is standing on one.
    // Nearest-node-to-mid-body picked a node on the platform directly overhead
    // whenever the nearest floor node was farther sideways than the ledge was
    // high (floor nodes are 220px apart), so the path began "walk to the
    // platform above you" and the bot jumped into its underside forever.
    let sNode = null;
    if (bot.onGround && currentArena && currentArena.platforms) {
      const _feet = bot.y + bot.h, _pls = currentArena.platforms;
      for (let pi = 0; pi < _pls.length; pi++) {
        const pl = _pls[pi];
        if (bot.cx() >= pl.x && bot.cx() <= pl.x + pl.w && Math.abs(_feet - pl.y) < 8) {
          const id = _pfNearestNodeOnPlat(graph, pi, bot.cx());
          if (id !== null && id !== undefined) sNode = graph.getNode(id);
          break;
        }
      }
    }
    if (!sNode) sNode = pfClosestNode(graph, bot.cx(), bot.y + bot.h * 0.5);
    const gNode = pfClosestNode(graph, targetX, targetY);
    if (!sNode || !gNode) { bot._pfPath = null; return null; }

    bot._pfPath        = sNode.id === gNode.id
      ? [{ nodeId: sNode.id, action: 'walk' }]
      : pfAStar(graph, sNode.id, gNode.id);
    bot._pfPathAge     = 0;
    bot._pfNodeIdx     = 0;
    bot._pfLastTargetX = targetX;
    bot._pfLastTargetY = targetY;
  }

  if (!bot._pfPath || !bot._pfPath.length) return null;

  // ── Advance node pointer ──────────────────────────────────
  let idx = bot._pfNodeIdx || 0;
  while (idx < bot._pfPath.length) {
    const step = bot._pfPath[idx];
    const node = graph.getNode(step.nodeId);
    if (!node) { idx++; continue; }
    // Node y is the platform SURFACE, so the bot's feet are what should be
    // compared to it — not its mid-height. With mid-height the gap is always
    // h/2, which for the current 84px fighter is 42 against a tolerance of 38:
    // the pointer could never advance while grounded, so every bot walked to
    // the first node of its path and stopped there.
    const dx = Math.abs(bot.cx()          - node.x);
    const dy = Math.abs((bot.y + bot.h)   - node.y);
    if (dx < 30 && dy < 38) { idx++; continue; }
    break;
  }
  bot._pfNodeIdx = idx;
  if (idx >= bot._pfPath.length) return null;

  const step = bot._pfPath[idx];
  const node = graph.getNode(step.nodeId);
  if (!node) return null;

  // ── Runtime safety gates ──────────────────────────────────

  // Drop: re-verify destination platform is still safe
  if (step.action === 'drop') {
    const plB = currentArena && currentArena.platforms[node.platIdx];
    if (!plB || !_pfPlatSafe(plB, currentArena)) {
      forceRecalculatePath(bot); return null;
    }
    // Arc re-check for the drop. A grounded bot is still ON the source
    // platform, walking to its ledge, so the fall is simulated from that ledge
    // the way the graph built it. Simulating from the bot's own feet with no
    // skip landed straight back on the platform it was standing on, failed
    // every time, threw the path away, and left the bot oscillating between the
    // drop node and a direct walk at the target — no drop edge could ever be
    // followed from the ground.
    const dropDir = node.x > bot.cx() ? 1 : -1;
    let _dx0 = bot.cx(), _dy0 = bot.y + bot.h, _skip = -1;
    if (bot.onGround && currentArena.platforms) {
      const _pls = currentArena.platforms;
      for (let pi = 0; pi < _pls.length; pi++) {
        const pl = _pls[pi];
        if (bot.cx() >= pl.x && bot.cx() <= pl.x + pl.w && Math.abs(_dy0 - pl.y) < 8) {
          _dx0 = dropDir > 0 ? pl.x + pl.w - 2 : pl.x + 2; _dy0 = pl.y; _skip = pi; break;
        }
      }
    }
    const dr = pfSimulateArc(_dx0, _dy0, dropDir * PF_BOT_SPD, 0, currentArena, false, _skip, 80);
    if (!dr.landed || dr.platIdx !== node.platIdx) {
      forceRecalculatePath(bot); return null;
    }
  }

  // Jump / doubleJump: arc validity check from current position (only when on ground)
  if ((step.action === 'jump' || step.action === 'doubleJump') && bot.onGround) {
    const useDouble = step.action === 'doubleJump';
    if (!pfCheckJumpValid(bot, node.platIdx, useDouble)) {
      // Platform may have moved (boss arena) or bot is misaligned — reroute
      forceRecalculatePath(bot); return null;
    }
  }

  return { x: node.x, y: node.y, action: step.action, platIdx: node.platIdx };
}

// ─────────────────────────────────────────────────────────────
// pfGetRecoveryWaypoint — nearest safe platform center
// ─────────────────────────────────────────────────────────────
function pfGetRecoveryWaypoint(bot) {
  const graph = currentPlatformGraph;
  if (!graph) return null;
  const safe = pfClosestSafeNode(graph, bot.cx(), bot.y);
  return safe ? { x: safe.x, y: safe.y, action: 'recover' } : null;
}

// ─────────────────────────────────────────────────────────────
// pfCheckStuck — true if bot hasn't moved > 6px over 25 AI ticks
// ─────────────────────────────────────────────────────────────
function pfCheckStuck(bot) {
  bot._pfStuckHistory = bot._pfStuckHistory || [];
  bot._pfStuckHistory.push(bot.cx());
  if (bot._pfStuckHistory.length > 25) bot._pfStuckHistory.shift();
  if (bot._pfStuckHistory.length < 25) return false;
  return Math.max(...bot._pfStuckHistory) - Math.min(...bot._pfStuckHistory) < 6;
}

// ─────────────────────────────────────────────────────────────
// forceRecalculatePath
// ─────────────────────────────────────────────────────────────
function forceRecalculatePath(bot) {
  if (!bot) return;
  bot._pfPath              = null;
  bot._pfPathAge           = 999;
  bot._pfNodeIdx           = 0;
  bot._pfStuckHistory      = [];
  bot._pfDoubleJumpPending = false;
  if (typeof debugMode !== 'undefined' && debugMode)
    console.log('[PF] forceRecalculate →', bot.name || 'bot');
}

// ═════════════════════════════════════════════════════════════
// DEBUG VISUALISATION
// ═════════════════════════════════════════════════════════════

function visualizePlatformGraph() {
  const graph = currentPlatformGraph;
  if (!graph || typeof ctx === 'undefined') return;
  ctx.save();
  ctx.lineWidth = 1.5;

  for (const [fromId, edges] of graph.edges) {
    const from = graph.getNode(fromId);
    if (!from) continue;
    for (const e of edges) {
      const to = graph.getNode(e.to);
      if (!to) continue;
      ctx.strokeStyle =
        e.action === 'walk'       ? 'rgba(0,255,100,0.40)'  :
        e.action === 'jump'       ? 'rgba(80,160,255,0.55)' :
        e.action === 'doubleJump' ? 'rgba(200,80,255,0.65)' :
                                    'rgba(255,200,0,0.50)';
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    }
  }

  for (const n of graph.nodes) {
    ctx.fillStyle = n.role === 'center' ? '#00ffcc' :
                    n.role === 'left'   ? '#ffff44' : '#ff8844';
    ctx.beginPath(); ctx.arc(n.x, n.y, n.role === 'center' ? 4.5 : 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function showBotPath(bot) {
  if (!bot || !bot._pfPath || !currentPlatformGraph || typeof ctx === 'undefined') return;
  const graph = currentPlatformGraph;
  ctx.save();
  ctx.lineWidth = 2.5; ctx.setLineDash([5, 5]);
  let px = bot.cx(), py = bot.cy();
  const start = bot._pfNodeIdx || 0;
  for (let i = start; i < bot._pfPath.length; i++) {
    const step = bot._pfPath[i];
    const n    = graph.getNode(step.nodeId);
    if (!n) continue;
    ctx.strokeStyle =
      step.action === 'doubleJump' ? '#cc44ff' :
      step.action === 'jump'       ? '#44aaff' :
      step.action === 'drop'       ? '#ffcc00' : '#ff44ff';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(n.x, n.y); ctx.stroke();
    ctx.fillStyle = i === start ? '#ff00ff' : '#cc88ff';
    ctx.beginPath(); ctx.arc(n.x, n.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '9px Arial';
    ctx.fillText(step.action[0].toUpperCase(), n.x + 6, n.y - 3);
    px = n.x; py = n.y;
  }
  ctx.setLineDash([]);
  ctx.restore();
}

// showProjectedLanding — draw bot's predicted arc and landing point
function showProjectedLanding(bot) {
  if (!bot || typeof ctx === 'undefined' || !currentArena) return;
  const pred = pfPredictLanding(bot);
  if (!pred || !pred.arcPoints || !pred.arcPoints.length) return;
  ctx.save();
  ctx.strokeStyle = pred.landed ? 'rgba(0,255,180,0.75)' : 'rgba(255,60,60,0.75)';
  ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
  ctx.beginPath();
  pred.arcPoints.forEach(([ax, ay], i) => {
    if (i === 0) ctx.moveTo(ax, ay); else ctx.lineTo(ax, ay);
  });
  ctx.stroke();
  if (pred.landed) {
    ctx.setLineDash([]);
    ctx.fillStyle = '#00ffaa';
    ctx.beginPath(); ctx.arc(pred.x, pred.y, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

// highlightDoubleJumpEdges — show all doubleJump edges with diamond markers
function highlightDoubleJumpEdges() {
  const graph = currentPlatformGraph;
  if (!graph || typeof ctx === 'undefined') return;
  ctx.save();
  ctx.strokeStyle = 'rgba(220,80,255,0.85)';
  ctx.lineWidth   = 2.5; ctx.setLineDash([6, 3]);
  for (const [fromId, edges] of graph.edges) {
    const from = graph.getNode(fromId);
    if (!from) continue;
    for (const e of edges) {
      if (e.action !== 'doubleJump') continue;
      const to = graph.getNode(e.to);
      if (!to) continue;
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
      ctx.fillStyle = '#dd44ff';
      ctx.save();
      ctx.translate(from.x, from.y); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
  }
  ctx.setLineDash([]);
  ctx.restore();
}

// logUnsafeEdgeAttempts — console dump of the unsafe-edge log
const _pfUnsafeLog = [];
function _pfLogUnsafe(bot, action, reason) {
  _pfUnsafeLog.push({ bot: bot.name || 'bot', action, reason, frame: typeof frameCount !== 'undefined' ? frameCount : 0 });
  if (_pfUnsafeLog.length > 30) _pfUnsafeLog.shift();
}
function logUnsafeEdgeAttempts() {
  console.table(_pfUnsafeLog);
  return _pfUnsafeLog;
}
