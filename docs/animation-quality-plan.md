# Animation Quality Plan — "Animator vs. Animation" tier

Goal: cinematics, chapter transitions, domain-expansion set-pieces, death/finisher
animation, and the fighter model itself read as *hand-animated*, not as
"parameters lerping over time". Gameplay combat is explicitly **not** in scope for
this bar — it only inherits whatever the shared substrate gives it for free.

Everything below is a PATCH plan. No system is replaced. New behaviour lands in new
files with new load-order slots; existing files gain call sites, not rewrites.

---

## Status — reconciled against shipped code, Sep 7 2026

This plan was written before Phases 0/1/5 landed and before the story figure rig
existed. The "what's wrong" section below is preserved as the original diagnosis;
several of its findings have since been fixed, and **one premise is simply wrong**
(Phase 4 — see the table). Verified by reading source, not by trusting this doc.

**Bottom line after this pass: Phases 0, 1, 2, 3 and 5 are done; Phase 4 is one
beat short of done; Phase 6 is the only phase with real scope left, and its largest
bullet was disproven by measurement.** Three of the plan's original findings were
false (4, 6's first bullet, and 2 by the time it was re-read) — every one of them
would have caused a rebuild of working code. Verify before building.

| Phase | Status | Evidence in the tree |
|---|---|---|
| 0 — shared substrate | **SHIPPED** | `js/smb-anim-core.js` (163L): `animEase`, `AnimSpring`, `animSmear`, `animHold`, `animArc`, `animDust`, `animScuff` all present as specified |
| 1 — death & knockout | **SHIPPED** | `js/smb-death-anim.js` (455L) with `DEATH_BEATS` + `DeathAnim`; `VerletAngleConstraint` now exists in `smb-verlet.js` (13 refs), closing finding 1(b) |
| 2 — player model | **SHIPPED** | Implemented in `js/smb-anim-fighter.js` (184L), loaded at `index.html:1620`. `animIK()` is the law-of-cosines two-bone solve; `animStridePhase()`/`f._fp` is foot planting; `animHeadLag()` overlap/drag; `animHitSquash()` squash & stretch; `animEyeTarget()`/`animBlink()` face and eye tracking; `animCapeDrive()` cape secondary motion (called from `smb-drawing-effects.js:199`); `animSmear` on fast limbs at `smb-fighter.js:4785`; pelvis counter-rotation at `:4475`. Gated by `animHiQ()` on `settings.animQuality !== 'classic'`, exactly as the phase required. `_lj` still exists but is now only the CLASSIC fallback path. |
| 3 — finishers | **COMPLETE** (camera-grammar bullet dropped — see below) | `def.holds` defaults from `def.impact`; automatic anticipation is in as `FIN_ANTIC_FRAMES`/`_finAnticip` (applied in `_finApplyPose`, so no def needed editing); the victim beat track is `_finVictimBeat()`; the death hand-off is the `executeDeath` kind (`smb-death-anim.js:158`). **`def.smear` added Sep 7 2026** — see below. Only the full `_finApplyCam` camera grammar remains. |
| 4 — domain expansion | **PREMISE FALSE — 4 of its 5 beats already exist** | `_tickDomainEntry` (`smb-domain.js:749-1414`) is 665 lines covering all 14 real domains: 49 `CinCam` calls, 27 flashes, 24 shockwaves, 15 background dims, plus a `CinPerf` figure performance with per-domain gestures. Only the "freeze" beat (slowMo + desaturate) is genuinely absent. Do **not** create `js/smb-domain-cinematic.js`. Rewritten below. |
| 5 — chapter transitions | **SHIPPED** | `js/smb-transition.js` (`StoryTransition`); `_storyMarkTransition` (`smb-story-engine-flow.js:165`) now returns act-title-card vs ink-wipe vs seamless, not a boolean |
| 6 — maps & camera | **NOT SHIPPED; first bullet FALSE, widening bullet DISPROVEN by measurement** | The `worldWidth: 900` arenas at `smb-data-arenas.js:664, 675, 686` (`homeAlley`, `suburb`, `rural`) are **deliberate**, not fake-scroll. Each carries a comment: they are contained to the painted art, which is `GAME_W` wide, so the boundary portals frame the visible scene instead of sitting thousands of px out in empty floor. This is the Jul 2026 boundary-portal fix. **Do not "fix" them.** The rest of Phase 6 (launch zoom-out, dynamic framing, parallax in arena backgrounds) is untouched and still stands — but it opens with "measure first", and that measurement has not been done. |

> **Correction, same day.** An earlier pass of this table recorded Phase 2 as NOT
> SHIPPED. That was wrong. It was concluded from `_lj` still being present in
> `smb-fighter.js` and from grepping that file for the phase's *proposed* names
> (`_footPlant`, `animQuality`). The work exists under different names in a
> different file — `js/smb-anim-fighter.js` — and `_lj` survives only as the
> classic fallback. The lesson generalises: **search for what implements the
> behaviour, not for the names the plan guessed it would use.** Phase 3 was
> understated for the same reason.

### Phase 4 — rewritten Sep 7 2026, because the phase as written should not be built

Finding 4 below says `triggerExpansion()` is "fifteen lines", the `announce` field is
"a bare string", and there is "no camera move, no time freeze, no name card
choreography, no cinScript". Measured against the file, that is wrong on nearly
every count. `_tickDomainEntry` (`js/smb-domain.js:749-1414`) is **665 lines** of
per-class entry choreography, and **all 14 real domains have a case** (the 15th
`DOMAIN_DEFS` key, `none`, is a sentinel). Inside it: 49 `CinCam` calls, 27
`CinFX.flash`, 24 shockwaves, 15 `bgContrast` background dims, and a `CinPerf`
figure performance with per-domain gestures and an authored smear window.

Against the phase's own five beats:

| Beat | State |
|---|---|
| 1. Freeze — slowMo 0.05, desaturate, dim all but the owner | **The only genuinely missing piece.** No `slowMotion` write and no desaturation/vignette in the entry; `CinFX.bgContrast` does a background dim, which is adjacent but not the same |
| 2. Anticipation — crouch, inward energy, camera push, ground cracks | Present, per class |
| 3. The gesture — hands snap apart, smear, flash, shake, shockwave | Present — this is what `CinPerf.begin(..., {gesture, smearFrom, smearTo})` drives |
| 4. Barrier closes | Present |
| 5. Name card | Present as `CinFX.nameCard(...)`, plus the domain's real name via `queueAnnouncement(_label + ' — ' + def.name.toUpperCase())` (`:2732`) |

So the correct scope for Phase 4 is **one beat, not a new file**. Do not create
`js/smb-domain-cinematic.js`; do not route `triggerExpansion()` through a new
`cinScript`. If the freeze is wanted, it is an addition to the existing common
setup block at the top of `_tickDomainEntry`, where the camera is already claimed.

**Not a defect, recorded so it is not "fixed":** 13 name cards read `CONVICTION`
and 2 read `DOMAIN EXPANSION`. Both of the latter are Sovereign's. Sovereign is a
separate foundational force in canon and is not part of the Conviction framing, so
the split is characterisation, not drift.

### Phase 6 — the measurement it asked for, done Sep 7 2026 (and it kills the widening bullet)

Phase 6 opens with "Measure first: instrument `updateCamera` for one session and log
clamp frequency per arena. Widening every map costs traversal time for nothing."
That measurement now exists. 24 combat arenas, bot-vs-bot at `hard`, 22s each,
**30,850 sampled frames**. Raw data: `docs/cam-measure-2026-09-07.json`.

| Measure | Result |
|---|---|
| Horizontal clamp frequency | **0.23% of frames on average**, max **2.7%** (grass) |
| Arenas clamping >1% of frames | **one** — grass |
| Arenas with a `worldWidth` at all | **3 of 24** (megacity, warpzone, colosseum10 — all 3600) |
| Clamp on those three wide arenas | **0.0%** |
| Zoom floor reached on the wide three | **0.39 / 0.39 / 0.40** |
| Peak fighter separation there | ~2,320px |

**The "widen 3600 → 4800" bullet is not supported and should be dropped.** The
camera essentially never reaches its horizontal bounds — the thing widening would
relieve is not happening. Widening would only add traversal time, which is exactly
the cost the plan itself warned about.

**What the data does show is the opposite problem.** On the three wide arenas the
camera resolves separation by *zooming out*, not by clamping — down to 0.39, i.e.
fighters rendered at under 40% size, with the pair up to ~2,320px apart. Phase 6's
own bullet "allow the camera to zoom out (rather than clamp) when a fighter is
launched" is therefore already the behaviour, and it is pushed to its floor
(`minZoom = Math.max(0.30, GAME_W / (worldWidth + 200))`, `smb-camera.js:335`).
The legibility problem on wide maps is the zoom-out, so a wider map makes it worse.

By contrast the 21 single-screen arenas never drop below **0.82** zoom. The split is
clean: single-screen arenas are framed fine; the wide ones trade legibility for
containment.

If Phase 6 is picked up, the question worth asking is not "how wide should arenas
be" but "what should the camera do when two fighters are 2,000px apart" — a split
screen, a leash, or an off-screen indicator (`drawEdgeIndicators` already exists in
`smb-menu-utils.js`). That is a design decision, not a tuning one.

**Harness note:** the bot flag is `f.isAI`, not `f.isBot`, and `startGame()`
rebuilds `players[]` after it returns — flagging fighters immediately after the call
is silently discarded. The tell is `sepMean === sepMax` exactly, with the loop
otherwise running normally. The first run of this measurement produced a full clean
table of zeros that way.

### Phase 1 — verified Sep 7 2026 (the verification the plan required and never got)

The plan's non-negotiable step 5 was a before/after `.smbreplay` death comparison.
That is not recoverable now — recording a "before" means reverting shipped code — so
Phase 1 was instead verified directly against its own spec, in a live browser:

| Spec item | Result |
|---|---|
| 1.1 no double corpse | **Pass.** `PlayerRagdoll.collapse(p)` is now only an `else if` fallback at the six `checkDeaths()` sites; `new VerletRagdoll(f)` occurs once, inside DeathAnim's settle hand-off |
| 1.2 joint angle limits | **Pass.** `VerletAngleConstraint` present in `smb-verlet.js` (13 refs) |
| 1.3 three authored beats | **Pass.** A real kill runs `impact → stagger → fall → settle → done` through the game loop |
| 1.4 directional variety | **Pass, all 7 cases.** finisher→`executeDeath`, boss+kb≥10→`voidDeath`, boss+low kb→`crumple`, splash→`blastDeath`, kb≥13→`launchDeath`, chip→`crumple`, no context→`crumple` |
| 1.5 weapon leaves the hand | **Pass.** `DeathAnim._props` gains an entry on every death kind tested |

`executeDeath` correctly skips `stagger`/`fall` — the finisher owns that
presentation, as designed. `landed` is true for `crumple` and false for
`launchDeath`/`blastDeath` within the sample window, consistent with those kinds
arcing away. Repeat `DeathAnim.begin()` on an already-dying fighter is ignored
rather than stacking a second record. Zero page errors across every case.

Visually confirmed: the corpse lies extended on the ground rather than converging
to the curled silhouette that finding 1(a) described.

**Two harness notes**, both of which produced convincing false failures first:
calling `DeathAnim.update()` by hand stalls in `impact` forever, because the beat
requests a hit-stop that only the real loop decrements — drive deaths through
`gameLoop`. And per-hit damage is capped, so `dealDamage(att, tgt, tgt.health + 50)`
does **not** kill; set health low first, then land a normal blow.

### Phase 3 `def.smear` — added Sep 7 2026

`Fighter.draw()` only smears a limb when the state is `attacking`/`ragdoll`/
spinning, and `_finApplyPose` deliberately never writes `attackTimer` — doing so
would re-arm the melee hit-scan and let a finisher damage bystanders. The
consequence was that **the biggest swing in the game was the only swing that never
trailed**. Fixed in the shared layer, so all 29 defs gained it without being edited:

- `_finSmearAt(def, timer)` in `smb-finisher-engine.js` resolves the active smear
  window, defaulting to every `def.swing` window — the same opt-out shape
  `def.holds` uses for `def.impact`. `def.smear` overrides with
  `{at, dur, samples, alpha}`; `def.smear = false` disables it for a finisher whose
  presentation does not want trails (a slow crush, a hold).
- `Fighter.draw()` adds `!!this._finSmear` to `_canSmear` and reads samples/alpha
  from it. The displacement gate drops from 11px to 6px while a finisher owns the
  pose: 11 exists to stop a walk cycle ghosting every step, and a finisher has no
  walk cycle.

Verified by sweeping `_finApplyPose` across all 29 defs' full timelines: every def
gets a smear window, none error, each window matches its swing duration exactly
(sword `swing.dur 16` → 16 smear frames), 513 smear frames total. Default,
`smear:false`, explicit-window, no-swing and post-`_finClearPose` cleanup paths were
each checked individually.

**Camera grammar — this bullet should be DROPPED, not built.** It was first
deferred as "needs visual review"; measurement then settled it. The finisher defs
already own their cameras: **310 `CinCam.` calls across the 8 def files**
(weapon 94, weapon2 80, boss 35, beast 21, tf 20, reality 19, void 19, yeti 18),
driving `slowMo`, `zoomTo`, `focusMidpoint`, `focusOn`, `shake` and `restore` on
authored frame timelines — e.g. `smb-finisher-beast.js` goes 1.15 at frame 0, 1.55
at 38, 1.0 at ~50, 1.3 at 60, `restore()` at 105. `_finApplyHolds` adds the engine's
own hold zoom on top of that.

An automatic `_finApplyCam` that pushes in on anticipation and snaps out on impact
would be a **second writer to the same camera**, on frames the defs are already
driving. That is the "duplicate systems — two systems writing to the same global"
entry in CLAUDE.md's failure table, applied to a load-bearing cinematic path. The
per-def camera work is the feature, not a gap.

With that dropped, **Phase 3 is complete.**

### What shipped that this plan did not anticipate

Phase 2's goals were partly met on the **story-scene** rig instead of the gameplay
rig, via `js/smb-figure-rig.js` (521L) — keyframed `POSES` + `CLIPS` with per-key
easing and holds, which is a stronger substrate than the per-state sine waves Phase 2
assumed it would be patching. It brought overlapping action, squash/stretch, tapered
limbs, feet, contact shadow and rig-sampled smears to all 113 story scenes.

Two consequences for this plan:

- **Finding 3 is resolved twice over.** The plan said "the good rig is already in
  the repo, promote it". Both rigs were instead rebuilt independently: the gameplay
  fighter got `js/smb-anim-fighter.js` (IK, foot planting, overlap, squash), and the
  narrative figure got `js/smb-figure-rig.js` (keyframed poses and clips). They do
  not share code. That is a real duplication to be aware of, but it is duplication
  of *substrate*, not of the old `_drawFigure` gait code the finding was about.
- **The Phase 2 cape bullet is now contradicted.** It calls for porting the bezier
  cape into `drawAccessory`. The cape was subsequently turned **off by default**
  (`SCENE_CAPE_DEFAULT = false`) because it flattened the silhouette on every figure.
  Do not port it without revisiting that decision.

Phase 1's verification bullet — "record a `.smbreplay` before and after and compare
deaths side by side" — was never done. The captures in `replays/` dated 2026-09-06
are boss-tuning runs, not death-animation A/Bs.

---

## What's actually wrong (verified in source, not assumed)

### 1. Death is the worst offender, and it is two bugs stacked

**a) `PlayerRagdoll.collapse()` is not a ragdoll — it's a fixed pose.**
`js/smb-verlet.js:280` sets `stiffness = 0.003`, but `_naturalPose()` still returns a
hardcoded target for the collapsed state (`rArm: 0.88π, lArm: 0.12π, rLeg: 0.74π,
lLeg: 0.26π, head: 0.36·facing, torso: 0.14`). The spring is weak, not absent — so
every single death in the game converges to the *identical curled silhouette*.
That is exactly the "flops over into a ball" the complaint describes. Direction of
the killing blow, weapon, height, velocity: none of it survives into the pose.

**b) A second corpse spawns on top of it.**
`checkDeaths()` pushes a real 14-point `VerletRagdoll` at
`js/rendering/smb-drawing-arenas.js:1283, 1303, 1426, 1454, 1491` *and* calls
`PlayerRagdoll.collapse(p)` — so the limp fighter and the verlet skeleton are both
drawn, overlapping, for ~1.1s. The verlet one is a 2px grey stick figure with no
weapon, no accessories, no class colour weight, and — critically — **no angular
constraints**. `VerletStick.constrain()` only enforces distance
(`js/smb-verlet.js:29`). With 17 distance sticks and zero joint limits, the rig has
nothing stopping a knee from bending backwards through the hip. Seven solver
iterations per frame then compress it into a tangle. A verlet ragdoll without angle
limits *always* balls up; that is the failure mode, not a tuning issue.

**c) There is no death *animation*, only a death *state*.**
No stagger, no knee-buckle, no reach-out, no ground impact beat, no dust, no
settle. `p.invincible = 999` and a `setTimeout(..., 1100)` is the whole thing.

### 2. The fighter model is a 6-DOF hinge rig with fake joints

`Fighter.draw()` (`js/smb-fighter.js:4104`) drives six scalars — `rArm, lArm, rLeg,
lLeg, head, torso`. Elbows and knees come from `_lj()` (`:4207`), which is a midpoint
plus a **constant** perpendicular offset (`elbowOut = f * 5`, `kneeOut`). The bend
never responds to the pose, so limbs read as pre-bent sticks rather than articulated
arms. There is no foot planting (feet slide), no pelvis/shoulder counter-rotation, no
squash/stretch, no overlap or drag on the head, and the only secondary motion is a
`sin()` breath.

### 3. The good rig is already in the repo — in the wrong place

`js/smb-story-narrative-scene.js:548 _drawFigure()` is substantially better than the
gameplay rig: real gait IK with phase-driven knee bend (`_drawGaitLeg`, `:831`),
facial expressions with blink phase-offset per figure, bezier cape simulation,
contact shadow, torso lean per state, rim light. Fourteen named states. **This is the
target quality, and it already exists.** The plan promotes it rather than inventing
a rig.

### 4. Domain expansion has no cutscene

`DomainManager.triggerExpansion()` (`js/smb-domain.js:3323`) is fifteen lines: set
`_domainRising`, `vy = -5`, `screenShake = 14`, push to `_rising`. The `announce`
field on all 15 `DOMAIN_DEFS` entries is a bare string. No camera move, no time
freeze, no name card choreography, no cinScript. Meanwhile `_drawDomainFrame`
(`:1428`) and `_drawDomainSkyEffects` (`:1499`) are genuinely nice — the *sustained*
domain looks good; only the **entry** is missing.

### 5. The cinematic toolkit is good and underused

`cinScript()` (`js/smb-cinematics-core.js`) already supports declarative
`duration / label / slowMo keyframes / cam[zoomTo, focusOn] / steps[at, run, dialogue, fx]`,
plus `CinFX.shockwave/particles`, `CinCam`, `CinTimeline`, world-space ground cracks.
Deaths, domains and chapter transitions don't touch any of it.

### 6. Chapter transitions are a boolean, not an animation

`_storyMarkTransition()` (`js/story/smb-story-engine-flow.js:165`) only chooses
*loading screen* vs *no loading screen* (`window._storySeamlessNext`). There is no
authored transition — no wipe, no ink bleed, no match-cut, no camera hand-off.

### 7. Maps

Only 12 of 31 arenas declare `worldWidth`. Three declare `worldWidth: 900`
(`js/smb-data-arenas.js:664, 675, 686`) — i.e. they claim to scroll and don't. Story
worlds are 5760–5880 wide, standard arenas 3600. Size is **not** the current
bottleneck; camera behaviour is (see Phase 6).

---

## Phase 0 — Shared animation substrate

New file `js/smb-anim-core.js`, loaded **immediately after `js/smb-verlet.js`**
(slot 15 in `index.html`; everything downstream can then use it). Pure functions +
small stateful helpers, no globals mutated.

* **Easing/curve library** — `animEase.{outBack, outElastic, inOutQuint, outExpo, anticipate}`.
  Anticipation and overshoot are the single largest perceptual difference between
  "lerped" and "animated". Nothing in the codebase currently overshoots.
* **`AnimSpring(stiffness, damping)`** — a reusable critically-damped spring class so
  every system stops hand-rolling `vel += (target-cur)*k; vel *= d`.
* **`animSmear(ctx, drawFn, fromX, fromY, toX, toY, samples, alpha)`** — multi-sample
  ghosting for fast motion. This is *the* AvA signature: fast limbs become streaks,
  not blurs. Draw the figure 3–5× along the motion path at falling alpha.
* **`animHold(frames)` / impact-frame helper** — extend the existing `hitStopFrames`
  vocabulary (`js/smb-combat.js:508-519`) into a named "hold on the impact pose" that
  cinematics and finishers can request without touching combat.
* **`animArc(p, from, to, sag)`** — quadratic arc interpolation. Straight-line limb
  travel is the other tell; real animation moves on arcs.
* **`animDust(x, y, dir, count)` / `animScuff()`** — ground contact puffs, routed
  through the existing particle pool (`spawnParticles`).

Deliverable: `node --check js/smb-anim-core.js`, script tag added at `?v=4.0.90`.
Nothing else changes yet — this phase is safe to land and verify alone.

---

## Phase 1 — Death & knockout (highest priority)

This is the user's stated top complaint, and it's the phase with the clearest fix.

New file `js/smb-death-anim.js`, loaded after `js/smb-anim-core.js`.

### 1.1 Kill the double corpse
At all five `checkDeaths()` sites, spawn **one** death entity, not a collapsed fighter
*plus* a verlet skeleton. Keep `VerletRagdoll` alive as a class (it's used by
`smb-loop-core.js:654-658` and the SMK2 training snapshotter) but stop spawning it on
normal death; route through the new `DeathAnim` instead. Patch, don't delete.

### 1.2 Give `VerletRagdoll` joint angle limits
Add a `VerletAngleConstraint(a, pivot, b, minAng, maxAng)` alongside `VerletStick`,
and register limits for: knees (no back-bend), elbows (no back-bend), neck (±70°),
spine (±50°), hips (±110°). Solve them inside the existing 7-iteration loop in
`update()`. This alone stops the tangle. Also raise `lineWidth` to match the fighter's
5–6px, carry `f.color` weight, and draw the head at the fighter's real `headR`, so the
corpse looks like the character that just died rather than a grey twig.

### 1.3 A three-beat authored death, then physics
The AvA read is: **stagger → collapse → settle**, with the physics only taking over
after the authored beats. `DeathAnim` runs a small state machine:

| Beat | Frames | What happens |
|---|---|---|
| `impact` | 0–6 | Hard hold on the hit pose. Screen freezes (`animHold`), white impact flash, radial smear from the blow direction. Camera punches in ~8%. |
| `stagger` | 6–26 | Fighter *takes a step* in the knockback direction, torso folds over the hit point, head lags (overlap), weapon drops from the hand as a separate physics object. Arms reach — not curl. Directional: a head hit snaps the head first, a leg hit buckles that knee. |
| `fall` | 26–48 | Free rotation about the pelvis with arc interpolation, limbs trailing on drag. Squash on ground contact (~1.15× wide, 0.88× tall for 3 frames), dust burst, a small bounce for high-velocity deaths. |
| `settle` | 48+ | Hand off to the constrained verlet ragdoll with the beat-3 exit velocities, so the corpse settles *from where the animation left it* instead of teleporting to a curl. |

### 1.4 Directional + causal variety
Pick the death from context so no two read the same:
`launchDeath` (high `actualKb`, ragdoll spin, off-screen arc), `crumple` (low kb,
chip damage — knees first, slow fold), `blastDeath` (splash/explosive — arms up,
backwards arc), `executeDeath` (finisher kill — no physics, the finisher owns it),
`voidDeath` (boss/TF kills — dissolve rather than fall).
Selected in `DeathAnim.begin(f, ctx)` from `f.vx/vy`, last damage type, and killer.

### 1.5 The weapon must leave the hand
Currently the weapon vanishes with the fighter. Spawn a dropped-weapon entity that
tumbles, lands, and lingers with the corpse. Cheap, and it reads as *consequence*.

---

## Phase 2 — Player model upgrade

Patched into `Fighter.draw()` in `js/smb-fighter.js` and `_naturalPose()` in
`js/smb-verlet.js`. Additive only — every existing pose branch stays.

* **Real 2-bone IK for arms and legs.** Replace `_lj()`'s constant offset with a
  proper two-bone solve: given shoulder, hand target and two bone lengths, compute
  the elbow from the law of cosines with a per-limb bend-direction hint. This is ~20
  lines and immediately makes every existing pose look articulated, because all the
  callers already pass an end-effector position.
* **Foot planting.** Track a planted foot per fighter; while planted, the foot's world
  X is fixed and the leg IK solves *up* to the hip. Feet stop skating — the single
  biggest "cheap animation" tell in the current build.
* **Pelvis/shoulder counter-rotation.** One extra scalar (`_rd.pelvis`) driven off
  `torso` in antiphase. Costs almost nothing, adds a lot of life.
* **Squash & stretch.** A per-fighter `_sq = {x, y}` applied as a `ctx.scale` about the
  feet: stretch on jump launch and fast fall, squash on landing and on taking a heavy
  hit. Drive it from `vy` and from `dealDamage`'s existing `actualKb`.
* **Head/eye tracking.** The narrative rig already has pupils and expressions
  (`smb-story-narrative-scene.js:625-660`). Port that face onto the gameplay fighter,
  with pupils tracking the nearest opponent and expression driven by state
  (`hurt`/`attacking`/`shielding`/low-HP). Currently the gameplay face is static.
* **Overlap & drag.** Head and off-hand lag the torso by 2–3 frames via a short ring
  buffer of past torso angles. Free follow-through.
* **Smear on fast limbs.** When a limb's angular velocity exceeds a threshold, draw it
  with `animSmear`. Attacks, dashes, and launches immediately gain weight.
* **Cape/scarf secondary motion.** The bezier cape sim from the narrative rig
  (`:713-752`) ported into `drawAccessory` — currently accessories are static.

Guard everything behind a `settings.animQuality` flag (`'high' | 'classic'`) so the
old look remains reachable and a regression is one toggle away.

---

## Phase 3 — Finishers

The engine (`js/smb-finisher-engine.js`) is already well-built — `def.face`,
`def.swing`, `def.impact`, `def.approach` are a real presentation layer. The gap is
that finishers are *choreographed* but not *timed*. Extend the shared layer, not the
individual finisher defs, so all ~30 defs improve at once:

* **`def.holds: [{at, frames}]`** — authored impact freezes. Currently no finisher can
  hold a frame; every one plays at constant speed.
* **`def.smear: [{at, dur, limb}]`** — opt into limb smearing on the big swing.
* **Automatic anticipation** — before any registered `def.swing` window, insert 4–6
  frames of counter-motion (wind-up in the opposite direction). Apply it in
  `_finApplyPose`, so no finisher def needs editing.
* **Camera grammar** — `_finApplyCam`: push in on anticipation, whip-pan on the swing,
  snap-out on impact, slow drift on the hold. Route through the existing `CinCam`.
* **The victim needs a performance.** Right now `_finApplyPose` sets
  `tgt._finPoseState = 'hurt'` and that's the entire victim animation. Give the victim
  a beat track too: brace → impact → airborne → land, keyed off `def.impact`.
* **Death hand-off.** `executeDeath` from Phase 1: a finisher kill must never fall
  through to a generic ragdoll flop at the end. The finisher's last frame is the
  corpse's first frame.

---

## Phase 4 — Domain expansion set-piece ("Confinement")

Build a real entry cutscene. New file `js/smb-domain-cinematic.js`, loaded after
`js/smb-domain.js`. `triggerExpansion()` gains one call; its existing 15 lines stay
as the fallback path (and as what runs when `d.earlyActivate` is set,
`js/smb-domain.js:911`).

Authored with `cinScript()` — ~2.6s, non-skippable first time, skippable after:

1. **Freeze** (0.0–0.3s) — `slowMo` to 0.05, world desaturates, everything but the
   owner dims. Owner is rim-lit in `def.color`.
2. **Anticipation** (0.3–0.9s) — owner crouches, arms cross, `def.color` energy is
   drawn *inward* (reverse particles — the existing pool supports inward velocity).
   Camera pushes to 1.6× on the owner. Ground cracks radiate via
   `cinGroundCracks`.
3. **The gesture** (0.9–1.4s) — hands snap apart, smeared. Full-screen white flash,
   `screenShake` 30, `CinFX.shockwave` in domain colour.
4. **The barrier closes** (1.4–2.2s) — the existing `_drawDomainFrame` walls sweep in
   from off-screen with `outBack` easing and overshoot, ceiling seam draws left-to-
   right, `_drawDomainSkyEffects` fades up. This reuses the good code that already
   exists — it just currently appears instantly.
5. **Name card** (2.2–2.6s) — `def.name` typed in, `def.announce` beneath, letterboxed
   via the existing `drawCinematicLetterbox` in `js/rendering/smb-drawing-hud.js`.
   Per-domain motif behind it (storm clouds for Storm Realm, blood rain for Warpath —
   both already implemented in `_drawDomainSkyEffects`).

Per-domain flavour comes from `DOMAIN_DEFS` extended with an optional
`entry: { gesture, motif, sfx }` — omit it and the domain gets the generic sequence.
That keeps all 15 working from day one.

---

## Phase 5 — Chapter transitions

New file `js/smb-transition.js`. `_storyMarkTransition()` currently returns a boolean;
extend it to return a *transition kind*, keeping `true`/`false` behaviour as the
default cases so nothing regresses.

* **Ink wipe** — the AvA house style: a black shape floods across the frame along a
  bezier, holds one beat, retreats to reveal the new scene.
* **Match cut** — when consecutive chapters share a character, hold the figure's
  silhouette across the cut while the background swaps. `showNarrativeScene` already
  owns figure positions (`_getFigAnim`, `:181`), so the data is there.
* **Camera hand-off** — narrative scene ends on a camera position; the gameplay scene
  *starts* from it and eases to the play framing. `_camUpdate` (`:130`) and the
  gameplay camera (`js/smb-camera.js`) both exist; nothing currently bridges them.
* **Act-break cards** — `_getActStyle` (`:902`) and `_drawActMotif` (`:918`) already
  define per-act visual identity. Use them for a proper act title card instead of a
  loading screen.
* **Fold the loading screen into the animation** — when assets genuinely need time,
  the wipe *holds* rather than cutting to a separate loading screen.

---

## Phase 6 — Maps and camera

Size is not the real problem; framing is.

* **Fix the three fake-scroll arenas** — `worldWidth: 900` at
  `js/smb-data-arenas.js:664, 675, 686` should either scroll or drop the field.
* **Widen combat arenas from 3600 → ~4800** only where the fight actually pushes the
  camera to its bounds. Measure first: instrument `updateCamera` for one session and
  log clamp frequency per arena. Widening every map costs traversal time for nothing.
* **Vertical space is the bigger win.** `GAME_H = 520` with launches capped by the
  ragdoll cliff means big hits have nowhere to go. Allow the camera to zoom out
  (rather than clamp) when a fighter is launched, so the arc reads.
* **Dynamic framing** — zoom keyed to fighter separation, with a slow spring so it
  never pops. `CinCam` already does this for cinematics; gameplay doesn't.
* **Depth** — parallax layers exist in the narrative renderer (`_plx`, `:127`) but
  arena backgrounds (`js/rendering/smb-drawing-arenas*.js`) are largely static.
  Porting `_plx` gives every arena depth for one function.

---

## Sequencing and risk

Land in this order; each phase is independently shippable and independently
revertable.

| Order | Phase | Why here | Risk |
|---|---|---|---|
| 1 | Phase 0 substrate | Everything else depends on it; touches nothing | none |
| 2 | Phase 1 death | The stated top complaint; self-contained | low — 5 call sites in `checkDeaths()` |
| 3 | Phase 2 model | Highest visual surface area | **medium** — `Fighter.draw()` is load-bearing; gate behind `settings.animQuality` |
| 4 | Phase 4 domain | Self-contained new file, one call site | low |
| 5 | Phase 3 finishers | Shared layer only; ~30 defs improve at once | low-medium |
| 6 | Phase 5 transitions | Touches the story flow funnel | medium — story launch path is fragile |
| 7 | Phase 6 maps | Needs measurement before edits | low |

### Per-phase verification (non-negotiable)
1. `node --check` every touched file.
2. `npm run check` (runs `tools/audit/check.js`).
3. Story registry contiguity scan if any `js/story/acts/` file is touched.
4. **Run the game in a browser and look at it.** Syntax-pass is not visual-pass — a
   plan for animation quality cannot be validated headlessly.
5. Record a `.smbreplay` before and after Phase 1 and Phase 2 and compare deaths
   side by side.

### Cache-busting
New scripts enter at `?v=4.0.90`; bump touched tags per phase. Verify with
`grep -oE '\?v=[0-9.]+' index.html | sort | uniq -c` — the file currently holds a mix
(100 tags on 4.0.2, 24 on 4.0.23, a scatter up to 4.0.89), so do not trust any single
value as "the" version.

### Invariants this plan does not break
* No damage path changes — `dealDamage()` stays the only mutator of `health`.
* No cinematic triggered from inside `dealDamage()`; Phase 1 sets a flag consumed at
  frame start in `gameLoop`, matching the existing rule.
* No ES modules; every new file is a plain global-scope script with an explicit
  `index.html` slot.
* `VerletRagdoll`, `PlayerRagdoll`, `CinematicManager`, the finisher defs and the
  domain sustain renderer are all *extended*, never replaced.
