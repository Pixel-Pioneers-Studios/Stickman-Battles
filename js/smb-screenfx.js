'use strict';
// smb-screenfx.js — Anime-style post-processing screen effects
// Depends on: smb-globals.js (canvas, ctx, camZoomCur, camXCur, camYCur,
//             screenShake, hitStopFrames, players, GAME_W, GAME_H, gameRunning)
// Hook: ScreenFX.postRender() called at end of gameLoop in smb-loop-core.js

const ScreenFX = (() => {
  // ── State ─────────────────────────────────────────────────────────────────
  let _caTimer     = 0;   // chromatic aberration frames remaining
  let _caIntensity = 0;   // CA edge width driver
  let _flashTimer  = 0;   // impact flash frames remaining
  let _flashAlpha  = 0;   // flash peak alpha
  let _ripples     = [];  // shockwave rings: { x, y, r, maxR, life, maxLife, color }
  let _vigPulse    = 0;   // boss vignette pulse accumulator
  let _prevHitStop = 0;   // detect hitStopFrames rising edge
  let _prevShake   = 0;   // detect screenShake spike

  // ── Coordinate helper ──────────────────────────────────────────────────────
  function _worldToScreen(wx, wy) {
    const bX = canvas.width  / GAME_W;
    const bY = canvas.height / GAME_H;
    const fX = bX * camZoomCur;
    const fY = bY * camZoomCur;
    return {
      x:  (wx - camXCur) * fX + canvas.width  / 2,
      y:  (wy - camYCur) * fY + canvas.height / 2,
      fX, fY,
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  function triggerCA(intensity, frames) {
    _caIntensity = Math.max(_caIntensity, intensity || 7);
    _caTimer     = Math.max(_caTimer,     frames   || 10);
  }

  function triggerFlash(alpha, frames) {
    _flashAlpha = Math.max(_flashAlpha, alpha  || 0.40);
    _flashTimer = Math.max(_flashTimer, frames || 6);
  }

  function spawnRipple(wx, wy, color, maxR) {
    if (_ripples.length >= 8) return;
    _ripples.push({ x: wx, y: wy, r: 4, maxR: maxR || 90, life: 22, maxLife: 22, color: color || '#ffffff' });
  }

  // ── Motion smear (world-space — drawn before screen-space overlays) ────────
  function _drawSmears() {
    if (!gameRunning || !players || !players.length) return;
    const bX = canvas.width  / GAME_W;
    const bY = canvas.height / GAME_H;
    const fX = bX * camZoomCur;
    const fY = bY * camZoomCur;

    ctx.save();
    ctx.setTransform(fX, 0, 0, fY, canvas.width / 2 - camXCur * fX, canvas.height / 2 - camYCur * fY);

    for (const p of players) {
      if (p.health <= 0 || !p.attackTimer || p.attackTimer <= 0) continue;
      const spd = Math.hypot(p.vx || 0, p.vy || 0);
      if (spd < 2.2) continue;

      const cx  = p.cx ? p.cx() : p.x + (p.w || 30) / 2;
      const cy  = p.y + (p.h  || 50) * 0.45;
      const ang = Math.atan2(p.vy || 0, p.vx || 0);
      const len = Math.min(spd * 6, 46);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.globalAlpha              = Math.min(0.30, spd * 0.052);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle                = p.color || '#88ccff';
      ctx.shadowColor              = p.color || '#88ccff';
      ctx.shadowBlur               = 20;
      ctx.beginPath();
      ctx.ellipse(0, 0, len, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.globalAlpha              = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur               = 0;
    ctx.restore();
  }

  // ── Main post-render hook — call once per frame at end of gameLoop ─────────
  function postRender() {
    if (!gameRunning) return;

    const cW = canvas.width;
    const cH = canvas.height;

    // ── Auto-detect heavy hit (hitStopFrames rising edge) ────────────────────
    const hitNow = typeof hitStopFrames !== 'undefined' ? hitStopFrames : 0;
    if (hitNow > 0 && _prevHitStop === 0) {
      triggerCA(9, 14);
      triggerFlash(0.36, 5);
      const atk = players && players.find(p => p.health > 0 && p.attackTimer > 0);
      if (atk) {
        const mx = atk.cx ? atk.cx() : atk.x;
        spawnRipple(mx, atk.y + (atk.h || 50) * 0.4, atk.color || '#ffffff', 100);
      }
    }
    _prevHitStop = hitNow;

    // ── Auto-detect big shake spike ────────────────────────────────────────
    const shakeNow = typeof screenShake !== 'undefined' ? screenShake : 0;
    if (shakeNow > 18 && _prevShake <= 18) {
      triggerCA(Math.min(shakeNow * 0.50, 13), 9);
    }
    _prevShake = shakeNow;

    // ── Motion smear pass (world-space) ───────────────────────────────────
    _drawSmears();

    // ── Screen-space overlays ──────────────────────────────────────────────
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Shockwave ripples
    for (const rip of _ripples) {
      rip.r   += (rip.maxR - rip.r) * 0.24;
      rip.life--;
      const t  = rip.life / rip.maxLife;
      const sc = _worldToScreen(rip.x, rip.y);
      ctx.globalAlpha = t * 0.60;
      ctx.strokeStyle = rip.color;
      ctx.lineWidth   = 2.5 * t;
      ctx.shadowColor = rip.color;
      ctx.shadowBlur  = 10;
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, rip.r * sc.fX, 0, Math.PI * 2);
      ctx.stroke();
    }
    _ripples    = _ripples.filter(r => r.life > 0);
    ctx.shadowBlur = 0;

    // Boss vignette — pulsing colored edge during boss fight
    const boss = players && players.find(p => (p.isBoss || p.isTrueForm) && p.health > 0);
    if (boss) {
      _vigPulse   += 0.025;
      const pulseA = 0.09 + Math.sin(_vigPulse) * 0.035;
      const vigC   = boss.isTrueForm ? 'rgba(110,0,255,' : 'rgba(180,15,0,';
      const vg     = ctx.createRadialGradient(cW / 2, cH / 2, cH * 0.28, cW / 2, cH / 2, cH * 0.88);
      vg.addColorStop(0, vigC + '0)');
      vg.addColorStop(1, vigC + pulseA.toFixed(3) + ')');
      ctx.globalAlpha = 1;
      ctx.fillStyle   = vg;
      ctx.fillRect(0, 0, cW, cH);
    } else {
      _vigPulse = 0;
    }

    // Chromatic aberration — red/blue edge tint on heavy impacts
    if (_caTimer > 0) {
      const t   = _caTimer / 14;
      const edW = Math.min(cW * 0.18, _caIntensity * 4.5 * t);

      ctx.globalCompositeOperation = 'screen';

      const lgR = ctx.createLinearGradient(0, 0, edW, 0);
      lgR.addColorStop(0, `rgba(255,40,40,${(0.28 * t).toFixed(3)})`);
      lgR.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = lgR;
      ctx.fillRect(0, 0, edW, cH);

      const lgB = ctx.createLinearGradient(cW, 0, cW - edW, 0);
      lgB.addColorStop(0, `rgba(40,80,255,${(0.28 * t).toFixed(3)})`);
      lgB.addColorStop(1, 'rgba(40,80,255,0)');
      ctx.fillStyle = lgB;
      ctx.fillRect(cW - edW, 0, edW, cH);

      ctx.globalCompositeOperation = 'source-over';
      _caTimer--;
      _caIntensity *= 0.87;
    }

    // Impact flash — brief white overlay on heavy hits
    if (_flashTimer > 0) {
      ctx.globalAlpha = (_flashTimer / 6) * _flashAlpha;
      ctx.fillStyle   = '#ffffff';
      ctx.fillRect(0, 0, cW, cH);
      _flashTimer--;
      if (_flashTimer === 0) _flashAlpha = 0;
    }

    // Reset state
    ctx.globalAlpha              = 1;
    ctx.shadowBlur               = 0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  return { triggerCA, triggerFlash, spawnRipple, postRender };
})();
