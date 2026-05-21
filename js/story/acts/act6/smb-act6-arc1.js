// Appends chapters for act6/smb-act6-arc1.js.
STORY_CHAPTER_REGISTRY.push(
  {
    id: 66, title: 'A Voice Between Worlds',
    world: '🌌 The Void Between Dimensions',
    type: 'exploration', exploreMode: 'stealth',
    style: 'void',
    worldLength: 3400,
    objectName: 'First Principle',
    preText: 'The space between dimensions is monitored by the Fallen God\'s silent observers. Navigate to the voice\'s source without disturbing the observers.',
    stealthGuardDefs: [
      { wx: 600,  radius: 95,  name: 'Observer' },
      { wx: 1300, radius: 100, name: 'Observer' },
      { wx: 2000, radius: 90,  name: 'Silent Warden' },
      { wx: 2800, radius: 100, name: 'Silent Warden' },
    ],
    spawnEnemies: [
      { wx: 600,  name: 'Observer',      weaponKey: 'sword',  classKey: 'ninja',   aiDiff: 'hard',   color: '#ccaa44' },
      { wx: 1300, name: 'Observer',      weaponKey: 'spear',  classKey: 'ninja',   aiDiff: 'hard',   color: '#bbaa33' },
      { wx: 2000, name: 'Silent Warden', weaponKey: 'axe',    classKey: 'warrior', aiDiff: 'expert', color: '#aa9922' },
      { wx: 2800, name: 'Silent Warden', weaponKey: 'hammer', classKey: 'tank',    aiDiff: 'expert', color: '#998811', isGuard: true, health: 120 },
    ],
    fightScript: [
      { frame: 30,  text: 'Observers monitoring. Reach the voice\'s source without drawing attention.', color: '#ffcc44', timer: 270 },
      { frame: 490, text: '"Fragment bearer. You have passed four trials. Each world I showed you was a question."', color: '#ffdd88', timer: 270 },
    ],
    sky: ['#040408', '#08080f'],
    groundColor: '#0f0f14',
    platColor: '#1a1a20',
    playerLives: 3,
    tokenReward: 40, blueprintDrop: null,
    postText: 'The voice grows stronger — not with anger, but with weight. Ancient. Calm. Patient. "Words are insufficient. Show me."',
  },

  {
    id: 67, title: 'The Architect Before the Architects',
    world: '🌌 The Void Between — Origin Vault',
    type: 'exploration', exploreMode: 'scavenge',
    style: 'void',
    worldLength: 3600,
    objectName: 'Origin Records',
    preText: 'The Fallen God\'s origin vault holds the records of the first law — the walls between dimensions. Collect all four before the vault seals.',
    scavengeItemDefs: [
      { wx: 500,  y: 350, name: 'Law of Separation',   icon: '📜' },
      { wx: 1200, y: 310, name: 'First Wall Blueprint', icon: '📐' },
      { wx: 2000, y: 340, name: 'Creator\'s Tutelage',  icon: '💾' },
      { wx: 2900, y: 325, name: 'Fracture Proof',       icon: '💠' },
    ],
    spawnEnemies: [
      { wx: 800,  name: 'Vault Guardian',   weaponKey: 'sword',  classKey: 'warrior', aiDiff: 'hard',   color: '#ccaa44' },
      { wx: 1600, name: 'Vault Guardian',   weaponKey: 'spear',  classKey: 'warrior', aiDiff: 'hard',   color: '#bb9933' },
      { wx: 2400, name: 'Origin Warden',    weaponKey: 'hammer', classKey: 'tank',    aiDiff: 'expert', color: '#aa8822' },
      { wx: 3100, name: 'First Keeper',     weaponKey: 'axe',    classKey: 'berserker',aiDiff: 'expert', color: '#997711', isGuard: true, health: 130 },
    ],
    fightScript: [
      { frame: 40,  text: 'Collect all four origin records. The vault is sealing.', color: '#ffcc44', timer: 270 },
      { frame: 560, text: '"I built the walls between dimensions. Not to cage life. To protect it." — The Fallen God', color: '#ffdd88', timer: 280 },
    ],
    sky: ['#040408', '#08080f'],
    groundColor: '#0f0f14',
    platColor: '#1a1a20',
    playerLives: 3,
    tokenReward: 50, blueprintDrop: null,
    postText: 'The Fallen God steps forward. "Words are insufficient. Show me."',
  },

);
