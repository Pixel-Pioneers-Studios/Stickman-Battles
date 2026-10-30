'use strict';
// smb-battleroyale.js: Battle Royale. Plane drop, void death, zone, loot, minimap.

// Constants
const BR_TOTAL        = 100;
// World shape
// Always ground under you. A fall through a sinkhole or the vent is a descent, not a death.
// Knockback costs HP and position, never the match. The old maps had no floor at all.
const BR_WORLD_W      = 12000;  // horizontal world size
const BR_WORLD_H      = 1900;   // vertical extent (sky, surface, underground)
const BR_DEATH_Y      = 1900;   // safety net, nothing reachable below this
const BR_LOOT_COUNT   = 200;    // loot chests, weighted by landmark density
const BR_ZONE_DAMAGE  = 2;      // HP per zone tick
const BR_ZONE_TICK    = 60;     // frames between zone ticks
const BR_PLANE_Y      = -180;   // world Y of the transport plane
const BR_PLANE_SPEED  = 18;     // px/frame, crosses the map in ~11.5s
const BR_ZONE_WAIT_F  = 1800;   // frames (30s) between zone moves
const BR_ZONE_CLOSE_F = 600;    // frames (10s) for a linear close
const BR_BOT_PICKUP_F = 60;     // frames a bot must stand on an item to take it (1s)

// Story field: the 94 prior fragment bearers plus Kael, 95 in all (the game's title).
const BR_BEARER_COUNT = 94;

// Field size is a variable (95 in story, 100 casual). Anything that reports it reads this.
var brFieldTotal   = BR_TOTAL;
// Derived in initBattleRoyale(), never set by a caller. A stray true would turn casual BR into the story field.
var brStoryBearers = false;

// 1 -> "1st", 12 -> "12th", 94 -> "94th".
function _brOrdinal(n) {
  var rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return n + 'th';
  switch (n % 10) {
    case 1:  return n + 'st';
    case 2:  return n + 'nd';
    case 3:  return n + 'rd';
    default: return n + 'th';
  }
}

// State
var brActive       = false;
var brAlive        = 0;
var brZonePhase    = 0;
var brZoneState    = 'wait';   // 'wait' | 'close' | 'final'
var brZoneTimer    = 0;        // frames left in the current state
var brZoneLeft     = 0;
var brZoneRight    = BR_WORLD_W;
var brZoneTop      = 0;
var brZoneBottom   = BR_WORLD_H;
var brZoneTargetL  = 0;
var brZoneTargetR  = BR_WORLD_W;
var brZoneTargetT  = 0;
var brZoneTargetB  = BR_WORLD_H;
var brZoneSpeedL   = 0;        // px/frame during close
var brZoneSpeedR   = 0;
var brZoneSpeedT   = 0;
var brZoneSpeedB   = 0;
var brZoneDmgTick  = 0;
var brWinner       = null;
var brLootBoxes    = [];
var brGroundItems  = [];       // items dropped on the ground: { x, y, vy, item, life }
var brInventory    = [null, null, null, null, null];
var brActiveSlot   = 0;

var brPlaneFlight  = true;    // true while the plane is still crossing
var brPlaneX       = -300;
var brJumped       = false;   // P1 has jumped
// Edge trigger: the drop key must be seen released once, so a key carried in from the menu can't drop you at once.
var brDropKeyReleased = false;
var brLanded       = false;   // P1 has landed
var brBotsFallDone = false;   // all bots have been assigned drop points

// Per-match state, reset by initBattleRoyale(). BR achievements are single-match feats, so career totals would be wrong.
var brPlayerKills   = 0;
var brPlayerCrates  = 0;
var brVisitedZones  = null;   // Set of landmark names the player has stood inside

var brSpectating      = false;
var brSpectateTarget  = null;
var brSpectateList    = [];   // alive fighters to cycle through
var brSpectateIdx     = 0;
var brElimBanner      = 0;    // frames to show "ELIMINATED" banner

// Three layers, spaced past the jump envelope (~370px reach) so a layer change is a route, not a hop.
// Sky floor to surface is 480px, surface crust to cavern floor 526px. Only rifts or authored climbs cross.
const BR_SKY_FLOOR_Y  = 420;    // lowest cloud platform
const BR_GROUND_Y     = 900;    // top of the surface crust
const BR_CRUST_H      = 74;     // crust thickness, its underside is the cave ceiling
const BR_CAVE_FLOOR_Y = 1500;   // top of the underground floor

// Hand-authored landmarks. The seeded generator stranded chests on unreachable ledges.
// _brValidateReach() checks every platform at build time.
// plats: [relX, worldY, width], x relative to the band. holes: [relStart, relEnd] gaps in the crust.
// layer: 'surface' | 'under' | 'sky'.
const BR_LANDMARKS = [
  // Surface
  { x: 0, w: 1100, name: 'Outskirts', themeKey: 'grass', layer: 'surface',
    danger: 0, density: 0.6, rarity: 0.0, plat: '#5aae4e', edge: '#3a7030',
    plats: [[120,760,170],[420,640,150],[720,760,190],[300,500,130]] },

  { x: 1100, w: 1100, name: 'The City', themeKey: 'city', layer: 'surface',
    danger: 1, density: 1.0, rarity: 0.2, plat: '#6a7382', edge: '#454d59',
    // Two ledge stacks read as buildings with roofs worth contesting. The third building is the office (smb-br-structures.js).
    plats: [[80,770,220],[380,640,200],[180,500,150],[520,500,180]] },

  { x: 2200, w: 1200, name: 'The Plains', themeKey: 'grass', layer: 'surface',
    danger: 0, density: 0.6, rarity: 0.0, plat: '#5aae4e', edge: '#3a7030',
    // Two sinkholes are the way into the cave. The 650 ledge sits within a stride of the 770 step,
    // so the climb out is 900 -> 770 -> 650. Placed alone, a ledge like that strands chests.
    plats: [[150,770,180],[520,650,170],[940,770,180]],
    holes: [[340,500],[730,900]] },

  { x: 3400, w: 900, name: 'Old Road', themeKey: 'desert', layer: 'surface',
    danger: 0, density: 0.6, rarity: 0.0, plat: '#c9a05a', edge: '#9a743a',
    plats: [[120,780,190],[430,660,170],[700,780,170]] },

  { x: 4300, w: 1300, name: 'The Volcano', themeKey: 'volcano', layer: 'surface',
    danger: 4, density: 1.6, rarity: 0.7, plat: '#4a2a22', edge: '#7a3a22', signY: 430,
    // The mountain itself (slopes, rim, crater pit, its ledges) is built by smb-br-structures.js.
    // The vent opens in the pit floor and runs all the way down into the Depths.
    plats: [],
    holes: [[610,690]],
    splits: [500, 800] },

  { x: 5600, w: 900, name: 'East Plains', themeKey: 'grass', layer: 'surface',
    danger: 0, density: 0.6, rarity: 0.0, plat: '#5aae4e', edge: '#3a7030',
    plats: [[130,780,190],[450,650,180]] },

  { x: 6500, w: 1200, name: 'The Ruins', themeKey: 'ruins', layer: 'surface',
    danger: 2, density: 1.3, rarity: 0.4, plat: '#8a7a5a', edge: '#5e523a',
    // The temple (portico, toppling pillars, the sealed vault) is built by smb-br-structures.js at rel 540-900.
    plats: [[100,700,120],[330,780,110],[1000,560,140]],
    wildlife: [[600, 'beast']] },

  { x: 7700, w: 1000, name: 'Frostline', themeKey: 'ice', layer: 'surface',
    danger: 2, density: 1.1, rarity: 0.3, plat: '#9fd8ea', edge: '#6aa8c4',
    // The gorge (rel 300-760) has no floor: the rope bridge over it is built by smb-br-structures.js.
    plats: [[40,780,200],[110,650,150],[810,780,170]],
    holes: [[300,760]],
    wildlife: [[150, 'yeti']] },

  { x: 8700, w: 1200, name: 'Neon Sector', themeKey: 'cyberpunk', layer: 'surface',
    danger: 2, density: 1.3, rarity: 0.4, plat: '#4a3a6a', edge: '#7a5ac0',
    plats: [[100,770,200],[420,640,190],[760,770,220],[560,500,170]] },

  { x: 9900, w: 800, name: 'West Plains', themeKey: 'grass', layer: 'surface',
    danger: 0, density: 0.6, rarity: 0.0, plat: '#5aae4e', edge: '#3a7030',
    plats: [[120,780,180],[440,650,170]] },

  { x: 10700, w: 1300, name: 'The Colosseum', themeKey: 'colosseum', layer: 'surface',
    danger: 3, density: 1.6, rarity: 0.6, plat: '#b5a180', edge: '#8a7454',
    plats: [[120,800,200],[380,700,180],[640,600,180],[900,700,180],[1060,800,190],[520,490,260]] },

  // Underground
  // Caverns under the plains, a tunnel under the desert, and the volcano depths. Floor is BR_CAVE_FLOOR_Y throughout.
  { x: 2200, w: 1200, name: 'The Caverns', themeKey: 'cave', layer: 'under',
    danger: 3, density: 2.0, rarity: 0.65, plat: '#3a2518', edge: '#5a3a28',
    plats: [[120,1380,160],[700,1380,170],[950,1250,150],
            // Climb out under the left sinkhole: 1500 -> 1380 -> 1240 -> 1100 -> 1000, then onto the surface at 900.
            [380,1380,140],[420,1240,140],[380,1100,140],[410,1000,150]],
    wildlife: [[800, 'beast']] },

  { x: 3400, w: 900, name: 'The Tunnel', themeKey: 'cave', layer: 'under',
    danger: 2, density: 1.2, rarity: 0.45, plat: '#3a2518', edge: '#5a3a28',
    plats: [[200,1380,180],[560,1380,180]] },

  { x: 4300, w: 1300, name: 'Volcano Depths', themeKey: 'volcano', layer: 'under',
    danger: 5, density: 2.3, rarity: 0.95, plat: '#4a2a22', edge: '#7a3a22',
    // Best loot, over the most lava, furthest from any exit.
    plats: [[150,1370,160],[880,1370,160],[1060,1260,150],
            // The climb up into the volcano's pit, under the vent (rel 610-690 of the surface band). One-way steps.
            // The top one stands 92px under the crust, so a fighter on it can walk off its ends without
            // catching their head on the crust's underside (it ends at 974).
            [560,1380,150,'pass'],[640,1255,150,'pass'],[560,1155,150,'pass'],[610,1066,80,'pass']],
    lava: [[330,170],[1150,150]] },

  // Sky
  // Reachable only through a rift. Stepping off lands on the surface, so the sky is one-way.
  { x: 6500, w: 2200, name: 'Cloud Kingdom', themeKey: 'clouds', layer: 'sky',
    danger: 3, density: 1.8, rarity: 0.75, plat: '#dce9f5', edge: '#9db6cc',
    plats: [[100,420,240],[420,330,200],[760,420,220],[1100,330,240],
            [1440,420,200],[1780,330,220],[600,200,180],[1300,200,180]] },
];

// Rifts
// Paired fast-travel gates: the only way into the sky, out of the deep, and across the map faster than the storm.
// Entry cooldown so a pair can't be ridden in a loop.
const BR_RIFT_PAIRS = [
  { a: { x: 560,  y: 830 },  b: { x: 6900,  y: 350 },  color: '#7fd4ff', label: 'SKY' },
  { a: { x: 8300, y: 350 },  b: { x: 11300, y: 830 },  color: '#ffd27f', label: 'ARENA' },
  { a: { x: 2500, y: 1430 }, b: { x: 5450,  y: 1430 }, color: '#ff8a5c', label: 'DEEP' },
  { a: { x: 9200, y: 830 },  b: { x: 3150,  y: 1430 }, color: '#c79bff', label: 'CAVERN' },
];
var brRifts = [];

// Holes are authored per band. These derived values keep the fall integrator working.
var BR_SHAFT_L = 2580, BR_SHAFT_R = 2720;

// Surface hazard rects: { x, y, w, h, type }.
var brHazards = [];

// Zone phases
// The ring is horizontal: a closing band on a continuous floor forces contact, where a vertical squeeze just pushed people off ledges.
// The final ring lands on a named surface landmark. Each ring is clamped inside the previous one, so the sequence stays nested.
var brZonePhases    = [];
var brFinalRingName = '';
var brZoneCloseLen  = 600;   // length of the current close, for the HUD percentage

function _brMakeZonePhases() {
  var pool = BR_LANDMARKS.filter(function (L) {
    return L.layer === 'surface' && L.danger > 0;
  });
  if (!pool.length) pool = BR_LANDMARKS.filter(function (L) { return L.layer === 'surface'; });
  var pick = pool[Math.floor(Math.random() * pool.length)];
  var cx   = pick.x + pick.w / 2;
  brFinalRingName = pick.name;

  var widths = [9200, 6800, 4700, 3100, 2000, 1150, 340];
  var phases = [{ left: 0, right: BR_WORLD_W, top: 0, bottom: BR_WORLD_H,
                  wait: 2800, close: 780 }];
  var prevL = 0, prevR = BR_WORLD_W;
  for (var i = 0; i < widths.length; i++) {
    var half = widths[i] / 2;
    // The ring wanders on the way in, so phase 1 says little about phase 6. The drift shrinks with the ring.
    var drift = (Math.random() - 0.5) * widths[i] * 0.55;
    var aim   = cx + drift * (1 - i / widths.length);
    var c     = Math.max(prevL + half, Math.min(prevR - half, aim));
    var L     = Math.round(c - half), R = Math.round(c + half);
    // Phase timing: long enough to loot and fight over a landmark, and still rotate. Irregular on purpose.
    var t     = i / (widths.length - 1);
    // Closes are unchanged, so the ring moves as fast as before.
    var wait  = Math.round((3400 - 1100 * t) * (0.88 + Math.random() * 0.24));
    var close = Math.round((980 - 260 * t) * (0.90 + Math.random() * 0.20));
    phases.push({ left: L, right: R, top: 0, bottom: BR_WORLD_H,
                  wait: Math.max(1200, wait), close: Math.max(600, close) });
    prevL = L; prevR = R;
  }
  return phases;
}

// Storm surges
// Surges are telegraphed before they move, so they test reaction rather than ambush.
const BR_SURGE_WARN   = 210;   // frames of warning (~3.5s)
const BR_SURGE_FRAMES = 150;   // frames of movement (~2.5s)
const BR_SURGE_BITE   = 0.07;  // fraction of the remaining gap eaten per surge
var brSurgeWarn     = 0;
var brSurgeTimer    = 0;
var brSurgeSpeedL   = 0;
var brSurgeSpeedR   = 0;
var brSurgeCooldown = 0;

function _brResetSurge() {
  brSurgeWarn = 0; brSurgeTimer = 0;
  brSurgeSpeedL = 0; brSurgeSpeedR = 0;
  brSurgeCooldown = 2100;
}

function _brUpdateSurge() {
  if (brZoneState !== 'wait' || !brLanded) return;
  var next = brZonePhases[brZonePhase + 1];
  if (!next) return;

  if (brSurgeTimer > 0) {
    brZoneLeft  += brSurgeSpeedL;
    brZoneRight += brSurgeSpeedR;
    // Never overshoot the phase the ring is actually heading for.
    brZoneLeft  = Math.min(brZoneLeft,  next.left);
    brZoneRight = Math.max(brZoneRight, next.right);
    brSurgeTimer--;
    return;
  }
  if (brSurgeWarn > 0) {
    brSurgeWarn--;
    if (brSurgeWarn === 0) {
      brSurgeSpeedL = ((next.left  - brZoneLeft)  * BR_SURGE_BITE) / BR_SURGE_FRAMES;
      brSurgeSpeedR = ((next.right - brZoneRight) * BR_SURGE_BITE) / BR_SURGE_FRAMES;
      brSurgeTimer  = BR_SURGE_FRAMES;
      screenShake = Math.max(screenShake, 10);
    }
    return;
  }
  if (brSurgeCooldown > 0) { brSurgeCooldown--; return; }
  // About one surge per 45s of waiting, from phase 2 on. They stop people parking dead centre, and only nudge (7% of the gap).
  if (brZonePhase < 2) return;
  var odds = 0.0004 + brZonePhase * 0.00022;
  if (Math.random() < odds) {
    brSurgeWarn     = BR_SURGE_WARN;
    brSurgeCooldown = 2600;
    if (typeof DamageText !== 'undefined')
      damageTexts.push(new DamageText(GAME_W / 2, 110, 'STORM SURGE', '#ff7733'));
  }
}

// Loot rarity
// A flat pool gave every chest the same odds. Rarity plus per-landmark bias makes the depths worth the risk.
const BR_RARITY = [
  { key: 'common',    label: 'Common',    color: '#b9c2cc', weight: 46, heal: 30, shield: 20 },
  { key: 'uncommon',  label: 'Uncommon',  color: '#5ddc6a', weight: 27, heal: 45, shield: 30 },
  { key: 'rare',      label: 'Rare',      color: '#4aa8ff', weight: 16, heal: 60, shield: 45 },
  { key: 'epic',      label: 'Epic',      color: '#b45cff', weight:  8, heal: 85, shield: 60 },
  { key: 'legendary', label: 'Legendary', color: '#ffc63a', weight:  3, heal: 999, shield: 80 },
];

// Unlisted weapons fall into the common bracket, so adding to WEAPONS can't break the tables.
const BR_WEAPON_TIERS = {
  legendary: ['nullblade', 'voidblade', 'shockrifle'],
  epic:      ['scythe', 'katana', 'flamethrower', 'electricstaff', 'glassblade', 'crossbow'],
  rare:      ['axe', 'hammer', 'gun', 'bow', 'flail', 'bomb', 'anchor'],
  uncommon:  ['sword', 'spear', 'whip', 'boomerang', 'knives'],
};

// `combat` is the drop-in loadout and must never appear in a chest. The gauntlets are out of WEAPON_KEYS. `lantern` is trial-only.
const BR_LOOT_EXCLUDE = ['combat', 'gauntlet', 'mkgauntlet', 'lantern', 'fragment'];

const BR_LOOT_POOL = [
  { type: 'medkit', label: 'Medkit',  icon: '💊', color: '#44ff88', weight: 22 },
  { type: 'shield', label: 'Shield',  icon: '🛡',  color: '#4488ff', weight: 18 },
  { type: 'super',  label: 'Super',   icon: '⚡',  color: '#ffdd00', weight: 12 },
  { type: 'weapon', label: null,      icon: '⚔',  color: '#cc88ff', weight: 48 },
];

// Rarity roll biased by the landmark's `rarity` (0 = plains, 0.95 = depths). The bias shifts weight up the table, so dangerous bands are better at every tier.
function _brRollRarity(bias) {
  var total = 0, w = [];
  for (var i = 0; i < BR_RARITY.length; i++) {
    var t = i / (BR_RARITY.length - 1);
    var mult = 1 + (bias || 0) * (t * 5 - 1.1);
    var ww = BR_RARITY[i].weight * Math.max(0.05, mult);
    w.push(ww); total += ww;
  }
  var r = Math.random() * total;
  for (var j = 0; j < w.length; j++) { r -= w[j]; if (r <= 0) return BR_RARITY[j]; }
  return BR_RARITY[0];
}

// One gate for every weapon that can enter a match through loot.
function _brLootAllowed(k) {
  if (typeof WEAPONS === 'undefined' || !WEAPONS[k]) return false;
  if (BR_LOOT_EXCLUDE.indexOf(k) !== -1) return false;
  // Story field: the joke weapons are wrong in the void.
  if (brStoryBearers && typeof STORY_TONE_EXCLUDED_WEAPONS !== 'undefined'
      && STORY_TONE_EXCLUDED_WEAPONS.indexOf(k) !== -1) return false;
  return true;
}

// Search down from the rolled tier, so an empty bracket never leaves a legendary chest empty.
function _brWeaponForRarity(rarityKey) {
  var order = ['legendary', 'epic', 'rare', 'uncommon'];
  var start = order.indexOf(rarityKey);
  if (start === -1) start = order.length;       // common: fall through
  for (var i = start; i < order.length; i++) {
    var list = (BR_WEAPON_TIERS[order[i]] || []).filter(_brLootAllowed);
    if (list.length) return list[Math.floor(Math.random() * list.length)];
  }
  var tiered = [];
  for (var k in BR_WEAPON_TIERS) tiered = tiered.concat(BR_WEAPON_TIERS[k]);
  var rest = (typeof WEAPON_KEYS !== 'undefined' ? WEAPON_KEYS : []).filter(function (key) {
    return tiered.indexOf(key) === -1 && _brLootAllowed(key);
  });
  if (!rest.length) rest = (typeof WEAPON_KEYS !== 'undefined' ? WEAPON_KEYS : ['sword']).filter(_brLootAllowed);
  return rest[Math.floor(Math.random() * rest.length)] || 'sword';
}

// Layers overlap in X, so only Y picks the band. The caverns sit directly under the plains.
function brLayerAt(y) {
  // Tight window: surface ledges reach y=490, and a loose window would file them as sky.
  if (y <= BR_SKY_FLOOR_Y + 35)          return 'sky';
  if (y >= BR_GROUND_Y + BR_CRUST_H + 20) return 'under';
  return 'surface';
}

// Falls back to the nearest band in the layer, so callers never get null.
function brLandmarkAt(x, y) {
  var layer = (y === undefined) ? 'surface' : brLayerAt(y);
  var inLayer = BR_LANDMARKS.filter(function (L) { return L.layer === layer; });
  if (!inLayer.length) inLayer = BR_LANDMARKS;
  for (var i = 0; i < inLayer.length; i++) {
    if (x >= inLayer[i].x && x < inLayer[i].x + inLayer[i].w) return inLayer[i];
  }
  var best = inLayer[0], bd = Infinity;
  inLayer.forEach(function (L) {
    var d = Math.abs((L.x + L.w / 2) - x);
    if (d < bd) { bd = d; best = L; }
  });
  return best;
}

function _makeBRArena() {
  var platforms = [];
  brHazards = [];
  brRifts   = [];

  function push(o) { platforms.push(o); return o; }

  // Surface crust
  // One slab per band, so each biome paints its own terrain. Bedrock fills below the crust.
  BR_LANDMARKS.filter(function (L) { return L.layer === 'surface'; }).forEach(function (L) {
    var cuts = (L.holes || []).map(function (h) { return [L.x + h[0], L.x + h[1]]; })
                              .sort(function (a, b) { return a[0] - b[0]; });
    var segs = [], cur = L.x;
    cuts.forEach(function (c) { if (c[0] > cur) segs.push([cur, c[0]]); cur = Math.max(cur, c[1]); });
    if (cur < L.x + L.w) segs.push([cur, L.x + L.w]);
    // splits: [relX] seams with no gap, so the path graph sees separate floors (the volcano's pit floor is
    // walled off from the crust under its slopes; one slab would read as a walk straight through the rock).
    (L.splits || []).forEach(function (rx) {
      var sx = L.x + rx;
      for (var k = 0; k < segs.length; k++) {
        if (sx > segs[k][0] + 4 && sx < segs[k][1] - 4) { segs.splice(k, 1, [segs[k][0], sx], [sx, segs[k][1]]); break; }
      }
    });
    segs.forEach(function (seg) {
      var x0 = seg[0], x1 = seg[1];
      if (x1 - x0 < 4) return;
      if (x0 === 0)          x0 = -400;                 // overhang the world ends
      if (x1 === BR_WORLD_W) x1 = BR_WORLD_W + 400;
      push({ x: x0, y: BR_GROUND_Y, w: x1 - x0, h: BR_CRUST_H,
             isFloor: true, color: L.plat, edge: L.edge, _brBand: L.name });
    });
  });

  // Underground floor
  // The under-layer floors join into one system.
  var under = BR_LANDMARKS.filter(function (L) { return L.layer === 'under'; });
  under.forEach(function (L) {
    push({ x: L.x, y: BR_CAVE_FLOOR_Y, w: L.w, h: 120,
           isFloor: true, color: '#241710', edge: '#4a2f1e', _brBand: L.name });
  });

  // Authored interiors
  BR_LANDMARKS.forEach(function (L) {
    (L.plats || []).forEach(function (pl) {
      // A 4th entry 'pass' makes a one-way step (jump up through it), for climbs stacked over each other.
      push({ x: L.x + pl[0], y: pl[1], w: pl[2], h: 16, passUnder: pl[3] === 'pass',
             color: L.plat, edge: L.edge, _brBand: L.name });
    });
    (L.lava || []).forEach(function (lv) {
      // [relX, width]. Lava sits on whichever floor its layer owns.
      var top = (L.layer === 'under') ? BR_CAVE_FLOOR_Y : BR_GROUND_Y;
      brHazards.push({ x: L.x + lv[0], y: top - 16, w: lv[1], h: 34, type: 'lava' });
    });
  });

  // Rifts
  BR_RIFT_PAIRS.forEach(function (pr, i) {
    brRifts.push({ x: pr.a.x, y: pr.a.y, pair: i, side: 'a', color: pr.color, label: pr.label });
    brRifts.push({ x: pr.b.x, y: pr.b.y, pair: i, side: 'b', color: pr.color, label: pr.label });
  });

  // Structures add their own floors (the office), so reach validation covers them.
  if (typeof brStructurePlatforms === 'function') brStructurePlatforms(push);

  var arena = {
    id: 'battleroyale',
    name: 'Battle Royale',
    bg: '#0a0c14',
    sky: ['#1d3a5c', '#5c86a8'],
    // Bedrock: everything under the surface crust, including the cavern walls.
    groundColor: '#33261c',
    platColor:   '#5aae4e',
    platEdge:    '#3a7030',
    worldWidth: BR_WORLD_W,
    mapLeft: 0,
    mapRight: BR_WORLD_W,
    // Vertical extent. The godmode free-flight clamp in Fighter.update assumes a 520-tall arena.
    mapBottom: BR_WORLD_H,
    isBossArena: false,
    isBRBanded: true,
    themeFloorY: 480,
    platforms: platforms,
  };
  _brValidateReach(platforms);
  return arena;
}

// Reachability: chests spawn only on platforms, so every platform must be reachable from the one below it.
// Jump apex is ~197px, so 150px is the authored single-hop ceiling. Deliberate layer gaps are exempt, since rifts cross them.
const BR_MAX_HOP  = 175;   // vertical rise a single jump can clear, with headroom
const BR_STRIDE   = 210;   // horizontal gap still bridgeable from a standing jump

function _brValidateReach(platforms) {
  var bad = [];
  platforms.forEach(function (pl) {
    if (pl.isFloor || pl.isWall || pl.ramp) return;   // walls and slopes (BR structures) are not chest surfaces
    if (pl._brRampFed) return;   // reached by walking up a slope (the volcano's rim)
    // The floor under this platform's layer is always a valid support.
    var layerFloor = pl.y > BR_GROUND_Y ? BR_CAVE_FLOOR_Y
                   : pl.y < BR_SKY_FLOOR_Y + 1 ? null    // sky: rift-only by design
                   : BR_GROUND_Y;
    if (layerFloor === null) return;
    var best = layerFloor;
    platforms.forEach(function (o) {
      if (o === pl || o.y <= pl.y) return;               // must be BELOW pl
      if (o.x > pl.x + pl.w + BR_STRIDE) return;
      if (o.x + o.w < pl.x - BR_STRIDE) return;
      if (o.y < best) best = o.y;
    });
    if (best - pl.y > BR_MAX_HOP) {
      bad.push({ band: pl._brBand, x: pl.x, y: pl.y, rise: Math.round(best - pl.y) });
    }
  });
  if (bad.length) {
    console.warn('[BR] ' + bad.length + ' platform(s) exceed the jump envelope — '
      + 'chests placed there would be unreachable:', bad);
  }
  return bad;
}

// Init
function initBattleRoyale() {
  // Derived from the active chapter, so the flag can't leak into a casual match the way a latched boolean would.
  brStoryBearers = !!(typeof storyModeActive !== 'undefined' && storyModeActive
                      && typeof _activeStory2Chapter !== 'undefined' && _activeStory2Chapter
                      && _activeStory2Chapter.type === 'battleroyale');
  brFieldTotal   = brStoryBearers ? BR_BEARER_COUNT + 1 : BR_TOTAL;

  brActive       = true;
  brAlive        = brFieldTotal;
  brZonePhases   = _brMakeZonePhases();
  brZonePhase    = 0;
  brZoneState    = 'wait';
  brZoneTimer    = brZonePhases[1] ? brZonePhases[1].wait : BR_ZONE_WAIT_F;
  brZoneCloseLen = BR_ZONE_CLOSE_F;
  _brResetSurge();
  _brWarStartFrame = 0;
  brZoneLeft     = 0;
  brZoneRight    = BR_WORLD_W;
  brZoneTop      = 0;
  brZoneBottom   = BR_WORLD_H;
  brZoneTargetL  = 0;
  brZoneTargetR  = BR_WORLD_W;
  brZoneTargetT  = 0;
  brZoneTargetB  = BR_WORLD_H;
  brZoneSpeedL   = 0;
  brZoneSpeedR   = 0;
  brZoneSpeedT   = 0;
  brZoneSpeedB   = 0;
  brZoneDmgTick  = 0;
  brWinner       = null;
  brLootBoxes    = [];
  brGroundItems  = [];
  brInventory    = [null, null, null, null, null];
  brActiveSlot   = 0;
  brPlaneFlight  = true;
  brPlaneX       = -300;
  brJumped       = false;
  brDropKeyReleased = false;
  brLanded       = false;
  brBotsFallDone = false;
  brPlayerKills     = 0;
  brPlayerCrates    = 0;
  brVisitedZones    = new Set();
  brSpectating      = false;
  brSpectateTarget  = null;
  brSpectateList    = [];
  brSpectateIdx     = 0;
  brElimBanner      = 0;
  _brHideRestartBtn();

  currentArena = _makeBRArena();
  if (typeof brResetStructures === 'function') brResetStructures();
  // Clear the arena key. Otherwise drawBackground paints that arena's backdrop across the 12000px world, over the landmark bands.
  currentArenaKey = 'battleroyale';
  if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();

  var p1 = players[0];
  if (p1) {
    // Class and perks stay as chosen. Only the weapon is stripped, so everyone starts with fists.
    if (typeof WEAPONS !== 'undefined' && WEAPONS.combat) {
      p1.weaponKey = 'combat';
      p1.weapon    = WEAPONS.combat;
      p1.cooldown  = 0;
    }
    p1.x = brPlaneX - (p1.w || 30) / 2;
    p1.y = BR_PLANE_Y;
    p1.vx = 0; p1.vy = 0;
    p1.target = null;
    p1.lives  = 1;
    p1.invincible = 999999;
    p1._brOnPlane = true;
  }

  // The story skill tree reaches p1 through _storyApplyFightStartBuffs at the end of _startGameCore.

  _brSpawnBots();
  _brSpawnWildlife();
  _brSpawnLoot();
}

// Bot spawning
function _brSpawnBots() {
  minions.length = 0;
  var humanCount = players.filter(function(p) { return !p.isAI; }).length;
  var botCount   = brFieldTotal - humanCount;
  var palette    = ['#ff4444','#44aaff','#44ff88','#ffaa22','#cc44ff','#ff88cc','#22ddff','#ffff44','#ff8800','#00ffcc'];
  // Bearers share the construct palette from ch147, with ten distinct values. 94 identical silhouettes are unreadable.
  var bearerPalette = ['#8811bb','#9922cc','#aa33dd','#7a0fa8','#b944e8','#6d0d96','#a02ad0','#c455f0','#5f0b84','#8f1fc0'];
  // Starting weapons are gone, so the joke-weapon filter moved to the loot tables (_brLootAllowed).

  for (var i = 0; i < botCount; i++) {
    // Everyone drops with fists. WEAPONS.combat is the bare kit, so unarmed is a real weapon. Weapons come from loot.
    var wk   = 'combat';
    // The spread runs to 'expert' so fighters in the last rings are still dangerous.
    var diff = i < 20 ? 'easy' : i < 55 ? 'medium' : i < 85 ? 'hard' : 'expert';
    var bot;
    if (brStoryBearers) {
      // i=0 is the oldest, weakest echo. i=93 is the most recent.
      var bearerNo = i + 1;
      diff = bearerNo <= 30 ? 'easy' : bearerNo <= 70 ? 'medium' : bearerNo <= 88 ? 'hard' : 'expert';
      bot = new Fighter(brPlaneX, BR_PLANE_Y, bearerPalette[i % bearerPalette.length], wk,
        { left: null, right: null, jump: null, attack: null, ability: null, super: null }, true, diff);
      bot.name        = 'The ' + _brOrdinal(bearerNo);
      bot._brBearerNo = bearerNo;
    } else {
      bot = new Fighter(brPlaneX, BR_PLANE_Y, palette[i % palette.length], wk,
        { left: null, right: null, jump: null, attack: null, ability: null, super: null }, true, diff);
      bot.name = 'P' + (i + 2);
    }
    bot.lives      = 1;
    bot.playerNum  = 2 + (i % 4);
    bot._brBot     = true;
    // Only awake bots run a brain (see _brCullBots), so a faster tick is affordable. 15 frames is one dodge window.
    bot.aiTickInterval = 6;
    bot._brTickSalt = i;   // stable per-bot phase, so work never lands on one frame
    bot._brInv     = [null, null, null, null, null];
    bot.invincible = 999999;
    bot.target     = null;
    bot._brOnPlane = true;
    bot._brDropped = false;
    bot._brLanded  = false;
    // Spread drops evenly with jitter so bots scatter across map
    bot._brDropX   = 100 + (i / botCount) * (BR_WORLD_W - 200) + (Math.random() - 0.5) * 200;
    minions.push(bot);
  }
}

// Loot spawning: chests with hidden contents
function _brSpawnLoot() {
  brLootBoxes = [];
  var plats = currentArena.platforms;
  if (!plats || !plats.length) return;

  function _makeItem(band, bias) {
    var rarity = _brRollRarity(bias !== undefined ? bias : (band ? band.rarity : 0));
    var total = 0;
    for (var i = 0; i < BR_LOOT_POOL.length; i++) total += BR_LOOT_POOL[i].weight;
    var r = Math.random() * total, tpl = BR_LOOT_POOL[0];
    for (var j = 0; j < BR_LOOT_POOL.length; j++) { r -= BR_LOOT_POOL[j].weight; if (r <= 0) { tpl = BR_LOOT_POOL[j]; break; } }

    var item = { type: tpl.type, label: tpl.label, icon: tpl.icon,
                 color: rarity.color, rarity: rarity.key, rarityLabel: rarity.label };
    if (item.type === 'weapon') {
      var wk = _brWeaponForRarity(rarity.key);
      item.weaponKey = wk;
      item.label = (WEAPONS[wk] && WEAPONS[wk].name) || wk;
      item.icon  = '⚔';
    } else if (item.type === 'medkit') {
      item.heal  = rarity.heal;
      item.label = rarity.heal >= 999 ? 'Full Heal' : 'Medkit';
    } else if (item.type === 'shield') {
      item.shield = rarity.shield;
      item.label  = 'Shield';
    }
    return item;
  }

  // Chest budget goes per landmark by density weight, so the depths are dense and the plains thin. Chests never go to the band directly above or below their own.
  var totalWeight = 0;
  BR_LANDMARKS.forEach(function (L) { totalWeight += L.density * L.w; });

  BR_LANDMARKS.forEach(function (L) {
    var budget = Math.round(BR_LOOT_COUNT * (L.density * L.w) / totalWeight);
    var spots = [];
    plats.forEach(function (pl) {
      if (pl._brBand !== L.name) return;
      if (pl.isFloor && typeof brStructureSpotOK === 'function') {
        // Crust inside a structure's rock (under the volcano's slopes) is out of reach.
        var _from = pl.x + 90, _to = pl.x + pl.w - 90;
        for (var _fx = _from; _fx < _to; _fx += 600) {
          var _sx = _fx + Math.random() * 380;
          if (brStructureSpotOK(_sx, pl.y)) spots.push({ x: _sx, y: pl.y });
        }
        return;
      }
      if (pl.isFloor) {
        // One chest per 600px of floor, so a band-long slab can't soak the whole budget.
        var from = pl.x + 90, to = pl.x + pl.w - 90;
        for (var fx = from; fx < to; fx += 600) spots.push({ x: fx + Math.random() * 380, y: pl.y });
      } else {
        // _brLootW: a structure's loot shelf counts several times (the volcano's pit, the temple vault).
        for (var _lw = 0; _lw < (pl._brLootW || 1); _lw++) {
          spots.push({ x: pl.x + 16 + Math.random() * Math.max(1, pl.w - 32), y: pl.y, bias: pl._brLootRarity, vault: pl._brVault });
        }
      }
    });
    if (!spots.length) return;
    for (var c = 0; c < budget && brLootBoxes.length < BR_LOOT_COUNT; c++) {
      var sp = spots[Math.floor(Math.random() * spots.length)];
      brLootBoxes.push({
        x: sp.x, y: sp.y - 20,
        band: L.name,
        item: _makeItem(L, sp.bias),
        _vault: !!sp.vault,
        opened: false,
        anim: 0,
        health: 30,
        maxHealth: 30,
        _dmgTimer: 0,
      });
    }
  });
}

// Plane update
function _brUpdatePlane() {
  if (!brPlaneFlight) return;
  var p1 = players[0];

  brPlaneX += BR_PLANE_SPEED;

  // P1 handling
  if (!brJumped) {
    if (p1) {
      p1.x  = brPlaneX - (p1.w || 30) / 2;
      p1.y  = BR_PLANE_Y;
      p1.vx = 0; p1.vy = 0;
      p1.onGround = false;
    }
    if (brPlaneX > BR_WORLD_W + 400) {
      brJumped = true;
      // Auto-drop at the run's end: pull the player back inside the world.
      if (p1) {
        p1._brOnPlane = false; p1.vy = 6;
        p1.x = Math.min(p1.x, BR_WORLD_W - (p1.w || 30) - 60);
      }
    }
    // Drop input is edge-triggered (a SPACE held from the menu must not drop you) and only counts over the map.
    // The plane starts off the world at x=-300, so an early drop got clamped to the left edge.
    var _dropKeyDown = (typeof keysDown !== 'undefined') && (p1 && p1.controls ? (keysDown.has(p1.controls.jump) || keysDown.has(p1.controls.attack)) : (keysDown.has('w') || keysDown.has(' ')));
    if (!_dropKeyDown) brDropKeyReleased = true;
    if (p1 && _dropKeyDown && brDropKeyReleased && brPlaneX > 120) {
      brJumped = true;
      p1._brOnPlane = false;
      p1.vx = 0; p1.vy = 6;
      // Never start the fall outside the playable world.
      p1.x = Math.max(40, Math.min(BR_WORLD_W - (p1.w || 30) - 40, p1.x));
    }
  } else if (!brLanded) {
    if (p1) {
      // Leave vx alone so the player can steer off lava below.
      if (p1.onGround) {
        brLanded      = true;
        brPlaneFlight = (minions.some(function(b) { return b._brOnPlane; }));
        p1.invincible = 90;
      }
      if (p1.y > BR_DEATH_Y) {
        p1.health = 0;
        brLanded      = true;
        brPlaneFlight = false;
      }
    }
  }

  // Bot drops
  minions.forEach(function(bot) {
    if (!bot._brOnPlane) return;
    bot.x        = brPlaneX - (bot.w || 30) / 2;
    bot.y        = BR_PLANE_Y;
    bot.vx       = 0; bot.vy = 0;
    bot.onGround = false;

    // Drop at the bot's chosen X, or when the plane leaves the map.
    if (brPlaneX >= bot._brDropX || brPlaneX > BR_WORLD_W) {
      bot._brOnPlane = false;
      bot._brDropped = true;
      bot.vy = 6;
    }
  });

  // Plane phase ends when every bot has dropped.
  if (brLanded) {
    var anyOnPlane = minions.some(function(b) { return b._brOnPlane; });
    if (!anyOnPlane) brPlaneFlight = false;
  }
}

// Freefall and landing for bots, every frame
function _brUpdateBotFalls() {
  minions.forEach(function(bot) {
    if (!bot._brBot || !bot._brDropped || bot._brLanded || bot.health <= 0) return;
    bot.vx = 0;
    if (bot.onGround) {
      bot._brLanded  = true;
      bot.invincible = 90;
      // No target yet: the brain picks one within 12 frames. Landing on the player would aim all bots at them.
      bot.target     = null;
    }
    if (bot.y > BR_DEATH_Y) {
      bot.health = 0;
      bot._brLanded = true;
    }
  });
}

// Rifts: paired fast travel. The cooldown stops a pair from being ridden back and forth.
const BR_RIFT_R    = 34;
const BR_RIFT_CD   = 150;   // 2.5s before that fighter can take any rift again

function _brUpdateRifts() {
  if (!brRifts.length) return;
  var all = players.concat(minions);
  for (var i = 0; i < all.length; i++) {
    var f = all[i];
    if (!f || f.health <= 0 || f._brOnPlane || f._brSleep) continue;
    if (f._brRiftCd > 0) { f._brRiftCd--; continue; }
    for (var r = 0; r < brRifts.length; r++) {
      var g = brRifts[r];
      if (Math.abs(f.cx() - g.x) > BR_RIFT_R) continue;
      if (Math.abs(f.cy() - g.y) > BR_RIFT_R + 20) continue;
      var dest = null;
      for (var d = 0; d < brRifts.length; d++) {
        if (brRifts[d].pair === g.pair && brRifts[d] !== g) { dest = brRifts[d]; break; }
      }
      if (!dest) break;
      if (typeof spawnParticles === 'function') spawnParticles(f.cx(), f.cy(), g.color, 16);
      f.x  = dest.x - (f.w || 30) / 2;
      f.y  = dest.y - (f.h || 50);
      f.vx = 0; f.vy = 0;
      f._brRiftCd = BR_RIFT_CD;
      if (typeof spawnParticles === 'function') spawnParticles(dest.x, dest.y, g.color, 20);
      if (!f.isAI && typeof DamageText !== 'undefined')
        damageTexts.push(new DamageText(dest.x, dest.y - 50, dest.label, g.color));
      break;
    }
  }
}

function _brDrawRifts() {
  var t = (typeof frameCount !== 'undefined' ? frameCount : 0) * 0.05;
  var camX = typeof camXCur !== 'undefined' ? camXCur : 0;
  for (var i = 0; i < brRifts.length; i++) {
    var g = brRifts[i];
    if (Math.abs(g.x - camX) > GAME_W * 1.4) continue;
    var pulse = 0.72 + 0.28 * Math.sin(t + i);
    ctx.save();

    // The gate is small in a 12000px world, so a column of light reads from off-screen. That's what you navigate toward.
    var beam = ctx.createLinearGradient(0, g.y - 620, 0, g.y + 60);
    beam.addColorStop(0,    'rgba(0,0,0,0)');
    beam.addColorStop(0.55, _brRiftRGBA(g.color, 0.10 * pulse));
    beam.addColorStop(1,    _brRiftRGBA(g.color, 0.34 * pulse));
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(g.x - 16, g.y - 620);
    ctx.lineTo(g.x + 16, g.y - 620);
    ctx.lineTo(g.x + 52, g.y + 56);
    ctx.lineTo(g.x - 52, g.y + 56);
    ctx.closePath(); ctx.fill();

    ctx.globalAlpha = 0.5 * pulse;
    ctx.fillStyle = g.color;
    ctx.beginPath(); ctx.ellipse(g.x, g.y + 52, 58, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    var grd = ctx.createRadialGradient(g.x, g.y, 4, g.x, g.y, BR_RIFT_R + 46);
    grd.addColorStop(0, _brRiftRGBA(g.color, 0.85));
    grd.addColorStop(0.45, _brRiftRGBA(g.color, 0.30));
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.75 * pulse;
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(g.x, g.y, BR_RIFT_R + 46, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.shadowColor = g.color; ctx.shadowBlur = 22;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(g.x, g.y, BR_RIFT_R * 0.62, BR_RIFT_R * 1.15, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = g.color; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(g.x, g.y, BR_RIFT_R * 0.62, BR_RIFT_R * 1.15, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.34 + 0.14 * Math.sin(t * 2 + i);
    ctx.fillStyle = g.color;
    ctx.beginPath(); ctx.ellipse(g.x, g.y, BR_RIFT_R * 0.62, BR_RIFT_R * 1.15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // Orbiting motes make the rift read as active.
    for (var m = 0; m < 5; m++) {
      var a2 = t * 1.4 + m * (Math.PI * 2 / 5);
      var ox = g.x + Math.cos(a2) * (BR_RIFT_R * 0.95);
      var oy = g.y + Math.sin(a2 * 1.3) * (BR_RIFT_R * 1.25);
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(a2 * 2);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ox, oy, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    var label = 'RIFT — ' + g.label;
    ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    var lw = ctx.measureText(label).width + 18;
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(g.x - lw / 2, g.y - BR_RIFT_R - 36, lw, 19);
    ctx.strokeStyle = g.color; ctx.lineWidth = 1.5;
    ctx.strokeRect(g.x - lw / 2, g.y - BR_RIFT_R - 36, lw, 19);
    ctx.fillStyle = g.color;
    ctx.fillText(label, g.x, g.y - BR_RIFT_R - 22);

    ctx.restore();
  }
}

// '#rrggbb' to 'rgba(r,g,b,a)'. Gradient stops need per-stop alpha, which hex can't carry.
function _brRiftRGBA(hex, a) {
  var h = String(hex || '#ffffff').replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var n = parseInt(h, 16);
  if (!isFinite(n)) return 'rgba(255,255,255,' + a + ')';
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

// Wildlife: neutral and optional. Excluded from placement, brAlive and the win check, so ignoring them is always legal.
function _brSpawnWildlife() {
  BR_LANDMARKS.forEach(function (L) {
    (L.wildlife || []).forEach(function (w) {
      var wx = L.x + w[0];
      var wy = (L.layer === 'under' ? BR_CAVE_FLOOR_Y : BR_GROUND_Y) - 90;
      var ent = null;
      if (w[1] === 'beast' && typeof ForestBeast !== 'undefined') ent = new ForestBeast(wx, wy);
      else if (w[1] === 'yeti' && typeof Yeti !== 'undefined')    ent = new Yeti(wx, wy);
      if (!ent) return;
      ent._brWildlife = true;   // every BR head-count checks this
      ent._brBot      = false;
      ent.lives       = 1;
      minions.push(ent);
    });
  });
}

// Contenders only: wildlife never counts toward placement or the win condition.
function _brIsContender(f) {
  return !!f && f.health > 0 && !f._brWildlife;
}

// Surface hazards: localized lava in the volcano band. The arena-wide lava plane can't do one pool, so BR has its own rects.
// Lava hurts and launches you but never removes the ground. Contact damage goes through dealDamage() with a null attacker, so the env cap applies.
function _brUpdateHazards() {
  if (!brHazards.length) return;
  var all = players.concat(minions);
  for (var h = 0; h < brHazards.length; h++) {
    var hz = brHazards[h];
    if (hz.type !== 'lava') continue;
    for (var i = 0; i < all.length; i++) {
      var f = all[i];
      if (!f || f.health <= 0 || f._brOnPlane) continue;
      // Sleeping bots skip physics, so there's nothing to resolve here.
      if (f._brSleep) continue;
      var fx = f.cx(), fy = f.y + (f.h || 50);
      if (fx < hz.x || fx > hz.x + hz.w) continue;
      if (fy < hz.y || fy > hz.y + hz.h + 20) continue;
      // Lava counts as landing. Otherwise a faller in a pool stays in freefall, the zone never starts, and the bot never gets its AI back. Landing grants i-frames.
      if (f === players[0] && brJumped && !brLanded) {
        brLanded      = true;
        brPlaneFlight = minions.some(function(b) { return b._brOnPlane; });
        f.invincible  = 90;
      } else if (f._brBot && f._brDropped && !f._brLanded) {
        f._brLanded  = true;
        f.invincible = 90;
        f.target     = null;   // see _brUpdateBotFalls
      }
      // Bounce high enough to clear the rim, then grant the ground jump so the escape isn't a few px short.
      if (f.vy > -6) f.vy = -12;
      f._lavaJumpGrace = 12;
      f._brLavaTick = (f._brLavaTick || 0) + 1;
      f._brLavaAt = typeof frameCount !== 'undefined' ? frameCount : 0;   // the volcano counts lava deaths
      if (f._brLavaTick % 18 === 1 && typeof dealDamage === 'function') {
        dealDamage(null, f, 7, 0);
        if (typeof spawnParticles === 'function') spawnParticles(fx, hz.y, '#ff7722', 6);
      }
      break;
    }
  }
}

function _brDrawHazards() {
  var t = (typeof frameCount !== 'undefined' ? frameCount : 0) * 0.05;
  for (var h = 0; h < brHazards.length; h++) {
    var hz = brHazards[h];
    if (hz.type !== 'lava') continue;
    var g = ctx.createLinearGradient(0, hz.y - 6, 0, hz.y + hz.h);
    g.addColorStop(0,   '#ffdd44');
    g.addColorStop(0.3, '#ff7711');
    g.addColorStop(1,   '#8a1a00');
    ctx.fillStyle = g;
    ctx.fillRect(hz.x, hz.y, hz.w, hz.h);
    // Surface churn so a pool never reads as a flat orange rectangle.
    ctx.strokeStyle = 'rgba(255,230,120,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var x = hz.x; x <= hz.x + hz.w; x += 12) {
      var y = hz.y + 3 + Math.sin(x * 0.05 + t) * 3;
      if (x === hz.x) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.30 + 0.12 * Math.sin(t * 1.7);
    ctx.fillStyle = '#ff5500';
    ctx.fillRect(hz.x - 8, hz.y - 34, hz.w + 16, 34);
    ctx.restore();
  }
}

// Void death
function _brCheckVoidDeaths() {
  var all = players.concat(minions);
  all.forEach(function(f) {
    if (!f || f.health <= 0) return;
    if (f.y > BR_DEATH_Y) {
      if (typeof spawnParticles === 'function') spawnParticles(f.cx(), BR_DEATH_Y, f.color, 12);
      f.health = 0;
    }
  });
}

// Zone update: 30s wait, then a 10s linear close, repeated
function _brUpdateZone() {
  if (!brLanded) return;
  if (brZoneState === 'final') {
    _brZoneDamage();
    return;
  }

  if (brZoneState === 'wait') {
    _brUpdateSurge();
    brZoneTimer--;
    if (brZoneTimer <= 0) {
      var ni = brZonePhase + 1;
      if (ni < brZonePhases.length) {
        var _ph = brZonePhases[ni];
        brZoneTargetL = brZonePhases[ni].left;
        brZoneTargetR = brZonePhases[ni].right;
        brZoneTargetT = brZonePhases[ni].top;
        brZoneTargetB = brZonePhases[ni].bottom;
        var _cl       = _ph.close || BR_ZONE_CLOSE_F;
        brZoneSpeedL  = (brZoneTargetL - brZoneLeft)   / _cl;
        brZoneSpeedR  = (brZoneTargetR - brZoneRight)  / _cl;
        brZoneSpeedT  = (brZoneTargetT - brZoneTop)    / _cl;
        brZoneSpeedB  = (brZoneTargetB - brZoneBottom) / _cl;
        brZoneState   = 'close';
        brZoneTimer   = _ph.close || BR_ZONE_CLOSE_F;
        brZoneCloseLen = brZoneTimer;   // the HUD needs the length this phase got
        _brResetSurge();
        if (typeof DamageText !== 'undefined')
          damageTexts.push(new DamageText(GAME_W / 2, 88, 'ZONE CLOSING!', '#ff5522'));
        screenShake = Math.max(screenShake, 8);
      } else {
        brZoneState = 'final';
      }
    }
  } else if (brZoneState === 'close') {
    brZoneLeft   += brZoneSpeedL;
    brZoneRight  += brZoneSpeedR;
    brZoneTop    += brZoneSpeedT;
    brZoneBottom += brZoneSpeedB;
    brZoneTimer--;
    if (brZoneTimer <= 0) {
      brZoneLeft   = brZoneTargetL;
      brZoneRight  = brZoneTargetR;
      brZoneTop    = brZoneTargetT;
      brZoneBottom = brZoneTargetB;
      brZonePhase++;
      var hasNext = (brZonePhase + 1) < brZonePhases.length;
      brZoneState = hasNext ? 'wait' : 'final';
      brZoneTimer = hasNext ? (brZonePhases[brZonePhase + 1].wait || BR_ZONE_WAIT_F) : 0;
      _brResetSurge();
    }
  }

  _brZoneDamage();
}

function _brZoneDamage() {
  brZoneDmgTick++;
  if (brZoneDmgTick >= BR_ZONE_TICK) {
    brZoneDmgTick = 0;
    // Damage grows 1.30x per phase. The late storm is a wall, the early one is survivable: you're expected to dip in for a chest or a corner.
    var phaseMult = Math.pow(1.30, Math.min(brZonePhase, 7));
    players.concat(minions).forEach(function(f) {
      if (!f || f.health <= 0) return;
      var inStorm = f.cx() < brZoneLeft || f.cx() > brZoneRight ||
                   f.cy() < brZoneTop  || f.cy() > brZoneBottom;
      if (inStorm) {
        // Exposure counter: each second in the storm adds 20% damage, capped at 3x.
        f._brStormTicks = (f._brStormTicks || 0) + 1;
        var exposureMult = Math.min(2.5, 1 + (f._brStormTicks - 1) * 0.11);
        var dmg = Math.ceil(BR_ZONE_DAMAGE * phaseMult * exposureMult);
        if (typeof dealDamage === 'function') dealDamage(null, f, dmg, 0);
      } else {
        f._brStormTicks = 0;
      }
    });
  }
}

// Box breaking: proximity attack damages the box
function _brCheckBoxBreaking() {
  var all = players.concat(minions);
  brLootBoxes.forEach(function(box) {
    if (box.opened || box.health <= 0) return;
    if (box._dmgTimer > 0) { box._dmgTimer--; return; }
    for (var i = 0; i < all.length; i++) {
      var f = all[i];
      if (!f || f.health <= 0 || (f._brOnPlane)) continue;
      var dx = Math.abs(f.cx() - box.x);
      var dy = Math.abs((f.y + (f.h || 50)) - box.y);
      if (dx < 44 && dy < 52) {
        box.health   -= 10;
        box._dmgTimer = 18;
        if (typeof spawnParticles === 'function') spawnParticles(box.x, box.y, '#aaccff', 3);
        if (box.health <= 0) {
          box.opened = true; box.anim = 30;
          // Credit goes to whoever landed the last hit, which is `f` here.
          if (f && !f.isAI && !f._brWildlife) {
            brPlayerCrates++;
            if (brPlayerCrates >= 20) unlockAchievement('br_scavenger');
          }
          _brDropGroundItem(box.item, box.x, box.y);
          if (typeof spawnParticles === 'function') spawnParticles(box.x, box.y, box.item.color, 12);
        }
        break;
      }
    }
  });
  brLootBoxes = brLootBoxes.filter(function(b) {
    if (b.opened) { b.anim--; return b.anim > 0; }
    return true;
  });
}

// Ground items
function _brDropGroundItem(item, x, y) {
  brGroundItems.push({ x: x, y: y, vy: -3, item: item, life: 900 }); // ~15s at 60fps
}

function _brUpdateGroundItems() {
  var all = players.concat(minions);
  for (var gi = brGroundItems.length - 1; gi >= 0; gi--) {
    var gi_item = brGroundItems[gi];
    gi_item.life--;
    gi_item.vy += 0.4;
    gi_item.y  += gi_item.vy;
    var plats = currentArena && currentArena.platforms;
    if (plats) {
      for (var pi = 0; pi < plats.length; pi++) {
        var pl = plats[pi];
        if (pl.isFloorDisabled) continue;   // a snapped bridge, a raised door
        if (gi_item.y >= pl.y - 2 && gi_item.y <= pl.y + 14 &&
            gi_item.x >= pl.x && gi_item.x <= pl.x + pl.w && gi_item.vy > 0) {
          gi_item.y  = pl.y - 2;
          gi_item.vy = 0;
          break;
        }
      }
    }
    if (gi_item.life <= 0) { brGroundItems.splice(gi, 1); continue; }

    // Bots pick up on dwell, not contact. A bot must stand over the item for BR_BOT_PICKUP_F frames, so being hit off it costs the grab. One bot channels an item at a time.
    var chanBot = null;
    for (var bi = 0; bi < minions.length; bi++) {
      var bot = minions[bi];
      if (!bot || !bot._brBot || bot.health <= 0 || !bot._brLanded) continue;
      if (Math.abs(bot.cx() - gi_item.x) < 40 && Math.abs((bot.y + (bot.h || 50)) - gi_item.y) < 50) {
        if (!bot._brInv) bot._brInv = [null, null, null, null, null];
        var bIt = gi_item.item;
        // A weapon is picked up only if it beats the one in hand, and is equipped at once. Otherwise a bot could trade a legendary for an uncommon.
        if (bIt.type === 'weapon') {
          if (_brWeaponRank(bIt.weaponKey) <= _brWeaponRank(_brRealWeaponKey(bot))) continue;
        } else if (bot._brInv.indexOf(null) === -1) continue;
        // Prefer whoever already started the channel; otherwise first eligible.
        if (!chanBot || bot === gi_item._pickBot) chanBot = bot;
      }
    }
    if (!chanBot || chanBot.hurtTimer > 0) { gi_item._pickBot = null; gi_item._pickT = 0; continue; }
    if (gi_item._pickBot !== chanBot) { gi_item._pickBot = chanBot; gi_item._pickT = 0; }
    // Settle over the item rather than drifting off it mid-channel.
    if (chanBot._brNavLock) chanBot.vx *= 0.6;
    if (++gi_item._pickT < BR_BOT_PICKUP_F) continue;
    var cIt = gi_item.item;
    if (cIt.type === 'weapon') _brApplyItem(cIt, chanBot);
    else chanBot._brInv[chanBot._brInv.indexOf(null)] = cIt;
    brGroundItems.splice(gi, 1);
  }
}

// Item pickup
function _brPickupHuman(item, fighter) {
  var slot = brInventory.indexOf(null);
  if (slot !== -1) {
    brInventory[slot] = item;
    if (typeof DamageText !== 'undefined')
      damageTexts.push(new DamageText(fighter.cx(), fighter.y - 35, '+' + (item.label || item.type), item.color));
  } else {
    if (typeof DamageText !== 'undefined')
      damageTexts.push(new DamageText(fighter.cx(), fighter.y - 35, 'Bag full!', '#ff8888'));
  }
}

function _brPickupNearbyGroundItem() {
  var p = players.find(function(pl) { return !pl.isAI && pl.health > 0; });
  if (!p) return;
  var slot = brInventory.indexOf(null);
  if (slot === -1) {
    if (typeof DamageText !== 'undefined')
      damageTexts.push(new DamageText(p.cx(), p.y - 35, 'Bag full!', '#ff8888'));
    return;
  }
  for (var i = brGroundItems.length - 1; i >= 0; i--) {
    var g = brGroundItems[i];
    if (Math.abs(p.cx() - g.x) < 52 && Math.abs((p.y + (p.h || 50) * 0.5) - g.y) < 60) {
      brInventory[slot] = g.item;
      if (typeof DamageText !== 'undefined')
        damageTexts.push(new DamageText(p.cx(), p.y - 35, '+' + (g.item.label || g.item.type), g.item.color));
      brGroundItems.splice(i, 1);
      return;
    }
  }
}

// Item use
function _brApplyItem(item, fighter) {
  if (!item || !fighter) return;
  if      (item.type === 'medkit') { fighter.health = Math.min(fighter.maxHealth, fighter.health + (item.heal || 50)); if (typeof spawnParticles === 'function') spawnParticles(fighter.cx(), fighter.cy(), '#44ff88', 12); }
  else if (item.type === 'shield') { fighter.shieldHP = (item.shield || 30); fighter.shielding = true; fighter._brShieldTimer = 300; if (typeof spawnParticles === 'function') spawnParticles(fighter.cx(), fighter.cy(), '#4488ff', 10); }
  else if (item.type === 'super')  { fighter.superMeter = 100; fighter.superReady = true; if (typeof spawnParticles === 'function') spawnParticles(fighter.cx(), fighter.cy(), '#ffdd00', 14); }
  else if (item.type === 'weapon' && item.weaponKey) {
    var w = WEAPONS[item.weaponKey];
    if (w && fighter._brForm) { fighter._brForm.saved.weaponKey = item.weaponKey; fighter._brForm.saved.weapon = w; }
    else if (w) { fighter.weaponKey = item.weaponKey; fighter.weapon = w; fighter.cooldown = 0; }
  }
}

// Pressing 1-5: select the slot; for weapon slots swap with equipped weapon immediately
function selectBRSlot(s) {
  if (!brActive || s < 0 || s > 4) return;
  brActiveSlot = s;
  var item = brInventory[s];
  if (!item || item.type !== 'weapon') return;
  var p = players.find(function(pl) { return !pl.isAI && pl.health > 0; });
  if (!p || !p.weaponKey || !p.weapon) return;
  if (p._brForm) {
    if (typeof DamageText !== 'undefined')
      damageTexts.push(new DamageText(p.cx(), p.y - 35, 'No weapons in creature form', '#ff8888'));
    return;
  }
  var equippedItem = { type: 'weapon', weaponKey: p.weaponKey,
                       label: (p.weapon && p.weapon.name) || p.weaponKey, icon: '⚔', color: '#cc88ff' };
  var newWeapon = WEAPONS[item.weaponKey];
  if (!newWeapon) return;
  brInventory[s]  = equippedItem;
  p.weaponKey     = item.weaponKey;
  p.weapon        = newWeapon;
  p.cooldown      = 0;
  if (typeof spawnParticles === 'function') spawnParticles(p.cx(), p.cy(), '#cc88ff', 6);
  if (typeof DamageText !== 'undefined')
    damageTexts.push(new DamageText(p.cx(), p.y - 35, newWeapon.name || item.weaponKey, '#cc88ff'));
}

// R key: consume/use the selected consumable slot
function consumeBRActiveSlot() {
  if (!brActive || !gameRunning) return;
  var item = brInventory[brActiveSlot];
  if (!item || item.type === 'weapon') return; // weapons swap via selectBRSlot
  var p = players.find(function(pl) { return !pl.isAI && pl.health > 0; });
  if (!p) return;
  _brApplyItem(item, p);
  brInventory[brActiveSlot] = null;
}

// G key: drop active slot item to ground
function dropBRActiveSlot() {
  if (!brActive || !gameRunning) return;
  var item = brInventory[brActiveSlot];
  if (!item) return;
  var p = players.find(function(pl) { return !pl.isAI && pl.health > 0; });
  if (!p) return;
  _brDropGroundItem(item, p.cx(), p.y + (p.h || 50) * 0.4);
  brInventory[brActiveSlot] = null;
  if (typeof DamageText !== 'undefined')
    damageTexts.push(new DamageText(p.cx(), p.y - 35, 'Dropped ' + (item.label || item.type), '#aaaaaa'));
}

// Legacy alias, kept for old callers.
function useBRItem(slotIdx) { selectBRSlot(slotIdx); }

// Bot AI
// Small utility brain: a scored state per bot, re-evaluated on a staggered schedule. It writes a destination or enemy into bot.target
// and leaves the fighting to Fighter.updateAI(). It never touches health, damage or knockback.

// Rank a weapon by loot tier. Unlisted weapons sit just above fists.
function _brWeaponRank(key) {
  if (!key || key === 'combat') return 0;
  if (BR_WEAPON_TIERS.legendary.indexOf(key) !== -1) return 4;
  if (BR_WEAPON_TIERS.epic.indexOf(key)      !== -1) return 3;
  if (BR_WEAPON_TIERS.rare.indexOf(key)      !== -1) return 2;
  if (BR_WEAPON_TIERS.uncommon.indexOf(key)  !== -1) return 1;
  return 1;
}

// Creature forms carry a stand-in weapon. The real one is stashed on the form.
function _brRealWeaponKey(f) {
  return (f && f._brForm) ? f._brForm.saved.weaponKey : (f ? f.weaponKey : null);
}

// How dangerous a fighter is to walk into. Creature forms outclass any weapon, so they count as legendary.
function _brArmedRank(f) {
  if (f && f._brForm) return 4;
  return _brWeaponRank(f ? f.weaponKey : null);
}

// True distance. Manhattan would rate a chest straight down through rock as nearer than one along the floor.
function _brDist(ax, ay, bx, by) {
  var dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// The ring a bot must be inside when the next close ends, and the frames it has to get there. Reacting only to the current ring left bots caught in the storm, so they rotate during the wait.
function _brSafeWindow() {
  var next = brZonePhases[brZonePhase + 1];
  var L = brZoneLeft, R = brZoneRight, frames = 99999;
  if (brZoneState === 'wait' && next) {
    L = next.left; R = next.right;
    frames = brZoneTimer + (next.close || BR_ZONE_CLOSE_F);
  } else if (brZoneState === 'close') {
    L = brZoneTargetL; R = brZoneTargetR;
    frames = brZoneTimer;
  }
  return { left: L, right: R, frames: frames };
}

// A rift is worth it only if it clearly shortens the trip: walk to the gate, then from its exit to the goal. Otherwise bots ping-pong between gates.
function _brBestRift(bot, destX, destY) {
  if (!brRifts.length || (bot._brRiftCd || 0) > 0) return null;
  var direct = _brDist(bot.cx(), bot.cy(), destX, destY);
  var best = null, bestCost = direct * 0.65;
  for (var i = 0; i < brRifts.length; i++) {
    var g = brRifts[i], exit = null;
    for (var d = 0; d < brRifts.length; d++) {
      if (brRifts[d].pair === g.pair && brRifts[d] !== g) { exit = brRifts[d]; break; }
    }
    if (!exit) continue;
    var cost = _brDist(bot.cx(), bot.cy(), g.x, g.y) + _brDist(exit.x, exit.y, destX, destY);
    if (cost < bestCost) { bestCost = cost; best = g; }
  }
  return best;
}

// Whether an awake bot should fight another bot. Same rules as the off-screen war (_brDormantWar). Otherwise bots brawl before anyone loots and the field burns out around the player.
// Humans are always fair game, and anyone hitting you or squaring up at close range gets answered.
function _brBotFightWanted(bot, other, recentlyHurt) {
  // Mid-finisher, both fighters are out of the match until it ends.
  if (other._finWorldLock) return false;
  // The human is capped like bot-vs-bot fights. Otherwise the player is always wanted, and the whole wake area piles on them.
  // Hitting a bot always earns its attention. The count excludes the bot itself, so an extra bot on the player drops off.
  if (!other.isAI && players.indexOf(other) !== -1) {
    if (recentlyHurt && bot._lastAttacker === other) return true;
    return _brOnPlayerCount(other, bot) < BR_MAX_ON_PLAYER;
  }
  // Wildlife is worth starting only when healthy enough to finish it, or when it started on you.
  if (other._brWildlife) {
    return (recentlyHurt && bot._lastAttacker === other) || bot.health / bot.maxHealth >= 0.5;
  }
  if (!other._brBot) return true;
  if (recentlyHurt && bot._lastAttacker === other) return true;
  if (other.target === bot && !other._brNavLock &&
      Math.abs(other.cx() - bot.cx()) < 160 && Math.abs(other.cy() - bot.cy()) < 120) return true;
  if (!_brWarStartFrame || frameCount - _brWarStartFrame < 1200) return false;   // looting phase
  if (_brArmedRank(bot) === 0) return false;
  if (bot.health / bot.maxHealth < 0.5) return false;
  // Pace: at most two bot-vs-bot fights on screen at once. Joining the fight you're already in is always allowed.
  if (bot.target === other) return true;
  return _brAwakeBotFights() < 2;
}

// Awake bot-vs-bot engagements, counted once per pair (cached per frame).
var _brAwakeFightsFrame = -1, _brAwakeFightsN = 0;
function _brAwakeBotFights() {
  if (_brAwakeFightsFrame === frameCount) return _brAwakeFightsN;
  var n = 0;
  for (var i = 0; i < minions.length; i++) {
    var m = minions[i];
    if (!m || !m._brBot || m.health <= 0 || m._brSleep || m._brNavLock) continue;
    var t = m.target;
    if (t && t._brBot && t.health > 0 && !t._brSleep) n += (t.target === m) ? 0.5 : 1;
  }
  _brAwakeFightsFrame = frameCount; _brAwakeFightsN = n;
  return n;
}

// How many other awake bots are currently fighting this (human) fighter.
var BR_MAX_ON_PLAYER = 3;
function _brOnPlayerCount(p, except) {
  var n = 0;
  for (var i = 0; i < minions.length; i++) {
    var m = minions[i];
    if (m === except || !m || m.health <= 0 || m._brSleep || m._brNavLock) continue;
    if (m.target === p) n++;
  }
  return n;
}

// A goal this bot recently failed to reach (see _brNavStep).
function _brGoalBanned(bot, x, y) {
  return (bot._brBanUntil || 0) > frameCount &&
         Math.abs(x - bot._brBanX) < 90 && Math.abs(y - bot._brBanY) < 90;
}

// Point the bot at a world position. _brNavLock stops Fighter.updateAI from discarding the waypoint on its retarget sweep.
function _brGoTo(bot, wx, wy) {
  bot.target     = _brFakeTarget(wx, wy);
  bot._brNavLock = true;
}

// Point the bot at something to fight, and hand target selection back to the normal brain.
function _brEngage(bot, enemy) {
  bot.target     = enemy;
  bot._brNavLock = false;
}

// Inventory: what to drink, when, and what to keep.
function _brBotUseItems(bot, threatD, recentlyHurt) {
  if (!bot._brInv) bot._brInv = [null, null, null, null, null];
  var hpPct = bot.health / bot.maxHealth;
  var calm  = threatD > 620 && !recentlyHurt;

  for (var s = 0; s < 5; s++) {
    var it = bot._brInv[s];
    if (!it) continue;

    // Medkits: top off between fights, not mid-combo. Heal when it's free, or when desperate.
    if (it.type === 'medkit' && hpPct < 0.98) {
      var wasteful = (bot.maxHealth - bot.health) < (it.heal || 50) * 0.55;
      if ((calm && !wasteful) || hpPct < 0.35) {
        _brApplyItem(it, bot); bot._brInv[s] = null; return true;
      }
    }

    // Shields go up before contact. Popped at 50% HP, they've already let the damage through.
    if (it.type === 'shield' && !bot._brShieldTimer &&
        (threatD < 520 || hpPct < 0.55)) {
      _brApplyItem(it, bot); bot._brInv[s] = null; return true;
    }

    // Supers are for a fight that is already happening.
    if (it.type === 'super' && !bot.superReady && threatD < 360) {
      _brApplyItem(it, bot); bot._brInv[s] = null; return true;
    }

    // A weapon in the bag that beats the one in hand gets equipped. Look again every time.
    if (it.type === 'weapon' && it.weaponKey &&
        _brWeaponRank(it.weaponKey) > _brWeaponRank(_brRealWeaponKey(bot))) {
      _brApplyItem(it, bot); bot._brInv[s] = null; return true;
    }
  }
  return false;
}

function _brUpdateBots() {
  if (typeof frameCount === 'undefined') return;
  var _fc  = frameCount;
  var all  = players.concat(minions);
  var win  = _brSafeWindow();
  var ringL = win.left, ringR = win.right;

  for (var bi = 0; bi < minions.length; bi++) {
    var bot = minions[bi];
    if (!bot || !bot._brBot || bot.health <= 0 || !bot._brLanded || bot._brSleep) continue;
    // Each bot re-decides every 12 frames on its own frame. One shared frame is a visible hitch with 99 bots.
    if ((_fc + bi * 7) % 12 !== 0) continue;
    if (!bot._brInv) bot._brInv = [null, null, null, null, null];

    var bx = bot.cx(), by = bot.cy();
    var hpPct = bot.health / bot.maxHealth;
    var armed = _brArmedRank(bot);
    var skill = bot.aiDiff === 'expert' ? 3 : bot.aiDiff === 'hard' ? 2 : bot.aiDiff === 'medium' ? 1 : 0;
    var recentlyHurt = (_fc - (bot._lastAttackerFrame || -9999)) < 150;

    // Nearest hostile, and whether anyone is close enough to matter. Wildlife is lowest priority.
    var foe = null, foeD = Infinity;
    for (var ai = 0; ai < all.length; ai++) {
      var f = all[ai];
      if (f === bot || !f || f.health <= 0 || f._brOnPlane) continue;
      if (typeof areAlliedEntities === 'function' && areAlliedEntities(bot, f)) continue;
      if (!_brBotFightWanted(bot, f, recentlyHurt)) continue;
      var fd = _brDist(bx, by, f.cx(), f.cy());
      if (fd < foeD) { foeD = fd; foe = f; }
    }

    // Nearest-first has every bot duel whoever is beside it. Instead: busy enemies are a free third party, hurt ones are cheap, whoever hits you gets answered, wildlife comes last, and better-armed fighters are avoided.
    var prey = foe, preyD = foeD;
    if (skill >= 1 && foe) {
      var bestCost = Infinity;
      for (var pi = 0; pi < all.length; pi++) {
        var c = all[pi];
        if (c === bot || !c || c.health <= 0 || c._brOnPlane || c._brSleep) continue;
        if (typeof areAlliedEntities === 'function' && areAlliedEntities(bot, c)) continue;
        if (!_brBotFightWanted(bot, c, recentlyHurt)) continue;
        var cd0 = _brDist(bx, by, c.cx(), c.cy());
        if (cd0 > 900) continue;
        var cost = cd0;
        var ct = c.target;
        if (ct && ct !== bot && ct.health > 0 && ct.health < 999999 &&
            _brDist(c.cx(), c.cy(), ct.cx(), ct.cy()) < 300) cost -= 150 + skill * 60;
        cost -= (1 - c.health / (c.maxHealth || 1)) * (100 + skill * 80);
        if (ct === bot && cd0 < 400) cost -= 200;
        // At equal range the player's pull wins, a bot costs its distance, and wildlife costs extra.
        if (c._brWildlife) cost += 260;
        // The human is the threat that matters. Without this, most bots near the player fought each other beside them.
        // Capped: two bots on the player is a fight, five is a pile-on, so past two the pull is only a nudge.
        if (!c.isAI && !c.isRemote && players.indexOf(c) !== -1) {
          cost -= (_brOnPlayerCount(c, bot) < 2) ? 220 + skill * 60 : 60;
        }
        if (_brArmedRank(c) - armed >= 2) cost += 300;
        if (cost < bestCost) { bestCost = cost; prey = c; preyD = cd0; }
      }
    }

    if (_brBotUseItems(bot, foeD, recentlyHurt)) continue;

    // Hurt bots with a medkit step out and drink it when calm (nobody within 620px). Not while locked in melee: turning your back is just dying slower.
    if (skill >= 1 && foe && hpPct < 0.35 && foeD < 620 && foeD > (skill >= 2 ? 140 : 220)) {
      var hasKit = false;
      for (var ki = 0; ki < 5; ki++) if (bot._brInv[ki] && bot._brInv[ki].type === 'medkit') hasKit = true;
      var foeHp = foe.maxHealth ? foe.health / foe.maxHealth : 1;
      if (hasKit && foeHp > hpPct && (skill >= 2 || !recentlyHurt)) {
        var fleeX = bx + (bx < foe.cx() ? -1 : 1) * 800;
        var fpad  = 220 + skill * 70;
        fleeX = Math.max(ringL + fpad, Math.min(ringR - fpad, fleeX));
        _brGoTo(bot, fleeX, by);
        continue;
      }
    }

    // 1. Storm, predictively
    var inStorm  = bx < brZoneLeft || bx > brZoneRight;
    var pad      = 220 + skill * 70;
    var needX    = Math.max(ringL + pad, Math.min(ringR - pad, bx));
    var travel   = Math.abs(needX - bx);
    // Bots don't move at top speed (jumps, knockback, long routes). 45% of nominal is the measured rate over a landmark.
    var reachFrames = travel / (4.6 * 0.45);
    var mustRotate  = reachFrames > win.frames * 0.70;

    if (inStorm || mustRotate) {
      // A fight in your face still counts. Anything further than arm's reach loses to the wall. Weaker bots hold fights longer, which is how a weaker player dies to the storm.
      var clingRange = 150 - skill * 30;
      if (!inStorm && foe && foeD < clingRange) { _brEngage(bot, foe); continue; }

      var gate = (skill >= 1) ? _brBestRift(bot, needX, by) : null;
      if (gate) _brGoTo(bot, gate.x, gate.y);
      else      _brGoTo(bot, needX, by);
      continue;
    }

    // 2. Fight or decline
    // Fists running at an armed enemy is a free kill, which is why the field used to evaporate in minute one. Engage only with a real reason: armed, or already in their face.
    if (foe && foeD < 900) {
      var foeArmed  = _brArmedRank(foe);
      var foeHpPct  = foe.maxHealth ? foe.health / foe.maxHealth : 1;
      var outgunned = (foeArmed - armed) >= 2 || (hpPct < 0.35 && foeHpPct > hpPct + 0.25);
      var committed = foeD < 200 || recentlyHurt;

      if (committed || (!outgunned && (armed > 0 || foeArmed === 0) && foeD < 560)) {
        // Committed means someone is in your face. Answer the closest one unless the chosen target is right there too.
        _brEngage(bot, (committed && preyD > 260) ? foe : prey);
        continue;
      }
      if (prey !== foe && preyD < 560 && (armed > 0 || _brArmedRank(prey) === 0)) {
        _brEngage(bot, prey);
        continue;
      }
      if (outgunned && foeD < 420 && !committed) {
        // Break off back toward the middle of the ring. Away is often the storm.
        var awayX = bx + (bx < foe.cx() ? -1 : 1) * 700;
        awayX = Math.max(ringL + pad, Math.min(ringR - pad, awayX));
        _brGoTo(bot, awayX, by);
        continue;
      }
    }

    // 3. Loot
    // Drive scales with need: unarmed bots cross a landmark for a chest, kitted ones only pick up what they pass.
    var invSpace = bot._brInv.indexOf(null) !== -1;
    var lootUrge = armed === 0 ? 2600 : (invSpace || hpPct < 0.75) ? 1400 : 500;

    var pick = null, pickD = Infinity, pickIsGround = false;
    for (var gi = 0; gi < brGroundItems.length; gi++) {
      var g = brGroundItems[gi];
      var gd = _brDist(bx, by, g.x, g.y);
      // Never walk past a free upgrade lying on the floor.
      var wants = invSpace ||
        (g.item.type === 'weapon' && _brWeaponRank(g.item.weaponKey) > _brWeaponRank(_brRealWeaponKey(bot)));
      if (wants && gd < pickD && gd < lootUrge && !_brGoalBanned(bot, g.x, g.y)) { pickD = gd; pick = g; pickIsGround = true; }
    }
    if (!pick || pickD > 320) {
      for (var ci = 0; ci < brLootBoxes.length; ci++) {
        var box = brLootBoxes[ci];
        if (box.opened || box.health <= 0) continue;
        // Only chests inside the ring the bot is heading for. Looting into the storm was the most common way bots died.
        if (box.x < ringL + 60 || box.x > ringR - 60) continue;
        var cd = _brDist(bx, by, box.x, box.y);
        if (cd < pickD && cd < lootUrge && !_brGoalBanned(bot, box.x, box.y - 10)) { pickD = cd; pick = box; pickIsGround = false; }
      }
    }

    if (pick) {
      _brGoTo(bot, pick.x, pick.y - (pickIsGround ? 0 : 10));
      continue;
    }

    // 4. Rotate
    // Nothing to loot or fight: move toward the ring, but to a landmark inside it. Otherwise the field stacks on one pixel.
    if (prey && preyD < 900) { _brEngage(bot, prey); continue; }
    if (foe && foeD < 1800) { _brEngage(bot, foe); continue; }

    if (!bot._brRoamX || Math.abs(bx - bot._brRoamX) < 240 || _brGoalBanned(bot, bot._brRoamX, by) ||
        bot._brRoamX < ringL + pad || bot._brRoamX > ringR - pad) {
      var options = [];
      for (var li = 0; li < BR_LANDMARKS.length; li++) {
        var L = BR_LANDMARKS[li];
        var lcx = L.x + L.w / 2;
        if (lcx < ringL + pad || lcx > ringR - pad) continue;
        options.push(lcx);
      }
      bot._brRoamX = options.length
        ? options[Math.floor(Math.random() * options.length)]
        : (ringL + ringR) / 2;
    }
    _brGoTo(bot, bot._brRoamX, by);
  }
}

// Travel: a nav-locked bot is going somewhere, so BR drives it directly. The duelling brain's chase assumes a 900px arena with one opponent.
// Routes go through the platform graph, so bots use the real terrain.
function _brNavStep(bot) {
  var t = bot.target;
  if (!t) { bot._brNavLock = false; return; }
  var tx = t.cx(), ty = t.cy();
  var spd = (bot.aiDiff === 'easy' ? 3.6 : bot.aiDiff === 'medium' ? 4.5 :
             bot.aiDiff === 'hard' ? 5.2 : 5.6);

  // Drop goals that aren't getting closer (~2s without progress). Otherwise an unreachable goal gets reissued every decision. See _brGoalBanned.
  var gd = Math.abs(tx - bot.cx()) + Math.abs(ty - bot.cy());
  if (bot._brNavGoalX === undefined || Math.abs(bot._brNavGoalX - tx) > 60 || Math.abs(bot._brNavGoalY - ty) > 60) {
    bot._brNavGoalX = tx; bot._brNavGoalY = ty; bot._brNavBest = gd; bot._brNavSince = frameCount;
  } else if (gd < bot._brNavBest - 20) {
    bot._brNavBest = gd; bot._brNavSince = frameCount;
  } else if (gd > 80 && frameCount - bot._brNavSince > 120) {
    bot._brBanX = tx; bot._brBanY = ty; bot._brBanUntil = frameCount + 600;
    bot._brNavGoalX = undefined;
    bot._brNavLock = false;
    return;
  }

  var wpX = tx, wpY = ty, wantJump = false;
  var wp = null;
  if (typeof pfGetNextWaypoint === 'function') {
    wp = pfGetNextWaypoint(bot, tx, ty);
    if (wp) {
      wpX = wp.x; wpY = wp.y;
      wantJump = (wp.action === 'jump');
    }
  }
  // No route, on a ledge with the goal below: step off the nearer edge. Walking straight at the goal from above just stands still.
  if (!wp && bot.onGround && ty > bot.y + bot.h + 40 && Math.abs(tx - bot.cx()) < 160 &&
      currentArena && currentArena.platforms) {
    var _pls = currentArena.platforms, _feet = bot.y + bot.h;
    for (var _pi = 0; _pi < _pls.length; _pi++) {
      var _pl = _pls[_pi];
      if (bot.cx() >= _pl.x && bot.cx() <= _pl.x + _pl.w && Math.abs(_feet - _pl.y) < 8) {
        if (_pl.isFloor) break;   // the world floor has no "off"
        wpX = (tx - _pl.x < _pl.x + _pl.w - tx) ? _pl.x - 30 : _pl.x + _pl.w + 30;
        break;
      }
    }
  }

  // A structure route can ask for a running jump (the volcano's crater is wider than a slow bot's walking jump).
  if (wp && wp.spd) spd = Math.max(spd, wp.spd);
  var dx  = wpX - bot.cx();
  var dir = dx > 0 ? 1 : -1;
  if (Math.abs(dx) > 14) {
    bot.vx = dir * spd;
    bot.facing = dir;
  } else {
    bot.vx *= 0.6;
  }

  if (bot.onGround) {
    // Graph says jump, the waypoint is above us, or we're pressed against something that isn't moving. Same instruction.
    // Office waypoints (wp.brs) skip the unstick hop: inside, it clears the walls; beside it, it lands on the fire escape.
    var blocked = !(wp && wp.brs)
                  && Math.abs(bot.x - (bot._brNavLastX !== undefined ? bot._brNavLastX : bot.x)) < 1.2
                  && Math.abs(dx) > 30;
    if (wantJump || wpY < bot.y - 40 || blocked) bot.vy = -((wantJump && wp.vy) || 20);
  } else if (bot.canDoubleJump && bot.vy > 0 && !(wp && wp.brs) && (wantJump || wpY < bot.y - 30)) {
    // Office climbs (wp.brs) are aimed single jumps; a double jump carries the bot over the roof.
    bot.vy = -17; bot.canDoubleJump = false;
  }
  bot._brNavLastX = bot.x;
}

// Player feats: match-scoped Battle Royale achievements. They read existing state (dealDamage attribution, the crate loop, zones) and change nothing.
// Called by dealDamage() on a killing blow. Storm and lava kills have no attacker and count for nobody.
// A finishing tick with no attacker credits whoever last hurt them within BR_KILL_CREDIT_F.
var BR_KILL_CREDIT_F = 300;
function _brCreditElimination(attacker, target) {
  if (!brActive || !target || target._brKillCounted) return;
  if ((!attacker || attacker === target) && target._lastAttacker &&
      typeof frameCount !== 'undefined' &&
      frameCount - (target._lastAttackerFrame || -99999) <= BR_KILL_CREDIT_F) {
    attacker = target._lastAttacker;
  }
  // Killing a beast or yeti grants its form. Only flagged here: the change happens at the next BR update, never inside dealDamage().
  if (target._brWildlife) {
    // A corpse keeps taking hits until pruned. Without a guard each hit would re-grant the form.
    target._brKillCounted = true;
    if (attacker && attacker !== target && attacker.health > 0 && !attacker._brWildlife &&
        (attacker._brBot || players.indexOf(attacker) !== -1)) {
      attacker._brFormPending = target.isYeti ? 'yeti' : 'beast';
    }
    return;
  }
  target._brKillCounted = true;
  _brDropLoadout(target);
  if (typeof brStructuresNoteDeath === 'function') brStructuresNoteDeath(target);   // lava deaths heat the volcano
  // Only the victim sees a finisher, so the killer takes its heal on the kill. A finisher kill paid it when it started.
  if (attacker && attacker !== target && !attacker._brWildlife && !target._brFinKill &&
      typeof _finPayHeal === 'function') {
    _finPayHeal(attacker, !attacker.isAI && !attacker.isRemote);
  }
  if (!attacker || attacker.isAI || attacker.isBoss) return;
  brPlayerKills++;
  if (typeof unlockAchievement !== 'function') return;
  if (brPlayerKills >= 10) unlockAchievement('br_kills_10');
  if (brPlayerKills >= 25) unlockAchievement('br_kills_25');
  if (brPlayerKills >= 35) unlockAchievement('br_kills_50');
}

function _brTrackPlayerFeats() {
  var p = players.find(function (pl) { return pl && !pl.isAI; });
  if (!p) return;

  // Strict containment. brLandmarkAt() falls back to the nearest band, which would credit the whole sky to Cloud Kingdom.
  if (p.health > 0 && brLanded && frameCount % 15 === 0) {
    if (!brVisitedZones) brVisitedZones = new Set();
    var layer = brLayerAt(p.cy()), px = p.cx();
    for (var li = 0; li < BR_LANDMARKS.length; li++) {
      var L = BR_LANDMARKS[li];
      if (L.layer !== layer) continue;
      if (px < L.x || px >= L.x + L.w) continue;
      brVisitedZones.add(L.name);
      break;
    }
    if (brVisitedZones.size >= BR_LANDMARKS.length) unlockAchievement('br_cartographer');
  }
}

function _brFakeTarget(wx, wy) {
  return { x: wx - 5, y: wy, w: 10, h: 50, health: 999999, maxHealth: 999999, invincible: 9999,
           isAI: false, isBoss: false, playerNum: -1, lives: 999, vx: 0, vy: 0, onGround: true,
           cx: function() { return wx; }, cy: function() { return wy - 25; } };
}

// Win condition
function _brCheckWin() {
  var all = players.concat(minions);
  brAlive = all.filter(_brIsContender).length;

  // Safety net: if every survivor but maybe P1 is asleep, wake one sleeper a second so the match can't stall.
  if (brAlive > 1 && brLanded && typeof frameCount !== 'undefined' && frameCount % 60 === 0) {
    var awakeCount = all.filter(function(f) { return _brIsContender(f) && !f._brSleep; }).length;
    if (awakeCount <= 1) {
      for (var _wi = 0; _wi < minions.length; _wi++) {
        if (minions[_wi] && minions[_wi].health > 0 && minions[_wi]._brSleep) {
          minions[_wi]._brSleep = false;
          break;  // one per second, to avoid a frame spike
        }
      }
    }
  }

  if (brAlive <= 1 && !brWinner && gameRunning) {
    brWinner = all.find(_brIsContender) || null;
    var msg;
    if (brStoryBearers) {
      // The chapter's point is the count, not a placing: he is the only one of ninety-five still standing.
      msg = (brWinner && !brWinner.isAI) ? 'THE 95TH  —  LAST STANDING'
                                         : (brWinner ? (brWinner.name || 'A BEARER') + '  REMAINS' : 'NOTHING REMAINS');
    } else {
      msg = brWinner ? '#1  ' + (brWinner.name || 'P1') + '  WINS!' : 'DRAW!';
    }
    if (typeof DamageText !== 'undefined') damageTexts.push(new DamageText(GAME_W / 2, GAME_H / 2 - 50, msg, '#ffdd00'));
    if (brWinner && !brWinner.isAI && typeof unlockAchievement === 'function') unlockAchievement('br_victory');
    screenShake = Math.max(screenShake, 20);
    if (typeof endGame === 'function') setTimeout(endGame, 3500);
  }
}

// Spectate
function _brEnterSpectate(deadPlayer) {
  brSpectating     = true;
  brElimBanner     = 300; // 5 seconds
  brSpectateList   = minions.filter(_brIsContender);
  // Pick closest surviving fighter to where P1 died
  var lastX = deadPlayer ? deadPlayer.cx() : BR_WORLD_W / 2;
  var lastY = deadPlayer ? deadPlayer.cy() : BR_WORLD_H / 2;
  if (brSpectateList.length > 0) {
    var best = 0, bestD = Infinity;
    brSpectateList.forEach(function(f, i) {
      var d = Math.abs(f.cx() - lastX) + Math.abs(f.cy() - lastY);
      if (d < bestD) { bestD = d; best = i; }
    });
    brSpectateIdx    = best;
    brSpectateTarget = brSpectateList[brSpectateIdx];
  }
}

function _brCycleSpectate(dir) {
  if (!brSpectating || brSpectateList.length === 0) return;
  brSpectateIdx = ((brSpectateIdx + dir) + brSpectateList.length) % brSpectateList.length;
  brSpectateTarget = brSpectateList[brSpectateIdx];
}

// Restart button, shown while the player is out and spectating, so a dead run doesn't have to be watched out.
function _brHideRestartBtn() {
  var b = document.getElementById('brRestartBtn');
  if (b) b.style.display = 'none';
}

function _brRestart() {
  _brHideRestartBtn();
  if (!gameRunning || gameMode !== 'battleroyale') return;
  if (typeof ReplaySystem !== 'undefined') ReplaySystem.stopRecording();
  if (typeof cgSdk !== 'undefined') cgSdk.gameplayStop();
  // Stop the loop first, then start the new match a tick later so the two loops never overlap.
  gameRunning = false;
  setTimeout(function() { if (typeof startGame === 'function') startGame(); }, 60);
}

function _brSyncRestartBtn() {
  var show = gameRunning && brSpectating && !brWinner && !brStoryBearers;
  var b = document.getElementById('brRestartBtn');
  if (!show) { if (b) b.style.display = 'none'; return; }
  var wrap = document.getElementById('gameWrapper');
  if (!b) {
    if (!wrap) return;
    b = document.createElement('button');
    b.id = 'brRestartBtn';
    b.className = 'btn btn-start';
    b.textContent = 'Restart';
    b.style.position = 'absolute';
    b.style.transform = 'translateX(-50%)';
    b.style.zIndex = '50';
    b.addEventListener('click', function(e) { e.stopPropagation(); _brRestart(); });
    wrap.appendChild(b);
  }
  // Just below the ELIMINATED banner, tracking the (letterboxed) canvas.
  var r = canvas.getBoundingClientRect();
  b.style.left    = (r.left + r.width / 2) + 'px';
  b.style.top     = (r.top + r.height * ((GAME_H / 2 + 36) / GAME_H)) + 'px';
  b.style.display = 'block';
}

function _brUpdateSpectate() {
  _brSyncRestartBtn();
  if (!brSpectating) return;
  if (brElimBanner > 0) brElimBanner--;
  // Drop fighters who have died
  brSpectateList = minions.filter(_brIsContender);
  if (brSpectateList.length === 0) { brSpectateTarget = null; return; }
  // If current target died, auto-switch to next
  if (!brSpectateTarget || brSpectateTarget.health <= 0) {
    brSpectateIdx    = Math.min(brSpectateIdx, brSpectateList.length - 1);
    brSpectateTarget = brSpectateList[brSpectateIdx];
  }
}

// Bot sleep culling: freeze bots far from the camera each frame
// True only when the local human threw or ate this hit. dealDamage() uses it to scope world-wide impact effects (see smb-combat.js).
function _brIsLocalPlayerHit(attacker, target) {
  if (!brActive) return true;
  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    if (!p || p.isAI || p.isRemote) continue;
    if (attacker === p || target === p) return true;
  }
  return false;
}

// Hit sounds are scoped to what the camera can see, plus the local player's own hits. Otherwise 12000px of fights play at full volume.
function _brIsAudibleHit(attacker, target) {
  if (!brActive || _brIsLocalPlayerHit(attacker, target)) return true;
  if (!target || typeof target.cx !== 'function') return false;
  var zoom  = (typeof camZoomCur !== 'undefined' && camZoomCur > 0) ? camZoomCur : 1;
  var halfW = GAME_W / (2 * zoom) + 120;
  var halfH = GAME_H / (2 * zoom) + 120;
  return Math.abs(target.cx() - camXCur) < halfW && Math.abs(target.cy() - camYCur) < halfH;
}

// Dormant bots: the main loop skips their update(), but timers must still tick or i-frames freeze, leaving the bot immune.
// Physics is frozen by the cull. Timers tick here, so a dormant bot is still mortal.
// Ground height under a world X for the cheap fall integrator. Two levels: the surface crust and the cavern floor.
function _brGroundYAt(x) {
  // The volcano's slopes stand above the crust (smb-br-structures.js).
  if (typeof brStructureGroundY === 'function') { var _sy = brStructureGroundY(x); if (_sy !== null) return _sy; }
    // Sinkholes and the vent land on the cavern floor. Everything else lands on the surface crust.
  for (var i = 0; i < BR_LANDMARKS.length; i++) {
    var L = BR_LANDMARKS[i];
    if (L.layer !== 'surface' || !L.holes) continue;
    for (var h = 0; h < L.holes.length; h++) {
      if (x > L.x + L.holes[h][0] && x < L.x + L.holes[h][1]) return BR_CAVE_FLOOR_Y;
    }
  }
  return BR_GROUND_Y;
}

function _brDormantTick(bot) {
    // Cheap fall integrator for a sleeping bot that hasn't landed. Full physics for 99 drops made every match open with a stutter.
  if (bot._brOnPlane) return;
  if (bot._brDropped && !bot._brLanded) {
    bot.vy = Math.min((bot.vy || 0) + 0.55, 16);
    bot.y += bot.vy;
    var gy = _brGroundYAt(bot.cx());
    if (bot.y + bot.h >= gy) {
      bot.y = gy - bot.h;
      bot.vy = 0;
      bot.onGround = true;
      bot._brLanded = true;
      bot.invincible = 90;
    }
  }
  // Off-screen life. Sleeping bots used to stand where they landed, so the storm deleted most of the field instead of eliminating it.
  // This is bookkeeping, not AI: walk somewhere useful and open what you pass. The chests are real, so the map really is being emptied.
  var _live = bot._brLanded && brLanded && typeof frameCount !== 'undefined';
  var _salt = (bot._brTickSalt || 0);

  // Re-pick a destination every ~2.5s: the ring first, then the nearest crate still worth walking to.
  if (_live && (frameCount + _salt * 11) % 150 === 0) {
    var _w    = _brSafeWindow();
    var _pad  = 320;
    // Per-bot offset, or dormant bots in a band all walk to one pixel and arrive as one stack.
    var _off  = ((_salt % 11) - 5) * 60;
    var _ring = Math.max(_w.left + _pad, Math.min(_w.right - _pad, bot.cx() + _off));
    bot._brDormGoal = _ring;
    if (!bot._brInv) bot._brInv = [null, null, null, null, null];
    // A bot with a full bag and a good weapon shouldn't empty the map. Without this the off-screen field took all 200 chests in twenty seconds.
    var _wants = bot._brInv.indexOf(null) !== -1 || _brWeaponRank(_brRealWeaponKey(bot)) < 3;
    if (_wants && Math.abs(_ring - bot.cx()) < 400
        && bot.cx() > brZoneLeft + 500 && bot.cx() < brZoneRight - 500) {
      // Comfortably inside the ring, so go shopping. 2200px is about as far as a bot walks between ring moves.
      var _bd = Infinity, _bx3 = null;
      for (var _li = 0; _li < brLootBoxes.length; _li++) {
        var _box = brLootBoxes[_li];
        if (_box.opened || _box.health <= 0 || _box._vault) continue;   // the temple vault is sealed: no off-screen looting
        if (_box.x < _w.left + 60 || _box.x > _w.right - 60) continue;
        var _d3 = Math.abs(_box.x - bot.cx());
        if (_d3 < _bd && _d3 < 2200) { _bd = _d3; _bx3 = _box; }
      }
      if (_bx3) bot._brDormGoal = _bx3.x;
    }
    // Armed and healthy: look for a fight instead (see _brDormantWar). Not while fleeing, or across the storm line.
    if ((bot._brFleeUntil || 0) <= frameCount) {
      var _prey = _brDormantHuntTarget(bot, _w);
      if (_prey) bot._brDormGoal = _prey.cx();
    }
  }

  // Walk. Sky bots stay put: their floor is a cloud, and the cheap integrator would drop them off its edge. Skirmishing bots stand and fight.
  if (_live && !bot._brFoe && bot._brDormGoal !== undefined && brLayerAt(bot.cy()) !== 'sky') {
    var _dx = bot._brDormGoal - bot.cx();
    // Pace: a stroll is right for shopping, and fatally slow for a ring moving ~3.6px/frame. Anything at or past the edge runs.
    var _urgent = bot.cx() < brZoneLeft + 500 || bot.cx() > brZoneRight - 500;
    var _pace   = _urgent ? 5.0 : 2.4;
    if (Math.abs(_dx) > 30) {
      bot.x += Math.sign(_dx) * Math.min(Math.abs(_dx), _pace);
      // Keep feet on the surface that owns this column, so a bot over a sinkhole doesn't stand in mid-air.
      var _gy2 = _brGroundYAt(bot.cx());
      if (bot.y + bot.h > _gy2) { bot.y = _gy2 - bot.h; bot.vy = 0; bot.onGround = true; }
    }
  }

  // Open anything underfoot.
  if (_live && (frameCount + _salt * 13) % 150 === 0) {
    if (!bot._brInv) bot._brInv = [null, null, null, null, null];
    var _hasSlot = bot._brInv.indexOf(null) !== -1;
    for (var _lj = 0; _lj < brLootBoxes.length; _lj++) {
      var _bx2 = brLootBoxes[_lj];
      if (_bx2.opened || _bx2.health <= 0) continue;
      if (Math.abs(_bx2.x - bot.cx()) > 200 || Math.abs(_bx2.y - bot.cy()) > 220) continue;
      // Only consume a crate this bot would benefit from. Leftovers stay for the next walker, including the player.
      if (_bx2.item.type === 'weapon') {
        if (_brWeaponRank(_bx2.item.weaponKey) <= _brWeaponRank(_brRealWeaponKey(bot))) continue;
        _bx2.opened = true; _bx2.anim = 30;
        _brApplyItem(_bx2.item, bot);
      } else {
        if (!_hasSlot) continue;
        _bx2.opened = true; _bx2.anim = 30;
        bot._brInv[bot._brInv.indexOf(null)] = _bx2.item;
      }
      break;
    }
  }
  if (bot.invincible > 0)  bot.invincible--;
  if (bot.hurtTimer  > 0)  bot.hurtTimer--;
  if (bot.attackTimer  > 0) bot.attackTimer--;
  if (bot.attackEndlag > 0) bot.attackEndlag--;
  if (bot._brShieldTimer > 0 && --bot._brShieldTimer <= 0) {
    bot.shielding = false; bot.shieldHP = 0;
  }
}

// The unseen war: off-screen bots fight each other
// Sleeping bots resolve fights abstractly. Two that meet lock into a skirmish and trade damage each war tick, at a rate set by weapon tier and skill.
// It uses the attacker-less dealDamage() path the storm uses, so the player gets no hit-stop, finisher, sound or kill credit.
// The loser may break off when beaten, and the winner takes its drop. The real brain takes over when either wakes.
const BR_WAR_TICK   = 30;    // frames between skirmish exchanges
const BR_WAR_MEET_X = 260;   // how close two sleepers must be to start fighting
const BR_WAR_MEET_Y = 160;
// Damage per second by weapon rank (fists to legendary). Close to what the real brain does with the same kit.
const BR_WAR_DPS    = [5.5, 7, 8.5, 10, 12];
const BR_WAR_SKILL  = { easy: 0.8, medium: 1.0, hard: 1.15, expert: 1.3 };

function _brWarSkill(bot) {
  return bot.aiDiff === 'expert' ? 3 : bot.aiDiff === 'hard' ? 2 : bot.aiDiff === 'medium' ? 1 : 0;
}

// Chance per war tick that a sleeper in reach starts a fight. Fighting anyone in reach paired the whole field within seconds. Unarmed bots mostly look for a weapon first.
function _brWarAggro(bot) {
  var rank = _brArmedRank(bot);
  if (rank === 0) return 0.015;
  return 0.02 + rank * 0.015 + _brWarSkill(bot) * 0.012;
}

function _brWarUnlink(bot) {
  var foe = bot._brFoe;
  bot._brFoe = null;
  if (foe && foe._brFoe === bot) foe._brFoe = null;
}

var _brWarStartFrame = 0;   // first war tick after the player lands (reset per match)

function _brDormantWar() {
  if (!brLanded || typeof frameCount === 'undefined' || frameCount % BR_WAR_TICK !== 0) return;
  var sleepers = [];
  for (var i = 0; i < minions.length; i++) {
    var b = minions[i];
    if (!b || !b._brBot || b.health <= 0 || !b._brLanded) continue;
    // Awake bots belong to the real brain; drop any abstract fight they were in.
    if (!b._brSleep) { if (b._brFoe) _brWarUnlink(b); continue; }
    sleepers.push(b);
  }

  // Exchanges
  for (var s = 0; s < sleepers.length; s++) {
    var a = sleepers[s], foe = a._brFoe;
    if (!foe) continue;
    if (foe.health <= 0 || !foe._brSleep ||
        Math.abs(foe.cx() - a.cx()) > BR_WAR_MEET_X * 1.6 || Math.abs(foe.cy() - a.cy()) > 300) {
      _brWarUnlink(a); continue;
    }
    // Each side hits on its own turn, so a pair exchanges once per tick from each direction, whatever the array order.
    var dps = BR_WAR_DPS[_brArmedRank(a)] * (BR_WAR_SKILL[a.aiDiff] || 1);
    var dmg = Math.max(1, Math.round(dps * (BR_WAR_TICK / 60) * (0.6 + Math.random() * 0.8)));
    if (typeof dealDamage === 'function') dealDamage(null, foe, dmg, 0);
    if (foe.health <= 0) {
      // The exchange has no attacker, so the kill heal is paid here. Awake kills go through _brCreditElimination.
      if (a.health > 0 && typeof FIN_HEAL !== 'undefined') a.health = Math.min(a.maxHealth, a.health + FIN_HEAL);
      // Walk over the victim's drop; ground-item pickup does the rest.
      a._brDormGoal = foe.cx();
      _brWarUnlink(a);
      continue;
    }
    // Break off when clearly beaten. Easy bots fight to the death, which is how
    // a weak player dies too.
    var hp = a.health / a.maxHealth, fhp = foe.health / foe.maxHealth;
    if (_brWarSkill(a) >= 1 && hp < 0.3 && fhp > hp + 0.2 && Math.random() < 0.35) {
      a._brDormGoal = a.cx() + (a.cx() < foe.cx() ? -900 : 900);
      a._brFleeUntil = frameCount + 600;
      _brWarUnlink(a);
    }
  }

  // Recovery: a sleeper drinks, arms and shields like an awake bot between fights.
  for (var r = 0; r < sleepers.length; r++) {
    var rb = sleepers[r];
    if (!rb._brFoe && rb.health > 0 && (frameCount + (rb._brTickSalt || 0) * 5) % 120 === 0) {
      _brBotUseItems(rb, 9999, false);
    }
  }

  // New meetings. The first ~20s on the ground is for looting, as it is for the player.
  if (!_brWarStartFrame) _brWarStartFrame = frameCount;
  if (frameCount - _brWarStartFrame < 1200) return;
  // Concurrency budget: one fight per ~18 living fighters. The number of fights running at once sets the pace.
  // The field must still be thick when the player arrives in the late match.
  var active = 0;
  for (var c = 0; c < sleepers.length; c++) if (sleepers[c]._brFoe) active++;
  var budget = Math.ceil(brAlive / 18) * 2 - active;   // counted in fighters, two per fight
  if (budget <= 0) return;
  sleepers.sort(function (p, q) { return p.x - q.x; });
  for (var m = 0; m < sleepers.length && budget > 0; m++) {
    var p = sleepers[m];
    if (p._brFoe || p.health <= 0 || (p._brFleeUntil || 0) > frameCount) continue;
    for (var n = m + 1; n < sleepers.length; n++) {
      var q = sleepers[n];
      if (q.x - p.x > BR_WAR_MEET_X) break;
      if (q._brFoe || q.health <= 0 || (q._brFleeUntil || 0) > frameCount) continue;
      if (Math.abs(q.cy() - p.cy()) > BR_WAR_MEET_Y) continue;
      if (typeof areAlliedEntities === 'function' && areAlliedEntities(p, q)) continue;
      // A fight needs someone who wants it. A bot under half health doesn't pick fights, it looks for a medkit. Without this, winners were paired straight into another fight.
      var ap = p.health / p.maxHealth >= 0.5 ? _brWarAggro(p) : 0;
      var aq = q.health / q.maxHealth >= 0.5 ? _brWarAggro(q) : 0;
      if (Math.random() > Math.max(ap, aq)) continue;
      p._brFoe = q; q._brFoe = p;
      budget -= 2;
      break;
    }
  }
}

// A sleeper worth hunting: the nearest non-allied sleeper in the ring that this bot expects to beat. Only armed, healthy, competent bots hunt.
function _brDormantHuntTarget(bot, win) {
  var skill = _brWarSkill(bot), rank = _brArmedRank(bot);
  var hp = bot.health / bot.maxHealth;
  if (hp < 0.6 || (rank + skill) < 3) return null;
  var best = null, bestD = 1300;
  for (var i = 0; i < minions.length; i++) {
    var o = minions[i];
    if (!o || o === bot || !o._brBot || o.health <= 0 || !o._brLanded || !o._brSleep) continue;
    if (o.cx() < win.left + 200 || o.cx() > win.right - 200) continue;
    if (Math.abs(o.cy() - bot.cy()) > 300) continue;
    if (typeof areAlliedEntities === 'function' && areAlliedEntities(bot, o)) continue;
    // Pick fights you win: a clearly better-armed target is left alone.
    if (_brArmedRank(o) > rank + 1) continue;
    var d = Math.abs(o.cx() - bot.cx());
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

// Dead fighters drop their weapon and bag on the floor, so kills have loot.
function _brRarityOfWeapon(key) {
  var tiers = ['legendary', 'epic', 'rare', 'uncommon'];
  for (var t = 0; t < tiers.length; t++) {
    if (BR_WEAPON_TIERS[tiers[t]].indexOf(key) !== -1) {
      for (var r = 0; r < BR_RARITY.length; r++) if (BR_RARITY[r].key === tiers[t]) return BR_RARITY[r];
    }
  }
  return BR_RARITY[0];
}

function _brDropLoadout(f) {
  if (!f || !f._brBot || f._brLoadoutDropped) return;
  f._brLoadoutDropped = true;
  var drops = [];
  var _dk = _brRealWeaponKey(f);
  if (_dk && _dk !== 'combat' && WEAPONS[_dk]) {
    var rar = _brRarityOfWeapon(_dk);
    drops.push({ type: 'weapon', weaponKey: _dk, icon: '⚔',
                 label: WEAPONS[_dk].name || _dk,
                 color: rar.color, rarity: rar.key, rarityLabel: rar.label });
  }
  if (f._brInv) for (var i = 0; i < f._brInv.length; i++) if (f._brInv[i]) drops.push(f._brInv[i]);
  var gy = f.y + (f.h || 50) * 0.4;
  for (var d = 0; d < drops.length; d++) {
    _brDropGroundItem(drops[d], f.cx() + (d - (drops.length - 1) / 2) * 22, gy);
  }
  f._brInv = [null, null, null, null, null];
}

function _brCullBots() {
  // Endgame (10 or fewer alive): wake everyone, or frozen bots can't be killed.
  var endgame = brAlive <= 10;
  var camX = typeof camXCur !== 'undefined' ? camXCur : BR_WORLD_W / 2;
  var camY = typeof camYCur !== 'undefined' ? camYCur : BR_WORLD_H / 2;
  minions.forEach(function(bot) {
    if (bot._brWildlife) { bot._brSleep = Math.abs(bot.cx() - camX) > 2000; return; }
    if (!bot._brBot || bot.health <= 0) return;
    // On the plane, _brUpdatePlane sets position directly, so full physics is wasted. The plane is also where the camera is, so nothing was culled during the drop.
    if (bot._brOnPlane) { bot._brSleep = true; return; }
    // Falling bots sleep like anything else. _brDormantTick integrates their fall cheaply.
    if (bot._brDropped && !bot._brLanded && Math.abs(bot.cx() - camX) < 1400) {
      bot._brSleep = false; return;
    }
    if (endgame) { bot._brSleep = false; return; }
    var dx = Math.abs(bot.cx() - camX);
    var dy = Math.abs(bot.cy() - camY);
    // Only sleep bots safely inside the zone. Storm damage runs in _brZoneDamage regardless of sleep.
    // Awake = what the player can see (900x520 at the BR camera's zoom) plus ~2s of approach. Bigger, unseen fights burned the field out around the player.
    bot._brSleep = (dx > 1100 || dy > 650);
    if (bot._brSleep) _brDormantTick(bot);
  });
}

// Main update
function updateBattleRoyale() {
  if (!brActive || !gameRunning) return;
  _brUpdatePlane();
  _brUpdateBotFalls();
  _brCheckVoidDeaths();
  _brUpdateHazards();
  _brUpdateRifts();
  _brCullBots();
  _brDormantWar();
  _brUpdateZone();
  _brCheckBoxBreaking();
  _brUpdateGroundItems();
  if (typeof brUpdateForms === 'function') brUpdateForms();
  if (typeof brUpdateStructures === 'function') brUpdateStructures();
  _brUpdateBots();
  _brUpdateSpectate();
  _brTrackPlayerFeats();
  _brCheckWin();
}

// Landmark names, painted in the sky above each named band. Without them the world reads as scenery and nobody can plan a route.
function _brDrawLandmarkSigns() {
  ctx.save();
  ctx.textAlign = 'center';
  BR_LANDMARKS.forEach(function (L) {
    if (L.danger === 0) return;                    // plains/dunes are connective tissue
    // Each sign lives in its own layer, or a sky name lands on top of the surface band directly beneath it.
    var cx = L.x + L.w / 2;
    var y  = L.signY ? L.signY
           : L.layer === 'sky'   ? 120
           : L.layer === 'under' ? BR_GROUND_Y + BR_CRUST_H + 120
                                 : BR_SKY_FLOOR_Y + 260;
    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fillText(L.name.toUpperCase(), cx, y);
    if (L.danger >= 3) {
      ctx.font = 'bold 15px Arial';
      ctx.fillStyle = 'rgba(255,120,60,0.30)';
      ctx.fillText('HIGH RISK  ·  HIGH LOOT', cx, y + 27);
    }
  });
  ctx.restore();
}

// Draw: world space (camera transform active)
function drawBattleRoyaleWorld() {
  if (!brActive) return;
  ctx.save();

  // No killing floor any more, so there is no death gradient to draw.
  _brDrawHazards();
  _brDrawRifts();
  _brDrawLandmarkSigns();

  // Storm zone overlays
  var worldH = BR_DEATH_Y + 200;
  if (brZoneLeft > 0) {
    ctx.fillStyle = 'rgba(255,35,0,0.14)';
    ctx.fillRect(0, -400, brZoneLeft, worldH + 400);
    var lg = ctx.createLinearGradient(brZoneLeft - 100, 0, brZoneLeft + 10, 0);
    lg.addColorStop(0, 'rgba(255,50,0,0)'); lg.addColorStop(1, 'rgba(255,50,0,0.6)');
    ctx.fillStyle = lg; ctx.fillRect(brZoneLeft - 100, -400, 112, worldH + 400);
    ctx.fillStyle = '#ff5500'; ctx.fillRect(brZoneLeft, -400, 3, worldH + 400);
  }
  if (brZoneRight < BR_WORLD_W) {
    ctx.fillStyle = 'rgba(255,35,0,0.14)';
    ctx.fillRect(brZoneRight, -400, BR_WORLD_W - brZoneRight, worldH + 400);
    var rg = ctx.createLinearGradient(brZoneRight - 10, 0, brZoneRight + 100, 0);
    rg.addColorStop(0, 'rgba(255,50,0,0.6)'); rg.addColorStop(1, 'rgba(255,50,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(brZoneRight - 12, -400, 112, worldH + 400);
    ctx.fillStyle = '#ff5500'; ctx.fillRect(brZoneRight - 3, -400, 3, worldH + 400);
  }
  if (brZoneTop > 0) {
    ctx.fillStyle = 'rgba(255,35,0,0.14)';
    ctx.fillRect(0, -400, BR_WORLD_W, brZoneTop + 400);
    var tg = ctx.createLinearGradient(0, brZoneTop - 10, 0, brZoneTop + 100);
    tg.addColorStop(0, 'rgba(255,50,0,0.6)'); tg.addColorStop(1, 'rgba(255,50,0,0)');
    ctx.fillStyle = tg; ctx.fillRect(0, brZoneTop - 12, BR_WORLD_W, 112);
    ctx.fillStyle = '#ff5500'; ctx.fillRect(0, brZoneTop, BR_WORLD_W, 3);
  }
  if (brZoneBottom < BR_WORLD_H) {
    ctx.fillStyle = 'rgba(255,35,0,0.14)';
    ctx.fillRect(0, brZoneBottom, BR_WORLD_W, BR_WORLD_H - brZoneBottom + 400);
    var bg2 = ctx.createLinearGradient(0, brZoneBottom - 100, 0, brZoneBottom + 10);
    bg2.addColorStop(0, 'rgba(255,50,0,0)'); bg2.addColorStop(1, 'rgba(255,50,0,0.6)');
    ctx.fillStyle = bg2; ctx.fillRect(0, brZoneBottom - 100, BR_WORLD_W, 112);
    ctx.fillStyle = '#ff5500'; ctx.fillRect(0, brZoneBottom - 3, BR_WORLD_W, 3);
  }

  // Loot chests. Contents stay hidden until broken.
  var _fc = typeof frameCount !== 'undefined' ? frameCount : 0;
  brLootBoxes.forEach(function(box) {
    if (box.opened) {
      ctx.globalAlpha = box.anim / 30;
      ctx.fillStyle = box.item.color;
      ctx.beginPath(); ctx.arc(box.x, box.y, (30 - box.anim) * 0.9 + 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; return;
    }
    var pulse = 0.82 + 0.18 * Math.sin(_fc * 0.07);
    ctx.fillStyle   = 'rgba(25,18,10,0.92)';
    ctx.strokeStyle = 'rgba(180,140,60,0.8)'; ctx.lineWidth = 2;
    ctx.fillRect(box.x - 13, box.y - 13, 26, 26);
    ctx.strokeRect(box.x - 13, box.y - 13, 26, 26);
    ctx.strokeStyle = 'rgba(140,110,40,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(box.x - 13, box.y); ctx.lineTo(box.x + 13, box.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(box.x, box.y - 13); ctx.lineTo(box.x, box.y + 13); ctx.stroke();
    ctx.shadowColor = 'rgba(200,160,60,0.7)'; ctx.shadowBlur = 5 * pulse;
    ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,180,80,0.9)';
    ctx.fillText('?', box.x, box.y + 5); ctx.shadowBlur = 0;
    if (box.health < box.maxHealth) {
      var hFrac = box.health / box.maxHealth;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(box.x - 13, box.y + 14, 26, 4);
      ctx.fillStyle = hFrac > 0.5 ? '#88dd44' : '#ffaa22';
      ctx.fillRect(box.x - 13, box.y + 14, 26 * hFrac, 4);
    }
  });

  // Ground items. Press F to pick up.
  brGroundItems.forEach(function(gi) {
    var pulse    = 0.7 + 0.3 * Math.sin(_fc * 0.1);
    var fadeAlpha = Math.min(1, gi.life / 120);  // fade out last 2 seconds
    ctx.globalAlpha = fadeAlpha;
    ctx.shadowColor = gi.item.color; ctx.shadowBlur = 8 * pulse;
    ctx.fillStyle   = gi.item.color;
    ctx.beginPath(); ctx.arc(gi.x, gi.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(gi.x, gi.y, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur  = 0;
    ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText(gi.item.icon || '?', gi.x, gi.y + 4);
    if (gi._pickT > 0) {
      ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(gi.x, gi.y, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, gi._pickT / BR_BOT_PICKUP_F));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });

  if (brPlaneFlight && brPlaneX > -400 && brPlaneX < BR_WORLD_W + 400) {
    var px = brPlaneX, py = BR_PLANE_Y;
    ctx.save();
    ctx.fillStyle = '#8899bb'; ctx.strokeStyle = '#aabbdd'; ctx.lineWidth = 1.5;
    ctx.fillRect(px - 55, py - 9, 110, 18); ctx.strokeRect(px - 55, py - 9, 110, 18);
    ctx.fillStyle = '#5577aa';
    ctx.beginPath(); ctx.moveTo(px + 55, py - 9); ctx.lineTo(px + 82, py); ctx.lineTo(px + 55, py + 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#778899';
    ctx.beginPath(); ctx.moveTo(px - 10, py); ctx.lineTo(px + 20, py - 9); ctx.lineTo(px + 20, py + 9); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px - 10, py); ctx.lineTo(px - 60, py - 28); ctx.lineTo(px - 40, py); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px - 10, py); ctx.lineTo(px - 60, py + 28); ctx.lineTo(px - 40, py); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px - 55, py - 9); ctx.lineTo(px - 75, py - 28); ctx.lineTo(px - 55, py - 9); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,220,255,0.3)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(px - 55, py); ctx.lineTo(px - 160, py); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.restore();
}

// Draw: screen space. Transform is reset to base scale so coordinates match GAME_W/GAME_H, whatever the camera is doing.
function drawBattleRoyaleHUD() {
  if (!brActive || !gameRunning) return;
  ctx.save();
  // Pin HUD to screen: use base scale only, ignoring camera offset
  var bsX = canvas.width  / GAME_W;
  var bsY = canvas.height / GAME_H;
  ctx.setTransform(bsX, 0, 0, bsY, 0, 0);

  var _fc = typeof frameCount !== 'undefined' ? frameCount : 0;

  // Top margin below the DOM HUD, which overlays the canvas.
  var _brTopY = (typeof _hudBottom === 'function' && canvas.clientHeight > 0)
    ? Math.ceil(_hudBottom() * GAME_H / canvas.clientHeight) + 6
    : 8;

  if (brPlaneFlight && !brJumped) {
    var pulse = 0.6 + 0.4 * Math.sin(_fc * 0.12);
    ctx.globalAlpha = pulse;
    ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
    ctx.fillText('W / SPACE  to DROP', GAME_W / 2, GAME_H / 2 - 40);
    ctx.font = '13px Arial'; ctx.fillStyle = '#aaccff';
    ctx.fillText('Choose your landing spot!', GAME_W / 2, GAME_H / 2 - 14);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  if (brJumped && !brLanded) {
    ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = '#88ccff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 5;
    ctx.fillText('Freefalling...', GAME_W / 2, GAME_H / 2 - 30);
    ctx.shadowBlur = 0;
  }

  ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center';
  var cStr = brStoryBearers
    ? '◈ ' + brAlive + ' / ' + brFieldTotal + '  BEARERS'
    : '🏆 ' + brAlive + ' / ' + brFieldTotal;
  var cW   = ctx.measureText(cStr).width + 24;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(GAME_W / 2 - cW / 2, _brTopY, cW, 26);
  ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
  ctx.fillText(cStr, GAME_W / 2, _brTopY + 18); ctx.shadowBlur = 0;

  // The three BR achievements (eliminations, crates, zones) are the three numbers on screen.
  if (brLanded) {
    var tStr = '⚔ ' + brPlayerKills + '   📦 ' + brPlayerCrates +
               '   🧭 ' + ((brVisitedZones && brVisitedZones.size) || 0) + '/' + BR_LANDMARKS.length;
    ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    var tW = ctx.measureText(tStr).width + 18;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(GAME_W / 2 - tW / 2, _brTopY + 28, tW, 17);
    ctx.fillStyle = 'rgba(255,225,160,0.9)';
    ctx.fillText(tStr, GAME_W / 2, _brTopY + 40);
  }

  var zLabel, zColor;
  if (brZoneState === 'final') {
    zLabel = 'FINAL ZONE'; zColor = '#ff2200';
  } else if (brZoneState === 'close') {
    var closePct = Math.round((1 - brZoneTimer / (brZoneCloseLen || BR_ZONE_CLOSE_F)) * 100);
    zLabel = 'CLOSING ' + closePct + '%'; zColor = '#ff4422';
  } else {
    var tLeft = Math.ceil(brZoneTimer / 60);
    zLabel = !brLanded ? 'Waiting...'
           : brSurgeTimer > 0 ? 'SURGE!'
           : brSurgeWarn  > 0 ? 'SURGE IN ' + Math.ceil(brSurgeWarn / 60) + 's'
           : 'Zone in ' + tLeft + 's';
    zColor = (brSurgeWarn > 0 || brSurgeTimer > 0) ? '#ff7733' : '#ffaa44';
  }
  ctx.font = 'bold 11px Arial'; ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(GAME_W - 132, _brTopY, 124, 20);
  ctx.fillStyle = zColor;
  var _zHot = brZoneState === 'close' || brZoneState === 'final' || brSurgeWarn > 0 || brSurgeTimer > 0;
  ctx.shadowColor = _zHot ? zColor : 'transparent';
  ctx.shadowBlur  = _zHot ? 6 : 0;
  ctx.fillText(zLabel, GAME_W - 10, _brTopY + 14); ctx.shadowBlur = 0;

  var _p1hud = players[0];
  if (_p1hud && _p1hud.health > 0 && !brSpectating) {
    var _nearItem = null;
    for (var _gi = 0; _gi < brGroundItems.length; _gi++) {
      var _g = brGroundItems[_gi];
      if (Math.abs(_p1hud.cx() - _g.x) < 52 && Math.abs((_p1hud.y + (_p1hud.h || 50) * 0.5) - _g.y) < 60) {
        _nearItem = _g.item; break;
      }
    }
    if (_nearItem && !_p1hud._brFormOffer) {
      var _pPulse = 0.7 + 0.3 * Math.sin(_fc * 0.15);
      ctx.globalAlpha = _pPulse;
      ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
      var _invFull = brInventory.indexOf(null) === -1;
      var _pMsg = _invFull ? '[Bag full] ' + (_nearItem.label || _nearItem.type) : '[F] Pick up  ' + (_nearItem.label || _nearItem.type);
      ctx.fillText(_pMsg, GAME_W / 2, GAME_H / 2 + 60);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
  }

  var slotW = 50, slotH = 50, gap = 5;
  var totW  = 5 * slotW + 4 * gap;
  var ibx   = (GAME_W - totW) / 2;
  var iby   = GAME_H - slotH - 24;
  for (var si = 0; si < 5; si++) {
    var sx   = ibx + si * (slotW + gap);
    var item = brInventory[si];
    var sel  = si === brActiveSlot;
    ctx.fillStyle   = sel ? 'rgba(255,200,50,0.22)' : 'rgba(0,0,0,0.65)'; ctx.fillRect(sx, iby, slotW, slotH);
    ctx.strokeStyle = sel ? '#ffcc33' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = sel ? 2.5 : 1;
    ctx.strokeRect(sx, iby, slotW, slotH);
    if (item) {
      ctx.shadowColor = item.color; ctx.shadowBlur = 7;
      ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.fillText(item.icon, sx + slotW / 2, iby + 30); ctx.shadowBlur = 0;
      ctx.font = '7px Arial'; ctx.fillStyle = '#ccc';
      ctx.fillText((item.label || item.type).slice(0, 8), sx + slotW / 2, iby + slotH - 5);
    }
    ctx.font = 'bold 9px Arial'; ctx.fillStyle = sel ? '#ffcc33' : 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'left'; ctx.fillText('' + (si + 1), sx + 4, iby + 11);
    // Show action hint on selected slot
    if (sel && item) {
      ctx.font = '7px Arial'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,200,80,0.7)';
      ctx.fillText(item.type === 'weapon' ? 'EQUIP' : 'R:USE  G:DROP', sx + slotW / 2, iby + slotH + 10);
    }
  }

  if (brSpectating) {
    // "ELIMINATED" banner (fades out after 5s)
    if (brElimBanner > 0) {
      var elimAlpha = Math.min(1, brElimBanner / 60);
      ctx.globalAlpha = elimAlpha;
      ctx.font = 'bold 36px Arial'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ff2222'; ctx.shadowColor = '#000'; ctx.shadowBlur = 14;
      ctx.fillText('ELIMINATED', GAME_W / 2, GAME_H / 2 - 20);
      ctx.font = '14px Arial'; ctx.fillStyle = '#ffaaaa';
      ctx.fillText('You have been eliminated. Spectating...', GAME_W / 2, GAME_H / 2 + 14);
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }
    // Spectate target name bar (bottom, above inventory)
    if (brSpectateTarget) {
      var tname = brSpectateTarget.name || 'Bot';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(GAME_W / 2 - 120, GAME_H - 95, 240, 22);
      ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
      ctx.fillText('SPECTATING  ' + tname, GAME_W / 2, GAME_H - 79);
      ctx.shadowBlur = 0;
      ctx.font = '9px Arial'; ctx.fillStyle = 'rgba(200,200,200,0.7)';
      ctx.fillText('[Q] Prev    [E] Next', GAME_W / 2, GAME_H - 64);
    }
  }

  if (!brSpectating && typeof brDrawFormHUD === 'function') brDrawFormHUD();
  if (typeof drawBRStructuresHUD === 'function') drawBRStructuresHUD();

  _drawBRMinimap();

  ctx.restore();
}

// Minimap
function _drawBRMinimap() {
  // The world is a 12000x1600 strip, so the minimap is a strip too. A square box would squash it and make every distance wrong.
  var mmW = 260, mmH = 64;
  var mmX = GAME_W - mmW - 8;
  var mmY = GAME_H - mmH - 8;
  var scX = mmW / BR_WORLD_W;
  var scY = mmH / BR_WORLD_H;

  var p1 = players[0];

  ctx.fillStyle = 'rgba(5,5,20,0.82)';
  ctx.fillRect(mmX, mmY, mmW, mmH);
  ctx.strokeStyle = 'rgba(100,140,255,0.4)'; ctx.lineWidth = 1;
  ctx.strokeRect(mmX, mmY, mmW, mmH);

  // Storm zones
  ctx.fillStyle = 'rgba(255,60,0,0.35)';
  if (brZoneLeft > 0)           ctx.fillRect(mmX, mmY, brZoneLeft * scX, mmH);
  if (brZoneRight < BR_WORLD_W) { var rzX = mmX + brZoneRight * scX; ctx.fillRect(rzX, mmY, mmW - (rzX - mmX), mmH); }
  if (brZoneTop > 0)            ctx.fillRect(mmX, mmY, mmW, brZoneTop * scY);
  if (brZoneBottom < BR_WORLD_H){ var rbY = mmY + brZoneBottom * scY; ctx.fillRect(mmX, rbY, mmW, mmH - (rbY - mmY)); }
  ctx.strokeStyle = '#ff5500'; ctx.lineWidth = 1.5;
  if (brZoneLeft > 0)           { var lx = mmX + brZoneLeft  * scX; ctx.beginPath(); ctx.moveTo(lx, mmY); ctx.lineTo(lx, mmY + mmH); ctx.stroke(); }
  if (brZoneRight < BR_WORLD_W) { var rx = mmX + brZoneRight * scX; ctx.beginPath(); ctx.moveTo(rx, mmY); ctx.lineTo(rx, mmY + mmH); ctx.stroke(); }
  if (brZoneTop > 0)            { var ty = mmY + brZoneTop    * scY; ctx.beginPath(); ctx.moveTo(mmX, ty); ctx.lineTo(mmX + mmW, ty); ctx.stroke(); }
  if (brZoneBottom < BR_WORLD_H){ var by = mmY + brZoneBottom * scY; ctx.beginPath(); ctx.moveTo(mmX, by); ctx.lineTo(mmX + mmW, by); ctx.stroke(); }

  // Landmark bands: the minimap shows where the volcano is, not individual platforms.
  if (typeof BR_LANDMARKS !== 'undefined') {
    BR_LANDMARKS.forEach(function(L) {
      if (L.kind === 'open') return;
      var bx = mmX + L.x * scX, bw = Math.max(2, L.w * scX);
      ctx.fillStyle = L.danger >= 3 ? 'rgba(255,110,40,0.30)'
                    : L.danger >= 2 ? 'rgba(255,200,60,0.20)'
                                    : 'rgba(120,170,255,0.18)';
      ctx.fillRect(bx, mmY + 10, bw, mmH - 20);
      ctx.fillStyle = 'rgba(220,235,255,0.75)';
      ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center';
      ctx.fillText(L.name.replace('The ', '').slice(0, 9), bx + bw / 2, mmY + mmH - 5);
    });
  }
  ctx.fillStyle = 'rgba(80,100,140,0.55)';
  ctx.fillRect(mmX, mmY + BR_GROUND_Y * scY, mmW, 1);
  // Rifts. Without the minimap you can't find the gates.
  for (var _ri = 0; _ri < brRifts.length; _ri++) {
    var _rg = brRifts[_ri];
    var _rx = mmX + _rg.x * scX, _ry = mmY + _rg.y * scY;
    ctx.fillStyle = _rg.color;
    ctx.beginPath(); ctx.arc(_rx, _ry, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(_rx, _ry, 4.2, 0, Math.PI * 2); ctx.stroke();
  }

  // Nearby chests (within 3000 units of P1)
  if (p1) {
    ctx.fillStyle = '#ffdd44';
    brLootBoxes.forEach(function(box) {
      if (box.opened) return;
      if (Math.abs(box.x - p1.cx()) > 3000) return;
      ctx.fillRect(mmX + box.x * scX - 1.5, mmY + box.y * scY - 1.5, 3, 3);
    });
  }

  // Nearby enemies (within 2500 units of P1)
  ctx.fillStyle = '#ff4444';
  minions.forEach(function(bot) {
    if (!bot || bot.health <= 0 || bot._brOnPlane) return;
    if (p1 && Math.abs(bot.cx() - p1.cx()) > 2500) return;
    var eX = Math.max(mmX + 1, Math.min(mmX + mmW - 1, mmX + bot.cx() * scX));
    var eY = Math.max(mmY + 1, Math.min(mmY + mmH - 1, mmY + bot.cy() * scY));
    ctx.beginPath(); ctx.arc(eX, eY, 2, 0, Math.PI * 2); ctx.fill();
  });

  // P1 dot (or spectate target when spectating)
  var _mmDot = (brSpectating && brSpectateTarget) ? brSpectateTarget
             : (p1 && p1.health > 0 && !p1._brOnPlane ? p1 : null);
  if (_mmDot) {
    var p1mmX = Math.max(mmX + 3, Math.min(mmX + mmW - 3, mmX + _mmDot.cx() * scX));
    var p1mmY = Math.max(mmY + 3, Math.min(mmY + mmH - 3, mmY + _mmDot.cy() * scY));
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(p1mmX, p1mmY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = brSpectating ? '#aaffff' : '#ffffff';
    ctx.beginPath(); ctx.arc(p1mmX, p1mmY, 3, 0, Math.PI * 2); ctx.fill();
  }

  // Plane indicator
  if (brPlaneFlight && brPlaneX > 0 && brPlaneX < BR_WORLD_W) {
    var plmmX = mmX + brPlaneX * scX;
    ctx.fillStyle = '#88bbff';
    ctx.font = '9px Arial'; ctx.textAlign = 'center';
    ctx.fillText('✈', plmmX, mmY + 10);
  }

  ctx.font = 'bold 8px Arial'; ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(150,180,255,0.7)';
  ctx.fillText('MAP', mmX + 3, mmY + 9);
}
