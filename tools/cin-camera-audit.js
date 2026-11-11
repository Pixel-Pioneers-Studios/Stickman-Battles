'use strict';
// How much of the action each boss cinematic actually shows.
//
//   node tools/cin-camera-audit.js [port=8203] [name,name]
//
// Plays each cinematic in a real fight, with the hero on the floor and again on a high ledge, and reports the
// share of frames each fighter's whole body is inside the frame, plus frames showing no fighter at all.
const path = require('path');
const { openSession } = require(path.join(__dirname, 'showcase', 'session.js'));

const CREATOR = ['_makeBossWarning75Cinematic', '_makeBossRage40Cinematic', '_makeBossDesp10Cinematic', '_makeBossPhase2Cinematic', '_makeBossPhase3Cinematic'];
const AXIOM = ['_makeTFKicksParadoxOutCinematic', '_makeTFEntryCinematic', '_makeTFReality50Cinematic', '_makeTFDesp15Cinematic', '_makeTFPhase2Cinematic', '_makeTFPhase3Cinematic',
  '_makeTFParadoxEntryCinematic', '_makeTFFinalParadoxCinematic', '_makeTFKillsParadoxCinematic', '_makeTFIntroCinematic'];

(async () => {
  const s = await openSession({ width: 960, height: 540, port: +(process.argv[2] || 8203) });
  await s.page.setCacheEnabled(false);
  const open = async kind => {
    await s.eval(() => window.__auto());
    await s.eval(k => {
      try { if (gameRunning) backToMenu(); } catch (e) {}
      if (window.skipTutorial) window.skipTutorial();
      if (k === 'trueform') unlockedTrueBoss = false;
      startSimFight(k, null);
      startGame();
    }, kind);
    await s.wait(6000);
    await s.manual();
    await s.step(20);
  };
  const run = async (name, ledge) => {
    const ok = await s.eval((name, ledge) => {
      if (activeCinematic) endCinematic();
      const fn = window[name] || (typeof globalThis[name] === 'function' ? globalThis[name] : null);
      if (typeof fn !== 'function') return false;
      const b = players.find(p => p.isBoss), h = players.find(p => !p.isBoss);
      if (!b || !h) return false;
      b.health = b.maxHealth * 0.6; h.health = h.maxHealth; h.lives = 99; b.backstageHiding = false;
      const fl = currentArena.platforms.find(q => q.isFloor) || currentArena.platforms[0];
      const high = currentArena.platforms.filter(q => !q.isFloor && q.x + q.w < b.x).sort((m, n) => m.y - n.y)[0];
      h.x = ledge && high ? high.x + high.w / 2 - h.w / 2 : 200; h.y = (ledge && high ? high.y : fl.y) - h.h;
      b.x = 520; b.y = fl.y - b.h; b.vx = b.vy = h.vx = h.vy = 0; b.facing = -1; h.facing = 1;
      if (b.isTrueForm && typeof spawnParadox === 'function' && !paradoxEntity) spawnParadox(300, fl.y - 80);
      bossFloorState = 'normal';
      startCinematic(fn(b, h));
      return true;
    }, name, ledge);
    if (!ok) return null;
    const S = { n: 0, boss: 0, hero: 0, pdx: 0, pdxN: 0, none: 0, bossN: 0 };
    for (let i = 0; i < 900; i++) {
      await s.step(1);
      const r = await s.eval(() => {
        if (!activeCinematic) return null;
        const sc = Math.min(canvas.width / GAME_W, canvas.height / GAME_H) * camZoomCur;
        const X = x => x * sc + (canvas.width / 2 - camXCur * sc), Y = y => y * sc + (canvas.height / 2 - camYCur * sc);
        const inF = e => X(e.x) >= 0 && X(e.x + (e.w || 0)) <= canvas.width && Y(e.y) >= 0 && Y(e.y + (e.h || 0)) <= canvas.height;
        const b = players.find(p => p.isBoss), h = players.find(p => !p.isBoss);
        const hid = e => !e || e.backstageHiding || e.health <= 0;
        const pd = typeof paradoxEntity !== 'undefined' && paradoxEntity && !paradoxEntity.done && (paradoxEntity.alpha === undefined || paradoxEntity.alpha > 0.1) ? paradoxEntity : null;
        return { b: hid(b) ? -1 : +inF(b), h: hid(h) ? -1 : +inF(h), p: pd ? +inF(pd) : -1 };
      });
      if (!r) break;
      S.n++;
      if (r.b >= 0) { S.bossN++; S.boss += r.b; }
      S.hero += r.h > 0 ? 1 : 0;
      if (r.p >= 0) { S.pdxN++; S.pdx += r.p; }
      if (r.b < 1 && r.h < 1 && r.p < 1) S.none++;
    }
    return S;
  };
  const pct = (a, n) => (n ? String(Math.round(100 * a / n)).padStart(3) + '%' : '   -');
  const only = process.argv[3] ? process.argv[3].split(',') : null;
  for (const [kind, all] of [['boss', CREATOR], ['trueform', AXIOM]]) {
    const list = only ? all.filter(n => only.includes(n)) : all;
    if (!list.length) continue;
    await open(kind);
    for (const name of list) {
      for (const ledge of [false, true]) {
        const S = await run(name, ledge);
        if (!S) { console.log(name.padEnd(36), 'not available'); break; }
        console.log(name.padEnd(36), ledge ? 'ledge' : 'floor', 'frames', String(S.n).padStart(4), ' boss', pct(S.boss, S.bossN), ' hero', pct(S.hero, S.n), ' paradox', pct(S.pdx, S.pdxN), ' nobody', pct(S.none, S.n));
      }
    }
  }
  console.log('page errors', s.errors);
  await s.close();
})().catch(e => { console.error(e); process.exit(1); });
