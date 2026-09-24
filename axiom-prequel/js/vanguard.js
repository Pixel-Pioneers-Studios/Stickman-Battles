'use strict';

// ─── Vanguard chapters ────────────────────────────────────────────────────────
// A vanguard chapter is a combat chapter where the thing being defended is not
// Axiom. Enemies in one will walk past him to reach Anders, Seraph and VAEL, and
// every hit a companion takes drains a shared RESOLVE meter. Axiom's own health
// still ends the run the normal way, but RESOLVE is the chapter's real fail
// condition: it is the only place in the game where losing means someone else
// went first.
//
// The verb is BRACE (hold S / Down). Braced, Axiom plants his feet, cannot move
// or swing, takes reduced damage from the front, and pulls the target of every
// nearby enemy onto himself. So bracing buys the companions time and costs the
// player the only thing that ends the chapter — a cleared room.
//
// Vanguard chapters run inside gamePhase 'playing', so every existing combat
// system applies unchanged. `vanguardActive()` is the single gate.

// ─── Tuning ───────────────────────────────────────────────────────────────────
const VG_BRACE_PULL_X   = 200;   // horizontal reach of the brace pull
const VG_BRACE_PULL_Y   = 92;    // vertical reach — no pulling across platforms
const VG_BRACE_DR       = 0.45;  // damage multiplier when braced and hit in front
const VG_INTERPOSE_X    = 230;   // how far out an enemy still reads Axiom as in the way
const VG_INTERPOSE_Y    = 74;    // vertical band for "in the way"
const VG_RETARGET_EVERY = 24;    // frames between target re-evaluations (anti-flicker)
const VG_AXIOM_PULL     = 70;    // px of free distance Axiom gets when scoring targets
const VG_DRAIN_PER_DMG  = 1.0;   // resolve lost per point of companion damage
const VG_DRAIN_LAUNCH   = 10;    // extra resolve lost when a companion is knocked down
const VG_REGEN_DELAY    = 170;   // frames of nobody-hit before resolve starts recovering
const VG_REGEN_RATE     = 0.05;  // resolve per frame once recovering
const VG_ENGAGE_RANGE   = 350;   // matches Enemy._runAI — past this an enemy does nothing
const VG_FLANKER_SHARE  = 0.4;   // fraction of a wave that walks past Axiom on purpose

// ─── State ────────────────────────────────────────────────────────────────────
let _vgOn         = false;
let _vgResolve    = 100;
let _vgMaxResolve = 100;
let _vgSinceHit   = 0;
let _vgHitFlash   = 0;
let _vgFailed     = false;
let _vgFailTimer  = 0;
let _vgHintTimer  = 0;

function vanguardActive()  { return _vgOn; }
function isVanguardFailed() { return _vgFailed; }

// ─── Init ─────────────────────────────────────────────────────────────────────
// Called from loadChapter() for every chapter, so a non-vanguard chapter always
// clears the flag and nothing leaks between loads.
function initVanguard(ch) {
  _vgOn = ch?.type === 'vanguard';
  if (!_vgOn) { _vgFailed = false; return; }

  _vgMaxResolve = ch.resolve ?? 100;
  _vgResolve    = _vgMaxResolve;
  _vgSinceHit   = VG_REGEN_DELAY;
  _vgHitFlash   = 0;
  _vgFailed     = false;
  _vgFailTimer  = 0;
  _vgHintTimer  = ch.braceHint ? 420 : 0;

  // Without flankers the chapter solves itself: walk in front, stay in front.
  // These ones ignore Axiom entirely and go around him for the companions, so
  // the only answer to them is a brace — which costs the player tempo.
  // Every third enemy, so a wave is always mixed and the pattern is readable.
  const step = Math.max(2, Math.round(1 / VG_FLANKER_SHARE));
  enemies.forEach((e, i) => { e._vgFlanker = (i % step === 1); });
}

// ─── Damage hooks (called from dealDamage) ────────────────────────────────────
function vanguardOnCompanionHit(companion, damage, launched) {
  if (!_vgOn || _vgFailed) return;

  _vgResolve  = Math.max(0, _vgResolve - damage * VG_DRAIN_PER_DMG - (launched ? VG_DRAIN_LAUNCH : 0));
  _vgSinceHit = 0;
  _vgHitFlash = 26;
  shake(4);
  spawnParticles(companion.cx(), companion.cy(), '#cc4444', 6, { speed: 3 });

  if (_vgResolve <= 0) {
    _vgFailed    = true;
    _vgFailTimer = 0;
  }
}

// Damage multiplier applied to a hit landing on a braced Axiom. Hits from behind
// or from above ignore the brace entirely — planting your feet is not a shield.
function vanguardBraceMult(attacker) {
  if (!_vgOn || !axiomPlayer?.bracing || !attacker) return 1;
  const fromFront = (attacker.cx() - axiomPlayer.cx()) * axiomPlayer.facing > -12;
  const fromAbove = attacker.cy() < axiomPlayer.y - 10;
  return (fromFront && !fromAbove) ? VG_BRACE_DR : 1;
}

// ─── Targeting ────────────────────────────────────────────────────────────────
// Every enemy in a vanguard chapter asks for a target through here. Outside one
// the answer is always Axiom, which is exactly the old behaviour.
function vanguardPickTarget(enemy) {
  if (!_vgOn) return axiomPlayer;

  const ax = axiomPlayer;
  const axAlive = ax && ax.health > 0 && ax.state !== 'dead';

  // Braced and in reach — he has made himself the only thing worth hitting.
  if (axAlive && ax.bracing
      && Math.abs(ax.cx() - enemy.cx()) < VG_BRACE_PULL_X
      && Math.abs(ax.cy() - enemy.cy()) < VG_BRACE_PULL_Y) {
    return ax;
  }

  const candidates = [];
  if (axAlive) candidates.push(ax);
  for (const c of companions) {
    if (c.health <= 0 || c.state === 'knockdown') continue;
    candidates.push(c);
  }
  if (candidates.length === 0) return null;

  // A flanker is here for the people behind him, and will not be talked out of
  // it by proximity or by a body in the doorway. Only a brace moves it.
  const flanker = !!enemy._vgFlanker;

  let best = null, bestScore = Infinity;
  for (const t of candidates) {
    if (flanker && t === ax) continue;   // it will walk right past him
    let score = Math.abs(t.cx() - enemy.cx()) + Math.abs(t.cy() - enemy.cy()) * 1.6;
    if (t === ax) score -= VG_AXIOM_PULL;
    if (score < bestScore) { bestScore = score; best = t; }
  }
  if (!best) return ax;   // every companion down — it settles for him

  // Standing on the line between this enemy and the companion it wants is the
  // whole positional game — it re-aims the enemy without costing a brace.
  if (!flanker && best !== ax && axAlive && _vgInterposed(enemy, best)) return ax;

  return best;
}

function _vgInterposed(enemy, target) {
  const ax = axiomPlayer;
  const ex = enemy.cx(), tx = target.cx(), px = ax.cx();
  if (Math.abs(ex - px) > VG_INTERPOSE_X)          return false;
  if (Math.abs(ax.cy() - enemy.cy()) > VG_INTERPOSE_Y) return false;
  // Same side of the enemy as its target, and nearer to the enemy than the
  // target is — i.e. actually standing in the path.
  return (px - ex) * (tx - ex) > 0 && Math.abs(px - ex) < Math.abs(tx - ex);
}

// ─── Update ───────────────────────────────────────────────────────────────────
function updateVanguard() {
  if (!_vgOn) return;

  if (_vgFailed) { _vgFailTimer++; return; }

  if (_vgHitFlash  > 0) _vgHitFlash--;
  if (_vgHintTimer > 0) _vgHintTimer--;

  _vgSinceHit++;
  if (_vgSinceHit > VG_REGEN_DELAY && _vgResolve < _vgMaxResolve) {
    _vgResolve = Math.min(_vgMaxResolve, _vgResolve + VG_REGEN_RATE);
  }
}

// ─── World-space overlay (drawn under the fighters) ───────────────────────────
function drawVanguardOverlay() {
  if (!_vgOn || !axiomPlayer) return;

  // Brace ring — the reach of the pull, so the player can see who they own.
  if (axiomPlayer.bracing) {
    const cx = axiomPlayer.cx() - camX;
    const cy = axiomPlayer.y + axiomPlayer.h - 4;
    const pulse = 0.9 + Math.sin(frameCount * 0.16) * 0.1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.3);
    ctx.strokeStyle = `rgba(210,180,110,${0.30 * pulse})`;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(0, 0, VG_BRACE_PULL_X * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(210,180,110,${0.13 * pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, VG_BRACE_PULL_X * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Threat markers. A full line from each enemy to its target stacks into one
  // solid bar across the screen when a wave all wants the same companion, so
  // this draws a short dash leaving the enemy in the target's direction instead.
  // Enemies aiming at Axiom draw nothing — that is the resting state.
  for (const e of enemies) {
    if (e.health <= 0 || e.state === 'dead') continue;
    const t = e.aiTarget;
    if (!t || t === axiomPlayer) continue;
    // An enemy outside its engagement range is standing still and is not a
    // threat to anyone yet — flagging it just cries wolf.
    if (Math.abs(t.cx() - e.cx()) > VG_ENGAGE_RANGE) continue;

    const ex = e.cx() - camX, ey = e.cy();
    if (ex < -40 || ex > GAME_W + 40) continue;

    const dir  = t.cx() > e.cx() ? 1 : -1;
    const dgap = Math.abs(t.cx() - e.cx());
    const a    = clamp(1 - dgap / 700, 0.25, 1) * 0.65;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#cc4444';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    const reach = 26 + Math.sin(frameCount * 0.14 + e.x * 0.01) * 5;
    ctx.beginPath();
    ctx.moveTo(ex + dir * 14, ey - 4);
    ctx.lineTo(ex + dir * (14 + reach), ey - 4);
    ctx.stroke();
    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(ex + dir * (14 + reach + 5), ey - 4);
    ctx.lineTo(ex + dir * (14 + reach - 2), ey - 8);
    ctx.lineTo(ex + dir * (14 + reach - 2), ey);
    ctx.closePath();
    ctx.fillStyle = '#cc4444';
    ctx.fill();
    ctx.restore();
  }

  // Caret over any companion currently being aimed at.
  for (const c of companions) {
    const aimed = enemies.some(e => e.health > 0 && e.state !== 'dead' && e.aiTarget === c
                                    && Math.abs(c.cx() - e.cx()) <= VG_ENGAGE_RANGE);
    if (!aimed) continue;
    const cx = c.cx() - camX;
    const cy = c.y - 14 - Math.abs(Math.sin(frameCount * 0.12)) * 4;
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle   = '#cc4444';
    ctx.beginPath();
    ctx.moveTo(cx, cy + 8);
    ctx.lineTo(cx - 6, cy);
    ctx.lineTo(cx + 6, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function drawVanguardHUD() {
  if (!_vgOn) return;

  const bw = 230, bh = 11;
  const bx = GAME_W / 2 - bw / 2;
  const by = GAME_H - 58;
  const r  = _vgResolve / _vgMaxResolve;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur  = 6;

  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
  ctx.fillStyle = '#231a10';
  ctx.fillRect(bx, by, bw, bh);

  const col = r > 0.55 ? '#c8a850' : r > 0.28 ? '#cc8833' : '#dd4433';
  ctx.fillStyle = col;
  ctx.fillRect(bx, by, bw * r, bh);

  if (_vgHitFlash > 0) {
    ctx.fillStyle = `rgba(255,220,180,${(_vgHitFlash / 26) * 0.55})`;
    ctx.fillRect(bx, by, bw, bh);
  }
  if (r <= 0.28) {
    ctx.strokeStyle = `rgba(221,68,51,${0.3 + Math.sin(frameCount * 0.22) * 0.25})`;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(bx - 2, by - 2, bw + 4, bh + 4);
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle  = '#a89870';
  ctx.font       = 'bold 10px Courier New';
  ctx.textAlign  = 'center';
  ctx.fillText('R E S O L V E', GAME_W / 2, by - 8);

  // Brace state readout
  ctx.font      = 'bold 11px Courier New';
  ctx.fillStyle = axiomPlayer?.bracing ? '#e8d090' : '#6a6250';
  ctx.fillText(axiomPlayer?.bracing ? 'BRACED' : '[S] BRACE', GAME_W / 2, by + bh + 14);

  // First-chapter teach line
  if (_vgHintTimer > 0) {
    const a = Math.min(1, _vgHintTimer / 90) * (0.55 + Math.sin(frameCount * 0.08) * 0.2);
    ctx.globalAlpha = a;
    ctx.fillStyle   = '#d8c89a';
    ctx.font        = 'italic 14px Courier New';
    ctx.fillText('They will be reached first unless you are in the way.', GAME_W / 2, GAME_H * 0.24);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ─── Failure overlay ──────────────────────────────────────────────────────────
function drawVanguardFail() {
  if (!_vgOn || !_vgFailed) return;

  const a = Math.min(1, _vgFailTimer / 90);
  ctx.fillStyle = `rgba(6,4,2,${a * 0.82})`;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  if (_vgFailTimer <= 55) return;
  const ta = Math.min(1, (_vgFailTimer - 55) / 30);

  ctx.save();
  ctx.globalAlpha = ta;
  ctx.shadowColor = 'rgba(0,0,0,1)';
  ctx.shadowBlur  = 14;
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#c8a850';
  ctx.font        = 'bold 32px Courier New';
  ctx.fillText('THEY WENT FIRST', GAME_W / 2, GAME_H / 2 - 6);
  ctx.fillStyle   = '#8a7f66';
  ctx.font        = 'italic 14px Courier New';
  ctx.fillText('That was the one thing he was for.', GAME_W / 2, GAME_H / 2 + 26);
  ctx.fillStyle   = '#aaaaaa';
  ctx.font        = '15px Courier New';
  ctx.fillText('[J]  TRY AGAIN', GAME_W / 2, GAME_H / 2 + 62);
  ctx.shadowBlur  = 0;
  ctx.restore();
}
