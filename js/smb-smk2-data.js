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

// ── Tactic-swap (Stage 3) ─────────────────────────────────────
// When a locked counter-strategy keeps failing, Sovereign switches LATERALLY to
// a different plan rather than stubbornly re-locking a losing one. Each entry maps
// a failing strategy → the alternative to try next.
const SMK2_STRATEGY_SWAP = Object.freeze({
  'anti-air':    'intercept',   // jumping beats the anti-air → cut off the approach instead
  'parry':       'guard-break', // their attacks slip the parry → pressure and break the guard
  'guard-break': 'parry',       // can't crack the guard → bait the attack and punish
  'intercept':   'anti-air',    // can't cut off the dash → they're escaping upward
  'pressure':    'intercept',   // pressure isn't landing → read and cut their movement
});

// Spoken on a tactic-swap — the audible "you adapted, so will I" moment.
const SMK2_TACTIC_SWAP_LINES = [
  'That stopped working.',
  'New plan.',
  'You adapted. So will I.',
  'Different approach.',
  'I won\'t keep losing that exchange.',
  'Change of pace.',
];

// ── Profile-read dialogue — fires once when the AI first locks a player pattern ──
// Super profiles
const SMK2_PROFILE_SUPER_HEALER = [
  'You save that for when you\'re low. Fear threshold: noted.',
  'Desperate — that\'s when you spend it. I\'ll push you there.',
  'Your super is a panic button. I\'ve mapped the trigger.',
];
const SMK2_PROFILE_SUPER_FINISHER = [
  'Combo, then super. I\'ve timed the gap.',
  'You finish with it. I know when the chain starts.',
  'You escalate in sequence. I know the sequence now.',
];
const SMK2_PROFILE_SUPER_OPENER = [
  'Long range, charging. I know what that looks like.',
  'You open with it from distance. The counter is already set.',
  'Gap-close as opener. I\'ve measured the timing.',
];
const SMK2_PROFILE_SUPER_DUMP = [
  'You use it the moment it charges. That\'s an opening.',
  'No timing. Random or panicked — I can work with that.',
  'No pattern. I prefer that to a good one.',
];
// Ability profiles
const SMK2_PROFILE_ABILITY_POKE = [
  'Long range, ability ready. I see the distance you like.',
  'You poke from outside my reach. I\'ve measured the range.',
  'Ranged pressure. I know the angle. I know the timing.',
];
const SMK2_PROFILE_ABILITY_COMBO = [
  'Ability mid-combo. You use it as a chain link.',
  'I know when the chain starts. I know what comes after.',
  'Combo extension. I\'ve logged the rhythm.',
];
const SMK2_PROFILE_ABILITY_CLOSER = [
  'Close range — that\'s when your ability comes out.',
  'You commit with it in my space. I\'ll be ready.',
  'Close-pressure trigger. Filed.',
];

// ── Genome: tunable decision-system parameters ────────────────────────────────
// Default values match Sovereign's hand-tuned baseline.
// SMK2Trainer evolves these via self-play and persists the winner to localStorage.
const SMK2_DEFAULT_GENOME = Object.freeze({
  aggression:        0.90,  // aiMemory.aggression base      range [0.40, 0.99]
  spacing:           0.12,  // aiMemory.spacing base         range [0.02, 0.55]
  reactionSpeed:     0.95,  // aiMemory.reactionSpeed base   range [0.50, 0.99]
  prefDistBase:      20,    // flat constant in prefDist     range [8,    40  ]
  adaptLockDuration: 300,   // counter-lock hold (frames)    range [120,  480 ]
  killInstinctHP:    0.15,  // HP% for kill-instinct         range [0.05, 0.30]
  superChargeWeight: 0.50,  // super meter spacing ramp      range [0.15, 0.80]
  moveSpdBase:       4.5,   // base movement speed           range [3.5,  5.5 ]

  // ── Opponent-adaptation gains ────────────────────────────────────────────
  // These scale the opponent-conditioned offsets in _oppAdaptTerms(): how hard
  // his dials swing in response to the opponent's reach and endlag, to how hard
  // the opponent hits, and to the opponent's measured BEHAVIOUR (guard share,
  // attack share, spacing, airborne share).
  //
  // Putting them in the genome is the point, not a convenience. Until now the
  // genome held only Sovereign's own baseline, so evolution could breed a fighter
  // but never breed the ADAPTATION — the reactive coefficients were hardcoded
  // constants no amount of training could reach. With these here, crossover can
  // combine a genome that reads heavy weapons well with one that reads rushdown
  // well, which is the entire reason to have crossover.
  oppKitGain:        1.00,  // reach/endlag response         range [0.00, 2.50]
  oppThreatGain:     1.00,  // damage/knockback response     range [0.00, 2.50]
  oppBehaviorGain:   1.00,  // measured-behaviour response   range [0.00, 2.50]
});

const SMK2_GENOME_RANGES = Object.freeze({
  aggression:        [0.40, 0.99],
  spacing:           [0.02, 0.55],
  reactionSpeed:     [0.50, 0.99],
  prefDistBase:      [8,    40  ],
  adaptLockDuration: [120,  480 ],
  killInstinctHP:    [0.05, 0.30],
  superChargeWeight: [0.15, 0.80],
  moveSpdBase:       [3.5,  5.5 ],
  oppKitGain:        [0.00, 2.50],
  oppThreatGain:     [0.00, 2.50],
  oppBehaviorGain:   [0.00, 2.50],
});

