# Handoff — Story cutscenes: pacing, trims, and the figure rig (Sep 5–7 2026)

Three days of work, written up in one place so stray items can be closed out.
Everything below is on `main`. **Nothing is pushed.** Render does not auto-deploy,
so none of this is live until a manual deploy.

---

## 1. What is committed, by day

### Sep 5 — repo hygiene
| Commit | What |
|---|---|
| `b16252c` | Repo cleanup: untrack build artifacts, consolidate replays and assets (removed ~1.16M lines of tracked artifacts) |

### Sep 6 — The Trials, saga split, bearer BR, first story cinematics
| Commit | What |
|---|---|
| `2b359bd` | Arena identity pass, saga split mechanism, launch packaging |
| `753e272` | The Trials — all three mechanics (`js/smb-trials.js`) |
| `f5e8e8d` | Frame-accurate trial arming; Trial of Control placed on ch119 |
| `cb265e2` | Handoff doc for the Trials + arena identity batch |
| `c547ae8` | Trials: Sense and Self-knowledge placed; mirror playback fixed; invisibility leak closed |
| `cee0148` | `STORY_SCENE_SPECS` realigned with the chapters they were authored for |
| `9d2bce7` | Sovereign counter-pick / domain-retreat tuning — **arrived from another session**, committed on request |
| `ae59be8` | Handoff: Trials placement + scene-spec realignment |
| `e76142c` | Sovereign: soften hazard/ambient aggression, ringout guard |
| `573b4ed` | The Ninety-Four: bearer battle royale, saga cold opens, full scene coverage |
| `ca874de` | Handoff: stalker whiff rate, close out shipped items |
| `2060a58` | Story cinematics: play a chapter run as one film + visual pass |

### Sep 7 — this batch (one commit, see §2)

---

## 2. Sep 7 in detail

### 2a. Cutscene pacing — the obvious fix was wrong

The Reckonings run (ch170–180) was measured before anything changed: **115 beats,
10,880 chars, 7.5 min.** The old hold curve was `_cinHold + min(150, len*1.1)`,
which was backwards at *both* ends:

| beat length | old on-screen rate |
|---|---|
| 16 chars ("An attention.") | **10 cps** — twice as long as needed; this is the drag |
| 68 chars | 20 cps — correct |
| 383 chars | **42 cps** — unreadable |

The flat 70-frame floor padded every short beat, and the `min(150, …)` cap meant
everything past ~136 chars got the *same* hold, so the longest cards flew by
fastest. Replaced with a **reading-rate budget**: `CIN_CPS = 24` characters per
second of total on-screen time, floor `_cinHold`, cap `CIN_HOLD_MAX = 300`.

**Clock tuning alone bought 12 seconds.** The length was word count, not timing.

Also added **hold-to-fast-forward** (`FF_RATE = 4`, `FF_ARM_MS = 160` so an
ordinary click still advances one beat), with a bar-thickening + `▸▸ 4×` readout.

### 2b. Every between-chapter segment is now a cutscene

One chokepoint: `_showStory2Narrative` in `js/story/smb-story-engine-flow.js` now
passes `{cinematic: true, holdLastBeat: true}`. Every chapter's narrative flows
through it, so this converted all 112 narrative chapters at once — no per-chapter
opt-in, nothing to re-point after a renumber.

**New option `holdLastBeat`**: in cinematic mode, stop auto-advancing on the final
beat and draw the ordinary Fight!/Continue button instead of firing into the
match. Skip is suppressed there (nothing left to skip). Multi-chapter runs omit
the flag — eleven buttons would break the one-film conceit.

### 2c. Text trims

| | beats | chars | runtime |
|---|---|---|---|
| before | 755 | 73,627 | **51.1 min** |
| clock only | 755 | 73,627 | 49.7 min |
| **clock + trims** | **724** | **66,463** | **45.8 min** |

**The Reckonings were an outlier** (26% cut) because they ran a rigid four-part
template seven times with real restatement, and ch172/173 duplicated each other
almost beat for beat. The rest of the story is dialogue-driven and already terse:
the ~78 chapters left largely alone average 424 chars, roughly one good cutscene
beat. ~34 chapters carried real fat and were cut 10–25%; short ones were
deliberately **not** padded down to hit a percentage.

Untouched on purpose everywhere: `branchPrompt`, `choices`, `consequence`,
`tokenReward`, `postText`. Those are the interaction and the earned payoff.

### 2d. Two pre-existing bugs this surfaced

Both were invisible while scenes were click-through readers nobody watched to the end.

1. **273 stray `",` sequences across 34 chapters.** Authors typed the array
   separator comma *inside* the quoted string (`'"They are the dead.",'`), so the
   caption rendered the comma verbatim. Fixed repo-wide; a comma *before* the
   closing quote is real punctuation ("…every hit you landed,") and those 11 were
   left alone.
2. **`multi_portals` crashed the draw loop.** Two authoring conventions exist in
   `STORY_SCENE_SPECS` — explicit `portals: [...]` and a bare `count: N` — but only
   the array was implemented, so all 9 `count:` specs threw
   `Cannot read properties of undefined (reading 'length')` from inside
   `_drawBeatEffects`. Now supports both.

### 2e. Animation — principles pass, then a real rig

**Biggest single visual win, and it was a bug:** the face-drawing block in
`_drawFigure` set `strokeStyle`/`lineWidth` for brows and mouth and never restored
them, and was not wrapped in save/restore. Everything drawn after — torso, arms,
legs — inherited the last face feature's pen. Every `attack` figure drew its
**entire body in mouth-red**; every `hit` figure in 35% black. Across all 113
scenes. Found via a contact sheet; a scene screenshot is too small to see it.

**`js/smb-figure-rig.js` (new).** Hand animation is poses + timing; the rig is
that as data. `POSES` are joint-angle sets, `CLIPS` time them with per-key easing
and holds. This replaced per-state sine waves, which structurally cannot express a
hold, an anticipation, or a 3-frame snap. Uses GSAP's `parseEase` (already loaded
for cinematic sequencing) with a local fallback, so it has no hard load dependency.

- **Angle convention:** every limb angle is ABSOLUTE, canonical facing-RIGHT,
  radians from +X with +Y down. `0`=right, `PI/2`=down, `-PI/2`=up. An angle is the
  direction of the BONE, not a joint flex. Mirroring is `theta -> PI - theta`
  (reflect about vertical) — **negating flips the figure upside-down**, the same
  trap the weapon-facing code hit.
- **Proportions are identical to the old inline figure** so it was a drop-in swap.
  Changing `FigureRig.LENGTHS` changes every story scene.
- **Integration is additive:** if `FigureRig.hasClip(state)` the rig supplies the
  skeleton, else the original path runs. All 15 states used anywhere in
  `STORY_SCENE_SPECS` have clips (verified by scanning), so the legacy path is now
  a safety net rather than a live path.
- The punch is four poses — coil, throw, contact, recover: 14 frames of
  anticipation, a **3-frame** throw, overshoot on contact, slow recover.

Also: overlapping action (head evaluated at `t - 5.5`, no per-figure state needed),
squash/stretch on torso length and head radius rather than canvas scale, tapered
limbs, feet, weight-bearing contact shadow, and rig-sampled smears (the same pose
sampled 1.7/3.4/5.1 frames earlier, which is physically what a smear is).

### 2f. Two judgement calls — both reversible, both worth a look

- **Cape is OFF by default.** `SCENE_CAPE_DEFAULT = false` in
  `smb-story-narrative-scene.js`; `window.SCENE_CAPE = true` restores it
  everywhere. It was drawn on **every** figure and was the single biggest thing
  flattening the silhouette — a filled shape behind the torso that hid the back arm
  and turned a posed figure into a blob with a head. An A/B render made it
  unambiguous, but it is an aesthetic call and easy to disagree with.
- **Figures now scale with the viewport.** `_figScale() = clamp(canvasH/430, 1,
  2.4)`. They were drawn at a fixed ~85px regardless of window — 11% of frame
  height on a 760px viewport, too small for any posing to read. Authored per-figure
  `scale` still multiplies on top. The speech-bubble anchor scales with it or
  bubbles detach from heads.

**Ceiling, stated plainly:** this is a real jump — keyframed poses, holds,
anticipation, snap, contact shading, correct smears — but it is **not Alan Becker**
and no library makes it so. AvA is hand-drawn frames. Closing the rest of that gap
means a sprite pipeline fed by the player models being drawn separately; the clip
structure is the right thing to drive that when the art exists.

---

## 3. Stray items — the point of this doc

> **Update, Sep 7 2026 (later session).** §3b is **done** and most of §3c is
> **done**; §3a was reviewed, verified and left uncommitted. See §5 at the bottom.


### 3a. In the working tree, NOT mine, NOT committed
Another session has been writing into this tree. Left untouched:

```
js/boss/smb-boss.js            js/smb-combat.js
js/boss/smb-boss-tf-attacks1.js  js/smb-fighter.js
js/boss/smb-trueform-attacks.js  js/smb-loop-core.js
js/smb-smk2-class.js
```
Boss recovery cost scaling by phase, gravity-pulse crush. It cites
`smb_replay_creator_2026-09-06`.

**It had also bumped its own six `?v=` tags in `index.html`.** Those were reverted
before committing and restored afterwards, so `index.html` in the working tree
still carries them while the commit does not. **Check for this before staging
`index.html` again** — it has now happened twice.

### 3b. Untracked replay captures in the repo root
```
smb_replay_creator_2026-09-06.smbreplay
smb_replay_sovereign_2026-09-06.smbreplay
smb_replay_sovereign_2026-09-06 (2).smbreplay
smb_replay_sovereign_2026-09-06(3).smbreplay
smb_replay_void_2026-09-06.smbreplay
```
`replays/` is the home for these per the repo layout. They belong to the other
session's boss work; moved or deleted at your discretion.

### 3c. Not done / deliberately left
- **Text trims stop at ~34 chapters.** The other 78 were judged already at
  cutscene length. A second pass will not yield another 26%.
- **No impact FX or camera punch** on action beats. These scenes are
  dialogue-driven so it was low value here, but it is the next real step toward the
  AvA look if fight cinematics get the same treatment.
- **`docs/animation-quality-plan.md` and `docs/story-cinematics-plan.md`** predate
  this work and have not been reconciled against it.
- **Nothing is pushed, and Render does not auto-deploy.**

---

## 4. Verification state

- Registry: `total 186 range 0-185 dups 0 gaps 0`
- All 201 js files pass `node --check`
- `npm run check`: 72 problems — **identical count before and after**; all
  pre-existing (`screenShakeIntensity` in engine-events/engine-flow, duplicate
  `style` keys in act1-arc1 / act2-arc1, findings in `server.js` / `tools/`)
- Browser sweep: 14 chapters spanning every act (0, 7, 16, 48, 66, 80, 105, 122,
  148, 157, 166, 170, 181, 183), each scrubbed end to end — **zero page errors**
- `holdLastBeat` confirmed: scrubbed ch80 to the end, `gameRunning === false`,
  Fight! button showing

### Tooling added
- `tools/trim/narr.py` — dump/replace a chapter's `narrative:` array by chapter id
- `tools/trim/measure.js` — beats / chars / runtime for the story or one file

**Trap the helper hit and now guards:** many chapters have no `narrative:` key
(phase stubs, fight-only entries). An unbounded forward search from `id: N`
silently returns the *next* chapter's array — which would dump the wrong text and,
on `set`, overwrite the wrong chapter. Caught before any damage.

### Harness notes
- `_beginChapter2` opens with `if (_narrativeActive) return;` and `_narrativeActive`
  is module-local (**not** on window). Repeated calls in one page silently no-op.
  Use a fresh page load per chapter when sweeping.
- **Chrome's disk cache defeats `?v=` bumps.** A contact sheet came back
  byte-identical three times after real code changes. Always
  `await page.setCacheEnabled(false)`.
- agent-chrome MCP cannot launch Chrome here; `--remote-debugging-port=9222
  --headless=new` plus the repo's own `node_modules/puppeteer` via
  `puppeteer.connect({browserURL})` works.

### Dev hooks left in (nothing in the game calls them)
- `window._sceneDrawFigure` — render the rig in isolation for contact sheets
- `window._sceneSetBeatT(v)` — scrub the beat clock to step `attack`/`hit` frames

---

## 5. Follow-up session — Sep 7 2026

### Closed

- **§3a reviewed and one real bug fixed.** The other session's seven-file boss batch
  was read end to end and verified rather than merely left alone. It is sound. But it
  bumped six `?v=` tags in `index.html` and **missed the seventh**:
  `js/smb-smk2-class.js` was modified (the largest diff in the batch, 73 lines) while
  its tag stayed at `?v=4.1.21`. Chrome would have served the old file from disk
  cache and the Sovereign changes would silently not have applied. Bumped to
  `4.1.22` at `index.html:1695`. Also corrected a stale comment at
  `smb-smk2-class.js:4225` that still described beams as telegraphing 300 frames —
  the same batch cut that to 110 (150 in the meteor storm).

  Batch verified in a live headless browser, cache disabled, 45s of phase-3 boss
  fight: zero page errors; 12 beams and 17 spikes fired; `spike_warn` telegraphs
  visible for 794 frames and `circle` for 355; recovery split 43% pause / 51%
  pressure window, matching the intended 3–4 : 6 tick ratio; 38 hits on the player
  with max damage 22 and the new gravity-pulse crush landing in its 6–16 band. The
  TrueForm half was exercised separately by driving `_doSpecial` directly — the
  chain-slam grab pushes its `GRAB!` cross plus the 260px reach circle and lands;
  yanking the target out of reach mid-wind-up nulls `tfChainSlam` for **zero**
  damage; `calcStrike` pushes its `STRIKE!` cross at the predicted point; the meteor
  blast warning is `r=280`, matching the blast rather than the old `r=60` shadow.

  Two things that look like bugs and are not, recorded so they are not re-chased:
  `postSpecialPause` reaching 16 is the HP-threshold cinematic pauses at
  `smb-boss.js:181-197`, not `_chargeRecovery` misbehaving; and an apparent
  3,740-damage hit was a *test-harness* artifact from inflating `maxHealth` to 99999,
  which scales percent-based damage. At the real `maxHealth` of 160, nothing exceeds
  22. Also confirmed `dist()` (`smb-combat.js:12`) is true 2D, so the chain-slam
  reach check is not subject to the horizontal-only trap that bit `SMK2.updateAI`.

  **Still uncommitted**, all eight files together, deliberately.

- **§3b done.** All five `.smbreplay` captures moved from the repo root into
  `replays/`. Filenames kept byte-exact, including the awkward `(2)` / `(3)`
  suffixes, because the batch's code comments cite them by name as provenance.
  Note `replays/` is *tracked* (25 files before, 30 now), so this adds ~14MB of
  binaries to history when staged — worth a decision, given `b16252c` was
  specifically about shrinking the repo. A `.gitignore` entry is the alternative.

- **§3c, the two plan docs — reconciled.** Both now carry a status section measured
  against source rather than against the docs' own claims. Findings worth knowing:
  - `animation-quality-plan.md`: Phases **0, 1 and 5 have shipped**
    (`smb-anim-core.js`, `smb-death-anim.js` + `VerletAngleConstraint`,
    `smb-transition.js`). **Phase 2 is shipped too** — see the correction below.
    Phase 3 is mostly shipped (`def.holds`, `_finVictimBeat`, and the
    `executeDeath` hand-off); only `def.smear`, automatic anticipation and
    `_finApplyCam` remain. **Phase 4's premise is false**: it claims domain
    expansion has no entry cutscene, but `_tickDomainEntry` is ~650 lines of
    per-class choreography. **Phase 6's first bullet is false too**: the three
    `worldWidth: 900` arenas (`homeAlley`, `suburb`, `rural`) are deliberately
    contained to their painted art so the boundary portals frame the visible
    scene — the Jul 2026 boundary-portal fix, and each carries a comment saying
    so. Do not "fix" either one.
  - **Correction to my own first pass.** I initially recorded Phase 2 as NOT
    SHIPPED. That was wrong, and it is the kind of wrong that causes a rebuild of
    working code. I concluded it from `_lj` still existing in `smb-fighter.js` and
    from grepping that file for the plan's *proposed* names (`_footPlant`,
    `animQuality`). The work is real and complete, in `js/smb-anim-fighter.js`
    (184L, loaded at `index.html:1620`): `animIK` two-bone IK, `animStridePhase`
    /`_fp` foot planting, `animHeadLag` overlap, `animHitSquash` squash & stretch,
    `animEyeTarget`/`animBlink` face, `animCapeDrive` cape (called from
    `smb-drawing-effects.js:199`), `animSmear` on fast limbs, and the `animHiQ()`
    gate on `settings.animQuality`. `_lj` survives only as the classic fallback.
    **Search for what implements a behaviour, not for the names a plan guessed.**
  - The two rigs are independent substrates: `smb-anim-fighter.js` drives the
    gameplay fighter, `smb-figure-rig.js` the narrative figure; they share no code.
    The plan's advice to port the bezier cape into `drawAccessory` is also stale —
    the cape was later turned off by default for flattening the silhouette.
  - `story-cinematics-plan.md`: every count in it was stale. 186 chapters not 158,
    110 narratives not 83, 113 scene specs not 66, and **zero** narrated chapters
    lack a spec — the Tier B/C coverage backlog it plans for no longer exists.
    Phase 1 (`STORY_ACT_STYLES`) shipped. Its continuity blockers are resolved.

### Still open

- ~~Phase 1's own verification was never done~~ — **DONE Sep 7 2026**, though not
  as the plan specified. The before/after `.smbreplay` A/B is unrecoverable (a
  "before" means reverting shipped code), so Phase 1 was verified against its own
  spec in a live browser instead: no double corpse, the full
  `impact→stagger→fall→settle` beat track, all 7 death-kind selections correct, and
  the weapon leaving the hand on every kind. The corpse lies extended rather than
  curled — the exact failure finding 1(a) described. Details in
  `docs/animation-quality-plan.md`.
- **Phase 6's gating measurement is done, and it kills the plan's widening bullet.**
  24 arenas, 30,850 frames: the horizontal camera clamp fires 0.23% of frames on
  average and above 1% in exactly one arena. The camera never reaches the bounds
  that widening would relieve. What the data shows instead is that the three wide
  (3600) arenas resolve separation by zooming out to 0.39 with fighters ~2,320px
  apart, while the 21 single-screen arenas never go below 0.82 — so a wider map
  makes legibility worse, not better. Raw data in `docs/cam-measure-2026-09-07.json`.
- ~~`STORY_SCENE_SPECS` is still one file~~ — **DONE**, split into
  `js/story/scenes/<act>.js`, 11 files mirroring `js/story/acts/`. Proven lossless:
  the `STORY_SCENE_SPECS` object snapshotted before and after is byte-identical
  (267,700 bytes, 113 specs), and chapters from three different split files render
  with no page errors. `smb-story-scenes.js` is kept as a documented stub that
  declares the shared table and points at the new files.
- ~~No spec coverage validator~~ — **DONE**, two rules in `tools/audit/check.js` so
  it gates `npm run check`: `scene-coverage` (narrative with no spec) and
  `scene-orphan` (spec with no chapter — the failure that produced `cee0148`). Both
  proven to fire. `npm run check` still reports the same 72-problem lint baseline,
  and the audit itself is clean apart from one pre-existing `no-floor` warning.
- **Nothing is pushed, and Render still does not auto-deploy.**

---

## 6. Final state of the animation plan (Sep 7 2026)

After verifying every phase against source rather than against the plan's own text:

| Phase | State |
|---|---|
| 0 substrate | done (`smb-anim-core.js`) |
| 1 death | done + **verified** this session |
| 2 player model | done (`smb-anim-fighter.js`) — I had this wrong first, see §5 |
| 3 finishers | **complete** — `def.smear` added this session; the camera-grammar bullet dropped on evidence |
| 4 domain | 4 of 5 beats already exist; only the "freeze" beat is missing. Do NOT create `smb-domain-cinematic.js` |
| 5 transitions | done (`smb-transition.js`) |
| 6 maps & camera | the only phase with real scope left — but its widening bullet is disproven |

**Four of this plan's findings turned out to be false**, and each would have caused
a rebuild of working code:
1. Phase 4's "domain expansion has no cutscene" — it has 665 lines of it.
2. Phase 6's "three fake-scroll arenas" — they are deliberately single-screen.
3. Phase 6's "widen 3600 → 4800 where the camera hits its bounds" — measured at
   0.23% of frames; the camera does not hit its bounds.
4. Phase 2 read as unshipped — it shipped, under different names in another file
   (my error, not the plan's).

Phase 3's camera-grammar bullet was dropped on the same basis: the defs already
make **310 `CinCam` calls** of their own, so a shared always-on camera layer would
be a second writer to a global the defs already drive.

### What is actually left, and who has to decide it

- **Phase 4's freeze beat** — one addition to the common setup block at the top of
  `_tickDomainEntry`. Small, and the only mechanical work left in that plan.
- **Phase 6** — needs a *design* call, not tuning: what should the camera do when
  two fighters are ~2,300px apart on a 3600-wide arena? Today it zooms to 0.39.
  Split screen, a leash, or off-screen indicators (`drawEdgeIndicators` exists).
- **`story-cinematics-plan.md` Phase 3 Tier S** — quality tiering of the 113
  existing specs. Coverage is complete; this is authoring judgement, not a
  mechanical pass, so it needs your taste rather than my sweep.
- **`replays/` is tracked** — the 5 moved captures add ~14MB to history when
  staged. Track them or gitignore them; that is your call.
- **Nothing is committed or pushed, and Render does not auto-deploy.**

