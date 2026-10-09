'use strict';
// smb-drawing-hud.js — Story subtitle, objective HUD, cinematic letterbox, story opponent name HUD
// Depends on: smb-globals.js, smb-data-arenas.js, smb-particles-core.js

// Canvas fills 100vw × 100vh and canvas.width = window.innerWidth, so
// getBoundingClientRect() CSS-pixel values map 1:1 to canvas coordinates.
//
// Called several times per frame (camera, story HUD, banners). Reading the rect
// forces a synchronous layout, so it is cached and refreshed only when #hud
// changes size, the window resizes, or at most once a second as a backstop.
let _hudGeomCache = null, _hudGeomFrame = -9999, _hudGeomWatched = false;
function _hudGeom() {
  const f = typeof frameCount !== 'undefined' ? frameCount : 0;
  if (_hudGeomCache && f - _hudGeomFrame < 60 && f >= _hudGeomFrame) return _hudGeomCache;
  const el = document.getElementById('hud');
  if (!el) return { bottom: 0, height: 0 };
  if (!_hudGeomWatched) {
    _hudGeomWatched = true;
    const drop = () => { _hudGeomCache = null; };
    window.addEventListener('resize', drop);
    if (typeof ResizeObserver === 'function') new ResizeObserver(drop).observe(el);
  }
  _hudGeomCache = { bottom: el.getBoundingClientRect().bottom, height: el.offsetHeight };
  _hudGeomFrame = f;
  return _hudGeomCache;
}
function _hudBottom() {
  return _hudGeom().bottom;
}

function drawStorySubtitle() {
  if (!storyFightSubtitle || storyFightSubtitle.timer <= 0) return;
  storyFightSubtitle.timer--;

  const { text, timer, maxTimer, color, speaker } = storyFightSubtitle;
  const fadeIn  = Math.min(1, (maxTimer - timer) / 20);
  const fadeOut = Math.min(1, timer / 30);
  const alpha   = Math.min(fadeIn, fadeOut);
  if (alpha <= 0) return;

  const cw = canvas.width;
  const ch = canvas.height;
  const isGuide   = !!speaker;
  const fontSize  = Math.round(cw * 0.022);
  const labelSize = Math.round(cw * 0.014);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // guarantee screen-space regardless of caller transform state
  ctx.font = `${isGuide ? 'bold' : 'italic'} ${fontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center';
  // Cache measureText width on the subtitle object — recompute only when text or font size changes
  const _measKey = text + '|' + fontSize;
  if (storyFightSubtitle._measuredFor !== _measKey) {
    storyFightSubtitle._measuredW   = ctx.measureText(text).width;
    storyFightSubtitle._measuredFor = _measKey;
  }
  const textW = storyFightSubtitle._measuredW;
  const padX = 28, padY = 12;
  const labelH = isGuide ? labelSize + 10 : 0;
  const bx = cw / 2 - textW / 2 - padX;
  const by = ch - fontSize - padY * 2 - 32 - (isGuide ? labelH + 4 : 0);
  const bw = textW + padX * 2;
  const bh = fontSize + padY * 2;
  const r  = bh / 2;

  // guide label tab above the box
  if (isGuide) {
    ctx.font = `bold ${labelSize}px "Segoe UI", Arial, sans-serif`;
    const labelW = ctx.measureText('🧭 ' + speaker).width + 20;
    const lx = cw / 2 - labelW / 2;
    const ly = by - labelH + 2;
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = 'rgba(60,30,100,0.92)';
    ctx.beginPath();
    ctx.moveTo(lx + 5, ly); ctx.lineTo(lx + labelW - 5, ly);
    ctx.arcTo(lx + labelW, ly, lx + labelW, ly + 5, 5);
    ctx.lineTo(lx + labelW, ly + labelH - 5);
    ctx.arcTo(lx + labelW, ly + labelH, lx + labelW - 5, ly + labelH, 5);
    ctx.lineTo(lx + 5, ly + labelH);
    ctx.arcTo(lx, ly + labelH, lx, ly + labelH - 5, 5);
    ctx.lineTo(lx, ly + 5);
    ctx.arcTo(lx, ly, lx + 5, ly, 5);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ccaaff';
    ctx.shadowColor = '#aa66ff'; ctx.shadowBlur = 6;
    ctx.fillText('🧭 ' + speaker, cw / 2, ly + labelSize * 0.85 + 4);
    ctx.shadowBlur = 0;
  }

  // pill background
  ctx.font = `${isGuide ? 'bold' : 'italic'} ${fontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.globalAlpha = alpha * 0.82;
  ctx.fillStyle = isGuide ? 'rgba(40,15,70,0.92)' : 'rgba(0,0,0,0.78)';
  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  ctx.lineTo(bx + bw - r, by);
  ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
  ctx.lineTo(bx + bw, by + bh - r);
  ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
  ctx.lineTo(bx + r, by + bh);
  ctx.arcTo(bx, by + bh, bx, by + bh - r, r);
  ctx.lineTo(bx, by + r);
  ctx.arcTo(bx, by, bx + r, by, r);
  ctx.closePath();
  ctx.fill();
  if (isGuide) {
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = '#aa66ff'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx + r, by); ctx.lineTo(bx + bw - r, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + bh, r); ctx.lineTo(bx + bw, by + bh - r);
    ctx.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r); ctx.lineTo(bx + r, by + bh);
    ctx.arcTo(bx, by + bh, bx, by + bh - r, r); ctx.lineTo(bx, by + r);
    ctx.arcTo(bx, by, bx + r, by, r); ctx.closePath(); ctx.stroke();
  }
  // text
  ctx.globalAlpha = alpha;
  ctx.fillStyle   = isGuide ? '#ffffcc' : (color || '#ddeeff');
  ctx.shadowColor = isGuide ? '#ffee88' : (color || '#aaccff');
  ctx.shadowBlur  = isGuide ? 10 : 8;
  ctx.fillText(text, cw / 2, by + padY + fontSize * 0.85);
  ctx.restore();

  if (storyFightSubtitle.timer <= 0) storyFightSubtitle = null;
}

// ── Objective system ─────────────────────────────────────────────────────────
function setObjective(text) {
  window.currentObjective = { text: text, completed: false };
  window.objectiveCompleteTimer = 0;
}

function completeObjective() {
  if (!window.currentObjective || window.currentObjective.completed) return;
  window.currentObjective.completed = true;
  window.objectiveCompleteTimer = 200; // show "COMPLETE" for ~3.3s
}

function drawObjectiveHUD() {
  if (!storyModeActive) return;
  if (!window.currentObjective && window.objectiveCompleteTimer <= 0) return;
  if (typeof isCinematic !== 'undefined' && isCinematic) return; // hide during cinematics

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const cw = canvas.width;
  const ch = canvas.height;
  const isComplete = window.objectiveCompleteTimer > 0;
  const label  = isComplete ? '✓ OBJECTIVE COMPLETE' : (window.currentObjective ? window.currentObjective.text : '');
  if (!label) { ctx.restore(); return; }

  // Fade in/out
  let alpha = 1.0;
  if (isComplete) {
    window.objectiveCompleteTimer--;
    alpha = Math.min(1.0, window.objectiveCompleteTimer / 30); // fade out in last 30 frames
    if (window.objectiveCompleteTimer <= 0) { window.currentObjective = null; }
  }

  ctx.globalAlpha = alpha * 0.92;
  const fontSize = Math.round(cw * 0.018);
  ctx.font = `${isComplete ? 'bold ' : ''}${fontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';

  const prefix   = isComplete ? '' : '▶ ';
  const fullText = prefix + label;
  const tw = ctx.measureText(fullText).width;
  const px = Math.round(cw * 0.015);
  const hudH = typeof _hudBottom === 'function' ? _hudBottom() : 0;
  const py = hudH + fontSize + 10;
  const padX = 9, padH = fontSize + 10;

  // Background pill
  ctx.fillStyle = isComplete ? 'rgba(30,120,50,0.82)' : 'rgba(5,8,22,0.78)';
  ctx.beginPath();
  ctx.roundRect(px - padX, py - padH / 2, tw + padX * 2, padH, 5);
  ctx.fill();

  // Accent left bar
  ctx.fillStyle = isComplete ? '#44ee88' : '#4488ff';
  ctx.fillRect(px - padX, py - padH / 2, 3, padH);

  // Text
  ctx.fillStyle = isComplete ? '#aaffcc' : '#c8d8ff';
  ctx.shadowColor = isComplete ? '#44ff88' : '#4466ff';
  ctx.shadowBlur  = isComplete ? 8 : 4;
  ctx.fillText(fullText, px, py + 1);
  ctx.restore();
}

// ── Cinematic letterbox (top/bottom black bars) ───────────────────────────────
function drawCinematicLetterbox() {
  if (typeof cinematicLetterboxAmt === 'undefined') return;
  // Lerp toward target
  const lerpRate = 0.08;
  cinematicLetterboxAmt += (cinematicLetterboxTarget - cinematicLetterboxAmt) * lerpRate;
  if (Math.abs(cinematicLetterboxTarget - cinematicLetterboxAmt) < 0.001) cinematicLetterboxAmt = cinematicLetterboxTarget;
  if (cinematicLetterboxAmt < 0.002) return;

  const barH = Math.round(canvas.height * cinematicLetterboxAmt * 0.13); // 13% per side max
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, barH);
  ctx.fillRect(0, canvas.height - barH, canvas.width, barH);
  ctx.restore();
}

// ── Cinematic mode helpers ────────────────────────────────────────────────────
function startCinematicMode() {
  if (typeof isCinematic !== 'undefined') isCinematic = true;
  if (typeof setCombatLock === 'function') setCombatLock('cinematic');
  if (typeof cinematicLetterboxTarget !== 'undefined') cinematicLetterboxTarget = 1;
  // Hide debug overlays during cinematics
  if (typeof debugMode !== 'undefined') window._debugModePreCinematic = debugMode;
}
function endCinematicMode() {
  if (typeof isCinematic !== 'undefined') isCinematic = false;
  if (typeof clearCombatLock === 'function') clearCombatLock('cinematic');
  if (typeof cinematicLetterboxTarget !== 'undefined') cinematicLetterboxTarget = 0;
  if (typeof window._debugModePreCinematic !== 'undefined') {
    if (typeof debugMode !== 'undefined') debugMode = window._debugModePreCinematic;
    delete window._debugModePreCinematic;
  }
}

// Picks the hostile the story banner should describe: the living enemy nearest
// the player, across both the players[] slots and the minion pool (one-map story
// levels spawn most of their enemies as minions, so players[1] alone is wrong).
function _storyBannerTarget() {
  const hero = players && players[0];
  if (!hero) return null;
  const pool = [];
  if (players) for (let i = 1; i < players.length; i++) pool.push(players[i]);
  if (typeof minions !== 'undefined' && minions) pool.push(...minions);
  let best = null, bestD = Infinity;
  for (const e of pool) {
    if (!e || e.health <= 0 || e.isAlly || e.isDummy) continue;
    if (typeof areAlliedEntities === 'function' && areAlliedEntities(hero, e)) continue;
    const d = Math.abs(e.cx() - hero.cx());
    if (d < bestD) { bestD = d; best = e; }
  }
  // Hysteresis: with two enemies at similar range the raw nearest-check would
  // strobe between them every few frames. Hold the current target until a rival
  // is clearly closer (or the current one dies / leaves the fight).
  const held = _storyBannerTarget._held;
  if (held && held !== best && held.health > 0 && pool.indexOf(held) !== -1) {
    const heldD = Math.abs(held.cx() - hero.cx());
    if (heldD < bestD + 90) return held;
  }
  _storyBannerTarget._held = best;
  return best;
}

// ── Story opponent name HUD — small banner at top-right during story fights ───
function drawStoryOpponentHUD() {
  if (!storyModeActive) return;
  const p2 = _storyBannerTarget();
  if (!p2 || !p2.maxHealth) return;

  const cw = canvas.width;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const fontSize = Math.round(cw * 0.018);
  // Named chapter opponent wins; otherwise fall back to whatever the enemy calls itself.
  const label    = (p2 === (players && players[1]) && storyOpponentName)
    ? storyOpponentName
    : (p2.name || storyOpponentName || 'Enemy');
  ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  const tw  = ctx.measureText(label).width;
  // py sits below the DOM HUD bar; _hudBottom() reads the actual rendered height
  // so this stays correct if the HUD ever resizes.
  const px  = cw - 16, py = _hudBottom() + fontSize + 6;
  const padX = 10, padH = fontSize + 10;

  // Background pill
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = 'rgba(10,5,25,0.85)';
  ctx.beginPath();
  const bx = px - tw - padX * 2, bw = tw + padX * 2, bh = padH;
  ctx.roundRect(bx, py - bh / 2, bw, bh, bh / 2);
  ctx.fill();

  // HP fraction bar under name
  const hpFrac = Math.max(0, p2.health / p2.maxHealth);
  const barH   = 3;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(bx, py + bh / 2 - barH, bw, barH);
  ctx.globalAlpha = 0.85;
  const hpColor = hpFrac > 0.5 ? '#44cc66' : hpFrac > 0.25 ? '#ffaa22' : '#ee3333';
  ctx.fillStyle = hpColor;
  ctx.fillRect(bx, py + bh / 2 - barH, bw * hpFrac, barH);

  // Name text
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = '#dde4ff';
  ctx.shadowColor = '#6688ff'; ctx.shadowBlur = 6;
  ctx.fillText(label, px - padX, py + 1);

  // Class label (small, below name pill)
  if (p2.charClass && p2.charClass !== 'none') {
    const clsName = (typeof CLASSES !== 'undefined' && CLASSES[p2.charClass])
      ? (CLASSES[p2.charClass].name || p2.charClass)
      : p2.charClass;
    const clsFontSize = Math.round(cw * 0.013);
    ctx.font = `${clsFontSize}px "Segoe UI", Arial, sans-serif`;
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = '#88aaff';
    ctx.shadowBlur = 0;
    ctx.fillText(clsName.toUpperCase(), px - padX, py + bh / 2 + clsFontSize + 4);
  }

  ctx.restore();
}

// ── Hit Effectiveness HUD ─────────────────────────────────────────────────────
// Phase threshold proximity + player combo streak feedback.
// Reads boss/Sovereign HP each frame; no external hook required.

const _hitfb = {
  bossHPprev  : null,
  comboCount  : 0,
  comboTimer  : 0,   // frames until combo resets
  comboFlash  : 0,   // bright-flash frames on new hit
  phaseTimer  : 0,   // internal pulse clock
};
const _HFB_COMBO_WINDOW = 210; // ~3.5 s

function drawHitEffectivenessHUD() {
  if (!gameRunning || (typeof isCinematic !== 'undefined' && isCinematic)) return;

  // The combo read runs against a boss, or against the one opponent of a
  // single human in a plain duel (Fight Ladder, Versus vs bot, Quick Fight).
  const boss = (typeof players !== 'undefined') && players && (
    players.find(p => (p.isBoss || p.isSovereignMK2) && p.health > 0) ||
    (players.length === 2 && players[0] && !players[0].isAI && players[1] && players[1].isAI && players[1].health > 0 ? players[1] : null));
  if (!boss) {
    _hitfb.bossHPprev = null;
    _hitfb.comboCount = 0;
    return;
  }

  // ── Combo detection: HP drop this frame = hit landed ─────────
  const curHP = boss.health;
  if (_hitfb.bossHPprev !== null && curHP < _hitfb.bossHPprev - 0.5) {
    _hitfb.comboCount++;
    _hitfb.comboTimer = _HFB_COMBO_WINDOW;
    _hitfb.comboFlash = 16;
  }
  _hitfb.bossHPprev = curHP;
  if (_hitfb.comboTimer > 0) _hitfb.comboTimer--;
  else _hitfb.comboCount = 0;
  if (_hitfb.comboFlash > 0) _hitfb.comboFlash--;
  _hitfb.phaseTimer++;

  // ── Phase threshold proximity (boss only, not Sovereign) ─────
  const nearThresh = boss.isBoss && (() => {
    const th1 = boss.maxHealth * (2 / 3); // ~2000 (phase 1→2)
    const th2 = boss.maxHealth * (1 / 3); // ~1000 (phase 2→3)
    const margin = boss.maxHealth * 0.075; // within 7.5% HP = ~225 HP
    return (curHP > th1 && curHP - th1 < margin) ||
           (curHP > th2 && curHP - th2 < margin);
  })();

  const cw = canvas.width;
  const ch = canvas.height;
  const now = performance.now();
  const hudH = typeof _hudBottom === 'function' ? _hudBottom() : 0;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // ── Phase Threshold Indicator ─────────────────────────────────
  if (nearThresh) {
    const pulse = 0.55 + 0.45 * Math.sin(now / 260);
    const alpha = 0.78 * pulse;
    const fontSize = Math.round(cw * 0.019);
    ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    const label = '⚡ PHASE BREAK';
    const lw    = ctx.measureText(label).width;
    const ty    = hudH + Math.round(cw * 0.036);
    const padX  = 14, padH2 = fontSize + 12;
    ctx.globalAlpha = alpha * 0.60;
    const gr = ctx.createLinearGradient(cw / 2 - lw / 2 - padX, ty, cw / 2 + lw / 2 + padX, ty);
    gr.addColorStop(0, 'rgba(255,60,0,0)');
    gr.addColorStop(0.5, 'rgba(255,60,0,0.85)');
    gr.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cw / 2 - lw / 2 - padX, ty - padH2 / 2, lw + padX * 2, padH2, 5);
    else ctx.rect(cw / 2 - lw / 2 - padX, ty - padH2 / 2, lw + padX * 2, padH2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#ffcc44';
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur  = 18 * pulse;
    ctx.fillText(label, cw / 2, ty);
  }

  // ── Combo Feedback ────────────────────────────────────────────
  if (_hitfb.comboCount >= 2 && _hitfb.comboTimer > 0) {
    const flashBoost = _hitfb.comboFlash > 0 ? (_hitfb.comboFlash / 16) * 0.35 : 0;
    const fadeRatio  = Math.min(1, _hitfb.comboTimer / 55);
    const alpha      = fadeRatio * (0.80 + flashBoost);

    const n = _hitfb.comboCount;
    let r = 100, g = 220, b = 255, label;
    if (n >= 8)      { r = 255; g = 40;  b = 40;  label = `OBLITERATE ×${n}`; }
    else if (n >= 5) { r = 255; g = 120; b = 0;   label = `UNSTOPPABLE ×${n}`; }
    else if (n >= 3) { r = 255; g = 220; b = 0;   label = `HOT STREAK ×${n}`; }
    else             { r = 100; g = 220; b = 255;  label = `COMBO ×${n}`; }

    const scale    = 1 + flashBoost * 0.12;
    const fontSize = Math.round(Math.max(18, cw * 0.026) * scale);
    ctx.font = `bold ${fontSize}px 'Rajdhani', "Segoe UI", sans-serif`;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    const tx = cw - Math.round(cw * 0.012);
    const ty = hudH + Math.round(ch * 0.055);
    const tw = ctx.measureText(label).width;
    const padX = 10, padY2 = 6;

    ctx.globalAlpha = alpha * 0.65;
    ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(tx - tw - padX, ty - fontSize / 2 - padY2, tw + padX * 2, fontSize + padY2 * 2, 5);
    else ctx.rect(tx - tw - padX, ty - fontSize / 2 - padY2, tw + padX * 2, fontSize + padY2 * 2);
    ctx.fill();

    ctx.globalAlpha  = alpha;
    ctx.fillStyle    = `rgb(${r},${g},${b})`;
    ctx.shadowColor  = `rgb(${r},${g},${b})`;
    ctx.shadowBlur   = 10 + flashBoost * 14;
    ctx.fillText(label, tx, ty);
  }

  ctx.restore();
}

// ── Match Announcer ──────────────────────────────────────────────────────────
let _announcerMsg = null; // {text, color, timer, maxTimer}

function queueAnnouncement(text, color) {
  _announcerMsg = { text, color: color || '#ffffff', timer: 120, maxTimer: 120 };
}

function drawMatchAnnouncer() {
  if (!_announcerMsg || _announcerMsg.timer <= 0) { _announcerMsg = null; return; }
  if (typeof isCinematic !== 'undefined' && isCinematic) return;
  _announcerMsg.timer--;
  const { text, color, timer, maxTimer } = _announcerMsg;
  const fadeIn  = Math.min(1, (maxTimer - timer) / 10);
  const fadeOut = Math.min(1, timer / 20);
  const alpha   = Math.min(fadeIn, fadeOut);
  if (alpha <= 0) return;

  const cw = canvas.width;
  const ch = canvas.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  const fontSize = Math.round(cw * 0.038);
  ctx.font        = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign   = 'center';
  ctx.shadowColor = color;
  ctx.shadowBlur  = 28;
  ctx.fillStyle   = '#ffffff';
  ctx.fillText(text, cw / 2, ch * 0.22);
  ctx.globalAlpha = alpha * 0.55;
  ctx.fillStyle   = color;
  ctx.fillText(text, cw / 2, ch * 0.22);
  ctx.restore();
}


// ── Explore minimap ───────────────────────────────────────────────────────────
// A thin strip showing the whole level outline: platforms, the player, hostile
// foes, the exit, rest/fight checkpoints and caches the player has already seen.
// Explore worlds run 3000-9000px; the camera shows ~900 of it, so without this
// the only sense of where you are is the progress bar. Drawn on canvas in the
// HUD layer (screen space), top-left under the DOM HUD. M toggles it; it is on
// by default only in levels wider than 1.5 screens. An explicit M choice is
// remembered (localStorage 'smb_minimap': '1' on everywhere, '0' off everywhere).
//
// drawEdgeIndicators (smb-menu-utils.js) reads window._hudAvoid — the canvas-space
// rects this strip and the sidequest tracker occupy — so off-screen arrows never
// land on top of them.
const _MM = { sig: '', path: null, yMin: 0, yMax: 560, pref: undefined };
function _mmLoadPref() {
  if (_MM.pref !== undefined) return _MM.pref;
  let v = null;
  try { const s = localStorage.getItem('smb_minimap'); v = s === '1' ? true : s === '0' ? false : null; } catch (e) {}
  return (_MM.pref = v);
}
function exploreMinimapEnabled() {
  const p = _mmLoadPref();
  if (p !== null) return p;
  return typeof exploreWorldLen === 'number' && exploreWorldLen > GAME_W * 1.5;
}
function toggleExploreMinimap() {
  _MM.pref = !exploreMinimapEnabled();
  try { localStorage.setItem('smb_minimap', _MM.pref ? '1' : '0'); } catch (e) {}
  return _MM.pref;
}
document.addEventListener('keydown', function (e) {
  if (e.key !== 'm' && e.key !== 'M') return;
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (typeof gameRunning === 'undefined' || !gameRunning || gameMode !== 'exploration' || !exploreActive) return;
  const ae = document.activeElement;
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
  if (window._storySceneHold) return;
  toggleExploreMinimap();
});

function drawExploreMinimap() {
  window._hudAvoid = [];
  const _mmArena = (typeof ARENAS !== 'undefined' && ARENAS.__explore__) || currentArena;
  if (!exploreActive || !players[0] || !_mmArena || !_mmArena.platforms) return;
  if (!exploreMinimapEnabled() || !(exploreWorldLen > GAME_W * 1.05)) return;
  if ((typeof activeCinematic !== 'undefined' && activeCinematic) || (typeof isCinematic !== 'undefined' && isCinematic)) return;
  const p1 = players[0];
  const cw = canvas.width;
  const W = Math.round(Math.max(190, Math.min(300, cw * 0.26)));
  const H = 36, PADX = 8, PADY = 14;
  const bx = 14, by = Math.round(_hudBottom() + 10);
  const iw = W - PADX * 2, ih = H;
  const L = exploreWorldLen;
  const sx = iw / L;

  // Outline path: rebuilt only when the arena or the strip width changes.
  const plats = _mmArena.platforms;
  const sig = L + ':' + plats.length + ':' + iw;
  if (_MM.sig !== sig || !_MM.path) {
    let yMin = 120;
    for (const p of plats) if (!p.isBedrock && !p.isRockFill && p.y > -700 && p.y < yMin) yMin = p.y - 20;
    _MM.yMin = yMin; _MM.yMax = 560;
    const path = new Path2D();
    const ty = y => Math.max(0, Math.min(ih, (y - _MM.yMin) / (_MM.yMax - _MM.yMin) * ih));
    for (const p of plats) {
      if (p.isBedrock || p.isRockFill || p.w < 28 || p.y > 600) continue;
      const y = Math.round(ty(p.y)) + 0.5;
      path.moveTo(p.x * sx, y); path.lineTo((p.x + p.w) * sx, y);
    }
    _MM.path = path; _MM.sig = sig;
  }
  const ty = y => Math.max(0, Math.min(ih, (y - _MM.yMin) / (_MM.yMax - _MM.yMin) * ih));
  const tx = x => Math.max(0, Math.min(iw, x * sx));

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textBaseline = 'alphabetic';
  // Plate
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(8,10,16,0.62)';
  ctx.beginPath(); ctx.roundRect(bx, by, W, H + PADY + 6, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(150,165,190,0.22)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(bx + 0.5, by + 0.5, W - 1, H + PADY + 5, 3); ctx.stroke();
  ctx.font = '600 8px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = 'rgba(165,178,200,0.6)';
  ctx.textAlign = 'left';
  ctx.fillText('LEVEL', bx + PADX, by + 10);
  ctx.textAlign = 'right';
  ctx.fillText('M', bx + W - PADX, by + 10);

  ctx.translate(bx + PADX, by + PADY);
  // Platforms
  ctx.strokeStyle = 'rgba(150,165,190,0.62)'; ctx.lineWidth = 1;
  ctx.stroke(_MM.path);

  // Checkpoints: fight gates and rest beacons; passed ones go muted green.
  for (const cp of (exploreCheckpoints || [])) {
    const x = Math.round(tx(cp.x)) + 0.5, h = cp.rest ? 4 : 7;
    ctx.strokeStyle = cp.hit ? 'rgba(150,196,160,0.85)' : 'rgba(205,210,222,0.42)';
    ctx.beginPath(); ctx.moveTo(x, ih - h); ctx.lineTo(x, ih); ctx.stroke();
  }
  // Exit
  if (exploreGoalX > 0 && exploreGoalX < L + 400) {
    const x = Math.round(tx(exploreGoalX)) + 0.5;
    const col = exploreGoalFound ? 'rgba(235,225,160,0.95)' : 'rgba(214,176,98,0.9)';
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x, ih); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 3, 2); ctx.lineTo(x + 3, 2); ctx.lineTo(x, 6); ctx.closePath(); ctx.fill();
  }
  // Caches the player has actually come near (or opened). Hidden ones stay hidden.
  for (const it of (explorePickups || [])) {
    if (it.type !== 'chest') continue;
    if (!it._seen && !it.collected && Math.abs(p1.cx() - it.x) < 420) it._seen = true;
    if (!it._seen && !it.collected) continue;
    const x = Math.round(tx(it.x)), y = Math.round(ty(it.y)) ;
    const yy = Math.min(ih - 2, y);
    ctx.strokeStyle = it.collected ? 'rgba(170,150,98,0.75)' : 'rgba(224,196,120,0.95)';
    ctx.fillStyle = it.collected ? 'rgba(170,150,98,0.75)' : 'rgba(0,0,0,0)';
    ctx.beginPath(); ctx.rect(x - 2, yy - 2, 4, 4);
    if (it.collected) ctx.fill(); else ctx.stroke();
  }
  // Optional objectives that have been spotted (sidequests)
  if (typeof storySidequestMarks === 'function') {
    for (const m of storySidequestMarks()) {
      const x = Math.round(tx(m.x)), yy = Math.min(ih - 2, Math.round(ty(m.y)));
      ctx.strokeStyle = m.done ? 'rgba(120,160,156,0.55)' : 'rgba(132,200,192,0.95)';
      ctx.beginPath(); ctx.arc(x, yy, 2.6, 0, Math.PI * 2); ctx.stroke();
      if (m.done) { ctx.fillStyle = 'rgba(120,160,156,0.55)'; ctx.fill(); }
    }
  }
  // Hostiles
  ctx.fillStyle = 'rgba(204,104,92,0.95)';
  const dot = f => {
    if (!f || f === p1 || !(f.health > 0)) return;
    if (!_exploreHostile(f)) return;
    ctx.fillRect(Math.round(tx(f.cx())) - 1, Math.min(ih - 2, Math.round(ty(f.y + f.h))) - 2, 2, 2);
  };
  if (typeof minions !== 'undefined') minions.forEach(dot);
  for (const p of players) if (p !== p1 && p.storyFaction === 'enemy') dot(p);
  // Player
  const px = Math.round(tx(p1.cx())), py = Math.min(ih - 3, Math.round(ty(p1.y + p1.h)));
  ctx.fillStyle = '#eaf0fa';
  ctx.fillRect(px - 1, py - 5, 2, 5);
  ctx.strokeStyle = 'rgba(234,240,250,0.35)';
  ctx.beginPath(); ctx.moveTo(px + 0.5, 0); ctx.lineTo(px + 0.5, py - 6); ctx.stroke();
  ctx.restore();

  window._hudAvoid.push({ x: bx, y: by, w: W, h: H + PADY + 6 });
}
