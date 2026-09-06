'use strict';
// smb-camera.js — Camera system: sequences, drama mode, updateCamera()
// Depends on: smb-globals.js (GAME_W, GAME_H, players, canvas)
'use strict';

// ============================================================
// INTELLIGENT MULTI-MODE CAMERA SYSTEM
// Mode 1 — Gameplay: bounding-box tracking, 60/40 player bias
// Mode 2 — Combat Focus: triggered when players are close / attacking
// Mode 3 — Cinematic: entity-lock (boss attacks, QTEs, specials)
// Mode 4 — DuelCam: smooth midpoint+distance-zoom for exactly 2 entities
// ============================================================
let _camMode         = 'gameplay';  // 'gameplay' | 'combat' | 'cinematic' | 'duel'
let _camCombatTimer  = 0;           // frames remaining in forced combat mode
let _camModeBlend    = 0;           // 0→1 smoothing factor for mode transitions
let _camSnapCooldown = 0;           // frames before failsafe snap can fire again

// Duel-cam: smoothed midpoint target (separate from camXTarget/camYTarget so it doesn't fight lerp)
let _duelMidX = GAME_W / 2;
let _duelMidY = GAME_H / 2;
// Max world-units the smoothed midpoint can travel per frame — prevents snapping on sudden jumps.
// Scales with distance so far-behind camera catches up without overshooting.
const _DUEL_MAX_SPEED   = 14;   // hard cap (world units/frame)
const _DUEL_SPEED_SCALE = 0.10; // proportional factor (speed = dist * scale, then capped)
// How many frames to delay following a fast-falling entity (cinematic drop feel)
let _duelFallDelay = 0;

// ── Motion smoothing state ────────────────────────────────────────────────────
// The camera has many writers (mode lerp rates, drama cam, boss bias, spread
// weighting, failsafe) and several of them switch on/off between one frame and
// the next. Any of those produces a step change in the *target*, which a plain
// `cur += (target-cur)*k` converts straight into a visible jerk — the bigger the
// standing error (i.e. the wider the map), the bigger the lurch. So the final
// integrator is velocity-based and acceleration-limited: the lerp only sets a
// DESIRED velocity, and actual velocity is allowed to change by a bounded amount
// per frame. Every discontinuity upstream then ramps in over ~10 frames instead
// of teleporting the view. Explicit snaps (cinematics, failsafe) reset velocity.
let _camVX = 0, _camVY = 0;
const _CAM_MAX_ACCEL = 1.35;  // world units / frame^2
const _CAM_MAX_SPEED = 34;    // world units / frame
// Mode changes swap the lerp rate by >2x in one frame (gameplay 0.062 -> combat
// 0.130), which dumps the accumulated tracking error at double speed the instant
// anyone throws a punch. Ease the rate itself instead of stepping it.
let _camLerpPos = 0.062, _camLerpZoom = 0.045;
// Smoothed 0..1 weight for the wide-arena boss-attack bias (hard on/off otherwise)
let _camBossBias = 0;

function resetCameraMotion() { _camVX = 0; _camVY = 0; _camBossBias = 0; }

// Per-mode lerp speeds
const _CAM_LERP = {
  gameplay:  { pos: 0.062, zoom: 0.045 },
  combat:    { pos: 0.130, zoom: 0.095 },
  cinematic: { pos: 0.220, zoom: 0.180 },
  cinematic_snap: { pos: 0.55, zoom: 0.45 },
  duel:      { pos: 0.072, zoom: 0.052 },   // slightly slower than combat for smoothness
  duel_close: { pos: 0.110, zoom: 0.082 },  // tighter when fighters are close
};

// ── Camera Keyframe Sequencer ─────────────────────────────────────────────────
// createCameraSequence(keyframes) — drives camera through a timed path.
// Each keyframe: { t: seconds, zoom: number, target: entityRef|{x,y}|null }
// While a sequence is active, cinematicCamOverride is forced true.
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
    // Sequence finished — apply final frame and release
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
  // Detect combat conditions: any attack active OR players within 220px
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
  if (anyAttacking || combatClose) _camCombatTimer = 25; // stay in combat mode 25 frames after last trigger
  if (_camCombatTimer > 0) {
    _camCombatTimer--;
    _camMode = 'combat';
  } else {
    _camMode = 'gameplay';
  }
}

// ============================================================
function updateCamera() {
  // Camera keyframe sequence: runs at 60fps (dt = 1/60s per frame)
  if (_camSeq) { _tickCameraSequence(1 / 60); return; }
  _updateCamMode();

  const _lerpRaw = _CAM_LERP[_camMode] || _CAM_LERP.gameplay;
  // Cinematic modes take their rate immediately (they are deliberate cuts);
  // gameplay/combat/duel ease so the transition isn't itself a lurch.
  if (_camMode === 'cinematic' || _camMode === 'cinematic_snap') {
    _camLerpPos = _lerpRaw.pos; _camLerpZoom = _lerpRaw.zoom;
  } else {
    _camLerpPos  += (_lerpRaw.pos  - _camLerpPos)  * 0.07;
    _camLerpZoom += (_lerpRaw.zoom - _camLerpZoom) * 0.07;
  }
  const lerp = { pos: _camLerpPos, zoom: _camLerpZoom };
  const activePlayers = [...players, ...trainingDummies, ...minions].filter(p => p.health > 0 && !p.backstageHiding);

  // ── HUD safe-area offset ──────────────────────────────────────────────────
  // The HUD is a fixed HTML bar at the top of the screen. Convert its pixel
  // height to game units so camera targets can be shifted down, keeping
  // players visible below the HUD instead of hidden behind it.
  const _hudEl = document.getElementById('hud');
  const _hudScreenH = (_hudEl && _hudEl.offsetHeight) || 0;
  const _hudGU = _hudScreenH * GAME_H / Math.max(canvas.height, 1); // HUD height in game units
  const _hudShift = _hudGU / 2; // shift camera center down by half HUD height

  let targetZoom = 1.0;
  let targetX    = GAME_W / 2;
  let targetY    = GAME_H / 2;

  // ── Online: track only local player ──────────────────────
  if (gameMode === 'online' && typeof localPlayerSlot !== 'undefined' && players[localPlayerSlot]) {
    const lp = players[localPlayerSlot];
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

  // ── Battle Royale: lock camera to P1 (or spectate target) ───
  if (gameMode === 'battleroyale') {
    const brCamTarget = (typeof brSpectating !== 'undefined' && brSpectating && typeof brSpectateTarget !== 'undefined' && brSpectateTarget)
      ? brSpectateTarget
      : (players[0] && players[0].health > 0 ? players[0] : null);
    if (brCamTarget) {
      camXTarget = brCamTarget.cx();
      camYTarget = brCamTarget.cy() + _hudShift;
      camZoomTarget = 1.0;
      camZoomCur += (camZoomTarget - camZoomCur) * lerp.zoom;
      camXCur    += (camXTarget - camXCur) * lerp.pos;
      camYCur    += (camYTarget - camYCur) * lerp.pos;
    }
    return;
  }

  if (activePlayers.length > 0) {
    // Exploration: track only P1 at steady zoom — world is wide
    if (gameMode === 'exploration' && players[0] && players[0].health > 0) {
      const ep = players[0];
      // Lead camera ahead of the player's facing direction (like the prequel camera)
      const _expLead = ep.facing * (28 + Math.min(65, Math.abs(ep.vx) * 14));
      const targetX2    = ep.cx() + _expLead;
      const targetY2    = ep.cy() - 30;
      const targetZoom2 = 1.05;
      camZoomTarget = targetZoom2;
      const dx2 = targetX2 - camXTarget, dy2 = targetY2 - camYTarget;
      if (Math.hypot(dx2, dy2) > CAMERA_DEAD_ZONE) { camXTarget = targetX2; camYTarget = targetY2; }
      _updateCameraDrama();
      // Lerp toward camZoomTarget, not the local base: the drama cam writes its
      // pull-back / push-in there and would otherwise be ignored in exploration.
      camZoomCur += (camZoomTarget - camZoomCur) * 0.08;
      camXCur    += (camXTarget  - camXCur)    * 0.10;
      camYCur    += (camYTarget  - camYCur)    * 0.10;
      return;
    }

    const _isWide = !!(currentArena && currentArena.worldWidth);

    if (!_isWide) {
      // ── Standard arena: frame the fighters, never past the map edges ──
      const _aLeft  = (currentArena && currentArena.mapLeft  !== undefined) ? currentArena.mapLeft  : 0;
      const _aRight = (currentArena && currentArena.mapRight !== undefined) ? currentArena.mapRight : GAME_W;
      const _aW     = _aRight - _aLeft;
      // Available viewport height below the HUD (add a small buffer so floor isn't flush against edge)
      const _safeH  = Math.max(GAME_H - _hudGU * 1.15, GAME_H * 0.72);
      const _fullZoom = Math.max(0.72, Math.min(1.0, Math.min(GAME_W / (_aW + 16), _safeH / (GAME_H + 8))));

      // Full-map framing renders fighters as small figures in empty space, so push
      // in on their bounding box and widen back out only as they separate;
      // _fullZoom is the floor. The box is clamped to the arena rect because a
      // fighter launched above the ceiling or knocked past an edge would otherwise
      // drag the framing into off-map space.
      let _sMinX = Infinity, _sMaxX = -Infinity, _sMinY = Infinity, _sMaxY = -Infinity;
      for (const p of activePlayers) {
        _sMinX = Math.min(_sMinX, Math.max(_aLeft,  p.x));
        _sMaxX = Math.max(_sMaxX, Math.min(_aRight, p.x + (p.w || 0)));
        _sMinY = Math.min(_sMinY, Math.max(0,      p.y));
        _sMaxY = Math.max(_sMaxY, Math.min(GAME_H, p.y + (p.h || 0)));
      }
      if (_sMaxX < _sMinX) { _sMinX = _aLeft; _sMaxX = _aRight; }
      if (_sMaxY < _sMinY) { _sMinY = 0; _sMaxY = GAME_H; }
      const _sPad  = 190;
      const _sZoom = Math.min(GAME_W / ((_sMaxX - _sMinX) + _sPad), _safeH / ((_sMaxY - _sMinY) + _sPad));
      targetZoom = Math.max(_fullZoom, Math.min(1.40, _sZoom));
      const _sCX = (_sMinX + _sMaxX) / 2;
      const _sCY = (_sMinY + _sMaxY) / 2;
      // Blend toward the map centre as the view widens, so a full-map framing is
      // still centred on the arena rather than on whichever fighter drifted.
      const _sTight = Math.max(0, Math.min(1, (targetZoom - _fullZoom) / Math.max(0.001, 1.40 - _fullZoom)));
      targetX = (_aLeft + _aRight) / 2 * (1 - _sTight) + _sCX * _sTight;
      targetY = (GAME_H / 2) * (1 - _sTight) + _sCY * _sTight + _hudShift;
      // The shared world clamp further down only engages when the world is taller
      // than the viewport, which is false for standard arenas — clamp here instead.
      {
        const _sHvw = GAME_W / (2 * targetZoom);
        const _sHvh = GAME_H / (2 * targetZoom);
        if (_aRight - _aLeft > 2 * _sHvw) targetX = Math.max(_aLeft + _sHvw, Math.min(_aRight - _sHvw, targetX));
        else                              targetX = (_aLeft + _aRight) / 2;
        if (GAME_H > 2 * _sHvh)           targetY = Math.max(_sHvh + _hudGU, Math.min(GAME_H - _sHvh, targetY));
      }
      if (camHitZoomTimer > 0) {
        camHitZoomTimer--;
        targetZoom += 0.10 * (camHitZoomTimer / 15);
      }
    } else {
      // ── Wide/scrolling arena: bounding-box tracking to follow players ──────
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of activePlayers) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x + (p.w || 0));
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y + (p.h || 0));
      }
      const PAD      = 220;
      const zoomX    = GAME_W / ((maxX - minX) + PAD);
      const _safeH   = Math.max(GAME_H - _hudGU, GAME_H * 0.7);
      const zoomY    = _safeH / ((maxY - minY) + PAD);
      const minZoom  = Math.max(0.30, GAME_W / (currentArena.worldWidth + 200));
      targetZoom = Math.min(1.18, Math.max(minZoom, Math.min(zoomX, zoomY)));
      const rawCX  = (minX + maxX) / 2;
      const rawCY  = (minY + maxY) / 2;
      const humanP = activePlayers.find(p => !p.isAI && !p.isBoss) || activePlayers[0];
      // Facing look-ahead: only when there is exactly one human player (avoids fighting in local co-op)
      const _humanPlayers = activePlayers.filter(p => !p.isAI && !p.isBoss);
      const _wideLead = (_humanPlayers.length === 1)
        ? humanP.facing * (20 + Math.min(55, Math.abs(humanP.vx) * 12)) : 0;
      // Bias toward the human as the fighters separate. Framing the midpoint is
      // worth it only while both fighters actually fit on screen; on a huge map
      // (megacity is 3600 wide) a far-off opponent otherwise drags the camera
      // hundreds of units behind the player they are controlling, which reads as
      // the camera lagging and then snapping. _spread is 0 while the pair frames
      // comfortably and ramps to 1 once the box outgrows the viewport.
      const _viewW  = GAME_W / Math.max(0.05, targetZoom);
      const _spread = Math.max(0, Math.min(1, ((maxX - minX) - _viewW * 0.55) / (_viewW * 0.45)));
      const _humanW = 0.28 + 0.72 * _spread;
      targetX = rawCX * (1 - _humanW) + (humanP.cx() + _wideLead) * _humanW;
      const _viewH   = _safeH / Math.max(0.05, targetZoom);
      const _spreadY = Math.max(0, Math.min(1, ((maxY - minY) - _viewH * 0.55) / (_viewH * 0.45)));
      const _humanWY = 0.38 + 0.62 * _spreadY;
      targetY = rawCY * (1 - _humanWY) + humanP.cy() * _humanWY + _hudShift;
      // Brief hit-zoom pulse for wide arenas
      if (camHitZoomTimer > 0) {
        camHitZoomTimer--;
        targetZoom = Math.max(targetZoom, 1.0 + 0.22 * (camHitZoomTimer / 15));
      }
      // Boss attack: bias camera toward boss on wide maps
      if (!cinematicCamOverride && gameRunning) {
        // attackTimer flips on and off between frames; on a 3600-wide map a hard
        // 0.4 pull toward the boss is a several-hundred-unit target step every
        // swing and back again. Ramp the weight instead.
        const attackingBoss = players.find(p => p.isBoss && p.attackTimer > 0 && p.health > 0)
          || players.find(p => p.isBoss && p.health > 0 && _camBossBias > 0.01);
        const _bossWant = (attackingBoss && attackingBoss.attackTimer > 0) ? 1 : 0;
        _camBossBias += (_bossWant - _camBossBias) * 0.08;
        if (attackingBoss && _camBossBias > 0.01) {
          const _bw = 0.4 * _camBossBias;
          targetZoom = Math.max(targetZoom, 1.0 + 0.08 * _camBossBias);
          targetX = targetX * (1 - _bw) + attackingBoss.cx() * _bw;
          targetY = targetY * (1 - _bw) + attackingBoss.cy() * _bw;
        }
      } else { _camBossBias = 0; }
    }
  }

  {
    camZoomTarget = targetZoom;
    // Soft dead zone: hold the target still for small jitter, but once the dead zone
    // is exceeded track continuously from its edge. The old form snapped the target
    // all the way to `targetX`, which froze it again until the next 28-unit breach —
    // a staircase that reads as the camera stuttering behind a walking player.
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
    _camVX = Math.max(-_CAM_MAX_SPEED, Math.min(_CAM_MAX_SPEED, _camVX));
    _camVY = Math.max(-_CAM_MAX_SPEED, Math.min(_CAM_MAX_SPEED, _camVY));
    camXCur += _camVX;
    camYCur += _camVY;
  }

  // ── Clamp camera to world bounds so we never show empty space past map edges ──
  // Published so the HUD clamp below can respect it: a clamp that pushes the
  // camera past this bound is immediately undone here next frame, and the two
  // fighting each frame is exactly what reads as camera vibration.
  let _camWorldTopBound = -Infinity;
  let _camWorldBotBound = Infinity;
  if (currentArena && !cinematicCamOverride) {
    // Half-viewport in world units at current zoom
    const hvw = GAME_W / (2 * camZoomCur);  // half viewport width  (world units)
    const hvh = GAME_H / (2 * camZoomCur);  // half viewport height (world units)

    const wLeft  = currentArena.mapLeft  !== undefined ? currentArena.mapLeft  : 0;
    const wRight = currentArena.mapRight !== undefined ? currentArena.mapRight : (currentArena.worldWidth || GAME_W);

    // Only clamp if the world is wider than the viewport (otherwise centering is fine)
    if (wRight - wLeft > GAME_W / camZoomCur) {
      const _cxClamped = Math.max(wLeft + hvw, Math.min(wRight - hvw, camXCur));
      // Zero the velocity pushing into the edge, otherwise it keeps building
      // against the wall and releases as a lurch the moment the clamp lets go.
      if (_cxClamped !== camXCur) _camVX = 0;
      camXCur = _cxClamped;
    }

    // Vertical: clamp so floor is always visible (don't pan above top or below floor+margin).
    // Also account for the HUD at the top of the screen — it blocks that many game-units of
    // visible area, so we must shift the top clamp down by _hudGU so players on the highest
    // platform aren't hidden behind the HUD bar. Clamping camYTarget alongside camYCur
    // stops the lerp from fighting the boundary each frame (the root cause of vibration).
    // Arenas with an underground layer set worldBottom so the camera may pan
    // down into tunnel space; everywhere else the floor stays the hard bottom.
    const floorPl = currentArena.platforms && currentArena.platforms.find(p => p.isFloor);
    const wBottom = currentArena.worldBottom !== undefined ? currentArena.worldBottom
      : (floorPl ? floorPl.y + 80 : GAME_H);
    // The playable ceiling is not y=0: arenas stack platforms near the top of the
    // screen and low-gravity arenas (space) throw fighters well above them. Pinning
    // the ceiling at 0 leaves a vertical window too small to both show the floor and
    // clear the HUD, so this clamp and the HUD clamp below end up demanding opposite
    // camera positions on alternate frames. Open the ceiling to the highest platform
    // plus a jump's worth of headroom; this only *permits* panning up, it never forces
    // it, so arenas whose action stays low are unaffected.
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

  // ── HUD player-visibility clamp ──────────────────────────────────────────────
  // The canvas buffer (canvas.height px tall) is CSS-displayed as
  // (window.innerHeight - _hudScreenH) px, anchored at CSS y=0, directly behind
  // the opaque HUD bar.  Buffer pixel Y maps to CSS Y = bufY * cssH / canvas.height,
  // which is *less* than bufY — so content near the top of the buffer renders
  // higher on screen than the plain _hudGU calculation expects.
  //
  // This clamp enforces: the topmost active player's top edge always appears at
  // least _HUD_GAP CSS pixels below the HUD's bottom edge, in every camera mode.
  const _HUD_GAP = 24; // minimum gap in CSS px between HUD bottom and player top
  if (!cinematicCamOverride && gameRunning && _hudScreenH > 0 && activePlayers.length > 0) {
    const _cssCH = Math.max(window.innerHeight - _hudScreenH, 1);
    // The buffer-pixel row that corresponds to (HUD bottom + gap) in CSS:
    const _hudBufLimit = (_hudScreenH + _HUD_GAP) * canvas.height / _cssCH;
    // For the topmost player at world-Y = _topmostY we need:
    //   (_topmostY - camYCur) * finalScY + canvas.height/2  >=  _hudBufLimit
    // →  camYCur  <=  _topmostY + (canvas.height/2 - _hudBufLimit) / finalScY
    // A fighter launched above the arena ceiling cannot be framed at all — the
    // world clamp forbids panning up there — so treat everything above the top
    // of the map as sitting at the ceiling. Low-gravity arenas (space) send bots
    // hundreds of units above y=0, which would otherwise demand an impossible
    // camera position every frame.
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
        // Never pan above the world's top bound to satisfy the HUD gap: the world
        // clamp would just undo it on the next frame, and the resulting per-frame
        // tug of war is the camera vibration seen on tall/low-gravity arenas.
        const _hudCamY = Math.max(_hudCamMax, _camWorldTopBound);
        if (camYCur > _hudCamY) {
          camYCur    = _hudCamY;
          camYTarget = Math.min(camYTarget, _hudCamY);
          _camVY     = 0;
        }
      }
    }
  }

  // ── CAMERA FAILSAFE: player out of view → instant partial snap ───────────────
  // Cooldown prevents repeated snaps each frame (causes shudder when lerp fights snap).
  if (_camSnapCooldown > 0) _camSnapCooldown--;
  if (!cinematicCamOverride && gameRunning && activePlayers.length > 0 && _camSnapCooldown === 0) {
    // Entities knocked outside the arena bounds are unreachable: the framing is
    // clamped to the map, so chasing them re-fires this snap every cooldown and
    // the branch target drags the camera straight back — a tug of war that reads
    // as the camera lurching sideways. They are also about to die. Skip them.
    const _fsLeft  = (currentArena && currentArena.mapLeft  !== undefined) ? currentArena.mapLeft  : 0;
    const _fsRight = (currentArena && currentArena.mapRight !== undefined) ? currentArena.mapRight : GAME_W;
    // Only the fighters the camera is responsible for. Two fighters further apart
    // than the viewport can never both be framed, so snapping toward an AI that
    // is off-screen only undoes the HUD clamp's correct choice — every cooldown,
    // for as long as the separation lasts. Falls back to everyone when there is
    // no human to follow (bot-vs-bot demos).
    // ONE subject only. Two humans on a 3600-wide arena are routinely further
    // apart than any viewport, so a list here makes the loop snap to whichever is
    // off-screen, break, and then snap to the other 10 frames later — a 600-1100
    // world-unit ping-pong that is exactly what reads as "the camera snaps on long
    // maps". The framing logic above already biases toward the local human as the
    // pair separates; the failsafe only needs to rescue that one fighter.
    const _fsHumans = activePlayers.filter(p => !p.isAI && !p.isBoss);
    const _fsSubjects = (gameMode === 'online' && typeof localPlayerSlot !== 'undefined' && players[localPlayerSlot] && players[localPlayerSlot].health > 0)
      ? [players[localPlayerSlot]]
      : (_fsHumans.length ? [_fsHumans[0]] : activePlayers.slice(0, 1));
    for (const _fp of _fsSubjects) {
      if (_fp.cx() < _fsLeft - 40 || _fp.cx() > _fsRight + 40) continue;
      const _sx    = (_fp.cx() - camXCur) * camZoomCur + GAME_W * 0.5;
      const _syTop = (_fp.y - camYCur) * camZoomCur + GAME_H * 0.5;
      const _syBot = (_fp.y + (_fp.h || 50) - camYCur) * camZoomCur + GAME_H * 0.5;
      const _hudTopPx = _hudGU * camZoomCur; // HUD occupies this many px at top
      const _margin = 40;
      // A fighter standing on the arena's highest platform sits behind the HUD and
      // cannot be pulled out from under it: the world clamp already holds the
      // camera at its top bound. Snapping up anyway is undone by that clamp on the
      // next frame and re-fires every cooldown — a 10-frame oscillation that reads
      // as the camera vibrating while the player just stands there. Only treat the
      // HUD overlap as a failsafe trigger when there is room left to pan up.
      const _canPanUp = camYCur > _camWorldTopBound + 1;
      const _lost = (_sx < -_margin || _sx > GAME_W + _margin ||
          _syBot < -_margin || _syTop > GAME_H + _margin ||
          (_syTop < _hudTopPx - _margin && _canPanUp));
      // The failsafe is for "the framing logic has lost this fighter", NOT for
      // "the camera hasn't finished getting there". During a big zoom-out (0.97 ->
      // 0.32 on a wide arena takes ~60 frames) everyone is briefly off-screen, and
      // firing here just fights the pending framing every cooldown. Re-run the same
      // test against where the camera is HEADING; only a fighter off-screen there
      // too is genuinely lost.
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
      if (_lostAtTarget) {
        // Snap once, then disable lerp conflict for 10 frames
        camXCur    += (_fp.cx() - camXCur) * 0.50;
        camYCur    += (_fp.cy() + _hudShift - camYCur) * 0.50;
        // Keep the snap inside the same world bounds the clamp above enforces,
        // so the two can never demand opposite camera positions on alternate frames.
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
