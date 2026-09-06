# Saga Split — one codebase, three standalone games

**Status:** all content and engine work is done and verified. The game is **not**
three games yet — it ships as one until three deploys exist, which is a set of
decisions (store listings, sitelock hosts, manual pushes), not code.

| | |
|---|---|
| **Done** | Phases 1–7 — the whole engine side and the cold opens |
| **Remaining** | **Shipping only** (deploy — decisions, no code) |
| **Default** | `ACTIVE_SAGA = 'full'`, so the live game is unchanged |
| **Committed** | No. Everything is uncommitted. |

Start at [What's left](#whats-left) if you are picking this up to finish it.
Read [Landmines](#landmines) before touching any of it.

---

## The goal

Split the game the way God of War split Greek from Norse — **sagas, not
episodes**. The distinction is the whole design:

| | Episodes | Sagas (what this is) |
|---|---|---|
| Ending | Cliffhanger into the next part | Antagonist resolved, story closed |
| Entry | Must play part 1 first | Start cold, lose nothing |
| Prior game | Prerequisite | Texture — the Blades in the basement |
| Protagonist | Continues mid-arc | Returns changed, re-established from zero |

## The three sagas

Boundaries are **arc ids**, never chapter numbers — see [Landmines](#landmines).

| Saga | Title | Arcs | Chapters | N |
|---|---|---|---|---|
| `saga1` | The Fragment | `arc0-0` → `arc3-calix` | 0–69 | 70 |
| `saga2` | The Multiverse War | `arc5-damnation` → `arc5-1` | 70–150 | 81 |
| `saga3` | The Substrate | `arc5-bridge` → `arc-vm-fight` | 151–185 | 35 |

> Chapter numbers in this table are **derived output, not configuration** — the
> registry has grown from 184 to 186 since the split was designed and the bounds
> absorbed it with no edit, which is the arc-keying invariant paying for itself.
> Re-derive them with `activeSagaRange()`; never hand-copy them into code.

**Saga I — The Fragment.** An ordinary man learns what he carries, and that 94
carried it before him and none survived. Antagonist is Axiom's *system* —
collectors, the fracture network, the Architects.

**Saga II — The Multiverse War.** Antagonist is Axiom himself. Damnation, the
Fallen God, four companion worlds, Veran's death at ch. 124, Creator's domain,
True Form. Ends on the saving moment.

**Saga III — The Substrate.** Opens on the companion arc — Axiom fighting
*beside* Kael. Then God, Absolute Axiom, Awakened Sovereign, the reckonings, and
ch. 185 "What Cannot Be Erased."

**Why the saga2/saga3 boundary is mid-act.** It falls *inside* Act VIII: the
companion arc (`arc5-bridge`, ch. 151–154) is Saga III's cold open, not Saga II's
denouement. That is the entire reason bounds are arc-level and not act-level.

**Why these three and not others.** Per `docs/canon.md`'s own act table the story
is one **escalation ladder** — collectors → Architects → Creator → True Form →
God → Absolute Axiom → Void Mind. Every antagonist exists to reveal a bigger one,
and a ladder does not cut into sagas because every rung ends on "there is
something above this." Scanning every chapter, exactly one point *concludes*
rather than escalates: **the saving moment at the end of `arc5-1`** (ch. 150 today), where the fracture system
is dismantled and Axiom is freed rather than killed. Saga I had no ending at all
until Phase 3 wrote one.

---

## Architecture

**One repo, one engine, three builds.** The split is a content-boundary filter,
not a fork. Rejected forking because all three sagas share the boss, TrueForm,
Paradox, cinematic, finisher and rendering systems — three copies means every fix
lands three times or rots in two. This codebase has already been bitten by that
inside a *single* repo (the hazard-perception whitelist that existed in two
lists that drifted apart, which is why Sovereign could not see the Electric Staff
orb).

### The saga layer

`js/story/smb-saga-structure.js` — loads **after** `smb-story-finalize.js`,
because it needs the `chapterRange` values that `_expandStoryChaptersInPlace()`
rebuilds at load time.

```js
const ACTIVE_SAGA = 'full';   // 'full' | 'saga1' | 'saga2' | 'saga3'
```

`'full'` makes every helper report the whole story, so the shipped game is
behaviourally identical to before the layer existed. **It never mutates
`STORY_ACT_STRUCTURE`** — saga act lists are a derived *view*.

| Helper | Returns |
|---|---|
| `sagaIsFullBuild()` | is this the combined game |
| `sagaChapterRange(id)` / `activeSagaRange()` | `[lo, hi]` post-expansion |
| `activeSagaFinalChapterId()` | the id this build ends on |
| `isChapterInActiveSaga(i)` | membership test |
| `sagaForChapter(i)` | which saga owns a chapter |
| `sagaActView(id)` / `activeSagaActView()` | acts trimmed to the saga, renumbered per saga |
| `sagaClampChapter(i)` | clamp a save pointer into this build |
| `sagaArcInActive(arc)` / `sagaFirstArc()` | arc membership / this build's opening arc |
| `activeSagaPowerBaseline()` | per-saga power ramp start (default 1.0) |
| `sagaCarryForward(defeated)` | which **earlier** sagas a save completed |

Acts on a saga boundary are trimmed to their in-saga arcs and **renumbered per
saga** (Saga III opens on "Act I", not "Act IX"). `actLabels` on a saga def
overrides a boundary act's name — Act VIII reads "The Aftermath" in Saga III and
"True Form" in Saga II.

### Other mechanisms added

- **`sagaFinaleText`** on a chapter — used by `_showStory2Victory` *instead of*
  `postText`, but only when that chapter ends the active saga. Lets one chapter
  read as a transition in the full game and an ending in a saga build.
- **`_storyRecomputePowerLevel()`** in `smb-story-engine-events.js` — derives
  `playerPowerLevel` from the in-saga cleared count rather than incrementing.
- **`miniBoss: 'forestBeast' | 'yeti'`** on a chapter (+ optional
  `miniBossHealth`, `miniBossName`) — from the pacing pass, see
  [Appendix](#appendix--pacing-balance-pass).

---

## Invariants

Things a future session must not break:

1. **`ACTIVE_SAGA = 'full'` is the shipped default.** Every saga helper must
   no-op on `'full'`. If a change makes the full game behave differently, it is
   wrong.
2. **Never key on chapter numbers.** Use arc ids, resolved after expansion.
3. **Never mutate `STORY_ACT_STRUCTURE`.** Saga views are derived.
4. **Never mutate `_story2.chapter` to fit a build.** `sagaClampChapter` clamps
   the *view*; the save must survive a build switch.
5. **Carry-forward gates nothing.** `sagaCarryForward()` is recognition only. If
   anything in an unlock path ever reads it, that is a bug.
6. **The registry stays contiguous 0–183.** Verify after any chapter work.

---

## What's done

**Phase 1 — saga data model.** The layer above.

**Phase 2 — scoped completion, progress, level select.** Progress bar and act
pager in `_renderChapterList`; `_lastFightId` in `story2OnMatchEnd`;
`_finalChapterId2` in `_completeChapter2`; `_finalChapterId` in
`_showStory2Victory`. Plus three per-saga achievements (`saga1_complete` …),
awarded on boundary crossing rather than only at the final chapter.

**Phase 3 — Saga I's ending.** The original plan said "Kael breaks the collection
apparatus," which **contradicts canon** — the fracture system survives to ch. 142.
Scoped down to something that *does* end permanently: **the lab**. ch. 69's own
dialogue already establishes it ran "eighteen months of structured trials on
fragment-domain interactions" with Calix as a subject, and ch. 67 establishes
nineteen listed subjects against seventeen cells. Implemented by **converting
ch. 69**, not inserting — registry stays contiguous, no save migration. The lab
burns in the full build too (it strengthens the combined story); only the closing
text differs, via `sagaFinaleText`. Theme: *"I am not the ninety-fifth of
anything"* — earned by going back for the facility, not by out-powering Axiom,
which the text says outright he cannot yet do.

**Phase 5 — per-saga power curve.** `playerPowerLevel` was derived from the
**global** cleared count, so a Saga III build opened with a carried save sat at
the 3.0 cap. Now saga-scoped and idempotent.

**Phase 6 — making a saga build playable.** Three separate blockers, each fatal:
`locked = !arcUnlocked || i > cur` with `_story2.chapter` defaulting to 0 locked
every tile; `_isArcUnlocked` hard-coded the *story's* first arc as the only free
one; and the `arc4mv-*` gate required `SHIP.built` when every ship part is awarded
by saga1 chapters. Plus carry-forward recognition.

**Phase 7 — three builds from one repo.** See [Shipping](#shipping-the-three-games).

---

## What's left

### Phase 4 — cold opens — **DONE**

Each saga now opens on a chapter that establishes its own premise. "Fragment" and
"fracture system" are never load-bearing vocabulary in the first minutes of any
build; prior-saga knowledge is texture, never a prerequisite.

**Mechanism — `sagaColdOpen`.** A chapter carries an optional line array that is
prepended to its `narrative` **only when that chapter opens the active saga**. It
is the deliberate mirror of Phase 3's `sagaFinaleText`, so one chapter can read as
a mid-story beat in the combined game and as an opening in a saga build.

| Piece | Where |
|---|---|
| `_sagaFirstId`, `_isSagaOpener`, `_sagaChapterNarrative` | `js/story/smb-story-engine-flow.js` |
| Applied on all three narrative paths (branch / `noFight` / normal) | same file |
| Field preserved through expansion | `_phaseToChapter`, `smb-story-engine-data.js` |

**`_isSagaOpener` needs BOTH tests, and this is a real trap.** `id <= firstId`
alone is true for *every earlier saga's* opener — ch. 70 qualifies on a saga3
build. Those chapters are out of range and unreachable today, so the bug would
only surface the day one became reachable. The membership test
(`isChapterInActiveSaga`) is what makes it mean "the chapter this build starts
on". Verified: each build fires exactly its own opener, `full` and `saga1` fire
none.

**Saga II — ch. 70 `The Weight of What's Coming`.** The hard one: it opened mid-
Damnation with no re-establishment at all. The cold open runs before the existing
first line and lands the four missing pieces — Kael as an ordinary man a year ago,
the thing in his chest, the ninety-four before him, and a built machinery someone
is still running — then hands off to the authored `'You step through the dimension
wall.'` It never names the fragment; the collectors' word for it is described
rather than defined.

**Saga III — ch. 151 `The Silence After`.** The companion arc was already a strong
re-establishing opener, but assumed you watched True Form resolve one chapter
earlier. The cold open makes the *relationship* legible without the fight that
produced it: you went in to kill him, you didn't, you took the thing off him, and
what walked out beside you was a man. It then flows into the authored `'It was
quiet.'`

**Saga I needed nothing** — it is the original opening.

**The Tuesday prologue is a shared asset, not a conflict.** `maybePlayTuesday-
Prologue()` gates on `smb_tuesday_seen`, not on chapter or saga, so it plays once
on the first Story open of *every* build. In saga2 and saga3 it lands as an origin
cold open immediately before the chapter cold open, and the two dovetail rather
than repeat. Left as is deliberately.

**Also fixed: the story modal advertised the wrong size.** `.story-modal-subtitle`
is authored in `index.html` as "ten acts to the truth" — correct for the combined
build, wrong for every saga build (three acts each). A newcomer opening a
standalone saga must not be told the story is three times the size it is. Now
relabelled at runtime from `activeSagaActView().length` in `smb-story-config.js`;
the full build keeps its authored copy verbatim.

No chapters were inserted. The registry stays contiguous and **no save migration
is required.**

### Shipping the three games

Everything here is a decision, not a code problem.

**Building.** `tools/package/build-crazygames.sh` takes an optional saga:

```bash
bash tools/package/build-crazygames.sh          # full game (default)
bash tools/package/build-crazygames.sh saga1    # Stickman Evolution: The Fragment
bash tools/package/build-crazygames.sh saga2    # Stickman Evolution: The Multiverse War
bash tools/package/build-crazygames.sh saga3    # Stickman Evolution: The Substrate
```

It stamps `ACTIVE_SAGA` and rewrites the title / OG / schema metadata and the
sitelock lock screen **in the staged copy only**. The repo is never modified, so
a fix lands once and every listing gets it on the next deploy. `full` is the
source's own default and is left unstamped. The stamp is verified with a `grep`
that fails the build rather than shipping an unstamped bundle. Output is
`dist/`, which is gitignored.

Verified — each `dist/` stage served in a browser, zero page errors:

| Build | Chapters | Final id | Playable on fresh save | Power on carried save |
|---|---|---|---|---|
| full | 186 | 185 | 1 (ch. 0) | 3.0 |
| saga1 | 70 | 69 | 1 (ch. 0) | — |
| saga2 | 81 | **150** | 1 (ch. 70) | — |
| saga3 | 35 | 185 | 1 (ch. 151) | 1.0 |

Re-verified after the Phase 4 pass by serving `dist/saga2-*` and `dist/saga3-*`
and driving them in a real browser: each build's cold open renders on its own
first chapter with the correct act view (`Act I — …`) and subtitle, pages through
into the authored narrative, and reports zero page errors. The `full` build was
re-checked in the same pass and is byte-identical in behaviour — no opener fires,
both carrier chapters return their base narrative unchanged.

**Before three listings can go live:**

1. **`js/smb-sitelock.js` allowlists hosts.** Any new deploy domain must be added
   there *first* or that deploy shows the lock screen instead of the game.
   Current list: Render, CrazyGames (portal + CDN), itch.io/itch.zone/hwcdn,
   Newgrounds/ungrounded, Game Jolt.
2. **Render does not auto-deploy.** Each build is a manual push.
3. **Store art.** `images/store/` is uploaded through the portal dashboard and is
   excluded from the bundle. Each saga listing needs its own cover set.
4. **Save isolation.** Each deploy is its own origin, so localStorage does not
   cross between builds. That is why `sagaCarryForward()` reads a save that
   *happens* to be present rather than assuming one — cross-build carry-forward
   needs a shared key if it is ever wanted for real.
5. **Decide the store names.** Currently "Stickman Evolution: The Fragment" /
   "The Multiverse War" / "The Substrate", set in the build script's `case`.

**Open decision:** does the full 186-chapter build stay published alongside the
three, or is it retired once they exist? Nothing in the code assumes either.

---

## Landmines

Hard-won; do not rediscover these.

- **`_expandStoryChaptersInPlace()` rewrites every `chapterRange`** to expanded
  indices. It is currently *count-preserving* (186 → 186) because every chapter
  hits the "stay intact" branch — but adding one plain-duel chapter re-enables
  real expansion. It is **not** a pure no-op: some chapters still pass through
  `_phaseToChapter` and gain `_origId`. **Key on arc ids, never chapter numbers.**
- **`isEpilogue` is a "no-fight coda" flag, not an end marker.** True on ch. 13,
  16, 84, 147, 183. Story completion once fired on ch. 13 because of this. Every
  saga-end gate keys on a resolved final chapter id.
- **`smb-story-engine-events.js` runs its power-level restore in an IIFE at
  load — before `smb-saga-structure.js` exists.** It falls back to the global
  count, and the saga file re-runs it at the end of its own load. Do not "fix"
  the fallback by reordering scripts; the saga layer genuinely needs the expanded
  ranges that finalize produces.
- **The explore world finishes building several frames after `startGame()`.** A
  fixed-delay hook fires too early and silently no-ops — every precondition reads
  fine when probed later. `_storySpawnMiniBoss` retries on a 120 ms × 20 budget
  and bails if `_activeStory2Chapter` changed.
- **`aiDiff` is compared as a string** throughout `smb-fighter.js`. A numeric
  value matches no branch and falls through to each ternary's last value — which
  for `tacticW` (line ~3140) is the *easy*-tier `0.18`, because `expert` is
  listed first. See the appendix.
- **`PROTOTYPE_WAVE_CHAPTERS` (47, 52, 127) in `_storyBuildPhases` is dead
  code** — it gates on `ch._origId !== undefined`, but those are `walkFight`
  chapters that stay intact through expansion and never receive `_origId`. Every
  chapter's `.phases` collapses to a single `mini_boss` entry.
- **A saga-boundary test needs a membership test, not just a comparison.** `id <=
  activeSagaFirstChapterId()` is true for every EARLIER saga's opener, and
  `id >= activeSagaFinalChapterId()` has the mirror hazard for later ones. Both
  are currently masked by the offending chapters being out of range and therefore
  unreachable — the bug appears the day one is reachable. Pair every such
  comparison with `isChapterInActiveSaga()`. See `_isSagaOpener`.
- **`type: 'branch'` chapters carry only a `narrative` array** — pure text, no
  fight, no exploration. 34 of them, and 23 of Saga III's 35.

---

## Verification recipes

Re-run these after any change here.

**Registry contiguity** (must print `total 186 range 0-185 dups 0 gaps 0`):

```bash
node -e '
const fs=require("fs"),path=require("path");
function walk(d){let o=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?o=o.concat(walk(p)):e.name.endsWith(".js")&&o.push(p);}return o;}
let ids=[];for(const f of walk("js/story/acts")){for(const m of fs.readFileSync(f,"utf8").matchAll(/^\s*id:\s*(\d+),/gm))ids.push(+m[1]);}
ids.sort((a,b)=>a-b);const dup=[...new Set(ids.filter((v,i)=>ids[i+1]===v))];let g=[];
for(let i=0;i<=ids.at(-1);i++)if(!ids.includes(i))g.push(i);
console.log("total",ids.length,"range",ids[0]+"-"+ids.at(-1),"dups",dup.length,"gaps",g.length);'
```

**Per-build smoke test.** Flip `ACTIVE_SAGA`, serve the repo (or a `dist/`
stage), and in the console check: `activeSagaRange()`, `activeSagaChapterCount()`,
`_sagaFinalId()`, `activeSagaActView().map(a=>a.label)`, then set
`_story2.defeated=[]; _story2.chapter=0;` and call `_renderChapterList()` — there
must be **exactly one** non-`lvl-locked` tile. **Set `ACTIVE_SAGA` back to
`'full'` afterwards.**

**Lint / syntax:** `npm run check`. Known pre-existing failures that are not
yours: `screenShakeIntensity` undefined in engine-events/engine-flow, a duplicate
`style` key in `act1-arc1.js` and `act2-arc1.js`, plus findings in `server.js`
and `tools/`.

---

## Appendix — pacing balance pass

Measured across every chapter before touching anything.

**Findings.** Saga I had **no boss or mini-boss entity at all** — the first in the
game was ch. 70 — though its 4–6 combat chapters per 10 were the most *even*
stretch in the game. Saga II sags at ch. 100–119 (2/10 combat across twenty
chapters), exactly the companion multiverse tour. Saga III has two 11-chapter
zero-combat stretches (149–159, 168–178); 23 of its 35 chapters are pure
`narrative` text, ~6,000 words. Boss spacing ran 70, 80, then a **61-chapter
gap**, then four bosses in eight chapters.

**`miniBoss` mechanism.** A chapter declares `miniBoss: 'forestBeast' | 'yeti'`.
`_storySpawnMiniBoss()` in `smb-story-engine-flow.js` reuses the Director's
existing spawners from `smb-data-mapperks.js`, which push into `minions[]` and
pick their own target. Hooked at both launch sites — the `isWorldBoss` site in
flow, and the post-`startGame()` block in `smb-story-engine-explore.js` that
walkFight and exploration chapters land in. No HP scaling needed: ForestBeast is
300, Yeti 200, both already authored mini-boss tier.

**Changes.** ch. 22 hard→expert; ch. 39 `forestBeast`; ch. 42 `yeti`; ch. 69 both
enemies hard→expert and lives 3→2; ch. 179 and ch. 182 `aiDiff` fixed.

**Bug: numeric `aiDiff` de-tuned the game's last two fights.** ch. 179 (The
Trial) was `8.5` and ch. 182 (the final Void Mind fight) was `9` — the only two
numeric values in the whole registry. Numbers match no string branch, so speed,
aggression and miss-chance landed on expert while `tacticW` fell to the
easy-tier `0.18`, **7.8× below expert**. Both now `'expert'`.

**Result.** Peaks (boss entity, creature mini-boss, or expert on ≤2 lives):
saga1 **14**, saga2 **23**, saga3 **6**.

**Still open, all narrative:** Saga I ch. 0–21 has no peak (deliberate
onboarding); Saga III's 149–159 and 168–178 remain empty, with eight Reckonings
immediately before the final fight spending built tension on exposition; Saga
II's 100–119 sag is filler between companion duels, not a difficulty problem.

---

## Related

- `docs/TRIALS_DESIGN.md` — the Trials concept, unbuilt. Its recommended
  placement (ch. 100–119) is the Saga II sag above.
- `docs/canon.md` — POWER HIERARCHY, STORY STRUCTURE, ARCHITECT FATES.
