# Handoff — Battle Royale rebuild, The Sewer, and the camera (Sep 13 2026)

**Nothing in this session is committed.** The working tree also contains
*someone else's* in-flight work (see "Not mine" below) — check with the user
before staging anything broad. Do not `git add -A`.

Verified at handoff time:

- `npm run build` — all js files pass `node --check`
- `npm run audit` — `0 error, 1 warning, 2 accepted` (the warning and both
  acceptances are pre-existing)
- `npx eslint` on every file this session touched — **clean**
- `npm run check` overall sits at the documented 72-problem baseline; I
  introduced none of them (verified by re-running eslint against a stash)
- `node tools/camera-stress.js` — **all 15 scenarios pass**

---

## Where to start reading

| Doc | What |
|---|---|
| [`docs/worklist-sep13-2026.md`](../worklist-sep13-2026.md) | The original 7-item triage with priority ratings. **Items #1 and #4 are still open.** |
| [`docs/battle-royale-redesign.md`](../battle-royale-redesign.md) | BR design + 4 build passes, with measurements |
| [`docs/camera.md`](../camera.md) | Camera contract, solver, and the stress harness |

---

## What shipped

### Battle Royale — rebuilt

The map was a 9000×2800 vertical shaft with **no `isFloor` platform anywhere** —
one knockback was a 2400px fall to death. It is now a 12000×1900 world in three
layers with a continuous floor.

- **Hand-authored** `BR_LANDMARKS` (generation is gone). `_brValidateReach()`
  checks every platform against the real jump envelope at build time and
  currently reports **zero unreachable platforms**.
- Surface: 11 landmark bands using base-game arena art. Underground: Caverns
  under the plains → Tunnel under the desert → Volcano Depths. Sky: Cloud
  Kingdom. Layer gaps exceed the double-jump reach (~370px), so changing layer
  is a route, not a hop.
- 4 **rift** pairs (the only way into the sky, the fast way out of the deep),
  each with a light column, ground pool and minimap marker.
- **Wildlife** (2 beasts, 1 yeti) excluded from `brAlive`/placement/win via
  `_brIsContender`.
- Loot: 5 rarity tiers, budget split by landmark weight, rarity biased per band.
- Everyone drops with `WEAPONS.combat` (fists) and loots up.
- Storm generated per match: wandering ring, irregular timings, telegraphed
  surges. **Tuned down in pass 4** — pauses ~22s→9s, ramp `1.45^phase`.
- Phase cinematics and finishers are **off in BR** (both froze the world mid-storm).

### The Sewer — new arena

`js/smb-sewer.js` + the `sewer` entry in `ARENAS`. A river, not a room: no
platforms, only garbage rafts floating in the flow, all moving on one shared
current, respawning upstream. Falling in burns, sweeps, and is escapable by
swimming. Camera-stress failsafe sinks the middle waste and speeds up the back
rafts if players grief the spread (2 sustained seconds past 1500px).

### Camera — rebuilt around a containment solver

The old wide-arena path computed zoom from the pair's bounding box then slid the
centre onto one human as they separated. That is the reported "P2 is off screen
and the camera doesn't zoom out". Zoom and centre are solved together now, with a
tracking set that never drops a human.

`tools/camera-stress.js` is the deliverable that proves it — 15 scenarios,
forcing positions every frame. **Run it after any camera change.**

---

## Landmines

**1. `_brSpawnLoot`-style index-range replacement will eat your code.**
I made this mistake twice in `smb-battleroyale.js`: a Python
`s[s.index(A):s.index(B)]` slice whose end marker sat *past* functions I meant to
keep, silently deleting `_brUpdatePlane`, `_brUpdateBotFalls`, the zone/surge
system and the whole STATE block. Both times it only surfaced in the browser.
**Use anchored exact-string replacement, and after any bulk edit run:**

```bash
diff <(grep -oE "^(var|const|function) [A-Za-z_][A-Za-z0-9_]*" <(git show HEAD:js/smb-battleroyale.js) | sort -u) \
     <(grep -oE "^(var|const|function) [A-Za-z_][A-Za-z0-9_]*" js/smb-battleroyale.js | sort -u) | grep '^<'
```

**2. `godmode` clamps y to `GAME_H + 100`.** The free-flight debug path in
`Fighter.update()` pinned a flying player at y=620, which in BR's 1900-tall world
made the underground unreachable and cost me an hour of chasing a phantom
teleport. It reads `currentArena.mapBottom` now, but any harness that sets
`godmode` to keep a test fighter alive is also changing its physics.

**3. A test harness's synthetic jump only works once.** `keysDown.add(jumpKey)`
produces one edge; repeated measurements in the same page return rise 0. Only the
first measurement in a run is trustworthy.

**4. `drawStageBoundary` derives the kill boundary from `isFloor` platforms.**
The Sewer's only `isFloor` is a drifting 210px raft, so the whole screen sat under
a permanent red ring-out flare. Arenas where the floor edge is not the boundary
set `noStageBoundary: true`.

**5. Every arena needs exactly one `isFloor`** or `pickSafeSpawn()` returns null
and respawns crash. The Sewer's floats and recycles — `_sewerRecycle` re-flags one
if the flagged raft sinks.

---

## Not mine — do not attribute to this session

The working tree already contained, and gained during, work I did not author:

- `js/smb-network.js` (+403), `js/smb-online.js`, `js/smb-smk2-class.js` (+452),
  `js/smb-sov-dossier.js`, `js/smb-menu-ui.js`, `js/smb-menu-spawn.js`,
  `js/smb-menu-startcore.js`, `js/smb-debug-console.js`, `js/smb-anim-fighter.js`,
  `SMB.css`, `js/smb-destruction.js`, `tools/sov-tactic-probe.js`
- **Changed mid-session while I was working:** `js/smb-particles-core.js` (gained
  `spawnParticlesDir`) and ~177 lines of `js/smb-fighter.js`. My only edit to
  `smb-fighter.js` was the 2-line `mapBottom` clamp.
- New untracked: `images/weapons/*.png`, `tools/weapon-sprites/`

**My files:** `js/smb-sewer.js` (new), `tools/camera-stress.js` (new),
`js/smb-battleroyale.js`, `js/smb-camera.js`, `js/smb-data-arenas.js`,
`js/rendering/smb-drawing-bg.js`, `js/rendering/smb-drawing-arenas.js`,
`js/smb-menu-utils.js`, `js/smb-menu-select.js`, `js/smb-globals.js`,
`js/smb-loop-core.js`, `js/smb-finisher-engine.js`,
`js/boss/smb-boss-tf-attacks1.js`, `js/smb-combat.js` (impact-juice scoping only),
`index.html`, and the three docs.

---

## Open work

### Still unstarted from the original triage

| # | Item | Rating |
|---|---|---|
| **1** | **Creator boss parity.** `smb-menu-startcore.js:355` gates the 4500-HP CREATOR buff behind `unlockedTrueBoss && !storyModeActive`, so ch144 "The Creator's Gate" spawns a base `Boss()`. TrueForm and Sovereign are already correct. Small, surgical. | 9/10 |
| **4** | **Story clear-gating.** `explore2.js` completes a chapter on `p1.x + p1.w >= exploreGoalX` — purely positional, so you can run past every enemy on every level. Needs a living-enemy count plus a `hidden`/`optional` opt-out audited across ~325 enemy defs. | 8/10 |
| **7** | Audit rule for story enemy data (locks in #1 and #4). | 5/10 |

### Rough edges in what shipped

- Sewer outfall pours still read as columns more than falling water.
- BR ice is visually distinct but not actually slippery (no per-band friction).
- BR lava pools draw as hard-edged rects with a glow block above.
- Sewer world is 1800 wide, so a far-apart 2P fight zooms out a long way before
  the 1500px stress threshold engages. May want a narrower world or a lower
  threshold — **user's call after playing it.**
- Camera: a 3100-unit teleport is allowed to cut and lose ~20 frames. I judged a
  cut correct there; if the user wants it never to cut that is a different trade.

### Unanswered design questions

1. BR landmark set — `mushroom`, `haunted`, `underwater` are unused.
2. Plane drop vs. a steerable glide.
3. Whether the sewer should keep 1800px of width.

---

## Running things

```bash
python3 -m http.server 8080          # serve (needed by every browser test)
node tools/camera-stress.js          # 15 camera scenarios, expects :8080
npm run check                        # build + audit + lint
node --check js/smb-sewer.js         # single-file syntax
```

Browser tests this session were puppeteer (already in `node_modules`) driving the
real game headlessly; the throwaway scripts live in the session scratchpad and are
not in the repo. `tools/camera-stress.js` is the one worth keeping.

**Cache-busting:** current tags for my files are `?v=4.1.26`
(battleroyale/sewer/finisher-engine/boss-tf-attacks1), `4.1.25` (data-arenas),
`4.1.2` (camera). Verify with
`grep -oE '\?v=[0-9.]+' index.html | sort | uniq -c` rather than trusting this.
Chrome's disk cache can defeat `?v=` — hard-reload when a change appears to do
nothing.

---

## What has and has not been playtested

Everything above is **browser-verified headlessly** — it runs, renders, and the
measurements are real. The user has played the BR map and the sewer and reported
back (that feedback is what drove passes 3 and 4). Nothing has been played by the
user *since* pass 4: the toned-down storm, the brighter rifts, the BR
finisher/cinematic suppression, the sewer jump fix and the new camera are all
unplayed by a human.
