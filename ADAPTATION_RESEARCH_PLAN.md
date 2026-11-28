# Brain Adaptation Research Plan

Status: investigation and experiment design only. No production code, checkpoint, or deployment configuration was changed for this report.

## Executive summary

The evidence points primarily to a training/distribution and task-identifiability problem, with secondary observation and combat-reward limitations. The GRU is propagated through a match, reset at match boundaries, and replayed by the PPO trainer with the expected truncated-backpropagation-through-time structure. The available logs also show small browser/Python policy-log-probability discrepancies, so there is no present evidence that the recurrent state is silently being dropped.

The stronger explanation is that the policy can obtain most of its current value from instantaneous state plus slowly decaying aggregate opponent statistics, while the training league mostly supplies stationary opponents. A behavior switch is therefore rare, weakly identifiable, and not consistently attached to a reward advantage. Existing evaluations support this: repeated memory wipes are usually neutral or beneficial, switch gains are below the project gate, and the historical league did not reward reads. These are verified empirical findings from `docs/sovereign.md`; the causal conclusions below are hypotheses until the proposed matched benchmark is run.

The first implementation experiment should be a clean evaluation matrix, not a larger network. It must isolate four factors: recurrent state, opponent-history features, their interaction, and the presence of a real mid-match switch. Only after that should a compact opponent encoder or adaptation auxiliary loss be considered.

## 1. Verified implementation facts

### Brain and deployment identity

- Brain is the neural-network fighter in `js/smb-brain.js`; the PPO orchestration is in `tools/brain/train.js`, with the recurrent optimizer in `tools/brain/torch_ppo.py`.
- The live possess/tick path creates one state at match start and reuses it through decisions in `js/smb-brain.js:1154-1215`; the game loop invokes Brain update from `js/smb-loop-core.js:214`.
- `SovereignMK2`, `AdaptiveAI`, and the scripted Sovereign training system are separate systems. `js/smb-smk2-training.js` trains scripted/genome opponents; it is not the PPO Brain trainer.
- The current rollout supports evaluation-only `histOff` and `memWipe` controls in `js/smb-brain.js:806-829, 913-961`. These are suitable starting points for ablations, but they are not yet the complete four-arm benchmark.

### Recurrent state propagation

- `js/smb-brain.js:48-64` initializes a zero hidden vector and performs a standard GRU step. `forward()` at `:67-84` updates the hidden state in place after the first hidden layer and uses the result in the next layer.
- A new hidden state is created per Brain rollout episode at `:913-927`; it is not reset between ordinary decisions or stocks. A `memWipe` evaluation deliberately resets it at selected decision intervals at `:947-961`.
- The live path follows the same pattern: state is created once, then passed through `observe`, `sample`, and `applyKeys` each decision (`:1154-1215`).
- In the Torch trainer, `tools/brain/torch_ppo.py:247-279` replays each complete episode from zero hidden state, then forms 128-decision pieces. The hidden state at each piece start is used as the initial state, and gradients stop at the piece boundary. This is truncated BPTT, not a loss of recurrent state at inference.
- `tools/brain/torch_ppo.py:174-185` recomputes reference log-probabilities from zero at each episode. The rollout log-probabilities and replayed values are therefore based on the same per-episode recurrence convention. Existing training logs report very small `lpErr` values; this supports propagation parity, although it is not a proof that the learned state is useful.

### Initialization, detachment, and sequence boundaries

- `tools/brain/ppo.js:34-41` zero-initializes the GRU memory projection matrix. This is an intentional identity-safe initialization: the recurrent path starts with no policy effect and must earn its use through training.
- Episode boundaries are preserved in the JavaScript GAE pass in `tools/brain/train.js:391-408`; the Torch updater computes GAE per episode in `tools/brain/torch_ppo.py:301-317`. There is no evidence that returns leak across matches.
- The recurrent optimization horizon is `seqLen=128` decisions (`tools/brain/train.js:77-85`), with `REPEAT=3` frames per decision (`js/smb-brain.js:9-12`). A sequence is therefore about 384 simulation frames, or 6.4 seconds at 60 Hz. A switch that is learned from 10–30 seconds of evidence is outside one gradient segment unless the useful signal is already compressed into the segment-start hidden state.
- Padding is masked in the Torch sequence update. The implementation uses `ix > 0` plus a first-slot override; this deserves a unit test because index zero is also a valid real decision index. It is not currently demonstrated to be a production bug, but it is a sequence-boundary risk worth pinning down before changing the model.
- Hidden state is reset at the start of each episode, which is correct for independent matches. It is retained across stocks inside an episode, which is appropriate only if stock transitions should preserve opponent evidence. The benchmark must report both match-level and stock-level behavior because a stock reset would be a different hypothesis.

### Observation and history

- `js/smb-brain.js:109-135, 300-337` builds a 253-dimensional observation containing current fighter/opponent state, projectiles, prior action, kits/crowd information, objectives, and history features.
- `_histObs` at `:225-297` is not a raw action sequence. It is a set of exponentially decayed counters: approach/back-off, distance, airborne time, shield contexts, swing starts, out-of-range swings, endlag swings, responses, anti-air events, jump starts, ability use, super hoarding, and damage exchange. The half-life is about 400 frames (roughly 6.7 seconds), so the features are useful memory-like summaries even when the GRU is wiped.
- The history is opponent-relative but mostly aggregate. It does not explicitly preserve the order of a combo, the exact timing between shield and punish, or a change-point marker. Two different sequences can map to similar counters.
- `_histOff` disables this feature family for evaluation. It does not remove all information about behavior: current pose, range, attack state, prior action, and immediate outcomes remain visible.

### PPO objective and reward

The rollout reward in `js/smb-brain.js:1020-1120` is primarily immediate combat performance:

- damage dealt: positive health deltas from opponents, scaled by `/40`;
- damage taken: negative health deltas from Brain, scaled by `/40`;
- death: `-2` for Brain; kill: `+2` for an opponent;
- `T.bonus`, which includes existing task/behavior bonuses;
- optional one-time novelty rewards for jumps, double jumps, shield raises, swings, abilities, supers, and fast-falls, annealed by the trainer.

The terminal win is recorded from stocks and remaining health (`:1128-1134`), while PPO learns the step rewards and bootstrapped returns. There is no explicit term for detecting a switch, improving relative to the pre-switch baseline, or selecting a counter because it was identified as useful. This is verified. It does not mean the dense damage reward cannot indirectly teach adaptation; it means adaptation has to be both identifiable and profitable often enough for PPO to discover it.

## 2. Root-cause analysis

### Most likely: training distribution and objective mismatch

The normal Brain rollout is trained over opponent specs selected in `tools/brain/train.js:207-257` and passed to `Brain.rollout` at `:351-355`. Most fixed style opponents are stationary within a match. There is a switcher/hunter mechanism, but it is not the same as a systematic factorial curriculum of deliberately distinct, long-lived styles with balanced switch directions.

When the opponent does not change, a memoryless policy can use current geometry and the decayed counters to achieve nearly the same reward. In that setting, PPO has no reason to preserve a fragile long-term state. A GRU can be present and correctly trained while being functionally ignored.

This interpretation is supported by historical measurements in `docs/sovereign.md:101-106, 146-152`: repeated memory-wipe gates were neutral or favored wiping; a hunter-switch gain was about +3.3 where the gate required +5; and the league was explicitly noted as not rewarding reads. These are measured findings, not just hypotheses.

### Likely: switch evidence is too weak or too late

Existing `tools/brain/intelbench.js` deliberately measures switches, controls, false alarms, and detection latency. Its historical results in `docs/sovereign.md:97,111` show low detection at controlled false-hit rates, especially when styles differ mainly in post-trigger choices rather than overall action rates. If the style change creates little immediate damage differential, the reward gradient is noisy and the GRU cannot tell whether a recent outcome came from the switch, normal combat variance, or the current geometry.

The current history decay is also on the same order as the proposed 8–15 second detection windows. It can blur “before” and “after” behavior, while the aggregate counters discard order. This is an observation-design hypothesis to test with history-off and history-shuffled controls.

### Likely: truncated BPTT is shorter than the intended adaptation problem

The 128-decision sequence is adequate for local temporal dependencies but not for a strategy that requires accumulating evidence over many seconds and then changing the policy. The hidden state is carried numerically across pieces, but the gradient does not cross the piece edge. That can still work if local reward makes the state useful; it is less likely to work when the evidence arrives first and the benefit arrives much later.

This is a training issue, not a recurrent propagation issue. Test it by keeping the network and data fixed while comparing sequence lengths such as 64, 128, and 256, with equal optimizer examples and a separate switch benchmark. Do not assume the longest sequence wins; longer sequences reduce update diversity and increase browser/Python cost.

### Possible: the task is not identifiable from the available opponent signal

The opponent may have different hidden policies that produce the same observable short-run behavior. Conversely, two nominal styles may converge against Brain because a delayed shield or a combat rule makes the style parameters ineffective. `docs/sovereign.md:113-115` explicitly records this confound for older proxy-style tests. If the pre/post distributions are not measurably different, no representation can reliably infer the switch.

The benchmark must therefore publish the opponent action statistics and an oracle separability check, not only Brain win rate. A failed detector against indistinguishable styles is not evidence of a bad GRU.

### Possible but not currently evidenced: recurrent implementation bug

There is no current evidence of a per-decision hidden reset or a PPO episode leak. The low `lpErr` parity diagnostics and the matching zero-state replay convention argue against this as the primary cause. Still, add a deterministic recurrence test before any architecture work: feed the same observation stream with a changed observation at t=1, assert hidden/output differences at later steps, and verify that a reset at t=K exactly matches a fresh sequence from K onward.

### Reward diagnosis

The reward is suitable for combat strength, not specifically adaptation. It may even discourage exploratory adaptation when a cautious probe loses health immediately and the counter-payoff arrives later. The existing novelty reward encourages action coverage, not opponent identification, and is annealed away. Therefore the classification is:

1. primary: training distribution/objective;
2. secondary: observation representation and switch identifiability;
3. contributing: truncated credit assignment;
4. not currently supported: broken GRU propagation;
5. possible combat-level ceiling: a switch may not have a profitable counter under the current mechanics.

## 3. Controlled behavior-switch benchmark

### Opponent protocol

Create deterministic two-phase opponents whose only change is the policy parameter set at a hidden switch frame. Use a long enough match (for example 7200 frames with elevated but equal health multipliers) so every usable episode contains a stable pre-switch and post-switch window. Switch at 3600 frames for the primary benchmark; randomize within a narrow band in a held-out benchmark to prevent timestamp memorization.

Required pairs:

| ID | Phase A | Phase B | Main signal |
|---|---|---|---|
| AD | aggressive | defensive | pressure/commitment to spacing/shield |
| DA | defensive | aggressive | spacing/shield to attacks/combos |
| JG | frequent jumping | grounded combat | airborne rate and anti-air opportunity |
| SG | frequent shielding | aggressive attacking | guard rate and punish windows |
| LC | long-range | close-range | preferred distance and attack range |
| PR | predictable | randomized | action entropy and sequence predictability |

For each pair, also run the reverse direction and a no-switch control with the same phase on both sides. Calibrate parameters from actual logged action distributions, not nominal config values. Require a minimum effect size, such as a pre/post standardized difference in at least two independent features, before treating the pair as an adaptation test.

### Four matched arms

Run exactly the same initial seed, arena, Brain loadout, opponent loadout, spawn, and random stream for each arm. The arms are:

1. `memory+history`: normal Brain, recurrent state retained, opponent history enabled;
2. `reset+history`: history enabled, recurrent state reset at every decision (the strongest practical memoryless recurrent control);
3. `memory-nohistory`: recurrent state retained, `_histObs` opponent history disabled;
4. `reset-nohistory`: recurrent state reset and opponent history disabled.

The second and fourth arms should reset only Brain state, not the simulation RNG or opponent state. A separate optional arm can reset at a fixed interval to reproduce the historical `memWipe` gate, but it must not replace the exact per-decision reset control.

### Metrics

- adaptation latency: switch frame to the first time a rolling post-switch metric exceeds the matched stationary control by a pre-registered margin and stays above it for a fixed persistence window;
- pre-switch damage advantage: Brain damage dealt minus damage taken, or dealt/taken ratio, over the final stable pre-switch window;
- post-switch damage advantage: the same metric over early, middle, and late post-switch windows;
- recovery delta: post-switch late metric minus post-switch early metric, normalized by the no-switch control;
- win rate and stock differential, with Wilson intervals or a paired bootstrap;
- policy change: action-head distribution and attack/defense/range usage before versus after the switch;
- false adaptation: the same detector run on no-switch controls;
- unseen-style performance: train/evaluate only after the benchmark protocol is frozen, using held-out parameter combinations and a held-out style mixture.

Do not call a result adaptive when the normal arm wins because it is generally stronger. The primary comparison is the interaction:

`(post - pre)normal - (post - pre)reset`

with the same calculation for history-off. Report per-direction results, not only pooled averages.

### Sample size and reproducibility

Use at least 300 paired episodes per cell for a first reliable gate and 500–1000 for the candidate result. Pair episodes by seed and use common random numbers where possible. Run at least 8 independent seed blocks so one lucky behavior schedule cannot dominate. Keep checkpoint paths, git revision, game parameters, switch distribution, and arm configuration in a JSON sidecar under a new experiment directory; never write `data/brain/latest.json`.

The existing `tools/brain/adapt.js` and `tools/brain/intelbench.js` provide useful scaffolding: they already seed rollouts, compare `histOff`/`memWipe`, record early/late damage, and distinguish switch matches from same-style controls. They do not currently provide all four arms, exact per-decision reset, the requested six switch families, or matched per-episode paired output. Extend them only in a separately named experiment harness when implementation is authorized.

## 4. Explicit opponent representation

### What must be represented

The representation should expose enough information to answer seven questions: what attacks are preferred; at what range; how often does the opponent defend; what combo transitions follow an opener; when do dodge and shield responses occur; which abilities are reserved or used; and has any of those distributions changed recently?

### Candidate designs

1. **More aggregate counters.** Cheap and easy, but risks repeating the current failure: order and change points are lost, and feature count grows without proving utility.
2. **Recent event-sequence encoder.** Convert opponent events into compact tokens such as attack-start with range bin, shield raise, jump, dodge, ability, hit/whiff, combo continuation, and time-since-event. Encode the last 32–64 decisions with a small GRU/temporal encoder. This preserves order and timing while remaining bounded.
3. **Learned opponent embedding.** A 32–64 dimensional embedding summarizes the opponent and feeds policy/value heads. Add a change-point or next-event auxiliary head so the embedding must predict behavior rather than merely correlate with win rate.
4. **Improved policy GRU observation.** Give the existing 128-unit GRU richer event tokens and explicit time-since-switch evidence. This is the smallest architectural change but leaves the policy recurrence responsible for both state estimation and control.

### Recommendation

Prefer a compact opponent event encoder feeding a learned embedding, then concatenate that embedding with the existing observation before the policy/value heads. Keep the current 253-dimensional interface as the baseline. Do not add dozens of counters first.

The staged test is:

- baseline current observation + current GRU;
- baseline plus a fixed, non-learned recent-event token summary;
- baseline plus a 32-dimensional learned embedding trained only with next-event and switch-detection auxiliary losses;
- the same embedding with its auxiliary loss removed;
- ablate the embedding at evaluation.

Useful claims require an improvement in switch adaptation and held-out styles, with no material increase in false alarms or stationary-match regression. The auxiliary task must use only past opponent events, never the hidden switch label at inference.

## 5. Reward recommendations

### Keep combat reward as the primary training signal

Do not replace damage, stock, and win terms. They measure the actual game objective and preserve existing checkpoints. First log the reward decomposition by phase and by switch window so we can see whether adaptation is simply invisible in the aggregate.

### Add an evaluation-only adaptation objective first

For each paired switch episode, define:

`A = (late post-switch advantage - early post-switch advantage) - (late - early matched no-switch advantage)`

Use a fixed evaluation window and a pre-registered detector. This rewards recovery after the switch, not memorization of a particular counter. Report A separately from win rate and never feed the hidden switch frame, phase label, or opponent ID into Brain.

If a training auxiliary reward is later justified, use a small bounded term for improvement in a held-out rolling advantage after a statistically supported change-point, with a penalty for false alarms and a cap per episode. Use randomized switch times, style mixtures, and held-out parameterizations. Do not reward “change action” by itself; that can cause twitching, shield spam, or unnecessary strategy changes.

### Reward-hacking defenses

- score on hidden switch times and held-out style combinations;
- include no-switch controls and stationary opponents;
- penalize false adaptation and excessive action churn;
- cap adaptation bonuses and keep them much smaller than real combat reward;
- evaluate with both stochastic and greedy action selection;
- report damage, stocks, win rate, and action distributions, not only the composite score;
- freeze the benchmark before tuning against it;
- maintain a separate checkpoint namespace such as `data/brain-experiments/adapt-v1/`.

## 6. Bounded lookahead proposal (not for implementation yet)

### Algorithm

At a decision point, generate a small candidate set from the Brain policy: top-k actions or short action sequences of length 3–6 decisions. For each candidate, clone the simulation state and roll forward a horizon of 6–12 decisions. For the opponent, branch over a small set of plausible responses sampled from its current policy or from the opponent embedding: likely action, defensive response, and a high-impact alternative. Score each resulting state using damage/health, stocks, positional safety, imminent threat, and a small action-churn cost. Select the first action of the best robust sequence, not the whole sequence.

Use beam search rather than a full tree. An initial training-only budget could be beam width 4, three candidate actions per node, two opponent responses, and horizon 8. That is at most roughly 4 × 3 × 2 × 8 simulated decision expansions before pruning; the exact count should be measured rather than assumed.

### Determinism and isolation requirements

- Every clone must include fighter fields, cooldowns, velocities, health/lives, projectiles, move scenes, arena hazards, cinematic/domain state relevant to combat, and Brain/opponent hidden state.
- Clone and restore all mutable arrays and object graphs; never reuse live object references.
- Give each simulation branch a deterministic forked RNG. A branch must not consume the live match RNG.
- Suppress rendering, audio, network sends, achievement writes, persistence, and analytics in lookahead branches.
- Restore global state in `finally`-style cleanup even when a branch throws.
- Add a hash of the serialized clone before and after a no-op branch to detect leakage.

### Browser budget

The browser main thread should get a strict per-decision wall-clock budget, initially 1–2 ms, with a fallback to the ordinary policy action when exhausted. A full-fidelity clone is likely too expensive for the live loop initially. Validate the clone and search in the existing headless simulation first, then consider a reduced forward model or worker thread. Measure p50/p95 decision time, skipped searches, memory allocation, and live-frame impact before any production flag is considered.

## 7. Expected computational costs

- Four-arm benchmark: approximately 4× the baseline rollout cost, plus paired controls. Six switch families and reverse directions imply 12 primary cells before controls and unseen-style tests.
- At 500 paired episodes per cell, this is at least 6000 episodes for the six families/directions, or 12,000 if both switch and no-switch cells are counted separately. Browser rollout time should be measured on the project’s normal headless environment before committing to a larger matrix.
- Sequence length 256 roughly doubles recurrent unroll memory versus 128 and increases Python-side computation; it does not double parameter count.
- A 32–64 dimensional event encoder adds modest inference cost but requires storing a bounded event history and a second forward path. The auxiliary loss adds training compute but should not change production behavior until separately validated.
- Beam lookahead is multiplicative in action branches, opponent-response branches, and horizon. It should remain offline/training-only until state cloning and timing are proven.

## 8. Prioritized roadmap

### P0 — correctness and measurement

1. Add deterministic GRU propagation/reset tests and a sequence-mask test around decision index zero.
2. Add reward-component logging and per-window metrics without changing the reward.
3. Freeze a separate experiment manifest format: checkpoint hash/path, code revision, seed block, opponent parameters, switch frame, arm, and RNG policy.

### P1 — controlled diagnosis

4. Build the four exact arms with per-decision state reset and history-off controls.
5. Implement the six matched switch families, reverse directions, no-switch controls, and separability checks.
6. Run 300 paired episodes per cell, then expand to 500–1000 if the effect is plausible.
7. Decide whether the failure is dominated by absent switch signal, history redundancy, truncation, or reward credit assignment.

### P2 — minimal learning interventions

8. If the switch benchmark is identifiable but memory remains unused, compare sequence lengths 64/128/256 with equalized training budgets in separate experiment directories.
9. If aggregate history is the bottleneck, test the compact event encoder and 32-dimensional embedding with auxiliary next-event/change-point losses.
10. Add an adaptation evaluation objective and only then consider a bounded training auxiliary reward.

### P3 — planning research

11. Implement clone/hash/isolation tests in headless simulation only.
12. Benchmark beam lookahead against the ordinary policy under a strict budget and held-out opponents.
13. Make no production deployment change unless a separately identified checkpoint beats the baseline on stationary strength, switch adaptation, unseen styles, latency, and false-alarm/action-churn gates.

## 9. Source index and evidence classification

Verified current-code references:

- `js/smb-brain.js:48-84, 225-337, 806-1151, 1154-1215` — network, GRU state, observations/history, rollout controls, reward, and live path.
- `tools/brain/train.js:77-85, 207-257, 351-425` — PPO configuration, opponent selection, rollout, GAE, and update orchestration.
- `tools/brain/ppo.js:34-41, 166-215` — GRU parameter initialization and gradient utilities.
- `tools/brain/torch_ppo.py:174-185, 247-352` — recurrent replay, sequence pieces, GAE, masking, and PPO update.
- `tools/brain/adapt.js` — existing history/memory ablation and early/late damage harness.
- `tools/brain/intelbench.js` — existing switch/control detection and latency harness.
- `js/smb-smk2-training.js:234-242, 323-602` — separate scripted Sovereign/genome training system.

Historical measured evidence, not current-code assertions:

- `docs/sovereign.md:51-55, 74-75, 97, 101-111, 146-152` — prior memory gates, switch experiments, detector limits, sample-size cautions, and combat-ceiling findings.

Hypotheses requiring the proposed benchmark:

- aggregate history is making the GRU redundant;
- 128-decision truncation is too short for switch credit assignment;
- the current styles are not sufficiently distinguishable in combat;
- an event encoder will outperform the current aggregate history;
- an adaptation auxiliary objective will improve recovery without reward hacking.

