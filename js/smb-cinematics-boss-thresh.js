'use strict';
// smb-cinematics-boss-thresh.js — Boss mid-fight cinematics: 75%, 40%, 10% HP thresholds
// Depends on: smb-cinematics-core.js (cinScript, CinFX, CinCam)
// ============================================================
// MID-FIGHT CINEMATICS — Creator Boss (75%, 40%, 10%)
// ============================================================

function _makeBossWarning75Cinematic(boss) {
  // Track whether the speed-line burst has fired (it should only render for ~0.4s)
  let _riseLineFired = false;

  return cinScript({
    duration: 3.2,
    label:    { text: '— I MADE THIS WORLD —', color: '#aa44ff' },

    slowMo: [[0, 1.0], [0.35, 0.06], [2.8, 0.06], [3.2, 1.0]],

    cam: [
      [0,    { zoomTo: 1.0, focusOn: () => boss }],
      [0.3,  { zoomTo: 1.55, focusOn: () => boss }],
      [1.8,  { zoomTo: 1.3, focusX: GAME_W / 2, focusY: GAME_H / 2 }],
      [2.8,  { zoomTo: 1.0, focusX: GAME_W / 2, focusY: GAME_H / 2 }],
    ],

    steps: [
      { at: 0.3,
        run({ boss }) {
          if (!boss) return;
          boss.vy = -8;
          _riseLineFired = true;
          CinFX.particles(boss.cx(), boss.cy(), '#aa44ff', 25);
          CinFX.particles(boss.cx(), boss.cy(), '#ffffff', 12);
          CinFX.shake(18);
        }
      },
      { at: 0.5,
        fx: { shockwave: { x: () => boss ? boss.cx() : GAME_W/2,
                           y: () => boss ? boss.cy() : GAME_H/2,
                           color: '#aa44ff', count: 3, maxR: 240 } }
      },
      { at: 0.5, run() { CinFX.arenaHazardNow(); } },
      { at: 0.6, dialogue: 'This world existed before you arrived.', dialogueDur: 160 },
      { at: 1.0,
        fx: { shockwave: { x: GAME_W / 2, y: GAME_H / 2,
                           color: '#cc00ee', count: 2, maxR: 380, dur: 90 } }
      },
      { at: 1.7, dialogue: 'I wrote the rules. I can revise them.', dialogueDur: 180 },
      { at: 1.75,
        fx: { flash: { color: '#aa44ff', alpha: 0.35, dur: 10 },
              screenShake: 22 }
      },
      { at: 2.6,
        run({ boss }) {
          if (boss) CinFX.particles(boss.cx(), boss.cy(), '#cc00ee', 18);
        }
      },
    ],

    onDraw(ctx, t) {
      if (typeof AniFX === 'undefined') return;
      const b = players ? players.find(p => p.isBoss && p.health > 0) : null;

      // Pulsing aura throughout the cinematic
      if (b) AniFX.aura(ctx, b, t, { color: '#aa44ff', rings: 2, orbits: 6 });

      // Speed-line burst on boss rise (0.28–0.7s), fading out
      if (_riseLineFired && t > 0.28 && t < 0.7 && b) {
        const fade = 1 - (t - 0.28) / 0.42;
        AniFX.speedLines(ctx, b, {
          count: 50, minLen: 35, maxLen: 130,
          color: '#cc66ff', alpha: 0.5 * fade,
        });
      }

      // Charge glow building in the final beat (2.0–2.6s)
      if (t > 2.0 && t < 2.6 && b) {
        AniFX.charge(ctx, b, (t - 2.0) / 0.6 * 0.6, { color: '#aa44ff' });
      }
    },
  });
}


function _makeBossRage40Cinematic(boss) {
  let _throwTarget = null;
  // Rolling afterimage buffers (oldest → newest)
  const _trailBoss   = [];
  const _trailTarget = [];
  let _panelActive   = false;

  return cinScript({
    duration: 4.2,
    label: { text: '— ENOUGH. —', color: '#ff0044' },

    slowMo: [[0, 1.0], [0.4, 0.05], [0.45, 0.05], [1.1, 0.50], [1.7, 0.05], [3.8, 0.06], [4.2, 1.0]],

    cam: [
      // Tight zoom on boss at start
      [0,   { zoomTo: 1.0, focusOn: () => boss }],
      [0.3, { zoomTo: 1.85, focusOn: () => boss }],
      // During throw: track the flying player
      [0.45, { zoomTo: 1.2, focusOn: () => _throwTarget || (players && players.find(p => !p.isBoss && p.health > 0)) }],
      // Zoom out to reveal the slam landing
      [1.0, { zoomTo: 0.95, focusX: GAME_W / 2, focusY: GAME_H / 2 }],
      // Settle back during dialogue
      [1.8, { zoomTo: 1.35, focusOn: () => boss }],
      [3.8, { zoomTo: 1.0,  focusX: GAME_W / 2, focusY: GAME_H / 2 }],
    ],

    steps: [
      // Pre-grab: boss glows red
      { at: 0.25,
        run({ boss }) {
          if (!boss) return;
          CinFX.particles(boss.cx(), boss.cy(), '#ff0044', 20);
          CinFX.shake(14);
        }
      },
      // Teleport boss directly behind the player and hurl them
      { at: 0.42,
        run({ boss, target }) {
          if (!boss || !target) return;
          _throwTarget = target;
          // Teleport boss to just behind the player's back
          const facingRight = target.vx >= 0;
          const behindX     = facingRight ? target.cx() - 52 : target.cx() + 52;
          boss.x  = behindX - boss.w / 2;
          boss.y  = target.y;
          boss.vy = 0;
          // Portal burst at new boss position
          CinFX.particles(boss.cx(), boss.cy(), '#cc00ee', 40);
          CinFX.particles(boss.cx(), boss.cy(), '#ff44ff', 18);
          CinFX.shake(24);
          CinFX.flash('#ff2200', 0.25, 8);
          // Hurl player away — arc across the arena
          const throwDir = facingRight ? 1 : -1;
          target.vx       = throwDir * 20;
          target.vy       = -13;
          target.hurtTimer  = Math.max(target.hurtTimer || 0, 32);
          target.stunTimer  = Math.max(target.stunTimer  || 0, 28);
        }
      },
      // Trail particles chasing the thrown player during flight (two pulses)
      { at: 0.65,
        run() {
          if (_throwTarget) CinFX.particles(_throwTarget.cx(), _throwTarget.cy(), '#ff4400', 22);
        }
      },
      { at: 0.90,
        run() {
          if (_throwTarget) CinFX.particles(_throwTarget.cx(), _throwTarget.cy(), '#ff8800', 15);
        }
      },
      // Boss slam: boss drops hard toward where the player will land
      { at: 1.1,
        run({ boss }) {
          if (!boss) return;
          boss.vy = 30; // hard slam down
          CinFX.flash('#ffffff', 0.45, 10);
          CinFX.shake(52);
        }
      },
      // Shockwave + ground cracks at impact zone
      { at: 1.15,
        fx: {
          shockwave:   { x: () => boss ? boss.cx() : GAME_W/2,
                         y: GAME_H - 60, color: '#ff0044', count: 5, maxR: 320, lw: 5, dur: 80 },
          groundCrack: { x: () => boss ? boss.cx() : GAME_W/2,
                         y: GAME_H - 65, color: '#cc2200', count: 7 },
        }
      },
      // Shockwave knocks the thrown player further
      { at: 1.15,
        run({ boss }) {
          if (!boss) return;
          CinFX.particles(boss.cx(), GAME_H - 60, '#ff0044', 55);
          CinFX.particles(boss.cx(), GAME_H - 60, '#ffffff', 28);
          for (const p of players) {
            if (p.isBoss || p.health <= 0) continue;
            const dir = p.cx() >= boss.cx() ? 1 : -1;
            p.vx += dir * 13;
            p.vy  = Math.min(p.vy || 0, -9);
            p.hurtTimer = Math.max(p.hurtTimer || 0, 18);
          }
        }
      },
      { at: 1.55, dialogue: 'I\'m done being generous.',  dialogueDur: 140 },
      { at: 2.30, dialogue: 'You don\'t get to leave.',   dialogueDur: 220 },
      { at: 2.35, fx: { flash: { color: '#ff0044', alpha: 0.3, dur: 8 }, screenShake: 26 } },
      // Mark panel window closed
      { at: 1.25, run() { _panelActive = false; } },
    ],

    onDraw(ctx, t) {
      if (typeof AniFX === 'undefined') return;
      const b   = players ? players.find(p => p.isBoss && p.health > 0) : null;
      const tgt = _throwTarget;

      // Collect afterimage positions during the teleport + throw phase
      if (b && t > 0.4 && t < 1.5) {
        _trailBoss.push({ wx: b.cx(), wy: b.y + (b.h || 60), color: b.color || '#cc00ee' });
        if (_trailBoss.length > 7) _trailBoss.shift();
      }
      if (tgt && t > 0.42 && t < 1.25) {
        _trailTarget.push({ wx: tgt.cx(), wy: tgt.y + (tgt.h || 60), color: tgt.color || '#ffffff' });
        if (_trailTarget.length > 7) _trailTarget.shift();
        _panelActive = true;
      }

      // Afterimage trails
      if (_trailBoss.length > 1)   AniFX.afterimage(ctx, _trailBoss,   { tint: '#ff0066', alpha: 0.32 });
      if (_trailTarget.length > 1) AniFX.afterimage(ctx, _trailTarget, { alpha: 0.25 });

      // Manga panel split during the throw arc
      if (_panelActive && t > 0.55 && t < 1.25) {
        const inOut = Math.min(1, (t - 0.55) / 0.18) * Math.min(1, (1.25 - t) / 0.18);
        AniFX.panels(ctx, 3, { alpha: inOut * 0.82, lw: 11 });
      }

      // Speed-line burst at the slam impact (1.1–1.4s)
      if (t > 1.1 && t < 1.4 && b) {
        const fade = 1 - (t - 1.1) / 0.3;
        AniFX.speedLines(ctx, b, {
          count: 60, minLen: 55, maxLen: 200,
          color: '#ff0044', alpha: 0.7 * fade,
        });
      }

      // Slash mark at the exact impact moment (1.1–1.22s)
      if (t > 1.1 && t < 1.22 && b) {
        const s = _cinWorldToScreen(b.cx(), b.y + (b.h || 60));
        AniFX.slashMark(ctx, s.x, s.y, Math.PI * 0.25, {
          color: '#ff0044', len: 90, lw: 5, alpha: (1.22 - t) / 0.12,
        });
      }

      // Red charge glow during final dialogue
      if (t > 2.0 && b) {
        AniFX.charge(ctx, b, Math.min(1, (t - 2.0) / 1.0) * 0.55, { color: '#ff0044' });
      }
    },
  });
}


function _makeBossDesp10Cinematic(boss) {
  let _screenLinePulse = 0; // tracks last pulse timestamp for screen speed lines

  return cinScript({
    duration: 3.5,
    label: { text: '— IMPOSSIBLE —', color: '#ff8800' },

    slowMo: [[0, 1.0], [0.3, 0.05], [3.1, 0.05], [3.5, 1.0]],

    cam: [
      [0,   { zoomTo: 1.0, focusX: GAME_W / 2, focusY: GAME_H / 2 }],
      [0.25, { zoomTo: 1.6, focusOn: () => boss }],
      [2.8,  { zoomTo: 1.0, focusX: GAME_W / 2, focusY: GAME_H / 2 }],
    ],

    steps: [
      // Boss staggers — visual jolt
      { at: 0.3,
        run({ boss }) {
          if (!boss) return;
          boss.vx += (Math.random() - 0.5) * 10;
          boss.vy  = -5;
          boss.hurtTimer = Math.max(boss.hurtTimer || 0, 18);
          CinFX.particles(boss.cx(), boss.cy(), '#ff8800', 30);
          CinFX.particles(boss.cx(), boss.cy(), '#ffff00', 15);
          CinFX.shake(30);
          CinFX.flash('#ff8800', 0.30, 12);
        }
      },
      // Ground cracks radiate from boss impact
      { at: 0.35,
        fx: {
          groundCrack: { x: () => boss ? boss.cx() : GAME_W/2,
                         y: GAME_H - 65, color: '#cc4400', count: 9 },
          shockwave:   { x: () => boss ? boss.cx() : GAME_W/2,
                         y: () => boss ? boss.cy() : GAME_H/2,
                         color: '#ff6600', count: 4, maxR: 260 }
        }
      },
      // Desperation mode activates
      { at: 0.5,
        run() {
          if (typeof bossDesperationMode !== 'undefined') bossDesperationMode = true;
          CinFX.particles(GAME_W / 2, GAME_H / 2, '#ff8800', 40);
          CinFX.shake(20);
        }
      },
      // Red arena tint rings
      { at: 0.6,
        fx: { shockwave: { x: GAME_W / 2, y: GAME_H / 2,
                           color: '#ff4400', count: 3, maxR: 450, dur: 100 } }
      },
      { at: 1.0, dialogue: 'You\'re still here.',        dialogueDur: 160 },
      { at: 1.85, dialogue: 'Most things break. You don\'t.', dialogueDur: 200 },
      { at: 1.9,
        fx: { flash: { color: '#ff8800', alpha: 0.40, dur: 10 }, screenShake: 32 }
      },
      { at: 2.6,
        fx: { groundCrack: { x: GAME_W / 2, y: GAME_H - 65, color: '#ff4400', count: 6 } }
      },
    ],

    onDraw(ctx, t) {
      if (typeof AniFX === 'undefined') return;
      const b = players ? players.find(p => p.isBoss && p.health > 0) : null;

      // Unstable aura throughout — intensity increases with time
      if (b) {
        const intensity = 0.5 + (t / 3.5) * 0.5;
        AniFX.aura(ctx, b, t, {
          color:  '#ff8800',
          rings:  Math.round(2 + intensity * 2),
          orbits: Math.round(6 + intensity * 6),
          radius: (b.h || 60) * (0.8 + intensity * 0.4),
        });
      }

      // Screen-wide speed-line pulses every ~0.6s (desperation energy bursts)
      const pulseInterval = 0.6;
      if (t - _screenLinePulse >= pulseInterval && t > 0.3) {
        _screenLinePulse = t;
      }
      const sincePulse = t - _screenLinePulse;
      if (sincePulse < 0.25) {
        const fade = 1 - sincePulse / 0.25;
        AniFX.screenSpeedLines(ctx, { color: '#ff6600', alpha: 0.22 * fade });
      }

      // Building charge in the final stretch (2.5–3.5s)
      if (t > 2.5 && b) {
        AniFX.charge(ctx, b, (t - 2.5) / 1.0 * 0.7, { color: '#ff8800' });
      }
    },
  });
}


