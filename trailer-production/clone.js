'use strict';
// "AI series" footage: a trained net plays Player 1 in a real Sovereign match against the live
// Sovereign brain (data/brain/latest.json), recorded frame-stepped like moves.js.
//
//   node clone.js <name> <checkpoint.json> [frames=7200] [draft|vert]   → work/<profile>/clone-<name>.mov (+ .json log)
//
// The net drives Player 1 exactly the way Brain.possess does (one decision every Brain.REPEAT frames,
// greedy off), but from this script, because Brain's single live slot is Sovereign's.
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  draft: { width: 1707, height: 960, cropW: 540, port: 8186 },
  vert: { width: 3414, height: 1920, cropW: 1080, port: 8188 },
};

// No HUD, damage numbers, plates or banners (as moves.js), and the match never ends on its own.
const quiet = s => s.eval(() => {
  window.endGame = function () {};
  settings.autoPerf = false;
  if (typeof _performanceModeActive !== 'undefined' && _performanceModeActive) togglePerformanceMode(true);
  settings.particles = true;
  window.drawEdgeIndicators = () => {}; window.drawHitEffectivenessHUD = () => {};
  window.drawMatchAnnouncer = () => {}; window._drawAnnouncer = () => {};
  window.drawAchievementPopups = () => {}; window.drawAbilityUnlockToast = () => {};
  settings.dmgNumbers = false;
  DamageText.prototype.draw = () => {};
  window.drawEntityOverlays = () => {};
  const hud = document.getElementById('hud'); if (hud) hud.style.display = 'none';
  if (typeof DomainManager !== 'undefined') DomainManager.drawSpeechBubbles = () => {};
  Object.defineProperty(Fighter.prototype, 'superFlashTimer', { get: () => 0, set() {}, configurable: true });
  for (const p of players) if (p) delete p.superFlashTimer;
  window.__events = [];
  const logText = (kind, text) => window.__events.push({ f: window.__cf || 0, kind, text });
  window.queueAnnouncement = (text) => logText('line', text);
  // Finisher titles and subtitles are set as captions in the cut (the 9:16 crop slices them).
  window._finTitle = (c, text) => { if (!window.__events.some(e => e.text === text && window.__cf - e.f < 300)) logText('fintitle', text); };
  window._finSubtitle = (c, text) => { if (!window.__events.some(e => e.text === text && window.__cf - e.f < 300)) logText('finsub', text); };
  CinFX.nameCard = (text) => logText('card', text);
  // Phone-size clutter (AI Day 2 and 3 reviews): Sovereign's aura rings and taunt bubbles, the gun's ammo pips
  // and cooldown bar, the i-frame bubble. Drawing only: the match plays exactly as before.
  window.showBossDialogue = () => {}; window.drawBossDialogue = () => {};
  settings.bossAura = false;
  const sov = players[1], d2 = sov.draw.bind(sov);
  sov.draw = function () { const lb = sov._limiterBroken; sov._limiterBroken = false; try { d2(); } finally { sov._limiterBroken = lb; } };
  for (const p of players) {
    const d = p.draw.bind(p);
    p.draw = function () {
      // The i-frame bubble is hidden for the draw only; the i-frames still apply.
      const w = p.weapon, t = w && w.type, inv = p.invincible, cs = w && w.clipSize;
      if (w && t === 'ranged') w.type = 'thrown'; if (cs) w.clipSize = 0; p.invincible = 0;
      try { d(); } finally { if (w) { w.type = t; if (cs) w.clipSize = cs; } p.invincible = inv; }
    };
  }
});

const probe = () => {
  const p1 = players[0], p2 = players[1];
  window.__cf = (window.__cf || 0) + 1;
  // Shots fired by Player 1 so far (AI Day 5's counter).
  for (const pr of projectiles) if (pr.owner === p1 && !pr.__c) { pr.__c = 1; window.__s1 = (window.__s1 || 0) + 1; }
  return { s1: window.__s1 || 0, h1: Math.round(p1.health), h2: Math.round(p2.health), l1: p1.lives, l2: p2.lives,
    x1: Math.round(p1.cx()), x2: Math.round(p2.cx()), fin: activeFinisher ? (activeFinisher.def && activeFinisher.def.name) || 1 : 0,
    sup1: !!p1.superReady, fc1: p1.facing, fc2: p2.facing, g2: !!p2.onGround, run: gameRunning, sov: !!(Brain.live && Brain.live.f === p2) };
};

(async () => {
  const [name, ckpt, framesArg, profName = 'draft'] = process.argv.slice(2);
  const prof = PROFILES[profName];
  if (!name || !ckpt || !prof) throw new Error('usage: node clone.js <name> <checkpoint.json> [frames] [draft|vert]');
  const j = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', ckpt), 'utf8'));
  const s = await openSession({ width: prof.width, height: prof.height, port: prof.port });
  await hookAudio(s);
  await s.eval(() => { try { localStorage.setItem('smb_brain_sov', '1'); } catch (e) {} });
  // P1W / P1C override the clone's loadout (AI Day 3: the same net holding a gun).
  await s.startMatch({ mode: 'sovereign', p1: process.env.P1W || 'katana', p1Class: process.env.P1C || 'thor', p1Bot: false, settleMs: 5000 });
  await quiet(s);
  // SOV=<checkpoint.json> swaps Sovereign's brain for a candidate (greedy, as in hunteval).
  if (process.env.SOV) {
    const sj = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', process.env.SOV), 'utf8'));
    console.log('sov swap', await s.eval((pi, play) => {
      const sov = players[1];
      if (!Brain.possess(sov, pi, players[0])) return 'failed';
      Brain.live.greedy = true; Brain.live.play = play;
      return 'ok';
    }, sj.pi || sj, sj.play || null), 'iter', sj.iter);
  }
  const ok = await s.eval((pi, w) => {
    const p1 = players[0], sov = players[1];
    const net = Brain.loadNet(pi);
    if (!net || !sov) return 'no net or no Sovereign';
    if (w && WEAPONS[w]) { p1.weapon = WEAPONS[w]; p1.weaponKey = w; }   // the match setup can re-roll it
    p1.isAI = false; p1.controls = Brain.controlsFor(8);
    const L = { net, h: Brain.newState(net), obs: new Float32Array(Brain.OBS_DIM), act: [1, 0, 0, 0], prev: [1, 0, 0, 0], t: 0 };
    const orig = window.__step;
    window.__step = function (n) {
      for (let i = 0; i < n; i++) {
        if (window.__manual && p1.health > 0 && sov.health > 0 && L.t++ % Brain.REPEAT === 0) {
          Brain.observe(p1, sov, L.prev, L.obs);
          Brain.sample(Brain.forward(L.net, L.obs, L.h), L.act, false);
          Brain.applyKeys(p1, L.act);
          for (let k = 0; k < 4; k++) L.prev[k] = L.act[k];
        }
        orig(1);
      }
    };
    return 'ok sov live=' + !!(Brain.live && Brain.live.f === sov) + ' p1 ' + p1.weaponKey + '/' + p1.charClass + ' sov ' + sov.weaponKey + ' lives ' + p1.lives + '/' + sov.lives;
  }, j.pi || j, process.env.P1W || null);
  console.log('drive', ok);
  const out = path.join(__dirname, 'work', profName, 'clone-' + name);
  const { log } = await record(s, out, Number(framesArg || 7200), { fps: 60, probe, cropW: prof.cropW });
  const events = await s.eval(() => window.__events);
  const jj = JSON.parse(fs.readFileSync(out + '.json', 'utf8')); jj.marks = { ckpt, iter: j.iter, events }; fs.writeFileSync(out + '.json', JSON.stringify(jj));
  // Stock changes and finishers, for picking windows.
  let prev = null;
  log.forEach((e, i) => {
    if (!e) return;
    if (prev && (e.l1 !== prev.l1 || e.l2 !== prev.l2)) console.log('stock', i, (i / 60).toFixed(1) + 's', 'p1', e.l1, 'sov', e.l2);
    if (e.fin && (!prev || !prev.fin)) console.log('finisher', i, (i / 60).toFixed(1) + 's', e.fin);
    prev = e;
  });
  console.log('last', JSON.stringify(log[log.length - 1]));
  console.log('errors', s.errors.slice(0, 5).join(' | '));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
