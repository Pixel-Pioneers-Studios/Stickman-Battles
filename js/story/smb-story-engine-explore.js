'use strict';
// smb-story-engine-explore.js — Exploration chapter: platform gen, enemy scaling, side portal, _launchExplorationChapter
// Depends on: smb-globals.js, smb-story-registry.js (and preceding story-engine splits)

// ============================================================
// EXPLORATION CHAPTER SYSTEM
// ============================================================

// Hidden-loot chest sites for walk→fight (duel) worlds. Shared by the platform
// generator (climb stubs + perch / tunnel geometry) and the loot placer (chest
// coordinates) so the two can never drift apart. Positions are per-segment
// (caller adds region offset).
//
// Earth-like worlds (underground=true) hide each chest in an underground tunnel
// chamber reached through a shaft in the ground; other worlds keep the sky-perch
// climb. Geometry constants shared by generator, loot placer, and renderer:
//   surface top 440, ceiling bottom 528 (surface slab h=88),
//   tunnel space 528–648, bedrock 648+ (solid — no void underneath).
const _EXP_SURF_Y  = 440;
const _EXP_CEIL_B  = 528;
const _EXP_BED_Y   = 648;
const _EXP_SHAFT_HALF = 46;
var _exploreChapterBeaten = false;  // beaten chapter → suppress normal mob spawns
var _exploreEnterFromRight = false; // backtrack: next exploration launch spawns at the world's exit end
function _exploreChestSites(segLen, underground) {
  const sites = [
    { tier: 'minor', baseX: Math.floor(segLen * 0.30), perchY: 168, dir: -1 },
    { tier: 'elite', baseX: Math.floor(segLen * 0.78), perchY: 158, dir:  1 },
  ];
  if (!underground) return sites;
  for (const st of sites) {
    st.underground = true;
    // Tunnel chamber extends away from the shaft toward a dead end holding the chest
    st.x0 = st.dir < 0 ? st.baseX - 520 : st.baseX - 60;
    st.x1 = st.dir < 0 ? st.baseX + 60  : st.baseX + 520;
    st.chestX = st.dir < 0 ? st.x0 + 56 : st.x1 - 56;
    st.chestY = _EXP_BED_Y - 30;
  }
  return sites;
}

// Earth-like exploration styles get grounded terrain (plateaus/structures, no
// floating platforms) and an underground chest layer. Fracture/void/space/lava
// worlds keep floating geometry — it fits their reality.
function _exploreIsEarthStyle(ch) {
  const st = (ch && ch.style) ||
    (typeof _storyExploreStyleForWorld === 'function' ? _storyExploreStyleForWorld(ch && ch.world) : 'city');
  return st === 'city' || st === 'forest' || st === 'ruins';
}

function _exploreGenPlatforms(worldLen, seed, ch) {
  // Deterministic seeded pseudo-random (LCG)
  let s = (seed * 1234567 + 89101) | 0;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };

  const plats = [];
  const mode = ch && ch.exploreMode ? ch.exploreMode : 'exploration';
  const isEarthDuel = !!(ch && ch.walkFight && _exploreIsEarthStyle(ch));

  // ── Solid floor ───────────────────────────────────────────────────────────
  // Earth-like duel worlds: thick surface slabs with shaft gaps down to a tunnel
  // layer, sealed by full-width bedrock (no void — falling lands in the tunnel).
  // Everything else: one continuous floor (players never fall into the void).
  if (isEarthDuel) {
    const sites = _exploreChestSites(worldLen, true);
    const gaps = sites
      .map(st => [st.baseX - _EXP_SHAFT_HALF, st.baseX + _EXP_SHAFT_HALF])
      .sort((a, b) => a[0] - b[0]);
    let cur = 0;
    for (const g of gaps) {
      plats.push({ x: cur, y: _EXP_SURF_Y, w: g[0] - cur, h: _EXP_CEIL_B - _EXP_SURF_Y, isFloor: true });
      cur = g[1];
    }
    plats.push({ x: cur, y: _EXP_SURF_Y, w: worldLen - cur, h: _EXP_CEIL_B - _EXP_SURF_Y, isFloor: true });
    plats.push({ x: 0, y: _EXP_BED_Y, w: worldLen, h: 140, isBedrock: true });
    // Seal the tunnel layer: solid rock everywhere except the chest chambers,
    // so each chamber is a true dead-end vault (also stops entities being
    // clamped into dark dead space between chambers).
    const spans = sites.map(st => [st.x0, st.x1]).sort((a, b) => a[0] - b[0]);
    let ux = 0;
    for (const [a, b] of spans) {
      if (a > ux) plats.push({ x: ux, y: _EXP_CEIL_B, w: a - ux, h: _EXP_BED_Y - _EXP_CEIL_B, isRockFill: true });
      ux = b;
    }
    if (ux < worldLen) plats.push({ x: ux, y: _EXP_CEIL_B, w: worldLen - ux, h: _EXP_BED_Y - _EXP_CEIL_B, isRockFill: true });
    for (const st of sites) {
      // Escape stub (bedrock → stub → surface in two jumps) hugs the shaft wall
      // on the side AWAY from the chamber, leaving a 56px fall gap on the chamber
      // side. A centred stub seals the hole — the player lands on it and can
      // neither drop past it nor walk sideways (head still inside the shaft).
      plats.push(st.dir < 0
        ? { x: st.baseX + 10, y: 548, w: 36, h: 12 }   // chamber opens left → stub right
        : { x: st.baseX - 46, y: 548, w: 36, h: 12 }); // chamber opens right → stub left
    }
  } else {
    plats.push({ x: 0, y: 440, w: worldLen, h: 80, isFloor: true });
  }

  if (mode === 'survival') {
    // Compact enclosed arena for wave-defence (worldLen = 900)
    plats.push({ x: 90,  y: 330, w: 150, h: 16 });
    plats.push({ x: 375, y: 265, w: 150, h: 16 });
    plats.push({ x: 660, y: 330, w: 150, h: 16 });
    plats.push({ x: 220, y: 190, w: 110, h: 14 });
    plats.push({ x: 570, y: 190, w: 110, h: 14 });
    return plats;
  }

  if (mode === 'parkour') {
    for (let wx = 220; wx < worldLen - 420; wx += 170 + Math.floor(rng() * 85)) {
      plats.push({
        x: wx + Math.floor(rng() * 45),
        y: 330 - Math.floor(rng() * 155),
        w: 95 + Math.floor(rng() * 55),
        h: 16,
      });
      if (rng() < 0.55) {
        plats.push({
          x: wx + 65 + Math.floor(rng() * 40),
          y: 210 - Math.floor(rng() * 90),
          w: 72 + Math.floor(rng() * 44),
          h: 14,
        });
      }
    }
  } else if (_exploreIsEarthStyle(ch)) {
    // ── Grounded terrain: plateaus/structures rising from the ground ────────
    // No floating platforms in earth-like worlds — everything connects down.
    // Applies to ALL earth exploration modes (duel/stealth/objective/…), not
    // just walk→fight. Kept clear of: spawn area, checkpoint/duel zones, shaft
    // entrances, authored enemy/guard posts, and the goal approach.
    const chestSites = isEarthDuel ? _exploreChestSites(worldLen, true) : [];
    const cps = [];
    if (ch.walkFight === true || ch.exploreMode === 'duel') cps.push(worldLen * 0.5);
    else {
      const _n = (ch.worldLength >= 5200 ? 2 : 1);
      for (let i = 1; i <= _n; i++) cps.push((worldLen * i) / (_n + 1));
    }
    const posts = [];
    (ch.spawnEnemies || []).forEach(e => { if (e.wx) posts.push(e.wx); });
    (ch.stealthGuardDefs || []).forEach(g => { if (g.wx) posts.push(g.wx); });
    let sx = 340 + Math.floor(rng() * 220);
    while (sx < worldLen - 760) {
      const w = 200 + Math.floor(rng() * 240);
      const h = 60 + Math.floor(rng() * 62);
      const blocked = cps.some(c => sx + w > c - 360 && sx < c + 360) ||
        chestSites.some(st => sx + w > st.baseX - 180 && sx < st.baseX + 180) ||
        posts.some(px => sx + w > px - 150 && sx < px + 150);
      if (!blocked) {
        plats.push({ x: sx, y: _EXP_SURF_Y - h, w, h, isStructure: true });
        // Wide plateaus sometimes carry a second stepped tier
        if (w > 300 && rng() < 0.5) {
          const w2 = 120 + Math.floor(rng() * 90);
          plats.push({ x: sx + Math.floor(rng() * (w - w2)), y: _EXP_SURF_Y - h - 52, w: w2, h: 52, isStructure: true });
        }
      }
      sx += w + 300 + Math.floor(rng() * 460);
    }
    if (mode === 'objective') {
      // Grounded goal structure (stepped pyramid) instead of floating pads
      const goalBase = worldLen - 620;
      plats.push({ x: goalBase,      y: 360, w: 190, h: 80, isStructure: true });
      plats.push({ x: goalBase + 40, y: 308, w: 110, h: 52, isStructure: true });
    }
  } else {
    const exploreStyle = ch && ch.exploreStyle ? ch.exploreStyle : 'generic';
    const isCity = exploreStyle === 'city';

    if (isCity) {
      // ── City-style: wide rooftop sections at consistent height with gaps ──
      for (let wx = 200; wx < worldLen - 400; wx += 300 + Math.floor(rng() * 180)) {
        const bldW = 220 + Math.floor(rng() * 160);
        const bldY = 370 + Math.floor(rng() * 30);
        plats.push({ x: wx, y: bldY, w: bldW, h: 20 });
        if (rng() < 0.5) {
          plats.push({ x: wx + 40 + Math.floor(rng() * 60), y: bldY - 80, w: 100 + Math.floor(rng() * 60), h: 16 });
        }
      }
    } else {
      // ── Mid-level platforms ─────────────────────────────────────────────────
      for (let wx = 250; wx < worldLen - 500; wx += 240 + Math.floor(rng() * 200)) {
        plats.push({
          x: wx + Math.floor(rng() * 80),
          y: 290 + Math.floor((rng() - 0.5) * 80),
          w: 100 + Math.floor(rng() * 80),
          h: 18,
        });
      }

      // ── High platforms ──────────────────────────────────────────────────────
      for (let wx = 500; wx < worldLen - 700; wx += 380 + Math.floor(rng() * 280)) {
        plats.push({
          x: wx + Math.floor(rng() * 120),
          y: 170 + Math.floor((rng() - 0.5) * 70),
          w: 85 + Math.floor(rng() * 70),
          h: 15,
        });
      }
    }

    if (mode === 'objective') {
      const goalBase = worldLen - 620;
      plats.push({ x: goalBase, y: 320, w: 180, h: 18 });
      plats.push({ x: goalBase + 70, y: 235, w: 140, h: 16 });
      plats.push({ x: goalBase + 200, y: 285, w: 110, h: 16 });
    }
  }

  // ── Hidden-loot chest perches (non-earth walk→fight worlds only) ──────────
  // Each site is an optional vertical climb off the main corridor ending in a
  // perch that holds a chest (placed by the loot pass in _launchExplorationChapter).
  // Earth-like worlds hide chests underground instead (see isEarthDuel above).
  if (ch && ch.walkFight && !isEarthDuel) {
    for (const site of _exploreChestSites(worldLen)) {
      const b = site.baseX;
      plats.push({ x: b - 95, y: 340, w: 90, h: 14 });
      plats.push({ x: b + 15, y: 252, w: 90, h: 14 });
      plats.push({ x: b - 55, y: site.perchY, w: 130, h: 14 }); // perch — chest sits here
    }
  }

  return plats;
}

// Story AI intelligence floor by (original) chapter index — early chapters keep
// dumb bots, later chapters sharpen toward the dumb-AI ceiling ('expert').
// Breakpoints mirror the survival-wave _diffTier. Only raises toward the tier;
// never lowers an author's deliberately-set aiDiff. Elites read one tier sharper.
const _STORY_AI_RANK = ['easy', 'medium', 'hard', 'expert'];
function _storyFloorAiDiff(current, chapterId, elite) {
  const id = chapterId || 0;
  let tier = (id >= 45 ? 3 : id >= 25 ? 2 : id >= 10 ? 1 : 0) + (elite ? 1 : 0);
  if (tier > 3) tier = 3;
  return _STORY_AI_RANK[Math.max(_STORY_AI_RANK.indexOf(current), tier)];
}

function _storyScaleEnemyUnit(unit, chapterId, opts = {}) {
  if (!unit) return unit;
  const elite = !!opts.elite;

  // Use the ORIGINAL chapter id for scaling — after phase expansion, _activeStory2Chapter.id
  // can be 200+ (each original chapter fans into ~3 phases), which would give 17× multipliers
  // and produce 2000+ HP elites. _origId tracks the pre-expansion index (0–79).
  const origId = (typeof _activeStory2Chapter !== 'undefined'
    && _activeStory2Chapter
    && _activeStory2Chapter._origId !== undefined)
    ? _activeStory2Chapter._origId
    : Math.min(chapterId, 84); // hard-cap fallback to prevent runaway scaling

  const s = getScaling(origId + (_storyPerformanceBonus() / 0.08 | 0));
  const PLAYER_HP = 100; // Fighter base maxHealth

  // ── HP ───────────────────────────────────────────────────────
  // Standard enemy: capped at 2× player HP (200).  Elite: 3× (300).
  const hpBase = unit.maxHealth || unit.health || 100;
  const rawHP  = Math.round(hpBase * (s.enemyHP / 100) * (elite ? 1.5 : 1));
  unit.maxHealth = Math.min(rawHP, elite ? PLAYER_HP * 3 : PLAYER_HP * 2);
  unit.health    = unit.maxHealth;

  // ── Damage ───────────────────────────────────────────────────
  // Standard: ≤ 25% player HP per hit.  Elite: ≤ 32% (still survivable with 2 hits).
  const dmgCap    = elite ? PLAYER_HP * 0.32 : PLAYER_HP * 0.25;
  const scaledDmg = Math.min(s.enemyDamage, dmgCap);
  unit.dmgMult    = (unit.dmgMult || 1) * (scaledDmg / 12); // 12 = median base weapon damage

  // ── Attack speed / AI ────────────────────────────────────────
  unit.attackCooldownMult = Math.max(0.58, (unit.attackCooldownMult || 1) * (elite ? 0.72 : 0.86));
  unit.aiDiff             = _storyFloorAiDiff(unit.aiDiff, origId, elite);
  unit.aiReact            = elite ? 0 : unit.aiReact;
  unit._storyElite        = elite;
  unit._storyPredict      = 0.10 + Math.min(0.18, origId * 0.0035) + (elite ? 0.12 : 0);
  unit._storyDodgeChance  = elite ? 0.14 : 0.05;

  // ── Onboarding mercy band ────────────────────────────────
  // The first encounters teach controls — they must pressure, not melt, the
  // player. Softer damage, slower cadence, no prediction. Elites (optional
  // challenges like the Vault Warden) are exempt.
  if (!elite && origId < 6) {
    const gentle = origId < 3;
    unit.maxHealth = Math.min(unit.maxHealth, gentle ? 120 : 160);
    unit.health    = unit.maxHealth;
    unit.dmgMult   = Math.min(unit.dmgMult, (gentle ? 8 : 12) / 12); // ≤8% / ≤12% player HP per hit
    unit.attackCooldownMult = Math.max(unit.attackCooldownMult, gentle ? 1.25 : 1.05);
    unit._storyPredict      = gentle ? 0 : Math.min(unit._storyPredict, 0.08);
    unit._storyDodgeChance  = 0.02;
  }
  return unit;
}

function _storyPhaseExploreCap(chId) {
  if (chId < 10) return 2;
  if (chId < 22) return 3;
  if (chId < 35) return 4;
  if (chId < 50) return 5;
  return 6;
}

function _storyBuildSidePortal(ch) {
  if (!ch || ch.id < 6) return null;
  // Seeded per chapter — the world must be identical on every reload (one-map illusion).
  // Murmur-style hash first: a raw LCG seeded with consecutive ids gives correlated
  // first draws (whole runs of chapters all with/without portals).
  let s = ch.id | 0;
  s = Math.imul(s ^ (s >>> 16), 2246822519);
  s = Math.imul(s ^ (s >>> 13), 3266489917);
  s = (s ^ (s >>> 16)) >>> 0 || 1;
  const rng = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  if (rng() < 0.45) return null;
  const type = ch.id >= 22 && rng() < 0.35 ? 'distorted_rift'
    : rng() < 0.5 ? 'elite_gauntlet' : 'survival';
  return {
    x: Math.floor((ch.worldLength || 5200) * (0.35 + rng() * 0.35)),
    y: 260,
    type,
    reward: type === 'distorted_rift' ? 55 + ch.id * 3 : 32 + ch.id * 2,
    active: true,
    entered: false,
  };
}

function _storyEnterSidePortal(portal, p1, ch) {
  if (!portal || portal.entered || !p1) return;
  portal.entered = true;
  portal.active = false;
  portal.challengeActive = true;
  const isBossRift = portal.type === 'distorted_rift';
  const eliteA = _storyCloneEnemyDef(ch, {
    name: isBossRift ? 'Distorted Veran Echo' : 'Rift Elite',
    weaponKey: isBossRift ? 'spear' : 'axe',
    classKey: isBossRift ? 'warrior' : 'berserker',
    aiDiff: ch.id >= 25 ? 'expert' : 'hard',
    color: isBossRift ? '#8844ff' : '#aa6633',
    isElite: true,
  });
  const eliteB = _storyCloneEnemyDef(eliteA, {
    name: isBossRift ? 'Fracture Warden' : 'Elite Reinforcement',
    weaponKey: 'hammer',
    classKey: 'tank',
    color: '#665577',
    isElite: true,
  });
  storyFightSubtitle = {
    text: isBossRift
      ? 'Distorted Rift opened. Clear the weakened boss echo for a rare reward.'
      : 'Side portal entered. Survive the encounter for bonus coins.',
    timer: 220,
    maxTimer: 220,
    color: isBossRift ? '#ff88ff' : '#88ffcc'
  };
  _exploreSpawnEnemy({ ...eliteA, wx: p1.x + 140, health: isBossRift ? 220 : 150, isElite: true, isSidePortalEnemy: true }, p1);
  if (!isBossRift) _exploreSpawnEnemy({ ...eliteB, wx: p1.x + 220, health: 160, isElite: true, isSidePortalEnemy: true }, p1);
}

// ── One-map regions ─────────────────────────────────────────────────────────
// Consecutive same-world walkFight chapters stitched into a single continuous
// world. Launching any member chapter builds the whole region; the player
// starts at that chapter's segment and can see neighbouring segments' terrain.
// Segment boundaries award the crossed chapter's rewards without ending the
// match; only the final segment's exit ends the chapter normally.
const STORY_REGIONS = [
  { name: 'Multiversal Core', chapters: [32, 33, 34, 35], segLen: 6000 },
];
function _storyRegionFor(chId) {
  for (const r of STORY_REGIONS) if (r.chapters.includes(chId)) return r;
  return null;
}

// Build the duel-opponent def for a walkFight chapter (main + optional second).
function _storyBuildDuelOpponent(ch) {
  return {
    name:      ch.opponentName  || 'Enemy',
    weaponKey: ch.weaponKey     || 'sword',
    classKey:  ch.classKey      || 'warrior',
    aiDiff:    ch.aiDiff        || 'medium',
    color:     ch.opponentColor || '#cc4444',
    health:    ch.opponentHealth || 140,
    armor:     (Array.isArray(ch.armor) && ch.armor.length) ? ch.armor : null,
    second:    ch.twoEnemies ? Object.assign({
      name:      (ch.opponentName || 'Enemy') + ' II',
      weaponKey: ch.weaponKey     || 'sword',
      classKey:  ch.classKey      || 'warrior',
      aiDiff:    ch.aiDiff        || 'medium',
      color:     ch.opponentColor || '#cc5500',
    }, ch.secondEnemy || {}) : null,
  };
}

function _launchExplorationChapter(ch) {
  const _storyModal = document.getElementById('storyModal');
  if (_storyModal) _storyModal.style.display = 'none';

  // Apply world modifiers for this chapter
  worldId        = getWorldForChapter(ch.id);
  currentWorld   = STORY_WORLDS[worldId] || null;
  worldModifiers = currentWorld ? currentWorld.modifier : null;

  // Apply multiverse arc
  const _arcEx = getStoryArc(ch.id);
  if (_arcEx) storyCurrentArc = _arcEx.id;

  // One-map region: stitch every member chapter's segment into one world
  const _region = (ch.walkFight === true) ? _storyRegionFor(ch.id) : null;
  exploreRegion = null;
  exploreStartX = null;
  window._exploreBackArmed = false; // reverse loading zone re-arms once the player walks in

  // Walk→fight worlds get a GoW-scale minimum length; regions stitch N of them.
  const _earth = (ch.walkFight === true) && _exploreIsEarthStyle(ch);
  const worldLen = _region ? _region.segLen * _region.chapters.length
    : (ch.walkFight === true) ? Math.max(ch.worldLength || 5200, 6000)
    : (ch.worldLength || 9000);
  const goalX    = ch.objectX    || (worldLen - 350);
  let plats;
  if (_region) {
    // Each segment's full generated geometry (floors, bedrock, structures) offset
    // into place — floors are contiguous across segment boundaries by construction.
    plats = [];
    _region.chapters.forEach((cid, i) => {
      const segCh = STORY_CHAPTERS2[cid] || ch;
      const off = i * _region.segLen;
      _exploreGenPlatforms(_region.segLen, cid, segCh).forEach(p => {
        plats.push({ ...p, x: p.x + off });
      });
    });
  } else {
    plats = _exploreGenPlatforms(worldLen, ch.id, ch);
  }

  // Inject exploration arena into ARENAS under temp key
  const arenaKey = '__explore__';
  ARENAS[arenaKey] = {
    sky:           ch.sky         || ['#0a0a1e', '#1a1a2e'],
    groundColor:   ch.groundColor || '#333344',
    platColor:     ch.platColor   || '#445566',
    worldWidth:    worldLen,
    // Walk→fight worlds open the left edge — it's the reverse loading zone
    // (walking off it backtracks to the previous chapter's world)
    mapLeft:       (ch.walkFight === true) ? 60 : GAME_W / 2,
    mapRight:      worldLen - 50, // let player reach the full world including goalX
    deathY:        640,
    isStoryOnly:   true,
    isExploreArena: true,
    exploreStyle:  ch.style || 'city',
    platforms:     plats,
  };
  if (_earth) {
    // Underground layer: no void beneath earth worlds — bedrock seals the world,
    // the death plane sits far below as a failsafe, and the camera may pan down
    // into the tunnel space.
    ARENAS[arenaKey].deathY = 1600;
    ARENAS[arenaKey].worldBottom = _EXP_BED_Y + 150;
    ARENAS[arenaKey].hasUnderground = true;
    const _ugRects = [];
    const _ugSegs = _region
      ? _region.chapters.map((cid, i) => ({ off: i * _region.segLen, len: _region.segLen }))
      : [{ off: 0, len: worldLen }];
    for (const sg of _ugSegs) {
      for (const st of _exploreChestSites(sg.len, true)) {
        _ugRects.push({ x: sg.off + st.baseX - _EXP_SHAFT_HALF, y: _EXP_SURF_Y, w: _EXP_SHAFT_HALF * 2, h: _EXP_CEIL_B - _EXP_SURF_Y, kind: 'shaft' });
        _ugRects.push({ x: sg.off + st.x0, y: _EXP_CEIL_B, w: st.x1 - st.x0, h: _EXP_BED_Y - _EXP_CEIL_B, kind: 'chamber' });
      }
    }
    ARENAS[arenaKey].undergroundRects = _ugRects;
  }
  if (typeof ARENA_BASE_PLATFORMS !== 'undefined') {
    ARENA_BASE_PLATFORMS[arenaKey] = plats.map(p => ({ ...p }));
  }

  // Set exploration globals
  exploreActive    = true;
  exploreWorldLen  = worldLen;
  exploreGoalX     = goalX;
  exploreGoalName  = ch.objectName || 'Exit';
  exploreGoalFound = false;
  exploreCheckpoints = [];
  exploreCheckpointIdx = -1;
  if (_region) {
    // One duel checkpoint per segment, each carrying its own chapter's opponent.
    // Checkpoints behind the launched chapter's segment start pre-hit so walking
    // left through beaten territory never re-fires old duels.
    const _myIdx = _region.chapters.indexOf(ch.id);
    _region.chapters.forEach((cid, i) => {
      const segCh = STORY_CHAPTERS2[cid] || ch;
      exploreCheckpoints.push({
        x: i * _region.segLen + Math.floor(_region.segLen / 2),
        hit: i < _myIdx,
        chId: cid,
        opp: _storyBuildDuelOpponent(segCh),
      });
    });
    exploreRegion = {
      name: _region.name,
      segLen: _region.segLen,
      chapters: _region.chapters.slice(),
      // Boundaries behind the launched segment start done — the player spawns
      // past them; they must not fire completions on the first frame.
      boundaries: _region.chapters.slice(0, -1).map((cid, i) => ({ x: (i + 1) * _region.segLen, chId: cid, done: i < _myIdx })),
    };
    exploreStartX = _myIdx > 0 ? _myIdx * _region.segLen + 100 : null;
  } else {
    // Duel (walk→fight) chapters always get exactly ONE checkpoint — it hosts the
    // chapter's authored duel; more would replay the same opponent per checkpoint.
    const checkpointCount = (ch.walkFight === true || ch.exploreMode === 'duel') ? 1
      : (ch.worldLength >= 5200 ? 2 : 1);
    for (let i = 1; i <= checkpointCount; i++) {
      exploreCheckpoints.push({ x: Math.floor((worldLen * i) / (checkpointCount + 1)), hit: false });
    }
  }
  // Backtrack entry: the player walked off the LEFT edge of the next world, so
  // spawn them at this world's exit end. Everything behind the spawn point
  // pre-hits so old duels/boundary completions never re-fire on frame one.
  if (_exploreEnterFromRight) {
    _exploreEnterFromRight = false;
    exploreStartX = worldLen - 620;
    exploreCheckpoints.forEach(cp => { if (cp.x < worldLen - 620) cp.hit = true; });
    if (exploreRegion) exploreRegion.boundaries.forEach(b => { b.done = true; });
  }
  // Strip ranged weapons from exploration enemies if this chapter hasn't been beaten yet.
  // On a BEATEN chapter, normal mobs stay gone — only guards and special enemies
  // (relic guards, chest guardians, stealth sentries) still spawn.
  const _expBeaten = Array.isArray(_story2.defeated) && _story2.defeated.includes(ch.id);
  _exploreChapterBeaten = _expBeaten;
  exploreSpawnQ = (ch.spawnEnemies || [])
    .filter(e => !_expBeaten || e.isGuard || e.isElite || ch.exploreMode === 'stealth')
    .map(e => {
      if (_expBeaten) return e;
      const isRng = typeof WEAPONS !== 'undefined' && WEAPONS[e.weaponKey] && WEAPONS[e.weaponKey].type === 'ranged';
      return isRng ? Object.assign({}, e, { weaponKey: 'sword' }) : e;
    });
  exploreEnemyCap  = _storyPhaseExploreCap(ch.id);
  exploreCombatQuiet = 0;
  exploreAmbushTimer = 0;
  exploreArenaLock = null;
  exploreSidePortals = [];
  storyChaseTimer    = (ch.chaseTimer > 0) ? ch.chaseTimer : 0;
  storyChaseMaxTimer = storyChaseTimer;
  storeSurvivalState = null; // cleared for every exploration chapter; set below for survival

  // Reset all special-mode active flags so stale state never leaks between chapters
  stealthModeActive  = false;
  escapeModeActive   = false;
  defenseModeActive  = false;
  scavengeModeActive = false;
  puzzleModeActive   = false;

  // New modes: initialise after startGame() via setTimeout
  const _exploreMode = ch.exploreMode;

  // Walk→fight→walk duel wrapper: one checkpoint locks the arena and spawns the
  // chapter's real opponent; generic pressure/ambush spawns are suppressed.
  exploreDuelMode = (ch.exploreMode === 'duel' || ch.walkFight === true);
  exploreDuelOpponent = exploreDuelMode ? _storyBuildDuelOpponent(ch) : null;

  // Loot: coins (money), an EXP orb, and a post-fight healing crystal along the walk path.
  // Persistent health: carry HP from the previous walk→fight chapter (applied on the
  // first exploration frame, once the player exists — full if none saved).
  exploreSeedHealth = (exploreDuelMode && _story2.health != null) ? _story2.health : null;

  explorePickups = [];
  if (exploreDuelMode) {
    // One-time loot: a taken pickup stays gone forever (persisted per chapter+index).
    _story2.lootTaken = _story2.lootTaken || {};
    // For regions each segment gets its own chapter-keyed loot run; a plain
    // walkFight chapter is just a single segment at offset 0.
    const _segs = exploreRegion
      ? exploreRegion.chapters.map((cid, i) => ({ cid, off: i * exploreRegion.segLen, len: exploreRegion.segLen }))
      : [{ cid: ch.id, off: 0, len: worldLen }];
    _segs.forEach(seg => {
      const _cpObj = exploreCheckpoints.find(c => c.x >= seg.off && c.x < seg.off + seg.len);
      const _cpX = _cpObj ? _cpObj.x : seg.off + Math.floor(seg.len / 2);
      // Hidden-loot pass: treasure lives in CHESTS on optional climb perches off the
      // golden path (see _exploreChestSites), not handed out on the walk line.
      // The post-fight healing crystal stays on the path — it's a health resource,
      // not treasure (death fully heals; crystals + Super are the only other heals).
      // Key '2' kept for the crystal so pre-chest saves don't regenerate taken ones.
      const _loot = [
        { x: Math.min(seg.off + seg.len - 220, _cpX + 520), y: 356, type: 'heal', icon: '💠', value: 60, key: seg.cid + ':2' },
      ];
      _exploreChestSites(seg.len, _earth).forEach((site, si) => {
        const elite = site.tier === 'elite';
        _loot.push({
          x: seg.off + (site.underground ? site.chestX : site.baseX + 10),
          y: site.underground ? site.chestY : site.perchY - 30,
          type: 'chest', tier: site.tier, icon: '🧰',
          underground: !!site.underground,
          guarded: elite,
          contents: elite ? { tokens: 25, exp: 30, heal: 80 } : { tokens: 10, exp: 12 },
          _guardSpawned: false,
          key: seg.cid + ':c' + si,
        });
      });
      _loot.forEach(it => {
        it.collected = !!_story2.lootTaken[it.key];
        explorePickups.push(it);
      });
    });
  }

  if (ch.exploreMode === 'survival') {
    // Lock the camera to the compact 900px arena — no scrolling
    ARENAS[arenaKey].mapLeft   = 0;
    ARENAS[arenaKey].mapRight  = GAME_W;
    ARENAS[arenaKey].worldWidth = GAME_W;
    exploreGoalX   = 999999; // unreachable — wave-clear is the win condition
    exploreGoalName = 'All Waves';
    exploreCheckpoints = []; // no checkpoints in survival
    exploreEnemyCap = Math.max(6, (ch.waveSize || 2) * 2 + 2);
    const _diffTier = ch.id >= 45 ? 'expert' : ch.id >= 25 ? 'hard' : ch.id >= 10 ? 'medium' : 'easy';
    storeSurvivalState = {
      active:     true,
      state:      'countdown', // 'countdown' | 'active' | 'between' | 'victory'
      wave:       0,
      totalWaves: ch.survivalWaves || 3,
      waveSize:   ch.waveSize      || 2,
      timer:      90, // frames before first wave
      baseEnemy: {
        name:      ch.opponentName  || 'Wave Enemy',
        weaponKey: ch.weaponKey     || 'sword',
        classKey:  ch.classKey      || 'warrior',
        aiDiff:    ch.aiDiff        || _diffTier,
        color:     ch.opponentColor || '#778899',
        armor:     ch.armor         || [],
      },
    };
  }

  if (!exploreDuelMode) {
    const sidePortal = _storyBuildSidePortal(ch);
    if (sidePortal) exploreSidePortals.push(sidePortal);
  }

  // Game config
  selectedArena = arenaKey;
  gameMode      = 'exploration';
  p2IsBot       = false;

  // Ability progression (mirror fight chapter logic) — skill tree only
  const id  = ch._origId !== undefined ? ch._origId : ch.id; // use original id for difficulty scaling
  const _sk = _story2.skillTree || {};
  storyPlayerOverride = {
    weapon:       null,
    noDoubleJump: !_sk.doubleJump,
    noAbility:    !_sk.weaponAbility,
    noSuper:      !_sk.superMeter,
    noClass:      !_sk.classUnlock,
    noDodge:      !_sk.dodge,
    dmgMult:      1.0 + (_sk.heavyHit2 ? 0.25 : _sk.heavyHit1 ? 0.15 : 0),
    speedMult:    1.0 + (_sk.fastMove2 ? 0.20 : _sk.fastMove1 ? 0.10 : 0),
    jumpMult:     1.0 + (_sk.highJump2 ? 0.25 : _sk.highJump1 ? 0.15 : 0),
  };

  // Ability toasts are now shown only when purchased in the skill tree

  storyModeActive     = true;
  storyCurrentLevel   = Math.min(8, Math.floor(id / 5) + 1);
  storyFightScript    = ch.fightScript  || [];
  storyFightScriptIdx = 0;
  storyFightSubtitle  = null;
  if (ch.preText) {
    storyFightSubtitle = { text: ch.preText, timer: 220, maxTimer: 220, color: '#dde8ff' };
  }
  storyEnemyArmor     = [];
  storyTwoEnemies     = false;
  storySecondEnemyDef = null;
  storyAllyDef        = null;

  if (typeof selectLives === 'function') selectLives(ch.playerLives || 3);
  infiniteMode = false;

  startGame();
  setTimeout(() => {
    if (players[0]) _applySkillTreeToPlayer(players[0]);
    // Initialise special explore modes after players[] is populated
    if (_exploreMode === 'stealth'  && typeof initStealthMode  === 'function') initStealthMode(ch);
    if (_exploreMode === 'escape'   && typeof initEscapeMode   === 'function') initEscapeMode(ch);
    if (_exploreMode === 'defense'  && typeof initDefenseMode  === 'function') initDefenseMode(ch);
    if (_exploreMode === 'scavenge' && typeof initScavengeMode === 'function') initScavengeMode(ch);
    if (_exploreMode === 'puzzle'   && typeof initPuzzleMode   === 'function') initPuzzleMode(ch);
  }, 80);
}

// Called each frame from gameLoop when gameMode === 'exploration'
