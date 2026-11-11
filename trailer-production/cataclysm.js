'use strict';
// "Most overpowered weapon" Short: Cataclysm in a real Battle Royale match, staged in The City.
//
//   node cataclysm.js [draft|vert]   → work/<profile>/cataclysm.mov (+ .json log)
//
// Six fighters close in on Kael. Three swings stack three Convictions; Q drops a meteor swarm across the
// street (the towers come down, the office windows go); the super brings Cosmic Axiom. The director
// places fighters, presses Kael's buttons and picks which Conviction each swing shows; the hazards,
// meteors, black hole, damage and collapses are the game's own code (smb-cataclysm.js, smb-br-structures.js).
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  draft: { width: 1707, height: 960, cropW: 540, port: 8186 },
  vert: { width: 3414, height: 1920, cropW: 1080, port: 8188 },
};
const FRAMES = 940;

// Capture hygiene, as moves.js: no HUD, numbers, plates, banners. Battle Royale adds its own HUD and minimap.
const quiet = s => s.eval(() => {
  window.endGame = function () {};
  settings.autoPerf = false;
  if (typeof _performanceModeActive !== 'undefined' && _performanceModeActive) togglePerformanceMode(true);
  settings.particles = true;
  window.drawEdgeIndicators = () => {}; window.drawHitEffectivenessHUD = () => {};
  window.drawMatchAnnouncer = () => {}; window._drawAnnouncer = () => {};
  window.drawAchievementPopups = () => {}; window.drawAbilityUnlockToast = () => {};
  window.drawBattleRoyaleHUD = () => {};
  settings.dmgNumbers = false;
  DamageText.prototype.draw = () => {};
  window.drawEntityOverlays = () => {};
  Object.defineProperty(Fighter.prototype, 'superFlashTimer', { get: () => 0, set() {}, configurable: true });
  for (const p of players) if (p) delete p.superFlashTimer;
  const hud = document.getElementById('hud'); if (hud) hud.style.display = 'none';
  window.__texts = [];
  const logText = (kind, text) => window.__texts.push({ f: window.__dir ? window.__dir.f : -1, kind, text });
  CinFX.nameCard = (text) => logText('card', text);   // Axiom's name goes in the caption instead
  window.queueAnnouncement = (text) => logText('line', text);
});

function install() {
  const D = window.__dir = { f: 0, t: 0, phase: 'start', log: {} };
  const p1 = players[0];
  brJumped = true; brLanded = true; brPlaneFlight = false;
  p1._brOnPlane = false;
  p1.weapon = WEAPONS.cataclysm; p1.weaponKey = 'cataclysm'; p1.name = 'Kael';
  // The street: six of them, Kael between. Everyone else leaves the match, so nobody drops into the shot.
  const foes = minions.filter(b => b._brBot && b.health > 0 && !b._brWildlife).slice(0, 6);
  for (let i = minions.length - 1; i >= 0; i--) if (foes.indexOf(minions[i]) < 0) minions.splice(i, 1);
  const G = 900, KX = 1470;
  const put = (f, x, face) => { f.x = x - f.w / 2; f.y = G - f.h; f.vx = 0; f.vy = 0; f.onGround = true; f.facing = face; };
  put(p1, KX, 1);
  p1.health = p1.maxHealth * 0.35;
  const xs = [KX - 200, KX - 150, KX - 105, KX + 105, KX + 150, KX + 200];
  foes.forEach((f, i) => {
    f._brSleep = false; f._brOnPlane = false; f._brDropped = true; f._brLanded = true;
    f.isAI = false; f.target = p1; f.maxHealth = f.health = 150; f.invincible = 0;
    put(f, xs[i], xs[i] < KX ? 1 : -1);
  });
  D.foes = foes; D.KX = KX; D.G = G;
  p1.target = foes[4];
  // Camera: Battle Royale's own camera pins zoom at 1.0, so the director owns it while recording.
  D.cam = { x: KX, y: G - 120, z: 1.05 };
  D.camT = { x: KX, y: G - 120, z: 1.05 };
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
  const go = ph => { D.phase = ph; D.t = 0; D.log[ph] = D.f; };
  // Kael never falls in a staged take; he takes hits but holds his ground.
  p1.health = Math.max(p1.health, p1.maxHealth * 0.3);
  const st = () => ({ st: p1.state, rag: p1.ragdollTimer, stun: p1.stunTimer, atk: p1.attackTimer, cd: p1.cooldown, el: p1.attackEndlag, sr: p1.superReady, ms: !!p1._msScene, lock: !!p1._msLock, fin: !!(typeof activeFinisher !== 'undefined' && activeFinisher), chain: p1._basicChainReadyAt, fc: frameCount });
  const swing = (face, kind) => {
    (D.log.dbg || (D.log.dbg = [])).push(['swing', D.f, st()]);
    p1.facing = face; p1.cooldown = 0; p1.attackEndlag = 0; p1.stunTimer = 0;
    p1.target = live.find(f => (f.cx() - p1.cx()) * face > 0) || live[0] || p1.target;
    p1.attack(p1.target);
    const e = cxEffects.filter(e => e.type === 'conv' && e.owner === p1).pop();
    if (e && kind) {
      const c = CX_CONVICTIONS.find(c => c.key === kind);
      const def = (typeof DOMAIN_DEFS !== 'undefined' && DOMAIN_DEFS[c.cls]) || null;
      e.kind = kind; e.name = ((def && def.name) || c.name).toUpperCase(); e.color = (def && def.color) || c.color;
      e.ax = p1.target ? p1.target.cx() : p1.cx() + face * 200; e.ay = p1.target ? p1.target.cy() : p1.cy();
      (D.log.convs || (D.log.convs = [])).push([D.f, kind]);
    }
  };
  switch (D.phase) {
    case 'start': go('close'); break;
    case 'close':
      // They close in from both sides.
      for (const f of live) {
        const d = p1.cx() - f.cx();
        f.facing = d > 0 ? 1 : -1;
        f.vx = Math.abs(d) > 95 ? Math.sign(d) * 1.5 : 0;
      }
      D.camT = { x: D.KX, y: D.G - 120, z: 1.05 };
      if (D.t >= 75) go('swings');
      break;
    case 'swings':
      D.camT = { x: D.KX, y: D.G - 150, z: 0.92 };
      if (D.t === 1)  swing(1, 'storm');   // D.t is already 1 on a phase's first tick
      if (D.t === 42) swing(-1, 'sanctuary');
      if (D.t === 84) swing(1, 'blades');
      for (const f of live) f.vx *= 0.8;
      if (D.t >= 150) go('meteors');
      break;
    case 'meteors':
      // Pull back to take in the towers and the office.
      D.camT = { x: D.KX + 100, y: D.G - 240, z: 0.6 };
      if (D.t === 10) {
        for (const f of live) f.health = Math.max(f.health, 120);   // the swarm softens them; Axiom finishes it
        p1.facing = 1; p1.target = live.find(f => f.cx() > p1.cx()) || live[0];
        p1.abilityCooldown = 0; p1.stunTimer = 0; p1.ability(p1.target);
        D.log.q = D.f;
      }
      // The survivors get up and charge back in, which puts them in the black hole's reach.
      if (D.t > 125) for (const f of live) {
        const d = p1.cx() - f.cx();
        f.facing = d > 0 ? 1 : -1;
        if (Math.abs(d) > 120 && f.onGround) f.vx = Math.sign(d) * 4.2;
      }
      if (D.t >= 235) go('axiom');
      break;
    case 'axiom':
      D.camT = { x: D.KX + 60, y: D.G - 200, z: 0.72 };
      if (D.t === 1) {
        // Whoever is left is in reach of the hole, and won't walk out of the collapse.
        live.forEach((f, i) => { f.health = Math.min(f.health, 55); });
        p1.facing = 1; p1.target = live.find(f => f.cx() > p1.cx()) || live[0];
        p1.superMeter = 100; p1.superReady = true; p1.stunTimer = 0;
        (D.log.dbg || (D.log.dbg = [])).push(['super-before', D.f, st()]);
        p1.useSuper(p1.target);
        (D.log.dbg || (D.log.dbg = [])).push(['super-after', D.f, st(), cxEffects.map(e => e.type).join(',')]);
        D.log.super = D.f;
      }
      if (D.t >= 380) go('after');
      break;
    case 'after':
      D.camT = { x: p1.cx(), y: D.G - 120, z: 1.1 };
      break;
  }
  for (const f of live) {
    f.cooldown = Math.max(f.cooldown || 0, 2); f.abilityCooldown = Math.max(f.abilityCooldown || 0, 2);
    // Knockback never carries anyone out of the shot.
    if (f.cx() < D.KX - 420) { f.x = D.KX - 420 - f.w / 2; f.vx = Math.max(0, f.vx); }
    if (f.cx() > D.KX + 440) { f.x = D.KX + 440 - f.w / 2; f.vx = Math.min(0, f.vx); }
  }
  D.log.alive = live.length;
  // Battle Royale drops loot orbs (and a dead fighter's loadout) on the street: clutter in a staged take.
  if (typeof brGroundItems !== 'undefined') brGroundItems.length = 0;
  if (D.phase === 'axiom' && (D.t === 2 || D.t === 100 || D.t === 230)) {
    const ax = cxEffects.find(e => e.type === 'axiom');
    (D.log.pos || (D.log.pos = [])).push([D.t, live.map(f => Math.round(f.cx()) + ',' + Math.round(f.y + f.h) + ':' + Math.round(f.health)).join(' '), ax && ax.hole ? Math.round(ax.hole.x) + ',' + Math.round(ax.hole.y) : 'nohole', 'p1 ' + Math.round(p1.cx())]);
  }
}

const probe = () => {
  const D = window.__dir || {};
  return { ph: D.phase, f: D.f, alive: D.foes ? D.foes.filter(f => f.health > 0 && minions.indexOf(f) >= 0).length : -1,
    fx: cxEffects.map(e => e.type[0]).join(''), towers: brTowers.map(t => t.state[0]).join(''), win: brOfficeWindows.filter(w => w.broken).length,
    z: +camZoomCur.toFixed(2), run: gameRunning };
};

(async () => {
  const profName = process.argv[2] || 'draft', prof = PROFILES[profName];
  if (!prof) throw new Error('usage: node cataclysm.js [draft|vert]');
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
  const out = path.join(__dirname, 'work', profName, 'cataclysm');
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
