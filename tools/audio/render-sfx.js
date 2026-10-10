'use strict';

/*
 * Stickman Battles SFX renderer
 *
 * Hand-authored, deterministic sound design for the bundled gameplay pack.
 * This is intentionally synthesis, not generative audio: each cue is built
 * from named transients, pitched layers, noise bands, and delay taps so it can
 * be tweaked and regenerated without an external service or proprietary DAW.
 *
 * Run: node tools/audio/render-sfx.js
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 32000;
const OUTPUT_DIR = path.resolve(__dirname, '../../audio/sfx');

function makeSound(seconds) {
  const length = Math.ceil(seconds * SAMPLE_RATE);
  return {
    length,
    left: new Float32Array(length),
    right: new Float32Array(length),
  };
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function db(value) { return Math.pow(10, value / 20); }
function phase(wave, value) {
  const x = value - Math.floor(value);
  if (wave === 'saw') return x * 2 - 1;
  if (wave === 'square') return x < 0.5 ? 1 : -1;
  if (wave === 'triangle') return 1 - 4 * Math.abs(x - 0.5);
  return Math.sin(x * Math.PI * 2);
}

function envelope(t, duration, attack, release) {
  if (t < 0 || t > duration) return 0;
  if (attack > 0 && t < attack) return t / attack;
  if (release > 0 && t > duration - release) return Math.max(0, (duration - t) / release);
  return 1;
}

function addStereo(sound, index, value, pan) {
  if (index < 0 || index >= sound.length) return;
  const p = clamp(pan || 0, -1, 1);
  sound.left[index] += value * Math.sqrt((1 - p) * 0.5);
  sound.right[index] += value * Math.sqrt((1 + p) * 0.5);
}

function addTone(sound, options) {
  const start = options.start || 0;
  const duration = options.duration || 0.1;
  const begin = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const end = Math.min(sound.length, Math.ceil((start + duration) * SAMPLE_RATE));
  const startFreq = options.freq || 440;
  const endFreq = options.endFreq || startFreq;
  const wave = options.wave || 'sine';
  const amp = options.amp || 0.1;
  const attack = options.attack === undefined ? 0.002 : options.attack;
  const release = options.release === undefined ? duration * 0.7 : options.release;
  const pan = options.pan || 0;
  const vibrato = options.vibrato || 0;
  const vibratoRate = options.vibratoRate || 6;
  let cycles = 0;
  for (let i = begin; i < end; i++) {
    const t = (i - begin) / SAMPLE_RATE;
    const progress = t / duration;
    const frequency = startFreq * Math.pow(endFreq / startFreq, progress);
    cycles += frequency / SAMPLE_RATE;
    const mod = vibrato ? Math.sin(t * Math.PI * 2 * vibratoRate) * vibrato : 0;
    addStereo(sound, i, phase(wave, cycles + mod) * amp * envelope(t, duration, attack, release), pan);
  }
}

function addNoise(sound, options) {
  const start = options.start || 0;
  const duration = options.duration || 0.1;
  const begin = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const end = Math.min(sound.length, Math.ceil((start + duration) * SAMPLE_RATE));
  const amp = options.amp || 0.1;
  const attack = options.attack === undefined ? 0.001 : options.attack;
  const release = options.release === undefined ? duration * 0.7 : options.release;
  const color = options.color || 'flat';
  const pan = options.pan || 0;
  let seed = options.seed || 1;
  let previous = 0;
  let low = 0;
  for (let i = begin; i < end; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const white = (seed / 0x100000000) * 2 - 1;
    let value = white;
    if (color === 'bright') {
      value = white - previous;
      previous = white;
    } else if (color === 'dark') {
      low += (white - low) * 0.035;
      value = low;
    } else if (color === 'mid') {
      low += (white - low) * 0.16;
      value = white - low;
    }
    const t = (i - begin) / SAMPLE_RATE;
    addStereo(sound, i, value * amp * envelope(t, duration, attack, release), pan);
  }
}

function addChirp(sound, options) {
  const start = options.start || 0;
  const duration = options.duration || 0.1;
  const begin = Math.max(0, Math.floor(start * SAMPLE_RATE));
  const end = Math.min(sound.length, Math.ceil((start + duration) * SAMPLE_RATE));
  const from = options.from || 300;
  const to = options.to || from;
  const amp = options.amp || 0.1;
  const pan = options.pan || 0;
  let cycles = 0;
  for (let i = begin; i < end; i++) {
    const t = (i - begin) / SAMPLE_RATE;
    const q = t / duration;
    const freq = from * Math.pow(to / from, q);
    cycles += freq / SAMPLE_RATE;
    addStereo(sound, i, Math.sin(cycles * Math.PI * 2) * amp * Math.pow(1 - q, 1.7), pan);
  }
}

function addMetal(sound, options) {
  const start = options.start || 0;
  const duration = options.duration || 0.25;
  const amp = options.amp || 0.1;
  const frequency = options.freq || 600;
  const ratios = options.ratios || [1, 1.414, 2.19, 2.83];
  ratios.forEach((ratio, index) => {
    addTone(sound, {
      start: start + index * 0.002,
      duration,
      freq: frequency * ratio,
      endFreq: frequency * ratio * 0.992,
      amp: amp / ratios.length,
      wave: 'sine',
      attack: 0.001,
      release: duration * (0.68 + index * 0.05),
      pan: ((index / Math.max(1, ratios.length - 1)) - 0.5) * 0.35,
    });
  });
}

function addDelay(sound, delay, feedback, repeats) {
  const offset = Math.floor(delay * SAMPLE_RATE);
  const originalLeft = sound.left.slice();
  const originalRight = sound.right.slice();
  for (let repeat = 1; repeat <= repeats; repeat++) {
    const gain = Math.pow(feedback, repeat);
    const shift = offset * repeat;
    for (let i = shift; i < sound.length; i++) {
      sound.left[i] += originalLeft[i - shift] * gain;
      sound.right[i] += originalRight[i - shift] * gain;
    }
  }
}

function finish(sound, gain) {
  let peak = 0;
  for (let i = 0; i < sound.length; i++) {
    peak = Math.max(peak, Math.abs(sound.left[i]), Math.abs(sound.right[i]));
  }
  const scale = (gain || 0.88) / Math.max(0.001, peak);
  for (let i = 0; i < sound.length; i++) {
    sound.left[i] = Math.tanh(sound.left[i] * scale * 1.18);
    sound.right[i] = Math.tanh(sound.right[i] * scale * 1.18);
  }
  return sound;
}

function writeWav(name, sound) {
  const dataBytes = sound.length * 4;
  const out = Buffer.alloc(44 + dataBytes);
  out.write('RIFF', 0);
  out.writeUInt32LE(36 + dataBytes, 4);
  out.write('WAVE', 8);
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(2, 22);
  out.writeUInt32LE(SAMPLE_RATE, 24);
  out.writeUInt32LE(SAMPLE_RATE * 4, 28);
  out.writeUInt16LE(4, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36);
  out.writeUInt32LE(dataBytes, 40);
  let offset = 44;
  for (let i = 0; i < sound.length; i++) {
    out.writeInt16LE(Math.round(clamp(sound.left[i], -1, 1) * 32767), offset);
    out.writeInt16LE(Math.round(clamp(sound.right[i], -1, 1) * 32767), offset + 2);
    offset += 4;
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, `${name}.wav`), out);
}

function createEffects() {
  const effects = {};
  // A whoosh is air, so it swells in and tails off: the noise needs a slow
  // attack, not a click at the front.
  function whoosh(seed, dur, from, to, color, low) {
    const s = makeSound(dur + 0.06);
    // A heavy weapon moves more air, slower: the body of it is low, with only a trace of hiss.
    addNoise(s, { duration: dur, amp: low ? 2.4 : 0.5, color: low ? 'dark' : color, seed, attack: dur * 0.38, release: dur * 0.5, pan: -0.14 });
    addNoise(s, { start: dur * 0.18, duration: dur * 0.7, amp: low ? 0.05 : 0.26, color: low ? 'mid' : 'bright', seed: seed + 5, attack: dur * 0.2, release: dur * 0.42, pan: 0.16 });
    addChirp(s, { start: dur * 0.12, duration: dur * 0.75, from, to, amp: 0.16, pan: 0.06 });
    if (low) addTone(s, { start: dur * 0.2, duration: dur * 0.7, freq: low, endFreq: low * 0.62, amp: 0.2, wave: 'sine', attack: dur * 0.2 });
    return s;
  }
  effects.swing      = () => finish(whoosh(11, 0.20, 2100, 520, 'bright'), 0.55);
  effects.swing2     = () => finish(whoosh(12, 0.18, 2500, 700, 'bright'), 0.52);
  effects.swing3     = () => finish(whoosh(13, 0.23, 1700, 420, 'mid'), 0.55);
  effects.swingLight = () => finish(whoosh(14, 0.12, 4200, 1500, 'bright'), 0.46);
  effects.swingHeavy = () => finish(whoosh(15, 0.34, 760, 150, 'mid', 120), 0.66);
  // Light impact: a click that places it, a pitched body that gives it weight,
  // and a short band of grit. The variants move the body pitch and the grit so
  // a string of hits never repeats the same sample twice running.
  function thwack(seed, body, grit, tone) {
    const s = makeSound(0.22);
    addNoise(s, { duration: 0.012, amp: 0.9, color: 'bright', seed, release: 0.008 });
    addChirp(s, { duration: 0.085, from: body, to: body * 0.36, amp: 0.74, pan: -0.04 });
    addNoise(s, { start: 0.004, duration: grit, amp: 0.5, color: 'mid', seed: seed + 1, release: grit * 0.7, pan: 0.08 });
    addTone(s, { start: 0.01, duration: 0.1, freq: tone, endFreq: tone * 0.3, amp: 0.14, wave: 'triangle' });
    return finish(s, 0.78);
  }
  effects.hit  = () => thwack(22, 210, 0.07, 420);
  effects.hit2 = () => thwack(23, 176, 0.09, 350);
  effects.hit3 = () => thwack(24, 248, 0.055, 520);
  // Blade into a body: the edge sings first, then the cut lands under it.
  function slash(seed, top, body) {
    const s = makeSound(0.3);
    addNoise(s, { duration: 0.09, amp: 0.62, color: 'bright', seed, attack: 0.004, release: 0.07, pan: 0.12 });
    addChirp(s, { duration: 0.1, from: top, to: top * 0.24, amp: 0.34, pan: -0.1 });
    addMetal(s, { start: 0.004, duration: 0.16, freq: top * 0.62, amp: 0.1, ratios: [1, 1.51, 2.34] });
    addChirp(s, { start: 0.022, duration: 0.09, from: body, to: body * 0.4, amp: 0.52 });
    addNoise(s, { start: 0.03, duration: 0.11, amp: 0.3, color: 'mid', seed: seed + 3, release: 0.09 });
    return finish(s, 0.72);
  }
  effects.hitSlash  = () => slash(26, 3600, 190);
  effects.hitSlash2 = () => slash(27, 4300, 160);
  effects.heavyHit = () => {
    const s = makeSound(0.7);
    addNoise(s, { duration: 0.3, amp: 0.85, color: 'dark', seed: 31, release: 0.22 });
    addChirp(s, { duration: 0.22, from: 145, to: 42, amp: 0.9, pan: -0.08 });
    addTone(s, { start: 0.018, duration: 0.42, freq: 56, endFreq: 40, amp: 0.68, wave: 'sine', release: 0.3, pan: 0.06 });
    addNoise(s, { start: 0.025, duration: 0.11, amp: 0.35, color: 'bright', seed: 32, release: 0.08 });
    addDelay(s, 0.085, 0.27, 3);
    return finish(s, 0.88);
  };
  effects.hitBlunt = () => {
    const s = makeSound(0.48);
    addChirp(s, { duration: 0.2, from: 112, to: 44, amp: 0.9 });
    addTone(s, { duration: 0.32, freq: 63, endFreq: 45, amp: 0.58, wave: 'sine', release: 0.25 });
    addNoise(s, { duration: 0.13, amp: 0.5, color: 'dark', seed: 41, release: 0.09 });
    return finish(s, 0.83);
  };
  effects.hitPierce = () => {
    const s = makeSound(0.25);
    addNoise(s, { duration: 0.055, amp: 0.76, color: 'bright', seed: 51, release: 0.042, pan: 0.1 });
    addChirp(s, { start: 0.005, duration: 0.12, from: 2800, to: 680, amp: 0.37, pan: -0.08 });
    addTone(s, { start: 0.022, duration: 0.12, freq: 220, endFreq: 95, amp: 0.22, wave: 'triangle' });
    return finish(s, 0.62);
  };
  effects.hitSnap = () => {
    const s = makeSound(0.38);
    addNoise(s, { duration: 0.022, amp: 1.0, color: 'bright', seed: 61, release: 0.012 });
    addNoise(s, { start: 0.045, duration: 0.19, amp: 0.35, color: 'bright', seed: 62, release: 0.13, pan: 0.16 });
    addChirp(s, { start: 0.025, duration: 0.09, from: 1240, to: 230, amp: 0.34 });
    return finish(s, 0.74);
  };
  effects.hitZap = () => {
    const s = makeSound(0.37);
    addNoise(s, { duration: 0.2, amp: 0.48, color: 'bright', seed: 71, release: 0.16 });
    addTone(s, { duration: 0.18, freq: 1650, endFreq: 530, amp: 0.27, wave: 'square', release: 0.13, vibrato: 0.035, vibratoRate: 80 });
    addTone(s, { start: 0.04, duration: 0.19, freq: 140, endFreq: 65, amp: 0.25, wave: 'saw', release: 0.15 });
    return finish(s, 0.67);
  };
  effects.clang = () => {
    const s = makeSound(0.62);
    addNoise(s, { duration: 0.04, amp: 0.5, color: 'bright', seed: 81, release: 0.027 });
    addMetal(s, { duration: 0.54, amp: 0.78, freq: 430, ratios: [1, 1.48, 2.31, 3.73, 4.21] });
    addTone(s, { duration: 0.16, freq: 108, endFreq: 72, amp: 0.24, wave: 'sine', release: 0.12 });
    return finish(s, 0.72);
  };
  // Push-off: the scuff of the feet, then air moving past. No cartoon "boing".
  effects.jump = () => {
    const s = makeSound(0.24);
    addNoise(s, { duration: 0.035, amp: 0.5, color: 'mid', seed: 91, release: 0.025 });
    addChirp(s, { duration: 0.07, from: 150, to: 82, amp: 0.34 });
    addNoise(s, { start: 0.02, duration: 0.17, amp: 1.3, color: 'dark', seed: 92, attack: 0.05, release: 0.11, pan: -0.1 });
    addNoise(s, { start: 0.03, duration: 0.14, amp: 0.07, color: 'bright', seed: 93, attack: 0.05, release: 0.08, pan: 0.1 });
    addChirp(s, { start: 0.02, duration: 0.15, from: 240, to: 520, amp: 0.2, pan: 0.08 });
    return finish(s, 0.52);
  };
  // The air jump has no floor to push off, so it is all air: a tighter, higher
  // sweep with a flick at the top.
  effects.doubleJump = () => {
    const s = makeSound(0.26);
    addNoise(s, { duration: 0.19, amp: 0.16, color: 'bright', seed: 95, attack: 0.045, release: 0.13, pan: 0.1 });
    addNoise(s, { duration: 0.19, amp: 0.9, color: 'dark', seed: 96, attack: 0.04, release: 0.13, pan: -0.1 });
    addChirp(s, { duration: 0.16, from: 380, to: 1150, amp: 0.3, pan: -0.08 });
    addChirp(s, { start: 0.1, duration: 0.07, from: 1900, to: 2700, amp: 0.07 });
    return finish(s, 0.5);
  };
  effects.land = () => {
    const s = makeSound(0.26);
    addNoise(s, { duration: 0.02, amp: 0.5, color: 'mid', seed: 101, release: 0.015 });
    addChirp(s, { duration: 0.11, from: 128, to: 56, amp: 0.6 });
    addNoise(s, { duration: 0.12, amp: 0.4, color: 'dark', seed: 102, release: 0.09 });
    return finish(s, 0.6);
  };
  effects.landHard = () => {
    const s = makeSound(0.5);
    addNoise(s, { duration: 0.025, amp: 0.8, color: 'mid', seed: 104, release: 0.018 });
    addChirp(s, { duration: 0.2, from: 118, to: 38, amp: 0.95 });
    addTone(s, { start: 0.01, duration: 0.3, freq: 52, endFreq: 38, amp: 0.5, wave: 'sine', release: 0.24 });
    addNoise(s, { start: 0.02, duration: 0.26, amp: 0.3, color: 'bright', seed: 105, attack: 0.01, release: 0.22, pan: 0.14 });
    return finish(s, 0.8);
  };
  effects.shoot = () => {
    const s = makeSound(0.32);
    addNoise(s, { duration: 0.045, amp: 0.75, color: 'bright', seed: 111, release: 0.03, pan: 0.09 });
    addChirp(s, { duration: 0.13, from: 510, to: 95, amp: 0.38, pan: -0.07 });
    addTone(s, { start: 0.018, duration: 0.11, freq: 84, endFreq: 52, amp: 0.33, wave: 'triangle', release: 0.09 });
    return finish(s, 0.66);
  };
  effects.pickup = () => {
    const s = makeSound(0.5);
    [0, 0.075, 0.15].forEach((start, index) => addTone(s, {
      start, duration: 0.22, freq: [523, 659, 784][index], endFreq: [530, 666, 792][index],
      amp: 0.24, wave: 'sine', attack: 0.003, release: 0.17, pan: (index - 1) * 0.16,
    }));
    addDelay(s, 0.075, 0.22, 2);
    return finish(s, 0.54);
  };
  effects.death = () => {
    const s = makeSound(0.86);
    addNoise(s, { duration: 0.34, amp: 0.62, color: 'dark', seed: 121, release: 0.27 });
    addChirp(s, { duration: 0.55, from: 240, to: 39, amp: 0.54 });
    addTone(s, { start: 0.04, duration: 0.61, freq: 92, endFreq: 35, amp: 0.38, wave: 'saw', release: 0.48 });
    return finish(s, 0.76);
  };
  effects.explosion = () => {
    const s = makeSound(1.12);
    addNoise(s, { duration: 0.73, amp: 0.92, color: 'dark', seed: 131, release: 0.57 });
    addChirp(s, { duration: 0.32, from: 96, to: 31, amp: 0.9 });
    addTone(s, { duration: 0.62, freq: 54, endFreq: 28, amp: 0.76, wave: 'sine', release: 0.5 });
    addNoise(s, { start: 0.04, duration: 0.28, amp: 0.37, color: 'bright', seed: 132, release: 0.22, pan: 0.11 });
    addDelay(s, 0.12, 0.27, 4);
    return finish(s, 0.9);
  };
  effects.uiClick = () => {
    const s = makeSound(0.16);
    addTone(s, { duration: 0.08, freq: 920, endFreq: 1120, amp: 0.25, wave: 'sine', release: 0.055 });
    addTone(s, { duration: 0.045, freq: 1860, endFreq: 1860, amp: 0.08, wave: 'sine', release: 0.03 });
    return finish(s, 0.38);
  };
  effects.uiHover = () => {
    const s = makeSound(0.11);
    addTone(s, { duration: 0.06, freq: 540, endFreq: 670, amp: 0.12, wave: 'sine', release: 0.04 });
    return finish(s, 0.26);
  };
  effects.phaseUp = () => {
    const s = makeSound(0.86);
    [0, 0.1, 0.2, 0.3].forEach((start, index) => addTone(s, {
      start, duration: 0.38, freq: [220, 277, 330, 440][index], endFreq: [230, 287, 342, 456][index],
      amp: 0.23, wave: 'sine', release: 0.27, pan: (index - 1.5) * 0.13,
    }));
    addDelay(s, 0.12, 0.3, 3);
    return finish(s, 0.62);
  };
  effects.waveStart = () => {
    const s = makeSound(0.76);
    [0, 0.075, 0.15].forEach((start, index) => {
      addTone(s, { start, duration: 0.31, freq: [196, 262, 392][index], endFreq: [210, 280, 420][index], amp: 0.28, wave: 'square', release: 0.22 });
    });
    addNoise(s, { start: 0.17, duration: 0.12, amp: 0.18, color: 'bright', seed: 141, release: 0.09 });
    return finish(s, 0.57);
  };
  effects.portalOpen = () => {
    const s = makeSound(1.1);
    addChirp(s, { duration: 0.55, from: 120, to: 1120, amp: 0.26, pan: -0.12 });
    addTone(s, { duration: 0.72, freq: 66, endFreq: 94, amp: 0.3, wave: 'sine', release: 0.5, vibrato: 0.012, vibratoRate: 5 });
    addNoise(s, { start: 0.22, duration: 0.5, amp: 0.26, color: 'bright', seed: 151, release: 0.38, pan: 0.1 });
    addDelay(s, 0.14, 0.33, 4);
    return finish(s, 0.62);
  };
  effects.superHeal = () => {
    const s = makeSound(0.92);
    [0, 0.07, 0.14, 0.21].forEach((start, index) => addTone(s, {
      start, duration: 0.4, freq: [392, 523, 659, 784][index], endFreq: [404, 540, 679, 808][index],
      amp: 0.22, wave: 'sine', release: 0.3, pan: (index - 1.5) * 0.14,
    }));
    addDelay(s, 0.1, 0.28, 3);
    return finish(s, 0.58);
  };
  effects.superActivate = () => {
    const s = makeSound(1.16);
    addChirp(s, { duration: 0.55, from: 86, to: 460, amp: 0.36 });
    addTone(s, { start: 0.32, duration: 0.55, freq: 220, endFreq: 110, amp: 0.24, wave: 'saw', release: 0.42 });
    [0.31, 0.39, 0.47].forEach((start, index) => addTone(s, { start, duration: 0.44, freq: [440, 554, 659][index], amp: 0.18, wave: 'sine', release: 0.32 }));
    addNoise(s, { start: 0.29, duration: 0.22, amp: 0.29, color: 'bright', seed: 161, release: 0.15 });
    addDelay(s, 0.11, 0.31, 4);
    return finish(s, 0.67);
  };
  effects.iaiMark = () => {
    const s = makeSound(0.2);
    addTone(s, { duration: 0.12, freq: 1450, endFreq: 1720, amp: 0.16, wave: 'sine', release: 0.09 });
    addNoise(s, { duration: 0.035, amp: 0.15, color: 'bright', seed: 171, release: 0.024 });
    return finish(s, 0.4);
  };
  effects.iaiSheathe = () => {
    const s = makeSound(0.62);
    addNoise(s, { duration: 0.025, amp: 0.65, color: 'bright', seed: 181, release: 0.016 });
    addMetal(s, { start: 0.09, duration: 0.37, amp: 0.55, freq: 760, ratios: [1, 1.24, 1.89] });
    addChirp(s, { start: 0.07, duration: 0.32, from: 1900, to: 160, amp: 0.32 });
    return finish(s, 0.68);
  };
  effects.soulRip = () => {
    const s = makeSound(0.48);
    addChirp(s, { duration: 0.3, from: 890, to: 190, amp: 0.29, pan: -0.08 });
    addNoise(s, { duration: 0.22, amp: 0.21, color: 'bright', seed: 191, release: 0.16, pan: 0.07 });
    addTone(s, { start: 0.04, duration: 0.31, freq: 132, endFreq: 73, amp: 0.18, wave: 'sine', release: 0.24 });
    return finish(s, 0.48);
  };
  effects.soulAbsorb = () => {
    const s = makeSound(0.46);
    addChirp(s, { duration: 0.26, from: 280, to: 940, amp: 0.24, pan: 0.06 });
    addTone(s, { start: 0.1, duration: 0.27, freq: 480, endFreq: 960, amp: 0.15, wave: 'sine', release: 0.19 });
    addDelay(s, 0.07, 0.22, 2);
    return finish(s, 0.47);
  };
  effects.soulHarvest = () => {
    const s = makeSound(0.9);
    addNoise(s, { duration: 0.38, amp: 0.54, color: 'mid', seed: 201, release: 0.28 });
    addChirp(s, { duration: 0.45, from: 520, to: 65, amp: 0.35 });
    addTone(s, { start: 0.16, duration: 0.45, freq: 66, endFreq: 43, amp: 0.35, wave: 'saw', release: 0.32 });
    addDelay(s, 0.1, 0.27, 3);
    return finish(s, 0.69);
  };
  effects.stingLow = () => {
    const s = makeSound(1.3);
    addTone(s, { duration: 1.18, freq: 49, endFreq: 43, amp: 0.56, wave: 'sine', attack: 0.07, release: 0.75 });
    addTone(s, { start: 0.12, duration: 1.05, freq: 73, endFreq: 69, amp: 0.22, wave: 'sine', attack: 0.08, release: 0.7 });
    addNoise(s, { duration: 0.8, amp: 0.18, color: 'dark', seed: 211, attack: 0.08, release: 0.6 });
    return finish(s, 0.67);
  };
  effects.stingImpact = () => {
    const s = makeSound(1.15);
    addNoise(s, { duration: 0.55, amp: 0.75, color: 'dark', seed: 221, release: 0.43 });
    addChirp(s, { duration: 0.3, from: 105, to: 32, amp: 0.85 });
    addMetal(s, { start: 0.01, duration: 0.62, amp: 0.34, freq: 170, ratios: [1, 1.5, 2.08] });
    addDelay(s, 0.15, 0.31, 4);
    return finish(s, 0.88);
  };
  effects.stingRise = () => {
    const s = makeSound(1.15);
    addChirp(s, { duration: 0.86, from: 102, to: 810, amp: 0.34 });
    addNoise(s, { start: 0.22, duration: 0.68, amp: 0.22, color: 'bright', seed: 231, attack: 0.2, release: 0.45 });
    addTone(s, { start: 0.52, duration: 0.42, freq: 405, endFreq: 810, amp: 0.17, wave: 'sine', release: 0.27 });
    return finish(s, 0.58);
  };
  effects.entranceCrash = () => {
    const s = makeSound(1.35);
    addNoise(s, { duration: 0.92, amp: 0.88, color: 'dark', seed: 241, release: 0.74 });
    addChirp(s, { duration: 0.38, from: 88, to: 27, amp: 0.98 });
    addMetal(s, { start: 0.04, duration: 0.76, amp: 0.36, freq: 170, ratios: [1, 1.33, 2.11, 3.4] });
    addDelay(s, 0.12, 0.3, 5);
    return finish(s, 0.92);
  };
  effects.heavyHit2 = () => {
    const s = makeSound(0.62);
    addNoise(s, { duration: 0.016, amp: 1.0, color: 'bright', seed: 33, release: 0.01 });
    addChirp(s, { duration: 0.24, from: 170, to: 36, amp: 0.95, pan: 0.06 });
    addTone(s, { start: 0.012, duration: 0.38, freq: 48, endFreq: 34, amp: 0.7, wave: 'sine', release: 0.28 });
    addNoise(s, { start: 0.008, duration: 0.2, amp: 0.6, color: 'mid', seed: 34, release: 0.16, pan: -0.1 });
    addDelay(s, 0.07, 0.24, 2);
    return finish(s, 0.88);
  };
  effects.parry = () => {
    const s = makeSound(0.5);
    addNoise(s, { duration: 0.014, amp: 0.9, color: 'bright', seed: 301, release: 0.008 });
    addMetal(s, { duration: 0.42, freq: 1480, amp: 0.7, ratios: [1, 1.34, 2.02, 2.71, 3.6] });
    addChirp(s, { duration: 0.06, from: 5200, to: 1800, amp: 0.2 });
    addDelay(s, 0.06, 0.22, 2);
    return finish(s, 0.74);
  };
  effects.shieldUp = () => {
    const s = makeSound(0.22);
    addChirp(s, { duration: 0.12, from: 210, to: 460, amp: 0.36 });
    addMetal(s, { start: 0.03, duration: 0.15, freq: 720, amp: 0.2, ratios: [1, 1.5, 2.25] });
    addNoise(s, { duration: 0.06, amp: 0.2, color: 'bright', seed: 311, attack: 0.01, release: 0.04 });
    return finish(s, 0.44);
  };
  effects.shootBow = () => {
    const s = makeSound(0.36);
    addNoise(s, { duration: 0.01, amp: 0.7, color: 'bright', seed: 321, release: 0.006 });
    addTone(s, { duration: 0.2, freq: 236, endFreq: 172, amp: 0.5, wave: 'triangle', vibrato: 0.18, vibratoRate: 46, release: 0.17 });
    addNoise(s, { start: 0.015, duration: 0.24, amp: 0.32, color: 'bright', seed: 322, attack: 0.03, release: 0.19, pan: 0.2 });
    addChirp(s, { start: 0.02, duration: 0.2, from: 2400, to: 900, amp: 0.1, pan: 0.2 });
    return finish(s, 0.6);
  };
  effects.shootZap = () => {
    const s = makeSound(0.34);
    addTone(s, { duration: 0.16, freq: 1900, endFreq: 240, amp: 0.4, wave: 'saw', release: 0.1 });
    addTone(s, { duration: 0.2, freq: 960, endFreq: 120, amp: 0.26, wave: 'square', release: 0.14, pan: 0.12 });
    addNoise(s, { duration: 0.24, amp: 0.4, color: 'bright', seed: 331, release: 0.2, pan: -0.12 });
    addDelay(s, 0.045, 0.3, 3);
    return finish(s, 0.62);
  };
  effects.flame = () => {
    const s = makeSound(0.5);
    addNoise(s, { duration: 0.46, amp: 0.7, color: 'mid', seed: 341, attack: 0.06, release: 0.3, pan: -0.1 });
    addNoise(s, { duration: 0.44, amp: 0.55, color: 'dark', seed: 342, attack: 0.04, release: 0.3, pan: 0.1 });
    addNoise(s, { start: 0.02, duration: 0.3, amp: 0.2, color: 'bright', seed: 343, attack: 0.05, release: 0.22 });
    addTone(s, { duration: 0.4, freq: 92, endFreq: 70, amp: 0.2, wave: 'sine', attack: 0.05, vibrato: 0.3, vibratoRate: 17 });
    return finish(s, 0.6);
  };
  // A thrown thing turns over as it flies: the whoosh comes in beats.
  effects.throwSpin = () => {
    const s = makeSound(0.36);
    for (let i = 0; i < 3; i++) {
      addNoise(s, { start: i * 0.085, duration: 0.1, amp: 0.5 - i * 0.1, color: 'bright', seed: 351 + i, attack: 0.03, release: 0.06, pan: -0.25 + i * 0.25 });
      addChirp(s, { start: i * 0.085, duration: 0.09, from: 1500 - i * 150, to: 620, amp: 0.14, pan: -0.25 + i * 0.25 });
    }
    return finish(s, 0.52);
  };
  // The blow that ends a fight: a hit with the floor dropped out from under it.
  effects.ko = () => {
    const s = makeSound(1.1);
    addNoise(s, { duration: 0.02, amp: 1.0, color: 'bright', seed: 361, release: 0.012 });
    addChirp(s, { duration: 0.34, from: 190, to: 30, amp: 1.0 });
    addTone(s, { start: 0.01, duration: 0.85, freq: 44, endFreq: 29, amp: 0.8, wave: 'sine', release: 0.7 });
    addNoise(s, { start: 0.01, duration: 0.4, amp: 0.55, color: 'dark', seed: 362, release: 0.32 });
    addMetal(s, { start: 0.02, duration: 0.7, freq: 310, amp: 0.16, ratios: [1, 1.48, 2.6] });
    addDelay(s, 0.11, 0.3, 3);
    return finish(s, 0.9);
  };
  effects.respawn = () => {
    const s = makeSound(0.5);
    addChirp(s, { duration: 0.3, from: 220, to: 880, amp: 0.3 });
    addMetal(s, { start: 0.2, duration: 0.28, freq: 1320, amp: 0.3, ratios: [1, 1.5, 2] });
    addNoise(s, { duration: 0.3, amp: 0.16, color: 'bright', seed: 371, attack: 0.2, release: 0.08 });
    return finish(s, 0.46);
  };
  return effects;
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const effects = createEffects();
Object.entries(effects).forEach(([name, render]) => writeWav(name, render()));
console.log(`Rendered ${Object.keys(effects).length} hand-authored SFX files to ${OUTPUT_DIR}`);
