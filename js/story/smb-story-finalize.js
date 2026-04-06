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
//         IDs match the live runtime values exactly (including the non-sequential 'act4mv')
const STORY_ACT_STRUCTURE = [
  {
    id: 'act0', label: 'Act I — Fracture Point', color: '#88aacc',
    arcs: [
      { id: 'arc0-0', label: 'The Incident', chapterRange: [0, 5] },
      { id: 'arc0-1', label: 'City Collapse', chapterRange: [6, 12] },
    ],
  },
  {
    id: 'act1', label: 'Act II — Into the Wound', color: '#7744cc',
    arcs: [
      { id: 'arc1-0', label: 'Fracture Network', chapterRange: [13, 19] },
      { id: 'arc1-1', label: 'The Core', chapterRange: [20, 27] },
    ],
  },
  {
    id: 'act2', label: 'Act III — The Architects', color: '#33aa44',
    arcs: [
      { id: 'arc2-0', label: 'Multiversal Core', chapterRange: [28, 34] },
      { id: 'arc2-1', label: 'Forest & Ice', chapterRange: [35, 41] },
      { id: 'arc2-2', label: 'Ruins & Collapse', chapterRange: [42, 44] },
    ],
  },
  {
    id: 'act3', label: 'Act IV — The Architects\' War', color: '#cc7722',
    arcs: [
      { id: 'arc3-0', label: 'The Assembly', chapterRange: [45, 51] },
      { id: 'arc3-1', label: 'The Fracture Within', chapterRange: [52, 61] },
    ],
  },
  {
    id: 'act4mv', label: 'Act V — Multiversal Ascension', color: '#bb88ff',
    arcs: [
      { id: 'arc4mv-0', label: 'War & Flux', chapterRange: [62, 65] },
      { id: 'arc4mv-1', label: 'Shadow & Titan', chapterRange: [66, 69] },
    ],
  },
  {
    id: 'act4', label: 'Act VI — Into the Architecture', color: '#dd3344',
    arcs: [
      { id: 'arc4-0', label: 'The Creator\'s Threshold', chapterRange: [70, 77] },
      { id: 'arc4-1', label: 'The Final Architecture', chapterRange: [78, 85] },
    ],
  },
  {
    id: 'act5', label: 'Act VII — True Form', color: '#cc44ff',
    arcs: [
      { id: 'arc5-0', label: 'Into the Void', chapterRange: [86, 86] },
      { id: 'arc5-1', label: 'Final Confrontation', chapterRange: [87, 88] },
    ],
  },
  {
    id: 'act6', label: 'Act VIII — Godfall', color: '#ffaa00',
    arcs: [
      { id: 'arc6-0', label: 'The Signal', chapterRange: [89, 90] },
      { id: 'arc6-1', label: 'The Fallen God', chapterRange: [91, 92] },
    ],
  },
];

// Step 6: Expand chapters in-place - also rebuilds STORY_ACT_STRUCTURE chapterRanges
_expandStoryChaptersInPlace();
