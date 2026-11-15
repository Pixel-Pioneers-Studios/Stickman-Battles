# Sovereign: everything in one place

The hub for SovereignMK2, the game's adaptive duel boss: what ships today, every
experiment we've run on him, what each one measured, and what's settled. Start here.
The older logs are linked rather than merged; they hold the full detail.

**Last updated:** 2026-11-14 (overnight breadth + 24212).

**How to keep this current:** after any Sovereign training run, eval, or human fight,
add a row to the right table in "Everything we've tried", and fix "What ships today"
if anything live changed. A row needs the date, the key number, and a verdict. Nulls
count. A row that says "no effect" saves the next person a night of training.

---

## What ships today

| Part | State |
|---|---|
| **Driver** | The neural brain, checkpoint **iter 20011** (`data/brain/latest.json`, live since Oct 25; GRU memory, no twitch filter). `Brain.driveSovereign()` in `js/smb-brain.js` takes him over in Sovereign mode and in story ch143/ch164. |
| **Fallback** | The scripted cascade in `js/smb-smk2-class.js` runs if the checkpoint can't load or the brain is switched off (`localStorage smb_brain_sov = '0'`). On `file://`, where fetch fails, the brain loads `data/brain/latest.js` instead (a script wrapper made by `tools/brain/ckpt-js.js`; added Nov 8, currently 20011). **Regenerate `latest.js` whenever `latest.json` changes**, or file:// players get a stale brain. **Tell:** the cascade always carries the Null Blade loadout; the brain never does. |
| **Weapon / class pick** | Open arsenal: Thompson sampling over his own per-life results (`SovDossier`, `_pickOpenLoadout`), seeded by the generated `js/smb-sov-arsenal.js`. Picks key on the opponent's **weapon** only; the opponent's class is recorded but unused, and his class is picked independently of his weapon. Unknown ranged weapons are swapped for a known one; unknown melee is kept. Training doesn't change picks; only fights do. |
| **What the brain doesn't run** | The cascade's dialogue/journal/adaptation layer (`updateAI` doesn't run while possessed). The read layer (`js/smb-brain-read.js`) exists but is OFF. Key-nav (`btKeyNav`) is gated off on The Circuit, so it's not in the shipped fight. |
| **Safety nets** | `_killFloorGovernor` (up to 2x damage while the player leads by 2+ stocks; disclosed, not intelligence). Story fights mirror the player's upgrade ratios (`_storyMirrorPlayerBoosts`). |
| **Arena** | The Circuit (`ARENAS.sovereign`). The brain trains only there. |
| **Dev controls** | Console `brain` / `brain off` hands P2 to the checkpoint. F7 pilots *you* with the **cascade**, not the brain, so it's not the live strength. `read on/off`, `brain nav on/off`. |

**Other checkpoints on disk:** `data/brain/sovereign-12756.json` (Oct 11 ship, GRU),
`data/brain/sovereign-15705.json` (15705 + twitch filter `play: {turnAway:6, turnDz:30}`).
To swap, copy one over `latest.json` and reload.

**Ladder gate:** Sovereign stays off the Fight Ladder until he demonstrably adapts
mid-match. That gate is about adaptation, not win rate (user decision, Oct 11).

**Human record:** across 14 full human replays (to Sep 23) he met the "kills me 7+
times in 10 stocks" floor in 8. Recent: Oct 3 brain beat the user 10-9 (user not
going all out). Oct 17, brain 15705 won but "felt off" (112 twitch turns/min). Nov 7,
user beat the brain 10-6 (scythe/Reaper vs whip/Varek, 22 twitch/min). The other Nov 7
match (user Varek/axe won 10-8) was the cascade, because `file://` blocks the fetch.

---

## Standing conclusions

These are settled. Don't re-try them without new evidence or a changed premise.

1. **Kit choice is the biggest lever we've found for the cascade.** Open arsenal was
   +1.84 kills vs the proxy (t=12.3). Every decision-level change before it moved
   ≤0.2 kills.
2. **Memory never pays while one fixed policy beats every opponent.** Tallies, the
   read layer, the GRU, hunter-switch matches, habit opponents, sequence habits, and
   goal-conditioning all came back null or generic. Wiping the GRU costs little, and
   costs the same against habits as against plain play.
3. **Goal-conditioned objectives don't specialise** (runs 1 and 2, Nov 8-9). They act
   as a general damage boost; turtle vs rushdown rankings never reverse. This approach
   is finished.
4. **Shield isn't worth teaching.** Melee hitboxes are live from swing frame 1, so no
   swing is reactable; even a perfect every-frame guard blocks 7-9% of hits (+8 pts at
   best). Guard drill: nothing in ~300 iters. Same applies to humans.
5. **Freeze-and-patch finds a new hole as fast as it fixes one.** A fresh hunter beat
   each patched net by ~75%. A live league chases the newest opponent and forgets,
   hence the ship gate.
6. **The sim can't reproduce human pressure** for the cascade (Aug 23). Bots lock him
   2-9%; a human locked him 32% in one match (the Aug-Oct replays are 10-18%, and the Nov 7 cascade fight was 28%; the brain was 14%, see Nov 11). The human proxy (`tools/human-proxy.js`, HP-scaled)
   is the closest instrument, and it doesn't reproduce the player's biggest leak
   (descending near him with no attack out).
7. **Never key a behaviour dial on raw damage taken.** Getting hit knocks him back, so
   damage-taken windows push him into a retreat spiral. Use "punished while committed".
8. **Weapon one-hot carries no information.** Blanking it costs nothing; unseen melee
   plays like known melee. Weapon stat features weren't built.
9. **Twitch is per-checkpoint.** The turn-away filter is free on 15705 and costs 9-10
   pts on 12756 and 17628. The training-time twitch penalty (0.008) worked (17628 214/min,
   20011 96/min) but rose again under goal-conditioning (~140/min).
10. **Small evals lie.** 40-episode checkpoint evals produced a fake "decline" and a
    wrong restart recommendation (run 3). Use ≥100-200 episodes and pool seeds; paired
    arms aren't deterministic, so treat them as independent samples.

---

## Everything we've tried

Newest era first. "Null" = no measurable effect. SE = one standard error.

### Three-layer plan (Nov 2026)

Layer 1 = scripted opponent tracker (`js/smb-sov-intel.js`), Layer 2 = strategy picker, Layer 3 = the net(s).
Tests: A short-term memory helps, B detects a change, C picks a different strategy, D notices the player adapting.

| Date | Question | What we did | Key number | Verdict |
|---|---|---|---|---|
| Nov 11 | **Scripted ceiling: what is knowing a habit's timing worth?** (the prize the habit-generalist nights were training for) | `Brain.rollout opts.habitRead` (js/smb-brain.js `_habitRead`, eval only) lays a scripted answer over 20011's keys: timing `know` (window read from the habit), `mean` (15 f for everyone), `learn` (delays watched this match); answer `parry` (fresh guard as the window opens), `hold` (no basic swings), `break` (ability). `hunteval.js --habitread=know:parry[:shift[:rest]]`, 20011 vs 20011 carrying the habit, 200-400 matches a cell, `data/brain-read/` | timed-masher, seed 1 (400, SE 2.5): none 54.0, know:parry 53.3, know:hold 54.8, know:break 53.8, mean:parry 52.8, learn:parry 55.5. timed-blocker, seed 2 (300, SE 2.9): none 51.7, know:hold 55.0, know:break 53.0, know:parry 56.0. Per match with know:parry: 14 timed guards, the masher swings in 7 of those windows, 3 hits arrive, 1.4 blocked, 0.5 parried; only 3 of the 14 guards were parry-eligible. `rest` (net never touches the guard key, so every timed guard is rested): 31.0 vs its control 29.5, parries 0.72 a match | **Null: perfect knowledge of these habits' timing is worth nothing**, so no amount of training against them could have made memory pay. A habit swing rarely connects (about 1 in 5 windows), so guessing its timing has little to catch. Side findings: (1) dropping the net's guard key costs ~30 pts (59 to 29.5); that key is also fast-fall and air guard, pressed ~110 times a match, so its guard is almost never rested for the 20 f a parry needs. Which of the three uses carries the 30 pts is not split out. (2) Running several hunteval browsers at once stalls them; run evals one at a time |
| Nov 11 | Does the user have wake-up / whiff habits a timed read could catch? | `node tools/replay-habits.js <replays>`: his first new swing / guard / jump within 48 f of his own stun ending or his swing missing, Sovereign within 220 px. Oct 3 - Nov 7 replays for the landing check | All replays with stun data: after waking he swings first 28% (match-to-match sd 12 pts, chance alone 7), otherwise jumps ~30% or guards ~15%. Oct-Nov (7 matches, 366 wakes): swings first 18%, of which 29% land; the wait is tight inside a match (27-33 f) but a parry timed to it would meet a landing hit on ~3% of wakes. Guard after a whiff rose from ~3% (Sep) to 20-40% (Oct 17 on) | **No.** His habits exist and shift over months, but single swings land too rarely for timing reads to pay, same as the bots. Jumping is his most common wake-up answer; untested as a target |
| Nov 11 | Does the HUMAN get better at him inside one match? (is there anything to adapt to in ~3.5 min) | `node tools/replay-trend.js replays/smb_replay_sovereign_*.smbreplay smb_replay_sovereign_*.smbreplay`: 26 human-vs-Sovereign replays Jul 27 - Nov 7 (cascade and brain mixed), share of all damage dealt by the human, by third of the match | Pooled 53.4 / 54.5 / 56.4%. Last third minus first third: **+1.4 pts, SE 1.8**, up in 13 of 26. Human share of KOs 47 / 56 / 56% (~1.5 SE, a hint of a warm-up only) | **No measurable in-match learning by the human either.** Third independent sign that one match is too short and noisy to learn an opponent (with the picker arithmetic and the 45% oracle detection). Caveats: the user already knew him, healing not counted, can't see effects under ~4 pts. Points at across-match adaptation, or a rule that creates a real guess, not at the learner |
| Nov 11 | Is the user still locking him ~32% (the Aug figure)? | Lock = Sovereign stunned or ragdolled, share of live frames, same definition as `tools/sov-calibrate-buff.js` (finisher frames and dead frames cut), on the Nov 7 replays plus the Aug-Oct ones on disk (untracked Nov/Oct files at the repo root). Brain vs cascade told apart by the frame `ai` flag (brain-driven slot records ai:0) | Nov 7 brain (20011, user Reaper/scythe won 10-6): Sov locked **14.4%**, user locked 13.1%; Sov dealt *more* damage (158 vs 134 per 1k frames, 1533 vs 1293 total) but the user healed **643** HP to his 238. Nov 7 cascade (user Varek/axe won 10-8): Sov locked 27.9%, user 11.3%. All other replays Aug 23 - Oct 18: Sov locked 10.5-17.5% | **Lock isn't why the brain lost on Nov 7.** It traded even on lock and won on damage, and lost on sustain: the user's healing outweighed his damage lead. The 32% was one cascade match; the cascade still gets locked ~2x as much as the brain. Next: find which mechanic gave the 643 HP of healing and whether the brain sees it |
| Nov 9 | **B:** can Layer 1 detect a sudden style change? | 12 opponent features over 2/8/30 s windows, drift = recent vs long. 20011 greedy vs proxies that switch once at a hidden 30-60 s frame, plus same-style controls; 480 matches x 2 seeds. `tools/brain/intelbench.js`, `data/brain-intel/` | Best edge over controls ~25 pts at 35% false hits; at ≤10% false hits, 10-15% detection. A calibrated offline detector: 16% hit vs 10% control at z 3.5 | **Fail, confounded.** The proxies barely differ against 20011: same swing rate (~1/s) for all four, "turtle" guards 0.6% of frames, best single-feature separation d' 1.1-2.7 (airborne/jump rate). Next: re-test with opponents that really differ (habit opponents), not more detector tuning |
| Nov 9 | Which net is best depends on the opponent? | 15 checkpoints (shipped, old ships, hunters 1-4, habit specialists, habit generalist, goal2) x 6 opponents (hunters 1-4, 20011, 15705), 100 matches each, `data/brain-portfolio/m-*.json` | 20011 loses to hunter 4 (37%). Oct habit nets are the strongest on disk: spec-blocker 14672 beats 20011 61% and is >= 20011 vs every hunter (vs h4 52 vs 37); generalist 14254 beats 20011 64%, 15705 75%. Best-per-opponent pick ~66% vs best single net ~62% | Little non-transitivity among nets: one net (spec-blocker) nearly dominates. Side finding: 14672/14254 may be stronger ship candidates than 20011 (unverified vs humans, twitch not measured) |
| Nov 9 | Can Thompson sampling between nets mid-match adapt? (Layer 2 portfolio) | Rollout `opts.portfolio` (all nets fed every decision, own memory each; 10 s segments + stock losses scored by HP+stock exchange). `tools/brain/pfeval.js`, {20011, 14672, 14254} vs h4/15705/20011/h2, 5 stocks, 100 matches per arm | TS lands at the average of its arms (52-58%), never near the best (55-74%). Segment exchange sd 0.78 vs between-net gaps 0.1-0.25, ~10 segments a match: separating a 0.25 gap takes ~50 segments | **Fail, by arithmetic.** Outcome-based picking can't work inside one match unless a matchup is lopsided (hunter-level, ~0.5+/segment). Across ~5 matches it could. Also: 5-stock and 3-stock results disagree by up to 25 pts on one pair (gen vs 15705 49 vs 75), so net-vs-net gaps are fragile |
| Nov 9 | Is getting opened predictable from his own choices or this match's history? | `opts.trace` (one row per decision), 20011 vs h4 and vs itself, 100 matches each; openers = he loses HP within 3 decisions while not stunned (~61/match) | Held-out log-loss: situation only 0.1735, situation + his action 0.1748 (no gain); adding this match's first half to predict its second: 0.1741 vs 0.1743 (no gain). h4's edge is situational: close, h4 above, both airborne: opens him 8.5% vs mirror 5.6%, 16% of the match (~18 vs 12 openers a match, z~1.7 over a whole match) | **Null.** His button choice doesn't change his risk; the exploit is where fights happen, and it is too faint to learn inside a match |
| Nov 9 | **Swing startup in the game + retrain** (user approved) | `js/smb-globals.js`: non-boss melee swings can't hit for 40% of the swing (2-6 f; jab 2, sword 4, axe 5, hammer/flail 6). Brain obs and the old instant bot shield see an opponent's swing only at 8 f (`SWING_SEEN_LAG`), so it must be predicted, not out-reacted. Retrain from 20011 under the new rules, 8 h, `tools/brain/startupnight.sh`, `data/brain-startup/` | Browser check: every melee hit lands at its startup frame or later (sword 4/4), player and bot. 20011 vs itself still plays (45% / 53% old rules, 40 matches) | **Strength even, no adaptation.** Run Nov 9 16:12 to Nov 10 00:18, 20011 to **23116** (3105 iters; Ollama memory pressure slowed ~2 h of it). Candidate vs 20011: 47.5% (mirror 53, SE 3.5). Win% memory kept / wiped every 60 decisions, 200 each: candidate timed-masher 54.5/58.5, timed-blocker 66.5/66, plain 47.5/52; 20011 49/56, 55.5/55.5, 53/44. Wiping never costs the candidate anything: gate failed. Its +11 on timed-blocker holds with memory wiped, so it is generic. The league never rewarded reads (no habit opponents in training). Live play changed for everyone: needs the user's feel playtest |
| Nov 10-11 | **Habit generalist under swing startup:** does training against timed habits make memory pay now that swings have startup? | `tools/brain/habitgen.sh 7 "timed-masher,timed-blocker,none" gen-startup`, 7 h from 20011's weights, 2949 iters; saved as **18654** because the counter came from the stale `data/brain/state.json` (15705), so read it as 20011 + 2949, new swing rules incl. the cocked-back windup. Evals vs 20011 carrying each habit, 200 matches, SE 3.5, memory kept / wiped every 60 decisions. `data/brain-habit/gen-startup/`, `ceiling.log` | gen-startup: timed-masher 65 / 57.5, timed-blocker 67 / 70, plain 60.5 / 59. Baseline 20011 in the same seats: 56.5, 58, (mirror). Twitch turns ~238/min vs 20011's ~106/min (79% of turns vs 61%), mostly in the air | **Memory gate failed again, strength up.** Wipe costs 7.5 on masher (~1.5 SE), gains 3 on blocker, 1.5 on plain: no consistent use of memory. But it beats 20011 60.5% plain under the new rules (3 SE), where the 23116 retrain was even (47.5). Not shippable as is: twice as twitchy as 20011 (no twitch penalty in this run). If a ship candidate is wanted, rerun with `--twitchpen` or apply the play filter and re-measure |
| Nov 11 | **Habit generalist + twitch penalty:** can gen-startup keep its edge without the twitch? | `HABIT_TRAIN_ARGS=--twitchpen=0.008 tools/brain/habitgen.sh 6 "timed-masher,timed-blocker,none" gen-startup-tp`, 6 h continuing gen-startup, 2255 iters, saved as **20909** (same stale counter: read it as 20011 + 5204). Evals vs 20011, 200 matches, SE 3.5, memory kept / wiped. `data/brain-habit/gen-startup-tp/`, `ceiling.log` | timed-masher 63.5 / 65.5, timed-blocker 72 / 71.5, plain 58.5 / 59.5. Twitch turns ~113/min plain (20011 ~106, gen-startup ~236), 62% of turns vs 20011's 61% | **Twitch fixed, strength kept: first ship candidate since 20011.** Beats 20011 ~59% plain (2.5 SE) under the new swing rules at 20011's twitch level. Memory gate still fails (wipe changes nothing), which the Nov 11 ceiling row explains, so this is a strength upgrade, not adaptation; the ladder gate stays. Not shipped: needs a breadth eval (hunters, 15705, 14672/14254) and the human fight first |
| Nov 14 | **Breadth: is 20909 better than 20011 across the field, not just head to head?** | `tools/brain/tpnight.sh` stage 1: 20011 and 20909 each vs hunters 1-4, 15705, 14672, 14254, 23116 (and 20909 vs 20011), 200 matches, no mirror, SE 3.5. `data/brain-habit/breadth/`, `tpnight.log` | Mean over the 8 shared opponents: 20011 50.1, 20909 56.8. Biggest gains vs hunter 1 (+17), 23116 (+12.5), 15705 (+12); hunter 4 still beats both (46 / 45.5). Twitch ~111/min (20011) vs ~129 (20909) in these seats | **20909 is broadly stronger, not a 20011 specialist.** Hunter 4 remains the hole for both |
| Nov 14 | **Continuation: more of the same from 20909** | `tpnight.sh` stage 2: `habitgen.sh 6.5` gen-startup-tp2 from 20909, twitchpen 0.008, habits timed-masher/timed-blocker/none, 3303 iters to **24212** (counter honest this time). Wipe evals vs 20011, then the stage 1 field | Vs 20011 kept / wiped: masher 68.5 / 70.5, blocker 69 / 73, plain 65.5 / 60. Field mean 58.4 (h1 67, h2 64.5, h3 58, h4 52, 15705 61.5, 14672 49.5, 14254 52, 23116 62.5); vs 20011 65.5 (4.4 SE). Twitch ~92/min, below 20011's ~111 | **Best candidate yet: strongest and calmest.** Still gaining, first checkpoint to stop losing to hunter 4. Memory gate still fails (wipe gains on habits; plain -5.5 is ~1.5 SE), so strength, not adaptation; ladder gate stays. Saved as `data/brain/sovereign-24212-cand.json`. Ships only after the human fight |
| Nov 9 | Does swing startup make knowing the opponent pay? | Sim-only `SIM_SWING_STARTUP` (js/smb-fighter.js, undefined in play: first N swing frames can't hit), `pfeval.js --startup=6`. 20011 vs itself, 3 seeds, 100-200 matches per arm | Startup 0: net 53%, foresight + guard-when-idle 47 (-6), react to visible swing 44 (-10). Startup 6: net 41%, foresight 51 (+10), react 47 (+5). Interaction ~16 pts, ~2.8 SE | **The combat, not the learner, is the ceiling.** With frame-1 swings no knowledge of the opponent can be cashed in; with 6 startup frames foresight pays +10, about half of it reachable by plain reaction, the rest (~+5) is the prize for reads. Needs a design decision + retraining |
| Nov 9 | Do the old hunters counter only their own target? | 4x4: hunters 1-4 vs targets 5135/7584/8477/9334, 100 matches each (`c-h*-vs-t*.json`) | Diagonal 63/69/65/60; hunter 4 scores 57-60 on all four. Perfect identity pick 64% vs best single 59% | Skill is mostly transitive: even perfect opponent identification is worth ~5 pts. Matches the Oct 12-13 memory gain (+3.3) |
| Nov 9 | Fresh hunter of 20011 (pfnight.sh) | 1.5 h, 361 iters (machine shared with evals) | hunter5 55% vs 20011 | Too few iterations to be an exploit; run stopped before patch5 |
| Nov 9 | Ceiling: what if he KNEW the opponent's next button? | `opts.oracle`: the opponent's greedy net is run a decision early on a copy of its memory; when a swing is coming in reach a scripted counter overrides the net. 100 matches each vs 20011 (base 51%) and h4 (base 30-42%) | back 31 / 29, guard 37 / 31, jump 29 / 29, guard-only-when-idle 45 (vs 20011), strike first 42 | **Perfect 3-frame foresight is worth nothing to a scripted counter**, and overriding the net costs 6-20 pts. Swings are live on frame 1 and nobody can leave reach in 3 frames, so reads of the next button have no payoff in this combat |
| Nov 9 | **B, rerun with habit opponents:** do opponents that really differ make the switch detectable? | Opponent = 20011 top choice carrying a habit (none/masher/blocker/jumper) that switches once at a hidden 30-60 s frame; both sides HP x5; 320 matches x 2 seeds (`intelbench.js --habits`). Then 4 tracker features added: guard / mid-swing / airborne / backing off in the 40 frames after the opponent's own whiff or stun end | Old 12 features: habits even less separable than the proxy styles (best d' 0.4-1.2), detection 8-15% at <=10% false hits. With the 4 post-trigger features: separation ~doubles (masher vs blocker d' 2.0-2.2, blocker vs jumper 1.9-2.0), but online detection still 10-19% at <=10% false hits; calibrated version on post features 6-14% vs 11%. Upper bound with the switch time GIVEN (15 s before vs 15 s after): AUC 0.77, 45% caught at 10% false hits; switches into or out of blocker 59-80%, none/masher/jumper among themselves 11-42% | **Fail, but now a measured ceiling, not a confound.** Habits change what the opponent does right after a trigger, not its overall rates, so the old features were blind to them. Even the right features carry too little evidence per 8-15 s against 20011's own match-to-match noise. The masher habit barely raises swinging (post-whiff swing fraction 0.09 vs 0.09: endlag blocks it), so it is mostly "stops guarding". A detector worth having needs either longer windows (latency 25 s+) or a bigger behaviour change than these habits make |

**Side finding (affects earlier rows):** the human-proxy styles guard only after a delayed read of a
swing, and swings are live from frame 1, so their guard almost never comes up. Against the brain they converge
on one style differing mainly in jumping. Run 3's memory ablation and both goal-conditioning matrices were
measured against these same styles, so "no reversal" there may partly be "no real difference between opponents".

### Brain era: goal-conditioning (Nov 2026)

| Date | Question | What we did | Key number | Verdict |
|---|---|---|---|---|
| Nov 8-9 | Do forced-distinct objectives reverse? (run 2) | 6 h from 20011, `--objw=2.5 --styleshare=0.33`, calibrated style HP. `data/brain-goal2/` | Turtle best antiair 81 vs none 77 (gap 3.3); rushdown best pressure 74 vs none 70 (gap 2.0); punish hurt rushdown 61. Cand vs 20011: mirror 51%, hunter 48% (SE ~4). Twitch ~140/min | **No reversal, no gain.** Goal-conditioning finished |
| Nov 8 | Can an objective token pi(a\|s,h,g) make him switch plans? (run 1) | Zero-init objective input (identity check diff 0), 4.5 h, objectives Pressure/Punish/Anti-air. `data/brain-goal/`, `tools/brain/goalnight.sh`, `goalmatrix.js` | Every objective beat none by 0-10 on both styles; best turtle=antiair 67, rushdown=pressure 67, gap 2.7. Cand vs 20011 mirror 50% / hunter 56% | **No reversal.** Selector not built |
| Nov 7 | Self-walk-off habit? | `selfKOs` stat, 20011 mirror | 5/381 deaths (1.3%) | Not a habit, no training |
| Nov 7 | Why did user's Varek comeback hit so hard? | Replay analysis | Rage x Fury = 1.56x, axe basics 29-30 (over the 24 ceiling) | Varek nerfed (rage 10, fury 15, additive; peak 24) |

### Brain era: making him readable and human-like (Oct 2026)

| Date | Question | What we did | Key number | Verdict |
|---|---|---|---|---|
| Oct 25 | Can bots' navigator drive the brain's legs? | `btKeyNav` from `_btLevel` | Trips/run clouds 15 to 53, colosseum 15 to 58, city 15 to 50 | Works off-Circuit; gated off on The Circuit |
| Oct 25 | Stronger twitch penalty | `twitchnight2.sh` (pen 0.025) queued | Never ran (no `data/brain-twitch2/`) | **Open** |
| Oct 20-23 | Train out the twitch + win back head-to-head | Twitch penalty 0.008, hunters = skilled clone 2 + 15705. `data/brain-tonight/` | **20011**: 52% mirror vs 17628, 50% vs 15705; twitch 96/min (17628 214); clones 35-37% vs it | **Shipped Oct 25** |
| Oct 21-22 | Does he need weapon features to handle unseen weapons? | `blankKit` eval, `weaponread.js` on 17628 | Blanking one-hot: opp +2.9, me -1.5 (SE ~2.6) | **Null**; premise wrong. Not built |
| Oct 22 | Can he learn ranged weapons in his own hands? | `ranged.sh`, 474 iters | Holding ranged vs 17628: 27% to 31% (SE ~4); melee stays 49% | Within noise; no fast gain |
| Oct 19 | Train against a clone of the user | Behaviour clone from 10 replays (42k decisions), skilled via KL-to-reference (refkl 0.03), then 15705 trained with it as 40% of league | Raw clone 4% vs 15705; skilled clone 41%. **17628**: clone drops to 31% (~11 pts better vs user-like play) but 8 pts worse head-to-head vs 15705 | Non-transitive trade; 17628 was live Oct 20-21 |
| Oct 19 | Remove the twitch at play time | `turnAway` filter (away 6 frames, dead zone 30 px), sweep over 200 matches | 15705: twitch 197 to 30, ~+1 pt. 12756: -9/-10 | Ships only on 15705 (`sovereign-15705.json`) |
| Oct 18 | Why "unreadable", "can't jump through decks"? | Replay + source | DoT ticks zeroed velocity (bug); bleed 53% of hits; three glows stacked | Fixed DoT velocity; whip bleed cut; rings only; Sovereign copies player's class speed |
| Oct 18 | Why can't players get past his guard? | Source audit | No grab, Q/E stopped by guard | Q/E guard break added (symmetric) |
| Oct 17 | Why did 15705 "feel off"? | First human fight of 15705 | 112 twitch turns/min (old brains 14-17), swings 29/min vs 15 | Rolled back to 12756 |

### Brain era: in-match adaptation attempts (Oct 2026)

| Date | Question | What we did | Key number | Verdict |
|---|---|---|---|---|
| Oct 16-17 | Can he read *sequences* he hasn't seen? | Seq habits (2-4 step cycles, 26 held out), 6 h generalist | Held-out seq-test 60.5 vs base 61; wipe=60 *improved* it to 72 | **Fail.** Memorised + generic |
| Oct 14-15 | Timed habits (only memory answers them) | Habits with 0-30 frame delays, 3 h generalist | Timed-masher 67.5 / wiped 56.5, plain 60 / 50 | Memory costs ~10 both ways: generic, not reading |
| Oct 14 | One net vs both habits | GRU generalist, 3 h | Masher 73.5, blocker 76.5 (matches specialists); wiping costs ~0-6 | Reacts, doesn't remember |
| Oct 13-14 | Is knowing a habit even worth anything? (ceiling test) | Masher/blocker specialists, 4 h each | Each best on its own habit (interaction 18 pts, ~2.6 SE) | **Passed** modestly |
| Oct 12-13 | Hunter-switch matches (opponent changes mid-match) | 7.9 h gated run | Cand 16473: -1.5 vs mirror; memory +3.3 pooled (need +5) | Rejected; "does not adapt" |
| Oct 12 | Does 12756 use its GRU as memory? | Memory wipe test, 1000 matches/arm | 54.8 / 54.2 / 53.7% normal / wipe 3 s / wipe every decision | **No.** GRU is extra capacity, not state |
| Oct 10-11 | Recurrent memory (GRU) | 128-unit GRU, zero-init, gated 8 h runs | Two rejected (-7, -6); third: **12756** +6 vs mirror, every hunter worse | Shipped Oct 11 (strength, not adaptation) |
| Oct 8 | Live league instead of freeze-and-patch | `league.js` overnight, 7584 to 9334 | 9334 vs 7584: 52 vs 49 (no net gain); hunter2 fix faded | Forgets; built ship gate (+5 over mirror, no hunter gains >6) |
| Oct 8 | Faster trainer | PyTorch port (`torch_ppo.py`) | Update 9 s to 0.7 s; iter 4x faster | Kept |
| Oct 5 | Does patching hold? | Hunter 2 vs 7584 | Hunter2 beats 7584 77% (same as hunter1 vs 5135). Hole = tempo (7584 swings 14.7/min vs 31.7) | New hole as fast as the old one |
| Oct 4 | Patch the hunter's exploit | Run 5 with hunters, 11 h, 5135 to 7584 | 7584 beats hunter (33%); mirror passive (14.7 swings/min) | Patched; created hole #2 |
| Oct 4 | Scripted read layer bends the net's keys | `smb-brain-read.js` guard/drop reads, `readeval.js` | ±15 pt swings with ~0 read actions; vs hunter 33 to 37% | **Null.** Shipped OFF |
| Oct 3-4 | What exploits the shipped brain? | Hunter run vs frozen 5135 | Hunter 76% (mirror 53%); exploit = selective guard, more strings | Found hole #1. Also found MoveScene never ticked in sims (frozen matches) |
| Oct 3 | Brain drives Sovereign in the real game | `driveSovereign` | Beat user 10-9; even on openings, won on conversions; 16 supers, 0 KOs | Shipped. No evidence of learning in match |

### Brain era: building the fighter (Sep 28 - Oct 1)

| Date | Question | What we did | Key number | Verdict |
|---|---|---|---|---|
| Oct 1 | Is shield worth teaching? | `shieldtest.js`, scripted perfect guard, 150 eps/arm | Net shield ±0; perfect every-frame +4..+13; at net cadence +0..+1 | **No** (see conclusion 4) |
| Oct 1 | Guard drill + Sovereign phase (run 4) | Fast-swinging Sovereign opponents | Block rate ~1% flat across ~300 iters | **Null**; run died in a worker-stall spiral (leak fixed) |
| Sep 30 - Oct 1 | Opponent reads + fixed styles (run 3) | 17 opponent-tally inputs, human-proxy styles | Early memory gains vs turtle/rushdown shrank toward zero; Sovereign ~68% flat; 100-ep: 70% | Reading signal didn't persist |
| Sep 29 - 30 | Crowds + random class kits (run 2) | Obs 164 to 233 | Domains ~0 to ~35/40 iters; blocking ~1% | Machine stalled after 2h45m |
| Sep 28 - 29 | Can PPO learn to fight from keys? (run 1) | `js/smb-brain.js` + `tools/brain/`, 11.7 h | Vs cascade Sovereign 49% to 76%, expert 96%; never learned block/parry/domains | Became the new Sovereign |

### Cascade era: decision-level work (Aug - Sep 2026)

Full detail: [sovereign-adaptive-project.md](sovereign-adaptive-project.md) (Sep 23 - Oct 4),
[sovereign-lab-log.md](sovereign-lab-log.md) (lab loop, Sep 20-24),
[sovereign-observations.md](sovereign-observations.md) (measured findings to Sep 21).

| Date | Question | What we did | Key number | Verdict |
|---|---|---|---|---|
| Sep 27 | Committed plan gambling | `SMK2_TUNE.planGamble` | Vs shipped: -0.57 stocks (t=-7.1); vs epsilon layer +0.07 (null) | Menu is the bottleneck. OFF |
| Sep 23 | Let him choose any kit | Open arsenal + innate prior from discover runs | **+1.84 kills** vs proxy (t=12.3) | **Shipped.** Biggest lever |
| Sep 23 | Varek rage never reset | Fix in `respawn()` | Varek 10-stock win 60% to 47% | Fixed |
| Sep 23 | Habit veto / descent learners (C1, C2) | Per-opponent Thompson learners | ≤0.2 kills | Null-ish |
| Sep 23 | Kill floor | `_killFloorGovernor` | Floor ~85% pooled with governor | Shipped as disclosed safety net |
| Sep 21-23 | Can he derive mechanics himself? | Inference engine + discover runs (5,000 matches) | Recovered the clash rules (window 3, equal tiers, 120 f streak) from scratch | Detection only; nothing acts on it. See [sovereign-discoveries.md](sovereign-discoveries.md) |
| Sep 21 | Human ghost/mimic | Replay-based mimic | Copies style, not skill | Weak opponent |
| Sep 20 | Does the tactic grid choose anything? | Instrumented the 1,980-line cascade | Grid drives nothing; 4 branches own 81% of decisions; lab RNG was unseeded (past nulls void) | Tactic *choice* flags shipped |
| Sep 20-21 | Ten adaptation mechanisms | Lab A/Bs | Ten mechanisms, zero wins | See observations log |
| Sep 9 | Super hoarding | Replay review | Zero domains in 8 replays | Fire soon after full |
| Sep 6 | Loadout memory | Audit | `tried` always empty (coin-flip) | Fixed, later replaced by open arsenal |
| Aug 27 | Adaptation has no opponent terms | `_applyAdaptation` rework | Converged to same endpoint vs 3 opposite opponents | Opponent terms added |
| Aug 25 | Dials saturate in 6 s | Rework (fb50832, 65a3532) | Dials now reverse 4-10x per fight; A/B inconclusive (n=2 vs 1) | Unproven strength gain |
| Aug 23 | Does the genetic trainer help? | `SMK2Trainer`, 16 gens | No genome promoted; champion slot had always been empty | Machinery fine, genome can't express defence |
| Aug 23 | Launch governor | Kb guards | Guards only capped horizontal kb | Fixed |

### Cascade era: summer (Jul 2026)

Handoffs: [docs/handoffs/](handoffs/) (`HANDOFF_sovereign_2026-07-27/29`, `08-25/26/26b/27`).

| Date | What | Outcome |
|---|---|---|
| Jul 28 | Absolute Dominion domain | 19 supers, 1 domain in replay |
| Jul 27 | Perception whitelist | Couldn't see staff orb; fixed |
| Jul 10 | Villain reframe + 4.0.0 review | Lore: third force |
| Jul 8-9 | "Unbeatable" pass | Mercy systems removed (`_reactionMistakeRate` = 0 is the beatability knob); volley defense; Null Anchor stops ring-outs. Headless only |
| Jul 3 | Jitter, trade reads | Corner hysteresis |
| Jul 1 | Cadence overhaul | Was running 15x slow (units bug) |

---

## Open threads

- **Class-informed picks:** let the player's class feed `SovDossier` weapon picks
  (offered Nov 8, not started). This is the remaining lever, since picks don't come
  from training.
- **Human fight before any new candidate ships:** one replay-measured fight. Training
  candidates since Oct 25 drift toward more twitch.
- **Twitch penalty 0.025** (`twitchnight2.sh`) never ran.
- **Key-nav on The Circuit:** A/B with sov-duel before lifting the gate.
- **Human-surprise channel** (start episodes from replay states where a human opened
  him): designed Oct 8, never built.

---

## Tools and data

| Tool | Use |
|---|---|
| `tools/brain/train.js` | PPO trainer (`--torch --gru --hunt --hunters --habit --twitchpen --ref/--refkl --objw --styleshare --stylehp`) |
| `tools/brain/league.js` | Live league + ship gate + memory check |
| `tools/brain/hunteval.js` | Head-to-head eval: mirror vs hunter arm, stat columns are mirror then hunter |
| `tools/brain/adapt.js` | Memory ablation (`--wipe`, `--switch`) |
| `tools/brain/goalmatrix.js` | Objective x style matrix (`--hp=turtle:6.73,rushdown:7.66 --eps=150`) |
| `tools/brain/report.js`, `watch.js` | Training progress / watch a match |
| `tools/human-proxy.js` | Human-like fixed-style opponents |
| `tools/sov-lab.js`, `sov-habit-ab.js` | Cascade-era A/B rigs |

Run outputs live under `data/brain*/` (each has `night.log` or `league.log`, `evals/`).
Gotchas: other sessions rendering videos slow training ~3-10x; never `nice` a GRU run;
check that iter actually advanced before trusting a night's evals.
