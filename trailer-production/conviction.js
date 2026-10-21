'use strict';
// Conviction Short: one staged scene, story-cinematic style, in the real game.
//
//   node conviction.js capture [draft|vert]   → work/<profile>/conviction.mov (+ .json log)
//
// Torren (P1) takes a heavy axe swing from Varek, is thrown into a wall and
// slumps there, bleeding. Varek walks in to finish it. Torren surges with
// lightning, fires his Super, and the Conviction (Storm Realm) is the game's
// own: rise cinematic, name card, domain, then the hammer's own finisher.
//
// Staged, not free play: the script places the fighters, amplifies the hit's
// knockback toward a wall prop (no arena has a wall at fighter height), poses
// the slump and the surge through CinPerf, and draws the arcs off the body.
// Everything after the surge (the Conviction rise, Storm Realm, Hero's
// Triumph) is the game's own code, triggered the way a 5th super triggers it.
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  draft: { width: 1707, height: 960, cropW: 540, port: 8174 },
  vert: { width: 3414, height: 1920, cropW: 1080, port: 8172 },
};
const FPS = 60;
const ARENA = process.env.ARENA || 'city';
const FRAMES = Number(process.env.FRAMES || 1100);

// Same capture hygiene as capture.js: no HUD, numbers, plates or tutorial text.
const quiet = s => s.eval(() => {
  settings.autoPerf = false;
  if (typeof _performanceModeActive !== 'undefined' && _performanceModeActive) togglePerformanceMode(true);
  settings.particles = true;
  window.drawStorySubtitle = () => {}; window.drawTutorial = () => {}; window.drawObjectiveHUD = () => {};
  window.drawEdgeIndicators = () => {}; window.drawHitEffectivenessHUD = () => {};
  window.drawMatchAnnouncer = () => {}; window._drawAnnouncer = () => {};
  window.drawAchievementPopups = () => {}; window.drawAbilityUnlockToast = () => {};
  settings.dmgNumbers = false;
  DamageText.prototype.draw = () => {};
  window.drawEntityOverlays = () => {};
  Object.defineProperty(Fighter.prototype, 'superFlashTimer', { get: () => 0, set() {}, configurable: true });
  for (const p of players) if (p) delete p.superFlashTimer;
  const hud = document.getElementById('hud'); if (hud) hud.style.display = 'none';
  // Finisher titles are drawn wider than the 9:16 crop; the edit re-sets them as captions.
  window.__finTitles = [];
  window._finTitle = function (c, text) { if (!window.__finTitles.includes(text)) window.__finTitles.push(text); };
  // The domain's over-head bubble, its centred name card and the quote line sit outside or
  // across the crop edge: logged by frame and set as captions in the edit instead.
  window.__texts = [];
  const logText = (kind, text) => window.__texts.push({ f: window.__dir ? window.__dir.f : -1, kind, text });
  DomainManager.drawSpeechBubbles = () => {};
  CinFX.nameCard = (text) => logText('card', text);
  window.queueAnnouncement = (text) => logText('line', text);
  window._finSubtitle = (c, text) => { if (!window.__texts.some(t => t.text === text)) logText('finsub', text); };
});

// ── The scene, run once per game frame before the game's own update ──────────
function directorInstall() {
  const D = window.__dir = { f: 0, phase: 'swing', t: 0, log: {} };
  const p1 = players[0], p2 = players[1];
  const fl = currentArena.platforms.filter(pl => !pl.isFloorDisabled).sort((a, b) => b.w - a.w)[0];
  D.floorY = fl.y;
  // The wall prop: a solid block the game's own collision and _wallSlam() treat as a wall.
  const wallR = fl.x + fl.w * 0.22;
  D.wall = { x: wallR - 46, y: fl.y - 320, w: 46, h: 320, isWallProp: true };
  currentArena.platforms.push(D.wall);
  D.wallR = wallR; D.stageR = Math.min(fl.x + fl.w - 160, wallR + 520);

  for (const p of players) {
    p.lives = 1; p.invincible = 0; p.vx = 0; p.vy = 0; p.onGround = true;
    p.target = p === p1 ? p2 : p1; p.y = fl.y - p.h;
  }
  p1.x = wallR + 200; p1.facing = 1;
  p2.x = p1.x + 62; p2.facing = -1;
  // Torren has been losing: low HP and the wounds that go with it (tier 3: blood drip).
  p1.health = 600; p1._damageAccumThisLife = 130; p1._lastHealthSeen = 600; p1.lives = 3;
  p2.health = p2.maxHealth;
  p1.superMeter = 0; p1.superReady = false;
  p1._domainSuperCount = 4;   // four supers landed earlier in the fight: the next is the Conviction

  CinCam.snap((p1.cx() + p2.cx()) / 2, p1.cy() - 6, 2.3);
  // The wall (behind Torren) and the electric arcs off his body during the surge,
  // both drawn in world space from his draw call.
  const d1 = p1.draw.bind(p1);
  p1.draw = function () {
    const w = D.wall;
    ctx.save();
    const g = ctx.createLinearGradient(w.x, 0, w.x + w.w, 0);
    g.addColorStop(0, '#15161d'); g.addColorStop(1, '#2a2c38');
    ctx.fillStyle = g; ctx.fillRect(w.x - 400, w.y, w.w + 400, w.h);
    ctx.fillStyle = 'rgba(160,170,200,0.35)'; ctx.fillRect(w.x + w.w - 2, w.y, 2, w.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    for (let y = w.y + 34; y < w.y + w.h; y += 34) { ctx.beginPath(); ctx.moveTo(w.x - 400, y); ctx.lineTo(w.x + w.w, y); ctx.stroke(); }
    if (D.crack) {
      // Cracks radiating from the impact point on the wall face.
      ctx.strokeStyle = 'rgba(8,8,12,0.9)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      for (const c of D.crack) { ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); for (const q of c) ctx.lineTo(q[0], q[1]); ctx.stroke(); }
    }
    ctx.restore();
    d1();
    // Blood trickling from the scalp down his face while he is down. The game's own
    // wound drip (tier 3) is a 2px bead, invisible at phone size; this rides the same
    // posed head the rig just drew.
    const rec = p1._cinPerf;
    if (rec && D.bleedT !== undefined && typeof CinRig !== 'undefined') {
      const pose = rec.track.sample(rec.frame);
      pose.x = p1.cx(); pose.y = p1.y + p1.h; pose.facing = p1.facing || 1;
      pose.scale = (pose.scale || 1) * 0.9 * (p1.drawScale || 1); pose.headScale = (pose.headScale || 1) * 0.77;
      const J = CinRig.joints(pose), R = J.headR, fc = pose.facing;
      const grow = Math.min(1, D.bleedT / 70);
      const x0 = J.head.x + fc * R * 0.35, y0 = J.head.y - R * 0.55;
      const len = R * (0.6 + grow * 2.4);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(150,0,8,0.95)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x0 + fc * R * 0.25, y0 + len * 0.5, x0 + fc * R * 0.12, y0 + len); ctx.stroke();
      ctx.fillStyle = '#c80810';
      ctx.beginPath(); ctx.arc(x0 + fc * R * 0.12, y0 + len, 1.25, 0, Math.PI * 2); ctx.fill();
      // A drop now and then.
      const ph = D.bleedT % 46;
      if (grow >= 1 && ph < 26) {
        ctx.beginPath(); ctx.arc(x0 + fc * R * 0.12, y0 + len + ph * ph * 0.06, 1.0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    const a = D.arcs || 0;
    if (a <= 0) return;
    const cx = p1.cx(), cy = p1.cy();
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const n = Math.round(3 + a * 6);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const len = 26 + Math.random() * 70 * a;
      let x = cx + Math.cos(ang) * 8, y = cy + Math.sin(ang) * 18;
      const segs = 5;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 1; k <= segs; k++) {
        const r = len * k / segs;
        x = cx + Math.cos(ang) * r + (Math.random() - 0.5) * 14;
        y = cy + Math.sin(ang) * r * 1.1 + (Math.random() - 0.5) * 14;
        ctx.lineTo(x, y);
      }
      ctx.globalAlpha = 0.35 * a; ctx.strokeStyle = '#44aaff'; ctx.lineWidth = 6; ctx.stroke();
      ctx.globalAlpha = 0.95; ctx.strokeStyle = '#e8f6ff'; ctx.lineWidth = 1.6; ctx.stroke();
    }
    ctx.restore();
  };
}

// Varek's poses (CinPerf partials over a base pose; absolute angles, facing-right space, +Y down).
// Both hands stay on the axe haft: the weapon is drawn from the right hand along rFore.
const VAREK_POSES = () => {
  const P = Math.PI;
  return {
    // Two-handed overhead: both arms up and back, left hand just below the right on the haft.
    axeHigh: { from: 'stand', rArm: -P * 0.60, rFore: -P * 0.70, lArm: -P * 0.56, lFore: -P * 0.64, lArmLen: 0.92,
      rLeg: P * 0.62, rShin: P * 0.60, lLeg: P * 0.36, lShin: P * 0.40, torso: -0.12, headTilt: -0.05, hipDrop: 2 },
    // The flinch: the swing aborted, axe dragged down across the body, leaning away from the light.
    flinch: { from: 'stand', rArm: P * 0.30, rFore: -P * 0.20, lArm: P * 0.38, lFore: -P * 0.06, lArmLen: 0.95,
      rLeg: P * 0.66, rShin: P * 0.74, lLeg: P * 0.32, lShin: P * 0.24, torso: -0.32, headTilt: -0.28, hipDrop: 3, sx: 0.96 },
    // The brace: haft held up across the face like a bar, giving ground.
    braceAxe: { from: 'brace', rArm: P * 0.10, rFore: -P * 0.44, lArm: P * 0.18, lFore: -P * 0.30, lArmLen: 0.95,
      torso: -0.18, headTilt: 0.15, hipDrop: 5 },
  };
};

function directorTick() {
  const D = window.__dir; if (!D) return;
  const p1 = players[0], p2 = players[1];
  D.f++; D.t++;
  const go = (ph) => { D.phase = ph; D.t = 0; D.log[ph] = D.f; };
  // The opening frame is the hook: be on the close-up from frame 1, not easing in.
  if (D.f === 1) { CinCam.snap((p1.cx() + p2.cx()) / 2, p1.cy() - 6, 2.3); camZoomCur = 2.3; camXCur = (p1.cx() + p2.cx()) / 2; camYCur = p1.cy() - 6; }
  // City traffic (a map perk) would drive through the scene.
  if (typeof mapPerkState !== 'undefined') { if (mapPerkState.cityCars) mapPerkState.cityCars.length = 0; if (mapPerkState.cars) mapPerkState.cars.length = 0; }
  // Neither fighter acts on its own: the scene drives both.
  if (D.phase !== 'close') p1.cooldown = Math.max(p1.cooldown, 2);

  switch (D.phase) {
    case 'swing': {
      // Varek's heavy swing, close up on the contact.
      CinCam.setFocus((p1.cx() + p2.cx()) / 2, p1.cy() - 6, 2.3);
      if (D.t === 4) { p2.cooldown = 0; p2.attack(p1); }
      if (p1.health < 600 || D.t > 70) {
        // The swing's own hit landed (dealDamage: blood, hit-stop, sound). Make it the big one.
        p1.vx = -26; p1.vy = -7; p1.onGround = false;
        p1.stunTimer = 0; p1.ragdollTimer = 0;
        slowMotion = 0.32;
        if (settings.screenShake) screenShake = Math.max(screenShake, 16);
        go('flight');
      }
      break;
    }
    case 'flight': {
      CinCam.setFocus(p1.cx() - 40, p1.cy(), 2.0);
      if (!D.slammed) { p1.vx = -24; if (D.t < 6) p1.vy = Math.min(p1.vy, -3); }
      if (p1._wallSlamCd > 0 && !D.slammed) {
        D.slammed = true; D.log.slam = D.f;
        const ix = D.wallR, iy = p1.cy() - 6;
        D.crack = [];
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI / 2 + (i / 6) * Math.PI + (Math.random() - 0.5) * 0.3;
          const c = [[ix, iy]]; let x = ix, y = iy;
          for (let k = 0; k < 4; k++) { x += Math.cos(a) * (8 + Math.random() * 10) * -1 + (Math.random() - 0.5) * 5; y += Math.sin(a) * (10 + Math.random() * 12); c.push([Math.min(ix, x), y]); }
          D.crack.push(c);
        }
        slowMotion = 0.18;
        spawnBlood(p1.cx() - 6, p1.cy() - 20, 1, 30);
        if (settings.screenShake) screenShake = Math.max(screenShake, 22);
      }
      if (D.slammed && D.t > 4 && slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.02);
      if (D.slammed && p1.onGround && D.t > 20) {
        slowMotion = 1;
        p1.vx = 0; p1.x = D.wallR + 2; p1.facing = 1;
        CinPerf.begin(p1, 'cutscene', { frames: 100000, glow: false, track: CinPerf._trackFromBeats([
          { at: 0, pose: 'stagger' }, { at: 0.30, pose: 'kneel', ease: 'outQuad' }, { at: 0.85, pose: 'slump', ease: 'inOutQuad', hold: 600 },
        ]) });
        D.perf1 = 0;
        go('slump');
      }
      break;
    }
    case 'slump': {
      // Hold on him: head down against the wall, blood running.
      CinCam.setFocus(p1.cx() + 6, p1.cy() - 4, 2.9);
      p1.x = D.wallR + 2; p1.vx = 0;
      if (D.t === 34) go('approach');
      break;
    }
    case 'approach': {
      // Varek walks in to finish it.
      CinCam.setFocus((p1.cx() + p2.cx()) / 2, p1.cy() - 10, 2.05);
      p1.x = D.wallR + 2; p1.vx = 0;
      const gap = p2.x - p1.x;
      p2.facing = -1;
      if (gap > 78) p2.vx = -3.1;
      else if (!D.raised) {
        D.raised = true; p2.vx = 0;
        CinPerf.begin(p2, 'cutscene', { frames: 100000, glow: false, track: CinPerf._trackFromBeats([
          { at: 0, pose: 'stand' }, { at: 0.30, pose: VAREK_POSES().axeHigh, ease: 'outQuad', hold: 600 },
        ]) });
        D.perf2 = 0;
      }
      if (D.raised && (D.perf2 || 0) > 30) go('surge');
      break;
    }
    case 'surge': {
      // The surge: arcs and waves off his body as he rises.
      p1.x = D.wallR + 2; p1.vx = 0;
      const k = Math.min(1, D.t / 50);
      D.arcs = k;
      CinCam.setFocus(p1.cx() + 20, p1.cy() - 10, 2.4 + k * 0.4);
      if (D.t === 1) {
        // Varek's reaction: the swing aborts, he flinches, then braces and gives ground.
        const V = VAREK_POSES();
        CinPerf.begin(p2, 'cutscene', { frames: 100000, glow: false, track: CinPerf._trackFromBeats([
          { at: 0, pose: V.axeHigh }, { at: 0.16, pose: V.flinch, ease: 'outQuad', hold: 0.25 },
          { at: 0.62, pose: V.braceAxe, ease: 'inOutQuad', hold: 600 },
        ]) });
        D.perf2 = 0;
        CinPerf.begin(p1, 'cutscene', { frames: 100000, glow: true, color: p1.color, track: CinPerf._trackFromBeats([
          { at: 0, pose: 'slump' }, { at: 0.55, pose: 'coil', ease: 'inQuad' }, { at: 1.15, pose: 'roar', ease: 'outBack', hold: 600 },
        ]) });
        D.perf1 = 0;
      }
      if (D.t % 18 === 0) CinFX.shockwave(p1.cx(), p1.cy(), '#44aaff', { count: 1, maxR: 80 + k * 120, lw: 2 + k * 2, dur: 30 });
      if (D.t % 6 === 0) {
        spawnParticles(p1.cx(), p1.cy(), '#44aaff', 8 + Math.round(k * 10));
        spawnParticles(p1.cx(), p1.cy(), '#ffffff', 4);
      }
      if (settings.screenShake) screenShake = Math.max(screenShake, Math.round(2 + k * 8));
      // Pushed back a little at a time by the surge.
      if (D.t > 12 && D.t < 70) { p2.facing = -1; p2.x += D.t < 24 ? 0.9 : 0.35; }
      if (D.t === 70) {
        // The release: Varek is blown back off his finishing blow.
        CinPerf.end(p2);
        p2.vx = 11; p2.vy = -5; p2.onGround = false;
        CinFX.shockwave(p1.cx(), p1.cy(), '#ffffff', { count: 2, maxR: 300, lw: 6, dur: 40 });
        if (settings.screenShake) screenShake = Math.max(screenShake, 24);
      }
      if (D.t === 84) {
        CinPerf.end(p1); D.arcs = 0;
        CinCam.restore();
        // The fifth super: the game turns it into the Conviction.
        p1.superMeter = 100; p1.superReady = true; p1._domainSuperCount = 4;
        p1.cooldown = 0;
        p1.useSuper(p2);
        go('conviction');
      }
      break;
    }
    case 'conviction': {
      // The game's own rise cinematic runs here (~300 frames). Hands off.
      if (D.t === 320) go('close');
      break;
    }
    case 'close': {
      // Torren closes the gap and the hammer's super finishes it.
      const dx = p2.cx() - p1.cx();
      p1.facing = Math.sign(dx) || 1;
      if (activeFinisher) { if (!D.log.fin) D.log.fin = D.f; break; }
      if (Math.abs(dx) > 60) { p1.vx = p1.facing * 13; }
      else {
        p1.vx = 0;
        p1._finisherKey = 'thor';   // the coin flip between his class and hammer finishers, called for STORMBEARER
        // Last life, last HP: an ordinary hit ends it and the game plays Torren's finisher.
        p2.health = 1; p2.lives = 1; p2.invincible = 0; p2.shielding = false;
        if (p1.cooldown <= 0 && !activeFinisher) { p1.attack(p2); if (!D.log.fire) D.log.fire = D.f; }
      }
      break;
    }
  }
  // Varek survives everything until the last blow (Storm Realm's lightning would otherwise end the match early).
  // A deep health pool (never shown: no plates or bars in the capture) so hits still land, stagger and bleed.
  if (D.phase !== 'close') { p2.lives = 3; if (p2.health < 500) p2.health = 900; }
  p1.lives = 3; if (p1.health < 300) p1.health = 600;
  // Nobody leaves the stage: the scene ends on the floor, not off an edge.
  for (const p of players) if (p.x > D.stageR) { p.x = D.stageR; if (p.vx > 0) p.vx = 0; }
  if (D.phase === 'slump' || D.phase === 'approach') D.bleedT = (D.bleedT || 0) + 1;
  else if (D.phase === 'surge' && D.t < 30 && D.bleedT !== undefined) D.bleedT++;
  else D.bleedT = undefined;
  if (D.perf1 !== undefined && p1._cinPerf) CinPerf.tick(p1, ++D.perf1);
  if (D.perf2 !== undefined && p2._cinPerf) CinPerf.tick(p2, ++D.perf2);
  window.__focus = () => (D.phase === 'approach' || (D.phase === 'close' && Math.abs(p2.cx() - p1.cx()) < 420)
    ? (p1.cx() + p2.cx()) / 2 : p1.cx() + 20);
}

const probe = () => {
  const D = window.__dir || {};
  const p1 = players[0], p2 = players[1];
  return { ph: D.phase, f: D.f, h1: Math.round(p1.health), h2: Math.round(p2.health), x1: Math.round(p1.x), x2: Math.round(p2.x),
    fin: activeFinisher ? (activeFinisher.def && activeFinisher.def.name) || 1 : 0, l2: p2.lives, run: gameRunning, dom: DomainManager.domains.length, z: +camZoomCur.toFixed(2), sm: +slowMotion.toFixed(2) };
};

(async () => {
  const cmd = process.argv[2] || 'capture';
  const prof = PROFILES[process.argv[3] || 'draft'];
  const profName = process.argv[3] || 'draft';
  if (cmd !== 'capture') throw new Error('usage: node conviction.js capture [draft|vert]');
  const s = await openSession({ width: prof.width, height: prof.height, port: prof.port });
  await hookAudio(s);
  await s.startMatch({ mode: '2p', arena: ARENA, p1: 'hammer', p1Class: 'thor', p1Color: '#44aaff',
    p2: 'axe', p2Class: 'kratos', p2Color: '#ff6a2a', p1Bot: false, p2Bot: false });
  await quiet(s);
  await s.eval((inst, tick, poses) => {
    window.VAREK_POSES = (new Function('return (' + poses + ')'))();
    (new Function('return (' + inst + ')'))()();
    const t = new Function('return (' + tick + ')')();
    const orig = window.__step;
    window.__step = function (n) { for (let i = 0; i < n; i++) { if (window.__manual) t(); orig(1); } };
  }, directorInstall.toString(), directorTick.toString(), VAREK_POSES.toString());
  const out = path.join(__dirname, 'work', profName, 'conviction');
  const { log } = await record(s, out, FRAMES, { fps: FPS, probe, cropW: prof.cropW });
  const marks = await s.eval(() => Object.assign({ titles: window.__finTitles, texts: window.__texts }, window.__dir.log));
  const j = JSON.parse(fs.readFileSync(out + '.json', 'utf8')); j.marks = marks; fs.writeFileSync(out + '.json', JSON.stringify(j));
  console.log('marks', JSON.stringify(marks));
  const ph = []; log.forEach((e, i) => { if (e && (!ph.length || ph[ph.length - 1][1] !== e.ph)) ph.push([i, e.ph]); });
  console.log('phases', JSON.stringify(ph));
  console.log('last', JSON.stringify(log[log.length - 1]));
  console.log('errors', s.errors.slice(0, 5).join(' | '));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
