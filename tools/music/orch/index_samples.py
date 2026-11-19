"""Index the CC0 orchestral samples: parse each file name, measure its real pitch, and write samples/index.json.

VSCO-2-CE and VCSL name notes inconsistently (some folders are an octave off concert pitch), so the
octave of every pitched folder is taken from measurement, not the file name.

    .venv/bin/python index_samples.py
"""
import json, os, re, sys
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, 'samples')
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

# name: (folder, filename regex with groups note, octave, vel, rr), pitched
INSTR = {
    'vln_sus':   ('vsco/Strings/Violin Section/susVib', r'_([A-G]#?)(-?\d)_v(\d)()'),
    'vln_spic':  ('vsco/Strings/Violin Section/Spic',   r'_([A-G]#?)(-?\d)_v(\d)_rr(\d)'),
    'vln_trem':  ('vsco/Strings/Violin Section/Trem',   r'_([A-G]#?)(-?\d)_v(\d)()'),
    'vla_sus':   ('vsco/Strings/Viola Section/susvib',  r'_([A-G]#?)(-?\d)_v(\d)_(\d)'),
    'vla_spic':  ('vsco/Strings/Viola Section/spic',    r'_([A-G]#?)(-?\d)_v(\d)_rr(\d)'),
    'vc_sus':    ('vsco/Strings/Cello Section/susvib',  r'_([A-G]#?)(-?\d)_v(\d)_(\d)'),
    'vc_spic':   ('vsco/Strings/Cello Section/spic',    r'_([A-G]#?)(-?\d)_v(\d)_RR(\d)'),
    'cb_spic':   ('vsco/Strings/Solo Contrabass/Spic',  r'_([A-G]#?)(-?\d)_v(\d)_rr(\d)'),
    'cb_sus':    ('vsco/Strings/Solo Contrabass/SusNV', r'_([A-G]#?)(-?\d)_v(\d)_rr(\d)'),
    'hn_sus':    ('vsco/Brass/F Horn/sus',              r'_([A-G]#?)(-?\d)_v(\d)_(\d)'),
    'hn_stac':   ('vsco/Brass/F Horn/stac',             r'_([A-G]#?)(-?\d)_v(\d)_rr(\d)'),
    'tbn_sus':   ('vsco/Brass/Tenor Trombone/sus',      r'_([A-G]#?)(-?\d)_v(\d)_(\d)'),
    'tbn_stac':  ('vsco/Brass/Tenor Trombone/stac',     r'_([A-G]#?)(-?\d)_v(\d)_rr(\d)'),
    'tpt_sus':   ('vsco/Brass/Trumpet/sus',             r'_([A-G]#?)(-?\d)_v(\d)_rr(\d)'),
    'tpt_stac':  ('vsco/Brass/Trumpet/stac',            r'_([A-G]#?)(-?\d)_v(\d)_rr(\d)'),
    'tba_sus':   ('vsco/Brass/Tuba/sus',                r'_([A-G]#?)(-?\d)_v(\d)_rr(\d)'),
    'tba_stac':  ('vsco/Brass/Tuba/stac',               r'_([A-G]#?)(-?\d)_v(\d)_rr(\d)'),
    'harp':      ('vsco/Strings/Harp',                  r'_([A-G]#?)(-?\d)_(\w+)()'),
    'glock':     ('vsco/Percussion/Glock',              r'([A-G]#?)(-?\d)()()'),
    'chimes':    ('vcsl/Idiophones/Struck Idiophones/Tubular Bells 1', r'_([A-G]#?)(-?\d)_(\w+?)_rr(\d)'),
    'piano':     ('vcsl/Chordophones/Zithers/Grand Piano, Kawai/Sustains', r'_([A-G]#?)(-?\d)_v(\d)_rr(\d)'),
}
DYN = {'pp': 1, 'p': 2, 'mp': 3, 'mf': 4, 'f': 5, 'ff': 6, 'fff': 7}


def est_pitch(x, sr):
    """Median autocorrelation pitch (Hz) over the steady part of a mono signal."""
    n = len(x)
    a = int(min(n * 0.25, sr * 0.35)); b = int(min(n, a + sr * 1.2))
    seg = x[a:b]
    if len(seg) < 4096: seg = x[:min(n, 8192)]
    win = 4096; hop = 2048; out = []
    for s in range(0, max(1, len(seg) - win), hop):
        w = seg[s:s + win] * np.hanning(win)
        if np.sqrt(np.mean(w ** 2)) < 1e-4: continue
        f = np.fft.rfft(w, 2 * win)
        ac = np.fft.irfft(np.abs(f) ** 2)[:win]
        ac /= ac[0] + 1e-12
        lo, hi = int(sr / 2000), int(sr / 25)
        # YIN-style: first lag whose normalised autocorrelation peak is near the global best.
        r = ac[lo:hi]
        best = r.max()
        if best < 0.3: continue
        cand = np.where(r > best * 0.86)[0]
        k = cand[0]
        while k + 1 < len(r) and r[k + 1] > r[k]: k += 1
        k += lo
        y0, y1, y2 = ac[k - 1], ac[k], ac[k + 1]
        d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2 + 1e-12)
        out.append(sr / (k + d))
    return float(np.median(out)) if out else None


def main():
    index = {}
    for name, (folder, pat) in INSTR.items():
        d = os.path.join(ROOT, folder)
        files = sorted(f for f in os.listdir(d) if f.lower().endswith('.wav'))
        rows = []
        for f in files:
            m = re.search(pat, f)
            if not m: continue
            note, octv, vel, rr = m.groups()
            nm = 12 * (int(octv) + 1) + NOTE[note[0]] + (1 if '#' in note else 0)
            v = DYN.get(vel, None) if vel and not vel.isdigit() else (int(vel) if vel else 1)
            x, sr = sf.read(os.path.join(d, f), dtype='float32', always_2d=True)
            hz = est_pitch(x.mean(axis=1), sr)
            meas = 69 + 12 * np.log2(hz / 440) if (hz and hz > 0 and np.isfinite(hz)) else None
            rows.append({'file': os.path.join(folder, f), 'named': nm, 'meas': meas, 'vel': v or 1, 'rr': int(rr) if rr else 1,
                         'len': len(x) / sr, 'peak': float(np.abs(x).max())})
        # Folder octave offset: the median of (measured - named), rounded to whole octaves.
        diffs = [r['meas'] - r['named'] for r in rows if r['meas'] is not None]
        diffs_mod = [((d_ + 6) % 12) - 6 for d_ in diffs]
        oct_off = int(round(np.median([round((d_ - m_) / 12) for d_, m_ in zip(diffs, diffs_mod)]))) * 12 if diffs else 0
        cents = [100 * m_ for m_ in diffs_mod]
        for r in rows: r['note'] = r['named'] + oct_off
        bad = [r for r in rows if r['meas'] is not None and abs(r['meas'] - r['note']) > 0.6]
        print(f"{name:10s} n={len(rows):3d} octave offset {oct_off:+d}  tuning median {np.median(cents):+.0f}c  "
              f"range {min(r['note'] for r in rows)}-{max(r['note'] for r in rows)}  vel {sorted(set(r['vel'] for r in rows))}  off-pitch {len(bad)}")
        for r in bad[:4]: print('     ', os.path.basename(r['file']), 'named', r['note'], 'meas %.2f' % r['meas'])
        index[name] = rows
    index['ihn'] = iowa_horn()
    json.dump(index, open(os.path.join(ROOT, 'index.json'), 'w'), indent=0)


def iowa_horn():
    """Iowa MIS horn: chromatic ff notes, plus mf/pp notes split from the chromatic runs (split_runs.py)."""
    d = os.path.join(ROOT, 'iowa/horn'); rows = []
    for f in sorted(os.listdir(d)):
        m = re.match(r'Horn\.(ff|mf|pp)\.(?:([A-G]b?)(\d)\.stereo\.aif|(\d+)\.split\.wav)$', f)
        if not m: continue
        dyn, nm, octv, mid = m.groups()
        if mid: named = int(mid)
        else:
            pc = NOTE[nm[0]] - (1 if 'b' in nm else 0)
            named = 12 * (int(octv) + 1) + pc
        x, sr = sf.read(os.path.join(d, f), dtype='float32', always_2d=True)
        hz = est_pitch(x.mean(axis=1), sr)
        meas = 69 + 12 * np.log2(hz / 440) if (hz and hz > 0) else None
        dev = (meas - named) if meas is not None else 0.0
        rows.append({'file': os.path.join('iowa/horn', f), 'named': named, 'note': named, 'meas': meas, 'vel': {'pp': 1, 'mf': 2, 'ff': 3}[dyn],
                     'rr': 1, 'len': len(x) / sr, 'peak': float(np.abs(x).max()), 'tune': -dev if abs(dev) < 0.4 else 0.0})
    bad = [r for r in rows if r['meas'] is None or abs(r['meas'] - r['note']) > 0.4]
    print(f"ihn        n={len(rows)} off-pitch {len(bad)}  tune spread {np.std([r['tune'] for r in rows])*100:.0f}c  len {min(r['len'] for r in rows):.1f}-{max(r['len'] for r in rows):.1f}s")
    for r in bad[:6]: print('     ', r['file'], r['note'], r['meas'])
    return rows


if __name__ == '__main__':
    main()
