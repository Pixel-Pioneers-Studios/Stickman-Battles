"""Split the Iowa MIS chromatic-run recordings (one file per octave, notes separated by silence) into single notes.

    .venv/bin/python split_runs.py   → samples/iowa/horn/Horn.<dyn>.<midi>.split.wav
"""
import glob, os, re
import numpy as np
import soundfile as sf
from index_samples import est_pitch

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'samples/iowa/hornruns')
DST = os.path.join(HERE, 'samples/iowa/horn')


def main():
    for f in sorted(glob.glob(os.path.join(SRC, '*.aiff'))):
        dyn = os.path.basename(f).split('.')[1]
        x, sr = sf.read(f, dtype='float32', always_2d=True)
        mono = np.abs(x).mean(axis=1)
        hop = int(0.01 * sr)
        env = np.array([mono[i:i + hop].max() for i in range(0, len(mono), hop)])
        th = max(np.median(env[env > env.max() * 0.01]) * 0.1, 10 ** (-60 / 20))
        on = env > th
        # notes = runs of loud frames longer than 0.3 s (the runs leave ~20 ms of silence between notes)
        segs = []; i = 0
        while i < len(on):
            if on[i]:
                j = i
                while j < len(on) and (on[j] or (j + 2 < len(on) and on[j:j + 2].all())): j += 1
                if (j - i) * hop > 0.3 * sr: segs.append((i * hop, j * hop))
                i = j
            else:
                i += 1
        n_ok = 0
        for s, e in segs:
            s = max(0, s - int(0.01 * sr)); e = min(len(x), e + int(0.15 * sr))
            seg = x[s:e]
            hz = est_pitch(seg.mean(axis=1), sr)
            if not hz or hz <= 0: continue
            m = 69 + 12 * np.log2(hz / 440)
            note = int(round(m))
            if abs(m - note) > 0.35: continue
            k = int(0.02 * sr); seg = seg.copy(); seg[-k:] *= np.linspace(1, 0, k)[:, None]
            if seg.shape[1] == 1: seg = np.hstack([seg, seg])
            sf.write(os.path.join(DST, f'Horn.{dyn}.{note}.split.wav'), seg, sr)
            n_ok += 1
        print(os.path.basename(f), 'segments', len(segs), 'kept', n_ok)


if __name__ == '__main__':
    main()
