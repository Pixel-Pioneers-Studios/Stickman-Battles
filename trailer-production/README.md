# Stickman Evolution: The 95th — YouTube trailer production

Everything here is self-contained: no file outside `trailer-production/` was
created or changed. The scripts read the game, `tools/showcase/session.js`,
`fonts/` and `audio/` but never write to them.

## Deliverables (`out/`)

| File | What | Size | Length |
|------|------|------|--------|
| `stickman-evolution-trailer-main-1080p60.mp4` | Main trailer | 1920×1080, 60 fps | 57.5 s |
| `stickman-evolution-trailer-30s-1080p60.mp4` | 30-second cut | 1920×1080, 60 fps | 30.0 s |
| `short-1-finishers-1080x1920.mp4` | Short: "Every weapon has its own finisher" | 1080×1920, 60 fps | 22.2 s |
| `short-2-boss-1080x1920.mp4` | Short: "Can you beat the Creator?" | 1080×1920, 60 fps | 13.2 s |
| `short-3-weapons-1080x1920.mp4` | Short: "25 weapons — pick yours" | 1080×1920, 60 fps | 17.4 s |
| `short-5-worlds-1080x1920.mp4` | Short: "24 worlds, one fighter" (10 non-spoiler story worlds, unnamed) | 1080×1920, 60 fps | 19.7 s |
| `short-4-arenas-1080x1920.mp4` | Draft, not for upload: arena hazard kills (hazards don't read at Shorts size) | 1080×1920, 60 fps | 15.8 s |
| `thumbnail-1280x720.jpg` | YouTube thumbnail (upload this one, under 2 MB) | 1280×720 | — |
| `thumbnail-1920x1080.png` | Thumbnail master | 1920×1080 | — |

All videos: H.264 High, yuv420p limited-range BT.709, AAC 320 kb/s 48 kHz
stereo, `+faststart`, loudness-normalised to about −14 LUFS (YouTube's
reference level) with true peak under −1 dBFS.

## What is in the footage

Every gameplay frame is the real game, rendered by the game and read off
`#gameCanvas` one simulated tick per video frame.

- **Free-play shots** (duels, story chapters, the Creator boss, battle royale,
  soccer, the Reaper's domain): Player 1 is played by the game's own Sovereign
  AI — the F7 "plays for me" toggle — against the game's bots. Nothing in these
  is scripted; kills such as *Reaper's Sweep* and *Overload* happened on their own.
- **Staged shots** (the move montage and the eight named finishers): Player 1
  casts a chosen Q/E move at an idle opponent. For a finisher the opponent is
  left on 1 HP so the move's own finisher plays.
- The DOM HUD (health bars at the top of the page) is not part of the canvas
  and so is not in the footage. Tutorial prompts, the story objective bar and
  achievement popups are switched off for capture. So are damage numbers, floating labels, the name and health plate over each fighter, and the "SUPER!" text; the finisher name cards stay. No flashes are added on cuts, and a small "IN-GAME FOOTAGE" note sits in a corner until the end card. In story shots extra
  enemies are spawned ahead of the player so there is a fight in frame.
- Some shots are punched in (cropped and scaled) in the edit so the fighters
  read at video size. Nothing is sped up or slowed down.

**Sound.** The game's audio is not recorded live. While a shot is captured,
every sound the game starts is logged with its frame, sample, gain, pitch and
pan; the edit rebuilds the effects track from the game's own
`audio/sfx/*.wav` for exactly the windows used. Sounds the game synthesises
without a sample file are not reproduced. Music is the game's own soundtrack
(`audio/music/boss-threshold.mp3`, `battle-royale.mp3`), which the repo
documents as original compositions. The title and end-card hits are samples
from the same SFX pack. No third-party audio, fonts or art are used; the fonts
are the game's self-hosted Potta One, SE Logo Brush (the menu logo face) and Rajdhani.

**Claims on screen**, each checked against the running game with `info.js`:
25 selectable weapons, 15 default classes (the locked Fragment class, Adept, is left out), 186 story chapters, a finisher for every
selectable weapon (`MOVE_FINISHERS`), battle royale, minigames, local and
online play. "94 came before you / none survived" is the game's own premise
(`docs/canon.md`). "3-phase boss fight" is the Creator boss class. There are no
reviews, awards or player numbers.

## Regenerating

Needs Node, ffmpeg and Google Chrome (or Puppeteer's bundled browser), all of
which the repo's other tools already use. Run from `trailer-production/`.

```sh
node info.js                      # the facts the captions may state
node capture.js land all          # 25 landscape shots  -> work/land/*.mov (+ .json logs)   ~15 min
node standoff.js hold             # Kael vs Sovereign standoff clips (also: close, charge) -> work/land/standoff*.mov
node bearers.js                   # the 94 ghost bearers (story scene id 16)              -> work/land/bearers.mov
node capture.js vert duel,duel2,boss,trueform,domain,moves,moves2,moves3,finKatana,finStaff,finHammer,finScythe,finGlass,finAnchor,finFists,finAxe,story2
node capture.js vert swHome,swForest,swIce,swRuins,swNeutral,swWar,swFlux,swShadow,swTitan,swQuiet,swCoast   # story worlds short
node capture.js vert hzVolcano,hzCity,hzCave,hzCyber   # arena hazard kills (free play; retakes until a hazard kill lands)
node review.js windows land       # busiest windows, finisher spans and cast frames per shot
node edit.js all                  # all five videos -> out/                                 ~12 min
node edit.js main                 # or one of: main cut30 shortFinishers shortBoss shortWeapons shortArenas shortWorlds
node standoff.js                  # thumbnail: the standoff, bare-handed, with the logo
node review.js sheet out/<file>.mp4 1 12   # contact sheet, one tile a second
```

`work/` (raw clips, about 1 GB) is git-ignored and can be deleted; `capture.js`
rebuilds it.

**Re-capturing changes the footage.** The AI and bots are not seeded, so a
free-play shot is different every run. The staged shots (`moves*`, `fin*`) are
repeatable. After re-recording a free-play shot, check its contact sheet and
update the `at:` frame for that shot in `cuts.js`.

## Files

| File | Purpose |
|------|---------|
| `capture.js` | Shot list and capture profiles (landscape, vertical) |
| `lib/recorder.js` | 60 fps frame-stepped recorder, sound-event logger and SFX mixer |
| `cuts.js` | The five edits: segments, captions, music, stingers — all in frames |
| `lib/engine.js` | Renders an edit: concat, overlay, audio mix, loudness, encode |
| `lib/overlay-page.js` | Motion graphics (captions, tags, logo, end card), drawn on a canvas |
| `standoff.js` | The painted Kael vs Sovereign standoff: thumbnail and the open/close clips |
| `bearers.js` | Clean capture of the ghost-bearer story scene (words and bubbles left undrawn) |
| `edit.js`, `thumb.js`, `review.js`, `info.js` | Command-line entry points (`thumb.js` is the old gameplay-frame thumbnail) |

Cuts sit on the music's beat grid: `boss-threshold.mp3` is 144 BPM (100 frames
a bar at 60 fps) and `battle-royale.mp3` is 150 BPM (96 frames a bar).

## Known limits

- **TrueForm is not in the trailer.** Its capture came back with both fighters
  standing still for the whole 16 seconds, so the shot was dropped rather than
  shown. The Creator is the only boss on screen.
- **No online-multiplayer footage.** "Local + online" is a caption over a
  local match; capturing a real online lobby needs two connected clients.
- In the vertical videos the game's own finisher banners are wider than a 9:16
  frame, so the punch-in crops them out and a weapon tag is shown instead.
- The call to action points at the itch.io page. The URL is in `cuts.js`
  (`URL`) if it should point somewhere else.
