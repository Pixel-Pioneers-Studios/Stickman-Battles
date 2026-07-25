'use strict';
// smb-story-prologue-tuesday.js — the playable cold open.
//
// Ported from the Axiom Prequel's chapters 0-1 ("BEFORE / Tuesday" and the alley
// ambush). Two deliberate deviations from that source:
//
//   1. The scene stays UNATTRIBUTED. The prequel names him on its final beat;
//      here that would spoil the main game's twist, and canon.md wants the
//      ambiguity anyway ("the player cannot tell this is not Kael").
//   2. The ambush is not playable. Canon: "He does not decide to fight — his
//      body refuses... He should lose. He does not lose." Handing the player a
//      fight would contradict the one thing the scene is about.
//
// Fully self-contained: own canvas, own loop, own input. Touches no game state,
// so it cannot perturb gameLoop or the story engine.

const TUES_W = 900, TUES_H = 520;
const TUES_WORLD = 1320;
const TUES_GROUND = 430;

const TUES_BEATS = [
  { x: 84,  text: 'Home City.' },
  { x: 208,  text: 'Tuesday. The unremarkable kind.' },
  { x: 327,  text: 'The kind nobody keeps.' },
  { x: 459,  text: 'You had groceries. One bag, splitting at the corner.' },
  { x: 605,  text: 'You were nobody. This is important.' },
  { x: 737, text: 'You were nobody at all.' },
  { x: 869, text: 'Three blocks from home.' },
  { x: 987, text: "You weren't looking for a fight." },
  { x: 1085, text: 'He came from the left.' },
];

// Post-ambush beats, played on a timer rather than by position.
const TUES_AFTER = [
  { t: 24,  text: 'He wanted the bag.' },
  { t: 110, text: 'You did not decide anything.' },
  { t: 200, text: 'Your body refused.' },
  { t: 300, text: 'You should have lost.' },
  { t: 400, text: 'You did not lose.' },
  { t: 520, text: 'The bag tore. The milk ran into the gutter and kept going.' },
  { t: 640, text: 'You never understood how.' },
];

var TuesdayPrologue = (function () {
  let cv = null, cx = null, raf = 0, onDone = null, running = false;
  let px = 40, pvx = 0, facing = 1, walkPhase = 0;
  let camX = 0, t = 0, beatIdx = 0, caption = null, capT = 0;
  let phase = 'walk';          // 'walk' | 'ambush' | 'after' | 'out'
  let ambT = 0, afterIdx = 0, shake = 0, flash = 0, fade = 0;
  let mugX = 0, mugKb = 0, mugDown = 0, bagGone = false;
  const keys = {};
  let buildings = [];

  function seedBuildings() {
    buildings = [];
    // Three parallax depths; deterministic so the walk looks the same every run.
    let s = 20260724;
    const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (const layer of [{ d: 0.25, n: 26, hi: 210, col: '#141a2c' },
                         { d: 0.45, n: 22, hi: 165, col: '#1b2338' },
                         { d: 0.70, n: 18, hi: 120, col: '#232c45' }]) {
      for (let i = 0; i < layer.n; i++) {
        const w = 60 + rnd() * 90;
        buildings.push({
          d: layer.d, col: layer.col,
          x: i * (TUES_WORLD / layer.n) + rnd() * 40,
          w, h: 70 + rnd() * layer.hi,
          lit: Math.floor(rnd() * 14),
        });
      }
    }
  }

  function onKeyDown(e) {
    keys[e.code] = true;
    if (e.code === 'Escape') { finish(true); return; }
    if (['ArrowLeft', 'ArrowRight', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  }
  function onKeyUp(e) { keys[e.code] = false; }

  function say(text) { caption = text; capT = 0; }

  function update() {
    t++;
    if (shake > 0) shake *= 0.88;
    if (flash > 0) flash -= 0.06;

    if (phase === 'walk') {
      const left  = keys.KeyA || keys.ArrowLeft;
      const right = keys.KeyD || keys.ArrowRight;
      const acc = (right ? 0.55 : 0) - (left ? 0.55 : 0);
      pvx = Math.max(-3.4, Math.min(3.4, pvx + acc));
      if (!acc) pvx *= 0.82;
      px = Math.max(20, Math.min(TUES_WORLD - 40, px + pvx));
      if (Math.abs(pvx) > 0.2) { facing = Math.sign(pvx); walkPhase += Math.abs(pvx) * 0.13; }

      while (beatIdx < TUES_BEATS.length && px >= TUES_BEATS[beatIdx].x) say(TUES_BEATS[beatIdx++].text);
      if (px >= 1155) { phase = 'ambush'; ambT = 0; mugX = px - 300; caption = null; }
    } else if (phase === 'ambush') {
      ambT++;
      // He closes from the left, unhurried, then the scene takes over.
      if (ambT < 90) { mugX += (px - 58 - mugX) * 0.045; pvx *= 0.8; px += pvx; }
      if (ambT === 90) { say(TUES_AFTER[0].text); afterIdx = 1; shake = 5; flash = 0.5; }
      if (ambT > 90) { phase = 'after'; ambT = 0; }
    } else if (phase === 'after') {
      ambT++;
      // Impacts land on him, not by him — three beats, then it is over.
      // He should lose. He does not lose — so the impacts land on the other man.
      if (ambT === 90 || ambT === 200 || ambT === 330) { shake = 7; flash = 0.55; mugKb = 26; }
      if (ambT === 330) mugDown = 1;
      if (mugKb > 0) { mugX -= mugKb * 0.35; mugKb *= 0.86; }
      if (mugDown > 0 && mugDown < 1.6) mugDown += 0.02;
      if (afterIdx < TUES_AFTER.length && ambT >= TUES_AFTER[afterIdx].t) {
        if (TUES_AFTER[afterIdx].text.indexOf('bag tore') >= 0) bagGone = true;
        say(TUES_AFTER[afterIdx++].text);
      }
      if (ambT > 800) { phase = 'out'; }
    } else if (phase === 'out') {
      fade += 0.014;
      if (fade >= 1) { finish(false); return; }
    }

    capT++;
    camX = Math.max(0, Math.min(TUES_WORLD - TUES_W, px - TUES_W * 0.42));
  }

  function figure(sx, sy, sc, col, phaseV, isMug) {
    cx.save();
    cx.translate(sx, sy);
    cx.scale(sc * (isMug ? 1 : facing), sc);
    const sw = Math.sin(phaseV) * 5;
    cx.strokeStyle = col; cx.lineWidth = 2.6; cx.lineCap = 'round';
    cx.beginPath();
    cx.moveTo(0, -30); cx.lineTo(0, -12);                      // spine
    cx.moveTo(0, -24); cx.lineTo(7 + sw * 0.3, -16);           // arm (bag side)
    cx.moveTo(0, -24); cx.lineTo(-7, -16);
    cx.moveTo(0, -12); cx.lineTo(sw * 0.7, 0);                 // legs
    cx.moveTo(0, -12); cx.lineTo(-sw * 0.7, 0);
    cx.stroke();
    cx.fillStyle = isMug ? '#6b6b74' : '#d8c9a8';
    cx.beginPath(); cx.arc(0, -36, 5.6, 0, Math.PI * 2); cx.fill();
    if (!isMug && !bagGone) {                                  // the bag
      cx.fillStyle = '#8a7f66';
      cx.fillRect(6, -15, 8, 10);
    }
    cx.restore();
  }

  function draw() {
    const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
    cx.save();
    cx.translate(sx, sy);

    const sky = cx.createLinearGradient(0, 0, 0, TUES_H);
    sky.addColorStop(0, '#070912');
    sky.addColorStop(0.55, '#131a2e');
    sky.addColorStop(1, '#1d2438');
    cx.fillStyle = sky; cx.fillRect(-20, -20, TUES_W + 40, TUES_H + 40);

    // Moon + halo
    const mx = 700 - camX * 0.06, my = 96;
    const halo = cx.createRadialGradient(mx, my, 0, mx, my, 130);
    halo.addColorStop(0, 'rgba(200,215,255,0.20)');
    halo.addColorStop(1, 'rgba(200,215,255,0)');
    cx.fillStyle = halo; cx.beginPath(); cx.arc(mx, my, 130, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#e6ecff'; cx.beginPath(); cx.arc(mx, my, 15, 0, Math.PI * 2); cx.fill();

    for (const b of buildings) {
      const bx = b.x - camX * b.d;
      if (bx + b.w < -30 || bx > TUES_W + 30) continue;
      const by = TUES_GROUND - b.h;
      cx.fillStyle = b.col;
      cx.fillRect(bx, by, b.w, b.h);
      cx.fillStyle = 'rgba(255,226,150,0.5)';
      for (let i = 0; i < b.lit; i++) {
        const wx = bx + 8 + (i * 17) % Math.max(12, b.w - 16);
        const wy = by + 12 + Math.floor((i * 17) / Math.max(12, b.w - 16)) * 20;
        if (wy < TUES_GROUND - 10) cx.fillRect(wx, wy, 5, 7);
      }
    }

    // Haze band over the skyline
    const hz = cx.createLinearGradient(0, TUES_GROUND - 120, 0, TUES_GROUND);
    hz.addColorStop(0, 'rgba(90,110,160,0)');
    hz.addColorStop(1, 'rgba(90,110,160,0.20)');
    cx.fillStyle = hz; cx.fillRect(0, TUES_GROUND - 120, TUES_W, 120);

    // Wet road + reflections
    cx.fillStyle = '#0f1220'; cx.fillRect(0, TUES_GROUND, TUES_W, TUES_H - TUES_GROUND);
    cx.fillStyle = 'rgba(120,140,190,0.05)';
    cx.fillRect(0, TUES_GROUND, TUES_W, 46);
    cx.strokeStyle = 'rgba(150,170,220,0.10)'; cx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const ly = TUES_GROUND + 10 + i * 13;
      cx.beginPath(); cx.moveTo(0, ly); cx.lineTo(TUES_W, ly); cx.stroke();
    }

    const psx = px - camX, psy = TUES_GROUND;
    if (phase !== 'walk') {
      cx.save();
      if (mugDown > 0) { cx.translate(mugX - camX, psy); cx.rotate(-Math.min(1.5, mugDown)); cx.translate(-(mugX - camX), -psy); }
      figure(mugX - camX, psy, 1.7, '#3d4150', 0, true);
      cx.restore();
    }
    figure(psx, psy, 1.7, '#5b6478', walkPhase, false);

    if (flash > 0) {
      cx.fillStyle = 'rgba(255,240,220,' + Math.max(0, flash * 0.5) + ')';
      cx.fillRect(0, 0, TUES_W, TUES_H);
    }
    cx.restore();

    // Vignette
    const vg = cx.createRadialGradient(TUES_W / 2, TUES_H / 2, TUES_H * 0.35, TUES_W / 2, TUES_H / 2, TUES_H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.72)');
    cx.fillStyle = vg; cx.fillRect(0, 0, TUES_W, TUES_H);

    if (caption) {
      const a = Math.min(1, capT / 26);
      cx.globalAlpha = a;
      cx.fillStyle = '#e8e4d8';
      cx.font = 'italic 17px Georgia, serif';
      cx.textAlign = 'center';
      cx.shadowColor = '#000'; cx.shadowBlur = 8;
      cx.fillText(caption, TUES_W / 2, 66);
      cx.shadowBlur = 0;
      cx.globalAlpha = 1;
    }

    if (phase === 'walk') {
      cx.fillStyle = 'rgba(220,220,235,' + (0.20 + Math.sin(t * 0.05) * 0.08) + ')';
      cx.font = '11px "Segoe UI", Arial, sans-serif';
      cx.textAlign = 'center';
      cx.fillText(px < 160 ? 'hold  D  or  →  to walk' : 'esc to skip', TUES_W / 2, TUES_H - 22);
    }

    if (fade > 0) {
      cx.fillStyle = 'rgba(0,0,0,' + Math.min(1, fade) + ')';
      cx.fillRect(0, 0, TUES_W, TUES_H);
    }
  }

  function frame() {
    if (!running) return;
    update();
    if (running) draw();
    raf = requestAnimationFrame(frame);
  }

  function finish(skipped) {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
    cv = null; cx = null;
    const cb = onDone; onDone = null;
    if (typeof cb === 'function') cb(!!skipped);
  }

  return {
    play(done) {
      if (running) return;
      onDone = done;
      px = 40; pvx = 0; facing = 1; walkPhase = 0; camX = 0; t = 0;
      beatIdx = 0; caption = null; capT = 0; phase = 'walk';
      ambT = 0; afterIdx = 0; shake = 0; flash = 0; fade = 0; mugX = 0; mugKb = 0; mugDown = 0; bagGone = false;
      seedBuildings();
      cv = document.createElement('canvas');
      cv.id = 'tuesdayPrologue';
      cv.width = TUES_W; cv.height = TUES_H;
      cv.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:9600', 'background:#000',
        'width:100vw', 'height:100vh', 'object-fit:contain', 'display:block',
      ].join(';');
      document.body.appendChild(cv);
      cx = cv.getContext('2d');
      window.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('keyup', onKeyUp, true);
      running = true;
      frame();
      return true;
    },
    isRunning() { return running; },
    skip() { finish(true); },
  };
})();
