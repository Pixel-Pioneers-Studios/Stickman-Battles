# Camera

`js/smb-camera.js`. Test harness: `node tools/camera-stress.js` (needs the game
served — `python3 -m http.server 8080` from the repo root).

---

## The contract

**Every fighter the camera is responsible for is inside the safe viewport, in
every mode, on every arena, at every separation.**

The old framing did not guarantee this, and the failure was structural rather
than a tuning miss. On wide arenas it computed the *zoom* from the bounding box
of both fighters, then slid the *centre* toward the local human as the pair
separated (`_humanW` ramping to 1.0). So the zoom was wide enough to hold both
fighters and the camera deliberately pointed somewhere else — which is exactly
"player 2 is off screen and the camera doesn't zoom out". Zoom and centre have to
be solved together, and now they are.

## How it works

### 1. Tracking set — `_camTrackedSet()`

- **Humans are never dropped.** In local 2P both fighters are someone's hands.
- AI and bosses are included only within `CAM_TRACK_RADIUS_X/Y` (1700 × 1100) of
  the human centroid. A story enemy three screens away is not part of the shot;
  dropping it from the framing is correct, sliding the camera off the humans to
  chase it is not.

### 2. Solver — `_camSolveFrame(list, opts)`

A fixed-point loop, 2–3 passes in practice:

1. Bounding box of the tracked set, with every extent **clamped into the
   reachable world rect**. A fighter launched above the ceiling can never be
   framed (the world clamp forbids panning there), so letting them drag the box
   just pushes everyone else out to chase someone unreachable.
2. Zoom to fit the box with padding, clamped to `[zMin, zMax]`.
3. Clamp the centre into the world at that zoom.
4. Measure the worst overflow across the set; widen by exactly that factor;
   repeat.

Look-ahead and boss emphasis are folded in as a weighted *preference* for the
centre, never as an override — containment still wins, so neither can push a
fighter off screen.

### 3. Zoom floor

`zMin` is a flat limit (0.30 wide / 0.42 standard), **not** "whatever keeps the
viewport inside the world". That constraint is what broke the sewer: its world is
only ~510 units tall, so requiring the viewport to fit vertically pinned the floor
at 0.8 and the camera could never widen enough to hold a 1700-unit horizontal
spread. Showing a little past the world edge costs nothing (`drawBackground`
fills well beyond it); losing a player costs the match.

### 4. Travel

Acceleration-limited, with the speed ceiling scaled by distance: past ~700 units
behind its target the camera is not following any more, it is catching up, and it
is allowed to move up to 4× faster. A flat cap meant a 3000-unit jump (a story
portal, a teleport attack) took 90 frames with everyone off screen.

### 5. Failsafe

Now a genuine last resort rather than the thing keeping fighters on screen. It
distinguishes two cases:

- **Framing is right, camera is behind** (teleport, portal, huge knockback) —
  close 45% of the remaining distance toward the known-good target. Never snap
  toward the fighter; that is what used to fight the framing.
- **Framing itself lost someone** — the old partial snap, unchanged.

It skips fighters outside the reachable world rect horizontally *and* vertically.
A fighter above the ceiling tripped the HUD-overlap test forever and the snap
yanked the camera off the fighter who *was* framed, every cooldown — measured on
grass as target y 278 (correct) → snapped to −14 → back to 278, forever.

### 6. HUD clamp

Keeps the topmost fighter out from under the HUD bar, but is now bounded below by
the position at which the *lowest* fighter would leave the frame. Clearing the
HUD for the top fighter by losing the bottom one is the same bug pointed the
other way.

---

## Stress test

`tools/camera-stress.js` drives the real game through 15 scenarios, forcing
positions every frame so the camera cannot pass by the fighters happening to come
back together. Per scenario it reports:

| Field | Meaning |
|---|---|
| `offFrames` | frames where a tracked fighter was outside the safe viewport (after a 90-frame settle) |
| `maxOver` | worst overflow, in fractions of a half-viewport (1.0 = exactly at the edge) |
| `snapMax` | largest single-frame camera jump in world units; >220 reads as a cut |
| `zoom` | the range the camera actually used |

Scenarios: centred pair; opposite edges; vertical extremes; oscillating
separation; sewer at opposite ends; sewer with one player sprinting away;
megacity far separation; megacity with a teleporting player; a fighter above the
ceiling; a fighter below the floor; low-gravity launch; sewer under real physics;
boss separation; Battle Royale through a live match; and a 1P case asserting a
distant bot does **not** drag the camera off the human.

Current result: **all 15 pass.**

The teleport scenario is allowed to cut (`allowCut`) and to lose ~20 frames: a
player jumping 3100 units instantly *should* produce a cut, and closing that gap
smoothly would leave them off screen for a second. What is measured there is that
it recovers fast, not that it stays smooth.

### Adding a scenario

Append to `SCENARIOS`. `drive: (t) => [[x1,y1],[x2,y2]]` forces both fighters each
frame; omit `drive` and set `free: true` to let the game play itself. `br: true`
drops from the plane first and watches only the local player (BR locks to P1 by
design). `humanOnly: true` makes P2 a bot and asserts it is correctly ignored.
