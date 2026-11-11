'use strict';
// "How many fighters before my game breaks?" edit.
//   node stress-cut.js [profile]  (needs work/<profile>/stress.mov from stress.js)
// Each recorded game tick is held for 60/fps output frames, fps read off the real-time measurement
// (stress-measure.js, smoothed), so the picture slows exactly as the game did. Stops at 412 fighters,
// the last measured step (1 fps).
const fs = require('fs'), path = require('path'), { execFileSync, spawn } = require('child_process');
const { render } = require('./lib/engine');
const PROFILE = process.argv[2] || 'vert', W = path.join(__dirname, 'work', PROFILE);
// Smoothed from work/stress-grass.json (headless Chrome, this Mac): [fighters, fps]
const CURVE = [[0, 60], [32, 60], [42, 55], [62, 46], [112, 30], [172, 18], [252, 11], [302, 10], [352, 7], [392, 6], [402, 2.4], [412, 1]];
const fpsAt = n => { for (let i = 1; i < CURVE.length; i++) if (n <= CURVE[i][0]) { const [a, fa] = CURVE[i - 1], [b, fb] = CURVE[i]; return fa + (fb - fa) * (n - a) / (b - a); } return 1; };
const MAXN = 412, START = 12, FREEZE = 75;

(async () => {
  const J = JSON.parse(fs.readFileSync(path.join(W, 'stress.json'), 'utf8'));
  const tmp = path.join(W, 'stress-frames'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-i', path.join(W, 'stress.mov'), '-q:v', '2', path.join(tmp, '%05d.jpg')]);
  // Build the held sequence.
  const seq = [], ticks = []; let acc = 0;
  for (let i = START; i < J.log.length; i++) {
    const n = J.log[i].n; if (n > MAXN) break;
    const fps = fpsAt(n); acc += 60 / fps; const hold = Math.max(1, Math.round(acc)); acc -= hold;
    ticks.push({ t0: seq.length, n, fps });
    for (let k = 0; k < hold; k++) seq.push(i + 1);
  }
  const last = seq[seq.length - 1], freezeAt = seq.length;
  for (let k = 0; k < FREEZE; k++) seq.push(last);
  const out = path.join(W, 'stress-held');
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', '60', '-i', '-',
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '13', '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s16le', out + '.mov'], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((r, j) => ff.on('close', c => c ? j(new Error('ffmpeg ' + c)) : r()));
  for (const f of seq) { const b = fs.readFileSync(path.join(tmp, String(f).padStart(5, '0') + '.jpg')); if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once('drain', r)); }
  ff.stdin.end(); await done;
  fs.writeFileSync(out + '.json', JSON.stringify({ fps: 60, frames: seq.length, log: seq.map(() => null), sfx: [] }));
  const T = seq.length;
  console.log('ticks', ticks.length, 'frames', T, 'freezeAt', freezeAt, 'lastN', ticks[ticks.length - 1].n);

  const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size, bar: false }, extra || {});
  const col = f => f >= 45 ? '#7dff9a' : f >= 20 ? '#ffd040' : f >= 8 ? '#ff8a30' : '#ff3a2a';
  const o = [{ type: 'vignette', a: 0.3 }];
  const HOOK = 150;
  o.push(slam(-4, HOOK, ['HOW MANY FIGHTERS', 'BEFORE MY', 'GAME BREAKS?'], 0.09, 76));
  // Counters: one overlay per displayed value.
  for (let i = 0; i < ticks.length; i++) {
    const a = ticks[i], to = i + 1 < ticks.length ? ticks[i + 1].t0 : T;
    const fps = Math.max(1, Math.round(a.fps));
    o.push(slam(a.t0, to, a.n + ' FIGHTERS', 0.70, 104, { steady: true, fill: '#f3e6d4' }));
    o.push(slam(a.t0, to, fps + ' FPS', 0.765, 96, { steady: true, fill: col(a.fps) }));
  }
  const at = n => (ticks.find(t => t.n >= n) || ticks[ticks.length - 1]).t0;
  o.push(slam(at(100), at(250), 'STILL PLAYABLE?', 0.11, 96, { fill: '#ffd040' }));
  o.push(slam(at(250), freezeAt, 'NOW IT HURTS.', 0.11, 104, { fill: '#ff8a30' }));
  o.push(slam(freezeAt, T, ['1 FRAME', 'A SECOND.'], 0.11, 120, { fill: '#ff3a2a' }));
  o.push(slam(freezeAt + 35, T, 'IT NEVER CRASHED.', 0.255, 72, { fill: '#7ff3ff' }));
  const END = 96;
  o.push({ type: 'scrim', from: T, to: T + END, a: 0.84, fade: 8 },
    { type: 'logo', from: T, to: T + END, y: 0.36, size: 128, lines: ['STICKMAN', 'EVOLUTION'], cta: 'PLAY FREE IN YOUR BROWSER', ctaAt: 18 },
    { type: 'fade', from: T + END - 10, to: T + END, out: true });
  const r = await render({
    W: 1080, H: 1920, name: 'short-47-stress-1080x1920', profile: PROFILE,
    segs: [{ shot: 'stress-held', at: 0, len: T }, { len: END }], overlays: o,
    music: { file: 'audio/music/battle-royale.mp3', at: 0, from: 0, gain: 0.7, fadeIn: 0.1, fadeOut: 0.15, end: freezeAt / 60 + 0.1 }, stingers: [],
  });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
