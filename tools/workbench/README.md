# Workbench: weapons and story figures

Dev-only editors that run on the real game. Nothing here ships: the server injects
the panels into `index.html` as it serves it, and the game never loads `tools/`.

```bash
node tools/workbench/server.js        # opens http://localhost:8140/index.html
# weapons:  /index.html            (?weapon=katana opens a weapon straight away)
# figures:  /index.html?wb=figures
```

## Figure studio (`?wb=figures`)

Story-scene figures, drawn by the real scene renderer (`_sceneDrawFigure`) in the
fighter look.

- **Pose**: drag the joints of a big figure (hollow handles are the far limbs;
  the hip handle moves `lean` / `rootY`), or use the channel sliders. The
  small figure beside it is the size a scene actually draws on this screen.
  "used by" lists the clips that use the pose.
- **Clip**: keyframe timeline for `FigureRig.CLIPS`. Click a key to edit its pose
  on stage; drag a key to retime it; red/green onion skins are the keys either
  side. Space plays, arrows step a frame, `[` `]` jump between keys, 0.25x for
  slow motion. A key's ease shapes the move into it. **Fork pose** copies a
  shared pose so one clip can change without touching the others.
- **Scene**: plays any chapter's narrative scene (registry id) beside the panel,
  with pause, +1/+10 frames, beat jumps and speed. The readout shows the beat's
  text, whether staged and text beat counts match, and the staged keyframes.
  Guides mark footY (0.74), the caption line (0.82) and 15% edges. Saving any file
  in `js/story/scenes/` or the rig reloads it and replays the scene at that beat.
- **Save** (or Ctrl+S) writes edited poses and clips into `js/smb-figure-rig.js`,
  changing only the channels and key fields that changed, so layout and comments
  stay. A file edit made while the studio has unsaved changes reloads underneath
  them. Ctrl+Z undoes.

```bash
node tools/workbench/figure-shot.js pose stand,stance,look,kneel   # pose sheet, big + scene size
node tools/workbench/figure-shot.js clip attack --frames=10        # clip frames, keys marked
node tools/workbench/figure-shot.js pose look --set=pose.look.foreArmF=-1.9   # try an edit
node tools/workbench/figure-shot.js pose look --set=pose.look.foreArmF=-1.9 --save
```

Scene staging itself stays in code: specs are built by helper functions
(`beat()`, `cast()`), which a GUI can't write back. `tools/scene-strip/` renders
scene contact sheets.

## Weapon workbench

The panel opens a Training match with the chosen weapon.

- **Pose / Loop swing / Idle / Play**: hold the fighter at a point in the swing,
  loop it (0.25x for slow motion), or take control and hit the dummy.
- **Overlays**: red dots are the hit points this frame (`_getMeleeArcPoints`,
  the same function the game hits with), yellow is everything the swing
  sweeps, and the dashed line is the melee reach.
- **Stats, swing shape, sprite fit**: sliders write into the live tables
  (`WEAPONS`, `WEAPON_SWINGS`, `WEAPON_SPRITE_DEFS`), so the next frame shows
  the change. Edited fields turn yellow.
- **Save** writes only the edited fields back into `js/smb-data-weapons.js` and
  `js/smb-weapon-sprites.js`, in place. Comments, ability code and formatting are
  left alone. **Revert** reloads the page from source.
- **Art**: edit the weapon's SVG in `tools/weapon-sprites/defs-ornate.js` (or
  `parts-ornate.js`) and save. The server notices, re-renders it, and the new art
  shows up in the fighter's hand without touching the repo. **Ship art** writes
  `images/weapons/<key>.png`, re-fits `len` so the reach in front of the hand
  stays the same, bumps `WEAPON_SPRITE_VER`, and re-measures the edge profile.
- **Measure edge** recomputes `WEAPON_EDGE_PROFILE` from the loaded sprite. It
  matches the hand-measured profiles (141/160 values exact).

Abilities (Q/E), supers and move scenes are code, not data, so they are not
editable here.

## Contact sheets (for Claude and scripts)

```bash
node tools/workbench/shot.js sword                      # idle, 6 swing frames, facing left, art strip
node tools/workbench/shot.js axe --set=swing.a0=-1.3,swing.tilt=0.5   # try edits without saving
node tools/workbench/shot.js axe --set=swing.a0=-1.3 --save           # and write them to source
node tools/workbench/shot.js katana --clean --frames=8  # no overlays
```

It prints the sheet path and a JSON summary (reach, swing frames, source values).
`window.__wb` in the page is the same API the panel uses: `open`, `pose`, `play`,
`set`, `measureEdge`, `save`, `previewArt`, `shipArt`, `info`.
