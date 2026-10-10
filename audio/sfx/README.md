# Stickman Battles SFX pack

These are original, hand-designed gameplay sound effects. They are rendered as
small stereo WAV files so they are fast to decode and play with the Web Audio
API. The pack covers impacts, weapon identities, movement, UI feedback,
abilities, cinematic stingers, and the Mega Knight entrance.

Generate the pack with:

```bash
node tools/audio/render-sfx.js
```

The renderer is deterministic and uses explicitly authored layers (transients,
noise bands, pitch sweeps, tonal impacts, and delay). It does not call an AI or
an external audio generation service.

Several cues have variants (`hit`/`hit2`/`hit3`, `swing`/`swing2`/`swing3`,
`heavyHit`/`heavyHit2`, `hitSlash`/`hitSlash2`) that `SoundManager` rotates
through, and the swing and shot cues are chosen per weapon (`swingHeavy`,
`swingLight`, `shootBow`, `shootZap`, `flame`, `throwSpin`). A new file needs an
entry in `SFX_ASSET_PATHS` in `js/smb-audio.js` or nothing loads it.
