'use strict';
// Particle pool, spawnParticles, spawnRing, checkWeaponSparks, spawnBullet, Projectile, DamageText.
// Depends on: smb-globals.js, smb-combat.js.
// Particle objects are pooled to cut GC pressure.
const MAX_PARTICLES = 250;
const _particlePool = [];   // recycled particle objects

function _getParticle() {
  // Reuse a pooled particle first
  if (_particlePool.length > 0) return _particlePool.pop();
  return {};
}

function _recycleParticle(p) {
  if (_particlePool.length < 300) _particlePool.push(p);
}

function spawnParticles(x, y, color, count) {
  if (!settings.particles) return;
  // Over the cap: skip new particles
  if (particles.length >= MAX_PARTICLES) return;
  const toSpawn = Math.min(count, MAX_PARTICLES - particles.length);
  for (let i = 0; i < toSpawn; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 5;
    const p = _getParticle();
    p.x = x; p.y = y;
    p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
    p.color = color;
    p.size = 1.5 + Math.random() * 2.5;
    p.life = 18 + Math.random() * 22;
    p.maxLife = 40;
    particles.push(p);
  }
}

// Directional burst into a cone around (dirX, dirY). Shares spawnParticles()'s pool
// and cap. `spread` is the cone's half angle in radians (default ~50 degrees).
function spawnParticlesDir(x, y, color, count, dirX, dirY, spread) {
  if (!settings.particles) return;
  if (particles.length >= MAX_PARTICLES) return;
  const toSpawn = Math.min(count, MAX_PARTICLES - particles.length);
  const base = Math.atan2(dirY || 0, dirX || 1);
  const half = spread == null ? 0.9 : spread;
  for (let i = 0; i < toSpawn; i++) {
    const a = base + (Math.random() - 0.5) * 2 * half;
    const sp = 2.0 + Math.random() * 5.5;
    const p = _getParticle();
    p.x = x; p.y = y;
    p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
    p.color = color;
    p.size = 1.5 + Math.random() * 2.5;
    p.life = 16 + Math.random() * 20;
    p.maxLife = 36;
    particles.push(p);
  }
}

// Blood spray away from the attacker. dir: 1 sprays right, -1 sprays left.
function spawnBlood(x, y, dir, dmg) {
  if (!settings.particles) return;
  const count = Math.max(2, Math.min(10, Math.floor(dmg / 5)));
  const toSpawn = Math.min(count, MAX_PARTICLES - particles.length);
  for (let i = 0; i < toSpawn; i++) {
    const spread = (Math.random() - 0.5) * 4;
    const p = _getParticle();
    p.x = x + (Math.random() - 0.5) * 8;
    p.y = y + (Math.random() - 0.5) * 10;
    p.vx = dir * (1.5 + Math.random() * 5) + spread;
    p.vy = -1.5 - Math.random() * 4;  // upward pop
    p.color = Math.random() < 0.6 ? '#cc0000' : '#880000';
    p.size  = 2 + Math.random() * 2.5;
    p.life  = 14 + Math.random() * 16;
    p.maxLife = 30;
    p.isBlood = true;
    particles.push(p);
  }
}

function spawnRing(x, y) {
  if (!settings.particles) return;
  const ringCount = Math.min(18, MAX_PARTICLES - particles.length);
  for (let i = 0; i < ringCount; i++) {
    const a = (i / 18) * Math.PI * 2;
    const _p = _getParticle();
    _p.x = x; _p.y = y; _p.vx = Math.cos(a)*7; _p.vy = Math.sin(a)*3.5;
    _p.color = '#ff8800'; _p.size = 3; _p.life = 14; _p.maxLife = 14;
    particles.push(_p);
  }
}

function checkWeaponSparks() {
  if (!settings.particles) return;
  const pool = [...players, ...minions, ...(trainingDummies || [])].filter(f => f.health > 0 && f.attackTimer > 0 && f.weapon && f.weapon.type === 'melee');
  const all = pool.map(f => {
    const tip = f._weaponTip || (f.getWeaponTipPos && f.getWeaponTipPos());
    return tip ? { f, tip: { x: tip.x, y: tip.y, attacking: true } } : null;
  }).filter(Boolean);
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (!a.tip.attacking || !b.tip.attacking) continue;
      if ((a.f._weaponClashCd || 0) > 0 || (b.f._weaponClashCd || 0) > 0) continue;
      // Sparks follow the clash rule: only equal-strength actions ring off each other.
      // A swing crossing a super breaks instead (Fighter._resolveOverpower).
      if (typeof a.f._clashTier === 'function' && typeof b.f._clashTier === 'function'
          && a.f._clashTier() !== b.f._clashTier()) continue;
      const dx = a.tip.x - b.tip.x;
      const dy = a.tip.y - b.tip.y;
      if (dx * dx + dy * dy < 28 * 28) {
        const mx = (a.tip.x + b.tip.x) / 2;
        const my = (a.tip.y + b.tip.y) / 2;
        for (let s = 0; s < 10 && particles.length < MAX_PARTICLES; s++) {
          const sa = Math.random() * Math.PI * 2;
          const sv = 2 + Math.random() * 5;
          const _p = _getParticle();
          _p.x = mx; _p.y = my; _p.vx = Math.cos(sa) * sv; _p.vy = Math.sin(sa) * sv - 1;
          _p.color = s < 5 ? '#ffffff' : '#ffdd44'; _p.size = 1.5 + Math.random() * 2; _p.life = 8; _p.maxLife = 8;
          particles.push(_p);
        }
        screenShake = Math.max(screenShake, 3);
        const nx = dx === 0 ? 1 : dx / Math.sqrt(dx * dx + dy * dy);
        a.f.vx += nx * 2; b.f.vx -= nx * 2;
        a.f._weaponClashCd = 20; b.f._weaponClashCd = 20;
        if (!a.f.isAI || !b.f.isAI) unlockAchievement('clash_master');
      }
    }
  }
  [...players, ...minions, ...(trainingDummies || [])].forEach(f => { if (f._weaponClashCd > 0) f._weaponClashCd--; });
}

function _achCheckYetiDead()  { unlockAchievement('yeti_hunter'); }
function _achCheckBeastDead() { unlockAchievement('beast_tamer'); }

function spawnBullet(user, speed, color, overrideDmg = null) {
  if (isCinematic) return null; // no projectiles during cinematics or finishers
  // Sovereign domain is melee only
  if (typeof gameMode !== 'undefined' && gameMode === 'sovereign') return null;
  // Story Sovereign fights run as gameMode 'adaptive', so the same rule applies.
  if (typeof storyModeActive !== 'undefined' && storyModeActive && typeof _activeStory2Chapter !== 'undefined' &&
      _activeStory2Chapter && _activeStory2Chapter.isSovereignFight) return null;
  // Arena-level no-ranged flag
  if (typeof currentArena !== 'undefined' && currentArena && currentArena.isNoRanged) return null;
  SoundManager.shoot(user && user.weaponKey);
  const _nearest = [user.target, ...players, ...minions, ...trainingDummies].filter(Boolean).find(t => t !== user && t.health > 0) || null;
  const _distToT = _nearest ? Math.abs(_nearest.cx() - user.cx()) : 999;
  const _pointBlankT = !user.isBoss ? Math.max(0, 1 - clamp((_distToT - 48) / 72, 0, 1)) : 0;
  const _baseDmg = overrideDmg !== null ? overrideDmg : (user.weapon.damageFunc ? user.weapon.damageFunc() : user.weapon.damage);
  const dmg = Math.max(1, Math.round(_baseDmg * (1 - _pointBlankT * 0.34)));

  // Faster movement widens the vertical spread. At full run speed (5.2), normal
  // weapons get ±0.9 vy. Rapid-fire weapons get 2.8x that.
  const _ownerSpd = Math.abs(user.vx);
  const _isRapid  = user.weapon && user.weapon.cooldown <= 20;
  const _shotHeat = Math.min(8, user._rangedShotHeat || 0);
  const _spread   = (_ownerSpd > 0.8 ? (_ownerSpd / 5.2) * (_isRapid ? 3.1 : 2.0) : 0)
                  + _shotHeat * (_isRapid ? 0.30 : 0.20)
                  + _pointBlankT * (_isRapid ? 1.35 : 0.92);
  const _vy       = _spread > 0 && !user._comboDomain ? (Math.random() - 0.5) * _spread : 0;

  const _proj = new Projectile(
    user.cx() + user.facing * 12, user.y + 22,
    user.facing * speed, _vy, user, dmg, color
  );
  _proj._closeRangePenalty = _pointBlankT;
  _proj._warmupFrames = _isRapid ? 3 : 2;
  projectiles.push(_proj);
  // Gunner: second bullet at a slight angle
  if (user.charClass === 'gunner') {
    const dmg2 = Math.max(1, Math.round((user.weapon.damageFunc ? user.weapon.damageFunc() : user.weapon.damage) * (1 - _pointBlankT * 0.34)));
    const _vy2 = _vy + (Math.random() - 0.5) * 0.3;
    const _proj2 = new Projectile(
      user.cx() + user.facing * 12, user.y + 26,
      user.facing * speed * 0.92, -0.8 + _vy2, user, dmg2, color
    );
    _proj2._closeRangePenalty = _pointBlankT;
    _proj2._warmupFrames = _isRapid ? 3 : 2;
    projectiles.push(_proj2);
  }
  return _proj; // return primary projectile so callers can mark Q-ability shots
}

// Projectile
class Projectile {
  constructor(x, y, vx, vy, owner, damage, color) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.owner  = owner;
    this.damage = damage;
    this.color  = color;
    this.life   = 90;
    this.active = true;
    this._warmupFrames = 0;
    this.hitEntities = new Set(); // stops duplicate hits from piercing shots
    // Hits count as the move that fired this shot, even if the owner has since gone back to basic shots.
    this._moveTier = !owner ? null
      : (owner.superActive || owner._attackKindTier === CLASH_TIER_SUPER) ? CLASH_TIER_SUPER
      : (owner._attackKindTier || CLASH_TIER_ATTACK);
    const tf = typeof getTrueFormAntiRangedBoss === 'function' ? getTrueFormAntiRangedBoss() : (players && players.find(p => p.isTrueForm && p.health > 0));
    if (tf && owner && !owner.isAI && owner.weapon && owner.weapon.type === 'ranged') {
      tf._antiRangedStats = tf._antiRangedStats || { projectiles: 0, rangedDamage: 0, farTicks: 0 };
      tf._antiRangedStats.projectiles = Math.min(999, (tf._antiRangedStats.projectiles || 0) + 1);
    }
  }
  // Flame puffs: 0 at spawn → 1 at burnout; radius swells with age.
  _flameAge()    { const m = this._maxLife || 14; return Math.min(1, Math.max(0, 1 - this.life / m)); }
  _flameRadius() { return (5 + this._flameAge() * 28) * (this._flameScale || 1); }
  update() {
    _moveTierOverride = this._moveTier;
    try { return this._update(); } finally { _moveTierOverride = null; }
  }
  // Online mirror of a shot fired on the owner's machine (see NetProj below).
  // Visual only. The owner keeps hit authority.
  _ghostStep() {
    if (this._ox || this._oy) {
      this.x += this._ox * 0.25; this.y += this._oy * 0.25;
      this._ox *= 0.75; this._oy *= 0.75;
      if (Math.abs(this._ox) < 0.05 && Math.abs(this._oy) < 0.05) this._ox = this._oy = 0;
    }
    this.x += this.vx; this.y += this.vy; this.vy += this._gravity != null ? this._gravity : 0.08;
    if (--this.life <= 0 || ++this._ghostAge > 240) this.active = false;
  }
  _update() {
    if (this._netGhost) return this._ghostStep();
    // Ninja Shadow Realm time dilation: projectiles fired by slowed fighters crawl
    if (this.owner && this.owner._domainSlowFactor > 0 && this.owner._domainSlowFactor < 1) {
      this._domainSlowAccum = (this._domainSlowAccum || 0) + this.owner._domainSlowFactor;
      if (this._domainSlowAccum < 1) return;
      this._domainSlowAccum -= 1;
    }
    if (this._warmupFrames > 0) {
      this._warmupFrames--;
      this.x += this.vx * 0.45;
      this.y += this.vy * 0.45;
      this.vy += 0.04;
      if (--this.life <= 0) { this.active = false; }
      return;
    }
    const tfAnti = typeof getTrueFormAntiRangedBoss === 'function' ? getTrueFormAntiRangedBoss() : null;
    if (tfAnti && this.owner && !this.owner.isBoss && this.owner.weapon && this.owner.weapon.type === 'ranged') {
      const dx = tfAnti.cx() - this.x;
      const dy = tfAnti.cy() - this.y;
      const dd = Math.hypot(dx, dy) || 1;
      const fieldR = (tfAnti._antiRangedFieldR || 220) * 1.18;
      const wasInField = this._inAntiRangedField;
      this._inAntiRangedField = dd < fieldR;
      const justEntered = this._inAntiRangedField && !wasInField;
      if (justEntered && !this._tfReflected && Math.random() < 0.05) {
        const reflectTarget = this.owner && this.owner.health > 0 ? this.owner : players.find(p => !p.isBoss && p.health > 0);
        if (reflectTarget) {
          this._tfReflected = true;
          this.owner = tfAnti;
          const rdx = reflectTarget.cx() - this.x;
          const rdy = reflectTarget.cy() - this.y;
          const rd = Math.hypot(rdx, rdy) || 1;
          const speed = Math.max(9, Math.hypot(this.vx, this.vy) * 1.35);
          this.vx = (rdx / rd) * speed;
          this.vy = (rdy / rd) * speed * 0.35 - 0.3;
          this.damage = Math.max(1, Math.round(this.damage * 1.15));
          this.color = '#ffffff';
          spawnParticles(this.x, this.y, '#ffffff', 6);
          screenShake = Math.max(screenShake, 5);
        }
      }
    }
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this._gravity != null ? this._gravity : 0.08; // lobbed shots set their own
    // Flames drag to a stop and rise as they burn out
    if (this._isFlame) { this.vx *= 0.92; this.vy = this.vy * 0.9 - 0.13; }
    // Distance for falloff, applied on hit
    this._distTraveled = (this._distTraveled || 0) + Math.abs(this.vx);
    if (--this.life <= 0) { this.active = false; return; }
    // platform collision
    for (const pl of currentArena.platforms) {
      // A lob passes through platforms on the way up and only lands on the way down.
      if (this._burstOnLand && this.vy < 0) break;
      if (this._burstOnLand && pl.y < this._landY && !pl.isFloor) continue;
      if (pl.ramp ? rampHolds(pl, this.x, this.y)
                  : (this.x > pl.x && this.x < pl.x+pl.w && this.y > pl.y && this.y < pl.y+pl.h)) {
        this.active = false;
        spawnParticles(this.x, this.y, this.color, 4);
        if (typeof worldReactProjectile === 'function') worldReactProjectile(this, pl);
        // Lobbed shells detonate on landing, so a near miss still splashes.
        if (this._burstOnLand) this._splashBurst(null, this.damage);
        return;
      }
    }
    if (this._flameFx) return; // visual-only flame puff
    // Hit pad matches the flame's drawn radius
    const _hp = this._isFlame ? this._flameRadius() * 0.5 : 0;
    // A melee swing cuts a basic shot it passes through. Ability and super shots, and flames, go through.
    if (!this._isFlame && (this._moveTier || 0) === 0 && this.owner) {
      for (const p of players) {
        if (p === this.owner || p.health <= 0 || !(p.attackTimer > 0) || p.isBoss) continue;
        if (!p.weapon || p.weapon.type !== 'melee' || areAlliedEntities(this.owner, p)) continue;
        if (p._cutPtsFrame !== frameCount) { p._cutPtsFrame = frameCount; p._cutPts = p._getMeleeArcPoints(); }
        if (!p._cutPts.some(pt => Math.abs(pt.x - this.x) < 14 && Math.abs(pt.y - this.y) < 14)) continue;
        this.active = false;
        spawnParticles(this.x, this.y, '#ffffff', 6);
        spawnParticles(this.x, this.y, this.color, 4);
        if (typeof SoundManager !== 'undefined' && SoundManager.parry) SoundManager.parry();
        return;
      }
    }
    // player collision
    for (const p of players) {
      if (p === this.owner || p.health <= 0) continue;
      if (areAlliedEntities(this.owner, p)) continue;
      if (p !== this.owner && p.isAI && !p.isBoss && (!p.weapon || p.weapon.type !== 'ranged')) {
        const _aiProjD = Math.hypot(this.x - p.cx(), this.y - p.cy());
        const _towardAI = Math.sign(this.vx || 0) === Math.sign(p.cx() - this.x);
        if (_towardAI && _aiProjD < 72 && (p.attackTimer > 0 || Math.abs(p.vx) > 3.4) && !(this.owner && this.owner._comboDomain) && Math.random() < 0.18) {
          p.invincible = Math.max(p.invincible || 0, 6);
          p.vx += Math.sign(this.vx || 1) * 2.2;
          spawnParticles(p.cx(), p.cy(), '#ddeeff', 4);
          this.active = false;
          return;
        }
      }
      if (p.isBoss && this.owner && this.owner.weapon && this.owner.weapon.type === 'ranged') {
        const _bossD = Math.hypot(this.x - p.cx(), this.y - p.cy());
        if (_bossD < 88 && !this.owner._comboDomain && Math.random() < 0.05 && !(p._projDeflectCd > 0)) {
          p._projDeflectCd = 16;
          this.owner = p;
          this.vx = (this.x < p.cx() ? -1 : 1) * Math.max(8, Math.abs(this.vx) * 1.05);
          this.vy = -Math.abs(this.vy) * 0.35 - 0.5;
          this.x  = p.cx() + Math.sign(this.vx) * 18;
          this.y  = p.cy() - 8;
          this.color = '#ffffff';
          spawnParticles(this.x, this.y, '#ffffff', 8);
          screenShake = Math.max(screenShake, 6);
          return;
        }
      }
      // No friendly fire, unless survival enables it
      const _survFF = gameMode === 'minigames' && minigameType === 'survival' && survivalFriendlyFire;
      if (!_survFF && gameMode === 'boss' && !(this.owner && this.owner.isBoss) && !p.isBoss) continue;
      if (!_survFF && gameMode === 'minigames' && !(this.owner && this.owner.isBoss) && !p.isBoss && !p.isAI) continue;
      if (this.hitEntities && this.hitEntities.has(p)) continue; // already hit this target
    if (this.x > p.x - _hp && this.x < p.x+p.w + _hp && this.y > p.y - _hp && this.y < p.y+p.h + _hp) {
        this.hitEntities.add(p);
        // Q-ability hits in a row do less damage each
        if (this._isQAbility && this.owner) {
          const hc = this.owner._qHitCount || 0;
          this.damage = Math.max(1, Math.round(this.damage * Math.max(0.10, 1 - hc * 0.18)));
          this.owner._qHitCount = hc + 1;
        }
        // Full damage to 200px, falling to 60% at 600px
        const _falloff = Math.max(0.60, 1.0 - Math.max(0, (this._distTraveled - 200) / 1000));
        const _hitDmg  = Math.max(1, Math.round(this.damage * _falloff * (1 - (this._closeRangePenalty || 0) * 0.18)));
        dealDamage(this.owner, p, _hitDmg, this._isFlame ? 2 : 7, 1.0, false, 0);
        handleSplash(this.owner, p, _hitDmg, this.x, this.y);
        this._splashBurst(p, _hitDmg);
        if (this._isFlame) { spawnParticles(this.x, this.y, '#ff8a20', 2); continue; } // flames burn through
        this.active = false;
        spawnParticles(this.x, this.y, this.color, 6);
        return;
      }
    }
    // minion collision: player and non-minion projectiles can kill minions
    if (!this.owner.isMinion && !(this.owner instanceof Boss)) {
      for (const mn of minions) {
        if (mn.health <= 0 || mn === this.owner) continue;
        if (areAlliedEntities(this.owner, mn)) continue;
        if (this._isFlame && this.hitEntities.has(mn)) continue;
        if (this.x > mn.x - _hp && this.x < mn.x+mn.w + _hp && this.y > mn.y - _hp && this.y < mn.y+mn.h + _hp) {
          const _mFalloff = Math.max(0.60, 1.0 - Math.max(0, ((this._distTraveled || 0) - 200) / 1000));
          const _mHitDmg  = Math.max(1, Math.round(this.damage * _mFalloff * (1 - (this._closeRangePenalty || 0) * 0.18)));
          dealDamage(this.owner, mn, _mHitDmg, 9, 1.0, false, 0);
          handleSplash(this.owner, mn, _mHitDmg, this.x, this.y);
          this._splashBurst(mn, _mHitDmg);
          if (this._isFlame) { this.hitEntities.add(mn); continue; }
          this.active = false;
          spawnParticles(this.x, this.y, this.color, 6);
          return;
        }
      }
    }
    // training dummy collision
    if (!this.owner.isDummy) {
      for (const dum of trainingDummies) {
        if (dum.health <= 0) continue;
        if (this._isFlame && this.hitEntities.has(dum)) continue;
        if (this.x > dum.x - _hp && this.x < dum.x+dum.w + _hp && this.y > dum.y - _hp && this.y < dum.y+dum.h + _hp) {
          dealDamage(this.owner, dum, this.damage, 9, 1.0, false, 0);
          handleSplash(this.owner, dum, this.damage, this.x, this.y);
          this._splashBurst(dum, this.damage);
          if (this._isFlame) { this.hitEntities.add(dum); continue; }
          this.active = false;
          spawnParticles(this.x, this.y, this.color, 6);
          return;
        }
      }
    }
  }
  // Projectile splash (e.g. Napalm Spit Q). Runs on every hit branch, including minions.
  _splashBurst(hit, hitDmg) {
    if (!this.splashRange || !this.owner) return;
    spawnRing(this.x, this.y);
    spawnParticles(this.x, this.y, this.color, 18);
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 14);
    const _pAll = [...players, ...minions, ...(typeof trainingDummies !== 'undefined' ? trainingDummies : [])];
    const _sDmg = Math.max(1, Math.round(hitDmg * 0.50));
    for (const t of _pAll) {
      if (t === hit || t === this.owner || t.health <= 0) continue;
      if (areAlliedEntities(this.owner, t)) continue;
      if (Math.hypot(t.cx() - this.x, (t.y + t.h * 0.5) - this.y) < this.splashRange) {
        dealDamage(this.owner, t, _sDmg, 6, 1.0, true);
        spawnParticles(t.cx(), t.cy(), this.color, 8);
      }
    }
  }
  draw() {
    ctx.save();
    if (this._isPaperPlane) {
      // Paper airplane ability: a tiny folded plane
      const _ppAng = Math.atan2(this.vy, this.vx);
      const _ppA   = Math.min(1, this.life / 20);
      ctx.globalAlpha = _ppA * 0.92;
      ctx.shadowColor = '#aaccff'; ctx.shadowBlur = 8;
      ctx.translate(this.x, this.y);
      ctx.rotate(_ppAng);
      ctx.fillStyle = '#ddeeff';
      ctx.beginPath();
      ctx.moveTo(12, 0); ctx.lineTo(-4, -5); ctx.lineTo(-2, 0); ctx.lineTo(-4, 5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#bbccee';
      ctx.beginPath();
      ctx.moveTo(12, 0); ctx.lineTo(-4, -5); ctx.lineTo(-2, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#7799bb'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(8, -0.5); ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (this._isFlame) {
      // Flame puff: white-hot core that swells, reddens and smokes out. Normal blending
      // on purpose, since additive washes to white on bright skies.
      const _fT = this._flameAge();
      const _fR = this._flameRadius();
      ctx.translate(this.x, this.y);
      if (_fT > 0.55) {
        ctx.globalAlpha = Math.min(1, (_fT - 0.55) * 3) * (1 - _fT) * 1.2;
        ctx.fillStyle = '#3a302c';
        ctx.beginPath(); ctx.arc(0, -_fR * 0.3, _fR * 0.9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, (1 - _fT) * 1.6));
      const _fg = ctx.createRadialGradient(0, 0, 0, 0, 0, _fR);
      _fg.addColorStop(0,    _fT < 0.3 ? '#fff3b0' : _fT < 0.6 ? '#ffb330' : '#ff6a10');
      _fg.addColorStop(0.5,  _fT < 0.45 ? 'rgba(255,120,15,0.95)' : 'rgba(215,50,5,0.9)');
      _fg.addColorStop(1,    'rgba(150,15,0,0)');
      ctx.fillStyle = _fg;
      ctx.beginPath();
      ctx.ellipse(0, 0, _fR * 1.3, _fR, Math.atan2(this.vy, this.vx), 0, Math.PI * 2);
      ctx.fill();
    } else if (this._isArrow) {
      const _ang = Math.atan2(this.vy, this.vx);
      const _alpha = Math.min(1, this.life / 15);
      ctx.globalAlpha = _alpha;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(_ang);
      // Shaft
      ctx.strokeStyle = '#8B5E3C';
      ctx.lineWidth   = 2.2;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();
      // Arrowhead
      ctx.fillStyle = '#c8c8a0';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(7, -3.5);
      ctx.lineTo(7,  3.5);
      ctx.closePath();
      ctx.fill();
      // Fletching (tail feathers)
      ctx.strokeStyle = '#cc9944';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(-14, 0); ctx.lineTo(-10, -5);
      ctx.moveTo(-14, 0); ctx.lineTo(-10,  5);
      ctx.stroke();
      ctx.restore();
    } else if (this._isShuriken) {
      // Ninja domain shuriken: a spinning 4-blade star with a violet glow
      this._spin = (this._spin || 0) + 0.42;
      ctx.globalAlpha = Math.min(1, this.life / 10);
      ctx.translate(this.x, this.y);
      ctx.rotate(this._spin);
      ctx.shadowColor = '#bb44ff'; ctx.shadowBlur = 10;
      ctx.fillStyle = '#ccccdd';
      ctx.beginPath();
      for (let p = 0; p < 8; p++) {
        const ang = (p / 8) * Math.PI * 2;
        const r   = p % 2 === 0 ? 10 : 3;
        p === 0 ? ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r)
                : ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      ctx.closePath(); ctx.fill();
      // blade edge highlight
      ctx.strokeStyle = '#eeeeff'; ctx.lineWidth = 0.8; ctx.stroke();
      // hub
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#777788';
      ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222233';
      ctx.beginPath(); ctx.arc(0, 0, 1.2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.shadowColor = this.color;
      ctx.shadowBlur  = 8;
      ctx.fillStyle   = this.color;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // trail
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.ellipse(this.x - this.vx * 2.5, this.y, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Damage text
class DamageText {
  constructor(x, y, amount, color) {
    this.x = x; this.y = y;
    this.amount = amount;
    this.color  = color;
    this.life   = 52;
    this.vx     = (Math.random() - 0.5) * 1.5;
  }
  update() { this.y -= 1.1; this.x += this.vx; this.life--; }
  draw() {
    const a = Math.min(1, this.life / 20);
    // A string amount is a label (CLASH, BREAK), not a number.
    const _label = (typeof this.amount === 'string');
    // Bigger hits get bigger text
    const fs = _label       ? 19
             : this.amount >= 40 ? 24
             : this.amount >= 25 ? 20
             : this.amount >= 12 ? 16
             : 13;
    // Coloured by tier, but muted so the numbers do not drown out the fight.
    const col = _label       ? (this.color || '#f2ede2')
              : this.amount >= 40 ? '#e0563c'
              : this.amount >= 25 ? '#dd9440'
              : this.amount >= 12 ? '#e3cf72'
              : (this.color || '#efe9dc');
    const txt = _label ? this.amount : '-' + this.amount;
    ctx.save();
    ctx.globalAlpha   = a;
    ctx.textAlign     = 'center';
    ctx.font          = `800 ${fs}px "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    // A soft drop shadow, not a black keyline, so text stays legible without a cartoon outline.
    ctx.shadowColor   = 'rgba(0,0,0,0.92)';
    ctx.shadowBlur    = fs >= 20 ? 7 : 5;
    ctx.shadowOffsetY = 1.5;
    ctx.fillStyle     = col;
    ctx.fillText(txt, this.x, this.y);
    // Heavy hits get a second pass to thicken the text.
    if (_label || this.amount >= 25) {
      ctx.shadowBlur = 3;
      ctx.fillText(txt, this.x, this.y);
    }
    ctx.restore();
  }
}

// NetProj: online projectile position correction. Remote fighters are network puppets,
// so their shots exist only on the owner's machine. The owner sends snapshots
// [id,x,y,vx,vy,color,kind,life] on spawn and every NetProj.EVERY frames, skipped
// while a shot is within TOL px of dead reckoning. The receiver eases a visual-only
// ghost onto each snapshot and snaps past SNAP. An empty list clears the ghosts.
const NetProj = (() => {
  const EVERY = 6, MAX = 12, TOL = 2, SNAP = 60;
  let _seq = 0, _lastFrame = 0, _had = false, _last = {};
  const _ghosts = new Map();
  const r1 = v => Math.round(v * 10) / 10;
  function _kind(p) { return (p._isArrow ? 1 : 0) | (p._isPaperPlane ? 2 : 0) | (p._isShuriken ? 4 : 0); }
  // Sender: returns an array to send, or null if nothing needs sending.
  function collect(owner) {
    if (!owner || typeof projectiles === 'undefined') return null;
    const now = frameCount, live = [];
    let fresh = false;
    for (const p of projectiles) {
      if (!p.active || p.owner !== owner || p._netGhost || p._flameFx || p._isFlame) continue;
      if (!p._nid) { _seq = (_seq % 60000) + 1; p._nid = _seq; fresh = true; }
      live.push(p);
      if (live.length >= MAX) break;
    }
    if (!live.length) {
      if (!_had) return null;
      _had = false; _last = {};
      return [];
    }
    _had = true;
    if (!fresh && now - _lastFrame < EVERY) return null;
    if (!fresh) {
      const dt = now - _lastFrame;
      let same = live.length === Object.keys(_last).length;
      for (let i = 0; same && i < live.length; i++) {
        const p = live[i], l = _last[p._nid];
        if (!l) { same = false; break; }
        const g = p._gravity != null ? p._gravity : 0.08;
        const ex = l[0] + l[2] * dt - p.x, ey = l[1] + l[3] * dt + g * dt * (dt + 1) / 2 - p.y;
        if (ex * ex + ey * ey > TOL * TOL) same = false;
      }
      if (same) return null;
    }
    _lastFrame = now; _last = {};
    return live.map(p => {
      const e = [p._nid, Math.round(p.x), Math.round(p.y), r1(p.vx), r1(p.vy), p.color, _kind(p), Math.min(255, p.life | 0)];
      _last[p._nid] = [e[1], e[2], e[3], e[4]];
      return e;
    });
  }
  // Receiver: list is the sender's full live set. key identifies the sender.
  function apply(key, owner, list) {
    if (!owner || !Array.isArray(list) || typeof projectiles === 'undefined') return;
    const seen = {};
    for (const e of list) {
      if (!Array.isArray(e) || !(e[0] > 0) || !isFinite(e[1]) || !isFinite(e[2])) continue;
      const k = key + ':' + e[0], vx = +e[3] || 0, vy = +e[4] || 0;
      seen[k] = true;
      let g = _ghosts.get(k);
      if (g && !g.active) { _ghosts.delete(k); g = null; }
      if (!g) {
        g = new Projectile(e[1], e[2], vx, vy, owner, 0, typeof e[5] === 'string' ? e[5].slice(0, 24) : '#ffffff');
        g._netGhost = true; g._ghostAge = 0; g._ox = g._oy = 0; g.hitEntities = new Set();
        const kd = e[6] | 0;
        if (kd & 1) g._isArrow = true;
        if (kd & 2) g._isPaperPlane = true;
        if (kd & 4) g._isShuriken = true;
        _ghosts.set(k, g);
        projectiles.push(g);
      } else {
        const ex = e[1] - g.x, ey = e[2] - g.y, err = Math.hypot(ex, ey);
        NetProj.lastErr = err;
        if (err > SNAP) { g.x = e[1]; g.y = e[2]; g._ox = g._oy = 0; }
        else { g._ox = ex; g._oy = ey; }
        g.vx = vx; g.vy = vy;
      }
      g.life = Math.max(1, e[7] | 0 || 90);
      g._ghostAge = 0;
    }
    for (const [k, g] of _ghosts) {
      if (k.indexOf(key + ':') !== 0 || seen[k]) continue;
      if (g.active) { g.active = false; spawnParticles(g.x, g.y, g.color, 3); }
      _ghosts.delete(k);
    }
  }
  function clear(key) {
    for (const [k, g] of _ghosts) if (key == null || k.indexOf(key + ':') === 0) { g.active = false; _ghosts.delete(k); }
  }
  return { EVERY, collect, apply, clear, lastErr: 0, _ghosts };
})();
