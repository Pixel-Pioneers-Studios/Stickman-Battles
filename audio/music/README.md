# Stickman Battles soundtrack

These are original, fully arranged loopable game tracks composed manually in
the music workflow and rendered as local MP3 assets. Each has an intro, main
groove, lift, breakdown or bridge, and finale before it returns to its loop
point.

- `arena-neon.mp3` — bright synth arena loop (54.1 seconds)
- `battle-royale.mp3` — dense, urgent pursuit loop (51.2 seconds)
- `boss-threshold.mp3` — dark, descending boss loop (53.3 seconds)
- `story-embers.mp3` — slower, reflective story loop (56.5 seconds)

`js/smb-audio.js` routes them by `gameMode` and keeps the existing mute/duck
controls intact. Run `node tools/music/render-soundtrack.js` to regenerate the
uncompressed WAV masters before encoding a new set of MP3 assets.
