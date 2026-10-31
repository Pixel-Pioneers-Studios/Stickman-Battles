'use strict';
// Edit engine: turns a cut spec (see cuts.js) into a finished mp4.
//
//   video  = the spec's segments (frame-exact windows of the recorded shots),
//            concatenated, with the motion-graphics layer composited on top
//   audio  = the game's own sound effects for exactly those windows (rebuilt
//            from the per-frame sound log, so tails ring across cuts)
//            + extra stingers from the same SFX pack + the music bed,
//            loudness-normalised to -14 LUFS (YouTube's reference level)
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const { mixSfx, ROOT } = require('./recorder');
const { overlayPage } = require('./overlay-page');

const BASE = path.resolve(__dirname, '..');
const WORK = path.join(BASE, 'work');
const FPS = 60;

const _logs = {};
function shotLog(profile, shot) {
  const k = profile + '/' + shot;
  return _logs[k] || (_logs[k] = JSON.parse(fs.readFileSync(path.join(WORK, profile, shot + '.json'), 'utf8')));
}

async function openOverlay(W, H) {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const lo = { headless: 'new', pipe: true, protocolTimeout: 600000, args: ['--no-sandbox'] };
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chrome)) lo.executablePath = chrome;
  const browser = await puppeteer.launch(lo);
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });
  const b64 = f => fs.readFileSync(path.join(ROOT, 'fonts', f)).toString('base64');
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: 'Russo One'; src: url(data:font/woff2;base64,${b64('russoone-400.woff2')}) format('woff2'); }
    @font-face { font-family: 'Potta One'; src: url(data:font/woff2;base64,${b64('pottaone-400.woff2')}) format('woff2'); }
    @font-face { font-family: 'SE Logo Brush'; src: url(data:font/woff2;base64,${b64('selogobrush-400.woff2')}) format('woff2'); }
    @font-face { font-family: 'Rajdhani'; font-weight: 600; src: url(data:font/woff2;base64,${b64('rajdhani-600.woff2')}) format('woff2'); }
    @font-face { font-family: 'Rajdhani'; font-weight: 700; src: url(data:font/woff2;base64,${b64('rajdhani-700.woff2')}) format('woff2'); }
    html, body { margin: 0; background: transparent; }
  </style></head><body><canvas id="c" width="${W}" height="${H}"></canvas>
  <span style="font-family:'Russo One'">.</span><span style="font-family:'Potta One'">.</span><span style="font-family:'SE Logo Brush'">.</span><span style="font-family:Rajdhani;font-weight:600">.</span><span style="font-family:Rajdhani;font-weight:700">.</span>
  </body></html>`, { waitUntil: 'load' });
  await page.evaluate('(' + overlayPage.toString() + ')()');
  await page.evaluate(() => document.fonts.ready);
  return { page, close: () => browser.close() };
}

async function render(spec) {
  const { W, H, name } = spec;
  const outDir = path.join(BASE, 'out'), tmp = path.join(WORK, 'edit', name);
  fs.mkdirSync(outDir, { recursive: true }); fs.mkdirSync(tmp, { recursive: true });

  // ── timeline ──
  let T = 0;
  const segs = spec.segs.map(s => { const o = Object.assign({ speed: 1 }, s, { t0: T }); T += s.len; return o; });
  const total = T;

  // ── sound effects for the chosen windows ──
  const events = [];
  for (const s of segs) {
    if (!s.shot || s.mute) continue;
    const lg = shotLog(s.profile || spec.profile, s.shot);
    const srcLen = s.len * s.speed;
    for (const e of lg.sfx) {
      if (e.f < s.at || e.f >= s.at + srcLen) continue;
      events.push({ f: s.t0 + (e.f - s.at) / s.speed, k: e.k, r: e.r * (s.speed < 1 ? 0.8 : 1), g: e.g * (s.sg === undefined ? 1 : s.sg), pan: e.pan });
    }
  }
  // A shot that cuts to black (log.silenceFrom, a source frame) is silent from there to its end: no effect
  // started before the cut rings on across it.
  const mutes = [];
  for (const s of segs) {
    if (!s.shot) continue;
    const lg = shotLog(s.profile || spec.profile, s.shot);
    if (lg.silenceFrom && lg.silenceFrom >= s.at && lg.silenceFrom < s.at + s.len * s.speed) mutes.push([(s.t0 + (lg.silenceFrom - s.at) / s.speed) / FPS, (s.t0 + s.len) / FPS]);
  }
  for (const e of (spec.stingers || [])) events.push({ f: e.at, k: e.k, r: e.r || 1, g: 0.35 * (e.g || 1), pan: 0 });
  const sfxWav = path.join(tmp, 'sfx.wav');
  mixSfx(events, total / FPS, FPS, sfxWav);

  // ── picture ──
  const args = ['-loglevel', 'error', '-y'];
  const filters = [];
  segs.forEach((s, i) => {
    if (s.shot) {
      args.push('-ss', (s.at / FPS).toFixed(5), '-t', ((s.len * s.speed + 12) / FPS).toFixed(5),
        '-i', path.join(WORK, s.profile || spec.profile, s.shot + '.mov'));
    } else {
      args.push('-f', 'lavfi', '-t', ((s.len + 2) / FPS).toFixed(5), '-i', `color=c=0x04020a:s=${W}x${H}:r=${FPS}`);
    }
    let f = `[${i}:v]setpts=PTS-STARTPTS`;
    if (s.speed !== 1) f += `,setpts=PTS/${s.speed}`;
    if (s.zoom) {
      const z = s.zoom.z, cx = s.zoom.cx === undefined ? 0.5 : s.zoom.cx, cy = s.zoom.cy === undefined ? 0.5 : s.zoom.cy;
      f += `,crop=iw/${z}:ih/${z}:(iw-iw/${z})*${cx}:(ih-ih/${z})*${cy}`;
    }
    // The captures are full-range (read off the canvas as JPEG); deliver limited-range BT.709.
    f += `,scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos:in_range=full:out_range=limited,format=yuv420p,crop=${W}:${H},setsar=1,fps=${FPS}`;
    f += `,tpad=stop_mode=clone:stop_duration=2,trim=end_frame=${s.len},setpts=PTS-STARTPTS[v${i}]`;
    filters.push(f);
  });
  const ovIdx = segs.length;
  args.push('-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-');
  filters.push(segs.map((s, i) => `[v${i}]`).join('') + `concat=n=${segs.length}:v=1:a=0[base]`);
  filters.push(`[base][${ovIdx}:v]overlay=format=auto:shortest=0,trim=end_frame=${total},format=yuv420p[out]`);
  const silent = path.join(tmp, 'picture.mp4');
  args.push('-filter_complex', filters.join(';'), '-map', '[out]', '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-bf', '2', '-g', '30',
    '-color_range', 'tv', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', silent);
  // AUDIO_ONLY=1 reuses the last rendered picture and redoes only the sound.
  if (!(process.env.AUDIO_ONLY && fs.existsSync(silent))) {
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg picture ' + c)) : res()));
  ff.stdin.on('error', () => {});
  const ov = await openOverlay(W, H);
  const items = spec.overlays || [];
  let blank = null;
  for (let f = 0; f < total; f++) {
    const live = items.filter(it => it.type === 'vignette' || (it.at !== undefined ? f >= it.at && f < it.at + (it.len || 8) : f >= it.from && f < it.to));
    let buf;
    if (!live.length && blank) buf = blank;
    else {
      const url = await ov.page.evaluate((f, items) => window.__draw(f, items), f, live);
      buf = Buffer.from(url.split(',')[1], 'base64');
      if (!live.length) blank = buf;
    }
    if (!ff.stdin.write(buf)) await new Promise(res => ff.stdin.once('drain', res));
  }
  ff.stdin.end();
  await ov.close();
  await done;
  }

  // ── audio mix + mux ──
  const m = spec.music;
  const dur = total / FPS;
  const out = path.join(outDir, name + '.mp4');
  const a = ['-loglevel', 'error', '-y', '-i', silent, '-i', sfxWav];
  let af = `[1:a]volume=${spec.sfxGain || 1.0}${mutes.map(([a, b]) => `,volume=0:enable='between(t,${a.toFixed(3)},${b.toFixed(3)})'`).join('')}[sfx]`;
  if (m) {
    // The tracks are loops, so the bed can run on under the end card and fade.
    a.push('-stream_loop', '-1', '-ss', String(m.from || 0), '-i', path.join(ROOT, m.file));
    const mEnd = m.end === undefined ? dur : m.end;   // seconds on the timeline where the music stops
    const mAt = m.at || 0;                            // seconds on the timeline where it starts
    af += `;[2:a]aresample=48000,atrim=end=${(mEnd - mAt).toFixed(4)},afade=t=in:d=${m.fadeIn || 0.02},afade=t=out:st=${(mEnd - mAt - (m.fadeOut || 0.05)).toFixed(4)}:d=${m.fadeOut || 0.05},` +
      `adelay=${Math.round(mAt * 1000)}:all=1,volume=${m.gain || 1},apad=whole_dur=${dur.toFixed(4)}[mus]`;
    // The music ducks a little under the hits so they stay crisp.
    af += `;[sfx]asplit[sfxa][sfxk];[mus][sfxk]sidechaincompress=threshold=0.06:ratio=3:attack=5:release=180[musd]`;
    af += `;[sfxa][musd]amix=inputs=2:normalize=0[mix]`;
  } else af += `;[sfx]anull[mix]`;
  af += `;[mix]atrim=end=${dur.toFixed(4)},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000,afade=t=out:st=${(dur - 0.25).toFixed(4)}:d=0.25[aout]`;
  a.push('-filter_complex', af, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000',
    '-t', dur.toFixed(4), '-movflags', '+faststart', out);
  execFileSync('ffmpeg', a, { stdio: ['ignore', 'inherit', 'inherit'] });
  fs.writeFileSync(path.join(tmp, 'timeline.json'), JSON.stringify({ total, segs, overlays: spec.overlays || [] }, null, 1));
  return { out, frames: total, secs: dur };
}

module.exports = { render, shotLog, openOverlay, FPS, BASE, WORK };
