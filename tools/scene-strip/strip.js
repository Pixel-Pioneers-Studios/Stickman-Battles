// node strip.js <outdir> <id> [every=24] [maxFrames=2400] [after]
// 'after' plays the chapter's afterNarrative, staged at the narrative's beat-count offset like _playBranchAfterNarrative.
const { launch } = require('/Users/aarushgupta/Developer/Personal/Stickman-Battles/tools/showcase/harness.js');
const fs = require('fs');
(async () => {
  const out = process.argv[2], id = +process.argv[3], every = +(process.argv[4] || 24), maxF = +(process.argv[5] || 2400), after = process.argv[6] === 'after';
  const g = await launch({ width: 1280, height: 720, offline: true, port: 8100 + (id % 60) });
  await g.eval(() => { try { tutorialActive = false; backToMenu(); } catch (e) {} });
  await g.manual();
  await g.eval(() => { performance.now = () => window.__t; try { settings.storyVoice = false; } catch (e) {} });
  const ok = await g.eval((id, after) => {
    let ch = STORY_CHAPTER_REGISTRY.find(c => c.id === id);
    let lines = ch.narrative || ch.lines || ch.text;
    if (after) { const off = window._storyBeatCount(lines); lines = ch.afterNarrative; ch = Object.assign({}, ch, { noFight: true, _sceneBeatOffset: off }); }
    window.__done = false;
    showNarrativeScene(lines, ch, () => { window.__done = true; }, { cinematic: true, holdLastBeat: true });
    window.__sheet = null; window.__thumbs = [];
    return !!lines;
  }, id, after);
  const COLS = 5, ROWS = 4, TW = 384, TH = 216;
  let n = 0, sheetIdx = 0, f = 0, lastSig = '', same = 0;
  const flush = async () => {
    const url = await g.eval(() => window.__sheet ? window.__sheet.toDataURL('image/jpeg', 0.85) : null);
    if (url) fs.writeFileSync(`${out}/s${id}${after ? 'a' : ''}-${sheetIdx}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
    sheetIdx++; await g.eval(() => { window.__sheet = null; });
  };
  while (f <= maxF) {
    const sig = await g.eval((n, f, COLS, ROWS, TW, TH) => {
      const cs = [...document.querySelectorAll('canvas')].filter(c => c.style.zIndex === '9100');
      const c = cs[cs.length - 1]; if (!c) return 'gone';
      if (!window.__sheet) { const s = document.createElement('canvas'); s.width = COLS * TW; s.height = ROWS * TH; window.__sheet = s; }
      const x = (n % COLS) * TW, y = Math.floor(n / COLS) * TH, k = window.__sheet.getContext('2d');
      k.drawImage(c, x, y, TW, TH);
      k.fillStyle = '#000'; k.fillRect(x, y, 58, 16); k.fillStyle = '#ff0'; k.font = '12px monospace'; k.fillText('f' + f, x + 3, y + 12);
      const t = document.createElement('canvas'); t.width = 32; t.height = 18; t.getContext('2d').drawImage(c, 0, 0, 32, 18);
      return t.toDataURL().slice(-80);
    }, n, f, COLS, ROWS, TW, TH);
    if (sig === 'gone') break;
    same = sig === lastSig ? same + 1 : 0; lastSig = sig;
    n++;
    if (n === COLS * ROWS) { await flush(); n = 0; }
    
    await g.step(every); f += every;
  }
  if (n) await flush();
  console.log('id', id, 'frames', f, 'sheets', sheetIdx, 'errors', JSON.stringify(g.errors.slice(0, 5)));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
