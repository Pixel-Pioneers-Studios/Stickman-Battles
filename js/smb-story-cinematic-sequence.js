'use strict';
// smb-story-cinematic-sequence.js — plays a RUN of story chapters as one
// continuous cinematic instead of a click-through reader, one chapter at a time.
//
// Depends on: smb-story-narrative-scene.js (showNarrativeScene + its `cinematic`
// option), smb-story-engine-flow.js (_showBranchChoice, _beginChapter2),
// smb-story-config.js (_story2, _saveStory2). Loads AFTER all of them.
//
// WHY THIS EXISTS
// Saga III runs eleven consecutive text chapters (170-180) immediately before its
// finale: Peak Form, After Everything, Into the Substrate, and the eight
// Reckonings. Measured, Saga III is 35 chapters of which 25 are pure text. Inside
// a 186-chapter game that is an earned slow movement; sold as a standalone it is
// the stretch where "is this a game" gets asked.
//
// The fix is NOT to force combat into them. The Reckonings are deliberate
// dialectic — "The Void Mind does not argue. It presents the version." — and
// every one of them carries a branchPrompt with real choices. Converting them
// would destroy interactive content (handoff landmine 1) and damage the best
// writing in the game to fix a metric.
//
// So the sequence stays exactly as authored and the PRESENTATION changes: it
// plays as one film with continuous camera, auto-advancing beats and a real
// skip, and the choices land inside it as the only thing you actually do.

// ── Declared runs ─────────────────────────────────────────────────────────────
// `from`/`to` are runtime chapter ids, which is unavoidable here — but ids shift
// on any renumber, and this repo has been bitten by that before. Each run
// therefore carries the TITLES it expects at both ends; _resolveRun() verifies
// them and refuses to play a run that has drifted, rather than silently playing
// eleven wrong chapters. See docs/handoffs — "key on arc ids, never chapter
// numbers" applies to saga bounds; here the titles are the guard.
const STORY_CINEMATIC_RUNS = [
  {
    id:        'substrate_reckonings',
    from:      170, fromTitle: 'Peak Form',
    to:        180, toTitle:   'What Remains',
    label:     'The Reckonings',
    hold:      70,
  },
];

// The run that starts at this chapter id, or null. Verified against titles.
function _resolveRun(chId) {
  if (typeof STORY_CHAPTERS2 === 'undefined') return null;
  for (const run of STORY_CINEMATIC_RUNS) {
    if (run.from !== chId) continue;
    const a = STORY_CHAPTERS2[run.from];
    const b = STORY_CHAPTERS2[run.to];
    if (!a || !b) { console.warn('[StoryCinematic] run', run.id, 'out of range — not playing'); return null; }
    if (a.title !== run.fromTitle || b.title !== run.toTitle) {
      console.warn('[StoryCinematic] run', run.id, 'has drifted (expected "' + run.fromTitle +
                   '".."' + run.toTitle + '", found "' + a.title + '".."' + b.title +
                   '") — not playing. Re-point STORY_CINEMATIC_RUNS after a renumber.');
      return null;
    }
    return run;
  }
  return null;
}

function isStoryCinematicRunStart(chId) { return !!_resolveRun(chId); }

// ── Per-chapter bookkeeping ───────────────────────────────────────────────────
// Silent completion: the whole point is ONE cinematic, so eleven victory screens
// would defeat it. This is the same bookkeeping _beginChapter2 does for its
// `_menuHidden` no-fight path — mark defeated, award tokens, advance the pointer.
function _cinCompleteChapter(ch) {
  if (typeof _story2 === 'undefined' || !_story2) return;
  if (!Array.isArray(_story2.defeated)) _story2.defeated = [];
  if (!_story2.defeated.includes(ch.id)) _story2.defeated.push(ch.id);
  _story2.tokens = (_story2.tokens || 0) + (ch.tokenReward || 0);
  _story2.chapter = Math.max(_story2.chapter || 0, ch.id + 1);
  if (typeof _saveStory2 === 'function') _saveStory2();
}

// ── The runner ────────────────────────────────────────────────────────────────
// Plays [run.from .. run.to] as one film. Per chapter: narration, then its
// choice (if it has one), then silent completion, then straight into the next.
//
// Skipping is deliberately NOT "skip everything". It fast-forwards the narration
// of the current chapter and lands on that chapter's choice. The choices are the
// only interaction in the sequence and the entire conceit is that the Void Mind
// is recording what YOU say — so they are never auto-answered on the player's
// behalf. (The flags are currently record-only: nothing reads branchFlags, so a
// player who abandons mid-run breaks nothing mechanically.)
function playStoryCinematicRun(chId, onDone) {
  const run = _resolveRun(chId);
  if (!run) return false;

  const ids = [];
  for (let i = run.from; i <= run.to; i++) ids.push(i);
  const total = ids.length;

  // Close the story modal — this takes over the screen.
  const modal = document.getElementById('storyModal');
  if (modal) modal.style.display = 'none';

  let idx = 0;

  const finish = () => {
    if (typeof onDone === 'function') { onDone(); return; }
    // Default: hand control to the chapter after the run, exactly as a normal
    // chapter completion would.
    const next = (typeof STORY_CHAPTERS2 !== 'undefined') ? STORY_CHAPTERS2[run.to + 1] : null;
    if (next && typeof _beginChapter2 === 'function') _beginChapter2(run.to + 1);
    else if (typeof openStoryMenu === 'function') openStoryMenu();
  };

  const step = () => {
    if (idx >= total) { finish(); return; }
    const ch = STORY_CHAPTERS2[ids[idx]];
    if (!ch) { idx++; step(); return; }

    if (typeof _activeStory2Chapter !== 'undefined') _activeStory2Chapter = ch;

    const afterChapter = () => {
      _cinCompleteChapter(ch);
      idx++;
      step();
    };

    // The choice, if this chapter has one. Presented after its narration.
    const doChoice = () => {
      const hasChoice = Array.isArray(ch.choices) && ch.choices.length && ch.branchPrompt;
      if (hasChoice && typeof _showBranchChoice === 'function') _showBranchChoice(ch, afterChapter);
      else afterChapter();
    };

    // Saga cold opens still apply inside a run (see _sagaChapterNarrative).
    const lines = (typeof _sagaChapterNarrative === 'function')
      ? _sagaChapterNarrative(ch)
      : (ch.narrative || []);

    if (!lines.length) { doChoice(); return; }

    if (typeof showNarrativeScene !== 'function') { doChoice(); return; }
    showNarrativeScene(lines, ch, doChoice, {
      cinematic: true,
      hold:      run.hold || 80,
      label:     run.label,
      progress:  { done: idx, total: total },
      // Skip lands on this chapter's choice rather than jumping the whole run.
      onSkip:    doChoice,
    });
  };

  step();
  return true;
}

window.STORY_CINEMATIC_RUNS      = STORY_CINEMATIC_RUNS;
window.isStoryCinematicRunStart  = isStoryCinematicRunStart;
window.playStoryCinematicRun     = playStoryCinematicRun;
