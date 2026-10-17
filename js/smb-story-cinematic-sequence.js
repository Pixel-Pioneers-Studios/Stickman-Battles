'use strict';
// Plays a run of story chapters as one continuous cinematic, not a click-through reader.
// Depends on smb-story-narrative-scene.js, smb-story-engine-flow.js and smb-story-config.js.
// Loads after all of them.
//
// Saga III has eleven text-only chapters (170-180) before its finale. As one film they
// keep their branch choices, which are the only thing the player actually does.
// The sequence stays as authored. Only the presentation changes: one continuous camera,
// auto-advancing beats, a real skip.

// Declared runs. Ids shift on renumbering, so each run also carries the expected
// titles at both ends. _resolveRun() refuses a run whose titles have drifted.
const STORY_CINEMATIC_RUNS = [
  {
    id:        'substrate_reckonings',
    from:      170, fromTitle: 'Peak Form',
    to:        180, toTitle:   'What Remains',
    label:     'The Reckonings',
    // Minimum hold. Real pacing comes from CIN_CPS in smb-story-narrative-scene.js.
    // This floor stops one-word beats from flashing past.
    hold:      45,
  },
];

// The run starting at this chapter id, or null.
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

// Per-chapter bookkeeping. Completion is silent: eleven victory screens would
// break the one-film feel. Same steps as _beginChapter2's no-fight path.
function _cinCompleteChapter(ch) {
  if (typeof _story2 === 'undefined' || !_story2) return;
  if (!Array.isArray(_story2.defeated)) _story2.defeated = [];
  if (!_story2.defeated.includes(ch.id)) _story2.defeated.push(ch.id);
  _story2.tokens = (_story2.tokens || 0) + (ch.tokenReward || 0);
  _story2.chapter = Math.max(_story2.chapter || 0, ch.id + 1);
  if (typeof _saveStory2 === 'function') _saveStory2();
}

// The runner. Plays run.from..run.to as one film: narration, then the choice if any,
// then silent completion, then the next chapter.
// Skip fast-forwards the current narration and lands on its choice. Choices are never
// auto-answered, since the Void Mind records what the player says. branchFlags is
// record-only, so abandoning mid-run breaks nothing.
function playStoryCinematicRun(chId, onDone) {
  const run = _resolveRun(chId);
  if (!run) return false;

  const ids = [];
  for (let i = run.from; i <= run.to; i++) ids.push(i);
  const total = ids.length;

  // Close the story modal. The film takes over the screen.
  const modal = document.getElementById('storyModal');
  if (modal) modal.style.display = 'none';

  let idx = 0;

  const finish = () => {
    if (typeof onDone === 'function') { onDone(); return; }
    // Default: hand control to the chapter after the run, as normal completion does.
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

    // The choice, if any, comes after narration. A playable `beat` plays between them,
    // and any `afterNarrative` comes before the choice.
    const doChoice = () => {
      if (ch.beat && !ch._beatPlayed && typeof _playChapterBeat === 'function') {
        ch._beatPlayed = true;
        if (typeof _seenNarrativeIds !== 'undefined') _seenNarrativeIds.add(ch.id); // retries skip the narration
        _playChapterBeat(ch, () => { _activeStory2Chapter = ch; playAfter(); });
        return;
      }
      ch._beatPlayed = false;
      const hasChoice = Array.isArray(ch.choices) && ch.choices.length && ch.branchPrompt;
      if (hasChoice && typeof _showBranchChoice === 'function') _showBranchChoice(ch, afterChapter);
      else afterChapter();
    };
    const playAfter = () => {
      const after = Array.isArray(ch.afterNarrative) ? ch.afterNarrative : [];
      if (!after.length || typeof showNarrativeScene !== 'function') { doChoice(); return; }
      const first = (typeof _sagaChapterNarrative === 'function') ? _sagaChapterNarrative(ch) : (ch.narrative || []);
      const off = (typeof window._storyBeatCount === 'function') ? window._storyBeatCount(first) : 0;
      const chAfter = Object.assign({}, ch, { _sceneBeatOffset: off });
      showNarrativeScene(after, chAfter, doChoice, {
        cinematic: true, hold: run.hold || 80, label: run.label,
        progress:  { done: idx, total: total },
        onSkip:    doChoice,
      });
    };

    // Saga cold opens still apply inside a run (_sagaChapterNarrative).
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
      // Skip lands on this chapter's choice, not the end of the run.
      onSkip:    doChoice,
    });
  };

  step();
  return true;
}

window.STORY_CINEMATIC_RUNS      = STORY_CINEMATIC_RUNS;
window.isStoryCinematicRunStart  = isStoryCinematicRunStart;
window.playStoryCinematicRun     = playStoryCinematicRun;
