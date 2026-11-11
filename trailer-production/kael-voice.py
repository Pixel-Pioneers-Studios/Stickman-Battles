# Mini Kael narration (Kokoro am_michael), phrase by phrase with hand-set pauses (Kokoro ignores commas).
# Run from trailer-production: ../tools/voice/.venv/bin/python kael-voice.py audio/kael            (Episode 1, lines below)
#                              ../tools/voice/.venv/bin/python kael-voice.py audio/kael/ep2 ep2.json (lines from a JSON
#   file: [[["phrase", speed, pause-after-seconds], ...], ...], one inner list per line)
# Kael lines phrase by phrase: each phrase rendered alone, edges trimmed, then hand-set pauses between them.
import sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
M = '/Users/aarushgupta/Developer/Personal/Stickman-Battles/tools/voice/model/'
import json, os
OUT = sys.argv[1]; V = 'am_michael'
os.makedirs(OUT, exist_ok=True)
k = Kokoro(M + 'kokoro-v1.0.onnx', M + 'voices-v1.0.bin')
# (phrase, speed, pause after in s)
LINES = [
  [("Someone's playing me.", 0.95, 0.65), ("And it's not you.", 0.88, 0)],
  [("It's an AI.", 0.95, 0.5), ("Chapter five,", 0.95, 0.28), ("hardest mode.", 0.92, 0)],
  [("One left.", 0.9, 0.9), ("I would've dodged that.", 0.95, 0)],
  [("Six out of seven.", 0.92, 0.7), ("Chapter seven's next.", 0.95, 0.45), ("It's one for three there.", 0.9, 0)],
]
if len(sys.argv) > 2: LINES = json.load(open(sys.argv[2]))
def trim(s, sr, th=0.01, pad=0.04):
    i = np.where(np.abs(s) > th)[0]
    if not len(i): return s
    a = max(0, i[0] - int(sr*pad)); b = min(len(s), i[-1] + int(sr*pad))
    return s[a:b]
full = []
for n, line in enumerate(LINES):
    parts = []
    for text, speed, gap in line:
        s, sr = k.create(text, voice=V, speed=speed, lang='en-us')
        parts += [trim(s, sr), np.zeros(int(sr*gap), dtype=s.dtype)]
    a = np.concatenate(parts)
    sf.write(f'{OUT}/paced-line{n+1}.wav', a, sr)
    print(f'line{n+1}', round(len(a)/sr, 2), 's')
    full += [a, np.zeros(int(sr*1.0), dtype=a.dtype)]
sf.write(f'{OUT}/paced-full.wav', np.concatenate(full), sr)
