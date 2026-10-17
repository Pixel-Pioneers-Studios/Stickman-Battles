'use strict';
// "The 94": the story scene where the dead bearers stand behind Kael (registry
// id 16), captured as a clean clip. The scene plays untouched; only in this
// capture page are its words, speech bubbles and buttons left undrawn, and the
// frame is punched in on Kael and the ghosts.
//   node bearers.js   -> work/land/bearers.mov
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const { launch } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'harness.js'));
const { mixSfx } = require('./lib/recorder');

const W = 1920, H = 1080, FPS = 60;
const ID = 16, FROM = 740, FRAMES = 360;           // the ghosts are on screen about f760 to f1100
const CAM = { z: 1.5, cx: 0.22, cy: 0.6 };

(async () => {
  const g = await launch({ width: W, height: H, offline: true, port: 8178 });
  try {
    await g.eval(() => { try { tutorialActive = false; backToMenu(); } catch (e) {} });
    await g.manual();
    await g.eval(() => {
      performance.now = () => window.__t;
      const P = CanvasRenderingContext2D.prototype, fill = P.fill, stroke = P.stroke, fillText = P.fillText, strokeText = P.strokeText;
      const isScene = c => c.canvas.style && c.canvas.style.zIndex === '9100';
      // The speech bubble is the scene's only fill in this exact colour; its outline stroke follows it.
      P.fill = function () {
        if (isScene(this) && String(this.fillStyle).replace(/\s/g, '') === 'rgba(4,2,18,0.93)') { this.__skipStroke = true; return; }
        return fill.apply(this, arguments);
      };
      P.stroke = function () { if (this.__skipStroke) { this.__skipStroke = false; return; } return stroke.apply(this, arguments); };
      P.fillText = function () { if (isScene(this)) return; return fillText.apply(this, arguments); };
      P.strokeText = function () { if (isScene(this)) return; return strokeText.apply(this, arguments); };
    });
    const ok = await g.eval(id => {
      const ch = STORY_CHAPTER_REGISTRY.find(c => c.id === id);
      const lines = ch && (ch.narrative || ch.lines || ch.text);
      if (!lines) return false;
      showNarrativeScene(lines, ch, () => {}, { cinematic: true, holdLastBeat: true });
      return true;
    }, ID);
    if (!ok) throw new Error('no narrative for id ' + ID);
    await g.step(FROM);

    const outBase = path.join(__dirname, 'work', 'land', 'bearers'), tmpVid = outBase + '.video.mp4';
    fs.mkdirSync(path.dirname(outBase), { recursive: true });
    const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '13', '-pix_fmt', 'yuv420p', tmpVid], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
    for (let f = 0; f < FRAMES; f++) {
      await g.step(1);
      const url = await g.eval((W, H, cam) => {
        const cs = [...document.querySelectorAll('canvas')].filter(c => c.style.zIndex === '9100');
        const src = cs[cs.length - 1]; if (!src) return null;
        const o = window.__bo || (window.__bo = document.createElement('canvas'));
        o.width = W; o.height = H;
        const vw = src.width / cam.z, vh = src.height / cam.z;
        const x0 = Math.max(0, Math.min(src.width - vw, cam.cx * src.width - vw / 2));
        const y0 = Math.max(0, Math.min(src.height - vh, cam.cy * src.height - vh / 2));
        const k = o.getContext('2d'); k.imageSmoothingQuality = 'high';
        k.drawImage(src, x0, y0, vw, vh, 0, 0, W, H);
        return o.toDataURL('image/jpeg', 0.95);
      }, W, H, CAM);
      if (!url) throw new Error('scene ended at frame ' + (FROM + f));
      if (!ff.stdin.write(Buffer.from(url.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await done;
    mixSfx([], FRAMES / FPS + 1.5, FPS, outBase + '.wav');
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmpVid, '-i', outBase + '.wav', '-c:v', 'copy', '-c:a', 'pcm_s16le', outBase + '.mov']);
    fs.rmSync(tmpVid);
    fs.writeFileSync(outBase + '.json', JSON.stringify({ fps: FPS, frames: FRAMES, log: [], sfx: [], from: FROM }));
    console.log(outBase + '.mov', FRAMES, 'frames', g.errors.slice(0, 3).join(' | '));
  } finally {
    await Promise.race([g.close(), new Promise(r => setTimeout(r, 3000))]);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
