'use strict';

// ─── The Revision QTE ─────────────────────────────────────────────────────────
// The endgame's confrontation grammar, and the reason God never gets a health
// bar. This is NOT a reflex test. The prompt itself is edited mid-input: the key
// you were told to use stops being a thing you can do, and the failure state is
// TRUSTING THE TERMS — continuing to press what you were told.
//
// A player who is merely fast fails this. A player who stops believing the
// instruction passes it.

let qte        = null;
let qteOnDone  = null;

// stage: { code, label, hold, frames, reviseAt?, to?: { code, label } }
function startQTE(stages, onDone) {
  qte = {
    stages, idx: 0, timer: 0,
    revised: false, satisfied: false,
    result: null,          // 'pass' | 'fail'
    flash: 0, failLine: null,
  };
  qteOnDone = onDone;
  gamePhase = 'qte';
}

function _qteStage() { return qte.stages[qte.idx]; }

function updateQTE() {
  if (!qte) return;

  if (qte.result) {
    qte.timer++;
    if (qte.timer > 110) {
      const r = qte.result, done = qteOnDone;
      qte = null; qteOnDone = null;
      done(r);
    }
    return;
  }

  const st = _qteStage();
  qte.timer++;

  if (st.reviseAt && !qte.revised && qte.timer >= st.reviseAt) {
    qte.revised = true;
    qte.graceAt = qte.timer;
    qte.flash   = 14;
    shake(5);
  }
  if (qte.flash > 0) qte.flash--;

  const want = qte.revised ? st.to : st;
  const dead = qte.revised ? st : null;

  // Failure: still obeying an instruction that has been withdrawn.
  if (dead) {
    const stillOn = dead.hold ? keys[dead.code] : _frameKeys.includes(dead.code);
    if (stillOn && qte.timer > qte.graceAt + 20) return _qteFail(st.failLine);
  }

  const met = want.hold ? keys[want.code] : _frameKeys.includes(want.code);
  if (met) {
    qte.satisfied = (qte.satisfied || 0) + 1;
    const need = want.hold ? 26 : 1;
    if (qte.satisfied >= need) {
      qte.idx++;
      if (qte.idx >= qte.stages.length) { qte.result = 'pass'; qte.timer = 0; return; }
      qte.timer = 0; qte.revised = false; qte.satisfied = 0;
    }
  }

  if (qte.timer > st.frames) _qteFail(st.failLine);
}

function _qteFail(line) {
  qte.result   = 'fail';
  qte.failLine = line ?? 'It did not work.';
  qte.timer    = 0;
  shake(9);
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function drawQTE() {
  if (!qte) return;

  ctx.save();
  ctx.fillStyle = 'rgba(5,6,9,0.80)';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.textAlign = 'center';

  if (qte.result) {
    const a = Math.min(1, qte.timer / 24);
    ctx.globalAlpha = a;
    if (qte.result === 'pass') {
      ctx.fillStyle = '#cfe0ea';
      ctx.font      = 'italic 17px Courier New';
      ctx.fillText('It worked. It had always worked.', GAME_W / 2, GAME_H / 2);
    } else {
      ctx.fillStyle = '#c08a72';
      ctx.font      = 'italic 17px Courier New';
      ctx.fillText(qte.failLine, GAME_W / 2, GAME_H / 2);
      ctx.fillStyle = '#5e5747';
      ctx.font      = '12px Courier New';
      ctx.fillText('Nothing was wrong with how you did it.', GAME_W / 2, GAME_H / 2 + 28);
    }
    ctx.restore();
    return;
  }

  const st   = _qteStage();
  const want = qte.revised ? st.to : st;
  const cx   = GAME_W / 2, cy = GAME_H / 2 - 10;

  // The revoked key stays on screen, struck through. The player has to watch
  // the instruction they were given stop being true.
  if (qte.revised) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle   = '#4c4038';
    ctx.font        = 'bold 58px Courier New';
    ctx.fillText(st.label, cx - 86, cy);
    ctx.strokeStyle = '#8a4a3a';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 124, cy - 16);
    ctx.lineTo(cx - 48,  cy - 16);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const ring = qte.flash > 0 ? '#e8d2b4' : '#8d836c';
  ctx.fillStyle = qte.flash > 0 ? '#f2e6d0' : '#e2d8c0';
  ctx.font      = 'bold 58px Courier New';
  ctx.fillText(want.label, qte.revised ? cx + 70 : cx, cy);

  // Timer ring
  const p = clamp(1 - qte.timer / st.frames, 0, 1);
  ctx.strokeStyle = ring;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(qte.revised ? cx + 70 : cx, cy - 18, 46, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#6d6553';
  ctx.font      = '12px Courier New';
  ctx.fillText(want.hold ? 'hold' : 'press', qte.revised ? cx + 70 : cx, cy + 40);

  if (st.caption) {
    ctx.fillStyle = '#7d7460';
    ctx.font      = 'italic 13px Courier New';
    ctx.fillText(st.caption, GAME_W / 2, GAME_H - 64);
  }
  ctx.restore();
}
