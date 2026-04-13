// Appends chapters for act5/smb-act5-arc2.js.
STORY_CHAPTER_REGISTRY.push(
  {
    id: 91, title: 'True Form',
    world: '🕳️ The Void — Final Confrontation',
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
      'Prove it wrong.',
    ],
    fightScript: [
      { frame: 60,  text: '⚠️ TRUE FORM — this entity is the fracture system itself. QTE sequences will trigger.', color: '#cc44ff', timer: 380 },
      { frame: 80,  text: '"You are a fragment bearer who lost their fragment." Incorrect.', color: '#ffffff', timer: 260 },
      { frame: 320, text: '"I have been preparing for you since the first fracture." Then we\'ve both been preparing.', color: '#cc88ff', timer: 280 },
      { frame: 600, text: '⚠️ QTE INCOMING — watch for the prompt sequences. Survive them.', color: '#ff44ff', timer: 320 },
      { frame: 900, text: '"You\'re still here." Yes.', color: '#88aaff', timer: 240 },
      { frame: 1200, text: '⚠️ FINAL PHASE — everything the True Form has. Everything you have.', color: '#ff88ff', timer: 300 },
      { frame: 1400, text: 'The void is collapsing around it. That means you\'re winning.', color: '#aaccff', timer: 260 },
    ],
    preText: 'The True Form — the original pattern, the system\'s deepest failsafe. QTE sequences will trigger at HP thresholds. 3 lives.',
    opponentName: null,
    weaponKey: null,
    classKey: null,
    aiDiff: null,
    playerLives: 3,
    arena: 'void',
    isTrueFormFight: true,
    tokenReward: 300, blueprintDrop: null,
    postText: 'The True Form unravels. Not destroyed — resolved. The fracture system loses its anchor. Seventeen dimensions stabilize simultaneously. And you are still standing in the void. Veran\'s voice, quiet: "We can bring you back." The compass in your pocket spins once. Settles. Points home. "...Yeah. I know."',
  },

  // ═══════════════ EPILOGUE ═══════════════

  {
    id: 92, title: 'After',
    world: '🌆 Home — Epilogue',
    isEpilogue: true,
    narrative: [
      'The city is rebuilding.',
      '',
      'The portals still open sometimes.',
      'Not as invasions.',
      'Just as doors.',
      '',
      'People use them now.',
      'For trade. For travel.',
      'For reaching places they never could before.',
      '',
      'Veran has an office on the fourteenth floor of what used to be a ruin.',
      'She sends you coordinates sometimes.',
      '"Another fracture point. Thought you should know."',
      '',
      'You always go.',
      '',
      '...',
      '',
      'Some things don\'t need explaining.',
    ],
    preText: null, noFight: true,
    tokenReward: 300,
    postText: 'STORY COMPLETE. You held the rift open with your own fragment. You are the reason seventeen dimensions are still standing. Story Online is now unlocked.',
  },

  // ══════════════════════════════════════════════════════════════════
  // ACT VII — GODFALL ARC (ids 81–84)
  // A post-epilogue arc. The Fallen God emerges from the sealed rift
  // as a lore narrator and final challenge.
  // ══════════════════════════════════════════════════════════════════

);
