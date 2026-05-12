'use strict';
// smb-battleroyale.js — Battle Royale: 100 players, plane drop, void death, zone, loot, minimap

// ============================================================
// CONSTANTS
// ============================================================
const BR_TOTAL        = 100;
const BR_WORLD_W      = 9000;   // horizontal world size
const BR_WORLD_H      = 2800;   // vertical world size (30 platform rows at ~85px spacing)
const BR_DEATH_Y      = 2800;   // fall past this → eliminated
const BR_LOOT_COUNT   = 200;    // loot chests on platforms
const BR_ZONE_DAMAGE  = 3;      // HP per zone tick
const BR_ZONE_TICK    = 60;     // frames between zone damage ticks
const BR_PLANE_Y      = -180;   // world Y of the transport plane
const BR_PLANE_SPEED  = 14;     // px/frame (crosses 9000 units in ~640 frames ≈ 10.7s)
const BR_ZONE_WAIT_F  = 1800;   // 30s wait between zone moves
const BR_ZONE_CLOSE_F = 600;    // 10s linear close duration

// Zone target boundaries (left/right/top/bottom) — timing is always 30s wait + 10s close
const BR_ZONE_PHASES = [
  { left: 0,    right: 9000, top: 0,    bottom: 2800 }, // 0 — full map (initial state)
  { left: 700,  right: 8300, top: 200,  bottom: 2600 }, // 1
  { left: 1600, right: 7400, top: 450,  bottom: 2350 }, // 2
  { left: 2700, right: 6300, top: 700,  bottom: 2100 }, // 3
  { left: 3500, right: 5500, top: 900,  bottom: 1900 }, // 4
  { left: 4000, right: 5000, top: 1050, bottom: 1750 }, // 5
  { left: 4200, right: 4800, top: 1150, bottom: 1650 }, // 6
  { left: 4350, right: 4650, top: 1250, bottom: 1550 }, // 7 — final ring
];

// Loot pool
const BR_LOOT_POOL = [
  { type: 'medkit', label: 'Medkit',  icon: '💊', color: '#44ff88' },
  { type: 'medkit', label: 'Medkit',  icon: '💊', color: '#44ff88' },
  { type: 'shield', label: 'Shield',  icon: '🛡',  color: '#4488ff' },
  { type: 'super',  label: 'Super',   icon: '⚡',  color: '#ffdd00' },
  { type: 'weapon', label: null,      icon: '⚔',  color: '#cc88ff' },
  { type: 'weapon', label: null,      icon: '⚔',  color: '#cc88ff' },
];

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
var brLanded       = false;   // P1 has landed
var brBotsFallDone = false;   // all bots have been assigned drop points

// Spectate state
var brSpectating      = false;
var brSpectateTarget  = null;
var brSpectateList    = [];   // alive fighters to cycle through
var brSpectateIdx     = 0;
var brElimBanner      = 0;    // frames to show "ELIMINATED" banner

// ============================================================
// ARENA GENERATION — 30 platform tiers, no floor, void death
// ============================================================
function _makeBRArena() {
  var platforms = [];

  // 30 tiers from y=80 to y=2600 at ~85px spacing
  // Each tier: [minY, maxY, platformCount, minW, maxW, color]
  var tiers = [];
  var tierColors = ['#4a5060','#3d4855','#354060','#2a3550','#403050','#354545','#4a4535','#304050'];
  for (var t = 0; t < 30; t++) {
    var baseY  = 80 + t * 84;
    var count  = (t < 3 || t > 26) ? 5 : (t % 3 === 0 ? 8 : 6);
    var minW   = 90 + (t % 4) * 15;
    var maxW   = 160 + (t % 3) * 20;
    var col    = tierColors[t % tierColors.length];
    tiers.push([baseY, baseY + 30, count, minW, maxW, col]);
  }

  tiers.forEach(function(tier) {
    var minY = tier[0], maxY = tier[1], count = tier[2];
    var minW = tier[3], maxW = tier[4], col = tier[5];
    var step = BR_WORLD_W / count;
    var seed = minY * 7 + count * 13;
    function lcg() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; }
    for (var i = 0; i < count; i++) {
      var px = i * step + 60 + lcg() * (step - 120);
      var py = minY + lcg() * (maxY - minY);
      var pw = minW + lcg() * (maxW - minW);
      platforms.push({ x: Math.round(px), y: Math.round(py), w: Math.round(pw), h: 14, color: col });
    }
  });

  return {
    id: 'battleroyale',
    name: 'Battle Royale',
    bg: '#05050e',
    sky: ['#05050e', '#08081a'],
    groundColor: '#10101e',
    worldWidth: BR_WORLD_W,
    mapLeft: 0,
    mapRight: BR_WORLD_W,
    isBossArena: false,
    platforms: platforms,
  };
}

// ============================================================
// INIT
// ============================================================
function initBattleRoyale() {
  brActive       = true;
  brAlive        = BR_TOTAL;
  brZonePhase    = 0;
  brZoneState    = 'wait';
  brZoneTimer    = BR_ZONE_WAIT_F;
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
  brLanded       = false;
  brBotsFallDone = false;
  brSpectating      = false;
  brSpectateTarget  = null;
  brSpectateList    = [];
  brSpectateIdx     = 0;
  brElimBanner      = 0;

  currentArena = _makeBRArena();
  if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();

  var p1 = players[0];
  if (p1) {
    p1.x = brPlaneX - (p1.w || 30) / 2;
    p1.y = BR_PLANE_Y;
    p1.vx = 0; p1.vy = 0;
    p1.target = null;
    p1.lives  = 1;
    p1.invincible = 999999;
    p1._brOnPlane = true;
  }

  _brSpawnBots();
  _brSpawnLoot();
}

// ============================================================
// BOT SPAWNING — all bots start on plane, drop at random X
// ============================================================
function _brSpawnBots() {
  minions.length = 0;
  var humanCount = players.filter(function(p) { return !p.isAI; }).length;
  var botCount   = BR_TOTAL - humanCount;
  var palette    = ['#ff4444','#44aaff','#44ff88','#ffaa22','#cc44ff','#ff88cc','#22ddff','#ffff44','#ff8800','#00ffcc'];

  for (var i = 0; i < botCount; i++) {
    var wk   = WEAPON_KEYS[Math.floor(Math.random() * WEAPON_KEYS.length)];
    var diff = i < 30 ? 'easy' : i < 70 ? 'medium' : 'hard';
    var bot  = new Fighter(brPlaneX, BR_PLANE_Y, palette[i % palette.length], wk,
      { left: null, right: null, jump: null, attack: null, ability: null, super: null }, true, diff);
    bot.name       = 'P' + (i + 2);
    bot.lives      = 1;
    bot.playerNum  = 2 + (i % 4);
    bot._brBot     = true;
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

  function _makeItem() {
    var tpl  = BR_LOOT_POOL[Math.floor(Math.random() * BR_LOOT_POOL.length)];
    var item = { type: tpl.type, label: tpl.label, icon: tpl.icon, color: tpl.color };
    if (item.type === 'weapon') {
      var wk = WEAPON_KEYS[Math.floor(Math.random() * WEAPON_KEYS.length)];
      item.weaponKey = wk;
      item.label = (WEAPONS[wk] && WEAPONS[wk].name) || wk;
      item.icon  = '⚔';
    }
    return item;
  }

  plats.forEach(function(pl) {
    var count = 1 + Math.floor(Math.random() * 2);
    for (var ci = 0; ci < count && brLootBoxes.length < BR_LOOT_COUNT; ci++) {
      var lx = pl.x + 16 + Math.random() * Math.max(1, pl.w - 32);
      brLootBoxes.push({
        x: lx, y: pl.y - 20,
        item: _makeItem(),
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
      if (p1) { p1._brOnPlane = false; p1.vy = 6; }
    }
    if (p1 && typeof keysDown !== 'undefined' &&
        (keysDown.has('w') || keysDown.has(' '))) {
      brJumped = true;
      p1._brOnPlane = false;
      p1.vx = 0; p1.vy = 6;
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
    brZoneTimer--;
    if (brZoneTimer <= 0) {
      var ni = brZonePhase + 1;
      if (ni < BR_ZONE_PHASES.length) {
        brZoneTargetL = BR_ZONE_PHASES[ni].left;
        brZoneTargetR = BR_ZONE_PHASES[ni].right;
        brZoneTargetT = BR_ZONE_PHASES[ni].top;
        brZoneTargetB = BR_ZONE_PHASES[ni].bottom;
        brZoneSpeedL  = (brZoneTargetL - brZoneLeft)   / BR_ZONE_CLOSE_F;
        brZoneSpeedR  = (brZoneTargetR - brZoneRight)  / BR_ZONE_CLOSE_F;
        brZoneSpeedT  = (brZoneTargetT - brZoneTop)    / BR_ZONE_CLOSE_F;
        brZoneSpeedB  = (brZoneTargetB - brZoneBottom) / BR_ZONE_CLOSE_F;
        brZoneState   = 'close';
        brZoneTimer   = BR_ZONE_CLOSE_F;
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
      var hasNext = (brZonePhase + 1) < BR_ZONE_PHASES.length;
      brZoneState = hasNext ? 'wait' : 'final';
      brZoneTimer = hasNext ? BR_ZONE_WAIT_F : 0;
    }
  }

  _brZoneDamage();
}

function _brZoneDamage() {
  brZoneDmgTick++;
  if (brZoneDmgTick >= BR_ZONE_TICK) {
    brZoneDmgTick = 0;
    // Damage scales exponentially with zone phase (1.5x per phase) so late-game
    // storm is lethal and bots are strongly incentivised to flee.
    var phaseMult = Math.pow(1.5, Math.min(brZonePhase, 7));
    players.concat(minions).forEach(function(f) {
      if (!f || f.health <= 0) return;
      var inStorm = f.cx() < brZoneLeft || f.cx() > brZoneRight ||
                   f.cy() < brZoneTop  || f.cy() > brZoneBottom;
      if (inStorm) {
        // Per-fighter exposure counter: each continuous second in storm adds 20%
        // more damage, capped at 3x so it stays finite.
        f._brStormTicks = (f._brStormTicks || 0) + 1;
        var exposureMult = Math.min(3, 1 + (f._brStormTicks - 1) * 0.2);
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
        var bslot = bot._brInv.indexOf(null);
        if (bslot !== -1) {
          bot._brInv[bslot] = gi_item.item;
          if (gi_item.item.type === 'weapon') _brApplyItem(gi_item.item, bot);
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
  if      (item.type === 'medkit') { fighter.health = Math.min(fighter.maxHealth, fighter.health + 50); if (typeof spawnParticles === 'function') spawnParticles(fighter.cx(), fighter.cy(), '#44ff88', 12); }
  else if (item.type === 'shield') { fighter.shieldHP = 30; fighter.shielding = true; fighter._brShieldTimer = 300; if (typeof spawnParticles === 'function') spawnParticles(fighter.cx(), fighter.cy(), '#4488ff', 10); }
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
// BOT AI (throttled every 10 frames)
// ============================================================
function _brUpdateBots() {
  if (typeof frameCount === 'undefined' || frameCount % 10 !== 0) return;
  var all = players.concat(minions);
  var _fc = typeof frameCount !== 'undefined' ? frameCount : 0;

  minions.forEach(function(bot) {
    if (!bot || !bot._brBot || bot.health <= 0 || !bot._brLanded) return;
    if (!bot._brInv) bot._brInv = [null, null, null, null, null];

    // ── 1. Intelligent item consumption ──────────────────────
    var invHasSpace = bot._brInv.indexOf(null) !== -1;
    for (var s = 0; s < 5; s++) {
      var it = bot._brInv[s];
      if (!it) continue;
      // Medkit: use when below 40% health
      if (it.type === 'medkit' && bot.health < bot.maxHealth * 0.40) {
        _brApplyItem(it, bot); bot._brInv[s] = null; break;
      }
      // Shield: use when below 55% health and not currently shielded
      if (it.type === 'shield' && bot.health < bot.maxHealth * 0.55 && !bot._brShieldTimer) {
        _brApplyItem(it, bot); bot._brInv[s] = null; break;
      }
      // Super charge: use before engaging nearby enemy
      if (it.type === 'super' && !bot.superReady) {
        var nearEnemy = all.some(function(f) {
          return f !== bot && f.health > 0 && !f._brOnPlane &&
                 Math.abs(f.cx() - bot.cx()) + Math.abs(f.cy() - bot.cy()) < 300;
        });
        if (nearEnemy) { _brApplyItem(it, bot); bot._brInv[s] = null; break; }
      }
    }

    // ── 2. Storm avoidance (highest priority — overrides loot seeking) ──
    var stormMargin = 300;
    var fleeDepth   = 700;
    var inDanger = (
      bot.cx() < brZoneLeft + stormMargin  || bot.cx() > brZoneRight  - stormMargin ||
      bot.cy() < brZoneTop  + stormMargin  || bot.cy() > brZoneBottom - stormMargin
    );
    if (inDanger) {
      var safeX = Math.max(brZoneLeft + fleeDepth, Math.min(brZoneRight  - fleeDepth, bot.cx()));
      var safeY = Math.max(brZoneTop  + fleeDepth, Math.min(brZoneBottom - fleeDepth, bot.cy()));
      bot.target = _brFakeTarget(safeX, safeY);
      return;
    }

    // ── 3. Seek nearest unopened chest (if inventory has space and not full health) ──
    var wantsLoot = invHasSpace || bot.health < bot.maxHealth * 0.70;
    var nearChest = null, nearChestD = Infinity;
    if (wantsLoot) {
      for (var ci = 0; ci < brLootBoxes.length; ci++) {
        var box = brLootBoxes[ci];
        if (box.opened || box.health <= 0) continue;
        var cd = Math.abs(box.x - bot.cx()) + Math.abs(box.y - bot.cy());
        if (cd < nearChestD && cd < 1200) { nearChestD = cd; nearChest = box; }
      }
    }

    // ── 4. Seek nearby ground items if inventory has space ────
    var nearGround = null, nearGroundD = Infinity;
    if (invHasSpace) {
      for (var gi = 0; gi < brGroundItems.length; gi++) {
        var g = brGroundItems[gi];
        var gd = Math.abs(g.x - bot.cx()) + Math.abs(g.y - bot.cy());
        if (gd < nearGroundD && gd < 600) { nearGroundD = gd; nearGround = g; }
      }
    }

    // ── 5. Decide target ──────────────────────────────────────
    // Priority: nearby enemy → ground item (very close) → chest → roam to enemy
    var best = null, bestD = Infinity;
    all.forEach(function(f) {
      if (f === bot || f.health <= 0 || f._brOnPlane) return;
      var d = Math.abs(f.cx() - bot.cx()) + Math.abs(f.cy() - bot.cy());
      if (d < bestD) { bestD = d; best = f; }
    });

    // Ground item: seek if very close OR no enemies nearby
    if (nearGround && (nearGroundD < 250 || bestD > 500)) {
      bot.target = _brFakeTarget(nearGround.x, nearGround.y);
      return;
    }

    // Chest: seek if health low or needs items AND no close enemies
    if (nearChest && (bestD > 400 || bot.health < bot.maxHealth * 0.55)) {
      bot.target = _brFakeTarget(nearChest.x, nearChest.y - 10);
      return;
    }

    if (best) bot.target = best;
  });
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
  brAlive = all.filter(function(f) { return f.health > 0; }).length;
  if (brAlive <= 1 && !brWinner && gameRunning) {
    brWinner = all.find(function(f) { return f.health > 0; }) || null;
    var msg  = brWinner ? '#1  ' + (brWinner.name || 'P1') + '  WINS!' : 'DRAW!';
    if (typeof DamageText !== 'undefined') damageTexts.push(new DamageText(GAME_W / 2, GAME_H / 2 - 50, msg, '#ffdd00'));
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
  brSpectateList   = minions.filter(function(m) { return m.health > 0; });
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
  brSpectateList = minions.filter(function(m) { return m.health > 0; });
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
function _brCullBots() {
  var camX = typeof camXCur !== 'undefined' ? camXCur : BR_WORLD_W / 2;
  var camY = typeof camYCur !== 'undefined' ? camYCur : BR_WORLD_H / 2;
  minions.forEach(function(bot) {
    if (!bot._brBot || bot.health <= 0) return;
    // Never sleep bots still falling — they need gravity to land
    if (bot._brDropped && !bot._brLanded) { bot._brSleep = false; return; }
    var dx = Math.abs(bot.cx() - camX);
    var dy = Math.abs(bot.cy() - camY);
    bot._brSleep = (dx > 2000 || dy > 1200);
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
  _brCullBots();
  _brUpdateZone();
  _brCheckBoxBreaking();
  _brUpdateGroundItems();
  _brUpdateBots();
  _brUpdateSpectate();
  _brCheckWin();
}

// ============================================================
// DRAW — WORLD SPACE (called while camera transform is active)
// ============================================================
function drawBattleRoyaleWorld() {
  if (!brActive) return;
  ctx.save();

  // Void danger zone
  ctx.fillStyle = 'rgba(60,0,80,0.35)';
  ctx.fillRect(0, BR_DEATH_Y - 60, BR_WORLD_W, 200);
  var vGrd = ctx.createLinearGradient(0, BR_DEATH_Y - 120, 0, BR_DEATH_Y + 30);
  vGrd.addColorStop(0, 'rgba(80,0,120,0)');
  vGrd.addColorStop(1, 'rgba(80,0,120,0.7)');
  ctx.fillStyle = vGrd;
  ctx.fillRect(0, BR_DEATH_Y - 120, BR_WORLD_W, 150);

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
  var cStr = '🏆 ' + brAlive + ' / ' + BR_TOTAL;
  var cW   = ctx.measureText(cStr).width + 24;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(GAME_W / 2 - cW / 2, _brTopY, cW, 26);
  ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
  ctx.fillText(cStr, GAME_W / 2, _brTopY + 18); ctx.shadowBlur = 0;

  // ── Zone status (top right) ───────────────────────────────
  var zLabel, zColor;
  if (brZoneState === 'final') {
    zLabel = 'FINAL ZONE'; zColor = '#ff2200';
  } else if (brZoneState === 'close') {
    var closePct = Math.round((1 - brZoneTimer / BR_ZONE_CLOSE_F) * 100);
    zLabel = 'CLOSING ' + closePct + '%'; zColor = '#ff4422';
  } else {
    var tLeft = Math.ceil(brZoneTimer / 60);
    zLabel = brLanded ? 'Zone in ' + tLeft + 's' : 'Waiting...';
    zColor = '#ffaa44';
  }
  ctx.font = 'bold 11px Arial'; ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(GAME_W - 132, _brTopY, 124, 20);
  ctx.fillStyle = zColor;
  ctx.shadowColor = brZoneState === 'close' || brZoneState === 'final' ? zColor : 'transparent';
  ctx.shadowBlur  = brZoneState !== 'wait' ? 6 : 0;
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
  var mmW = 180, mmH = 150;  // taller to show vertical extent
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

  // Platform silhouettes
  ctx.fillStyle = 'rgba(80,100,140,0.5)';
  currentArena.platforms.forEach(function(pl) {
    ctx.fillRect(mmX + pl.x * scX, mmY + pl.y * scY, Math.max(2, pl.w * scX), 2);
  });

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
