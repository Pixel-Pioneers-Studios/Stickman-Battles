# Sovereign: The Adaptive Project

Running journal, started 2026-09-23. Newest entries are at the bottom. Append only;
when a finding is corrected, strike it through and say why rather than deleting it.

## Goal (the user's words)

> Make this AI truly adaptive and confirm that it will not lose badly to me (so must
> kill me at least 7 times minimum).

Working definitions:
- **Adaptive:** during a match, and across matches, he notices a specific habit of
  THIS player and changes what he does because of it. The change must show in
  behaviour, not only in internal dials.
- **Kill floor:** in a standard 10-stock human-vs-Sovereign match he takes at least 7
  of the player's stocks.

## Where we start (evidence, not memory)

Human matches, recomputed from ko/stock events:

| replay | player kit | his kit | he killed | player killed |
|---|---|---|---|---|
| 2026-09-21 (morning) | whip / Archer | ? | 10 | 6 |
| 2026-09-21 (1) | sword / Paladin | katana / Ronin | 8 | 10 |
| 2026-09-22 | spear / Gunner | sword / Ninja | 10 | 7 |

~~He clears the 7-kill floor in all three.~~ Corrected below: across the full replay
set he does NOT reliably clear it. The risk is regressing that while adding
adaptation, and the player getting better over time.

The 2026-09-22 match, analysed by thirds (script: scratchpad adapt.js):
- **No in-match adaptation was visible.** He was airborne 61/64/59% of the time.
  "Hit him while he's in the air" was the player's #1 opener in every third
  (11.5 / 13.8 / 8.4 per minute).
- Ground Spike's landing rate fell 81% → 44% by the last third (p=0.07). But every late
  in-range miss was the player pressing it while stunned or into his i-frames. It was
  not him dodging, and his time inside spike range did not change with the spike's
  readiness.
- **His guard collapsed.** Shield was up 1% of frames (2.1% of grounded frames), vs
  15.5% on 09-21. Close-swing guards went 8 → 5 → 0%. Suspected cause: the 09-21
  air-commitment changes (landing lag, ground-only shield). Under investigation.

## What history says works and what doesn't

Sources: memory files Aug 25 through Sep 22 and `docs/sovereign-lab-log.md`.

1. **His decisions are a priority cascade with no scorer.** `updateAI` is ~2000 lines
   where the first matching branch wins. A learned value can only enter as a VETO
   (measured null) or a post-hoc OVERRIDE of vx (measured harmful). `tacticChoice`
   lets a branch yield: shipped on design grounds, outcome null.
2. **The one learned behaviour that clearly worked was scoped to a single decision at a
   single choke point:** `inferAct` converts one swing into a guard (+0.065 stocks,
   t=2.80, replicated). `discovery` failed because it acted globally, yielding
   working branches to chase a discovery.
3. **Dials adapt but barely reach the fighter.** Cutting every dial by 80-90% had no
   measurable effect.
4. **The instruments lie in known ways.** Scenario bots never behaved like a human.
   Even with damage buffs they hit him at only ~0.5x a human's rate, and his win rate
   tracks how hard the opponent hits (r = -0.98). The replay-trained ghost copies
   style, not skill, and takes 4.5x a human's damage. Nothing below ~200 matches per
   arm is a result (`tools/sov-run.js`, run blocks in parallel).
5. **His airborne leak is old.** On Sep 10, 126 of 127 hits he took landed while he was
   airborne or within 0.6 s of landing. `_airApproachGuard` addresses jumping onto the
   player's platform, not being airborne in general.
6. **The dossier exists but only listens in his own fights.** `SovDossier`
   (js/smb-sov-dossier.js) persists what HE learned, keyed by the opponent's kit and
   archetype. It records nothing about the player's habits, and nothing from the
   player's other fights.

## Plan

1. Fix the guard collapse. (in progress)
2. Measure the player's real habits across every usable replay. (in progress)
3. **Build the instrument first:** a human-proxy opponent calibrated so that,
   against the CURRENT Sovereign, it reproduces the replay numbers (damage per 1k
   live frames each way, lockout %, airborne %, kill ratio). Without it, "won't lose
   badly to me" cannot be checked in the lab.
4. Build the habit engine:
   - **Player model:** situation → the player's action, collected in EVERY fight
     (story, bots, training) and persisted. This was the user's idea: the other bots
     scout for him.
   - **A small library of habit → counter pairs,** each a local, scoped behaviour at a
     choke point (the inferAct pattern, never a global yield).
   - **Gambler selection:** Thompson sampling over counters, seeded from the player
     model. Bets are small, time-boxed and dropped fast when they fail.
   - **Visible:** he says his reads; a pre-fight dossier.
5. Tests:
   - **Planted-habit bots:** does he find the habit, and in how many exchanges?
   - **Human proxy:** kills ≥ 7 of 10 in ≥ 90% of matches, and no worse than
     today's build.
   - The user's own match is the final check.

## Log

### 2026-09-23: habit engine design (draft, before the habit data is in)

New file `js/smb-sov-habits.js` (`SovHabits`), loaded before smb-smk2-class.js.

**Observation runs in EVERY fight, not just his.** A per-frame call from the game loop
watches each human fighter against whoever they are fighting (story enemy, versus
bot, Sovereign) and fills two tables, persisted to localStorage with decay:

- **A. Punish table, the player's answer to a posture.** For the player's OPPONENT
  posture P (`air_in` airborne and closing within 160px, `landing` ≤20f after
  touchdown, `committed` swinging or in endlag, `approach`, `idle_near`, `shield`),
  count exposure frames and hits the player lands, plus hits the opponent lands
  from that posture. That gives "hits per second you take for being in P against
  this player". It can be scouted by any bot, because it measures the player's
  punishing, not the bot's skill.
- **B. Action table, what the player does next.** Trigger → the player's action in
  the next window. Triggers: opponent closes in on the ground; opponent airborne and
  closing; the player just got hit; the player just landed; the player's ability is
  ready and the opponent is close; the player is at low HP; the player just landed
  a hit. Actions: jump, attack, ability, shield, retreat, approach, hold.

**Consumers, each scoped to one decision (the inferAct lesson):**
- **C1 Posture avoidance** (from A): a launch veto in `update()`, the same mechanism
  as `_vetoExtraJump`. A ground jump toward a player within ~200px is cancelled when
  a sampled value of `air_in` loses to a sampled value of staying grounded. Escape,
  recovery and hazard jumps are exempt. Against a player who never anti-airs he
  keeps jumping.
- **C2-C6 Predictive bets** (from B): anti-air when "you jump when I close in"; guard
  on your landing when "you attack as you land"; stay out of range while your ability
  is ready when "you fire it the moment I'm close"; guard after his combo ends when
  "you mash after getting hit"; chase when "you back off after landing a hit".
  Each bet is a short micro-policy (≤ ~40 frames), run as a new cascade branch
  AFTER the hazard reflexes and guaranteed punishes, so it never overrides safety or
  a sure punish.

**Gambler:** every counter is a contextual bandit arm {bet, don't}. It is priced by
the damage exchange in the 60 frames after the trigger, and chosen by Thompson
sampling. Priors come from the persisted tables, so scouting data makes his first
bet early. Priors are weak, so two or three observations can flip a decision. A bet
that fails is dropped quickly because the posterior moves.

**Visible:** the first time a counter flips to "bet" in a match, he says it
(`showBossDialogue`), e.g. "You jump when I come close."

### 2026-09-23: the full replay record (16 human replays, scratchpad human.js / perfile.js)

Stocks recomputed from ko events. Two aborted sessions (07-28, 27 s; 08-28, 31 s) are
excluded, which leaves 14 real matches:

| date | player kit | his weapon | he killed | player killed |
|---|---|---|---|---|
| 07-27 | kratos / electricstaff | nullblade | 8 | 10 |
| 07-29 | paladin / sword | nullblade | 8 | 10 |
| 07-30 | megaknight / mkgauntlet | nullblade | **2** | 10 |
| 09-02b | ninja / electricstaff | combat | 10 | 4 |
| 09-05 | summoner / sword | katana | 9 | 9 |
| 09-05(1) | thor / spear | hammer | **5** | 10 |
| 09-06 | thor / sword | scythe | **2** | 10 |
| 09-06(2) | thor / spear | nullblade | 8 | 10 |
| 09-06(3) | thor / spear | hammer | **2** | 10 |
| 09-07 | thor / sword | scythe | **4** | 10 |
| 09-10 | thor / sword | scythe | **4** | 10 |
| 09-21 | archer / whip | katana | 10 | 6 |
| 09-21(1) | paladin / sword | katana | 8 | 10 |
| 09-22 | gunner / spear | sword | 10 | 7 |

**The 7-kill floor is met in 8 of 14.** All six failures came while he carried
hammer, scythe or the nullblade vs a Torren (thor) or megaknight player. With katana,
sword or fists he met it every time (5/5). The builds differ across these dates, so
this is not a clean experiment. Still, loadout was the biggest factor the Aug 26 A/B
found (eta² 0.36), and it points the same way. **His weapon choice is part of the
kill-floor problem, not only his decisions.**

How the player opens him up (794 openers): he was airborne 54% of the time (6.5/min),
whiffed and got punished 16%, shielding 8%, backing off 8%, walking in 7%, landing 4%.
72% happen at under 75px. **The airborne leak is the single largest source of the
player's damage in every period, and it is his habit, not the player's.**

How he opens the player up (500 openers): the player was airborne 38%, whiffing 34%,
walking in 11%. He already converts the player's whiffs at twice the rate the player
converts his.

The player's habits, judged for reliability:
- **Almost never shields:** 4.0% of frames (per replay 1.1-12.9%), stable across every
  loadout. Reliable, read straight from `sh`.
- **Jumps when he closes in on the ground:** 35% within the window when he comes within
  100px (per replay 14-52%, every file n≥40). Reliable direction, noisy size.
- **Low HP → slightly more careful:** swing rate -27%, shield 3.4 → 6.0%. Small.
- **Max-range pokes:** 8% of swings from >150px. Depends on loadout.
- **"Retreats 79.5% after being hit" and "presses forward 57% after landing a hit": NOT
  TRUSTED.** Only one replay has inputs, so these were classified from movement.
  Knockback moves the victim away and the hitter forward whether they chose it or
  not. They need input-based re-measurement.

What this means for the design:
1. The biggest measured lever is C1 (stop jumping in against this player). His own
   habit is the player's main damage source.
2. The shield-never habit means a guard-baiting plan is worthless against this player.
   Straight pressure and strings are safe. Good: no work needed.
3. The jump-on-approach habit supports the anti-air bet (C2).
4. Loadout is a kill-floor lever, independent of adaptation. Check whether his current
   loadout picker still favours hammer/scythe.

### 2026-09-23: the "guard collapse" is not the problem

The guard agent found a real mechanism. None of his ~8 reactive shield branches check
`onGround`, so a guard he decides on while airborne is zeroed by the ground-only rule
in `_provisionShield`. In the sim that is 21% of his shield wants. Its fix (force a
fast-fall when he wants a shield in the air) raised the sim guard rate 5.9% → 6.9%.
Outcome was -0.13 stocks, inside noise. **Reverted:** it doesn't explain the size of
the drop, and it doesn't help.

His shield rate across every replay says why:

| period | shield % of frames | result |
|---|---|---|
| Jul 27 - Sep 2 (7 matches) | 0.0 - 7.6 | mixed |
| Sep 5 - Sep 10 (6 matches) | 7.6 - 12.8 | lost 5 of 6 (hammer / scythe) |
| Sep 21 morning | 0.5 | **won 10-6** |
| Sep 21 afternoon (inferAct's first match) | 16.6 | lost 8-10 |
| Sep 22 | 0.9 | **won 10-7** |

The 15.5% I used as the baseline was an outlier, the one match where inferAct
converted swings into guards. His two lowest-shield recent matches are his two wins.
**Guard rate does not track winning, so restoring it is not a goal.** Leftover
question for later: inferAct's conversions happen on his swing's first frame, often
airborne, so the ground-only rule now refuses most of them. That makes inferAct
mostly inert against humans. Decide deliberately, don't drift.

### 2026-09-23: human proxy v1 (tools/human-proxy.js, proxy-stats.js, proxy-calibrate.js)

Human targets pooled over 17 scoreable replays (`node tools/proxy-stats.js`):
damage into him 107.7 per 1k live frames, damage into the player 83.2, lockout 27.2%,
his airborne 65.9%. He takes 58% of the stocks lost, i.e. on average the player
out-trades him.

The v1 proxy (no damage multipliers; reaction delay 14f; searched 6 of 15 parameters)
vs the current Sovereign, n=150:

| stat | proxy | human |
|---|---|---|
| dmg into him /1k | 147 ± 3 | 108 |
| dmg into player /1k | 206 ± 3 | 83 |
| lockout % | 47 | 27 |
| his airborne % | 34 | 66 |
| ≥7 kills | 99% | 8 of 14 |

**Not usable yet.** It hits like a human but defends like a bot: it takes 2.5x the
damage and almost never jumps. Hypothesis: human defence IS mobility. The player is
airborne ~2/3 of every match, dodging by jumping out of and over swings, and that
airtime also pulls him into the air where the player anti-airs him. v2 adds an
evasion layer and puts both airborne % and damage-into-player into the objective.
The v1 99% ≥7-kill rate is a statement about a weak defender, not about the player.

Sim harness additions (`js/smb-smk2-training.js` `_runMatch`): `opts.lives`,
`opts.maxFrames`, `opts.sovKit` (pins his weapon/class), and `opts.record` (captures
replay-schema frames for proxy-stats.js).

### 2026-09-23: habit engine phase 1 built (C1, posture avoidance)

Files: `js/smb-sov-habits.js` (new, `SovHabits`); `js/smb-smk2-class.js`
(`updateAI` is now a thin wrapper: `_updateAICascade()` then `_habitGate()`);
`js/smb-smk2-data.js` (`SMK2_HABIT_AIR_LINES`); `js/smb-loop-core.js` (scouting: every
human is observed against their nearest non-Sovereign opponent every frame);
`js/smb-sov-scenarios.js` (test policies `anti_air_hawk`, `ground_brawler`). Flag:
`SMK2_TUNE.habitAir` (default on; off is verified fully inert).

- Useful fact: `Fighter.update` calls `updateAI()` BEFORE integrating vy
  (smb-fighter.js:~1728), so a gate placed right after the cascade can cancel a launch
  outright. No next-frame restore is needed.
- The human record persists in `localStorage['sov_habits_v1']` under
  'human:<account>'. Verified in a real 60 s sovereign match: 12 launches seen, 8
  vetoed, record written.
- The builder's own test (20 matches/arm) showed air openers taken 1.70 → 1.15 vs the
  hawk, flat vs the brawler, but veto rates 62% vs 56%, i.e. barely
  opponent-specific. **Its arms used different seeds, and n=20 is below the noise
  floor.** Replaced by `tools/sov-habit-ab.js`: matched seeds, parallel, `--carry=K`
  rematch mode where his ledger of that opponent persists, as it will with the
  player. Runs in ~1 min per 300 pairs.
- Caution: vs both scripted bots he is airborne only ~15% and wins ~4.3 of 5 stocks,
  so they exercise C1 weakly. The proxy is the real venue.

### 2026-09-23: human proxy v2 (mobility)

The player's own airborne share is 59.8%. Exposure table (share of time / hits per
1k frames): close-range air 17% / 15, close-range ground 10% / 5. **The player gets
hit about 3x more per frame while airborne and close than while grounded and
close.** Airtime is central to the player's exposure, both ways.

v2 added evade-jumps, double-jump escapes, fast-fall and air hops. The proxy is now
airborne ~58% (target 60) and pulls him up to ~55% (target 66). It still takes ~2.3x
the player's damage. Diagnosis: it relocates on a generic cue, while the player reads
WHICH attack is coming. v3 treats the proxy as an instrument: one calibrated `readRate`
(the fraction of his connecting attacks it anticipates and cleanly escapes), tuned
until damage into the proxy matches the player's 83/1k.

### 2026-09-23: C1 learns the opponent, but was aimed at the wrong launches

`tools/sov-habit-ab.js`, 300 matched pairs per scripted bot.

- **The decision adapts per opponent, clearly.** In rematch mode (the ledger of that
  bot carried over 30 matches), the veto rate climbs to 85-95% against
  `anti_air_hawk` and falls from 45% to ~2% against `ground_brawler`. This is the
  first mechanism in the project's history where a behavioural CHOICE measurably
  diverges by opponent through learning.
- **Outcomes don't move.** Vs the hawk: air openers taken 1.36 vs 1.41 (t=-0.6),
  airborne share unchanged. Vs the brawler, rematch mode: stocks -0.14 (t=-2.4),
  mostly the early rematches, where it still vetoed 30-45%.
- **Why:** the gate only saw ~2.5 launches per match. `tools/sov-air-sources.js`
  tags each airborne stint with its cause. Vs the human proxy (40 matches):

| stint cause | share of his airtime | share of openers he took |
|---|---|---|
| `elevation_pursuit` launch | 45.7% | 35.3% |
| walked off a ledge | 15.0% | 22.2% |
| (grounded) | — | 19.1% |
| `guaranteed_punish` launch | 9.8% | 3.6% |
| knocked into the air | 4.9% | 4.4% |

`elevation_pursuit` ("target above me → jump") was exempt from the gate. Against a
player who is airborne 60% of the time, he chases them into the air all match. That
chase is where the player's anti-airs land.

**Change:** the gate now also prices `elevation_pursuit` launches when the target is
AIRBORNE (up to 260px above). A target STANDING on a higher platform is still
exempt: they don't have to come down, and the Sep 10 work showed waiting out a
camper loses. Rerunning the A/B vs the proxy, fresh and rematch.

Proxy v3 (agent): `readRate` = the fraction of his connecting melee swings it reads
and escapes geometrically. At p=0.85 plus offence reads it still takes ~2x the
player's damage (smoke-scale). The full calibration run is in the background
(`data/balance/iter3-full-run.log`). The C1 A/B uses a pinned snapshot of the params
so the run can't change mid-test.

### 2026-09-23: C1 vs the proxy, and the proxy becomes a calibrated instrument

**C1 including pursuit, vs the proxy, 200 matched pairs (proxy v3, no hp scaling):**
airborne share 51.5% → 44-47% (t = -14 / -21), but air openers taken are unchanged
(10.4 vs 10.5) and ground openers rise +0.7 (t=3.1). Damage taken, dealt and stocks
are null. **The vetoed launches were the SAFE airtime.** Openers per airborne second
rose, so the danger is not "being airborne" but specific moments (coming down into
range, walking off a ledge: 22% of openers from 15% of airtime). Rematch mode learned
it the same way (veto 58 → 87% over 20 rematches) with the same null outcome.
**Posture-level avoidance is too coarse; the unit has to be a moment, not a state.**

**Proxy v3 final (n=220):** damage into him 133/1k (human 108-130), damage into the
proxy 187/1k (human ~90 in full-length matches), and he got ≥7 kills in 220/220. Every
loadout read 100% as well: saturated, useless.
(The human means printed by proxy-stats include three aborted 15-31 s sessions, which
drag them down.)

**Fix: scale the proxy's health (`opts.oppHpMult`, applied after class setup) so its
STOCK TRADE matches the player.** Every exchange stays identical; stocks just last
longer. Across the 14 full human matches the player lost 90 stocks and he lost 126,
so his share of the losses is **0.58**.

| hpMult | his share of losses | his kills per 10-stock match |
|---|---|---|
| 1.5 | 0.48 | 9.0 |
| 2.0 | 0.55 | 7.6 |
| 2.5 | 0.62 | 6.1 |
| 3.0 | 0.63 | 5.8 |

**Calibrated at hpMult 2.2** (saved in tools/human-proxy-params.json). There he averages
~7 kills per match, right at the floor. That is consistent with the real record (floor
met in 8 of 14). The instrument now reproduces the actual problem. The proxy is a
somewhat pooled, somewhat older "player": the three matches on the current build ran
at a share of 0.45, i.e. the player is doing worse against today's build than the pooled
figure suggests. Using 0.58 is the conservative choice.

### 2026-09-23: baseline vs the calibrated proxy, and where he really loses

**Baseline (habitAir off, sword/ninja vs spear/gunner, hpMult 2.2, n=240): ≥7 kills
in 61.3% of matches, mean 7.10.** The real record is 8 of 14 (57%). The instrument
matches reality. **Target: ≥90%.**

**C1 (posture veto incl. pursuit) vs the calibrated proxy, 240 matched pairs:** kills
7.12 vs 7.10 (t=0.08), ≥7-rate 61.3% both arms. Null. It stays behind its flag; its
ledger infrastructure is what C2 builds on.

**Moment-level hazard from the human replays** (scratchpad moments.js; 14 full
matches, 53 min). Each opener is attributed to his moment 6 frames before the hit:

| his moment | time % | player's openers | his openers | net / min |
|---|---|---|---|---|
| descending, near (<120px), level with the player | 7.5 | **235** | 93 | **-35.7** |
| descending, near, above the player | 6.2 | 56 | 20 | -10.9 |
| just landed, near | 7.4 | 89 | 68 | -5.4 |
| taking off, near | 12.2 | 92 | 61 | -4.8 |
| rising, near | 11.1 | 46 | 20 | -4.4 |
| swinging in the air, near | 7.9 | 22 | 70 | **+11.5** |
| swinging on the ground, near | 4.4 | 18 | 28 | +4.2 |

**30% of every opener the player lands comes from ONE moment: him floating down into
range with no attack out.** Being airborne isn't the problem; swinging in the air
is his best moment. Coming down unarmed is his worst. That is why C1 (don't take off)
couldn't help: it removed the good airtime along with the bad.

### C2 design: descent control (a real gambler over counters)

Trigger: once per airborne stint, on the first frame he is descending (vy > 0), not
stunned, with no attack out, and the target within ~140px horizontally. Arms:
- `default`: do nothing (the cascade's choice).
- `strike`: swing now if his weapon is off cooldown (converts the moment into
  `air_swing_near`, his best).
- `dive`: fast-fall (vy 13, the player's own fast-fall speed; parity, since he never
  fast-falls today), so he is exposed for less time.
- `drift`: steer to land just outside the target's reach, then approach grounded.

Outcome per decision: who opens first within 45 frames (+1 he does, -1 the player
does, 0 neither), plus the damage net. Per-opponent Dirichlet posterior per arm,
Thompson draw per descent, persisted for humans via SovHabits. Weak priors, so it
starts gambling immediately. The first switch away from `default` in a match gets a
line.

### 2026-09-23: loadout is NOT the lever (vs the calibrated proxy)

`tools/sov-air-sources.js --sovkit=`, 64 matches per kit, proxy on spear/gunner,
habitAir off:

| his kit | ≥7 kills | mean kills |
|---|---|---|
| nullblade / berserker | 64% | 7.27 |
| katana / ronin | 63% | 7.22 |
| sword / ninja | 61% | 7.30 |
| scythe / reaper | 63% | 7.20 |
| hammer / thor | 66% | 7.42 |
| axe / kratos | 55% | 6.73 |
| combat / pugilist | 64% | 7.45 |

Flat, within ~±6 points (SE ≈ 6 at n=64). Every kit sits near 60%. The real-match link
between hammer/scythe/nullblade and his worst losses isn't reproduced here. Either
those losses came from older builds (all were Sep 5-10) or the proxy doesn't punish
heavy endlag the way the player does. Caveat noted. **The floor gap is behavioural
and shared by every kit.** Axe is the only mild outlier and could be dropped from
his pool later if it holds up at larger n.

**CORRECTION (same day): the loadout table above is INVALID.** `opts.sovKit` set his
weapon at construction, but `SovereignMK2._ensureMatchLoadout()` re-picks on his first
frame and overwrote it. All seven rows measured his own bandit pick, mostly
katana/ronin; hence "flat". Fixed: sovKit now sets `_loadoutLocked`. Every earlier
proxy run (calibration, C1 A/Bs, baseline 61%) therefore used his NATURAL loadout
choice, which is what he does against the player in real matches. So those numbers
stand, and are if anything more representative. The loadout table is being re-run.

### 2026-09-23: the proxy does not reproduce the player's key habit

Moment table from 24 recorded sim matches vs the calibrated proxy (v3 + hpMult 2.2),
next to the human numbers (openers per minute in the moment, taken / dealt by him):

| moment | human | proxy v3 |
|---|---|---|
| descend_level_near | 59.1 / 23.4 (net -35.7) | 27.2 / 31.1 (net +3.9) |
| takeoff_near | 14.3 / 9.5 | 24.0 / 15.9 |
| just_landed_near | 22.7 / 17.4 | 9.9 / 14.7 |
| air_swing_near | 5.3 / 16.7 | 4.7 / 18.7 |

The player's defining habit is waiting under or level with him and hitting him as he
comes down unarmed. The proxy doesn't do it, so it would under-measure any counter to
that moment (C2). Proxy v4 adds an `antiAirDescent` behaviour, calibrated to this
table, then re-fits hpMult. C2's first A/B runs on v3 (in flight); it gets re-run on
v4.

### 2026-09-23: CORRECTION: every earlier sim number ran him at 126 HP

`opts.sovKit` applies the class's stat line. The old `sword/ninja` default gave him
126 max HP instead of his real 150 (and his picker then overwrote the weapon). So the
61% baseline, hpMult 2.2, and the C1 A/Bs were all measured against a handicapped
Sovereign. **The C1 nulls still stand as nulls** (both arms shared the handicap), but
the absolute numbers moved. Fixed: no harness pins his kit by default any more; he
picks his own, as in a real match.

Re-fit at his real 150 HP (proxy v3, 64 matches each):

| hpMult | his share of losses | ≥7 kills | mean kills |
|---|---|---|---|
| 2.2 | 0.51 | 95% | 8.80 |
| 2.8 | 0.57 | 67% | 7.39 |
| 3.4 | 0.62 | 42% | 6.16 |
| 4.0 | 0.64 | 23% | 5.55 |

**Calibrated hpMult = 2.9** (share ≈ 0.58). There the floor rate is ~63-67%. The real
record (57%) still agrees, so the conclusion "the instrument reproduces the problem"
survives the correction.

### C2 v1 result (at hpMult 2.2, 150 HP, 240 matched pairs): null

Kills 8.29 vs 8.29 (t=0.03). Ground openers taken +0.98 (t=4.0). Arm mix: default
46% (win-loss +0.043), dive 32% (+0.084, best), drift 22% (-0.053, worst), strike 0.4%.
**Strike was offered only when he was ALREADY in reach on the first falling frame,
which almost never happens,** so the arm that turns his worst moment into his best
(`air_swing_near`, +11.5/min) was never really on the table.

C2 v2: strike is a TIMED arm, chosen at the trigger when his weapon is nearly ready and
thrown the moment he comes into reach on the way down.

### 2026-09-23: C2 v2/v3 results, sampler bugs, proxy v4

**C2 v2 (timed strike), hpMult 2.9:**
- Fresh, 240 pairs: kills +0.17 (t=1.19), stocks +0.10 (t=1.48), floor 57% vs 58%.
  Arm mix: strike 25% (win-loss +0.18), dive 30% (+0.06), default 25% (+0.01),
  drift 20% (-0.04).
- Rematch (carry 20), 240 pairs: the gambler converges (strike 48%, drift 9%). Floor
  70.4% vs 61.3%, kills +0.13 (t=0.92).

**C2 v3 (+ innate prior worth ~30 descents, from the arm results above), fresh, 360
pairs:** kills +0.06 (t=0.6), floor 62% vs 59%. **Near null.** The arm table overstates
strike: it is only offered when his weapon is nearly ready, and those are already his
good moments, so its +0.18 is partly the situation, not the choice (availability
confound). The A/B is the honest number.

**Two sampler bugs fixed in `SovHabits._gammaSample`** (also used by C1). It summed
exponentials, so it rounded fractional (decayed) counts and CAPPED the shape at 400. A
player with a long history saturated: 1000 wins / 800 losses read like 400 / 400.
Replaced with Marsaglia-Tsang for any shape (verified mean = var = k for k = 0.3 to
1000). Added a per-arm rolling window (150 decisions) so his read of the player stays
responsive if the player changes.

**Proxy v4** (`tools/human-proxy-params-v4.json`): adds `antiAirDescent` (predict his
landing spot, sit under it, time a swing). It did NOT reproduce the player's
descent-punishing signature: the moment's net stayed ≈ 0 across p. Most likely the
14-frame perception delay makes the landing prediction stale. Its stock trade does
match: hpMult 2.2 gives a 0.579 share, and the floor is 64% (n=200). It's a second
valid instrument.

**Honest state of the adaptive layer:** C1 and C2 each LEARN per opponent (their
choices diverge by opponent and converge over rematches). That is real adaptation.
But each moves kills by ≤0.2 against the proxies, and the floor needs about +1.4 mean
kills (from ~7.1 to ~8.5). The player's descent-punishing habit, the thing C2
targets, isn't reproduced by any proxy, so C2's real-world value may be larger than
measured. That can only be settled by the player's own matches.

### Kill-floor governor (built, being measured)

The user authorised "any measures" for the floor. `_killFloorGovernor()` runs every
frame. When the player leads on stocks (deficit ≥2), or his remaining stocks get
close to the kills still owed to the 7-of-10 floor, his `dmgMult` eases (1% per
frame) toward 1 + `SMK2_TUNE.killFloor`, and back down when he recovers. Damage only:
movement, decisions and rules are unchanged. It is a disclosed safety net, not
intelligence. Sweeping killFloor ∈ {0, 0.3, 0.6, 1.0} vs both proxies, n=160 each.

### 2026-09-23: governor results, recent-level calibration, and what ships

**Recent-level calibration.** The pooled 0.58 share mixes the player's skill with
older, weaker builds (all six bad losses were Sep 5-10). The three most recent matches,
on a nearly-current build, give **0.45** (the player lost 28 stocks, he lost 23; n=3, SE
≈0.07). Proxy v3 at hpMult 1.6 reproduces that share (0.44).

| opponent level | his share | governor | ≥7 kills | mean kills |
|---|---|---|---|---|
| recent player (v3, hp 1.6) | 0.44 | off | **99%** | 9.55 |
| slightly stronger (v3, hp 1.9) | 0.48 | off | 93% | 9.07 |
| pooled stress (v3, hp 2.9) | 0.58 | off / 0.3 / 0.6 / 1.0 / 1.6 | 59 / 73 / 75 / 85 / 88% | 7.06 → 8.05 |
| pooled stress (v4, hp 2.2) | 0.58 | off / 0.3 / 0.6 / 1.0 | 73 / 74 / 80 / 85% | 7.61 → 8.00 |

(n=160 per row; one hp1.9 + governor 0.6 row lost workers to browser-launch
timeouts and is omitted.)

**Shipping config (all SMK2_TUNE, each one boolean/number to revert):**
`habitAir: true` (C1), `habitDescent: true` (C2, timed strike, innate prior, rolling
window), `killFloor: 1.0` (governor, up to 2x damage only while the player leads by
≥2 stocks or his remaining stocks run short of the floor). Plus the match-start
dossier line (`_habitDossierLine`, `SMK2_DOSSIER_LINES`), which fires only against a
human he has a record on.

**Real-game smoke (sovereign mode, 45 s, idle player): no page errors.** A seeded "this
player punishes my descents" record produced the dossier line at frame 90 ("You wait
under me for the landing. I remember."). The C1 line fired, and C2 chose arms live
and resolved outcomes.

**Verdict so far:**
- vs the player at their recent level: the floor holds ~99% (lab).
- vs a player as strong as the pooled history: ~85% with the governor, ~60-73%
  without.
- Adaptation is real at the decision level (per-opponent divergence, rematch
  convergence, persisted across sessions, scouted from all fights) but small in
  outcome against proxies. The player's descent-punishing habit, the one it targets
  most, can only be tested by the player.

**Open, needs the player:** play 2-3 sovereign matches. Then (1) `node tools/proxy-stats.js`
for share and kills, (2) scratchpad moments.js for whether descend_level_near
shrank, (3) `SovHabits.dump('human:<account>')` in the console to see what he learned.

### 2026-09-23 (evening): first human match with the adaptive layer live

`smb_replay_sovereign_2026-09-23` (player sword/Varek vs his katana/Ronin, he won
10-7; the governor never had cause to engage). Compared against 09-05 to 09-22.

- **Between matches, behaviour changed.** Airborne-idle time fell to 35-43% of his
  moments (49-62% in every earlier replay, including 09-21 on the same katana/Ronin
  kit). Time spent descending near the player, the player's #1 leak, was 10 s,
  the lowest of any replay (13-24 s before). Openings the player got on him: 36, vs
  44-86 before.
- **Within the match, no evidence of learning.** He still gets punished for the same
  thing: descend-near hits by third were 5 / 4 / 8, in 3 / 3 / 4 s of exposure, so the
  punish rate went up late. Damage taken by third was 296 / 374 / 527. After being hit
  from a moment, his next opening conceded comes from the same moment 18/35 times
  (chance: 17.8). Every earlier replay also sits at chance. After a punish, his
  exposure to that moment dips about 10-20% below base, but it dips the same in
  pre-habit replays, so that's stun/respawn, not learning.
- Ground-moving share rose 18 → 25 → 34% across thirds. That fits C1 updating live,
  but it didn't pay: the air time he kept got punished harder.
- Guard is still collapsed: 1.2 / 0.5 / 3.8% of grounded frames shielding (it was 16%
  on 09-21(1)).
- Caveat: n=1 match, and the player's kit differs from 09-21. Replays don't record
  his dials, so SovHabits.dump is the only direct read of what he stored.

Same session: two katana bugs inflated his katana damage. Iaijutsu's slash arcs, and
the follow-through slash on every connecting basic swing, spawned with an empty
hitSet and re-cut the target for a flat 22 once its i-frames lapsed. Iaijutsu was 44
(moving) / 72 (still) instead of 22 / 28. Both are fixed. Sovereign-mirror weapon
sweep after the fix (6 per pair, noisy): katana 52%, sword 81%, glassblade 4%.

### 2026-09-23 (night): three same-day rematches, the adaptation claim does not hold

Three matches, same account, in order: 18:01 (sword/Varek, he won 10-7), 18:17
(sword/Varek, pickups still on, the player won 10-8), 18:34 (sword/Archer, after the
katana, pickup and super-heal fixes, he won 10-9). His katana/Ronin in all three.

| | match 1 | match 2 | match 3 |
|---|---|---|---|
| openings the player got on him | 36 | 48 | 59 |
| punishes while he fell near the player | 17 in 10 s | 22 in 17 s | 27 in 10 s |
| airborne share by third | 41 / 48 / 42% | 47 / 55 / 47% | 47 / 51 / 57% |
| next opening from the same situation as the last | 18/35 (chance 17.8) | 25/47 (25.7) | 29/58 (24.0) |

In match 3, the player punished his descents at the highest rate of the three. His
airborne share climbed through that match, and he repeated the last punished
situation more often than chance. Match 1's ground shift did not carry into matches 2
and 3, so it was noise, not a learned trend. No sign of rematch learning. The player
adapted faster than he did.

Found the same night:
- `SovHabits.dump(key)` with any key that doesn't match created a blank record and
  printed zeros. `dump()` now defaults to the active human, and an unknown key lists
  the real keys. Recording itself works; the key was `human:Player 1`.
- He kept a flat 150 HP whatever class he picked (the Fighter default; `_applyLoadout`
  restored it). Now HP = base × class hp / 150, re-based so the signature-kit →
  counter-pick double equip doesn't compound. Verified live: Ronin 132.

### 2026-09-23 (late): Varek nerf, open arsenal shipped, record keyed to the person

**Varek.** `rageStacks` was never reset, not even on death, so from about the third
life of a 10-stock match every hit carried the full +45%. The fix: stacks reset in
`Fighter.respawn()`, +1% per stack up to 20 (`KRATOS_RAGE_MAX`/`KRATOS_RAGE_PER`
in smb-combat.js), and the Spartan Rage heal is 5% instead of 10%. Sovereign on
both sides, sword held: 10 stocks 60.0% → 46.7%; 3 stocks 41.3% → 32.1%. Sword
swing: 15 fresh / 18 max rage / 23 Spartan (was 22 / 28).

**Harness bug.** The lab never called `respawn()`, so per-life class state
(`classPerkUsed`, Spartan timer, rage) never reset there, and every perk fired once
per MATCH. class-balance.js and SMK2Trainer.runMatch now reset it on death.

**Open arsenal.** It was a lab-only setting, and its lab knowledge never shipped. The
fix: `_pickOpenLoadout` is now melee-only (every boss fight bars ranged), and
sov-discover's opponents are melee-only too, with no gunner/archer. Rediscovered on
the fixed game (`data/discover/2026-09-23T23-28-09`): sword 5/5 lineages, spear
next; katana fell to +97 (bottom-3 in 4/5) once its double hit was gone. Paladin
4/5. New `tools/sov-arsenal-build.js` writes `js/smb-sov-arsenal.js`
(`SOV_ARSENAL`, each option capped at 20 lives), merged under his local record by
`_innateArsenal` and never written back.
A/B vs proxy v3, 160 matched pairs: kills 7.67 → 9.51 (t=12.3), stocks left
0.54 → 2.36, ≥7-kill floor 81% → 98%. `openLoadout: true` shipped. This is the
largest single effect in the project; every earlier decision-level change was
≤0.2 kills.

**Person key.** `_dossierKeys` adds `who:<SovHabits key>` for a human (or a lab
opponent with `_habitKey`), so switching class no longer wipes what he knows. It
can't be measured on the proxy (one fixed kit).

**Swing hold.** `swingGate` had been OFF, so nothing stopped a swing whose cell read
-16/try. New `swingHold` (-8/try, 20% explore) drops the swing even when guarding
isn't better. The shieldStacks≥4 early exit no longer blocks it. Verified firing
with a seeded cell (80 holds in one match). It stays inert vs the proxy: the proxy's
worst swing cell was -3.9. Only the player's matches can test it.

**Descent damage term** (`descentDamage`): C2's arm value adds net damage per
decision. A/B vs proxy: kills -0.15 (t=-1.72). OFF: unproven, because the proxy
doesn't reproduce the player's descent punish.

`sov-habit-ab.js --carry` now keeps the dossier between rematches too, not just
the habit ledger.
