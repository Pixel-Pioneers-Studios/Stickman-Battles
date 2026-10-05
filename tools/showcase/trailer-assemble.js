'use strict';
// Cuts the shots recorded by trailer.js into the store preview video: the
// static cover first (CrazyGames requires the video to open on it), then each
// shot's chosen window, hard cuts, 30fps H.264.
//
//   node tools/showcase/trailer-assemble.js <workDir> <cover.png> <out.mp4> <W> <H> [shot,shot…]
//
// A shot written `name:secs` keeps only the first secs of its window.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');

const [work, cover, out, W, H, order] = process.argv.slice(2);
const shots = (order || 'duel,boss,story,br,soccer,domain').split(',');
const COVER_FRAMES = 45;   // 1.5s at 30fps

const seq = path.join(work, '_seq');
fs.rmSync(seq, { recursive: true, force: true });
fs.mkdirSync(seq, { recursive: true });
let n = 0;
const put = src => fs.copyFileSync(src, path.join(seq, String(n++).padStart(5, '0') + '.jpg'));

const coverJpg = path.join(work, '_cover.jpg');
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', cover, '-vf', `scale=${W}:${H}:flags=lanczos`, '-q:v', '2', coverJpg]);
for (let i = 0; i < COVER_FRAMES; i++) put(coverJpg);

for (const shot of shots) {
  const [name, secs] = shot.split(':');
  const meta = JSON.parse(fs.readFileSync(path.join(work, name + '.json'), 'utf8'));
  if (secs) meta.len = Math.min(meta.len, Math.round(+secs * 30));
  for (let i = meta.start; i < meta.start + meta.len; i++) {
    put(path.join(work, name, String(i).padStart(5, '0') + '.jpg'));
  }
  console.log(name, meta.len, 'frames from', meta.start);
}

execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '30', '-i', path.join(seq, '%05d.jpg'),
  '-vf', `scale=${W}:${H}:flags=lanczos,setsar=1`,
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-preset', 'slow', '-an', '-movflags', '+faststart', out]);
console.log(out, n, 'frames', (n / 30).toFixed(2) + 's');
