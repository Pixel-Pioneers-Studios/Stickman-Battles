# TensorFlow Training Benchmark for Brain

Status: investigation and benchmark design only. No production code, live browser inference, checkpoint, or framework migration was changed. No training run was started for this investigation.

## Executive conclusion

TensorFlow is unlikely to meaningfully increase training throughput on the current machine by itself. The present trainer is dominated by a combination of headless-Chrome rollout collection and CPU PPO updates, depending on the run. The existing PyTorch sidecar is explicitly CPU-only (`tools/brain/torch_ppo.py:131-151`), even though this Mac has an Apple M4 GPU and the installed PyTorch reports MPS availability. TensorFlow is not installed, and official TensorFlow documentation still describes macOS GPU support as non-official/plug-in based rather than a standard supported GPU package.

The likely high-value optimization is batching or parallelizing rollout collection and reducing JS/Python data-transfer/update overhead, not switching CPU frameworks. A TensorFlow experiment is justified only as a controlled benchmark against the existing PyTorch sidecar and JavaScript PPO. It must use the same frozen rollout data, same weights, same PPO math, and the same recurrent sequence semantics. Do not migrate based on theoretical GPU support.

## 1. Existing training pipeline

### Rollout side

`tools/brain/train.js:286-288` launches multiple independent Puppeteer/Chrome workers. Each iteration sends the current policy weights to every worker and calls `Brain.rollout` in the real game page at `:351-355`. The workers run concurrently, but each is a separate browser process with real game globals, physics, opponent logic, and per-frame JavaScript.

The default configuration is `WORKERS=3`, `STEPS=8000` decisions per worker, and a nominal `THREADS=max(2, cpu_count-2)` for the optimizer (`tools/brain/train.js:49-51`). The rollout batch size is variable because matches terminate at different times. In the recorded iterations, one iteration typically returned about 24k–28k decisions and 73k–83k simulation frames.

### Update side

The JavaScript path uses `tools/brain/ppo.js` plus `tools/brain/pool.js`. `GradPool` creates Node worker threads and shares batch/weight buffers with `SharedArrayBuffer`; each minibatch is split across workers (`pool.js:38-86`). JS PPO performs values/GAE in `train.js:387-425`, then four PPO epochs with minibatches of 2048.

The PyTorch path is not a replacement rollout engine. `tools/brain/torch_client.js` starts one Python process and communicates with it using framed stdin/stdout buffers. `tools/brain/torch_ppo.py` owns the policy/value networks and Adam state, while JavaScript still owns rollouts, episode bookkeeping, checkpoint orchestration, and the browser inference format.

### Recurrent path

The current recurrent architecture is not a generic Keras/PyTorch default. Brain uses:

- two 128-unit tanh hidden layers;
- a 128-unit GRU fed from the first hidden layer;
- a learned `H -> second-hidden` memory projection;
- four categorical action heads with sizes `[3, 2, 2, 4]`;
- a 253-dimensional input;
- separate policy and value networks;
- 128-decision sequence pieces for truncated BPTT.

The exact JavaScript GRU equations are in `js/smb-brain.js:51-64`. The Python implementation uses `torch.nn.GRU` in `tools/brain/torch_ppo.py:84-108`, but its gate ordering and bias layout must remain compatible with the JavaScript equations when weights are exchanged.

## 2. Actual bottleneck evidence

### Timing fields already recorded

Each training iteration stores `tRoll` and `tUpd` in `data/*/log.jsonl` (`tools/brain/train.js:367, 427, 456`). `tRoll` covers concurrent browser rollout collection plus result transfer/assembly before the update. `tUpd` covers GAE and the optimizer path, including Python sidecar time for `--torch`.

Read-only analysis of the existing logs produced these medians over their last 100 available iterations:

| Run/log | Rollout median | Update median | Rollout share of iteration | Decisions/s |
|---|---:|---:|---:|---:|
| `data/brain/log.jsonl` | 2.71 s | 2.76 s | 49.5% | 4,764 |
| `data/brain-startup/log.jsonl` | 2.92 s | 4.20 s | 40.4% | 3,681 |
| `data/brain-habit/gen-startup-tp3/log.jsonl` | 6.89 s | 19.33 s | 25.0% | 945 |

These are historical measurements, not a new benchmark. They show that “the bottleneck” depends on workload:

- for ordinary `data/brain`, rollout and update are approximately balanced;
- for the startup run, the update is moderately slower;
- for the recurrent/habit run, the update dominates by roughly 3×.

The habit log also reports `tGae` around 40–43 seconds and `tPy` around 240–316 seconds inside `tUpd`, so the Python recurrent update—not only the optimizer kernel—is substantial in that workload. The exact internal timers should be treated as instrumentation evidence rather than additive wall-clock components because `tPy` includes the total Python update path.

### What is not yet measured

The current logs do not separately measure:

- time inside each browser worker versus result serialization;
- time spent assembling/copying the batch in Node;
- JS GAE versus JS gradient computation;
- Python sequence replay versus PPO minibatch backpropagation;
- CPU utilization per Chrome worker, Node, and Python;
- GPU utilization or MPS kernel time;
- peak resident memory and allocation/GC pauses.

Therefore a TensorFlow speedup cannot be responsibly estimated from `tRoll`/`tUpd` alone. The benchmark must add process-level sampling and phase timers in a separate DEV harness or wrapper; it must not alter production code for this research task.

### Likely bottleneck classification

1. **Rollout-bound regime:** headless Chrome, real physics, per-frame global game updates, and multiple-process scheduling dominate. A faster tensor framework will have little effect.
2. **Update-bound non-recurrent regime:** CPU PPO math, JS/Python copies, and minibatch overhead dominate. A compiled tensor backend may help, but the network is only about 330,508 parameters, so CPU/GPU launch and transfer overhead matter.
3. **Update-bound recurrent regime:** sequence replay and four PPO epochs dominate. Batching complete `[batch, sequence, feature]` tensors and avoiding repeated host copies may help more than merely changing TensorFlow/PyTorch APIs.

## 3. Current hardware and software

### Verified local hardware

The current machine reports:

- MacBook Air, Apple M4;
- 10 CPU cores: 4 performance and 6 efficiency;
- 16 GB unified memory;
- 10-core integrated Apple GPU;
- Metal 4 support;
- macOS 27.0.1;
- Node.js v25.8.0;
- Python 3.14.2.

These values came from read-only `sw_vers`, `sysctl`, and `system_profiler` queries.

### Existing Python environment

`tools/brain/.venv` contains:

- PyTorch 2.14.1;
- NumPy;
- `torch.backends.mps.is_available() == True`;
- `torch.cuda.is_available() == False`;
- no TensorFlow installation.

Despite MPS being available, `Trainer.__init__` hard-codes `self.dev = torch.device("cpu")` in `tools/brain/torch_ppo.py:131-151`. The current production training command therefore does not use the Apple GPU.

### TensorFlow support implications

TensorFlow’s official GRU API supports `return_sequences`, explicit initial state, masking, stateful operation, and configurable recurrent cells. See the [official GRU API](https://www.tensorflow.org/api_docs/python/tf/keras/layers/GRU) and [RNN API](https://www.tensorflow.org/api_docs/python/tf/keras/layers/RNN). That is sufficient to express sequence-wise PPO and truncated BPTT.

However, the [official TensorFlow installation guide](https://www.tensorflow.org/install/pip) states that macOS has no official GPU support, and the [pluggable-device documentation](https://www.tensorflow.org/install/gpu_plugins) describes Metal as a separate device plug-in. The current environment is also Python 3.14, while the official installation page lists narrower tested Python ranges for stable TensorFlow packages. Installing TensorFlow would therefore be a dependency experiment, not a ready-to-use acceleration path.

The practical alternatives are:

- TensorFlow CPU on Apple Silicon: possible in principle, but it competes with the existing PyTorch CPU path and requires a separate environment;
- TensorFlow plus Metal plug-in: possible in principle, but requires compatibility testing and may not accelerate this small recurrent workload;
- TensorFlow on a remote CUDA/Linux machine: potentially meaningful, but no longer a comparison of this current machine and adds transfer/operations cost.

## 4. Framework comparison

| Capability | Existing JavaScript PPO | Existing PyTorch PPO | TensorFlow/Keras proposal |
|---|---|---|---|
| Rollouts | Native: same JS game and Brain math | Still JS/browser | Still JS/browser unless separately rewritten |
| Current checkpoint format | Native row-major Float32/base64 | Exact flat transfer already implemented | Requires explicit adapter |
| CPU parallelism | Node worker threads + shared buffers | One Python sidecar, configurable CPU threads | `tf.data`/`tf.function` possible, not yet present |
| GPU use on this M4 | No | MPS available but currently disabled | Metal plug-in route, not official standard support |
| GRU | Custom cell-equivalent logic in JS | `torch.nn.GRU`, custom-compatible layout required | `tf.keras.layers.GRU` or custom `GRUCell` |
| Sequence PPO | Not implemented for GRU update in JS; GRU checkpoints require Torch | Implemented with 128-step pieces and detached starts | Implementable with explicit sequence batches/masks |
| Numerical parity | Reference implementation | Existing `torchparity.js` | Must add parity harness before use |
| Operational complexity | Lowest | Already deployed for training | New dependency, device, serialization, and optimizer risks |

### JavaScript PPO

The JavaScript path has the strongest compatibility and lowest operational risk for non-GRU models. Its disadvantages are manual loops, typed-array copies, and no optimized recurrent sequence implementation. The source comment in `train.js:325` intentionally rejects GRU training without `--torch`, so it is not currently a fair recurrent throughput baseline unless the benchmark explicitly includes only the supported non-GRU case.

### PyTorch

PyTorch already owns the recurrent PPO path, exact sequence handling, Adam, and checkpoint flattening. It is the correct baseline because it is the current implementation used for Brain’s GRU training. Its main performance limitations are CPU-only device selection, one sidecar process, repeated NumPy/Torch copies, and Python-side per-episode sequence replay.

### TensorFlow

TensorFlow can express the required model, but a stock Keras GRU is not automatically the same model as Brain. TensorFlow’s documented GRU has `reset_after=True` by default and may use a different gate/bias convention than the custom JavaScript `_gruStep`. A faithful migration would need either:

- a custom TensorFlow GRU cell reproducing the JS equations and parameter order; or
- a carefully tested conversion between TensorFlow’s kernel/recurrent-kernel/bias layout and Brain’s `Wi`, `Wh`, `bi`, `bh` arrays.

It would also need a custom second-hidden memory projection, two networks, multi-head categorical log-probability/entropy, clipped PPO loss, value loss, GAE, gradient clipping, KL early stopping, and truncated sequence masks.

## 5. Exact architecture and sequence compatibility

### Can TensorFlow represent it?

Yes, but not safely with a default Sequential model. The proposed TensorFlow graph should accept `[B, T, 253]`, run the first dense+tanh layer, run a custom GRU over T steps, add `M * h_t` to the second dense+tanh layer, then run the remaining linear policy/value layers. The initial state must be an explicit `[B, 128]` tensor so each sequence piece can start from the hidden state reached by its match prefix.

The PPO batch must retain:

- episode boundaries;
- piece-start hidden states for policy and value nets;
- valid-step masks for padded sequence tails;
- old log-probabilities and actions;
- advantages and returns computed per episode;
- the same 128-decision sequence length and 2048 effective minibatch size.

TensorFlow supports these operations, but its default masking semantics must be tested. The benchmark should use explicit masks in the loss and avoid relying on implicit statefulness, because samples are shuffled between PPO epochs and sequence pieces do not form a fixed one-to-one stream.

### Important parity risks

- gate ordering and `reset_after` convention;
- whether TensorFlow uses one combined bias or separate input/recurrent biases;
- dense weight orientation (`[in, out]` in Keras versus Brain’s row-major `[out, in]` flat layout);
- tanh/sigmoid behavior and float32 rounding;
- padding/mask treatment;
- hidden-state detachment at 128-step boundaries;
- sequence-start hidden state computed from the same pre-update weights;
- Adam epsilon, bias correction, gradient clipping, and update ordering;
- PPO entropy and multi-head action slicing.

## 6. Checkpoint export compatibility

### Answer

TensorFlow can export the weights in the exact format expected by `Brain.forward()`, but only through a deliberate adapter. A native `.keras`, SavedModel, or TensorFlow checkpoint is not directly loadable by `js/smb-brain.js`.

The [official Keras serialization guide](https://www.tensorflow.org/guide/keras/serialization_and_saving) documents `get_weights()`/`set_weights()` as NumPy-array transfers. An export script could reshape/transposes those arrays, flatten them in the current Brain order, convert to Float32, and emit the existing JSON/base64 fields:

- `sizes`;
- each dense `W` in row-major `[out][in]` order;
- each dense `b`;
- GRU `Wi`, `Wh`, `bi`, `bh` in the exact custom gate order;
- memory projection `M` in the exact `[secondHidden][GRU]` order.

The adapter must be validated by feeding a fixed observation sequence and initial hidden state into TensorFlow and Brain, then requiring close logits, values, and hidden states at every step. “The exported file loads” is not sufficient. Existing `tools/brain/torchparity.js` is the model for the required parity test.

## 7. Rollout batching investigation

Framework migration does not accelerate the current rollout bottleneck because rollouts execute the full browser game. The more promising rollout experiments are:

1. **Increase browser workers until saturation.** Sweep 1, 2, 3, 4, 6, and 8 workers while recording decisions/s, CPU%, memory, Chrome crashes, and iteration variance. The M4 has 10 cores but browser overhead and the Node/Python update compete for them.
2. **Separate rollout from update scheduling.** Keep the browser pool alive and measure whether page recycling, startup, or GC causes pauses. The current code recycles workers every 150 iterations (`train.js:100-106, 351-365`).
3. **Batch inference inside a worker only where semantics permit.** Brain decisions are recurrent and environment-dependent, so different matches can be batched only across independent episodes. Do not batch across time or opponents unless hidden states and action sampling remain isolated.
4. **Reduce transfer copies.** The current rollout returns base64 buffers and Node decodes them into typed arrays (`train.js:341-343`). A benchmark wrapper should time base64 decode, concatenation, and Python framing separately.
5. **Use a headless simulation runner without rendering only if it remains semantically identical.** This is a rollout-engine experiment, not a TensorFlow experiment, and must be validated against the real browser path.

The benchmark must not claim a TensorFlow gain if most wall-clock time is still in these browser phases.

## 8. Reproducible benchmark plan

### Phase A: instrumentation only

Create a separate benchmark harness or wrapper that records monotonic timestamps around:

- worker rollout start/end per browser;
- base64 decode and batch assembly;
- Python/JS GAE and value pass;
- recurrent sequence replay;
- each PPO epoch/minibatch group;
- optimizer step and weight serialization;
- total iteration.

Sample process CPU%, resident memory, and GPU utilization at 1 Hz. On this Mac, record Apple GPU activity using a read-only system monitor available on the machine; do not assume MPS utilization from a framework flag.

### Phase B: frozen-data optimizer benchmark

Use one existing non-production checkpoint and one frozen rollout dataset captured once. The dataset must contain `obs`, `acts`, `logps`, `rews`, `episodes`, `finalObs`, and the initial weights. Do not collect new rollouts during the optimizer comparison. Each backend receives byte-identical Float32/Int32 buffers.

Compare:

1. existing JavaScript PPO for a non-GRU checkpoint;
2. existing PyTorch CPU PPO for the same non-GRU checkpoint;
3. existing PyTorch CPU PPO for the GRU checkpoint;
4. TensorFlow CPU implementation of the same GRU checkpoint;
5. PyTorch MPS as an optional arm, only if the existing model runs correctly on MPS;
6. TensorFlow Metal as an optional arm, only if the environment can be installed without changing project dependencies.

For strict recurrent parity, the primary comparison is PyTorch CPU versus TensorFlow CPU. GPU arms are secondary because the current machine’s GPU support is not equivalent across frameworks.

### Fixed benchmark parameters

- identical initial checkpoint hash;
- identical frozen rollout dataset;
- `gamma=0.99`, `lambda=0.95`, clip `0.2`;
- four PPO epochs;
- effective minibatch size 2048;
- sequence length 128 decisions;
- hidden layers `[128, 128]`, GRU 128;
- float32 model/data tensors;
- same Adam learning rate `3e-4`, betas, epsilon, gradient norm cap `0.5`;
- same KL early-stop rule, or disable it for a pure fixed-update throughput pass;
- same number of PPO updates and same random minibatch permutations;
- warm-up iterations excluded from timing;
- at least 30 timed repetitions per backend/configuration.

### Metrics

Report median, p10, p90, and standard deviation for:

- gradient updates/s;
- decisions trained/s;
- total PPO update time;
- GAE/value time;
- sequence replay time;
- minibatch backpropagation time;
- rollout collection time;
- CPU utilization by process;
- GPU utilization and device memory, if applicable;
- peak resident memory;
- data-transfer bytes and time;
- logits/value/hidden-state numerical error;
- one-step weight error after a fixed update;
- learning improvement after equal wall-clock time on a separate held-out evaluation.

“Updates/s” must state whether one update means one minibatch, one PPO epoch, or one full train iteration. The recommended headline is **decisions trained per second for a full PPO update**, because it reflects the actual training loop.

### Numerical parity gates

Before timing, require:

- forward logits/value max absolute error ≤ `1e-5` on a fixed batch;
- recurrent hidden-state max absolute error ≤ `1e-5` over 128 steps;
- old-log-probability and entropy error ≤ `1e-5`;
- one fixed minibatch gradient error ≤ `1e-4` relative/absolute tolerance appropriate to near-zero values;
- one Adam update weight error ≤ `1e-5` for a deterministic test;
- identical PPO clip decisions and KL early-stop decision.

If parity fails, report the backend as incompatible; do not compare its speed or “fix” the model by changing hyperparameters.

### Learning-after-time test

After frozen-data timing, run separate experiment directories from the same initial checkpoint for equal wall-clock budgets, for example 10, 30, and 60 minutes. Use identical rollout settings and fresh output paths. Evaluate each candidate on:

- the original held-out league;
- a held-out recurrent sequence dataset;
- the adaptation benchmark from `ADAPTATION_RESEARCH_PLAN.md`;
- numerical and behavioral regression against the initial checkpoint.

Do not overwrite `data/brain/latest.json` or any current best model. A faster optimizer that produces worse learning per wall-clock minute is not an improvement.

## 9. Estimated performance scenarios

These are estimates, not measurements:

| Scenario | Expected effect |
|---|---|
| TensorFlow CPU replacing PyTorch CPU | 0.7×–1.3× update throughput; likely no total-loop win when rollouts are balanced |
| TensorFlow Metal on this small model | Unknown; could be slower due to dispatch/plug-in overhead, or faster if sequence batches are well compiled |
| PyTorch MPS after removing the CPU hard-code | Potentially 1.2×–4× update throughput, but highly workload- and kernel-dependent; must be measured |
| Better sequence batching/copy reduction | Potentially larger than a framework swap in the recurrent run |
| More/better browser workers | Potentially material in rollout-bound runs until CPU/memory saturation |
| Full rollout rewrite/batching | Potentially largest gain, but highest semantic risk and outside this task |

The ranges are intentionally broad because the model is small, the batch is recurrent, and the current machine has an integrated GPU. No migration recommendation should be based on these estimates.

## 10. Recommendation

Do not migrate Brain training to TensorFlow now.

Recommended order:

1. preserve the current PyTorch and JavaScript implementations;
2. add separate timing/utilization instrumentation;
3. benchmark PyTorch CPU versus PyTorch MPS without changing production inference or checkpoints;
4. reduce recurrent update copies and profile `seq_pass` versus minibatch backprop;
5. only then implement a throwaway TensorFlow parity prototype if the measured CPU update remains the dominant cost and TensorFlow can be installed in an isolated environment;
6. consider TensorFlow migration only if it passes numerical parity and demonstrates a sustained, reproducible total-training throughput gain after rollout time is included.

A reasonable decision gate is at least 1.5× faster full-iteration decisions/s, no material learning regression at equal wall-clock time, and no checkpoint/inference compatibility regression. If TensorFlow only speeds the optimizer while rollouts remain half of wall time, the end-to-end gain will be less than 1.5× and migration complexity is unlikely to pay back.

## 11. Source and evidence index

Verified repository sources:

- `js/smb-brain.js` — Brain inference, custom GRU, action heads, and observation dimensions.
- `tools/brain/ppo.js` — JavaScript MLP/Adam/PPO implementation.
- `tools/brain/pool.js` — Node worker-thread gradient pool and shared buffers.
- `tools/brain/torch_ppo.py` — PyTorch MLP/GRU, sequence replay, PPO update, hard-coded CPU device, and flat weight serialization.
- `tools/brain/torch_client.js` — framed Node/Python sidecar protocol.
- `tools/brain/train.js` — worker orchestration, rollout/update timing fields, hyperparameters, checkpoint saving, and backend selection.
- `tools/brain/torchparity.js` — existing PyTorch-vs-JS parity test pattern.

Measured during this investigation:

- current machine hardware/software inventory;
- installed PyTorch/MPS/TensorFlow availability;
- historical `tRoll`, `tUpd`, `tGae`, and `tPy` values from existing logs.

Estimates/hypotheses:

- all performance ranges in Section 9;
- likely gains from MPS, TensorFlow Metal, worker scaling, and copy reduction;
- the 1.5× migration gate, proposed as a decision rule rather than an observed result.

