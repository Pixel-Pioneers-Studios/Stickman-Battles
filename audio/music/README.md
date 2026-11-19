# Stickman Battles soundtrack

These are original, fully arranged loopable game tracks composed manually in
the music workflow and rendered as local MP3 assets. Each has an intro, main
groove, lift, breakdown or bridge, and finale before it returns to its loop
point.

- `arena-neon.mp3` — bright synth arena loop (54.1 seconds)
- `battle-royale.mp3` — dense, urgent pursuit loop (51.2 seconds)
- `boss-threshold.mp3` — dark, descending boss loop (53.3 seconds)
- `story-embers.mp3` — slower, reflective story loop (56.5 seconds)
- `boss-ninety-fifth.mp3` — "The Ninety-Fifth", the boss theme (Creator and TrueForm fights). Hybrid
  orchestral, E minor, 140 BPM, built on the films' motifs. A 13.7 s intro plays once, then 13.714286 s to
  123.428571 s loops sample-accurately through Web Audio (loop points in `MusicManager._localSources`).
  Rendered by `tools/music/orch/boss_theme.py` from CC0 orchestral samples. Replaces `boss-threshold.mp3`
  in game; the old file is kept.

`js/smb-audio.js` routes them by `gameMode` and keeps the existing mute/duck
controls intact. Run `node tools/music/render-soundtrack.js` to regenerate the
uncompressed WAV masters before encoding a new set of MP3 assets.
