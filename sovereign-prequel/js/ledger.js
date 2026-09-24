'use strict';

// ─── The Ledger ───────────────────────────────────────────────────────────────
// A bank of deprecated laws — physics God has already revised out from under
// him, kept as working copies. Narratively the seed of the interdimensional
// pocket; mechanically the only progression system in the game.
//
// Invoking one re-asserts it locally for a few seconds. It must feel like
// cheating with something borrowed, never like a super meter: one use per entry
// per fight, and a visible wind-down.

const LEDGER_DEFS = {
  weight: {
    name:  'THE OLD WEIGHT',
    law:   'A body fell at four fifths of this.',
    note:  'Revised in the ninth year. Nobody else noticed, because nobody else was using it.',
    dur:   210,
  },
  reach: {
    name:  'THE LONGER ARM',
    law:   'A man could strike from further than his arm.',
    note:  'Revised the season after he began relying on it. That is not a coincidence and he knows it.',
    dur:   190,
  },
  body: {
    name:  'THE STUBBORN BODY',
    law:   'A body took this and stood up.',
    note:  'The oldest copy he holds. He does not use it often. It reminds him of being young.',
    dur:   230,
  },
};

let ledgerBanked = [];      // ids, in the order he filed them
let ledgerActive = null;    // { id, left, max }
let ledgerSpent  = [];      // ids already invoked this fight

function ledgerBank(id) {
  if (!LEDGER_DEFS[id] || ledgerBanked.includes(id)) return false;
  ledgerBanked.push(id);
  return true;
}

function ledgerResetForFight() { ledgerActive = null; ledgerSpent = []; }

// Removes an entry with no announcement of any kind. Chapter 12 is the first
// time this happens and the game must not draw attention to it — no flash, no
// sound, no line. The player is meant to notice on their own, or not.
function ledgerLose(id) {
  const i = ledgerBanked.indexOf(id);
  if (i >= 0) ledgerBanked.splice(i, 1);
}

function ledgerAvailable() {
  return ledgerBanked.filter(id => !ledgerSpent.includes(id));
}

function ledgerInvoke() {
  if (ledgerActive) return false;
  const id = ledgerAvailable()[0];
  if (!id) return false;
  const d = LEDGER_DEFS[id];
  ledgerActive = { id, left: d.dur, max: d.dur };
  ledgerSpent.push(id);
  shake(4);
  return true;
}

function updateLedger() {
  if (!ledgerActive) return;
  if (--ledgerActive.left <= 0) ledgerActive = null;
}

// The only place the rest of the game asks what is currently true.
function ledgerMod(kind, base) {
  if (!ledgerActive) return base;
  if (kind === 'gravity'  && ledgerActive.id === 'weight') return base * 0.62;
  if (kind === 'jump'     && ledgerActive.id === 'weight') return base * 1.18;
  if (kind === 'reach'    && ledgerActive.id === 'reach')  return base * 1.75;
  if (kind === 'incoming' && ledgerActive.id === 'body')   return base * 0.45;
  return base;
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function drawLedgerHUD() {
  if (!ledgerBanked.length) return;

  // Sits clear of the fight HUD's 'N standing' line, which ends at y 50.
  const x = 28, y = 86;
  const avail = ledgerAvailable();

  ctx.save();
  ctx.textAlign = 'left';
  ctx.font      = '10px Courier New';
  const inFight = gamePhase === 'playing';
  const shut    = revoked.has('law');
  // Quarantine takes the verb, not the entries. The list stays legible and the
  // prompt goes — he can still read what he kept, he just cannot open it.
  ctx.fillStyle = (shut || (inFight && !avail.length)) ? '#3e3a31' : '#7d7460';
  ctx.fillText(shut ? 'THE LEDGER — WILL NOT OPEN'
             : !inFight ? 'THE LEDGER'
             : avail.length ? '[ K ]  THE LEDGER'
             : 'THE LEDGER — SPENT', x, y);

  for (let i = 0; i < ledgerBanked.length; i++) {
    const id   = ledgerBanked[i];
    const gone = shut || (inFight && ledgerSpent.includes(id));
    ctx.fillStyle = gone ? '#332f28' : '#8d836c';
    ctx.font      = '10px Courier New';
    ctx.fillText((gone ? '·  ' : '—  ') + LEDGER_DEFS[id].name, x, y + 15 + i * 13);
  }
  ctx.restore();
}

function drawLedgerActive() {
  if (!ledgerActive) return;
  const d = LEDGER_DEFS[ledgerActive.id];
  const p = ledgerActive.left / ledgerActive.max;

  ctx.save();
  // The world briefly runs on something that is no longer true anywhere else.
  ctx.fillStyle = 'rgba(96,126,150,' + (0.13 * p).toFixed(3) + ')';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  ctx.textAlign = 'center';
  ctx.globalAlpha = Math.min(1, p * 3);
  ctx.fillStyle = '#cfe0ea';
  ctx.font      = 'bold 13px Courier New';
  ctx.fillText(d.name, GAME_W / 2, 52);
  ctx.fillStyle = '#7e93a2';
  ctx.font      = 'italic 11px Courier New';
  ctx.fillText(d.law, GAME_W / 2, 70);

  // Wind-down. When this runs out the world stops agreeing with him again.
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(207,224,234,0.5)';
  ctx.fillRect(GAME_W / 2 - 90, 80, 180 * p, 2);
  ctx.restore();
}

// ─── Ledger chapter (filing a law, no combat) ─────────────────────────────────
let ledgerChapterStage = 'walk';   // 'walk' | 'page' | 'filed'
let ledgerChapterTimer = 0;

function initLedgerChapter(ch) {
  ledgerChapterStage = 'walk';
  ledgerChapterTimer = 0;
  initInterlude(ch);
}

function updateLedgerChapter() {
  const ch = CHAPTERS[currentChapter];

  if (ledgerChapterStage === 'walk') {
    if (sov) sov.update();
    updateCamera();
    updateInterlude();
    if (isInterludeComplete()) { ledgerChapterStage = 'page'; ledgerChapterTimer = 0; }
    return;
  }

  ledgerChapterTimer++;
  if (ledgerChapterStage === 'page') {
    if (ledgerChapterTimer > 45 && just('confirm')) {
      for (const id of [].concat(ch.banks)) ledgerBank(id);
      ledgerChapterStage = 'filed';
      ledgerChapterTimer = 0;
    }
    return;
  }

  if (ledgerChapterTimer > 200) _completeChapter();
}

function drawLedgerChapter() {
  const ch = CHAPTERS[currentChapter];

  if (ledgerChapterStage === 'walk') { drawInterlude(); return; }

  const ids = [].concat(ch.banks);
  const d   = LEDGER_DEFS[ids[0]];
  const fade = Math.min(1, ledgerChapterTimer / 40);

  ctx.save();
  ctx.fillStyle = 'rgba(6,7,9,' + (0.93 * fade).toFixed(3) + ')';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.globalAlpha = fade;
  ctx.textAlign = 'center';

  // Not a room. A page. That distinction is the whole of Act III.
  const pw = 520, ph = 250, px = GAME_W / 2 - pw / 2, py = 130;
  ctx.fillStyle   = '#0f0e0b';
  ctx.strokeStyle = '#4a4436';
  ctx.lineWidth   = 1;
  roundedRect(px, py, pw, ph, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#6d6553';
  ctx.font      = '10px Courier New';
  ctx.fillText('WHAT IT USED TO BE', GAME_W / 2, py + 30);

  ctx.fillStyle = '#e2d8c0';
  ctx.font      = 'bold 20px Courier New';
  ctx.fillText(d.name, GAME_W / 2, py + 68);

  ctx.fillStyle = '#a99e84';
  ctx.font      = 'italic 14px Courier New';
  ctx.fillText(d.law, GAME_W / 2, py + 104);

  ctx.fillStyle = '#5e5747';
  ctx.font      = '11px Courier New';
  _wrapText(d.note, GAME_W / 2, py + 142, pw - 80, 16);

  // An archive rather than a single page: the rest of what is on these shelves.
  if (ids.length > 1) {
    ctx.fillStyle = '#4a4436';
    ctx.font      = '10px Courier New';
    ctx.fillText('AND ' + (ids.length - 1) + ' MORE ON THE SAME SHELF', GAME_W / 2, py + 186);
    for (let i = 1; i < ids.length; i++) {
      ctx.fillStyle = '#6d6553';
      ctx.fillText(LEDGER_DEFS[ids[i]].name, GAME_W / 2, py + 202 + (i - 1) * 13);
    }
  }

  if (ledgerChapterStage === 'page') {
    ctx.fillStyle = 'rgba(150,140,110,' + (0.5 + Math.sin(frameCount * 0.06) * 0.3).toFixed(2) + ')';
    ctx.font      = '12px Courier New';
    ctx.fillText('[ J ]  keep a copy', GAME_W / 2, py + ph - 24);
  } else {
    ctx.fillStyle = '#8d836c';
    ctx.font      = '12px Courier New';
    ctx.fillText('kept', GAME_W / 2, py + ph - 24);
    if (ledgerChapterTimer > 60) {
      ctx.fillStyle = 'rgba(169,158,132,' + Math.min(1, (ledgerChapterTimer - 60) / 50).toFixed(2) + ')';
      ctx.font      = 'italic 13px Courier New';
      ctx.fillText(ch.kept, GAME_W / 2, py + ph + 46);
    }
  }
  ctx.restore();
}
