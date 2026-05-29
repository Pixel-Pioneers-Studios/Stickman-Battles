'use strict';
// smb-smk2-data.js — SovereignMK2 data: action classifier, dialogue pools, stage names
// Depends on: smb-globals.js, smb-adaptive-ai.js

// ============================================================
// SOVEREIGN Ω  —  Next-Generation Adaptive AI
// Extends AdaptiveAI with five new systems:
//   A. Prediction  — bigram sequence learning; preemptive counters
//   B. Punishment  — spam/repetition detection; aggro-burst mode
//   C. Limiter Break — permanent power-up at peak intelligence
//   D. Anti-Exploit — stall / edge-camp / button-spam detection
//   E. Humanization — early delays + fake-outs; ramps to inhuman
//
// Used ONLY in gameMode === 'sovereign'. Story mode keeps AdaptiveAI.
// ============================================================
'use strict';

// ── Action classifier priority ──────────────────────────────
// Returns a string tag for the player's current action each AI tick.
// Priority: attack > shield > dodge > jump > idle
function _smk2ClassifyAction(t, prevT) {
  if (t.attackTimer > 0 && !(prevT && prevT.attacking))  return 'attack'; // rising edge
  if (t.shielding  && !(prevT && prevT.shielding))        return 'shield'; // rising edge
  // Require the player was already moving (|prevVx| > 3) AND is now moving fast in the
  // opposite direction (|vx| > 4.5) — prevents normal walking direction changes from
  // being logged as dodges and corrupting the bigram table.
  const wasMoving = prevT && Math.abs(prevT.vx || 0) > 3;
  const vxFlip    = wasMoving && Math.abs(t.vx) > 4.5 && Math.sign(t.vx) !== Math.sign(prevT.vx || 0);
  if (vxFlip)                                             return 'dodge';
  if (!t.onGround && prevT && prevT.onGround)             return 'jump';   // rising edge
  return 'idle';
}

// ── Dialogue pools ───────────────────────────────────────────
const SMK2_PUNISH_LINES = [
  'You keep doing that.',
  'Three times. Same thing.',
  'Stop. It isn\'t working.',
  'I\'ve filed that away.',
  'You\'re making this easier.',
];
const SMK2_LIMITER_LINES = [
  'Limiters are a courtesy. Withdrawn.',
  'I was holding back. I\'m not anymore.',
  'Full output. Let\'s see if you can keep up.',
  'There is no ceiling above me.',
];
const SMK2_EXPLOIT_STALL = [
  'You\'re not hiding. You\'re waiting to lose.',
  'Standing still just makes it easier.',
  'I\'ll come to you, then.',
];
const SMK2_EXPLOIT_EDGE = [
  'The edge won\'t save you.',
  'There\'s nowhere left to go.',
  'I prefer the center.',
];
const SMK2_EXPLOIT_SPAM = [
  'Your habits are showing.',
  'I\'ve seen this pattern.',
  'Interesting choice. To repeat it.',
];
const SMK2_PREDICT_LINES = [
  'I knew you\'d do that.',
  'Called it.',
  'Predictable.',
  'There it is.',
];
const SMK2_EVOLUTION_LINES = [
  'I\'m starting to see the shape of you.',
  'Now I know what you reach for.',
  'Every exchange improves me.',
  'You\'re not fighting me anymore. You\'re feeding me.',
];
const SMK2_INTIMIDATION_LINES = [
  'Feel that? That\'s your space disappearing.',
  'You can feel the answer before you move.',
  'There\'s pressure on every option now.',
  'You\'re running out of safe habits.',
];
const SMK2_DOMINANCE_LINES = [
  'You\'re predictable.',
  'Again?',
  'That won\'t work.',
  'Same answer. Same punishment.',
];
const SMK2_STAGE_NAMES = ['OBSERVING', 'READING', 'DOMINATING', 'TYRANT'];

// ── Edge / Corner pressure ────────────────────────────────────
const SMK2_CORNER_LINES = [
  'You\'re running out of room.',
  'The edge is right there.',
  'Nowhere left to run.',
  'I prefer you cornered.',
  'One more step and it\'s over.',
];

// ── Platform control ─────────────────────────────────────────
const SMK2_PLATFORM_LINES = [
  'You keep coming back here.',
  'I know exactly where you\'re going.',
  'That platform belongs to me now.',
  'Predictable path.',
];

// ── Post-knockback read ───────────────────────────────────────
const SMK2_POSTKB_LINES = [
  'You always do that after a hit.',
  'Same reflex. Same result.',
  'I\'ve filed that response away.',
  'Predictable recovery.',
];

// ── Pre-attack telegraph warnings ────────────────────────────
// Short lines that fire when Axiom arms an attack — gives player a verbal cue to react.
const SMK2_ATTACK_WARN_LINES = [
  'Here.',
  'Watch.',
  'This.',
  'Now.',
  'Read this.',
  'Coming.',
  'Incoming.',
  'Block.',
  'Dodge.',
  'Your move.',
];

