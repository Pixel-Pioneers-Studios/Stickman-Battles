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
| **Sense** | invisible opponent + lantern reveal sweep | **Yes — ch106 "The Unseen Pattern"** (Null Space) |
| **Self-knowledge** | copy replays your inputs on a delay | **Yes — ch117 "Thirty-Four Frames"** (Fracture Coast) |
| **Control** | gravity / controls invert on a readable tell | **Yes — ch121 "Shockwave Hold"** (was ch119; +2 from the insertions) |

All three are placed and browser-verified. The registry is now
**186 chapters, ids 0–185**.

**Session 2 (Sep 6).** Three further commits on `main`, still nothing pushed:

| Commit | What |
|---|---|
| `c547ae8` | Trials: Sense and Self-knowledge placed, mirror playback fixed, invisibility leak closed |
| `cee0148` | `STORY_SCENE_SPECS` realigned with the chapters they were authored for |
| `9d2bce7` | Sovereign counter-pick / domain-retreat tuning + domain hazard knockback — **not authored or playtested in this session**, it arrived in the working tree from another session and was committed on request |

Working tree is clean. Registry verifies `total 186 range 0-185 dups 0 gaps 0`,
all 199 js files pass `node --check`, and eslint on the changed files reports
only the documented pre-existing findings.

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

`TRIAL_MIRROR_DELAY = 34` frames. The copy replays the player's inputs mirrored
on a delay, and takes the player's weapon at arm time (see Part 4B — a chapter
cannot author that, because the player brings their own loadout).

Recording and playback both run once per frame from `updateTrials()`, so the tape
self-limits at the delay length and index 0 slides forward at exactly one frame
per frame. **Do not move playback back into `Fighter.updateAI`** — that is the
15x-too-slow bug fixed in `c547ae8` (landmine 5). Attacks fire on the *rising
edge* of the taped `atk` flag, which is true for every frame of a swing.

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

### A. Place the sense and self-knowledge trials — **DONE**

Both inserted as new chapters immediately before their companion duel, so each
trial gates the fight it belongs to:

- **ch106 "The Unseen Pattern"** — Null Space, `arena: 'void'`, before Null
  (now ch107). Null removes the one channel all 847 of its catalogued fighters
  relied on. `playerCaps: { weapon: 'lantern', noAbility: false }`.
- **ch117 "Thirty-Four Frames"** — Fracture Coast, `arena: 'underwater'`, before
  VAEL (now ch118). VAEL stops looking forward and plays back Kael's own last
  half-second instead.

Both are **plain arena duels, deliberately not walkFight**. The lantern sweep is
tuned to a 900px arena, and the mirror copy reflects about the arena — in a
3000px explore world the sweep is narrower than the space it has to search and
the reflection stops reading as one. Do not convert these to walkFight.

ch105 / ch115 were left alone, as the previous session concluded — their
`branchPrompt` narrative is the *setup* for these two trials.

The renumber that followed, all applied and verified:

| Step | Result |
|---|---|
| `id:` shift across `js/story/acts/` (old 106–115 → +1, old 116–183 → +2) | 20 files |
| `chapterRange:` in `smb-story-finalize.js` | 34 arcs, tile 0–185 contiguously |
| `PROTOTYPE_WAVE_CHAPTERS` 127 → 129 | `smb-story-config.js` |
| `getWorldForChapter` `id < 120/180` → `122/182` | `smb-story-config.js` |
| `STORY_SCENE_SPECS` keys (see landmine 7) | 66 keys shifted |
| Save migration `_migrateStory2TrialChapters` | `smb-story-config.js`, runs after the Thresh one |
| Registry contiguity | `total 186 range 0-185 dups 0 gaps 0` |

`STORY_REGIONS` needed no change (chapters 32–35, all below the shift) and the
saga bounds are arc-keyed as documented.

**The save migration is a two-step shift, not a range shift.** Two separate
insertion points mean it is not expressible the way `_migrateStory2ThreshArc`
does it. It also shifts **`lootTaken`**, which is keyed `'chapterId:index'` —
the Thresh migration does not, so one-time pickups were left on the wrong
chapters by that earlier renumber. Unit-checked:

```
{chapter:130, defeated:[100,105,106,115,116,120,183], lootTaken:{'105:0','116:2','50:1'}}
  → {chapter:132, defeated:[100,105,107,116,118,122,185], lootTaken:{'105:0','118:2','50:1'}}
```

### B. Polish the two unplaced mechanics — mirror **DONE**, stalker still open

- **Trial 3's per-AI-tick playback is fixed.** `trialMirrorAI` was dispatched
  from `Fighter.updateAI`, which runs once every `AI_TICK_INTERVAL` (15) frames,
  while `trialMirrorRecord` recorded every frame — so the copy consumed one tape
  frame per 15 recorded and played back at 1/15 speed. It is now driven
  per-frame from `updateTrials()`; `updateAI` only suppresses the normal brain.
  Attacks fire on the **rising edge** of the taped `atk` flag, because `atk` is
  true for every frame of the player's swing and a per-frame read would spam
  `attack()` for the whole swing. Measured after the fix: best-fit lag 38 frames
  and **140 distinct copy velocities over 201 frames** (≈14 before).
- **The copy now takes the player's weapon** (`_trialApplyPending`). A chapter
  cannot author this — the player brings whatever loadout they picked in the
  menu, so the authored `weaponKey: 'sword'` meant the "copy" replayed your
  inputs through a different weapon's reach and timing. Observed live: player on
  `hammer`, copy on `sword`. Colour is deliberately **not** copied — two
  identically coloured fighters running the same inputs cannot be told apart.
- **The stalker's whiff rate is still unmeasured against a real player, and
  no human has played any of the three trials yet.** ~2
  strikes per 18s, both whiffing against a scripted idle target, is exactly the
  case the `Fighter.attack()` AI whiff-guard is tuned to veto. Still needs a
  human playtest, not a scripted one.

### C. What is actually left

**Needs a human, not a script.**

- **Nobody has played any of the three Trials.** They arm, render and behave
  correctly, and that is all that has been established. Whether the sweep's ~22%
  uptime is readable, whether 34 frames is the right mirror delay, and whether
  the control tells land mid-fight are all open questions.
- **The stalker's whiff rate**, as above — a scripted idle target cannot answer
  it, because that is the case the whiff-guard is tuned against.
- **The Sovereign tuning in `9d2bce7` is unverified.** It passes `node --check`
  and eslint and nothing more. It is counter-pick and retreat behaviour, which
  can only be judged by watching a fight.

**Content work.**

- **47 narrated chapters have no scene spec** (landmine 7). Act-style fallback
  covers them, but it is generic.
- **Nexus Defense** and the reframed Battle Royale ("the field is the 94 prior
  bearers") — approved in `docs/TRIALS_DESIGN.md`, unbuilt.
- `docs/SAGA_SPLIT_PLAN.md` **Phase 4, the cold opens** — still the only content
  work blocking three standalone saga builds.
- "What is the thing Kael needs?" is still undecided, and still only matters if
  the Fourth Architect gatekeeper framing is revived. The scatter approach that
  shipped does not need it.

---

## Part 5 — Landmines found in session 2

### 7. `STORY_SCENE_SPECS` is keyed by chapter id — **found here, fixed in `cee0148`**

`js/smb-story-scenes.js` sets `S[<chapterId>]` and `smb-story-narrative-scene.js`
looks specs up as `STORY_SCENE_SPECS[chapter.id]` — a **hard id dependency the
first handoff did not list**. Anything that renumbers chapters must shift these.

It had already drifted badly before this session: only **10 of 66** specs were
still on the chapter they were authored for, and **25 were sitting on chapters
with no `narrative` at all**, doing nothing. `S[116]` was a "True Form" spec
staging the VAEL chapter; the "Titan King" lava spec was on "Into the Flux".

**How it was repaired, in case it ever drifts again.** Every spec is preceded by
a comment header naming the chapter it was authored for, so the specs were
re-keyed by matching that title against the registry, with *"does the target
chapter have a `narrative` array"* as the tiebreak. That tiebreak matters — two
different chapters are titled "The Architecture", and it caught the false match.
Note the headers use both `—` and `:` as separators; a regex that assumes one
silently mis-pairs the specs that use the other.

What made the result trustworthy rather than 66 lucky guesses: it is a
**bijection** (66 headers, 66 specs, 66 distinct targets, nothing unresolved) and
it is **strictly monotonic**, with drift in clean plateaus of 0, +4, +7, +11 and
+32/+33 — the signature of successive insertions. Title matching independently
recovering a monotonic step function across 66 entries is not a coincidence.

    on their authored chapter   10/66 -> 66/66
    on a narrated chapter       41/66 -> 65/66

The one spec still on a non-narrated chapter is `S[3]`, which never moved and was
already like that. No spec *content* was edited — only keys and headers.

**Still open, and it is content work, not a bug:** 112 chapters carry a
`narrative` array and only 65 have staging, so **47 narrated chapters have no
scene spec**. They fall back to act style, which renders correctly (verified on
ch13 "Resonance") but is generic.

### 8. Invisibility leaked through `AdaptiveAI.draw()`

The Trial of Sense opponent is an `expert` story enemy, which the Lever-2 story
scaling promotes to `AdaptiveAI`. `AdaptiveAI.draw()` paints its aura **before**
`super.draw()` and its `◈ ADAPTING` label **after** — both outside
`Fighter.draw()`, where the invisibility check lives. The invisible opponent was
therefore broadcasting its exact position through an orange glow and a floating
label every frame, which defeats the entire trial. Caught only by looking at a
screenshot; every state assertion passed.

This is the **same class of bug as the floating nameplate** the previous session
fixed. The lesson generalises: `_trialInvisible` only suppresses the body, so
**anything drawn outside `Fighter.draw()` that is positioned on a fighter leaks
position.** `SovereignMK2.draw()` has more of these (intimidation tether, anchor
flash) — harmless today because Sovereign is never a trial opponent, but it is
the next thing to break if that ever changes.

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

Session 2 bumped the 30 files of the Trials batch to `?v=4.1.19`, and
`smb-story-scenes.js` to `?v=4.1.20` with the spec realignment. Tags remain mixed
below that. Bump the files you touch; verify with
`grep -oE '\?v=[0-9.]+' index.html | sort | uniq -c`.
