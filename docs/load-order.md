# Script Load Order

Moved out of CLAUDE.md. `index.html` is the source of truth; this list mirrors it. Files may only reference globals defined by files loaded earlier.

Script load order in `index.html` — files may only reference globals from earlier entries:

1. `js/smb-errorboundary.js` — Global error boundary/fallback
2. `js/smb-globals.js` — ALL global state (canvas, settings, TF state, online state, boss floor state)
3. `js/smb-audio.js` — SoundManager
4. `js/smb-director.js` — Game director / flow controller
5. `js/smb-achievements.js` — Achievement definitions and unlock logic
6. `js/smb-data-arenas.js` — `ARENAS`, `ARENA_BASE_PLATFORMS`, `randomizeArenaLayout`
7. `js/smb-data-mapperks.js` — `MAP_PERK_DEFS`, `mapPerkState`, `initMapPerks`, `updateMapPerks`
8. `js/smb-data-mapperks-draw.js` — `applyMapPerk`, `drawMapPerks`
9. `js/smb-data-weapons.js` — `WEAPONS`, `WEAPON_KEYS`, `CLASSES`, `CLASS_AFFINITY`, descs
   - `js/smb-weapon-lore.js` — `WEAPON_LORE`: the single source of weapon names and backstories (applied onto `WEAPONS`/`WEAPON_DESCS` at load); `isHollowArm`, `weaponDisplayName`, Hollow copy art
10. `js/smb-map-analyzer.js` — Arena layout analysis
11. `js/smb-combat.js` — `dealDamage()` ← **all damage here**; `lerp`, `clamp`, `areAlliedEntities`, `handleSplash`
12. `js/smb-particles-core.js` — Particle pool, `spawnParticles`, `spawnBullet`, `Projectile`, `DamageText`
13. `js/smb-heatmap.js` — Player heatmap (zone tracking)
14. `js/smb-verlet.js` — `VerletRagdoll`, `PlayerRagdoll`
15. `js/smb-cinematics-core.js` — `CinematicManager`, `cinScript`, `CinFX`, `CinCam`, `CinTimeline`
16. `js/smb-cinematics-backstory.js` — `startBossBackstoryCinematic`
17. `js/smb-cinematics-boss-thresh.js` — Boss warning/rage/desp threshold cinematics
18. `js/smb-cinematics-tf-thresh.js` — TrueForm entry/reality/desp threshold cinematics
19. `js/smb-cinematics-multiverse.js` — `startMultiverseTravelCinematic`
20. `js/smb-finisher-helpers.js` — Shared finisher drawing helpers + dialogue pools
21. `js/smb-finisher-void.js` — `FIN_VOID_SLAM`
22. `js/smb-finisher-reality.js` — `FIN_REALITY_BREAK`
23. `js/smb-finisher-boss.js` — `FIN_SKY_EXECUTION`, `FIN_DARKNESS_FALLS`, `FIN_HEROS_TRIUMPH`
24. `js/smb-finisher-tf.js` — TF/creator finisher definitions
25. `js/smb-finisher-yeti.js` — Yeti finisher definitions
26. `js/smb-finisher-beast.js` — Beast finisher definitions
27. `js/smb-finisher-weapon.js` — `WEAPON_FINISHERS`, `CLASS_FINISHERS`
28. `js/smb-finisher-engine.js` — `triggerFinisher`, `updateFinisher`, `drawFinisher`
29. `js/smb-pathfinding.js` — Bot pathfinding
30. `js/smb-fighter.js` — Fighter base class
31. `js/smb-combat-ai.js` — Modular AI: `CombatSystem`, `MovementSystem`, `AIController`, `CombatAIFighter`
32. `js/smb-enemies-core.js` — `Minion`, `ForestBeast` classes
33. `js/smb-enemies-creatures.js` — `Yeti`, `Dummy` classes
34. `js/smb-enemies-training.js` — Training mode, map creator, custom weapon creator
35. `js/smb-enemies-class.js` — `applyClass`, `updateClassWeapon`, `showDesc`, mirror AI patch
36. `js/smb-god.js` — God entity, encounter system, fake crash screen, Godslayer weapon
37. `js/boss/smb-boss.js` — Boss class (3-phase)
38. `js/boss/smb-boss-cinematics.js` — Boss cinematic sequences
39. `js/boss/smb-boss-tf-misc.js` — TF black holes, warp, portal teleport, size manipulation
40. `js/boss/smb-boss-phase-cin.js` — Phase 2/3 cinematics for Boss, TrueForm, Beast, Yeti
41. `js/boss/smb-boss-tf-legacy.js` — DELETED cinematic stubs + `triggerPhaseTransition`
42. `js/boss/smb-boss-tf-attacks1.js` — Gravity wells, meteor crash, clones, dimension punch, shockwaves, boss pending attacks
43. `js/boss/smb-boss-tf-attacks2.js` — `updateTFPendingAttacks`, `drawBossWarnings`, `resetBossWarnings`
44. `js/boss/smb-boss-tf-visuals1.js` — Phase shift, reality tear, calc strike, math bubble, reality override, gamma beam
45. `js/boss/smb-boss-tf-visuals2.js` — Burn trail, neutron star, galaxy sweep, multiverse fracture, supernova
46. `js/boss/smb-boss-helpers.js` — Boss utility functions
    - `js/boss/smb-fallen-god.js` — `FallenGod` boss (story ch80 + Simulator refight), own AI and moves; `_isFallenGodFight()`
47. `js/boss/smb-trueform.js` — TrueForm class
48. `js/boss/smb-trueform-attacks.js` — TrueForm move set
49. `js/smb-paradox-class.js` — Paradox entity class + global state
50. `js/smb-paradox-opening.js` — TF opening fight cinematic
51. `js/smb-paradox-return-cin.js` — TF kicks Paradox out + return-1000 cinematic
52. `js/smb-paradox-absorption-update.js` — Absorption update logic
53. `js/smb-paradox-absorption-draw.js` — Absorption draw, memories, KC overlay
54. `js/smb-paradox-kills-cin.js` — `_makeTFKillsParadoxCinematic`
55. `js/smb-paradox-revive.js` — Spawn/remove, revive, damage lock, empowerment, foreshadow
56. `js/smb-paradox-intro-cin.js` — `_makeTFIntroCinematic`
57. `js/smb-paradox-cin2.js` — `_makeTFParadoxEntryCinematic`, `_makeTFFinalParadoxCinematic`, false victory
58. `js/smb-paradox-effects.js` — `resetParadoxState`, `updateParadoxEffects`
59. `js/smb-paradox-ai.js` — `drawParadoxEffects`, fusion AI, ability handlers, companion
60. `js/smb-behavior-model.js` — Player behavior fingerprinting; plugs into AdaptiveAI
61. `js/smb-adaptive-ai.js` — Real-time player profiling / adaptive AI
62. `js/smb-smk2-data.js` — SovereignMK2 dialogue pools, action classifier, stage names
63. `js/smb-smk2-class.js` — `SovereignMK2 extends AdaptiveAI` + debug API
64. `js/smb-trueform-ending-data.js` — TFEnding state vars, helpers, `startTFEnding`
65. `js/smb-trueform-ending-update.js` — `updateTFEnding` state machine
66. `js/smb-trueform-ending-draw.js` — `drawTFEnding`, utilities
67. `js/rendering/smb-drawing-arenas.js` — Arena backgrounds and platform drawing
68. `js/rendering/smb-drawing-bg.js` — `generateBgElements`, `drawBackground`, explore tiles
69. `js/rendering/smb-drawing-effects.js` — Boss beams, class effects, accessories, lightning
70. `js/rendering/smb-drawing-scenes.js` — Boss death scene, fake death scene
71. `js/rendering/smb-drawing-hud.js` — Story subtitle, objective HUD, cinematic letterbox
72. `js/rendering/smb-drawing-arenas2.js` — Cave, mirror, underwater, volcano, cyberpunk, etc.
73. `js/rendering/smb-drawing-arenas3.js` — Online/large arenas + home world arenas
74. `js/smb-minigames.js` — Survival, KotH, Chaos Match systems
    - `js/smb-realm.js` loads after `js/smb-endless.js` (both sit between minigames and the QTE files) — Realm mode: `REALM_DEFS`, `realmBeginRun`, `initRealm`, `updateRealm`, `realmInteract`, `realmCameraTarget`, `drawRealmBack/World/HUD`, `realmReset`
75. `js/smb-qte-core.js` — QTE phase defs, state, public API, trigger detection, `_startQTE`
76. `js/smb-qte-engine.js` — QTE stage tickers, prompt logic, round failure, `_endQTE`
77. `js/smb-qte-draw.js` — QTE draw functions (background, prompts, HUD, combo text)
78. `js/smb-cinematic.js` — Cinematic playback runtime
79. `js/smb-cutscene.js` — Cutscene helpers
80. `js/smb-camera.js` — Camera sequences, drama cam, `updateCamera`
81. `js/smb-loop-core.js` — `applyWorldModifiers` + main `gameLoop` (monolithic)
82. `js/smb-input.js` — `processInput`, shield constants, key normalization
83. `js/smb-cheats.js` — `applyCode`, all cheat code logic
84. `js/smb-menu-ui.js` — Mode selection, cosmetics/store, bot toggle
84a. `js/smb-journal.js` — `JOURNAL_ENTRIES`, `showJournalModal`, `journalUpdateNav` (lore journal; unlock gates use story ids and prequel progress from smb-menu-ui.js)
85. `js/smb-menu-select.js` — Card grids, arena/lives/settings selection, changelog
86. `js/smb-menu-config.js` — Custom weapons panel, stats log, weapon/class resolution
87. `js/smb-menu-spawn.js` — `startGame`, arena spawn bounds, safe spawn helpers
88. `js/smb-menu-startcore.js` — `_startGameCore` (full game initialisation sequence)
89. `js/smb-menu-utils.js` — `toggleChaosMode`, `resizeGame`, `refreshMenuFromAccount`, `drawEdgeIndicators`
90. `js/smb-network.js` — NetworkManager (PeerJS/WebRTC)
91. `js/smb-state.js` — `GameState`: centralized persistent state (accounts, admin overrides, session metadata)
92. `js/smb-supabase.js` — Cloud auth + remote save adapter; wraps Supabase JS SDK (loaded between smb-state and smb-online)
93. `js/smb-online.js` — `LobbyManager`: lobby presence layer on top of NetworkManager; localStorage lobby ads
94. `js/smb-debug-overlay.js` — Debug HUD, sanity checks, debug menu panel
95. `js/smb-debug-console.js` — In-game developer console (`_consoleExec`)
96. `js/smb-debug-jump.js` — F8 developer jump menu (story/cinematic/arena/boss fast-travel)
97. `js/smb-accounts.js` — `AccountManager`: local multi-account system; reads/writes via `GameState`
98. `js/smb-save.js` — Save/load persistence
99. `js/smb-admin-core.js` — Admin identity, isAdmin, ban/unban/kick actions, player management
100. `js/smb-admin-panels.js` — Admin panel DOM, action handlers, toast, ban screen, F9 listener
101. `js/smb-attacktest-core.js` — ATK sandbox state, proxy factory, helpers
102. `js/smb-attacktest-exec.js` — `FORCE_ATTACK_MODE`, `forceExecuteAttack`, debug tools
103. `js/smb-attacktest-registry.js` — `ATK_REGISTRY` per-class attack definitions
104. `js/smb-attacktest-commands.js` — `_atkCommand` router, kit HUD, key handler
105. `js/smb-attacktest-gui.js` — Visual GUI overlay + console patch
106. `js/story/smb-story-registry.js` — declares `STORY_CHAPTER_REGISTRY = []`; the arc files below push chapters into it at load time (it is NOT a static literal array)
107. `js/story/acts/` — Per-act story arc files. Directories: `act0`–`act7`, `act4mv` (multiverse), `actvoidmind`, and `side`. Each `.js` calls `STORY_CHAPTER_REGISTRY.push(...)` with a unique `id:`. There are currently 186 chapters, ids 0–185 contiguous.
108. `js/story/smb-story-config.js` — Story configuration
109. `js/story/smb-story-engine-data.js` — Chapter expansion helpers, state vars
110. `js/story/smb-story-engine-ui.js` — Tab switching, journey/store/skill-tree UI
111. `js/story/smb-story-engine-flow.js` — Chapter launch flow
112. `js/story/smb-story-engine-match.js` — `spawnWorldBoss`, `story2OnMatchEnd`, victory
113. `js/story/smb-story-engine-events.js` — Event bus, `_handleBuiltinEvent`, freeze/slow helpers
114. `js/story/smb-story-engine-frame.js` — Per-frame: `storyCheckEvents`, dodge roll, boundaries
115. `js/story/smb-story-levels.js` + `js/story/levels/chNN.js` — `STORY_LEVELS`: authored per-chapter maps (layout, floor, backdrop, world-space set pieces, floor surfaces), loaded just before `smb-story-engine-explore.js`, which builds explore worlds and falls back to its seeded generator for chapters without an entry. Chapters 0–9 are authored.
116. `js/story/smb-story-engine-explore2.js` — `updateExploration`, scene triggers, fallen warrior
117. `js/story/smb-story-finalize.js` — Story end/transition logic
118. `js/smb-progression.js` — Player progression / unlocks
119. `js/smb-multiverse.js` — Multiverse mode
120. `js/smb-multiplayer-chaos.js` — Multiplayer chaos extensions
121. `js/smb-designer.js` — Level designer tool
122. `js/smb-test-tools.js` — Test/QA tooling
123. `js/smb-replay.js` — Match replay recording, storage (IndexedDB, up to 3 replays), download, and viewer (loaded last)

Not in the numbered list yet (the list predates them): `js/smb-figure-rig.js` (`FigureRig`) and, right after it, `js/smb-home-v2.js` — the game-screen home (`_homeV2On`, `_homeV2Scene`, `HOME_V2_MODES`); drawn by the home canvas loop in `smb-menu-ui.js`, `?classichome` turns it off.

Dependencies: GSAP 3.12.5 and PeerJS 1.5.4, vendored in `js/vendor/` (the game is handed around as a zip and run from local folders, where CDNs can be blocked). Player build: `tools/package/build-school.sh` -> `dist/stickman-evolution.zip`.

**Cache-busting:** All `<script>` tags use a `?v=` suffix (currently `?v=3.9.3`, with the newest scripts at `?v=3.9.4`). When adding a new script to `index.html`, match the current version suffix. Bump the version string across all tags when shipping a breaking change. Verify the current value with `grep -oE '\?v=[0-9.]+' index.html | sort | uniq -c` rather than trusting this doc.
