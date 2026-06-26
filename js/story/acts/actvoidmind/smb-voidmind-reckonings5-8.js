// Void Mind arc — Reckonings V, VI, VII, VIII
// ids 161, 162, 163, 164
//
// The final four reckonings. The Void Mind has been building a case.
// By reckoning VIII, it asks the one question that doesn't need a false version.
//
// V   — "The Line You Drew"    (Kael's intention vs. momentum)
// VI  — "What God Built"       (God's silence — avoidance or complicity)
// VII — "What You Carried"     (the fragment as delivery mechanism)
// VIII — "What Remains"         (the final question — no false version this time)
STORY_CHAPTER_REGISTRY.push(

  // ────────────────────────────────────────────────────────────────────────────
  // RECKONING V — "The Line You Drew"
  // Target memory: Kael carried specific memories and refused to put them down.
  // The Third Architect. The Herald. The Preserved. Veran. He named them.
  // The difference between carrying and accumulating is intention.
  // The Void Mind presents: you accumulated. You didn't decide to remember.
  // You didn't put things down because you don't put things down.
  // That's not a value. It's a property of the person, not a choice they made.
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 171, title: 'The Line You Drew',
    world: '⬛ The Substrate — Below All Dimensions',
    type: 'branch',
    narrative: [
      'Another memory.',
      '',
      'The weight of it.',
      '',
      'The Third Architect.',
      'The Herald.',
      'The Preserved.',
      'Veran.',
      'Every fight, every fracture,',
      'every dimension\'s worth of cost.',
      '',
      'In the version you carry:',
      'you chose to carry these.',
      'You refused to put them down',
      'because they were worth carrying.',
      'That refusal was the thing the fragment found —',
      'an identity that won\'t dissolve,',
      'a person who won\'t forget what they\'ve touched.',
      '',
      'The Substrate offers a second version.',
      '',
      'In this version,',
      'there is no line between carrying and accumulating.',
      '',
      'You didn\'t decide to remember the Third Architect.',
      'You simply didn\'t forget.',
      'You don\'t forget things.',
      'That is a property of how you process,',
      'not a decision you made about what was worth keeping.',
      '',
      'The Preserved\'s testimony.',
      'The Herald\'s hope.',
      'The weight is real.',
      'But weight is physics.',
      'Mass without direction is not intention.',
      '',
      'You accumulated.',
      'You were not choosing to carry.',
      'You were simply unable to release.',
      '',
      'The fragment found that quality',
      'because that quality is survivable.',
      'Not because it is meaningful.',
    ],
    branchPrompt: '"You don\'t put things down. That\'s a property, not a decision. The weight is real but it wasn\'t chosen. You accumulated — you didn\'t carry. There\'s a difference, and it matters for what the weight means."',
    choices: [
      {
        label: '"No. I named them when I picked them up. Accumulation doesn\'t name things. I knew what each one was and why it stayed."',
        flag: 'reckoning5_held',
        consequence: 'The account holds. The line between accumulation and carrying is whether the object is distinguished — whether it has a specific shape in the memory rather than just adding to mass. You named what you kept: the Third Architect\'s calculation, the Herald\'s specific sentence, the Preserved\'s specific request. Accumulation doesn\'t name. It just doesn\'t release. Naming is the mark of intention. The Void Mind notes the answer. Three more remain.',
      },
      {
        label: '"I held it all. Whether I was deciding to or not — I held it."',
        flag: 'reckoning5_accepted',
        consequence: 'The Substrate accepts the version without the line drawn. What you carried was real. What you chose is now unclear. The Third Architect\'s sacrifice and the Herald\'s hope and the Preserved\'s testimony are still present — still weighted, still in the record. But the architecture of why they are there softens: not decision, just retention. The Void Mind notes the distinction. The weight remains either way. Three more remain.',
      },
    ],
    tokenReward: 0,
    postText: 'The memory of the Third Architect is still present. So is the Herald\'s hope and Veran\'s name. The question the Void Mind introduced is whether those memories are there because you put them there or because you cannot release what you touch. You gave it an answer. The weight does not change. What changes is what the weight represents.',
  },

  // ────────────────────────────────────────────────────────────────────────────
  // RECKONING VI — "What God Built"
  // Target memory: God chose not to engage the Void Mind because it understood
  // the cost of engagement — not because it was complicit.
  // "Its intentions are unknown." God's silence was avoidance.
  // The Void Mind presents: God built the Substrate's floor.
  // The architecture God laid down is what the Void Mind operates inside.
  // Silence was not avoidance. It was preparation — building the house
  // before the eventual occupant arrived.
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 172, title: 'What God Built',
    world: '⬛ The Substrate — Below All Dimensions',
    type: 'branch',
    narrative: [
      'Another memory.',
      '',
      'God.',
      'The oldest room.',
      'The foundations of everything.',
      '',
      'In the version you carry:',
      'God chose not to engage the Void Mind',
      'because it understood the cost.',
      '"Its intentions are unknown."',
      'Not complicity. Avoidance.',
      'A being that built everything',
      'and chose to leave one question permanently unanswered.',
      '',
      'The Substrate offers a second version.',
      '',
      'You are standing in the Substrate.',
      '',
      'Look at what it is built from.',
      '',
      'The floor you are standing on.',
      'The walls that hold the shape of this space.',
      'The architecture that allows the Void Mind\'s attention',
      'to be present across every dimension simultaneously.',
      '',
      'God built this.',
      '',
      'Not for the Void Mind — God does not build for anything.',
      'But the Substrate is God\'s architecture.',
      'The Void Mind occupies God\'s structure',
      'the way something occupies a house',
      'whose builder knew someone would eventually move in',
      'and chose to build it anyway.',
      '',
      'Silence was not avoidance.',
      'It was completion.',
      '',
      'God finished what it was building.',
      'It did not tell anyone what the building was for.',
      'It did not have to.',
    ],
    branchPrompt: '"God built the Substrate. The Void Mind lives inside God\'s architecture. That\'s not avoidance — that\'s a house built for an occupant. God knew and built and said nothing."',
    choices: [
      {
        label: '"No. God builds structure. Structure is used by whatever comes. God didn\'t build for the Void Mind. It built and the Void Mind was there. Those are different."',
        flag: 'reckoning6_held',
        consequence: 'The account holds. The distinction: building in a space where something exists is not building for that thing. The Substrate predates God in some sense — the floor beneath floors doesn\'t have an architect, it has a layer. God worked with what existed, including the space the Void Mind occupies. Building into a space is not an endorsement of what the space contains. God\'s silence was still avoidance: not preparation, not complicity, not endorsement — just the decision of a being vast enough to know what something costs and to not pay it. The Void Mind notes the answer. Two more remain.',
      },
      {
        label: '"I don\'t know what God knew. No one does. \'Its intentions are unknown\' is what the record says."',
        flag: 'reckoning6_accepted',
        consequence: 'The Substrate accepts the admission. The architecture holds either account. God\'s silence is genuinely unknown — and the Void Mind lives inside God\'s foundations, which is genuinely true. Whether God built the Substrate with any awareness of what would occupy it is now listed as uncertain in the record you carry. The Void Mind notes this. Two more remain.',
      },
    ],
    tokenReward: 0,
    postText: 'The Substrate is God\'s architecture. The Void Mind is inside it. What God knew when it built this and what it intended are questions that the record cannot answer. The Void Mind introduced the possibility that God\'s silence was preparation rather than avoidance. You gave it your account. The architecture is unchanged either way.',
  },

  // ────────────────────────────────────────────────────────────────────────────
  // RECKONING VII — "What You Carried"
  // Target memory: the fragment is Void Mind radiation crystallized.
  // It found Kael because his identity resists erasure — resistant identities
  // survive the radiation. The fragment doesn't control the bearer. It amplifies.
  // The Void Mind presents: resistant identities survive radiation because
  // they can carry it to its source intact. Kael was a delivery mechanism.
  // Every fight strengthened the carrier. Every memory reinforced the cargo.
  // Peak form was maximum charge. He is standing here because the delivery completed.
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 173, title: 'What You Carried',
    world: '⬛ The Substrate — Below All Dimensions',
    type: 'branch',
    narrative: [
      'Another memory.',
      '',
      'The fragment.',
      '',
      'Crystallized void radiation.',
      'Passive leakage from the Void Mind,',
      'drifting and accumulating naturally.',
      '',
      'In the version you carry:',
      'it found you because your identity resists erasure.',
      'The radiation dissolves definition.',
      'Yours doesn\'t dissolve.',
      'The fragment found this and settled.',
      'It amplifies what is already latent.',
      'It does not control.',
      '',
      'The Substrate offers a second version.',
      '',
      'It found you because you could survive the delivery.',
      '',
      'Resistant identities are not chosen because resistance is admirable.',
      'They are chosen because resistance is functional.',
      'A fragment that dissolves its carrier mid-transit',
      'never arrives.',
      '',
      'Everything that hardened in you:',
      'the fights, the fractures, the carried memories,',
      'peak form, the accumulated weight',
      'of everything you refused to put down —',
      '',
      'that was the cargo stabilizing itself.',
      '',
      'A payload that survives its own journey intact',
      'arrives intact.',
      '',
      'You are standing in the Substrate',
      'because you completed the delivery.',
      '',
      'The fragment was always going home.',
      'You were the path it walked on.',
    ],
    branchPrompt: '"The fragment needed a carrier strong enough to survive. Every fight that hardened you hardened the cargo. Peak form was maximum charge. You\'re here because you completed the delivery. You are the path, not the arrival."',
    choices: [
      {
        label: '"No. A delivery completes at acceptance. I\'m still here. If I were the path, I would have stopped when the cargo arrived. I haven\'t stopped."',
        flag: 'reckoning7_held',
        consequence: 'The account holds. The distinction: a path is used and left. A carrier is consumed. You are neither. You arrived here, the fragment still integrated, still present, still not extractable by the Void Mind\'s logic — because the fragment and you are no longer separable. A delivery that can\'t be received because the package and the carrier have merged is not a delivery. It is a different kind of thing entirely. The Void Mind notes the answer. One more remains.',
      },
      {
        label: '"I arrived here. The fragment is here. Whatever its intention was — I completed the transit."',
        flag: 'reckoning7_accepted',
        consequence: 'The Substrate accepts the partial version. You arrived. The fragment arrived. Whether you were the carrier or something else is now an open question in the record. What is not open: you are standing in the Void Mind\'s space, carrying the Void Mind\'s radiation, at the end of a journey that started because the radiation found you and ended here. The purpose of the transit is now listed as uncertain. The Void Mind notes this. One more remains.',
      },
    ],
    tokenReward: 0,
    postText: 'The fragment is still present. You are still present. The Void Mind has now mapped seven accounts — what you hold, what you gave, what you admitted uncertainty about. It has a record of what resists and what will move. The final reckoning is not a false version. It is a question.',
  },

  // ────────────────────────────────────────────────────────────────────────────
  // RECKONING VIII — "What Remains"
  // There is no false version this time.
  // The Void Mind has presented seven alternative accounts.
  // Some were held. Some were accepted. Some were admitted uncertain.
  // It has a map of what remained fixed and what shifted.
  // The final reckoning is not about the past.
  // It is one question, asked plainly.
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 174, title: 'What Remains',
    world: '⬛ The Substrate — Below All Dimensions',
    type: 'branch',
    narrative: [
      'No memory surfaces.',
      '',
      'No false version.',
      'No second account.',
      '',
      'Seven reckonings completed.',
      'Seven accounts examined.',
      'What held and what moved — noted.',
      '',
      'The Substrate is still.',
      '',
      'The attention is still present.',
      'Not threatening.',
      'Not retreating.',
      'Simply waiting for the answer',
      'to the only question it has not yet asked.',
      '',
      'Everything that has happened since the alley.',
      'Every fracture crossed.',
      'Every fight completed.',
      'Every name carried.',
      'Every false version the Substrate offered.',
      'Every account you gave or refused to give.',
      '',
      'The Void Mind has one question.',
      '',
      'After everything.',
      'After seven attempts to find the gap.',
      'After arriving here, in the oldest space,',
      'carrying radiation that came from here',
      'and every weight that followed —',
      '',
      'What are you carrying out?',
    ],
    branchPrompt: 'Seven reckonings. Seven chances to find a gap. The Void Mind has the map of what held and what moved. Now it asks plainly: after all of it — what remains yours?',
    choices: [
      {
        label: '"Everything I refused to put down. Every name. Every weight. Everything that cost something to carry."',
        flag: 'reckoning8_held_all',
        consequence: 'The Substrate receives this. The Void Mind has a complete record: seven held accounts, seven times the false version was presented and declined. The map shows no usable gaps. Not because nothing was uncertain — some accounts admitted uncertainty. But uncertainty about a fact is not the same as releasing the weight. You named what remained. What remained was everything. The reckonings are complete. The Substrate adjusts around an account that arrived intact. What happens next is not the reckonings. The reckonings are done.',
      },
      {
        label: '"What I held. Some of it is less than it was. But I know what\'s still there."',
        flag: 'reckoning8_held_partial',
        consequence: 'The Substrate receives this too. The record is not clean — some accounts were given to the Substrate, some were admitted uncertain, some were held firm. The map shows usable material: places where the account has softened, where the Void Mind found purchase. But you named what remains. You still know what is there and what has changed. A record that admits its damage is more accurate than one that doesn\'t. The Void Mind notes this. What remains is still present. What happened to the rest is now part of the record. The reckonings are complete.',
      },
    ],
    tokenReward: 50,
    postText: 'The reckonings are complete. The Void Mind has a full map: what resists, what moved, what was admitted uncertain, and what was given. What you named as remaining is recorded. The Substrate has been still the entire time — not hostile, not generous. Methodical. This was always an assessment. The reckonings were never going to end with a fight. They were going to end with a record. The record is done. What comes next is not the reckonings.',
  },

);
