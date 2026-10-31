'use strict';
// The boss brain (Sovereign's live net) plays Player 1 up the Fight Ladder: every rung, as the menu
// starts it (no retry HP assist), with Sovereign's Null Blade. AI Day 6's numbers come from here.
//
//   node tools/brain/laddereval.js [--ckpt=data/brain/latest.json] [--n=6] [--rungs=0-9] [--port=8196] [--out=data/brain-ladder/run.json]
//
// Real game, headless, frame-stepped. A match ends when one side is out of stocks (endGame's
// wall-clock timer never fires while stepping) or after 4 minutes of game time (a timeout).
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const { openSession } = require(path.join(ROOT, 'tools', 'showcase', 'session.js'));
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const CKPT = arg('ckpt', 'data/brain/latest.json'), N = Number(arg('n', 6)), PORT = Number(arg('port', 8196));
const [R0, R1] = arg('rungs', '0-9').split('-').map(Number);
const OUT = path.resolve(ROOT, arg('out', 'data/brain-ladder/run.json'));
const CAP = 4 * 60 * 60;

(async () => {
  const j = JSON.parse(fs.readFileSync(path.resolve(ROOT, CKPT), 'utf8'));
  const s = await openSession({ width: 900, height: 520, port: PORT });
  await s.eval(() => { settings.autoPerf = false; settings.finishers = false; });
  const res = { ckpt: CKPT, iter: j.iter, rungs: [] };
  for (let r = R0; r <= (isNaN(R1) ? R0 : R1); r++) {
    const R = { rung: r, wins: 0, losses: 0, timeouts: 0, matches: [] };
    for (let i = 0; i < N; i++) {
      await s.eval(() => window.__auto());
      await s.eval(r => { try { if (gameRunning && typeof backToMenu === 'function') backToMenu(); } catch (e) {} try { skipTutorial(); } catch (e) {}
        startLadderRung(r, { def: LADDER_RUNGS[r] }); }, r);
      await s.wait(3500);
      const ok = await s.eval(pi => {
        const p1 = players[0], p2 = players[1];
        if (!p1 || !p2) return 'no players';
        p1.weapon = WEAPONS.nullblade; p1.weaponKey = 'nullblade';
        if (!Brain.possess(p1, pi, p2)) return 'possess failed';
        Brain.live.greedy = false;
        window.endGame = function () {};
        return 'ok ' + p2.weaponKey + '/' + p2.charClass + ' ' + p2.aiDifficulty + ' lives ' + p1.lives + '/' + p2.lives + ' ' + currentArena.name;
      }, j.pi || j);
      if (!ok.startsWith('ok')) { console.log('rung', r, 'match', i, ok); continue; }
      await s.manual();
      let st;
      for (let f = 0; f < CAP; f += 10) {
        st = await s.eval(() => { window.__step(10); const a = players[0], b = players[1];
          const out = q => !q || (q.lives <= 0) || (q.lives <= 1 && q.health <= 0);
          return { f: frameCount || 0, l1: a.lives, l2: b.lives, h1: Math.round(a.health), h2: Math.round(b.health), o1: out(a), o2: out(b) }; });
        if (st.o1 || st.o2) break;
      }
      const m = { o1: st.o1, o2: st.o2, l1: st.l1, l2: st.l2 };
      if (st.o2 && !st.o1) R.wins++; else if (st.o1 && !st.o2) R.losses++; else R.timeouts++;
      R.matches.push(m);
      console.log('rung', r + 1, LADDER_LABEL(r), 'match', i + 1, st.o2 && !st.o1 ? 'WIN' : st.o1 && !st.o2 ? 'LOSS' : 'timeout', JSON.stringify(st), ok);
      await s.eval(() => { try { Brain.release && Brain.release(); } catch (e) {} });
    }
    res.rungs.push(R);
    console.log('RUNG', r + 1, 'wins', R.wins, 'losses', R.losses, 'timeouts', R.timeouts);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  }
  console.log('errors', s.errors.slice(0, 5).join(' | '));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
function LADDER_LABEL(r) { return ['Sparring Partner', 'Street Brawler', 'Spearhand', 'Shadow Blade', 'Axe Raider', 'Hammerfall', 'Wandering Ronin', 'The Reaper', 'Berserker', 'Champion'][r]; }
