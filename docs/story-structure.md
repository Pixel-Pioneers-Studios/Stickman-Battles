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

Mode objects authored in chapter data are placed to match the map: chapter 5's
`scavengeItemDefs` sit on climb spots, chapter 9's `puzzleSwitchDefs` are out
of spatial order on purpose. Single jump ≈ 214px, double ≈ 337px; keep required
steps ≤ 120px so every climb works without double jump.

**One-map regions** (`STORY_REGIONS`, e.g. chapters 32–35 as one 24000px
world) use the same entries: the explore arena carries `storyRegion`
(`[{ id, off, len }]`), and `_storyRegionCall` draws each visible segment's
level translated by `off` and clipped to its span, against a shim arena whose
platforms are shifted to local coordinates. Region levels must therefore read
geometry from the `a` argument (`_slPlat(a, tag)`), never `currentArena`. The
segment under the camera owns the sky. Non-walkFight explore worlds clamp the
left edge at x=450 (`mapLeft = GAME_W/2`) — keep the first post/obstacle well
right of it.
