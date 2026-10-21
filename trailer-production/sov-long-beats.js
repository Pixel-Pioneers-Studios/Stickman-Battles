'use strict';
// Long-form "How Sovereign Ω thinks" script: one beat per narration line.
// bg = source second in the Oct 19 recording the beat's background starts at; dim = darken 0..1.
// card = what the slide shows (rendered by sov-long.js). Facts are checked against js/smb-brain.js,
// js/smb-combat.js, js/smb-smk2-class.js, js/smb-menu-startcore.js and the brain training notes.

const BEATS = [
  // ── intro ──
  { id: 'intro1', bg: 9, dim: 0.55,
    say: "This AI just beat the person who made it. It's called Sovereign Omega, and nobody wrote its moves. It taught itself to fight, by playing the game, over and over, across hundreds of millions of decisions.",
    card: { kind: 'title', kicker: 'STICKMAN EVOLUTION: THE 95TH', title: 'SOVEREIGN Ω', sub: 'A fighter that taught itself' } },
  { id: 'intro2', bg: 46, dim: 0.6,
    say: "In this video: the rules, so you know what you're looking at. How Sovereign sees the fight and decides what to press. How it learned. What it still can't do. And then the full match, all ten stocks, unedited.",
    card: { kind: 'list', title: 'IN THIS VIDEO', items: ['1  The rules', '2  What Sovereign is', '3  How it learned', '4  What it can\'t do yet', '5  The full match, unedited'] } },

  // ── 1 · rules ──
  { id: 'rules1', bg: 52, dim: 0.5,
    say: "First, the rules. It's a one on one platform fighter. Empty the other fighter's health bar and they lose a stock. In Sovereign mode, both sides get at least ten stocks. Take all of them to win.",
    card: { kind: 'panel', section: '1 · THE RULES', title: 'STOCKS', lines: ['1 v 1 platform fighter', 'Empty their health: they lose a stock', 'Sovereign mode: 10 stocks each, minimum', 'Take every stock to win'] } },
  { id: 'rules2', bg: 100, dim: 0.5,
    say: "There are seven buttons: left, right, jump, shield, attack, ability, and super. Both fighters use exactly the same seven.",
    card: { kind: 'keys', section: '1 · THE RULES', title: 'SEVEN BUTTONS', keys: ['LEFT', 'RIGHT', 'JUMP', 'SHIELD', 'ATTACK', 'ABILITY', 'SUPER'], note: 'The same seven for the player and for Sovereign' } },
  { id: 'rules3', bg: 9.5, dim: 0.45,
    say: "Attack swings your weapon, and swings chain into combos. Each hit in a combo is worth less: full damage for the first two, then ninety, seventy five, sixty, and fifty percent. Long combos pay off less and less.",
    card: { kind: 'bars', section: '1 · THE RULES', title: 'COMBO SCALING', bars: [100, 100, 90, 75, 60, 50], note: 'Damage per hit in a combo, %' } },
  { id: 'rules4', bg: 25.5, dim: 0.4,
    say: "Ability is a weapon move. Once it starts, it plays out as a scene that can't be interrupted. If it lands the final blow, it ends in a named finisher. Serpent's Bite and Hogtied are two of the whip's.",
    card: { kind: 'panel', section: '1 · THE RULES', title: 'ABILITIES', lines: ['A weapon move', 'Plays out as a scene, can\'t be interrupted', 'Final blow = a named finisher'] } },
  { id: 'rules5', bg: 296, dim: 0.5,
    say: "Super is a big move, charged by a meter. Dealing damage fills it, and taking damage fills it at half the rate.",
    card: { kind: 'panel', section: '1 · THE RULES', title: 'SUPER', lines: ['Meter fills as you deal damage', 'Taking damage fills it at half the rate', 'Full meter: one big move'] } },
  { id: 'rules6', bg: 231, dim: 0.45,
    say: "Shield blocks. The guard is one pool: it drains as it absorbs hits, and refills while it's down. Raise it fresh, right as a hit arrives, and it's a parry. And a swing that hits a shield costs fourteen extra frames of recovery, so swinging into a guard gets punished.",
    card: { kind: 'panel', section: '1 · THE RULES', title: 'SHIELD', lines: ['One guard pool: drains on block, refills when lowered', 'Fresh raise as the hit lands = parry', 'Blocked swing: +14 frames of recovery'] } },
  { id: 'rules7', bg: 140, dim: 0.45,
    say: "On screen, Hero's Triumph plays when the player takes one of Sovereign's stocks. Judgment Lash, Hogtied, and Serpent's Bite are Sovereign's whip finishers. Hot Streak and Unstoppable count hits in a row. And Comeback means a stock was taken by the fighter who was behind.",
    card: { kind: 'legend', section: '1 · THE RULES', title: 'READING THE SCREEN', rows: [["HERO'S TRIUMPH", 'the player takes a stock', '#ffd23f'], ['JUDGMENT LASH · HOGTIED · SERPENT\'S BITE', 'Sovereign takes a stock', '#ff6a5a'], ['HOT STREAK · UNSTOPPABLE', 'hits in a row', '#ffb020'], ['COMEBACK!', 'stock taken by the fighter behind', '#7fe6ff'], ['NULL RECOIL', 'Sovereign\'s juggle break (more soon)', '#ff3311']] } },

  // ── 2 · what it is ──
  { id: 'brain1', bg: 160, dim: 0.62,
    say: "Now, Sovereign. It isn't a script of if this, then that. It's a small neural network. Two hundred and fifty numbers go in. They pass through two layers of a hundred and twenty eight neurons, plus a small memory layer. Eleven numbers come out.",
    card: { kind: 'net', section: '2 · WHAT SOVEREIGN IS', title: 'A SMALL NEURAL NETWORK' } },
  { id: 'brain2', bg: 166, dim: 0.62,
    say: "Twenty times a second, those eleven numbers become four choices: move left, right, or stay. Jump or not. Shield or not. And attack, ability, super, or nothing. It always takes its top choice.",
    card: { kind: 'heads', section: '2 · WHAT SOVEREIGN IS', title: '20 DECISIONS A SECOND' } },
  { id: 'brain3', bg: 60, dim: 0.55,
    say: "Then it presses those buttons through the same keyboard code a human goes through. Same input buffer, same recovery, same limits. It never sets its own health or position. Everything it does, it did by pressing a button.",
    card: { kind: 'panel', section: '2 · WHAT SOVEREIGN IS', title: 'SAME HANDS AS YOU', lines: ['Presses virtual keys', 'Through the real keyboard handler', 'Same buffer, recovery and limits as a human', 'No direct control of health or position'] } },
  { id: 'brain4', bg: 72, dim: 0.62,
    say: "What does it see? For both fighters: position, speed, health, stocks, whether they're on the ground, cooldowns, super meter, shield, and stun. The distance between them. The nearest projectile. Both weapons and classes. And the buttons it's already holding.",
    card: { kind: 'grid', section: '2 · WHAT SOVEREIGN IS', title: 'WHAT IT SEES', items: ['Position + speed', 'Health + stocks', 'On ground / air jump', 'Cooldowns', 'Super meter', 'Shield + guard HP', 'Stun + ragdoll', 'Distance + facing', 'Nearest projectile', 'Both weapons + classes', 'Keys it is holding', 'Opponent read (next)'] } },
  { id: 'brain5', bg: 78, dim: 0.62,
    say: "It also keeps a running read on its opponent: sixteen tallies, like how often they approach, how far away they stay, how often they shield, whiff, or jump, and whether what it's doing is working. Each tally fades over about twenty seconds, so it reflects what you've been doing lately.",
    card: { kind: 'grid', section: '2 · WHAT SOVEREIGN IS', title: 'THE OPPONENT READ', items: ['Approaches or backs off', 'Distance it keeps', 'Time in the air', 'Shields when I swing', 'Sits in guard', 'Swings per second', 'Whiffs', 'Punishes my whiffs', 'Anti-air', 'Jumps', 'Ability use', 'Hoards super', '…half-life ≈ 20 s'] } },
  { id: 'brain6', bg: 176.5, dim: 0.4,
    say: "The body has a few rules of its own. At the start of a match, Sovereign counter-picks a weapon. Here, the whip. It moves at the player's speed, and gets one jump and one air jump, like anyone. And it has one built-in escape, Null Recoil. If it's juggled while helpless, it breaks free and throws the attacker off. No damage, and about a nine second cooldown. Watch for it in the match.",
    card: { kind: 'panel', section: '2 · WHAT SOVEREIGN IS', title: 'BODY RULES', lines: ['Counter-picks a weapon at match start (here: whip)', 'Moves at the player\'s speed', 'One jump + one air jump', 'NULL RECOIL: breaks a juggle, ~9 s cooldown'] } },

  // ── 3 · how it learned ──
  { id: 'learn1', bg: 104, dim: 0.62,
    say: "How did it learn? Reinforcement learning, with an algorithm called P. P. O. It started knowing nothing, not even what the buttons do. It played the real game, running without graphics at tens of thousands of frames a second. Damage it dealt and stocks it took counted as reward. Damage and stocks it lost counted against it.",
    card: { kind: 'reward', section: '3 · HOW IT LEARNED', title: 'REINFORCEMENT LEARNING (PPO)' } },
  { id: 'learn2', bg: 190, dim: 0.62,
    say: "Its opponents climbed a ladder. A bot that stands still. Then easy, medium, hard, and expert bots. Then a league: the old hand written Sovereign, past versions of itself, and bots that play one style, like turtling, rushing down, zoning, fighting in the air, or switching styles mid match.",
    card: { kind: 'ladder', section: '3 · HOW IT LEARNED', title: 'THE LADDER', steps: ['STANDS STILL', 'EASY', 'MEDIUM', 'HARD', 'EXPERT', 'LEAGUE'], note: 'League: old scripted Sovereign · past selves · style bots (turtle, rushdown, zoner, aerial, counter, switcher)' } },
  { id: 'learn3', bg: 208, dim: 0.62,
    say: "Later, separate networks called hunters were trained for one job: find a way to beat it. A new version only ships if it beats the old one by a clear margin, and the hunters don't do better against it. The version in this match is checkpoint twelve thousand, seven hundred and fifty six.",
    card: { kind: 'panel', section: '3 · HOW IT LEARNED', title: 'HUNTERS + A SHIP GATE', lines: ['Hunters: nets trained only to beat it', 'Ships only if it beats the last version by a clear margin', '…and no hunter gets better against it', 'This match: checkpoint 12,756'] } },

  // ── 4 · limits ──
  { id: 'limit1', bg: 240, dim: 0.66,
    say: "Now the honest part. Sovereign doesn't really adapt during a match, yet. We tested it: even wiping its memory on every single decision barely changed its win rate. Fifty four point eight percent, against fifty three point seven. It reacts to what you're doing right now, very well. But it doesn't build a plan against you over ten stocks.",
    card: { kind: 'stat', section: '4 · WHAT IT CAN\'T DO YET', title: 'IT DOESN\'T ADAPT (YET)', a: ['54.8%', 'normal'], b: ['53.7%', 'memory wiped every decision'], note: '1,000 matches per arm. The difference is inside the noise.' } },
  { id: 'limit2', bg: 250, dim: 0.62,
    say: "It also almost never blocks. It wins by trading hits, and turning its hits into finishers.",
    card: { kind: 'panel', section: '4 · WHAT IT CAN\'T DO YET', title: 'IT BARELY BLOCKS', lines: ['Blocks about 1 hit in 100 in training', 'Wins by trading and converting', 'Finishers close out the stock'] } },

  // ── 5 · match ──
  { id: 'match0', bg: 0, dim: 0.66,
    say: "The match. Hammer against whip, ten stocks each, recorded straight from the game. Callouts mark every stock and every Null Recoil.",
    card: { kind: 'title', kicker: '5 · THE MATCH', title: 'HAMMER vs WHIP', sub: 'Player vs Sovereign Ω · 10 stocks each · unedited' } },
];

// Callouts during the match, source seconds (from an OCR pass over the game's own banners).
// P = the player lost a stock, S = Sovereign lost a stock, R = Null Recoil fired.
const MATCH_EVENTS = [
  [14.5, 'S', "HERO'S TRIUMPH"], [24.0, 'R'], [29.5, 'P', "SERPENT'S BITE"], [42.0, 'S', "HERO'S TRIUMPH"],
  [66.5, 'P', "SERPENT'S BITE"], [88.5, 'P', 'JUDGMENT LASH'], [113.0, 'S', "HERO'S TRIUMPH"],
  [120.5, 'P', 'JUDGMENT LASH'], [144.5, 'P', 'HOGTIED'], [152.5, 'S', "HERO'S TRIUMPH"], [178.0, 'R'],
  [182.5, 'S', "HERO'S TRIUMPH"], [199.0, 'P', 'HOGTIED'], [219.0, 'S', "HERO'S TRIUMPH"], [235.0, 'P', 'HOGTIED'],
  [245.5, 'R'], [256.0, 'P', 'HOGTIED'], [275.0, 'S', "HERO'S TRIUMPH"], [286.0, 'P', 'JUDGMENT LASH'],
  [305.5, 'S', "HERO'S TRIUMPH"], [320.0, 'P', 'HOGTIED'],
];

const OUTRO = {
  id: 'outro', dim: 0.7,
  say: "Sovereign wins, with one stock to spare. You can fight it yourself in Stickman Evolution: The ninety fifth. It's free, in your browser. The link is in the description.",
  card: { kind: 'end', title: 'SOVEREIGN Ω WINS', sub: 'Fight it yourself · free in your browser', url: 'wronglysod.itch.io/stickman-evolution' },
};

module.exports = { BEATS, MATCH_EVENTS, OUTRO };
