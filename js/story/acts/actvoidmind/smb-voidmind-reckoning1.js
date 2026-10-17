// Void Mind arc, Reckoning I: What You Know
// id 171, the first test: Memory Reconstruction.
// Wrong answers propagate into a consistent false version. Correct answers cost the player something.
//
// Lives at ids 171+. Ids must stay contiguous, so check CLAUDE.md before moving one.
STORY_CHAPTER_REGISTRY.push(

  {
    id: 173, title: 'What You Know',
    world: '⬛ The Substrate — Below All Dimensions',
    type: 'branch',
    narrative: [
      'It does not introduce itself.',
      'You have been carrying the shape of it',
      'since before you knew what the scar was for.',
      '',
      'It does not speak.',
      '',
      'A memory surfaces.',
      'Not yours.',
      'A version of yours.',
      '',
      'In this version,',
      'she was going to betray the mission.',
      'The hooded figure on the ridge was not constructing a murder.',
      'It was delivering accurate intelligence.',
      'The guilt you have carried since is misplaced.',
      '',
      'Every fact the figure named was real.',
      'The real facts now point here.',
      '',
      'The Void Mind does not argue.',
      'It has simply shown you the alternative.',
    ],
    // Playable beat, see _playChapterBeat in smb-story-engine-flow.js.
    beat: {
      arena: 'void', levelId: 181,
      opponentName: 'The Hooded Figure', opponentSuffix: '— the version the Void Mind offers', opponentColor: '#26202e',
      weaponKey: 'sword', classKey: 'ninja', aiDiff: 'medium',
      preText: 'It does not argue. It stands in the shape of the version and waits.',
      fightScript: [
        { frame: 40,  text: 'It stands the way the figure stood on the ridge. Every fact it carries is real.', color: '#8877aa', timer: 300 },
        { frame: 420, text: 'The version is not a lie. That is what makes it heavy. Decide what you will do with the weight.', color: '#9988bb', timer: 300 },
      ],
      beatScale: 0.6,
      playerLives: 5,
    },
    branchPrompt: '"She was going to betray the mission. The intelligence was accurate. What you did was necessary. The guilt was never yours."',
    choices: [
      {
        label: '"No. Axiom built that belief from truths I couldn\'t disprove."',
        flag: 'reckoning1_held',
        consequence: 'The space does not reward this. It does not shift or brighten or give you anything. It holds. The false version does not dissolve — it recedes. What remains is the actual record: a manipulation sophisticated enough that you could not have known. Real facts assembled into a false conclusion by something that had been watching ninety-four bearers before you and understood exactly which truths to select. The guilt returns. Not the misplaced kind. The correct kind. The Void Mind notes the answer the way a system logs a value. It was not testing what you feel. It was testing whether the record you carry matches what actually happened.',
      },
      {
        label: '"I did what I had to do. I can live with it."',
        flag: 'reckoning1_accepted',
        consequence: 'The space accepts this. It fills in the rest. The version where she was a traitor is now the version. Not a lie replaced by a lie — a reality replaced by another reality. The memorial in the home city exists in the new arrangement as a tactical notation. COST. Not NAME. The guilt dissolves. Everything from her death forward reshuffles into coherent logic: the figure on the ridge was accurate, not manipulative; you acted correctly; there was nothing to grieve that wasn\'t already lost before you arrived. The record is clean. The record is wrong. The Void Mind does not correct you. It notes the answer, notes what you accepted, and moves on. It has seven more of these.',
      },
    ],
    tokenReward: 0,
    postText: 'The Substrate holds whatever shape it has taken. The Void Mind has not congratulated you or punished you. It was not measuring resolve. It was measuring accuracy. Whether the version of events you carry can be loosened — whether the right pressure in the right place finds a gap. It has noted the answer. Seven more remain.',
  },

);
