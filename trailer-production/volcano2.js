'use strict';
// "One more kill and it blows" Short: the volcano structure, opening mid-fight in the pit with the counter at 9/10.
//
//   node volcano2.js [draft|vert]   → work/<profile>/volcano2.mov (+ .json log)
//
// Built to the Oct 23 review rules: frame 0 is mid-action in the lit pit, the stake is a counter you can see.
// Kael's swing is the tenth kill; it rumbles, he climbs out and runs as it erupts. Same staging as volcano.js.
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  draft: { width: 1707, height: 960, cropW: 540, port: 8236 },
  vert: { width: 3414, height: 1920, cropW: 1080, port: 8238 },
};
const FRAMES = 560;

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
  const D = window.__dir = { f: 0, t: 0, phase: 'start', log: { heat: [] } };
  const p1 = players[0];
  brJumped = true; brLanded = true; brPlaneFlight = false;
  p1._brOnPlane = false; p1.name = 'Kael';
  // Four in the pit (Kael's four kills); two more who are still down there when it goes.
  const foes = minions.filter(b => b._brBot && b.health > 0 && !b._brWildlife).slice(0, 6);
  for (let i = minions.length - 1; i >= 0; i--) if (foes.indexOf(minions[i]) < 0) minions.splice(i, 1);
  const put = (f, x, feet, face) => { f.x = x - f.w / 2; f.y = feet - f.h; f.vx = 0; f.vy = 0; f.onGround = true; if (face) f.facing = face; };
  put(p1, 4880, 900, -1);                   // already in the pit, mid-fight
  p1.health = p1.maxHealth;
  // Pit: floor left 4800-4910, floor right 4990-5100, ledges 4800-4870 @790 and 5030-5100 @680.
  const spots = [[4890, 900], [5040, 900], [5070, 900], [5065, 680], [4840, 790], [5010, 900]];
  foes.forEach((f, i) => {
    f._brSleep = false; f._brOnPlane = false; f._brDropped = true; f._brLanded = true;
    f.isAI = false; f.maxHealth = f.health = 150; f.invincible = 0;
    put(f, spots[i][0], spots[i][1], i % 2 ? -1 : 1);
  });
  D.foes = foes;
  // The fight before him: six kills already in the pit.
  brVolcHeat = 9; brVolcState = 'idle';   // one kill from it
  // Keep the vent's small eruptions out of the take; the big one is the story.
  brVolcSpurt.phase = 'wait'; brVolcSpurt.t = 999999;
  // Camera: the director owns it (Battle Royale pins zoom at 1.0).
  D.cam = { x: 4862, y: 805, z: 1.35 };
  D.camT = { x: 4862, y: 805, z: 1.35 };
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
  const live = D.foes.filter(f => f.health > 0 && minions.indexOf(f) >= 0);
  const go = ph => { D.phase = ph; D.t = 0; D.log[ph] = D.f; };
  const put = (f, x, feet) => { f.x = x - f.w / 2; f.y = feet - f.h; f.vx = 0; f.vy = 0; };
  // Kael is never at risk in a staged take: hits and bombs land, but he holds on.
  p1.health = Math.max(p1.health, p1.maxHealth * 0.4);
  p1.invincible = 0;   // no i-frame bubble in the shot; the health floor keeps him up
  // A scripted hop along the real ledges: a parabola from A to B, peak `lift` above the higher end.
  const hop = (a, b, n, lift) => {
    const u = Math.min(1, D.t / n), k = 1 - u;
    const cx = (a[0] + b[0]) / 2, cy = Math.min(a[1], b[1]) - lift;
    const x = k * k * a[0] + 2 * k * u * cx + u * u * b[0], y = k * k * a[1] + 2 * k * u * cy + u * u * b[1];
    put(p1, x, y); p1.onGround = u >= 1; p1.facing = b[0] >= a[0] ? 1 : -1;
    return u >= 1;
  };
  const strike = (f) => {
    // The next one steps up to him and goes down to one swing (the game's own hit, kill, elimination). Kael holds
    // the floor left of the vent and they come at him from the wall side, so nobody is knocked down the vent
    // (a kill in the shaft is not a kill in the pit).
    put(p1, 4880, 900); p1.onGround = true;
    const side = -1;
    put(f, p1.cx() + side * 46, 900); f.onGround = true; f.facing = -side; f.health = 6; f.invincible = 0;
    p1.facing = side; p1.cooldown = 0; p1.attackEndlag = 0; p1.stunTimer = 0; p1.target = f;
    p1.attack(f);
    (D.log.strikes || (D.log.strikes = [])).push(D.f);
  };
  // Heat as it ticks: one mark per change, so the cut can sync the counter.
  if (D.lastHeat !== brVolcHeat || D.lastState !== brVolcState) {
    D.log.heat.push([D.f, brVolcHeat, brVolcState]); D.lastHeat = brVolcHeat; D.lastState = brVolcState;
  }
  switch (D.phase) {
    case 'start': go('kills'); break;
    case 'rim':
      // On the rim over the crater: the glow, the counter, the loot below.
      p1.facing = 1;
      D.camT = { x: 4875, y: 590, z: 1.25 };   // Kael, the crater mouth and the counter above it
      // The pit fighters trade blows below, unseen behind the mountain's face.
      if (D.t % 40 === 20 && live.length > 1) { const a = live[0], b = live[1]; a.cooldown = 0; a.facing = b.cx() > a.cx() ? 1 : -1; a.attack(b); b.health = Math.max(b.health, 120); }
      if (D.t >= 80) go('drop');
      break;
    case 'drop':
      // Off the crater edge and down onto the pit floor beside the vent (real fall).
      // Walk until he's off the lip, then let him fall.
      if (p1.y + p1.h < 600 && p1.onGround) { p1.vx = 3.4; p1.facing = 1; }
      D.camT = { x: 4890, y: Math.min(780, p1.y + 40), z: 1.35 };
      if (p1.onGround && p1.y + p1.h > 880) go('kills');
      break;
    case 'kills': {
      D.camT = { x: 4862, y: 805, z: 1.35 };
      if (p1.y + p1.h > 905 || p1.cx() > 4905) { put(p1, 4880, 900); p1.onGround = true; }   // never into the vent
      // A kill every ~45 frames until the counter reads 10 (one swing can take two: the axe splashes).
      // First, a trade of blows with the one in front of him (nobody falls), then the tenth kill at ~0.7 s.
      if (D.t === 1) { const f0 = live.filter(f => f.y + f.h > 880)[0] || live[0]; D.duel = f0; f0.x = 4836 - f0.w / 2; f0.y = 900 - f0.h; f0.vx = 0; f0.facing = 1; p1.facing = -1; }
      if (D.duel && (D.t === 6 || D.t === 24)) { const f0 = D.duel; f0.cooldown = 0; f0.attackEndlag = 0; f0.attack(p1); }
      if (D.duel && D.t === 14) { p1.cooldown = 0; p1.attackEndlag = 0; p1.attack(D.duel); D.duel.health = Math.max(D.duel.health, 120); }
      if (D.t >= 2 && D.t < 40 && D.duel) D.duel.health = Math.max(D.duel.health, 120);
      if ((D.t === 40 || (D.t > 40 && D.t % 45 === 40)) && brVolcState === 'idle' && brVolcHeat < 10) {
        // Prefer the ones on the floor near him; the last two stay on for the flood.
        const pick = (D.duel && D.duel.health > 0 && minions.indexOf(D.duel) >= 0) ? D.duel : (live.filter(f => f.y + f.h > 880).sort((a, b) => Math.abs(a.cx() - p1.cx()) - Math.abs(b.cx() - p1.cx()))[0] || live[0]);
        if (pick) strike(pick);
      }
      // The rest keep their distance (nobody walks into the shot mid-kill).
      for (const f of live) { if (f.health > 20) f.health = Math.max(f.health, 140); }
      if (brVolcState === 'rumble' || D.t > 260) go('climb');
      break;
    }
    case 'climb':
      // It's rumbling. Up the ledges and out: floor -> left ledge -> right ledge -> right rim (the real route).
      D.camT = { x: Math.max(4880, Math.min(5060, p1.cx())), y: Math.min(780, p1.y + 30), z: 1.2 };
      if (D.t === 1) { D.climb = 0; D.ct = 0; D.from = [p1.cx(), p1.y + p1.h]; }
      {
        const legs = [[[4840, 790], 22, 60], [[5065, 680], 30, 70], [[5085, 560], 24, 60]];
        const L = legs[D.climb];
        if (L) {
          const saveT = D.t; D.t = ++D.ct;
          const done = hop(D.from, L[0], L[1], L[2]);
          D.t = saveT;
          if (done) { D.from = L[0]; D.climb++; D.ct = -8; }   // a beat on each ledge
          if (D.ct < 0) { put(p1, D.from[0], D.from[1]); p1.onGround = true; }
        } else go('run');
      }
      break;
    case 'run':
      // Over the rim and down the right slope as it blows (real walking on the slope).
      p1.vx = 5.2; p1.facing = 1;
      D.camT = { x: Math.min(p1.cx() + 40, 5430), y: Math.min(760, p1.y + 20), z: 0.85 };
      if (p1.cx() > 5560 || D.t > 220) go('after');
      break;
    case 'after':
      // At the foot: turn and look back at it.
      // Past the foot: turn and watch the lava come down to where he just was.
      p1.vx *= 0.6;
      if (D.t === 12) p1.facing = -1;
      D.camT = { x: 5430, y: 740, z: 0.8 };
      break;
  }
  for (const f of live) { f.cooldown = Math.max(f.cooldown || 0, 2); f.abilityCooldown = Math.max(f.abilityCooldown || 0, 2); }
  if (D.phase !== 'kills') p1.cooldown = Math.max(p1.cooldown || 0, 2);
  // Dropped loadouts and loot orbs: clutter in a staged take.
  if (typeof brGroundItems !== 'undefined') brGroundItems.length = 0;
  D.log.alive = live.length;
}

const probe = () => {
  const D = window.__dir || {};
  const p1 = players[0];
  return { ph: D.phase, f: D.f, heat: brVolcHeat, vs: brVolcState, rev: +brVolcReveal.toFixed(2),
    x: Math.round(p1.cx()), feet: Math.round(p1.y + p1.h), alive: D.foes ? D.foes.filter(f => f.health > 0 && minions.indexOf(f) >= 0).length : -1,
    z: +camZoomCur.toFixed(2), run: gameRunning };
};

(async () => {
  const profName = process.argv[2] || 'draft', prof = PROFILES[profName];
  if (!prof) throw new Error('usage: node volcano2.js [draft|vert]');
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
  const out = path.join(__dirname, 'work', profName, 'volcano2');
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
