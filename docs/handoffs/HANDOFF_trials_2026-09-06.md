# Handoff — The Trials + arena identity pass (Sep 5–6 2026)

**Read this first if you are picking up the Trials.** Everything below is
committed on `main` and **nothing is pushed**.

| Commit | What |
|---|---|
| `2b359bd` | Arena identity pass, saga split mechanism, launch packaging (46 files, 7,694 insertions) |
| `753e272` | The Trials — all three mechanics, `js/smb-trials.js` |
| `f5e8e8d` | Frame-accurate trial arming + Trial of Control placed on ch119 |

Working tree is clean. Registry verified `total 184 range 0-183 dups 0 gaps 0`.
All 199 js files pass `node --check`. `npx eslint` on the changed files is clean
(the only findings anywhere are the documented pre-existing ones —
`screenShakeIntensity` in engine-events/engine-flow, duplicate `style` keys in
act1-arc1 / act2-arc1, and findings in `server.js` / `tools/`).

---

## Status at a glance

| Trial | Mechanic | Placed on a chapter? |
|---|---|---|
| **Control** | gravity / controls invert on a readable tell | **Yes — ch119 "Shockwave Hold"**, verified in-chapter |
| **Sense** | invisible opponent + lantern reveal sweep | No — built and verified in isolation |
| **Self-knowledge** | copy replays your inputs on a delay | No — built and verified in isolation |

---

## Part 1 — What shipped in the arena pass (`2b359bd`)

Context, because it explains a lot of the current visual state.

The one-map / walkFight conversion was discarding every chapter's authored
`arena:` field: `_launchExplorationChapter` built a synthetic
`ARENAS['__explore__']` and pointed `selectedArena` at it. All 55 walkFight
chapters carried an `arena:` (23 distinct themes), none overrode the palette,
and none set `style` — so **every walk-fight level in the game rendered the same
fallback navy sky and the same generic city tiles**.

Now the explore arena inherits `sky`/`groundColor`/`platColor`/`platEdge` and
carries the source key as `themeKey`; `_drawArenaThemeArt(key)` is split out of
`drawBackground` so an explore world can render another arena's bespoke art, in
**viewport space at 0.28 parallax** (not tiled in world space — 900px art in a
6000px world is the mismatch that broke the boundary portals). Odd panels mirror
so art meets itself at every seam, and 44px is cropped from each panel side
because enclosed arenas draw hard boundary walls at their own map edges.

**33 distinct themes now render across 59 explore chapters, up from one.**
Measured *faster* than the path it replaced (3.1ms vs 5.7ms on suburb).

Eight orphan arenas that no chapter referenced were placed: `suburb`(ch2),
`portalEdge`(17), `desert`(50), `rural`(52), `megacity`(64), `realmEntry`(90),
`bossSanctum`(101), `colosseum10`(129).

---

## Part 2 — The Trials, as built

Spec: `docs/TRIALS_DESIGN.md`. Implementation: **`js/smb-trials.js`** (new file,
loaded after `smb-minigames.js` in `index.html`).

Everything is opt-in per chapter and inert otherwise — with `trialActive` null,
every update/draw entry point returns on its first line.

### Trial 1 — Sense

- **The lantern** — `WEAPONS.lantern` at `js/smb-data-weapons.js:640`. Normal
  attack and super; its `ability` deals no damage and calls
  `trialLanternSweep()` (`smb-trials.js:54`).
- **Tuning is anchored to arena width, not the clock.** 400px/s leading edge,
  0.75s gap → ~300px band, crosses the 900px arena in ~2.2s, ~22% uptime against
  the 600-frame cooldown. The doc's original 3s gap makes the band wider than
  the map and stops being a sweep at all.
- **The band shows distortions in space, not the opponent.** Crossing a body
  stamps ONE echo at that moment's position, held 3s — the information is
  time-stamped and stale the instant you have it.
- **Three cues stay visible** while the body does not: weapon arc on a swing,
  footfall dust on landing, hit reaction when the player connects.
- **Invisibility** skips the draw (`smb-fighter.js:4331`) and keeps the hitbox.
  The floating nameplate is suppressed separately at
  `js/rendering/smb-drawing-arenas.js:3909` — it is drawn *outside*
  `Fighter.draw()`, and a marker over an invisible body is the wallhack the
  sweep exists not to be.
- **The stalker** — `trialStalkAI()` (`smb-trials.js:319`), dispatched from
  `Fighter.updateAI` at `smb-fighter.js:3807`. Approach → one strike → retreat →
  reposition. Navigation is delegated to the engine platform graph via
  `_trialNavigateTo()` (`smb-trials.js:287`).

### Trial 2 — Control

`startTrialControl()` / `updateTrialControl()` / `drawTrialControlTell()`.
Horizontal violet bands = gravity about to flip; vertical amber = controls.
Distinct per axis so the player learns *which* rule is changing, not only that
one is. Reuses `tfGravityInverted` / `tfControlsInverted`.

### Trial 3 — Self-knowledge

`TRIAL_MIRROR_DELAY = 34` frames (`smb-trials.js:502`). The copy replays the
player's inputs mirrored on a delay. **Functional but coarse** — it samples at
the AI tick, so the copy is choppier than intended.

### Wiring

A chapter arms a trial with `trial: 'sense' | 'control' | 'selfknowledge'`, and
forces a loadout through the existing `playerCaps` path (no new flag needed):

```js
trial: 'sense',
playerCaps: { weapon: 'lantern', noAbility: false },
```

`_storyArmTrial(ch)` (`smb-story-engine-flow.js:507`) sets `trialPending`;
`_trialApplyPending()` (`smb-trials.js:535`) applies it on the first frame the
real fighters exist. Hooked at both launch sites —
`smb-story-engine-flow.js:902` (arena duel) and
`smb-story-engine-explore.js:728` (walkFight / exploration).

---

## Part 3 — Landmines found (do not rediscover these)

### 1. Branch chapters can carry player choices

**This is the one that cost the most.** ch105 "The Pattern Gap" (Null) and ch115
"The Blind Spot" (VAEL) are the perfect thematic homes for the sense and
self-knowledge trials — Null cannot model Kael, VAEL cannot see him — and both
are `type: 'branch'` with no fight, so adding a trial *looks* purely additive
and avoids the id shift.

**They are not.** Both carry `branchPrompt` and a `choices` array with flags
(`null_asked_name`). Converting them destroys interactive content. The
conversion was made and then reverted.

**19 files under `js/story/acts/` contain `branchPrompt`.** Grep for
`branchPrompt` / `choices` before touching any branch chapter.

### 2. Pathfinding waypoints could never advance while grounded

`pfGetNextWaypoint` (`js/smb-pathfinding.js:557`) compared the bot's
**mid-height** to a node's `y`, which is the platform **surface**
(`surfY = pl.y` in `buildPlatformGraph`). Standing on a platform that gap is
always `h/2` — **42 for the current 84px fighter, against a tolerance of 38**.
The node pointer could never advance, so a bot walked to the first node of its
path and stopped there.

Fixed to compare the bot's feet to the surface. The h=62→84 minion change is
what pushed it over the threshold.

**Do not overclaim this.** In a plain local ruins match, normal bots had
`_pfPath === null` — they were not on that code path at all. It is provably
correct and it is what made the trial stalker navigable; it is not established
that it fixed all bot AI. Regression-checked: a normal bot over 24.5s had 0
deaths and never approached the death plane.

### 3. Applying anything on a timer races `startGame()`

A 120ms hook set its flags on the **previous match's** fighter objects —
`players[]` is rebuilt a few frames after `startGame()` returns, and the
readiness check passed on the stale array. `_storySpawnMiniBoss`'s retry budget
does not protect against this either; it guards against *earliness*, not
*staleness*. Fixed with a pending-request applied from the game loop.

### 4. `_expandStoryChaptersInPlace` silently drops unknown fields

`trial` and `playerCaps` were dropped on any chapter not already in the "stay
intact" list — the same failure as the v3.9.18 `bossType`/`type` bug, and just
as silent. Trial chapters now stay intact via `origCh.trial`
(`smb-story-engine-data.js:96`), with the fields also carried through
`_phaseToChapter` as a backstop (`:77`).

### 5. `AI_TICK_INTERVAL` is 15

`updateAI` runs once every 15 frames, so any timer decremented inside it is in
**ticks, not frames**. Author durations in frames and convert. Friction also
eats `vx` between ticks: setting 4.4 once per 15 frames yields ~1.8px/frame
effective, which is why the stalker needs 7.6 authored to actually close.

### 6. Misc

- `trialOnly: true` on a WEAPONS entry keeps it out of `WEAPON_KEYS` (random
  rolls, chaos, battle royale, training). `_WEAPON_CARD_DATA` in
  `smb-menu-ui.js` is hand-curated, so a new weapon does *not* appear in the
  menu grid on its own.
- `drawTrials()` runs inside the world transform — UI text needs
  `ctx.setTransform(1,0,0,1,0,0)` or it lands off-camera.
- Additive (`lighter`) reveal residue stacks to solid white if more than one
  echo lands on one body. Capped to one echo per body.
- The control trial arms where `players.length === 1` (wave defence: the enemies
  are minions). Only `sense`/`selfknowledge` require a foe.

---

## Part 4 — What is left

### A. Place the sense and self-knowledge trials

The user chose **"scatter across companion worlds"**. Control is done (ch119).
The other two need **new chapters inserted**, which shifts ids. Full checklist:

1. Insert the chapters. Suggested homes, immediately *before* each companion
   duel so the trial gates it:
   - Null Space — Trial of **Sense** before ch106 "Null". Flat floor arena
     (`void` works, and is that world's theme).
   - Fracture Coast — Trial of **Self-knowledge** before ch116 "VAEL"
     (`underwater`).
   - Leave ch105 / ch115 alone. Their narrative is the *setup* for these.
2. Renumber `id:` across `js/story/acts/`. With 2 insertions the mapping is
   old `106..115` → +1, old `116..183` → +2.
3. Update **34** `chapterRange:` values in `js/story/smb-story-finalize.js`.
4. Write the save migration. Pattern:
   `_migrateStory2ThreshArc` at `js/story/smb-story-config.js:1033`, with a new
   `p.migrations.<name>` key.
5. Update the hardcoded id literals:
   - `PROTOTYPE_WAVE_CHAPTERS = new Set([47, 52, 127])` —
     `smb-story-config.js:569` (note: known dead code, but keep it honest).
   - `id < 120` / `id < 180` — `smb-story-config.js:1554-1555`.
   - `STORY_REGIONS` — `smb-story-engine-explore.js:385`.
6. Re-verify contiguity (recipe in `docs/SAGA_SPLIT_PLAN.md`) — expect
   `total 186 range 0-185 dups 0 gaps 0`.
7. Saga bounds in `js/story/smb-saga-structure.js` are **arc-keyed** and need no
   change. Do not key anything new on chapter numbers.

### B. Polish the two unplaced mechanics

- **Trial 3's mirror samples at the AI tick**, so the copy is choppy. It needs
  to consume the tape per-frame rather than per-AI-tick.
- **The stalker fires ~2 strikes per 18s and both whiffed** against an idle
  player, with `adxMin` down to 23 (right on top of them). The AI whiff-guard in
  `Fighter.attack()` is the likely vetoer. Needs a real playtest, not a scripted
  one — a scripted idle target is exactly the case the whiff-guard is tuned
  against.

### C. Still open from the design doc

- What is the thing Kael needs? Undecided. Only matters if the gauntlet framing
  (Fourth Architect gatekeeper) is ever revived — the scatter approach does not
  need it.
- Nexus Defense and the reframed Battle Royale ("the field is the 94 prior
  bearers") are approved in the doc but unbuilt.

### D. Unrelated but pending

`docs/SAGA_SPLIT_PLAN.md` Phase 4 — the cold opens — is still the only content
work blocking three standalone saga builds.

---

## Verification recipes used

```bash
# syntax, all files
for f in $(find js -name '*.js'); do node --check "$f" || echo "FAIL: $f"; done

# registry contiguity
node -e '
const fs=require("fs"),path=require("path");
function walk(d){let o=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?o=o.concat(walk(p)):e.name.endsWith(".js")&&o.push(p);}return o;}
let ids=[];for(const f of walk("js/story/acts")){for(const m of fs.readFileSync(f,"utf8").matchAll(/^\s*id:\s*(\d+),/gm))ids.push(+m[1]);}
ids.sort((a,b)=>a-b);const dup=[...new Set(ids.filter((v,i)=>ids[i+1]===v))];let g=[];
for(let i=0;i<=ids.at(-1);i++)if(!ids.includes(i))g.push(i);
console.log("total",ids.length,"range",ids[0]+"-"+ids.at(-1),"dups",dup.length,"gaps",g.length);'

# lint just what you touched — `npm run check` on the whole repo OOMs
npx eslint js/smb-trials.js js/story/smb-story-engine-data.js
```

**Arming a trial by hand in the browser console** (for testing without a
chapter — note `startGame()` rebuilds `players[]`, so arm in a *separate* eval
after it, never in a `setTimeout` from the same one):

```js
selectedArena='grass'; gameMode='local'; startGame();
// ...then, separately:
const p1=players[0], foe=players[1];
p1.weapon=WEAPONS.lantern; p1.weaponKey='lantern'; p1._storyNoAbility=false; p1.abilityCooldown=0;
foe._trialInvisible=true; foe._trialStalker=true; foe._trialLastHp=foe.health; foe.isAI=true;
trialActive='sense';
trialLanternSweep(p1);
```

To hold a sweep at a readable radius for a screenshot, pin `s.r` from a rAF loop
— but do **not** clear `s.seen`, or it re-stamps an echo every frame and the
additive residue blows out to solid white.

## Cache-busting

Current tags are mixed `4.1.0`–`4.1.18`. Bump the files you touch; verify with
`grep -oE '\?v=[0-9.]+' index.html | sort | uniq -c`.
