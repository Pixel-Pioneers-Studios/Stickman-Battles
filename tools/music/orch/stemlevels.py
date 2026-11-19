"""Per-stem loudness by section of the body's second pass (where the shipped loop is cut from)."""
import glob, os, sys
import numpy as np, soundfile as sf
from engine import k_weight, SR
bar = 240 / 140; base = 8 + 64
secs = [('drive', 0), ('themeA', 8), ('creator', 16), ('tutti', 24), ('break', 32), ('fifths', 40), ('major', 48), ('return', 56)]
rows = []
for f in sorted(glob.glob('out/stems/*.wav')):
    x, sr = sf.read(f, dtype='float32')
    y = k_weight(x.astype(np.float64))
    vals = []
    for name, b0 in secs:
        s, e = int((base + b0) * bar * SR), int((base + b0 + 8) * bar * SR)
        ms = np.mean(y[s:e] ** 2, axis=0).sum()
        vals.append(-0.691 + 10 * np.log10(ms + 1e-12))
    rows.append((os.path.basename(f)[:-4], vals))
print('stem       ' + ' '.join(f'{n:>8s}' for n, _ in secs))
for n, v in sorted(rows, key=lambda r: -max(r[1])):
    print(f'{n:10s} ' + ' '.join(f'{x:8.1f}' if x > -60 else '       .' for x in v))
if os.path.exists('out/boss-full-timeline.wav'):
    x, sr = sf.read('out/boss-full-timeline.wav', dtype='float32')
    y = k_weight(x.astype(np.float64)); v = []
    for name, b0 in secs:
        s, e = int((base + b0) * bar * SR), int((base + b0 + 8) * bar * SR)
        v.append(-0.691 + 10 * np.log10(np.mean(y[s:e] ** 2, axis=0).sum() + 1e-12))
    print(f'{"MASTER":10s} ' + ' '.join(f'{q:8.1f}' for q in v))
