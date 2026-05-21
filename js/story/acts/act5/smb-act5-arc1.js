// Appends chapters for act5/smb-act5-arc1.js.
STORY_CHAPTER_REGISTRY.push(
  {
    id: 99, title: 'What Remains',
    world: '🕳️ The Void — Breach',
    type: 'exploration', exploreMode: 'escape',
    style: 'void',
    worldLength: 4200,
    objectName: 'Stable Core',
    preText: 'The void is tearing open as the True Form stirs. The collapse is spreading from behind. Reach the stable core before it swallows everything.',
    spawnEnemies: [
      { wx: 700,  name: 'Void Shard',    weaponKey: 'sword',  classKey: 'none',    aiDiff: 'hard',   color: '#cc44ff' },
      { wx: 1500, name: 'Void Shard',    weaponKey: 'axe',    classKey: 'berserker',aiDiff: 'hard',  color: '#bb33ee' },
      { wx: 2400, name: 'Fracture Form', weaponKey: 'spear',  classKey: 'warrior', aiDiff: 'expert', color: '#aa22dd' },
      { wx: 3200, name: 'True Echo',     weaponKey: 'hammer', classKey: 'tank',    aiDiff: 'expert', color: '#9911cc', isGuard: true, health: 130 },
    ],
    fightScript: [
      { frame: 20,  text: '⚠️ VOID BREACH — the True Form is stirring. Keep moving RIGHT.', color: '#ff44ff', timer: 290 },
      { frame: 380, text: '"It feeds on the closure energy. It will come for you. And you will be the only thing that can stop it."', color: '#cc88ff', timer: 280 },
      { frame: 680, text: 'The void holds. Barely. Keep moving.', color: '#aaccff', timer: 220 },
    ],
    sky: ['#050510', '#0a0a20'],
    groundColor: '#0f0f1a',
    platColor: '#1a1a33',
    playerLives: 3,
    tokenReward: 50, blueprintDrop: null,
    postText: 'You are still here. The void holds. The True Form is coming.',
  },

);
