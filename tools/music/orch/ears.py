"""ears.py: a stand-in for listening. Scores audio for mood (CLAP) and measures it (librosa).

  .venv-ears/bin/python ears.py FILE [FILE ...] [--win 10] [--json out.json]

CLAP (laion/larger_clap_music_and_speech; larger_clap_music loads with collapsed embeddings, every input
identical, and needs transformers<5 too: 5.x breaks every CLAP checkpoint) compares each window of audio with text descriptions. Scores are relative:
the softmax runs over the whole label set, so read them against each other and against reference tracks,
not as absolutes. The librosa numbers are the concrete knobs: tempo, mode, brightness, register balance,
note density, how much of the energy is percussive.
"""
import sys, json, argparse
import numpy as np
import librosa
import torch
from transformers import ClapModel, ClapProcessor

# The reading that matters is a contrast, not a label: CLAP files anything loud and orchestral under "boss battle",
# but within one instrumentation it does separate menace from heroism. Calibrated on Nov 18 2026 against the user's ear:
# The Ninety-Fifth v1 ("adventurous, not bosslike, too upbeat") scored menace 0.433 vs heroic 0.493, margin -0.06.
MENACE = ['dark menacing orchestral music', 'ominous sinister orchestral music', 'evil villain theme',
          'aggressive intense music', 'tense suspenseful music', 'dark aggressive electronic boss music']
HEROIC = ['uplifting triumphant orchestral music', 'heroic adventurous orchestral music',
          'video game overworld adventure music', 'happy upbeat music']
# Genre probes: the user's bar is Geometry Dash and Undertale boss tracks. Raw cosine, read against each other.
STYLES = {
    'orchestral_epic': 'epic orchestral trailer music with choir and brass',
    'edm_boss': 'hard electronic dubstep boss music with heavy bass drops',
    'chiptune_rock': 'fast chiptune rock video game boss battle with driving bass and drums',
    'metal': 'heavy metal with distorted guitars and double kick drums',
    'soft_score': 'soft cinematic film score with strings',
}

KRUMHANSL_MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
KRUMHANSL_MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def load_clap():
    m = ClapModel.from_pretrained('laion/larger_clap_music_and_speech').eval()
    p = ClapProcessor.from_pretrained('laion/larger_clap_music_and_speech')
    return m, p


def text_embs(m, p, phr):
    with torch.no_grad():
        e = m.get_text_features(**p(text=phr, return_tensors='pt', padding=True))
    return torch.nn.functional.normalize(e, dim=-1)


def audio_embs(m, p, y48, win):
    hop = int(win * 48000)
    segs = [y48[i:i + hop] for i in range(0, max(1, len(y48) - hop // 2), hop)]
    segs = [s for s in segs if len(s) > 48000 * 3]
    out = []
    with torch.no_grad():
        for i in range(0, len(segs), 8):
            a = p(audios=segs[i:i + 8], sampling_rate=48000, return_tensors='pt')
            e = m.get_audio_features(**a)
            out.append(torch.nn.functional.normalize(e, dim=-1))
    return torch.cat(out)


def measures(y, sr):
    out = {}
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    out['tempo'] = float(np.atleast_1d(tempo)[0])
    S = np.abs(librosa.stft(y, n_fft=4096, hop_length=1024)) ** 2
    f = librosa.fft_frequencies(sr=sr, n_fft=4096)
    tot = S.sum() + 1e-12
    bands = [(0, 80), (80, 250), (250, 1000), (1000, 4000), (4000, 20000)]
    out['bands_pct'] = [round(float(S[(f >= a) & (f < b)].sum() / tot * 100), 1) for a, b in bands]
    out['centroid_hz'] = float(np.mean(librosa.feature.spectral_centroid(S=np.sqrt(S), sr=sr)))
    H, P = librosa.effects.hpss(y)
    out['perc_pct'] = round(float((P ** 2).sum() / ((H ** 2).sum() + (P ** 2).sum() + 1e-12) * 100), 1)
    on = librosa.onset.onset_detect(y=y, sr=sr, units='time')
    out['onsets_per_s'] = round(len(on) / (len(y) / sr), 2)
    chroma = librosa.feature.chroma_cqt(y=H, sr=sr)
    c = chroma.mean(1)
    best = None
    for r in range(12):
        for mode, prof in (('maj', KRUMHANSL_MAJ), ('min', KRUMHANSL_MIN)):
            cc = np.corrcoef(c, np.roll(prof, r))[0, 1]
            if best is None or cc > best[0]:
                best = (cc, NOTE[r] + ' ' + mode)
    out['key'] = best[1]; out['key_r'] = round(float(best[0]), 2)
    # mode per 4 s window: share of windows that read minor-ish vs major-ish (relative to their best key)
    fps = sr / 512
    w = int(4 * fps)
    mins = majs = 0
    for i in range(0, chroma.shape[1] - w, w):
        cw = chroma[:, i:i + w].mean(1)
        bm = max(np.corrcoef(cw, np.roll(KRUMHANSL_MAJ, r))[0, 1] for r in range(12))
        bn = max(np.corrcoef(cw, np.roll(KRUMHANSL_MIN, r))[0, 1] for r in range(12))
        if bn > bm: mins += 1
        else: majs += 1
    out['minor_window_pct'] = round(100 * mins / max(1, mins + majs))
    # roughness proxy: how often two semitone-adjacent pitch classes are both strong in the same frame
    cn = chroma / (chroma.max(0, keepdims=True) + 1e-9)
    strong = cn > 0.6
    adj = (strong & np.roll(strong, 1, 0)).any(0)
    out['semitone_clash_pct'] = round(float(adj.mean() * 100), 1)
    tri = (strong & np.roll(strong, 6, 0)).any(0)
    out['tritone_pct'] = round(float(tri.mean() * 100), 1)
    rms = librosa.feature.rms(y=y)[0]
    out['rms_db_mean'] = round(float(20 * np.log10(rms.mean() + 1e-9)), 1)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('files', nargs='+')
    ap.add_argument('--win', type=float, default=10)
    ap.add_argument('--json')
    ap.add_argument('--timeline', action='store_true', help='print the menace margin per window')
    ap.add_argument('--no-measure', action='store_true')
    a = ap.parse_args()
    m, p = load_clap()
    me, he = text_embs(m, p, MENACE), text_embs(m, p, HEROIC)
    sk = list(STYLES); se = text_embs(m, p, [STYLES[k] for k in sk])
    res = {}
    for fpath in a.files:
        y48, _ = librosa.load(fpath, sr=48000, mono=True)
        ae = audio_embs(m, p, y48, a.win)
        men = (ae @ me.T).mean(1).numpy(); her = (ae @ he.T).mean(1).numpy()
        sty = (ae @ se.T).mean(0).numpy()
        r = {'menace': round(float(men.mean()), 3), 'heroic': round(float(her.mean()), 3),
             'margin': round(float((men - her).mean()), 3),
             'worst_window': round(float((men - her).min()), 3),
             'style': {k: round(float(v), 3) for k, v in zip(sk, sty)}}
        if a.timeline:
            r['timeline'] = [round(float(x), 3) for x in men - her]
        if not a.no_measure:
            y, sr = librosa.load(fpath, sr=22050, mono=True)
            r['measure'] = measures(y, sr)
        res[fpath] = r
        print('\n==', fpath)
        print(f"  MARGIN {r['margin']:+.3f}  (menace {r['menace']:.3f} / heroic {r['heroic']:.3f}, worst window {r['worst_window']:+.3f})")
        print('  style:', '  '.join(f'{k} {v:.3f}' for k, v in sorted(r['style'].items(), key=lambda kv: -kv[1])))
        if 'measure' in r:
            print('  meas :', json.dumps(r['measure']))
        if a.timeline:
            print('  per window:', ' '.join(f'{i * a.win:.0f}s:{x:+.2f}' for i, x in enumerate(r['timeline'])))
    if a.json:
        json.dump(res, open(a.json, 'w'), indent=1)


if __name__ == '__main__':
    main()
