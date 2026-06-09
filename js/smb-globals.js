'use strict';

// ============================================================
// CANVAS
// ============================================================
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;

// Logical game-space dimensions — all game coordinates use these
const GAME_W = 900;
const GAME_H = 520;

// Resize canvas to fill the browser window; game world stays GAME_W x GAME_H (fixed resolution)
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.imageSmoothingEnabled = true;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ============================================================
// SERVER SYNC CONFIGURATION
// ============================================================
// Set `url` to your server address so bans are enforced cross-device.
// Leave url as '' to run fully offline (bans are local-only).
//
// Deploying to Glitch / Railway / Render?
//   url: 'https://your-project.glitch.me'   ← no trailing slash
//
// Running locally?
//   url: 'http://localhost:3001'
//
const SERVER_CONFIG = {
  url:            'https://stickman-battles.onrender.com',
  syncIntervalMs: 300000,                     // re-sync bans every 5 min
};

// ============================================================
// CHANGELOG
// ============================================================
const CHANGELOG = [
  {
    version: '3.5.0',
    title: 'THE STORY & SOVEREIGN UPDATE',
    date: '2026-05-30',
    flavor: 'The story finally goes where it was always going. The worlds beyond the multiverse are open. Sovereign learned how you killed it. It won\'t let that happen twice.',
    isLatest: true,
    changes: [
      { cat: 'Story',   text: 'Completed Act VI — The Fallen God\'s Trial arc: three bridge chapters covering the God\'s origin vault, the first principles of the walls between dimensions, and the passage into the multiverse' },
      { cat: 'Story',   text: 'Added four full multiverse worlds — Null Space, Seraph World, Thresh, and Vael — each a self-contained 5-chapter arc with unique enemies, environments, and a world boss' },
      { cat: 'Story',   text: 'Added Act VII — Creator: 16 chapters across two arcs covering God\'s domain, the Kernel, Axiom\'s construct layer, and the two-phase Absolute Axiom fight' },
      { cat: 'Story',   text: 'Comprehensive difficulty balance pass across all acts — early chapters (Acts I–II) now properly onboard new players with 3 lives on the first fight; boss-tier encounters in Acts III–VI adjusted from 1-life spikes to 2-life escalations; intentional 1-life milestones preserved at key dramatic moments' },
      { cat: 'Story',   text: 'Twelve specific chapters rebalanced: ch0 (1L→3L), ch2 (1L→2L), ch8 (hard→medium AI), ch10 (2L→3L), ch11 (1L→2L), ch18 (expert→hard + 1L→2L), ch22 (1L→2L), ch25 (1L→2L), ch69 (2L→3L), ch79 (1L→2L), ch87 (1L→2L), ch91 (1L→2L)' },
      { cat: 'AI',      text: 'Sovereign death-to-adaptation pipeline — on death, Sovereign snapshots the exact kill context (weapon type, knockback weight, player action, combo depth); on the next life it immediately locks a counter strategy targeting whatever killed it; second death triggers limiter break with no warmup' },
      { cat: 'AI',      text: 'Sovereign opening weapon prior — reads the player\'s equipped weapon on frame 1 of the match and locks a preemptive counter strategy: ranged/magic → intercept + suffocate pressure; heavy/high-KB → parry lock; shield/knight → guard-break; default → suffocate' },
      { cat: 'AI',      text: 'Sovereign endlag punish window — tracks the exact frame count of the player\'s post-swing recovery (weapon.endlag); attacks without telegraph during this bounded window, closing the gap at 2× sprint speed if needed; window expires if not acted on, preventing false punishes' },
    ],
  },
  {
    version: '3.4.0',
    title: 'THE COMBAT POLISH UPDATE',
    date: '2026-05-28',
    flavor: 'Every weapon finally does what it says. Boomerangs leave your hand. Flames look like flames. The whip actually pulls. The balance is real this time.',
    isLatest: false,
    changes: [
      { cat: 'Combat',  text: 'Boomerang basic attack now throws a real visible boomerang that physically leaves the player\'s hand; the weapon disappears from the grip while in flight and reappears on return' },
      { cat: 'Combat',  text: 'Paper Airplane basic attack now fires a visible paper plane that leaves the player\'s hand; the Q ability (Barrage) now fires 5 correctly-shaped paper airplane projectiles instead of glowing circles' },
      { cat: 'Combat',  text: 'Flamethrower attack redesigned as a short-range cone of 3 flame projectiles drawn as layered teardrop flames, replacing the single generic bullet; Backdraft super (E) now fires a forward wave of 8 visual flame projectiles on activation' },
      { cat: 'Combat',  text: 'Whip hitbox extended — tip reach increased significantly (tipLen 50, 4 sample points, +10px hit tolerance); Lasso (Q) now hard-sets enemy velocity directly instead of adding to it for a reliable pull regardless of enemy movement; Lasso stun increased from 18 to 22 frames' },
      { cat: 'Combat',  text: 'Flail Chain Yank (Q) hitbox radius increased from 22 to 30px to register head-level hits; basic attack now launches the target slightly upward and spawns impact particles; Orbit Storm (E) duration extended from 65 to 85 frames and damage per contact increased from 12 to 16' },
      { cat: 'Combat',  text: 'Electric Staff Shock Bolt (Q) hitbox repositioned to upper-body check (y + h*0.3) and radius increased from 24 to 30px to correctly register hits on the head and shoulders; Thunderstrike (E) damage per bolt increased from 24 to 32 and area-of-effect radius widened from 58 to 62px' },
      { cat: 'Combat',  text: 'Katana Iaijutsu (Q) standing-still damage reduced from 42 to 28 — still the highest single-hit ability in the game, but no longer a one-shot for most fighters; Shadow Step (E) capped to 450px maximum teleport range' },
      { cat: 'Combat',  text: 'Broom Ride (Q) now cancels immediately on landing if fewer than 18 frames remain, preventing ground-level sliding after the aerial window closes' },
      { cat: 'Domain',  text: 'Gunner domain turrets heavily nerfed — damage halved from 24 to 12 and fire rate reduced from every 62 to every 140 frames; the domain is now a zoning presence rather than near-instant lethality' },
      { cat: 'Domain',  text: 'Domain expansion coverage now complete — Ronin (Death\'s Dojo), Reaper (Eternal Harvest), Pugilist (Iron Arena), and None class (Primal Surge) all have full domain expansions with unique hazards, sky effects, and entry cinematics; berserker domain now has weapon-specific hazards for every weapon category (bladed, heavy, ranged spray, ranged arc, electric)' },
      { cat: 'Visual',  text: 'Whip now draws a brief dashed rope line from the player to the struck target on both the basic hit and Lasso pull, making the weapon\'s reach visually legible' },
      { cat: 'Visual',  text: 'Flame projectiles rendered as directional teardrop shapes with layered orange/yellow glow instead of plain colored ellipses' },
      { cat: 'AI',      text: 'Bot paper airplane and boomerang AI updated to use the new throw system rather than the legacy bullet path' },
      { cat: 'Story',   text: 'Added cinematic narrative scene system — story chapters now play fully-directed canvas cutscenes with typewriter dialogue, speaker detection, camera keyframe animation, letterboxing, portal/shockwave/screen-flash effects, and per-beat NPC positioning' },
      { cat: 'Story',   text: 'Added per-chapter cinematic scene specs — each chapter has its own beat-by-beat camera choreography, effect timeline, and character staging' },
      { cat: 'Story',   text: 'Added 5 new interactive chapter types: stealth (guard detection, alarm system), escape (pursuer AI, timed exit), defense (wave hold-point), scavenge (collectibles with enemy patrols), and assassination (target marking, silent-kill bonus)' },
      { cat: 'Story',   text: 'Added a new multiverse arc where trust is the only casualty that matters; someone knows exactly what to say, and exactly when to say it; what happens at the end cannot be undone', spoilerAct: 4 },
      { cat: 'Boss',    text: 'A certain secret boss was completely reworked — a fight of this scale demands more than a health bar; multiple thresholds now trigger cinematic moments; a late-fight mechanic changes the rules entirely; find out yourself', spoilerLevel: 3 },
      { cat: 'Visual',  text: 'Added AniFX — a suite of anime-style cinematic effect utilities: pulsing aura rings, radial speed-line bursts, charge-up glow effects, and stickman afterimage silhouettes; used throughout boss threshold cinematics' },
      { cat: 'Polish',  text: 'Camera HUD clamp overhauled — guarantees the topmost active player always appears at least 24px below the HUD bar at any camera zoom level; eliminates players being obscured by the health bar' },
    ],
  },
  {
    version: '3.3.0',
    title: 'THE DOMAIN UPDATE',
    date: '2026-05-18',
    flavor: 'Every fighter carries a world inside them. Use your super five times and it erupts — a 25-second nightmare born from who you are. The arena is no longer neutral ground.',
    isLatest: false,
    changes: [
      { cat: 'Mode',    text: 'Added Domain Expansion — once you activate your super 5 times in a match, your class unleashes its personal Domain: a 25-second environmental takeover that floods the arena with class-specific hazards; each class has a unique named domain with its own atmosphere, hazard type, and owner buff' },
      { cat: 'Mode',    text: 'Domain roster — Thor: Storm Realm (relentless lightning strikes, speed boost); Kratos: Spartan War Domain (debris barrages, power boost); Ninja: Shadow Realm (shadow blade volleys, speed boost); Gunner: Arsenal Domain (bullet storm); Archer: Verdant Hunt (arrow curtain); Paladin: Holy Sanctuary (holy beams, passive heal); Berserker: Blood Arena (speed + power + lifesteal, no environmental hazard — pure stats); further domains are unlocked through progression' },
      { cat: 'Mode',    text: 'Domain entry plays a full cinematic sequence: world darkens, the class name card slams onto screen, a Dutch camera tilt locks in, and the arena atmosphere shifts to match the domain\'s color and sky; sudden death is suppressed for the full duration' },
      { cat: 'Arena',   text: 'Added Training Grounds — a clean symmetry-balanced stage with 8 platforms across 4 height tiers; designed for combo drills, jump practice, and aerial/edge-guard training; only accessible in Training mode' },
      { cat: 'Visual',  text: 'Added cinematic speed lines — radial and directional burst effects used during finishers, Domain entry, and heavy cinematic hits; cone, spread, count, and length are fully configurable' },
      { cat: 'Visual',  text: 'Added impact frames — hard-cut color flash with entity silhouettes on the heaviest moments; gives a manga / fighting-game punctuation feel to KO blows and Domain activations' },
      { cat: 'Visual',  text: 'Added move name cards — a bold text card slams onto screen at frame 18 of any finisher displaying the move\'s name; fades after ~1.5 seconds' },
      { cat: 'Visual',  text: 'Added motion trails — a semi-transparent echo strip traces the attacker\'s path for the duration of every finisher; auto-enabled on entry, auto-cleared on exit' },
      { cat: 'Visual',  text: 'Added Dutch angle (world tilt) — the game world can now rotate to a biased angle for dramatic effect; used during Domain entry and select finisher moments; angle lerps smoothly in and out' },
      { cat: 'Visual',  text: 'Added directional screen shake — shake can be biased in a specific direction (e.g., straight down on a ground slam) for the first several frames before falling back to random; removes the ambiguous rattle on precision impacts' },
      { cat: 'Visual',  text: 'Added background contrast shift — a momentary color-tinted overlay pulses over the background at peak impact moments for a brief, punchy visual accent' },
      { cat: 'Visual',  text: 'Void Slam finisher rebuilt with full cinematic suite: Dutch tilt at the peak hold, radial speed lines during the lift, downward speed lines at the drop, directional downward shake on impact, impact frame flash, and background contrast pulse; the hit frame is 47% harder to look away from than before' },
      { cat: 'Achieve', text: 'Added 20+ new achievements — Finishing Touch (first finisher), Finisher Master (10 finishers in one session), Connected (first online win), Class Collector (win as 5 different classes in one session), Sovereign Slayer (defeat Sovereign Ω), Legend (50 total wins)' },
      { cat: 'Achieve', text: 'Story achievements added — The Journey Begins (complete your first Story chapter), End of the Line (complete full Story Mode), Lab Infiltrator (complete the Laboratory side mission)' },
      { cat: 'Achieve', text: 'Multiverse achievements added — Multiverse Warrior (conquer your first Multiverse world), Dimension Breaker (conquer all Multiverse worlds)' },
      { cat: 'Achieve', text: 'Progression achievements added — Fracture Explorer (enter a Fracture for the first time), Axiom Ship Complete (build the full Axiom Ship); Nexus Defender (survive 5 Nexus Defense waves); Pure Chaos (activate all chaos modifiers at once); Beyond Godhood (a secret — you\'ll know it when you see it)' },
      { cat: 'Combat',  text: 'Melee hitboxes tightened — vertical tolerance reduced from ±8 px to ±4 px; directional pruning added so hit points more than 12 px behind the attacker\'s facing direction are discarded; reduces phantom hits above/below and on rapid-turnaround frames' },
      { cat: 'Combat',  text: 'Thor perk reworked — now fires 2 lightning strikes (was 3) after a 600 ms visual windup that telegraphs the attack; damage is now routed through the full combat pipeline so shields, multipliers, and combo limits apply; stun reduced from 45 to 25 frames; both bolts are fully dodgeable' },
      { cat: 'Combat',  text: 'Damage multiplier cap — combined attacker buffs (class rage, abilities, map perks) are now capped at 3.5× the original hit value; prevents multiplicative stack-spikes at high-buff states while leaving normal combat completely unaffected' },
      { cat: 'AI',      text: 'Sovereign habit window extended from 6 to 12 recent actions for more stable pattern reads; anti-air counter now activates at 38% jump rate (was 50%), catching aerial-preference players sooner; habit confidence is penalised when the player mixes 3+ distinct action types in rapid succession' },
      { cat: 'AI',      text: 'Sovereign aerial tracking — Sovereign now tracks what fraction of the match the player spends airborne; once this exceeds 35%, it proactively jumps to match the player\'s altitude and engage in the air rather than waiting on the ground' },
      { cat: 'AI',      text: 'Sovereign edge-camp counter overhauled — the old brute-force charge is replaced with a bait-and-punish loop: Sovereign holds just outside attack range to force a commitment, then dashes in on the whiff; corner mode activates immediately to block the escape path back to center' },
      { cat: 'AI',      text: 'Sovereign matches always grant the player at least 5 lives regardless of the lives setting, ensuring enough rounds for the AI to fully ramp before a result is decided' },
      { cat: 'Polish',  text: 'Camera HUD clamp — when players are near the top of the screen, the camera shifts down so they are never hidden behind the HUD bar' },
      { cat: 'Polish',  text: 'Boss and TF attack states are fully reset on every game start, preventing hazards from a previous match from carrying damage or state into the next one' },
    ],
  },
  {
    version: '3.2.0',
    title: 'THE APEX UPDATE',
    date: '2026-05-10',
    flavor: 'A hundred fighters fall from the sky. A god and a kernel merge into something that should not exist. The floor rises. The clock runs out. Welcome to the end.',
    isLatest: false,
    changes: [
      { cat: 'Mode',    text: 'Added Battle Royale — 100 fighters, a 9000px-wide procedural world, a transport plane drop, loot chests, a shrinking void zone with 6 phases, spectate-on-death, and a real-time minimap; the last fighter standing wins' },
      { cat: 'Mode',    text: 'Battle Royale loot system — 200 chests scattered across 30 platform rows; chests contain weapons drawn from the full roster; equipped weapon updates the fighter\'s full combat state mid-match' },
      { cat: 'Story',   text: 'Added Escort chapter type — protect an NPC as it walks toward a goal; enemies spawn in configurable waves triggered by NPC position; NPC pauses when an enemy enters its stop range; chapter fails if NPC health reaches zero' },
      { cat: 'Entity',  text: 'Added Absolute Axiom — a secret final boss (God + Kernel merged); three power phases with escalating stats and distinct attack pools; attacks include Time Freeze, Inferno Rain, Gravity Singularity, and Kernel Beam; pattern analysis adapts the attack selection to player behaviour over the fight', spoilerLevel: 3 },
      { cat: 'Entity',  text: 'Absolute Axiom has a dedicated defeat card and unlocks the "Absolute Axiom Slayer" achievement; cannot be encountered while another secret boss is active', spoilerLevel: 3 },
      { cat: 'Combat',  text: 'Added parry system — shielding at stack 1 within the first 8 frames of an incoming hit has a 65% parry chance (30% at frames 9–15, 0% after); a successful parry stuns the attacker for 90 frames and opens a 1.5× damage vulnerability window' },
      { cat: 'Combat',  text: 'Added armor system — story enemies can equip helmet (−12% damage taken), chestplate (−15%), and leggings (−8%), stacking up to −40%; reduction is applied inside dealDamage() after all other multipliers' },
      { cat: 'Combat',  text: 'Shield completely rebuilt — stacks 1–3 use HP-based absorption that degrades on each activation; stacks 4–6 use percentage pass-through (20% / 50% / 80%); stacks reset after a full recharge timer; bots respect the depletion state before shielding' },
      { cat: 'Camera',  text: 'Added DuelCam — when exactly 2 active fighters remain, the camera switches to a smooth midpoint mode with distance-based zoom; separate lerp targets prevent the duel cam from fighting the standard camera; tightens further when fighters are within close range' },
      { cat: 'Camera',  text: 'Added hit-zoom — heavy hits (≥18 damage) zoom the camera in for 15–22 frames; cosmic hits zoom further; intensity scales with damage value' },
      { cat: 'Camera',  text: 'Added cinematic camera overshoot — dramatic camera moves add a decaying X/Y overshoot so the camera swings past its target and settles; eliminates the flat teleport feel on phase transitions and finishers' },
      { cat: 'Admin',   text: 'Added LiveOps admin panel — full server control UI with live config editing, broadcast dispatch, per-player coin grants, cosmetic grants, unlock tools, and server log streaming' },
      { cat: 'Admin',   text: 'Added admin session bridge — short-lived server session tokens replace the permanent admin key in the browser; the secret lives only on the server; tokens expire after 30 minutes of inactivity' },
      { cat: 'Polish',  text: 'Added post-match stats screen — game-over overlay now shows a MATCH SUMMARY header with elapsed time, KOs, and total damage dealt (highlighted in gold) for every player; boss and minion entries are filtered out' },
      { cat: 'Polish',  text: 'Added match announcer — canvas text bursts fire at key moments: FIRST BLOOD (first KO), LAST STOCK (player drops to final life), COMEBACK (trailing player scores a KO), ON FIRE (every 3rd kill by the same player); suppressed during cinematics' },
      { cat: 'Polish',  text: 'Added 2P arena vote screen — in local 2-player matches both players navigate a 4-column arena grid (P1: A/D/W/S + Space; P2: J/L/I/K + U); same pick wins outright; different picks go to a random tiebreak between the two; cards are clickable as a fallback' },
      { cat: 'Polish',  text: 'Added rematch countdown — after standard PvP and vs-bot matches the Play Again button counts down from 10 and auto-restarts; clicking Menu or Play Again cancels it immediately; disabled for story, boss, TrueForm, online, and KotH' },
      { cat: 'Polish',  text: 'Added sudden death rising floor — at 75 seconds a warning fires; at 90 seconds a lava floor rises from below the screen at 0.5 px/frame, stopping at 50% screen height; the floor platform is disabled and lava burn damage begins; activates in standard PvP and vs-bot matches only' },
      { cat: 'Polish',  text: 'Added hit effectiveness HUD — a pulsing "⚡ PHASE BREAK" label appears when the boss is within 7.5% HP of a phase transition; combo streaks against the boss or Sovereign display on the right edge with escalating labels (COMBO, HOT STREAK ×3, UNSTOPPABLE ×5, OBLITERATE ×8) and a flash burst on each new hit' },
      { cat: 'AI',      text: 'Sovereign AI sharpened — observation window cut from 3 s / 6 actions to 0.7 s / 2 actions so pattern reads happen almost immediately; adaptation rate raised from ~7.5 to ~12 ticks per second; prediction confidence floor lowered; preemptive counter range widened; spam detection triggers at 3 repeated actions instead of 4; limiter break fires at intelligence ≥ 0.76 (was 0.82) and HP ≤ 48% (was 38%); after a stagger window closes Sovereign immediately arms a punish counter and says "My turn."' },
      { cat: 'System',  text: 'Added match replay system — the last 3 matches are recorded as input-log snapshots at ~20 fps and stored in IndexedDB; a Save Replay button on the post-match screen downloads the recording as a JSON file; each file embeds the game version and mismatched versions are rejected at load time; battle royale, training, and exploration are excluded from recording' },
    ],
  },
  {
    version: '3.1.0',
    title: 'THE GAUNTLET UPDATE',
    date: '2026-05-03',
    flavor: 'Story Mode is no longer a corridor. It\'s a system — eight ways to play, one world that uses all of them.',
    isLatest: false,
    changes: [
      { cat: 'Story',  text: 'Story Mode chapters are now multi-phase gauntlets — every fight chapter runs through a pacing engine that builds a sequence of 3–4 phases before the final encounter; boss and True Form chapters are excluded and launch directly as before' },
      { cat: 'Story',  text: 'Added Chase phase archetype — a timed traversal with a countdown bar; if the timer expires the run ends immediately; fires at chapters 24, 31, 38, 45 and later' },
      { cat: 'Story',  text: 'Added Survival Wave phase archetype — wave-defence mode in a compact 900px arena; enemies spawn in escalating waves from a state machine (countdown → active → between → victory); the arena locks the camera for the duration; fires at chapters 15, 20, 25, 30 and later' },
      { cat: 'Story',  text: 'Added Puzzle Lock phase archetype — replaces the opening phase with a mechanic challenge; three rotating variants: Timed Duel (one life, no mistakes), Marked Target (eliminate the priority target first), Platform Switch (high-ground advantage active); fires at chapters 11, 21, 41 and later' },
      { cat: 'Story',  text: 'Added Parkour phase archetype — a pure platforming run with no arena-lock combat, tight jump geometry, and sparse enemy spawns; fires at chapters 16, 32, 48, 64' },
      { cat: 'Story',  text: 'Added Branch/Choice phase archetype — narrative crossroads chapters where the player makes a persistent choice; flags are stored in save data and can affect later chapter dialogue; three branch points added: "The Weight of It" (ch. 26), "The Split" (ch. 47), and "What Veran Didn\'t Say" (ch. 49)' },
      { cat: 'Story',  text: 'Story HUD now shows a chase countdown bar (green → yellow → red, flashing white under 10s) and a survival wave indicator (wave number, dot pip progress, kill-bar fill, flashing orange when a wave is active)' },
      { cat: 'Story',  text: 'Ch. 7 "The Long Walk" given a custom phase sequence: traversal → chase (patrol lockdown) → survival wave (hold the beacon) → mini-boss; auto-generation is bypassed' },
      { cat: 'Story',  text: 'Ch. 52 "Signal Maze" given a custom phase sequence: parkour (scrambled geometry run) → survival wave (interference surge) → elite encounter → mini-boss; auto-generation is bypassed' },
      { cat: 'Story',  text: 'Pacing schedule is deterministic and collision-free across all 80+ chapters — each archetype fires at a fixed stride with a guaranteed-free offset so no two archetypes claim the same chapter' },
      { cat: 'Entity', text: 'Added GodParadoxAlly to the God Phase 2 encounter — a flying blue entity that targets God exclusively, orbits its position, and delivers melee attacks; phases through all surfaces; cannot be harmed by the player', spoilerLevel: 2 },
      { cat: 'Arena',  text: 'Added God Domain arena — a dedicated divine stage for the God encounter; deep purple theme, oscillating platforms (3 moving horizontally, 2 moving vertically), divine eye-portal background elements, and a particle storm that intensifies as God loses health' },
      { cat: 'Visual', text: 'Godslayer armor visual rebuilt — golden gradient helmet with three crown spikes, pulsing golden glow, and a divine aura tied to the Godslayer weapon; renders as a distinct crown silhouette during the God Phase 2 fight', spoilerLevel: 2 },
      { cat: 'Visual', text: 'Fighter floor shadow improved — renders as a depth-scaled ellipse that tracks the ground plane with correct alpha falloff; replaces the old fixed-offset dot shadow' },
      { cat: 'System', text: 'Unlock rewards are now server-authoritative — coin grants, story unlocks, and achievement flags are validated through a server call before being written to the save; prevents client-side manipulation of progression state' },
      { cat: 'System', text: 'Branch choice flags are persisted to story save data (branchFlags map) and restored into storyState.flags on load; flags survive session resets and cloud sync' },
    ],
  },
  {
    version: '3.0.0',
    title: 'THE EVOLUTION UPDATE',
    date: '2026-05-01',
    flavor: 'A knight falls from the sky. A divine being issues a challenge. The system goes live. Everything adapts.',
    isLatest: false,
    changes: [
      { cat: 'Entity',  text: 'God Phase 2 fully built — Phase 2 now includes two new special attacks: Angel Fleet (spawns waves of HolyAngel minions from above) and Divine Columns (targeted light pillars that detonate for AoE damage); Phase 2 movement and attack timing tuned separately from Phase 1', spoilerLevel: 2 },
      { cat: 'Mode',    text: 'Added God Challenge prompt — when God returns to a player who has already defeated it, a modal offers the choice to accept or decline a direct God encounter; accepting immediately launches a dedicated God fight outside normal match flow', spoilerLevel: 2 },
      { cat: 'AI',      text: 'Sovereign mode now starts at near-peak intelligence — limiter is broken from round 1, aggression and reaction speed are pre-maxed, and evolution begins at stage DOMINATING; the player faces a fully capable Sovereign from the first exchange' },
      { cat: 'Mode',    text: 'Sovereign mode bans ranged weapons for the player — kiting bypasses all of Sovereign\'s adaptation systems; the fight is locked to melee' },
      { cat: 'Mode',    text: 'Added Sovereign arena — "The Circuit": a dedicated melee-only stage for Sovereign fights; symmetric 5-platform layout, tight spacing with no ranged safe distance, no hazards, no arena randomization; Sovereign always uses Nullblade here' },
      { cat: 'System',  text: 'Added LiveOps system (smb-liveops.js) — fetches a live config from the server every 60 seconds; supports MOTD banners (shown in menu, hidden during fights), coin multiplier events, XP multiplier events, shop rotation overrides, and per-key balance patches; toasts queue during active fights and flush on return to menu' },
      { cat: 'System',  text: 'Added cloud save via Supabase — create a free account to sync unlocks, story progress, cosmetics, and coins across devices; sign-up, sign-in, and sign-out flow wired into the account UI; auth state changes trigger a runtime refresh automatically' },
      { cat: 'System',  text: 'Save system rebuilt on a canonical single source of truth — all coin reads/writes go through getCoins/setCoins/addCoins; all save writes go through a unified canonical path keyed to the active account; account switches trigger forceRehydrateFromAccount to guarantee a clean runtime state' },
      { cat: 'System',  text: 'Story progress is now cloud-synced — save reconciliation compares local and cloud story state by timestamp; the more advanced save wins; no progress is lost on sign-in or account switch' },
      { cat: 'Account', text: 'Admin system extended with Supabase email auth — accounts whose signed-in Supabase email matches the ADMIN_EMAILS list receive admin access on any device without requiring a hardcoded account ID' },
      { cat: 'Account', text: 'Added Moderator role — moderators get a teal console theme with a MOD badge; mod-specific console commands include bancheck and notify; the console auto-unlocks for admins, devs, and mods without a password gate' },
      { cat: 'AI',      text: 'Fighter targeting now prioritises players — any player within 350 px is always targeted over other entities; beyond that range the nearest entity wins; prevents bots from ignoring the player to attack minions during mixed encounters' },
      { cat: 'UI',      text: 'Canvas now letterboxes on small screens — on viewports under 900×600 the game scales down while maintaining the 900×520 aspect ratio with centred margins; prevents clipping on mobile and small windows' },
      { cat: 'Audio',   text: 'Added file-based audio system — sounds are fetched as raw ArrayBuffers at load time and decoded to AudioBuffer on first play; decoded buffers are cached for subsequent calls;' },
    ],
  },
  {
    version: '2.9.0',
    title: 'THE GOD UPDATE',
    date: '2026-04-26',
    flavor: 'Something older than the Creator. Something that was never meant to be found. It found you anyway.',
    isLatest: false,
    changes: [
      { cat: 'Mode',    text: 'Added God encounter — a hidden entity that can appear in any non-story match with a 1-in-1,000,000 chance per second; chance rises to 1-in-10,000 after beating Sovereign or surviving a prior encounter, and 1-in-5,000 after defeating God; a 10-minute in-game cooldown prevents back-to-back appearances' },
      { cat: 'Mode',    text: 'God fight has two phases — Phase 1 is a one-sided encounter; Phase 2 unlocks after a prior encounter or Sovereign defeat and changes the fight entirely', spoilerLevel: 2 },
      { cat: 'Mode',    text: 'Added Godslayer — a heavy melee weapon with 180 base damage and the Divine Strike ability (lunge + 380 damage burst); granted automatically when Phase 2 begins', spoilerLevel: 2 },
      { cat: 'Entity',  text: 'God is a white stickman with a glowing halo; tracks the nearest player and has a hard 160px attack range gate enforced at the combat system level' },
      { cat: 'Entity',  text: 'Added a second combatant to the Phase 2 God fight — a familiar face returns as an ally, fights God autonomously, and cannot be harmed by the player', spoilerLevel: 2 },
      { cat: 'Combat',  text: 'Something happens the first time God hits you — find out yourself', spoilerLevel: 2 },
      { cat: 'Combat',  text: 'God hard range gate added to dealDamage() — God attacks skip the damage pipeline entirely if the target is more than 160px away; enforced above all AI-layer decisions' },
      { cat: 'System',  text: 'Added cloud save system — create a free account and your progress syncs automatically across devices; unlocks, story chapters, cosmetics, and fracture state are all preserved' },
      { cat: 'System',  text: 'Save reconciliation on login merges local and cloud data non-destructively — unlocks, letters, achievements, and blueprints take the union; numeric stats keep the highest value; fracture branches merge by ID taking max progress; no progress is ever overwritten on sign-in' },
      { cat: 'System',  text: 'Save schema updated to v3 — adds coins, cosmetics, and new unlock flags (godEncountered, godDefeated, sovereignBeaten, storyOnline, paradoxCompanion, storyDodgeUnlocked, interTravel, patrolMode); existing saves migrate automatically on load' },
      { cat: 'System',  text: 'All unlock writes (boss beaten, letters, True Form, Sovereign, God, TF Ending, Patrol Mode, Inter-Travel, Dodge Roll) now route through a centralized account-flag system — unlocks persist correctly on account switches and no longer require a full saveGame() call' },
      { cat: 'System',  text: 'Added debounced save queue — all save triggers batch into a single write per tick; prevents excessive localStorage writes during rapid state changes' },
      { cat: 'System',  text: 'Added "Save Your Progress" prompt — appears after completing Chapter 1 if not signed into a cloud account; one-time nudge with direct sign-up flow' },
      { cat: 'Account', text: 'Accounts now support password protection — set a password to lock your account; a 12-character recovery code is generated on password creation in case you forget it' },
      { cat: 'Account', text: 'Account hydration is now keyed by account ID — switching accounts triggers a full runtime refresh; re-loading the same account in the same session is skipped to avoid overwriting in-session progress' },
      { cat: 'UI',      text: 'Added home quick-nav bar — Account & Saves, Store, Settings, and Community buttons always visible on the main menu without scrolling' },
      { cat: 'UI',      text: 'Settings rebuilt as a full modal overlay — organized into Graphics, Audio, Account & Data, Advanced, and Reset sections; replaces the old inline panel toggle' },
      { cat: 'UI',      text: 'Added Community modal — Discord link and community info accessible from the nav bar and footer' },
      { cat: 'UI',      text: 'Footer condensed — Achievements, Updates, and Community pills replace the old scattered footer buttons' },
      { cat: 'Debug',   text: 'Added spawn/summon god console commands — spawns God without crash behavior for dev testing; God is a singleton and cannot be double-spawned' },
      { cat: 'Achievement', text: 'Added "God Slayer" achievement — awarded on defeating God', spoilerLevel: 2 },
    ],
  },
  {
    version: '2.8.0',
    title: 'THE LOOP UPDATE',
    date: '2026-04-15',
    flavor: 'Before you can reach True Form, it reaches you first. Escape the loop. Uncover what started it all. And take your shape.',
    isLatest: false,
    changes: [
      { cat: 'Story',   text: 'Added Eternal Damnation arc (Act 5, Ch. 91–92) — True Form sends an echo of itself inward before the player arrives; the dimension wall seals, trapping the player in a dying loop with 17 fractured echoes of past enemies', spoilerAct: 5 },
      { cat: 'Story',   text: 'Added Damnation arena — a crumbling loop-dimension stage exclusive to the Eternal Damnation gauntlet; platforms are removed in sequence as the escape window closes', spoilerAct: 5 },
      { cat: 'Story',   text: 'Added Lab Infiltration side mission (Ch. 93) — an abandoned research facility buried under a collapsed district; logs inside reveal the fractures were not an accident', spoilerAct: 5 },
      { cat: 'System',  text: 'Added Cosmetic Store — earn ⬡ coins by playing matches (5 per match, +10 for winning, +20 for beating the boss); spend them on character skins and weapon themes' },
      { cat: 'System',  text: 'Added 6 character skins (Fire, Ice, Shadow, Gold, Void, Neon) and 6 weapon themes (Inferno, Glacier, Shadow, Gilded, Void, Neon); defaults are free, rarer skins require coins' },
      { cat: 'AI',      text: 'Rewrote enemy combat logic with Modular Combat AI — three-class architecture (CombatSystem, MovementSystem, AIController) replaces frame-by-frame reactions with utility-scored action selection, reaction delays, and suboptimal-choice variance' },
    ],
  },
  {
    version: '2.7.0',
    title: 'THE FRACTURE UPDATE',
    date: '2026-04-08',
    flavor: 'Reality is cracking. Four dimensions await — each ruled by someone you once called a friend. Build your ship. Cross the fractures. Face what you became.',
    isLatest: false,
    changes: [
      { cat: 'Mode',     text: 'Added Multiverse Mode — travel across 4 dimensional worlds (War-Torn, Gravity Flux, Shadow Realm, Titan World), each with unique AI modifiers, encounter progressions, and Fallen God observer dialogue' },
      { cat: 'Mode',     text: 'Each Multiverse world has 4 encounter tiers: standard, elite (2-enemy), survival wave, and ruler boss fight with persistent stat rewards' },
      { cat: 'System',   text: 'Added Ship Progression System — collect 5 ship parts (hull ×5, engine, core, crystal) scattered across story chapters; when complete, Axiom\'s ship is built and full fracture branch access unlocks' },
      { cat: 'System',   text: 'Added Fracture System — visible interdimensional tears appear in-world; before ship is built, only a 10-second preview with one branch guardian; after ship built, full branch entry and ruler boss fight available' },
      { cat: 'System',   text: 'Three fracture branches added: Alpha Branch (Vael), Null Branch (Kael), Crimson Branch (Sora) — each with its own ruler, lore, and combat challenge', spoilerAct: 4 },
      { cat: 'System',   text: 'Added Lore Moment system — ambient story beats fire at key progression milestones (first fracture, ship completion, ruler defeat) and persist across sessions' },
      { cat: 'System',   text: 'Added Motivation Tracker — narrative context updates dynamically as Axiom\'s investigation progresses toward True Form' },
      { cat: 'Polish',   text: 'Arena rendering pipeline split: Soccer and Void arena draw calls extracted to dedicated rendering submodule (js/rendering/smb-drawing-arenas.js) for cleaner separation' },
    ],
  },
  {
    version: '2.6.0',
    title: 'THE SOVEREIGN UPDATE',
    date: '2026-04-01',
    flavor: 'A new intelligence rises. Save your progress, command the stage, and face an opponent that refuses to be beaten the same way twice.',
    isLatest: false,
    changes: [
      { cat: 'Mode',     text: 'Added SOVEREIGN Ω — a next-gen adaptive AI mode unlocked by beating SOVEREIGN in Story Mode; features bigram sequence learning, spam punishment, limiter-break power-up, anti-exploit detection, and humanized early delays' },
      { cat: 'Mode',     text: 'Added Complete Randomizer — a 2P variant that randomizes both fighters\' weapon, class, and arena every match' },
      { cat: 'Mode',     text: 'Added Story Online mode — unlocked on Story completion; plays online multiplayer within the story\'s arena and rule set' },
      { cat: 'System',   text: 'Added persistent Save System — full game state (unlocks, achievements, story progress, settings) serialized to a single localStorage key with export-to-clipboard and file import/export' },
      { cat: 'System',   text: 'Added Game Director — real-time match intensity tracker that accelerates arena hazards and pacing events to prevent stale lulls' },
      { cat: 'System',   text: 'Added Cutscene System (smb-cutscene.js) — deterministic step-based cutscene engine with control lock, freeze physics, and per-step onEnter/onTick/onExit hooks; replaces ad-hoc timer sequences' },
      { cat: 'AI',       text: 'Pathfinding upgraded to v4 — predictive arc-based platform pathfinding; bots now plan multi-hop routes via a platform graph instead of reacting frame-by-frame' },
      { cat: 'AI',       text: 'Added Map Analyzer v2 — static analysis of arena platform graphs pre-computes node adjacency and jump arcs, feeding both pathfinding and AI navigation' },
      { cat: 'Music',    text: 'Added background music via YouTube IFrame API — separate normal and boss tracks; switches automatically between combat states; mutable independently from SFX' },
      { cat: 'System',   text: 'Added Error Boundary module — global error handler catches module-load failures and shows a friendly recovery overlay instead of a blank screen' },
    ],
  },
  {
    version: '2.5.0',
    title: 'THE PARADOX UPDATE',
    date: '2026-03-28',
    flavor: 'A multiversal being steps out of the background. Nothing about the Creator fight — or the True Form — will ever feel the same.',
    isLatest: false,
    requiredProgress: 1,
    changes: [
      { cat: 'Narrative', text: 'Introduced Paradox — a multiversal entity that exists at the edge of every major fight as a hidden force' },
      { cat: 'Cinematic', text: 'True Form fight now opens with a 7-second pre-fight cinematic: Paradox and True Form clash evenly, True Form escalates, snaps Paradox\'s neck, and hurls them into a portal', spoilerLevel: 2 },
      { cat: 'Cinematic', text: 'New 5-second cinematic at 30% True Form HP: True Form warps away, returns dragging Paradox, and attacks them repeatedly before the final stretch', spoilerLevel: 2 },
      { cat: 'Cinematic', text: 'Creator fight now shows random background flashes of True Form and Paradox fighting as silhouettes (under 1 second each, every 11–20 seconds)' },
      { cat: 'Cinematic', text: 'Creator fight scripted moment at 50% HP: Boss punches Paradox out of the arena with a particle burst and unique dialogue' },
      { cat: 'Mechanic',  text: 'True Form fight now begins with a damage lock phase — player deals 0 damage until Paradox Empowerment activates (8 seconds)', spoilerLevel: 2 },
      { cat: 'Mechanic',  text: 'Paradox Empowerment grants 1.4× speed and 1.6× damage for 15 seconds with a pulsing cyan aura, restoring full combat after the lock', spoilerLevel: 2 },
      { cat: 'System',    text: 'Revive system reworked: Paradox now appears as a visual entity during the boss mercy revive, delivering randomized dialogue before restoring 2 lives' },
      { cat: 'Polish',    text: 'Paradox entity features a flickering black/cyan stickman with glitch offsets, scan-line artifacts, and a cyan particle trail' },
      { cat: 'Polish',    text: 'Damage lock shows grey "0" hit numbers so the player knows the lock is active rather than feeling like a bug', spoilerLevel: 2 },
    ],
  },
  {
    version: '2.4.4',
    title: 'STORY GAUNTLET OVERHAUL',
    date: '2026-03-27',
    flavor: 'Story Mode now fights back like a real progression gauntlet instead of a quick sprint.',
    isLatest: false,
    changes: [
      { cat: 'Story',    text: 'Story chapters now auto-build into 3–5 phase gauntlets with traversal, arena locks, elite waves, hazards, and mini-boss finishes' },
      { cat: 'Story',    text: 'Exploration pacing was expanded with stronger enemy pressure, checkpoint bursts, ambush punish, side portals, and optional Distorted Rift encounters' },
      { cat: 'Story',    text: 'Chapter difficulty now scales from chapter progression plus player performance, including stronger elite variants and denser encounter caps' },
      { cat: 'Economy',  text: 'Tokens now power a real between-chapter shop with healing, permanent damage upgrades, and survivability upgrades' },
      { cat: 'UI',       text: 'Story HUD now shows the current gauntlet phase clearly during both combat and traversal sections' },
      { cat: 'Balance',  text: 'Story carryover health and progression upgrades make long-form runs matter instead of resetting into isolated demo fights' },
    ],
  },
  {
    version: '2.0.0',
    title: 'THE ARCHITECT UPDATE',
    date: '2026-03-25',
    flavor: 'The Code Realm has been fixed. SOVEREIGN awaits challengers.',
    isLatest: false,
    requiredProgress: 1,
    changes: [
      { cat: 'Fix',      text: 'True Form Code Realm: added double-jump so all 5 nodes are reachable', spoilerLevel: 2 },
      { cat: 'Fix',      text: 'True Form Code Realm: lowered unreachable high nodes to proper jump height', spoilerLevel: 2 },
      { cat: 'Fix',      text: 'QTE: movement keys (WASD/arrows) now register correctly mid-QTE' },
      { cat: 'Fix',      text: 'QTE: phases now end after max attempts with penalty damage instead of looping forever' },
      { cat: 'Fix',      text: 'Large maps: camera now clamps to world bounds and no longer drifts off-edge' },
      { cat: 'Fix',      text: 'Large maps: both players no longer spawn at the same position' },
      { cat: 'Fix',      text: 'Boss dialogue bubble now scales correctly when camera is zoomed out' },
      { cat: 'Fix',      text: 'Background void no longer visible when zooming out on any map' },
      { cat: 'Balance',  text: 'Reduced large map platforms from 40+ to ~27 with better spread and landmark bridges' },
      { cat: 'AI',       text: 'Beating SOVEREIGN in Story Mode now unlocks Neural AI as a standalone gamemode' },
      { cat: 'Polish',   text: 'Damage numbers: color-coded by severity with glow on heavy hits' },
      { cat: 'Polish',   text: 'Screen shake now scales with hit damage; no longer jitters at near-zero values' },
      { cat: 'Polish',   text: 'Red vignette overlay when player takes heavy damage' },
    ],
  },
  {
    version: '1.0.0',
    title: 'FULL RELEASE — FRACTURE CAMPAIGN',
    date: '2026-03-24',
    flavor: 'Reality patch applied. All dimensional rifts sealed.',
    requiredProgress: 1,
    changes: [
      { cat: 'Story',    text: 'Added full Story Mode — 80 chapters across 6 Acts' },
      { cat: 'Story',    text: 'Added Act / Arc navigation system with chapter select' },
      { cat: 'Story',    text: 'Implemented exploration chapters and cutscene dialogues' },
      { cat: 'Story',    text: 'Added major narrative twist: the fragment is the Creator\'s conscience', spoilerAct: 4 },
      { cat: 'Story',    text: 'Introduced the Void Mind as a post-campaign threat', spoilerAct: 6 },
      { cat: 'Cinematic',text: 'Redesigned True Form ending into a 10-phase meta-breaking cinematic', spoilerLevel: 2 },
      { cat: 'Cinematic',text: 'Added interactive Code Realm with 5 corruptible nodes', spoilerLevel: 2 },
      { cat: 'Cinematic',text: 'Added 3-hit QTE finisher sequence', spoilerLevel: 2 },
      { cat: 'Cinematic',text: 'Added dimension-panel launch sequence across 7 realities', spoilerLevel: 2 },
      { cat: 'Cinematic',text: 'True Form ending now triggers at a critical HP threshold', spoilerLevel: 2 },
      { cat: 'AI',       text: 'Improved True Form adaptive AI — 6 attack tiers, player profiling', spoilerLevel: 2 },
      { cat: 'AI',       text: 'Added dedicated Adaptive AI game mode' },
      { cat: 'Combat',   text: 'Added finisher system (killcam killing blows)' },
      { cat: 'Combat',   text: 'Balanced ranged weapons — reduced bullet spam window' },
      { cat: 'Combat',   text: 'Added QTE phases at critical True Form HP thresholds', spoilerLevel: 2 },
      { cat: 'UI',       text: 'Added Experimental 3D Mode setting with dimension-break visuals' },
      { cat: 'UI',       text: 'Added Replay Cinematic button on True Form end screen', spoilerLevel: 2 },
      { cat: 'Network',  text: 'Improved multiplayer state sync and disconnect handling' },
      { cat: 'System',   text: 'Modularised codebase into 20+ named JS modules' },
    ],
  },
  {
    version: '0.9.0',
    title: 'CHAOS & CREATION',
    date: '2026-02-10',
    flavor: 'New modes, new maps, new mayhem.',
    changes: [
      { cat: 'Mode',     text: 'Added Map Creator / Designer tool (standalone, launch from main menu)' },
      { cat: 'Mode',     text: 'Added Chaos Multiplayer — 12 chaos events, item drops, kill streaks' },
      { cat: 'Mode',     text: 'Added Survival, King of the Hill, and Soccer minigames' },
      { cat: 'Mode',     text: 'Added Adaptive AI standalone mode (SOVEREIGN)' },
      { cat: 'Maps',     text: 'Added Megacity, Warpzone, and Colosseum large-scale arenas' },
      { cat: 'Combat',   text: 'Added 8 weapon classes with unique supers and abilities' },
      { cat: 'Combat',   text: 'Added character class system (Berserker, Ninja, Tank, etc.)' },
      { cat: 'Combat',   text: 'Added combo limiter to prevent infinite lock-out combos' },
    ],
  },
  {
    version: '0.5.0',
    title: 'TRUE FORM AWAKENS',
    date: '2025-11-15',
    flavor: 'Something stirs beneath the surface.',
    requiredProgress: 1,
    changes: [
      { cat: 'Boss',     text: 'Added True Form — adaptive boss with player pattern recognition' },
      { cat: 'Boss',     text: 'Added secret letter hunt system unlocking True Form mode' },
      { cat: 'Boss',     text: 'Added Boss fight mode (The Creator, phase AI, beams, minion spawns)' },
      { cat: 'Combat',   text: 'Added shield, ability, and super systems' },
      { cat: 'UI',       text: 'Full UI redesign — glass-morphism, mode cards, player config panels' },
      { cat: 'Network',  text: 'Added online multiplayer via PeerJS WebRTC + Socket.io relay' },
    ],
  },
  {
    version: '0.1.0',
    title: 'INITIAL RELEASE',
    date: '2025-08-01',
    flavor: 'Two stickmen. One arena. Fight.',
    changes: [
      { cat: 'Core',     text: '2-player local PvP on a single canvas' },
      { cat: 'Core',     text: 'Basic weapons: sword, hammer, spear, gun' },
      { cat: 'Core',     text: 'Basic arenas: grass, city, lava, space' },
    ],
  },
];

// ============================================================
// GLOBAL STATE
// ============================================================
let gameMode        = '2p';
let selectedArena   = 'grass';
let isRandomMapMode    = false;
let completeRandomizer = false; // Complete Randomizer mode: reroll arena+weapon+class on every death
let chosenLives     = 3;
let gameRunning     = false;
let gameLoading     = false; // true while loading screen is visible — freezes input/physics
let p1IsBot         = false;
let p2IsBot         = false;
let training2P      = false; // 2-player training mode toggle
let p2IsNone        = false; // "None" — no P2 at all (solo mode)
let paused          = false;
let gameFrozen      = false; // true during cinematics — halts physics, input, hazard damage, boss AI
let players         = [];
let minions         = [];    // boss-spawned minions
let verletRagdolls  = [];    // active Verlet death ragdolls
let bossBeams       = [];    // boss beam attacks (warning + active)
let bossSpikes      = [];    // boss spike attacks rising from floor
let infiniteMode    = false; // if true, no game over — just win counter
let tutorialMode       = false; // kept as stub — tutorial mode fully removed, always false
let trainingMode          = false; // training mode flag
let trainingDesignerOpen  = false; // in-game live map designer active
let trainingDummies    = [];    // training dummies/bots
let trainingPlayerOnly = true;  // godmode/onePunch apply only to player (not all entities)
let trainingChaosMode  = false; // all entities attack nearest target
let winsP1 = 0, winsP2 = 0;
let bossDialogue    = { text: '', timer: 0 }; // speech bubble above boss
let projectiles        = [];
let particles          = [];
let bloodStains        = [];   // persistent ground blood marks
let damageTexts        = [];
let respawnCountdowns  = [];  // { color, x, y, framesLeft }
let screenShake     = 0;
const BOSS_FIGHT_LIVES = 10;
const BOSS_FLOOR_WARNING_FRAMES = 180; // 3 seconds at 60 FPS
let bossFightLivesLock = false;
let bossFightLivesPrev = null;

// Dynamic camera zoom — lerped each frame
let camZoomTarget = 1, camZoomCur = 1;
let hitStopFrames  = 0; // frames to freeze game for hit impact feel
let hitSlowTimer   = 0; // frames remaining on post-hit slow-motion burst
let camHitZoomTimer  = 0; // frames of zoom-in after a heavy hit
let hitVignetteTimer = 0; // frames of red vignette overlay when player takes heavy damage
let hitVignetteColor = 'rgba(220,30,0,';  // color prefix for vignette fill
// Camera dead zone: don't update target until center moves beyond this (reduces jitter)
const CAMERA_DEAD_ZONE = 18;
const CAMERA_LERP_ZOOM = 0.07;
const CAMERA_LERP_POS  = 0.08;

// Camera pan position (lerped each frame)
let camXTarget = 450, camYTarget = 260, camXCur = 450, camYCur = 260;

let camDramaState  = 'normal'; // 'normal' | 'focus' | 'impact' | 'wideshot'
let camDramaTimer  = 0;
let camDramaTarget = null;
let camDramaZoom   = 1.0;

// ============================================================
// SETTINGS & FRAME STATE
// ============================================================
// User-configurable settings (toggled from menu)
const settings = { particles: true, screenShake: true, dmgNumbers: true, landingDust: true, bossAura: true, botPortal: true, phaseFlash: true, ragdollEnabled: (localStorage.getItem('smc_ragdoll') === '1'), finishers: true, view3D: (localStorage.getItem('smc_view3D') === '1'), experimental3D: (localStorage.getItem('smc_experimental3D') === '1'), hideHud: false };

// Active finisher state — set by triggerFinisher(), cleared when animation completes or on backToMenu
let activeFinisher = null;

// ── World System ──────────────────────────────────────────────────────────────
let currentWorld   = null; // STORY_WORLDS entry for the active chapter's world
let worldModifiers = {};   // modifier key(s) from currentWorld, applied by game systems
let worldId        = null; // string id of active world (e.g. 'fracture')
let storyCurrentArc = null; // id of active multiverse arc (e.g. 'fracture', 'war', 'godfall')
let bossPhaseFlash     = 0;    // countdown for white screen flash on boss phase transition
let abilityFlashTimer  = 0;    // frames remaining for ability ring flash
let abilityFlashPlayer = null; // player who activated ability
let frameCount         = 0;
let _firstDeathFrame   = -1;   // frame when first player's lives hit 0
let _firstDeathPlayer  = null; // that player ref (to find the opponent)
let aiTick             = 0;    // AI update runs every N frames (see AI_TICK_INTERVAL)
const AI_TICK_INTERVAL = 15;
let currentArena    = null;    // the arena data object
let currentArenaKey = 'grass';

// Pre-generated bg elements (so they don't flicker each frame)
let bgStars     = [];
let bgBuildings = [];

// ============================================================
// TRUE FORM BOSS STATE
// ============================================================
let unlockedTrueBoss   = false;
let tfGravityInverted  = false;
let tfGravityTimer     = 0;    // countdown (frames); 0 = gravity normal

// ── Gravity failsafe ─────────────────────────────────────────────────────────
// Tracks active inversion with a hard 4-second cap so no gravity flip can get permanently stuck.
let gravityState = { active: false, type: 'normal', timer: 0, maxTimer: 0 };

function forceResetGravity() {
  tfGravityInverted    = false;
  tfGravityTimer       = 0;
  gravityState.active  = false;
  gravityState.type    = 'normal';
  gravityState.timer   = 0;
  gravityState.maxTimer = 0;
  if (typeof players !== 'undefined') {
    for (const p of players) {
      if (p && p.vy !== undefined) p.vy = Math.min(p.vy, 2); // prevent upward launch on restore
    }
  }
}
let tfControlsInverted    = false;
let tfControlsInvertTimer = 0;   // countdown (frames); controls auto-restore when 0
// Mirror arena gimmick
let mirrorFlipTimer     = 0;    // counts up; flips controls at interval
let mirrorFlipped       = false; // current inversion state
let mirrorFlipWarning   = 0;    // warning flash timer (counts down)
let tfFloorRemoved     = false;
let tfFloorTimer       = 0;    // countdown (frames) until floor returns
let tfBlackHoles       = [];   // { x, y, r, timer, maxTimer }
let tfSizeTargets      = new Map(); // fighter → {origW, origH, scale}
let tfGravityWells     = [];   // { x, y, r, timer, maxTimer, strength }
let tfMeteorCrash      = null; // { phase:'rising'|'shadow'|'crash', timer, landX, boss, shadowR }
let tfClones           = [];   // { x, y, w, h, health, timer, facing, attackTimer, animTimer, isReal }
let tfChainSlam        = null; // { stage:0-3, timer, target }
let tfGraspSlam        = null; // { timer }
let tfShockwaves       = [];   // { x, y, r, maxR, timer, maxTimer, boss, hit:Set }
let tfDimensionIs3D    = false; // true while TrueForm has shifted the game to 3D perspective
let tfDimensionPunch   = null;  // { stage, timer, target, boss, launchDir, travelTimer, bgPhase, inputLocked }
let tfEndingScene      = null;  // TrueForm ending cinematic state machine (smb-trueform-ending.js)

// ── TrueForm intro cinematic state machine ────────────────────────────────────
// Strict ordering: opening_fight → paradox_death → absorption → punch_transition → backstage
// 'none'            — not in trueform mode yet
// 'opening_fight'   — player + Paradox vs TF (1000 damage threshold)
// 'paradox_death'   — TF kills Paradox cinematic (_makeTFKillsParadoxCinematic)
// 'absorption'      — Paradox energy flows into player (_tfAbsorptionState active)
// 'punch_transition'— dimension-punch intro (startTFEnding isIntro=true)
// 'backstage'       — real fight resumed; normal death/ending logic allowed
let tfCinematicState     = 'none';
let paradoxDeathComplete = false;  // set true when kills-Paradox cinematic onEnd() fires
let absorptionComplete   = false;  // set true when absorption phase completes

// ── Eternal Damnation arc globals ────────────────────────────────────────────
let damnationActive          = false;
let damnationWave            = 0;
let damnationDeaths          = 0;
let damnationAnchors         = 0;
let damnationCheckpoint      = 0;
let damnationBrokenPlatforms = [];
let damnationRemovalOrder    = [4, 5, 2, 3];
let damnationPulse           = 0;
let damnationPortalActive    = false;
let damnationEscaped         = false;
let damnationAnchorOrbs      = [];  // { x, y, frame }
let damnationPortal          = null; // { x, y, frame }

function resetDamnationState() {
  damnationActive          = false;
  damnationWave            = 0;
  damnationDeaths          = 0;
  damnationAnchors         = 0;
  damnationCheckpoint      = 0;
  damnationBrokenPlatforms = [];
  damnationPulse           = 0;
  damnationPortalActive    = false;
  damnationEscaped         = false;
  damnationAnchorOrbs      = [];
  damnationPortal          = null;
  // Restore any platforms disabled by a previous run (mutable shared objects)
  if (typeof ARENAS !== 'undefined' && ARENAS.damnation) {
    for (const pl of ARENAS.damnation.platforms) pl.isFloorDisabled = false;
  }
}

// ── Boss telegraph / warning system ──────────────────────────────────────────
// Visual warning indicators shown before attacks land (give player time to dodge)
let bossWarnings        = [];   // { type:'circle'|'arc'|'cone', x, y, r, color, timer, maxTimer, label, safeZone, facing }
let bossMetSafeZones    = [];   // safe zones during meteor storm { x, y, r, timer, maxTimer }
// Stagger: boss takes 120+ damage in 3s window → stunned for 2.5s
let bossStaggerTimer    = 0;    // frames remaining in stagger
let bossStaggerDmg      = 0;    // accumulated damage in current window
let bossStaggerDecay    = 0;    // decay timer; when 0 accumulator resets
// Desperation mode: boss health < 25% → faster, more intense
let bossDesperationMode  = false;
let bossDesperationFlash = 0;   // visual flash timer on activate

// ============================================================
// SECRET LETTER HUNT
// ============================================================
let bossBeaten         = false;
let collectedLetterIds = new Set();
// 0 = fresh player, 1 = boss beaten, 2 = true form unlocked
// let (not const) so _refreshRuntimeFromSave() can recalculate after account switch
let playerProgressLevel = unlockedTrueBoss ? 2 : bossBeaten ? 1 : 0;
const SECRET_LETTERS   = ['T','R','U','E','F','O','R','M'];
const SECRET_ARENAS    = ['grass','city','space','lava','forest','ice','ruins','creator'];
const SECRET_LETTER_POS = {
  grass:   { x: 450, y: 330 },
  city:    { x: 748, y: 390 },
  space:   { x: 200, y: 290 },
  lava:    { x: 450, y: 170 },
  forest:  { x: 310, y: 360 },
  ice:     { x: 640, y: 290 },
  ruins:   { x: 765, y: 360 },
  creator: { x: 450, y: 220 },
};

// Arena order (used for menu background cycling)
const ARENA_KEYS_ORDERED = ['grass', 'city', 'space', 'lava', 'forest', 'ice', 'ruins',
  'cave', 'mirror', 'underwater', 'volcano', 'colosseum', 'cyberpunk', 'haunted', 'clouds', 'neonGrid', 'mushroom'];

// Menu background cycling state
let menuBgArenaIdx   = 0;
let menuBgTimer      = 0;
let menuBgFade       = 0;      // 0→1 fade to black, 1→2 fade from black
let menuBgFrameCount = 0;
let menuLoopRunning  = false;

// ============================================================
// ONLINE STATE
// ============================================================
let onlineMode               = false;
let onlineReady              = false;
let onlineLocalSlot          = 0;
let _onlineGameMode          = '2p';
let onlineAllowCustomWeapons = false; // host-controlled; enables custom weapons in online sessions

// Online multiplayer extended state
let onlinePlayerSlots = []; // array of player state objects for all online players
let localPlayerSlot = 0;    // which slot this player occupies (0=host)
let onlinePlayerCount = 2;  // chosen player count (2-10)
let onlineMaxPlayers = 10;
let onlineFreeCamera = false; // in online mode, camera tracks only local player
let onlineCamX = 450, onlineCamY = 260; // free camera target position for online mode
let _cheatBuffer     = ''; // tracks recent keypresses for cheat codes
let unlockedMegaknight = false;
// Public room browser state
let _publicRooms     = [];  // [{code, host, created}] — discovered public rooms
let _isPublicRoom    = false; // whether current hosted room is public
let _publicRoomCheckTimer = 0;

// ============================================================
// ============================================================
// VERSION
// ============================================================
const GAME_VERSION = '3.5.0';  // bump this when releasing; must match CHANGELOG[0].version
console.log('[VERSION CHECK]', GAME_VERSION);

// DEBUG / DEVELOPER STATE
// ============================================================
let debugMode          = false;
let timeScale          = 1.0;
let showHitboxes       = false;  // F1 — fighter hitboxes + weapon tips
let showCollisionBoxes = false;  // F2 — platform collision geometry
let showPhysicsInfo    = false;  // F3 — velocity vectors + onGround/vy labels
let _debugKeyBuf       = '';     // rolling key buffer for "debugmode" cheat

// ============================================================
// STORY MODE STATE
// ============================================================
let playerPowerLevel    = 1.0;   // hidden: grows +0.02 per chapter cleared; applied to player damage in story
let storyModeActive      = false; // true while a story level is in progress
let multiverseModeActive = false; // true while a multiverse encounter is in progress
let storyCurrentLevel   = 1;     // which story level is being played (1-indexed)
let storyPlayerOverride = null;  // { speedMult, dmgMult, noAbility, noSuper, noDoubleJump, weapon } — applied to p1 on level start
let storyFightSubtitle  = null;  // { text, timer, maxTimer, color } — in-fight narrative subtitle
let storyFightScript    = [];    // [{ frame, text, color }] — scheduled messages for current level
let storyFightScriptIdx = 0;     // next unplayed entry index
let storyEnemyArmor     = [];    // ['helmet','chestplate','leggings'] — armor pieces on enemy this chapter
let storyTwoEnemies     = false; // true = spawn a second enemy bot in this chapter
let storySecondEnemyDef = null;  // { weaponKey, classKey, aiDiff, color } for the second enemy
let storyOpponentName   = null;  // display name of the story chapter opponent (shown in HUD)
let storyBossType       = null;  // 'fallen_god' | null — overrides which Boss subclass is spawned
let storyAbilityState   = {};    // per-fight state for unlocked story abilities (medkit used, last stand triggered, etc.)
let storyPhaseIndicator = null;  // { index, total, label, type }
let storyGauntletState  = null;  // active chapter phase runtime
let storyPendingPhaseConfig = null; // temporary launch override for next story phase
let storyCameraLock     = null;  // { left, right, reason }
// ── Objective system ──────────────────────────────────────────────────────────
window.currentObjective        = null;   // { text, completedAt } | null
window.objectiveCompleteTimer  = 0;      // frames to show "COMPLETE" banner
let storyPressureState  = { dodgeFatigue: 0, dodgeTimer: 0 };

// ============================================================
// ENTITY & VISUAL STATE
// ============================================================
let lightningBolts   = [];    // { x, y, timer, segments } — Thor perk visual lightning
let backstagePortals = [];    // {x,y,type,phase,timer,radius,maxRadius,shards,done}
let phaseTransitionRings = []; // expanding ring effects on phase change
// ---- Combat Phase Lock ----
// Single authority for which phase owns the frame. Higher-priority phases block lower ones.
// Priorities: normal=0, hitstop=1, finisher=3, qte=3, cinematic=4.
// Only the system that SET the lock can CLEAR it (matched by phase name).
let combatLock = {
  phase:    'normal',
  priority: 0,
  blocks:   { ai: false, movement: false, input: false },
};

const _COMBAT_LOCK_DEFS = {
  normal:    { priority: 0, blocks: { ai: false,  movement: false, input: false } },
  hitstop:   { priority: 1, blocks: { ai: false,  movement: false, input: false } },
  finisher:  { priority: 3, blocks: { ai: true,   movement: true,  input: true  } },
  qte:       { priority: 3, blocks: { ai: true,   movement: false, input: false } },
  cinematic: { priority: 4, blocks: { ai: true,   movement: true,  input: true  } },
};

/** Raise the combat lock to the given phase (ignored if a higher-priority phase is already active). */
function setCombatLock(phase) {
  const def = _COMBAT_LOCK_DEFS[phase];
  if (!def || def.priority < combatLock.priority) return;
  combatLock.phase    = phase;
  combatLock.priority = def.priority;
  combatLock.blocks   = { ai: def.blocks.ai, movement: def.blocks.movement, input: def.blocks.input };
}

/** Release the combat lock — only effective if the caller owns the current phase. */
function clearCombatLock(phase) {
  if (combatLock.phase !== phase) return;
  combatLock.phase    = 'normal';
  combatLock.priority = 0;
  combatLock.blocks   = { ai: false, movement: false, input: false };
}

/** Returns true when the named system ('ai' | 'movement' | 'input') is currently blocked. */
function isCombatLocked(system) {
  return !!combatLock.blocks[system];
}

// ---- Cinematic System ----
let cinGroundCracks  = [];    // world-space crack effects (managed by smc-cinematics.js)
let cinScreenFlash   = null;  // screen-space flash { color, alpha, timer, maxTimer }
let activeCinematic      = null;  // active cinematic sequence or null
let isCinematic          = false; // true during any cinematic or finisher — blocks new attack/projectile creation
let slowMotion           = 1.0;   // physics time scale (1=normal, 0=fully frozen)
let cinematicCamOverride = false; // when true, camera uses cinematic focus targets
let cinematicZoomTarget  = 1.0;   // zoom level during cinematic
let cinematicFocusX      = 450;   // camera focus X during cinematic
let cinematicFocusY      = 260;   // camera focus Y during cinematic
let cinematicCamSnapFrames = 0;   // one-frame hard-cut override for punchy cinematic beats
let cinematicLetterboxAmt    = 0;   // current letterbox bar height (0–1 fraction of screen height)
let cinematicLetterboxTarget = 0;   // target letterbox amount (lerped toward)
let _camPrevFocusX      = 450;    // previous cinematic focus target X (for spring feel)
let _camPrevFocusY      = 260;    // previous cinematic focus target Y (for spring feel)
let _camOvershootX      = 0;      // decaying cinematic camera overshoot X
let _camOvershootY      = 0;      // decaying cinematic camera overshoot Y
// ── Cinematic Enhancements (smb-cinematics-core.js) ──────────────────────
let cinSpeedLines       = [];     // radial/directional speed line burst effects
let cinMotionTrails     = [];     // [{entity, positions:[{x,y}], color, maxLen}]
let cinImpactFrame      = null;   // hard-cut impact frame {timer, maxTimer, color, entities[]}
let cinNameCard         = null;   // move name card {text, color, accentColor, timer, maxTimer}
let cinematicTiltAngle  = 0;      // current Dutch angle in radians (world-space render tilt)
let cinematicTiltTarget = 0;      // target Dutch angle — lerped toward each frame
let cinBgContrast       = null;   // bg contrast override {color, alpha, timer, maxTimer}
let cinShakeDir         = null;   // directional shake first-frame bias {x, y, timer}
let bossDeathScene   = null;  // boss defeat animation state
let fakeDeath        = { triggered: false, active: false, timer: 0, player: null };
let bossPlayerCount  = 1;     // 1 or 2 players vs boss
let forestBeast      = null;  // current ForestBeast instance (null if none)
let forestBeastCooldown = 0;  // frames until beast can spawn again after death
let yeti             = null;  // current Yeti instance in ice arena
let yetiCooldown     = 0;     // frames until yeti can spawn again

// ── Spawn config — single source of truth for all enemy spawn timing ──────────
const SPAWN_CONFIG = {
  yeti: {
    minDelay:      900,   // frames before yeti can first spawn (15s at 60fps)
    respawnDelay:  1200,  // frames cooldown after yeti death (20s)
    spawnInterval: 400,   // deterministic spawn check interval (~6.7s)
    maxAlive:      1
  },
  forestBeast: {
    respawnDelay:  900,   // frames cooldown after beast death (15s)
    spawnInterval: 300,   // deterministic spawn check interval (5s)
    maxAlive:      1
  }
};
let mapItems         = [];    // arena-perk pickups
let randomWeaponPool = null;  // null = use all; Set of weapon keys
let randomClassPool  = null;  // null = use all; Set of class keys

// Boss fight floor hazard state machine
let bossFloorState = 'normal';  // 'normal' | 'warning' | 'hazard'
let bossFloorType  = 'lava';    // 'lava' | 'void'
let bossFloorTimer = 1500;      // frames until next state transition

// ── Depth Phase: Z-axis final phase (triggers after Code Realm + fight reset) ──
// Entities gain a z-coordinate (-1 to 1); only same-layer hits land (|dz| < 0.4).
// Player uses Q (ability key) to decrease Z and E (super key) to increase Z.
let tfDepthPhaseActive     = false; // true while Z-axis illusion phase is live
let tfDepthTransitionTimer = 0;     // >0 = input frozen during scripted entry (~30f)
let tfDepthEnabled         = false; // Z-movement unlocked after transition completes
let tfDepthPlayerStillZ    = {};    // { [playerIdx]: { z, frames } } for depthPunish tracking
const TF_DEPTH_CX = 450;           // circular arena center X
const TF_DEPTH_CY = 300;           // circular arena center Y
const TF_DEPTH_R  = 300;           // circular arena radius

// True Form — dimensional attacks
let tfPhaseShift   = null;  // { timer, maxTimer, echoes:[{x,y}], realIdx, revealed }
let tfRealityTear  = null;  // { x, y, timer, maxTimer, phase:'warn'|'active'|'close' }
let tfMathBubble   = null;  // { text, timer, maxTimer, x, y }
let tfCalcStrike   = null;  // { timer, maxTimer, predictX, predictY, fired, strikeDelay }
let tfGhostPaths      = null;  // { paths:[{pts,selected,alpha}], timer, maxTimer } — 5D path visualization
let tfRealityOverride = null;  // { timer, maxTimer, bossRef, targetRef, phase } — dominance mechanic
// ── New cosmic attacks ─────────────────────────────────────────────────────────
let tfGammaBeam     = null;  // { phase:'telegraph'|'active', timer, y, hit:Set }
let tfBurnTrail     = null;  // { y, timer, maxTimer } — glowing aftermath streak after gamma beam
let tfNeutronStar   = null;  // { phase:'pull'|'warn'|'slam', timer, bossRef, startX }
let tfGalaxySweep   = null;  // { angle, speed, timer, maxTimer, hit:Set }
let tfMultiverse    = null;  // { timer, maxTimer, echoes:[{x,y,selected}], targetIdx, phase, bossRef, targetRef }
let tfSupernova     = null;  // { timer, maxTimer, phase:'buildup'|'active', bossRef, hit:Set, r }
let tfAttackRetryQueue = []; // [{ ctx, move, targetRef, source, framesLeft, attempts }]

// ── Story event / cinematic system ────────────────────────────────────────────
let storyEventFired    = {};   // { [eventName]: true } — dedup per fight
let storyFreezeTimer   = 0;    // frames of physics halt for cinematic freezes
let storyDistortLevel  = 0;    // 0-1 world distortion intensity (rises with chapter progress)
let storyDodgeUnlocked = false; // set true when DODGE_UNLOCK event fires
let sovereignBeaten    = false; // set true after Sovereign MK2 is defeated
let bossRushUnlocked   = false; // set true by cheat code UNLOCKBOSSRUSH
let storyOnline        = false; // set true after online story completion
let godEncountered        = false; // set true after first God encounter
let godDefeated           = false; // set true after God is defeated in Phase 2
let absoluteAxiomUnlocked = false; // set true by cheat code AXIOMSQUARED
let playerCoins        = 0;     // coin balance; hydrated per account
let unlockedCosmetics  = [];    // cosmetic IDs; hydrated per account

// ── Ability unlock toast ─────────────────────────────────────────────────
let abilityUnlockToast = null;  // { text, icon, timer, maxTimer }

// ── Exploration chapter state ─────────────────────────────────────────────
let exploreActive    = false;   // true while exploration chapter is running
let exploreWorldLen  = 4200;    // total world length in game px (set per chapter)
let exploreGoalX     = 3800;    // world x of goal object
let exploreGoalName  = '';      // display name of the goal object
let exploreGoalFound = false;   // true when player reaches the goal
let exploreSpawnQ    = [];      // [{wx, def}] enemies to spawn as player passes wx
let exploreEnemyCap  = 2;       // max concurrent exploration enemies alive at once
let exploreCheckpoints = [];    // [{ x, hit }]
let exploreCheckpointIdx = -1;
let exploreSidePortals = [];    // [{ x, y, type, reward, active, entered }]
let exploreAmbushTimer = 0;
let exploreCombatQuiet = 0;
let exploreArenaLock = null;    // { left, right, enemies:[], cleared, label }
let storyChaseTimer    = 0;     // frames remaining in a chase phase (0 = no chase active)
let storyChaseMaxTimer = 0;     // max frames (used for the HUD progress bar)
let storeSurvivalState = null;  // { active, state, wave, totalWaves, waveSize, timer, baseEnemy }

// ── TrueForm clone position history (ring buffer for multiverse lag effect) ──
let _tfCloneHistory = [];   // [{ x, cy, facing }, ...] — last 24 frames

// ── New interactive chapter mode globals ─────────────────────────────────────

// Mode-active flags (checked in updateExploration each frame)
let stealthModeActive    = false;
let escapeModeActive     = false;
let defenseModeActive    = false;
let scavengeModeActive   = false;
let puzzleModeActive     = false;

// Stealth mode
let stealthGuards        = [];   // [{ x, y, radius, alertTimer, maxAlertTimer, alerted }]
let stealthAlarmed       = false; // true once any alarm fires
let stealthNeverAlarmed  = true;  // bonus flag: never triggered alert

// Escape mode
let escapeWallX          = -80;  // world x of the collapse wall
let escapeWallSpeed      = 1.2;  // px/frame; accelerates over time
let escapeWallAccelTimer = 0;    // frames since last speed tick

// Defense mode
let defenseNexusHP       = 300;
let defenseNexusMaxHP    = 300;
let defenseNexusX        = 450;
let defenseNexusY        = 390;
let defenseNexusHitTimer = 0;    // per-enemy cooldown (frames since last nexus hit)
let defenseNexusPulse    = 0;    // glow animation counter

// Scavenge mode
let scavengeItems        = [];   // [{ x, y, name, icon, collected }]
let scavengeTotal        = 0;

// Puzzle mode
let puzzleSwitches       = [];   // [{ x, y, label, activated, pulseTimer }]
let puzzleStep           = 0;    // next switch index that must be activated

// Assassination mode
let assassinationTimer   = 0;    // frames remaining (counts down)
let assassinationTarget  = null; // reference to target fighter

// Gauntlet mode
let gauntletRound        = 0;    // current round (0-indexed)
let gauntletTotalRounds  = 3;
let gauntletRoundDelay   = 0;    // frames until next round starts
let gauntletActive       = false;

// Ship flight mode
let shipFlightShip       = null; // { x, y, vx, vy, hp, maxHp, bullets:[], fireTimer:0 }
let shipFlightEnemies    = [];   // [{ x, y, hp, maxHp, speed, hitTimer }]
let shipFlightScrollX    = 0;    // camera scroll (based on ship.x)
let shipFlightLen        = 6000; // total flight length
let shipFlightStars      = [];   // parallax star layer

// Escort mode (implemented in smb-story-engine-modes.js)
let escortNPCTarget      = null; // Fighter-like NPC wrapper object
let escortNPCHP          = 200;
let escortNPCMaxHP       = 200;
let escortGoalX          = 4000; // world x the NPC must reach

// ============================================================
// SHIP PROGRESSION SYSTEM
// Axiom cannot travel the multiverse without a stable vessel.
// Parts are collected through main story chapters and exploration.
// When all 5 parts are gathered, SHIP.built = true → full branch access.
// ============================================================
window.SHIP = {
    built: false,
    parts: {
        hull:    0,       // needs 5 (scattered across early arcs)
        engine:  false,   // dropped by Arc 2 boss
        core:    false,   // dropped by Act 3 climax
        crystal: false    // dropped after first fracture preview completes
    }
};

// ============================================================
// FRACTURE SYSTEM
// Fractures are visible tears to other branches.
// Before SHIP.built: only a 10-second preview with one branch guardian.
// After SHIP.built: full branch entry unlocked.
// Each fracture is tied to one of Axiom's former allies turned rulers.
// ============================================================
window.FRACTURES = [
    {
        id:          'branch_alpha',
        name:        'Alpha Branch',
        rulerName:   'Vael',
        rulerLore:   'Once Axiom\'s closest ally. Now ruler of a branch built on absolute order.',
        x:           500,
        y:           250,
        unlocked:    false,
        previewed:   false,   // true after first preview entry
        completed:   false    // true after full branch cleared (post-ship)
    },
    {
        id:          'branch_null',
        name:        'Null Branch',
        rulerName:   'Kael',
        rulerLore:   'Consumed by the fracture\'s power. Built his branch from silence — nothing enters, nothing leaves.',
        x:           720,
        y:           180,
        unlocked:    false,
        previewed:   false,
        completed:   false
    },
    {
        id:          'branch_crimson',
        name:        'Crimson Branch',
        rulerName:   'Sora',
        rulerLore:   'The most aggressive of the group. Her branch is a battlefield that never ends.',
        x:           200,
        y:           320,
        unlocked:    false,
        previewed:   false,
        completed:   false
    }
];

// Active fracture preview state — set by enterFracturePreview(), cleared on exit
let fracturePreviewActive = false;   // true while 10s preview is running
let fracturePreviewTimer  = 0;       // counts down from 600 (10 seconds at 60fps)
let fracturePreviewId     = null;    // id of the fracture being previewed

// ============================================================
// STORY PROGRESS SYSTEM
// Tracks act/chapter position and persistent story flags.
// Acts 0–9; chapter is a 0-based index within the current act.
// flags{} is a free-form key→true store for one-shot events.
// ============================================================
window.STORY_PROGRESS = {
    act:     0,
    chapter: 0,
    flags:   {}
};

// ── resetProgressionGlobals ───────────────────────────────────────────────────
// Resets all account-specific progression globals to their initial defaults.
// Called at the start of _refreshRuntimeFromSave() (smb-save.js) so every
// account load begins from a clean slate before the save patch is applied.
//
// Rules:
//   - Mutate in-place throughout — object/array references are never replaced,
//     so no system holding a ref to SHIP, FRACTURES, or settings can break.
//   - motivationStage lives in smb-progression.js (loaded after this file);
//     guard with typeof so this is safe to call at any point.
//   - playerProgressLevel is recalculated at the end once its sources are reset.
function resetProgressionGlobals() {
  // SHIP — mutate properties, preserve object identity
  SHIP.built         = false;
  SHIP.parts.hull    = 0;
  SHIP.parts.engine  = false;
  SHIP.parts.core    = false;
  SHIP.parts.crystal = false;

  // FRACTURES — reset each entry's state fields, preserve array and object identities
  for (const f of FRACTURES) {
    f.unlocked  = false;
    f.previewed = false;
    f.completed = false;
  }

  // STORY_PROGRESS — mutate in-place
  STORY_PROGRESS.act     = 0;
  STORY_PROGRESS.chapter = 0;
  STORY_PROGRESS.flags   = {};

  // Unlock booleans
  bossBeaten         = false;
  unlockedTrueBoss   = false;
  unlockedMegaknight = false;

  // Settings — ragdoll preference is account-specific (persisted per account)
  settings.ragdollEnabled = false;

  // motivationStage — declared in smb-progression.js, loaded after this file; guarded
  if (typeof motivationStage !== 'undefined') motivationStage = 0;

  // collectedLetterIds — must clear in-memory Set so old account's letters don't bleed through
  if (typeof collectedLetterIds !== 'undefined' && collectedLetterIds instanceof Set) collectedLetterIds.clear();

  // earnedAchievements — declared in smb-achievements.js (loaded after this file); guarded
  if (typeof earnedAchievements !== 'undefined' && earnedAchievements instanceof Set) earnedAchievements.clear();

  // playerProgressLevel is derived from the two booleans above; recalculate
  playerProgressLevel = 0;
}

// Second reset layer — clears account-scoped runtime globals not covered by
// resetProgressionGlobals(). Called at the top of _refreshRuntimeFromSave() and
// from the new-account path in loadGame(). Does NOT touch localStorage — that is
// handled by _applySaveData() (primary path) or explicit removeItem (new-account path).
function resetAccountScopedGlobals() {
  // storyDodgeUnlocked — declared in this file; always safe
  storyDodgeUnlocked = false;
  sovereignBeaten    = false;
  storyOnline        = false;
  godEncountered     = false;
  godDefeated        = false;
  playerCoins        = 0;
  unlockedCosmetics.length = 0;
  // paradoxCompanionActive — declared in smb-paradox-ai.js (loaded later); guarded
  if (typeof paradoxCompanionActive !== 'undefined') paradoxCompanionActive = false;
}
