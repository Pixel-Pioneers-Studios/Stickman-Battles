// Void Mind arc — The Trial: "What Is Yours"
// id 165 — inserted between reckoning 8 (ch.164) and the epilogue (ch.166).
//
// The reckonings are over. The Void Mind has a complete map of everything Kael carries.
// Its verdict: none of it is his. Fragment = the Void Mind's own radiation, redirected.
// Classes = the echo of 94 dead bearers. Paradox's phantom blades = a ghost's weapon.
// The kernel = Axiom's. God's essence = inherited. AbsAxiom's = absorbed, not earned.
//
// The Void Mind does not want Kael destroyed. It wants to know if there is anything
// underneath all of that — anything that belongs only to him.
// It offers a vessel: an imitation of itself, limited to the same raw capacity
// that Kael is allowed to use. No fragment amplification. No class powers. No supers.
// No borrowed essence. Only agility, strength, and battle IQ.
//
// If Kael wins, the Void Mind gets its answer. So does Kael.
// The trial is not punishment. It is a question.
//
// Implementation note:
//   strippedPowers: true  → smb-story-engine-flow.js reads this flag before spawning
//                           the player's fighter and sets _storyStrippedPowers = true.
//                           smb-story-engine-frame.js then zeroes super meter gain and
//                           blocks class ability use for this chapter only.
STORY_CHAPTER_REGISTRY.push(

  {
    id: 181, title: 'What Is Yours',
    world: '⬛ The Substrate — The Trial Ground',
    narrative: [
      'The Void Mind spoke for the first time.',
      '',
      'Not through the Substrate.',
      'Not through pressure or implication.',
      'In language. Direct.',
      '',
      '"Eight reckonings. A complete record."',
      '"I know every weight you carry."',
      '"I know where each one came from."',
      '',
      'The fragment in your chest went cold.',
      '',
      '"The fragment is mine."',
      '"Not stolen — given, through a bearer chain"',
      '"that started with ninety-four failures."',
      '"It is not yours. It is me, distributed."',
      '',
      '"The classes are echoes of the dead."',
      '"Every power you draw from them is borrowed from a corpse."',
      '"Their names are in my record. None of them are yours."',
      '',
      '"Paradox\'s blades. Axiom\'s kernel. God\'s essence."',
      '"Collected. Absorbed. Layered."',
      '"None of it originated in you."',
      '',
      'The Substrate was very still.',
      '',
      '"I am not accusing you. I am asking a question."',
      '"Strip every external source."',
      '"What is left?"',
      '"What did you arrive with?"',
      '',
      'A pause.',
      '',
      '"I have built a vessel."',
      '"It carries an imitation of my current state,"',
      '"limited to what I possessed before any of you"',
      '"entered the fracture system."',
      '"Raw structure. Pattern recognition. Endurance."',
      '',
      '"You will meet it on the same terms."',
      '"No fragment. No class echoes."',
      '"No phantom blades. No kernel. No absorbed essence."',
      '"Only what you were before any of this happened."',
      '"Everything you earned — because you learned it,"',
      '"not because you absorbed it from something that died."',
      '',
      '"If there is nothing there, I will know."',
      '"If there is something — I will know that too."',
      '"Either answer is useful."',
      '',
      'The vessel stepped into the trial ground.',
      'Featureless. Patient. Waiting.',
      '',
      'The fragment went silent.',
      'The class echoes went silent.',
      'The kernel went silent.',
      '',
      'And what remained',
      'walked forward to meet it.',
    ],
    preText: 'The Void Mind has stripped your external powers for this fight. No fragment amplification. No class abilities. No supers. Only what you were before all of this. 1 life.',
    fightScript: [
      { frame: 30,  text: '"No fragment. No class. No borrowed power. Only you."', color: '#aa88cc', timer: 340 },
      { frame: 200, text: 'The vessel moves like it already knows how you think. Answer in motion, not calculation.', color: '#8899aa', timer: 300 },
      { frame: 450, text: '"Still here. Good. I needed to see if you would fold early."', color: '#aa88cc', timer: 280 },
      { frame: 700, text: 'No fragment to amplify. No echo to fall back on. The answer is what you do right now.', color: '#7788aa', timer: 300 },
      { frame: 950, text: '"This is not borrowed. This is you. I can see the difference."', color: '#aa88cc', timer: 280 },
      { frame: 1200, text: 'The vessel is not tired. It has no fatigue. You do. That asymmetry is part of the question.', color: '#667799', timer: 280 },
      { frame: 1400, text: '"Almost. Show me the rest."', color: '#aa88cc', timer: 240 },
    ],
    opponentName:   'Void Vessel',
    opponentSuffix: '— an imitation, limited to raw capacity',
    weaponKey:   'combat',
    classKey:    null,
    aiDiff:      'expert',   // was 8.5 — numeric never matches the string checks
                             // in Fighter, which dropped tacticW to the easy-tier 0.18
    playerLives: 1,
    arena:       'void',
    strippedPowers: true,
    tokenReward:    150,
    blueprintDrop:  null,
    postText: 'The vessel collapsed. Not destroyed — resolved, the same way the True Form resolved. It was never trying to survive. It was trying to get an accurate answer. The Void Mind has one now. You crossed the substrate floor, stripped of every borrowed power, and you won. Not because the fragment carried you. Not because God\'s essence steadied your hand. Because the person who fell out of the alley fourteen acts ago, who was afraid and untrained and had nothing, became this. The Void Mind recorded it. The fragment came back online. Everything came back online. But something underneath it was different now. You knew what it felt like to fight with only yourself. And you knew what was there.',
  },

);
