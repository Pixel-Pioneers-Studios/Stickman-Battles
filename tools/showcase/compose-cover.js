'use strict';
// Puts the game title on an engine-rendered cover capture (tools/showcase/cover.js)
// and writes the store-size PNG. CrazyGames requires the game's name on every
// cover and nothing else ("don't write New, Play now…"); the title uses Russo One,
// the same self-hosted face as the menu logo.
//
//   node tools/showcase/compose-cover.js <capture.png> <out.png> <outW> <outH> <layout>
//   layout: land | port | sq
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { ROOT } = require('./harness');

const [SRC, OUT, OW, OH, LAYOUT] = process.argv.slice(2);

// Sizes are in units of the frame's width (vw) so one layout works at any
// capture resolution; the capture is downscaled with lanczos afterwards.
const LAYOUTS = {
  land: { lines: ['STICKMAN EVOLUTION'], size: 5.0, sub: 1.55, bottom: 6.5 },
  // Apex cover (apex-cover.js): the war fills the bottom centre, so the title
  // sits bottom-left over the dark rock of Kael's ledge instead.
  apexland: { lines: ['STICKMAN', 'EVOLUTION'], size: 6.0, sub: 1.8, bottom: 3.0, left: 3.2 },
  port: { lines: ['STICKMAN', 'EVOLUTION'], size: 13.5, sub: 3.6, bottom: 9 },
  sq:   { lines: ['STICKMAN', 'EVOLUTION'], size: 10.5, sub: 2.8, bottom: 6 },
};

(async () => {
  const L = LAYOUTS[LAYOUT];
  if (!L) throw new Error('layout must be one of ' + Object.keys(LAYOUTS).join('|'));
  const png = fs.readFileSync(SRC);
  const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
  const font = fs.readFileSync(path.join(ROOT, 'fonts', 'russoone-400.woff2')).toString('base64');
  const html = `<!doctype html><html><head><style>
    @font-face { font-family: 'Russo One'; src: url(data:font/woff2;base64,${font}) format('woff2'); }
    html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: #000; }
    .bg { position: absolute; inset: 0; background: url(data:image/png;base64,${png.toString('base64')}) center/cover; }
    /* Darken only the band the title sits on, so it reads over any capture. */
    .fade { position: absolute; left: 0; right: 0; bottom: 0; height: 42%;
            background: linear-gradient(to top, rgba(4,2,10,0.82), rgba(4,2,10,0)); }
    .title { position: absolute; bottom: ${L.bottom}vw;
             ${L.left !== undefined ? `left: ${L.left}vw; text-align: left;` : 'left: 0; right: 0; text-align: center;'}
             font-family: 'Russo One'; line-height: 0.95; letter-spacing: 0.02em; }
    .t { font-size: ${L.size}vw; color: #ff9a2e;
         background: linear-gradient(180deg, #ffd08a 0%, #ff9a2e 45%, #e8561a 100%);
         -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
         filter: drop-shadow(0 0.35vw 0.5vw rgba(0,0,0,0.9)) drop-shadow(0 0 1.6vw rgba(255,110,30,0.35)); }
    .sub { margin-top: ${L.sub * 0.55}vw; font-size: ${L.sub}vw; letter-spacing: 0.5em; padding-left: 0.5em;
           color: #f3e6d4; filter: drop-shadow(0 0.2vw 0.3vw rgba(0,0,0,0.95)); }
  </style></head><body><div class="bg"></div><div class="fade"></div>
    <div class="title">${L.lines.map(s => `<div class="t">${s}</div>`).join('')}<div class="sub">THE 95TH</div></div>
  </body></html>`;

  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const lo = { headless: 'new', pipe: true, args: ['--no-sandbox'] };
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chrome)) lo.executablePath = chrome;
  const browser = await puppeteer.launch(lo);
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const tmp = OUT + '.full.png';
  await page.screenshot({ path: tmp, type: 'png' });
  await browser.close();
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmp, '-vf', `scale=${OW}:${OH}:flags=lanczos`, OUT]);
  fs.unlinkSync(tmp);
  console.log(OUT);
})().catch(e => { console.error(e); process.exit(1); });
