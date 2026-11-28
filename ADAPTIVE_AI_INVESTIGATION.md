# Adaptive AI Investigation

## Scope and conclusion

This is a source-and-artifact investigation. No game source was modified. The repository contains several systems described as “adaptive,” but only one is a trained neural policy used for live combat:

> **The real neural-network fighter is `Brain`, implemented in `js/smb-brain.js`, trained by `tools/brain/train.js`, and deployed from `data/brain/latest.json` (or the generated `data/brain/latest.js` fallback).**

`AdaptiveAI`, `SovereignMK2`, `TrueForm`, `CombatAIFighter`, ordinary `Fighter` bots, and the boss AIs are hand-coded or hybrid rule systems. `SovereignMK2` is the scripted fallback body/decision cascade that the neural Brain can possess; it is not itself the neural network.

At investigation time:

- `data/brain/latest.json` reports checkpoint **iteration 24212**, policy input 253, hidden layers 128/128, output 11, GRU H=128.
- `data/brain/state.json` is stale relative to that checkpoint and reports iteration 15705, 1,207,798,232 frames, 402,799,764 decisions, and 63.20 training hours.
- The repository contains later/parallel candidates, including `data/brain-habit/gen-startup-tp3/latest.json` at 25296, but the live `data/brain/latest.json` is 24212. `docs/sovereign.md` also records the 24212/25296 history and warns that the latest deployment choice has changed over time.
- Therefore “approximately 22,000 iterations” is not the current canonical counter. The closest exact artifacts are the 21866, 23116, and 24212 checkpoints; the training implementation defines an iteration as one rollout-and-PPO-update cycle, not one episode or one gradient step.

## 1. AI implementations discovered

| Implementation | Type | Learns? | In-match adaptation? | Selection / location |
|---|---|---:|---:|---|
| `Fighter` ordinary bot | Hand-coded heuristic cascade | No weight learning | Reactive heuristics | `js/smb-fighter.js:4930+`, selected by ordinary bot creation in `js/smb-menu-startcore.js` |
| `CombatAIFighter` | Heuristic utility AI + pathfinding | No | Reactive scoring, random noise, reaction delay | `js/smb-combat-ai.js:1-5, 371, 587-675`; separate modular AI factory |
| `AdaptiveAI` | Hand-coded hybrid: event buffer, dials, bigrams, punish ledger | No neural training | Yes, by changing dials and choosing counters | `js/smb-adaptive-ai.js:1-103, 116-240`; used for `adaptive` mode and late story opponents |
| `BehaviorModel` | Hand-coded statistical bigram model | No gradient learning | Yes, predicts next classified action | `js/smb-behavior-model.js:1-175`; owned by `AdaptiveAI` |
| `SovereignMK2` | Large hand-coded priority/cascade system + dossiers, tactics, bandits | No neural weights | Yes, many rule/state paths | `js/smb-smk2-class.js`; live fallback selected in `js/smb-menu-startcore.js:505-566` |
| TrueForm / Boss | Scripted phase/move AI | No | Phase-dependent scripted adaptation/targeting, not trained NN | `js/boss/smb-trueform.js:262+` and boss modules |
| `Brain` | Trained multi-head policy/value MLP with optional GRU | **Yes, offline PPO** | Observation history + GRU can change policy during a match | `js/smb-brain.js:8-84, 225-337`; training in `tools/brain/` |
| BrainRead | Hand-coded prediction/read overlay | No | Can adjust/override live Brain keys in evaluation/live read path | `js/smb-brain-read.js:1-271`; separate from learned weights |
| Behavior-clone nets | Supervised clone initialized from Brain | Yes, behavior-cloning updates | GRU state is present, but tests show no reliable within-match memory benefit | `tools/brain/clone_train.py:1-17, 49-71`; used as hunter opponents |

The browser load order confirms the distinction: `AdaptiveAI`, `SovereignMK2`, their dossier/training systems, then `Brain` and `BrainRead` are separate scripts (`index.html:2051-2070`).

## 2. Definitive neural-network execution path

```text
startGame()
  └─ sovereign mode creates SovereignMK2 (menu-startcore.js:505-566)
       └─ Brain.driveSovereign(ai, p1)
            └─ fetch data/brain/latest.json
                 └─ Brain.possess(sov, checkpoint.pi, opponent)
                      └─ gameLoop → Brain.tickLive() every frame
                           ├─ observe(fighter, opponent, ...)
                           ├─ forward(net, obs, GRU state)
                           ├─ sample(logits) → 4 action heads
                           └─ applyKeys() → real Fighter input path → combat
```

Evidence:

- `js/smb-menu-startcore.js:505-516` chooses `SovereignMK2` for Sovereign mode and `AdaptiveAI` otherwise.
- `js/smb-menu-startcore.js:562-565` calls `Brain.driveSovereign`; failure explicitly logs “scripted Sovereign.”
- `js/smb-brain.js:1223-1228` loads the newest JSON checkpoint; `:1250-1259` loads the generated script fallback when `fetch` is unavailable.
- `js/smb-brain.js:1274-1283` calls `possess`, sets greedy live play, and returns the checkpoint iteration.
- `js/smb-brain.js:1157-1167` sets `fighter.isAI = false`, installs Brain controls, clears history, and creates recurrent state.
- `js/smb-loop-core.js:214-216` calls `Brain.tickLive()` before `processInput()`.
- `js/smb-brain.js:1180-1215` makes one decision every `REPEAT=3` frames, runs `observe → forward → sample`, then applies the action or navigation/hazard override.
- `js/smb-brain.js:300-337` writes the observation tensor; `:67-84` performs inference; `:86-106` samples the four categorical heads.

This proves the output affects combat: the sampled move/jump/shield/button tuple is placed into the fighter’s control keys, then processed by the normal input/update/attack code. The network is not merely logged or used for dialogue.

Fallback behavior is real: if the checkpoint cannot load, or `localStorage.smb_brain_sov` is `0`, the `SovereignMK2` scripted cascade remains in control (`js/smb-brain.js:1230-1248`; `js/smb-menu-startcore.js:562-565`).

## 3. Neural architecture

### Policy and value networks

The current checkpoint declares:

```text
Policy: [253, 128, 128, 11]
Value:  [253, 128, 128,  1]
GRU: H=128, attached after hidden layer 1 and projected into hidden layer 2
```

Implementation evidence:

- `js/smb-brain.js:32-46` loads per-layer row-major weights and optional GRU tensors.
- `js/smb-brain.js:67-83` applies tanh to hidden layers and leaves the final layer linear; GRU state is added into the second hidden layer.
- `tools/brain/ppo.js:17-41, 44-65` defines the matching JS MLP and GRU checkpoint format.
- `tools/brain/torch_ppo.py:84-116` defines the PyTorch equivalent: `nn.Linear`, tanh hidden activations, `nn.GRU`, and a bias-free `mem` projection.

The policy has four categorical heads (`js/smb-brain.js:9-12`):

| Head | Choices |
|---|---:|
| Horizontal movement | 3: left / neutral / right |
| Jump | 2: no / jump |
| Shield | 2: no / shield |
| Button | 4: no / attack / ability / super |

Thus output logits are 11 total. There is no continuous action head and no action mask in the policy sampler. Safety, hazard navigation, platform navigation, and some live/evaluation overlays can replace or alter the chosen tuple after inference (`js/smb-brain.js:1188-1215`).

### Parameter count

For the current 253-input checkpoint, counting weights and biases:

- Policy MLP: 50,443; policy GRU/memory block: 115,456; **policy total: 165,899**.
- Value MLP: 49,153; value GRU/memory block: 115,456; **value total: 164,609**.
- **Total trainable parameters: 330,508.**

The GRU block count is `Wi 3×128×128 + Wh 3×128×128 + bi 3×128 + bh 3×128 + M 128×128`, matching `tools/brain/ppo.js:37-40` and `tools/brain/torch_ppo.py:105-109`.

### Observation tensor

`OBS_DIM = OBS_BASE + 2*OBS_KIT + OBS_CROWD + N_HIST + N_OBJ` (`js/smb-brain.js:119-135`). For the current 253-dimensional checkpoint:

- 30 values for the Brain fighter and 30 for the primary opponent: position, velocity, ground/double-jump state, facing, health/lives, cooldowns, attack/endlag, ability/super, shield, stun/ragdoll/invulnerability/landing/parry/clash/domain, weapon range/damage/type, class speed.
- 16 relational/projectile/previous-action values.
- 43 one-hot kit values for the Brain and opponent: 27 weapon slots + 16 class slots (`:114-120, 300-334`).
- 89 crowd values for up to two extra hostiles plus crowd/perk flags (`:121-125, 207-222`).
- 17 decayed opponent-history tallies plus a “how much it has seen” value (`:126-135, 225-297`): approaches/backs off, distance, airborne rate, shield responses, swing frequency, whiffs, whiff punish, anti-approach, anti-air, jumps, abilities, super hoarding, damage dealt/taken, net damage.
- 3 optional objective one-hot values (`:131-135`). Live play does not set a training objective, so those are zero in live inference.

The observation is therefore not purely instantaneous: it contains explicit exponentially decayed opponent statistics and, in the deployed checkpoint, recurrent GRU state.

### Memory semantics

`newState(net)` returns zero GRU state (`js/smb-brain.js:48-49`). Rollouts create it once per episode (`:913`), keep it across decisions/stocks, and can deliberately wipe it only in evaluation (`:956`). Live `possess` creates it once (`:1162`) and `tickLive` passes the same state into every `forward` call (`:1182-1185`). There is no accidental per-frame reset in the normal live path.

However, the empirical memory gate is weak: `docs/sovereign.md:101-106` records repeated kept-vs-wiped evaluations where wiping memory did not consistently hurt and sometimes improved results. That means the architecture supports memory, but the current training/evaluation evidence does **not** prove the GRU learned a useful opponent identity/state representation.

## 4. Training implementation and the meaning of an iteration

The exact training program is `tools/brain/train.js`.

```text
Each iteration:
  current policy checkpoint
    → several headless Chromium workers run Brain.rollout()
    → collect decisions, actions, log probabilities, rewards, episodes
    → value estimates + GAE
    → PPO epochs/minibatches update policy and value nets
    → save latest.json, state.json, and periodic snapshot
```

Evidence: `tools/brain/train.js:3-13, 343-389, 391-425, 429-473`.

### Algorithm and hyperparameters

- PPO with clipped policy objective and separate value network (`tools/brain/train.js:410-425`; `tools/brain/torch_ppo.py:187-245`).
- Learning rate: `3e-4`; Adam beta1 `0.9`, beta2 `0.999`, epsilon `1e-8` (`train.js:77-85`; `ppo.js:115-139`; `torch_ppo.py:148-150`).
- Gamma: `0.99`; GAE lambda: `0.95` (`train.js:77-80`, `:395-408`; `torch_ppo.py:301-315`).
- PPO clip: `0.2`; four epochs; minibatch `2048`; KL target `0.03`, early stopping at 1.5× target (`train.js:77-80, 414-425`; `torch_ppo.py:321-347`).
- Entropy coefficient: `0.01` (`train.js:78-79`; `torch_ppo.py:231-233`).
- Gradient norm clipping: `0.5` (`train.js:79, 418-419`; `ppo.js:121-139`).
- Advantage normalization: yes; reward normalization: no explicit running reward normalization. Advantages are standardized (`train.js:405-408`; `torch_ppo.py:315-317`).
- Observation normalization: no; observations are hand-scaled/clamped in `smb-brain.js`.
- Rollout action repeat: 3 game frames per decision (`js/smb-brain.js:9`, `:1021-1025`).
- Default workers: 3; default `8000` decisions per worker per iteration (`train.js:49-53`).
- Each worker sends up to 40 opponent specs and episodes are capped at 7200 frames (`train.js:354-355`).
- Checkpoint snapshot every 25 iterations, retaining a 20-net league pool; latest checkpoint and state are saved every iteration (`train.js:465-473`).

### What “iteration” means

One iteration is **one batch collection plus one PPO update cycle**. It is not one match, one episode, or one gradient update. The batch size varies with worker returns: `N` is the number of collected decisions (`train.js:369-383`). Four PPO epochs then run, with one or more 2048-sized minibatch updates per epoch (`:414-425`).

The stored `state.decisions` is the cumulative number of decisions, while `state.iter` is the number of outer cycles (`:430-432`). The current stale state makes this concrete: 15,705 outer iterations and 402,799,764 cumulative decisions.

### Opponents, curriculum, self-play

Curriculum stages are `idle → easy → medium → hard → expert → league` (`train.js:94-96`). Promotion requires at least 60 qualifying episodes and 70% wins (`:459-464`). League opponents include expert, Sovereign, scripted styles, crowds, frozen self snapshots, and hunter nets (`:207-276`). Frozen previous generations are retained in the 20-entry pool (`:337, :465-470`). Hunter switching deliberately changes the opponent network during a match (`:263-275`), so the training corpus includes nonstationarity.

This is self-play in the broad league sense, not pure self-play: it mixes frozen Brain generations, scripted bots, Sovereign, hunters, and behavior-style opponents. It resumes from `latest.json` and `state.json` unless `--fresh` (`:291-318`).

### Python/PyTorch transfer

The rollout and training orchestration remain JavaScript. With `--torch`, `train.js` starts `tools/brain/torch_ppo.py` through `tools/brain/torch_client.js` (`train.js:327-335`; `torch_client.js:35-93`). The sidecar receives framed binary float32 buffers over stdin/stdout and sends updated flat float32 weights back. The ordering is per layer `W, b`, followed by `Wi, Wh, bi, bh, M` for the GRU (`torch_ppo.py:1-33, 105-128`; `torch_client.js:16-32`). This matches browser `Brain.forward()` layout byte-for-byte.

The Python process is therefore an optimizer/update implementation, not a separately deployed model runtime. Browser inference is custom JavaScript, not ONNX or TensorFlow.js.

## 5. Mid-fight opponent adaptation

The Brain has two explicit adaptation channels:

1. **History features**: `js/smb-brain.js:225-297` updates decayed tallies from the opponent’s observed movement, swing, shield, jump, ability, super, distance, whiff, anti-air, and damage events. The half-life is approximately 400 decisions / 20 seconds (`:129-130`). This information is directly appended to the network input (`:335`).
2. **GRU state**: `js/smb-brain.js:48-84` maintains a hidden state through decisions; `tools/brain/torch_ppo.py:94-103, 247-279` trains sequences in 128-decision pieces. Live state is reset at possession/match start and retained across stocks (`:1157-1166`).

Question-by-question result:

| Question | Finding |
|---|---|
| Previous opponent actions? | Indirectly: classified event/tally history; no raw action sequence in the tensor. The GRU also receives every observation. |
| Attack frequency? | Yes, decayed swing-start tally. |
| Repeated combos? | Not as a dedicated combo-token detector; damage/endlag/swing/GRU can encode it indirectly. Hand-coded `BehaviorModel`/Sovereign systems have more explicit combo logic. |
| Preferred range? | Yes: distance and approach/retreat/range-related tallies. |
| Defensive habits? | Partly: shield while Brain swings, idle guarding, whiff/punish responses. |
| Dodge/shield patterns? | Shield and movement/jump/airborne rates are represented; dodge is not a dedicated Brain action because dodge is not a separate policy head. |
| Style changes? | Architecture can represent changes through decayed history and GRU; measured detection evidence is weak. `docs/sovereign.md:97,111` reports low detection against tested switches. |
| Is opponent info fed to NN? | Yes, explicitly at `observe()` → `_histObs()` → input tensor. |
| Learned vs hand-coded adaptation? | The representation is hand-designed; policy response is learned by PPO. Live BrainRead and navigation overlays are hand-coded. |
| Memory reset? | At `possess`/new rollout match; retained during the match. |
| Across matches? | Weights persist via checkpoint, but recurrent/history state resets. Frozen league/dossier/hunter systems provide cross-match training/evaluation, not personal opponent memory in live Brain. |
| Distinguish opponents? | By current state, kit one-hots, crowd context, decayed behavior, and GRU trajectory; no explicit persistent player ID or opponent embedding. |

The strongest negative finding is empirical rather than structural: the project’s own memory gates repeatedly found little or no consistent kept-vs-wiped benefit (`docs/sovereign.md:101-106`). The Brain genuinely reacts to history inputs, but the current evidence does not establish systematic “learn this human during the fight and counter them” behavior.

## 6. Simulator fidelity

The neural Brain’s training simulator is not a separate simplified physics engine. `Brain.rollout()` calls `SMK2Trainer.simEnv.apply()` and then drives real `Fighter` updates, input processing, projectile/minion updates, `DomainManager`, abilities, damage, cooldowns, and respawns (`js/smb-brain.js:865-875, 1021-1038`; `js/smb-smk2-training.js:96-139, 210-220`). This is a headless browser running the game’s own JavaScript mechanics.

Important caveats:

- Drawing, sounds, particles, cinematics, and some browser side effects are stubbed (`smb-smk2-training.js:125-139, 141-207`).
- The simulator normally uses the Sovereign arena/floor, not arbitrary production arenas (`:99-115`).
- Training bots are scripted policies or Brain checkpoints, not necessarily human-quality fighters (`:234-242, 265-318`).
- Crowd and duel modes alter lives, damage, health, whiff guards, and frame limits (`:323-431`).
- Domain updates and projectiles/minions are explicitly maintained because omitting them changed outcomes (`:459-480`).
- The simulator runs thousands of matches efficiently through multiple headless Chromium workers (`tools/brain/train.js:49-53, 279-288, 348-365`).

There is no learned forward model, state predictor, or action-search loop in the Brain simulator. It executes actions forward in time and scores outcomes.

## 7. Browser deployment and latency

- Runtime: custom JavaScript; no ONNX/TensorFlow.js model runtime is used.
- Storage: `data/brain/latest.json` is the canonical JSON checkpoint; `data/brain/latest.js` is a generated `window.SOV_BRAIN_CKPT` wrapper made by `tools/brain/ckpt-js.js`.
- Main thread: inference runs synchronously in `Brain.tickLive()` on the game loop. There is no Brain Web Worker. Training workers are separate headless browser processes, not live browser inference workers.
- Frequency: one policy decision every 3 frames, with keys held/reused between decisions (`js/smb-brain.js:9, 1169-1215`).
- Exploration: training samples with `Math.random()` unless greedy; live Sovereign sets `L.greedy = true` (`:86-106, 1279-1283`). Thus live Brain policy selection is greedy, not exploratory.
- Input-to-action: four sampled heads → `applyKeys` → ordinary `processInput`/Fighter updates. Navigation and hazard layers may own movement/button channels outside the Sovereign arena (`:1188-1215`).
- Latest deployment consistency: `latest.json` is 24212, while the generated `latest.js` timestamp/content and `docs/sovereign.md:20-21` document a history of stale wrappers and swaps. `file://` deployments can therefore use an older generated checkpoint unless `latest.js` is regenerated.
- Existing instrumentation records rollout/update durations (`data/brain/log.jsonl`, `tools/brain/train.js:454-479`), but no production live inference-latency metric was found.

## 8. Metrics and evaluation evidence

The latest available main training log entry is iteration 15705 in `data/brain/log.jsonl` (the log is stale relative to `latest.json`): 31 episodes, 82,950 frames, cumulative batch decision count not stored on that line, mean reward/episode 6.90, current win 85%, 74 kills, 48 deaths, 12,221 damage dealt, 9,018 damage taken, entropy 1.59, KL 0.0289, clip fraction 0.224, four PPO epochs.

The log is per-iteration and opponent-stratified (`tools/brain/train.js:439-457`), with metrics including wins, deaths, damage, early/late damage, guards, jumps, abilities, supers, and lockout. It does not provide a single clean human win-rate benchmark.

The strongest deployment/evaluation evidence is in `docs/sovereign.md`:

- 20011/20909/24212/25296 candidate evaluations against hunters, prior nets, and timed habits are recorded at `docs/sovereign.md:98-106`.
- 24212’s field mean was 58.4% in one 8-opponent evaluation and 65.5% vs 20011; the later 25296 continuation had field mean 61.4% and 66.5% vs 20011, but memory kept/wiped gates still failed.
- The same document reports 24212 performing poorly in story crowds: 0/16 on a Nov 1 cross-check, while 20011 won 13/16; this is a measured warning against treating the latest checkpoint as universally strongest (`:91-92`).
- Human-facing evidence is replay-based, not a controlled benchmark. The dossier and lab docs report wins, damage and lockout, but the report found no statistically valid guarantee that the Brain kills a particular human seven times out of ten.

These metrics are measured artifacts, not estimates. They are not directly comparable across checkpoints without matching game version, opponent panel, lives, arena, and play filter.

## 9. Planning / lookahead

No MCTS, minimax, beam search, model-predictive control, learned world model, or candidate-action forward simulation was found for the live Brain. `Brain.rollout()` is an environment rollout for data collection, not a per-decision search procedure (`js/smb-brain.js:806-1151`).

There are limited non-search selectors:

- `Brain` samples one action tuple from the policy.
- Evaluation-only portfolio code feeds multiple networks and uses Thompson sampling between them at segments/stocks (`js/smb-brain.js:771-804, 938-943`); this is model selection, not lookahead.
- Navigation/hazard systems choose movement overrides but do not simulate future combat branches (`:1188-1215`).

The existing simulator could support bounded lookahead by cloning/resetting the game state, applying candidate tuples for a short horizon, and scoring health/lives/ringout/lockout. It would need deterministic RNG/state snapshots, a strict node/time budget, and isolation from global arrays and event systems. A practical first version would evaluate a small candidate set—current policy action, retreat, jump/anti-air, shield, attack, ability, super—over 6–18 decision steps, then return only the first action. This is not currently implemented.

## 10. Weaknesses and bottlenecks

1. The deployment state is fragmented: `latest.json`, generated `latest.js`, `state.json`, old snapshots, and candidate directories disagree on iteration/version.
2. The observation is hand-designed and mostly aggregate; no explicit sequence tokens for combos, no player identity, and no dedicated dodge action.
3. GRU memory exists and is trained, but repeated kept-vs-wiped tests do not demonstrate reliable within-match benefit.
4. Training opponents are not the real human. The simulator explicitly uses scripted policy opponents and calibrated buffs; this can reward generic strength rather than opponent-specific reads (`smb-smk2-training.js:234-242, 391-409`).
5. Live movement can be taken over by navigation/hazard code, so the network does not always control the complete action tuple.
6. Live behavior is greedy and therefore lacks exploration; useful uncertainty is represented only indirectly.
7. No production inference-latency telemetry or automated “actual checkpoint loaded” assertion was found beyond the console warning in `smb-menu-startcore.js:562-565`.
8. The `AdaptiveAI`/`SovereignMK2` systems can look neural in gameplay because they adapt visibly, but they are hand-coded cascades. This creates a major attribution risk in playtests.

## 11. Recommendations

- Make one manifest authoritative: checkpoint iteration, SHA-256, observation dimension, GRU dimension, training game commit/version, and generated-wrapper iteration; validate it at startup.
- Add a visible/debug assertion showing `Brain.live`, checkpoint iteration, and whether movement/navigation overrides the network.
- Train with replay-calibrated human proxies and behavior-switch opponents, not only scripted archetypes and prior nets.
- Add explicit action-history features (recent action tokens, combo phase, dodge/roll state, attack-start timing) and an opponent/session embedding if player-specific adaptation is required.
- Evaluate memory causally: matched seeds, same initial weights, memory kept vs reset at fixed intervals, enough matches for confidence intervals, and a behavior-shift metric in addition to win rate.
- Separate “strength training” from “adaptation training”: the current logs show candidate improvements that survive with memory wiped, which means they are generic policy improvements rather than learned mid-fight counters.
- Add an optional bounded action lookahead only after deterministic state cloning and latency budgets are in place.
- Preserve a fallback but report it as a distinct condition in all replay/evaluation artifacts.

## Final answers

1. **Which exact AI is the real neural-network adaptive fighter?** `Brain` in `js/smb-brain.js`, usually possessing `SovereignMK2` in Sovereign mode.
2. **Where is its neural network implemented?** Browser inference and observation construction: `js/smb-brain.js`; matching training MLP/optimizer: `tools/brain/ppo.js`; GRU/PyTorch update path: `tools/brain/torch_ppo.py` and `tools/brain/torch_client.js`.
3. **Where is its training code?** `tools/brain/train.js`, with browser rollouts in `Brain.rollout()` and optional PyTorch updates in `tools/brain/torch_ppo.py`.
4. **What architecture does it use?** Separate policy/value MLPs with tanh hidden layers `[253,128,128,11]` and `[253,128,128,1]`, plus a 128-unit GRU whose projection is added to the second hidden layer; four discrete action heads.
5. **What training algorithm does it use?** PPO with GAE, Adam, clipped policy loss, entropy bonus, value loss, gradient clipping, optional KL early stopping, and recurrent sequence minibatches when the GRU is enabled.

