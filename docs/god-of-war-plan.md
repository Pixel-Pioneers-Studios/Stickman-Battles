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

## Decisions needed before step 1

1. **New act or retrofit?** Build the realm as a new story act after the current ending (fastest, nothing breaks), or rebuild existing acts into realms (about 4-6 extra weeks, touches the chapter id invariants).
2. **Which realm first?** It should be a place that wants to be a dungeon: candidates include the underground/sewer worlds, the ruins, or a God-era temple.
3. **Death and checkpoints in dungeons:** restart the room, or the last checkpoint door?
4. **Does the companion solve puzzles** (God of War style: shoot the far switch, hold a plate) or only fight and talk?
