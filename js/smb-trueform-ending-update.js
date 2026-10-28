'use strict';
// smb-trueform-ending-update.js: updateTFEnding state machine, _tfeResumeAfterIntro, _tfeUnlockPatrolMode, trySkipTFEnding.
// Depends on smb-globals.js, smb-particles-core.js and smb-combat.js.

function updateTFEnding() {
  const sc = tfEndingScene;
  if (!sc) return;
  sc.timer++;
  const t = sc.timer;

  if (sc.phase === 'realization') {
    // Cycle through 3 dialogue lines, each 100 frames
    const lineLen = 100;
    const totalLines = sc.realizationDialogue.length;
    const lineIdx = Math.floor(t / lineLen);
    const lineT   = t % lineLen;
    sc.dialogueIdx   = Math.min(lineIdx, totalLines - 1);
    sc.dialogueAlpha = lineT < 15  ? lineT / 15 :
                       lineT < 70  ? 1 :
                       lineT < 95  ? 1 - (lineT - 70) / 25 : 0;

    // Bouncing "0" pops at boss position, as if attacks do nothing
    if (t % 18 === 5 && _tfeZeroPops.length < 12) {
      _tfeZeroPops.push({
        x:     sc.boss.cx() + (Math.random() - 0.5) * 60,
        y:     sc.boss.cy() - 20,
        vy:   -3 - Math.random() * 2,
        alpha: 1,
        timer: 0,
        bounces: 0,
      });
    }
    for (let i = _tfeZeroPops.length - 1; i >= 0; i--) {
      const zp = _tfeZeroPops[i];
      zp.timer++;
      zp.vy += 0.35;
      zp.y  += zp.vy;
      if (zp.y > sc.boss.cy() + 10 && zp.vy > 0 && zp.bounces < 2) {
        zp.y  = sc.boss.cy() + 10;
        zp.vy = -Math.abs(zp.vy) * 0.55;
        zp.bounces++;
      }
      zp.alpha = Math.max(0, 1 - zp.timer / 55);
      if (zp.alpha <= 0) _tfeZeroPops.splice(i, 1);
    }

    if (t >= totalLines * lineLen + 20) {
      _tfeZeroPops = [];
      sc.phase = 'punch';
      sc.timer = 0;
      screenShake = 14;
    }
  }

  else if (sc.phase === 'punch') {
    const bx = sc.boss.cx(), by = sc.boss.cy();
    const hx = sc.hero.cx(), hy = sc.hero.cy();
    const punchDir = bx < hx ? 1 : -1; // direction hero will be launched

    // Frames 0-8: freeze and slow-motion wind-up
    if (t < 8) {
      slowMotion = Math.max(0.05, 1 - t * 0.12);
    }

    // Frames 0–18: boss rushes toward hero with wind-up energy swirl
    if (t < 18) {
      sc.boss.x += (hx - bx - sc.boss.w / 2) * 0.22;
      sc.boss.y += (hy - by - sc.boss.h / 2) * 0.22;
      if (settings.particles && t % 2 === 0 && particles.length < MAX_PARTICLES) {
        const _p = _getParticle();
        const ang = (t / 18) * Math.PI * 4;
        _p.x = sc.boss.cx() + Math.cos(ang) * 28;
        _p.y = sc.boss.cy() + Math.sin(ang) * 28;
        _p.vx = Math.cos(ang + 1.5) * 3; _p.vy = Math.sin(ang + 1.5) * 3;
        _p.color = Math.random() < 0.5 ? '#8800ff' : '#ffffff';
        _p.size = 2 + Math.random() * 3; _p.life = 14; _p.maxLife = 14;
        particles.push(_p);
      }
    }

    // Frame 18: time snaps back, impact
    if (t === 18) {
      slowMotion = 1.0;
      sc.boss.attackTimer    = 22;
      sc.boss.attackDuration = 22;
      sc.boss.facing         = punchDir;
    }

    // Frame 22: punch lands, directional blast
    if (t === 22) {
      screenShake = 75;
      CinFX.shockwave(hx, hy, '#ffffff', { count: 3, maxR: 280, lw: 6, dur: 60 });
      CinFX.flash('#ffffff', 0.95, 14);
      spawnParticles(hx, hy, '#ffffff', 55);
      spawnParticles(hx, hy, '#8800ff', 25);
      spawnParticles(hx + punchDir * 30, hy, '#ffffff', 30);
      if (settings.particles) {
        for (let i = 0; i < 30 && particles.length < MAX_PARTICLES; i++) {
          const _p = _getParticle();
          _p.x = hx + (Math.random() - 0.5) * 20;
          _p.y = hy + (Math.random() - 0.5) * 20;
          _p.vx = punchDir * (10 + Math.random() * 14);
          _p.vy = (Math.random() - 0.5) * 4;
          _p.color = Math.random() < 0.6 ? '#ffffff' : '#8800ff';
          _p.size  = 1.5 + Math.random() * 4;
          _p.life  = 20 + Math.random() * 15; _p.maxLife = 35;
          particles.push(_p);
        }
      }
      SoundManager.heavyHit && SoundManager.heavyHit();
      cinematicCamOverride = true;
      cinematicZoomTarget  = 1.6;
      cinematicFocusX      = hx + punchDir * 80;
      cinematicFocusY      = hy - 20;
    }

    if (t >= 32) {
      sc.phase = 'launch';
      sc.timer = 0;
      sc.hero.invincible = 999999;
      sc.hero.backstageHiding = true;
      sc.heroScreenX = sc.hero.cx();
      sc.heroScreenY = sc.hero.cy();
      sc.heroPrevX   = sc.heroScreenX;
      sc.heroPrevY   = sc.heroScreenY;
      sc.bgPanelIdx  = 0;
      sc.bgPanelT    = 0;
      // Rebuild launch spline now that we know boss direction
      sc.launchPts = _tfeLaunchPts(sc.hero, sc.boss);
    }
  }

  else if (sc.phase === 'launch') {
    const totalDur = 200;
    sc.launchT = Math.min(1, t / totalDur);
    const eased = sc.launchT * sc.launchT * (3 - 2 * sc.launchT);
    const pos = _tfeSpline(sc.launchPts, eased);
    sc.heroPrevX   = sc.heroScreenX;
    sc.heroPrevY   = sc.heroScreenY;
    sc.heroScreenX = pos.x;
    sc.heroScreenY = pos.y;

    const panelCount = _TFE_BG_PANELS.length;
    sc.bgPanelIdx = Math.min(panelCount - 1, Math.floor(sc.launchT * panelCount));

    sc.tearAlpha = Math.min(0.65, sc.launchT * 1.1);

    const expectedPanel = Math.floor(sc.launchT * panelCount);
    if (expectedPanel > (sc._lastPanel || 0)) {
      sc._lastPanel = expectedPanel;
      CinFX.flash('#ffffff', 0.45, 6);
      screenShake = 18 + expectedPanel * 4;
    }

    if (t % 2 === 0) {
      const _p = _getParticle();
      _p.x = pos.x + (Math.random()-0.5)*18; _p.y = pos.y + (Math.random()-0.5)*18;
      _p.vx = (Math.random()-0.5)*3; _p.vy = (Math.random()-0.5)*3;
      _p.color = Math.random() < 0.5 ? '#ffffff' : '#8888ff';
      _p.size = 2 + Math.random()*6; _p.life = 28 + Math.random()*22; _p.maxLife = 50;
      particles.push(_p);
    }

    _tfeCamFocus(pos.x, pos.y, 1.45);

    // The rift-sealing Code Realm used to follow here: a walk-to-five-circles chore that stopped the
    // climax cold. The launch now ends with the fall back into the arena.
    if (t >= totalDur) {
      sc.phase = 'return';
      sc.timer = 0;
      sc.returnY  = -80;
      sc.returnVY = 3;
      sc.hero.invincible = 999999;
      sc.boss.backstageHiding = true;
      const floor = currentArena && currentArena.platforms.find(pl => pl.isFloor && !pl.isFloorDisabled);
      const floorY = floor ? floor.y : GAME_H - 30;
      sc.hero.x = GAME_W / 2 - sc.hero.w / 2;
      sc.hero.y = floorY - sc.hero.h;
      _tfeCamFocus(GAME_W / 2, GAME_H / 2, 1.1);
      CinFX.flash('#000000', 1.0, 16);
    }
  }

  else if (sc.phase === 'coderealm') {
    sc.rainAlpha = Math.min(0.92, t / 50);

    // Keep hero fully immune to damage and hazards throughout coderealm
    sc.hero.invincible = 999999;

    // Free-flight physics: no gravity, directional control (jump=up, shield=down)
    const ctrl = sc.hero.controls;
    if (ctrl) {
      const spd = 3.8;
      if (keysDown.has(ctrl.left))  sc.crHeroX -= spd;
      if (keysDown.has(ctrl.right)) sc.crHeroX += spd;
      const fUp   = keysDown.has(ctrl.jump);
      const fDown = keysDown.has(ctrl.shield);
      sc.crHeroVY = fUp ? -6 : (fDown ? 6 : sc.crHeroVY * 0.7);
      sc.crHeroY += sc.crHeroVY;
      sc.crHeroX = Math.max(12, Math.min(GAME_W - 12, sc.crHeroX));
      sc.crHeroY = Math.max(18, Math.min(GAME_H - 18, sc.crHeroY));
    }

    for (const nd of sc.codeNodes) {
      nd.pulse += 0.07;
      if (nd.hitTimer > 0) nd.hitTimer--;
    }

    // Corrupt node on proximity contact: no attack required, generous radius
    for (const nd of sc.codeNodes) {
      if (!nd.corrupted) {
        const dx = nd.x - sc.crHeroX, dy = nd.y - sc.crHeroY;
        if (Math.sqrt(dx*dx+dy*dy) < 80) {
          nd.corrupted = true;
          nd.hitTimer  = 30;
          sc.nodesCorrupted++;
          sc.crFlashTimer = 20;
          screenShake = 22;
          CinFX.flash('#cc66ff', 0.55, 10);
          spawnParticles(nd.x, nd.y, '#cc66ff', 18);
          spawnParticles(nd.x, nd.y, '#ffffff', 10);
          SoundManager.explosion && SoundManager.explosion();
          break;
        }
      }
    }

    if (sc.crFlashTimer > 0) sc.crFlashTimer--;

    if (sc.nodesCorrupted >= 5 && t > 60) {
      if (!sc._crDoneTimer) sc._crDoneTimer = 0;
      sc._crDoneTimer++;
      if (sc._crDoneTimer === 1) {
        screenShake = 90;
        CinFX.flash('#cc66ff', 0.85, 20);
        spawnParticles(GAME_W/2, GAME_H/2, '#cc66ff', 80);
        spawnParticles(GAME_W/2, GAME_H/2, '#000000', 50);
        spawnParticles(GAME_W/2, GAME_H/2, '#ffffff', 40);
      }
      if (sc._crDoneTimer >= 60) {
        sc.phase = 'return';
        sc.timer = 0;
        sc.returnY  = -80;
        sc.returnVY = 3;
        sc.boss.backstageHiding = true;
        const floor = currentArena && currentArena.platforms.find(pl => pl.isFloor && !pl.isFloorDisabled);
        const floorY = floor ? floor.y : GAME_H - 30;
        sc.hero.x = GAME_W / 2 - sc.hero.w / 2;
        sc.hero.y = floorY - sc.hero.h;
        _tfeCamFocus(GAME_W / 2, GAME_H / 2, 1.1);
        CinFX.flash('#000000', 1.0, 16);
      }
    }

    for (const col of _tfeRainCols) {
      col.y += col.speed;
      if (col.y > GAME_H + 50) col.y = -Math.random() * 60;
      if (Math.random() < 0.025) {
        col.chars[Math.floor(Math.random() * col.chars.length)] =
          _TFE_CHARS[Math.floor(Math.random() * _TFE_CHARS.length)];
      }
    }
  }

  else if (sc.phase === 'return') {
    sc.returnY  += sc.returnVY;
    sc.returnVY += 0.4;
    sc.rainAlpha = Math.max(0, sc.rainAlpha - 0.04);

    const floor = currentArena && currentArena.platforms.find(pl => pl.isFloor && !pl.isFloorDisabled);
    const floorY = floor ? floor.y : GAME_H - 30;

    if (sc.returnY >= floorY - sc.hero.h) {
      sc.returnY = floorY - sc.hero.h;
      sc.returnVY = 0;
      screenShake = 28;
      CinFX.flash('#ffffff', 0.55, 8);
      spawnParticles(GAME_W/2, floorY, '#ffffff', 20);
      // Intro mode: skip finisher/aura/powers/fall, go straight to fadeout
      if (sc.isIntro) {
        sc.phase = 'fadeout';
        sc.timer = 0;
        sc.hero.backstageHiding = false;
        sc.hero.x = GAME_W / 2 - sc.hero.w / 2;
        if (typeof showBossDialogue === 'function') showBossDialogue('NOW we begin.', 300);
        return;
      }
      sc.phase = 'finisher';
      sc.timer = 0;
      sc.hero.backstageHiding = false;
      sc.hero.x = GAME_W / 2 - sc.hero.w / 2;
      sc.hero.y = sc.returnY;
      sc.boss.backstageHiding = false;
      sc.boss.x = GAME_W / 2 - sc.boss.w / 2 - 120;
      sc.boss.y = floorY - sc.boss.h;
      sc.finisherBossX = sc.boss.cx();
      sc.finisherBossY = sc.boss.cy();
      sc.finisherPrompt = 1;
    }
  }

  else if (sc.phase === 'finisher') {
    if (sc.finisherFlash > 0) sc.finisherFlash--;

    const neededHits = 3;
    // QTE: player must press attack at the right prompt
    if (sc.finisherHits < neededHits) {
      if (sc.finisherPrompt > 0 && _tfeFinAtkJust()) {
        sc.finisherHits++;
        sc.finisherFlash = 22;
        sc.finisherPrompt = 0;
        screenShake = 38 + sc.finisherHits * 10;
        CinFX.flash(_TFE_QTE_FLASH_COLORS[sc.finisherHits - 1] || '#ffffff', 0.7, 12);
        // Each hit strips a void layer, dark particles peel away
        spawnParticles(sc.boss.cx(), sc.boss.cy(), '#8844ff', 28);
        spawnParticles(sc.boss.cx(), sc.boss.cy(), '#330066', 20);
        spawnParticles(sc.boss.cx(), sc.boss.cy(), '#ffffff', 14);
        SoundManager.heavyHit && SoundManager.heavyHit();
        const dir = sc.boss.cx() < sc.hero.cx() ? -1 : 1;
        sc.finisherBossVX = dir * (8 + sc.finisherHits * 4);
        sc.finisherBossVY = -12 - sc.finisherHits * 3;
        sc._finisherPauseTimer = 0;
      }
    }

    sc.finisherBossVY += 0.7;
    sc.finisherBossX  += sc.finisherBossVX;
    sc.finisherBossY  += sc.finisherBossVY;
    sc.finisherBossVX *= 0.88;
    const floor = currentArena && currentArena.platforms.find(pl => pl.isFloor && !pl.isFloorDisabled);
    const floorY = floor ? floor.y : GAME_H - 30;
    if (sc.finisherBossY >= floorY - sc.boss.h / 2) {
      sc.finisherBossY  = floorY - sc.boss.h / 2;
      sc.finisherBossVY = -Math.abs(sc.finisherBossVY) * 0.3;
      if (Math.abs(sc.finisherBossVY) < 1) sc.finisherBossVY = 0;
    }

    if (sc.finisherHits < neededHits && sc.finisherPrompt === 0) {
      if (!sc._finisherPauseTimer) sc._finisherPauseTimer = 0;
      sc._finisherPauseTimer++;
      if (sc._finisherPauseTimer > 30 && Math.abs(sc.finisherBossVY) < 2) {
        sc.finisherPrompt = 1;
        sc._finisherPauseTimer = 0;
      }
    }

    if (sc.finisherHits >= neededHits) {
      if (!sc._finisherEndTimer) sc._finisherEndTimer = 0;
      sc._finisherEndTimer++;
      if (sc._finisherEndTimer === 40) {
        CinFX.flash('#000000', 0.7, 20);
      }
      if (sc._finisherEndTimer >= 80) {
        sc.phase = 'aura';
        sc.timer = 0;
        sc.auraX  = sc.finisherBossX;
        sc.auraY  = sc.finisherBossY;
        sc.boss.backstageHiding = true;
        _tfeAuraParticles = [];
        _tfeCamFocus(GAME_W/2, GAME_H/2, 1.2);
      }
    }
  }

// Resonance: Kael's fragment finds Axiom's buried energy. The fit is imprecise (Axiom's is
// dissolved, Kael's crystallized), and it fires anyway, not cleanly.
  else if (sc.phase === 'aura') {
    const dur = 150;
    // Pulse stays at Axiom's last position: it does not flow to the hero.
    if (sc._resonanceFlicker === undefined) sc._resonanceFlicker = 1;
    sc._resonanceFlicker = Math.random() < 0.15
      ? Math.random() * 0.4                        // sudden drop, interference
      : Math.min(1, sc._resonanceFlicker + 0.07);  // uneven recovery

    // Erratic scattered particles, not streaming
    if (settings.particles && t % 3 === 0 && _tfeAuraParticles.length < 28) {
      const angle = Math.random() * Math.PI * 2;
      const rad   = 10 + Math.random() * 40;
      _tfeAuraParticles.push({
        x:    sc.auraX + Math.cos(angle) * rad,
        y:    sc.auraY + Math.sin(angle) * rad,
        vx:   (Math.random() - 0.5) * 2.2,
        vy:   (Math.random() - 0.5) * 2.2,
        life: 12 + Math.floor(Math.random() * 20),
        maxLife: 32,
        r:    1.5 + Math.random() * 2.5,
      });
    }
    for (let i = _tfeAuraParticles.length - 1; i >= 0; i--) {
      const ap = _tfeAuraParticles[i];
      ap.x += ap.vx; ap.y += ap.vy; ap.life--;
      if (ap.life <= 0) _tfeAuraParticles.splice(i, 1);
    }

    if (t === 35) { screenShake = Math.max(screenShake, 10); }
    if (t === 70) { CinFX.flash('#8844ff', 0.22, 8); screenShake = Math.max(screenShake, 14); }
    if (t === 100) { CinFX.flash('#ffffff', 0.30, 10); screenShake = Math.max(screenShake, 20); }
    if (t === 125) { CinFX.flash('#8844ff', 0.18, 6); }

    if (t >= dur + 10) {
      sc.phase = 'kernelFlight';
      sc.timer = 0;
      _tfeAuraParticles = [];
    }
  }

// Sovereign arrives, takes the kernel (Axiom's compressed identity) once his defenses collapse, then leaves.
  else if (sc.phase === 'kernelFlight') {
    if (t === 1) {
      sc._kfX    = sc.auraX;
      sc._kfY    = sc.auraY;
      sc._kfVy   = 0;
      sc._kfLine = 0;
      sc._kfLineTimer = 0;
      sc._kfAlpha = 1;
      // Sovereign: starts above the viewport, descends fast
      sc._sovX     = sc.auraX;
      sc._sovY     = -60;
      sc._sovVY    = 18;
      sc._sovAlpha = 0;
      sc._sovPhase = 'descend'; // 'descend' | 'hold' | 'ascend' | 'gone'
    }

    if (sc._sovPhase === 'descend') {
      sc._sovAlpha = Math.min(1, sc._sovAlpha + 0.08);
      sc._sovY    += sc._sovVY;
      sc._sovVY   *= 0.82; // decelerate into position
      if (t >= 25) {
        sc._sovPhase = 'hold';
        sc._sovY     = sc._kfY - 30; // hover just above kernel position
        sc._kfAlpha  = 0;            // kernel taken: vanishes instantly
        CinFX.flash('#ffffff', 0.65, 10);
        CinFX.shake(36);
      }
    }

    else if (sc._sovPhase === 'hold') {
      if (t >= 45) {
        sc._sovPhase = 'ascend';
        sc._sovVY    = -22; // fast upward exit
      }
    }

    else if (sc._sovPhase === 'ascend') {
      sc._sovY    += sc._sovVY;
      sc._sovVY   *= 1.14; // accelerate out
      sc._sovAlpha = Math.max(0, sc._sovAlpha - 0.07);
      if (sc._sovAlpha <= 0) sc._sovPhase = 'gone';
    }

    const _kfDialogue = [
      { speaker: 'KAEL', text: 'He stopped.', side: 'left' },
      { speaker: '',     text: 'For a moment, Axiom was there.', side: 'right' },
      { speaker: '',     text: 'Sovereign arrived in the same instant.', side: 'right' },
      { speaker: 'KAEL', text: 'It took him before he could do anything with it.', side: 'left' },
      { speaker: '',     text: 'The outer form stayed behind.', side: 'right' },
    ];

    if (t > 60) {
      sc._kfLineTimer++;
      const line     = _kfDialogue[sc._kfLine];
      const holdTime = line ? 58 + line.text.length * 2 : 70;
      if (sc._kfLineTimer >= holdTime) {
        sc._kfLineTimer = 0;
        sc._kfLine++;
      }
    }

    if (t > 60 + _kfDialogue.length * 70 + 30) {
      sc.phase = 'powers';
      sc.timer = 0;
      sc.hero._tfAuraGlow = true;
      if (typeof setAccountFlag === 'function') {
        setAccountFlag(['unlocks', 'patrolMode'],  true);
        setAccountFlag(['unlocks', 'interTravel'], true);
      }
      if (settings.experimental3D) localStorage.setItem('smc_view3D', '1');
      _tfeCamFocus(sc.hero.cx(), sc.hero.cy(), 1.5);
      sc.skippable = true;
    }
  }

  else if (sc.phase === 'powers') {
    sc.powersAlpha = t < 30 ? t/30 : t < 200 ? 1 : Math.max(0, 1 - (t-200)/40);
    if (t >= 260) {
      sc.phase = 'fall';
      sc.timer = 0;
      sc.skippable = false;
      sc.heroFallAlpha = 1;
      _tfeCamFocus(sc.hero.cx(), sc.hero.cy(), 1.8);
    }
  }

  else if (sc.phase === 'fall') {
    sc.hero.vy += 1.2;
    sc.hero.x  += sc.hero.vx;
    sc.hero.y  += sc.hero.vy;
    sc.heroFallAlpha = Math.max(0, 1 - t / 80);
    if (t >= 90) {
      sc.phase = 'fadeout';
      sc.timer = 0;
    }
  }

  else if (sc.phase === 'fadeout') {
    sc.heroFallAlpha = 0;
    if (t >= 80) {
      tfEndingScene = null;
      if (typeof cinematicCamOverride !== 'undefined') cinematicCamOverride = false;
      if (sc.isIntro) {
        _tfeResumeAfterIntro(sc);
      } else {
        _tfeUnlockPatrolMode();
        if (typeof activateParadoxCompanion === 'function') activateParadoxCompanion();
        // TF is left alive/invincible for the ending, so endGame can't see a 0-HP boss: award here
        if (typeof unlockAchievement === 'function' && !players.some(p => !p.isBoss && p.weapon && p.weapon._isCustom)) unlockAchievement('true_form');
        endGame();
      }
    }
  }
}

// Resume after the round-1 punch sequence: round 2 starts, the player fused with Paradox.
function _tfeResumeAfterIntro(sc) {
  // Advance state machine to backstage, from here normal death/ending logic is allowed
  if (typeof tfCinematicState !== 'undefined') tfCinematicState = 'backstage';

  if (sc.boss) {
    sc.boss.backstageHiding = false;
    sc.boss.vx = 0;
    sc.boss.vy = 0;
  }

  // Restore hero: player keeps the gauntlet (fists) after absorbing Paradox.
  // Paradox's power is expressed through raw combat, not weapons.
  if (sc.hero) {
    sc.hero.backstageHiding = false;
    sc.hero.invincible      = Math.max(sc.hero.invincible, 60);
    // Switch to gauntlet (fists): the player fights bare-handed from here on.
    if (typeof WEAPONS !== 'undefined' && WEAPONS['gauntlet']) {
      sc.hero.weapon = WEAPONS['gauntlet'];
    }
    sc.hero.vx = 0;
    sc.hero.vy = 0;
  }

  // Round 2 is a short fused finale from 30% HP. It used to be a second 10000-HP fight behind a
  // fake death (triggerFalseVictory, now unused here).
  if (typeof tfFalseVictoryFired !== 'undefined') tfFalseVictoryFired = true;
  if (sc.boss) {
    sc.boss.health     = Math.round(sc.boss.maxHealth * 0.30);
    sc.boss.invincible = 90;
    sc.boss._tfEndingPrimed = false;  // round 2's real ending fires at 10% HP
    // Round 1's checkpoints never replay in round 2, whatever order HP fell in.
    if (sc.boss._cinematicFired) for (const k of ['entry', '50', 'paradox1000']) sc.boss._cinematicFired.add(k);
  }
  if (typeof tfFinalStateActive !== 'undefined') tfFinalStateActive = true;
  // The absorption left the world frozen; the false victory used to release it at its own end.
  gameFrozen  = false;
  isCinematic = false;
  if (typeof clearCombatLock === 'function') clearCombatLock('cinematic');
  if (typeof tfParadoxFused !== 'undefined') {
    tfParadoxFused      = true;
    tfFusionControlMode = 'player';
    if (typeof controlState !== 'undefined') controlState = 'player';
    if (typeof controlTimer !== 'undefined') controlTimer = 0;
  }

  screenShake = Math.max(screenShake, 35);
  if (typeof CinFX !== 'undefined') CinFX.flash('#ffffff', 0.5, 14);

// Round 2 stays in normal space. The Z-axis depth phase (tfDepthPhaseActive, set3DView, Z attacks)
// is kept intact but dormant, reserved for the apex fight. A fracture jolt marks the reset.
  if (typeof setCameraDrama === 'function') setCameraDrama('focus', 90, null, 1.08);
  if (typeof cinScreenFlash !== 'undefined')
    cinScreenFlash = { color: '#440088', alpha: 0.4, timer: 16, maxTimer: 16 };
  screenShake = Math.max(screenShake, 20);
  spawnParticles(GAME_W * 0.5, GAME_H * 0.5, '#aa66ff', 28);
  spawnParticles(GAME_W * 0.5, GAME_H * 0.5, '#000000', 18);

  gameRunning = true;
// No requestAnimationFrame here: the main loop already drives updateTFEnding, and queuing
// another chain ran the game twice per frame.
}

function _tfeUnlockPatrolMode() {
  const pm = document.getElementById('modePatrol');
  if (pm) { pm.style.display = ''; pm.classList.add('tf-unlocked'); }
  const m3d = document.getElementById('mode3D');
  if (m3d) { m3d.style.display = ''; }
}

function trySkipTFEnding() {
  const sc = tfEndingScene;
  if (!sc || !sc.skippable) return false;
  sc.phase = 'fadeout';
  sc.timer = 0;
  sc.heroFallAlpha = 1;
  _tfeAuraParticles = [];
  if (typeof cinematicCamOverride !== 'undefined') cinematicCamOverride = false;
  return true;
}

