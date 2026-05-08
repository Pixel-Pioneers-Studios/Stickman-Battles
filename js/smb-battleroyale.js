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

// Zone target boundaries (left/right) — timing is always 30s wait + 10s close
const BR_ZONE_PHASES = [
  { left: 0,    right: 9000 }, // 0 — full map (initial state)
  { left: 700,  right: 8300 }, // 1
  { left: 1600, right: 7400 }, // 2
  { left: 2700, right: 6300 }, // 3
  { left: 3500, right: 5500 }, // 4
  { left: 4000, right: 5000 }, // 5
  { left: 4200, right: 4800 }, // 6
  { left: 4350, right: 4650 }, // 7 — final ring
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
var brZoneTargetL  = 0;
var brZoneTargetR  = BR_WORLD_W;
var brZoneSpeedL   = 0;        // px/frame during close
var brZoneSpeedR   = 0;
var brZoneDmgTick  = 0;
var brWinner       = null;
var brLootBoxes    = [];
var brInventory    = [null, null, null, null, null];
var brActiveSlot   = 0;

// Plane drop state
var brPlaneFlight  = true;    // true = plane still crossing
var brPlaneX       = -300;
var brJumped       = false;   // P1 has jumped
var brLanded       = false;   // P1 has landed
var brBotsFallDone = false;   // all bots have been assigned drop points

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
  brZoneTargetL  = 0;
  brZoneTargetR  = BR_WORLD_W;
  brZoneSpeedL   = 0;
  brZoneSpeedR   = 0;
  brZoneDmgTick  = 0;
  brWinner       = null;
  brLootBoxes    = [];
  brInventory    = [null, null, null, null, null];
  brActiveSlot   = 0;
  brPlaneFlight  = true;
  brPlaneX       = -300;
  brJumped       = false;
  brLanded       = false;
  brBotsFallDone = false;

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
        brZoneSpeedL  = (brZoneTargetL - brZoneLeft)  / BR_ZONE_CLOSE_F;
        brZoneSpeedR  = (brZoneTargetR - brZoneRight) / BR_ZONE_CLOSE_F;
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
    brZoneLeft  += brZoneSpeedL;
    brZoneRight += brZoneSpeedR;
    brZoneTimer--;
    if (brZoneTimer <= 0) {
      brZoneLeft  = brZoneTargetL;
      brZoneRight = brZoneTargetR;
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
    players.concat(minions).forEach(function(f) {
      if (!f || f.health <= 0) return;
      if (f.cx() < brZoneLeft || f.cx() > brZoneRight)
        if (typeof dealDamage === 'function') dealDamage(null, f, BR_ZONE_DAMAGE, 0);
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
          if (!f.isAI) _brPickupHuman(box.item, f);
          else         _brPickupBot(f, box.item);
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
// ITEM PICKUP
// ============================================================
function _brPickupHuman(item, fighter) {
  var slot = brInventory.indexOf(null);
  if (slot !== -1) {
    brInventory[slot] = item;
    if (typeof DamageText !== 'undefined')
      damageTexts.push(new DamageText(fighter.cx(), fighter.y - 35, '+' + (item.label || item.type), item.color));
  } else if (item.type !== 'weapon') {
    _brApplyItem(item, fighter);
  } else if (typeof DamageText !== 'undefined') {
    damageTexts.push(new DamageText(fighter.cx(), fighter.y - 35, 'Bag full!', '#ff8888'));
  }
}

function _brPickupBot(bot, item) {
  if (!bot._brInv) bot._brInv = [null, null, null, null, null];
  var slot = bot._brInv.indexOf(null);
  if (slot !== -1) { bot._brInv[slot] = item; if (item.type === 'weapon') _brApplyItem(item, bot); }
  else if (item.type === 'medkit' && bot.health < bot.maxHealth * 0.5) _brApplyItem(item, bot);
}

// ============================================================
// ITEM USE
// ============================================================
function _brApplyItem(item, fighter) {
  if (!item || !fighter) return;
  if      (item.type === 'medkit') { fighter.health = Math.min(fighter.maxHealth, fighter.health + 50); if (typeof spawnParticles === 'function') spawnParticles(fighter.cx(), fighter.cy(), '#44ff88', 12); }
  else if (item.type === 'shield') { fighter.shieldHP = Math.min(100, (fighter.shieldHP || 0) + 30); fighter.shielding = true; if (typeof spawnParticles === 'function') spawnParticles(fighter.cx(), fighter.cy(), '#4488ff', 10); }
  else if (item.type === 'super')  { fighter.superCharge = fighter.maxSuperCharge || 100; if (typeof spawnParticles === 'function') spawnParticles(fighter.cx(), fighter.cy(), '#ffdd00', 14); }
  else if (item.type === 'weapon' && item.weaponKey) { var w = WEAPONS[item.weaponKey]; if (w) { fighter.weaponKey = item.weaponKey; fighter.weapon = w; fighter.cooldown = 0; } }
}

function useBRItem(slotIdx) {
  if (!brActive || !gameRunning || slotIdx < 0 || slotIdx > 4) return;
  var item = brInventory[slotIdx]; if (!item) return;
  var p = players.find(function(pl) { return !pl.isAI && pl.health > 0; }); if (!p) return;
  _brApplyItem(item, p); brInventory[slotIdx] = null; brActiveSlot = slotIdx;
}

function selectBRSlot(s) { brActiveSlot = Math.max(0, Math.min(4, s)); }

// ============================================================
// BOT AI (throttled every 10 frames)
// ============================================================
function _brUpdateBots() {
  if (typeof frameCount === 'undefined' || frameCount % 10 !== 0) return;
  var all = players.concat(minions);
  minions.forEach(function(bot) {
    if (!bot || !bot._brBot || bot.health <= 0 || !bot._brLanded) return;
    if (bot._brInv) {
      for (var s = 0; s < 5; s++) {
        var it = bot._brInv[s];
        if (it && it.type === 'medkit' && bot.health < bot.maxHealth * 0.35) { _brApplyItem(it, bot); bot._brInv[s] = null; break; }
      }
    }
    if (bot.cx() < brZoneLeft + 100)  { bot.target = _brFakeTarget(brZoneLeft  + 300, bot.y); return; }
    if (bot.cx() > brZoneRight - 100) { bot.target = _brFakeTarget(brZoneRight - 300, bot.y); return; }
    var best = null, bestD = Infinity;
    all.forEach(function(f) { if (f === bot || f.health <= 0 || f._brOnPlane) return; var d = Math.abs(f.cx() - bot.cx()) + Math.abs(f.cy() - bot.cy()); if (d < bestD) { bestD = d; best = f; } });
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
// MAIN UPDATE
// ============================================================
function updateBattleRoyale() {
  if (!brActive || !gameRunning) return;
  _brUpdatePlane();
  _brUpdateBotFalls();
  _brCheckVoidDeaths();
  _brUpdateZone();
  _brCheckBoxBreaking();
  _brUpdateBots();
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
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(GAME_W / 2 - cW / 2, 57, cW, 26);
  ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
  ctx.fillText(cStr, GAME_W / 2, 75); ctx.shadowBlur = 0;

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
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(GAME_W - 132, 57, 124, 20);
  ctx.fillStyle = zColor;
  ctx.shadowColor = brZoneState === 'close' || brZoneState === 'final' ? zColor : 'transparent';
  ctx.shadowBlur  = brZoneState !== 'wait' ? 6 : 0;
  ctx.fillText(zLabel, GAME_W - 10, 71); ctx.shadowBlur = 0;

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
  if (brZoneLeft > 0) {
    ctx.fillStyle = 'rgba(255,60,0,0.35)';
    ctx.fillRect(mmX, mmY, brZoneLeft * scX, mmH);
  }
  if (brZoneRight < BR_WORLD_W) {
    var rzX = mmX + brZoneRight * scX;
    ctx.fillStyle = 'rgba(255,60,0,0.35)';
    ctx.fillRect(rzX, mmY, mmW - (rzX - mmX), mmH);
  }
  ctx.strokeStyle = '#ff5500'; ctx.lineWidth = 1.5;
  if (brZoneLeft > 0)          { var lx = mmX + brZoneLeft  * scX; ctx.beginPath(); ctx.moveTo(lx, mmY); ctx.lineTo(lx, mmY + mmH); ctx.stroke(); }
  if (brZoneRight < BR_WORLD_W){ var rx = mmX + brZoneRight * scX; ctx.beginPath(); ctx.moveTo(rx, mmY); ctx.lineTo(rx, mmY + mmH); ctx.stroke(); }

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

  // P1 dot
  if (p1 && p1.health > 0 && !p1._brOnPlane) {
    var p1mmX = Math.max(mmX + 3, Math.min(mmX + mmW - 3, mmX + p1.cx() * scX));
    var p1mmY = Math.max(mmY + 3, Math.min(mmY + mmH - 3, mmY + p1.cy() * scY));
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(p1mmX, p1mmY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p1mmX, p1mmY, 3, 0, Math.PI * 2); ctx.fill();
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
