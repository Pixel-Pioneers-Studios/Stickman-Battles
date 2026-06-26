// Loads AFTER smb-story-engine.js AND all arc data files.
// Calls engine helpers - do NOT reorder relative to smb-story-engine.js.

// Step 1: Sort registry by id and validate no gaps
STORY_CHAPTER_REGISTRY.sort((a, b) => a.id - b.id);
STORY_CHAPTER_REGISTRY.forEach((ch, i) => {
  if (ch.id !== i) console.error(`[Story] id mismatch: index ${i} has id ${ch.id}`);
});

// Step 2: Expose backward-compatible alias (engine refs use this name)
const STORY_CHAPTERS2 = STORY_CHAPTER_REGISTRY;

// Step 3: Promote noFight chapters to exploration chapters (sets noFight=false, type='exploration')
//         Must run before expansion. Epilogues are explicitly skipped and remain unchanged.
_promotePassiveStoryChapters();

// Step 4: Phase prebuild - parity with live code; caches .phases on original chapter objects
//         for any caller that reads the property directly outside the expansion path.
//         NOTE: _expandStoryChaptersInPlace() rebuilds phases independently on its own copy;
//         this loop is NOT a dependency for expansion correctness.
for (const _ch of STORY_CHAPTERS2) {
  if (_ch && !_ch.isEpilogue) _storyBuildPhases(_ch);
}

// Step 5: Act/Arc structure - must live here, NOT inside any arc file
//         Chapter ranges use the registered chapter IDs (pre-expansion).
//         10 acts:
//           I   Initial Encounter  (0–5)
//           II  City + Fragment Echoes (6–15)
//           III Rifts / Veran      (16–37)
//           IV  Rural              (38–54)  ← Act IV arc ranges 32–54 approx
//           V   Stickman Universe + Calix (49–68)
//           VI  Damnation + Fallen God + Multiverse + Betrayal (69–119)
//           VII Creator            (120–136)
//           VIII True Form + Aftermath (137–145)
//           IX  Absolute Axiom     (146–161)
//           X   The Substrate      (162–175)
const STORY_ACT_STRUCTURE = [
  {
    id: 'act1', label: 'Act I — Initial Encounter', color: '#88aacc',
    arcs: [
      { id: 'arc0-0', label: 'The Incident', chapterRange: [0, 5] },
    ],
  },
  {
    id: 'act2', label: 'Act II — City', color: '#6699bb',
    arcs: [
      { id: 'arc0-1', label: 'City Collapse', chapterRange: [6, 12] },
      { id: 'arc0-fragments', label: 'Fragment Echoes', chapterRange: [13, 15] },
    ],
  },
  {
    id: 'act3', label: 'Act III — Rifts / Veran', color: '#7744cc',
    arcs: [
      { id: 'arc1-0', label: 'Fracture Network', chapterRange: [16, 22] },
      { id: 'arc1-1', label: 'The Core', chapterRange: [23, 30] },
      { id: 'arc1-lab', label: 'Laboratory Truth', chapterRange: [31, 31] },
    ],
  },
  {
    id: 'act4', label: 'Act IV — Rural', color: '#33aa44',
    arcs: [
      { id: 'arc2-0', label: 'The Rift Core', chapterRange: [32, 38] },
      { id: 'arc2-1', label: 'Forest & Ice', chapterRange: [39, 45] },
      { id: 'arc2-2', label: 'Ruins & Collapse', chapterRange: [46, 48] },
    ],
  },
  {
    id: 'act5', label: 'Act V — Stickman Universe', color: '#cc7722',
    arcs: [
      { id: 'arc3-0',     label: 'The Assembly',       chapterRange: [49, 55] },
      { id: 'arc3-1',     label: 'The Fracture Within', chapterRange: [56, 65] },
      { id: 'arc3-calix', label: 'The Hidden Chamber',  chapterRange: [66, 68] },
    ],
  },
  {
    // Damnation (69–74) + Fallen God (75–83) + multiverse worlds (84–114) + Betrayal (115–119)
    id: 'act6', label: 'Act VI — The Loop & Multiverse', color: '#bb88ff',
    arcs: [
      { id: 'arc5-damnation', label: 'The Damnation Loop',      chapterRange: [69,  74]  },
      { id: 'arc5-godfall',   label: 'The Fallen God\'s Trial',  chapterRange: [75,  83]  },
      { id: 'arc4mv-0',       label: 'War & Flux',              chapterRange: [84,  91]  },
      { id: 'arc4mv-1',       label: 'Shadow & Titan',          chapterRange: [92,  99]  },
      { id: 'arc4mv-2',       label: 'Null Space',              chapterRange: [100, 104] },
      { id: 'arc4mv-3',       label: 'The Quiet Expanse',       chapterRange: [105, 109] },
      { id: 'arc4mv-4',       label: 'The Fracture Coast',      chapterRange: [110, 114] },
      { id: 'arc5-betrayal',  label: 'The Betrayal',            chapterRange: [115, 119] },
    ],
  },
  {
    id: 'act7', label: 'Act VII — Creator\'s Domain', color: '#dd3344',
    arcs: [
      { id: 'arc4-0', label: 'The Creator\'s Threshold', chapterRange: [120, 128] },
      { id: 'arc4-1', label: 'The Final Architecture',   chapterRange: [129, 136] },
    ],
  },
  {
    id: 'act8', label: 'Act VIII — True Form', color: '#cc44ff',
    arcs: [
      { id: 'arc5-0',      label: 'Into the Void',        chapterRange: [137, 140] },
      { id: 'arc5-1',      label: 'Final Confrontation',  chapterRange: [141, 141] },
      { id: 'arc5-bridge', label: 'The Aftermath',        chapterRange: [142, 145] },
    ],
  },
  {
    id: 'act9', label: 'Act IX — Absolute Axiom', color: '#ffe8ff',
    arcs: [
      { id: 'arc7-0', label: 'The Kernel',        chapterRange: [146, 148] },
      { id: 'arc7-1', label: 'God\'s Domain',      chapterRange: [149, 155] },
      { id: 'arc7-2', label: 'Absolute Axiom',     chapterRange: [156, 161] },
    ],
  },
  {
    id: 'act10', label: 'Act X — The Substrate', color: '#220033',
    arcs: [
      { id: 'arc-vm-entry',      label: 'Into the Substrate', chapterRange: [162, 162] },
      { id: 'arc-vm-reckonings', label: 'The Reckonings',     chapterRange: [163, 170] },
      { id: 'arc-vm-trial',      label: 'The Trial',          chapterRange: [171, 171] },
      { id: 'arc-vm-after',      label: 'After',              chapterRange: [172, 172] },
      { id: 'arc-vm-fight',      label: 'The Confrontation',  chapterRange: [173, 175] },
    ],
  },
];

// Step 6: Expand chapters in-place - also rebuilds STORY_ACT_STRUCTURE chapterRanges
_expandStoryChaptersInPlace();
