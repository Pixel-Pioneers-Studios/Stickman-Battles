// smb-saga-structure.js
// Saga layer — groups STORY_ACT_STRUCTURE acts/arcs into standalone games.
// Depends on: smb-story-finalize.js (MUST load after it — needs the chapterRanges
//             that _expandStoryChaptersInPlace() rebuilds at load time).
//
// See docs/SAGA_SPLIT_PLAN.md.
//
// The story ships as one build. ACTIVE_SAGA selects which slice of it that build
// presents. 'full' is the default and every helper below then reports the whole
// story, so the combined game behaves exactly as it did before this file existed.
//
// Bounds are keyed on ARC IDS, never chapter numbers: _expandStoryChaptersInPlace()
// rewrites every chapterRange to expanded indices, and although that is currently a
// no-op (186 authored -> 186 runtime), adding a single plain-duel chapter re-enables
// it. Arc ids are stable across expansion; chapter numbers are not.
'use strict';

// Which saga this build ships. 'full' | 'saga1' | 'saga2' | 'saga3'.
const ACTIVE_SAGA = 'full';

// The Saga II / Saga III boundary falls INSIDE Act VIII — the companion arc
// (arc5-bridge) is Saga III's cold open, not Saga II's denouement. That is why
// these are arc bounds and not act bounds.
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
    // Act VIII is split across Saga II and Saga III. Its authored name is
    // "True Form" — correct for Saga II, which contains that fight, and wrong
    // for Saga III, which only inherits the companion-arc tail.
    actLabels: { act8: 'The Aftermath' },
  },
];

// ── Resolution ────────────────────────────────────────────────────────────────

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

// The act list a saga presents, as a derived VIEW — the source STORY_ACT_STRUCTURE
// is never mutated. Acts on a saga boundary are trimmed to only their in-saga arcs,
// and act numbering restarts per saga (Saga III opens on "Act I", not "Act IX").
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
      // Strip the authored "Act VII — " prefix; the saga renumbers below.
      label: _sagaRelabelAct(named, view.length + 1),
      color: act.color,
      arcs,
      _sourceAct: act,
    });
  }
  return view;
}

const _SAGA_ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

// "Act VIII — True Form" + 2  ->  "Act II — True Form"
function _sagaRelabelAct(label, n) {
  const roman = _SAGA_ROMAN[n - 1] || String(n);
  const m = String(label || '').match(/^Act\s+[IVXLC]+\s*[—–-]\s*(.+)$/);
  return m ? `Act ${roman} — ${m[1]}` : label;
}

// Acts the current build presents.
function activeSagaActView() {
  return sagaIsFullBuild() ? STORY_ACT_STRUCTURE : sagaActView(ACTIVE_SAGA);
}

// Chapter indices the current build presents, as a flat count. Used by the
// progress bar so "12/70" means 12 of THIS game, not 12 of 184.
function activeSagaChapterCount() {
  const [a, b] = activeSagaRange();
  return Math.max(0, b - a + 1);
}

// Clamp a chapter index into the active saga. Used by the level select so a save
// pointing outside this build (a fresh save's chapter 0 on a Saga III build, or a
// carried save pointing past the end) still resolves to a playable chapter. The
// saved value is never mutated — a build switch must not corrupt the other build's
// progress.
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

// The first arc of the active saga — always unlocked, the way the story's first
// arc is on a full build. Without this a saga build is unplayable: its opening
// arc's predecessor sits in the previous saga and can never be completed.
function sagaFirstArc() {
  const view = activeSagaActView();
  return (view[0] && view[0].arcs && view[0].arcs[0]) || null;
}

// ── Carry-forward ─────────────────────────────────────────────────────────────
// Which EARLIER sagas this save shows as complete. Carry-forward is
// acknowledgment only — it is never a requirement and never gates content, so
// nothing in the unlock path may read this. A player starting here cold must
// lose nothing but the recognition.
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

// Per-saga power baseline. Every saga starts its own ramp at 1.0 by default —
// the God of War reset, where a returning protagonist is re-established rather
// than resumed at endgame strength. Give a saga its own `powerBaseline` to
// change that; the ramp itself is +0.02 per cleared chapter, capped at 3.0.
function activeSagaPowerBaseline() {
  const def = sagaDef(ACTIVE_SAGA);
  return (def && typeof def.powerBaseline === 'number') ? def.powerBaseline : 1.0;
}

// smb-story-engine-events.js runs its power-level restore at load, BEFORE this
// file exists, so it falls back to the whole-story count. Re-run it now that the
// saga scope is resolvable.
if (typeof _storyRecomputePowerLevel === 'function') _storyRecomputePowerLevel();
