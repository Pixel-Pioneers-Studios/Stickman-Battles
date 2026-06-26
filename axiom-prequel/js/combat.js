'use strict';

// ─── Central damage function ──────────────────────────────────────────────────
// All damage in the game goes through here. Never mutate .health directly.
//
// attacker  — the entity dealing damage (Axiom, Companion, or null for hazards)
// target    — entity receiving damage (Enemy or Axiom)
// damage    — base damage value
// kbForce   — knockback magnitude (0 = no knockback)
// launch    — true = hard launch (knockdown); false = light stagger
function dealDamage(attacker, target, damage, kbForce, launch) {
  if (!target || target.health <= 0) return;
  if (target.invincibleFrames > 0)   return;

  // Blocking: Enforcers/Lieutenants absorb 60% of damage when their arms are up,
  // but only when the attack comes from the front (attacker is in the direction they're facing).
  // Attacks from behind or above bypass the block entirely.
  let actualDamage = damage;
  let actualLaunch = launch;
  if (target.blocking && attacker) {
    const attackFromFront = (attacker.cx() - target.cx()) * target.facing > -20;
    if (attackFromFront) {
      actualDamage = Math.ceil(damage * 0.4);
      actualLaunch = false;  // blocked hits can't knock down
    }
  } else if (target.blocking && !attacker) {
    // Hazard/environmental damage always bypasses block
  }

  target.health -= actualDamage;
  if (target.health < 0) target.health = 0;

  // Knockback direction: away from attacker; fall back to target.facing flip
  let kbDir = 1;
  if (attacker) {
    kbDir = (target.cx() - attacker.cx()) >= 0 ? 1 : -1;
  }

  if (kbForce > 0) {
    target.vx = kbDir * (target.blocking ? kbForce * 0.3 : kbForce);
    target.vy = actualLaunch ? -8 : -3;
  }

  target.invincibleFrames = actualLaunch ? 22 : 12;

  if (actualLaunch || actualDamage >= 18) {
    target.enterKnockdown?.();
  } else {
    target.enterHurt?.();
  }

  // Build super meter for Axiom when he lands a hit
  if (attacker === axiomPlayer) {
    axiomPlayer.superMeter = Math.min(axiomPlayer.maxSuper, axiomPlayer.superMeter + actualDamage * 0.4);
    // Track combo streak
    comboCount++;
    comboDisplayTimer = 110;
  }
  // Build super meter for Axiom when he takes a hit; reset combo
  if (target === axiomPlayer) {
    axiomPlayer.superMeter = Math.min(axiomPlayer.maxSuper, axiomPlayer.superMeter + damage * 0.3);
    comboCount = 0;
    comboDisplayTimer = 0;
  }
}

// ─── AABB overlap check ───────────────────────────────────────────────────────
function overlaps(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

// ─── Platform collision helper (shared by all entities) ───────────────────────
// Returns true if the entity landed on a platform this call.
// Uses sweep detection: catches both high-speed tunneling and the case where
// an entity spawns with its feet already inside a platform.
function applyPlatformCollisions(entity) {
  let grounded = false;
  for (const p of platforms) {
    // Horizontal overlap
    if (entity.x + entity.w <= p.x || entity.x >= p.x + p.w) continue;

    const feet    = entity.y + entity.h;
    const platTop = p.y;
    const platBot = p.y + p.h;

    if (entity.vy >= 0) {
      // Feet position BEFORE this frame's movement was applied
      const prevFeet = feet - entity.vy;
      // Crossed platform top this frame (sweep), OR spawned straddling it
      const crossed  = prevFeet <= platTop && feet >= platTop;
      const embedded = entity.y < platTop && feet > platTop;
      if (crossed || embedded) {
        entity.y  = platTop - entity.h;
        entity.vy = 0;
        grounded  = true;
      }
    } else {
      // Moving upward — ceiling bump
      const prevHead = entity.y - entity.vy;
      if (prevHead >= platBot && entity.y <= platBot) {
        entity.y  = platBot;
        entity.vy = 0;
      }
    }
  }
  return grounded;
}
