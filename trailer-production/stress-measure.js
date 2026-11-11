'use strict';
// Real-time stress measurement: how many AI fighters before the game stops being playable.
//   node stress-measure.js [arena] [step]
const path = require('path'), fs = require('fs');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const arena = process.argv[2] || 'grass', step = +process.argv[3] || 10;
(async () => {
  const s = await openSession({ width: 1600, height: 900, port: 8191 });
  let crashed = false; s.page.on('error', () => { crashed = true; console.log('PAGE CRASHED'); });
  await s.startMatch({ mode: '2p', arena, p1Bot: true, p2Bot: true, p1: 'sword', p2: 'axe' });
  await s.eval(() => {
    window.endGame = function () {};
    settings.autoPerf = false;
    for (const p of players) p.lives = 999;
    window.__addBots = (k) => {
      const W = Object.keys(WEAPONS).filter(w => !WEAPONS[w].locked && !WEAPONS[w].secret);
      const cols = ['#cc3322','#2244cc','#22aa44','#cc8800','#8833cc','#00aacc'];
      for (let i = 0; i < k; i++) {
        const sp = pickSafeSpawn(i % 2 ? 'right' : 'left') || { x: GAME_W / 2, y: 100 };
        const n = players.length + 1;
        const bot = new Fighter(sp.x + (Math.random() - .5) * 200, sp.y, cols[(n - 1) % 6], W[n % W.length],
          { left:null, right:null, jump:null, attack:null, ability:null, super:null }, true, 'hard');
        bot.playerNum = n; bot.name = 'BOT' + n; bot.lives = 999;
        bot.target = players[(Math.random() * players.length) | 0];
        players.push(bot);
      }
      return players.length;
    };
    window.__fps = (ms) => new Promise(r => { let n = 0; const t0 = performance.now();
      const tick = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(tick); else r(n * 1000 / (performance.now() - t0)); };
      requestAnimationFrame(tick); });
  });
  const rows = [];
  for (let k = 0; k < 400; k++) {
    if (crashed) break;
    let res;
    try {
      res = await Promise.race([
        s.eval(async (step) => { const n = window.__addBots(step); await new Promise(r => setTimeout(r, 1200));
          const fps = await window.__fps(2500);
          const alive = players.filter(p => p.health > 0).length;
          return { n, fps: +fps.toFixed(1), alive, gr: gameRunning, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null }; }, step),
        new Promise(r => setTimeout(() => r({ timeout: true }), 60000))]);
    } catch (e) { res = { error: String(e).slice(0, 120) }; }
    console.log(JSON.stringify(res)); rows.push(res);
    if (res.timeout || res.error || (res.fps !== undefined && res.fps < 2)) break;
  }
  fs.writeFileSync(path.join(__dirname, 'work', `stress-${arena}.json`), JSON.stringify(rows, null, 1));
  console.log('errors', s.errors.slice(0, 5));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
