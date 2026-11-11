'use strict';
// "One touch and it breaks" Short: Nexus Defense (minigameType 'defense', smb-minigames.js). Wave 10 of 10, the
// Nexus at 10 HP, and a rusher's touch costs 10. Frame 0: one rusher already on Kael's side, swung at; the second
// comes in from the other gate while he's turned away, and he gets back across the crystal to it just in time.
// The game's own wave-clear ends it (NEXUS DEFENDED).
//
//   node nexus.js [draft|vert]   → work/<profile>/nexus.mov (+ .json log)
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  draft: { width: 1707, height: 960, cropW: 540, port: 8266 },
  vert: { width: 3414, height: 1920, cropW: 1080, port: 8268 },
};
const FRAMES = 200;

const quiet = s => s.eval(() => {
  window.endGame = function () {};
  settings.autoPerf = false;
  if (typeof _performanceModeActive !== 'undefined' && _performanceModeActive) togglePerformanceMode(true);
  settings.particles = true;
  window.drawEdgeIndicators = () => {}; window.drawHitEffectivenessHUD = () => {};
  window.drawMatchAnnouncer = () => {}; window._drawAnnouncer = () => {};
  window.drawAchievementPopups = () => {}; window.drawAbilityUnlockToast = () => {};
  window.drawMinigameHUD = () => {};   // wave text and the result card: the captions carry them
  window.unlockAchievement = () => {};
  settings.dmgNumbers = false;
  DamageText.prototype.draw = () => {};
  window.drawEntityOverlays = () => {};
  Object.defineProperty(Fighter.prototype, 'superFlashTimer', { get: () => 0, set() {}, configurable: true });
  for (const p of players) if (p) delete p.superFlashTimer;
  const hud = document.getElementById('hud'); if (hud) hud.style.display = 'none';
  window.__texts = [];
});

function install() {
  const D = window.__dir = { f: 0, t: 0, phase: 'left', log: {} };
  const p1 = players[0];
  p1.name = 'Kael';
  settings.finishers = false;
  for (const e of defenseEnemies) { const k = minions.indexOf(e); if (k >= 0) minions.splice(k, 1); }
  defenseEnemies = []; defenseSpawnQueue = []; defenseWaveDelay = 0;
  defenseWave = 10; defenseNexusHp = 10;
  [true, false, true, false, true].forEach(l => _releaseDefenseRusher(l, false));
  const R = defenseEnemies.slice(), [A, B, C] = R;
  const put = (f, x, face) => { f.x = x - f.w / 2; f.y = defenseNexusY - f.h - 2; f.vx = 0; f.vy = 0; f.onGround = true; f.facing = face; };
  const N = defenseNexusX;
  put(p1, N - 70, -1);
  [-118, 192, -222, 252, -290].forEach((x, i) => put(R[i], N + x, x < 0 ? 1 : -1));
  // One blow each. Damage scales with maxHealth, so only the current health is lowered.
  for (const r of R) { r.health = r._defenseLastHp = 6; r.color = '#ff4b2b'; }
  p1.health = p1.maxHealth;
  D.A = A; D.B = B; D.C = C; D.N = N; D.order = R; D.log.downs = [];
  const uc = window.updateCamera;
  window.updateCamera = function () {
    if (!window.__manual) return uc.apply(this, arguments);
    camXCur = camXTarget = N; camYCur = camYTarget = defenseNexusY - 60; camZoomCur = camZoomTarget = 0.9;
  };
  window.__focusScreen = () => canvas.width / 2;
}

function tick() {
  const D = window.__dir, p1 = players[0], N = D.N;
  const alive = f => f && f.health > 0 && minions.indexOf(f) >= 0;
  const swing = (at) => { p1.cooldown = 0; p1.attackEndlag = 0; p1.stunTimer = 0; p1.facing = at.cx() > p1.cx() ? 1 : -1; p1.attack(at); };
  p1.invincible = 0;
  // No random vaults: the race is run on foot.
  for (const r of D.order) if (alive(r)) r._defenseHopCd = 99;
  p1.cooldown = Math.max(p1.cooldown || 0, 2);
  // One rusher at a time, in order; he runs across the crystal (a hop over it) to whichever side it's on.
  const t = D.order.find(alive);
  if (t) {
    const dx = t.cx() - p1.cx(), dir = dx > 0 ? 1 : -1;
    if (Math.abs(dx) < 64) {
      p1.vx = 0;
      if (D.f - (D.lastSwing || -99) > 12) { swing(t); D.lastSwing = D.f; D.log.swings = (D.log.swings || []).concat([[D.f, Math.round(t.cx() - N)]]); }
    } else {
      p1.facing = dir; p1.vx = 5.2 * dir;
      const crossing = (p1.cx() - N) * dir < 0 && Math.abs(p1.cx() - N) < 44;
      if (p1.onGround && crossing && D.f - (D.lastHop || -99) > 20) { p1.vy = -9; D.lastHop = D.f; }
    }
  } else p1.vx = 0;
  D.order.forEach((r, i) => { if (!alive(r) && D.log.downs[i] === undefined) D.log.downs[i] = D.f; });
  if (typeof minigameResult !== 'undefined' && minigameResult && !D.log.result) D.log.result = [D.f, minigameResult.text];
  if (D.lastHp !== defenseNexusHp) { (D.log.hpLog || (D.log.hpLog = [])).push([D.f, defenseNexusHp]); D.lastHp = defenseNexusHp; }
  D.phase = t ? 'r' + D.order.indexOf(t) : 'done';
}

const probe = () => {
  const D = window.__dir || {};
  const p1 = players[0];
  const pos = f => f && f.health > 0 && minions.indexOf(f) >= 0 ? Math.round(f.cx() - D.N) + ":" + Math.round(f.health) : "x";
  return { ph: D.phase, f: D.f, hp: defenseNexusHp, k: Math.round(p1.cx() - D.N), a: pos(D.A), b: pos(D.B), c: pos(D.C), run: gameRunning };
};

(async () => {
  const profName = process.argv[2] || 'draft', prof = PROFILES[profName];
  if (!prof) throw new Error('usage: node nexus.js [draft|vert]');
  const s = await openSession({ width: prof.width, height: prof.height, port: prof.port });
  await hookAudio(s);
  await s.startMatch({ mode: 'minigames', minigame: 'defense', p1: 'axe', p1Color: '#00d4ff', before: 'p2IsNone = true;', settleMs: 5000 });
  await quiet(s);
  console.log('setup', await s.eval(() => ({ mg: minigameType, n: players.length, nx: defenseNexusX, ny: defenseNexusY, w: currentArena.worldWidth })));
  await s.eval((inst, tk) => {
    (new Function('return (' + inst + ')'))()();
    const t = new Function('return (' + tk + ')')();
    const D = window.__dir;
    const orig = window.__step;
    window.__step = function (n) {
      for (let i = 0; i < n; i++) {
        if (window.__manual) { D.f++; D.t++; try { t(); } catch (e) { (D.log.err || (D.log.err = [])).length < 3 && D.log.err.push('tick ' + D.f + ': ' + e.message); } }
        orig(1);
      }
    };
  }, install.toString(), tick.toString());
  const out = path.join(__dirname, 'work', profName, 'nexus');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const { log } = await record(s, out, Number(process.env.FRAMES || FRAMES), { fps: 60, probe, cropW: prof.cropW });
  const marks = await s.eval(() => Object.assign({}, window.__dir.log));
  const j = JSON.parse(fs.readFileSync(out + '.json', 'utf8')); j.marks = marks; fs.writeFileSync(out + '.json', JSON.stringify(j));
  console.log('marks', JSON.stringify(marks));
  for (let i = 0; i < log.length; i += Number(process.env.EVERY || 10)) console.log(i, JSON.stringify(log[i]));
  console.log('errors', s.errors.slice(0, 5).join(' | '));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
