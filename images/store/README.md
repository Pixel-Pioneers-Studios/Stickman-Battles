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

## Preview videos

`preview-landscape-1080p.mp4` (1920×1080) and `preview-portrait-1080p.mp4`
(1080×1620, 2:3). Both are 18.5s, silent, and a few MB — inside the 15–20s
window and well under the 50MB cap. Each opens on its matching static cover, as
required.

Content is real gameplay, not a slideshow: three bot-vs-bot matches captured
frame-by-frame off `#gameCanvas` at 15fps — volcano (katana/scythe), ice
(hammer/katana), clouds (sword/spear). Both fighters are set to bots so combat
is autonomous. Canvas capture excludes the DOM HUD, which is convenient since
promotional text is prohibited.

Two constraints worth remembering if you recapture:

- **Arena choice is a hard constraint.** `space` and `cyberpunk` are dark enough
  that ffmpeg's `blackdetect` flags them as black screens, which CrazyGames
  prohibits. Volcano, ice and clouds pass. Verify with:
  `ffmpeg -i <file> -vf "blackdetect=d=0.15:pic_th=0.95" -f null -`
- **Portrait is a poor fit for this game.** It is a landscape platform fighter,
  so a 2:3 frame cannot be filled without cropping away the arena. Black bars
  are prohibited, so the portrait cut centres the 16:9 gameplay over a blurred,
  slightly brightened copy of itself. It reads as deliberate, but the fighters
  end up small. If CrazyGames pushes back, this is the asset to redo.

### Regenerating the videos

Capture needs a page with no CSP (the shipped `server.js` CSP blocks posting
frames out), so serve the repo from a plain static server, run a bot-vs-bot
match, and POST downscaled JPEG frames from an in-page `setInterval`. Then:

```sh
# gameplay, with a slow push-in
ffmpeg -y -framerate 15 -i frames/%05d.jpg \
  -vf "zoompan=z='min(zoom+0.0009,1.18)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=15,scale=1920:1080:flags=lanczos" \
  -c:v libx264 -pix_fmt yuv420p -crf 20 -an play_clip.mp4

# 1.4s cover as the opening frame, then concat
ffmpeg -y -loop 1 -t 1.4 -i cover-landscape-1920x1080.png -vf "scale=1920:1080" \
  -r 15 -c:v libx264 -pix_fmt yuv420p -crf 20 -an cover_clip.mp4
printf "file 'cover_clip.mp4'\nfile 'play_clip.mp4'\n" > concat.txt
ffmpeg -y -f concat -safe 0 -i concat.txt -c copy preview-landscape-1080p.mp4
```
