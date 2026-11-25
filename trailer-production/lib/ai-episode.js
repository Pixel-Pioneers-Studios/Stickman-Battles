'use strict';
// "Can my AI beat my game?" episode builder, the Episode 1 layout (story-kael-cut.js) as a spec:
// real story-run.js footage with an AI HP counter read from the log, mini Kael (lib/mini-kael.js) on the top
// captions, his Kokoro voice (kael-voice.py) mixed over a ducked bed, and a stats end card.
//
// spec = {
//   name: 'short-43-ai-ep2',            output: out/<name>-1080x1920.mp4
//   shot: 'story-6-v1', wins: [{ at, to }, ...]   source frames, in order
//   zoom: { z, cx, cy },                optional, default Episode 1's
//   voice: 'audio/kael/ep2', vo: [f, ...]   line N (paced-line<N>.wav) starts at output frame vo[N-1];
//                                        a string 'C+16' means 16 frames after the end card starts
//   captions: [{ from, to, text, size, fill }]   top band (y 0.285), Kael's ledges; from/to may be 'C+n'
//   end: { len, lines: [{ at, text, y, size, fill }] }   end card over a dark scrim (at is relative to its start)
//   track: [...] mini Kael keys (t / go may be 'C+n')
//   hp: true                             show the AI HP counter (default true)
//   music: { file, from, gain }          default boss-threshold at 0.35
//   loop: true                           no end card (end may be omitted), no fade-out: the last frame cuts straight
//                                        back to the first, for loopable Shorts
// }
const path = require('path');
const { render, shotLog } = require('./engine');
const { mouthEnvelope } = require('./voice-env');
const { mixVoice } = require('./voice-mix');

const BASE = path.resolve(__dirname, '..'), ROOT = path.resolve(BASE, '..');
const SCRIPTS = ['js/smb-palette.js', 'js/smb-figure-rig.js', 'js/smb-figure-skin.js', 'js/smb-anim-core.js', 'js/smb-cin-figure.js']
  .map(f => path.join(ROOT, f)).concat([path.join(__dirname, 'mini-kael.js')]);

async function episode(spec) {
  const PROFILE = spec.profile || 'vert', L = shotLog(PROFILE, spec.shot).log;
  const Z = spec.zoom || { z: 1.12, cx: 0.5, cy: 0.9 };
  let T = 0; const segs = [], map = [];
  for (const w of spec.wins) { segs.push({ shot: w.shot || spec.shot, at: w.at, len: w.to - w.at, zoom: w.zoom || Z }); map.push({ t: T, ...w }); T += w.to - w.at; }
  const C = T, END = spec.end ? spec.end.len : 0, TOTAL = T + END;
  const tf = v => typeof v === 'string' ? C + Number(v.replace(/^C\+?/, '') || 0) : v;
  const vo = spec.vo.map(tf);
  const mouth = new Array(TOTAL).fill(0);
  vo.forEach((at, i) => mouthEnvelope(path.join(BASE, spec.voice, `paced-line${i + 1}.wav`)).forEach((v, k) => { if (at + k < TOTAL) mouth[at + k] = v; }));
  const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size, bar: false, band: false }, extra || {});
  const runs = key => { const out = []; for (const m of map) { const LL = m.shot ? shotLog(PROFILE, m.shot).log : L; for (let f = m.at; f < m.to; f++) { const v = LL[f][key], t = m.t + f - m.at, l = out[out.length - 1]; if (l && l.v === v) l.to = t + 1; else out.push({ v, from: t, to: t + 1 }); } } return out; };
  const track = spec.track.map(k => Object.assign({}, k, { t: tf(k.t) }, k.go !== undefined ? { go: tf(k.go) } : {}));
  const overlays = [{ type: 'vignette', a: 0.3 }];
  for (const c of spec.captions) overlays.push(slam(tf(c.from), tf(c.to), c.text, c.y || 0.285, c.size || 64, { fill: c.fill || '#ffffff' }));
  if (spec.hp !== false) for (const [k, r] of runs('h').entries()) overlays.push(slam(k ? r.from : -4, r.to, 'AI HP: ' + r.v, 0.8, 80, { steady: true, fill: r.v < (spec.hpLow || 50) ? '#ff5a5a' : '#ffffff' }));
  if (END) overlays.push({ type: 'scrim', from: C, to: TOTAL, a: 0.86, fade: 8 });
  if (END) for (const l of spec.end.lines) overlays.push(slam(C + l.at, TOTAL, l.text, l.y, l.size || 88, { fill: l.fill || '#ffffff' }));
  overlays.push({ type: 'kael', from: 0, to: TOTAL, S: spec.S || 3.8, track, mouth });
  if (!spec.loop) overlays.push({ type: 'fade', from: TOTAL - 12, to: TOTAL, out: true });
  const m = Object.assign({ file: 'audio/music/boss-threshold.mp3', at: 0, from: 45.0, gain: 0.35, fadeIn: 0.1, fadeOut: spec.loop ? 0.05 : 0.8 }, spec.music || {});
  const r = await render({ W: 1080, H: 1920, name: spec.name + '-1080x1920-bed', profile: PROFILE, segs: END ? segs.concat([{ len: END }]) : segs, overlays,
    pageScripts: SCRIPTS, music: m, stingers: [] });
  const out = path.join(BASE, 'out', spec.name + '-1080x1920.mp4');
  mixVoice(r.out, out, vo.map((at, i) => ({ file: path.join(BASE, spec.voice, `paced-line${i + 1}.wav`), at: at / 60 })));
  console.log(out, TOTAL, 'frames', (TOTAL / 60).toFixed(1) + 's');
  return { out, C, TOTAL };
}

// Phrase start frames inside a voice line (for timing poses to words).
function phrases(file) {
  const e = mouthEnvelope(file), st = []; let gap = 99;
  e.forEach((v, i) => { if (v > 0) { if (gap > 14) st.push(i); gap = 0; } else gap++; });
  return { len: e.length, starts: st };
}

module.exports = { episode, phrases };
