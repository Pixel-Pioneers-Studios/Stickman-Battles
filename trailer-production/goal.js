'use strict';
// "Next goal wins" Short: Sports arena soccer (smb-sports.js), 4–4, first to 5. Varek parks in front of his goal.
// Frame 0: Kael's kick already flying; it bounces off Varek's body, three times. Kael's super on the rebound makes the burning
// ball, which bowls over anyone on the other team (_sportsBallVsPlayers) and goes in. 5–4. (A raised shield eats
// the bowl's knockback, so the keeper here doesn't shield.)
//
//   node goal.js [draft|vert]   → work/<profile>/goal.mov (+ .json log)
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  draft: { width: 1707, height: 960, cropW: 540, port: 8256 },
  vert: { width: 3414, height: 1920, cropW: 1080, port: 8258 },
};
const FRAMES = 230;

const quiet = s => s.eval(() => {
  window.endGame = function () {};
  settings.autoPerf = false;
  if (typeof _performanceModeActive !== 'undefined' && _performanceModeActive) togglePerformanceMode(true);
  settings.particles = true;
  window.drawEdgeIndicators = () => {}; window.drawHitEffectivenessHUD = () => {};
  window.drawMatchAnnouncer = () => {}; window._drawAnnouncer = () => {};
  window.drawAchievementPopups = () => {}; window.drawAbilityUnlockToast = () => {};
  window.drawSportsHUD = () => {};   // the score is a caption
  settings.dmgNumbers = false;
  DamageText.prototype.draw = () => {};
  window.drawEntityOverlays = () => {};
  Object.defineProperty(Fighter.prototype, 'superFlashTimer', { get: () => 0, set() {}, configurable: true });
  for (const p of players) if (p) delete p.superFlashTimer;
  const hud = document.getElementById('hud'); if (hud) hud.style.display = 'none';
  window.__texts = [];
});

function install() {
  const D = window.__dir = { f: 0, t: 0, phase: 'kick', log: {} };
  const [p1, p2] = players;
  p1.name = 'Kael'; p2.name = 'Varek'; p2.color = '#ff3a3a';
  settings.finishers = false;
  for (const p of [p1, p2]) { p.isAI = false; p._sportsBot = false; p.invincible = 0; p.vx = 0; p.vy = 0; }
  sportsScore = [4, 4]; sportsBanner = null; sportsPause = 0;
  const put = (f, x, face) => { f.x = x - f.w / 2; f.y = SPORTS_FLOOR_Y - f.h - 2; f.onGround = true; f.facing = face; };
  put(p1, 660, 1); put(p2, 808, -1);
  p1.superReady = true; p1._spPrevSuper = true;
  const b = sportsBalls[0];
  b.x = p1.cx() + 26; b.y = SPORTS_FLOOR_Y - b.r - 4; b.vx = 0; b.vy = 0; b.hidden = false; b.fx = null;
  D.ball = b;
  const uc = window.updateCamera;
  window.updateCamera = function () {
    if (!window.__manual) return uc.apply(this, arguments);
    camXCur = camXTarget = GAME_W / 2; camYCur = camYTarget = GAME_H / 2; camZoomCur = camZoomTarget = 1;
  };
  // The crop follows the play, never past the goal mouth.
  D.fx = 735;
  window.__focusScreen = () => Math.min(760, D.fx) / GAME_W * canvas.width;
}

function tick() {
  const D = window.__dir, [p1, p2] = players, b = D.ball;
  p1.invincible = 0; p2.invincible = 0;
  if (b.bowled && b.bowled.has(p2) && !D.log.bowled) D.log.bowled = D.f;
  // Varek stands on the line until the ball bowls him over.
  if (!D.log.bowled) { p2.vx = 0; p2.facing = -1; p2.cooldown = Math.max(p2.cooldown || 0, 2); }
  p1.cooldown = Math.max(p1.cooldown || 0, 2);
  if (D.f === 1) { p1.cooldown = 0; p1.attackEndlag = 0; p1.attack(p2); _sportsStrike(b, p1); D.log.kicks = [D.f]; D.log.saves = []; }
  // Three kicks off his body, then the super on the fourth touch. Kael steps to meet each rebound.
  if (D.f > 1 && !D.log.sup && D.f - D.log.kicks[D.log.kicks.length - 1] > 14) {
    if (b.vx < 0.5 && b.x < p1.cx() + (D.log.kicks.length < 3 ? 60 : 45) && b.x > p1.cx() - 40 && Math.abs(b.y - p1.cy()) < 120) {
      p1.cooldown = 0; p1.attackEndlag = 0; p1.attack(p2);
      if (D.log.kicks.length < 3) { _sportsStrike(b, p1); b.hitCd.set(p1, 14); D.log.kicks.push(D.f); }
      else {
        // The swing is the look of the super; its own ball strike would put the fire out.
        b.hitCd.set(p1, 40);
        p1.superReady = false; D.log.sup = D.f;
      }
    } else if (p1.onGround) {
      // He holds his spot short of Varek and lets the rebound come to him.
      p1.vx = b.x < p1.cx() ? -2 : p1.cx() < 668 ? 2 : 0; p1.facing = 1;
    }
  }
  // A save: the ball turning back off Varek.
  if (!D.log.sup && D.prevVx > 0 && b.vx < 0 && b.x > 740) D.log.saves.push(D.f);
  D.prevVx = b.vx;
  if (D.log.sup) p1.vx = 0;
  if (sportsScore[0] === 5 && !D.log.goal) { D.log.goal = D.f; }
  D.fx = D.log.goal ? 760 : Math.max(700, Math.min(760, (p1.cx() + b.x) / 2 + 60));
  D.phase = !D.log.sup ? 'kick' : !D.log.goal ? 'super' : 'goal';
}

const probe = () => {
  const D = window.__dir || {};
  const [p1, p2] = players, b = D.ball || {};
  return { ph: D.phase, f: D.f, score: sportsScore.join('-'), bx: Math.round(b.x), by: Math.round(b.y), fire: b.fire,
    x1: Math.round(p1.cx()), x2: Math.round(p2.cx()), sh: !!p2.shielding, run: gameRunning };
};

(async () => {
  const profName = process.argv[2] || 'draft', prof = PROFILES[profName];
  if (!prof) throw new Error('usage: node goal.js [draft|vert]');
  const s = await openSession({ width: prof.width, height: prof.height, port: prof.port });
  await hookAudio(s);
  await s.startMatch({ mode: 'minigames', minigame: 'sports', before: "selectSport('soccer')", p1: 'axe', p2: 'sword',
    p1Color: '#00d4ff', p2Color: '#ff3a3a', p2Bot: true, settleMs: 5000 });
  await quiet(s);
  console.log('setup', await s.eval(() => ({ mode: gameMode, mg: minigameType, sport: sportsType, n: players.length, balls: sportsBalls.length })));
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
  const out = path.join(__dirname, 'work', profName, 'goal');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const { log } = await record(s, out, Number(process.env.FRAMES || FRAMES), { fps: 60, probe, cropW: prof.cropW });
  const marks = await s.eval(() => Object.assign({}, window.__dir.log));
  const j = JSON.parse(fs.readFileSync(out + '.json', 'utf8')); j.marks = marks; fs.writeFileSync(out + '.json', JSON.stringify(j));
  console.log('marks', JSON.stringify(marks));
  for (let i = 0; i < log.length; i += Number(process.env.EVERY || 10)) console.log(i, JSON.stringify(log[i]));
  console.log('errors', s.errors.slice(0, 5).join(' | '));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
