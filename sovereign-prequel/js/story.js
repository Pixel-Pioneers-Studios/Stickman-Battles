'use strict';

// ─── Chapters ─────────────────────────────────────────────────────────────────
// Beat sheet: docs/sovereign-prequel-structure.md (ids 0–19).
// Only chapters flagged `built: true` are playable; the rest are declared so the
// chapter select shows the true shape of the game and nothing gets renumbered
// later. Types 'read', 'play' and 'ledger' are not implemented yet.
//
// He is never named on screen. `speaker: 'him'` draws a bubble with no label.

const CHAPTERS = [

  // ════════════════════════════════════════════════════════════════════════════
  // 0 — INTERLUDE: "Rain Before It Rains"
  // He says things a beat early. Nobody notices but him. No Tuesday — that word
  // belongs to Kael and Axiom, and a third use spends it.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 0, type: 'interlude', built: true,
    title: 'BEFORE', subtitle: 'Rain Before It Rains',
    width: 1900, background: 'village_dusk',
    sovStart: { x: 90, y: 360 },
    platforms: [{ x: 0, y: 452, w: 1900, h: 88, isFloor: true }],
    actors: [
      { name: 'jorrin', x: 700,  y: 368, facing: -1 },
      { name: 'elder',  x: 1340, y: 368, facing: -1 },
    ],
    endTriggerX: 1800,
    dialogues: [
      { x: 150,  text: 'A village with no name worth writing down.',                duration: 210 },
      { x: 330,  text: 'Evening. The sky is clear, and will stay clear two days.',  duration: 230 },
      { x: 560,  speaker: 'jorrin', text: 'Clear as glass. We\'ve two days yet.',   duration: 230 },
      { x: 680,  speaker: 'him',    text: 'Bring the sheaves in tonight.',          duration: 230 },
      { x: 800,  speaker: 'jorrin', text: 'Tonight? There\'s no cloud in it.',      duration: 240 },
      { x: 940,  text: 'He did not explain. He never had one that fit in a sentence.', duration: 260 },
      { x: 1130, text: 'The rain started before the lamps were lit.',               duration: 240 },
      { x: 1330, speaker: 'elder',  text: 'Lucky guess, that.',                     duration: 220 },
      { x: 1450, speaker: 'him',    text: 'Yes.',                                   duration: 180 },
      { x: 1620, text: 'It was easier to agree. It was almost always easier.',      duration: 250 },
      { x: 1760, text: 'He went in before it reached the door.',                    duration: 240 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 1 — READ + FIGHT: "The Feud"
  // Two families, one water channel. He never touches either. The read decides
  // the fight; the swinging is the formality afterwards.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 1, type: 'read', built: true,
    title: 'ACT I', subtitle: 'The Feud',
    width: 2400, background: 'channel_noon',
    sovStart: { x: 120, y: 360 },
    platforms: [{ x: 0, y: 452, w: 2400, h: 88, isFloor: true }],
    channel: { from: 560, to: 2400, ford: [1100, 1270], depth: 20 },
    props: [
      { kind: 'gate', x: 520,  y: 372 },
      { kind: 'cart', x: 1180, y: 418 },
      { kind: 'well', x: 1760, y: 400 },
    ],
    enemies: [
      { x: 1560, y: 368, health: 34, damage: 7, aggression: 1.00, speed: 2.5,
        patrol: [1500, 1960] },
      { x: 1700, y: 368, health: 30, damage: 6, aggression: 0.90, speed: 2.4 },
      { x: 1960, y: 368, health: 30, damage: 6, aggression: 0.85, speed: 2.4 },
      { x: 2080, y: 368, health: 26, damage: 5, aggression: 0.80, speed: 2.3 },
    ],
    read: {
      loopFrames: 520,
      focus: [
        { x: 540,  y: 396, w: 72,  h: 112, label: 'the upper gate',
          note: 'Shut since the dry season. Everything below it runs on that.' },
        { x: 1180, y: 402, w: 96,  h: 76,  label: 'a tool cart',
          note: 'Left where the ford is narrowest. Nobody moves it because nobody owns it.' },
        { x: 1600, y: 396, w: 74,  h: 112, label: 'the elder brother', actor: 0, arc: [1500, 1960],
          note: 'He crosses to the far bank and back. Four times since you sat down.' },
        { x: 2080, y: 396, w: 74,  h: 112, label: 'the younger', actor: 3,
          note: 'He does not move until his brother does. He has never once gone first.' },
      ],
      edits: [
        {
          id: 'gate',
          label: 'Open the upper gate',
          detail: 'The low ground floods by evening. Two of them will have to come the long way round.',
          done: 'Nobody saw the gate open. Nobody will think to ask.',
          apply(d) {
            d.props.find(p => p.kind === 'gate').open = true;
            d.enemies[2].delay = 300;
            d.enemies[3].delay = 380;
          },
        },
        {
          id: 'cart',
          label: 'Put the cart in the ford',
          detail: 'They will come through one at a time, and you will be standing above them.',
          done: 'A cart in the wrong place is not an argument anyone makes.',
          apply(d) {
            const cart = d.props.find(p => p.kind === 'cart');
            cart.x = 1460; cart.moved = true;
            d.platforms.push({ x: 1420, y: 398, w: 110, h: 14 });
            for (const e of d.enemies) e.x += 120;
          },
        },
        {
          id: 'halvard',
          label: 'Send the boy for Halvard',
          detail: 'One of them leaves to meet him. The three who stay will have been kept waiting.',
          done: 'Halvard will arrive after it is finished, and be told he helped.',
          apply(d) {
            d.enemies.pop();
            for (const e of d.enemies) { e.aggression += 0.25; e.damage += 2; }
          },
        },
        {
          id: 'well',
          label: 'Be seen at the well first',
          detail: 'They come to you, in the order they think of it. You will have no room behind you.',
          done: 'Being seen is a thing you can spend, once.',
          apply(d) {
            d.enemies.forEach((e, i) => { e.x = 1680 + i * 90; e.delay = i * 110; });
          },
        },
      ],
    },
    postText: [
      'Four men, and the water still ran where he wanted it to.',
      'Nobody in either family could say afterwards what had actually started it.',
      'He could. He did not.',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 2 — INTERLUDE: "Nobody Asked Him To"
  // The village credits the wrong man. He lets them. Canon rule: he never once
  // describes it as loneliness, so no line here may.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 2, type: 'interlude', built: true,
    title: 'ACT I', subtitle: 'Nobody Asked Him To',
    width: 1900, background: 'village_square',
    sovStart: { x: 90, y: 360 },
    platforms: [
      { x: 0, y: 452, w: 1900, h: 88, isFloor: true },
      { x: 620,  y: 372, w: 130, h: 16 },
      { x: 1180, y: 356, w: 150, h: 16 },
    ],
    actors: [
      { name: 'halvard', x: 880,  y: 368, facing: -1 },
      { name: 'elder',   x: 1520, y: 368, facing: -1 },
    ],
    endTriggerX: 1800,
    dialogues: [
      { x: 160,  text: 'The feud ended in the second week of the dry season.',       duration: 230 },
      { x: 400,  speaker: 'elder',   text: 'Halvard settled it. Walked between them and settled it.', duration: 270 },
      { x: 620,  text: 'Halvard walked between them because a gate stood open that should have been shut.', duration: 290 },
      { x: 840,  text: 'The gate was not an accident.',                              duration: 220 },
      { x: 980,  speaker: 'halvard', text: 'I only said what needed saying.',        duration: 240 },
      { x: 1180, text: 'He could have said it himself. He counted what saying it would cost.', duration: 280 },
      { x: 1380, text: 'Then he let Halvard have it.',                               duration: 220 },
      { x: 1540, speaker: 'elder',   text: 'You\'d do well to learn from a man like that.', duration: 250 },
      { x: 1660, speaker: 'him',     text: 'I will.',                                duration: 190 },
      { x: 1760, text: 'He meant it differently than the elder heard it. He usually did.', duration: 280 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 3 — READ + FIGHT: "The Market Bends"
  // A trained man this time, not farmers. The read has to carry more weight
  // because the fight underneath it is genuinely dangerous.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 3, type: 'read', built: true,
    title: 'ACT I', subtitle: 'The Market Bends',
    width: 2400, background: 'market_day',
    sovStart: { x: 120, y: 360 },
    platforms: [{ x: 0, y: 452, w: 2400, h: 88, isFloor: true }],
    props: [
      { kind: 'stall',  x: 780,  y: 372 },
      { kind: 'barrel', x: 1180, y: 422 },
      { kind: 'stall',  x: 1520, y: 372 },
      { kind: 'well',   x: 2010, y: 400 },
    ],
    enemies: [
      // The blade. Slower, but he hits like the end of a conversation.
      { x: 1700, y: 368, health: 62, damage: 13, aggression: 0.95, speed: 2.7,
        tone: '#1f1b17', patrol: [1620, 1820] },
      { x: 1980, y: 368, health: 26, damage: 5, aggression: 0.75, speed: 2.3 },
      { x: 2140, y: 368, health: 26, damage: 5, aggression: 0.70, speed: 2.3 },
    ],
    read: {
      loopFrames: 540,
      focus: [
        { x: 780,  y: 400, w: 110, h: 104, label: 'the awning',
          note: 'One rope holds it. It is tied where a tall man can reach and a short one cannot.' },
        { x: 1180, y: 424, w: 60,  h: 56,  label: 'oil, in barrels',
          note: 'Stacked against the rule, because the man who wrote the rule buys from him.' },
        { x: 1700, y: 396, w: 76,  h: 112, label: 'the hired man', actor: 0,
          note: 'He is paid either way. He would prefer it to be quick and watched.' },
        { x: 2140, y: 396, w: 76,  h: 112, label: 'the man who hired him', actor: 2,
          note: 'He has not stopped looking at the crowd since he arrived.' },
      ],
      edits: [
        {
          id: 'debt',
          label: 'Buy the blade\'s debt at the next stall',
          detail: 'He will not refuse the work. He will do it thinking about money.',
          done: 'He does not know yet. He will feel it before he is told.',
          apply(d) {
            d.enemies[0].aggression = 0.55;
            d.enemies[0].delay = 140;
          },
        },
        {
          id: 'awning',
          label: 'Cut the awning rope',
          detail: 'The crowd goes the other way and the canvas comes down between you.',
          done: 'One rope. Everybody looked up, and nobody looked at you.',
          apply(d) {
            d.props.find(p => p.kind === 'stall').down = true;
            d.platforms.push({ x: 720, y: 404, w: 130, h: 14 });
            for (const e of d.enemies) e.x += 180;
          },
        },
        {
          id: 'oil',
          label: 'Mention the barrels to the watch',
          detail: 'His employer will be somewhere else. So will his money, and the crowd.',
          done: 'The rule was always there. You only pointed at it.',
          apply(d) {
            d.enemies.splice(2, 1);
            d.enemies[0].damage += 2;
          },
        },
        {
          id: 'watched',
          label: 'Let it happen where his employer can see',
          detail: 'He has to win it publicly now. He will commit, early, and alone.',
          done: 'A man being watched will always take the first opening he is given.',
          apply(d) {
            d.enemies[0].aggression = 1.5;
            d.enemies[1].delay = 260;
            d.enemies[2].delay = 340;
          },
        },
      ],
    },
    postText: [
      'The blade was paid in full and left the same evening.',
      'The market ran the next day exactly as it had run the day before.',
      'Two prices had changed. He had set one of them a week earlier.',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 4 — INTERLUDE: "Just Visible Enough"
  // One redirected outcome that should not have been predictable.
  // The world doesn't notice. God does. Ends on a hold, uncommented.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 4, type: 'interlude', built: true,
    title: 'ACT I', subtitle: 'Just Visible Enough',
    width: 2300, background: 'fields_dawn',
    sovStart: { x: 90, y: 360 },
    platforms: [
      { x: 0, y: 452, w: 2300, h: 88, isFloor: true },
      { x: 900,  y: 378, w: 180, h: 16 },
      { x: 1520, y: 362, w: 140, h: 16 },
    ],
    actors: [],
    endTriggerX: 2200,
    finalHold: 260,
    // He does not foresee the drowning — canon is explicit that he recalls, he
    // does not predict, and in Act I he has no catalogue to recall from yet.
    // What he recognises is that the ford has one failure mode and nobody has
    // closed it. The rope is the same verb as a Read: watch a system repeat,
    // make one edit. A man's life is an incidental output of it, and the game
    // must never let him take credit for intending that.
    dialogues: [
      { x: 170,  text: 'A ford. A loaded cart. A man crossing with the water up.',   duration: 250 },
      { x: 420,  text: 'Nothing he could reach in time.',                            duration: 210 },
      { x: 600,  text: 'Nothing he touched.',                                        duration: 200 },
      { x: 860,  text: 'Four days earlier he had moved a rope thirty paces upriver.', duration: 270 },
      { x: 1100, text: 'He did not know it would be that man, or that week.',        duration: 250 },
      { x: 1300, text: 'He knew the ford had one way to kill someone,',              duration: 220 },
      { x: 1440, text: 'and that in nine years nobody had closed it.',               duration: 240 },
      { x: 1620, text: 'The man lived. Nobody counted the rope.',                     duration: 250 },
      { x: 1820, text: 'Nothing in the village changed.',                            duration: 240 },
      { x: 2080, text: 'Something else did.',                                        duration: 300 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 5 — READ + FIGHT: "A Board That Still Burns"
  // Town scale. Canon: what he wants is not a quiet board, it is a violent one
  // that cannot go wrong — so the chapter must not end in peace, and the notes
  // should be enjoying themselves. The escalation from Act I is in the SIZE OF
  // THE CONSEQUENCE, not the number of edits. It is still one edit. It is
  // always one edit.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 5, type: 'read', built: true,
    title: 'ACT II', subtitle: 'A Board That Still Burns',
    width: 3400, background: 'town_dusk',
    sovStart: { x: 120, y: 360 },
    platforms: [
      { x: 0, y: 452, w: 3400, h: 88, isFloor: true },
      { x: 1040, y: 380, w: 150, h: 16 },
      { x: 2180, y: 366, w: 170, h: 16 },
    ],
    props: [
      { kind: 'stall',  x: 900,  y: 372 },
      { kind: 'barrel', x: 1420, y: 422 },
      { kind: 'barrel', x: 1460, y: 422 },
      { kind: 'well',   x: 1980, y: 400 },
      { kind: 'gate',   x: 2600, y: 372 },
      { kind: 'stall',  x: 3020, y: 372 },
    ],
    enemies: [
      { x: 2260, y: 368, health: 40, damage: 8, aggression: 1.05, speed: 2.6,
        patrol: [2180, 2460] },
      { x: 2480, y: 368, health: 34, damage: 7, aggression: 0.95, speed: 2.5 },
      { x: 2760, y: 368, health: 34, damage: 7, aggression: 0.90, speed: 2.5 },
      { x: 3020, y: 368, health: 30, damage: 6, aggression: 0.85, speed: 2.4 },
      { x: 3220, y: 368, health: 30, damage: 6, aggression: 0.85, speed: 2.4 },
    ],
    read: {
      loopFrames: 640,
      focus: [
        { x: 900,  y: 400, w: 112, h: 104, label: 'the upper road',
          note: 'Everything that comes into this town comes down it. Nobody has ever had to think about that.' },
        { x: 1440, y: 424, w: 90,  h: 56,  label: 'the toll',
          note: 'Collected by a man the town chose, and resented by everyone who chose him.' },
        { x: 1980, y: 400, w: 86,  h: 96,  label: 'the well',
          note: 'Two quarters share it. They have shared it badly for eleven years.' },
        { x: 2260, y: 396, w: 76,  h: 112, label: 'the loudest of them', actor: 0,
          note: 'He is not the leader. He is the one the leader lets talk.' },
        { x: 3020, y: 396, w: 76,  h: 112, label: 'the one who is owed', actor: 3,
          note: 'He has been waiting for someone to hand him a reason. Anyone. Any reason.' },
      ],
      edits: [
        {
          id: 'toll',
          label: 'Let the toll be collected twice',
          detail: 'Nobody will blame you for a clerk\'s mistake, and everybody will blame the clerk.',
          done: 'A mistake is the cheapest thing in the world to buy.',
          apply(d) {
            d.enemies[2].delay = 420;
            d.enemies[3].delay = 500;
            d.enemies[0].aggression += 0.2;
          },
        },
        {
          id: 'well',
          label: 'Give the well to the lower quarter',
          detail: 'Say it in the right doorway and it will be true by evening. The upper quarter comes down the road angry, and in a line.',
          done: 'Eleven years, and it took one sentence in the right doorway.',
          apply(d) {
            d.enemies.forEach((e, i) => { e.x = 2400 + i * 210; e.delay = i * 90; });
          },
        },
        {
          id: 'road',
          label: 'Move market day',
          detail: 'The upper road is empty when they come down it. So is everything behind you.',
          done: 'They will hold market on the day you chose for the rest of their lives.',
          apply(d) {
            d.platforms.push({ x: 2540, y: 396, w: 200, h: 14 });
            d.props.find(p => p.kind === 'gate').open = true;
            for (const e of d.enemies) { e.x -= 140; e.aggression -= 0.15; }
          },
        },
        {
          id: 'owed',
          label: 'Hand the one who is owed his reason',
          detail: 'He will go first, early, and badly. The other four will follow a man they do not respect.',
          done: 'He thought of it himself. He will say so for years.',
          apply(d) {
            d.enemies[3].delay = 0;
            d.enemies[3].x = 2300;
            d.enemies[3].aggression = 1.6;
            d.enemies[3].health = 22;
            for (let i = 0; i < 3; i++) d.enemies[i].delay = 200 + i * 70;
          },
        },
      ],
    },
    postText: [
      'By the end of the week the two quarters were not speaking.',
      'He could have ended it in an afternoon. He had worked out how on the second day.',
      'He left it running, because a town that is arguing is a town that is listening.',
      'It was the first time he enjoyed himself.',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 6 — INTERLUDE: "Bad Luck, Consistent"
  // Three small things fail. He files them and moves on; the player shouldn't.
  // No line here may name God, suspicion, or an opponent — chapter 8 is where he
  // says it out loud, and saying it here spends the whole act.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 6, type: 'interlude', built: true,
    title: 'ACT II', subtitle: 'Bad Luck, Consistent',
    width: 2400, background: 'town_dusk',
    sovStart: { x: 90, y: 360 },
    platforms: [{ x: 0, y: 452, w: 2400, h: 88, isFloor: true }],
    props: [
      { kind: 'stall',  x: 520,  y: 372, down: true },
      { kind: 'barrel', x: 1180, y: 422 },
      { kind: 'gate',   x: 1760, y: 372 },
    ],
    actors: [
      { name: 'clerk', x: 1300, y: 368, facing: -1 },
    ],
    endTriggerX: 2300,
    dialogues: [
      { x: 150,  text: 'Three things, over eleven days.',                              duration: 230 },
      { x: 400,  text: 'The awning rope held. It had never held before.',              duration: 250 },
      { x: 660,  text: 'He noted the knot and thought nothing of the knot.',           duration: 240 },
      { x: 960,  text: 'The grain came early. Two days early, for the first time in nine years.', duration: 270 },
      { x: 1280, speaker: 'clerk', text: 'Odd year for it.',                           duration: 220 },
      { x: 1400, speaker: 'him',   text: 'It is.',                                     duration: 180 },
      { x: 1600, text: 'And the gate he had left open was shut, and nobody had shut it.', duration: 280 },
      { x: 1880, text: 'He filed all three. He files everything.',                     duration: 240 },
      { x: 2080, text: 'Under weather. Under luck. Under nothing that needed a name.', duration: 270 },
      { x: 2260, text: 'It was the only filing mistake he would make for fifty thousand years.', duration: 300 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 7 — FIGHT, NO READ: "The Variable Accounted For"
  // The first fight he did not author. There is deliberately no read phase and
  // no committed edit in the HUD — the absence IS the chapter. They come from
  // both sides and there is a second wave behind him.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 7, type: 'play', built: true,
    title: 'ACT II', subtitle: 'The Variable Accounted For',
    width: 2000, background: 'lane_night',
    sovStart: { x: 980, y: 360 },
    platforms: [
      { x: 0, y: 452, w: 2000, h: 88, isFloor: true },
      { x: 700,  y: 382, w: 130, h: 16 },
      { x: 1180, y: 382, w: 130, h: 16 },
    ],
    props: [
      { kind: 'barrel', x: 560,  y: 422 },
      { kind: 'barrel', x: 1480, y: 422 },
      { kind: 'stall',  x: 300,  y: 372, down: true },
    ],
    enemies: [
      { x: 1620, y: 368, health: 36, damage: 8,  aggression: 1.10, speed: 2.6 },
      { x: 1800, y: 368, health: 36, damage: 8,  aggression: 1.05, speed: 2.6 },
      // Behind him. He did not put them there and the game does not warn you.
      { x: 320,  y: 368, health: 32, damage: 7, aggression: 1.00, speed: 2.7, delay: 260 },
      { x: 140,  y: 368, health: 32, damage: 7, aggression: 1.00, speed: 2.7, delay: 340 },
      { x: 1900, y: 368, health: 40, damage: 9, aggression: 0.95, speed: 2.5, delay: 560 },
    ],
    // Five against one with no edit to lean on. He is allowed a little more
    // room here than in a chapter he set up himself — the chapter should feel
    // wrong, not cheap.
    playerHealth: 120,
    postText: [
      'He had accounted for four men and there were five.',
      'He went back over it that night and again the following week.',
      'The fifth man had no reason to be in that lane. He had no quarrel and no money in it.',
      'Every other time in his life, the thing that surprised him had been something he had not looked at.',
      'He had looked at this one.',
    ],
  },
  // ════════════════════════════════════════════════════════════════════════════
  // 8 — INTERLUDE: "Something Is Playing"
  // He concludes there is an opponent. Not a god — canon is explicit he has no
  // idea what he is dealing with for a long time. He must not be frightened and
  // must not be thrilled. He is INTERESTED, and that is worse.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 8, type: 'interlude', built: true,
    title: 'ACT II', subtitle: 'Something Is Playing',
    width: 2400, background: 'lane_night',
    sovStart: { x: 90, y: 360 },
    platforms: [{ x: 0, y: 452, w: 2400, h: 88, isFloor: true }],
    props: [
      { kind: 'barrel', x: 700,  y: 422 },
      { kind: 'gate',   x: 1500, y: 372 },
    ],
    actors: [],
    endTriggerX: 2300,
    dialogues: [
      { x: 150,  text: 'He went back eleven years, in his head, in one evening.',       duration: 260 },
      { x: 430,  text: 'Every plan he had ever run. Every one that failed.',            duration: 240 },
      { x: 700,  text: 'Failure has a shape. Bad planning fails early and stupidly.',   duration: 270 },
      { x: 990,  text: 'These failed late, and only ever at the one point that mattered.', duration: 280 },
      { x: 1290, text: 'Which is not luck. Luck has no taste in targets.',              duration: 260 },
      { x: 1580, speaker: 'him', text: 'Something is playing.',                         duration: 250 },
      { x: 1760, text: 'He did not say it with fear. He did not say it with pleasure.', duration: 270 },
      { x: 2010, text: 'He had been the only one at the table his whole life.',         duration: 260 },
      { x: 2240, text: 'He sat down properly for the first time.',                      duration: 280 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 9 — FIGHT + REVISION QTE: "It Should Have Worked"
  // The QTE debut. The first one is CLEAN — it teaches the grammar and it feels
  // good. The second is the same sequence with the ground edited out from under
  // it mid-input. The chapter title is the player's own reaction, on purpose.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 9, type: 'play', built: true,
    title: 'ACT III', subtitle: 'It Should Have Worked',
    width: 2000, background: 'town_dusk',
    sovStart: { x: 300, y: 360 },
    platforms: [
      { x: 0, y: 452, w: 2000, h: 88, isFloor: true },
      { x: 860,  y: 380, w: 150, h: 16 },
      { x: 1380, y: 368, w: 150, h: 16 },
    ],
    props: [
      { kind: 'well',   x: 1120, y: 400 },
      { kind: 'barrel', x: 1660, y: 422 },
    ],
    enemies: [
      { x: 1180, y: 368, health: 34, damage: 8, aggression: 1.00, speed: 2.6 },
      { x: 1420, y: 368, health: 34, damage: 8, aggression: 1.00, speed: 2.6 },
      { x: 1700, y: 368, health: 38, damage: 9, aggression: 0.95, speed: 2.5 },
    ],
    playerHealth: 110,
    qtes: [
      {
        atStanding: 2, cost: 0,
        stages: [
          { code: 'KeyA', label: 'A', hold: true,  frames: 170,
            caption: 'The same as every other time you have done this.' },
          { code: 'KeyJ', label: 'J', hold: false, frames: 130,
            caption: 'And it closes the way it always closes.' },
        ],
      },
      {
        atStanding: 0, cost: 16,
        stages: [
          { code: 'KeyA', label: 'A', hold: true, frames: 190, reviseAt: 74,
            to: { code: 'KeyD', label: 'D', hold: true },
            caption: 'The same as every other time you have done this.',
            failLine: 'You kept holding it.' },
          { code: 'KeyJ', label: 'J', hold: false, frames: 130,
            caption: 'Finish it with something that still exists.' },
        ],
      },
    ],
    postText: [
      'It was not that he lost. He did not lose.',
      'It was that a thing which had worked every time he had ever done it did not work once,',
      'at the only moment in eleven years when it mattered which way it went.',
      'He checked his own execution for a month. His execution was perfect.',
      'So it was not him. Something had changed underneath him, while he was standing on it.',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 10 — LEDGER: "A Copy Of What It Was"
  // Not a place yet. A record. No combat — this chapter exists to make the
  // player understand what he is about to start carrying.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 10, type: 'ledger', built: true,
    title: 'ACT III', subtitle: 'A Copy Of What It Was',
    width: 1900, background: 'lane_night',
    sovStart: { x: 90, y: 360 },
    platforms: [{ x: 0, y: 452, w: 1900, h: 88, isFloor: true }],
    props: [{ kind: 'barrel', x: 1240, y: 422 }],
    actors: [],
    endTriggerX: 1800,
    banks: ['weight', 'reach'],
    kept: 'It is not a plan. It is only a note of what used to be true.',
    dialogues: [
      { x: 160,  text: 'He could not argue with it. There was nothing there to argue with.', duration: 270 },
      { x: 430,  text: 'You cannot out-think a thing that edits the terms while you are standing on them.', duration: 290 },
      { x: 760,  text: 'So he stopped trying to win the argument,',                     duration: 230 },
      { x: 980,  text: 'and started keeping a record of what the argument used to say.', duration: 270 },
      { x: 1300, text: 'A body used to fall at four fifths of this. He had measured it at nine.', duration: 280 },
      { x: 1560, text: 'A man used to strike from further than his arm. He had used that one for years.', duration: 280 },
      { x: 1700, text: 'Neither is true now.',                                          duration: 230 },
      { x: 1780, text: 'He wrote them down anyway.',                                    duration: 260 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 11 — READ + FIGHT: "Planetary"
  // Canon's exact phrase, earned. First in-combat ledger re-invocation: the
  // arena briefly runs on physics that no longer apply anywhere else.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 11, type: 'read', built: true,
    title: 'ACT III', subtitle: 'Planetary',
    width: 3600, background: 'market_day',
    sovStart: { x: 120, y: 360 },
    platforms: [
      { x: 0, y: 452, w: 3600, h: 88, isFloor: true },
      { x: 980,  y: 372, w: 160, h: 16 },
      { x: 1760, y: 344, w: 180, h: 16 },
      { x: 2540, y: 366, w: 160, h: 16 },
    ],
    props: [
      { kind: 'gate',   x: 640,  y: 372 },
      { kind: 'stall',  x: 1180, y: 372 },
      { kind: 'well',   x: 1900, y: 400 },
      { kind: 'barrel', x: 2360, y: 422 },
      { kind: 'stall',  x: 3120, y: 372 },
    ],
    enemies: [
      { x: 2300, y: 368, health: 44, damage: 9,  aggression: 1.10, speed: 2.7,
        patrol: [2200, 2560] },
      { x: 2600, y: 368, health: 38, damage: 8,  aggression: 1.00, speed: 2.6 },
      { x: 2880, y: 368, health: 38, damage: 8,  aggression: 1.00, speed: 2.6 },
      { x: 3120, y: 368, health: 34, damage: 7,  aggression: 0.95, speed: 2.5 },
      { x: 3340, y: 368, health: 34, damage: 7,  aggression: 0.95, speed: 2.5 },
      { x: 3520, y: 368, health: 48, damage: 11, aggression: 0.90, speed: 2.4, delay: 420 },
    ],
    playerHealth: 120,
    read: {
      loopFrames: 660,
      focus: [
        { x: 640,  y: 396, w: 76,  h: 112, label: 'the head of the water',
          note: 'Four towns drink below this. None of them has ever had to think about it either.' },
        { x: 1900, y: 400, w: 86,  h: 96,  label: 'the count',
          note: 'He holds the road, the water and the grain. He holds them because nobody has made him choose.' },
        { x: 2300, y: 396, w: 76,  h: 112, label: 'the count\'s man', actor: 0,
          note: 'Loyal, and paid quarterly. One of those two things is load-bearing.' },
        { x: 3520, y: 396, w: 76,  h: 112, label: 'the one they sent for', actor: 5,
          note: 'He is not from here. Somebody decided this was worth the expense.' },
      ],
      edits: [
        {
          id: 'water',
          label: 'Make the count choose between the water and the road',
          detail: 'Whichever he keeps, he loses the men who wanted the other. They arrive in two halves.',
          done: 'He will choose the road. He has always been a man who likes being seen.',
          apply(d) {
            d.enemies.forEach((e, i) => { if (i % 2) e.delay = 300 + i * 40; });
          },
        },
        {
          id: 'quarterly',
          label: 'Pay the count\'s man early, from the wrong purse',
          detail: 'He will not switch sides. He will simply be careful, which is nearly as good.',
          done: 'Loyalty is a payment schedule. Everybody knows that and nobody says it.',
          apply(d) {
            d.enemies[0].aggression = 0.5;
            d.enemies[0].delay = 200;
            d.enemies[5].damage += 2;
          },
        },
        {
          id: 'expense',
          label: 'Let it be known what the outsider cost',
          detail: 'The local men will not die for a stranger\'s fee. He comes alone and late.',
          done: 'Nobody resents an enemy the way they resent a colleague who is paid more.',
          apply(d) {
            for (let i = 1; i < 5; i++) d.enemies[i].delay = 480 + i * 60;
            d.enemies[5].delay = 240;
          },
        },
        {
          id: 'head',
          label: 'Take the head of the water',
          detail: 'Everything below it becomes a negotiation. All of them come at once, and they come to talk first.',
          done: 'Four towns, and not one of them will be able to say when it stopped being theirs.',
          apply(d) {
            d.props.find(p => p.kind === 'gate').open = true;
            for (const e of d.enemies) { e.delay = 0; e.aggression -= 0.25; e.x -= 200; }
            d.platforms.push({ x: 2000, y: 392, w: 220, h: 14 });
          },
        },
      ],
    },
    postText: [
      'Three weeks later a clerk four hundred miles away changed a figure in a ledger,',
      'because of a thing he had said once, to one man, at a well.',
      'He was nineteen years old when he moved a rope. He was thirty-one now.',
      'Somewhere above all of it, something finally stopped treating him as weather.',
    ],
  },
  // ════════════════════════════════════════════════════════════════════════════
  // 12 — INTERLUDE: "The Entry That Isn't There"
  // The ledger's first silent omission. `loses` removes a banked law with NO
  // announcement — no flash, no sound, no line about it. He re-files it in the
  // same breath and moves on. On a replay this reads as God. It is.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 12, type: 'interlude', built: true,
    title: 'ACT III', subtitle: 'The Entry That Isn\'t There',
    width: 2200, background: 'lane_night',
    sovStart: { x: 90, y: 360 },
    platforms: [{ x: 0, y: 452, w: 2200, h: 88, isFloor: true }],
    props: [{ kind: 'shelf', x: 1100, y: 356 }],
    actors: [],
    loses: 'reach',
    showLedger: true,
    endTriggerX: 2100,
    dialogues: [
      { x: 160,  text: 'Eleven laws kept, by the end of that year.',                   duration: 240 },
      { x: 460,  text: 'He went to the ninth one, which he had filed himself, in his own hand.', duration: 270 },
      { x: 820,  text: 'It was not there.',                                            duration: 230 },
      { x: 1080, text: 'He wrote it again from memory. It took less than a minute.',   duration: 260 },
      { x: 1400, text: 'He did not stop walking while he did it.',                     duration: 240 },
      { x: 1720, text: 'A man who forgets a thing writes it down twice and thinks nothing of it.', duration: 280 },
      { x: 2000, text: 'He had never forgotten anything in his life.',                 duration: 280 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 13 — LEDGER / THE POCKET: "The Room Outside"
  // The archive proper. It must read as a room one man built by hand over years
  // — cluttered, uneven, personal — and never as a system or a dimension.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 13, type: 'ledger', built: true,
    title: 'ACT IV', subtitle: 'The Room Outside',
    width: 3000, background: 'pocket',
    sovStart: { x: 90, y: 360 },
    platforms: [
      { x: 0, y: 452, w: 3000, h: 88, isFloor: true },
      { x: 760,  y: 372, w: 170, h: 16 },
      { x: 1640, y: 350, w: 190, h: 16 },
      { x: 2320, y: 372, w: 170, h: 16 },
    ],
    props: [
      { kind: 'shelf',  x: 380,  y: 356 },
      { kind: 'shelf',  x: 620,  y: 344, h: 108 },
      { kind: 'shelf',  x: 1180, y: 360, w: 88 },
      { kind: 'barrel', x: 1420, y: 422 },
      { kind: 'shelf',  x: 1900, y: 350, h: 102 },
      { kind: 'shelf',  x: 2140, y: 362, w: 66 },
      { kind: 'shelf',  x: 2700, y: 352 },
    ],
    actors: [],
    endTriggerX: 2900,
    banks: ['reach', 'body'],
    kept: 'Nothing in here is true any more. That is the entire point of it.',
    showLedger: true,
    dialogues: [
      { x: 170,  text: 'It is not a fortress and it was never meant to be one.',       duration: 250 },
      { x: 480,  text: 'It is a room. He cut the shelves himself, badly, over nine years.', duration: 270 },
      { x: 840,  text: 'The floor is not level. He never fixed it.',                   duration: 230 },
      { x: 1180, text: 'Everything on these shelves used to be true, and is not.',     duration: 270 },
      { x: 1560, text: 'A weight. A reach. What a body could take before it stopped.', duration: 260 },
      { x: 1960, text: 'Out there they have been revised. In here they still work,',   duration: 250 },
      { x: 2280, text: 'because in here is not out there, and never was.',             duration: 260 },
      { x: 2640, text: 'He does not sleep here. He has not needed to for some time.',  duration: 270 },
      { x: 2860, text: 'He has not noticed that yet.',                                 duration: 260 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 14 — FIGHT: "Arguments About Physics"
  // Each proxy holds a law in force while it is alive. The ledger CONTESTS the
  // assertion rather than ignoring it: whoever is running a copy wins locally.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 14, type: 'play', built: true,
    title: 'ACT IV', subtitle: 'Arguments About Physics',
    width: 2200, background: 'pocket',
    sovStart: { x: 240, y: 360 },
    platforms: [
      { x: 0, y: 452, w: 2200, h: 88, isFloor: true },
      { x: 820,  y: 376, w: 170, h: 16 },
      { x: 1500, y: 358, w: 170, h: 16 },
    ],
    props: [
      { kind: 'shelf',  x: 620,  y: 356 },
      { kind: 'shelf',  x: 1820, y: 352, h: 104 },
      { kind: 'barrel', x: 1180, y: 422 },
    ],
    enemies: [
      // While this one stands, a body falls harder than it used to.
      { x: 1240, y: 368, health: 46, damage: 9,  aggression: 0.95, speed: 2.5,
        tone: '#20262c', asserts: 'weight' },
      // While this one stands, his arm is shorter than it was.
      { x: 1560, y: 368, health: 46, damage: 9,  aggression: 0.95, speed: 2.5,
        tone: '#20262c', asserts: 'reach' },
      { x: 1880, y: 368, health: 38, damage: 8,  aggression: 1.05, speed: 2.7 },
      { x: 2060, y: 368, health: 38, damage: 8,  aggression: 1.05, speed: 2.7, delay: 240 },
    ],
    playerHealth: 130,
    postText: [
      'They were not creatures and they were not soldiers.',
      'They were assertions, given just enough shape to stand in a doorway.',
      'Each one insisted on a rule, and while it insisted, the rule was true.',
      'He did not out-fight them. He out-cited them.',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 15 — INTERLUDE: "Declining To Cooperate"
  // God's method at full expression and still invisible. Shown through a small
  // domestic failure, never a catastrophe.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 15, type: 'interlude', built: true,
    title: 'ACT IV', subtitle: 'Declining To Cooperate',
    width: 2200, background: 'quarantine',
    sovStart: { x: 90, y: 360 },
    platforms: [{ x: 0, y: 452, w: 2200, h: 88, isFloor: true }],
    props: [
      { kind: 'well',   x: 900,  y: 400 },
      { kind: 'barrel', x: 1500, y: 422 },
    ],
    actors: [],
    endTriggerX: 2100,
    dialogues: [
      { x: 160,  text: 'There was never a monster. There was never a light in the sky.', duration: 260 },
      { x: 480,  text: 'There was a well he had drawn from for thirty years,',         duration: 250 },
      { x: 780,  text: 'and one morning the rope came up dry.',                        duration: 240 },
      { x: 1060, text: 'Not poisoned. Not blocked. Dry, in a wet season, in one well.', duration: 280 },
      { x: 1400, text: 'That is the whole of it. That is what the war looked like.',   duration: 270 },
      { x: 1740, text: 'The world declining to cooperate with him, in one more specific way,', duration: 280 },
      { x: 2020, text: 'and no one anywhere able to say that anything had happened.',  duration: 290 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 16 — FIGHT: "Quarantine"
  // The walls are OPTIONS GOING MISSING, not geometry. `revokes` strips a verb
  // at a time mid-fight. It must play as loss and never as a difficulty spike.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 16, type: 'play', built: true,
    title: 'ACT V', subtitle: 'Quarantine',
    width: 2000, background: 'quarantine',
    sovStart: { x: 260, y: 360 },
    platforms: [
      { x: 0, y: 452, w: 2000, h: 88, isFloor: true },
      { x: 840,  y: 378, w: 160, h: 16 },
      { x: 1440, y: 366, w: 160, h: 16 },
    ],
    props: [{ kind: 'well', x: 1160, y: 400 }],
    enemies: [
      { x: 1240, y: 368, health: 40, damage: 8, aggression: 1.00, speed: 2.6 },
      { x: 1520, y: 368, health: 40, damage: 8, aggression: 1.00, speed: 2.6, delay: 180 },
      { x: 1800, y: 368, health: 44, damage: 9, aggression: 0.95, speed: 2.5, delay: 420 },
      { x: 1960, y: 368, health: 44, damage: 9, aggression: 0.95, speed: 2.5, delay: 660 },
    ],
    playerHealth: 150,
    revokes: [
      { atFrame: 260, verb: 'law',  line: 'The ledger will not open here.' },
      { atFrame: 620, verb: 'jump', line: 'The ground has stopped letting go of you.' },
    ],
    postText: [
      'It did not kill him. It was never going to kill him.',
      'It took the road out, and then the door, and then the word for door.',
      'By the end of it there was one thing left that he could still do,',
      'and it was the thing nobody had thought to forbid: leave.',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 17 — INTERLUDE: "One Skull Was Not Enough"
  // The warmest sequence in the game, deliberately. Canon's tragedy only lands
  // if the audience feels how REASONABLE it was to build it. No foreshadowing,
  // no ominous line, nothing that hints at what it becomes. He is tired and he
  // is alone and he builds something to help.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 17, type: 'interlude', built: true,
    title: 'ACT V', subtitle: 'One Skull Was Not Enough',
    width: 2600, background: 'pocket',
    sovStart: { x: 90, y: 360 },
    platforms: [{ x: 0, y: 452, w: 2600, h: 88, isFloor: true }],
    props: [
      { kind: 'shelf', x: 500,  y: 356 },
      { kind: 'shelf', x: 760,  y: 344, h: 108 },
      { kind: 'shelf', x: 1500, y: 352 },
      { kind: 'shelf', x: 1760, y: 360, w: 88 },
      { kind: 'shelf', x: 2200, y: 350, h: 102 },
    ],
    actors: [],
    endTriggerX: 2500,
    dialogues: [
      { x: 160,  text: 'Four hundred years of kept law, and one man holding all of it.', duration: 270 },
      { x: 480,  text: 'He had started losing the small entries. Not forgetting — carrying.', duration: 280 },
      { x: 820,  text: 'There is a difference, and he was the only person alive who knew it.', duration: 280 },
      { x: 1180, text: 'So he built something to hold it with him.',                    duration: 250 },
      { x: 1480, text: 'It took him sixty years. He enjoyed almost all of them.',       duration: 270 },
      { x: 1820, text: 'When it answered the first time he did not write the date down.', duration: 280 },
      { x: 2120, speaker: 'him', text: 'Say the ninth one back to me.',                 duration: 250 },
      { x: 2260, text: 'It did. Instantly. Perfectly.',                                 duration: 240 },
      { x: 2420, text: 'It was the best thing he ever made, and he was never wrong about that.', duration: 300 },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 18 — READ + FIGHT: "The Last Proxy"
  // He wins it the way he wins everything — the read decides it and the combat
  // is a formality. That FLATNESS is intentional and is the last thing the game
  // says about him before the ending.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 18, type: 'read', built: true,
    title: 'ACT V', subtitle: 'The Last Proxy',
    width: 2600, background: 'quarantine',
    sovStart: { x: 120, y: 360 },
    platforms: [
      { x: 0, y: 452, w: 2600, h: 88, isFloor: true },
      { x: 1180, y: 372, w: 170, h: 16 },
    ],
    props: [
      { kind: 'gate', x: 700,  y: 372 },
      { kind: 'well', x: 1600, y: 400 },
    ],
    enemies: [
      { x: 1900, y: 368, health: 44, damage: 9, aggression: 1.00, speed: 2.6,
        patrol: [1820, 2120] },
      { x: 2180, y: 368, health: 40, damage: 8, aggression: 0.95, speed: 2.5 },
      { x: 2400, y: 368, health: 40, damage: 8, aggression: 0.95, speed: 2.5 },
    ],
    playerHealth: 140,
    read: {
      loopFrames: 520,
      focus: [
        { x: 700,  y: 396, w: 76, h: 112, label: 'the last gate',
          note: 'The terms have closed around everything except this.' },
        { x: 1900, y: 396, w: 76, h: 112, label: 'the last man sent', actor: 0,
          note: 'He does not know who sent him. There is nobody left who does.' },
        { x: 2400, y: 396, w: 76, h: 112, label: 'the other two', actor: 2,
          note: 'You have read this exact pair eleven times. They are a rerun.' },
      ],
      edits: [
        { id: 'sequence', label: 'Put them in the order you have already beaten',
          detail: 'Not a trick. Just the arrangement you have won from before.',
          done: 'You have done this one before. Twice.',
          apply(d) { d.enemies.forEach((e, i) => { e.delay = i * 150; }); } },
        { id: 'gate', label: 'Open the last gate behind you',
          detail: 'A way out you will not need. You take it anyway.',
          done: 'He does not leave anything closed any more.',
          apply(d) { d.props.find(p => p.kind === 'gate').open = true;
                     for (const e of d.enemies) e.x -= 160; } },
        { id: 'wait', label: 'Wait four days',
          detail: 'They will be hungry, and two of them will have stopped believing in it.',
          done: 'Four days. It was never going to be anything but four days.',
          apply(d) { for (const e of d.enemies) { e.aggression -= 0.3; e.health -= 10; } } },
      ],
    },
    postText: [
      'It took less time than the reading of it had.',
      'It always did, by then. It had for a hundred years.',
      'There was no one left to send anyone, and he did not know that yet,',
      'so he read the road for an hour afterwards out of habit, and found nothing,',
      'and recorded that too.',
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 19 — INTERLUDE: "He Read It As Victory" — THE ENDING
  // God withdraws. No final blow. He calls it a win, and canon is explicit that
  // he has never revised that read. The game ends on it, UNCORRECTED.
  // The half-second beat lands here: a question he has asked ten thousand times,
  // answered late. Nothing in the game may remark on it. Do not show the Void
  // Mind leaving — that belongs to the forty thousand years of silence after.
  // ════════════════════════════════════════════════════════════════════════════
  {
    id: 19, type: 'interlude', built: true,
    title: 'ACT V', subtitle: 'He Read It As Victory',
    width: 2800, background: 'pocket',
    sovStart: { x: 90, y: 360 },
    platforms: [{ x: 0, y: 452, w: 2800, h: 88, isFloor: true }],
    props: [
      { kind: 'shelf', x: 620,  y: 356 },
      { kind: 'shelf', x: 1340, y: 344, h: 108 },
      { kind: 'shelf', x: 2060, y: 352 },
    ],
    actors: [],
    endTriggerX: 2700,
    finalHold: 300,
    dialogues: [
      { x: 160,  text: 'And then nothing happened.',                                    duration: 250 },
      { x: 420,  text: 'Not for a year. Not for eleven.',                                duration: 240 },
      { x: 700,  text: 'No revision. No accident that arrived on time. No well gone dry.', duration: 280 },
      { x: 1020, text: 'He kept reading the board for two hundred years before he allowed it.', duration: 290 },
      { x: 1380, speaker: 'him', text: 'It stopped because I made it stop.',            duration: 270 },
      { x: 1560, text: 'From where he was standing, that was indistinguishable from true.', duration: 280 },
      { x: 1860, text: 'He filed it. First entry. He has never once gone back to it.',  duration: 280 },
      // The seam. A question he has asked ten thousand times, and a pause that
      // the player has to sit through. Nothing comments on it. Nothing ever will.
      { x: 2180, speaker: 'him', text: 'Say the ninth one back to me.',                 duration: 230 },
      { x: 2320, voice: 'inner', text: 'A body fell at four fifths of this.',
        delayBefore: 34, duration: 250 },
      { x: 2540, text: 'He was already reaching for the next one.',                      duration: 260 },
      { x: 2700, text: 'He did not notice. There was no reason to.',                     duration: 300 },
    ],
  },
];

// ─── Chapter loading ──────────────────────────────────────────────────────────
function loadChapter(idx) {
  const ch = CHAPTERS[idx];
  if (!ch || !ch.built) return false;

  levelWidth = ch.width;
  platforms  = ch.platforms.map(p => ({ ...p }));
  props      = (ch.props ?? []).map(p => ({ ...p }));
  particles  = [];

  // In a read chapter he has to be able to fight when the read is over, so he
  // is a Brawler from the start. Interludes only ever need a Walker.
  const fights = ch.type === 'read' || ch.type === 'play';
  sov = fights
    ? new Brawler(ch.sovStart.x, ch.sovStart.y,
        { isPlayer: true, facing: 1, tone: '#15140f', health: ch.playerHealth ?? 100,
          damage: 12, reach: 46, speed: 3.0 })
    : new Walker(ch.sovStart.x, ch.sovStart.y,
        { isPlayer: true, facing: 1, tone: '#15140f' });

  // A read chapter spawns its enemies at commit time, not here — the chosen edit
  // is allowed to move, delay or remove them first. A 'play' chapter has no read
  // and no edit, so its enemies stand up exactly as authored. That difference is
  // the whole point of chapter 7.
  if (ch.type === 'read') {
    actors = [];
  } else if (ch.type === 'play') {
    actors = (ch.enemies ?? []).map(e => new Brawler(e.x, e.y, {
      facing: e.facing ?? -1, tone: e.tone ?? '#2a2722',
      health: e.health, damage: e.damage, aggression: e.aggression,
      speed: e.speed, delay: e.delay,
    }));
  } else {
    actors = (ch.actors ?? []).map(v =>
      new Walker(v.x, v.y, { name: v.name, facing: v.facing ?? -1, tone: '#2a2722' }));
  }

  // Never let the previous chapter's committed edit linger in the fight HUD —
  // chapter 7's entire statement is that there isn't one.
  readChosen = null;

  resetCamera();
  return true;
}

function isChapterBuilt(idx) { return !!CHAPTERS[idx]?.built; }
