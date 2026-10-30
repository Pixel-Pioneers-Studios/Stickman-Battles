'use strict';
// Weapon-trick Shorts: one staged scene per weapon, Conviction-style, in the real game.
//
//   node moves.js capture <scene> [draft|vert]   → work/<profile>/<scene>.mov (+ .json log)
//   node moves.js list
//
// Same method as conviction.js: the director runs once per game frame before
// the game's own update, places the fighters, presses their buttons and steers
// what the game can't aim on its own (a thrown anchor up onto a ledge). The
// hits, hauls, supers and finishers are the game's own code.
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  draft: { width: 1707, height: 960, cropW: 540, port: 8176 },
  vert: { width: 3414, height: 1920, cropW: 1080, port: 8178 },
};
const FPS = 60;

// Capture hygiene (conviction.js): no HUD, numbers, plates, banners; titles logged for captions.
const quiet = s => s.eval(() => {
  // The match end is scheduled on a 900ms wall-clock timer; frame-stepped capture runs far slower than
  // real time, so it would land mid-finisher and freeze the take. A staged scene never ends the match.
  window.endGame = function () {};
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
  window.__finTitles = [];
  window._finTitle = function (c, text) { if (!window.__finTitles.includes(text)) window.__finTitles.push(text); };
  window.__texts = [];
  const logText = (kind, text) => window.__texts.push({ f: window.__dir ? window.__dir.f : -1, kind, text });
  if (typeof DomainManager !== 'undefined') DomainManager.drawSpeechBubbles = () => {};
  CinFX.nameCard = (text) => logText('card', text);
  window.queueAnnouncement = (text) => logText('line', text);
  window._finSubtitle = (c, text) => { if (!window.__texts.some(t => t.text === text)) logText('finsub', text); };
});

// ── Shared per-frame helpers, installed in the page as window.__H ────────────
function helpersInstall() {
  const D = window.__dir = { f: 0, phase: 'start', t: 0, log: {} };
  const H = window.__H = {
    D,
    go(ph) { D.phase = ph; D.t = 0; D.log[ph] = D.f; },
    floor() { return currentArena.platforms.filter(pl => pl.isFloor && !pl.isFloorDisabled).sort((a, b) => b.w - a.w)[0]; },
    snap(x, y, z) { CinCam.snap(x, y, z); camZoomCur = z; camXCur = x; camYCur = y; },
    // The recorder's crop maps world x through the gameplay camera (camXCur/camZoomCur), but a staged
    // scene renders through the cinematic one, which lives in gameLoop's locals. So read the real
    // world→screen transform at fighter draw time (window.__wx) and hand back the world x that the
    // recorder's mapping turns into that screen x. Never a NaN: it sticks in the eased crop (black frames).
    focus(wx) {
      if (!isFinite(wx)) wx = players[0].cx();
      const T = window.__wx;
      return T ? T.a * wx + T.e : canvas.width / 2;
    },
    noTraffic() {
      if (typeof forestBeastCooldown !== 'undefined') forestBeastCooldown = 99999;
      if (typeof yetiCooldown !== 'undefined') yetiCooldown = 99999;
      if (typeof mapPerkState !== 'undefined' && !window.__keepCars) { if (mapPerkState.cityCars) mapPerkState.cityCars.length = 0; if (mapPerkState.cars) mapPerkState.cars.length = 0; }
    },
    // Lay a fighter on a surface at x, standing.
    place(p, x, y, facing) { p.x = x - p.w / 2; p.y = y - p.h; p.vx = 0; p.vy = 0; p.onGround = true; if (facing) p.facing = facing; },
    // A point on a quadratic arc from a to b, peak `lift` px above the higher end, u in 0..1.
    arc(a, b, lift, u) {
      const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - lift;
      const k = 1 - u;
      return { x: k * k * a.x + 2 * k * u * cx + u * u * b.x, y: k * k * a.y + 2 * k * u * cy + u * u * b.y };
    },
    // Press Q / E for a scripted fighter: clear what would swallow the press.
    press(p, key, tgt) {
      p.stunTimer = 0; p.attackEndlag = 0; p.shielding = false; if (p.state === 'stunned') p.state = 'idle';
      if (key === 'q') { p.abilityCooldown = 0; p.ability(tgt); }
      else { p.superMeter = 100; p.superReady = true; p.useSuper(tgt); }
    },
    // CinPerf poses driven by the director (conviction.js pattern). beats: [{at, pose, ease, hold}].
    pose(p, beats, glow) {
      CinPerf.begin(p, 'cutscene', { frames: 100000, glow: !!glow, color: p.color, track: CinPerf._trackFromBeats(beats) });
      (D.perf || (D.perf = new Map())).set(p, 0);
    },
    unpose(p) { if (p._cinPerf) CinPerf.end(p); if (D.perf) D.perf.delete(p); },
    tickPoses() { if (D.perf) for (const [p, n] of D.perf) { if (p._cinPerf) { D.perf.set(p, n + 1); CinPerf.tick(p, n + 1); } else D.perf.delete(p); } },
    // A chain heavy enough to read on a phone: the game's own is a 1.6px dotted line.
    chain(x0, y0, x1, y1, sag) {
      const mx = (x0 + x1) / 2, my = Math.max(y0, y1) + (sag || 0);
      const n = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / 7));
      ctx.save(); ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, k = 1 - u;
        const x = k * k * x0 + 2 * k * u * mx + u * u * x1, y = k * k * y0 + 2 * k * u * my + u * u * y1;
        const dx = 2 * k * (mx - x0) + 2 * u * (x1 - mx), dy = 2 * k * (my - y0) + 2 * u * (y1 - my);
        const ang = Math.atan2(dy, dx) + (i % 2 ? Math.PI / 2 : 0) * 0.0;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.strokeStyle = '#1a1c22'; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.ellipse(0, 0, 4.2, i % 2 ? 1.2 : 2.6, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = i % 2 ? '#8e98a4' : '#c4ccd6'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.ellipse(0, 0, 4.2, i % 2 ? 1.2 : 2.6, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    },
    ease(u) { u = Math.max(0, Math.min(1, u)); return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; },
    // A fighter who has been losing, made readable on a phone (conviction.js pattern). The game's own tier-3
    // wounds are on (black eye, scratches, drip), but they're 1-2px; on top of them: blood running from the
    // scalp down the face (follows the posed head), a stain on the torso, a growing pool and drops on the floor.
    bleed(p, floorY) {
      p._damageAccumThisLife = 140; p._degradeVisual = 140; p._lastHealthSeen = p.health;
      const B = p.__bleed = { t: 0, floorY, pool: 0 };
      const d0 = p.draw.bind(p);
      p.draw = function () {
        d0();
        if (!p.__bleed || p.health <= 0) return;
        B.t++;
        p._damageAccumThisLife = Math.max(p._damageAccumThisLife || 0, 140);
        let hx = p.cx() + (p.facing || 1) * 2, hy = p.y + 8, R = 7, fc = p.facing || 1, chest = { x: p.cx(), y: p.y + 24 };
        const rec = p._cinPerf;
        if (rec && typeof CinRig !== 'undefined') {
          const pose = rec.track.sample(rec.frame);
          pose.x = p.cx(); pose.y = p.y + p.h; pose.facing = fc;
          pose.scale = (pose.scale || 1) * 0.9 * (p.drawScale || 1); pose.headScale = (pose.headScale || 1) * 0.77;
          const J = CinRig.joints(pose); hx = J.head.x; hy = J.head.y; R = J.headR;
          if (J.neck && J.hip) chest = { x: (J.neck.x * 2 + J.hip.x) / 3, y: (J.neck.y * 2 + J.hip.y) / 3 };
        }
        ctx.save(); ctx.lineCap = 'round';
        // Scalp to chin, two runs.
        const x0 = hx + fc * R * 0.3, y0 = hy - R * 0.6, len = R * 2.6;
        ctx.strokeStyle = 'rgba(170,0,10,0.95)'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + fc * R * 0.3, y0 + len * 0.5, x0 + fc * R * 0.15, y0 + len); ctx.stroke();
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x0 - fc * R * 0.35, y0 + R * 0.2); ctx.quadraticCurveTo(x0 - fc * R * 0.2, y0 + len * 0.6, x0 - fc * R * 0.3, y0 + len * 0.85); ctx.stroke();
        // Torso stain.
        ctx.fillStyle = 'rgba(160,0,10,0.75)';
        ctx.beginPath(); ctx.ellipse(chest.x + fc * 2, chest.y, 3.2, 5, 0.3, 0, Math.PI * 2); ctx.fill();
        // Pool under him, growing.
        B.pool = Math.min(1, B.pool + 0.008);
        if (B.floorY && p.onGround !== false) {
          ctx.fillStyle = 'rgba(120,0,8,0.85)';
          ctx.beginPath(); ctx.ellipse(p.cx() + fc * 4, B.floorY - 0.5, 4 + B.pool * 12, 1.2 + B.pool * 1.6, 0, 0, Math.PI * 2); ctx.fill();
        }
        // Drops off the chin.
        const ph = B.t % 34;
        if (ph < 20) { ctx.fillStyle = '#c80810'; ctx.beginPath(); ctx.arc(x0 + fc * R * 0.15, y0 + len + ph * ph * 0.09, 1.5, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      };
    },
    unbleed(p) { p.__bleed = null; },
  };
  // The i-frame bubble (a pale blue ellipse) is noise in a staged scene: finishers set i-frames
  // every frame, so hide it at the source. The real value still protects while no finisher runs.
  for (const p of players) {
    let inv = p.invincible || 0;
    Object.defineProperty(p, 'invincible', { configurable: true, get: () => (window.__bubble ? inv : 0), set: v => { inv = v; } });
  }
  if (!Fighter.prototype.__wxHooked) {
    Fighter.prototype.__wxHooked = true;
    const d0 = Fighter.prototype.draw;
    Fighter.prototype.draw = function () { try { const m = ctx.getTransform(); window.__wx = { a: m.a, e: m.e }; } catch (e) {} return d0.apply(this, arguments); };
  }
  for (const p of players) { p.lives = 3; p.invincible = 0; p._domainSuperCount = 0; p.superMeter = 0; p.superReady = false; }
  players[0].target = players[1]; players[1].target = players[0];
}

// ── Scenes ───────────────────────────────────────────────────────────────────
// Each: match setup, install(H) once, tick(H) per frame, frames, focus.
const SCENES = {};

// ANCHOR — the anchor as a grappling hook. Varek's axe comes down; the anchor
// bites the ledge above and yanks Warden out from under it. From the ledge he
// throws it down, hooks Varek, hauls him up into the air, and Keelhaul's circle
// catches him on arrival: the game's own KEELHAUL move finisher ends it.
SCENES.anchor = {
  arena: 'city', frames: 760,
  // Varek is the axe-and-red look only: his class perk (an orange aura at half HP) would fire mid-scene.
  match: { p1: 'anchor', p1Class: 'warden', p1Color: '#ffc83d', p2: 'axe', p2Class: 'warrior', p2Color: '#ff3a3a' },
  install(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    const fl = H.floor();
    D.floorY = fl.y;
    // The ledge: city's centre platform (365..535 at y 235).
    const ledge = currentArena.platforms.filter(pl => !pl.isFloor && pl.y > 180 && pl.y < 300).sort((a, b) => Math.abs(a.x + a.w / 2 - 450) - Math.abs(b.x + b.w / 2 - 450))[0];
    D.ledge = { x: ledge.x, y: ledge.y, w: ledge.w };
    H.place(p1, ledge.x - 70, fl.y, 1);
    H.place(p2, ledge.x - 70 - 66, fl.y, 1);
    p1.facing = -1; p2.facing = 1;
    p1.health = p1.maxHealth * 0.55;
    p2.health = p2.maxHealth;
    H.snap((p1.cx() + p2.cx()) / 2, p1.cy() - 20, 2.2);
    // The chain, drawn over the game's thin one: hand to the thrown anchor, and to Keelhaul's head.
    const d1 = p1.draw.bind(p1);
    p1.draw = function () {
      d1();
      const a = p1._wxAnchor, hx = p1.cx() + p1.facing * 10, hy = p1.cy() - 4;
      if (a) H.chain(hx, hy, a.x, a.y, a.state === 'embedded' || a.state === 'steer' ? 4 : 14);
      const k = p1._wxKeel;
      if (k && k.hx != null) H.chain(p1.cx(), p1.cy(), k.hx, k.hy, 0);
    };
  },
  tick(H) {
    const D = H.D, p1 = players[0], p2 = players[1], L = D.ledge;
    const lip = { x: L.x + 18, y: L.y };     // where the anchor bites the ledge
    switch (D.phase) {
      case 'start': H.go('swing'); break;
      case 'swing': {
        // Varek's overhead on Warden, close up. The anchor goes up as the axe comes down.
        // Close on the two, then tilt up after the anchor as it climbs to the ledge.
        { const up = D.throwFrom ? H.ease(Math.min(1, (D.aT || 0) / 14)) : 0;
          CinCam.setFocus((p1.cx() + p2.cx()) / 2 + up * 30, p1.cy() - 30 - up * 70, 2.2 - up * 0.4); }
        // The anchor goes up first (the throw has a 12-frame wind-up); the axe comes down as he leaves.
        if (D.t === 1) {
          p1.facing = 1; H.press(p1, 'q', p2);
          const P = Math.PI;
          H.pose(p2, [{ at: 0, pose: 'stand' }, { at: 0.25, ease: 'outQuad', hold: 600, pose: { from: 'stand', rArm: -P * 0.60, rFore: -P * 0.70, lArm: -P * 0.56, lFore: -P * 0.64, lArmLen: 0.92,
            rLeg: P * 0.62, rShin: P * 0.60, lLeg: P * 0.36, lShin: P * 0.40, torso: -0.12, headTilt: -0.05, hipDrop: 2 } }]);
        }
        if (D.t === Number(window.__AXE_AT || 29)) { H.unpose(p2); p2.facing = 1; p2.cooldown = 0; p2.attack(p1); D.log.axe = D.f; }
        if (D.t === Number(window.__AXE_AT || 29) + 7) {
          // The axe bites the street where he was standing.
          const x = p2.cx() + 58;
          spawnParticles(x, D.floorY - 2, '#aa9977', 18); spawnParticles(x, D.floorY - 2, '#ffffff', 6);
          if (typeof spawnRing === 'function') spawnRing(x, D.floorY);
          if (settings.screenShake) screenShake = Math.max(screenShake, 12);
        }
        if (p1._wxAnchor && !D.throwFrom) { const a0 = p1._wxAnchor; D.throwFrom = { x: a0.x, y: a0.y }; D.aT = 0; D.log.thrown = D.f; }
        const a = p1._wxAnchor;
        if (a && (a.state === 'fly' || a.state === 'steer') && D.throwFrom) {
          // Steered: a short high arc onto the ledge's lip (a flat throw can't reach a ledge 200px up).
          // 'steer' is a state the game's anchor update ignores, so it can't snag the ledge's underside.
          a.state = 'steer'; a.rot += 0.35;
          D.aT++;
          const u = Math.min(1, D.aT / 14);
          const q = H.arc(D.throwFrom, lip, 60, H.ease(u));
          a.x = q.x; a.y = q.y; a.vx = 0; a.vy = 0;
          if (u >= 1) { a.state = 'embedded'; a.x = lip.x; a.y = lip.y; screenShake = Math.max(screenShake, 6); spawnParticles(lip.x, lip.y, '#aa9977', 10); D.log.bite = D.f; D.biteT = D.t; }
        }
        if (a && a.state === 'embedded' && !a.pull && !p1._msScene && D.t - (D.biteT || 0) >= 3) {
          // Haul himself up: second press.
          H.press(p1, 'q', p2);
          slowMotion = 0.45;
          H.go('rise');
        }
        // Warden holds his ground until he's pulled (no walking off).
        if (!p1._wxAnchor || p1._wxAnchor.state !== 'embedded') { p1.vx = 0; }
        break;
      }
      case 'rise': {
        // Up the chain, round the lip and onto the ledge. The game's pull flies straight at the
        // anchor, which runs him into the ledge's underside, so the path is placed here: out past
        // the edge, over it, down onto it. The anchor stays drawn on the lip until he lands.
        CinCam.setFocus((p1.cx() + p2.cx()) / 2 + 20, L.y + 45, 1.65);
        if (p1._swingTrail) p1._swingTrail.length = 0;
        const a = p1._wxAnchor;
        if (a) { a.pull = null; a.state = 'steer'; a.x = lip.x; a.y = lip.y; a.rot = Math.PI / 2; }
        if (!D.riseFrom) D.riseFrom = { x: p1.cx(), y: p1.y + p1.h, u: 0 };
        const R = D.riseFrom;
        R.u = Math.min(1, R.u + slowMotion / 24);
        const end = { x: L.x + 46, y: L.y }, c = { x: L.x - 70, y: L.y - 150 };
        const k = 1 - R.u, u = R.u;
        const fx = k * k * R.x + 2 * k * u * c.x + u * u * end.x, fy = k * k * R.y + 2 * k * u * c.y + u * u * end.y;
        p1.x = fx - p1.w / 2; p1.y = fy - p1.h; p1.vx = 0; p1.vy = 0; p1.onGround = false;
        p1.facing = 1;
        if (D.t > 8 && slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.025);
        if (R.u >= 1) {
          slowMotion = 1;
          p1._wxAnchor = null;
          H.place(p1, end.x, L.y, p2.cx() > end.x ? 1 : -1);
          spawnParticles(p1.cx(), L.y, '#aa9977', 10);
          if (settings.screenShake) screenShake = Math.max(screenShake, 6);
          D.log.perched = D.f;
          H.go('perch');
        }
        break;
      }
      case 'perch': {
        // Up on the ledge; Varek looks up from below.
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, (p1.cy() + p2.cy()) / 2 - 22, 1.7);
        p2.facing = p1.cx() > p2.cx() ? 1 : -1;
        if (D.t === 22) {
          // Down at Varek: steered onto his chest; the game's own flight check hooks him.
          p1.facing = p2.cx() > p1.cx() ? 1 : -1;
          H.press(p1, 'q', p2);
          D.throwFrom = null;
          H.go('throw');
        }
        break;
      }
      case 'throw': {
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, (p1.cy() + p2.cy()) / 2 - 22, 1.7);
        const a = p1._wxAnchor;
        if (a && !D.throwFrom) { D.throwFrom = { x: a.x, y: a.y }; D.aT = 0; D.log.thrown2 = D.f; }
        if (a && a.state === 'fly') {
          D.aT++;
          const u = Math.min(1, D.aT / 10);
          const q = H.arc(D.throwFrom, { x: p2.cx(), y: p2.cy() - 4 }, 10, u);
          a.x = q.x; a.y = q.y; a.vx = 0; a.vy = 0;
        }
        if (a && a.state === 'embedded' && a.hooked === p2) {
          D.log.hooked = D.f;
          if (D.hookT === undefined) D.hookT = D.t;
        }
        if (D.hookT !== undefined && D.t - D.hookT >= 10 && !p1._msScene && !D.hauled) {
          D.hauled = true;
          H.press(p1, 'q', p2);   // haul
          H.go('haul');
        }
        break;
      }
      case 'haul': {
        // Up on the chain: the game drags sideways; the ledge is above, so steer the drag up to it.
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, (p1.cy() + p2.cy()) / 2 - 10, 1.9);
        const a = p1._wxAnchor;
        if (!a && !D.keel && D.t > 2 && !p1._msScene) { D.keel = true; p1.facing = p2.cx() > p1.cx() ? 1 : -1; H.press(p1, 'e', p2); H.go('keel'); break; }
        if (a && a.pull) {
          const tx = p1.cx() + (p2.cx() < p1.cx() ? -70 : 70), ty = p1.cy() - 30;
          const dx = tx - p2.cx(), dy = ty - p2.cy(), d = Math.hypot(dx, dy) || 1;
          p2.vx = dx / d * 15; p2.vy = dy / d * 15;
          a.pull.t = Math.min(a.pull.t, 10);    // the drag ends on arrival, not on its timer
          if (d < 55 && !D.keel && !p1._msScene) {
            D.keel = true;
            p1.facing = p2.cx() > p1.cx() ? 1 : -1;
            H.press(p1, 'e', p2);
            H.go('keel');
          }
        }
        break;
      }
      case 'keel': {
        if (D.t === 1) D.log.keelOk = p1._wxKeel ? 1 : ('no:' + (p1._msScene ? p1._msScene.key : '-') + ':' + p1.superReady + ':' + p1.cooldown + ':' + p1.attackTimer + ':' + p1.state);
        CinCam.setFocus(p1.cx(), p1.cy() - 10, 2.0);
        // Held in the circle's reach while the anchor goes round (he'd otherwise fall off the ledge).
        if (p1._wxKeel) {
          if (D.side === undefined) D.side = p2.cx() < p1.cx() ? -1 : 1;
          const tx = p1.cx() + D.side * 86, ty = p1.cy() - 4 + Math.sin(D.t * 0.3) * 4;
          p2.x += (tx - p2.cx()) * 0.35; p2.y += (ty - p2.cy()) * 0.35; p2.vx = 0; p2.vy = 0; p2.onGround = false;
          p2.facing = -D.side;
          if (!D.hung) { D.hung = true; H.pose(p2, [{ at: 0, pose: 'stagger' }, { at: 0.2, pose: 'stagger', hold: 600 }]); }
          if (p1._wxKeel.t >= 66 && p2._cinPerf) H.unpose(p2);
          // Last life: the slam (26) ends it, and the game plays Keelhaul's own finisher.
          if (p1._wxKeel.t >= 62) { p2.lives = 1; p2.health = Math.min(p2.health, 12); p2.invincible = 0; p2.shielding = false; }
        }
        if (activeFinisher && !D.log.fin) D.log.fin = D.f;
        break;
      }
    }
    // Deep, hidden health pool so the early hits land without ending it.
    if (D.phase !== 'keel') { p2.lives = 3; if (p2.health < p2.maxHealth * 0.5) p2.health = p2.maxHealth; }
    p1.lives = 3; if (p1.health < p1.maxHealth * 0.25) p1.health = p1.maxHealth * 0.5;
    if (D.phase !== 'swing') p2.cooldown = Math.max(p2.cooldown, 2);
    if (!activeFinisher) { p1.invincible = 0; if (D.phase !== 'swing') p2.invincible = 0; }
    else { p1.invincible = 0; }
    H.tickPoses();
    window.__focusScreen = () => H.focus(Math.abs(p2.cx() - p1.cx()) < 260 ? (p1.cx() + p2.cx()) / 2 : p1.cx());
  },
};

// KNIVES — "He missed every throw. On purpose." Six knives thrown past the hammer man
// into the ground and the ledge behind him; he laughs and walks in with the hammer up;
// Recall brings all six home through his back. The game's own RECALL: ALL finisher ends it.
SCENES.knives = {
  arena: 'forest', frames: 560,
  match: { p1: 'knives', p1Class: 'none', p1Color: '#ff4fd8', p2: 'hammer', p2Class: 'warrior', p2Color: '#ff8a2a' },
  install(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    const fl = H.floor();
    D.floorY = fl.y;
    H.place(p1, 410, fl.y, 1);
    H.place(p2, 540, fl.y, -1);
    p1.health = p1.maxHealth * 0.6; p2.health = p2.maxHealth;
    // Where each "miss" lands: the ground behind him and the ledge over his head.
    const ledge = currentArena.platforms.filter(pl => !pl.isFloor && pl.y > 300 && pl.y < 420 && pl.x > 450).sort((a, b) => a.x - b.x)[0];
    D.spots = [
      { x: 596, y: fl.y, lift: 40 },
      { x: ledge ? ledge.x + 22 : 600, y: ledge ? ledge.y : 360, lift: 30 },
      { x: 650, y: fl.y, lift: 70 },
      { x: 578, y: fl.y, lift: 110 },
      { x: ledge ? ledge.x + 64 : 640, y: ledge ? ledge.y : 360, lift: 50 },
      { x: 700, y: fl.y, lift: 90 },
    ];
    H.snap((p1.cx() + p2.cx()) / 2, p1.cy() - 40, 1.3);
    // A ranged weapon draws a cooldown bar and "READY" over the head: HUD, not the fighter.
    const d1 = p1.draw.bind(p1);
    // Same for the knife-count pips over the head.
    p1.draw = function () {
      const w = p1.weapon, t = w && w.type, held = p1._wxKnivesHeld;
      if (w) w.type = 'thrown'; p1._wxKnivesHeld = null;
      try { d1(); } finally { if (w) w.type = t; p1._wxKnivesHeld = held; }
      // The knives are 1.5x sprites, slivers on a phone: streak the ones in flight, glint the lodged ones.
      ctx.save(); ctx.lineCap = 'round';
      for (const k of (p1._wxKnives || [])) {
        if (k.state === 'lodged') {
          const ph = (H.D.f + Math.round(k.x)) % 40;
          if (ph < 10) {
            const r = 3 + (ph < 5 ? ph : 10 - ph) * 1.6;
            ctx.globalAlpha = 0.9; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(k.x - r, k.y - 3); ctx.lineTo(k.x + r, k.y - 3); ctx.moveTo(k.x, k.y - 3 - r); ctx.lineTo(k.x, k.y - 3 + r); ctx.stroke();
          }
          continue;
        }
        const sp = Math.hypot(k.vx || 0, k.vy || 0) || 1, len = Math.min(46, sp * 2.6);
        const ux = (k.vx || 0) / sp, uy = (k.vy || 0) / sp;
        ctx.globalAlpha = 0.45; ctx.strokeStyle = '#ff4fd8'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(k.x - ux * len, k.y - uy * len); ctx.lineTo(k.x, k.y); ctx.stroke();
        ctx.globalAlpha = 0.95; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(k.x - ux * len * 0.7, k.y - uy * len * 0.7); ctx.lineTo(k.x, k.y); ctx.stroke();
      }
      ctx.restore();
    };
  },
  tick(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    const P = Math.PI;
    // Steer the knives in flight onto their spots ('steer' is a state the game's update ignores).
    for (const k of (p1._wxKnives || [])) {
      if (k.spot) {
        if (k.state !== 'steer') continue;
        k.u = Math.min(1, k.u + 1 / 13);
        const q = H.arc(k.from, k.spot, k.spot.lift, k.u);
        k.vx = q.x - k.x; k.vy = q.y - k.y; k.x = q.x; k.y = q.y;
        if (k.u >= 1) { k.state = 'lodged'; k.lodgeAng = null; spawnParticles(k.x, k.y, '#8a7a5a', 5); }
      } else if (k.state === 'fly' && D.nextSpot < D.spots.length) {
        k.spot = D.spots[D.nextSpot++]; k.from = { x: k.x, y: k.y }; k.u = 0; k.state = 'steer'; k.hit.add(p2);
      }
    }
    if (D.nextSpot === undefined) D.nextSpot = 0;
    switch (D.phase) {
      case 'start': H.go('throws'); break;
      case 'throws': {
        CinCam.setFocus((p1.cx() + p2.cx()) / 2 + 10, p1.cy() - 40, 1.3);
        p1.facing = 1; if (D.phase === 'throws') p2.facing = -1;
        // Six throws, quick.
        if (D.t % 11 === 1 && D.thrown < 6) { p1.cooldown = 0; p1.attackEndlag = 0; p1.attack(p2); D.thrown++; }
        if (D.thrown === undefined) { D.thrown = 0; p1.cooldown = 0; p1.attack(p2); D.thrown = 1; }
        if (D.thrown >= 6 && D.t > 80) H.go('laugh');
        break;
      }
      case 'laugh': {
        // He looks back at the knives, then laughs it off.
        // He glances back at the knives in the dirt, then turns round to finish it.
        CinCam.setFocus((p1.cx() + p2.cx()) / 2 + 10, p1.cy() - 36, 1.5);
        if (D.t === 4) p2.facing = 1;
        if (D.t === 30) p2.facing = -1;
        if (D.t === 40) H.go('walk');
        break;
      }
      case 'walk': {
        // In he comes, hammer up.
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, p1.cy() - 34, 2.1);
        if (D.t === 1) H.unpose(p2);
        const gap = p2.cx() - p1.cx();
        if (gap > 84) { p2.vx = -2.2; p2.facing = -1; }
        else if (!D.raised) {
          D.raised = true; p2.vx = 0;
          H.pose(p2, [{ at: 0, pose: 'stand' }, { at: 0.25, ease: 'outQuad', hold: 600, pose: { from: 'stand', rArm: -P * 0.60, rFore: -P * 0.70, lArm: -P * 0.56, lFore: -P * 0.64, lArmLen: 0.92,
            rLeg: P * 0.62, rShin: P * 0.60, lLeg: P * 0.36, lShin: P * 0.40, torso: -0.12, headTilt: -0.05, hipDrop: 2 } }]);
          D.raiseT = D.t;
        }
        if (D.raised && D.t - D.raiseT === 20) {
          // Recall. Last life; the fourth knife through him is the kill.
          p2.lives = 1; p2.health = 20; p2.shielding = false;
          slowMotion = 0.4;
          H.press(p1, 'q', p2);
          H.go('recall');
        }
        break;
      }
      case 'recall': {
        CinCam.setFocus((p1.cx() + p2.cx()) / 2 + 20, p2.cy() - 14, 2.1);
        if (D.t === 4) H.unpose(p2);
        if (D.t > 30 && slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.03);
        if (activeFinisher && !D.log.fin) D.log.fin = D.f;
        break;
      }
    }
    if (D.phase !== 'recall') { p2.lives = 3; if (p2.health < p2.maxHealth * 0.5) p2.health = p2.maxHealth; }
    p1.lives = 3; if (p1.health < p1.maxHealth * 0.25) p1.health = p1.maxHealth * 0.5;
    p2.cooldown = Math.max(p2.cooldown, 2);
    if (D.phase !== 'walk' || !(Math.abs(p2.cx() - p1.cx()) > 84)) { if (D.phase !== 'recall') p2.vx = 0; }
    H.tickPoses();
    window.__focusScreen = () => H.focus((p1.cx() + p2.cx()) / 2 + 10);
  },
};

// KATANA — three charge him at once. He stands still, hand on the hilt; one draw passes
// through all three; the cut lands when the blade is sheathed. Iaijutsu marks everyone in
// its path (the real mechanic), and the game's own finisher plays on the kill.
SCENES.katana = {
  arena: 'grass', frames: 520,
  match: { p1: 'katana', p1Class: 'none', p1Color: '#00e5ff', p2: 'sword', p2Class: 'none', p2Color: '#ff3a3a' },
  install(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    const fl = H.floor();
    D.floorY = fl.y;
    // Two more: built the way Battle Royale builds its bots, then left idle (the director drives them).
    const extra = [['spear', '#ff9a2a'], ['axe', '#ffe03a']].map(([wk, col]) => {
      const f = new Fighter(0, fl.y - 60, col, wk, { left: null, right: null, jump: null, attack: null, ability: null, super: null }, true, 'easy');
      f.updateAI = function () {}; f.aiTickInterval = 1;
      f.lives = 3; f.playerNum = players.length + 1; f.name = '';
      players.push(f);
      return f;
    });
    D.foes = [p2, ...extra];
    for (const f of D.foes) { f.target = p1; f._domainSuperCount = 0; }
    H.place(p1, 300, fl.y, 1);
    D.foes.forEach((f, i) => H.place(f, 620 + i * 50, fl.y, -1));
    p1.health = p1.maxHealth;
    H.snap(p1.cx() + 45, p1.cy() - 40, 1.6);
    // The cut lands on all three at the sheathe, red first. A finisher starting on red's death
    // would make the game refuse the other two hits, so they take theirs a moment earlier,
    // with finishers held off for those two; red's then plays the game's finisher.
    const dd = window.dealDamage;
    window.dealDamage = function (a, t, dmg) {
      if (a === p1 && t === p2 && D.phase === 'draw' && !D.extrasCut && D.foes.slice(1).some(f => f._msHeld || f.health > 0)) {
        D.extrasCut = true;
        const fin = settings.finishers; settings.finishers = false;
        for (const e of D.foes.slice(1)) if (e.health > 0) dd.call(this, a, e, dmg, arguments[3]);
        settings.finishers = fin;
      }
      return dd.apply(this, arguments);
    };
  },
  tick(H) {
    const D = H.D, p1 = players[0];
    const foes = D.foes;
    const mid = () => (p1.cx() + foes[2].cx()) / 2;
    switch (D.phase) {
      case 'start': H.go('wait'); break;
      case 'wait': {
        // He waits. They come.
        CinCam.setFocus(Math.min(p1.cx() + 45, mid()), p1.cy() - 40, 1.6);
        p1.facing = 1; p1.vx = 0;
        if (D.t > 24) for (const f of foes) { f.facing = -1; f.vx = -5.2; }
        if (foes[0].cx() - p1.cx() < 120) {
          slowMotion = 0.35;
          D.x0 = p1.cx();
          H.press(p1, 'q', foes[0]);
          D.log.draw = D.f;
          H.go('draw');
        }
        break;
      }
      case 'draw': {
        CinCam.setFocus(D.x0 !== undefined ? D.x0 + 110 : p1.cx() + 60, p1.cy() - 34, 1.8);
        if (D.x0 === undefined) D.x0 = p1.cx();
        // Through them, not into them: the draw's blink is 150px; carry him clear of the third.
        const sc = p1._msScene;
        if (sc && sc.lt >= 14 && !D.through) {
          D.through = true;
          const last = Math.max(...foes.map(f => f.x + f.w));
          D.log.through = [Math.round(p1.x), Math.round(last), sc.lt];
          // The scene owns the performer's position (its body handle), so move that.
          if (sc.ub.x < last + 18) { sc.ub.x = last + 18; p1.x = sc.ub.x; }
          p1.facing = 1;
        }
        // Still coming while the hand goes to the hilt.
        if (D.t < 6 / 0.35) for (const f of foes) if (!f._msHeld && f.vx > -6) f.vx = -5.2;
        if (!p1._msScene && D.t > 10) { H.go('after'); }
        // Last life: the sheathe lands the cut (28 standing) and they fall.
        if (D.t === 2) for (const f of foes) { f.lives = 1; f.health = 14; f.invincible = 0; f.shielding = false; }
        if (D.t > 50 && slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.04);
        if (activeFinisher && !D.log.fin) D.log.fin = D.f;
        break;
      }
      case 'after': {
        slowMotion = 1;
        CinCam.setFocus((p1.cx() + foes.reduce((a, f) => a + f.cx(), 0) / foes.length) / 2, p1.cy() - 34, 1.7);
        if (activeFinisher && !D.log.fin) D.log.fin = D.f;
        break;
      }
    }
    if (D.phase === 'wait' || D.phase === 'start') for (const f of foes) { f.lives = 3; if (f.health < f.maxHealth * 0.5) f.health = f.maxHealth; }
    for (const f of foes) f.cooldown = Math.max(f.cooldown, 2);
    p1.lives = 3;
    H.tickPoses();
    const foeMid = () => foes.reduce((a, f) => a + f.cx(), 0) / foes.length;
    // Him from the first frame, the three running in from the edge; after the draw, him and red (the finisher's victim).
    window.__focusScreen = () => H.focus(D.phase === 'wait' ? Math.min(p1.cx() + 45, mid()) : D.phase === 'draw' ? (p1.cx() + foeMid()) / 2 : (p1.cx() + players[1].cx()) / 2);
  },
};

// EDGE — a story, not a trick. Varek's axe knocks Kael off the ledge into the Ruins pit. Varek walks
// to the lip and looks down to watch him fall. Shadow Step (the game's own katana E) puts Kael on the
// ledge behind him, and its cuts end it: the game's own THOUSAND STEPS move finisher.
SCENES.edge = {
  arena: 'ruins', frames: 900,
  match: { p1: 'katana', p1Class: 'none', p1Color: '#00d4ff', p2: 'axe', p2Class: 'warrior', p2Color: '#ff3a3a' },
  install(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    // Ruins: floors 0-260, 320-580, 640-900 at y 440. The pit is 580..640.
    const mid = currentArena.platforms.filter(pl => pl.isFloor).sort((a, b) => Math.abs(a.x + a.w / 2 - 450) - Math.abs(b.x + b.w / 2 - 450))[0];
    D.lipX = mid.x + mid.w; D.floorY = mid.y; D.pitX = D.lipX + 30;
    H.place(p1, D.lipX - 26, D.floorY, -1);
    H.place(p2, D.lipX - 92, D.floorY, 1);
    p1.health = p1.maxHealth * 0.4;
    p2.health = p2.maxHealth;
    if (typeof mapItems !== 'undefined') mapItems.length = 0;
    H.snap((p1.cx() + p2.cx()) / 2, p1.cy() - 10, 2.3);
  },
  tick(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    const P = Math.PI;
    switch (D.phase) {
      case 'start': H.go('swing'); break;
      case 'swing': {
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, p1.cy() - 10, 2.3);
        p1.facing = -1;
        if (D.t === 6) { p2.facing = 1; p2.cooldown = 0; p2.attack(p1); D.log.axe = D.f; }
        if (p1.health < p1.maxHealth * 0.4 - 0.5 || D.t > 60) {
          // The hit landed (the game's own: blood, hit-stop, sound). Off the edge with it.
          p1.vx = 7; p1.vy = -5; p1.onGround = false; p1.stunTimer = 0; p1.ragdollTimer = 0;
          slowMotion = 0.4;
          if (settings.screenShake) screenShake = Math.max(screenShake, 14);
          D.log.hit = D.f;
          H.go('fall');
        }
        break;
      }
      case 'fall': {
        // Over the lip and down into the dark; the camera goes with him.
        if (p1.cx() >= D.pitX) { p1.vx = 0; p1.x = D.pitX - p1.w / 2; }
        if (p1.vy > 2.2) p1.vy = 2.2;     // a slow, hanging fall
        // Never out of the bottom of the frame (or past deathY) before the step.
        if (p1.cy() > D.floorY + 120) { p1.y = D.floorY + 120 - p1.h / 2; p1.vy = 0; }
        p1.facing = -1;
        CinCam.setFocus(D.lipX - 10, Math.min(p1.cy(), D.floorY + 60) - 20, 2.0);
        if (D.t > 14 && slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.02);
        // Varek walks to the lip and leans over to watch.
        const stop = D.lipX - 16;
        if (D.t > 20 && !D.looking) {
          p2.facing = 1;
          if (p2.cx() < stop) p2.vx = 2.6;
          else {
            p2.vx = 0; D.looking = true; D.log.look = D.f;
            H.pose(p2, [{ at: 0, pose: 'stand' }, { at: 0.35, ease: 'outQuad', hold: 600,
              pose: { from: 'stand', torso: 0.62, headTilt: 0.95, rArm: P * 0.42, rFore: P * 0.30, hipDrop: 6 } }]);
          }
        }
        if (D.looking && D.t - (D.log.look - D.log.fall) > 75 && p1.cy() > D.floorY + 40) {
          // Last life, last HP: the step's cuts end it and the game plays THOUSAND STEPS.
          p2.lives = 1; p2.health = 20; p2.invincible = 0; p2.shielding = false;
          H.unpose(p2);
          H.press(p1, 'e', p2);
          D.log.step = D.f;
          H.go('step');
        }
        break;
      }
      case 'step': {
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, D.floorY - 40, 2.2);
        if (activeFinisher && !D.log.fin) D.log.fin = D.f;
        if (D.log.fin && D.f - D.log.fin > 200) H.go('after');
        break;
      }
      case 'after': break;
    }
    // The Ruins drop pickups; a floating 'D' orb in every frame.
    if (typeof mapItems !== 'undefined') mapItems.length = 0;
    // Nobody dies to the pit before the step, and Varek holds until the cuts.
    if (D.phase === 'swing' || D.phase === 'fall') { p1.lives = 3; p2.lives = 3; if (p2.health < p2.maxHealth * 0.5) p2.health = p2.maxHealth; }
    p2.cooldown = Math.max(p2.cooldown, D.phase === 'swing' && D.t < 6 ? 0 : 2);
    p1.cooldown = Math.max(p1.cooldown, 2);
    H.tickPoses();
    window.__focusScreen = () => H.focus(D.phase === 'fall' ? (D.lipX - 20 + (p2.cx() - (D.lipX - 20)) * 0.3) : (p1.cx() + p2.cx()) / 2);
  },
};

// GUARD — a story. Varek turtles behind his shield and every one of Kael's spear thrusts bounces off.
// Then Lance Charge (the game's own spear E): a Q/E move shatters a held guard (msGuardBreakClaim),
// carries him on the point, and the game's own LAST CHARGE move finisher ends it.
SCENES.guard = {
  arena: 'colosseum', frames: 900,
  match: { p1: 'spear', p1Class: 'none', p1Color: '#00d4ff', p2: 'shield', p2Class: 'warrior', p2Color: '#ff3a3a' },
  install(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    const fl = H.floor();
    D.floorY = fl.y;
    H.place(p1, 318, fl.y, 1);
    H.place(p2, 446, fl.y, -1);
    p1.health = p1.maxHealth * 0.5;
    p2.health = p2.maxHealth;
    if (typeof mapItems !== 'undefined') mapItems.length = 0;
    H.snap((p1.cx() + p2.cx()) / 2, p1.cy() - 10, 2.4);
    D.blocks = 0;
  },
  tick(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    if (typeof mapItems !== 'undefined') mapItems.length = 0;
    // Varek holds the guard from the first frame (one raise, so it is never a fresh-raise parry).
    if (D.phase !== 'after') { keysDown.add(p2.controls.shield); p2.facing = -1; }
    switch (D.phase) {
      case 'start': H.go('pokes'); break;
      case 'pokes': {
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, p1.cy() - 10, 2.4);
        p1.facing = 1;
        // Keep the pool topped up: three blocks, no overflow break, nothing gets through.
        if (p2.shielding) { p2.shieldHP = Math.max(p2.shieldHP || 0, 50); p2.shieldBroken = false; }
        const at = [26, 62, 98];
        if (at.includes(D.t)) {
          // Step in a little each time, the way you do when nothing works.
          p1.x += 6; p1.cooldown = 0; p1.attackEndlag = 0; p1.attack(p2);
          D.log['poke' + (++D.blocks)] = D.f;
        }
        // The thrust meets the shield face: a spark big enough to read on a phone.
        if (at.some(a => D.t === a + 6)) {
          const sx = p2.cx() - 22, sy = p2.cy() - 6;
          spawnParticles(sx, sy, '#ffffff', 14); spawnParticles(sx, sy, '#ffd23f', 10);
          if (typeof CinFX !== 'undefined' && CinFX.shockwave) CinFX.shockwave(sx, sy, '#ffffff', { count: 1, maxR: 34, lw: 3, dur: 12 });
          if (settings.screenShake) screenShake = Math.max(screenShake, 6);
        }
        if (D.t === 140) {
          // Last life, last HP: the charge breaks the guard and the game plays LAST CHARGE.
          p2.lives = 1; p2.health = 20;
          p2.shieldHP = 50;   // a full guard: only the Q/E break gets through it
          H.press(p1, 'e', p2);
          D.log.charge = D.f;
          H.go('charge');
        }
        break;
      }
      case 'charge': {
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, p1.cy() - 10, 2.2);
        if (p2.shieldBroken && !D.log.broke) {
          D.log.broke = D.f;
          // The guard goes: shards in the shield's own blue and gold.
          const sx = p2.cx() - 18, sy = p2.cy() - 8;
          spawnParticles(sx, sy, '#2f63d8', 26); spawnParticles(sx, sy, '#f2c94c', 18); spawnParticles(sx, sy, '#ffffff', 12);
          if (typeof CinFX !== 'undefined' && CinFX.shockwave) CinFX.shockwave(sx, sy, '#ffffff', { count: 2, maxR: 110, lw: 5, dur: 22 });
          if (settings.screenShake) screenShake = Math.max(screenShake, 18);
        }
        if (activeFinisher && !D.log.fin) { D.log.fin = D.f; keysDown.delete(p2.controls.shield); }
        if (D.log.fin && D.f - D.log.fin > 220) H.go('after');
        if (!D.log.fin && D.t > 300) H.go('after');
        break;
      }
      case 'after': keysDown.delete(p2.controls.shield); break;
    }
    if (D.phase === 'pokes') { p1.lives = 3; p2.lives = 3; if (p2.health < p2.maxHealth * 0.6) p2.health = p2.maxHealth; }
    p2.cooldown = Math.max(p2.cooldown, 2);
    if (D.phase !== 'pokes') p1.cooldown = Math.max(p1.cooldown, 2);
    H.tickPoses();
    window.__focusScreen = () => H.focus((p1.cx() + p2.cx()) / 2);
  },
};

// PAN — a story. Kael walks into an axe fight holding a frying pan. Varek laughs at it, then puts the
// axe into him. Kael gets up and Grand Slam (the game's own frying pan E) bonks him, winds up like a
// golfer and drives him into the sky: the game's own HOLE IN ONE move finisher, ending on the twinkle.
SCENES.pan = {
  arena: 'colosseum', frames: 640,
  match: { p1: 'fryingpan', p1Class: 'none', p1Color: '#00d4ff', p2: 'axe', p2Class: 'warrior', p2Color: '#ff3a3a' },
  install(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    const fl = H.floor();
    D.floorY = fl.y;
    H.place(p1, 380, fl.y, 1);
    H.place(p2, 452, fl.y, -1);
    p1.health = p1.maxHealth * 0.6;
    p2.health = p2.maxHealth;
    if (typeof mapItems !== 'undefined') mapItems.length = 0;
    H.snap((p1.cx() + p2.cx()) / 2, p1.cy() - 10, 2.4);
  },
  tick(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    const P = Math.PI;
    if (typeof mapItems !== 'undefined') mapItems.length = 0;
    switch (D.phase) {
      case 'start': H.go('laugh'); break;
      case 'laugh': {
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, p1.cy() - 10, 2.4);
        p1.facing = 1; p2.facing = -1;
        if (D.t === 16) {
          // Head thrown back, rocking: the laugh. A hand pointed at the pan on the first beat.
          const back = { from: 'stand', torso: -0.45, headTilt: -0.8, rArm: -P * 0.30, rFore: -P * 0.10, hipDrop: 2 };
          const rock = { from: 'stand', torso: -0.22, headTilt: -0.45, rArm: -P * 0.22, rFore: -P * 0.05, hipDrop: 1 };
          const beats = [{ at: 0, pose: 'stand' }];
          for (let i = 0; i < 6; i++) beats.push({ at: 0.06 + i * 0.07, ease: 'inOutQuad', hold: 0, pose: i % 2 ? rock : back });
          beats.push({ at: 0.5, ease: 'inOutQuad', hold: 600, pose: 'stand' });
          H.pose(p2, beats);
          D.log.laugh = D.f;
        }
        if (D.t === 86) { H.unpose(p2); H.go('swing'); }
        break;
      }
      case 'swing': {
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, p1.cy() - 10, 2.4);
        p1.facing = 1;
        if (D.t === 4) { p2.facing = -1; p2.cooldown = 0; p2.attack(p1); D.log.axe = D.f; }
        if (p1.health < p1.maxHealth * 0.6 - 0.5 || D.t > 60) {
          // The game's own hit landed; a short stagger back, not out of the scene.
          p1.vx = -3.2; p1.vy = -3.5; p1.onGround = false; p1.stunTimer = 0; p1.ragdollTimer = 0;
          slowMotion = 0.45;
          if (settings.screenShake) screenShake = Math.max(screenShake, 12);
          D.log.hit = D.f;
          H.go('up');
        }
        break;
      }
      case 'up': {
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, p1.cy() - 10, 2.3);
        if (slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.025);
        p1.facing = 1; p2.facing = -1;
        if (D.t === 20) {
          // Back on his feet: the head comes up, the pan comes up.
          H.pose(p1, [{ at: 0, pose: 'stand' }, { at: 0.12, ease: 'outQuad', hold: 600,
            pose: { from: 'stand', torso: 0.35, headTilt: 0.5, hipDrop: 8 } }, { at: 0.45, ease: 'inOutQuad', hold: 600, pose: 'stand' }]);
          D.log.rise = D.f;
        }
        // Walk back in to the slam's reach.
        if (D.t > 48 && p2.cx() - p1.cx() > 58) p1.vx = 2.8; else if (D.t > 48) p1.vx = 0;
        if (D.t > 48 && p2.cx() - p1.cx() <= 58 && p1.onGround) {
          H.unpose(p1);
          // Last life, last HP: the slam's swing kills and the game plays HOLE IN ONE.
          p2.lives = 1; p2.health = 20; p2.invincible = 0; p2.shielding = false;
          H.press(p1, 'e', p2);
          D.log.slam = D.f;
          H.go('slam');
        }
        if (D.t > 160) H.go('after');
        break;
      }
      case 'slam': {
        if (!activeFinisher) CinCam.setFocus((p1.cx() + p2.cx()) / 2, p1.cy() - 10, 2.3);
        if (activeFinisher && !D.log.fin) D.log.fin = D.f;
        if (D.log.fin && D.f - D.log.fin > 150) H.go('after');
        if (!D.log.fin && D.t > 260) H.go('after');
        break;
      }
      case 'after': break;
    }
    if (D.phase === 'laugh' || D.phase === 'swing' || D.phase === 'up') { p1.lives = 3; p2.lives = 3; if (p2.health < p2.maxHealth * 0.5) p2.health = p2.maxHealth; }
    p2.cooldown = Math.max(p2.cooldown, D.phase === 'swing' && D.t < 4 ? 0 : 2);
    if (D.phase !== 'slam') p1.cooldown = Math.max(p1.cooldown, 2);
    H.tickPoses();
    window.__focusScreen = () => H.focus((p1.cx() + p2.cx()) / 2);
  },
};

// ARENA — a story. Varek has Kael on his knees, one swing from the win, axe overhead. The city's own
// traffic (a real city car, sent on cue; its hit is the game's) takes him out of the swing and throws
// him back at Kael, who gets up bare-handed: Combo Strike, the game's own HUNDRED FISTS move finisher.
SCENES.arena = {
  arena: 'city', frames: 720,
  match: { p1: 'combat', p1Class: 'none', p1Color: '#00d4ff', p2: 'axe', p2Class: 'warrior', p2Color: '#ff3a3a' },
  install(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    window.__keepCars = true;
    mapPerkState.cityCars = []; mapPerkState.carSpawnCd = 99999;
    const fl = H.floor();
    D.floorY = fl.y;
    // A step of room between them, so Kael's lowered head is never at Varek's waist.
    H.place(p1, 392, fl.y, 1);
    H.place(p2, 470, fl.y, -1);
    p1.health = p1.maxHealth * 0.15;
    p2.health = p2.maxHealth;
    H.bleed(p1, fl.y);
    // Down on one knee, leaning over, still. (No rhythmic motion: a bobbing head at his waist reads wrong.)
    H.pose(p1, [{ at: 0, pose: 'slump', hold: 600 }]);
    H.snap((p1.cx() + p2.cx()) / 2, p1.cy() - 14, 2.4);
  },
  tick(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    mapPerkState.carSpawnCd = 99999;
    switch (D.phase) {
      case 'start': H.go('loom'); break;
      case 'loom': {
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, p1.cy() - 14, 2.4);
        p1.facing = 1; p2.facing = -1;
        if (D.t === 20) {
          // The axe goes up for the last swing.
          H.pose(p2, [{ at: 0, pose: 'stand' }, { at: 0.35, ease: 'outQuad', hold: 600, pose: 'windup' }]);
          D.log.windup = D.f;
        }
        if (D.t === 70) {
          // A real city car, from behind him, on the lane he's standing in.
          mapPerkState.cityCars.push({ x: p2.cx() + 330, y: 438, w: 55, h: 22, vx: -6.5, color: '#cc8800', warned: false, hit: new Set([p1]) });
          D.log.car = D.f;
        }
        if (D.log.car && p2.health < p2.maxHealth - 0.5) {
          // The car's hit landed (the game's dealDamage). Throw him back toward Kael, high, slow.
          H.unpose(p2);
          p2.vx = -3.2; p2.vy = -9; p2.onGround = false; p2.stunTimer = 40;
          slowMotion = 0.4;
          D.log.hit = D.f;
          H.go('thrown');
        }
        if (D.t > 200) H.go('after');
        break;
      }
      case 'thrown': {
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, Math.min(p1.cy(), p2.cy()) - 10, 2.2);
        if (slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.02);
        if (D.t === 18) { H.unpose(p1); H.pose(p1, [{ at: 0, pose: 'kneel' }, { at: 0.25, ease: 'outQuad', hold: 600, pose: 'stand' }]); D.log.rise = D.f; }
        if (D.t > 34 && p2.onGround) {
          H.unpose(p1);
          p1.facing = p2.cx() > p1.cx() ? 1 : -1;
          // Last life, last HP: the combo's hits kill and the game plays HUNDRED FISTS.
          p2.lives = 1; p2.health = 20; p2.invincible = 0; p2.shielding = false; p2.stunTimer = 0;
          H.press(p1, 'e', p2);
          D.log.strike = D.f;
          H.go('strike');
        }
        if (D.t > 160) H.go('after');
        break;
      }
      case 'strike': {
        if (!activeFinisher) CinCam.setFocus((p1.cx() + p2.cx()) / 2, p1.cy() - 10, 2.3);
        if (activeFinisher && !D.log.fin) D.log.fin = D.f;
        if (D.log.fin && D.f - D.log.fin > 200) H.go('after');
        if (!D.log.fin && D.t > 260) H.go('after');
        break;
      }
      case 'after': break;
    }
    if (D.phase === 'loom' || D.phase === 'thrown') { p1.lives = 3; p2.lives = 3; if (p2.health < p2.maxHealth * 0.5) p2.health = p2.maxHealth * 0.8; p1.health = Math.max(p1.health, 5); }
    p2.cooldown = Math.max(p2.cooldown, 2);
    if (D.phase !== 'strike') p1.cooldown = Math.max(p1.cooldown, 2);
    H.tickPoses();
    window.__focusScreen = () => H.focus((p1.cx() + p2.cx()) / 2);
  },
};

// DODGE — a story. Kael is backed against nothing, and Varek's hammer is already coming down. He jumps
// it: over the hammer, over Varek, slowed so you can see it (the jump is scripted, the hammer's swing and
// its miss are the game's). He lands behind him and Soul Reap (the game's own scythe E) hooks him back:
// the game's own HARVEST move finisher.
SCENES.dodge = {
  arena: 'colosseum', frames: 720,
  match: { p1: 'scythe', p1Class: 'none', p1Color: '#00d4ff', p2: 'hammer', p2Class: 'warrior', p2Color: '#ff3a3a' },
  install(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    const fl = H.floor();
    D.floorY = fl.y;
    H.place(p1, 400, fl.y, 1);
    H.place(p2, 452, fl.y, -1);
    p1.health = p1.maxHealth * 0.2;
    p2.health = p2.maxHealth;
    H.bleed(p1, fl.y);
    if (typeof mapItems !== 'undefined') mapItems.length = 0;
    H.snap((p1.cx() + p2.cx()) / 2, p1.cy() - 14, 2.4);
  },
  tick(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    if (typeof mapItems !== 'undefined') mapItems.length = 0;
    switch (D.phase) {
      case 'start': H.go('raise'); break;
      case 'raise': {
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, p1.cy() - 14, 2.4);
        p1.facing = 1; p2.facing = -1;
        if (D.t === 30) {
          // The game's own hammer swing, at point blank.
          p2.cooldown = 0; p2.attack(p1); D.log.swing = D.f;
          p1.invincible = 120;   // staged: the dodge must not be decided by the swing's first frames
        }
        if (D.t === 32) {
          // Up and over him on a scripted arc (invulnerable while airborne: staged), in slow motion.
          D.from = { x: p1.cx(), y: p1.y + p1.h }; D.to = { x: p2.cx() + 70, y: D.floorY };
          p1.invincible = 120; D.log.jump = D.f;
          H.go('over');
        }
        break;
      }
      case 'over': {
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, D.floorY - 60, 2.3);
        p2.facing = -1;
        const N = 70, u = H.ease(Math.min(1, D.t / N));
        const q = H.arc(D.from, D.to, 95, u);
        p1.x = q.x - p1.w / 2; p1.y = q.y - p1.h; p1.vx = 0; p1.vy = 0; p1.onGround = false;
        p1.facing = q.x < p2.cx() ? 1 : -1;
        slowMotion = D.t < 50 ? 0.3 : Math.min(1, slowMotion + 0.05);
        if (D.t === 10) {
          // The hammer hits the floor where he was.
          const gx = D.from.x + 6, gy = D.floorY - 2;
          spawnParticles(gx, gy, '#ffffff', 16); spawnParticles(gx, gy, '#c8a060', 18);
          if (typeof CinFX !== 'undefined' && CinFX.shockwave) CinFX.shockwave(gx, gy, '#ffffff', { count: 1, maxR: 60, lw: 4, dur: 16 });
          if (settings.screenShake) screenShake = Math.max(screenShake, 12);
          D.log.miss = D.f;
        }
        if (D.t >= N) {
          H.place(p1, D.to.x, D.floorY, -1); p1.invincible = 0; D.log.land = D.f;
          H.go('reap');
        }
        break;
      }
      case 'reap': {
        CinCam.setFocus((p1.cx() + p2.cx()) / 2, p1.cy() - 10, 2.3);
        slowMotion = Math.min(1, slowMotion + 0.05);
        if (D.t === 10) {
          p2.facing = -1;   // still looking the wrong way
          p2.lives = 1; p2.health = 20; p2.invincible = 0; p2.shielding = false;
          H.press(p1, 'e', p2);
          D.log.reap = D.f;
        }
        if (activeFinisher && !D.log.fin) D.log.fin = D.f;
        if (D.log.fin && D.f - D.log.fin > 200) H.go('after');
        if (!D.log.fin && D.t > 280) H.go('after');
        break;
      }
      case 'after': break;
    }
    if (D.phase === 'raise' || D.phase === 'over') { p1.lives = 3; p2.lives = 3; if (p2.health < p2.maxHealth * 0.5) p2.health = p2.maxHealth; p1.health = Math.max(p1.health, 5); }
    p2.cooldown = Math.max(p2.cooldown, D.phase === 'raise' && D.t === 30 ? 0 : 2);
    if (D.phase !== 'reap') p1.cooldown = Math.max(p1.cooldown, 2);
    H.tickPoses();
    window.__focusScreen = () => H.focus((p1.cx() + p2.cx()) / 2);
  },
};

// AXESLAM — an authored fight in the game's own bodies (the user's idea, Oct 24): axe and katana locked; the
// lock blows them apart; Kael charges; Varek slams the ground and a rock eruption launches Kael; Varek leaps
// over him and spikes him into a crater; dust, and a glint inside it (PART 2?). Not a game move: every pose is
// keyed here (CinPerf tracks on the real fighters, their real weapon art), positions and effects are authored.
SCENES.axeslam = {
  arena: 'forest', frames: 350,
  match: { p1: 'katana', p1Class: 'none', p1Color: '#00d4ff', p2: 'axe', p2Class: 'none', p2Color: '#ff3a3a' },
  install(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    const fl = H.floor(); D.G = fl.y;
    const P = Math.PI;
    if (typeof mapItems !== 'undefined') mapItems.length = 0;
    // Poses (CinPerf: absolute radians, facing-right space; the rig mirrors). r* is the weapon arm.
    const clash = { rArm: -P * 0.18, rFore: -P * 0.25, lArm: -P * 0.16, lFore: -P * 0.26, rArmLen: 1.15,
      rLeg: P * 0.24, rShin: P * 0.46, lLeg: P * 0.78, lShin: P * 0.74, torso: 0.32, hipDrop: 8, headTilt: 0.12 };
    // CinRig limb angles are world angles (only the torso lean flips with facing), so Varek's poses, which face left,
    // are the right-facing poses mirrored: theta -> PI - theta.
    const M = q => { const o = { ...q }; for (const k of ['rArm', 'rFore', 'lArm', 'lFore', 'rLeg', 'rShin', 'lLeg', 'lShin']) if (o[k] !== undefined) o[k] = P - o[k]; if (o.headTilt) o.headTilt = -o.headTilt; return o; };
    const clashV = M({ ...clash, torso: 0.36 });
    const blown = { rArm: P * 1.05, rFore: P * 1.15, lArm: P * 0.80, lFore: P * 0.92, rLeg: P * 0.40, rShin: P * 0.52,
      lLeg: P * 0.70, lShin: P * 0.60, torso: -0.40, headTilt: -0.30, hipDrop: 4 };
    const skid = { rArm: P * 0.20, rFore: -P * 0.10, lArm: P * 0.95, lFore: P * 1.05, rLeg: P * 0.20, rShin: P * 0.40,
      lLeg: P * 0.80, lShin: P * 0.85, torso: 0.45, hipDrop: 16, headTilt: 0.15 };
    const runA = { rArm: P * 0.85, rFore: P * 0.95, rArmLen: 1.1, lArm: P * 0.25, lFore: -P * 0.10, rLeg: P * 0.10, rShin: P * 0.42,
      lLeg: P * 0.86, lShin: P * 1.05, torso: 0.50, hipDrop: 4, headTilt: 0.10 };
    const runB = { ...runA, rLeg: P * 0.80, rShin: P * 1.00, lLeg: P * 0.16, lShin: P * 0.46, hipDrop: 0 };
    const axeUp = { rArm: -P * 0.40, rFore: -P * 0.62, lArm: -P * 0.45, lFore: -P * 0.66, rArmLen: 1.2, lArmLen: 1.2,
      rLeg: P * 0.30, rShin: P * 0.48, lLeg: P * 0.72, lShin: P * 0.62, torso: -0.30, headTilt: -0.15, hipDrop: 4, sy: 1.06 };
    const axeDown = { rArm: P * 0.22, rFore: P * 0.30, lArm: P * 0.18, lFore: P * 0.28, rArmLen: 1.2, lArmLen: 1.15,
      rLeg: P * 0.20, rShin: P * 0.50, lLeg: P * 0.80, lShin: P * 0.66, torso: 0.62, hipDrop: 14, sx: 1.05 };
    const tumble = { rArm: P * 1.20, rFore: P * 1.45, lArm: P * 1.05, lFore: P * 1.30, rLeg: P * 0.62, rShin: P * 0.95,
      lLeg: P * 0.40, lShin: P * 0.20, torso: -0.35, headTilt: -0.30 };
    const tuck = { rArm: -P * 0.45, rFore: -P * 0.70, lArm: -P * 0.40, lFore: -P * 0.60, rArmLen: 1.2, lArmLen: 1.2,
      rLeg: P * 0.05, rShin: P * 0.70, lLeg: P * 0.20, lShin: P * 0.85, torso: -0.20, hipDrop: -8 };
    const spike = { rArm: P * 0.35, rFore: P * 0.45, lArm: P * 0.30, lFore: P * 0.42, rArmLen: 1.25, lArmLen: 1.2,
      rLeg: P * 0.30, rShin: P * 0.60, lLeg: P * 0.70, lShin: P * 0.55, torso: 0.70, hipDrop: -4 };
    // Varek's spike from above and to Kael's right: the axe has to come down-left onto him.
    const spikeV = { ...spike, rArm: P * 0.62, rFore: P * 0.74 };
    const crumpled = { rArm: P * 0.95, rFore: P * 1.05, lArm: P * 0.70, lFore: P * 0.85, rLeg: P * 0.10, rShin: P * 0.30,
      lLeg: P * 0.25, lShin: P * 0.10, torso: 1.20, hipDrop: 30, headTilt: 0.6 };
    const landK = { rArm: P * 0.40, rFore: P * 0.55, lArm: P * 0.55, lFore: P * 0.60, rLeg: P * 0.10, rShin: P * 0.55,
      lLeg: P * 0.85, lShin: P * 0.70, torso: 0.40, hipDrop: 20 };
    const tower = { rArm: P * 0.70, rFore: P * 0.62, lArm: P * 0.40, lFore: P * 0.50, rLeg: P * 0.62, rShin: P * 0.60,
      lLeg: P * 0.38, lShin: P * 0.42, torso: 0.18, headTilt: 0.30, hipDrop: 2, sx: 1.05 };
    // Standing over the crater with the axe raised at him, not resting its head in the ground.
    const towerV = { ...tower, rArm: P * 0.30, rFore: -P * 0.12 };
    // Kael's whole performance (seconds). The run is two keys cycling.
    const kb = [{ at: 0, pose: clash }, { at: 0.62, pose: clash, hold: 0 }, { at: 0.70, pose: blown, ease: 'outQuad' },
      { at: 0.95, pose: skid, ease: 'outQuad' }, { at: 1.25, pose: skid }];
    let t = 1.33; for (let i = 0; i < 6; i++, t += 0.11) kb.push({ at: t, pose: i % 2 ? runB : runA, ease: 'linear' });
    kb.push({ at: 2.12, pose: tumble, ease: 'outQuad' }, { at: 2.75, pose: tumble, rot: 0 }, { at: 3.05, pose: tumble },
      { at: 3.18, pose: crumpled, ease: 'outQuad' }, { at: 7, pose: crumpled });
    // Varek's.
    // Mirrored while he faces left; over the top of Kael (2.92-3.30) he faces right.
    const vb = [{ at: 0, pose: clashV }, { at: 0.62, pose: clashV }, { at: 0.70, pose: M(blown), ease: 'outQuad' },
      { at: 0.95, pose: M(skid), ease: 'outQuad' }, { at: 1.30, pose: M(skid) }, { at: 1.62, pose: M(axeUp), ease: 'outQuad' },
      { at: 1.95, pose: M(axeUp) }, { at: 2.03, pose: M(axeDown), ease: 'inQuad' }, { at: 2.45, pose: M(axeDown) },
      { at: 2.62, pose: M(tuck), ease: 'outQuad' }, { at: 2.92, pose: axeUp, ease: 'inOutQuad' }, { at: 3.04, pose: spikeV, ease: 'inQuad' },
      { at: 3.30, pose: spikeV }, { at: 3.42, pose: M(landK), ease: 'outQuad' }, { at: 3.80, pose: M(landK) },
      { at: 4.30, pose: M(towerV), ease: 'inOutQuad' }, { at: 7, pose: M(towerV) }];
    H.pose(p1, kb); H.pose(p2, vb);
    // Positions (seconds -> [x, height above floor]); eased between keys.
    D.kPos = [[0, 430, 0], [0.62, 434, 0], [0.70, 420, 24], [0.95, 392, 0], [1.30, 390, 0], [2.10, 470, 0],
      [2.20, 470, 10], [2.75, 472, 430], [3.04, 472, 440], [3.18, 474, 0], [7, 474, 0]];
    D.vPos = [[0, 530, 0], [0.62, 526, 0], [0.70, 548, 24], [0.95, 576, 0], [1.30, 590, 0], [1.95, 590, 0], [2.45, 590, 0],
      [2.62, 556, 200], [2.92, 520, 560], [3.04, 492, 500], [3.30, 488, 60], [3.42, 540, 0], [7, 540, 0]];
    D.ease = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    D.at = (keys, s) => {
      let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= s) i++;
      const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
      if (a === b) return [a[1], a[2]];
      const u = D.ease(Math.max(0, Math.min(1, (s - a[0]) / (b[0] - a[0]))));
      return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
    };
    p1.facing = 1; p2.facing = -1;
    p1.health = p1.maxHealth; p2.health = p2.maxHealth;
    D.spikes = []; D.crater = null; D.dust = [];
    // Rock eruption + crater + dust + glint, drawn in world space under/over the fighters.
    const d2 = p2.draw.bind(p2);
    p2.draw = function () {
      const G = D.G;
      ctx.save();
      for (const sp of D.spikes) {
        const age = D.f - sp.f; if (age < 0) continue;
        const h = sp.h * Math.min(1, age / 4) * (age > 30 ? Math.max(0, 1 - (age - 30) / 20) : 1);
        if (h <= 0) continue;
        ctx.fillStyle = '#3b2f2a'; ctx.strokeStyle = '#6a5446'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sp.x - sp.w, G); ctx.lineTo(sp.x - sp.w * 0.2, G - h); ctx.lineTo(sp.x + sp.w * 0.3, G - h * 0.8); ctx.lineTo(sp.x + sp.w, G); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      if (D.crater) {
        const c = D.crater, k = Math.min(1, (D.f - c.f) / 6);
        ctx.fillStyle = '#1a1310'; ctx.beginPath(); ctx.ellipse(c.x, G + 2, 70 * k, 14 * k, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#7a5a40'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(c.x, G + 2, 70 * k, 14 * k, 0, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#4a3a30';
        for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.1 + i * 0.16); ctx.beginPath(); ctx.moveTo(c.x + Math.cos(a) * 66 * k, G); ctx.lineTo(c.x + Math.cos(a) * 82 * k, G - 18 * k * (1 + (i % 2))); ctx.lineTo(c.x + Math.cos(a) * 92 * k, G); ctx.fill(); }
      }
      ctx.restore();
      d2();
      ctx.save();
      for (const d of D.dust) {
        const age = D.f - d.f; if (age < 0 || age > d.life) continue;
        const k = age / d.life;
        ctx.globalAlpha = (1 - k) * d.a; ctx.fillStyle = d.c;
        ctx.beginPath(); ctx.arc(d.x + d.vx * age, d.y - d.vy * age, d.r * (0.6 + k * 1.6), 0, Math.PI * 2); ctx.fill();
      }
      if (D.glint && D.f >= D.glint) {
        const a = D.f - D.glint, k = Math.min(1, a / 6) * (a > 40 ? Math.max(0, 1 - (a - 40) / 30) : 1), r = 14 + Math.sin(Math.min(1, a / 10) * Math.PI) * 40;
        const gx = D.crater.x - 6, gy = D.G - 18;
        ctx.globalAlpha = k; ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#7fe8ff'; ctx.shadowBlur = 36;
        ctx.beginPath(); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, rr = i % 2 ? r * 0.18 : r; ctx[i ? 'lineTo' : 'moveTo'](gx + Math.cos(an) * rr, gy + Math.sin(an) * rr); } ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    };
    D.place = s => {
      const G = D.G, kp = D.at(D.kPos, s), vp = D.at(D.vPos, s);
      p1.x = kp[0] - p1.w / 2; p1.y = G - kp[1] - p1.h; p1.vx = p1.vy = 0; p1.onGround = kp[1] < 1;
      p2.x = vp[0] - p2.w / 2; p2.y = G - vp[1] - p2.h; p2.vx = p2.vy = 0; p2.onGround = vp[1] < 1;
    };
    // Where each blade is drawn (world space), so the choreography can make them meet: butt end a, far end b.
    D.blade = {}; window.__bladeDebug = canvas.width < 2000;
    const dw = Fighter.prototype.drawWeapon;
    for (const f of [p1, p2]) f.drawWeapon = function (hx, hy, ang, atk, key, sc) {
      const k = key || this.weaponKey, spr = WEAPON_SPRITES[k], swg = WEAPON_SWINGS[k];
      const ct = (swg && swg.carry && swg.carry.tilt) || 0, a = ang + (this.facing < 0 ? -ct : ct);
      if (spr) {
        const s0 = -spr.len * spr.anchor * sc, s1 = spr.len * (1 - spr.anchor) * sc;
        D.blade[this === p1 ? 'k' : 'v'] = { a: [hx + Math.cos(a) * s0, hy + Math.sin(a) * s0], b: [hx + Math.cos(a) * s1, hy + Math.sin(a) * s1], h: [hx, hy], ang: +ang.toFixed(3), ct, fc: this.facing };
      }
      const r = dw.apply(this, arguments);
      if (window.__bladeDebug && D.blade[this === p1 ? 'k' : 'v']) {
        const B = D.blade[this === p1 ? 'k' : 'v'], c = _weaponArtCtx();
        c.save(); c.lineWidth = 2; c.strokeStyle = '#ff00ff'; c.beginPath(); c.moveTo(B.a[0], B.a[1]); c.lineTo(B.b[0], B.b[1]); c.stroke();
        c.fillStyle = '#00ff00'; c.beginPath(); c.arc(B.b[0], B.b[1], 4, 0, 7); c.fill(); c.restore();
      }
      return r;
    };
    D.cross = () => {
      const k = D.blade.k, v = D.blade.v; if (!k || !v) return null;
      const [x1, y1] = k.a, [x2, y2] = k.b, [x3, y3] = v.a, [x4, y4] = v.b;
      const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4); if (!d) return null;
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d, u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
      return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [x1 + t * (x2 - x1), y1 + t * (y2 - y1)] : null;
    };
    D.place(0);
    H.snap(480, D.G - 140, 2.3);
    window.__focusScreen = () => H.focus(480);
  },
  tick(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    const s = D.f / 60, G = D.G;
    if (D.f % 3 === 0 && D.blade.k && D.blade.v) (D.log.blades || (D.log.blades = [])).push([D.f, Math.round(p1.cx()), Math.round(p1.cy()), Math.round(p2.cx()), Math.round(p2.cy()), G, D.blade.k, D.blade.v].map(v => typeof v === 'number' ? v : { a: v.a.map(Math.round), b: v.b.map(Math.round), h: v.h.map(Math.round), ang: v.ang, ct: v.ct, fc: v.fc }));
    if (typeof mapItems !== 'undefined') mapItems.length = 0;
    // Bodies go exactly where the director says (no physics, no AI, no attacks).
    D.place(s);
    p1.facing = 1; p2.facing = s > 2.92 && s < 3.30 ? 1 : -1;   // over the top of him, Varek turns to strike down
    for (const p of [p1, p2]) { p.cooldown = 99; p.abilityCooldown = 99; p.health = p.maxHealth; p.invincible = 0; p.superMeter = 0; }
    const hit = (x, y, n, col, big) => {
      spawnParticles(x, y, col || '#ffe9a0', n); spawnParticles(x, y, '#ffffff', Math.round(n / 2));
      if (big && CinFX.shockwave) CinFX.shockwave(x, y, '#ffffff', { count: 2, maxR: big, lw: 6, dur: 20 });
    };
    const once = (k, at) => { if (D.f === Math.round(at * 60)) { D.log[k] = D.f; return true; } return false; };
    // 1. The lock: sparks and a grind, until it gives.
    const X = D.cross(); if (X) D.lockAt = X;
    const L = D.lockAt || [480, G - 168];
    if (s < 0.62 && D.f % 5 === 0) { hit(L[0], L[1], 6, '#ffd27a'); if (settings.screenShake) screenShake = Math.max(screenShake, 3); }
    if (once('burst', 0.66)) { hit(L[0], L[1], 30, '#ffffff', 60); screenShake = 16; slowMotion = 0.5;
      for (let i = 0; i < 10; i++) D.dust.push({ f: D.f, x: 480 + (i - 5) * 18, y: G - 6, vx: (i - 5) * 1.6, vy: 0.4, r: 14, life: 40, a: 0.5, c: '#b8a48a' }); }
    if (s > 0.9 && slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.05);
    if (s > 0.7 && s < 1.0 && D.f % 3 === 0) { D.dust.push({ f: D.f, x: p1.cx(), y: G - 4, vx: 0.5, vy: 0.3, r: 10, life: 30, a: 0.5, c: '#b8a48a' }); D.dust.push({ f: D.f, x: p2.cx(), y: G - 4, vx: -0.5, vy: 0.3, r: 10, life: 30, a: 0.5, c: '#b8a48a' }); }
    // 3. Kael's run: dust kicks.
    if (s > 1.33 && s < 2.1 && D.f % 6 === 0) D.dust.push({ f: D.f, x: p1.cx() - 10, y: G - 4, vx: -1.2, vy: 0.4, r: 9, life: 24, a: 0.45, c: '#b8a48a' });
    // 4. The slam: the ground answers, a line of rock spikes racing from the axe to Kael, the last one throws him.
    if (once('slam', 2.03)) { D.slamX = D.blade.v ? Math.max(D.blade.v.b[0], p1.cx() + 24) : 530; hit(D.slamX, G - 6, 26, '#ffb070', 0); screenShake = 18; }
    for (let i = 0; i < 6; i++) if (D.f === Math.round((2.05 + i * 0.03) * 60)) {
      const x0 = D.slamX || 530, x = x0 + (p1.cx() + 4 - x0) * i / 5; D.spikes.push({ f: D.f, x, w: 18 + i * 4, h: 40 + i * 22 });
      spawnParticles(x, G - 10, '#8a7058', 8);
    }
    if (once('launch', 2.20)) { hit(470, G - 30, 24, '#d8c0a0', 0); screenShake = 14; slowMotion = 0.6; }
    if (s > 2.4 && slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.03);
    // 5. Varek over him: the spike. An impact (the game's own hit sound path is not used: this isn't a game hit).
    if (once('spike', 3.04)) { const B = D.blade.v ? D.blade.v.b : [472, G - 440]; D.log.spikeGap = [Math.round(B[0] - p1.cx()), Math.round(B[1] - p1.cy())]; hit((B[0] + p1.cx()) / 2, (B[1] + p1.cy()) / 2, 34, '#ffe9a0', 0); screenShake = 24; slowMotion = 0.35; D.log.impactFrame = D.f; }
    if (s > 3.12 && slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.06);
    if (once('crater', 3.18)) {
      D.crater = { f: D.f, x: 474 }; screenShake = 28; hit(474, G - 10, 40, '#d8c0a0', 0);
      for (let i = 0; i < 26; i++) D.dust.push({ f: D.f + (i % 4), x: 474 + (i - 13) * 7, y: G - 6, vx: (i - 13) * 0.45, vy: 0.4 + (i % 5) * 0.18, r: 9 + (i % 3) * 4, life: 70 + (i % 5) * 12, a: 0.55, c: i % 2 ? '#a89478' : '#7a6a58' });
    }
    if (once('landV', 3.42)) { hit(540, G - 4, 12, '#d8c0a0'); screenShake = 8; }
    // 6. The dust settling, and something in it.
    if (once('glintAt', 4.3)) D.glint = D.f;
    // Camera: tight on the lock, out for the burst, follow the run, up with the launch, down with the spike.
    const cam = s < 0.62 ? [480, G - 140, 2.3] : s < 1.3 ? [480, G - 130, 0.95] : s < 2.1 ? [(p1.cx() + p2.cx()) / 2, G - 130, 0.95]
      : s < 3.4 ? [(p1.cx() + p2.cx()) / 2, Math.min(G - 130, (p1.cy() + p2.cy()) / 2 - 20), 1.3] : [505, G - 110, 1.9];
    // The launch and the drop move faster than the camera eases: lock it to the bodies there.
    if (s >= 2.2 && s < 3.4) H.snap(cam[0], cam[1], cam[2]); else CinCam.setFocus(cam[0], cam[1], cam[2]);
    H.tickPoses();
    window.__focusScreen = () => H.focus(cam[0]);
  },
};

// BEAST — Part 2 of axeslam. Kael lies in the crater, Varek over him. The forest beast leaps over Kael
// into Varek, turns on Kael and pounces; Iaijutsu cuts it down, Kael takes its form (the BR creature-form
// code), and because he holds a katana the beast carries it in its jaws. Three toss-slashes throw Varek.
// The form grant, the slashes and their damage are the game's own; the beast's leaps and Varek's body
// are placed by keyframes (the beast here is an actor, never updated by the game).
SCENES.beast = {
  arena: 'forest', frames: 330,
  match: { p1: 'katana', p1Class: 'none', p1Color: '#00d4ff', p2: 'axe', p2Class: 'none', p2Color: '#ff3a3a' },
  install(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    const fl = H.floor(); D.G = fl.y;
    const P = Math.PI;
    if (typeof mapItems !== 'undefined') mapItems.length = 0;
    const M = q => { const o = { ...q }; for (const k of ['rArm', 'rFore', 'lArm', 'lFore', 'rLeg', 'rShin', 'lLeg', 'lShin']) if (o[k] !== undefined) o[k] = P - o[k]; if (o.headTilt) o.headTilt = -o.headTilt; return o; };
    const crumpled = { rArm: P * 0.95, rFore: P * 1.05, lArm: P * 0.70, lFore: P * 0.85, rLeg: P * 0.10, rShin: P * 0.30,
      lLeg: P * 0.25, lShin: P * 0.10, torso: 1.20, hipDrop: 30, headTilt: 0.6 };
    const landK = { rArm: P * 0.40, rFore: P * 0.55, lArm: P * 0.55, lFore: P * 0.60, rLeg: P * 0.10, rShin: P * 0.55,
      lLeg: P * 0.85, lShin: P * 0.70, torso: 0.40, hipDrop: 20 };
    const tower = { rArm: P * 0.70, rFore: P * 0.62, lArm: P * 0.40, lFore: P * 0.50, rLeg: P * 0.62, rShin: P * 0.60,
      lLeg: P * 0.38, lShin: P * 0.42, torso: 0.18, headTilt: 0.30, hipDrop: 2, sx: 1.05 };
    const towerV = { ...tower, rArm: P * 0.30, rFore: -P * 0.12 };
    const blown = { rArm: P * 1.05, rFore: P * 1.15, lArm: P * 0.80, lFore: P * 0.92, rLeg: P * 0.40, rShin: P * 0.52,
      lLeg: P * 0.70, lShin: P * 0.60, torso: -0.40, headTilt: -0.30, hipDrop: 4 };
    const skid = { rArm: P * 0.20, rFore: -P * 0.10, lArm: P * 0.95, lFore: P * 1.05, rLeg: P * 0.20, rShin: P * 0.40,
      lLeg: P * 0.80, lShin: P * 0.85, torso: 0.45, hipDrop: 16, headTilt: 0.15 };
    const runA = { rArm: P * 0.85, rFore: P * 0.95, rArmLen: 1.1, lArm: P * 0.25, lFore: -P * 0.10, rLeg: P * 0.10, rShin: P * 0.42,
      lLeg: P * 0.86, lShin: P * 1.05, torso: 0.50, hipDrop: 4, headTilt: 0.10 };
    const runB = { ...runA, rLeg: P * 0.80, rShin: P * 1.00, lLeg: P * 0.16, lShin: P * 0.46, hipDrop: 0 };
    const axeUp = { rArm: -P * 0.40, rFore: -P * 0.62, lArm: -P * 0.45, lFore: -P * 0.66, rArmLen: 1.2, lArmLen: 1.2,
      rLeg: P * 0.30, rShin: P * 0.48, lLeg: P * 0.72, lShin: P * 0.62, torso: -0.30, headTilt: -0.15, hipDrop: 4, sy: 1.06 };
    const tumble = { rArm: P * 1.20, rFore: P * 1.45, lArm: P * 1.05, lFore: P * 1.30, rLeg: P * 0.62, rShin: P * 0.95,
      lLeg: P * 0.40, lShin: P * 0.20, torso: -0.35, headTilt: -0.30 };
    H.pose(p1, [{ at: 0, pose: crumpled }, { at: 0.80, pose: crumpled }, { at: 0.98, pose: landK, ease: 'outQuad' }, { at: 5, pose: landK }]);
    // Varek faces left the whole scene (mirrored poses).
    const vb = [{ at: 0, pose: M(towerV) }, { at: 0.40, pose: M(towerV) }, { at: 0.48, pose: M(blown), ease: 'outQuad' },
      { at: 0.80, pose: M(skid), ease: 'outQuad' }, { at: 2.30, pose: M(skid) }];
    let t = 2.40; for (let i = 0; i < 4; i++, t += 0.11) vb.push({ at: t, pose: i % 2 ? M(runB) : M(runA), ease: 'linear' });
    vb.push({ at: 2.90, pose: M(axeUp), ease: 'outQuad' }, { at: 3.40, pose: M(axeUp) }, { at: 3.48, pose: M(tumble), ease: 'outQuad' }, { at: 3.92, pose: M(tumble) },
      { at: 4.05, pose: M(crumpled), ease: 'outQuad' }, { at: 7, pose: M(crumpled) });
    H.pose(p2, vb);
    D.ease = u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    D.at = (keys, s) => {
      let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= s) i++;
      const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
      if (a === b) return [a[1], a[2]];
      const u = D.ease(Math.max(0, Math.min(1, (s - a[0]) / (b[0] - a[0]))));
      return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
    };
    // Positions (seconds -> [x, height above floor]).
    D.vPos = [[0, 540, 0], [0.42, 540, 0], [0.50, 590, 30], [0.80, 720, 0], [2.30, 726, 0], [2.90, 672, 0], [3.05, 676, 0], [3.25, 680, 0], [3.40, 684, 0], [3.62, 730, 100], [3.95, 772, 0], [7, 774, 0]];
    D.bPos = [[0, 392, 150], [0.20, 450, 200], [0.42, 528, 60], [0.56, 566, 0], [1.02, 566, 0], [1.10, 540, 70], [1.20, 516, 40], [1.40, 500, 0]];
    D.G0 = D.G;
    H.place(p1, 474, D.G, 1);
    p1.health = p1.maxHealth * 0.35; p2.health = p2.maxHealth;
    // The beast: a real ForestBeast body and draw, moved by the director only.
    const bst = D.beast = new ForestBeast(330, D.G - 62);
    bst.facing = 1; bst.health = 9999; bst.maxHealth = 300; bst.animTimer = 0;
    D.crater = { x: 474 }; D.dust = []; D.stream = [];
    const d2 = p2.draw.bind(p2);
    p2.draw = function () {
      const G = D.G;
      ctx.save();
      ctx.fillStyle = '#1a1310'; ctx.beginPath(); ctx.ellipse(474, G + 2, 70, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7a5a40'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(474, G + 2, 70, 14, 0, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#4a3a30';
      for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.1 + i * 0.16); ctx.beginPath(); ctx.moveTo(474 + Math.cos(a) * 66, G); ctx.lineTo(474 + Math.cos(a) * 82, G - 18 * (1 + (i % 2))); ctx.lineTo(474 + Math.cos(a) * 92, G); ctx.fill(); }
      ctx.restore();
      d2();
      // Beast, alive or dissolving (its own draw skips a dead body, so it draws at 1 hp while it fades).
      if (D.bDraw !== false) {
        const fade = D.dieAt ? Math.max(0, 1 - (D.f - D.dieAt) / 26) : 1;
        if (fade > 0) {
          const hp = bst.health; if (hp <= 0) bst.health = 1;
          ctx.save(); ctx.globalAlpha = fade;
          if (D.dieAt) { ctx.translate(bst.cx(), bst.cy()); ctx.rotate(Math.min(1, (D.f - D.dieAt) / 20) * 0.9); ctx.translate(-bst.cx(), -bst.cy()); }
          bst._brForm = true;   // its draw skips the nameplate for form bodies
          try { bst.draw(); } catch (e) {}
          bst._brForm = null;
          ctx.restore();
          bst.health = hp;
        }
      }
      ctx.save();
      for (const d of D.dust) {
        const age = D.f - d.f; if (age < 0 || age > d.life) continue;
        const k = age / d.life;
        ctx.globalAlpha = (1 - k) * d.a; ctx.fillStyle = d.c;
        ctx.beginPath(); ctx.arc(d.x + d.vx * age, d.y - d.vy * age, d.r * (0.6 + k * 1.6), 0, Math.PI * 2); ctx.fill();
      }
      // Energy pulled from the beast's body into Kael.
      for (const e of D.stream) {
        const age = D.f - e.f; if (age < 0 || age > e.life) continue;
        const u = D.ease(age / e.life), tx = p1.cx(), ty = p1.cy();
        const x = e.x + (tx - e.x) * u + Math.sin(u * Math.PI) * e.bend, y = e.y + (ty - e.y) * u - Math.sin(u * Math.PI) * 30;
        ctx.globalAlpha = 0.9 * (1 - u * 0.5); ctx.fillStyle = e.c; ctx.shadowColor = '#7dff6a'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(x, y, e.r * (1 - u * 0.4), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    };
    D.place = s => {
      const G = D.G;
      if (!D.vFree) { const vp = D.at(D.vPos, s); p2.x = vp[0] - p2.w / 2; p2.y = G - vp[1] - p2.h; p2.vx = p2.vy = 0; p2.onGround = vp[1] < 1; }
      if (!D.dieAt) {
        const bp = D.at(D.bPos, s), px = bst.cx();
        bst.x = bp[0] - bst.w / 2; bst.y = G - bp[1] - bst.h; bst.onGround = bp[1] < 1;
        bst.vx = (bst.cx() - px); bst.animTimer++;
      } else { bst.vx = 0; bst.x += D.bvx; D.bvx *= 0.9; }
    };
    D.place(0);
    H.snap(450, D.G - 120, 1.7);
    window.__focusScreen = () => H.focus(450);
  },
  tick(H) {
    const D = H.D, p1 = players[0], p2 = players[1], bst = D.beast;
    const s = D.f / 60, G = D.G;
    if (typeof mapItems !== 'undefined') mapItems.length = 0;
    D.place(s);
    if (typeof brUpdateForms === 'function') brUpdateForms();
    if (!p1._brForm) p1.facing = 1;
    if (!D.vFree) p2.facing = -1;
    p2.cooldown = 99; p2.abilityCooldown = 99; p2.superMeter = 0;
    if (!p1._brForm) { p1.cooldown = 99; p1.abilityCooldown = 99; }
    p1.superMeter = 0;
    p1.health = Math.max(p1.health, 30); p2.health = Math.max(p2.health, 40);
    const hit = (x, y, n, col, big) => {
      spawnParticles(x, y, col || '#ffe9a0', n); spawnParticles(x, y, '#ffffff', Math.round(n / 2));
      if (big && CinFX.shockwave) CinFX.shockwave(x, y, '#ffffff', { count: 2, maxR: big, lw: 6, dur: 20 });
    };
    const once = (k, at) => { if (D.f === Math.round(at * 60)) { D.log[k] = D.f; return true; } return false; };
    // 1. The beast over Kael and into Varek.
    if (s < 0.42 && D.f % 4 === 0) spawnParticles(bst.cx(), bst.cy(), '#2f8a3a', 2);
    if (once('ram', 0.42)) { dealDamage(bst, p2, 10, 0); hit(p2.cx() - 10, p2.cy(), 24, '#ffd080', 50); screenShake = 16; slowMotion = 0.5; }
    if (s > 0.6 && s < 0.9 && slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.05);
    if (once('land', 0.56)) { for (let i = 0; i < 8; i++) D.dust.push({ f: D.f, x: 566 + (i - 4) * 12, y: G - 4, vx: (i - 4) * 0.8, vy: 0.3, r: 10, life: 30, a: 0.5, c: '#b8a48a' }); screenShake = 8; }
    // 2. It turns on Kael, crouches, and pounces.
    if (s >= 0.56 && !D.dieAt) bst.facing = -1;
    bst._slamPhase = s > 0.72 && s < 1.02 ? 'windup' : 'none';
    // 3. Iaijutsu cuts it down mid-air.
    if (once('cut', 1.12)) {
      H.unpose(p1); H.place(p1, 474, G, 1);
      p1.cooldown = 0; p1.abilityCooldown = 0;
      H.press(p1, 'q', bst);
    }
    // The Iaijutsu scene cuts at whoever the move targets (Varek), so the beast is cut where Kael's dash
    // passes through it. It has the health to survive the hit, so no kill finisher takes over the take.
    if (!D.dieAt && D.log.cut && p1.cx() >= bst.cx() - 6) {
      dealDamage(p1, bst, 28, 0);
      D.log.beastCut = D.f; bst.health = 0;
      D.dieAt = D.f; D.bvx = -5; slowMotion = 0.3; screenShake = 22;
      hit(bst.cx(), bst.cy(), 30, '#c8ffc0', 70);
    }
    if (D.dieAt && !D.landed && bst.y + bst.h < G) bst.y = Math.min(G - bst.h, bst.y + 3);
    if (s > 1.3 && s < 1.5 && slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.04);
    if (D.dieAt && D.f > D.dieAt + 4 && D.f < D.dieAt + 40 && D.f % 2 === 0) {
      for (let i = 0; i < 3; i++) D.stream.push({ f: D.f, x: bst.cx() + (Math.random() - 0.5) * 40, y: bst.cy() + (Math.random() - 0.5) * 30,
        life: 22 + (i * 4), r: 3 + Math.random() * 3, bend: (Math.random() - 0.5) * 50, c: i % 2 ? '#b8ff9a' : '#3ddc84' });
    }
    // 4. He takes its form, katana and all.
    if (once('grant', 1.95)) {
      D.log.msAtGrant = p1._msScene ? p1._msScene.key : null;
      brGrantForm(p1, 'beast');
      D.log.form = p1._brForm ? { blade: p1._brForm.blade, reach: p1._brForm.reach, label: p1._brForm.label } : null;
      hit(p1.cx(), p1.cy(), 40, '#7dff6a', 90); screenShake = 20; slowMotion = 0.5;
      for (let i = 0; i < 16; i++) D.dust.push({ f: D.f, x: 474 + (i - 8) * 9, y: G - 6, vx: (i - 8) * 0.7, vy: 0.5, r: 12, life: 50, a: 0.5, c: '#a89478' });
    }
    if (s > 2.1 && s < 2.4 && slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.04);
    if (p1._brForm) p1.facing = 1;
    // 5. Varek comes back; three toss-slashes, the third throws him.
    const strike = k => { if (!p1._brForm) return; p1.cooldown = 0; p1.attackEndlag = 0; p1.attack(p2); D.log['hit' + k] = p1.weaponHit; };
    if (once('s1', 2.95)) { strike(1); screenShake = 8; }
    if (once('s2', 3.15)) { strike(2); screenShake = 10; }
    if (once('thud', 3.95)) { hit(772, G - 6, 16, '#d8c0a0'); screenShake = 12; for (let i = 0; i < 8; i++) D.dust.push({ f: D.f, x: 772 + (i - 4) * 10, y: G - 4, vx: (i - 4) * 0.6, vy: 0.3, r: 10, life: 36, a: 0.5, c: '#b8a48a' }); }
    if (once('s3', 3.40)) {
      strike(3);
      hit(p2.cx(), p2.cy(), 34, '#ffe6b0', 80); screenShake = 24; slowMotion = 0.35;
    }
    if (s > 3.55 && slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.04);
    const cam = s < 0.5 ? [460, G - 120, 1.7] : s < 1.05 ? [540, G - 110, 1.8] : s < 1.6 ? [550, G - 90, 2.0]
      : s < 2.6 ? [590, G - 80, 2.4] : s < 3.45 ? [640, G - 95, 2.0] : [(p2.cx() + 624) / 2, G - 100, 1.6];
    if (s >= 1.1 && s < 1.2) H.snap(cam[0], cam[1], cam[2]); else CinCam.setFocus(cam[0], cam[1], cam[2]);
    H.tickPoses();
    window.__focusScreen = () => H.focus(cam[0]);
  },
};

// MINES — "He's not running." Three chase him across the floor; six of his sticky bombs already lie
// on it. He stops past the last one, turns round, and holds Q: the game's own Remote Detonation sets
// them all off under the three (the blasts chain on their own, smb-weapons-ext.js _wxResolveBlasts).
SCENES.mines = {
  arena: 'grass', frames: 330,
  match: { p1: 'bomb', p1Class: 'none', p1Color: '#00d4ff', p2: 'axe', p2Class: 'none', p2Color: '#ff3a3a' },
  install(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    const fl = H.floor();
    D.floorY = fl.y;
    settings.finishers = false;   // three at once: a finisher on the first would make the game refuse the other two
    const extra = [['spear', '#ff9a2a'], ['sword', '#ffe03a']].map(([wk, col]) => {
      const f = new Fighter(0, fl.y - 60, col, wk, { left: null, right: null, jump: null, attack: null, ability: null, super: null }, true, 'easy');
      f.updateAI = function () {}; f.aiTickInterval = 1;
      f.lives = 3; f.playerNum = players.length + 1; f.name = '';
      players.push(f);
      return f;
    });
    D.foes = [p2, ...extra];
    for (const f of D.foes) { f.target = p1; f._domainSuperCount = 0; }
    // The field: six stickies already on the ground, close enough that one blast reaches the next.
    D.field = [0, 1, 2, 3, 4, 5].map(i => 312 + i * 34);
    p1._wxBombs = [];
    for (const x of D.field) _wxNewBomb(p1, { sticky: true, fuse: Infinity, armed: 0, r: 6, dmg: 14, kb: 20, blastR: 62, x, y: fl.y - 6, py: fl.y - 6, vx: 0, vy: 0, onSurface: true });
    H.place(p1, 430, fl.y, -1);
    D.foes.forEach((f, i) => H.place(f, 690 + i * 44, fl.y, -1));
    p1.health = p1.maxHealth;
    H.snap(420, p1.cy() - 40, 1.05);
    // Bombs are dark 6px balls on a phone: a red blink and a ground ring on each one that's armed.
    const d1 = p1.draw.bind(p1);
    p1.draw = function () {
      const w = p1.weapon, t = w && w.type;
      if (w) w.type = 'thrown';   // no cooldown bar / READY over his head
      try { d1(); } finally { if (w) w.type = t; }
      ctx.save();
      for (const bm of (p1._wxBombs || [])) {
        if (bm.dead || !bm.sticky) continue;
        const ph = (H.D.f + Math.round(bm.x / 34) * 5) % 24, on = ph < 12;
        ctx.globalAlpha = on ? 0.55 : 0.2; ctx.strokeStyle = '#ff2a2a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(bm.x, bm.y + 5, 13 + (on ? ph * 0.5 : 0), 3.2, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = on ? 1 : 0.35; ctx.fillStyle = '#ff3030';
        ctx.beginPath(); ctx.arc(bm.x, bm.y - bm.r - 1.5, 2.6, 0, Math.PI * 2); ctx.fill();
        if (on) { ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(bm.x, bm.y - bm.r - 1.5, 6, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
    };
  },
  tick(H) {
    const D = H.D, p1 = players[0], foes = D.foes;
    const lead = foes[0];
    switch (D.phase) {
      case 'start': H.go('run'); break;
      case 'run': {
        // Running from them, across his own field. They're faster.
        p1.facing = -1; p1.vx = -3.2;
        for (const f of foes) { f.facing = -1; f.vx = -4.6; }
        if (p1.cx() <= 262) { p1.vx = 0; H.go('turn'); }
        break;
      }
      case 'turn': {
        p1.vx = 0;
        if (D.t === 6) p1.facing = 1;
        for (const f of foes) { f.facing = -1; f.vx = -4.6; }
        // All three on the field: the last one past the far bomb.
        const last = foes[foes.length - 1];
        if (last.cx() < D.field[5] + 10) {
          for (const f of foes) { f.lives = 1; f.health = 12; f.invincible = 0; f.shielding = false; }
          slowMotion = 0.3;
          p1.stunTimer = 0;
          _wxDetonateStickies(p1);
          D.log.boom = D.f;
          H.go('boom');
        }
        break;
      }
      case 'boom': {
        if (D.t > 40 && slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.02);
        break;
      }
    }
    if (D.phase !== 'boom') for (const f of foes) { f.lives = 3; if (f.health < f.maxHealth * 0.5) f.health = f.maxHealth; }
    for (const f of foes) f.cooldown = Math.max(f.cooldown, 2);
    p1.lives = 3; p1.cooldown = Math.max(p1.cooldown, 2);
    const cx = D.phase === 'boom' ? 372 : Math.max(372, Math.min(440, (p1.cx() + lead.cx()) / 2));
    CinCam.setFocus(cx, p1.cy() - 40, 1.05);
    H.tickPoses();
    window.__focusScreen = () => H.focus(cx);
  },
};

// MIRROR — "1 HP. 3 guns." He is one hit from gone and three gunners open up. Mirrorwall (the Glass
// Blade's own E) goes up in front of him; each shot comes straight back down its own line. They fire
// front to back, so each return passes the ones already down and finds its shooter.
SCENES.mirror = {
  arena: 'city', frames: 300,
  match: { p1: 'glassblade', p1Class: 'none', p1Color: '#00d4ff', p2: 'gun', p2Class: 'none', p2Color: '#ff3a3a' },
  install(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    const fl = H.floor();
    D.floorY = fl.y;
    settings.finishers = false;
    const extra = [['gun', '#ff9a2a'], ['gun', '#ffe03a']].map(([wk, col]) => {
      const f = new Fighter(0, fl.y - 60, col, wk, { left: null, right: null, jump: null, attack: null, ability: null, super: null }, true, 'easy');
      f.updateAI = function () {}; f.aiTickInterval = 1;
      f.lives = 3; f.playerNum = players.length + 1; f.name = '';
      players.push(f);
      return f;
    });
    D.foes = [p2, ...extra];
    p1._teamId = 1;
    for (const f of D.foes) { f.target = p1; f._domainSuperCount = 0; f._teamId = 2; }
    H.place(p1, 330, fl.y, 1);
    D.foes.forEach((f, i) => H.place(f, 480 + i * 48, fl.y, -1));
    p1.health = 1;
    H.bleed(p1, fl.y);
    H.snap(450, p1.cy() - 40, 1.0);
    // Ranged HUD over the gunners' heads (cooldown bar, READY, ammo) is not the fighter.
    for (const f of D.foes) {
      const d = f.draw.bind(f);
      f.draw = function () { const w = f.weapon, t = w && w.type, cs = w && w.clipSize; if (w) { w.type = 'thrown'; if (cs) w.clipSize = 0; } try { d(); } finally { if (w) { w.type = t; if (cs) w.clipSize = cs; } } };
    }
  },
  tick(H) {
    const D = H.D, p1 = players[0], foes = D.foes;
    switch (D.phase) {
      case 'start': H.go('wall'); break;
      case 'wall': {
        if (D.t === 1) { H.press(p1, 'e', foes[0]); D.log.wall = D.f; }
        // Front to back, so each return passes the ones already down.
        foes.forEach((f, i) => {
          if (D.t === 4 + i * 26 && f.health > 0) {
            f.cooldown = 0; f.attackEndlag = 0; f.facing = -1;
            if (f.weapon) { f.ammo = f.weapon.clipSize || 99; f.reloading = 0; }
            f.attack(p1);
            (D.log.shots || (D.log.shots = [])).push(D.f);
            if (i === 0) for (const g of foes) { g.lives = 1; g.health = 10; g.invincible = 0; g.shielding = false; }
          }
        });
        if (D.t > 4 + 2 * 26 && foes.every(f => f.health <= 0) && !D.log.clear) { D.log.clear = D.f; H.go('after'); }
        if (D.t > 200) H.go('after');
        break;
      }
      case 'after': break;
    }
    for (const f of foes) { if (f.health > 0) { f.vx = 0; f.facing = -1; } f.cooldown = Math.max(f.cooldown, 2); }
    for (const f of foes) if (f.health > 0 && !D.log.shots) { f.lives = 3; }
    p1.lives = 3; p1.health = 1; p1.facing = 1; p1.cooldown = Math.max(p1.cooldown, 2);
    for (const f of foes) if (f.health <= 0 && !(D.log.dead || (D.log.dead = {}))[foes.indexOf(f)]) D.log.dead[foes.indexOf(f)] = D.f;
    const cx = 450;
    CinCam.setFocus(cx, p1.cy() - 40, 1.0);
    H.tickPoses();
    window.__focusScreen = () => H.focus(cx);
  },
};

// SHATTER — "One more crack and it shatters." The axe lands and the Glass Blade goes to 2 of 3 cracks
// (the game's own Fragile count, logged as D.log.cracks). Three close round him: axe on the right, spear
// on the left, sword leaping in from above. He lets the axe land the third crack, and the shatter's own
// ring of shards (_wxUpdateGlass at 3 cracks) finds all three.
SCENES.shatter = {
  arena: 'city', frames: 220,
  match: { p1: 'glassblade', p1Class: 'none', p1Color: '#00d4ff', p2: 'axe', p2Class: 'none', p2Color: '#ff3a3a' },
  install(H) {
    const D = H.D, p1 = players[0], p2 = players[1];
    const fl = H.floor();
    D.floorY = fl.y;
    settings.finishers = false;
    const extra = [['spear', '#ff9a2a'], ['sword', '#ffe03a']].map(([wk, col]) => {
      const f = new Fighter(0, fl.y - 60, col, wk, { left: null, right: null, jump: null, attack: null, ability: null, super: null }, true, 'easy');
      f.updateAI = function () {}; f.aiTickInterval = 1;
      f.lives = 3; f.playerNum = players.length + 1; f.name = '';
      players.push(f);
      return f;
    });
    D.foes = [p2, ...extra];
    D.spear = extra[0]; D.sword = extra[1];
    for (const f of D.foes) { f.target = p1; f._domainSuperCount = 0; }
    H.place(p1, 440, fl.y, 1);
    H.place(p2, 486, fl.y, -1);
    H.place(D.spear, 290, fl.y, 1);
    H.place(D.sword, 640, fl.y, -1);
    p1.health = p1.maxHealth;
    // One crack already in it; the axe makes it two.
    _wxGlass(p1).cracks = 1; _wxGlass(p1).hp = p1.health;
    D.log.cracks = [[0, 1]];
    H.snap(450, p1.cy() - 40, 1.5);
  },
  tick(H) {
    const D = H.D, p1 = players[0], foes = D.foes, p2 = foes[0];
    const g = _wxGlass(p1);
    const swing = f => { f.cooldown = 0; f.attackEndlag = 0; f.stunTimer = 0; f.facing = p1.cx() > f.cx() ? 1 : -1; f.attack(p1); };
    switch (D.phase) {
      case 'start': H.go('axe'); break;
      case 'axe': {
        if (D.t === 1) swing(p2);
        // The other two close in while he recovers.
        D.spear.vx = 2.4; D.spear.facing = 1;
        D.sword.vx = -2.2; D.sword.facing = -1;
        if (D.t > 40) H.go('ring');
        break;
      }
      case 'ring': {
        // Spear walks up on his left; the sword leaps in over his right shoulder; the axe winds up again.
        if (D.spear.cx() < p1.cx() - 84) { D.spear.vx = 2.4; D.spear.facing = 1; } else D.spear.vx = 0;
        if (D.t === 1) { D.from = { x: D.sword.cx(), y: D.sword.y + D.sword.h }; D.log.leap = D.f; }
        const u = Math.min(1, D.t / 30);
        const to = { x: p1.cx() + 38, y: p1.cy() - 12 };
        const pt = H.arc(D.from, to, 40, H.ease(u));
        D.sword.x = pt.x - D.sword.w / 2; D.sword.y = pt.y - D.sword.h; D.sword.vx = 0; D.sword.vy = 0; D.sword.onGround = false; D.sword.facing = -1;
        if (p2.cx() - p1.cx() > 54) { p2.vx = -1.6; p2.facing = -1; } else p2.vx = 0;
        if (D.t === 18) {
          // The spear stands in the axe's splash: he only goes low once the blade has broken, so the shards take him.
          for (const f of foes) { if (f === D.spear) continue; f.lives = 1; f.health = 5; f.invincible = 0; f.shielding = false; }
          swing(p2);
          D.log.swing2 = D.f;
        }
        if (D.t > 18 && D.spear.health > 0 && g.broken <= 0) D.spear.health = D.spear.maxHealth;
        if (g.broken > 0) { D.spear.lives = 1; D.spear.health = 5; D.spear.shielding = false; slowMotion = 0.3; D.log.boom = D.f; H.go('boom'); }
        if (D.t > 80) H.go('boom');
        break;
      }
      case 'boom': {
        // The extras were made after helpersInstall, so they keep real i-frames: the axe's splash would shield the spear.
        for (const f of foes) f.invincible = 0;
        if (D.t < 4 && D.sword.health > 0) { D.sword.vy = 0; D.sword.y = Math.min(D.sword.y, p1.cy() - 12 - D.sword.h); }
        if (D.t > 50 && slowMotion < 1) slowMotion = Math.min(1, slowMotion + 0.025);
        break;
      }
    }
    if (D.phase === 'axe') for (const f of foes) { f.lives = 3; if (f.health < f.maxHealth * 0.5) f.health = f.maxHealth; }
    for (const f of foes) if (!(D.phase === 'axe' && f === p2 && D.t < 3) && !(D.phase === 'ring' && f === p2 && D.t === 18)) f.cooldown = Math.max(f.cooldown, 2);
    p1.lives = 3; p1.cooldown = Math.max(p1.cooldown, 2); p1.vx *= 0.8; p1.facing = 1;
    if (g.broken <= 0 && D.log.cracks[D.log.cracks.length - 1][1] !== g.cracks) D.log.cracks.push([D.f, g.cracks]);
    if (g.broken > 0 && !D.log.broke) D.log.broke = D.f;
    for (const f of foes) if (f.health <= 0 && !(D.log.dead || (D.log.dead = {}))[foes.indexOf(f)]) D.log.dead[foes.indexOf(f)] = D.f;
    const cx = 450;
    CinCam.setFocus(cx, p1.cy() - 50, 1.5);
    H.tickPoses();
    window.__focusScreen = () => H.focus(cx);
  },
};

const probe = () => {
  const D = window.__dir || {};
  const p1 = players[0], p2 = players[1];
  const a = p1._wxAnchor;
  const kn = p1._wxKnives;
  return { kn: kn ? kn.map(k => k.state[0]).join('') : '', fx: window.__focusScreen ? Math.round(window.__focusScreen()) : null, sp1: window.__wx ? Math.round(window.__wx.a * p1.cx() + window.__wx.e) : null, sp2: window.__wx ? Math.round(window.__wx.a * p2.cx() + window.__wx.e) : null, cx: window.__cropX == null ? null : Math.round(window.__cropX), ccx: typeof camCX !== 'undefined' ? Math.round(camCX) : null, cz: typeof camZoom !== 'undefined' ? +(+camZoom).toFixed(2) : null, ph: D.phase, f: D.f, h1: Math.round(p1.health), h2: Math.round(p2.health), x1: Math.round(p1.cx()), y1: Math.round(p1.y + p1.h),
    x2: Math.round(p2.cx()), y2: Math.round(p2.y + p2.h), an: a ? a.state + (a.pull ? ':' + a.pull.mode : '') : '', k: p1._wxKeel ? p1._wxKeel.t : 0,
    fin: activeFinisher ? (activeFinisher.def && activeFinisher.def.name) || 1 : 0, l2: p2.lives, run: gameRunning, z: +camZoomCur.toFixed(2), sm: +slowMotion.toFixed(2) };
};

(async () => {
  const cmd = process.argv[2] || 'list';
  if (cmd === 'list') { console.log(Object.keys(SCENES).join('\n')); return; }
  const name = process.argv[3], profName = process.argv[4] || 'draft';
  const sc = SCENES[name], prof = PROFILES[profName];
  if (cmd !== 'capture' || !sc || !prof) throw new Error('usage: node moves.js capture <' + Object.keys(SCENES).join('|') + '> [draft|vert]');
  const s = await openSession({ width: prof.width, height: prof.height, port: prof.port });
  await hookAudio(s);
  await s.startMatch(Object.assign({ mode: '2p', arena: sc.arena, p1Bot: false, p2Bot: false }, sc.match));
  await quiet(s);
  await s.eval((hInst, inst, tick) => {
    (new Function('return (' + hInst + ')'))()();
    const H = window.__H;
    (new Function('return (' + inst + ')'))()(H);
    const t = new Function('return (' + tick + ')')();
    const orig = window.__step;
    window.__step = function (n) {
      for (let i = 0; i < n; i++) {
        if (window.__manual) { H.D.f++; H.D.t++; H.noTraffic(); try { t(H); } catch (e) { (H.D.log.err || (H.D.log.err = [])).length < 3 && H.D.log.err.push('tick ' + H.D.f + ': ' + e.message); } }
        const ce = console.error; console.error = function () { const m = [...arguments].map(String).join(' '); (H.D.log.err || (H.D.log.err = [])).length < 5 && H.D.log.err.push('f' + H.D.f + ' ' + m.slice(0, 300)); return ce.apply(console, arguments); };
        try { orig(1); } finally { console.error = ce; }
      }
    };
  }, helpersInstall.toString(), sc.install.toString().replace(/^install/, 'function'), sc.tick.toString().replace(/^tick/, 'function'));
  const out = path.join(__dirname, 'work', profName, name);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const { log } = await record(s, out, Number(process.env.FRAMES || sc.frames), { fps: FPS, probe, cropW: prof.cropW });
  const marks = await s.eval(() => Object.assign({ titles: window.__finTitles, texts: window.__texts }, window.__dir.log));
  const j = JSON.parse(fs.readFileSync(out + '.json', 'utf8')); j.marks = marks; fs.writeFileSync(out + '.json', JSON.stringify(j));
  console.log('marks', JSON.stringify(marks));
  const ph = []; log.forEach((e, i) => { if (e && (!ph.length || ph[ph.length - 1][1] !== e.ph)) ph.push([i, e.ph]); });
  console.log('phases', JSON.stringify(ph));
  for (let i = 0; i < log.length; i += Number(process.env.EVERY || 20)) console.log(i, JSON.stringify(log[i]));
  console.log('last', JSON.stringify(log[log.length - 1]));
  console.log('errors', s.errors.slice(0, 5).join(' | '));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
