'use strict';

// Offline renderer for the hand-authored Stickman Battles soundtrack. The
// arrangements are deliberately section-based (intro, main, lift, breakdown,
// finale), rather than a single bar copied for the whole loop. This is a
// deterministic synthesizer, not a generative-music tool.
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '../../audio/music');
const SR = 32000;
const TAU = Math.PI * 2;
let randomState = 0x5eed1234;
function rand() {
  randomState = (randomState * 1664525 + 1013904223) >>> 0;
  return randomState / 0x100000000;
}
function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }
function softClip(n) { return n / (1 + Math.abs(n)); }

function makeSong(name, bpm, bars, arrange) {
  randomState = 0x5eed1234;
  const beat = 60 / bpm;
  const length = Math.ceil(bars * 4 * beat * SR);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const busL = new Float32Array(length);
  const busR = new Float32Array(length);
  const at = (bar, eighth = 0) => (bar * 4 + eighth * 0.5) * beat;

  function mix(start, seconds, fn, volume = 1, pan = 0, send = 0.08) {
    const s = Math.max(0, Math.floor(start * SR));
    const e = Math.min(length, s + Math.floor(seconds * SR));
    const pl = 1 - Math.max(0, pan) * 0.45;
    const pr = 1 + Math.min(0, pan) * 0.45;
    for (let i = s; i < e; i++) {
      const t = (i - s) / SR;
      const v = fn(t, (i - s) / (e - s)) * volume;
      left[i] += v * pl;
      right[i] += v * pr;
      busL[i] += v * send * (0.85 - pan * 0.15);
      busR[i] += v * send * (0.85 + pan * 0.15);
    }
  }

  function synth(note, start, seconds, opt = {}) {
    const f = midi(note);
    const wave = opt.wave || 'saw';
    const attack = opt.attack ?? 0.012;
    const release = opt.release ?? 0.09;
    const detune = opt.detune ?? 0;
    const volume = opt.volume ?? 0.12;
    const pan = opt.pan ?? 0;
    const vibrato = opt.vibrato ?? 0;
    mix(start, seconds, (t, progress) => {
      const env = Math.min(1, t / attack) * Math.min(1, (1 - progress) / Math.max(0.001, release / seconds));
      const phase = TAU * (f * (1 + detune) * t + vibrato * Math.sin(TAU * 5 * t));
      let out;
      if (wave === 'sine') out = Math.sin(phase);
      else if (wave === 'square') out = Math.sign(Math.sin(phase));
      else if (wave === 'pluck') out = (Math.sin(phase) + 0.4 * Math.sin(phase * 2)) * Math.exp(-t * 5.8);
      else if (wave === 'string') out = (Math.sin(phase) + 0.22 * Math.sin(phase * 2) + 0.10 * Math.sin(phase * 3)) * (0.82 + 0.18 * Math.sin(TAU * 1.4 * t));
      else out = 2 * ((f * (1 + detune) * t) % 1) - 1;
      return out * env;
    }, volume, pan, opt.send ?? 0.08);
  }

  function chord(notes, start, seconds, opt = {}) {
    notes.forEach((n, i) => synth(n, start, seconds, {
      ...opt,
      pan: (opt.pan || 0) + (i - (notes.length - 1) / 2) * 0.16,
      detune: (opt.detune || 0) + (i % 2 ? 0.0018 : -0.0018),
    }));
  }

  function kick(start, amp = 0.65) {
    mix(start, 0.27, t => Math.sin(TAU * (132 * Math.exp(-t * 14) + 42) * t) * Math.exp(-t * 16), amp, 0, 0.015);
  }
  function snare(start, amp = 0.38) {
    let prev = 0;
    mix(start, 0.22, t => {
      const n = rand() * 2 - 1;
      const hi = n - prev * 0.72; prev = n;
      return (hi * 0.85 + Math.sin(TAU * 185 * t) * 0.26) * Math.exp(-t * 23);
    }, amp, 0, 0.12);
  }
  function hat(start, amp = 0.16, open = false) {
    let prev = 0;
    mix(start, open ? 0.36 : 0.08, t => {
      const n = rand() * 2 - 1;
      const hi = n - prev * 0.92; prev = n;
      return hi * Math.exp(-t * (open ? 8 : 52));
    }, amp, 0.10, 0.03);
  }
  function tom(start, note, amp = 0.32) {
    mix(start, 0.34, t => Math.sin(TAU * (midi(note) * (1.5 - t * 0.8)) * t) * Math.exp(-t * 9), amp, 0, 0.04);
  }
  function riser(start, seconds, amp = 0.16) {
    let prev = 0;
    mix(start, seconds, (t, p) => {
      const n = rand() * 2 - 1;
      const hi = n - prev * (0.72 + p * 0.20); prev = n;
      return hi * p * p * (0.32 + 0.68 * Math.sin(TAU * (150 + 950 * p) * t));
    }, amp, 0, 0.34);
  }
  function drums(bar, style, fill = false) {
    const base = at(bar);
    if (style === 'none') return;
    const hats = style === 'half' ? [0, 4, 8, 12] : style === 'drive' ? Array.from({ length: 16 }, (_, i) => i) : [0, 2, 4, 6, 8, 10, 12, 14];
    hats.forEach(s => hat(base + s * beat / 4, style === 'drive' ? 0.115 : 0.13, s === 14 && style !== 'half'));
    if (style === 'half') {
      kick(base, 0.55); kick(base + beat * 2.5, 0.34); snare(base + beat * 2, 0.40); return;
    }
    [0, 6, 8, 11, 14].forEach(s => { if (!(fill && s > 8)) kick(base + s * beat / 4, s === 0 ? 0.68 : 0.42); });
    [4, 12].forEach(s => { if (!(fill && s > 8)) snare(base + s * beat / 4, 0.40); });
    if (fill) [50, 50, 48, 48, 46, 46, 43, 43].forEach((n, i) => tom(base + (8 + i) * beat / 4, n, 0.25 + i * 0.02));
  }

  arrange({ beat, at, synth, chord, drums, kick, snare, hat, tom, riser });

  // Cross-feedback delay/reverb. The final bar has no spill beyond the loop point.
  const taps = [[0.155, 0.19], [0.317, 0.13], [0.491, 0.09]];
  for (let i = 0; i < length; i++) {
    let dl = 0, dr = 0;
    for (const [sec, gain] of taps) {
      const j = i - Math.floor(sec * SR);
      if (j >= 0) { dl += busR[j] * gain; dr += busL[j] * gain; }
    }
    left[i] = softClip((left[i] + dl) * 0.86);
    right[i] = softClip((right[i] + dr) * 0.86);
  }
  const data = Buffer.alloc(length * 4);
  for (let i = 0; i < length; i++) {
    data.writeInt16LE(Math.round(left[i] * 32767), i * 4);
    data.writeInt16LE(Math.round(right[i] * 32767), i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8);
  head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22); head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 4, 28);
  head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, name + '.wav'), Buffer.concat([head, data]));
}

const D = { Dm:[50,53,57], Bb:[46,50,53], C:[48,52,55], A:[45,49,52], Gm:[43,46,50], F:[41,45,48] };
const BASS = { Dm:38, Bb:34, C:36, A:33, Gm:31, F:29 };
const bossTheme = [[74,69,74,77,76], [74,72,70,65], [76,79,77,76,72], [73,69]];

makeSong('boss-threshold', 144, 32, ({ beat, at, synth, chord, drums, riser }) => {
  const prog = ['Dm','Bb','C','A','Dm','Bb','C','A','Gm','Bb','F','A','Gm','Bb','C','A'];
  for (let bar = 0; bar < 32; bar++) {
    const c = prog[bar % 16], next = prog[(bar + 1) % 16];
    const sec = at(bar), phase = bar < 4 ? 'intro' : bar < 16 ? 'main' : bar < 24 ? 'lift' : bar < 28 ? 'break' : 'final';
    chord(D[c], sec, beat * 3.95, { wave:'string', volume: phase === 'break' ? 0.045 : 0.070, attack:0.12, release:0.26, send:0.19 });
    synth(BASS[c], sec, beat * 0.92, { wave:'sine', volume:0.18, attack:0.006, release:0.06 });
    if (phase !== 'intro') [0,1,2,3,4,5,6,7].forEach(i => synth(BASS[c] + (i === 2 || i === 5 ? 12 : 0), sec + i * beat / 2, beat * 0.39, { wave:'square', volume: phase === 'break' ? 0.075 : 0.12, attack:0.005, release:0.035 }));
    if (phase === 'main' || phase === 'lift' || phase === 'final') {
      [0,1.5,2,3,3.5].forEach(q => chord([BASS[c] + 12, BASS[c] + 19, BASS[c] + 24], sec + q * beat, beat * 0.30, { wave:'saw', volume:0.042, attack:0.004, release:0.04, send:0.04 }));
    }
    if (phase === 'lift' || phase === 'final') {
      const arp = [D[c][0],D[c][1],D[c][2],D[c][0]+12,D[c][2],D[c][1],D[c][2],D[c][0]+12];
      arp.forEach((n, i) => synth(n + 12, sec + i * beat / 2, beat * 0.26, { wave:'pluck', volume:0.052, attack:0.002, release:0.10, pan:i % 2 ? 0.22 : -0.22, send:0.17 }));
    }
    if (phase === 'main' || phase === 'lift' || phase === 'final') {
      const line = bossTheme[bar % 4];
      line.forEach((n, i) => synth(n + (phase === 'final' ? 0 : -12), sec + i * beat * (4 / line.length), beat * (3.6 / line.length), { wave:'saw', volume: phase === 'final' ? 0.11 : 0.085, attack:0.02, release:0.08, vibrato:0.0015, send:0.22 }));
    }
    drums(bar, phase === 'intro' ? (bar > 1 ? 'half' : 'none') : phase === 'break' ? 'half' : phase === 'lift' || phase === 'final' ? 'drive' : 'main', [7,15,23,31].includes(bar));
    if (bar === 7 || bar === 15 || bar === 27) riser(sec + beat * 2, beat * 2, 0.13);
    if (next !== c && phase === 'final') synth(BASS[next] - 1, sec + beat * 3.5, beat * 0.35, { wave:'sine', volume:0.10, attack:0.004, release:0.04 });
  }
});

const BR = { Em:[52,55,59], C:[48,52,55], G:[43,47,50], B:[47,51,54], Am:[45,48,52], F:[41,45,48] };
const BRB = { Em:40, C:36, G:31, B:35, Am:33, F:29 };
makeSong('battle-royale', 150, 32, ({ beat, at, synth, chord, drums, kick, snare, hat, riser }) => {
  const prog = ['Em','C','G','B','Em','C','Am','B','Em','C','G','B','Am','C','F','B'];
  const hook = [76,79,83,79,76,74,71,74,76,79,86,83,79,76,74,71];
  for (let bar = 0; bar < 32; bar++) {
    const c = prog[bar % 16], sec = at(bar), phase = bar < 4 ? 'dropin' : bar < 12 ? 'drive' : bar < 20 ? 'chase' : bar < 24 ? 'break' : 'final';
    chord(BR[c], sec, beat * 3.95, { wave:'saw', volume: phase === 'break' ? 0.035 : 0.058, attack:0.05, release:0.20, send:0.14 });
    [0,1,2,3,4,5,6,7].forEach(i => synth(BRB[c] + (i % 4 === 3 ? 12 : 0), sec + i * beat / 2, beat * 0.32, { wave:'square', volume: phase === 'break' ? 0.09 : 0.17, attack:0.003, release:0.035, send:0.025 }));
    if (phase !== 'dropin' && phase !== 'break') {
      const stab = [BR[c][0]+12, BR[c][1]+12, BR[c][2]+12];
      [0,0.75,1.5,2,2.75,3.25].forEach((q, i) => chord(stab, sec + q * beat, beat * (i % 3 === 0 ? 0.42 : 0.24), { wave:'pluck', volume:0.048, attack:0.002, release:0.075, pan:i % 2 ? 0.18 : -0.18, send:0.15 }));
    }
    if (phase === 'chase' || phase === 'final') {
      hook.forEach((n, i) => synth(n + (bar % 4 === 3 ? 2 : 0), sec + i * beat / 4, beat * 0.20, { wave:'saw', volume:0.082, attack:0.008, release:0.05, vibrato:0.001, pan:i % 2 ? 0.10 : -0.10, send:0.20 }));
    }
    drums(bar, phase === 'break' ? 'half' : phase === 'drive' || phase === 'chase' || phase === 'final' ? 'drive' : 'main', [3,11,19,31].includes(bar));
    if (phase === 'final') { kick(sec + beat * 3.25, 0.34); snare(sec + beat * 3.75, 0.23); hat(sec + beat * 3.5, 0.14); }
    if ([3,11,23].includes(bar)) riser(sec + beat * 2.2, beat * 1.8, 0.12);
  }
});

const ST = { Am:[57,60,64], F:[53,57,60], C:[52,55,59], G:[55,59,62], Dm:[50,53,57], Em:[52,55,59], E:[52,56,59] };
const STB = { Am:45, F:41, C:36, G:43, Dm:38, Em:40, E:40 };
makeSong('story-embers', 102, 24, ({ beat, at, synth, chord, drums, hat, riser }) => {
  const prog = ['Am','F','C','G','Am','F','C','G','Dm','Am','F','E','Am','F','C','G','Dm','Am','F','E','Am','F','C','G'];
  const theme = [69,72,76,79,76,72,69,67,69,72,76,81,79,76,72,69];
  for (let bar = 0; bar < 24; bar++) {
    const c = prog[bar], sec = at(bar), phase = bar < 4 ? 'intro' : bar < 12 ? 'journey' : bar < 16 ? 'memory' : bar < 20 ? 'rise' : 'resolve';
    chord(ST[c], sec, beat * 3.98, { wave:'string', volume: phase === 'memory' ? 0.052 : 0.068, attack:0.18, release:0.35, send:0.25 });
    synth(STB[c], sec, beat * 3.6, { wave:'sine', volume:0.13, attack:0.03, release:0.24, send:0.08 });
    const broken = [ST[c][0],ST[c][1],ST[c][2],ST[c][1],ST[c][0],ST[c][1],ST[c][2],ST[c][1]];
    broken.forEach((n, i) => synth(n + 12, sec + i * beat / 2, beat * 0.42, { wave:'pluck', volume: phase === 'intro' ? 0.055 : 0.065, attack:0.004, release:0.15, pan:i % 2 ? 0.18 : -0.18, send:0.24 }));
    if (phase !== 'intro') theme.forEach((n, i) => synth(n + (phase === 'resolve' ? 12 : 0), sec + i * beat / 4, beat * 0.38, { wave:'sine', volume:phase === 'resolve' ? 0.105 : 0.075, attack:0.04, release:0.14, vibrato:0.001, send:0.30 }));
    if (phase === 'journey' || phase === 'rise' || phase === 'resolve') {
      drums(bar, phase === 'rise' || phase === 'resolve' ? 'main' : 'half', false);
      hat(sec + beat * 3.5, 0.07, true);
    }
    if (bar === 15 || bar === 19) riser(sec + beat * 2.2, beat * 1.8, 0.065);
  }
});

const AR = { Cm:[48,51,55], Ab:[44,48,51], Eb:[51,55,58], Bb:[46,50,53], Fm:[53,56,60], G:[43,47,50] };
const ARB = { Cm:36, Ab:32, Eb:39, Bb:34, Fm:41, G:31 };
makeSong('arena-neon', 142, 32, ({ beat, at, synth, chord, drums, riser }) => {
  const prog = ['Cm','Ab','Eb','Bb','Cm','Ab','Fm','G','Cm','Ab','Eb','Bb','Fm','Ab','G','G'];
  const lead = [72,75,79,84,79,75,72,70,72,75,82,79,75,72,70,67];
  for (let bar = 0; bar < 32; bar++) {
    const c = prog[bar % 16], sec = at(bar), phase = bar < 4 ? 'intro' : bar < 16 ? 'cruise' : bar < 24 ? 'boost' : bar < 28 ? 'bridge' : 'finish';
    chord(AR[c], sec, beat * 3.96, { wave:'saw', volume:phase === 'bridge' ? 0.040 : 0.065, attack:0.06, release:0.18, send:0.16 });
    [0,1,2,3,4,5,6,7].forEach(i => synth(ARB[c] + (i % 4 === 2 ? 12 : 0), sec + i * beat / 2, beat * 0.36, { wave:'square', volume:0.145, attack:0.005, release:0.04, send:0.02 }));
    const arp = [AR[c][0]+12, AR[c][1]+12, AR[c][2]+12, AR[c][1]+24];
    arp.concat(arp).forEach((n, i) => synth(n, sec + i * beat / 2, beat * 0.22, { wave:'pluck', volume:phase === 'intro' ? 0.03 : 0.052, attack:0.002, release:0.08, pan:i % 2 ? 0.24 : -0.24, send:0.18 }));
    if (phase === 'boost' || phase === 'finish') lead.forEach((n, i) => synth(n, sec + i * beat / 4, beat * 0.18, { wave:'saw', volume:0.083, attack:0.01, release:0.045, vibrato:0.0012, send:0.20 }));
    drums(bar, phase === 'intro' ? (bar > 1 ? 'main' : 'none') : phase === 'bridge' ? 'half' : phase === 'boost' || phase === 'finish' ? 'drive' : 'main', [7,15,23,31].includes(bar));
    if ([7,15,27].includes(bar)) riser(sec + beat * 2, beat * 2, 0.12);
  }
});

console.log('Rendered four hand-authored soundtrack arrangements to ' + OUT);
