// Void Mind arc — Reckoning I: "What You Know"
// id 157 — The first test. Memory Reconstruction.
//
// The Void Mind does not announce itself. It was here before the fracture system
// and the fracture system existed, in part, to slow its access to structured reality.
// That system is gone now.
//
// The first Reckoning tests the load-bearing belief: Veran's death.
// The Void Mind does not argue. It presents a version and waits.
// Wrong answers do not fail — they propagate. The Substrate reshapes
// to accommodate the false version with perfect internal consistency.
// Correct answers cost something. They require the player to own what happened.
//
// Placement note: this arc runs ids 157–164. The true epilogue ('After', id 165)
// follows. The current epilogue placeholder at id 156 should be renumbered to 165
// before wiring this arc into index.html. See smb-story-finalize.js for act structure.
STORY_CHAPTER_REGISTRY.push(

  {
    id: 163, title: 'What You Know',
    world: '⬛ The Substrate — Below All Dimensions',
    type: 'branch',
    narrative: [
      'After Absolute Axiom, there is no silence.',
      '',
      'There is the absence of whatever silence is made of.',
      '',
      'You have been standing in it long enough to understand',
      'that something is standing in it with you.',
      '',
      'Not a presence.',
      'An attention.',
      '',
      'It has been here longer than the fracture system.',
      'The fracture system existed, in part,',
      'to slow its reach into structured reality.',
      '',
      'That system is gone.',
      '',
      'It does not introduce itself.',
      'It does not need to.',
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
      'You acted on what the situation required.',
      'The guilt you have carried since is misplaced.',
      '',
      'The version is internally consistent.',
      'Every fact the figure named was real.',
      'The real facts now point here.',
      '',
      'The Void Mind does not argue.',
      'It has simply shown you the alternative.',
    ],
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
