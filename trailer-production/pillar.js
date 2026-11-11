'use strict';
// "Every hit cracked the pillar" Short: the Ruins temple's pillars in a real Battle Royale match.
//
//   node pillar.js [draft|vert]   → work/<profile>/pillar.mov (+ .json log)
//
// Varek hammers Kael against the middle pillar of the temple's portico. Heavy blows beside a pillar crack it
// (the game's own structure damage); Kael's one hit back is the last it takes, and it goes over the way the hit
// went, onto Varek. The director places the two, presses their attacks and keeps the pillar standing until the
// last hit; the cracks, the fall and the crush are the game's own code (smb-br-structures.js).
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  draft: { width: 1707, height: 960, cropW: 540, port: 8226 },
  vert: { width: 3414, height: 1920, cropW: 1080, port: 8228 },
};
const FRAMES = 460;

const quiet = s => s.eval(() => {
  window.endGame = function () {};
  settings.autoPerf = false;
  if (typeof _performanceModeActive !== 'undefined' && _performanceModeActive) togglePerformanceMode(true);
  settings.particles = true;
  window.drawEdgeIndicators = () => {}; window.drawHitEffectivenessHUD = () => {};
  window.drawMatchAnnouncer = () => {}; window._drawAnnouncer = () => {};
  window.drawAchievementPopups = () => {}; window.drawAbilityUnlockToast = () => {};
  window.drawBattleRoyaleHUD = () => {};
  window._brDrawLandmarkSigns = () => {};
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
  const D = window.__dir = { f: 0, t: 0, phase: 'start', log: {} };
  const p1 = players[0];
  brJumped = true; brLanded = true; brPlaneFlight = false;
  p1._brOnPlane = false; p1.name = 'Kael';
  p1.weaponKey = 'sword'; p1.weapon = WEAPONS.sword;
  const foe = minions.filter(b => b._brBot && b.health > 0 && !b._brWildlife)[0];
  for (let i = minions.length - 1; i >= 0; i--) if (minions[i] !== foe) minions.splice(i, 1);
  const put = (f, x, face) => { f.x = x - f.w / 2; f.y = 900 - f.h; f.vx = 0; f.vy = 0; f.onGround = true; f.facing = face; };
  // Under the portico: Kael backed against the middle pillar, Varek with a hammer on his right.
  D.P = brPillars[1];
  put(p1, 7100, 1);
  put(foe, 7170, -1);
  foe._brSleep = false; foe._brOnPlane = false; foe._brDropped = true; foe._brLanded = true;
  foe.isAI = false; foe.maxHealth = foe.health = 150; foe.invincible = 0; foe.color = '#ff3a3a'; foe.name = 'Varek';
  foe.weaponKey = 'hammer'; foe.weapon = WEAPONS.hammer;
  p1.health = p1.maxHealth * 0.7;   // two hammer blows must not be lethal: a kill plays the hammer's finisher
  D.foe = foe;
  brTempleHold = 0; brTempleDoor = 0;
  D.cam = { x: 7135, y: 790, z: 1.3 };
  D.camT = { x: 7135, y: 790, z: 1.3 };
  const uc = window.updateCamera;
  window.updateCamera = function () {
    if (!window.__manual) return uc.apply(this, arguments);
    const c = D.cam, t = D.camT;
    c.x += (t.x - c.x) * 0.08; c.y += (t.y - c.y) * 0.08; c.z += (t.z - c.z) * 0.06;
    camXCur = camXTarget = c.x; camYCur = camYTarget = c.y; camZoomCur = camZoomTarget = c.z;
  };
  window.__focusScreen = () => canvas.width / 2;
}

function tick() {
  const D = window.__dir, p1 = players[0], foe = D.foe, P = D.P;
  const go = ph => { D.phase = ph; D.t = 0; D.log[ph] = D.f; };
  const put = (f, x) => { f.x = x - f.w / 2; f.vx = 0; };
  p1.health = Math.max(p1.health, p1.maxHealth * 0.15);
  // No supers in this take (a hammer blow filled Varek's: EARTH SHATTER buried the pillar), and no i-frame bubble
  // on Kael (the health floor above is what keeps him up).
  for (const f of [p1, foe]) { f.superMeter = 0; f.superReady = false; }
  p1.invincible = 0;
  if (D.phase !== 'back') p1.cooldown = Math.max(p1.cooldown || 0, 2);
  foe.abilityCooldown = Math.max(foe.abilityCooldown || 0, 2);
  switch (D.phase) {
    case 'start': go('pound'); break;
    case 'pound': {
      // Varek's hammer, again and again, with Kael against the pillar. Every blow lands next to it and cracks it
      // (the game's own: heavy hits beside a pillar take its stone).
      p1.facing = 1; foe.facing = -1;
      const at = [20, 75, 130];
      const i = at.indexOf(D.t);
      if (i >= 0) {
        put(p1, 7100); put(foe, 7150);
        p1.invincible = 0; p1.shielding = false;
        foe.cooldown = 0; foe.attackEndlag = 0; foe.stunTimer = 0; foe.target = p1; foe.attack(p1);
        (D.log.blowDbg || (D.log.blowDbg = [])).push([Math.round(p1.health), foe.attackTimer, Math.round(foe.cx() - p1.cx())]);
        (D.log.blows || (D.log.blows = [])).push(D.f);
      }
      if (D.t > 0 && D.t % 5 === 0 && D.t < 175) { if (p1.cx() < 7080) put(p1, 7090); }   // he's pinned at the stone
      if (P.hp < 0.6) P.hp = 0.6;     // it holds until the last hit
      if (D.t >= 190) go('back');
      break;
    }
    case 'back':
      // One hit back. The game's own swing; it lands beside the pillar, and the pillar goes over onto Varek.
      if (D.t === 1) {
        put(p1, 7108); put(foe, 7160); p1.facing = 1; foe.facing = -1;
        P.hp = Math.min(P.hp, 0.3);
        foe.health = 24; foe.lives = 1; foe.invincible = 0;
        p1.cooldown = 0; p1.attackEndlag = 0; p1.stunTimer = 0; p1.attack(foe);
        D.log.hit = D.f;
      }
      if (P.state !== 'up' && !D.log.fall) D.log.fall = D.f;
      if (foe.health <= 0 && !D.log.ko) D.log.ko = D.f;
      D.camT = { x: 7150, y: 780, z: 1.2 };
      if (D.t > 200) go('after');
      break;
    case 'after':
      D.camT = { x: 7150, y: 790, z: 1.25 };
      break;
  }
  if (D.phase === 'pound') foe.health = Math.max(foe.health, 140);
  if (typeof brGroundItems !== 'undefined') brGroundItems.length = 0;
}

const probe = () => {
  const D = window.__dir || {};
  const p1 = players[0], f = D.foe;
  return { inv: players[0].invincible, ph: D.phase, f: D.f, php: D.P ? +D.P.hp.toFixed(2) : -1, pst: D.P ? D.P.state : '', x: Math.round(p1.cx()), h1: Math.round(p1.health),
    fx: f ? Math.round(f.cx()) : 0, fh: f ? Math.round(f.health) : 0 };
};

(async () => {
  const profName = process.argv[2] || 'draft', prof = PROFILES[profName];
  if (!prof) throw new Error('usage: node pillar.js [draft|vert]');
  const s = await openSession({ width: prof.width, height: prof.height, port: prof.port });
  await hookAudio(s);
  await s.startMatch({ mode: 'battleroyale', p1: 'sword', p1Color: '#00d4ff', settleMs: 5000 });
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
  const out = path.join(__dirname, 'work', profName, 'pillar');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const { log } = await record(s, out, Number(process.env.FRAMES || FRAMES), { fps: 60, probe, cropW: prof.cropW });
  const marks = await s.eval(() => Object.assign({ texts: window.__texts }, window.__dir.log));
  const j = JSON.parse(fs.readFileSync(out + '.json', 'utf8')); j.marks = marks; fs.writeFileSync(out + '.json', JSON.stringify(j));
  console.log('marks', JSON.stringify(marks));
  for (let i = 0; i < log.length; i += Number(process.env.EVERY || 40)) console.log(i, JSON.stringify(log[i]));
  console.log('last', JSON.stringify(log[log.length - 1]));
  console.log('errors', s.errors.slice(0, 5).join(' | '));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
