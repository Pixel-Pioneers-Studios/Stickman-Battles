'use strict';
// "How many fighters before my game breaks?" capture: frame-stepped, bots added on a per-tick schedule.
//   node stress.js [vert|draft] [arena]   -> work/<profile>/stress.mov + .json (log: fighter count per frame)
// Real frame rates come from stress-measure.js (work/stress-<arena>.json); stress-cut.js holds frames to match them.
const path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { record } = require('./lib/recorder');
const PROFILES = { draft: { width: 1707, height: 960, cropW: 540, port: 8194 }, vert: { width: 3414, height: 1920, cropW: 1080, port: 8195 } };
const PROFILE = process.argv[2] || 'vert', arena = process.argv[3] || 'grass', P = PROFILES[PROFILE];
// Schedule: [ticks, bots added per tick-step, every n ticks]
const PLAN = [[150, 1, 5], [120, 1, 1], [50, 3, 1], [16, 7, 1]];
(async () => {
  const s = await openSession({ width: P.width, height: P.height, port: P.port });
  await s.startMatch({ mode: '2p', arena, p1Bot: true, p2Bot: true, p1: 'sword', p2: 'axe' });
  await s.eval((plan) => {
    window.endGame = function () {};
    settings.autoPerf = false; settings.particles = true; settings.dmgNumbers = false;
    window.drawStorySubtitle = () => {}; window.drawTutorial = () => {}; window.drawObjectiveHUD = () => {};
    window.drawEdgeIndicators = () => {}; window.drawHitEffectivenessHUD = () => {};
    window.drawMatchAnnouncer = () => {}; window._drawAnnouncer = () => {};
    window.drawAchievementPopups = () => {}; window.drawAbilityUnlockToast = () => {};
    DamageText.prototype.draw = () => {}; window.drawEntityOverlays = () => {};
    CanvasRenderingContext2D.prototype.fillText = function () {}; CanvasRenderingContext2D.prototype.strokeText = function () {};
    Object.defineProperty(Fighter.prototype, 'superFlashTimer', { get: () => 0, set() {}, configurable: true });
    for (const p of players) { delete p.superFlashTimer; p.lives = 999; }
    const hud = document.getElementById('hud'); if (hud) hud.style.display = 'none';
    window.queueAnnouncement = () => {}; if (typeof DomainManager !== 'undefined') { DomainManager.drawHUD = () => {}; DomainManager.drawSpeechBubbles = () => {}; } if (typeof CinFX !== 'undefined') CinFX.nameCard = () => {};
    const fl = currentArena.platforms.filter(pl => pl.isFloor && !pl.isFloorDisabled).sort((a, b) => b.w - a.w)[0];
    window.__focus = () => GAME_W / 2;
    const _uc = window.updateCamera;
    window.updateCamera = function () { _uc.apply(this, arguments); camZoomTarget = camZoomCur = window.__Z; camXCur = GAME_W / 2; camYCur = window.__CY; };
    window.__Z = 1.55; window.__CY = fl.y - 15;
    const W = Object.keys(WEAPONS).filter(w => !WEAPONS[w].locked && !WEAPONS[w].secret);
    const cols = ['#cc3322','#2244cc','#22aa44','#cc8800','#8833cc','#00aacc'];
    const add = () => {
      const n = players.length + 1;
      const x = Math.max(fl.x + 20, Math.min(fl.x + fl.w - 40, GAME_W / 2 + (Math.random() - .5) * Math.min(fl.w, 520)));
      const bot = new Fighter(x, fl.y - 80, cols[(n - 1) % 6], W[n % W.length],
        { left:null, right:null, jump:null, attack:null, ability:null, super:null }, true, 'hard');
      bot.y = fl.y - bot.h - 1; bot.vy = 0; bot.playerNum = n; bot.name = 'BOT' + n; bot.lives = 999;
      bot.target = players[(Math.random() * players.length) | 0];
      players.push(bot);
    };
    // Expand the plan into bots-to-add per recorded tick.
    const sched = []; for (const [ticks, k, every] of plan) for (let i = 0; i < ticks; i++) sched.push(i % every === 0 ? k : 0);
    sched[0] = 6; window.__sched = sched; window.__tick = 0;
    const loop = window.gameLoop;
    window.__stressStep = () => { const k = window.__sched[window.__tick++] || 0; for (let i = 0; i < k; i++) add(); };
  }, PLAN);
  // Add the scheduled bots before each recorded frame (probe runs after the step, so log the count it saw).
  const origStep = s.step ? s.step.bind(s) : null;
  const sess = Object.assign({}, s, {
    step: async (n) => { await s.eval(() => window.__stressStep()); await s.h.step(n); },
    manual: () => s.manual(), eval: s.eval,
  });
  const total = PLAN.reduce((a, p) => a + p[0], 0);
  const t0 = Date.now();
  const { log } = await record(sess, path.join(__dirname, 'work', PROFILE, 'stress'), total, {
    cropW: P.cropW, probe: () => ({ n: players.length, alive: players.filter(p => p.health > 0).length, cin: !!activeCinematic, fin: typeof activeFinisher !== 'undefined' && !!activeFinisher, dom: typeof DomainManager !== 'undefined' && DomainManager.isActive ? !!DomainManager.isActive() : null, cx: camXCur, z: camZoomCur }),
  });
  console.log('frames', log.length, 'last', JSON.stringify(log[log.length - 1]), 'secs', ((Date.now() - t0) / 1000).toFixed(0));
  console.log('errors', s.errors.slice(0, 5));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
