'use strict';

// ============================================================
// INTELLIGENT MULTI-MODE CAMERA SYSTEM
// Mode 1 — Gameplay: bounding-box tracking, 60/40 player bias
// Mode 2 — Combat Focus: triggered when players are close / attacking
// Mode 3 — Cinematic: entity-lock (boss attacks, QTEs, specials)
// ============================================================
let _camMode         = 'gameplay';  // 'gameplay' | 'combat' | 'cinematic'
let _camCombatTimer  = 0;           // frames remaining in forced combat mode
let _camModeBlend    = 0;           // 0→1 smoothing factor for mode transitions

// Per-mode lerp speeds
const _CAM_LERP = {
  gameplay:  { pos: 0.062, zoom: 0.045 },
  combat:    { pos: 0.130, zoom: 0.095 },
  cinematic: { pos: 0.220, zoom: 0.180 },
};

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
    _camMode = 'cinematic';
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
  _updateCamMode();

  const lerp = _CAM_LERP[_camMode] || _CAM_LERP.gameplay;
  const activePlayers = [...players, ...trainingDummies, ...minions].filter(p => p.health > 0 && !p.backstageHiding);

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

  if (activePlayers.length > 0) {
    // Exploration: track only P1 at steady zoom — world is wide
    if (gameMode === 'exploration' && players[0] && players[0].health > 0) {
      const ep = players[0];
      const targetX2    = ep.cx();
      const targetY2    = ep.cy() - 30;
      const targetZoom2 = 1.05;
      camZoomTarget = targetZoom2;
      const dx2 = targetX2 - camXTarget, dy2 = targetY2 - camYTarget;
      if (Math.hypot(dx2, dy2) > CAMERA_DEAD_ZONE) { camXTarget = targetX2; camYTarget = targetY2; }
      _updateCameraDrama();
      camZoomCur += (targetZoom2 - camZoomCur) * 0.08;
      camXCur    += (camXTarget  - camXCur)    * 0.10;
      camYCur    += (camYTarget  - camYCur)    * 0.10;
      return;
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of activePlayers) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x + (p.w || 0));
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y + (p.h || 0));
    }

    // ── Mode 2 — Combat Focus: center on midpoint, zoom in ──
    if (_camMode === 'combat' && activePlayers.length >= 2) {
      const pA = activePlayers[0], pB = activePlayers[activePlayers.length - 1];
      const midX = (pA.cx() + pB.cx()) / 2;
      const midY = (pA.cy() + pB.cy()) / 2;
      const spread = Math.hypot(pA.cx() - pB.cx(), pA.cy() - pB.cy());
      const combatZoom = Math.max(0.55, Math.min(1.2, 320 / (spread + 80)));
      targetX    = midX;
      targetY    = midY + 20;  // slight downward offset to show floor
      targetZoom = combatZoom;
    } else {
      // ── Mode 1 — Gameplay: always fit all players in frame ───
      // Use a larger PAD on wide maps so players don't crowd the screen edges
      const isWideMap = !!(currentArena && currentArena.worldWidth);
      const PAD       = isWideMap ? 220 : 140;
      const zoomX     = GAME_W / ((maxX - minX) + PAD);
      const zoomY     = GAME_H / ((maxY - minY) + PAD);
      // On wide maps keep a zoom floor of 0.30 so players never become tiny specks
      const minZoom   = isWideMap
        ? Math.max(0.30, GAME_W / (currentArena.worldWidth + 200))
        : 0.42;
      targetZoom = Math.min(1.18, Math.max(minZoom, Math.min(zoomX, zoomY)));

      const rawCX  = (minX + maxX) / 2;
      const rawCY  = (minY + maxY) / 2;
      // 78/22 bias: slight nudge toward first human player
      const humanP = activePlayers.find(p => !p.isAI && !p.isBoss) || activePlayers[0];
      targetX = rawCX * 0.78 + humanP.cx() * 0.22;
      targetY = rawCY * 0.82 + humanP.cy() * 0.18;
    }

    // Brief hit-zoom (cinematic heavy hit pulse)
    if (camHitZoomTimer > 0) {
      camHitZoomTimer--;
      targetZoom = Math.max(targetZoom, 1.0 + 0.22 * (camHitZoomTimer / 15));
    }

    // Boss attack: bias camera slightly toward boss (unchanged behaviour)
    if (!cinematicCamOverride && gameRunning && _camMode !== 'combat') {
      const attackingBoss = players.find(p => p.isBoss && p.attackTimer > 0 && p.health > 0);
      if (attackingBoss) {
        targetZoom = Math.max(targetZoom, 1.08);
        targetX = targetX * 0.6 + attackingBoss.cx() * 0.4;
        targetY = targetY * 0.6 + attackingBoss.cy() * 0.4;
      }
    }
  }

  camZoomTarget = targetZoom;
  const dx = targetX - camXTarget, dy = targetY - camYTarget;
  if (Math.hypot(dx, dy) > CAMERA_DEAD_ZONE) {
    camXTarget = targetX;
    camYTarget = targetY;
  }

  _updateCameraDrama();

  // Smooth transition: use combat-speed lerp when entering/leaving mode
  camZoomCur += (camZoomTarget - camZoomCur) * lerp.zoom;
  camXCur    += (camXTarget    - camXCur)    * lerp.pos;
  camYCur    += (camYTarget    - camYCur)    * lerp.pos;

  // ── Clamp camera to world bounds so we never show empty space past map edges ──
  if (currentArena && !cinematicCamOverride) {
    // Half-viewport in world units at current zoom
    const hvw = GAME_W / (2 * camZoomCur);  // half viewport width  (world units)
    const hvh = GAME_H / (2 * camZoomCur);  // half viewport height (world units)

    const wLeft  = currentArena.mapLeft  !== undefined ? currentArena.mapLeft  : 0;
    const wRight = currentArena.mapRight !== undefined ? currentArena.mapRight : (currentArena.worldWidth || GAME_W);

    // Only clamp if the world is wider than the viewport (otherwise centering is fine)
    if (wRight - wLeft > GAME_W / camZoomCur) {
      camXCur = Math.max(wLeft  + hvw, Math.min(wRight - hvw, camXCur));
    }

    // Vertical: clamp so floor is always visible (don't pan above top or below floor+margin)
    const floorPl = currentArena.platforms && currentArena.platforms.find(p => p.isFloor);
    const wBottom = floorPl ? floorPl.y + 80 : GAME_H;
    const wTop    = 0;
    if (wBottom - wTop > GAME_H / camZoomCur) {
      camYCur = Math.max(wTop + hvh, Math.min(wBottom - hvh, camYCur));
    }
  }
}

// ============================================================
// GAME LOOP
// ============================================================
let _lastFrameTime = 0;
const _FRAME_MIN_MS = 1000 / 62; // cap at ~62fps to prevent double-speed on 120Hz displays

function gameLoop(timestamp) {
  if (!gameRunning) return;
  // Frame rate cap: skip this frame if called too soon after the last one
  if (timestamp - _lastFrameTime < _FRAME_MIN_MS) {
    requestAnimationFrame(gameLoop);
    return;
  }
  _lastFrameTime = timestamp;
  if (paused || gameLoading) { requestAnimationFrame(gameLoop); return; }
  // Hitstop: freeze gameplay for a few frames on strong hits
  if (hitStopFrames > 0) {
    hitStopFrames--;
    screenShake *= 0.9; // decay-based shake
    requestAnimationFrame(gameLoop);
    return;
  }
  // Story cinematic freeze: halt physics without blocking rendering
  if (storyFreezeTimer > 0) {
    storyFreezeTimer--;
    // Still render (draw call happens later), but skip physics by falling through
    // to draw-only path — achieved by setting hitStopFrames for 1 frame
    hitStopFrames = 1;
    requestAnimationFrame(gameLoop);
    return;
  }
  // Decay hit-slow-motion burst back to normal
  if (hitSlowTimer > 0) {
    hitSlowTimer--;
    // Don't restore slowMotion during a finisher — finisher manages it
    if (hitSlowTimer <= 0 && slowMotion < 0.9 && !activeFinisher) slowMotion = 1.0;
  }
  // Cosmic silence: brief volume dip on heavy boss hits
  if (typeof SoundManager !== 'undefined' && SoundManager._cosmicSilenceTimer > 0) {
    SoundManager._cosmicSilenceTimer--;
    const _silVol = SoundManager._cosmicSilenceTimer > 4 ? 0.08 : 0.08 + (4 - SoundManager._cosmicSilenceTimer) * 0.23;
    SoundManager._silencedGain = _silVol;
  } else if (typeof SoundManager !== 'undefined' && SoundManager._silencedGain !== undefined && SoundManager._silencedGain < 1.0) {
    SoundManager._silencedGain = Math.min(1.0, (SoundManager._silencedGain || 0) + 0.06);
  }
  // Tick active cinematic (before input and physics)
  updateCinematic();
  if (typeof updateCinematicSystem === 'function') updateCinematicSystem();
  frameCount++;
  aiTick++;
  // Approximate real delta-time at 60fps for Director
  if (typeof updateDirector === 'function') updateDirector(1/60);

  // ---------- Phase: updateInput ----------
  // Online: tick network + apply remote player state
  if (onlineMode && gameRunning && NetworkManager.connected) {
    const localP  = players.find(p => !p.isRemote);
    const remoteP = players.find(p =>  p.isRemote);
    NetworkManager.tick(localP);
    if (remoteP) {
      const rs = NetworkManager.getRemoteStateLegacy();
      if (rs) {
        remoteP.x         = rs.x;
        remoteP.y         = rs.y;
        remoteP.vx        = rs.vx        || 0;
        remoteP.vy        = rs.vy        || 0;
        remoteP.health    = rs.health    != null ? rs.health    : remoteP.health;
        remoteP.maxHealth = rs.maxHealth != null ? rs.maxHealth : (remoteP.maxHealth || 100);
        remoteP.state     = rs.state     || 'idle';
        remoteP.onGround  = rs.state === 'idle' || rs.state === 'walking' || rs.state === 'attacking';
        remoteP.facing    = rs.facing    || remoteP.facing;
        remoteP.lives     = rs.lives     != null ? rs.lives     : remoteP.lives;
        remoteP.curses     = rs.curses    || [];
        remoteP.shielding  = rs.shield    || false;
        // Sync attack animation so weapon swing is visible on opponent's screen
        remoteP.attackTimer    = rs.attackTimer    != null ? rs.attackTimer    : remoteP.attackTimer;
        remoteP.attackDuration = rs.attackDuration != null ? rs.attackDuration : (remoteP.attackDuration || 12);
        remoteP.hurtTimer      = rs.hurtTimer      != null ? rs.hurtTimer      : 0;
        remoteP.stunTimer      = rs.stunTimer2     != null ? rs.stunTimer2     : 0;
        // Sync invincible from owning machine — prevents permanent transparency/unhittable
        remoteP.invincible = rs.invincible != null ? rs.invincible : 0;
        // Sync weapon — always apply to prevent stale local-UI weapon showing
        if (rs.weaponKey && WEAPONS[rs.weaponKey]) {
          remoteP.weaponKey = rs.weaponKey;
          remoteP.weapon    = WEAPONS[rs.weaponKey];
        }
        if (rs.color) remoteP.color = rs.color;
        if (rs.name)  remoteP.name  = rs.name;
        if (rs.hat)   remoteP.hat   = rs.hat;
        if (rs.cape)  remoteP.cape  = rs.cape;
      }
    }
  }

  processInput(); // updateInput

  // ---------- Phase: updateBossArena (platforms, floor hazard) ----------
  if (currentArena && currentArena.isBossArena) {
    // Animate moving platforms — random-lerp targets for unpredictable movement
    // Boss arena: 2x speed (shorter timer range, faster lerp)
    const bossPlSpeed = currentArenaKey === 'creator' ? 2 : 1;
    const bossLerpSpd = currentArenaKey === 'creator' ? 0.14 : 0.07;
    for (const pl of currentArena.platforms) {
      if (pl.ox !== undefined) {
        if (pl.rx === undefined || pl.rTimer <= 0) {
          pl.rx    = pl.ox + (Math.random() - 0.5) * pl.oscX * 2;
          pl.rx    = clamp(pl.rx, pl.ox - pl.oscX, pl.ox + pl.oscX);
          pl.rTimer = Math.floor((30 + Math.floor(Math.random() * 50)) / bossPlSpeed);
        }
        pl.rTimer--;
        pl.x = lerp(pl.x, pl.rx, bossLerpSpd);
      }
      if (pl.oy !== undefined) {
        if (pl.ry === undefined || pl.ryTimer <= 0) {
          pl.ry    = pl.oy + (Math.random() - 0.5) * pl.oscY * 2;
          pl.ry    = clamp(pl.ry, pl.oy - pl.oscY, pl.oy + pl.oscY);
          pl.ryTimer = Math.floor((30 + Math.floor(Math.random() * 50)) / bossPlSpeed);
        }
        pl.ryTimer--;
        pl.y = lerp(pl.y, pl.ry, bossLerpSpd);
      }
    }

    // Floor hazard state machine
    bossFloorTimer--;
    if (bossFloorTimer <= 0) {
      if (bossFloorState === 'normal') {
        bossFloorState = 'warning';
        bossFloorType  = Math.random() < 0.5 ? 'lava' : 'void';
        bossFloorTimer = BOSS_FLOOR_WARNING_FRAMES; // 3-second warning
        showBossDialogue(bossFloorType === 'lava'
          ? randChoice(['The floor has a new purpose.', 'Heat is a matter of perspective.', 'I\'d move if I were you. I\'m not.'])
          : randChoice(['The ground is a luxury.', 'Space beneath your feet — gone.', 'Let\'s see how well you float.']), 220);
      } else if (bossFloorState === 'warning') {
        bossFloorState = 'hazard';
        bossFloorTimer = 900; // 15-second hazard
        const floorPl  = currentArena.platforms.find(p => p.isFloor);
        if (bossFloorType === 'lava') {
          if (floorPl) { floorPl.isFloorDisabled = true; }
          currentArena.hasLava = true;
          currentArena.lavaY   = 462;
          currentArena.deathY  = 560;
        } else {
          if (floorPl) { floorPl.isFloorDisabled = true; }
          currentArena.deathY = 530;
        }
      } else { // 'hazard' → back to normal
        bossFloorState = 'normal';
        bossFloorTimer = 1200 + Math.floor(Math.random() * 600); // 20–30 s until next
        const floorPl  = currentArena.platforms.find(p => p.isFloor);
        if (floorPl) { floorPl.isFloorDisabled = false; }
        currentArena.hasLava = false;
        currentArena.deathY  = 640;
        mapPerkState.eruptions    = [];
        mapPerkState.eruptCooldown = 0;
      }
    }

    // Boss lava hazard: spawn eruption columns
    if (bossFloorState === 'hazard' && bossFloorType === 'lava') {
      if (!mapPerkState.eruptions)     mapPerkState.eruptions     = [];
      if (!mapPerkState.eruptCooldown) mapPerkState.eruptCooldown = 120;
      mapPerkState.eruptCooldown--;
      if (mapPerkState.eruptCooldown <= 0) {
        const ex = 80 + Math.random() * 740;
        mapPerkState.eruptions.push({ x: ex, timer: 180 });
        mapPerkState.eruptCooldown = 150 + Math.floor(Math.random() * 150);
      }
      // Tick down eruption timers
      for (let ei = mapPerkState.eruptions.length - 1; ei >= 0; ei--) {
        const er = mapPerkState.eruptions[ei];
        er.timer--;
        if (er.timer <= 0) { mapPerkState.eruptions.splice(ei, 1); continue; }
        if (er.timer % 5 === 0 && settings.particles && particles.length < MAX_PARTICLES) {
          const upA = -Math.PI/2 + (Math.random()-0.5)*0.5;
          const _p = _getParticle();
          _p.x = er.x; _p.y = currentArena.lavaY || 462;
          _p.vx = Math.cos(upA)*5; _p.vy = Math.sin(upA)*(8+Math.random()*8);
          _p.color = Math.random() < 0.5 ? '#ff4400' : '#ff8800';
          _p.size = 3+Math.random()*4; _p.life = 30+Math.random()*20; _p.maxLife = 50;
          particles.push(_p);
        }
        // Damage players in column
        for (const p of players) {
          if (p.isBoss || p.health <= 0 || p.invincible > 0) continue;
          if (Math.abs(p.cx() - er.x) < 100 && p.y + p.h > (currentArena.lavaY || 462) - 250) {
            if (er.timer % 10 === 0) dealDamage(players.find(q => q.isBoss) || players[1], p, Math.ceil(p.maxHealth * 0.044), 8);
          }
        }
      }
    }
  }

  // ---------- Phase: updateCamera (bounding box, dead zone, lerp) ----------
  const baseScale = Math.min(canvas.width / GAME_W, canvas.height / GAME_H);
  const baseScaleX = baseScale;
  const baseScaleY = baseScale;

  let camZoom, camCX, camCY;
  if (bossDeathScene) {
    camZoom = bossDeathScene.camZoom || 1;
    camCX   = bossDeathScene.orbX;
    camCY   = bossDeathScene.orbY;
  } else {
    updateCamera();
    camZoom = camZoomCur;
    camCX   = camXCur;
    camCY   = camYCur;
  }

  // Cinematic camera: smoothly zoom in on focal point during cinematic
  if (cinematicCamOverride) {
    camZoom += (cinematicZoomTarget - camZoom) * 0.09;
    camCX   += (cinematicFocusX    - camCX)   * 0.07;
    camCY   += (cinematicFocusY    - camCY)   * 0.07;
  }

  // Impact cinematic: override tracking target and apply zoom boost
  if (typeof _cinCamTarget !== 'undefined' && _cinCamTarget) {
    camCX += (_cinCamTarget.cx() - camCX) * _cinCamLerp;
    camCY += (_cinCamTarget.cy() - camCY) * _cinCamLerp;
  }
  if (typeof _cinCamZoomBoost !== 'undefined') camZoom *= (1 + _cinCamZoomBoost);

  const finalScX = baseScaleX * camZoom;
  const finalScY = baseScaleY * camZoom;

  // Clear canvas: fill with arena sky color so zoomed-out margins don't show black
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const _skyBg = ctx.createLinearGradient(0, 0, 0, canvas.height);
  _skyBg.addColorStop(0, currentArena?.sky?.[0] || '#000');
  _skyBg.addColorStop(1, currentArena?.sky?.[1] || '#000');
  ctx.fillStyle = _skyBg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  const _cinOX = typeof _cinCamOffX !== 'undefined' ? _cinCamOffX : 0;
  const _cinOY = typeof _cinCamOffY !== 'undefined' ? _cinCamOffY : 0;
  // Only apply screen shake above a threshold to prevent micro-jitter at near-zero values
  const _shakeAmt = screenShake > 1.0 ? screenShake : 0;
  const sx = (Math.random() - 0.5) * _shakeAmt + (canvas.width  / 2 - camCX * finalScX) + _cinOX;
  const sy = (Math.random() - 0.5) * _shakeAmt + (canvas.height / 2 - camCY * finalScY) + _cinOY;
  ctx.setTransform(finalScX, 0, 0, finalScY, sx, sy);

  // ---------- Phase: render (world, entities, particles, HUD) ----------
  drawBackground();
  drawPlatforms();
  if (typeof drawCinematicImpactWorldEffects === 'function') drawCinematicImpactWorldEffects();
  if (gameMode === 'minigames' && minigameType === 'soccer') drawSoccer();
  drawBackstagePortals();
  drawMapPerks();

  // Boss beams — update logic + draw (also in training mode when boss is present, or when an admin kit is equipped)
  const _anyAdminKit = typeof players !== 'undefined' && players.some(p => p._adminKit);
  const hasBossActive = (currentArena && currentArena.isBossArena) || (trainingMode && trainingDummies.some(d => d.isBoss)) || _anyAdminKit;
  if (hasBossActive) {
    for (const b of bossBeams) {
      if (b.phase === 'warning') {
        if (--b.warningTimer <= 0) { b.phase = 'active'; b.activeTimer = 110; }
      } else if (b.phase === 'active') {
        if (--b.activeTimer <= 0) { b.done = true; }
        else {
          // Deal damage each frame to players caught in beam
          const boss = players.find(p => p.isBoss) || trainingDummies.find(d => d.isBoss);
          const beamTargets = trainingMode ? players : players.filter(p => !p.isBoss);
          for (const p of beamTargets) {
            if (p.health <= 0 || p.invincible > 0) continue;
            // Skip damage if player is inside a safe zone
            const inSafe = bossMetSafeZones.some(sz =>
              Math.hypot(p.cx() - sz.x, (p.y + p.h * 0.5) - sz.y) < sz.r);
            if (!inSafe && Math.abs(p.cx() - b.x) < 24) dealDamage(boss || players[1], p, 8, 5);
          }
        }
      }
    }
    bossBeams = bossBeams.filter(b => !b.done);
    drawBossBeams();

    // Boss spikes — update and draw
    const bossRef = players.find(p => p.isBoss) || trainingDummies.find(d => d.isBoss);
    for (const sp of bossSpikes) {
      if (sp.done) continue;
      if (sp.phase === 'rising') {
        sp.h += 8;
        if (sp.h >= sp.maxH) { sp.h = sp.maxH; sp.phase = 'staying'; sp.stayTimer = 180; }
      } else if (sp.phase === 'staying') {
        sp.stayTimer--;
        if (sp.stayTimer <= 0) sp.phase = 'falling';
      } else if (sp.phase === 'falling') {
        sp.h -= 6;
        if (sp.h <= 0) { sp.h = 0; sp.done = true; }
      }
      // Damage and bounce players caught by spike
      if (sp.phase === 'rising' || sp.phase === 'staying') {
        const spikeTopY = 460 - sp.h;
        const spikeTargets = trainingMode ? players : players.filter(p => !p.isBoss);
        for (const p of spikeTargets) {
          if (p.health <= 0 || p.invincible > 0) continue;
          if (Math.abs(p.cx() - sp.x) < 9 && p.y + p.h > spikeTopY) {
            dealDamage(bossRef || players.find(q => q.isBoss) || players[1], p, 14, 14);
            // Bounce player upward so they can escape
            if (p.vy >= 0) {
              p.vy = -20;
              p.canDoubleJump = true;
            }
          }
        }
      }
    }
    bossSpikes = bossSpikes.filter(sp => !sp.done);
    drawBossSpikes();
    if (bossDeathScene) updateBossDeathScene();
    if (tfEndingScene)  updateTFEnding();
    // Telegraph system: pending attacks, stagger, desperation, warnings draw
    updateBossPendingAttacks();
    drawBossWarnings();
  }

  // ---------- Phase: updatePhysics/updateCombat (projectiles, minions, players) ----------
  projectiles.forEach(p => p.update());
  projectiles = projectiles.filter(p => p.active); // prevent leak
  projectiles.forEach(p => p.draw());

  // Minions (boss-spawned)
  minions.forEach(m => { if (m.health > 0) m.update(); });
  minions.forEach(m => { if (m.health > 0) m.draw(); });
  minions = minions.filter(m => m.health > 0);

  // Training dummies / bots
  if (trainingMode) {
    trainingDummies.forEach(d => { if (d.isDummy || d.health > 0 || d.invincible > 0) d.update(); });
    trainingDummies.forEach(d => { if (d.isDummy || d.health > 0 || d.invincible > 0) d.draw(); });
    // Remove dead bots (lives=0), keep dummies (they auto-heal)
    trainingDummies = trainingDummies.filter(d => {
      if (d.isDummy) return true; // dummies auto-heal, never remove
      // Decrement lives for dead bots not yet cleaned up (checkDeaths only handles players[])
      if (d.health <= 0 && d.invincible === 0 && d.lives > 0 && !d.isBoss) {
        d.lives--;
        spawnParticles(d.cx(), d.cy(), d.color, 10);
      }
      return d.health > 0 || d.invincible > 0 || d.lives > 0;
    });
  }

  // Soccer ball physics update
  if (gameMode === 'minigames' && minigameType === 'soccer') updateSoccerBall();
  // Minigame logic update
  if (gameMode === 'minigames') updateMinigame();
  // True Form special updates (also active when a trueform admin kit is equipped, or FORCE_ATTACK_MODE has active TF effects)
  const _anyTFKit = typeof players !== 'undefined' && players.some(p => p._adminKit && p._adminKit.kitKey === 'trueform');
  const _forceTF  = !!window.FORCE_ATTACK_MODE && (
    (typeof tfBlackHoles  !== 'undefined' && tfBlackHoles.length)  ||
    (typeof tfGravityWells!== 'undefined' && tfGravityWells.length)||
    (typeof tfClones      !== 'undefined' && tfClones.length)      ||
    (typeof tfShockwaves  !== 'undefined' && tfShockwaves.length)  ||
    (typeof tfGammaBeam   !== 'undefined' && tfGammaBeam)          ||
    (typeof tfNeutronStar !== 'undefined' && tfNeutronStar)        ||
    (typeof tfGalaxySweep !== 'undefined' && tfGalaxySweep)        ||
    (typeof tfMultiverse  !== 'undefined' && tfMultiverse)         ||
    (typeof tfSupernova   !== 'undefined' && tfSupernova)          ||
    (typeof tfMeteorCrash !== 'undefined' && tfMeteorCrash)        ||
    (typeof tfChainSlam   !== 'undefined' && tfChainSlam)          ||
    (typeof tfGraspSlam   !== 'undefined' && tfGraspSlam)          ||
    (typeof tfPhaseShift  !== 'undefined' && tfPhaseShift)         ||
    (typeof tfGravityInverted !== 'undefined' && tfGravityInverted)
  );
  if (gameMode === 'trueform' || _anyTFKit || _forceTF) {
    updateTFBlackHoles();
    updateTFGravityWells();
    updateTFMeteorCrash();
    updateTFClones();
    updateTFChainSlam();
    updateTFGraspSlam();
    updateTFShockwaves();
    updateTFPendingAttacks();
    updateTFGammaBeam();
    updateTFBurnTrail();
    updateTFNeutronStar();
    updateTFGalaxySweep();
    updateTFMultiverse();
    updateTFSupernova();
    // Gravity timer: auto-restore after 10 seconds
    if (tfGravityInverted && tfGravityTimer > 0) {
      tfGravityTimer--;
      if (tfGravityTimer <= 0) {
        tfGravityInverted = false;
        showBossDialogue('I restored gravity. You\'re welcome.', 150);
        spawnParticles(GAME_W / 2, GAME_H / 2, '#ffffff', 16);
      }
    }
    if (tfControlsInverted && tfControlsInvertTimer > 0) {
      tfControlsInvertTimer--;
      if (tfControlsInvertTimer <= 0) {
        tfControlsInverted = false;
        showBossDialogue('Your body is yours again. Briefly.', 150);
        spawnParticles(GAME_W / 2, GAME_H / 2, '#aaaaaa', 12);
      }
    }
  }

  // Verlet death ragdolls — update and remove when lifetime expires (prevent leak)
  verletRagdolls.forEach(vr => vr.update());
  verletRagdolls = verletRagdolls.filter(vr => !vr.isDone());

  // Draw Verlet death ragdolls (behind living players)
  verletRagdolls.forEach(vr => vr.draw());

  // Safety: clamp any Infinity/NaN velocities before physics update (avoids teleport bugs)
  for (const p of players) {
    if (!isFinite(p.vx)) p.vx = 0;
    if (!isFinite(p.vy)) p.vy = 0;
    if (!isFinite(p.x))  { p.x = GAME_W / 2; p.vx = 0; }
    if (!isFinite(p.y))  { p.y = 200;         p.vy = 0; }
  }
  // Players — skip physics update for remote (network-driven) players
  players.forEach(p => { if ((p.health > 0 || p.invincible > 0) && !p.isRemote) p.update(); });
  // Chaos system: per-frame update (events, drops, effects, multi-kill, announcer)
  if (typeof chaosMode !== 'undefined' && chaosMode && typeof updateChaosSystem === 'function') updateChaosSystem();
  // Finisher: override positions/state AFTER physics, BEFORE draw
  if (typeof updateFinisher === 'function') updateFinisher();
  players.forEach(p => { if (p.health > 0 || p.invincible > 0) p.draw(); });
  // Chaos system: world-space draw (item drops, effect badges, platform effects)
  if (typeof chaosMode !== 'undefined' && chaosMode && typeof drawChaosWorldSpace === 'function') drawChaosWorldSpace();
  drawSpartanRageEffects();
  drawClassEffects();
  drawCurseAuras();
  updateAndDrawLightningBolts();
  if (gameMode === 'trueform' || _anyTFKit || _forceTF) {
    updateTFPhaseShift();
    updateTFRealityTear();
    updateTFCalcStrike();
    updateTFRealityOverride();
    drawTFBlackHoles();
    drawTFGravityWells();
    drawTFMeteorCrash();
    drawTFClones();
    drawTFShockwaves();
    drawTFPhaseShift();
    drawTFRealityTear();
    drawTFCalcStrike();
    drawTFMathBubble();
    drawTFRealityOverride();
    drawTFBurnTrail();
    drawTFGammaBeam();
    drawTFNeutronStar();
    drawTFGalaxySweep();
    drawTFMultiverse();
    drawTFSupernova();
    drawBossWarnings();
  }
  drawPhaseTransitionRings();
  drawCinematicWorldEffects(); // ground cracks + world-space cinematic fx
  checkWeaponSparks();

  // Ability activation ring flash
  if (abilityFlashTimer > 0 && abilityFlashPlayer) {
    const fp = abilityFlashPlayer;
    ctx.save();
    ctx.globalAlpha = (abilityFlashTimer / 14) * 0.6;
    ctx.strokeStyle = fp.color;
    ctx.lineWidth   = 3;
    const r = (14 - abilityFlashTimer) * 4 + 8;
    ctx.beginPath(); ctx.arc(fp.cx(), fp.cy(), r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    abilityFlashTimer--;
  }

  drawSecretLetters();
  if (bossDeathScene) drawBossDeathScene();
  if (tfEndingScene)  drawTFEnding();
  updateMapPerks();
  updateMirrorGimmick();
  drawMirrorGimmickOverlay();
  // Controls-inverted status indicator
  if (tfControlsInverted && tfControlsInvertTimer > 0) {
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    const _cw = canvas.width, _ch = canvas.height;
    const _alpha = Math.min(1, tfControlsInvertTimer / 30) * 0.18;
    ctx.fillStyle = `rgba(180,0,255,${_alpha})`;
    ctx.fillRect(0, 0, _cw, _ch);
    const _secs = Math.ceil(tfControlsInvertTimer / 60);
    ctx.font = `bold ${Math.round(_cw * 0.028)}px monospace`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, tfControlsInvertTimer / 30);
    ctx.fillStyle = '#cc44ff';
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 18;
    ctx.fillText(`CONTROLS INVERTED  ${_secs}s`, _cw / 2, _ch * 0.12);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  updateFakeDeathScene();
  drawFakeDeathScene();

  // ---------- Phase: updateParticles (prevent memory leak: remove expired) ----------
  const _liveParticles = [];
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.12; p.vx *= 0.96;
    p.life--;
    if (p.life > 0) {
      _liveParticles.push(p);
      const a = p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.01, p.size * a), 0, Math.PI * 2);
      ctx.fill();
    } else {
      _recycleParticle(p);
    }
  }
  particles = _liveParticles; // keep only live (life > 0) to prevent leak
  ctx.globalAlpha = 1;

  // Damage texts — filter expired to prevent leak
  damageTexts.forEach(d => { d.update(); d.draw(); });
  damageTexts = damageTexts.filter(d => d.life > 0);

  // Respawn countdowns — filter expired to prevent leak
  for (const cd of respawnCountdowns) {
    cd.framesLeft--;
    if (cd.framesLeft <= 0) continue;
    const num = Math.ceil(cd.framesLeft / 22);
    const a   = Math.min(1, cd.framesLeft / 18) * (1 - Math.max(0, (22 - cd.framesLeft % 22) / 22) * 0.3);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.font        = 'bold 32px Arial';
    ctx.fillStyle   = cd.color;
    ctx.textAlign   = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur  = 8;
    ctx.fillText(num, cd.x, cd.y);
    ctx.restore();
  }
  respawnCountdowns = respawnCountdowns.filter(cd => cd.framesLeft > 0);

  // Boss phase 3: subtle red screen tint
  if (currentArena && currentArena.isBossArena && settings.bossAura) {
    const bossChar = players.find(p => p.isBoss);
    if (bossChar && bossChar.getPhase && bossChar.getPhase() >= 3 && bossChar.health > 0) {
      ctx.save();
      ctx.globalAlpha = 0.03 + Math.sin(frameCount * 0.04) * 0.012;
      ctx.fillStyle   = '#ff0000';
      ctx.fillRect(0, 0, GAME_W, GAME_H);
      ctx.restore();
    }
  }

  // Boss phase transition flash
  if (bossPhaseFlash > 0) {
    ctx.save();
    ctx.globalAlpha = (bossPhaseFlash / 50) * 0.55;
    ctx.fillStyle   = '#ffffff';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    bossPhaseFlash--;
    ctx.restore();
  }

  screenShake *= 0.9; // decay-based shake (smoother than instant drop)
  // Reset to non-shake transform (keep scale + camera centering, remove shake)
  ctx.setTransform(finalScX, 0, 0, finalScY,
    canvas.width  / 2 - camCX * finalScX,
    canvas.height / 2 - camCY * finalScY);

  checkDeaths();
  updateHUD();
  if (storyModeActive && typeof storyTickFightScript    === 'function') storyTickFightScript();
  if (storyModeActive && typeof storyCheckEvents        === 'function') storyCheckEvents();
  if (storyModeActive && typeof storyUpdateBoundaries   === 'function') storyUpdateBoundaries();
  if (exploreActive && typeof updateExploration === 'function') updateExploration();
  if (gameMode === 'trueform' && typeof updateQTE === 'function') updateQTE();

  // TrueForm: record player position history for multiverse lag-echo
  if (gameMode === 'trueform' && players[0] && players[0].health > 0) {
    _tfCloneHistory.push({ x: players[0].cx(), y: players[0].cy(), facing: players[0].facing });
    if (_tfCloneHistory.length > 24) _tfCloneHistory.shift();
  }

  // Minigame HUD overlay
  if (gameMode === 'minigames') drawMinigameHUD();
  // New chaos modifier notification
  if (_chaosModNotif && _chaosModNotif.timer > 0) {
    _chaosModNotif.timer--;
    const alpha = Math.min(1, _chaosModNotif.timer / 30);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#ff88ff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 12;
    ctx.fillText('+ ' + _chaosModNotif.label, GAME_W / 2, GAME_H - 60);
    ctx.restore();
  }
  if (exploreActive && typeof drawExploreGoalObject === 'function') drawExploreGoalObject();
  // Story mode: void fog + boundary warning (drawn in game-world space)
  if (storyModeActive) drawStoryVoidFog();
  if (storyModeActive && typeof drawStoryBoundaryWarning === 'function') drawStoryBoundaryWarning();
  // Achievement popups (drawn over everything, in screen space)
  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform for screen-space draw

  // Hit vignette: red edge flash when player takes heavy damage
  if (hitVignetteTimer > 0) {
    hitVignetteTimer--;
    const _va = (hitVignetteTimer / 28) * 0.38;
    const _vg = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height*0.3, canvas.width/2, canvas.height/2, canvas.height*0.9);
    _vg.addColorStop(0, hitVignetteColor + '0)');
    _vg.addColorStop(1, hitVignetteColor + _va.toFixed(3) + ')');
    ctx.fillStyle = _vg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (typeof drawCinematicImpactEffects === 'function') drawCinematicImpactEffects();
  drawCinematicOverlay();
  // Story world distortion intentionally disabled (purple scanlines removed per user request)
  drawAchievementPopups();
  // Chaos system: screen-space draw (score HUD, event badge, announcer, spectator label)
  if (typeof chaosMode !== 'undefined' && chaosMode && typeof drawChaosOverlay === 'function') drawChaosOverlay();
  if (gameMode === 'adaptive' && typeof drawAdaptiveAIDebug === 'function') drawAdaptiveAIDebug();
  if (typeof drawEntityOverlays === 'function') drawEntityOverlays(finalScX, finalScY, camCX, camCY);
  // Pathfinding debug overlays (toggled via `pf *` console commands, drawn in world-space)
  if (window._pfShowGraph && typeof visualizePlatformGraph  === 'function') visualizePlatformGraph();
  if (window._pfShowDJ    && typeof highlightDoubleJumpEdges === 'function') highlightDoubleJumpEdges();
  if (typeof players !== 'undefined') {
    const _pfBots = players.filter(p => p.isAI && !p.isBoss);
    if (window._pfShowPaths && typeof showBotPath           === 'function') _pfBots.forEach(showBotPath);
    if (window._pfShowArcs  && typeof showProjectedLanding  === 'function') _pfBots.forEach(showProjectedLanding);
  }
  if (storyModeActive && typeof drawStorySubtitle        === 'function') drawStorySubtitle();
  if (storyModeActive && typeof drawStoryOpponentHUD     === 'function') drawStoryOpponentHUD();
  if (storyModeActive && typeof drawStoryPhaseHUD        === 'function') drawStoryPhaseHUD();
  if ((currentArena.isBossArena || window.FORCE_ATTACK_MODE) && typeof drawBossDialogue === 'function') drawBossDialogue(finalScX, finalScY, camCX, camCY);
  if (gameMode === 'exploration') drawExploreHUD();
  if (abilityUnlockToast && abilityUnlockToast.timer > 0) drawAbilityUnlockToast();
  if (gameMode === 'trueform' && typeof drawQTE === 'function') drawQTE(ctx, canvas.width, canvas.height);
  if (typeof drawFinisher === 'function') drawFinisher(ctx); // finisher overlay (topmost)
  drawEdgeIndicators(finalScX, finalScY, camCX, camCY);
  // Restore the stable game transform after (remaining draws use it already)
  ctx.setTransform(finalScX, 0, 0, finalScY, canvas.width/2 - camCX*finalScX, canvas.height/2 - camCY*finalScY);

  // Infinite mode: draw win score on canvas (outside shake transform)
  if (infiniteMode && gameRunning) {
    const p1c = players[0] ? players[0].color : '#00d4ff';
    const p2c = players[1] ? players[1].color : '#ff4455';
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur  = 14;
    ctx.font        = 'bold 30px Arial';
    ctx.fillStyle   = p1c;
    ctx.fillText(winsP1, GAME_W / 2 - 48, 96);
    ctx.fillStyle   = 'rgba(255,255,255,0.7)';
    ctx.fillText('—', GAME_W / 2, 96);
    ctx.fillStyle   = p2c;
    ctx.fillText(winsP2, GAME_W / 2 + 48, 96);
    ctx.restore();
  }

  // Debug overlay (drawn last, in screen-space)
  if (debugMode) {
    runSanityChecks();
    renderDebugOverlay(ctx);
  }

  // Use error-boundary wrapper if available; fall back to raw rAF
  if (typeof ErrorBoundary !== 'undefined') {
    requestAnimationFrame(ErrorBoundary.wrapLoop(gameLoop));
  } else {
    requestAnimationFrame(gameLoop);
  }
}

// ============================================================
// INPUT
// ============================================================
const keysDown      = new Set();
const keyHeldFrames = {};   // key → frames held continuously

const SCROLL_BLOCK = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 's', '/']);

// Normalize a key string so that caps-lock and shift don't break single-letter
// bindings. Only single alphabetic characters are lowercased; everything else
// (Arrow*, Enter, ' ', '.', '/', etc.) is returned unchanged.
function _normKey(k) {
  return (k.length === 1 && k >= 'A' && k <= 'Z') ? k.toLowerCase() : k;
}

document.addEventListener('keydown', e => {
  // Don't intercept keys when typing in any text input (chat, console, etc.)
  const ae = document.activeElement;
  const inputFocused = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
  if (inputFocused) return; // let the input receive all keystrokes unmodified
  if (tfEndingScene && tfEndingScene.skippable && tfEndingScene.phase === 'powers') { trySkipTFEnding(); return; }
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { pauseGame(); return; }
  // Cheat code: type TRUEFORM anywhere in menu to unlock True Form
  // GAMECONSOLE works any time (menu or in-game)
  if (e.key && e.key.length === 1) {
    _cheatBuffer = ((_cheatBuffer || '') + e.key.toUpperCase()).slice(-20);
    if (_cheatBuffer.endsWith('GAMECONSOLE')) {
      _cheatBuffer = '';
      openGameConsole();
    }
  }
  if (!gameRunning && e.key && e.key.length === 1) {
    // _cheatBuffer already updated above — just check for menu-only codes
    if (_cheatBuffer.endsWith('TRUEFORM')) {
      _cheatBuffer = '';
      if (!unlockedTrueBoss) {
        unlockedTrueBoss = true;
        localStorage.setItem('smc_trueform', '1');
        localStorage.setItem('smc_letters', JSON.stringify([0,1,2,3,4,5,6,7]));
        collectedLetterIds = new Set([0,1,2,3,4,5,6,7]);
        syncCodeInput();
        const card = document.getElementById('modeTrueForm');
        if (card) card.style.display = '';
        spawnParticles && spawnParticles(450, 260, '#cc00ff', 30);
        spawnParticles && spawnParticles(450, 260, '#ffffff', 20);
        showBossDialogue && showBossDialogue('True Form Unlocked!', 180);
        // Show a brief notification
        const notif = document.createElement('div');
        notif.textContent = '⚡ TRUE FORM UNLOCKED ⚡';
        notif.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(160,0,255,0.92);color:#fff;padding:16px 32px;border-radius:12px;font-size:1.2rem;font-weight:900;letter-spacing:3px;z-index:9999;pointer-events:none;text-align:center;box-shadow:0 0 40px #cc00ff;';
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
      }
    }
    // MEGAKNIGHT cheat: type CLASSMEGAKNIGHT in menu
    if (_cheatBuffer.endsWith('CLASSMEGAKNIGHT')) {
      _cheatBuffer = '';
      unlockedMegaknight = true;
      localStorage.setItem('smc_megaknight', '1');
      ['p1Class','p2Class'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel && !sel.querySelector('option[value="megaknight"]')) {
          const opt = document.createElement('option'); opt.value = 'megaknight'; opt.textContent = 'Class: Megaknight ★'; sel.appendChild(opt);
        }
      });
      const notif2 = document.createElement('div');
      notif2.textContent = '★ Class: MEGAKNIGHT UNLOCKED ★';
      notif2.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(80,0,160,0.95);color:#fff;padding:14px 32px;border-radius:12px;font-size:1.2rem;font-weight:900;letter-spacing:2px;z-index:9999;pointer-events:none;text-align:center;box-shadow:0 0 40px #8844ff;';
      document.body.appendChild(notif2);
      setTimeout(() => notif2.remove(), 3000);
    }
  }
  const _nk = _normKey(e.key);
  if (SCROLL_BLOCK.has(_nk)) e.preventDefault();
  if (keysDown.has(_nk)) return; // already tracked — let held-frame counter run
  keysDown.add(_nk);

  if (!gameRunning || paused) return;

  players.forEach((p, i) => {
    if (p.isAI || p.health <= 0) return;
    const other         = players[i === 0 ? 1 : 0];
    const incapacitated = p.ragdollTimer > 0 || p.stunTimer > 0;
    if (!incapacitated && _nk === p.controls.attack)  { e.preventDefault(); p.attack(other); }
    if (!incapacitated && _nk === p.controls.ability) { e.preventDefault(); p.ability(other); }
    if (!incapacitated && p.controls.super && _nk === p.controls.super) {
      e.preventDefault();
      checkSecretLetterCollect(p);
      p.useSuper(other);
    }
  });
});

document.addEventListener('keyup', e => {
  const _nk = _normKey(e.key);
  keysDown.delete(_nk);
  delete keyHeldFrames[_nk];
});

// When the tab loses focus, clear all held keys so players can't exploit
// held-key persistence (floating, invincibility timer freeze, etc.)
function _clearAllKeys() {
  keysDown.clear();
  for (const k in keyHeldFrames) delete keyHeldFrames[k];
}
window.addEventListener('blur', _clearAllKeys);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) _clearAllKeys();
});

const SHIELD_MAX    = 140;  // max frames shield stays up (~2.3 s)
const SHIELD_CD     = 450; // 7.5-second cooldown at 60 fps

function processInput() {
  if (!gameRunning || paused) return;
  if (gameLoading) return; // freeze input while loading screen is visible
  if (activeCinematic) return; // freeze player controls during boss cinematics

  // Update key-held counters
  for (const k of keysDown) keyHeldFrames[k] = (keyHeldFrames[k] || 0) + 1;

  players.forEach(p => {
    if (p.isAI || p.health <= 0) return;
    if (p.ragdollTimer > 0 || p.stunTimer > 0) { p.shielding = false; return; }

    const hasCurseSlow = p.curses && p.curses.some(c => c.type === 'curse_slow');
    const _chaosSpeed = gameMode === 'minigames' && currentChaosModifiers.has('speedy') ? 1.4 : 1.0;
    const _underwaterSlow = currentArena && currentArena.isSlowMovement ? 0.72 : 1.0;
    const _earthSlow      = currentArena && currentArena.earthPhysics   ? 0.70 : 1.0;
    // Anti-kite decay (0.70-1.0), shooting penalty (0.85 while firing ranged / 0.78 post-burst)
    const _kiteMult    = (p._kiteSpeedMult != null) ? p._kiteSpeedMult : 1.0;
    const _isRanged    = p.weapon && p.weapon.type === 'ranged';
    const _tfAntiBoss  = typeof getTrueFormAntiRangedBoss === 'function' ? getTrueFormAntiRangedBoss() : null;
    const _rangeLockMult = _tfAntiBoss && !p.isBoss
      ? (Math.abs(p.cx() - _tfAntiBoss.cx()) > (_tfAntiBoss._antiRangedFieldR || 220)
          ? (_isRanged ? 0.58 : 0.72)
          : 1.0)
      : 1.0;
    const _shootingMult = _isRanged && p.attackTimer > 0   ? 0.78
                        : _isRanged && p._rangedMovePenalty > 0 ? 0.70 : 1.0;
    const _commitMult  = _isRanged && p._rangedCommitTimer > 0 ? 0.64 : 1.0;
    const spd  = 5.2 * (p.classSpeedMult || 1.0) * (p._speedBuff > 0 ? 1.35 : 1.0) * (hasCurseSlow ? 0.6 : 1.0) * _chaosSpeed * _underwaterSlow * _earthSlow * _kiteMult * _shootingMult * _commitMult * _rangeLockMult;
    const wHeld = keyHeldFrames[p.controls.jump]  || 0;


    // --- Regular movement ---
    // True Form: inverted controls for human players only
    const _ctrlInv  = (!p.isAI) && ((gameMode === 'trueform' && tfControlsInverted) || (currentArenaKey === 'mirror' && mirrorFlipped));
    const _leftKey  = _ctrlInv ? p.controls.right : p.controls.left;
    const _rightKey = _ctrlInv ? p.controls.left  : p.controls.right;
    const movingLeft  = keysDown.has(_leftKey);
    const movingRight = keysDown.has(_rightKey);
    if (movingLeft) {
      p.vx = -spd;
      p.facing = -1; // face direction of last key pressed
    }
    if (movingRight) {
      p.vx =  spd;
      p.facing = 1;  // face direction of last key pressed
    }
    // Decay acceleration ramp when no direction key held

    // --- Jump (ground jump + double jump) ---
    if (wHeld === 1) {
      // Megaknight gets higher jump power
      const jumpPower = p.charClass === 'megaknight' ? -22 : -17;
      const dblPower  = p.charClass === 'megaknight' ? -16 : -13;
      if (p.onGround || (p.coyoteFrames > 0 && !p.canDoubleJump)) {
        // Ground jump (or coyote jump — briefly after walking off a platform)
        p.vy = jumpPower;
        p.canDoubleJump = true; // enable one double-jump after leaving ground
        p.coyoteFrames  = 0;   // consume coyote window
        if (p._rd) PlayerRagdoll.applyJump(p);
        spawnParticles(p.cx(), p.y + p.h, '#ffffff', 5);
        if (p.charClass === 'megaknight') spawnParticles(p.cx(), p.y + p.h, '#8844ff', 5);
        SoundManager.jump();
      } else if (p.canDoubleJump && !p._storyNoDoubleJump) {
        // Double jump in air
        p.vy = dblPower;
        p.canDoubleJump = false;
        spawnParticles(p.cx(), p.cy(), p.color,  8);
        spawnParticles(p.cx(), p.cy(), '#ffffff', 5);
        SoundManager.jump();
      }
    }
    // --- S / ArrowDown = boost shield (30-second cooldown) ---
    const sHeld = keysDown.has(p.controls.shield);
    if (sHeld && p.shieldCooldown === 0 && !(p.weapon && p.weapon.type === 'ranged' && p._rangedCommitTimer > 0)) {
      p.shielding       = true;
      p.shieldHoldTimer = (p.shieldHoldTimer || 0) + 1;
      if (p.shieldHoldTimer >= SHIELD_MAX) {
        // Max duration exhausted → forced break and start cooldown
        p.shielding       = false;
        p.shieldCooldown  = SHIELD_CD;
        p.shieldHoldTimer = 0;
      }
    } else {
      if (p.shielding && !sHeld) {
        // Player released S — start cooldown if they used it for more than 3 frames
        if ((p.shieldHoldTimer || 0) > 3) p.shieldCooldown = SHIELD_CD;
        p.shielding       = false;
        p.shieldHoldTimer = 0;
      }
      if (!sHeld) p.shielding = false;
    }
  });
}

// ============================================================
// CHEAT: UNLOCK ALL
// ============================================================
function _cheatUnlockAll() {
  // Boss
  bossBeaten = true;
  localStorage.setItem('smc_bossBeaten', '1');
  const bossCard = document.getElementById('modeBoss');
  if (bossCard) bossCard.style.display = '';

  // True Form
  unlockedTrueBoss = true;
  localStorage.setItem('smc_trueform', '1');
  localStorage.setItem('smc_letters', JSON.stringify([0,1,2,3,4,5,6,7]));
  collectedLetterIds = new Set([0,1,2,3,4,5,6,7]);
  syncCodeInput && syncCodeInput();
  const tfCard = document.getElementById('modeTrueForm');
  if (tfCard) tfCard.style.display = '';

  // Megaknight
  unlockedMegaknight = true;
  localStorage.setItem('smc_megaknight', '1');
  ['p1Class','p2Class'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel && !sel.querySelector('option[value="megaknight"]')) {
      const opt = document.createElement('option'); opt.value = 'megaknight'; opt.textContent = 'Class: Megaknight ★'; sel.appendChild(opt);
    }
  });

  // All achievements
  if (typeof ACHIEVEMENTS !== 'undefined') {
    ACHIEVEMENTS.forEach(a => {
      if (typeof unlockAchievement === 'function') unlockAchievement(a.id);
    });
  }

  // Story: mark all chapters beaten + max tokens
  if (typeof _story2 !== 'undefined' && typeof STORY_CHAPTERS2 !== 'undefined') {
    STORY_CHAPTERS2.forEach(ch => {
      if (!_story2.defeated.includes(ch.id)) _story2.defeated.push(ch.id);
    });
    _story2.chapter = STORY_CHAPTERS2.length;
    _story2.tokens  = (_story2.tokens || 0) + 9999;
    _story2.storyComplete = true;
    if (typeof _saveStory2 === 'function') _saveStory2();
    if (typeof _updateStoryCloseBtn === 'function') _updateStoryCloseBtn();
    // Reveal story online card if present
    const soCard = document.getElementById('modeStoryOnline');
    if (soCard) soCard.style.display = '';
  }

  // Notify
  const notif = document.createElement('div');
  notif.textContent = '★ EVERYTHING UNLOCKED ★';
  notif.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,rgba(160,0,255,0.95),rgba(255,150,0,0.95));color:#fff;padding:16px 40px;border-radius:12px;font-size:1.25rem;font-weight:900;letter-spacing:3px;z-index:9999;pointer-events:none;text-align:center;box-shadow:0 0 50px #ff8800,0 0 20px #cc00ff;';
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3500);
}

// ============================================================
// EXPERIMENTAL CODE SYSTEM
// ============================================================
function applyCode(val) {
  const code  = (val || '').trim().toUpperCase();
  const msgEl = document.getElementById('codeMessage');
  const ok  = (t) => { if (msgEl) { msgEl.textContent = '✓ ' + t; msgEl.style.color = '#44ff88'; msgEl.style.fontSize = ''; } };
  const err = (t) => { if (msgEl) { msgEl.textContent = '✗ ' + t; msgEl.style.color = '#ff4444'; msgEl.style.fontSize = ''; } };

  if (code === 'TRUEFORM') {
    unlockedTrueBoss = true;
    localStorage.setItem('smc_trueform','1');
    const card = document.getElementById('modeTrueForm');
    if (card) card.style.display = '';
    ok('True Creator unlocked! Start a boss fight.');
  } else if (code === 'CLASSMEGAKNIGHT') {
    unlockedMegaknight = true;
    localStorage.setItem('smc_megaknight','1');
    ['p1Class','p2Class'].forEach(id => {
      const sel = document.getElementById(id);
      if (sel && !sel.querySelector('option[value="megaknight"]')) {
        const opt = document.createElement('option'); opt.value = 'megaknight'; opt.textContent = 'Class: Megaknight ★'; sel.appendChild(opt);
      }
    });
    ok('Megaknight class unlocked! Select it in the class dropdown.');
  } else if (code.startsWith('MAP:')) {
    const mapKey = code.slice(4).toLowerCase();
    if (!ARENAS[mapKey]) { err('Unknown arena. Try: grass lava space city forest ice ruins'); return; }
    if (gameRunning) {
      switchArena(mapKey);
      ok('Switched to ' + mapKey + ' arena!');
    } else {
      selectedArena = mapKey;
      document.querySelectorAll('.arena-card').forEach(c => c.classList.toggle('active', c.dataset.arena === mapKey));
      ok('Arena set to ' + mapKey + '!');
    }
  } else if (code.startsWith('WEAPON:')) {
    const wKey = code.slice(7).toLowerCase();
    if (!WEAPONS[wKey]) { err('Unknown weapon. Try: sword hammer gun axe spear bow shield scythe'); return; }
    if (gameRunning) {
      const p = players.find(pl => !pl.isAI && !pl.isBoss);
      if (p) { p.weaponKey = wKey; p.weapon = WEAPONS[wKey]; p.cooldown = 0; p.abilityCooldown = 0; }
      ok('Weapon changed to ' + wKey + '!');
    } else { err('Enter WEAPON: codes while in-game.'); }
  } else if (code.startsWith('CLASS:')) {
    const cKey = code.slice(6).toLowerCase();
    if (!CLASSES[cKey] && cKey !== 'megaknight') { err('Unknown class. Try: none thor kratos ninja gunner archer paladin berserker megaknight'); return; }
    if (gameRunning) {
      const p = players.find(pl => !pl.isAI && !pl.isBoss);
      if (p) applyClass(p, cKey);
      ok('Class changed to ' + cKey + '!');
    } else { err('Enter CLASS: codes while in-game.'); }
  } else if (code === 'GODMODE') {
    if (gameRunning) {
      const p = players.find(pl => !pl.isAI && !pl.isBoss);
      if (p) { p.invincible = 99999; p.health = p.maxHealth; p.godmode = true; }
      ok('GOD MODE — invincible + flight (jump=up, shield=down)!');
    } else { err('Enter GODMODE while in-game.'); }
  } else if (code === 'FULLHEAL') {
    if (gameRunning) {
      players.filter(pl => !pl.isBoss).forEach(p => { p.health = p.maxHealth; spawnParticles(p.cx(), p.cy(), '#44ff88', 18); });
      ok('All players fully healed!');
    } else { err('Enter FULLHEAL while in-game.'); }
  } else if (code === 'SUPERJUMP') {
    if (gameRunning) {
      const p = players.find(pl => !pl.isAI && !pl.isBoss);
      if (p) { p.vy = -36; p.canDoubleJump = true; }
      ok('SUPER JUMP!');
    } else { err('Enter SUPERJUMP while in-game.'); }
  } else if (code === 'KILLBOSS') {
    if (gameRunning) {
      const boss = players.find(p => p.isBoss);
      if (boss) boss.health = 1;
      ok('Boss is nearly dead!');
    } else { err('Enter KILLBOSS while in-game.'); }
  } else if (code === 'UNLOCKALL') {
    _cheatUnlockAll();
    ok('Everything unlocked!');
  } else if (code === 'HELP' || code === 'CODES') {
    if (msgEl) {
      msgEl.textContent = 'TRUEFORM · CLASSMEGAKNIGHT · UNLOCKALL · GODMODE · FULLHEAL · KILLBOSS · MAP:<arena> · WEAPON:<key> · CLASS:<key>';
      msgEl.style.color = '#aabbff'; msgEl.style.fontSize = '0.7rem';
    }
  } else {
    err('Unknown code. Type HELP for a list.');
  }
}
