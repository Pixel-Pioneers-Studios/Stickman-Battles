'use strict';
// smb-paradox-return-cin.js: TF kicks Paradox out + Paradox return-1000 cinematics
// Depends on: smb-globals.js, smb-paradox-class.js.

// TF kicks Paradox out after the opening 1000-damage threshold.
// Ends with tfCinematicState = 'none' so the fight resumes.
function _makeTFKicksParadoxOutCinematic(tf) {
  return {
    durationFrames:   186,  // 3.1 s: Paradox is gone by ~2.2 s
    _teleportFired:   false,
    _windupFired:     false,
    _launchFired:     false,
    _phaseLabel: { text: '— ENOUGH —', color: '#ffffff' },

    update(t) {
      if      (t < 0.2) slowMotion = Math.max(0.05, 1 - t * 4.75);
      else if (t > 2.3) slowMotion = Math.min(1.0,  (t - 2.3) / 0.8);
      else              slowMotion = 0.05;

      cinematicCamOverride = t < 3.0;
      if (cinematicCamOverride) {
        cinematicZoomTarget = 1.6;
        const px = paradoxEntity ? paradoxEntity.cx() : GAME_W / 2;
        cinematicFocusX = px;
        cinematicFocusY = GAME_H / 2 - 20;
      }

      // 0.5 s: TF teleports directly behind Paradox
      if (t >= 0.5 && !this._teleportFired) {
        this._teleportFired = true;
        if (tf && paradoxEntity) {
          spawnParticles(tf.cx(), tf.cy(), '#000000', 20);
          spawnParticles(tf.cx(), tf.cy(), '#ffffff', 12);
          const behindX = paradoxEntity.cx() - paradoxEntity.facing * 24 - tf.w / 2;
          tf.x = Math.max(10, Math.min(GAME_W - tf.w - 10, behindX));
          tf.y = paradoxEntity.y;
          tf.vx = 0; tf.vy = 0;
          tf.facing = paradoxEntity.facing;
          spawnParticles(tf.cx(), tf.cy(), '#000000', 20);
          spawnParticles(tf.cx(), tf.cy(), '#ffffff', 12);
          screenShake = Math.max(screenShake, 18);
        }
        if (typeof showBossDialogue === 'function') showBossDialogue("I've seen enough.", 220);
      }

      // 1.2 s: TF winds up punch
      if (t >= 1.2 && !this._windupFired) {
        this._windupFired = true;
        if (tf) { tf.attackTimer = 22; tf.attackDuration = 22; }
        screenShake = Math.max(screenShake, 10);
      }

      // 1.8 s: TF punches Paradox off-stage
      if (t >= 1.8 && !this._launchFired) {
        this._launchFired = true;
        if (paradoxEntity) {
          const launchDir = paradoxEntity.facing;
          spawnParticles(paradoxEntity.cx(), paradoxEntity.cy(), '#00ffff', 45);
          spawnParticles(paradoxEntity.cx(), paradoxEntity.cy(), '#ffffff', 22);
          paradoxEntity._launchVx = launchDir * 28;
          paradoxEntity._launchVy = -16;
        }
        if (typeof CinFX !== 'undefined') CinFX.flash('#ffffff', 0.7, 18);
        screenShake = Math.max(screenShake, 48);
        if (typeof showBossDialogue === 'function')
          showBossDialogue('You are not needed here.', 280);
      }

      // Fly Paradox off-screen after launch
      if (this._launchFired && paradoxEntity && paradoxEntity._launchVx !== undefined) {
        paradoxEntity.x  += paradoxEntity._launchVx;
        paradoxEntity.y  += paradoxEntity._launchVy;
        paradoxEntity._launchVy += 0.5;
        paradoxEntity.alpha = Math.max(0, paradoxEntity.alpha - 0.04);
        if (paradoxEntity.alpha <= 0) paradoxEntity.done = true;
      } else if (paradoxEntity) {
        paradoxEntity.update();
      }
    },

    onEnd() {
      slowMotion           = 1.0;
      cinematicCamOverride = false;
      paradoxEntity        = null;
      tfCinematicState     = 'none';
      if (tf) {
        tf.x = Math.max(40, Math.min(GAME_W - tf.w - 40, tf.x));
        tf.y = GAME_H - 200;
        tf.vy = 0; tf.vx = 0;
        tf.invincible      = 60;
        tf.postSpecialPause = 3;
      }
    }
  };
}

// Paradox return at 10% HP (startTFParadoxReturn1000). Staged shot by shot: Paradox tears back in,
// the two of them land three hits, the Axiom catches the fourth, kicks Kael away, and burns Paradox
// out with a point-blank burst. Paradox crawls to Kael and hands over what is left (absorption).
// Bodies are posed (CinRig): Kael through a CinPerf performance, Paradox through its `pose` field.

function _retFloorY() {
  const fl = currentArena && currentArena.platforms && currentArena.platforms.find(p => p.isFloor && !p.isFloorDisabled);
  return fl ? fl.y : GAME_H - 72;
}

function startTFParadoxReturn1000(tf) {
  tfCinematicState = 'paradox_death'; // reuse state to suppress normal AI
  if (tf) tf.invincible = 9999;
  const hero = typeof players !== 'undefined' ? players.find(p => !p.isBoss) : null;
  const fy = _retFloorY();
  // Staged clear of the two low platforms (x 205-315 and 585-695 at y 378), which would cut across heads.
  if (tf)   { tf.x = 470 - tf.w / 2;   tf.y = fy - tf.h;   tf.vx = 0; tf.vy = 0; tf.facing = -1; }
  if (hero) { hero.x = 160 - hero.w / 2; hero.y = fy - hero.h; hero.vx = 0; hero.vy = 0; hero.facing = 1;
              hero.invincible = Math.max(hero.invincible || 0, 9999); }
  hitStopFrames = 0;
  if (typeof startCinematic === 'function') startCinematic(_makeTFParadoxReturn1000Cinematic(tf));
}

// A posed actor: blends from its current pose to a named or literal pose over n frames.
function _retActor(start) {
  const L = CIN_PERF_POSES;
  const res = p => (typeof p === 'string' ? L[p] : p) || L.stand;
  return {
    from: res(start), to: res(start), t: 0, n: 1, ease: null,
    go(pose, n, ease) { this.from = this.now(); this.to = res(pose); this.t = 0; this.n = Math.max(1, n || 1); this.ease = ease || 'outCubic'; },
    tick() { if (this.t < this.n) this.t++; },
    now() {
      let u = Math.min(1, this.t / this.n);
      if (typeof animEase !== 'undefined' && animEase[this.ease]) u = animEase[this.ease](u);
      return cinLerpPose(this.from, this.to, u);
    },
  };
}

// Where a pose's right hand sits relative to the feet anchor, at the figure scale both actors use.
function _retHand(pose, facing) {
  const p = Object.assign({}, typeof pose === 'string' ? CIN_PERF_POSES[pose] : pose,
    { x: 0, y: 0, facing, scale: 0.9, headScale: 0.77 });
  const J = CinRig.joints(p);
  return { x: J.rHand.x, y: J.rHand.y };
}

function _makeTFParadoxReturn1000Cinematic(tf) {
  const hero = typeof players !== 'undefined' ? players.find(p => !p.isBoss) : null;
  const fy   = _retFloorY();
  const kael = _retActor('hunch');
  const pdx  = _retActor('menace');
  let rec = null;
  const subs = [];   // { who, text, color, from, to } in frames
  const say = (F, who, text, color, len) => subs.push({ who, text, color, from: F, to: F + (len || 120) });
  let F = -1;

  // Kael and Paradox fight with the same body proportions, so one helper places either so that its
  // right hand lands on (x, y).
  const placePdxHand = (pose, x, y) => {
    const h = _retHand(pose, paradoxEntity.facing);
    paradoxEntity.x = x - h.x - paradoxEntity.w / 2;
    paradoxEntity.y = y - h.y - paradoxEntity.h;
  };
  const placeHeroHand = (pose, x, y) => {
    const h = _retHand(pose, hero.facing);
    hero.x = x - h.x - hero.w / 2;
    hero.y = Math.min(fy - hero.h, y - h.y - hero.h);
  };
  const tfChest = () => ({ x: tf.cx() - tf.facing * 6, y: tf.y + tf.h * 0.38 });
  const hit = (x, y, color, big) => {
    CinFX.shockwave(x, y, color, { count: big ? 2 : 1, maxR: big ? 110 : 70, lw: big ? 3 : 2, dur: big ? 24 : 16 });
    CinFX.speedLines(x, y, '#ffffff', { count: 18, maxLen: big ? 220 : 140, dur: 10 });
    spawnParticles(x, y, color, big ? 30 : 16);
    spawnParticles(x, y, '#ffffff', big ? 14 : 8);
    screenShake = Math.max(screenShake, big ? 30 : 16);
    if (typeof SoundManager !== 'undefined' && SoundManager.heavyHit) SoundManager.heavyHit();
  };
  const tfPunch = (mode, atkP, dir) => {
    tf.state = 'attacking'; tf._attackMode = mode; tf.facing = dir;
    tf.attackDuration = 20; tf.attackTimer = Math.round(20 * (1 - atkP));
  };
  const tfIdle = () => { tf.state = 'idle'; tf.attackTimer = 0; tf.ragdollTimer = 0; };

  return {
    durationFrames: 640,

    update(t) {
      if (!tf || !hero) return;
      F++;
      kael.tick(); pdx.tick();
      if (F === 0) {
        rec = CinPerf.begin(hero, 'cutscene', { frames: 9999, bound: true, glow: false, noWeapon: true,
          track: { sample: () => kael.now() }, exprs: [{ at: 0, expr: 'hurt' }] });
        tfIdle();
        slowMotion = 0.35;
        CinCam.snap(tf.cx(), tf.y + 26, 2.1);
        say(10, 'COSMIC AXIOM', 'Not yet. Not to you.', '#c9a6ff', 80);
      }
      if (rec) { rec.frame = F; }

      // S2: the tear opens behind Kael and Paradox steps through.
      if (F === 52) {
        CinCam.snap(hero.cx() - 40, fy - 70, 1.55);
        slowMotion = 1;
        const rx = hero.cx() - 90;
        spawnParadox(rx - 17, fy - 84);
        paradoxEntity.facing = 1; paradoxEntity.alpha = 0; paradoxEntity.pose = null;
        paradoxEntity.fx.push({ type: 'rift', x: rx, y: fy - 55, h: 120, w: 16, life: 110, max: 110 });
        screenShake = Math.max(screenShake, 10);
      }
      // The main loop ticks paradoxEntity (updateParadox); the cinematic only poses it.
      if (paradoxEntity && F >= 52) paradoxEntity.pose = pdx.now();
      if (F === 62) { pdx.go('menace', 1); spawnParticles(paradoxEntity.cx(), paradoxEntity.cy(), '#00ffff', 24); }
      if (F === 74) say(F, 'PARADOX', "I'm not finished.", '#7ff', 80);
      if (F === 78) { kael.go('lookUp', 14); rec.exprs = [{ at: 0, expr: 'neutral' }]; }

      // S3: two-shot, both drop into the run. The hold is the beat.
      if (F === 102) {
        CinCam.snap((hero.cx() + paradoxEntity.cx()) / 2, fy - 50, 1.9);
        kael.go('charge', 8, 'outBack'); pdx.go('charge', 8, 'outBack');
        rec.exprs = [{ at: 0, expr: 'intense' }];
      }

      // S4: the rush. Paradox hits first, Kael follows with the uppercut, Paradox drives him down.
      if (F === 122) {
        CinCam.setFocus((hero.cx() + tf.cx()) / 2, fy - 60, 1.35);
        pdx.go('thrust', 10, 'inCubic'); kael.go('coil', 10);
        CinFX.speedLines(paradoxEntity.cx(), paradoxEntity.cy(), '#00ffff', { count: 14, maxLen: 120, dur: 10, dir: Math.PI, spread: 0.6 });
        paradoxEntity._from = { x: paradoxEntity.x, y: paradoxEntity.y };
        hero._from = { x: hero.x, y: hero.y };
      }
      if (F > 122 && F <= 132) {
        const u = (F - 122) / 10, c = tfChest(), h = _retHand('thrust', 1);
        const tx = c.x - h.x - paradoxEntity.w / 2;
        paradoxEntity.x = paradoxEntity._from.x + (tx - paradoxEntity._from.x) * u * u;
        hero.x = hero._from.x + (c.x - 120 - hero.w / 2 - hero._from.x) * u;
      }
      if (F === 132) {
        const c = tfChest();
        placePdxHand('thrust', c.x, c.y);
        CinCam.snap(c.x - 20, c.y, 2.3);
        CinFX.impactFrame([tf, hero], { dur: 3, color: '#001018' });
        hit(c.x, c.y, '#00ffff', false);
        slowMotion = 0;
        tf.state = 'stunned';
      }
      if (F === 138) { slowMotion = 1; CinCam.setFocus(tf.cx() - 40, fy - 70, 1.6); }
      if (F > 138 && F <= 148) tf.x += 2.4;
      if (F === 140) kael.go('uppercut', 6, 'outCubic');
      if (F > 138 && F <= 146) { const c = tfChest(); placeHeroHand('coil', c.x - 30, c.y + 30); }
      if (F === 146) {
        const c = tfChest();
        placeHeroHand('uppercut', c.x - 2, c.y - 14);
        CinCam.snap(c.x - 10, c.y - 10, 2.2);
        CinFX.impactFrame([tf, hero], { dur: 3, color: '#000000' });
        hit(c.x, c.y - 14, '#ffffff', false);
        pdx.go('guard', 8);
        paradoxEntity.fx.push({ type: 'slash', x0: c.x - 20, y0: c.y + 30, x1: c.x + 10, y1: c.y - 50, bend: 0.4, life: 14, max: 14, color: '#ffffff' });
      }
      if (F > 146 && F <= 162) tf.y -= (162 - F) * 0.45;            // lifted off his feet
      if (F === 152) {
        CinCam.setFocus(tf.cx(), tf.y - 10, 1.4);
        paradoxEntity.noGravity = true; paradoxEntity.vy = 0;
        pdx.go('raise', 8); kael.go('brace', 10);
      }
      if (F > 152 && F <= 162) {
        paradoxEntity.x += (tf.cx() - 30 - paradoxEntity.x) * 0.25;
        paradoxEntity.y += (tf.y - 70 - paradoxEntity.y) * 0.3;
      }
      if (F === 163) { pdx.go('slam', 4, 'inCubic'); }
      if (F > 163 && F <= 170) {
        tf.y += (fy - tf.h - tf.y) * 0.5;
        paradoxEntity.y += (fy - paradoxEntity.h - paradoxEntity.y) * 0.45;
      }
      if (F === 170) {
        tf.y = fy - tf.h; paradoxEntity.y = fy - paradoxEntity.h; paradoxEntity.noGravity = false;
        tf.state = 'ragdoll'; tf.ragdollTimer = 45; tf.ragdollAngle = -1.35;
        CinCam.snap(tf.cx(), fy - 40, 1.25);
        hit(tf.cx(), fy - 10, '#00ffff', true);
        slowMotion = 0.6;
      }
      if (F > 170 && F < 205) tf.ragdollTimer = 45;

      // S5: he gets up slowly. Close on him.
      if (F === 186) { pdx.go('guard', 12); kael.go('guard', 12); }
      if (F >= 205 && F < 235) { tf.ragdollTimer = Math.max(0, 45 - (F - 205) * 1.6); if (tf.ragdollTimer <= 0) tfIdle(); }
      if (F === 214) { slowMotion = 0.25; CinCam.snap(tf.cx(), tf.y + 22, 2.4); }
      if (F === 222) say(F, 'COSMIC AXIOM', 'Two of you.', '#c9a6ff', 70);

      // S6: Paradox goes for the last hit; the Axiom catches it.
      if (F === 246) {
        tfIdle(); slowMotion = 1;
        CinCam.setFocus((paradoxEntity.cx() + tf.cx()) / 2, fy - 60, 1.5);
        pdx.go('thrust', 8, 'inCubic');
        paradoxEntity._from = { x: paradoxEntity.x };
      }
      if (F > 246 && F < 256) {
        const u = (F - 246) / 10;
        paradoxEntity.x = paradoxEntity._from.x + (tf.cx() - 150 - paradoxEntity._from.x) * u * u + u * 50;
      }
      if (F >= 254 && F < 300) tfPunch('punch', 0.5, -1);
      if (F === 256) {
        // Fist on fist: put Paradox's hand on the Axiom's extended fist.
        const fist = { x: tf.cx() - 62, y: tf.y + 31 };
        placePdxHand('thrust', fist.x, fist.y);
        CinCam.snap(fist.x, fist.y - 6, 2.6);
        slowMotion = 0;
        screenShake = Math.max(screenShake, 8);
        spawnParticles(fist.x, fist.y, '#ffffff', 10);
        say(F + 6, 'COSMIC AXIOM', 'Still not enough.', '#c9a6ff', 80);
      }

      // S7: Kael comes in; one kick sends him across the floor.
      if (F === 296) { slowMotion = 1; CinCam.setFocus(tf.cx() - 120, fy - 60, 1.3); kael.go('charge', 6); hero._from = { x: hero.x }; }
      if (F > 296 && F <= 306) hero.x = hero._from.x + (tf.cx() - 100 - hero._from.x) * ((F - 296) / 10);
      if (F >= 302 && F < 318) { tf.state = 'attacking'; tf._attackMode = 'kick'; tf.facing = -1; tf.attackDuration = 16; tf.attackTimer = Math.max(0, 318 - F); }
      if (F === 308) {
        hit(hero.cx() + 10, hero.cy(), '#c9a6ff', false);
        CinFX.impactFrame([tf, hero], { dur: 2, color: '#000000' });
        kael.go('flail', 4); rec.exprs = [{ at: 0, expr: 'hurt' }];
        hero._kv = -24;
      }
      if (F > 308 && hero._kv !== undefined) {
        hero.x += hero._kv; hero._kv *= 0.88;
        hero.x = Math.max(40, hero.x);
        if (F === 324) kael.go('brace', 8);
        if (Math.abs(hero._kv) < 0.4) hero._kv = undefined;
      }

      // S8: the burst. Background drops out, the beam goes through Paradox.
      if (F === 330) {
        CinCam.snap((paradoxEntity.cx() + tf.cx()) / 2, fy - 60, 1.8);
        CinFX.bgContrast('#000000', 0.88, 70);
        tfPunch('punch', 0.85, -1);
        say(F, 'COSMIC AXIOM', 'Be nothing.', '#c9a6ff', 60);
      }
      if (F === 342) {
        const x0 = tf.cx() - 30, y0 = tf.y + 30;
        paradoxEntity.fx.push({ type: 'beam', x0, y0, x1: x0 - 520, y1: y0, r: 26, life: 46, max: 46 });
        CinFX.impactFrame([tf], { dur: 4 });   // the kill: the one full white frame in this sequence
        screenShake = Math.max(screenShake, 40);
        pdx.go('flail', 5); paradoxEntity.expr = 'hurt';
        paradoxEntity.noGravity = true;
        if (typeof SoundManager !== 'undefined' && SoundManager.explosion) SoundManager.explosion();
      }
      if (F > 342 && F <= 380) { paradoxEntity.x = Math.max(70, paradoxEntity.x - 4.6); paradoxEntity.y = Math.min(fy - paradoxEntity.h, paradoxEntity.y + (F < 360 ? -0.6 : 2.2)); }
      if (F === 380) { paradoxEntity.noGravity = false; pdx.go('kneel', 10); tfIdle(); }

      // S9: Paradox on his knees next to Kael. Kael gets to him.
      if (F === 392) {
        kael.go('stand', 10); rec.exprs = [{ at: 0, expr: 'neutral' }];
        hero._from = { x: hero.x };
        CinCam.snap((hero.cx() + paradoxEntity.cx()) / 2, fy - 45, 2.0);
      }
      if (F > 392 && F <= 410) {
        const goal = paradoxEntity.cx() + 52 - hero.w / 2;
        hero.x = hero._from.x + (goal - hero._from.x) * ((F - 392) / 18);
        hero.facing = paradoxEntity.cx() > hero.cx() ? 1 : -1;
      }
      if (F === 412) { kael.go('kneel', 12); paradoxEntity.facing = hero.cx() < paradoxEntity.cx() ? -1 : 1; }
      if (F === 418) say(F, 'PARADOX', 'Take it. All of it.', '#7ff', 100);
      if (F === 470) {
        paradoxEntity.done = true;
        paradoxEntity.fx.push({ type: 'ring', x: hero.cx(), y: hero.cy(), r: 90, life: 40, max: 40, color: '#00ffff' });
      }
      if (F > 470 && F < 520 && settings.particles && paradoxEntity) {
        for (let i = 0; i < 3 && particles.length < MAX_PARTICLES; i++) {
          const _p = _getParticle();
          _p.x = paradoxEntity.cx() + (Math.random() - 0.5) * 24; _p.y = paradoxEntity.cy() + (Math.random() - 0.5) * 60;
          _p.vx = (hero.cx() - _p.x) / 22; _p.vy = (hero.cy() - _p.y) / 22;
          _p.color = Math.random() < 0.6 ? '#00ffff' : '#ffffff'; _p.size = 1.5 + Math.random() * 2.5;
          _p.life = 22; _p.maxLife = 22; particles.push(_p);
        }
      }
      // S10: it takes. Kael comes up lit, and the Axiom answers.
      if (F === 500) { kael.go('roar', 14, 'outBack'); rec.exprs = [{ at: 0, expr: 'angry' }]; CinCam.setFocus(hero.cx(), hero.cy() - 10, 1.9); }
      if (F === 508) {
        rec.color = '#7ffcff'; rec.glow = true;
        CinFX.shockwave(hero.cx(), hero.cy(), '#00ffff', { count: 2, maxR: 130, lw: 3, dur: 26 });
        CinFX.speedLines(hero.cx(), hero.cy(), '#bffcff', { count: 24, maxLen: 200, dur: 14 });
        spawnParticles(hero.cx(), hero.cy(), '#00ffff', 34);
        screenShake = Math.max(screenShake, 22);
      }
      if (F === 528) kael.go('guard', 12);
      if (F === 546) {
        CinCam.snap(tf.cx(), tf.y + 24, 2.3);
        say(F, 'COSMIC AXIOM', 'You took his power. Show me what it is worth.', '#c9a6ff', 92);
      }
    },

    draw(c, t) {
      const fr = Math.round(t * 60);
      const s = subs.filter(x => fr >= x.from && fr < x.to).pop();
      if (!s) return;
      const a = Math.min(1, (fr - s.from) / 8, (s.to - fr) / 12);
      const cw = c.canvas.width, ch = c.canvas.height;
      c.save();
      c.globalAlpha = Math.max(0, a);
      c.textAlign = 'center';
      c.font = `bold ${Math.round(ch * 0.018)}px Arial`;
      c.fillStyle = s.color;
      c.fillText(s.who, cw / 2, ch * 0.905);
      c.font = `italic ${Math.round(ch * 0.03)}px Arial`;
      c.fillStyle = '#f2f2f2';
      c.shadowColor = '#000'; c.shadowBlur = 6;
      c.fillText(s.text, cw / 2, ch * 0.95);
      c.restore();
    },

    onEnd() {
      slowMotion           = 1.0;
      cinematicCamOverride = false;
      if (hero) CinPerf.end(hero);
      if (tf) tfIdle();
      paradoxEntity        = null;
      _tfKCOverlay         = null;

      // Mark Paradox as dead: required by _startAbsorptionThenPunch guard
      paradoxDeathComplete = true;

      if (tf) {
        tf.invincible       = 60;
        tf.postSpecialPause = 3;
      }
      if (hero) {
        hero.y  = fy - hero.h;
        hero.vx = 0; hero.vy = 0;
        hero.invincible = 9999;
      }

      // Paradox's power went into Kael on screen, so round 2 starts here.
      playerParadoxAbsorbed = true;
      if (hero) hero.paradoxPowered = true;
      if (hero && tf && typeof _tfeResumeAfterIntro === 'function') _tfeResumeAfterIntro({ boss: tf, hero });
    }
  };
}
