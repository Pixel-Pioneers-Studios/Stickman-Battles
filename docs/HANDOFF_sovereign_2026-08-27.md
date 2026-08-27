# Handoff — Sovereign adaptation, Aug 27 2026

Continues `docs/HANDOFF_sovereign_2026-08-26b.md`. The brief was: confirm he
actually adapts, then keep going until he adapts to anyone and beats everyone.

**Read §6 first if you only read one section.** The headline claim asked for is
not established, and this document says so precisely rather than burying it.

## Short version

1. He adapts *over time* — that part was already fixed by the Aug-26 rework and
   the "one-way ratchet" memory is stale. He did **not** adapt *to the opponent*:
   measured over 9 trials, his four dials converged to the same endpoint against
   a hammer berserker, a katana assassin and a spear zoner, with between-opponent
   SD **below** rep-to-rep noise on all four.
2. Root cause was structural, not tuning. Every term in `_applyAdaptation` was
   self-referential — hits landed, damage taken, commitments punished. **Zero
   bits of opponent information entered the target function**, so no amount of
   tuning could produce an opponent-specific answer.
3. Fixed: opponent-conditioned adaptation, a persistent opponent dossier, a
   behavioural opponent panel, crossover evolution, and an edge game.
   Post-change, 3 of 4 dials diverge by opponent with large effect sizes
   (reaction eta² = 0.882, F(3,16) = 39.8, n = 20), and rematch recall is real.
4. He does **not** beat everyone. Against a kit-matched panel he sweeps passive
   archetypes and loses to aggressive ones.

## 1. What was actually wrong (measured, not inferred)

Built `tools/sov-adapt-probe.js`: Sovereign possesses P1, fights an opponent
whose kit or behaviour is the independent variable, ~1800 live frames per trial,
finisher-lock and cinematic frames excluded.

| question | before | after |
|---|---|---|
| dials move during a fight | yes (range 0.04–0.23) | yes |
| dials differ **by opponent** | **no** — between-SD < within-SD on all 4 | 3 of 4 diverge, eta² 0.50–0.88 |
| anything reaches `_genome` | no, 0/9 trials | still no in-match; now heritable across generations |
| rematch recall | none — `_oppMemory` is keyed on the fighter OBJECT | real, 2.2× closer (§4) |

Three separate defects, each of which alone was sufficient to prevent
opponent-specific adaptation:

- **`_applyAdaptation` had no opponent term.** Fixed via an `_oppAdaptTerms()`
  hook on `AdaptiveAI`; subclasses that do not model an opponent return nothing
  and behave exactly as before.
- **`_oppMemory` is a `Map` keyed on the fighter instance.** Every match builds
  new `Fighter` objects, so a returning human is a stranger. Worse, in a 1v1
  `_switchTarget` fires **zero** times — the fighter already has a target, so
  `_updateTargetSelection` finds `best === cur` and returns. The map was never
  written in the mode he is actually fought in.
- **`_strategyFail`** — the only genuinely learned counter-knowledge in the class
  — was rebuilt per match and never keyed to who taught it.

## 2. Measurement bugs found along the way

These matter more than the fixes, because each one had been silently producing
confident wrong numbers.

- **The action-tag rates are unusable as a behaviour classifier.** Across whole
  fights the habit tracker logged 9–26 non-idle actions total, `shield` was
  identically zero, and the same opponent's attack rate swung 0.11→0.55 between
  runs. Everything behavioural now reads **frame shares** (~1800 samples/fight).
- **`t.dodgeTimer` / `t.rollTimer` do not exist on `Fighter`.** A counter keyed on
  them would have read zero forever. Evasion is now measured as retreating while
  Sovereign is committed to a swing.
- **The approach/retreat metric gated on `|t.vx| > |this.vx| * 0.8`.** He is the
  faster fighter by design, so a puppet scripted to charge him every single frame
  registered approach on 8.6% of them and retreat on 7.4% — indistinguishable.
- **`assassin` is not a key in `CLASSES`.** `applyClass()` bails silently (the
  same silent-bail that once left 104 story enemies classless), so that panel
  member kept 150 HP against the berserker's 130 — 240 vs 208 after the duel
  buff. The archetype that "beat him 10-0" was also the one carrying 15% more
  health. The panel now holds kit **fixed** and varies only behaviour.
- **Bot opponents are behaviourally identical.** Three "different" kit opponents
  overlapped almost completely on attack rate (0.02–0.09), air share (0.22–0.87)
  and close share (0.53–0.94) — one AI holding three weapons. Nothing about
  behaviour can be validated against them, which is why the scripted panel exists.
- ~~**`tools/sov-conversion.js` should not be trusted.**~~ **FIXED — see §8.**
  It reported 13.9% accuracy against a replay-measured 58%. Three defects,
  chased down and corrected; it now reports 59.6% against that same 58%.

## 3. What was built

| file | change |
|---|---|
| `js/smb-sov-dossier.js` | **NEW.** Persistent opponent memory keyed on `kit:<weapon>/<class>` **and** `beh:<archetype>`, so learning transfers to opponents never met. Records strategy outcomes, dial endpoints, per-opponent loadout results. localStorage, decays on load, evicts coldest. |
| `js/smb-adaptive-ai.js` | `_oppAdaptTerms()` hook folded into all four `ease()` targets, clamped ±0.35. |
| `js/smb-smk2-class.js` | Frame-share opponent observation; `_oppRates()`; `_dossierKeys()`; `_oppAdaptTerms()`; dossier seed/commit; frame-share anti-air and guard-break selection; `_edgePressure()`. |
| `js/smb-smk2-data.js` | 3 new genes: `oppKitGain`, `oppThreatGain`, `oppBehaviorGain`. |
| `js/smb-smk2-training.js` | `SMK2_PANEL` + `_applyPolicy` scripted archetypes; `crossover()` (BLX); `evolvePanel()` ranking by **worst-case**; `adoptPanelWinner()`; `noBuff` control. |
| `index.html` | `?v=4.0.85` on the five files above. |

### The edge game (as constrained)

`_edgePressure()` adds **no new action and no new attack**, and never redirects a
swing. It changes one thing: which side of the opponent he stands on. Knockback
runs along the attacker-to-target axis, so taking the inside position makes every
hit he was already going to throw point outward. Ringouts come free as a property
of positioning. This was deliberate — given a dedicated ringout tool he would
hunt for it, and hunting a low-probability finish means declining ordinary
damage. Behind `SMK2_TUNE.edgePressure`.

Note: the ringout hypothesis for his *own* deaths was **tested and rejected** —
only 5–16% of his deaths are below-stage, median HP at death 15–26. He dies to
attrition.

### Crossover evolution

`evolvePanel()` ranks by **worst-case** panel score, not mean, because "beats
everyone" is a worst-case property — a strong mean with one bad matchup is
exactly the profile that loses to the one player who fights that way. Parents are
chosen to be complementary (best overall × strongest-on-its-weakest-archetype)
and crossed gene by gene. That is the "pair two opponent-adapted Sovereigns" idea
made concrete.

**Status: machinery works, result not established.** A 6-gen × pop-6 × 2-match
run moved worst-case −482 → −244 then bounced to −492. At 2 matches per archetype
the ranking is dominated by variance. The evolved genome is in
`tools/sov-evolved-genome.json` and is **NOT adopted** — it did push
`oppBehaviorGain` to 1.55 and `oppThreatGain` to 1.41, i.e. evolution selected
for *stronger* opponent-adaptation, which is a good sign and nothing more.

## 4. Recall, validated

`tools/sov-recall.js`: fight archetype A, fight A again with the dossier intact,
then fight B. Recall is real only if the rematch starts near where fight 1 ended
*and* the different opponent does not.

```
fight1 END     agg 0.900  def 0.764  spc 0.120  rxn 0.955
fight2 START   agg 0.960  def 0.718  spc 0.073  rxn 0.957   recall 0.28  arch turtle
fight3 START   agg 0.980  def 0.929  spc 0.076  rxn 0.998   recall 0.39  arch aerial

distance from fight1 endpoint:  same opponent 0.089   different opponent 0.194
```

2.2× closer on a rematch. Note the probe itself had to be fixed first — it never
pinned the opponent's weapon, and `startGame` hands out a random one, so every
"rematch" filed under a different kit key.

## 5. Where he actually stands

Kit-matched panel (all sword/none, behaviour is the only variable), 14 matches
each, 5 stocks a side, standard `DUEL_BUFF` (2.2× damage, 1.6× HP, no whiff guard
for the opponent):

| archetype | win% | stocks | dmg dealt/taken |
|---|---|---|---|
| turtle | 100% | 5.0 – 0.0 | 1200 / 91 |
| zoner | 100% | 4.4 – 1.1 | 1068 / 300 |
| rusher | **0%** (6 draw) | 3.1 – 4.0 | 845 / 770 |
| aerial | **0%** (2 draw) | 2.6 – 4.2 | 731 / 804 |

**Control, buff removed — this is the important row:**

| archetype | win% | stocks |
|---|---|---|
| turtle | 100% | 4.2 – 0.0 |
| rusher | 100% | 4.5 – 0.7 |
| zoner | 100% | 4.4 – 0.0 |
| aerial | 100% | 4.2 – 2.1 |

So the losing matchups are **not** a behavioural blind spot. `DUEL_BUFF`
multiplies every attack by 2.2, and the archetypes that attack most often cash it
in most — "he loses to aggressive archetypes" and "he loses to whoever collects
the damage buff most often" were the same measurement until `noBuff` separated
them. Aerial is still his worst matchup unbuffed (2.1 stocks conceded vs 0.0),
which is a real if much smaller signal.

## 6. What is NOT established

The brief asked for certainty that he adapts to anyone and beats every player.
**That is not what was demonstrated, and it is not demonstrable by this method.**

- The panel is **four scripted policies**, not four humans. Selecting for
  worst-case over this panel shows robustness across these four behaviours and
  nothing wider. A human who fights in a way the panel does not contain is
  outside everything measured here.
- Every headline number comes from a **possessed** Sovereign (`SovereignControl`
  driving the player slot) or from the headless sim. Neither is a human opponent.
  The five replays that started this whole investigation remain the only real
  human data, and no new human match has been played.
- "Beats every player with certainty" is not a property any amount of self-play
  can confer. Self-play measures robustness against the opponents you thought to
  write down. The honest version of the goal is: no known behaviour beats him,
  and the panel is the list of behaviours currently known.

## 7. Recommended next work

1. **Widen the panel before trusting `evolvePanel`.** Add at least: a shield-
   punish opponent, a wall-combo opponent, and a mixed opponent that switches
   archetype mid-match (the archetype re-seed path at `_oppObsFrames % 300` is
   written and completely untested).
2. **Re-run `evolvePanel` at 6+ matches per archetype.** At 2 it is measuring
   variance. Then `adoptPanelWinner()` — it already gates on beating the
   incumbent on a fresh batch.
3. **Fix the zoner classifier.** It reports `mixed` in 5 of 5 trials; the
   `avgDist > 175 && retreat >= approach * 0.9` cut does not fire on the real
   distribution.
4. **Re-tune `DUEL_BUFF` against real replay numbers**, or stop treating buffed
   panel win rate as a headline. Right now it mostly measures the buff.
5. Untouched from Aug 25/26: `_reactionMistakeRate()` still a flat `return 0`,
   `_getCounterStrategy()` fixed-priority lock-in.

## Verification

- `npm run check`: 70 errors before, **70 after** — zero introduced.
- `node --check` passes on all five changed files.
- Live browser, 45s real Sovereign match at 1100×760: **zero console or page
  errors**, HUD reads "NULL BLADE · BERSERKER", limiter break / TYRANT / pressure
  staging all fire, dossier live with 3 records, dials moved off baseline.
- **Uncommitted.**


---

# Addendum — Aug 27 2026, later session

Two follow-ups, both measurement rather than behaviour: the tool I had flagged
as untrustworthy, and the calibration knob that was making the panel win rate
mean less than it appeared to.

## 8. `tools/sov-conversion.js` — fixed and now cross-validated

Three defects, in order of size.

**1. Every swing was counted about three times.** The commit hook decided a
swing had started with

```js
const started = (this.attackTimer || 0) > before ||
                (this.weapon && this.weapon.type === 'melee' && this.attackTimer > 0);
```

The second clause is true on *every frame of an in-progress swing*. The AI
re-calls `attack()` each frame; `Fighter.attack` bails at `if (this.cooldown > 0)
return` (fighter.js:2154) without touching `attackTimer`; the still-running timer
from the previous frame then read as a fresh commit. One real swing became ~3
logged swings, 2 of them structurally unable to record a hit — which is exactly
how a true 58% prints as 13.9%. It also swallowed genuine whiff-guard aborts into
the swing count, so `aborts` was undercounted at the same time.

`attackTimer` is assigned at fighter.js:2369 for melee **and** ranged alike, so
clause 1 alone was always sufficient. Clause 2 deleted.

**2. Miss attribution used the wrong reach.** `weapon.range` is the loose commit
band the AI aims with, not the blade's swept arc — fighter.js:2199 says so in as
many words. So `walked_out` almost never fired and its misses fell through to
`unknown`. Now uses `_meleeReachDist(t)`, the same function the whiff guard uses.

**3. The opponent's weapon was random per rep.** Same defect the recall probe
had. Pinned to sword post-spawn, as `tools/sov-recall.js:104` does. (`p2Weapon`
is a DOM element id, not a global — setting it as a variable silently does
nothing.)

Result, 3 reps × 2200 frames, sword opponent:

```
accuracy      59.6%        (replay-measured: 58%)
dmg per hit   15.5
dmg per swing  9.3         (replay-measured: 8.0)
guard aborts   173         vs 52 actual swings — he wants to swing 4x as often as he does

misses:  unknown 42.9% | walked_out 33.3% | vertical 14.3% | reversed 9.5%
commit gap: median 40px when it hit, 73px when it missed
```

Two independent instruments now agree to within 1.6 points, which is the first
time any conversion number here has been corroborated. The tool is usable.

The standout finding is the one the old numbers hid: **173 guard aborts against
52 swings.** He wants to attack more than three times as often as he does, and
the whiff guard vetoes most of it. That is the guard working as designed — but
it is also where his damage output actually goes, and it is a much bigger effect
than anything in the miss breakdown.

## 9. `DUEL_BUFF` calibrated against real human matches

`DUEL_BUFF = { dmg: 2.2, hp: 1.6 }` is **not game balance** — it lives in the
training harness and never touches shipped gameplay. Its only job is to make a
sim opponent pressure Sovereign the way a human does, so the fitness terms
measuring damage-taken and lockout have something honest to select against. The
comment at its definition says "tune it against real-match numbers, not vibes."
It never had been. New `tools/sov-calibrate-buff.js` produces those numbers.

**There is more human data than §6 credits.** Not five replays — **nine** distinct
human-vs-Sovereign matches are tracked, spanning May 21 to Aug 23. Six of them,
however, predate the damage-event log and carry `events: []`. Those look exactly
like a perfectly quiet match (0 damage both ways) and dragged the pooled median
to 0.0 on the first run; a match with no event log is unmeasurable, not calm.
The tool now skips and names them. **Four matches are actually measurable.**

| date | human kit | frames | human dmg/1k | sov dmg/1k | sov locked% |
|---|---|---:|---:|---:|---:|
| 07-27 | electricstaff/kratos | 15558 | 140.1 | 108.9 | 15.4% |
| 07-29 | sword/paladin | 20541 | 100.5 | 96.8 | 13.2% |
| 07-30 | mkgauntlet/megaknight | 8547 | 178.3 | 43.3 | 21.2% |
| 08-24 | sword/warrior | 10560 | 164.3 | 111.0 | 14.7% |

**Calibration targets: 164.3 damage per 1000 live frames into Sovereign, and
15.4% of live frames locked.** Finisher-lock frames (`hp === 1 && inv > 500`) and
dead/respawning frames are excluded, and everything is scaled by
`meta.recordEveryN` — without that scaling every per-1000 figure is 3x too big.

**Caveat, stated up front: ~46% of replay damage events are attributed by guess**
(`event.byGuess`), so the per-side damage columns carry real attribution error.
The lockout column is read directly from per-frame `stn`/`rag` and does not.
Prefer it when the two disagree.

`runMatch` now returns `framesRun` (it was computed and thrown away), and
`tools/sov-winrate.js` prints a calibration block comparing each archetype's
pressure against these targets in matching units. Match length varies enormously
across the panel — a turtle match runs far longer than a rusher match — so the
raw `dmgDealt/dmgTaken` totals in §5 were never comparable across rows.

### 10. The result reverses §5 — the buff is too WEAK, not too strong

I expected the buff to be inflating difficulty. It is doing the opposite.
**Every archetype under-pressures a real human, even with `DUEL_BUFF` on.**

Buffed, 8 matches each (two independent runs, r1 / r2):

| archetype | win% | dmg/1k into Sov | vs human | locked% | vs human |
|---|---:|---:|---:|---:|---:|
| turtle | 100 / 100 | 33.4 / 45.8 | 0.20x / 0.28x | 9.9 / 9.7 | 0.64x / 0.63x |
| zoner | 100 / 88 | 36.8 / 42.6 | 0.22x / 0.26x | 4.1 / 4.7 | 0.27x / 0.31x |
| rusher | 13 / 13 | 108.0 / 127.8 | 0.66x / 0.78x | 9.6 / 10.3 | 0.63x / 0.67x |
| aerial | 0 / 0 | 144.5 / 123.1 | 0.88x / 0.75x | 11.7 / 10.4 | 0.76x / 0.68x |

Pooled: the buffed panel inflicts **0.49x–0.62x** a human's damage and
**0.57x–0.63x** a human's lockout. Unbuffed it is **0.34x / 0.54x**.

**The win rates are almost entirely explained by pressure, not by behaviour.**
Correlation between an archetype's pressure ratio and Sovereign's win rate
against it: **r = −0.985 (run 1), −0.981 (run 2)**, n = 4 each. The two he sweeps
are the two that barely touch him; the two he loses to are the only two that get
anywhere near a human's pressure — and even those top out around 0.8x.

So "he loses to aggressive archetypes" is better stated as **"he loses to whoever
actually hits him, and no scripted archetype yet hits him as hard as a person
does."** The most likely extrapolation is that a real player at 1.0x beats him
in all four styles. That is the opposite of the reassuring reading of §5.

### What this changes about §5

§5's noBuff row is labelled "**this is the important row**". On this evidence it
is the *least* human-like configuration in the document — 0.34x a human's damage
— and the clean 100% sweep there is close to meaningless as evidence about human
opponents. The buffed rows, the ones that look like failures, are the ones
standing closest to reality.

The §5 numbers are not wrong. The inference drawn from them was.

### Do not "fix" this by scaling DUEL_BUFF.dmg

The arithmetic (2.2 / 0.49 ≈ 4.5) is right for the damage half and **wrong for
the lockout half**, and lockout is the half that is measured rather than
inferred. The note at the bot-construction site records the direct measurement:
taking damage 2.2x → 5x moved lockout 5.7% → **4.1%**, i.e. *down*. Lockout comes
from chained hits, not big ones — bigger hits end the exchange sooner.

The damage gap is a stat knob. The lockout gap is a **panel-policy** problem: how
often an archetype re-engages and strings hits together. `_noWhiffGuard` was the
lever that actually moved it before, and it is already on. Closing the remaining
gap means writing archetypes that chain, which belongs with §7 item 1 (widen the
panel) rather than with the buff constant.

I have deliberately **not** retuned `DUEL_BUFF`. Raising it changes what
`evolvePanel` selects for, and the correction factor differs by a factor of ~1.5
depending on which metric you trust. That is a judgement call about what the
harness is for, and it should be made deliberately rather than as a side effect
of this measurement. `sov-winrate.js` now prints the gap every run, so it cannot
quietly drift again.

### Files

| file | change |
|---|---|
| `tools/sov-conversion.js` | 3 fixes (§8); now agrees with replays to 1.6 points |
| `tools/sov-calibrate-buff.js` | **NEW.** Extracts human pressure targets from tracked replays |
| `tools/sov-winrate.js` | Calibration block; buffed/noBuff results no longer overwrite each other |
| `js/smb-smk2-training.js` | `runMatch` returns `framesRun` (was computed and discarded) |
| `index.html` | `?v=4.0.86` on `smb-smk2-training.js` |
