'use strict';
// "Inside the volcano when it erupts" Short: the camera never leaves the pit. It is already rumbling at frame 0
// with five fighters inside; the floor floods, a bomb and Kael's axe take the ledges, and he is the last one in it.
//
//   node volcano3.js [draft|vert]   → work/<profile>/volcano3.mov (+ .json log)
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  draft: { width: 1707, height: 960, cropW: 540, port: 8236 },
  vert: { width: 3414, height: 1920, cropW: 1080, port: 8238 },
};
const FRAMES = 290;

// Capture hygiene, as cataclysm.js.
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
  const D = window.__dir = { f: 0, t: 0, phase: 'start', log: { heat: [], inside: [] } };
  const p1 = players[0];
  brJumped = true; brLanded = true; brPlaneFlight = false;
  p1._brOnPlane = false; p1.name = 'Kael';
  settings.finishers = false;
  // Four others in the pit with him when it goes: two on the floor, one on each ledge.
  const foes = minions.filter(b => b._brBot && b.health > 0 && !b._brWildlife).slice(0, 4);
  for (let i = minions.length - 1; i >= 0; i--) if (foes.indexOf(minions[i]) < 0) minions.splice(i, 1);
  const put = (f, x, feet, face) => { f.x = x - f.w / 2; f.y = feet - f.h; f.vx = 0; f.vy = 0; f.onGround = true; if (face) f.facing = face; };
  put(p1, 4880, 900, -1);
  p1.health = p1.maxHealth;
  // Pit: floor 4800-4910 | vent 4910-4990 | floor 4990-5100; ledges 4800-4870 @790 and 5030-5100 @680.
  const spots = [[4836, 900, 1, 7], [5050, 900, -1, 7], [4858, 790, 1, 19], [5045, 680, 1, 40]];
  foes.forEach((f, i) => {
    f._brSleep = false; f._brOnPlane = false; f._brDropped = true; f._brLanded = true;
    f.isAI = false; f.maxHealth = 150; f.health = spots[i][3]; f.invincible = 0;
    put(f, spots[i][0], spots[i][1], spots[i][2]);
  });
  D.foes = foes; D.floorA = foes[0]; D.floorB = foes[1]; D.ledgeL = foes[2]; D.ledgeR = foes[3];
  // The tenth kill just landed: it is already rumbling.
  brVolcHeat = 10; brVolcState = 'rumble'; brVolcTimer = 45; brVolcBanner = 0;
  brVolcSpurt.phase = 'wait'; brVolcSpurt.t = 999999;
  D.cam = { x: 4968, y: 735, z: 0.78 };
  D.camT = { x: 4968, y: 735, z: 0.78 };
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
  const D = window.__dir, p1 = players[0];
  const alive = f => f.health > 0 && minions.indexOf(f) >= 0;
  const live = D.foes.filter(alive);
  const put = (f, x, feet) => { f.x = x - f.w / 2; f.y = feet - f.h; f.vx = 0; f.vy = 0; };
  p1.health = Math.max(p1.health, p1.maxHealth * 0.4);
  p1.invincible = 0;
  // Kael's route, a scripted hop along the real ledges: [start frame, from, to, frames, lift].
  const legs = [[34, [4880, 900], [4846, 790], 20, 50], [96, [4846, 790], [5086, 680], 32, 85]];
  let held = null;
  for (const [s0, a, b, n, lift] of legs) {
    if (D.f < s0) { held = held || a; break; }
    if (D.f < s0 + n) {
      const u = (D.f - s0) / n, k = 1 - u;
      const cx = (a[0] + b[0]) / 2, cy = Math.min(a[1], b[1]) - lift;
      put(p1, k * k * a[0] + 2 * k * u * cx + u * u * b[0], k * k * a[1] + 2 * k * u * cy + u * u * b[1]);
      p1.onGround = false; p1.facing = b[0] >= a[0] ? 1 : -1; held = 'air'; break;
    }
    held = b;
  }
  if (held && held !== 'air') { put(p1, held[0], held[1]); p1.onGround = true; }
  // Before he climbs: a trade of blows with the one beside him on the floor.
  if (D.f === 6 || D.f === 22) { const f = D.floorA; if (alive(f)) { f.cooldown = 0; f.attackEndlag = 0; f.facing = 1; f.attack(p1); } }
  if (D.f === 14) { p1.facing = -1; p1.cooldown = 0; p1.attackEndlag = 0; p1.attack(D.floorA); D.floorA.health = Math.max(D.floorA.health, 15); }
  // The left-ledge one: a bomb comes down on him just after Kael leaves (a real volcano bomb, aimed).
  if (D.f === 70) brVolcBombs.push({ x: BR_VOLC_CRATER.x - 10, y: BR_VOLC_CRATER.y + 10, vx: -2.15, vy: -6.5, _staged: true, px: 0, py: 0 });
  // The right-ledge one turns on him as he lands; Kael's swing puts him over the edge.
  // The two on the ledges hold their spots until their moment (stray bombs land in the pit all through the take).
  if (D.f < 118 && alive(D.ledgeL)) { put(D.ledgeL, 4858, 790); D.ledgeL.onGround = true; D.ledgeL.health = 19; }
  if (D.f < 140 && alive(D.ledgeR)) { put(D.ledgeR, 5045, 680); D.ledgeR.onGround = true; D.ledgeR.health = 40; D.ledgeR.facing = 1; }
  // The lava takes whoever goes in: the game's own lava bounces and burns, low health makes the first touch the last.
  if (brVolcFlood) for (const f of live) if (f.y + f.h >= brVolcFlood.y - 2 && f.cx() > BR_VOLC.pitL && f.cx() < BR_VOLC.pitR) { f.health = Math.min(f.health, 7); if (!f._v3burn) { f._v3burn = 1; f._brLavaTick = 0; } }
  if (D.f === 140 && alive(D.ledgeR)) { p1.facing = -1; p1.cooldown = 0; p1.attackEndlag = 0; p1.stunTimer = 0; p1.ragdollTimer = 0; p1.attack(D.ledgeR); D.ledgeR.health = Math.max(D.ledgeR.health, 15); D.log.swing = [p1.attackTimer, p1.state, p1.cooldown, D.ledgeR.health]; }
  if (D.f === 142 && alive(D.ledgeR)) { D.ledgeR.vx = -7; D.ledgeR.vy = -5; D.ledgeR.health = Math.min(D.ledgeR.health, 7); D.ledgeR._brLavaTick = 0; D.ledgeR._v3burn = 1; }
  // The vent goes off beside him once he's alone.
  if (D.f === 172) { brVolcSpurt.phase = 'wait'; brVolcSpurt.t = 1; }
  // Nobody walks or swings on their own.
  for (const f of live) { f.cooldown = Math.max(f.cooldown || 0, 2); f.abilityCooldown = Math.max(f.abilityCooldown || 0, 2); }
  if (![14, 140].includes(D.f)) p1.cooldown = Math.max(p1.cooldown || 0, 2);
  // Camera: the whole pit, leaning toward Kael as he climbs.
  D.camT = { x: 4968, y: 735, z: 0.78 };
  const inside = 1 + live.length;
  if (D.lastInside !== inside) { D.log.inside.push([D.f, inside]); D.lastInside = inside; }
  if (D.lastHeat !== brVolcHeat || D.lastState !== brVolcState) {
    D.log.heat.push([D.f, brVolcHeat, brVolcState]); D.lastHeat = brVolcHeat; D.lastState = brVolcState;
  }
  if (typeof brGroundItems !== 'undefined') brGroundItems.length = 0;
  D.phase = D.f < 34 ? 'floor' : D.f < 126 ? 'climb' : D.f < 200 ? 'ledge' : 'alone';
  D.log[D.phase] = D.log[D.phase] || D.f;
}

const probe = () => {
  const D = window.__dir || {};
  const p1 = players[0];
  return { ph: D.phase, f: D.f, heat: brVolcHeat, vs: brVolcState, rev: +brVolcReveal.toFixed(2), sp: brVolcSpurt.phase, bombs: brVolcBombs.length,
    hp: D.foes ? D.foes.map(f => minions.indexOf(f) >= 0 ? Math.round(f.health) : 'x').join(',') : '',
    x: Math.round(p1.cx()), feet: Math.round(p1.y + p1.h), alive: D.foes ? D.foes.filter(f => f.health > 0 && minions.indexOf(f) >= 0).length : -1,
    z: +camZoomCur.toFixed(2), run: gameRunning };
};

(async () => {
  const profName = process.argv[2] || 'draft', prof = PROFILES[profName];
  if (!prof) throw new Error('usage: node volcano3.js [draft|vert]');
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
  const out = path.join(__dirname, 'work', profName, 'volcano3');
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
