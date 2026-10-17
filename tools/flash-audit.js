'use strict';
// Which code whites out the screen, and how often.
//
//   node tools/flash-audit.js [mode=2p|boss|story] [frames=3600] [arena] [p1Weapon] [p2Weapon]
//
// Runs a real match (Player 1 on Sovereign's brain, as F7 does) with the loop
// stepped by hand, and logs every near-full-canvas fillRect whose colour is
// light and whose effective alpha is at least 0.12, keyed by the call site.
// Reports, per site: flash events (runs of consecutive frames), frames on
// screen and peak alpha; and the total per minute of play.
const path = require('path');
const { openSession } = require(path.join(__dirname, 'showcase', 'session.js'));

(async () => {
  const mode = process.argv[2] || '2p', frames = +(process.argv[3] || 3600);
  const arena = process.argv[4] || 'colosseum', p1 = process.argv[5] || 'katana', p2 = process.argv[6] || 'hammer';
  const s = await openSession({ width: 960, height: 540, port: 8177 });
  if (mode === 'story') await s.startStory(1, 5000);
  else await s.startMatch({ mode, arena, p1, p2, p1Bot: false, p2Bot: true, p2Diff: 'expert', settleMs: 3500 });
  await s.sovereignP1();
  // LOOSE=1 also counts dimmer and greyer veils (alpha from 0.06, mid-grey up).
  await s.eval(l => { window.__loose = l; }, !!process.env.LOOSE);
  await s.eval(() => {
    for (const p of players) p.lives = 99;
    window.__fl = {}; window.__flFrame = 0;
    const lum = style => {
      if (typeof style !== 'string') return null;
      let m = style.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
      if (m) return { l: (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) / 255, a: m[4] === undefined ? 1 : +m[4] };
      m = style.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
      if (m) { const n = parseInt(m[1], 16); return { l: (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255, a: m[2] ? parseInt(m[2], 16) / 255 : 1 }; }
      m = style.match(/^#([0-9a-f]{3})$/i);
      if (m) { const h = m[1]; return { l: (0.299 * parseInt(h[0], 16) + 0.587 * parseInt(h[1], 16) + 0.114 * parseInt(h[2], 16)) / 15, a: 1 }; }
      return null;
    };
    const orig = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
      try {
        if (this.canvas === canvas) {
          const t = this.getTransform();
          const pw = Math.abs(w * t.a), ph = Math.abs(h * t.d);
          if (pw >= canvas.width * 0.85 && ph >= canvas.height * 0.85) {
            const c = lum(this.fillStyle);
            if (c && c.l > (window.__loose ? 0.45 : 0.72)) {
              const a = c.a * this.globalAlpha;
              if (a >= (window.__loose ? 0.06 : 0.12)) {
                const st = new Error().stack.split('\n').slice(2, 5).map(l => (l.match(/js\/[\w\-/.]+\.js[^:]*:\d+/) || [''])[0].replace(/\?v=[\d.]+/, '')).filter(Boolean);
                const key = st[0] + (st[1] ? '  <-  ' + st[1] : '');
                const e = window.__fl[key] || (window.__fl[key] = { ev: 0, fr: 0, peak: 0, last: -9 });
                if (e.last !== window.__flFrame) { e.fr++; if (window.__flFrame - e.last > 1) e.ev++; e.last = window.__flFrame; }
                e.peak = Math.max(e.peak, a);
              }
            }
          }
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
  });
  await s.manual();
  for (let i = 0; i < frames; i += 30) {
    await s.eval(n => { for (let k = 0; k < n; k++) { window.__flFrame++; window.__step(1); } }, 30);
  }
  const out = await s.eval(() => window.__fl);
  const rows = Object.entries(out).sort((a, b) => b[1].fr - a[1].fr);
  let ev = 0, fr = 0;
  for (const [k, v] of rows) { ev += v.ev; fr += v.fr; console.log(String(v.ev).padStart(4), 'flashes', String(v.fr).padStart(5), 'frames  peak', v.peak.toFixed(2), ' ', k); }
  console.log(`TOTAL ${ev} flashes, ${fr} flash-frames in ${frames} frames = ${(ev / (frames / 3600)).toFixed(0)} per minute, ${(100 * fr / frames).toFixed(1)}% of frames`,
    s.errors.length ? '\nerrors: ' + s.errors.slice(0, 3).join(' | ') : '');
  await s.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
