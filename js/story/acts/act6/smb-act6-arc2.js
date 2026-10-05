// Appends chapters for act6/smb-act6-arc2.js.
STORY_CHAPTER_REGISTRY.push(
  {
    id: 80, title: 'Proof of Understanding',
    world: '🌌 The Void Between — The Fallen God\'s Trial',
    narrative: [
      '"I will not destroy you."',
      '"I am testing what you carry."',
      '',
      '"The Creator built a weapon against the Void Mind."',
      '"You carry the piece it carved from itself."',
      '',
      '"One of you understands what must be preserved."',
      '"Prove it was you."',
    ],
    storeNag: '⚠️ BOSS FIGHT — The Fallen God. Final trial before the Creator\'s domain.',
    isBossFight: true,
    bossType: 'fallen_god',
    arena: 'space',
    playerLives: 2,
    tokenReward: 200, blueprintDrop: 'godfall_seal',
    fightScript: [
      { frame: 60,   text: '"You carry the fragment. Now prove you are worthy of it."',  color: '#ffcc44', timer: 200 },
      { frame: 360,  text: '"The Creator built to break. You were built to hold."',      color: '#ffdd88', timer: 220 },
      { frame: 720,  text: '"Good. Do not stop."',                                       color: '#ffee99', timer: 180 },
      { frame: 1100, text: '"You are worthy of what you carry."',                        color: '#ffffff',  timer: 240 },
    ],
    postText: 'The Fallen God stills. Not defeated — satisfied. "The walls hold. So will you." It steps aside. The way to the Creator\'s domain is clear.',
  },

  {
    id: 81, title: 'What Was Before',
    world: '🌌 The Void Between — The Last Threshold',
    arena: 'void',
    type: 'exploration', exploreMode: 'puzzle',
    style: 'void',
    worldLength: 3200,
    objectName: 'Separation Seal',
    preText: 'The Fallen God sealed a final understanding into three memory locks. Activate them in sequence — carry the knowledge of what was before into the Creator\'s domain.',
    puzzleSwitchDefs: [
      { wx: 600,  y: 385, label: '1' },
      { wx: 1400, y: 350, label: '2' },
      { wx: 2500, y: 370, label: '3' },
    ],
    spawnEnemies: [
      { wx: 900,  name: 'Threshold Guard', weaponKey: 'sword',  classKey: 'warrior', aiDiff: 'hard',   color: '#ccaa44' },
      { wx: 1800, name: 'Threshold Guard', weaponKey: 'spear',  classKey: 'warrior', aiDiff: 'expert', color: '#aa8822' },
      { wx: 2700, name: 'Seal Keeper',     weaponKey: 'hammer', classKey: 'thor',    aiDiff: 'expert', color: '#997711', isGuard: true, health: 140 },
    ],
    fightScript: [
      { frame: 40,  text: 'Activate memory locks in order. The Fallen God is watching.', color: '#ffcc44', timer: 270 },
      { frame: 600, text: '"You carry its conscience. When you face it — remind it of what it was." — The Fallen God', color: '#ffdd88', timer: 290 },
    ],
    playerLives: 3,
    tokenReward: 150, blueprintDrop: null,
    postText: 'What remains is clarity: the worlds ahead require a different kind of understanding. The Fallen God\'s voice settles around you once more. "The multiverse is not safe. But it will teach you what you need. Follow." The compass burns. You go forward.',
  },
);
