// ============================================================
// smb-visual-polish.js — Reversible render-only presentation pass
// Depends on: all runtime modules (loaded last)
//
// This module deliberately does not touch gameplay state, hitboxes, stats,
// input, saves, or timing. It wraps the existing Fighter renderer and adds a
// lightweight visual layer after the original model has been painted.
// ============================================================

const SMB_VISUAL_CLASS_COLORS = Object.freeze({
  warrior: '#f0a45b',
  thor: '#8fd7ff',
  kratos: '#ff6b5f',
  ninja: '#c0a7ff',
  gunner: '#ffc96b',
  archer: '#8fe3b0',
  paladin: '#ffe2a0',
  berserker: '#ff8b70',
  megaknight: '#9fb6d8',
  pugilist: '#ffbd72',
  ronin: '#ed9cae',
  reaper: '#bd8cff',
  summoner: '#7ce8e1',
  demolitionist: '#ff9e4a',
  warden: '#8bbcff',
});

function _smbVisualAccent(fighter) {
  if (!fighter) return '#f2762b';
  if (fighter.isBoss) {
    const phase = typeof fighter.getPhase === 'function' ? fighter.getPhase() : 0;
    return phase >= 3 ? '#ff584f' : phase >= 2 ? '#bd79ff' : '#f2762b';
  }
  return SMB_VISUAL_CLASS_COLORS[fighter.charClass] || fighter.color || '#f2762b';
}

function _smbDrawFighterPolish(fighter) {
  if (!fighter || typeof ctx === 'undefined' || fighter.backstageHiding) return;
  if (fighter.health <= 0 && !fighter.isBoss && !fighter.isDummy) return;
  if (fighter._trialInvisible) return;

  const cx = typeof fighter.cx === 'function' ? fighter.cx() : fighter.x + fighter.w * 0.5;
  const footY = fighter.y + fighter.h;
  const torsoY = fighter.y + fighter.h * 0.46;
  const facing = fighter.facing || 1;
  const t = Number(fighter.animTimer || 0);
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.075 + cx * 0.01);
  const accent = _smbVisualAccent(fighter);
  const cls = fighter.charClass || '';

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  // A soft contact shadow anchors the upgraded silhouettes to the arena.
  if (fighter.onGround && !fighter.ragdollTimer) {
    const shadowW = Math.max(12, Math.min(30, fighter.w * (0.72 + Math.abs(fighter.vx || 0) * 0.035)));
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(cx, footY + 2, shadowW, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.ellipse(cx, footY + 1.5, shadowW * 0.82, 2.2, 0, Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
  }

  const headR = typeof FIG_HEAD_R === 'number' ? FIG_HEAD_R : 8;
  const headX = cx + facing * 0.5;
  const headY = fighter.y + headR + 1;

  // Generic fighter language: a soft cloth headband and one loose tail. This
  // deliberately avoids chest cores, visors, armor plates, horns, and orbiting
  // tech/magic cues that made the old overlay read as a robot.
  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.35;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(headX - facing * headR * 0.82, headY - 1.5);
  ctx.quadraticCurveTo(headX, headY - 3.1, headX + facing * headR * 0.82, headY - 1.5);
  ctx.stroke();
  ctx.globalAlpha = 0.48;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(headX - facing * headR * 0.62, headY + 2.2);
  ctx.quadraticCurveTo(headX - facing * 11, headY + 6, headX - facing * (16 + pulse * 2), headY + 3);
  ctx.stroke();

  // Small hand/ankle wraps keep the silhouette human and athletic without
  // adding hard-surface geometry. They are only decorative and inside the
  // existing hitbox footprint.
  ctx.globalAlpha = 0.34;
  ctx.lineWidth = 0.9;
  for (const side of [-1, 1]) {
    const wrapX = cx + side * fighter.w * 0.22;
    ctx.beginPath();
    ctx.moveTo(wrapX - 2, torsoY + 7);
    ctx.lineTo(wrapX + 2, torsoY + 9);
    ctx.stroke();
  }

  // Motion ribbon: only during active movement/attack, so the model stays clean
  // at rest and movement reads with a little more authored energy.
  const speed = Math.abs(fighter.vx || 0);
  const attacking = fighter.state === 'attacking' || fighter.attackTimer > 0;
  if ((speed > 4.5 || attacking) && !fighter.ragdollTimer) {
    ctx.globalAlpha = attacking ? 0.22 : 0.12;
    ctx.strokeStyle = accent;
    ctx.lineCap = 'round';
    for (let i = 0; i < (attacking ? 2 : 1); i++) {
      const y = torsoY + 6 + i * 5;
      const len = (attacking ? 14 : 8) + speed * 1.3;
      ctx.lineWidth = attacking ? 1.3 : 0.9;
      ctx.beginPath();
      ctx.moveTo(cx - facing * 10, y);
      ctx.lineTo(cx - facing * (10 + len), y + (i ? 1 : -1));
      ctx.stroke();
    }
  }

  if (attacking && fighter._weaponTip) {
    const tip = fighter._weaponTip;
    ctx.globalAlpha = 0.22 + pulse * 0.10;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 5 + pulse * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Bosses get a very small orbit cue instead of another large aura.
  if (fighter.isBoss) {
    ctx.globalAlpha = 0.28 + pulse * 0.12;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(cx, torsoY, Math.max(18, fighter.w * 0.9), -0.65, 0.58);
    ctx.stroke();
  }

  ctx.restore();
}

(function _installSMBVisualPolish() {
  if (typeof Fighter === 'undefined' || !Fighter.prototype || Fighter.prototype._smbVisualPolishInstalled) return;
  const originalDraw = Fighter.prototype.draw;
  if (typeof originalDraw !== 'function') return;
  Fighter.prototype.draw = function smbVisualPolishDraw() {
    originalDraw.call(this);
    _smbDrawFighterPolish(this);
  };
  Fighter.prototype._smbVisualPolishInstalled = true;
})();
