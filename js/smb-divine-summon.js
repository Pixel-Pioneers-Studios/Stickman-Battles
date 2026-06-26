'use strict';
// smb-divine-summon.js — Press H to call a divine Herald that sweeps the arena and destroys all AI enemies
// Depends on: smb-globals.js, smb-combat.js, smb-particles-core.js
// Load after: smb-god-cinematics.js

// ── State ─────────────────────────────────────────────────────────────────────
const _DS_COOLDOWN_FRAMES = 60 * 120; // 2 minutes
let _dsCooldown = 0;
let _dsActive   = null; // null or state object

// ── Mode gate ─────────────────────────────────────────────────────────────────
function _dsAllowed() {
  if (typeof gameRunning === 'undefined' || !gameRunning) return false;
  if (typeof isCinematic !== 'undefined' && isCinematic)  return false;
  if (typeof activeCinematic !== 'undefined' && activeCinematic) return false;
  if (typeof paused !== 'undefined' && paused) return false;
  if (typeof onlineMode !== 'undefined' && onlineMode) return false;
  // Admin-only — lore note: God's body is destroyed; this summon is a developer tool only
  const localPlayer = typeof players !== 'undefined' && players.find(p => !p.isAI && !p.isRemote);
  const accountId   = localPlayer && localPlayer.accountId;
  if (typeof _isAdmin !== 'function' || !_isAdmin(String(accountId || ''))) return false;
  // Block during boss/trueform/god encounters — those have their own power fantasy
  const blockedModes = new Set(['boss', 'trueform', 'god', 'absoluteaxiom', 'exploration']);
  if (typeof gameMode !== 'undefined' && blockedModes.has(gameMode)) return false;
  return true;
}

function _dsGetTargets() {
  const all = [
    ...(typeof players  !== 'undefined' ? players  : []),
    ...(typeof minions  !== 'undefined' ? minions  : []),
  ];
  return all.filter(e => e && e.isAI && !e.isBoss && e.health > 0);
}

// ── Trigger ───────────────────────────────────────────────────────────────────
function triggerDivineSummon() {
  if (!_dsAllowed())     return;
  if (_dsCooldown > 0)   return;
  if (_dsActive)         return;
  if (_dsGetTargets().length === 0) return;

  _dsCooldown = _DS_COOLDOWN_FRAMES;

  _dsActive = {
    phase:    'entry',    // entry → sweep → exit
    timer:    0,
    // Herald world-space position
    x:        GAME_W / 2,
    y:        -220,       // starts above screen
    targetY:  60,         // rests here while sweeping
    // Sweep state
    sweepX:   -80,
    killed:   new Set(),
    // Kill flash effects: [{x,y,life,maxLife}]
    strikes:  [],
    // Screen flash
    flashAlpha: 0,
    // Text
    textAlpha: 0,
    // Halo pulse timer
    haloPulse: 0,
    // Trail segments left by wings
    trail: [],
  };
}

// ── Update ────────────────────────────────────────────────────────────────────
function updateDivineSummon() {
  if (_dsCooldown > 0) _dsCooldown--;
  if (!_dsActive) return;

  const ds = _dsActive;
  ds.timer++;
  ds.haloPulse++;

  // Tick kill-strike effects
  ds.strikes = ds.strikes.filter(s => --s.life > 0);

  // Tick wing trail
  ds.trail = ds.trail.filter(t => --t.life > 0);

  if (ds.phase === 'entry') {
    // Fall from above onto targetY
    ds.y += (ds.targetY - ds.y) * 0.14;
    ds.flashAlpha = Math.max(0, ds.flashAlpha - 0.04);
    ds.textAlpha  = Math.min(1, ds.timer / 18);

    if (ds.timer === 8) {
      // Arrival shockwave
      ds.flashAlpha = 0.55;
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 18);
      if (typeof spawnParticles === 'function') {
        spawnParticles(ds.x, ds.targetY + 80, '#ffe066', 20);
        spawnParticles(ds.x, ds.targetY + 80, '#ffffff', 12);
      }
    }
    if (ds.timer >= 32) {
      ds.phase  = 'sweep';
      ds.timer  = 0;
      ds.sweepX = -80;
    }

  } else if (ds.phase === 'sweep') {
    ds.sweepX += 10;
    ds.x = ds.sweepX;

    // Wing trail
    ds.trail.push({ x: ds.x, y: ds.y, life: 22, maxLife: 22 });

    // Advance on targets as we pass their x
    const targets = _dsGetTargets();
    for (const e of targets) {
      if (ds.killed.has(e)) continue;
      if (e.cx() > ds.sweepX + 20) continue; // not reached yet

      ds.killed.add(e);

      // Register a golden strike beam at the enemy
      ds.strikes.push({ x: e.cx(), y: e.cy(), life: 28, maxLife: 28 });

      // Particle burst
      if (typeof spawnParticles === 'function') {
        spawnParticles(e.cx(), e.cy(), '#ffe066', 14);
        spawnParticles(e.cx(), e.cy(), '#ffffff', 8);
        spawnParticles(e.cx(), e.cy(), '#ffcc44', 6);
      }

      // Kill — all damage through dealDamage
      if (typeof dealDamage === 'function') {
        dealDamage(null, e, 99999, 22);
      }

      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 5);
    }

    if (ds.sweepX > GAME_W + 90) {
      ds.phase = 'exit';
      ds.timer = 0;
    }

  } else if (ds.phase === 'exit') {
    ds.y -= 9;
    ds.textAlpha = Math.max(0, ds.textAlpha - 0.035);
    ds.flashAlpha = Math.max(0, ds.flashAlpha - 0.04);
    if (ds.timer >= 36) {
      _dsActive = null;
    }
  }
}

// ── Draw (world-space) ────────────────────────────────────────────────────────
function drawDivineSummon() {
  if (!_dsActive) return;
  const ds = _dsActive;
  const { x, y } = ds;

  // — Wing trail ghost echoes —
  for (const t of ds.trail) {
    const a = (t.life / t.maxLife) * 0.18;
    if (a < 0.01) continue;
    ctx.save();
    ctx.globalAlpha = a;
    _dsDrawHerald(t.x, t.y, 1.0, '#ffe066');
    ctx.restore();
  }

  // — Kill-strike vertical beams —
  for (const s of ds.strikes) {
    const frac = s.life / s.maxLife;
    ctx.save();
    ctx.globalAlpha = frac * 0.85;
    // Beam from sky to target
    const grad = ctx.createLinearGradient(s.x, 0, s.x, s.y + 20);
    grad.addColorStop(0, 'rgba(255,230,80,0)');
    grad.addColorStop(0.6, 'rgba(255,230,80,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.fillStyle = grad;
    const bw = 14 + (1 - frac) * 20;
    ctx.fillRect(s.x - bw / 2, 0, bw, s.y + 20);
    // Burst ring at impact
    ctx.strokeStyle = `rgba(255,220,80,${frac * 0.9})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, (1 - frac) * 48 + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // — Herald body ambient glow —
  if (ds.phase !== 'exit' || ds.timer < 20) {
    const glowAlpha = ds.phase === 'entry' ? Math.min(0.4, ds.timer / 32 * 0.4)
                    : ds.phase === 'sweep'  ? 0.38
                    : Math.max(0, 0.38 - ds.timer / 36 * 0.38);
    ctx.save();
    ctx.globalAlpha = glowAlpha;
    const radGrad = ctx.createRadialGradient(x, y + 50, 10, x, y + 50, 110);
    radGrad.addColorStop(0, 'rgba(255,240,120,0.9)');
    radGrad.addColorStop(0.5, 'rgba(255,200,60,0.3)');
    radGrad.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(x, y + 50, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // — Light rays radiating from the Herald —
  _dsDrawRays(x, y);

  // — Herald figure —
  const bodyAlpha = ds.phase === 'entry' ? Math.min(1, ds.timer / 20)
                  : ds.phase === 'exit'  ? Math.max(0, 1 - ds.timer / 30)
                  : 1.0;
  ctx.save();
  ctx.globalAlpha = bodyAlpha;
  _dsDrawHerald(x, y, 1.0, null);
  ctx.restore();

  // — Halo ring —
  const haloScale = 1 + 0.06 * Math.sin(ds.haloPulse * 0.12);
  ctx.save();
  ctx.globalAlpha = bodyAlpha * 0.85;
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 3.5;
  ctx.shadowColor = '#ffe066';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.ellipse(x, y - 14, 22 * haloScale, 7 * haloScale, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // — Screen flash on arrival —
  if (ds.flashAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = ds.flashAlpha;
    ctx.fillStyle = '#fffbe0';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.restore();
  }

  // — "A DIVINE PRESENCE DESCENDS" text (world-space top center) —
  if (ds.textAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = ds.textAlpha;
    ctx.textAlign = 'center';
    ctx.font = 'bold 17px "Segoe UI", Arial, sans-serif';
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur  = 22;
    ctx.fillStyle   = '#fffbe8';
    ctx.fillText('✦  A DIVINE PRESENCE DESCENDS  ✦', GAME_W / 2, 44);
    ctx.shadowBlur = 5;
    ctx.font = '11px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,240,160,0.75)';
    ctx.fillText('press H to summon', GAME_W / 2, 58);
    ctx.restore();
  }
}

// Draw the Herald stickman figure (cruciform divine pose)
function _dsDrawHerald(x, y, scale, overrideColor) {
  const s  = scale * 1.0;
  const lw = 4.5 * s;
  const col = overrideColor || '#fff5d4';
  ctx.strokeStyle = col;
  ctx.lineWidth   = lw;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.shadowColor = overrideColor || '#ffe066';
  ctx.shadowBlur  = overrideColor ? 0 : 18;

  // Head
  ctx.beginPath();
  ctx.arc(x, y, 13 * s, 0, Math.PI * 2);
  ctx.stroke();

  // Torso
  const neckY  = y + 13 * s;
  const hipY   = neckY + 44 * s;
  ctx.beginPath();
  ctx.moveTo(x, neckY);
  ctx.lineTo(x, hipY);
  ctx.stroke();

  // Arms (outstretched — cruciform / wings-open pose)
  const shoulderY = neckY + 10 * s;
  const armSpan   = 50 * s;
  // Upper arm
  ctx.beginPath();
  ctx.moveTo(x - armSpan, shoulderY + 10 * s);
  ctx.lineTo(x, shoulderY);
  ctx.lineTo(x + armSpan, shoulderY + 10 * s);
  ctx.stroke();
  // Forearm (bent slightly upward — exaltation gesture)
  ctx.beginPath();
  ctx.moveTo(x - armSpan, shoulderY + 10 * s);
  ctx.lineTo(x - armSpan - 18 * s, shoulderY - 12 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + armSpan, shoulderY + 10 * s);
  ctx.lineTo(x + armSpan + 18 * s, shoulderY - 12 * s);
  ctx.stroke();

  // Legs (hanging, slightly spread)
  ctx.beginPath();
  ctx.moveTo(x, hipY);
  ctx.lineTo(x - 16 * s, hipY + 34 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, hipY);
  ctx.lineTo(x + 16 * s, hipY + 34 * s);
  ctx.stroke();

  // Wing feather lines (arcs from upper arms)
  ctx.lineWidth = 2 * s;
  ctx.globalAlpha *= 0.55;
  for (let i = 0; i < 5; i++) {
    const t    = i / 4;
    const wAng = Math.PI * (0.55 + t * 0.55); // upward arc range
    const wr   = (30 + i * 12) * s;
    // Left wing
    ctx.beginPath();
    ctx.moveTo(x - armSpan + 8 * s, shoulderY + 6 * s);
    ctx.lineTo(
      x - armSpan + 8 * s + Math.cos(wAng) * wr,
      shoulderY + 6 * s  - Math.sin(wAng) * wr * 0.7
    );
    ctx.stroke();
    // Right wing (mirrored)
    const wAngR = Math.PI - wAng;
    ctx.beginPath();
    ctx.moveTo(x + armSpan - 8 * s, shoulderY + 6 * s);
    ctx.lineTo(
      x + armSpan - 8 * s + Math.cos(wAngR) * wr,
      shoulderY + 6 * s  - Math.sin(wAngR) * wr * 0.7
    );
    ctx.stroke();
  }
  ctx.globalAlpha *= (1 / 0.55);
  ctx.shadowBlur = 0;
}

// Radiating light rays from the Herald
function _dsDrawRays(x, y) {
  if (!_dsActive) return;
  const ds = _dsActive;
  const t  = ds.haloPulse;
  const base = ds.phase === 'entry' ? Math.min(1, ds.timer / 28)
             : ds.phase === 'exit'  ? Math.max(0, 1 - ds.timer / 30)
             : 1.0;
  const count = 12;
  ctx.save();
  ctx.globalAlpha = base * 0.25;
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth   = 1.5;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + t * 0.018;
    const r0  = 18 + 6 * Math.sin(t * 0.09 + i);
    const r1  = 60 + 22 * Math.sin(t * 0.07 + i * 1.3);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(ang) * r0, y + 50 + Math.sin(ang) * r0);
    ctx.lineTo(x + Math.cos(ang) * r1, y + 50 + Math.sin(ang) * r1);
    ctx.stroke();
  }
  ctx.restore();
}

// ── Screen-space HUD (cooldown arc + ready indicator) ─────────────────────────
// Called with actual canvas dimensions (after ctx.setTransform reset)
function drawDivineSummonHUD(cw, ch) {
  if (typeof gameRunning === 'undefined' || !gameRunning) return;
  if (typeof isCinematic !== 'undefined' && isCinematic)  return;
  if (!_dsAllowed() && !_dsActive) return;

  const ready = _dsCooldown <= 0 && !_dsActive;
  const frac  = ready ? 1 : 1 - _dsCooldown / _DS_COOLDOWN_FRAMES;

  // Position: top-right corner
  const cx = cw - 36, cy = 36, r = 16;

  ctx.save();
  ctx.globalAlpha = ready ? 0.9 : 0.65;

  // Background ring
  ctx.strokeStyle = 'rgba(255,220,80,0.18)';
  ctx.lineWidth   = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Progress arc
  ctx.strokeStyle = ready ? '#88ffaa' : '#ffe066';
  ctx.shadowColor = ready ? '#88ffaa' : '#ffe066';
  ctx.shadowBlur  = ready ? 10 : 6;
  ctx.lineWidth   = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
  ctx.stroke();

  // Center icon
  ctx.shadowBlur = 0;
  ctx.font       = `bold 11px "Segoe UI", Arial`;
  ctx.textAlign  = 'center';
  ctx.fillStyle  = ready ? '#88ffaa' : '#ffe066';
  ctx.globalAlpha *= (ready ? 1 : 0.85);
  ctx.fillText('H', cx, cy + 4);

  // "READY" pulse
  if (ready) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 320);
    ctx.globalAlpha = 0.6 * pulse;
    ctx.font = '8px "Segoe UI", Arial';
    ctx.fillStyle = '#88ffaa';
    ctx.fillText('READY', cx, cy + 28);
  }

  ctx.restore();
}

// ── Key listener ──────────────────────────────────────────────────────────────
document.addEventListener('keydown', function _dsKeyHandler(e) {
  const ae = document.activeElement;
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
  if (e.key !== 'h' && e.key !== 'H') return;
  triggerDivineSummon();
});
