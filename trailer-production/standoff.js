'use strict';
// Kael (blue) and Sovereign (red) in a standoff across a chasm, drawn in the
// game page with the game's own art: the home screen's painted sky and cracked
// moon (js/smb-home-art.js) and FigureSkin figures. Poses are defined here;
// nothing in the game is changed.
//
//   node standoff.js                -> out/thumbnail-1920x1080.png + out/thumbnail-1280x720.jpg
//   node standoff.js hold           -> work/land/standoff.mov        held standoff, slow push-in (8 s)
//   node standoff.js close          -> work/land/standoff-close.mov  close on Kael (3 s)
//   node standoff.js charge         -> work/land/standoff-charge.mov both charge; last frame is the contact (3.33 s)
//
// The clips land beside the gameplay shots, with an empty sound log, so
// cuts.js uses them like any other shot.
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { openOverlay, BASE } = require('./lib/engine');
const { mixSfx } = require('./lib/recorder');

const W = 1920, H = 1080, FPS = 60;

// Runs in the page. Sets up window.__so.frame(f) -> data URL of frame f.
function setup(W, H, mode, FPS) {
  const POSES = {
    // Both crouched to lunge: weight loaded on the back leg, lead fist up,
    // rear fist chambered. Bare hands, so nothing competes with the figures.
    kael: {
      sh: [12, -30], head: [19, -43],
      nearArm: [[23, -24], [32, -33]], farArm: [[3, -17], [14, -21]],
      nearLeg: [[19, 6], [26, 26]],    farLeg: [[-11, 15], [-29, 26]],
    },
    // Sovereign: the same readiness, a touch taller and less coiled.
    sov: {
      sh: [9, -32], head: [15, -46],
      nearArm: [[21, -27], [30, -35]], farArm: [[1, -19], [11, -23]],
      nearLeg: [[18, 6], [27, 26]],    farLeg: [[-11, 14], [-27, 26]],
    },
    // The beat before the jump: lower, further forward.
    coil: {
      sh: [16, -26], head: [24, -38],
      nearArm: [[25, -19], [33, -27]], farArm: [[5, -13], [15, -17]],
      nearLeg: [[22, 10], [29, 26]],   farLeg: [[-13, 17], [-33, 26]],
    },
    // In the air: lead fist thrown straight out, legs trailing.
    strike: {
      sh: [16, -29], head: [24, -41],
      nearArm: [[31, -27], [47, -30]], farArm: [[3, -20], [-6, -13]],
      nearLeg: [[13, 9], [5, 25]],     farLeg: [[-19, 5], [-40, 11]],
    },
  };
  for (const k in POSES) POSES[k].wAng = 0;
  const mix = (a, b, k) => Array.isArray(a) ? a.map((v, i) => mix(v, b[i], k))
    : typeof a === 'number' ? a + (b - a) * k
    : Object.fromEntries(Object.keys(a).map(key => [key, mix(a[key], b[key], k)]));
  const pose = (name, a, b, k, breath) => {
    const p = mix(POSES[a], POSES[b], k);
    p.sh = [p.sh[0], p.sh[1] + breath]; p.head = [p.head[0], p.head[1] + breath * 1.15];
    p.nearArm = [[p.nearArm[0][0], p.nearArm[0][1] + breath * 0.6], [p.nearArm[1][0], p.nearArm[1][1] + breath * 0.5]];
    _HOME_ART_POSES[name] = p;
    return name;
  };
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  const lerp = (a, b, k) => a + (b - a) * k;

  // The scene is drawn larger than the frame so a push-in stays sharp.
  const SS = mode === 'close' ? 2.0 : mode === 'thumb' ? 1 : 1.4;
  const SW = Math.round(W * SS), SH = Math.round(H * SS), u = Math.min(SW, SH) / 900;
  const scene = document.createElement('canvas'); scene.width = SW; scene.height = SH;
  const ctx = scene.getContext('2d');
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const octx = out.getContext('2d');
  const sky = _homeArtBuildSky(SW, SH), clouds = _homeArtBuildClouds(SW, SH);

  const KAEL = '#00d4ff', SOV = '#ff4455';
  const kx = SW * 0.29, ky = SH * 0.655, sx = SW * 0.71, sy = SH * 0.625, fu = 3.0 * u, sovU = fu * 1.14;
  const groundK = ky + 27.2 * fu, groundS = sy + 27.2 * sovU;

  const rng = seed => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
  const r1 = rng(11), streaks = [], embers = [];
  for (let i = 0; i < 26; i++) streaks.push({ y: SH * (0.25 + r1() * 0.55), x: r1() * SW, len: (60 + r1() * 160) * u, a: 0.06 + r1() * 0.12, w: (0.8 + r1() * 1.4) * u, v: (2 + r1() * 4) * u });
  for (let i = 0; i < 70; i++) { const left = i % 2 === 0; embers.push({ left, x: left ? r1() * SW * 0.48 : SW * 0.52 + r1() * SW * 0.48, y: SH * (0.3 + r1() * 0.6), a: 0.25 + r1() * 0.6, r: (0.8 + r1() * 2.2) * u, v: (0.2 + r1() * 0.6) * u, ph: r1() * 6.28 }); }

  const wash = (x, y, r, rgb, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, SW, SH);
  };
  const cliff = (x0, x1, top, lipX, rgb, seed) => {
    const r = rng(seed);
    ctx.beginPath(); ctx.moveTo(x0, SH);
    ctx.lineTo(x0, top + 6 * u);
    for (let x = x0; x <= lipX; x += 22 * u) ctx.lineTo(x, top + (r() - 0.5) * 6 * u);
    ctx.lineTo(lipX + 14 * u, top + 10 * u);
    ctx.lineTo(lipX + (x1 - lipX) * 0.45, top + 70 * u);
    ctx.lineTo(lipX + (x1 - lipX) * 0.30, top + 150 * u);
    ctx.lineTo(x1, SH);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, SH);
    g.addColorStop(0, '#1a1024'); g.addColorStop(1, '#07040c');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.strokeStyle = `rgba(${rgb},0.75)`; ctx.lineWidth = 2.2 * u;
    ctx.shadowColor = `rgb(${rgb})`; ctx.shadowBlur = 14 * u;
    ctx.beginPath(); ctx.moveTo(x0, top + 2 * u); ctx.lineTo(lipX + 14 * u, top + 10 * u); ctx.stroke();
    ctx.restore();
  };

  // Where everything is on frame f. Poses are written into _HOME_ART_POSES
  // slots ('_k', '_s'), so call this right before drawing the figures.
  function state(f) {
    const t = 2.4 + f / FPS;
    const st = {
      t, k: { x: kx, y: ky, pose: pose('_k', 'kael', 'kael', 0, Math.sin(t * 2.1) * 0.8), rot: 0 },
      s: { x: sx, y: sy, pose: pose('_s', 'sov', 'sov', 0, Math.sin(t * 1.7 + 1.3) * 0.7), rot: 0 },
      cam: { z: 1, cx: 0.5, cy: 0.5 }, ghosts: 0, speed: 0,
    };
    if (mode === 'hold') st.cam = { z: lerp(1.0, 1.10, ease(f / 480)), cx: 0.5, cy: 0.56 };
    if (mode === 'close') st.cam = { z: lerp(1.85, 2.0, ease(f / 180)), cx: 0.27, cy: 0.62 };
    if (mode === 'charge') {
      const zHold = lerp(1.0, 1.06, ease(f / 120));
      st.cam = { z: zHold, cx: 0.5, cy: 0.56 };
      if (f >= 90) {
        const k = ease((f - 90) / 30);
        st.k.pose = pose('_k', 'kael', 'coil', k, 0); st.s.pose = pose('_s', 'sov', 'coil', k, 0);
      }
      if (f >= 120) {
        const p = Math.min(1, (f - 120) / 79), pe = Math.pow(p, 0.85);
        const meetY = (ky + sy) / 2 - 30 * u, lift = Math.sin(Math.PI * Math.min(1, p * 1.15)) * 55 * u;
        // Lead fists meet at the centre on the last frame.
        const kEnd = SW / 2 - 47 * fu, sEnd = SW / 2 + 47 * sovU;
        st.k.x = lerp(kx, kEnd, pe); st.k.y = lerp(ky, meetY, pe) - lift;
        st.s.x = lerp(sx, sEnd, pe); st.s.y = lerp(sy, meetY, pe) - lift;
        const kp = ease(p / 0.3);
        st.k.pose = pose('_k', 'coil', 'strike', kp, 0); st.s.pose = pose('_s', 'coil', 'strike', kp, 0);
        st.k.rot = -0.12 * kp; st.s.rot = -0.12 * kp;
        st.ghosts = Math.min(1, p * 3); st.speed = Math.min(1, p * 2.5);
        st.cam = { z: lerp(zHold, 1.42, ease(p)), cx: 0.5, cy: lerp(0.56, (meetY - 40 * u) / SH, ease(p)) };
      }
    }
    return st;
  }

  function fighter(o, who, alpha, glow, t) {
    const isK = who === 'k';
    _homeArtFighter(ctx, o.x, o.y, { u: isK ? fu : sovU, face: isK ? 1 : -1, pose: o.pose, rot: o.rot,
      color: isK ? KAEL : SOV, scarf: isK, glow, t, alpha });
  }

  function draw(f) {
    let st = state(f);
    const t = st.t;
    ctx.drawImage(sky, 0, 0);
    _homeArtShards(ctx, SW, SH, t);
    const cxo = -((t * 5 * u + SW * 0.2) % SW);
    ctx.save(); ctx.globalAlpha = 0.7; ctx.drawImage(clouds, cxo, 0); ctx.drawImage(clouds, cxo + SW, 0); ctx.restore();

    ctx.save(); ctx.globalCompositeOperation = 'screen';
    wash(kx, ky - 120 * u, 520 * u, '0,150,255', 0.42);
    wash(sx, sy - 120 * u, 520 * u, '255,40,60', 0.44);
    ctx.restore();

    const mist = ctx.createLinearGradient(0, SH * 0.70, 0, SH);
    mist.addColorStop(0, 'rgba(226,128,90,0)'); mist.addColorStop(1, 'rgba(120,60,90,0.55)');
    ctx.fillStyle = mist; ctx.fillRect(SW * 0.3, SH * 0.70, SW * 0.4, SH * 0.3);
    ctx.save(); ctx.scale(-1, 1); cliff(-SW, -SW * 0.565, groundS, -SW * 0.62, '255,68,85', 7); ctx.restore();
    cliff(0, SW * 0.435, groundK, SW * 0.38, '0,212,255', 3);

    ctx.save(); ctx.lineCap = 'round';
    const dt = f;
    for (const s of streaks) {
      const x = ((s.x + s.v * dt * (1 + st.speed * 3)) % (SW + s.len)) - s.len, y = s.y;
      const g = ctx.createLinearGradient(x, y, x + s.len, y - s.len * 0.08);
      g.addColorStop(0, 'rgba(255,230,210,0)'); g.addColorStop(1, `rgba(255,230,210,${Math.min(0.5, s.a * (1 + st.speed)).toFixed(3)})`);
      ctx.strokeStyle = g; ctx.lineWidth = s.w;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s.len, y - s.len * 0.08); ctx.stroke();
    }
    for (const e of embers) {
      const y = SH * 0.3 + (((e.y - SH * 0.3) - e.v * dt) % (SH * 0.6) + SH * 0.6) % (SH * 0.6);
      const x = e.x + Math.sin(dt * 0.02 + e.ph) * 6 * u;
      ctx.fillStyle = e.left ? `rgba(120,220,255,${e.a.toFixed(2)})` : `rgba(255,110,90,${e.a.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(x, y, e.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Afterimages along each fighter's path during the charge.
    if (st.ghosts > 0) {
      for (let g = 3; g >= 1; g--) {
        const back = state(Math.max(120, f - g * 5));
        fighter(back.k, 'k', 0.10 * (4 - g) * st.ghosts, 0, t);
        fighter(back.s, 's', 0.10 * (4 - g) * st.ghosts, 0, t);
      }
      st = state(f);
    }
    fighter(st.k, 'k', 1, 18, t);
    fighter(st.s, 's', 1, 18, t);

    if (mode === 'thumb') {
      const fade = ctx.createLinearGradient(0, SH * 0.72, 0, SH);
      fade.addColorStop(0, 'rgba(4,2,10,0)'); fade.addColorStop(1, 'rgba(4,2,10,0.7)');
      ctx.fillStyle = fade; ctx.fillRect(0, SH * 0.72, SW, SH * 0.28);
    }

    const c = st.cam, vw = SW / c.z, vh = SH / c.z;
    const x0 = Math.max(0, Math.min(SW - vw, c.cx * SW - vw / 2)), y0 = Math.max(0, Math.min(SH - vh, c.cy * SH - vh / 2));
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(scene, x0, y0, vw, vh, 0, 0, W, H);
  }

  window.__so = { frame(f, type, q) { draw(f); return out.toDataURL(type || 'image/jpeg', q || 0.95); } };
}

const CLIPS = { hold: 480, close: 180, charge: 200 };

(async () => {
  const mode = process.argv[2] || 'thumb';
  if (mode !== 'thumb' && !CLIPS[mode]) throw new Error('unknown mode ' + mode);
  const s = await openSession({ width: 1280, height: 720, port: 8176 });
  try {
    await s.page.waitForFunction(() => typeof _homeArtFighter === 'function' && typeof FigureSkin !== 'undefined', { timeout: 20000 });
    await s.eval(new Function('W', 'H', 'mode', 'FPS', '(' + setup.toString() + ')(W, H, mode, FPS)'), W, H, mode, FPS);

    if (mode === 'thumb') {
      const url = await s.eval(() => window.__so.frame(0, 'image/png'));
      const ov = await openOverlay(W, H);
      const items = [
        { type: 'vignette', a: 0.45 },
        { type: 'logo', from: 0, to: 9999, x: 0.5, y: 0.845, size: 104 },
      ];
      const png = await ov.page.evaluate((items, bg) => window.__drawOver(500, items, bg), items, url);
      await ov.close();
      const full = path.join(BASE, 'out', 'thumbnail-1920x1080.png');
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, Buffer.from(png.split(',')[1], 'base64'));
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', full, '-vf', 'scale=1280:720:flags=lanczos', '-q:v', '2', path.join(BASE, 'out', 'thumbnail-1280x720.jpg')]);
      console.log(full, s.errors.slice(0, 3).join(' | '));
    } else {
      const frames = CLIPS[mode];
      const name = mode === 'hold' ? 'standoff' : 'standoff-' + mode;
      const outBase = path.join(__dirname, 'work', 'land', name), tmpVid = outBase + '.video.mp4';
      fs.mkdirSync(path.dirname(outBase), { recursive: true });
      const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '13', '-pix_fmt', 'yuv420p', tmpVid], { stdio: ['pipe', 'inherit', 'inherit'] });
      const done = new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
      for (let f = 0; f < frames; f++) {
        const url = await s.eval(f => window.__so.frame(f), f);
        if (!ff.stdin.write(Buffer.from(url.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      }
      ff.stdin.end(); await done;
      mixSfx([], frames / FPS + 1.5, FPS, outBase + '.wav');
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmpVid, '-i', outBase + '.wav', '-c:v', 'copy', '-c:a', 'pcm_s16le', outBase + '.mov']);
      fs.rmSync(tmpVid);
      fs.writeFileSync(outBase + '.json', JSON.stringify({ fps: FPS, frames, log: [], sfx: [] }));
      console.log(outBase + '.mov', frames, 'frames', s.errors.slice(0, 3).join(' | '));
    }
  } finally {
    await Promise.race([s.close(), new Promise(r => setTimeout(r, 3000))]);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
