'use strict';
// Sovereign Short, cut straight from a clip-recorder mp4 (no re-capture).
//   node sov-short.js [--sheet]     → out/short-7-sovereign-1080x1920.mp4 (+ contact sheet)
//
// Picture: a 9:16 window that follows both fighters (sov-track.js), cropped
// below the game's own top banners. Sovereign's overhead labels and dialogue
// bubbles (COUNTER/PRESSURE/TYRANT/LIMITER BREAK/ADAPTING) are smeared by a
// tracked blur patch. Captions come from the shared overlay page.
// Audio: the recording's own game SFX for each window + the boss music bed.
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const { track, SAMPLE } = require('./sov-track');
const { openOverlay, FPS, BASE, WORK } = require('./lib/engine');
const { ROOT } = require('./lib/recorder');

const SRC = path.join(ROOT, 'stickman-rec-20261017-234734.mp4');
const W = 1080, H = 1920;
const CY = 200, CH = 690, CW = Math.round(CH * W / H);   // source crop: under the banner band
const K = H / CH;                                          // source px → output px
const MW = 270, MH = 480;                                  // mask resolution (scaled up ×4)

// [source start s, source end s]. 5:06–5:10 (he walks off the right edge) is never used.
const SEGS = [
  [301.4, 305.0],   // Serpent's Bite on me
  [337.4, 343.0],   // Judgment Lash takes my 9th stock
  [348.2, 353.6],   // my Hero's Triumph takes his 9th
  [374.8, 378.2],   // last stock vs last stock
  [378.2, 383.8],   // final Judgment Lash
];
const END = 150;   // end card frames
// The game's own line subtitle sits low and centred, so the moving crop cuts it;
// it is blurred and re-set as a caption. [source start, end]
const SUBS = [[338.8, 341.5], [379.0, 382.0]];

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});
const tag = (from, to, text, y, extra) => Object.assign({ type: 'tag', from, to, text, x: 0.07, y, align: 'left', size: 60 }, extra || {});

function overlays(starts, total) {
  const s = i => starts[i];
  const at = (i, src) => s(i) + Math.round((src - SEGS[i][0]) * FPS);
  const segEnd = i => s(i) + Math.round((SEGS[i][1] - SEGS[i][0]) * FPS);
  const E = total - END;
  return [
    { type: 'vignette', a: 0.3 },
    slam(0, 150, ['I TRAINED AN AI', 'TO BEAT ME'], 0.16, 100, { bar: false }),
    tag(at(0, 302.9), at(0, 304.9), "SERPENT'S BITE", 0.27),
    tag(at(1, 338.9), at(1, 340.8), 'JUDGMENT LASH', 0.27),
    slam(at(1, 341.0), segEnd(1), 'MY LAST STOCK', 0.17, 104, { fill: '#7fe6ff' }),
    tag(at(2, 349.4), at(2, 351.8), "HERO'S TRIUMPH", 0.27),
    slam(at(2, 351.9), segEnd(2), 'HIS LAST STOCK', 0.17, 104, { fill: '#ff6a5a' }),
    slam(s(3) + 6, segEnd(3), ['LAST STOCK', 'VS LAST STOCK'], 0.16, 92, { bar: false }),
    tag(at(4, 378.9), at(4, 380.9), 'JUDGMENT LASH', 0.27),
    slam(at(4, 379.5), at(4, 381.1), ['"DOWN ON YOUR KNEES.', 'JUSTICE IS LOUD."'], 0.62, 62, { bar: false, band: false }),
    slam(at(4, 381.1), E, 'HE BEAT ME.', 0.17, 118, { sub: 'LAST STOCK VS LAST STOCK', fill: '#ff6a5a' }),
    { type: 'ingame', from: 0, to: E, x: 0.07, y: 0.72, align: 'left', size: 30 },
    { type: 'scrim', from: E, to: total, a: 0.84, fade: 8 },
    slam(E + 4, total, ['WATCH THE', 'FULL VERSION', 'ON MY CHANNEL'], 0.42, 104, { bar: false }),
    { type: 'fade', from: total - 12, to: total, out: true },
  ];
}

// Per output frame: crop x (source px) and the label patch (source rect) or null.
function plan(tr, n, t0) {
  const at = i => tr[Math.min(tr.length - 1, Math.max(0, i))];
  // Hold the last seen position through flash frames.
  let ls = null, lp = null;
  const fill = tr.map(r => { if (r.sov) ls = r.sov; if (r.ply) lp = r.ply; return { sov: r.sov || ls, ply: r.ply || lp, seen: !!r.sov }; });
  const target = fill.map(r => {
    if (!r.sov && !r.ply) return null;
    if (!r.ply) return r.sov.x;
    if (!r.sov) return r.ply.x;
    const d = r.ply.x - r.sov.x;
    return Math.abs(d) < CW * 0.8 ? r.sov.x + d / 2 : r.sov.x + Math.sign(d) * CW * 0.25;
  });
  let last = target.find(v => v !== null) || 855;
  const tg = target.map(v => (v === null ? last : (last = v)));
  const R = 15;   // ±0.5 s moving average
  const sm = tg.map((_, i) => { let a = 0, c = 0; for (let j = i - R; j <= i + R; j++) { a += tg[Math.min(tg.length - 1, Math.max(0, j))]; c++; } return a / c; });
  const out = [];
  for (let f = 0; f < n; f++) {
    const k = f / FPS * SAMPLE, i = Math.floor(k), u = k - i;
    const cx = sm[Math.min(sm.length - 1, i)] * (1 - u) + sm[Math.min(sm.length - 1, i + 1)] * u;
    const r = fill[Math.min(fill.length - 1, i)];
    let x0 = cx - CW / 2;
    if (r.sov) x0 = Math.min(Math.max(x0, r.sov.x + 90 - CW), r.sov.x - 90);   // keep him in frame
    x0 = Math.round(Math.min(Math.max(x0, 0), 1710 - CW));
    // Patch: median of ±3 samples so it doesn't jitter with the glow.
    const win = []; for (let j = i - 3; j <= i + 3; j++) { const q = fill[Math.min(fill.length - 1, Math.max(0, j))]; if (q.sov) win.push(q.sov); }
    let patch = null;
    if (win.length) {
      const med = a => a.sort((p, q) => p - q)[a.length >> 1];
      // Labels, bubbles and heal numbers stack 75-265 px above his body centre.
      const sx = med(win.map(p => p.x)), sy = med(win.map(p => p.y));
      patch = { x0: sx - 180, x1: sx + 180, y0: sy - 265, y1: sy - 72 };
    }
    const ts = t0 + f / FPS, patches = patch ? [patch] : [];
    if (SUBS.some(([a, b]) => ts >= a && ts < b)) patches.push({ x0: 0, x1: 1710, y0: 752, y1: 806 });
    out.push({ x0, patches });
  }
  return out;
}

function maskFrame(ps, x0) {
  const b = Buffer.alloc(MW * MH);
  for (const p of ps) maskRect(b, p, x0);
  return b;
}
function maskRect(b, p, x0) {
  const s = K * MW / W;   // source px → mask px
  const ax = (p.x0 - x0) * s, bx = (p.x1 - x0) * s, ay = (p.y0 - CY) * s, by = (p.y1 - CY) * s, fe = 8;
  for (let y = Math.max(0, Math.floor(ay - fe)); y < Math.min(MH, by + fe); y++) {
    const vy = Math.min(1, (y - ay + fe) / fe, (by + fe - y) / fe);
    if (vy <= 0) continue;
    for (let x = Math.max(0, Math.floor(ax - fe)); x < Math.min(MW, bx + fe); x++) {
      const v = Math.min(vy, (x - ax + fe) / fe, (bx + fe - x) / fe);
      if (v > 0) b[y * MW + x] = Math.max(b[y * MW + x], Math.round(255 * Math.min(1, v)));
    }
  }
}

(async () => {
  const name = 'short-7-sovereign-1080x1920', tmp = path.join(WORK, 'edit', name);
  fs.mkdirSync(tmp, { recursive: true }); fs.mkdirSync(path.join(BASE, 'out'), { recursive: true });
  const lens = SEGS.map(([a, b]) => Math.round((b - a) * FPS));
  const starts = []; let T = 0; for (const l of lens) { starts.push(T); T += l; }
  const total = T + END;

  const plans = [];
  for (const [a, b] of SEGS) { const tr = await track(SRC, a, b + 0.5); plans.push(plan(tr, Math.round((b - a) * FPS), a)); }

  // ── mask video (gray, small) ──
  const maskFile = path.join(tmp, 'mask.mkv');
  await new Promise((res, rej) => {
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', `${MW}x${MH}`, '-r', String(FPS), '-i', '-', '-c:v', 'ffv1', maskFile]);
    ff.on('close', c => c ? rej(new Error('mask ' + c)) : res());
    for (const pl of plans) for (const fr of pl) ff.stdin.write(maskFrame(fr.patches, fr.x0));
    for (let i = 0; i < END; i++) ff.stdin.write(Buffer.alloc(MW * MH));
    ff.stdin.end();
  });

  // ── picture ──
  const args = ['-loglevel', 'error', '-y'], filters = [];
  SEGS.forEach(([a, b], i) => {
    const cmd = path.join(tmp, `crop${i}.cmd`);
    fs.writeFileSync(cmd, plans[i].map((fr, f) => `${(f / FPS).toFixed(4)} crop@c${i} x ${fr.x0};`).join('\n') + '\n');
    args.push('-ss', a.toFixed(3), '-t', (b - a + 0.3).toFixed(3), '-i', SRC);
    filters.push(`[${i}:v]setpts=PTS-STARTPTS,fps=${FPS},sendcmd=f='${cmd}',crop@c${i}=${CW}:${CH}:${plans[i][0].x0}:${CY},` +
      `scale=${W}:${H}:flags=lanczos,setsar=1,trim=end_frame=${lens[i]},setpts=PTS-STARTPTS[v${i}]`);
  });
  const n = SEGS.length;
  args.push('-f', 'lavfi', '-t', ((END + 2) / FPS).toFixed(4), '-i', `color=c=0x04020a:s=${W}x${H}:r=${FPS}`);
  filters.push(`[${n}:v]trim=end_frame=${END},setpts=PTS-STARTPTS[vend]`);
  args.push('-i', maskFile);
  args.push('-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-');
  filters.push(SEGS.map((_, i) => `[v${i}]`).join('') + `[vend]concat=n=${n + 1}:v=1:a=0,format=yuv420p[base]`);
  filters.push(`[base]split[ba][bb];[bb]boxblur=26:3[bl];[${n + 1}:v]scale=${W}:${H}:flags=bicubic,format=gray[m];[bl][m]alphamerge[blm];[ba][blm]overlay=format=auto[clean]`);
  filters.push(`[clean][${n + 2}:v]overlay=format=auto:shortest=0,trim=end_frame=${total},format=yuv420p[out]`);
  const silent = path.join(tmp, 'picture.mp4');
  args.push('-filter_complex', filters.join(';'), '-map', '[out]', '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-g', '30',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', silent);
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg picture ' + c)) : res()));
  ff.stdin.on('error', () => {});
  const ov = await openOverlay(W, H);
  const items = overlays(starts, total);
  for (let f = 0; f < total; f++) {
    const live = items.filter(it => it.type === 'vignette' || (f >= it.from && f < it.to));
    const url = await ov.page.evaluate((f, items) => window.__draw(f, items), f, live);
    if (!ff.stdin.write(Buffer.from(url.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await ov.close(); await done;

  // ── audio: game SFX per window (short crossfades) + boss music bed ──
  const dur = total / FPS, out = path.join(BASE, 'out', name + '.mp4');
  const a = ['-loglevel', 'error', '-y', '-i', silent];
  let af = '';
  SEGS.forEach(([s0, s1], i) => {
    a.push('-ss', s0.toFixed(3), '-t', (s1 - s0).toFixed(3), '-i', SRC);
    af += `[${i + 1}:a]aresample=48000,atrim=end=${(lens[i] / FPS).toFixed(4)},afade=t=in:d=0.02,afade=t=out:st=${(lens[i] / FPS - 0.04).toFixed(4)}:d=0.04[g${i}];`;
  });
  af += SEGS.map((_, i) => `[g${i}]`).join('') + `concat=n=${n}:v=0:a=1,apad=whole_dur=${dur.toFixed(4)}[sfx];`;
  a.push('-stream_loop', '-1', '-i', path.join(ROOT, 'audio/music/boss-threshold.mp3'));
  af += `[${n + 1}:a]aresample=48000,atrim=end=${dur.toFixed(4)},afade=t=out:st=${(dur - 2).toFixed(4)}:d=2,volume=0.55[mus];`;
  af += `[sfx]asplit[sa][sk];[mus][sk]sidechaincompress=threshold=0.06:ratio=3:attack=5:release=180[md];[sa][md]amix=inputs=2:normalize=0,` +
    `loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000,atrim=end=${dur.toFixed(4)}[aout]`;
  a.push('-filter_complex', af, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-t', dur.toFixed(4), '-movflags', '+faststart', out);
  execFileSync('ffmpeg', a, { stdio: ['ignore', 'inherit', 'inherit'] });
  console.log('wrote', out, total, 'frames', dur.toFixed(2) + 's');

  if (process.argv.includes('--sheet')) {
    const sheet = path.join(tmp, 'sheet.png');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', out, '-vf', 'fps=1.25,scale=216:-1,tile=8x4', '-frames:v', '1', sheet]);
    console.log('sheet', sheet);
  }
})().catch(e => { console.error(e); process.exit(1); });
