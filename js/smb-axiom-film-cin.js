'use strict';
// smb-axiom-film-cin.js: the Cosmic Axiom's mid-fight cinematics staged shot by shot. ?nofilmcin plays the older versions.
// He draws himself and takes no poses, so the staging is his position, the camera and what happens to Kael.
// Depends at call time on smb-creator-rage-cin.js (_crStage, _crBlow, _crArc, _CR_KNEEL_BLADE).

// 50%: he changes one setting. Kael leaves the floor, hangs upside down, and is let go.
function _makeAxiomRealityFilm(tf) {
  const st = _crStage(tf, 'menace', 'guard');
  const hero = st.hero;
  let F = -1, up = 0;
  const COL = '#8844ff';
  const inverted = () => Object.assign({}, CIN_PERF_POSES.flail, { rot: Math.PI });
  return {
    durationFrames: 282,
    update() {
      if (!tf || tf.health <= 0 || !hero || hero.health <= 0) return;
      F++;
      st.tick(F);
      if (F === 0) {
        st.begin();
        CinCam.snap(tf.cx(), tf.cy() - 8, 2.2);
      }
      if (F === 24) {
        st.both(1.45, true);
        if (typeof showBossDialogue === 'function') showBossDialogue('Reality is a setting.', 46);
      }
      if (F === 71) {
        // The real gravity flip, at the moment the older version made it.
        if (typeof tfGravityInverted !== 'undefined') { tfGravityInverted = true; tfGravityTimer = 240; }
        _crBlow(hero.cx(), hero.cy(), false, COL);
        st.heroAct.go('flail', 6, 'outExpo');
        CinCam.snap(hero.cx(), st.fy - 80, 1.8);
      }
      // Off the floor and over. The camera goes up with him.
      if (F > 71 && F <= 128) {
        const u = (F - 71) / 57;
        up = 150 * (1 - (1 - u) * (1 - u));
        hero.y = st.fy - hero.h - up;
        CinCam.setFocus(hero.cx(), hero.cy() + 14, 1.8);
      }
      if (F === 96) st.heroAct.go(inverted(), 26, 'inOutQuad');
      if (F === 104) {
        CinCam.setFocus(hero.cx(), hero.cy(), 1.8);
        if (typeof showBossDialogue === 'function') showBossDialogue('I adjusted it.', 60);
      }
      if (F === 165) {
        if (typeof tfBlackHoles !== 'undefined') {
          tfBlackHoles.push({ x: GAME_W / 2, y: GAME_H / 2 - 40, radius: 0, maxRadius: 45, timer: 360, pullStrength: 0.6, phase: 'grow' });
        }
        screenShake = Math.max(screenShake, 14);
        st.both(1.2, true);
      }
      if (F === 201) {
        CinCam.snap(tf.cx(), tf.cy() - 8, 2.1);
        if (typeof showBossDialogue === 'function') showBossDialogue('Hold yourself together if you can.', 56);
      }
      // Let go. He drops back onto the floor and is still on his feet.
      if (F === 256) {
        st.heroAct.go('flail', 6, 'outQuad');
        st.both(1.25, true);
      }
      if (F > 256 && F <= 268) {
        const u = (F - 256) / 12;
        hero.y = st.fy - hero.h - up * (1 - u * u);
      }
      if (F === 268) {
        hero.y = st.fy - hero.h;
        st.heroAct.go('brace', 5, 'outExpo');
        spawnParticles(hero.cx(), st.fy, '#ffffff', 12);
        screenShake = Math.max(screenShake, 18);
      }
    },
    onEnd() { st.finish(); },
  };
}

// Form II: he opens up and the blast is the first thing that actually moves Kael.
function _makeAxiomPhase2Film(tf) {
  const st = _crStage(tf, 'menace', 'guard');
  const hero = st.hero;
  let F = -1, x0 = 0;
  return {
    durationFrames: 150,
    update() {
      if (!tf || tf.health <= 0 || !hero || hero.health <= 0) return;
      F++;
      st.tick(F);
      if (F === 0) {
        st.begin();
        CinCam.snap(tf.cx(), tf.cy() - 8, 2.3);
        st.heroAct.go('brace', 26, 'inOutQuad');
      }
      if (F === 38) {
        _crBlow(tf.cx(), tf.cy(), true, '#ffffff');
        x0 = hero.cx();
        st.heroAct.go('stagger', 5, 'outExpo');
        st.both(1.45, true);
      }
      if (F > 38 && F <= 60) _crArc(st, F, 38, 60, x0, x0 - st.dir * 60, 24);
      if (F === 60) st.heroAct.go('brace', 8, 'outQuad');
      if (F === 68) {
        CinCam.snap(tf.cx(), tf.cy() - 8, 2.1);
        if (typeof showBossDialogue === 'function') showBossDialogue("You're still breathing. I'll correct that.", 70);
      }
      if (F === 128) { st.heroAct.go('guard', 14, 'inOutQuad'); st.both(1.2, true); }
    },
    onEnd() { st.finish(); },
  };
}

// Final form: silence, then everything. Kael is thrown the width of the stage and lands on one knee.
function _makeAxiomPhase3Film(tf) {
  const st = _crStage(tf, 'menace', 'guard');
  const hero = st.hero;
  let F = -1, x0 = 0, x1 = 0;
  return {
    durationFrames: 210,
    update() {
      if (!tf || tf.health <= 0 || !hero || hero.health <= 0) return;
      F++;
      st.tick(F);
      if (F === 0) {
        st.begin();
        CinCam.snap(tf.cx(), tf.cy() - 8, 1.9);
      }
      if (F < 34) CinCam.setFocus(tf.cx(), tf.cy() - 8, 1.9 + F * 0.018);
      if (F === 12) st.heroAct.go('brace', 16, 'inOutQuad');
      if (F === 34) {
        _crBlow(tf.cx(), tf.cy(), true, '#ffffff');
        CinFX.shockwave(tf.cx(), tf.cy(), '#8844ff', { count: 2, maxR: 240, lw: 2, dur: 40 });
        x0 = hero.cx(); x1 = x0 - st.dir * 170;
        st.heroAct.go('flail', 4, 'outExpo');
        st.both(1.2, true);
      }
      if (F > 34 && F <= 76) {
        _crArc(st, F, 34, 76, x0, x1, 78);
        CinCam.setFocus((tf.cx() + hero.cx()) / 2, (tf.cy() + hero.cy()) / 2 - 10, 1.15);
      }
      if (F === 76) {
        st.heroAct.go(_CR_KNEEL_BLADE(), 6, 'outExpo');
        spawnParticles(hero.cx(), st.fy, '#ffffff', 16);
        screenShake = Math.max(screenShake, 20);
        CinCam.snap(hero.cx(), st.fy - 44, 2.0);
      }
      if (F === 100) {
        CinCam.snap(tf.cx(), tf.cy() - 8, 2.2);
        if (typeof showBossDialogue === 'function') showBossDialogue('No more fractions. All of it.', 84);
      }
      if (F === 186) {
        st.heroAct.go('guard', 16, 'inOutQuad');
        st.both(1.15, true);
      }
    },
    onEnd() { st.finish(); },
  };
}
