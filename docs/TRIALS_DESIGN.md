# The Trials — design spec

**Status:** design only, nothing implemented. Written Sep 5 2026.
**Origin:** user concept. This doc is the handoff for building it.

---

## Concept

A character holds something Kael needs. To get it, he has to pass a set of
trials. Minimum three.

**The spine — every trial takes away something Kael relies on and asks whether he
still functions without it.** This is the rule that decides whether a proposed
trial belongs. A trial tests a *faculty*; it does not merely change the win
condition. Anything that only swaps the objective is mode variety, not a trial.

Order: **sense → control → self-knowledge**, each removing something more
fundamental than the last.

**Gatekeeper:** the Fourth Architect is the natural fit — canon already has them
staying behind after the rift closes as "keeper of the record," which is the
shape of someone who holds a thing and makes you earn it. See `docs/canon.md`,
ARCHITECT FATES.

**Placement recommendation: chapters 100–119.** That stretch is the worst pacing
sag in the game — 2 combat chapters per 10 across twenty chapters, right where
the multiverse tour should be most memorable (see `docs/SAGA_SPLIT_PLAN.md`,
"Pacing balance pass"). Dropping the gauntlet there fixes the sag with content
designed to be a peak, rather than by nudging difficulty numbers.

---

## Trial 1 — Sense (the Lantern)

The player fights an **invisible opponent** with a **lantern** as their weapon.

**The lantern.** Normal `attack` and `super`. Its `ability` slot does no damage —
it fires a reveal sweep instead.

**The sweep.** A ring expands from the player marking the leading edge; a second
ring follows behind it marking the trailing edge. The band between them shows
reality. It does **not** show the opponent directly — it shows *distortions in
space*, and the invisible opponent distorts space.

**Why this is the good part, and must not be simplified:** the reveal is
*indirect*. The player infers a body from a disturbance rather than reading a
marker. That is the difference between a skill and a wallhack. The sweep also
makes the information **time-stamped** — you learn where they *were* when the
band crossed them, and it is stale the moment you have it.

### Tuning — the one genuinely hard number

Band width = `gap × ring speed`, and the arena is **900px** wide (`GAME_W`). The
original 3s gap does not survive contact with that:

- 3s gap at a readable band width (~300px, a third of the arena) needs ~100px/s
  rings — but then the sweep takes 9s to cross, and against a 10s cooldown the
  arena is revealed almost permanently. Tension gone.
- 3s gap at any brisk ring speed makes the band wider than the arena, so it
  reveals everything at once and stops being a sweep at all.

**Recommended:** leading ring ~400px/s, gap **0.75s** → ~300px band, crosses the
arena in ~2.2s. Against a 600-frame (10s) cooldown that is ~22% uptime.

**If the 3-second number matters,** move it to the *dwell* instead: the sweep is
fast, but each point of space stays revealed for 3s after the band passes. Same
feel, survives the arena width.

Anchor the tuning to arena width, not to the clock.

### Secondary cues — required, not optional

70% blind is a coin flip at this game's combat cadence (~28 frames between
exchanges). Three things stay visible even while the body does not:

1. the weapon arc when the opponent swings,
2. footfall dust on landing,
3. the hit reaction when the player connects.

The lantern is for **finding**. Once engaged, the fight has feedback. Blind to
locate, sighted to fight.

### The opponent's AI

Must be purpose-built, **not** an expert bot with the draw call removed — an
invisible fighter running normal aggression simply deletes the player. It should
**stalk**: approach, one strike, retreat, reposition elsewhere. A retreating
opponent is also exactly what makes stale sweep information meaningful.

---

## Trial 2 — Control

The arena inverts gravity and/or the player's controls on a tell the player has
to learn to read. Tests adaptation under a changing rule rather than perception.

Nearly free: `tfGravityInverted` and `tfControlsInverted` already exist as live
globals in `smb-globals.js` (lines ~843 and ~863).

---

## Trial 3 — Self-knowledge

A copy of Kael that **mirrors the player's inputs on a short delay**. It cannot
be beaten by reflex, only by breaking your own pattern.

Thematically the strongest of the three for *this* game specifically: the entire
endgame is about an AI that reads your habits, so this quietly foreshadows
Sovereign. The `mirror` world-boss variant in `spawnWorldBoss()`
(`smb-story-engine-match.js`) already copies the player's weapon — start there.

---

## Minigames as trials — verdict

Proposed: Defend the Nexus, Battle Royale, Soccer.

Judged against the spine above (a trial removes a faculty; it does not merely
change the objective):

| Minigame | Verdict | Reasoning |
|---|---|---|
| **Defend the Nexus** | **Include** | Genuinely tests a faculty. After ~100 chapters of being rewarded for aggression, protecting something inverts the player's instinct — the thing taken away is the freedom to fight where he wants. Already exists as a story chapter mode (`exploreMode: 'defense'` → `initDefenseMode`), so it is nearly free. |
| **Battle Royale** | **Include only if reframed** | As-is the problem is "who are the other fighters, canonically?" — anonymous bots make it a mode, not a story beat. **If the field is the 94 bearers who came before Kael**, it becomes the most thematically loaded fight in the game: the thing he refuses to be, made literal, all at once. That version belongs. Needs story wiring (`js/smb-battleroyale.js` is standalone). |
| **Soccer** | **Omit** | Tone. This sits in the multiverse-war arc where the companions are world bosses and Veran is about to die; a soccer match reads as a joke inside it. Same standard already applied by `STORY_TONE_EXCLUDED_WEAPONS`. Mechanically it is also the weakest fit — an arena plus a minigame wrapper, not a faculty test. |

General caution: modes the player can already pick from the main menu make a
gauntlet feel like padding. The lantern trial earns its place because it exists
nowhere else in the game.

---

## Engine notes — what is cheap and what is new

**Cheap / already exists:**
- A weapon's `ability(user, target)` is an arbitrary function, so a non-damaging
  utility ability is fully supported. See `WEAPONS` in `js/smb-data-weapons.js`.
- `abilityCooldown` is decremented once per frame (`smb-fighter.js:368`), so it
  is in **frames**: 10s = **600**.
- `spawnRing(x, y)` already exists — `js/smb-particles-core.js:60`.
- Forcing a loadout has a precedent: `strippedPowers` at
  `js/story/smb-story-engine-flow.js:743` sets `storyPlayerOverride` flags.
  NOTE: it *strips* ability/super; the lantern needs a *forced weapon* instead,
  so this is a pattern to copy, not a flag to reuse.
- Invisibility: skip the draw, keep the hitbox.
- Nexus Defense is already a story explore mode.
- `tfGravityInverted` / `tfControlsInverted` are live globals.

**Genuinely new work:**
- The distortion rendering for the reveal band. Closest precedent to borrow from
  is `drawTFRealityTear()` — `js/boss/smb-boss-tf-visuals1.js:311`.
- The stalking AI for the invisible opponent.
- Story wiring for Battle Royale if the "94 bearers" version is used.

**Build order:** the lantern + invisible opponent first, as a playable prototype,
so the sweep timing can be felt before the other trials are written around it.

---

## Open questions

- What is the thing Kael needs? Undecided.
- Three trials or five? (Sense / control / self-knowledge, plus Nexus and the
  reframed Battle Royale, would make five.)
- Does the gauntlet go in 100–119 as recommended, or somewhere else?
