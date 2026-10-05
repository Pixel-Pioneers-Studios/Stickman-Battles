# Store / portal assets

Cover art for game-portal submissions (CrazyGames and similar). Rendered by the
game engine itself — see Regenerating below. The July 2026 covers were AI key art
(garbled glyphs, melted hands, a character who isn't in the game) and were
replaced in September after CrazyGames rejected the build on overall quality.

## CrazyGames cover requirements

Per https://docs.crazygames.com/requirements/game-covers/ — all three are mandatory:

| Cover | Ratio | Required size | File |
|-------|-------|---------------|------|
| Landscape | 16:9 | 1920×1080 | `cover-landscape-1920x1080.png` |
| Portrait | 2:3 | 800×1200 | `cover-portrait-800x1200.png` |
| Square | 1:1 | 800×800 | `cover-square-800x800.png` |

High-resolution 2× masters are kept alongside the upload-ready files for
future portal exports: `cover-landscape-3840x2160.png`,
`cover-portrait-1600x2400.png`, and `cover-square-1600x1600.png`.

CrazyGames also requires **the game's name on every cover, and no other text**
(no "New", "Play now"…), no borders, no store logos, nothing blurry.

## Regenerating

"The 95th looks up." Kael stands on a ledge with the Fragment cracking light
through his chest, looking up at four figures on distant summits: God (solid
white), Axiom (black body, white line, crouched), the Void Mind (purple) and,
on a nearer spire, Sovereign (red). None is named and none carries a defining
trait beyond its colour. A war fills the valley below. Every figure is the
in-game model: `tools/showcase/apex-scene.js` builds the posed ones from the
same FigureSkin primitives Fighter.draw uses, and the battle is real Fighters.
The sky, mountains and effects are authored canvas art. The title is
composited in Russo One, the menu logo's face.

One scene, three cameras (`port`, `land`, `sq` layouts in apex-scene.js). The
landscape title sits bottom-left (`apexland`) because the war fills the bottom
centre.

```sh
node tools/showcase/apex-cover.js /tmp/cov/land.png 3840 2160 land
node tools/showcase/apex-cover.js /tmp/cov/port.png 1600 2400 port
node tools/showcase/apex-cover.js /tmp/cov/sq.png 1600 1600 sq
node tools/showcase/compose-cover.js /tmp/cov/land.png images/store/cover-landscape-3840x2160.png 3840 2160 apexland
node tools/showcase/compose-cover.js /tmp/cov/port.png images/store/cover-portrait-1600x2400.png 1600 2400 port
node tools/showcase/compose-cover.js /tmp/cov/sq.png images/store/cover-square-1600x1600.png 1600 1600 sq
ffmpeg -y -i images/store/cover-landscape-3840x2160.png -vf scale=1920:1080:flags=lanczos images/store/cover-landscape-1920x1080.png
ffmpeg -y -i images/store/cover-portrait-1600x2400.png -vf scale=800:1200:flags=lanczos images/store/cover-portrait-800x1200.png
ffmpeg -y -i images/store/cover-square-1600x1600.png -vf scale=800:800:flags=lanczos images/store/cover-square-800x800.png
```

`apex-cover.js` runs the page offline (CDN scripts answered with empty
bodies) and reads the pixels straight off the canvas, so neither a slow
network nor the intro animation can spoil a capture. Avoid per-stroke
`shadowBlur` on hundreds of shapes in the scene: at 1600x2400 it knocks the
canvas out and the capture comes back as the menu.

The previous cover (a two-fighter clash) is still reproducible with
`tools/showcase/cinematic-cover.js`.

## Preview videos

`preview-landscape-1080p.mp4` (1920×1080) and `preview-portrait-1080p.mp4`
(1080×1620, 2:3) are the portal previews: 19.9s at 30fps, silent, ~13MB — inside
the 15–20s window and well under the 50MB cap. Each opens on its matching
static cover (frames 0–44), as required.

`trailer-landscape-1080p.mp4` is a longer 36s cut of the same footage for
places without the 20s limit (itch.io page, socials). It adds a second move
montage, a third finisher, soccer and a third story chapter.

Every shot is real gameplay captured frame by frame off `#gameCanvas`. In the
free-play shots Player 1 is driven by Sovereign's AI (the F7 "Sovereign plays
for me" brain), so the footage shows the game played well. The move and
finisher shots are staged instead: Player 1 casts chosen Q/E moves at an idle
opponent, the pair reset face to face before each (the resets are the cuts),
and a finisher shot leaves the opponent on 1 HP so the move's own finisher plays.

| Shot | What |
|------|------|
| duel | Lava arena, katana vs Glass Blade (hard bot) |
| moves | Colosseum: hammer E, scythe E, electric staff Q |
| moves2 | Colosseum: katana Q, frying pan E, whip Q (long cut only) |
| story | Ch. 1 back alley, two enemies spawned ahead so Sovereign fights through the level |
| finisher | Colosseum: katana E into its finisher, Thousand Steps |
| boss | The Creator, 3-phase boss |
| story2 | Ch. 5 night rooftops, same setup |
| finisher2 | Cyberpunk: electric staff E into Judgment Bolt |
| finisher3 | Forest: hammer E into Stormcaller (long cut only) |
| soccer | Sports minigame, cut around a goal (long cut only) |
| story3 | Ch. 24 lab (long cut only) |
| domain | Reaper's domain (Eternal Harvest) on the Mushroom arena |

Free-play shots record longer than they need and keep the window with the most
damage dealt (or the goal, or the domain landing); staged shots keep exactly
their casts, ending a beat after the finisher. Story captions, tutorial
prompts and the canvas-drawn HUD (objective bar, enemy name tag, BR inventory
and minimap, edge arrows, achievement popups) are switched off for the
capture. In the assembler, `shot:secs` keeps only the first secs of a shot's
window — that is how the store cut fits under 20s.

```sh
SHOTS=duel,moves,moves2,story,finisher,boss,story2,finisher2,finisher3,soccer,story3,domain
STORE=duel:1.8,moves,story:2.2,finisher,boss:1.8,story2:1.8,finisher2,domain:2.4
LONG=duel,moves,story,finisher,boss,moves2,story2,finisher2,soccer,story3,finisher3,domain
node tools/showcase/trailer.js /tmp/tr 1920 1080 $SHOTS
node tools/showcase/trailer-assemble.js /tmp/tr images/store/cover-landscape-3840x2160.png images/store/preview-landscape-1080p.mp4 1920 1080 $STORE
node tools/showcase/trailer-assemble.js /tmp/tr images/store/cover-landscape-3840x2160.png images/store/trailer-landscape-1080p.mp4 1920 1080 $LONG
# Portrait: record wide and follow the fight with a 1080px slice — the game
# letterboxes a tall viewport into a thin band, so native portrait is tiny.
node tools/showcase/trailer.js /tmp/trp 2880 1620 duel,moves,story,finisher,boss,story2,finisher2,domain 1080
node tools/showcase/trailer-assemble.js /tmp/trp images/store/cover-portrait-1600x2400.png images/store/preview-portrait-1080p.mp4 1080 1620 $STORE
# Portal checks
ffmpeg -i images/store/preview-landscape-1080p.mp4 -vf "blackdetect=d=0.15:pic_th=0.95" -f null -
```

Free-play shots differ run to run (Sovereign and the bots aren't seeded), so
check the contact sheet of every shot before shipping a cut.

Known limit of the portrait cut: banners wider than a 2:3 frame (the domain
title card, "GOAL!") are clipped at the edges.
