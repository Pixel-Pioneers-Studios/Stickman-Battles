'use strict';
// smb-enemies-training.js — Training mode commands, training panel UI, map creator tool, custom weapon creator
// Depends on: smb-globals.js, smb-fighter.js, smb-data-weapons.js

// Dummy behaviour: 'stand' | 'block' | 'jump' | 'counter'. See Dummy._dummyBehave().
let dummyBehavior     = 'stand';
let dummyCounterDelay = 20;   // frames after being hit before a counter swing

// ============================================================
// DUMMY  (training-mode target — stands still, auto-heals)
// ============================================================
class Dummy extends Fighter {
  constructor(x, y) {
    super(x, y, '#888888', 'sword',
      { left:null, right:null, jump:null, attack:null, ability:null, super:null },
      false);
    this.name     = 'DUMMY';
    this.isDummy  = true;
    this.health   = 200;
    this.maxHealth = 200;
    this.lives    = 999;
    this.spawnX   = x;
    this.spawnY   = y;
  }

  update() {
    // Ninja Shadow Realm time dilation — Dummy overrides Fighter.update() entirely,
    // so the fractional-clock frame skip must be mirrored here
    if (this._domainSlowFactor > 0 && this._domainSlowFactor < 1) {
      this._domainSlowAccum = (this._domainSlowAccum || 0) + this._domainSlowFactor;
      if (this._domainSlowAccum < 1) { this.updateState(); return; }
      this._domainSlowAccum -= 1;
    }
    // Timers
    if (this.cooldown > 0)         this.cooldown--;
    if (this.invincible > 0)       this.invincible--;
    if (this.hurtTimer > 0)        this.hurtTimer--;
    if (this.stunTimer > 0)        this.stunTimer--;
    // Swing timers — Dummy overrides Fighter.update() wholesale, so these were
    // never ticked. Harmless while it was inert, but counter mode leaves
    // attackEndlag pinned above 0 forever and the dummy would swing exactly once.
    if (this.attackTimer > 0)      this.attackTimer--;
    if (this.attackEndlag > 0)     this.attackEndlag--;
    if (this.ragdollTimer > 0) {
      this.ragdollTimer--;
      this.ragdollAngle += this.ragdollSpin;
      this.ragdollSpin  *= 0.97;
    } else {
      this.ragdollAngle = 0;
      this.ragdollSpin  = 0;
    }
    // Gravity + minimal physics
    this.vy += 0.65;
    this.x  += this.vx;
    this.y  += this.vy;
    this.vx *= 0.80;
    this.vy  = clamp(this.vy, -20, 19);
    this.onGround = false;
    // Ceiling
    const _ceilY = currentArena && currentArena.isLowGravity ? -60 : -20;
    if (this.y < _ceilY) { this.y = _ceilY; if (this.vy < 0) this.vy = 0; }
    for (const pl of currentArena.platforms) this.checkPlatform(pl);
    // Auto-reset if falls off
    if (this.y > 640) { this.x = this.spawnX; this.y = this.spawnY - 60; this.vy = 0; this.health = this.maxHealth; }
    // Auto-heal when health hits 0
    if (this.health <= 0) {
      this.health = this.maxHealth;
      this.invincible = 120;
      spawnParticles(this.cx(), this.cy(), this.color, 12);
    }
    this._dummyBehave();
    this.animTimer++;
    this.updateState();
  }

  // ── CONFIGURABLE BEHAVIOUR ────────────────────────────────────────────────
  // The dummy used to be completely inert: updateAI() was an empty function and
  // update() never acted, so it could only ever be hit. That makes it useless for
  // the three things a training target actually exists to test — whether a mixup
  // beats a guard, whether a string is safe on block, and whether you can escape
  // pressure. Each mode below answers one of those.
  _dummyBehave() {
    const mode = (typeof dummyBehavior !== 'undefined') ? dummyBehavior : 'stand';
    if (mode === 'stand') { this.shielding = false; return; }

    // Face the player so blocks actually register (shields are directional).
    const p = players[0];
    if (p) this.facing = (p.cx() >= this.cx()) ? 1 : -1;

    const locked = this.stunTimer > 0 || this.ragdollTimer > 0;

    if (mode === 'block') {
      this.shielding = !locked;
      return;
    }
    this.shielding = false;

    if (mode === 'jump') {
      if (this.onGround && !locked) this.vy = -13;
      return;
    }

    if (mode === 'counter') {
      // Retaliate on a fixed delay after the last hit taken. A predictable timer
      // is deliberate — it is what makes a punish window measurable rather than
      // a coin flip against live AI.
      if (locked) return;
      const fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
      const hitAt = this._lastAttackerFrame;
      if (hitAt == null || fc - hitAt > 90) return;
      if (fc - hitAt < (typeof dummyCounterDelay !== 'undefined' ? dummyCounterDelay : 20)) return;
      if (this._dummyCounteredFor === hitAt) return;
      this._dummyCounteredFor = hitAt;
      if (p && p.health > 0 && dist(this, p) < 140) {
        this.facing = (p.cx() >= this.cx()) ? 1 : -1;
        this.attack(p);
      }
    }
  }

  respawn() { this.health = this.maxHealth; }
  useSuper() {}
  activateSuper() {}
  updateAI() {}

  draw() {
    // Always draw — explicit override so the dummy is never invisible
    ctx.save();
    // Invincibility blink
    if (this.invincible > 0 && Math.floor(this.invincible / 5) % 2 === 1) {
      ctx.globalAlpha = 0.35;
    }
    const cx = this.x + this.w / 2;
    const ty = this.y;
    const bw = this.w;      // body width (~20)
    const bh = this.h;      // body height (~50)

    // Hurt flash
    const hurt = this.hurtTimer > 0;
    const bodyCol = hurt ? '#ff6666' : '#999999';
    const headCol = hurt ? '#ffaaaa' : '#cccccc';

    // Ragdoll rotation when knocked back
    if (this.ragdollTimer > 0) {
      ctx.translate(cx, ty + bh * 0.45);
      ctx.rotate(this.ragdollAngle || 0);
      ctx.translate(-cx, -(ty + bh * 0.45));
    }

    // Body (torso)
    ctx.fillStyle = bodyCol;
    ctx.fillRect(cx - bw * 0.3, ty + bh * 0.32, bw * 0.6, bh * 0.38);

    // Head
    ctx.fillStyle = headCol;
    ctx.beginPath();
    ctx.arc(cx, ty + bh * 0.15, bh * 0.14, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (simple dots)
    ctx.fillStyle = '#444';
    ctx.beginPath(); ctx.arc(cx - 3, ty + bh * 0.13, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 3, ty + bh * 0.13, 2, 0, Math.PI * 2); ctx.fill();

    // Left arm
    ctx.fillStyle = bodyCol;
    ctx.fillRect(cx - bw * 0.65, ty + bh * 0.33, bw * 0.32, bh * 0.08);
    // Right arm
    ctx.fillRect(cx + bw * 0.33, ty + bh * 0.33, bw * 0.32, bh * 0.08);

    // Left leg
    ctx.fillRect(cx - bw * 0.32, ty + bh * 0.68, bw * 0.13, bh * 0.32);
    // Right leg
    ctx.fillRect(cx + bw * 0.19, ty + bh * 0.68, bw * 0.13, bh * 0.32);

    // "DUMMY" label above
    ctx.globalAlpha = 0.85;
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.fillText('DUMMY', cx, ty - 4);
    ctx.shadowBlur = 0;

    // Health bar
    const hpPct = Math.max(0, this.health / this.maxHealth);
    const bw2 = 28, bh2 = 4;
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#333';
    ctx.fillRect(cx - bw2 / 2, ty - 14, bw2, bh2);
    ctx.fillStyle = hpPct > 0.5 ? '#44dd44' : hpPct > 0.25 ? '#ffcc00' : '#ff4444';
    ctx.fillRect(cx - bw2 / 2, ty - 14, bw2 * hpPct, bh2);

    ctx.restore();
  }
}

// ============================================================
// TRAINING COMMANDS
// ============================================================
function trainingCmd(cmd) {
  if (!gameRunning || !trainingMode) return;
  const p = players[0];
  if (!p) return;

  if (cmd === 'giveSuper') {
    const giveTargets = trainingPlayerOnly ? [p] : [p, ...trainingDummies];
    for (const t of giveTargets) { t.superMeter = 100; t.superReady = true; t.superFlashTimer = 90; }
  }
  if (cmd === 'noCooldowns') {
    p.noCooldownsActive = !p.noCooldownsActive;
    if (p.noCooldownsActive) { p.cooldown = 0; p.cooldown2 = 0; p.abilityCooldown = 0; p.abilityCooldown2 = 0; p.shieldCooldown = 0; p.boostCooldown = 0; }
    document.getElementById('tBtnCDs')?.classList.toggle('training-active', p.noCooldownsActive);
  }
  if (cmd === 'fullHealth') {
    if (trainingPlayerOnly) {
      p.health = p.maxHealth;
    } else {
      for (const d of trainingDummies) d.health = d.maxHealth;
      p.health = p.maxHealth;
    }
  }
  if (cmd === 'spawnDummy') {
    const x = 200 + Math.random() * 500;
    trainingDummies.push(new Dummy(x, 300));
  }
  if (cmd === 'spawnBot') {
    const x    = Math.random() < 0.5 ? 160 : 720;
    const wKey = randChoice(WEAPON_KEYS);
    const bot  = new Fighter(x, 300, '#ff8800', wKey,
      { left:null, right:null, jump:null, attack:null, ability:null, super:null },
      true, 'hard');
    bot.name = 'BOT'; bot.lives = 1; bot.spawnX = x; bot.spawnY = 300;
    bot.target = p; bot.playerNum = 2;
    trainingDummies.push(bot);
  }
  if (cmd === 'clearEnemies') {
    trainingDummies = [];
    bossBeams  = [];
    bossSpikes = [];
    minions    = [];
    // Reset stale target references — cleared entities still have health > 0,
    // so without this fix bots in players[] would chase invisible entities
    // until their 25-tick retarget timer fires.
    for (const pl of players) {
      if (pl.target && !players.includes(pl.target)) {
        pl.target = players.find(q => q !== pl && q.health > 0) || null;
      }
    }
  }
  if (cmd === 'godmode') {
    if (trainingPlayerOnly) {
      p.godmode = !p.godmode;
      document.getElementById('tBtnGod')?.classList.toggle('training-active', p.godmode);
    } else {
      const newVal = !p.godmode;
      p.godmode = newVal;
      for (const d of trainingDummies) d.godmode = newVal;
      document.getElementById('tBtnGod')?.classList.toggle('training-active', newVal);
    }
  }
  if (cmd === 'spawnBoss') {
    // Allow multiple bosses — no filter, just spawn another
    const bossX = 150 + Math.random() * 600;
    const tb = new Boss();
    tb.target    = p;
    tb.spawnX    = bossX; tb.spawnY = 200;
    tb.x         = bossX; tb.y     = 200;
    trainingDummies.push(tb);
  }
  if (cmd === 'spawnBeast') {
    const bx = Math.random() < 0.5 ? 80 : 820;
    const beast = new ForestBeast(bx, 280);
    beast.target = p;
    trainingDummies.push(beast);
  }
  if (cmd === 'onePunch') {
    if (trainingPlayerOnly) {
      p.onePunchMode = !p.onePunchMode;
      document.getElementById('tBtnOnePunch')?.classList.toggle('training-active', p.onePunchMode);
    } else {
      const newVal = !p.onePunchMode;
      p.onePunchMode = newVal;
      for (const d of trainingDummies) d.onePunchMode = newVal;
      document.getElementById('tBtnOnePunch')?.classList.toggle('training-active', newVal);
    }
  }
  if (cmd === 'chaosMode') {
    trainingChaosMode = !trainingChaosMode;
    document.getElementById('tBtnChaos')?.classList.toggle('training-active', trainingChaosMode);
  }
  if (cmd === 'dummyBehavior') {
    const order = ['stand', 'block', 'jump', 'counter'];
    dummyBehavior = order[(order.indexOf(dummyBehavior) + 1) % order.length];
    const btn = document.getElementById('tBtnBehavior');
    if (btn) {
      btn.textContent = 'Dummy: ' + dummyBehavior;
      btn.classList.toggle('training-active', dummyBehavior !== 'stand');
    }
  }
  if (cmd === 'lab') {
    if (typeof tlabCycle === 'function') {
      const name = tlabCycle();
      const btn = document.getElementById('tBtnLab');
      if (btn) {
        btn.textContent = 'Lab: ' + (tlabMode === 0 ? 'off' : tlabMode);
        btn.classList.toggle('training-active', tlabMode !== 0);
      }
    }
  }
  if (cmd === 'labReset') { if (typeof tlabReset === 'function') tlabReset(); }
  if (cmd === 'playerOnly') {
    trainingPlayerOnly = !trainingPlayerOnly;
    const btn = document.getElementById('tBtnPlayerOnly');
    if (btn) {
      btn.classList.toggle('training-active', trainingPlayerOnly);
      btn.textContent = trainingPlayerOnly ? 'Player Only' : 'All Entities';
    }
  }
}

function toggleTrainingPanel() {
  const panel = document.getElementById('trainingExpandPanel');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function toggleTraining2P() {
  training2P = !training2P;
  const btn = document.getElementById('training2PBtn');
  if (btn) { btn.textContent = training2P ? '2P: ON' : '2P: OFF'; btn.classList.toggle('active', training2P); }
}

function spawnTrainingYeti() {
  if (!gameRunning || gameMode !== 'training') return;
  if (yeti && yeti.health > 0) return;
  yeti = new Yeti(450, 150);
  if (players[0]) players[0].target = yeti;
}

function spawnTrainingDummy() {
  if (!gameRunning || gameMode !== 'training') return;
  const d = new Dummy(300 + Math.random() * 300, 150);
  d.playerNum = trainingDummies.length + 3;
  d.name = 'DUMMY';
  trainingDummies.push(d);
}

let _creatorPlatforms  = [];
let _creatorHistory    = []; // undo stack: each entry = platforms snapshot before action
let _mcDragPlatform    = null;
let _mcDragOffX        = 0;
let _mcDragOffY        = 0;
let _mcDragOriginX     = 0;
let _mcDragOriginY     = 0;
let _mcEditorOpen      = false;

function toggleMapCreator() {
  const panel = document.getElementById('mapCreatorPanel');
  if (!panel) return;
  _mcEditorOpen = panel.style.display === 'none';
  panel.style.display = _mcEditorOpen ? 'block' : 'none';
}

// Convert client (screen) coords to game-world coords
function _mcScreenToGame(clientX, clientY) {
  const scX = (canvas.width  / GAME_W) * camZoomCur;
  const scY = (canvas.height / GAME_H) * camZoomCur;
  return {
    x: (clientX - canvas.width  / 2) / scX + camXCur,
    y: (clientY - canvas.height / 2) / scY + camYCur
  };
}

// Snapshot current platforms for undo
function _mcSnapshot() {
  if (!currentArena) return;
  _creatorHistory.push(currentArena.platforms.map(p => ({ ...p })));
  if (_creatorHistory.length > 50) _creatorHistory.shift();
}

function _mcRefreshCount() {
  const cnt = document.getElementById('mcCount');
  if (cnt) cnt.textContent = (_creatorPlatforms.length);
}

function addCreatorPlatform() {
  const x       = parseInt(document.getElementById('mcX')?.value)     || 200;
  const y       = parseInt(document.getElementById('mcY')?.value)     || 300;
  const w       = parseInt(document.getElementById('mcW')?.value)     || 150;
  const h       = parseInt(document.getElementById('mcH')?.value)     || 14;
  const color   = document.getElementById('mcColor')?.value           || null;
  const bouncy  = document.getElementById('mcBouncy')?.checked        || false;
  const moving  = document.getElementById('mcMoving')?.checked        || false;
  const oscX    = parseInt(document.getElementById('mcOscX')?.value)  || 60;
  const oscSpd  = parseFloat(document.getElementById('mcOscSpd')?.value) || 0.02;
  const isFloor = document.getElementById('mcFloor')?.checked         || false;
  _mcSnapshot();
  const pl = { x, y, w, h, isFloor, _creator: true };
  if (color && color !== '#888888') pl.color = color;
  if (bouncy) { pl.isBouncy = true; pl.naturalY = y; pl.sinkOffset = 0; pl.floatPhase = Math.random() * Math.PI * 2; }
  if (moving) { pl.ox = x; pl.oscX = oscX; pl.oscSpeed = oscSpd; pl.oscPhase = Math.random() * Math.PI * 2; pl.rx = x; pl.rTimer = 0; }
  _creatorPlatforms.push(pl);
  if (currentArena) currentArena.platforms.push(pl);
  _mcRefreshCount();
}

function clearCreatorPlatforms() {
  _mcSnapshot();
  if (currentArena) currentArena.platforms = currentArena.platforms.filter(p => !p._creator);
  _creatorPlatforms = [];
  _mcRefreshCount();
}

function clearAllPlatforms() {
  if (!confirm('Clear ALL platforms including the floor?')) return;
  _mcSnapshot();
  if (currentArena) currentArena.platforms = [];
  _creatorPlatforms = [];
  _mcRefreshCount();
}

function undoLastPlatform() {
  if (_creatorHistory.length === 0) return;
  const prev = _creatorHistory.pop();
  if (currentArena) currentArena.platforms = prev;
  _creatorPlatforms = prev.filter(p => p._creator);
  _mcRefreshCount();
}

function exportCreatorMap() {
  const all = currentArena ? currentArena.platforms : _creatorPlatforms;
  const json = JSON.stringify({ platforms: all.map(p => ({ x:p.x, y:p.y, w:p.w, h:p.h, isFloor:p.isFloor, color:p.color, isBouncy:p.isBouncy, oscX:p.oscX, oscSpeed:p.oscSpeed })) }, null, 2);
  const ta = document.getElementById('mcJSON');
  if (ta) ta.value = json;
  const blob = new Blob([json], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sb_map.json'; a.click();
  URL.revokeObjectURL(url);
}

function importCreatorMap() {
  const ta = document.getElementById('mcJSON');
  if (!ta || !ta.value.trim()) return;
  try {
    const data = JSON.parse(ta.value);
    _mcSnapshot();
    clearCreatorPlatforms();
    (data.platforms || []).forEach(p => {
      const pl = { x: p.x, y: p.y, w: p.w || 150, h: p.h || 14, isFloor: !!p.isFloor, _creator: true };
      if (p.color) pl.color = p.color;
      if (p.isBouncy) { pl.isBouncy = true; pl.naturalY = p.y; pl.sinkOffset = 0; pl.floatPhase = 0; }
      if (p.oscX)  { pl.ox = p.x; pl.oscX = p.oscX; pl.oscSpeed = p.oscSpeed || 0.02; pl.oscPhase = 0; pl.rx = p.x; pl.rTimer = 0; }
      _creatorPlatforms.push(pl);
      if (currentArena) currentArena.platforms.push(pl);
    });
    _mcRefreshCount();
  } catch(e) { alert('Invalid JSON: ' + e.message); }
}

// ---- Weapon Creator ----
function createCustomWeapon() {
  const name  = document.getElementById('wcName')?.value?.trim()         || 'Custom';
  const dmg   = parseInt(document.getElementById('wcDmg')?.value)         || 10;
  const range = parseInt(document.getElementById('wcRange')?.value)       || 60;
  const cd    = parseInt(document.getElementById('wcCd')?.value)          || 30;
  const kb    = parseInt(document.getElementById('wcKb')?.value)          || 8;
  const type  = document.getElementById('wcType')?.value                  || 'melee';
  const abilDmg = parseInt(document.getElementById('wcAbilDmg')?.value)   || 20;
  const key   = 'cw_' + name.toLowerCase().replace(/\s+/g,'_') + '_' + Date.now();
  WEAPONS[key] = {
    name, damage: dmg, range, cooldown: cd, kb, type,
    abilityCooldown: 150, abilityName: name + ' Strike',
    ability(user, tgt) {
      if (!tgt || tgt.health <= 0) return;
      if (dist(user, tgt) < range * 1.5) dealDamage(user, tgt, abilDmg, kb * 1.5);
    }
  };
  // Add to all weapon selects
  document.querySelectorAll('select[id$="Weapon"]').forEach(sel => {
    if (!sel.querySelector(`option[value="${key}"]`)) {
      const opt = document.createElement('option');
      opt.value = key; opt.textContent = '★ ' + name;
      sel.appendChild(opt);
    }
  });
  const status = document.getElementById('wcStatus');
  if (status) { status.textContent = `✅ "${name}" added to weapon list!`; setTimeout(() => { status.textContent = ''; }, 3000); }
}

// ---- Drag support for platforms ----
canvas.addEventListener('mousedown', (e) => {
  if (!_mcEditorOpen || !gameRunning || !currentArena) return;
  const gp = _mcScreenToGame(e.clientX, e.clientY);
  // find topmost platform under cursor
  for (let i = currentArena.platforms.length - 1; i >= 0; i--) {
    const pl = currentArena.platforms[i];
    if (gp.x >= pl.x && gp.x <= pl.x + pl.w && gp.y >= pl.y && gp.y <= pl.y + pl.h) {
      _mcSnapshot();
      _mcDragPlatform = pl;
      _mcDragOffX = gp.x - pl.x;
      _mcDragOffY = gp.y - pl.y;
      _mcDragOriginX = pl.x;
      _mcDragOriginY = pl.y;
      e.preventDefault();
      return;
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!_mcDragPlatform) return;
  const gp = _mcScreenToGame(e.clientX, e.clientY);
  _mcDragPlatform.x = Math.round(gp.x - _mcDragOffX);
  _mcDragPlatform.y = Math.round(gp.y - _mcDragOffY);
  if (_mcDragPlatform.ox !== undefined) _mcDragPlatform.ox = _mcDragPlatform.x;
  if (_mcDragPlatform.naturalY !== undefined) _mcDragPlatform.naturalY = _mcDragPlatform.y;
  // Sync input fields if this is the only selected platform
  const xEl = document.getElementById('mcX'); if (xEl) xEl.value = _mcDragPlatform.x;
  const yEl = document.getElementById('mcY'); if (yEl) yEl.value = _mcDragPlatform.y;
});

canvas.addEventListener('mouseup', () => {
  if (_mcDragPlatform) {
    // If barely moved, pop the snapshot (no meaningful change)
    if (Math.abs(_mcDragPlatform.x - _mcDragOriginX) < 2 && Math.abs(_mcDragPlatform.y - _mcDragOriginY) < 2) {
      _creatorHistory.pop();
    }
    _mcDragPlatform = null;
  }
});


// ============================================================
// TRAINING LAB — measurement HUD
// ============================================================
// Everything below exists because the sandbox could spawn a boss but could not
// tell you why you were losing to it. The balance bugs found on 2026-08-23 —
// a launcher that skipped every knockback guard, a lockout ceiling that had
// never once fired, a weapon shipping with no recovery frames at all — were all
// invisible in-game and had to be found with hand-written browser instrumentation.
// These panels surface exactly those numbers.
//
// Panels (F5 cycles): off -> frame data -> +lockout -> +hit log -> off
let tlabMode      = 0;                 // 0 = off, 1 = frames, 2 = +lockout, 3 = +hitlog
let tlabHits      = [];                // recent hits, newest last
let tlabLaunches  = [];                // recent governed launches
const TLAB_MAX_HITS = 7;

// Per-fighter rolling lockout stats, keyed by fighter object.
const tlabLock = new WeakMap();

function _tlabStats(f) {
  let s = tlabLock.get(f);
  if (!s) { s = { frames: 0, locked: 0, curRun: 0, maxRun: 0, airborne: 0 }; tlabLock.set(f, s); }
  return s;
}

// Called from dealDamage() AFTER all scaling and caps. The raw-vs-applied pairing
// is the useful part: "22 -> 22" and "16 -> 20 (capped)" tell very different stories.
function _tlabRecordHit(attacker, target, rawDmg, dmg, rawKb, kb) {
  if (!target) return;
  tlabHits.push({
    t:    (typeof frameCount !== 'undefined') ? frameCount : 0,
    from: attacker ? (attacker.name || '?') : 'world',
    to:   target.name || '?',
    rawDmg: Math.round(rawDmg || 0), dmg: Math.round(dmg || 0),
    rawKb:  Math.round(rawKb  || 0), kb:  Math.round(kb  || 0),
    combo:  attacker ? (attacker._comboHitCount || 0) : 0,
    launch: null,
  });
  if (tlabHits.length > TLAB_MAX_HITS) tlabHits.shift();
}

// Attaches to the most recent hit when a launch follows it in the same frame, so
// the log reads as one event rather than two.
function _tlabRecordLaunch(target, requested, granted, n) {
  const fc = (typeof frameCount !== 'undefined') ? frameCount : 0;
  const last = tlabHits[tlabHits.length - 1];
  if (last && last.t === fc && last.to === (target.name || '?')) {
    last.launch = { requested: Math.round(requested), granted: Math.round(granted), n };
    return;
  }
  tlabLaunches.push({ t: fc, to: target.name || '?', requested: Math.round(requested), granted: Math.round(granted), n });
  if (tlabLaunches.length > 4) tlabLaunches.shift();
}

// Classifies where the fighter is in its attack, using the same fields the
// combat code reads. "recovery" is the punish window — the number that was
// missing entirely from the Megaknight.
function _tlabPhase(f) {
  if (!f) return '-';
  if (f.stunTimer   > 0) return 'STUNNED';
  if (f.ragdollTimer> 0) return 'RAGDOLL';
  if (f.attackTimer > 0) {
    const contact = (typeof f._meleeContactFrames === 'function') ? f._meleeContactFrames() : 0;
    const elapsed = (f.attackDuration || 0) - f.attackTimer;
    return elapsed < contact ? 'startup' : 'active';
  }
  if (f.attackEndlag > 0) return 'RECOVERY';
  if (f.cooldown     > 0) return 'cooldown';
  return 'idle';
}

function _tlabPanel(ctx, x, y, w, lines, title) {
  const lh = 13, pad = 8;
  const h = lines.length * lh + pad * 2 + 15;
  ctx.fillStyle = 'rgba(8,8,16,0.86)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(180,130,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#bb88ff';
  ctx.textAlign = 'left';
  ctx.fillText(title, x + pad, y + pad + 8);
  ctx.font = '10px monospace';
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    ctx.fillStyle = ln.c || '#ddd';
    ctx.fillText(ln.s, x + pad, y + pad + 22 + i * lh);
  }
  return h;
}

// Ticks the rolling stats and draws the panels. One per-frame hook, called from
// gameLoop — the tracking has to run every frame even when a panel is hidden or
// the percentages would only count frames you were looking at.
function renderTrainingLab(ctx) {
  if (!gameRunning || !trainingMode) return;

  const p    = players[0];
  const foes = [...trainingDummies, ...players.slice(1)].filter(f => f && f.health > 0);
  const foe  = foes[0] || null;

  for (const f of [p, foe]) {
    if (!f) continue;
    const s = _tlabStats(f);
    s.frames++;
    if (!f.onGround) s.airborne++;
    const lk = (f.stunTimer > 0 || f.ragdollTimer > 0);
    if (lk) { s.locked++; s.curRun++; if (s.curRun > s.maxRun) s.maxRun = s.curRun; }
    else s.curRun = 0;
  }

  if (tlabMode === 0) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  let y = 88;   // clears the super/Q/S meter bars stacked at the top of the HUD
  const X = 8, W = 232;

  // ---- Frame data (always shown when the lab is on) ----
  if (p) {
    const wp = p.weapon || {};
    const ph = _tlabPhase(p);
    const phC = ph === 'RECOVERY' ? '#ff8844' : ph === 'active' ? '#44ff88'
              : ph === 'startup'  ? '#ffdd44' : ph.match(/STUN|RAG/) ? '#ff4444' : '#888';
    y += _tlabPanel(ctx, X, y, W, [
      { s: `${(wp.name||'-')}  ${p.charClass||'none'}`, c: '#aaccff' },
      { s: `phase    ${ph}`, c: phC },
      { s: `dmg ${wp.damage ?? '-'}   kb ${wp.kb ?? '-'}   rng ${wp.range ?? '-'}` },
      { s: `cooldown ${p.cooldown|0}/${wp.cooldown ?? '-'}` },
      { s: `endlag   ${p.attackEndlag|0}/${wp.endlag ?? 0}`,
        c: (wp.endlag == null || wp.endlag === 0) ? '#ff8844' : '#ddd' },
      { s: `stamina  ${Math.round(p.stamina||0)}/${p.maxStamina||100}` },
      { s: `super    ${Math.round(p.superMeter||0)}%${p.superReady ? '  READY' : ''}`,
        c: p.superReady ? '#ffdd44' : '#ddd' },
    ], 'FRAME DATA — P1');
    y += 6;
  }

  // ---- Lockout (the number that predicts oppressive matchups) ----
  if (tlabMode >= 2 && foe) {
    const s = _tlabStats(foe);
    const pctL = s.frames ? (s.locked / s.frames * 100) : 0;
    const pctA = s.frames ? (s.airborne / s.frames * 100) : 0;
    const lc = pctL > 30 ? '#ff4444' : pctL > 18 ? '#ffaa44' : '#44ff88';
    y += _tlabPanel(ctx, X, y, W, [
      { s: `target   ${foe.name || '?'}`, c: '#aaccff' },
      { s: `locked   ${pctL.toFixed(1)}%  of ${s.frames}f`, c: lc },
      { s: `longest  ${s.maxRun}f  (${(s.maxRun/62).toFixed(1)}s)`,
        c: s.maxRun > 105 ? '#ff4444' : '#ddd' },
      { s: `now      ${foe.stunTimer|0} stun / ${foe.ragdollTimer|0} rag` },
      { s: `airborne ${pctA.toFixed(1)}%` },
      { s: `launches ${foe._launchCount || 0} in window` },
    ], 'LOCKOUT — how much they can act');
    y += 6;
  }

  // ---- Hit log: requested vs actually applied ----
  if (tlabMode >= 3) {
    const lines = [];
    if (!tlabHits.length) lines.push({ s: '(no hits yet)', c: '#666' });
    for (let i = tlabHits.length - 1; i >= 0; i--) {
      const h = tlabHits[i];
      const capped = h.kb < h.rawKb;
      lines.push({
        s: `${h.dmg}dmg kb ${h.rawKb}->${h.kb}${capped ? '*' : ''}${h.combo > 1 ? ` c${h.combo}` : ''}`,
        c: capped ? '#ffaa44' : '#ddd',
      });
      if (h.launch) lines.push({
        s: `   launch ${h.launch.requested}->${h.launch.granted} (#${h.launch.n})`,
        c: h.launch.granted > h.launch.requested ? '#ffaa44' : '#88ccff',
      });
    }
    _tlabPanel(ctx, X, y, W, lines, 'HIT LOG — requested -> applied');
  }

  ctx.restore();
}

function tlabReset() {
  tlabHits = []; tlabLaunches = [];
  for (const f of [players[0], ...trainingDummies, ...players.slice(1)]) {
    if (f) tlabLock.delete(f);
  }
}

function tlabCycle() {
  tlabMode = (tlabMode + 1) % 4;
  const names = ['off', 'frame data', 'frame data + lockout', 'frame data + lockout + hit log'];
  if (typeof queueAnnouncement === 'function') queueAnnouncement('LAB: ' + names[tlabMode], '#bb88ff');
  return names[tlabMode];
}
