# Sovereign — Observation Log

Interesting things measured or discovered about SovereignMK2: breakthroughs, emergent
combat behaviour, system exploits he finds on his own, and real jumps in adaptation.

Rules for this file: **only things that were measured or verified in source.** A claim
here should name the file, the number, or the run it came from. Speculation goes in
`docs/roadmap.md`, not here.

---

## 2026-09-20 — The tactic grid drives nothing at all

**The single most consequential thing found so far, and it is a negative result.**

`_tacticGrid` is the 9-situation x 6-action ledger in
[js/smb-smk2-class.js:3860-3975](../js/smb-smk2-class.js#L3860). It is the structure the
whole offline research stack exists to fill: `SMK2Trainer` accumulates it, VECTOR merges
it across matches, `SovArtifact` persists it to `data/sov-artifact.json`, and
`_seedFromDossier` reads it back to pre-warm him at the start of every fight.

It has exactly two readers, and **neither changes what he does in a live match**:

| Reader | Status |
|---|---|
| `_swingGate()` ([:4127](../js/smb-smk2-class.js#L4127)) | **Disabled by default** — `swingGate: false` at [:26](../js/smb-smk2-class.js#L26), turned off because it fired zero times across six measured runs |
| `_bestAction()` ([:3956](../js/smb-smk2-class.js#L3956)) | Called **only** from the debug console readout at [smb-debug-console.js:459](../js/smb-debug-console.js#L459) — never from AI logic |

`_bestAction` is documented in-source as "the argmax that makes this a composed counter
rather than a chosen one." It is a dead function. The air-approach guard, which *is* live
and *does* have a measured win, reads `this._approachStat` — a deliberately separate
single-channel statistic — not the grid.

So the causal chain is complete right up to the last link, and then stops:

```
trainer → VECTOR → artifact.json → gridPrior() → _tacticGrid → (nothing)
```

This reframes the "Sovereign does not actually adapt" problem. It was understood as the
eleven continuous dials saturating six seconds into a fight. That is true and separate.
The grid was supposed to be the fix — discrete choices, which compound where dials
saturate — and the grid was never connected to the fighter.

### Why this went unnoticed

Every measurement pointed at the grid's *contents*, which are real and improving, rather
than at its *consumers*. The A/B in `tools/sov-tactic-probe.js` toggles
`SMK2_TUNE.tacticLedger`, which gates `_airApproachGuard` — the channel that works — so
the probe measured a live system and reported a real effect while the grid beside it did
nothing.

---

## 2026-09-20 — The grid has learned a coherent policy nobody executes

Measured at 1170 matches into the overnight VECTOR run. Best net action per situation
cell, by `(dealt - taken) / tries`:

| Cell | Best action | Net/try | Tries |
|---|---|---:|---:|
| `cl` close-level | attack | +5.26 | 10097 |
| `cb` close-below | attack | +5.41 | 9456 |
| `ca` close-above | **super** | +30.97 | 6863 |
| `ml` mid-level | attack | +2.76 | 8836 |
| `mb` mid-below | attack | +27.61 | 7101 |
| `ma` mid-above | super | +0.84 | 6786 |
| `fl` far-level | **super** | +28.62 | 6912 |
| `fb` far-below | super | +4.57 | 6880 |
| `fa` far-above | super | +0.05 | 6703 |

This is a clean, legible strategy: **swing when they are close or below you, spend super
when they are far or overhead.** It is not noise — the separation between attack and
super is an order of magnitude in `ca`, `mb` and `fl`, over thousands of tries each.

It is also, at present, a policy written in a notebook nobody reads. Connecting
`_bestAction` to behaviour is the obvious next build, and the numbers above are the
prediction it should be measured against.

Worth noting against the known super-hoarding problem (he takes zero domains in most
replays, capped at 2-3 spends per life by a 6.3 s hold): the grid independently concluded
that super is his strongest far-range option. Two separate measurements agreeing that he
under-spends super.

---

## 2026-09-20 — VECTOR's overnight run: three real mechanisms, ~50 restatements

First run of the closed research loop (`tools/sov-vector.js`, llama3.2:3b, 6 h,
`seeds=3`). Throughput was ~23 s/cycle, far faster than the ~4 min/cycle the Sep 19 logs
suggested, so cycle counts ran well ahead of wall clock.

Of the findings that survived the measurement gate, **three distinct mechanisms**:

1. **Commitment punish.** 95% of hits he took landed while he was mid-swing
   (`attacking` in the telemetry digest, [smb-sov-telemetry.js:143](../js/smb-sov-telemetry.js#L143)).
   A sharper version of the Sep 10 result ("126 of 127 hits landed airborne or in landing
   recovery") — the common factor is not being in the air, it is being *committed*.
2. **No burst against sustain.** Against `regenerator`, continuous healing negates
   anything not delivered as a burst; VECTOR named `ca`/`cl` as the cells he leans on and
   neither produces concentrated output.
3. **Multi-attacker guard collapse.** Vulnerable to simultaneous attackers when airborne,
   stunned, or close. This matches a known engine cause exactly: every anti-juggle guard
   in `dealDamage` is `attacker.`-keyed, so two attackers defeat all of them at once.

Everything else — roughly fifty findings — restates mechanism 1 in different words.

### The gate is weaker than it looks

`survived` is `test.stocksLeft <= 2.0 && < median` ([sov-vector.js:355](../tools/sov-vector.js#L355)),
and immediately before it `calibrate()` escalates a damage ladder until he drops to
`targetStocks: 1.8`. So the gate asks *"could the ladder make this composition lethal?"*
and never *"is the stated explanation correct?"* Every surviving scenario passed at x2.2
to x4 damage. It does discriminate — compositions whose ladder tops out get killed — but
the prose rides in unverified, which is how two findings describing the **opponent's**
weakness instead of Sovereign's, and one two-word fragment ("Mid-swing attacks"), reached
the artifact.

`absorb()` also has no dedupe and no cap, so the artifact grows unboundedly with
near-identical findings.

---

## 2026-09-20 — Connecting the grid to super release: measured null

Having found the grid drives nothing, the obvious first connection was the one the
grid's own numbers argued for hardest: release the super bank early in cells where it
rates super far above attack. Built as `_gridWantsSuper()`
([smb-smk2-class.js](../js/smb-smk2-class.js)), behind `SMK2_TUNE.superGate`, shortening
the situation-blind ~1.5 s bank hold to 20 frames in those cells only.

**Result: a wash.** Matched seeds, interleaved arms, `tools/sov-supergate-ab.js`:

| n per arm | fitness | stocks | dealt | taken | locked | releases |
|---:|---|---|---|---|---|---:|
| 36 | ON +249 (t=1.13) | ON +0.50 (t=1.51) | +19 (t=0.17) | ON −81 (t=−1.60) | ON −1.6 (t=−1.55) | 235 |
| **144** | **OFF +62 (t=−0.50)** | **even (t=−0.09)** | OFF +30 (t=−0.50) | OFF −7 (t=0.32) | ON −0.46 (t=−0.92) | 1392 |

The gate fires constantly and changes nothing.

### Two methodology lessons worth more than the result

**A false null nearly shipped as a real one.** The first A/B reported zero effect on every
metric — and also zero gate firings, because the counter read
`players.find(p => p._isSovereign)` and `_isSovereign` does not exist. Without the "did it
actually fire" counter, that run was a clean, believable, completely fictitious null.
Any future A/B in this codebase should surface an execution count for the mechanism under
test, not just its outcome.

**Four agreeing metrics are not four pieces of evidence.** At n=36 fitness, stocks, damage
taken and lockout all moved in favour of ON, which read as corroboration. They are not
independent — fitness is computed from stocks and damage, so a single lucky stock swing
moves all four together. The n=144 run erased it.

### What the null actually argues

The grid ranks six primitives. Choosing differently among *verbs* — swing here, super
there — does not move match outcomes, even when the choice is informed by thousands of
tries. That is direct evidence for the claim in `smb-sov-artifact.js`'s header: a grid
over six actions "can only ever express intensity," and intensity is not where the wins
are. It also rhymes with the Aug 26 result where the whole adaptation rework measured a
wash against frozen-at-max dials (Welch t=0.18).

Two independent systems — continuous dials, and now discrete primitive choice — have each
measured null. The remaining untested hypothesis is that the unit of adaptation is too
small in both cases, and that a *named multi-frame plan* is the first unit big enough to
matter. That is what `_executeTactic` would test, and it is currently the only live
hypothesis left standing.

---

## 2026-09-20 — Tactical plans: the first mechanism that moves anything

`_executeTactic()` — the function `smb-sov-artifact.js` always assumed existed — now
exists, along with the selection and pricing around it
([smb-smk2-class.js](../js/smb-smk2-class.js), `SMK2_TUNE.tacticPlans`). A plan is a
~1.5 s commitment chosen from four, held, then priced by what it cost, using the same
booking discipline `_markTactic` uses one level down:

| Plan | Behaviour |
|---|---|
| `pressure_ground` | **No-op control arm.** Movement left entirely to `updateAI` |
| `bait_whiff_punish` | Hold 1.25–1.65x reach; swing ONLY into their recovery |
| `spacing_poke` | Fight at the tip; veto anything inside 0.70x reach |
| `disengage_reset` | Retreat; hold all swings |

### Result: net loss, heterogeneous, and significant

n=108 per arm, matched seeds, 6368 plan completions:

| Metric | plans ON | plans OFF | t |
|---|---|---|---|
| fitness | 793.03 | 940.77 | −0.90 |
| stocks | 2.80 | 3.18 | −1.85 |
| dealt | 874.56 | 860.51 | 0.17 |
| taken | 487.77 | 442.86 | 1.44 |
| **lockout %** | **8.87** | **7.56** | **+2.33 — SIGNIFICANT, and a harm** |

Per scenario the spread is enormous and it is not noise-shaped:

| Scenario | stocks ON | stocks OFF | delta |
|---|---|---|---|
| `parry_wall` | 4.42 | 2.67 | **+1.75** |
| `attrition_tank` | 3.58 | 4.08 | −0.50 |
| `escalator` | 2.42 | 3.25 | −0.83 |
| `gauntlet` | 0.50 | 1.67 | −1.17 |
| `landing_trap` | 0.83 | 2.17 | −1.34 |

**This is the first mechanism all night to move a metric significantly at all.** Dials:
null. Primitive choice: null. Plans: a real, large, *signed* effect that depends on who
he is fighting.

The direction makes mechanical sense. `bait_whiff_punish` and `disengage_reset` both hand
initiative away. Against a punisher that is the correct read and worth nearly two stocks;
against anything that pressures, giving up initiative means eating the chain — which is
exactly what the significant lockout increase measures.

### The bug is selection, not planning

`_planStat` was keyed by plan name alone, so one global number had to hold "baiting wins"
and "baiting loses" simultaneously. He learns the first from `parry_wall` and then baits
into a `gauntlet`. Structurally identical to the Aug 27 finding that `_applyAdaptation`
carried zero opponent terms and converged to the same dials against three opposite
opponents.

Fix under test: key plan value by `_planContext()` — `cold` / `warm` / `hot` / `swarm`,
read off the threat ledger he already maintains. `swarm` is a separate bucket rather than
a hotter `hot`, because with two live attackers every anti-juggle guard in `dealDamage`
fails at once and the right plan changes entirely.

### Isolating the halves: the integration was the harm, not the plans

A plan has two halves — a swing VETO (a decision, routed through the `attack()` choke
point) and STEERING (a movement controller). `_planTick()` runs from `update()` *after*
`super.update()`, i.e. after `updateAI()` has already chosen a velocity using
pathfinding, edge-danger and hazard avoidance. Every frame a plan steered, it discarded
all of that and substituted a naive hold-this-distance rule.

Four configurations, n=108 per arm each:

| Configuration | stocks t | fitness t | taken t | verdict |
|---|---|---|---|---|
| steer + 4 plans, no context | −1.85 | −0.90 | +1.44 | lockout harm **t=+2.33** |
| steer + 4 plans, context-keyed | −1.88 | −1.31 | +1.27 | lockout repaired |
| steer + 3 plans, context-keyed | **−3.10** | **−2.23** | **+2.53** | worst — all significant |
| **veto only, no steering** | −1.25 | −0.27 | +1.02 | **nothing significant** |

Dropping the steering removed every significant harm at once. Damage DEALT was flat in
all four (t between −0.20 and +0.47) — the vetoes never cost him offence. The entire
effect was positional.

**The lesson generalises past Sovereign:** a behaviour layer that writes `vx` after
`updateAI()` has run is not a layer, it is a replacement. Anything that wants to bias
movement has to bias the decision, not overwrite its output. `_airDenyTrack` gets away
with it only because it owns narrowly-scoped airborne frames that `updateAI` has no
opinion about.

### The one robust positive

`bait_whiff_punish` beat `parry_wall` in **4 of 4 independent runs** — +1.75, +0.67,
+0.83 and +1.17 stocks. Across changing plan libraries, changing context keys, and with
steering both on and off. Against an opponent that shields on reaction and punishes
recovery, "only swing into their commitment" is simply correct, and it is the direct
counter to the night's dominant finding that 95% of the hits he takes land mid-swing.

That is the thread worth pulling: not a general plan layer, but **one plan, veto-only,
selected when the opponent reads as a punisher.**

`SMK2_TUNE.tacticPlans` therefore ships OFF. Everything stays wired and flag-gated —
`planSteer`, `planDisengage`, `planHold`, `planExplore` — because this is the only
mechanism built so far that moves match outcomes at all.

---

## 2026-09-20 — The punisher read: also null, and a correction

The narrow design the plan experiment pointed to: no library, no exploration, no
steering — one self-observed read (`_punisherRead`, sampling whether incoming hits land
while he is mid-swing, off the threat ledger's existing new-hit edge) and one veto
through `attack()`. `SMK2_TUNE.baitPunisher`.

| n per arm | fitness | stocks | dealt | taken | locked | holds |
|---:|---|---|---|---|---|---:|
| 108 | ON +80 (t=0.41) | ON +0.29 (t=1.24) | −20 (t=−0.23) | ON −47 (t=−1.23) | ON −0.78 (t=−1.32) | 3492 |
| **234** | OFF +100 (t=−1.25) | OFF +0.06 (t=−0.60) | −13 (t=−0.27) | +4 (t=0.22) | ON +0.67 (t=1.66) | 3326 |

Null. At n=108 every metric favoured ON and it was positive in 8 of 9 scenarios; at
n=234 it is gone.

### The correction that matters more than the result

Across four runs I recorded `bait_whiff_punish` beating `parry_wall` by +1.75, +0.67,
+0.83 and +1.17 stocks and called it "robust in 4 of 4 independent runs." **At 26 seeds
the same comparison is +0.15.**

The OFF arm alone measured 2.25, 2.67, 3.00 and 4.08 stocks on `parry_wall` across those
runs. That scenario has enormous run-to-run variance, and four 12-seed runs agreeing on
its SIGN is much weaker evidence than it feels like — repetition of an underpowered
measurement is not replication. A whole design (`_punisherRead`) was built on that
apparent robustness, and the design is sound; the premise was noise.

**Operating rule for this harness going forward: nothing below n≈200 per arm is a
result.** Three separate effects tonight — the super gate at n=36, the plan layer's early
scenario splits, and this — looked real at 12 seeds and vanished at 26.

---

## Summary: everything tested on 2026-09-20

| Mechanism | Firings | Verdict |
|---|---:|---|
| Grid-driven super release, margin 8 | 1392 | null (t=−0.50 fitness) |
| Grid-driven super release, margin 20 | 1053 | null (t=−0.04) |
| Plan layer, steering, no context | 6368 | **harmful** — lockout t=+2.33 |
| Plan layer, steering, context-keyed | 6865 | negative, lockout repaired |
| Plan layer, steering, 3 plans | 6911 | **harmful** — stocks t=−3.10 |
| Plan layer, veto only | 6922 | null (t=−1.25 stocks) |
| Punisher read, veto only | 3326 | null (t=−0.60 stocks) |

All ship OFF. Everything stays wired behind `SMK2_TUNE` flags.

**What was actually established:** the grid drives nothing (verified in source, the
finding of the night); adaptation at the level of the verb is null twice over; a
behaviour layer that writes `vx` after `updateAI()` has chosen one is a replacement, not
a layer, and measurably harms him; and this harness needs n≈200 per arm before any
number means anything.

---

## 2026-09-20 — WHY everything was null: Sovereign has no decision scorer

The last untested integration point was the correct one: rather than veto an action or
overwrite a velocity, add the grid's learned value as a TERM in the action scorer, which
is how a learned preference is normally expressed. `Fighter.computeUtility()`
([smb-fighter.js:3618](../js/smb-fighter.js#L3618)) is exactly that — it scores every
action and `executeUtilityAI` takes the argmax.

**SovereignMK2 never calls it.** He never calls `executeUtilityAI`, never calls
`super.updateAI()`, and never touches `aiState`. Measured on his `updateAI`:

| | |
|---|---:|
| length | **1980 lines** |
| `if` statements | **372** |
| early `return`s | **70**, spread from line 17 to line 1968 |
| `score` / `utility` / `weight` / argmax constructs | **0** |

His decision procedure is a 1980-line priority cascade. The first branch that matches
wins and returns; most of the function is unreachable on any given frame. It is not a
process that weighs options — it is an ordered list of reflexes.

### This is the root cause of all seven results

A learned quantity can enter a cascade in exactly two ways, and tonight measured both:

| Injection | What it can express | Result |
|---|---|---|
| **Veto** at a choke point (`attack()`) | "not this" — subtract only | null, twice (plans veto-only, punisher read) |
| **Post-hoc override** (writing `vx` after `updateAI`) | "instead, that" — clobber | **harmful**, significantly (stocks t=−3.10) |

Neither can express *"prefer this a little more than that"* — which is the only thing a
learned value IS. A veto cannot promote an action, only remove one. An override does not
adjust a decision, it discards the decision and the context that produced it.

That is why the dials saturate (they scale a fixed reflex harder), why the grid drives
nothing (there is no scorer to read it), why the plan layer harmed him (it could only
clobber), and why the veto experiments were clean nulls (subtraction alone is not
strategy). Seven mechanisms, one cause.

### What would actually be required

Adaptation needs a place where a learned number changes a decision *by degree*. In this
architecture that means giving Sovereign an action scorer — a small one covering the
handful of decisions the cascade currently resolves by ordering (engage / space / guard /
spend), with the cascade retained above it for the genuine reflexes (ringout guard,
off-stage recovery, spawn defence, i-frame vetoes) that must never be outvoted.

That is a real refactor of the largest and most carefully tuned function in the class,
and the CLAUDE.md rule against rewriting large systems applies with full force — the
cascade's ordering encodes years of measured fixes, each of which would have to survive.
It is not a thing to start without a decision. But it is the only change tonight's seven
measurements all point at, and until it exists, every future learning system built for
Sovereign will land in the same two dead ends.

---

## 2026-09-20 — The ledger was scoring the wrong fighter (found by the user)

Two bugs, stacked, in all three ledgers (`_resolveTactic`, `_resolveApproach`,
`_planTick`). The user spotted the first; probing why their fix could not fire exposed
the second, which was hiding it.

**1. Kills scored zero.** `taken = died ? P.hp + 40 : ...` but
`dealt = (lives === P.tLives) ? delta : 0`. His own death cost maximum; his own kill paid
nothing. The comment above the guard explains that respawn makes the health delta garbage
— true, and not a reason to round the reward to 0 rather than to the mirror of the
penalty. Structurally, no ledger could ever learn to close a stock.

**2. The resolver priced the wrong fighter.** `_markTactic` snapshotted `tHp`/`tLives`
but stored **no reference to the booked target**, and `_resolveTactic` read
`this.target` 30 frames later. The trainer re-points at the nearest living bot every
frame, and every bot spawns with identical `lives` — so when the booked target died, the
retargeted bot's `lives` still equalled `P.tLives`, the "they died" guard passed
spuriously, and `dealt` became *bot A's snapshot HP minus bot B's current HP*.

Measured: of 207 resolves across three matches, 201 took the same-lives branch and only 6
(2.9%) detected a lives change. Bug 2 is why bug 1 almost never fired, and why a
multi-opponent scenario fed the grid cross-fighter noise rather than outcomes.

All 13,740 matches of grid data in `data/sov-artifact.json` were produced under both.
**The artifact should be regenerated, not merged into.** Telemetry-derived findings (the
mid-swing result) are unaffected — `SovTelemetry` measures hits directly.

Fixes: booked-target identity in all three ledgers (unconditional), and kill credit
mirroring the death surcharge (`SMK2_TUNE.killCredit`, ON — a correction, not an
addition). Outcome A/B: null, n=234/arm, 500 firings, fitness t=1.28, stocks t=0.66.
Expected — two of the three ledgers have no live reader.

### Tested and NOT supported: that this caused the mirror-match draws

Mirror duels, 32 matches per arm, everything else identical:

| | approach ledger ON | OFF |
|---|---|---|
| draws | 14/32 (43.8%) | 11/32 (34.4%) |
| total damage | 1139 | 773 |
| total deaths | 5.28 | 3.47 |

Draw rate p~0.6, and engagement moved the WRONG way — with the ledger off they fight a
third less. The stalemates are not caused by the ledger. Measured signature is a standoff
(damage by third 520 / 56 / 7 — near-total cessation), not chip-forever.

### Third silent no-op of the night

`_KC()` was referenced at three call sites and **never defined** — the edit that should
have inserted it used a plain string replace with no assertion and silently no-matched.
It threw a ReferenceError on every kill-branch resolve, swallowed by the trainer's
per-fighter `try/catch`, and produced a clean null A/B at n=234 with both arms broken.

Third time tonight a silent no-op produced a believable null (`_isSovereign`, the
unfired gate, this). **Assert every edit, and count every mechanism firing.** A null
without a firing count is not a result.

---

## 2026-09-21 — WHY adaptation does nothing: three of four dials are severed

The dials move (defense 0.45 -> 0.879 -> 0.366 in one match) and the dials do not matter
(0.10 vs 0.90 measured t=-0.28). Both true, so the question is what happens between them.
Measured directly by instrumenting the derived values the fighter actually uses
(`SMK2_TUNE.dialProbe`), ~10,000 decisions per arm across three scenarios:

| Dial | set to | derived value in combat | transmits? |
|---|---|---|---|
| aggression | 0.90 / 0.45 / **0.10** | `effAgg` 0.987 / 0.995 / **0.993** | **NO** |
| spacing | 0.12 / 0.55 / **0.90** | `prefDist` 71.9 / 71.6 / **75.5** | **NO** |
| reactionSpeed | 0.95 / 0.55 / **0.10** | `reactFrames` 1.35 / 2.10 / **1.55** | **NO** (non-monotonic) |
| defense | 0.88 / 0.45 / **0.10** | `effDef` 0.901 / 0.769 / **0.659** | yes |

**aggression**: `effAgg = Math.min(1, m.aggression + microAgg + memoryAgg + memoryPressure
* 0.55)`. The other three addends saturate the clamp on their own — it reads clamped in
77-87% of decisions. An 89% cut in the dial changes the value used by nothing.

**spacing**: `prefDist` sums the dial (`m.spacing * 60`) with eleven other terms and then
EMA-smooths. A 7.5x dial change moves the engagement band 5%.

**reactionSpeed**: `reactFrames = Math.max(0, Math.round(4 - m.reactionSpeed * 3 -
memoryReact * 3))` is **non-monotonic** in the dial — it rises then falls as the dial
drops. At ~10k samples that is not noise: `memoryReact` is compensating for the dial.

### The cause: two stacked adaptation systems, the newer one saturating the older

Every term that drowns the dials — `memoryAgg`, `memoryPressure`, `memoryReact`,
`memorySpacing`, `microAgg` — comes from the newer adaptive-memory layer. `_applyAdaptation`
has been correctly computing updates to a channel the layer above it already pins to its
ceiling. Nothing is broken in either system taken alone; they are wired in series into a
clamp, and the second one wins.

This retro-explains, at one stroke: the Aug 26 A/B where the whole adaptation rework was a
wash against frozen-at-max (t=0.18); the Sep 20 freshDials nulls at both 0.45 and 0.10;
and the mirror duel showing no late-match comeback.

### Also: the shipped game overrides the dials anyway

`applySovereignPeakTuning()` ([smb-menu-startcore.js:488](../js/smb-menu-startcore.js#L488))
hard-assigns 0.94 / 0.90 / 0.08 / 0.98 plus `_limiterBroken`, `_evolutionStage = 2`,
`_intimidation = 0.60`, `_pressureMode = 'suffocate'` at match start. `SMK2Trainer` does
NOT call it, so the A/B results above are valid for the harness — but `freshDials` is inert
in the real game unless peak tuning changes too.

### What this implies for the next build

Fixing the scorer (see the no-decision-scorer entry) is still the structural answer, but
this is cheaper and testable first: either raise the clamp ceilings / rebalance the addend
weights so the dial is a meaningful share, or delete the redundant memory terms and let one
system own each channel. Two systems writing the same clamped value is the bug.

---

## 2026-09-21 — THE FULL DIAL MAP: four independent reasons adaptation cannot matter

Complete trace of an `aiMemory` dial from where it is written to where it reaches the
fighter. Each numbered item is independently sufficient to make the dial inert; all four
are true at once.

### 0. Four separate writers, three firing before the first frame

| # | Writer | Sets | When |
|---|---|---|---|
| 1 | constructor | all four | always |
| 2 | `_applyGenomeToMemory()` via `applyGenome()` | aggression, spacing, reactionSpeed — **not defense** | `SMK2Trainer` line 394, every sim match |
| 3 | `SovDossier.dialPrior()` blend in `_seedFromDossier` | all four, by confidence | when a dossier exists (empty in headless) |
| 4 | `applySovereignPeakTuning()` | all four + `_limiterBroken`, `_evolutionStage`, `_intimidation` | `smb-menu-startcore.js:488`, **real game only** |

**This invalidated the Sep 20 "dials are inert" result.** `freshDials` set the constructor
values and writer #2 erased three of the four before every match. Defense is the one dial
the genome does not touch — and defense was the only one measured to transmit. Same fact,
twice. Fixed: `_applyGenomeToMemory` now honours `freshDials`.

### 1. Convergence is ~3 seconds

Direct per-frame trace from a real match, `freshLevel = 0.10`:

```
f0-4: 0.100    f5: 0.123    f10: 0.144      (~+0.021 per 5-frame adapt cycle)
```

0.10 -> 0.90 extrapolates to ~190 frames. **The "fresh" state lasts 2.6% of a 7200-frame
match.** Starting low cannot matter because it is not a state he is in.

### 2. The attractor is the SAME for every opponent

End-of-match dial values, nine maximally different opponents, 3 seeds each:

| scenario | aggression | defense | spacing | reaction |
|---|---|---|---|---|
| parry_wall | 1.000 | 0.892 | 0.000 | 0.986 |
| attrition_tank | 1.000 | 0.921 | 0.132 | 0.723 |
| glass_cannon | 0.971 | 0.827 | 0.130 | 0.969 |
| untouchable | 0.994 | 0.796 | 0.058 | 0.874 |
| landing_trap | 1.000 | 0.843 | 0.000 | 0.999 |
| gauntlet | 1.000 | 0.876 | 0.000 | 0.998 |
| regenerator | 1.000 | 0.911 | 0.000 | 1.000 |
| escalator | 0.835 | 0.858 | 0.340 | 0.501 |
| noise_control | 1.000 | 0.922 | 0.003 | 0.965 |
| **std dev** | **0.051** | **0.042** | **0.108** | **0.162** |

Seven of nine end at aggression exactly 1.000; four of nine at spacing exactly 0.000. A
turtle, a rusher, a swarm and a healer all produce the same fighter. This is the Aug 27
finding (`_applyAdaptation` has zero opponent terms) confirmed at the mechanism level.

The lone outlier is `escalator`, whose damage scales with time — so adaptation DOES respond
to time-varying pressure. It just never responds to opponent IDENTITY.

### 3. The destination is the ceiling, and 4. the channel is already saturated there

`effAgg = Math.min(1, m.aggression + microAgg + memoryAgg + memoryPressure * 0.55)` reads
**clamped in 89% of decisions** (98% with a low dial). `prefDist` sums the dial
(`m.spacing * 60`) with eleven other terms then EMA-smooths — measured contribution 3.3px
of a 62px result. Every competing term (`microAgg`, `memoryAgg`, `memoryPressure`,
`memoryReact`, `memorySpacing`) comes from the newer adaptive-memory layer: two adaptation
systems wired in series into one clamp, and the second one wins.

### What would actually have to change

Fixing any single item above changes nothing, because the other three still hold. In
priority order:

1. **Give `_applyAdaptation` opponent terms** (item 2) — without this, nothing else matters,
   because a system with one destination is not adapting regardless of how it gets there.
2. **Unsaturate the channel** (items 3-4) — rebalance the addend weights or let one system
   own each value, so a dial difference survives the clamp.
3. Slow convergence (item 1) only matters once the destination differs.
4. Reconcile the four writers (item 0) so a deliberate starting state is not erased.

---

## 2026-09-21 — The opponent term existed, was correct, and was being thrown away

Following the dial map: `_applyAdaptation` **already has** opponent-conditioned offsets
(`_oppAdaptTerms()` -> `OT(k)`, added after the Aug 27 finding). They were never the
problem. They were unreachable.

### The measurement

Pre-clamp aggression target vs the ease() ceiling of 1.0:

| scenario | mean target | % at/over ceiling | mean \|OT\| | % OT != 0 |
|---|---|---|---|---|
| parry_wall | 1.133 | 84.6 | 0.218 | 97.6 |
| gauntlet | 1.891 | 87.7 | 0.000 | 4.7 |
| regenerator | 1.096 | 84.6 | 0.039 | 97.6 |
| untouchable | 1.089 | 30.4 | 0.010 | 8.9 |
| **escalator** | **0.845** | **17.6** | **0.145** | **97.6** |

`OT` is non-zero in 97.6% of cycles and reaches 0.218 against parry_wall — 62% of its
+-0.35 cap. It is simply added to a target that already exceeds the ceiling.

**The control is inside the measurement**: escalator is the only scenario with target
headroom, and it was the only scenario whose converged dials differed (previous entry).
The opponent term works precisely where it is allowed to reach.

### The fix needs BOTH halves, and neither works alone

- **Budget the self terms** (`SQ()`, tanh-squashed, `SMK2_TUNE.oppAdapt`): alone this did
  nothing — aggression spread 0.051 -> 0.050. Because `B.aggression` is 0.90, even a
  budgeted +0.18 hits the ceiling before OT is added.
- **Lower the baseline** alone: overwritten in ~3s by a still-saturated target.
- **Together** (`SMK2_TUNE.adaptV2`, baseline 0.60): aggression spread **0.051 -> 0.107**,
  and only 2 of 9 opponents end at the ceiling instead of 7 of 9.

The differentiated reads are sensible, which matters more than the spread:

| scenario | aggression | spacing | read |
|---|---|---|---|
| glass_cannon | 0.72 | 0.323 | backs off a fragile high-damage opponent |
| gauntlet | 1.00 | 0.000 | full pressure into a swarm |
| escalator | 0.739 | 0.340 | cautious vs scaling damage |
| noise_control | 1.00 | 0.000 | commits |

### Outcome: null in aggregate, and the reason is legible

n=234/arm: stocks t=0.08, fitness t=0.66. But per scenario:

| helps | hurts |
|---|---|
| glass_cannon **+0.69** stocks | gauntlet **-0.77** |
| landing_trap **+0.62** | regenerator -0.23 |
| parry_wall +0.08 | untouchable -0.19 |

He differentiates correctly against single opponents and confidently WRONG against the
swarm — going to aggression 1.000 against four simultaneous attackers.

**Cause: `_oppAdaptTerms()` is single-target.** It opens `const t = this.target;` and has
zero multi-entity references in its entire body. It reads one of four attackers and adapts
as though it were a duel. This is the same blind spot as the attacker-keyed anti-juggle
guards in `dealDamage`, and the same one `_planContext`'s `swarm` bucket was built for.

### Next step

Add an attacker-count term to `_oppAdaptTerms` — with 2+ live attackers the aggression
offset should invert. That is the one scenario group dragging adaptV2 to null; the
single-opponent half of the library is already positive.

`SMK2_TUNE.adaptV2` ships OFF pending that.

---

## 2026-09-21 (cont) — Opponent adaptation switches itself OFF in crowds

Found while debugging why the attacker-count term never fired. In `gauntlet`,
**1687 of 1788 calls (94%) to `_oppAdaptTerms()` returned null.** The guard
`const r = this._oppRates(); if (!r) return null;` rejects them: `_oppRates()` needs
sustained observation of ONE target, and in a crowd he re-targets before it accumulates.

The earlier OT table had been saying this and I misread it — OT non-zero in **97.6%** of
cycles against parry_wall vs **4.7%** against gauntlet. That was not "the term is small
here", it was "the system is off here".

So the entire opponent-adaptation layer disables itself in exactly the situation with the
most distinct correct answer. Fixed: attacker count is computed BEFORE the per-opponent
guards and returned even when the kit/behaviour half has nothing to say.

### Isolated swarm term: null

`SMK2_TUNE.swarmTerm` (gated separately — `_oppAdaptTerms()` feeds BOTH A/B arms, so an
ungated term there changes the control), tested with `adaptV2` held on in both arms via
the harness's new `--also`. n=234/arm, 123,427 firings:

| metric | ON | OFF | t |
|---|---|---|---|
| fitness | 817.77 | 794.68 | 0.22 |
| stocks | 2.99 | 2.91 | 0.54 |
| taken | 450.07 | 465.17 | -0.74 |
| lockout % | 8.72 | 9.37 | **-1.53** |

`gauntlet`, the scenario it was designed for, barely moved (1.73 vs 1.77). Gains landed
elsewhere: landing_trap +0.42, regenerator +0.24, untouchable +0.23.

## The instrumentation record, stated plainly

**Five times in this session a firing counter read zero for the wrong reason**, each
producing a clean, believable null:

| # | Cause |
|---|---|
| 1 | `players.find(p => p._isSovereign)` — that property does not exist |
| 2 | `_KC()` referenced at 3 sites, never defined; threw into a swallowing try/catch |
| 3 | `_swarmSeen = _live` was a snapshot; read at match end after opponents died |
| 4 | Harness had no case for the flag; fell through to an unrelated counter |
| 5 | Swarm term ungated inside `_oppAdaptTerms()` — changed BOTH arms (caught by the OFF arm not reproducing between runs: gauntlet 2.85 -> 1.92) |

The rule from the first one ("always surface a firing count") was necessary and nowhere
near sufficient — the counter is itself code that can be wrong. What actually caught these
was asking whether the number was PLAUSIBLE, and whether the CONTROL ARM REPRODUCED.

## Standing tally: ten mechanisms, zero wins

superGate x2, tacticPlans x4, baitPunisher, killCredit, freshDials x3, adaptV2, swarmTerm.
Every one null or harmful on outcomes at n>=234/arm. The mechanistic understanding
improved enormously and several real bugs were fixed — but "add a mechanism, A/B it" has
now produced ten consecutive nulls, which is itself the result: either the sim is
insensitive to this class of change, or Sovereign sits at a local optimum that small
additions cannot improve. Further single-mechanism A/Bs are low expected value.
