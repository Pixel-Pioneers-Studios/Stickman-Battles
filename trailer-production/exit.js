'use strict';
// "The exit only opens when they're all dead" Short: Endless mode (smb-endless.js). Frame 0: Kael mid-fight beside
// the locked teleporter with three left. He takes all three, it opens, he steps through, and area 3 is a mini-boss
// standing on the next exit. The fade between areas is cut out in exit-cut.js.
//
//   node exit.js [draft|vert]   → work/<profile>/exit.mov (+ .json log)
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  draft: { width: 1707, height: 960, cropW: 540, port: 8246 },
  vert: { width: 3414, height: 1920, cropW: 1080, port: 8248 },
};
const FRAMES = 420;

const quiet = s => s.eval(() => {
  window.endGame = function () {};
  settings.autoPerf = false;
  if (typeof _performanceModeActive !== 'undefined' && _performanceModeActive) togglePerformanceMode(true);
  settings.particles = true;
  window.drawEdgeIndicators = () => {}; window.drawHitEffectivenessHUD = () => {};
  window.drawMatchAnnouncer = () => {}; window._drawAnnouncer = () => {};
  window.drawAchievementPopups = () => {}; window.drawAbilityUnlockToast = () => {};
  window.drawEndlessHUD = () => {};   // area text, boss bar, banner: the captions carry them
  settings.dmgNumbers = false;
  DamageText.prototype.draw = () => {};
  window.drawEntityOverlays = () => {};
  Object.defineProperty(Fighter.prototype, 'superFlashTimer', { get: () => 0, set() {}, configurable: true });
  for (const p of players) if (p) delete p.superFlashTimer;
  const hud = document.getElementById('hud'); if (hud) hud.style.display = 'none';
  window.__texts = [];
  const logText = (kind, text) => window.__texts.push({ f: window.__dir ? window.__dir.f : -1, kind, text });
  CinFX.nameCard = (text) => logText('card', text);
  window.queueAnnouncement = (text) => logText('line', text);
});

function install() {
  const D = window.__dir = { f: 0, t: 0, phase: 'fight', log: { left: [] } };
  const p1 = players[0];
  p1.name = 'Kael';
  settings.finishers = false;
  endlessArea = 2; endlessBanner = 0;
  // Area 3 stays on the street: the office and rooftops put the pad up a storey, out of the vertical crop.
  window._endlessPickType = () => 'street';
  const tp = endlessTp;
  const foes = endlessEnemies.slice(0, 3);
  for (let i = endlessEnemies.length - 1; i >= 3; i--) { const e = endlessEnemies[i]; const k = minions.indexOf(e); if (k >= 0) minions.splice(k, 1); }
  endlessEnemies.length = 3;
  const put = (f, x, feet, face) => { f.x = x - f.w / 2; f.y = feet - f.h; f.vx = 0; f.vy = 0; f.onGround = true; f.facing = face; };
  put(p1, tp.x - 250, tp.y, 1);
  p1.health = p1.maxHealth; p1.invincible = 0;
  // A just in front of him, B behind, C between him and the pad.
  const spots = [[tp.x - 200, -1, 12], [tp.x - 330, 1, 12], [tp.x - 90, -1, 12]];
  foes.forEach((f, i) => {
    f._endlessIdle = false; f.isAI = false; f.invincible = 0;
    f.health = spots[i][2];
    put(f, spots[i][0], tp.y, spots[i][1]);
  });
  D.foes = foes; D.tp = tp;
  // Platforms over the pad would hide it.
  currentArena.platforms = currentArena.platforms.filter(pl => pl.isFloor || pl.x > tp.x + 120 || pl.x + pl.w < tp.x - 420);
  D.cam = { x: tp.x - 170, y: tp.y - 110, z: 0.95 };
  D.camT = Object.assign({}, D.cam);
  const uc = window.updateCamera;
  window.updateCamera = function () {
    if (!window.__manual) return uc.apply(this, arguments);
    const c = D.cam, t = D.camT, k = D.snap ? 1 : 0.08;
    c.x += (t.x - c.x) * k; c.y += (t.y - c.y) * k; c.z += (t.z - c.z) * (D.snap ? 1 : 0.06);
    D.snap = false;
    camXCur = camXTarget = c.x; camYCur = camYTarget = c.y; camZoomCur = camZoomTarget = c.z;
  };
  window.__focusScreen = () => canvas.width / 2;
}

function tick() {
  const D = window.__dir, p1 = players[0];
  const alive = f => f && f.health > 0 && minions.indexOf(f) >= 0;
  const [A, B, C] = D.foes;
  const swing = (who, at) => { who.cooldown = 0; who.attackEndlag = 0; who.stunTimer = 0; who.ragdollTimer = 0; who.facing = at.cx() > who.cx() ? 1 : -1; who.attack(at); };
  p1.invincible = 0;
  endlessDrops.length = 0;
  if (D.phase === 'fight') {
    for (const f of D.foes) if (alive(f)) { f.cooldown = Math.max(f.cooldown || 0, 2); f.vx *= 0.6; }
    // A is mid-swap with him at frame 0; B comes in from behind; C stands on the pad's approach.
    if (D.f === 1 && alive(A)) swing(A, p1);
    if (D.f === 6 && alive(A)) swing(p1, A);
    if (D.f === 34 && alive(B)) { B.vx = 3; swing(B, p1); }
    if (D.f === 44 && alive(B)) swing(p1, B);
    if (D.f >= 70 && D.f < 96 && alive(C) && Math.abs(p1.cx() - C.cx()) > 60) { p1.vx = 4.2; p1.facing = 1; }
    if (D.f === 84 && alive(C)) swing(C, p1);
    if (D.f >= 96 && D.f % 12 === 0 && alive(C)) swing(p1, C);
    if (endlessOpen && !D.log.open) { D.log.open = D.f; D.phase = 'exit'; }
  } else if (D.phase === 'exit') {
    if (Math.abs(p1.cx() - D.tp.x) > 6) { p1.vx = Math.sign(D.tp.x - p1.cx()) * 4; p1.facing = Math.sign(D.tp.x - p1.cx()); }
    else p1.vx = 0;
    if (endlessFade > 0 && !D.log.fade) D.log.fade = D.f;
    if (endlessArea === 3 && !D.log.area3) {
      D.log.area3 = D.f; D.phase = 'boss';
      const b = endlessBoss, tp = endlessTp;
      p1.x = tp.x - 250 - p1.w / 2; p1.y = tp.y - p1.h; p1.vx = 0; p1.vy = 0; p1.facing = 1;
      D.log.boss = b ? { name: b.name, weapon: b.weaponKey } : null;
      if (b) { b._endlessIdle = false; b.isAI = false; b.facing = -1; b._endSlamCd = 9999; }
      currentArena.platforms = currentArena.platforms.filter(pl => pl.isFloor || pl.x > tp.x + 120 || pl.x + pl.w < tp.x - 460);
      D.cam = { x: tp.x - 150, y: tp.y - 120, z: 0.85 }; D.camT = Object.assign({}, D.cam); D.snap = true;
    }
  } else if (D.phase === 'boss') {
    const b = endlessBoss, k = D.f - D.log.area3;
    p1.vx = 0; p1.cooldown = Math.max(p1.cooldown || 0, 2);
    if (!b) return;
    b.vx = 0; b.cooldown = Math.max(b.cooldown || 0, 2);
    // He wakes once the fade is up, plants, and the slam ring grows toward Kael; Kael jumps it.
    if (k === 50) { b._endSlamT = END_SLAM_WARN; D.log.slam = D.f; }
    if (k > 50 && b._endSlamT > 0) b.vx = 0;
    if (k === 50 + END_SLAM_WARN - 12) { p1.vy = -13; D.log.jump = D.f; }
    if (k > 50) b._endSlamCd = 9999;
    D.camT = { x: (p1.cx() + b.cx()) / 2, y: D.tp.y - 130, z: 0.85 };
  }
  const left = D.phase === 'fight' ? D.foes.filter(alive).length : 0;
  if (D.lastLeft !== left) { D.log.left.push([D.f, left]); D.lastLeft = left; }
  if (D.phase === 'fight') D.camT = { x: Math.min(D.tp.x - 120, p1.cx() + 60), y: D.tp.y - 110, z: 0.95 };
  if (D.phase === 'exit') D.camT = { x: D.tp.x - 60, y: D.tp.y - 110, z: 0.95 };
}

const probe = () => {
  const D = window.__dir || {};
  const p1 = players[0], b = typeof endlessBoss !== 'undefined' ? endlessBoss : null;
  return { ph: D.phase, f: D.f, area: endlessArea, open: endlessOpen, fade: endlessFade,
    x: Math.round(p1.cx()), feet: Math.round(p1.y + p1.h), hp: Math.round(p1.health),
    foes: D.foes ? D.foes.map(f => f.health > 0 && minions.indexOf(f) >= 0 ? Math.round(f.cx()) + ':' + Math.round(f.health) : 'x').join(' ') : '',
    boss: b ? Math.round(b.cx()) + ':' + b._endSlamT : '', z: +camZoomCur.toFixed(2), run: gameRunning };
};

(async () => {
  const profName = process.argv[2] || 'draft', prof = PROFILES[profName];
  if (!prof) throw new Error('usage: node exit.js [draft|vert]');
  const s = await openSession({ width: prof.width, height: prof.height, port: prof.port });
  await hookAudio(s);
  await s.startMatch({ mode: 'endless', p1: 'axe', p1Color: '#00d4ff', settleMs: 5000 });
  await quiet(s);
  console.log('setup', await s.eval(() => ({ mode: gameMode, active: endlessActive, area: endlessArea, n: endlessEnemies.length, tp: endlessTp })));
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
  const out = path.join(__dirname, 'work', profName, 'exit');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const { log } = await record(s, out, Number(process.env.FRAMES || FRAMES), { fps: 60, probe, cropW: prof.cropW });
  const marks = await s.eval(() => Object.assign({}, window.__dir.log));
  const j = JSON.parse(fs.readFileSync(out + '.json', 'utf8')); j.marks = marks; fs.writeFileSync(out + '.json', JSON.stringify(j));
  console.log('marks', JSON.stringify(marks));
  for (let i = 0; i < log.length; i += Number(process.env.EVERY || 20)) console.log(i, JSON.stringify(log[i]));
  console.log('last', JSON.stringify(log[log.length - 1]));
  console.log('errors', s.errors.slice(0, 5).join(' | '));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
