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
      if (typeof mapPerkState !== 'undefined') { if (mapPerkState.cityCars) mapPerkState.cityCars.length = 0; if (mapPerkState.cars) mapPerkState.cars.length = 0; }
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
