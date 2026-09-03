# Animation Quality Plan — "Animator vs. Animation" tier

Goal: cinematics, chapter transitions, domain-expansion set-pieces, death/finisher
animation, and the fighter model itself read as *hand-animated*, not as
"parameters lerping over time". Gameplay combat is explicitly **not** in scope for
this bar — it only inherits whatever the shared substrate gives it for free.

Everything below is a PATCH plan. No system is replaced. New behaviour lands in new
files with new load-order slots; existing files gain call sites, not rewrites.

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
