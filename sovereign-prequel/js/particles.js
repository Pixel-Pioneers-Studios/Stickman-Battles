'use strict';

function spawnMote(x, y, opt) {
  const o = opt || {};
  particles.push({
    x, y,
    vx: o.vx ?? rnd(-0.2, 0.2),
    vy: o.vy ?? rnd(-0.12, -0.02),
    life: o.life ?? 200,
    maxLife: o.life ?? 200,
    size: o.size ?? rnd(0.8, 1.8),
    color: o.color ?? 'rgba(214,198,160,',
  });
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy;
    if (--p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    const a = (p.life / p.maxLife) * 0.5;
    ctx.fillStyle = p.color + a.toFixed(3) + ')';
    ctx.fillRect(p.x - camX, p.y, p.size, p.size);
  }
}
