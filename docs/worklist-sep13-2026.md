# Work List — Sep 13 2026

Five reported problems, investigated before rating. Ratings are **priority 1–10**
(10 = fix first; blocks the mode from being playable/shippable).

---

## 1. Story bosses are weaker than their menu refights — **9/10**

**Reported:** True Form was fixed once; Creator, Sovereign and others may still be
running downgraded versions inside Story Mode.

**What I found — this is real, and Creator is the remaining case.**

`js/smb-menu-startcore.js:355`

```js
if (unlockedTrueBoss && !storyModeActive) {
  boss.health = 4500; boss.maxHealth = 4500;
  boss.attackCooldownMult = 0.28; boss.kbBonus = 2.5; boss.kbResist = 0.25;
  boss.name = 'CREATOR'; boss.color = '#ff00ee';
}
```

The `!storyModeActive` guard means **chapter 144 "The Creator's Gate"** (the actual
Creator boss fight, `isBossFight: true`, 1 life) spawns a plain `new Boss()` — base
HP, base cooldowns, base knockback, and not even named CREATOR. The menu refight
with the TRUEFORM code gets the 4500-HP version. Same shape of bug as True Form had.

Already fixed (verified, no action needed):
- True Form — `smb-menu-startcore.js:524`, `new TrueForm()` with no story downscale.
- Sovereign — `smb-menu-startcore.js:466`, story chapters with `isSovereignFight`
  get the real `SovereignMK2` plus `applySovereignPeakTuning()`.

Entity coverage across all 186 chapters is thinner than it looks — only **6 chapters**
spawn a dedicated boss class at all:

| Chapter | Flag | Entity |
|---|---|---|
| act4 ch143 | `isSovereignFight` | SovereignMK2 ✅ full power |
| act4 ch144 | `isBossFight` + `isWorldBoss` | Boss ❌ **downgraded — no Creator buff** |
| act5 | `isTrueFormFight` | TrueForm ✅ full power |
| act5 damnation | `isBossFight` | Boss (intentional — scout) |
| act6 | `isBossFight` + `bossType: 'fallen_god'` | FallenGod ✅ |
| act7 | `isSovereignFight` | SovereignMK2 ✅ |

Everything else named as a "boss" in the story is an ordinary `Fighter` scaled by
`_storyScaleEnemyUnit`. Worth deciding per-encounter whether that's intended.

**Action:** remove the `!storyModeActive` gate for the Creator (or better, make the
story chapter carry an explicit `bossVariant: 'creator'` so it doesn't depend on
`unlockedTrueBoss`, which a first-time story player will not have unlocked).

---

## 2. Battle Royale — off-screen bots are literally invincible — **10/10** — ✅ FIXED

**Reported:** bots off-screen get offloaded, survive the storm, and always win.

**Root cause found — it is not the AI, it is an invincibility-frame freeze.**

- `_brCullBots()` (`js/smb-battleroyale.js:860`) sets `_brSleep` on any bot more than
  2000px/1200px from the camera.
- `js/smb-loop-core.js:544` then skips that bot's entire `update()`.
- `Fighter.update()` is the **only** place `this.invincible--` runs (`js/smb-fighter.js:428`).

So: a sleeping bot's i-frames never tick down. Bots get `invincible = 90` the frame
they land, and every `dealDamage()` re-arms 16 more. The first storm tick that lands
on a sleeping bot sets `invincible = 16` and it **never decrements again**. The bot is
permanently immune to the storm, to damage, to everything — frozen at full HP until
`brAlive <= 10` wakes it. Which never happens, because nothing can kill them.

Secondary effects of the same freeze:
- `_brStormTicks` exposure ramp never accumulates for sleeping bots.
- Sleeping bots never flee the closing zone (no movement), so the "storm pressure"
  design does nothing.
- `_brCheckWin`'s wake-one-per-second safety net only fires when ≤1 entity is awake —
  a rare state, so it rarely rescues the match.

**Action:** tick timers (`invincible`, `hurtTimer`, `_brStormTicks`) for slept bots
even while skipping physics/AI — a cheap "dormant tick" — or run storm resolution
against sleeping bots as a direct HP write through a dedicated path. Plus a real
late-game convergence step (see #5).

---

## 3. Battle Royale — global hit feedback strobing (seizure risk) — **9/10** — ✅ FIXED

**Reported:** the white hit-flash strobes constantly at match start; possible
photosensitivity issue and looks bad.

**What I found:** every impact-feedback channel in `dealDamage()` is a **global**,
fired by any fighter hitting any other fighter anywhere in a 9000×2800 world with
95 combatants:

| Global | Set at | Effect |
|---|---|---|
| `hitStopFrames` | `smb-combat.js:530-543` | `gameLoop` **returns before drawing** (`smb-loop-core.js:89`) — the screen stutter/strobe |
| `screenShake` | combat + BR | shakes for off-screen hits |
| `camHitZoomTimer` | `smb-combat.js:558` | camera punches in for hits you cannot see |
| `slowMotion` / `hitSlowTimer` | `smb-combat.js:547` | whole match slows for a bot skirmish |
| `_hitFlashTimer` | `smb-combat.js:523` | white `fillRect` over the fighter bounding box (`smb-loop-core.js:801`) |

`hitStopFrames` is the likely strobe: it skips the draw call entirely, so at BR start
(95 landings, loot crates being smashed) the render alternates frozen/live many times
a second. I want to confirm the exact visual in-browser before fixing, but the fix is
the same either way.

**Action:** gate all global juice on "the local player was involved, or it happened
on-screen" whenever `gameMode === 'battleroyale'`. Add a settings toggle for reduced
flashing regardless of mode (accessibility, and CrazyGames will ask).

---

## 4. Story chapters clear without killing anything — **8/10**

**Reported:** you can run past every enemy to the goal, on every level.

**Confirmed.** `updateExploration()` (`js/story/smb-story-engine-explore2.js:211`):

```js
if (!exploreArenaLock && !exploreGoalFound && p1.x + p1.w >= exploreGoalX && p1.health > 0) {
  exploreGoalFound = true;
  ...
```

Completion is **purely positional**. Region boundary crossings
(`_regionCompleteChapter`) are the same — the comment even admits it: *"a crossed
boundary implies a finished (or replay-skipped) fight."* The only thing that
actually stops you is `exploreArenaLock`, which is authored per-encounter and used
in very few chapters.

**Action:** make the goal require clearance — count living non-hidden enemies spawned
for the chapter, and refuse the goal (with a HUD prompt: "N enemies remain") until
they're down. Needs an explicit `optional: true` / `hidden: true` opt-out on defs
like vault wardens and chest guards so they stay skippable, plus the same check on
region boundaries. ~325 enemy defs across 186 chapters need auditing for which ones
get the opt-out.

---

## 5. Battle Royale — final-stage convergence — **6/10** — deferred: the horizontal ring converges without it

**Reported:** should the last contenders get teleported together?

Partly subsumed by #2 — once sleeping bots can actually die, the storm will thin the
field on its own. But the endgame wake threshold (`brAlive <= 10`) still lets ten
fighters sit in separate corners of a 9000px world while a tiny final zone ticks.

**Action:** keep the storm as the primary pressure, and add a final-circle pull —
when `brZoneState === 'final'` (or ≤5 alive), warp everyone still outside the ring to
the ring edge with a visible telegraph, rather than teleporting on a player-count
trigger that reads as arbitrary.

---

## 6. Battle Royale map — full redesign — **8/10** — ✅ BUILT (see `battle-royale-redesign.md`)

Raised from 4 to 8. `_makeBRArena()` builds a 9000x2800 shaft with **no `isFloor`
platform at all** — the map has no ground. One knockback is a 2400px uninterrupted
fall to death. That is a fairness bug, not a polish item.

Replacement designed in full in **[battle-royale-redesign.md](battle-royale-redesign.md)**:
a 12000px horizontal world with a continuous floor, composed of base-game arena
landmarks (plains/city/desert connective tissue; cave, volcano, ruins, colosseum as
dangerous high-loot destinations), risk-tiered loot rarity, and a fists-only
(`WEAPONS.combat`) start with the class chosen at the menu.

---

## 7. No automated validation of story enemy data — **5/10**

`tools/audit/check.js` (in `npm run check`) doesn't look at story enemy defs at all.
I ran an ad-hoc scan of all 186 chapters / 325 enemy defs:

- ✅ every `classKey` and `weaponKey` resolves against `CLASSES` / `WEAPONS`
  (the old `'tank'` / `'assassin'` silent-bail class of bug has not come back)
- ✅ every `aiDiff` is a handled string tier (`easy`/`medium`/`hard`/`expert`) —
  no numeric values left, so the `8.5`-falls-through-to-easy bug is gone
- ⚠️ **259 of 325** enemy defs carry no explicit `health:` — they inherit class
  defaults plus `_storyScaleEnemyUnit`. Not wrong, but it means "correct HP" is
  emergent, not authored, and can't be reviewed by reading the chapter files
- ⚠️ 28 defs have no `name:`

**Action:** add a story-data rule to the audit tool (valid keys, HP sanity bands,
enemies-per-chapter ranges, missing names), so this stops being a manual read-through.

---

## Suggested order

1. **#2** — BR is unwinnable; one bug, contained fix.
2. **#3** — BR strobing; accessibility, fix alongside #2 since both are BR-wide.
3. **#1** — Creator parity; small, surgical.
4. **#4** — story clear-gating; the largest change, touches 186 chapters' data.
5. **#7** — audit rule, locks in #1 and #4.
6. **#5**, then **#6** — BR polish once the mode is playable.
