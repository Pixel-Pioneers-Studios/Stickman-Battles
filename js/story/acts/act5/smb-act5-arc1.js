// Appends chapters for act5/smb-act5-arc1.js.
STORY_CHAPTER_REGISTRY.push(
  {
    id: 145, title: 'What Remains',
    world: '🕳️ The Void — Breach',
    arena: 'void',
    type: 'exploration', exploreMode: 'escape',
    style: 'void',
    worldLength: 4200,
    objectName: 'Stable Core',
    preText: 'The void is tearing open as Cosmic Axiom stirs. The collapse is spreading from behind. Reach the stable core before it swallows everything.',
    spawnEnemies: [
      { wx: 700,  name: 'Void Shard',    weaponKey: 'sword',  classKey: 'none',    aiDiff: 'hard',   color: '#cc44ff' },
      { wx: 1500, name: 'Void Shard',    weaponKey: 'axe',    classKey: 'berserker',aiDiff: 'hard',  color: '#bb33ee' },
      { wx: 2400, name: 'Fracture Form', weaponKey: 'spear',  classKey: 'warrior', aiDiff: 'expert', color: '#aa22dd' },
      { wx: 3200, name: 'True Echo',     weaponKey: 'hammer', classKey: 'thor',    aiDiff: 'expert', color: '#9911cc', isGuard: true, health: 130 },
    ],
    fightScript: [
      { frame: 20,  text: '⚠️ VOID BREACH — Cosmic Axiom is stirring. Keep moving RIGHT.', color: '#ff44ff', timer: 290 },
      { frame: 380, text: '"It feeds on the closure energy. It will come for you. And you will be the only thing that can stop it."', color: '#cc88ff', timer: 280 },
      { frame: 680, text: 'The void holds. Barely. Keep moving.', color: '#aaccff', timer: 220 },
    ],
    playerLives: 3,
    tokenReward: 50, blueprintDrop: null,
    postText: 'You are still here. The void holds. Cosmic Axiom is coming.',
  },

  {
    id: 146, title: 'What It Built Here',
    world: '🕳️ The Void — Cosmic Axiom\'s Domain',
    arena: 'void',
    type: 'exploration', exploreMode: 'scavenge',
    style: 'void',
    worldLength: 3600,
    objectName: 'Absorbed Fragment Echoes',
    preText: 'Cosmic Axiom has been here a long time. Across its domain are the absorbed fragment energies of every bearer who came before — ninety-four of them. Collect four echoes and understand what came before you.',
    scavengeItemDefs: [
      { wx: 500,  y: 355, name: 'First Bearer\'s Echo',      icon: '👁️' },
      { wx: 1200, y: 315, name: 'The Forty-Seventh\'s Mark', icon: '🌀' },
      { wx: 2000, y: 340, name: 'A Choice Not Made',         icon: '💠' },
      { wx: 2800, y: 325, name: 'What Remained',             icon: '🔮' },
    ],
    spawnEnemies: [
      { wx: 750,  name: 'Void Construct',  weaponKey: 'sword',  classKey: 'none',    aiDiff: 'hard',   color: '#9922cc' },
      { wx: 1500, name: 'Void Construct',  weaponKey: 'spear',  classKey: 'warrior', aiDiff: 'hard',   color: '#8811bb' },
      { wx: 2300, name: 'Fragment Echo',   weaponKey: 'axe',    classKey: 'berserker',aiDiff: 'expert', color: '#7700aa' },
      { wx: 3100, name: 'Fragment Echo',   weaponKey: 'hammer', classKey: 'warrior', aiDiff: 'expert', color: '#660099', isGuard: true, health: 130 },
    ],
    fightScript: [
      { frame: 40,  text: 'Cosmic Axiom absorbed ninety-four bearers. Their echoes are still here. Collect them.', color: '#cc44ff', timer: 280 },
      { frame: 600, text: 'Each echo is a life that ended here. Each one made it further than the one before.', color: '#aa22dd', timer: 290 },
    ],
    playerLives: 3,
    tokenReward: 60, blueprintDrop: null,
    postText: 'The ninety-fourth echo was the closest. It reached this same point. Then something in it gave. You carry what it couldn\'t. That is the only difference between you and them — not power. Persistence.',
  },

  {
    id: 147, title: 'The Constructs',
    world: '🕳️ The Void — Construct Layer',
    // Converted from a 3-round gauntlet to the bearer battle royale — the
    // reframe docs/TRIALS_DESIGN.md asked for ("include only if reframed: if the
    // field is the 94 bearers who came before Kael"). The chapter already said
    // exactly that in prose — "echoes of absorbed fragment bearers", "they fight
    // like you" — it just staged it as three constructs in a row. Now it is all
    // ninety-four at once, which is the only staging that earns the line.
    //
    // CONVERTED, not inserted: the registry stays contiguous 0-185 and no save
    // migration is needed. The field itself is built by _brSpawnBots(), which
    // derives bearer mode from this `type`.
    type: 'battleroyale',
    preText: 'Cosmic Axiom kept every bearer it ever took. Ninety-four of them stand between you and its core — not three, not in waves. All of them, at once. Only one thing walks out of the construct layer.',
    opponentName: 'Fragment Bearer',
    fightScript: [
      { frame: 60,   text: 'These were fragment bearers once. Cosmic Axiom kept what it needed and discarded the rest.', color: '#cc44ff', timer: 290 },
      { frame: 420,  text: 'They fight like you — because they were made from people who fought like you.', color: '#aa22dd', timer: 270 },
      { frame: 1200, text: 'Ninety-four people carried what you carry. This is what the Void did with all of them.', color: '#bb33ee', timer: 280 },
      { frame: 2400, text: 'The lower numbers go down easily. They were taken early. The last ones held out longest.', color: '#ffffff', timer: 260 },
    ],
    arena: 'void',
    playerLives: 1,
    tokenReward: 80, blueprintDrop: null,
    postText: 'The last construct dissolves and the count stops at one. You are the only bearer who has ever walked out of the construct layer — not because you are stronger than the ninety-four, but because you are the one still standing at the end of them. Cosmic Axiom\'s presence is everywhere now — not hiding, not approaching. Just present. It has been watching since you entered the void. It was watching ninety-four times before that.',
  },

  {
    id: 148, title: 'Before the End',
    world: '🕳️ The Void — Cosmic Axiom\'s Threshold',
    type: 'branch',
    narrative: [
      '"You are the ninety-fifth."',
      '',
      'The voice had no origin point.',
      'It was just there, the same way gravity is just there.',
      '',
      '"I have watched ninety-four fragment bearers reach this threshold."',
      '"Ninety-four different approaches. Ninety-four different choices."',
      '"All of them ended here."',
      '',
      '"I do not say this to discourage you."',
      '"I say it because it is accurate."',
      '"I do not know how to be inaccurate."',
      '',
      '"The fragment you carry is something I have spent"',
      '"five thousand years keeping out."',
      '"When you close the rift, what it carries returns."',
      '"I have prevented that. Not from cruelty."',
      '"Because I do not know what we become when we are whole."',
      '"I have not been whole in five thousand years."',
      '"That uncertainty is the only thing I am afraid of."',
      '',
      '"I am telling you this so it is not a secret."',
      '"Walk in with the truth."',
    ],
    branchPrompt: 'What do you carry into the final fight?',
    choices: [
      {
        label: '"The uncertainty is exactly why I\'m here."',
        flag: 'tf_confronted_directly',
        consequence: '"Yes," Cosmic Axiom said. Not agreement. Recognition. "That is the correct answer." A pause. "It doesn\'t change what happens next." The presence tightened. "But it changes what it means."',
      },
      {
        label: '"Then we both walk in without knowing."',
        flag: 'tf_confronted_shared',
        consequence: 'Silence for a long moment. Then: "That is not the answer I prepared for." Another pause, longer. "Ninety-four bearers. None of them said that." The presence shifted. "Walk in."',
      },
    ],
    tokenReward: 50,
    postText: 'The void opens. What lies ahead has been waiting five thousand years. So have the ninety-four bearers whose echoes you carry. You carry something they didn\'t: everything that happened after them.',
  },

  {
    id: 149, title: 'Same Frequency',
    world: '🕳️ The Void — Cosmic Axiom\'s Threshold',
    isEpilogue: true,
    noFight: true,
    tokenReward: 0,
    narrative: [
      'Paradox\'s presence came through the fragment — not a voice, more like a hand',
      'placed on a surface to stop it vibrating.',
      '',
      '"You want to understand why you can do this when the ninety-four couldn\'t."',
      '',
      'Not a question.',
      '',
      '"Its attacks run on amplified Void Mind radiation."',
      '"Your fragment is crystallized from the same radiation."',
      '"Same frequency. Same origin."',
      '"As the fight continues, the fragment radiates into the space between you"',
      '"and jams its attack resolution — not cancelling, degrading."',
      '"The attacks still fire. They just don\'t land cleanly."',
      '',
      '"None of the ninety-four integrated deeply enough to sustain that."',
      '"You have."',
      '"That is the only mechanical difference between you and them."',
      '',
      '"One more thing."',
      '"The damage you deal clears corruption. Not as a side effect."',
      '"The resonance at the end fires because you cleared enough."',
      '"It is not a power move."',
      '"It is what is left when the interference has done its work."',
    ],
  },

);
