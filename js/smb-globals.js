'use strict';

// ============================================================
// CANVAS
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;

// Logical game-space dimensions — all game coordinates use these
const GAME_W = 900;
const GAME_H = 520;

// Resize canvas to fill the browser window; game world stays GAME_W x GAME_H (fixed resolution)
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.imageSmoothingEnabled = true;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ============================================================
// CHANGELOG
// ============================================================
const CHANGELOG = [
  {
    version: '2.4.4',
    title: 'STORY GAUNTLET OVERHAUL',
    date: '2026-03-27',
    flavor: 'Story Mode now fights back like a real progression gauntlet instead of a quick sprint.',
    isLatest: true,
    changes: [
      { cat: 'Story',    text: 'Story chapters now auto-build into 3–5 phase gauntlets with traversal, arena locks, elite waves, hazards, and mini-boss finishes' },
      { cat: 'Story',    text: 'Exploration pacing was expanded with stronger enemy pressure, checkpoint bursts, ambush punish, side portals, and optional Distorted Rift encounters' },
      { cat: 'Story',    text: 'Chapter difficulty now scales from chapter progression plus player performance, including stronger elite variants and denser encounter caps' },
      { cat: 'Economy',  text: 'Tokens now power a real between-chapter shop with healing, permanent damage upgrades, and survivability upgrades' },
      { cat: 'UI',       text: 'Story HUD now shows the current gauntlet phase clearly during both combat and traversal sections' },
      { cat: 'Balance',  text: 'Story carryover health and progression upgrades make long-form runs matter instead of resetting into isolated demo fights' },
    ],
  },
  {
    version: '2.0.0',
    title: 'THE ARCHITECT UPDATE',
    date: '2026-03-25',
    flavor: 'The Code Realm has been fixed. SOVEREIGN awaits challengers.',
    isLatest: false,
    changes: [
      { cat: 'Fix',      text: 'True Form Code Realm: added double-jump so all 5 nodes are reachable' },
      { cat: 'Fix',      text: 'True Form Code Realm: lowered unreachable high nodes to proper jump height' },
      { cat: 'Fix',      text: 'QTE: movement keys (WASD/arrows) now register correctly mid-QTE' },
      { cat: 'Fix',      text: 'QTE: phases now end after max attempts with penalty damage instead of looping forever' },
      { cat: 'Fix',      text: 'Large maps: camera now clamps to world bounds and no longer drifts off-edge' },
      { cat: 'Fix',      text: 'Large maps: both players no longer spawn at the same position' },
      { cat: 'Fix',      text: 'Boss dialogue bubble now scales correctly when camera is zoomed out' },
      { cat: 'Fix',      text: 'Background void no longer visible when zooming out on any map' },
      { cat: 'Balance',  text: 'Reduced large map platforms from 40+ to ~27 with better spread and landmark bridges' },
      { cat: 'AI',       text: 'Beating SOVEREIGN in Story Mode now unlocks Neural AI as a standalone gamemode' },
      { cat: 'Polish',   text: 'Damage numbers: color-coded by severity with glow on heavy hits' },
      { cat: 'Polish',   text: 'Screen shake now scales with hit damage; no longer jitters at near-zero values' },
      { cat: 'Polish',   text: 'Red vignette overlay when player takes heavy damage' },
    ],
  },
  {
    version: '1.0.0',
    title: 'FULL RELEASE — FRACTURE CAMPAIGN',
    date: '2026-03-24',
    flavor: 'Reality patch applied. All dimensional rifts sealed.',
    changes: [
      { cat: 'Story',    text: 'Added full Story Mode — 80 chapters across 6 Acts' },
      { cat: 'Story',    text: 'Added Act / Arc navigation system with chapter select' },
      { cat: 'Story',    text: 'Implemented exploration chapters and cutscene dialogues' },
      { cat: 'Story',    text: 'Added major narrative twist: the fragment is the Creator\'s conscience' },
      { cat: 'Story',    text: 'Introduced the Void Mind as a post-campaign threat' },
      { cat: 'Cinematic',text: 'Redesigned True Form ending into a 10-phase meta-breaking cinematic' },
      { cat: 'Cinematic',text: 'Added interactive Code Realm with 5 corruptible nodes' },
      { cat: 'Cinematic',text: 'Added 3-hit Kratos-style QTE finisher sequence' },
      { cat: 'Cinematic',text: 'Added dimension-panel launch sequence across 7 realities' },
      { cat: 'Cinematic',text: 'True Form ending now triggers at 10% HP threshold' },
      { cat: 'AI',       text: 'Improved True Form adaptive AI — 6 attack tiers, player profiling' },
      { cat: 'AI',       text: 'Added dedicated Adaptive AI game mode' },
      { cat: 'Combat',   text: 'Added finisher system (killcam killing blows)' },
      { cat: 'Combat',   text: 'Balanced ranged weapons — reduced bullet spam window' },
      { cat: 'Combat',   text: 'Added QTE phases at 75/50/25/10% True Form HP' },
      { cat: 'UI',       text: 'Added Experimental 3D Mode setting with dimension-break visuals' },
      { cat: 'UI',       text: 'Added Replay Cinematic button on True Form end screen' },
      { cat: 'Network',  text: 'Improved multiplayer state sync and disconnect handling' },
      { cat: 'System',   text: 'Modularised codebase into 20+ named JS modules' },
    ],
  },
  {
    version: '0.9.0',
    title: 'CHAOS & CREATION',
    date: '2026-02-10',
    flavor: 'New modes, new maps, new mayhem.',
    changes: [
      { cat: 'Mode',     text: 'Added Map Creator / Designer tool (standalone, launch from main menu)' },
      { cat: 'Mode',     text: 'Added Chaos Multiplayer — 12 chaos events, item drops, kill streaks' },
      { cat: 'Mode',     text: 'Added Survival, King of the Hill, and Soccer minigames' },
      { cat: 'Mode',     text: 'Added Adaptive AI standalone mode (SOVEREIGN)' },
      { cat: 'Maps',     text: 'Added Megacity, Warpzone, and Colosseum large-scale arenas' },
      { cat: 'Combat',   text: 'Added 8 weapon classes with unique supers and abilities' },
      { cat: 'Combat',   text: 'Added character class system (Berserker, Ninja, Tank, etc.)' },
      { cat: 'Combat',   text: 'Added combo limiter to prevent infinite lock-out combos' },
    ],
  },
  {
    version: '0.5.0',
    title: 'TRUE FORM AWAKENS',
    date: '2025-11-15',
    flavor: 'Something stirs beneath the surface.',
    changes: [
      { cat: 'Boss',     text: 'Added True Form — adaptive boss with player pattern recognition' },
      { cat: 'Boss',     text: 'Added secret letter hunt system unlocking True Form mode' },
      { cat: 'Boss',     text: 'Added Boss fight mode (The Creator, phase AI, beams, minion spawns)' },
      { cat: 'Combat',   text: 'Added shield, ability, and super systems' },
      { cat: 'UI',       text: 'Full UI redesign — glass-morphism, mode cards, player config panels' },
      { cat: 'Network',  text: 'Added online multiplayer via PeerJS WebRTC + Socket.io relay' },
    ],
  },
  {
    version: '0.1.0',
    title: 'INITIAL RELEASE',
    date: '2025-08-01',
    flavor: 'Two stickmen. One arena. Fight.',
    changes: [
      { cat: 'Core',     text: '2-player local PvP on a single canvas' },
      { cat: 'Core',     text: 'Basic weapons: sword, hammer, spear, gun' },
      { cat: 'Core',     text: 'Basic arenas: grass, city, lava, space' },
    ],
  },
];

// ============================================================
// GLOBAL STATE
// ============================================================
let gameMode        = '2p';
let selectedArena   = 'grass';
let isRandomMapMode    = false;
let completeRandomizer = false; // Complete Randomizer mode: reroll arena+weapon+class on every death
let chosenLives     = 3;
let gameRunning     = false;
let gameLoading     = false; // true while loading screen is visible — freezes input/physics
let p1IsBot         = false;
let p2IsBot         = false;
let training2P      = false; // 2-player training mode toggle
let p2IsNone        = false; // "None" — no P2 at all (solo mode)
let paused          = false;
let players         = [];
let minions         = [];    // boss-spawned minions
let verletRagdolls  = [];    // active Verlet death ragdolls
let bossBeams       = [];    // boss beam attacks (warning + active)
let bossSpikes      = [];    // boss spike attacks rising from floor
let infiniteMode    = false; // if true, no game over — just win counter
let tutorialMode       = false; // kept as stub — tutorial mode fully removed, always false
let trainingMode          = false; // training mode flag
let trainingDesignerOpen  = false; // in-game live map designer active
let trainingDummies    = [];    // training dummies/bots
let trainingPlayerOnly = true;  // godmode/onePunch apply only to player (not all entities)
let trainingChaosMode  = false; // all entities attack nearest target
let winsP1 = 0, winsP2 = 0;
let bossDialogue    = { text: '', timer: 0 }; // speech bubble above boss
let projectiles        = [];
let particles          = [];
let damageTexts        = [];
let respawnCountdowns  = [];  // { color, x, y, framesLeft }
let screenShake     = 0;
const BOSS_FIGHT_LIVES = 10;
const BOSS_FLOOR_WARNING_FRAMES = 180; // 3 seconds at 60 FPS
let bossFightLivesLock = false;
let bossFightLivesPrev = null;

// Dynamic camera zoom — lerped each frame
let camZoomTarget = 1, camZoomCur = 1;
let hitStopFrames  = 0; // frames to freeze game for hit impact feel
let hitSlowTimer   = 0; // frames remaining on post-hit slow-motion burst
let camHitZoomTimer  = 0; // frames of zoom-in after a heavy hit
let hitVignetteTimer = 0; // frames of red vignette overlay when player takes heavy damage
let hitVignetteColor = 'rgba(220,30,0,';  // color prefix for vignette fill
// Camera dead zone: don't update target until center moves beyond this (reduces jitter)
const CAMERA_DEAD_ZONE = 18;
const CAMERA_LERP_ZOOM = 0.07;
const CAMERA_LERP_POS  = 0.08;

// Camera pan position (lerped each frame)
let camXTarget = 450, camYTarget = 260, camXCur = 450, camYCur = 260;

let camDramaState  = 'normal'; // 'normal' | 'focus' | 'impact' | 'wideshot'
let camDramaTimer  = 0;
let camDramaTarget = null;
let camDramaZoom   = 1.0;

// ============================================================
// SETTINGS & FRAME STATE
// ============================================================
// User-configurable settings (toggled from menu)
const settings = { particles: true, screenShake: true, dmgNumbers: true, landingDust: true, bossAura: true, botPortal: true, phaseFlash: true, ragdollEnabled: (localStorage.getItem('smc_ragdoll') === '1'), finishers: true, view3D: (localStorage.getItem('smc_view3D') === '1'), experimental3D: (localStorage.getItem('smc_experimental3D') === '1') };

// Active finisher state — set by triggerFinisher(), cleared when animation completes or on backToMenu
let activeFinisher = null;
let bossPhaseFlash     = 0;    // countdown for white screen flash on boss phase transition
let abilityFlashTimer  = 0;    // frames remaining for ability ring flash
let abilityFlashPlayer = null; // player who activated ability
let frameCount         = 0;
let _firstDeathFrame   = -1;   // frame when first player's lives hit 0
let _firstDeathPlayer  = null; // that player ref (to find the opponent)
let aiTick             = 0;    // AI update runs every N frames (see AI_TICK_INTERVAL)
const AI_TICK_INTERVAL = 15;
let currentArena    = null;    // the arena data object
let currentArenaKey = 'grass';

// Pre-generated bg elements (so they don't flicker each frame)
let bgStars     = [];
let bgBuildings = [];

// ============================================================
// TRUE FORM BOSS STATE
// ============================================================
let unlockedTrueBoss   = !!localStorage.getItem('smc_trueform');
let tfGravityInverted  = false;
let tfGravityTimer     = 0;    // countdown (frames); 0 = gravity normal
let tfControlsInverted    = false;
let tfControlsInvertTimer = 0;   // countdown (frames); controls auto-restore when 0
// Mirror arena gimmick
let mirrorFlipTimer     = 0;    // counts up; flips controls at interval
let mirrorFlipped       = false; // current inversion state
let mirrorFlipWarning   = 0;    // warning flash timer (counts down)
let tfFloorRemoved     = false;
let tfFloorTimer       = 0;    // countdown (frames) until floor returns
let tfBlackHoles       = [];   // { x, y, r, timer, maxTimer }
let tfSizeTargets      = new Map(); // fighter → {origW, origH, scale}
let tfGravityWells     = [];   // { x, y, r, timer, maxTimer, strength }
let tfMeteorCrash      = null; // { phase:'rising'|'shadow'|'crash', timer, landX, boss, shadowR }
let tfClones           = [];   // { x, y, w, h, health, timer, facing, attackTimer, animTimer, isReal }
let tfChainSlam        = null; // { stage:0-3, timer, target }
let tfGraspSlam        = null; // { timer }
let tfShockwaves       = [];   // { x, y, r, maxR, timer, maxTimer, boss, hit:Set }
let tfDimensionIs3D    = false; // true while TrueForm has shifted the game to 3D perspective
let tfEndingScene      = null;  // TrueForm ending cinematic state machine (smb-trueform-ending.js)

// ── Boss telegraph / warning system ──────────────────────────────────────────
// Visual warning indicators shown before attacks land (give player time to dodge)
let bossWarnings        = [];   // { type:'circle'|'arc'|'cone', x, y, r, color, timer, maxTimer, label, safeZone, facing }
let bossMetSafeZones    = [];   // safe zones during meteor storm { x, y, r, timer, maxTimer }
// Stagger: boss takes 120+ damage in 3s window → stunned for 2.5s
let bossStaggerTimer    = 0;    // frames remaining in stagger
let bossStaggerDmg      = 0;    // accumulated damage in current window
let bossStaggerDecay    = 0;    // decay timer; when 0 accumulator resets
// Desperation mode: boss health < 25% → faster, more intense
let bossDesperationMode  = false;
let bossDesperationFlash = 0;   // visual flash timer on activate

// ============================================================
// SECRET LETTER HUNT
// ============================================================
let bossBeaten         = !!localStorage.getItem('smc_bossBeaten');
let collectedLetterIds = new Set(JSON.parse(localStorage.getItem('smc_letters') || '[]'));
const SECRET_LETTERS   = ['T','R','U','E','F','O','R','M'];
const SECRET_ARENAS    = ['grass','city','space','lava','forest','ice','ruins','creator'];
const SECRET_LETTER_POS = {
  grass:   { x: 450, y: 330 },
  city:    { x: 748, y: 390 },
  space:   { x: 200, y: 290 },
  lava:    { x: 450, y: 170 },
  forest:  { x: 310, y: 360 },
  ice:     { x: 640, y: 290 },
  ruins:   { x: 765, y: 360 },
  creator: { x: 450, y: 220 },
};

// Arena order (used for menu background cycling)
const ARENA_KEYS_ORDERED = ['grass', 'city', 'space', 'lava', 'forest', 'ice', 'ruins',
  'cave', 'mirror', 'underwater', 'volcano', 'colosseum', 'cyberpunk', 'haunted', 'clouds', 'neonGrid', 'mushroom'];

// Menu background cycling state
let menuBgArenaIdx   = 0;
let menuBgTimer      = 0;
let menuBgFade       = 0;      // 0→1 fade to black, 1→2 fade from black
let menuBgFrameCount = 0;
let menuLoopRunning  = false;

// ============================================================
// ONLINE STATE
// ============================================================
let onlineMode       = false;
let onlineReady      = false;
let onlineLocalSlot  = 0;
let _onlineGameMode  = '2p';

// Online multiplayer extended state
let onlinePlayerSlots = []; // array of player state objects for all online players
let localPlayerSlot = 0;    // which slot this player occupies (0=host)
let onlinePlayerCount = 2;  // chosen player count (2-10)
let onlineMaxPlayers = 10;
let onlineFreeCamera = false; // in online mode, camera tracks only local player
let onlineCamX = 450, onlineCamY = 260; // free camera target position for online mode
let _cheatBuffer     = ''; // tracks recent keypresses for cheat codes
let unlockedMegaknight = (localStorage.getItem('smc_megaknight') === '1');
// Public room browser state
let _publicRooms     = [];  // [{code, host, created}] — discovered public rooms
let _isPublicRoom    = false; // whether current hosted room is public
let _publicRoomCheckTimer = 0;

// ============================================================
// ============================================================
// VERSION
// ============================================================
const GAME_VERSION = '2.4.4';  // bump this when releasing; must match CHANGELOG[0].version

// DEBUG / DEVELOPER STATE
// ============================================================
let debugMode          = false;
let timeScale          = 1.0;
let showHitboxes       = false;  // F1 — fighter hitboxes + weapon tips
let showCollisionBoxes = false;  // F2 — platform collision geometry
let showPhysicsInfo    = false;  // F3 — velocity vectors + onGround/vy labels
let _debugKeyBuf       = '';     // rolling key buffer for "debugmode" cheat

// ============================================================
// STORY MODE STATE
// ============================================================
let storyModeActive     = false; // true while a story level is in progress
let storyCurrentLevel   = 1;     // which story level is being played (1-indexed)
let storyPlayerOverride = null;  // { speedMult, dmgMult, noAbility, noSuper, noDoubleJump, weapon } — applied to p1 on level start
let storyFightSubtitle  = null;  // { text, timer, maxTimer, color } — in-fight narrative subtitle
let storyFightScript    = [];    // [{ frame, text, color }] — scheduled messages for current level
let storyFightScriptIdx = 0;     // next unplayed entry index
let storyEnemyArmor     = [];    // ['helmet','chestplate','leggings'] — armor pieces on enemy this chapter
let storyTwoEnemies     = false; // true = spawn a second enemy bot in this chapter
let storySecondEnemyDef = null;  // { weaponKey, classKey, aiDiff, color } for the second enemy
let storyOpponentName   = null;  // display name of the story chapter opponent (shown in HUD)
let storyAbilityState   = {};    // per-fight state for unlocked story abilities (medkit used, last stand triggered, etc.)
let storyPhaseIndicator = null;  // { index, total, label, type }
let storyGauntletState  = null;  // active chapter phase runtime
let storyPendingPhaseConfig = null; // temporary launch override for next story phase
let storyCameraLock     = null;  // { left, right, reason }
let storyPressureState  = { dodgeFatigue: 0, dodgeTimer: 0 };

// ============================================================
// ENTITY & VISUAL STATE
// ============================================================
let lightningBolts   = [];    // { x, y, timer, segments } — Thor perk visual lightning
let backstagePortals = [];    // {x,y,type,phase,timer,radius,maxRadius,codeChars,done}
let phaseTransitionRings = []; // expanding ring effects on phase change
// ---- Cinematic System ----
let cinGroundCracks  = [];    // world-space crack effects (managed by smc-cinematics.js)
let cinScreenFlash   = null;  // screen-space flash { color, alpha, timer, maxTimer }
let activeCinematic      = null;  // active cinematic sequence or null
let slowMotion           = 1.0;   // physics time scale (1=normal, 0=fully frozen)
let cinematicCamOverride = false; // when true, camera uses cinematic focus targets
let cinematicZoomTarget  = 1.0;   // zoom level during cinematic
let cinematicFocusX      = 450;   // camera focus X during cinematic
let cinematicFocusY      = 260;   // camera focus Y during cinematic
let bossDeathScene   = null;  // boss defeat animation state
let fakeDeath        = { triggered: false, active: false, timer: 0, player: null };
let bossPlayerCount  = 1;     // 1 or 2 players vs boss
let forestBeast      = null;  // current ForestBeast instance (null if none)
let forestBeastCooldown = 0;  // frames until beast can spawn again after death
let yeti             = null;  // current Yeti instance in ice arena
let yetiCooldown     = 0;     // frames until yeti can spawn again
let mapItems         = [];    // arena-perk pickups
let randomWeaponPool = null;  // null = use all; Set of weapon keys
let randomClassPool  = null;  // null = use all; Set of class keys

// Boss fight floor hazard state machine
let bossFloorState = 'normal';  // 'normal' | 'warning' | 'hazard'
let bossFloorType  = 'lava';    // 'lava' | 'void'
let bossFloorTimer = 1500;      // frames until next state transition

// True Form — dimensional attacks
let tfPhaseShift   = null;  // { timer, maxTimer, echoes:[{x,y}], realIdx, revealed }
let tfRealityTear  = null;  // { x, y, timer, maxTimer, phase:'warn'|'active'|'close' }
let tfMathBubble   = null;  // { text, timer, maxTimer, x, y }
let tfCalcStrike   = null;  // { timer, maxTimer, predictX, predictY, fired, strikeDelay }
let tfGhostPaths      = null;  // { paths:[{pts,selected,alpha}], timer, maxTimer } — 5D path visualization
let tfRealityOverride = null;  // { timer, maxTimer, bossRef, targetRef, phase } — dominance mechanic
// ── New cosmic attacks ─────────────────────────────────────────────────────────
let tfGammaBeam     = null;  // { phase:'telegraph'|'active', timer, y, hit:Set }
let tfBurnTrail     = null;  // { y, timer, maxTimer } — glowing aftermath streak after gamma beam
let tfNeutronStar   = null;  // { phase:'pull'|'warn'|'slam', timer, bossRef, startX }
let tfGalaxySweep   = null;  // { angle, speed, timer, maxTimer, hit:Set }
let tfMultiverse    = null;  // { timer, maxTimer, echoes:[{x,y,selected}], targetIdx, phase, bossRef, targetRef }
let tfSupernova     = null;  // { timer, maxTimer, phase:'buildup'|'active', bossRef, hit:Set, r }
let tfAttackRetryQueue = []; // [{ ctx, move, targetRef, source, framesLeft, attempts }]

// ── Story event / cinematic system ────────────────────────────────────────────
let storyEventFired    = {};   // { [eventName]: true } — dedup per fight
let storyFreezeTimer   = 0;    // frames of physics halt for cinematic freezes
let storyDistortLevel  = 0;    // 0-1 world distortion intensity (rises with chapter progress)
let storyDodgeUnlocked = false; // set true when DODGE_UNLOCK event fires

// ── Ability unlock toast ─────────────────────────────────────────────────
let abilityUnlockToast = null;  // { text, icon, timer, maxTimer }

// ── Exploration chapter state ─────────────────────────────────────────────
let exploreActive    = false;   // true while exploration chapter is running
let exploreWorldLen  = 4200;    // total world length in game px (set per chapter)
let exploreGoalX     = 3800;    // world x of goal object
let exploreGoalName  = '';      // display name of the goal object
let exploreGoalFound = false;   // true when player reaches the goal
let exploreSpawnQ    = [];      // [{wx, def}] enemies to spawn as player passes wx
let exploreEnemyCap  = 2;       // max concurrent exploration enemies alive at once
let exploreCheckpoints = [];    // [{ x, hit }]
let exploreCheckpointIdx = -1;
let exploreSidePortals = [];    // [{ x, y, type, reward, active, entered }]
let exploreAmbushTimer = 0;
let exploreCombatQuiet = 0;
let exploreArenaLock = null;    // { left, right, enemies:[], cleared, label }

// ── TrueForm clone position history (ring buffer for multiverse lag effect) ──
let _tfCloneHistory = [];   // [{ x, cy, facing }, ...] — last 24 frames
