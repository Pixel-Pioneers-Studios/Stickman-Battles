'use strict';
// smb-realm.js: Realm mode. A connected world of rooms joined by doors, the first step of the God of War
// direction (docs/god-of-war-plan.md). Rooms are data in REALM_DEFS; one room is the live arena at a time.
// The realm remembers where you have been, which chests you opened and the last checkpoint door you came
// through, per account, so leaving a room and coming back finds it as you left it.
//
// Door kinds:
//   edge  side: 'l' | 'r'. Walk into the room's left or right wall.
//   arch  x (and optional y, the ledge it stands on). Press F in front of it. Leads into the background
//         or up a ladder; the art says which.
//   drop  x0..x1, a hole in the floor. Fall through it to the room below.
//   fall  x. Arrival only: where a drop lands you, from above.
// foes: [{ x, name, weaponKey, classKey, aiDiff, color, health, armor }] spawn on entry until the room is clear;
// every door in the room stays shut while any of them stands (story host). burn: [{ id, x, art, line }] are
// machines destroyed with F (a charge, then fire); burning one sets flag 'burn_<id>'. A door with needs only
// opens once that flag is set. say: a line shown on entry.
// Puzzle parts (see _realmPuzzleTick): blocks [{ id, x }] stone you push along the floor; plates [{ id, x, latch,
// hold }] down while you or a block stand on them (latch: a block locks it for good; hold: frames it stays down
// after you step off); bars [{ id, x, when }] a portcullis that rises while 'when' holds and stays up once you are
// past it; levers [{ id, x, y, when, sets, line }] F to pull; cracks [{ id, x, hits }] a wall your swings break;
// lifts [{ id, x, w, y0, y1, when }] a platform between y0 (low) and y1 (high; level and flush with the ledge it serves): with 'when' it rises while that holds,
// without it shuttles on its own. spikes [[x0, x1]] floor strips that hurt (12) and bounce you up.
// torches [{ id, x, y }] F lights one for good (flag torch_<id>). lightless: 0-1, a room that is dark but for a
// small circle around you and the torches you have lit.
// crumbles [{ id, x, y, w }] ledges that shake when you land and give way CRUMBLE_F frames later, then re-form
// CRUMBLE_BACK_F frames after that (once nobody is under them).
// steps [[x, h, w]] low solid walls to jump. Room stone: [base, top edge] colours these parts.
// npcs: [{ kind: 'shop', x }]. The shopkeeper: F opens the story shop (openShopFromWorld, smb-story-engine-ui.js).
// Room flags: back (an interior behind the outdoor rooms: stone back wall), dark (0-1, dims the backdrop),
// wall (back-wall colour).
//
// Story host: REALM_STORY attaches side rooms to walkable story chapters (gameMode 'exploration'). The chapter's
// world stays the main room. Entering a side room sets the world, its enemies and projectiles aside and
// updateExploration pauses (realmInSideRoom); leaving puts them back. A door whose target is '@main' returns to
// the chapter world at the named entrance. Entrances can wait on a save flag (needs), or open only from the room
// side (oneWay). Gates are walls in the chapter world that a terminal opens once the player holds an item.
// A door with checkpoint: true records itself as the respawn point when you arrive through it.
//
// Depends on: smb-globals.js, smb-state.js (account flags), smb-particles-core.js, smb-fighter.js,
// smb-pathfinding.js (buildGraphForCurrentArena). Hooks: smb-menu-startcore.js (arena + player),
// smb-loop-core.js (update and the three draw layers), smb-camera.js, smb-input.js (F).

const REALM_FLOOR_Y = 560;
const REALM_FLOOR_H = 220;       // floor slabs run deep, so holes read as holes
const REALM_EDGE_ZONE = 18;      // px from a wall that counts as walking out through it
const REALM_FADE_F = 26;
const REALM_ARCH_W = 92, REALM_ARCH_H = 150;
const REALM_REACH = 46;          // horizontal reach for F on arches and chests
const REALM_DEATH_Y = 1200;   // low enough that a drop finishes its fade before the fall kills
const REALM_BLOCK = 64;          // stone block size
const REALM_PLATE_W = 84;
const REALM_CRUMBLE_F = 34;       // frames a crumbling ledge holds you before it gives way
const REALM_CRUMBLE_BACK_F = 210; // frames until it re-forms

const REALM_DEFS = {
  old_ruins: {
    name: 'The Old Ruins',
    theme: 'ruins',
    start: { room: 'courtyard', door: 'start' },
    rooms: {
      courtyard: {
        name: 'Courtyard', gx: 0, gy: 0, w: 1800,
        ledges: [[260, 440, 180], [560, 360, 160], [1180, 420, 200], [1460, 330, 150]],
        doors: [
          { id: 'start', kind: 'fall', x: 200 },
          { id: 'east',  kind: 'edge', side: 'r', to: ['hall', 'west'] },
          { id: 'shrine', kind: 'arch', x: 900, art: 'temple', checkpoint: true, to: ['shrine', 'out'] },
        ],
        chests: [{ id: 'c1', x: 620, y: 360, gives: 'health' }],
        npcs: [{ kind: 'shop', x: 1560 }],
      },
      hall: {
        name: 'Collapsed Hall', gx: 1, gy: 0, w: 2100,
        floor: [[0, 900], [1060, 1480], [1640, 2100]],
        ledges: [[380, 430, 170], [1240, 400, 160], [1500, 440, 120], [1820, 380, 180]],
        doors: [
          { id: 'west', kind: 'edge', side: 'l', checkpoint: true, to: ['courtyard', 'east'] },
          { id: 'hole', kind: 'drop', x0: 900, x1: 1060, to: ['undercroft', 'top'] },
          { id: 'ladder', kind: 'arch', x: 1720, art: 'hatch', to: ['undercroft', 'up'] },
        ],
        // 1480-1640 has no door: a plain pit. Dying there sends you back to the last checkpoint.
        chests: [{ id: 'c2', x: 1900, y: 380, gives: 'weapon:katana' }],
      },
      undercroft: {
        name: 'Undercroft', gx: 1, gy: 1, w: 1500, dark: 0.5,
        ledges: [[300, 440, 160], [640, 380, 180], [1040, 430, 160]],
        doors: [
          { id: 'top', kind: 'fall', x: 980, checkpoint: true },
          { id: 'up', kind: 'arch', x: 1360, art: 'ladder', to: ['hall', 'ladder'] },
        ],
        chests: [{ id: 'c3', x: 730, y: 380, gives: 'health' }],
      },
      shrine: {
        name: 'Inner Shrine', gx: 0, gy: -1, w: 1100, back: true,
        ledges: [[200, 420, 150], [750, 420, 150], [470, 320, 160]],
        doors: [
          { id: 'out', kind: 'arch', x: 550, art: 'out', to: ['courtyard', 'shrine'] },
        ],
        chests: [{ id: 'c4', x: 550, y: 320, gives: 'weapon:axe' }],
      },
    },
  },
  // The trial wing (story id 69, "What the Lab Taught"): the chapter text has Kael and Calix burn it in order,
  // intake, the columns, the rig, the data core last. Here they do it room by room.
  trialwing: {
    name: 'The Trial Wing',
    theme: 'storyLab',
    start: { room: 'intake', door: 'in' },
    route: ['intake', 'columns', 'rig', 'core'],
    rooms: {
      intake: {
        name: 'Intake', gx: 0, gy: 0, w: 1200, back: true, wall: '#242b2a',
        say: 'Calix: "Intake first. This is where they logged us in."',
        ledges: [[300, 440, 160], [620, 400, 140]],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'labdoor', to: ['@main', 'wing'] },
          { id: 'next', kind: 'edge', side: 'r', needs: 'burn_intake', to: ['columns', 'in'] },
        ],
        foes: [
          { x: 760, name: 'Intake Drone', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'medium', color: '#446688' },
          { x: 980, name: 'Intake Drone', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'medium', color: '#445577' },
        ],
        burn: [{ id: 'intake', x: 1000, art: 'terminal', line: 'The intake logs go up first.' }],
      },
      columns: {
        name: 'Stasis Columns', gx: 1, gy: 0, w: 1400, back: true, wall: '#22302c',
        say: 'Calix: "The columns. Don\'t read the labels."',
        ledges: [[260, 430, 150], [600, 360, 200], [1000, 430, 150], [760, 250, 120]],
        chests: [{ id: 'cache', x: 820, y: 250, gives: 'exp:60' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['intake', 'next'] },
          { id: 'next', kind: 'edge', side: 'r', needs: 'burn_columns', to: ['rig', 'in'] },
        ],
        foes: [
          { x: 700, name: 'Facility Drone', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'medium', color: '#446688' },
          { x: 1150, name: 'Column Warden', weaponKey: 'hammer', classKey: 'thor', aiDiff: 'hard', color: '#334466', armor: ['helmet'] },
        ],
        burn: [{ id: 'columns', x: 1180, art: 'columns', line: 'The columns crack and go dark, one after another.' }],
      },
      rig: {
        name: 'The Trial Rig', gx: 2, gy: 0, w: 1300, back: true, wall: '#2a2a30', dark: 0.2,
        say: 'Calix: "The rig. It tested both of mine against each other. Twice."',
        ledges: [[280, 420, 160], [860, 420, 160]],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['columns', 'next'] },
          { id: 'next', kind: 'edge', side: 'r', needs: 'burn_rig', to: ['core', 'in'] },
        ],
        foes: [
          { x: 820, name: 'Rig Handler', weaponKey: 'hammer', classKey: 'thor', aiDiff: 'hard', color: '#3a3f55' },
          { x: 1040, name: 'Facility Drone', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'medium', color: '#2f3448' },
        ],
        burn: [{ id: 'rig', x: 640, art: 'rig', line: 'The rig tears itself apart in the heat.' }],
      },
      core: {
        name: 'Data Core', gx: 3, gy: 0, w: 1100, back: true, wall: '#1c2228', dark: 0.3,
        say: 'Calix: "Data core last. Everything they learned is in there."',
        ledges: [[240, 420, 150], [700, 420, 150]],
        chests: [{ id: 'spoils', x: 775, y: 420, gives: 'tokens:50' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['rig', 'next'] },
          { id: 'out', kind: 'edge', side: 'r', needs: 'burn_core', to: ['@main', 'coreExit'] },
        ],
        foes: [
          { x: 760, name: 'Trial Overseer', weaponKey: 'scythe', classKey: 'warrior', aiDiff: 'hard', color: '#5a2a55', health: 200, armor: ['helmet'] },
        ],
        burn: [{ id: 'core', x: 520, art: 'core', line: 'The core burns. Everything this place learned goes with it.' }],
      },
    },
  },

  // Off the tunnel of story id 8 (Cache Discovery): the first optional rooms a player can find. Gentle on purpose:
  // one block to push, one weak foe, small rewards.
  crawl: {
    name: 'The Cache Crawlspace',
    theme: 'cave',
    start: { room: 'crawl', door: 'in' },
    rooms: {
      crawl: {
        name: 'Maintenance Crawl', gx: 0, gy: 0, w: 1100, back: true, wall: '#1a1e24', dark: 0.3, stone: ['#3a4048', '#525a64'],
        say: 'A crawlspace behind the cache. The grate ahead opens on a weight.',
        blocks: [{ id: 'crate', x: 330 }],
        plates: [{ id: 'grate', x: 640, latch: true }],
        bars: [{ id: 'grate', x: 900, when: 'plate:grate' }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'hatch', to: ['@main', 'crawl'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['store', 'in'] },
        ],
      },
      store: {
        name: 'Supply Store', gx: 1, gy: 0, w: 900, back: true, wall: '#1c2026', dark: 0.25, stone: ['#3a4048', '#525a64'],
        ledges: [[520, 440, 140]],
        chests: [{ id: 'kit', x: 590, y: 440, gives: 'tokens:30' }, { id: 'notes', x: 700, gives: 'exp:40' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['crawl', 'next'] },
          { id: 'up', kind: 'arch', x: 820, art: 'ladder', to: ['@main', 'crawl'] },
        ],
        foes: [
          { x: 560, name: 'Cache Drone', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'easy', color: '#446688' },
        ],
      },
    },
  },

  // Off the sentinel road of story id 96 (Shadow Realm): optional, and dark. Torches you light stay lit.
  galleries: {
    name: 'The Blind Galleries',
    theme: 'storyShadow',
    start: { room: 'gallery', door: 'in' },
    rooms: {
      gallery: {
        name: 'The Blind Gallery', gx: 0, gy: 0, w: 1400, back: true, wall: '#140c1e', lightless: 0.96, stone: ['#2c2238', '#40344e'],
        say: 'No light reaches this far in. The fragment hums, low.',
        ledges: [[560, 450, 110], [960, 450, 110]],
        spikes: [[480, 680], [880, 1080]],
        torches: [{ id: 'g1', x: 300 }, { id: 'g2', x: 780 }, { id: 'g3', x: 1200 }],
        chests: [{ id: 'dark', x: 1015, y: 450, gives: 'tokens:45' }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'temple', to: ['@main', 'galleries'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['listening', 'in'] },
        ],
      },
      listening: {
        name: 'The Listening Room', gx: 1, gy: 0, w: 1200, back: true, wall: '#120a1c', lightless: 0.96, stone: ['#2c2238', '#40344e'],
        ledges: [[250, 430, 150], [800, 430, 150]],
        torches: [{ id: 'l1', x: 600 }],
        chests: [{ id: 'echo', x: 1000, gives: 'exp:120' }, { id: 'hush', x: 875, y: 430, gives: 'tokens:60' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['gallery', 'next'] },
          { id: 'up', kind: 'arch', x: 1100, art: 'temple', to: ['@main', 'galleries'] },
        ],
        foes: [
          { x: 700, name: 'Blind Stalker', weaponKey: 'sword', classKey: 'ninja', aiDiff: 'hard', color: '#550099' },
          { x: 950, name: 'Blind Stalker', weaponKey: 'spear', classKey: 'ninja', aiDiff: 'hard', color: '#440088', health: 160, armor: ['helmet'] },
        ],
      },
    },
  },

  // Under the outer ruins of story id 98 (Titan World): optional. Titan-scale steps and a two-weight puzzle.
  titanhall: {
    name: 'Hall of the First Wall',
    theme: 'storyTitan',
    start: { room: 'stair', door: 'in' },
    rooms: {
      stair: {
        name: 'Titan Stair', gx: 0, gy: 0, w: 1300, back: true, wall: '#2a1c10', dark: 0.2, stone: ['#5a4430', '#76593e'],
        say: 'Steps cut for something three times your height.',
        steps: [[300, 110, 120], [560, 190, 120]],
        spikes: [[700, 880]],
        chests: [{ id: 'urn', x: 620, y: 370, gives: 'tokens:40' }],
        cracks: [{ id: 'wall', x: 1060, hits: 5 }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'temple', to: ['@main', 'titanhall'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['weigh', 'in'] },
        ],
      },
      weigh: {
        name: 'The Weighing of Kings', gx: 1, gy: 0, w: 1300, back: true, wall: '#2c1e12', dark: 0.25, stone: ['#5a4430', '#76593e'],
        say: 'An inscription over the far door: "Each weight to its own side."',
        blocks: [{ id: 'a', x: 560 }, { id: 'b', x: 760 }],
        plates: [{ id: 'l', x: 260, latch: true }, { id: 'r', x: 1060, latch: true }],
        bars: [{ id: 'kings', x: 1180, when: ['plate:l', 'plate:r'] }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['stair', 'next'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['throne', 'in'] },
        ],
      },
      throne: {
        name: 'Throne of the Dead King', gx: 2, gy: 0, w: 1100, back: true, wall: '#301e10', dark: 0.3, stone: ['#5a4430', '#76593e'],
        ledges: [[220, 430, 150], [730, 430, 150]],
        chests: [{ id: 'crown', x: 950, gives: 'exp:140' }, { id: 'tithe', x: 805, y: 430, gives: 'tokens:90' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['weigh', 'next'] },
          { id: 'up', kind: 'arch', x: 1010, art: 'ladder', to: ['@main', 'titanhall'] },
        ],
        foes: [
          { x: 640, name: 'Ruin Colossus', weaponKey: 'hammer', classKey: 'thor', aiDiff: 'hard', color: '#884400', health: 240, armor: ['helmet', 'chestplate'] },
          { x: 860, name: 'Titan Patrol', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', color: '#995500' },
        ],
      },
    },
  },

  // Under the root pit of story id 41 (the Sanctum Cache): optional, like the undercroft. Lifts and spikes.
  rootvault: {
    name: 'The Root Vault',
    theme: 'forest',
    start: { room: 'shaft', door: 'in' },
    rooms: {
      shaft: {
        name: 'Root Shaft', gx: 0, gy: 1, w: 1300, back: true, wall: '#141c10', dark: 0.35, stone: ['#3a3226', '#54483a'],
        say: 'Roots older than the sanctum. Something was built down here before it.',
        ledges: [[430, 460, 110], [640, 430, 110], [1130, 250, 170]],
        spikes: [[360, 840]],
        lifts: [{ id: 'shaft', x: 1000, w: 130, y0: 500, y1: 250 }],
        chests: [{ id: 'sap', x: 690, y: 430, gives: 'tokens:25' }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'ladder', to: ['@main', 'rootvault'] },
          { id: 'up', kind: 'arch', x: 1225, y: 250, art: 'temple', to: ['thorn', 'in'] },
        ],
      },
      thorn: {
        name: 'Thornwalk', gx: 1, gy: 0, w: 1500, back: true, wall: '#162012', dark: 0.25, stone: ['#3a3226', '#54483a'],
        ledges: [[300, 460, 100], [480, 390, 100], [600, 270, 120], [700, 440, 100], [900, 380, 100], [1100, 450, 100]],
        spikes: [[240, 1250]],
        chests: [{ id: 'nest', x: 950, y: 380, gives: 'exp:40' }],
        levers: [{ id: 'thorn', x: 660, y: 270, line: 'Somewhere ahead, a gate of roots pulls apart.' }],
        bars: [{ id: 'thorn', x: 1360, when: 'lever:thorn' }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'temple', to: ['shaft', 'up'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['vault', 'in'] },
        ],
      },
      vault: {
        name: 'The Root Vault', gx: 2, gy: 0, w: 1100, back: true, wall: '#18200f', dark: 0.3, stone: ['#3a3226', '#54483a'],
        ledges: [[220, 430, 150], [730, 430, 150]],
        chests: [{ id: 'heart', x: 950, gives: 'exp:100' }, { id: 'cache', x: 805, y: 430, gives: 'tokens:60' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['thorn', 'next'] },
          { id: 'up', kind: 'arch', x: 1010, art: 'ladder', to: ['@main', 'rootvault'] },
        ],
        foes: [
          { x: 640, name: 'Root Keeper', weaponKey: 'hammer', classKey: 'thor', aiDiff: 'hard', color: '#2c3a1c', health: 200, armor: ['helmet'] },
          { x: 860, name: 'Sanctum Scout', weaponKey: 'sword', classKey: 'ninja', aiDiff: 'medium', color: '#334422' },
        ],
      },
    },
  },

  // Beneath the ruins of story id 46: an optional dungeon off the main walk. Nothing on the main path needs it;
  // it pays out in EXP and tokens and holds the chapter's only optional mini-boss.
  undercroft: {
    name: 'Beneath the First Collapse',
    theme: 'ruins',
    start: { room: 'stair', door: 'in' },
    rooms: {
      stair: {
        name: 'Collapsed Stair', gx: 0, gy: 0, w: 1200, back: true, wall: '#2a2018', dark: 0.2, stone: ['#4a3c2c', '#62503a'],
        floor: [[0, 820], [960, 1200]],
        ledges: [[1000, 430, 140]],
        chests: [{ id: 'dust', x: 1070, y: 430, gives: 'tokens:25' }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'temple', to: ['@main', 'undercroft'] },
          { id: 'down', kind: 'drop', x0: 820, x1: 960, to: ['sunken', 'top'] },
        ],
        cracks: [{ id: 'stair', x: 640, hits: 4 }],
      },
      sunken: {
        name: 'The Sunken Hall', gx: 0, gy: 1, w: 1500, back: true, wall: '#241a14', dark: 0.4, stone: ['#4a3c2c', '#62503a'],
        ledges: [[520, 450, 130], [880, 450, 130]],
        steps: [[700, 70, 60], [1060, 70, 60]],
        doors: [
          { id: 'top', kind: 'fall', x: 180, checkpoint: true },
          { id: 'up', kind: 'arch', x: 110, art: 'ladder', to: ['@main', 'undercroft'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['vault', 'in'] },
        ],
        foes: [
          { x: 900, name: 'Tomb Knight', weaponKey: 'axe', classKey: 'warrior', aiDiff: 'hard', color: '#998877', armor: ['helmet'] },
          { x: 1150, name: 'Rubble Crawler', weaponKey: 'sword', classKey: 'ninja', aiDiff: 'medium', color: '#887766' },
        ],
        plates: [{ id: 'run', x: 300, hold: 270 }],
        bars: [{ id: 'run', x: 1300, when: 'plate:run' }],
      },
      vault: {
        name: 'Vault of the First Collapse', gx: 1, gy: 1, w: 1100, back: true, wall: '#2c2016', dark: 0.3, stone: ['#4a3c2c', '#62503a'],
        ledges: [[220, 430, 150], [730, 430, 150]],
        chests: [{ id: 'relic', x: 950, gives: 'exp:120' }, { id: 'coin', x: 805, y: 430, gives: 'tokens:80' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['sunken', 'next'] },
          { id: 'up', kind: 'arch', x: 1010, art: 'ladder', to: ['@main', 'undercroft'] },
        ],
        foes: [
          { x: 720, name: 'Collapse Warden', weaponKey: 'hammer', classKey: 'thor', aiDiff: 'hard', color: '#7a6644', health: 220, armor: ['helmet', 'chestplate'] },
        ],
      },
    },
  },

  // Behind the Crucible's outer wall in story id 28 (Into the Crucible): optional. The three tests the Crucible gave
  // every bearer before Kael: speed (crumbling ledges over spikes), thought (a block that has to go backward),
  // strength (its warden). Foes are Crucible constructs; dead bearers are never enemies (docs/canon.md).
  proving: {
    name: 'The Proving Halls',
    theme: 'volcano',
    start: { room: 'floor', door: 'in' },
    rooms: {
      floor: {
        name: 'The Proving Floor', gx: 0, gy: 0, w: 1500, back: true, wall: '#1e0810', dark: 0.3, stone: ['#4a2030', '#6a3048'],
        say: 'Forty-seven sets of footprints lead in. The first test was speed.',
        spikes: [[300, 1200]],
        crumbles: [
          { id: 'a', x: 310, y: 460, w: 110 }, { id: 'b', x: 490, y: 420, w: 110 },
          { id: 'd', x: 850, y: 410, w: 110 }, { id: 'e', x: 1030, y: 440, w: 110 },
        ],
        ledges: [[670, 450, 110]],
        chests: [{ id: 'ash', x: 725, y: 450, gives: 'tokens:35' }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'temple', to: ['@main', 'proving'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['weigh', 'in'] },
        ],
      },
      weigh: {
        name: 'The Second Test', gx: 1, gy: 0, w: 1400, back: true, wall: '#200812', dark: 0.3, stone: ['#4a2030', '#6a3048'],
        say: 'Cut over the far bars: "They all pushed forward."',
        blocks: [{ id: 'a', x: 420 }, { id: 'b', x: 1010 }],
        plates: [{ id: 'p1', x: 640, latch: true }, { id: 'p2', x: 880, latch: true }],
        bars: [{ id: 'inner', x: 780, when: 'plate:p1' }, { id: 'out', x: 1300, when: 'plate:p2' }],
        ledges: [[1100, 430, 140]],
        chests: [{ id: 'notes', x: 1170, y: 430, gives: 'exp:50' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['floor', 'next'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['last', 'in'] },
        ],
      },
      last: {
        name: 'The Last Test', gx: 2, gy: 0, w: 1200, back: true, wall: '#220814', dark: 0.35, stone: ['#4a2030', '#6a3048'],
        say: 'Forty-seven marks are cut into the wall here. There is room for one more.',
        tally: { x: 360, y: 210, n: 47 },
        ledges: [[220, 430, 150], [780, 430, 150]],
        chests: [{ id: 'logs', x: 1040, gives: 'exp:130' }, { id: 'tithe', x: 855, y: 430, gives: 'tokens:80' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['weigh', 'next'] },
          { id: 'up', kind: 'arch', x: 1110, art: 'ladder', to: ['@main', 'proving'] },
        ],
        foes: [
          { x: 700, name: 'Crucible Warden', weaponKey: 'hammer', classKey: 'thor', aiDiff: 'hard', color: '#880044', health: 200, armor: ['helmet', 'chestplate'] },
          { x: 900, name: 'Proving Sentry', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'medium', color: '#660033' },
        ],
      },
    },
  },

  // The Fallen God's memory vault: the puzzle dungeon of story id 81. Each room teaches one part.
  vault: {
    name: 'The Memory Vault',
    theme: 'void',
    start: { room: 'weights', door: 'in' },
    route: ['weights', 'stair', 'closing', 'seal'],
    rooms: {
      weights: {
        name: 'Hall of Weights', gx: 0, gy: 0, w: 1300, back: true, wall: '#1d1a2a',
        say: 'The Fallen God: "What is worth keeping has to be carried. Carry it."',
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'temple', checkpoint: true, to: ['@main', 'vault'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['stair', 'in'] },
        ],
        blocks: [{ id: 'stone', x: 360 }],
        plates: [{ id: 'w', x: 700, latch: true }],
        bars: [{ id: 'w', x: 1040, when: 'plate:w' }],
      },
      stair: {
        name: 'The Broken Stair', gx: 1, gy: 0, w: 1500, back: true, wall: '#1f1b2c', dark: 0.15,
        say: 'The Fallen God: "Some doors are not opened. They are broken."',
        ledges: [[420, 440, 150], [620, 360, 150], [820, 280, 160]],
        chests: [{ id: 'ledge', x: 900, y: 280, gives: 'tokens:40' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['weights', 'next'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['closing', 'in'] },
        ],
        foes: [
          { x: 760, name: 'Threshold Guard', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'medium', color: '#ccaa44' },
          { x: 1000, name: 'Threshold Guard', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', color: '#aa8822' },
        ],
        cracks: [{ id: 'stair', x: 1250, hits: 4 }],
      },
      closing: {
        name: 'The Closing Door', gx: 2, gy: 0, w: 1400, back: true, wall: '#1b1828', dark: 0.2,
        say: 'The Fallen God: "I sealed every wall in time. Be as quick as I was."',
        ledges: [[560, 450, 130], [900, 450, 130]],
        steps: [[700, 70, 60]],
        chests: [{ id: 'past', x: 1300, gives: 'exp:60' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['stair', 'next'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['seal', 'in'] },
        ],
        plates: [{ id: 'run', x: 190, hold: 260 }],
        bars: [{ id: 'run', x: 1180, when: 'plate:run' }],
      },
      seal: {
        name: 'Seal Chamber', gx: 3, gy: 0, w: 1100, back: true, wall: '#241c30', dark: 0.25,
        say: 'The Fallen God: "The last lock is guarded. Take it from what guards it."',
        ledges: [[230, 430, 150], [720, 430, 150]],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['closing', 'next'] },
          { id: 'out', kind: 'edge', side: 'r', needs: 'gate_seal', lockedText: 'Sealed. Pull the seal lever.', to: ['@main', 'sealExit'] },
        ],
        foes: [
          { x: 760, name: 'Vault Sentinel', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', color: '#8a6a22', health: 170, armor: ['helmet'] },
        ],
        levers: [{ id: 'seal', x: 900, sets: 'gate_seal', when: 'clear', line: 'The seal lifts. Somewhere behind you, stone grinds open.' }],
      },
    },
  },

  // Side rooms of the Abandoned Research Facility (story ids 66-69). Entrances live in REALM_STORY.facility.
  facility: {
    name: 'Abandoned Research Facility',
    theme: 'storyLab',
    start: { room: 'supply', door: 'out' },
    rooms: {
      supply: {
        name: 'Supply Room', gx: 0, gy: 0, w: 1000, back: true, wall: '#262d2f',
        ledges: [[300, 450, 140], [520, 400, 120]],
        doors: [{ id: 'out', kind: 'arch', x: 110, art: 'labdoor', to: ['@main', 'supply'] }],
        chests: [{ id: 'rations', x: 370, y: 450, gives: 'health' }],
        npcs: [{ kind: 'shop', x: 760 }],
      },
      records: {
        name: 'Records Office', gx: 0, gy: 1, w: 1300, back: true, wall: '#25302b', dark: 0.25,
        ledges: [[280, 450, 160], [560, 370, 200], [900, 440, 170]],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'labdoor', to: ['@main', 'records'] },
          { id: 'up', kind: 'arch', x: 1200, art: 'ladder', to: ['@main', 'shaft'] },
        ],
        chests: [{ id: 'key', x: 660, y: 370, gives: 'item:oldKey', label: 'OLD ACCESS KEY' },
                 { id: 'files', x: 980, y: 440, gives: 'tokens:30' }],
      },
    },
  },
};

// Story chapters that carry side rooms. Entrance x and gate x are in the chapter world's coordinates.
const REALM_STORY = {
  crawl: {
    chapters: [8],
    entrances: [{ id: 'crawl', ch: 8, x: 4100, art: 'hatch', room: 'crawl', door: 'in' }],
    gates: [],
  },
  galleries: {
    chapters: [96],
    entrances: [{ id: 'galleries', ch: 96, x: 1600, art: 'temple', room: 'gallery', door: 'in' }],
    gates: [],
  },
  titanhall: {
    chapters: [98],
    entrances: [{ id: 'titanhall', ch: 98, x: 1650, art: 'temple', room: 'stair', door: 'in' }],
    gates: [],
  },
  rootvault: {
    chapters: [41],
    entrances: [{ id: 'rootvault', ch: 41, x: 1320, art: 'hatch', room: 'shaft', door: 'in' }],
    gates: [],
  },
  undercroft: {
    chapters: [46],
    entrances: [{ id: 'undercroft', ch: 46, x: 1300, art: 'temple', room: 'stair', door: 'in' }],
    gates: [],
  },
  proving: {
    chapters: [28],
    entrances: [{ id: 'proving', ch: 28, x: 2450, art: 'temple', room: 'floor', door: 'in' }],
    gates: [],
  },
  // A gate without termX has no terminal: something in the side rooms sets its gate_<id> flag.
  vault: {
    chapters: [81],
    entrances: [
      { id: 'vault', ch: 81, x: 2050, art: 'temple', room: 'weights', door: 'in' },
      { id: 'sealExit', ch: 81, x: 2420, art: 'temple', room: 'seal', door: 'out', oneWay: true,
        lockedText: 'Sealed from the other side.' },
    ],
    gates: [{ id: 'seal', ch: 81, x: 2250 }],
  },
  // exitNeeds: the chapter's exit stays sealed until that flag is set (exitReason is the sealed-exit text).
  trialwing: {
    chapters: [69],
    exitNeeds: { 69: 'burn_core' },
    exitReason: 'the trial wing still stands',
    entrances: [
      { id: 'wing', ch: 69, x: 3400, art: 'labdoor', room: 'intake', door: 'in' },
      { id: 'coreExit', ch: 69, x: 5150, art: 'labdoor', room: 'core', door: 'out', oneWay: true,
        lockedText: 'Sealed from the other side.' },
    ],
    gates: [],
  },
  facility: {
    chapters: [66, 67, 68],
    entrances: [
      { id: 'supply',  ch: 66, x: 1000, art: 'labdoor', room: 'supply',  door: 'out' },
      { id: 'records', ch: 67, x: 470,  art: 'labdoor', room: 'records', door: 'in',
        needs: 'power', lockedText: 'No power. The door will not move.' },
      { id: 'shaft',   ch: 67, x: 1800, art: 'hatch',   room: 'records', door: 'up', oneWay: true,
        lockedText: 'Bolted from the other side.' },
    ],
    gates: [
      { id: 'blast', ch: 67, x: 2015, termX: 1930, needs: 'oldKey',
        deniedFirst: 'ACCESS DENIED: older protocol. Power rerouted to the Records Office.',
        denied: 'ACCESS DENIED. The key is in the Records Office.',
        opened: 'Old protocol accepted. The blast door opens.',
        setsFlag: 'power',
        alarm: [
          { x: 700, name: 'Facility Drone', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', color: '#446688' },
          { x: 840, name: 'Facility Drone', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'hard', color: '#445577' },
        ] },
    ],
  },
};

var realmActive  = false;
var realmKey     = 'old_ruins';
var realmHost    = 'realm'; // 'realm' (the standalone mode) or 'story' (side rooms of a story chapter)
var _realmStash  = null;    // story: the chapter world set aside while in a side room
var _realmStoryArena = null;
var _realmStoryChId  = null;
var _realmStoryFrom  = null; // entrance id the player came in through
var realmRoomKey = null;
var realmSave    = null;   // { room, checkpoint: {room, door}, looted: {room:{chest:true}}, visited: {room:true} }
var realmFade    = 0;      // >0 fading out toward a door, <0 fading in
var realmPending = null;   // { room, door } to enter when the fade-out finishes
var realmBanner  = 0;
var _realmDead   = false;
var _realmView   = null;
var _realmNear   = null;   // { kind: 'arch'|'chest'|'npc', ref } the F prompt points at
var _realmSay    = null;   // { npc, text, t } a line the shopkeeper is saying
var _realmSaidIn = null;   // room key the shopkeeper last greeted you in
var _realmSayIdx = 0;
// Hitting the shopkeeper: two warnings, then he ends you. He never moves; the lantern goes out instead.
const REALM_SHOP_WARN = [
  'Careful. I only deal in tokens.',
  'That is twice. There will not be a third.',
];
const REALM_SHOP_KILL_LINE = 'I did warn you.';
const REALM_SHOP_KILL_F = 70;   // frames of the lantern going out; the killing starts halfway
var _realmFoesRoom = null;      // room whose enemies are out; dead enemies leave minions[], so this remembers it
var _realmCharge = null;        // { room, id, t } a planted charge counting down
const REALM_CHARGE_F = 110;
var _realmSealNag = 0;
var _realmShopHits = 0;
var _realmShopKill = 0;         // >0 while he is killing you
var _realmPuz = null;           // puzzle parts' per-visit state (_realmPuzzleReset)
var _realmStarted = false;      // a swing or Q started this frame (set by _realmShopTick)
var _realmPrevAtk = 0, _realmPrevAbil = 0;
const REALM_SHOP_LINES = [
  'You again. Or the first time. It is hard to tell with you.',
  'Everything here was left behind by someone. Now it is for sale.',
  'Tokens. I do not ask where you found them.',
  'Spend it while you can. Nobody carries anything out.',
];

function _realmDef() { return REALM_DEFS[realmKey]; }
function _realmRoom(k) { var d = _realmDef(); return d && d.rooms[k || realmRoomKey]; }

// Save, per account, with a localStorage fallback (the Endless best-score pattern).
function _realmLoad() {
  var s = null;
  try {
    var acct = (typeof GameState !== 'undefined' && GameState.getActiveAccount) ? GameState.getActiveAccount() : null;
    s = acct && acct.data && acct.data.unlocks && acct.data.unlocks.realm ? acct.data.unlocks.realm[realmKey] : null;
    if (!s) { var raw = localStorage.getItem('smb_realm_' + realmKey); if (raw) s = JSON.parse(raw); }
  } catch (e) { s = null; }
  var def = _realmDef();
  if (!s || !s.checkpoint || !def.rooms[s.checkpoint.room]) {
    s = { checkpoint: { room: def.start.room, door: def.start.door }, looted: {}, visited: {} };
  }
  s.looted = s.looted || {};
  s.visited = s.visited || {};
  s.items = s.items || {};
  s.flags = s.flags || {};
  return s;
}

function _realmStore() {
  if (!realmSave) return;
  var copy = JSON.parse(JSON.stringify(realmSave));
  try {
    if (typeof setAccountFlagWithRuntime === 'function') setAccountFlagWithRuntime(['unlocks', 'realm', realmKey], copy, function () {});
  } catch (e) {}
  try { localStorage.setItem('smb_realm_' + realmKey, JSON.stringify(copy)); } catch (e) {}
}

// Console: realmReset() starts the current realm over; realmReset('facility') resets that one (account and local copy).
function realmReset(key) {
  if (key && REALM_DEFS[key]) realmKey = key;
  try { localStorage.removeItem('smb_realm_' + realmKey); } catch (e) {}
  realmSave = { checkpoint: { room: _realmDef().start.room, door: _realmDef().start.door }, looted: {}, visited: {}, flags: {} };
  _realmStore();
}

function realmMakeArena(roomKey) {
  var R = _realmRoom(roomKey);
  var platforms = [];
  (R.floor || [[0, R.w]]).forEach(function (s) {
    platforms.push({ x: s[0], y: REALM_FLOOR_Y, w: s[1] - s[0], h: REALM_FLOOR_H, isFloor: true });
  });
  (R.ledges || []).forEach(function (l) {
    platforms.push({ x: l[0], y: l[1], w: l[2], h: 16, passUnder: true });
  });
  // Puzzle parts that are solid: stone blocks, portcullis bars and cracked walls (full height, so nothing jumps
  // them), and steps (low solid walls you jump). Drawn by drawRealmBack / drawRealmWorld.
  (R.steps || []).forEach(function (s) {
    platforms.push({ x: s[0], y: REALM_FLOOR_Y - s[1], w: s[2], h: s[1], noDraw: true, _realmStep: true });
  });
  (R.blocks || []).forEach(function (b) {
    platforms.push({ x: b.x - REALM_BLOCK / 2, y: REALM_FLOOR_Y - REALM_BLOCK, w: REALM_BLOCK, h: REALM_BLOCK, noDraw: true, _realmBlock: b.id });
  });
  (R.bars || []).forEach(function (b) {
    platforms.push({ x: b.x - 14, y: -600, w: 28, h: REALM_FLOOR_Y + 600, noDraw: true, _realmBar: b.id });
  });
  (R.cracks || []).forEach(function (c) {
    if (realmSave && realmSave.flags && realmSave.flags['broke_' + c.id]) return;
    platforms.push({ x: c.x - 24, y: -600, w: 48, h: REALM_FLOOR_Y + 600, noDraw: true, _realmCrack: c.id });
  });
  (R.crumbles || []).forEach(function (c) {
    platforms.push({ x: c.x, y: c.y, w: c.w, h: 16, passUnder: true, noDraw: true, _realmCrumble: c.id });
  });
  // Lifts start at their low stop; _realmPuzzleTick moves them.
  (R.lifts || []).forEach(function (l) {
    platforms.push({ x: l.x, y: l.y0, w: l.w || 120, h: 14, passUnder: true, noDraw: true, _realmLift: l.id });
  });
  var src = (typeof ARENAS !== 'undefined' && ARENAS[_realmDef().theme]) || {};
  return {
    id: '__realm__',
    name: R.name,
    sky: R.back ? ['#120a06', '#24160c'] : (src.sky || ['#1f1008', '#3a2418']),
    groundColor: src.groundColor || '#7a6445',
    platColor: src.platColor || '#8a7455', platEdge: src.platEdge || '#5a4432',
    deathY: REALM_DEATH_Y,
    worldWidth: R.w, mapLeft: 0, mapRight: R.w,
    isBossArena: false,
    isExploreArena: !R.back,
    themeKey: _realmDef().theme,
    themeFloorY: ((src.platforms || []).find(function (pl) { return pl.isFloor; }) || {}).y || null,
    platforms: platforms,
  };
}

// Where a door puts you when you arrive through it.
function _realmArrival(R, door) {
  if (door.kind === 'edge') return { x: door.side === 'l' ? 70 : R.w - 70, y: REALM_FLOOR_Y, facing: door.side === 'l' ? 1 : -1 };
  if (door.kind === 'fall') return { x: door.x, y: REALM_FLOOR_Y - 380, facing: 1 };
  if (door.kind === 'arch') return { x: door.x, y: door.y || REALM_FLOOR_Y, facing: 1 };
  if (door.kind === 'drop') return { x: (door.x0 + door.x1) / 2, y: REALM_FLOOR_Y - 380, facing: 1 };
  return { x: 100, y: REALM_FLOOR_Y, facing: 1 };
}

function _realmEnterRoom(roomKey, doorId) {
  var R = _realmRoom(roomKey);
  if (!R) return;
  realmRoomKey = roomKey;
  ARENAS.__realm__ = realmMakeArena(roomKey);
  currentArena = ARENAS.__realm__;
  _realmPuzzleReset(roomKey);
  if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();
  if (typeof minions !== 'undefined') minions.length = 0;
  if (typeof projectiles !== 'undefined') projectiles = [];

  var door = (R.doors || []).find(function (d) { return d.id === doorId; }) || R.doors[0];
  var a = _realmArrival(R, door);
  var p = players[0];
  if (p) {
    p.x = a.x - p.w / 2;
    p.y = a.y - p.h;
    p.vx = 0; p.vy = 0;
    p.facing = a.facing;
    p.spawnX = a.x; p.spawnY = REALM_FLOOR_Y;
    if (typeof camXCur !== 'undefined') {
      camXCur = camXTarget = _realmCamX(p.cx(), 1);
      camYCur = camYTarget = _realmCamY(p.cy(), 1);
    }
  }

  if (!realmSave.visited[roomKey]) realmBanner = 150;
  realmSave.visited[roomKey] = true;
  _realmSaidIn = null;
  _realmSay = null;
  _realmShopHits = 0; _realmShopKill = 0;
  realmSave.room = roomKey;
  if (door.checkpoint) {
    var was = realmSave.checkpoint;
    realmSave.checkpoint = { room: roomKey, door: door.id };
    if (p && (!was || was.room !== roomKey || was.door !== door.id) && typeof DamageText !== 'undefined') {
      damageTexts.push(new DamageText(p.cx(), p.y - 40, 'CHECKPOINT', '#ffd27a'));
    }
  }
  _realmStore();
}

// Called by _startGameCore before players exist: builds the room the save says to start in.
function realmBeginRun() {
  realmSave = _realmLoad();
  realmRoomKey = realmSave.checkpoint.room;
  return realmMakeArena(realmRoomKey);
}

// Called by _startGameCore once players[] holds P1.
function initRealm() {
  realmActive  = true;
  realmFade    = -REALM_FADE_F;
  realmPending = null;
  _realmDead   = false;
  realmBanner  = 0;
  _realmEnterRoom(realmSave.checkpoint.room, realmSave.checkpoint.door);
  realmBanner  = 150;
}

function realmResetState() {
  realmActive  = false;
  realmFade    = 0;
  realmPending = null;
  _realmDead   = false;
  _realmNear   = null;
  realmHost    = 'realm';
  realmRoomKey = null;
  _realmStash  = null;
  _realmStoryArena = null;
  _realmStoryChId  = null;
}

function _realmGo(target) {
  if (realmFade !== 0 || !target) return;
  realmPending = { room: target[0], door: target[1] };
  realmFade = REALM_FADE_F;
}

function _realmLooted(id) { var l = realmSave.looted[realmRoomKey]; return !!(l && l[id]); }

function _realmOpenChest(c, p) {
  if (!realmSave.looted[realmRoomKey]) realmSave.looted[realmRoomKey] = {};
  realmSave.looted[realmRoomKey][c.id] = true;
  _realmStore();
  if (typeof spawnParticles === 'function') spawnParticles(c.x, c.y - 20, '#ffd27a', 22);
  var label = '';
  if (c.gives === 'health') {
    p.health = p.maxHealth;
    label = 'HEALED';
  } else if (c.gives && (c.gives.indexOf('tokens:') === 0 || c.gives.indexOf('exp:') === 0) && typeof _story2 !== 'undefined' && _story2) {
    // Story currency: tokens for the shopkeeper, EXP for the skill tree. Scaled by difficulty like chapter rewards.
    var amt = parseInt(c.gives.split(':')[1], 10) || 0;
    if (c.gives.indexOf('tokens:') === 0) {
      amt = typeof _storyTokenReward === 'function' ? _storyTokenReward(amt) : amt;
      _story2.tokens = (_story2.tokens || 0) + amt;
      label = '+' + amt + ' TOKENS';
    } else {
      _story2.exp = (_story2.exp || 0) + amt;
      if (typeof _storyUpdateExpDisplay === 'function') _storyUpdateExpDisplay();
      label = '+' + amt + ' EXP';
    }
    if (typeof _saveStory2 === 'function') _saveStory2();
  } else if (c.gives && c.gives.indexOf('item:') === 0) {
    realmSave.items[c.gives.slice(5)] = true;
    _realmStore();
    label = c.label || 'FOUND';
  } else if (c.gives && c.gives.indexOf('weapon:') === 0) {
    var wk = c.gives.slice(7);
    if (typeof WEAPONS !== 'undefined' && WEAPONS[wk]) {
      p.weaponKey = wk; p.weapon = WEAPONS[wk]; p.cooldown = 0;
      label = (typeof getWeaponDisplayName === 'function' ? getWeaponDisplayName(wk) : WEAPONS[wk].name) || wk;
    }
  }
  if (label && typeof DamageText !== 'undefined') damageTexts.push(new DamageText(p.cx(), p.y - 35, label, '#ffd27a'));
}

// F: open a chest or go through an arch, whichever is in front of you.
function realmInteract() {
  var p = players[0];
  if (!realmActive || !p || p.health <= 0 || realmFade !== 0 || !_realmNear) return false;
  if (realmHost === 'story' && !realmRoomKey) return _realmStoryInteract(p);
  if (_realmNear.kind === 'chest') { _realmOpenChest(_realmNear.ref, p); return true; }
  if (_realmNear.kind === 'burn') { _realmPlantCharge(_realmNear.ref); return true; }
  if (_realmNear.kind === 'lever') { _realmPullLever(_realmNear.ref); return true; }
  if (_realmNear.kind === 'torch') { _realmLightTorch(_realmNear.ref); return true; }
  if (_realmNear.kind === 'arch') {
    var shut = _realmDoorShut(_realmNear.ref);
    if (shut) { _realmTell(shut, '#ff7766'); return true; }
    _realmGo(_realmNear.ref.to); return true;
  }
  if (_realmNear.kind === 'npc' && _realmNear.ref.kind === 'shop' && typeof openShopFromWorld === 'function') { openShopFromWorld(); return true; }
  return false;
}

function _realmFindNear(p) {
  var R = _realmRoom();
  var best = null, bestD = REALM_REACH;
  var feet = p.y + p.h;
  (R.chests || []).forEach(function (c) {
    if (_realmLooted(c.id)) return;
    var cy = c.y || REALM_FLOOR_Y;
    var d = Math.abs(p.cx() - c.x);
    if (d < bestD && Math.abs(feet - cy) < 30) { best = { kind: 'chest', ref: c }; bestD = d; }
  });
  (R.doors || []).forEach(function (dr) {
    if (dr.kind !== 'arch') return;
    var d = Math.abs(p.cx() - dr.x);
    if (d < bestD && Math.abs(feet - (dr.y || REALM_FLOOR_Y)) < 30) { best = { kind: 'arch', ref: dr }; bestD = d; }
  });
  (R.torches || []).forEach(function (t) {
    if (realmSave.flags['torch_' + t.id]) return;
    var d = Math.abs(p.cx() - t.x);
    if (d < bestD && Math.abs(feet - (t.y || REALM_FLOOR_Y)) < 30) { best = { kind: 'torch', ref: t }; bestD = d; }
  });
  (R.levers || []).forEach(function (l) {
    if (realmSave.flags['lever_' + l.id]) return;
    var d = Math.abs(p.cx() - l.x);
    if (d < bestD && Math.abs(feet - (l.y || REALM_FLOOR_Y)) < 30) { best = { kind: 'lever', ref: l }; bestD = d; }
  });
  (R.npcs || []).forEach(function (n) {
    var d = Math.abs(p.cx() - n.x);
    if (d < 70 && Math.abs(feet - REALM_FLOOR_Y) < 30) { best = { kind: 'npc', ref: n }; bestD = d; }
  });
  if (!_realmRoomFoesAlive() && !_realmCharge) {
    (R.burn || []).forEach(function (b) {
      if (realmSave.flags['burn_' + b.id]) return;
      var d = Math.abs(p.cx() - b.x);
      if (d < 70 && Math.abs(feet - REALM_FLOOR_Y) < 30) { best = { kind: 'burn', ref: b }; bestD = d; }
    });
  }
  return best;
}

// Per frame, after minions update.
function updateRealm() {
  if (gameMode === 'exploration') _realmStoryAttach();
  if (!realmActive || !gameRunning) return;
  var p = players[0];
  if (!p) return;
  if (realmHost === 'realm') p.lives = 99;
  if (realmBanner > 0) realmBanner--;

  if (realmFade > 0) {
    p.invincible = Math.max(p.invincible, 2);
    if (--realmFade === 0) {
      var pd = realmPending;
      realmPending = null;
      if (pd && realmHost === 'story') {
        if (pd.room === '@main') _realmStoryReturn(pd.door); else _realmStoryEnterRoom(pd.room, pd.door);
      } else if (pd) {
        _realmEnterRoom(pd.room, pd.door);
      }
      realmFade = -REALM_FADE_F;
    }
    return;
  }
  if (realmFade < 0) realmFade++;

  if (realmHost === 'story' && !realmRoomKey) {
    // A closed gate holds the player on the near side. Q/E move scenes place the fighter directly and skip
    // platform collision, so a lunge at a foe behind the door would otherwise carry them through it.
    _realmStoryGates().forEach(function (g) {
      if (realmSave.flags['gate_' + g.id]) return;
      var edge = g.x - 25;
      if (p.x + p.w > edge) { p.x = edge - p.w; if (p.vx > 0) p.vx = 0; }
      // Enemies too: each stays on the side of the gate it was first seen on.
      minions.forEach(function (m) {
        if (m.health <= 0) return;
        if (!m._realmGateSide) m._realmGateSide = {};
        var side = m._realmGateSide[g.id] || (m._realmGateSide[g.id] = (m._guardX != null ? m._guardX : m.cx()) > g.x ? 1 : -1);
        if (side > 0 && m.x < g.x + 25) { m.x = g.x + 25; if (m.vx < 0) m.vx = 0; }
        else if (side < 0 && m.x + m.w > edge) { m.x = edge - m.w; if (m.vx > 0) m.vx = 0; }
      });
    });
    _realmNear = _realmStoryFindNear(p);
    return;
  }

  // Death: the game respawns P1 in place. Realm mode moves them to the last checkpoint door; a story side
  // room sends them back out to the chapter world at the door they came in by.
  if (p.health <= 0) { _realmDead = true; _realmNear = null; return; }
  if (_realmDead) {
    _realmDead = false;
    if (realmHost === 'story') _realmStoryReturn(_realmStoryFrom);
    else _realmEnterRoom(realmSave.checkpoint.room, realmSave.checkpoint.door);
    realmFade = -REALM_FADE_F;
    return;
  }

  var R = _realmRoom();
  var feet = p.y + p.h;
  for (var i = 0; i < (R.doors || []).length; i++) {
    var d = R.doors[i];
    if (!d.to) continue;
    if (d.kind === 'edge') {
      var out = d.side === 'l' ? p.x <= REALM_EDGE_ZONE : p.x + p.w >= R.w - REALM_EDGE_ZONE;
      if (out) {
        var shut = _realmDoorShut(d);
        if (!shut) { _realmGo(d.to); return; }
        p.x = d.side === 'l' ? REALM_EDGE_ZONE + 2 : R.w - REALM_EDGE_ZONE - p.w - 2;
        if (frameCount - _realmSealNag > 150) { _realmSealNag = frameCount; _realmTell(shut, '#ff7766'); }
      }
    } else if (d.kind === 'drop') {
      if (feet > REALM_FLOOR_Y + 60 && p.cx() > d.x0 && p.cx() < d.x1) { _realmGo(d.to); return; }
    }
  }
  _realmRoomFoesTick(R);
  _realmChargeTick(R);
  _realmNear = _realmFindNear(p);

  // The shopkeeper speaks once each time you come into his room and walk near him.
  if (_realmSay && ++_realmSay.t > 260) _realmSay = null;
  (R.npcs || []).forEach(function (n) {
    if (_realmSaidIn === realmRoomKey || Math.abs(p.cx() - n.x) > 260) return;
    _realmSaidIn = realmRoomKey;
    _realmSay = { npc: n, text: REALM_SHOP_LINES[_realmSayIdx++ % REALM_SHOP_LINES.length], t: 0 };
  });
  _realmShopTick(p, R);
  _realmPuzzleTick(p, R);
}

// A swing or Q started next to the shopkeeper, facing him, counts as hitting him.
function _realmShopTick(p, R) {
  var n = (R.npcs || []).find(function (q) { return q.kind === 'shop'; });
  var atk = p.attackTimer || 0, abil = p.abilityCooldown || 0;
  // attackTimer counts down; a new swing resets it upward, even when swings chain with no frame at 0.
  var started = (atk > _realmPrevAtk) || (abil > _realmPrevAbil + 1);
  _realmPrevAtk = atk; _realmPrevAbil = abil;
  _realmStarted = started;
  if (!n) return;
  if (_realmShopKill > 0) {
    _realmShopKill--;
    p.shielding = false;
    // The lantern is out by now. Damage with no attacker is capped at 14 a frame, so it runs until he is done.
    if (_realmShopKill < REALM_SHOP_KILL_F / 2 && p.health > 0 && typeof dealDamage === 'function') {
      // Each hit grants i-frames; his blows land through them.
      p.invincible = 0;
      dealDamage(null, p, 14, 0, 1, false, 0);
    }
    if (p.health <= 0) { _realmShopKill = 0; _realmShopHits = 0; }
    return;
  }
  var dx = n.x - p.cx();
  if (!started || Math.abs(dx) > 100 || (Math.abs(dx) > 24 && Math.sign(dx) !== p.facing)) return;
  _realmShopHits++;
  if (typeof spawnParticles === 'function') spawnParticles(n.x, REALM_FLOOR_Y - 90, '#7a66b8', 10);
  if (_realmShopHits <= REALM_SHOP_WARN.length) {
    _realmSay = { npc: n, text: REALM_SHOP_WARN[_realmShopHits - 1], t: 0, warn: true };
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 4);
    return;
  }
  _realmSay = { npc: n, text: REALM_SHOP_KILL_LINE, t: 0, warn: true };
  _realmShopKill = REALM_SHOP_KILL_F;
}

// Camera: follow P1, held inside the room so the view never shows past its walls.
function _realmCamX(x, zoom) {
  var R = _realmRoom();
  var half = GAME_W / (2 * zoom);
  if (!R || R.w <= half * 2) return R ? R.w / 2 : x;
  return Math.max(half, Math.min(R.w - half, x));
}
function _realmCamY(y, zoom) {
  var half = GAME_H / (2 * zoom);
  return Math.min(REALM_FLOOR_Y + 70 - half, y - 70);
}
function realmCameraTarget(p, zoom) {
  return { x: _realmCamX(p.cx() + p.facing * 40, zoom), y: _realmCamY(p.cy(), zoom) };
}

// Draw: world space, behind the platforms.
// Story: the attached chapter stops owning the screen as soon as the next chapter starts loading.
function _realmStaleStory() {
  return realmHost === 'story' && typeof _activeStory2Chapter !== 'undefined' &&
    (!_activeStory2Chapter || _activeStory2Chapter.id !== _realmStoryChId);
}

function drawRealmBack() {
  if (!realmActive || _realmStaleStory()) return;
  if (realmHost === 'story' && !realmRoomKey) { _realmStoryDrawMain(); return; }
  var R = _realmRoom();
  if (!R) return;
  ctx.save();
  // Underground rooms reuse the theme backdrop, dimmed, so they read as below the rooms above them.
  if (R.dark) {
    ctx.fillStyle = 'rgba(4,2,1,' + R.dark + ')';
    ctx.fillRect(-400, REALM_FLOOR_Y - 1400, R.w + 800, 1400);
  }
  if (R.back) {
    // Background rooms are interiors: a back wall of stone courses.
    var top = REALM_FLOOR_Y - 1400;
    ctx.fillStyle = R.wall || '#2a1d13';
    ctx.fillRect(-200, top, R.w + 400, 1400);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    for (var cy = REALM_FLOOR_Y - 40; cy > top; cy -= 40) {
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(R.w, cy); ctx.stroke();
      var off = ((REALM_FLOOR_Y - cy) / 40) % 2 ? 0 : 45;
      for (var bx = off; bx < R.w; bx += 90) { ctx.beginPath(); ctx.moveTo(bx, cy); ctx.lineTo(bx, cy + 40); ctx.stroke(); }
    }
  }
  // Holes in the floor: dark shafts, so a gap reads as a way down rather than missing art.
  var segs = (R.floor || [[0, R.w]]).slice().sort(function (a, b) { return a[0] - b[0]; });
  // A drop door glows faintly from the room below; a plain pit is black with spikes just under the lip.
  for (var i = 0; i + 1 < segs.length; i++) {
    var x0 = segs[i][1], x1 = segs[i + 1][0];
    var isDrop = (R.doors || []).some(function (d) { return d.kind === 'drop' && d.x0 < x1 && d.x1 > x0; });
    var g = ctx.createLinearGradient(0, REALM_FLOOR_Y, 0, REALM_FLOOR_Y + REALM_FLOOR_H);
    if (isDrop) { g.addColorStop(0, '#120a06'); g.addColorStop(1, '#4a3018'); }
    else        { g.addColorStop(0, '#0a0503'); g.addColorStop(1, '#000000'); }
    ctx.fillStyle = g;
    ctx.fillRect(x0, REALM_FLOOR_Y, x1 - x0, REALM_FLOOR_H + 200);
    if (!isDrop) {
      ctx.fillStyle = '#6b5a48';
      for (var sx = x0 + 4; sx + 16 <= x1; sx += 18) {
        ctx.beginPath();
        ctx.moveTo(sx, REALM_FLOOR_Y + 64); ctx.lineTo(sx + 8, REALM_FLOOR_Y + 30); ctx.lineTo(sx + 16, REALM_FLOOR_Y + 64);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  (R.doors || []).forEach(function (d) { if (d.kind === 'arch') _realmDrawArch(d); });
  ctx.restore();
}

function _realmDrawArch(d) {
  var f = typeof frameCount !== 'undefined' ? frameCount : 0;
  var x = d.x, y = d.y || REALM_FLOOR_Y;
  var w = REALM_ARCH_W, h = REALM_ARCH_H;
  var lit = realmSave && realmSave.checkpoint && realmSave.checkpoint.room === realmRoomKey && realmSave.checkpoint.door === d.id;
  if (d.art === 'ladder') {
    ctx.fillStyle = '#0c0705';
    ctx.fillRect(x - 34, y - 420, 68, 420);
    ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 22, y - 420); ctx.moveTo(x + 22, y); ctx.lineTo(x + 22, y - 420); ctx.stroke();
    ctx.lineWidth = 4;
    for (var ry = y - 20; ry > y - 420; ry -= 34) { ctx.beginPath(); ctx.moveTo(x - 22, ry); ctx.lineTo(x + 22, ry); ctx.stroke(); }
    return;
  }
  if (d.art === 'labdoor') {
    // Facility door: steel frame, dark doorway, a status light (red while it will not open).
    ctx.fillStyle = '#1e2426';
    ctx.fillRect(x - 50, y - 152, 100, 152);
    ctx.fillStyle = '#050708';
    ctx.fillRect(x - 38, y - 140, 76, 140);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x - 38, y - 140, 76, 6);
    ctx.fillStyle = d._locked ? '#ff4433' : '#44ff99';
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(f * 0.08);
    ctx.beginPath(); ctx.arc(x, y - 162, 5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  if (d.art === 'hatch' && d._closed) {
    // A floor hatch bolted shut from below.
    ctx.fillStyle = '#3a4044';
    ctx.fillRect(x - 32, y - 6, 64, 8);
    ctx.fillStyle = '#1a1e20';
    for (var bk = -24; bk <= 24; bk += 16) ctx.fillRect(x + bk - 2, y - 5, 4, 4);
    return;
  }
  if (d.art === 'hatch') {
    // The top of a ladder down, through a hole in the floor.
    ctx.fillStyle = '#0c0705';
    ctx.fillRect(x - 30, y - 4, 60, 8);
    ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 22, y - 56); ctx.moveTo(x + 22, y); ctx.lineTo(x + 22, y - 56); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x - 22, y - 22); ctx.lineTo(x + 22, y - 22); ctx.moveTo(x - 22, y - 50); ctx.lineTo(x + 22, y - 50); ctx.stroke();
    return;
  }
  // Stone frame with a dark doorway; the inner glow says whether it is your checkpoint.
  ctx.fillStyle = '#5a4432';
  ctx.fillRect(x - w / 2 - 14, y - h - 22, w + 28, h + 22);
  ctx.fillStyle = '#0a0604';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2, y - h + w / 2);
  ctx.arc(x, y - h + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  ctx.fill();
  if (d.checkpoint) {
    var pulse = 0.5 + 0.5 * Math.sin(f * 0.06);
    ctx.fillStyle = lit ? 'rgba(255,200,110,' + (0.35 + 0.35 * pulse) + ')' : 'rgba(140,110,80,0.35)';
    ctx.beginPath(); ctx.arc(x, y - h - 4, 8, 0, Math.PI * 2); ctx.fill();
  }
}

// Draw: world space, over the platforms (chests, F prompts).
function drawRealmWorld() {
  if (!realmActive || _realmStaleStory()) return;
  _realmView = (typeof ctx.getTransform === 'function') ? ctx.getTransform() : null;
  if (realmHost === 'story' && !realmRoomKey) { _realmStoryDrawPrompt(); return; }
  var R = _realmRoom();
  if (!R) return;
  ctx.save();
  _realmDrawPuzzle(R);
  (R.chests || []).forEach(function (c) {
    var open = _realmLooted(c.id);
    var x = c.x, y = c.y || REALM_FLOOR_Y;
    if (c.gives && c.gives.indexOf('item:') === 0) {
      // A key item rests on a small stand and glows until taken.
      ctx.fillStyle = '#2a3236';
      ctx.fillRect(x - 12, y - 30, 24, 30);
      if (!open) {
        var gl = 0.6 + 0.4 * Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.09);
        ctx.fillStyle = 'rgba(255,214,120,' + (0.25 * gl) + ')';
        ctx.beginPath(); ctx.arc(x, y - 44, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8c86a';
        ctx.fillRect(x - 9, y - 50, 18, 12);
        ctx.fillStyle = '#5a4420';
        ctx.fillRect(x - 5, y - 46, 10, 3);
      }
      return;
    }
    ctx.fillStyle = '#3b2412';
    ctx.fillRect(x - 22, y - 26, 44, 26);
    ctx.fillStyle = open ? '#1a0f07' : '#c9a24a';
    ctx.fillRect(x - 22, y - 26, 44, 4);
    if (open) {
      ctx.fillStyle = '#3b2412';
      ctx.fillRect(x - 22, y - 40, 44, 6);
    } else {
      ctx.fillStyle = '#5a3a1c';
      ctx.fillRect(x - 24, y - 36, 48, 12);
      ctx.fillStyle = '#ffd27a';
      ctx.fillRect(x - 4, y - 28, 8, 8);
    }
  });
  var p = players[0];
  (R.burn || []).forEach(function (b) { _realmDrawBurnTarget(b); });
  (R.npcs || []).forEach(function (n) { _realmDrawShopkeeper(n, p); });
  if (_realmSay) {
    var a = _realmSay.t < 20 ? _realmSay.t / 20 : _realmSay.t > 230 ? (260 - _realmSay.t) / 30 : 1;
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = 'italic 14px Georgia, serif'; ctx.textAlign = 'center';
    var tw = ctx.measureText(_realmSay.text).width;
    var sx = Math.max(tw / 2 + 12, Math.min(R.w - tw / 2 - 12, _realmSay.npc.x));
    ctx.fillStyle = 'rgba(8,6,12,0.72)';
    ctx.fillRect(sx - tw / 2 - 10, REALM_FLOOR_Y - 214, tw + 20, 26);
    ctx.fillStyle = _realmSay.warn ? '#ff9a8a' : '#e9ddff';
    ctx.fillText(_realmSay.text, sx, REALM_FLOOR_Y - 196);
    ctx.globalAlpha = 1;
  }
  if (_realmNear && p && p.health > 0 && realmFade === 0) {
    var n = _realmNear.ref;
    var ny = n.y || REALM_FLOOR_Y;
    if (_realmNear.kind === 'npc') ny = REALM_FLOOR_Y;
    var isItem = _realmNear.kind === 'chest' && n.gives && n.gives.indexOf('item:') === 0;
    var py = _realmNear.kind === 'npc' ? ny - 168 : isItem ? ny - 84 : _realmNear.kind === 'chest' ? ny - 54 : n.art === 'hatch' ? ny - 80 : n.art === 'ladder' ? ny - 130 : ny - REALM_ARCH_H - 34;
    if (_realmNear.kind === 'burn') { ny = REALM_FLOOR_Y; py = ny - 190; }
    if (_realmNear.kind === 'lever') py = ny - 90;
    if (_realmNear.kind === 'torch') py = ny - 120;
    var verb = _realmNear.kind === 'burn' ? 'Burn' : _realmNear.kind === 'lever' ? 'Pull' : _realmNear.kind === 'torch' ? 'Light' : _realmNear.kind === 'npc' ? 'Trade' : isItem ? 'Take' : _realmNear.kind === 'chest' ? 'Open' : (n.art === 'ladder' || n.art === 'hatch') ? 'Climb' : 'Enter';
    ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(n.x - 34, py - 14, 68, 20);
    ctx.fillStyle = '#ffd27a';
    ctx.fillText('F  ' + verb, n.x, py);
  }
  ctx.restore();
}

// Trial-wing machines. Burned ones stay as black frames with fire along them; a planted charge blinks on the base.
function _realmDrawBurnTarget(b) {
  var f = typeof frameCount !== 'undefined' ? frameCount : 0;
  var x = b.x, g = REALM_FLOOR_Y;
  var burned = realmSave && realmSave.flags['burn_' + b.id];
  var body = burned ? '#141010' : '#2c3438', edge = burned ? '#3a2018' : '#5a6a70';
  ctx.save();
  if (b.art === 'columns') {
    for (var k = -1; k <= 1; k++) {
      var cx = x + k * 70;
      ctx.fillStyle = body; ctx.fillRect(cx - 24, g - 20, 48, 20); ctx.fillRect(cx - 24, g - 230, 48, 16);
      ctx.fillStyle = burned ? 'rgba(40,20,10,0.6)' : 'rgba(120,220,200,0.28)';
      ctx.fillRect(cx - 18, g - 214, 36, 194);
      ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.strokeRect(cx - 18, g - 214, 36, 194);
    }
  } else if (b.art === 'rig') {
    ctx.fillStyle = body; ctx.fillRect(x - 90, g - 200, 14, 200); ctx.fillRect(x + 76, g - 200, 14, 200); ctx.fillRect(x - 90, g - 210, 180, 16);
    ctx.strokeStyle = edge; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x - 76, g - 150); ctx.lineTo(x - 20, g - 110); ctx.moveTo(x + 76, g - 150); ctx.lineTo(x + 20, g - 110); ctx.stroke();
    ctx.fillStyle = body; ctx.fillRect(x - 30, g - 24, 60, 24);
  } else if (b.art === 'core') {
    ctx.fillStyle = body; ctx.fillRect(x - 60, g - 260, 120, 260);
    for (var row = 0; row < 10; row++) {
      ctx.fillStyle = burned ? '#2a1a12' : ((row + Math.floor(f / 8)) % 3 ? '#2a6a8a' : '#7fd8ff');
      ctx.fillRect(x - 46, g - 244 + row * 24, 92, 10);
    }
  } else {
    ctx.fillStyle = body; ctx.fillRect(x - 70, g - 70, 140, 70); ctx.fillRect(x - 50, g - 150, 100, 70);
    ctx.fillStyle = burned ? '#1a1210' : '#3a9a7a'; ctx.fillRect(x - 42, g - 142, 84, 54);
  }
  if (burned) {
    for (var i = 0; i < 6; i++) {
      var fx = x - 60 + i * 24, fl = 18 + 14 * Math.sin(f * 0.21 + i * 1.7);
      ctx.fillStyle = 'rgba(255,' + (120 + (i * 23) % 80) + ',40,' + (0.55 + 0.25 * Math.sin(f * 0.3 + i)) + ')';
      ctx.beginPath(); ctx.moveTo(fx - 8, g); ctx.quadraticCurveTo(fx, g - fl * 2, fx + 8, g); ctx.fill();
    }
    var glow = ctx.createRadialGradient(x, g - 60, 10, x, g - 60, 220);
    glow.addColorStop(0, 'rgba(255,120,40,0.18)'); glow.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - 220, g - 280, 440, 300);
  }
  if (_realmCharge && _realmCharge.id === b.id && _realmCharge.room === realmRoomKey) {
    var on = Math.floor(_realmCharge.t / (_realmCharge.t < 40 ? 4 : 10)) % 2 === 0;
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x - 10, g - 14, 20, 14);
    ctx.fillStyle = on ? '#ff3322' : '#551510';
    ctx.beginPath(); ctx.arc(x, g - 18, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// The shopkeeper: a tall hooded shape with no body to speak of, two pale eyes, and a lantern on a staff.
// He turns to face you and sways a little; the lantern is the only warm light on him.
function _realmDrawShopkeeper(n, p) {
  var f = typeof frameCount !== 'undefined' ? frameCount : 0;
  var x = n.x, g = REALM_FLOOR_Y;
  var face = p && p.cx() < x ? -1 : 1;
  var sway = Math.sin(f * 0.025) * 2.5;
  var flick = 0.75 + 0.25 * Math.sin(f * 0.31) * Math.sin(f * 0.17);
  if (_realmShopKill > 0) flick *= Math.max(0, (_realmShopKill - REALM_SHOP_KILL_F / 2) / (REALM_SHOP_KILL_F / 2));
  ctx.save();
  // Lantern glow on the ground and the cloak.
  var lx = x + face * 30 + sway, ly = g - 96;
  var lg = ctx.createRadialGradient(lx, ly, 2, lx, ly, 120);
  lg.addColorStop(0, 'rgba(255,190,110,' + (0.30 * flick) + ')');
  lg.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(lx - 120, ly - 120, 240, 240);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(x, g + 1, 34, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Cloak: a long tapering robe, hem ragged.
  ctx.translate(x, g);
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  for (var i = 0; i <= 6; i++) ctx.lineTo(-26 + i * (52 / 6), (i % 2 ? -5 : 0) + Math.sin(f * 0.05 + i) * 1.5);
  ctx.lineTo(16 + sway * 0.6, -96);
  ctx.quadraticCurveTo(14 + sway, -140, sway, -146);
  ctx.quadraticCurveTo(-14 + sway, -140, -16 + sway * 0.6, -96);
  ctx.closePath();
  ctx.fillStyle = '#07060b';
  ctx.fill();
  ctx.strokeStyle = 'rgba(190,170,255,0.55)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Hood opening: darker than the cloak, with the eyes inside.
  ctx.beginPath();
  ctx.ellipse(sway + face * 3, -126, 8, 11, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();
  ctx.fillStyle = 'rgba(220,210,255,' + (0.75 + 0.25 * Math.sin(f * 0.04)) + ')';
  ctx.beginPath(); ctx.arc(sway + face * 3 - 3, -128, 1.6, 0, Math.PI * 2); ctx.arc(sway + face * 3 + 3, -128, 1.6, 0, Math.PI * 2); ctx.fill();
  // Staff and lantern.
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(face * 24, 0); ctx.lineTo(face * 30 + sway, -118); ctx.stroke();
  ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(face * 30 + sway, -118); ctx.lineTo(face * 30 + sway, -104); ctx.stroke();
  ctx.fillStyle = 'rgba(255,200,120,' + flick + ')';
  ctx.fillRect(face * 30 + sway - 5, -104, 10, 13);
  ctx.strokeStyle = '#2a2018';
  ctx.strokeRect(face * 30 + sway - 5, -104, 10, 13);
  ctx.restore();
}

// Draw: screen space, over everything.
function drawRealmHUD() {
  if (!realmActive || !gameRunning) return;
  var R = _realmRoom();
  ctx.save();
  ctx.setTransform(canvas.width / GAME_W, 0, 0, canvas.height / GAME_H, 0, 0);
  if (realmHost === 'story') { _realmDrawFadeAndBanner(R); ctx.restore(); return; }
  if (!R) { ctx.restore(); return; }

  // Minimap: one box per visited room on the realm grid, the current one lit.
  var def = _realmDef(), S = 18, G = 4;
  var keys = Object.keys(def.rooms);
  var minX = Infinity, maxX = -Infinity, minY = Infinity;
  keys.forEach(function (k) { var r = def.rooms[k]; minX = Math.min(minX, r.gx); maxX = Math.max(maxX, r.gx); minY = Math.min(minY, r.gy); });
  var ox = GAME_W - 18 - (maxX - minX + 1) * (S + G), oy = 58;
  keys.forEach(function (k) {
    if (!realmSave.visited[k]) return;
    var r = def.rooms[k];
    var x = ox + (r.gx - minX) * (S + G), y = oy + (r.gy - minY) * (S + G);
    ctx.fillStyle = k === realmRoomKey ? '#ffd27a' : 'rgba(255,210,122,0.25)';
    ctx.fillRect(x, y, S, S);
    ctx.strokeStyle = 'rgba(255,210,122,0.8)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, S - 1, S - 1);
  });
  ctx.font = 'bold 12px Arial'; ctx.textAlign = 'right'; ctx.fillStyle = '#ffd27a';
  ctx.fillText(R.name, GAME_W - 18, oy - 8);

  if (realmBanner > 0) {
    ctx.globalAlpha = realmBanner > 120 ? (150 - realmBanner) / 30 : Math.min(1, realmBanner / 30);
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px Arial';
    ctx.fillStyle = '#fff1d6';
    ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 14;
    ctx.fillText(R.name.toUpperCase(), GAME_W / 2, GAME_H * 0.3);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = '#e6cfa6';
    ctx.fillText(def.name, GAME_W / 2, GAME_H * 0.3 + 24);
    ctx.globalAlpha = 1;
  }

  _realmDrawShopDark();
  if (realmFade !== 0) {
    var fa = realmFade > 0 ? 1 - realmFade / REALM_FADE_F : -realmFade / REALM_FADE_F;
    ctx.globalAlpha = Math.max(0, Math.min(1, fa));
    ctx.fillStyle = '#050302';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ── Story host ──────────────────────────────────────────────────────────────────────────────────────────────

function realmInSideRoom() { return realmActive && realmHost === 'story' && !!realmRoomKey; }

function _realmStoryDefFor(chId) {
  for (var k in REALM_STORY) if (REALM_STORY[k].chapters.indexOf(chId) >= 0) return k;
  return null;
}
function _realmStoryEntrances() {
  var d = REALM_STORY[realmKey];
  return d ? (d.entrances || []).filter(function (e) { return e.ch === _realmStoryChId; }) : [];
}
function _realmStoryGates() {
  var d = REALM_STORY[realmKey];
  return d ? (d.gates || []).filter(function (g) { return g.ch === _realmStoryChId; }) : [];
}

// Top of the chapter world's floor at x (authored floors step up and down).
function _realmMainFloorY(x) {
  var best = null;
  ((currentArena && currentArena.platforms) || []).forEach(function (pl) {
    if (!pl.isFloor || x < pl.x || x > pl.x + pl.w) return;
    if (best === null || pl.y < best) best = pl.y;
  });
  return best === null ? 440 : best;
}

function _realmTell(text, color) {
  if (typeof storyFightSubtitle === 'undefined' || !text) return;
  storyFightSubtitle = { text: text, timer: 180, maxTimer: 180, color: color || '#ffd27a' };
}

// Each chapter launch builds a new world, so the realm re-attaches whenever the world object changes.
function _realmStoryAttach() {
  if (realmRoomKey || realmFade !== 0) return;
  var ch = (typeof _activeStory2Chapter !== 'undefined') ? _activeStory2Chapter : null;
  var live = typeof exploreActive !== 'undefined' && exploreActive;
  var key = ch && live ? _realmStoryDefFor(ch.id) : null;
  if (!key) { if (realmHost === 'story') realmResetState(); return; }
  if (realmHost === 'story' && realmActive && _realmStoryArena === currentArena && _realmStoryChId === ch.id) return;
  realmHost = 'story';
  realmKey = key;
  realmSave = _realmLoad();
  realmActive = true;
  realmFade = 0; realmPending = null; _realmDead = false; _realmNear = null; _realmStash = null;
  _realmStoryArena = currentArena;
  _realmStoryChId = ch.id;
  // Closed gates are walls. 50 wide: pickSafeSpawn only spawns on ledges wider than 50.
  var plats = currentArena.platforms;
  _realmStoryGates().forEach(function (g) {
    if (realmSave.flags['gate_' + g.id] || plats.some(function (pl) { return pl._realmGate === g.id; })) return;
    var fy = Math.max(_realmMainFloorY(g.x - 40), _realmMainFloorY(g.x + 40));
    plats.push({ x: g.x - 25, y: -600, w: 50, h: 600 + fy, noDraw: true, _realmGate: g.id });
  });
  if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();
}

// Level minimap (drawExploreMinimap): realm doors once the player has come near one, and closed gates.
// done = the room behind the door has been visited.
function realmMinimapMarks() {
  if (!realmActive || realmHost !== 'story' || realmRoomKey || !realmSave || _realmStaleStory()) return [];
  var p = players[0], out = [];
  _realmStoryEntrances().forEach(function (e) {
    if (e.oneWay && !realmSave.flags['open_' + e.id]) return;
    if (!realmSave.flags['seen_' + e.id] && p && Math.abs(p.cx() - e.x) < 420) {
      realmSave.flags['seen_' + e.id] = true;
      _realmStore();
    }
    if (!realmSave.flags['seen_' + e.id]) return;
    out.push({ kind: 'door', x: e.x, y: _realmMainFloorY(e.x), done: !!realmSave.visited[e.room] });
  });
  _realmStoryGates().forEach(function (g) {
    if (!realmSave.flags['gate_' + g.id]) out.push({ kind: 'gate', x: g.x, y: _realmMainFloorY(g.x - 40) });
  });
  return out;
}

// dealDamage asks this: no hit crosses a closed gate, either way.
function realmBlocksHit(a, t) {
  if (!realmActive || realmHost !== 'story' || realmRoomKey || !realmSave || !a || !t || !a.cx || !t.cx) return false;
  return _realmStoryGates().some(function (g) {
    return !realmSave.flags['gate_' + g.id] && (a.cx() > g.x) !== (t.cx() > g.x);
  });
}

// Spawns that would land behind a closed gate come in on the player's side of it instead.
function realmClampSpawnX(x, p) {
  if (!realmActive || realmHost !== 'story' || realmRoomKey || !p) return x;
  _realmStoryGates().forEach(function (g) {
    if (realmSave.flags['gate_' + g.id] || p.cx() > g.x) return;
    if (x > g.x - 60) x = g.x - 90;
  });
  return x;
}

function _realmStoryThreat(p) {
  if (typeof exploreArenaLock !== 'undefined' && exploreArenaLock) return true;
  return minions.some(function (m) {
    if (m.health <= 0 || Math.abs(m.cx() - p.cx()) > 520 || realmBlocksHit(m, p)) return false;
    return typeof isHostileTarget === 'function' ? isHostileTarget(p, m) : true;
  });
}

function _realmStoryFindNear(p) {
  var feet = p.y + p.h, best = null, bestD = REALM_REACH;
  _realmStoryEntrances().forEach(function (e) {
    var d = Math.abs(p.cx() - e.x);
    if (d < bestD && Math.abs(feet - _realmMainFloorY(e.x)) < 30) { best = { kind: 'entrance', ref: e }; bestD = d; }
  });
  _realmStoryGates().forEach(function (g) {
    if (realmSave.flags['gate_' + g.id] || g.termX == null) return;
    var d = Math.abs(p.cx() - g.termX);
    if (d < bestD && Math.abs(feet - _realmMainFloorY(g.termX)) < 30) { best = { kind: 'terminal', ref: g }; bestD = d; }
  });
  return best;
}

function _realmStoryInteract(p) {
  var n = _realmNear;
  if (n.kind === 'entrance') {
    var e = n.ref;
    if (e.needs && !realmSave.flags[e.needs]) { _realmTell(e.lockedText, '#ff7766'); return true; }
    if (e.oneWay && !realmSave.flags['open_' + e.id]) { _realmTell(e.lockedText, '#ff7766'); return true; }
    if (_realmStoryThreat(p)) { _realmTell('Not with enemies this close.', '#ff7766'); return true; }
    _realmStoryFrom = e.id;
    _realmGo([e.room, e.door]);
    return true;
  }
  if (n.kind === 'terminal') {
    var g = n.ref;
    if (realmSave.items[g.needs]) {
      realmSave.flags['gate_' + g.id] = true;
      _realmStore();
      var plats = currentArena.platforms;
      for (var i = plats.length - 1; i >= 0; i--) if (plats[i]._realmGate === g.id) plats.splice(i, 1);
      if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();
      if (typeof spawnParticles === 'function') spawnParticles(g.x, _realmMainFloorY(g.x) - 120, '#ffd27a', 30);
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 14);
      _realmTell(g.opened, '#88ffcc');
    } else if (g.setsFlag && !realmSave.flags[g.setsFlag]) {
      realmSave.flags[g.setsFlag] = true;
      _realmStore();
      _realmTell(g.deniedFirst, '#ff9966');
      // Rerouting power wakes the corridor behind you, so the walk back is not the walk you made.
      if (typeof _exploreSpawnEnemy === 'function') {
        (g.alarm || []).forEach(function (a) {
          _exploreSpawnEnemy({ wx: a.x, exactX: a.x, name: a.name, weaponKey: a.weaponKey, classKey: a.classKey,
            aiDiff: a.aiDiff, color: a.color }, p);
        });
      }
    } else {
      _realmTell(g.denied, '#ff9966');
    }
    return true;
  }
  return false;
}

function _realmStoryEnterRoom(roomKey, doorId) {
  var R = _realmRoom(roomKey);
  var p = players[0];
  if (!R || !p) return;
  if (!realmRoomKey) {
    _realmStash = { arena: currentArena, minions: minions.splice(0), projectiles: projectiles, spawnX: p.spawnX, spawnY: p.spawnY };
  } else {
    minions.length = 0;   // the room you left was clear, or its door would not have opened
  }
  projectiles = [];
  _realmCharge = null;
  _realmFoesRoom = null;
  realmRoomKey = roomKey;
  ARENAS.__realmroom__ = realmMakeArena(roomKey);
  currentArena = ARENAS.__realmroom__;
  _realmPuzzleReset(roomKey);
  if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();
  var door = (R.doors || []).find(function (d) { return d.id === doorId; }) || R.doors[0];
  var a = _realmArrival(R, door);
  p.x = a.x - p.w / 2; p.y = a.y - p.h; p.vx = 0; p.vy = 0;
  p.facing = a.facing;
  p.spawnX = a.x; p.spawnY = REALM_FLOOR_Y;
  if (typeof camXCur !== 'undefined') {
    camXCur = camXTarget = _realmCamX(p.cx(), 1);
    camYCur = camYTarget = _realmCamY(p.cy(), 1);
  }
  realmSave.visited[roomKey] = true;
  _realmSaidIn = null; _realmSay = null;
  _realmShopHits = 0; _realmShopKill = 0;
  realmBanner = 120;
  _realmStore();
  if (R.say && !realmSave.flags['said_' + roomKey]) {
    realmSave.flags['said_' + roomKey] = true;
    _realmTell(R.say, '#aaddff');
  }
  _realmSpawnRoomFoes(roomKey, R, p);
}

// Room enemies come back until the room is cleared once; a cleared room stays clear.
function _realmSpawnRoomFoes(roomKey, R, p) {
  if (!R.foes || !R.foes.length || realmSave.flags['clear_' + roomKey] || typeof _exploreSpawnEnemy !== 'function') return;
  R.foes.forEach(function (f) {
    _exploreSpawnEnemy({ wx: f.x, exactX: f.x, name: f.name, weaponKey: f.weaponKey, classKey: f.classKey,
      aiDiff: f.aiDiff, color: f.color, health: f.health, armor: f.armor, isElite: !!f.health }, p);
    var m = minions[minions.length - 1];
    if (m) { m._realmRoom = roomKey; m._aiHoldUntil = frameCount + 60; }
  });
  _realmFoesRoom = roomKey;
}

function _realmRoomFoesAlive() {
  if (!realmRoomKey) return false;
  return minions.some(function (m) { return m._realmRoom === realmRoomKey && m.health > 0; });
}

function _realmRoomFoesTick(R) {
  if (!R.foes || !R.foes.length || realmSave.flags['clear_' + realmRoomKey]) return;
  if (_realmFoesRoom !== realmRoomKey || _realmRoomFoesAlive()) return;
  _realmFoesRoom = null;
  realmSave.flags['clear_' + realmRoomKey] = true;
  _realmStore();
  var b = (R.burn || [])[0];
  _realmTell(b && !realmSave.flags['burn_' + b.id] ? 'Room clear. Plant the charge.' : 'Room clear.', '#88ffcc');
}

// Why a door will not open, or null. Live enemies seal every door in the room.
function _realmDoorShut(d) {
  if (_realmRoomFoesAlive()) return 'Sealed. Not with enemies still standing.';
  if (d.needs && !realmSave.flags[d.needs]) return d.needs.indexOf('burn_') === 0 ? 'Sealed. Burn this room first.' : (d.lockedText || 'Sealed.');
  return null;
}

function _realmPlantCharge(b) {
  if (_realmCharge || realmSave.flags['burn_' + b.id]) return;
  _realmCharge = { room: realmRoomKey, id: b.id, t: REALM_CHARGE_F };
  _realmTell('Charge set. Get clear.', '#ffb070');
}

function _realmChargeTick(R) {
  if (!_realmCharge || _realmCharge.room !== realmRoomKey) return;
  if (--_realmCharge.t > 0) return;
  var b = (R.burn || []).find(function (q) { return q.id === _realmCharge.id; });
  _realmCharge = null;
  if (!b) return;
  realmSave.flags['burn_' + b.id] = true;
  _realmStore();
  if (typeof spawnParticles === 'function') {
    spawnParticles(b.x, REALM_FLOOR_Y - 80, '#ff8a2a', 40);
    spawnParticles(b.x, REALM_FLOOR_Y - 120, '#ffd27a', 24);
    spawnParticles(b.x, REALM_FLOOR_Y - 60, '#3a2a20', 30);
  }
  if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 16);
  _realmTell(b.line, '#ffb070');
  // Each burn is a breather: a third of your health back, the dungeon's health stone.
  var p = players[0];
  if (p && p.health > 0) {
    var heal = Math.round(p.maxHealth * 0.35);
    p.health = Math.min(p.maxHealth, p.health + heal);
    if (typeof DamageText !== 'undefined') damageTexts.push(new DamageText(p.cx(), p.y - 30, '+' + heal, '#44ff88'));
  }
}

// ── Puzzle parts ────────────────────────────────────────────────────────────────────────────────────────────
// Room state that resets on entry (block positions, timed plates, bar travel, crack damage). What is solved for
// good lives in realmSave.flags: plate_<id> (a block latched it), bar_<id> (you got past it), lever_<id>, broke_<id>.

function _realmPuzzleReset(roomKey) {
  _realmPuz = { room: roomKey, plates: {}, barT: {}, crackHits: {}, seated: {}, lift: {}, crumble: {}, spikeCd: 0 };
  var R = _realmRoom(roomKey);
  // A latch plate solved on an earlier visit still holds its block.
  var free = (R.blocks || []).slice();
  (R.plates || []).forEach(function (pt) {
    if (!pt.latch || !realmSave.flags['plate_' + pt.id] || !free.length) return;
    var b = free.shift(), pl = _realmPuzPlat('_realmBlock', b.id);
    if (pl) { pl.x = pt.x - pl.w / 2; _realmPuz.seated[b.id] = true; }
  });
  (R.bars || []).forEach(function (b) {
    if (!_realmBarOpen(b)) return;
    _realmPuz.barT[b.id] = 1;
    var pl = _realmPuzPlat('_realmBar', b.id);
    if (pl) pl.isFloorDisabled = true;
  });
}

function _realmPuzPlat(tag, id) {
  var ps = (currentArena && currentArena.platforms) || [];
  for (var i = 0; i < ps.length; i++) if (ps[i][tag] === id) return ps[i];
  return null;
}

// A bar's or lever's 'when': 'plate:<id>' (held down now, or latched), 'lever:<id>', 'clear' (the room's foes are
// beaten), any save flag, or a list of these (all must hold).
function _realmCond(w) {
  if (!w) return true;
  if (Array.isArray(w)) return w.every(_realmCond);
  if (w === 'clear') { var R = _realmRoom(); return !(R.foes && R.foes.length) || (!!realmSave.flags['clear_' + realmRoomKey] && !_realmRoomFoesAlive()); }
  if (w.indexOf('plate:') === 0) { var id = w.slice(6); return !!realmSave.flags['plate_' + id] || ((_realmPuz && _realmPuz.plates[id]) || 0) > 0; }
  if (w.indexOf('lever:') === 0) return !!realmSave.flags['lever_' + w.slice(6)];
  return !!realmSave.flags[w];
}
function _realmBarOpen(b) { return !!realmSave.flags['bar_' + b.id] || _realmCond(b.when); }

function _realmPuzzleTick(p, R) {
  if (!_realmPuz || _realmPuz.room !== realmRoomKey) _realmPuzzleReset(realmRoomKey);
  var graphDirty = false;

  // Blocks: walk into one and it slides, slower than you walk. Only along the floor; puzzle rooms with blocks
  // have no holes. Anything solid stops it.
  var inv = false;
  (R.blocks || []).forEach(function (b) {
    var pl = _realmPuzPlat('_realmBlock', b.id);
    if (!pl || _realmPuz.seated[b.id] || !p.onGround || p.y + p.h <= pl.y + 6 || p.y >= pl.y + pl.h) return;
    var dir = 0;
    if (keysDown.has(p.controls.right) && Math.abs(p.x + p.w - pl.x) <= 3) dir = 1;
    else if (keysDown.has(p.controls.left) && Math.abs(p.x - (pl.x + pl.w)) <= 3) dir = -1;
    if (!dir) return;
    var nx = Math.max(8, Math.min(R.w - pl.w - 8, pl.x + dir * 2.4));
    var hit = currentArena.platforms.some(function (q) {
      return q !== pl && !q.isFloor && !q.passUnder && !q.isFloorDisabled &&
        nx < q.x + q.w && nx + pl.w > q.x && pl.y < q.y + q.h && pl.y + pl.h > q.y;
    });
    if (hit) {
      // Jammed: pushed flush against something solid, it can't be pulled back. Leaving the room resets it.
      if (!_realmPuz.jamTold) {
        _realmPuz.jamTold = true;
        _realmTell('It won\'t go any further. Step out of the room and it resets.', '#ccbbee');
      }
      return;
    }
    // A latch plate's groove catches a block slid onto it; it stays seated.
    (R.plates || []).forEach(function (pt) {
      if (!pt.latch) return;
      var c0 = pl.x + pl.w / 2, c1 = nx + pl.w / 2;
      if ((c0 - pt.x) * (c1 - pt.x) <= 0) { nx = pt.x - pl.w / 2; _realmPuz.seated[b.id] = true; }
    });
    pl.x = nx;
    p.x = dir > 0 ? pl.x - p.w : pl.x + pl.w;
    if (frameCount % 9 === 0 && typeof spawnParticles === 'function') spawnParticles(pl.x + (dir > 0 ? pl.w : 0), REALM_FLOOR_Y - 4, 'rgba(170,160,190,0.8)', 3);
  });

  // Plates: down while you or a block stand on them. A block latches a latch plate for good; a hold plate stays
  // down that many frames after you step off.
  (R.plates || []).forEach(function (pt) {
    var x0 = pt.x - REALM_PLATE_W / 2, x1 = pt.x + REALM_PLATE_W / 2;
    var byBlock = (R.blocks || []).some(function (b) {
      var pl = _realmPuzPlat('_realmBlock', b.id);
      return pl && pl.x + pl.w / 2 > x0 && pl.x + pl.w / 2 < x1;
    });
    var on = byBlock || (p.onGround && p.health > 0 && p.y + p.h >= REALM_FLOOR_Y - 2 && p.cx() > x0 && p.cx() < x1);
    var was = (_realmPuz.plates[pt.id] || 0) > 0 || !!realmSave.flags['plate_' + pt.id];
    if (on && byBlock && pt.latch && !realmSave.flags['plate_' + pt.id]) {
      realmSave.flags['plate_' + pt.id] = true;
      _realmStore();
    }
    _realmPuz.plates[pt.id] = on ? (pt.hold || 1) : Math.max(0, (_realmPuz.plates[pt.id] || 0) - 1);
    if (!pt.hold && !on) _realmPuz.plates[pt.id] = 0;
    if (on && !was) {
      if (typeof spawnParticles === 'function') spawnParticles(pt.x, REALM_FLOOR_Y - 4, '#7fe0ff', 12);
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 3);
    }
  });

  // Bars rise while their condition holds and stay up once you are past them.
  (R.bars || []).forEach(function (b) {
    var open = _realmBarOpen(b);
    var t = _realmPuz.barT[b.id] || 0;
    t = open ? Math.min(1, t + 0.07) : Math.max(0, t - 0.1);
    _realmPuz.barT[b.id] = t;
    var pl = _realmPuzPlat('_realmBar', b.id);
    var solid = t < 0.5;
    if (pl && !!pl.isFloorDisabled === solid) { pl.isFloorDisabled = !solid; graphDirty = true; }
    if (solid) {
      [p].concat(minions).forEach(function (f) {
        if (!f || f.health <= 0 || f.x + f.w <= b.x - 14 || f.x >= b.x + 14) return;
        f.x = f.cx() < b.x ? b.x - 14 - f.w : b.x + 14;
      });
    }
    if (open && t >= 1 && !realmSave.flags['bar_' + b.id] && p.x > b.x + 30) {
      realmSave.flags['bar_' + b.id] = true;
      _realmStore();
    }
  });

  // Cracked walls: swings and Q started next to one, facing it, chip it until it falls.
  (R.cracks || []).forEach(function (c) {
    if (realmSave.flags['broke_' + c.id] || !_realmStarted) return;
    var dx = c.x - p.cx();
    if (Math.abs(dx) > 110 || Math.sign(dx) !== p.facing) return;
    var n = (_realmPuz.crackHits[c.id] || 0) + 1;
    _realmPuz.crackHits[c.id] = n;
    if (typeof spawnParticles === 'function') spawnParticles(c.x - p.facing * 24, p.cy(), '#8a8098', 10);
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 5);
    if (n < (c.hits || 4)) return;
    realmSave.flags['broke_' + c.id] = true;
    _realmStore();
    var ps = currentArena.platforms;
    for (var i = ps.length - 1; i >= 0; i--) if (ps[i]._realmCrack === c.id) ps.splice(i, 1);
    graphDirty = true;
    if (typeof spawnParticles === 'function') {
      for (var k = 0; k < 4; k++) spawnParticles(c.x, REALM_FLOOR_Y - 60 - k * 70, '#6a6278', 14);
    }
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 14);
    _realmTell('The wall gives way.', '#ccbbee');
  });

  // Lifts: with 'when' they ride up while it holds and sink back when it stops; without one they shuttle,
  // resting at each stop. Riders move with them so a rising lift never drops anyone through.
  (R.lifts || []).forEach(function (l) {
    var pl = _realmPuzPlat('_realmLift', l.id);
    if (!pl) return;
    var st = _realmPuz.lift[l.id] || (_realmPuz.lift[l.id] = { dir: 1, wait: 60 });
    var up = l.when ? _realmCond(l.when) : null;
    var target = up === null ? (st.dir > 0 ? l.y1 : l.y0) : (up ? l.y1 : l.y0);
    if (up === null && st.wait > 0) { st.wait--; return; }
    var dy = Math.max(-1.6, Math.min(1.6, target - pl.y));
    if (Math.abs(target - pl.y) < 0.5) {
      if (up === null) { st.dir = -st.dir; st.wait = 110; }
      return;
    }
    [p].concat(minions).forEach(function (f) {
      if (!f || f.health <= 0 || !f.onGround) return;
      if (Math.abs(f.y + f.h - pl.y) <= 3 && f.x + f.w > pl.x && f.x < pl.x + pl.w) f.y += dy;
    });
    pl.y += dy;
  });

  // Crumbling ledges: standing on one starts it shaking; after REALM_CRUMBLE_F frames it gives way (the platform
  // is disabled, so you drop), and it re-forms later once nobody is inside its outline.
  (R.crumbles || []).forEach(function (c) {
    var pl = _realmPuzPlat('_realmCrumble', c.id);
    if (!pl) return;
    var st = _realmPuz.crumble[c.id] || (_realmPuz.crumble[c.id] = { t: 0, gone: 0 });
    if (st.gone > 0) {
      st.gone--;
      if (st.gone === 0) {
        var blocked = [p].concat(minions).some(function (f) {
          return f && f.health > 0 && f.x + f.w > pl.x && f.x < pl.x + pl.w && f.y < pl.y + pl.h && f.y + f.h > pl.y;
        });
        if (blocked) { st.gone = 20; return; }
        pl.isFloorDisabled = false; graphDirty = true;
        if (typeof spawnParticles === 'function') spawnParticles(pl.x + pl.w / 2, pl.y, 'rgba(200,180,150,0.7)', 6);
      }
      return;
    }
    var on = [p].concat(minions).some(function (f) {
      return f && f.health > 0 && f.onGround && Math.abs(f.y + f.h - pl.y) <= 3 && f.x + f.w > pl.x && f.x < pl.x + pl.w;
    });
    if (on || st.t > 0) st.t++;   // once it starts it keeps going: stepping off doesn't save it
    if (st.t >= REALM_CRUMBLE_F) {
      st.t = 0; st.gone = REALM_CRUMBLE_BACK_F;
      pl.isFloorDisabled = true; graphDirty = true;
      [p].concat(minions).forEach(function (f) {
        if (f && Math.abs(f.y + f.h - pl.y) <= 3 && f.x + f.w > pl.x && f.x < pl.x + pl.w) f.onGround = false;
      });
      if (typeof spawnParticles === 'function') spawnParticles(pl.x + pl.w / 2, pl.y + 8, 'rgba(170,140,110,0.9)', 14);
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 3);
    }
  });

  // Spikes: floor strips [x0, x1] that hurt and bounce you out. dealDamage with no attacker, like a hazard.
  if (_realmPuz.spikeCd > 0) _realmPuz.spikeCd--;
  (R.spikes || []).forEach(function (sp) {
    if (_realmPuz.spikeCd > 0 || p.health <= 0 || p.invincible > 0 || !p.onGround || p.y + p.h < REALM_FLOOR_Y - 2) return;
    if (p.x + p.w < sp[0] + 4 || p.x > sp[1] - 4) return;
    _realmPuz.spikeCd = 40;
    if (typeof dealDamage === 'function') dealDamage(null, p, 12, 0, 1, false, 0);
    p.vy = -11;
    p.onGround = false;
    if (typeof spawnParticles === 'function') spawnParticles(p.cx(), REALM_FLOOR_Y - 6, '#cc4433', 8);
  });

  if (graphDirty && typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();
}

function _realmPullLever(l) {
  if (realmSave.flags['lever_' + l.id]) return;
  if (!_realmCond(l.when)) {
    _realmTell(l.when === 'clear' ? 'It will not move. Not with enemies standing.' : 'It will not move.', '#ff7766');
    return;
  }
  realmSave.flags['lever_' + l.id] = true;
  if (l.sets) realmSave.flags[l.sets] = true;
  _realmStore();
  if (typeof spawnParticles === 'function') spawnParticles(l.x, (l.y || REALM_FLOOR_Y) - 50, '#ffd27a', 16);
  if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 8);
  _realmTell(l.line || 'Something opens.', '#88ffcc');
}

function _realmLightTorch(t) {
  if (realmSave.flags['torch_' + t.id]) return;
  realmSave.flags['torch_' + t.id] = true;
  _realmStore();
  if (typeof spawnParticles === 'function') spawnParticles(t.x, (t.y || REALM_FLOOR_Y) - 96, '#ffb050', 18);
}

// Lightless rooms: over the world and the fighters, under damage numbers and every HUD layer. Called by
// smb-loop-core.js just before damage texts, while the world transform is still set.
function drawRealmDarkness() {
  if (!realmActive || !realmRoomKey || _realmStaleStory()) return;
  var R = _realmRoom();
  if (!R || !R.lightless) return;
  ctx.save();
  ctx.setTransform(canvas.width / GAME_W, 0, 0, canvas.height / GAME_H, 0, 0);
  _realmDrawDarkness(R);
  ctx.restore();
}
var _realmDarkCv = null;
function _realmDrawDarkness(R) {
  if (!R || !R.lightless || !_realmView) return;
  if (!_realmDarkCv) _realmDarkCv = document.createElement('canvas');
  var cv = _realmDarkCv;
  if (cv.width !== GAME_W || cv.height !== GAME_H) { cv.width = GAME_W; cv.height = GAME_H; }
  var g = cv.getContext('2d'), m = _realmView, k = GAME_W / canvas.width;
  var scr = function (x, y) { return [(m.a * x + m.c * y + m.e) * k, (m.b * x + m.d * y + m.f) * k]; };
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, GAME_W, GAME_H);
  g.fillStyle = 'rgba(2,1,6,' + R.lightless + ')';
  g.fillRect(0, 0, GAME_W, GAME_H);
  g.globalCompositeOperation = 'destination-out';
  var hole = function (x, y, r) {
    var c = scr(x, y), rr = r * m.a * k;
    var gr = g.createRadialGradient(c[0], c[1], rr * 0.35, c[0], c[1], rr);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(c[0], c[1], rr, 0, Math.PI * 2); g.fill();
  };
  var p = players[0];
  if (p && p.health > 0) hole(p.cx(), p.cy(), 150);
  var flick = 1 + 0.04 * Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.3);
  (R.torches || []).forEach(function (t) {
    if (realmSave.flags['torch_' + t.id]) hole(t.x, (t.y || REALM_FLOOR_Y) - 96, 300 * flick);
    else hole(t.x, (t.y || REALM_FLOOR_Y) - 96, 40);
  });
  ctx.drawImage(cv, 0, 0, GAME_W, GAME_H);
}

function _realmDrawTorches(R) {
  var f = typeof frameCount !== 'undefined' ? frameCount : 0;
  (R.torches || []).forEach(function (t) {
    var y = t.y || REALM_FLOOR_Y, lit = !!realmSave.flags['torch_' + t.id];
    ctx.fillStyle = '#2a2230'; ctx.fillRect(t.x - 4, y - 90, 8, 90);
    ctx.fillStyle = '#3c3244'; ctx.fillRect(t.x - 12, y - 96, 24, 8);
    if (lit) {
      var gl = ctx.createRadialGradient(t.x, y - 100, 4, t.x, y - 100, 120);
      gl.addColorStop(0, 'rgba(255,170,80,0.35)'); gl.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = gl; ctx.fillRect(t.x - 120, y - 220, 240, 240);
      for (var i = 0; i < 3; i++) {
        var fl = 12 + 6 * Math.sin(f * 0.25 + i * 2);
        ctx.fillStyle = i === 2 ? 'rgba(255,240,180,0.9)' : 'rgba(255,' + (130 + i * 50) + ',40,0.8)';
        ctx.beginPath(); ctx.moveTo(t.x - 7 + i * 2, y - 96); ctx.quadraticCurveTo(t.x, y - 96 - fl * (1.6 - i * 0.3), t.x + 7 - i * 2, y - 96); ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(160,120,90,' + (0.25 + 0.1 * Math.sin(f * 0.05)) + ')';
      ctx.fillRect(t.x - 3, y - 100, 6, 4);
    }
  });
}

// Tally marks cut into a back wall: { x, y, n } draws n marks in fives (four strokes and a slash), then the faint
// outline of one more.
function _realmDrawTally(t) {
  var gx = 0, gy = 0, perRow = 6;
  ctx.save();
  ctx.lineCap = 'round';
  for (var i = 0; i <= t.n; i++) {
    var grp = Math.floor(i / 5), k = i % 5;
    gx = t.x + (grp % perRow) * 62;
    gy = t.y + Math.floor(grp / perRow) * 58;
    var ghost = i === t.n;
    ctx.strokeStyle = ghost ? 'rgba(255,210,170,' + (0.10 + 0.06 * Math.sin(frameCount * 0.05)) + ')' : 'rgba(20,4,8,0.75)';
    ctx.lineWidth = ghost ? 2 : 3;
    if (ghost) ctx.setLineDash([4, 4]);
    ctx.beginPath();
    if (k < 4) { ctx.moveTo(gx + k * 10, gy); ctx.lineTo(gx + k * 10 + 2, gy + 40); }
    else { ctx.moveTo(gx - 6, gy + 32); ctx.lineTo(gx + 40, gy + 8); }
    ctx.stroke();
    if (!ghost) {   // a lit edge, as if cut into stone
      ctx.strokeStyle = 'rgba(255,140,110,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath();
      if (k < 4) { ctx.moveTo(gx + k * 10 + 2, gy); ctx.lineTo(gx + k * 10 + 4, gy + 40); }
      else { ctx.moveTo(gx - 6, gy + 34); ctx.lineTo(gx + 40, gy + 10); }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function _realmDrawPuzzle(R) {
  var f = typeof frameCount !== 'undefined' ? frameCount : 0;
  var g = REALM_FLOOR_Y;
  // Stone for steps, blocks, pillars and cracked walls: R.stone = [base, top edge], violet by default.
  var st = R.stone || ['#3e3850', '#5a5270'];
  if (R.tally) _realmDrawTally(R.tally);
  _realmDrawTorches(R);
  (R.steps || []).forEach(function (s) {
    ctx.fillStyle = st[0]; ctx.fillRect(s[0], g - s[1], s[2], s[1]);
    ctx.fillStyle = st[1]; ctx.fillRect(s[0], g - s[1], s[2], 4);
  });
  (R.plates || []).forEach(function (pt) {
    var down = (_realmPuz && (_realmPuz.plates[pt.id] || 0) > 0) || !!realmSave.flags['plate_' + pt.id];
    var x0 = pt.x - REALM_PLATE_W / 2;
    ctx.fillStyle = '#16131e'; ctx.fillRect(x0 - 4, g - 2, REALM_PLATE_W + 8, 4);
    ctx.fillStyle = down ? '#4ab8d8' : st[1];
    ctx.fillRect(x0, g - (down ? 3 : 8), REALM_PLATE_W, down ? 3 : 8);
    if (down) {
      ctx.fillStyle = 'rgba(127,224,255,0.18)';
      ctx.fillRect(x0, g - 40, REALM_PLATE_W, 37);
    }
    if (pt.hold && _realmPuz) {
      var left = (_realmPuz.plates[pt.id] || 0) / pt.hold;
      if (left > 0 && left < 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(pt.x - 40, g - 60, 80, 6);
        ctx.fillStyle = left < 0.3 ? '#ff7766' : '#7fe0ff'; ctx.fillRect(pt.x - 40, g - 60, 80 * left, 6);
      }
    }
  });
  (R.blocks || []).forEach(function (b) {
    var pl = _realmPuzPlat('_realmBlock', b.id);
    if (!pl) return;
    var lit = (R.plates || []).some(function (pt) { return Math.abs(pl.x + pl.w / 2 - pt.x) < REALM_PLATE_W / 2; });
    ctx.fillStyle = st[0]; ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
    ctx.fillStyle = st[1]; ctx.fillRect(pl.x, pl.y, pl.w, 5);
    ctx.strokeStyle = '#2a2634'; ctx.lineWidth = 2; ctx.strokeRect(pl.x + 1, pl.y + 1, pl.w - 2, pl.h - 2);
    ctx.strokeStyle = lit ? '#7fe0ff' : '#7a7090'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(pl.x + pl.w / 2, pl.y + pl.h / 2, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pl.x + pl.w / 2, pl.y + pl.h / 2 - 13); ctx.lineTo(pl.x + pl.w / 2, pl.y + pl.h / 2 + 13); ctx.stroke();
  });
  (R.bars || []).forEach(function (b) {
    var t = (_realmPuz && _realmPuz.barT[b.id]) || 0;
    var lintel = g - 300;
    ctx.fillStyle = '#2a2636'; ctx.fillRect(b.x - 34, lintel - 900, 68, 900);
    ctx.fillStyle = '#3c3650'; ctx.fillRect(b.x - 40, lintel - 18, 80, 18);
    var bottom = g - t * 270;
    var open = _realmBarOpen(b);
    ctx.fillStyle = '#5c5870';
    for (var k = -1.5; k <= 1.5; k++) ctx.fillRect(b.x + k * 12 - 3, lintel, 6, bottom - lintel);
    for (var cy = bottom - 30; cy > lintel; cy -= 70) ctx.fillRect(b.x - 24, cy, 48, 5);
    ctx.fillStyle = '#5c5870';
    for (var j = -1.5; j <= 1.5; j++) {
      ctx.beginPath(); ctx.moveTo(b.x + j * 12 - 4, bottom); ctx.lineTo(b.x + j * 12, bottom + 8); ctx.lineTo(b.x + j * 12 + 4, bottom); ctx.fill();
    }
    ctx.fillStyle = open ? '#7fe0ff' : '#7a3a4a';
    ctx.globalAlpha = open ? 0.9 : 0.6 + 0.3 * Math.sin(f * 0.08);
    ctx.fillRect(b.x - 6, lintel - 13, 12, 8);
    ctx.globalAlpha = 1;
  });
  (R.cracks || []).forEach(function (c) {
    if (realmSave.flags['broke_' + c.id]) {
      ctx.fillStyle = st[0];
      for (var r = 0; r < 5; r++) ctx.fillRect(c.x - 40 + r * 17, g - 10 - (r % 2) * 8, 16, 10 + (r % 2) * 8);
      return;
    }
    var hits = (_realmPuz && _realmPuz.crackHits[c.id]) || 0;
    ctx.fillStyle = st[0]; ctx.fillRect(c.x - 24, g - 1200, 48, 1200);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    for (var y = g - 40; y > g - 1200; y -= 40) { ctx.beginPath(); ctx.moveTo(c.x - 24, y); ctx.lineTo(c.x + 24, y); ctx.stroke(); }
    ctx.strokeStyle = '#151220'; ctx.lineWidth = 2 + hits;
    ctx.beginPath();
    ctx.moveTo(c.x - 6, g - 260); ctx.lineTo(c.x + 8, g - 200); ctx.lineTo(c.x - 4, g - 140); ctx.lineTo(c.x + 10, g - 80); ctx.lineTo(c.x, g);
    if (hits > 0) { ctx.moveTo(c.x + 8, g - 200); ctx.lineTo(c.x + 22, g - 230); ctx.moveTo(c.x - 4, g - 140); ctx.lineTo(c.x - 22, g - 120); }
    if (hits > 1) { ctx.moveTo(c.x + 10, g - 80); ctx.lineTo(c.x + 22, g - 50); ctx.moveTo(c.x - 6, g - 260); ctx.lineTo(c.x - 20, g - 300); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,190,230,' + (0.05 + 0.04 * Math.sin(f * 0.07)) + ')';
    ctx.fillRect(c.x - 24, g - 300, 48, 300);
  });
  (R.spikes || []).forEach(function (sp) {
    ctx.fillStyle = '#1a1210'; ctx.fillRect(sp[0], g - 3, sp[1] - sp[0], 3);
    ctx.fillStyle = '#8a8478';
    for (var sx = sp[0] + 2; sx + 12 <= sp[1]; sx += 14) {
      ctx.beginPath(); ctx.moveTo(sx, g - 2); ctx.lineTo(sx + 6, g - 18); ctx.lineTo(sx + 12, g - 2); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(150,30,20,0.55)';
    for (var tx = sp[0] + 2; tx + 12 <= sp[1]; tx += 14) ctx.fillRect(tx + 5, g - 18, 2, 4);
  });
  (R.crumbles || []).forEach(function (c) {
    var pl = _realmPuzPlat('_realmCrumble', c.id);
    if (!pl) return;
    var cs = (_realmPuz && _realmPuz.crumble[c.id]) || { t: 0, gone: 0 };
    if (cs.gone > 0) {
      // Gone: a faint outline so the player can see where it will come back.
      ctx.strokeStyle = 'rgba(200,180,150,' + (cs.gone < 50 ? 0.45 : 0.16) + ')';
      ctx.setLineDash([6, 6]); ctx.lineWidth = 1;
      ctx.strokeRect(pl.x + 0.5, pl.y + 0.5, pl.w - 1, 15);
      ctx.setLineDash([]);
      return;
    }
    var k = cs.t / REALM_CRUMBLE_F;
    var jx = cs.t > 0 ? (Math.random() - 0.5) * 3 * (0.4 + k) : 0;
    var jy = cs.t > 0 ? (Math.random() - 0.5) * 2 * k : 0;
    ctx.save(); ctx.translate(jx, jy);
    ctx.fillStyle = st[0]; ctx.fillRect(pl.x, pl.y, pl.w, 16);
    ctx.fillStyle = st[1]; ctx.fillRect(pl.x, pl.y, pl.w, 3);
    // Fault lines are always drawn, so a crumbling ledge reads differently from a solid one before you land.
    ctx.strokeStyle = 'rgba(0,0,0,' + (0.45 + 0.4 * k) + ')'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var cx2 = pl.x + 18; cx2 < pl.x + pl.w - 8; cx2 += 26) {
      ctx.moveTo(cx2, pl.y + 2); ctx.lineTo(cx2 + 5, pl.y + 8); ctx.lineTo(cx2 - 2, pl.y + 15);
    }
    ctx.stroke();
    ctx.restore();
    if (cs.t > 0 && frameCount % 5 === 0 && typeof spawnParticles === 'function') spawnParticles(pl.x + Math.random() * pl.w, pl.y + 14, 'rgba(170,140,110,0.8)', 1);
  });
  (R.lifts || []).forEach(function (l) {
    var pl = _realmPuzPlat('_realmLift', l.id);
    if (!pl) return;
    ctx.strokeStyle = 'rgba(120,110,90,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pl.x + 10, pl.y); ctx.lineTo(pl.x + 10, l.y1 - 220);
    ctx.moveTo(pl.x + pl.w - 10, pl.y); ctx.lineTo(pl.x + pl.w - 10, l.y1 - 220);
    ctx.stroke();
    ctx.fillStyle = st[0]; ctx.fillRect(pl.x, pl.y, pl.w, 14);
    ctx.fillStyle = st[1]; ctx.fillRect(pl.x, pl.y, pl.w, 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(pl.x + 0.5, pl.y + 0.5, pl.w - 1, 13);
  });
  (R.levers || []).forEach(function (l) {
    var y = l.y || g;
    var pulled = !!realmSave.flags['lever_' + l.id];
    var ready = pulled || _realmCond(l.when);
    ctx.fillStyle = '#2a2636'; ctx.fillRect(l.x - 16, y - 22, 32, 22);
    var ang = pulled ? 0.6 : -0.6;
    ctx.strokeStyle = '#8a8098'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(l.x, y - 16); ctx.lineTo(l.x + Math.sin(ang) * 44, y - 16 - Math.cos(ang) * 44); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = pulled ? '#7fe0ff' : ready ? '#ffd27a' : '#7a3a4a';
    ctx.beginPath(); ctx.arc(l.x + Math.sin(ang) * 44, y - 16 - Math.cos(ang) * 44, 6, 0, Math.PI * 2); ctx.fill();
  });
}

// Story: the chapter's exit waits on a realm flag (REALM_STORY[key].exitNeeds). Read by _exploreObjectivePending.
function realmExitBlocker() {
  if (!realmActive || realmHost !== 'story' || !realmSave) return null;
  var d = REALM_STORY[realmKey];
  var need = d && d.exitNeeds && d.exitNeeds[_realmStoryChId];
  return need && !realmSave.flags[need] ? (d.exitReason || 'something is left undone') : null;
}

function _realmStoryReturn(entranceId) {
  var p = players[0];
  var ents = _realmStoryEntrances();
  var e = ents.find(function (q) { return q.id === entranceId; }) || ents[0];
  if (_realmStash) {
    currentArena = _realmStash.arena;
    minions.length = 0;
    Array.prototype.push.apply(minions, _realmStash.minions);
    projectiles = _realmStash.projectiles || [];
    if (p) { p.spawnX = _realmStash.spawnX; p.spawnY = _realmStash.spawnY; }
    _realmStash = null;
  }
  realmRoomKey = null;
  _realmSay = null;
  _realmFoesRoom = null; _realmCharge = null; _realmPuz = null;
  // A gate the side rooms opened (no terminal) stops being a wall.
  var plats = currentArena.platforms;
  for (var gi = plats.length - 1; gi >= 0; gi--) if (plats[gi]._realmGate && realmSave.flags['gate_' + plats[gi]._realmGate]) plats.splice(gi, 1);
  if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();
  if (e && e.oneWay && !realmSave.flags['open_' + e.id]) {
    realmSave.flags['open_' + e.id] = true;
    _realmTell('The hatch unbolts from this side. A way back.', '#88ffcc');
  }
  _realmStore();
  if (!p || !e) return;
  p.x = e.x - p.w / 2; p.y = _realmMainFloorY(e.x) - p.h; p.vx = 0; p.vy = 0;
  if (typeof camXCur !== 'undefined') { camXCur = camXTarget = p.cx(); camYCur = camYTarget = p.cy() - 30; }
}

// Chapter world: entrances, blast doors and their terminals, behind the fighters.
function _realmStoryDrawMain() {
  var f = typeof frameCount !== 'undefined' ? frameCount : 0;
  ctx.save();
  _realmStoryEntrances().forEach(function (e) {
    var locked = (e.needs && !realmSave.flags[e.needs]) || (e.oneWay && !realmSave.flags['open_' + e.id]);
    _realmDrawArch({ x: e.x, y: _realmMainFloorY(e.x), art: e.art, _locked: locked, _closed: e.art === 'hatch' && locked });
  });
  _realmStoryGates().forEach(function (g) {
    var open = !!realmSave.flags['gate_' + g.id];
    var fy = _realmMainFloorY(g.x - 40);
    var top = fy - 260;
    ctx.fillStyle = '#15191b';
    ctx.fillRect(g.x - 40, top - 16, 80, 16);
    if (!open) {
      ctx.fillStyle = '#4a5256';
      ctx.fillRect(g.x - 30, top, 60, fy - top);
      ctx.fillStyle = '#c9a23a';
      for (var sy = top + 10; sy < fy - 10; sy += 34) {
        ctx.beginPath(); ctx.moveTo(g.x - 30, sy); ctx.lineTo(g.x - 30 + 14, sy); ctx.lineTo(g.x - 30, sy + 14); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = '#22282a'; ctx.lineWidth = 2;
      ctx.strokeRect(g.x - 30, top, 60, fy - top);
    } else {
      ctx.fillStyle = '#4a5256';
      ctx.fillRect(g.x - 30, top, 60, 22);
    }
    if (g.termX == null) return;
    // Terminal.
    var tx = g.termX, ty = _realmMainFloorY(tx);
    ctx.fillStyle = '#1e2426';
    ctx.fillRect(tx - 6, ty - 70, 12, 70);
    ctx.fillRect(tx - 18, ty - 92, 36, 26);
    var has = !!realmSave.items[g.needs];
    ctx.fillStyle = open ? '#2a6a4a' : has ? '#d6b04a' : '#a8342a';
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(f * 0.1);
    ctx.fillRect(tx - 14, ty - 88, 28, 18);
    ctx.globalAlpha = 1;
  });
  ctx.restore();
}

function _realmPrompt(x, y, verb) {
  ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - 34, y - 14, 68, 20);
  ctx.fillStyle = '#ffd27a';
  ctx.fillText('F  ' + verb, x, y);
}

function _realmStoryDrawPrompt() {
  var p = players[0];
  if (!_realmNear || !p || p.health <= 0 || realmFade !== 0) return;
  ctx.save();
  var n = _realmNear.ref;
  if (_realmNear.kind === 'entrance') {
    var y = _realmMainFloorY(n.x);
    _realmPrompt(n.x, n.art === 'hatch' ? y - 70 : y - 184, n.art === 'hatch' ? 'Climb' : 'Enter');
  } else if (_realmNear.kind === 'terminal') {
    _realmPrompt(n.termX, _realmMainFloorY(n.termX) - 132, 'Use');
  }
  ctx.restore();
}

// Story HUD: the room name on the way in, and the fade. Screen space; the caller set the transform.
function _realmDrawShopDark() {
  if (_realmShopKill <= 0) return;
  var k = 1 - _realmShopKill / REALM_SHOP_KILL_F;
  ctx.globalAlpha = Math.min(0.92, k * 1.6);
  ctx.fillStyle = '#020104';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.globalAlpha = 1;
}

function _realmDrawFadeAndBanner(R) {
  _realmDrawShopDark();
  if (realmBanner > 0 && R && realmRoomKey) {
    ctx.globalAlpha = realmBanner > 90 ? (120 - realmBanner) / 30 : Math.min(1, realmBanner / 30);
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px Arial';
    ctx.fillStyle = '#e8f2ee';
    ctx.shadowColor = '#5fd8a8'; ctx.shadowBlur = 12;
    ctx.fillText(R.name.toUpperCase(), GAME_W / 2, GAME_H * 0.26);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  if (realmFade !== 0) {
    var fa = realmFade > 0 ? 1 - realmFade / REALM_FADE_F : -realmFade / REALM_FADE_F;
    ctx.globalAlpha = Math.max(0, Math.min(1, fa));
    ctx.fillStyle = '#050302';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.globalAlpha = 1;
  }
}
