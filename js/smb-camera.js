'use strict';
// Camera: sequences, drama mode, updateCamera().
// Depends on smb-globals.js (GAME_W, GAME_H, players, canvas).
'use strict';

// Modes: gameplay (bounding box), combat (players close or attacking),
// cinematic (locked on one entity), duel (midpoint + zoom for exactly 2).
let _camMode        = 'gameplay';  // 'gameplay' | 'combat' | 'cinematic' | 'duel'
let _camCombatTimer  = 0;           // frames remaining in forced combat mode
let _camModeBlend    = 0;           // 0→1 smoothing factor for mode transitions
let _camSnapCooldown = 0;           // frames before failsafe snap can fire again

// Duel-cam midpoint, smoothed separately from camXTarget so it doesn't fight the lerp.
let _duelMidX = GAME_W / 2;
let _duelMidY = GAME_H / 2;
// Per-frame cap on midpoint travel, so sudden jumps don't snap.
const _DUEL_MAX_SPEED   = 14;   // world units/frame
const _DUEL_SPEED_SCALE = 0.10; // speed = dist * scale, then capped
// Frames to delay following a fast-falling entity.
let _duelFallDelay = 0;

// Motion smoothing. Many writers switch on and off between frames, and a plain
// lerp turns each target step into a jerk, worse on wide maps. The final
// integrator is velocity-based and acceleration-limited, so upstream changes
// ramp in over ~10 frames. Explicit snaps reset velocity.
let _camVX = 0, _camVY = 0;
const _CAM_MAX_ACCEL = 1.35;  // world units / frame^2
const _CAM_MAX_SPEED = 34;    // world units / frame
// Ease the lerp rate on mode change instead of stepping it, or the tracking error dumps at double speed.
let _camLerpPos = 0.062, _camLerpZoom = 0.045;
// Smoothed 0..1 weight for the wide-arena boss-attack bias.
let _camBossBias = 0;

function resetCameraMotion() { _camVX = 0; _camVY = 0; _camBossBias = 0; }

// Per-mode lerp speeds
const _CAM_LERP = {
  gameplay:  { pos: 0.062, zoom: 0.045 },
  combat:    { pos: 0.130, zoom: 0.095 },
  cinematic: { pos: 0.220, zoom: 0.180 },
  cinematic_snap: { pos: 0.55, zoom: 0.45 },
  duel:      { pos: 0.072, zoom: 0.052 },
  duel_close: { pos: 0.110, zoom: 0.082 },  // tighter when fighters are close
};

// Keyframe sequencer. Each keyframe: { t: seconds, zoom, target: entity|{x,y}|null }.
// While a sequence runs, cinematicCamOverride is forced true.
let _camSeq = null; // active sequence state
let _camSeqTime = 0; // elapsed seconds

function createCameraSequence(keyframes) {
  if (!Array.isArray(keyframes) || keyframes.length === 0) return;
  _camSeq = keyframes.slice().sort((a, b) => a.t - b.t);
  _camSeqTime = 0;
  cinematicCamOverride = true;
}

function _tickCameraSequence(dt) {
  if (!_camSeq) return;
  _camSeqTime += dt;

  // Find surrounding keyframes
  const kf = _camSeq;
  const last = kf[kf.length - 1];
  if (_camSeqTime >= last.t) {
    // Sequence finished. Apply the final frame and release.
    const fx = _resolveSeqTarget(last);
    if (fx) { camXTarget = fx.x; camYTarget = fx.y; }
    if (last.zoom) camZoomTarget = last.zoom;
    _camSeq = null;
    cinematicCamOverride = false;
    return;
  }

  let kfA = kf[0], kfB = kf[1] || kf[0];
  for (let i = 0; i < kf.length - 1; i++) {
    if (_camSeqTime >= kf[i].t && _camSeqTime < kf[i + 1].t) {
      kfA = kf[i]; kfB = kf[i + 1]; break;
    }
  }

  const span = Math.max(0.001, kfB.t - kfA.t);
  const t    = Math.min(1, (_camSeqTime - kfA.t) / span);
  const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // smooth-step

  const ptA = _resolveSeqTarget(kfA);
  const ptB = _resolveSeqTarget(kfB);
  if (ptA && ptB) {
    camXTarget = ptA.x + (ptB.x - ptA.x) * ease;
    camYTarget = ptA.y + (ptB.y - ptA.y) * ease;
  } else if (ptB) {
    camXTarget = ptB.x; camYTarget = ptB.y;
  }
  const zA = kfA.zoom || camZoomCur;
  const zB = kfB.zoom || camZoomCur;
  camZoomTarget = zA + (zB - zA) * ease;

  // Apply timed shake from keyframe
  if (kfA.shake && t < 0.05) screenShake = Math.max(screenShake, kfA.shake);

  // Smooth-apply camera
  camZoomCur += (camZoomTarget - camZoomCur) * 0.22;
  camXCur    += (camXTarget    - camXCur)    * 0.22;
  camYCur    += (camYTarget    - camYCur)    * 0.22;
}

function _resolveSeqTarget(kf) {
  if (!kf) return null;
  if (!kf.target) return null;
  const t = kf.target;
  if (typeof t === 'function') { const e = t(); return e ? { x: e.cx ? e.cx() : e.x, y: e.cy ? e.cy() : e.y } : null; }
  if (typeof t.cx === 'function') return { x: t.cx(), y: t.cy() };
  if (typeof t.x === 'number')   return { x: t.x, y: t.y };
  return null;
}

function stopCameraSequence() {
  _camSeq = null;
  cinematicCamOverride = false;
}

function setCameraDrama(state, frames, target, zoom) {
  camDramaState  = state  || 'normal';
  camDramaTimer  = frames || 60;
  camDramaTarget = target || null;
  camDramaZoom   = zoom   || 1.0;
}

function _updateCameraDrama() {
  if (camDramaTimer > 0) {
    camDramaTimer--;
    if (camDramaTimer === 0) { camDramaState = 'normal'; camDramaTarget = null; }
  }
  if (camDramaState === 'normal' || cinematicCamOverride) return;
  if (camDramaState === 'focus' && camDramaTarget) {
    camZoomTarget = Math.min(camZoomTarget * camDramaZoom, 1.55);
    camXTarget = camXTarget + (camDramaTarget.cx() - camXTarget) * 0.10;
    camYTarget = camYTarget + (camDramaTarget.cy() - camYTarget) * 0.10;
  }
  if (camDramaState === 'impact') {
    camZoomTarget = Math.max(camZoomTarget * 0.84, 0.46);
  }
  if (camDramaState === 'wideshot') {
    camZoomTarget = Math.max(0.44, camZoomTarget * 0.91);
  }
}

// Determine active camera mode each frame
function _updateCamMode() {
  if (cinematicCamOverride || activeCinematic) {
    _camMode = cinematicCamSnapFrames > 0 ? 'cinematic_snap' : 'cinematic';
    _camCombatTimer = 0;
    return;
  }
  // Combat: any attack active, or players within 220px.
  const humanPlayers = players.filter(p => p.health > 0 && !p.isBoss);
  const anyAttacking = players.some(p => p.attackTimer > 0 && p.health > 0);
  let combatClose = false;
  if (humanPlayers.length >= 2) {
    const d = Math.abs(humanPlayers[0].cx() - humanPlayers[1].cx());
    combatClose = d < 220;
  } else if (humanPlayers.length === 1) {
    const boss = players.find(p => p.isBoss && p.health > 0);
    if (boss) combatClose = Math.abs(humanPlayers[0].cx() - boss.cx()) < 250;
  }
  if (anyAttacking || combatClose) _camCombatTimer = 25; // frames of combat mode after the last trigger
  if (_camCombatTimer > 0) {
    _camCombatTimer--;
    _camMode = 'combat';
  } else {
    _camMode = 'gameplay';
  }
}

// Framing core. One solver for every gameplay framing path. Every entity handed to it ends up
// inside the viewport unless the zoom floor makes that impossible. Zoom and
// centre must be solved together, or the camera can zoom wide and still point
// at one fighter, leaving the other off screen.

// AIs further than this from the humans drop out of the framing. Humans never drop.
const CAM_TRACK_RADIUS_X = 1700;
const CAM_TRACK_RADIUS_Y = 1100;

// Far camera: past CAM_FAR_SEP, the other fighter leaves the shot and shows as an
// edge arrow (drawEdgeIndicators). Rejoins under CAM_FAR_REJOIN so the zoom doesn't
// flicker at the threshold. `_camFarSubject` is the followed human while far-mode runs.
// failsafe below rescues only them (rescuing both is the old ping-pong).
const CAM_FAR_SEP    = 1400;
const CAM_FAR_REJOIN = 1250;
var _camFarSubject = null;

function _camTrackedSet(activePlayers) {
  _camFarSubject = null;
  if (!activePlayers.length) return activePlayers;
  let humans = activePlayers.filter(p => !p.isAI && !p.isBoss && !p._brOnPlane);
  if (!humans.length) return activePlayers.filter(p => !p._brOnPlane);
  if (humans.length > 1) {
    const h0 = humans[0];
    const far = humans.slice(1).filter(h => {
      const d = Math.abs(h.cx() - h0.cx());
      const was = !!h._camFar;
      h._camFar = was ? d > CAM_FAR_REJOIN : d > CAM_FAR_SEP;
      return h._camFar;
    });
    if (far.length) { humans = humans.filter(h => !far.includes(h)); _camFarSubject = h0; }
  }
  let hx = 0, hy = 0;
  for (const h of humans) { hx += h.cx(); hy += h.cy(); }
  hx /= humans.length; hy /= humans.length;
  const others = activePlayers.filter(p => {
    if (!p.isAI && !p.isBoss) return false;          // already in `humans`
    if (p._brOnPlane) return false;
    const dx = Math.abs(p.cx() - hx);
    const lim = p._camFar ? CAM_FAR_REJOIN : CAM_FAR_SEP;
    p._camFar = dx > lim;
    return !p._camFar && Math.abs(p.cy() - hy) <= CAM_TRACK_RADIUS_Y;
  });
  return humans.concat(others);
}

// Solve zoom + centre so every entity in `list` is contained.
//   o = { zMin, zMax, padX, padY, safeH, hudGU, hudShift, wL, wR, wT, wB,
//         biasX, biasY, biasW }
// biasX/biasY is a preferred look point; biasW is how far to honour it. Containment wins.
function _camSolveFrame(list, o) {
  // Clamp extents into the world rect. A fighter outside it can't be framed,
  // and letting it stretch the box would push everyone else out of frame.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of list) {
    const px0 = Math.max(o.wL, Math.min(o.wR, p.x));
    const px1 = Math.max(o.wL, Math.min(o.wR, p.x + (p.w || 0)));
    const py0 = Math.max(o.wT, Math.min(o.wB, p.y));
    const py1 = Math.max(o.wT, Math.min(o.wB, p.y + (p.h || 0)));
    if (px0 < minX) minX = px0;
    if (px1 > maxX) maxX = px1;
    if (py0 < minY) minY = py0;
    if (py1 > maxY) maxY = py1;
  }
  if (!isFinite(minX) || !isFinite(minY)) {
    minX = o.wL; maxX = o.wR; minY = o.wT; maxY = o.wB;
  }

  const safeH = Math.max(40, o.safeH);
  let z = Math.min(GAME_W / Math.max(1, (maxX - minX) + o.padX),
                   safeH   / Math.max(1, (maxY - minY) + o.padY));
  z = Math.max(o.zMin, Math.min(o.zMax, z));

  let wantX = (minX + maxX) / 2;
  let wantY = (minY + maxY) / 2 + (o.hudShift || 0);
  if (o.biasW) {
    wantX = wantX * (1 - o.biasW) + o.biasX * o.biasW;
    wantY = wantY * (1 - o.biasW) + o.biasY * o.biasW;
  }

  let outX = wantX, outY = wantY;
  // Clamp the centre, measure the worst overflow, widen by that factor. Converges in 2-3 passes.
  for (let i = 0; i < 6; i++) {
    const hvw = GAME_W / (2 * z);
    const hvh = safeH   / (2 * z);
    outX = (o.wR - o.wL > 2 * hvw)
      ? Math.max(o.wL + hvw, Math.min(o.wR - hvw, wantX))
      : (o.wL + o.wR) / 2;
    outY = (o.wB - o.wT > 2 * hvh)
      ? Math.max(o.wT + hvh + (o.hudGU || 0), Math.min(o.wB - hvh, wantY))
      : wantY;

    if (z <= o.zMin + 1e-5) break;
    // Usable half-extents, with a margin so no fighter sits on the frame edge.
    const usableX = Math.max(1, hvw - 34);
    const usableY = Math.max(1, hvh - 34);
    let worst = 1;
    for (const p of list) {
      const px0 = Math.max(o.wL, Math.min(o.wR, p.x));
      const px1 = Math.max(o.wL, Math.min(o.wR, p.x + (p.w || 0)));
      const py0 = Math.max(o.wT, Math.min(o.wB, p.y));
      const py1 = Math.max(o.wT, Math.min(o.wB, p.y + (p.h || 0)));
      const dx = Math.max(Math.abs(px0 - outX), Math.abs(px1 - outX));
      const dy = Math.max(Math.abs(py0 - outY), Math.abs(py1 - outY));
      const r = Math.max(dx / usableX, dy / usableY);
      if (r > worst) worst = r;
    }
    if (worst <= 1.0005) break;
    z = Math.max(o.zMin, z / worst);
  }
  return { x: outX, y: outY, zoom: z };
}

// World rect the camera may show. Used by the solver and the hard clamp.
function _camWorldRect() {
  const a = currentArena;
  const wL = (a && a.mapLeft  !== undefined) ? a.mapLeft  : 0;
  const wR = (a && a.mapRight !== undefined) ? a.mapRight : ((a && a.worldWidth) || GAME_W);
  let topPlat = GAME_H;
  if (a && a.platforms) for (const pl of a.platforms) if (pl.y < topPlat) topPlat = pl.y;
  const wT = Math.min(0, topPlat - 140);
  const floorPl = a && a.platforms && a.platforms.find(pl => pl.isFloor);
  const wB = (a && a.mapBottom !== undefined) ? a.mapBottom
           : (a && a.worldBottom !== undefined) ? a.worldBottom
           : (floorPl ? floorPl.y + 80 : GAME_H);
  return { wL, wR, wT, wB };
}

function updateCamera() {
  // Sequences step at a fixed 60fps.
  if (_camSeq) { _tickCameraSequence(1 / 60); return; }
  _updateCamMode();

  const _lerpRaw = _CAM_LERP[_camMode] || _CAM_LERP.gameplay;
  // Cinematic modes switch rate at once (deliberate cuts). Others ease in.
  if (_camMode === 'cinematic' || _camMode === 'cinematic_snap') {
    _camLerpPos = _lerpRaw.pos; _camLerpZoom = _lerpRaw.zoom;
  } else {
    _camLerpPos  += (_lerpRaw.pos  - _camLerpPos)  * 0.07;
    _camLerpZoom += (_lerpRaw.zoom - _camLerpZoom) * 0.07;
  }
  const lerp = { pos: _camLerpPos, zoom: _camLerpZoom };
  const activePlayers = [...players, ...trainingDummies, ...minions].filter(p => p.health > 0 && !p.backstageHiding);

  // HUD safe area: the HUD is a fixed bar at the top, so shift targets down by its height.
  const _hudScreenH = _hudGeom().height;
  const _hudGU = _hudScreenH * GAME_H / Math.max(canvas.height, 1); // HUD height in game units
  const _hudShift = _hudGU / 2; // shift camera center down by half HUD height

  let targetZoom = 1.0;
  let targetX    = GAME_W / 2;
  let targetY    = GAME_H / 2;

  // Online: track only the local player.
  // Public Server hub too: ten players on a 3600-wide city can't share a frame, so follow players[0].
  const _pubHubCam = window._pubFollowCam && gameMode === '2p' && players[0];
  if (_pubHubCam || (gameMode === 'online' && typeof localPlayerSlot !== 'undefined' && players[localPlayerSlot])) {
    const lp = _pubHubCam ? players[0] : players[localPlayerSlot];
    const PAD = 180;
    const bbMinX = lp.cx() - PAD, bbMaxX = lp.cx() + PAD;
    const bbMinY = lp.y    - PAD, bbMaxY = lp.y + lp.h + PAD;
    camZoomTarget = Math.max(0.5, Math.min(1.4, Math.min(GAME_W / (bbMaxX - bbMinX), GAME_H / (bbMaxY - bbMinY))));
    camXTarget = (bbMinX + bbMaxX) / 2;
    camYTarget = (bbMinY + bbMaxY) / 2;
    camZoomCur += (camZoomTarget - camZoomCur) * lerp.zoom;
    camXCur    += (camXTarget - camXCur) * lerp.pos;
    camYCur    += (camYTarget - camYCur) * lerp.pos;
    return;
  }

  // Private lobby waiting room: keep every pad on screen.
  if (window._pubRoomCam && gameMode === '2p') {
    camZoomTarget = 1.0;
    camXTarget = GAME_W / 2;
    camYTarget = GAME_H / 2;
    camZoomCur += (camZoomTarget - camZoomCur) * lerp.zoom;
    camXCur    += (camXTarget - camXCur) * lerp.pos;
    camYCur    += (camYTarget - camYCur) * lerp.pos;
    return;
  }

  // Battle Royale: lock to P1 or the spectate target.
  if (gameMode === 'battleroyale') {
    const brCamTarget = (typeof brSpectating !== 'undefined' && brSpectating && typeof brSpectateTarget !== 'undefined' && brSpectateTarget)
      ? brSpectateTarget
      : (players[0] && players[0].health > 0 ? players[0] : null);
    if (brCamTarget) {
      camXTarget = brCamTarget.cx();
      // Bias upward. A centred shot wastes the bottom 40% on floor, and the
      // sky is where the fighting happens.
      camYTarget = brCamTarget.cy() + _hudShift - 80;
      camZoomTarget = 1.0;
      camZoomCur += (camZoomTarget - camZoomCur) * lerp.zoom;
      camXCur    += (camXTarget - camXCur) * lerp.pos;
      camYCur    += (camYTarget - camYCur) * lerp.pos;
    }
    return;
  }

  // Endless: follow P1 through the block, pulled back a little so a full building fits.
  if (gameMode === 'endless' && players[0]) {
    const ep = players[0];
    camXTarget = ep.cx() + ep.facing * 40;
    camYTarget = ep.cy() + _hudShift - 120;
    camZoomTarget = 0.92;
    camZoomCur += (camZoomTarget - camZoomCur) * lerp.zoom;
    camXCur    += (camXTarget - camXCur) * lerp.pos;
    camYCur    += (camYTarget - camYCur) * lerp.pos;
    return;
  }

  if (activePlayers.length > 0) {
    // Exploration: track P1 at a steady zoom.
    if (gameMode === 'exploration' && players[0] && players[0].health > 0) {
      const ep = players[0];
      // Lead the camera ahead of facing.
      const _expLead = ep.facing * (28 + Math.min(65, Math.abs(ep.vx) * 14));
      const targetX2    = ep.cx() + _expLead;
      const targetY2    = ep.cy() - 30;
      const targetZoom2 = 1.05;
      camZoomTarget = targetZoom2;
      const dx2 = targetX2 - camXTarget, dy2 = targetY2 - camYTarget;
      if (Math.hypot(dx2, dy2) > CAMERA_DEAD_ZONE) { camXTarget = targetX2; camYTarget = targetY2; }
      _updateCameraDrama();
      // Lerp toward camZoomTarget, where the drama cam writes its push-in.
      camZoomCur += (camZoomTarget - camZoomCur) * 0.08;
      camXCur    += (camXTarget  - camXCur)    * 0.10;
      camYCur    += (camYTarget  - camYCur)    * 0.10;
      return;
    }

    // Gameplay framing. Both arena kinds use the same solver. Standard arenas sit
    // closer, wide arenas pull back further.
    const _isWide = !!(currentArena && currentArena.worldWidth);
    const _wr = _camWorldRect();
    const _tracked = _camTrackedSet(activePlayers);
    const _camDuel = _tracked.length === 2 && !_tracked.some(p => p.isBoss);
    const _safeH   = Math.max(GAME_H - _hudGU * 1.15, GAME_H * 0.70);

    // Zoom floor is a flat limit. Don't tie it to fitting the world: the sewer is
    // only 510 units tall, and that pinned the floor high enough to lose a player.
    const _zMin = _isWide ? 0.30 : 0.42;
    const _zMax = _isWide ? 1.18 : 1.40;

    // Look-ahead and boss emphasis are weighted preferences. The solver still frames everyone.
    let _biasX = 0, _biasY = 0, _biasW = 0;
    const _humans = activePlayers.filter(p => !p.isAI && !p.isBoss);
    if (_humans.length === 1) {
      const h = _humans[0];
      _biasX = h.cx() + h.facing * (18 + Math.min(48, Math.abs(h.vx) * 11));
      _biasY = h.cy();
      _biasW = _isWide ? 0.30 : 0.16;
    }
    if (!cinematicCamOverride && gameRunning) {
      const attackingBoss = players.find(p => p.isBoss && p.attackTimer > 0 && p.health > 0)
        || players.find(p => p.isBoss && p.health > 0 && _camBossBias > 0.01);
      const _bossWant = (attackingBoss && attackingBoss.attackTimer > 0) ? 1 : 0;
      _camBossBias += (_bossWant - _camBossBias) * 0.08;
      if (attackingBoss && _camBossBias > 0.01) {
        const _bw = 0.35 * _camBossBias;
        _biasX = _biasX * (1 - _bw) + attackingBoss.cx() * _bw;
        _biasY = _biasY * (1 - _bw) + attackingBoss.cy() * _bw;
        _biasW = Math.max(_biasW, _bw);
      }
    } else { _camBossBias = 0; }

    const _sol = _camSolveFrame(_tracked, {
      zMin: _zMin, zMax: _zMax,
      // A 1v1 frames tighter. Two fighters are the whole shot.
      padX: _isWide ? 220 : (_camDuel ? 150 : 190),
      padY: _isWide ? 200 : (_camDuel ? 160 : 190),
      safeH: _safeH, hudGU: _hudGU, hudShift: _hudShift,
      wL: _wr.wL, wR: _wr.wR, wT: _wr.wT, wB: _wr.wB,
      biasX: _biasX, biasY: _biasY, biasW: _biasW,
    });
    targetZoom = _sol.zoom;
    targetX    = _sol.x;
    targetY    = _sol.y;

    // Standard arenas drift toward the map centre as the view widens, so a tight pair isn't lopsided.
    if (!_isWide) {
      const _tight = Math.max(0, Math.min(1, (targetZoom - _zMin) / Math.max(0.001, _zMax - _zMin)));
      targetX = ((_wr.wL + _wr.wR) / 2) * (1 - _tight) + targetX * _tight;
    }

    if (camHitZoomTimer > 0) {
      camHitZoomTimer--;
      // A pulse, never a pull-IN past what containment allows.
      targetZoom = Math.min(_zMax, targetZoom + 0.09 * (camHitZoomTimer / 15));
    }
  }

  {
    camZoomTarget = targetZoom;
    // Soft dead zone: hold still for small jitter, then track from its edge.
    // Snapping to targetX instead froze it until the next breach, which read as stutter.
    const dx = targetX - camXTarget, dy = targetY - camYTarget;
    const _DZ_X = 28, _DZ_Y = 16;
    if (Math.abs(dx) > _DZ_X) camXTarget = targetX - Math.sign(dx) * _DZ_X;
    if (Math.abs(dy) > _DZ_Y) camYTarget = targetY - Math.sign(dy) * _DZ_Y;

    // Drama cam (zoom-in effects) only on wide/scrolling arenas; standard arenas stay wide
    const _isWideApply = !!(currentArena && currentArena.worldWidth);
    if (_isWideApply) _updateCameraDrama();

    camZoomCur += (camZoomTarget - camZoomCur) * lerp.zoom;

    // Acceleration-limited follow (see _CAM_MAX_ACCEL note at top of file).
    const _wantVX = (camXTarget - camXCur) * lerp.pos;
    const _wantVY = (camYTarget - camYCur) * lerp.pos;
    _camVX += Math.max(-_CAM_MAX_ACCEL, Math.min(_CAM_MAX_ACCEL, _wantVX - _camVX));
    _camVY += Math.max(-_CAM_MAX_ACCEL, Math.min(_CAM_MAX_ACCEL, _wantVY - _camVY));
    // Never let the limiter overshoot the target it is chasing.
    if (Math.abs(_camVX) > Math.abs(camXTarget - camXCur)) _camVX = camXTarget - camXCur;
    if (Math.abs(_camVY) > Math.abs(camYTarget - camYCur)) _camVY = camYTarget - camYCur;
    // Speed ceiling grows with distance. A flat cap would take 90 frames to cross
    // a 3000-unit portal jump with everyone off screen.
    const _gap = Math.hypot(camXTarget - camXCur, camYTarget - camYCur);
    const _spd = _gap > 700 ? _CAM_MAX_SPEED * Math.min(4, _gap / 700) : _CAM_MAX_SPEED;
    _camVX = Math.max(-_spd, Math.min(_spd, _camVX));
    _camVY = Math.max(-_spd, Math.min(_spd, _camVY));
    camXCur += _camVX;
    camYCur += _camVY;
  }

  // Clamp to world bounds so no empty space shows past the map edges. The HUD
  // clamp below respects these bounds, or the two fight each frame and vibrate.
  let _camWorldTopBound = -Infinity;
  let _camWorldBotBound = Infinity;
  if (currentArena && !cinematicCamOverride) {
    // Half viewport size in world units.
    const hvw = GAME_W / (2 * camZoomCur);
    const hvh = GAME_H / (2 * camZoomCur);

    const wLeft  = currentArena.mapLeft  !== undefined ? currentArena.mapLeft  : 0;
    const wRight = currentArena.mapRight !== undefined ? currentArena.mapRight : (currentArena.worldWidth || GAME_W);

    // Only clamp when the world is wider than the viewport.
    if (wRight - wLeft > GAME_W / camZoomCur) {
      const _cxClamped = Math.max(wLeft + hvw, Math.min(wRight - hvw, camXCur));
      // Zero the velocity pushing into the edge, or it lurches when the clamp releases.
      if (_cxClamped !== camXCur) _camVX = 0;
      camXCur = _cxClamped;
    }

    // Vertical: keep the floor visible. Shift the top clamp by _hudGU so the top
    // platform isn't hidden behind the HUD. Clamp camYTarget with camYCur, or the
    // lerp fights the boundary each frame. Arenas with worldBottom can pan into tunnels.
    const floorPl = currentArena.platforms && currentArena.platforms.find(p => p.isFloor);
    const wBottom = currentArena.worldBottom !== undefined ? currentArena.worldBottom
      : (floorPl ? floorPl.y + 80 : GAME_H);
    // The ceiling is not y=0. Low-gravity arenas throw fighters well above it, and a
    // pinned ceiling makes this clamp and the HUD clamp fight. Open it to the highest
    // platform plus a jump of headroom. This only permits panning up.
    let _topPlatY = GAME_H;
    if (currentArena.platforms) {
      for (const _pl of currentArena.platforms) if (_pl.y < _topPlatY) _topPlatY = _pl.y;
    }
    const wTop    = Math.min(0, _topPlatY - 140);
    if (wBottom - wTop > GAME_H / camZoomCur) {
      const _topBound = wTop + hvh + _hudGU;
      const _botBound = wBottom - hvh;
      _camWorldTopBound = Math.min(_topBound, _botBound);
      _camWorldBotBound = Math.max(_topBound, _botBound);
      const _cyClamped = Math.max(_topBound, Math.min(_botBound, camYCur));
      if (_cyClamped !== camYCur) _camVY = 0;
      camYCur    = _cyClamped;
      camYTarget = Math.max(_topBound, Math.min(_botBound, camYTarget));
    }
  }

  // HUD visibility clamp. The canvas buffer sits under the opaque HUD bar, and
  // buffer Y maps to a smaller CSS Y, so the plain _hudGU math is off. Keep the
  // topmost player's top edge _HUD_GAP CSS px below the HUD in every mode.
  const _HUD_GAP = 24; // CSS px between HUD bottom and player top
  if (!cinematicCamOverride && gameRunning && _hudScreenH > 0 && activePlayers.length > 0) {
    const _cssCH = Math.max(window.innerHeight - _hudScreenH, 1);
    // The buffer-pixel row that corresponds to (HUD bottom + gap) in CSS:
    const _hudBufLimit = (_hudScreenH + _HUD_GAP) * canvas.height / _cssCH;
    // For the topmost player at world-Y = _topmostY we need:
    //   (_topmostY - camYCur) * finalScY + canvas.height/2  >=  _hudBufLimit
    // →  camYCur  <=  _topmostY + (canvas.height/2 - _hudBufLimit) / finalScY
    // Fighters above the map top count as sitting at the ceiling, or the camera
    // would chase an unreachable position every frame.
    let _topmostY = Infinity;
    for (const _hap of activePlayers) {
      const _hy = Math.max(_hap.y, 0);
      if (_hy < _topmostY) _topmostY = _hy;
    }
    if (isFinite(_topmostY)) {
      const _bSc = Math.min(canvas.width / GAME_W, canvas.height / GAME_H);
      const _fSc = _bSc * camZoomCur;
      if (_fSc > 0) {
        const _hudCamMax = _topmostY + (canvas.height / 2 - _hudBufLimit) / _fSc;
        // Never pan above the world top to clear the HUD (the world clamp undoes it,
        // which vibrates). Never pan up so far the lowest fighter leaves the frame.
        let _lowestY = -Infinity;
        for (const _lap of activePlayers) {
          const _ly = _lap.y + (_lap.h || 0);
          if (_ly > _lowestY) _lowestY = _ly;
        }
        const _halfH = GAME_H / (2 * Math.max(0.05, camZoomCur));
        const _camYMinForBottom = isFinite(_lowestY) ? (_lowestY - _halfH + 30) : -Infinity;
        const _hudCamY = Math.max(_hudCamMax, _camWorldTopBound, _camYMinForBottom);
        if (camYCur > _hudCamY) {
          camYCur    = _hudCamY;
          camYTarget = Math.min(camYTarget, _hudCamY);
          _camVY     = 0;
        }
      }
    }
  }

  // Failsafe: a fighter out of view gets an instant partial snap. The cooldown stops it re-firing every frame.
  if (_camSnapCooldown > 0) _camSnapCooldown--;
  if (!cinematicCamOverride && gameRunning && activePlayers.length > 0 && _camSnapCooldown === 0) {
    // Skip fighters knocked outside the arena. The framing can't reach them, so the snap would tug-of-war.
    const _fsLeft  = (currentArena && currentArena.mapLeft  !== undefined) ? currentArena.mapLeft  : 0;
    const _fsRight = (currentArena && currentArena.mapRight !== undefined) ? currentArena.mapRight : GAME_W;
    // Subjects are the fighters the camera owns. Falls back to everyone when there
    // is no human (bot demos). Watch every human, since containment is the solver's job.
    const _fsHumans = activePlayers.filter(p => !p.isAI && !p.isBoss);
    const _fsSubjects = (_camFarSubject && _camFarSubject.health > 0) ? [_camFarSubject]
      : (window._pubFollowCam && gameMode === '2p' && players[0] && players[0].health > 0)
      ? [players[0]]
      : (gameMode === 'online' && typeof localPlayerSlot !== 'undefined' && players[localPlayerSlot] && players[localPlayerSlot].health > 0)
      ? [players[localPlayerSlot]]
      : (_fsHumans.length ? _fsHumans : activePlayers.slice(0, 1));
    // Skip vertically unreachable fighters too. Ones above the ceiling trip the HUD test forever.
    const _fsRect = _camWorldRect();
    for (const _fp of _fsSubjects) {
      if (_fp.cx() < _fsLeft - 40 || _fp.cx() > _fsRight + 40) continue;
      if (_fp.y + (_fp.h || 0) < _fsRect.wT) continue;   // above the ceiling
      if (_fp.y > _fsRect.wB) continue;                  // below the floor
      const _sx    = (_fp.cx() - camXCur) * camZoomCur + GAME_W * 0.5;
      const _syTop = (_fp.y - camYCur) * camZoomCur + GAME_H * 0.5;
      const _syBot = (_fp.y + (_fp.h || 50) - camYCur) * camZoomCur + GAME_H * 0.5;
      const _hudTopPx = _hudGU * camZoomCur; // HUD height in px
      const _margin = 40;
      // On the top platform, the HUD overlap can't be fixed by panning. Only count it when there's room to pan up.
      const _canPanUp = camYCur > _camWorldTopBound + 1;
      const _lost = (_sx < -_margin || _sx > GAME_W + _margin ||
          _syBot < -_margin || _syTop > GAME_H + _margin ||
          (_syTop < _hudTopPx - _margin && _canPanUp));
      // Only a fighter off screen at the camera's target is really lost. During a
      // big zoom-out everyone is briefly off screen, and snapping then fights the framing.
      let _lostAtTarget = _lost;
      if (_lost) {
        const _tz    = Math.max(0.05, camZoomTarget);
        const _tsx   = (_fp.cx() - camXTarget) * _tz + GAME_W * 0.5;
        const _tsyT  = (_fp.y - camYTarget) * _tz + GAME_H * 0.5;
        const _tsyB  = (_fp.y + (_fp.h || 50) - camYTarget) * _tz + GAME_H * 0.5;
        _lostAtTarget = (_tsx < -_margin || _tsx > GAME_W + _margin ||
                         _tsyB < -_margin || _tsyT > GAME_H + _margin ||
                         (_tsyT < _hudGU * _tz - _margin && _canPanUp));
      }
      // Off screen but not at target means the camera hasn't arrived yet (teleport,
      // portal, big knockback). Close most of the gap toward the target, not the fighter.
      if (_lost && !_lostAtTarget) {
        camXCur += (camXTarget - camXCur) * 0.45;
        camYCur += (camYTarget - camYCur) * 0.45;
        camYCur  = Math.max(_camWorldTopBound, Math.min(_camWorldBotBound, camYCur));
        _camVX = 0; _camVY = 0;
        _camSnapCooldown = 4;
        break;
      }
      if (_lostAtTarget) {
        // Snap once, then the cooldown suppresses the lerp for 10 frames.
        camXCur    += (_fp.cx() - camXCur) * 0.50;
        camYCur    += (_fp.cy() + _hudShift - camYCur) * 0.50;
        // Stay inside the same world bounds as the clamp above.
        camYCur     = Math.max(_camWorldTopBound, Math.min(_camWorldBotBound, camYCur));
        camXTarget  = camXCur;
        camYTarget  = camYCur;
        _camVX = 0; _camVY = 0;
        _camSnapCooldown = 10;
        break;
      }
    }
  }
}
