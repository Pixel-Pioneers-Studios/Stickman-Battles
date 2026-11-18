"""Renders an AI-episode voice folder: <dir>/lines.json -> <dir>/paced-line<N>.wav (one per group) + paced-full.wav.

lines.json is a list of groups; each group is a list of [text, speed, pause_after_seconds]. Group N plays at the
output frame given by the episode's vo[N-1] (trailer-production/lib/ai-episode.js). Kael's voice: am_michael.

Run from repo root:  tools/voice/.venv/bin/python tools/voice/paced.py trailer-production/audio/kael/ep10
"""
import json, os, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = 'am_michael'


def trim(a, sr, thr=0.01, pad=0.02):
    # Kokoro pads each sentence with silence; cut it so the pauses in lines.json are the only gaps.
    idx = np.nonzero(np.abs(a) > thr)[0]
    if not len(idx): return a
    p = int(sr * pad)
    return a[max(0, idx[0] - p):min(len(a), idx[-1] + p)]


def main():
    d = sys.argv[1]
    groups = json.load(open(os.path.join(d, 'lines.json')))
    k = Kokoro(os.path.join(HERE, 'model', 'kokoro-v1.0.onnx'), os.path.join(HERE, 'model', 'voices-v1.0.bin'))
    full, sr = [], 24000
    for gi, group in enumerate(groups):
        parts = []
        for text, speed, pause in group:
            a, sr = k.create(text, voice=VOICE, speed=speed, lang='en-us')
            parts.append(trim(a.astype(np.float32), sr))
            if pause > 0: parts.append(np.zeros(int(sr * pause), np.float32))
        g = np.concatenate(parts)
        sf.write(os.path.join(d, 'paced-line%d.wav' % (gi + 1)), g, sr, subtype='PCM_16')
        full.append(g); full.append(np.zeros(int(sr * 0.4), np.float32))
        print('line %d: %.2f s' % (gi + 1, len(g) / sr))
    sf.write(os.path.join(d, 'paced-full.wav'), np.concatenate(full), sr, subtype='PCM_16')


if __name__ == '__main__':
    main()
