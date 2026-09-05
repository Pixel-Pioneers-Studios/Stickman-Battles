# Handoff — Sovereign, Aug 26 2026

Continues `docs/HANDOFF_sovereign_2026-08-25.md`, which left one blocking question:
is the adaptation rework actually making Sovereign stronger?

## Short version

1. The adaptation question is **as answered as it can economically be**: no
   detectable gain in damage dealt, and a suggestive signal that it makes him take
   MORE damage. Resolving the damage-dealt question properly would need ~206
   paired trials (~14+ hours of runs). Not worth it. Stop tuning dials.
2. **Loadout matters far more than the dials** — eta² = 0.358 among melee weapons,
   and he has no mechanism to adapt it.
3. The **whiff-guard's vertical gate is still firing on half of all attack
   attempts** at a mean gap of 190px, mostly with the boss BELOW him — which is
   exactly what the Aug-25 commit set out to fix. This is the largest concrete
   defect found and the recommended next work.

## 1. The A/B, done properly

Three rounds, each fixing a confound the previous one hid.

**Round 1 (24 trials, uncontrolled).** adaptive 182.9 ±95.3 dealt/1k vs frozen
175.3 ±104.9, t = 0.18. I read this as "adaptation is a wash." **That reading was
wrong**, because:

**The boss refight does not give the host a fixed loadout.** It varies per match —
measured broomstick/gunner in one match, whip/none in the next — and weapon is a
~2x effect among melee (7x if ranged is included). Class varies independently and
changes HP, speed and perks. Both were random across both conditions, so they did
not BIAS the comparison, but they swamped it. That is where sd ≈ 100 came from.

**Round 3 (32 trials, weapon AND class pinned per pair).** Both halves of each pair
forced onto the same weapon and `class=none`, cycling 8 melee weapons:

| paired delta (adaptive − frozen) | mean | sd | t | n |
|---|---|---|---|---|
| dealt/1k | +23.8 | 85.9 | 1.00 | 13 |
| **taken/1k** | **+17.5** | **27.6** | **2.29** | 13 |
| whiff-veto % | −11.1 | 46.5 | −0.86 | 13 |

Deaths across the run: adaptive 7, frozen 3.

Read this carefully:

- **Damage dealt: no result.** +23.8 on a ~147 baseline is directionally positive
  but t = 1.00. Pinning the loadout did NOT shrink the noise much, because
  trial-to-trial variance within a single weapon is itself enormous (sword: 128,
  236, 133). At this effect size and spread it needs **~206 pairs** for 80% power.
  Treat damage-dealt as unresolvable by this method and stop spending runs on it.
- **Damage taken: adaptive is worse, p ≈ 0.04.** He takes ~17% more damage per
  1000 frames than frozen-at-max, and died more than twice as often. This is the
  strongest signal in the session. **Caveat, stated honestly:** three metrics were
  examined, and under Bonferroni correction (threshold 0.017) it would not
  survive. It is suggestive, not conclusive — but it points the opposite way from
  "the rework is free."

The Aug-25 handoff feared the rework made him weaker. The current evidence is
consistent with a mild defensive REGRESSION and no offensive gain. If the rework is
kept, keep it for legibility — the dials visibly move and reverse now — not power.

## 2. Loadout is the biggest factor found, and he cannot adapt it

Same protocol, one weapon forced per trial group:

| weapon | dealt/1k |
|---|---|
| katana | 244 |
| sword | 214 |
| flail | 146 |
| hammer | 139 |
| combat | 138 |
| whip | 120 |
| gun | 33 |

- **eta² = 0.358** among melee — the share of damage variance explained purely by
  which weapon he held. Conservative, since class was still varying inside those
  groups and inflating within-weapon noise.
- Including `gun` it is 0.557, but that number is really "ranged does not work for
  him at all" rather than a fine-grained weapon effect. Quote the melee figure.

**He has no loadout adaptation whatsoever.** `SovereignMK2` never assigns its own
`weaponKey`, `_genome` is fixed at construction, and the only weapon-awareness in
the class reads the TARGET's weapon to adjust spacing (`smb-smk2-class.js:3487`,
`:3641`). He plays whatever the match hands him, and handed a gun he does 13% of
his katana damage. If any single change is going to make him stronger, it is this.

**`mkgauntlet` is admin/troll-only and must never appear in a sweep.** `WEAPON_KEYS`
is the player-facing list — it hard-filters `gauntlet`, `mkgauntlet` and every
`enemyOnly` weapon (`nullblade`, `voidblade`, `shockrifle`). Reading damage ranks
off the raw `WEAPONS` object pulls those in. `tools/sov-ab.js` now validates against
`WEAPON_KEYS` and refuses the trial; `--allowrestricted` overrides deliberately.

## 3. The real defect: the whiff-guard's VERTICAL gate

Across all 29 trials of the final run, 774 guard checks:

- **`_vGap > 60` vetoes: 49%** of every guard-reaching attack attempt, at a **mean
  vertical gap of 190px**. Direction: **335 with the boss BELOW him**, 46 above.
- `_projGap > reach` vetoes: 13%.

So the guard is overwhelmingly a VERTICAL gate, not a reach gate. My first
hypothesis — that heavy weapons' long windup (flail `dur:16, ease:'heavy'` → 9.9
contact frames vs combat's 2.1) inflates the projected gap through the drift term —
is **wrong**: measured drift is ~0 and `projGap` is usually negative, i.e. well
inside reach.

This is the same defect the Aug-25 commit was written to kill, and its own message
quotes "60% of Sovereign's attack() calls were silently vetoed by the whiff-guard's
vertical gate." It is still at 49%, still overwhelmingly the below-me case that
`PRIORITY DESCENT` / `PRIORITY AIR DESCENT` were widened to cover. Either those
blocks are not being reached (an earlier `return` in `updateAI` taking the frame)
or their conditions still do not match the live geometry. **Instrument which
branch of `updateAI` claims the frame during a vetoed swing — do not assume.**

Worth noting the coverage matrix has a genuine hole regardless:

| | grounded | airborne |
|---|---|---|
| target below | PRIORITY DESCENT | PRIORITY AIR DESCENT (Aug 25) |
| target above | ELEVATION PURSUIT (`smb-smk2-class.js:3984`, needs `this.onGround` + a reachable deck) | **nothing** |

And the underlying amplifier is unchanged: `Fighter.attack()`'s whiff-guard returns
WITHOUT consuming the cooldown, so a vetoed swing re-fires every frame forever.
Nothing pushes him to reposition. Fixing the veto to cost something may be a more
robust fix than chasing every geometry case.

## Tools (dev-only, none loaded by index.html)

| file | what |
|---|---|
| `tools/sov-ab.js` | A/B + loadout sweep + guard-veto attribution. `--pairs --frames --weapons --class --sweep --trials --cond --allowrestricted` |
| `tools/sov-qte-autopilot.js` | QTE input for a possessed Sovereign. `SovQTE.enable()` |
| `tools/sov-qte-test.js` | Walks TrueForm through all 4 QTE thresholds. `--noautopilot` is the control |

### Harness rules, each learned by getting it wrong

- **Pin BOTH weapon and class.** Pairing on weapon alone still left `[hammer/thor]`
  against `[hammer/archer]` inside one pair.
- **`applyClass()` returns early on `'none'`** (`if (!cls || classKey === 'none') return;`),
  so passing the neutral class silently leaves the match's class in place. The
  harness sets that profile by hand.
- **Alternate condition order per pair.** The first match after page load behaves
  differently from later ones.
- **Discard trials where damage did not flow both ways.** This invalidated the
  Aug-25 result: `takenPer1000` was 0 in every window, so adaptation never engaged.
- **Re-apply `SovereignControl.engage()` per trial** and assert `host.isAI` — a
  match restart replaces every Fighter.
- **Do not count "attack() returned without swinging" as a whiff-veto.** The AI
  calls `attack()` every frame and most calls correctly bail on cooldown /
  mid-swing / stun; counting those inflates the rate to ~70%. `_meleeReachDist` has
  exactly ONE call site — inside the guard — so it is an exact sentinel.

## Sovereign can now play the TrueForm QTEs

`smb-qte-engine.js` resolves prompts by rising edge on the **global `keysDown` Set**
(`keysDown.has(prompt.key) && !prompt._wasDown`). Sovereign drives a Fighter through
AI code and never touches it. Control run: **0 of 4 phases, 0 prompts completed** —
and Phase 4 is all-or-nothing, so the fight was uncompletable for him. That is why
TrueForm could not be used as a test opponent.

`tools/sov-qte-autopilot.js` gives him hands: **29/29 prompts, 4/4 phases.** It is
honest — it reads only `displayKey` and `isMirrored` (drawn as a distinct purple
bubble by `smb-qte-draw.js`, so a human sees the same tell) and inverts through
`_QTE_MIRROR`; it never reads `prompt.key`. Knobs: `reactionFrames`, `jitterFrames`,
`mistakeRate`, `readMirror`. Mirror-blind drops him to 2/4 phases at 81% accuracy.

Two notes: `_startQTE` calls `slowMotionFor(0, 99999)`, so `frameCount` does NOT
advance during a QTE — the autopilot runs on its own rAF counter and each prompt's
`timer`. And a press must be RELEASED, or the next prompt gets no rising edge.

## Recommended next work, in order

1. **Find why the vertical gate still fires** (49% of attempts, 190px, boss below).
   Instrument which `updateAI` branch owns the frame during a vetoed swing.
2. **Consider making a vetoed swing cost something** so the per-frame retry loop
   self-corrects instead of depending on complete geometry coverage.
3. **Give him loadout awareness** — the per-weapon table above is the input.
4. Untouched from Aug 25: `_getCounterStrategy()` fixed-priority lock-in,
   `_reactionMistakeRate()` still a flat `return 0` (`smb-smk2-class.js:2781`),
   `_oppMemory` only written on target switch, `grep "health > 2000"`.

Working tree: the three tools are new and **uncommitted**. No game code under `js/`
was modified this session.
