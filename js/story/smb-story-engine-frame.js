'use strict';
// smb-story-engine-frame.js: Per-frame: storyCheckEvents, onEnemyDeath, syncDistort, resetState, boundaries
// Depends on: smb-globals.js, smb-story-registry.js (and preceding story-engine splits)

// Polls per-frame state and fires events when thresholds are crossed. Call after physics/combat.
function storyCheckEvents() {
  if (!storyModeActive || !gameRunning) return;

  const ch  = _activeStory2Chapter;
  const chId = ch ? ch.id : (storyState.chapter - 1);
  const p1  = players && players[0];
  if (!p1) return;

  if (p1.health > 0 && p1.health / p1.maxHealth < 0.20) {
    triggerEvent('SURVIVAL_EVENT', { player: p1 });
  }

  // REALITY_BREAK: chapters 8+ ambient distortion.
  if (chId >= 8 && !storyEventFired['REALITY_BREAK']) {
    triggerEvent('REALITY_BREAK', { chapterId: chId });
  }

  // Called from checkDeaths() via storyOnEnemyDeath.

  if (chId >= 3 && !storyEventFired['ABILITY_UNLOCK'] && !storyState.abilities.weaponAbility) {
    if (p1.abilityCooldown > 0) {
      triggerEvent('ABILITY_UNLOCK', { player: p1 });
    }
  }

  // SUPER_UNLOCK: chapter 5 (Lava Crossing), on first super meter fire.
  if (chId >= 5 && !storyEventFired['SUPER_UNLOCK'] && !storyState.abilities.superMeter) {
    if (p1.superMeter >= (p1.maxSuperMeter || 100)) {
      triggerEvent('SUPER_UNLOCK', { player: p1 });
    }
  }

  // Fires once per fight (10% chance) when past chapter 60 to build TrueForm tension.
  if (chId >= 60 && !storyEventFired['FALLEN_WARRIOR'] && frameCount === 180) {
    if (Math.random() < 0.10) triggerScene('fallen_warrior_memory');
  }

  // Axiom encounter (ch 63): invincible, then a scripted defeat at 20s.
  // Phase expansion reassigns ch.id; the original id lives in ch._origId.
  if (ch && (ch._origId !== undefined ? ch._origId : ch.id) === 63 && !ch.noFight) {
    const _axiom = players && players.find(p => p !== p1 && p.isBoss);
    if (_axiom && _axiom.health > 0) {
      _axiom.invincible = Math.max(_axiom.invincible || 0, 10);
      _axiom.health     = _axiom.maxHealth; // undo damage: hits connect visually but deal nothing
    }
    // Frame 1200 (~20s): Axiom ends the encounter with one scripted strike.
    // Use Axiom as attacker so the env-damage cap (14/frame) doesn't nerf the kill.
    if (frameCount >= 1200 && p1.health > 0 && !_axiomForcedPlayerLoss) {
      _axiomForcedPlayerLoss = true;
      dealDamage(_axiom || null, p1, p1.maxHealth * 99, 80);
    }
  }

  if (storyFreezeTimer > 0) storyFreezeTimer--;

  if (typeof storyTickAbilities === 'function') storyTickAbilities();

  if (typeof _interludeActive !== 'undefined' && _interludeActive) {
    if (typeof updateInterlude === 'function') updateInterlude();
    // Advance chapter, same path as exploration.
    if (typeof isInterludeComplete === 'function' && isInterludeComplete()) {
      if (typeof resetInterlude === 'function') resetInterlude();
      if (typeof story2OnMatchEnd === 'function') story2OnMatchEnd('win');
    }
  }
}

// Called from checkDeaths() (smc-drawing.js) when an AI enemy dies. Fires FIRST_KILL and per-event unlocks.
function storyOnEnemyDeath(victim, killer) {
  if (!storyModeActive) return;
  // Only fire on p1 kills
  if (killer !== (players && players[0])) return;
  triggerEvent('FIRST_KILL', { victim, killer });
  // berserker_blood2 kill stacks live here. The smb-story-config.js wrapper was overwritten by this later load.
  const _p1 = players[0];
  if (_p1 && _p1.story2Abilities && _p1.story2Abilities.has('berserker_blood2') &&
      typeof storyAbilityState !== 'undefined') {
    storyAbilityState.killStacks = Math.min(5, (storyAbilityState.killStacks || 0) + 1);
    storyFightSubtitle = { text: `🩸 Fragment Hunger: ${storyAbilityState.killStacks} stack${storyAbilityState.killStacks > 1 ? 's' : ''}`, timer: 120, maxTimer: 120, color: '#cc2244' };
  }
}

function syncStoryDistortLevel() {
  const id = storyState.chapter;
  // Ch 0-7: none. Ch 8-12: mild to moderate. Ch 13-22: moderate to heavy. Ch 23+: maximum.
  if (id < 8) {
    storyDistortLevel = 0;
  } else if (id < 13) {
    storyDistortLevel = (id - 8) / 5 * 0.45;   // 0 → 0.45 across ch 8-13
  } else if (id < 23) {
    storyDistortLevel = 0.45 + (id - 13) / 10 * 0.40; // 0.45 → 0.85 across ch 13-23
  } else {
    storyDistortLevel = 0.85 + Math.min((id - 23) / 5, 1) * 0.15; // 0.85 → 1.0
  }
}

// Call when a story fight starts (in _launchChapter2Fight) to clear per-fight flags
function resetStoryEventState() {
  storyEventFired  = {};
  storyFreezeTimer = 0;
  _fallenWarrior   = null;
  syncStoryDistortLevel();
  // Ability locks come from the skill tree only. Chapter progress never grants abilities.
  const sk = (typeof _story2 !== 'undefined' && _story2.skillTree) ? _story2.skillTree : {};
  storyState.abilities.doubleJump    = !!sk.doubleJump;
  storyState.abilities.weaponAbility = !!(sk.weaponAbility || sk.weaponAbilityOld);
  storyState.abilities.superMeter    = !!sk.superMeter;
}

// Called every frame from gameLoop when storyModeActive.
// Crossing the soft boundary teleports the player to a safe platform (with a flash effect).
function storyUpdateBoundaries() {
  if (!storyModeActive || !gameRunning || !currentArena || gameMode === 'exploration') return;
  // portalEdge: center portal (decorative in drawing, functional here): teleport to far side of map
  if (currentArenaKey === 'portalEdge') {
    const cpx = GAME_W / 2, cpy = 260;
    for (const p of players) {
      if (!p || p.isBoss || p.health <= 0 || p._centerPortalCd > 0) continue;
      if (Math.abs(p.cx() - cpx) < 70 && Math.abs(p.cy() - cpy) < 130) {
        // Safe platform on the opposite half of the world.
        const halfW = (currentArena.mapRight || GAME_W) / 2;
        const pls = (currentArena.platforms || []).filter(pl =>
          !pl.isFloorDisabled && !pl.isFloor && pl.w > 40 &&
          (p.cx() < cpx ? pl.x + pl.w / 2 > halfW : pl.x + pl.w / 2 < halfW)
        );
        let dest = pls.length ? pls[Math.floor(Math.random() * pls.length)] : null;
        if (dest) {
          p.x = dest.x + dest.w / 2 - p.w / 2;
          p.y = dest.y - p.h - 2;
        } else {
          p.x = p.cx() < cpx ? cpx + 200 : cpx - 200;
          p.y = 350;
        }
        p.vx = 0; p.vy = 0;
        p._centerPortalCd = 90; // 1.5s cooldown to prevent re-trigger
        p.hurtTimer = Math.max(p.hurtTimer || 0, 30);
        if (settings.particles) {
          spawnParticles(p.cx(), p.cy(), '#aa44ff', 18);
          spawnParticles(p.cx(), p.cy(), '#ffffff', 8);
        }
        if (settings.screenShake) screenShake = Math.max(screenShake, 5);
      }
      if (p._centerPortalCd > 0) p._centerPortalCd--;
    }
  }
  for (const p of players) {
    if (!p || p.isBoss || p.health <= 0) continue;
    const breachedH = p._storyBoundaryBreached; // 'left' | 'right' | null
    const breachedV = p._storyBottomBreached;   // true | false
    if (!breachedH && !breachedV) continue;
    // Find the safest landing platform (not floor-disabled, not lava)
    const pls = currentArena.platforms
      ? currentArena.platforms.filter(pl => !pl.isFloorDisabled && pl.w > 40)
      : [];
    // For worldWidth arenas, pick platforms near the current camera view
    const viewCX = typeof camXCur === 'number' ? camXCur : GAME_W / 2;
    const viewHalf = GAME_W * 0.8;
    const nearby = pls.filter(pl => !pl.isFloor && Math.abs(pl.x + pl.w / 2 - viewCX) < viewHalf);
    const usable = nearby.length ? nearby : pls.filter(pl => !pl.isFloor);
    // Prefer platforms with overhead clearance (no platform within 100px above)
    const clear = usable.filter(pl => {
      const spawnX = pl.x + pl.w / 2;
      return !pls.some(o => o !== pl && !o.isFloor &&
        o.y + o.h > pl.y - 100 && o.y + o.h < pl.y && o.x < spawnX + 20 && o.x + o.w > spawnX - 20);
    });
    const pool = clear.length ? clear : (usable.length ? usable : pls);
    let best = null;
    let bestScore = Infinity;
    for (const pl of pool) {
      const cx = pl.x + pl.w / 2;
      const score = Math.abs(cx - viewCX) + (pl.isFloor ? 400 : 0);
      if (score < bestScore) { bestScore = score; best = pl; }
    }
    const safePos = typeof pickSafeSpawnNear === 'function'
      ? pickSafeSpawnNear(viewCX, breachedH === 'right' ? 'left' : breachedH === 'left' ? 'right' : 'any')
      : null;
    if (safePos) {
      p.x  = safePos.x - p.w / 2;
      p.y  = safePos.y - p.h;
    } else if (!best) {
      p.x  = viewCX - p.w / 2;
      p.y  = 200;
    } else {
      p.x  = best.x + best.w / 2 - p.w / 2;
      p.y  = best.y - p.h - 2;
    }
    p.vx = 0;
    p.vy = 0;
    // Never place the player outside the boundary portals (floor data may extend past mapRight).
    if (currentArena.mapLeft  !== undefined) p.x = Math.max(p.x, currentArena.mapLeft + 60);
    if (currentArena.mapRight !== undefined) p.x = Math.min(p.x, currentArena.mapRight - 60 - p.w);
    p._storyBoundaryBreached = null;
    p._storyBottomBreached   = false;
    // Brief invincibility so the teleport can't be used to dodge attacks
    p.hurtTimer = Math.max(p.hurtTimer || 0, 25);
    if (settings.particles) {
      spawnParticles(p.cx(), p.cy(), '#aa44ff', 18);
      spawnParticles(p.cx(), p.cy(), '#ffffff', 8);
    }
    if (settings.screenShake) screenShake = Math.max(screenShake, 5);
  }
}

(function _patchLaunchChapter2Fight() {
})();

// Story Sovereign skips chapter scaling and mirrors the player's story boosts instead: upgrades,
// multiverse bonuses and super charge, applied as ratios so his class HP and speed stay his own.
// Situational skill-tree tricks (last stand, medkit) are the player's alone.
function _storyMirrorPlayerBoosts(sov, p1, pre) {
  if (!sov || !p1 || !pre || sov._storyMirrored) return;
  sov._storyMirrored = true;
  const hpR  = (p1.maxHealth || pre.hp) / pre.hp;
  const dmgR = (p1.dmgMult || 1) / pre.dmg;
  sov.maxHealth = Math.max(1, Math.round((sov.maxHealth || 150) * hpR));
  sov.health    = sov.maxHealth;
  // Base under the kill-floor governor, which multiplies onto it rather than overwriting dmgMult.
  sov._kfBase   = dmgR;
  sov.dmgMult   = dmgR * (sov._kfMult || 1);
  if (pre.spd > 0 && p1.speed > 0) sov.speed = (sov.speed || p1.speed) * (p1.speed / pre.spd);
  sov.damageReductionMult = Math.max(0.05, (sov.damageReductionMult || 1) * ((p1.damageReductionMult || 1) / pre.dr));
  sov._superChargeMult    = (sov._superChargeMult || 1) * ((p1._superChargeMult || 1) / pre.sc);
  if (p1.kbResist)    sov.kbResist    = Math.max(sov.kbResist || 0, p1.kbResist);
  if (p1.kbBonus)     sov.kbBonus     = Math.max(sov.kbBonus || 0, p1.kbBonus);
  if (p1._mvJumpMult) sov._mvJumpMult = p1._mvJumpMult;
}

// Story bosses keep their standalone stats (tuned from replays) instead of the regular-enemy curve,
// whose 2x-player HP cap would leave a 3000-HP boss at 200. Like Sovereign they copy the player's
// story boosts as ratios, multiplied onto their own stats, then take the difficulty tier's layer.
function _storyScaleBoss(boss, p1, pre) {
  if (!boss || boss._storyBossScaled) return;
  boss._storyBossScaled = true;
  const diff = typeof _storyDiffCfg === 'function' ? _storyDiffCfg() : null;
  const hpR  = (p1 && pre) ? (p1.maxHealth || pre.hp) / pre.hp : 1;
  const dmgR = (p1 && pre) ? (p1.dmgMult || 1) / pre.dmg : 1;
  const drR  = (p1 && pre) ? (p1.damageReductionMult || 1) / pre.dr : 1;
  boss.maxHealth = Math.max(1, Math.round(boss.maxHealth * hpR * (diff ? diff.hp * diff.hpCap : 1)));
  boss.health    = boss.maxHealth;
  boss.dmgMult   = (boss.dmgMult || 1) * dmgR * (diff ? diff.dmg : 1);
  boss.damageReductionMult = Math.max(0.05, (boss.damageReductionMult || 1) * drR);
  if (diff) boss.attackCooldownMult = Math.max(0.2, (boss.attackCooldownMult || 0.5) * diff.cd);
}

// Called from startGame (smb-menu-spawn.js) in story mode. _startGameCore runs 120-800 ms later, so the
// buffs wait for it: a fixed 80 ms timer used to land on the previous match's fighters.
let _storyFightBuffsPending = false;
function _onStoryFightStart() {
  resetStoryEventState();
  _storyFightBuffsPending = true;
}

// Called at the end of _startGameCore, once players[] holds this match's fighters.
function _storyApplyFightStartBuffs() {
  if (!_storyFightBuffsPending || !storyModeActive) return;
  _storyFightBuffsPending = false;
  {
    const p1 = players && players[0];
    // Pre-buff snapshot: Sovereign copies the boost, not the totals (see _storyMirrorPlayerBoosts).
    const _p1Pre = p1 ? { hp: p1.maxHealth || 150, dmg: p1.dmgMult || 1, spd: p1.speed || 0,
                          dr: p1.damageReductionMult || 1, sc: p1._superChargeMult || 1 } : null;
    if (p1 && !p1.isAI) {
      p1._story2BaseDmg = p1.dmgMult || 1;
      const meta = _story2.metaUpgrades || { damage: 0, survivability: 0, healUses: 0 };
      p1.maxHealth += meta.survivability * 10;
      p1.health = Math.min(p1.maxHealth, Math.max(1, Math.round(p1.maxHealth * _storyGetCarryHealthPct())));
      p1.dmgMult = (p1.dmgMult || 1) * (1 + meta.damage * 0.08);
      p1.damageReductionMult = Math.max(0.70, (p1.damageReductionMult || 1) - meta.survivability * 0.025);
      _applyStory2Abilities(p1);
      // Multiverse worlds: apply accumulated dimensional bonuses to the player
      if (typeof MultiverseScalingSystem !== 'undefined' && typeof MultiverseManager !== 'undefined') {
        MultiverseScalingSystem.applyToFighter(p1, MultiverseManager.getSave());
      }
      _applySkillTreeToPlayer(p1);
    }
    // isSovereignMK2 is listed separately: the brain marks him isAI=false once its checkpoint loads.
    for (const enemy of players.filter(p => p && p !== p1 && (p.isAI || p.isBoss || p.isSovereignMK2))) {
      if (enemy.isSovereignMK2) { _storyMirrorPlayerBoosts(enemy, p1, _p1Pre); continue; }
      if (enemy.isBoss) { _storyScaleBoss(enemy, p1, _p1Pre); continue; }
      _storyScaleEnemyUnit(enemy, _activeStory2Chapter ? _activeStory2Chapter.id : 1, {
        elite: !!(storyPendingPhaseConfig && (storyPendingPhaseConfig.type === 'elite_wave' || storyPendingPhaseConfig.type === 'mini_boss'))
      });
      if (_activeStory2Chapter && _activeStory2Chapter.isMultiverseWorld && typeof MultiverseScalingSystem !== 'undefined') {
        const worldsCleared = typeof MultiverseManager !== 'undefined' ? MultiverseManager.getCompletedCount() : 0;
        MultiverseScalingSystem.applyWorldModifierToEnemy(enemy, _activeStory2Chapter.multiverseWorldId, worldsCleared);
      }
    }
    // Activate the multiverse world state so modifiers tick and Fallen God dialogue fires
    if (_activeStory2Chapter && _activeStory2Chapter.isMultiverseWorld && typeof MultiverseManager !== 'undefined') {
      MultiverseManager.enterWorld(_activeStory2Chapter.multiverseWorldId);
    } else if (typeof MultiverseManager !== 'undefined' && MultiverseManager.isActive()) {
      MultiverseManager.deactivate();
    }
  }
}

// Called from smc-drawing.js each frame after the world is drawn, before HUD.
// Draws scanline glitches and reality-tear effects based on storyDistortLevel.
function drawStoryWorldDistortion(ctx, cw, ch_h) {
  const lvl = storyDistortLevel;
  if (lvl <= 0) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // screen space

  const t = frameCount * 0.04;

  const bandCount = Math.floor(lvl * 8);
  for (let i = 0; i < bandCount; i++) {
    const yFrac = (Math.sin(t * 0.7 + i * 2.3) * 0.5 + 0.5);
    const y     = yFrac * ch_h;
    const bh    = 2 + lvl * 4;
    const alpha = lvl * 0.25 * (0.5 + 0.5 * Math.sin(t + i));
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#cc55ff';
    ctx.fillRect(0, y, cw, bh);
    // Horizontal glitch offset for this band
    if (lvl > 0.3 && Math.random() < 0.04) {
      ctx.globalAlpha = alpha * 0.5;
      const sliceH = 3 + Math.random() * 8;
      const offset = (Math.random() - 0.5) * 18 * lvl;
      ctx.drawImage(ctx.canvas, 0, y, cw, sliceH, offset, y, cw, sliceH);
    }
  }

  if (lvl > 0.4) {
    const tearCount = Math.floor((lvl - 0.4) / 0.12);
    ctx.globalAlpha = 0;
    for (let i = 0; i < tearCount; i++) {
      const xFrac = Math.abs(Math.sin(i * 3.7 + t * 0.15));
      const x     = xFrac * cw;
      const alpha = (lvl - 0.4) * 0.7 * (0.5 + 0.5 * Math.sin(t * 0.6 + i));
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#cc44ff';
      ctx.shadowColor = '#cc44ff';
      ctx.shadowBlur  = 12;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      const segments = 5 + Math.floor(Math.random() * 3);
      ctx.moveTo(x, 0);
      for (let s = 1; s <= segments; s++) {
        ctx.lineTo(x + (Math.random() - 0.5) * 14 * lvl, (s / segments) * ch_h);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  if (lvl > 0.65) {
    const vAlpha = (lvl - 0.65) * 0.35;
    const vg = ctx.createRadialGradient(cw/2, ch_h/2, cw*0.1, cw/2, ch_h/2, cw*0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(80,0,120,${vAlpha})`);
    ctx.globalAlpha = 1;
    ctx.fillStyle   = vg;
    ctx.fillRect(0, 0, cw, ch_h);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}
