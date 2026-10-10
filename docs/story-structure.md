# STORY STRUCTURE

## ACT FLOW

ACT I — Home Collapse
ACT II — Fracture Network
ACT III — Architects
ACT IV — War & Betrayal
ACT V — Stickman Universe
ACT V.5 — Fallen God Trial (unlocks after Act V; gates the full revelation before Creator domain)
ACT VI — Multiverse Exploration (optional depth; does not gate Act V.5 or Creator)
ACT VII — Creator Domain
ACT VIII — TRUE FORM (FINAL)

---

## CRITICAL ORDER

1. Player enters system
2. Learns about fragment
3. Meets Architects
4. Betrayal happens
5. Enters Creator domain
6. Defeats Creator shell
7. True Form emerges
8. Final fight = True Form
9. System stabilizes

THEN (before Creator domain):
10. Fallen God appears — narrates full truth (allies, war, Axiom transformation, Paradox error)
11. Creator domain opens
12. True Form is final

---

## MULTIVERSE RULE

Multiverse is NOT:
❌ a separate menu
❌ a side mode

Multiverse IS:
✅ how the player progresses
✅ where missions take place
✅ integrated into story

---

## MENU STRUCTURE (CORRECT)

Story Mode
 └── Chapters (0 → 84)
      └── Includes multiverse travel

NOT:
❌ Story Mode
❌ Multiverse Mode (separate)

---

## COMMON ERRORS TO PREVENT

- Linking post-story chapters into main story
- Allowing chapter skips that break progression
- Misplacing Fallen God before True Form
## AUTHORED LEVEL MAPS (`STORY_LEVELS`)

Walkable chapters (walk→fight duels and every exploration mode) build their
world in `_launchExplorationChapter`. Without an authored map, the world is a
seeded corridor with the chapter arena's 900px backdrop mirrored across it, so
nothing on screen says where the chapter takes place. A chapter with an entry in
`STORY_LEVELS` (core + helpers in `js/story/smb-story-levels.js`, one file per
chapter in `js/story/levels/chNN.js`) replaces that with an authored map:

| Hook | Runs | Purpose |
|------|------|---------|
| `layout(worldLen)` | world build | Platforms added on the floor; replaces the random plateaus. Use `_slLedge` (one-way top) for props drawn behind fighters, `_slBlock` (solid) only for in-lane obstacles like a building you climb. |
| `floor(worldLen)` | world build | Optional floor segments at different heights (not for walk→fight worlds, whose slabs carry the cache shafts). First segment must sit at y=440. |
| `backdrop(v)` | drawBackground | Far parallax layers instead of the mirrored theme panels. Fill above y=0 with `_slSkyAbove` if the level climbs. |
| `back(v)` | drawBackground | World-anchored set pieces behind fighters. |
| `surface(v, a, ph)` | twice | Floor top face (`ph='back'`, before props) and lip/slab face (`ph='front'`, after platforms). `_slSurfaces` handles zones of asphalt/sidewalk/roof/tile/etc. at every floor height. |

| `floor(worldLen)` on a non-earth walkFight world | world build | Works for lava/void/space worlds (ch10 uses it for five decks over a lava field); earth-style worlds still get shaft slabs and ignore it. Walkable worlds are always >= 6000px (`Math.max(worldLength, 6000)`). |
| `exploreProps` | world build | Props merged into the explore arena. Hazards are not inherited from the chapter's theme arena, so a lava level sets `{ hasLava, lavaY, deathY, noVoidFog }` here. `pickSafeSpawn` keeps spawns 120px above `lavaY`, so decks at y=440 need `lavaY >= 562`. |
| `startX` | world build | Spawn x. Without it `pickSafeSpawn` picks a raised ledge near the camera (ch10 started on the crane arm). |
| `loot(segLen)` | world build | Optional extras: `[{ id, x, y, tier, contents, guards:[{x, floorY, elite:true, name, weaponKey, classKey, health}] }]`, keyed `'<chId>:x<id>'`. An `elite` guard is a full-strength `isChestGuardian` that holds its post and unlocks the chest when it falls; chest guardians are exempt from `storyLevelClearBlocker`, so the exit never waits on it. `_slStashPlats` / `_slStashLoot` (smb-story-levels.js) build the standard two-step ledge stash and its entry (used by ch2, 6, 10, 29, 40, 43, 66, 87, 97, 101, 129). |

Mode objects authored in chapter data are placed to match the map: chapter 5's
`scavengeItemDefs` sit on climb spots, chapter 9's `puzzleSwitchDefs` are out
of spatial order on purpose. Single jump ≈ 214px, double ≈ 337px; keep required
steps ≤ 120px so every climb works without double jump.

**One-map regions** (`STORY_REGIONS`: 32–35, 11–12, 42–43, 94–95; e.g. 32–35 is one 24000px
world) use the same entries: the explore arena carries `storyRegion`
(`[{ id, off, len }]`), and `_storyRegionCall` draws each visible segment's
level translated by `off` and clipped to its span, against a shim arena whose
platforms are shifted to local coordinates. Region levels must therefore read
geometry from the `a` argument (`_slPlat(a, tag)`), never `currentArena`. The
segment under the camera owns the sky. Non-walkFight explore worlds clamp the
left edge at x=450 (`mapLeft = GAME_W/2`) — keep the first post/obstacle well
right of it.

## PLAYABLE BEATS ON BRANCH CHAPTERS (`beat`)

A `type: 'branch'` chapter is narration plus a choice. It can also carry
`beat: { ... }`, an overlay of ordinary chapter fields (`walkFight` / `type:
'exploration'` + `exploreMode` / a plain duel with `opponentName`, `spawnEnemies`,
`fightScript`, `arena`, ...) that plays between the narration and the choice, so
the chapter is not text alone. `_playChapterBeat` (smb-story-engine-flow.js) runs it
through the normal launchers as a derived chapter with the real chapter's id;
`story2OnMatchEnd` hands a win back to the branch flow instead of the victory
screen, and the real chapter still completes after the choice. A lost beat uses
the normal retry screen and re-enters the real chapter without replaying the
narration.

| Field | Meaning |
|-------|---------|
| `afterNarrative: [...]` | Optional. Second half of a narration split around the beat (nothing is dropped; the scene spec continues from where the first half ended). |
| `beat.levelId` | Borrow another chapter's `STORY_LEVELS` map (e.g. 181 for the Trial Ground arena, 66 for the lab corridor). |
| `beat.beatScale` | 0..1 trims the beat enemies' health and damage (duels). |
| `beat.spawnEnemies[].isWeak` | Existing flag: roughly half-strength fodder. |

Exploration beats get no generic checkpoint waves, pressure stalkers or idle ambushes
(a `defense` beat keeps its wave; a `walkFight` keeps its one duel). The Reckonings
film (`STORY_CINEMATIC_RUNS`) plays beats and `afterNarrative` inline. Chapters 166,
170 and 171 (around the Absolute Axiom fight) deliberately have no beat.
