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
