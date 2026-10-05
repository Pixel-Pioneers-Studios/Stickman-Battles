'use strict';

// ============================================================
// CANVAS
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;

// Logical game-space dimensions — all game coordinates use these
const GAME_W = 900;
const GAME_H = 520;

// Resize canvas to fill the browser window; game world stays GAME_W x GAME_H (fixed resolution)
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.imageSmoothingEnabled = true;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ============================================================
// FIGHTER FIGURE PROPORTIONS
// ============================================================
// These were duplicated as literals across draw(), the melee-arc geometry,
// the ragdoll rig, the replay viewer and the anime FX — five copies that had
// to agree by hand, with only a comment holding them together. They live here
// so a proportion change cannot silently desync hit detection from the figure
// you can actually see.
//
// The vertical budget is load-bearing: head top sits at y+1, shoulders at
// y + FIG_SHOULDER_DY, hips 30 below that, feet at hips + FIG_LEG_LEN. That
// must land at ~y+86 against a 84px collision box or the fighter floats above
// the floor or sinks into it.
const FIG_HEAD_R  = 9;    // was 11 — a 22px head on an 85px figure read bobble-headed
const FIG_NECK    = 5;
const FIG_ARM_LEN = 24;   // drives melee reach — do not retune for looks alone
const FIG_LEG_LEN = 31;   // was 27; +4 exactly offsets the smaller head, keeping feet at y+86
const FIG_SHOULDER_DY = FIG_HEAD_R * 2 + 2 + FIG_NECK;   // head top -> shoulder
const FIG_LINE_W  = 3.8;  // outlined stickman model: thin limbs, dark interior, bright contour

// ============================================================
// SERVER SYNC CONFIGURATION
// ============================================================
// Set `url` to your server address so bans are enforced cross-device.
// Leave url as '' to run fully offline (bans are local-only).
//
// Deploying to Glitch / Railway / Render?
//   url: 'https://your-project.glitch.me'   ← no trailing slash
//
// Running locally?
//   url: 'http://localhost:3001'
//
const SERVER_CONFIG = {
  url:            'https://stickman-battles.onrender.com',
  syncIntervalMs: 300000,                     // re-sync bans every 5 min
};

// ============================================================
// CHANGELOG
// ============================================================
const CHANGELOG = [
  {
    version: '4.5.0',
    title: 'EVERY MOVE A SCENE',
    date: '2026-10-04',
    flavor: 'Abilities and supers play out like short fight scenes, every one of them has a finisher, and Battle Royale finally lets you finish someone without stopping the match.',
    isLatest: true,
    changes: [
      { cat: 'Combat',  text: 'Every ability (Q) and super (E) is now a short scripted scene: the move carries you and your target through its own choreography and nothing outside can interrupt it. A held target with a full super meter can press super to break out' },
      { cat: 'Combat',  text: 'Scenes never carry anyone off a ledge. An ability\'s final launch is softened near the edge; a super\'s is not, because a super is a kill move' },
      { cat: 'Cinematic', text: 'Each ability and super has its own finisher, 51 in all. A kill landed by a move plays that move\'s finisher instead of the weapon\'s generic one' },
      { cat: 'Mode',    text: 'Battle Royale has finishers. They play only on your screen, when you land one or are hit by one, and the match keeps running around you. Both fighters are invulnerable and ignored by bots until it ends, and finishing someone heals you 25' },
      { cat: 'Mode',    text: 'Battle Royale bots heal 25 for every elimination, on screen or off' },
      { cat: 'Mode',    text: 'Killing the beast or the yeti in Battle Royale offers you its form: its body, moves and toughness, with a form health bar on top of your own. Press F to take it or G to turn it down. Bots earn forms the same way' },
      { cat: 'Mode',    text: 'Battle Royale bots fight each other off screen now, so the field thins out across the match instead of the storm killing 38 at once at the end. Eliminated fighters drop their weapon and bag' },
      { cat: 'Mode',    text: 'Fight Ladder: ten 1v1 rungs against bots, each harder than the last, with coins for every win. New players start on the first rung' },
      { cat: 'Network', text: 'Public Server: a hostless lobby of up to 10 players. It starts as a free-for-all in Mega City with roaming bots, and every five minutes players vote on the next mode' },
      { cat: 'Mode',    text: 'Nexus Defense was a guaranteed loss at wave 4. Rushers can be knocked back now, waves arrive in a stream instead of all at once, and the Nexus repairs between waves' },
      { cat: 'Combat',  text: 'Combo scaling: from the third hit of a combo on, each hit deals less (90%, 75%, 60%, then 50%). Supers never drop below 70%' },
      { cat: 'Combat',  text: 'Two basic swings in a row that both land is the limit; a third shows SWITCH IT UP. A whiffed swing does not count toward it' },
      { cat: 'Combat',  text: 'Only one fighter at a time can keep you stunned. While someone else\'s hit has you stunned, a second attacker\'s hits still deal damage but cannot stun you again' },
      { cat: 'Combat',  text: 'Shields are one pool of 50 instead of a ladder of weakening raises. Hits drain it, it refills after a short rest, and you can swing straight out of guard. A blocked melee swing leaves the attacker open for 14 extra frames' },
      { cat: 'Combat',  text: 'Weapon hitboxes now match the drawn weapon, including its length and grip angle. Left-facing swings used to tilt the opposite way to right-facing ones' },
      { cat: 'Balance', text: 'Weapon pass: every super now deals at least 18 damage per use and almost every ability at least 10. Gun Burst Shot no longer decays to 10% damage for the rest of the match, and Flail Orbit Storm hits what it touches' },
      { cat: 'Balance', text: 'Throwing Knives fly faster (18, was 14), come back faster on Recall, and are bigger with a matching hitbox' },
      { cat: 'Visual',  text: 'Hits shake the world: loose dirt, sparks and cracks thrown from the arena itself, picked per arena' },
      { cat: 'Visual',  text: 'A new running animation, taken from slow-motion footage of a real runner' },
      { cat: 'Story',   text: 'Story difficulty: Normal, Challenge and Evolution. Evolution enemies resist a move you keep repeating, and harder difficulties pay more' },
      { cat: 'Story',   text: 'Every story chapter has its own hand-built map, with climbs, drops, portals, water and set pieces that match the story' },
      { cat: 'Story',   text: 'The chapter list is a star chart of 24 worlds. Zoom into a world to pick a chapter. The old list is still one toggle away' },
      { cat: 'Story',   text: 'Hidden caches are visible again in themed worlds, tunnel mazes lead to them, and rest checkpoints break up long levels' },
      { cat: 'Story',   text: 'True Form is now called Cosmic Axiom, and canon explains where its power comes from', spoilerLevel: 2 },
      { cat: 'Boss',    text: 'God and the final secret boss are telegraph-and-punish fights instead of standing still and clicking. Attacks show where they will land, stuns are capped, and super meter no longer refills every couple of swings', spoilerLevel: 3 },
      { cat: 'UI',      text: 'Achievements have their own badges, tiers and categories, and a trophy button on the home screen. Locked achievements tell you how to earn them' },
      { cat: 'UI',      text: 'Mobile: the second player\'s pad no longer appears in single-player modes, and its super button no longer pauses the game' },
      { cat: 'Fix',     text: 'Bots on the Ice arena brake before sliding off the edge. They used to chase you straight off the end of the floor' },
      { cat: 'Fix',     text: 'Cloud Kingdom gravity is much stronger. A jump plus double jump used to rise 834px' },
      { cat: 'Fix',     text: 'Multiverse Gravity Flux really flips gravity now, and the kill feed names the fighter who scored the KO' },
      { cat: 'Fix',     text: 'Settings > Reset Progress really resets now. The save was written straight back as the page closed' },
    ],
  },
  {
    version: '4.4.1',
    title: 'COMBAT BALANCE',
    date: '2026-09-26',
    flavor: 'Class perks you can no longer skip, and a Sword that stops deleting half a health bar every three seconds.',
    isLatest: false,
    changes: [
      { cat: 'Balance', text: 'Class perks fire at 55% health (was 15-25%). One heavy hit used to carry a fighter from above the threshold straight to zero, so the perk never went off at all. Only a near one-shot can skip it now' },
      { cat: 'Balance', text: 'Torren\'s Lightning Storm still strikes if Torren falls during its windup' },
      { cat: 'Balance', text: 'Sword Blade Storm hit a close target twice, with the burst and then the forward arc — 46 damage every 3 seconds, double any other melee ability. It now hits each target once (24), and its cooldown is 4 seconds (was 3)' },
      { cat: 'Balance', text: 'Whip Lasso hooked for 2.5 seconds on a 2.5-second cooldown, so a steady Lasso kept every lash a critical hit forever. The hook now lasts 1.5 seconds and the cooldown is 3.5. A tip crack hits for 20 (was 23)' },
      { cat: 'Balance', text: 'Combat (fists) 19 damage to 16, and a little slower between punches. Spamming it killed faster than any other weapon' },
    ],
  },
  {
    version: '4.4.0',
    title: 'THE ARSENAL UPDATE',
    date: '2026-09-24',
    flavor: 'Six new weapons, three new classes, a stadium with four sports in it, and hits that finally land when they should.',
    isLatest: false,
    changes: [
      // ── Weapons & classes ─────────────────────────────────────────────────
      { cat: 'Weapon', text: 'Bomb — lobbed bombs that roll along the floor and set each other off. Q throws stickies that cling to floors, walls and enemies, up to six at once; hold it to set the whole field off together' },
      { cat: 'Weapon', text: 'Throwing Knives — six of them, and every throw leaves a blade on the floor. Walk over one to pick it up, or Recall them all at once and cut through anything standing between you and your knives' },
      { cat: 'Weapon', text: 'Glass Blade — the hardest-hitting fast blade in the game, and it cracks every time you are hit. Three cracks and it shatters; break it yourself with Shatterstep before a fight you cannot win breaks it for you' },
      { cat: 'Weapon', text: 'Anchor — slow overhead swings that take no knockback while you are planted. Throw it, then haul a hooked enemy to you or pull yourself to it' },
      { cat: 'Weapon', text: 'Crossbow — slow, heavy bolts that pin a target to the wall they drive it into. Tripwire strings a wire along the ground for the first person careless enough to cross it' },
      { cat: 'Class',  text: 'Demolitionist (bigger blasts, bomb-jumps that go where you aim) and Warden (every third hit taken is halved, and slow to match) join the roster' },
      { cat: 'Mode',   text: 'The new weapons drop from Battle Royale chests' },
      { cat: 'Weapon', text: 'A new fighting style is waiting at the end of a late-campaign lesson: the Fragment, and the Adept class built around it. Charging it pulls enemies in; the blast holds them in front of you instead of throwing them away, so Barrage follows straight into it', spoilerLevel: 2 },
      { cat: 'Fix',    text: 'Fragment Barrage pushed its own target out of reach — by the third punch the gap was half again longer than a punch, so the last two always missed. You now follow them in, the punches hold them, and its shockwaves no longer vanish into the punch that threw them. Overdrive heals on cast, since it never deals the damage every other super heals from', spoilerLevel: 2 },

      // ── Combat ────────────────────────────────────────────────────────────
      { cat: 'Combat', text: 'Your own hits no longer protect the opponent from you. The invulnerability a hit grants used to block your next swing, your ability and your super too, so a hit followed by anything fast lost the follow-up — measured at 8% to 44% of every weapon\'s damage. It now only stops the same attack from hitting twice, and a second attacker from piling on' },
      { cat: 'Combat', text: 'Combo escapes no longer switch on invulnerability halfway through a string. The wall escape, the air-juggle escape and the cap on long stuns now leave you unstunnable for a moment instead — the hits still land, but none of them can lock you down again, so the way out is getting your controls back rather than a patch of immunity' },
      { cat: 'Combat', text: 'Combo strings. The first two basic melee hits of a combo push lightly and hold the target until your next swing connects; the third launches. Before this, every hit launched and only one in four ever led to a second' },
      { cat: 'Combat', text: 'Supers heal when they connect, not when you cast them — a whiffed super heals nothing, and the heal shows as a green number. Only supers that land count toward a domain' },
      { cat: 'Combat', text: 'The air costs something now. Land with an attack still out and you eat its recovery before you can act, the shield only goes up on the ground, and holding down past the top of a jump fast-falls' },
      { cat: 'Combat', text: 'The ground roll has followed the Air Dash out. Double-tapping a direction no longer does anything' },
      { cat: 'Fix',    text: 'Guns, bows and every ability could stun their own user. The punishment for whiffing a melee swing was applied to any attack that ended without a melee hit, including shots and abilities that connected' },

      // ── Balance ───────────────────────────────────────────────────────────
      { cat: 'Balance', text: 'Weapons and classes retuned with the strongest AI in the game on both sides, rather than against the stock bot — which never punishes recovery and so made every heavy weapon look better than it plays' },
      { cat: 'Balance', text: 'Varek\'s rage never reset, so from the third life of a long match every hit carried the full bonus. It now resets each life and caps at +20%' },
      { cat: 'Fix',     text: 'Katana follow-through slashes could cut the same target a second time for a hidden 22 damage' },
      { cat: 'Fix',     text: 'Class descriptions matched the code for the first time in a while: HP and speed are read live, and every perk says what it actually does' },

      // ── AI ────────────────────────────────────────────────────────────────
      { cat: 'AI', text: 'Bots no longer freeze under a ledge you are standing on. They walk to somewhere they can jump from and come up after you' },
      { cat: 'AI', text: 'The Sovereign chooses from the whole arsenal now — every weapon and class — starting from the kits he found strongest in his own fights, and he takes his class\'s health with it', spoilerLevel: 3 },
      { cat: 'AI', text: 'He learns your habits per opponent: whether you live in the air, and how you come down when you are near him', spoilerLevel: 3 },
      { cat: 'AI', text: 'A safety net, disclosed: if you lead him by two stocks or more, his hits grow stronger until the gap closes', spoilerLevel: 3 },
      { cat: 'Arena', text: 'The Circuit no longer drops pickups or crates. Its curses only ever landed on the player', spoilerLevel: 3 },

      // ── Modes & sound ─────────────────────────────────────────────────────
      { cat: 'Mode',  text: 'Soccer grew into the Sports Arena: soccer, basketball, volleyball and dodgeball. Nobody takes damage but every hit still knocks back, so fighting is how you win the ball — and each weapon\'s ability doubles as a signature ball move' },
      { cat: 'Audio', text: 'Music ducks under spoken story dialogue instead of talking over it' },
    ],
  },
  {
    version: '4.3.0',
    title: 'THE SHARPENED EDGE UPDATE',
    date: '2026-09-16',
    flavor: 'Thirteen weapons measured against each other until none of them was the obvious answer, a front door worth walking through, and levels that expect you to actually finish them.',
    isLatest: false,
    changes: [
      // ── Story levels ──────────────────────────────────────────────────────
      { cat: 'Story',  text: 'Reaching the exit no longer finishes a level. Every enemy in the area has to be down first, and the exit marker burns red until they are — running the length of a world past everything that lived in it was, until now, a complete clear' },
      { cat: 'Story',  text: 'A level\'s objective is a requirement rather than decoration. Caches have to be recovered, mechanisms thrown, an escort actually delivered — and finishing the objective no longer ends the level on its own while enemies are still standing' },
      { cat: 'Story',  text: 'Optional fights stay optional. Guardians posted on hidden caches and the elites behind side portals are off the required list, so nothing off the main path can hold a level open' },
      { cat: 'Story',  text: 'The objective bar carries a live count of what is left, and a straggler who ends up somewhere you would never think to look comes to find you instead of hiding. Enemies you outran are spawned in rather than left queued where they can never be fought' },
      { cat: 'Story',  text: 'On the long one-map regions, each stretch is sealed by the same rule — you can no longer bank chapter after chapter by walking past their fights' },
      { cat: 'Fix',    text: 'Scenes between levels played on top of a live match. The world underneath kept running for the whole cutscene — enemies fought, timers ran, and you could take damage from a fight nobody could see. Everything stops now while a scene, or a branching choice, is on screen' },
      { cat: 'Fix',    text: 'Escape during a between-level scene both skipped the scene and opened the pause menu underneath it' },

      // ── Combat ────────────────────────────────────────────────────────────
      { cat: 'Combat', text: 'Clashes are a precision beat now, not a default outcome. Two blades only ring off each other if the swings began within three frames, both fighters are swinging into each other, and both weapons actually reach — miss any of those and someone simply gets hit' },
      { cat: 'Combat', text: 'Strength has to match. A swing meets a swing, an ability meets an ability, a super meets a super — bring the weaker action into a stronger one and it breaks outright: your swing is cancelled with real recovery on it and their attack lands untouched' },
      { cat: 'Combat', text: 'Three fast hits with your back to a wall and you get out of it, with invulnerability on the way. This existed but belonged to one boss alone, so no player, bot or story enemy had any answer to being pinned — and the walls that spring up mid-level put a corner anywhere. It was also measuring the wrong wall: it tested the edges of the screen rather than of the world, so in a walking world it could not fire where you were actually trapped. It now reads the walls that are really there, the spring-up ones first' },
      { cat: 'Balance', text: 'Air Dash is gone. Two very different moves were sharing one double-tap — a ground roll and an air burst — and the airborne half turned spacing into a non-question. The skill node is removed and the 120 EXP it cost is refunded to saves that had bought it' },

      // ── Balance ───────────────────────────────────────────────────────────
      { cat: 'Balance', text: 'Every melee weapon rebalanced against measurement rather than feel. A headless harness fought all thirteen against each other, 384 matches per weapon per round, and the spread between the best and worst weapon fell from 95 points of win rate to 51 — the imbalance, measured as distance from an even 50%, roughly halved' },
      { cat: 'Balance', text: 'The flail and the hammer were the two genuinely broken weapons, winning 100% and 92% of their matchups. Both are now near the middle of the field, still the heaviest and slowest things you can carry — the per-hit weight is the point, and it stayed' },
      { cat: 'Balance', text: 'The axe was the worst weapon in the game by a distance, winning 5% of its matchups; it is now competitive. The combat gloves, shield, electric staff and broomstick were all raised out of the bottom of the table' },
      { cat: 'Balance', text: 'Weapon stats now appear as bars in the picker, read live from the weapons themselves. The old descriptions carried damage figures typed in by hand, and the balance pass had quietly made nearly every one of them wrong' },
      { cat: 'Fix',    text: 'Ranged weapons were deliberately left alone. They come last in every simulated table, but that is the bots refusing to keep their distance rather than the weapons being weak — a bow with 700 range was fighting at a median gap of 130 pixels, inside the band where its own damage is penalised. Buffing the numbers would have broken them for anyone who actually kites' },

      // ── The shell ─────────────────────────────────────────────────────────
      { cat: 'Visual', text: 'The in-game HUD was reading as a debug readout. Health bars stretched to nearly half the screen on a wide display — which also made a 10-damage hit look like nothing had happened — so they are capped, set into a recess, and pulled off full saturation. Lives are drawn pips now instead of characters that landed differently on every machine' },
      { cat: 'Visual', text: 'Damage numbers no longer out-shout the fight. They appear on every hit, and at full chroma a normal exchange was a confetti spray over the fighters throwing the punches — the damage tier still reads at a glance' },
      { cat: 'Fix',    text: 'A clash printed itself as "-CLASH". The floating-number code assumed it was always given a number, so it prefixed the label with a minus sign and picked its colour by comparing text against damage thresholds' },
      { cat: 'Visual', text: 'Fighters are drawn as one figure instead of a set of separately painted parts. The old build read as segments bolted together; the body is now a single silhouette under one light' },
      { cat: 'Visual', text: 'Arena colour reworked across the board — grounded materials and real value steps instead of flat bright fills' },
      { cat: 'Fix',    text: 'The Defense minigame never drew its nexus. Two different functions were competing for the same name, and the one that won belonged to the story mode and quietly did nothing here' },
      { cat: 'Visual', text: 'The whole menu was running three different button designs at once — flat glass pills, a gradient-and-bevel set, and a hand-styled one-off on the main button — and whichever loaded last won. There are three roles now: one filled button for the single thing to press, an outline for alternatives, and quiet text for utilities' },
      { cat: 'Visual', text: 'Ten card designs, each with its own colour and glow, collapsed onto one surface. A row of them used to read as unrelated products' },
      { cat: 'UI',     text: 'The home screen opens on your own progress — your name, level, coins, and the chapter you stopped on, with one button to resume it. Every mode is visible as a tile instead of hidden two clicks behind a pair of cards, and the first-run tutorial offer no longer sits in the middle of the screen as an accept-or-dismiss bar' },
      { cat: 'Visual', text: 'New home screen art: instead of a figure standing still, you come through the rift mid-dash with hunters closing from the other side' },
      { cat: 'Visual', text: 'Loading screens are animated scenes now, one for each situation — story, boss, Cosmic Axiom, Battle Royale, minigames, training, online and versus. Three still images had been covering six modes between them, and Battle Royale and online matches had no art of their own at all', spoilerLevel: 2 },

      // ── Fixes ─────────────────────────────────────────────────────────────
      { cat: 'Fix',    text: 'Checkmarks sat off-centre in every checkbox in the game. The tick was positioned by hand against a box that two competing rules had made 18 by 15 pixels — not square, so no amount of nudging could have centred it' },
      { cat: 'Fix',    text: 'Story progress could read past 100% — a finished save reported 201%, because completed chapters were being counted with duplicates. The percentage on the home screen and the journey screen are now the same number, and that number is the count of distinct chapters you have actually beaten' },
      { cat: 'Fix',    text: 'The Resume button on the pause screen was printing a black outline over its own near-black label, smearing the word into an unreadable double image' },
      { cat: 'Setting',text: 'Replay Mode is on by default, so returning to a chapter you have beaten replays its cutscenes and fights instead of letting you walk through' },
      { cat: 'UI',     text: 'The build number is back on the home screen, where it opens the changelog' },
    ],
  },
  {
    version: '4.2.0',
    title: 'THE LIVING WORLD UPDATE',
    date: '2026-09-09',
    flavor: 'Every road you walk is somewhere now, every scene between the fights plays as a film, and three tests are waiting that no amount of reflex will pass.',
    changes: [
      // ── Worlds ────────────────────────────────────────────────────────────
      { cat: 'Visual', text: 'Every walking chapter renders the place it was written for. All 55 of them were authored with an arena — a coast, a cave, a burning city — and the walking-world builder was throwing that away and drawing the same navy sky and the same generic city tiles for the entire campaign. 33 distinct worlds now render across 59 chapters, up from one' },
      { cat: 'Visual', text: 'Enclosed places are visibly enclosed — the suburb has its fence, the void and the god domain have their walls, drawn at the real edges of the map rather than somewhere out in the middle of it' },
      { cat: 'Visual', text: 'New backdrops built out for the soccer stadium, deep space, the lava fields, the frozen peaks, Mega City, the Warp Zone, the Grand Colosseum and The New Realm, each with its own depth layers instead of a flat gradient' },
      { cat: 'Visual', text: 'Eight arenas that existed in the game but appeared in no chapter at all are now placed across the campaign, breaking up stretches that had been repeating the same theme' },
      { cat: 'Fix',    text: 'One chapter\'s palette could bleed into the next — the sky and ground gradients were cached under a single name shared by every walking world' },

      // ── Story presentation ────────────────────────────────────────────────
      { cat: 'Cinematic', text: 'Every story scene is a cutscene now. Beats advance on their own once a line has typed and held, the camera keeps drifting so a long hold is never a frozen still, the letterbox slides in, and there is a real skip that ends the sequence instead of nudging you forward one line at a time. Hold the button to fast-forward at 4x' },
      { cat: 'Cinematic', text: 'A run of consecutive story chapters can now play as one continuous film — narration, your choice, then straight into the next — instead of eleven chapters and eleven victory screens' },
      { cat: 'Cinematic', text: 'Characters in story scenes are hand-posed now. A keyframed rig drives them through held poses, anticipation and three-frame snaps, which is something the old motion could not express at all; figures also scale with your window instead of sitting at a fixed size that vanished on a large display' },
      { cat: 'Visual', text: 'Captions are a soft gradient scrim tinted to the act rather than a flat black subtitle bar, the type scales with your window, and in cinematic mode the line sits above the lower bar the way film subtitles do' },
      { cat: 'Story', text: 'Every narrated chapter has its own staging. 47 chapters had no scene written for them and were falling back to a generic act backdrop — the count is now 111 of 111' },
      { cat: 'Fix',    text: 'Scene staging was landing on the wrong chapters. Scenes are keyed by chapter number and every chapter added since they were written had slid them along, so only 10 of 66 were still on the chapter they were authored for and 25 were sitting on chapters with no story at all. All 66 are back where they belong' },
      { cat: 'Story', text: 'The story reads faster. Hold times are now a reading-rate budget rather than a fixed floor and cap — short lines used to sit on screen twice as long as anyone needs while the longest cards flashed past unreadably — and around 34 chapters carrying real repetition were trimmed. The whole campaign is about five minutes shorter with nothing cut that mattered' },
      { cat: 'Fix',    text: 'Story figures drew in the wrong colour. The face was setting a pen for the brows and mouth and never putting it back, so every attacking figure was rendered entirely in mouth-red and every hurt figure in washed-out black, across all 113 scenes' },
      { cat: 'Fix',    text: 'Cleaned up 273 stray quote-comma marks that were being printed inside story captions across 34 chapters, and fixed a crash in nine scenes that opened with a ring of portals' },

      // ── New content ───────────────────────────────────────────────────────
      { cat: 'Mode', text: 'The Trials — three chapters that test something other than your damage. The Trial of Sense hands you a lantern that deals no damage and fires a reveal sweep against an opponent you cannot see; the band between its two rings shows the distortions a body leaves in space, not the body, and the echo it stamps is already stale by the time you read it. Your weapon arc, your opponent\'s footfall dust and their hit reactions stay visible — you are blind to find them and sighted to fight them' },
      { cat: 'Mode', text: 'The Trial of Control inverts gravity or your own controls mid-fight, each on its own readable tell — horizontal bands for one, vertical for the other — so you learn which rule is about to change rather than only that one is' },
      { cat: 'Mode', text: 'The Trial of Self-knowledge fights you with a copy that replays your own inputs, mirrored, on a delay, carrying your weapon. It cannot be beaten by reacting faster; it can only be beaten by breaking your own habits' },
      { cat: 'Mode', text: 'A late-campaign chapter now fields every one of the ninety-four before you at once, in order, each a little harder than the last. Ninety-four, and you — which is the number in the title', spoilerLevel: 2 },

      // ── Combat ────────────────────────────────────────────────────────────
      { cat: 'Combat', text: 'Whip rework — the tip is a sweet spot now. Connect at full extension for 1.55x damage and a bleed; connect up close and you only chip. Q lassos and hooks the target for two and a half seconds with every lash counting as a tip hit, and E is now Serpent\'s Coil: three extending lashes with the third launching' },
      { cat: 'Combat', text: 'Finishers smear. The single biggest swing in the game was the only swing that never trailed its weapon, because a finisher deliberately never enters the attacking state. All 29 of them now trail through the blow' },
      { cat: 'Combat', text: 'You get 48 frames of invulnerability when a finisher hands control back, so executing someone in a crowd no longer gets you punished on the exact frame the camera lets go' },
      { cat: 'Balance', text: 'Supers no longer heal you faster than a boss can hurt you. Every super restores health and every fifth becomes a domain, and the fill rate was quick enough that a player could out-heal a boss indefinitely. Damage dealt while your own domain is open now charges nothing — the domain already pays you in every other way — and damage to minions charges at a third, because a stream of minions is not an opponent' },
      { cat: 'Balance', text: 'Domain hazard knockback cut from 18 to 10. It was the hardest knockback of any domain hazard, so a single sure-hit near the edge was taking a whole life on 16 damage' },

      // ── Bosses ────────────────────────────────────────────────────────────
      { cat: 'AI',  text: 'Boss recovery is paced by phase. Later phases buy far more specials than early ones, so a flat recovery cost meant the deeper into the fight you got the less the boss did — melee dropped from 25 swings a minute to 11. The cost now scales with the phase, and a melee pressure window opens as each recovery ends so two recoveries can never chain back to back' },
      { cat: 'Fix', text: 'One boss super was buying 22 seconds of silence from a single cast — its recovery was written in the wrong unit. That was the single largest cause of dead air in the fight' },
      { cat: 'Combat', text: 'Boss specials tell you where they land. The meteor drew a shadow a fifth the size of its blast, so standing clear of the only visible marker still cost you 43. The chain slam teleported its victim and read as a 76-damage combo out of nowhere — it telegraphs now and whiffs if you leave. Spike volleys warn before they rise and are no longer narrower than the fighter they are aimed at, and beam warnings drop from five seconds to under two, which was long enough to walk away and come back before it fired' },
      { cat: 'Fix', text: 'The gravity pulse dealt no damage at all — it dragged you in and then could not punish you for being there. It crushes on a falloff now' },
      { cat: 'Fix', text: 'A boss waiting offstage between phases could still land hazard damage on you from two thousand pixels away with nothing visible on screen to blame' },
      { cat: 'Fix', text: 'Dying clears a boss\'s lingering debuffs. Size was already restored on respawn but inverted gravity and inverted controls were not, so you came back still mirrored from a hit you had already paid a life for' },
      { cat: 'Balance', text: 'Cosmic Axiom hits for 0.85x across all of its attacks, tuned in one place so its twenty-six damage sources stay in proportion to each other', spoilerLevel: 2 },
      { cat: 'AI',  text: 'The Sovereign keeps a dossier on you. His adaptation had no opponent terms in it at all — every input was about himself — so he converged to the same fighter against a hammer berserker, a katana assassin and a spear zoner alike. He now remembers by kit and by fighting style, so what he learns transfers to opponents he has never met, and a rematch starts more than twice as close to where the last one ended', spoilerLevel: 3 },
      { cat: 'AI',  text: 'His counter-picking reads a weapon\'s authored class and its reach instead of guessing from cooldown — spear, scythe and katana all read as heavy to him, and nothing in the decision looked at range, so he would answer a 130-reach spear with an 80-reach hammer and walk into pokes all match', spoilerLevel: 3 },
      { cat: 'AI',  text: 'He stops retreating from domains that do not need him close. Against hazard-rain domains distance buys him nothing and costs him his entire offense — he spent one whole domain at zero attack uptime, 40% stunned, took 142 and dealt nothing. He also no longer gets pulled off the corner by the ring-out guard, which is where his kills come from', spoilerLevel: 3 },

      // ── Engine ────────────────────────────────────────────────────────────
      { cat: 'Fix', text: 'Bots follow a path again. The waypoint check measured from the middle of the bot to the top of the platform, a gap that is always larger than the tolerance while standing on one, so a bot walked to the first point of its route and stopped there permanently' },
      { cat: 'Fix', text: 'The camera holds still. It biases toward you as fighters separate so a distant opponent on a wide map stops dragging the view, tracks from the edge of a soft dead zone instead of snapping, and no longer fights the HUD for the top of the world — which is what was causing the vibration' },
      { cat: 'Visual', text: 'Hand-drawn weapon art is in for the axe and scythe, with the drawn shapes falling through to the old procedural art if they fail to load. Asymmetric weapons no longer draw upside down when you face left, and the ammo dots, cooldown bar, invincibility ring and scar trail no longer get rotated off the screen along with the weapon' },
      { cat: 'Fix', text: 'Fixed a crash on chapters whose world has no floor beneath it — the void fog was building an impossible gradient and taking the frame down with it' },

      // ── UI ────────────────────────────────────────────────────────────────
      { cat: 'UI', text: 'The version number is back on the home screen, under the title, and clicking it opens these notes' },
      { cat: 'UI', text: 'Phone layout fixes for the home button cluster and the tutorial prompt' },
      { cat: 'System', text: 'Portal builds: CrazyGames support and its consent notice, and Newgrounds and Game Jolt are now allowed origins for online play' },
    ],
  },
  {
    version: '4.0.26',
    title: 'THE CHOSEN KIT UPDATE',
    date: '2026-08-26',
    flavor: 'The hardest opponent in the game had been fighting with a weapon he never chose. He chooses now — and he changes his mind between lives, based on what has been working on you.',
    isLatest: false,
    changes: [
      { cat: 'AI',      text: 'The Sovereign picks his own weapon and class now. He was locked to one kit for an entire match with no way to change it, which meant the single biggest factor in how much damage anyone does was decided for him before the fight started and never revisited', spoilerLevel: 3 },
      { cat: 'AI',      text: 'He starts on his own blade and re-picks every time he loses a life, keeping whatever has actually been earning damage against you and counter-picking your weapon — light kits to punish a slow swing, heavy ones to out-reach a fast one. Beat one kit and you have not beaten him; you have taught him to bring a different one', spoilerLevel: 3 },
      { cat: 'Balance', text: 'His signature blade hit for less than the sword you start the game with, and he fought with no class at all — so he was giving up his class perks, his class damage and his own finishing move for the whole fight while you kept all of yours', spoilerLevel: 3 },
      { cat: 'Fix',     text: 'A finishing move written for a fighter with no class could never play, because the game only ever looked one up by class. One had been written and had never once been seen. It plays now' },
      { cat: 'Fix',     text: 'The Sovereign could chain a third and fourth jump out of thin air and climb clean off the top of the arena. He now lives by the same one-ground-jump-and-one-air-jump rule you do — being knocked upward still throws him as far as it ever did', spoilerLevel: 3 },
    ],
  },
  {
    version: '4.0.25',
    title: 'THE GROUNDED UPDATE',
    date: '2026-08-23',
    flavor: 'Some hits used to put you in the air and keep you there. However hard you get hit now, you come back down — and you get a moment to do something about it.',
    isLatest: false,
    changes: [
      { cat: 'Fix',    text: 'Being launched into the air no longer locks you out of the fight. Every anti-combo protection in the game only ever limited horizontal knockback, so attacks that throw you straight UP slipped past all of it — a fighter held above the floor could be re-launched forever without ever touching ground. Repeated launches now weaken, so you always land' },
      { cat: 'Fix',    text: 'The safeguard that caps how long you can be stun-locked had never once activated. It only recognised a chain if hits landed within four frames of each other, but real attack speeds are closer to thirty — so it saw every hit as a fresh start and never triggered. It now measures against when your last stun was due to end, which is what it was always meant to do' },
      { cat: 'Combat', text: 'Hammer\'s Ground Shockwave, Spear\'s Ground Spike and Frying Pan\'s Ground Pound set your upward speed directly, ignoring every launch protection. All three now go through the shared system — they hit exactly as hard, they just cannot juggle you indefinitely' },
      { cat: 'Fix',    text: 'Knight is barred from boss encounters. It is a joke class with deliberately silly numbers, and it trivialised fights that are meant to be the hardest in the game. Pick it for a boss and you will be handed a random real class instead — it is untouched everywhere else' },
      { cat: 'AI',     text: 'The Sovereign no longer sits on a full super bar waiting for a perfect opening that never comes, and can break out of being juggled once his blade discharges — he pays for it with a long cooldown, so sustained pressure still beats him', spoilerLevel: 3 },
      { cat: 'Mode',   text: 'Training mode gained a measurement lab (F5, or the Lab button): live frame data for your current weapon — startup, active, recovery and cooldown — plus a readout of how much of the fight your opponent has spent unable to act, and a hit log showing the damage and knockback actually applied after every cap and scaling rule' },
      { cat: 'Mode',   text: 'Training dummies do something now. They can stand, block, jump or counter-attack on a fixed delay, so you can practise against a guard, test whether a string is safe, and measure your own punish windows' },
      { cat: 'Fix',    text: 'Spawning a bot from the developer console while invincible made it chase you instead of the boss — it now targets the nearest fighter that can actually be hurt' },
    ],
  },
  {
    version: '4.0.24',
    title: 'THE CONVICTION PASS',
    date: '2026-07-27',
    flavor: 'Two classes never had a Conviction of their own. They do now — and every other Conviction has stopped trying to delete you in three seconds.',
    isLatest: false,
    changes: [
      { cat: 'Mode',   text: 'Warrior Conviction added — The Proving Grounds: swords erupt out of the floor under whoever is standing still, and a bronze duel ring closes around the warrior over the full 25 seconds; anyone outside the ring bleeds a small tick every two-thirds of a second, so the domain forces the fight instead of chipping you down from across the arena' },
      { cat: 'Mode',   text: 'Summoner Conviction added — Endless Menagerie: a summoning sigil anchors the arena and streams spectral familiars that home in slowly on the nearest enemy and burst on contact; they are capped in speed and expire on their own, so they can be outrun, baited into a wall, or simply walked away from' },
      { cat: 'Visual', text: 'Both new Convictions have their own entry cinematic, sky atmosphere and hazard art — the warrior plants a ring of swords as the duel ring snaps shut, the summoner inscribes the sigil while six familiars converge out of the dark' },
      { cat: 'Mode',   text: 'Conviction damage rebalanced across every class — the domains were killing a full health bar in a couple of unlucky seconds. Single-hit damage is down roughly 40-50% on lightning, logs, arrows, holy beams, void rocks, bullets, blades, fists, pendulums and pulses; the archer\'s giant arrow is still the heaviest hit in any domain but no longer takes half a health bar in one shot' },
      { cat: 'Mode',   text: 'Convictions can no longer land several hazards on you in the same instant — a target now takes domain damage at most four times a second. Standing in a bullet wall, the three holy beams, or the void rocks while the vortex drags you through them is still fatal, it just gives you frames to react instead of deleting you' },
      { cat: 'Mode',   text: 'Lightning and holy beams warn for longer before they land, and the Blades of Chaos sweep a little slower, so all three can actually be read and jumped' },
      { cat: 'Fix',    text: 'Warpath Domain logs were spawning in a band that sat entirely above a standing fighter, so they flew harmlessly overhead almost every time. They now cross at body height and are a real hazard again at their new lower damage' },
    ],
  },
  {
    version: '4.0.23',
    title: 'THE MISSING CLASSES UPDATE',
    date: '2026-07-26',
    flavor: 'They were written as soldiers and they have been fighting as strangers. Everyone on the road is who they were meant to be now — expect the campaign to push back harder.',
    isLatest: false,
    changes: [
      { cat: 'Fix', text: 'Over a hundred campaign opponents have been fighting with no class at all. Two class names used all through the story were never real classes, so the game quietly gave those enemies no kit, no health profile and no speed profile — they fought as blank defaults. Every one of them now fights as the class they were written as' },
      { cat: 'Fix', text: 'The affected fights include Vault Wardens, checkpoint elites and several named opponents, all of which were meant to be heavier and slower or faster and frailer than the fighters you were actually meeting' },
      { cat: 'AI',  text: 'Expect the campaign to be harder as a result — this restores intended difficulty rather than adding new difficulty on top of it' },
      { cat: 'Fix', text: 'Enemies written with a specific health value keep it now. Applying a class was overwriting that authored number with the class default, so hand-tuned guards and elites were quietly reverting to stock toughness' },
    ],
  },
  {
    version: '4.0.22',
    title: 'THE SCREEN UPDATE',
    date: '2026-07-26',
    flavor: 'It starts on an ordinary street and ends where you are standing now. The way in is a door, not a corridor — you pick where it leads.',
    isLatest: false,
    changes: [
      { cat: 'UI',     text: 'The opening no longer drops you into the campaign. It ends on the home screen, and the story is a choice you make from there instead of a room you wake up locked inside' },
      { cat: 'Visual', text: 'The cold open ends on the phone from the torn bag — it lands face-up, wakes, and the camera pushes into the screen until the screen is the menu you are looking at' },
      { cat: 'UI',     text: 'Cutscene Theater — rewatch any cinematic, finisher, or class domain from the home screen; unlocks once you have reached the end of the story' },
      { cat: 'Fix',    text: 'The ending replay in the Replays browser did nothing at all — it was written for the game-over screen and quietly gave up when opened from the menu', spoilerLevel: 3 },
      { cat: 'Fix',    text: 'Finishers no longer get their victim knocked out of position by the same hit that starts them, so the sequence opens on the pose it staged' },
      { cat: 'Polish', text: 'The opening says how to skip it from the very first frame, instead of waiting until you had already walked to mention it' },
    ],
  },
  {
    version: '4.0.21',
    title: 'THE KILLING BLOW UPDATE',
    date: '2026-07-25',
    flavor: 'A finish should look like one. The blade turns, the arc lands, and the world takes on the colour of whoever is winning.',
    isLatest: false,
    changes: [
      { cat: 'Visual', text: 'Finishers land properly — the attacker now turns to face their victim and the weapon actually swings through the blow, instead of the killer standing backwards with the blade sitting idle in their hands' },
      { cat: 'Visual', text: 'Domains now recolour the arena while they are open — every domain was authored with its own colour grade and none of it was ever being drawn' },
      { cat: 'Visual', text: 'The top HUD is a translucent scrim instead of a solid black bar, so you can see the arena behind it; names, bars, and counters carry their own shadow to stay readable' },
      { cat: 'Fix',    text: 'The story opponent banner now names the enemy you are actually fighting — on one-map chapters most enemies spawn as minions, and the banner only ever watched a single slot, so it sat blank or showed the wrong name' },
      { cat: 'Fix',    text: 'Ambush timing is fair now — the passivity clock used to run during fights, so a long brawl left it fully primed and dropped an elite on you the moment the last enemy fell; it only counts genuine idling' },
      { cat: 'Fix',    text: 'Ambient pressure spawns stay out of scripted beats — a tripped stealth alarm, an arena lock, or an escape objective no longer gets an unannounced elite stacked on top of it' },
      { cat: 'Fix',    text: 'The camera obeys dramatic pull-backs and push-ins during walking chapters again, and holds steady when a fighter is knocked out of bounds or spends a long time airborne' },
      { cat: 'Fix',    text: 'Fixed a first-launch crash on slow connections — the opening could run before the story data finished loading' },
      { cat: 'Polish', text: 'Arena locks get a camera beat: the gate slams, the view pushes in on whoever is blocking the road, and releases when the way is clear' },
      { cat: 'Polish', text: 'Portal builds now moderate chat and hide external sign-in, per host requirements; local and cloud saves are unaffected everywhere else' },
    ],
  },
  {
    version: '4.0.9',
    title: 'THE OPEN DOOR UPDATE',
    date: '2026-07-24',
    flavor: 'The way in is shorter now. Walk straight to a fight if that is what you came for — and when the road closes around you, you will see the walls that closed it.',
    isLatest: false,
    changes: [
      { cat: 'UI',     text: 'Fight Now — a single button on the home screen drops you straight into a match against a bot, no menus, no setup, no unlocks required' },
      { cat: 'UI',     text: 'The opening can be skipped with any key, and a "just let me fight" option now leads out of it if you would rather start swinging' },
      { cat: 'UI',     text: 'Cut a redundant second intro screen — the cold open plays once instead of twice' },
      { cat: 'UI',     text: 'Story mode is no longer a one-way door — you can close it and go elsewhere whenever you like, instead of being held there until the first chapter is finished' },
      { cat: 'Visual', text: 'Arena locks are visible — when a walking chapter seals you in for a fight, barriers now rise on both sides instead of an invisible wall you can only discover by walking into it' },
      { cat: 'Fix',    text: 'The opening cold open no longer renders underneath the chapter list' },
    ],
  },
  {
    version: '4.0.6',
    title: 'THE BURIED ROADS UPDATE',
    date: '2026-07-14',
    flavor: 'The world grew roots. The road runs on solid ground now, and beneath it are tunnels worth the descent — if you can get back out of the fire.',
    isLatest: false,
    changes: [
      { cat: 'Story', text: 'Walking chapters now stand on solid, continuous terrain instead of scattered floating platforms — the ground runs unbroken from the start of the road to the fight at its end' },
      { cat: 'Story', text: 'Bigger worlds — walking stretches are far longer now, and a run of connected chapters plays as one enormous continuous overworld rather than a series of short corridors' },
      { cat: 'Story', text: 'Underground tunnels — some roads hide a way down into buried chambers where treasure waits in the dark; a Vault Warden guards the deepest cache and will not stray far from what he protects' },
      { cat: 'Visual', text: 'Every story cutscene was rebuilt — layered parallax backdrops, moonlight and haze, cast shadows and reflections, rim lighting, and characters that actually walk, blink, listen, and gesture instead of standing frozen' },
      { cat: 'Fix',   text: 'You can escape the lava now — bouncing off a lava surface grants a full jump so you can chain your way back to solid ground instead of dying in a pit you can never climb out of' },
      { cat: 'Fix',   text: 'Lava no longer vanishes after a sudden-death round — arenas authored with lava keep it for the whole match' },
    ],
  },
  {
    version: '4.0.2',
    title: 'THE HIDDEN ROADS UPDATE',
    date: '2026-07-13',
    flavor: 'The road keeps what it buried. Some names were never the bearer\'s to keep. And the story now begins where it always began — on an ordinary street, on an ordinary day.',
    isLatest: false,
    changes: [
      { cat: 'Story', text: 'Hidden caches — walking chapters now hide treasure chests off the beaten path; a minor cache sits within reach, while an elite cache waits on a high perch behind a Vault Warden who will not let you open it while he breathes. Loot never respawns once taken' },
      { cat: 'Story', text: 'Continuous regions — a stretch of the campaign now plays as one unbroken world; crossing a border completes the chapter and the road simply keeps going, no fade, no menu' },
      { cat: 'Story', text: 'The story opens differently now — an ordinary man, an ordinary Tuesday, and the moment everything after it stopped being ordinary' },
      { cat: 'Story', text: 'Two classes carry new names — Torren and Varek; the dead bearers behind them finally have names of their own, and their rage, storms, and domains are renamed to match' },
      { cat: 'Story', text: 'Joke weapons no longer wander into the campaign — frying pans, peashooters, and paper airplanes stay in versus and sandbox where they belong' },
      { cat: 'AI',    text: 'Late-campaign named and elite opponents now study you — they profile your habits in real time instead of running fixed scripts' },
      { cat: 'Fix',   text: 'Stealth chapters actually work now — authored alert zones were being ignored entirely and the alarm timer was so generous you could stand in a spotlight; zones trigger where designed and guards respond in about a second' },
      { cat: 'Fix',   text: 'The final domain duel was unwinnable — a damage leak reduced every hit to nothing and the fight timed out into a draw; it now fights at full strength and ends the way the story intends', spoilerAct: 6 },
      { cat: 'Fix',   text: 'The campaign declared itself complete at the end of the first act — the true ending, and everything it unlocks, now waits where it should: at the actual end' },
      { cat: 'Fix',   text: 'Stealth and exploration enemies no longer spawn floating in the air or buried in the ground' },
      { cat: 'Polish', text: 'The skill tree now has a Weapon Mastery quick link — the mastery panel was hiding below the tree where nobody scrolled' },
    ],
  },
  {
    version: '4.0.0',
    title: 'THE SOVEREIGN UPDATE',
    date: '2026-07-10',
    flavor: 'It stopped pretending to think at your speed. It stopped pretending the arena was neutral ground. And somewhere far past the end of the road, the story found its voice.',
    isLatest: false,
    changes: [
      { cat: 'AI',      text: 'Sovereign no longer holds back — every deliberate mistake, hesitation window, and mercy system has been stripped out; it plays the fight it was always capable of playing' },
      { cat: 'AI',      text: 'Sovereign reads the rules of the engine itself — it refuses to swing into invincibility frames or a ready parry, holds attacks your stamina can\'t answer, goes all-in the instant you\'re helpless, punishes landings, and counts your reload' },
      { cat: 'AI',      text: 'Sovereign fights the arena, not just you — it dodges eruptions, meteors, stalactites, cars, and every other live map hazard, corners you inside them, collects or denies pickups and buff pads, and cracks open favorable crates while you\'re out of range' },
      { cat: 'AI',      text: 'Sovereign abilities and supers are no longer random rolls — every cast is spent on a confirmed window: a guard to crack, a trapped or helpless target, a finish, or its own survival' },
      { cat: 'AI',      text: 'Sovereign adapts in seconds — observation gates cut across the board and pattern memory now weighs the last few exchanges far above stale match history; the warm-up it used to donate is gone' },
      { cat: 'AI',      text: 'Sovereign now dodges the full arsenal — paper swarms, boomerangs, pea clusters, gravity stones, flail balls, scythe tosses, hammer shockwaves, and thrown axes all register in its projectile reads' },
      { cat: 'AI',      text: 'Story opponents grow with you — enemy intelligence now scales with your campaign progression instead of staying frozen at each chapter\'s authored difficulty; late-game enemies fight like they belong there' },
      { cat: 'Story',   text: 'The story speaks — full voice acting for story dialogue and narration with distinct voices per speaker; toggle it in Audio settings' },
      { cat: 'Story',   text: 'Cutscenes play in full the first time and stay out of your way after — the new Replay Mode setting controls whether beaten chapters replay their cinematics and fights or let you walk through freely' },
      { cat: 'Story',   text: 'A new chapter structure debuts in Chapter 2 — walk the world, reach the fight, survive it, and walk out; health carries between these chapters, and the road holds coins, experience, and healing crystals that never respawn once taken' },
      { cat: 'Story',   text: 'Weapon Mastery — every weapon now levels up individually through the skill tree as you fight with it in the campaign' },
      { cat: 'Story',   text: 'Level select rebuilt — chapters are numbered and organized into pages per act instead of one endless scroll' },
      { cat: 'Story',   text: 'The final confrontation is now a true fight — you do not face it alone, and it does not fall easily; 1 life', spoilerLevel: 3 },
      { cat: 'Class',   text: 'Warrior — a disciplined, no-frills melee class; sturdy fundamentals, no gimmicks' },
      { cat: 'Fix',     text: 'Dozens of story chapters were quietly collapsing into plain one-on-one duels — exploration levels, special missions, and every decision scene lost their identity while the chapter list was built; all of them now play as authored' },
      { cat: 'Fix',     text: 'Late-story boss chapters now spawn their true opponents — several were sending a stand-in fighter instead of the entity the chapter promised', spoilerAct: 4 },
      { cat: 'Fix',     text: 'Story objectives now name the actual target instead of a generic goal, and campaign completion percentage no longer counts past 100%' },
    ],
  },
  {
    version: '3.9.10',
    title: 'THE SPECIAL OPERATIONS UPDATE',
    date: '2026-07-04',
    flavor: 'Some fights don\'t wait for you to be ready. A target already running. A line of challengers with no rest between them. A sky that wants you gone.',
    isLatest: false,
    changes: [
      { cat: 'Story', text: 'Assassination missions now play as intended — a countdown runs while your target tries to flee the arena; catch them before they slip away or the mission fails' },
      { cat: 'Story', text: 'Gauntlet missions now run their full multi-round structure — consecutive waves with no healing between them, enemies gaining armor and numbers each round', spoilerAct: 5 },
      { cat: 'Story', text: 'The ship-flight sequence now launches its own flight mode instead of a standard ground duel', spoilerAct: 5 },
      { cat: 'Fix',   text: 'Special mission chapters were quietly falling back to plain one-on-one duels — their mission type was lost while the chapter list was being built, so the assassination, gauntlet, and flight modes never engaged; the type now survives and each mission plays its authored mode' },
    ],
  },
  {
    version: '3.9.3',
    title: 'THE COLLISION REALM UPDATE',
    date: '2026-07-03',
    flavor: 'Somewhere in the multiverse there is a realm that never stops shaking. Whatever lives there isn\'t angry. That\'s the unsettling part.',
    isLatest: false,
    changes: [
      { cat: 'Story', text: 'The Collision Realm arc added to the multiverse act — four new chapters (escape, scavenge, anchor defense, and a boss duel) set in a dimension that fractures under its ruler\'s weight; slots between the Fracture Coast and the act finale', spoilerAct: 5 },
      { cat: 'Story', text: 'Thresh — a fracture boss of pure force who broke their own strength calibration crossing the void; expert-tier duel, 1 life, every strike carries dimensional weight', spoilerAct: 5 },
      { cat: 'Story', text: 'A new arc opened somewhere in the multiverse — the ground there does not stay still' },
      { cat: 'Fix',   text: 'Story chapter numbering shifted by 4 past the multiverse act to make room; existing saves migrate automatically — progress and chapter completion are preserved' },
    ],
  },
  {
    version: '3.9.2',
    title: 'THE IAIJUTSU UPDATE',
    date: '2026-07-03',
    flavor: 'The ronin never rushes. Every wound you take in the dojo is already decided — you just haven\'t heard the click of the sheath yet.',
    isLatest: false,
    changes: [
      { cat: 'Mode', text: 'Ronin Conviction reworked — Death\'s Dojo no longer borrows the time theme (that belongs to the Ninja now); instead it wields Deferred Cuts: every hit the ronin lands inside the dojo leaves a glowing cut mark on the target (up to 5 per enemy, the spirit katana marks too), and every 4 seconds the blade sheathes — all marks on all enemies detonate simultaneously as a fan of white slashes (9 damage per cut, shieldable at the click); watch for the marks flashing faster and the glint on the ronin\'s hip, and the dojo\'s final fade lands one last sheathe' },
      { cat: 'Audio', text: 'Deferred Cuts are fully audible — each mark lands with a chime that rises in pitch as the count builds, and the sheathe plays its click a heartbeat before every cut releases at once' },
      { cat: 'Debug', text: 'Cinematic Viewer domain preview fixed — it restored the fighter\'s class 80ms after triggering, but the entry cinematic resolves the domain from the class when it finishes (~5s), so the preview always played the fighter\'s own domain instead of the selected one' },
    ],
  },
  {
    version: '3.9.1',
    title: 'THE SHADOW REALM UPDATE',
    date: '2026-07-01',
    flavor: 'The Ninja stopped fighting faster and started making the world slower. And Sovereign, which had been thinking on a borrowed clock, finally caught up to real time.',
    isLatest: false,
    changes: [
      { cat: 'Mode',    text: 'Ninja Conviction reworked — Shadow Realm no longer rains shadow blades or buffs the owner\'s speed; instead it dilates time: the entry cinematic teleports the ninja behind every opponent and launches them skyward, then all enemies move, fall, attack, shield, and fire projectiles at half speed for the full 25 seconds while the ninja moves free (bosses partially resist); throughout the domain the ninja hurls spinning shurikens at the nearest foe regardless of equipped weapon' },
      { cat: 'AI',      text: 'Sovereign now fights at its designed speed — a tick-versus-frame units bug had it deliberating on a clock roughly 15× too slow; decisions, strikes, and repositioning now resolve every frame, about 2.5× the pressure and kill throughput in the same match' },
      { cat: 'AI',      text: 'Sovereign whiff-awareness and platform climbing — it reads its own missed swings before committing follow-ups and climbs to higher platforms to chase aerial or elevated players instead of pacing beneath them' },
      { cat: 'Story',   text: 'Exploration and per-frame event handling tightened — dodge roll, arena boundary enforcement, and scene-trigger timing refined; chapter launch flow cleaned up' },
      { cat: 'Tool',    text: 'Headless capture and a Sovereign self-play harness added under tools/ for automated fight validation and difficulty tuning' },
    ],
  },
  {
    version: '3.9.0',
    title: 'THE SOVEREIGN INTELLIGENCE UPDATE',
    date: '2026-06-26',
    flavor: 'Sovereign spent every fight learning. Now it trains itself when you walk away. And somewhere past Act VII, a final arc opens onto something that has no body and no name.',
    isLatest: false,
    changes: [
      { cat: 'Combat',  text: 'Sword super (Air Slash) now lands all three crescents reliably — slashes no longer waste their single hit on a target\'s invincibility frames, the first two hits hold the target in place (only the final slash launches), and the arcs gently track the nearest enemy\'s height' },
      { cat: 'AI',      text: 'Sovereign self-play trainer — Sovereign runs evolution matches against randomized bot loadouts when idle, refines its decision genome across three parameters (aggression, spacing, reaction speed), and saves the champion to localStorage; available via console commands sovereign:train, sovereign:stress, sovereign:genome, and sovereign:reset' },
      { cat: 'AI',      text: 'Sovereign ability/super profiling — classifies the player\'s super usage as healer, finisher, opener, or dump and adapts pressure accordingly; profiles are announced in-character via Sovereign dialogue the first time a pattern is confirmed' },
      { cat: 'AI',      text: 'Sovereign counter-strategy activates 2× faster — minimum observation window reduced from 45 frames to 20; first confident pattern read fires in seconds instead of over a full minute' },
      { cat: 'AI',      text: 'Sovereign double-jump awareness — holds back from jumping to intercept aerial players until their double jump is spent; committed aerial chases then close at full speed; post-KO defensive window extended from 20 to 45 frames' },
      { cat: 'Tool',    text: 'VECTOR developer assistant — the in-game AI console is now named VECTOR and carries comprehensive game lore, character histories, the full 166-chapter story structure, and all major systems reference; answers questions about the game and controls it via console commands' },
      { cat: 'Visual',  text: 'Home screen canvas animation — animated stickman silhouettes with flowing capes breathe and drift across the main menu background; the hero figure stands centered over the title with a distinct animated form; the animation stops when the mode selector opens and restarts on return' },
      { cat: 'UI',      text: 'Story shop separated into a standalone full-screen modal; skill tree likewise moved to its own dedicated canvas-rendered interactive modal with animated edge connectors and live unlock flow — both previously lived inside a combined store tab' },
      { cat: 'Visual',  text: 'Axiom Prequel ending cinematic expanded — void cracks grow from screen corners across beats 2–9; companion silhouettes appear one by one at the portal edge and walk through; Axiom\'s silhouette enters the portal on beat 1 with a burst flash; the visuals now carry the weight the dialogue describes' },
      { cat: 'Story',   text: 'A long arc was added past the end of Act VII — the oldest threat in the world, with no body and no name; it ends where everything ends', spoilerLevel: 3 },
      { cat: 'Story',   text: 'Act VIII bridge chapters (IDs 136–139) added, connecting the Cosmic Axiom resolution to the God domain; interlude chapter type added for cinematic walking scenes with no combat', spoilerLevel: 2 },
      { cat: 'Admin',   text: 'Divine Summon (H key) — a Herald sweeps the arena and destroys all AI enemies; admin-only, 2-minute cooldown; blocked in boss, Cosmic Axiom, God, and exploration modes', spoilerLevel: 2 },
    ],
  },
  {
    version: '3.8.0',
    title: 'THE PUGILIST UPDATE',
    date: '2026-06-26',
    flavor: 'The Combat weapon finally has the moveset it deserved. The Pugilist class built their whole identity around it. And somewhere out in the void, a Summoner is calling something into the world.',
    isLatest: false,
    changes: [
      { cat: 'Prequel',  text: 'Axiom Prequel added — a standalone canvas game (axiom-prequel/) set before the events of the main game; play as the figure the main story is built around across 6 chapters; ends at the moment the main game\'s lore begins', spoilerAct: 4 },
      { cat: 'Prequel',  text: 'Axiom Prequel — enemy types include dimensional scouts (void burst on death), enforcers, and lieutenants; enforcers absorb 60% of damage and cannot be launched when blocking; three named companions join and depart during the arc', spoilerAct: 4 },
      { cat: 'Prequel',  text: 'Axiom Prequel combat polish: void pulse super move (radial damage + screen flash), combo counter HUD that scales font size with streak, footstep dust particles, super READY pulse indicator, white hit flash on enemies matching main-game feel' },
      { cat: 'Combat',  text: 'Combat weapon completely reworked — Counter (Q) enters a parry stance: absorb the next hit, teleport behind the attacker, and launcher-kick them airborne (18 dmg); Combo Strike super (E) dashes to the target, kicks them upward (22 dmg), then blasts them away with a power punch (34 dmg)' },
      { cat: 'Combat',  text: 'Giant Fist replaced — the old slow-moving fist hitbox is removed; Combo Strike fills the same niche with a two-hit sequence that requires positioning and commitment' },
      { cat: 'Class',   text: 'Pugilist class added — Combat-only brawler, 135 HP, 1.15× speed; Surge Strike perk automatically fires Combo Strike for free at ≤20% HP (once per match)' },
      { cat: 'Class',   text: 'Summoner class added — any weapon; calls a familiar that fights alongside you (max 1, respawns every 10 seconds); Desperate Bond perk immediately spawns and empowers the familiar at ≤20% HP (once per match)' },
      { cat: 'Mode',    text: 'Conviction — renamed from "Domain Expansion" everywhere: cinematics, name cards, announcements, and HUD; the mechanic is otherwise unchanged' },
      { cat: 'Mode',    text: 'Conviction weapon bonuses — each class\'s Conviction now fires a weapon-specific opening burst appropriate to the equipped weapon (sword rush, gun volley, axe throw, spear wave, etc.) using per-weapon cooldown tables' },
      { cat: 'Arena',   text: 'Desert arena added — a central quicksand zone pulls fighters slowly downward; raised dune platforms create natural left-right asymmetry with a high plateau in the center' },
      { cat: 'Visual',  text: 'Grass arena ground now has 40 individually swaying animated grass blades with natural length, color, and sway variation; each blade tapers to a point and bobs at its own phase' },
      { cat: 'Story',   text: 'Named story opponents (Veran, the Architects, Herald of Nothing, God, Null, Seraph, VAEL) now draw their own appearance overlay over the base stickman — each named encounter is visually distinct from a generic enemy' },
      { cat: 'Fix',     text: 'Story boundary portals now enforce a hard wall — the floor ends exactly at the portal face; players can no longer walk through the visual boundary or be repositioned outside the arena' },
      { cat: 'Fix',     text: 'Arena picker now shown in 2P mode (was previously hidden unless Adaptive AI was selected); minigame panel mode card and survival options now sync correctly when re-entering the Minigames selector' },
      { cat: 'Debug',   text: 'syscheck command health-checks all major systems (combat pipeline, cinematics, story registry chapter id=index invariant, physics, network, players); grant unlock lets admins instantly grant fight unlocks by type and account ID' },
    ],
  },
  {
    version: '3.7.0',
    title: 'THE WEAPON IDENTITY UPDATE',
    date: '2026-06-11',
    flavor: 'No two weapons swing alike anymore. The hammer hangs in the air before it falls. The katana cuts before you see it move. Watch the trails — they tell you everything.',
    isLatest: false,
    changes: [
      { cat: 'Combat',  text: 'Every melee weapon now has its own swing animation, timing, and motion — replacing the single shared 12-frame diagonal slash all weapons used before' },
      { cat: 'Combat',  text: 'Heavy weapons (Hammer, Frying Pan, Flail) gained real overhead windups: slow rise, accelerating drop, 15–20 frame commitment — the flail winds the ball fully behind the body before release' },
      { cat: 'Combat',  text: 'Katana attack is now an iai cut — the blade holds nearly still for the first half of the swing, then the cut completes almost instantly, leaving a thin lingering afterglow' },
      { cat: 'Combat',  text: 'Spear and Broomstick are true thrusts — no arc; the arm visibly extends along a straight piercing line and the hitbox follows the actual extension' },
      { cat: 'Combat',  text: 'Whip lashes out with an accelerating crack and overshoot wobble at full extension; Combat alternates a high jab and a body hook every attack at the fastest swing speed in the game (7 frames)' },
      { cat: 'Combat',  text: 'Axe is a full shoulder-to-hip cleave, Scythe a smooth 180° reap, Electric Staff a two-handed snap strike — each with distinct arc width and rhythm' },
      { cat: 'Combat',  text: 'Hitbox and visuals now come from the same swing calculation — what you see is exactly what hits' },
      { cat: 'Visual',  text: 'Swing trails now take their shape from each weapon\'s real motion: thrusts leave straight streaks, smashes vertical crescents, sweeps huge arcs — with per-weapon width, length, and persistence' },
      { cat: 'Visual',  text: 'Ranged weapons no longer play a melee swing when firing — each has its own firing pose: gun recoil kick, slingshot draw-and-release, overhand airplane throw, sidearm boomerang throw, steady bow aim' },
      { cat: 'Visual',  text: 'Weapons no longer all tilt the same way mid-attack — grip angle is per-weapon, so spears point forward and guns stay level' },
      { cat: 'Polish',  text: 'Knight\'s drawn arm now follows its actual uppercut arc — the visual previously played a generic slash while the hitbox swept upward' },
      { cat: 'Audio',   text: 'Per-weapon hit sounds — heavy weapons land with a deep concussive thud, thrusts with a sharp pierce, the whip with an audible crack, the electric staff with a zap, and the frying pan with the clang it always deserved' },
      { cat: 'Visual',  text: 'Per-weapon hit sparks upgraded — smashes kick up ground dust and impact rings, thrusts streak sparks along the attack line, the whip bursts at the crack point, the katana cuts clean with minimal flash' },
      { cat: 'Visual',  text: 'Weapons are now carried differently out of combat — spear and broomstick shouldered, hammer rested over the shoulder, katana held low at the hip, scythe upright, flail dangling, combat gloves up in a guard, gun at low ready' },
      { cat: 'Visual',  text: 'Player face redesigned — proper two-eye 3/4 view with centered pupils and a catchlight, eyebrows that sit above the eyes instead of floating at the top of the head, and soft head shading for volume; all expressions (cool, focused, intense, hurt) carried over' },
      { cat: 'Visual',  text: 'Conviction entrances cleaned up — the chaotic radial line-scribble bursts on activation are gone, replaced by clean expanding shockwave rings and a hard anime impact-frame cut at the name-card slam; Varek\'s floating red heat bar is now a soft ground-hugging glow' },
      { cat: 'Story',   text: 'Every story act now has its own cinematic identity — per-act color grading, letterbox depth, narration-bar tint, and a signature ambient motif in all cutscenes: drifting dust in the Home City, fracture shards in the Network, falling embers through the war, reality tears near Cosmic Axiom, kernel pulse rings at the very end', spoilerLevel: 2 },
      { cat: 'Story',   text: 'Story cutscenes gained cinematic language — beats now transition (fade, white flash-cut with shake, or whip-pan with motion streaks) instead of hard-cutting, narration captions fade in with an act-colored accent, and scenes can play audio stings: a dread swell, a tension riser, an impact boom, or a sudden hush' },
      { cat: 'Combat',  text: 'Eleven weapons that had NO finisher now have one — Iaijutsu (Katana), Judgment Lash (Whip), Wrecking Ball (Flail), Overload (Electric Staff), Aegis Break (Shield), Clean Sweep (Broomstick), Full Bloom (Pea Shooter), Orbital Stone (Slingshot), A Thousand Folds (Paper Airplane), Infinite Return (Boomerang), and Incinerate (Flamethrower)' },
      { cat: 'Fix',     text: 'Story maps no longer have walkable land beyond the boundary portals — the ground now ends just past the portal, and the reality-enforcement teleport can no longer place you outside the map' },
      { cat: 'Combat',  text: 'All 29 finishers upgraded with anime impact frames — the world hard-cuts to a silhouette flash at the moment of the strike — plus an anticipation hush during the deep-freeze windup and a proper impact sound on the hit' },
      { cat: 'Fix',     text: 'Fast swings no longer whiff through targets — hit detection now sweeps the full blade path between frames instead of sampling one angle snapshot, so a slash that visibly passes through someone always connects' },
      { cat: 'Balance', text: 'Heavy weapon windups shortened after playtest (hammer 19→17 frames, frying pan 15→14, flail 20→18, with a snappier transition into the drop) and heavies now get paid for the commitment: Hammer damage 20→22, Flail 19→21' },
    ],
  },
  {
    version: '3.6.0',
    title: 'THE COMBAT STABILITY UPDATE',
    date: '2026-06-11',
    flavor: 'Forty bugs walked in. None walked out. And something at the very end of everything is paying much closer attention to how you fight.',
    isLatest: false,
    changes: [
      { cat: 'Entity',  text: 'Absolute Axiom fight completely rebuilt — HP raised to 1,000,000; five checkpoint thresholds at 800K / 600K / 400K / 200K / 100K; progress is preserved at each checkpoint so death mid-fight no longer restarts from full health', spoilerLevel: 3 },
      { cat: 'Entity',  text: 'Absolute Axiom portal phase: drops below 100K HP triggers true invincibility until 5 portal allies are active; dimension punch ability added; screen FX system added to power the fight\'s visual escalation', spoilerLevel: 3 },
      { cat: 'AI',      text: 'Absolute Axiom rebuilt on a composed behavior-model brain — it profiles your habits in real time and adapts its strategy mid-fight; portal phases now grant true invincibility', spoilerLevel: 3 },
      { cat: 'Visual',  text: 'Added swing-arc trail ribbons — melee swings leave a fading, tapered light trail behind the blade tip' },
      { cat: 'Combat',  text: 'Combat pipeline fixes: projectile reflect no longer double-triggers, combos no longer continue through shields, and a hit-stop race condition was eliminated' },
      { cat: 'Fix',     text: 'Cinematic and QTE freeze fixes — cinematic handoff, QTE/cinematic overlap, and slow-motion token cleanup no longer lock the game' },
      { cat: 'Fix',     text: 'AI could enter a permanent-parry state under sustained pressure — fixed' },
      { cat: 'Fix',     text: 'Network hardening, story progression fixes, and rendering performance improvements (cached gradients) across roughly 40 verified bug fixes from a full-codebase review' },
    ],
  },
  {
    version: '3.5.0',
    title: 'THE STORY & SOVEREIGN UPDATE',
    date: '2026-05-30',
    flavor: 'The story finally goes where it was always going. The worlds beyond the multiverse are open. Sovereign learned how you killed it. It won\'t let that happen twice.',
    isLatest: false,
    changes: [
      { cat: 'Story',   text: 'Completed Act VI — The Fallen God\'s Trial arc: three bridge chapters covering the God\'s origin vault, the first principles of the walls between dimensions, and the passage into the multiverse' },
      { cat: 'Story',   text: 'Added four full multiverse worlds — Null Space, Seraph World, Thresh, and Vael — each a self-contained 5-chapter arc with unique enemies, environments, and a world boss' },
      { cat: 'Story',   text: 'Added Act VII — Creator: 16 chapters across two arcs covering God\'s domain, the Kernel, Axiom\'s construct layer, and the two-phase Absolute Axiom fight', spoilerLevel: 3 },
      { cat: 'Story',   text: 'Comprehensive difficulty balance pass across all acts — early chapters (Acts I–II) now properly onboard new players with 3 lives on the first fight; boss-tier encounters in Acts III–VI adjusted from 1-life spikes to 2-life escalations; intentional 1-life milestones preserved at key dramatic moments' },
      { cat: 'Story',   text: 'Twelve specific chapters rebalanced: ch0 (1L→3L), ch2 (1L→2L), ch8 (hard→medium AI), ch10 (2L→3L), ch11 (1L→2L), ch18 (expert→hard + 1L→2L), ch22 (1L→2L), ch25 (1L→2L), ch69 (2L→3L), ch79 (1L→2L), ch87 (1L→2L), ch91 (1L→2L)' },
      { cat: 'AI',      text: 'Sovereign death-to-adaptation pipeline — on death, Sovereign snapshots the exact kill context (weapon type, knockback weight, player action, combo depth); on the next life it immediately locks a counter strategy targeting whatever killed it; second death triggers limiter break with no warmup' },
      { cat: 'AI',      text: 'Sovereign opening weapon prior — reads the player\'s equipped weapon on frame 1 of the match and locks a preemptive counter strategy: ranged/magic → intercept + suffocate pressure; heavy/high-KB → parry lock; shield/knight → guard-break; default → suffocate' },
      { cat: 'AI',      text: 'Sovereign endlag punish window — tracks the exact frame count of the player\'s post-swing recovery (weapon.endlag); attacks without telegraph during this bounded window, closing the gap at 2× sprint speed if needed; window expires if not acted on, preventing false punishes' },
    ],
  },
  {
    version: '3.4.0',
    title: 'THE COMBAT POLISH UPDATE',
    date: '2026-05-28',
    flavor: 'Every weapon finally does what it says. Boomerangs leave your hand. Flames look like flames. The whip actually pulls. The balance is real this time.',
    isLatest: false,
    changes: [
      { cat: 'Combat',  text: 'Boomerang basic attack now throws a real visible boomerang that physically leaves the player\'s hand; the weapon disappears from the grip while in flight and reappears on return' },
      { cat: 'Combat',  text: 'Paper Airplane basic attack now fires a visible paper plane that leaves the player\'s hand; the Q ability (Barrage) now fires 5 correctly-shaped paper airplane projectiles instead of glowing circles' },
      { cat: 'Combat',  text: 'Flamethrower attack redesigned as a short-range cone of 3 flame projectiles drawn as layered teardrop flames, replacing the single generic bullet; Backdraft super (E) now fires a forward wave of 8 visual flame projectiles on activation' },
      { cat: 'Combat',  text: 'Whip hitbox extended — tip reach increased significantly (tipLen 50, 4 sample points, +10px hit tolerance); Lasso (Q) now hard-sets enemy velocity directly instead of adding to it for a reliable pull regardless of enemy movement; Lasso stun increased from 18 to 22 frames' },
      { cat: 'Combat',  text: 'Flail Chain Yank (Q) hitbox radius increased from 22 to 30px to register head-level hits; basic attack now launches the target slightly upward and spawns impact particles; Orbit Storm (E) duration extended from 65 to 85 frames and damage per contact increased from 12 to 16' },
      { cat: 'Combat',  text: 'Electric Staff Shock Bolt (Q) hitbox repositioned to upper-body check (y + h*0.3) and radius increased from 24 to 30px to correctly register hits on the head and shoulders; Thunderstrike (E) damage per bolt increased from 24 to 32 and area-of-effect radius widened from 58 to 62px' },
      { cat: 'Combat',  text: 'Katana Iaijutsu (Q) standing-still damage reduced from 42 to 28 — still the highest single-hit ability in the game, but no longer a one-shot for most fighters; Shadow Step (E) capped to 450px maximum teleport range' },
      { cat: 'Combat',  text: 'Broom Ride (Q) now cancels immediately on landing if fewer than 18 frames remain, preventing ground-level sliding after the aerial window closes' },
      { cat: 'Domain',  text: 'Gunner domain turrets heavily nerfed — damage halved from 24 to 12 and fire rate reduced from every 62 to every 140 frames; the domain is now a zoning presence rather than near-instant lethality' },
      { cat: 'Domain',  text: 'Conviction coverage now complete — Ronin (Death\'s Dojo), Reaper (Eternal Harvest), Pugilist (Iron Arena), and None class (Primal Surge) all have full convictions with unique hazards, sky effects, and entry cinematics; Berserker conviction now has weapon-specific hazards for every weapon category (bladed, heavy, ranged spray, ranged arc, electric)' },
      { cat: 'Visual',  text: 'Whip now draws a brief dashed rope line from the player to the struck target on both the basic hit and Lasso pull, making the weapon\'s reach visually legible' },
      { cat: 'Visual',  text: 'Flame projectiles rendered as directional teardrop shapes with layered orange/yellow glow instead of plain colored ellipses' },
      { cat: 'AI',      text: 'Bot paper airplane and boomerang AI updated to use the new throw system rather than the legacy bullet path' },
      { cat: 'Story',   text: 'Added cinematic narrative scene system — story chapters now play fully-directed canvas cutscenes with typewriter dialogue, speaker detection, camera keyframe animation, letterboxing, portal/shockwave/screen-flash effects, and per-beat NPC positioning' },
      { cat: 'Story',   text: 'Added per-chapter cinematic scene specs — each chapter has its own beat-by-beat camera choreography, effect timeline, and character staging' },
      { cat: 'Story',   text: 'Added 5 new interactive chapter types: stealth (guard detection, alarm system), escape (pursuer AI, timed exit), defense (wave hold-point), scavenge (collectibles with enemy patrols), and assassination (target marking, silent-kill bonus)' },
      { cat: 'Story',   text: 'Added a new multiverse arc where trust is the only casualty that matters; someone knows exactly what to say, and exactly when to say it; what happens at the end cannot be undone', spoilerAct: 4 },
      { cat: 'Boss',    text: 'A certain secret boss was completely reworked — a fight of this scale demands more than a health bar; multiple thresholds now trigger cinematic moments; a late-fight mechanic changes the rules entirely; find out yourself', spoilerLevel: 3 },
      { cat: 'Visual',  text: 'Added AniFX — a suite of anime-style cinematic effect utilities: pulsing aura rings, radial speed-line bursts, charge-up glow effects, and stickman afterimage silhouettes; used throughout boss threshold cinematics' },
      { cat: 'Polish',  text: 'Camera HUD clamp overhauled — guarantees the topmost active player always appears at least 24px below the HUD bar at any camera zoom level; eliminates players being obscured by the health bar' },
    ],
  },
  {
    version: '3.3.0',
    title: 'THE DOMAIN UPDATE',
    date: '2026-05-18',
    flavor: 'Every fighter carries a world inside them. Use your super five times and it erupts — a 25-second nightmare born from who you are. The arena is no longer neutral ground.',
    isLatest: false,
    changes: [
      { cat: 'Mode',    text: 'Added Conviction — once you activate your super 5 times in a match, your class unleashes its personal Conviction: a 25-second environmental takeover that floods the arena with class-specific hazards; each class has a unique named conviction with its own atmosphere, hazard type, and owner buff' },
      { cat: 'Mode',    text: 'Conviction roster — Torren: Storm Realm (relentless lightning strikes, speed boost); Varek: Spartan War Domain (debris barrages, power boost); Ninja: Shadow Realm (reworked in 3.9.1 — time dilation); Gunner: Arsenal Domain (bullet storm); Archer: Verdant Hunt (arrow curtain); Paladin: Holy Sanctuary (holy beams, passive heal); Berserker: Blood Arena (speed + power + lifesteal, no environmental hazard — pure stats); further convictions are unlocked through progression' },
      { cat: 'Mode',    text: 'Conviction entry plays a full cinematic sequence: world darkens, the class name card slams onto screen, a Dutch camera tilt locks in, and the arena atmosphere shifts to match the conviction\'s color and sky; sudden death is suppressed for the full duration' },
      { cat: 'Arena',   text: 'Added Training Grounds — a clean symmetry-balanced stage with 8 platforms across 4 height tiers; designed for combo drills, jump practice, and aerial/edge-guard training; only accessible in Training mode' },
      { cat: 'Visual',  text: 'Added cinematic speed lines — radial and directional burst effects used during finishers, Conviction entry, and heavy cinematic hits; cone, spread, count, and length are fully configurable' },
      { cat: 'Visual',  text: 'Added impact frames — hard-cut color flash with entity silhouettes on the heaviest moments; gives a manga / fighting-game punctuation feel to KO blows and Conviction activations' },
      { cat: 'Visual',  text: 'Added move name cards — a bold text card slams onto screen at frame 18 of any finisher displaying the move\'s name; fades after ~1.5 seconds' },
      { cat: 'Visual',  text: 'Added motion trails — a semi-transparent echo strip traces the attacker\'s path for the duration of every finisher; auto-enabled on entry, auto-cleared on exit' },
      { cat: 'Visual',  text: 'Added Dutch angle (world tilt) — the game world can now rotate to a biased angle for dramatic effect; used during Domain entry and select finisher moments; angle lerps smoothly in and out' },
      { cat: 'Visual',  text: 'Added directional screen shake — shake can be biased in a specific direction (e.g., straight down on a ground slam) for the first several frames before falling back to random; removes the ambiguous rattle on precision impacts' },
      { cat: 'Visual',  text: 'Added background contrast shift — a momentary color-tinted overlay pulses over the background at peak impact moments for a brief, punchy visual accent' },
      { cat: 'Visual',  text: 'Void Slam finisher rebuilt with full cinematic suite: Dutch tilt at the peak hold, radial speed lines during the lift, downward speed lines at the drop, directional downward shake on impact, impact frame flash, and background contrast pulse; the hit frame is 47% harder to look away from than before' },
      { cat: 'Achieve', text: 'Added 20+ new achievements — Finishing Touch (first finisher), Finisher Master (10 finishers in one session), Connected (first online win), Class Collector (win as 5 different classes in one session), Sovereign Slayer (defeat Sovereign Ω), Legend (50 total wins)' },
      { cat: 'Achieve', text: 'Story achievements added — The Journey Begins (complete your first Story chapter), End of the Line (complete full Story Mode), Lab Infiltrator (complete the Laboratory side mission)' },
      { cat: 'Achieve', text: 'Multiverse achievements added — Multiverse Warrior (conquer your first Multiverse world), Dimension Breaker (conquer all Multiverse worlds)' },
      { cat: 'Achieve', text: 'Progression achievements added — Fracture Explorer (enter a Fracture for the first time), Axiom Ship Complete (build the full Axiom Ship); Nexus Defender (survive 5 Nexus Defense waves); Pure Chaos (activate all chaos modifiers at once); Beyond Godhood (a secret — you\'ll know it when you see it)' },
      { cat: 'Combat',  text: 'Melee hitboxes tightened — vertical tolerance reduced from ±8 px to ±4 px; directional pruning added so hit points more than 12 px behind the attacker\'s facing direction are discarded; reduces phantom hits above/below and on rapid-turnaround frames' },
      { cat: 'Combat',  text: 'Torren perk reworked — now fires 2 lightning strikes (was 3) after a 600 ms visual windup that telegraphs the attack; damage is now routed through the full combat pipeline so shields, multipliers, and combo limits apply; stun reduced from 45 to 25 frames; both bolts are fully dodgeable' },
      { cat: 'Combat',  text: 'Damage multiplier cap — combined attacker buffs (class rage, abilities, map perks) are now capped at 3.5× the original hit value; prevents multiplicative stack-spikes at high-buff states while leaving normal combat completely unaffected' },
      { cat: 'AI',      text: 'Sovereign habit window extended from 6 to 12 recent actions for more stable pattern reads; anti-air counter now activates at 38% jump rate (was 50%), catching aerial-preference players sooner; habit confidence is penalised when the player mixes 3+ distinct action types in rapid succession' },
      { cat: 'AI',      text: 'Sovereign aerial tracking — Sovereign now tracks what fraction of the match the player spends airborne; once this exceeds 35%, it proactively jumps to match the player\'s altitude and engage in the air rather than waiting on the ground' },
      { cat: 'AI',      text: 'Sovereign edge-camp counter overhauled — the old brute-force charge is replaced with a bait-and-punish loop: Sovereign holds just outside attack range to force a commitment, then dashes in on the whiff; corner mode activates immediately to block the escape path back to center' },
      { cat: 'AI',      text: 'Sovereign matches always grant the player at least 10 lives regardless of the lives setting, ensuring enough rounds for the AI to fully ramp before a result is decided' },
      { cat: 'Polish',  text: 'Camera HUD clamp — when players are near the top of the screen, the camera shifts down so they are never hidden behind the HUD bar' },
      { cat: 'Polish',  text: 'Boss and TF attack states are fully reset on every game start, preventing hazards from a previous match from carrying damage or state into the next one' },
    ],
  },
  {
    version: '3.2.0',
    title: 'THE APEX UPDATE',
    date: '2026-05-10',
    flavor: 'A hundred fighters fall from the sky. A god and a kernel merge into something that should not exist. The floor rises. The clock runs out. Welcome to the end.',
    isLatest: false,
    changes: [
      { cat: 'Mode',    text: 'Added Battle Royale — 100 fighters, a 9000px-wide procedural world, a transport plane drop, loot chests, a shrinking void zone with 6 phases, spectate-on-death, and a real-time minimap; the last fighter standing wins' },
      { cat: 'Mode',    text: 'Battle Royale loot system — 200 chests scattered across 30 platform rows; chests contain weapons drawn from the full roster; equipped weapon updates the fighter\'s full combat state mid-match' },
      { cat: 'Story',   text: 'Added Escort chapter type — protect an NPC as it walks toward a goal; enemies spawn in configurable waves triggered by NPC position; NPC pauses when an enemy enters its stop range; chapter fails if NPC health reaches zero' },
      { cat: 'Entity',  text: 'Added Absolute Axiom — a secret final boss (God + Kernel merged); three power phases with escalating stats and distinct attack pools; attacks include Time Freeze, Inferno Rain, Gravity Singularity, and Kernel Beam; pattern analysis adapts the attack selection to player behaviour over the fight', spoilerLevel: 3 },
      { cat: 'Entity',  text: 'Absolute Axiom has a dedicated defeat card and unlocks the "Absolute Axiom Slayer" achievement; cannot be encountered while another secret boss is active', spoilerLevel: 3 },
      { cat: 'Combat',  text: 'Added parry system — shielding at stack 1 within the first 8 frames of an incoming hit has a 65% parry chance (30% at frames 9–15, 0% after); a successful parry stuns the attacker for 90 frames and opens a 1.5× damage vulnerability window' },
      { cat: 'Combat',  text: 'Added armor system — story enemies can equip helmet (−12% damage taken), chestplate (−15%), and leggings (−8%), stacking up to −40%; reduction is applied inside dealDamage() after all other multipliers' },
      { cat: 'Combat',  text: 'Shield completely rebuilt — stacks 1–3 use HP-based absorption that degrades on each activation; stacks 4–6 use percentage pass-through (20% / 50% / 80%); stacks reset after a full recharge timer; bots respect the depletion state before shielding' },
      { cat: 'Camera',  text: 'Added DuelCam — when exactly 2 active fighters remain, the camera switches to a smooth midpoint mode with distance-based zoom; separate lerp targets prevent the duel cam from fighting the standard camera; tightens further when fighters are within close range' },
      { cat: 'Camera',  text: 'Added hit-zoom — heavy hits (≥18 damage) zoom the camera in for 15–22 frames; cosmic hits zoom further; intensity scales with damage value' },
      { cat: 'Camera',  text: 'Added cinematic camera overshoot — dramatic camera moves add a decaying X/Y overshoot so the camera swings past its target and settles; eliminates the flat teleport feel on phase transitions and finishers' },
      { cat: 'Admin',   text: 'Added LiveOps admin panel — full server control UI with live config editing, broadcast dispatch, per-player coin grants, cosmetic grants, unlock tools, and server log streaming' },
      { cat: 'Admin',   text: 'Added admin session bridge — short-lived server session tokens replace the permanent admin key in the browser; the secret lives only on the server; tokens expire after 30 minutes of inactivity' },
      { cat: 'Polish',  text: 'Added post-match stats screen — game-over overlay now shows a MATCH SUMMARY header with elapsed time, KOs, and total damage dealt (highlighted in gold) for every player; boss and minion entries are filtered out' },
      { cat: 'Polish',  text: 'Added match announcer — canvas text bursts fire at key moments: FIRST BLOOD (first KO), LAST STOCK (player drops to final life), COMEBACK (trailing player scores a KO), ON FIRE (every 3rd kill by the same player); suppressed during cinematics' },
      { cat: 'Polish',  text: 'Added 2P arena vote screen — in local 2-player matches both players navigate a 4-column arena grid (P1: A/D/W/S + Space; P2: J/L/I/K + U); same pick wins outright; different picks go to a random tiebreak between the two; cards are clickable as a fallback' },
      { cat: 'Polish',  text: 'Added rematch countdown — after standard PvP and vs-bot matches the Play Again button counts down from 10 and auto-restarts; clicking Menu or Play Again cancels it immediately; disabled for story, boss, TrueForm, online, and KotH' },
      { cat: 'Polish',  text: 'Added sudden death rising floor — at 75 seconds a warning fires; at 90 seconds a lava floor rises from below the screen at 0.5 px/frame, stopping at 50% screen height; the floor platform is disabled and lava burn damage begins; activates in standard PvP and vs-bot matches only' },
      { cat: 'Polish',  text: 'Added hit effectiveness HUD — a pulsing "⚡ PHASE BREAK" label appears when the boss is within 7.5% HP of a phase transition; combo streaks against the boss or Sovereign display on the right edge with escalating labels (COMBO, HOT STREAK ×3, UNSTOPPABLE ×5, OBLITERATE ×8) and a flash burst on each new hit' },
      { cat: 'AI',      text: 'Sovereign AI sharpened — observation window cut from 3 s / 6 actions to 0.7 s / 2 actions so pattern reads happen almost immediately; adaptation rate raised from ~7.5 to ~12 ticks per second; prediction confidence floor lowered; preemptive counter range widened; spam detection triggers at 3 repeated actions instead of 4; limiter break fires at intelligence ≥ 0.76 (was 0.82) and HP ≤ 48% (was 38%); after a stagger window closes Sovereign immediately arms a punish counter and says "My turn."' },
      { cat: 'System',  text: 'Added match replay system — the last 3 matches are recorded as input-log snapshots at ~20 fps and stored in IndexedDB; a Save Replay button on the post-match screen downloads the recording as a JSON file; each file embeds the game version and mismatched versions are rejected at load time; battle royale, training, and exploration are excluded from recording' },
    ],
  },
  {
    version: '3.1.0',
    title: 'THE GAUNTLET UPDATE',
    date: '2026-05-03',
    flavor: 'Story Mode is no longer a corridor. It\'s a system — eight ways to play, one world that uses all of them.',
    isLatest: false,
    changes: [
      { cat: 'Story',  text: 'Story Mode chapters are now multi-phase gauntlets — every fight chapter runs through a pacing engine that builds a sequence of 3–4 phases before the final encounter; boss and Cosmic Axiom chapters are excluded and launch directly as before', spoilerLevel: 2 },
      { cat: 'Story',  text: 'Added Chase phase archetype — a timed traversal with a countdown bar; if the timer expires the run ends immediately; fires at chapters 24, 31, 38, 45 and later' },
      { cat: 'Story',  text: 'Added Survival Wave phase archetype — wave-defence mode in a compact 900px arena; enemies spawn in escalating waves from a state machine (countdown → active → between → victory); the arena locks the camera for the duration; fires at chapters 15, 20, 25, 30 and later' },
      { cat: 'Story',  text: 'Added Puzzle Lock phase archetype — replaces the opening phase with a mechanic challenge; three rotating variants: Timed Duel (one life, no mistakes), Marked Target (eliminate the priority target first), Platform Switch (high-ground advantage active); fires at chapters 11, 21, 41 and later' },
      { cat: 'Story',  text: 'Added Parkour phase archetype — a pure platforming run with no arena-lock combat, tight jump geometry, and sparse enemy spawns; fires at chapters 16, 32, 48, 64' },
      { cat: 'Story',  text: 'Added Branch/Choice phase archetype — narrative crossroads chapters where the player makes a persistent choice; flags are stored in save data and can affect later chapter dialogue; three branch points added: "The Weight of It" (ch. 26), "The Split" (ch. 47), and "What Veran Didn\'t Say" (ch. 49)' },
      { cat: 'Story',  text: 'Story HUD now shows a chase countdown bar (green → yellow → red, flashing white under 10s) and a survival wave indicator (wave number, dot pip progress, kill-bar fill, flashing orange when a wave is active)' },
      { cat: 'Story',  text: 'Ch. 7 "The Long Walk" given a custom phase sequence: traversal → chase (patrol lockdown) → survival wave (hold the beacon) → mini-boss; auto-generation is bypassed' },
      { cat: 'Story',  text: 'Ch. 52 "Signal Maze" given a custom phase sequence: parkour (scrambled geometry run) → survival wave (interference surge) → elite encounter → mini-boss; auto-generation is bypassed' },
      { cat: 'Story',  text: 'Pacing schedule is deterministic and collision-free across all 80+ chapters — each archetype fires at a fixed stride with a guaranteed-free offset so no two archetypes claim the same chapter' },
      { cat: 'Entity', text: 'Added GodParadoxAlly to the God Phase 2 encounter — a flying blue entity that targets God exclusively, orbits its position, and delivers melee attacks; phases through all surfaces; cannot be harmed by the player', spoilerLevel: 2 },
      { cat: 'Arena',  text: 'Added God Domain arena — a dedicated divine stage for the God encounter; deep purple theme, oscillating platforms (3 moving horizontally, 2 moving vertically), divine eye-portal background elements, and a particle storm that intensifies as God loses health' },
      { cat: 'Visual', text: 'Godslayer armor visual rebuilt — golden gradient helmet with three crown spikes, pulsing golden glow, and a divine aura tied to the Godslayer weapon; renders as a distinct crown silhouette during the God Phase 2 fight', spoilerLevel: 2 },
      { cat: 'Visual', text: 'Fighter floor shadow improved — renders as a depth-scaled ellipse that tracks the ground plane with correct alpha falloff; replaces the old fixed-offset dot shadow' },
      { cat: 'System', text: 'Unlock rewards are now server-authoritative — coin grants, story unlocks, and achievement flags are validated through a server call before being written to the save; prevents client-side manipulation of progression state' },
      { cat: 'System', text: 'Branch choice flags are persisted to story save data (branchFlags map) and restored into storyState.flags on load; flags survive session resets and cloud sync' },
    ],
  },
  {
    version: '3.0.0',
    title: 'THE EVOLUTION UPDATE',
    date: '2026-05-01',
    flavor: 'A knight falls from the sky. A divine being issues a challenge. The system goes live. Everything adapts.',
    isLatest: false,
    changes: [
      { cat: 'Entity',  text: 'God Phase 2 fully built — Phase 2 now includes two new special attacks: Angel Fleet (spawns waves of HolyAngel minions from above) and Divine Columns (targeted light pillars that detonate for AoE damage); Phase 2 movement and attack timing tuned separately from Phase 1', spoilerLevel: 2 },
      { cat: 'Mode',    text: 'Added God Challenge prompt — when God returns to a player who has already defeated it, a modal offers the choice to accept or decline a direct God encounter; accepting immediately launches a dedicated God fight outside normal match flow', spoilerLevel: 2 },
      { cat: 'AI',      text: 'Sovereign mode now starts at near-peak intelligence — limiter is broken from round 1, aggression and reaction speed are pre-maxed, and evolution begins at stage DOMINATING; the player faces a fully capable Sovereign from the first exchange' },
      { cat: 'Mode',    text: 'Sovereign mode bans ranged weapons for the player — kiting bypasses all of Sovereign\'s adaptation systems; the fight is locked to melee' },
      { cat: 'Mode',    text: 'Added Sovereign arena — "The Circuit": a dedicated melee-only stage for Sovereign fights; symmetric 5-platform layout, tight spacing with no ranged safe distance, no hazards, no arena randomization; Sovereign always uses Nullblade here' },
      { cat: 'System',  text: 'Added LiveOps system (smb-liveops.js) — fetches a live config from the server every 60 seconds; supports MOTD banners (shown in menu, hidden during fights), coin multiplier events, XP multiplier events, shop rotation overrides, and per-key balance patches; toasts queue during active fights and flush on return to menu' },
      { cat: 'System',  text: 'Added cloud save via Supabase — create a free account to sync unlocks, story progress, cosmetics, and coins across devices; sign-up, sign-in, and sign-out flow wired into the account UI; auth state changes trigger a runtime refresh automatically' },
      { cat: 'System',  text: 'Save system rebuilt on a canonical single source of truth — all coin reads/writes go through getCoins/setCoins/addCoins; all save writes go through a unified canonical path keyed to the active account; account switches trigger forceRehydrateFromAccount to guarantee a clean runtime state' },
      { cat: 'System',  text: 'Story progress is now cloud-synced — save reconciliation compares local and cloud story state by timestamp; the more advanced save wins; no progress is lost on sign-in or account switch' },
      { cat: 'Account', text: 'Admin system extended with Supabase email auth — accounts whose signed-in Supabase email matches the ADMIN_EMAILS list receive admin access on any device without requiring a hardcoded account ID' },
      { cat: 'Account', text: 'Added Moderator role — moderators get a teal console theme with a MOD badge; mod-specific console commands include bancheck and notify; the console auto-unlocks for admins, devs, and mods without a password gate' },
      { cat: 'AI',      text: 'Fighter targeting now prioritises players — any player within 350 px is always targeted over other entities; beyond that range the nearest entity wins; prevents bots from ignoring the player to attack minions during mixed encounters' },
      { cat: 'UI',      text: 'Canvas now letterboxes on small screens — on viewports under 900×600 the game scales down while maintaining the 900×520 aspect ratio with centred margins; prevents clipping on mobile and small windows' },
      { cat: 'Audio',   text: 'Added file-based audio system — sounds are fetched as raw ArrayBuffers at load time and decoded to AudioBuffer on first play; decoded buffers are cached for subsequent calls;' },
    ],
  },
  {
    version: '2.9.0',
    title: 'THE GOD UPDATE',
    date: '2026-04-26',
    flavor: 'Something older than the Creator. Something that was never meant to be found. It found you anyway.',
    isLatest: false,
    changes: [
      { cat: 'Mode',    text: 'Added God encounter — a hidden entity that can appear in any non-story match with a 1-in-1,000,000 chance per second; chance rises to 1-in-10,000 after beating Sovereign or surviving a prior encounter, and 1-in-5,000 after defeating God; a 10-minute in-game cooldown prevents back-to-back appearances' },
      { cat: 'Mode',    text: 'God fight has two phases — Phase 1 is a one-sided encounter; Phase 2 unlocks after a prior encounter or Sovereign defeat and changes the fight entirely', spoilerLevel: 2 },
      { cat: 'Mode',    text: 'Added Godslayer — a heavy melee weapon with 180 base damage and the Divine Strike ability (lunge + 380 damage burst); granted automatically when Phase 2 begins', spoilerLevel: 2 },
      { cat: 'Entity',  text: 'God is a white stickman with a glowing halo; tracks the nearest player and has a hard 160px attack range gate enforced at the combat system level' },
      { cat: 'Entity',  text: 'Added a second combatant to the Phase 2 God fight — a familiar face returns as an ally, fights God autonomously, and cannot be harmed by the player', spoilerLevel: 2 },
      { cat: 'Combat',  text: 'Something happens the first time God hits you — find out yourself', spoilerLevel: 2 },
      { cat: 'Combat',  text: 'God hard range gate added to dealDamage() — God attacks skip the damage pipeline entirely if the target is more than 160px away; enforced above all AI-layer decisions' },
      { cat: 'System',  text: 'Added cloud save system — create a free account and your progress syncs automatically across devices; unlocks, story chapters, cosmetics, and fracture state are all preserved' },
      { cat: 'System',  text: 'Save reconciliation on login merges local and cloud data non-destructively — unlocks, letters, achievements, and blueprints take the union; numeric stats keep the highest value; fracture branches merge by ID taking max progress; no progress is ever overwritten on sign-in' },
      { cat: 'System',  text: 'Save schema updated to v3 — adds coins, cosmetics, and new unlock flags (godEncountered, godDefeated, sovereignBeaten, storyOnline, paradoxCompanion, storyDodgeUnlocked, interTravel, patrolMode); existing saves migrate automatically on load' },
      { cat: 'System',  text: 'All unlock writes (boss beaten, letters, Cosmic Axiom, Sovereign, God, TF Ending, Patrol Mode, Inter-Travel, Dodge Roll) now route through a centralized account-flag system — unlocks persist correctly on account switches and no longer require a full saveGame() call', spoilerLevel: 2 },
      { cat: 'System',  text: 'Added debounced save queue — all save triggers batch into a single write per tick; prevents excessive localStorage writes during rapid state changes' },
      { cat: 'System',  text: 'Added "Save Your Progress" prompt — appears after completing Chapter 1 if not signed into a cloud account; one-time nudge with direct sign-up flow' },
      { cat: 'Account', text: 'Accounts now support password protection — set a password to lock your account; a 12-character recovery code is generated on password creation in case you forget it' },
      { cat: 'Account', text: 'Account hydration is now keyed by account ID — switching accounts triggers a full runtime refresh; re-loading the same account in the same session is skipped to avoid overwriting in-session progress' },
      { cat: 'UI',      text: 'Added home quick-nav bar — Account & Saves, Store, Settings, and Community buttons always visible on the main menu without scrolling' },
      { cat: 'UI',      text: 'Settings rebuilt as a full modal overlay — organized into Graphics, Audio, Account & Data, Advanced, and Reset sections; replaces the old inline panel toggle' },
      { cat: 'UI',      text: 'Added Community modal — Discord link and community info accessible from the nav bar and footer' },
      { cat: 'UI',      text: 'Footer condensed — Achievements, Updates, and Community pills replace the old scattered footer buttons' },
      { cat: 'Debug',   text: 'Added spawn/summon god console commands — spawns God without crash behavior for dev testing; God is a singleton and cannot be double-spawned' },
      { cat: 'Achievement', text: 'Added "God Slayer" achievement — awarded on defeating God', spoilerLevel: 2 },
    ],
  },
  {
    version: '2.8.0',
    title: 'THE LOOP UPDATE',
    date: '2026-04-15',
    flavor: 'Before you can reach it, it reaches you first. Escape the loop. Uncover what started it all. And take your shape.',
    isLatest: false,
    changes: [
      { cat: 'Story',   text: 'Added Eternal Damnation arc (Act 5, Ch. 91–92) — Cosmic Axiom sends an echo of itself inward before the player arrives; the dimension wall seals, trapping the player in a dying loop with 17 fractured echoes of past enemies', spoilerAct: 5 },
      { cat: 'Story',   text: 'Added Damnation arena — a crumbling loop-dimension stage exclusive to the Eternal Damnation gauntlet; platforms are removed in sequence as the escape window closes', spoilerAct: 5 },
      { cat: 'Story',   text: 'Added Lab Infiltration side mission (Ch. 93) — an abandoned research facility buried under a collapsed district; logs inside reveal the fractures were not an accident', spoilerAct: 5 },
      { cat: 'System',  text: 'Added Cosmetic Store — earn ⬡ coins by playing matches (5 per match, +10 for winning, +20 for beating the boss); spend them on character skins and weapon themes' },
      { cat: 'System',  text: 'Added 6 character skins (Fire, Ice, Shadow, Gold, Void, Neon) and 6 weapon themes (Inferno, Glacier, Shadow, Gilded, Void, Neon); defaults are free, rarer skins require coins' },
      { cat: 'AI',      text: 'Rewrote enemy combat logic with Modular Combat AI — three-class architecture (CombatSystem, MovementSystem, AIController) replaces frame-by-frame reactions with utility-scored action selection, reaction delays, and suboptimal-choice variance' },
    ],
  },
  {
    version: '2.7.0',
    title: 'THE FRACTURE UPDATE',
    date: '2026-04-08',
    flavor: 'Reality is cracking. Four dimensions await — each ruled by someone you once called a friend. Build your ship. Cross the fractures. Face what you became.',
    isLatest: false,
    changes: [
      { cat: 'Mode',     text: 'Added Multiverse Mode — travel across 4 dimensional worlds (War-Torn, Gravity Flux, Shadow Realm, Titan World), each with unique AI modifiers, encounter progressions, and Fallen God observer dialogue' },
      { cat: 'Mode',     text: 'Each Multiverse world has 4 encounter tiers: standard, elite (2-enemy), survival wave, and ruler boss fight with persistent stat rewards' },
      { cat: 'System',   text: 'Added Ship Progression System — collect 5 ship parts (hull ×5, engine, core, crystal) scattered across story chapters; when complete, Axiom\'s ship is built and full fracture branch access unlocks' },
      { cat: 'System',   text: 'Added Fracture System — visible interdimensional tears appear in-world; before ship is built, only a 10-second preview with one branch guardian; after ship built, full branch entry and ruler boss fight available' },
      { cat: 'System',   text: 'Three fracture branches added: Alpha Branch (Vael), Null Branch (Kael), Crimson Branch (Sora) — each with its own ruler, lore, and combat challenge', spoilerAct: 4 },
      { cat: 'System',   text: 'Added Lore Moment system — ambient story beats fire at key progression milestones (first fracture, ship completion, ruler defeat) and persist across sessions' },
      { cat: 'System',   text: 'Added Motivation Tracker — narrative context updates dynamically as Axiom\'s investigation progresses toward Cosmic Axiom', spoilerLevel: 2 },
      { cat: 'Polish',   text: 'Arena rendering pipeline split: Soccer and Void arena draw calls extracted to dedicated rendering submodule (js/rendering/smb-drawing-arenas.js) for cleaner separation' },
    ],
  },
  {
    version: '2.6.0',
    title: 'THE SOVEREIGN UPDATE',
    date: '2026-04-01',
    flavor: 'A new intelligence rises. Save your progress, command the stage, and face an opponent that refuses to be beaten the same way twice.',
    isLatest: false,
    changes: [
      { cat: 'Mode',     text: 'Added SOVEREIGN Ω — a next-gen adaptive AI mode unlocked by beating SOVEREIGN in Story Mode; features bigram sequence learning, spam punishment, limiter-break power-up, anti-exploit detection, and humanized early delays' },
      { cat: 'Mode',     text: 'Added Complete Randomizer — a 2P variant that randomizes both fighters\' weapon, class, and arena every match' },
      { cat: 'Mode',     text: 'Added Story Online mode — unlocked on Story completion; plays online multiplayer within the story\'s arena and rule set' },
      { cat: 'System',   text: 'Added persistent Save System — full game state (unlocks, achievements, story progress, settings) serialized to a single localStorage key with export-to-clipboard and file import/export' },
      { cat: 'System',   text: 'Added Game Director — real-time match intensity tracker that accelerates arena hazards and pacing events to prevent stale lulls' },
      { cat: 'System',   text: 'Added Cutscene System (smb-cutscene.js) — deterministic step-based cutscene engine with control lock, freeze physics, and per-step onEnter/onTick/onExit hooks; replaces ad-hoc timer sequences' },
      { cat: 'AI',       text: 'Pathfinding upgraded to v4 — predictive arc-based platform pathfinding; bots now plan multi-hop routes via a platform graph instead of reacting frame-by-frame' },
      { cat: 'AI',       text: 'Added Map Analyzer v2 — static analysis of arena platform graphs pre-computes node adjacency and jump arcs, feeding both pathfinding and AI navigation' },
      { cat: 'Music',    text: 'Added background music via YouTube IFrame API — separate normal and boss tracks; switches automatically between combat states; mutable independently from SFX' },
      { cat: 'System',   text: 'Added Error Boundary module — global error handler catches module-load failures and shows a friendly recovery overlay instead of a blank screen' },
    ],
  },
  {
    version: '2.5.0',
    title: 'THE PARADOX UPDATE',
    date: '2026-03-28',
    flavor: 'A multiversal being steps out of the background. Nothing about the Creator fight — or what waits past it — will ever feel the same.',
    isLatest: false,
    requiredProgress: 1,
    changes: [
      { cat: 'Narrative', text: 'Introduced Paradox — a multiversal entity that exists at the edge of every major fight as a hidden force' },
      { cat: 'Cinematic', text: 'Cosmic Axiom fight now opens with a 7-second pre-fight cinematic: Paradox and Cosmic Axiom clash evenly, Cosmic Axiom escalates, snaps Paradox\'s neck, and hurls them into a portal', spoilerLevel: 2 },
      { cat: 'Cinematic', text: 'New 5-second cinematic at 30% Cosmic Axiom HP: Cosmic Axiom warps away, returns dragging Paradox, and attacks them repeatedly before the final stretch', spoilerLevel: 2 },
      { cat: 'Cinematic', text: 'Creator fight now shows random background flashes of Cosmic Axiom and Paradox fighting as silhouettes (under 1 second each, every 11–20 seconds)', spoilerLevel: 2 },
      { cat: 'Cinematic', text: 'Creator fight scripted moment at 50% HP: Boss punches Paradox out of the arena with a particle burst and unique dialogue' },
      { cat: 'Mechanic',  text: 'Cosmic Axiom fight now begins with a damage lock phase — player deals 0 damage until Paradox Empowerment activates (8 seconds)', spoilerLevel: 2 },
      { cat: 'Mechanic',  text: 'Paradox Empowerment grants 1.4× speed and 1.6× damage for 15 seconds with a pulsing cyan aura, restoring full combat after the lock', spoilerLevel: 2 },
      { cat: 'System',    text: 'Revive system reworked: Paradox now appears as a visual entity during the boss mercy revive, delivering randomized dialogue before restoring 2 lives' },
      { cat: 'Polish',    text: 'Paradox entity features a flickering black/cyan stickman with glitch offsets, scan-line artifacts, and a cyan particle trail' },
      { cat: 'Polish',    text: 'Damage lock shows grey "0" hit numbers so the player knows the lock is active rather than feeling like a bug', spoilerLevel: 2 },
    ],
  },
  {
    version: '2.4.4',
    title: 'STORY GAUNTLET OVERHAUL',
    date: '2026-03-27',
    flavor: 'Story Mode now fights back like a real progression gauntlet instead of a quick sprint.',
    isLatest: false,
    changes: [
      { cat: 'Story',    text: 'Story chapters now auto-build into 3–5 phase gauntlets with traversal, arena locks, elite waves, hazards, and mini-boss finishes' },
      { cat: 'Story',    text: 'Exploration pacing was expanded with stronger enemy pressure, checkpoint bursts, ambush punish, side portals, and optional Distorted Rift encounters' },
      { cat: 'Story',    text: 'Chapter difficulty now scales from chapter progression plus player performance, including stronger elite variants and denser encounter caps' },
      { cat: 'Economy',  text: 'Tokens now power a real between-chapter shop with healing, permanent damage upgrades, and survivability upgrades' },
      { cat: 'UI',       text: 'Story HUD now shows the current gauntlet phase clearly during both combat and traversal sections' },
      { cat: 'Balance',  text: 'Story carryover health and progression upgrades make long-form runs matter instead of resetting into isolated demo fights' },
    ],
  },
  {
    version: '2.0.0',
    title: 'THE ARCHITECT UPDATE',
    date: '2026-03-25',
    flavor: 'The Code Realm has been fixed. SOVEREIGN awaits challengers.',
    isLatest: false,
    requiredProgress: 1,
    changes: [
      { cat: 'Fix',      text: 'Cosmic Axiom Code Realm: added double-jump so all 5 nodes are reachable', spoilerLevel: 2 },
      { cat: 'Fix',      text: 'Cosmic Axiom Code Realm: lowered unreachable high nodes to proper jump height', spoilerLevel: 2 },
      { cat: 'Fix',      text: 'QTE: movement keys (WASD/arrows) now register correctly mid-QTE' },
      { cat: 'Fix',      text: 'QTE: phases now end after max attempts with penalty damage instead of looping forever' },
      { cat: 'Fix',      text: 'Large maps: camera now clamps to world bounds and no longer drifts off-edge' },
      { cat: 'Fix',      text: 'Large maps: both players no longer spawn at the same position' },
      { cat: 'Fix',      text: 'Boss dialogue bubble now scales correctly when camera is zoomed out' },
      { cat: 'Fix',      text: 'Background void no longer visible when zooming out on any map' },
      { cat: 'Balance',  text: 'Reduced large map platforms from 40+ to ~27 with better spread and landmark bridges' },
      { cat: 'AI',       text: 'Beating SOVEREIGN in Story Mode now unlocks Neural AI as a standalone gamemode' },
      { cat: 'Polish',   text: 'Damage numbers: color-coded by severity with glow on heavy hits' },
      { cat: 'Polish',   text: 'Screen shake now scales with hit damage; no longer jitters at near-zero values' },
      { cat: 'Polish',   text: 'Red vignette overlay when player takes heavy damage' },
    ],
  },
  {
    version: '1.0.0',
    title: 'FULL RELEASE — FRACTURE CAMPAIGN',
    date: '2026-03-24',
    flavor: 'Reality patch applied. All dimensional rifts sealed.',
    requiredProgress: 1,
    changes: [
      { cat: 'Story',    text: 'Added full Story Mode — 80 chapters across 6 Acts' },
      { cat: 'Story',    text: 'Added Act / Arc navigation system with chapter select' },
      { cat: 'Story',    text: 'Implemented exploration chapters and cutscene dialogues' },
      { cat: 'Story',    text: 'Added major narrative twist: the fragment is the Creator\'s conscience', spoilerAct: 4 },
      { cat: 'Story',    text: 'Introduced the Void Mind as a post-campaign threat', spoilerAct: 6 },
      { cat: 'Cinematic',text: 'Redesigned Cosmic Axiom ending into a 10-phase meta-breaking cinematic', spoilerLevel: 2 },
      { cat: 'Cinematic',text: 'Added interactive Code Realm with 5 corruptible nodes', spoilerLevel: 2 },
      { cat: 'Cinematic',text: 'Added 3-hit QTE finisher sequence', spoilerLevel: 2 },
      { cat: 'Cinematic',text: 'Added dimension-panel launch sequence across 7 realities', spoilerLevel: 2 },
      { cat: 'Cinematic',text: 'Cosmic Axiom ending now triggers at a critical HP threshold', spoilerLevel: 2 },
      { cat: 'AI',       text: 'Improved Cosmic Axiom adaptive AI — 6 attack tiers, player profiling', spoilerLevel: 2 },
      { cat: 'AI',       text: 'Added dedicated Adaptive AI game mode' },
      { cat: 'Combat',   text: 'Added finisher system (killcam killing blows)' },
      { cat: 'Combat',   text: 'Balanced ranged weapons — reduced bullet spam window' },
      { cat: 'Combat',   text: 'Added QTE phases at critical Cosmic Axiom HP thresholds', spoilerLevel: 2 },
      { cat: 'UI',       text: 'Added Experimental 3D Mode setting with dimension-break visuals' },
      { cat: 'UI',       text: 'Added Replay Cinematic button on Cosmic Axiom end screen', spoilerLevel: 2 },
      { cat: 'Network',  text: 'Improved multiplayer state sync and disconnect handling' },
      { cat: 'System',   text: 'Modularised codebase into 20+ named JS modules' },
    ],
  },
  {
    version: '0.9.0',
    title: 'CHAOS & CREATION',
    date: '2026-02-10',
    flavor: 'New modes, new maps, new mayhem.',
    changes: [
      { cat: 'Mode',     text: 'Added Map Creator / Designer tool (standalone, launch from main menu)' },
      { cat: 'Mode',     text: 'Added Chaos Multiplayer — 12 chaos events, item drops, kill streaks' },
      { cat: 'Mode',     text: 'Added Survival, King of the Hill, and Soccer minigames' },
      { cat: 'Mode',     text: 'Added Adaptive AI standalone mode (SOVEREIGN)' },
      { cat: 'Maps',     text: 'Added Megacity, Warpzone, and Colosseum large-scale arenas' },
      { cat: 'Combat',   text: 'Added 8 weapon classes with unique supers and abilities' },
      { cat: 'Combat',   text: 'Added character class system (Berserker, Ninja, Tank, etc.)' },
      { cat: 'Combat',   text: 'Added combo limiter to prevent infinite lock-out combos' },
    ],
  },
  {
    version: '0.5.0',
    title: 'SOMETHING AWAKENS',
    date: '2025-11-15',
    flavor: 'Something stirs beneath the surface.',
    requiredProgress: 1,
    changes: [
      { cat: 'Boss',     text: 'Added Cosmic Axiom — adaptive boss with player pattern recognition', spoilerLevel: 2 },
      { cat: 'Boss',     text: 'Added secret letter hunt system unlocking Cosmic Axiom mode', spoilerLevel: 2 },
      { cat: 'Boss',     text: 'Added Boss fight mode (The Creator, phase AI, beams, minion spawns)' },
      { cat: 'Combat',   text: 'Added shield, ability, and super systems' },
      { cat: 'UI',       text: 'Full UI redesign — glass-morphism, mode cards, player config panels' },
      { cat: 'Network',  text: 'Added online multiplayer via PeerJS WebRTC + Socket.io relay' },
    ],
  },
  {
    version: '0.1.0',
    title: 'INITIAL RELEASE',
    date: '2025-08-01',
    flavor: 'Two stickmen. One arena. Fight.',
    changes: [
      { cat: 'Core',     text: '2-player local PvP on a single canvas' },
      { cat: 'Core',     text: 'Basic weapons: sword, hammer, spear, gun' },
      { cat: 'Core',     text: 'Basic arenas: grass, city, lava, space' },
    ],
  },
];

// ============================================================
// GLOBAL STATE
// ============================================================
let gameMode        = '2p';
let selectedArena   = 'grass';
let isRandomMapMode    = false;
let completeRandomizer = false; // Complete Randomizer mode: reroll arena+weapon+class on every death
let chosenLives     = 3;
let gameRunning     = false;
let gameLoading     = false; // true while loading screen is visible — freezes input/physics
let p1IsBot         = false;
let p2IsBot         = false;
let training2P      = false; // 2-player training mode toggle
let p2IsNone        = false; // "None" — no P2 at all (solo mode)
let paused          = false;
let gameFrozen      = false; // true during cinematics — halts physics, input, hazard damage, boss AI
let players         = [];
let minions         = [];    // boss-spawned minions
let verletRagdolls  = [];    // active Verlet death ragdolls
let bossBeams       = [];    // boss beam attacks (warning + active)
let bossSpikes      = [];    // boss spike attacks rising from floor
let infiniteMode    = false; // if true, no game over — just win counter
let tutorialMode       = false; // kept as stub — tutorial mode fully removed, always false
let trainingMode          = false; // training mode flag
let trainingDesignerOpen  = false; // in-game live map designer active
let trainingDummies    = [];    // training dummies/bots
let trainingPlayerOnly = true;  // godmode/onePunch apply only to player (not all entities)
let trainingChaosMode  = false; // all entities attack nearest target
let winsP1 = 0, winsP2 = 0;
let bossDialogue    = { text: '', timer: 0 }; // speech bubble above boss
let projectiles        = [];
let particles          = [];
let bloodStains        = [];   // persistent ground blood marks
let damageTexts        = [];
let respawnCountdowns  = [];  // { color, x, y, framesLeft }
let screenShake     = 0;
const BOSS_FIGHT_LIVES = 10;
const BOSS_FLOOR_WARNING_FRAMES = 180; // 3 seconds at 60 FPS
let bossFightLivesLock = false;
let bossFightLivesPrev = null;

// Dynamic camera zoom — lerped each frame
let camZoomTarget = 1, camZoomCur = 1;
let hitStopFrames  = 0; // frames to freeze game for hit impact feel
let hitSlowTimer   = 0; // frames remaining on post-hit slow-motion burst
let camHitZoomTimer  = 0; // frames of zoom-in after a heavy hit
let hitVignetteTimer = 0; // frames of red vignette overlay when player takes heavy damage
let hitVignetteColor = 'rgba(220,30,0,';  // color prefix for vignette fill
// Camera dead zone: don't update target until center moves beyond this (reduces jitter)
const CAMERA_DEAD_ZONE = 18;
const CAMERA_LERP_ZOOM = 0.07;
const CAMERA_LERP_POS  = 0.08;

// Camera pan position (lerped each frame)
let camXTarget = 450, camYTarget = 260, camXCur = 450, camYCur = 260;

let camDramaState  = 'normal'; // 'normal' | 'focus' | 'impact' | 'wideshot'
let camDramaTimer  = 0;
let camDramaTarget = null;
let camDramaZoom   = 1.0;

// ============================================================
// SETTINGS & FRAME STATE
// ============================================================
// User-configurable settings (toggled from menu)
const settings = { particles: true, screenShake: true, dmgNumbers: true, landingDust: true, bossAura: true, botPortal: true, phaseFlash: true, ragdollEnabled: (localStorage.getItem('smc_ragdoll') === '1'), finishers: true, view3D: (localStorage.getItem('smc_view3D') === '1'), experimental3D: (localStorage.getItem('smc_experimental3D') === '1'), hideHud: false, storyVoice: (localStorage.getItem('smc_storyVoice') !== '0'), replayMode: (localStorage.getItem('smc_replayMode') !== '0'), animQuality: (localStorage.getItem('smc_animQuality') === 'classic' ? 'classic' : 'high'), quickFightHazards: (localStorage.getItem('smc_qfHazards') === '1'), autoPerf: (localStorage.getItem('smc_autoPerf') !== '0') };

// Active finisher state — set by triggerFinisher(), cleared when animation completes or on backToMenu
let activeFinisher = null;
// Battle Royale finisher: plays for the local player only while the match keeps
// running around it (see triggerFinisher). Separate slot so nothing that reads
// activeFinisher as "the world is frozen" fires for it.
let activeWorldFinisher = null;

// ── World System ──────────────────────────────────────────────────────────────
let currentWorld   = null; // STORY_WORLDS entry for the active chapter's world
let worldModifiers = {};   // modifier key(s) from currentWorld, applied by game systems
let worldId        = null; // string id of active world (e.g. 'fracture')
let storyCurrentArc = null; // id of active multiverse arc (e.g. 'fracture', 'war', 'godfall')
let bossPhaseFlash     = 0;    // countdown for white screen flash on boss phase transition
let abilityFlashTimer  = 0;    // frames remaining for ability ring flash
let abilityFlashPlayer = null; // player who activated ability
let frameCount         = 0;
let _firstDeathFrame   = -1;   // frame when first player's lives hit 0
let _firstDeathPlayer  = null; // that player ref (to find the opponent)
let aiTick             = 0;    // AI update runs every N frames (see AI_TICK_INTERVAL)
const AI_TICK_INTERVAL = 15;

// ── Combat class super: Combo Strike (see Fighter.update) ────────────────────
// The move used to land its opening hit from anywhere on the map. REACH is the
// horizontal gap the dash must actually close for the combo to confirm; miss it
// and the super is spent. AIM_RATE/AIM_FRAMES govern the aimed-kick window.
const COMBO_SUPER_REACH      = 78;   // px — dash must close to this to connect
const COMBO_SUPER_AIM_RATE   = 0.052; // rad/frame while a direction key is held
const COMBO_SUPER_AIM_FRAMES = 110;  // auto-fire if the player never commits
let currentArena    = null;    // the arena data object
let currentArenaKey = 'grass';

// Pre-generated bg elements (so they don't flicker each frame)
let bgStars     = [];
let bgBuildings = [];

// ============================================================
// TRUE FORM BOSS STATE
// ============================================================
let unlockedTrueBoss   = false;
let tfGravityInverted  = false;
let tfGravityTimer     = 0;    // countdown (frames); 0 = gravity normal

// ── Gravity failsafe ─────────────────────────────────────────────────────────
// Tracks active inversion with a hard 4-second cap so no gravity flip can get permanently stuck.
let gravityState = { active: false, type: 'normal', timer: 0, maxTimer: 0 };

function forceResetGravity() {
  tfGravityInverted    = false;
  tfGravityTimer       = 0;
  gravityState.active  = false;
  gravityState.type    = 'normal';
  gravityState.timer   = 0;
  gravityState.maxTimer = 0;
  if (typeof players !== 'undefined') {
    for (const p of players) {
      if (p && p.vy !== undefined) p.vy = Math.min(p.vy, 2); // prevent upward launch on restore
    }
  }
}
let tfControlsInverted    = false;
let tfControlsInvertTimer = 0;   // countdown (frames); controls auto-restore when 0
// Mirror arena gimmick
let mirrorFlipTimer     = 0;    // counts up; flips controls at interval
let mirrorFlipped       = false; // current inversion state
let mirrorFlipWarning   = 0;    // warning flash timer (counts down)
let tfFloorRemoved     = false;
let tfFloorTimer       = 0;    // countdown (frames) until floor returns
let tfBlackHoles       = [];   // { x, y, r, timer, maxTimer }
let tfSizeTargets      = new Map(); // fighter → {origW, origH, scale}
let tfGravityWells     = [];   // { x, y, r, timer, maxTimer, strength }
let tfMeteorCrash      = null; // { phase:'rising'|'shadow'|'crash', timer, landX, boss, shadowR }
let tfClones           = [];   // { x, y, w, h, health, timer, facing, attackTimer, animTimer, isReal }
let tfChainSlam        = null; // { stage:0-3, timer, target }
let tfGraspSlam        = null; // { timer }
let tfShockwaves       = [];   // { x, y, r, maxR, timer, maxTimer, boss, hit:Set }
let tfDimensionIs3D    = false; // true while TrueForm has shifted the game to 3D perspective
let tfDimensionPunch   = null;  // { stage, timer, target, boss, launchDir, travelTimer, bgPhase, inputLocked }
let tfEndingScene      = null;  // TrueForm ending cinematic state machine (smb-trueform-ending.js)

// ── TrueForm intro cinematic state machine ────────────────────────────────────
// Strict ordering: opening_fight → paradox_death → absorption → punch_transition → backstage
// 'none'            — not in trueform mode yet
// 'opening_fight'   — player + Paradox vs TF (1000 damage threshold)
// 'paradox_death'   — TF kills Paradox cinematic (_makeTFKillsParadoxCinematic)
// 'absorption'      — Paradox energy flows into player (_tfAbsorptionState active)
// 'punch_transition'— dimension-punch intro (startTFEnding isIntro=true)
// 'backstage'       — real fight resumed; normal death/ending logic allowed
let tfCinematicState     = 'none';
let paradoxDeathComplete = false;  // set true when kills-Paradox cinematic onEnd() fires
let absorptionComplete   = false;  // set true when absorption phase completes

// ── Eternal Damnation arc globals ────────────────────────────────────────────
let damnationActive          = false;
let damnationWave            = 0;
let damnationDeaths          = 0;
let damnationAnchors         = 0;
let damnationCheckpoint      = 0;
let damnationBrokenPlatforms = [];
let damnationRemovalOrder    = [4, 5, 2, 3];
let damnationPulse           = 0;
let damnationPortalActive    = false;
let damnationEscaped         = false;
let damnationAnchorOrbs      = [];  // { x, y, frame }
let damnationPortal          = null; // { x, y, frame }

function resetDamnationState() {
  damnationActive          = false;
  damnationWave            = 0;
  damnationDeaths          = 0;
  damnationAnchors         = 0;
  damnationCheckpoint      = 0;
  damnationBrokenPlatforms = [];
  damnationPulse           = 0;
  damnationPortalActive    = false;
  damnationEscaped         = false;
  damnationAnchorOrbs      = [];
  damnationPortal          = null;
  // Restore any platforms disabled by a previous run (mutable shared objects)
  if (typeof ARENAS !== 'undefined' && ARENAS.damnation) {
    for (const pl of ARENAS.damnation.platforms) pl.isFloorDisabled = false;
  }
}

// ── Boss telegraph / warning system ──────────────────────────────────────────
// Visual warning indicators shown before attacks land (give player time to dodge)
let bossWarnings        = [];   // { type:'circle'|'arc'|'cone', x, y, r, color, timer, maxTimer, label, safeZone, facing }
let bossMetSafeZones    = [];   // safe zones during meteor storm { x, y, r, timer, maxTimer }
// Stagger: boss takes 120+ damage in 3s window → stunned for 2.5s
let bossStaggerTimer    = 0;    // frames remaining in stagger
let bossStaggerDmg      = 0;    // accumulated damage in current window
let bossStaggerDecay    = 0;    // decay timer; when 0 accumulator resets
// Desperation mode: boss health < 25% → faster, more intense
let bossDesperationMode  = false;
let bossDesperationFlash = 0;   // visual flash timer on activate

// ============================================================
// SECRET LETTER HUNT
// ============================================================
let bossBeaten         = false;
let collectedLetterIds = new Set();
// 0 = fresh player, 1 = boss beaten, 2 = true form unlocked
// let (not const) so _refreshRuntimeFromSave() can recalculate after account switch
let playerProgressLevel = unlockedTrueBoss ? 2 : bossBeaten ? 1 : 0;
const SECRET_LETTERS   = ['T','R','U','E','F','O','R','M'];
const SECRET_ARENAS    = ['grass','city','space','lava','forest','ice','ruins','creator'];
const SECRET_LETTER_POS = {
  grass:   { x: 450, y: 330 },
  city:    { x: 748, y: 390 },
  space:   { x: 200, y: 290 },
  lava:    { x: 450, y: 170 },
  forest:  { x: 310, y: 360 },
  ice:     { x: 640, y: 290 },
  ruins:   { x: 765, y: 360 },
  creator: { x: 450, y: 220 },
};

// Arena order (used for menu background cycling)
const ARENA_KEYS_ORDERED = ['grass', 'city', 'space', 'lava', 'forest', 'ice', 'ruins',
  'cave', 'mirror', 'underwater', 'volcano', 'colosseum', 'cyberpunk', 'haunted', 'clouds', 'neonGrid', 'mushroom', 'sewer'];

// Menu background cycling state
let menuBgArenaIdx   = 0;
let menuBgTimer      = 0;
let menuBgFade       = 0;      // 0→1 fade to black, 1→2 fade from black
let menuBgFrameCount = 0;
let menuLoopRunning  = false;

// ============================================================
// ONLINE STATE
// ============================================================
let onlineMode               = false;
let onlineReady              = false;
let onlineLocalSlot          = 0;
let _onlineGameMode          = '2p';
let onlineAllowCustomWeapons = false; // host-controlled; enables custom weapons in online sessions

// Online multiplayer extended state
let onlinePlayerSlots = []; // array of player state objects for all online players
let localPlayerSlot = 0;    // which slot this player occupies (0=host)
let onlinePlayerCount = 2;  // chosen player count (2-10)
let onlineMaxPlayers = 10;
let onlineFreeCamera = false; // in online mode, camera tracks only local player
let onlineCamX = 450, onlineCamY = 260; // free camera target position for online mode
let _cheatBuffer     = ''; // tracks recent keypresses for cheat codes
let unlockedMegaknight = false;
// Public room browser state
let _publicRooms     = [];  // [{code, host, created}] — discovered public rooms
let _isPublicRoom    = false; // whether current hosted room is public
let _publicRoomCheckTimer = 0;

// ============================================================
// ============================================================
// VERSION
// ============================================================
const GAME_VERSION = '4.5.0';  // bump this when releasing; must match CHANGELOG[0].version
console.log('[VERSION CHECK]', GAME_VERSION);

// DEBUG / DEVELOPER STATE
// ============================================================
let debugMode          = false;
let timeScale          = 1.0;
let showHitboxes       = false;  // F1 — fighter hitboxes + weapon tips
let showCollisionBoxes = false;  // F2 — platform collision geometry
let showPhysicsInfo    = false;  // F3 — velocity vectors + onGround/vy labels
let _debugKeyBuf       = '';     // rolling key buffer for "debugmode" cheat

// ============================================================
// STORY MODE STATE
// ============================================================
let playerPowerLevel    = 1.0;   // hidden: grows +0.02 per chapter cleared; applied to player damage in story
let storyModeActive      = false; // true while a story level is in progress
let multiverseModeActive = false; // true while a multiverse encounter is in progress
let storyCurrentLevel   = 1;     // which story level is being played (1-indexed)
let storyPlayerOverride = null;  // { speedMult, dmgMult, noAbility, noSuper, noDoubleJump, weapon } — applied to p1 on level start
let storyFightSubtitle  = null;  // { text, timer, maxTimer, color } — in-fight narrative subtitle
let storyFightScript    = [];    // [{ frame, text, color }] — scheduled messages for current level
let storyFightScriptIdx = 0;     // next unplayed entry index
let storyEnemyArmor     = [];    // ['helmet','chestplate','leggings'] — armor pieces on enemy this chapter
let storyTwoEnemies     = false; // true = spawn a second enemy bot in this chapter
let storySecondEnemyDef = null;  // { weaponKey, classKey, aiDiff, color } for the second enemy
let storyAllyDef        = null;  // { name, weaponKey, classKey, aiDiff, color, health } — ally fighter on the player's side (ch.allyDef)
let storyOpponentName   = null;  // display name of the story chapter opponent (shown in HUD)
let storyChapterCtx     = null;  // { origId, noAdaptive } — set at story fight launch; drives Lever-2 AdaptiveAI selection in _startGameCore
let storyOpponentColor  = null;  // hex color for the story opponent fighter (applied at spawn)
let storyCharId         = null;  // named character ID for appearance overlay ('veran','herald', etc.)
let storyBossType       = null;  // 'fallen_god' | null — overrides which Boss subclass is spawned
let storyAbilityState   = {};    // per-fight state for unlocked story abilities (medkit used, last stand triggered, etc.)
let storyPhaseIndicator = null;  // { index, total, label, type }
let storyGauntletState  = null;  // active chapter phase runtime
let storyPendingPhaseConfig = null; // temporary launch override for next story phase
let storyCameraLock     = null;  // { left, right, reason }
// ── Objective system ──────────────────────────────────────────────────────────
window.currentObjective        = null;   // { text, completedAt } | null
window.objectiveCompleteTimer  = 0;      // frames to show "COMPLETE" banner
let storyPressureState  = { dodgeFatigue: 0, dodgeTimer: 0 };

// ============================================================
// ENTITY & VISUAL STATE
// ============================================================
let lightningBolts   = [];    // { x, y, timer, segments } — Torren perk visual lightning
let backstagePortals = [];    // {x,y,type,phase,timer,radius,maxRadius,shards,done}
let phaseTransitionRings = []; // expanding ring effects on phase change
// ---- Combat Phase Lock ----
// Single authority for which phase owns the frame. Higher-priority phases block lower ones.
// Priorities: normal=0, hitstop=1, finisher=3, qte=3, cinematic=4.
// Only the system that SET the lock can CLEAR it (matched by phase name).
let combatLock = {
  phase:    'normal',
  priority: 0,
  blocks:   { ai: false, movement: false, input: false },
};

const _COMBAT_LOCK_DEFS = {
  normal:    { priority: 0, blocks: { ai: false,  movement: false, input: false } },
  hitstop:   { priority: 1, blocks: { ai: false,  movement: false, input: false } },
  finisher:  { priority: 3, blocks: { ai: true,   movement: true,  input: true  } },
  qte:       { priority: 3, blocks: { ai: true,   movement: false, input: false } },
  cinematic: { priority: 4, blocks: { ai: true,   movement: true,  input: true  } },
};

/** Raise the combat lock to the given phase (ignored if a higher-priority phase is already active). */
function setCombatLock(phase) {
  const def = _COMBAT_LOCK_DEFS[phase];
  if (!def || def.priority < combatLock.priority) return;
  combatLock.phase    = phase;
  combatLock.priority = def.priority;
  combatLock.blocks   = { ai: def.blocks.ai, movement: def.blocks.movement, input: def.blocks.input };
}

/** Release the combat lock — only effective if the caller owns the current phase. */
function clearCombatLock(phase) {
  if (combatLock.phase !== phase) return;
  combatLock.phase    = 'normal';
  combatLock.priority = 0;
  combatLock.blocks   = { ai: false, movement: false, input: false };
}

/** Returns true when the named system ('ai' | 'movement' | 'input') is currently blocked. */
function isCombatLocked(system) {
  return !!combatLock.blocks[system];
}

// ---- Cinematic System ----
let cinGroundCracks  = [];    // world-space crack effects (managed by smc-cinematics.js)
let cinScreenFlash   = null;  // screen-space flash { color, alpha, timer, maxTimer }
let activeCinematic      = null;  // active cinematic sequence or null
let isCinematic          = false; // true during any cinematic or finisher — blocks new attack/projectile creation
let slowMotion           = 1.0;   // physics time scale (1=normal, 0=fully frozen)
let cinematicCamOverride = false; // when true, camera uses cinematic focus targets
let cinematicZoomTarget  = 1.0;   // zoom level during cinematic
let cinematicFocusX      = 450;   // camera focus X during cinematic
let cinematicFocusY      = 260;   // camera focus Y during cinematic
let cinematicCamSnapFrames = 0;   // one-frame hard-cut override for punchy cinematic beats
let cinematicLetterboxAmt    = 0;   // current letterbox bar height (0–1 fraction of screen height)
let cinematicLetterboxTarget = 0;   // target letterbox amount (lerped toward)
let _camPrevFocusX      = 450;    // previous cinematic focus target X (for spring feel)
let _camPrevFocusY      = 260;    // previous cinematic focus target Y (for spring feel)
let _camOvershootX      = 0;      // decaying cinematic camera overshoot X
let _camOvershootY      = 0;      // decaying cinematic camera overshoot Y
// ── Cinematic Enhancements (smb-cinematics-core.js) ──────────────────────
let cinSpeedLines       = [];     // radial/directional speed line burst effects
let cinMotionTrails     = [];     // [{entity, positions:[{x,y}], color, maxLen}]
let cinImpactFrame      = null;   // hard-cut impact frame {timer, maxTimer, color, entities[]}
let cinNameCard         = null;   // move name card {text, color, accentColor, timer, maxTimer}
let cinematicTiltAngle  = 0;      // current Dutch angle in radians (world-space render tilt)
let cinematicTiltTarget = 0;      // target Dutch angle — lerped toward each frame
let cinBgContrast       = null;   // bg contrast override {color, alpha, timer, maxTimer}
let cinShakeDir         = null;   // directional shake first-frame bias {x, y, timer}
let bossDeathScene   = null;  // boss defeat animation state
let fakeDeath        = { triggered: false, active: false, timer: 0, player: null };
let bossPlayerCount  = 1;     // 1 or 2 players vs boss
let forestBeast      = null;  // current ForestBeast instance (null if none)
let forestBeastCooldown = 0;  // frames until beast can spawn again after death
let yeti             = null;  // current Yeti instance in ice arena
let yetiCooldown     = 0;     // frames until yeti can spawn again

// ── Spawn config — single source of truth for all enemy spawn timing ──────────
const SPAWN_CONFIG = {
  yeti: {
    minDelay:      900,   // frames before yeti can first spawn (15s at 60fps)
    respawnDelay:  1200,  // frames cooldown after yeti death (20s)
    spawnInterval: 400,   // deterministic spawn check interval (~6.7s)
    maxAlive:      1
  },
  forestBeast: {
    respawnDelay:  900,   // frames cooldown after beast death (15s)
    spawnInterval: 300,   // deterministic spawn check interval (5s)
    maxAlive:      1
  }
};
let mapItems         = [];    // arena-perk pickups
let randomWeaponPool = null;  // null = use all; Set of weapon keys
let randomClassPool  = null;  // null = use all; Set of class keys

// Boss fight floor hazard state machine
let bossFloorState = 'normal';  // 'normal' | 'warning' | 'hazard'
let bossFloorType  = 'lava';    // 'lava' | 'void'
let bossFloorTimer = 1500;      // frames until next state transition

// ── Depth Phase: Z-axis final phase (triggers after Code Realm + fight reset) ──
// Entities gain a z-coordinate (-1 to 1); only same-layer hits land (|dz| < 0.4).
// Player uses Q (ability key) to decrease Z and E (super key) to increase Z.
let tfDepthPhaseActive     = false; // true while Z-axis illusion phase is live
let tfDepthTransitionTimer = 0;     // >0 = input frozen during scripted entry (~30f)
let tfDepthEnabled         = false; // Z-movement unlocked after transition completes
let tfDepthPlayerStillZ    = {};    // { [playerIdx]: { z, frames } } for depthPunish tracking
const TF_DEPTH_CX = 450;           // circular arena center X
const TF_DEPTH_CY = 300;           // circular arena center Y
const TF_DEPTH_R  = 300;           // circular arena radius

// True Form — dimensional attacks
let tfPhaseShift   = null;  // { timer, maxTimer, echoes:[{x,y}], realIdx, revealed }
let tfRealityTear  = null;  // { x, y, timer, maxTimer, phase:'warn'|'active'|'close' }
let tfMathBubble   = null;  // { text, timer, maxTimer, x, y }
let tfCalcStrike   = null;  // { timer, maxTimer, predictX, predictY, fired, strikeDelay }
let tfGhostPaths      = null;  // { paths:[{pts,selected,alpha}], timer, maxTimer } — 5D path visualization
let tfRealityOverride = null;  // { timer, maxTimer, bossRef, targetRef, phase } — dominance mechanic
// ── New cosmic attacks ─────────────────────────────────────────────────────────
let tfGammaBeam     = null;  // { phase:'telegraph'|'active', timer, y, hit:Set }
let tfBurnTrail     = null;  // { y, timer, maxTimer } — glowing aftermath streak after gamma beam
let tfNeutronStar   = null;  // { phase:'pull'|'warn'|'slam', timer, bossRef, startX }
let tfGalaxySweep   = null;  // { angle, speed, timer, maxTimer, hit:Set }
let tfMultiverse    = null;  // { timer, maxTimer, echoes:[{x,y,selected}], targetIdx, phase, bossRef, targetRef }
let tfSupernova     = null;  // { timer, maxTimer, phase:'buildup'|'active', bossRef, hit:Set, r }
let tfAttackRetryQueue = []; // [{ ctx, move, targetRef, source, framesLeft, attempts }]

// ── Story event / cinematic system ────────────────────────────────────────────
let storyEventFired    = {};   // { [eventName]: true } — dedup per fight
let storyFreezeTimer   = 0;    // frames of physics halt for cinematic freezes
let storyDistortLevel  = 0;    // 0-1 world distortion intensity (rises with chapter progress)
let sovereignBeaten    = false; // set true after Sovereign MK2 is defeated
let bossRushUnlocked   = false; // set true by cheat code UNLOCKBOSSRUSH
let storyOnline        = false; // set true after online story completion
let godEncountered        = false; // set true after first God encounter
let godDefeated           = false; // set true after God is defeated in Phase 2
let absoluteAxiomUnlocked = false; // set true by cheat code AXIOMSQUARED
let playerCoins        = 0;     // coin balance; hydrated per account
let unlockedCosmetics  = [];    // cosmetic IDs; hydrated per account

// ── Ability unlock toast ─────────────────────────────────────────────────
let abilityUnlockToast = null;  // { text, icon, timer, maxTimer }

// ── Between-level overlay hold ────────────────────────────────────────────
// Narrative scenes and branch prompts are fullscreen overlays that open while a
// match is still running. gameLoop() parks on this flag (and smb-input.js stops
// feeding it keys) so the world underneath stops instead of simulating out of
// sight. Held keys are dropped on both edges.
function storyHoldGameplay(on) {
  window._storySceneHold = !!on;
  if (typeof _clearAllKeys === 'function') _clearAllKeys();
}

// ── Exploration chapter state ─────────────────────────────────────────────
let exploreActive    = false;   // true while exploration chapter is running
let exploreWorldLen  = 4200;    // total world length in game px (set per chapter)
let exploreGoalX     = 3800;    // world x of goal object
let exploreGoalName  = '';      // display name of the goal object
let exploreGoalFound = false;   // true when player reaches the goal
// Clear-the-area gate: the exit stays sealed while the level's objective is
// unfinished or a required enemy is alive. Set by storyLevelClearBlocker()
// consumers; read by the exploration HUD to explain WHY the mark won't take.
let exploreGoalBlocked     = 0;  // count of required enemies still standing (0 = clear)
let exploreGoalBlockReason = ''; // player-facing reason the exit is sealed
let exploreFoesRemaining   = 0;  // required enemies left (alive + queued), for the HUD
let exploreSpawnQ    = [];      // [{wx, def}] enemies to spawn as player passes wx
let exploreEnemyCap  = 2;       // max concurrent exploration enemies alive at once
let exploreCheckpoints = [];    // [{ x, hit }]
let exploreCheckpointIdx = -1;
let exploreSidePortals = [];    // [{ x, y, type, reward, active, entered }]
let exploreAmbushTimer = 0;
let exploreCombatQuiet = 0;
let exploreArenaLock = null;    // { left, right, enemies:[], cleared, label }
let exploreDuelMode = false;    // true = walk→fight→walk single-duel exploration wrapper
let exploreDuelOpponent = null; // { name, weaponKey, classKey, aiDiff, color, health } spawned at the duel checkpoint
let explorePickups = [];        // [{ x, y, type:'coin'|'xp'|'heal'|'chest', icon, value|contents, collected }] walk-zone loot + hidden chests
let exploreSeedHealth = null;   // pending carried-over HP applied on the first exploration frame (null = none)
let exploreRegion = null;       // active one-map region: { name, segLen, chapters:[ids], boundaries:[{x,chId,done}] }
let exploreStartX = null;       // pending start x applied on the first exploration frame (mid-region launch)
let storyChaseTimer    = 0;     // frames remaining in a chase phase (0 = no chase active)
let storyChaseMaxTimer = 0;     // max frames (used for the HUD progress bar)
let storeSurvivalState = null;  // { active, state, wave, totalWaves, waveSize, timer, baseEnemy }

// ── TrueForm clone position history (ring buffer for multiverse lag effect) ──
let _tfCloneHistory = [];   // [{ x, cy, facing }, ...] — last 24 frames

// ── New interactive chapter mode globals ─────────────────────────────────────

// Mode-active flags (checked in updateExploration each frame)
let stealthModeActive    = false;
let escapeModeActive     = false;
let defenseModeActive    = false;
let scavengeModeActive   = false;
let puzzleModeActive     = false;

// Stealth mode
let stealthGuards        = [];   // [{ x, y, radius, alertTimer, maxAlertTimer, alerted }]
let stealthAlarmed       = false; // true once any alarm fires
let stealthNeverAlarmed  = true;  // bonus flag: never triggered alert

// Escape mode
let escapeWallX          = -80;  // world x of the collapse wall
let escapeWallSpeed      = 1.2;  // px/frame; accelerates over time
let escapeWallAccelTimer = 0;    // frames since last speed tick

// Defense mode
let defenseNexusHP       = 300;
let defenseNexusMaxHP    = 300;
let defenseNexusX        = 450;
let defenseNexusY        = 390;
let defenseNexusHitTimer = 0;    // per-enemy cooldown (frames since last nexus hit)
let defenseNexusPulse    = 0;    // glow animation counter

// Scavenge mode
let scavengeItems        = [];   // [{ x, y, name, icon, collected }]
let scavengeTotal        = 0;

// Puzzle mode
let puzzleSwitches       = [];   // [{ x, y, label, activated, pulseTimer }]
let puzzleStep           = 0;    // next switch index that must be activated

// Assassination mode
let assassinationTimer   = 0;    // frames remaining (counts down)
let assassinationTarget  = null; // reference to target fighter

// Gauntlet mode
let gauntletRound        = 0;    // current round (0-indexed)
let gauntletTotalRounds  = 3;
let gauntletRoundDelay   = 0;    // frames until next round starts
let gauntletActive       = false;

// Ship flight mode
let shipFlightShip       = null; // { x, y, vx, vy, hp, maxHp, bullets:[], fireTimer:0 }
let shipFlightEnemies    = [];   // [{ x, y, hp, maxHp, speed, hitTimer }]
let shipFlightScrollX    = 0;    // camera scroll (based on ship.x)
let shipFlightLen        = 6000; // total flight length
let shipFlightStars      = [];   // parallax star layer

// Escort mode (implemented in smb-story-engine-modes.js)
let escortNPCTarget      = null; // Fighter-like NPC wrapper object
let escortNPCHP          = 200;
let escortNPCMaxHP       = 200;
let escortGoalX          = 4000; // world x the NPC must reach

// ============================================================
// SHIP PROGRESSION SYSTEM
// Axiom cannot travel the multiverse without a stable vessel.
// Parts are collected through main story chapters and exploration.
// When all 5 parts are gathered, SHIP.built = true → full branch access.
// ============================================================
window.SHIP = {
    built: false,
    parts: {
        hull:    0,       // needs 5 (scattered across early arcs)
        engine:  false,   // dropped by Arc 2 boss
        core:    false,   // dropped by Act 3 climax
        crystal: false    // dropped after first fracture preview completes
    }
};

// ============================================================
// FRACTURE SYSTEM
// Fractures are visible tears to other branches.
// Before SHIP.built: only a 10-second preview with one branch guardian.
// After SHIP.built: full branch entry unlocked.
// Each fracture is tied to one of Axiom's former allies turned rulers.
// ============================================================
window.FRACTURES = [
    {
        id:          'branch_alpha',
        name:        'Alpha Branch',
        rulerName:   'Vael',
        rulerLore:   'Once Axiom\'s closest ally. Now ruler of a branch built on absolute order.',
        x:           500,
        y:           250,
        unlocked:    false,
        previewed:   false,   // true after first preview entry
        completed:   false    // true after full branch cleared (post-ship)
    },
    {
        id:          'branch_null',
        name:        'Null Branch',
        rulerName:   'Kael',
        rulerLore:   'Consumed by the fracture\'s power. Built his branch from silence — nothing enters, nothing leaves.',
        x:           720,
        y:           180,
        unlocked:    false,
        previewed:   false,
        completed:   false
    },
    {
        id:          'branch_crimson',
        name:        'Crimson Branch',
        rulerName:   'Sora',
        rulerLore:   'The most aggressive of the group. Her branch is a battlefield that never ends.',
        x:           200,
        y:           320,
        unlocked:    false,
        previewed:   false,
        completed:   false
    }
];

// Active fracture preview state — set by enterFracturePreview(), cleared on exit
let fracturePreviewActive = false;   // true while 10s preview is running
let fracturePreviewTimer  = 0;       // counts down from 600 (10 seconds at 60fps)
let fracturePreviewId     = null;    // id of the fracture being previewed

// ============================================================
// STORY PROGRESS SYSTEM
// Tracks act/chapter position and persistent story flags.
// Acts 0–9; chapter is a 0-based index within the current act.
// flags{} is a free-form key→true store for one-shot events.
// ============================================================
window.STORY_PROGRESS = {
    act:     0,
    chapter: 0,
    flags:   {}
};

// ── resetProgressionGlobals ───────────────────────────────────────────────────
// Resets all account-specific progression globals to their initial defaults.
// Called at the start of _refreshRuntimeFromSave() (smb-save.js) so every
// account load begins from a clean slate before the save patch is applied.
//
// Rules:
//   - Mutate in-place throughout — object/array references are never replaced,
//     so no system holding a ref to SHIP, FRACTURES, or settings can break.
//   - motivationStage lives in smb-progression.js (loaded after this file);
//     guard with typeof so this is safe to call at any point.
//   - playerProgressLevel is recalculated at the end once its sources are reset.
function resetProgressionGlobals() {
  // SHIP — mutate properties, preserve object identity
  SHIP.built         = false;
  SHIP.parts.hull    = 0;
  SHIP.parts.engine  = false;
  SHIP.parts.core    = false;
  SHIP.parts.crystal = false;

  // FRACTURES — reset each entry's state fields, preserve array and object identities
  for (const f of FRACTURES) {
    f.unlocked  = false;
    f.previewed = false;
    f.completed = false;
  }

  // STORY_PROGRESS — mutate in-place
  STORY_PROGRESS.act     = 0;
  STORY_PROGRESS.chapter = 0;
  STORY_PROGRESS.flags   = {};

  // Unlock booleans
  bossBeaten         = false;
  unlockedTrueBoss   = false;
  unlockedMegaknight = false;

  // Settings — ragdoll preference is account-specific (persisted per account)
  settings.ragdollEnabled = false;

  // motivationStage — declared in smb-progression.js, loaded after this file; guarded
  if (typeof motivationStage !== 'undefined') motivationStage = 0;

  // collectedLetterIds — must clear in-memory Set so old account's letters don't bleed through
  if (typeof collectedLetterIds !== 'undefined' && collectedLetterIds instanceof Set) collectedLetterIds.clear();

  // earnedAchievements — declared in smb-achievements.js (loaded after this file); guarded
  if (typeof earnedAchievements !== 'undefined' && earnedAchievements instanceof Set) earnedAchievements.clear();

  // playerProgressLevel is derived from the two booleans above; recalculate
  playerProgressLevel = 0;
}

// Second reset layer — clears account-scoped runtime globals not covered by
// resetProgressionGlobals(). Called at the top of _refreshRuntimeFromSave() and
// from the new-account path in loadGame(). Does NOT touch localStorage — that is
// handled by _applySaveData() (primary path) or explicit removeItem (new-account path).
function resetAccountScopedGlobals() {
  sovereignBeaten    = false;
  storyOnline        = false;
  godEncountered     = false;
  godDefeated        = false;
  playerCoins        = 0;
  unlockedCosmetics.length = 0;
  // paradoxCompanionActive — declared in smb-paradox-ai.js (loaded later); guarded
  if (typeof paradoxCompanionActive !== 'undefined') paradoxCompanionActive = false;
}
