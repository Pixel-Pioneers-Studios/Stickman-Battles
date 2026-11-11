'use strict';
// "The bridge holds 4" Short: Frostline's rope bridge (smb-br-structures.js). Frame 0: Kael running across it with
// three behind him, the sign already at 4 of 4. A fifth steps on from the far end, in his way; it snaps, and only
// Kael gets out (a double jump past him to the far edge). One continuous shot.
//
//   node bridge.js [draft|vert]   → work/<profile>/bridge.mov (+ .json log)
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  draft: { width: 1707, height: 960, cropW: 540, port: 8236 },
  vert: { width: 3414, height: 1920, cropW: 1080, port: 8238 },
};
const FRAMES = 176;

const quiet = s => s.eval(() => {
  window.endGame = function () {};
  settings.autoPerf = false;
  if (typeof _performanceModeActive !== 'undefined' && _performanceModeActive) togglePerformanceMode(true);
  settings.particles = true;
  window.drawEdgeIndicators = () => {}; window.drawHitEffectivenessHUD = () => {};
  window.drawMatchAnnouncer = () => {}; window._drawAnnouncer = () => {};
  window.drawAchievementPopups = () => {}; window.drawAbilityUnlockToast = () => {};
  window.drawBattleRoyaleHUD = () => {};
  window._brDrawLandmarkSigns = () => {};   // the band names sit where the captions go; the kill gauge stays (it's the stake)
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
  const D = window.__dir = { f: 0, t: 0, phase: 'run', log: { count: [] } };
  const p1 = players[0];
  brJumped = true; brLanded = true; brPlaneFlight = false;
  p1._brOnPlane = false; p1.name = 'Kael';
  settings.finishers = false;
  const foes = minions.filter(b => b._brBot && b.health > 0 && !b._brWildlife).slice(0, 4);
  for (let i = minions.length - 1; i >= 0; i--) if (foes.indexOf(minions[i]) < 0) minions.splice(i, 1);
  const put = (f, x, feet) => { f.x = x - f.w / 2; f.y = feet - f.h; f.vx = 0; f.vy = 0; f.onGround = true; f.facing = 1; };
  put(p1, 8222, 900);
  p1.health = p1.maxHealth; p1.invincible = 0;
  // Three chasers on the deck behind him; the fifth comes off the west rim.
  const starts = [8166, 8118, 8070, 8730];
  foes.forEach((f, i) => {
    f._brSleep = false; f._brOnPlane = false; f._brDropped = true; f._brLanded = true;
    f.isAI = false; f.invincible = 0; f.health = f.maxHealth;
    put(f, starts[i], 900);
  });
  foes[3].facing = -1;
  D.foes = foes; D.fifth = foes[3];
  // Clean frame: no chests or pickups around the gorge.
  brLootBoxes = brLootBoxes.filter(b => b.x < 7600 || b.x > 8800);
  if (typeof brGroundItems !== 'undefined') brGroundItems.length = 0;
  if (typeof mapItems !== 'undefined' && Array.isArray(mapItems)) mapItems.length = 0;
  brBridge.state = 'up'; brBridge.t = 0; _brsBridgePl.isFloorDisabled = false;
  D.cam = { x: 8268, y: 990, z: 0.6 };
  D.camT = { x: 8268, y: 990, z: 0.6 };
  const uc = window.updateCamera;
  window.updateCamera = function () {
    if (!window.__manual) return uc.apply(this, arguments);
    const c = D.cam, t = D.camT;
    c.x += (t.x - c.x) * 0.06; c.y += (t.y - c.y) * 0.06; c.z += (t.z - c.z) * 0.05;
    camXCur = camXTarget = c.x; camYCur = camYTarget = c.y; camZoomCur = camZoomTarget = c.z;
  };
  window.__focusScreen = () => canvas.width / 2;
}

function tick() {
  const D = window.__dir, p1 = players[0];
  const live = D.foes.filter(f => f.health > 0 && minions.indexOf(f) >= 0);
  p1.invincible = 0;
  // Nobody swings.
  for (const f of live) { f.cooldown = Math.max(f.cooldown || 0, 2); f.abilityCooldown = Math.max(f.abilityCooldown || 0, 2); f.target = null; }
  p1.cooldown = Math.max(p1.cooldown || 0, 2);
  const up = brBridge.state === 'up';
  if (up) {
    // Running east: Kael a step slower than the three closing on him; the fifth steps on from the far end, in his way.
    if (p1.onGround) { p1.vx = 3.2; p1.facing = 1; }
    D.foes.forEach((f, i) => { if (f.health > 0 && f.onGround) { f.vx = i < 3 ? 3.4 : -4.4; f.facing = i < 3 ? 1 : -1; } });
  } else {
    if (!D.snapF) { D.snapF = D.f; D.log.snap = D.f; D.log.kaelX = Math.round(p1.cx());
      D.foes.forEach((f, i) => { f.vx = [0.6, -0.4, 0.3, -3][i]; }); }
    const k = D.f - D.snapF;
    // He drops with them for a beat, then the double jump to the east edge.
    if (k === 7) { p1.vy = -12; p1.vx = 4.6; p1.canDoubleJump = false; D.log.jump = D.f; }
    if (k > 7 && !p1.onGround) p1.vx = 4.6;
    // The fifth stumbles on in: he was barely on the deck when it went.
    if (k < 14 && D.fifth.health > 0) D.fifth.vx = -3;
    if (k > 7 && p1.onGround && !D.landF) { D.landF = D.f; D.log.land = D.f; D.log.landX = Math.round(p1.cx()); }
    if (D.landF) {
      p1.vx = D.f - D.landF < 10 ? 2 : 0;
      if (D.f - D.landF > 18) p1.facing = -1;   // turns to look back into the gorge
    }
  }
  if (D.lastCount !== brBridge.count || D.lastState !== brBridge.state) {
    D.log.count.push([D.f, brBridge.count, brBridge.state]); D.lastCount = brBridge.count; D.lastState = brBridge.state;
  }
  if (!D.log.gone && D.snapF && live.length === 0) D.log.gone = D.f;
  // Camera: the whole bridge and the mist; after he lands, in on him at the edge.
  D.camT = D.landF ? { x: 8470, y: 960, z: 0.72 } : { x: 8268, y: 990, z: 0.6 };
  if (typeof brGroundItems !== 'undefined') brGroundItems.length = 0;
  D.phase = !D.snapF ? 'run' : !D.landF ? 'fall' : 'safe';
}

const probe = () => {
  const D = window.__dir || {};
  const p1 = players[0];
  return { ph: D.phase, f: D.f, st: brBridge.state, n: brBridge.count,
    x: Math.round(p1.cx()), feet: Math.round(p1.y + p1.h), hp: Math.round(p1.health),
    foes: D.foes ? D.foes.map(f => f.health > 0 && minions.indexOf(f) >= 0 ? Math.round(f.cx()) + '@' + Math.round(f.y + f.h) : 'x').join(' ') : '',
    z: +camZoomCur.toFixed(2), run: gameRunning };
};

(async () => {
  const profName = process.argv[2] || 'draft', prof = PROFILES[profName];
  if (!prof) throw new Error('usage: node bridge.js [draft|vert]');
  const s = await openSession({ width: prof.width, height: prof.height, port: prof.port });
  await hookAudio(s);
  await s.startMatch({ mode: 'battleroyale', p1: 'axe', p1Color: '#00d4ff', settleMs: 5000 });
  await quiet(s);
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
  const out = path.join(__dirname, 'work', profName, 'bridge');
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
