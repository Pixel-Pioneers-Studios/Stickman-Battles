'use strict';
/*
 * tools/brain/torch_client.js: train.js's end of the PyTorch sidecar. DEV ONLY.
 *
 * Spawns tools/brain/torch_ppo.py under tools/brain/.venv and speaks its framed
 * protocol (uint32 LE header length, JSON header, raw float32/int32 buffers).
 * Weights cross as flat float32 in ppo.js's layout: per layer W ([out][in]) then b.
 *
 * Setup once: python3 -m venv tools/brain/.venv && tools/brain/.venv/bin/pip install torch numpy
 */
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');

const PY = path.join(__dirname, '.venv', 'bin', 'python');

function flatOf(net) {
  let n = 0; for (let l = 0; l < net.L; l++) n += net.W[l].length + net.b[l].length;
  const out = new Float32Array(n); let o = 0;
  for (let l = 0; l < net.L; l++) { out.set(net.W[l], o); o += net.W[l].length; out.set(net.b[l], o); o += net.b[l].length; }
  return out;
}
function loadFlat(net, f) {
  let o = 0;
  for (let l = 0; l < net.L; l++) {
    net.W[l].set(f.subarray(o, o + net.W[l].length)); o += net.W[l].length;
    net.b[l].set(f.subarray(o, o + net.b[l].length)); o += net.b[l].length;
  }
  if (o !== f.length) throw new Error(`torch weights ${f.length} != net params ${o}`);
}

class TorchPPO {
  constructor(log = console.log) {
    if (!fs.existsSync(PY)) throw new Error(`no ${path.relative(process.cwd(), PY)}; run: python3 -m venv tools/brain/.venv && tools/brain/.venv/bin/pip install torch numpy`);
    this.proc = spawn(PY, [path.join(__dirname, 'torch_ppo.py')], { stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc.stderr.on('data', d => String(d).trimEnd().split('\n').forEach(l => log(l)));
    this.buf = Buffer.alloc(0); this.waiting = null; this.dead = null;
    this.proc.stdout.on('data', d => { this.buf = Buffer.concat([this.buf, d]); this._drain(); });
    this.proc.on('exit', code => {
      this.dead = new Error(`torch sidecar exited ${code}`);
      if (this.waiting) { const w = this.waiting; this.waiting = null; w.reject(this.dead); }
    });
  }
  _drain() {
    if (!this.waiting || this.buf.length < 4) return;
    const hl = this.buf.readUInt32LE(0);
    if (this.buf.length < 4 + hl) return;
    const head = JSON.parse(this.buf.subarray(4, 4 + hl).toString('utf8'));
    let need = 4 + hl; for (const [, , n] of head.bufs || []) need += n * 4;
    if (this.buf.length < need) return;
    const bufs = {}; let o = 4 + hl;
    for (const [name, dt, n] of head.bufs || []) {
      const ab = this.buf.buffer.slice(this.buf.byteOffset + o, this.buf.byteOffset + o + n * 4);
      bufs[name] = dt === 'i32' ? new Int32Array(ab) : new Float32Array(ab); o += n * 4;
    }
    this.buf = this.buf.subarray(need);
    const w = this.waiting; this.waiting = null;
    if (head.error) w.reject(new Error(head.error)); else w.resolve({ head, bufs });
  }
  // bufs: [[name, Float32Array|Int32Array], ...]
  call(head, bufs = []) {
    if (this.dead) return Promise.reject(this.dead);
    if (this.waiting) return Promise.reject(new Error('torch sidecar busy'));
    return new Promise((resolve, reject) => {
      this.waiting = { resolve, reject };
      head = Object.assign({}, head, { bufs: bufs.map(([n, a]) => [n, a instanceof Int32Array ? 'i32' : 'f32', a.length]) });
      const h = Buffer.from(JSON.stringify(head), 'utf8'), len = Buffer.alloc(4); len.writeUInt32LE(h.length, 0);
      this.proc.stdin.write(len); this.proc.stdin.write(h);
      for (const [, a] of bufs) this.proc.stdin.write(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
      this._drain();
    });
  }
  async init(pi, vf, cfg, threads, seed) {
    const { head } = await this.call({ type: 'init', piSizes: pi.sizes, vfSizes: vf.sizes, cfg, threads, seed },
      [['pi', flatOf(pi)], ['vf', flatOf(vf)]]);
    return head;
  }
  // Runs values + GAE + the PPO epochs on the sidecar, then copies the new
  // weights into pi/vf. episodes: [{start, len, trunc, finalObs (Float32Array)}].
  async update(pi, vf, b, seed) {
    const fin = b.episodes.filter(e => e.trunc && e.finalObs);
    const finalObs = new Float32Array(fin.length * b.D); fin.forEach((e, i) => finalObs.set(e.finalObs, i * b.D));
    const { head, bufs } = await this.call(
      { type: 'update', N: b.N, D: b.D, H: b.H, seed, episodes: b.episodes.map(e => [e.start, e.len, e.trunc && e.finalObs ? 1 : 0]) },
      [['obs', b.obs], ['acts', b.acts], ['logps', b.logps], ['rews', b.rews], ['finalObs', finalObs]]);
    loadFlat(pi, bufs.pi); loadFlat(vf, bufs.vf);
    return head.upd;
  }
  close() { try { this.proc.stdin.end(); } catch (e) {} }
}

module.exports = { TorchPPO, flatOf, loadFlat };
