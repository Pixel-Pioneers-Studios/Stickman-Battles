'use strict';
/*
 * tools/brain/torchparity.js: does the PyTorch sidecar train the same as ppo.js? DEV ONLY.
 *
 * Same random nets (the real 250-128-128 shape), same random batch, then:
 *   step    one minibatch with fixed indices: ppo.js chunkGrads + Adam vs torch
 *   update  values + GAE + one full-batch epoch (mb = N, so shuffling cannot matter)
 *           with train.js's JS code path vs torch_ppo.py's update
 * Prints the largest weight difference after each; float32 noise is ~1e-6.
 *
 * Usage: node tools/brain/torchparity.js
 */
const { MLP, Adam, chunkGrads } = require('./ppo');
const { TorchPPO, flatOf } = require('./torch_client');

const D = 250, HEADS = [3, 2, 2, 4], H = HEADS.length, A = 11, N = 3000;
const CFG = { gamma: 0.99, lambda: 0.95, clip: 0.2, epochs: 4, mb: 1024, entCoef: 0.01, maxGrad: 0.5, targetKl: 0.03, lr: 3e-4, HEADS };
const clone = n => MLP.fromJSON(JSON.parse(JSON.stringify(n.toJSON())));
const maxDiff = (a, b) => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; };

function batch() {
  const obs = new Float32Array(N * D).map(() => Math.random() * 2 - 1);
  const acts = new Int32Array(N * H); for (let r = 0; r < N; r++) HEADS.forEach((n, h) => { acts[r * H + h] = (Math.random() * n) | 0; });
  const logps = new Float32Array(N).map(() => -3 - Math.random());
  const rews = new Float32Array(N).map(() => (Math.random() - 0.5) * 0.2);
  const episodes = []; for (let s = 0; s < N;) { const len = Math.min(N - s, 200 + ((Math.random() * 600) | 0)); episodes.push({ start: s, len, trunc: Math.random() < 0.5, finalObs: new Float32Array(D).map(() => Math.random() * 2 - 1) }); s += len; }
  return { obs, acts, logps, rews, episodes };
}

(async () => {
  const pi0 = new MLP([D, 128, 128, A], 0.01), vf0 = new MLP([D, 128, 128, 1], 1);
  const b = batch();
  let bad = false;

  // ── one minibatch, fixed indices ──
  {
    const pi = clone(pi0), vf = clone(vf0), po = new Adam(pi, CFG.lr), vo = new Adam(vf, CFG.lr);
    const adv = new Float32Array(N).map(() => Math.random() * 2 - 1), ret = new Float32Array(N).map(() => Math.random());
    const idx = new Int32Array(CFG.mb).map(() => (Math.random() * N) | 0);
    chunkGrads(pi, vf, { obs: b.obs, acts: b.acts, logps: b.logps, adv, ret, D }, idx, CFG.mb, CFG);
    po.step(1, CFG.maxGrad); vo.step(1, CFG.maxGrad);
    const t = new TorchPPO(() => {});
    await t.init(pi0, vf0, CFG, 4, 1);
    const { bufs } = await t.call({ type: 'step', N, D, H, m: CFG.mb },
      [['obs', b.obs], ['acts', b.acts], ['logps', b.logps], ['adv', adv], ['ret', ret], ['idx', idx]]);
    t.close();
    const dp = maxDiff(flatOf(pi), bufs.pi), dv = maxDiff(flatOf(vf), bufs.vf);
    console.log(`step    pi max|diff| ${dp.toExponential(2)}  vf ${dv.toExponential(2)}  (one Adam step moves weights ~${CFG.lr.toExponential(0)})`);
    if (dp > 2e-5 || dv > 2e-5) bad = true;
  }

  // ── values + GAE + one full-batch epoch ──
  {
    const cfg = Object.assign({}, CFG, { epochs: 1, mb: N });
    const pi = clone(pi0), vf = clone(vf0), po = new Adam(pi, cfg.lr), vo = new Adam(vf, cfg.lr);
    // train.js's JS path, lines "Values + GAE" and "Update"
    const V = vf.forward(b.obs, N).slice(), adv = new Float32Array(N), ret = new Float32Array(N);
    for (const e of b.episodes) {
      let next = 0; if (e.trunc && e.finalObs) next = vf.forward(e.finalObs, 1)[0];
      let gae = 0;
      for (let t = e.start + e.len - 1; t >= e.start; t--) {
        const delta = b.rews[t] + cfg.gamma * next - V[t]; gae = delta + cfg.gamma * cfg.lambda * gae;
        adv[t] = gae; ret[t] = gae + V[t]; next = V[t];
      }
    }
    let mu = 0, sd = 0; for (let i = 0; i < N; i++) mu += adv[i]; mu /= N;
    for (let i = 0; i < N; i++) sd += (adv[i] - mu) ** 2; sd = Math.sqrt(sd / N) + 1e-8;
    const nadv = adv.map(a => (a - mu) / sd);
    const idx = new Int32Array(N).map((_, i) => i);
    const st = chunkGrads(pi, vf, { obs: b.obs, acts: b.acts, logps: b.logps, adv: nadv, ret, D }, idx, N, cfg);
    po.step(1, cfg.maxGrad); vo.step(1, cfg.maxGrad);
    const t = new TorchPPO(() => {});
    await t.init(pi0, vf0, cfg, 4, 1);
    const tpi = clone(pi0), tvf = clone(vf0);
    const u = await t.update(tpi, tvf, Object.assign({ N, D, H }, b), 1);
    t.close();
    const dp = maxDiff(flatOf(pi), flatOf(tpi)), dv = maxDiff(flatOf(vf), flatOf(tvf));
    console.log(`update  pi max|diff| ${dp.toExponential(2)}  vf ${dv.toExponential(2)}  | loss js ${(st.pl / N).toFixed(5)} torch ${u.pl.toFixed(5)}  vl js ${(st.vl / N).toFixed(5)} torch ${u.vl.toFixed(5)}`);
    if (dp > 2e-5 || dv > 2e-5) bad = true;
  }
  console.log(bad ? 'PARITY FAIL' : 'parity ok');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
