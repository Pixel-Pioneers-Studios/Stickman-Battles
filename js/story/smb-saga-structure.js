// smb-saga-structure.js
// Saga layer: groups STORY_ACT_STRUCTURE acts and arcs into standalone games.
// Depends on smb-story-finalize.js, which must load first (it rebuilds chapterRanges).
//
// See docs/SAGA_SPLIT_PLAN.md.
//
// One build ships the whole story. ACTIVE_SAGA picks the slice it presents. 'full' (default)
// reports the whole story, so the combined game is unchanged.
//
// Bounds are arc ids, not chapter numbers. Expansion rewrites chapter ranges, and arc ids survive it.
'use strict';

// Which saga this build ships. 'full' | 'saga1' | 'saga2' | 'saga3'.
const ACTIVE_SAGA = 'full';

// The Saga II / III boundary falls inside Act VIII (arc5-bridge is Saga III's cold open), so bounds are arc-based.
const SAGA_STRUCTURE = [
  {
    id: 'saga1', title: 'The Fragment', color: '#88aacc',
    tagline: 'Ninety-four carried it before you.',
    firstArc: 'arc0-0', lastArc: 'arc3-calix',
  },
  {
    id: 'saga2', title: 'The Multiverse War', color: '#bb88ff',
    tagline: 'The man who built the machine.',
    firstArc: 'arc5-damnation', lastArc: 'arc5-1',
  },
  {
    id: 'saga3', title: 'The Substrate', color: '#220033',
    tagline: 'What cannot be erased.',
    firstArc: 'arc5-bridge', lastArc: 'arc-vm-fight',
    // Act VIII is split across Sagas II and III. "True Form" fits II (the fight), not III (companion tail).
    actLabels: { act8: 'The Aftermath' },
  },
];

// Resolution

// Flatten the act structure into ordered { act, actIdx, arc } records.
function _sagaFlatArcs() {
  const out = [];
  if (typeof STORY_ACT_STRUCTURE === 'undefined') return out;
  STORY_ACT_STRUCTURE.forEach((act, actIdx) => {
    (act.arcs || []).forEach(arc => out.push({ act, actIdx, arc }));
  });
  return out;
}

function sagaDef(sagaId) {
  return SAGA_STRUCTURE.find(s => s.id === sagaId) || null;
}

// True when this build ships the whole story rather than one saga.
function sagaIsFullBuild() {
  return ACTIVE_SAGA === 'full' || !sagaDef(ACTIVE_SAGA);
}

// [startChapter, endChapter] for a saga, in post-expansion indices.
// Returns the whole story for 'full' / an unknown id.
function sagaChapterRange(sagaId) {
  const flat = _sagaFlatArcs();
  if (!flat.length) return [0, 0];
  const whole = [flat[0].arc.chapterRange[0], flat[flat.length - 1].arc.chapterRange[1]];
  const def = sagaDef(sagaId);
  if (!def) return whole;
  const first = flat.find(f => f.arc.id === def.firstArc);
  const last  = flat.find(f => f.arc.id === def.lastArc);
  // A renamed or removed arc must not silently truncate the story.
  if (!first || !last) return whole;
  return [first.arc.chapterRange[0], last.arc.chapterRange[1]];
}

function activeSagaRange()          { return sagaChapterRange(ACTIVE_SAGA); }
function activeSagaFirstChapterId() { return activeSagaRange()[0]; }
function activeSagaFinalChapterId() { return activeSagaRange()[1]; }

function isChapterInSaga(chIdx, sagaId) {
  const [a, b] = sagaChapterRange(sagaId);
  return chIdx >= a && chIdx <= b;
}
function isChapterInActiveSaga(chIdx) {
  if (sagaIsFullBuild()) return true;
  return isChapterInSaga(chIdx, ACTIVE_SAGA);
}

// Which saga a chapter belongs to (by id), or null if it falls outside all of them.
function sagaForChapter(chIdx) {
  for (const s of SAGA_STRUCTURE) {
    if (isChapterInSaga(chIdx, s.id)) return s;
  }
  return null;
}

// The act list a saga presents, as a derived view. STORY_ACT_STRUCTURE is never mutated.
// Act numbering restarts per saga (Saga III opens on Act I).
function sagaActView(sagaId) {
  if (typeof STORY_ACT_STRUCTURE === 'undefined') return [];
  if (!sagaDef(sagaId)) return STORY_ACT_STRUCTURE;
  const [lo, hi] = sagaChapterRange(sagaId);
  const overrides = (sagaDef(sagaId) || {}).actLabels || {};
  const view = [];
  for (const act of STORY_ACT_STRUCTURE) {
    const arcs = (act.arcs || []).filter(a => a.chapterRange[0] >= lo && a.chapterRange[1] <= hi);
    if (!arcs.length) continue;
    const named = overrides[act.id] ? `Act X — ${overrides[act.id]}` : act.label;
    view.push({
      id: act.id,
      // Strip the authored "Act VII " prefix. The saga renumbers below.
      label: _sagaRelabelAct(named, view.length + 1),
      color: act.color,
      arcs,
      _sourceAct: act,
    });
  }
  return view;
}

const _SAGA_ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

// "Act VIII: True Form" + 2  ->  "Act II: True Form"
function _sagaRelabelAct(label, n) {
  const roman = _SAGA_ROMAN[n - 1] || String(n);
  const m = String(label || '').match(/^Act\s+[IVXLC]+\s*[—–-]\s*(.+)$/);
  return m ? `Act ${roman} — ${m[1]}` : label;
}

// Acts the current build presents.
function activeSagaActView() {
  return sagaIsFullBuild() ? STORY_ACT_STRUCTURE : sagaActView(ACTIVE_SAGA);
}

// Chapter indices the active build presents, as a flat count. The progress bar uses it, so 12/70 means
// 12 of this game, not 12 of 184.
function activeSagaChapterCount() {
  const [a, b] = activeSagaRange();
  return Math.max(0, b - a + 1);
}

// Clamp a chapter index into the active saga, so a save outside this build still resolves to a playable
// chapter. The saved value is never mutated, so a build switch can't corrupt the other build's progress.
function sagaClampChapter(idx) {
  if (sagaIsFullBuild()) return idx;
  const [lo, hi] = activeSagaRange();
  if (typeof idx !== 'number' || isNaN(idx)) return lo;
  return Math.max(lo, Math.min(hi, idx));
}

// Is this arc inside the active saga? ('full' builds contain every arc.)
function sagaArcInActive(arc) {
  if (!arc || !arc.chapterRange) return false;
  if (sagaIsFullBuild()) return true;
  const [lo, hi] = activeSagaRange();
  return arc.chapterRange[0] >= lo && arc.chapterRange[1] <= hi;
}

// First arc of the active saga is always unlocked. Its predecessor is in the previous saga and would
// never be completed here.
function sagaFirstArc() {
  const view = activeSagaActView();
  return (view[0] && view[0].arcs && view[0].arcs[0]) || null;
}

// Carry-forward
// Earlier sagas shown as complete. Acknowledgment only: never a requirement, never gates content,
// so nothing in the unlock path may read this.
function sagaCarryForward(defeated) {
  const out = [];
  if (!Array.isArray(defeated) || !defeated.length) return out;
  const activeIdx = SAGA_STRUCTURE.findIndex(s => s.id === ACTIVE_SAGA);
  if (activeIdx <= 0) return out;              // 'full' or the first saga: nothing prior
  const seen = new Set(defeated);
  for (let i = 0; i < activeIdx; i++) {
    const saga = SAGA_STRUCTURE[i];
    const [lo, hi] = sagaChapterRange(saga.id);
    let all = true;
    for (let c = lo; c <= hi; c++) { if (!seen.has(c)) { all = false; break; } }
    if (all) out.push(saga);
  }
  return out;
}

// Per-saga power baseline. Each saga ramps from 1.0 (a returning protagonist is re-established, not
// resumed at endgame strength). Set powerBaseline per saga to change it. Ramp: +0.02 per cleared chapter, cap 3.0.
function activeSagaPowerBaseline() {
  const def = sagaDef(ACTIVE_SAGA);
  return (def && typeof def.powerBaseline === 'number') ? def.powerBaseline : 1.0;
}

// engine-events.js restores power at load, before this file exists, so it used the whole-story count.
// Re-run it here, now that the saga scope resolves.
if (typeof _storyRecomputePowerLevel === 'function') _storyRecomputePowerLevel();
