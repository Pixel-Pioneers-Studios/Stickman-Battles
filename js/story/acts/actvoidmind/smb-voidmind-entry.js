// Void Mind arc — Entry: "Into the Substrate"
// id 156 — The transition from ch.155 ("After Everything") into the Void Mind's domain.
//
// Absolute Axiom is gone. The domain has gone quiet. The player expects silence.
// What they find instead is an attention — patient, vast, already present.
//
// This chapter is narrative only (no fight, no choices) — it establishes that
// the Void Mind has been here the entire time and that the reckonings are beginning.
//
// Placement: sits between ch.155 and the Reckoning arc (157–164).
// The act structure in smb-story-finalize.js registers this as the first chapter
// of Act X — The Substrate.
STORY_CHAPTER_REGISTRY.push(

  {
    id: 166, title: 'Into the Substrate',
    world: '⬛ The Substrate — Below All Dimensions',
    type: 'branch',
    isEpilogue: false,
    narrative: [
      'The domain went quiet.',
      '',
      'Not the quiet after a fight.',
      'Not the quiet after God\'s voice stopped.',
      '',
      'This was the quiet underneath.',
      'The part that had been there before any of it started.',
      '',
      'The fragment was still for the first time in the story.',
      'Not responding. Not amplifying. Still.',
      'As if it had recognized where it was',
      'and decided that was enough.',
      '',
      'You became aware of something.',
      '',
      'Not a presence.',
      'Not a threat.',
      '',
      'An attention.',
      '',
      'The kind that doesn\'t announce itself',
      'because it has never needed to.',
      'The kind that has been watching every dimension',
      'since before Axiom punched through reality',
      'and woke it up.',
      '',
      'The fracture system slowed it.',
      'The fracture system is gone.',
      '',
      'You understand, standing here in the Substrate,',
      'that the entire war —',
      'the scouts, the fractures, the Creator, the True Form,',
      'every decision Axiom made across five thousand years —',
      'was built in the shadow of this.',
      '',
      'Not against you.',
      'Not for you.',
      'Against this.',
      'And now both of you are here.',
      '',
      'The Substrate does not speak.',
      'It does not need to.',
      '',
      'Something begins.',
    ],
    branchPrompt: 'The Substrate. Below all dimensions. Something has been waiting here since the fracture system existed — and now the fracture system is gone.',
    choices: [
      {
        label: 'You stay.',
        flag: 'substrate_entered_standing',
        consequence: 'The Substrate registered this. Not as courage — as data. Something that does not announce itself is also something that does not threaten unnecessarily. You are still standing in the oldest space in existence and it has not moved toward you and you have not moved away. The fragment held steady. The attention settled into something that felt less like a predator choosing its moment and more like an examiner who has seen ninety-four of these and is deciding whether the ninety-fifth is worth its full capacity. The reckonings begin.',
      },
      {
        label: 'You stay. But you know what this is.',
        flag: 'substrate_entered_knowing',
        consequence: 'The Substrate registered this too. You named what it was before it named itself — a thing that has been operating in the background of everything since before the war started. The fragment responded slightly. Not amplifying. Acknowledging. The attention noted that you arrived with the correct account of what it is. This is either an advantage or irrelevant. You will find out which. The reckonings begin.',
      },
    ],
    tokenReward: 0,
    postText: 'The Substrate is not a place the fracture network built. It is not an arena. It is the floor beneath every floor — the layer the Void Mind has occupied since before dimensions had edges. You are standing in it without armor, without a collector node to route you back, without infrastructure. What you carry in is what you have. The reckonings begin.',
  },

);
