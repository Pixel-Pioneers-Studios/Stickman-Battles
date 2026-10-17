'use strict';
// 60fps frame-stepped recorder with sound-effect logging.
//
// Builds on tools/showcase/session.js (read-only dependency; nothing in the
// game or in tools/ is modified). Each recorded frame advances the game by
// exactly one tick, is read off #gameCanvas as a JPEG and piped straight into
// ffmpeg, so a shot lands as one high-bitrate mp4 instead of thousands of
// stills. Every sound the game starts while the frame is simulated is logged
// with its sample, gain, pitch and pan, and mixed afterwards from the game's
// own audio/sfx/*.wav files — so the clip's audio is what the game would have
// played, in sync to the frame.
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SFX_DIR = path.join(ROOT, 'audio', 'sfx');
const SR = 48000;

function sigOf(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i += 97) s = (s + buf[i] * (1 + (i % 251))) >>> 0;
  return buf.length + ':' + s;
}

function sfxSignatures() {
  const map = {};
  for (const f of fs.readdirSync(SFX_DIR)) {
    if (!f.endsWith('.wav')) continue;
    map[sigOf(fs.readFileSync(path.join(SFX_DIR, f)))] = f.replace(/\.wav$/, '');
  }
  return map;
}

// Install the audio hooks in the page. Prototype patches, so it works after load.
async function hookAudio(s) {
  await s.eval(sigs => {
    if (window.__sfxHooked) return;
    window.__sfxHooked = true;
    window.__sfxSig = sigs;
    window.__sfxLog = [];
    const AC = window.AudioContext || window.webkitAudioContext;
    const sigOf = ab => {
      const b = new Uint8Array(ab); let s = 0;
      for (let i = 0; i < b.length; i += 97) s = (s + b[i] * (1 + (i % 251))) >>> 0;
      return b.length + ':' + s;
    };
    const dec = AC.prototype.decodeAudioData;
    AC.prototype.decodeAudioData = function (ab) {
      let key = null;
      try { key = window.__sfxSig[sigOf(ab)] || null; } catch (e) {}
      return dec.apply(this, arguments).then(buf => { buf.__key = key; return buf; });
    };
    const con = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest) {
      try {
        if (this instanceof AudioBufferSourceNode && dest instanceof GainNode) this.__g = dest;
        if (this instanceof GainNode && window.StereoPannerNode && dest instanceof StereoPannerNode) this.__pan = dest;
      } catch (e) {}
      return con.apply(this, arguments);
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function () {
      try {
        const k = this.buffer && this.buffer.__key;
        if (k) {
          const g = this.__g;
          window.__sfxLog.push({ k, r: this.playbackRate.value, g: g ? g.gain.value : 0.3,
            pan: g && g.__pan ? g.__pan.pan.value : 0 });
        }
      } catch (e) {}
      return start.apply(this, arguments);
    };
  }, sfxSignatures());
}

// Record `frames` frames into <out>.mp4 (+ <out>.json log, <out>.wav sfx).
// opts: { fps, probe, cropW, quality }
async function record(s, out, frames, opts = {}) {
  const fps = opts.fps || 60;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmpVid = out + '.video.mp4';
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '13', '-pix_fmt', 'yuv420p', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', tmpVid],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));

  await s.eval(() => { window.__cropX = null; window.__sfxLog = []; });
  await s.manual();
  const log = [], sfx = [];
  for (let i = 0; i < frames; i++) {
    await s.step(1);
    const r = await s.eval((probeSrc, quality, cw) => {
      let url;
      if (cw) {
        const k = Math.min(canvas.width / GAME_W, canvas.height / GAME_H) * camZoomCur;
        const sx = wx => canvas.width / 2 + (wx - camXCur) * k;
        const p1 = players[0];
        let fx = canvas.width / 2;
        if (window.__focus) fx = sx(window.__focus());
        else if (p1) {
          fx = sx(p1.cx());
          const t = p1.target;
          if (t && t.health > 0 && Math.abs(sx(t.cx()) - fx) < cw * 0.75) fx = (fx + sx(t.cx())) / 2;
        }
        const want = fx - cw / 2;
        window.__cropX = window.__cropX == null ? want : window.__cropX + (want - window.__cropX) * 0.07;
        const x0 = Math.max(0, Math.min(canvas.width - cw, Math.round(window.__cropX)));
        const oc = window.__cropCv || (window.__cropCv = document.createElement('canvas'));
        oc.width = cw; oc.height = canvas.height;
        oc.getContext('2d').drawImage(canvas, x0, 0, cw, canvas.height, 0, 0, cw, canvas.height);
        url = oc.toDataURL('image/jpeg', quality);
      } else {
        url = canvas.toDataURL('image/jpeg', quality);
      }
      let p = null;
      if (probeSrc) { try { p = (new Function('return (' + probeSrc + ')()'))(); } catch (e) { p = { err: String(e) }; } }
      const ev = window.__sfxLog; window.__sfxLog = [];
      return { url, p, ev };
    }, opts.probe ? opts.probe.toString() : null, opts.quality || 0.95, opts.cropW || 0);
    const buf = Buffer.from(r.url.split(',')[1], 'base64');
    if (!ff.stdin.write(buf)) await new Promise(res => ff.stdin.once('drain', res));
    log.push(r.p);
    for (const e of r.ev) sfx.push(Object.assign({ f: i }, e));
  }
  ff.stdin.end();
  await done;
  await s.auto();

  mixSfx(sfx, frames / fps + 1.5, fps, out + '.wav');
  // Mux to the final clip; audio runs 1.5s past the picture so tails survive.
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmpVid, '-i', out + '.wav', '-c:v', 'copy', '-c:a', 'pcm_s16le', out + '.mov']);
  fs.rmSync(tmpVid);
  fs.writeFileSync(out + '.json', JSON.stringify({ fps, frames, log, sfx }));
  return { log, sfx };
}

const _pcm = {};
function loadPcm(key) {
  if (_pcm[key]) return _pcm[key];
  const f = path.join(SFX_DIR, key + '.wav');
  if (!fs.existsSync(f)) return null;
  const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', f, '-f', 'f32le', '-ac', '2', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
  return (_pcm[key] = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4));
}

// The game's master SFX volume is 0.35; undo it so the clip sits near full
// scale and the edit decides the final level.
function mixSfx(events, secs, fps, file, gainScale = 1 / 0.35 * 0.55) {
  const n = Math.ceil(secs * SR);
  const L = new Float32Array(n), R = new Float32Array(n);
  for (const e of events) {
    const pcm = loadPcm(e.k); if (!pcm) continue;
    const at = Math.round(e.f / fps * SR), rate = e.r || 1, g = (e.g || 0) * gainScale;
    const gl = g * Math.min(1, 1 - (e.pan || 0)), gr = g * Math.min(1, 1 + (e.pan || 0));
    const len = Math.floor((pcm.length / 2 - 1) / rate);
    for (let i = 0; i < len && at + i < n; i++) {
      const p = i * rate, a = Math.floor(p), t = p - a;
      L[at + i] += (pcm[a * 2] * (1 - t) + pcm[a * 2 + 2] * t) * gl;
      R[at + i] += (pcm[a * 2 + 1] * (1 - t) + pcm[a * 2 + 3] * t) * gr;
    }
  }
  writeWav(file, L, R);
}

function writeWav(file, L, R) {
  const n = L.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28);
  b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  // Soft clip: dense fights stack many hits on one frame.
  const sc = x => Math.tanh(x * 1.1) / 1.1;
  for (let i = 0; i < n; i++) {
    b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(sc(L[i]) * 32767))), 44 + i * 4);
    b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(sc(R[i]) * 32767))), 46 + i * 4);
  }
  fs.writeFileSync(file, b);
}

module.exports = { hookAudio, record, mixSfx, writeWav, loadPcm, ROOT, SR };
