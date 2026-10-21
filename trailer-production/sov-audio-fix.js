'use strict';
// The Oct 19 recording's audio stops at 284.9 s (the clip recorder lost its tap); video runs to 326.95 s.
// Writes work/sov-long/src-audio.wav: the real audio, silence after, plus stingers from the game's SFX
// pack on the finisher/KO moments the picture confirms. Both sov-short-oct19.js and sov-long.js use it.
const path = require('path'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const EV = [[286.0, 'stingImpact', 1.0], [288.2, 'ko', 1.0], [288.6, 'stingLow', 0.9], [305.5, 'stingImpact', 1.0],
  [307.8, 'ko', 1.0], [308.2, 'stingLow', 0.9], [320.0, 'swingHeavy', 1.0], [320.9, 'heavyHit', 1.0], [321.4, 'ko', 1.0], [322.0, 'stingLow', 1.0]];
const args = ['-loglevel', 'error', '-y', '-i', path.join(ROOT, 'stickman-rec-20261019-003834.mp4')];
let fc = '[0:a]aresample=48000,apad,atrim=duration=326.955[base];', mix = '[base]';
EV.forEach(([t, n, g], i) => {
  args.push('-i', path.join(ROOT, 'audio/sfx', n + '.wav'));
  const ms = Math.round(t * 1000);
  fc += `[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${g},adelay=${ms}|${ms}[s${i}];`; mix += `[s${i}]`;
});
fc += `${mix}amix=inputs=${EV.length + 1}:normalize=0:duration=first[a]`;
execFileSync('ffmpeg', [...args, '-filter_complex', fc, '-map', '[a]', '-ar', '48000', '-ac', '2',
  path.join(__dirname, 'work', 'sov-long', 'src-audio.wav')], { stdio: 'inherit' });
console.log('wrote src-audio.wav');
