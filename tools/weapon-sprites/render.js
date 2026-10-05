// Renders the authored weapon SVGs to trimmed, game-ready PNGs.
//   node tools/weapon-sprites/render.js [key ...]
// Writes images/weapons/<key>.png and prints the WEAPON_SPRITE_DEFS line for each.

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
// --grim selects the grounded style (defs-grim.js); --out <dir> redirects output
// so a style can be rendered for comparison without clobbering the shipped art.
const ARGV = process.argv.slice(2);
const GRIM = ARGV.includes('--grim');
const DEFS = GRIM ? require('./defs-grim') : require('./defs');
const { AXIS } = GRIM ? require('./parts-grim') : require('./parts');

const BOX_W = 512, BOX_H = 220, SS = 4;   // supersample factor
const OUT_W = +(process.env.SPRITE_W || 128); // final sprite width, matches axe/scythe; SPRITE_W for hi-res store art
const DEF_LEN = 58;                       // default in-game display width
const outFlag = ARGV.indexOf('--out');
const OUT_DIR = outFlag >= 0
  ? ARGV[outFlag + 1]
  : path.join(__dirname, '../../images/weapons');

async function main() {
  const keys = (() => {
    const k = ARGV.filter((a, i) => !a.startsWith('--') && ARGV[i - 1] !== '--out');
    return k.length ? k : Object.keys(DEFS);
  })();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent('<body style="margin:0">');

  for (const key of keys) {
    const def = DEFS[key];
    if (!def) { console.error(`no def for "${key}"`); continue; }
    // A grim def is a build() closure so gradient ids are regenerated per render.
    const built = def.build ? def.build() : { defs: '', svg: def.svg };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BOX_W * SS}" height="${BOX_H * SS}" viewBox="0 0 ${BOX_W} ${BOX_H}"><defs>${built.defs || ''}</defs>${built.svg}</svg>`;

    const res = await page.evaluate(async (svg, cfg) => {
      const img = new Image();
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
      await img.decode();

      const big = document.createElement('canvas');
      big.width = cfg.w; big.height = cfg.h;
      const bctx = big.getContext('2d');
      bctx.drawImage(img, 0, 0);

      // alpha-trim
      const d = bctx.getImageData(0, 0, cfg.w, cfg.h).data;
      let x0 = cfg.w, y0 = cfg.h, x1 = -1, y1 = -1;
      for (let y = 0; y < cfg.h; y++) for (let x = 0; x < cfg.w; x++) {
        if (d[(y * cfg.w + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      if (x1 < 0) return null;
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;

      const out = document.createElement('canvas');
      out.width = cfg.outW;
      out.height = Math.max(1, Math.round(bh * (cfg.outW / bw)));
      const octx = out.getContext('2d');
      octx.imageSmoothingQuality = 'high';
      octx.drawImage(big, x0, y0, bw, bh, 0, 0, out.width, out.height);

      return {
        png: out.toDataURL('image/png').split(',')[1],
        w: out.width, h: out.height,
        anchor: (cfg.gripX * cfg.ss - x0) / bw,
        shaftY: (cfg.axis  * cfg.ss - y0) / bh,
      };
    }, svg, { w: BOX_W * SS, h: BOX_H * SS, outW: OUT_W, ss: SS, gripX: def.gripX, axis: AXIS });

    if (!res) { console.error(`${key}: rendered empty`); continue; }
    fs.writeFileSync(path.join(OUT_DIR, `${key}.png`), Buffer.from(res.png, 'base64'));
    // A tall sprite (bow, shield) needs a smaller `len` or it towers over the
    // ~84px fighter, since `len` sets the WIDTH and height follows the aspect.
    const len = def.len || DEF_LEN;
    const pad = key.padEnd(7) + ':';
    const drawnH = Math.round(res.h * (len / res.w));
    console.log(`  ${pad} { src: 'images/weapons/${key}.png',${' '.repeat(Math.max(0, 10 - key.length))} len: ${len}, anchor: ${res.anchor.toFixed(2)}, shaftY: ${(res.shaftY * res.h).toFixed(1)} / ${res.h} },   // ${res.w}x${res.h} -> draws ${len}x${drawnH}`);
  }

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
