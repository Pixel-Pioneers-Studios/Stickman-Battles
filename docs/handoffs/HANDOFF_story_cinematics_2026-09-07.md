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
