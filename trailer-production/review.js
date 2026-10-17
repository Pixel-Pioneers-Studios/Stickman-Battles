'use strict';
// Review helpers.
//   node review.js windows <profile>      per shot: busiest windows, finisher span, cast frames
//   node review.js sheet <file.mp4> [fps] [cols]   contact sheet next to the file
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const cmd = process.argv[2];
if (cmd === 'windows') {
  const dir = path.join(__dirname, 'work', process.argv[3] || 'land');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), L = j.log;
    const d = L.map((e, k) => k && e && L[k - 1] ? Math.max(0, L[k - 1].hp - e.hp) : 0);
    const win = 120; let best = [];
    for (let k = 0; k + win <= L.length; k += 30) best.push([k, Math.round(d.slice(k, k + win).reduce((a, b) => a + b, 0))]);
    best.sort((a, b) => b[1] - a[1]);
    const span = key => { const a = L.findIndex(e => e && e[key]), b = L.map(e => !!(e && e[key])).lastIndexOf(true); return a < 0 ? '-' : a + '-' + b; };
    const goal = L.findIndex((e, k) => k && e && L[k - 1] && e.score > L[k - 1].score);
    console.log(f.replace('.json', '').padEnd(11), 'frames', String(L.length).padEnd(5), 'dmg2s', best.slice(0, 4).map(b => b[0] + ':' + b[1]).join(' ').padEnd(40),
      'fin', span('fin').padEnd(9), 'cin', span('cin').padEnd(9), 'dom', span('dom').padEnd(9), goal > 0 ? 'goal ' + goal : '',
      j.plan ? 'casts ' + j.plan.slice(1).map(p => p.w + ':' + p.k + '@' + (p.at - 1)).join(' ') : '', 'sfx', j.sfx.length);
  }
} else if (cmd === 'sheet') {
  const file = process.argv[3], fps = process.argv[4] || '2', cols = +(process.argv[5] || 8);
  const dur = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString();
  const n = Math.ceil(dur * +fps), rows = Math.ceil(n / cols);
  const vert = +execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file]).toString().split(',')[0] < 1500;
  const out = file.replace(/\.\w+$/, '.sheet.jpg');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', file, '-vf', `fps=${fps},scale=${vert ? 200 : 360}:-1,tile=${cols}x${rows}`, '-q:v', '3', out]);
  console.log(out, n, 'tiles');
}
