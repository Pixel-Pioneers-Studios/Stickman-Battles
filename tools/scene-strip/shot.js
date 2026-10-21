// node shot.js <outdir> <id> <f1,f2,...>  -> one row of full-height crops at those frames
const { launch } = require('/Users/aarushgupta/Developer/Personal/Stickman-Battles/tools/showcase/harness.js');
const fs = require('fs');
(async () => {
  const out = process.argv[2], id = +process.argv[3], fr = process.argv[4].split(',').map(Number);
  const g = await launch({ width: 1280, height: 720, offline: true, port: 8200 + (id % 60) });
  await g.eval(() => { try { tutorialActive = false; backToMenu(); } catch (e) {} });
  await g.manual();
  await g.eval(() => { performance.now = () => window.__t; try { settings.storyVoice = false; } catch (e) {} });
  await g.eval((id) => {
    const ch = STORY_CHAPTER_REGISTRY.find(c => c.id === id);
    showNarrativeScene(ch.narrative || ch.lines || ch.text, ch, () => {}, { cinematic: true, holdLastBeat: true });
  }, id);
  const TW = 640, TH = 360, COLS = Math.min(3, fr.length), ROWS = Math.ceil(fr.length / COLS);
  let f = 0;
  for (let i = 0; i < fr.length; i++) {
    await g.step(fr[i] - f); f = fr[i];
    await g.eval((i, f, COLS, ROWS, TW, TH) => {
      const cs = [...document.querySelectorAll('canvas')].filter(c => c.style.zIndex === '9100'); const c = cs[cs.length - 1];
      if (!window.__sheet) { const s = document.createElement('canvas'); s.width = COLS * TW; s.height = ROWS * TH; window.__sheet = s; }
      const x = (i % COLS) * TW, y = Math.floor(i / COLS) * TH, k = window.__sheet.getContext('2d');
      if (c) k.drawImage(c, x, y, TW, TH);
      k.fillStyle = '#000'; k.fillRect(x, y, 64, 18); k.fillStyle = '#ff0'; k.font = '14px monospace'; k.fillText('f' + f, x + 3, y + 14);
    }, i, f, COLS, ROWS, TW, TH);
  }
  const url = await g.eval(() => window.__sheet.toDataURL('image/jpeg', 0.9));
  fs.writeFileSync(`${out}/shot${id}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('ok', JSON.stringify(g.errors.slice(0, 3)));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
