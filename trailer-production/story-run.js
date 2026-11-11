'use strict';
// "Can my AI beat my game?" footage: the boss brain plays a real story chapter on a real difficulty, with
// tools/level-tester.js's own page harness (read from its source, so a take plays by the same rules as the evals):
// the net fights, a scripted walker moves it when nothing is alive, skill nodes are granted as --progress=auto.
//
//   node story-run.js <registry id> <take> [frames=5400] [draft|vert] [difficulty=evolution]  → work/<profile>/story-<id>-<take>.mov
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  draft: { width: 1707, height: 960, cropW: 540, port: 8251 },
  vert: { width: 3414, height: 1920, cropW: 1080, port: 8253 },
};
const ROOT = path.resolve(__dirname, '..');
const tester = fs.readFileSync(path.join(ROOT, 'tools', 'level-tester.js'), 'utf8');
const cut = (a, b) => { const i = tester.indexOf(a), j = tester.indexOf(b, i); if (i < 0 || j < 0) throw new Error('tester changed: ' + a); return tester.slice(i, j); };
const harnessSrc = cut('(id, diff, stallS, pilot, ckpt, skills) => {', '}, ch.id, DIFFICULTY, STALL_S, PILOT, CKPT, progressTree(ch.id));') + '}';
const costSrc = cut('const SKILL_COST =', 'const EXP_DEFAULT');
const SKILL = new Function(costSrc + 'return { SKILL_COST, SKILL_ORDER };')();
const tree = id => { let exp = id * 72; const sk = {}; for (const k of SKILL.SKILL_ORDER) { if (SKILL.SKILL_COST[k] > exp) break; sk[k] = true; exp -= SKILL.SKILL_COST[k]; } return sk; };

const quiet = s => s.eval(() => {
  settings.autoPerf = false;
  if (typeof _performanceModeActive !== 'undefined' && _performanceModeActive) togglePerformanceMode(true);
  settings.particles = true; settings.dmgNumbers = false;
  window.drawExploreHUD = () => {}; if (typeof ComboDomain !== 'undefined') ComboDomain.drawHUD = () => {};
  window.drawTutorial = () => {}; window.drawObjectiveHUD = () => {}; window.drawStorySubtitle = () => {};
  window.drawEdgeIndicators = () => {}; window.drawHitEffectivenessHUD = () => {};
  window.drawMatchAnnouncer = () => {}; window._drawAnnouncer = () => {};
  window.drawAchievementPopups = () => {}; window.drawAbilityUnlockToast = () => {};
  DamageText.prototype.draw = () => {};
  window.drawEntityOverlays = () => {};
  const hud = document.getElementById('hud'); if (hud) hud.style.display = 'none';
  if (typeof DomainManager !== 'undefined') DomainManager.drawSpeechBubbles = () => {};
  Object.defineProperty(Fighter.prototype, 'superFlashTimer', { get: () => 0, set() {}, configurable: true });
  window._finTitle = () => {}; window._finSubtitle = () => {}; CinFX.nameCard = () => {}; window.queueAnnouncement = () => {};
});

const probe = () => {
  const T = window.__lt, h = players.find(p => p && !p.isBoss && Brain.live && Brain.live.f === p) || players[0];
  const foes = minions.concat(players).filter(e => e && e !== h && e.health > 0 && !areAlliedEntities(h, e));
  const near = foes.filter(e => Math.abs(e.cx() - h.cx()) < 220 && Math.abs(e.cy() - h.cy()) < 160).length;
  return { r: T.result, h: h ? Math.round(h.health) : 0, mh: h ? h.maxHealth : 0, l: h ? h.lives : 0, x: h ? Math.round(h.cx()) : 0, y: h ? Math.round(h.cy()) : 0,
    foes: foes.length, near, nav: !!T.navHold, cin: !!(activeCinematic || isCinematic), brain: !!(Brain.live && Brain.live.f), dealt: Math.round(T.dmgDealt), run: !!gameRunning, sub: (typeof storyFightSubtitle !== 'undefined' && storyFightSubtitle && storyFightSubtitle.text) || '' };
};

(async () => {
  const [idArg, take, framesArg, profName = 'draft', diff = 'evolution'] = process.argv.slice(2);
  const id = Number(idArg), prof = PROFILES[profName];
  if (!(id >= 0) || !take || !prof) throw new Error('usage: node story-run.js <id> <take> [frames] [draft|vert] [difficulty]');
  const s = await openSession({ width: prof.width, height: prof.height, port: Number(process.env.PORT) || prof.port });
  await hookAudio(s);
  await s.eval(() => window.__auto());
  await s.wait(1500);
  await s.eval(() => {
    if (typeof markTutorialSeen === 'function') markTutorialSeen();
    window.maybeStartFirstRun = function () {};
    if (typeof tutorialActive !== 'undefined') tutorialActive = false;
    if (typeof ladderActive !== 'undefined') ladderActive = false;
    _story2.prologueSeen = true; if (!Array.isArray(_story2.defeated)) _story2.defeated = [];
    activeCinematic = null;
    if (gameRunning && typeof backToHome === 'function') backToHome();
    ['prologueOverlay', 'storyPrologueOverlay', 'storyIntroOverlay', 'storyUnlockOverlay', 'storyDifficultyOverlay'].forEach(i => { const el = document.getElementById(i); if (el) el.remove(); });
  });
  await s.page.evaluate(fs.readFileSync(path.join(ROOT, 'tools', 'sov-qte-autopilot.js'), 'utf8'));
  // Stall detection is wall-clock and capture runs slower than real time, so it is off here.
  const launched = await s.page.evaluate(`(${harnessSrc})(${id}, ${JSON.stringify(diff)}, 1e9, 'brain', 'data/brain/latest.json', ${JSON.stringify(tree(id))})`);
  console.log('launch', launched, 'skills', Object.keys(tree(id)).length);
  // Real time only until the match is running, then frame-stepped: the brain can take many seconds to attach (worse with
  // parallel captures), and in real time the chapter played on unrecorded (Nov 8 story-8-v1 "WIN frame 0").
  for (let i = 0; i < 120; i++) { if (await s.eval(() => !!gameRunning)) break; await s.wait(250); }
  await s.manual();
  let pre = 0;
  for (let i = 0; i < 240; i++) { if (await s.eval(() => !!(Brain.live && Brain.live.f))) break; await s.wait(250); await s.step(1); pre++; }
  console.log('pre-roll frames', pre);
  await quiet(s);
  console.log('ready', JSON.stringify(await s.eval(probe)));
  const out = path.join(__dirname, 'work', profName, `story-${id}-${take}`);
  const { log } = await record(s, out, Number(framesArg || 5400), { fps: 60, probe, cropW: prof.cropW });
  let prev = null, res = null;
  log.forEach((e, i) => { if (!e) return; if (prev && e.l !== prev.l) console.log('stock', i, (i / 60).toFixed(1) + 's', 'lives', e.l); if (e.r && !res) { res = e.r; console.log('RESULT', e.r, 'frame', i, (i / 60).toFixed(1) + 's'); } prev = e; });
  console.log('last', JSON.stringify(log[log.length - 1]));
  console.log('errors', s.errors.slice(0, 5).join(' | '));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
