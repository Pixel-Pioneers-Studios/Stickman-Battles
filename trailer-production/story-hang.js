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
const tester = process.env.LT_REV ? require('child_process').execSync('git show ' + process.env.LT_REV + ':tools/level-tester.js', { cwd: ROOT, maxBuffer: 1 << 26 }).toString() : fs.readFileSync(path.join(ROOT, 'tools', 'level-tester.js'), 'utf8');
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
  // CAMZ=<zoom>: hold the gameplay camera at least this close, centred on the AI and its nearest foe. Picture only:
  // the brain reads game state, not pixels. In wide story levels the solver pulls back until fighters are tiny.
  if (process.env.CAMZ) await s.eval(z => {
    const u0 = window.updateCamera;
    window.updateCamera = function () {
      u0.apply(this, arguments);
      const h = Brain.live && Brain.live.f;
      if (!h || h.health <= 0 || activeCinematic || isCinematic) return;
      const foes = minions.concat(players).filter(e => e && e !== h && e.health > 0 && !areAlliedEntities(h, e));
      let n = null; for (const e of foes) if (!n || Math.abs(e.cx() - h.cx()) < Math.abs(n.cx() - h.cx())) n = e;
      const pair = n && Math.abs(n.cx() - h.cx()) < 260 && Math.abs(n.cy() - h.cy()) < 200;
      const tx = pair ? (h.cx() + n.cx()) / 2 : h.cx(), ty = (pair ? (h.cy() + n.cy()) / 2 : h.cy()) - 40;
      const S = window.__camS || (window.__camS = { x: tx, y: ty });
      S.x += (tx - S.x) * 0.12; S.y += (ty - S.y) * 0.08;
      camZoomCur = Math.max(camZoomCur, z); camXCur = S.x; camYCur = S.y;
    };
  }, Number(process.env.CAMZ));
  console.log('ready', JSON.stringify(await s.eval(probe)));

  const N = Number(framesArg || 5400);
  const cdp = await s.page.target().createCDPSession();
  const t0 = Date.now();
  for (let f = 0; f < N; f++) {
    const work = (async () => { await s.step(1); return s.page.evaluate(() => { const c = document.querySelector('canvas'); return c.toDataURL('image/jpeg', 0.9).length; }); })();
    const r = await Promise.race([work.then(() => 'ok'), new Promise(res => setTimeout(() => res('HANG'), 60000))]);
    if (r === 'HANG') {
      console.log('HANG at frame', f, 'after', ((Date.now() - t0) / 1000).toFixed(0), 's');
      await cdp.send('Debugger.enable');
      const paused = new Promise(res => cdp.once('Debugger.paused', res));
      await cdp.send('Debugger.pause');
      const ev = await Promise.race([paused, new Promise(res => setTimeout(() => res(null), 30000))]);
      if (!ev) { console.log('pause never landed (not a JS loop: GPU/compositor/IPC stall?)'); }
      else ev.callFrames.slice(0, 25).forEach(c => console.log('  at', c.functionName || '(anon)', c.url.split('/').pop(), (c.location.lineNumber + 1) + ':' + c.location.columnNumber));
      process.exit(2);
    }
    if (f % 300 === 0) console.log('frame', f, ((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(await s.eval(probe)));
  }
  console.log('NO HANG in', N, 'frames');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
