'use strict';
// AI Day 6 footage: the boss brain (Sovereign's live net) plays Player 1 on a Fight Ladder rung, with his
// Null Blade, through Brain.possess (the same live driver the game uses). Recorded like clone.js.
//
//   node ladder.js <rung 0-9> [frames=7200] [draft|vert] [ckpt=data/brain/latest.json]   → work/<profile>/ladder-<rung>.mov
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  draft: { width: 1707, height: 960, cropW: 540, port: 8246 },
  vert: { width: 3414, height: 1920, cropW: 1080, port: 8248 },
};

const quiet = s => s.eval(() => {
  window.endGame = function () {};
  settings.autoPerf = false;
  if (typeof _performanceModeActive !== 'undefined' && _performanceModeActive) togglePerformanceMode(true);
  settings.particles = true;
  window.drawTutorial = () => {}; window.drawObjectiveHUD = () => {}; window.drawStorySubtitle = () => {};
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
  const [rungArg, framesArg, profName = 'draft', ckpt = 'data/brain/latest.json'] = process.argv.slice(2);
  const rung = Number(rungArg), prof = PROFILES[profName];
  if (!(rung >= 0 && rung <= 9) || !prof) throw new Error('usage: node ladder.js <rung 0-9> [frames] [draft|vert] [ckpt]');
  const j = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', ckpt), 'utf8'));
  const s = await openSession({ width: prof.width, height: prof.height, port: prof.port });
  await hookAudio(s);
  await s.eval(() => window.__auto());
  await s.eval(r => { try { skipTutorial(); } catch (e) {} startLadderRung(r, { def: LADDER_RUNGS[r] }); }, rung);
  await s.wait(5000);
  await quiet(s);
  console.log('drive', await s.eval(pi => {
    const p1 = players[0], p2 = players[1];
    p1.weapon = WEAPONS.nullblade; p1.weaponKey = 'nullblade';
    if (!Brain.possess(p1, pi, p2)) return 'possess failed';
    // Once a match is decided the game is not meant to keep running (endGame is a no-op here), and stepping
    // on froze the page. Hold the last frame 90 frames after the deciding KO.
    const step = window.__step; let over = 0;
    window.__step = function (n) {
      for (let i = 0; i < n; i++) {
        const out = q => q.lives <= 0 || (q.lives <= 1 && q.health <= 0);
        if (out(p1) || out(p2)) over++;
        if (over > 90) continue;
        step(1);
      }
    };
    return 'ok ' + p2.weaponKey + '/' + p2.charClass + ' lives ' + p1.lives + '/' + p2.lives;
  }, j.pi || j));
  const out = path.join(__dirname, 'work', profName, 'ladder-' + rung);
  const { log } = await record(s, out, Number(framesArg || 7200), { fps: 60, probe, cropW: prof.cropW });
  const events = await s.eval(() => window.__events);
  const jj = JSON.parse(fs.readFileSync(out + '.json', 'utf8')); jj.marks = { ckpt, rung, iter: j.iter, events }; fs.writeFileSync(out + '.json', JSON.stringify(jj));
  let prev = null;
  log.forEach((e, i) => {
    if (!e) return;
    if (prev && (e.l1 !== prev.l1 || e.l2 !== prev.l2)) console.log('stock', i, (i / 60).toFixed(1) + 's', 'p1', e.l1, 'bot', e.l2);
    if (e.fin && (!prev || !prev.fin)) console.log('finisher', i, (i / 60).toFixed(1) + 's', e.fin);
    prev = e;
  });
  console.log('last', JSON.stringify(log[log.length - 1]));
  console.log('errors', s.errors.slice(0, 5).join(' | '));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
