'use strict';
// Exploration chapters: platform gen, enemy scaling, side portal, _launchExplorationChapter.
// Depends on smb-globals.js and the story registry.


// Hidden-loot chest sites for walk→fight worlds. The platform generator and the loot placer
// both use these, so they can't drift. Positions are per segment (caller adds region offset).
// Earth-like worlds (underground=true) hide chests in tunnels off a shaft; others use a sky perch.
// Earth geometry: surface top 440, ceiling bottom 528, tunnel 528-648, bedrock 648+.
const _EXP_SURF_Y  = 440;
const _EXP_CEIL_B  = 528;
const _EXP_BED_Y   = 648;   // upper tunnel floor (top of the slab between the two tiers)
const _EXP_LOW_TOP = 700;   // lower tunnel ceiling (slab bottom)
const _EXP_LOW_FLR = 820;   // lower tunnel floor = bedrock top
const _EXP_SHAFT_HALF = 46;
var _exploreChapterBeaten = false;  // beaten chapter → suppress normal mob spawns
var _exploreEnterFromRight = false; // backtrack: next exploration launch spawns at the world's exit end
var exploreBackChapter = null;      // chapter id the LEFT edge backtracks into (null = hard wall)

// Any walkable world: walk→fight duels and every exploration mode. All launch via
// _launchExplorationChapter, so all can be walked into from the right.
function _storyChapterIsWalkable(ch) {
  return !!ch && (ch.walkFight === true || ch.type === 'exploration');
}

// Backtrack target: nearest earlier beaten chapter with a walkable world. Narrative chapters
// are skipped. An arena set-piece fight is a wall and stops the search.
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
    // Two-tier switchback: shaft drops into an upper tunnel that dead-ends past a drop hole,
    // and the hole leads down to the cache. Each climb is a ~100px jump onto a wall stub,
    // so no double jump is needed.
    const d = st.dir;
    const span = (a, b) => [Math.min(a, b), Math.max(a, b)];
    st.upper  = span(st.baseX - d * 60,  st.baseX + d * 760);
    st.holeX  = st.baseX + d * 420;
    st.lower  = span(st.baseX + d * 540, st.baseX - d * 300);
    st.x0 = Math.min(st.upper[0], st.lower[0]);
    st.x1 = Math.max(st.upper[1], st.lower[1]);
    st.chestX = st.baseX - d * 244;           // 56px off the lower tunnel's far wall
    st.chestY = _EXP_LOW_FLR - 30;
    // Weak guard posts between shaft and hole, and between hole and cache. Which are manned
    // is seeded per cache, so worlds are identical on reload.
    st.posts = [
      { x: st.baseX + d * 250, floorY: _EXP_BED_Y },
      { x: st.baseX + d * 120, floorY: _EXP_LOW_FLR },
    ];
  }
  return sites;
}

// A level is 100% when cleared and every hidden cache is open. Caches only exist in walk→fight
// worlds (two per chapter, keyed '<chapterId>:c<site>' in _story2.lootTaken). Healing crystals
// don't count. No caches means 100% on clear.
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
// Stars across the active saga.
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

// Seeded 0..1 per key. Guard rolls must not change between loads.
function _exploreKeyRand(key, salt) {
  let s = (salt | 0) ^ 0x9e3779b9;
  for (let i = 0; i < key.length; i++) s = Math.imul(s ^ key.charCodeAt(i), 2654435761);
  s = Math.imul(s ^ (s >>> 15), 2246822519);
  s = (s ^ (s >>> 13)) >>> 0;
  return s / 4294967296;
}

// Earth-like styles get grounded terrain and an underground chest layer. Other worlds keep
// floating geometry.
function _exploreIsEarthStyle(ch) {
  const st = (ch && ch.style) ||
    (typeof _storyExploreStyleForWorld === 'function' ? _storyExploreStyleForWorld(ch && ch.world) : 'city');
  return st === 'city' || st === 'forest' || st === 'ruins';
}

function _exploreGenPlatforms(worldLen, seed, ch) {
  let s = (seed * 1234567 + 89101) | 0;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };

  const plats = [];
  const mode = ch && ch.exploreMode ? ch.exploreMode : 'exploration';
  const isEarthDuel = !!(ch && ch.walkFight && _exploreIsEarthStyle(ch));
  const _level = (typeof storyLevelFor === 'function') ? storyLevelFor(ch) : null;

    // Earth-like duel worlds: thick slabs with shaft gaps down to a tunnel layer, sealed by
    // bedrock. Everything else gets one continuous floor, so no falling into the void.
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
    // Seal each underground band with rock except the carved openings, so tunnels are dead ends
    // and entities can't clamp into dead space.
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
      // Escape stub hugs the shaft wall away from the tunnel, leaving a 56px fall gap on the tunnel
      // side. A centred stub would seal the hole.
      plats.push(st.dir < 0
        ? { x: st.baseX + 10, y: 548, w: 36, h: 12 }   // tunnel runs left → stub right
        : { x: st.baseX - 46, y: 548, w: 36, h: 12 }); // tunnel runs right → stub left
      // Drop-hole stub hugs the +dir wall, since the lower cache is on the -dir side.
      // 100px up, then 72px sideways onto the slab.
      plats.push(st.dir > 0
        ? { x: st.holeX + 10, y: _EXP_LOW_FLR - 100, w: 36, h: 12 }
        : { x: st.holeX - 46, y: _EXP_LOW_FLR - 100, w: 36, h: 12 });
    }
  } else if (_level && typeof _level.floor === 'function') {
    // First segment must sit at 440. The renderer and camera read it as the ground line.
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
    // Grounded terrain: plateaus rising from the ground, no floating platforms. Applies to all earth
    // exploration modes. Kept clear of spawns, checkpoints, shaft entrances, guard posts and the goal.
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
        // Wide plateaus sometimes get a second tier
        if (w > 300 && rng() < 0.5) {
          const w2 = 120 + Math.floor(rng() * 90);
          plats.push({ x: sx + Math.floor(rng() * (w - w2)), y: _EXP_SURF_Y - h - 52, w: w2, h: 52, isStructure: true });
        }
      }
      sx += w + 300 + Math.floor(rng() * 460);
    }
    if (mode === 'objective') {
      // Goal is a stepped pyramid, not floating pads
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
      // City-style: wide rooftops at one height with gaps
      for (let wx = 200; wx < worldLen - 400; wx += 300 + Math.floor(rng() * 180)) {
        const bldW = 220 + Math.floor(rng() * 160);
        const bldY = 370 + Math.floor(rng() * 30);
        plats.push({ x: wx, y: bldY, w: bldW, h: 20 });
        if (rng() < 0.5) {
          plats.push({ x: wx + 40 + Math.floor(rng() * 60), y: bldY - 80, w: 100 + Math.floor(rng() * 60), h: 16 });
        }
      }
    } else {
      for (let wx = 250; wx < worldLen - 500; wx += 240 + Math.floor(rng() * 200)) {
        plats.push({
          x: wx + Math.floor(rng() * 80),
          y: 290 + Math.floor((rng() - 0.5) * 80),
          w: 100 + Math.floor(rng() * 80),
          h: 18,
        });
      }

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

  // Chest perches (non-earth walk→fight worlds): an optional climb off the corridor ends in a
  // perch with a chest. Earth worlds hide chests underground.
  if (ch && ch.walkFight && !isEarthDuel) {
    // Authored ledges would bonk a jump from below, so make these one-way.
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

// Story AI floor by original chapter index. Early chapters keep dumb bots, later ones sharpen
// toward 'expert'. Only raises the tier, never lowers an author's aiDiff. Elites get one tier more.
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
  // Units pass through here twice (startGame, then _onStoryFightStart). Restore unscaled stats
  // so scaling doesn't compound.
  if (unit._storyRaw) {
    unit.maxHealth          = unit._storyRaw.maxHealth;
    unit.dmgMult            = unit._storyRaw.dmgMult;
    unit.attackCooldownMult = unit._storyRaw.attackCooldownMult;
  } else {
    unit._storyRaw = { maxHealth: unit.maxHealth, dmgMult: unit.dmgMult, attackCooldownMult: unit.attackCooldownMult };
  }
  const diff = typeof _storyDiffCfg === 'function' ? _storyDiffCfg() : null;

  // Use the original chapter id. After phase expansion _activeStory2Chapter.id can be 200+,
  // which would give 17x multipliers. _origId is the pre-expansion index (0-79).
  const origId = (typeof _activeStory2Chapter !== 'undefined'
    && _activeStory2Chapter
    && _activeStory2Chapter._origId !== undefined)
    ? _activeStory2Chapter._origId
    : Math.min(chapterId, 84); // hard-cap fallback to prevent runaway scaling

  const effId = origId + (diff ? diff.shift : 0);
  const s = getScaling(effId + (_storyPerformanceBonus() / 0.08 | 0));
  const PLAYER_HP = 100; // Fighter base maxHealth

  // Standard: capped at 2x player HP (200). Elite: 3x (300).
  const hpBase = unit.maxHealth || unit.health || 100;
  const rawHP  = Math.round(hpBase * (s.enemyHP / 100) * (elite ? 1.5 : 1));
  unit.maxHealth = Math.min(rawHP, Math.round((elite ? PLAYER_HP * 3 : PLAYER_HP * 2) * (diff ? diff.hpCap : 1)));
  unit.health    = unit.maxHealth;

  // Standard: at most 25% player HP per hit. Elite: 32%.
  const dmgCap    = (elite ? PLAYER_HP * 0.32 : PLAYER_HP * 0.25) * (diff ? diff.dmgCap : 1);
  const scaledDmg = Math.min(getScaling(origId + (_storyPerformanceBonus() / 0.08 | 0)).enemyDamage, dmgCap);
  unit.dmgMult    = (unit.dmgMult || 1) * (scaledDmg / 12); // 12 = median base weapon damage
  // The cap is per hit, so check it against the unit's own weapon. Scaled off the median,
  // an axe or hammer would land well past it.
  const wDmg = unit.weapon && unit.weapon.damage;
  if (!unit.isBoss && wDmg > 0) unit.dmgMult = Math.min(unit.dmgMult, dmgCap / wDmg);

  unit.attackCooldownMult = Math.max(0.58, (unit.attackCooldownMult || 1) * (elite ? 0.72 : 0.86));
  unit.aiDiff             = _storyFloorAiDiff(unit.aiDiff, effId, elite);
  unit.aiReact            = elite ? 0 : unit.aiReact;
  unit._storyElite        = elite;
  unit._storyPredict      = 0.10 + Math.min(0.18, effId * 0.0035) + (elite ? 0.12 : 0);
  unit._storyDodgeChance  = elite ? 0.14 : 0.05;

  // Onboarding: the first encounters teach controls, so they pressure but don't melt the player.
  // Softer damage, slower cadence, no prediction. Elites are exempt.
  if (!elite && origId < (diff ? diff.mercyTo : 6)) {
    const gentle = origId < 3;
    unit.maxHealth = Math.min(unit.maxHealth, gentle ? 120 : 160);
    unit.health    = unit.maxHealth;
    unit.dmgMult   = Math.min(unit.dmgMult, (gentle ? 8 : 12) / 12); // ≤8% / ≤12% player HP per hit
    unit.attackCooldownMult = Math.max(unit.attackCooldownMult, gentle ? 1.25 : 1.05);
    unit._storyPredict      = gentle ? 0 : Math.min(unit._storyPredict, 0.08);
    unit._storyDodgeChance  = 0.02;
  }

  // Challenge/Evolution get no mercy, but the first chapters still open below the full curve:
  // the player has no abilities yet. Harder than Normal's mercy, softer than the shifted scaling.
  // Two steps like Normal's mercy: [chapters 0-2, chapters 3 to earlyTo-1].
  if (!elite && diff && diff.earlyTo && origId < diff.earlyTo) {
    const step = origId < 3 ? 0 : 1;
    unit.maxHealth = Math.min(unit.maxHealth, diff.earlyHp[step]);
    unit.health    = unit.maxHealth;
    unit.dmgMult   = Math.min(unit.dmgMult, diff.earlyHit[step] / (wDmg > 0 ? wDmg : 12));
  }

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
  // A branch chapter's playable beat is only a beat. beatScale (0..1) trims its enemy health and damage.
  const _bs = (typeof _activeStory2Chapter !== 'undefined' && _activeStory2Chapter) ? _activeStory2Chapter.beatScale : 0;
  if (_bs > 0 && _bs < 1 && !unit.isBoss) {
    unit.maxHealth = Math.max(1, Math.round(unit.maxHealth * _bs));
    unit.health    = unit.maxHealth;
    unit.dmgMult   = unit.dmgMult * Math.max(0.5, _bs);
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
  // Seeded per chapter so the world is the same on every reload. The hash is murmur-style because a
  // raw LCG seeded with consecutive ids gives correlated first draws.
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

// One-map regions: consecutive walkFight chapters stitched into one world. Launching any member
// builds the whole region. Crossing a segment boundary awards its rewards without ending the match.
// Only the last segment's exit ends the chapter.
const STORY_REGIONS = [
  { name: 'Multiversal Core', chapters: [32, 33, 34, 35], segLen: 6000 },
];
function _storyRegionFor(chId) {
  for (const r of STORY_REGIONS) if (r.chapters.includes(chId)) return r;
  return null;
}

// Duel-opponent def for a walkFight chapter (main + optional second).
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

  worldId        = getWorldForChapter(ch.id);
  currentWorld   = STORY_WORLDS[worldId] || null;
  worldModifiers = currentWorld ? currentWorld.modifier : null;

  const _arcEx = getStoryArc(ch.id);
  if (_arcEx) storyCurrentArc = _arcEx.id;

  const _region = (ch.walkFight === true) ? _storyRegionFor(ch.id) : null;
  exploreRegion = null;
  exploreStartX = null;
  window._exploreBackArmed = false; // reverse loading zone re-arms once the player walks in
  // Reverse loading zone: a region backtracks out of its first chapter.
  exploreBackChapter = _storyBackChapterFor(_storyRegionFor(ch.id) ? _storyRegionFor(ch.id).chapters[0] : ch.id);

  // Walk→fight worlds get a GoW-scale minimum length.
  const _earth = (ch.walkFight === true) && _exploreIsEarthStyle(ch);
  const worldLen = _region ? _region.segLen * _region.chapters.length
    : (ch.walkFight === true) ? Math.max(ch.worldLength || 5200, 6000)
    : (ch.worldLength || 9000);
  const goalX    = ch.objectX    || (worldLen - 350);
  let plats;
  if (_region) {
    // Segment geometry is offset into place, so floors line up across boundaries.
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

  // Theme inheritance: adopt the authored arena's palette so the look survives the one-map conversion.
  // Explicit sky/groundColor/platColor still win.
  const _theme = (typeof ARENAS !== 'undefined' && ch.arena && ARENAS[ch.arena]) ? ARENAS[ch.arena] : null;
  const _level = (!_region && typeof storyLevelFor === 'function') ? storyLevelFor(ch) : null;

  const arenaKey = '__explore__';
  ARENAS[arenaKey] = {
    sky:           ch.sky         || (_level && _level.sky)         || (_theme && _theme.sky)         || ['#0a0a1e', '#1a1a2e'],
    groundColor:   ch.groundColor || (_level && _level.groundColor) || (_theme && _theme.groundColor) || '#333344',
    platColor:     ch.platColor   || (_level && _level.platColor)   || (_theme && _theme.platColor)   || '#445566',
    platEdge:      ch.platEdge    || (_theme && _theme.platEdge)    || null,
    themeKey:      (_theme && ch.arena) || null,
    storyLevel:    _level ? ((typeof storyLevelId === 'function') ? storyLevelId(ch) : ch.id) : null,
    // Region: each member chapter with a map draws its own segment.
    storyRegion:   (_region && typeof STORY_LEVELS !== 'undefined')
      ? _region.chapters.map((cid, i) => ({ id: cid, off: i * _region.segLen, len: _region.segLen })).filter(sg => STORY_LEVELS[sg.id])
      : null,
    noGroundFill:  !!(_level && _level.noGroundFill),
    // Render-only: the lava drawer needs a surface height. hasLava is not inherited, since it is a damage hazard.
    lavaY:         (_theme && _theme.lavaY) || null,
    // Bespoke arena art is authored against its own floor. The explore floor is at _EXP_SURF_Y (440).
    themeFloorY:   _theme ? ((_theme.platforms || []).find(pl => pl.isFloor) || {}).y ?? null : null,
    worldWidth:    worldLen,
    // A backtrack target opens the left edge as the reverse loading zone. With nowhere to go back to,
    // the edge stays a wall.
    mapLeft:       (ch.walkFight === true || exploreBackChapter != null) ? 60 : GAME_W / 2,
    mapRight:      worldLen - 50, // let player reach the full world including goalX
    deathY:        640,
    isStoryOnly:   true,
    isExploreArena: true,
    exploreStyle:  ch.style || 'city',
    platforms:     plats,
  };
  // Authored hazards (e.g. a lava crossing) that the theme inheritance above does not carry over.
  if (_level && _level.exploreProps) Object.assign(ARENAS[arenaKey], _level.exploreProps);
  if (_earth) {
    // No void under earth worlds. Bedrock seals the world, the death plane is a far-below failsafe,
    // and the camera may pan down into the tunnels.
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

  exploreActive    = true;
  exploreWorldLen  = worldLen;
  exploreGoalX     = goalX;
  exploreGoalName  = ch.objectName || 'Exit';
  exploreGoalFound = false;
  // The clear gate resets with the world, so a stale seal or force-spawn drain can't follow the player.
  exploreGoalBlocked     = 0;
  exploreGoalBlockReason = '';
  window._exploreForceSpawnAll = false;
  if (typeof _storyResetLevelWin === 'function') _storyResetLevelWin();
  if (typeof storySidequestsReset === 'function') storySidequestsReset();
  exploreCheckpoints = [];
  exploreCheckpointIdx = -1;
  // A map whose ledges would win pickSafeSpawn (and may hang over a hazard) names the start x.
  if (_level && _level.startX != null) exploreStartX = _level.startX;
  if (_region) {
    // One duel checkpoint per segment, each with its own opponent. Checkpoints behind the launched
    // segment start pre-hit so old duels don't re-fire.
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
      // Boundaries behind the launched segment start done, so they don't fire on frame one.
      boundaries: _region.chapters.slice(0, -1).map((cid, i) => ({ x: (i + 1) * _region.segLen, chId: cid, done: i < _myIdx })),
    };
    exploreStartX = _myIdx > 0 ? _myIdx * _region.segLen + 100 : null;
  } else {
    // A duel chapter gets exactly one checkpoint, which hosts its authored duel.
    // noCheckpointFights: a branch beat has no generic arena waves.
    const checkpointCount = ch.noCheckpointFights ? 0
      : (ch.walkFight === true || ch.exploreMode === 'duel') ? 1
      : (ch.worldLength >= 5200 ? 2 : 1);
    for (let i = 1; i <= checkpointCount; i++) {
      exploreCheckpoints.push({ x: Math.floor((worldLen * i) / (checkpointCount + 1)), hit: false });
    }
  }
  // Rest checkpoint every ~1500px of a long walkable world, with no fight. A game-over Retry resumes here.
  // Kept clear of fight checkpoints, shafts and structures. Escape, chase, defense and puzzle modes keep
  // the full restart.
  const _restOK = ch.walkFight === true ||
    (!ch.chaseTimer && !['escape', 'defense', 'puzzle', 'survival'].includes(ch.exploreMode));
  if (_restOK && worldLen >= 3000) {
    const _fightXs = exploreCheckpoints.map(c => c.x);
    const _ug = ARENAS[arenaKey].undergroundRects || [];
    const _blocked = x => plats.some(p => p.isStructure && x + 40 > p.x && x - 40 < p.x + p.w) ||
      _ug.some(r => r.kind === 'shaft' && x + 70 > r.x && x - 70 < r.x + r.w) ||
      // Authored floors can have pits; a resume point needs ground under it.
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
  // Walked off the left edge of the next world, so spawn at this world's exit end. Everything behind
  // the spawn pre-hits so old duels don't re-fire.
  if (_exploreEnterFromRight) {
    _exploreEnterFromRight = false;
    // Stay clear of the exit, or re-entering would instantly complete the chapter.
    exploreStartX = Math.max(120, Math.min(worldLen - 620, goalX - 260));
    exploreCheckpoints.forEach(cp => { if (cp.x < exploreStartX) cp.hit = true; });
    if (exploreRegion) exploreRegion.boundaries.forEach(b => { b.done = true; });
  }
  // Strip ranged weapons from unbeaten exploration enemies. Beaten chapters keep normal mobs gone once
  // killed. Guards and special enemies always respawn. Kills are recorded as '<chId>:f<index>' in lootTaken.
  const _expBeaten = Array.isArray(_story2.defeated) && _story2.defeated.includes(ch.id);
  _exploreChapterBeaten = _expBeaten;
  const _foesKilled = _story2.lootTaken || {};
  exploreSpawnQ = (ch.spawnEnemies || [])
    .map((e, i) => Object.assign({}, e, { _foeKey: ch.id + ':f' + i }))
    .filter(e => !_expBeaten || e.isGuard || e.isElite || ch.exploreMode === 'stealth' || !_foesKilled[e._foeKey])
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

  // Reset special-mode flags so stale state doesn't leak between chapters
  stealthModeActive  = false;
  escapeModeActive   = false;
  defenseModeActive  = false;
  scavengeModeActive = false;
  puzzleModeActive   = false;

  // New modes: init after startGame() via setTimeout
  const _exploreMode = ch.exploreMode;

  // Duel wrapper: one checkpoint locks the arena and spawns the real opponent. Generic spawns are suppressed.
  exploreDuelMode = (ch.exploreMode === 'duel' || ch.walkFight === true);
  exploreDuelOpponent = exploreDuelMode ? _storyBuildDuelOpponent(ch) : null;

  // Loot: coins, an EXP orb, and a healing crystal on the walk path. Carry HP from the previous walk→fight
  // chapter, applied on the first frame (full if none saved).
  exploreSeedHealth = (exploreDuelMode && _story2.health != null) ? _story2.health : null;

  // Game-over Retry from the last rest checkpoint. Everything behind it counts as walked: checkpoints
  // pre-hit, boundaries done, queued roamers dropped. Fixed guards stay. A resume gets full HP.
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
    // Taken pickups stay gone (saved per chapter+index).
    _story2.lootTaken = _story2.lootTaken || {};
    // Each region segment gets its own chapter-keyed loot run. A plain walkFight chapter is one segment.
    const _segs = exploreRegion
      ? exploreRegion.chapters.map((cid, i) => ({ cid, off: i * exploreRegion.segLen, len: exploreRegion.segLen }))
      : [{ cid: ch.id, off: 0, len: worldLen }];
    _segs.forEach(seg => {
      const _cpObj = exploreCheckpoints.find(c => c.x >= seg.off && c.x < seg.off + seg.len);
      const _cpX = _cpObj ? _cpObj.x : seg.off + Math.floor(seg.len / 2);
      // Treasure lives in chests on optional perches (see _exploreChestSites), not the walk line.
      // The healing crystal stays on the path. Key '2' is kept so older saves don't regenerate taken crystals.
      const _loot = [
        { x: Math.min(seg.off + seg.len - 220, _cpX + 520), y: 356, type: 'heal', icon: '💠', value: 60, key: seg.cid + ':2' },
      ];
      _exploreChestSites(seg.len, _earth).forEach((site, si) => {
        const elite = site.tier === 'elite';
        const _key = seg.cid + ':c' + si;
        const _chestX = seg.off + (site.underground ? site.chestX : site.baseX + 10);
        // Weak guards: elite caches always get one, often two. Minor caches get one half the time.
        // A hidden cache is a reward for looking, not a boss fight.
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
      // Authored extras (level.loot): off-path chests behind a jump, and richer ones guarded by an optional
      // elite. Keyed ':x<id>' so the c0/c1 star keys stay the same.
      const _lvLoot = (typeof STORY_LEVELS !== 'undefined' && STORY_LEVELS[seg.cid] && typeof STORY_LEVELS[seg.cid].loot === 'function')
        ? STORY_LEVELS[seg.cid].loot(seg.len) : [];
      (_lvLoot || []).forEach(d => {
        const _gs = (d.guards || []).map(g => Object.assign({}, g, { x: seg.off + g.x }));
        _loot.push({
          x: seg.off + d.x, y: d.y, type: 'chest', tier: d.tier || 'minor', icon: '🧰',
          underground: false, guards: _gs, guarded: _gs.length > 0, _guardSpawned: false,
          contents: d.contents || (d.tier === 'elite' ? { tokens: 40, exp: 45, heal: 100 } : { tokens: 15, exp: 18 }),
          key: seg.cid + ':x' + d.id,
        });
      });
      _loot.forEach(it => {
        it.collected = !!_story2.lootTaken[it.key];
        explorePickups.push(it);
      });
    });
  }

  if (ch.exploreMode === 'survival') {
    // Lock camera to the 900px arena
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

  selectedArena = arenaKey;
  gameMode      = 'exploration';
  p2IsBot       = false;

  // Ability progression: skill tree only
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

  // Ability toasts show only when bought in the skill tree

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

  // A stale escort must not follow the player in here.
  if (typeof escortCleanup === 'function') escortCleanup();
  if (typeof escortArm === 'function') escortArm(ch.escortNPC ? ch : null);
  startGame();
  setTimeout(() => {
    // Optional side objectives (smb-story-sidequests.js). Needs the arena and player.
    if (typeof storySidequestsArm === 'function') storySidequestsArm(ch);
    // Init special modes after players[] is populated
    if (_exploreMode === 'stealth'  && typeof initStealthMode  === 'function') initStealthMode(ch);
    if (_exploreMode === 'escape'   && typeof initEscapeMode   === 'function') initEscapeMode(ch);
    if (_exploreMode === 'defense'  && typeof initDefenseMode  === 'function') initDefenseMode(ch);
    if (_exploreMode === 'scavenge' && typeof initScavengeMode === 'function') initScavengeMode(ch);
    if (_exploreMode === 'puzzle'   && typeof initPuzzleMode   === 'function') initPuzzleMode(ch);
    // Creature mini-boss peak: walkFight and exploration both land here.
    if (ch.miniBoss && typeof _storySpawnMiniBoss === 'function') _storySpawnMiniBoss(ch);
    // The Trials, armed once the world and both fighters exist.
    if (ch.trial && typeof _storyArmTrial === 'function') _storyArmTrial(ch);
    else if (!ch.trial && typeof resetTrialState === 'function') resetTrialState();
  }, 80);
}

// Called each frame from gameLoop when gameMode === 'exploration'
