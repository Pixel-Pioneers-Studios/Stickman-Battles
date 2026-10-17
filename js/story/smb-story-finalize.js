// Loads after smb-story-engine.js and all arc files. Calls engine helpers, so keep the order.

// Sort the registry by id and check for gaps.
STORY_CHAPTER_REGISTRY.sort((a, b) => a.id - b.id);
STORY_CHAPTER_REGISTRY.forEach((ch, i) => {
  if (ch.id !== i) console.error(`[Story] id mismatch: index ${i} has id ${ch.id}`);
});

// Backward-compatible alias. Engine code uses this name.
const STORY_CHAPTERS2 = STORY_CHAPTER_REGISTRY;

// _story2 loads before the registry exists, so normalise its defeated keys here.
try { if (typeof _story2 !== 'undefined' && _migrateStory2DefeatedKeys(_story2)) _saveStory2(); } catch (e) { /* non-fatal */ }

// Promote noFight chapters to exploration. Runs before expansion. Epilogues are skipped.
_promotePassiveStoryChapters();

// Caches .phases on the original chapters for direct readers. Expansion rebuilds
// its own phases, so this loop is not needed for correctness.
for (const _ch of STORY_CHAPTERS2) {
  if (_ch && !_ch.isEpilogue) _storyBuildPhases(_ch);
}

// Act and arc ranges use pre-expansion chapter IDs. Keep this in this file, not in an arc file.
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
      { id: 'arc0-fragments', label: 'Fragment Echoes', chapterRange: [13, 16] },
    ],
  },
  {
    id: 'act3', label: 'Act III — Rifts / Veran', color: '#7744cc',
    arcs: [
      { id: 'arc1-0', label: 'Fracture Network', chapterRange: [17, 23] },
      { id: 'arc1-1', label: 'The Core', chapterRange: [24, 31] },
      { id: 'arc1-lab', label: 'Laboratory Truth', chapterRange: [32, 32] },
    ],
  },
  {
    id: 'act4', label: 'Act IV — Rural', color: '#33aa44',
    arcs: [
      { id: 'arc2-0', label: 'The Rift Core', chapterRange: [33, 39] },
      { id: 'arc2-1', label: 'Forest & Ice', chapterRange: [40, 46] },
      { id: 'arc2-2', label: 'Ruins & Collapse', chapterRange: [47, 49] },
    ],
  },
  {
    id: 'act5', label: 'Act V — Stickman Universe', color: '#cc7722',
    arcs: [
      { id: 'arc3-0',     label: 'The Assembly',       chapterRange: [50, 56] },
      { id: 'arc3-1',     label: 'The Fracture Within', chapterRange: [57, 66] },
      { id: 'arc3-calix', label: 'The Hidden Chamber',  chapterRange: [67, 69] },
    ],
  },
  {
    id: 'act6', label: 'Act VI — The Loop & Multiverse', color: '#bb88ff',
    arcs: [
      { id: 'arc5-damnation', label: 'The Damnation Loop',      chapterRange: [70, 75]  },
      { id: 'arc5-godfall',   label: 'The Fallen God\'s Trial',  chapterRange: [76, 85]  },
      { id: 'arc4mv-0',       label: 'War & Flux',              chapterRange: [86, 93]  },
      { id: 'arc4mv-1',       label: 'Shadow & Titan',          chapterRange: [94, 101] },
      { id: 'arc4mv-2',       label: 'Null Space',              chapterRange: [102, 107] },
      { id: 'arc4mv-3',       label: 'The Quiet Expanse',       chapterRange: [108, 112] },
      { id: 'arc4mv-4',       label: 'The Fracture Coast',      chapterRange: [113, 118] },
      { id: 'arc4mv-thresh',  label: 'The Collision Realm',     chapterRange: [119, 122] },
      { id: 'arc5-betrayal',  label: 'The Betrayal',            chapterRange: [123, 127] },
    ],
  },
  {
    id: 'act7', label: 'Act VII — Creator\'s Domain', color: '#dd3344',
    arcs: [
      { id: 'arc4-0', label: 'The Creator\'s Threshold', chapterRange: [128, 136] },
      { id: 'arc4-1', label: 'The Final Architecture',   chapterRange: [137, 144] },
    ],
  },
  {
    id: 'act8', label: 'Act VIII — Cosmic Axiom', color: '#cc44ff',
    arcs: [
      { id: 'arc5-0',      label: 'Into the Void',        chapterRange: [145, 149] },
      { id: 'arc5-1',      label: 'Final Confrontation',  chapterRange: [150, 150] },
      { id: 'arc5-bridge', label: 'The Aftermath',        chapterRange: [151, 154] },
    ],
  },
  {
    id: 'act9', label: 'Act IX — Absolute Axiom', color: '#ffe8ff',
    arcs: [
      { id: 'arc7-0', label: 'The Kernel',        chapterRange: [155, 157] },
      { id: 'arc7-1', label: 'God\'s Domain',      chapterRange: [158, 165] },
      { id: 'arc7-2', label: 'Absolute Axiom',     chapterRange: [166, 171] },
    ],
  },
  {
    id: 'act10', label: 'Act X — The Substrate', color: '#220033',
    arcs: [
      { id: 'arc-vm-entry',      label: 'Into the Substrate', chapterRange: [172, 172] },
      { id: 'arc-vm-reckonings', label: 'The Reckonings',     chapterRange: [173, 180] },
      { id: 'arc-vm-trial',      label: 'The Trial',          chapterRange: [181, 181] },
      { id: 'arc-vm-after',      label: 'After',              chapterRange: [182, 182] },
      { id: 'arc-vm-fight',      label: 'The Confrontation',  chapterRange: [183, 185] },
    ],
  },
];

// Expands chapters in place and rebuilds STORY_ACT_STRUCTURE chapterRanges.
_expandStoryChaptersInPlace();

// One-time save migrations that need expanded indices.
// The initial _story2 loads before expansion, so migrate it here.
window.__SMB_STORY_EXPANDED = true;
if (typeof _story2 !== 'undefined' && _migrateStory2ThreshArc(_story2)) {
  try { _saveStory2(); } catch (e) {}
}
