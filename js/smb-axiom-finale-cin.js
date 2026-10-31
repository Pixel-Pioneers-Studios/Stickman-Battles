'use strict';
// smb-axiom-finale-cin.js: the Cosmic Axiom's death, staged shot by shot. Kael's three-hit finish
// breaks the outer form, which stays behind as an empty shell, and Axiom walks out of it with the
// kernel still inside him. Sovereign arrives above, marks the kernel and leaves without descending
// (it takes the kernel only later, after the God fight; see docs/canon.md). Hands over to 'powers'.
// Depends on smb-paradox-return-cin.js (_retActor, _retFloorY, _retHand) and smb-cin-perf.js.

function _makeTFFinaleCinematic(tf, hero) {
  const fy = _retFloorY();
  const kael = _retActor('guard');
  const sov  = _retActor('menace');
  let rec = null, F = -1;
  const subs = [];
  const say = (at, who, text, color, len) => subs.push({ who, text, color, from: at, to: at + (len || 110) });
  // World-space pieces this cinematic owns.
  const W = { cracks: 0, glow: 0, stars: [], husk: null, man: null, mark: null, sov: null };
  const tfChest = () => ({ x: tf.cx() - tf.facing * 6, y: tf.y + tf.h * 0.38 });
  const hit = (x, y, color, big) => {
    CinFX.shockwave(x, y, color, { count: big ? 2 : 1, maxR: big ? 120 : 70, lw: big ? 3 : 2, dur: big ? 26 : 16 });
    CinFX.speedLines(x, y, '#ffffff', { count: 18, maxLen: big ? 240 : 140, dur: 10 });
    spawnParticles(x, y, color, big ? 30 : 16);
    spawnParticles(x, y, '#ffffff', big ? 14 : 8);
    screenShake = Math.max(screenShake, big ? 30 : 16);
    if (typeof SoundManager !== 'undefined' && SoundManager.heavyHit) SoundManager.heavyHit();
  };
  const placeHeroHand = (pose, x, y) => {
    const h = _retHand(pose, hero.facing);
    hero.x = x - h.x - hero.w / 2;
    hero.y = Math.min(fy - hero.h, y - h.y - hero.h);
  };

  return {
    durationFrames: 500,

    update(t) {
      if (!tf || !hero) return;
      F++;
      kael.tick(); sov.tick();
      if (F === 0) {
        tf.health = Math.max(1, tf.health); tf.invincible = 999999; tf.backstageHiding = false;
        tf.x = 540 - tf.w / 2; tf.y = fy - tf.h; tf.facing = -1; tf.state = 'stunned'; tf.attackTimer = 0;
        hero.x = 400 - hero.w / 2; hero.y = fy - hero.h; hero.facing = 1; hero.backstageHiding = false;
        hero.invincible = 999999;
        rec = CinPerf.begin(hero, 'cutscene', { frames: 9999, bound: true, glow: true, noWeapon: true,
          color: '#7ffcff', track: { sample: () => kael.now() }, exprs: [{ at: 0, expr: 'intense' }] });
        slowMotion = 0.25;
        CinCam.snap(tf.cx(), tf.y + 26, 2.3);
      }
      if (rec) rec.frame = F;
      // He is coming apart from the inside before the last hits land.
      if (F < 140) W.cracks = Math.min(1, F / 40);

      if (F === 40) { slowMotion = 1; CinCam.snap((hero.cx() + tf.cx()) / 2, fy - 55, 1.7); kael.go('coil', 8, 'outBack'); }
      if (F === 56) { kael.go('thrust', 8, 'inCubic'); hero._from = { x: hero.x }; }
      if (F > 56 && F < 64) { const c = tfChest(), h = _retHand('thrust', 1); hero.x = hero._from.x + (c.x - h.x - hero.w / 2 - hero._from.x) * ((F - 56) / 8); }
      if (F === 64) {
        const c = tfChest(); placeHeroHand('thrust', c.x, c.y);
        CinCam.snap(c.x - 10, c.y, 2.4);
        CinFX.impactFrame([tf, hero], { dur: 3, color: '#000000' });
        hit(c.x, c.y, '#00ffff', false);
      }
      if (F > 64 && F <= 72) tf.x += 2;
      if (F === 74) { kael.go('windup', 6); CinCam.setFocus(tf.cx() - 30, fy - 60, 1.8); }
      if (F === 82) {
        kael.go('slam', 5, 'inCubic');
        const c = tfChest(); placeHeroHand('slam', c.x - 4, c.y + 6);
        CinFX.impactFrame([tf, hero], { dur: 3, color: '#000000' });
        hit(c.x, c.y + 6, '#ffffff', false);
      }
      if (F === 94) kael.go('coil', 8);
      if (F === 104) {
        kael.go('uppercut', 5, 'outCubic');
        const c = tfChest(); placeHeroHand('uppercut', c.x - 2, c.y - 12);
        CinCam.snap(c.x, c.y - 20, 2.2);
        CinFX.impactFrame([tf, hero], { dur: 4, color: '#000000' });
        hit(c.x, c.y - 12, '#00ffff', true);
        tf.state = 'stunned'; tf._vx = 5;
      }
      // He staggers back with the light coming through the cracks; Kael gives ground.
      if (F > 104 && F < 150) {
        tf.x += tf._vx; tf._vx *= 0.9; tf.state = 'stunned';
        W.glow = Math.min(1, (F - 104) / 40);
        if (F < 134) hero.x += (420 - hero.w / 2 - hero.x) * 0.12;
        if (F === 112) { kael.go('guard', 12); CinCam.setFocus((hero.cx() + tf.cx()) / 2, fy - 50, 1.6); }
      }

      // The outer form breaks. The one white frame in the finale. What burns off is corruption, not him.
      if (F === 150) {
        slowMotion = 0.3;
        const cx = tf.cx(), cy = tf.cy(), feet = tf.x + tf.w / 2;
        for (let i = 0; i < 70; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = 0.6 + Math.random() * 3.4;
          W.stars.push({ x: cx + Math.cos(a) * 6, y: cy + Math.sin(a) * 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                         s: 1 + Math.random() * 2.2, warm: Math.random() < 0.3, life: 110 + Math.random() * 70 });
        }
        W.husk = { x: feet, y: fy, facing: -1, fade: 0, act: _retActor('stagger') };
        W.husk.act.go('kneel', 34, 'outQuad');
        W.man = { x: feet, y: fy, facing: -1, alpha: 0, act: _retActor('kneel') };
        CinFX.impactFrame([hero], { dur: 4 });
        CinFX.shockwave(cx, cy, '#ffffff', { count: 2, maxR: 150, lw: 3, dur: 34 });
        tf.backstageHiding = true;
        W.cracks = 0; W.glow = 0;
        screenShake = Math.max(screenShake, 34);
        CinCam.snap(feet, fy - 60, 1.5);
        if (typeof SoundManager !== 'undefined' && SoundManager.explosion) SoundManager.explosion();
      }
      if (W.husk) { W.husk.act.tick(); W.husk.fade = Math.min(1, W.husk.fade + 1 / 70); if (F === 200) W.husk.act.go('slump', 40); }
      if (W.man) {
        W.man.act.tick();
        if (F > 158) W.man.alpha = Math.min(1, W.man.alpha + 1 / 30);
        if (F === 196) { slowMotion = 1; W.man.act.go('stagger', 22); }
        if (F === 220) W.man.act.go('stand', 26);
        if (F > 214 && F < 258) W.man.x -= 1.7;   // he steps out of the shell, toward Kael
      }
      if (F === 165) say(F, '', 'The outer form broke. Axiom stepped out of it.', '#b0b8d0', 110);
      for (const s of W.stars) { s.x += s.vx; s.y += s.vy; s.vx *= 0.985; s.vy *= 0.985; s.life--; }
      W.stars = W.stars.filter(s => s.life > 0);
      if (F === 230) { kael.go('stand', 16); CinCam.setFocus((hero.cx() + W.man.x) / 2, fy - 60, 1.7); }

      // Sovereign arrives above them, reads the room, marks where the kernel is now, and does not come down.
      if (F === 262) {
        W.sov = { x: W.man.x + 30, y: fy - 300, facing: -1, alpha: 1, trail: [] };
        sov.go('menace', 1);
        CinCam.setFocus((hero.cx() + W.man.x) / 2, fy - 130, 1.15);
        say(F, '', 'Sovereign arrived above them.', '#b0b8d0', 90);
      }
      if (W.sov && F > 262 && F <= 276) {
        W.sov.trail.push({ x: W.sov.x, y: W.sov.y });
        W.sov.y += (fy - 165 - W.sov.y) * 0.4;   // stops well short of the floor
      }
      if (F === 280) kael.go('lookUp', 14);
      if (F === 296) W.mark = 0;
      if (W.mark !== undefined && W.mark !== null) W.mark++;
      if (F === 320) { W.sov.facing = hero.cx() > W.sov.x ? 1 : -1; say(F, '', 'It looked at the kernel. Then at Kael. It did not come down.', '#b0b8d0', 120); }
      if (F === 380) { W.mark = null; sov.go('raise', 8); CinFX.speedLines(W.sov.x, W.sov.y - 40, '#ff4a4a', { count: 16, maxLen: 200, dur: 14, dir: -Math.PI / 2, spread: 0.5 }); }
      if (W.sov && F > 384) {
        W.sov.trail.push({ x: W.sov.x, y: W.sov.y });
        W.sov.y -= (F - 384) * 2.2;
        W.sov.alpha = Math.max(0, 1 - (F - 384) / 26);
      }
      if (W.sov) W.sov.trail = W.sov.trail.slice(-6);

      // Two people and an empty shell. Freed, and already weaker for it.
      if (F === 412) { kael.go('stand', 20); W.man.act.go('kneel', 30, 'inOutQuad'); CinCam.setFocus((hero.cx() + W.man.x) / 2, fy - 55, 1.8); rec.exprs = [{ at: 0, expr: 'neutral' }]; }
      if (F === 430) say(F, '', 'Diminished. Himself.', '#ffd27f', 90);
      if (F === 470) rec.glow = false;
    },

    drawWorld(c) {
      if (W.cracks > 0 && tf && !tf.backstageHiding) {
        // Fracture lines across his body: fixed per angle so they grow rather than flicker.
        const cx = tf.cx(), cy = tf.cy();
        c.strokeStyle = `rgba(235,220,255,${0.85 * W.cracks})`;
        c.shadowColor = '#c080ff'; c.shadowBlur = 10 + 16 * (W.glow || 0); c.lineWidth = 1.6 + 1.4 * (W.glow || 0);
        c.beginPath();
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + 0.3, len = (14 + (i * 7) % 18) * W.cracks;
          c.moveTo(cx, cy);
          c.lineTo(cx + Math.cos(a) * len * 0.6, cy + Math.sin(a) * len * 0.9 + 3);
          c.lineTo(cx + Math.cos(a + 0.25) * len, cy + Math.sin(a + 0.25) * len * 1.4);
        }
        c.stroke();
        c.shadowBlur = 0;
      }
      for (const s of W.stars) {
        c.globalAlpha = Math.min(1, s.life / 40);
        c.fillStyle = s.warm ? '#ffe2b8' : '#ffffff';
        c.fillRect(s.x, s.y, s.s, s.s);
      }
      c.globalAlpha = 1;
      const rig = (o, extra) => Object.assign({}, o.act.now(), { x: o.x, y: o.y, facing: o.facing, scale: 0.9, headScale: 0.77 }, extra || {});
      if (W.husk) {
        // The empty architecture stays in the arena: dark, its violet light going out.
        const g = 1 - W.husk.fade;
        CinRig.draw(c, rig(W.husk), '#3b2e63', { width: 5.4, alpha: 0.95, glow: '#8a5cff', glowBlur: 4 + 14 * g, expr: 'neutral', outline: 1.3, face: false });
      }
      if (W.man && W.man.alpha > 0) {
        const p = rig(W.man), J = CinRig.joints(p);
        CinRig.draw(c, p, '#ffd27f', { width: 4.4, alpha: W.man.alpha, glow: '#ffd27f', glowBlur: 8, expr: 'neutral', outline: 1.1 });
        // The kernel stays where it belongs, inside him.
        const kx = J.hip.x + (J.shoulder.x - J.hip.x) * 0.7, ky = J.hip.y + (J.shoulder.y - J.hip.y) * 0.7;
        const r = 7 * (1 + Math.sin(F * 0.3) * 0.2);
        c.globalCompositeOperation = 'lighter';
        const kg = c.createRadialGradient(kx, ky, 0, kx, ky, r);
        kg.addColorStop(0, `rgba(255,255,255,${W.man.alpha})`); kg.addColorStop(0.4, `rgba(200,150,255,${0.6 * W.man.alpha})`); kg.addColorStop(1, 'rgba(120,60,255,0)');
        c.fillStyle = kg; c.beginPath(); c.arc(kx, ky, r, 0, Math.PI * 2); c.fill();
        c.globalCompositeOperation = 'source-over';
        if (W.mark != null) {
          // Sovereign's four-arc mark settles on the kernel: filed, not taken.
          const m = Math.min(1, W.mark / 20), rr = 26 - 12 * m, rot = W.mark * 0.02;
          c.strokeStyle = `rgba(255,58,58,${0.8 * m})`; c.lineWidth = 1.5; c.shadowColor = '#ff2a2a'; c.shadowBlur = 8;
          for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(kx, ky, rr, rot + i * Math.PI / 2 + 0.25, rot + (i + 1) * Math.PI / 2 - 0.25); c.stroke(); }
          c.shadowBlur = 0;
        }
      }
      if (W.sov && W.sov.alpha > 0) {
        const base = Object.assign({}, sov.now(), { facing: W.sov.facing, scale: 0.9, headScale: 0.77 });
        W.sov.trail.forEach((p, i) => CinRig.draw(c, Object.assign({}, base, { x: p.x, y: p.y }), '#ff2a2a',
          { width: 5.2, alpha: W.sov.alpha * (i + 1) / W.sov.trail.length * 0.25, face: false }));
        CinRig.draw(c, Object.assign({}, base, { x: W.sov.x, y: W.sov.y }), '#ff2a2a',
          { width: 5.2, alpha: W.sov.alpha, glow: '#ff2a2a', glowBlur: 12, expr: 'neutral', outline: 1.3 });
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
      if (s.who) {
        c.font = `bold ${Math.round(ch * 0.018)}px Arial`;
        c.fillStyle = s.color;
        c.fillText(s.who, cw / 2, ch * 0.905);
      }
      c.font = `italic ${Math.round(ch * 0.03)}px Arial`;
      c.fillStyle = s.who ? '#f2f2f2' : s.color;
      c.shadowColor = '#000'; c.shadowBlur = 6;
      c.fillText(s.text, cw / 2, ch * 0.95);
      c.restore();
    },

    onEnd() {
      slowMotion = 1;
      cinematicCamOverride = false;
      if (hero) CinPerf.end(hero);
      // Kept at 1 HP only so he could be drawn. Alive, his AI and phase cinematics wake up again.
      if (tf) { tf.health = 0; tf.invincible = 999999; tf.backstageHiding = true; tf.state = 'idle'; tf.ragdollTimer = 0; }
      const sc = tfEndingScene;
      if (!sc) { if (typeof endGame === 'function') endGame(); return; }
      // Same hand-off the kernel-flight phase made into the powers screen.
      sc.phase = 'powers';
      sc.timer = 0;
      sc.hero._tfAuraGlow = true;
      if (typeof setAccountFlag === 'function') {
        setAccountFlag(['unlocks', 'patrolMode'],  true);
        setAccountFlag(['unlocks', 'interTravel'], true);
      }
      if (settings.experimental3D) localStorage.setItem('smc_view3D', '1');
      if (typeof _tfeCamFocus === 'function') _tfeCamFocus(sc.hero.cx(), sc.hero.cy(), 1.5);
      sc.skippable = true;
    },
  };
}
