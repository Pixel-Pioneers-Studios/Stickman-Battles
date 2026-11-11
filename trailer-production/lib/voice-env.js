'use strict';
// Per-frame mouth openness (0..1) from a voice file's loudness, for mini Kael's lip flap.
const { execFileSync } = require('child_process');
function mouthEnvelope(file, fps = 60, sr = 24000) {
  const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  const a = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4), step = sr / fps, out = [];
  for (let i = 0; i * step < a.length; i++) {
    let s = 0, n = 0; for (let k = Math.floor(i * step); k < Math.min(a.length, (i + 1) * step); k++) { s += a[k] * a[k]; n++; }
    out.push(Math.sqrt(s / Math.max(1, n)));
  }
  const pk = Math.max(...out) || 1;
  // Snap a little: real mouths open and shut rather than hover.
  return out.map(v => { const u = Math.min(1, v / (pk * 0.6)); return u < 0.12 ? 0 : Math.round(u * 4) / 4; });
}
module.exports = { mouthEnvelope };
