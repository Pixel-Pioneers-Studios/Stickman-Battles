'use strict';
// "Kael vs Sovereign": a long-form staged fight, shot by shot in the real game (moves.js method, landscape).
//
//   node film/run.js capture <shot> [draft|land]   → work/<profile>/film-<shot>.mov (+ .json log)
//   node film/run.js still <shot> <frame,frame,...> [draft|land]   → work/<profile>/film-<shot>-<f>.png
//   node film/run.js list
//
// A shot is film/shots/<name>.js exporting { arena, frames, match, install(H), tick(H) }. install and tick run
// in the page (they are sent as source), so they may only use game globals and the helpers in H.
// The director places the bodies, poses them (CinPerf) and drives the camera; the bodies, weapons, arena,
// particles and hit effects are the game's own.
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record, mixSfx } = require('../lib/recorder');
const { execFileSync } = require('child_process');

const PROFILES = {
  draft: { width: 960, height: 540, cropW: 0, port: 8196 },
  land: { width: 1920, height: 1080, cropW: 0, port: 8198 },
  // Thumbnail stills: twice 720p, so a 1280x720 crop is native resolution.
  big: { width: 2560, height: 1440, cropW: 0, port: 8199 },
};
const FPS = 60;
const SHOTS = path.join(__dirname, 'shots');

// No HUD, numbers, plates, banners or taunts (moves.js), and the match never ends on its own.
const quiet = s => s.eval(() => {
  window.endGame = function () {};
  settings.autoPerf = false;
  if (typeof _performanceModeActive !== 'undefined' && _performanceModeActive) togglePerformanceMode(true);
  settings.particles = true;
  window.drawStorySubtitle = () => {}; window.drawTutorial = () => {}; window.drawObjectiveHUD = () => {};
  window.drawEdgeIndicators = () => {}; window.drawHitEffectivenessHUD = () => {};
  window.drawMatchAnnouncer = () => {}; window._drawAnnouncer = () => {};
  window.drawAchievementPopups = () => {}; window.drawAbilityUnlockToast = () => {};
  window.showBossDialogue = () => {}; window.drawBossDialogue = () => {};
  settings.dmgNumbers = false;
  DamageText.prototype.draw = () => {};
  window.drawEntityOverlays = () => {};
  Object.defineProperty(Fighter.prototype, 'superFlashTimer', { get: () => 0, set() {}, configurable: true });
  for (const p of players) if (p) delete p.superFlashTimer;
  const hud = document.getElementById('hud'); if (hud) hud.style.display = 'none';
  if (typeof DomainManager !== 'undefined') DomainManager.drawSpeechBubbles = () => {};
  window.__texts = [];
  const logText = (kind, text) => window.__texts.push({ f: window.__dir ? window.__dir.f : -1, kind, text });
  window._finTitle = (c, text) => logText('fintitle', text);
  window._finSubtitle = (c, text) => logText('finsub', text);
  CinFX.nameCard = (text) => logText('card', text);
  window.queueAnnouncement = (text) => logText('line', text);
});

// Per-frame helpers, installed in the page as window.__H.
function helpersInstall() {
  const D = window.__dir = { f: 0, t: 0, log: {}, under: [], over: [], screen: [] };
  const H = window.__H = {
    D,
    floor() { return currentArena.platforms.filter(pl => pl.isFloor && !pl.isFloorDisabled).sort((a, b) => b.w - a.w)[0]; },
    snap(x, y, z) { CinCam.snap(x, y, z); camZoomCur = z; camXCur = x; camYCur = y; },
    cam(x, y, z, snap) { if (snap) H.snap(x, y, z); else CinCam.setFocus(x, y, z); },
    noTraffic() {
      if (typeof forestBeastCooldown !== 'undefined') forestBeastCooldown = 99999;
      if (typeof yetiCooldown !== 'undefined') yetiCooldown = 99999;
      if (typeof mapPerkState !== 'undefined') { if (mapPerkState.cityCars) mapPerkState.cityCars.length = 0; if (mapPerkState.cars) mapPerkState.cars.length = 0; }
      if (typeof mapItems !== 'undefined') mapItems.length = 0;
    },
    // Feet at (x, y).
    place(p, x, y, facing) { p.x = x - p.w / 2; p.y = y - p.h; p.vx = 0; p.vy = 0; p.onGround = y >= D.G - 0.5; if (facing) p.facing = facing; },
    ease(u) { u = Math.max(0, Math.min(1, u)); return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; },
    // Keys [sec, a, b, ...] eased (inOutQuad, or a 'lin'/'out'/'in' string as the last element of the TO key).
    at(keys, s) {
      let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= s) i++;
      const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
      const n = a.length - (typeof a[a.length - 1] === 'string' ? 1 : 0);
      if (a === b || s <= a[0]) return a.slice(1, n);
      const mode = typeof b[b.length - 1] === 'string' ? b[b.length - 1] : 'io';
      let u = Math.max(0, Math.min(1, (s - a[0]) / (b[0] - a[0])));
      u = mode === 'lin' ? u : mode === 'out' ? 1 - (1 - u) * (1 - u) * (1 - u) : mode === 'in' ? u * u * u : mode === 'hold' ? 0 : H.ease(u);
      const o = []; for (let k = 1; k < n; k++) o.push(a[k] + (b[k] - a[k]) * u);
      return o;
    },
    // CinPerf poses driven by the director. beats: [{at, pose, ease, hold}] in seconds from now.
    pose(p, beats, glow) {
      CinPerf.begin(p, 'cutscene', { frames: 100000, glow: !!glow, color: p.color, track: CinPerf._trackFromBeats(beats) });
      (D.perf || (D.perf = new Map())).set(p, 0);
    },
    unpose(p) { if (p._cinPerf) CinPerf.end(p); if (D.perf) D.perf.delete(p); },
    tickPoses() { if (D.perf) for (const [p, n] of D.perf) { if (p._cinPerf) { D.perf.set(p, n + 1); CinPerf.tick(p, n + 1); } else D.perf.delete(p); } },
    // The posed skeleton of p this frame (world space), or null.
    joints(p) {
      const rec = p._cinPerf; if (!rec || typeof CinRig === 'undefined') return null;
      const pose = rec.track.sample(rec.frame);
      pose.x = p.cx(); pose.y = p.y + p.h; pose.facing = p.facing || 1;
      pose.scale = (pose.scale || 1) * 0.9 * (p.drawScale || 1); pose.headScale = (pose.headScale || 1) * 0.77;
      return CinRig.joints(pose);
    },
    once(k, sec) { if (D.f === Math.round(sec * 60)) { D.log[k] = D.f; return true; } return false; },
    hit(x, y, n, col, ring) {
      spawnParticles(x, y, col || '#ffe9a0', n); spawnParticles(x, y, '#ffffff', Math.round(n / 2));
      if (ring && CinFX.shockwave) CinFX.shockwave(x, y, '#ffffff', { count: 2, maxR: ring, lw: 6, dur: 20 });
    },
    dust(x, y, n, spread, opts) {
      const o = opts || {};
      for (let i = 0; i < n; i++) {
        const k = n > 1 ? i / (n - 1) - 0.5 : 0;
        (D.dustP || (D.dustP = [])).push({ f: D.f + (i % 3), x: x + k * spread, y: y - 4, vx: k * (o.v || 1.6), vy: 0.3 + (i % 4) * 0.12,
          r: (o.r || 10) + (i % 3) * 3, life: (o.life || 40) + (i % 5) * 6, a: o.a || 0.5, c: o.c || (i % 2 ? '#a89478' : '#7a6a58') });
      }
    },
    shake(n) { screenShake = Math.max(screenShake, n); },
    slow(v) { slowMotion = v; },
    recover(rate) { if (slowMotion < 1) slowMotion = Math.min(1, slowMotion + rate); },
  };
  // World-space layers under and over the fighters: wrap the first fighter's draw (under) and the last one's (over).
  const ps = players.filter(Boolean), first = ps[0], last = ps[ps.length - 1];
  const dU = first.draw.bind(first), dO = last.draw.bind(last);
  first.draw = function () { for (const fn of D.under) { ctx.save(); try { fn(ctx); } finally { ctx.restore(); } } dU(); };
  last.draw = function () {
    dO();
    ctx.save();
    for (const d of D.dustP || []) {
      const age = D.f - d.f; if (age < 0 || age > d.life) continue;
      const k = age / d.life;
      ctx.globalAlpha = (1 - k) * d.a; ctx.fillStyle = d.c;
      ctx.beginPath(); ctx.arc(d.x + d.vx * age, d.y - d.vy * age, d.r * (0.6 + k * 1.6), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    for (const fn of D.over) { ctx.save(); try { fn(ctx); } finally { ctx.restore(); } }
  };
  // Screen-space layer (grades, flashes, letterbox) after the whole frame.
  window.__screenFx = () => { for (const fn of D.screen) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); try { fn(ctx, canvas.width, canvas.height); } finally { ctx.restore(); } } };
}

function loadShot(name) {
  const file = path.join(SHOTS, name + '.js');
  if (!fs.existsSync(file)) throw new Error('no shot ' + file);
  delete require.cache[require.resolve(file)];
  return require(file);
}

async function setupShot(name, prof) {
  const sc = loadShot(name);
  const s = await openSession({ width: prof.width, height: prof.height, port: Number(process.env.PORT) || prof.port });
  await hookAudio(s);
  await s.startMatch(Object.assign({ mode: '2p', arena: process.env.ARENA || sc.arena, p1Bot: false, p2Bot: false, settleMs: 6000,
    p1: 'katana', p1Class: 'none', p1Color: '#00d4ff', p2: 'nullblade', p2Class: 'none', p2Color: '#ff3311' }, sc.match || {}));
  // startGame's spawn timers can still swap the fighters after the settle (seen under parallel load):
  // wait until the same fighter objects survive a full second.
  for (let i = 0; i < 20; i++) {
    const ok = await s.eval(() => { const was = window.__pid; window.__pid = players[0]; return gameRunning && players.length >= 2 && was === players[0]; });
    if (ok && i > 0) break;
    await s.wait(1000);
  }
  await quiet(s);
  const libSrc = fs.readFileSync(path.join(__dirname, 'poses.js'), 'utf8') + '\n;window.FILM_POSES_DEFINE = FILM_POSES_DEFINE;\n' + fs.readFileSync(path.join(__dirname, 'lib.js'), 'utf8') +
    '\n' + fs.readFileSync(path.join(__dirname, 'creator.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, 'cosmic.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, 'sovereign.js'), 'utf8');
  await s.eval((hInst, inst, tick, env, libSrc, endC) => {
    window.__ENV = env;
    (new Function('return (' + hInst + ')'))()();
    const H = window.__H;
    H.D.G = H.floor().y;
    for (const p of players) { p.isAI = false; p.cooldown = 99; p.abilityCooldown = 99; p.superMeter = 0; }
    if (players[1] && WEAPONS.nullblade && !(env.P2W)) { players[1].weapon = WEAPONS.nullblade; players[1].weaponKey = 'nullblade'; }
    (new Function(libSrc))();
    window.__endC = endC;
    (new Function('return (' + inst + ')'))()(H);
    const t = new Function('return (' + tick + ')')();
    const orig = window.__step;
    window.__step = function (n) {
      for (let i = 0; i < n; i++) {
        if (window.__manual) {
          H.D.f++; H.D.t++; H.noTraffic();
          for (const p of players) if (p) { if (!H.D.free) { p.cooldown = 99; p.abilityCooldown = 99; p.superMeter = 0; } if (!H.D.hurt) { p.health = p.maxHealth; p.invincible = 0; } }
          try { t(H); } catch (e) { (H.D.log.err || (H.D.log.err = [])).length < 3 && H.D.log.err.push('tick ' + H.D.f + ': ' + e.message); }
          H.tickPoses();
        }
        orig(1);
        if (window.__screenFx) window.__screenFx();
      }
    };
  }, helpersInstall.toString(), sc.install.toString(), sc.tick.toString(),
    Object.fromEntries(Object.entries(process.env).filter(([k]) => k.startsWith('F_')).map(([k, v]) => [k.slice(2), isNaN(+v) ? v : +v])), libSrc, sc.endC);
  return { s, sc };
}

const probe = () => {
  const D = window.__dir || {}, p1 = players[0], p2 = players[1];
  return { f: D.f, x1: Math.round(p1.cx()), y1: Math.round(p1.y + p1.h), x2: Math.round(p2.cx()), y2: Math.round(p2.y + p2.h),
    fin: activeFinisher ? 1 : 0, z: +camZoomCur.toFixed(2), sm: +slowMotion.toFixed(2) };
};

(async () => {
  const cmd = process.argv[2] || 'list';
  if (cmd === 'list') { console.log(fs.readdirSync(SHOTS).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)).join('\n')); return; }
  const name = process.argv[3];
  if (cmd === 'still') {
    // Frames, or choreography times as cN (e.g. c2.5): the first frame at or past that time.
    const frames = String(process.argv[4] || '0').split(',');
    const profName = process.argv[5] || 'draft', prof = PROFILES[profName];
    const { s } = await setupShot(name, prof);
    const dir = path.join(__dirname, '..', 'work', profName); fs.mkdirSync(dir, { recursive: true });
    await s.manual();
    let at = 0;
    for (const f of frames) {
      if (f[0] === 'c') { const tc = Number(f.slice(1)); while (await s.eval(() => window.__dir.c) < tc - 1e-6) { await s.step(1); at++; } }
      else if (+f > at) { await s.step(+f - at); at = +f; }
      const url = await s.eval(() => canvas.toDataURL('image/png'));
      const out = path.join(dir, 'film-' + name + (process.env.TAG ? '-' + process.env.TAG : '') + '-' + f + '.png');
      fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
      console.log(out, JSON.stringify(await s.eval(() => ({ c: +(window.__dir.c || 0).toFixed(2), f: window.__dir.f, cam: [Math.round(camXCur), Math.round(camYCur), +camZoomCur.toFixed(2)], cin: !!activeCinematic, isc: !!isCinematic, sm: slowMotion, fin: !!activeFinisher, fcam: window.FILM && FILM.cam, fx: window.FILM && FILM.fx && FILM.fx.map(f => f.t).join(','), np: window.FILM && FILM.parts && FILM.parts.length, err: window.__dir.log.err }))));
    }
    if (frames.length > 1) {
      // Contact sheet: 4 across, each frame labelled with its number.
      const files = frames.map(f => path.join(dir, 'film-' + name + (process.env.TAG ? '-' + process.env.TAG : '') + '-' + f + '.png'));
      const cols = 4, rows = Math.ceil(files.length / cols), tw = 480;
      const ins = files.flatMap(f => ['-i', f]);
      const lab = files.map((f, i) => `[${i}]scale=${tw}:-1[v${i}]`).join(';');
      const pad = Array.from({ length: rows * cols - files.length }, (_, i) => `color=black:s=${tw}x${Math.round(tw * 9 / 16)}[p${i}]`).join(';');
      const all = files.map((_, i) => `[v${i}]`).join('') + Array.from({ length: rows * cols - files.length }, (_, i) => `[p${i}]`).join('');
      const layout = Array.from({ length: rows * cols }, (_, i) => `${(i % cols) * tw}_${Math.floor(i / cols) * Math.round(tw * 9 / 16)}`).join('|');
      const sheet = path.join(dir, 'film-' + name + (process.env.TAG ? '-' + process.env.TAG : '') + '-sheet.jpg');
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...ins, '-filter_complex', lab + (pad ? ';' + pad : '') + ';' + all + `xstack=inputs=${rows * cols}:layout=${layout}`, '-frames:v', '1', sheet]);
      console.log('sheet', sheet);
    }
    console.log('log', JSON.stringify(await s.eval(() => window.__dir.log)));
    console.log('state', JSON.stringify(await s.eval(() => ({ run: gameRunning, mode: gameMode, arena: currentArenaKey, n: players.length, w: players.map(p => p.weaponKey), d: players.map(p => String(p.draw).slice(0, 40)), manual: window.__manual, f: window.__dir.f }))));
    console.log('errors', s.errors.slice(0, 5).join(' | '));
    process.exit(0);
  }
  if (cmd === 'times') {
    // Real frame at which the choreography clock reaches each listed time: node film/run.js times <shot> 0.86,6.0
    const { s } = await setupShot(name, PROFILES.draft);
    await s.manual();
    const ts = String(process.argv[4]).split(',').map(Number);
    const out = await s.eval(ts => { const o = []; let k = 0; for (const t of ts) { while (window.__dir.c < t - 1e-6 && k < 20000) { window.__step(1); k++; } o.push([t, k]); } return o; }, ts);
    console.log('times', JSON.stringify(out));
    process.exit(0);
  }
  if (cmd === 'audit') {
    // The motion and contact pass: walks the choreography without drawing and reports, per actor, feet through the floor,
    // standing feet in the air, joints jumping more than a body can travel in a frame (blinks are listed in the shot's
    // `blinks`), the first and last pose (to compare across a cut) and any blow that missed.
    const { s } = await setupShot(name, PROFILES.draft);
    const r = await s.eval(() => {
      const L = FILM, end = L.spec.ends || window.__endC, out = { actors: {}, miss: L.D.log.miss || [], blows: L.D.log.blows };
      const dt = 1 / 60, keys = ['hip', 'head', 'rHand', 'lHand', 'rFoot', 'lFoot'];
      for (const key in L.actors) {
        const a = L.actors[key], o = out.actors[key] = { through: [], hover: [], jump: [] };
        let prev = null;
        for (let c = 0; c <= end + 1e-6; c += dt) {
          const J = L.joints(key, c), st = L.state(a, c), low = Math.max(J.rFoot.y, J.lFoot.y);
          if (st.hidden) { prev = null; continue; }
          if (low > L.G + 4 && !(a.below && c >= a.below[0] && c <= a.below[1])) o.through.push([+c.toFixed(2), Math.round(low - L.G)]);
          if (st.h < 0.5 && low < L.G - 4 && !st.q.rot) o.hover.push([+c.toFixed(2), Math.round(L.G - low)]);
          if (prev) for (const k of keys) {
            const d = Math.hypot(J[k].x - prev[k].x, J[k].y - prev[k].y);
            if (d > 30 && !(a.blinks || []).some(b => Math.abs(b - c) < 0.04)) { o.jump.push([+c.toFixed(2), k, Math.round(d)]); break; }
          }
          prev = {}; for (const k of keys) prev[k] = { x: J[k].x, y: J[k].y };
        }
        const pt = (c) => { const J = L.joints(key, c), st = L.state(a, c); return { x: Math.round(st.x), h: Math.round(st.h), face: st.face, hip: [Math.round(J.hip.x), Math.round(L.G - J.hip.y)], hand: [Math.round(J.rHand.x), Math.round(L.G - J.rHand.y)] }; };
        o.first = pt(0); o.last = pt(end);
        const zip = (x) => { const m = x.length; return m > 12 ? x.slice(0, 6).concat(['... ' + m + ' total']).concat(x.slice(-3)) : x; };
        o.through = zip(o.through); o.hover = zip(o.hover); o.jump = zip(o.jump);
      }
      return out;
    });
    console.log(JSON.stringify(r));
    console.log('errors', s.errors.slice(0, 5).join(' | '));
    process.exit(0);
  }
  if (cmd === 'evalfile') {
    // Run a page-side measuring script against a shot: node film/run.js evalfile <shot> <file.js>
    const { s } = await setupShot(name, PROFILES.draft);
    console.log(JSON.stringify(await s.eval(new Function('src', 'return (new Function(src))()'), fs.readFileSync(process.argv[4], 'utf8'))));
    console.log('errors', s.errors.slice(0, 5).join(' | '));
    process.exit(0);
  }
  if (cmd === 'timemap') {
    // The choreography clock on every frame, for scoring to picture: work/timemap/<shot>.json
    const { s, sc } = await setupShot(name, PROFILES.draft);
    await s.manual();
    const cs = await s.eval(end => { const o = []; let k = 0; while (window.__dir.c < end && k < 20000) { window.__step(1); k++; o.push(+window.__dir.c.toFixed(4)); } return o; }, sc.endC);
    const dir = path.join(__dirname, '..', 'work', 'timemap'); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(cs));
    console.log('frames', cs.length);
    process.exit(0);
  }
  if (cmd === 'measure') {
    // Frames until the choreography clock reaches the shot's endC.
    const { s, sc } = await setupShot(name, PROFILES.draft);
    await s.manual();
    const n = await s.eval(end => { let k = 0; while (window.__dir.c < end && k < 20000) { window.__step(1); k++; } return k; }, sc.endC);
    console.log('frames', n);
    process.exit(0);
  }
  const profName = process.argv[4] || 'draft', prof = PROFILES[profName];
  if (cmd !== 'capture' || !prof) throw new Error('usage: node film/run.js capture <shot> [draft|land]');
  const { s, sc } = await setupShot(name, prof);
  const out = path.join(__dirname, '..', 'work', profName, 'film-' + name);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const { log } = await record(s, out, Number(process.env.FRAMES || sc.frames), { fps: FPS, probe, cropW: prof.cropW });
  const marks = await s.eval(() => Object.assign({ texts: window.__texts }, window.__dir.log));
  const j = JSON.parse(fs.readFileSync(out + '.json', 'utf8')); j.marks = marks;
  const cues = await s.eval(() => window.__dir.sfx || []);
  if (cues.length) {
    j.sfx = j.sfx.concat(cues).sort((a, b) => a.f - b.f);
    mixSfx(j.sfx, j.frames / FPS + 1.5, FPS, out + '.wav');
    const tmp = out + '.tmp.mov'; fs.renameSync(out + '.mov', tmp);
    // sc.silenceFrom (frame): a cut to black is silent too, so no effect rings on past it.
    const af = sc.silenceFrom ? ['-af', `afade=t=out:st=${(sc.silenceFrom / FPS).toFixed(3)}:d=0.03`] : [];
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', tmp, '-i', out + '.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', ...af, '-c:a', 'pcm_s16le', out + '.mov']);
    fs.rmSync(tmp);
  }
  if (sc.silenceFrom) j.silenceFrom = sc.silenceFrom;
  fs.writeFileSync(out + '.json', JSON.stringify(j));
  console.log('marks', JSON.stringify(marks));
  for (let i = 0; i < log.length; i += Number(process.env.EVERY || 60)) console.log(i, JSON.stringify(log[i]));
  console.log('errors', s.errors.slice(0, 5).join(' | '));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
