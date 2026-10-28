'use strict';
// Frame tick: applyWorldModifiers() and gameLoop(), called from requestAnimationFrame.
// gameLoop is one monolithic function. Don't split it without a full refactor.
let _lastFrameTime = 0;
// Ticks must land 60 times a second on any display. A plain 'N ms since last tick' cap gives 48/s on 144Hz
// and 37.5/s on 75Hz, so ticks run on a 60Hz grid. The tolerance absorbs vsync jitter.
const _FRAME_STEP_MS = 1000 / 60;
const _FRAME_MIN_MS  = _FRAME_STEP_MS - 1.5;

// Per-frame world modifiers for story mode. Re-applied every frame, so nothing is stored permanently.
function applyWorldModifiers() {
  const _fighters = [...(players || []), ...(minions || []), ...(trainingDummies || [])];
  for (const f of _fighters) {
    if (!f) continue;
    f._aggroBoost = 1;
    f._damageTakenMult = 1;
  }

  // Quicksand: desert arena, all game modes.
  if (currentArena && currentArena.hasQuicksand) {
    const _qsX = currentArena.quicksandX || 280;
    const _qsW = currentArena.quicksandW || 340;
    for (const f of _fighters) {
      if (!f || f.health <= 0) continue;
      const _inQs = f.onGround && f.cx() > _qsX && f.cx() < _qsX + _qsW;
      if (_inQs) {
        f.vx *= 0.72;     // strong friction, sluggish movement
        f._inQuicksand = true;
      } else {
        f._inQuicksand = false;
      }
    }
  }

  if (!worldId || gameMode !== 'story') return;

  if (worldId !== 'fracture' && tfGravityInverted && typeof forceResetGravity === 'function') {
    forceResetGravity();
  }

  switch (worldId) {

    case 'fracture':
      // ~1% chance per frame to flip gravity. Uses tfGravityInverted so fighter physics handles it.
      if (Math.random() < 0.01) {
        tfGravityInverted = !tfGravityInverted;
      }
      break;

    case 'war':
      // Re-applied each frame, so leaving the world clears it.
      players.forEach(p => {
        if (p && p.isAI) p._aggroBoost = 1.25;
      });
      break;

    case 'mirror':
      // Mirror AI behaviour is handled in the AI update path.
      break;

    case 'godfall':
      // Re-applied each frame, so it resets on its own.
      players.forEach(p => {
        if (p) p._damageTakenMult = 1.3;
      });
      break;

    case 'code':
      // Visual glitch effects are handled in the drawing layer.
      break;
  }
}

let _sceneHoldOrphan = 0; // frames parked on a hold with no overlay on screen
function gameLoop(timestamp) {
  if (!gameRunning) return;
  // Frame cap: skip if called too soon after the last tick.
  if (timestamp - _lastFrameTime < _FRAME_MIN_MS) {
    requestAnimationFrame(gameLoop);
    return;
  }
  // Stay on the grid when a refresh lands late. Resync after a real stall; never let the grid lead 60Hz.
  const _nextTick = _lastFrameTime + _FRAME_STEP_MS;
  _lastFrameTime = (timestamp - _nextTick > _FRAME_STEP_MS) ? timestamp : Math.min(_nextTick, timestamp);
  if (paused || gameLoading) { requestAnimationFrame(gameLoop); return; }
  if (typeof autoPerfSample === 'function') autoPerfSample(timestamp);
  // The between-level narrative scene owns the screen, so the match parks (rAF keeps running).
  if (window._storySceneHold) {
    // Watchdog: a hold with no overlay would park the match forever, so release it after ~2s.
    const _ovl = document.querySelector('canvas[style*="9100"]')
              || document.getElementById('_storyBranchOverlay')
              || (function(){ const d=document.getElementById('storyDialoguePanel'); return d && d.style.display !== 'none' ? d : null; })();
    if (_ovl) { _sceneHoldOrphan = 0; }
    else if (++_sceneHoldOrphan > 120) {
      _sceneHoldOrphan = 0;
      console.warn('[storyHold] released an orphaned scene hold — no overlay on screen');
      if (typeof storyHoldGameplay === 'function') storyHoldGameplay(false);
      else window._storySceneHold = false;
    }
    requestAnimationFrame(gameLoop);
    return;
  }
  _sceneHoldOrphan = 0;
  // Axiom Dimension Punch: the cutscene owns the frame.
  if (typeof AAMultiverse !== 'undefined' && AAMultiverse.flightFrame()) {
    requestAnimationFrame(gameLoop);
    return;
  }
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
    // to draw-only path, achieved by setting hitStopFrames for 1 frame
    hitStopFrames = 1;
    requestAnimationFrame(gameLoop);
    return;
  }
  if (hitSlowTimer > 0) {
    hitSlowTimer--;
        // Finishers own slowMotion
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
  // Skip the cinematic tick during absorption: it would overlap activeCinematic.
  if (!tfAbsorptionScene) {
    updateCinematic();
    if (typeof updateCinematicSystem === 'function') updateCinematicSystem();
    if (typeof updateCinematicEnhancements === 'function') updateCinematicEnhancements();
  }
  // Tick deterministic cutscene system
  if (typeof updateCutscene === 'function') updateCutscene();
  if (typeof updateParadoxCompanion === 'function') updateParadoxCompanion();
  frameCount++;
  aiTick++;
  tickCombatTimers();
  if (typeof ReplaySystem !== 'undefined') ReplaySystem.recordFrame();
  // Advisor sampling is cheap per frame. Its network call is async and never awaited, so Ollama can't stall the loop.
  if (typeof SovereignAdvisor !== 'undefined') SovereignAdvisor.tick();
  // Approximate real delta-time at 60fps for Director
  if (typeof updateDirector === 'function') updateDirector(1/60);

  // Phase: updateInput
  // Public Server: send own state, drive every other player's puppet, mirror bots
  if (typeof PubHub !== 'undefined' && PubHub.active) PubHub.tick();
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
        // Sync the attack animation so the swing shows on the opponent's screen.
        remoteP.attackTimer    = rs.attackTimer    != null ? rs.attackTimer    : remoteP.attackTimer;
        remoteP.attackDuration = rs.attackDuration != null ? rs.attackDuration : (remoteP.attackDuration || 12);
        remoteP.hurtTimer      = rs.hurtTimer      != null ? rs.hurtTimer      : 0;
        remoteP.stunTimer      = rs.stunTimer2     != null ? rs.stunTimer2     : 0;
        // Synced from the owner, or remote fighters go transparent and unhittable.
        remoteP.invincible = rs.invincible != null ? rs.invincible : 0;
        // Always apply, or a stale local weapon shows.
        if (rs.weaponKey && WEAPONS[rs.weaponKey]) {
          remoteP.weaponKey = rs.weaponKey;
          remoteP.weapon    = WEAPONS[rs.weaponKey];
        }
        if (rs.color) remoteP.color = rs.color;
        if (rs.name)  remoteP.name  = rs.name;
        if (rs.hat)   remoteP.hat   = rs.hat;
        if (rs.cape)  remoteP.cape  = rs.cape;
        // The owner's class, not whatever this client's own P2 menu picked.
        if (rs.charClass && rs.charClass !== remoteP._netClass && typeof applyClass === 'function' &&
            typeof CLASSES !== 'undefined' && CLASSES[rs.charClass]) {
          remoteP._netClass = rs.charClass;
          const _keepW = remoteP.weaponKey;
          applyClass(remoteP, rs.charClass);
          if (_keepW && WEAPONS[_keepW]) { remoteP.weaponKey = _keepW; remoteP.weapon = WEAPONS[_keepW]; }
          if (rs.health != null) remoteP.health = rs.health;
          if (rs.maxHealth != null) remoteP.maxHealth = rs.maxHealth;
        }
        if (rs.ab != null) remoteP.abilityCooldown = rs.ab;
        if (rs.su != null) remoteP.superReady = !!rs.su;
        if (typeof MoveSceneNet !== 'undefined') MoveSceneNet.applyRemote(remoteP, rs.ms);
      }
    }
  }

  applyWorldModifiers();
  if (typeof Brain !== 'undefined') Brain.tickLive();
  if (typeof OwnerTools !== 'undefined') OwnerTools.tick();
  processInput(); // updateInput

  // Phase: updateCircuitPlate. Runs before fighters so collision reads this frame's plate. No-op off The Circuit.
  if (typeof CircuitPlate !== 'undefined') CircuitPlate.update();

  // Phase: Creator Studio moving platforms. Riders on the slab move with it.
  // Story levels (smb-story-levels.js) add a vertical variant (oy/oscY) for lifts.
  if (currentArena && (currentArena.designerBase || currentArena.storyLevel != null || currentArena.storyRegion) && !gameFrozen) {
    for (const pl of currentArena.platforms) {
      if (pl.oscX && pl.ox !== undefined) {
        const nx = pl.ox + Math.sin(frameCount * (pl.oscSpeed || 0.018) + (pl.oscPhase || 0)) * pl.oscX;
        const dx = nx - pl.x;
        if (dx) {
          for (const f of [...players, ...minions, ...trainingDummies]) {
            if (!f || f.health <= 0 || !f.onGround) continue;
            const feet = f.y + f.h;
            if (Math.abs(feet - pl.y) <= 4 && f.x + f.w > pl.x && f.x < pl.x + pl.w) f.x += dx;
          }
          pl.x = nx;
        }
      }
      if (pl.oscY && pl.oy !== undefined) {
        const ny = pl.oy + Math.sin(frameCount * (pl.oscSpeed || 0.018) + (pl.oscPhase || 0)) * pl.oscY;
        const dy = ny - pl.y;
        if (dy) {
          for (const f of [...players, ...minions, ...trainingDummies]) {
            if (!f || f.health <= 0 || !f.onGround) continue;
            const feet = f.y + f.h;
            if (Math.abs(feet - pl.y) <= 6 && f.x + f.w > pl.x && f.x < pl.x + pl.w) f.y += dy;
          }
          pl.y = ny;
        }
      }
    }
  }

  // Phase: updateBossArena (platforms, floor hazard)
  if (currentArena && currentArena.isBossArena) {
    // Random-lerp targets for unpredictable movement. Boss arena runs at 2x speed.
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

    // Floor hazard state machine. Boss/TrueForm only, off during the TF opening.
    // The Creator's floor hazard is his construct's; the Fallen God's walls replace it.
    const _bossFloorActive = (gameMode === 'boss' && !_isFallenGodFight()) || gameMode === 'trueform';
    if (_bossFloorActive && !gameFrozen && !(typeof tfOpeningFightActive !== 'undefined' && tfOpeningFightActive)) bossFloorTimer--;
    if (_bossFloorActive && bossFloorTimer <= 0) {
      if (bossFloorState === 'normal') {
        bossFloorState = 'warning';
        bossFloorType  = Math.random() < 0.5 ? 'lava' : 'void';
        bossFloorTimer = BOSS_FLOOR_WARNING_FRAMES; // 3-second warning
        showBossDialogue(bossFloorType === 'lava'
          ? randChoice(['The floor has a new purpose.', 'Heat is a matter of perspective.', 'I\'d move if I were you. I\'m not.'])
          : randChoice(['The ground is a luxury.', 'Space beneath your feet — gone.', 'Let\'s see how well you float.']), 220);
        // Screen-level announcement, so dialogue can't hide the warning.
        if (typeof queueAnnouncement === 'function')
          queueAnnouncement(bossFloorType === 'lava' ? '⚠ FLOOR IS LAVA!' : '⚠ FLOOR REMOVED!', bossFloorType === 'lava' ? '#ff6600' : '#8855ff');
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

    // TrueForm floor removal counts down every frame, not on AI ticks.
    if (typeof tfFloorRemoved !== 'undefined' && tfFloorRemoved && !gameFrozen) {
      tfFloorTimer--;
      if (tfFloorTimer <= 0) {
        tfFloorRemoved = false;
        const _floorPl = currentArena.platforms.find(p => p.isFloor);
        if (_floorPl) _floorPl.isFloorDisabled = false;
        if (typeof showBossDialogue === 'function')
          showBossDialogue('I gave it back. Enjoy it while it lasts.', 150);
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
        for (const p of players) {
          if (p.isBoss || p.health <= 0 || p.invincible > 0) continue;
          if (Math.abs(p.cx() - er.x) < 100 && p.y + p.h > (currentArena.lavaY || 462) - 250) {
            if (er.timer % 10 === 0) dealDamage(players.find(q => q.isBoss) || null, p, Math.ceil(p.maxHealth * 0.044), 8);
          }
        }
      }
    }
  }

  // Phase: updateCamera (bounding box, dead zone, lerp)
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

  // Cinematic camera: smooth follow with a spring, plus optional hard cuts.
  // The shot keeps its own state: easing from the gameplay camera's fresh values each frame only
  // ever moved 7-9% of the way, so cinematic zooms and cuts never showed.
  // Camera sequences (createCameraSequence) drive camXCur/camZoomCur themselves.
  if (cinematicCamOverride && !(typeof _camSeq !== 'undefined' && _camSeq)) {
    if (_cinCamZoom === null) { _cinCamZoom = camZoom; _cinCamX = camCX; _cinCamY = camCY; }
    camZoom = _cinCamZoom; camCX = _cinCamX; camCY = _cinCamY;
    if (cinematicCamSnapFrames > 0) {
      camZoom = cinematicZoomTarget;
      camCX   = cinematicFocusX;
      camCY   = cinematicFocusY;
      cinematicCamSnapFrames--;
      _camPrevFocusX = cinematicFocusX;
      _camPrevFocusY = cinematicFocusY;
      _camOvershootX = 0;
      _camOvershootY = 0;
    } else {
      camZoom += (cinematicZoomTarget - camZoom) * 0.09;
      camCX   += (cinematicFocusX    - camCX)   * 0.07;
      camCY   += (cinematicFocusY    - camCY)   * 0.07;

      _camOvershootX += (cinematicFocusX - _camPrevFocusX) * 0.04;
      _camOvershootY += (cinematicFocusY - _camPrevFocusY) * 0.04;
      _camPrevFocusX = cinematicFocusX;
      _camPrevFocusY = cinematicFocusY;
      _camOvershootX *= 0.82;
      _camOvershootY *= 0.82;
    }
    _cinCamZoom = camZoom; _cinCamX = camCX; _cinCamY = camCY;
    camCX += _camOvershootX;
    camCY += _camOvershootY;
    // Park the gameplay camera on the shot so releasing the override eases out instead of popping.
    camZoomCur = _cinCamZoom; camXCur = _cinCamX; camYCur = _cinCamY;
  } else {
    _cinCamZoom = null;
    cinematicCamSnapFrames = 0;
    _camPrevFocusX = camCX;
    _camPrevFocusY = camCY;
    _camOvershootX = 0;
    _camOvershootY = 0;
  }

  // Impact cinematic: override tracking target and apply zoom boost
  if (typeof _cinCamTarget !== 'undefined' && _cinCamTarget) {
    camCX += (_cinCamTarget.cx() - camCX) * _cinCamLerp;
    camCY += (_cinCamTarget.cy() - camCY) * _cinCamLerp;
  }
  if (typeof _cinCamZoomBoost !== 'undefined') camZoom *= (1 + _cinCamZoomBoost);

  const finalScX = baseScaleX * camZoom;
  const finalScY = baseScaleY * camZoom;

  // Fill with the sky colour so zoomed-out margins aren't black.
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
  // Skip shake below a threshold to avoid micro-jitter.
  const _shakeAmt = screenShake > 1.0 ? screenShake : 0;
  // First N frames bias the shake one direction, then fall back to random. The timer ticks in updateCinematicEnhancements().
  let _sdx = 0, _sdy = 0;
  if (typeof cinShakeDir !== 'undefined' && cinShakeDir && cinShakeDir.timer > 0) {
    _sdx = cinShakeDir.x * _shakeAmt * 0.72;
    _sdy = cinShakeDir.y * _shakeAmt * 0.72;
  }
  const sx = _sdx + (Math.random() - 0.5) * _shakeAmt * 0.35 + (canvas.width  / 2 - camCX * finalScX) + _cinOX;
  const sy = _sdy + (Math.random() - 0.5) * _shakeAmt * 0.35 + (canvas.height / 2 - camCY * finalScY) + _cinOY;
  if (typeof _applyGameTransform === 'function') {
    _applyGameTransform(finalScX, finalScY, sx, sy);
  } else {
    ctx.setTransform(finalScX, 0, 0, finalScY, sx, sy);
  }

  // Phase: render (world, entities, particles, HUD)
  drawBackground();
  // Battle Royale skyline, volcano cone and office interior: behind the platforms.
  if (gameMode === 'battleroyale' && typeof drawBRStructuresBack === 'function') drawBRStructuresBack();
  if (gameMode === 'endless' && typeof drawEndlessBack === 'function') drawEndlessBack();
  // Conviction tint: screen space, before world entities.
  if (typeof DomainManager !== 'undefined') DomainManager.draw();
  if (typeof drawCinBgContrast   === 'function') drawCinBgContrast();
  if (typeof drawCinImpactFrame  === 'function') drawCinImpactFrame();
  drawPlatforms();
  if (typeof drawStoryLevelGround === 'function') drawStoryLevelGround();
  // The Sewer flow draws after the platforms, so the barge sits in the sewage. Inert on other arenas.
  if (typeof drawSewerFlow === 'function') drawSewerFlow();
  // Impact scars sit on the slabs they were cut into.
  if (typeof drawSurfaceScars === 'function') drawSurfaceScars();
  if (typeof drawWorldReactBack === 'function') drawWorldReactBack();
  // Circuit void lips and slide telegraph draw above the plate, so the warning isn't hidden under it.
  if (typeof CircuitPlate !== 'undefined') CircuitPlate.drawOverlay();
  // Domain hazards (world-space, above platforms, below entities)
  if (typeof DomainManager !== 'undefined') DomainManager.drawHazards();
  if (typeof drawSuddenDeathFloor === 'function') drawSuddenDeathFloor();
  if (typeof drawDepthFloorGrid === 'function') drawDepthFloorGrid();
  if (typeof drawCinematicImpactWorldEffects === 'function') drawCinematicImpactWorldEffects();
  if (gameMode === 'minigames' && minigameType === 'sports' && typeof drawSports === 'function') drawSports();
  if (gameMode === 'minigames' && minigameType === 'defense' && typeof drawMinigameDefenseNexus === 'function') drawMinigameDefenseNexus();
  if (gameMode === 'minigames' && minigameType === 'koth' && typeof drawKothZone === 'function') drawKothZone();
  if (gameMode === 'battleroyale' && typeof drawBattleRoyaleWorld === 'function') drawBattleRoyaleWorld();
  if (gameMode === 'endless' && typeof drawEndlessWorld === 'function') drawEndlessWorld();
  if ((gameMode === 'escort' || (typeof escortActive !== 'undefined' && escortActive)) && typeof drawEscortNPC === 'function') drawEscortNPC();
  if (gameMode === 'shipflight' && typeof drawShipFlight === 'function') drawShipFlight();
  drawBackstagePortals();
  drawMapPerks();

  // Boss beams: update and draw. Also runs in training with a boss or an admin kit.
  const _anyAdminKit = typeof players !== 'undefined' && players.some(p => p._adminKit);
  // The attack viewer fires boss effects into ordinary matches.
  const _atkBossFx = !!window.FORCE_ATTACK_MODE
    && (bossBeams.length || bossSpikes.length || bossWarnings.length || bossMetSafeZones.length);
  const hasBossActive = (currentArena && currentArena.isBossArena) || (trainingMode && trainingDummies.some(d => d.isBoss)) || _anyAdminKit || _atkBossFx
    || (damnationActive && players.some(p => p.isBoss));
  // A boss outside a boss arena (the Fallen God in space) still needs its death scene and stagger.
  if (!hasBossActive && bossDeathScene) updateBossDeathScene();
  if (!hasBossActive && _isFallenGodFight()) { updateBossPendingAttacks(); drawBossWarnings(); }
  if (hasBossActive) {
    for (const b of bossBeams) {
      if (b.phase === 'warning') {
        if (--b.warningTimer <= 0) { b.phase = 'active'; b.activeTimer = 110; }
      } else if (b.phase === 'active') {
        if (--b.activeTimer <= 0) { b.done = true; }
        else {
          // Damage each frame while caught in the beam.
          const boss = players.find(p => p.isBoss) || trainingDummies.find(d => d.isBoss);
          const beamTargets = trainingMode ? players : players.filter(p => !p.isBoss);
          for (const p of beamTargets) {
            if (p.health <= 0 || p.invincible > 0) continue;
            // Skip damage if player is inside a safe zone
            const inSafe = bossMetSafeZones.some(sz =>
              Math.hypot(p.cx() - sz.x, (p.y + p.h * 0.5) - sz.y) < sz.r);
            if (!inSafe && Math.abs(p.cx() - b.x) < 24) {
              // Cap per beam at 40% of max HP. Keyed on the beam so overlapping beams don't share a cap.
              if (!b._damageAccum) b._damageAccum = {};
              const pid = p.playerNum != null ? p.playerNum : players.indexOf(p);
              if (b._damageAccum[pid] == null) b._damageAccum[pid] = 0;
              const MAX_BEAM_DAMAGE = Math.floor((p.maxHealth || 100) * 0.4);
              if (b._damageAccum[pid] < MAX_BEAM_DAMAGE) {
                const allowed = Math.min(6, MAX_BEAM_DAMAGE - b._damageAccum[pid]);
                b._damageAccum[pid] += allowed;
                dealDamage(boss || null, p, allowed, 5, 1.0, false, 12);
              }
            }
          }
        }
      }
    }
    bossBeams = bossBeams.filter(b => !b.done);
    drawBossBeams();

    // Boss spikes: update and draw
    const bossRef = players.find(p => p.isBoss) || trainingDummies.find(d => d.isBoss);
    for (const sp of bossSpikes) {
      if (sp.done) continue;
      if (sp.delay > 0) { sp.delay--; continue; } // telegraph window, spike not yet out of the floor
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
          // Hit width matches the drawn spike. A narrow box almost never hit.
          if (Math.abs(p.cx() - sp.x) < 20 && p.y + p.h > spikeTopY) {
            dealDamage(bossRef || players.find(q => q.isBoss) || null, p, 14, 14, 1.0, false, 20);
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
    // Paradox silhouettes, drawn behind fighters.
    if (typeof updateBossParadoxForeshadow === 'function') updateBossParadoxForeshadow();
    if (typeof drawBossParadoxForeshadow   === 'function') drawBossParadoxForeshadow();
    if (bossDeathScene) updateBossDeathScene();
    if (tfEndingScene)  updateTFEnding();
    if (typeof godCinematicScene !== 'undefined' && godCinematicScene) updateGodCinematic();
    // Telegraph draw: pending attacks, stagger, warnings.
    updateBossPendingAttacks();
    drawBossWarnings();
  }

  // Phase: updatePhysics/updateCombat (projectiles, minions, players)
  resolveEntityClashes();
  projectiles.forEach(p => p.update());
  projectiles = projectiles.filter(p => p.active); // prevent leak
  projectiles.forEach(p => p.draw());

  // Minions freeze during the absorption cinematic.
  minions.forEach(m => {
    if (m.health > 0 && !tfAbsorptionScene) {
      // BR: bots far from the camera skip physics and AI (void death is still checked).
      if (gameMode === 'battleroyale' && m._brBot && m._brSleep) return;
      m.update();
    }
  });
  minions.forEach(m => { if (m.health > 0) m.draw(); });
  if (typeof AAMultiverse !== 'undefined') AAMultiverse.drawWorld();
  if (typeof storyRecordFoeKills === 'function') storyRecordFoeKills();
  minions = minions.filter(m => m.health > 0);
  // God death hook, triggers achievement when God is removed from minions
  if (typeof _checkGodDeath === 'function') _checkGodDeath();

  // Absolute Axiom: per-frame RGS update (loadout, jumps, portals, checkpoints)
  if (typeof _updateRGS === 'function' && players[0] && players[0]._rgsActive) {
    const _aaEnt = minions.find(m => m && m.isAbsoluteAxiom);
    if (_aaEnt) _updateRGS(_aaEnt, players[0]);
  }

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

  // Sports Arena: ball physics, scoring and the sports bots
  if (gameMode === 'minigames' && minigameType === 'sports' && typeof updateSports === 'function') updateSports();
  if (gameMode === 'minigames') updateMinigame();
  if (gameMode === 'battleroyale' && typeof updateBattleRoyale === 'function') updateBattleRoyale();
  if (gameMode === 'endless' && typeof updateEndless === 'function') updateEndless();
  // The Sewer: barges drift, carry riders, and burn anything in the flow. No-op elsewhere.
  if (typeof updateSewer === 'function') updateSewer();
  // Cataclysm (secret weapon): Convictions, meteors, Axiom. No-op unless someone wields it.
  if (typeof updateCataclysm === 'function') updateCataclysm();
  if (damnationActive && typeof updateDamnation === 'function') updateDamnation();
  // TrueForm updates. Also runs with a trueform admin kit or FORCE_ATTACK_MODE TF effects.
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
    (typeof tfRealityOverride !== 'undefined' && tfRealityOverride) ||
    (typeof tfGravityInverted !== 'undefined' && tfGravityInverted) ||
    tfAttackRetryQueue.length ||
    (typeof _atkPendingCtxs !== 'undefined' && _atkPendingCtxs.length)
  );
  if ((gameMode === 'trueform' || _anyTFKit || _forceTF
      || (damnationActive && players.some(p => p.isTrueForm))) &&
      !(typeof tfOpeningFightActive !== 'undefined' && tfOpeningFightActive)) {
    updateTFBlackHoles();
    updateTFGravityWells();
    updateTFMeteorCrash();
    updateTFClones();
    updateTFChainSlam();
    updateTFGraspSlam();
    updateTFDimensionPunch();
    updateTFShockwaves();
    updateTFPendingAttacks();
    updateTFGammaBeam();
    updateTFBurnTrail();
    updateTFNeutronStar();
    updateTFGalaxySweep();
    updateTFMultiverse();
    updateTFSupernova();
    // Gravity failsafe: inversion must always expire, by timer or hard cap.
    if (tfGravityInverted) {
      if (tfGravityTimer > 0) {
        // Timer-driven restore
        tfGravityTimer--;
        if (tfGravityTimer <= 0) {
          forceResetGravity();
          showBossDialogue('I restored gravity. You\'re welcome.', 150);
          spawnParticles(GAME_W / 2, GAME_H / 2, '#ffffff', 16);
        }
      } else {
        // Inverted with no timer (chaos event, or a cinematic without tfGravityTimer).
        if (!gravityState.active) {
          gravityState.active   = true;
          gravityState.type     = 'reverse';
          gravityState.timer    = 0;
          gravityState.maxTimer = 240; // 4-second hard cap
        }
        gravityState.timer++;
        if (gravityState.timer >= gravityState.maxTimer) {
          forceResetGravity();
          spawnParticles(GAME_W / 2, GAME_H / 2, '#ffffff', 12);
        }
      }
    } else if (gravityState.active) {
      // Not inverted: clear the failsafe tracker.
      gravityState.active = false;
      gravityState.timer  = 0;
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

  // Verlet death ragdolls: update, remove when expired.
  verletRagdolls.forEach(vr => vr.update());
  verletRagdolls = verletRagdolls.filter(vr => !vr.isDone());

  // Draw Verlet death ragdolls (behind living players)
  verletRagdolls.forEach(vr => vr.draw());
  // Dropped weapons draw behind living fighters.
  if (typeof DeathAnim !== 'undefined') DeathAnim.drawProps();

  // Clamp Infinity/NaN velocities before physics, or they teleport.
  for (const p of players) {
    if (!isFinite(p.vx)) p.vx = 0;
    if (!isFinite(p.vy)) p.vy = 0;
    if (!isFinite(p.x))  { p.x = GAME_W / 2; p.vx = 0; }
    if (!isFinite(p.y))  { p.y = 200;         p.vy = 0; }
  }
  // Conviction state. Runs before player.update() so the vx override applies.
  if (typeof DomainManager !== 'undefined' && !gameFrozen && !tfAbsorptionScene) {
    DomainManager.update();
  }
  // Players. Remote (network) players skip physics, as do hard freezes and absorption.
  if (!gameFrozen && !tfAbsorptionScene) {
    // BR: array order decides mirror fights (the later updater reacts to the same
    // frame's swing). AI decisions land on fixed frames, so flip a coin instead of alternating.
    const _updOrder = (gameMode === 'battleroyale' && Math.random() < 0.5) ? players.slice().reverse() : players;
    _updOrder.forEach(p => { if ((p.health > 0 || p.invincible > 0) && !p.isRemote) p.update(); });
    // Authored death beats run after physics so they can override the pose and read the real landing velocity.
    if (typeof DeathAnim !== 'undefined') DeathAnim.update();
    // Move scenes run after physics and overwrite what it did to their bodies.
    if (typeof MoveScene !== 'undefined') MoveScene.update();
  }
  // Habit engine (js/smb-sov-habits.js): each human's nearest hostile watches them every frame,
  // so habits are filed from story and BR fights too.
  if (typeof SovHabits !== 'undefined' && !gameFrozen) {
    for (let _hi = 0; _hi < players.length; _hi++) {
      const _h = players[_hi];
      if (!_h || _h.isAI !== false || !(_h.health > 0) || _h.isRemote) continue;
      let _opp = null, _bestD = Infinity;
      for (let _oi = 0; _oi < players.length; _oi++) {
        const _o = players[_oi];
        if (!_o || _o === _h || !(_o.health > 0)) continue;
        if (typeof SovereignMK2 !== 'undefined' && _o instanceof SovereignMK2) continue;
        if (typeof isHostileTarget === 'function' && !isHostileTarget(_h, _o)) continue;
        const _d = Math.abs(_o.cx() - _h.cx());
        if (_d < _bestD) { _bestD = _d; _opp = _o; }
      }
      if (_opp) SovHabits.observe(_opp, _h);
    }
    SovHabits.tick();
  }
  // Passive super charge for every non-boss player.
  if (!isCinematic && !paused) {
    players.forEach(p => {
      if (p.isBoss || p.superActive || p.health <= 0) return;
      const _prev = p.superReady;
      p.superMeter = Math.min(100, p.superMeter + 0.04);
      if (!_prev && p.superMeter >= 100) {
        p.superReady      = true;
        p.superFlashTimer = 90;
      }
    });
  }
  // Chaos system: per-frame update (events, drops, effects, multi-kill, announcer)
  if (typeof chaosMode !== 'undefined' && chaosMode && typeof updateChaosSystem === 'function') updateChaosSystem();
  // Finisher: override positions/state AFTER physics, BEFORE draw
  if (typeof updateFinisher === 'function') updateFinisher();
  // Divine Summon: tick Herald sweep state
  if (typeof updateDivineSummon === 'function') updateDivineSummon();

  // Phase: depth (transition, circular arena, still-Z tracking)
  if (typeof tfDepthPhaseActive !== 'undefined' && tfDepthPhaseActive) {
    // Freeze-transition timer. Z movement unlocks when it expires.
    if (tfDepthTransitionTimer > 0) {
      tfDepthTransitionTimer--;
      if (tfDepthTransitionTimer === 0) {
        tfDepthEnabled = true;
        if (typeof cinScreenFlash !== 'undefined')
          cinScreenFlash = { color: '#8844ff', alpha: 0.55, timer: 22, maxTimer: 22 };
        screenShake = Math.max(screenShake, 26);
        spawnParticles(TF_DEPTH_CX, TF_DEPTH_CY, '#8844ff', 22);
        spawnParticles(TF_DEPTH_CX, TF_DEPTH_CY, '#ffffff', 14);
        if (typeof showBossDialogue === 'function')
          showBossDialogue('Every dimension. Every layer. I am all of them.', 240);
      }
    }
    // Clamp living entities inside the circular arena.
    for (const ent of players) {
      if (!ent || (ent.health <= 0 && ent.invincible <= 0)) continue;
      const ecx = ent.cx(), ecy = ent.cy();
      const edx = ecx - TF_DEPTH_CX, edy = ecy - TF_DEPTH_CY;
      const ed  = Math.hypot(edx, edy);
      if (ed > TF_DEPTH_R) {
        const sc = TF_DEPTH_R / ed;
        ent.x  = TF_DEPTH_CX + edx * sc - ent.w * 0.5;
        ent.y  = TF_DEPTH_CY + edy * sc - ent.h * 0.5;
        ent.vx *= -0.45;
        ent.vy *= -0.45;
      }
    }
    // Track per-player same-Z idle frames for depthPunish
    if (typeof tfDepthPlayerStillZ !== 'undefined') {
      players.forEach((p, pi) => {
        if (p.isAI || p.isBoss || p.health <= 0) return;
        const rec = tfDepthPlayerStillZ[pi] || { z: p.z || 0, frames: 0 };
        if (Math.abs((p.z || 0) - rec.z) < 0.05) { rec.frames++; }
        else { rec.z = p.z || 0; rec.frames = 0; }
        tfDepthPlayerStillZ[pi] = rec;
      });
    }
  }

  if (typeof drawCinMotionTrails === 'function') drawCinMotionTrails();
  players.forEach((p, i) => {
    if (p.health <= 0 && p.invincible <= 0) return;
    // Cinematic visibility: skip players flagged as hidden for this scene
    if (activeCinematic && activeCinematic.hidePlayers && activeCinematic.hidePlayers.includes(i)) return;
      // Z-depth illusion: scale and offset per entity.
    if (typeof tfDepthPhaseActive !== 'undefined' && tfDepthPhaseActive) {
      const pz     = p.z || 0;
      const dScale = 1 + pz * 0.22;   // z=1 → 22% larger (foreground), z=-1 → 22% smaller (bg)
      const dOffY  = pz * 44;          // z=1 → 44px lower, z=-1 → 44px higher
      const pivX   = p.cx();
      const pivY   = p.cy();

      // Floor shadow: foreground casts closer, background further away.
      const shadowFloorY = 460;
      const shadowCX     = p.cx();
      const shadowRX     = p.w * 0.55 * dScale;
      const shadowRY     = shadowRX * 0.22;
      const shadowAlpha  = (0.40 - Math.abs(pz) * 0.12) * Math.max(0, 1 - (shadowFloorY - (p.y + p.h + dOffY)) / 200);
      if (shadowAlpha > 0.02) {
        ctx.save();
        ctx.globalAlpha = shadowAlpha;
        ctx.fillStyle   = '#000000';
        ctx.beginPath();
        ctx.ellipse(shadowCX, shadowFloorY, Math.max(2, shadowRX), Math.max(1, shadowRY), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Background dimmer, foreground at full brightness.
      const fogAlpha = pz >= 0 ? 1.0 : 0.62 + pz * 0.38; // z=-1 → 0.24 dimmer

      ctx.save();
      ctx.globalAlpha = fogAlpha;
      ctx.translate(pivX, pivY + dOffY);
      ctx.scale(dScale, dScale);
      ctx.translate(-pivX, -pivY);
      p.draw();
      ctx.restore();

      return; // draw already called above
    }
    // Hit nudge: directional recoil, linear decay over 4 frames.
    if (p._hitNudge && p._hitNudge.t > 0) {
      ctx.save();
      ctx.translate(p._hitNudge.x * (p._hitNudge.t / 4), 0);
      p.draw();
      ctx.restore();
      p._hitNudge.t--;
    } else {
      p.draw();
    }
    // Hit flash: white overlay sized to the fighter.
    if (p._hitFlashTimer && p._hitFlashTimer > 0) {
      p._hitFlashTimer--;
      ctx.save();
      ctx.globalAlpha = (p._hitFlashTimer / 5) * 0.38;
      ctx.fillStyle   = '#ffffff';
      ctx.fillRect(p.x - 1, p.y - 1, p.w + 2, p.h + 2);
      ctx.restore();
    }
  });
  if (typeof drawWorldFinisherClone === 'function') drawWorldFinisherClone();
  if (typeof MoveScene !== 'undefined') MoveScene.draw();
  // Trials draw: reveal sweep, distortion band, cues, inversion tell. Above fighters so cues aren't hidden.
  // Inert unless a trial is armed (smb-trials.js).
  if (typeof drawTrials === 'function') drawTrials();
  // Chaos system: world-space draw (item drops, effect badges, platform effects)
  if (typeof chaosMode !== 'undefined' && chaosMode && typeof drawChaosWorldSpace === 'function') drawChaosWorldSpace();
  drawSpartanRageEffects();
  drawClassEffects();
  drawCurseAuras();
  updateAndDrawLightningBolts();
  if ((gameMode === 'trueform' || _anyTFKit || _forceTF
      || (damnationActive && players.some(p => p.isTrueForm))) &&
      !(typeof tfOpeningFightActive !== 'undefined' && tfOpeningFightActive)) {
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
    drawTFDimensionPunch();
    drawBossWarnings();
  }
  drawPhaseTransitionRings();
  drawCinematicWorldEffects(); // ground cracks + world-space cinematic fx
  if (typeof drawCinSpeedLines === 'function') drawCinSpeedLines();
  // Paradox entity (world-space, drawn over fighters)
  if (typeof drawParadox === 'function') drawParadox();
  // A cinematic's own world-space layer (figures and effects that are not fighters)
  if (activeCinematic && typeof activeCinematic.drawWorld === 'function') {
    ctx.save();
    try { activeCinematic.drawWorld(ctx); } catch (e) { console.error('[cinematic] drawWorld threw:', e); }
    ctx.restore();
  }
  // Divine Summon: Herald entity world-space draw
  if (typeof drawDivineSummon === 'function') drawDivineSummon();
  // TF-kills-Paradox cinematic overlay (lock rings world-space + terminal screen-space)
  if (typeof updateTFKCOverlay === 'function') updateTFKCOverlay();
  if (typeof drawTFKCOverlay   === 'function') drawTFKCOverlay();
  // Absorption aura on player (world-space cyan glow, active and permanent)
  if (typeof drawTFAbsorption      === 'function') drawTFAbsorption();
  // Absorption cinematic v2, memory-driven scene overlay
  if (tfAbsorptionScene && typeof drawTFAbsorptionScene === 'function') drawTFAbsorptionScene();
  // Paradox empowerment aura (world-space, over fighters)
  if (typeof drawParadoxEmpowerment === 'function') drawParadoxEmpowerment();
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
  if (typeof godCinematicScene !== 'undefined' && godCinematicScene) drawGodCinematic();
  updateMapPerks();
  // Trials tick after combat so cue detection reads settled per-frame state.
  if (typeof updateTrials === 'function') updateTrials();
  updateMirrorGimmick();
  drawMirrorGimmickOverlay();
  // Paradox revive system (screen-space overlay, replaces fake-death visually)
  if (typeof updateParadoxRevive === 'function') updateParadoxRevive();
  if (typeof drawParadoxRevive   === 'function') drawParadoxRevive();
  // Standalone Paradox entity update (fade-out cleanup outside of revive/opening-fight sequence)
  if (typeof updateParadox === 'function' && (typeof paradoxReviveActive === 'undefined' || !paradoxReviveActive)
      && (typeof tfOpeningFightActive === 'undefined' || !tfOpeningFightActive)) updateParadox();
  // Paradox empowerment timer tick
  if (typeof updateParadoxEmpowerment === 'function') updateParadoxEmpowerment();
  // Paradox ability effects update
  if (typeof updateParadoxEffects === 'function') updateParadoxEffects();
  // False Victory sequence update + draw
  if (typeof updateFalseVictory === 'function') updateFalseVictory();
  if (typeof drawFalseVictory   === 'function') drawFalseVictory();
  if (typeof updateTFOpeningFight   === 'function') updateTFOpeningFight();
  if (typeof updateTFAbsorption     === 'function') updateTFAbsorption();
  if (tfAbsorptionScene && typeof updateTFAbsorptionScene === 'function') updateTFAbsorptionScene();
  // Paradox Fusion visual overlay on P1
  if (typeof drawParadoxFusion === 'function' && typeof tfParadoxFused !== 'undefined' && tfParadoxFused) {
    drawParadoxFusion(players[0]);
  }
  // Paradox ability effects draw
  if (typeof drawParadoxEffects === 'function') drawParadoxEffects();
  // Legacy fake-death scene (runs only when paradox system unavailable)
  if (typeof triggerParadoxRevive === 'undefined') {
    updateFakeDeathScene();
    drawFakeDeathScene();
  }

  // Blood stains: persistent marks on surfaces
  for (let i = bloodStains.length - 1; i >= 0; i--) {
    const _bs = bloodStains[i];
    _bs.life--;
    if (_bs.life <= 0) { bloodStains.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(0.55, (_bs.life / _bs.maxLife) * 0.7);
    ctx.fillStyle   = '#660000';
    ctx.beginPath();
    ctx.ellipse(_bs.x, _bs.y, _bs.r, _bs.r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Phase: updateParticles
  const _liveParticles = [];
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.12; p.vx *= 0.96;
    p.life--;
    if (p.life > 0) {
      // Blood particles: check if landing on a platform surface → leave a stain
      if (p.isBlood && p.vy > 0 && currentArena && currentArena.platforms) {
        for (const _pl of currentArena.platforms) {
          if (p.x > _pl.x && p.x < _pl.x + _pl.w &&
              p.y >= _pl.y - 1 && p.y - p.vy < _pl.y) {
            if (bloodStains.length < 80) {
              bloodStains.push({ x: p.x + (Math.random() - 0.5) * 4, y: _pl.y,
                r: 3 + Math.random() * 5, life: 720, maxLife: 720 });
            }
            p.life = 0; // consume particle
            break;
          }
        }
        if (p.life <= 0) { _recycleParticle(p); continue; }
      }
      _liveParticles.push(p);
    } else {
      _recycleParticle(p);
    }
  }
  particles = _liveParticles; // keep only live (life > 0) to prevent leak

  // Phase: drawParticles
  // Two passes so the composite mode is set twice per frame, not once per particle.
  // Pass 1: heavy matter (blood, debris, smoke), normal blending.
  // Pass 2: sparks, streaked along velocity and drawn additively. A static dot reads as confetti, a streak reads as impact.
  ctx.save();
  for (let i = 0; i < _liveParticles.length; i++) {
    const p = _liveParticles[i];
    if (!p.isBlood && (p.vx * p.vx + p.vy * p.vy) > 4.8) continue;   // spark: pass 2
    const a = p.life / p.maxLife;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.01, p.size * a), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < _liveParticles.length; i++) {
    const p = _liveParticles[i];
    const sq = p.vx * p.vx + p.vy * p.vy;
    if (p.isBlood || sq <= 4.8) continue;
    const a   = p.life / p.maxLife;
    const spd = Math.sqrt(sq);
    const len = Math.min(10, spd * 1.25);
    ctx.globalAlpha = Math.max(0, a) * 0.85;
    ctx.strokeStyle = p.color;
    ctx.lineWidth   = Math.max(0.4, p.size * a * 1.5);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - (p.vx / spd) * len, p.y - (p.vy / spd) * len);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // Battle Royale office facade: after the fighters, so it hides whoever is inside.
  if (gameMode === 'battleroyale' && typeof drawBRStructuresFront === 'function') drawBRStructuresFront();
  if (typeof drawCataclysmFX === 'function') drawCataclysmFX();
  // Debris (cosmetic, no collision or sync)
  if (typeof updateDestruction === 'function') { updateDestruction(); drawDebrisChunks(); }
  if (typeof updateWorldReact === 'function') { updateWorldReact(); drawWorldReactFront(); }

  // Domain speech bubbles (world-space, above entities)
  if (typeof DomainManager !== 'undefined') DomainManager.drawSpeechBubbles();
  // Public Server name tags (world-space, above entities)
  if (typeof PubHub !== 'undefined' && PubHub.active) PubHub.drawWorld();

  // Damage texts, filter expired to prevent leak
  damageTexts.forEach(d => { d.update(); d.draw(); });
  damageTexts = damageTexts.filter(d => d.life > 0);

  // Respawn countdowns, filter expired to prevent leak
  for (const cd of respawnCountdowns) {
    cd.framesLeft--;
    if (cd.framesLeft <= 0) continue;
    const num = Math.ceil(cd.framesLeft / 22);
    const a   = Math.min(1, cd.framesLeft / 18) * (1 - Math.max(0, (22 - cd.framesLeft % 22) / 22) * 0.3);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.font        = '800 32px "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
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
  // Drop the shake offset, keep scale and camera centering.
  if (typeof _applyGameTransform === 'function') {
    _applyGameTransform(finalScX, finalScY,
      canvas.width  / 2 - camCX * finalScX,
      canvas.height / 2 - camCY * finalScY);
  } else {
    ctx.setTransform(finalScX, 0, 0, finalScY,
      canvas.width  / 2 - camCX * finalScX,
      canvas.height / 2 - camCY * finalScY);
  }

  checkDeaths();
  updateHUD();
  if (storyModeActive && typeof storyTickFightScript    === 'function') storyTickFightScript();
  if (storyModeActive && typeof storyCheckEvents        === 'function') storyCheckEvents();
  if (storyModeActive && typeof storyUpdateBoundaries   === 'function') storyUpdateBoundaries();
  // Multiverse: per-frame world modifier tick (gravity flip, shadow teleport, etc.)
  if (multiverseModeActive && typeof MultiverseManager !== 'undefined') MultiverseManager.tick();
  if (exploreActive && typeof updateExploration === 'function') updateExploration();
  if ((gameMode === 'escort' || (typeof escortActive !== 'undefined' && escortActive) || (typeof _escortPending !== 'undefined' && _escortPending)) && typeof updateEscortMode === 'function') updateEscortMode();
  if (gameMode === 'shipflight' && typeof updateShipFlight === 'function') updateShipFlight();
  if (gameMode === 'assassination' && typeof updateAssassinationMode === 'function') updateAssassinationMode();
  if (gameMode === 'gauntlet' && typeof updateGauntletMode === 'function') updateGauntletMode();
  // Ship & Fracture progression, tick preview timer each frame
  if (typeof updateFracturePreview === 'function') updateFracturePreview();
  if (typeof updateFractureBranch === 'function') updateFractureBranch();
  if (typeof updateLadder === 'function') updateLadder();
  if (typeof updateTutorial === 'function') updateTutorial();
  if (typeof updateMovePreview === 'function') updateMovePreview();
  if (gameMode === 'trueform' && !tfAbsorptionScene && typeof updateQTE === 'function') updateQTE();

  // TrueForm: record player position history for multiverse lag-echo
  if (gameMode === 'trueform' && players[0] && players[0].health > 0) {
    _tfCloneHistory.push({ x: players[0].cx(), y: players[0].cy(), facing: players[0].facing });
    if (_tfCloneHistory.length > 24) _tfCloneHistory.shift();
  }

  // Minigame HUD overlay
  if (gameMode === 'minigames') drawMinigameHUD();
  if (gameMode === 'battleroyale' && typeof drawBattleRoyaleHUD === 'function') drawBattleRoyaleHUD();
  if (gameMode === 'endless' && typeof drawEndlessHUD === 'function') drawEndlessHUD();
  if ((gameMode === 'escort' || (typeof escortActive !== 'undefined' && escortActive)) && typeof drawEscortHUD === 'function') drawEscortHUD();
  if (gameMode === 'assassination' && typeof drawAssassinationHUD === 'function') drawAssassinationHUD();
  if (gameMode === 'gauntlet' && typeof drawGauntletHUD === 'function') drawGauntletHUD();
  // New chaos modifier notification, timer ticked here, drawn in screen-space below
  if (_chaosModNotif && _chaosModNotif.timer > 0) _chaosModNotif.timer--;
  if (exploreActive && typeof drawExploreGoalObject === 'function') drawExploreGoalObject();
  if (exploreActive && typeof drawSidequestWorld === 'function') drawSidequestWorld();
  // Story mode: void fog (drawn in game-world space)
  if (storyModeActive) drawStoryVoidFog();
  if (exploreActive && typeof drawExploreWorldModeOverlay === 'function') drawExploreWorldModeOverlay();
  // Absolute Axiom multiverse: dead-universe darkness + location title card
  if (typeof AAMultiverse !== 'undefined') AAMultiverse.drawOverlay(finalScX, finalScY, camCX, camCY);
  if (typeof OwnerTools !== 'undefined') OwnerTools.drawWorld(ctx);
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

  if (typeof MoveScene !== 'undefined') MoveScene.drawScreen();
  if (typeof drawCinematicImpactEffects === 'function') drawCinematicImpactEffects();
  drawCinematicOverlay();
  drawAchievementPopups();
  if (damnationActive && typeof drawDamnationEffects === 'function') drawDamnationEffects();
  if (damnationActive && typeof drawDamnationAnchors === 'function') drawDamnationAnchors();
  if (typeof drawObjectiveHUD === 'function') drawObjectiveHUD();
  if (typeof drawMatchAnnouncer === 'function') drawMatchAnnouncer();
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
  if (storyModeActive && typeof drawFallenWarriorMemory  === 'function') drawFallenWarriorMemory();
  // Multiverse: in-world-space modifier visuals (badge, gravity bar, warning text)
  if (multiverseModeActive && typeof MultiverseManager !== 'undefined') MultiverseManager.draw();
  // Multiverse: screen-space overlays (shadow fog, Fallen God dialogue, world-complete banner, encounter HUD)
  if (multiverseModeActive && typeof MultiverseManager !== 'undefined') {
    MultiverseManager.drawScreenSpace();
    MultiverseManager.drawHUD();
  }
  if ((currentArena && currentArena.isBossArena || window.FORCE_ATTACK_MODE) && typeof drawBossDialogue === 'function') drawBossDialogue(finalScX, finalScY, camCX, camCY);
  if (typeof drawHitEffectivenessHUD === 'function') drawHitEffectivenessHUD();
  if (gameMode === 'exploration') {
    drawExploreHUD();
    if (typeof drawExploreMinimap === 'function') drawExploreMinimap();
    if (typeof drawSidequestHUD === 'function') drawSidequestHUD();
  }
  if (typeof _interludeActive !== 'undefined' && _interludeActive && typeof drawInterlude === 'function') drawInterlude();
  if (exploreActive && typeof drawExploreModeOverlay === 'function') drawExploreModeOverlay();
  if (abilityUnlockToast && abilityUnlockToast.timer > 0) drawAbilityUnlockToast();
  if (gameMode === 'trueform' && typeof drawQTE === 'function') drawQTE(ctx, canvas.width, canvas.height);
  if (typeof drawCutscene === 'function') drawCutscene(ctx, canvas.width, canvas.height);
  if (typeof drawFinisher === 'function') drawFinisher(ctx); // finisher overlay (topmost)
  if (typeof drawCinNameCard === 'function') drawCinNameCard(canvas.width, canvas.height);
  if (typeof drawTutorial === 'function') drawTutorial(ctx);
  if (typeof drawDesignerTestHUD === 'function') drawDesignerTestHUD(ctx);
  // Absolute Axiom: RGS HUD + Dimension Punch overlay (topmost, must draw after finisher)
  if (typeof _drawRGSHud === 'function') _drawRGSHud(canvas.width, canvas.height);
  if (typeof _drawDimPunchOverlay === 'function') _drawDimPunchOverlay(canvas.width, canvas.height);

  // Conviction HUD: timer bars (screen-space, above game HUD)
  if (typeof DomainManager !== 'undefined') DomainManager.drawHUD();

  // Critical status overlays: screen space, always on top. The legacy DOM banner is hidden.
  { const _b = document.getElementById('ctrlInvertedBanner'); if (_b) _b.style.display = 'none'; }

  ctx.setTransform(1, 0, 0, 1, 0, 0); // ensure screen space
  // Divine Summon HUD: cooldown arc (screen-space, top-right corner)
  if (typeof drawDivineSummonHUD === 'function') drawDivineSummonHUD(canvas.width, canvas.height);
  {
    const _now = performance.now();
    const _cW  = canvas.width;
    const _cH  = canvas.height;

    // Chaos mod notification (screen-space, was world-space before)
    if (_chaosModNotif && _chaosModNotif.timer > 0) {
      const _alpha = Math.min(1, _chaosModNotif.timer / 30);
      const _pulse = 0.75 + 0.25 * Math.sin(_now / 220);
      const _scale = 1 + 0.06 * Math.sin(_now / 180);
      ctx.save();
      ctx.globalAlpha = _alpha * _pulse;
      ctx.translate(_cW / 2, _cH * 0.88);
      ctx.scale(_scale, _scale);
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#ff88ff';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff00ff'; ctx.shadowBlur = 14;
      ctx.fillText('+ ' + _chaosModNotif.label, 0, 0);
      ctx.restore();
    }

    // Gravity-inverted warning
    if (typeof tfGravityInverted !== 'undefined' && tfGravityInverted) {
      const _pulse = 0.55 + 0.45 * Math.abs(Math.sin(_now / 350));
      const _scale = 1 + 0.07 * Math.sin(_now / 280);
      ctx.save();
      ctx.globalAlpha = _pulse;
      ctx.translate(_cW / 2, _cH * 0.13);
      ctx.scale(_scale, _scale);
      ctx.font = 'bold 19px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ccaaff';
      ctx.shadowColor = '#8844ff'; ctx.shadowBlur = 22;
      ctx.fillText('\u26A0 GRAVITY INVERTED', 0, 0);
      ctx.restore();
    }

    // Controls-inverted warning (canvas replacement for DOM banner)
    if (typeof tfControlsInverted !== 'undefined' && tfControlsInverted && tfControlsInvertTimer > 0) {
      const _pulse = 0.6 + 0.4 * Math.abs(Math.sin(_now / 300));
      const _scale = 1 + 0.05 * Math.sin(_now / 240);
      const _secs  = Math.ceil(tfControlsInvertTimer / 60);
      ctx.save();
      ctx.globalAlpha = _pulse;
      ctx.translate(_cW / 2, _cH * 0.08);
      ctx.scale(_scale, _scale);
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff5555';
      ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 18;
      ctx.fillText('\u26A0 CONTROLS INVERTED  ' + _secs + 's', 0, 0);
      ctx.restore();
    }
  }

  drawEdgeIndicators(finalScX, finalScY, camCX, camCY);
  if (typeof drawCinematicLetterbox === 'function') drawCinematicLetterbox();
  // Restore the game transform for the remaining draws.
  if (typeof _applyGameTransform === 'function') {
    _applyGameTransform(finalScX, finalScY, canvas.width/2 - camCX*finalScX, canvas.height/2 - camCY*finalScY);
  } else {
    ctx.setTransform(finalScX, 0, 0, finalScY, canvas.width/2 - camCX*finalScX, canvas.height/2 - camCY*finalScY);
  }

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

  // Always tick FPS so console 'fps' command works without debug overlay open
  if (typeof _dbgTickFps === 'function' && !debugMode) _dbgTickFps();

  // Training lab HUD. Draws unconditionally in training mode, since it ticks lockout stats every frame.
  if (trainingMode && typeof renderTrainingLab === 'function') renderTrainingLab(ctx);

  // Debug overlay (drawn last, in screen-space)
  if (debugMode) {
    runSanityChecks();
    renderDebugOverlay(ctx);
  }

  // Screen FX post-processing (chromatic aberration, impact flash, ripples, vignette, smear)
  if (typeof ScreenFX !== 'undefined') ScreenFX.postRender();

  // Use error-boundary wrapper if available; fall back to raw rAF
  if (typeof ErrorBoundary !== 'undefined') {
    requestAnimationFrame(ErrorBoundary.wrapLoop(gameLoop));
  } else {
    requestAnimationFrame(gameLoop);
  }
}

