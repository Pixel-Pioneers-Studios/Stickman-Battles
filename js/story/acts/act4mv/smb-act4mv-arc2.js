// Appends chapters for act4mv/smb-act4mv-arc2.js.
STORY_CHAPTER_REGISTRY.push(
  {
    id: 74,
    title: 'What You Cannot See',
    world: '🌑 Shadow Realm — Entry',
    type: 'exploration', exploreMode: 'stealth',
    style: 'void',
    worldLength: 3600,
    objectName: 'Shadow Court',
    preText: 'The Shadow Realm operates on detection — any sound or movement triggers the sentinels. Reach the Shadow Court using only the fragment\'s pulse to navigate.',
    stealthGuardDefs: [
      { wx: 600,  radius: 100, name: 'Shadow Sentinel' },
      { wx: 1300, radius: 95,  name: 'Shadow Sentinel' },
      { wx: 2000, radius: 105, name: 'Void Sentry' },
      { wx: 2800, radius: 95,  name: 'Void Sentry' },
    ],
    spawnEnemies: [
      { wx: 600,  name: 'Shadow Sentinel', weaponKey: 'sword',  classKey: 'ninja',   aiDiff: 'hard',   color: '#6600aa' },
      { wx: 1300, name: 'Shadow Sentinel', weaponKey: 'spear',  classKey: 'ninja',   aiDiff: 'hard',   color: '#550099' },
      { wx: 2000, name: 'Void Sentry',     weaponKey: 'axe',    classKey: 'assassin',aiDiff: 'expert', color: '#440088' },
      { wx: 2800, name: 'Void Sentry',     weaponKey: 'sword',  classKey: 'assassin',aiDiff: 'expert', color: '#330077', isGuard: true, health: 120 },
    ],
    fightScript: [
      { frame: 30,  text: 'Shadow sentinels everywhere. Stay out of their detection zones — the fragment will guide you.', color: '#ffcc44', timer: 270 },
      { frame: 490, text: '"Fear of the unseen was the last thing holding you back." — The Fallen God', color: '#ffcc66', timer: 260 },
    ],
    sky: ['#020202', '#050505'],
    groundColor: '#080808',
    platColor: '#111111',
    playerLives: 3,
    tokenReward: 15, blueprintDrop: null,
    postText: '"What you cannot see, you must feel. The fragment knows the way." — The Fallen God',
    isMultiverseWorld: true,
    multiverseWorldId: 'shadow_realm',
  },

  {
    id: 75,
    title: 'Shadow Warden',
    world: '🌑 Shadow Realm — The Unseen Court',
    narrative: [
      'The Shadow Warden had never been found.',
      '',
      'That was its power. Not strength. Not speed.',
      'Simply: no one had ever located it.',
      '',
      'You had.',
      '',
      '"That is new," the Warden said.',
      'It sounded almost interested.',
    ],
    fightScript: [
      { frame: 60,  text: '🌑 Shadow Veil — visibility is limited. Trust your instincts.', color: '#8833cc', timer: 300 },
      { frame: 240, text: 'It phases and repositions. Stay mobile.', color: '#aa66ff', timer: 250 },
      { frame: 480, text: 'THE FALLEN GOD: "The Warden has never been found. You have already done the impossible."', color: '#ffcc66', timer: 290 },
      { frame: 680, text: '"Fear of the unseen was the last thing holding you back. Good."', color: '#cc88ff', timer: 260 },
    ],
    preText: 'The Shadow Warden — never found, never beaten. Phases and repositions. 1 life.',
    opponentName: 'Shadow Warden', weaponKey: 'sword', classKey: 'ninja', aiDiff: 'expert', opponentColor: '#9900ff',
    armor: ['helmet', 'chestplate', 'leggings'],
    playerLives: 1,
    arena: 'space',
    tokenReward: 65,
    blueprintDrop: null,
    postText: 'The Warden stops moving. Stands still. "You found me," it says. "That has never happened." It steps aside. The fracture opens. You walk through.',
    isMultiverseWorld: true,
    multiverseWorldId: 'shadow_realm',
    storeNag: '⚠️ Shadow Warden. Expert AI. 1 life. Last world before Titan.',
  },

  // ─────── Arc 5-3: Titan World (ids 68–69) ─────────────────────────

  {
    id: 76,
    title: 'Things That Cannot Be Shattered',
    world: '🏔️ Titan World — Outer Plain',
    type: 'exploration', exploreMode: 'defense',
    style: 'void',
    worldLength: 900,
    objectName: 'Titan Gate',
    preText: 'Titan scouts are trying to destroy the dimensional gate before you can reach the Throne Plateau. Hold them off — three waves.',
    survivalWaves: 3,
    waveSize: 2,
    opponentName: 'Titan Scout',
    weaponKey: 'hammer',
    classKey: 'tank',
    aiDiff: 'hard',
    opponentColor: '#ffaa00',
    fightScript: [
      { frame: 30,  text: 'Titan scouts inbound. They\'re bigger than anything you\'ve faced. Hold the gate.', color: '#ffaa00', timer: 270 },
      { frame: 420, text: '"Size is the most ancient form of confidence. Show them it is not enough." — The Fallen God', color: '#ffcc66', timer: 280 },
    ],
    sky: ['#100808', '#1a1010'],
    groundColor: '#2a1a10',
    platColor: '#3a2820',
    playerLives: 3,
    tokenReward: 15, blueprintDrop: null,
    postText: '"Size is the most ancient form of confidence. Show them it is not enough." — The Fallen God',
    isMultiverseWorld: true,
    multiverseWorldId: 'titan_world',
  },

  {
    id: 77,
    title: 'Titan King',
    world: '🏔️ Titan World — The Throne Plateau',
    narrative: [
      'The Titan King had never acknowledged a threat smaller than itself.',
      '',
      'When you walked onto the Throne Plateau, it didn\'t move.',
      'It watched you.',
      '',
      '"You carry the fragment," it said finally.',
      '"The Creator\'s tool."',
      '"I do not fight tools."',
      '',
      '"I\'m not a tool," you said.',
      '',
      'It stood up.',
    ],
    fightScript: [
      { frame: 80,  text: '🏔️ Titan Scale — it hits harder than anything you have faced. Do not trade blows.', color: '#ffaa00', timer: 300 },
      { frame: 300, text: '"Not a tool." It sounds uncertain. Keep going.', color: '#ffcc44', timer: 250 },
      { frame: 520, text: 'THE FALLEN GOD: "Every world you survive rewrites what the next one can do to you."', color: '#ffcc66', timer: 280 },
      { frame: 740, text: '"Enough." The Fallen God, one word. You already know what it means.', color: '#ffaa00', timer: 250 },
    ],
    preText: 'The Titan King — has never acknowledged a smaller threat. Hits devastatingly hard. 1 life.',
    opponentName: 'Titan King', weaponKey: 'hammer', classKey: 'tank', aiDiff: 'expert', opponentColor: '#ffaa00',
    armor: ['helmet', 'chestplate', 'leggings'],
    playerLives: 1,
    arena: 'lava',
    tokenReward: 80,
    blueprintDrop: null,
    postText: 'The Titan King kneels. It has never done that. "Not a tool," it says. "Then what are you?" You don\'t answer. The compass burns. You have crossed four dimensions. The Creator\'s domain is next. And you are no longer who you were when you started.',
    isMultiverseWorld: true,
    multiverseWorldId: 'titan_world',
    storeNag: '⚠️ Titan King. Expert AI. 1 life. This is the final world before the Creator\'s domain.',
  },

  // ══════════════════════════════════════════════════════════════════
  // ACT VI — INTO THE ARCHITECTURE (ids 70–85)
  // The Creator's domain. The truth behind everything.
  // No one gets to leave unchanged.
  // ══════════════════════════════════════════════════════════════════

  // ─────── Arc 4-0: The Creator\'s Threshold (ids 70–77) ────────────

);
