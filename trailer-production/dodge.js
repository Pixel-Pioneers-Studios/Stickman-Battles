'use strict';
// "Shield to catch" Short: Sports arena dodgeball (smb-sports.js), first to 7, Kael down 5–6: one more hit and he
// loses. Frame 0: Varek's first throw already coming; Kael jumps it. The second he catches on his shield (a catch
// scores for the catcher, 6–6), and he throws it straight back for the win (7–6).
//
//   node dodge.js [draft|vert]   → work/<profile>/dodge.mov (+ .json log)
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  draft: { width: 1707, height: 960, cropW: 540, port: 8286 },
  vert: { width: 3414, height: 1920, cropW: 1080, port: 8288 },
};
const FRAMES = 200;

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
  const D = window.__dir = { f: 0, t: 0, phase: 'throw', log: { score: [] } };
  const [p1, p2] = players;
  p1.name = 'Kael'; p2.name = 'Varek'; p2.color = '#ff3a3a';
  settings.finishers = false;
  for (const p of [p1, p2]) { p.isAI = false; p._sportsBot = false; p.invincible = 0; p.vx = 0; p.vy = 0; }
  sportsScore = [5, 6]; sportsBanner = null; sportsPause = 0;
  const put = (f, x, face) => { f.x = x - f.w / 2; f.y = SPORTS_FLOOR_Y - f.h - 2; f.onGround = true; f.facing = face; };
  put(p1, 352, 1); put(p2, 560, -1);
  const [b1, b2] = sportsBalls;
  b1.x = p2.cx() - 26; b1.y = p2.cy(); b1.vx = 0; b1.vy = 0; b1.hidden = false;
  // The second ball waits at his feet for the second throw.
  b2.x = p2.cx() + 20; b2.y = SPORTS_FLOOR_Y - b2.r - 2; b2.vx = 0; b2.vy = 0;
  D.b1 = b1; D.ball = b2;
  const uc = window.updateCamera;
  window.updateCamera = function () {
    if (!window.__manual) return uc.apply(this, arguments);
    camXCur = camXTarget = GAME_W / 2; camYCur = camYTarget = GAME_H / 2; camZoomCur = camZoomTarget = 1;
  };
  window.__focusScreen = () => 456 / GAME_W * canvas.width;
}

function tick() {
  const D = window.__dir, [p1, p2] = players, b = D.ball;
  p1.invincible = 0; p2.invincible = 0;
  p2.vx = 0; p2.facing = -1; p2.cooldown = Math.max(p2.cooldown || 0, 2);
  if (D.f === 1) { p2.cooldown = 0; p2.attackEndlag = 0; p2.attack(p1); _sportsStrike(D.b1, p2); D.b1.hitCd.set(p2, 30); D.log.throw1 = D.f; }
  if (D.f === 2) { p1.vy = -14; D.log.jump = D.f; }
  if (D.f === 48) { b.x = p2.cx() - 26; b.y = p2.cy(); b.vx = 0; b.vy = 0; p2.cooldown = 0; p2.attackEndlag = 0; p2.attack(p1); _sportsStrike(b, p2); b.hitCd.set(p2, 30); D.log.throw2a = D.f; }
  // Shield up for the second, down once it's caught.
  if (!D.log.caught) { p1.vx = 0; p1.facing = 1; if (D.f >= 44 && p1.onGround) { p1.shielding = true; p1._brShieldTimer = 999; } }
  if (!D.log.caught && b.heldBy === p1) { D.log.caught = D.f; p1.shielding = false; p1._brShieldTimer = 0; }
  // A beat holding it, then the throw back: the holder's own swing lets it fly (updateSports).
  if (D.log.caught && !D.log.throw2 && D.f - D.log.caught === 22) { p1.cooldown = 0; p1.attackEndlag = 0; p1.attack(p2); D.log.throw2 = D.f; }
  p1.cooldown = Math.max(p1.cooldown || 0, 2);
  sportsBanner = null;   // CATCH! / WINS: the crop slices them, so they are captions
  const sc = sportsScore.join('-');
  if (D.lastScore !== sc) { D.log.score.push([D.f, sc]); D.lastScore = sc; }
  D.phase = !D.log.caught ? 'throw' : !D.log.throw2 ? 'hold' : 'back';
}

const probe = () => {
  const D = window.__dir || {};
  const [p1, p2] = players, b = D.ball || {};
  return { ph: D.phase, f: D.f, score: sportsScore.join('-'), bx: Math.round(b.x), by: Math.round(b.y), live: b.live, held: b.heldBy ? b.heldBy.name : '',
    x1: Math.round(p1.cx()), x2: Math.round(p2.cx()), sh: !!p1.shielding, run: gameRunning };
};

(async () => {
  const profName = process.argv[2] || 'draft', prof = PROFILES[profName];
  if (!prof) throw new Error('usage: node dodge.js [draft|vert]');
  const s = await openSession({ width: prof.width, height: prof.height, port: prof.port });
  await hookAudio(s);
  await s.startMatch({ mode: 'minigames', minigame: 'sports', before: "selectSport('dodgeball')", p1: 'axe', p2: 'sword',
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
  const out = path.join(__dirname, 'work', profName, 'dodge');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const { log } = await record(s, out, Number(process.env.FRAMES || FRAMES), { fps: 60, probe, cropW: prof.cropW });
  const marks = await s.eval(() => Object.assign({}, window.__dir.log));
  const j = JSON.parse(fs.readFileSync(out + '.json', 'utf8')); j.marks = marks; fs.writeFileSync(out + '.json', JSON.stringify(j));
  console.log('marks', JSON.stringify(marks));
  for (let i = 0; i < log.length; i += Number(process.env.EVERY || 10)) console.log(i, JSON.stringify(log[i]));
  console.log('errors', s.errors.slice(0, 5).join(' | '));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
