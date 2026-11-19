"""Look at a render: log-frequency spectrogram with a bar grid, short-term loudness, peak and spectral balance.

    .venv/bin/python analyze.py out/x.wav [--bpm 140 --offset 0 --t0 0 --t1 60 --png out/x.png]
"""
import argparse, sys
import numpy as np
import soundfile as sf
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from engine import lufs, short_term_lufs, SR


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('wav'); ap.add_argument('--bpm', type=float, default=0); ap.add_argument('--offset', type=float, default=0)
    ap.add_argument('--t0', type=float, default=0); ap.add_argument('--t1', type=float, default=0); ap.add_argument('--png')
    ap.add_argument('--labels', default='')
    a = ap.parse_args()
    x, sr = sf.read(a.wav, dtype='float32', always_2d=True)
    s0 = int(a.t0 * sr); s1 = int(a.t1 * sr) if a.t1 else len(x)
    y = x[s0:s1]
    mono = y.mean(axis=1)
    n_fft, hop = 4096, 512
    win = np.hanning(n_fft)
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(mono, (0, n_fft)), n_fft)[::hop]
    S = np.abs(np.fft.rfft(frames * win, axis=1)) ** 2
    freqs = np.fft.rfftfreq(n_fft, 1 / sr)
    # log-frequency bins 30 Hz–16 kHz
    edges = np.geomspace(30, 16000, 241)
    idx = np.digitize(freqs, edges)
    L = np.zeros((S.shape[0], 240))
    centers = np.sqrt(edges[:-1] * edges[1:])
    for b in range(1, 241):
        m = idx == b
        if m.any(): L[:, b - 1] = S[:, m].mean(axis=1)
        else: L[:, b - 1] = S[:, int(np.argmin(np.abs(freqs - centers[b - 1])))]
    LdB = 10 * np.log10(L + 1e-12)
    LdB -= LdB.max()
    st = short_term_lufs(y, 3.0, 0.5)
    side = (y[:, 0] - y[:, 1]) / 2; mid = (y[:, 0] + y[:, 1]) / 2
    fig, ax = plt.subplots(3, 1, figsize=(18, 10), gridspec_kw={'height_ratios': [4, 1.2, 1.4]})
    tmax = len(y) / sr
    ax[0].imshow(LdB.T, origin='lower', aspect='auto', cmap='magma', vmin=-80, vmax=0, extent=[a.t0, a.t0 + tmax, 0, 240])
    yt = [50, 100, 200, 500, 1000, 2000, 5000, 10000]
    ax[0].set_yticks([np.searchsorted(edges, f) for f in yt]); ax[0].set_yticklabels([str(f) for f in yt])
    if a.bpm:
        bar = 240 / a.bpm
        k = 0; tb = a.offset
        while tb < a.t0 + tmax:
            if tb >= a.t0:
                for axx in ax[:2]: axx.axvline(tb, color='cyan' if k % 8 == 0 else 'white', lw=0.8 if k % 8 == 0 else 0.25, alpha=0.6)
                if k % 4 == 0: ax[0].text(tb + 0.1, 232, str(k), color='cyan', fontsize=7)
            tb += bar; k += 1
    if a.labels:
        for item in a.labels.split(','):
            tt, lab = item.split(':'); ax[0].text(float(tt), 215, lab, color='white', fontsize=9, weight='bold')
    ax[1].plot([a.t0 + t + 1.5 for t, _ in st], [v for _, v in st], color='orange'); ax[1].set_ylabel('LUFS-S'); ax[1].set_xlim(a.t0, a.t0 + tmax); ax[1].grid(alpha=0.3)
    ax[1].set_ylim(-40, -8)
    spec = S.mean(axis=0); oct_edges = [20, 40, 80, 160, 320, 640, 1280, 2560, 5120, 10240, 20000]
    bands = [10 * np.log10(spec[(freqs >= lo) & (freqs < hi)].sum() + 1e-12) for lo, hi in zip(oct_edges, oct_edges[1:])]
    bands = np.array(bands) - max(bands)
    ax[2].bar(range(len(bands)), bands, color='teal'); ax[2].set_xticks(range(len(bands))); ax[2].set_xticklabels([f'{lo}' for lo in oct_edges[:-1]])
    ax[2].set_ylabel('octave dB'); ax[2].set_ylim(-45, 2)
    plt.tight_layout()
    png = a.png or a.wav.replace('.wav', '.png')
    plt.savefig(png, dpi=80)
    pk = np.abs(y).max()
    print(f'{a.wav}: {tmax:.1f}s  LUFS-I {lufs(y):.1f}  peak {20*np.log10(pk+1e-12):.1f} dBFS  '
          f'side/mid {20*np.log10(np.sqrt(np.mean(side**2))/np.sqrt(np.mean(mid**2))+1e-12):.1f} dB  '
          f'LRA-ish {np.percentile([v for _,v in st],95)-np.percentile([v for _,v in st],10):.1f}')
    print('octaves', ' '.join(f'{lo}:{b:.0f}' for lo, b in zip(oct_edges, bands)))
    print('png', png)


if __name__ == '__main__':
    main()
