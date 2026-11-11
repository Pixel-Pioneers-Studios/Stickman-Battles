'use strict';
// Synth voices for a film score, the same ones as film/score.js (the game's soundtrack voices: string, pluck, saw,
// square, sine, bell; kick, snare, hat, tom, riser, crash; cross-fed delay), on an absolute timeline in seconds.
// score.js keeps its own copy so "Kael vs Sovereign" renders exactly as it shipped.
//
//   const V = require('./score-voices')(durationSeconds, seed);  ...  V.write(outPath);
const fs = require('fs'), path = require('path');

module.exports = function (DUR, seed) {
  const SR = 48000, TAU = Math.PI * 2;
  let rs = seed || 0x5eed1234;
  const rand = () => (rs = (rs * 1664525 + 1013904223) >>> 0) / 0x100000000;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const softClip = n => n / (1 + Math.abs(n));
  const N = Math.ceil(DUR * SR);
  const L = new Float32Array(N), R = new Float32Array(N), BL = new Float32Array(N), BR = new Float32Array(N);

  function mix(start, seconds, fn, volume = 1, pan = 0, send = 0.08) {
    const s = Math.max(0, Math.floor(start * SR)), e = Math.min(N, s + Math.floor(seconds * SR));
    const pl = 1 - Math.max(0, pan) * 0.45, pr = 1 + Math.min(0, pan) * 0.45;
    for (let i = s; i < e; i++) {
      const t = (i - s) / SR, v = fn(t, (i - s) / (e - s)) * volume;
      L[i] += v * pl; R[i] += v * pr;
      BL[i] += v * send * (0.85 - pan * 0.15); BR[i] += v * send * (0.85 + pan * 0.15);
    }
  }
  function synth(note, start, seconds, o = {}) {
    const f = midi(note), wave = o.wave || 'saw', attack = o.attack ?? 0.012, release = o.release ?? 0.09, detune = o.detune ?? 0, vib = o.vibrato ?? 0;
    mix(start, seconds, (t, p) => {
      const env = Math.min(1, t / attack) * Math.min(1, (1 - p) / Math.max(0.001, release / seconds));
      const ph = TAU * (f * (1 + detune) * t + vib * Math.sin(TAU * 5 * t));
      let out;
      if (wave === 'sine') out = Math.sin(ph);
      else if (wave === 'square') out = Math.sign(Math.sin(ph));
      else if (wave === 'pluck') out = (Math.sin(ph) + 0.4 * Math.sin(ph * 2)) * Math.exp(-t * 5.8);
      else if (wave === 'bell') out = (Math.sin(ph) + 0.5 * Math.sin(ph * 2.76) + 0.25 * Math.sin(ph * 5.4)) * Math.exp(-t * 2.2);
      // Glass: a bell with inharmonic partials that ring longer, for the Creator's constructions.
      else if (wave === 'glass') out = (Math.sin(ph) + 0.6 * Math.sin(ph * 3.01) + 0.35 * Math.sin(ph * 4.97) + 0.2 * Math.sin(ph * 7.1)) * Math.exp(-t * 1.4) * 0.6;
      else if (wave === 'string') out = (Math.sin(ph) + 0.22 * Math.sin(ph * 2) + 0.10 * Math.sin(ph * 3)) * (0.82 + 0.18 * Math.sin(TAU * 1.4 * t));
      // Choir-like: a soft stack of odd harmonics with slow breath.
      else if (wave === 'choir') out = (Math.sin(ph) + 0.33 * Math.sin(ph * 3) + 0.14 * Math.sin(ph * 5)) * (0.75 + 0.25 * Math.sin(TAU * 0.6 * t + note));
      else out = 2 * ((f * (1 + detune) * t) % 1) - 1;
      return out * env;
    }, o.volume ?? 0.12, o.pan ?? 0, o.send ?? 0.08);
  }
  function chord(notes, start, seconds, o = {}) {
    notes.forEach((n, i) => synth(n, start, seconds, { ...o, pan: (o.pan || 0) + (i - (notes.length - 1) / 2) * 0.16, detune: (o.detune || 0) + (i % 2 ? 0.0018 : -0.0018) }));
  }
  function kick(start, amp = 0.65) { mix(start, 0.27, t => Math.sin(TAU * (132 * Math.exp(-t * 14) + 42) * t) * Math.exp(-t * 16), amp, 0, 0.015); }
  function snare(start, amp = 0.38) { let pv = 0; mix(start, 0.22, t => { const n = rand() * 2 - 1, hi = n - pv * 0.72; pv = n; return (hi * 0.85 + Math.sin(TAU * 185 * t) * 0.26) * Math.exp(-t * 23); }, amp, 0, 0.12); }
  function hat(start, amp = 0.16, open = false) { let pv = 0; mix(start, open ? 0.36 : 0.08, t => { const n = rand() * 2 - 1, hi = n - pv * 0.92; pv = n; return hi * Math.exp(-t * (open ? 8 : 52)); }, amp, 0.1, 0.03); }
  function tom(start, note, amp = 0.32) { mix(start, 0.34, t => Math.sin(TAU * (midi(note) * (1.5 - t * 0.8)) * t) * Math.exp(-t * 9), amp, 0, 0.04); }
  function riser(start, seconds, amp = 0.16) { let pv = 0; mix(start, seconds, (t, p) => { const n = rand() * 2 - 1, hi = n - pv * (0.72 + p * 0.2); pv = n; return hi * p * p * (0.32 + 0.68 * Math.sin(TAU * (150 + 950 * p) * t)); }, amp, 0, 0.34); }
  function crash(start, amp = 0.2, len = 1.6) { let pv = 0; mix(start, len, t => { const n = rand() * 2 - 1, hi = n - pv * 0.95; pv = n; return hi * Math.exp(-t * 2.6); }, amp, 0, 0.3); }
  function drone(note, start, seconds, amp = 0.12) { const f = midi(note); mix(start, seconds, (t, p) => { const f2 = Math.min(1, t / 2) * Math.min(1, (1 - p) * seconds / 2); return (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.003 * t) + 0.2 * Math.sin(TAU * f * 2 * t)) * f2; }, amp, 0, 0.1); }
  // A low rumble: brown noise, swelling.
  function rumble(start, seconds, amp = 0.08) { let a = 0; mix(start, seconds, (t, p) => { a = a * 0.985 + (rand() * 2 - 1) * 0.06; return a * 4 * Math.min(1, t / 0.8) * Math.min(1, (1 - p) * seconds / 0.8); }, amp, 0, 0.1); }
  function hit(at, notes, amp = 1) {
    kick(at, 0.85 * amp); kick(at + 0.01, 0.5 * amp); snare(at, 0.3 * amp); crash(at, 0.22 * amp, 2.2);
    chord(notes, at, 2.4, { wave: 'saw', volume: 0.05 * amp, attack: 0.005, release: 1.6, send: 0.3 });
    synth(notes[0] - 12, at, 2.0, { wave: 'sine', volume: 0.22 * amp, attack: 0.004, release: 1.4 });
  }
  function heartbeat(t0, t1, every = 1.1, amp = 0.4) { for (let t = t0; t < t1; t += every) { kick(t, amp); kick(t + 0.22, amp * 0.6); } }
  // Hard silence on the final output (after the delay), with 8 ms edges: a cut to black.
  const mutes = [];
  function mute(t0, t1) { mutes.push([t0, t1]); }
  function write(out) {
    const ramp = 0.008 * SR, gainAt = i => { let g = 1; for (const [a, b] of mutes) { const s0 = a * SR, s1 = b * SR; if (i > s0 - ramp && i < s1 + ramp) g = Math.min(g, Math.max(0, (s0 - i) / ramp, (i - s1) / ramp)); } return g; };
    const taps = [[0.155, 0.19], [0.317, 0.13], [0.491, 0.09], [0.73, 0.06]];
    const data = Buffer.alloc(N * 4);
    for (let i = 0; i < N; i++) {
      let dl = 0, dr = 0;
      for (const [sec, g] of taps) { const j = i - Math.floor(sec * SR); if (j >= 0) { dl += BR[j] * g; dr += BL[j] * g; } }
      const g = mutes.length ? gainAt(i) : 1;
      data.writeInt16LE(Math.round(softClip((L[i] + dl) * 0.86) * g * 32767), i * 4);
      data.writeInt16LE(Math.round(softClip((R[i] + dr) * 0.86) * g * 32767), i * 4 + 2);
    }
    const head = Buffer.alloc(44);
    head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8); head.write('fmt ', 12); head.writeUInt32LE(16, 16);
    head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22); head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 4, 28); head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34);
    head.write('data', 36); head.writeUInt32LE(data.length, 40);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.concat([head, data]));
  }
  return { SR, rand, midi, mix, synth, chord, kick, snare, hat, tom, riser, crash, drone, rumble, hit, heartbeat, mute, write };
};
