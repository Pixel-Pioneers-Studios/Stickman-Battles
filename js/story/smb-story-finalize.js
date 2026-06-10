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
//         8 acts matching canon:
//           I   Initial Encounter  (0–5)
//           II  City               (6–12)
//           III Rifts / Veran      (13–28)  ← Lab truth revealed at 28
//           IV  Rural              (29–45)
//           V   Stickman Universe  (46–62)
//           VI  Damnation + Fallen God + Multiverse + Betrayal (63–95)
//           VII Creator            (96–111)
//           VIII True Form — FINAL (112–117)
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
    ],
  },
  {
    id: 'act3', label: 'Act III — Rifts / Veran', color: '#7744cc',
    arcs: [
      { id: 'arc1-0', label: 'Fracture Network', chapterRange: [13, 19] },
      { id: 'arc1-1', label: 'The Core', chapterRange: [20, 27] },
      { id: 'arc1-lab', label: 'Laboratory Truth', chapterRange: [28, 28] },
    ],
  },
  {
    id: 'act4', label: 'Act IV — Rural', color: '#33aa44',
    arcs: [
      { id: 'arc2-0', label: 'The Rift Core', chapterRange: [29, 35] },
      { id: 'arc2-1', label: 'Forest & Ice', chapterRange: [36, 42] },
      { id: 'arc2-2', label: 'Ruins & Collapse', chapterRange: [43, 45] },
    ],
  },
  {
    id: 'act5', label: 'Act V — Stickman Universe', color: '#cc7722',
    arcs: [
      { id: 'arc3-0', label: 'The Assembly', chapterRange: [46, 52] },
      { id: 'arc3-1', label: 'The Fracture Within', chapterRange: [53, 62] },
    ],
  },
  {
    // Damnation (63–68) + Fallen God (69–77) + multiverse worlds (78–108) + Betrayal (109–113)
    id: 'act6', label: 'Act VI — The Loop & Multiverse', color: '#bb88ff',
    arcs: [
      { id: 'arc5-damnation', label: 'The Damnation Loop',      chapterRange: [63,  68]  },
      { id: 'arc5-godfall',   label: 'The Fallen God\'s Trial',  chapterRange: [69,  77]  },
      { id: 'arc4mv-0',       label: 'War & Flux',              chapterRange: [78,  85]  },
      { id: 'arc4mv-1',       label: 'Shadow & Titan',          chapterRange: [86,  93]  },
      { id: 'arc4mv-2',       label: 'Null Space',              chapterRange: [94,  98]  },
      { id: 'arc4mv-3',       label: 'The Quiet Expanse',       chapterRange: [99,  103] },
      { id: 'arc4mv-4',       label: 'Fracture Coast',          chapterRange: [104, 108] },
      { id: 'arc5-betrayal',  label: 'The Betrayal',            chapterRange: [109, 113] },
    ],
  },
  {
    id: 'act7', label: 'Act VII — Creator\'s Domain', color: '#dd3344',
    arcs: [
      { id: 'arc4-0', label: 'The Creator\'s Threshold', chapterRange: [114, 122] },
      { id: 'arc4-1', label: 'The Final Architecture',   chapterRange: [123, 130] },
    ],
  },
  {
    id: 'act8', label: 'Act VIII — True Form', color: '#cc44ff',
    arcs: [
      { id: 'arc5-0', label: 'Into the Void',       chapterRange: [131, 134] },
      { id: 'arc5-1', label: 'Final Confrontation', chapterRange: [135, 136] },
    ],
  },
  {
    id: 'act9', label: 'Act IX — Absolute Axiom', color: '#ffe8ff',
    arcs: [
      { id: 'arc7-0', label: 'The Kernel',          chapterRange: [140, 142] },
      { id: 'arc7-1', label: 'God\'s Domain',        chapterRange: [143, 149] },
      { id: 'arc7-2', label: 'Absolute Axiom',       chapterRange: [150, 155] },
    ],
  },
];

// Step 6: Expand chapters in-place - also rebuilds STORY_ACT_STRUCTURE chapterRanges
_expandStoryChaptersInPlace();
