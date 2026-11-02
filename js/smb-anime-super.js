'use strict';
// smb-anime-super.js: prototype of the shonen-anime super (TEAM_NOTES.md art direction), for Aarush to review.
// Behind settings.animeSuperFx, off by default. Built only from the cinematic kit in smb-cinematics-core.js:
// a 3-frame impact frame in the fighter's colour (not white: white flashes are kept for kills), a darkened
// background, radial speed lines and the move's name card. Render-only; never changes game state.
// Depends on CinFX and WEAPON_DESCS at call time only.

if (typeof settings !== 'undefined' && settings.animeSuperFx === undefined) {
  try { settings.animeSuperFx = localStorage.getItem('smc_animeSuperFx') === '1'; } catch (e) { settings.animeSuperFx = false; }
}

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
  CinFX.impactFrame([f], { dur: 3, color: col });
  CinFX.bgContrast('#05050c', 0.6, 34);
  CinFX.speedLines(f.cx(), f.cy(), col, { count: 34, maxLen: 340, dur: 20 });
  CinFX.nameCard(_animeSuperName(f), '#ffffff', { accent: col, dur: 72 });
  return true;
}
