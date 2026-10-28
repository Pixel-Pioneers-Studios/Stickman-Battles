'use strict';
// smb-trueform-ending-data.js. TFEnding state vars, matrix rain, spline, helpers, startTFEnding entry
// Depends on: smb-globals.js, smb-particles-core.js, smb-combat.js

'use strict';

// TrueForm ending cinematic (v2). Phases: realization, punch, launch, coderealm, return, finisher, aura,
// powers, fall, fadeout. Fadeout calls endGame().

// tfEndingScene is declared in smb-globals.js

// Matrix rain.
const _TFE_CHARS = 'ΨΦΛΣΩαβγδεθλμπφψ∞∑∏∫∂√±÷×≠≈≡∈∉⊂⊃⊆⊇∪∩∀∃∄¬→←↑↓↔⟨⟩⌊⌋⌈⌉'.split('');
let _tfeRainCols = [];
const _TFE_RAIN_COLORS = ['#cc88ff','#aa66ff','#8844cc','#bbddff','#ffffff'];

function _tfeInitRain() {
  _tfeRainCols = [];
  const cols = Math.floor(GAME_W / 12);
  for (let i = 0; i < cols; i++) {
    _tfeRainCols.push({
      x:     i * 12 + 6,
      y:     Math.random() * GAME_H,
      speed: 1.8 + Math.random() * 3.2,
      chars: Array.from({ length: 20 }, () => _TFE_CHARS[Math.floor(Math.random() * _TFE_CHARS.length)]),
      ci:    Math.floor(Math.random() * _TFE_RAIN_COLORS.length),
      trail: 14 + Math.floor(Math.random() * 10),
    });
  }
}

// Dimension panels for the launch sequence.
const _TFE_BG_PANELS = [
  { sky: ['#0a0020','#1a0040','#0a0020'], ground: '#1a0033', plat: '#3a0066', label: 'DIMENSION Ψ-7'  },
  { sky: ['#001a10','#003320','#001a10'], ground: '#002a18', plat: '#004430', label: 'DIMENSION Λ-3'  },
  { sky: ['#200000','#400000','#200000'], ground: '#300000', plat: '#600000', label: 'DIMENSION Ω-11' },
  { sky: ['#000820','#001040','#000820'], ground: '#000030', plat: '#000060', label: 'DIMENSION Σ-19' },
  { sky: ['#101010','#202020','#101010'], ground: '#181818', plat: '#303030', label: 'NULL SPACE'      },
  { sky: ['#1a1000','#332000','#1a1000'], ground: '#281800', plat: '#503000', label: 'DIMENSION Φ-2'  },
  { sky: ['#000000','#000000','#000000'], ground: '#0a0a0a', plat: '#1a1a1a', label: 'THE VOID'        },
];

// Catmull-Rom spline.
function _tfeSpline(pts, t) {
  const n = pts.length - 1;
  const seg = Math.min(Math.floor(t * n), n - 1);
  const lt  = (t * n) - seg;
  const p0  = pts[Math.max(0, seg - 1)];
  const p1  = pts[seg];
  const p2  = pts[Math.min(n, seg + 1)];
  const p3  = pts[Math.min(n, seg + 2)];
  const cr  = (a, b, c, d, s) =>
    0.5 * ((2*b) + (-a+c)*s + (2*a-5*b+4*c-d)*s*s + (-a+3*b-3*c+d)*s*s*s);
  return { x: cr(p0.x,p1.x,p2.x,p3.x,lt), y: cr(p0.y,p1.y,p2.y,p3.y,lt) };
}

// Aura particle pool.
let _tfeAuraParticles = [];

// Zero-pop damage texts for realization. Each: { x, y, vy, alpha, timer }
let _tfeZeroPops = [];

// Code nodes for coderealm.
function _tfeCreateNodes() {
  const positions = [
    { x: GAME_W * 0.15, y: GAME_H * 0.4  },
    { x: GAME_W * 0.35, y: GAME_H * 0.35 },  // was 0.22 — lowered to be reachable with double jump
    { x: GAME_W * 0.5,  y: GAME_H * 0.55 },
    { x: GAME_W * 0.65, y: GAME_H * 0.35 },  // was 0.25 — lowered to be reachable with double jump
    { x: GAME_W * 0.82, y: GAME_H * 0.42 },
  ];
  const labels = ['FAULT', 'RIFT', 'TEAR', 'SCAR', 'BREAK'];
  return positions.map((p, i) => ({
    x:         p.x,
    y:         p.y,
    label:     labels[i],
    corrupted: false,
    pulse:     Math.random() * Math.PI * 2,  // phase offset for animation
    hitTimer:  0,
  }));
}

// Edge-detect attack key helper.
let _tfeAtkWas = false;
function _tfeAtkJust() {
  const hero = tfEndingScene && tfEndingScene.hero;
  if (!hero) return false;
  const ctrl = hero.controls;
  const now  = ctrl ? keysDown.has(ctrl.attack) : false;
  const just = now && !_tfeAtkWas;
  _tfeAtkWas = now;
  return just;
}

let _tfeFinAtkWas = false;
function _tfeFinAtkJust() {
  const hero = tfEndingScene && tfEndingScene.hero;
  if (!hero) return false;
  const ctrl = hero.controls;
  const now  = ctrl ? keysDown.has(ctrl.attack) : false;
  const just = now && !_tfeFinAtkWas;
  _tfeFinAtkWas = now;
  return just;
}

// QTE prompt messages.
const _TFE_QTE_PROMPTS = [
  '[ ATTACK — STRIKE BACK ]',
  '[ ATTACK — FINISH IT ]',
  '[ ATTACK — END THIS ]',
];
const _TFE_QTE_FLASH_COLORS = ['#ff4400','#ff0088','#ffffff'];

// Launch spline points. The punch blasts the hero right, so the arc goes right.
function _tfeLaunchPts(hero, boss) {
  // Direction: boss is usually left of hero, punches right.
  // If boss is to the right, flip direction.
  const dir = (boss && boss.cx() < hero.cx()) ? 1 : -1;
  const sx  = hero.cx();
  const sy  = hero.cy();
  return [
    { x: sx,                          y: sy                       },  // start
    { x: sx + dir * GAME_W * 0.22,   y: sy - 30                  },  // initial blast
    { x: sx + dir * GAME_W * 0.50,   y: sy - 55                  },  // mid-air
    { x: sx + dir * GAME_W * 0.85,   y: sy - 35                  },  // near edge
    { x: sx + dir * GAME_W * 1.20,   y: sy + 30                  },  // exit screen
    { x: sx + dir * GAME_W * 1.70,   y: sy + 120                 },  // far exit
  ];
}

// Entry point. isIntro=true runs as the opening and resumes gameplay after the code realm, not endGame.
function startTFEnding(boss, isIntro) {
  const hero = players.find(p => !p.isBoss);
  if (!hero) { endGame(); return; }
  // Callers pass players.find(p => p.isBoss), which can be undefined, a throw
  // here would fire inside a scene tick and leave gameFrozen stuck forever.
  if (!boss) { endGame(); return; }

  boss.invincible = 999999;
  boss.vx = 0; boss.vy = 0;

  _tfeInitRain();
  _tfeAuraParticles = [];
  _tfeZeroPops      = [];
  _tfeAtkWas        = false;
  _tfeFinAtkWas     = false;

  minions = []; projectiles = []; bossBeams = [];
  if (typeof bossSpikes !== 'undefined') bossSpikes = [];
  if (typeof trainingDummies !== 'undefined') trainingDummies = [];

  tfEndingScene = {
    phase:   'realization',
    timer:   0,
    boss,
    hero,

    // realization
    realizationDialogue: [
      '"So you figured it out."',
      '"Nothing you do here matters."',
      '"I\'ve wasted enough time."',
    ],
    dialogueIdx:   0,
    dialogueAlpha: 0,

    // punch
    bossRushed: false,

    // launch
    launchPts:   _tfeLaunchPts(hero, boss),
    launchT:     0,
    heroScreenX: hero.cx(),
    heroScreenY: hero.cy(),
    heroPrevX:   hero.cx(),
    heroPrevY:   hero.cy(),
    heroAlpha:   1,
    bgPanelIdx:  0,
    bgPanelT:    0,      // 0–1 scroll within panel
    tearAlpha:   0,      // reality tear overlay

    // coderealm
    rainAlpha:   0,
    divAlpha:    0,
    divScale:    0,
    codeNodes:   _tfeCreateNodes(),
    crHeroX:     GAME_W / 2,
    crHeroY:     GAME_H * 0.55,
    crHeroVY:       0,
    crOnGround:     false,
    crCanDoubleJump: false,
    nodesCorrupted: 0,
    crFlashTimer:   0,

    // return
    returnY:    -60,
    returnVY:    4,

    // finisher
    finisherHits:    0,
    finisherPrompt:  0,
    finisherFlash:   0,
    finisherBossX:   boss.cx(),
    finisherBossY:   boss.cy(),
    finisherBossVX:  0,
    finisherBossVY:  0,
    finisherBossAlpha: 1,

    // aura
    auraX: boss.cx(),
    auraY: boss.cy(),

    // powers
    powersAlpha: 0,
    powersList: [
      '⬡  DIMENSION SHIFT — 3D VIEW ENABLED',
      '◈  HOME UNIVERSE PATROL MODE UNLOCKED',
      '✦  INTER-WORLD TRAVEL UNLOCKED',
    ],

    // fall
    heroFallAlpha: 1,

    // skip
    skippable: false,
    skipped:   false,
    canReplay:  !!(window.GameState && GameState.getActiveAccount()?.data?.unlocks?.tfEndingSeen),

    // intro mode: resume gameplay instead of calling endGame
    isIntro: isIntro === true,
  };

  if (typeof setAccountFlag === 'function') {
    setAccountFlag(['unlocks', 'tfEndingSeen'], true);
  }
  hero.backstageHiding = false;
  screenShake = 20;
  // Round 1's end goes straight to the punch: the player has just taken Paradox's power, so a
  // "your attacks do nothing" preamble contradicts the scene.
  if (tfEndingScene.isIntro) tfEndingScene.phase = 'punch';
  else if (typeof _makeTFFinaleCinematic === 'function') {
    // The staged finale (smb-axiom-finale-cin.js) owns everything up to the powers screen.
    tfEndingScene.phase = 'film';
    startCinematic(_makeTFFinaleCinematic(boss, hero));
  } else _tfeEnterFinisher(tfEndingScene);
}

// Stage the finishing-blow phase: both fighters on the floor, a clear gap between them.
function _tfeEnterFinisher(sc) {
  const floor = currentArena && currentArena.platforms.find(pl => pl.isFloor && !pl.isFloorDisabled);
  const floorY = floor ? floor.y : GAME_H - 30;
  sc.phase = 'finisher';
  sc.timer = 0;
  sc.hero.backstageHiding = false;
  sc.hero.x = GAME_W / 2 - sc.hero.w / 2;
  sc.hero.y = floorY - sc.hero.h;
  sc.hero.vx = 0; sc.hero.vy = 0;
  sc.boss.backstageHiding = false;
  sc.boss.x = GAME_W / 2 - sc.boss.w / 2 - 120;
  sc.boss.y = floorY - sc.boss.h;
  sc.finisherBossX = sc.boss.cx();
  sc.finisherBossY = sc.boss.cy();
  sc.finisherPrompt = 1;
  if (typeof _tfeCamFocus === 'function') _tfeCamFocus(GAME_W / 2, floorY - 60, 1.3);
}

