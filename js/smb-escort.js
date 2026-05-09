'use strict';
// smb-escort.js — Story escort chapter engine
// A chapter with type:'escort' declares an NPC to protect and wave definitions.
// The engine manages NPC physics, wave spawning, and win/fail signalling.
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

// ============================================================
// STATE
// ============================================================
var escortActive     = false;
var escortNPC        = null;       // the Fighter being escorted (NOT in players/minions)
var escortGoalX      = 780;
var escortSpeed      = 0.7;
var escortStopRange  = 220;
var escortWaveDefs   = [];
var escortWaveFired  = [];         // parallel bool array — true when wave spawned
var escortState      = 'idle';     // 'idle' | 'playing' | 'success' | 'fail' | 'done'
var escortBanner     = 0;          // banner countdown frames
var escortNPCName    = 'Escort';
var escortNPCColor   = '#66aaff';
var _escortChapter   = null;

// ============================================================
// INIT
// ============================================================
function initEscortMode(chapter) {
  _escortChapter  = chapter;
  var npcCfg      = chapter.escortNPC || {};
  escortGoalX     = chapter.escortGoalX || GAME_W * 0.85;
  escortSpeed     = chapter.escortSpeed !== undefined ? chapter.escortSpeed : 0.7;
  escortStopRange = chapter.escortStopRange || 220;
  escortWaveDefs  = chapter.escortWaves || [];
  escortWaveFired = escortWaveDefs.map(function() { return false; });
  escortState     = 'playing';
  escortBanner    = 0;
  escortNPCName   = npcCfg.name  || 'Escort';
  escortNPCColor  = npcCfg.color || '#66aaff';
  escortActive    = true;

  // ── Create NPC Fighter ──────────────────────────────────
  // isAI=false: no AI logic runs, pure physics. We control vx manually.
  var p1 = players[0];
  var spawnX = p1 ? p1.x + 70 : 150;
  var spawnY = p1 ? p1.y : 400;

  escortNPC = new Fighter(
    spawnX, spawnY,
    escortNPCColor,
    'sword',                          // weapon key (won't attack — no target set)
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
  escortNPC.playerNum   = -99;        // sentinel — not a real player slot

  if (typeof setObjective === 'function')
    setObjective('Escort ' + escortNPCName + ' to safety');
}

// ============================================================
// PER-FRAME UPDATE  (called from game loop)
// ============================================================
function updateEscortMode() {
  if (!escortActive || !gameRunning || escortState === 'idle' || escortState === 'done') return;

  // Outcome banner countdown — then trigger endGame
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

  // ── NPC is alive ──────────────────────────────────────────
  if (!escortNPC) return;

  // Detect NPC death before anything else
  if (escortNPC.health <= 0 && escortNPC.invincible <= 0) {
    _escortFail('NPC fell in combat.');
    return;
  }

  // NPC physics tick
  escortNPC.update();

  // Decide NPC movement: stop if any enemy is close
  var enemies  = minions.filter(function(m) { return m.health > 0 && !m._isEscortNPC; });
  var tooClose = enemies.some(function(e) {
    return Math.abs(e.cx() - escortNPC.cx()) < escortStopRange;
  });
  escortNPC.vx = tooClose ? 0 : escortSpeed;

  // NPC facing direction
  if (!tooClose) escortNPC.facing = 1;

  // Check wave triggers
  _escortCheckWaves();

  // Keep enemies targeting NPC
  enemies.forEach(function(e) { if (e.target !== escortNPC) e.target = escortNPC; });

  // Win condition: NPC reached goal
  if (escortNPC.cx() >= escortGoalX) {
    _escortSuccess();
  }
}

// ── Wave check ────────────────────────────────────────────────
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
  var count   = wave.count   || 2;
  var wk      = wave.weaponKey || 'sword';
  var diff    = wave.aiDiff  || 'medium';
  var fromR   = wave.fromRight;
  var arena   = currentArena;
  var plats   = (arena && arena.platforms) ? arena.platforms : [];
  var colors  = ['#ff4455','#ff6633','#ff3388','#cc3322','#ff5500'];

  for (var i = 0; i < count; i++) {
    // Spawn on a platform on the appropriate side
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
    minions.push(bot);
  }

  if (typeof spawnParticles === 'function' && escortNPC)
    spawnParticles(escortNPC.cx(), escortNPC.cy() - 30, '#ff4444', 10);

  if (typeof DamageText !== 'undefined')
    damageTexts.push(new DamageText(GAME_W / 2, 95, 'Attackers incoming!', '#ff4422'));
}

// ── Outcome helpers ───────────────────────────────────────────
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

// ============================================================
// DRAW — WORLD SPACE  (called while camera transform is active)
// ============================================================
function drawEscortNPC() {
  if (!escortActive || !escortNPC || escortState === 'idle' || escortState === 'done') return;

  // Let Fighter render itself (normal stickman)
  escortNPC.draw();

  var x = escortNPC.cx();
  var y = escortNPC.y;

  // NPC nameplate
  ctx.save();
  ctx.font      = 'bold 10px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - 28, y - 22, 56, 14);
  ctx.fillStyle = escortNPCColor;
  ctx.shadowColor = escortNPCColor; ctx.shadowBlur = 4;
  ctx.fillText(escortNPCName, x, y - 11);
  ctx.shadowBlur = 0;

  // Health bar above nameplate
  var hFrac = Math.max(0, escortNPC.health / escortNPC.maxHealth);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x - 28, y - 28, 56, 6);
  ctx.fillStyle = hFrac > 0.5 ? '#44dd66' : hFrac > 0.25 ? '#ffaa22' : '#ff3322';
  ctx.fillRect(x - 28, y - 28, 56 * hFrac, 6);
  ctx.restore();

  // Goal flag marker
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
  // Flag pole
  ctx.strokeStyle = '#ffdd44'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(gx, floorY); ctx.lineTo(gx, floorY - 70); ctx.stroke();
  // Flag pennant
  ctx.fillStyle = '#ffdd44'; ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(gx, floorY - 70);
  ctx.lineTo(gx + 28, floorY - 58);
  ctx.lineTo(gx, floorY - 46);
  ctx.closePath(); ctx.fill();
  // "GOAL" text
  ctx.globalAlpha = 1;
  ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
  ctx.fillStyle = '#1a1a00';
  ctx.fillText('GOAL', gx + 10, floorY - 55);
  // Vertical guide line
  ctx.strokeStyle = 'rgba(255,221,68,0.2)'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.moveTo(gx, floorY); ctx.lineTo(gx, floorY - 400); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ============================================================
// DRAW — HUD / SCREEN SPACE  (called after camera transform is reset)
// ============================================================
function drawEscortHUD() {
  if (!escortActive || !gameRunning || escortState === 'idle' || escortState === 'done') return;
  ctx.save();
  // Pin to screen
  var bsX = canvas.width / GAME_W, bsY = canvas.height / GAME_H;
  ctx.setTransform(bsX, 0, 0, bsY, 0, 0);

  var _fc = typeof frameCount !== 'undefined' ? frameCount : 0;

  // ── Outcome banners ───────────────────────────────────────
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

  // ── NPC health bar (top — below story subtitle area) ──────
  if (escortNPC && escortNPC.health > 0) {
    var barW = 200, barH = 14;
    var barX = (GAME_W - barW) / 2;
    var barY = 82;
    var hFrac = Math.max(0, escortNPC.health / escortNPC.maxHealth);
    var pulse = 0.88 + 0.12 * Math.sin(_fc * 0.09);

    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
    ctx.fillStyle = '#111';            ctx.fillRect(barX, barY, barW, barH);
    var barColor = hFrac > 0.5 ? '#33cc66' : hFrac > 0.25 ? '#ffaa22' : '#ff3322';
    ctx.fillStyle = barColor;
    ctx.shadowColor = barColor; ctx.shadowBlur = hFrac < 0.35 ? 7 * pulse : 0;
    ctx.fillRect(barX, barY, barW * hFrac, barH);
    ctx.shadowBlur = 0;

    // Label
    ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left';
    ctx.fillStyle = '#cceeff';
    ctx.fillText('🛡 ' + escortNPCName, barX, barY - 3);

    // HP text
    ctx.font = '8px Arial'; ctx.textAlign = 'right'; ctx.fillStyle = '#aaa';
    ctx.fillText(Math.max(0, Math.ceil(escortNPC.health)) + ' / ' + escortNPC.maxHealth, barX + barW, barY - 3);
  }

  // ── Progress arrow: distance to goal ─────────────────────
  if (escortNPC) {
    var dist    = Math.max(0, escortGoalX - escortNPC.cx());
    var total   = escortGoalX - 100;
    var prog    = Math.max(0, Math.min(1, 1 - dist / total));
    var trW     = 180, trH = 8;
    var trX     = GAME_W - trW - 8, trY = 82;

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
      ctx.fillText('Almost there!', GAME_W - trW / 2 - 8, trY + 22);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}

// ============================================================
// CLEANUP (called when game ends or mode resets)
// ============================================================
function escortCleanup() {
  escortActive   = false;
  escortNPC      = null;
  escortState    = 'idle';
  escortWaveDefs = [];
  escortWaveFired = [];
  _escortChapter = null;
}
