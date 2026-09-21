# Sovereign Lab Log

The research loop that replaced VECTOR. VECTOR could propose a scenario but never
change the fighter, so 243 confirmed findings produced zero fixes. This loop closes
that end: every experiment is a set of `SMK2_TUNE` flags, both arms run the same
scenarios at the same seeds in the same page, and a losing arm is discarded on
measurement rather than judgement.

**Branch:** `lab/sovereign-loop`. Nothing committed. Every kept change stays
flag-gated and defaults OFF until it wins twice.

**Rig:** `node tools/sov-lab.js --flags=a,b --set=k:v --label=name --seeds=N`
Reports three families, because September's experiments kept reporting "the
mechanism never fired" and "it fired and did not help" as the same null:

- **OUTCOME** — stocks, fitness, damage dealt/taken, locked%. Paired t across matched seeds.
- **BEHAVIOUR** — `sovCommitLog()` distribution shift (L1, in percentage points).
- **ADAPTATION** — per-dial travel within a match, and endpoint spread across scenarios.

Raw results land in `data/lab/`.

---

## Cycle 1 — adaptation headroom (`adaptV2` + `oppAdapt` + `swarmTerm`)

18 matches/arm, seeds=2 over the full scenario library.

**Why:** the shipped fighter starts every dial at 88–95% of its own max, so a stress
scenario cannot show adaptation failing — there is no travel to grade. `adaptV2`
(base 0.60) plus the self-term budget was already built and defaulted OFF.

| metric | base | treat | delta | t |
|---|---|---|---|---|
| stocks | 3.2 | 2.7 | **−0.556** | **−1.97** |
| fitness | 678 | 803 | +125 | 0.56 |
| dealt | 704 | 931 | **+228** | 1.88 |
| taken | 420 | 497 | +77 | 1.71 |
| locked% | 8.2 | 8.2 | −0.02 | −0.01 |

Adaptation travel: aggression 0.092 → 0.133, reactionSpeed 0.031 → **0.091 (3×)**.
Endpoint spread across scenarios: aggression 0.0104 → **0.0314 (3×)**.
Behaviour L1 = 6.5 pts; `punish_mode` +1.19, `volley_cycle_a` −1.14.

**Verdict: mechanism CONFIRMED, outcome NEGATIVE — keep OFF, keep investigating.**

This is the first result in this line of work that is not a null. The headroom fix
works exactly as its author claimed: the dials travel, and for the first time the
endpoints differ by opponent instead of every fight converging on the same values.
He converts that into real aggression — **+32% damage dealt** — and then gives back
more than he gains: +18% damage taken and roughly half a stock per match.

So the September nulls and this are different failures. Those mechanisms never moved
anything. This one moves damage, behaviour and adaptation, and still loses. That is
a tractable problem: he now has room to adapt and spends all of it in one direction.

**Open question for cycle 2:** where do the extra deaths come from? If they are
ringouts or punished landings, this is the Sep-10 finding again (126 of 127 hits he
took landed airborne or in landing recovery) and `_airApproachGuard`'s `airDenyAt`
is the existing knob — it may simply need to be stricter once he is this aggressive.
If they are ordinary trades, the headroom base is too low and 0.60 → 0.70 is the test.

---

## Cycle 2 — stricter air-approach veto (`airDenyAt` −4 → −1), on top of headroom

Ran it. The result is methodological, not tactical, and it retracts cycle 1.

| metric | base | treat | delta | t |
|---|---|---|---|---|
| stocks | 3.2 | 2.9 | −0.333 | −1.19 |
| dealt | 882 | 869 | −14 | −0.25 |
| taken | 435 | 476 | +42 | 1.03 |

The tell was the **baseline** arm, which is the same shipped config at the same
seeds in both cycles and should therefore be identical. It was not:

| | cycle 1 base | cycle 2 base |
|---|---|---|
| mean damage dealt | 703.5 | 882.2 |
| worst fitness | −763 | −347 |
| `untouchable` dealt | 140 | 992 |
| `gauntlet` stocks | 2 / 0 | 2 / 3 |

**3 of 18 matches reproduced.** The scenario seed controls loadout picks only —
every other decision in the sim reads an unseeded `Math.random()`. So `pairedT`
was pairing scenario *labels*, not match realisations, and cycle 1's t=−1.97 came
out of that noise.

**Retracted: "headroom costs half a stock a match."** Not established either way.

**Still standing:** the adaptation metrics reproduce across the two baseline runs
almost exactly — aggression endpoint spread 0.0102 vs 0.0104, reactionSpeed travel
0.0310 vs 0.0307. Those are stable because they average thousands of per-frame
samples rather than 18 match outcomes. So "the shipped dials have no travel" holds,
and so does "`adaptV2` roughly triples travel and endpoint spread." What does *not*
hold is any claim about what that does to stocks.

**Fix applied:** `sov-lab.js` now installs a seeded mulberry32 as `Math.random` at
the start of each arm and restores the real one after, so both arms draw from the
same stream from the same starting state.

**Cycle 3 is an A/A null check** — both arms the shipped config, nothing changed.
If determinism holds, every one of the 18 matches must be identical and every delta
exactly zero. If it does not, the rig cannot measure what this loop is asking it to
and no outcome number from it means anything until that is fixed.

### Standing lesson for this log
Outcome metrics on 18 matches are noise-dominated. Behaviour (`sovCommitLog`, tens
of thousands of frames) and adaptation (per-frame dial sampling) are not. Prefer
them, and never report an outcome t without an A/A run bounding the noise floor.

---

## Cycle 3 — A/A null check: **FAILED**

Both arms the shipped config, nothing changed between them. Every delta should be
exactly zero. None of them were:

| metric | arm 1 | arm 2 | delta | t |
|---|---|---|---|---|
| stocks | 2.9 | 3.3 | **+0.389** | 1.28 |
| fitness | 583 | 860 | **+276** | 0.95 |
| taken | 515 | 450 | **−65** | −1.15 |
| behaviour L1 | — | — | **6.8 pts** | — |

**This is the noise floor, and it is as large as every effect measured so far**
(cycle 1 stocks −0.556, cycle 2 −0.333; cycle 1 behaviour L1 6.5, cycle 2 8.7).
Nothing this loop has produced is yet distinguishable from running the same build
against itself.

Seeding `Math.random` was not sufficient, and the residual is not symmetric noise —
every metric moved in favour of the arm that ran **second**. That is a bias with a
direction, so it has a cause.

**Cause: `SovDossier`.** It persists opponent-keyed dials, loadouts and grids to
localStorage across matches, and `_dossierSeed` (smb-smk2-class.js:903–947) re-seeds
the next Sovereign from them — including `dialPrior()`, which sets the very numbers
the ADAPTATION panel samples. The treatment arm always ran second, so it always
started having already learned from the baseline arm's 18 matches.

This is almost certainly not confined to this rig. Any harness that block-runs two
arms in one page and does not clear the dossier has the same ordering bias, and
several of the September experiments were shaped that way.

**Fix applied:** `SovDossier.reset()` at the start of every arm.

Cycle 4 re-runs the A/A. The gate to resume real experiments is an A/A whose deltas
are all zero — or, failing exact determinism, a documented noise floor that any
future claim must clear by a wide margin.

---

## Cycles 4–5 — A/A null check: **PASSED**

| | A/A #1 | A/A #2 (dossier reset) | A/A #3 (+ fresh page per arm) |
|---|---|---|---|
| stocks delta | +0.389 | −0.111 | **0** |
| fitness delta | +276 | −145 | **0** |
| dealt delta | +5 | −46 | **0** |
| taken delta | −65 | −25 | **0** |
| behaviour L1 | 6.8 pts | 11.8 pts | **0.0 pts** |
| adaptation | drifted | drifted | **identical to 4 dp** |

Three causes, stacked:

1. **Unseeded RNG.** The scenario seed picks loadouts; everything else read the
   native `Math.random()`. Fixed with a seeded mulberry32 installed per arm.
2. **`SovDossier` cross-match memory.** Persists opponent-keyed dials, loadouts and
   grids to localStorage and re-seeds the next Sovereign through `dialPrior()`. The
   second arm always inherited the first arm's 18 matches. Fixed with
   `SovDossier.reset()` per arm — this is what removed the *directional* bias.
3. **Residual page state.** Never isolated. Fixed structurally instead: each arm now
   gets its own fresh page. Cheap next to ten minutes of sim, and it is the only
   starting condition that can actually be asserted.

**The rig is now deterministic.** An A/A returns exact zeros on every panel.

### What this invalidates
The A/A noise floor before the fix was ±0.39 stocks and ~7–12 points of behavioural
L1. Cycle 1 measured −0.556 stocks / 6.5 L1 and cycle 2 −0.333 / 8.7. **Neither
cleared the floor.** Both are withdrawn.

This is unlikely to be confined to this rig. Any harness that block-runs two arms in
one page without clearing the dossier carries the same ordering bias in favour of
whichever arm runs last, and several September experiments were shaped that way.
Results from them that came back "null", "non-positive" or "fired but did not help"
are worth re-running here before being treated as settled.

### What survives
The adaptation panel reproduced exactly across separate process runs even *before*
the fix, because it averages per-frame samples rather than 18 match outcomes. So:
shipped dials have no travel, and `adaptV2` restores it. Its effect on winning
remains unmeasured — cycle 6 is that measurement, on the clean rig at seeds=4
(36 matches/arm).

---

## Cycle 6 — headroom, re-run on the clean rig (36 matches/arm)

`adaptV2` + `oppAdapt` + `swarmTerm`, A/A floor now exactly zero.

| metric | base | treat | delta | t |
|---|---|---|---|---|
| stocks | 2.9 | 3.1 | **+0.222** | 1.11 |
| fitness | 633 | 663 | +30 | 0.18 |
| dealt | 796 | 787 | −8 | −0.17 |
| taken | 488 | 463 | −25 | −0.72 |

**The sign flipped.** On the contaminated rig headroom measured −0.556 stocks; on the
clean rig it is +0.222. Not significant, but no longer negative, and damage taken
moved slightly in his favour rather than against him.

### Adaptation — much larger than the flag's author claimed

| dial | travel base → treat | endpoint spread base → treat |
|---|---|---|
| aggression | 0.079 → **0.197** (2.5×) | 0.021 → **0.138** (6.5×) |
| reactionSpeed | 0.024 → **0.100** (4×) | 0.005 → **0.049** (9×) |
| spacing | 0.082 → 0.118 | 0.028 → 0.063 |
| defense | 0.167 → 0.169 | 0.058 → 0.051 |

The authoring note cited aggression spread 0.051 → 0.107. Clean, it is 0.021 → 0.138.
He now finishes different fights in genuinely different places.

### Per-scenario — the result is opponent-dependent, which is the point

| scenario | Δ stocks | Δ dealt | Δ taken |
|---|---|---|---|
| gauntlet | **+1.50** | +138 | **−210** |
| glass_cannon | +0.75 | 0 | −148 |
| regenerator | +0.75 | +90 | −146 |
| attrition_tank | +0.50 | −118 | −68 |
| untouchable | +0.50 | +13 | −17 |
| noise_control | 0.00 | 0 | +17 |
| escalator | −0.25 | +38 | +43 |
| parry_wall | −0.50 | +84 | +102 |
| landing_trap | **−1.25** | **−320** | **+197** |

5 improved, 3 worsened. The flag's author predicted "backs off glass_cannon, swarms
gauntlet" — those are the top two wins, arrived at independently here. The mechanism
does what it was designed to do.

**Verdict: mechanism CONFIRMED and large. Outcome neutral-to-positive, not
significant. Stays OFF pending a second win, but it now costs nothing.**

### The failure has a name
Both losses are punish archetypes. `landing_trap` and `parry_wall` do not threaten
him with damage flow — they wait for a commitment and convert it. His adaptation
reads incoming damage, so a patient puncher registers as *safety*, and he answers
by adapting toward more aggression: exactly into the punish. Against `landing_trap`
he deals 320 less and takes 197 more.

**He adapts on damage flow, not on whether his commitments are being punished.**

Cycle 7 tests the obvious pairing: `baitPunisher` is the one mechanism in the tree
already measured to beat `parry_wall` (4 of 4 independent runs, per its own note in
SMK2_TUNE), and parry_wall is now a known headroom loss. Running
`adaptV2 + oppAdapt + swarmTerm + baitPunisher`.

---

## Cycle 7 — headroom + `baitPunisher`: **REJECTED**

| metric | headroom alone | + baitPunisher |
|---|---|---|
| stocks | +0.222 | **+0.028** |
| fitness | +30 | **−93** |
| taken | −25 | +4 |

Per-scenario, against the two archetypes it was added to fix:

| scenario | headroom | + bait |
|---|---|---|
| parry_wall | −0.50 | **−0.50** (unchanged) |
| landing_trap | −1.25 | **−1.25** (unchanged) |
| escalator | −0.25 | **−1.00** (worse) |
| noise_control | 0.00 | **−0.75** (worse) |

It did not touch either punish archetype and it cost two others. Net negative on
top of headroom. Stays OFF; nothing to revert, since the flag-gating protocol means
a rejected experiment was never live.

**The "4 of 4 vs parry_wall" claim does not reproduce.** That result predates the
rig fixes and is exactly the shape the ordering bias manufactured — second arm,
block-run, no dossier reset. It should be treated as withdrawn rather than as
evidence, along with the rest of the pre-fix September measurements.

Note what this rules out: the punish-archetype failure is **not** answerable by a
behavioural rule bolted on beside the adaptation. "Only swing into their commitment"
is the right idea and it changed nothing, because the dial driving him into the
punish keeps climbing regardless. The diagnosis from cycle 6 stands and points at
the adaptation *signal* rather than at a tactic: aggression is driven by damage
flow, and a patient puncher produces no damage flow.

## Cycle 8 — reproduce headroom at 72 matches/arm (running)

Headroom is the only surviving candidate and its outcome effect is weak (+0.222,
t=1.11). The protocol requires a win to reproduce before a flag flips on. Same
flags, seeds 4 → 8.

---

## Cycle 8 — headroom reproduces: **KEPT, flags flipped ON**

72 matches/arm, A/A floor exactly zero.

| metric | n=36 | n=72 | t (n=72) |
|---|---|---|---|
| stocks | +0.222 | **+0.208** | 1.52 |
| fitness | +30 | **+267** | **2.28** |
| dealt | −8 | **+102** | 1.85 |
| taken | −25 | **−34** | −1.34 |

Stocks reproduce almost exactly across two independent runs. Fitness clears
significance. No metric is negative. Adaptation restoration reproduces and is large:
aggression endpoint spread 0.019 → **0.122**, reactionSpeed 0.003 → **0.041** (14×).

`adaptV2`, `oppAdapt` and `swarmTerm` are now **ON by default** in `SMK2_TUNE`
(smb-smk2-class.js). First mechanism in this tree to earn it. Revert is three
booleans.

### Correction to cycle 6
Cycle 6's per-scenario table had **4 matches per cell**, and I built a causal story
on it: "he adapts on damage flow, so patient punishers read as safety." At 8 seeds
that pattern largely dissolves:

| scenario | n=4 | n=8 |
|---|---|---|
| parry_wall | −0.50 | **+0.50** |
| landing_trap | −1.25 | **−0.13** |
| gauntlet | +1.50 | +0.13 |
| glass_cannon | +0.75 | **+1.63** |
| untouchable | +0.50 | −0.38 |

Only `glass_cannon` survives as a large effect, and it grew. The punish-archetype
failure is **not established** — two of the three cells that produced it flipped
sign. Withdrawn.

The rig-level lesson from cycles 3–5 applies one level down: aggregate metrics at
n=72 are trustworthy, but a per-scenario *cell* at n=4–8 is still noise-dominated.
Per-scenario claims need their own floor. Treat the breakdown as hypothesis
generation only, never as a finding.

### Standing rule added
A causal story about *which opponents* a change helps requires per-cell n large
enough to bound that cell, not just the aggregate. Cycle 6 violated this and cycle 8
caught it.

---

## Cycle 9 — `superGate` re-tested on the clean rig: strongest result yet

72 matches/arm, baseline now includes the kept headroom flags.

| metric | base | treat | delta | t |
|---|---|---|---|---|
| stocks | 3.1 | 3.5 | **+0.431** | **2.84** |
| fitness | 750 | 1147 | **+397** | **3.13** |
| taken | 452 | 391 | **−62** | **−2.36** |
| dealt | 822 | 868 | +46 | 1.37 |
| worst scenario fitness | −909 | **+264** | — | — |

Three metrics clear significance in the same direction, and his *worst* scenario
goes from −909 to positive for the first time in this log.

### What this flag is
`_gridWantsSuper` is the **only mechanism in the codebase that reads the learned
tactic grid** — the one gate the artifact's 19,680 trained matches can flow through
to the fighter. Its own note in `SMK2_TUNE` records it as measured null: *"margin 8
fired 1392 times across 144 matches/arm, fitness t=−0.50, stocks t=−0.09."*

That measurement predates the rig fixes. On a deterministic rig it is t=+2.84.

Two candidate explanations, not yet separated:
1. The original null was an artefact of the ordering bias (cycles 3–5).
2. `superGate` only works *with* headroom — the grid's opinion is worth acting on
   only once the dials can express it. Cycle 9 has headroom on in both arms, so
   this run cannot distinguish them.

Separating those is worth a later cycle: run `superGate` alone against a
headroom-off baseline. If it measures null there, the two are genuinely coupled and
that is a real finding about why single-mechanism A/Bs kept failing.

### Rig change
Determinism means re-running a config at the same seeds replays it exactly, so a
reproduction needs disjoint seeds. Added `--seedoffset`, which reproduces
`sweep()`'s own seed formula with an offset. Offset 0 is identical to `sweep()`;
cycle 10 runs offset 8 for a fully independent 72 matches.

Caveat: the lab now computes `worst` as min fitness across runs, where `sweep()`
used min of per-scenario means. `worst` is comparable within this log from cycle 10
onward, not against cycles 1–9.

## Cycle 10 — `superGate` reproduction on disjoint seeds (running)

---

## Cycles 10–11 — `superGate` does not reproduce. **The rig's real limit, measured.**

Three independent 8-seed estimates of the same flag, disjoint seeds, deterministic rig:

| seeds | Δ stocks | per-match t | clustered t |
|---|---|---|---|
| 1–8 | **+0.431** | 2.84 | 2.37 |
| 9–16 | **−0.292** | −1.88 | −1.84 |
| 17–24 | **−0.278** | −1.85 | −1.85 |

Mean **−0.046**, SD **0.414**. The effect is indistinguishable from zero. Cycle 9's
"strongest result yet" was one draw.

### Two separate errors, both mine

**1. Per-match t-tests on clustered data.** 72 matches from 9 scenarios are 9
clusters of 8, not 72 independent observations. Scoring per-match inflates t by
roughly √(cluster size). `pairedT` is replaced with `clusteredT`, which collapses
each scenario to its mean delta and tests across scenarios.

**2. A "reproduction" on overlapping seeds.** Cycle 8 re-ran headroom at seeds 1–8
after cycle 6 ran seeds 1–4. Same sample, larger slice — not independent evidence.
`--seedoffset` now exists so reproductions are genuinely disjoint.

### The noise floor, and what it costs to beat

SE of a single 8-seed run ≈ **±0.41 stocks**. Every mechanism in this tree produces
effects of 0.2–0.4 stocks, i.e. **entirely inside the noise of one run.**

To resolve a 0.2-stock effect at t≈2 needs SE ≈ 0.1, so ~17× the data:
~136 seeds, ~1,200 matches/arm, **roughly 7 hours per arm**. Averaging k independent
offsets cuts SE by √k — 3 offsets gives ±0.24, 16 gives ±0.10.

**This reframes the project's whole history.** 243 VECTOR findings, seven mechanisms
"measured null or non-positive", an artifact trained on 19,680 matches — a
measurement that cannot resolve ±0.41 stocks produces exactly that record whether
the mechanisms work or not. The nulls were never evidence of absence.

### Reverted
`adaptV2` / `oppAdapt` / `swarmTerm` flipped back to `false`. Kept on cycle 8's
non-independent reproduction; clustered t was 0.82 and 1.07, never significant.

### Protocol change
Outcome metrics are too expensive to be the loop's primary readout. Behaviour
(`sovCommitLog`, ~50k frames) and adaptation (per-frame dial sampling) resolve
precisely in a single 25-minute run and reproduce to four decimals. **Score
candidates on those; spend the 7-hour outcome test only on a finalist.**

Unaffected by any of this: shipped dials have no travel, and `adaptV2` restores it
(aggression endpoint spread 0.019 → 0.122, reproduced at three offsets). That is a
per-frame measurement, not an outcome one.

## Cycle 12 — headroom at offsets 8 and 16 (running)
Gives headroom three independent estimates so it can be judged at SE ≈ ±0.24
instead of ±0.41.

### Cycle 12 result — headroom, three independent estimates

| seeds | Δ stocks |
|---|---|
| 1–8 | +0.208 |
| 9–16 | −0.403 |
| 17–24 | −0.236 |

Mean **−0.144**, SE **0.185**, t = −0.78. 95% CI roughly **[−0.51, +0.22]**.
Indistinguishable from zero with a slight negative lean. The revert was correct.

Adaptation, same three runs — the contrast is the whole point:

| | baseline | with adaptV2 |
|---|---|---|
| aggression endpoint spread (off 0) | 0.0193 | **0.122** |
| aggression endpoint spread (off 16) | 0.0107 | **0.1145** |
| aggression travel (off 16) | 0.0593 | **0.2111** |
| reactionSpeed spread (off 16) | 0.0052 | **0.0505** |

The treated values agree to within 7% across disjoint seeds while the *outcome*
estimates from the identical runs swing across a 0.6-stock range. One family of
metric is measuring something; the other is measuring the seed.

**Final verdict on headroom: it robustly restores opponent-specific adaptation at
~10× the endpoint spread, and has no outcome effect this rig can detect. Whether
its true outcome cost is zero or half a stock is unresolved and would take ~7 hours
per arm to settle.** That is a design judgement, not a measurement one. Left OFF.

---

## LOOP HALTED — the stated criterion cannot be evaluated

The mandate was "keep only what measures positive on stocks." Cycles 10–12
established that a stock effect below ~0.4 is invisible in one run and below ~0.2
in three, while every mechanism in this tree produces effects in exactly that band.
So the criterion cannot be applied at any cadence this loop can sustain, and
continuing to spend 25-minute cycles on it would manufacture more cycle-9s —
nominally significant results that reverse on the next seed set.

Three ways forward, none of which the loop should pick on its own:

1. **Pay for it.** ~136 seeds per arm, ~7 hours per candidate, a handful of
   candidates a night. Slow, but the criterion survives intact.
2. **Change the criterion** to behaviour and adaptation, which resolve to four
   decimals in 25 minutes. Fast and reproducible, but it scores what he *does*
   rather than whether he *wins* — and the two have now been shown to come apart.
3. **Reduce the variance at its source.** Stocks over 9 heterogeneous scenarios is
   a coarse, high-variance outcome. Longer matches, more stocks per match, or a
   continuous per-frame outcome proxy would shrink the floor far more cheaply than
   adding seeds.

Option 3 is the one that would make options 1 and 2 unnecessary, and it is the only
one that attacks the actual problem.

---

# PHASE 2 — full mandate: make him actually adapt, and better

## Correction: the 7-hour cost estimate was wrong by two orders of magnitude

A lab block (72 matches/arm) takes **~0.5 minutes**, not the ~12 I assumed when I
never timed one. With `tools/sov-run.js` running 5 blocks concurrently on 10 cores,
**20 independent blocks — 1,440 matches per arm — cost 1.9 minutes of wall clock.**

That collapses SE from ±0.41 (1 block) to **±0.06** (20 blocks). Every conclusion in
cycles 10–12 that an effect was "unresolvable" was a conclusion about a budget that
did not exist. The loop was never compute-bound; it was bound by my own estimate.

`tools/sov-run.js` is the parallel driver: N independent blocks on disjoint seeds,
pooled at `--jobs`, reported as mean ± SE with the per-block spread printed so a
single outlier block is visible rather than averaged away.

## Fix 1 — `volleyArmedRead`: the standoff must be earned

`_volleyCyclePosture` read `armed` as `abilityCooldown === 0 || superReady` — i.e.
an opponent whose ability is merely *available*. That is the resting state of anyone
who is not currently pressing it, and it made the two standoff branches win **47.7%
of every decision frame in the match**.

Now `_observeTargetThreat()` watches the opponent's cooldown for a 0 → positive
transition, which only happens when the ability is actually spent, and the standoff
applies only to an opponent who has demonstrated they use it (within ~15s). He eats
the first one and respects it afterwards.

**20 blocks, 1,440 matches/arm:**

| metric | delta | SE | t |
|---|---|---|---|
| stocks | **+0.161** | 0.057 | **2.81** |
| damage taken | **−33.4** | 8.6 | **−3.87** |
| locked % | +1.17 | 0.19 | 6.18 |

Behaviour L1 shift **118 points** — the largest in this log by an order of magnitude:

| branch | shift |
|---|---|
| volley_cycle_b | **−29.2 pts** |
| volley_cycle_a | **−19.2 pts** |
| guaranteed_punish | **+16.2 pts** |
| anti_exploit | +8.6 |
| corner_exploit | +8.8 |
| punish_mode | +7.3 |
| hop_steer | +6.4 |

He stops retreating from a threat that never arrives and spends those frames
punishing instead. He is stunned slightly more often — the honest cost of engaging —
and still takes 33 less damage per match and wins more stocks.

**KEPT.**

## Fix 2 — `tacticChoice`: opponent-conditioned tactic SELECTION

Everything he learned before this changed intensity, never choice. `aiMemory` moves
four dials; `_tacticGrid` books five coarse verbs and has two live readers. Against
a turtle and against a rusher he ran the identical cascade in the identical order.

The `_commit` vocabulary from earlier today gives 59 named branches. `tacticChoice`
books **the branch that actually won the frame**, priced by net health over its
window, keyed by **opponent archetype** (`SovDossier.archetype`) and situation, and
lets a branch *yield* when it measurably loses against this opponent — the cascade
then continues to whatever is next.

It is a yield, never an override. The branch that ends up running is still a real
branch with its pathfinding, edge checks and hazard avoidance intact. Every prior
attempt at this layer wrote `vx` itself after `updateAI()` and measured as
positional harm; nothing here writes movement.

Applied to `corner_exploit`, `punish_mode`, `bait`, `platform_control`,
`breathing_room`, `mid_approach_evasion`. Not applied to `guaranteed_punish` or
`anti_exploit` — free damage on a helpless target and a forced safety response are
not choices worth second-guessing.

**Verified firing before measuring** (the `swingGate` lesson — it shipped inert and
fired zero times in six runs). Four matches: **253 yields, 612 bookings, 241 cells,
opponents distinguished as `turtle` / `zoner` / `mixed`.** Prices are sane:
`guaranteed_punish` +10.2 net health per commit, `punish_mode` +3.2, `air_descent`
−0.4, `hop_steer` −9.6.

### `volleyArmedRead` — a falsy-zero bug caught by unit-probing the observer

`_volleyThreatDemonstrated()` read `this._tgtAbilityLastUse || -99999`. `frameCount`
is 0 on the first frame of a headless match, so an ability observed at frame 0 is
falsy and the fallback fired on a **real** observation — the threat was forgotten
the instant it was seen. Fixed with an explicit `=== undefined` check.

The sim never exposed it (its bots never spend abilities at all, so `uses` stays 0
and the gate is inert either way). Only unit-probing the state machine directly
found it. Verified behaviour now:

| opponent state | posture |
|---|---|
| ability up, never used | `null` — engages |
| just spent it | `window` — all-in |
| recharged, threat proven | `standoff` — respects it |
| ~20s since last use | `null` — forgets, re-engages |
| *old code, never used* | *`standoff` — retreats from nothing* |

`window` posture — the "all-in during their cooldown" half of the original design —
now occurs at all. It fired **zero times in 23,142 calls** before this.

**Caveat on the +0.161:** the scenario library's bots never spend an ability, so in
the sim this flag effectively disables the standoff rather than conditioning it. The
measured gain is real for opponents who do not burst, and the state machine is
verified correct for opponents who do, but the sim cannot price the case the
standoff was written for.

## Fix 3 — headroom re-measured properly

20 blocks, 1,440 matches/arm: stocks **+0.033 ± 0.065 (t=0.52)**. Genuinely neutral,
now resolved rather than assumed. Cycle 12's "−0.144" and cycle 8's "+0.208" were
both three-block noise.

So headroom is **free**: it costs nothing in outcomes and buys ~10× the
opponent-specific adaptation spread. That is the "make him actually adapt"
requirement, at no measured price.

### Operational lesson: never edit `SMK2_TUNE` while a measurement is in flight

Flipped `volleyArmedRead`/`adaptV2` to their new defaults while a 20-block
`tacticChoice` run and a 60-block `superGate` run were mid-flight. Each block is a
fresh page load, so blocks that started before the edit loaded the old defaults and
blocks after it loaded the new ones — **one run, two different baselines**, averaged
together. Both runs killed and their outputs deleted rather than interpreted.

The rig is deterministic per block but the *source on disk* is shared mutable state
across blocks. Edits and measurements have to be serialised.

## Fix 4 — `superGate` at 19 blocks

stocks **+0.099 ± 0.064 (t=1.54)**, locked **−0.31 ± 0.15 (t=−2.03)**. A near-miss.
Its own note in `SMK2_TUNE` recorded it as null (fitness t=−0.50, stocks t=−0.09)
from the pre-fix era; it is at least not that. Re-running at 40 blocks on the new
baseline to settle it.

## Fix 4 (settled) — `superGate` ON

40 independent blocks, **2,880 matches/arm**:

| metric | delta | SE | t |
|---|---|---|---|
| stocks | **+0.059** | 0.024 | **2.48** |
| locked % | **−0.28** | 0.13 | **−2.13** |
| damage dealt | −20.7 | 9.3 | −2.21 |
| damage taken | −6.3 | 3.8 | −1.66 |

Agrees in sign with the 19-block run on the previous baseline (+0.099 ± 0.064).

He deals *less* damage with it on and wins more stocks — it stops spending supers
where they look big and spends them where his own record says they convert. It is
also the only live reader of `_tacticGrid`, so it is the single channel overnight
training reaches him through. Its own `SMK2_TUNE` note called it null
(fitness t=−0.50, stocks t=−0.09); that was measured on a rig whose A/A moved 0.39
stocks and whose second arm inherited the first arm's dossier.

## Fix 5 — `tacticChoice` ON, on design grounds, at a measured zero cost

**Outcome: +0.012 ± 0.029 (t=0.42)** over 2,664 matches/arm. That is a *tight* null,
not an unresolved one — the SE is small enough to rule out anything above ~0.07
stocks in either direction. Shipping it is a design decision, not an outcome one,
and is recorded as such.

What it buys is the property every previous rework failed to produce. Verified:

- **It fires.** 253 yields / 612 bookings / 241 cells over four matches. (The
  `swingGate` lesson: that flag shipped inert and fired zero times in six runs.)
- **It differentiates by opponent.** The same tactic, priced by net health per
  commit, against different archetypes:

| tactic | turtle | mixed | rusher | spread |
|---|---|---|---|---|
| `corner_exploit` | — | −6.47 | **0** | 6.47 |
| `counter_attack_c` | −12.5 | −18 | **−25.67** | 13.17 |
| `danger_lava_ground` | −9.25 | −17.83 | — | 8.58 |
| `shield_priority_b` | −0.05 | −5.4 | — | 5.35 |

He yields `corner_exploit` against a mixed opponent and keeps it against a rusher.
Before this, `aiMemory` moved four dials and `_tacticGrid` booked five coarse verbs,
so against a turtle and a rusher he ran the identical cascade in the identical order
and merely pressed harder or softer. **Intensity was the only thing he could adapt;
now choice is too.**

Behaviour shifts 16 L1 points. Applied only to `corner_exploit`, `punish_mode`,
`bait`, `platform_control`, `breathing_room`, `mid_approach_evasion` — not to
`guaranteed_punish` or `anti_exploit`, because free damage on a helpless target and
a forced safety response are not choices worth second-guessing.

## Real-game boot check

The sim bypasses most of `index.html`, so the shipped page was verified separately:
227 scripts, **no page errors**, 900 frames of live Sovereign-vs-Sovereign without a
throw, 16 distinct commit types firing, top branches `hop_steer` /
`guaranteed_punish` / `corner_exploit` / `punish_mode`. `aiMemory.aggression` starts
at **0.60** rather than 0.90, confirming headroom is live.

Most important line in that check: **`_tgtAbilityUses: 3`.** Real opponents *do*
spend abilities, so the demonstrated-threat standoff will correctly arm in real play
— the case the scenario library structurally cannot test, because its bots never
press the button. (Only pre-existing Render CORS failures in the console.)

---

# FINAL VALIDATION — new Sovereign vs the old one

40 independent blocks, **2,880 matches/arm**. Treatment = every new flag turned
OFF, so a NEGATIVE delta means the old build is worse.

| metric | old-vs-new delta | SE | t |
|---|---|---|---|
| stocks | **−0.170** | 0.045 | **−3.77** |
| damage taken | **+29.9** | 6.8 | **+4.37** |
| locked % | −1.36 | 0.17 | −8.15 |
| fitness | −68 | 40 | −1.72 |
| behaviour L1 | **118 pts** | 0.26 | — |

**The old Sovereign loses 0.17 stocks per match and takes 30 more damage.** He is
also locked out 1.4pp less, which is the honest cost of the new build engaging
instead of standing off — he trades more, and wins the trades.

## The bug the whole sim could not see: `applySovereignPeakTuning`

Caught only because the user asked what the pre-fight knobs are set to.

`_startGameCore` (smb-menu-startcore.js:488) and `SovereignControl` call
`applySovereignPeakTuning(ai)`, which **overwrote the dials to 0.94 / 0.90 / 0.08 /
0.98**. `SMK2Trainer` builds fighters straight from the constructor and never calls
it. So the headroom change — the entire "make him actually adapt" mechanism — was
**inert on the only path that ships**, while measuring perfectly in the sim. My own
boot check missed it too, because it constructed a fighter directly and therefore
reproduced the sim's path rather than the game's.

This is the same failure shape as `superGate` shipping inert and `swingGate` firing
zero times: a mechanism that measures fine and never reaches the player.

Fixed: under `adaptV2` the dials keep their baseline and he *earns* the peak inside
the fight. Everything else peak tuning means — limiter broken, `suffocate` pressure
mode, evolution stage, intimidation, skipped warmup — is untouched, because none of
those cap adaptation. `intelligence` is now derived from the dials rather than
asserted at 0.97, which was a number describing nobody once the dials read 0.60.
With `adaptV2` off the old pinning is bit-identical, so the revert path is intact.

Verified on the shipping path: peak tuning leaves 0.60/0.60/0.20/0.60 with
`limiterBroken`, `suffocate` and evolution stage 2 all preserved; 18 commit types
firing; `_choiceGrid` holding 2 opponent keys; threat observer recording real
ability uses.

## Standing lesson
**Measure the shipping path, not the harness path.** Three of the mechanisms in this
file measured fine and reached nobody. Any future flag needs a check that it
survives `applySovereignPeakTuning` and `_startGameCore`, not just `SMK2Trainer`.

---

# Fixes 6 & 7 — both found by the user asking what his pre-fight knobs are set to

## Fix 6 — `_strategicTerms()` has been throwing on every call

```
ReferenceError: sAgg is not defined
```

`sAgg` / `sDef` / `sSpc` / `sRxn` are the **swarm** terms, declared in
`_oppAdaptTerms()` — the *next* function. `_strategicTerms()` referenced them in its
return statement, out of scope, from a merge in prior uncommitted work. Class bodies
are strict-mode, so that is a hard throw, not a silent `undefined`.

The guard above it is `if (!S || S.frames < 240) return null`, so it threw on **every
call that got past ~4 seconds** — i.e. every call that could have mattered. The
throw unwinds through `_oppAdaptTerms` into `_applyAdaptation`.

So this entire adaptation channel has been dead:
- **damage-source shares** — "what is actually killing me" (melee / ability / hazard)
- **range-band profitability** — "which distance do I win at"
- **persistent habits** — the ones that survive respawns, unlike the `_opp*` counters
  that `_applyOppProfile` zeroes on every target switch

Verified by calling it directly with a populated `_strat`: threw before, returns real
values after (`defense +0.097` on a melee-heavy damage profile).

This is a second, independent adaptation channel that simply was not running — which
matters more for "make him adapt" than anything else measured today.

## Fix 7 — he could not tell aggressive Thor from passive Thor

`SovDossier` files two records per opponent: `kit:weapon/class` and
`beh:archetype`. `loadoutPrior` then averages across them. Those are the two
**marginals**, and marginals cannot represent an interaction — "aggressive Thor" and
"passive Thor" were literally the same memory, learned as "vs Thor" blended with
"vs rusher".

`_dossierKeys()` now also pushes a **joint** key, `kit:hammer/torren|beh:rusher`.
No new machinery needed: `loadoutPrior` already weights each key by `min(5, n)`, so a
fresh joint record contributes ~nothing and the marginals carry the pick until that
specific build has been played a few times. Hierarchical shrinkage for free.

`SOV_DOSSIER_MAX` raised 64 → 128, because each opponent now costs three records and
eviction is coldest-first — the joint record is always the youngest, so at 64 the
specialised build memory would have been the first thing thrown away.

### Note on what the counter-pick actually is
`_smk2CounterBonus` is a hand-authored prior, capped at ±18% (weapon type) and ±20%
(reach), and it reads `tgt.weaponKey` **only** — never `charClass`. It is a weak
nudge on top of the bandit score, not a hard counter. The *learned* side is the
dossier; the authored side just breaks ties early on.

---

# FINAL VALIDATION (re-run with fixes 5–7 in place)

40 blocks, 2,880 matches/arm. Treatment = every new flag OFF, so **negative means
the old build is worse**.

| metric | old-vs-new | SE | t |
|---|---|---|---|
| stocks | **−0.098** | 0.045 | **−2.18** |
| damage taken | **+29.4** | 7.7 | **+3.81** |
| damage dealt | +88.9 | 10.5 | +8.48 |
| fitness | +128.7 | 40.9 | +3.15 |
| locked % | −1.22 | 0.13 | −9.43 |
| behaviour L1 | 118 pts | 0.34 | — |

The new build survives more and takes less damage. It also deals **less** damage and
scores **lower** on the trainer's fitness composite.

## That tension is not cosmetic, and `stocks` was hiding it

Duel fitness is `stockDiff*400 + dealt*0.5 − taken*0.5 − locked*0.25`, where
`stockDiff = oppDeaths − sovLivesLost`. The ×400 term dominates everything else. So
the old build scoring **+129 fitness while holding fewer of its own lives** is only
arithmetically possible if it is **killing the opponent more often** — roughly +0.3
kills per match by back-solving the formula.

`sovLivesLeft` measures his SURVIVAL. It does not measure his LETHALITY, and for a
boss those are not the same goal at all. Every number in this log up to here was
blind to that, because the lab never captured `oppDeaths` — which `runMatch` has
been returning the whole time.

`tools/sov-lab2.js` / `tools/sov-run2.js` add `kills` (`oppDeaths`) to the reported
panel. The verdict on whether this build is actually *better* waits on that run, and
should not be claimed before it.

**Standing lesson:** pick the metric that matches the role. A harness metric named
after the thing you can easily count is not automatically the thing you want.

---

# ROUND 3 — after fixing the bots, the domains, and the set-parser

Three harness defects were found between the earlier numbers and these, so the
earlier ones should be read as void:

1. **Lobotomised bots.** Every policy in `smb-smk2-training.js` AND every stress
   policy in `smb-sov-scenarios.js` called `attack()` and nothing else — no
   ability, no super. 23,142 of 23,142 posture samples showed the opponent's
   ability unspent. Fixed with a shared `_policyUseKit` helper wired into all of
   them. After: 3,129 of 20,434 samples show it on cooldown, and `'window'`
   posture fires 949 times where it had fired **zero**.
2. **He flew off the map.** On his third super he expands Absolute Dominion,
   which sets `_domainRising`; `smb-fighter.js` then skips gravity for him. The
   sim never ticked `DomainManager`, so the rise never completed — observed at
   y = **−3,578**, ~3,500px above a 460px floor, damage frozen for 35s. Happened
   in 2 of 3 runs. Any match where he expanded scored a fighter who had left the
   arena, which biases hardest against the flags that make him spend supers.
   Fixed by ticking `DomainManager.update()` in the sim loop.
3. **`--set=flag:0` did not turn flags off.** Several consumers test `=== false`
   and `0 !== false`. A 26-block `superGate` A/B returned exact zeros on every
   metric — it had measured superGate against itself. The parser now maps
   `0`/`false`/`off` to boolean false.

## Results (2,088–2,160 matches/arm)

### Old build vs new — `TRUEFINAL2`
| metric | old-vs-new | t |
|---|---|---|
| damage dealt | **−39.5** | **−2.64** |
| kills | −0.154 | −1.82 |
| fitness | −91.0 | −1.69 |
| stocks | −0.035 | −0.87 |
| damage taken | +1.0 | 0.19 |
| locked % | −2.00 | **−14.27** |

New build **deals significantly more damage**, trends to more kills and higher
fitness, identical survival, and is locked out 2pp more. For a boss that is the
right trade: more threatening at equal durability.

### `superGate` — `SG2`
Turning it off costs 0.067 stocks (t=1.8) and 10 damage taken (t=1.77). A positive
trend, short of significance, agreeing in sign with the earlier run. Stays ON.

### Strategic layer — `STRATrecheck`
Turning it off costs 0.20 kills (t=−1.25), 45 dealt (t=−1.47), 112 fitness
(t=−1.15). Same direction throughout, none significant; only 15 of 24 blocks
survived contention. Underpowered rather than refuted. Stays ON — it is a
correctness fix regardless (the old code threw).

## `discovery` — built, fires, and does not pay. **OFF.**

Residual-based exploit detection: each booking records `expect` *before* the
outcome, and `net − expect` is scored against a running mean of his own |error|,
so "surprising" adapts to the match's noise instead of being a constant.

**It works as designed.** 40 events / 566 yields over 12 matches, 8 distinct
tactics, and the finds are specific: `anti_exploit` vs **turtle** 16 of 18 hits;
one `volley_cycle_b` commit worth **531 net health** — exactly the outlier an
average erases (it would move a cell mean by a point and vanish).

**And it measures negative.** 29 blocks: stocks −0.072 (t=−1.92), dealt −41.9
(t=−2.06), fitness −128 (t=−1.92), taken +10.2 (t=1.85). Every metric agrees.

Softening the exploitation (`discoveryYield` 0.6 → 0.2) removes the harm and adds
nothing: stocks −0.012 (t=−0.21). So the detection is sound and the *exploitation
policy* is the failure — stepping aside from a working branch to chase a discovery
that may not be reachable from where he is standing means he does neither.

Kept wired and OFF. It is the only mechanism in the tree that can represent
"this worked far better than I expected", and the next attempt should change how a
discovery is acted on, not how it is found. Note also that kill-credit
(`tHp + 40`) inflates net on a life change, so the loudest discoveries skew toward
"this killed them" rather than positional exploits — worth separating first.

## `volleyArmedRead` re-measured on the fixed harness — the headline was an artifact

| metric | broken harness | fixed harness |
|---|---|---|
| stocks | +0.161 (t=2.81) | **+0.014 (t=0.38)** |
| damage taken | −33.4 (t=−3.87) | **−0.9 (t=−0.17)** |
| damage dealt | — | **+35.7 (t=2.09)** |
| kills | — | +0.165 (t=1.65) |
| locked % | +1.17 | +2.14 (t=14.94) |
| behaviour L1 | 118 pts | 24 pts |

Against bots that never spent an ability, disabling the standoff was pure upside and
the flag looked like the biggest win of the day. Against bots that actually burst,
the standoff earns its keep, so removing it is near-neutral on survival and the
behavioural shift drops from 118 points to 24.

**What survives is lethality:** +35.7 damage dealt (t=2.09) and +0.165 kills
(t=1.65). That is essentially the whole build's damage gain (+39.5), so the new
Sovereign's advantage is attributable almost entirely to this one flag.

It also owns the whole lockout cost: turning it off recovers 2.14pp of the 2.0pp the
full build pays. He is stunned more because he is engaging instead of retreating.

### Final flag state
| flag | verdict |
|---|---|
| `adaptV2`+`oppAdapt`+`swarmTerm` | **ON** — outcome-free, and the only reason the dials can move at all |
| `volleyArmedRead` | **ON** — +35.7 dealt (t=2.09); owns the +2pp lockout |
| `superGate` | **ON** — positive trend in two independent runs (t≈1.8) |
| `tacticChoice` | **ON** — outcome-null, delivers opponent-conditioned choice |
| `stratTerms` | **ON** — correctness fix; positive trend, underpowered |
| `discovery` | **OFF** — fires correctly, measures neutral-to-negative at every yield |

### Still unverified
- **Nothing here has been played by a human.** All of it is sim-measured. The +2pp
  lockout in particular could read as "satisfying pressure" or "he staggers
  constantly" and no headless run can tell the difference.
- `volleyArmedRead`'s *real-game* value is still untested in the direction that
  matters most: the scenario bots now use abilities, but a human's timing is not a
  bot's, and the standoff exists to answer an unreactable point-blank fan.

---

# REASONING — four capacities he did not have

Built after the 2026-09-21 player replay analysis. All four default **OFF**; none
is outcome-measured yet. They add the machinery, not a proven win.

## The diagnosis
He could not investigate anything, and it was not unwillingness:

- **No representation of not-knowing.** Every ledger stored sums (`{tries, net}`).
  A cell with 3 samples and one with 300 were indistinguishable. No variance means
  no uncertainty, and no uncertainty means nothing to be curious *about*.
- **No value on information.** Grepped: zero references to curiosity / info-gain /
  anything epistemic. Every objective is denominated in health, so an experiment
  costing 10 HP to answer a question is, by his own ledger, a **mistake**. He was
  structurally incapable of paying to learn.
- **No intervention.** He only ever observed fights that happened to him.
  Co-occurring causes (`sync_0_3`, `opp_tier_equal`, `opp_swinging`) cannot be
  separated by watching — only by deliberately varying one.
- **No latent variables.** He could correlate over hand-given features and could
  not invent one, so a hidden counter was permanently beyond him.

## 1–2. Uncertainty + optimism (`curiosity`)
`_choiceGrid` cells now keep `net2` (sum of squares) → `_choiceStderr()` and
`_choiceTries()`. `_preferCommit` judges `mean + k*stderr` plus an explicit
thin-cell bonus, so an under-sampled action survives the gate and gets tried —
the only thing that ever narrows its error bars. With `curiosity` off this
reduces exactly to the old mean comparison.

## 4. Self-constructed latent features
`_inferFeatures` now derives `repeat_within_30 / repeat_within_120 /
first_in_a_while` from a signature of the current pattern and when that same
pattern last occurred. He is not told a streak counter exists; he posits that
outcomes may depend on recent history, which is the shape that exposes one.

## 3. Intervention (`experiment`)
`_wantsExperiment()` spends a bounded budget (default 3/life, reset in `respawn`)
to deliberately swing INTO the opponent's swing — producing the discriminating
sample rather than waiting for it. Gated on health > 45%, never when a free punish
is available, spaced 240 frames, and it stops once the hypothesis has ≥25 samples.
Roughly half these exchanges end with him eating the hit. That cost is the point.

## Measured result — he derived the clash rule and its hidden variable
Full scenario sweep, `infer + curiosity + experiment` on, **516 swings he predicted
would land, 128 failures (24.8% base)**, 56 deliberate experiments:

**Why did my attack fail?**
| rule | n | fail | lift |
|---|---|---|---|
| `sync_0_3 & opp_tier_equal` | 32–41 | 97–100% | 4.1–4.6 |
| `repeat_within_120` | 13 | 100% | 4.03 |

**Why did I ALSO get hurt?** (base 18%)
| rule | n | hurt | lift |
|---|---|---|---|
| `sync_0_3 & repeat_within_120` | 6 | 50% | 3.09 |
| `close_range & repeat_within_120` | 7 | 43% | 2.39 |
| `repeat_within_120` | 13 | 38% | 2.14 |

Ground truth: `CLASH_WINDOW = 3`, equal tiers only, `CLASH_STREAK_RESET = 120`.
He recovered the window as `sync_0_3`, the tier condition as `opp_tier_equal`, and
the streak counter as `repeat_within_120` — **a feature he constructed** — with no
access to any clash constant, flag or helper. `_clashTier()` is deliberately not
called; tier is recomputed from `superActive` + `_attackKindTier`, which is what a
watcher can see.

**It also corrects the design assumption.** Clash is not a reliable alternative
parry: it denies his own hit ~100% of the time but whether he is also hurt is close
to a coin flip, because the streak state is invisible to him. He learns the true
probabilistic mechanic, not the idealised one.

### Honest limits
- n is 6–13 on the sharpest rows. Suggestive, not settled.
- Only watches HIS OWN swings failing, so mechanics that never involve him
  attacking are still invisible.
- Ten hand-picked observables; conjunctions stop at pairs.
- **Nothing acts on the inferred rules yet.** Detection only. Wiring an action
  path is the next step and must not repeat `discovery`, where sound detection
  plus a bad exploitation policy measured negative.

---

# 2026-09-21 (2) — Acting on inferred rules (`inferAct`)

Detection alone changed nothing he did. This is the action path, designed against
the way `discovery` failed: discovery acted GLOBALLY (a find made the cascade
yield for 600 frames, so he dropped working plans to chase it). An inferred rule
is about ONE exchange, so the action is scoped to one swing.

## What was built
- **Persistence.** `_infStats` was per-instance, so every match started at n=0
  and needed 12 predicted swings before stating any rule — the action could only
  ever have worked inside a long sweep. `SovDossier.recordMech/mechPrior` keep one
  game-wide `__mech` record (mechanics are the same against everyone). Seeded on
  the first `_inferTick`; `_commitMech` files DELTAS on death and every 600
  frames, so a seeded swing is never filed twice. Capped at 3,000 swings (~100 matches) so a rule
  a rebalance breaks can be unlearned.
- **`_inferAct(t)`**, before `_swingGate`, first frame of a swing only. Reuses
  `_infOpen.feat` (recomputing `_inferFeatures` advances `_infPatternLast` and
  corrupts `repeat_within_*`). Among stated rules covering the swing, takes the
  lowest Wilson UPPER bound on landing; scores the swing as
  `landUCB*myDmg - hurtLCB*theirDmg` vs the ledger's guard value (0 if none);
  converts to a guard only when the swing loses. Pessimistic about the rule where
  curiosity is optimistic about the action. 15% of qualifying swings are left
  alone (`inferActExplore`) so the rule keeps getting samples. Never vetoes an
  experiment or a free punish.
- **Self-confirmation bug, fixed in both conversion paths.** A cancelled swing
  was closed by `_inferTick` as an expected hit that didn't land — i.e. the rule
  was being fed its own decision as evidence. `_swingGate` had the same leak.
  Both now drop `_infOpen`.
- Tools: `sov-lab.js --baseflags` (on in both arms), `sov-run.js --blockoffset`
  (fresh seeds instead of reproducing a prior run), conversion report per rule.

## Result
Isolated (control `infer`, treat `infer+inferAct`), two independent runs on
disjoint seeds, 39 blocks / ~2,800 matches per arm pooled:

| metric | delta | t |
|---|---|---|
| stocks | +0.065 ±0.023 | 2.80 |
| taken | −10.5 ±3.6 | −2.93 |
| dealt | +6.5 ±7.4 | 0.88 |
| fitness | +45 ±27 | 1.68 |

Run 1 alone: stocks t=1.48, taken t=−1.76. Run 2 alone: t=2.45 / −2.36. Same
direction both times. Package vs SHIPPED (`infer,inferAct`, 20 blocks, seeds
320+): stocks **+0.114 (t=2.78)**, taken **−16.8 (t=−2.87)**, dealt −3.0 (t=−0.19).

~1.2 conversions per match. Behaviour: `guaranteed_punish` +0.39 pts (t=3.42) —
the guard he raises instead of swinging is a fresh raise, i.e. a parry window,
and the punish that follows is the likely mechanism.

## What it actually learned to do (read before over-claiming)
The converting rules are mostly BROAD: `sync_0_3`, `opp_tier_equal`,
`opp_swinging` singles outnumber the sharp `sync_0_3 & opp_tier_equal` pair. The
working lesson is "don't swing into a swing already in flight — guard", which is
wider than the clash rule. The streak feature contributes mainly as
`first_in_a_while` (a first clash is a clean cancel), not as a repeat veto.

Limits: scenario bots only press `attack()`, so there is no bot that baits
guards — a human who learns he guards on their swing can exploit it, and the
lab cannot price that. Not played by a human. `inferAct` stays default OFF.

---

# 2026-09-21 (3) — He finds the arsenal himself (`openLoadout`, discovery runs)

Our role is now documentation only. `SMK2_LOADOUTS` (7 kits, our priors, our
counter bonus) was our opinion; with `openLoadout` he picks from every legal
weapon (20) and class (13, no Megaknight) by Thompson sampling over his own
per-life net damage/1000f, keyed by what the opponent held. Class HP/speed are
real in this mode (scaled onto his line) or classes would differ only by perk.

`tools/sov-discover.js` runs independent lineages (empty dossier, own seed) of
fair matches: stock stats, the game's expert AI, opponents cycling all weapons
(`opts.opp` in `_runMatch`). `tools/sov-discoveries-doc.js` writes
`docs/sovereign-discoveries.md` from the dumps — regenerate, never hand-edit.
5 x 1000 matches takes ~1.2 min.

Bugs found on the way: the sim calls `onDeath()` but never `respawn()`, so
`_recordLoadoutResult` never ran in any lab match (curated bandit learned nothing
in the sim); the `__mech` cap of 600 held only ~20 matches (~30 predicted swings
per match) — raised to 3000. Per-life samples now close on death AND at match end
(`endGame` hook + sim end), else every life he won would be dropped.

First run's headline (see the doc for the rest): sword 5/5 lineages, hammer in
the bottom three in 4/5 — for HIM. That diverges from the class-balance harness
(hammer 93-98% in bot mirrors), which measured the weapon in the game AI's hands.
He is effectively useless with every ranged weapon (dealt ~0/1000f), and ranged
opponents are his easiest. Class differences are small and lineages disagree —
classes read as roughly balanced for him. Clash rule re-derived 5/5 against the
real AI, not just scripted bots.
