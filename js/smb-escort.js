'use strict';
// Story escort chapter engine. A chapter with type:'escort' declares an NPC to protect and waves to fight through.
// The engine handles NPC physics, wave spawning, and win/fail signalling.
//
// Chapter shape:
//   {
//     id, title, type: 'escort',
//     escortNPC:    { name, color, hp },
//     escortGoalX:  780,       // logical-pixel X the NPC must reach
//     escortSpeed:  0.7,       // px/frame NPC walks right
//     escortStopRange: 200,    // stop NPC when enemy is closer than this
//     escortWaves: [
//       { triggerX: 200, count: 2, weaponKey: 'sword', aiDiff: 'easy',   fromRight: false },
//       { triggerX: 450, count: 3, weaponKey: 'axe',   aiDiff: 'medium', fromRight: true  },
//     ],
//     fightScript, arena, playerLives, tokenReward, …
//   }
//
// Explore escorts: a walkFight/exploration chapter with `escortNPC` runs this engine inside its scrolling world
// (initEscortMode is called from _launchExplorationChapter). The NPC follows the player and waves trigger on world x.
// Delivery does not end the match; the exit gate (storyLevelClearBlocker) waits for the NPC instead. Options:
//     escortGoalX:   world x (default: just short of the exit)
//     escortLeash:   NPC waits when the player is this far behind (default 260)
//     escortHunters: arena-lock duel enemies that go after the NPC (default 0)
//     escortArriveText: subtitle when the NPC reaches the goal

// State
var escortActive     = false;
var escortNPC        = null;       // the Fighter being escorted (NOT in players/minions)
var escortSpeed      = 0.7;
var escortStopRange  = 220;
var escortWaveDefs   = [];
var escortWaveFired  = [];         // parallel bool array, true when wave spawned
var escortState      = 'idle';     // 'idle' | 'playing' | 'success' | 'fail' | 'done'
var escortBanner     = 0;          // banner countdown frames
var escortNPCName    = 'Escort';
var escortNPCColor   = '#66aaff';
var _escortChapter   = null;
var escortInExplore  = false;      // running inside an exploration world
var _escortStuck     = 0;
var _escortLastX     = 0;
var _escortPending   = null;       // explore chapter waiting for its first live frame

// Explore chapters arm the escort at launch and start on the first live frame. A timer-based init
// loses the race with the loading screen's escortCleanup.
function escortArm(chapter) { _escortPending = chapter || null; }

// Init
function initEscortMode(chapter) {
  _escortChapter  = chapter;
  var npcCfg      = chapter.escortNPC || {};
  escortInExplore = (typeof exploreActive !== 'undefined' && exploreActive);
  escortGoalX     = chapter.escortGoalX
    || (escortInExplore && typeof exploreGoalX !== 'undefined' ? exploreGoalX - 60 : GAME_W * 0.85);
  escortSpeed     = chapter.escortSpeed !== undefined ? chapter.escortSpeed : (escortInExplore ? 1.8 : 0.7);
  escortStopRange = chapter.escortStopRange || 220;
  escortWaveDefs  = chapter.escortWaves || [];
  escortWaveFired = escortWaveDefs.map(function() { return false; });
  escortState     = 'playing';
  escortBanner    = 0;
  escortNPCName   = npcCfg.name  || 'Escort';
  escortNPCColor  = npcCfg.color || '#66aaff';
  escortActive    = true;

  // isAI=false: no AI logic runs, pure physics. We control vx manually.
  var p1 = players[0];
  var spawnX = p1 ? p1.x + 70 : 150;
  var spawnY = p1 ? p1.y : 400;

  escortNPC = new Fighter(
    spawnX, spawnY,
    escortNPCColor,
    'sword',                          // weapon key (won't attack, no target set)
    { left: null, right: null, jump: null, attack: null, ability: null, super: null },
    false,                            // isAI = false → pure physics only
    'easy'
  );
  escortNPC.name        = escortNPCName;
  escortNPC.maxHealth   = npcCfg.hp || 200;
  escortNPC.health      = escortNPC.maxHealth;
  escortNPC.lives       = 9999;       // prevent checkDeaths() from touching this fighter
  escortNPC.invincible  = 90;         // spawn grace
  escortNPC.target      = null;
  escortNPC._isEscortNPC = true;
  escortNPC.playerNum   = -99;        // sentinel, not a real player slot
  escortNPC._hideWeapon = true;       // she is not a fighter here
  // On the player's side, hit loops scan players/trainingDummies/minions, so the NPC lives in minions[].
  // Faction stamps keep the player's swings and target pickers off it. The minion loop runs its physics and draws it.
  escortNPC.storyFaction = 'player';
  escortNPC._teamId      = 1;
  escortNPC.isStoryAlly  = true;
  escortNPC.isMinion     = true;
  minions.push(escortNPC);
  if (p1 && p1._teamId === undefined) { p1._teamId = 1; p1.storyFaction = 'player'; }
  _escortStuck = 0;
  _escortLastX = escortNPC.x;
  // Resuming a checkpoint starts mid-map, so waves behind the spawn point already happened.
  for (var _wi = 0; _wi < escortWaveDefs.length; _wi++) {
    if ((escortWaveDefs[_wi].triggerX || 0) < spawnX - 100) escortWaveFired[_wi] = true;
  }

  if (typeof setObjective === 'function')
    setObjective('Escort ' + escortNPCName + ' to safety');
}

// Per-frame update, called from the game loop
function updateEscortMode() {
  if (_escortPending) {
    var _pc = _escortPending;
    if (typeof _activeStory2Chapter === 'undefined' || _activeStory2Chapter !== _pc) _escortPending = null;
    else if (gameRunning && players[0] && typeof exploreActive !== 'undefined' && exploreActive) {
      _escortPending = null;
      initEscortMode(_pc);
    }
  }
  if (!escortActive || !gameRunning || escortState === 'idle' || escortState === 'done') return;

        // Outcome banner countdown, then endGame
  if (escortState === 'success' || escortState === 'fail') {
    if (--escortBanner <= 0) {
      var _wasFail = (escortState === 'fail');
      escortState  = 'done';
      escortActive = false;
      if (_wasFail) {
        // NPC died: force P1 to lose so endGame() reports playerWon=false
        var p1 = players[0];
        if (p1) { p1.health = 0; p1.lives = 0; p1.invincible = 0; }
      }
      if (typeof endGame === 'function') endGame();
    }
    return;
  }

  if (!escortNPC) return;

  if (escortNPC.health <= 0 && escortNPC.invincible <= 0) {
    _escortFail('NPC fell in combat.');
    return;
  }

  // Physics runs in the minion loop (the NPC lives in minions[]).
  if (escortInExplore) { _escortExploreTick(); return; }

  var enemies  = minions.filter(function(m) { return m.health > 0 && !m._isEscortNPC && !areAlliedEntities(m, escortNPC); });
  var tooClose = enemies.some(function(e) {
    return Math.abs(e.cx() - escortNPC.cx()) < escortStopRange;
  });
  escortNPC.vx = tooClose ? 0 : escortSpeed;

  if (!tooClose) escortNPC.facing = 1;

  _escortCheckWaves();

  enemies.forEach(function(e) { if (e.target !== escortNPC) e.target = escortNPC; });

  // Win: NPC reached goal. The area must also be clear (see storyLevelClearBlocker()).
  if (escortNPC.cx() >= escortGoalX) {
    var _blk = (typeof storyLevelClearBlocker === 'function' && typeof exploreActive !== 'undefined' && exploreActive)
      ? storyLevelClearBlocker() : null;
    if (_blk) {
      if (!escortNPC._safeNag || frameCount - escortNPC._safeNag > 260) {
        escortNPC._safeNag = frameCount;
        storyFightSubtitle = {
          text: `${escortNPC.name || 'Your escort'} is safe — but ${_blk.reason}`,
          timer: 190, maxTimer: 190, color: '#ffcc44'
        };
      }
    } else {
      _escortSuccess();
    }
  }
}

// Explore escort: follows the player through the world.
function _escortExploreTick() {
  var npc = escortNPC, p1 = players[0];
  if (!p1) return;
  var ch = _escortChapter || {};
  npc._hideWeapon = true;   // finisher/move-scene resets can flip it back
  var floor = (currentArena && currentArena.platforms || []).find(function(pl) { return pl.isFloor; });
  var floorY = floor ? floor.y : 440;

  // Fell into a shaft / off the map, or wedged for 4s: rejoin beside the player.
  var fell = npc.y > floorY + 60;
  if (Math.abs(npc.x - _escortLastX) < 0.2 && npc.vx !== 0) _escortStuck++; else _escortStuck = 0;
  _escortLastX = npc.x;
  if (fell || _escortStuck > 240) _escortRejoin(p1.x - 50 * (p1.facing || 1), floorY);

  // The duel's arena lock walls off the fight, pull her in rather than strand her outside.
  if (typeof exploreArenaLock !== 'undefined' && exploreArenaLock &&
      (npc.x < exploreArenaLock.left + 10 || npc.x + npc.w > exploreArenaLock.right - 10)) {
    _escortRejoin(Math.max(exploreArenaLock.left + 40, Math.min(exploreArenaLock.right - 80, Math.min(escortGoalX, p1.x - 60))), floorY);
  }

  var foes = minions.filter(function(m) { return m.health > 0 && m !== npc && !areAlliedEntities(m, npc); });

  // Duel hunters: the first N arena-lock enemies go after the NPC instead of the player.
  var want = ch.escortHunters || 0;
  if (want > 0) {
    var have = foes.filter(function(m) { return m._escortEnemy && m.isArenaLockEnemy; }).length;
    foes.forEach(function(m) { if (have < want && m.isArenaLockEnemy && !m._escortEnemy) { m._escortEnemy = true; have++; } });
  }
  foes.forEach(function(m) { if (m._escortEnemy) m.target = npc; });

  _escortCheckWaves();

  var delivered = npc.cx() >= escortGoalX;
  if (delivered) {
    npc.vx = 0;
    if (!npc._arrived) {
      npc._arrived = true;
      npc._arrivedAt = frameCount;
      storyFightSubtitle = {
        text: ch.escortArriveText || (escortNPCName + ' is safe.'),
        timer: 240, maxTimer: 240, color: '#88ccff'
      };
      if (typeof SoundManager !== 'undefined' && SoundManager.phaseUp) SoundManager.phaseUp();
    }
    // escortLines: [{ after, text, color }], with 'after' counted from NPC arrival.
    var lines = ch.escortLines || [];
    for (var li = 0; li < lines.length; li++) {
      var ln = lines[li];
      if (!npc['_line' + li] && frameCount - npc._arrivedAt >= (ln.after || 0)) {
        npc['_line' + li] = true;
        storyFightSubtitle = { text: ln.text, timer: ln.timer || 260, maxTimer: ln.timer || 260, color: ln.color || '#aaccff' };
      }
    }
    return;
  }

  // Walk the route, but never leave the player behind, and hold while foes are close.
  var threatened = foes.some(function(e) { return Math.abs(e.cx() - npc.cx()) < escortStopRange && Math.abs(e.cy() - npc.cy()) < 160; });
  var leash      = ch.escortLeash || 260;
  var waiting    = (npc.cx() - p1.cx()) > leash;
  if (threatened || waiting || npc.hurtTimer > 0 || npc.stunTimer > 0) {
    npc.vx = 0;
    if (threatened) {
      var near = foes.reduce(function(a, b) { return Math.abs(b.cx() - npc.cx()) < Math.abs(a.cx() - npc.cx()) ? b : a; });
      npc.facing = near.cx() < npc.cx() ? -1 : 1;
    } else {
      npc.facing = p1.cx() < npc.cx() ? -1 : 1;
    }
    return;
  }
  npc.vx = escortSpeed;
  npc.facing = 1;

  // Hop the cache shafts / gaps: no floor 30px ahead of her feet.
  if (npc.onGround) {
    var aheadX = npc.x + npc.w + 30, feet = npc.y + npc.h;
    var solid = (currentArena && currentArena.platforms || []).some(function(pl) {
      return aheadX >= pl.x && aheadX <= pl.x + pl.w && pl.y >= feet - 4 && pl.y <= feet + 30;
    });
    if (!solid) { npc.vy = -13; npc.vx = 4; npc.onGround = false; }
  }
}

function _escortRejoin(x, floorY) {
  var npc = escortNPC;
  npc.x = x; npc.y = floorY - npc.h - 2; npc.vx = 0; npc.vy = 0;
  npc.invincible = Math.max(npc.invincible || 0, 60);
  _escortStuck = 0; _escortLastX = npc.x;
  if (typeof spawnParticles === 'function') spawnParticles(npc.cx(), npc.cy(), escortNPCColor, 12);
}

// Wave check
function _escortCheckWaves() {
  for (var i = 0; i < escortWaveDefs.length; i++) {
    if (escortWaveFired[i]) continue;
    var w = escortWaveDefs[i];
    if (escortNPC.cx() >= (w.triggerX || 0)) {
      escortWaveFired[i] = true;
      _escortSpawnWave(w);
    }
  }
}

function _escortSpawnWave(wave) {
  if (escortInExplore && typeof _exploreSpawnEnemy === 'function') {
    var n = wave.count || 2, p1 = players[0];
    var floorX0 = 80, floorX1 = (typeof exploreWorldLen !== 'undefined' ? exploreWorldLen : 6000) - 80;
    for (var k = 0; k < n; k++) {
      var side = wave.fromRight === false ? -1 : (wave.fromRight ? 1 : (k % 2 ? -1 : 1));
      var x = Math.max(floorX0, Math.min(floorX1, escortNPC.cx() + side * (480 + k * 60)));
      _exploreSpawnEnemy({
        exactX: x, weaponKey: wave.weaponKey || 'sword', aiDiff: wave.aiDiff || 'medium',
        name: wave.name || 'Attacker', color: wave.color || '#ff4455', health: wave.health,
        classKey: wave.classKey,
      }, p1);
      var m = minions[minions.length - 1];
      if (m && m !== escortNPC) { m._escortEnemy = true; m.target = escortNPC; m.invincible = 40; }
    }
    if (wave.text) storyFightSubtitle = { text: wave.text, timer: 220, maxTimer: 220, color: '#ff7755' };
    return;
  }
  var count   = wave.count   || 2;
  var wk      = wave.weaponKey || 'sword';
  var diff    = wave.aiDiff  || 'medium';
  var fromR   = wave.fromRight;
  var arena   = currentArena;
  var plats   = (arena && arena.platforms) ? arena.platforms : [];
  var colors  = ['#ff4455','#ff6633','#ff3388','#cc3322','#ff5500'];

  for (var i = 0; i < count; i++) {
    var spawnX, spawnY;
    if (plats.length > 0) {
      var side = plats.filter(function(p) {
        return fromR ? p.x > GAME_W * 0.6 : p.x < GAME_W * 0.4;
      });
      var pl = (side.length > 0 ? side : plats)[Math.floor(Math.random() * (side.length || plats.length))];
      spawnX = pl.x + pl.w / 2 + (Math.random() - 0.5) * 40;
      spawnY = pl.y - 55;
    } else {
      spawnX = fromR ? GAME_W - 60 + i * 20 : 60 + i * 20;
      spawnY = 300;
    }

    var bot = new Fighter(spawnX, spawnY, colors[i % colors.length], wk,
      { left: null, right: null, jump: null, attack: null, ability: null, super: null },
      true, diff);
    bot.target     = escortNPC;
    bot.lives      = 1;
    bot.invincible = 60;
    bot.playerNum  = 2 + (i % 4);
    bot.name       = 'Attacker';
    bot._escortEnemy = true;
    bot.storyFaction = 'enemy';
    bot._teamId      = 2;
    minions.push(bot);
  }

  if (typeof spawnParticles === 'function' && escortNPC)
    spawnParticles(escortNPC.cx(), escortNPC.cy() - 30, '#ff4444', 10);

  if (typeof DamageText !== 'undefined')
    damageTexts.push(new DamageText(GAME_W / 2, 95, 'Attackers incoming!', '#ff4422'));
}

function _escortSuccess() {
  if (escortState !== 'playing') return;
  escortState  = 'success';
  escortBanner = 210; // 3.5s
  if (typeof spawnParticles === 'function' && escortNPC)
    spawnParticles(escortNPC.cx(), escortNPC.cy(), '#44ff88', 20);
  if (typeof SoundManager !== 'undefined') SoundManager.phaseUp();
}

function _escortFail(reason) {
  if (escortState !== 'playing') return;
  escortState  = 'fail';
  escortBanner = 180; // 3s
  if (typeof SoundManager !== 'undefined') SoundManager.death();
  if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 14);
}

// Called from checkDeaths() intercept when P1 dies in escort mode
function escortOnPlayerDeath() {
  _escortFail('Player eliminated.');
  return true; // handled
}

// Draw: world space (camera transform active)
function drawEscortNPC() {
  if (!escortActive || !escortNPC || escortState === 'idle' || escortState === 'done') return;

  // The body is drawn by the minion loop (the NPC lives in minions[]).
  if (escortNPC.health <= 0) return;

  // Fighter.draw() already renders her name tag and health bar.

  _drawEscortGoalFlag();
}

function _drawEscortGoalFlag() {
  var gx = escortGoalX;
  var arena = currentArena;
  var floorY = 460;
  if (arena && arena.platforms) {
    var fl = arena.platforms.find(function(p) { return p.isFloor; });
    if (fl) floorY = fl.y;
  }

  ctx.save();
  ctx.strokeStyle = '#ffdd44'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(gx, floorY); ctx.lineTo(gx, floorY - 70); ctx.stroke();
  ctx.fillStyle = '#ffdd44'; ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(gx, floorY - 70);
  ctx.lineTo(gx + 28, floorY - 58);
  ctx.lineTo(gx, floorY - 46);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  ctx.fillStyle = '#1a1a00';
  ctx.fillText('GOAL', gx + 10, floorY - 55);
  ctx.strokeStyle = 'rgba(255,221,68,0.2)'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.moveTo(gx, floorY); ctx.lineTo(gx, floorY - 400); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// Draw: HUD, screen space
function drawEscortHUD() {
  if (!escortActive || !gameRunning || escortState === 'idle' || escortState === 'done') return;
  ctx.save();
  var bsX = canvas.width / GAME_W, bsY = canvas.height / GAME_H;
  ctx.setTransform(bsX, 0, 0, bsY, 0, 0);

  var _fc = typeof frameCount !== 'undefined' ? frameCount : 0;

  // Outcome banners
  if (escortState === 'success') {
    var a = Math.min(1, escortBanner / 60);
    ctx.globalAlpha = a;
    ctx.font = 'bold 34px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = '#44ff88'; ctx.shadowColor = '#000'; ctx.shadowBlur = 12;
    ctx.fillText('ESCORT COMPLETE', GAME_W / 2, GAME_H / 2 - 20);
    ctx.font = '15px Arial'; ctx.fillStyle = '#aaffcc';
    ctx.fillText(escortNPCName + ' reached safety!', GAME_W / 2, GAME_H / 2 + 14);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    ctx.restore(); return;
  }
  if (escortState === 'fail') {
    var a2 = Math.min(1, escortBanner / 60);
    ctx.globalAlpha = a2;
    ctx.font = 'bold 34px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3322'; ctx.shadowColor = '#000'; ctx.shadowBlur = 12;
    ctx.fillText('ESCORT FAILED', GAME_W / 2, GAME_H / 2 - 20);
    ctx.font = '15px Arial'; ctx.fillStyle = '#ffaaaa';
    ctx.fillText(escortNPCName + ' was eliminated.', GAME_W / 2, GAME_H / 2 + 14);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    ctx.restore(); return;
  }

  // NPC health bar, below the story subtitle
  if (escortNPC && escortNPC.health > 0) {
    var barW = 200, barH = 14;
    var barX = (GAME_W - barW) / 2;
    var barY = 82;
    if (escortInExplore) { barW = 150; barH = 10; barX = 14; barY = 106; }
    var hFrac = Math.max(0, escortNPC.health / escortNPC.maxHealth);
    var pulse = 0.88 + 0.12 * Math.sin(_fc * 0.09);

    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    ctx.fillStyle = '#111';            ctx.fillRect(barX, barY, barW, barH);
    var barColor = hFrac > 0.5 ? '#33cc66' : hFrac > 0.25 ? '#ffaa22' : '#ff3322';
    ctx.fillStyle = barColor;
    ctx.shadowColor = barColor; ctx.shadowBlur = hFrac < 0.35 ? 7 * pulse : 0;
    ctx.fillRect(barX, barY, barW * hFrac, barH);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
    ctx.fillStyle = '#cceeff';
    ctx.fillText('🛡 ' + escortNPCName, barX, barY - 3);

    ctx.font = '8px Arial'; ctx.textAlign = 'right'; ctx.fillStyle = '#aaa';
    ctx.fillText(Math.max(0, Math.ceil(escortNPC.health)) + ' / ' + escortNPC.maxHealth, barX + barW, barY - 3);
  }

  // Progress arrow: distance to goal
  if (escortNPC) {
    var dist    = Math.max(0, escortGoalX - escortNPC.cx());
    var total   = escortGoalX - 100;
    var prog    = Math.max(0, Math.min(1, 1 - dist / total));
    var trW     = 180, trH = 8;
    var trX     = GAME_W - trW - 8, trY = 82;
    // Explore: nearest enemy's name sits under her HP bar.
    if (escortInExplore) { trW = 150; trH = 6; trX = 14; trY = 132; }

    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(trX - 2, trY - 2, trW + 4, trH + 4);
    ctx.fillStyle = '#222';            ctx.fillRect(trX, trY, trW, trH);
    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(trX, trY, trW * prog, trH);

    ctx.font = 'bold 8px Arial'; ctx.textAlign = 'left';
    ctx.fillStyle = '#ffeeaa';
    ctx.fillText('PROGRESS  ►', trX, trY - 3);

    if (dist < 150) {
      var nearPulse = 0.6 + 0.4 * Math.sin(_fc * 0.2);
      ctx.globalAlpha = nearPulse;
      ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffdd44';
      ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 8;
      ctx.fillText('Almost there!', trX + trW / 2, trY + 22);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}

// Cleanup, when the game ends or the mode resets
function escortCleanup() {
  escortActive   = false;
  escortInExplore = false;
  escortNPC      = null;
  escortState    = 'idle';
  escortWaveDefs = [];
  escortWaveFired = [];
  _escortChapter = null;
}
