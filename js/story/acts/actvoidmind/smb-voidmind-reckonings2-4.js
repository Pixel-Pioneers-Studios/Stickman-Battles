// Void Mind arc — Reckonings II, III, IV
// ids 158, 159, 160
//
// The Void Mind does not argue. It presents versions.
// Each reckoning targets a specific load-bearing belief.
// Wrong answers do not fail — they propagate. Correct answers cost something.
//
// II  — "The Work They Left"     (the Third Architect's choice)
// III — "What Was Left"          (the Herald of Nothing's dissolution)
// IV  — "Their Names"            (Null, Seraph, VAEL — what they kept)
STORY_CHAPTER_REGISTRY.push(

  // ────────────────────────────────────────────────────────────────────────────
  // RECKONING II — "The Work They Left"
  // Target memory: The Third Architect opened the prison to free the Preserved.
  // They named the calculation explicitly. Fifty-two dimensions against the mission.
  // The Void Mind presents: the liberation was tactical cover. Sabotage dressed as ethics.
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 174, title: 'The Work They Left',
    world: '⬛ The Substrate — Below All Dimensions',
    type: 'branch',
    narrative: [
      'Another memory surfaces.',
      '',
      'The Third Architect.',
      'The moment they opened the prison.',
      '',
      'In the version you carry:',
      'they named the calculation before they acted.',
      'Fifty-two dimensions against the mission.',
      'They said it out loud.',
      'They knew what it would cost.',
      '',
      'The Substrate offers a second version.',
      '',
      'In this version,',
      'the liberation was not the act.',
      'The act was stopping you.',
      '',
      'The Preserved were never the point.',
      'The point was derailing a mission',
      'they no longer believed in.',
      'They needed a justification large enough',
      'that you could not dismiss it outright.',
      'Fifty-two dimensions of people',
      'is exactly that size.',
      '',
      'The calculation they named was real.',
      'The reason behind the calculation was not.',
      '',
      'They said fifty-two dimensions.',
      'What they meant was: I think this is wrong',
      'and I am going to stop it',
      'and this is what I will say was the reason.',
      '',
      'The Void Mind does not argue.',
      'It presents the version.',
      'Both accounts use the same facts.',
      'The difference is what was underneath them.',
    ],
    branchPrompt: '"They said it was for the Preserved. The calculation was the justification, not the reason. They didn\'t believe in the mission. The fifty-two were the cover story."',
    choices: [
      {
        label: '"No. They named the cost before they paid it. That\'s not cover — that\'s accounting."',
        flag: 'reckoning2_held',
        consequence: 'The Substrate holds this. The version does not dissolve — it recedes. What remains: a being who made a calculation they disagreed with and said so, who named what they were exchanging and why, who stepped through a portal afterward and has not been seen since. The doubt the Void Mind introduced does not disappear. It sits alongside the original memory and asks whether naming a cost is the same as having the cost be the real reason. You carry both. The Void Mind notes the answer. Six more remain.',
      },
      {
        label: '"They stopped believing. The mission was the real sacrifice."',
        flag: 'reckoning2_accepted',
        consequence: 'The Substrate accepts this. The Third Architect\'s sacrifice reshapes. The moment they opened the prison becomes the moment they abandoned the mission with a story prepared. The Preserved\'s testimony — "Tell them we exist" — remains real. Their liberation remains real. But the act that freed them was not moral courage. It was motivated refusal, dressed for a record that would be sympathetic. The Third Architect is still gone. What they were going for when they left is now unclear. The Void Mind notes the answer. Six more remain.',
      },
    ],
    tokenReward: 0,
    postText: 'The Third Architect named fifty-two dimensions and stepped through a portal. Whether that naming was a record or a justification — the Substrate has noted which version you carry. The Preserved are still there, still real, still alive in dimensions that would otherwise have been absorbed. What motivated their liberation does not change that they were liberated. The Void Mind\'s interest was never in the outcome. It was in the account.',
  },

  // ────────────────────────────────────────────────────────────────────────────
  // RECKONING III — "What Was Left"
  // Target memory: the Herald of Nothing fought seriously, then chose to dissolve
  // when the rift closed. They said "I had hoped someone would" — hope requires
  // something left to hope.
  // The Void Mind presents: nothing was left to hope. Behavioral residue
  // performed the syntax of hope because hope was part of the pattern
  // Axiom extracted and left behind. The dissolution was not a second death.
  // It was the first finality completing.
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 175, title: 'What Was Left',
    world: '⬛ The Substrate — Below All Dimensions',
    type: 'branch',
    narrative: [
      'Another memory.',
      '',
      'The Herald of Nothing.',
      'The rift\'s final guardian.',
      'Former bearer. Shell that survived the extraction.',
      '',
      'In the version you carry:',
      'they fought seriously because a real fight was meaningful.',
      'They saw your fragment and said',
      '"You still have yours. I had hoped someone would."',
      'When the rift closed, they dissolved.',
      'That dissolution was their choice.',
      '',
      'The Substrate offers a second version.',
      '',
      'In this version,',
      'there was not enough left to choose.',
      '',
      'Axiom\'s extraction degraded the identity to near-nothing.',
      'The shell continued to function —',
      'behavioral patterns without a center.',
      'The combat was residue: fight-patterns',
      'running in the absence of the person who learned them.',
      '',
      'The sentence "I had hoped someone would" —',
      'not hope.',
      'The syntax of hope, run by a pattern that once used hope',
      'and produced the structure without the content.',
      '',
      'The dissolution was not a second death.',
      'It was the first finality completing.',
      'The extraction took everything.',
      'The rift gave the empty shell a direction.',
      'When the direction ended, the shell ended.',
      '',
      'There was no one in there to make a second choice.',
    ],
    branchPrompt: '"There was nothing left to choose. Behavioral residue doesn\'t hope. The combat was the last echo running. The dissolution wasn\'t chosen. It was what happens when the last pattern runs out."',
    choices: [
      {
        label: '"No. Residue doesn\'t hope. Residue completes its last instruction and stops. It doesn\'t reach for a future it won\'t see."',
        flag: 'reckoning3_held',
        consequence: 'The account holds. The Herald\'s sentence is examined: "I had hoped someone would" is future-oriented. It is not a record of the past. It is an investment in something coming after the speaker ends. Residue doesn\'t invest. Residue runs the last motion and falls still. Whatever produced that sentence was still capable of wanting something to happen in a world they would not be present in. That is not nothing. The Void Mind notes the answer. Five more remain.',
      },
      {
        label: '"The pattern was sophisticated enough to simulate it. I can\'t know the difference from the outside."',
        flag: 'reckoning3_accepted',
        consequence: 'The Substrate accepts the uncertainty. The Herald\'s hope becomes ambiguous — possibly genuine, possibly the last complex pattern Axiom\'s extraction left functional before it went quiet. The fight they gave you was still real. The sentence they said was still spoken. But whether anyone was speaking it, or whether the speech was the final echo of someone who had already been gone for decades — that is now uncertain. The Void Mind notes the answer. Five more remain.',
      },
    ],
    tokenReward: 0,
    postText: 'The Herald dissolved when the rift closed. Whether that was a person making a second choice or a pattern reaching its end depends on whether enough remained to be a person. The Void Mind\'s interest was in whether your account allows for the possibility that the Herald was already gone. It noted what you gave it.',
  },

  // ────────────────────────────────────────────────────────────────────────────
  // RECKONING IV — "Their Names"
  // Target memory: Null (Anders), Seraph, VAEL — Axiom's original companions.
  // They kept their names. The prequel showed they were people with specific
  // personalities, relationships, commitments. They became monsters after the
  // void contact but still fought each other — which implies something
  // real enough to conflict.
  // The Void Mind presents: a name is not a person. The void erased the people.
  // What followed were behavioral patterns using their names as labels.
  // The conflict is not evidence of personhood — patterns can conflict.
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 176, title: 'Their Names',
    world: '⬛ The Substrate — Below All Dimensions',
    type: 'branch',
    narrative: [
      'Another memory.',
      '',
      'Three names.',
      '',
      'Null — who was Anders.',
      'Seraph — who was Seraph.',
      'VAEL — who was VAEL.',
      '',
      'They punched through reality with Axiom.',
      'They made contact with the void.',
      'They survived — not intact, but surviving.',
      'They kept their names.',
      '',
      'In the version you carry:',
      'they were heroes who became monsters.',
      'Something real enough remained',
      'that the monsters spent five thousand years',
      'in irreconcilable conflict with each other.',
      '',
      'The Substrate offers a second version.',
      '',
      'In this version,',
      'a name is not a person.',
      '',
      'What the void contact erased was the people.',
      'What emerged was the behavioral architecture —',
      'the patterns learned across years of living,',
      'the reflexes of friendship and rivalry and trust,',
      'still running without the center that made them meaningful.',
      '',
      'Null fights Seraph because Anders and Seraph had specific tensions.',
      'Those tensions are baked into the pattern.',
      'The conflict is not evidence of personhood.',
      'It is a conflict between patterns that remember conflict.',
      '',
      'They kept the names because the patterns that generated the names',
      'are still running.',
      'A pattern can be named.',
      'A name is not proof of the person who owned it.',
    ],
    branchPrompt: '"They kept their names and nothing else. The void took everything. The war between them is pattern-conflict — systems that remember being in tension. It isn\'t evidence of anyone still being there."',
    choices: [
      {
        label: '"Patterns don\'t refuse. They fought Axiom — their maker. That\'s not a conflict between patterns. That\'s something deciding to go against the system that built it."',
        flag: 'reckoning4_held',
        consequence: 'The account stands. A pattern that has the refusal-of-maker built in as a behavior is still only running its programming. But something that generates new refusal — in the specific direction of the entity that shaped it, against the stated logic of its own construction — is at the edge of what "pattern" means as an explanation. You can\'t know what they were from this distance. But the specific direction of their conflict is not reducible to learned-tension replay. The Void Mind notes the answer. Four more remain.',
      },
      {
        label: '"They kept their names. I can\'t reach backward through five thousand years and know what that means."',
        flag: 'reckoning4_accepted',
        consequence: 'The Substrate accepts the admission. The companions become uncertain. Not erased — but the certainty of their personhood goes soft. The prequel\'s conversations were still spoken. Anders\' trust, Seraph\'s giving, VAEL\'s forward motion — these still happened. But whether they happened to people or within patterns carrying the echoes of people is now unresolved. They kept their names. What kept the names with them is less clear. The Void Mind notes the answer. Four more remain.',
      },
    ],
    tokenReward: 0,
    postText: 'Three people stepped through the void. Three names came out. What was attached to those names when they emerged — and what remained attached over five thousand years of war — is the question the Void Mind introduced into the record. You gave it an answer. It noted the answer. The names are still the names.',
  },

);
