'use strict';
// Story chapter expansion helpers and current-chapter state.
// Depends on smb-globals.js, smb-story-registry.js and the arc files.


function _phaseToChapter(origCh, phase, newId, pi, isFirst, isFinal, totalTokens, numPhases) {
  const phaseCh = {
    id:          newId,
    title:       origCh.title + (numPhases > 1 ? ' — ' + (phase.label || _storyPhaseName(phase.type)) : ''),
    world:       origCh.world,
    narrative:   isFirst ? (origCh.narrative || []) : [],
    // Saga cold open rides with its narrative (see _sagaChapterNarrative).
    sagaColdOpen: isFirst ? (origCh.sagaColdOpen || null) : null,
    preText:     phase.label || _storyPhaseName(phase.type),
    fightScript: isFirst ? (origCh.fightScript || []) : [],
    tokenReward: isFinal
      ? Math.max(8, Math.ceil(totalTokens * 0.55))
      : Math.max(4, Math.floor(totalTokens * 0.45 / Math.max(1, numPhases - 1))),
    playerLives: phase.playerLives || origCh.playerLives || 3,
    arena:       phase.arena || origCh.arena,
    blueprintDrop: isFinal ? (origCh.blueprintDrop || null) : null,
    storeNag:    isFinal ? (origCh.storeNag || null) : null,
    _origId:     origCh.id,
    _phaseType:  phase.type,
    _phaseFinal: isFinal,
  };

  if (phase.type === 'traversal') {
    phaseCh.type         = 'exploration';
    phaseCh.worldLength  = phase.worldLength || origCh.worldLength;
    phaseCh.objectName   = phase.objectName  || origCh.objectName;
    phaseCh.spawnEnemies = phase.spawnEnemies || origCh.spawnEnemies || [];
    phaseCh.exploreStyle = origCh.exploreStyle || null;
    phaseCh.sky          = origCh.sky;
    phaseCh.groundColor  = origCh.groundColor;
    phaseCh.platColor    = origCh.platColor;
  } else {
    if (Array.isArray(phase.opponents) && phase.opponents.length > 0) {
      const lead           = phase.opponents[0];
      phaseCh.opponentName  = lead.name         || origCh.opponentName  || 'Enemy';
      phaseCh.weaponKey     = lead.weaponKey     || origCh.weaponKey     || 'sword';
      phaseCh.classKey      = lead.classKey      || origCh.classKey      || 'warrior';
      phaseCh.aiDiff        = lead.aiDiff        || origCh.aiDiff        || 'medium';
      phaseCh.opponentColor = lead.color         || origCh.opponentColor || '#778899';
      phaseCh.armor         = lead.armor         || [];
      if (phase.opponents.length > 1) {
        phaseCh.twoEnemies  = true;
        phaseCh.secondEnemy = phase.opponents[1];
      }
    } else {
      // mini_boss final phase uses the original opponent
      phaseCh.opponentName  = origCh.opponentName;
      phaseCh.weaponKey     = origCh.weaponKey;
      phaseCh.classKey      = origCh.classKey;
      phaseCh.aiDiff        = origCh.aiDiff;
      phaseCh.opponentColor = origCh.opponentColor;
      phaseCh.armor         = origCh.armor || [];
    }
    if (isFinal) {
      phaseCh.isBossFight      = !!origCh.isBossFight;
      phaseCh.isTrueFormFight  = !!origCh.isTrueFormFight;
      phaseCh.isSovereignFight = !!origCh.isSovereignFight;
      phaseCh.isAbsoluteAxiomFight = !!origCh.isAbsoluteAxiomFight;
      if (origCh.aaStoryHealth)   phaseCh.aaStoryHealth   = origCh.aaStoryHealth;
      if (origCh.paradoxManifest) phaseCh.paradoxManifest = origCh.paradoxManifest;
    }
    // Ally fighter goes through every fight phase
    if (origCh.allyDef) phaseCh.allyDef = origCh.allyDef;
    // Trial fields must survive expansion. Dropping them fails silently.
    if (origCh.trial)      phaseCh.trial      = origCh.trial;
    if (origCh.playerCaps) phaseCh.playerCaps = origCh.playerCaps;
  }
  return phaseCh;
}

function _expandStoryChaptersInPlace() {
  const origList = STORY_CHAPTERS2.slice();
  const expanded = [];
  const origToNewRange = {};

  for (const origCh of origList) {
    const rangeStart = expanded.length;

    if (origCh.noFight || origCh.isEpilogue || origCh.isDamnationChapter || origCh.type === 'exploration'
        || origCh.type === 'assassination' || origCh.type === 'gauntlet' || origCh.type === 'ship_flight' || origCh.type === 'escort'
        || origCh.type === 'battleroyale'
        || origCh.type === 'branch' || origCh.type === 'interlude'
        || origCh.trial
        || origCh.isBossFight || origCh.isTrueFormFight || origCh.isSovereignFight || origCh.isAbsoluteAxiomFight || origCh.isGodFight
        || origCh.walkFight) {
      // Special-mode, noFight, epilogue, damnation and exploration chapters stay whole.
      // Collapsing them to a duel would lose their mode data.
      expanded.push({ ...origCh, id: expanded.length });
    } else {
      // Phases use the original id for difficulty scaling
      const phaseSrc = { ...origCh }; // don't mutate origCh
      delete phaseSrc.phases;
      const phases   = _storyBuildPhases(phaseSrc);
      const n        = phases.length;
      const tok      = origCh.tokenReward || 0;

      phases.forEach((phase, pi) => {
        expanded.push(_phaseToChapter(
          origCh, phase,
          expanded.length,
          pi,
          pi === 0,
          pi === n - 1,
          tok,
          n,
        ));
      });
    }

    origToNewRange[origCh.id] = { start: rangeStart, end: expanded.length - 1 };
  }

  // In place: the array is const
  STORY_CHAPTERS2.length = 0;
  for (const ch of expanded) STORY_CHAPTERS2.push(ch);

  for (const act of STORY_ACT_STRUCTURE) {
    for (const arc of act.arcs) {
      const [origStart, origEnd] = arc.chapterRange;
      const newStart = origToNewRange[origStart] ? origToNewRange[origStart].start : origStart;
      const newEnd   = origToNewRange[origEnd]   ? origToNewRange[origEnd].end     : origEnd;
      arc.chapterRange = [newStart, newEnd];
    }
  }
}

// Run expansion immediately after both arrays are defined


let _activeStory2Chapter = null;

