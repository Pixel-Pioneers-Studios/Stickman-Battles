'use strict';
// smb-br-forms.js — Battle Royale creature forms.
// Kill the beast or the yeti and you become it: no weapons, the creature's body,
// moves, speed and toughness, and a form health bar that sits on top of your own.
// When the form's health is gone you shed it and are back to your own fighter,
// holding your own weapon. Bots earn forms the same way the player does.
// Depends on: smb-fighter.js, smb-combat.js, smb-enemies-core.js (ForestBeast,
//             creatureFoes), smb-enemies-creatures.js (Yeti), smb-battleroyale.js
//
// A form is a set of instance properties grafted onto the fighter and removed
// again on shedding. The fighter object never changes identity, so nothing that
// holds a reference to it (players[], minions[], targets, the camera) notices.

const BR_FORMS = {
  beast: {
    label: 'BEAST', color: '#e0a050',
    proto: () => ForestBeast.prototype, helpers: ['_drawLimb', '_furPath'],
    w: 32, h: 62, hp: 160,
    dmgMult: 1.25, kbResist: 0.55, kbBonus: 1.3, speed: 1.4,
    weaponBase: 'axe', range: 46, cooldown: 16, abilityCd: 150,
    moves: ['Claw', 'Pounce', 'Savage Slam'],
  },
  yeti: {
    label: 'YETI', color: '#9fd8ff',
    proto: () => Yeti.prototype, helpers: ['_fur'],
    w: 40, h: 76, hp: 240,
    dmgMult: 1.1, kbResist: 0.35, kbBonus: 1.3, speed: 0.85,
    weaponBase: 'hammer', range: 58, cooldown: 28, abilityCd: 210,
    moves: ['Smash', 'Ice Breath', 'Freeze Slam'],
  },
};
const BR_FORM_LIFESTEAL = 0.35;   // share of damage dealt that refills the form
const BR_FORM_OFFER_F   = 360;    // the player has 6s to take a form; silence declines
const BR_FORM_FIELDS = ['weapon', 'weaponKey', 'dmgMult', 'kbResist', 'kbBonus', 'classSpeedMult',
                        'w', 'h', '_noWhiffGuard', '_wxExtraJumps', 'isRaged'];
const BR_FORM_METHODS = ['attack', 'ability', 'useSuper', 'activateSuper', 'draw'];
const _BR_FORM_NONE = {};

function _brFormFoes(f) {
  const out = [];
  const all = players.concat(minions);
  for (const o of all) if (isHostileTarget(f, o)) out.push(o);
  return out;
}

// Global juice (shake, sound) only for forms the camera can see.
function _brFormIsLocal(f) {
  return typeof _brIsAudibleHit !== 'function' || _brIsAudibleHit(f, f);
}

// ── Grant / shed ────────────────────────────────────────────
function brGrantForm(f, kind) {
  const def = BR_FORMS[kind];
  if (!f || !def || f.health <= 0) return;
  if (f._brForm) _brShedForm(f, true);

  const saved = {};
  for (const k of BR_FORM_FIELDS) saved[k] = f[k];
  saved.own = {};
  for (const m of BR_FORM_METHODS.concat(def.helpers)) {
    saved.own[m] = Object.prototype.hasOwnProperty.call(f, m) ? f[m] : _BR_FORM_NONE;
  }

  // Keep the feet where they were: the new body grows up from the ground.
  const feet = f.y + f.h, cx = f.cx();
  f.w = def.w; f.h = def.h;
  f.x = cx - def.w / 2; f.y = feet - def.h;

  // A stand-in weapon so the bot brain and the AI's range checks have something
  // honest to read. noSwingHitbox: damage comes only from the form's own moves.
  f.weapon = Object.assign({}, WEAPONS[def.weaponBase], {
    name: def.label + ' FORM', type: 'melee', range: def.range, cooldown: def.cooldown,
    abilityCooldown: def.abilityCd, noSwingHitbox: true, endlag: 0,
  });
  f.weaponKey      = def.weaponBase;
  f.dmgMult        = def.dmgMult;
  f.kbResist       = def.kbResist;
  f.kbBonus        = def.kbBonus;
  f.classSpeedMult = def.speed;
  f._noWhiffGuard  = true;
  f._weaponTip     = null;
  f.isRaged        = false;
  f.attackTimer    = 0;
  f.cooldown       = 0;
  f.abilityCooldown = 0;

  f._brForm = { kind, def, hp: def.hp, maxHp: def.hp, saved, broken: false,
                slamPhase: 'none', slamTimer: 0, leaping: false, airborne: false, leapT: 0,
                rakeN: 0, rakeAt: -99, frenzy: 0, healPool: 0, swipe: 0 };
  f._slamPhase    = 'none';
  f._heavyPhase   = 'none';
  f._heavyTimer   = 0;
  f.iceSpikes     = [];
  f._freezeZones  = [];

  const proto = def.proto();
  for (const h of def.helpers) f[h] = proto[h];
  f.attack        = _brFormAttack;
  f.ability       = _brFormAbility;
  f.useSuper      = _brFormSuper;
  f.activateSuper = function () {};
  f.draw          = _brFormDraw;

  f.invincible = Math.max(f.invincible || 0, 45);
  if (settings.particles) {
    spawnParticles(f.cx(), f.cy(), def.color, 24);
    spawnParticles(f.cx(), f.y + f.h, '#ffffff', 10);
  }
  if (typeof DamageText !== 'undefined')
    damageTexts.push(new DamageText(f.cx(), f.y - 30, def.label + ' FORM!', def.color));
  if (_brFormIsLocal(f)) {
    if (settings.screenShake) screenShake = Math.max(screenShake, 10);
    if (typeof SoundManager !== 'undefined' && SoundManager.heavyHit) SoundManager.heavyHit();
  }
}

function _brShedForm(f, silent) {
  const fm = f._brForm;
  if (!fm) return;
  const feet = f.y + f.h, cx = f.cx();
  for (const k of BR_FORM_FIELDS) f[k] = fm.saved[k];
  for (const m in fm.saved.own) {
    if (fm.saved.own[m] === _BR_FORM_NONE) delete f[m];
    else f[m] = fm.saved.own[m];
  }
  f.x = cx - f.w / 2; f.y = feet - f.h;
  f._brForm      = null;
  f._weaponTip   = null;
  f.attackTimer  = 0;
  f.cooldown     = 0;
  f._freezeZones = [];
  f.iceSpikes    = [];
  if (silent) return;
  f.invincible = Math.max(f.invincible || 0, 40);
  if (settings.particles) {
    spawnParticles(f.cx(), f.cy(), fm.def.color, 20);
    spawnParticles(f.cx(), f.cy(), '#ffffff', 8);
  }
  if (typeof DamageText !== 'undefined')
    damageTexts.push(new DamageText(f.cx(), f.y - 30, 'FORM BROKEN', '#ffaa88'));
}

// ── Damage pipeline hooks (called from dealDamage) ──────────
// Returns the damage that gets through to the body. Storm, lava and other
// attacker-less damage skips the form: it is the ring's job to end a match.
function brFormAbsorb(target, dmg, attacker) {
  const fm = target._brForm;
  if (!fm || fm.broken || dmg <= 0 || !attacker) return dmg;
  fm.hp -= dmg;
  if (fm.hp > 0) return 0;
  const over = -fm.hp;
  fm.hp = 0;
  fm.broken = true;   // shed at the next BR update, not mid-dealDamage
  return over;
}

function brFormOnHit(attacker, target, dmg) {
  const fm = attacker._brForm;
  if (!fm || fm.broken || attacker === target || dmg <= 0 || attacker.health <= 0) return;
  fm.healPool += dmg * BR_FORM_LIFESTEAL;
  const n = Math.floor(fm.healPool);
  if (n < 1) return;
  fm.healPool -= n;
  const toForm = Math.min(n, fm.maxHp - fm.hp);
  fm.hp += toForm;
  // A full form spills the rest into the body.
  const toBody = Math.min(n - toForm, attacker.maxHealth - attacker.health);
  if (toBody > 0) attacker.health += toBody;
  if (n >= 3 && settings.dmgNumbers && typeof DamageText !== 'undefined')
    damageTexts.push(new DamageText(attacker.cx(), attacker.y - 18, '+' + n, '#44ff88'));
}

// ── Moves ───────────────────────────────────────────────────
function _brFormCanAct(f) {
  if (typeof isCinematic !== 'undefined' && isCinematic) return false;
  if (f.health <= 0 || f.stunTimer > 0 || f.ragdollTimer > 0 || f.shielding) return false;
  if (f.state === 'dead' || f.state === 'stunned' || f.state === 'ragdoll') return false;
  const fm = f._brForm;
  return !!fm && !fm.broken && fm.slamPhase === 'none';
}

// Bots aim with the target they were handed; players aim where they face.
function _brFormAim(f, target) {
  if (f.isAI && target && target.health > 0 && Math.abs(target.cx() - f.cx()) > 4)
    f.facing = target.cx() > f.cx() ? 1 : -1;
}

function _brFormStrike(f, reach, halfH, dmg, kb, launchVy) {
  let hit = false;
  for (const o of _brFormFoes(f)) {
    const ahead = (o.cx() - f.cx()) * f.facing;
    if (ahead < -12 || ahead > reach + o.w / 2) continue;
    if (Math.abs(o.cy() - f.cy()) > halfH) continue;
    dealDamage(f, o, dmg, kb);
    if (launchVy) o.vy = Math.min(o.vy, launchVy);
    hit = true;
  }
  return hit;
}

function _brFormAttack(target) {
  if (!_brFormCanAct(this) || this.cooldown > 0 || this.attackEndlag > 0) return;
  const fm = this._brForm, def = fm.def;
  _brFormAim(this, target);
  const fc = typeof frameCount !== 'undefined' ? frameCount : 0;
  this._attackStartFrame = fc;
  this._attackKindTier   = null;
  this.attackDuration    = 10;
  this.attackTimer       = 10;
  fm.swipe = 10;

  if (fm.kind === 'beast') {
    // Three-rake string: every third claw in quick succession tears harder.
    fm.rakeN = (fc - fm.rakeAt < 45) ? fm.rakeN + 1 : 1;
    fm.rakeAt = fc;
    const heavy = fm.rakeN % 3 === 0;
    this.cooldown = Math.round(def.cooldown * (fm.frenzy > 0 ? 0.6 : 1));
    this.weaponHit = _brFormStrike(this, def.range, 46, heavy ? 14 : 9, heavy ? 11 : 6, heavy ? -6 : 0);
    this.attackEndlag = heavy ? 10 : 3;
    if (settings.particles && typeof spawnParticlesDir === 'function')
      spawnParticlesDir(this.cx() + this.facing * 26, this.cy(), heavy ? '#ffd080' : '#f0e0c0', heavy ? 8 : 4, this.facing, 0, 0.5);
  } else {
    this.cooldown = def.cooldown;
    this.weaponHit = _brFormStrike(this, def.range, 52, 15, 12, -5);
    this.attackEndlag = 8;
    if (settings.particles) spawnParticles(this.cx() + this.facing * 34, this.y + this.h - 4, '#cfe8ff', 6);
  }
}

function _brFormAbility(target) {
  if (!_brFormCanAct(this) || this.abilityCooldown > 0) return;
  const fm = this._brForm, def = fm.def;
  _brFormAim(this, target);
  if (fm.kind === 'beast') {
    if (!this.onGround) return;
    // Pounce: a long arc that lands as a shockwave (resolved in the tick).
    this.vy = -15;
    this.vx = this.facing * 13;
    this.onGround = false;
    fm.leaping = true; fm.airborne = false; fm.leapT = 0;
    if (settings.particles) spawnParticles(this.cx(), this.y + this.h, '#1a8a2e', 10);
  } else {
    // Ice breath: a fan of slow shards toward the target (or straight ahead).
    const base = (this.isAI && target && target.health > 0)
      ? Math.atan2(target.cy() - this.cy(), target.cx() - this.cx())
      : (this.facing > 0 ? 0 : Math.PI);
    for (let i = -2; i <= 2; i++) {
      const a = base + i * 0.16, spd = 5.5 + Math.random() * 1.5;
      const proj = new Projectile(this.cx() + Math.cos(a) * 24, this.cy() - 6,
                                  Math.cos(a) * spd, Math.sin(a) * spd, this, 6, '#88ccff');
      proj.isIce = true;
      proj.life  = 70;
      projectiles.push(proj);
    }
    if (settings.particles) spawnParticles(this.cx() + this.facing * 24, this.cy(), '#aaddff', 10);
  }
  this.abilityCooldown = def.abilityCd;
}

function _brFormSuper() {
  if (!_brFormCanAct(this) || !this.superReady) return;
  const fm = this._brForm;
  this.superReady = false;
  this.superMeter = 0;
  fm.slamPhase = 'windup';
  fm.slamTimer = fm.kind === 'beast' ? 16 : 26;
  const r = fm.kind === 'beast' ? 110 : 130;
  if (typeof bossWarnings !== 'undefined') {
    bossWarnings.push({ type: 'circle', x: this.cx(), y: this.y + this.h, r,
      color: fm.kind === 'beast' ? '#cc5500' : '#88ccff',
      timer: fm.slamTimer + 4, maxTimer: fm.slamTimer + 4, label: '' });
  }
}

function _brFormSlamImpact(f, fm) {
  const beast = fm.kind === 'beast';
  const r = beast ? 110 : 130;
  const gy = f.y + f.h;
  for (const o of _brFormFoes(f)) {
    if (Math.abs(o.cx() - f.cx()) > r) continue;
    if (Math.abs((o.y + o.h) - gy) > 60) continue;
    dealDamage(f, o, beast ? 26 : 30, 10);
    o.vy = Math.min(o.vy, beast ? -10 : -12);
    if (!beast) o.stunTimer = Math.max(o.stunTimer || 0, 45);
  }
  if (typeof spawnImpact === 'function') spawnImpact(f.cx(), gy, beast ? 1.3 : 1.6, { shake: 0 });
  if (settings.particles) spawnParticles(f.cx(), gy, beast ? '#aa6600' : '#aaddff', 20);
  if (_brFormIsLocal(f) && settings.screenShake) screenShake = Math.max(screenShake, beast ? 12 : 16);
  if (typeof SoundManager !== 'undefined' && SoundManager.heavyHit && _brFormIsLocal(f)) SoundManager.heavyHit();
  if (beast) fm.frenzy = 300;   // red-eyed: faster claws for five seconds
  else f._freezeZones.push({ x: f.cx(), y: gy, r: 110, timer: 240, maxTimer: 240 });
}

// ── Per-frame ───────────────────────────────────────────────
function brUpdateForms() {
  const all = players.concat(minions);
  for (const f of all) {
    if (!f) continue;
    if (f._brFormPending) {
      const k = f._brFormPending;
      f._brFormPending = null;
      // The player chooses (F takes it, G or waiting turns it down); bots always take it.
      if (f.health > 0) {
        if (!f.isAI && players.indexOf(f) !== -1) f._brFormOffer = { kind: k, until: frameCount + BR_FORM_OFFER_F };
        else brGrantForm(f, k);
      }
    }
    if (f._brFormOffer && (f.health <= 0 || frameCount > f._brFormOffer.until)) f._brFormOffer = null;
    const fm = f._brForm;
    if (!fm || f.health <= 0) continue;
    if (fm.broken) { _brShedForm(f, false); continue; }
    _brFormTick(f, fm);
  }
}

function _brFormTick(f, fm) {
  if (fm.swipe > 0) fm.swipe--;

  if (fm.slamPhase === 'windup') {
    f.vx = 0;
    if (!f.onGround) f.vy = Math.max(f.vy, 6);   // airborne: drive down into the slam
    if (--fm.slamTimer <= 0) { fm.slamPhase = 'none'; _brFormSlamImpact(f, fm); }
  }

  if (fm.kind === 'beast') {
    if (f.onGround) f._wxExtraJumps = 1;   // agility: a third jump
    if (fm.frenzy > 0) fm.frenzy--;
    f.isRaged = fm.frenzy > 0;
    // Bots walk at a fixed AI pace; the beast's legs are faster than that.
    if (f.isAI && f.onGround && Math.abs(f.vx) > 0.5 && Math.abs(f.vx) < 6.5) f.vx *= 1.12;
    if (fm.leaping) {
      fm.leapT++;
      if (!f.onGround) fm.airborne = true;
      if (f.onGround && fm.airborne) {
        fm.leaping = false;
        const gy = f.y + f.h;
        for (const o of _brFormFoes(f)) {
          if (Math.abs(o.cx() - f.cx()) < 80 && Math.abs((o.y + o.h) - gy) < 50) dealDamage(f, o, 16, 12);
        }
        if (typeof spawnImpact === 'function') spawnImpact(f.cx(), gy, 0.8, { shake: 0 });
        if (_brFormIsLocal(f) && settings.screenShake) screenShake = Math.max(screenShake, 7);
      } else if (fm.leapT > 90) fm.leaping = false;
    }
  } else {
    f._heavyPhase = fm.slamPhase;
    f._heavyTimer = fm.slamTimer * (45 / 26);
    for (let i = f._freezeZones.length - 1; i >= 0; i--) {
      const z = f._freezeZones[i];
      if (--z.timer <= 0) { f._freezeZones.splice(i, 1); continue; }
      if (z.timer % 30 !== 0) continue;
      for (const o of _brFormFoes(f)) {
        if (o.onGround && Math.hypot(o.cx() - z.x, (o.y + o.h) - z.y) < z.r) {
          dealDamage(f, o, 4, 0);
          o.vx *= 0.4;
        }
      }
    }
  }
}

// ── Draw ────────────────────────────────────────────────────
function _brFormDraw() {
  const fm = this._brForm;
  if (!fm) return Fighter.prototype.draw.call(this);
  if (fm.kind === 'beast') this._slamPhase = fm.slamPhase === 'windup' ? 'windup' : 'none';
  fm.def.proto().draw.call(this);
  if (fm.swipe > 0 && this.health > 0) _brFormDrawSwipe(this, fm);
}

// Creature bodies have no swing pose of their own, so the strike is drawn as
// the trail it leaves: three claw rakes for the beast, one heavy arc for the yeti.
function _brFormDrawSwipe(f, fm) {
  const t = fm.swipe / 10;
  const cx = f.cx() + f.facing * (f.w * 0.55), cy = f.cy();
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.85 * t;
  if (fm.kind === 'beast') {
    ctx.strokeStyle = f.isRaged ? '#ffb070' : '#fff4dc';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy + i * 8, 20, f.facing > 0 ? -1.0 : Math.PI - 0.2, f.facing > 0 ? 0.2 : Math.PI + 1.0);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = '#dff2ff';
    ctx.lineWidth = 5 * t + 1;
    ctx.beginPath();
    ctx.arc(cx, cy + 6, 30, f.facing > 0 ? -1.3 : Math.PI - 0.4, f.facing > 0 ? 0.4 : Math.PI + 1.3);
    ctx.stroke();
  }
  ctx.restore();
}

function _brFormOfferHolder() {
  return players.find(pl => pl && !pl.isAI && pl.health > 0 && pl._brFormOffer) || null;
}

// Keyboard answers to the offer. Return true when the key was spent on it.
function brAcceptFormOffer() {
  const p = _brFormOfferHolder();
  if (!p) return false;
  const k = p._brFormOffer.kind;
  p._brFormOffer = null;
  brGrantForm(p, k);
  return true;
}

function brDeclineFormOffer() {
  const p = _brFormOfferHolder();
  if (!p) return false;
  p._brFormOffer = null;
  return true;
}

function _brDrawFormOffer(p) {
  const def = BR_FORMS[p._brFormOffer.kind];
  if (!def) return;
  const left = Math.max(0, p._brFormOffer.until - frameCount) / BR_FORM_OFFER_F;
  const w = 330, x = GAME_W / 2 - w / 2, y = GAME_H / 2 + 46;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x, y, w, 46);
  ctx.strokeStyle = def.color; ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 45);
  ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = def.color;
  ctx.fillText('Become the ' + def.label + '?', GAME_W / 2, y + 17);
  ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#ffffff';
  ctx.fillText('[F] Accept     [G] Decline', GAME_W / 2, y + 33);
  ctx.fillStyle = def.color;
  ctx.fillRect(x + 6, y + 40, (w - 12) * left, 2);
  ctx.restore();
}

// Screen-space panel above the inventory bar, for the local player only.
function brDrawFormHUD() {
  const p = players.find(pl => pl && !pl.isAI && pl.health > 0);
  if (p && p._brFormOffer) _brDrawFormOffer(p);
  if (!p || !p._brForm) return;
  const fm = p._brForm, def = fm.def;
  const w = 310, x = GAME_W / 2 - w / 2, y = GAME_H - 118;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x, y, w, 38);
  ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left';
  ctx.fillStyle = def.color;
  ctx.fillText(def.label + ' FORM' + (fm.frenzy > 0 ? '  — FRENZY' : ''), x + 8, y + 14);
  ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff';
  ctx.fillText(Math.ceil(fm.hp) + ' / ' + fm.maxHp, x + w - 8, y + 14);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x + 8, y + 18, w - 16, 5);
  ctx.fillStyle = def.color;
  ctx.fillRect(x + 8, y + 18, (w - 16) * Math.max(0, fm.hp / fm.maxHp), 5);
  ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,230,240,0.85)';
  ctx.fillText('Attack: ' + def.moves[0] + '   ·   Ability: ' + def.moves[1] + '   ·   Super: ' + def.moves[2],
               GAME_W / 2, y + 33);
}

if (typeof window !== 'undefined') {
  window.brGrantForm    = brGrantForm;
  window.brFormAbsorb   = brFormAbsorb;
  window.brFormOnHit    = brFormOnHit;
  window.brUpdateForms  = brUpdateForms;
  window.brDrawFormHUD  = brDrawFormHUD;
  window.brAcceptFormOffer  = brAcceptFormOffer;
  window.brDeclineFormOffer = brDeclineFormOffer;
}
