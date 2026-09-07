# Story Cinematics Plan

Upgrade plan for the inter-chapter narrative scenes (June 2026). Goal: every story
sequence unique, visually strong, and well-told — without hand-animating 158 chapters.

## Status — reconciled against shipped code, Sep 7 2026

The June 2026 audit below is **superseded**; its counts predate ~28 chapters of new
content, the act renumbering, and the Sep 6 coverage pass. Numbers re-measured from
source on Sep 7 2026:

| June 2026 claim | Actual, Sep 7 2026 |
|---|---|
| 158 chapters | **186** (`STORY_CHAPTER_REGISTRY`, ids 0–185, contiguous) |
| 83 have `narrative` text | **110** |
| 66 have scene specs | **113** specs in `js/smb-story-scenes.js`, ids 0–185 |
| "~75 chapters drop into a fight with no framing" | **0 narrative chapters lack a spec** — coverage is complete |
| "no per-act visual style" | `STORY_ACT_STYLES` exists in `smb-story-narrative-scene.js` — **Phase 1 shipped** |

**Phase 1 — SHIPPED.** **Phase 2 — SHIPPED** (already marked). **Phase 3 — the Tier
B/C backlog it describes no longer exists**; every narrated chapter has a spec, so
what remains is quality tiering of existing specs, not coverage. **Phase 4's
continuity checks are resolved**: the epilogue ordering bug was fixed at
`smb-story-engine-match.js:384`, which gates on `ch.isEpilogue && ch.id >=
_sagaFinalId()` rather than on the overloaded `isEpilogue` flag alone. Note the
bound is computed per saga rather than hardcoded, so it stays correct across the
saga split. The act4mv id collision was cleared by the renumber.

Since this plan was written, story segments also became **cutscenes rather than
click-through readers** — `_showStory2Narrative` passes `{cinematic: true}` for every
chapter, beats hold on a reading-rate budget (`CIN_CPS = 24`), and the figures are
driven by the keyframed `js/smb-figure-rig.js`. The "Beats are expensive" principle
now has teeth it did not have when beats were self-paced clicks: a padded beat costs
real seconds of someone's time.

### Two of these were closed on Sep 7 2026

- **Per-act split — DONE.** `js/smb-story-scenes.js` had grown to 9,320 lines (the
  plan flagged it at 6,012). The 113 specs now live in `js/story/scenes/<act>.js`,
  one file per act directory, mirroring `js/story/acts/`: act0 14, act1 8, act2 12,
  act3 9, act4 8, act4mv 22, act5 9, act6 5, act7 9, actvoidmind 13, side 4.
  Spec content is unchanged. `smb-story-scenes.js` is kept, and kept first in load
  order, as a documented stub that declares the shared table and points at the new
  files. Each scenes/ file also declares the table defensively, so order among them
  does not matter — only that all load before `smb-story-narrative-scene.js`.

  Verified lossless by snapshotting `STORY_SCENE_SPECS` in the browser before and
  after with sorted keys: **byte-identical, 267,700 bytes, 113 specs**. Chapters 0
  (act0), 106 (act4mv) and 180 (actvoidmind) were then rendered from three different
  split files with zero page errors.

- **Spec coverage validator — DONE.** Added to `tools/audit/check.js`, so it runs in
  `npm run check` rather than only warning at runtime. Two rules:
  `scene-coverage` (a chapter with `narrative:` but no spec — it would play as bare
  captions) and `scene-orphan` (a spec whose chapter id no longer exists). The second
  is the one that has actually bitten: commit `cee0148` existed to realign specs after
  a renumber moved ids underneath them. Both rules were proven to fire by
  temporarily renaming a spec, and the messages name the exact file to fix.

  One trap worth recording: the first version of the rule matched chapter heads as
  `{ id: N,` and reported ch106 and ch117 as having **no chapter at all**. Many
  chapters open with comment lines between the brace and the `id`. The rule now
  anchors on the `id:` line, the same form as the registry contiguity scan in
  CLAUDE.md.

### Still open from this plan

- Phase 3's Tier S bespoke-spectacle pass is not done — coverage is universal, but
  quality is not yet tiered.

---

## Current state (verified June 2026)

- **Engine** (`js/smb-story-narrative-scene.js`, specs in `js/smb-story-scenes.js`):
  beat-based scenes with typewriter dialogue, camera keyframe animation (`camAnim`),
  camera shake, letterboxing, animated player/NPC figures (13 states + expressions),
  22 effect types (portals, sky cracks, shockwaves, screen flash, speedlines, …),
  8 background themes. Specs keyed by chapter id in `STORY_SCENE_SPECS`.
- **Coverage**: 158 chapters → 83 have `narrative` text → only 66 have scene specs.
  ~75 chapters drop the player into a fight with no framing at all.
- **Identity**: no per-act visual style — theme inferred from arena/world string;
  Acts 0–3 reuse city/fracture, Acts 4–7 reuse space/ruins/fracture.
- **Quality range**: ch108 Sovereign reveal (3 beats, stacked effects, 4-keyframe
  camera) vs ch1 (nothing, straight into stealth).

## Principles

1. **Beats are expensive — ideas are not.** One idea per beat. 1–3 beats for normal
   chapters; 4+ only for act finales and entity reveals.
2. **Show in the spec, tell in the text — never both.** If the camera shows the
   portal opening, the caption shouldn't say "a portal opened."
3. **Canon guardrails**: code/4th-wall/3D-power visuals reserved for apex beings
   (Creator, True Form, Absolute Axiom — reality-fracture style); Veran is dead from
   ch94 on (no voice lines after); Paradox belongs to neither side and should never
   be framed with God's or Axiom's motifs.
4. **Engine first, content second.** Style packs and new primitives before the
   act-by-act content pass, so every scene inherits the upgrade.

## Phase 1 — Act style packs (engine, ~1 session)

Add `STORY_ACT_STYLES` (act → style) merged into every spec at scene start, so all
66 existing specs inherit identity with zero edits:

| Act | Palette / grade | Letterbox | Signature motif |
|-----|----------------|-----------|------------------|
| 0 Home City | warm amber, soft vignette | 0.06 | dust motes, streetlight pools |
| 1 Fracture Network | cyan-teal grade | 0.085 | drifting fracture shards |
| 2 Architects | cold white-blue | 0.085 | geometric grid ghosting |
| 3 War & Betrayal | desaturated + red accents | 0.10 | ember fall, smoke columns |
| 4 + 4mv Multiverse | per-world hue shift | 0.085 | world-colored sky bleed |
| 5 True Form approach | deep violet, high contrast | 0.11 | reality-tear flickers |
| 6 Creator Domain | gold/black | 0.11 | floating construct panels |
| 7 Absolute Axiom | white/void inversions | 0.12 | kernel pulse rings |

Implementation: style = `{ grade: {color, alpha}, letterbox, motif: effectSpec,
captionTint }`; merge in `showNarrativeScene` before the rAF loop; `motif` is a
persistent `effectsBehind` entry auto-appended to every beat.

## Phase 2 — Three new primitives ✅ DONE (June 2026)

1. **Beat transitions** — spec field `transition: 'fade' | 'slam' | 'whip' | 'none'`.
   Default: every beat advance fades from black (14f); scene opens with a 22f fade;
   `slam` = white flash-cut + camera shake; `whip` = horizontal pan-in with motion
   streaks. Implemented in `_beatEnter()` + `_render()` hooks.
2. **Narrator restyle** — caption bar fades in on beat entry, act-colored accent
   rule, letter tracking (`letterSpacing` where supported). In `_drawCaption()`.
3. **Sting audio cues** — spec field `sting: 'low' | 'rise' | 'impact' | 'silence'`;
   synth stings in smb-audio.js (`stingLow/stingRise/stingImpact`); silence sets
   `SoundManager._cosmicSilenceTimer = 50`.

## Phase 3 — Content pass, act by act

Tiering (counts from June 2026 audit):

- **Tier S — bespoke spectacle (≈12 chapters)**: act finales + entity reveals
  (ch108 Sovereign already the benchmark; God reveal, Paradox birth, ch147 Absolute
  Axiom merge, ch152 finale, Damnation arc entry). 4–6 beats, full camAnim, motif
  breaks allowed.
- **Tier A — arc transitions (≈25)**: 2–3 beats, one camera move each, one effect
  stack max.
- **Tier B — narrated chapters missing specs (~17)**: 1 establishing beat generated
  from a reusable template per bg theme (portal-in, walk-and-talk, aftermath).
- **Tier C — the ~75 bare chapters**: minimum one templated establishing beat with
  the act motif + chapter title card. No new prose required (reuse `preText` as the
  caption where it exists).

Order: Act 0 first (onboarding = first impression), then Act 7/finales (the payoff),
then 1→6 in sequence. One act per session, playtested via the F8 jump menu.

## Phase 4 — Writing standards (apply during Phase 3)

- Narrator voice: short declaratives, present tense, no adverb stacking. Max ~90
  chars/line (typewriter at 14ms/char ≈ 1.3s — keep beats under 3 lines).
- Character voices: Sovereign = clipped, certain; God = archaic cadence; Axiom (human
  flashbacks) = plain and tired; True Form/Creator = abstract, speaks in scale;
  Paradox = questions, unfinished sentences.
- Every scene answers: what changed, and why the next fight matters.
- Continuity checks each pass: no Veran voice after ch94; epilogue (ch117) ordering
  bug must be fixed before Act 6–7 content pass (it currently fires before Acts 6–7);
  act4mv chapter id 104–107 collision must be renumbered before new specs reference
  those ids.

## Open engine debts that block nothing but should ride along

- `STORY_SCENE_SPECS` lives in one 6,012-line file — split per act when touched.
- Spec coverage validator: console warning when a chapter has `narrative` but no spec
  (catches drift permanently).
