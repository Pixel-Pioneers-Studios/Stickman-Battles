"""Reference clips for calibrating ears.py: MusicGen (facebook/musicgen-small, CC-BY-NC weights) renders text prompts.
For measurement only. Nothing it makes ships.

    .venv-ears/bin/python musicgen_refs.py
"""
import os, sys, torch, soundfile as sf
from transformers import AutoProcessor, MusicgenForConditionalGeneration, MusicgenConfig
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'refs')
PROMPTS = {
    'dark_hybrid': 'dark menacing final boss battle music, orchestral brass and choir with heavy distorted synth bass, minor key, 150 bpm',
    'chip_boss': 'intense fast chiptune rock boss battle theme, catchy menacing melody, driving bass and drums, minor key',
    'edm_boss': 'aggressive dark dubstep drum and bass boss level music, heavy growling bass, 150 bpm',
    'heroic_ctrl': 'uplifting heroic adventure orchestral music, triumphant brass and strings, major key',
}
torch.manual_seed(0)
p = AutoProcessor.from_pretrained('facebook/musicgen-small'); m = MusicgenForConditionalGeneration.from_pretrained('facebook/musicgen-small')
keys = sys.argv[1:] or list(PROMPTS)
for k in keys:
    inp = p(text=[PROMPTS[k]], padding=True, return_tensors='pt')
    with torch.no_grad():
        a = m.generate(**inp, max_new_tokens=1000, do_sample=True, guidance_scale=3.0)  # ~20 s
    sf.write(os.path.join(OUT, k + '.wav'), a[0, 0].numpy(), m.config.audio_encoder.sampling_rate)
    print('wrote', k, flush=True)
