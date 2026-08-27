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
- **`tools/sov-conversion.js` should not be trusted.** It reports 13.9% accuracy
  against a replay-measured 58%, and one rep recorded zero swings. The
  instrumentation has a flaw I did not chase. Left in the tree, flagged here.

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
