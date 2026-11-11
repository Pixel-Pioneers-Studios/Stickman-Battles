'use strict';
// "He let go of the door" Short: the Ruins temple vault in a real Battle Royale match.
//
//   node vault.js [draft|vert]   → work/<profile>/vault.mov (+ .json log)
//
// The vault's door only stays up while someone stands on its plate. Varek holds it; Kael is inside, breaking a
// chest. Varek looks in, steps off, and walks away: the door comes down. Kael finds the plate on the inside,
// the door goes up, and he walks out with what was in the chest. The director places the two, steers their
// walking and presses Kael's E; the plates, the door, the chest, the hit and the elimination are the game's own
// code (smb-br-structures.js, smb-battleroyale.js). Everyone else leaves the match.
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  draft: { width: 1707, height: 960, cropW: 540, port: 8216 },
  vert: { width: 3414, height: 1920, cropW: 1080, port: 8218 },
};
const FRAMES = 900;

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
  // Bare-handed going in: the chest is the point.
  p1.weaponKey = 'combat'; p1.weapon = WEAPONS.combat;
  const foe = minions.filter(b => b._brBot && b.health > 0 && !b._brWildlife)[0];
  for (let i = minions.length - 1; i >= 0; i--) if (minions[i] !== foe) minions.splice(i, 1);
  const put = (f, x, face) => { f.x = x - f.w / 2; f.y = 900 - f.h; f.vx = 0; f.vy = 0; f.onGround = true; f.facing = face; };
  put(p1, 7262, 1);               // inside, at the shelf
  put(foe, 7112, 1);              // on the outer plate, facing the door
  foe._brSleep = false; foe._brOnPlane = false; foe._brDropped = true; foe._brLanded = true;
  foe.isAI = false; foe.maxHealth = foe.health = 150; foe.invincible = 0; foe.color = '#ff3a3a'; foe.name = 'Varek';
  foe.weaponKey = 'axe'; foe.weapon = WEAPONS.axe;
  D.foe = foe;
  // One chest on the shelf, the one he's breaking: it holds a hammer (the vault's loot is random; this take
  // needs the hammer). The rest of the vault's chests stay where they are.
  const vb = brLootBoxes.filter(b => b._vault && !b.opened);
  D.box = vb.sort((a, b) => Math.abs(a.x - 7280) - Math.abs(b.x - 7280))[0] || null;
  if (D.box) { D.box.x = 7285; D.box.item = { type: 'weapon', weaponKey: 'hammer', label: 'Hammer', icon: '⚔', color: '#c070ff', rarity: 'epic', rarityLabel: 'Epic' }; }
  for (const b of vb) if (b !== D.box) b.opened = true, b.anim = 0;   // one chest in the shot, not a pile
  brTempleHold = 100; brTempleDoor = 1;
  // Camera owned by the director.
  D.cam = { x: 7215, y: 800, z: 1.15 };
  D.camT = { x: 7215, y: 800, z: 1.15 };
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
  const D = window.__dir, p1 = players[0], foe = D.foe;
  const go = ph => { D.phase = ph; D.t = 0; D.log[ph] = D.f; };
  const walk = (f, x, spd) => { const d = x - f.cx(); if (Math.abs(d) > 6) { f.vx = Math.sign(d) * spd; f.facing = Math.sign(d); return false; } f.vx = 0; return true; };
  p1.health = Math.max(p1.health, p1.maxHealth * 0.6);
  // Kael never touches anything but the one chest until he's out.
  if (D.phase !== 'out') p1.cooldown = Math.max(p1.cooldown || 0, 2);
  foe.cooldown = Math.max(foe.cooldown || 0, 2); foe.abilityCooldown = Math.max(foe.abilityCooldown || 0, 2);
  switch (D.phase) {
    case 'start': go('hold'); break;
    case 'hold':
      // Kael at the shelf breaking the chest (the game's own contact breaking); Varek on the plate.
      p1.facing = 1; foe.facing = 1;
      D.camT = { x: 7215, y: 800, z: 1.15 };
      if (D.box && D.box.opened && !D.log.opened) {
        D.log.opened = D.f;
        // Pick up what fell out of it (the game's own pickup path).
        const gi = brGroundItems.find(g => g.item && g.item.weaponKey === 'hammer');
        if (gi) { _brApplyItem(gi.item, p1); brGroundItems.splice(brGroundItems.indexOf(gi), 1); }
        else _brApplyItem(D.box.item, p1);
      }
      if (D.log.opened && D.f - D.log.opened > 30) go('letgo');
      if (D.t > 200) go('letgo');
      break;
    case 'letgo':
      // He looks in at Kael, then off the plate and away.
      D.camT = { x: 7180, y: 800, z: 1.15 };
      if (D.t < 40) { foe.facing = 1; foe.vx = 0; }
      else if (walk(foe, 6990, 2.4) && !D.log.away) D.log.away = D.f;
      if (D.t > 40 && !D.log.off) D.log.off = D.f;
      if (brTempleDoor < 0.08 && !D.log.shut) { D.log.shut = D.f; if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 10); }
      // Kael turns, runs for the door, and it's down before he gets there.
      if (D.t > 70) walk(p1, 7232, 3.2);
      if (D.log.shut && D.f - D.log.shut > 40) go('inside');
      if (D.t > 320) go('inside');
      break;
    case 'inside':
      // At the shut door. Then the plate on this side.
      D.camT = { x: 7240, y: 800, z: 1.25 };
      foe.facing = -1;   // he turns back to look at what he did
      if (D.t > 30 && walk(p1, 7338, 2.6) && !D.log.plate) D.log.plate = D.f;   // back across to the plate at the far wall
      if (brTempleDoor > 0.9 && !D.log.up) D.log.up = D.f;
      if (D.log.up && D.f - D.log.up > 10) go('out');
      if (D.t > 260) go('out');
      break;
    case 'out': {
      // Out the door with the hammer. The game's own E (Mjolnir) has to connect.
      D.camT = { x: Math.max(6980, Math.min(7200, (p1.cx() + foe.cx()) / 2)), y: 800, z: 1.2 };
      if (!D.log.swing) {
        if (walk(p1, foe.cx() + 70, 4.2)) {
          foe.health = Math.min(foe.health, 30); foe.lives = 1; foe.invincible = 0; foe.facing = 1;
          p1.facing = -1; p1.stunTimer = 0; p1.superMeter = 100; p1.superReady = true; p1.cooldown = 0;
          p1.useSuper(foe);
          D.log.swing = D.f;
        }
      }
      if (D.log.swing && foe.health <= 0 && !D.log.ko) D.log.ko = D.f;
      if (D.t > 260) go('after');
      break;
    }
    case 'after':
      D.camT = { x: p1.cx(), y: 800, z: 1.2 };
      break;
  }
  if (D.phase !== 'out' && D.phase !== 'after') foe.health = Math.max(foe.health, 140);
  if (D.phase !== 'hold' && typeof brGroundItems !== 'undefined') brGroundItems.length = 0;
}

const probe = () => {
  const D = window.__dir || {};
  const p1 = players[0], f = D.foe;
  return { ph: D.phase, f: D.f, door: +brTempleDoor.toFixed(2), plates: brTemplePlates.map(b => b ? 1 : 0).join(''),
    x: Math.round(p1.cx()), w: p1.weaponKey, fx: f ? Math.round(f.cx()) : 0, fh: f ? Math.round(f.health) : 0, rev: +brTempleReveal.toFixed(2) };
};

(async () => {
  const profName = process.argv[2] || 'draft', prof = PROFILES[profName];
  if (!prof) throw new Error('usage: node vault.js [draft|vert]');
  const s = await openSession({ width: prof.width, height: prof.height, port: prof.port });
  await hookAudio(s);
  await s.startMatch({ mode: 'battleroyale', p1: 'combat', p1Color: '#00d4ff', settleMs: 5000 });
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
  const out = path.join(__dirname, 'work', profName, 'vault');
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
