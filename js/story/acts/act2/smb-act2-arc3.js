// Appends chapters for act2/smb-act2-arc3.js.
STORY_CHAPTER_REGISTRY.push(
  {
    id: 45, type: 'exploration', exploreMode: 'traversal', title: 'What the Ancients Left',
    world: '🏛️ Ruins Dimension — The First Collapse',
    narrative: [
      'The first dimension to ever fracture.',
      '',
      'It looked like your world might.',
      'Broken towers. Cracked sky.',
      'A planet mid-collapse, frozen in time.',
      '',
      'The fourth Architect had lived here since the beginning.',
      'And hidden the original fracture diagram deep in the ruins.',
      '"You\'ll find it," the rift entity said.',
      '"The fragment will guide you."',
      '',
      'The ruins stretched endlessly ahead.',
      'Something ancient waited in the rubble.',
    ],
    objectName: 'Fracture Diagram',
    style: 'ruins',
    worldLength: 4800,
    sky: ['#100808', '#1e1010'],
    groundColor: '#3a2e20',
    platColor: '#4a3e30',
    spawnEnemies: [
      { wx: 700,  name: 'Stone Warden',    weaponKey: 'hammer', classKey: 'tank',    aiDiff: 'hard',   color: '#776655', armor: ['helmet'] },
      { wx: 1100, name: 'Rubble Crawler',  weaponKey: 'sword',  classKey: 'ninja',   aiDiff: 'medium', color: '#887766' },
      { wx: 1500, name: 'Ruin Guardian',   weaponKey: 'axe',    classKey: 'warrior', aiDiff: 'hard',   color: '#998866', armor: ['helmet', 'chestplate'] },
      { wx: 1900, name: 'Shard Stalker',   weaponKey: 'spear',  classKey: 'ninja',   aiDiff: 'hard',   color: '#776644' },
      { wx: 2300, name: 'Ancient Scout',   weaponKey: 'sword',  classKey: 'ninja',   aiDiff: 'expert', color: '#887755' },
      { wx: 2700, name: 'Tomb Knight',     weaponKey: 'axe',    classKey: 'warrior', aiDiff: 'expert', color: '#998877', armor: ['helmet'] },
      { wx: 3000, name: 'Relic Knight',    weaponKey: 'spear',  classKey: 'warrior', aiDiff: 'expert', color: '#aa9977', armor: ['helmet', 'chestplate'] },
      { wx: 3400, name: 'Dust Wraith',     weaponKey: 'sword',  classKey: 'ninja',   aiDiff: 'expert', color: '#665544' },
      { wx: 3800, name: 'Keeper',          weaponKey: 'hammer', classKey: 'tank',    aiDiff: 'expert', color: '#998844', armor: ['helmet', 'chestplate', 'leggings'] },
      // Diagram guardians — hold the fracture diagram location
      { wx: 4300, name: 'Diagram Sentinel', weaponKey: 'axe',   classKey: 'tank',    aiDiff: 'expert', color: '#776644', isGuard: true, health: 140, armor: ['helmet', 'chestplate'] },
      { wx: 4380, name: 'Vault Warden',     weaponKey: 'hammer',classKey: 'warrior', aiDiff: 'expert', color: '#887755', isGuard: true, health: 120, armor: ['helmet', 'chestplate', 'leggings'] },
      { wx: 4450, name: 'Last Keeper',      weaponKey: 'spear', classKey: 'ninja',   aiDiff: 'expert', color: '#665533', isGuard: true, health: 100 },
    ],
    playerLives: 3,
    tokenReward: 130, blueprintDrop: null,
    postText: 'The fracture diagram. Not a physical object — a transfer of knowledge. You understand it immediately. The closure protocol. Three steps. The third step you already knew.',
  },

  // ───────────────────────────────────────────────────────────────
  // CHAPTER V — UNRAVELING
  // Setting: back to the core — executing the closure protocol.
  // Mechanics: escalating distortion, staggered elite fights.
  // ───────────────────────────────────────────────────────────────

  {
    id: 46, title: 'The Last Army',
    world: '⚛️ Multiversal Core — Outer Ring',
    narrative: [
      'The rift entity had been quiet.',
      'Then it spoke.',
      '',
      '"You\'ve gathered the Architects. You know the protocol."',
      '"And you intend to sacrifice yourself."',
      '"I don\'t want that. I never wanted that."',
      '',
      '"But the rift has its own hunger now. It generates fighters.',
      '"Echoes. Fragments of collapsed dimensions wearing combat forms."',
      '"They will try to stop you."',
      '"Not because I command it — because the rift commands it."',
      '"Survive them. Then we talk."',
    ],
    fightScript: [
      { frame: 80,  text: '⚠️ Reality distortion is increasing. The visual noise is the rift amplifying.', color: '#cc44ff', timer: 310 },
      { frame: 90,  text: 'Rift echos — they don\'t die cleanly. They fracture and reassemble. Hit hard.', color: '#ff44cc', timer: 270 },
      { frame: 380, text: 'The fragment is fully charged. You can feel it. Wait for the right moment.', color: '#88aaff', timer: 260 },
    ],
    preText: 'The rift\'s final echo wave — powerful fracture constructs. Two simultaneous. 2 lives.',
    opponentName: 'Rift Echo Alpha', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'expert', opponentColor: '#aa00ff',
    twoEnemies: true,
    secondEnemy: { weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', color: '#8800cc' },
    armor: ['helmet', 'chestplate'],
    playerLives: 2,
    arena: 'creator',
    tokenReward: 120, blueprintDrop: null,
    postText: 'The echoes collapse. The outer ring is clear. Ahead: the rift core. Veran and the Architects are in position. "Whenever you\'re ready," Veran says. Her voice is steady. Yours is too.',
  },

  {
    id: 47, title: 'The Herald of Nothing',
    world: '⚛️ Multiversal Core — Threshold',
    narrative: [
      'The rift\'s final guardian.',
      '',
      'Not a construct. Not an echo.',
      'A person.',
      '',
      'Or what remained of one.',
      '',
      'The rift entity spoke first:',
      '"It drifted into my network sixty years ago.',
      'Discarded. Fragment extracted. Still standing.',
      'I gave it a purpose. It accepted."',
      '',
      'The figure looked at you — at the fragment burning steady in your chest —',
      'and something in what was left of their face changed.',
      '',
      '"You still have yours," they said.',
      '"I had hoped someone would."',
      '',
      '"If the rift closes, everything it absorbed dissolves.",',
      '"Fifty-two dimensions. Every echo. Including me.",',
      '"I\'ve dissolved once already.",',
      '"I\'d rather choose the second time.",',
      '"Make it a real fight."',
    ],
    storeNag: '⚠️ The final threshold guardian. 1 life. This is the last fight before the Creator.',
    fightScript: [
      { frame: 70,  text: '"Sixty years waiting for something worth finishing." They mean it.', color: '#ffffff', timer: 290 },
      { frame: 280, text: '"You fight like the fragment is part of you." A pause between swings. "It is, isn\'t it."', color: '#aaaaff', timer: 290 },
      { frame: 500, text: 'Not anger. Not desperation. They\'re fighting the way someone fights when they\'ve already made peace with the answer.', color: '#88ccff', timer: 300 },
      { frame: 700, text: '"Don\'t waste it," they say, mid-swing. "What you still have. Don\'t waste it."', color: '#ffffff', timer: 260 },
    ],
    preText: 'The Herald of Nothing — a former fragment bearer, emptied by Axiom, found by the rift. Voluntary last stand. Expert-level. 1 life.',
    opponentName: 'Herald of Nothing', weaponKey: 'voidblade', classKey: 'ninja', aiDiff: 'expert', opponentColor: '#ffffff',
    armor: ['helmet', 'chestplate', 'leggings'],
    playerLives: 1,
    arena: 'god_domain',
    tokenReward: 150, blueprintDrop: null,
    postText: 'They dissolve slowly. Not in violence — in the quiet way of something that has been half-gone for a long time finally finishing the journey. The rift core opens. The rift entity stands at the center. "One more thing before the protocol," it says. "There is something beyond the rift. Something that has been watching." It looks at you. "The Creator of the fracture system. It built the system you have been moving through. It designed the process that emptied the one who just dissolved — the extraction, the hollowing, the fragment pulled free. And it already knows your name." A long silence. "You will meet it. But not today." The core hums. "Today, we close this."',
  },

  // ══════════════════════════════════════════════════════════════════
  // ACT IV — THE ARCHITECTS' WAR (ids 45–60)
  // The Architects convene. A betrayal reshapes everything.
  // ══════════════════════════════════════════════════════════════════

  // ─────── Arc 3-0: The Assembly (ids 45–51) ────────────────────────

);
