'use strict';
// Anime-style post-processing. Reads globals from smb-globals.js.
// Hook: ScreenFX.postRender(), called at the end of gameLoop (smb-loop-core.js).

const ScreenFX = (() => {
  let _caTimer     = 0;   // chromatic aberration frames left
  let _caIntensity = 0;   // CA edge width
  let _flashTimer  = 0;   // impact flash frames left
  let _flashAlpha  = 0;   // flash peak alpha
  let _flashColor  = '#ffffff';
  let _ripples     = [];  // shockwave rings
  let _vigPulse    = 0;   // boss vignette pulse
  let _prevHitStop = 0;   // last frame's hitStopFrames, for rising-edge detect
  const SFX_FLASH_HITSTOP = 11;  // hit-stop frames needed before the screen flashes
  let _prevShake   = 0;

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

  function triggerCA(intensity, frames) {
    _caIntensity = Math.max(_caIntensity, intensity || 7);
    _caTimer     = Math.max(_caTimer,     frames   || 10);
  }

  function triggerFlash(alpha, frames, color) {
    if (typeof settings !== 'undefined' && settings && settings.phaseFlash === false) return;
    _flashAlpha = Math.max(_flashAlpha, alpha  || 0.40);
    _flashTimer = Math.max(_flashTimer, frames || 6);
    _flashColor = color || '#ffffff';
  }

  function spawnRipple(wx, wy, color, maxR) {
    if (_ripples.length >= 8) return;
    _ripples.push({ x: wx, y: wy, r: 4, maxR: maxR || 90, life: 22, maxLife: 22, color: color || '#ffffff' });
  }

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

  function postRender() {
    if (!gameRunning) return;

    const cW = canvas.width;
    const cH = canvas.height;

    const hitNow = typeof hitStopFrames !== 'undefined' ? hitStopFrames : 0;
    if (hitNow > 0 && _prevHitStop === 0) {
      triggerCA(9, 14);
      const atk = players && players.find(p => p.health > 0 && p.attackTimer > 0);
      // Only the heaviest freezes light the screen, in the attacker's colour.
      // White is kept for kills and finishers.
      if (hitNow >= SFX_FLASH_HITSTOP) triggerFlash(0.22, 5, (atk && atk.color) || '#ffffff');
      if (atk) {
        const mx = atk.cx ? atk.cx() : atk.x;
        spawnRipple(mx, atk.y + (atk.h || 50) * 0.4, atk.color || '#ffffff', 100);
      }
    }
    _prevHitStop = hitNow;

    const shakeNow = typeof screenShake !== 'undefined' ? screenShake : 0;
    if (shakeNow > 18 && _prevShake <= 18) {
      triggerCA(Math.min(shakeNow * 0.50, 13), 9);
    }
    _prevShake = shakeNow;

    _drawSmears();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

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

    // Boss vignette: pulsing edge
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

    // Chromatic aberration: red/blue edge tint on heavy hits
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

    // Impact flash
    if (_flashTimer > 0) {
      ctx.globalAlpha = (_flashTimer / 6) * _flashAlpha;
      ctx.fillStyle   = _flashColor;
      ctx.fillRect(0, 0, cW, cH);
      _flashTimer--;
      if (_flashTimer === 0) _flashAlpha = 0;
    }

    ctx.globalAlpha              = 1;
    ctx.shadowBlur               = 0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  return { triggerCA, triggerFlash, spawnRipple, postRender };
})();
