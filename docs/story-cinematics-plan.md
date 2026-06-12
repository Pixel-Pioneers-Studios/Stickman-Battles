# Story Cinematics Plan

Upgrade plan for the inter-chapter narrative scenes (June 2026). Goal: every story
sequence unique, visually strong, and well-told — without hand-animating 158 chapters.

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
