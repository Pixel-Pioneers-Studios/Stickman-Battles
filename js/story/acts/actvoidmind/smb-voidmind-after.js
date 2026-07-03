// Void Mind arc — Epilogue: "After"
// id 165
//
// The reckonings are complete. The player walks out of the Substrate.
// This is not a victory. The Void Mind is not defeated here — that fight
// has not happened yet. This is the end of the assessment.
// The player carries whatever they carried in, plus what the reckonings
// added to the record — gaps identified, weights acknowledged or surrendered.
//
// Thematically: the fragment goes still. Not responding to anything outside.
// Responding to the player. Just them. The first time this has been true.
// This is what peak form was pointing toward.
//
// No choices. No fight. Just what remains.
STORY_CHAPTER_REGISTRY.push(

  {
    id: 180, title: 'After',
    world: '⬛ The Substrate — The Threshold',
    type: 'branch',
    isEpilogue: false,
    narrative: [
      'The Substrate released you the same way it received you.',
      '',
      'Without comment.',
      '',
      'No announcement. No threshold crossed.',
      'One moment you were standing in the oldest space.',
      'The next you were outside it,',
      'in whatever dimension sits closest to the Substrate\'s edge.',
      '',
      'The attention withdrew.',
      'Not because you defeated it.',
      'Because the assessment was complete.',
      '',
      'The reckonings were never a fight.',
      'They were a record.',
      '',
      'Eight questions.',
      'Eight maps of what resisted and what moved.',
      'A complete account of what you carry',
      'and how firmly.',
      '',
      'The Void Mind has what it came for.',
      'So do you.',
      '',
      'You know what held.',
      'You know what cost something to answer.',
      'You know what you gave and what you kept.',
      '',
      'The fragment was still.',
      '',
      'Not responding to a threat.',
      'Not amplifying for a fight.',
      'Not reading the environment and calibrating.',
      '',
      'Still.',
      '',
      'For the first time since you had carried it,',
      'it was not responding to anything outside you.',
      '',
      'It was responding to you.',
      'Just you.',
      '',
      'Like something that had been waiting a long time',
      'to be still.',
      '',
      'The war between Axiom and his former companions',
      'had run for five thousand years.',
      'The fracture system was gone.',
      'God\'s domain was rewritten.',
      'Absolute Axiom was defeated.',
      '',
      'The Void Mind was still out there.',
      '',
      'Still in the Substrate.',
      'Still patient.',
      'Still holding the map of what it learned',
      'from the ninety-fifth bearer',
      'who arrived unlike any of the others.',
      '',
      'It would not wait forever.',
      '',
      'But you had what you came with,',
      'minus what the reckonings took',
      'and plus what they proved.',
      '',
      'You knew what held.',
      '',
      'When it mattered — and it would matter — you would know',
      'exactly which things you were still carrying',
      'and why.',
    ],
    branchPrompt: 'The reckonings are complete. You carry what you carried — minus what was given, plus what was proven. The Void Mind has its map. You have yours.',
    choices: [
      {
        label: 'You carry what held.',
        flag: 'substrate_exited_intact',
        consequence: 'The record is closed. What held during the reckonings held because it was accurate — the accounts that resisted the false versions, the names that stayed specific, the weights that were named when picked up. The Void Mind has a map that shows what is load-bearing in you. You have the same map. The difference is what you will do with it when the assessment becomes a fight. The fragment is still. The Substrate is behind you. You know what you have.',
      },
      {
        label: 'You carry what held. And you know what changed.',
        flag: 'substrate_exited_marked',
        consequence: 'The record is closed. Some accounts were given. Some were admitted uncertain. What remains is still present — but the Void Mind has the shape of the gaps. You have that shape too. That is not defeat. Knowing where the pressure found purchase is more useful than not knowing. The fragment is still. The Substrate is behind you. The fight that is coming will use what the reckonings mapped. You know what it found. So do you.',
      },
    ],
    tokenReward: 100,
    postText: 'The assessment is complete. The Void Mind has its map. You have yours. What comes next is not the reckonings. The Void Mind is still in the Substrate. It has not withdrawn. It has decided.',
  },

);
