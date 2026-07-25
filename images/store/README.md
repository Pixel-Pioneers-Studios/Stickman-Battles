# Store / portal assets

Cover art for game-portal submissions (CrazyGames and similar). Generated from
the key art in `images/` with ffmpeg — see the commands below to regenerate.

## CrazyGames cover requirements

Per https://docs.crazygames.com/requirements/game-covers/ — all three are mandatory:

| Cover | Ratio | Required size | File |
|-------|-------|---------------|------|
| Landscape | 16:9 | 1920×1080 | `cover-landscape-1920x1080.png` |
| Portrait | 2:3 | 800×1200 | `cover-portrait-800x1200.png` |
| Square | 1:1 | 800×800 | `cover-square-800x800.png` |

Landscape and square are cropped from `images/True-Form.png`, which carries no
text. Portrait is cropped from `images/Boss-Page.png` **below its title block** —
that art has "THE CREATOR Awakens" baked in, which is both a spoiler and not the
game's name, so the crop must stay clear of the top ~400px of the source.

Do not use `images/Game-Page.png` for store covers: it reads "STICKMAN BATTLES",
the pre-rename title.

## Regenerating

```sh
ffmpeg -y -i images/True-Form.png -vf "crop=1536:864:0:80,scale=1920:1080:flags=lanczos" images/store/cover-landscape-1920x1080.png
ffmpeg -y -i images/Boss-Page.png -vf "crop=757:1136:133:400,scale=800:1200:flags=lanczos" images/store/cover-portrait-800x1200.png
ffmpeg -y -i images/True-Form.png -vf "crop=1024:1024:200:0,scale=800:800:flags=lanczos" images/store/cover-square-800x800.png
```

## Still missing: preview video

CrazyGames also requires a gameplay preview video, which needs a real capture:

- 15–20 seconds (longer gets cut at 20s)
- 50MB maximum
- 1080p in **both** landscape (16:9) and portrait (2:3) — both mandatory
- No sound, no promotional text, no black bars, no mouse cursor, no logo transitions
- Use the matching static cover as the opening frame
