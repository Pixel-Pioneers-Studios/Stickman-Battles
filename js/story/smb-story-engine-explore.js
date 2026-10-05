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
const _EXP_BED_Y   = 648;   // upper tunnel floor (top of the slab between the two tiers)
const _EXP_LOW_TOP = 700;   // lower tunnel ceiling (slab bottom)
const _EXP_LOW_FLR = 820;   // lower tunnel floor = bedrock top
const _EXP_SHAFT_HALF = 46;
var _exploreChapterBeaten = false;  // beaten chapter → suppress normal mob spawns
var _exploreEnterFromRight = false; // backtrack: next exploration launch spawns at the world's exit end
var exploreBackChapter = null;      // chapter id the LEFT edge backtracks into (null = hard wall)

// Any chapter that generates a walkable world — walk→fight duels and every
// exploration mode alike. Both are launched by _launchExplorationChapter, so
// both can be walked into from the right.
function _storyChapterIsWalkable(ch) {
  return !!ch && (ch.walkFight === true || ch.type === 'exploration');
}

// Resolve the backtrack target for a chapter: the nearest earlier chapter that
// has a walkable world and has been beaten. Pure narrative/branch chapters have
// no world of their own, so they are stepped over rather than blocking the way
// back; a set-piece arena fight is a real wall and stops the search.
function _storyBackChapterFor(chId) {
  if (chId == null || typeof STORY_CHAPTERS2 === 'undefined') return null;
  const beaten = Array.isArray(_story2 && _story2.defeated) ? _story2.defeated : [];
  for (let i = chId - 1; i >= 0; i--) {
    const prev = STORY_CHAPTERS2[i];
    if (!prev) return null;
    if (_storyChapterIsWalkable(prev)) return beaten.includes(prev.id) ? prev.id : null;
    if (prev.noFight || prev.type === 'branch') continue; // scene — step over it
    return null;                                          // arena set-piece — hard wall
  }
  return null;
}
function _exploreChestSites(segLen, underground) {
  const sites = [
    { tier: 'minor', baseX: Math.floor(segLen * 0.30), perchY: 168, dir: -1 },
    { tier: 'elite', baseX: Math.floor(segLen * 0.78), perchY: 158, dir:  1 },
  ];
  if (!underground) return sites;
  for (const st of sites) {
    st.underground = true;
    // Two-tier switchback maze (d = the way the upper tunnel runs):
    //   shaft ↓ → upper tunnel runs d, past a drop hole, on to a DEAD END;
    //   the drop hole ↓ → lower tunnel doubles back (-d) under the shaft to the
    //   cache, with a short nook on the far side of the hole.
    // Every climb out is a ~100px single jump onto a wall-hugging stub (the same
    // step the original escape used), so no skill-tree double jump is needed.
    const d = st.dir;
    const span = (a, b) => [Math.min(a, b), Math.max(a, b)];
    st.upper  = span(st.baseX - d * 60,  st.baseX + d * 760);
    st.holeX  = st.baseX + d * 420;
    st.lower  = span(st.baseX + d * 540, st.baseX - d * 300);
    st.x0 = Math.min(st.upper[0], st.lower[0]);
    st.x1 = Math.max(st.upper[1], st.lower[1]);
    st.chestX = st.baseX - d * 244;           // 56px off the lower tunnel's far wall
    st.chestY = _EXP_LOW_FLR - 30;
    // Weak guard posts: the upper tunnel between shaft and hole, and the lower
    // tunnel between hole and cache. Which of them are manned is seeded per
    // cache in the loot pass, so a world is identical on every reload.
    st.posts = [
      { x: st.baseX + d * 250, floorY: _EXP_BED_Y },
      { x: st.baseX + d * 120, floorY: _EXP_LOW_FLR },
    ];
  }
  return sites;
}

// ── Level stars (100% completion) ────────────────────────────────────────────
// A level is 100% when it is cleared AND every hidden cache in it is open.
// Caches exist only in walk→fight/duel worlds: two per chapter, keyed
// '<chapterId>:c<site>' in _story2.lootTaken (the healing crystal is a health
// resource, not treasure, and does not count). A level with no caches is 100%
// on clear. The cinematic-run opener plays as film and never builds a world,
// so it can hold no caches.
function storyChapterLootKeys(chIdx) {
  const ch = (typeof STORY_CHAPTERS2 !== 'undefined') ? STORY_CHAPTERS2[chIdx] : null;
  if (!ch || ch.noFight) return [];
  const walk = ch.walkFight === true || (ch.type === 'exploration' && ch.exploreMode === 'duel');
  if (!walk) return [];
  if (typeof isStoryCinematicRunStart === 'function' && isStoryCinematicRunStart(ch.id)) return [];
  return [ch.id + ':c0', ch.id + ':c1'];
}
function storyChapterLootProgress(chIdx) {
  const keys = storyChapterLootKeys(chIdx);
  const taken = (_story2 && _story2.lootTaken) || {};
  return { got: keys.filter(k => taken[k]).length, total: keys.length };
}
function storyChapterStarred(chIdx) {
  if (!_story2 || !Array.isArray(_story2.defeated) || !_story2.defeated.includes(chIdx)) return false;
  const lp = storyChapterLootProgress(chIdx);
  return lp.got >= lp.total;
}
// Stars across the active saga (the whole story on a 'full' build).
function storyStarTally() {
  let stars = 0, total = 0;
  if (typeof STORY_CHAPTERS2 === 'undefined') return { stars, total };
  for (let i = 0; i < STORY_CHAPTERS2.length; i++) {
    if (typeof isChapterInActiveSaga === 'function' && !isChapterInActiveSaga(i)) continue;
    total++;
    if (storyChapterStarred(i)) stars++;
  }
  return { stars, total };
}

// Seeded 0..1 per string key — cache guard rolls must not change between loads.
function _exploreKeyRand(key, salt) {
  let s = (salt | 0) ^ 0x9e3779b9;
  for (let i = 0; i < key.length; i++) s = Math.imul(s ^ key.charCodeAt(i), 2654435761);
  s = Math.imul(s ^ (s >>> 15), 2246822519);
  s = (s ^ (s >>> 13)) >>> 0;
  return s / 4294967296;
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
  const _level = (typeof storyLevelFor === 'function') ? storyLevelFor(ch) : null;

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
    plats.push({ x: 0, y: _EXP_LOW_FLR, w: worldLen, h: 140, isBedrock: true });
    // Seal every underground band with solid rock except the carved openings,
    // so each tunnel is a true dead-end maze (also stops entities being clamped
    // into dark dead space between caches).
    const _fillBand = (y0, y1, openings) => {
      let ux = 0;
      for (const [a, b] of openings.slice().sort((p, q) => p[0] - q[0])) {
        if (a > ux) plats.push({ x: ux, y: y0, w: a - ux, h: y1 - y0, isRockFill: true });
        ux = Math.max(ux, b);
      }
      if (ux < worldLen) plats.push({ x: ux, y: y0, w: worldLen - ux, h: y1 - y0, isRockFill: true });
    };
    _fillBand(_EXP_CEIL_B, _EXP_BED_Y, sites.map(st => st.upper));
    _fillBand(_EXP_BED_Y, _EXP_LOW_TOP, sites.map(st => [st.holeX - _EXP_SHAFT_HALF, st.holeX + _EXP_SHAFT_HALF]));
    _fillBand(_EXP_LOW_TOP, _EXP_LOW_FLR, sites.map(st => st.lower));
    for (const st of sites) {
      // Escape stub (tunnel floor → stub → surface in two jumps) hugs the shaft
      // wall on the side AWAY from the tunnel, leaving a 56px fall gap on the
      // tunnel side. A centred stub seals the hole — the player lands on it and
      // can neither drop past it nor walk sideways (head still inside the shaft).
      plats.push(st.dir < 0
        ? { x: st.baseX + 10, y: 548, w: 36, h: 12 }   // tunnel runs left → stub right
        : { x: st.baseX - 46, y: 548, w: 36, h: 12 }); // tunnel runs right → stub left
      // Drop-hole stub, same rule: the lower tunnel's cache lies -dir from the
      // hole, so the stub hugs the +dir wall. 100px up from the lower floor,
      // then 72px up and sideways onto the slab.
      plats.push(st.dir > 0
        ? { x: st.holeX + 10, y: _EXP_LOW_FLR - 100, w: 36, h: 12 }
        : { x: st.holeX - 46, y: _EXP_LOW_FLR - 100, w: 36, h: 12 });
    }
  } else if (_level && typeof _level.floor === 'function') {
    // Authored floor: raised/sunken sections. The first segment must sit at 440 —
    // the renderer and camera read the first isFloor platform as the ground line.
    plats.push(..._level.floor(worldLen));
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
    if (_level && typeof _level.layout === 'function') plats.push(..._level.layout(worldLen));
    let sx = _level && _level.layout ? Infinity : 340 + Math.floor(rng() * 220);
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
  } else if (_level && typeof _level.layout === 'function') {
    plats.push(..._level.layout(worldLen));
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
    // Authored maps put their own ledges and gaps around these climbs; as solid
    // slabs they bonk a player jumping a gap underneath, so make them one-way.
    const _pu = _level ? { passUnder: true } : {};
    for (const site of _exploreChestSites(worldLen)) {
      const b = site.baseX;
      plats.push({ x: b - 95, y: 340, w: 90, h: 14, ..._pu });
      plats.push({ x: b + 15, y: 252, w: 90, h: 14, ..._pu });
      plats.push({ x: b - 55, y: site.perchY, w: 130, h: 14, ..._pu }); // perch — chest sits here
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
  // Units can pass through here twice (startGame, then the post-spawn sweep in
  // _onStoryFightStart). Restore the unscaled stats so neither the chapter
  // scaling nor the difficulty layer compounds.
  if (unit._storyRaw) {
    unit.maxHealth          = unit._storyRaw.maxHealth;
    unit.dmgMult            = unit._storyRaw.dmgMult;
    unit.attackCooldownMult = unit._storyRaw.attackCooldownMult;
  } else {
    unit._storyRaw = { maxHealth: unit.maxHealth, dmgMult: unit.dmgMult, attackCooldownMult: unit.attackCooldownMult };
  }
  const diff = typeof _storyDiffCfg === 'function' ? _storyDiffCfg() : null;

  // Use the ORIGINAL chapter id for scaling — after phase expansion, _activeStory2Chapter.id
  // can be 200+ (each original chapter fans into ~3 phases), which would give 17× multipliers
  // and produce 2000+ HP elites. _origId tracks the pre-expansion index (0–79).
  const origId = (typeof _activeStory2Chapter !== 'undefined'
    && _activeStory2Chapter
    && _activeStory2Chapter._origId !== undefined)
    ? _activeStory2Chapter._origId
    : Math.min(chapterId, 84); // hard-cap fallback to prevent runaway scaling

  const effId = origId + (diff ? diff.shift : 0);
  const s = getScaling(effId + (_storyPerformanceBonus() / 0.08 | 0));
  const PLAYER_HP = 100; // Fighter base maxHealth

  // ── HP ───────────────────────────────────────────────────────
  // Standard enemy: capped at 2× player HP (200).  Elite: 3× (300).
  const hpBase = unit.maxHealth || unit.health || 100;
  const rawHP  = Math.round(hpBase * (s.enemyHP / 100) * (elite ? 1.5 : 1));
  unit.maxHealth = Math.min(rawHP, Math.round((elite ? PLAYER_HP * 3 : PLAYER_HP * 2) * (diff ? diff.hpCap : 1)));
  unit.health    = unit.maxHealth;

  // ── Damage ───────────────────────────────────────────────────
  // Standard: ≤ 25% player HP per hit.  Elite: ≤ 32% (still survivable with 2 hits).
  const dmgCap    = (elite ? PLAYER_HP * 0.32 : PLAYER_HP * 0.25) * (diff ? diff.dmgCap : 1);
  const scaledDmg = Math.min(getScaling(origId + (_storyPerformanceBonus() / 0.08 | 0)).enemyDamage, dmgCap);
  unit.dmgMult    = (unit.dmgMult || 1) * (scaledDmg / 12); // 12 = median base weapon damage
  // The cap is per hit, so it has to be checked against the unit's own weapon:
  // scaled off the median, an axe or hammer landed well past it.
  const wDmg = unit.weapon && unit.weapon.damage;
  if (!unit.isBoss && wDmg > 0) unit.dmgMult = Math.min(unit.dmgMult, dmgCap / wDmg);

  // ── Attack speed / AI ────────────────────────────────────────
  unit.attackCooldownMult = Math.max(0.58, (unit.attackCooldownMult || 1) * (elite ? 0.72 : 0.86));
  unit.aiDiff             = _storyFloorAiDiff(unit.aiDiff, effId, elite);
  unit.aiReact            = elite ? 0 : unit.aiReact;
  unit._storyElite        = elite;
  unit._storyPredict      = 0.10 + Math.min(0.18, effId * 0.0035) + (elite ? 0.12 : 0);
  unit._storyDodgeChance  = elite ? 0.14 : 0.05;

  // ── Onboarding mercy band ────────────────────────────────
  // The first encounters teach controls — they must pressure, not melt, the
  // player. Softer damage, slower cadence, no prediction. Elites (optional
  // challenges like the Vault Warden) are exempt.
  if (!elite && origId < (diff ? diff.mercyTo : 6)) {
    const gentle = origId < 3;
    unit.maxHealth = Math.min(unit.maxHealth, gentle ? 120 : 160);
    unit.health    = unit.maxHealth;
    unit.dmgMult   = Math.min(unit.dmgMult, (gentle ? 8 : 12) / 12); // ≤8% / ≤12% player HP per hit
    unit.attackCooldownMult = Math.max(unit.attackCooldownMult, gentle ? 1.25 : 1.05);
    unit._storyPredict      = gentle ? 0 : Math.min(unit._storyPredict, 0.08);
    unit._storyDodgeChance  = 0.02;
  }

  // ── Difficulty layer ─────────────────────────────────────
  if (diff) {
    unit.maxHealth          = Math.max(1, Math.round(unit.maxHealth * diff.hp));
    unit.health             = unit.maxHealth;
    unit.dmgMult            = unit.dmgMult * diff.dmg;
    unit.attackCooldownMult = Math.max(0.45, unit.attackCooldownMult * diff.cd);
    unit._storyMoveMult     = diff.speed !== 1 ? diff.speed : 0;
    unit._storyPredict      = diff.predict < 0 ? 0 : Math.min(0.5, unit._storyPredict + diff.predict);
    unit._storyDodgeChance  = diff.dodge < 0 ? 0 : Math.min(0.35, unit._storyDodgeChance + diff.dodge);
    if (diff.ai && !unit.isBoss) {
      unit.aiDiff = _STORY_AI_RANK[Math.min(3, _STORY_AI_RANK.indexOf(diff.ai) + (elite ? 1 : 0))];
    }
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
    classKey: 'thor',
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
  // Reverse loading zone target: a region backtracks out of its FIRST chapter.
  exploreBackChapter = _storyBackChapterFor(_storyRegionFor(ch.id) ? _storyRegionFor(ch.id).chapters[0] : ch.id);

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

  // Theme inheritance: the chapter's authored `arena:` used to be discarded
  // entirely once the world became an explore world, so all 55 walkFight
  // chapters rendered the same fallback navy sky + generic city tiles. Adopt
  // that arena's palette (and hand its key to the renderer as `themeKey`) so
  // the authored look survives the one-map conversion. Explicit per-chapter
  // sky/groundColor/platColor still win over the inherited palette.
  const _theme = (typeof ARENAS !== 'undefined' && ch.arena && ARENAS[ch.arena]) ? ARENAS[ch.arena] : null;
  const _level = (!_region && typeof storyLevelFor === 'function') ? storyLevelFor(ch) : null;

  // Inject exploration arena into ARENAS under temp key
  const arenaKey = '__explore__';
  ARENAS[arenaKey] = {
    sky:           ch.sky         || (_level && _level.sky)         || (_theme && _theme.sky)         || ['#0a0a1e', '#1a1a2e'],
    groundColor:   ch.groundColor || (_level && _level.groundColor) || (_theme && _theme.groundColor) || '#333344',
    platColor:     ch.platColor   || (_level && _level.platColor)   || (_theme && _theme.platColor)   || '#445566',
    platEdge:      ch.platEdge    || (_theme && _theme.platEdge)    || null,
    themeKey:      (_theme && ch.arena) || null,
    storyLevel:    _level ? ch.id : null,
    // Region: each member chapter with an authored map draws its own segment.
    storyRegion:   (_region && typeof STORY_LEVELS !== 'undefined')
      ? _region.chapters.map((cid, i) => ({ id: cid, off: i * _region.segLen, len: _region.segLen })).filter(sg => STORY_LEVELS[sg.id])
      : null,
    noGroundFill:  !!(_level && _level.noGroundFill),
    // Render-only: the lava drawer needs a surface height. hasLava is NOT
    // inherited — that is a damage hazard, not part of the look.
    lavaY:         (_theme && _theme.lavaY) || null,
    // Horizon alignment: bespoke arena art is authored against that arena's own
    // floor height; the explore world's floor sits at _EXP_SURF_Y (440).
    themeFloorY:   _theme ? ((_theme.platforms || []).find(pl => pl.isFloor) || {}).y ?? null : null,
    worldWidth:    worldLen,
    // Worlds with a backtrack target open the left edge — it's the reverse
    // loading zone (walking off it returns to the previous chapter's world).
    // With nowhere to go back to, the edge stays a wall.
    mapLeft:       (ch.walkFight === true || exploreBackChapter != null) ? 60 : GAME_W / 2,
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
    ARENAS[arenaKey].worldBottom = _EXP_LOW_FLR + 150;
    ARENAS[arenaKey].hasUnderground = true;
    const _ugRects = [];
    const _ugSegs = _region
      ? _region.chapters.map((cid, i) => ({ off: i * _region.segLen, len: _region.segLen }))
      : [{ off: 0, len: worldLen }];
    for (const sg of _ugSegs) {
      for (const st of _exploreChestSites(sg.len, true)) {
        _ugRects.push({ x: sg.off + st.baseX - _EXP_SHAFT_HALF, y: _EXP_SURF_Y, w: _EXP_SHAFT_HALF * 2, h: _EXP_CEIL_B - _EXP_SURF_Y, kind: 'shaft' });
        _ugRects.push({ x: sg.off + st.upper[0], y: _EXP_CEIL_B, w: st.upper[1] - st.upper[0], h: _EXP_BED_Y - _EXP_CEIL_B, kind: 'chamber' });
        _ugRects.push({ x: sg.off + st.holeX - _EXP_SHAFT_HALF, y: _EXP_BED_Y, w: _EXP_SHAFT_HALF * 2, h: _EXP_LOW_TOP - _EXP_BED_Y, kind: 'chamber' });
        _ugRects.push({ x: sg.off + st.lower[0], y: _EXP_LOW_TOP, w: st.lower[1] - st.lower[0], h: _EXP_LOW_FLR - _EXP_LOW_TOP, kind: 'chamber' });
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
  // Clear-the-area gate resets with the world: a stale seal reason or a leaked
  // force-spawn drain would follow the player into the next level.
  exploreGoalBlocked     = 0;
  exploreGoalBlockReason = '';
  window._exploreForceSpawnAll = false;
  if (typeof _storyResetLevelWin === 'function') _storyResetLevelWin();
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
  // Rest checkpoints: a beacon every ~1500px of a long walkable world, no fight
  // attached. Reaching one records where a game-over Retry resumes, so losing
  // the last life 5000px in no longer means walking the whole map again. Kept
  // clear of the fight checkpoints, shafts and surface structures (a resume must
  // never land inside a plateau). Modes whose state is positional or timed —
  // escape walls, chases, defense posts, puzzles — keep the full restart.
  const _restOK = ch.walkFight === true ||
    (!ch.chaseTimer && !['escape', 'defense', 'puzzle', 'survival'].includes(ch.exploreMode));
  if (_restOK && worldLen >= 3000) {
    const _fightXs = exploreCheckpoints.map(c => c.x);
    const _ug = ARENAS[arenaKey].undergroundRects || [];
    const _blocked = x => plats.some(p => p.isStructure && x + 40 > p.x && x - 40 < p.x + p.w) ||
      _ug.some(r => r.kind === 'shaft' && x + 70 > r.x && x - 70 < r.x + r.w) ||
      // Authored floors can have open pits; a resume point needs ground under it.
      !plats.some(p => p.isFloor && p.h > 20 && x - 60 >= p.x && x + 60 <= p.x + p.w);
    for (let x = 1500; x < worldLen - 900; x += 1500) {
      let rx = x;
      for (let n = 0; n < 14 && _blocked(rx); n++) rx += 80;
      if (_blocked(rx) || rx >= worldLen - 900) continue;
      if (_fightXs.some(fx => Math.abs(fx - rx) < 450)) continue;
      exploreCheckpoints.push({ x: rx, hit: false, rest: true });
    }
    exploreCheckpoints.sort((a, b) => a.x - b.x);
  }
  // Backtrack entry: the player walked off the LEFT edge of the next world, so
  // spawn them at this world's exit end. Everything behind the spawn point
  // pre-hits so old duels/boundary completions never re-fire on frame one.
  if (_exploreEnterFromRight) {
    _exploreEnterFromRight = false;
    // Stay clear of the exit itself — re-entering on top of the goal would
    // instantly re-complete the chapter and bounce the player forward again.
    exploreStartX = Math.max(120, Math.min(worldLen - 620, goalX - 260));
    exploreCheckpoints.forEach(cp => { if (cp.x < exploreStartX) cp.hit = true; });
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
  exploreEnemyCap  = Math.max(1, _storyPhaseExploreCap(ch.id) + (typeof _storyDiffCfg === 'function' ? _storyDiffCfg().exploreCap : 0));
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

  // Game-over Retry from the last rest checkpoint (armed by the retry screen).
  // Everything behind the resume point is treated as already walked: its
  // checkpoints pre-hit, region boundaries done, queued roamers dropped (the
  // exit gate would otherwise force-spawn them ahead of the player). Guards
  // at fixed posts stay. A resume is a fresh body, so it starts at full HP.
  const _res = _story2.cpResume;
  if (window._storyResumeCpFor === ch.id && _res && _res.chId === ch.id &&
      _res.x > 0 && _res.x < worldLen - 400) {
    exploreStartX = _res.x;
    exploreCheckpoints.forEach(cp => { if (cp.x <= _res.x) cp.hit = true; });
    if (exploreRegion) exploreRegion.boundaries.forEach(b => { if (b.x <= _res.x) b.done = true; });
    exploreSpawnQ = exploreSpawnQ.filter(e => e.isGuard || !(e.wx < _res.x));
    exploreSeedHealth = null;
  } else if (_res && _res.chId === ch.id) {
    delete _story2.cpResume;   // a fresh launch starts the level over
  }
  window._storyResumeCpFor = null;

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
        const _key = seg.cid + ':c' + si;
        const _chestX = seg.off + (site.underground ? site.chestX : site.baseX + 10);
        // Weak guards, sometimes (seeded per cache): elite caches always get one
        // and often two, minor caches half the time. Replaces the Vault Warden —
        // a hidden cache is a reward for looking, not a second boss fight.
        const _r = _exploreKeyRand(_key, 1);
        let _guards = [];
        if (site.underground) {
          const n = elite ? (_r < 0.55 ? 2 : 1) : (_r < 0.5 ? 1 : 0);
          _guards = (n === 2 ? site.posts : n === 1 ? [site.posts[1]] : [])
            .map(p => ({ x: seg.off + p.x, floorY: p.floorY }));
        } else if (elite && _r < 0.7) {
          _guards = [{ x: _chestX - 30, floorY: _EXP_SURF_Y }];   // under the perch
        }
        _loot.push({
          x: _chestX,
          y: site.underground ? site.chestY : site.perchY - 30,
          type: 'chest', tier: site.tier, icon: '🧰',
          underground: !!site.underground,
          guards: _guards,
          guarded: _guards.length > 0,
          contents: elite ? { tokens: 25, exp: 30, heal: 80 } : { tokens: 10, exp: 12 },
          _guardSpawned: false,
          key: _key,
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
    // Creature mini-boss peak — walkFight and exploration chapters both land here.
    if (ch.miniBoss && typeof _storySpawnMiniBoss === 'function') _storySpawnMiniBoss(ch);
    // The Trials — armed once the world and both fighters exist.
    if (ch.trial && typeof _storyArmTrial === 'function') _storyArmTrial(ch);
    else if (!ch.trial && typeof resetTrialState === 'function') resetTrialState();
  }, 80);
}

// Called each frame from gameLoop when gameMode === 'exploration'
