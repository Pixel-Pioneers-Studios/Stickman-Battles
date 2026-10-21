'use strict';
// Long-form "How Sovereign Ω thinks", 1920x1080, from the Oct 19 clip-recorder mp4.
//   ../tools/voice/.venv/bin/python sov-long-voice.py   (narration, once)
//   node sov-long.js [--only=cards]                     → out/sovereign-explained-1080p60.mp4
// Structure: cold open (the last-stock finish) → narrated beats over dimmed match footage with
// cards → the full match, unedited, with stock callouts → outro. Cards are HTML rendered to
// transparent PNGs with the game's fonts; ffmpeg does the rest. Script lives in sov-long-beats.js.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { BEATS, MATCH_EVENTS, OUTRO } = require('./sov-long-beats');

const BASE = __dirname, ROOT = path.resolve(BASE, '..');
const SRC = path.join(ROOT, 'stickman-rec-20261019-003834.mp4');
const AUD = path.join(__dirname, 'work', 'sov-long', 'src-audio.wav');   // sov-audio-fix.js: the recording's audio ends at 284.9 s
const WK = path.join(BASE, 'work', 'sov-long'), CARDS = path.join(WK, 'cards'), SEG = path.join(WK, 'seg');
const W = 1920, H = 1080, FPS = 60, SRC_END = 326.9;
const PIC = 'crop=1710:962:0:55,scale=1920:1080:flags=lanczos,setsar=1,fps=60';   // 16:10 source → 16:9
const ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-g', '60',
  '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2'];
const COLD = [312.4, 325.2];
const OUTRO_STILL = 322.9;   // last frame before the 323.0-326.5 freeze gap

const ff = args => execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
const dur = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString();

// ── cards ────────────────────────────────────────────────────────────────────
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const CYAN = '#7fe6ff', RED = '#ff6a5a', GOLD = '#ffd23f';

function cardHTML(c) {
  const sec = c.section ? `<div class="sec">${esc(c.section)}</div>` : '';
  const head = `${sec}<div class="h">${esc(c.title)}</div>`;
  let body = '';
  switch (c.kind) {
    case 'title':
      return `<div class="center"><div class="kick">${esc(c.kicker)}</div><div class="big">${esc(c.title)}</div><div class="sub">${esc(c.sub)}</div></div>`;
    case 'end':
      return `<div class="center"><div class="big red">${esc(c.title)}</div><div class="sub">${esc(c.sub)}</div><div class="url">${esc(c.url)}</div></div>`;
    case 'list': body = c.items.map(t => `<div class="li">${esc(t)}</div>`).join(''); break;
    case 'panel': body = c.lines.map(t => `<div class="ln"><span class="dot"></span>${esc(t)}</div>`).join(''); break;
    case 'keys': body = `<div class="keys">${c.keys.map(k => `<div class="key">${k}</div>`).join('')}</div><div class="note">${esc(c.note)}</div>`; break;
    case 'bars': body = `<div class="bars">${c.bars.map((v, i) => `<div class="bc"><div class="bv">${v}</div><div class="bar" style="height:${v * 2.6}px"></div><div class="bl">HIT ${i + 1}${i === c.bars.length - 1 ? '+' : ''}</div></div>`).join('')}</div><div class="note">${esc(c.note)}</div>`; break;
    case 'legend': body = c.rows.map(([a, b, col]) => `<div class="lg"><div class="lga" style="color:${col}">${esc(a)}</div><div class="lgb">${esc(b)}</div></div>`).join(''); break;
    case 'grid': body = `<div class="grid">${c.items.map(t => `<div class="gi">${esc(t)}</div>`).join('')}</div>`; break;
    case 'net':
      body = `<div class="net">
        <div class="col"><div class="nb in">250<small>numbers in</small></div></div><div class="arr">→</div>
        <div class="col"><div class="nb">128<small>neurons</small></div></div><div class="arr">→</div>
        <div class="col"><div class="nb">128<small>neurons</small></div><div class="nb mem">128<small>memory (GRU)</small></div></div><div class="arr">→</div>
        <div class="col"><div class="nb out">11<small>numbers out</small></div></div></div>
        <div class="note">≈ 100,000 weights. Nothing hand-written about how to fight.</div>`; break;
    case 'heads':
      body = `<div class="heads">
        <div class="hd"><b>MOVE</b><span>left · stay · right</span></div>
        <div class="hd"><b>JUMP</b><span>yes · no</span></div>
        <div class="hd"><b>SHIELD</b><span>yes · no</span></div>
        <div class="hd"><b>BUTTON</b><span>attack · ability · super · none</span></div></div>
        <div class="note">One choice per group, every 3 frames. It always plays its top choice.</div>`; break;
    case 'reward':
      body = `<div class="rw"><div class="r pos">+ damage dealt</div><div class="r neg">− damage taken</div><div class="r pos">+ a stock taken</div><div class="r neg">− a stock lost</div></div>
        <div class="note">Started from nothing: not even what the buttons do. Trained headless on the real game.</div>`; break;
    case 'ladder':
      body = `<div class="lad">${c.steps.map((s, i) => `<div class="st" style="margin-left:${i * 34}px">${s}</div>`).join('')}</div><div class="note">${esc(c.note)}</div>`; break;
    case 'stat':
      body = `<div class="stat"><div class="sa"><div class="sn">${c.a[0]}</div><div class="sl">${esc(c.a[1])}</div></div>
        <div class="sa"><div class="sn dim">${c.b[0]}</div><div class="sl">${esc(c.b[1])}</div></div></div><div class="note">${esc(c.note)}</div>`; break;
  }
  return `<div class="card">${head}${body}</div>`;
}

function calloutHTML(ev, left) {
  const [, who, name] = ev;
  if (who === 'R') return `<div class="co" style="border-color:#ff3311"><div class="cot" style="color:#ff5533">NULL RECOIL</div><div class="cos">Sovereign breaks the juggle</div></div>`;
  const p = who === 'P';
  const sub = p ? `Sovereign takes a stock · player has ${left} left` : 'The player takes a stock';
  return `<div class="co" style="border-color:${p ? RED : CYAN}"><div class="cot" style="color:${p ? RED : GOLD}">${esc(name)}</div><div class="cos">${esc(sub)}</div></div>`;
}

const CSS = `
html,body{margin:0;background:transparent;width:${W}px;height:${H}px;overflow:hidden}
body{font-family:Rajdhani;color:#fff;font-weight:600}
.card{position:absolute;left:110px;top:50%;transform:translateY(-50%);width:820px;padding:52px 58px;border-radius:22px;
  background:rgba(8,6,16,.78);border:2px solid rgba(127,230,255,.35);box-shadow:0 0 60px rgba(0,0,0,.6)}
.sec{font-family:Rajdhani;font-weight:700;letter-spacing:.32em;color:${CYAN};font-size:26px;margin-bottom:10px}
.h{font-family:'Russo One';font-size:62px;line-height:1.05;margin-bottom:30px;text-shadow:0 0 22px rgba(127,230,255,.35)}
.li{font-size:44px;margin:10px 0}
.ln{font-size:40px;margin:16px 0;display:flex;align-items:baseline;gap:20px;line-height:1.15}
.dot{flex:none;width:14px;height:14px;border-radius:50%;background:${CYAN};transform:translateY(-6px)}
.note{font-size:30px;color:#b9c3d6;margin-top:26px;line-height:1.25}
.keys{display:flex;flex-wrap:wrap;gap:16px}
.key{font-family:'Russo One';font-size:32px;padding:18px 24px;border-radius:12px;border:2px solid ${CYAN};background:rgba(127,230,255,.08)}
.bars{display:flex;align-items:flex-end;gap:22px;height:330px}
.bc{display:flex;flex-direction:column;align-items:center;gap:8px}
.bar{width:84px;background:linear-gradient(${GOLD},#ff8a2a);border-radius:8px 8px 0 0}
.bv{font-family:'Russo One';font-size:32px}.bl{font-size:24px;color:#b9c3d6}
.lg{margin:16px 0}.lga{font-family:'Russo One';font-size:34px}.lgb{font-size:30px;color:#d6dbe6}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 26px}
.gi{font-size:32px;padding:10px 16px;border-left:4px solid ${CYAN};background:rgba(127,230,255,.06)}
.net{display:flex;align-items:center;gap:14px}.col{display:flex;flex-direction:column;gap:14px}
.nb{font-family:'Russo One';font-size:46px;text-align:center;padding:16px 18px;border-radius:14px;border:2px solid ${CYAN};min-width:118px;background:rgba(127,230,255,.08)}
.nb small{display:block;font-family:Rajdhani;font-size:22px;color:#b9c3d6;font-weight:600}
.nb.mem{border-color:#c48cff;background:rgba(196,140,255,.1)}.nb.out{border-color:${GOLD}}.nb.in{border-color:#9fe}
.arr{font-size:46px;color:#b9c3d6}
.heads{display:flex;flex-direction:column;gap:16px}
.hd{display:flex;gap:26px;align-items:baseline;font-size:36px}.hd b{font-family:'Russo One';font-weight:400;min-width:190px;color:${GOLD}}
.rw{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.r{font-family:'Russo One';font-size:36px;padding:18px;border-radius:12px;text-align:center}
.pos{background:rgba(80,220,140,.16);border:2px solid #50dc8c}.neg{background:rgba(255,90,90,.14);border:2px solid ${RED}}
.st{font-family:'Russo One';font-size:34px;padding:10px 18px;margin:8px 0;border-left:6px solid ${GOLD};background:rgba(255,210,63,.07);width:max-content}
.stat{display:flex;gap:40px}.sa{flex:1}.sn{font-family:'Russo One';font-size:96px;color:${CYAN}}.sn.dim{color:#c48cff}.sl{font-size:30px;color:#d6dbe6}
.center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.kick{font-weight:700;letter-spacing:.34em;font-size:34px;color:${CYAN}}
.big{font-family:'Russo One';font-size:150px;line-height:1.05;margin:12px 0;text-shadow:0 0 40px rgba(255,80,60,.45)}
.big.red{color:${RED}}
.sub{font-size:48px;color:#e8ecf4}.url{font-family:'Russo One';font-size:54px;color:${GOLD};margin-top:40px}
.co{position:absolute;left:70px;bottom:90px;padding:18px 30px;border-radius:14px;background:rgba(8,6,16,.82);border-left:8px solid}
.cot{font-family:'Russo One';font-size:46px}.cos{font-size:30px;color:#e8ecf4}
.tagc{position:absolute;right:56px;top:44px;font-weight:700;letter-spacing:.24em;font-size:24px;color:rgba(255,255,255,.75)}
.cap{position:absolute;left:0;right:0;top:70px;text-align:center;font-family:'Russo One';font-size:84px;text-shadow:0 0 30px rgba(0,0,0,.9),0 4px 0 #000}
`;

async function renderCards(jobs) {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const lo = { headless: 'new', args: ['--no-sandbox'] };
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chrome)) lo.executablePath = chrome;
  const b = await puppeteer.launch(lo), p = await b.newPage();
  await p.setViewport({ width: W, height: H });
  const f = n => 'data:font/woff2;base64,' + fs.readFileSync(path.join(ROOT, 'fonts', n)).toString('base64');
  const fonts = `@font-face{font-family:'Russo One';src:url(${f('russoone-400.woff2')})}
    @font-face{font-family:Rajdhani;font-weight:600;src:url(${f('rajdhani-600.woff2')})}
    @font-face{font-family:Rajdhani;font-weight:700;src:url(${f('rajdhani-700.woff2')})}`;
  for (const [file, html] of jobs) {
    await p.setContent(`<!doctype html><html><head><style>${fonts}${CSS}</style></head><body>${html}</body></html>`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: file, omitBackground: true });
  }
  await b.close();
}

// ── segments ─────────────────────────────────────────────────────────────────
// A narrated beat: footage from `bg`, darkened, card fading in, voice 0.35 s in, game SFX low.
function beatSeg(beat, i, out) {
  const voice = path.join(WK, 'voice', beat.id + '.wav');
  const d = dur(voice) + 0.95, card = path.join(CARDS, beat.id + '.png');
  const still = beat.still != null;
  const vin = still ? ['-loop', '1', '-framerate', String(FPS), '-t', d.toFixed(3), '-i', path.join(WK, 'still.png')]
    : ['-ss', String(beat.bg), '-t', d.toFixed(3), '-i', SRC];
  ff([...vin, '-loop', '1', '-framerate', String(FPS), '-t', d.toFixed(3), '-i', card,
    '-i', voice, ...(still ? ['-f', 'lavfi', '-t', d.toFixed(3), '-i', 'anullsrc=r=48000:cl=stereo'] : ['-ss', String(beat.bg), '-t', d.toFixed(3), '-i', AUD]),
    '-filter_complex',
    `[0:v]${still ? 'scale=1920:1080,setsar=1,fps=60' : PIC},drawbox=c=black@${beat.dim}:t=fill,trim=duration=${d.toFixed(3)}[bg];` +
    `[1:v]format=rgba,fade=in:st=0.1:d=0.35:alpha=1,fade=out:st=${(d - 0.3).toFixed(3)}:d=0.3:alpha=1[cd];` +
    `[bg][cd]overlay=format=auto,format=yuv420p[v];` +
    `[2:a]aresample=48000,adelay=350|350,apad,atrim=duration=${d.toFixed(3)},volume=1.0[vo];` +
    `[3:a]aresample=48000,atrim=duration=${d.toFixed(3)},volume=0.22,afade=t=in:d=0.2,afade=t=out:st=${(d - 0.3).toFixed(3)}:d=0.3[fx];` +
    `[vo][fx]amix=inputs=2:normalize=0:duration=first[a]`,
    '-map', '[v]', '-map', '[a]', '-r', String(FPS), '-t', d.toFixed(3), ...ENC, out]);
  return d;
}

// Plain footage with timed caption PNGs: [png, from, to] in segment seconds.
function footSeg(t0, t1, caps, out, sfxGain) {
  const d = t1 - t0, inputs = ['-ss', String(t0), '-t', d.toFixed(3), '-i', SRC, '-ss', String(t0), '-t', d.toFixed(3), '-i', AUD];
  let fc = `[0:v]${PIC},trim=duration=${d.toFixed(3)}[v0];`, last = 'v0';
  caps.forEach(([png, a, b], i) => {
    inputs.push('-loop', '1', '-framerate', String(FPS), '-t', d.toFixed(3), '-i', png);
    const fi = Math.min(0.25, (b - a) / 4);
    fc += `[${i + 2}:v]format=rgba,fade=in:st=${a.toFixed(3)}:d=${fi}:alpha=1,fade=out:st=${(b - fi).toFixed(3)}:d=${fi}:alpha=1[c${i}];` +
      `[${last}][c${i}]overlay=format=auto:enable='between(t,${a.toFixed(3)},${b.toFixed(3)})'[v${i + 1}];`;
    last = 'v' + (i + 1);
  });
  fc += `[${last}]format=yuv420p[v];[1:a]aresample=48000,atrim=duration=${d.toFixed(3)},volume=${sfxGain || 1}[a]`;
  ff([...inputs, '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-r', String(FPS), '-t', d.toFixed(3), ...ENC, out]);
  return d;
}

(async () => {
  for (const d of [CARDS, SEG]) fs.mkdirSync(d, { recursive: true });
  const all = [...BEATS, Object.assign({ still: OUTRO_STILL }, OUTRO)];

  // Cards: one per beat, cold-open captions, match callouts and the corner tag.
  const jobs = all.map(b => [path.join(CARDS, b.id + '.png'), cardHTML(b.card)]);
  jobs.push([path.join(CARDS, 'cold1.png'), `<div class="cap">LAST STOCK <span style="color:${GOLD}">vs</span> LAST STOCK</div>`]);
  jobs.push([path.join(CARDS, 'cold2.png'), `<div class="cap" style="color:${RED}">MY OWN AI BEAT ME</div>`]);
  jobs.push([path.join(CARDS, 'tag.png'), `<div class="tagc">FULL MATCH · UNEDITED</div>`]);
  let left = 10;
  MATCH_EVENTS.forEach((ev, i) => { if (ev[1] === 'P') left--; jobs.push([path.join(CARDS, `ev${i}.png`), calloutHTML(ev, left)]); });
  await renderCards(jobs);
  console.log('cards', jobs.length);
  if (process.argv.includes('--only=cards')) return;
  ff(['-ss', String(OUTRO_STILL), '-i', SRC, '-frames:v', '1', '-vf', 'crop=1710:962:0:55,scale=1920:1080:flags=lanczos', path.join(WK, 'still.png')]);

  const segs = [], chapters = [];
  let T = 0;
  const add = (file, d, chap) => { if (chap) chapters.push([T, chap]); segs.push(file); T += d; };

  // Cold open: the finish, two captions.
  const cd = COLD[1] - COLD[0];
  add(path.join(SEG, '00-cold.mov'), footSeg(COLD[0], COLD[1],
    [[path.join(CARDS, 'cold1.png'), 0.3, 5.5], [path.join(CARDS, 'cold2.png'), 320.0 - COLD[0] + 1.6, cd]],
    path.join(SEG, '00-cold.mov')), 'The finish');

  const CHAP = { intro1: 'What Sovereign Ω is', rules1: 'The rules', brain1: 'How it sees and decides', learn1: 'How it learned',
    limit1: "What it can't do yet", match0: 'The full match' };
  BEATS.forEach((b, i) => {
    const f = path.join(SEG, `${String(i + 1).padStart(2, '0')}-${b.id}.mov`);
    add(f, beatSeg(b, i, f), CHAP[b.id]);
    console.log('beat', b.id, T.toFixed(1));
  });

  // The match: every frame, callouts 3.2 s from each event (cards are per event).
  const caps = [[path.join(CARDS, 'tag.png'), 0, SRC_END]];
  MATCH_EVENTS.forEach((ev, i) => caps.push([path.join(CARDS, `ev${i}.png`), ev[0] + 0.4, Math.min(SRC_END, ev[0] + 3.6)]));
  const mf = path.join(SEG, '50-match.mov');
  add(mf, footSeg(0, SRC_END, caps, mf, 1.0), null);
  console.log('match', T.toFixed(1));

  const of = path.join(SEG, '60-outro.mov');
  add(of, beatSeg(all[all.length - 1], 99, of), 'Outro');

  // Concat, then music bed ducked under the voice, loudness to −14 LUFS.
  const list = path.join(WK, 'list.txt');
  fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
  const joined = path.join(WK, 'joined.mov');
  ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);
  const total = dur(joined);
  const out = path.join(BASE, 'out', 'sovereign-explained-1080p60.mp4');
  ff(['-i', joined, '-stream_loop', '-1', '-i', path.join(ROOT, 'audio/music/boss-threshold.mp3'),
    '-filter_complex',
    `[0:a]asplit[ga][gk];[1:a]aresample=48000,atrim=duration=${total.toFixed(3)},volume=0.30,afade=t=in:d=1.5,afade=t=out:st=${(total - 3).toFixed(3)}:d=3[mus];` +
    `[mus][gk]sidechaincompress=threshold=0.04:ratio=5:attack=8:release=350[md];[ga][md]amix=inputs=2:normalize=0,` +
    `loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', out]);
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const chap = chapters.map(([t, n]) => `${fmt(t)} ${n}`).join('\n');
  fs.writeFileSync(path.join(WK, 'chapters.txt'), chap + '\n');
  console.log('wrote', out, total.toFixed(1) + 's\n' + chap);
})().catch(e => { console.error(e); process.exit(1); });
