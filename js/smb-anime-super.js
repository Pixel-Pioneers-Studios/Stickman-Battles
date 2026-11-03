'use strict';
// smb-anime-super.js: shonen-anime treatment for supers, Q moves, Combo Domain opens, parries and clashes
// (TEAM_NOTES.md).
// Behind settings.animeSuperFx, off by default. Built only from the cinematic kit in smb-cinematics-core.js:
// impact frames in the fighter's colour (not white: white flashes are kept for kills), a darkened background,
// radial speed lines and name cards. Class domains, convictions and finishers already stage their own and
// are left alone. Render-only; never changes game state.
// Depends on CinFX and WEAPON_DESCS at call time only.

if (typeof settings !== 'undefined' && settings.animeSuperFx === undefined) {
  try { settings.animeSuperFx = localStorage.getItem('smc_animeSuperFx') === '1'; } catch (e) { settings.animeSuperFx = false; }
}

const ANIME_SUPER_HOLD = 8;     // frames the super wind-up is held

// "E — Air Slash: 3 crescent arcs..." -> "AIR SLASH".
function _animeSuperName(f) {
  const d = typeof WEAPON_DESCS !== 'undefined' && WEAPON_DESCS[f.weaponKey];
  const m = d && typeof d.super === 'string' && d.super.match(/—\s*([^:]+):/);
  return (m ? m[1].trim() : 'Super').toUpperCase();
}

function animeSuperFX(f) {
  if (typeof settings === 'undefined' || !settings.animeSuperFx) return false;
  if (!f || f.isBoss || typeof CinFX === 'undefined') return false;
  const col = f.color || '#ffffff';
  // Held pose: the frame stops on the wind-up. Offline only, since hit-stop pauses this machine's sim.
  if (typeof onlineMode === 'undefined' || !onlineMode) { if (typeof animHold === 'function') animHold(ANIME_SUPER_HOLD); }
  CinFX.impactFrame([f], { dur: 3, color: col });
  CinFX.bgContrast('#05050c', 0.6, 34);
  CinFX.speedLines(f.cx(), f.cy(), col, { count: 34, maxLen: 340, dur: 20 });
  CinFX.nameCard(_animeSuperName(f), '#ffffff', { accent: col, dur: 72 });
  return true;
}

const ANIME_Q_HIT_WINDOW = 90;   // frames after a Q in which its first hit gets the impact beat

// Q: a short name card on every ability. The impact frame waits for the ability's first hit (animeHitFX),
// because many abilities are buffs, guards or throws that may never connect.
function animeAbilityFX(f) {
  if (typeof settings === 'undefined' || !settings.animeSuperFx) return false;
  if (!f || f.isBoss || !f.weapon || typeof CinFX === 'undefined') return false;
  f._animeQUntil = (typeof frameCount !== 'undefined' ? frameCount : 0) + ANIME_Q_HIT_WINDOW;
  if (f.weapon.abilityName) CinFX.nameCard(f.weapon.abilityName.toUpperCase(), '#ffffff', { accent: f.color || '#ffffff', dur: 48 });
  return true;
}

/** Called from dealDamage after a landed hit. Only the first hit of a Q gets the beat. */
function animeHitFX(attacker, target, dmg, guardUp) {
  if (!attacker || !attacker._animeQUntil || guardUp || !(dmg > 0) || !target) return;
  if ((typeof frameCount !== 'undefined' ? frameCount : 0) > attacker._animeQUntil) { attacker._animeQUntil = 0; return; }
  attacker._animeQUntil = 0;
  if (typeof settings === 'undefined' || !settings.animeSuperFx || typeof CinFX === 'undefined') return;
  const col = attacker.color || '#ffffff';
  CinFX.impactFrame([attacker, target], { dur: 2, color: col });
  CinFX.speedLines(target.cx(), target.cy(), col, { count: 22, maxLen: 240, dur: 12 });
}

/** Combo Domain open: the super treatment with the domain's name. True when it replaced the text announcement. */
function animeDomainFX(owner, def) {
  if (typeof settings === 'undefined' || !settings.animeSuperFx) return false;
  if (!owner || !def || typeof CinFX === 'undefined') return false;
  CinFX.impactFrame([owner], { dur: 3, color: def.color });
  CinFX.bgContrast('#05050c', 0.6, 40);
  CinFX.speedLines(owner.cx(), owner.cy(), def.color, { count: 40, maxLen: 380, dur: 22 });
  CinFX.nameCard(def.name.toUpperCase(), '#ffffff', { accent: def.color, dur: 92 });
  return true;
}

/** Parry: a two-frame impact frame in the parrier's colour, speed lines and a COUNTER card. */
function animeParryFX(parrier, attacker) {
  if (typeof settings === 'undefined' || !settings.animeSuperFx || typeof CinFX === 'undefined') return;
  if (!parrier || !attacker) return;
  const col = parrier.color || '#ffff00';
  CinFX.impactFrame([parrier, attacker], { dur: 2, color: col });
  CinFX.speedLines((parrier.cx() + attacker.cx()) / 2, parrier.cy(), col, { count: 26, maxLen: 260, dur: 14 });
  CinFX.nameCard('COUNTER', '#ffffff', { accent: col, dur: 44 });
}

/** Weapon clash (checkWeaponSparks): a white-hot spark star where the blades met, no card or freeze. */
function animeClashFX(x, y, a, b) {
  if (typeof settings === 'undefined' || !settings.animeSuperFx || typeof CinFX === 'undefined') return;
  CinFX.speedLines(x, y, '#ffe9a0', { count: 16, maxLen: 150, dur: 9 });
  if (a && b) CinFX.impactFrame([a, b], { dur: 1, color: '#2a2440' });
}
