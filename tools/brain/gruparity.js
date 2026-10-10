// Browser Brain.forward (stepwise GRU) vs torch seq(), same random weights incl. nonzero M.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const { MLP } = require(ROOT + '/tools/brain/ppo');
const { TorchPPO } = require(ROOT + '/tools/brain/torch_client');
const ctx = { atob, btoa, Float32Array, Uint8Array, Float64Array, Math, localStorage: { getItem: () => null }, console };
const Brain = vm.runInNewContext(fs.readFileSync(ROOT + '/js/smb-brain.js', 'utf8') + ';Brain', ctx);
(async () => {
  const D = 250, T = 400, H = 128;
  const pi = new MLP([D, 128, 128, 11], 0.5).addGru(H), vf = new MLP([D, 128, 128, 1], 1).addGru(H);
  for (const n of [pi, vf]) for (let i = 0; i < n.gru.M.length; i++) n.gru.M[i] = (Math.random() - 0.5) * 0.3;
  const obs = new Float32Array(T * D).map(() => Math.random() * 2 - 1);
  const t = new TorchPPO(() => {});
  await t.init(pi, vf, { HEADS: [3, 2, 2, 4], lr: 3e-4 }, 2, 1);
  const { bufs } = await t.call({ type: 'seq', T, D }, [['obs', obs]]);
  t.close();
  let worst = 0, noMem = 0;
  for (const [net, ref, A] of [[pi, bufs.logits, 11], [vf, bufs.v, 1]]) {
    const bn = Brain.loadNet(JSON.parse(JSON.stringify(net.toJSON()))), h = Brain.newState(bn);
    const flat = JSON.parse(JSON.stringify(net.toJSON())); delete flat.gru; const plain = Brain.loadNet(flat);
    for (let s = 0; s < T; s++) {
      const x = obs.subarray(s * D, s * D + D);
      const out = Brain.forward(bn, x, h);
      for (let k = 0; k < A; k++) worst = Math.max(worst, Math.abs(out[k] - ref[s * A + k]));
      const o2 = Brain.forward(plain, x);
      for (let k = 0; k < A; k++) noMem = Math.max(noMem, Math.abs(o2[k] - ref[s * A + k]));
    }
  }
  console.log(`browser vs torch over ${T} steps: max|diff| ${worst.toExponential(2)}  (same net with memory removed differs by ${noMem.toFixed(3)})`);
  process.exit(worst < 1e-4 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
