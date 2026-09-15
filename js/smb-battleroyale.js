'use strict';
// smb-battleroyale.js — Battle Royale: 100 players, plane drop, void death, zone, loot, minimap

// ============================================================
// CONSTANTS
// ============================================================
const BR_TOTAL        = 100;
// ── World shape ───────────────────────────────────────────────────────────────
// The old map was a 9000x2800 vertical shaft of floating platforms with NO
// isFloor platform anywhere: the map had no ground at all. A single knockback on
// an upper tier was a 2400px uninterrupted fall to death with no recovery and no
// counterplay, which is what made placement feel arbitrary.
//
// The rule is that there is ALWAYS ground under you. A floor spans the whole
// world at BR_GROUND_Y, broken only by authored sinkholes and the volcano vent —
// and each of those bottoms out on the cavern floor below, so even a fall through
// one is a descent, not a death. Knockback costs position, HP and a fight; it can
// never cost the match outright. The only lethal terrain is hazard you chose to
// walk into for loot.
const BR_WORLD_W      = 12000;  // horizontal world size
const BR_WORLD_H      = 1900;   // vertical world extent (sky + surface + underground)
const BR_DEATH_Y      = 1900;   // safety net only — no reachable terrain sits below this
const BR_LOOT_COUNT   = 200;    // loot chests (distributed by landmark density weight)
const BR_ZONE_DAMAGE  = 2;      // HP per zone tick
const BR_ZONE_TICK    = 60;     // frames between zone damage ticks
const BR_PLANE_Y      = -180;   // world Y of the transport plane
const BR_PLANE_SPEED  = 18;     // px/frame (crosses 12000 units in ~690 frames ≈ 11.5s)
const BR_ZONE_WAIT_F  = 1800;   // 30s wait between zone moves
const BR_ZONE_CLOSE_F = 600;    // 10s linear close duration

// ── Story reframe: the field is the 94 bearers who came before Kael ───────────
// docs/TRIALS_DESIGN.md judges Battle Royale worth including "only if reframed":
// anonymous bots make it a mode, not a story beat, but if the field is the 94
// prior fragment bearers it becomes the thing Kael refuses to be, made literal
// and all at once. Chapter 147 "The Constructs" already described exactly that
// ("echoes of absorbed fragment bearers", "they fight like you"), so it is the
// chapter that carries it.
//
// 94 bearers + Kael = 95, which is the game's title.
const BR_BEARER_COUNT = 94;

// Field size is a VARIABLE, not BR_TOTAL, because the story field is 95 and the
// casual field is 100. Everything that reported "/ 100" reads this instead.
var brFieldTotal   = BR_TOTAL;
// DERIVED in initBattleRoyale(), never latched by a caller — a leaked `true`
// here would silently turn a casual Battle Royale into the story field.
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

// ============================================================
// STATE
// ============================================================
var brActive       = false;
var brAlive        = 0;
var brZonePhase    = 0;
var brZoneState    = 'wait';   // 'wait' | 'close' | 'final'
var brZoneTimer    = 0;        // countdown frames for current state
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

// Plane drop state
var brPlaneFlight  = true;    // true = plane still crossing
var brPlaneX       = -300;
var brJumped       = false;   // P1 has jumped
// Edge-trigger latch for the drop key. False until the key has been seen UP once,
// so a keypress carried in from the menu cannot drop the player instantly.
var brDropKeyReleased = false;
var brLanded       = false;   // P1 has landed
var brBotsFallDone = false;   // all bots have been assigned drop points

// Spectate state
// ── Per-match player record ──────────────────────────────────────────────────
// Everything here is scoped to ONE match and reset by initBattleRoyale(). The
// Battle Royale achievements are all single-match feats, so a career total would
// award the wrong thing.
var brPlayerKills   = 0;
var brPlayerCrates  = 0;
var brVisitedZones  = null;   // Set of landmark names the player has stood inside

var brSpectating      = false;
var brSpectateTarget  = null;
var brSpectateList    = [];   // alive fighters to cycle through
var brSpectateIdx     = 0;
var brElimBanner      = 0;    // frames to show "ELIMINATED" banner

// ── Layers ───────────────────────────────────────────────────────────────────
// The world is three stacked layers, not one strip. The vertical separations are
// chosen against the real jump envelope so a layer change is a ROUTE, not a hop:
//
//   jump apex      = 16^2 / (2 * 0.65) ~= 197px
//   + double jump  ~= 370px total reach
//
// Sky floor (420) to surface (900) is 480px, and surface crust bottom (974) to
// cavern floor (1500) is 526px. Both are comfortably past 370, so you cannot
// simply jump into the sky or climb straight out of a hole. You take the rifts,
// or you find the authored climb.
const BR_SKY_FLOOR_Y  = 420;    // lowest cloud platform
const BR_GROUND_Y     = 900;    // top of the surface crust
const BR_CRUST_H      = 74;     // crust thickness — its underside is the cave ceiling
const BR_CAVE_FLOOR_Y = 1500;   // top of the underground floor

// ── Landmarks ────────────────────────────────────────────────────────────────
// Hand-authored, not generated. The seeded generator produced platform stacks at
// arbitrary heights, which is how chests ended up on ledges nothing could reach,
// and why the city turned into undifferentiated scaffolding. Every platform below
// is placed by hand and checked by _brValidateReach() at build time.
//
// `plats` entries are [relativeX, worldY, width] — x is relative to the band so a
// band can be moved or reordered without retouching its interior.
// `holes` are [relStart, relEnd] gaps cut in the surface crust: the ways down.
// `layer` is 'surface' | 'under' | 'sky'.
const BR_LANDMARKS = [
  // ── SURFACE ────────────────────────────────────────────────────────────────
  { x: 0, w: 1100, name: 'Outskirts', themeKey: 'grass', layer: 'surface',
    danger: 0, density: 0.6, rarity: 0.0, plat: '#5aae4e', edge: '#3a7030',
    plats: [[120,760,170],[420,640,150],[720,760,190],[300,500,130]] },

  { x: 1100, w: 1100, name: 'The City', themeKey: 'city', layer: 'surface',
    danger: 1, density: 1.0, rarity: 0.2, plat: '#6a7382', edge: '#454d59',
    // Six ledges, not sixteen. The city was the worst offender for platform spam;
    // it now reads as three buildings with roofs worth contesting.
    plats: [[80,770,220],[380,640,200],[700,770,240],[180,500,150],[520,500,180],[860,620,160]] },

  { x: 2200, w: 1200, name: 'The Plains', themeKey: 'grass', layer: 'surface',
    danger: 0, density: 0.6, rarity: 0.0, plat: '#5aae4e', edge: '#3a7030',
    // The cave is UNDER here. Two sinkholes are the way in — one-way drops, because
    // the climb back out is 526px and the route out is authored underground.
    // The 650 ledge sits within a stride of the 770 step, so the climb is
    // 900 -> 770 -> 650 in two legal hops. Placing it out on its own is exactly
    // how the generated map stranded chests.
    plats: [[150,770,180],[520,650,170],[940,770,180]],
    holes: [[340,500],[730,900]] },

  { x: 3400, w: 900, name: 'Old Road', themeKey: 'desert', layer: 'surface',
    danger: 0, density: 0.6, rarity: 0.0, plat: '#c9a05a', edge: '#9a743a',
    plats: [[120,780,190],[430,660,170],[700,780,170]] },

  { x: 4300, w: 1300, name: 'The Volcano', themeKey: 'volcano', layer: 'surface',
    danger: 4, density: 1.6, rarity: 0.7, plat: '#4a2a22', edge: '#7a3a22',
    plats: [[100,770,180],[400,640,200],[760,770,190],[560,500,150]],
    // The vent: the volcano runs all the way down into the Depths.
    holes: [[1000,1160]],
    lava: [[180,230],[520,260],[860,200]] },

  { x: 5600, w: 900, name: 'East Plains', themeKey: 'grass', layer: 'surface',
    danger: 0, density: 0.6, rarity: 0.0, plat: '#5aae4e', edge: '#3a7030',
    plats: [[130,780,190],[450,650,180]] },

  { x: 6500, w: 1200, name: 'The Ruins', themeKey: 'ruins', layer: 'surface',
    danger: 2, density: 1.3, rarity: 0.4, plat: '#8a7a5a', edge: '#5e523a',
    plats: [[100,700,120],[330,780,110],[560,620,130],[800,730,120],[1000,560,140]],
    wildlife: [[600, 'beast']] },

  { x: 7700, w: 1000, name: 'Frostline', themeKey: 'ice', layer: 'surface',
    danger: 2, density: 1.1, rarity: 0.3, plat: '#9fd8ea', edge: '#6aa8c4',
    plats: [[80,780,260],[420,650,240],[760,780,200],[480,510,180]],
    wildlife: [[500, 'yeti']] },

  { x: 8700, w: 1200, name: 'Neon Sector', themeKey: 'cyberpunk', layer: 'surface',
    danger: 2, density: 1.3, rarity: 0.4, plat: '#4a3a6a', edge: '#7a5ac0',
    plats: [[100,770,200],[420,640,190],[760,770,220],[560,500,170]] },

  { x: 9900, w: 800, name: 'West Plains', themeKey: 'grass', layer: 'surface',
    danger: 0, density: 0.6, rarity: 0.0, plat: '#5aae4e', edge: '#3a7030',
    plats: [[120,780,180],[440,650,170]] },

  { x: 10700, w: 1300, name: 'The Colosseum', themeKey: 'colosseum', layer: 'surface',
    danger: 3, density: 1.6, rarity: 0.6, plat: '#b5a180', edge: '#8a7454',
    plats: [[120,800,200],[380,700,180],[640,600,180],[900,700,180],[1060,800,190],[520,490,260]] },

  // ── UNDERGROUND ────────────────────────────────────────────────────────────
  // One continuous system: caverns under the plains, a tunnel under the desert,
  // and the volcano's depths. Its floor is BR_CAVE_FLOOR_Y throughout.
  { x: 2200, w: 1200, name: 'The Caverns', themeKey: 'cave', layer: 'under',
    danger: 3, density: 2.0, rarity: 0.65, plat: '#3a2518', edge: '#5a3a28',
    plats: [[120,1380,160],[700,1380,170],[950,1250,150],
            // Climb out under the left sinkhole: 1500 -> 1380 -> 1240 -> 1100 -> 1000,
            // then step through the hole onto the surface at 900.
            [380,1380,140],[420,1240,140],[380,1100,140],[410,1000,150]],
    wildlife: [[800, 'beast']] },

  { x: 3400, w: 900, name: 'The Tunnel', themeKey: 'cave', layer: 'under',
    danger: 2, density: 1.2, rarity: 0.45, plat: '#3a2518', edge: '#5a3a28',
    plats: [[200,1380,180],[560,1380,180]] },

  { x: 4300, w: 1300, name: 'Volcano Depths', themeKey: 'volcano', layer: 'under',
    danger: 5, density: 2.3, rarity: 0.95, plat: '#4a2a22', edge: '#7a3a22',
    // The best loot in the world, over the most lava, furthest from any exit.
    plats: [[150,1370,160],[520,1260,170],[880,1370,160],
            // Climb out under the vent (rel 1000-1160 of the surface band).
            [1000,1380,150],[1040,1240,150],[1000,1100,150],[1030,1000,150]],
    lava: [[330,170],[700,180],[1150,150]] },

  // ── SKY ────────────────────────────────────────────────────────────────────
  // Reachable only through a rift. You can always leave by stepping off — the
  // fall lands on the surface, so the sky is a commitment in one direction only.
  { x: 6500, w: 2200, name: 'Cloud Kingdom', themeKey: 'clouds', layer: 'sky',
    danger: 3, density: 1.8, rarity: 0.75, plat: '#dce9f5', edge: '#9db6cc',
    plats: [[100,420,240],[420,330,200],[760,420,220],[1100,330,240],
            [1440,420,200],[1780,330,220],[600,200,180],[1300,200,180]] },
];

// ── Rifts ────────────────────────────────────────────────────────────────────
// Paired fast-travel gates. They are the only way into the sky, the only quick
// way out of the deep, and the only way to cross the map faster than the storm.
// Entering one puts a cooldown on the fighter so a pair cannot be ridden in a loop.
const BR_RIFT_PAIRS = [
  { a: { x: 560,  y: 830 },  b: { x: 6900,  y: 350 },  color: '#7fd4ff', label: 'SKY' },
  { a: { x: 8300, y: 350 },  b: { x: 11300, y: 830 },  color: '#ffd27f', label: 'ARENA' },
  { a: { x: 2500, y: 1430 }, b: { x: 5450,  y: 1430 }, color: '#ff8a5c', label: 'DEEP' },
  { a: { x: 9200, y: 830 },  b: { x: 3150,  y: 1430 }, color: '#c79bff', label: 'CAVERN' },
];
var brRifts = [];

// The cave shaft constants are gone: holes are authored per band now. Kept as a
// derived pair so the older callers (the fall integrator) keep working.
var BR_SHAFT_L = 2580, BR_SHAFT_R = 2720;

// Surface hazard rects, built with the arena: { x, y, w, h, type }.
var brHazards = [];

// ── Zone phases ───────────────────────────────────────────────────────────────
// Generated per match, not authored. The world is horizontal, so the ring is
// horizontal: a closing band on a continuous floor forces contact by itself,
// where a vertical squeeze mostly just pushed people off ledges.
//
// The final ring lands on a NAMED surface landmark so every match ends somewhere
// with terrain to fight over, and somewhere different each time. Each ring is
// clamped inside the previous one, which guarantees the sequence is nested — a
// ring outside its predecessor would strand players with nowhere legal to walk.
var brZonePhases    = [];
var brFinalRingName = '';
var brZoneCloseLen  = 600;   // length of the CURRENT close, for the HUD percentage

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
                  wait: 2100, close: 780 }];
  var prevL = 0, prevR = BR_WORLD_W;
  for (var i = 0; i < widths.length; i++) {
    var half = widths[i] / 2;
    // The ring WANDERS on the way in instead of homing straight at the final
    // centre, so reading phase 1 tells you very little about phase 6 and
    // committing to a corner early is a real gamble. The drift shrinks as the
    // ring does, so the last two phases are honest.
    var drift = (Math.random() - 0.5) * widths[i] * 0.55;
    var aim   = cx + drift * (1 - i / widths.length);
    var c     = Math.max(prevL + half, Math.min(prevR - half, aim));
    var L     = Math.round(c - half), R = Math.round(c + half);
    // Irregular but UNHURRIED: no two phases share a rhythm, yet every one of
    // them is long enough to loot a landmark, fight over it, and still rotate.
    // The previous curve (~22s down to ~9s) turned the whole match into a
    // forced march — you were always running, never playing. It is now ~43s
    // down to ~28s of breathing room with a ~16s-to-12s close on top, which
    // makes a full match around six minutes instead of three. The variance
    // stays — the point is that the rhythm is unreadable, not that it is brutal.
    var t     = i / (widths.length - 1);
    var wait  = Math.round((2600 - 900 * t) * (0.88 + Math.random() * 0.24));
    var close = Math.round((980 - 260 * t) * (0.90 + Math.random() * 0.20));
    phases.push({ left: L, right: R, top: 0, bottom: BR_WORLD_H,
                  wait: Math.max(900, wait), close: Math.max(600, close) });
    prevL = L; prevR = R;
  }
  return phases;
}

// ── Storm surges ──────────────────────────────────────────────────────────────
// During a wait the ring is not idle: it can lurch inward early. The surge is
// telegraphed for BR_SURGE_WARN frames before it moves, so it is a reaction test
// rather than an ambush — unpredictable, not unfair.
const BR_SURGE_WARN   = 210;   // ~3.5s of warning
const BR_SURGE_FRAMES = 150;   // ~2.5s of movement
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
  // Roughly one surge per ~45s of waiting, and only from phase 2 onward. Surges
  // exist to stop people parking dead centre during a long wait, not to shorten
  // the wait — a surge now eats 7% of the gap, so it is a nudge, not a sprint.
  if (brZonePhase < 2) return;
  var odds = 0.0004 + brZonePhase * 0.00022;
  if (Math.random() < odds) {
    brSurgeWarn     = BR_SURGE_WARN;
    brSurgeCooldown = 2600;
    if (typeof DamageText !== 'undefined')
      damageTexts.push(new DamageText(GAME_W / 2, 110, 'STORM SURGE', '#ff7733'));
  }
}

// ── Loot rarity ───────────────────────────────────────────────────────────────
// A flat pool meant every chest anywhere rolled identical odds, so there was no
// reason to go anywhere in particular. Rarity plus per-landmark bias is what
// makes the depths worth the burn.
const BR_RARITY = [
  { key: 'common',    label: 'Common',    color: '#b9c2cc', weight: 46, heal: 30, shield: 20 },
  { key: 'uncommon',  label: 'Uncommon',  color: '#5ddc6a', weight: 27, heal: 45, shield: 30 },
  { key: 'rare',      label: 'Rare',      color: '#4aa8ff', weight: 16, heal: 60, shield: 45 },
  { key: 'epic',      label: 'Epic',      color: '#b45cff', weight:  8, heal: 85, shield: 60 },
  { key: 'legendary', label: 'Legendary', color: '#ffc63a', weight:  3, heal: 999, shield: 80 },
];

// Weapons bracketed by tier. Anything unlisted falls into the common bracket, so
// adding a weapon to WEAPONS can never break the tables.
const BR_WEAPON_TIERS = {
  legendary: ['nullblade', 'voidblade', 'shockrifle'],
  epic:      ['scythe', 'katana', 'flamethrower', 'electricstaff'],
  rare:      ['axe', 'hammer', 'gun', 'bow', 'flail'],
  uncommon:  ['sword', 'spear', 'whip', 'boomerang'],
};

// `combat` is the drop-in loadout — it must never appear in a chest, or the
// reward for opening one can be the thing you already had. The gauntlets are
// already out of WEAPON_KEYS; listed so a direct tier lookup cannot reintroduce
// them. `lantern` is trial-only equipment, not a BR weapon.
const BR_LOOT_EXCLUDE = ['combat', 'gauntlet', 'mkgauntlet', 'lantern'];

const BR_LOOT_POOL = [
  { type: 'medkit', label: 'Medkit',  icon: '💊', color: '#44ff88', weight: 22 },
  { type: 'shield', label: 'Shield',  icon: '🛡',  color: '#4488ff', weight: 18 },
  { type: 'super',  label: 'Super',   icon: '⚡',  color: '#ffdd00', weight: 12 },
  { type: 'weapon', label: null,      icon: '⚔',  color: '#cc88ff', weight: 48 },
];

// Rarity roll biased by the landmark's `rarity` (0 = plains, 0.95 = the depths).
// The bias shifts weight from the bottom of the table to the top rather than
// adding a flat chance, so a dangerous band is better at every tier instead of
// only occasionally dropping a legendary.
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
  // Story field (the 94 bearers): the joke weapons are wrong in the void, the
  // same standard that applies everywhere else in story mode.
  if (brStoryBearers && typeof STORY_TONE_EXCLUDED_WEAPONS !== 'undefined'
      && STORY_TONE_EXCLUDED_WEAPONS.indexOf(k) !== -1) return false;
  return true;
}

// Weapon appropriate to a rarity — searches DOWN from the rolled tier so a
// legendary chest can never come up empty because that bracket is unpopulated.
function _brWeaponForRarity(rarityKey) {
  var order = ['legendary', 'epic', 'rare', 'uncommon'];
  var start = order.indexOf(rarityKey);
  if (start === -1) start = order.length;       // common → fall straight through
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

// Layer that a world Y belongs to. The three layers overlap in X, so X alone can
// no longer identify a band — the caverns sit directly under the plains.
function brLayerAt(y) {
  // Tight: surface bands carry ledges as high as y=490, so a generous window here
  // files them as sky and hands their loot to the wrong landmark.
  if (y <= BR_SKY_FLOOR_Y + 35)          return 'sky';
  if (y >= BR_GROUND_Y + BR_CRUST_H + 20) return 'under';
  return 'surface';
}

// The landmark containing (x, y). Falls back to the nearest band in that layer so
// a caller is never handed null.
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

  // ── Surface crust ───────────────────────────────────────────────────────────
  // One slab per band so each biome paints its own terrain, cut by that band's
  // authored holes. Everything below the crust is the shared bedrock fill.
  BR_LANDMARKS.filter(function (L) { return L.layer === 'surface'; }).forEach(function (L) {
    var cuts = (L.holes || []).map(function (h) { return [L.x + h[0], L.x + h[1]]; })
                              .sort(function (a, b) { return a[0] - b[0]; });
    var segs = [], cur = L.x;
    cuts.forEach(function (c) { if (c[0] > cur) segs.push([cur, c[0]]); cur = Math.max(cur, c[1]); });
    if (cur < L.x + L.w) segs.push([cur, L.x + L.w]);
    segs.forEach(function (seg) {
      var x0 = seg[0], x1 = seg[1];
      if (x1 - x0 < 4) return;
      if (x0 === 0)          x0 = -400;                 // overhang the world ends
      if (x1 === BR_WORLD_W) x1 = BR_WORLD_W + 400;
      push({ x: x0, y: BR_GROUND_Y, w: x1 - x0, h: BR_CRUST_H,
             isFloor: true, color: L.plat, edge: L.edge, _brBand: L.name });
    });
  });

  // ── Underground floor ───────────────────────────────────────────────────────
  // The under-layer bands are contiguous, so their floors join into one system.
  var under = BR_LANDMARKS.filter(function (L) { return L.layer === 'under'; });
  under.forEach(function (L) {
    push({ x: L.x, y: BR_CAVE_FLOOR_Y, w: L.w, h: 120,
           isFloor: true, color: '#241710', edge: '#4a2f1e', _brBand: L.name });
  });

  // ── Authored interiors ──────────────────────────────────────────────────────
  BR_LANDMARKS.forEach(function (L) {
    (L.plats || []).forEach(function (pl) {
      push({ x: L.x + pl[0], y: pl[1], w: pl[2], h: 16,
             color: L.plat, edge: L.edge, _brBand: L.name });
    });
    (L.lava || []).forEach(function (lv) {
      // [relX, width] — lava sits on whichever floor its layer owns.
      var top = (L.layer === 'under') ? BR_CAVE_FLOOR_Y : BR_GROUND_Y;
      brHazards.push({ x: L.x + lv[0], y: top - 16, w: lv[1], h: 34, type: 'lava' });
    });
  });

  // ── Rifts ───────────────────────────────────────────────────────────────────
  BR_RIFT_PAIRS.forEach(function (pr, i) {
    brRifts.push({ x: pr.a.x, y: pr.a.y, pair: i, side: 'a', color: pr.color, label: pr.label });
    brRifts.push({ x: pr.b.x, y: pr.b.y, pair: i, side: 'b', color: pr.color, label: pr.label });
  });

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
    // Vertical extent, for anything that would otherwise assume a 520-tall arena
    // (the godmode free-flight clamp in Fighter.update, for one).
    mapBottom: BR_WORLD_H,
    isBossArena: false,
    isBRBanded: true,
    themeFloorY: 480,
    platforms: platforms,
  };
  _brValidateReach(platforms);
  return arena;
}

// ── Reachability check ────────────────────────────────────────────────────────
// "Some boxes can't be reached because of platform heights" was a real defect of
// the generated layout. Chests only ever spawn on platforms, so the guarantee we
// need is that every platform is reachable from the one below it.
//
// The jump envelope is apex = v^2/2g = 16^2/(2*0.65) ~= 197px, so 150px is the
// authored ceiling for a single hop with landing headroom. A platform that is
// more than that above ANY platform it horizontally overlaps (within a stride) is
// flagged. Deliberate layer separations are exempt: they are meant to be
// unreachable, and the rifts are how you cross them.
const BR_MAX_HOP  = 175;   // vertical rise a single jump can clear, with headroom
const BR_STRIDE   = 210;   // horizontal gap still bridgeable from a standing jump

function _brValidateReach(platforms) {
  var bad = [];
  platforms.forEach(function (pl) {
    if (pl.isFloor) return;
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

// ============================================================
// INIT
// ============================================================
function initBattleRoyale() {
  // Derived, not passed in: a story bearer field is exactly "the active story
  // chapter is a battleroyale chapter". Deriving it means the flag cannot leak
  // into the next casual match the way a latched boolean would.
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

  currentArena = _makeBRArena();
  // Without this the key keeps whatever arena was loaded last, and
  // _drawArenaThemeArt(currentArenaKey) in drawBackground paints THAT arena's
  // backdrop across the whole 12000px world in viewport space — on top of the
  // landmark bands. (Observed as forest trees rendering over the plains.)
  // 'battleroyale' matches no drawer, which is correct: BR's art is per-band.
  currentArenaKey = 'battleroyale';
  if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();

  var p1 = players[0];
  if (p1) {
    // Class (HP, speed, perks) is the player's menu choice and is untouched;
    // only the WEAPON is stripped. Everyone lands with fists and loots up.
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

  // Skill tree is applied HERE, not from a timer after startGame(). startGame()
  // can defer _startGameCore() behind a StoryTransition, so a fixed-delay hook
  // races it and lands on the previous match's fighter (handoff landmine 3).
  // initBattleRoyale runs inside _startGameCore with players[] freshly built.
  if (brStoryBearers && p1 && typeof _applySkillTreeToPlayer === 'function') {
    _applySkillTreeToPlayer(p1);
  }

  _brSpawnBots();
  _brSpawnWildlife();
  _brSpawnLoot();
}

// ============================================================
// BOT SPAWNING — all bots start on plane, drop at random X
// ============================================================
function _brSpawnBots() {
  minions.length = 0;
  var humanCount = players.filter(function(p) { return !p.isAI; }).length;
  var botCount   = brFieldTotal - humanCount;
  var palette    = ['#ff4444','#44aaff','#44ff88','#ffaa22','#cc44ff','#ff88cc','#22ddff','#ffff44','#ff8800','#00ffcc'];
  // The bearers must read as one lineage, so they share the construct palette
  // ch147 already used (#8811bb / #9922cc / #aa33dd) instead of the arcade
  // colours. Still ten distinct values — 94 identical silhouettes are unreadable.
  var bearerPalette = ['#8811bb','#9922cc','#aa33dd','#7a0fa8','#b944e8','#6d0d96','#a02ad0','#c455f0','#5f0b84','#8f1fc0'];
  // The joke-weapon filter (STORY_TONE_EXCLUDED_WEAPONS) used to live here, on the
  // bots' starting loadout. Nobody has a starting weapon any more, so it moved to
  // where weapons now actually enter a match: the loot tables, in _brLootAllowed.

  for (var i = 0; i < botCount; i++) {
    // Everyone drops with fists and nothing else — WEAPONS.combat is the bare
    // brawler kit, so "unarmed" is a real weapon and every weapon-swap path keeps
    // working unchanged. Weapons are earned from loot, by bots and player alike.
    var wk   = 'combat';
    // A field that tops out at 'hard' makes the back half of a match a formality.
    // The spread now runs all the way to 'expert' so the fighters still standing
    // in the last two rings are genuinely dangerous — which is the whole premise
    // of the elimination achievements.
    var diff = i < 20 ? 'easy' : i < 55 ? 'medium' : i < 85 ? 'hard' : 'expert';
    var bot;
    if (brStoryBearers) {
      // i=0 is the 1st bearer (longest ago, weakest echo); i=93 is the 94th, the
      // most recent — ch147's own fight script says the last one held out longest.
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
    // Only awake bots run a brain at all (see _brCullBots), so a faster tick is
    // affordable here and it is what separates a bot that reacts from a bot that
    // commits to a plan for a quarter of a second at a time. 15 frames is a whole
    // dodge window in this game.
    bot.aiTickInterval = 6;
    bot._brTickSalt = i;   // stable per-bot phase, so scheduled work never lands
                           // on one frame for the whole field
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

// ============================================================
// LOOT SPAWNING — breakable chests, contents hidden
// ============================================================
function _brSpawnLoot() {
  brLootBoxes = [];
  var plats = currentArena.platforms;
  if (!plats || !plats.length) return;

  function _makeItem(band) {
    var rarity = _brRollRarity(band ? band.rarity : 0);
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

  // Chest budget is handed out per landmark by density weight, so the depths and
  // the cloud kingdom are genuinely dense and the plains genuinely thin. Every
  // platform is tagged with its band at build time, so a chest can never be
  // assigned to the band sitting directly above or below it.
  var totalWeight = 0;
  BR_LANDMARKS.forEach(function (L) { totalWeight += L.density * L.w; });

  BR_LANDMARKS.forEach(function (L) {
    var budget = Math.round(BR_LOOT_COUNT * (L.density * L.w) / totalWeight);
    var spots = [];
    plats.forEach(function (pl) {
      if (pl._brBand !== L.name) return;
      if (pl.isFloor) {
        // One chest per 600px of floor, not one per slab — a band-long slab would
        // otherwise soak the entire budget.
        var from = pl.x + 90, to = pl.x + pl.w - 90;
        for (var fx = from; fx < to; fx += 600) spots.push({ x: fx + Math.random() * 380, y: pl.y });
      } else {
        spots.push({ x: pl.x + 16 + Math.random() * Math.max(1, pl.w - 32), y: pl.y });
      }
    });
    if (!spots.length) return;
    for (var c = 0; c < budget && brLootBoxes.length < BR_LOOT_COUNT; c++) {
      var sp = spots[Math.floor(Math.random() * spots.length)];
      brLootBoxes.push({
        x: sp.x, y: sp.y - 20,
        band: L.name,
        item: _makeItem(L),
        opened: false,
        anim: 0,
        health: 30,
        maxHealth: 30,
        _dmgTimer: 0,
      });
    }
  });
}

// ============================================================
// PLANE UPDATE — advances plane, handles P1 and bot drops
// ============================================================
function _brUpdatePlane() {
  if (!brPlaneFlight) return;
  var p1 = players[0];

  brPlaneX += BR_PLANE_SPEED;

  // ── P1 handling ──────────────────────────────────────────
  if (!brJumped) {
    if (p1) {
      p1.x  = brPlaneX - (p1.w || 30) / 2;
      p1.y  = BR_PLANE_Y;
      p1.vx = 0; p1.vy = 0;
      p1.onGround = false;
    }
    if (brPlaneX > BR_WORLD_W + 400) {
      brJumped = true;
      // Auto-drop at the end of the run: the plane is past the right edge, so put
      // the player back inside the world rather than outside it.
      if (p1) {
        p1._brOnPlane = false; p1.vy = 6;
        p1.x = Math.min(p1.x, BR_WORLD_W - (p1.w || 30) - 60);
      }
    }
    // ── Drop input ────────────────────────────────────────────────────────────
    // Two guards, both of which were missing and together caused the "I randomly
    // teleported to the start of the map and then died to the storm" report:
    //
    // 1. EDGE-TRIGGERED. This was a level check on keysDown, so a SPACE still
    //    held from the menu (the very key that launched the match) was read on
    //    the plane's first frame. The player never chose to jump.
    // 2. OVER THE MAP. The plane starts at x=-300, OFF the world. Dropping on
    //    frame one put the player at x~=-315, the world clamp parked them at
    //    x=0, and they landed at the extreme left — which reads as a teleport to
    //    the start, and is a death sentence once the ring closes anywhere else.
    var _dropKeyDown = (typeof keysDown !== 'undefined') && (keysDown.has('w') || keysDown.has(' '));
    if (!_dropKeyDown) brDropKeyReleased = true;
    if (p1 && _dropKeyDown && brDropKeyReleased && brPlaneX > 120) {
      brJumped = true;
      p1._brOnPlane = false;
      p1.vx = 0; p1.vy = 6;
      // Belt and braces: never begin the fall outside the playable world.
      p1.x = Math.max(40, Math.min(BR_WORLD_W - (p1.w || 30) - 40, p1.x));
    }
  } else if (!brLanded) {
    if (p1) {
      p1.vx = 0;
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

  // ── Bot drops ────────────────────────────────────────────
  minions.forEach(function(bot) {
    if (!bot._brOnPlane) return;
    // Keep bot locked to plane
    bot.x        = brPlaneX - (bot.w || 30) / 2;
    bot.y        = BR_PLANE_Y;
    bot.vx       = 0; bot.vy = 0;
    bot.onGround = false;

    // Drop when plane reaches bot's chosen X (or auto-drop if plane exits map)
    if (brPlaneX >= bot._brDropX || brPlaneX > BR_WORLD_W) {
      bot._brOnPlane = false;
      bot._brDropped = true;
      bot.vy = 6;
    }
  });

  // Once P1 has landed, check if all bots have dropped to end plane phase
  if (brLanded) {
    var anyOnPlane = minions.some(function(b) { return b._brOnPlane; });
    if (!anyOnPlane) brPlaneFlight = false;
  }
}

// ── Freefall + landing handler for bots (called every frame) ──
function _brUpdateBotFalls() {
  minions.forEach(function(bot) {
    if (!bot._brBot || !bot._brDropped || bot._brLanded || bot.health <= 0) return;
    bot.vx = 0; // straight-down fall
    if (bot.onGround) {
      bot._brLanded  = true;
      bot.invincible = 90;
      bot.target     = players[0] || null;
    }
    if (bot.y > BR_DEATH_Y) {
      bot.health = 0;
      bot._brLanded = true;
    }
  });
}

// ============================================================
// RIFTS — paired fast travel
// ============================================================
// The only way into the sky, the quickest way out of the deep, and the only way
// to outrun a surge across the map. Contact teleports to the paired gate; the
// fighter then carries a cooldown so a pair cannot be ridden back and forth.
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

    // ── Beacon ────────────────────────────────────────────────────────────────
    // A rift you cannot find is not fast travel. The gate itself is small against
    // a 12000px world, so it gets a column of light that reads from off-screen —
    // that is what you navigate toward, the ellipse is just where you arrive.
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

    // Ground pool under the gate
    ctx.globalAlpha = 0.5 * pulse;
    ctx.fillStyle = g.color;
    ctx.beginPath(); ctx.ellipse(g.x, g.y + 52, 58, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // ── Halo ──────────────────────────────────────────────────────────────────
    var grd = ctx.createRadialGradient(g.x, g.y, 4, g.x, g.y, BR_RIFT_R + 46);
    grd.addColorStop(0, _brRiftRGBA(g.color, 0.85));
    grd.addColorStop(0.45, _brRiftRGBA(g.color, 0.30));
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.75 * pulse;
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(g.x, g.y, BR_RIFT_R + 46, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // ── The tear ──────────────────────────────────────────────────────────────
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

    // Orbiting motes, so a rift reads as active rather than painted on
    for (var m = 0; m < 5; m++) {
      var a2 = t * 1.4 + m * (Math.PI * 2 / 5);
      var ox = g.x + Math.cos(a2) * (BR_RIFT_R * 0.95);
      var oy = g.y + Math.sin(a2 * 1.3) * (BR_RIFT_R * 1.25);
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(a2 * 2);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ox, oy, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Label ─────────────────────────────────────────────────────────────────
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

// '#rrggbb' -> 'rgba(r,g,b,a)'. The gradients above need per-stop alpha, which a
// hex string cannot carry.
function _brRiftRGBA(hex, a) {
  var h = String(hex || '#ffffff').replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var n = parseInt(h, 16);
  if (!isFinite(n)) return 'rgba(255,255,255,' + a + ')';
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

// ============================================================
// WILDLIFE — neutral, optional, never part of the win condition
// ============================================================
// Beasts and yetis live in the dangerous landmarks. They are NOT contenders:
// they are excluded from the placement count, from brAlive, and from the win
// check, so ignoring them entirely is always a legal way to play. They exist to
// make the high-loot areas cost something other than other players.
function _brSpawnWildlife() {
  BR_LANDMARKS.forEach(function (L) {
    (L.wildlife || []).forEach(function (w) {
      var wx = L.x + w[0];
      var wy = (L.layer === 'under' ? BR_CAVE_FLOOR_Y : BR_GROUND_Y) - 90;
      var ent = null;
      if (w[1] === 'beast' && typeof ForestBeast !== 'undefined') ent = new ForestBeast(wx, wy);
      else if (w[1] === 'yeti' && typeof Yeti !== 'undefined')    ent = new Yeti(wx, wy);
      if (!ent) return;
      ent._brWildlife = true;   // <- the flag every BR head-count checks
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

// ============================================================
// SURFACE HAZARDS — localized lava (the volcano band)
// ============================================================
// The arena-wide `hasLava` / `lavaY` flag is a single global lava PLANE, which
// cannot express one pool inside one band, so BR carries its own hazard rects.
// Lava sits on top of the floor: standing in it hurts and launches you out, it
// never removes the ground under you. Contact damage goes through dealDamage()
// with a null attacker, so the env-damage cap applies like every other hazard.
function _brUpdateHazards() {
  if (!brHazards.length) return;
  var all = players.concat(minions);
  for (var h = 0; h < brHazards.length; h++) {
    var hz = brHazards[h];
    if (hz.type !== 'lava') continue;
    for (var i = 0; i < all.length; i++) {
      var f = all[i];
      if (!f || f.health <= 0 || f._brOnPlane) continue;
      // Sleeping bots are skipped by the physics loop, so their timers are
      // frozen — resolving a hazard against them would be a no-op anyway.
      if (f._brSleep) continue;
      var fx = f.cx(), fy = f.y + (f.h || 50);
      if (fx < hz.x || fx > hz.x + hz.w) continue;
      if (fy < hz.y || fy > hz.y + hz.h + 20) continue;
      // Bounce out with enough height to clear the rim, and grant the ground
      // jump so the escape is not a few px short (the lava-escape fix pattern).
      if (f.vy > -6) f.vy = -12;
      f._lavaJumpGrace = 12;
      f._brLavaTick = (f._brLavaTick || 0) + 1;
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
    ctx.fillRect(hz.x - 8, hz.y - 34, hz.w + 16, 34);   // heat glow
    ctx.restore();
  }
}

// ============================================================
// VOID DEATH
// ============================================================
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

// ============================================================
// ZONE UPDATE — 30s wait → 10s linear close → repeat
// ============================================================
function _brUpdateZone() {
  if (!brLanded) return;
  if (brZoneState === 'final') {
    // Just deal damage, no more movement
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
        brZoneCloseLen = brZoneTimer;   // HUD needs the length this phase actually got
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
    // Damage scales exponentially with zone phase (1.30x per phase) so the late
    // storm is still a wall while the early one is survivable on purpose: at the
    // slower ring pace you are expected to dip into it to reach a chest or cut a
    // corner, and 1.45^phase priced that out of the game entirely.
    var phaseMult = Math.pow(1.30, Math.min(brZonePhase, 7));
    players.concat(minions).forEach(function(f) {
      if (!f || f.health <= 0) return;
      var inStorm = f.cx() < brZoneLeft || f.cx() > brZoneRight ||
                   f.cy() < brZoneTop  || f.cy() > brZoneBottom;
      if (inStorm) {
        // Per-fighter exposure counter: each continuous second in storm adds 20%
        // more damage, capped at 3x so it stays finite.
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

// ============================================================
// BOX BREAKING — proximity attack deals damage to box
// ============================================================
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
          // Credit goes to whoever landed the last hit on the crate — `f` is the
          // fighter this iteration is resolving contact for.
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

// ============================================================
// GROUND ITEM SYSTEM
// ============================================================
function _brDropGroundItem(item, x, y) {
  brGroundItems.push({ x: x, y: y, vy: -3, item: item, life: 900 }); // ~15s at 60fps
}

function _brUpdateGroundItems() {
  var all = players.concat(minions);
  for (var gi = brGroundItems.length - 1; gi >= 0; gi--) {
    var gi_item = brGroundItems[gi];
    gi_item.life--;
    // Simple gravity + floor check
    gi_item.vy += 0.4;
    gi_item.y  += gi_item.vy;
    // Settle on nearest platform below
    var plats = currentArena && currentArena.platforms;
    if (plats) {
      for (var pi = 0; pi < plats.length; pi++) {
        var pl = plats[pi];
        if (gi_item.y >= pl.y - 2 && gi_item.y <= pl.y + 14 &&
            gi_item.x >= pl.x && gi_item.x <= pl.x + pl.w && gi_item.vy > 0) {
          gi_item.y  = pl.y - 2;
          gi_item.vy = 0;
          break;
        }
      }
    }
    if (gi_item.life <= 0) { brGroundItems.splice(gi, 1); continue; }

    // Bots auto-pickup if inventory has space
    for (var bi = 0; bi < minions.length; bi++) {
      var bot = minions[bi];
      if (!bot || !bot._brBot || bot.health <= 0 || !bot._brLanded) continue;
      if (Math.abs(bot.cx() - gi_item.x) < 40 && Math.abs((bot.y + (bot.h || 50)) - gi_item.y) < 50) {
        if (!bot._brInv) bot._brInv = [null, null, null, null, null];
        var bIt = gi_item.item;
        // A weapon is only picked up if it beats what is already in hand, and it
        // is equipped straight away rather than filed in a slot. The old rule was
        // "equip whatever you touched, most recent wins", which let a bot trade a
        // legendary for the uncommon it walked over ten seconds later — and with
        // a full bag it would not pick the legendary up at all.
        if (bIt.type === 'weapon') {
          if (_brWeaponRank(bIt.weaponKey) <= _brWeaponRank(bot.weaponKey)) continue;
          _brApplyItem(bIt, bot);
          brGroundItems.splice(gi, 1);
          break;
        }
        var bslot = bot._brInv.indexOf(null);
        if (bslot !== -1) {
          bot._brInv[bslot] = bIt;
          brGroundItems.splice(gi, 1);
          break;
        }
      }
    }
  }
}

// ============================================================
// ITEM PICKUP
// ============================================================
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

// ============================================================
// ITEM USE
// ============================================================
function _brApplyItem(item, fighter) {
  if (!item || !fighter) return;
  if      (item.type === 'medkit') { fighter.health = Math.min(fighter.maxHealth, fighter.health + (item.heal || 50)); if (typeof spawnParticles === 'function') spawnParticles(fighter.cx(), fighter.cy(), '#44ff88', 12); }
  else if (item.type === 'shield') { fighter.shieldHP = (item.shield || 30); fighter.shielding = true; fighter._brShieldTimer = 300; if (typeof spawnParticles === 'function') spawnParticles(fighter.cx(), fighter.cy(), '#4488ff', 10); }
  else if (item.type === 'super')  { fighter.superMeter = 100; fighter.superReady = true; if (typeof spawnParticles === 'function') spawnParticles(fighter.cx(), fighter.cy(), '#ffdd00', 14); }
  else if (item.type === 'weapon' && item.weaponKey) { var w = WEAPONS[item.weaponKey]; if (w) { fighter.weaponKey = item.weaponKey; fighter.weapon = w; fighter.cooldown = 0; } }
}

// Pressing 1-5: select the slot; for weapon slots swap with equipped weapon immediately
function selectBRSlot(s) {
  if (!brActive || s < 0 || s > 4) return;
  brActiveSlot = s;
  var item = brInventory[s];
  if (!item || item.type !== 'weapon') return;
  // Weapon slot: swap inventory weapon with currently equipped weapon
  var p = players.find(function(pl) { return !pl.isAI && pl.health > 0; });
  if (!p || !p.weaponKey || !p.weapon) return;
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
  if (!item || item.type === 'weapon') return; // weapons are swapped via selectBRSlot, not consumed
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

// Legacy: kept for backward compatibility (was the old item-use on number press)
function useBRItem(slotIdx) { selectBRSlot(slotIdx); }

// ============================================================
// BOT AI
// ============================================================
// The previous brain was four if-statements deep and ran the whole field on one
// frame every 10. It could not answer any of the questions a battle royale
// actually asks — is this ring going to catch me, is this weapon better than the
// one in my hands, is this fight worth taking, should I drink before I walk in —
// so 99 fighters wandered into the storm holding uncommon swords.
//
// This is a small utility brain: a scored state per bot, re-evaluated on a
// staggered schedule, writing a destination (or a real enemy) into bot.target and
// leaving all the moment-to-moment fighting to Fighter.updateAI(), which is
// already good at it. Nothing here touches health, damage or knockback.

// Rank a weapon by its loot tier so a bot can tell an upgrade from a downgrade.
// Anything unlisted sits just above bare fists, which is the honest answer: it is
// a real weapon, it is not one of the good ones.
function _brWeaponRank(key) {
  if (!key || key === 'combat') return 0;
  if (BR_WEAPON_TIERS.legendary.indexOf(key) !== -1) return 4;
  if (BR_WEAPON_TIERS.epic.indexOf(key)      !== -1) return 3;
  if (BR_WEAPON_TIERS.rare.indexOf(key)      !== -1) return 2;
  if (BR_WEAPON_TIERS.uncommon.indexOf(key)  !== -1) return 1;
  return 1;
}

// True distance, not the Manhattan approximation the old brain used. Manhattan
// across a world this shape rates a chest 600px straight down through solid rock
// as nearer than one 700px along the floor you are standing on.
function _brDist(ax, ay, bx, by) {
  var dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

// The ring the bot has to be inside by the time the next close finishes, and how
// many frames it has to get there. Reacting to the CURRENT ring is why bots died
// in the storm in bulk: by the time the wall is on top of you the walk is longer
// than the time left. Bots now rotate during the wait, like a player does.
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

// A rift is worth taking when it genuinely shortens the trip. Cost of the trip
// through a gate is (walk to the gate) + (walk from its exit to the destination);
// compare that against walking there directly and only commit on a clear win, so
// bots do not ping-pong between two gates that are each marginally better.
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

// Point the bot at a world position. _brNavLock tells Fighter.updateAI not to
// throw the waypoint away on its next retarget sweep (see _brNavLock there).
function _brGoTo(bot, wx, wy) {
  bot.target     = _brFakeTarget(wx, wy);
  bot._brNavLock = true;
}

// Point the bot at something it should actually fight, and hand target selection
// back to the normal brain.
function _brEngage(bot, enemy) {
  bot.target     = enemy;
  bot._brNavLock = false;
}

// Inventory management — what to drink, when, and what to keep.
function _brBotUseItems(bot, threatD, recentlyHurt) {
  if (!bot._brInv) bot._brInv = [null, null, null, null, null];
  var hpPct = bot.health / bot.maxHealth;
  var calm  = threatD > 620 && !recentlyHurt;

  for (var s = 0; s < 5; s++) {
    var it = bot._brInv[s];
    if (!it) continue;

    // Medkits: topping off between fights is the whole point of carrying one.
    // The old rule (below 40%, any time) meant bots walked into the final ring
    // at 45% health with two full medkits in the bag, then drank mid-combo and
    // ate the follow-up. Heal when it is free, or when it is desperate.
    if (it.type === 'medkit' && hpPct < 0.98) {
      var wasteful = (bot.maxHealth - bot.health) < (it.heal || 50) * 0.55;
      if ((calm && !wasteful) || hpPct < 0.35) {
        _brApplyItem(it, bot); bot._brInv[s] = null; return true;
      }
    }

    // Shields go up BEFORE contact, not after — a shield popped at 50% health
    // has already let the damage through that it was carried to prevent.
    if (it.type === 'shield' && !bot._brShieldTimer &&
        (threatD < 520 || hpPct < 0.55)) {
      _brApplyItem(it, bot); bot._brInv[s] = null; return true;
    }

    // Supers are for a fight that is already happening.
    if (it.type === 'super' && !bot.superReady && threatD < 360) {
      _brApplyItem(it, bot); bot._brInv[s] = null; return true;
    }

    // A weapon sitting in the bag that beats the one in hand is a mistake the
    // old brain made permanently: it equipped on pickup and never looked again,
    // so a legendary picked up second went into a slot and stayed there.
    if (it.type === 'weapon' && it.weaponKey &&
        _brWeaponRank(it.weaponKey) > _brWeaponRank(bot.weaponKey)) {
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
    // Staggered thinking: each bot re-decides every 12 frames, but on its own
    // frame. Deciding the whole field on one frame is a visible hitch with 99 of
    // them and buys nothing — a bot's plan does not need to be 12 frames fresh.
    if ((_fc + bi * 7) % 12 !== 0) continue;
    if (!bot._brInv) bot._brInv = [null, null, null, null, null];

    var bx = bot.cx(), by = bot.cy();
    var hpPct = bot.health / bot.maxHealth;
    var armed = _brWeaponRank(bot.weaponKey);
    var skill = bot.aiDiff === 'expert' ? 3 : bot.aiDiff === 'hard' ? 2 : bot.aiDiff === 'medium' ? 1 : 0;
    var recentlyHurt = (_fc - (bot._lastAttackerFrame || -9999)) < 150;

    // ── Threat picture ────────────────────────────────────────
    // Nearest hostile, and whether anyone is actually close enough to matter.
    // Wildlife counts as a threat but never as a target worth seeking out.
    var foe = null, foeD = Infinity;
    for (var ai = 0; ai < all.length; ai++) {
      var f = all[ai];
      if (f === bot || !f || f.health <= 0 || f._brOnPlane) continue;
      if (typeof areAlliedEntities === 'function' && areAlliedEntities(bot, f)) continue;
      var fd = _brDist(bx, by, f.cx(), f.cy());
      if (fd < foeD) { foeD = fd; foe = f; }
    }

    // ── Items ────────────────────────────────────────────────
    if (_brBotUseItems(bot, foeD, recentlyHurt)) continue;

    // ── 1. Storm, predictively ───────────────────────────────
    var inStorm  = bx < brZoneLeft || bx > brZoneRight;
    var pad      = 220 + skill * 70;
    var needX    = Math.max(ringL + pad, Math.min(ringR - pad, bx));
    var travel   = Math.abs(needX - bx);
    // Real bots do not travel at their top speed — they jump, get knocked about
    // and take the long way round terrain. 45% of nominal is the measured rate
    // over a landmark, and using top speed here is what made "I have time" wrong.
    var reachFrames = travel / (4.6 * 0.45);
    var mustRotate  = reachFrames > win.frames * 0.70;

    if (inStorm || mustRotate) {
      // A fight is still a fight if it is in your face, but anything further than
      // arm's reach loses to the wall. Lower-skill bots hold on to the fight for
      // longer, which is exactly how a weaker player dies to the storm.
      var clingRange = 150 - skill * 30;
      if (!inStorm && foe && foeD < clingRange) { _brEngage(bot, foe); continue; }

      var gate = (skill >= 1) ? _brBestRift(bot, needX, by) : null;
      if (gate) _brGoTo(bot, gate.x, gate.y);
      else      _brGoTo(bot, needX, by);
      continue;
    }

    // ── 2. Fight or decline ──────────────────────────────────
    // A bot with fists that runs at an armed enemy is a free elimination and it
    // is why the field used to evaporate in the first minute. Engage when you
    // have a real reason to: you are armed, or they are on top of you anyway.
    if (foe && foeD < 900) {
      var foeArmed  = _brWeaponRank(foe.weaponKey);
      var foeHpPct  = foe.maxHealth ? foe.health / foe.maxHealth : 1;
      var outgunned = (foeArmed - armed) >= 2 || (hpPct < 0.35 && foeHpPct > hpPct + 0.25);
      var committed = foeD < 200 || recentlyHurt;

      if (committed || (!outgunned && (armed > 0 || foeArmed === 0) && foeD < 560)) {
        _brEngage(bot, foe);
        continue;
      }
      if (outgunned && foeD < 420 && !committed) {
        // Break off: put distance between you and the fight, back toward the
        // middle of the ring rather than blindly away (away is often the storm).
        var awayX = bx + (bx < foe.cx() ? -1 : 1) * 700;
        awayX = Math.max(ringL + pad, Math.min(ringR - pad, awayX));
        _brGoTo(bot, awayX, by);
        continue;
      }
    }

    // ── 3. Loot ──────────────────────────────────────────────
    // Drive scales with need: an unarmed bot will cross a landmark for a chest,
    // a fully kitted one only picks up what it trips over.
    var invSpace = bot._brInv.indexOf(null) !== -1;
    var lootUrge = armed === 0 ? 2600 : (invSpace || hpPct < 0.75) ? 1400 : 500;

    var pick = null, pickD = Infinity, pickIsGround = false;
    for (var gi = 0; gi < brGroundItems.length; gi++) {
      var g = brGroundItems[gi];
      var gd = _brDist(bx, by, g.x, g.y);
      // Never walk past a free upgrade lying on the floor.
      var wants = invSpace ||
        (g.item.type === 'weapon' && _brWeaponRank(g.item.weaponKey) > _brWeaponRank(bot.weaponKey));
      if (wants && gd < pickD && gd < lootUrge) { pickD = gd; pick = g; pickIsGround = true; }
    }
    if (!pick || pickD > 320) {
      for (var ci = 0; ci < brLootBoxes.length; ci++) {
        var box = brLootBoxes[ci];
        if (box.opened || box.health <= 0) continue;
        // Only chests inside the ring the bot is heading for. Looting into the
        // storm is the single most common way a bot used to kill itself.
        if (box.x < ringL + 60 || box.x > ringR - 60) continue;
        var cd = _brDist(bx, by, box.x, box.y);
        if (cd < pickD && cd < lootUrge) { pickD = cd; pick = box; pickIsGround = false; }
      }
    }

    if (pick) {
      _brGoTo(bot, pick.x, pick.y - (pickIsGround ? 0 : 10));
      continue;
    }

    // ── 4. Rotate ────────────────────────────────────────────
    // Nothing to loot, nobody worth fighting: move toward the ring, but toward a
    // part of it worth holding. Picking a landmark rather than the bare centre is
    // what stops the whole surviving field from stacking on one pixel.
    if (foe && foeD < 1800) { _brEngage(bot, foe); continue; }

    if (!bot._brRoamX || Math.abs(bx - bot._brRoamX) < 240 ||
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

// ── Travel ────────────────────────────────────────────────────────────────────
// When a bot is nav-locked it is going somewhere, not fighting, and BR drives it
// directly instead of letting the duelling brain "chase" a waypoint. The duelling
// brain's chase is built for a 900px arena with one opponent in it: it walks at
// the target's X, jumps on a die roll, and swings whenever the target is within
// weapon range — which against an invisible waypoint means a bot that travels in
// a straight line, cannot climb, and plays an attack animation on arrival.
//
// Routed through the platform graph so bots use the actual terrain: ledges out of
// the caverns, roofs in the city, the climb under the volcano vent.
function _brNavStep(bot) {
  var t = bot.target;
  if (!t) { bot._brNavLock = false; return; }
  var tx = t.cx(), ty = t.cy();
  var spd = (bot.aiDiff === 'easy' ? 3.6 : bot.aiDiff === 'medium' ? 4.5 :
             bot.aiDiff === 'hard' ? 5.2 : 5.6);

  var wpX = tx, wpY = ty, wantJump = false;
  if (typeof pfGetNextWaypoint === 'function') {
    var wp = pfGetNextWaypoint(bot, tx, ty);
    if (wp) {
      wpX = wp.x; wpY = wp.y;
      wantJump = (wp.action === 'jump');
    }
  }

  var dx  = wpX - bot.cx();
  var dir = dx > 0 ? 1 : -1;
  if (Math.abs(dx) > 14) {
    bot.vx = dir * spd;
    bot.facing = dir;
  } else {
    bot.vx *= 0.6;
  }

  if (bot.onGround) {
    // Graph says jump, the waypoint is above us, or we are pressed against
    // something that is not moving — all three are the same instruction.
    var blocked = Math.abs(bot.x - (bot._brNavLastX !== undefined ? bot._brNavLastX : bot.x)) < 1.2
                  && Math.abs(dx) > 30;
    if (wantJump || wpY < bot.y - 40 || blocked) bot.vy = -20;
  } else if (bot.canDoubleJump && bot.vy > 0 && (wantJump || wpY < bot.y - 30)) {
    bot.vy = -17; bot.canDoubleJump = false;
  }
  bot._brNavLastX = bot.x;
}

// ============================================================
// PLAYER FEATS — the Battle Royale achievements
// ============================================================
// All three counters are match-scoped and all three are read from state that
// already exists: dealDamage()'s attribution stamp for eliminations, the crate
// break loop for loot, and the landmark table for zones. Nothing here changes
// what happens in the match — it only watches.
// Called by dealDamage() on a killing blow — see the note there for why the
// credit cannot be taken from BR's own update. Wildlife is not a contender, and
// storm/lava kills arrive with a null attacker and correctly count for nobody.
function _brCreditElimination(attacker, target) {
  if (!brActive || !target || target._brKillCounted) return;
  if (target._brWildlife) return;
  target._brKillCounted = true;
  if (!attacker || attacker.isAI || attacker.isBoss) return;
  brPlayerKills++;
  if (typeof unlockAchievement !== 'function') return;
  if (brPlayerKills >= 10) unlockAchievement('br_kills_10');
  if (brPlayerKills >= 25) unlockAchievement('br_kills_25');
  if (brPlayerKills >= 50) unlockAchievement('br_kills_50');
}

function _brTrackPlayerFeats() {
  var p = players.find(function (pl) { return pl && !pl.isAI; });
  if (!p) return;

  // ── Zones visited ───────────────────────────────────────────
  // Strict containment, not brLandmarkAt() — that one falls back to the nearest
  // band in the layer so it never returns null, which would credit the whole sky
  // to Cloud Kingdom from anywhere above the crust.
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

// ============================================================
// WIN CONDITION
// ============================================================
function _brCheckWin() {
  var all = players.concat(minions);
  brAlive = all.filter(_brIsContender).length;

  // Safety net: if every surviving entity other than (possibly) P1 is asleep,
  // the player can never reach them. Wake one sleeping bot per second so the
  // game eventually resolves instead of stalling indefinitely.
  if (brAlive > 1 && brLanded && typeof frameCount !== 'undefined' && frameCount % 60 === 0) {
    var awakeCount = all.filter(function(f) { return _brIsContender(f) && !f._brSleep; }).length;
    if (awakeCount <= 1) {
      for (var _wi = 0; _wi < minions.length; _wi++) {
        if (minions[_wi] && minions[_wi].health > 0 && minions[_wi]._brSleep) {
          minions[_wi]._brSleep = false;
          break;  // one per second — avoids frame-rate spike from mass wakeup
        }
      }
    }
  }

  if (brAlive <= 1 && !brWinner && gameRunning) {
    brWinner = all.find(_brIsContender) || null;
    var msg;
    if (brStoryBearers) {
      // The point of the chapter is the count, not a scoreboard placing: he is
      // the only one of ninety-five still standing.
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

// ============================================================
// SPECTATE
// ============================================================
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

function _brUpdateSpectate() {
  if (!brSpectating) return;
  if (brElimBanner > 0) brElimBanner--;
  // Refresh list — remove newly dead fighters
  brSpectateList = minions.filter(_brIsContender);
  if (brSpectateList.length === 0) { brSpectateTarget = null; return; }
  // If current target died, auto-switch to next
  if (!brSpectateTarget || brSpectateTarget.health <= 0) {
    brSpectateIdx    = Math.min(brSpectateIdx, brSpectateList.length - 1);
    brSpectateTarget = brSpectateList[brSpectateIdx];
  }
}

// ============================================================
// BOT SLEEP CULLING — freeze bots far from camera each frame
// ============================================================
// True only when the local human player threw or ate this hit. dealDamage() uses
// it to decide whether a hit is allowed to drive the world-wide impact globals —
// see the "Impact juice scope" note in smb-combat.js.
function _brIsLocalPlayerHit(attacker, target) {
  if (!brActive) return true;
  for (var i = 0; i < players.length; i++) {
    var p = players[i];
    if (!p || p.isAI || p.isRemote) continue;
    if (attacker === p || target === p) return true;
  }
  return false;
}

// ── Dormant tick ──────────────────────────────────────────────────────────────
// Sleeping bots have their whole update() skipped by the main loop, and
// Fighter.update() is the ONLY place `invincible` is decremented. So a slept bot
// froze its i-frames: landing armed 90 of them, the first storm tick re-armed 16
// more, and the counter never ticked down again. The bot was permanently immune
// to the storm and to everything else — which is exactly why off-screen bots
// survived to the end and won every match.
//
// Freezing a bot's PHYSICS is the point of the cull; freezing its TIMERS was
// never intended. Tick them here, cheaply, so a dormant bot is still mortal.
// Ground height under a world X, for the cheap fall integrator. Only two levels
// exist: the surface crust, and the cavern floor under the shaft.
function _brGroundYAt(x) {
  // Falls through an authored sinkhole or the volcano vent land on the cavern
  // floor; everything else lands on the surface crust.
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
  // Cheap fall integrator for a sleeping bot that has not landed yet. Full
  // physics for 99 simultaneous drops is what made the opening of every match
  // stutter; off-screen nobody can tell the difference between this and the real
  // thing, and the bot is handed back to real physics the moment it wakes.
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
  // ── Off-screen life ──────────────────────────────────────────────────────
  // A sleeping bot used to stand exactly where it landed until the camera came
  // near, which meant most of the field was deleted by the storm rather than
  // eliminated, and the last ring was whoever happened to drop closest to it.
  // This is not AI — it is bookkeeping at a plausible pace, so that a bot handed
  // back to the real brain is in the right postcode carrying the right gear.
  //
  // Two jobs, one goal: walk somewhere useful, and open what you walk past. The
  // chests are the REAL ones, so the map is genuinely being emptied by ninety-
  // nine people even where the player cannot see it happening.
  var _live = bot._brLanded && brLanded && typeof frameCount !== 'undefined';
  var _salt = (bot._brTickSalt || 0);

  // Re-pick a destination every ~2.5s: the ring first (it is not optional), then
  // the nearest crate still worth walking to.
  if (_live && (frameCount + _salt * 11) % 150 === 0) {
    var _w    = _brSafeWindow();
    var _pad  = 320;
    // Per-bot offset, or every dormant bot in a band walks to the same pixel and
    // arrives as one stack — which is exactly what the player then wakes up.
    var _off  = ((_salt % 11) - 5) * 60;
    var _ring = Math.max(_w.left + _pad, Math.min(_w.right - _pad, bot.cx() + _off));
    bot._brDormGoal = _ring;
    if (!bot._brInv) bot._brInv = [null, null, null, null, null];
    // A bot with a full bag and a good weapon has no business emptying the map.
    // Without this the off-screen field hoovered all 200 chests inside twenty
    // seconds and the player arrived at a world with nothing left in it.
    var _wants = bot._brInv.indexOf(null) !== -1 || _brWeaponRank(bot.weaponKey) < 3;
    if (_wants && Math.abs(_ring - bot.cx()) < 400
        && bot.cx() > brZoneLeft + 500 && bot.cx() < brZoneRight - 500) {
      // Comfortably inside the ring — go shopping instead. 2200px is about as
      // far as a bot could actually walk between two ring moves.
      var _bd = Infinity, _bx3 = null;
      for (var _li = 0; _li < brLootBoxes.length; _li++) {
        var _box = brLootBoxes[_li];
        if (_box.opened || _box.health <= 0) continue;
        if (_box.x < _w.left + 60 || _box.x > _w.right - 60) continue;
        var _d3 = Math.abs(_box.x - bot.cx());
        if (_d3 < _bd && _d3 < 2200) { _bd = _d3; _bx3 = _box; }
      }
      if (_bx3) bot._brDormGoal = _bx3.x;
    }
  }

  // Walk. Sky bots are left alone: their floor is a cloud, and sliding one along
  // its X would drop it off the edge of the Cloud Kingdom with nothing to catch
  // it in this cheap integrator.
  if (_live && bot._brDormGoal !== undefined && brLayerAt(bot.cy()) !== 'sky') {
    var _dx = bot._brDormGoal - bot.cx();
    // Pace. A stroll is right for shopping and fatally wrong for a wall that is
    // moving at ~3.6px/frame: the first close used to eat forty bots outright
    // because the dormant walk (2.4) was slower than the ring chasing them.
    // Anything at or beyond the edge runs.
    var _urgent = bot.cx() < brZoneLeft + 500 || bot.cx() > brZoneRight - 500;
    var _pace   = _urgent ? 5.0 : 2.4;
    if (Math.abs(_dx) > 30) {
      bot.x += Math.sign(_dx) * Math.min(Math.abs(_dx), _pace);
      // Keep feet on whatever surface owns this column, so a bot that drifts over
      // a sinkhole does not wake up standing in mid-air.
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
      // Only consume a crate this bot would actually be better off for. A crate
      // it walks past stays in the world for whoever comes next — including the
      // player, who otherwise inherits an already-stripped map.
      if (_bx2.item.type === 'weapon') {
        if (_brWeaponRank(_bx2.item.weaponKey) <= _brWeaponRank(bot.weaponKey)) continue;
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

function _brCullBots() {
  // In endgame (≤10 alive) wake everyone — frozen bots would be unkillable otherwise.
  var endgame = brAlive <= 10;
  var camX = typeof camXCur !== 'undefined' ? camXCur : BR_WORLD_W / 2;
  var camY = typeof camYCur !== 'undefined' ? camYCur : BR_WORLD_H / 2;
  minions.forEach(function(bot) {
    if (bot._brWildlife) { bot._brSleep = Math.abs(bot.cx() - camX) > 2000; return; }
    if (!bot._brBot || bot.health <= 0) return;
    // Still on the plane: _brUpdatePlane writes their position directly, so a
    // full Fighter.update() is pure waste. Every bot sits at the plane, which is
    // also where the camera is, so NOTHING was culled during the drop phase and
    // all 99 ran full physics at once — measured at ~3fps. They are inert cargo
    // until they drop.
    if (bot._brOnPlane) { bot._brSleep = true; return; }
    // Falling bots used to be forced awake so gravity could land them, which
    // meant ALL 99 ran full Fighter.update() simultaneously for the whole drop —
    // the frame-rate crater at the start of every match. They sleep like anything
    // else now; _brDormantTick integrates their fall cheaply instead.
    if (bot._brDropped && !bot._brLanded && Math.abs(bot.cx() - camX) < 1400) {
      bot._brSleep = false; return;
    }
    if (endgame) { bot._brSleep = false; return; }
    var dx = Math.abs(bot.cx() - camX);
    var dy = Math.abs(bot.cy() - camY);
    // Only sleep bots that are also safely inside the zone — bots outside the zone
    // still need storm-damage applied each tick (which happens in _brZoneDamage regardless
    // of sleep state), but bots inside the zone that are far away can safely freeze.
    bot._brSleep = (dx > 2000 || dy > 1200);
    if (bot._brSleep) _brDormantTick(bot);
  });
}

// ============================================================
// MAIN UPDATE
// ============================================================
function updateBattleRoyale() {
  if (!brActive || !gameRunning) return;
  _brUpdatePlane();
  _brUpdateBotFalls();
  _brCheckVoidDeaths();
  _brUpdateHazards();
  _brUpdateRifts();
  _brCullBots();
  _brUpdateZone();
  _brCheckBoxBreaking();
  _brUpdateGroundItems();
  _brUpdateBots();
  _brUpdateSpectate();
  _brTrackPlayerFeats();
  _brCheckWin();
}

// Landmark names, painted into the sky above each named band. Without them a
// 12000px world reads as undifferentiated scenery and "go to the volcano" is not
// a plan the player can actually form.
function _brDrawLandmarkSigns() {
  ctx.save();
  ctx.textAlign = 'center';
  BR_LANDMARKS.forEach(function (L) {
    if (L.danger === 0) return;                    // plains/dunes are connective tissue
    // Each sign lives inside its own layer, or the sky band's name lands on top
    // of the surface band's directly beneath it.
    var cx = L.x + L.w / 2;
    var y  = L.layer === 'sky'   ? 120
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

// ============================================================
// DRAW — WORLD SPACE (called while camera transform is active)
// ============================================================
function drawBattleRoyaleWorld() {
  if (!brActive) return;
  ctx.save();

  // The void band that used to live here is gone with the shaft map — there is
  // no killing floor any more, so drawing a death gradient would be a lie.
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

  // Loot chests — unknown crates (no icon revealed until broken)
  var _fc = typeof frameCount !== 'undefined' ? frameCount : 0;
  brLootBoxes.forEach(function(box) {
    if (box.opened) {
      // Break-open burst
      ctx.globalAlpha = box.anim / 30;
      ctx.fillStyle = box.item.color;
      ctx.beginPath(); ctx.arc(box.x, box.y, (30 - box.anim) * 0.9 + 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; return;
    }
    var pulse = 0.82 + 0.18 * Math.sin(_fc * 0.07);
    // Crate body
    ctx.fillStyle   = 'rgba(25,18,10,0.92)';
    ctx.strokeStyle = 'rgba(180,140,60,0.8)'; ctx.lineWidth = 2;
    ctx.fillRect(box.x - 13, box.y - 13, 26, 26);
    ctx.strokeRect(box.x - 13, box.y - 13, 26, 26);
    // Crate cross-lines
    ctx.strokeStyle = 'rgba(140,110,40,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(box.x - 13, box.y); ctx.lineTo(box.x + 13, box.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(box.x, box.y - 13); ctx.lineTo(box.x, box.y + 13); ctx.stroke();
    // Question mark (contents unknown)
    ctx.shadowColor = 'rgba(200,160,60,0.7)'; ctx.shadowBlur = 5 * pulse;
    ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,180,80,0.9)';
    ctx.fillText('?', box.x, box.y + 5); ctx.shadowBlur = 0;
    // Health bar (shows when damaged)
    if (box.health < box.maxHealth) {
      var hFrac = box.health / box.maxHealth;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(box.x - 13, box.y + 14, 26, 4);
      ctx.fillStyle = hFrac > 0.5 ? '#88dd44' : '#ffaa22';
      ctx.fillRect(box.x - 13, box.y + 14, 26 * hFrac, 4);
    }
  });

  // Ground items — dropped loot waiting to be picked up (F key)
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
    ctx.globalAlpha = 1;
  });

  // Plane
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

// ============================================================
// DRAW — HUD / SCREEN SPACE
// Resets transform to base scale so coordinates match GAME_W/GAME_H
// regardless of where the camera is in the 9000-wide world.
// ============================================================
function drawBattleRoyaleHUD() {
  if (!brActive || !gameRunning) return;
  ctx.save();
  // Pin HUD to screen: use base scale only, ignoring camera offset
  var bsX = canvas.width  / GAME_W;
  var bsY = canvas.height / GAME_H;
  ctx.setTransform(bsX, 0, 0, bsY, 0, 0);

  var _fc = typeof frameCount !== 'undefined' ? frameCount : 0;

  // Compute safe top margin below the DOM HUD (HUD is position:fixed, overlays canvas top)
  var _brTopY = (typeof _hudBottom === 'function' && canvas.clientHeight > 0)
    ? Math.ceil(_hudBottom() * GAME_H / canvas.clientHeight) + 6
    : 8;

  // ── Plane drop prompt ────────────────────────────────────
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

  // ── Player count badge (top centre) ──────────────────────
  ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center';
  var cStr = brStoryBearers
    ? '◈ ' + brAlive + ' / ' + brFieldTotal + '  BEARERS'
    : '🏆 ' + brAlive + ' / ' + brFieldTotal;
  var cW   = ctx.measureText(cStr).width + 24;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(GAME_W / 2 - cW / 2, _brTopY, cW, 26);
  ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
  ctx.fillText(cStr, GAME_W / 2, _brTopY + 18); ctx.shadowBlur = 0;

  // ── Match tally (under the player count) ──────────────────
  // Eliminations, crates and zones are the three Battle Royale achievements, so
  // they are the three numbers on screen. A run at 8 kills or 13 of 15 zones is
  // only worth chasing if you can see it.
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

  // ── Zone status (top right) ───────────────────────────────
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

  // ── Pickup prompt: show when P1 is near a ground item ────
  var _p1hud = players[0];
  if (_p1hud && _p1hud.health > 0 && !brSpectating) {
    var _nearItem = null;
    for (var _gi = 0; _gi < brGroundItems.length; _gi++) {
      var _g = brGroundItems[_gi];
      if (Math.abs(_p1hud.cx() - _g.x) < 52 && Math.abs((_p1hud.y + (_p1hud.h || 50) * 0.5) - _g.y) < 60) {
        _nearItem = _g.item; break;
      }
    }
    if (_nearItem) {
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

  // ── Inventory bar (bottom centre) ────────────────────────
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

  // ── Spectate overlay ──────────────────────────────────────
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

  // ── Minimap ───────────────────────────────────────────────
  _drawBRMinimap();

  ctx.restore();
}

// ============================================================
// MINIMAP
// ============================================================
function _drawBRMinimap() {
  // The world is horizontal now (12000 x 1600), so the minimap is a strip. The
  // old 180x150 box was shaped for the vertical shaft map and squashed a 7.5:1
  // world into 1.2:1, which made every distance on it a lie.
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

  // Landmark bands — the minimap's job is "where is the volcano", not "where is
  // platform 412", so it draws the named bands instead of platform silhouettes.
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
  // Ground line
  ctx.fillStyle = 'rgba(80,100,140,0.55)';
  ctx.fillRect(mmX, mmY + BR_GROUND_Y * scY, mmW, 1);
  // Rifts — the map's fast-travel network is useless if you cannot find the gates.
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
