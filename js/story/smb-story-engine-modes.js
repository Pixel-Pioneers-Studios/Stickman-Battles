'use strict';
// smb-story-engine-modes.js — New interactive chapter mode logic.
// Covers: stealth, escape, defense, scavenge, puzzle (explore subtypes),
//         assassination, gauntlet (fight subtypes), ship_flight (own gameMode),
//         and escort NPC init (called from _launchEscortChapter in flow.js).
// Load order: after smb-story-engine-explore2.js, before smb-story-finalize.js.

// ============================================================
// HELPERS
// ============================================================

function _modesGuard() {
  return !gameRunning || !players[0];
}

// ============================================================
// STEALTH MODE  (exploreMode: 'stealth')
// Runs inside updateExploration() hook.
// ============================================================

function initStealthMode(ch) {
  // Chapters author zones as stealthGuardDefs [{ wx, radius, name }] (world-x form);
  // legacy stealthGuards [{ x, y, ... }] is also accepted.
  const _zoneDefs = ch.stealthGuards ||
    (ch.stealthGuardDefs || []).map(g => {
      const z = { x: g.wx };
      if (g.radius != null) z.radius = g.radius;
      return z;
    });
  stealthGuards       = _zoneDefs.map(g => Object.assign({
    y: 395, radius: 90, alertTimer: 0, maxAlertTimer: 36, alerted: false
  }, g));
  // Default guards if chapter provided none
  if (!stealthGuards.length) {
    const wl = ch.worldLength || 4800;
    const slots = [wl * 0.25, wl * 0.50, wl * 0.72];
    slots.forEach((sx, i) => stealthGuards.push({
      x: sx, y: 395, radius: 90, alertTimer: 0, maxAlertTimer: 36, alerted: false
    }));
  }
  stealthAlarmed      = false;
  stealthNeverAlarmed = true;
  stealthModeActive   = true;
}

function updateStealthMode() {
  if (_modesGuard() || stealthAlarmed) return;
  const p1 = players[0];
  const moving = Math.abs(p1.vx) > 0.8 || Math.abs(p1.vy) > 0.8;

  for (const guard of stealthGuards) {
    if (guard.alerted) continue;
    const dx = p1.cx() - guard.x;
    const dy = p1.cy() - guard.y;
    const inZone = (dx * dx + dy * dy) <= guard.radius * guard.radius;

    if (inZone && moving) {
      // Proximity-scaled: deeper in the zone = spotted faster. Walking straight
      // through the middle now triggers mid-crossing (~15 frames); skirting the
      // outer edge stays survivable. (A flat +1 needed 48 frames — more than a
      // full crossing takes, so zones only fired if you lingered deliberately.)
      const _d = Math.sqrt(dx * dx + dy * dy);
      guard.alertTimer += 1 + 2.4 * (1 - _d / guard.radius);
      if (guard.alertTimer >= guard.maxAlertTimer) {
        // Alarm triggered
        guard.alerted   = true;
        stealthAlarmed  = true;
        stealthNeverAlarmed = false;
        screenShake     = 20;
        storyFightSubtitle = { text: '⚠ Alarm triggered! Enemies incoming!', timer: 220, maxTimer: 220, color: '#ff4422' };
        // Remove all guard zones; spawn 3 enemies
        stealthGuards.forEach(g => { g.alerted = true; });
        const ch = _activeStory2Chapter;
        // Failing stealth should mean "now you fight your way out", not "restart".
        // The response scales with the chapter: the earliest infiltrations send a
        // pair of plain scouts, and the elite leader only appears once the player
        // has gear and levels behind them. The chapter's own patrol queue keeps
        // feeding after this, so the opening wave doesn't need to be the beating.
        const _alertElite = ch && ch.id >= 6;
        const _alertCount = _alertElite ? 3 : 2;
        for (let i = 0; i < _alertCount; i++) {
          const _lead = _alertElite && i === 0;
          _exploreSpawnEnemy({
            wx: p1.x + 150 + i * 80,
            name: _lead ? 'Alerted Enforcer' : 'Alerted Scout',
            weaponKey: ch && ch.weaponKey ? ch.weaponKey : 'sword',
            classKey:  'warrior',
            aiDiff:    ch && ch.aiDiff ? ch.aiDiff : 'medium',
            color:     '#cc2222',
            isElite:   _lead,
            health:    _lead ? 150 : 100,
          }, p1);
        }
        return;
      }
    } else if (!inZone) {
      // Cool down alert timer when player leaves zone
      if (guard.alertTimer > 0) guard.alertTimer = Math.max(0, guard.alertTimer - 2);
    }
  }
}

function drawStealthModeOverlay() {
  if (!exploreActive || !players[0]) return;
  const ch = _activeStory2Chapter;
  if (!ch || ch.exploreMode !== 'stealth') return;
  const p1 = players[0];

  // Draw guard detection zones in world space
  for (const guard of stealthGuards) {
    if (guard.alerted) continue;
    const dx = p1.cx() - guard.x;
    const dy = p1.cy() - guard.y;
    const inZone = (dx * dx + dy * dy) <= guard.radius * guard.radius;
    const progress = guard.alertTimer / guard.maxAlertTimer;

    ctx.save();
    ctx.globalAlpha = inZone ? 0.35 : 0.15;
    ctx.fillStyle   = inZone ? `rgba(255,50,50,${0.25 + progress * 0.35})` : 'rgba(255,200,50,0.15)';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = inZone ? `rgba(255,80,80,${0.6 + progress * 0.4})` : 'rgba(255,200,50,0.3)';
    ctx.lineWidth   = inZone ? 2.5 : 1.5;
    ctx.stroke();

    // Eye icon at guard position
    ctx.globalAlpha = 0.85;
    ctx.font        = '14px monospace';
    ctx.textAlign   = 'center';
    ctx.fillStyle   = inZone ? '#ff8888' : '#ffcc44';
    ctx.fillText('👁', guard.x, guard.y - guard.radius - 6);

    // Alert progress arc
    if (inZone && progress > 0) {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#ff3300';
      ctx.lineWidth   = 4;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y - guard.radius - 18, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Top HUD: alert bar (in screen space — after ctx.setTransform reset)
  if (!stealthAlarmed) {
    const alerting = stealthGuards.some(g => !g.alerted && g.alertTimer > 0);
    if (alerting) {
      const maxAlert = Math.max(...stealthGuards.map(g => g.alertTimer));
      const maxMax   = stealthGuards[0] ? stealthGuards[0].maxAlertTimer : 300;
      const pct      = maxAlert / maxMax;
      const pulse    = 0.7 + 0.3 * Math.sin(Date.now() / 80);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = pulse;
      ctx.fillStyle   = '#cc0000';
      ctx.fillRect(canvas.width / 2 - 120, 8, 240 * pct, 12);
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(canvas.width / 2 - 120, 8, 240, 12);
      ctx.fillStyle   = '#ffffff';
      ctx.font        = '10px monospace';
      ctx.textAlign   = 'center';
      ctx.fillText('ALERT', canvas.width / 2, 18);
      ctx.restore();
    }
  }
}

// ============================================================
// ESCAPE MODE  (exploreMode: 'escape')
// Runs inside updateExploration() hook.
// ============================================================

function initEscapeMode(ch) {
  escapeWallX          = -80;
  escapeWallSpeed      = 1.2;
  escapeWallAccelTimer = 0;
  escapeModeActive     = true;
}

function updateEscapeMode() {
  if (_modesGuard()) return;
  const p1 = players[0];
  if (exploreGoalFound) return;

  // Advance wall
  escapeWallX         += escapeWallSpeed;
  escapeWallAccelTimer++;
  if (escapeWallAccelTimer >= 60) {
    escapeWallSpeed      = Math.min(4.5, escapeWallSpeed + 0.015);
    escapeWallAccelTimer = 0;
  }

  // Kill player if wall catches them
  if (p1.x <= escapeWallX + 10 && p1.health > 0) {
    if (typeof dealDamage === 'function') dealDamage(null, p1, 9999, 0);
    screenShake = 25;
  }
}

function drawEscapeModeOverlay() {
  if (!exploreActive || !players[0]) return;
  const ch = _activeStory2Chapter;
  if (!ch || ch.exploreMode !== 'escape') return;

  // Wall is drawn in world space (camera transform is active)
  const wallW = 50;
  const grad  = ctx.createLinearGradient(escapeWallX, 0, escapeWallX + wallW, 0);
  grad.addColorStop(0,   'rgba(255,20,0,0)');
  grad.addColorStop(0.5, 'rgba(255,80,10,0.85)');
  grad.addColorStop(1,   'rgba(255,200,50,0.95)');
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(escapeWallX, 0, wallW, GAME_H + 80);

  // Glow edge
  ctx.shadowColor  = '#ff4400';
  ctx.shadowBlur   = 28;
  ctx.strokeStyle  = 'rgba(255,80,0,0.9)';
  ctx.lineWidth    = 3;
  ctx.beginPath();
  ctx.moveTo(escapeWallX + wallW, 0);
  ctx.lineTo(escapeWallX + wallW, GAME_H + 80);
  ctx.stroke();
  ctx.restore();

  // HUD: distance remaining (screen space)
  if (players[0]) {
    const metersLeft = Math.max(0, Math.round((exploreGoalX - players[0].x) / 10));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font      = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6622';
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur  = 8;
    ctx.fillText(`COLLAPSE IN ${metersLeft} m`, canvas.width / 2, 28);
    ctx.restore();
  }
}

// ============================================================
// DEFENSE MODE  (exploreMode: 'defense')
// Runs inside updateExploration() hook.
// ============================================================

function initDefenseMode(ch) {
  defenseNexusHP    = ch.nexusHP    || 300;
  defenseNexusMaxHP = defenseNexusHP;
  defenseNexusX     = ch.nexusX    || 450;
  defenseNexusY     = ch.nexusY    || 390;
  defenseNexusHitTimer = 0;
  defenseNexusPulse = 0;
  defenseModeActive = true;
}

function updateDefenseMode() {
  if (_modesGuard()) return;
  if (exploreGoalFound) return;
  const p1  = players[0];
  defenseNexusPulse++;

  // Nexus defeat check
  if (defenseNexusHP <= 0) {
    defenseNexusHP = 0;
    exploreGoalFound = true; // block further logic
    storyFightSubtitle = { text: '💀 Nexus destroyed — mission failed.', timer: 240, maxTimer: 240, color: '#ff2200' };
    p1.lives = 0;
    screenShake = 30;
    setTimeout(() => { if (!gameRunning) return; endGame(); }, 1600);
    return;
  }

  defenseNexusHitTimer = Math.max(0, defenseNexusHitTimer - 1);

  // Enemies attack nexus if closer to nexus than to player
  for (const m of minions) {
    if (!m || m.health <= 0) continue;
    const dxNexus  = Math.abs(m.cx() - defenseNexusX);
    const dxPlayer = Math.abs(m.cx() - p1.cx());
    if (dxNexus < dxPlayer && defenseNexusHitTimer <= 0) {
      // Direct HP reduction (not through dealDamage per spec — nexus is not a Fighter)
      defenseNexusHP    = Math.max(0, defenseNexusHP - 8);
      defenseNexusHitTimer = 60;
      screenShake        = Math.max(screenShake || 0, 5);
    }
  }
}

function drawDefenseNexus() {
  if (!exploreActive || !players[0]) return;
  const ch = _activeStory2Chapter;
  if (!ch || ch.exploreMode !== 'defense') return;

  const nx   = defenseNexusX;
  const ny   = defenseNexusY;
  const pulse = 0.75 + 0.25 * Math.sin(defenseNexusPulse * 0.08);
  const pct   = defenseNexusHP / defenseNexusMaxHP;
  const color = pct > 0.5 ? '#44ffcc' : pct > 0.25 ? '#ffcc44' : '#ff4422';

  ctx.save();
  // Crystal body
  ctx.globalAlpha = 0.92 * pulse;
  ctx.shadowColor = color;
  ctx.shadowBlur  = 18 * pulse;
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2.5;
  ctx.fillStyle   = color.replace(')', ',0.18)').replace('rgb', 'rgba');
  ctx.beginPath();
  ctx.moveTo(nx,      ny - 28);
  ctx.lineTo(nx + 18, ny - 8);
  ctx.lineTo(nx + 14, ny + 18);
  ctx.lineTo(nx - 14, ny + 18);
  ctx.lineTo(nx - 18, ny - 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // HP bar above nexus
  const barW  = 80;
  const barH  = 8;
  const barX  = nx - barW / 2;
  const barY  = ny - 50;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle   = '#222';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
  ctx.fillStyle = color;
  ctx.fillRect(barX, barY, barW * pct, barH);
  ctx.strokeStyle = '#ffffff44';
  ctx.lineWidth   = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  // Label
  ctx.globalAlpha = 0.9;
  ctx.font        = '9px monospace';
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#ffffff';
  ctx.fillText('NEXUS', nx, barY - 4);
  ctx.restore();
}

// ============================================================
// SCAVENGE MODE  (exploreMode: 'scavenge')
// Runs inside updateExploration() hook.
// ============================================================

function initScavengeMode(ch) {
  // Chapters author their pickups as `scavengeItemDefs` with world-x under `wx`.
  // Accept both that and the older `scavengeItems`/`x` shape.
  const defs = (ch.scavengeItems && ch.scavengeItems.length) ? ch.scavengeItems
             : (ch.scavengeItemDefs || []);
  scavengeItems = defs.map(item => Object.assign(
    { collected: false }, item, { x: (item.x != null ? item.x : item.wx) }
  ));
  // Default items if not provided
  if (!scavengeItems.length) {
    const wl     = ch.worldLength || 4800;
    const count  = ch.scavengeCount || 4;
    // No icon by default — drawScavengeItems() renders the crate sprite unless
    // a chapter explicitly authors a glyph via scavengeIcon.
    const icon   = ch.scavengeIcon || null;
    for (let i = 0; i < count; i++) {
      scavengeItems.push({
        x:    Math.floor(wl * (0.15 + (i / count) * 0.70)),
        y:    320 - (i % 2) * 40,
        name: ch.scavengeItemName || 'Cache',
        icon,
        collected: false,
      });
    }
  }
  scavengeTotal      = scavengeItems.length;
  scavengeModeActive = true;
}

function updateScavengeMode() {
  if (_modesGuard() || exploreGoalFound) return;
  const p1 = players[0];

  for (const item of scavengeItems) {
    if (item.collected) continue;
    const dx = Math.abs(p1.cx() - item.x);
    const dy = Math.abs(p1.cy() - item.y);
    if (dx < 35 && dy < 60) {
      item.collected = true;
      spawnParticles && spawnParticles(item.x, item.y, '#ffffaa', 12);
      SoundManager && typeof SoundManager.superActivate === 'function' && SoundManager.superActivate();
      const collected = scavengeItems.filter(s => s.collected).length;
      storyFightSubtitle = {
        text: `${item.name || 'Item'} collected! (${collected}/${scavengeTotal})`,
        timer: 160, maxTimer: 160, color: '#ffffaa'
      };
      if (collected >= scavengeTotal) {
        exploreGoalFound = true;
        storyFightSubtitle = {
          text: `All ${scavengeTotal} items collected! Mission complete.`,
          timer: 240, maxTimer: 240, color: '#ffffaa'
        };
        setTimeout(() => { if (!gameRunning) return; endGame(); }, 2200);
      }
    }
  }
}

// Drawn supply-crate sprite for a scavenge pickup. Centered on (x, y).
// Geometry only — no image assets, matches the hidden-loot chest style.
// `icon` (optional) is stamped on the crate face in place of the lit core panel.
function _drawCacheCrate(x, y, glow, icon) {
  const w = 26, h = 24;

  // Hover glow pooled behind the crate
  const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
  g.addColorStop(0, `rgba(255,255,170,${0.28 * glow})`);
  g.addColorStop(1, 'rgba(255,255,170,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = '#ffffaa';
  ctx.shadowBlur  = 10 + glow * 8;

  // Crate body + darker inset
  ctx.fillStyle = '#3b3a2c';
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = '#2a2a20';
  ctx.fillRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, h - 6);

  // Cross braces
  ctx.strokeStyle = '#7a7350';
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + 3, y - h / 2 + 3); ctx.lineTo(x + w / 2 - 3, y + h / 2 - 3);
  ctx.moveTo(x + w / 2 - 3, y - h / 2 + 3); ctx.lineTo(x - w / 2 + 3, y + h / 2 - 3);
  ctx.stroke();

  if (icon) {
    // Authored glyph stamped on the crate face
    ctx.shadowBlur = 4;
    ctx.font       = '14px Arial';
    ctx.textAlign  = 'center';
    ctx.fillStyle  = '#ffffaa';
    ctx.fillText(icon, x, y + 5);
    ctx.shadowBlur = 10 + glow * 8;
  } else {
    // Lit core panel — pulses with the glow
    ctx.fillStyle = `rgba(255,255,170,${0.55 + 0.45 * glow})`;
    ctx.fillRect(x - 3, y - 3, 6, 6);
  }

  // Frame + corner brackets
  ctx.strokeStyle = `rgba(255,255,170,${0.85 * glow})`;
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  ctx.beginPath();
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const cx = x + sx * (w / 2 + 2), cy = y + sy * (h / 2 + 2);
    ctx.moveTo(cx, cy); ctx.lineTo(cx - sx * 5, cy);
    ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - sy * 5);
  }
  ctx.stroke();
}

function drawScavengeItems() {
  if (!exploreActive) return;
  const ch = _activeStory2Chapter;
  if (!ch || ch.exploreMode !== 'scavenge') return;

  const t = Date.now();
  for (const item of scavengeItems) {
    if (item.collected) continue;
    const bob   = Math.sin(t / 400 + item.x * 0.01) * 5;
    const glow  = 0.6 + 0.4 * Math.sin(t / 300);
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.textAlign   = 'center';
    _drawCacheCrate(item.x, item.y + bob - 6, glow, item.icon);
    ctx.font        = '8px monospace';
    ctx.fillStyle   = '#ffffaa';
    ctx.shadowBlur  = 0;
    ctx.fillText(item.name || 'Cache', item.x, item.y + bob + 14);
    ctx.restore();
  }
}

function drawScavengeHUD() {
  const ch = _activeStory2Chapter;
  if (!ch || ch.exploreMode !== 'scavenge') return;
  const collected = scavengeItems.filter(s => s.collected).length;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font        = 'bold 12px monospace';
  ctx.textAlign   = 'right';
  ctx.fillStyle   = '#ffffaa';
  ctx.shadowColor = '#aa8800';
  ctx.shadowBlur  = 6;
  ctx.fillText(`Collected: ${collected}/${scavengeTotal}`, canvas.width - 12, 28);
  ctx.restore();
}

// ============================================================
// PUZZLE MODE  (exploreMode: 'puzzle')
// Runs inside updateExploration() hook.
// ============================================================

function initPuzzleMode(ch) {
  puzzleSwitches = (ch.puzzleSwitches || []).map((sw, i) => Object.assign({
    label: String(i + 1), activated: false, pulseTimer: 0
  }, sw));
  // Default switches if not provided
  if (!puzzleSwitches.length) {
    const wl    = ch.worldLength || 4800;
    const count = ch.puzzleCount || 3;
    for (let i = 0; i < count; i++) {
      puzzleSwitches.push({
        x:    Math.floor(wl * (0.20 + (i / count) * 0.60)),
        y:    380,
        label: String(i + 1),
        activated: false,
        pulseTimer: 0,
      });
    }
  }
  puzzleStep       = 0;
  puzzleModeActive = true;
}

function updatePuzzleMode() {
  if (_modesGuard() || exploreGoalFound) return;
  const p1 = players[0];

  for (let i = 0; i < puzzleSwitches.length; i++) {
    const sw = puzzleSwitches[i];
    if (sw.activated) { if (sw.pulseTimer > 0) sw.pulseTimer--; continue; }
    const dx = Math.abs(p1.cx() - sw.x);
    const dy = Math.abs(p1.cy() - sw.y);
    if (dx < 30 && dy < 60) {
      if (i === puzzleStep) {
        // Correct order
        sw.activated  = true;
        sw.pulseTimer = 60;
        puzzleStep++;
        spawnParticles && spawnParticles(sw.x, sw.y, '#44ffcc', 10);
        storyFightSubtitle = {
          text: `Mechanism ${i + 1} activated! (${puzzleStep}/${puzzleSwitches.length})`,
          timer: 150, maxTimer: 150, color: '#44ffcc'
        };
        if (puzzleStep >= puzzleSwitches.length) {
          exploreGoalFound = true;
          storyFightSubtitle = {
            text: 'All mechanisms activated — path unlocked!',
            timer: 240, maxTimer: 240, color: '#44ffcc'
          };
          setTimeout(() => { if (!gameRunning) return; endGame(); }, 2200);
        }
      } else {
        // Wrong order — shock flash, spawn enemy, reset
        screenShake = 18;
        storyFightSubtitle = {
          text: `Wrong order! Reset. (Need mechanism ${puzzleStep + 1} first)`,
          timer: 200, maxTimer: 200, color: '#ff4422'
        };
        puzzleSwitches.forEach(s => { s.activated = false; });
        puzzleStep = 0;
        _exploreSpawnEnemy({
          wx: p1.x + 120, name: 'Guard', weaponKey: 'sword',
          classKey: 'warrior', aiDiff: 'medium', color: '#884422', health: 100
        }, p1);
      }
      break; // only one switch per frame
    }
  }
}

function drawPuzzleSwitches() {
  if (!exploreActive) return;
  const ch = _activeStory2Chapter;
  if (!ch || ch.exploreMode !== 'puzzle') return;

  for (let i = 0; i < puzzleSwitches.length; i++) {
    const sw      = puzzleSwitches[i];
    const active  = sw.activated;
    const isCurr  = !active && i === puzzleStep;
    const color   = active ? '#44ffcc' : isCurr ? '#ffcc44' : '#666688';
    const pulse   = active ? (1 + 0.2 * Math.sin(Date.now() / 200)) : 1;

    ctx.save();
    ctx.globalAlpha = 0.92 * pulse;
    ctx.fillStyle   = color;
    ctx.shadowColor = color;
    ctx.shadowBlur  = active ? 14 : isCurr ? 8 : 2;
    ctx.fillRect(sw.x - 16, sw.y - 28, 32, 28);
    ctx.strokeStyle = '#ffffff66';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(sw.x - 16, sw.y - 28, 32, 28);
    ctx.fillStyle   = active ? '#001a12' : '#ffffff';
    ctx.font        = 'bold 14px monospace';
    ctx.textAlign   = 'center';
    ctx.fillText(sw.label, sw.x, sw.y - 8);
    ctx.restore();
  }
}

// ============================================================
// ASSASSINATION MODE  (type: 'assassination', fight chapter)
// Called from gameLoop via hook; target must be players[1] or a minion.
// ============================================================

function initAssassinationMode(ch) {
  assassinationTimer = ch.assassinationTimer || 5400;
  assassinationTarget = null; // set once players[] populated
  // Timer to alternate target between fleeing and fighting
  window._assassinFightTimer = 0;
  window._assassinFleeing    = true;
}

function updateAssassinationMode() {
  if (_modesGuard() || !storyModeActive) return;

  // Locate target (P2 bot)
  if (!assassinationTarget) {
    assassinationTarget = players.find(p => p !== players[0] && p.isAI && !p.isBoss && p.health > 0);
    if (!assassinationTarget) return;
  }
  const tgt = assassinationTarget;
  if (tgt.health <= 0) return; // target dead — win handled by normal endGame flow

  assassinationTimer--;

  // Timer expired — defeat
  if (assassinationTimer <= 0) {
    assassinationTimer = 0;
    storyFightSubtitle = { text: '⏱ Target escaped — mission failed!', timer: 220, maxTimer: 220, color: '#ff4422' };
    players[0].lives = 0;
    screenShake = 25;
    setTimeout(() => { if (!gameRunning) return; endGame(); }, 1400);
    return;
  }

  // Target behavior: alternate flee / fight every ~180 / 120 frames
  window._assassinFightTimer = (window._assassinFightTimer || 0) + 1;
  if (window._assassinFleeing) {
    // Force target rightward at high speed
    tgt.vx = Math.min(tgt.vx + 0.7, 6.0);
    if (window._assassinFightTimer >= 180) {
      window._assassinFleeing  = false;
      window._assassinFightTimer = 0;
    }
  } else {
    // Normal AI takes over; just count frames
    if (window._assassinFightTimer >= 120) {
      window._assassinFleeing   = true;
      window._assassinFightTimer = 0;
    }
  }
}

function drawAssassinationHUD() {
  if (!storyModeActive) return;
  const ch = _activeStory2Chapter;
  if (!ch || ch.type !== 'assassination') return;

  const pct    = assassinationTimer / (ch.assassinationTimer || 5400);
  const secs   = Math.ceil(assassinationTimer / 60);
  const danger = secs <= 30;
  const pulse  = danger ? (0.7 + 0.3 * Math.sin(Date.now() / 120)) : 1;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = pulse;

  // Background bar
  const bx = canvas.width / 2 - 140;
  const by = 8;
  ctx.fillStyle = '#11000a';
  ctx.fillRect(bx - 2, by - 2, 284, 18);
  ctx.fillStyle = danger ? '#cc0022' : '#aa4400';
  ctx.fillRect(bx, by, 280 * pct, 14);
  ctx.strokeStyle = '#ff666688';
  ctx.lineWidth   = 1;
  ctx.strokeRect(bx, by, 280, 14);

  ctx.font      = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`TARGET ESCAPES IN ${secs}s`, canvas.width / 2, by + 11);
  ctx.restore();
}

// ============================================================
// GAUNTLET MODE  (type: 'gauntlet', fight chapter)
// ============================================================

function initGauntletMode(ch) {
  gauntletRound       = 1;
  gauntletTotalRounds = ch.gauntletRounds || 3;
  gauntletRoundDelay  = 0;
  gauntletActive      = true;
  window._gauntletCh  = ch;
}

function _spawnGauntletRound() {
  const ch      = window._gauntletCh;
  if (!ch || !players[0]) return;
  const p1      = players[0];

  const diffTiers = ['easy', 'medium', 'hard', 'expert'];
  const baseDiffIdx = diffTiers.indexOf(ch.aiDiff || 'medium');
  const roundDiff   = diffTiers[Math.min(3, baseDiffIdx + gauntletRound - 1)];

  const armored     = gauntletRound >= 2 ? ['helmet'] : [];
  if (gauntletRound >= 2) armored.push('chestplate');

  if (gauntletRound >= 3) {
    // Two expert armored enemies
    for (let i = 0; i < 2; i++) {
      _exploreSpawnEnemy({
        wx:       p1.x + 140 + i * 100,
        name:     ch.opponentName ? (ch.opponentName + ' Elite') : 'Gauntlet Elite',
        weaponKey: ch.weaponKey || 'sword',
        classKey:  ch.classKey || 'warrior',
        aiDiff:    'expert',
        color:     i === 0 ? (ch.opponentColor || '#994400') : '#663300',
        armor:     armored,
        health:    190,
        isElite:   true,
      }, p1);
    }
  } else {
    _exploreSpawnEnemy({
      wx:       p1.x + 140,
      name:     ch.opponentName || 'Gauntlet Opponent',
      weaponKey: ch.weaponKey || 'sword',
      classKey:  ch.classKey || 'warrior',
      aiDiff:    roundDiff,
      color:     ch.opponentColor || '#994400',
      armor:     armored,
      health:    gauntletRound === 1 ? 130 : 160,
      isElite:   gauntletRound >= 2,
    }, p1);
  }
  storyFightSubtitle = {
    text: `Round ${gauntletRound} / ${gauntletTotalRounds} — ${gauntletRound >= 3 ? 'FINAL ROUND' : 'Fight!'}`,
    timer: 200, maxTimer: 200,
    color: gauntletRound >= 3 ? '#ff4422' : '#ffcc44',
  };
}

function updateGauntletMode() {
  if (_modesGuard() || !gauntletActive || !storyModeActive) return;
  if (exploreGoalFound) return;

  if (gauntletRoundDelay > 0) {
    gauntletRoundDelay--;
    if (gauntletRoundDelay === 0) {
      if (gauntletRound > gauntletTotalRounds) {
        // All rounds cleared
        gauntletActive   = false;
        exploreGoalFound = true;
        storyFightSubtitle = {
          text: 'Gauntlet complete! All rounds cleared.',
          timer: 250, maxTimer: 250, color: '#ffffaa'
        };
        setTimeout(() => { if (!gameRunning) return; endGame(); }, 2200);
      } else {
        _spawnGauntletRound();
      }
    }
    return;
  }

  // Check if current round enemies are all dead
  const liveEnemies = minions.filter(m => m.health > 0).length +
    players.filter(p => p !== players[0] && p.health > 0 && p.isAI).length;

  if (liveEnemies === 0 && gauntletRound <= gauntletTotalRounds) {
    gauntletRound++;
    gauntletRoundDelay = 120; // 2s delay
    if (gauntletRound <= gauntletTotalRounds) {
      storyFightSubtitle = {
        text: `Round cleared! Round ${gauntletRound} incoming...`,
        timer: 110, maxTimer: 110, color: '#88ffcc'
      };
    }
  }
}

function drawGauntletHUD() {
  if (!gauntletActive || !storyModeActive) return;
  const ch = _activeStory2Chapter;
  if (!ch || ch.type !== 'gauntlet') return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font      = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = gauntletRound >= gauntletTotalRounds ? '#ff8844' : '#ffcc66';
  ctx.shadowColor = '#000';
  ctx.shadowBlur  = 6;
  ctx.fillText(`ROUND ${gauntletRound} / ${gauntletTotalRounds}`, canvas.width / 2, 28);
  ctx.restore();
}

// ============================================================
// SHIP FLIGHT MODE  (gameMode: 'shipflight')
// Completely new game mode — no normal fight/explore systems.
// ============================================================

function initShipFlight(ch) {
  shipFlightLen  = ch.shipFlightLength || 6000;
  shipFlightShip = {
    x:        120,
    y:        GAME_H / 2,
    vx:       0,
    vy:       0,
    hp:       ch.shipHP    || 100,
    maxHp:    ch.shipHP    || 100,
    bullets:  [],
    fireTimer: 0,
  };

  shipFlightEnemies = (ch.shipFlightEnemies || []).map(e => Object.assign({
    hp: 30, maxHp: 30, speed: 1.5, hitTimer: 0
  }, e));
  // Default enemies if none provided
  if (!shipFlightEnemies.length) {
    const count = ch.shipEnemyCount || 8;
    for (let i = 0; i < count; i++) {
      const ex = shipFlightLen * (0.2 + (i / count) * 0.75);
      shipFlightEnemies.push({
        x:       ex,
        y:       80 + Math.random() * (GAME_H - 160),
        hp:      i < count - 2 ? 30 : 60,
        maxHp:   i < count - 2 ? 30 : 60,
        speed:   1.2 + i * 0.08,
        hitTimer: 0,
      });
    }
  }

  // Generate parallax stars
  shipFlightStars = [];
  for (let i = 0; i < 120; i++) {
    shipFlightStars.push({
      x:     Math.random() * shipFlightLen,
      y:     Math.random() * GAME_H,
      size:  0.5 + Math.random() * 2,
      speed: 0.2 + Math.random() * 0.6,
    });
  }

  shipFlightScrollX = 0;
}

function updateShipFlight() {
  if (!gameRunning || !shipFlightShip) return;
  const ship = shipFlightShip;

  // Input
  const keys = window._keysDown || {};
  if (keys['w'] || keys['arrowup'])    ship.vy -= 0.4;
  if (keys['s'] || keys['arrowdown'])  ship.vy += 0.4;
  if (keys['a'] || keys['arrowleft'])  ship.vx -= 0.4;
  if (keys['d'] || keys['arrowright']) ship.vx += 0.4;

  // Fire
  ship.fireTimer = Math.max(0, ship.fireTimer - 1);
  if ((keys[' '] || keys['z'] || keys['j']) && ship.fireTimer <= 0) {
    ship.bullets.push({ x: ship.x + 22, y: ship.y, vx: 10, vy: 0 });
    ship.fireTimer = 12;
  }

  // Physics
  ship.vx = Math.min(Math.max(ship.vx, -5), 5) * 0.92;
  ship.vy = Math.min(Math.max(ship.vy, -5), 5) * 0.92;
  ship.x  = Math.max(20, ship.x + ship.vx);
  ship.y  = Math.max(10, Math.min(GAME_H - 30, ship.y + ship.vy));
  shipFlightScrollX = Math.max(shipFlightScrollX, ship.x - 150);

  // Bullets
  for (let i = ship.bullets.length - 1; i >= 0; i--) {
    const b = ship.bullets[i];
    b.x += b.vx; b.y += b.vy;
    if (b.x > shipFlightScrollX + canvas.width + 40) { ship.bullets.splice(i, 1); continue; }
    // Hit enemies
    let hit = false;
    for (const en of shipFlightEnemies) {
      if (en.hp <= 0) continue;
      if (Math.abs(b.x - en.x) < 20 && Math.abs(b.y - en.y) < 18) {
        en.hp      -= 10;
        en.hitTimer = 12;
        hit        = true;
        spawnParticles && spawnParticles(en.x, en.y, '#ffcc44', 5);
        break;
      }
    }
    if (hit) { ship.bullets.splice(i, 1); }
  }

  // Enemy movement + collision with ship
  for (const en of shipFlightEnemies) {
    if (en.hp <= 0) continue;
    en.x        -= en.speed;
    en.hitTimer  = Math.max(0, en.hitTimer - 1);
    // If enemy reaches ship
    if (en.x < shipFlightScrollX - 20) { en.hp = 0; continue; } // missed
    if (Math.abs(en.x - ship.x) < 26 && Math.abs(en.y - ship.y) < 22) {
      ship.hp -= 20;
      en.hp    = 0;
      screenShake = Math.max(screenShake || 0, 14);
      if (ship.hp <= 0) {
        ship.hp = 0;
        storyFightSubtitle = { text: 'Ship destroyed — mission failed!', timer: 220, maxTimer: 220, color: '#ff4422' };
        // End via players[0] lives if in story mode; otherwise just end
        if (players[0]) players[0].lives = 0;
        setTimeout(() => { if (!gameRunning) return; endGame(); }, 1400);
        return;
      }
    }
  }

  // Win condition: all enemies gone OR ship reaches end
  const anyAlive = shipFlightEnemies.some(e => e.hp > 0);
  if (!anyAlive || ship.x >= shipFlightLen - 200) {
    storyFightSubtitle = { text: 'Sector clear — escape route secured!', timer: 240, maxTimer: 240, color: '#ffffaa' };
    SoundManager && typeof SoundManager.superActivate === 'function' && SoundManager.superActivate();
    setTimeout(() => { if (!gameRunning) return; endGame(); }, 2200);
    shipFlightShip = null; // prevent re-trigger
    return;
  }
}

function drawShipFlight() {
  if (!gameRunning || !shipFlightShip) return;
  const ship = shipFlightShip;
  const t    = Date.now();

  // Clear canvas
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#00000e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Parallax stars
  for (const star of shipFlightStars) {
    const sx = ((star.x - shipFlightScrollX * star.speed) % canvas.width + canvas.width) % canvas.width;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t / 600 + star.x);
    ctx.fillStyle   = '#ffffff';
    ctx.fillRect(sx, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;

  // Progress bar at top
  const progPct = Math.min(1, ship.x / shipFlightLen);
  ctx.fillStyle = '#112233';
  ctx.fillRect(0, 0, canvas.width, 8);
  ctx.fillStyle = '#44aaff';
  ctx.fillRect(0, 0, canvas.width * progPct, 8);

  // Enemy ships
  const offX = -shipFlightScrollX;
  for (const en of shipFlightEnemies) {
    if (en.hp <= 0) continue;
    const ex  = en.x + offX;
    if (ex < -30 || ex > canvas.width + 30) continue;
    const flash = en.hitTimer > 0 ? 1 : 0;
    ctx.save();
    ctx.translate(ex, en.y);
    ctx.fillStyle   = flash ? '#ffffff' : '#cc2222';
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(10,  -12);
    ctx.lineTo(18,  0);
    ctx.lineTo(10,  12);
    ctx.closePath();
    ctx.fill();
    // HP bar
    const bpct = en.hp / en.maxHp;
    ctx.shadowBlur = 0;
    ctx.fillStyle  = '#440000';
    ctx.fillRect(-15, -20, 30, 4);
    ctx.fillStyle  = '#ff4422';
    ctx.fillRect(-15, -20, 30 * bpct, 4);
    ctx.restore();
  }

  // Player bullets
  ctx.save();
  ctx.strokeStyle = '#ffff44';
  ctx.lineWidth   = 3;
  ctx.shadowColor = '#ffff88';
  ctx.shadowBlur  = 6;
  for (const b of ship.bullets) {
    const bx = b.x + offX;
    ctx.beginPath();
    ctx.moveTo(bx - 12, b.y);
    ctx.lineTo(bx,      b.y);
    ctx.stroke();
  }
  ctx.restore();

  // Player ship (blue triangle)
  const sx = ship.x + offX;
  ctx.save();
  ctx.translate(sx, ship.y);
  ctx.fillStyle   = '#4488ff';
  ctx.shadowColor = '#88ccff';
  ctx.shadowBlur  = 14;
  ctx.beginPath();
  ctx.moveTo(22,  0);
  ctx.lineTo(-14, -14);
  ctx.lineTo(-8,  0);
  ctx.lineTo(-14, 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Hull integrity HUD
  const hullPct  = ship.hp / ship.maxHp;
  const hullColor = hullPct > 0.5 ? '#44ffcc' : hullPct > 0.25 ? '#ffcc44' : '#ff4422';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font      = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#aaccff';
  ctx.fillText('HULL INTEGRITY', 10, canvas.height - 28);
  ctx.fillStyle = '#222';
  ctx.fillRect(10, canvas.height - 22, 120, 10);
  ctx.fillStyle = hullColor;
  ctx.fillRect(10, canvas.height - 22, 120 * hullPct, 10);
  ctx.strokeStyle = '#ffffff44';
  ctx.lineWidth   = 1;
  ctx.strokeRect(10, canvas.height - 22, 120, 10);

  // Enemy count
  const remaining = shipFlightEnemies.filter(e => e.hp > 0).length;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ff8888';
  ctx.fillText(`ENEMIES: ${remaining}`, canvas.width - 10, canvas.height - 18);
  ctx.restore();
}

function _launchShipFlightChapter(ch) {
  const _storyModal = document.getElementById('storyModal');
  if (_storyModal) _storyModal.style.display = 'none';

  worldId        = getWorldForChapter(ch.id);
  currentWorld   = STORY_WORLDS[worldId] || null;
  worldModifiers = null; // no world modifiers in ship flight

  storyModeActive     = true;
  storyCurrentLevel   = Math.min(8, Math.floor(ch.id / 5) + 1);
  storyFightScript    = ch.fightScript || [];
  storyFightScriptIdx = 0;
  storyFightSubtitle  = null;
  if (ch.preText) {
    storyFightSubtitle = { text: ch.preText, timer: 220, maxTimer: 220, color: '#dde8ff' };
  }

  if (typeof selectLives === 'function') selectLives(ch.playerLives || 3);
  infiniteMode = false;
  gameMode     = 'shipflight';
  p2IsBot      = false;
  players      = [];
  minions      = [];
  projectiles  = [];

  // Use a minimal arena so startGame doesn't crash
  const arenaKey      = '__shipflight__';
  ARENAS[arenaKey]    = {
    sky: ['#000010', '#000020'],
    groundColor: '#000',
    platColor: '#000',
    worldWidth: GAME_W,
    mapLeft: 0,
    mapRight: GAME_W,
    deathY: 9999,
    isStoryOnly: true,
    platforms: [{ x: 0, y: GAME_H + 50, w: GAME_W, h: 20, isFloor: true }],
  };
  if (typeof ARENA_BASE_PLATFORMS !== 'undefined') {
    ARENA_BASE_PLATFORMS[arenaKey] = ARENAS[arenaKey].platforms.map(p => ({ ...p }));
  }
  selectedArena = arenaKey;

  if (typeof setObjective === 'function') setObjective('Destroy all enemy ships');
  if (typeof startGame === 'function') startGame();

  // Hide the player sprite (ship flight is its own draw system)
  setTimeout(() => {
    if (players[0]) { players[0].health = players[0].maxHealth; players[0].invincible = 99999; }
    initShipFlight(ch);
    // Track keys in ship-flight-compatible way
    if (!window._keysDown) {
      window._keysDown = {};
      document.addEventListener('keydown', e => { window._keysDown[e.key.toLowerCase()] = true; });
      document.addEventListener('keyup',   e => { delete window._keysDown[e.key.toLowerCase()]; });
    }
  }, 80);
}

// ============================================================
// ESCORT MODE  (gameMode: 'escort')
// initEscortMode is called by _launchEscortChapter (smb-story-engine-flow.js)
// ============================================================

function initEscortMode(ch) {
  if (!players[0]) return;
  const p1   = players[0];
  const npc  = ch.escortNPC || {};

  escortNPCHP    = npc.hp    || 200;
  escortNPCMaxHP = escortNPCHP;
  escortGoalX    = ch.escortGoalX || (ch.worldLength || 5200) - 400;

  // Build a Fighter-like target wrapper (not a real Fighter — avoids circular deps)
  escortNPCTarget = {
    x:          p1.x + 60,
    y:          p1.y,
    w:          28,
    h:          50,
    vx:         0,
    vy:         0,
    health:     escortNPCHP,
    maxHealth:  escortNPCMaxHP,
    isAI:       false,
    isNPC:      true,
    isEscortNPC: true,
    color:       npc.color || '#88ccff',
    name:        npc.name  || 'Ally',
    cx() { return this.x + this.w / 2; },
    cy() { return this.y + this.h / 2; },
    _speed:      1.5,
    _stuckTimer: 0,
    _walkPhase:  0,
  };
  storyFightSubtitle = {
    text: `Escort ${escortNPCTarget.name} to safety!`,
    timer: 200, maxTimer: 200, color: '#88ccff',
  };
}

function updateEscortMode() {
  if (!gameRunning || !players[0] || !escortNPCTarget) return;
  const p1  = players[0];
  const npc = escortNPCTarget;

  // NPC death
  if (npc.health <= 0) {
    npc.health = 0;
    storyFightSubtitle = { text: `${npc.name} has fallen — mission failed.`, timer: 220, maxTimer: 220, color: '#ff4422' };
    p1.lives = 0;
    screenShake = 22;
    escortNPCTarget = null;
    setTimeout(() => { if (!gameRunning) return; endGame(); }, 1400);
    return;
  }

  // Win condition
  if (npc.x >= escortGoalX) {
    storyFightSubtitle = { text: `${npc.name} reached safety!`, timer: 240, maxTimer: 240, color: '#ffffaa' };
    SoundManager && typeof SoundManager.superActivate === 'function' && SoundManager.superActivate();
    escortNPCTarget = null;
    setTimeout(() => { if (!gameRunning) return; endGame(); }, 2200);
    return;
  }

  // Movement: walk right but stop if player is far behind
  const playerGap = p1.x - npc.x;
  if (playerGap > -200) {
    npc.vx = npc._speed;
  } else {
    npc.vx = 0; // wait for player
  }
  npc._walkPhase++;
  npc.x += npc.vx;

  // Gravity (simple)
  npc.vy += 0.55;
  npc.y  += npc.vy;
  // Floor collision (ground = y ~440)
  if (npc.y + npc.h >= 440) {
    npc.y  = 440 - npc.h;
    npc.vy = 0;
  }

  // Enemies target NPC if closer to NPC than to player
  for (const m of minions) {
    if (!m || m.health <= 0) continue;
    const dxNPC    = Math.abs(m.cx() - npc.cx());
    const dxPlayer = Math.abs(m.cx() - p1.cx());
    if (dxNPC < dxPlayer && typeof m._escortAI === 'undefined') {
      m._escortAI = true;
      m._targetNPC = true;
    }
    if (m._targetNPC) {
      // Simple NPC damage (direct, per spec — NPC is not a real Fighter)
      if (!m._npcHitTimer || m._npcHitTimer <= 0) {
        if (dxNPC < 60) {
          npc.health  = Math.max(0, npc.health - 8);
          m._npcHitTimer = 50;
          escortNPCHP    = npc.health;
          screenShake    = Math.max(screenShake || 0, 4);
        }
      }
      if (m._npcHitTimer > 0) m._npcHitTimer--;
    }
  }
}

function drawEscortNPC() {
  if (!escortNPCTarget) return;
  const npc  = escortNPCTarget;
  const pct  = npc.health / npc.maxHealth;
  const color = npc.color || '#88ccff';

  ctx.save();
  // Stickman-style body
  ctx.strokeStyle = color;
  ctx.lineWidth   = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur  = 6;

  // Head
  ctx.beginPath();
  ctx.arc(npc.x + npc.w / 2, npc.y + 10, 8, 0, Math.PI * 2);
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.moveTo(npc.x + npc.w / 2, npc.y + 18);
  ctx.lineTo(npc.x + npc.w / 2, npc.y + 36);
  ctx.stroke();

  // Arms
  const walkArmSwing = Math.sin(npc._walkPhase * 0.15) * 8;
  ctx.beginPath();
  ctx.moveTo(npc.x + npc.w / 2, npc.y + 22);
  ctx.lineTo(npc.x + npc.w / 2 - 12, npc.y + 30 + walkArmSwing);
  ctx.moveTo(npc.x + npc.w / 2, npc.y + 22);
  ctx.lineTo(npc.x + npc.w / 2 + 12, npc.y + 30 - walkArmSwing);
  ctx.stroke();

  // Legs
  const walkLegSwing = Math.sin(npc._walkPhase * 0.15) * 8;
  ctx.beginPath();
  ctx.moveTo(npc.x + npc.w / 2, npc.y + 36);
  ctx.lineTo(npc.x + npc.w / 2 - 8, npc.y + 50 + walkLegSwing);
  ctx.moveTo(npc.x + npc.w / 2, npc.y + 36);
  ctx.lineTo(npc.x + npc.w / 2 + 8, npc.y + 50 - walkLegSwing);
  ctx.stroke();

  // HP bar above NPC
  const barW = 40;
  const barX = npc.x + (npc.w - barW) / 2;
  const barY = npc.y - 18;
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#222';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, 8);
  ctx.fillStyle   = pct > 0.5 ? '#44ffcc' : pct > 0.25 ? '#ffcc44' : '#ff4422';
  ctx.fillRect(barX, barY, barW * pct, 6);

  // Name label
  ctx.globalAlpha = 0.85;
  ctx.font        = '8px monospace';
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#ffffff';
  ctx.shadowBlur  = 0;
  ctx.fillText(npc.name || 'Ally', npc.x + npc.w / 2, npc.y - 22);
  ctx.restore();
}

function drawEscortHUD() {
  if (!escortNPCTarget) return;
  const npc = escortNPCTarget;
  const pct = npc.health / npc.maxHealth;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font      = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#88ccff';
  ctx.fillText(`${npc.name || 'NPC'} HP: ${Math.max(0, Math.round(npc.health))}/${npc.maxHealth}`, canvas.width - 10, 28);
  // Small bar
  const bx = canvas.width - 130;
  const by = 32;
  ctx.fillStyle = '#222';
  ctx.fillRect(bx, by, 120, 7);
  ctx.fillStyle = pct > 0.5 ? '#44ffcc' : '#ff8844';
  ctx.fillRect(bx, by, 120 * pct, 7);
  ctx.restore();
}

// ============================================================
// drawExploreWorldModeOverlay — dispatches world-space per-mode draw functions
// Called from gameLoop BEFORE ctx.setTransform reset (camera transform still active)
// ============================================================

function drawExploreWorldModeOverlay() {
  const ch = _activeStory2Chapter;
  if (!ch || !exploreActive) return;
  switch (ch.exploreMode) {
    case 'escape':   drawEscapeModeOverlay();  break;
    case 'stealth':  drawStealthModeOverlay(); break;
    case 'defense':  drawDefenseNexus();       break;
    case 'scavenge': drawScavengeItems();      break;
    case 'puzzle':   drawPuzzleSwitches();     break;
  }
}

// drawExploreModeOverlay — dispatches screen-space per-mode HUD draw functions
// Called from gameLoop (screen space, after ctx reset)
// ============================================================

function drawExploreModeOverlay() {
  const ch = _activeStory2Chapter;
  if (!ch || !exploreActive) return;
  switch (ch.exploreMode) {
    case 'scavenge': drawScavengeHUD(); break;
  }
}
