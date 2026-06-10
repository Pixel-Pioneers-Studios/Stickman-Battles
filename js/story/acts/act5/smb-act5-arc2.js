// Appends chapters for act5/smb-act5-arc2.js.
STORY_CHAPTER_REGISTRY.push(
  {
    id: 135, title: 'True Form',
    world: '\uD83D\uDD73\uFE0F The Void — Final Confrontation',
    narrative: [
      'The True Form arrived without announcement.',
      '',
      'Not a creature.',
      'Not a person.',
      'A law.',
      '',
      '"I am what the fracture system was built to protect."',
      '"I am the pattern beneath every dimension."',
      '"I do not lose."',
      '"I do not negotiate."',
      '"I simply am."',
      '',
      '...',
      '',
      'You have fought inside it.',
      'You carry its scar.',
      '',
      'Prove it wrong anyway.',
    ],
    fightScript: [
      { frame: 60,  text: '\u26A0\uFE0F TRUE FORM \u2014 this entity is the fracture system itself. QTE sequences will trigger.', color: '#cc44ff', timer: 380 },
      { frame: 80,  text: '"You survived my echo." Good. You know what you are fighting.', color: '#ffffff', timer: 280 },
      { frame: 320, text: '"The scar in your fragment — I feel it." So does it feel you.', color: '#cc88ff', timer: 280 },
      { frame: 600, text: '\u26A0\uFE0F QTE INCOMING \u2014 watch for the prompt sequences. Survive them.', color: '#ff44ff', timer: 320 },
      { frame: 900, text: '"You\'re still here." Yes. Still here.', color: '#88aaff', timer: 240 },
      { frame: 1200, text: '\u26A0\uFE0F FINAL PHASE \u2014 everything the True Form has. Everything you have. And the scar.', color: '#ff88ff', timer: 300 },
      { frame: 1400, text: 'The void is collapsing around it. The scar burns. That means you\'re winning.', color: '#aaccff', timer: 260 },
    ],
    preText: 'The True Form \u2014 the original pattern, the system\'s deepest failsafe. You have already fought inside its echo. The scar grants focus. QTE sequences will trigger at HP thresholds. 3 lives.',
    opponentName: null,
    weaponKey: null,
    classKey: null,
    aiDiff: null,
    playerLives: 3,
    arena: 'void',
    isTrueFormFight: true,
    tokenReward: 300, blueprintDrop: null,
    postText: 'The True Form unravels. Not destroyed \u2014 resolved. The fracture system loses its anchor. Seventeen dimensions stabilize simultaneously. And you are still standing in the void. The Fourth Architect\'s voice, quiet: "We can bring you back." The compass in your pocket spins once. Settles. Points home. "...Yeah. I know."',
  },

  // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 EPILOGUE \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

  {
    id: 136, title: 'After',
    world: '\uD83C\uDFD9\uFE0F Home \u2014 Transit',
    type: 'ship_flight',
    preText: 'The portals are open \u2014 doors now, not wounds. Fly the compass-ship home through stabilized dimensional space.',
    shipFlightLength: 6000,
    shipFlightEnemies: [
      { spawnX: 800,  type: 'scout',   color: '#88ccff', hp: 30 },
      { spawnX: 1600, type: 'scout',   color: '#88ccff', hp: 30 },
      { spawnX: 2400, type: 'fighter', color: '#44aaff', hp: 50 },
      { spawnX: 3200, type: 'scout',   color: '#88ccff', hp: 30 },
      { spawnX: 4000, type: 'fighter', color: '#44aaff', hp: 50 },
      { spawnX: 4800, type: 'boss',    color: '#2266cc', hp: 120 },
    ],
    fightScript: [
      { frame: 60,  text: 'The portals are open. Not wounds \u2014 doors. People use them now.', color: '#88ccff', timer: 290 },
      { frame: 400, text: 'The compass always finds something. You always go.', color: '#aaccff', timer: 270 },
      { frame: 800, text: 'Some things don\'t need forgiveness. They just need to be carried.', color: '#ffffff', timer: 280 },
    ],
    playerLives: 3,
    tokenReward: 300, blueprintDrop: null,
    postText: 'You held the rift open with your own fragment. You survived the loop. Seventeen dimensions are still standing because of what you did. The compass points home. For now, that is enough. But the compass has always found something.',
  },

  // ══════════════════════════════════════════════════════════════════
  // Act IX — Absolute Axiom (ids 140–155) continues in act7/ files.
  // Gap 137–139 reserved for future content (Void Mind fight arc).
  // ══════════════════════════════════════════════════════════════════

);
