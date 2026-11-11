'use strict';
// Lays voice lines over a finished cut: each line at its own time, the game + music ducked under the voice,
// then loudness-normalised again (-14 LUFS). The picture is copied untouched.
//   mixVoice(inMp4, outMp4, [{ file, at (seconds) }], { gain, duck })
const { execFileSync } = require('child_process');
const dur = f => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
function mixVoice(input, output, lines, o = {}) {
  const a = ['-loglevel', 'error', '-y', '-i', input];
  lines.forEach(l => a.push('-i', l.file));
  const parts = lines.map((l, i) => `[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(l.at * 1000)}:all=1,volume=${o.gain || 1.6}[v${i}]`);
  let f = parts.join(';') + ';' + lines.map((_, i) => `[v${i}]`).join('') + `amix=inputs=${lines.length}:normalize=0[vo]`;
  f += ';[vo]asplit[voa][vok]';
  // Duck the bed hard while he talks so every word reads on a phone speaker.
  f += `;[0:a][vok]sidechaincompress=threshold=0.02:ratio=${o.duck || 8}:attack=15:release=250[bed]`;
  f += ';[bed][voa]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000,apad[aout]';
  a.push('-filter_complex', f, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-t', dur(input).toFixed(4), '-movflags', '+faststart', output);
  execFileSync('ffmpeg', a, { stdio: ['ignore', 'inherit', 'inherit'] });
  return output;
}
module.exports = { mixVoice };
