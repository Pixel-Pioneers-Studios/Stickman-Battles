# Handoff — Sovereign fairness pass (July 28–29 2026)

Everything below is **committed and pushed** as `460016c` on `main`. `npm run check` is
clean (1 pre-existing warning: the lava arena has no `isFloor` platform, which is accepted
by design). All of it is **headless-verified in Chrome and none of it is playtested by a
human** — that is the single most important thing for the next session to fix.

## The framing decision that drives everything

**Sovereign is treated as essentially a player.** He does *not* get boss-tier resistances.
This was decided explicitly this session and it overrides the older instinct to give him
boss-style protections:

- He keeps `isBoss = false`, so he takes **100%** of a player's Conviction hazard damage
  where Boss and TrueForm take 35% (`_dealDomainDamage`, smb-domain.js). Deliberate — do
  not "fix" this.
- His speed advantage stays: `moveSpd` caps at 6.5 (smb-smk2-class.js ~3056) against the
  player's 5.2 (smb-input.js:359). The user reviewed this and called it fair.

## What shipped

### 1. Sovereign has a Domain Expansion — Absolute Dominion

He had none and *structurally could not*: `Fighter.activateSuper` and
`DomainManager.triggerExpansion` both required `charClass && charClass !== 'none'`, and
`SovereignMK2` never goes through `applyClass`, so it keeps the `Fighter` default
`charClass = 'none'`. His `_domainSuperCount` had been incrementing forever and firing
nothing.

- `DOMAIN_DEFS.sovereign` — two `null_wall` hazards bounding a corridor that re-centres on
  him and closes from 400px to 155px half-width over the 25s. Contact shoves **inward
  only**, so the walls confine but can never ring a target out. Power buff, plus a forced
  `_convictionPassive` of sword slashes (nullblade has no entry in `_PASSIVE_CDS` or the
  weapon-Conviction table, so without that override the domain would fire nothing).
- Reached through `DomainManager.domainKeyOf(f)` = `f._domainKey || f.charClass`, with
  `SovereignMK2` setting `_domainKey = 'sovereign'`. Giving him a real `charClass` was
  rejected — it pulls in `CLASSES` / `CLASS_AFFINITY` lookups and class rendering.
- `_convertOpening` now also opens its super window on `domainPush`
  (`_domainSuperCount >= 3`) because he was hoarding supers and would never reach five.
- "CONVICTION" is hard-coded in both the activation announcement and the rising speech
  bubble; both branch to "DOMAIN EXPANSION" for the sovereign key, since Conviction is
  the class-bearer name and he is not a bearer.

### 2. Domain economy + clash handling

- **Supers spent inside your own domain no longer count** toward the next one
  (`DomainManager.ownsDomain()` gates the increment in `activateSuper`). Domain hazards
  call `dealDamage(owner, …)` with the owner as attacker, so a live domain was charging
  its owner's meter toward its own successor.
- **Clashing domains coexist** — `_activateDomain` only removes the *same* owner's domain.
  Verified: two ran simultaneously for ~10s with both HUD bars and hazard sets live.
  Hardened for it: stacked bgTints past the first draw at 0.45 alpha (two at full stacked
  to near-black), the rising tint read `r.fighter.charClass` and so never drew for
  Sovereign, and the 15 per-class `CinCam.restore()` sites now route through
  `_releaseDomainCin(f)`, which no-ops unless that fighter owns `_domainCinOwner`.
- **Unchanged by choice:** `_domainSuperCount` resets on death, in *both* `Fighter.reset()`
  and `DomainManager.onFighterDied()`. So the real cost is five supers **on one life**.
  This contradicts the comment two lines above it in `Fighter.reset()` saying supers
  intentionally carry over, so it is probably an accident — but the user judged it a fair
  skill gate and kept it. Sovereign is bound by the same rule.

### 3. Null Anchor is no longer free

Replay analysis found this was the real reason he almost never ringed out. It fired
**3 times** in one match, snapping him back from x −87 / 1031 / −219 — the same territory
as the player's five death positions — at **no cost** on a 5s cooldown. Without it the
ringout tally was 4-to-5, essentially even.

Now: requires `superMeter >= 50`, **wipes the whole bar**, sits on a **3600-frame (60s)**
cooldown that is deliberately **not** reset on death, and calls
`queueAnnouncement('NULL ANCHOR — SUPER SPENT')` so the teleport reads as a mechanic.
Verified headless: empty meter = no save; full meter = save + bar wiped + cd 3585;
refilled meter inside the cooldown = he dies.

### 4. Item seeking actually decides now

Old gate `item && d > weaponRange + 32 && !t.attackTimer` was never true in suffocate
pressure, where he closes distance himself — dead code on his own arena. Replaced with a
value-scaled break-off distance, a 24-frame `_itemRunTimer` commitment (he was oscillating
and reaching neither), a swing check that only blocks when the swing can actually reach,
and `_selectMapResource`'s 460px cull raised to 900 (it was under half the arena).

**Be honest about the result:** a 3-run A/B (150s each) showed **pickup volume unchanged,
15 vs 15** — he walks over items incidentally either way. What changed is quality: curses
fell from 6/15 (40%) of his haul to 2/15 (13%). n=3 per arm; suggestive, not conclusive.
Do not claim this makes him collect *more*.

## Start here next session

1. **Playtest a full Sovereign match.** Nothing here has been played by a human. Watch for:
   does Absolute Dominion's corridor feel oppressive or trivial (`wallStart` / `wallEnd` /
   `wallDamage` in `DOMAIN_DEFS.sovereign` are the knobs); does the Null Anchor
   announcement actually land in the moment; does he visibly break off for pickups.
2. **Whether Null Anchor is now too weak.** The user's closing note was that the match
   would have played out differently under the new rules, so he might bank meter and save
   himself elsewhere — the "one save instead of three" estimate is a ceiling, not a
   prediction. Judge it live, not from the old replay.
3. **Deferred, low priority:** giving `isEdgeDanger` a mistake rate. Every SMK2 movement
   branch is wrapped in `!this.isEdgeDanger(dir)` so he never *walks* off a ledge, and he
   has no mistake rate on that perception the way he does on reactions
   (`_reactionMistakeRate`). This was originally pitched as the ringout fix and it was the
   **wrong diagnosis** — Null Anchor was the mechanism. Only revisit if he still feels
   inhuman near ledges after playtesting.

## Replay analysis technique (reusable)

`.smbreplay` files are plain JSON and carry far more than playback: `meta.tally`, `events`
of type `dmg`/`ko`/`stock`/`respawn`, and `frames` sampled at `recordEveryN` with full
per-fighter state including `sm` (super meter), `cls`, `stn`, `rag`, `atk`, `sh`, and
x/y/vx/vy.

- **Super fires:** `sm` dropping from >=60 to <10 between consecutive frames.
- **Domain window:** the owner floats — `y < 150`, `|vx| < 0.01`, `inv` set — for ~100
  recorded frames (300 game frames at `recordEveryN: 3`).
- **Null Anchor saves:** y snaps up >60px from `y > 470` without `lives` changing, landing
  at y≈374 (`floor.y - h - 2`). **Exclude frames within ~6 of a `respawn` event** or normal
  respawns get counted as saves.

Findings from `smb_replay_sovereign_2026-07-28.smbreplay` (committed at repo root), which
is the reference match for all of the above:

- 19 supers each; the player got **one** domain — direct proof of the reset-on-death rule.
- Damage was near-even overall (1989 vs 2065), but excluding the domain window entirely it
  was **his 1948 to the player's 1749** — he out-damages the player by ~11% in the raw
  fight, despite a lower per-hit average. Actual domain hazard chip was only ~120–170 of
  the player's 2065.
- **The domain's power is denial, not damage.** His output fell from 5.5 dmg/s to 1.37
  dmg/s for the 30s it was up. If domains ever need tuning, the lever is **duration**, not
  hazard damage.
- Control time was 2:1 — the player was stunned 24.7% + ragdolled 11.0% of frames against
  his 13.3% + 5.9%. The anti-lock ceiling (`_LOCK_CEIL = 105`) is working; no single lock
  exceeded 3s. It is hit volume, not stun-locking.

## Test harnesses

Written to the session scratchpad, not the repo — recreate from
`tools/headless-capture.js` if needed. They boot the real game through
`startGame()` into `gameMode = 'sovereign'`, drive the human as a hard bot, then
manipulate globals by **bare name** inside `page.evaluate` (lexical `let` globals are not
`window` properties). Instrumenting `applyMapPerk` page-side is how pickups were
attributed per fighter.
