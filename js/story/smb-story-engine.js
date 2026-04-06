// smc-story.js — Story Mode: origin intro, character progression, narrative
'use strict';

// ── Enemy scaling per level ────────────────────────────────────────────────────
// enemyDmgMult:   multiplier on all damage the enemy deals (1.0 = normal)
// enemyAtkCdMult: multiplier on attack cooldown (>1 = slower attacks, 1 = normal)
const STORY_ENEMY_CONFIGS = {
  1: { enemyDmgMult: 0.45, enemyAtkCdMult: 2.2 }, // Prologue — barely a threat
  2: { enemyDmgMult: 0.55, enemyAtkCdMult: 2.0 }, // Ch1 — slow, light hits
  3: { enemyDmgMult: 0.65, enemyAtkCdMult: 1.8 }, // Ch2 — slightly more dangerous
  4: { enemyDmgMult: 0.72, enemyAtkCdMult: 1.6 }, // Ch3 — warming up
  5: { enemyDmgMult: 0.80, enemyAtkCdMult: 1.4 }, // Ch4 — real threat now
  6: { enemyDmgMult: 0.88, enemyAtkCdMult: 1.25 }, // Ch5 — tough
  7: { enemyDmgMult: 0.94, enemyAtkCdMult: 1.12 }, // Ch6 — nearly full power
  8: { enemyDmgMult: 1.00, enemyAtkCdMult: 1.00 }, // SOVEREIGN — unscaled (AdaptiveAI self-regulates)
  9: { enemyDmgMult: 1.00, enemyAtkCdMult: 1.00 }, // Ch8 — boss fight, unscaled
  10: { enemyDmgMult: 1.00, enemyAtkCdMult: 1.00 }, // Final — unscaled
};

// ── Unlock ceremonies — shown before the level-complete screen ────────────────
const STORY_UNLOCKS = {
  1: { icon: '⬆', name: 'Double Jump',   desc: 'Something inside you remembered how to fly.\nYour body moves before your mind decides.' },
  2: { icon: '⚡', name: 'Weapon Ability', desc: 'You found the rhythm of the blade.\nThe move comes naturally now.' },
  3: { icon: '✦',  name: 'Super Meter',   desc: 'Power you did not know you had is building.\nLet it charge. Let it release.' },
  4: { icon: '🔥', name: 'Full Power',     desc: 'You are no longer the person who fell through the portal.\nYou are a fighter.' },
};

// ── In-fight narrative scripts — timed subtitles during combat ────────────────
const STORY_FIGHT_SCRIPTS = {
  1: [
    { frame: 80,  text: '"You don\'t even know how to hold that thing."', color: '#ff8866' },
    { frame: 200, text: 'Your hands are shaking. But you\'re still standing.', color: '#aaccff' },
    { frame: 380, text: '"Are you seriously trying to fight me?"', color: '#ff8866' },
    { frame: 520, text: 'Something is telling you not to give up.', color: '#88ddff' },
  ],
  2: [
    { frame: 90,  text: '"You survived once. Lucky."', color: '#ff9944' },
    { frame: 260, text: '"This world will eat you alive."', color: '#ff9944' },
    { frame: 420, text: 'Something is clicking. Your body is starting to remember.', color: '#aaccff' },
  ],
  3: [
    { frame: 60,  text: '"STOP. RUNNING."', color: '#ff4400' },
    { frame: 220, text: 'You\'re not running anymore.', color: '#88ccff' },
    { frame: 380, text: 'Your body moves before you think. That\'s new.', color: '#88ccff' },
  ],
  4: [
    { frame: 100, text: '"We\'ve been watching you since you arrived."', color: '#ffaa33' },
    { frame: 280, text: '"You\'re learning too fast."', color: '#ffaa33' },
    { frame: 430, text: '"Humans from your world don\'t do this."', color: '#ffaa33' },
    { frame: 560, text: 'You are not who you were when you arrived.', color: '#88ddff' },
  ],
  5: [
    { frame: 120, text: 'You fight like you\'ve always been here.', color: '#88ccff' },
    { frame: 320, text: 'There\'s no going back. You know that.', color: '#aaaacc' },
  ],
  7: [
    { frame: 80,  text: '"You were not supposed to make it this far."', color: '#cc88ff' },
    { frame: 260, text: '"This world was not made for you."', color: '#cc88ff' },
    { frame: 440, text: 'The ground feels different. Like it\'s rejecting you.', color: '#aaccff' },
    { frame: 600, text: 'Keep going.', color: '#ffffff' },
  ],
};

// ── Story menu ────────────────────────────────────────────────────────────────
function openStoryMenu() {
  _renderChapterList();
  const m = document.getElementById('storyModal');
  if (m) m.style.display = 'flex';
  // Make sure Chapters tab is active and refreshed
  const chapTab = document.getElementById('storyTabChapters');
  const chapPanel = document.getElementById('storyTabPanelChapters');
  if (chapTab && chapPanel) {
    ['storyTabChapters','storyTabStore','storyTabJourney'].forEach(id => {
      const b = document.getElementById(id);
      if (b) b.classList.remove('active');
    });
    ['storyTabPanelChapters','storyTabPanelStore'].forEach(id => {
      const p = document.getElementById(id);
      if (p) p.style.display = 'none';
    });
    chapTab.classList.add('active');
    chapPanel.style.display = '';
  }
  if (typeof _story2TokenDisplay === 'function') _story2TokenDisplay();
  _updateStoryCloseBtn();
}

function closeStoryMenu() {
  // Block close until chapter 0 is beaten
  const ch0Beaten = Array.isArray(_story2.defeated) && _story2.defeated.includes(0);
  if (!ch0Beaten) return; // locked — must complete chapter 1 first
  const m = document.getElementById('storyModal');
  if (m) m.style.display = 'none';
}

// Update the close button visibility based on whether chapter 0 is beaten
function _updateStoryCloseBtn() {
  const btn = document.querySelector('#storyModal button[onclick="closeStoryMenu()"]');
  if (!btn) return;
  const ch0Beaten = Array.isArray(_story2.defeated) && _story2.defeated.includes(0);
  btn.style.opacity      = ch0Beaten ? '1'       : '0.25';
  btn.style.pointerEvents = ch0Beaten ? 'auto'    : 'none';
  btn.title               = ch0Beaten ? ''        : 'Complete Chapter 1 to unlock the rest of the game';
  btn.textContent         = ch0Beaten ? '✕ Close' : '🔒 Complete Chapter 1 First';
}

function storyNewGame() {
  const msg = 'Start a new story?\nProgress will be reset. (Boss/True Form unlocks are kept.)';
  if (!confirm(msg)) return;
  _storyProgress = _defaultProgress();
  _saveProgress();
  _renderChapterList();
}

// Power level label per chapter
function _powerLabel(num) {
  if (num <= 1) return { text: 'Normal Human', color: '#778' };
  if (num <= 2) return { text: 'Learning',     color: '#88aacc' };
  if (num <= 3) return { text: 'Adapting',     color: '#88ccaa' };
  if (num <= 4) return { text: 'Awakening',    color: '#aaccff' };
  if (num <= 5) return { text: 'Fighter',      color: '#88ddff' };
  if (num <= 7) return { text: 'Elite',        color: '#ffcc88' };
  if (num === 8) return { text: 'SOVEREIGN',   color: '#cc44ff' };
  if (num === 9) return { text: 'Challenger',  color: '#ff8844' };
  return { text: 'Complete',    color: '#ffaaff' };
}

function _renderChapterList() {
  const list = document.getElementById('storyLevelList');
  if (!list) return;
  list.innerHTML = '';

  const cur        = _story2.chapter;
  const curArcId   = _getCurrentArcId();

  // ── Overall progress bar ──────────────────────────────────────────────────
  const totalCh  = STORY_CHAPTERS2.length;
  const doneCh   = _story2.defeated.length;
  const pct      = Math.round((doneCh / totalCh) * 100);
  const progWrap = document.createElement('div');
  progWrap.style.cssText = 'padding:0 2px 10px;';
  progWrap.innerHTML =
    `<div style="display:flex;justify-content:space-between;font-size:0.62rem;color:#778;margin-bottom:4px;">` +
      `<span>Overall Progress</span><span>${doneCh}/${totalCh} chapters</span>` +
    `</div>` +
    `<div style="height:5px;border-radius:3px;background:rgba(255,255,255,0.07);overflow:hidden;">` +
      `<div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#4488ff,#88ffcc);border-radius:3px;transition:width 0.4s;"></div>` +
    `</div>`;
  list.appendChild(progWrap);

  // ── Determine which acts to render fully (current ±1) ─────────────────────
  let curActIdx = 0;
  for (let ai = 0; ai < STORY_ACT_STRUCTURE.length; ai++) {
    for (const arc of STORY_ACT_STRUCTURE[ai].arcs) {
      if (cur >= arc.chapterRange[0] && cur <= arc.chapterRange[1]) { curActIdx = ai; break; }
    }
  }
  const fullRenderMin = Math.max(0, curActIdx - 1);
  const fullRenderMax = Math.min(STORY_ACT_STRUCTURE.length - 1, curActIdx + 1);

  // ── Render each act ───────────────────────────────────────────────────────
  STORY_ACT_STRUCTURE.forEach((act, ai) => {
    const inAutoRange   = ai >= fullRenderMin && ai <= fullRenderMax;
    const manualExpanded = !!_story2.actExpanded[ai];
    const isFullRender  = inAutoRange || manualExpanded;

    // Count act completion
    let actDone = 0, actTotal = 0;
    for (const arc of act.arcs) {
      for (let i = arc.chapterRange[0]; i <= arc.chapterRange[1]; i++) {
        actTotal++;
        if (_story2.defeated.includes(i)) actDone++;
      }
    }
    const actComplete = actDone === actTotal;

    // Act header — always clickable to expand/collapse when outside auto range
    const actHeader = document.createElement('div');
    const chevronRot = (!inAutoRange && !manualExpanded) ? '0deg' : '90deg';
    actHeader.style.cssText = [
      'display:flex', 'align-items:center', 'gap:8px',
      'padding:8px 10px 6px',
      `border-top:1px solid ${act.color}44`,
      'margin-top:6px',
      !inAutoRange ? 'cursor:pointer' : '',
    ].join(';');
    actHeader.innerHTML =
      (!inAutoRange
        ? `<span style="font-size:0.65rem;color:#667;transition:transform 0.18s;display:inline-block;transform:rotate(${chevronRot});">▶</span>`
        : '') +
      `<span style="font-size:0.68rem;letter-spacing:1.5px;text-transform:uppercase;color:${act.color};font-weight:700;flex:1;">${act.label}</span>` +
      `<span style="font-size:0.6rem;color:${actComplete ? '#66ee99' : '#556'};">${actDone}/${actTotal}</span>`;

    if (!inAutoRange) {
      actHeader.addEventListener('click', () => {
        _story2.actExpanded[ai] = !_story2.actExpanded[ai];
        _saveStory2();
        openStoryMenu(); // re-render
      });
    }
    list.appendChild(actHeader);

    if (!isFullRender) {
      // Compact hint — click the header above to expand
      const summary = document.createElement('div');
      summary.style.cssText = 'padding:2px 12px 7px;font-size:0.60rem;color:#445;';
      summary.textContent = actComplete ? '✓ Completed — click to expand' : actDone > 0 ? `${actDone}/${actTotal} done — click to expand` : 'Locked — click to expand';
      list.appendChild(summary);
      return;
    }

    // ── Render arcs within this act ─────────────────────────────────────────
    act.arcs.forEach(arc => {
      const arcUnlocked  = _isArcUnlocked(arc);
      const arcComplete  = _isArcComplete(arc);
      const isCurrentArc = arc.id === curArcId;
      const { done: arcDone, total: arcTotal } = _getArcProgress(arc);
      // Default: current arc expanded, others collapsed (unless user toggled)
      const collapsed = _story2.arcCollapsed.hasOwnProperty(arc.id)
        ? _story2.arcCollapsed[arc.id]
        : !isCurrentArc;

      // Arc sub-header
      const arcRow = document.createElement('div');
      arcRow.style.cssText = [
        'display:flex', 'align-items:center', 'gap:7px',
        'padding:6px 14px 5px',
        `background:${isCurrentArc ? 'rgba(120,170,255,0.07)' : 'transparent'}`,
        'border-radius:6px', 'margin:2px 0',
        arcUnlocked ? 'cursor:pointer' : 'cursor:default',
        `opacity:${arcUnlocked ? '1' : '0.35'}`,
      ].join(';');
      arcRow.innerHTML =
        `<span style="font-size:0.7rem;color:#667;transition:transform 0.18s;display:inline-block;transform:rotate(${collapsed ? '0' : '90'}deg);">▶</span>` +
        `<span style="font-size:0.72rem;color:${arcComplete ? '#66ee99' : isCurrentArc ? '#aacfff' : '#889'};flex:1;">${arc.label}</span>` +
        `<span style="font-size:0.58rem;color:${arcComplete ? '#66ee99' : '#556'};">${arcDone}/${arcTotal}</span>`;

      if (arcUnlocked) {
        arcRow.addEventListener('click', () => _toggleArcCollapse(arc.id));
      }
      list.appendChild(arcRow);

      if (collapsed) return;

      // ── Chapter rows ──────────────────────────────────────────────────────
      for (let i = arc.chapterRange[0]; i <= arc.chapterRange[1]; i++) {
        const ch      = STORY_CHAPTERS2[i];
        const done    = _story2.defeated.includes(i);
        const current = i === cur;
        const locked  = !arcUnlocked || i > cur;

        const borderCol = done ? 'rgba(80,220,120,0.35)' : current ? 'rgba(120,170,255,0.40)' : 'rgba(255,255,255,0.07)';
        const bgCol     = done ? 'rgba(30,90,55,0.28)'   : current ? 'rgba(25,55,110,0.35)'   : 'rgba(10,10,30,0.20)';

        const el = document.createElement('div');
        el.style.cssText = [
          'display:flex', 'align-items:center', 'gap:11px',
          'padding:8px 14px 8px 26px', 'border-radius:8px', 'margin-bottom:3px',
          `border:1px solid ${borderCol}`, `background:${bgCol}`,
          `opacity:${locked ? '0.30' : '1'}`,
          'transition:background 0.14s,border-color 0.14s',
          locked ? 'cursor:default' : 'cursor:pointer',
        ].join(';');

        const statusEl = document.createElement('span');
        statusEl.style.cssText = 'font-size:0.72rem;min-width:16px;text-align:center;flex-shrink:0;';
        statusEl.textContent    = done ? '✓' : locked ? '🔒' : current ? '▶' : String(i + 1);
        statusEl.style.color    = done ? '#66ee99' : current ? '#aacfff' : '#445';

        const livesTag = (!locked && !done && ch.playerLives === 1)
          ? `<span style="font-size:0.54rem;color:#ff5533;background:rgba(255,50,20,0.15);border:1px solid rgba(255,50,20,0.30);border-radius:3px;padding:1px 4px;margin-left:4px;">1 life</span>`
          : (!locked && !done && ch.playerLives === 2)
          ? `<span style="font-size:0.54rem;color:#ffaa44;background:rgba(255,140,0,0.08);border:1px solid rgba(255,140,0,0.25);border-radius:3px;padding:1px 4px;margin-left:4px;">2 lives</span>`
          : '';
        const rewardTag = (!done && ch.tokenReward)
          ? `<span style="font-size:0.54rem;color:#998833;margin-left:3px;">+${ch.tokenReward}🪙</span>` : '';
        const bpTag = (!done && ch.blueprintDrop && STORY_ABILITIES2[ch.blueprintDrop])
          ? `<span style="font-size:0.54rem;color:#5577bb;margin-left:2px;">📋</span>` : '';
        const replayTag = (done)
          ? `<span style="font-size:0.52rem;color:#667;margin-left:4px;border:1px solid #334;border-radius:3px;padding:1px 4px;">replay</span>` : '';

        // Spoiler-safe: redact boss/trueform fights that are locked
        const isSpoilerChapter = (ch.isBossFight || ch.isTrueFormFight);
        const isSpoilerLocked  = locked && !done && isSpoilerChapter;
        const isDeepLocked     = locked && !done && i > cur + 3 && isSpoilerChapter;
        let displayTitle = ch.title;
        let displayWorld = ch.world || '';
        if (isSpoilerLocked) {
          displayTitle = ch.isTrueFormFight ? '??? Final Entity' : '??? Boss Encounter';
          displayWorld = 'Unknown Zone';
        }

        const infoEl = document.createElement('div');
        infoEl.style.cssText = 'flex:1;min-width:0;line-height:1.3;';
        infoEl.innerHTML =
          `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:2px;">` +
            `<span style="font-size:0.81rem;color:${done ? '#88ffaa' : current ? '#dde4ff' : '#556'};">${displayTitle}</span>` +
            (isSpoilerLocked ? '' : livesTag + rewardTag + bpTag) + replayTag +
          `</div>` +
          `<div style="font-size:0.60rem;color:#4a4a6a;margin-top:1px;">${displayWorld}</div>`;

        if (isSpoilerLocked) {
          infoEl.title = "You're not supposed to see that yet.";
        }
        if (isDeepLocked) {
          el.style.filter = 'brightness(0.7)';
        }

        el.appendChild(statusEl);
        el.appendChild(infoEl);

        if (!locked) {
          el.addEventListener('click', () => { _beginChapter2(i); });
          el.addEventListener('mouseover', () => {
            el.style.background  = done ? 'rgba(30,100,60,0.45)' : 'rgba(35,70,160,0.50)';
            el.style.borderColor = done ? 'rgba(80,220,120,0.55)' : 'rgba(120,170,255,0.60)';
          });
          el.addEventListener('mouseout', () => {
            el.style.background  = bgCol;
            el.style.borderColor = borderCol;
          });
        }
        list.appendChild(el);
      }
    });
  });
}

// ── In-fight script ticker — call every game frame ───────────────────────────
function storyTickFightScript() {
  if (!gameRunning || !storyModeActive) return;
  if (storyFightScriptIdx >= storyFightScript.length) return;
  const entry = storyFightScript[storyFightScriptIdx];
  if (frameCount >= entry.frame) {
    const dur = entry.timer || 220;
    storyFightSubtitle = { text: entry.text, timer: dur, maxTimer: dur, color: entry.color, speaker: entry.speaker || null };
    storyFightScriptIdx++;
  }
}

// ── Level complete (called from endGame) ─────────────────────────────────────
function storyOnMatchEnd(playerWon) {
  if (!storyModeActive) return;
  storyFightSubtitle = null;
  if (typeof story2OnMatchEnd === 'function' && _activeStory2Chapter) {
    story2OnMatchEnd(playerWon);
  }
}

// ── Back to menu ──────────────────────────────────────────────────────────────
function storyOnBackToMenu() {
  if (!storyModeActive) return;
  storyModeActive     = false;
  storyPlayerOverride = null;
  storyFightSubtitle  = null;
  storyFightScript    = [];
  storyPhaseIndicator = null;
  storyGauntletState  = null;
  storyPendingPhaseConfig = null;
  storyCameraLock = null;
  exploreSidePortals = [];
  exploreArenaLock = null;
  setTimeout(openStoryMenu, 300);
}

function getDifficultyMultiplier(chapterId) {
  return 1 + (chapterId * 0.08);
}

function _storyPerformanceBonus() {
  const run = _story2 && _story2.runState;
  if (!run) return 0;
  let bonus = 0;
  if ((run.healthPct || 1) > 0.72) bonus += 0.06;
  if ((run.noDeathChain || 0) >= 2) bonus += 0.04;
  return bonus;
}

function _storyDifficultyForChapter(chapterId, elite = false) {
  const mult = getDifficultyMultiplier(chapterId) + _storyPerformanceBonus();
  return elite ? mult * 1.18 : mult;
}

function _storyPhaseName(type) {
  if (type === 'traversal') return 'Traversal';
  if (type === 'arena_lock') return 'Arena Lock';
  if (type === 'hazard_phase') return 'Hazard Surge';
  if (type === 'elite_wave') return 'Elite Wave';
  if (type === 'mini_boss') return 'Mini Boss';
  return 'Phase';
}

function _storyCloneEnemyDef(base, extra = {}) {
  const src = base || {};
  return {
    name: src.name || src.opponentName || 'Enemy',
    weaponKey: src.weaponKey || 'sword',
    classKey: src.classKey || 'warrior',
    aiDiff: src.aiDiff || 'medium',
    color: src.color || src.opponentColor || '#778899',
    armor: src.armor ? [...src.armor] : [],
    health: src.health,
    isElite: !!src.isElite,
    ...extra,
  };
}

function _storyBuildPhases(ch) {
  if (Array.isArray(ch.phases) && ch.phases.length >= 3) return ch.phases;

  const diffTier = ch.id >= 45 ? 'expert' : ch.id >= 25 ? 'hard' : ch.id >= 10 ? 'medium' : 'easy';
  const eliteAI  = ch.id >= 40 ? 'expert' : 'hard';
  const baseEnemy = _storyCloneEnemyDef(ch, {
    name: ch.opponentName || ch.title,
    weaponKey: ch.weaponKey || 'sword',
    classKey: ch.classKey || 'warrior',
    aiDiff: ch.aiDiff || diffTier,
    color: ch.opponentColor || '#778899',
    armor: ch.armor || [],
  });
  const supportEnemy = _storyCloneEnemyDef(baseEnemy, {
    name: `${baseEnemy.name} Support`,
    weaponKey: ch.id >= 14 ? 'spear' : 'sword',
    classKey: ch.id >= 18 ? 'assassin' : 'warrior',
    aiDiff: diffTier,
    color: '#667788',
  });
  const eliteEnemy = _storyCloneEnemyDef(baseEnemy, {
    name: `${baseEnemy.name} Elite`,
    weaponKey: ch.id >= 12 ? (ch.weaponKey || 'axe') : 'sword',
    classKey: ch.id >= 15 ? 'warrior' : 'none',
    aiDiff: eliteAI,
    color: '#b36b3f',
    armor: [...new Set([...(baseEnemy.armor || []), 'helmet'])],
    isElite: true,
  });

  if (ch.type === 'exploration') {
    const worldLen = Math.max(5600, ch.worldLength || 5600);
    ch.phases = [
      {
        type: 'traversal',
        label: ch.objectName || 'Advance',
        worldLength: Math.floor(worldLen * 0.72),
        objectName: `${ch.objectName || 'Forward Route'} Relay`,
        spawnEnemies: (ch.spawnEnemies || []).slice(0, Math.max(4, Math.ceil((ch.spawnEnemies || []).length * 0.45))),
      },
      {
        type: 'arena_lock',
        label: 'Hold The Route',
        arena: ch.arena || 'homeAlley',
        opponents: [supportEnemy, _storyCloneEnemyDef(supportEnemy, { name: 'Lockdown Guard', weaponKey: 'hammer', classKey: 'tank', color: '#556677' })],
        playerLives: ch.playerLives || 3,
      },
      {
        type: ch.id >= 12 ? 'hazard_phase' : 'elite_wave',
        label: ch.id >= 12 ? 'Instability Surge' : 'Pressure Spike',
        arena: ch.id >= 10 ? 'lava' : (ch.arena || 'homeAlley'),
        opponents: [eliteEnemy, supportEnemy],
        playerLives: ch.playerLives || 3,
      },
      {
        type: 'mini_boss',
        label: ch.opponentName || 'Final Guard',
        arena: ch.arena || 'homeAlley',
        opponents: [_storyCloneEnemyDef(ch.opponentName ? baseEnemy : eliteEnemy, {
          name: ch.opponentName || 'Route Breaker',
          weaponKey: ch.weaponKey || eliteEnemy.weaponKey || 'hammer',
          classKey: ch.classKey || eliteEnemy.classKey || 'warrior',
          aiDiff: ch.aiDiff || eliteAI,
          color: ch.opponentColor || '#775588',
          isElite: true,
          armor: [...new Set([...(ch.armor || []), 'helmet'])],
        })],
        finalChapter: true,
        playerLives: ch.playerLives || 3,
      },
    ];
  } else {
    ch.phases = [
      {
        type: 'arena_lock',
        label: 'Opening Clash',
        arena: ch.arena || 'homeAlley',
        opponents: [supportEnemy],
        playerLives: Math.max(2, ch.playerLives || 3),
      },
      {
        type: ch.id >= 9 ? 'hazard_phase' : 'elite_wave',
        label: ch.id >= 9 ? 'Field Distortion' : 'Pressure Wave',
        arena: ch.id >= 10 ? 'lava' : (ch.arena || 'homeAlley'),
        opponents: ch.id >= 8 ? [eliteEnemy, supportEnemy] : [eliteEnemy],
        playerLives: Math.max(2, ch.playerLives || 3),
      },
      {
        type: 'mini_boss',
        label: ch.opponentName || 'Final Duel',
        arena: ch.arena || 'homeAlley',
        finalChapter: true,
        playerLives: ch.playerLives || 3,
      },
    ];
    if (ch.id >= 16) {
      ch.phases.splice(1, 0, {
        type: 'elite_wave',
        label: 'Elite Intercept',
        arena: ch.arena || 'space',
        opponents: [eliteEnemy, _storyCloneEnemyDef(eliteEnemy, { name: 'Fracture Elite', weaponKey: 'spear', classKey: 'ninja', color: '#8855cc', isElite: true })],
        playerLives: Math.max(2, ch.playerLives || 3),
      });
    }
  }
  return ch.phases;
}

function _storyGetCurrentPhase() {
  return storyGauntletState && storyGauntletState.phases
    ? storyGauntletState.phases[storyGauntletState.index] || null
    : null;
}

function _storyUpdatePhaseIndicator() {
  const phase = _storyGetCurrentPhase();
  if (!storyGauntletState || !phase) {
    storyPhaseIndicator = null;
    return;
  }
  storyPhaseIndicator = {
    index: storyGauntletState.index + 1,
    total: storyGauntletState.phases.length,
    label: phase.label || _storyPhaseName(phase.type),
    type: phase.type,
  };
}

function _storyGetCarryHealthPct() {
  const run = _story2 && _story2.runState;
  return run && typeof run.healthPct === 'number' ? clamp(run.healthPct, 0.18, 1.0) : 1;
}

function _storySetCarryHealthPct(pct) {
  if (!_story2.runState) _story2.runState = { healthPct: 1, noDeathChain: 0 };
  _story2.runState.healthPct = clamp(pct, 0.18, 1.0);
}

function _storyBuildShopItems() {
  const up = _story2.metaUpgrades || { damage: 0, survivability: 0, healUses: 0 };
  return [
    {
      key: 'chapter_heal',
      icon: '💉',
      name: 'Field Treatment',
      desc: 'Restore 35% chapter health carryover before the next chapter. Cannot heal above 90%.',
      tokenCost: 18 + up.healUses * 10,
      canBuy: () => _storyGetCarryHealthPct() < 0.9,
      buy() {
        _storySetCarryHealthPct(Math.min(0.9, _storyGetCarryHealthPct() + 0.35));
        up.healUses++;
      },
    },
    {
      key: 'meta_damage',
      icon: '⚔️',
      name: 'Damage Upgrade',
      desc: 'Permanent +8% story damage. Cost scales each rank.',
      tokenCost: 28 + up.damage * 20,
      canBuy: () => up.damage < 6,
      buy() { up.damage++; },
    },
    {
      key: 'meta_survivability',
      icon: '🛡️',
      name: 'Survivability Upgrade',
      desc: 'Permanent +10 max HP and minor damage reduction in Story Mode.',
      tokenCost: 30 + up.survivability * 22,
      canBuy: () => up.survivability < 6,
      buy() { up.survivability++; },
    },
  ];
}

// ── Save integration ─────────────────────────────────────────────────────────
function getStoryDataForSave() {
  return typeof _story2 !== 'undefined' ? JSON.parse(JSON.stringify(_story2)) : null;
}

function restoreStoryDataFromSave(data) {
  if (!data || !data.defeated) return;
  Object.assign(_story2, data);
  _saveStory2();
}

// ============================================================
// STORY MODE v2 — Chapter Progression, Tokens, Blueprints,
//                 Ability Store, Story Online unlock
// ============================================================

// ============================================================
// STORY SKILL TREE
// ============================================================
const STORY_SKILL_TREE = {
  mobility: {
    label: 'Mobility',
    color: '#44ffaa',
    nodes: [
      { id: 'highJump1',   name: 'Stronger Legs',    desc: 'Jump 15% higher',              expCost: 25,  requires: null },
      { id: 'highJump2',   name: 'Leap Training',     desc: 'Jump 25% higher total',        expCost: 45,  requires: 'highJump1' },
      { id: 'doubleJump',  name: 'Double Jump',       desc: 'Press W again while airborne', expCost: 80,  requires: 'highJump2' },
    ],
  },
  combat: {
    label: 'Combat',
    color: '#ff8844',
    nodes: [
      { id: 'heavyHit1',      name: 'Stronger Strikes',  desc: '+15% attack damage',            expCost: 25, requires: null },
      { id: 'heavyHit2',      name: 'Power Blows',        desc: '+25% damage total',             expCost: 45, requires: 'heavyHit1' },
      { id: 'weaponAbility',  name: 'Weapon Mastery',     desc: 'Unlock weapon Q-ability',       expCost: 80, requires: 'heavyHit2' },
    ],
  },
  resilience: {
    label: 'Resilience',
    color: '#88aaff',
    nodes: [
      { id: 'tankier1',   name: 'Tougher Body',  desc: '+15 max HP',                  expCost: 25, requires: null },
      { id: 'tankier2',   name: 'Hardened',       desc: '+25 max HP total',            expCost: 45, requires: 'tankier1' },
      { id: 'superMeter', name: 'Inner Power',    desc: 'Unlock Super meter (E key)',  expCost: 80, requires: 'tankier2' },
    ],
  },
  speed: {
    label: 'Speed',
    color: '#ffee44',
    nodes: [
      { id: 'fastMove1', name: 'Quick Feet',      desc: 'Move 10% faster',       expCost: 20, requires: null },
      { id: 'fastMove2', name: 'Sprint Training', desc: 'Move 20% faster total', expCost: 40, requires: 'fastMove1' },
    ],
  },
};

// Apply purchased skill tree bonuses to a fighter in story mode
function _applySkillTreeToPlayer(p) {
  if (!p || !_story2.skillTree) return;
  const sk = _story2.skillTree;
  p._storyJumpMult = 1.0 + (sk.highJump2 ? 0.25 : sk.highJump1 ? 0.15 : 0);
  if (p._storyNoDoubleJump !== undefined) p._storyNoDoubleJump = !sk.doubleJump;
  const hpBonus = (sk.tankier2 ? 25 : sk.tankier1 ? 15 : 0);
  if (hpBonus > 0) {
    p.maxHealth = (p.maxHealth || 100) + hpBonus;
    p.health    = Math.min(p.health + hpBonus, p.maxHealth);
  }
}

// Award EXP to the player for a story kill
function _storyAwardKillExp(amount) {
  if (!storyModeActive) return;
  _story2.exp = (_story2.exp || 0) + amount;
  _saveStory2();
  if (players[0] && typeof DamageText !== 'undefined') {
    const dt = new DamageText(`+${amount} EXP`, players[0].cx(), players[0].y - 30, '#aaff88');
    damageTexts.push(dt);
  }
  _storyUpdateExpDisplay();
}

function _storyUpdateExpDisplay() {
  const el = document.getElementById('storyExpDisplay');
  if (el) el.textContent = `${_story2.exp || 0} EXP`;
}

// ── Persistent state (separate key to avoid collision with v1) ───────────────
const _STORY2_KEY = 'smc_story2';

function _defaultStory2Progress() {
  return {
    chapter:           0,       // index into STORY_CHAPTERS2 (next to play)
    tokens:            0,
    exp:               0,       // EXP earned from kills — used for skill tree
    blueprints:        [],      // blueprint keys earned
    unlockedAbilities: [],      // ability keys bought from store
    skillTree:         {},      // { nodeId: true } — purchased skill nodes
    defeated:          [],      // chapter indices completed
    storyComplete:     false,
    runState:          { healthPct: 1, noDeathChain: 0 },
    metaUpgrades:      { damage: 0, survivability: 0, healUses: 0 },
    // v3 hierarchy fields — added by migration for old saves
    arcCollapsed:      {},      // { arcId: bool } — user-toggled arc collapse state
    actExpanded:       {},      // { actIndex: bool } — user forced an out-of-range act open
  };
}

let _story2 = (function() {
  try {
    const raw = localStorage.getItem(_STORY2_KEY);
    if (!raw) return _defaultStory2Progress();
    const p = JSON.parse(raw);
    if (!p || !Array.isArray(p.defeated)) return _defaultStory2Progress();
    // Migration: ensure v3 fields exist on old saves
    if (!p.arcCollapsed || typeof p.arcCollapsed !== 'object') p.arcCollapsed = {};
    if (!p.actExpanded  || typeof p.actExpanded  !== 'object') p.actExpanded  = {};
    if (!p.runState || typeof p.runState !== 'object') p.runState = { healthPct: 1, noDeathChain: 0 };
    if (!p.metaUpgrades || typeof p.metaUpgrades !== 'object') p.metaUpgrades = { damage: 0, survivability: 0, healUses: 0 };
    if (typeof p.exp !== 'number') p.exp = 0;
    if (!p.skillTree || typeof p.skillTree !== 'object') p.skillTree = {};
    return p;
  } catch(e) { return _defaultStory2Progress(); }
})();

function _saveStory2() {
  try { localStorage.setItem(_STORY2_KEY, JSON.stringify(_story2)); } catch(e) {}
}

// ── Act/Arc hierarchy helpers ─────────────────────────────────────────────────
function _getActForChapter(idx) {
  for (const act of STORY_ACT_STRUCTURE) {
    for (const arc of act.arcs) {
      if (idx >= arc.chapterRange[0] && idx <= arc.chapterRange[1]) return act;
    }
  }
  return null;
}
function _getArcForChapter(idx) {
  for (const act of STORY_ACT_STRUCTURE) {
    for (const arc of act.arcs) {
      if (idx >= arc.chapterRange[0] && idx <= arc.chapterRange[1]) return arc;
    }
  }
  return null;
}
function _isArcComplete(arc) {
  for (let i = arc.chapterRange[0]; i <= arc.chapterRange[1]; i++) {
    if (!_story2.defeated.includes(i)) return false;
  }
  return true;
}
function _isArcUnlocked(arc) {
  // First arc of first act is always unlocked
  const firstArc = STORY_ACT_STRUCTURE[0].arcs[0];
  if (arc.id === firstArc.id) return true;
  // An arc is unlocked if all chapters in the previous arc are complete
  for (let ai = 0; ai < STORY_ACT_STRUCTURE.length; ai++) {
    const act = STORY_ACT_STRUCTURE[ai];
    for (let ri = 0; ri < act.arcs.length; ri++) {
      if (act.arcs[ri].id === arc.id) {
        // get previous arc
        if (ri > 0) return _isArcComplete(act.arcs[ri - 1]);
        if (ai > 0) {
          const prevAct = STORY_ACT_STRUCTURE[ai - 1];
          return _isArcComplete(prevAct.arcs[prevAct.arcs.length - 1]);
        }
      }
    }
  }
  return false;
}
function _getArcProgress(arc) {
  let done = 0;
  const total = arc.chapterRange[1] - arc.chapterRange[0] + 1;
  for (let i = arc.chapterRange[0]; i <= arc.chapterRange[1]; i++) {
    if (_story2.defeated.includes(i)) done++;
  }
  return { done, total };
}
function _getCurrentArcId() {
  const arc = _getArcForChapter(_story2.chapter);
  return arc ? arc.id : null;
}
function _toggleArcCollapse(arcId) {
  _story2.arcCollapsed[arcId] = !_story2.arcCollapsed[arcId];
  _saveStory2();
  _renderChapterList();
}

// ── Armor application ─────────────────────────────────────────────────────────
// Called for exploration chapter enemies that have armor defs in their spawn entry.
function storyApplyArmor(fighter, armorArray) {
  if (!fighter || !armorArray || !armorArray.length) return;
  fighter.armorPieces = Array.isArray(fighter.armorPieces)
    ? [...new Set([...fighter.armorPieces, ...armorArray])]
    : [...armorArray];
  // Visual feedback: brief armor-tint flash
  fighter._armorFlash = 12;
}

// ── Ability application at fight start ───────────────────────────────────────
// Called from _onStoryFightStart() when storyModeActive and _activeStory2Chapter is set.
function _applyStory2Abilities(p1) {
  if (!p1 || !_story2.unlockedAbilities.length) return;
  const ua = _story2.unlockedAbilities;

  // Attach ability set for fast lookup in dealDamage / tick
  p1.story2Abilities = new Set(ua);

  // Reset per-fight ability state
  storyAbilityState = {
    medkitUsed:      false,
    lastStandFired:  false,
    voidStepFired:   false,
    worldBreakUsed:  false,
    killStacks:      0,         // berserker_blood2
    hitStreak:       0,         // rage_mode2 consecutive hit counter
    rageAttacksLeft: 0,         // rage_mode2 powered attacks remaining
    ghostStepCd:     0,         // fracture step cooldown (frames)
    shieldBashCd:    0,         // shield_bash2 cooldown (frames)
  };

  // fracture_surge2: super charges 40% faster — set multiplier on fighter
  if (ua.includes('fracture_surge2')) {
    p1._superChargeMult = (p1._superChargeMult || 1) * 1.4;
  }
}

// ── Per-frame ability tick ─────────────────────────────────────────────────────
// Called every frame from storyCheckEvents() when storyModeActive.
function storyTickAbilities() {
  const p1 = players && players[0];
  if (!p1 || !p1.story2Abilities || p1.health <= 0) return;

  const ua  = p1.story2Abilities;
  const abs = storyAbilityState;

  // Cool down timers
  if (abs.ghostStepCd  > 0) abs.ghostStepCd--;
  if (abs.shieldBashCd > 0) abs.shieldBashCd--;

  // last_stand2: below 15% HP → +60% speed + 2× dmg for 8s (one shot)
  if (ua.has('last_stand2') && !abs.lastStandFired && p1.health / p1.maxHealth < 0.15 && p1.health > 0) {
    abs.lastStandFired = true;
    const baseSpeed = p1.speed;
    const baseDmg   = p1.dmgMult || 1;
    p1.speed   = baseSpeed * 1.6;
    p1.dmgMult = baseDmg   * 2.0;
    storyFightSubtitle = { text: '🔥 LAST STAND — Speed & Damage doubled!', timer: 200, maxTimer: 200, color: '#ff4400' };
    spawnParticles(p1.cx(), p1.cy(), '#ff4400', 20);
    setTimeout(() => {
      if (p1.health > 0) { p1.speed = baseSpeed; p1.dmgMult = baseDmg; }
    }, 8000);
  }

  // void_step2: below 30% HP → +50% speed for 5s (one shot)
  if (ua.has('void_step2') && !abs.voidStepFired && p1.health / p1.maxHealth < 0.30 && p1.health > 0) {
    abs.voidStepFired = true;
    const baseSpeed = p1.speed;
    p1.speed = baseSpeed * 1.5;
    storyFightSubtitle = { text: '🌑 VOID STEP — Speed surge activated!', timer: 160, maxTimer: 160, color: '#8844ff' };
    spawnParticles(p1.cx(), p1.cy(), '#8844ff', 14);
    setTimeout(() => { if (p1.health > 0) p1.speed = baseSpeed; }, 5000);
  }

  // medkit2: ability key (Q) heals 30% max HP once per match
  // We intercept ability use via p1._story2AbilityPending flag set in Fighter.ability()
  if (ua.has('medkit2') && !abs.medkitUsed && p1._story2AbilityPending) {
    p1._story2AbilityPending = false;
    abs.medkitUsed = true;
    const heal = Math.floor(p1.maxHealth * 0.30);
    p1.health = Math.min(p1.maxHealth, p1.health + heal);
    storyFightSubtitle = { text: `💊 Dimensional Patch — +${heal} HP`, timer: 180, maxTimer: 180, color: '#44ff99' };
    spawnParticles(p1.cx(), p1.cy(), '#44ff99', 16);
  } else if (p1._story2AbilityPending) {
    p1._story2AbilityPending = false; // consumed
  }

  // berserker_blood2: kill stacks applied in storyOnEnemyDeath
  if (ua.has('berserker_blood2') && abs.killStacks > 0) {
    p1.dmgMult = (p1._story2BaseDmg || 1) * (1 + abs.killStacks * 0.08);
  }

  // rage_mode2: rageAttacksLeft > 0 sets dmg boost flag on fighter
  if (ua.has('rage_mode2')) {
    p1._story2RageMult = abs.rageAttacksLeft > 0 ? 3.0 : 1.0;
  }
}

// Extend storyOnEnemyDeath to handle berserker_blood2 kill stacks
const _origStoryOnEnemyDeath = typeof storyOnEnemyDeath !== 'undefined' ? storyOnEnemyDeath : null;
function storyOnEnemyDeath(victim, killer) {
  if (_origStoryOnEnemyDeath) _origStoryOnEnemyDeath(victim, killer);
  const p1 = players && players[0];
  if (!p1 || killer !== p1 || !p1.story2Abilities) return;
  if (p1.story2Abilities.has('berserker_blood2')) {
    storyAbilityState.killStacks = Math.min(5, (storyAbilityState.killStacks || 0) + 1);
    storyFightSubtitle = { text: `🩸 Fragment Hunger: ${storyAbilityState.killStacks} stack${storyAbilityState.killStacks > 1 ? 's' : ''}`, timer: 120, maxTimer: 120, color: '#cc2244' };
  }
}

// ── Pre-fight store nag modal ─────────────────────────────────────────────────
// Shows a modal with chapter warning + "Go to Store" / "Continue" when ch.storeNag set.
const _seenStoreNagIds = new Set();
function _showPreFightStoreNag(ch, onContinue) {
  // Only show once per chapter per session
  if (!ch.storeNag || _seenStoreNagIds.has(ch.id)) { onContinue(); return; }
  _seenStoreNagIds.add(ch.id);

  let ov = document.getElementById('_storyPreFightNagOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = '_storyPreFightNagOverlay';
    ov.style.cssText = [
      'position:fixed','inset:0','z-index:9500',
      'display:flex','align-items:center','justify-content:center',
      'background:rgba(0,0,0,0.82)',
    ].join(';');
    document.body.appendChild(ov);
  }

  const affordable = Object.entries(STORY_ABILITIES2).filter(([key, ab]) => {
    const owned = _story2.unlockedAbilities.includes(key);
    const hasBP = !ab.requiresBlueprint || _story2.blueprints.includes(key);
    return !owned && hasBP && _story2.tokens >= ab.tokenCost;
  });

  ov.innerHTML = `
    <div style="background:rgba(10,6,26,0.98);border:1px solid rgba(255,80,50,0.45);border-radius:14px;padding:24px 28px;max-width:360px;width:92vw;font-family:'Segoe UI',Arial,sans-serif;text-align:center;">
      <div style="font-size:1.3rem;font-weight:800;color:#ff8855;margin-bottom:8px;">⚠️ Warning</div>
      <div style="font-size:0.86rem;color:#ddc;line-height:1.55;margin-bottom:14px;">${ch.storeNag}</div>
      ${affordable.length > 0 ? `
        <div style="font-size:0.78rem;color:#ffcc66;margin-bottom:12px;">
          You can afford <b>${affordable.length}</b> upgrade${affordable.length > 1 ? 's' : ''} right now (${_story2.tokens} 🪙)
        </div>
      ` : `
        <div style="font-size:0.78rem;color:#998;margin-bottom:12px;">Tokens: ${_story2.tokens} 🪙</div>
      `}
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        ${affordable.length > 0 ? `
          <button id="_nagStoreBtn" style="padding:10px 20px;background:linear-gradient(135deg,#8833cc,#aa44ee);border:none;border-radius:8px;color:#fff;font-weight:700;font-size:0.84rem;cursor:pointer;">
            🏪 Go to Store
          </button>
        ` : ''}
        <button id="_nagContinueBtn" style="padding:10px 20px;background:rgba(40,80,180,0.8);border:1px solid rgba(100,150,255,0.4);border-radius:8px;color:#fff;font-weight:700;font-size:0.84rem;cursor:pointer;">
          ⚔️ Continue
        </button>
      </div>
    </div>`;

  ov.style.display = 'flex';

  const cont = ov.querySelector('#_nagContinueBtn');
  const store = ov.querySelector('#_nagStoreBtn');

  if (cont) cont.onclick = () => { ov.style.display = 'none'; onContinue(); };
  if (store) store.onclick = () => {
    ov.style.display = 'none';
    storyModeActive = false;
    if (typeof backToMenu === 'function') backToMenu();
    setTimeout(() => {
      if (typeof openStoryMenu === 'function') openStoryMenu();
      setTimeout(() => { if (typeof switchStoryTab === 'function') switchStoryTab('store'); }, 120);
    }, 300);
  };
}

// ── Story retry screen ────────────────────────────────────────────────────────
function _showStory2RetryScreen(ch) {
  requestAnimationFrame(() => {
    // Hide default game-over overlay content and inject custom retry screen
    const ov = document.getElementById('gameOverOverlay');
    if (!ov) return;

    const old = ov.querySelector('#_story2RetryScreen');
    if (old) old.remove();

    const affordable = Object.entries(STORY_ABILITIES2).filter(([key, ab]) => {
      const owned = _story2.unlockedAbilities.includes(key);
      const hasBP = !ab.requiresBlueprint || _story2.blueprints.includes(key);
      return !owned && hasBP && _story2.tokens >= ab.tokenCost;
    });

    const retryDiv = document.createElement('div');
    retryDiv.id = '_story2RetryScreen';
    retryDiv.style.cssText = 'margin-top:16px;text-align:center;';

    retryDiv.innerHTML = `
      <div style="font-size:0.72rem;letter-spacing:1px;color:#667;text-transform:uppercase;margin-bottom:4px;">${storyPhaseIndicator ? 'Phase Failed' : 'Chapter'}</div>
      <div style="font-size:1.05rem;font-weight:700;color:#dde4ff;margin-bottom:10px;">${ch.title}</div>
      ${storyPhaseIndicator ? `<div style="font-size:0.74rem;color:#8cc8ff;margin-bottom:10px;">PHASE ${storyPhaseIndicator.index}/${storyPhaseIndicator.total} — ${storyPhaseIndicator.label}</div>` : ''}
      ${affordable.length > 0 ? `
        <div style="font-size:0.74rem;color:#ffcc66;margin-bottom:10px;">
          💡 ${affordable.length} upgrade${affordable.length > 1 ? 's' : ''} affordable (${_story2.tokens} 🪙)
        </div>
      ` : ''}
      <div style="display:flex;flex-direction:column;gap:7px;max-width:240px;margin:0 auto;">
        <button id="_retryChapterBtn" style="padding:10px 0;background:linear-gradient(135deg,#1a5acc,#2277ee);border:none;border-radius:9px;color:#fff;font-weight:700;font-size:0.88rem;cursor:pointer;width:100%;">
          ↺ Retry ${storyPhaseIndicator ? 'Phase' : 'Chapter'}
        </button>
        ${affordable.length > 0 ? `
          <button id="_retryStoreBtn" style="padding:10px 0;background:linear-gradient(135deg,#6622aa,#9933cc);border:none;border-radius:9px;color:#fff;font-weight:700;font-size:0.88rem;cursor:pointer;width:100%;">
            🏪 Go to Store
          </button>
        ` : ''}
        <button id="_retryMenuBtn" style="padding:9px 0;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:9px;color:#aaa;font-size:0.82rem;cursor:pointer;width:100%;">
          ← Story Menu
        </button>
      </div>`;

    const btnRow = ov.querySelector('.btn-row');
    if (btnRow) btnRow.style.display = 'none'; // hide default buttons
    ov.querySelector('.overlay-box')?.appendChild(retryDiv);

    retryDiv.querySelector('#_retryChapterBtn').onclick = () => {
      ov.style.display = 'none';
      if (btnRow) btnRow.style.display = '';
      storyModeActive = false;
      if (typeof backToMenu === 'function') backToMenu();
      setTimeout(() => _beginChapter2(ch.id), 350);
    };

    const storeBtn = retryDiv.querySelector('#_retryStoreBtn');
    if (storeBtn) storeBtn.onclick = () => {
      ov.style.display = 'none';
      if (btnRow) btnRow.style.display = '';
      storyModeActive = false;
      if (typeof backToMenu === 'function') backToMenu();
      setTimeout(() => {
        if (typeof openStoryMenu === 'function') openStoryMenu();
        setTimeout(() => { if (typeof switchStoryTab === 'function') switchStoryTab('store'); }, 120);
      }, 320);
    };

    retryDiv.querySelector('#_retryMenuBtn').onclick = () => {
      ov.style.display = 'none';
      if (btnRow) btnRow.style.display = '';
      storyVictoryBackToMenu();
    };
  });
}

// ── World System ─────────────────────────────────────────────────────────────
const STORY_WORLDS = {
  fracture: {
    id:       'fracture',
    name:     'Fracture World',
    modifier: 'gravityShift'
  },
  war: {
    id:       'war',
    name:     'War Echo',
    modifier: 'highPressure'
  },
  mirror: {
    id:       'mirror',
    name:     'Void Mirror',
    modifier: 'mirrorAI'
  },
  godfall: {
    id:       'godfall',
    name:     'Collapsed God Realm',
    modifier: 'highDamage'
  },
  code: {
    id:       'code',
    name:     'Code Realm',
    modifier: 'uiBreak'
  }
};

function getWorldForChapter(id) {
  if (id < 60)  return 'fracture';
  if (id < 120) return 'war';
  if (id < 180) return 'mirror';
  if (id < 240) return 'godfall';
  return 'code';
}

// ── Multiverse Arc Definitions ────────────────────────────────────────────────
const STORY_ARCS = [
  { id: 'fracture', name: 'Fracture World',        range: [0,   59]  },
  { id: 'war',      name: 'War Echo',               range: [60,  119] },
  { id: 'mirror',   name: 'Void Mirror',            range: [120, 179] },
  { id: 'godfall',  name: 'Collapsed God Realm',    range: [180, 239] },
  { id: 'code',     name: 'Code Realm',             range: [240, 310] }
];

function getStoryArc(id) {
  for (const arc of STORY_ARCS) {
    if (id >= arc.range[0] && id <= arc.range[1]) return arc;
  }
  return null;
}

// ── Chapter definitions ───────────────────────────────────────────────────────

function _storyExploreStyleForWorld(world) {
  const tag = String(world || '').toLowerCase();
  if (tag.includes('forest') || tag.includes('green')) return 'forest';
  if (tag.includes('void') || tag.includes('rift')) return 'void';
  if (tag.includes('space') || tag.includes('fracture')) return 'space';
  if (tag.includes('lava') || tag.includes('industrial')) return 'lava';
  return 'city';
}

function _storyPassiveChapterVariant(ch) {
  const cycle = ['exploration', 'objective', 'parkour'];
  return cycle[ch.id % cycle.length];
}

function _storyPassiveChapterObjective(ch, variant) {
  const world = String(ch.world || '').toLowerCase();
  if (variant === 'parkour') {
    if (world.includes('rooftop') || world.includes('sky')) return 'Rooftop Route';
    if (world.includes('fracture') || world.includes('space')) return 'Phase Path';
    return 'Traversal Route';
  }
  if (variant === 'objective') {
    if (world.includes('relay') || world.includes('signal')) return 'Signal Node';
    if (world.includes('void') || world.includes('rift')) return 'Anchor Fragment';
    return 'Control Point';
  }
  if (world.includes('forest')) return 'Hidden Trail';
  if (world.includes('fracture') || world.includes('space')) return 'Fracture Trail';
  return 'Forward Route';
}

function _storyPassiveEnemyDefs(ch, variant) {
  const id = ch.id;
  const tier = id >= 60 ? 'expert' : id >= 35 ? 'hard' : id >= 12 ? 'medium' : 'easy';
  const style = _storyExploreStyleForWorld(ch.world);
  const baseColor = style === 'forest' ? '#58784f' : style === 'space' ? '#6b5ca8' : style === 'lava' ? '#9b4e2d' : style === 'void' ? '#55516d' : '#556677';
  const walker = { wx: 660, name: 'Scout', weaponKey: id >= 18 ? 'spear' : 'sword', classKey: 'none', aiDiff: tier, color: baseColor };
  const hunter = { wx: 1300, name: 'Hunter', weaponKey: id >= 25 ? 'axe' : 'sword', classKey: id >= 20 ? 'warrior' : 'none', aiDiff: tier, color: baseColor };
  const guardA = { wx: 2500, name: 'Sentinel', weaponKey: id >= 45 ? 'hammer' : 'sword', classKey: id >= 30 ? 'tank' : 'warrior', aiDiff: tier, color: baseColor, isGuard: true, health: 110 + Math.min(70, id * 2) };
  const guardB = { wx: 2580, name: 'Warden', weaponKey: id >= 48 ? 'spear' : 'axe', classKey: id >= 28 ? 'assassin' : 'warrior', aiDiff: id >= 55 ? 'expert' : 'hard', color: baseColor, isGuard: true, health: 95 + Math.min(60, id * 2) };
  if (variant === 'parkour') {
    walker.wx = 900;
    hunter.wx = 1850;
    return [walker, hunter];
  }
  if (variant === 'objective') {
    return [walker, hunter, guardA, guardB];
  }
  return [walker, hunter, { wx: 2050, name: 'Pursuer', weaponKey: id >= 22 ? 'axe' : 'sword', classKey: 'warrior', aiDiff: tier, color: baseColor }];
}

function _promotePassiveStoryChapters() {
  for (const ch of STORY_CHAPTERS2) {
    if (!ch || !ch.noFight || ch.isEpilogue) continue;

    const variant = _storyPassiveChapterVariant(ch);
    const objective = _storyPassiveChapterObjective(ch, variant);
    const worldLen = variant === 'parkour'
      ? 5600 + (ch.id % 4) * 340
      : variant === 'objective'
        ? 5200 + (ch.id % 5) * 320
        : 4800 + (ch.id % 6) * 280;

    ch.noFight = false;
    ch.type = 'exploration';
    ch.exploreMode = variant;
    ch.style = _storyExploreStyleForWorld(ch.world);
    ch.worldLength = ch.worldLength || worldLen;
    ch.objectX = ch.objectX || (ch.worldLength - (variant === 'objective' ? 620 : 520));
    ch.objectName = ch.objectName || objective;
    ch.spawnEnemies = ch.spawnEnemies || _storyPassiveEnemyDefs(ch, variant);
    ch.playerLives = ch.playerLives || 3;
    ch.tokenReward = Math.max(ch.tokenReward || 0, 16 + Math.floor(ch.id * 0.35));
    ch.preText = ch.preText || (
      variant === 'parkour'
        ? `Keep moving. Clear the route and reach the ${objective}.`
        : variant === 'objective'
          ? `Push through resistance and secure the ${objective}.`
          : `Advance through the area and find the ${objective}.`
    );
    ch.fightScript = ch.fightScript || [
      {
        frame: 50,
        text: variant === 'parkour'
          ? 'Route unstable. Stay high, keep speed, and don\'t get pinned.'
          : variant === 'objective'
            ? `Hold pressure, break the defenders, and take the ${objective}.`
            : `Stay alert. This section is live now — move toward the ${objective}.`,
        color: variant === 'parkour' ? '#44ccff' : variant === 'objective' ? '#ffcc44' : '#aaccff',
        timer: 260,
      },
      {
        frame: variant === 'parkour' ? 500 : 620,
        text: variant === 'parkour'
          ? 'Keep momentum. Hesitation is what gets you knocked off the route.'
          : variant === 'objective'
            ? `You are not done when you arrive. Hold the ${objective} under pressure.`
            : 'This section is built to grind you down. Keep moving anyway.',
        color: variant === 'parkour' ? '#9be7ff' : variant === 'objective' ? '#ffe58a' : '#d3e6ff',
        timer: 250,
      },
    ];
  }
}


// ── Ability definitions for the store ────────────────────────────────────────
// Blueprints are dropped as loot from specific chapter victories.
// Non-blueprint abilities can be purchased directly with tokens.
const STORY_ABILITIES2 = {
  // ── Blueprint-gated abilities (must find blueprint first) ──────────────────
  last_stand2: {
    name: 'Last Stand',
    desc: 'When HP < 15%, gain +60% speed and double damage for 8 seconds. One activation per match.',
    icon: '🔥', tokenCost: 80, requiresBlueprint: true,
    lore: 'The fragment knows when you\'re about to break. It doesn\'t let you.',
  },
  time_stop2: {
    name: 'Fracture Pulse',
    desc: 'Super (E) releases a fracture burst that stuns all enemies for 2.5s. 50s cooldown.',
    icon: '⏱️', tokenCost: 120, requiresBlueprint: true,
    lore: 'A micro-collapse of local time. The fragment remembers how.',
  },
  rage_mode2: {
    name: 'Echo Rage',
    desc: 'Taking 3 hits in quick succession triggers rage: next 5 attacks deal 3× damage.',
    icon: '💢', tokenCost: 100, requiresBlueprint: true,
    lore: 'The echo fighters taught you something you didn\'t expect: anger has a geometry.',
  },
  reflect2: {
    name: 'Mirror Fracture',
    desc: 'While shielding (S), reflect 25% of incoming damage back at the attacker.',
    icon: '🌀', tokenCost: 90, requiresBlueprint: true,
    lore: 'From the mirror pocket. Your echo showed you the technique by using it against you.',
  },
  world_break2: {
    name: 'Core Collapse',
    desc: 'Once per match, activate super to deal 60% of enemy max HP instantly.',
    icon: '🌍', tokenCost: 350, requiresBlueprint: true,
    lore: 'The Multiversal Core taught you what concentrated fracture energy feels like when it breaks.',
  },
  ghost_step2: {
    name: 'Fracture Step',
    desc: 'After rolling (double-tap ← or →), gain 0.4s of invincibility frames. 8s cooldown.',
    icon: '👁️', tokenCost: 110, requiresBlueprint: true,
    lore: 'A half-step between dimensions. The Herald showed you — then let you earn it.',
  },
  berserker_blood2: {
    name: 'Fragment Hunger',
    desc: 'Each kill charges your fragment: +8% damage stacked (max 5 kills, resets on death).',
    icon: '🩸', tokenCost: 130, requiresBlueprint: true,
    lore: 'The fragment was always absorbing. You learned to direct it.',
  },
  // ── Direct purchase abilities (no blueprint required) ─────────────────────
  shield_bash2: {
    name: 'Impact Shield',
    desc: 'Press Q while shielding to slam forward: 15 dmg + stagger. 3s cooldown.',
    icon: '🛡', tokenCost: 60, requiresBlueprint: false,
    lore: 'Basic momentum physics. You figured it out in the first portal fight.',
  },
  medkit2: {
    name: 'Dimensional Patch',
    desc: 'Once per match, press Q to heal 30% of max HP instantly.',
    icon: '💊', tokenCost: 50, requiresBlueprint: false,
    lore: 'Veran\'s field kit. She modified it for fragment-bearer physiology.',
  },
  fracture_surge2: {
    name: 'Fracture Surge',
    desc: 'Super meter charges 40% faster for the entire match.',
    icon: '⚡', tokenCost: 75, requiresBlueprint: false,
    lore: 'The fragment stores energy more efficiently now. So do you.',
  },
  void_step2: {
    name: 'Void Step',
    desc: 'When your health drops below 30%, gain a one-time burst of +50% speed for 5 seconds.',
    icon: '🌑', tokenCost: 85, requiresBlueprint: false,
    lore: 'The void between dimensions is not empty. You learned to move through it.',
  },
  // ── New Act IV / Act V blueprint abilities ────────────────────────
  architects_resolve2: {
    name: 'Architects\' Resolve',
    desc: 'Once per match, when you would be defeated, automatically revive with 25% HP instead.',
    icon: '🏛️', tokenCost: 160, requiresBlueprint: true,
    lore: 'Three Architects stood when one fell. Their resolve transferred to you — not as strength. As continuity.',
  },
  void_pulse2: {
    name: 'Void Pulse',
    desc: 'Press Q to emit a void pulse: pushes all nearby enemies back 120px and deals 20 damage. 12s cooldown.',
    icon: '💫', tokenCost: 95, requiresBlueprint: true,
    lore: 'The rift entity showed you what it felt like to exhale after ten thousand years of silence.',
  },
  temporal_anchor2: {
    name: 'Temporal Anchor',
    desc: 'When HP drops below 20%, freeze all enemies in place for 2 seconds. One activation per match.',
    icon: '⌛', tokenCost: 180, requiresBlueprint: true,
    lore: 'The Creator\'s domain runs on dimensional time. You learned to grip it.',
  },
};

// ── Act / Arc structure (read-only descriptor over STORY_CHAPTERS2 indices) ───

function _phaseToChapter(origCh, phase, newId, pi, isFirst, isFinal, totalTokens, numPhases) {
  const phaseCh = {
    id:          newId,
    title:       origCh.title + (numPhases > 1 ? ' — ' + (phase.label || _storyPhaseName(phase.type)) : ''),
    world:       origCh.world,
    narrative:   isFirst ? (origCh.narrative || []) : [],
    preText:     phase.label || _storyPhaseName(phase.type),
    fightScript: isFirst ? (origCh.fightScript || []) : [],
    tokenReward: isFinal
      ? Math.max(8, Math.ceil(totalTokens * 0.55))
      : Math.max(4, Math.floor(totalTokens * 0.45 / Math.max(1, numPhases - 1))),
    playerLives: phase.playerLives || origCh.playerLives || 3,
    arena:       phase.arena || origCh.arena,
    blueprintDrop: isFinal ? (origCh.blueprintDrop || null) : null,
    storeNag:    isFinal ? (origCh.storeNag || null) : null,
    _origId:     origCh.id,   // original chapter ID for difficulty scaling
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
    // Fight phase
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
      // Final phase (mini_boss) — use original chapter opponent
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
    }
  }
  return phaseCh;
}

function _expandStoryChaptersInPlace() {
  // Take a snapshot of the original 80 chapters
  const origList = STORY_CHAPTERS2.slice();
  const expanded = [];
  // Track new ID range for each original chapter (for act structure rebuild)
  const origToNewRange = {}; // origId → { start, end }

  for (const origCh of origList) {
    const rangeStart = expanded.length;

    if (origCh.noFight || origCh.isEpilogue) {
      // noFight / epilogue chapters stay as single chapters
      expanded.push({ ...origCh, id: expanded.length });
    } else {
      // Build phases using the original chapter's id for difficulty scaling
      const phaseSrc = { ...origCh }; // don't mutate origCh
      delete phaseSrc.phases;         // force rebuild
      const phases   = _storyBuildPhases(phaseSrc);
      const n        = phases.length;
      const tok      = origCh.tokenReward || 0;

      phases.forEach((phase, pi) => {
        expanded.push(_phaseToChapter(
          origCh, phase,
          expanded.length,   // new sequential id
          pi,
          pi === 0,          // isFirst
          pi === n - 1,      // isFinal
          tok,
          n,
        ));
      });
    }

    origToNewRange[origCh.id] = { start: rangeStart, end: expanded.length - 1 };
  }

  // Mutate STORY_CHAPTERS2 in place (it's a const array)
  STORY_CHAPTERS2.length = 0;
  for (const ch of expanded) STORY_CHAPTERS2.push(ch);

  // Rebuild STORY_ACT_STRUCTURE chapterRanges with new IDs
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


// ── Current chapter state for a fight in progress ─────────────────────────────
let _activeStory2Chapter = null;  // set when launching a chapter fight

// ── UI helpers ────────────────────────────────────────────────────────────────
function _worldIcon(w) {
  // World strings already include their emoji, just return as-is
  return w || '🌐';
}

function _story2TokenDisplay() {
  const el = document.getElementById('storyTokenDisplay');
  if (el) el.textContent = _story2.tokens;
}

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchStoryTab(tab) {
  ['chapters','store','multiverse'].forEach(t => {
    const btn   = document.getElementById('storyTab' + t.charAt(0).toUpperCase() + t.slice(1));
    const panel = document.getElementById('storyTabPanel' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn)   btn.classList.toggle('active', t === tab);
    if (panel) panel.style.display = (t === tab) ? '' : 'none';
  });
  if (tab === 'store') _renderStoryStore2();
  if (tab === 'multiverse' && typeof _renderMultiverseWorldList === 'function') _renderMultiverseWorldList();
  _story2TokenDisplay();
}

// ── Journey tab ───────────────────────────────────────────────────────────────
function _renderStoryJourney() {
  const list = document.getElementById('storyJourneyList');
  if (!list) return;
  list.innerHTML = '';
  const cur = _story2.chapter;

  STORY_CHAPTERS2.forEach((ch, i) => {
    const done    = _story2.defeated.includes(i);
    const current = i === cur;
    const locked  = i > cur;

    const el = document.createElement('div');
    el.className = 'story-journey-card' + (done ? ' done' : current ? ' current' : locked ? ' locked' : '');

    const icon = done ? '✅' : current ? '▶️' : locked ? '🔒' : '⭐';
    let rewardHtml = '';
    if (ch.tokenReward) rewardHtml += `+${ch.tokenReward} 🪙`;
    if (ch.blueprintDrop && STORY_ABILITIES2[ch.blueprintDrop]) {
      rewardHtml += ` · 📋 ${STORY_ABILITIES2[ch.blueprintDrop].name}`;
    }

    el.innerHTML = `<span class="sjc-icon">${icon}</span>
      <div class="sjc-body">
        <div class="sjc-title">${ch.title}</div>
        <div class="sjc-world">${_worldIcon(ch.world)}</div>
        ${rewardHtml ? `<div class="sjc-reward">${rewardHtml}</div>` : ''}
      </div>`;

    if (!locked) {
      el.onclick = () => _beginChapter2(i);
    }
    list.appendChild(el);
  });
}

// ── Ability Store tab ─────────────────────────────────────────────────────────
let _storeSubTab = 'shop';

function _renderStoryStore2() {
  const grid = document.getElementById('storyAbilityGrid2');
  if (!grid) return;
  grid.innerHTML = '';
  _story2TokenDisplay();
  _storyUpdateExpDisplay();

  // Sub-tab header
  const subTabBar = document.createElement('div');
  subTabBar.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:8px;';
  for (const [key, label] of [['shop','🪙 Shop'], ['skilltree','🌿 Skill Tree']]) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `background:${_storeSubTab===key?'rgba(80,140,255,0.25)':'transparent'};border:1px solid ${_storeSubTab===key?'rgba(80,140,255,0.6)':'rgba(255,255,255,0.12)'};color:${_storeSubTab===key?'#aacfff':'#6677aa'};padding:5px 14px;border-radius:5px;cursor:pointer;font-size:0.75rem;letter-spacing:1px;`;
    btn.onclick = () => { _storeSubTab = key; _renderStoryStore2(); };
    subTabBar.appendChild(btn);
  }
  grid.appendChild(subTabBar);

  if (_storeSubTab === 'shop') {
    _renderShopSection(grid);
  } else {
    _renderSkillTreeSection(grid);
  }
}

function _renderShopSection(grid) {
  for (const item of _storyBuildShopItems()) {
    const canBuy = _story2.tokens >= item.tokenCost && item.canBuy();
    const card = document.createElement('div');
    card.className = 'story-ability-card2' + (canBuy ? ' sa-buyable' : ' sa-locked');
    card.innerHTML = `<div class="sa-icon2">${item.icon}</div>
      <div class="sa-name2">${item.name}</div>
      <div class="sa-desc2">${item.desc}</div>
      <span class="sa-cost2">${item.tokenCost} 🪙</span>`;
    if (canBuy) card.onclick = () => _buyStoryShopItem(item);
    grid.appendChild(card);
  }

  for (const [key, ab] of Object.entries(STORY_ABILITIES2)) {
    const owned  = _story2.unlockedAbilities.includes(key);
    const hasBP  = !ab.requiresBlueprint || _story2.blueprints.includes(key);
    const canBuy = !owned && hasBP && _story2.tokens >= ab.tokenCost;
    const card   = document.createElement('div');
    card.className = 'story-ability-card2' + (owned ? ' sa-owned' : canBuy ? ' sa-buyable' : ' sa-locked');
    const costLabel = owned
      ? `<span class="sa-cost2 sa-owned-label">✅ Owned</span>`
      : !hasBP
      ? `<span class="sa-cost2 sa-locked-label">📋 Blueprint needed</span>`
      : `<span class="sa-cost2">${ab.tokenCost} 🪙</span>`;
    card.innerHTML = `<div class="sa-icon2">${ab.icon}</div>
      <div class="sa-name2">${ab.name}</div>
      <div class="sa-desc2">${ab.desc}</div>
      ${costLabel}`;
    if (canBuy) card.onclick = () => _buyAbility2(key, ab);
    grid.appendChild(card);
  }
}

function _renderSkillTreeSection(grid) {
  const sk  = _story2.skillTree || {};
  const exp = _story2.exp || 0;

  const expBanner = document.createElement('div');
  expBanner.style.cssText = 'padding:8px 12px;background:rgba(100,220,100,0.08);border:1px solid rgba(100,220,100,0.25);border-radius:7px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;';
  expBanner.innerHTML = `<span style="color:#88cc88;font-size:0.72rem;letter-spacing:1px;">SKILL POINTS (EXP)</span><span id="storyExpDisplay" style="color:#aaff88;font-size:1.0rem;font-weight:700;">${exp} EXP</span>`;
  grid.appendChild(expBanner);

  for (const [, branch] of Object.entries(STORY_SKILL_TREE)) {
    const branchHeader = document.createElement('div');
    branchHeader.style.cssText = `margin:10px 0 6px;font-size:0.65rem;letter-spacing:2px;text-transform:uppercase;color:${branch.color};font-weight:700;`;
    branchHeader.textContent = branch.label;
    grid.appendChild(branchHeader);

    const nodeRow = document.createElement('div');
    nodeRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:4px;';

    for (const node of branch.nodes) {
      const owned    = !!sk[node.id];
      const reqMet   = !node.requires || !!sk[node.requires];
      const canBuy   = !owned && reqMet && exp >= node.expCost;
      const isLocked = !owned && !reqMet;

      const card = document.createElement('div');
      card.style.cssText = [
        'border-radius:8px', 'padding:8px 10px', 'min-width:120px', 'flex:1',
        `border:1px solid ${owned ? 'rgba(100,220,100,0.4)' : canBuy ? `${branch.color}55` : 'rgba(255,255,255,0.07)'}`,
        `background:${owned ? 'rgba(40,90,50,0.35)' : canBuy ? 'rgba(20,30,60,0.4)' : 'rgba(5,5,15,0.25)'}`,
        `opacity:${isLocked ? '0.35' : '1'}`,
        canBuy ? 'cursor:pointer' : 'cursor:default',
      ].join(';');

      card.innerHTML = `
        <div style="font-size:0.79rem;color:${owned ? '#88ffaa' : canBuy ? '#dde4ff' : '#556'};font-weight:600;">${node.name}</div>
        <div style="font-size:0.62rem;color:#5566aa;margin:3px 0 5px;">${node.desc}</div>
        <div style="font-size:0.70rem;${owned ? 'color:#66ee99' : canBuy ? `color:${branch.color}` : 'color:#445'}">
          ${owned ? '✓ Unlocked' : isLocked ? '🔒 ' + node.requires.replace(/([A-Z])/g,' $1').trim() + ' required' : node.expCost + ' EXP'}
        </div>`;

      if (canBuy) {
        card.addEventListener('click', () => _buySkillNode(node, branch));
        card.addEventListener('mouseover', () => { card.style.background = 'rgba(30,50,100,0.6)'; });
        card.addEventListener('mouseout',  () => { card.style.background = 'rgba(20,30,60,0.4)'; });
      }
      nodeRow.appendChild(card);
    }
    grid.appendChild(nodeRow);
  }
}

function _buySkillNode(node, branch) {
  const sk  = _story2.skillTree = _story2.skillTree || {};
  const exp = _story2.exp || 0;
  if (sk[node.id]) return;
  if (node.requires && !sk[node.requires]) return;
  if (exp < node.expCost) return;
  _story2.exp = exp - node.expCost;
  sk[node.id] = true;
  _saveStory2();
  _renderStoryStore2();
  if (typeof showToast === 'function') showToast(`✅ ${node.name} unlocked!`);
}

function _buyStoryShopItem(item) {
  if (!item || _story2.tokens < item.tokenCost || !item.canBuy()) return;
  _story2.tokens -= item.tokenCost;
  item.buy();
  _saveStory2();
  _renderStoryStore2();
  _story2TokenDisplay();
  if (typeof showToast === 'function') showToast(`✅ Purchased: ${item.name}`);
}

function _buyAbility2(key, ab) {
  if (_story2.tokens < ab.tokenCost || _story2.unlockedAbilities.includes(key)) return;
  _story2.tokens -= ab.tokenCost;
  _story2.unlockedAbilities.push(key);
  _saveStory2();
  _renderStoryStore2();
  _story2TokenDisplay();
  if (typeof showToast === 'function') showToast('✅ Unlocked: ' + ab.name + '!');
}

// ── Opening prologue — shown on first play or after save wipe ─────────────────
const _PROLOGUE_LINES = [
  { text: 'Every universe has a seam.',                        delay: 0    },
  { text: 'A place where the fabric pulls thin.',             delay: 1000 },
  { text: 'Scientists call them fracture points.',            delay: 2100 },
  { text: '',                                                  delay: 2900 },
  { text: 'Yours opened on a Tuesday.',                       delay: 3400 },
  { text: '',                                                  delay: 4100 },
  { text: 'Something came through.',                          delay: 4600 },
  { text: '...',                                               delay: 5500 },
  { text: 'It was looking for a fighter.',                    delay: 6000 },
  { text: '',                                                  delay: 6800 },
  { text: 'It found you.',                                    delay: 7200 },
];

function _showPrologue(onDone) {
  // Build or retrieve overlay
  let ov = document.getElementById('prologueOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'prologueOverlay';
    ov.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:8000',
      'background:#000', 'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'cursor:pointer', 'font-family:"Segoe UI",Arial,sans-serif',
      'transition:opacity 0.8s ease',
    ].join(';');
    document.body.appendChild(ov);
  }

  // Lines container
  const linesEl = document.createElement('div');
  linesEl.style.cssText = 'text-align:center; max-width:520px; padding:0 24px;';
  ov.innerHTML = '';
  ov.appendChild(linesEl);

  // Begin button (hidden until all lines shown)
  const btn = document.createElement('button');
  btn.textContent = '▶  Begin Your Story';
  btn.style.cssText = [
    'margin-top:48px', 'padding:12px 36px',
    'background:linear-gradient(135deg,#3a1a6a,#6a2a9a)',
    'color:#fff', 'border:1px solid rgba(180,100,255,0.4)',
    'border-radius:8px', 'font-size:1rem', 'letter-spacing:1px',
    'cursor:pointer', 'opacity:0', 'transition:opacity 0.6s ease',
    'font-family:inherit',
  ].join(';');
  btn.onmouseover = () => { btn.style.background = 'linear-gradient(135deg,#5a2a9a,#8a3abb)'; };
  btn.onmouseout  = () => { btn.style.background = 'linear-gradient(135deg,#3a1a6a,#6a2a9a)'; };
  ov.appendChild(btn);

  ov.style.opacity = '0';
  ov.style.display = 'flex';
  requestAnimationFrame(() => { ov.style.opacity = '1'; });

  // Reveal lines one by one on a schedule
  _PROLOGUE_LINES.forEach((line, i) => {
    setTimeout(() => {
      if (line.text === '') return; // blank = spacer already handled by margin
      const p = document.createElement('p');
      p.textContent = line.text;
      p.style.cssText = [
        'margin:0 0 18px', 'font-size:1.25rem', 'color:#dde4ff',
        'opacity:0', 'transition:opacity 1.2s ease',
        line.text === '...' ? 'letter-spacing:6px; color:#667' : '',
      ].filter(Boolean).join(';');
      linesEl.appendChild(p);
      requestAnimationFrame(() => requestAnimationFrame(() => { p.style.opacity = '1'; }));
    }, line.delay);
  });

  // Show button after last line
  const lastDelay = _PROLOGUE_LINES[_PROLOGUE_LINES.length - 1].delay + 1400;
  setTimeout(() => { btn.style.opacity = '1'; }, lastDelay);

  let _dismissed = false;
  function dismiss(e) {
    if (e) e.stopPropagation();
    if (_dismissed) return;
    _dismissed = true;
    btn.onclick = null;
    ov.onclick  = null;
    ov.style.opacity = '0';
    setTimeout(() => {
      ov.style.display = 'none';
      onDone();
    }, 820);
  }
  btn.onclick = dismiss;
  // Also allow click anywhere on overlay after button appears
  setTimeout(() => { ov.onclick = dismiss; }, lastDelay);
}

// ── Chapter flow ──────────────────────────────────────────────────────────────
let _narrativeActive = false; // guard against re-entrant narrative calls
const _seenNarrativeIds = new Set(); // chapters whose narrative was already shown this session

function _startStoryGauntlet(ch) {
  if (!ch) return;
  const phases = _storyBuildPhases(ch);
  storyGauntletState = {
    chapterId: ch.id,
    phases,
    index: 0,
    carryHealthPct: _storyGetCarryHealthPct(),
    sideRewards: [],
  };
  _storyUpdatePhaseIndicator();
  _launchStoryGauntletPhase(ch);
}

function _storyPhaseLaunchConfig(ch, phase) {
  const phaseType = phase.type;
  const traversalLike = phaseType === 'traversal';
  if (traversalLike) {
    const traversalChapter = {
      ...ch,
      type: 'exploration',
      noFight: false,
      preText: `${phase.label || 'Advance'} — ${_storyPhaseName(phase.type)}`,
      worldLength: phase.worldLength || Math.max(5200, Math.floor((ch.worldLength || 4600) * 0.75)),
      objectName: phase.objectName || ch.objectName || 'Forward Route',
      spawnEnemies: phase.spawnEnemies || ch.spawnEnemies || [],
      playerLives: phase.playerLives || ch.playerLives || 3,
      fightScript: [...(ch.fightScript || [])],
    };
    return { mode: 'exploration', chapter: traversalChapter };
  }

  const launch = {
    ...ch,
    type: 'fight',
    noFight: false,
    preText: `${phase.label || _storyPhaseName(phaseType)}`,
    playerLives: phase.playerLives || ch.playerLives || 3,
    arena: phase.arena || ch.arena,
    isBossFight: false,
    isTrueFormFight: false,
    isSovereignFight: false,
    twoEnemies: Array.isArray(phase.opponents) && phase.opponents.length > 1,
    secondEnemy: Array.isArray(phase.opponents) && phase.opponents.length > 1 ? phase.opponents[1] : null,
  };
  if (Array.isArray(phase.opponents) && phase.opponents[0]) {
    const lead = phase.opponents[0];
    launch.opponentName = lead.name || ch.opponentName || 'Enemy';
    launch.weaponKey = lead.weaponKey || ch.weaponKey || 'sword';
    launch.classKey = lead.classKey || ch.classKey || 'warrior';
    launch.aiDiff = lead.aiDiff || ch.aiDiff || 'medium';
    launch.opponentColor = lead.color || ch.opponentColor || '#778899';
    launch.armor = lead.armor || [];
  }
  if (phase.finalChapter) {
    launch.isBossFight = !!ch.isBossFight;
    launch.isTrueFormFight = !!ch.isTrueFormFight;
    launch.isSovereignFight = !!ch.isSovereignFight;
    if (!launch.opponentName && ch.opponentName) launch.opponentName = ch.opponentName;
    if (!launch.weaponKey && ch.weaponKey) launch.weaponKey = ch.weaponKey;
    if (!launch.classKey && ch.classKey) launch.classKey = ch.classKey;
  }
  return { mode: 'chapter', chapter: launch };
}

function _launchStoryGauntletPhase(ch) {
  const phase = _storyGetCurrentPhase();
  if (!phase) return;
  _storyUpdatePhaseIndicator();
  storyPendingPhaseConfig = phase;
  const cfg = _storyPhaseLaunchConfig(ch, phase);
  if (cfg.mode === 'exploration') _launchExplorationChapter(cfg.chapter);
  else _launchChapter2Fight(cfg.chapter);
}

function _advanceStoryGauntletPhase(ch) {
  if (!storyGauntletState) return false;
  storyGauntletState.index++;
  if (storyGauntletState.index >= storyGauntletState.phases.length) {
    storyPendingPhaseConfig = null;
    storyPhaseIndicator = null;
    return false;
  }
  _storyUpdatePhaseIndicator();
  setTimeout(() => {
    const go = document.getElementById('gameOverOverlay');
    if (go) go.style.display = 'none';
    const pauseOv = document.getElementById('pauseOverlay');
    if (pauseOv) pauseOv.style.display = 'none';
    storyModeActive = true;
    _launchStoryGauntletPhase(ch);
  }, 420);
  return true;
}

function _beginChapter2(idx) {
  if (_narrativeActive) return;
  const ch = STORY_CHAPTERS2[idx];
  if (!ch) return;
  _activeStory2Chapter = ch;
  storyGauntletState = null; // no phases — single chapter only

  if (ch.noFight && !ch.isEpilogue) {
    _showStory2Narrative(ch.narrative, () => _completeChapter2(ch));
    return;
  }
  if (ch.noFight) {
    _showStory2Narrative(ch.narrative, () => _completeChapter2(ch));
    return;
  }

  // On retry (narrative already seen this session), skip straight to fight
  if (_seenNarrativeIds.has(ch.id)) {
    _directLaunchChapter(ch);
    return;
  }

  _seenNarrativeIds.add(ch.id);
  const allLines = [...(ch.narrative || [])];
  if (ch.preText) allLines.push(ch.preText);
  _showStory2Narrative(allLines, () => {
    _showPreFightStoreNag(ch, () => _directLaunchChapter(ch));
  });
}

// Direct launch — no gauntlet phases, just the chapter itself
function _directLaunchChapter(ch) {
  if (!ch) return;
  storyGauntletState = null;
  if (ch.type === 'exploration') {
    _launchExplorationChapter(ch);
  } else {
    _launchChapter2Fight(ch);
  }
}

// Reuse the existing storyDialoguePanel for narrative display.
function _showStory2Narrative(lines, callback) {
  const panel   = document.getElementById('storyDialoguePanel');
  const chEl    = document.getElementById('storyDialogueChapter');
  const titleEl = document.getElementById('storyDialogueTitle');
  const bodyEl  = document.getElementById('storyDialogueBody');
  const btn     = document.getElementById('storyDialogueFightBtn');

  if (!panel || !lines || !lines.length) { _narrativeActive = false; if (callback) callback(); return; }

  _narrativeActive = true;
  let idx = 0;

  function showLine() {
    if (idx >= lines.length) {
      panel.style.display = 'none';
      _narrativeActive = false;
      callback();
      return;
    }
    bodyEl.innerHTML = `<p style="margin:0;font-size:0.93rem;color:#dde4ff;line-height:1.65;">${lines[idx]}</p>`;
    idx++;
    btn.textContent = idx < lines.length ? 'Next →' : (_activeStory2Chapter && _activeStory2Chapter.noFight ? 'Continue →' : '⚔️ Fight!');
    btn.onclick = showLine;
  }

  if (chEl)    chEl.textContent   = _activeStory2Chapter ? _worldIcon(_activeStory2Chapter.world) : '';
  if (titleEl) titleEl.textContent = _activeStory2Chapter ? _activeStory2Chapter.title : '';
  // Show opponent name sub-label if available
  const _diagOpp = document.getElementById('storyDialogueOpponent');
  if (_diagOpp) {
    const _oppName = _activeStory2Chapter && _activeStory2Chapter.opponentName;
    _diagOpp.textContent = _oppName ? `vs. ${_oppName}` : '';
    _diagOpp.style.display = _oppName ? '' : 'none';
  }
  panel.style.display = 'flex';
  showLine();
}

function _showStory2PreFight(ch) {
  // Legacy stub — now handled inline by _showStory2Narrative
  _launchChapter2Fight(ch);
}

function _launchChapter2Fight(ch) {
  if (!ch) return;

  // Reset per-fight story event state (abilities, distortion, event dedup)
  if (typeof resetStoryEventState === 'function') resetStoryEventState();

  // Exploration chapter: different launch path
  if (ch.type === 'exploration') {
    _launchExplorationChapter(ch);
    return;
  }

  // Boss fight: show cinematic intro before launching (async — delays startGame)
  if (ch.isBossFight) {
    if (typeof triggerEvent === 'function') triggerEvent('BOSS_INTRO', { ch }, true);
    const _bossCinDuration = 7800;
    setTimeout(() => _launchChapter2FightImmediate(ch), _bossCinDuration);
    return;
  }

  _launchChapter2FightImmediate(ch);
}

function _launchChapter2FightImmediate(ch) {
  const _phase = storyPendingPhaseConfig;
  // Close the story modal directly — bypass the ch0-lock guard (fight launch is always valid)
  const _storyModal = document.getElementById('storyModal');
  if (_storyModal) _storyModal.style.display = 'none';

  // Apply world modifiers for this chapter
  worldId        = getWorldForChapter(ch.id);
  currentWorld   = STORY_WORLDS[worldId] || null;
  worldModifiers = currentWorld ? currentWorld.modifier : null;

  // Apply multiverse arc
  const _arc = getStoryArc(ch.id);
  if (_arc) storyCurrentArc = _arc.id;

  // Configure game for chapter
  if (ch.isTrueFormFight) {
    gameMode = 'trueform';
    if (typeof selectMode === 'function') selectMode('trueform');
  } else if (ch.isBossFight) {
    gameMode = 'boss';
    if (typeof selectMode === 'function') selectMode('boss');
  } else if (ch.isSovereignFight) {
    gameMode = 'adaptive';
    p2IsBot  = true;
    if (typeof selectMode === 'function') selectMode('adaptive');
  } else {
    gameMode = '2p';
    p2IsBot  = true;
    if (typeof selectMode === 'function') selectMode('2p');
  }

  // Set arena
  if ((_phase && _phase.arena) || ch.arena) {
    selectedArena = (_phase && _phase.arena) || ch.arena;
    const arSelect = document.getElementById('arenaSelect');
    if (arSelect) arSelect.value = selectedArena;
  }

  // ── Ranged-weapon restriction ─────────────────────────────────────────────
  // Early story forbids ranged weapons so progression stays grounded and difficulty is consistent.
  // Later chapters/replays can use ranged loadouts normally.
  const _chBeaten = Array.isArray(_story2.defeated) && _story2.defeated.includes(ch.id);
  const _RANGED_FALLBACK = 'sword'; // melee substitute when ranged is stripped
  const _isRanged = key => typeof WEAPONS !== 'undefined' && WEAPONS[key] && WEAPONS[key].type === 'ranged';
  const _rangedUnlocked = _chBeaten || ch.id >= 10;
  const _safeWeapon = key => (_rangedUnlocked || !_isRanged(key)) ? key : _RANGED_FALLBACK;

  // Set P2 weapon/class to chapter opponent
  const _notBossOrTF = !ch.isBossFight && !ch.isTrueFormFight && !ch.isSovereignFight;
  if (_notBossOrTF && ch.weaponKey) {
    const p2w = document.getElementById('p2Weapon');
    if (p2w) p2w.value = _safeWeapon(ch.weaponKey);
  }
  if (_notBossOrTF && ch.classKey) {
    const p2c = document.getElementById('p2Class');
    if (p2c) p2c.value = ch.classKey;
  }
  if (_notBossOrTF && ch.aiDiff) {
    const p2d = document.getElementById('p2Difficulty');
    if (p2d) p2d.value = ch.aiDiff;
  }

  // Apply per-chapter fight script (tutorial hints, narrative subtitles)
  // Filter out entries that require abilities not yet unlocked.
  // Each entry can carry a `requires` array: ['ability','super','doubleJump']
  if (ch.fightScript && ch.fightScript.length) {
    const _ov = storyPlayerOverride || {};
    storyFightScript = ch.fightScript.filter(entry => {
      const req = entry.requires;
      if (!req) return true;
      const reqs = Array.isArray(req) ? req : [req];
      if (reqs.includes('doubleJump') && _ov.noDoubleJump) return false;
      if (reqs.includes('ability')    && _ov.noAbility)    return false;
      if (reqs.includes('super')      && _ov.noSuper)      return false;
      return true;
    });
    if (_phase && !_phase.finalChapter) {
      storyFightScript.unshift({
        frame: 20,
        text: `${_storyPhaseName(_phase.type)} — ${_phase.label || 'Engage and clear the arena.'}`,
        color: _phase.type === 'hazard_phase' ? '#ff8844' : _phase.type === 'elite_wave' ? '#ffcc66' : '#aaccff',
        timer: 220,
      });
    }
    storyFightScriptIdx = 0;
    storyFightSubtitle  = null;
  } else {
    storyFightScript    = [];
    storyFightScriptIdx = 0;
    storyFightSubtitle  = null;
    if (_phase && !_phase.finalChapter) {
      storyFightSubtitle = {
        text: `${_storyPhaseName(_phase.type)} — ${_phase.label || 'Clear the phase.'}`,
        timer: 220,
        maxTimer: 220,
        color: _phase.type === 'hazard_phase' ? '#ff8844' : '#aaccff'
      };
    }
  }

  // Apply per-chapter player lives
  if (typeof selectLives === 'function') selectLives((_phase && _phase.playerLives) || ch.playerLives || 3);
  infiniteMode = false;

  // ── Ability progression: gate unlocks by chapter id OR by story events ───
  // storyState.abilities is the authoritative source; chapter thresholds are
  // the fallback minimum for players who have already progressed past the unlock point.
  const _caps = ch.playerCaps || {};
  const id = ch._origId !== undefined ? ch._origId : ch.id; // use original id for difficulty scaling
  const _sa = (typeof storyState !== 'undefined') ? storyState.abilities : {};
  const _sk = _story2.skillTree || {};
  storyPlayerOverride = {
    // If chapter not yet beaten, strip ranged weapons from the player too
    weapon:        _caps.weapon !== undefined ? _safeWeapon(_caps.weapon) : (id < 1 ? 'sword' : (_isRanged(document.getElementById('p1Weapon')?.value) ? _RANGED_FALLBACK : null)),
    noDoubleJump:  _caps.noDoubleJump !== undefined ? _caps.noDoubleJump : !(_sk.doubleJump || !!_sa.doubleJump),
    noAbility:     _caps.noAbility    !== undefined ? _caps.noAbility    : !(_sk.weaponAbility || !!_sa.weaponAbility),
    noSuper:       _caps.noSuper      !== undefined ? _caps.noSuper      : !(_sk.superMeter || !!_sa.superMeter),
    noClass:       _caps.noClass      !== undefined ? _caps.noClass      : !_sk.classUnlock,
    noDodge:       !(_sk.dodge || !!_sa.dodge || storyDodgeUnlocked),
    dmgMult:       1.0 + (_sk.heavyHit2 ? 0.25 : _sk.heavyHit1 ? 0.15 : 0),
    speedMult:     1.0 + (_sk.fastMove2 ? 0.20 : _sk.fastMove1 ? 0.10 : 0),
    jumpMult:      1.0 + (_sk.highJump2 ? 0.25 : _sk.highJump1 ? 0.15 : 0),
  };

  // Ability toasts are now shown only when purchased in the skill tree

  // Boss type override (e.g. 'fallen_god' → spawns FallenGod instead of Boss)
  storyBossType = ch.bossType || null;

  // Opponent name
  storyOpponentName = ch.opponentName || null;

  // Armor and multi-enemy setup
  storyEnemyArmor = ch.armor || [];
  storyTwoEnemies = !!ch.twoEnemies;
  // Strip ranged weapon from second enemy on unbeaten chapters
  if (ch.secondEnemy) {
    const _sed = Object.assign({}, ch.secondEnemy);
    if (_sed.weaponKey) _sed.weaponKey = _safeWeapon(_sed.weaponKey);
    storySecondEnemyDef = _sed;
  } else if (ch.twoEnemies) {
    // Auto-generate second enemy from chapter opponent data when no explicit def
    storySecondEnemyDef = {
      weaponKey: _safeWeapon(ch.weaponKey || 'sword'),
      classKey:  ch.classKey  || 'warrior',
      aiDiff:    ch.aiDiff    || 'medium',
      color:     ch.opponentColor || '#cc5500',
    };
  } else {
    storySecondEnemyDef = null;
  }

  // Mark story2 fight active
  storyModeActive = true;

  // Scale STORY_ENEMY_CONFIGS to chapter progression (defaults to 1 for v1 story)
  storyCurrentLevel = Math.min(8, Math.floor(id / 5) + 1);

  // Boss chapter: register director sequences that fire during the fight
  if (ch.isBossFight && typeof directorOnce === 'function') {
    // Use setTimeout so players[] is populated after startGame initializes
    setTimeout(() => {
      const _boss = players && players.find(p => p.isBoss);
      if (!_boss) return;

      directorOnce('boss_first_blood',
        () => gameRunning && _boss.health < _boss.maxHealth - 180,
        () => {
          if (typeof showBossDialogue === 'function') showBossDialogue('"You landed that. Good."', 120);
          if (typeof setCameraDrama === 'function') setCameraDrama('focus', 60, _boss, 1.18);
        }
      );

      directorOnce('boss_half_hp',
        () => gameRunning && _boss.health < _boss.maxHealth * 0.50,
        () => {
          if (typeof setCameraDrama === 'function') {
            setCameraDrama('wideshot', 100);
            setTimeout(() => setCameraDrama('focus', 70, _boss, 1.30), 1000);
          }
          if (typeof screenShakeIntensity !== 'undefined') screenShakeIntensity = Math.max(screenShakeIntensity || 0, 10);
          if (typeof showBossDialogue === 'function') showBossDialogue('"Half gone. You\'re better than I expected."', 160);
          if (typeof slowMotionFor === 'function') slowMotionFor(0.40, 900);
          if (director) director._worldState = 'boss';
        }
      );

      directorOnce('boss_final_phase',
        () => gameRunning && _boss.health < _boss.maxHealth * 0.20,
        () => {
          storyDistortLevel = Math.min(1.0, storyDistortLevel + 0.30);
          if (typeof setCameraDrama === 'function') setCameraDrama('wideshot', 160);
          if (typeof slowMotionFor === 'function') slowMotionFor(0.42, 1300);
          if (typeof showBossDialogue === 'function') showBossDialogue('"You weren\'t in the design. Yet here you are."', 210);
          if (typeof screenShakeIntensity !== 'undefined') screenShakeIntensity = Math.max(screenShakeIntensity || 0, 13);
          if (typeof directorSchedule === 'function') {
            directorSchedule([{
              id: 'boss_fp_focus', delay: 130,
              condition: () => gameRunning,
              action: () => {
                if (typeof setCameraDrama === 'function') setCameraDrama('focus', 90, _boss, 1.38);
              }
            }]);
          }
        }
      );
    }, 800); // 800ms after startGame so players[] is ready
  }

  if (typeof startGame === 'function') startGame();
  setTimeout(() => { if (players[0]) _applySkillTreeToPlayer(players[0]); }, 50);

  // World boss variant: patch the boss after players[] is populated
  if (ch.isWorldBoss) {
    setTimeout(() => spawnWorldBoss(worldId), 100);
  }
}

// ── World Boss variants ────────────────────────────────────────────────────────
// Patches the freshly-spawned Boss instance with world-specific stat/behaviour
// tweaks.  Keep these as simple property overrides — do NOT rebuild Boss logic.
function spawnWorldBoss(wId) {
  if (!players || !Array.isArray(players)) return;
  const boss = players.find(p => p && p.isBoss && !p.isTrueForm);
  if (!boss) return;

  switch (wId) {
    case 'fracture':
      // Teleport-heavy: shorter beam cooldown, snaps position toward player periodically
      boss._worldBossVariant = 'fracture';
      boss.beamCooldown       = Math.min(boss.beamCooldown || 600, 400);
      boss._fractureTeleportCd = 0; // countdown handled in Boss.updateAI guard block below
      break;

    case 'war':
      // Aggressive combo boss: faster attacks, higher KB output
      boss._worldBossVariant  = 'war';
      boss.attackCooldownMult = Math.min(boss.attackCooldownMult || 0.35, 0.22);
      boss.kbBonus            = (boss.kbBonus || 1.8) * 1.35;
      boss.speed              = (boss.speed || 3.2) * 1.2;
      if (typeof showBossDialogue === 'function') {
        setTimeout(() => showBossDialogue('"War has no patience."', 140), 1200);
      }
      break;

    case 'mirror':
      // Mirror AI: copies the player's last weapon key at fight start
      boss._worldBossVariant = 'mirror';
      if (players[0] && typeof WEAPONS !== 'undefined') {
        const playerWeaponKey = players[0].weaponKey || 'sword';
        if (WEAPONS[playerWeaponKey]) {
          boss.weapon    = WEAPONS[playerWeaponKey];
          boss.weaponKey = playerWeaponKey;
        }
      }
      boss.kbResist = (boss.kbResist || 0.3) * 0.8; // slightly less tanky — relies on mirroring
      break;

    case 'godfall':
      // High-damage boss: raw stat pump, slower movement to compensate
      boss._worldBossVariant = 'godfall';
      boss.kbBonus           = (boss.kbBonus || 1.8) * 1.6;
      boss.speed             = Math.max((boss.speed || 3.2) * 0.8, 2.0);
      boss.health            = Math.round(boss.health * 1.2);
      boss.maxHealth         = boss.health;
      if (typeof showBossDialogue === 'function') {
        setTimeout(() => showBossDialogue('"Gods do not fall — they collapse everything around them."', 180), 1200);
      }
      break;

    case 'code':
      // UI disruption boss: triggers storyDistortLevel ramp on fight start
      boss._worldBossVariant = 'code';
      if (typeof storyDistortLevel !== 'undefined') {
        storyDistortLevel = Math.min(1.0, (storyDistortLevel || 0) + 0.25);
      }
      boss.color = '#00ffcc'; // teal tint to signal Code variant
      if (typeof showBossDialogue === 'function') {
        setTimeout(() => showBossDialogue('"You\'re reading the wrong version of this fight."', 160), 1200);
      }
      break;

    default:
      break;
  }
}

// ── Called when the player wins a story2 chapter ─────────────────────────────
// ── Shop recommendation on chapter loss ───────────────────────────────────────
function _showStory2LoseNag(ch) {
  // Wait one frame so endGame() can finish building the overlay before we inject into it
  requestAnimationFrame(() => {
    const ov = document.getElementById('gameOverOverlay');
    if (!ov) return;

    // Remove any previous nag so replay doesn't stack them
    const old = ov.querySelector('#story2LoseNag');
    if (old) old.remove();

    // Find items the player can afford and hasn't bought yet
    const affordable = Object.entries(STORY_ABILITIES2).filter(([key, ab]) => {
      const owned = _story2.unlockedAbilities.includes(key);
      const hasBP = !ab.requiresBlueprint || _story2.blueprints.includes(key);
      return !owned && hasBP && _story2.tokens >= ab.tokenCost;
    });

    // Build nag HTML
    const nag = document.createElement('div');
    nag.id = 'story2LoseNag';
    nag.style.cssText = [
      'margin-top:14px', 'padding:12px 16px',
      'background:rgba(180,60,20,0.18)',
      'border:1px solid rgba(255,120,40,0.35)',
      'border-radius:10px', 'font-size:0.78rem',
      'color:#ffcc99', 'text-align:left', 'max-width:340px', 'margin-inline:auto',
    ].join(';');

    if (affordable.length === 0) {
      // Player can't afford anything — tell them tokens come from winning/replaying
      nag.innerHTML = `
        <div style="font-weight:700;margin-bottom:5px;color:#ffaa66;">💡 Ability Store</div>
        <div style="color:#ccbbaa;">You don't have enough tokens to buy anything right now.
          Beat earlier chapters or replay them to earn more tokens — then spend them in the
          <b>Ability Store</b> before your next attempt.</div>`;
    } else {
      // Pick the single most impactful affordable item to highlight
      // Priority: medkit (instant heal) > last_stand2 > ghost_step2 > others; else just cheapest
      const PRIORITY = ['medkit2', 'last_stand2', 'ghost_step2', 'shield_bash2', 'reflect2'];
      let pick = affordable.find(([k]) => PRIORITY.includes(k)) || affordable[0];
      const [pickKey, pickAb] = pick;

      const moreCount = affordable.length - 1;
      const moreText  = moreCount > 0
        ? `<span style="color:#ffee99"> + ${moreCount} more item${moreCount > 1 ? 's' : ''} you can afford</span>`
        : '';

      nag.innerHTML = `
        <div style="font-weight:700;margin-bottom:6px;color:#ffaa66;">
          🏪 Ability Store — ${_story2.tokens} 🪙 available
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span style="font-size:1.6rem;line-height:1;">${pickAb.icon}</span>
          <div>
            <div style="font-weight:700;color:#fff;">${pickAb.name}
              <span style="color:#ffcc55;font-weight:400;"> — ${pickAb.tokenCost} 🪙</span>
            </div>
            <div style="color:#ddd;font-size:0.73rem;">${pickAb.desc}</div>
          </div>
        </div>
        ${moreText ? `<div style="font-size:0.71rem;margin-bottom:8px;">${moreText}</div>` : ''}
        <button id="story2NagStoreBtn" style="
          width:100%;padding:8px 0;background:linear-gradient(135deg,#8833cc,#aa44ee);
          border:none;border-radius:8px;color:#fff;font-weight:700;font-size:0.82rem;
          cursor:pointer;letter-spacing:0.5px;">
          🏪 Visit Ability Store
        </button>`;
    }

    // Insert nag above the button row
    const btnRow = ov.querySelector('.btn-row');
    if (btnRow) btnRow.before(nag);
    else ov.querySelector('.overlay-box').appendChild(nag);

    // Wire up Visit Store button — open story menu directly on the store tab
    const storeBtn = nag.querySelector('#story2NagStoreBtn');
    if (storeBtn) {
      storeBtn.onclick = () => {
        ov.style.display = 'none';
        storyModeActive = false;
        if (typeof backToMenu === 'function') backToMenu();
        setTimeout(() => {
          if (typeof openStoryMenu === 'function') openStoryMenu();
          setTimeout(() => {
            if (typeof switchStoryTab === 'function') switchStoryTab('store');
          }, 120);
        }, 320);
      };
    }
  });
}

// Hooked into endGame via storyOnMatchEnd — we intercept after storyModeActive check
function story2OnMatchEnd(playerWon) {
  const ch = _activeStory2Chapter;
  if (!ch || !storyModeActive) return false; // not a story2 fight

  // Flush any unshown early fight-script entries (frame ≤ 90) so they always display
  if (storyFightScript && storyFightScriptIdx < storyFightScript.length) {
    const earlyEntry = storyFightScript.slice(storyFightScriptIdx).find(e => e.frame <= 90);
    if (earlyEntry) {
      const dur = earlyEntry.timer || 200;
      storyFightSubtitle = { text: earlyEntry.text, timer: dur, maxTimer: dur, color: earlyEntry.color, speaker: earlyEntry.speaker || null };
    }
  }
  if (!playerWon) {
    if (_story2.runState) _story2.runState.noDeathChain = 0;
    _showStory2RetryScreen(ch);
    return true; // handled — don't complete chapter
  }

  const p1 = players && players.find(p => !p.isBoss && !p.isAI);
  if (p1 && p1.maxHealth > 0) {
    _storySetCarryHealthPct(p1.health / p1.maxHealth);
  }

  // Multiverse world boss beaten — record world clear, unlock next world, apply scaling
  if (ch.isMultiverseWorld && ch.multiverseWorldId && typeof MultiverseManager !== 'undefined') {
    MultiverseManager.onWorldComplete(ch.multiverseWorldId);
    MultiverseManager.deactivate();
  }

  if (storyGauntletState && _advanceStoryGauntletPhase(ch)) {
    if (!_story2.runState) _story2.runState = { healthPct: 1, noDeathChain: 0 };
    _story2.runState.noDeathChain = (_story2.runState.noDeathChain || 0) + 1;
    _saveStory2();
    return true;
  }

  // Award tokens + blueprint
  storyGauntletState = null;
  storyPendingPhaseConfig = null;
  storyPhaseIndicator = null;
  _story2.tokens += ch.tokenReward;
  if (ch.blueprintDrop && !_story2.blueprints.includes(ch.blueprintDrop)) {
    _story2.blueprints.push(ch.blueprintDrop);
  }
  // Armor blueprint drop: killing an armored enemy drops one random piece blueprint
  if (ch.armor && ch.armor.length > 0) {
    if (!_story2.armorBlueprints) _story2.armorBlueprints = [];
    const _armorPiece = ch.armor[Math.floor(Math.random() * ch.armor.length)];
    const _bpKey = 'armor_' + _armorPiece;
    if (!_story2.armorBlueprints.includes(_bpKey)) {
      _story2.armorBlueprints.push(_bpKey);
    }
  }
  const _firstClear = !_story2.defeated.includes(ch.id);
  if (_firstClear) {
    _story2.defeated.push(ch.id);
    if (typeof playerPowerLevel !== 'undefined') playerPowerLevel = Math.min(3.0, playerPowerLevel + 0.02);
  }
  _story2.chapter = Math.max(_story2.chapter, ch.id + 1);
  if (!_story2.runState) _story2.runState = { healthPct: 1, noDeathChain: 0 };
  _story2.runState.noDeathChain = (_story2.runState.noDeathChain || 0) + 1;

  // Sovereign chapter win — unlock Neural AI and Sovereign Ω modes
  if (ch.isSovereignFight && !localStorage.getItem('smc_sovereignBeaten')) {
    localStorage.setItem('smc_sovereignBeaten', '1');
    const adCard  = document.getElementById('modeAdaptive');
    const sovCard = document.getElementById('modeSovereign');
    if (adCard)  adCard.style.display  = '';
    if (sovCard) sovCard.style.display = '';
  }

  // Check story completion (trigger on last non-epilogue chapter win)
  const _lastFightId = STORY_CHAPTERS2.filter(c => !c.noFight && !c.isEpilogue).reduce((m,c)=>Math.max(m,c.id),-1);
  if (ch.id >= _lastFightId && !_story2.storyComplete) {
    _completeStory2();
  }
  _saveStory2();

  // Fallen God post-defeat backstory sequence
  if (ch.bossType === 'fallen_god' && typeof startFallenGodBackstory === 'function') {
    startFallenGodBackstory();
  }

  // Show victory overlay (instead of or in addition to level complete)
  _showStory2Victory(ch);
  return true; // consumed by story2 system
}

function _completeChapter2(ch) {
  // Called for no-fight chapters (epilogue)
  storyGauntletState = null;
  storyPendingPhaseConfig = null;
  storyPhaseIndicator = null;
  if (!_story2.defeated.includes(ch.id)) {
    _story2.defeated.push(ch.id);
    if (typeof playerPowerLevel !== 'undefined') playerPowerLevel = Math.min(3.0, playerPowerLevel + 0.02);
  }
  _story2.tokens += ch.tokenReward;
  _story2.chapter = Math.max(_story2.chapter, ch.id + 1);
  if (ch.isEpilogue) _completeStory2();
  _saveStory2();
  _showStory2Victory(ch);
}

function _completeStory2() {
  _story2.storyComplete = true;
  localStorage.setItem('smc_storyOnline', '1');
  // Show Story Online mode card
  const soCard = document.getElementById('modeStoryOnline');
  if (soCard) soCard.style.display = '';
  _saveStory2();
}

function _showStory2Victory(ch) {
  const overlay = document.getElementById('storyVictoryOverlay');
  if (!overlay) { openStoryMenu(); return; }

  const titleEl   = document.getElementById('storyVictoryChTitle');
  const postEl    = document.getElementById('storyVictoryPostText');
  const rewardEl  = document.getElementById('storyVictoryRewards');
  const nextBtn   = document.getElementById('storyVictoryNextBtn');

  if (titleEl) titleEl.textContent = ch.title;
  if (postEl)  postEl.textContent  = ch.postText || 'Victory!';

  if (rewardEl) {
    let html = `<div style="color:#ffd700;font-size:0.80rem;margin-bottom:5px;">Rewards earned:</div>`;
    html += `<div style="color:#ffee99;font-size:0.76rem;">🪙 +${ch.tokenReward} tokens (total: ${_story2.tokens})</div>`;
    if (ch.blueprintDrop && STORY_ABILITIES2[ch.blueprintDrop]) {
      html += `<div style="color:#88ccff;font-size:0.76rem;margin-top:3px;">📋 Blueprint: ${STORY_ABILITIES2[ch.blueprintDrop].name}</div>`;
    }
    if (ch.armor && ch.armor.length > 0) {
      const _piece = ch.armor[Math.floor(Math.random() * ch.armor.length)];
      const _pieceNames = { helmet: 'Helmet', chestplate: 'Chestplate', leggings: 'Leggings' };
      html += `<div style="color:#9ab8e8;font-size:0.76rem;margin-top:3px;">🛡️ Armor Blueprint: ${_pieceNames[_piece] || _piece}</div>`;
    }
    if (ch.isEpilogue || _story2.storyComplete) {
      html += `<div style="color:#ffaaff;font-size:0.76rem;margin-top:5px;font-style:italic;">🌐⚔️ Story Online mode unlocked!</div>`;
    }
    if (ch.isSovereignFight && localStorage.getItem('smc_sovereignBeaten')) {
      html += `<div style="color:#cc44ff;font-size:0.82rem;margin-top:8px;font-weight:800;letter-spacing:1px;text-shadow:0 0 10px #cc44ff;">⚡ NEURAL AI MODES UNLOCKED</div>`;
      html += `<div style="color:#aa88dd;font-size:0.72rem;margin-top:2px;font-style:italic;">Challenge SOVEREIGN &amp; SOVEREIGN Ω from the main menu.</div>`;
    }
    rewardEl.innerHTML = html;
  }

  const nextCh = STORY_CHAPTERS2[ch.id + 1];
  if (nextBtn) {
    if (ch.id === 0) {
      // First chapter beaten — offer "Continue to Game" to unlock the main menu
      nextBtn.style.display = '';
      nextBtn.textContent = '🎮 Continue to Game';
      nextBtn.style.cssText = 'padding:12px 28px;font-size:1rem;font-weight:800;letter-spacing:1px;background:linear-gradient(135deg,#1a5acc,#2277ee);border:none;border-radius:10px;color:#fff;cursor:pointer;box-shadow:0 4px 20px rgba(50,120,255,0.5);width:100%;margin-top:8px;';
      nextBtn.onclick = () => {
        const overlay = document.getElementById('storyVictoryOverlay');
        if (overlay) overlay.style.display = 'none';
        _activeStory2Chapter = null;
        storyModeActive = false;
        if (typeof backToMenu === 'function') backToMenu();
        _updateStoryCloseBtn();
      };
    } else if (nextCh && !ch.isEpilogue) {
      nextBtn.style.display = '';
      nextBtn.textContent = '▶ Continue: ' + nextCh.title;
      nextBtn.style.cssText = 'padding:12px 28px;font-size:1rem;font-weight:800;letter-spacing:1px;background:linear-gradient(135deg,#1a8a44,#22bb66);border:none;border-radius:10px;color:#fff;cursor:pointer;box-shadow:0 4px 20px rgba(0,200,80,0.5);width:100%;margin-top:8px;';
      nextBtn.onclick = () => storyVictoryNextChapter();
    } else {
      nextBtn.style.display = 'none';
    }
  }

  // Hide the regular game-over overlay so victory takes full focus
  const goOverlay = document.getElementById('gameOverOverlay');
  if (goOverlay) goOverlay.style.display = 'none';

  overlay.style.display = 'flex';
}

function storyVictoryNextChapter() {
  const overlay = document.getElementById('storyVictoryOverlay');
  const ch = _activeStory2Chapter;
  if (overlay) overlay.style.display = 'none';
  if (ch) {
    const nextCh = STORY_CHAPTERS2[ch.id + 1];
    if (nextCh) {
      _activeStory2Chapter = null;

      // Detect arc boundary — show multiverse travel cinematic when entering a new arc
      const curArc  = _getArcForChapter(ch.id);
      const nextArc = _getArcForChapter(nextCh.id);
      const crossingArc = nextArc && curArc && nextArc.id !== curArc.id;

      function _doLaunch() {
        _beginChapter2(nextCh.id);
        const m = document.getElementById('storyModal');
        if (m) m.style.display = 'flex';
        _renderChapterList();
        _story2TokenDisplay();
      }

      if (crossingArc && typeof startMultiverseTravelCinematic === 'function') {
        // Find act color for the next arc
        let arcColor = '#8844ff';
        for (const act of STORY_ACT_STRUCTURE) {
          if (act.arcs.some(a => a.id === nextArc.id)) { arcColor = act.color; break; }
        }
        startMultiverseTravelCinematic(nextArc.label, arcColor, _doLaunch);
      } else {
        _doLaunch();
      }
      return;
    }
  }
  storyVictoryBackToMenu();
}

function storyVictoryBackToMenu() {
  const overlay = document.getElementById('storyVictoryOverlay');
  if (overlay) overlay.style.display = 'none';
  _activeStory2Chapter = null;
  storyModeActive = false;
  storyGauntletState = null;
  storyPendingPhaseConfig = null;
  storyPhaseIndicator = null;
  storyEnemyArmor = []; storyTwoEnemies = false; storySecondEnemyDef = null;
  storyBossType = null;
  if (typeof backToMenu === 'function') backToMenu();
  setTimeout(openStoryMenu, 300);
}

// ── Init: show Story Online card if already complete ─────────────────────────
(function _story2Init() {
  if (_story2.storyComplete || localStorage.getItem('smc_storyOnline')) {
    const soCard = document.getElementById('modeStoryOnline');
    if (soCard) soCard.style.display = '';
  }
  // Restore hidden power level from completed chapter count so returning
  // players don't lose their accumulated scaling on page reload.
  if (typeof playerPowerLevel !== 'undefined' && Array.isArray(_story2.defeated)) {
    playerPowerLevel = Math.min(3.0, 1.0 + _story2.defeated.length * 0.02);
  }
})();


// ╔══════════════════════════════════════════════════════════════════╗
// ║  STORY EVENT SYSTEM — event-driven character progression        ║
// ║  triggerEvent(name, data) → registered handlers + built-ins     ║
// ╚══════════════════════════════════════════════════════════════════╝

// ── storyState: single source of truth for story progression ─────────────────
const storyState = {
  // Live chapter index (mirrors _story2.chapter so UI stays consistent)
  get chapter() { return _story2 ? _story2.chapter : 0; },

  // Which abilities the player has earned through story events
  // (These also gate the _storyPlayerOverride flags applied at fight start)
  abilities: {
    sword:       true,   // player always has a sword
    doubleJump:  false,
    weaponAbility: false,
    superMeter:  false,
    dodge:       false,
  },

  // Persistent flags written to localStorage so they survive reload
  flags: {},
};

// Restore ability state from saved chapter progress on load
(function _restoreStoryStateAbilities() {
  const id = storyState.chapter;
  storyState.abilities.doubleJump    = id >= 1;
  storyState.abilities.weaponAbility = id >= 3;
  storyState.abilities.superMeter    = id >= 5;
  storyState.abilities.dodge         = id >= 9 || !!localStorage.getItem('smc_storyDodgeUnlocked');
  storyDodgeUnlocked                 = storyState.abilities.dodge;
})();

// ── Event bus ─────────────────────────────────────────────────────────────────
const _storyEventHandlers = {};   // { [eventName]: [fn, ...] }

/**
 * Register a listener for a named story event.
 * @param {string} name  — event key, e.g. 'FIRST_KILL'
 * @param {function} fn  — handler(data)
 */
function onStoryEvent(name, fn) {
  if (!_storyEventHandlers[name]) _storyEventHandlers[name] = [];
  _storyEventHandlers[name].push(fn);
}

/**
 * Fire a story event.  Calls registered listeners then runs built-in logic.
 * Only fires once per fight (guarded by storyEventFired) unless force=true.
 * @param {string} name
 * @param {*}      [data]
 * @param {boolean} [force]  skip dedup guard
 */
function triggerEvent(name, data, force) {
  if (!storyModeActive) return;
  if (!force && storyEventFired[name]) return;
  storyEventFired[name] = true;

  // Notify external listeners first
  const handlers = _storyEventHandlers[name] || [];
  handlers.forEach(fn => { try { fn(data); } catch(e) { console.warn('[StoryEvent]', name, e); } });

  // Built-in narrative/cinematic responses
  _handleBuiltinEvent(name, data);
}

// ── Built-in event responses ──────────────────────────────────────────────────
function _handleBuiltinEvent(name, data) {
  switch (name) {

    // ── Player kills their first enemy ───────────────────────────────────────
    case 'FIRST_KILL': {
      // Only show the double-jump unlock ceremony if it hasn't been granted yet
      if (!storyState.abilities.doubleJump && storyState.chapter >= 2) {
        storyState.abilities.doubleJump = true;
        _showMidFightUnlock({
          icon: '⬆',
          name: 'Double Jump',
          desc: 'Your body adapted.\nPress W again in the air.',
          color: '#44ffaa',
        });
        // Apply immediately to current player
        const p1 = players && players[0];
        if (p1) p1._storyNoDoubleJump = false;
      }
      break;
    }

    // ── Player's health drops to 20% or below ────────────────────────────────
    case 'SURVIVAL_EVENT': {
      // Ch 9+ → unlock dodge if not yet unlocked
      if (!storyState.abilities.dodge && storyState.chapter >= 9) {
        storyState.abilities.dodge = true;
        storyDodgeUnlocked = true;
        localStorage.setItem('smc_storyDodgeUnlocked', '1');
        _showMidFightUnlock({
          icon: '💨',
          name: 'Dodge Roll',
          desc: 'Pure instinct.\nDouble-tap ← or → to dodge through attacks.',
          color: '#00ddff',
        });
        const p1 = players && players[0];
        if (p1) p1._storyNoDodge = false;
      }
      // Also flash the screen red briefly to signal danger
      if (typeof hitStopFrames !== 'undefined') hitStopFrames = Math.max(hitStopFrames, 2);
      break;
    }

    // ── Weapon ability unlocked (ch 4 first kill with ability available) ─────
    case 'ABILITY_UNLOCK': {
      if (!storyState.abilities.weaponAbility) {
        storyState.abilities.weaponAbility = true;
        _showMidFightUnlock({
          icon: '⚡',
          name: 'Weapon Ability',
          desc: 'You found the rhythm.\nPress Q to activate.',
          color: '#ffee55',
        });
        const p1 = players && players[0];
        if (p1) p1._storyNoAbility = false;
      }
      break;
    }

    // ── Super meter unlocked ──────────────────────────────────────────────────
    case 'SUPER_UNLOCK': {
      if (!storyState.abilities.superMeter) {
        storyState.abilities.superMeter = true;
        _showMidFightUnlock({
          icon: '✦',
          name: 'Super Meter',
          desc: 'Power you didn\'t know you had.\nPress E when the meter is full.',
          color: '#ff88ff',
        });
        const p1 = players && players[0];
        if (p1) p1._storyNoSuper = false;
      }
      // Camera + slow-mo for dramatic effect
      if (typeof setCameraDrama === 'function' && players[0]) {
        setCameraDrama('focus', 110, players[0], 1.22);
      }
      if (typeof slowMotionFor === 'function') slowMotionFor(0.38, 850);
      // Give the player breathing room — force enemy to hesitate
      const _surv_p2 = players && players[1];
      if (_surv_p2 && _surv_p2.isAI) _surv_p2.aiReact = (_surv_p2.aiReact || 0) + 85;
      break;
    }

    // ── Reality starts breaking (ch 7+) ──────────────────────────────────────
    case 'REALITY_BREAK': {
      // Ramp up the visual distortion level (drawn in smc-drawing.js)
      const targetDistort = Math.min(1.0, 0.25 + (storyState.chapter - 7) * 0.08);
      storyDistortLevel = Math.max(storyDistortLevel, targetDistort);
      // Short screen shake
      if (typeof screenShakeIntensity !== 'undefined') screenShakeIntensity = Math.max(screenShakeIntensity || 0, 6);
      // Schedule a director sequence for the full reality-break moment
      if (typeof directorSchedule === 'function') {
        directorSchedule([
          {
            id: 'rb_freeze', delay: 0,
            condition: () => gameRunning,
            action: () => {
              if (typeof hitStopFrames !== 'undefined') hitStopFrames = Math.max(hitStopFrames, 10);
              if (typeof screenShakeIntensity !== 'undefined') screenShakeIntensity = Math.max(screenShakeIntensity || 0, 7);
            }
          },
          {
            id: 'rb_subtitle', delay: 30,
            condition: () => gameRunning,
            action: () => {
              storyFightSubtitle = {
                text: 'The world rejects you. Fight back.',
                timer: 230, maxTimer: 230, color: '#cc44ff'
              };
            }
          },
          {
            id: 'rb_distort', delay: 60,
            condition: () => gameRunning,
            action: () => {
              const _base = storyDistortLevel;
              storyDistortLevel = Math.min(1.0, _base + 0.30);
              setTimeout(() => { if (storyModeActive) storyDistortLevel = _base; }, 2800);
            }
          },
          {
            id: 'rb_enemy_buff', delay: 90,
            condition: () => gameRunning && players && players[1],
            action: () => {
              if (players[1]) players[1]._speedBuff = Math.max(players[1]._speedBuff || 0, 180);
            }
          }
        ]);
      }
      break;
    }

    // ── Boss discovered through story ─────────────────────────────────────────
    case 'BOSS_INTRO': {
      _showBossCinematicIntro(data && data.bossRef);
      break;
    }

    // ── Boss defeated → unlock boss mode in menu ──────────────────────────────
    case 'BOSS_DEFEATED': {
      bossBeaten = true;
      localStorage.setItem('smc_bossBeaten', '1');
      const bossCard = document.getElementById('modeBoss');
      if (bossCard) bossCard.style.display = '';
      break;
    }

    // ── True Form unlocked after boss beat + all letters ──────────────────────
    case 'TRUE_FORM_UNLOCK': {
      unlockedTrueBoss = true;
      localStorage.setItem('smc_trueform', '1');
      const tfCard = document.getElementById('modeTrueForm');
      if (tfCard) tfCard.style.display = '';
      _showMidFightUnlock({
        icon: '👁',
        name: 'True Form Unlocked',
        desc: 'Something beyond the Creator.\nFind the letters hidden in the arenas.',
        color: '#cc88ff',
      });
      break;
    }
  }
}

// ── freezeGame: halt physics for a brief cinematic moment ─────────────────────
/**
 * Freeze game physics (not rendering) for `frames` game frames.
 * smc-loop.js checks storyFreezeTimer > 0 and skips physics when set.
 */
function freezeGame(frames) {
  storyFreezeTimer = Math.max(storyFreezeTimer, frames || 30);
}

// ── slowMotionFor: set slowMotion then restore after ms ───────────────────────
function slowMotionFor(factor, ms) {
  slowMotion = factor;
  setTimeout(() => { if (slowMotion < 0.9) slowMotion = 1.0; }, ms);
}

// ── Mid-fight ability unlock overlay ─────────────────────────────────────────
/**
 * Shows a small non-blocking HUD banner mid-fight.
 * @param {{ icon, name, desc, color }} opts
 */
function _showMidFightUnlock(opts) {
  // Freeze for a beat so the player can read it
  freezeGame(55);

  // Build overlay element
  let banner = document.getElementById('storyMidUnlockBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'storyMidUnlockBanner';
    banner.style.cssText = [
      'position:fixed', 'top:50%', 'left:50%',
      'transform:translate(-50%,-50%) scale(0.85)',
      'z-index:7000',
      'background:rgba(5,5,20,0.94)',
      'border-radius:14px',
      'padding:22px 36px',
      'text-align:center',
      'font-family:"Segoe UI",Arial,sans-serif',
      'pointer-events:none',
      'opacity:0',
      'transition:opacity 0.25s ease, transform 0.25s ease',
      'box-shadow:0 0 60px rgba(0,0,0,0.8)',
    ].join(';');
    document.body.appendChild(banner);
  }

  const col = opts.color || '#88ffcc';
  banner.innerHTML = `
    <div style="font-size:2.6rem;line-height:1;margin-bottom:8px;">${opts.icon}</div>
    <div style="font-size:0.65rem;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-bottom:4px;">UNLOCKED</div>
    <div style="font-size:1.2rem;font-weight:800;color:${col};letter-spacing:1px;margin-bottom:8px;">${opts.name}</div>
    <div style="font-size:0.78rem;color:rgba(200,210,255,0.75);line-height:1.5;white-space:pre-line;">${opts.desc}</div>
    <div style="margin-top:14px;width:100%;height:1px;background:linear-gradient(90deg,transparent,${col},transparent);opacity:0.4;"></div>`;
  banner.style.borderTop    = `2px solid ${col}`;
  banner.style.borderBottom = `1px solid rgba(${_hexToRgb(col)},0.25)`;

  // Animate in
  requestAnimationFrame(() => requestAnimationFrame(() => {
    banner.style.opacity   = '1';
    banner.style.transform = 'translate(-50%,-50%) scale(1)';
  }));

  // Auto-dismiss after 2.2 s
  clearTimeout(banner._hideTimer);
  banner._hideTimer = setTimeout(() => {
    banner.style.opacity   = '0';
    banner.style.transform = 'translate(-50%,-50%) scale(0.9)';
  }, 2200);
}

function _hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3)||'88', 16);
  const g = parseInt(hex.slice(3,5)||'cc', 16);
  const b = parseInt(hex.slice(5,7)||'ff', 16);
  return `${r},${g},${b}`;
}

// ── Boss cinematic intro ──────────────────────────────────────────────────────
/**
 * Called by triggerEvent('BOSS_INTRO') before the boss fight starts.
 * Shows a 3-beat fullscreen overlay with typewriter lines.
 */
function _showBossCinematicIntro(_bossRef) {
  const lines = [
    { text: 'The fracture system was not an accident.',              delay: 0,    color: '#dde4ff' },
    { text: 'Someone built it.',                                     delay: 1100, color: '#aaccff' },
    { text: 'Fragment bearers. Rift entities. Architects.',          delay: 2000, color: '#aaccff' },
    { text: 'All of it — a farm.',                                   delay: 3000, color: '#cc88ff' },
    { text: '"You were never meant to succeed."',                    delay: 4100, color: '#ff8866', italic: true },
    { text: '"You were meant to fuel the system."',                  delay: 5000, color: '#ff6644', italic: true },
    { text: '...',                                                   delay: 6100, color: '#445566' },
    { text: 'Face the Creator.',                                     delay: 6800, color: '#ffaaff' },
  ];

  let ov = document.getElementById('bossCinematicIntro');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'bossCinematicIntro';
    ov.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9000',
      'background:#000',
      'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'font-family:"Segoe UI",Arial,sans-serif',
      'opacity:0', 'transition:opacity 0.5s',
    ].join(';');
    document.body.appendChild(ov);
  }

  const linesEl = document.createElement('div');
  linesEl.style.cssText = 'text-align:center;max-width:600px;padding:0 32px;';
  ov.innerHTML = '';
  ov.appendChild(linesEl);

  // Red pulse glow behind text
  const glow = document.createElement('div');
  glow.style.cssText = [
    'position:absolute', 'inset:0', 'z-index:-1',
    'background:radial-gradient(ellipse at center, rgba(180,0,30,0.18) 0%, transparent 70%)',
    'animation:bossCinGlow 2s ease-in-out infinite alternate',
  ].join(';');
  ov.appendChild(glow);

  ov.style.display = 'flex';
  requestAnimationFrame(() => { ov.style.opacity = '1'; });

  // Inject keyframe if not already present
  if (!document.getElementById('bossCinKeyframes')) {
    const style = document.createElement('style');
    style.id = 'bossCinKeyframes';
    style.textContent = `@keyframes bossCinGlow { from { opacity: 0.4; } to { opacity: 1; } }`;
    document.head.appendChild(style);
  }

  // Reveal lines on schedule
  lines.forEach(line => {
    setTimeout(() => {
      const p = document.createElement('p');
      p.style.cssText = [
        'margin:0 0 16px',
        'font-size:' + (line.text === '...' ? '1.8rem' : '1.1rem'),
        `color:${line.color}`,
        line.italic ? 'font-style:italic' : '',
        'opacity:0', 'transition:opacity 1.0s ease',
        line.text === '...' ? 'letter-spacing:10px' : 'letter-spacing:0.5px',
      ].filter(Boolean).join(';');
      p.textContent = line.text;
      linesEl.appendChild(p);
      requestAnimationFrame(() => requestAnimationFrame(() => { p.style.opacity = '1'; }));
    }, line.delay);
  });

  // Dismiss after all lines + pause
  const totalMs = lines[lines.length - 1].delay + 2200;
  setTimeout(() => {
    ov.style.opacity = '0';
    setTimeout(() => { ov.style.display = 'none'; }, 520);
  }, totalMs);
}

// ── storyCheckEvents: called each game frame from smc-loop.js ─────────────────
/**
 * Polls per-frame game state and fires events when thresholds are crossed.
 * Call this from the main game loop AFTER physics/combat update.
 */
function storyCheckEvents() {
  if (!storyModeActive || !gameRunning) return;

  const ch  = _activeStory2Chapter;
  const chId = ch ? ch.id : (storyState.chapter - 1);
  const p1  = players && players[0];
  if (!p1) return;

  // ── SURVIVAL_EVENT: player health drops below 20% ────────────────────────
  if (p1.health > 0 && p1.health / p1.maxHealth < 0.20) {
    triggerEvent('SURVIVAL_EVENT', { player: p1 });
  }

  // ── REALITY_BREAK: chapters 8+ (fracture network) trigger ambient distortion
  if (chId >= 8 && !storyEventFired['REALITY_BREAK']) {
    triggerEvent('REALITY_BREAK', { chapterId: chId });
  }

  // ── FIRST_KILL: track whether an enemy just died to p1 ───────────────────
  // (This is called separately by checkDeaths() via storyOnEnemyDeath)
  // Handled in storyOnEnemyDeath below.

  // ── ABILITY_UNLOCK: chapter 3 (Ground Zero), once the player uses Q ────────
  if (chId >= 3 && !storyEventFired['ABILITY_UNLOCK'] && !storyState.abilities.weaponAbility) {
    if (p1.abilityCooldown > 0) {  // ability was just used (cooldown just started)
      triggerEvent('ABILITY_UNLOCK', { player: p1 });
    }
  }

  // ── SUPER_UNLOCK: chapter 5 (Lava Crossing), when super meter first fires ─
  if (chId >= 5 && !storyEventFired['SUPER_UNLOCK'] && !storyState.abilities.superMeter) {
    if (p1.superMeter >= (p1.maxSuperMeter || 100)) {
      triggerEvent('SUPER_UNLOCK', { player: p1 });
    }
  }

  // ── Fallen warrior memory: rare ambient scene in late-game chapters ─────────
  // Fires once per fight (10% chance) when past chapter 60 to build TrueForm tension.
  if (chId >= 60 && !storyEventFired['FALLEN_WARRIOR'] && frameCount === 180) {
    if (Math.random() < 0.10) triggerScene('fallen_warrior_memory');
  }

  // ── Tick storyFreezeTimer ─────────────────────────────────────────────────
  if (storyFreezeTimer > 0) storyFreezeTimer--;

  // ── Per-frame ability processing ─────────────────────────────────────────
  if (typeof storyTickAbilities === 'function') storyTickAbilities();
}

/**
 * Called from checkDeaths() (smc-drawing.js) when an AI enemy dies.
 * Fires FIRST_KILL event and handles per-event unlock logic.
 */
function storyOnEnemyDeath(victim, killer) {
  if (!storyModeActive) return;
  // Only fire on p1 kills
  if (killer !== (players && players[0])) return;
  triggerEvent('FIRST_KILL', { victim, killer });
}

// ── syncStoryDistortLevel: call after chapter advances ───────────────────────
function syncStoryDistortLevel() {
  const id = storyState.chapter;
  // Ch 0-7  : no distortion (home city, normal world)
  // Ch 8-12 : fracture network — mild to moderate distortion
  // Ch 13-22: multiversal core + architects — moderate to heavy
  // Ch 23+  : unraveling / final — maximum distortion
  if (id < 8) {
    storyDistortLevel = 0;
  } else if (id < 13) {
    storyDistortLevel = (id - 8) / 5 * 0.45;   // 0 → 0.45 across ch 8-13
  } else if (id < 23) {
    storyDistortLevel = 0.45 + (id - 13) / 10 * 0.40; // 0.45 → 0.85 across ch 13-23
  } else {
    storyDistortLevel = 0.85 + Math.min((id - 23) / 5, 1) * 0.15; // 0.85 → 1.0
  }
}

// ── Per-fight state reset ──────────────────────────────────────────────────────
// Call when a story fight starts (in _launchChapter2Fight) to clear per-fight flags
function resetStoryEventState() {
  storyEventFired  = {};
  storyFreezeTimer = 0;
  _fallenWarrior   = null;
  syncStoryDistortLevel();
  // Sync ability locks from current chapter
  const id = storyState.chapter;
  storyState.abilities.doubleJump    = id >= 1  || storyState.abilities.doubleJump;
  storyState.abilities.weaponAbility = id >= 3  || storyState.abilities.weaponAbility;
  storyState.abilities.superMeter    = id >= 5  || storyState.abilities.superMeter;
  storyState.abilities.dodge         = id >= 9  || storyDodgeUnlocked;
}

// ── Story soft boundary / portal system ───────────────────────────────────────
// Called every frame from gameLoop when storyModeActive.
// If a player has crossed the soft boundary, teleport them back to the nearest
// safe platform with a flash effect so it feels like a "reality enforcement" system.
function storyUpdateBoundaries() {
  if (!storyModeActive || !gameRunning || !currentArena || gameMode === 'exploration') return;
  // portalEdge: center portal (decorative in drawing, functional here) — teleport to far side of map
  if (currentArenaKey === 'portalEdge') {
    const cpx = GAME_W / 2, cpy = 260;
    for (const p of players) {
      if (!p || p.isBoss || p.health <= 0 || p._centerPortalCd > 0) continue;
      if (Math.abs(p.cx() - cpx) < 70 && Math.abs(p.cy() - cpy) < 130) {
        // Teleport to a safe platform away from center, on the opposite half of the world
        const halfW = (currentArena.mapRight || GAME_W) / 2;
        const pls = (currentArena.platforms || []).filter(pl =>
          !pl.isFloorDisabled && !pl.isFloor && pl.w > 40 &&
          (p.cx() < cpx ? pl.x + pl.w / 2 > halfW : pl.x + pl.w / 2 < halfW)
        );
        let dest = pls.length ? pls[Math.floor(Math.random() * pls.length)] : null;
        if (dest) {
          p.x = dest.x + dest.w / 2 - p.w / 2;
          p.y = dest.y - p.h - 2;
        } else {
          p.x = p.cx() < cpx ? cpx + 200 : cpx - 200;
          p.y = 350;
        }
        p.vx = 0; p.vy = 0;
        p._centerPortalCd = 90; // 1.5s cooldown to prevent re-trigger
        p.hurtTimer = Math.max(p.hurtTimer || 0, 30);
        if (settings.particles) {
          spawnParticles(p.cx(), p.cy(), '#aa44ff', 18);
          spawnParticles(p.cx(), p.cy(), '#ffffff', 8);
        }
        if (settings.screenShake) screenShake = Math.max(screenShake, 5);
      }
      if (p._centerPortalCd > 0) p._centerPortalCd--;
    }
  }
  for (const p of players) {
    if (!p || p.isBoss || p.health <= 0) continue;
    const breachedH = p._storyBoundaryBreached; // 'left' | 'right' | null
    const breachedV = p._storyBottomBreached;   // true | false
    if (!breachedH && !breachedV) continue;
    // Find the safest landing platform (not floor-disabled, not lava)
    const pls = currentArena.platforms
      ? currentArena.platforms.filter(pl => !pl.isFloorDisabled && pl.w > 40)
      : [];
    // For worldWidth arenas, pick platforms near the current camera view
    const viewCX = (typeof camX === 'number' ? camX : 0) + GAME_W / 2;
    const viewHalf = GAME_W * 0.8;
    const nearby = pls.filter(pl => !pl.isFloor && Math.abs(pl.x + pl.w / 2 - viewCX) < viewHalf);
    const usable = nearby.length ? nearby : pls.filter(pl => !pl.isFloor);
    // Prefer platforms with overhead clearance (no platform within 100px above)
    const clear = usable.filter(pl => {
      const spawnX = pl.x + pl.w / 2;
      return !pls.some(o => o !== pl && !o.isFloor &&
        o.y + o.h > pl.y - 100 && o.y + o.h < pl.y && o.x < spawnX + 20 && o.x + o.w > spawnX - 20);
    });
    const pool = clear.length ? clear : (usable.length ? usable : pls);
    // Pick closest to camera center
    let best = null;
    let bestScore = Infinity;
    for (const pl of pool) {
      const cx = pl.x + pl.w / 2;
      const score = Math.abs(cx - viewCX) + (pl.isFloor ? 400 : 0);
      if (score < bestScore) { bestScore = score; best = pl; }
    }
    const safePos = typeof pickSafeSpawnNear === 'function'
      ? pickSafeSpawnNear(viewCX, breachedH === 'right' ? 'left' : breachedH === 'left' ? 'right' : 'any')
      : null;
    if (safePos) {
      p.x  = safePos.x - p.w / 2;
      p.y  = safePos.y - p.h;
    } else if (!best) {
      p.x  = viewCX - p.w / 2;
      p.y  = 200;
    } else {
      p.x  = best.x + best.w / 2 - p.w / 2;
      p.y  = best.y - p.h - 2;
    }
    p.vx = 0;
    p.vy = 0;
    p._storyBoundaryBreached = null;
    p._storyBottomBreached   = false;
    // Brief invincibility so the teleport can't be used to dodge attacks
    p.hurtTimer = Math.max(p.hurtTimer || 0, 25);
    // Flash burst
    if (settings.particles) {
      spawnParticles(p.cx(), p.cy(), '#aa44ff', 18);
      spawnParticles(p.cx(), p.cy(), '#ffffff', 8);
    }
    if (settings.screenShake) screenShake = Math.max(screenShake, 5);
  }
}

// ── Wire resetStoryEventState into _launchChapter2Fight ────────────────────────
// Monkey-patch: wrap the existing function so resetStoryEventState() is always called
(function _patchLaunchChapter2Fight() {
  // _launchChapter2Fight is defined earlier in this same file, so we can
  // reference it after the file finishes loading. We do it lazily via a
  // wrapper on the global that smc-menu.js actually calls: startGame().
  // Instead, we add a hook point here that _launchChapter2Fight can call.
  // The actual patch is below, applied after the function reference is stable.
})();

// Patch called from storyModeActive guard inside _startGameCore (smc-menu.js):
// We expose a hook: before startGame(), call _onStoryFightStart() when in story mode.
function _onStoryFightStart() {
  resetStoryEventState();
  // Apply purchased story abilities to p1 once players[] is populated
  setTimeout(() => {
    const p1 = players && players[0];
    if (p1 && !p1.isAI) {
      p1._story2BaseDmg = p1.dmgMult || 1;
      const meta = _story2.metaUpgrades || { damage: 0, survivability: 0, healUses: 0 };
      p1.maxHealth += meta.survivability * 10;
      p1.health = Math.min(p1.maxHealth, Math.max(1, Math.round(p1.maxHealth * _storyGetCarryHealthPct())));
      p1.dmgMult = (p1.dmgMult || 1) * (1 + meta.damage * 0.08);
      p1.damageReductionMult = Math.max(0.70, (p1.damageReductionMult || 1) - meta.survivability * 0.025);
      _applyStory2Abilities(p1);
      // Multiverse worlds: apply accumulated dimensional bonuses to the player
      if (typeof MultiverseScalingSystem !== 'undefined' && typeof MultiverseManager !== 'undefined') {
        MultiverseScalingSystem.applyToFighter(p1, MultiverseManager.getSave());
      }
    }
    for (const enemy of players.filter(p => p && p !== p1 && (p.isAI || p.isBoss))) {
      _storyScaleEnemyUnit(enemy, _activeStory2Chapter ? _activeStory2Chapter.id : 1, {
        elite: !!(storyPendingPhaseConfig && (storyPendingPhaseConfig.type === 'elite_wave' || storyPendingPhaseConfig.type === 'mini_boss'))
      });
      // Multiverse world fights: apply world modifier to enemies
      if (_activeStory2Chapter && _activeStory2Chapter.isMultiverseWorld && typeof MultiverseScalingSystem !== 'undefined') {
        const worldsCleared = typeof MultiverseManager !== 'undefined' ? MultiverseManager.getCompletedCount() : 0;
        MultiverseScalingSystem.applyWorldModifierToEnemy(enemy, _activeStory2Chapter.multiverseWorldId, worldsCleared);
      }
    }
    // Activate the multiverse world state so modifiers tick and Fallen God dialogue fires
    if (_activeStory2Chapter && _activeStory2Chapter.isMultiverseWorld && typeof MultiverseManager !== 'undefined') {
      MultiverseManager.enterWorld(_activeStory2Chapter.multiverseWorldId);
    } else if (typeof MultiverseManager !== 'undefined' && MultiverseManager.isActive()) {
      MultiverseManager.deactivate();
    }
  }, 80);
}

// ── World distortion drawing helper ─────────────────────────────────────────
// Called from smc-drawing.js each frame after the world is drawn, before HUD.
// Draws scanline glitches and reality-tear effects based on storyDistortLevel.
function drawStoryWorldDistortion(ctx, cw, ch_h) {
  const lvl = storyDistortLevel;
  if (lvl <= 0) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // screen space

  const t = frameCount * 0.04;

  // ── Scanline bands (mild at low levels, heavy at high) ───────────────────
  const bandCount = Math.floor(lvl * 8);
  for (let i = 0; i < bandCount; i++) {
    const yFrac = (Math.sin(t * 0.7 + i * 2.3) * 0.5 + 0.5);
    const y     = yFrac * ch_h;
    const bh    = 2 + lvl * 4;
    const alpha = lvl * 0.25 * (0.5 + 0.5 * Math.sin(t + i));
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#cc55ff';
    ctx.fillRect(0, y, cw, bh);
    // Horizontal glitch offset for this band
    if (lvl > 0.3 && Math.random() < 0.04) {
      ctx.globalAlpha = alpha * 0.5;
      const sliceH = 3 + Math.random() * 8;
      const offset = (Math.random() - 0.5) * 18 * lvl;
      ctx.drawImage(ctx.canvas, 0, y, cw, sliceH, offset, y, cw, sliceH);
    }
  }

  // ── Reality tears (vertical purple cracks, ch 11+) ───────────────────────
  if (lvl > 0.4) {
    const tearCount = Math.floor((lvl - 0.4) / 0.12);
    ctx.globalAlpha = 0;
    for (let i = 0; i < tearCount; i++) {
      const xFrac = Math.abs(Math.sin(i * 3.7 + t * 0.15));
      const x     = xFrac * cw;
      const alpha = (lvl - 0.4) * 0.7 * (0.5 + 0.5 * Math.sin(t * 0.6 + i));
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#cc44ff';
      ctx.shadowColor = '#cc44ff';
      ctx.shadowBlur  = 12;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      const segments = 5 + Math.floor(Math.random() * 3);
      ctx.moveTo(x, 0);
      for (let s = 1; s <= segments; s++) {
        ctx.lineTo(x + (Math.random() - 0.5) * 14 * lvl, (s / segments) * ch_h);
      }
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // ── Full-screen vignette tint (deep purple at highest levels) ────────────
  if (lvl > 0.65) {
    const vAlpha = (lvl - 0.65) * 0.35;
    const vg = ctx.createRadialGradient(cw/2, ch_h/2, cw*0.1, cw/2, ch_h/2, cw*0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(80,0,120,${vAlpha})`);
    ctx.globalAlpha = 1;
    ctx.fillStyle   = vg;
    ctx.fillRect(0, 0, cw, ch_h);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// ── Dodge roll mechanic (gated by storyDodgeUnlocked) ────────────────────────
// Dodge state is stored on the Fighter instance:
//   p._dodgeTimer     — frames of active i-frames
//   p._dodgeCd        — cooldown frames
//   p._dodgeFacing    — direction of dodge
//   p._dodgePressed   — true during the frame double-tap is detected
//
// processInput() in smc-loop.js will call storyHandleDodgeInput(p, movingLeft, movingRight)
// to check for double-tap and trigger the roll.

const DODGE_FRAMES   = 14;  // i-frame duration
const DODGE_SPEED    = 16;  // lateral velocity burst
const DODGE_CD       = 48;  // cooldown before next dodge

/**
 * Must be called from processInput() for each non-AI player.
 */
function storyHandleDodgeInput(p) {
  if (!storyDodgeUnlocked) return;
  if (p._storyNoDodge) return;
  if (p._dodgeCd > 0) { p._dodgeCd--; return; }
  if (p._dodgeTimer > 0) {
    // Mid-dodge physics: maintain velocity, grant i-frames
    p._dodgeTimer--;
    p.vx = p._dodgeFacing * DODGE_SPEED;
    p.invincible = Math.max(p.invincible || 0, 1); // i-frames
    if (p._dodgeTimer === 0) {
      p._dodgeCd = DODGE_CD;
      p.vx *= 0.3; // hard-brake on exit
    }
    return;
  }

  // Double-tap detection: key tapped twice within 10 frames
  const lKey = p.controls.left;
  const rKey = p.controls.right;
  if (!p._tapState) p._tapState = {};

  const ts = p._tapState;
  const lHeld = keyHeldFrames[lKey] || 0;
  const rHeld = keyHeldFrames[rKey] || 0;

  // Rising-edge detection (frame 1 of hold = new press)
  if (lHeld === 1) {
    ts.lLastTap = frameCount;
  }
  if (rHeld === 1) {
    ts.rLastTap = frameCount;
  }

  // Double-tap = two presses within 12 frames, second press happens now
  if (lHeld === 1 && ts.lLastTap && (frameCount - ts.lLastTap) <= 12 && lHeld < 2) {
    // Need two separate press events — detect by checking prev tap was at least 1 frame ago
    // Simple proxy: if the last tap was this frame, it's the first tap; skip
    // We use a two-slot buffer approach
  }

  // Simplified approach: track tap count in short window
  if (lHeld === 1) {
    if (ts.lTapFrame && (frameCount - ts.lTapFrame) < 13) {
      // Second tap — fire dodge left
      _doDodge(p, -1);
      ts.lTapFrame = 0;
    } else {
      ts.lTapFrame = frameCount;
    }
  }
  if (rHeld === 1) {
    if (ts.rTapFrame && (frameCount - ts.rTapFrame) < 13) {
      // Second tap — fire dodge right
      _doDodge(p, 1);
      ts.rTapFrame = 0;
    } else {
      ts.rTapFrame = frameCount;
    }
  }
}

function _doDodge(p, dir) {
  if (p._dodgeTimer > 0 || (p._dodgeCd || 0) > 0) return;
  p._dodgeTimer   = DODGE_FRAMES;
  p._dodgeFacing  = dir;
  p.vx            = dir * DODGE_SPEED;
  p.invincible    = Math.max(p.invincible || 0, 1);
  spawnParticles(p.cx(), p.cy(), '#88eeff', 8);
  SoundManager && SoundManager.jump && SoundManager.jump(); // reuse jump sound
}



// ============================================================
// EXPLORATION CHAPTER SYSTEM
// ============================================================

function _exploreGenPlatforms(worldLen, seed, ch) {
  // Deterministic seeded pseudo-random (LCG)
  let s = (seed * 1234567 + 89101) | 0;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };

  const plats = [];
  const mode = ch && ch.exploreMode ? ch.exploreMode : 'exploration';

  // ── Solid floor (no gaps — players should never fall into the void) ──────
  plats.push({ x: 0, y: 440, w: worldLen, h: 80, isFloor: true });

  if (mode === 'parkour') {
    for (let wx = 220; wx < worldLen - 420; wx += 170 + Math.floor(rng() * 85)) {
      plats.push({
        x: wx + Math.floor(rng() * 45),
        y: 330 - Math.floor(rng() * 155),
        w: 95 + Math.floor(rng() * 55),
        h: 16,
      });
      if (rng() < 0.55) {
        plats.push({
          x: wx + 65 + Math.floor(rng() * 40),
          y: 210 - Math.floor(rng() * 90),
          w: 72 + Math.floor(rng() * 44),
          h: 14,
        });
      }
    }
  } else {
    const exploreStyle = ch && ch.exploreStyle ? ch.exploreStyle : 'generic';
    const isCity = exploreStyle === 'city';

    if (isCity) {
      // ── City-style: wide rooftop sections at consistent height with gaps ──
      for (let wx = 200; wx < worldLen - 400; wx += 300 + Math.floor(rng() * 180)) {
        const bldW = 220 + Math.floor(rng() * 160);
        const bldY = 370 + Math.floor(rng() * 30);
        plats.push({ x: wx, y: bldY, w: bldW, h: 20 });
        if (rng() < 0.5) {
          plats.push({ x: wx + 40 + Math.floor(rng() * 60), y: bldY - 80, w: 100 + Math.floor(rng() * 60), h: 16 });
        }
      }
    } else {
      // ── Mid-level platforms ─────────────────────────────────────────────────
      for (let wx = 250; wx < worldLen - 500; wx += 240 + Math.floor(rng() * 200)) {
        plats.push({
          x: wx + Math.floor(rng() * 80),
          y: 290 + Math.floor((rng() - 0.5) * 80),
          w: 100 + Math.floor(rng() * 80),
          h: 18,
        });
      }

      // ── High platforms ──────────────────────────────────────────────────────
      for (let wx = 500; wx < worldLen - 700; wx += 380 + Math.floor(rng() * 280)) {
        plats.push({
          x: wx + Math.floor(rng() * 120),
          y: 170 + Math.floor((rng() - 0.5) * 70),
          w: 85 + Math.floor(rng() * 70),
          h: 15,
        });
      }
    }

    if (mode === 'objective') {
      const goalBase = worldLen - 620;
      plats.push({ x: goalBase, y: 320, w: 180, h: 18 });
      plats.push({ x: goalBase + 70, y: 235, w: 140, h: 16 });
      plats.push({ x: goalBase + 200, y: 285, w: 110, h: 16 });
    }
  }

  return plats;
}

function _storyScaleEnemyUnit(unit, chapterId, opts = {}) {
  if (!unit) return unit;
  const elite = !!opts.elite;
  const mult = _storyDifficultyForChapter(chapterId, elite);
  unit.maxHealth = Math.round((unit.maxHealth || unit.health || 100) * mult * (elite ? 1.5 : 1));
  unit.health = unit.maxHealth;
  unit.dmgMult = (unit.dmgMult || 1) * (0.9 + mult * 0.22);
  unit.attackCooldownMult = Math.max(0.58, (unit.attackCooldownMult || 1) * (elite ? 0.72 : 0.86));
  unit.aiReact = elite ? 0 : unit.aiReact;
  unit._storyElite = elite;
  unit._storyPredict = 0.10 + Math.min(0.18, chapterId * 0.0035) + (elite ? 0.12 : 0);
  unit._storyDodgeChance = elite ? 0.14 : 0.05;
  return unit;
}

function _storyPhaseExploreCap(chId) {
  if (chId < 10) return 2;
  if (chId < 22) return 3;
  if (chId < 35) return 4;
  if (chId < 50) return 5;
  return 6;
}

function _storyBuildSidePortal(ch) {
  if (!ch || ch.id < 6 || Math.random() < 0.45) return null;
  const type = ch.id >= 22 && Math.random() < 0.35 ? 'distorted_rift'
    : Math.random() < 0.5 ? 'elite_gauntlet' : 'survival';
  return {
    x: Math.floor((ch.worldLength || 5200) * (0.35 + Math.random() * 0.35)),
    y: 260,
    type,
    reward: type === 'distorted_rift' ? 55 + ch.id * 3 : 32 + ch.id * 2,
    active: true,
    entered: false,
  };
}

function _storyEnterSidePortal(portal, p1, ch) {
  if (!portal || portal.entered || !p1) return;
  portal.entered = true;
  portal.active = false;
  portal.challengeActive = true;
  const isBossRift = portal.type === 'distorted_rift';
  const eliteA = _storyCloneEnemyDef(ch, {
    name: isBossRift ? 'Distorted Veran Echo' : 'Rift Elite',
    weaponKey: isBossRift ? 'spear' : 'axe',
    classKey: isBossRift ? 'warrior' : 'berserker',
    aiDiff: ch.id >= 25 ? 'expert' : 'hard',
    color: isBossRift ? '#8844ff' : '#aa6633',
    isElite: true,
  });
  const eliteB = _storyCloneEnemyDef(eliteA, {
    name: isBossRift ? 'Fracture Warden' : 'Elite Reinforcement',
    weaponKey: 'hammer',
    classKey: 'tank',
    color: '#665577',
    isElite: true,
  });
  storyFightSubtitle = {
    text: isBossRift
      ? 'Distorted Rift opened. Clear the weakened boss echo for a rare reward.'
      : 'Side portal entered. Survive the encounter for bonus coins.',
    timer: 220,
    maxTimer: 220,
    color: isBossRift ? '#ff88ff' : '#88ffcc'
  };
  _exploreSpawnEnemy({ ...eliteA, wx: p1.x + 140, health: isBossRift ? 220 : 150, isElite: true, isSidePortalEnemy: true }, p1);
  if (!isBossRift) _exploreSpawnEnemy({ ...eliteB, wx: p1.x + 220, health: 160, isElite: true, isSidePortalEnemy: true }, p1);
}

function _launchExplorationChapter(ch) {
  const _storyModal = document.getElementById('storyModal');
  if (_storyModal) _storyModal.style.display = 'none';

  // Apply world modifiers for this chapter
  worldId        = getWorldForChapter(ch.id);
  currentWorld   = STORY_WORLDS[worldId] || null;
  worldModifiers = currentWorld ? currentWorld.modifier : null;

  // Apply multiverse arc
  const _arcEx = getStoryArc(ch.id);
  if (_arcEx) storyCurrentArc = _arcEx.id;

  const worldLen = ch.worldLength || 9000;
  const goalX    = ch.objectX    || (worldLen - 350);
  const plats    = _exploreGenPlatforms(worldLen, ch.id, ch);

  // Inject exploration arena into ARENAS under temp key
  const arenaKey = '__explore__';
  ARENAS[arenaKey] = {
    sky:           ch.sky         || ['#0a0a1e', '#1a1a2e'],
    groundColor:   ch.groundColor || '#333344',
    platColor:     ch.platColor   || '#445566',
    worldWidth:    worldLen,
    mapLeft:       GAME_W / 2,
    mapRight:      worldLen - 50, // let player reach the full world including goalX
    deathY:        640,
    isStoryOnly:   true,
    isExploreArena: true,
    exploreStyle:  ch.style || 'city',
    platforms:     plats,
  };
  if (typeof ARENA_BASE_PLATFORMS !== 'undefined') {
    ARENA_BASE_PLATFORMS[arenaKey] = plats.map(p => ({ ...p }));
  }

  // Set exploration globals
  exploreActive    = true;
  exploreWorldLen  = worldLen;
  exploreGoalX     = goalX;
  exploreGoalName  = ch.objectName || 'Exit';
  exploreGoalFound = false;
  exploreCheckpoints = [];
  exploreCheckpointIdx = -1;
  const checkpointCount = ch.worldLength >= 5200 ? 2 : 1;
  for (let i = 1; i <= checkpointCount; i++) {
    exploreCheckpoints.push({ x: Math.floor((worldLen * i) / (checkpointCount + 1)), hit: false });
  }
  // Strip ranged weapons from exploration enemies if this chapter hasn't been beaten yet
  const _expBeaten = Array.isArray(_story2.defeated) && _story2.defeated.includes(ch.id);
  exploreSpawnQ = (ch.spawnEnemies || []).map(e => {
    if (_expBeaten) return e;
    const isRng = typeof WEAPONS !== 'undefined' && WEAPONS[e.weaponKey] && WEAPONS[e.weaponKey].type === 'ranged';
    return isRng ? Object.assign({}, e, { weaponKey: 'sword' }) : e;
  });
  exploreEnemyCap  = _storyPhaseExploreCap(ch.id);
  exploreCombatQuiet = 0;
  exploreAmbushTimer = 0;
  exploreArenaLock = null;
  exploreSidePortals = [];
  const sidePortal = _storyBuildSidePortal(ch);
  if (sidePortal) exploreSidePortals.push(sidePortal);

  // Game config
  selectedArena = arenaKey;
  gameMode      = 'exploration';
  p2IsBot       = false;

  // Ability progression (mirror fight chapter logic)
  const id  = ch._origId !== undefined ? ch._origId : ch.id; // use original id for difficulty scaling
  const _sa = (typeof storyState !== 'undefined') ? storyState.abilities : {};
  const _sk = _story2.skillTree || {};
  storyPlayerOverride = {
    weapon:       null,
    noDoubleJump: !(_sk.doubleJump || !!_sa.doubleJump),
    noAbility:    !(_sk.weaponAbility || !!_sa.weaponAbility),
    noSuper:      !(_sk.superMeter || !!_sa.superMeter),
    noClass:      !_sk.classUnlock,
    noDodge:      !(_sk.dodge || !!_sa.dodge || storyDodgeUnlocked),
    dmgMult:      1.0 + (_sk.heavyHit2 ? 0.25 : _sk.heavyHit1 ? 0.15 : 0),
    speedMult:    1.0 + (_sk.fastMove2 ? 0.20 : _sk.fastMove1 ? 0.10 : 0),
    jumpMult:     1.0 + (_sk.highJump2 ? 0.25 : _sk.highJump1 ? 0.15 : 0),
  };

  // Ability toasts are now shown only when purchased in the skill tree

  storyModeActive     = true;
  storyCurrentLevel   = Math.min(8, Math.floor(id / 5) + 1);
  storyFightScript    = ch.fightScript  || [];
  storyFightScriptIdx = 0;
  storyFightSubtitle  = null;
  if (ch.preText) {
    storyFightSubtitle = { text: ch.preText, timer: 220, maxTimer: 220, color: '#dde8ff' };
  }
  storyEnemyArmor     = [];
  storyTwoEnemies     = false;
  storySecondEnemyDef = null;

  if (typeof selectLives === 'function') selectLives(ch.playerLives || 3);
  infiniteMode = false;

  startGame();
  setTimeout(() => { if (players[0]) _applySkillTreeToPlayer(players[0]); }, 50);
}

// Called each frame from gameLoop when gameMode === 'exploration'
function updateExploration() {
  if (!exploreActive || !players[0] || !gameRunning) return;
  const p1 = players[0];
  const activeEnemyCount = minions.filter(m => m.health > 0).length;
  const inCombat = activeEnemyCount > 0 || !!players.find(p => p !== p1 && p.health > 0 && p.isAI);
  exploreCombatQuiet = inCombat ? 0 : (exploreCombatQuiet + 1);
  exploreAmbushTimer++;
  if (exploreArenaLock) {
    p1.x = clamp(p1.x, exploreArenaLock.left, exploreArenaLock.right - p1.w);
    if (currentArena) {
      currentArena.mapLeft = exploreArenaLock.left;
      currentArena.mapRight = exploreArenaLock.right;
    }
    const lockAlive = minions.some(m => m.health > 0 && m.isArenaLockEnemy);
    if (!lockAlive) {
      if (currentArena) {
        currentArena.mapLeft = exploreArenaLock.prevLeft;
        currentArena.mapRight = exploreArenaLock.prevRight;
      }
      storyFightSubtitle = { text: `${exploreArenaLock.label || 'Arena lock'} cleared. Move.`, timer: 150, maxTimer: 150, color: '#88ffcc' };
      exploreArenaLock = null;
    }
  }

  // Far boundary: player wandered far beyond the world — reset the chapter
  const _farLimit = exploreWorldLen + 2500;
  if (p1.x > _farLimit || p1.x < -1200) {
    p1.x = 60; p1.y = 300; p1.vx = 0; p1.vy = 0;
    storyFightSubtitle = { text: '⚠ You wandered too far — back to the start!', timer: 200, maxTimer: 200, color: '#ff6644' };
    screenShake = 30;
    return;
  }

  // Goal reached?
  if (!exploreArenaLock && !exploreGoalFound && p1.x + p1.w >= exploreGoalX && p1.health > 0) {
    exploreGoalFound = true;
    SoundManager.superActivate();
    spawnParticles(exploreGoalX + 20, 380, '#ffffaa', 40);
    // Show completion subtitle
    storyFightSubtitle = { text: `✨ ${exploreGoalName} found! Moving on...`, timer: 200, maxTimer: 200, color: '#ffffaa' };
    // Complete chapter after a short delay
    setTimeout(() => {
      if (!gameRunning) return;
      endGame();
    }, 2200);
  }

  for (let i = 0; i < exploreCheckpoints.length; i++) {
    const cp = exploreCheckpoints[i];
    if (cp.hit || p1.cx() < cp.x || exploreArenaLock) continue;
    cp.hit = true;
    exploreCheckpointIdx = i;
    const safeSpawn = typeof pickSafeSpawnNear === 'function' ? pickSafeSpawnNear(cp.x, 'any') : null;
    if (safeSpawn) {
      p1.spawnX = safeSpawn.x;
      p1.spawnY = safeSpawn.y;
    }
    storyFightSubtitle = {
      text: `Checkpoint secured ${i + 1}/${exploreCheckpoints.length}`,
      timer: 170,
      maxTimer: 170,
      color: '#7dffcc'
    };
    spawnParticles(cp.x, p1.cy(), '#7dffcc', 14);
    if ((_activeStory2Chapter && _activeStory2Chapter.id >= 8) || (storyGauntletState && storyGauntletState.index > 0)) {
      if (!exploreArenaLock && currentArena) {
        exploreArenaLock = {
          left: Math.max(0, cp.x - 240),
          right: Math.min(exploreWorldLen, cp.x + 320),
          prevLeft: currentArena.mapLeft,
          prevRight: currentArena.mapRight,
          label: 'Checkpoint Arena',
        };
        storyFightSubtitle = { text: 'Arena lock engaged. Clear the wave.', timer: 180, maxTimer: 180, color: '#ffcc66' };
      }
      _exploreSpawnEnemy({ wx: cp.x + 80, name: 'Checkpoint Hunter', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', color: '#886644', isElite: true, health: 150, isArenaLockEnemy: true }, p1);
      if ((_activeStory2Chapter && _activeStory2Chapter.id >= 18) || exploreEnemyCap >= 4) {
        _exploreSpawnEnemy({ wx: cp.x + 150, name: 'Checkpoint Warden', weaponKey: 'hammer', classKey: 'tank', aiDiff: 'hard', color: '#556677', isElite: true, health: 170, isArenaLockEnemy: true }, p1);
      }
    }
  }

  for (const portal of exploreSidePortals) {
    if (!portal.active || portal.entered) continue;
    if (Math.abs(p1.cx() - portal.x) < 34 && Math.abs(p1.cy() - portal.y) < 120) {
      _storyEnterSidePortal(portal, p1, _activeStory2Chapter);
    }
  }
  for (const portal of exploreSidePortals) {
    if (!portal || !portal.challengeActive) continue;
    const livePortalEnemy = minions.some(m => m.health > 0 && m.isSidePortalEnemy);
    if (!livePortalEnemy) {
      portal.challengeActive = false;
      _story2.tokens += portal.reward;
      if (portal.type === 'distorted_rift') {
        if (!_story2.metaUpgrades) _story2.metaUpgrades = { damage: 0, survivability: 0, healUses: 0 };
        _story2.metaUpgrades.damage = Math.min(6, _story2.metaUpgrades.damage + 1);
      }
      _saveStory2();
      storyFightSubtitle = {
        text: portal.type === 'distorted_rift'
          ? `Distorted Rift conquered — +${portal.reward} 🪙 and +1 damage rank.`
          : `Side portal cleared — +${portal.reward} 🪙`,
        timer: 220,
        maxTimer: 220,
        color: portal.type === 'distorted_rift' ? '#ff88ff' : '#88ffcc'
      };
    }
  }

  if (exploreCombatQuiet > 260 && activeEnemyCount < exploreEnemyCap) {
    const spawnAhead = p1.x + GAME_W * 0.92;
    _exploreSpawnEnemy({
      wx: spawnAhead,
      name: 'Pressure Stalker',
      weaponKey: _activeStory2Chapter && _activeStory2Chapter.id >= 18 ? 'spear' : 'sword',
      classKey: _activeStory2Chapter && _activeStory2Chapter.id >= 20 ? 'assassin' : 'warrior',
      aiDiff: _activeStory2Chapter && _activeStory2Chapter.id >= 24 ? 'hard' : 'medium',
      color: '#665544'
    }, p1);
    exploreCombatQuiet = 120;
  }

  if (exploreAmbushTimer > 360 && Math.abs(p1.vx) < 1.1 && !inCombat && activeEnemyCount < exploreEnemyCap) {
    _exploreSpawnEnemy({
      wx: p1.x + 120,
      name: 'Ambush Elite',
      weaponKey: 'axe',
      classKey: 'berserker',
      aiDiff: _activeStory2Chapter && _activeStory2Chapter.id >= 25 ? 'expert' : 'hard',
      color: '#994444',
      isElite: true,
      health: 165
    }, p1);
    exploreAmbushTimer = 0;
    storyFightSubtitle = { text: 'Passive too long. An elite found you.', timer: 170, maxTimer: 170, color: '#ff7766' };
  }

  // Spawn enemies from queue as player advances
  // Guards (isGuard:true) bypass the cap and spawn immediately at world load
  // Regular enemies are capped at exploreEnemyCap concurrent
  const activeRegularCount = minions.filter(m => m.health > 0 && !m.isExploreGuard).length;
  if (exploreSpawnQ.length > 0) {
    const next = exploreSpawnQ[0];
    if (next) {
      const isGuard = !!next.isGuard;
      const readyToSpawn = isGuard
        ? !minions.some(m => m.isExploreGuard && m._guardX === next.wx) // guard not yet spawned
        : (activeRegularCount < exploreEnemyCap && p1.x + GAME_W * 0.8 >= next.wx);
      if (readyToSpawn) {
        exploreSpawnQ.shift();
        _exploreSpawnEnemy(next, p1);
      }
    }
  }
}

function _exploreSpawnEnemy(def, p1) {
  const isGuard = !!def.isGuard;
  // Guards spawn directly at their post (near the relic), not offset from player
  const spawnX = isGuard ? def.wx : Math.max(p1.x + GAME_W * 0.7, def.wx);
  const safeSpawn = typeof pickSafeSpawnNear === 'function'
    ? pickSafeSpawnNear(spawnX, isGuard ? 'any' : 'right', p1 ? p1.x : undefined)
    : null;
  const m = new Minion(safeSpawn ? safeSpawn.x : spawnX, safeSpawn ? safeSpawn.y - 60 : 300, def.color || '#888888', def.weaponKey || 'sword', true, def.aiDiff || 'medium');
  m.name     = def.name || 'Enemy';
  m.lives    = 1;
  m.health   = isGuard ? (def.health || 120) : 80;
  m.maxHealth= isGuard ? (def.health || 120) : 80;
  m.dmgMult  = isGuard ? 1.2 : 1.0;
  if (isGuard) {
    m.isExploreGuard = true;
    m._guardX = def.wx; // the x position they guard
  }
  if (def.isArenaLockEnemy) m.isArenaLockEnemy = true;
  if (def.isSidePortalEnemy) m.isSidePortalEnemy = true;
  if (def.classKey && def.classKey !== 'none' && typeof applyClass === 'function') {
    applyClass(m, def.classKey);
  }
  _storyScaleEnemyUnit(m, _activeStory2Chapter ? _activeStory2Chapter.id : 1, { elite: !!def.isElite });
  if (def.armor && typeof storyApplyArmor === 'function') {
    storyApplyArmor(m, def.armor);
  }
  m.storyFaction = 'enemy';
  m._teamId = 2;
  m.target = p1;
  p1.storyFaction = 'player';
  p1._teamId = 1;
  p1.target = m; // P1 targets most recently spawned
  minions.push(m);
}

// ── Fallen Warrior Memory ─────────────────────────────────────────────────────
// A rare (~10%) ambient scene that fires once per fight in late-game chapters
// (id >= 60) to build tension before/during the TrueForm arc.
// Shows a silhouette warrior fighting, then being instantly defeated.
// ─────────────────────────────────────────────────────────────────────────────

let _fallenWarrior = null; // null when inactive

/**
 * Trigger a named ambient scene.  Currently only "fallen_warrior_memory".
 * Safe to call multiple times — ignored if the scene is already playing or
 * if the fight-level flag is already set.
 */
function triggerScene(name) {
  if (!storyModeActive || !gameRunning) return;
  if (name !== 'fallen_warrior_memory') return;
  if (storyEventFired['FALLEN_WARRIOR']) return; // once per fight
  if (_fallenWarrior) return; // already playing

  storyEventFired['FALLEN_WARRIOR'] = true;
  _fallenWarrior = {
    timer:    0,
    duration: 168, // 2.8 s at 60 fps
  };
}

/**
 * Draw the fallen warrior memory overlay in screen-space.
 * Called from smc-loop.js after drawStoryPhaseHUD().
 */
function drawFallenWarriorMemory() {
  if (!_fallenWarrior) return;
  _fallenWarrior.timer++;
  const f   = _fallenWarrior.timer;       // 1 … 168
  const DUR = _fallenWarrior.duration;

  if (f > DUR) { _fallenWarrior = null; return; }

  const cw  = canvas.width;
  const ch  = canvas.height;
  const cx  = cw * 0.5;
  const cy  = ch * 0.5;
  const scY = ch / GAME_H; // logical-to-screen Y scale

  // ── Envelope alphas ──────────────────────────────────────────
  // Fade in  : f  0 → 20
  // Hold     : f 20 → 140
  // Fade out : f 140 → 168
  const fadeIn  = Math.min(1, f / 20);
  const fadeOut = f > 140 ? 1 - (f - 140) / 28 : 1;
  const baseA   = Math.min(fadeIn, fadeOut);

  ctx.save();

  // ── Background vignette ──────────────────────────────────────
  const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw * 0.55);
  vg.addColorStop(0,   `rgba(0,0,0,${(baseA * 0.82).toFixed(3)})`);
  vg.addColorStop(0.6, `rgba(0,0,0,${(baseA * 0.72).toFixed(3)})`);
  vg.addColorStop(1,   `rgba(0,0,0,0)`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, cw, ch);

  // ── Silhouette drawing helper ─────────────────────────────────
  // Draws a simple stickman silhouette at (sx, sy) facing dir (+1/-1),
  // scaled by s, with action pose based on phase.
  function _drawSilhouette(sx, sy, s, dir, pose) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(dir * s, s);
    ctx.fillStyle   = `rgba(0,0,0,${baseA.toFixed(3)})`;
    ctx.strokeStyle = `rgba(200,200,255,${(baseA * 0.55).toFixed(3)})`;
    ctx.lineWidth   = 2 / s;
    ctx.shadowColor = 'rgba(150,150,255,0.4)';
    ctx.shadowBlur  = 8 / s;

    // Head
    ctx.beginPath();
    ctx.arc(0, -50 * scY, 7 * scY, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(0, -43 * scY);
    ctx.lineTo(0, -18 * scY);
    ctx.stroke();

    if (pose === 'stand') {
      // Arms down
      ctx.beginPath();
      ctx.moveTo(0, -38 * scY); ctx.lineTo(-12 * scY, -26 * scY);
      ctx.moveTo(0, -38 * scY); ctx.lineTo( 12 * scY, -26 * scY);
      ctx.stroke();
      // Legs
      ctx.beginPath();
      ctx.moveTo(0, -18 * scY); ctx.lineTo(-9 * scY, 0);
      ctx.moveTo(0, -18 * scY); ctx.lineTo( 9 * scY, 0);
      ctx.stroke();

    } else if (pose === 'attack') {
      // Punch arm forward
      ctx.beginPath();
      ctx.moveTo(0, -38 * scY); ctx.lineTo( 22 * scY, -36 * scY);
      ctx.moveTo(0, -38 * scY); ctx.lineTo(-10 * scY, -28 * scY);
      ctx.stroke();
      // Stride legs
      ctx.beginPath();
      ctx.moveTo(0, -18 * scY); ctx.lineTo(-12 * scY,  2 * scY);
      ctx.moveTo(0, -18 * scY); ctx.lineTo( 10 * scY, -2 * scY);
      ctx.stroke();

    } else if (pose === 'fly') {
      // Ragdoll — arms/legs splayed
      ctx.beginPath();
      ctx.moveTo(0, -38 * scY); ctx.lineTo(-18 * scY, -32 * scY);
      ctx.moveTo(0, -38 * scY); ctx.lineTo( 14 * scY, -44 * scY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -18 * scY); ctx.lineTo(-14 * scY,  4 * scY);
      ctx.moveTo(0, -18 * scY); ctx.lineTo( 16 * scY,  8 * scY);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Phase logic ──────────────────────────────────────────────
  // Phase A  (f  1-40): warrior stands, facing the enemy (off-screen right)
  // Phase B  (f 41-70): warrior lunges — attack pose, slides forward
  // Phase C  (f 71-90): white flash + instant defeat — warrior flies left
  // Phase D  (f 91-140): warrior lies on ground; "THEY FAILED." text
  // Phase E  (f 141-168): fade out

  const sfX  = cx - cw * 0.10; // warrior screen X at rest
  const sfY  = cy + ch * 0.14; // feet level (mid-lower screen)

  if (f <= 40) {
    // Stand
    _drawSilhouette(sfX, sfY, 1, 1, 'stand');

  } else if (f <= 70) {
    // Lunge: slide right
    const prog = (f - 40) / 30;
    _drawSilhouette(sfX + prog * cw * 0.15, sfY, 1, 1, 'attack');

  } else if (f <= 90) {
    // Impact flash + fly
    const prog = (f - 70) / 20;
    // White flash (fades fast)
    if (f <= 76) {
      const flashA = (1 - (f - 70) / 6) * baseA * 0.7;
      ctx.fillStyle = `rgba(255,255,255,${flashA.toFixed(3)})`;
      ctx.fillRect(0, 0, cw, ch);
    }
    // Warrior flying left and up
    const flyX = sfX + cw * 0.15 - prog * cw * 0.30;
    const flyY = sfY - prog * ch * 0.16 + prog * prog * ch * 0.20; // arc
    _drawSilhouette(flyX, flyY, 1, -1, 'fly');

  } else if (f <= 140) {
    // Crumpled on ground
    const crumpX = sfX + cw * 0.15 - cw * 0.30;
    _drawSilhouette(crumpX, sfY, 1, -1, 'fly');

    // "THEY FAILED." text — fades in between f 95-115
    const textA = Math.min(1, (f - 95) / 20) * baseA;
    if (textA > 0) {
      const fs = Math.round(cw * 0.030);
      ctx.font        = `900 ${fs}px 'Arial Black', Arial, sans-serif`;
      ctx.textAlign   = 'center';
      ctx.letterSpacing = '0.12em';
      // Shadow
      ctx.shadowColor = 'rgba(100,80,200,0.9)';
      ctx.shadowBlur  = 18;
      ctx.fillStyle   = `rgba(220,210,255,${textA.toFixed(3)})`;
      ctx.fillText('THEY FAILED.', cx, cy - ch * 0.22);
      // Thin underline rule
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = `rgba(200,180,255,${(textA * 0.35).toFixed(3)})`;
      ctx.lineWidth   = 1;
      const tw = ctx.measureText('THEY FAILED.').width;
      ctx.beginPath();
      ctx.moveTo(cx - tw * 0.5, cy - ch * 0.22 + fs * 0.25);
      ctx.lineTo(cx + tw * 0.5, cy - ch * 0.22 + fs * 0.25);
      ctx.stroke();
    }
  }
  // Phase E: just the envelope fades — nothing extra to draw

  ctx.restore();
}
