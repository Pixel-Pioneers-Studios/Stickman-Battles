// node power.js <outdir> <id> <frame> <p1,p2,...>  -> one scene frame at several `power:` overrides
const { launch } = require('../showcase/harness.js');
const fs = require('fs');
(async () => {
  const out = process.argv[2], id = +process.argv[3], frame = +process.argv[4], ps = process.argv[5].split(',').map(Number);
  const g = await launch({ width: 1280, height: 720, offline: true, port: 8260 });
  await g.eval(() => { try { tutorialActive = false; backToMenu(); } catch (e) {} });
  await g.manual();
  await g.eval(() => { performance.now = () => window.__t; });
  const TW = 640, TH = 360, COLS = Math.min(3, ps.length), ROWS = Math.ceil(ps.length / COLS);
  for (let i = 0; i < ps.length; i++) {
    await g.eval((id, p) => {
      const ch = STORY_CHAPTER_REGISTRY.find(c => c.id === id);
      STORY_SCENE_SPECS[id].power = p;
      showNarrativeScene(ch.narrative, ch, () => {}, { cinematic: true, holdLastBeat: true });
    }, id, ps[i]);
    await g.step(frame);
    await g.eval((i, p, COLS, ROWS, TW, TH) => {
      const cs = [...document.querySelectorAll('canvas')].filter(c => c.style.zIndex === '9100'); const c = cs[cs.length - 1];
      if (!window.__sheet) { const s = document.createElement('canvas'); s.width = COLS * TW; s.height = ROWS * TH; window.__sheet = s; }
      const x = (i % COLS) * TW, y = Math.floor(i / COLS) * TH, k = window.__sheet.getContext('2d');
      k.drawImage(c, x, y, TW, TH);
      k.fillStyle = '#000'; k.fillRect(x, y, 90, 18); k.fillStyle = '#ff0'; k.font = '14px monospace'; k.fillText('power ' + p, x + 3, y + 14);
    }, i, ps[i], COLS, ROWS, TW, TH);
  }
  const url = await g.eval(() => window.__sheet.toDataURL('image/jpeg', 0.92));
  fs.writeFileSync(`${out}/power${id}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('ok', JSON.stringify(g.errors.slice(0, 3)));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
