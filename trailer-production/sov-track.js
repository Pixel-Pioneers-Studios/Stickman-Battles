'use strict';
// Finds Sovereign (red glow) and the player (cyan) in a recorded mp4, per frame.
//   track(file, t0, t1) -> [{ t, sov: {x, y, top} | null, ply: {x, y} | null }] in source pixels
// Samples at SAMPLE fps on a 1/DS scaled copy; callers interpolate.
const { spawn } = require('child_process');

const DS = 3, SAMPLE = 30;

function probe(file) {
  const { execFileSync } = require('child_process');
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]).toString().trim().split(',').map(Number);
  return { w, h };
}

function pct(a, p) { if (!a.length) return null; a.sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))]; }

function track(file, t0, t1, opts) {
  const minY = (opts && opts.minY) || 200;   // source px; above this are the game's banners
  const { w, h } = probe(file);
  const sw = Math.round(w / DS / 2) * 2, sh = Math.round(h / DS / 2) * 2, kx = w / sw, ky = h / sh;
  return new Promise((res, rej) => {
    const ff = spawn('ffmpeg', ['-v', 'error', '-ss', String(t0), '-i', file, '-t', String(t1 - t0),
      '-vf', `fps=${SAMPLE},scale=${sw}:${sh}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
    const fsz = sw * sh * 3, out = [];
    let buf = Buffer.alloc(0), n = 0;
    ff.stdout.on('data', d => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= fsz) {
        const fr = buf.subarray(0, fsz); buf = buf.subarray(fsz);
        const rx = [], ry = [], cx = [], cy = [];
        for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
          const i = (y * sw + x) * 3, r = fr[i], g = fr[i + 1], b = fr[i + 2];
          if (r > 170 && g < 90 && b < 80 && (!opts || y * ky > minY)) { rx.push(x); ry.push(y); }
          else if (g > 110 && b > 140 && r < 110 && b >= g && y * ky > minY) { cx.push(x); cy.push(y); }
        }
        // The glow is a filled disk; platform and floor outlines are thin red lines.
        // Take the densest 5x5-cell window (cells of C px), then the red pixels near it.
        let sov = null;
        if (rx.length > 70) {
          const C = 8, gw = Math.ceil(sw / C), gh = Math.ceil(sh / C), g = new Int32Array(gw * gh);
          for (let k = 0; k < rx.length; k++) g[((ry[k] / C) | 0) * gw + ((rx[k] / C) | 0)]++;
          let best = -1, bx = 0, by = 0;
          for (let y = 2; y < gh - 2; y++) for (let x = 2; x < gw - 2; x++) {
            let s = 0; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) s += g[(y + j) * gw + x + i];
            if (s > best) { best = s; bx = (x + 0.5) * C; by = (y + 0.5) * C; }
          }
          const R = 160 / DS, nx = [], ny = [];
          for (let k = 0; k < rx.length; k++) if (Math.abs(rx[k] - bx) < R && Math.abs(ry[k] - by) < R) { nx.push(rx[k]); ny.push(ry[k]); }
          if (best > 120) sov = { x: pct(nx, 0.5) * kx, y: pct(ny.slice(), 0.5) * ky, top: pct(ny, 0.04) * ky, n: best };
        }
        const ply = cx.length > 12 ? { x: pct(cx.slice(), 0.5) * kx, y: pct(cy.slice(), 0.5) * ky, n: cx.length } : null;
        out.push({ t: t0 + n / SAMPLE, sov, ply }); n++;
      }
    });
    ff.on('close', c => c ? rej(new Error('ffmpeg track ' + c)) : res(out));
  });
}

module.exports = { track, probe, SAMPLE };

if (require.main === module) {
  const [file, a, b] = process.argv.slice(2);
  track(file, +a, +b).then(o => o.forEach((r, i) => i % 6 === 0 && console.log(r.t.toFixed(2),
    r.sov ? `sov ${r.sov.x | 0},${r.sov.y | 0} top ${r.sov.top | 0} n${r.sov.n}` : 'sov -',
    r.ply ? `ply ${r.ply.x | 0},${r.ply.y | 0} n${r.ply.n}` : 'ply -')));
}
