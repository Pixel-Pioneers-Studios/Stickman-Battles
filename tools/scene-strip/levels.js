// node levels.js <out.jpg> <frame> <id,id,...>  -> one grid: each scene's look at that frame
const { launch } = require('/Users/aarushgupta/Developer/Personal/Stickman-Battles/tools/showcase/harness.js');
const fs = require('fs');
(async () => {
  const out = process.argv[2], fr = +process.argv[3], ids = process.argv[4].split(',').map(Number);
  const g = await launch({ width: 1280, height: 720, offline: true, port: 8300 + (ids[0] % 60) });
  await g.eval(() => { try { tutorialActive = false; backToMenu(); } catch (e) {} });
  await g.manual();
  await g.eval(() => { performance.now = () => window.__t; try { settings.storyVoice = false; } catch (e) {} });
  const TW = 480, TH = 270, COLS = 4, ROWS = Math.ceil(ids.length / COLS);
  for (let i = 0; i < ids.length; i++) {
    await g.eval((id) => {
      document.querySelectorAll('canvas').forEach(c => { if (c.style.zIndex === '9100') c.remove(); });
      const ch = STORY_CHAPTER_REGISTRY.find(c => c.id === id);
      showNarrativeScene(ch.narrative || ch.lines || ch.text, ch, () => {}, { cinematic: true, holdLastBeat: true });
    }, ids[i]);
    await g.step(fr);
    await g.eval((i, id, COLS, ROWS, TW, TH) => {
      const cs = [...document.querySelectorAll('canvas')].filter(c => c.style.zIndex === '9100'); const c = cs[cs.length - 1];
      if (!window.__sheet) { const s = document.createElement('canvas'); s.width = COLS * TW; s.height = ROWS * TH; window.__sheet = s; }
      const x = (i % COLS) * TW, y = Math.floor(i / COLS) * TH, k = window.__sheet.getContext('2d');
      if (c) k.drawImage(c, x, y, TW, TH);
      k.fillStyle = '#000'; k.fillRect(x, y, 60, 18); k.fillStyle = '#ff0'; k.font = '14px monospace'; k.fillText('#' + id, x + 3, y + 14);
    }, i, ids[i], COLS, ROWS, TW, TH);
  }
  const url = await g.eval(() => window.__sheet.toDataURL('image/jpeg', 0.85));
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('ok', JSON.stringify(g.errors.slice(0, 3)));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
