"""Stem ablation: which stems push a render toward menace or heroism (ears.py's margin), one stem removed at a time.

    .venv-ears/bin/python ablate.py out/stems2 --t0 SECONDS --t1 SECONDS [--groups]
Stems come from a --stems render; the sum skips the master chain, so read the deltas, not the absolute margin.
"""
import argparse, glob, os
import numpy as np, soundfile as sf, librosa, torch
from ears import load_clap, text_embs, audio_embs, MENACE, HEROIC

GROUPS = {'drums': ['drm', 'hats', 'perc', 'cym', 'hit', 'timp'], 'bass': ['bass', 'sub'], 'lead': ['lead'],
          'brass': ['hn', 'tbn', 'tpt', 'tba', 'brs_s'], 'strings': ['vln', 'vln_s', 'vla', 'vc', 'low_s', 'cb'],
          'synthpad': ['pad'], 'choir': ['choir'], 'bells': ['bells'], 'fx': ['fx'], 'verbs': ['verb_hall', 'verb_plate', 'verb_delay']}

ap = argparse.ArgumentParser(); ap.add_argument('dir'); ap.add_argument('--t0', type=float, required=True); ap.add_argument('--t1', type=float, required=True)
ap.add_argument('--groups', action='store_true'); ap.add_argument('--win', type=float, default=10)
a = ap.parse_args()
st = {}
for f in sorted(glob.glob(os.path.join(a.dir, '*.wav'))):
    x, sr = sf.read(f, dtype='float32', start=int(a.t0 * 44100), stop=int(a.t1 * 44100))
    st[os.path.basename(f)[:-4]] = x.mean(1)
m, p = load_clap(); me, he = text_embs(m, p, MENACE), text_embs(m, p, HEROIC)
def score(y):
    y = y / (np.abs(y).max() + 1e-9) * 0.9
    y48 = librosa.resample(y, orig_sr=44100, target_sr=48000)
    ae = audio_embs(m, p, y48, a.win)
    return float(((ae @ me.T).mean(1) - (ae @ he.T).mean(1)).mean())
full = sum(st.values()); base = score(full)
print(f'full mix margin {base:+.3f}')
units = {k: [s for s in v if s in st] for k, v in GROUPS.items()} if a.groups else {k: [k] for k in st}
for k, names in units.items():
    if not names: continue
    d = score(full - sum(st[n] for n in names)) - base
    only = score(sum(st[n] for n in names))
    print(f'  without {k:10s} {d:+.3f}   alone {only:+.3f}   ({"pushes heroic" if d > 0.01 else "pushes menace" if d < -0.01 else "neutral"})')
