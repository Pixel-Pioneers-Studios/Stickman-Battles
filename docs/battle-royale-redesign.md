# Battle Royale — Map & Loadout Redesign

Supersedes item #6 in `worklist-sep13-2026.md`. Raises that item from **4/10 to 8/10**:
the fall-death problem is a fairness bug, not a polish item.

---

## The real problem with the current map

`_makeBRArena()` (`js/smb-battleroyale.js:115`) builds a **9000 × 2800 vertical shaft**:
30 tiers of floating platforms, **no `isFloor` platform anywhere**, and
`BR_DEATH_Y = 2800`. So the map has no ground — it is 2800px of open air with ledges in it.

That is the unfairness directly: one knockback at tier 4 is a **2400px uninterrupted
fall to death**, with no recovery, no ledge to catch, and no counterplay. It is also
why the mode reads as random — placement is decided by who got hit near a gap, not by
who fought better.

It compounds every other BR bug too: the vertical zone axis (`brZoneTop`/`brZoneBottom`)
only exists because the map is vertical, and the vertical drop is why bots scatter so
far from the camera that the sleep-culling bug (#2) ever triggers.

---

## New map: a continuous world of base-game landmarks

**Core rule: there is always ground under you.** An unbroken `isFloor` platform spans
the entire world. Knockback can cost you position, HP, and a fight — it can never cost
you the match outright. Falling deaths come only from deliberately entering a hazard
(the volcano's lava, the cave's lower shaft), which the player chose to walk into for
better loot.

### Dimensions

| | Current | New |
|---|---|---|
| World width | 9000 | **12000** |
| World height | 2800 (open air) | **~1400** (ground at y≈900, verticality above and below it) |
| Floor | none | **continuous `isFloor` across all 12000px** |
| Death | void at y>2800 | hazard-local only (lava, cave shaft) |
| Zone axis | horizontal + vertical | **horizontal-dominant**, light vertical trim |

### Landmark bands

The world is a left-to-right sequence of biome bands drawn from the base-game `ARENAS`
(not story arenas). Plains is the connective tissue; the named landmarks are the
destinations. A proposed layout (12 bands, widths in px):

| x range | Landmark | Source arena | Danger | Loot |
|---|---|---|---|---|
| 0–1100 | Outskirts | `grass` | — | low |
| 1100–2100 | **The City** | `city` | low | medium |
| 2100–3000 | Plains | `grass` | — | low |
| 3000–4200 | **The Caverns** | `cave` | high (crystals, stalactite drops, lower shaft) | **high** |
| 4200–5100 | Dunes | `desert` | — | low |
| 5100–6300 | **The Volcano** | `volcano` | **highest** (lava pools, eruptions) | **highest** |
| 6300–7200 | Plains | `grass` | — | low |
| 7200–8300 | **The Ruins** | `ruins` | medium | medium-high |
| 8300–9200 | Frostline | `ice` | medium (slippery) | medium |
| 9200–10300 | **Neon Sector** | `cyberpunk` | medium | medium-high |
| 10300–11200 | Plains | `grass` | — | low |
| 11200–12000 | **The Colosseum** | `colosseum` | high (open, no cover) | high |

Bands are data, not code — a `BR_LANDMARKS` table of
`{ x, w, themeKey, danger, lootDensity, rarityBias, platforms, hazards }`. Reordering
or reseeding the world becomes a one-line change.

### Rendering the bands

This does **not** need new art. `_drawExploreThemeArt()`
(`js/rendering/smb-drawing-bg.js:158`) already solves the hard problem — it draws a
900×520 authored arena backdrop across a multi-thousand-pixel world, in viewport space
with parallax, mirrored panels at the seams, and a floor-line match so the art's
horizon lands on the world's floor.

The BR version is that function with the theme key resolved **per band from the camera's
world X** instead of from one `a.themeKey`, plus a cross-fade over ~250px at each seam so
the desert doesn't hard-cut into the volcano. Everything else — the panel tiler, the
clipping, the floor match — is reused as-is.

Per-band platform layout and hazards come from the band table, so the cave genuinely has
stalactites and a descending shaft, and the volcano genuinely has lava.

**One thing that needs building:** `hasLava` / `lavaY` is a single global lava plane for
the whole arena (`js/smb-menu-spawn.js:112`, `js/smb-loop-core.js:238`). A volcano band
needs *localized* lava, so BR needs a small per-band hazard-rect system rather than the
arena-wide flag. This is the only genuinely new mechanic in the map work.

---

## Loot: risk-tiered

Today `BR_LOOT_POOL` is a flat 6-entry array with no rarity at all — every chest
anywhere rolls the same odds. Replace with rarity tiers, and let each band bias the roll:

| Tier | Colour | Contents |
|---|---|---|
| Common | grey | medkit (light), basic weapons |
| Uncommon | green | shield, mid weapons |
| Rare | blue | full medkit, strong weapons |
| Epic | purple | super charge, top-tier weapons |
| Legendary | gold | signature weapons, multi-effect items |

Band `rarityBias` shifts the roll and `lootDensity` sets chests-per-1000px. Plains and
the suburb-tier areas get thin common/uncommon loot; the volcano and caverns get dense
rolls weighted to rare/epic/legendary. The trade the player makes is explicit: better
gear, but the hazard can kill you and so can the four other people who went there.

This also gives the storm somewhere to push people *toward* rather than just inward.

---

## Loadout: class chosen, weapon earned

Confirmed already in the game — no new weapon needed. `WEAPONS.combat` is the bare-fists
brawler ("Fast alternating punches and kicks. Up-close brawler. Damage: 11"), and
`CLASSES.pugilist` already uses it.

- The player picks a **class** at the BR menu (existing class select, existing perks/HP).
- Everyone — player and all 99 bots — drops with `weaponKey = 'combat'` and nothing else.
- Weapons are looted. Drop-in fights are now genuine unarmed scrambles, which makes the
  first 30 seconds about positioning rather than about who rolled a good spawn weapon.

Code impact is small: `_brSpawnBots()` currently rolls a random `WEAPON_KEYS` entry per
bot (`js/smb-battleroyale.js:262`) — that becomes `'combat'`. `selectBRSlot()` assumes
the player always has an equipped weapon to swap out, which stays true (fists are a
weapon), so the swap path needs no change. Add a rule that `combat` never drops as loot
and never swaps back in from a chest.

---

## What this does to the other BR bugs

- **#2 (invincible slept bots):** still a real bug and still needs the timer fix, but a
  shallow horizontal world means bots cluster near the camera far more often, so the
  cull triggers less and the endgame converges naturally.
- **#5 (final-stage teleport):** mostly unnecessary once the world is horizontal — a
  closing horizontal ring on a continuous floor forces contact on its own. I'd build the
  map first and only add the pull if it still stalls.
- **#3 (strobing):** unaffected, independent fix.

---

## Open questions for you

1. **Landmark set** — the twelve above are my picks for visual distinctiveness. Want
   `mushroom`, `haunted`, `underwater`, or `megacity` swapped in for any of them?
2. **Vertical space** — do you want the cave/volcano to descend *below* the main ground
   line (a real underground layer you drop into), or stay at surface level with
   verticality only going up? Below-ground is more interesting and more work.
3. **Plane drop** — with a horizontal map the drop is a straight fall onto a landmark,
   which is fine. Keep the plane, or switch to a Fortnite-style glide where you steer
   during descent?

---

## Build order for BR

1. `BR_LANDMARKS` table + new `_makeBRArena()` with a continuous floor (kills the
   fall-death problem on its own, even before any art).
2. Slept-bot timer fix (#2) and global-juice scoping (#3) — both independent, both blockers.
3. Per-band theme rendering + seam cross-fade.
4. Per-band hazard rects (volcano lava, cave shaft).
5. Loot rarity tiers + per-band bias.
6. Class-select + fists-only start.

---

## BUILD STATUS — Sep 13 2026

Shipped in this pass. Browser-verified headless (puppeteer, 1200x700) at every
landmark plus a full match to a winner.

| Item | State |
|---|---|
| `BR_LANDMARKS` table + banded `_makeBRArena()` | **done** — 12000x1600, continuous floor |
| Cave shaft + underground cavern | **done** — drops 350px onto the cavern floor, 4-ledge climb out |
| Per-band backdrop rendering + seam haze | **done** — `_drawBRBandArt()` in smb-drawing-bg.js |
| Per-band hazard rects (volcano lava) | **done** — `_brUpdateHazards` / `_brDrawHazards` |
| Loot rarity tiers + per-band density/bias | **done** — 5 tiers, budget split by landmark weight |
| Fists-only start (`WEAPONS.combat`) | **done** — player and all 99 bots |
| Horizontal zone, final ring on a named landmark | **done** — generated per match, nesting asserted |
| #2 slept-bot invincibility | **done** — `_brDormantTick()` |
| #3 global impact-juice strobe | **done** — scoped to local-player hits in BR |
| #5 final-stage teleport | **not needed so far** — the horizontal ring converges on its own |

### Measured

- **Storm now eliminates.** With the ring slammed shut, the field goes
  97 → 87 → 79 → 11 → 4 → **1 survivor**, and the match ends with a winner and an
  achievement. Before the fix, slept bots were permanently immune and the field
  never dropped.
- **Slept bots are mortal.** Sampled `invincible` on sleeping bots reads 0-14 and
  counts down; it used to freeze at 16 forever.
- **Strobe gone.** 0 hitstop frames out of 2901 rendered, across 55,313 damage
  calls — i.e. the ~41 damage events per frame the bot field generates no longer
  touch the global freeze at all. Previously every one of them could set it.

### Incidental fixes found while building

- `initBattleRoyale()` never set `currentArenaKey`, so `drawBackground` painted
  **whatever arena was loaded last** across the whole BR world (observed: forest
  trees over the plains). Now set to `'battleroyale'`, which matches no drawer.
- `drawPlatforms()` ignored a per-platform `color`, always using
  `currentArena.platColor`. No authored arena sets one, so nothing else changes —
  but without it every band in BR rendered in grass green.
- The BR camera centred on the fighter, which spent the bottom ~40% of the screen
  on solid dirt once the world had a floor. Lifted 80px.

### Known rough edges

- Lava pools draw as hard-edged rects with a visible glow block above them.
  Readable, not pretty.
- City/Neon tower ledges line up at the same heights across a band, so they read
  as continuous scaffolding rather than separate buildings.
- Ice is visually distinct but not actually slippery — no per-band friction yet.
- Still open from the design: whether to swap any landmarks, and whether the plane
  drop should become a steerable glide. Defaults were taken to keep moving.


---

# PASS 2 — Sep 13 2026 (layered world, storm rework, The Sewer)

## The teleport bug — found, and it was not a teleport

**Reported:** "I randomly teleport back for no reason, to the start of the map.
I died from the storm."

Reproduced, then traced with a property trap on `players[0].x`. There is **no
mid-game teleport** — a deliberate late drop holds its position for the whole
match (measured: dropped at x=5802, still 5803 sixty seconds later). The bug is
entirely in the drop:

- The drop check was a **level** test on `keysDown`, so the SPACE that launched
  the match was still held on the plane's first frame and consumed as the jump.
- The plane starts at **x = -300**, off the world. Dropping on frame one put the
  player at x≈-315, the world clamp parked them at **x = 0**, and they landed at
  the extreme left of a 12000px map.

So you never chose to jump, you arrived at the start of the map, and the ring
then closed somewhere else and killed you. Fixed with an edge-trigger latch
(`brDropKeyReleased`) plus a "plane must be over the map" gate and a clamp on the
drop position.

## Startup lag — 3fps to 60fps

`_brCullBots` explicitly forced every falling bot awake so gravity could land it.
Every bot starts at the plane, which is also where the camera is, so **nothing was
culled during the drop** and all 99 ran full `Fighter.update()` at once.

Two fixes: bots still ON the plane skip their update entirely (`_brUpdatePlane`
writes their position directly), and bots falling off-camera get a cheap fall
integrator in `_brDormantTick` instead of full physics. Measured across the whole
drop phase: **locked 60fps, was ~3fps.**

## The storm is now aggressive and unpredictable

- Ring timings are **generated per match**, not fixed. Waits run ~15s down to ~4s
  and shrink as the field thins; the old fixed 30s/10s metronome let players park.
- The ring **wanders** on its way in rather than homing at the final centre, so
  reading phase 1 tells you little about phase 6. Drift shrinks as the ring does,
  so the last two phases are honest.
- **Storm surges**: during a wait the ring can lurch inward early, eating 22% of
  the remaining gap over 1.5s. Telegraphed 1.8s ahead with a HUD warning — a
  reaction test, not an ambush.
- Damage ramp steepened (1.5^phase → 1.75^phase, exposure cap 3x → 4x).
- Every ring is still clamped inside its predecessor, so the sequence is provably
  nested and you are never stranded with nowhere legal to walk.

## Hand-authored, layered map

Platform generation is gone. Every platform is placed by hand in `BR_LANDMARKS`
and checked at build time by **`_brValidateReach()`**, which flags any platform
more than a single jump (175px, against the real 197px apex) above anything it
overlaps. It caught one stranded ledge on the first run; the map now reports
**zero unreachable platforms**, which is the direct answer to "some boxes can't be
reached". The city went from ~16 generated ledges to **6 authored ones**.

Three layers, separated by more than the double-jump reach (~370px) so a layer
change is a route rather than a hop:

| Layer | Y | Contents |
|---|---|---|
| Sky | 180–420 | **Cloud Kingdom** — rift-only entry, leave by stepping off |
| Surface | 900 | 11 landmark bands |
| Underground | 1000–1500 | **Caverns** under the plains → **Tunnel** under the desert → **Volcano Depths** |

- The **cave is under the plains**, entered through two authored sinkholes cut in
  the surface crust. The drop is 526px — you cannot climb back out where you fell
  in; there is an authored 4-ledge climb under the left sinkhole.
- The **volcano extends downward** through a vent into the Depths: the best loot
  in the world, over the most lava, furthest from any exit.
- **Rifts** (4 pairs) are the only way into the sky, the fast way out of the deep,
  and the only way to cross the map faster than the storm. Per-fighter cooldown
  stops a pair being ridden in a loop.
- **Wildlife** (2 beasts, 1 yeti) lives in the dangerous bands. They are excluded
  from `brAlive`, from placement and from the win check via `_brIsContender`, so
  ignoring them is always a legal way to play.

## Incidental fixes

- `Fighter.update`'s godmode free-flight clamped y to `GAME_H + 100` (620), which
  in a 1900-tall world pinned a flying player to the sky and made the underground
  unreachable. Now reads `currentArena.mapBottom`.
- Band art is clipped per layer; the sky band and the surface band beneath it were
  painting over each other (observed: the Ruins' backdrop across the Cloud Kingdom).
- `brLandmarkAt` takes a Y now — three layers overlap in X, so X alone can no
  longer identify a band.

---

# The Sewer — a new arena

`js/smb-sewer.js` + the `sewer` entry in `ARENAS`. Selectable from the arena
dropdown and in the menu rotation.

**The ground is not ground.** The floor is flowing sewage, which is a hazard;
you fight on trash barges that drift downstream and wrap around. Position is
never something you hold, only something you keep re-earning.

- **Barges carry their riders.** Moving a platform without moving whoever stands
  on it reads as ice, not as motion — the carry is what sells it. Verified: rider
  and barge both moved 69px, in sync.
- **Falling in is survivable but expensive.** The sewage burns on a timer, sweeps
  you downstream, damps your control, and bobs you back toward the surface so
  going under is never an instant loss. Verified: 312px swept and 20 HP lost over
  2 seconds, still alive.
- **The background moves**: a scrolling brick vault with per-row parallax, outfall
  pipes pouring into the flow, two wave trains at different speeds, debris rafts
  and surfacing bubbles.
- Follows the arena-art standard from the Maps V2 pass: bespoke drawer wired into
  `_drawArenaThemeArt`, **not** in `ARENA_DEPTH` (its crest hairline reads as a
  stray pale line over bespoke art), and nothing drawn below the floor line and
  then covered — the flow IS the bottom of the world, drawn after the platforms.

### One bug this arena exposed

`drawStageBoundary()` derives the stage's kill boundary from the union of
`isFloor` platforms. The Sewer's only `isFloor` is a drifting 210px barge (it
needs one, or `pickSafeSpawn()` returns null and every respawn crashes), so the
"stage" was the barge, every fighter was permanently inside the 210px ring-out
warning, and the screen sat under a **full-strength red alarm flare for the entire
match**. Added an opt-out flag (`noStageBoundary`) for arenas where the floor edge
is not the kill boundary.

### Rebuilt — Sep 13 2026 (pass 3)

The first build was platforms-in-a-sewer. It is now a river of waste.

- **No platforms.** Every standable thing is a raft of garbage floating IN the
  sewage, drawn as a heap whose body runs from its deck down through the
  waterline. Nothing hangs in the air. The fixed wall walkways are gone too.
- **One current.** Every raft, every wave train and every piece of loose scum
  moves off the same `sewerScroll` at `flowSpeed`. Measured: all 8 rafts moved
  exactly 63px over 60 frames, one unique speed.
- **Spawning behind you.** Rafts that pass downstream are re-shaped and re-seated
  at the head of the queue with a randomised gap, and the pool is topped back up
  to 8, so the river never runs out of ground and never loses its `isFloor`.
- **Falling in is escapable.** This was the reported bug — "I fell into the
  sewage, I was stuck, I couldn't get out". Three causes, all fixed:
  1. Rafts had solid sides, so a swimmer swept into one was walled out. They are
     `passUnder` now: you rise through and land on top.
  2. There was no way to swim. Jump is a stroke now (bots always stroke).
  3. The stroke was gated on being *under* the surface, so it cut out the instant
     your feet breached — 40px short of any deck. The swim band now extends 52px
     above the waterline, and a deck rides ~40px clear of it, so one stroke from
     the surface lands you on a raft. The burn no longer cancels an upward climb
     either; it costs health, not progress. Measured: out of the water and
     standing on a raft in 110 frames (~1.8s), 17 HP.

### Camera-stress failsafe

Two players sprinting to opposite ends is the standard way to grief a scrolling
arena. Past a **sustained** 1500px spread (2 full seconds — a knockback that
flings someone across the map is not griefing), the river closes the gap itself:
unoccupied rafts BETWEEN the two fighters sink and are gone, and rafts BEHIND the
field accelerate 3.1x to carry the straggler forward. Hysteresis releases at
1050.

Deliberately far outside honest play, and verified as such:

| Scenario | Result |
|---|---|
| 30s of real 2P play | **never armed** (max spread reached 1447) |
| Fighters pinned at x=30 and x=1700 | armed at frame 119, middle rafts sank (1 left) |
| Grief released | stress cleared, 8 rafts, `isFloor` intact |

### Known rough edges

- The outfall pours are narrow and fading now, but still read as columns more
  than as falling water.
- The arena is 1800 wide, so a far-apart 2P fight zooms the camera out a long
  way before the failsafe's 1500 threshold is reached.
- Ice in BR is visually distinct but not actually slippery (no per-band friction).
- Lava pools still draw as hard-edged rects with a glow block above them.


---

# PASS 4 — Sep 13 2026 (storm tuning, rifts, BR interruptions, camera)

## Storm toned down

It was punishing rather than tense. Pauses now run ~22s down to ~9s (was 15s down
to 4s) with a slower close, so you can actually cross a landmark while it shuts.
Damage ramp `1.75^phase → 1.45^phase` and the exposure cap `4x → 3x`: clipping a
corner of the storm to reach loot is survivable again, while the late ring is
still a wall. Surges are rarer (~1 per 20s of waiting, never before phase 1),
telegraphed longer (2.5s), and take a smaller bite (22% → 13%). The variance
stays — the point was always that the rhythm is unreadable, not that it is brutal.

## Rifts you can actually find

A gate is ~34px in a 12000px world. Each rift now has a **column of light** that
reads from off-screen, a ground pool, a white-cored tear with a coloured glow,
orbiting motes so it looks active, a `RIFT — SKY` style label, and a marker on
the minimap. The beacon is what you navigate toward; the ellipse is just where
you arrive.

## No interruptions in Battle Royale

- **Miniboss phase cinematics are skipped** (`triggerPhaseTransition` returns
  early in BR). A beast or yeti hitting half health froze all 100 fighters and
  the closing storm for several seconds because someone three landmarks away
  chipped it. Their phase *stats* still apply — only the cutscene is skipped.
- **Finishers are off entirely.** Limiting them to the local player's own kills
  was not enough: a finisher takes over the stage and freezes the world, and in a
  match with a closing ring that is several seconds of standing still — it gets
  you killed for winning a fight.

## Camera

Rebuilt around a containment solver, with a 15-scenario stress harness. Full
writeup in **[camera.md](camera.md)**; the short version is that the old wide-arena
path computed zoom from the pair's bounding box and then deliberately slid the
centre onto one human, so the second player left the frame while the zoom was
already wide enough to hold them both. Zoom and centre are solved together now.

`node tools/camera-stress.js` — **all 15 scenarios pass**. The reported case (2P
sewer, players 1480 units apart) now frames both at zoom 0.52.

## The sewer jump — my bug

"Sometimes the jumps are normal, and sometimes it feels like gravity increased
heavily and you jump way less high."

Raft decks ride ~40px above the waterline, and the swim-stroke band extends 52px
above it so a swimmer can finish the climb onto a deck. Those overlap — so a
fighter **standing on a low raft** was inside the swim band, and pressing jump
gave them the stroke (`vy = -8.2`) instead of a real jump (`vy = -16`). That is a
52px hop instead of a 197px one, and only on the low rafts, which is exactly the
"sometimes" in the report. Landing on anything now ends the swim outright, and
the stroke only assists a fighter who was in the water within the last 26 frames.
Measured after the fix: 214px rise from a low raft — a full normal jump.

---

# Pass 2 — pacing, bots, achievements (Sep 14 2026)

## The storm is roughly half as fast

The old ring was a forced march: ~22s of breathing room at the start falling to
~9s by the last phase, with a 10s close on top. You were always running and never
playing, so the match was decided by rotation timing rather than by fights.

| | Before | After |
|---|---|---|
| Phase wait | 1320 → 700 frames | 2600 → 1700 frames |
| Close length | 600 → 390 frames | 980 → 720 frames |
| Full match | ~3 min | ~6 min |
| Damage per tick | 3 × 1.45^phase | 2 × 1.30^phase |
| Exposure ramp | +18%/s, cap 3× | +11%/s, cap 2.5× |
| Surge bite | 13% of the gap | 7% of the gap, from phase 2, ~1 per 45s |

The damage curve matters as much as the timing. At 1.45^phase, dipping a corner
of the storm to reach a chest was priced out of the game; at 1.30 it is a real
decision with a real cost.

## No domain expansions in Battle Royale

`Fighter.activateSuper()` suppresses the every-fifth-super domain upgrade while
`brActive`. A domain is duel-scale furniture — it freezes the field, reframes the
camera and rewrites the arena — and none of that survives a 12000px world, a
closing ring and 99 other fighters. The super itself still fires.

## Three bugs that made every bot look stupid

All three were generic AI reading **screen** constants as **world** constants.

1. `updateAI()`'s edge clamp tested `this.x + this.w > GAME_W - 50`. GAME_W is
   900. In a 12000px world every bot past x=850 permanently believed it was
   pinned against the right wall and had its rightward velocity zeroed on every
   AI tick. **The entire field could only ever walk left.**
2. `executeUtilityAI()`'s `towardEdge` guard had the same test, blocking chases
   for the same reason.
3. `isEdgeDanger()` fell back to `this.y + this.h < GAME_H + 40` — 520 in a
   1900-tall world.

Fixed with `Fighter._aiWorldBounds()` / `_aiSafeCenterX()`, which read
`currentArena.worldWidth` / `mapLeft` / `mapRight` / `mapBottom` — the same
source `Fighter.update()`'s own clamp already used. Every wide arena benefits,
not only BR: the sewer (worldWidth 1800) and the story explore worlds had it too.

## The bot brain

`_brUpdateBots()` is a small scored utility brain now, re-evaluated per bot on a
staggered 12-frame schedule. It writes either a destination or a real enemy into
`bot.target` and leaves the moment-to-moment fighting to `Fighter.updateAI()`.

- **Storm, predictively.** Bots plan against the ring they must be inside when
  the *next* close finishes, budgeting travel at 45% of nominal speed (the
  measured rate over real terrain). Reacting to the current ring is why they used
  to die in bulk: by the time the wall is on you, the walk is longer than the
  time left. Weaker bots cling to a fight for longer before breaking off, which
  is how a weaker player dies to the storm.
- **Rifts.** A gate is taken when `walk-to-gate + exit-to-destination` beats
  walking there directly by a clear margin.
- **Fight or decline.** An unarmed bot no longer charges an armed one. The
  engagement test weighs weapon tier, HP ratio, and whether it is already
  committed (recently hurt, or inside 200px).
- **Loot drive scales with need.** Unarmed: 2600px. Bag space or hurt: 1400px.
  Fully kitted: 500px. Chests outside the ring are never targeted.
- **Items, properly.** Medkits are drunk between fights (or below 35% in
  desperation) instead of mid-combo at 40%; shields go up *before* contact;
  supers are saved for a fight already happening; and a weapon in the bag that
  beats the one in hand gets equipped. Bots also no longer trade a legendary for
  the uncommon they walked over ten seconds later — pickup is tier-gated.
- **Travel is its own mode.** `_brNavLock` routes a travelling bot through
  `_brNavStep`, which uses the platform graph (`pfGetNextWaypoint`) so bots climb
  out of the caverns and onto city roofs instead of walking into walls. The
  duelling brain's chase would otherwise walk a straight line at the waypoint and
  play an attack animation on arrival.
- **Faster reactions.** BR bots run `aiTickInterval = 6` instead of 15. Only
  awake bots run a brain at all, so it is affordable, and 15 frames is a whole
  dodge window in this game.
- **Harder field.** Difficulty spread now runs to `expert`
  (20 easy / 35 medium / 30 hard / 15 expert) so the last two rings are dangerous.

## Off-screen bots are no longer furniture

`_brDormantTick` used to integrate a falling bot and nothing else, so a sleeping
bot stood exactly where it landed. Most of the field was *deleted by the storm*
rather than eliminated, and the final ring was whoever happened to drop nearest
it. Dormant bots now pick a destination every 2.5s — the ring first, then the
nearest useful crate within 2200px — walk to it (2.4px/frame browsing, 5.0
running from the wall, which the ring closes at ~3.6), and open crates they pass.

Two rules keep this honest: the crates are the **real** ones, so the map is
genuinely being emptied by ninety-nine people; and a bot only consumes a crate it
would actually be better off for, so the off-screen field stops hoovering once
kitted instead of stripping all 200 chests in the first twenty seconds.

Measured over a full match: chests 200 → ~45 and then flat; ~47 of the field
armed with ~12 holding epic-or-better; storm deaths during the first close
dropped from ~40 to 2.

## Battle Royale achievements

All six are single-match feats, counted in match-scoped state that
`initBattleRoyale()` resets, and shown live on the HUD under the player count
(`⚔ kills  📦 crates  🧭 zones/15`).

| id | Feat |
|---|---|
| `br_victory` | Win a match |
| `br_kills_10` / `br_kills_25` / `br_kills_50` | 10 / 25 / 50 eliminations in one match |
| `br_cartographer` | Stand inside all 15 named landmarks in one match |
| `br_scavenger` | Break 20 crates yourself in one match |

Elimination credit is taken in `dealDamage()` via `_brCreditElimination()`, on the
killing blow. It cannot be a later sweep for corpses: the main loop prunes
`minions` with `minions.filter(m => m.health > 0)` in the draw phase, which runs
*before* `updateBattleRoyale()`, so by the time BR's own update sees the world the
fighter that just died is already gone from the array.

Zone tracking uses strict containment rather than `brLandmarkAt()`, which falls
back to the nearest band in the layer and so would credit the whole sky to Cloud
Kingdom from anywhere above the crust.
