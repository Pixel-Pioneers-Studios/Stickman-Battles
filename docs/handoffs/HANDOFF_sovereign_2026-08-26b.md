# Handoff — Sovereign, Aug 26 2026 (session 2)

Continues `docs/HANDOFF_sovereign_2026-08-26.md`. That handoff's headline
recommendation — chase the whiff-guard's vertical gate — **is wrong for the real
Sovereign fight**, and this session replaces it.

## Short version

1. The whiff-guard is **not** the problem in a live Sovereign match. At the moment
   he actually swings, his median vertical gap is 36–54px and only 31–48% of
   swings exceed the 60 gate. The guard is filtering correctly. The Aug-26
   finding came from possession trials against a boss and does not transfer.
2. **He wins the neutral game and loses anyway.** On live frames he out-swings,
   out-blocks, is stunned 9 points less and knocked down at half the rate — and
   loses 10–6. The entire gap is conversion: 8.0 damage per swing against the
   player's 12.6.
3. Root cause: **he was locked to a strictly-worse loadout for the whole match
   and had no way to change it.** `nullblade` is `damage: 15`; the starter
   `sword` is 16. His `charClass` was `'none'`, costing him class perks, class
   damage, and — through `_pickFinisher` — the finisher authored for him.
4. Fixed this session: loadout counter-picking, the finisher lookup, and the
   jump-economy bypasses. All three are browser-verified.

## 1. Replay evidence

Five `.smbreplay` recordings, `winner: "P1"` in every one, spanning v3.3.0 to
v4.0.25 — four months and five versions without a win.

Measured on **live frames only** (excluding finisher-lock and death frames — this
matters, see §2, because a third of his frames were neither):

| Aug 23, 176s live | Sovereign | Player |
|---|---|---|
| attacking | 20.5% | 17.8% |
| swings thrown | 147 | 138 |
| stunned | **14.7%** | **24.1%** |
| ragdolled | **3.9%** | **9.6%** |
| shielding | 7.6% | 1.3% |
| accuracy | 58% | 75% |
| damage per hit | 13.8 | 16.7 |
| **damage per swing** | **8.0** | **12.6** |

The player spends a quarter of the fight unable to act and still wins. Every
process metric favours Sovereign; only conversion does not.

Death profiles, reconstructed per life:

- Sovereign: 10/10 deaths at ~1 HP, 1 ringout. Pure attrition.
- Player, Aug 23: dies at 112, 36, 0, 0, 0, 0 — 4 of 6 reached the death plane.
- Player, Jul 28: 7 of 8 deaths were the death plane, at 102/94/32/67/76 HP.

The player throws away most of their lives to the environment unassisted and
still wins. Sovereign scored **1 ringout per match**; he has no edge game at all.

**Discard `smb_replay_sovereign_2026-07-30`.** The player held `mkgauntlet`
(`damage: 30, cooldown: 22`) plus megaknight — the admin/troll weapon the Aug-26
handoff says must never enter a measurement.

## 2. The finisher asymmetry (real, but not the loss cause)

`health = 1` + `invincible = 9999` is the finisher lock (`smb-finisher-engine.js`
sets it; `smb-combat.js:690` calls it). Every one of Sovereign's deaths is an
execution — 10/10, 10/10, 9/10 — for a flat 144 frames. The player: **zero, in
all three matches**, across 6, 8 and 2 deaths.

Root cause, now fixed: `_pickFinisher()` reads `WEAPON_FINISHERS[weaponKey]` and
`CLASS_FINISHERS[charClass]`. His finisher **was authored** — `CLASS_FINISHERS`
has a `nullblade` entry, VOID RECKONING — but it lives in the *class* table while
his `charClass` was `'none'`, and the guard reads `cKey !== 'none'`. Both lookups
missed. Meanwhile `triggerFinisher` carries an explicit `target.isSovereignMK2`
branch handing the player `FIN_HEROS_TRIUMPH` on every kill.

This is the same bug shape already patched in the domain system via `_domainKey`
(see the comment at `smb-smk2-class.js:79`). The finisher system never got the
equivalent.

**Measured caveat, stated honestly:** the player gains **0 super and 0 health**
during the lock — both fighters freeze. So the asymmetry costs him no tempo and
no life he was not already losing. It is a feel and fairness problem, not the
reason he loses. It did contaminate every naive per-frame stat, which is why the
table in §1 is computed on live frames only.

## 3. What was changed

Design frame, from the owner: **Sovereign is meant to read as a very strong
PLAYER, not a boss.** So he does not get boss flags, and the three anti-lockout
systems in `smb-combat.js:848–900` continue to apply to him — that is correct for
a player. What he was missing is what a strong player actually does: pick a kit.

### 3a. Loadout counter-picking — `js/smb-smk2-class.js`

`SMK2_LOADOUTS`: seven coherent (weapon, class) pairs. Three hard exclusions,
each measured:

- **ranged** (gun/bow, gunner/archer): 33 dealt/1k against katana's 244.
- **mkgauntlet/megaknight**: admin-only, hard-filtered out of `WEAPON_KEYS`.
- **shield/paladin**: no offence, and he already over-blocks at 7.6%.

Selection is an **epsilon-greedy bandit over measured damage-per-life**, seeded
with the replay-measured priors as one pseudo-observation, biased ±18% by
`_smk2CounterBonus` against what the player holds (light kits punish heavy
endlag; heavy kits out-range light). It re-picks in a `respawn()` override, so
ten lives is enough to converge on what works against *this* player.

`_applyLoadout` takes the class's **identity only**. `applyClass` overwrites
`maxHealth`/`health`/`classSpeedMult`, which would silently rebalance him, so his
live stat line is snapshotted and restored. Snapshot is taken **live, not from
the constructor** — startGame applies boosts post-construction, so a
constructor-time snapshot nerfed him on every respawn. That bug was introduced
and fixed within this session; the write-trace confirms the final version is
HP-neutral (150 → applyClass 115 → restored 150).

His opening kit is still `signature` (nullblade), applied in
`smb-menu-startcore.js` as a real loadout so life 1 also carries the class and
the finisher.

**Prior scale is computed, not guessed.** The priors are damage per 1000 frames;
a life is some unknown fraction of that. A fixed 0.4 guess seeded an untried kit
at ~98 while a tried one measured ~250, so the first kit that did well was never
challenged and he stopped counter-picking — observed in a live match, where he
never left `signature`. `_pickLoadout` now rescales the priors by the observed
damage-per-life mean, preserving their relative ordering without asserting an
absolute magnitude. After the fix he tries 4 distinct kits over 14 lives and
**drops `signature` after one life** when it under-earns.

### 3b. Finisher escape hatch — `js/smb-finisher-engine.js`

Six lines at the top of `_pickFinisher`: `attacker._finisherKey` resolves
directly against `CLASS_FINISHERS`, mirroring `_domainKey`. Verified: the
signature loadout now returns `class_nullblade` / **VOID RECKONING** (124f), and
the ronin loadout returns `katana` / IAIJUTSU (128f).

### 3c. Jump economy — `js/smb-smk2-class.js`

~30 paths in the class write `this.vy = -N` directly and only about half check
`onGround` or spend `canDoubleJump`. The unguarded ones are the triple-jump and
"he beat gravity" reports.

Fixed with a single choke point in `update()` alongside `_vetoVoidStep` and
`_vetoSkyClimb` — the idiom that file already uses, and for the reason
`_vetoVoidStep`'s own comment gives: auditing 30 sites has a large blast radius
and any path added later reintroduces the bug.

`_vetoExtraJump` does not fight the AI's intent. An unguarded launch **spends**
an available air jump; only a launch he cannot pay for is cancelled. That is
exactly the player's rule. Knockback (stun/ragdoll) is exempt and anything faster
than his hardest authored jump (−21) passes as a launcher/super/dash.

Behind `SMK2_TUNE.jumpEconomy` for A/B, matching the file's existing switches.

Verified, all 7 cases:

| case | result |
|---|---|
| airborne, air jump available | ALLOWED, jump consumed |
| airborne, no air jump | VETOED |
| airborne, 3rd jump attempt | VETOED |
| stunned (knockback) | ALLOWED |
| ragdolled (knockback) | ALLOWED |
| launcher/super (−26) | ALLOWED |
| grounded jump | ALLOWED |

## 4. Not a bug — pre-existing HP variance

Sovereign's `maxHealth` was observed at 150, 165 and 135 across matches. This is
`smb-data-mapperks-draw.js:17`, a map-perk pickup: `maxHealth + 15` (line 36 is
the −15). The Circuit arena has crates. Unrelated to this session's changes.

## 4b. Live verification

Full self-playing match, sword/warrior opponent at expert AI, Circuit arena:

- **Sovereign won 8 lives to 0**, 638 damage dealt against 468.
- Zero console errors across the whole match.
- HUD renders the class correctly ("NULL BLADE · BERSERKER"); limiter break,
  pressure and TYRANT staging all still fire.

**Do not read that as proof he now beats a human.** The opponent was an
expert-difficulty bot, not the player from the replays, and he only died twice —
which is why the bandit had no reason to switch kits in that match and why the
prior-scale bug in §3a went unnoticed until the forced-respawn test. It shows the
systems work end-to-end and break nothing. Whether the gap in §1 actually closes
is what `tools/sov-ab.js` needs to answer next.

## 5. Recommended next work

1. **Re-run `tools/sov-ab.js` against the loadout system**, not the dials. The
   dials measured a wash (Welch t = 0.18); weapon choice is eta² = 0.358. The
   bandit is the thing worth measuring now.
2. **Test whether his speed advantage is costing him.** He is up to 2x player
   speed and converts 58% of swings against the player's 75%. Pin him to 1.0x
   and re-measure damage-per-swing; if it rises, the "buff" is a nerf.
3. **Give him an edge game.** He scored 1 ringout per match while the player
   self-destructed 2–5 times. Nothing in the class pressures the ledge.
4. Untouched from Aug 25/26: `_getCounterStrategy()` fixed-priority lock-in,
   `_reactionMistakeRate()` still a flat `return 0` (`smb-smk2-class.js:2781`),
   `_oppMemory` only written on target switch.

## Files changed

| file | change |
|---|---|
| `js/smb-smk2-class.js` | `SMK2_LOADOUTS`, `_smk2CounterBonus`, `_pickLoadout`, `_applyLoadout`, `_recordLoadoutResult`, `respawn()` override, `_vetoExtraJump`, `SMK2_TUNE.jumpEconomy` |
| `js/smb-finisher-engine.js` | `_finisherKey` hatch in `_pickFinisher` |
| `js/smb-menu-startcore.js` | opening kit applied as a loadout |
| `index.html` | `?v=4.0.84` on the three files above |

`npm run check`: 70 errors before, 70 after — zero introduced. All three files
pass `node --check`. **Uncommitted.**
