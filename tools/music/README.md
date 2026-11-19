# Music

Compositions are written as code and exported as MIDI; the sound design and mix happen in a DAW (BandLab, free, in the browser).

## Bundled soundtrack

`render-soundtrack.js` renders the four original, fully arranged game loops in
`audio/music/`. Each has multiple sections and exceeds 45 seconds:

- Boss Threshold — 32 bars at 144 BPM
- Battle Royale — 32 bars at 150 BPM
- Story Embers — 24 bars at 102 BPM
- Arena Neon — 32 bars at 142 BPM

Run `node tools/music/render-soundtrack.js` before encoding the WAV renders to
MP3 for shipping. The compositions are deterministic and hand-authored; the
renderer performs synthesis only.

## Orchestral renderer (`orch/`)

`orch/` renders scores with real orchestral samples plus synthesised hybrid layers, mixed and mastered
offline in Python. Samples are CC0 (VSCO-2-CE, VCSL) and the University of Iowa MIS horn; they are not in
the repo.

1. `orch/fetch_samples.sh` (once): makes `orch/.venv`, downloads ~960 MB of samples, indexes their real pitch.
2. `orch/.venv/bin/python orch/boss_theme.py [--stems]` → `orch/out/boss-the-ninety-fifth.wav` (the shipped
   file: intro + loop + 1 s overrun) and `orch/out/boss-listen.wav` (intro, the loop twice, fade).
3. `ffmpeg -i orch/out/boss-the-ninety-fifth.wav -codec:a libmp3lame -q:a 2 audio/music/boss-ninety-fifth.mp3`

Checks, since a render can't be listened to from a script: `analyze.py` (spectrogram with bar grid,
loudness curve, octave balance), `stemlevels.py` (per-track loudness by section, after `--stems`) and
`harmony_check.py` (minor-second collisions between sustained notes, beat by beat). The body is rendered
three times and the shipped loop is cut from the second pass, so the loop seam carries the body's own
reverb tails and compressor state; passes must be bit-identical, which is why noise draws use `E.sub()`.

### Listening without ears (`orch/ears.py`, Nov 18 2026)

The checks above measure whether a mix is technically sound; none of them measure mood. `ears.py` does. It runs in its own venv
(`.venv-ears`: torch, librosa, transformers<5, since 5.x breaks every CLAP checkpoint; `laion/larger_clap_music` loads
collapsed, so it uses `larger_clap_music_and_speech`).

- `.venv-ears/bin/python ears.py FILE... [--timeline]`: the menace margin (similarity to dark/menacing descriptions minus
  heroic/upbeat ones), genre probes, and librosa measures (mode, brightness, register balance, density, clashes).
- `.venv-ears/bin/python ablate.py out/stems2 --t0 S --t1 S [--groups]`: removes one stem at a time, so you can see which
  part pulls a section toward heroism.
- `PYTHONPATH=.venv-ears/tf5 .venv-ears/bin/python musicgen_refs.py`: MusicGen reference clips for calibration only
  (CC-BY-NC weights; nothing it makes ships).

Calibration: MusicGen heroic control -0.062 and The Ninety-Fifth v1 -0.06 to -0.07 (judged "adventurous, too upbeat");
fast chiptune/dubstep boss references about 0.00; a slow sub-bass drone +0.11. "Dark" in this model means slow and low, so
for fight music the goal is to get out of the heroic band, not to maximise the margin. Kit lesson: a clap backbeat,
sixteenth hats and four-on-the-floor kicks with open offbeat hats read as upbeat dance music; taiko reads as menace.

`boss_theme_v2.py` is the rebuild (E Phrygian, 150 BPM, 8-bar intro + 56-bar loop) → `out/boss2-*.wav`. Drops at body bars 9,
25 and 41: a pre-drop bar strips the low end (bass, sub, guitars, taiko) and the last half beat is gated to silence, so
the low end comes back about +5.5 dB on the downbeat. Rhythm guitar is synthesised (`Engine.guitar`: Karplus-Strong strings,
the track's `sat` as the amp, `post_eq` as the cabinet), double-tracked hard left/right; CLAP hears it as "distorted
electric guitar power chords". Guitar tracks sit at -20 dB: the amp stage comes out near full scale.

| Script | Output | What it is |
|---|---|---|
| `compose-fight.js` | `out/fight-loop.mid` | Quick Fight loop. D minor, 140 BPM, 48 bars (~82s). |

## Fight loop: BandLab steps

1. `node tools/music/compose-fight.js`
2. BandLab Studio: New Project, then drag `out/fight-loop.mid` onto the timeline. Set the project tempo to **140** first, or the import stretches.
3. Each MIDI track arrives on its own lane. Swap instruments:
   - **Drums**: a punchy rock or trap kit.
   - **Bass (synth)**: a gritty synth bass; it plays 8ths, so a short decay keeps it tight.
   - **Rhythm (power)**: a distorted guitar or a heavy saw-synth; it is a gallop, palm-muted feel.
   - **Pad / Strings**: strings or a dark pad, mixed low.
   - **Lead**: the theme. A bright saw lead or a lead guitar.
   - **Arp**: a plucky synth, mixed quietly; it only plays in the second half.
4. Leave headroom: the game's hit sounds sit on top. The music plays at roughly 30-40% of full volume in game.
5. Export the whole song as WAV or MP3 from bar 1 to the end of bar 48, with **no tail** (no reverb ring-out past the end), so it loops cleanly.
6. Drop the export in `audio/music/fight.mp3` (or `.ogg`) and tell Claude.

Structure: A (groove) 1-8, A2 (theme) 9-16, B (lift) 17-24, A3 (theme + arp) 25-32, breakdown 33-40, final 41-48 with a tom fill into bar 1.
