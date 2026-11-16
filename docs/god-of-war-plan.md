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
- Closed gates also hold the player on the near side every frame: Q/E move scenes set position directly and skip collision, and the brain lunged through the door at the guard before this. Pre-existing, not from this work: ch67's floor has 20 px steps (x 900, x 2000) that must be jumped, and walk-fight chapters' timed fight lines play while you walk (including inside rooms).

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

**Step 1 built (Nov 15 2026), awaiting the user's playtest.** `js/smb-realm.js`, opened from the home list as "Realm" (Preview). Test realm "The Old Ruins": Courtyard (hub), Collapsed Hall (east), Undercroft (below, through a hole in the hall floor; ladder back up), Inner Shrine (background, through an archway). Door kinds: edge, arch (F), drop, fall. Checkpoint doors, deadly pits (spikes) vs drop holes (glow), chests (heal or weapon), minimap of visited rooms, save per account (`unlocks.realm`). Console `realmReset()` starts over. Rooms are data in `REALM_DEFS`, the format step 2's room editor will write.

Defaults used for the open decisions: new act after the ending (not wired into the story yet), ruins first, death returns to the last checkpoint door, companion fights and talks only.

## Decisions needed before step 1

1. **New act or retrofit?** Build the realm as a new story act after the current ending (fastest, nothing breaks), or rebuild existing acts into realms (about 4-6 extra weeks, touches the chapter id invariants).
2. **Which realm first?** It should be a place that wants to be a dungeon: candidates include the underground/sewer worlds, the ruins, or a God-era temple.
3. **Death and checkpoints in dungeons:** restart the room, or the last checkpoint door?
4. **Does the companion solve puzzles** (God of War style: shoot the far switch, hold a plate) or only fight and talk?
