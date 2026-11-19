# God of War Direction: Draft Plan

Draft, Nov 15 2026. Goal: move Stickman Evolution from a chapter list of separate levels toward connected worlds with dungeons, the way God of War tells its story while you walk and fight through one place. The game stays 2D side-view.

## What has to be remade

Only two things are structurally new. Everything else is a patch on top of a system that already ships.

**1. The story's shape: chapters become places.** Today every chapter is launched on its own from the star chart (`smb-story-engine-flow.js`), and its map lives in `js/story/levels/chNN.js` as one long corridor. A God of War world needs a layer above that: a realm made of rooms connected by doors, where the game remembers which doors are open, which chests are looted, and which puzzles are solved, and where story beats fire when you reach a place instead of when you pick a chapter. This is the realm layer (new file, something like `js/story/smb-realm.js`), plus a `realm` block in the story save.

**2. How dungeon rooms are authored.** Chapter maps are hand-written JavaScript (constants, a `layout()` function, art functions). That is fine for 186 one-off corridors, but a dungeon is many small rooms that reuse the same parts. Rooms should be data: platforms, doors, and parts listed by type and position, drawn by shared art. The Designer (`js/smb-designer.js`) already edits and exports platforms, so it becomes the room editor rather than a new tool being written.

## What already exists and gets reused

| Need | Already in the game |
|---|---|
| Doors, pressure plates, sealed vault, loot shelf | Battle royale temple (`BR_TEMPLE` in `js/smb-br-structures.js`) |
| Collapsing pillars, breakable windows, snapping bridge, multi-floor interiors | Battle royale office, temple, rope bridge |
| Bots that walk through doors and up floors | `brStructureWaypoint` + `smb-pathfinding.js` |
| Multi-segment walkable worlds, underground chambers, hidden chests | `smb-story-engine-explore.js` / `explore2.js` |
| Random area types + a mini-boss guarding the exit | `js/smb-endless.js` |
| Skill tree with purchased bonuses | `_story2.skillTree`, `_applySkillTreeToPlayer` in `smb-story-config.js` |
| Side quests (favors) | `js/story/smb-story-sidequests.js` |
| Collectible lore | `js/smb-journal.js` |
| Companion that fights beside you | ally system (endgame ch144-169) |
| Walk-and-talk story while moving | interlude walking chapters, seamless story (July 17) |
| Bosses, finishers, cinematics, QTE | all of it |
| Figures, poses, scene staging | figure studio (`tools/workbench`, `?wb=figures`) |

## Tools that speed it up

- **`tools/level-tester.js`** has Sovereign play chapters headless and reports clears. Pointed at rooms, it checks every room can be fought through.
- **`js/smb-map-analyzer.js`** grades a map S to F. Run it on every room.
- **`tools/level-spawn-audit.js`** catches spawns on bad ledges (the Oct 17 bug class).
- **`tools/boss-bench.js`, `tools/class-balance.js`** tune dungeon bosses and enemy mixes.
- **`tools/audit/check.js`** catches missing globals and load-order mistakes.
- **Designer export** gives platform JSON straight into room data.

The gap: none of these solve puzzles. Sovereign fights, he doesn't pull levers. A small puzzle checker is needed that walks the room graph and confirms every locked door has a reachable key, plate, or lever. Since rooms are data, it can be a graph check rather than a bot.

## 2D constraints

Staying 2D is cheaper to build (art, camera, animation, AI, testing all reuse what exists) but harder in two design spots:

- **Crowd fights.** Enemies can't surround the player; they stack left and right. Pressure has to come from different heights instead: shields push from the front, flyers dive from above, burrowers erupt from below, ranged enemies hold ledges, and large background enemies throw telegraphed attacks into the play plane. This is enemy-role design inside the combat step, not a new system.
- **World size.** A line can't branch, so space comes from height and layers: rooms stacked above and below, and doors into background rooms (the BR temple vault and office interiors already do this; to the realm layer a background room is just another room).

Puzzles favour 2D: gravity, timing, weights, chains, line of sight, light beams. They read clearly and the room-graph checker can verify them.

## First story realm: Abandoned Research Facility (Nov 15, in progress)

Your chapters 67-70 (registry ids 66-69). `REALM_STORY.facility` + `REALM_DEFS.facility` in `js/smb-realm.js`.

- **ch66 (Laboratory Infiltration):** Supply Room behind a lab door at x 1000. The shopkeeper (unnamed, there for money) and a ration chest.
- **ch67 (The Sealed Section):** the blast door at x 2015 is sealed. Its terminal (x 1930) refuses the first time, reroutes power to the Records Office door (x 470) and wakes two drones in the corridor behind you. The office holds the old access key; its ladder climbs out of a floor hatch at x 1800 next to the gate, which stays unbolted after (the shortcut). With the key, the terminal opens the gate.
- **How rooms work in story:** entering a side room sets the chapter world aside (arena, enemies, projectiles, respawn point); `updateExploration` and the chapter HUD/markers pause while `realmInSideRoom()`; leaving restores it all. Doors refuse while enemies are within 520 px or an arena lock is up. Dying in a side room returns you to the chapter world at the door you used.
- **Spawn rule:** while a gate is closed, non-guard spawns that would land behind it come in on the player's side (`realmClampSpawnX`, called from `_exploreSpawnEnemy`). Without it, ch67's checkpoint fight spawned behind the gate and the arena lock never released.
- **State** saves per account under `unlocks.realm.facility` (flags, items, opened chests).
- The standalone Realm mode is off the home list; it stays reachable from the console (`selectMode('realm')`) as a room test bed.

Level tester: the walker now routes realm gates from the realm's own data (`realmWaypoint` in `tools/level-tester.js`): terminal, else the door to the room holding the needed item, the item, then out by the door nearest the gate, pressing F through the real key handler. Foes behind a closed gate are not targets. Results print `realm F xN [flags]`. Nov 15, brain 20011, ch67: 1 of 2 cleared, both attempts opened the gate (5 presses each); the loss was the fight after.
- No hit crosses a closed gate (swings, Q/E, projectiles, both ways): `realmBlocksHit`, checked in `dealDamage`. Added Nov 15 after the user hit the guard through the door.
- Shopkeeper: hitting him (a swing or Q started next to him, facing him) gets two warnings, then the lantern goes out and he kills you (a real death; costs a life in story). Counter resets each time you enter his room.
- Q with no one around now fires for players (`_abilityStandIn` in smb-fighter.js aims it 250 px ahead; dealDamage ignores the stand-in). All 29 player weapons checked; bomb and knives behave as designed (aim-then-throw, recall with nothing out).
- Closed gates also hold the player on the near side every frame: Q/E move scenes set position directly and skip collision, and the brain lunged through the door at the guard before this. Pre-existing, not from this work: ch67's floor has 20 px steps (x 900, x 2000) that must be jumped, and walk-fight chapters' timed fight lines play while you walk (including inside rooms).

## First dungeon: the Trial Wing (Nov 15 night, built while the user was away)

Your chapter 70 (registry id 69, "What the Lab Taught"). The chapter text always had Kael and Calix go back and burn the trial wing, "intake, the columns, the rig, the data core last"; it was narration after the fight. Now it is played. `REALM_DEFS.trialwing` + `REALM_STORY.trialwing` in `js/smb-realm.js`.

- Door at x 3400, just past the seam duel. Four rooms joined left to right: Intake, Stasis Columns, The Trial Rig, Data Core.
- Each room seals while its enemies stand (`foes`); a cleared room stays cleared. Its machine (`burn`) takes a charge with F (about 2 s fuse), then burns and stays burning. The door onward needs that burn (`needs: 'burn_<id>'`).
- Data Core: the Trial Overseer (scythe, helmet + chestplate). Its door out comes up at x 5150 by the stairwell and stays open after (the shortcut).
- The chapter exit is sealed until the core burns (`exitNeeds`, read by `_exploreObjectivePending` via `realmExitBlocker`).
- Calix speaks once on entering each room, using only what the chapter already says about him.
- Level tester: `realmDungeonWaypoint` walks the route (`REALM_DEFS[key].route`): fight, burn, next door, out.
- The chapter's postText still narrates the burning afterwards; it now describes what the player just did.

New realm room fields: `foes`, `burn`, `say`, door `needs`. Documented at the top of smb-realm.js.

Balance (brain 20011, Normal, --progress=auto): first build was too harsh (the finale's lives pool had to cover the duel plus four rooms; 0/2, died in Intake and the Rig). Rebalanced: lighter room foes, the Overseer at 200 HP with a helmet only, and each burn heals 35% (the dungeon's health stone). The Data Core's way out is now its right edge (the pilot stalled in front of an F door). After that: a full clear in 193 s; the losses all came in the chapter's original lockdown duel, before the wing. Chests: Records Office +30 tokens, Stasis Columns high-ledge cache +60 EXP, Data Core +50 tokens.

## Second dungeon: the Memory Vault (Nov 16)

Your chapter 82 (registry id 81, "What Was Before"), the chapter that was already a three-lock puzzle level. Lock 3 (x 2500) now sits behind a sealed gate at x 2250 with no terminal; the way past is the Fallen God's vault. Door at x 2050, out at x 2420 (one-way, from the vault side). `REALM_DEFS.vault` + `REALM_STORY.vault`.

Each room teaches one puzzle part (step 2 of the slice), with a Fallen God line on entry:
- **Hall of Weights:** push the stone block (walk into it; slower than walking) onto the plate. The plate's groove catches it and the bars stay up. Standing on the plate yourself opens the bars only while you stand there, too far away to make it.
- **The Broken Stair:** two Threshold Guards, a token chest up the ledges, then a cracked wall: four swings or Q break it for good.
- **The Closing Door:** a timed plate (260 frames) and bars 1000 px away with a low step to jump. A perfect run arrives with 0.7 s left at 230 frames, so 260 leaves about 1.2 s. EXP chest past the bars.
- **Seal Chamber:** Vault Sentinel (axe; story scaling puts it near 300 HP at this chapter), then a lever that will not move while it stands. Pulling it opens the gate in the chapter world.

New room fields (documented at the top of smb-realm.js): `blocks`, `plates` (`latch`, `hold`), `bars` (`when`: `plate:id`, `lever:id`, `clear`, or a flag), `levers`, `cracks`, `steps`. Rules that prevent soft-locks: bars you have walked past stay up (`bar_<id>`), a latched plate keeps its block on re-entry, block positions reset each visit, closing bars push anyone inside them out to the near side.

Fixed while testing: enemies' dash moves carried them through closed gates (the Seal Keeper ended up on the player's side). Every enemy is now held on the side of the gate it started on. The door-refuses-near-enemies check also counted the Seal Keeper behind the gate, which would have locked the vault door for good; foes across a closed gate no longer count.

Tested in the browser (Nov 16): block push and seat, bars, the walk through to each room, crack break with real swings, the timed run (frame-driven input), bars closing on the player, the lever refusing then opening, the exit at x 2420 with the gate gone. Not yet run by the level tester: it can't push blocks or time a run, so it needs a puzzle step before it can walk this chapter.

## Level tester on optional dungeons (Nov 16)

`--optional` makes the walker take every optional dungeon in the chapter: enter any entrance whose room was never visited, then in each room light torches, solve puzzles, fight, and take the door to an unvisited room (floor-hole drops included), else the way out. It boards a lift at its bottom stop (aiming above the deck so it jumps on), rides it, and steps off to a high door. Realm flags and visited rooms are now sampled every second for the report.

Brain 20011, Normal, --progress=auto (Nov 16):

| Chapter (yours) | Dungeon | What the pilot did |
|---|---|---|
| 9 | Cache Crawlspace | 1/1 cleared, crate and grate solved, store cleared |
| 97 | Blind Galleries | 1/1 cleared, all torches lit, Listening Room cleared |
| 99 | Hall of the First Wall | 2/2 solved wall, steps and two-weight puzzle, reached the throne; then died to the Colossus and the chapter's checkpoint waves |
| 47 | Beneath the First Collapse | 2/2 broke the wall, dropped, cleared the Sunken Hall, made the timed run, reached the Warden; died to the Warden |
| 42 | Root Vault | rides the lift to the Thornwalk; can't reach the lever (three ledge hops over spikes is beyond the walker, not a human) |

Nov 17 regression on bundled Chrome (see below): ch82 2/2 cleared with the whole vault solved each time; ch70 1/2, the win clearing the full Trial Wing, the loss in the opening duel as before.

The level tester now defaults to puppeteer's bundled Chrome for Testing (`--chrome=system` for the installed one). System Chrome 157.0.8103.79 detaches the page frame under puppeteer 25, so every attempt read as CRASH "page detached".

Fixed because of these runs:
- **Root Shaft lift sat 40 px short of its exit ledge.** Walking off dropped you through the gap, under the one-way ledge. The lift is now flush with the ledge (x 1000). A real bug for players too; my manual test only crossed it by luck.
- **Chained swings didn't count as hits on cracked walls (and the shopkeeper).** A swing start was read as the attack timer leaving 0; back-to-back swings never touch 0. Now any upward jump in the timer counts.

## Optional rooms: the Cache Crawlspace (Nov 16)

Your chapter 9 (registry id 8, "Cache Discovery"), so a new player meets the side rooms early. A hatch in the tunnel at x 4100, after the Cache Guardian duel (the duel's arena lock covers about x 3000-3500). Optional and gentle: `REALM_DEFS.crawl`.

- **Maintenance Crawl:** one crate onto one latch plate opens a grate. The first block puzzle in the story.
- **Supply Store:** one Cache Drone (easy AI; story scaling still gives it 200 HP, the standard cap, like the chapter's other foes), +30 tokens, +40 EXP. Ladder back to the tunnel.

Browser-tested Nov 16: the duel releases its lock and the walk continues; the hatch; the crawl solved with real keys; the store; the ladder back to x 4083.

## Optional dungeon: the Blind Galleries (Nov 16)

Your chapter 97 (registry id 96, "What You Cannot See", Shadow Realm stealth). Stone arch at x 1600. Optional. `REALM_DEFS.galleries`. Adds **lightless rooms** (`lightless: 0.96`: dark except a 150 px circle around you) and **torches** (`torches: [{ id, x }]`, F lights one for good, 300 px of light).

- **The Blind Gallery:** spikes you only see near a light, three torches to light along the way, a token chest on a ledge between the spike strips.
- **The Listening Room:** two Blind Stalkers in the dark and one torch in the middle. +120 EXP, +60 tokens. Arch back out.

Browser-tested Nov 16: darkness and the player's light, lighting a torch with F, spikes showing up near light, the foes hidden until close, the exit. The darkness is drawn from smb-loop-core.js just before damage numbers (`drawRealmDarkness`), so numbers, name tags, the target banner and the HP panel stay readable. The chapter's sentinels spawn as normal fighters and come at you, so the door needs them cleared like any other chapter.

## Optional dungeon: Hall of the First Wall (Nov 16)

Your chapter 99 (registry id 98, "The Scale of Things", Titan World). Stone arch at x 1650. Optional. `REALM_DEFS.titanhall`.

- **Titan Stair:** steps 110 and 190 high (single jump is about 214), spikes past them, a cracked wall that takes five hits. Token chest on top of the tall step.
- **The Weighing of Kings:** two blocks between two latch plates; the bars open only when both are seated (`when` now takes a list: all must hold). The inscription says "Each weight to its own side." Push one block the wrong way into the other and they jam; leaving and coming back resets the room.
- **Throne of the Dead King:** Ruin Colossus (hammer, helmet and chestplate) and a Titan Patrol. +140 EXP, +90 tokens. Ladder out.

Browser-tested Nov 16: the two-weight puzzle solved with real keys (B right to its plate, then A left), both plates latched and the bars opened; the stair room's look. The level tester's block step now picks the nearest unseated block and works through a `when` list in order.

## Optional dungeon: the Root Vault (Nov 16)

Your chapter 42 (registry id 41, "The Third Key"). A hatch in the level's root pit (x 1320, the pit floor) leads down. Optional. `REALM_DEFS.rootvault`. Adds two puzzle parts: **lifts** (`lifts: [{ id, x, w, y0, y1, when }]`, shuttle on their own or ride while `when` holds; riders move with them; pause 110 frames at each stop; the top stop must be level with the ledge it serves) and **spikes** (`spikes: [[x0, x1]]`, 12 damage and a bounce, 40-frame cooldown, respects i-frames).

- **Root Shaft:** spike floor crossed on stepping ledges (a token chest on one), then a shuttle lift up to an arch on a high ledge.
- **Thornwalk:** spikes under the whole room, a ledge route to a lever on the highest ledge, which opens a gate of roots at the far end. EXP chest on the way.
- **The Root Vault:** Root Keeper (hammer, helmet; about 300 HP after story scaling) and a Sanctum Scout. +100 EXP, +60 tokens. Ladder back to the root pit.

Single jump clears about 214 px, double about 318 (measured); every hop in these rooms is 120 px or less. Browser-tested Nov 16: spikes, the lift ride (rider stays on every frame), stepping off at the top, the lever and gate, the fight room, the ladder out, and the minimap mark turning to visited. Found and fixed while testing: the lift's top stop was 12 px under the ledge (one-way ledges can't be stepped up onto), and the 70-frame pause at the top was too short.

## Optional dungeon: Beneath the First Collapse (Nov 16)

Your chapter 47 (registry id 46, "What the Ancients Left"). The narration says the fourth Architect hid the diagram "deep in the ruins"; the dungeon is under them, and it is optional: nothing on the main walk needs it. `REALM_DEFS.undercroft` + `REALM_STORY.undercroft`. Stone arch at x 1300.

- **Collapsed Stair:** a cracked wall stands before a hole in the floor. Through the hole is the first story use of a `drop` door: you fall into the room below. A token chest sits on a ledge past the hole.
- **The Sunken Hall:** Tomb Knight and Rubble Crawler, then a timed plate (270 frames) and bars 1000 px away with two low steps to jump. A clean run arrives with 75 frames to spare. A ladder by the landing goes back up.
- **Vault of the First Collapse:** the chapter's optional mini-boss, the Collapse Warden (hammer, helmet and chestplate; story scaling makes it about 300 HP at this chapter). +120 EXP and +80 tokens. Its ladder out stays sealed while the Warden stands, so once you drop in you are committed.
- Rooms take a `stone` colour pair so steps, blocks, plates and cracked walls match the room (ruins brown here; the vault keeps its violet).

Browser-tested Nov 16: entrance, crack (four real swings), drop into the room below, timed run, sealed ladder, chests, ladder out to the chapter world at the entrance. One ladder F press did nothing on the first try and worked on the second; not reproduced, and every other F press in both dungeons worked first time. The level tester ignores optional dungeons (no gate or exit waits on them).

Regression after the Nov 16 gate and dungeon changes (brain 20011, Normal, --progress=auto): ch68 (registry 67) 3 of 6 cleared, every clear with the full facility route (terminal, power, key, shortcut, gate); losses were deaths in the checkpoint fights after the first terminal press. Nov 15 baseline 1 of 2. ch70 (registry 69) 0 of 2: one death in the opening lockdown duel (as on Nov 15), one in the Data Core against the Overseer.

The level minimap marks realm doors once you have come within 420 px of one (gold arch; dimmed once you have been inside) and closed gates (red bar). `realmMinimapMarks` in smb-realm.js, drawn by drawExploreMinimap.

Also Nov 16: the level tester now solves puzzle rooms (`realmPuzzleWaypoint`): pushes blocks onto latch plates with the direction key held, steps on hold plates and runs, pulls levers, swings at cracked walls. Brain 20011, Normal, ch82 (registry 81) x2: one clear with the whole vault solved by the pilot, one loss in fights.

## Optional dungeon: the Proving Halls (Nov 17)

Your chapter 29 (registry id 28, "Into the Crucible", the scavenge for the bearer records). Stone arch at x 2450 in the Crucible's outer wall, past the chapter's checkpoint fight. Optional. `REALM_DEFS.proving`. The three tests the Crucible gave the forty-seven bearers before Kael (the chapter's own count), one per room. Foes are Crucible constructs: canon keeps dead bearers out of enemy roles.

- **The Proving Floor (speed):** a spike floor under **crumbling ledges**, the new part (`crumbles: [{ id, x, y, w }]`): they shake when you land, give way 34 frames later whether you stay or not, and re-form 210 frames after that once nobody is inside the outline (a dashed outline marks where). Fault lines are drawn on them, so they read differently from solid ledges before you land. One solid rest ledge mid-way holds a token chest.
- **The Second Test (thought):** "Cut over the far bars: They all pushed forward." Block A forward onto the first plate opens the inner bars; block B starts past the second plate, so it has to be hopped and pushed back. Pushing B forward jams it against the exit bars.
- **The Last Test (strength):** Crucible Warden (hammer, helmet and chestplate) and a Proving Sentry. Forty-seven tally marks on the wall with the faint outline of a forty-eighth (`tally: { x, y, n }`). +130 EXP, +80 tokens. Ladder out, sealed while they stand.

Journal page (Nov 18): a chest under the tally wall gives `journal:forty-seven`, the first Journal entry found in the world instead of opened by story progress. Entries take a new gate, `{ found: '<realm>:<room>:<chest>', ch }` (smb-journal.js reads the realm save), shown locked as "Found off the path in chapter N". The page uses only what chapters 29-30 already say about the Crucible's forty-seven; the total of ninety-four stays gated where it was.

Also new, for every block puzzle: a block pushed flush against something solid shows a one-time line, "It won't go any further. Step out of the room and it resets." Leaving and re-entering already reset unlatched blocks (the Weighing of Kings in ch99 can jam the same way); now the game says so.

Browser-tested Nov 17: the arch (refuses with enemies close), the crumble timing and the fall onto spikes, A onto the first plate with real keys, B jammed on purpose (hint shown), out and back in (B reset, A kept), B pushed back onto the second plate, exit bars up, the last room's foes, chest, sealed ladder, ladder out. Level tester Nov 18 (`--optional`, brain 20011, Normal, 2 tries): one try reached the dungeon, crossed the crumbling floor on foot over the spikes, solved the Second Test outright (both plates, both bars) and fought the Warden; both tries ran out of lives in the chapter's own fights (Pressure Stalker, Checkpoint Hunter). Chapter 29 has never been cleared by the tester (Oct 31, Nov 1: loss and timeout), so that is the chapter, not the dungeon. Regression without `--optional`: ch9 2/2.

Fixed while testing: `realmReset()` (console) built a save with no `flags`, which crashed the level minimap mid-chapter.

## Optional dungeon: the Hollow Trunk (Nov 18)

Your chapter 40 (registry id 39, "Into the Green", the Endless Canopy). Arch at x 880, in front of the giant tree in the chapter's own backdrop. Optional. `REALM_DEFS.trunk`. New part: **pendulums** (`swings: [{ id, x, y, len, amp, period, phase }]`): a thorned log on two ropes swings across the path; touching it hits for 14 and throws you the way it is swinging (45-frame cooldown). Cross while it is at the far end of its swing, or jump it (the head bottoms out at chest height, below a full jump).

- **The Swinging Roots:** three pendulums, a token chest at the far end. Walking straight through without timing costs three hits.
- **The Heartwood:** a fourth pendulum, a shuttle lift to a ledge with an EXP chest and a lever that opens a gate of roots below.
- **The Nest:** Thorn Brood (axe, helmet) and a Canopy Stalker. +110 EXP, +70 tokens. Ladder out, sealed while they stand.

Browser-tested Nov 18 with real keys: arch, all three pendulums hitting (10 each after difficulty scaling), the Heartwood, lever, the roots opening, the Nest and its foes. Earlier the same morning three lives were lost during tests that forced room changes and teleported the player; a clean run with real keys and a 12-second idle in the Heartwood never reproduced them. Worth watching for in your playtest: a death with no hit (a "YOU FELL") inside this dungeon.

## Optional dungeon: the Looped Block (Nov 18)

Your chapter 57 (registry id 56, "Signal Maze", the Creator's Interference Layer). Arch at x 1120. Optional. `REALM_DEFS.loop`. The chapter's own idea, the Creator scrambling the city's geography, made into rooms: a block of street that ends in nothing. New part: **movers** (`movers: [{ id, x0, x1, y, w, speed, wait, start }]`): slabs of street that shuttle sideways between two left-edge stops, resting at each end, carrying whoever stands on them; `start: 'x1'` begins at the right end, so two can run opposite ways. With floor gaps (`floor: [[0, 320], [1180, 1500]]`) the room has a real drop.

- **The Drift:** a gap crossed on two slabs at different heights and speeds, so they drift in and out of step; ride the first until the second lines up. Token chest on a ledge above the gap.
- **Crossing Traffic:** two slabs going opposite ways over a spike floor, then a crumbling ledge.
- **Dead Relay:** Loop Warden (spear, helmet and chestplate; 300 HP after story scaling) and a Static Echo. +120 EXP, +80 tokens. Ladder out.

Browser-tested Nov 18: entrance, a rider carried both ways and resting at the ends, stepping off the far slab onto the far floor, the opposite-running pair, the Dead Relay's foes. Level tester (Nov 18): the walker now rides movers (`realmMoverWaypoint`: wait at the gap edge for the first slab to rest at its near stop, jump on, ride, hop to the next at its near stop, step off). `--optional`, brain 20011, Normal, 2 tries: both crossed the Drift, cleared Crossing Traffic and fought the Dead Relay's guards; both then ran out of lives in the chapter's own fights (one fall recorded in try 1).

Hollow Trunk in the level tester (Nov 18, `--optional`, brain 20011, Normal, 3 tries): all three walked all three rooms (pendulum hits show as "unknown" damage, 30-40 a run), pulled the lever and fought the Nest; all three then ran out of lives in the chapter's own fights. Chapter 40's baseline: Oct 31 0/2, Nov 1 1/2.

## Optional dungeon: the Buried Bunker (Nov 18)

Your chapter 88 (registry id 87, "The War Camp", War-Torn Dimension). Lab door at x 1300. Optional. `REALM_DEFS.bunker`. New part: **vents** (`vents: [{ id, x, w, top, force, when }]`): hot-air updrafts from a floor grate; anyone whose centre is in the column rises (vy eased toward -8) and hangs near `top`, then steps off onto a ledge no jump reaches. With `when`, the vent only blows while that holds. The war world's modifiers (more aggressive enemies) apply to the dungeon's guards too, which suits it.

- **Vent Shaft:** one vent to a ledge with a token chest and the door on. Holding a direction the whole way carries you out of the column before the top; you have to stand in it.
- **The Fan Room:** the vent is dead until the lever ("RESTART in three languages") is pulled. Its grate is a safe island in a spike floor; the exit is up on the ledge, so the vent is the only way on.
- **Command Bunker:** Bunker Sergeant (hammer, helmet and chestplate; 300 HP scaled) and a Trench Runner. +130 EXP, +80 tokens. Ladder out.

Browser-tested Nov 18: the vent rise (floor to y 116 in under a second, hanging there), stepping onto both ledges, the dead vent, the lever bringing it on, the spike-free grate, the ledge door, the Command Bunker's guards. Fixed while testing: the spike strip covered the vent's grate, and an edge exit could be reached over the spikes, skipping the vent. Not run through the level tester (no vent step in the walker).

## Ch71 (registry 70) Axiom encounter, repaired (Nov 15 night)

The unwinnable Axiom teaser had silently broken when chapters were renumbered: its logic checked id 63, which is now Veran's Confession (where it chipped 14 HP at 20 s and turned any later loss into a chapter clear). Now keyed to `_axiomTeaser`: the Void arena, no Creator intro card, Axiom (the Creator-form body, canon-correct) untouchable and calm (`Boss._teaserCalmAI`: faces you, swats you off for 1 damage), one life, and his strike at ~20 s (a Sky Execution finisher) completes the chapter into The First Reset. Any death in it advances.

## Design decisions (Nov 15, after step 1)

- **Realms live inside story mode, not as a separate mode.** Story already has walkable chapters (55 `walkFight` chapters, 6000px, checkpoints, tunnel chests) and `STORY_REGIONS` (one region so far, Multiversal Core, ids 32-35). Realm doors, rooms, save and minimap move into that system; the standalone Realm mode becomes a hidden test bed. Chapters stay the unit of progress: no renumbering, no removed chapters.
- **Backtracking is both optional and sometimes forced.** Optional: side rooms with chests, skill-tree upgrades, Journal entries, optional bosses. Forced: some main-path gates need something found elsewhere (a key from a vault, an ability or weapon earned later, the companion). Rule for forced trips: the way back is never the same walk twice. Something has changed (new enemies, a collapsed floor, a shortcut that opens from the far side), and fast travel cuts out any stretch with nothing new.
- **No level selector until the main story is beaten.** Story opens with Continue, which drops you at your last checkpoint. The star chart and chapter list come back as a post-game chapter select. Internal launch functions stay for the level tester and debug jumps.
- **Fast travel.** Travel points you unlock by reaching them, used from a map. Between worlds, a canon-fitting form (to decide: the ship/fracture system in `smb-progression.js` may already be the fit).

Impact to handle:
- **Existing saves.** Players partway through the story need a starting place: put them at the realm (or plain chapter) that holds their next uncleared chapter. Their per-chapter progress is unchanged.
- **Chapters that aren't walkable** (arena duels, boss arenas, cinematic bridges, branch choices) become events at a place in the world: an arena room you walk into, a scene that plays at a spot.
- **Retrying** moves from "replay the chapter" to "back to the last checkpoint". Per-chapter stars only mean something in the post-game select.
- **Skill tree and shop: decided.** The skill tree is in the pause menu (story mode and realms; nodes bought mid-chapter apply on close). The shop is a person in the world: a hooded shopkeeper with a lantern (`npcs: [{ kind: 'shop', x }]` in a realm room), F to trade, a short line when you walk near. Built Nov 15; the story panel's shop and skill tree buttons stay until realms replace the panel. Who the shopkeeper is in canon is still open.

## Fast travel: built (Nov 18)

Decided by the user Nov 18: both forms below, and walking back through each world's left edge still works. `js/story/smb-story-travel.js`, opened from the pause menu's **Travel** button in any story chapter world.

- **Beacons.** Standing at a rest beacon you have lit, travel to any other lit beacon in a chapter you have reached (`_story2.litBeacons`). Same launch as Continue (`cpResume` + `_storyResumeCpFor`): you arrive at the beacon at full health.
- **The fragment's trail.** From anywhere in a chapter world, back up to 10 chapters, never forwards. Canon (settled with the user Nov 18): this is not a law. Kael has no command over law before the anchor at ch144. The fragment remembers the fractures it passed through, and Kael pulls himself back along that trail: the shield's phase displacement stretched over distance, done by someone new at it. So it is unstable: you arrive at 60% health, it needs 4 minutes to settle (`_story2.trailReadyAt`, real time), and 1 time in 5 it slips one walkable chapter further back than you aimed (never forwards).
- **Returning to a beaten chapter** (user, Nov 18: "not the same amount of enemies, but some guarding the place"): the duel is skipped (`_cinReplaySkip`, unchanged) and about a third of the chapter's enemies (at least one) hold their posts as guards, whether or not you killed them before (`smb-story-engine-explore.js`, `_expBeaten`).
- Blocked: inside a side room, during an arena-lock fight, with an enemy within 520 px, or outside a chapter world.

Tested headless Nov 18: beacon list and trail list built from the save, beacon travel from ch13 to ch3 beacon 2 landed at x 4517 at full health, trail from ch3 landed in ch2 at 83/138 HP with the 4-minute wait set.

## Retrofit: chapters 1-50 (Nov 18)

The user's order Nov 18: apply the God of War project to chapters 1-50 (ids 0-49). `js/smb-realm-regions.js` adds one realm side area to every chapter in that range with a walkable world: 37 chapters (the 5 that already had a dungeon keep it: ch9, 29, 40, 42, 47). Chapters 14-17, 21, 24, 31 and 37 (ids 13-16, 20, 23, 30, 36) have no walkable world (duel arenas, the assassination, the 900 px defense decks, the branch choice) and get nothing.

**Relics: the reason to go back.** Three relics, each at the end of a required dungeon, kept in the story save (`_story2.relics`, any chapter can read it). Seam doors (a tear in the air, art `seam`) only open for the relic they need, and most of them are in chapters you have already passed, so the relic tells you where they were and fast travel takes you back.

| Relic | Found | Opens seam pockets in |
|---|---|---|
| Veran's seam key | ch13 Veran's Workshop (id 12), required | ch2, 4, 6, 8 (ids 1, 3, 5, 7) |
| Collector coil | ch26 Collector Node (id 25), required | ch11, 18, 19, 22, 25 (ids 10, 17, 18, 21, 24) |
| Core resonator | ch38 Resonance Chamber (id 37), required | ch30, 32, 34, 39, 45 (ids 29, 31, 33, 38, 44) |

The three relic dungeons hold the chapter exit until the relic is found (`exitNeeds: 'relic:<id>'`). Escape chapters (ch4, 19, 39, 45) only have seam pockets, so their side room is a return trip, not a break in the chase.

**Optional side areas (20):** ch1 Yard Cellar (teaches F, chests, breakable walls), ch3 Garage (block and plate; shopkeeper), ch5 Water Tower (lift), ch7 Collapsed Subway (crumbling platform, dark tunnel), ch10 Archive Stacks (timed plate), ch12 Relay Substation (power lever, lift, guards), ch20 Mirror Gallery (two blocks, two bars, your reflection), ch23 Void Shelf (movers over a gap, crumbles), ch27 Under the Stands (jailers, an unbouted champion), ch28 Mark Chamber (crack, crumbles, timed plate), ch33 Flux Vault (three updrafts), ch35 Storm Cellar (dark, pendulums), ch36 Eye Annex (two plates at once, keepers), ch41 Sanctum Undergrowth (roots, powered lift), ch43 Frozen Cave (thin ice, geyser; shopkeeper), ch44 Summit Hut, ch46 Engine Underside (stone and lever, timed plate), ch48 Outer Ring Armory, ch49 Threshold Vault (stone, lever, timer, the Herald's Shade), ch50 Anchor Cellar (dark). The Collector Node's coil room has the third new shopkeeper.

**Engine additions** (smb-realm.js): `_realmNeedMet` (a needs string can be `relic:<id>`), chests that give `relic:<id>`, door arts `seam`, `cellar` and `cave`, lifts with `when` + `shuttle` (wait at the bottom until powered, then shuttle), and a realm that follows the segment you stand in on the Multiversal Core one-map region (ids 32-35, 24000 px).

**Tested headless Nov 18:** every area's entrance opens from its chapter world and every room loads (screenshots). Key-driven probes on the real controls: all 8 updraft climbs, all 5 lifts, the 6 block-and-plate puzzles and the 2 timed runs reach their targets. The level tester got `--relics` and learned ledges (lifts and updrafts), plate-powered vents and lifts, relic chests, and cracks in the way of a target.

**Level tester, Nov 18** (cascade pilot, Normal, 1 attempt each, `--optional --relics --progress=data/level-test/normal-full-nov1/results.json`, out `data/level-test/gow-retrofit-nov18b`): 11 of 37 cleared. The pilot solved every required relic dungeon (ch13 workshop, ch38 resonance chamber all three rooms) and walked the puzzles in the Garage, Mirror Gallery, Eye Annex, Threshold Vault, Storm Cellar, Sanctum Undergrowth and Frozen Cave. 15 losses happened on the main path before the pilot reached any side door (Nov 1 cleared the same chapters), so the main-path difficulty for the bot has drifted since Nov 1 independent of this work; one visible cause is that `--progress` now yields 8-13 skill nodes by these chapters where Nov 1 had up to 28. 10 losses included side-room fights, mostly the elite guardians (Your Reflection, Crucible Remnant, Eye Keeper, Herald's Shade): a death in a side room costs a chapter life, same rule as the approved dungeons. One stall fixed (ch12 substation door sat under a 210 px conduit the pilot climbed; moved to x 1050) and 14 doors moved clear of low ledges and crates.

## Fast travel: proposal (Nov 18, superseded by "Fast travel: built" above)

What it is for: getting back to an optional dungeon you walked past, without replaying the walk. Two candidate forms checked against what exists:

1. **Beacons (recommended).** The rest beacons are already the game's checkpoints, and since Nov 17 the last one you light is saved and Continue resumes there. Fast travel = every beacon you have lit stays lit; from the pause menu, a map lists them by chapter, and choosing one launches that chapter at that beacon (the same path Continue uses, `cpResume` + `_storyResumeCpFor`). In-world: the fragment pulls you along the fracture between two places it has already touched; chapter 57 already says "The fragment can navigate it." Limits that keep the design rules: only beacons you lit yourself, only in chapters you have reached, so it never works as a level select before the ending. Build cost: a per-chapter list of lit beacons in the save (today only the last one is kept), a pause-menu list, and the launch call. About a day.
2. **The Axiom Ship (smb-progression.js).** The ship-parts and fracture-branch system already "travels", but it is Axiom's ship and a separate mode for multiverse branch runs; making it Kael's travel would bend canon and tie fast travel to collecting ship parts.

Open question either way: whether travel to a chapter you have already beaten replays its fights (enemies back, as backtracking "has changed") or walks an empty world. The plan's rule for forced trips ("never the same walk twice") suggests enemies come back.

## Vertical slice: one realm, two dungeons

| Step | Work | Estimate |
|---|---|---|
| 1 | Realm layer: room graph, doors between rooms, room-bounded camera, realm save state, one hub room | 1 week |
| 2 | Dungeon parts: lift the BR temple/office pieces into shared parts (door, plate, lever, key, breakable wall, chest, lift, trap). Room data format. Designer saves rooms. Puzzle checker | 1 week |
| 3 | Dungeon 1 (about 8-10 rooms, 2-3 puzzles, mini-boss), built and played by the user | 1 week |
| 4 | Upgrade loop: dungeon loot feeds the existing skill tree plus weapon upgrades; a shop in the hub | 3-4 days |
| 5 | Dungeon 2 with a boss, the story act threaded through the realm, companion lines while walking | 1-1.5 weeks |

Slice total: about 4-5 weeks (was 6-8 before counting the skill tree and BR parts as reuse). The full expansion: about 4-5 months (was ~7).

What the tools don't shrink: the user playing each dungeon and giving a verdict. In past work, getting from first version to approval took about 3x the first build, and that loop is human time. The other part that doesn't shrink is fitting the existing 186 chapters into realms, if we choose to do that.

## Status

**Nov 17 (night):** checkpoint resume built. Continue now drops a returning player at the last rest beacon they lit in the chapter they left (the save already kept `cpResume`; Continue used to discard it), skipping the narration they already saw, at full HP. Fixed on the way: after any resume (Retry or Continue) a death respawned you at the level start, because the beacon was pre-marked as lit and never set the respawn point. Browser-tested on chapter 9: beacon at x 1500 saved, page reloaded, Continue landed at 1500, a fall respawned by the beacon.

**Nov 16 (night):** step 2's room editor is built: the realm studio in the workbench (`?wb=realm`, see tools/workbench/README.md). Optional dungeons now in ch9, ch42, ch47, ch97 and ch99 (ch29 added Nov 17).

**Nov 16 (later):** Continue entry built. Until the last chapter is cleared, the story panel's first card is Continue (one click into `_story2.chapter`; a first visit still gets the prologue and difficulty pick) and the story window shows a progress panel in place of the star chart (`storyChapterSelectUnlocked` in smb-story-config.js). The chart returns as chapter select after the ending, and always for dev-role accounts and developer-key holders. Existing saves continue from their furthest chapter. Fast travel is not built; checkpoint resume was built Nov 17.

**Nov 16:** step 2's puzzle parts built and used in the second dungeon (the Memory Vault, above); step 2's room editor is not built. Awaiting the user's playtest of the facility, the Trial Wing, the ch71 Axiom encounter and the vault.

**Step 1 built (Nov 15 2026), awaiting the user's playtest.** `js/smb-realm.js`, opened from the home list as "Realm" (Preview). Test realm "The Old Ruins": Courtyard (hub), Collapsed Hall (east), Undercroft (below, through a hole in the hall floor; ladder back up), Inner Shrine (background, through an archway). Door kinds: edge, arch (F), drop, fall. Checkpoint doors, deadly pits (spikes) vs drop holes (glow), chests (heal or weapon), minimap of visited rooms, save per account (`unlocks.realm`). Console `realmReset()` starts over. Rooms are data in `REALM_DEFS`, the format step 2's room editor will write.

Defaults used for the open decisions: new act after the ending (not wired into the story yet), ruins first, death returns to the last checkpoint door, companion fights and talks only.

## Decisions needed before step 1

1. **New act or retrofit?** Build the realm as a new story act after the current ending (fastest, nothing breaks), or rebuild existing acts into realms (about 4-6 extra weeks, touches the chapter id invariants).
2. **Which realm first?** It should be a place that wants to be a dungeon: candidates include the underground/sewer worlds, the ruins, or a God-era temple.
3. **Death and checkpoints in dungeons:** restart the room, or the last checkpoint door?
4. **Does the companion solve puzzles** (God of War style: shoot the far switch, hold a plate) or only fight and talk?
