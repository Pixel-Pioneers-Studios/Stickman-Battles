'use strict';

const MAX_PARTICLES = 400;

// ─── Spawn ────────────────────────────────────────────────────────────────────
function spawnParticles(x, y, color, count, opts = {}) {
  for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
    const angle = opts.angle !== undefined
      ? opts.angle + (Math.random() - 0.5) * (opts.spread ?? 1.0)
      : Math.random() * Math.PI * 2;
    const spd = (opts.speed ?? 4) * (0.5 + Math.random() * 0.8);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * spd + (opts.vx ?? 0),
      vy: Math.sin(angle) * spd + (opts.vy ?? 0),
      color,
      life:    opts.life    ?? (18 + Math.floor(Math.random() * 14)),
      maxLife: opts.maxLife ?? 32,
      size:    opts.size    ?? (2 + Math.random() * 3),
      gravity: opts.gravity !== false,
      square:  opts.square  ?? false,
    });
  }
}

// ─── Preset effects ───────────────────────────────────────────────────────────
function spawnHitSpark(x, y, facing) {
  const angle = facing > 0 ? 0 : Math.PI;
  spawnParticles(x, y, '#ffffaa', 5, { angle, spread: 0.9, speed: 7, life: 12, maxLife: 12, size: 2 });
  spawnParticles(x, y, '#ff9933', 3, { angle, spread: 1.2, speed: 4, life: 10, maxLife: 10, size: 3 });
}

function spawnHeavyImpact(x, y) {
  spawnParticles(x, y, '#ffffff', 8, { speed: 9, life: 16, maxLife: 16, size: 3 });
  spawnParticles(x, y, '#ff5511', 6, { speed: 6, life: 20, maxLife: 20, size: 4 });
  spawnParticles(x, y, '#ffcc00', 4, { speed: 4, life: 24, maxLife: 24, size: 5, square: true });
}

function spawnBloodPuff(x, y, facing) {
  const angle = facing > 0 ? 0 : Math.PI;
  spawnParticles(x, y, '#cc1111', 6, { angle, spread: 1.4, speed: 5, vy: -2, life: 22, maxLife: 22, size: 3 });
}

function spawnDustPuff(x, y) {
  spawnParticles(x, y, '#aaaaaa', 5, {
    angle: -Math.PI / 2, spread: 1.5, speed: 2, vy: -1, life: 18, maxLife: 18, size: 4, gravity: false,
  });
}

function spawnVoidFlicker(x, y) {
  // Used for dimensional scouts and the portal
  spawnParticles(x, y, '#5533ff', 4, { speed: 3, life: 20, maxLife: 20, size: 3 });
  spawnParticles(x, y, '#aabbff', 3, { speed: 6, life: 14, maxLife: 14, size: 2 });
}

function spawnVoidBurst(x, y) {
  // Large radial explosion — scout death + super move activation
  spawnParticles(x, y, '#ffffff', 8,  { speed: 14, life: 10, maxLife: 10, size: 3, gravity: false });
  spawnParticles(x, y, '#9977ff', 14, { speed: 9,  life: 24, maxLife: 24, size: 5 });
  spawnParticles(x, y, '#4433cc', 10, { speed: 5,  life: 32, maxLife: 32, size: 7, square: true });
  spawnParticles(x, y, '#ccbbff', 6,  { speed: 16, life: 8,  maxLife: 8,  size: 2, gravity: false });
}

// ─── Update & draw ────────────────────────────────────────────────────────────
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x  += p.vx;
    p.y  += p.vy;
    p.vx *= 0.88;
    if (p.gravity) p.vy += 0.28;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = p.color;
    const sx = p.x - camX;
    if (p.square) {
      ctx.fillRect(sx - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else {
      ctx.beginPath();
      ctx.arc(sx, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
