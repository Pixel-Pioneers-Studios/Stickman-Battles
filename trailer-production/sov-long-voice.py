"""Renders work/sov-long-lines.json to work/sov-long/voice/<id>.wav with Kokoro (tools/voice model).
Run: ../tools/voice/.venv/bin/python sov-long-voice.py [voice] [speed]"""
import json, os, sys
import soundfile as sf
from kokoro_onnx import Kokoro
HERE = os.path.dirname(os.path.abspath(__file__))
M = os.path.join(HERE, '..', 'tools', 'voice', 'model')
voice = sys.argv[1] if len(sys.argv) > 1 else 'am_michael'
speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
k = Kokoro(os.path.join(M, 'kokoro-v1.0.onnx'), os.path.join(M, 'voices-v1.0.bin'))
out = os.path.join(HERE, 'work', 'sov-long', 'voice')
for l in json.load(open(os.path.join(HERE, 'work', 'sov-long-lines.json'))):
    samples, sr = k.create(l['text'], voice=voice, speed=speed, lang='en-us')
    sf.write(os.path.join(out, l['id'] + '.wav'), samples, sr)
    print(l['id'], round(len(samples) / sr, 2), flush=True)
