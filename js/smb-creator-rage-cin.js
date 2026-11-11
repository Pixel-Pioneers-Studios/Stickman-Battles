'use strict';
// smb-creator-rage-cin.js: the Creator's 40% cinematic staged shot by shot, with every blow landing on the body it hits.
// ?nofilmcin plays the older version in _makeBossRage40Cinematic.
// Depends at call time on smb-paradox-return-cin.js (_retActor, _retFloorY, _retHand) and smb-cin-perf.js.

let CREATOR_RAGE_FILM = !(typeof location !== 'undefined' && /[?&]nofilmcin\b/.test(location.search));

function _makeCreatorRageFilm(boss) {
  const hero = players.filter(p => !p.isBoss && p.health > 0)
    .sort((a, b) => Math.abs(a.cx() - boss.cx()) - Math.abs(b.cx() - boss.cx()))[0] || null;
  const fy = _retFloorY();
  const bossAct = _retActor('menace'), heroAct = _retActor('guard');
  // Down on one knee with the blade out flat; the stock kneel points it through the floor.
  const kneelBlade = Object.assign({}, CIN_PERF_POSES.kneel, { rFore: 0.15 });
  let F = -1, recB = null, recH = null;
  // Set at frame 0: which way the throw goes, and where it starts and lands.
  let dir = 1, x0 = 0, xApex = 0, xLand = 0;
  const H = { x: 0, y: 0 };
  const chest = () => ({ x: hero.cx(), y: hero.y + hero.h * 0.38 });
  const putHero = (x, y) => { hero.x = x - hero.w / 2; hero.y = y - hero.h; };
  // Puts the boss's weapon hand exactly on a point, for the pose it is arriving at.
  const handTo = (pose, x, y) => {
    const h = _retHand(pose, boss.facing);
    boss.x = x - h.x - boss.w / 2;
    boss.y = Math.min(fy - boss.h, y - h.y - boss.h);
  };
  const blow = (x, y, big) => {
    CinFX.impactFrame([], { dur: big ? 4 : 3, color: '#000000' });
    CinFX.shockwave(x, y, '#ff0044', { count: big ? 3 : 1, maxR: big ? 150 : 80, lw: big ? 3 : 2, dur: big ? 30 : 16 });
    CinFX.speedLines(x, y, '#ffffff', { count: big ? 34 : 20, maxLen: big ? 320 : 170, dur: big ? 16 : 10 });
    spawnParticles(x, y, '#ff0044', big ? 44 : 18);
    spawnParticles(x, y, '#ffffff', big ? 20 : 8);
    screenShake = Math.max(screenShake, big ? 42 : 18);
    if (typeof SoundManager !== 'undefined' && SoundManager.heavyHit) SoundManager.heavyHit();
  };
  const blink = (e) => {
    spawnParticles(e.cx(), e.cy(), '#cc00ee', 26);
    spawnParticles(e.cx(), e.cy(), '#ff44ff', 12);
  };

  return {
    durationFrames: 300,

    update() {
      if (!boss || boss.health <= 0 || !hero || hero.health <= 0) return;
      F++;
      bossAct.tick(); heroAct.tick();

      if (F === 0) {
        // Clear of the walls, with room to be thrown across the stage.
        const cx = Math.max(170, Math.min(GAME_W - 170, hero.cx()));
        // He faces where the Creator stands, so the blow from behind sends him that way.
        dir = boss.cx() >= cx ? 1 : -1;
        x0 = cx; xApex = cx + dir * 96; xLand = cx + dir * 170;
        putHero(x0, fy);
        hero.facing = dir; hero.vx = hero.vy = 0;
        boss.vx = boss.vy = 0; boss.attackTimer = 0;
        hero.invincible = 0;
        recB = CinPerf.begin(boss, 'cutscene', { frames: 9999, bound: true, glow: false, signature: true,
          track: { sample: () => bossAct.now() }, exprs: [{ at: 0, expr: 'angry' }] });
        recH = CinPerf.begin(hero, 'cutscene', { frames: 9999, bound: true, glow: false,
          track: { sample: () => heroAct.now() }, exprs: [{ at: 0, expr: 'neutral' }] });
        CinCam.snap(boss.cx(), boss.y + boss.h * 0.3, 2.3);
        bossAct.go('coil', 26, 'inOutQuad');
        spawnParticles(boss.cx(), boss.cy(), '#ff0044', 16);
      }
      // A taunt from the frame the threshold was crossed would sit on top of the first shots.
      if (F < 4) bossDialogue.timer = 0;
      if (F === 0) bossPhaseFlash = 0;
      if (recB) recB.frame = F;
      if (recH) recH.frame = F;

      // He is gone. Kael looks at the place he was.
      if (F === 28) { blink(boss); boss.backstageHiding = true; CinCam.snap(hero.cx(), hero.y + hero.h * 0.3, 2.2); }

      // Behind him, already reaching. The palm lands between the shoulders.
      if (F === 46) {
        boss.backstageHiding = false;
        boss.facing = dir;
        const c = chest();
        handTo('windup', c.x - dir * 42, c.y);
        blink(boss);
        bossAct.go('windup', 1);
        CinCam.snap((boss.cx() + hero.cx()) / 2, fy - 62, 1.9);
      }
      if (F === 52) heroAct.go('brace', 8, 'outQuad');
      if (F === 56) bossAct.go('thrust', 6, 'inCubic');
      if (F === 62) {
        const c = chest();
        handTo('thrust', c.x - dir * 8, c.y);
        blow(c.x - dir * 8, c.y, false);
        heroAct.go('flail', 5, 'outExpo');
        slowMotion = 0.25;
      }

      // Up and out. A ballistic arc; the camera goes with him.
      if (F > 62 && F <= 96) {
        const u = (F - 62) / 34;
        putHero(x0 + (xApex - x0) * (1 - (1 - u) * (1 - u)), fy - 116 * (1 - (1 - u) * (1 - u)));
        CinCam.setFocus(hero.cx(), hero.cy() + 10, 1.7);
      }
      if (F === 80) { blink(boss); boss.backstageHiding = true; }

      // Above him before he stops rising. Straight down through the chest.
      if (F === 92) {
        boss.backstageHiding = false;
        boss.facing = dir;
        const c = chest();
        handTo('raise', c.x - dir * 12, c.y - 34);
        blink(boss);
        bossAct.go('raise', 1);
      }
      if (F === 98) bossAct.go('slam', 5, 'inCubic');
      if (F === 103) {
        slowMotion = 1;
        const c = chest();
        handTo('slam', c.x, c.y);
        blow(c.x, c.y, false);
        CinCam.snap(c.x, c.y, 2.1);
        H.x = hero.cx(); H.y = hero.y + hero.h;
        heroAct.go('flail', 3, 'outExpo');
      }

      // The floor stops him. The boss comes down after, on his own time.
      if (F > 103 && F <= 110) {
        const u = (F - 103) / 7;
        putHero(H.x + (xLand - H.x) * u, H.y + (fy - H.y) * u);
      }
      if (F === 110) {
        putHero(xLand, fy);
        blow(xLand, fy - 4, true);
        CinCam.snap(xLand, fy - 50, 1.6);
        heroAct.go(kneelBlade, 6, 'outExpo');
        hero.facing = -dir;
        if (typeof SoundManager !== 'undefined' && SoundManager.explosion) SoundManager.explosion();
      }
      if (F > 103 && F <= 134) {
        const u = (F - 103) / 31, bx = xLand - dir * 62;
        boss.x += (bx - boss.w / 2 - boss.x) * 0.16;
        boss.y = Math.min(fy - boss.h, boss.y + 2 + u * 9);
      }
      if (F === 134) {
        boss.x = xLand - dir * 62 - boss.w / 2; boss.y = fy - boss.h;
        spawnParticles(boss.cx(), fy, '#ff0044', 14);
        screenShake = Math.max(screenShake, 10);
        bossAct.go('menace', 14, 'inOutQuad');
      }

      // He stands over him and takes his time.
      if (F === 146) {
        CinCam.setFocus((boss.cx() + hero.cx()) / 2, fy - 62, 1.85);
        if (typeof showBossDialogue === 'function') showBossDialogue("I'm done being generous.", 130);
      }
      if (F === 214) {
        bossAct.go('gesture', 16, 'inOutQuad');
        CinCam.setFocus(boss.cx(), boss.y + boss.h * 0.35, 2.2);
        if (typeof showBossDialogue === 'function') showBossDialogue("You don't get to leave.", 110);
        spawnParticles(boss.cx(), boss.cy(), '#ff0044', 20);
      }
      if (F === 264) heroAct.go('hunch', 16, 'inOutQuad');
      if (F === 272) { bossAct.go('menace', 16, 'inOutQuad'); CinCam.setFocus((boss.cx() + hero.cx()) / 2, fy - 80, 1.25); }
      if (F === 282) heroAct.go('guard', 14, 'inOutQuad');
    },

    onEnd() {
      slowMotion = 1;
      cinematicCamOverride = false;
      if (boss) {
        CinPerf.end(boss);
        boss.backstageHiding = false;
        boss.vx = boss.vy = 0;
        if (boss.y > fy - boss.h) boss.y = fy - boss.h;
      }
      if (hero) {
        CinPerf.end(hero);
        hero.vx = hero.vy = 0;
        hero.invincible = Math.max(hero.invincible || 0, 45);
      }
    },
  };
}

// Shared by the Creator's 75% and 10% scenes: both fighters posed through a performance, the hero on the floor.
function _crStage(boss, bossPose, heroPose) {
  const hero = players.filter(p => !p.isBoss && p.health > 0)
    .sort((a, b) => Math.abs(a.cx() - boss.cx()) - Math.abs(b.cx() - boss.cx()))[0] || null;
  const st = {
    hero, fy: _retFloorY(), dir: 1, px: boss.x, py: boss.y, bossAct: _retActor(bossPose), heroAct: _retActor(heroPose), recB: null, recH: null,
    begin() {
      st.dir = boss.cx() >= hero.cx() ? 1 : -1;
      boss.vx = boss.vy = 0; boss.attackTimer = 0; boss.facing = -st.dir;
      hero.vx = hero.vy = 0; hero.facing = st.dir; hero.invincible = 0;
      hero.y = st.fy - hero.h;
      bossDialogue.timer = 0; bossPhaseFlash = 0;
      st.recB = CinPerf.begin(boss, 'cutscene', { frames: 9999, bound: true, glow: false, signature: true,
        track: { sample: () => st.bossAct.now() }, exprs: [{ at: 0, expr: 'angry' }] });
      st.recH = CinPerf.begin(hero, 'cutscene', { frames: 9999, bound: true, glow: false,
        track: { sample: () => st.heroAct.now() }, exprs: [{ at: 0, expr: 'neutral' }] });
    },
    tick(F) {
      // bossTeleport runs on a timer, so one queued before the scene can land during it. The scene moves him only a little per frame.
      if (F > 0 && Math.hypot(boss.x - st.px, boss.y - st.py) > 24) { boss.x = st.px; boss.y = st.py; }
      st.px = boss.x; st.py = boss.y;
      st.bossAct.tick(); st.heroAct.tick();
      if (F < 4) bossDialogue.timer = 0;
      if (st.recB) st.recB.frame = F;
      if (st.recH) st.recH.frame = F;
    },
    // Both in the shot, as close as the gap between them allows.
    both(maxZoom, snap) {
      const z = Math.min(maxZoom, 760 / (Math.abs(boss.cx() - hero.cx()) + 170));
      const x = (boss.cx() + hero.cx()) / 2, y = (boss.cy() + hero.cy()) / 2 - 12;
      if (snap) CinCam.snap(x, y, z); else CinCam.setFocus(x, y, z);
    },
    finish() {
      slowMotion = 1;
      cinematicCamOverride = false;
      CinPerf.end(boss);
      boss.vx = boss.vy = 0;
      if (boss.y > st.fy - boss.h) boss.y = st.fy - boss.h;
      if (hero) { CinPerf.end(hero); hero.vx = hero.vy = 0; hero.invincible = Math.max(hero.invincible || 0, 45); }
    },
  };
  return st;
}

function _crBlow(x, y, big, color) {
  CinFX.impactFrame([], { dur: big ? 4 : 3, color: '#000000' });
  CinFX.shockwave(x, y, color, { count: big ? 3 : 1, maxR: big ? 150 : 80, lw: big ? 3 : 2, dur: big ? 30 : 16 });
  CinFX.speedLines(x, y, '#ffffff', { count: big ? 34 : 20, maxLen: big ? 320 : 170, dur: big ? 16 : 10 });
  spawnParticles(x, y, color, big ? 44 : 18);
  spawnParticles(x, y, '#ffffff', big ? 20 : 8);
  screenShake = Math.max(screenShake, big ? 42 : 18);
  if (typeof SoundManager !== 'undefined' && SoundManager.heavyHit) SoundManager.heavyHit();
}

// 75%: he leaves the floor, opens his hands and the arena answers. Kael is pushed back by it, not struck.
function _makeCreatorWarnFilm(boss) {
  const st = _crStage(boss, 'menace', 'guard');
  const hero = st.hero;
  let F = -1, y0 = 0, yUp = 0, hx0 = 0;
  const COL = '#aa44ff';
  return {
    durationFrames: 240,
    update() {
      if (!boss || boss.health <= 0 || !hero || hero.health <= 0) return;
      F++;
      st.tick(F);
      if (F === 0) {
        st.begin();
        y0 = boss.y; yUp = st.fy - boss.h - 74;
        st.px = boss.x; st.py = boss.y;
        CinCam.snap(boss.cx(), boss.y + boss.h * 0.3, 2.2);
        st.bossAct.go('coil', 14, 'inOutQuad');
      }
      if (F === 20) {
        st.bossAct.go('float', 16, 'outQuad');
        CinFX.shockwave(boss.cx(), boss.y + boss.h, COL, { count: 2, maxR: 110, lw: 2, dur: 22 });
        spawnParticles(boss.cx(), boss.y + boss.h, COL, 22);
      }
      if (F >= 20 && F <= 58) {
        const u = (F - 20) / 38;
        boss.y = y0 + (yUp - y0) * (1 - (1 - u) * (1 - u));
      }
      if (F === 34) {
        st.both(1.5, true);
        if (typeof showBossDialogue === 'function') showBossDialogue('This world existed before you arrived.', 90);
      }
      if (F === 62) {
        st.bossAct.go('spread', 7, 'outExpo');
        _crBlow(boss.cx(), boss.cy(), true, COL);
        CinFX.arenaHazardNow();
        hx0 = hero.cx();
        st.heroAct.go('brace', 6, 'outExpo');
        CinCam.snap(hero.cx() - st.dir * 26, st.fy - 56, 2.0);
      }
      // Kael's feet plough back from the pressure.
      if (F > 62 && F <= 86) {
        const u = (F - 62) / 24;
        const x = Math.max(70, Math.min(GAME_W - 70, hx0 - st.dir * 38 * (1 - (1 - u) * (1 - u))));
        hero.x = x - hero.w / 2;
        if (F % 6 === 0) spawnParticles(hero.cx(), st.fy, '#ffffff', 4);
      }
      if (F === 112) {
        st.bossAct.go('gesture', 14, 'inOutQuad');
        CinCam.snap(boss.cx(), boss.y + boss.h * 0.32, 2.2);
        if (typeof showBossDialogue === 'function') showBossDialogue('I wrote the rules. I can revise them.', 90);
        spawnParticles(boss.cx(), boss.cy(), COL, 16);
      }
      if (F === 186) {
        st.bossAct.go('menace', 22, 'inOutQuad');
        st.heroAct.go('guard', 18, 'inOutQuad');
        st.both(1.25, true);
        y0 = boss.y;
      }
      if (F >= 186 && F <= 214) {
        const u = (F - 186) / 28;
        boss.y = y0 + (st.fy - boss.h - y0) * u * u;
        st.both(1.25, false);
      }
      if (F === 214) { spawnParticles(boss.cx(), st.fy, COL, 16); screenShake = Math.max(screenShake, 12); }
    },
    onEnd() { st.finish(); },
  };
}

// 10%: Kael's blow lands. He looks at it, and answers. Damage is never conceded, only escalated.
function _makeCreatorDespFilm(boss) {
  const st = _crStage(boss, 'menace', 'guard');
  const hero = st.hero;
  let F = -1, b0 = 0, h0 = 0, h1 = 0;
  const COL = '#ff8800';
  const chest = () => ({ x: boss.cx(), y: boss.y + boss.h * 0.38 });
  return {
    durationFrames: 262,
    update() {
      if (!boss || boss.health <= 0 || !hero || hero.health <= 0) return;
      F++;
      st.tick(F);
      if (F === 0) {
        st.begin();
        boss.y = st.fy - boss.h;
        // Room for him to be driven back.
        boss.x = Math.max(120, Math.min(GAME_W - 120, boss.cx())) - boss.w / 2;
        st.dir = boss.cx() >= hero.cx() ? 1 : -1;
        hero.facing = st.dir; boss.facing = -st.dir;
        const c = chest(), h = _retHand('thrust', hero.facing);
        // The blade's tip reaches the chest; any closer and it runs him through.
        hero.x = c.x - st.dir * 72 - h.x - hero.w / 2;
        st.heroAct.go('thrust', 1);
        st.bossAct.go('stagger', 3, 'outExpo');
        st.px = boss.x; st.py = boss.y;
        _crBlow(c.x, c.y, true, COL);
        slowMotion = 0.3;
        CinCam.snap(c.x - st.dir * 20, c.y, 2.3);
        b0 = boss.x;
      }
      if (F > 0 && F <= 26) {
        const u = F / 26;
        boss.x = b0 + st.dir * 44 * (1 - (1 - u) * (1 - u));
      }
      if (F === 28) { slowMotion = 1; st.heroAct.go('guard', 16, 'inOutQuad'); }
      // Desperation is the fight's real state change; the scene only times it.
      if (F === 34) {
        if (typeof bossDesperationMode !== 'undefined') bossDesperationMode = true;
        st.bossAct.go('hunch', 16, 'inOutQuad');
        CinCam.setFocus(boss.cx(), boss.y + boss.h * 0.35, 2.1);
      }
      if (F === 62) {
        if (typeof showBossDialogue === 'function') showBossDialogue("You're still here.", 62);
      }
      if (F === 112) { st.bossAct.go('coil', 12, 'inOutQuad'); CinCam.setFocus(boss.cx(), boss.cy(), 2.3); }
      if (F === 124) {
        st.bossAct.go('roar', 5, 'outExpo');
        _crBlow(boss.cx(), boss.cy(), true, COL);
        h0 = hero.cx();
        h1 = Math.max(70, Math.min(GAME_W - 70, h0 - st.dir * 60));
        st.heroAct.go('flail', 4, 'outExpo');
        st.both(1.55, true);
      }
      if (F > 124 && F <= 142) {
        const u = (F - 124) / 18;
        hero.x = h0 + (h1 - h0) * (1 - (1 - u) * (1 - u)) - hero.w / 2;
      }
      if (F === 142) st.heroAct.go('brace', 8, 'outQuad');
      if (F === 150) {
        CinCam.snap(boss.cx(), boss.y + boss.h * 0.32, 2.2);
        if (typeof showBossDialogue === 'function') showBossDialogue('Most things break. You will.', 84);
      }
      if (F >= 150 && F < 232 && F % 8 === 0) spawnParticles(boss.cx(), boss.cy(), COL, 7);
      if (F === 232) {
        st.bossAct.go('menace', 18, 'inOutQuad');
        st.heroAct.go('guard', 14, 'inOutQuad');
        st.both(1.2, true);
      }
    },
    onEnd() {
      if (typeof bossDesperationMode !== 'undefined') bossDesperationMode = true;
      st.finish();
    },
  };
}

// A staged scene needs a living hero and a floor to stand them on. With the floor down or hazardous the older version plays.
function _filmCinOk() {
  if (typeof CREATOR_RAGE_FILM === 'undefined' || !CREATOR_RAGE_FILM) return false;
  if (!players.some(p => !p.isBoss && p.health > 0)) return false;
  if (typeof bossFloorState !== 'undefined' && bossFloorState !== 'normal') return false;
  return !!(currentArena && currentArena.platforms && currentArena.platforms.some(p => p.isFloor && !p.isFloorDisabled));
}

// Throws the hero along a ballistic arc between two frames; called once per frame across that span.
function _crArc(st, F, f0, f1, x0, x1, height) {
  const u = Math.max(0, Math.min(1, (F - f0) / (f1 - f0)));
  const x = Math.max(70, Math.min(GAME_W - 70, x0 + (x1 - x0) * u));
  st.hero.x = x - st.hero.w / 2;
  st.hero.y = st.fy - st.hero.h - 4 * height * u * (1 - u);
}

const _CR_KNEEL_BLADE = () => Object.assign({}, CIN_PERF_POSES.kneel, { rFore: 0.15 });

// Phase 2: one fist into the floor, and Kael feels it from across the stage.
function _makeCreatorPhase2Film(boss) {
  const st = _crStage(boss, 'menace', 'guard');
  const hero = st.hero;
  let F = -1, x0 = 0;
  const COL = '#cc00ee';
  return {
    durationFrames: 150,
    update() {
      if (!boss || boss.health <= 0 || !hero || hero.health <= 0) return;
      F++;
      st.tick(F);
      if (F === 0) {
        st.begin();
        boss.y = st.fy - boss.h; st.py = boss.y;
        CinCam.snap(boss.cx(), boss.y + boss.h * 0.32, 2.2);
        st.bossAct.go('raise', 22, 'inOutQuad');
      }
      if (F === 30) st.bossAct.go('slam', 5, 'inCubic');
      if (F === 35) {
        _crBlow(boss.cx(), st.fy - 4, true, COL);
        x0 = hero.cx();
        st.heroAct.go('stagger', 5, 'outExpo');
        st.both(1.5, true);
      }
      if (F > 35 && F <= 56) _crArc(st, F, 35, 56, x0, x0 - st.dir * 56, 22);
      if (F === 56) st.heroAct.go('brace', 8, 'outQuad');
      if (F === 66) {
        st.bossAct.go('menace', 14, 'inOutQuad');
        CinCam.snap(boss.cx(), boss.y + boss.h * 0.32, 2.1);
        if (typeof showBossDialogue === 'function') showBossDialogue('I was being patient. That ends now.', 70);
      }
      if (F === 128) { st.heroAct.go('guard', 14, 'inOutQuad'); st.both(1.2, true); }
    },
    onEnd() { st.finish(); },
  };
}

// Phase 3: the same blow, without restraint. Kael is thrown off his feet and lands on one knee.
function _makeCreatorPhase3Film(boss) {
  const st = _crStage(boss, 'menace', 'guard');
  const hero = st.hero;
  let F = -1, x0 = 0, x1 = 0;
  const COL = '#ff44aa';
  return {
    durationFrames: 180,
    update() {
      if (!boss || boss.health <= 0 || !hero || hero.health <= 0) return;
      F++;
      st.tick(F);
      if (F === 0) {
        st.begin();
        boss.y = st.fy - boss.h; st.py = boss.y;
        CinCam.snap(boss.cx(), boss.y + boss.h * 0.3, 2.3);
        st.bossAct.go('coil', 20, 'inOutQuad');
      }
      if (F === 24) st.bossAct.go('raise', 7, 'outQuad');
      if (F === 33) {
        st.bossAct.go('slam', 4, 'inCubic');
        _crBlow(boss.cx(), boss.cy(), true, COL);
        x0 = hero.cx(); x1 = x0 - st.dir * 110;
        st.heroAct.go('flail', 4, 'outExpo');
        hero.facing = st.dir;
        st.both(1.4, true);
      }
      if (F > 33 && F <= 66) _crArc(st, F, 33, 66, x0, x1, 62);
      if (F === 66) {
        st.heroAct.go(_CR_KNEEL_BLADE(), 6, 'outExpo');
        spawnParticles(hero.cx(), st.fy, '#ffffff', 14);
        screenShake = Math.max(screenShake, 16);
        CinCam.snap(hero.cx(), st.fy - 44, 2.0);
      }
      if (F === 88) {
        st.bossAct.go('gesture', 14, 'inOutQuad');
        CinCam.snap(boss.cx(), boss.y + boss.h * 0.32, 2.2);
        if (typeof showBossDialogue === 'function') showBossDialogue('Now you see why I built this world.', 76);
      }
      if (F === 156) {
        st.bossAct.go('menace', 14, 'inOutQuad');
        st.heroAct.go('guard', 16, 'inOutQuad');
        st.both(1.2, true);
      }
    },
    onEnd() { st.finish(); },
  };
}
