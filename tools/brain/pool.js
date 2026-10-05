'use strict';
/*
 * tools/brain/pool.js — data-parallel PPO gradients over worker_threads. DEV ONLY.
 *
 * Weights and the iteration's batch live in SharedArrayBuffers, so a minibatch
 * costs one small message per thread: the slice of indices to work on. Each
 * thread returns its gradient slice; slices add because chunkGrads() divides
 * by the full minibatch size.
 */
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { MLP, chunkGrads } = require('./ppo');

function paramCount(sizes) { let n = 0; for (let l = 0; l < sizes.length - 1; l++) n += sizes[l] * sizes[l + 1] + sizes[l + 1]; return n; }

// Re-point a net's W/b (and gW/gb) at views into flat buffers. `copy` moves the
// net's current values in; workers bind without it so they never overwrite.
function bindFlat(net, wBuf, gBuf, copy) {
  let o = 0;
  for (let l = 0; l < net.L; l++) {
    const nW = net.sizes[l] * net.sizes[l + 1], nB = net.sizes[l + 1];
    const W = new Float32Array(wBuf.buffer, wBuf.byteOffset + o * 4, nW);
    if (copy) W.set(net.W[l]);
    net.W[l] = W;
    if (gBuf) net.gW[l] = new Float32Array(gBuf.buffer, gBuf.byteOffset + o * 4, nW);
    o += nW;
    const b = new Float32Array(wBuf.buffer, wBuf.byteOffset + o * 4, nB);
    if (copy) b.set(net.b[l]);
    net.b[l] = b;
    if (gBuf) net.gb[l] = new Float32Array(gBuf.buffer, gBuf.byteOffset + o * 4, nB);
    o += nB;
  }
}

function sharedF32(n) { return new Float32Array(new SharedArrayBuffer(n * 4)); }
function sharedI32(n) { return new Int32Array(new SharedArrayBuffer(n * 4)); }

class GradPool {
  constructor(threads, pi, vf, cfg) {
    this.pi = pi; this.vf = vf; this.cfg = cfg;
    this.nPi = paramCount(pi.sizes); this.nVf = paramCount(vf.sizes);
    this.wPi = sharedF32(this.nPi); this.wVf = sharedF32(this.nVf);
    this.gPi = new Float32Array(this.nPi); this.gVf = new Float32Array(this.nVf);
    bindFlat(pi, this.wPi, this.gPi, true); bindFlat(vf, this.wVf, this.gVf, true);
    this.threads = Array.from({ length: threads }, () => new Worker(__filename, {
      workerData: { piSizes: pi.sizes, vfSizes: vf.sizes, wPi: this.wPi, wVf: this.wVf,
                    cfg: { HEADS: cfg.HEADS, clip: cfg.clip, entCoef: cfg.entCoef } },
    }));
    this.cap = 0;
  }

  setBatch(b) {
    const { N, D } = b, H = this.cfg.HEADS.length;
    if (N > this.cap) {
      this.cap = Math.ceil(N * 1.25);
      this.sb = { obs: sharedF32(this.cap * D), acts: sharedI32(this.cap * H), logps: sharedF32(this.cap),
                  adv: sharedF32(this.cap), ret: sharedF32(this.cap), idx: sharedI32(this.cap) };
      const msg = { type: 'batch', D, ...this.sb };
      for (const t of this.threads) t.postMessage(msg);
    }
    this.sb.obs.set(b.obs); this.sb.acts.set(b.acts); this.sb.logps.set(b.logps);
    this.sb.adv.set(b.adv); this.sb.ret.set(b.ret);
  }

  // Leaves the summed minibatch gradient in pi.gW/gb and vf.gW/gb.
  async grads(idx, start, m) {
    this.sb.idx.set(idx.subarray ? idx.subarray(start, start + m) : idx.slice(start, start + m), start);
    const T = this.threads.length, per = Math.ceil(m / T);
    const parts = await Promise.all(this.threads.map((t, i) => new Promise(res => {
      const a = start + i * per, z = Math.min(start + m, a + per);
      if (a >= z) { res(null); return; }
      t.once('message', res);
      t.postMessage({ type: 'grad', a, z, m });
    })));
    this.gPi.fill(0); this.gVf.fill(0);
    const st = { pl: 0, vl: 0, ent: 0, kl: 0, clip: 0, n: 0 };
    for (const p of parts) {
      if (!p) continue;
      const gp = p.gPi, gv = p.gVf;
      for (let i = 0; i < gp.length; i++) this.gPi[i] += gp[i];
      for (let i = 0; i < gv.length; i++) this.gVf[i] += gv[i];
      for (const k in st) st[k] += p.st[k];
    }
    return st;
  }

  close() { for (const t of this.threads) t.terminate(); }
}

if (!isMainThread) {
  const d = workerData;
  const pi = new MLP(d.piSizes), vf = new MLP(d.vfSizes);
  const gPi = new Float32Array(paramCount(d.piSizes)), gVf = new Float32Array(paramCount(d.vfSizes));
  bindFlat(pi, d.wPi, gPi); bindFlat(vf, d.wVf, gVf);
  let batch = null;
  parentPort.on('message', msg => {
    if (msg.type === 'batch') { batch = msg; return; }
    const idx = batch.idx.subarray(msg.a, msg.z);
    const st = chunkGrads(pi, vf, batch, idx, msg.m, d.cfg);
    parentPort.postMessage({ st, gPi: gPi.slice(), gVf: gVf.slice() });
  });
}

module.exports = { GradPool, bindFlat, paramCount };
