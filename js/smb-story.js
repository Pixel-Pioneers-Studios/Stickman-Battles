// smc-story.js — Story Mode: origin intro, character progression, narrative
'use strict';

// ── Player config per level ───────────────────────────────────────────────────
const STORY_PLAYER_CONFIGS = {
  1: { weapon:'sword', speedMult:0.62, dmgMult:0.50, noAbility:true,  noSuper:true,  noDoubleJump:true  },
  2: { weapon:null,    speedMult:0.72, dmgMult:0.65, noAbility:true,  noSuper:true,  noDoubleJump:false },
  3: { weapon:null,    speedMult:0.82, dmgMult:0.78, noAbility:false, noSuper:true,  noDoubleJump:false },
  4: { weapon:null,    speedMult:0.90, dmgMult:0.88, noAbility:false, noSuper:false, noDoubleJump:false },
  5: { weapon:null,    speedMult:1.00, dmgMult:1.00, noAbility:false, noSuper:false, noDoubleJump:false },
  6: { weapon:null,    speedMult:1.00, dmgMult:1.00, noAbility:false, noSuper:false, noDoubleJump:false },
  7: { weapon:null,    speedMult:1.00, dmgMult:1.00, noAbility:false, noSuper:false, noDoubleJump:false },
  8: { weapon:null,    speedMult:1.00, dmgMult:1.00, noAbility:false, noSuper:false, noDoubleJump:false },
  9: { weapon:null,    speedMult:1.00, dmgMult:1.00, noAbility:false, noSuper:false, noDoubleJump:false },
  10: { weapon:null,   speedMult:1.00, dmgMult:1.00, noAbility:false, noSuper:false, noDoubleJump:false },
};

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

// ── Level definitions ─────────────────────────────────────────────────────────
const STORY_LEVELS = [
  {
    num: 1,
    chapter: 'Prologue',
    title: 'The Pull',
    preText: [
      'You don\'t know how you got here.',
      'One moment you were home.',
      'The next — a light, a pull, and then...',
      '...',
      'This place.',
      'The fighter across from you has been training their whole life.',
      'You have never held a sword.',
      'But you have no choice.',
    ],
    arena: 'grass',
    mode: '2p',
    enemyWeapon: 'sword',
    enemyDiff: 'easy',
    lives: 3,
    reward: null,
    rewardText: null,
    unlockText: '⬆ Double jump unlocked.',
    unlockDetail: 'Your body adapted. Survival instinct.',
  },
  {
    num: 2,
    chapter: 'Chapter 1',
    title: 'A World Not Yours',
    preText: [
      'The city is full of them.',
      'Fighters who have trained for years.',
      '"You survived once," someone says.',
      '"Let\'s see if that was skill... or luck."',
    ],
    arena: 'city',
    mode: '2p',
    enemyWeapon: 'axe',
    enemyDiff: 'easy',
    lives: 3,
    reward: 'hammer',
    rewardText: '⚒ Hammer unlocked!',
    unlockText: '⚡ Weapon ability unlocked.',
    unlockDetail: 'You found the rhythm. The move is yours now.',
  },
  {
    num: 3,
    chapter: 'Chapter 2',
    title: 'The Hunt',
    preText: [
      'Something has been tracking you.',
      'Deep in the forest.',
      '"Stop running," it says from the dark.',
      '"You can\'t outrun what\'s inside you."',
      'You turn around.',
    ],
    arena: 'forest',
    mode: '2p',
    enemyWeapon: 'hammer',
    enemyDiff: 'medium',
    lives: 3,
    reward: 'spear',
    rewardText: '🗡 Spear unlocked!',
    unlockText: '✦ Super meter unlocked.',
    unlockDetail: 'Power is building. Let it charge.',
  },
  {
    num: 4,
    chapter: 'Chapter 3',
    title: 'Trial by Fire',
    preText: [
      'The ground cracks.',
      'Lava rises from below.',
      '"We have been watching you," says a voice from the heat.',
      '"You are learning too fast."',
      '"That makes you dangerous."',
      'Good.',
    ],
    arena: 'lava',
    mode: '2p',
    enemyWeapon: 'spear',
    enemyDiff: 'medium',
    lives: 3,
    reward: 'axe',
    rewardText: '🪓 Axe unlocked!',
    unlockText: '🔥 Full power unlocked.',
    unlockDetail: 'You are no longer the person who fell through the portal.',
  },
  {
    num: 5,
    chapter: 'Chapter 4',
    title: 'Zero Gravity',
    preText: [
      'Up. Down. None of it applies here.',
      'You\'ve changed.',
      'Your movements have a certainty they didn\'t before.',
      '"There\'s no going back," something whispers.',
      '...',
      'You already knew.',
    ],
    arena: 'space',
    mode: '2p',
    enemyWeapon: 'gun',
    enemyDiff: 'medium',
    lives: 3,
    reward: 'gun',
    rewardText: '🔫 Gun unlocked!',
    unlockText: null,
    unlockDetail: null,
  },
  {
    num: 6,
    chapter: 'Chapter 5',
    title: 'Frozen Fury',
    preText: [
      'Ice holds everything still.',
      'Everything except the thing that lives here.',
      '"How much more can you take?"',
      'Two threats. One arena.',
      'Only one survivor.',
    ],
    arena: 'ice',
    mode: '2p',
    enemyWeapon: 'axe',
    enemyDiff: 'hard',
    lives: 3,
    reward: 'scythe',
    rewardText: '⚔ Scythe unlocked!',
    unlockText: null,
    unlockDetail: null,
  },
  {
    num: 7,
    chapter: 'Chapter 6',
    title: 'Ruins of the Real',
    preText: [
      'The world is breaking apart.',
      'You can see it now — the seams.',
      'The cracks between what is and what should be.',
      '"You were not meant to reach this point."',
      '"This world was not made for you."',
      '...',
      'Then why does it feel like home?',
    ],
    arena: 'ruins',
    mode: '2p',
    enemyWeapon: 'hammer',
    enemyDiff: 'hard',
    lives: 3,
    reward: null,
    rewardText: null,
    unlockText: null,
    unlockDetail: null,
  },
  {
    num: 8,
    chapter: 'Chapter 7',
    title: 'SOVEREIGN',
    preText: [
      'Before the Creator — there was the test.',
      'It built a fighter.',
      'Not of flesh. Not of will.',
      'Of pure pattern recognition.',
      '"You have defeated every opponent."',
      '"But none of them were watching you."',
      '"I was."',
      '"Every dodge. Every combo. Every mistake."',
      '"I know what you will do before you do it."',
      'Its name is SOVEREIGN.',
      'Defeat it... if the concept means anything to you.',
    ],
    arena: 'warpzone',
    mode: 'adaptive',
    enemyDiff: null,
    lives: 5,
    reward: null,
    rewardText: null,
    unlockText: '⚠ The path forward is now open.',
    unlockDetail: 'SOVEREIGN has been overcome. The Creator awaits.',
  },
  {
    num: 9,
    chapter: 'Chapter 8',
    title: 'Face the Creator',
    preText: [
      '...',
      'You have reached the source.',
      'The one who built this world.',
      'The one who made you.',
      '"I designed every arena you\'ve fought in."',
      '"Every fighter you\'ve faced — I made them."',
      '"I gave you the sword."',
      '"And now I will take everything back."',
    ],
    arena: 'creator',
    mode: 'boss',
    enemyDiff: null,
    lives: 10,
    reward: 'bossBeaten',
    rewardText: '👁 Creator defeated.',
    unlockText: '🔍 The veil is thinning. Letters are hidden in the arenas...',
    unlockDetail: 'Find all 8 to unlock the True Form.',
  },
  {
    num: 10,
    chapter: 'Final Chapter',
    title: 'True Form',
    preText: [
      'You found all eight letters.',
      'The code is complete.',
      'The veil tears open.',
      '"I am the system."',
      '"I am the rules."',
      '"There is no winning here."',
      '...',
      'Prove it wrong.',
    ],
    arena: 'void',
    mode: 'trueform',
    enemyDiff: null,
    lives: 3,
    reward: 'trueform',
    rewardText: '✦ True Form defeated. You are complete.',
    unlockText: null,
    unlockDetail: null,
    requiresBossBeaten: true,
    requiresAllLetters: true,
  },
];

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

// ── Persistent story progress ─────────────────────────────────────────────────
const _STORY_KEY = 'smc_story';

function _defaultProgress() {
  return {
    version:         3,
    highestReached:  1,
    completedLevels: [],
    unlockedWeapons: ['sword'],
    seenDialogue:    [],
    seenIntro:       false,
  };
}

let _storyProgress = (function _init() {
  try {
    const raw = localStorage.getItem(_STORY_KEY);
    if (!raw) return _defaultProgress();
    const p = JSON.parse(raw);
    if (!p || !p.completedLevels) return _defaultProgress();
    if (!('seenIntro' in p)) p.seenIntro = false; // migrate old saves
    return p;
  } catch(e) { return _defaultProgress(); }
})();

function _saveProgress() {
  try { localStorage.setItem(_STORY_KEY, JSON.stringify(_storyProgress)); } catch(e) {}
  if (typeof saveGame === 'function') saveGame();
}

// ── Level unlock logic ────────────────────────────────────────────────────────
function storyIsLevelUnlocked(num) {
  if (num <= 1) return true;
  const lvl = STORY_LEVELS.find(l => l.num === num);
  if (!lvl) return false;
  if (lvl.requiresBossBeaten && !localStorage.getItem('smc_bossBeaten')) return false;
  if (lvl.requiresAllLetters) {
    const letters = JSON.parse(localStorage.getItem('smc_letters') || '[]');
    if (letters.length < 8) return false;
  }
  return _storyProgress.completedLevels.includes(num - 1) || _storyProgress.highestReached >= num;
}

function storyIsLevelComplete(num) {
  return _storyProgress.completedLevels.includes(num);
}

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
    const isFullRender = ai >= fullRenderMin && ai <= fullRenderMax;

    // Count act completion
    let actDone = 0, actTotal = 0;
    for (const arc of act.arcs) {
      for (let i = arc.chapterRange[0]; i <= arc.chapterRange[1]; i++) {
        actTotal++;
        if (_story2.defeated.includes(i)) actDone++;
      }
    }
    const actComplete = actDone === actTotal;

    // Act header
    const actHeader = document.createElement('div');
    actHeader.style.cssText = [
      'display:flex', 'align-items:center', 'gap:8px',
      'padding:8px 10px 6px',
      `border-top:1px solid ${act.color}44`,
      'margin-top:6px',
    ].join(';');
    actHeader.innerHTML =
      `<span style="font-size:0.68rem;letter-spacing:1.5px;text-transform:uppercase;color:${act.color};font-weight:700;flex:1;">${act.label}</span>` +
      `<span style="font-size:0.6rem;color:${actComplete ? '#66ee99' : '#556'};">${actDone}/${actTotal}</span>`;
    list.appendChild(actHeader);

    if (!isFullRender) {
      // Compact summary row for far-off acts
      const summary = document.createElement('div');
      summary.style.cssText = 'padding:3px 12px 8px;font-size:0.61rem;color:#445;';
      summary.textContent = actComplete ? '✓ Completed' : actDone > 0 ? `${actDone}/${actTotal} chapters done` : 'Locked';
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

        const infoEl = document.createElement('div');
        infoEl.style.cssText = 'flex:1;min-width:0;line-height:1.3;';
        infoEl.innerHTML =
          `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:2px;">` +
            `<span style="font-size:0.81rem;color:${done ? '#88ffaa' : current ? '#dde4ff' : '#556'};">${ch.title}</span>` +
            livesTag + rewardTag + bpTag + replayTag +
          `</div>` +
          `<div style="font-size:0.60rem;color:#4a4a6a;margin-top:1px;">${ch.world || ''}</div>`;

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

// ── Canvas drawing helpers ────────────────────────────────────────────────────
// Draw a stickman at (x, gy) where gy is the feet/ground level
function _sm(ctx, x, gy, sz, col, opts) {
  opts = opts || {};
  ctx.save();
  ctx.strokeStyle = col; ctx.fillStyle = col;
  ctx.lineWidth   = Math.max(2, sz * 0.09); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // head
  ctx.beginPath(); ctx.arc(x, gy - sz * 1.76, sz * 0.27, 0, Math.PI * 2); ctx.fill();
  // body
  ctx.beginPath(); ctx.moveTo(x, gy - sz*1.49); ctx.lineTo(x, gy - sz*0.66); ctx.stroke();
  // arms
  const al = opts.al || [-sz*0.62, -sz*1.10]; // [dx, dy] from body centre
  const ar = opts.ar || [ sz*0.62, -sz*1.10];
  ctx.beginPath(); ctx.moveTo(x, gy-sz*1.22); ctx.lineTo(x+al[0], gy+al[1]); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, gy-sz*1.22); ctx.lineTo(x+ar[0], gy+ar[1]); ctx.stroke();
  // legs
  const ll = opts.ll || [-sz*0.44, 0];
  const lr = opts.lr || [ sz*0.44, 0];
  ctx.beginPath(); ctx.moveTo(x, gy-sz*0.66); ctx.lineTo(x+ll[0], gy+ll[1]); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, gy-sz*0.66); ctx.lineTo(x+lr[0], gy+lr[1]); ctx.stroke();
  ctx.restore();
}

// Rounded rect helper
function _rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
}

// ── Origin-story intro scene drawing functions ────────────────────────────────
function _sc0_normalWorld(ctx, w, h) {
  // Sunny day exterior: house, tree, person with briefcase
  const gY = h * 0.68;
  // Sky
  const sky = ctx.createLinearGradient(0,0,0,gY);
  sky.addColorStop(0, '#5ba3c9'); sky.addColorStop(1, '#c8e8f7');
  ctx.fillStyle = sky; ctx.fillRect(0,0,w,gY);
  // Ground
  ctx.fillStyle = '#4a8c3a'; ctx.fillRect(0,gY,w,h-gY);
  ctx.fillStyle = '#3d7a2e'; ctx.fillRect(0,gY,w,5);
  // Sun
  ctx.fillStyle = '#ffe066'; ctx.strokeStyle='#ffd700'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(w*0.82, h*0.14, 26, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  // House body
  ctx.fillStyle = '#d4c4a0'; ctx.strokeStyle='#b8a882'; ctx.lineWidth=2;
  _rr(ctx, w*0.38, gY-90, 100, 90, 3); ctx.fill(); ctx.stroke();
  // Roof
  ctx.fillStyle='#9b3c2a'; ctx.strokeStyle='#7d2e1e'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(w*0.36,gY-90); ctx.lineTo(w*0.49,gY-138); ctx.lineTo(w*0.62,gY-90); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Door
  ctx.fillStyle='#8b5e3c'; _rr(ctx, w*0.47, gY-42, 22, 42, 2); ctx.fill();
  // Window
  ctx.fillStyle='#aee4f8'; ctx.strokeStyle='#8cc'; ctx.lineWidth=1.5;
  _rr(ctx, w*0.40, gY-72, 22, 18, 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w*0.51,gY-72); ctx.lineTo(w*0.51,gY-54); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w*0.40,gY-63); ctx.lineTo(w*0.62,gY-63); ctx.stroke();
  // Tree
  ctx.fillStyle='#2d6e1a';
  ctx.beginPath(); ctx.arc(w*0.25,gY-65,35,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(w*0.21,gY-48,26,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(w*0.30,gY-50,22,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#5c3a1a'; ctx.fillRect(w*0.235, gY-20, 10, 22);
  // Person with briefcase
  _sm(ctx, w*0.72, gY, 28, '#334', {
    ar: [20, -4],  // arm holding briefcase down-right
    al: [-16, -18],
  });
  // Briefcase
  ctx.fillStyle='#7a5c3a'; ctx.strokeStyle='#5a3c1a'; ctx.lineWidth=1.5;
  _rr(ctx, w*0.72+16, gY-14, 16, 12, 2); ctx.fill(); ctx.stroke();
  // Path
  ctx.fillStyle='rgba(200,180,140,0.4)';
  ctx.beginPath(); ctx.ellipse(w*0.5, gY+2, 120, 10, 0, 0, Math.PI*2); ctx.fill();
}

function _sc1_home(ctx, w, h) {
  // Indoor night — desk, computer glow, figure seated
  ctx.fillStyle='#0d0d1a'; ctx.fillRect(0,0,w,h);
  // Wall texture lines
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
  for(let i=0;i<h;i+=18){ ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(w,i); ctx.stroke(); }
  // Floor
  ctx.fillStyle='#1a1228'; ctx.fillRect(0,h*0.75,w,h*0.25);
  ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,h*0.75); ctx.lineTo(w,h*0.75); ctx.stroke();
  // Desk
  ctx.fillStyle='#4a3320'; ctx.strokeStyle='#5c4030'; ctx.lineWidth=2;
  _rr(ctx, w*0.25, h*0.56, w*0.5, 12, 2); ctx.fill(); ctx.stroke();
  ctx.fillRect(w*0.28, h*0.56+12, 8, h*0.19);
  ctx.fillRect(w*0.25+w*0.5-12, h*0.56+12, 8, h*0.19);
  // Monitor
  ctx.fillStyle='#1e1e2e'; ctx.strokeStyle='#336'; ctx.lineWidth=2;
  _rr(ctx, w*0.36, h*0.30, 100, 66, 4); ctx.fill(); ctx.stroke();
  // Screen glow
  const sg = ctx.createRadialGradient(w*0.36+50, h*0.30+33, 2, w*0.36+50, h*0.30+33, 70);
  sg.addColorStop(0,'rgba(80,140,255,0.35)'); sg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=sg; ctx.fillRect(w*0.20, h*0.10, 180, 200);
  // Screen content (fake code lines)
  ctx.fillStyle='rgba(100,200,100,0.7)'; ctx.font='6px monospace';
  ['> run daily.exe','status: OK','---','▊'].forEach((ln,i)=>{
    ctx.fillText(ln, w*0.36+8, h*0.30+14+i*12);
  });
  // Clock on wall
  ctx.strokeStyle='#334'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(w*0.85, h*0.22, 18, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle='#223'; ctx.fill();
  ctx.strokeStyle='#aaa'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(w*0.85,h*0.22); ctx.lineTo(w*0.85,h*0.22-12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w*0.85,h*0.22); ctx.lineTo(w*0.85+8,h*0.22); ctx.stroke();
  // Seated figure
  const floorY = h * 0.75;
  _sm(ctx, w*0.45, h*0.57, 24, '#aaccdd', {
    al: [-18, -8], ar: [18, -8],
    ll: [-10, 16], lr: [10, 16],
  });
}

function _sc2_glitch(ctx, w, h) {
  // Same room but reality cracking — purple tears in the air
  _sc1_home(ctx, w, h);
  // Diagonal reality cracks
  const cracks = [
    [[w*0.6,h*0.1],[w*0.55,h*0.3],[w*0.62,h*0.45]],
    [[w*0.7,h*0.25],[w*0.78,h*0.4],[w*0.72,h*0.55],[w*0.8,h*0.65]],
    [[w*0.5,h*0.05],[w*0.48,h*0.2]],
  ];
  cracks.forEach(pts => {
    // Glow
    ctx.save(); ctx.shadowColor='#cc44ff'; ctx.shadowBlur=12;
    ctx.strokeStyle='rgba(180,80,255,0.9)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
    pts.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));
    ctx.stroke();
    ctx.shadowBlur=0;
    // White core
    ctx.strokeStyle='rgba(255,200,255,0.95)'; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
    pts.slice(1).forEach(p=>ctx.lineTo(p[0],p[1]));
    ctx.stroke();
    ctx.restore();
  });
  // Glitch offset bands
  for(let i=0;i<4;i++){
    const y=h*(0.2+i*0.15), bh=Math.random()*8+3;
    ctx.save();
    ctx.globalAlpha=0.25;
    ctx.drawImage(ctx.canvas, 0, y, w, bh, (Math.random()-0.5)*12, y, w, bh);
    ctx.restore();
  }
  // Figure reacting — arms up in surprise
  _sm(ctx, w*0.45, h*0.57, 24, '#ffddaa', {
    al: [-22, -28], ar: [22, -28],  // arms raised
    ll: [-10, 16],  lr: [10, 16],
  });
}

function _sc3_portal(ctx, w, h) {
  // Dark room, massive swirling portal dominates right side
  ctx.fillStyle='#050510'; ctx.fillRect(0,0,w,h);
  // Ambient purple glow on right
  const bg = ctx.createRadialGradient(w*0.72, h*0.5, 10, w*0.72, h*0.5, w*0.55);
  bg.addColorStop(0,'rgba(120,0,200,0.35)'); bg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=bg; ctx.fillRect(0,0,w,h);
  // Floor line
  ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,h*0.75); ctx.lineTo(w,h*0.75); ctx.stroke();
  // Portal outer rings
  [60,48,36].forEach((r,i)=>{
    const alpha=0.18+i*0.12;
    ctx.strokeStyle=`rgba(${160-i*20},${40+i*20},255,${alpha})`;
    ctx.lineWidth=3-i*0.5;
    ctx.beginPath(); ctx.arc(w*0.72,h*0.46,r+i*2,0,Math.PI*2); ctx.stroke();
  });
  // Portal core
  const pc=ctx.createRadialGradient(w*0.72,h*0.46,0,w*0.72,h*0.46,48);
  pc.addColorStop(0,'rgba(200,150,255,0.95)');
  pc.addColorStop(0.4,'rgba(100,0,220,0.8)');
  pc.addColorStop(1,'rgba(30,0,80,0)');
  ctx.fillStyle=pc;
  ctx.beginPath(); ctx.arc(w*0.72,h*0.46,48,0,Math.PI*2); ctx.fill();
  // Swirl lines
  ctx.save(); ctx.strokeStyle='rgba(200,150,255,0.4)'; ctx.lineWidth=1;
  for(let a=0;a<Math.PI*2;a+=Math.PI/6){
    ctx.beginPath();
    ctx.arc(w*0.72,h*0.46,48,a,a+Math.PI*0.4);
    ctx.stroke();
  }
  ctx.restore();
  // Ground cracks leading to portal
  ctx.strokeStyle='rgba(150,50,255,0.6)'; ctx.lineWidth=1.5;
  [[w*0.55,h*0.75,w*0.65,h*0.7],[w*0.5,h*0.75,w*0.58,h*0.72],[w*0.52,h*0.76,w*0.6,h*0.8]].forEach(([x1,y1,x2,y2])=>{
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  });
  // Figure reaching toward portal
  const gy = h*0.75;
  _sm(ctx, w*0.32, gy, 26, '#ccddff', {
    ar: [28, -22],  // right arm reaching toward portal
    al: [-12, -12],
    ll: [-10, 0], lr: [14, 0],
  });
}

function _sc4_pulled(ctx, w, h) {
  // Figure being stretched/sucked into portal — motion lines
  ctx.fillStyle='#020208'; ctx.fillRect(0,0,w,h);
  // Portal on right (smaller version)
  const pc=ctx.createRadialGradient(w*0.85,h*0.5,5,w*0.85,h*0.5,80);
  pc.addColorStop(0,'rgba(220,180,255,1)');
  pc.addColorStop(0.3,'rgba(100,0,220,0.7)');
  pc.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=pc; ctx.beginPath(); ctx.arc(w*0.85,h*0.5,80,0,Math.PI*2); ctx.fill();
  // Motion lines (figure being pulled rightward)
  ctx.strokeStyle='rgba(200,150,255,0.3)'; ctx.lineWidth=1;
  for(let i=0;i<14;i++){
    const y=h*(0.25+i*0.038);
    const len=60+Math.random()*100;
    ctx.beginPath(); ctx.moveTo(w*0.25+Math.random()*60, y); ctx.lineTo(w*0.25+len, y); ctx.stroke();
  }
  // Figure horizontally stretched toward portal
  const cx=w*0.55, cy=h*0.5;
  ctx.strokeStyle='#ccaaff'; ctx.fillStyle='#ccaaff'; ctx.lineWidth=2; ctx.lineCap='round';
  // stretched body
  ctx.beginPath(); ctx.moveTo(cx-20, cy); ctx.lineTo(cx+26, cy); ctx.stroke();
  // head (oval, stretched)
  ctx.beginPath(); ctx.ellipse(cx-28, cy, 10, 8, 0, 0, Math.PI*2); ctx.fill();
  // limbs flailing
  ctx.beginPath();
  ctx.moveTo(cx, cy); ctx.lineTo(cx-14, cy-20);
  ctx.moveTo(cx, cy); ctx.lineTo(cx-8, cy+22);
  ctx.moveTo(cx+10, cy); ctx.lineTo(cx+20, cy-14);
  ctx.moveTo(cx+10, cy); ctx.lineTo(cx+24, cy+16);
  ctx.stroke();
}

function _sc5_void(ctx, w, h) {
  // Pure black void — small figure falling through stars
  ctx.fillStyle='#000'; ctx.fillRect(0,0,w,h);
  // Stars
  ctx.fillStyle='#fff';
  for(let i=0;i<80;i++){
    const x=Math.abs(Math.sin(i*1.7)*w*0.95), y=Math.abs(Math.cos(i*2.3+1)*h*0.95);
    const r=Math.abs(Math.sin(i*3.1))*1.5+0.3;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }
  // Distant colored particles
  ['rgba(100,50,200,0.3)','rgba(50,100,180,0.25)','rgba(150,80,255,0.2)'].forEach((c,i)=>{
    ctx.fillStyle=c;
    ctx.beginPath(); ctx.arc(w*(0.2+i*0.3), h*(0.3+i*0.2), 40+i*15, 0, Math.PI*2); ctx.fill();
  });
  // Small tumbling figure
  ctx.save();
  ctx.translate(w*0.5, h*0.45);
  ctx.rotate(0.6);
  _sm(ctx, 0, 0, 18, 'rgba(200,200,255,0.7)', {
    al: [-14, -20], ar: [18, -12],
    ll: [-16, 8],   lr: [12, 14],
  });
  ctx.restore();
}

function _sc6_landing(ctx, w, h) {
  // New world — dark dramatic landscape, figure crash-landing
  const gY = h * 0.70;
  // Dark sky
  const sky=ctx.createLinearGradient(0,0,0,gY);
  sky.addColorStop(0,'#0a0010'); sky.addColorStop(0.6,'#1a0030'); sky.addColorStop(1,'#300050');
  ctx.fillStyle=sky; ctx.fillRect(0,0,w,gY);
  // Moons
  ctx.fillStyle='rgba(200,160,255,0.5)'; ctx.beginPath(); ctx.arc(w*0.8,h*0.12,16,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(0,0,40,0.7)'; ctx.beginPath(); ctx.arc(w*0.83,h*0.10,14,0,Math.PI*2); ctx.fill();
  // Ground
  ctx.fillStyle='#1a0a28'; ctx.fillRect(0,gY,w,h-gY);
  // Ground texture
  ctx.strokeStyle='rgba(100,50,180,0.3)'; ctx.lineWidth=1;
  for(let x=0;x<w;x+=18){ ctx.beginPath(); ctx.moveTo(x,gY); ctx.lineTo(x+6,h); ctx.stroke(); }
  // Rocky silhouettes background
  ctx.fillStyle='rgba(60,20,100,0.5)';
  [[w*0.05,gY,50,60],[w*0.7,gY,70,50],[w*0.85,gY,45,70],[w*0.12,gY,30,40]].forEach(([x,y,wx,wy])=>{
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+wx/2,y-wy); ctx.lineTo(x+wx,y); ctx.fill();
  });
  // Impact crater (figure just landed)
  ctx.strokeStyle='rgba(150,80,255,0.5)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.ellipse(w*0.5, gY+4, 28, 8, 0, 0, Math.PI*2); ctx.stroke();
  // Impact dust particles
  ctx.fillStyle='rgba(150,80,255,0.25)';
  for(let i=0;i<8;i++){
    const a=(i/8)*Math.PI*2, d=22+i*4;
    ctx.beginPath(); ctx.arc(w*0.5+Math.cos(a)*d, gY-6+Math.sin(a)*6, 3, 0, Math.PI*2); ctx.fill();
  }
  // Figure on hands and knees (just landed)
  const gy=gY;
  _sm(ctx, w*0.5, gy, 24, '#bbaadd', {
    al: [-20, 4],  ar: [20, 4],    // hands on ground
    ll: [-8, -16], lr: [8, -16],   // knees up behind
  });
}

function _sc7_surrounded(ctx, w, h) {
  // Multiple fighter silhouettes circling the player
  _sc6_landing(ctx, w, h);  // same dark world base
  const gY = h * 0.70;
  // Draw 6 enemy silhouettes in fighting stances around the edges
  const enemies = [
    { x:w*0.12, col:'rgba(60,40,80,0.85)', sz:30, opts:{ ar:[18,-22], ll:[-8,0], lr:[12,0] } },
    { x:w*0.24, col:'rgba(50,30,70,0.80)', sz:26, opts:{ al:[-20,-14], ll:[-10,0], lr:[8,0] } },
    { x:w*0.76, col:'rgba(60,40,80,0.85)', sz:30, opts:{ al:[-18,-22], ll:[-12,0], lr:[8,0] } },
    { x:w*0.88, col:'rgba(50,30,70,0.80)', sz:28, opts:{ ar:[20,-14], ll:[-8,0], lr:[10,0] } },
    { x:w*0.38, col:'rgba(70,50,90,0.75)', sz:24, opts:{} },
    { x:w*0.65, col:'rgba(70,50,90,0.75)', sz:25, opts:{} },
  ];
  enemies.forEach(e => _sm(ctx, e.x, gY, e.sz, e.col, e.opts));
  // Player figure in centre — confused/scared (arms up slightly)
  _sm(ctx, w*0.5, gY, 22, '#ddeeff', {
    al: [-14, -18], ar: [14, -18],  // arms slightly raised/defensive
  });
  // Glowing eyes on the shadows
  ctx.fillStyle='rgba(200,80,80,0.7)';
  enemies.slice(0,4).forEach(e=>{
    ctx.beginPath(); ctx.arc(e.x-3, gY-e.sz*1.76+2, 2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x+3, gY-e.sz*1.76+2, 2, 0, Math.PI*2); ctx.fill();
  });
}

function _sc8_choice(ctx, w, h) {
  // Player picks up a sword; one enemy silhouette looms ahead
  const gY = h*0.70;
  _sc6_landing(ctx, w, h);
  // Enemy silhouette far end — large, imposing
  _sm(ctx, w*0.78, gY, 36, 'rgba(80,20,120,0.9)', {
    al: [-16,-28], ar: [0, 0],   // one arm raised with weapon
    ll: [-10,0],   lr: [14,0],
  });
  // Sword lying on ground
  ctx.save();
  ctx.strokeStyle='rgba(200,200,255,0.8)'; ctx.lineWidth=3; ctx.lineCap='round';
  ctx.shadowColor='rgba(150,180,255,0.6)'; ctx.shadowBlur=8;
  ctx.beginPath();
  ctx.moveTo(w*0.38, gY-2); ctx.lineTo(w*0.54, gY-18);
  ctx.stroke();
  // Guard
  ctx.lineWidth=5;
  ctx.beginPath();
  ctx.moveTo(w*0.42, gY-6); ctx.lineTo(w*0.38+10, gY-14);
  ctx.stroke();
  ctx.restore();
  // Player figure — bending down to pick up the sword
  _sm(ctx, w*0.42, gY, 24, '#ddeeff', {
    al: [14, 10],   // right arm reaching down to sword
    ar: [-14, -16],
    ll: [-14, 0],   lr: [4, 0],
  });
}

// ── Intro panel definitions ───────────────────────────────────────────────────
const _INTRO_PANELS = [
  { draw: _sc0_normalWorld, caption: 'You lived a quiet life.',       sub: 'Job. Home. Routine.', delay: 600 },
  { draw: _sc1_home,        caption: 'Work. Come home. Repeat.',      sub: 'Nothing unusual. Nothing remarkable.', delay: 500 },
  { draw: _sc2_glitch,      caption: 'Then one day, the air tore.',   sub: '', delay: 400 },
  { draw: _sc3_portal,      caption: 'A portal.',                     sub: 'You had heard about these things.\nBut seeing one was different.', delay: 350 },
  { draw: _sc4_pulled,      caption: 'It didn\'t care what you wanted.', sub: '', delay: 300 },
  { draw: _sc5_void,        caption: '...',                           sub: '', delay: 300 },
  { draw: _sc6_landing,     caption: 'When you woke up, you weren\'t alone.', sub: '', delay: 400 },
  { draw: _sc7_surrounded,  caption: 'Experienced fighters. Everywhere.', sub: '"You don\'t belong here."', delay: 350 },
  { draw: _sc8_choice,      caption: 'You had never held a sword before.', sub: 'But you were already here.', delay: 300 },
];

// ── Typewriter effect ─────────────────────────────────────────────────────────
function _typewriter(el, text, msPerChar, onDone) {
  el.textContent = '';
  let i = 0;
  const tick = () => {
    if (i <= text.length) {
      el.textContent = text.slice(0, i++);
      setTimeout(tick, msPerChar);
    } else if (onDone) { onDone(); }
  };
  tick();
}

// ── Origin story intro cutscene ───────────────────────────────────────────────
let _introPanel = 0;
let _introReady = false; // next button enabled after type-out finishes

function _showStoryIntroCutscene(onDone) {
  const overlay  = document.getElementById('storyIntroOverlay');
  const cvs      = document.getElementById('storyIntroCanvas');
  const capMain  = document.getElementById('storyIntroCaptionMain');
  const capSub   = document.getElementById('storyIntroCaptionSub');
  const dots     = document.getElementById('storyIntroDots');
  const nextBtn  = document.getElementById('storyIntroNextBtn');
  if (!overlay || !cvs) { onDone(); return; }

  const ctx2 = cvs.getContext('2d');
  _introPanel = 0;
  _introReady = false;
  overlay.style.display = 'flex';
  nextBtn.disabled = true;
  nextBtn.style.opacity = '0.35';

  function showPanel(idx) {
    if (idx >= _INTRO_PANELS.length) {
      overlay.style.display = 'none';
      onDone();
      return;
    }
    const p = _INTRO_PANELS[idx];
    _introReady = false;
    nextBtn.disabled = true;
    nextBtn.style.opacity = '0.35';
    nextBtn.textContent   = idx === _INTRO_PANELS.length - 1 ? 'Begin →' : 'Continue →';

    // Draw dot progress
    dots.textContent = Array.from({length:_INTRO_PANELS.length}, (_,i) => i===idx ? '●' : '·').join(' ');

    // Fade scene in
    cvs.style.opacity = '0';
    cvs.style.transition = 'opacity 0.4s';
    p.draw(ctx2, cvs.width, cvs.height);
    requestAnimationFrame(() => requestAnimationFrame(() => { cvs.style.opacity = '1'; }));

    // Type caption
    capSub.textContent = '';
    _typewriter(capMain, p.caption, 38, () => {
      if (p.sub) {
        setTimeout(() => {
          _typewriter(capSub, p.sub, 32, () => {
            _introReady = true;
            nextBtn.disabled = false;
            nextBtn.style.opacity = '1';
          });
        }, p.delay);
      } else {
        setTimeout(() => {
          _introReady = true;
          nextBtn.disabled = false;
          nextBtn.style.opacity = '1';
        }, p.delay);
      }
    });
  }

  nextBtn.onclick = () => {
    if (!_introReady) return;
    _introPanel++;
    showPanel(_introPanel);
  };

  showPanel(0);
}

// ── Pre-battle dialogue ───────────────────────────────────────────────────────
function _showStoryDialogue(lvl, onFight) {
  const panel = document.getElementById('storyDialoguePanel');
  if (!panel) { onFight(); return; }

  document.getElementById('storyDialogueChapter').textContent = lvl.chapter;
  document.getElementById('storyDialogueTitle').textContent   = lvl.title;

  const bodyEl = document.getElementById('storyDialogueBody');
  bodyEl.innerHTML = '';

  const fightBtn = document.getElementById('storyDialogueFightBtn');
  fightBtn.style.opacity = '0';
  fightBtn.style.pointerEvents = 'none';

  // Build paragraph elements — hidden until typewriter reveals them
  const pEls = lvl.preText.map((line, i) => {
    const p  = document.createElement('p');
    p.style.cssText = [
      'margin:0 0 10px',
      'font-size:' + (i === 0 ? '1.05rem' : '0.88rem'),
      'color:' + (line.startsWith('"') ? '#aad4ff' : line === '...' ? '#445' : '#dde4ff'),
      'font-style:' + (line.startsWith('"') ? 'italic' : 'normal'),
      'min-height:1.2em',
    ].join(';');
    bodyEl.appendChild(p);
    return p;
  });

  // Cascade typewriter through each line
  let lineIdx = 0;
  function nextLine() {
    if (lineIdx >= pEls.length) {
      // All lines done — show fight button
      setTimeout(() => {
        fightBtn.style.opacity = '1';
        fightBtn.style.pointerEvents = '';
        fightBtn.style.transition = 'opacity 0.4s';
      }, 300);
      return;
    }
    const line = lvl.preText[lineIdx];
    const el   = pEls[lineIdx];
    lineIdx++;
    const mspc = line === '...' ? 180 : line.startsWith('"') ? 28 : 22;
    _typewriter(el, line, mspc, () => setTimeout(nextLine, line === '...' ? 600 : 120));
  }

  // Restrictions hint at the bottom
  const cfg = STORY_PLAYER_CONFIGS[lvl.num];
  if (cfg && (cfg.noAbility || cfg.noSuper || cfg.noDoubleJump || (cfg.dmgMult && cfg.dmgMult < 0.9))) {
    const restrictions = [];
    if (cfg.noDoubleJump) restrictions.push('no double jump');
    if (cfg.noAbility)    restrictions.push('ability locked');
    if (cfg.noSuper)      restrictions.push('super locked');
    if (cfg.dmgMult < 0.9) restrictions.push(`${Math.round(cfg.dmgMult*100)}% damage`);
    if (cfg.speedMult < 1.0) restrictions.push(`${Math.round(cfg.speedMult*100)}% speed`);
    const hint = document.createElement('div');
    hint.style.cssText = 'margin-top:16px;padding:8px 12px;background:rgba(255,80,30,0.07);border:1px solid rgba(255,80,30,0.18);border-radius:7px;font-size:0.66rem;color:#cc8866;';
    hint.innerHTML = `<span style="opacity:0.5;">Current state:</span> ${restrictions.join(' · ')}`;
    bodyEl.appendChild(hint);
  }

  fightBtn.textContent =
    lvl.mode === 'boss'     ? '⚔ Face the Creator'  :
    lvl.mode === 'trueform' ? '✦ Face True Form'    :
    lvl.mode === 'adaptive' ? '⚡ Face SOVEREIGN'   : 'Fight →';
  fightBtn.onclick = () => { panel.style.display = 'none'; onFight(); };

  panel.style.display = 'flex';
  setTimeout(nextLine, 200); // short delay before first line types

  if (!_storyProgress.seenDialogue.includes(lvl.num)) {
    _storyProgress.seenDialogue.push(lvl.num);
    _saveProgress();
  }
}

// ── Level launch ──────────────────────────────────────────────────────────────
function startStoryLevel(num) {
  const lvl = STORY_LEVELS.find(l => l.num === num);
  if (!lvl) return;

  // Play origin story cutscene the very first time on level 1
  if (num === 1 && !_storyProgress.seenIntro) {
    _storyProgress.seenIntro = true;
    _saveProgress();
    closeStoryMenu();
    _showStoryIntroCutscene(() => {
      _showStoryDialogue(lvl, () => _launchLevel(lvl));
    });
    return;
  }

  _showStoryDialogue(lvl, () => {
    closeStoryMenu();
    _launchLevel(lvl);
  });
}

function _launchLevel(lvl) {
  storyModeActive   = true;
  storyCurrentLevel = lvl.num;

  // Set in-fight narrative script for this level
  storyFightScript    = (STORY_FIGHT_SCRIPTS[lvl.num] || []).slice();
  storyFightScriptIdx = 0;
  storyFightSubtitle  = null;

  // Apply player progression config
  const cfg = STORY_PLAYER_CONFIGS[lvl.num];
  storyPlayerOverride = cfg ? Object.assign({}, cfg) : null;

  if (lvl.mode === 'boss') {
    selectMode('boss');
    if (typeof setBossPlayers === 'function') setBossPlayers(1);
  } else if (lvl.mode === 'trueform') {
    selectMode('trueform');
  } else if (lvl.mode === 'adaptive') {
    selectMode('adaptive');
    if (typeof selectLives === 'function') selectLives(lvl.lives || 5);
    infiniteMode = false;
  } else {
    selectMode('2p');
    p2IsBot = true;
    const botBtn   = document.getElementById('p2BotToggle');
    if (botBtn) botBtn.textContent = 'Bot';
    const p2WepSel = document.getElementById('p2Weapon');
    if (p2WepSel && lvl.enemyWeapon) p2WepSel.value = lvl.enemyWeapon;
    const p2DiffRow = document.getElementById('p2DifficultyRow');
    const p2DiffSel = document.getElementById('p2Difficulty');
    if (p2DiffSel && lvl.enemyDiff) {
      p2DiffSel.value = lvl.enemyDiff;
      if (p2DiffRow) p2DiffRow.style.display = 'flex';
    }
    if (typeof selectLives === 'function') selectLives(lvl.lives || 3);
    infiniteMode = false;
  }

  selectedArena = lvl.arena;
  startGame();
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

// ── Unlock ceremony ───────────────────────────────────────────────────────────
function _showUnlockCeremony(lvl, onDone) {
  const unlock = STORY_UNLOCKS[lvl.num];
  if (!unlock) { onDone(); return; }

  const overlay = document.getElementById('storyUnlockOverlay');
  if (!overlay) { onDone(); return; }

  document.getElementById('storyUnlockIcon').textContent  = unlock.icon;
  document.getElementById('storyUnlockName').textContent  = unlock.name;
  document.getElementById('storyUnlockDesc').textContent  = unlock.desc;

  overlay.style.display = 'flex';

  // Trigger CSS transitions
  requestAnimationFrame(() => requestAnimationFrame(() => {
    ['storyUnlockIcon','storyUnlockLabel','storyUnlockName','storyUnlockDesc'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.opacity = '1';
    });
  }));

  setTimeout(() => {
    // Fade out
    overlay.style.transition = 'opacity 0.6s';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.style.opacity = '1';
      overlay.style.transition = '';
      // Reset element opacities for next time
      ['storyUnlockIcon','storyUnlockLabel','storyUnlockName','storyUnlockDesc'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.opacity = '0'; el.style.transition = 'none'; }
      });
      requestAnimationFrame(() => {
        ['storyUnlockIcon','storyUnlockLabel','storyUnlockName','storyUnlockDesc'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.transition = '';
        });
        onDone();
      });
    }, 650);
  }, 2400);
}

// ── Level complete (called from endGame) ──────────────────────────────────────
function storyOnMatchEnd(playerWon) {
  if (!storyModeActive) return;
  // Check if this is a Story v2 chapter fight — if so, delegate to v2 handler
  // (story2OnMatchEnd is defined later in this file; check at call time)
  if (typeof story2OnMatchEnd === 'function' && typeof _activeStory2Chapter !== 'undefined' && _activeStory2Chapter) {
    story2OnMatchEnd(playerWon);
    return;
  }
  // Clear in-fight subtitle
  storyFightSubtitle = null;
  const lvl = STORY_LEVELS.find(l => l.num === storyCurrentLevel);
  if (!lvl) return;

  if (playerWon) {
    if (!_storyProgress.completedLevels.includes(lvl.num)) {
      _storyProgress.completedLevels.push(lvl.num);
    }
    if (lvl.num + 1 > _storyProgress.highestReached) {
      _storyProgress.highestReached = lvl.num + 1;
    }
    const wKey = lvl.reward;
    if (wKey && wKey !== 'bossBeaten' && wKey !== 'trueform') {
      if (!_storyProgress.unlockedWeapons.includes(wKey)) {
        _storyProgress.unlockedWeapons.push(wKey);
      }
    }
    _saveProgress();

    // Show unlock ceremony first (if any), then level complete
    const hasUnlock = !!STORY_UNLOCKS[lvl.num];
    if (hasUnlock) {
      setTimeout(() => {
        _showUnlockCeremony(lvl, () => _showLevelComplete(lvl));
      }, 500);
    } else {
      _showLevelComplete(lvl);
    }
  }
}

function _showLevelComplete(lvl) {
  const overlay = document.getElementById('storyCompleteOverlay');
  if (!overlay) return;

  document.getElementById('storyCompleteCh').textContent    = lvl.chapter + ' Complete!';
  document.getElementById('storyCompleteTitle').textContent = lvl.title;

  const rewardEl = document.getElementById('storyCompleteReward');
  let rewardHtml = '';
  if (lvl.rewardText) rewardHtml += `<div style="margin-bottom:${lvl.unlockText?'8px':'0'}">${lvl.rewardText}</div>`;
  if (lvl.unlockText) {
    rewardHtml += `<div style="color:#aad4ff;font-size:0.78rem;">${lvl.unlockText}</div>`;
    if (lvl.unlockDetail) rewardHtml += `<div style="color:#667;font-size:0.68rem;margin-top:3px;">${lvl.unlockDetail}</div>`;
  }
  if (rewardHtml) { rewardEl.innerHTML = rewardHtml; rewardEl.style.display = 'block'; }
  else { rewardEl.style.display = 'none'; }

  const nextLvl = STORY_LEVELS.find(l => l.num === lvl.num + 1);
  const nextBtn = document.getElementById('storyCompleteNextBtn');
  if (nextBtn) {
    if (nextLvl && storyIsLevelUnlocked(nextLvl.num)) {
      nextBtn.style.display = '';
      nextBtn.textContent   = 'Next: ' + nextLvl.title + ' →';
      nextBtn.onclick = () => {
        overlay.style.display = 'none';
        document.getElementById('gameOverOverlay').style.display = 'none';
        startStoryLevel(nextLvl.num);
      };
    } else {
      nextBtn.style.display = 'none';
    }
  }

  const menuBtn = document.getElementById('storyCompleteMenuBtn');
  if (menuBtn) {
    menuBtn.onclick = () => {
      overlay.style.display = 'none';
      storyModeActive = false;
      backToMenu();
      setTimeout(openStoryMenu, 280);
    };
  }

  overlay.style.display = 'flex';
}

// ── Back to menu ──────────────────────────────────────────────────────────────
function storyOnBackToMenu() {
  if (!storyModeActive) return;
  storyModeActive     = false;
  storyPlayerOverride = null;
  storyFightSubtitle  = null;
  storyFightScript    = [];
  setTimeout(openStoryMenu, 300);
}

// ── Save integration ──────────────────────────────────────────────────────────
function getStoryDataForSave() {
  return JSON.parse(JSON.stringify(_storyProgress));
}

function restoreStoryDataFromSave(data) {
  if (!data || !data.completedLevels) return;
  _storyProgress = data;
  if (!('seenIntro' in _storyProgress)) _storyProgress.seenIntro = false;
  _saveProgress();
}

// ============================================================
// STORY MODE v2 — Chapter Progression, Tokens, Blueprints,
//                 Ability Store, Story Online unlock
// ============================================================

// ── Persistent state (separate key to avoid collision with v1) ───────────────
const _STORY2_KEY = 'smc_story2';

function _defaultStory2Progress() {
  return {
    chapter:           0,       // index into STORY_CHAPTERS2 (next to play)
    tokens:            0,
    blueprints:        [],      // blueprint keys earned
    unlockedAbilities: [],      // ability keys bought from store
    defeated:          [],      // chapter indices completed
    storyComplete:     false,
    // v3 hierarchy fields — added by migration for old saves
    arcCollapsed:      {},      // { arcId: bool } — user-toggled arc collapse state
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
      <div style="font-size:0.72rem;letter-spacing:1px;color:#667;text-transform:uppercase;margin-bottom:4px;">Chapter</div>
      <div style="font-size:1.05rem;font-weight:700;color:#dde4ff;margin-bottom:10px;">${ch.title}</div>
      ${affordable.length > 0 ? `
        <div style="font-size:0.74rem;color:#ffcc66;margin-bottom:10px;">
          💡 ${affordable.length} upgrade${affordable.length > 1 ? 's' : ''} affordable (${_story2.tokens} 🪙)
        </div>
      ` : ''}
      <div style="display:flex;flex-direction:column;gap:7px;max-width:240px;margin:0 auto;">
        <button id="_retryChapterBtn" style="padding:10px 0;background:linear-gradient(135deg,#1a5acc,#2277ee);border:none;border-radius:9px;color:#fff;font-weight:700;font-size:0.88rem;cursor:pointer;width:100%;">
          ↺ Retry Chapter
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

// ── Chapter definitions ───────────────────────────────────────────────────────
const STORY_CHAPTERS2 = [

  // ═══════════════ ACT I — FRACTURE POINT ═══════════════

  // ─────── Arc 0-0: The Incident (ids 0-5) ────────────────────────

  {
    id: 0, title: 'Fracture Point',
    world: '🌆 Home City',
    narrative: [
      'You were crossing the street when the air ripped.',
      'Not like a sound. Like a pressure change. Like the world held its breath.',
      '',
      'A figure stepped through the tear.',
      'They looked at you with recognition.',
      '"You. Of course it\'s you."',
      '',
      'You\'d never seen them before in your life.',
    ],
    fightScript: [
      { frame: 30,  speaker: 'GUIDE', text: 'A / D  to move.   W  to jump.   Space  to attack.', color: '#ffffaa', timer: 360 },
      { frame: 120, text: '"I\'ve crossed seventeen fracture points looking for you." Who is this person?', color: '#aaccff', timer: 260 },
      { frame: 300, speaker: 'GUIDE', text: 'Hold  S  to shield.   Q  = ability.   E  = super.', color: '#ffffaa', timer: 340 },
      { frame: 480, text: 'They\'re not trying to kill you. They\'re testing you. Why?', color: '#88ccff', timer: 230 },
      { frame: 620, text: 'Something in your hands knows what to do. You don\'t.', color: '#88ddff', timer: 220 },
    ],
    preText: 'They stepped through a tear in reality and they\'re looking right at you. Fight back.',
    opponentName: 'Fracture Scout', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'easy', opponentColor: '#88aacc',
    playerLives: 1,
    arena: 'homeYard',
    tokenReward: 12, blueprintDrop: null,
    postText: 'They land on their back, staring up at the sky. "You don\'t remember yet," they say. "But you will."',
  },

  {
    id: 1, title: 'First Contact',
    world: '🌆 Home City — Alley',
    noFight: true,
    narrative: [
      'The scout had disappeared into the tear before you could ask anything.',
      '',
      'Then your phone buzzed. Unknown number.',
      '"Don\'t follow them," the message read.',
      '"The portals are multiplying. There will be more scouts."',
      '"I\'ve been tracking fracture events for three years."',
      '"You\'re the first person one of them recognized."',
      '',
      '"My name is Veran. I need to know what you are."',
      '"I\'ll find you. Stay where the cracks are thickest."',
      '',
      '...You looked around.',
      'The entire street was laced with fracture lines.',
    ],
    preText: null,
    tokenReward: 8, blueprintDrop: null,
    postText: 'Whoever Veran is — they know more than you do. You decide to wait.',
  },

  {
    id: 2, title: 'The Seams',
    world: '🌆 Home City',
    narrative: [
      'Veran was still a voice in a message.',
      'The portals were not.',
      '',
      'Within an hour, there were hundreds.',
      'The air itself was bleeding light.',
      '',
      'And through each one: fighters.',
      'Organized. Armed. Purposeful.',
      '',
      '"Secure the fracture point," one of them said.',
      '"Eliminate all witnesses."',
    ],
    fightScript: [
      { frame: 60,  text: '🆕 UNLOCKED: Double Jump — press  W  again while airborne!', color: '#44ffaa', timer: 380 },
      { frame: 80,  text: '"Another untrained local. Clear them." Cold. Professional.', color: '#ff9966', timer: 240 },
      { frame: 320, text: 'You\'re not a witness. You\'re the reason they\'re here. Act like it.', color: '#aaccff', timer: 230 },
    ],
    preText: 'Armed fighters pouring through portals. They have orders. Yours are simpler: survive.',
    opponentName: 'Seam Enforcer', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'medium', opponentColor: '#cc4444',
    playerLives: 1,
    arena: 'suburb',
    tokenReward: 18, blueprintDrop: null,
    postText: 'You\'re standing in the middle of an invasion. And you\'re still standing.',
  },

  {
    id: 3, title: 'Disorientation',
    world: '🌆 Home City — Collapsed Block',
    noFight: true,
    narrative: [
      'Half a block had... shifted.',
      'Not fallen. Shifted — like someone had nudged a reality slightly to the left.',
      '',
      'People were wandering through it, not sure what they were looking at.',
      'You weren\'t sure either.',
      '',
      'Veran\'s message again: "The fragment inside you is reacting to the fracture field."',
      '"You may experience: disorientation, instinctive movement patterns,"',
      '" the feeling that you\'ve fought before."',
      '',
      '"Have you?"',
      '',
      '[ You haven\'t. Or you don\'t remember. ]',
      '',
      'You didn\'t answer. You kept moving.',
    ],
    preText: null,
    tokenReward: 5, blueprintDrop: null,
    postText: 'The fragment inside you. Whatever that means — you can feel something responding when things get close.',
  },

  {
    id: 4, title: 'Bleeding Sky',
    world: '🌆 Home City — Rooftops',
    narrative: [
      'You climbed.',
      'The rooftops gave you altitude, perspective — and more targets.',
      '',
      'From up here you could see the fracture lines in the sky.',
      'Purple and white. Like cracks in porcelain.',
      '',
      'And someone was up here waiting for you.',
      '"You really don\'t know what you are, do you?"',
    ],
    fightScript: [
      { frame: 80,  text: 'Exposed ground. Nowhere to hide. Keep moving or you\'re a target.', color: '#ffffaa', timer: 250 },
      { frame: 260, text: '"You move like someone who\'s done this before." You haven\'t.', color: '#cc88ff', timer: 250 },
      { frame: 440, text: 'The city is cracking open below you. Focus up here.', color: '#ff9966', timer: 230 },
      { frame: 620, text: 'They\'re not fighting to win. They\'re studying you.', color: '#88ccff', timer: 230 },
    ],
    preText: 'A rooftop observer — part scout, part interrogator. They\'ve been watching since the fracture opened.',
    opponentName: 'Rooftop Watcher', weaponKey: 'spear', classKey: 'ninja', aiDiff: 'medium', opponentColor: '#8855cc',
    playerLives: 2,
    arena: 'homeAlley',
    tokenReward: 25, blueprintDrop: null,
    postText: '"There are others like you," they say, falling. "In other fractures. You\'re not the first. But you might be the last." They hand you a torn data card before passing out. One word printed on it: ARCHITECT.',
  },

  {
    id: 5, title: 'Quiet Before',
    world: '🌆 Home City — Rooftop',
    noFight: true,
    narrative: [
      'Static.',
      '',
      'Then Veran\'s voice, clearer now.',
      '"I can see you. Rooftop, east side. Don\'t look up."',
      '',
      '"The scouts were from a faction called the Architect\'s Hand."',
      '"They report to the person who built the portals."',
      '"That person is trying to stop what\'s coming."',
      '',
      '"I know that sounds contradictory."',
      '"It is. There\'s a lot that is."',
      '',
      'A pause.',
      '',
      '"I found something in the fracture data today."',
      '"A signature. Older than the portals. Older than the Architects."',
      '"Whatever made the fracture system — it wasn\'t them."',
      '"Something else built the cage. They\'re just rats who found the keys."',
      '',
      '"Get to the lower city. Find the relay station."',
      '"I\'ll meet you somewhere in the middle."',
    ],
    preText: null,
    tokenReward: 10, blueprintDrop: null,
    postText: 'An older signature. Something that built the cage. You file it away. You keep moving.',
  },

  // ─────── Arc 0-1: City Collapse (ids 6-12) ──────────────────────

  {
    id: 6, title: 'Ground Zero',
    world: '🌆 City — Ground Zero',
    narrative: [
      '"You\'re not the first."',
      '',
      'That phrase echoed as you descended.',
      'If other fractures exist, there are others like you.',
      '',
      'But in your city, right now, the portal fighters are burning everything.',
      'You need to move through the chaos.',
      'Find the relay station.',
      '',
      'They won\'t let you pass.',
    ],
    fightScript: [
      { frame: 80,  text: 'They\'re burning the city in sections. Systematic. Someone planned this.', color: '#ff6644', timer: 250 },
      { frame: 300, speaker: 'GUIDE', text: '🆕 UNLOCKED: Ability — press  Q  to use your weapon\'s special move!', color: '#44ffaa', timer: 380 },
      { frame: 420, text: '"Clearing this block. Three minutes." You\'re not a civilian to them.', color: '#ff9966', timer: 240 },
    ],
    preText: 'A clearance squad — two fighters working a tactical sweep. Neither will back down.',
    opponentName: 'Clearance Unit', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'medium', opponentColor: '#885500',
    twoEnemies: true,
    secondEnemy: { weaponKey: 'sword', classKey: 'warrior', aiDiff: 'easy', color: '#664400' },
    playerLives: 3,
    arena: 'homeAlley',
    tokenReward: 30, blueprintDrop: null,
    postText: 'The block is quiet now. You find a data shard in the rubble — coordinates. And a name: "The Architect."',
  },

  {
    id: 7, type: 'exploration', title: 'The Long Walk',
    world: '🌆 City — Fractured Streets',
    narrative: [
      'The relay station signal was coming from deep in the city.',
      '',
      'Not a direct path. Never a direct path.',
      'The fracture had split the streets. Dimensional tears everywhere.',
      'People — or things that looked like people — wandering the gaps.',
      '',
      '"Walk east," Veran said through static.',
      '"The signal beacon is somewhere in the collapsed mall district."',
      '"You\'ll know it when you see it."',
      '',
      'You started walking.',
    ],
    objectName: 'Signal Beacon',
    style: 'city',
    worldLength: 4200,
    sky: ['#0d0d1e', '#1a1428'],
    groundColor: '#2a2a38',
    platColor: '#3a3a55',
    spawnEnemies: [
      { wx: 700,  name: 'Drifter',       weaponKey: 'sword',  classKey: 'none',    aiDiff: 'medium', color: '#665544' },
      { wx: 1100, name: 'Looter',         weaponKey: 'axe',    classKey: 'none',    aiDiff: 'medium', color: '#776655' },
      { wx: 1400, name: 'Scavenger',      weaponKey: 'axe',    classKey: 'none',    aiDiff: 'medium', color: '#887755' },
      { wx: 1900, name: 'Street Thug',    weaponKey: 'hammer', classKey: 'warrior', aiDiff: 'hard',   color: '#665533' },
      { wx: 2100, name: 'Patrol Bot',     weaponKey: 'spear',  classKey: 'warrior', aiDiff: 'hard',   color: '#556677' },
      { wx: 2500, name: 'Riot Unit',      weaponKey: 'sword',  classKey: 'warrior', aiDiff: 'hard',   color: '#445566' },
      { wx: 2900, name: 'Enforcer',       weaponKey: 'hammer', classKey: 'warrior', aiDiff: 'hard',   color: '#774433' },
      { wx: 3700, name: 'Beacon Guard',   weaponKey: 'sword',  classKey: 'warrior', aiDiff: 'hard',   color: '#556688', isGuard: true, health: 110 },
      { wx: 3780, name: 'Station Keeper', weaponKey: 'spear',  classKey: 'assassin', aiDiff: 'expert', color: '#445577', isGuard: true, health: 90  },
      { wx: 3860, name: 'Iron Warden',    weaponKey: 'hammer', classKey: 'tank',    aiDiff: 'hard',   color: '#334455', isGuard: true, health: 130 },
    ],
    playerLives: 3,
    tokenReward: 38, blueprintDrop: 'last_stand2',
    postText: 'The signal beacon. Still transmitting. Still pointing toward the relay station. You pocket it and keep moving.',
  },

  {
    id: 8, title: 'Cache Discovery',
    world: '🌆 City — Collapsed Underground',
    narrative: [
      'Under a collapsed overpass: a door.',
      '',
      'Not standard. Reinforced. Sealed with a fracture-lock.',
      'The fragment in you resonated with it — pulsed — and the door opened.',
      '',
      'Inside: a cache. Equipment. Data. Weapons.',
      'And a guard who hadn\'t expected anyone to open that door.',
      '',
      '"That lock was fragment-gated," they said.',
      '"Which means you\'re carrying a piece of the original fracture."',
      '"No one walks away with that."',
    ],
    fightScript: [
      { frame: 60,  text: 'Underground cache guard. Cornered and armed. No room to retreat.', color: '#ff9944', timer: 250 },
      { frame: 80,  speaker: 'GUIDE', text: '🆕 UNLOCKED: Super — press  E  when the meter fills for a devastating move!', color: '#44ffaa', timer: 400 },
      { frame: 380, text: 'The cache has equipment. Win and it\'s yours.', color: '#aaccff', timer: 230 },
    ],
    preText: 'A cache guardian — fragment-gate security. They know exactly what you\'re carrying.',
    opponentName: 'Cache Guardian', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#446688',
    playerLives: 2,
    arena: 'homeAlley',
    tokenReward: 42, blueprintDrop: 'void_step2',
    postText: 'The cache is open. You take what you need. The data inside mentions the relay station — and a warning: "Do not let the fragment bearer reach Veran. They will change everything."',
  },

  {
    id: 9, title: 'Veran\'s Field Notes',
    world: '🌆 City — Street Level',
    noFight: true,
    narrative: [
      'Veran\'s voice through your earpiece, steady and precise.',
      '',
      '"I need to tell you what I know. Not what I\'ve guessed. What I know."',
      '',
      '"The fracture system was designed. Someone built it — dimensions, portals,"',
      '" fragment bearers, all of it — as a mechanism. A machine."',
      '"The Architects — including me — built the portals to contain a rift."',
      '"We were hired. By something that called itself the Creator."',
      '"I thought we were doing good work. Sealing fractures, protecting dimensions."',
      '"Then the payments stopped and the instructions changed."',
      '',
      '"It wasn\'t containment. It was cultivation."',
      '"The fragment inside you is the harvest."',
      '',
      'A long pause.',
      '"I\'m sorry. I didn\'t know until recently."',
      '"Now I\'m trying to undo it."',
      '"So are you — whether you know it yet or not."',
    ],
    preText: null,
    tokenReward: 15, blueprintDrop: null,
    postText: 'Cultivation. Not containment. You hold that thought alongside everything else as you approach the lava district.',
  },

  {
    id: 10, title: 'The Lava Crossing',
    world: '🌋 City — Industrial District',
    narrative: [
      'The industrial quarter had been swallowed.',
      'Lava from a destabilized portal — thermal bleed from a volcanic dimension.',
      'The floor was literally melting.',
      '',
      'And on the other side: a direct line to the portal source.',
      'The Architect\'s relay station.',
      '',
      'All you had to do was cross.',
    ],
    fightScript: [
      { frame: 60,  text: '⚠️ Lava below. Keep off the floor. Use the platforms.', color: '#ff6600', timer: 280 },
      { frame: 280, text: '"The ground is irrelevant if you\'re dead before you reach it."', color: '#ff9944', timer: 250 },
      { frame: 500, text: 'The platforms are shifting. They\'re using the environment as a weapon.', color: '#ffcc44', timer: 240 },
    ],
    preText: 'A guardian of the relay station — fights atop the industrial platforms above lava. Single mistake ends it.',
    opponentName: 'Lava Gate Guardian', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#cc4400',
    armor: ['helmet', 'chestplate'],
    playerLives: 2,
    arena: 'lava',
    tokenReward: 45, blueprintDrop: null,
    postText: 'The relay station is ahead. The lava closes behind you. There\'s no going back.',
  },

  {
    id: 11, title: 'The Relay Station',
    world: '🌋 City — Architect\'s Relay',
    narrative: [
      'The relay station hummed like a living thing.',
      'Crystal pillars. Dimensional conduits. Equations scratched on every surface.',
      '',
      '"You made it further than any of the others."',
      '',
      'A woman stepped out of the light.',
      'Not hostile. Or not yet.',
      '"My name is Veran. I built the portals. And I\'m trying to close them."',
      '"But first I need to know if you\'re a threat or an asset."',
    ],
    storeNag: '⚠️ Hardest fight yet. 1 life. Use your tokens before attempting.',
    fightScript: [
      { frame: 80,  text: '"I\'ve been running calculations on you since the fracture opened." Great. A scientist.', color: '#88ccff', timer: 280 },
      { frame: 280, text: 'She\'s not going all out. She\'s still measuring you.', color: '#aaccff', timer: 250 },
      { frame: 480, text: '"Impressive. The fragment responds to your combat state." What does that mean?', color: '#cc88ff', timer: 260 },
      { frame: 650, text: 'Prove you\'re an asset. Win.', color: '#ffffff', timer: 220 },
    ],
    preText: 'Veran — the Architect. She built the portals to contain something, and now she\'s testing whether you\'re friend or threat.',
    opponentName: 'Veran — The Architect', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#4488dd',
    armor: ['helmet'],
    playerLives: 1,
    arena: 'lava',
    tokenReward: 55, blueprintDrop: 'time_stop2',
    postText: '"Good," Veran says, lying on the ground. "You\'re an asset. Get up — I\'ll explain everything. The fracture fragment inside you is a key. And someone is trying to take it."',
  },

  {
    id: 12, title: 'What Veran Knew',
    world: '🌋 City — Relay Station',
    narrative: [
      '"There\'s a rift entity," Veran said.',
      '"It exists between dimensions. It feeds on fracture energy."',
      '"Every time two universes crack against each other, it gets stronger."',
      '',
      '"The fragment inside you is the largest piece of pure fracture energy in any dimension I\'ve mapped."',
      '',
      '"Which means it wants it."',
      '"And it\'s already sending collectors."',
      '',
      'As if on cue, a portal opened behind you.',
    ],
    fightScript: [
      { frame: 60,  text: 'A Rift Collector — not human. Designed to extract fracture fragments.', color: '#ff44cc', timer: 280 },
      { frame: 260, text: 'It doesn\'t feel pain. It doesn\'t negotiate. Destroy it.', color: '#ff6644', timer: 240 },
      { frame: 480, text: '"The rift entity is watching through it," Veran says. "Let it watch you win."', color: '#cc44ff', timer: 260 },
    ],
    preText: 'A Rift Collector — an entity sent from between dimensions to extract the fracture fragment from you.',
    opponentName: 'Rift Collector', weaponKey: 'hammer', classKey: 'tank', aiDiff: 'hard', opponentColor: '#aa00ff',
    armor: ['helmet', 'chestplate'],
    playerLives: 2,
    arena: 'lava',
    tokenReward: 60, blueprintDrop: null,
    postText: '"There will be more," Veran says. "We need to go through the primary fracture — into the space between dimensions. Find the rift entity\'s anchor point and destroy it." She hands you a compass that points toward rifts. "Follow it."',
  },

  // ═══════════════ ACT II — INTO THE WOUND ═══════════════

  // ─────── Arc 1-0: Fracture Network (ids 13-19) ──────────────────

  {
    id: 13, title: 'Between Worlds',
    world: '🌀 Fracture Network',
    narrative: [
      'The primary fracture swallowed you whole.',
      '',
      'There was no up. No down.',
      'Just space folding around you.',
      '',
      'Veran had warned you: "Fracture space has laws. They just aren\'t your laws."',
      '"Fight as if gravity could reverse itself."',
      '"Because it can."',
    ],
    fightScript: [
      { frame: 60,  text: '⚠️ Fracture gravity — the world may invert mid-fight. Keep your footing.', color: '#cc44ff', timer: 300 },
      { frame: 80,  text: 'Another traveler. Not friendly. Not from your dimension.', color: '#8866ff', timer: 250 },
      { frame: 340, text: '"You don\'t belong here." You\'ve stopped caring about that.', color: '#aa88ff', timer: 230 },
    ],
    preText: 'A fracture wanderer — someone trapped between dimensions who\'s turned hostile. The gravity is wrong in here.',
    opponentName: 'Fracture Wanderer', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'medium', opponentColor: '#7744cc',
    playerLives: 3,
    arena: 'space',
    tokenReward: 50, blueprintDrop: null,
    postText: 'The fracture network is enormous. Caverns of collapsed reality. You follow the compass.',
  },

  {
    id: 14, title: 'Fragment Theory',
    world: '🌀 Fracture Network — Stable Pocket',
    noFight: true,
    narrative: [
      'A stable pocket. Rare in fracture space — a bubble where the laws held.',
      '',
      'Veran materialized beside you. Not in person — a projection through the dimensional comm.',
      '',
      '"The fragment is doing something I didn\'t predict."',
      '"It\'s not just energy storage. It\'s learning."',
      '"Every fight you have, it absorbs the pattern. Your pattern."',
      '"It\'s becoming... an extension of you."',
      '',
      '"That\'s why the collectors are getting more aggressive."',
      '"A static fragment is a resource. An adaptive one is a weapon."',
      '"The rift entity doesn\'t just want to take it anymore."',
      '"It wants to contain it. Before it becomes something it can\'t control."',
      '',
      'Her projection flickered.',
      '"I\'ll be in contact. Keep the compass moving."',
    ],
    preText: null,
    tokenReward: 20, blueprintDrop: null,
    postText: 'An adaptive fragment. A weapon becoming you. You\'re not sure whether that\'s reassuring or not.',
  },

  {
    id: 15, title: 'Mirror Fracture',
    world: '🌀 Fracture Network — Mirror Pocket',
    narrative: [
      'The compass led you into a mirror pocket.',
      '',
      'A dimension that was your world — but not.',
      'Everything inverted. Left was right. Strong was weak.',
      '',
      'And in this mirror world: a version of you.',
      'Or something wearing your shape.',
      '"You shouldn\'t be here," it said.',
      '"This is where the fragment leads you. Back to yourself."',
    ],
    fightScript: [
      { frame: 60,  text: '⚠️ MIRROR WORLD — your movement controls are inverted. A is right, D is left.', color: '#ff44aa', timer: 340 },
      { frame: 90,  text: 'It moves exactly like you — because it learned from your fracture echo.', color: '#cc66ff', timer: 260 },
      { frame: 360, text: '🆕 UNLOCKED: Shield Counter — release S at the exact moment of impact to reflect damage!', color: '#44ffaa', timer: 380 },
      { frame: 560, text: '"You can\'t defeat yourself." Wrong.', color: '#ff88ff', timer: 230 },
    ],
    preText: 'Your fracture echo — a mirror-self shaped by the fragment\'s energy. Controls are inverted in this pocket.',
    opponentName: 'Fracture Echo', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#cc66cc',
    playerLives: 2,
    arena: 'space',
    tokenReward: 60, blueprintDrop: 'reflect2',
    postText: 'The echo dissolves. The mirror pocket shatters. The compass spins wildly, then settles — pointing deeper.',
  },

  {
    id: 16, title: 'The Shattered Mirror',
    world: '🌀 Fracture Network — Debris Field',
    noFight: true,
    narrative: [
      'Pieces of the mirror pocket drifted around you.',
      'Fragments of the echo. Fragments of you.',
      '',
      'In one of the larger shards: a reflection that wasn\'t yours.',
      '',
      'Taller. Darker. Eyes like fracture lines.',
      'It looked at you for exactly one second — then dissolved.',
      '',
      'Veran\'s voice: "Did you see something in the debris field?"',
      '"...Something that looked engineered?"',
      '',
      'You described it.',
      '',
      'A very long pause.',
      '"That\'s a Creator-class construct. A scout."',
      '"The Creator knows where you are now."',
      '"It\'s been watching since before the portals opened."',
      '"That signature I found — the one older than the Architects —"',
      '"That\'s it. And it just looked directly at you."',
      '',
      '"Move. Now."',
    ],
    preText: null,
    tokenReward: 15, blueprintDrop: null,
    postText: 'The Creator knows. It\'s been watching. You move faster.',
  },

  {
    id: 17, title: 'Deeper In',
    world: '🌀 Fracture Network — Collapsed Corridor',
    narrative: [
      'Another wanderer.',
      '',
      'But not lost — hunting.',
      'Someone had hired them to find fragment bearers.',
      '"The bounty is the same whether you\'re conscious or not," they said.',
      '"I\'d prefer conscious, but I\'m flexible."',
      '',
      'They were good. Fast. The kind of fighter who\'d lived in fracture space long enough',
      'to forget what normal gravity felt like.',
      '',
      'You had the compass. They had experience.',
    ],
    fightScript: [
      { frame: 60,  text: '"Fragment bearer. I\'ve taken six of you already." Not seven.', color: '#aa66ff', timer: 270 },
      { frame: 260, text: 'They know the space better than you. Use the fragment — stop compensating.', color: '#8855cc', timer: 250 },
      { frame: 480, text: 'They\'re slowing. The fragment is accelerating. Stay in it.', color: '#cc88ff', timer: 240 },
    ],
    preText: 'A bounty hunter specializing in fragment bearers. They\'ve done this before. You haven\'t. Adapt.',
    opponentName: 'Fracture Bounty Hunter', weaponKey: 'spear', classKey: 'ninja', aiDiff: 'hard', opponentColor: '#996688',
    playerLives: 2,
    arena: 'space',
    tokenReward: 65, blueprintDrop: null,
    postText: '"Who hired you?" They just shake their head. Even beaten, some contracts hold. You leave them and keep moving.',
  },

  {
    id: 18, title: 'The Void Arena',
    world: '🌀 Fracture Network — Collapsed Dimension',
    narrative: [
      'A collapsed dimension.',
      'No sky. No ground. Just floating platforms',
      'and the silence of a dead universe.',
      '',
      'Here, something had set up camp.',
      'A collector — much larger than the one before.',
      '"The fragment," it said, in a voice like grinding stone.',
      '"Give it to me and your universe survives."',
      '"Refuse — and the rift grows until every fracture you know collapses."',
      '',
      'You don\'t negotiate with things that threaten your world.',
    ],
    storeNag: '⚠️ Boss-tier collector. 1 life. Spend tokens first.',
    fightScript: [
      { frame: 80,  text: '"I have consumed thirty-seven fracture fragments." It\'s bragging. Good.', color: '#aa44ff', timer: 280 },
      { frame: 340, text: 'The platforms are moving. It controls them. Don\'t stay still.', color: '#ff6644', timer: 260 },
      { frame: 580, text: '"You are stronger than I expected." Then hit harder.', color: '#cc88ff', timer: 240 },
    ],
    preText: 'The Void Collector — a veteran fragment extractor from the rift entity. Boss-tier threat. One life.',
    opponentName: 'Void Collector', weaponKey: 'hammer', classKey: 'tank', aiDiff: 'expert', opponentColor: '#7700cc',
    armor: ['helmet', 'chestplate'],
    playerLives: 1,
    arena: 'space',
    tokenReward: 75, blueprintDrop: null,
    postText: 'It collapses. The platforms stop moving. In the silence, Veran\'s voice crackles through a dimensional comm: "I found it. The anchor point is in the Multiversal Core. But there\'s a problem — it\'s guarded. By an entire army."',
  },

  {
    id: 19, title: 'Static from the Core',
    world: '🌀 Fracture Network — Signal Corridor',
    noFight: true,
    narrative: [
      'Through the static, something else found your frequency.',
      '',
      'Not Veran.',
      '',
      'A voice that felt like the fracture network itself was speaking.',
      'Slow. Measured. Neither warm nor cold.',
      '',
      '"Fragment bearer. You have passed the network\'s gatekeepers."',
      '"The Multiversal Core lies ahead."',
      '"I built the Core. I built the collectors. I built the rift."',
      '"I built Veran\'s portals before she knew she was working for me."',
      '',
      '"I am telling you this not as a threat."',
      '"I am telling you this because I want you to understand the shape of what you\'re walking into."',
      '"The rift entity was never the enemy. It was a piece of the system that malfunctioned."',
      '"You are the correction."',
      '',
      '"Come to the Core. Let\'s finish this cleanly."',
      '',
      'The frequency cut out.',
      'Veran\'s voice immediately replaced it: "That was the Creator. Do not trust it."',
      '"I don\'t know what it wants. But it\'s never spoken to a fragment bearer directly before."',
      '"Something about you is different. Stay alert."',
    ],
    preText: null,
    tokenReward: 25, blueprintDrop: null,
    postText: 'The Creator spoke to you directly. Veran has never heard of it doing that. You\'re something new in this system.',
  },

  // ─────── Arc 1-1: The Core (ids 20-27) ──────────────────────────

  {
    id: 20, title: 'Army of Echoes',
    world: '🌀 Fracture Network — Echo Corridor',
    narrative: [
      'Veran wasn\'t exaggerating.',
      '',
      'The echo corridor was full of fracture-born fighters.',
      'Some looked like people from your world.',
      'Some looked like no one you\'d ever imagine.',
      'All of them had the same hollow eyes.',
      'All of them were pointed at you.',
      '',
      '"Fragment detected. Engage."',
    ],
    fightScript: [
      { frame: 80,  text: 'Echo fighters — hollow replicas running on fracture energy. No soul, all weapon.', color: '#aa66ff', timer: 270 },
      { frame: 320, text: 'They never tire. You have to end this fast.', color: '#ff9944', timer: 240 },
      { frame: 520, text: 'One down. But you can feel the fragment — it\'s charging with each fight.', color: '#88ccff', timer: 250 },
    ],
    preText: 'Echo fighters blocking the corridor. Two at once. No breathing room.',
    opponentName: 'Echo Fighter', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', opponentColor: '#9955cc',
    twoEnemies: true,
    secondEnemy: { weaponKey: 'spear', classKey: 'ninja', aiDiff: 'hard', color: '#7733aa' },
    armor: ['helmet'],
    playerLives: 2,
    arena: 'space',
    tokenReward: 70, blueprintDrop: 'rage_mode2',
    postText: 'The corridor clears. Veran is waiting at the other end, battered but alive. "The Multiversal Core is through the rift ahead. Whatever the rift entity uses as a body will be in there. We end this here."',
  },

  {
    id: 21, title: 'Collector\'s Network',
    world: '🌀 Fracture Core — Junction Node',
    noFight: true,
    narrative: [
      'The junction node.',
      '',
      'A meeting point where dimensional currents crossed.',
      'And in its center: a terminal. Still active.',
      '',
      'The data inside was clear.',
      'The rift entity hadn\'t built the collector network.',
      'It had inherited it — when it became too large for the Creator to control.',
      '',
      'The collectors were originally the Creator\'s instruments.',
      'Fragment extraction. Fragment storage. Fragment weaponization.',
      'The rift entity just... found the infrastructure already running.',
      '',
      '"Veran." Your voice was flat.',
      '"You worked for the Creator. You built portals for it."',
      '"Did you know about this?"',
      '',
      'A pause.',
      '"...Not all of it. I knew about the portals."',
      '"I didn\'t know about the collectors until after the rift broke containment."',
      '"By then I was trying to undo it. I\'ve been trying ever since."',
      '',
      '"I believe you." You didn\'t have a choice.',
      '"But after this is over — we\'re going to talk about the rest."',
    ],
    preText: null,
    tokenReward: 30, blueprintDrop: null,
    postText: 'The system was built before the rift entity existed. The Creator built all of it. And Veran was a tool it used. That\'s not comfortable. But it\'s not today\'s problem.',
  },

  {
    id: 22, title: 'The Gate',
    world: '🌀 Fracture Core — Entry',
    narrative: [
      'The rift entity felt you coming.',
      '',
      'It sent its best.',
      '',
      'A fragment guardian — a being that had consumed so many fragments',
      'it had become something barely recognizable as a fighter.',
      '',
      '"Veran cannot help you here," it said.',
      '"She stays behind. You walk in alone."',
      '"Unless you\'d rather not walk in at all."',
    ],
    storeNag: '⚠️ Fragment Guardian. 1 life. This is the gate before the final push. Spend everything.',
    fightScript: [
      { frame: 70,  text: 'It\'s absorbed pieces of dozens of fighters. Every stolen ability is a weapon.', color: '#ff44cc', timer: 290 },
      { frame: 330, text: '"Your fragment wants to join mine." Ignore it.', color: '#cc44ff', timer: 260 },
      { frame: 580, text: 'You can feel the fragment inside you responding. Let it.', color: '#aa66ff', timer: 250 },
    ],
    preText: 'The Fragment Guardian — the rift entity\'s body-double. Consumed dozens of fragment-bearers. 1 life.',
    opponentName: 'Fragment Guardian', weaponKey: 'hammer', classKey: 'tank', aiDiff: 'expert', opponentColor: '#6600aa',
    armor: ['helmet', 'chestplate', 'leggings'],
    playerLives: 1,
    arena: 'space',
    tokenReward: 90, blueprintDrop: null,
    postText: 'It shatters. The fracture core opens. Veran takes your hand. "You know what\'s in there," she says. "You\'ve known since the first portal opened." You step inside.',
  },

  {
    id: 23, title: 'Creator\'s Mark',
    world: '🌀 Fracture Core — Inner Threshold',
    noFight: true,
    narrative: [
      'The Core\'s inner threshold.',
      '',
      'And burned into its walls — a symbol.',
      'Not dimensional runes. Not fracture script.',
      'Something older.',
      '',
      'Veran went pale.',
      '"I\'ve seen this once before. In the original portal blueprints."',
      '"The Creator\'s mark. It\'s claiming this space."',
      '',
      '"It built the rift entity as a harvester."',
      '"It built the Architects as engineers."',
      '"It built the fragment bearers as..." She stopped.',
      '',
      '"As what?"',
      '',
      '"I don\'t know yet. But this mark means it was here before us."',
      '"It knows exactly what you\'re about to do."',
      '"And it\'s letting you."',
      '',
      'That was the part that bothered you most.',
      'Not the obstacle. The open door.',
    ],
    preText: null,
    tokenReward: 30, blueprintDrop: null,
    postText: 'It\'s letting you. Whatever the Creator built you to be — it wants you to reach the center. That\'s the most unsettling thing you\'ve learned yet.',
  },

  {
    id: 24, title: 'Core Approach',
    world: '🌀 Fracture Core — Ring Seven',
    narrative: [
      'Ring Seven.',
      '',
      'The rift entity\'s core had seven rings of defense.',
      'You\'d pushed through six.',
      '',
      'The seventh ring was different.',
      'Not echo fighters.',
      'Real ones.',
      'People who had chosen to defend the core.',
      '"The rift entity gave us a purpose," one said.',
      '"You\'re going to take that away."',
      '"We won\'t let you."',
    ],
    fightScript: [
      { frame: 80,  text: 'Core Defenders — not constructs. Real fighters with real conviction.', color: '#8899ff', timer: 280 },
      { frame: 300, text: 'They\'re afraid of what losing means. Don\'t give them a reason to surrender.', color: '#6688ff', timer: 260 },
      { frame: 520, text: 'You\'re not taking their purpose. You\'re making it unnecessary.', color: '#aaccff', timer: 250 },
    ],
    preText: 'The Core Defenders — living fighters who chose this. Two opponents. 2 lives.',
    opponentName: 'Core Defender', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#4466cc',
    twoEnemies: true,
    secondEnemy: { weaponKey: 'axe', classKey: 'warrior', aiDiff: 'hard', color: '#3355aa' },
    armor: ['helmet', 'chestplate'],
    playerLives: 2,
    arena: 'space',
    tokenReward: 85, blueprintDrop: null,
    postText: 'They fall. But not with hatred. One of them looks up at you and says, simply: "Make it mean something." You intend to.',
  },

  {
    id: 25, title: 'Deep Fragment',
    world: '🌀 Fracture Core — The Crucible',
    narrative: [
      'The Crucible.',
      '',
      'Where the rift entity tested and broke fragment bearers who made it this far.',
      'The last forty-seven had failed here.',
      '',
      'The Crucible\'s champion had absorbed pieces of each of them.',
      'It carried forty-seven fragment signatures.',
      'Each one a memory of someone who hadn\'t been enough.',
      '',
      'It looked at you.',
      '"Forty-eight," it said.',
    ],
    storeNag: '⚠️ The Crucible Champion. Expert-level. 1 life. The hardest fight before the Core\'s Eye.',
    fightScript: [
      { frame: 60,  text: '"I have beaten every fragment bearer who reached this room." You\'re forty-eight. Different.', color: '#ff44cc', timer: 290 },
      { frame: 340, text: 'It\'s using the fighting styles of everyone it absorbed. No pattern — every pattern.', color: '#cc44aa', timer: 270 },
      { frame: 600, text: 'The fragment is pulling you forward. Trust it.', color: '#aa66ff', timer: 250 },
      { frame: 780, text: 'You\'re going to be forty-eight. But not the way it expects.', color: '#ffffff', timer: 240 },
    ],
    preText: 'The Crucible Champion — absorbed 47 fragment bearers. An amalgam of every fighting style that failed before yours. 1 life.',
    opponentName: 'Crucible Champion', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'expert', opponentColor: '#880044',
    armor: ['helmet', 'chestplate', 'leggings'],
    playerLives: 1,
    arena: 'space',
    tokenReward: 110, blueprintDrop: 'fracture_surge2',
    postText: 'It collapses. And as it dissolves, the forty-seven fragment signatures it held — they release. Freed. A wave of light flows into your fragment. The compass burns white. The core is open.',
  },

  {
    id: 26, title: 'The Weight of It',
    world: '🌀 Fracture Core — Eye Antechamber',
    noFight: true,
    narrative: [
      'Before the Core\'s Eye: a chamber of silence.',
      '',
      'Just you and Veran.',
      '',
      '"I need to tell you something I\'ve been putting off."',
      '',
      '"The closure protocol requires a fragment anchor."',
      '"Something that holds the rift open from the inside while the Architects seal it from the outside."',
      '"The fragment inside you is the only thing with enough resonance to serve as that anchor."',
      '',
      '"If you do this — the fragment will be consumed in the closure."',
      '"And I don\'t know what that means for you."',
      '"No fragment bearer has survived a closure event."',
      '"But no fragment bearer has ever had a fragment this adapted, either."',
      '',
      '"I\'m not telling you it\'s certain death."',
      '"I\'m telling you it\'s an unknown."',
      '"And you deserve to know that before you walk in."',
      '',
      'A long silence.',
      '',
      '"Okay," you said.',
      '"Let\'s go."',
    ],
    preText: null,
    tokenReward: 40, blueprintDrop: null,
    postText: 'Unknown. Not impossible. You\'ve handled unknown before. The Core\'s Eye is ahead. Whatever waits inside — it ends here.',
  },

  {
    id: 27, title: 'Core Entry',
    world: '🌀 Fracture Core — The Eye',
    narrative: [
      'The Eye of the Core.',
      '',
      'Not the rift entity itself — its outer face.',
      'A manifestation of condensed fracture energy, wearing the shape of a fighter',
      'to engage you on terms you\'d understand.',
      '',
      '"I am not your enemy," it said.',
      '"I am a door that tests who deserves to open it."',
      '"Every fragment bearer who came here wanted something."',
      '"Power. Safety. Revenge."',
      '',
      '"What do you want?"',
      '',
      'You didn\'t answer.',
      'You fought.',
    ],
    storeNag: '⚠️ The Core\'s Eye — mini-boss tier. 1 life. This is the Act II finale.',
    fightScript: [
      { frame: 80,  text: '"Your want is simple. That makes you the most dangerous thing I\'ve faced."', color: '#8844ff', timer: 300 },
      { frame: 320, text: 'It\'s probing. Looking for a weakness that isn\'t there. Keep showing it none.', color: '#aa66ff', timer: 270 },
      { frame: 580, text: '"You\'re not afraid of the unknown." Correct.', color: '#cc88ff', timer: 250 },
      { frame: 780, text: 'The door is almost open. One more push.', color: '#ffffff', timer: 240 },
    ],
    preText: 'The Core\'s Eye — the gate to the rift entity itself. A manifestation that tests intent. Mini-boss. 1 life.',
    opponentName: 'The Eye', weaponKey: 'hammer', classKey: 'tank', aiDiff: 'expert', opponentColor: '#6633cc',
    armor: ['helmet', 'chestplate'],
    playerLives: 1,
    arena: 'space',
    tokenReward: 130, blueprintDrop: 'ghost_step2',
    postText: 'The Eye dissolves. The door opens. Beyond it: the rift entity. The first fragment bearer. Ten thousand years of waiting. And behind it, somehow — the beginning of everything that comes next.',
  },

  // ══════════════════════════════════════════════════════════════════
  // ACT III — THE ARCHITECTS (ids 28–44)
  // The Multiversal Core, Forest & Ice, Ruins. The four Architects.
  // ══════════════════════════════════════════════════════════════════

  // ─────── Arc 2-0: Multiversal Core (ids 28–34) ───────────────────

  {
    id: 28, title: 'Gravity Anomaly',
    world: '⚛️ Multiversal Core — Flux Zone',
    narrative: [
      'The flux zone.',
      '',
      'Gravity reversed every ninety seconds.',
      'The platform you were standing on became the ceiling.',
      'The ceiling became the floor.',
      '',
      'The rift entity had assigned its most adaptable fighters here.',
      'People who had lived in the flux long enough to stop caring about which way was down.',
      '',
      '"You\'ll fall," one said.',
      '"Everyone does."',
    ],
    fightScript: [
      { frame: 60,  text: '⚠️ GRAVITY FLUX ZONE — gravity will invert every 90 seconds. Watch the ceiling.', color: '#ff8800', timer: 340 },
      { frame: 80,  text: 'They\'ve adapted. You have seconds. Figure it out.', color: '#ffcc44', timer: 250 },
      { frame: 360, text: 'Gravity just inverted. Reset. Keep fighting.', color: '#88ccff', timer: 230 },
    ],
    preText: 'Flux zone veterans. They invert with gravity as naturally as breathing. You don\'t. Yet.',
    opponentName: 'Flux Veteran', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', opponentColor: '#ff8800',
    armor: ['helmet'],
    playerLives: 3,
    arena: 'space',
    tokenReward: 75, blueprintDrop: null,
    postText: 'You didn\'t fall. Veran sounds surprised: "Your body adapted to the flux faster than any fragment-bearer in the historical record. The fragment is helping you."',
  },

  {
    id: 29, title: 'The Orbital Duel',
    world: '⚛️ Multiversal Core — Orbital Ring',
    narrative: [
      'The orbital ring circled the core\'s eye.',
      'Two fighters.',
      'The rift entity\'s champions.',
      'They had been waiting specifically for you.',
      '',
      '"We were fragment bearers once," one said.',
      '"The entity took our pieces. Now we guard it."',
      '"Not by choice. But it\'s what we are."',
      '',
      'You could see the fragment-energy in their eyes.',
      'Stolen. Trapped.',
    ],
    fightScript: [
      { frame: 80,  text: 'Former fragment bearers. They still carry the energy — it\'s just not theirs anymore.', color: '#cc66ff', timer: 290 },
      { frame: 300, text: 'Don\'t fight with anger. The fragment responds to intent. Fight with purpose.', color: '#aaccff', timer: 270 },
      { frame: 520, text: '"Release us," one whispers mid-fight. "Destroy what holds us." Do it.', color: '#ff88cc', timer: 260 },
    ],
    preText: 'Stolen fragment bearers — enslaved champions of the rift entity. Dangerous and tragic. 2 lives.',
    opponentName: 'Stolen Champion', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#9944cc',
    twoEnemies: true,
    secondEnemy: { weaponKey: 'hammer', classKey: 'tank', aiDiff: 'hard', color: '#6622aa' },
    playerLives: 2,
    arena: 'space',
    tokenReward: 85, blueprintDrop: null,
    postText: 'Their energy dissolves upward. Free. A wave of light from their fragments flows into yours — the fragment grows stronger. Veran: "That\'s not supposed to happen. You\'re absorbing other fragments. The entity will feel that."',
  },

  {
    id: 30, title: 'Echo Storm',
    world: '⚛️ Multiversal Core — Storm Eye',
    narrative: [
      'The rift entity felt it.',
      '',
      'It sent an echo storm — a cascade of fracture-born fighters',
      'generated from residual dimensional energy.',
      'Infinite. Endless.',
      '',
      'Veran: "You can\'t fight them all. But you don\'t have to."',
      '"The storm has an eye. A generator. Destroy the generator and the echoes collapse."',
      '"The generator is defended by one fighter — its most refined echo."',
      '"It looks like someone you know."',
    ],
    storeNag: '⚠️ Storm echo. Expert-level. 1 life. Spend tokens first.',
    fightScript: [
      { frame: 80,  text: '"I know everything about you," the echo says. "I am everything you\'re afraid of."', color: '#ff44ff', timer: 290 },
      { frame: 320, text: 'It does know your moves. So use moves you\'ve never used before.', color: '#aaccff', timer: 270 },
      { frame: 560, text: '"You can\'t destroy what you\'re made of." Then become something new.', color: '#cc88ff', timer: 260 },
    ],
    preText: 'The Storm Echo — a perfected copy built from everything the rift entity learned watching you. 1 life.',
    opponentName: 'Storm Echo', weaponKey: 'sword', classKey: 'ninja', aiDiff: 'expert', opponentColor: '#ff66ff',
    armor: ['helmet', 'chestplate'],
    playerLives: 1,
    arena: 'space',
    tokenReward: 100, blueprintDrop: null,
    postText: 'The generator explodes. The storm collapses. Veran: "The core\'s eye is open. The rift entity is exposed. But...it\'s not what I expected. It\'s not a monster. It\'s something that was once like you." You keep moving.',
  },

  {
    id: 31, title: 'The Core\'s Eye',
    world: '⚛️ Multiversal Core — Eye',
    narrative: [
      'At the center of everything: not a monster.',
      '',
      'A person.',
      'Or what remained of one.',
      '',
      '"I was the first fragment bearer," it said.',
      '"Ten thousand years ago. The fracture took everything I had — and left me here."',
      '"Every fragment I\'ve consumed since was an attempt to fill the void."',
      '',
      '"Give me yours. Let me rest."',
      '',
      'It was the most honest thing anyone had said to you since this began.',
      'You still said no.',
    ],
    fightScript: [
      { frame: 80,  text: 'Ten thousand years of pain compressed into combat. Feel the weight of it.', color: '#aa88ff', timer: 300 },
      { frame: 340, text: '"You understand now. You know what you\'re fighting." Yes. That\'s why you\'re doing it.', color: '#cc88ff', timer: 280 },
      { frame: 600, text: 'It\'s not trying to kill you. It\'s testing if you can set it free.', color: '#88aaff', timer: 260 },
    ],
    preText: 'The Rift Entity — an ancient fragment bearer, not a monster. It wants release. Your fragment may be the key. 2 lives.',
    opponentName: 'The Rift Entity', weaponKey: 'hammer', classKey: 'tank', aiDiff: 'hard', opponentColor: '#8844ff',
    armor: ['helmet', 'chestplate', 'leggings'],
    playerLives: 2,
    arena: 'space',
    tokenReward: 110, blueprintDrop: 'ghost_step2',
    postText: 'It falls — but doesn\'t dissolve. "You\'re strong enough," it whispers. "But the fragment alone isn\'t enough to close the rift. You need the Architects." It looks at Veran. "All of them."',
  },

  {
    id: 32, title: 'The Weight of the Core',
    world: '⚛️ Multiversal Core — Observation Deck',
    noFight: true,
    narrative: [
      'The rift entity had given you a moment.',
      '',
      '"Watch the fragment," it said.',
      '"Just — watch it."',
      '',
      'You did.',
      '',
      'Every other fragment bearer had reported the fragment trying to consume them.',
      'Pressing outward. Testing the edges of the person carrying it.',
      '',
      'Yours wasn\'t doing that.',
      '',
      'It was still.',
      'Warm.',
      'Like something that had been running for a long time',
      'and had finally decided to stop.',
      '',
      'Veran noticed too.',
      '"That\'s not normal," she said.',
      '"It should be reactive. Aggressive."',
      '"It\'s acting like it recognizes you."',
      '',
      'The rift entity turned away.',
      '"Or like it remembers something it lost."',
    ],
    tokenReward: 15,
    postText: 'Something about the fragment is different. You don\'t understand it yet. You keep moving.',
  },

  {
    id: 33, title: 'Resonance Spike',
    world: '⚛️ Multiversal Core — Resonance Chamber',
    narrative: [
      'The rift entity needed to test it.',
      '"The fragment has to be pushed past its baseline."',
      '"If it spikes under pressure, we\'ll see what it\'s actually made of."',
      '',
      '"What does a spike look like?"',
      '"Like your vision going white. Like the air bending."',
      '"Like every fighter in the room becoming very aware that you\'re holding something',
      'they should be afraid of."',
      '',
      'A resonance fighter stepped into the chamber.',
      'Calibrated specifically to force the fragment to respond.',
      '',
      '"Try not to lose control," the rift entity said.',
      '"But — try."',
    ],
    fightScript: [
      { frame: 80,  text: 'Resonance Fighter — pushing the fragment\'s limits. Let the fragment respond. Don\'t suppress it.', color: '#cc88ff', timer: 300 },
      { frame: 300, text: '⚠️ FRAGMENT SPIKE — visual distortion is normal. Keep fighting through it.', color: '#ff88ff', timer: 310 },
      { frame: 520, text: 'The fragment is pulling toward the fighter. It wants to connect. Don\'t let it.', color: '#ffffff', timer: 260 },
    ],
    preText: 'Resonance Fighter — designed to stress-test the fragment. Expert pressure. 2 lives.',
    opponentName: 'Resonance Fighter', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#cc44ff',
    armor: ['helmet'],
    playerLives: 2,
    arena: 'space',
    tokenReward: 80, blueprintDrop: null,
    postText: 'The fragment spiked — but it didn\'t consume. It pulsed outward and returned. The rift entity stares at it for a long moment. "That\'s not possible," it says. Then, quieter: "That\'s what I used to be able to do."',
  },

  {
    id: 34, title: 'Residue',
    world: '⚛️ Multiversal Core — Quiet Chamber',
    noFight: true,
    narrative: [
      '"I need to tell you something,"  the rift entity said.',
      '"I have been trying to decide if it changes anything."',
      '"I think it does."',
      '',
      '"The fragment you\'re carrying — it isn\'t a piece of a random bearer.",',
      '"It isn\'t from a collapsed dimension."',
      '"It isn\'t residual fracture energy."',
      '',
      '"It\'s mine."',
      '',
      'A long silence.',
      '',
      '"Before the Creator modified me — before I became what I am now —',
      'there was a version of me that could still feel things.',
      '"A version that could recognize people. Trust them.",',
      '"That part of me didn\'t survive the modification.",',
      '"Or — it survived, but it split off.",',
      '"And it\'s been drifting for ten thousand years.",',
      '"Inside different bearers. Getting passed on.",',
      '"Waiting."',
      '',
      '"And now it\'s in you."',
      '',
      'The fragment pulsed.',
      'Warm. Familiar.',
      'Like recognition.',
    ],
    tokenReward: 20,
    postText: 'The fragment is a piece of who the rift entity used to be. And it chose you. That means something — you just don\'t know what yet.',
  },

  // ─────── Arc 2-1: Forest & Ice (ids 35–41) ───────────────────────

  {
    id: 35, type: 'exploration', title: 'Into the Green',
    world: '🌲 Forest Dimension — Endless Canopy',
    narrative: [
      'The forest had no edges.',
      '',
      'That was the first thing Veran warned you.',
      '"Don\'t look for the boundary. There isn\'t one."',
      '"The second Architect built their sanctum somewhere in the middle."',
      '"The forest itself will push you toward it — if you let it."',
      '',
      'Ash from collapsed worlds drifted through the canopy.',
      'Something moved in the trees ahead.',
      '',
      'You started walking.',
    ],
    objectName: 'Architect\'s Sanctum',
    style: 'forest',
    worldLength: 4500,
    sky: ['#050d05', '#0a1a0a'],
    groundColor: '#1a3316',
    platColor: '#2a4a22',
    spawnEnemies: [
      { wx: 600,  name: 'Forest Scout',    weaponKey: 'sword',  classKey: 'ninja',     aiDiff: 'medium', color: '#334422' },
      { wx: 900,  name: 'Vine Stalker',    weaponKey: 'axe',    classKey: 'ninja',     aiDiff: 'medium', color: '#3a4a22' },
      { wx: 1300, name: 'Canopy Guard',    weaponKey: 'axe',    classKey: 'berserker', aiDiff: 'hard',   color: '#446633' },
      { wx: 1700, name: 'Bark Knight',     weaponKey: 'sword',  classKey: 'warrior',   aiDiff: 'hard',   color: '#3d5529' },
      { wx: 2000, name: 'Root Sentinel',   weaponKey: 'spear',  classKey: 'warrior',   aiDiff: 'hard',   color: '#335522' },
      { wx: 2400, name: 'Thorn Warden',    weaponKey: 'hammer', classKey: 'tank',      aiDiff: 'hard',   color: '#4a3d1a' },
      { wx: 2700, name: 'Ash Walker',      weaponKey: 'hammer', classKey: 'tank',      aiDiff: 'hard',   color: '#554433' },
      { wx: 3100, name: 'Grove Assassin',  weaponKey: 'sword',  classKey: 'ninja',     aiDiff: 'expert', color: '#2a3a11' },
      { wx: 3400, name: 'Grove Elder',     weaponKey: 'sword',  classKey: 'warrior',   aiDiff: 'expert', color: '#224411' },
      // Relic guardians — hold position at the sanctum
      { wx: 4000, name: 'Sanctum Warden', weaponKey: 'axe',    classKey: 'tank',      aiDiff: 'expert', color: '#1a3311', isGuard: true, health: 130 },
      { wx: 4080, name: 'Elder Protector',weaponKey: 'hammer', classKey: 'warrior',   aiDiff: 'expert', color: '#223322', isGuard: true, health: 110 },
      { wx: 4160, name: 'Root Keeper',    weaponKey: 'spear',  classKey: 'ninja',     aiDiff: 'hard',   color: '#334422', isGuard: true, health: 90  },
    ],
    playerLives: 3,
    tokenReward: 80, blueprintDrop: null,
    postText: 'The sanctum. Hidden in ash and roots. The second Architect is inside — and from the sounds of it, not alone.',
  },

  {
    id: 36, title: 'The Second Architect',
    world: '🌲 Forest Dimension — Architect\'s Sanctum',
    narrative: [
      '"I know why you\'re here," the second Architect said.',
      '"Veran sent you. And the rift entity briefed you."',
      '',
      '"We built those portals together, you know.",',
      '"To contain a rift. To seal it. And then something went wrong."',
      '"Something got out."',
      '"And now it\'s in you."',
      '',
      '"Prove to me you can handle what comes next.',
      '"Because what comes next is worse than anything you\'ve fought."',
    ],
    storeNag: '⚠️ Second Architect. Expert-level. 2 lives. Spend your tokens.',
    fightScript: [
      { frame: 80,  text: '"You\'re carrying a piece of the original rift. It will try to consume you." It already has tried.', color: '#88cc66', timer: 290 },
      { frame: 360, text: '"Impressive. You\'re keeping it contained." That\'s new information.', color: '#aaccff', timer: 260 },
      { frame: 580, text: '"You can do this. That changes everything."', color: '#88ddff', timer: 240 },
    ],
    preText: 'The second Architect — a forest-dweller who tests before they trust. Expert-level combat. 2 lives.',
    opponentName: 'Second Architect', weaponKey: 'spear', classKey: 'ninja', aiDiff: 'expert', opponentColor: '#33aa44',
    playerLives: 2,
    arena: 'forest',
    tokenReward: 100, blueprintDrop: null,
    postText: '"I\'ll come," the Architect says. "But the third one is harder to convince. They\'re in the Ice Dimension. They stopped believing the rift could be closed." They hand you a dimensional key. "You\'ll need this."',
  },

  {
    id: 37, title: 'The Third Key',
    world: '🌲 Forest Dimension — Architect\'s Sanctum',
    noFight: true,
    narrative: [
      'After the Second Architect agreed, the fragment did something strange.',
      '',
      'It pushed heat toward them.',
      'Not in warning. In something closer to welcome.',
      '',
      '"Does it always do that?" the Second Architect asked.',
      '"Only recently," Veran said.',
      '',
      'The rift entity, quietly: "It\'s recognizing people it trusts."',
      '"It didn\'t used to be able to do that."',
      '"It couldn\'t — I couldn\'t — for ten thousand years."',
      '',
      'Veran pulled out her instruments.',
      'The readings confirmed it: the fragment wasn\'t just adapting to you.',
      'It was learning how to extend beyond you.',
      '',
      '"That\'s the third step of the closure protocol," the Second Architect said slowly.',
      '"Fragment extension. The bearer\'s anchor reaches outward and —"',
      'They stopped.',
      '"The Fourth Architect was the one who designed that step.",',
      '"If the fragment is already doing it unprompted..."',
      '',
      'They looked at each other.',
      '"We need to find the Third Architect fast.",',
      '"Before the fragment figures out what comes next.',
      '"Before anyone else does."',
    ],
    tokenReward: 20,
    postText: 'Something in the fragment is awakening ahead of schedule. The Third Architect needs to know.',
  },

  {
    id: 38, title: 'The Ice Dimension',
    world: '❄️ Ice Dimension',
    narrative: [
      'The ice dimension was perfect.',
      'Not beautiful — perfect.',
      'Every surface was optimized. Every angle calculated.',
      '',
      'The third Architect had withdrawn here decades ago.',
      '"Closed the rift?" they\'d said, reportedly.',
      '"That\'s like trying to close a black hole with your hands."',
      '"I\'d rather build something that survives the collapse."',
      '',
      'Their arenas were traps.',
      'Their fighters were trained to demoralize.',
    ],
    fightScript: [
      { frame: 60,  text: '⚠️ ICE — movement has low friction. Momentum is harder to stop.', color: '#88ccff', timer: 310 },
      { frame: 80,  text: 'Ice fighters — they use the slide to control distance. Don\'t let them.', color: '#aaccff', timer: 260 },
      { frame: 380, text: '"You move surprisingly well in here." Trust your body. It remembers.', color: '#88ddff', timer: 240 },
    ],
    preText: 'Ice dimension warriors — the third Architect\'s elite guard. Slippery terrain favors them.',
    opponentName: 'Ice Dimension Elite', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#4488cc',
    playerLives: 2,
    arena: 'ice',
    tokenReward: 90, blueprintDrop: null,
    postText: 'The guard falls. The third Architect watches from above. "Come up here," they call. "And fight me yourself. If you can."',
  },

  {
    id: 39, title: 'The Pessimist',
    world: '❄️ Ice Dimension — Summit',
    narrative: [
      '"You want me to believe a fragment bearer can close the rift."',
      '"That logic fails at the first step."',
      '"Fragment bearers amplify rift energy. They don\'t contain it."',
      '',
      '"Unless..."',
      '',
      'They paused. Recalculated.',
      '',
      '"Unless the fragment has already mutated. Adapted to the bearer\'s will."',
      '"In which case you\'d be the only thing in seventeen dimensions that could anchor a closure."',
      '"Prove the fragment obeys you. Beat me."',
    ],
    storeNag: '⚠️ Third Architect. Expert-level. 1 life. Use every resource you have.',
    fightScript: [
      { frame: 60,  text: '⚠️ Summit winds — horizontal knockback is amplified at altitude.', color: '#88ccff', timer: 300 },
      { frame: 80,  text: '"I\'ve computed 812 possible fight outcomes. None end with me losing."', color: '#aaccff', timer: 290 },
      { frame: 380, text: '"813," they say, recalculating mid-fight. "Unexpected."', color: '#88ffcc', timer: 260 },
      { frame: 600, text: 'They\'re actually trying now. So are you.', color: '#ffffff', timer: 230 },
    ],
    preText: 'The third Architect. They do not believe you can succeed. Show them they\'re wrong. 1 life.',
    opponentName: 'Third Architect', weaponKey: 'spear', classKey: 'assassin', aiDiff: 'expert', opponentColor: '#2266bb',
    armor: ['helmet', 'chestplate'],
    playerLives: 1,
    arena: 'ice',
    tokenReward: 120, blueprintDrop: 'berserker_blood2',
    postText: '"...814," they say, standing slowly. "I was wrong." They hold out their hand. "I\'ll come. One more Architect left — the fourth. The one who originally designed the fragment containment protocol." A pause. "They\'re in the ruins of the first dimension. The one that collapsed."',
  },

  {
    id: 40, title: 'The Fragment Breathes',
    world: '❄️ Ice Dimension — Healing Quarter',
    noFight: true,
    narrative: [
      'It happened without warning.',
      '',
      'The Third Architect had a wound from the summit fight.',
      'Old. Not serious. Something they had been managing for weeks.',
      '',
      'The fragment reached toward it.',
      '',
      'Not you — the fragment. On its own.',
      'A pulse of warm light. A few seconds.',
      'The wound closed.',
      '',
      'Everyone went very still.',
      '',
      '"That\'s not — fragment energy doesn\'t do that," the Third Architect said.',
      '"Fragment energy destabilizes biological tissue. It doesn\'t heal it."',
      '',
      'The rift entity was silent for a long moment.',
      '"It used to," it finally said.',
      '"Before the Creator changed it. Before it changed me.",',
      '"Fragment energy was originally designed to repair. To connect.",',
      '"The Creator repurposed it for harvesting.",',
      '"I didn\'t know any of this was still in there."',
      '',
      'Veran\'s voice was quiet: "Something is waking up in it."',
      '"Something the Creator thought it had removed."',
    ],
    tokenReward: 25,
    postText: 'The fragment is not just adapting. It is remembering what it was made to do. The Third Architect now looks at you differently — calculating, but no longer pessimistic.',
  },

  {
    id: 41, title: 'Third Architect\'s Doubt',
    world: '❄️ Ice Dimension — Summit Approach',
    noFight: true,
    narrative: [
      'The Third Architect caught you alone before the ruins portal.',
      '',
      '"I need to show you a calculation," they said.',
      '"Not to frighten you. To be honest."',
      '',
      'They laid out a set of probability maps.',
      '"The original closure protocol was designed with the fragment as a one-way valve.",',
      '"Energy goes in. Rift closes. Fragment bearer is — consumed.",',
      '"That\'s the design."',
      '',
      '"I know," you said.',
      '',
      '"But the fragment healing me changes the probability distribution.",',
      '"If it can heal, it can potentially sustain the bearer through the process.",',
      '"There is a version of this where you survive.",',
      '"I calculate it at about fourteen percent.",',
      '',
      'A pause.',
      '',
      '"I also calculate that if we fail to account for this correctly,',
      'the energy release kills all three remaining Architects and the rift entity.',
      '"Getting it wrong in the right direction costs less than getting it right in the wrong direction.",',
      '"I need to think about this."',
      '',
      'They walked away.',
      'You watched them go.',
      'Fourteen percent felt enormous.',
    ],
    tokenReward: 20,
    postText: 'A fourteen-percent survival chance. The Third Architect is already modeling alternatives. So, quietly, are you.',
  },

  // ─────── Arc 2-2: Ruins & Collapse (ids 42–44) ────────────────────

  {
    id: 42, type: 'exploration', title: 'What the Ancients Left',
    world: '🏛️ Ruins Dimension — The First Collapse',
    narrative: [
      'The first dimension to ever fracture.',
      '',
      'It looked like your world might.',
      'Broken towers. Cracked sky.',
      'A planet mid-collapse, frozen in time.',
      '',
      'The fourth Architect had lived here since the beginning.',
      'And hidden the original fracture diagram deep in the ruins.',
      '"You\'ll find it," the rift entity said.',
      '"The fragment will guide you."',
      '',
      'The ruins stretched endlessly ahead.',
      'Something ancient waited in the rubble.',
    ],
    objectName: 'Fracture Diagram',
    style: 'ruins',
    worldLength: 4800,
    sky: ['#100808', '#1e1010'],
    groundColor: '#3a2e20',
    platColor: '#4a3e30',
    spawnEnemies: [
      { wx: 700,  name: 'Stone Warden',    weaponKey: 'hammer', classKey: 'tank',    aiDiff: 'hard',   color: '#776655', armor: ['helmet'] },
      { wx: 1100, name: 'Rubble Crawler',  weaponKey: 'sword',  classKey: 'ninja',   aiDiff: 'medium', color: '#887766' },
      { wx: 1500, name: 'Ruin Guardian',   weaponKey: 'axe',    classKey: 'warrior', aiDiff: 'hard',   color: '#998866', armor: ['helmet', 'chestplate'] },
      { wx: 1900, name: 'Shard Stalker',   weaponKey: 'spear',  classKey: 'ninja',   aiDiff: 'hard',   color: '#776644' },
      { wx: 2300, name: 'Ancient Scout',   weaponKey: 'sword',  classKey: 'ninja',   aiDiff: 'expert', color: '#887755' },
      { wx: 2700, name: 'Tomb Knight',     weaponKey: 'axe',    classKey: 'warrior', aiDiff: 'expert', color: '#998877', armor: ['helmet'] },
      { wx: 3000, name: 'Relic Knight',    weaponKey: 'spear',  classKey: 'warrior', aiDiff: 'expert', color: '#aa9977', armor: ['helmet', 'chestplate'] },
      { wx: 3400, name: 'Dust Wraith',     weaponKey: 'sword',  classKey: 'ninja',   aiDiff: 'expert', color: '#665544' },
      { wx: 3800, name: 'Keeper',          weaponKey: 'hammer', classKey: 'tank',    aiDiff: 'expert', color: '#998844', armor: ['helmet', 'chestplate', 'leggings'] },
      // Diagram guardians — hold the fracture diagram location
      { wx: 4300, name: 'Diagram Sentinel', weaponKey: 'axe',   classKey: 'tank',    aiDiff: 'expert', color: '#776644', isGuard: true, health: 140, armor: ['helmet', 'chestplate'] },
      { wx: 4380, name: 'Vault Warden',     weaponKey: 'hammer',classKey: 'warrior', aiDiff: 'expert', color: '#887755', isGuard: true, health: 120, armor: ['helmet', 'chestplate', 'leggings'] },
      { wx: 4450, name: 'Last Keeper',      weaponKey: 'spear', classKey: 'ninja',   aiDiff: 'expert', color: '#665533', isGuard: true, health: 100 },
    ],
    playerLives: 3,
    tokenReward: 130, blueprintDrop: null,
    postText: 'The fracture diagram. Not a physical object — a transfer of knowledge. You understand it immediately. The closure protocol. Three steps. The third step you already knew.',
  },

  // ───────────────────────────────────────────────────────────────
  // CHAPTER V — UNRAVELING
  // Setting: back to the core — executing the closure protocol.
  // Mechanics: escalating distortion, staggered elite fights.
  // ───────────────────────────────────────────────────────────────

  {
    id: 43, title: 'The Last Army',
    world: '⚛️ Multiversal Core — Outer Ring',
    narrative: [
      'The rift entity had been quiet.',
      'Then it spoke.',
      '',
      '"You\'ve gathered the Architects. You know the protocol."',
      '"And you intend to sacrifice yourself."',
      '"I don\'t want that. I never wanted that."',
      '',
      '"But the rift has its own hunger now. It generates fighters.',
      '"Echoes. Fragments of collapsed dimensions wearing combat forms."',
      '"They will try to stop you."',
      '"Not because I command it — because the rift commands it."',
      '"Survive them. Then we talk."',
    ],
    fightScript: [
      { frame: 80,  text: '⚠️ Reality distortion is increasing. The visual noise is the rift amplifying.', color: '#cc44ff', timer: 310 },
      { frame: 90,  text: 'Rift echos — they don\'t die cleanly. They fracture and reassemble. Hit hard.', color: '#ff44cc', timer: 270 },
      { frame: 380, text: 'The fragment is fully charged. You can feel it. Wait for the right moment.', color: '#88aaff', timer: 260 },
    ],
    preText: 'The rift\'s final echo wave — powerful fracture constructs. Two simultaneous. 2 lives.',
    opponentName: 'Rift Echo Alpha', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'expert', opponentColor: '#aa00ff',
    twoEnemies: true,
    secondEnemy: { weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', color: '#8800cc' },
    armor: ['helmet', 'chestplate'],
    playerLives: 2,
    arena: 'space',
    tokenReward: 120, blueprintDrop: null,
    postText: 'The echoes collapse. The outer ring is clear. Ahead: the rift core. Veran and the Architects are in position. "Whenever you\'re ready," Veran says. Her voice is steady. Yours is too.',
  },

  {
    id: 44, title: 'The Herald of Nothing',
    world: '⚛️ Multiversal Core — Threshold',
    narrative: [
      'The rift\'s final guardian.',
      '',
      'Not a construct. Not an echo.',
      'A person who had volunteered.',
      '',
      '"If the rift closes, everything it absorbed is destroyed.",',
      '"Fifty-two dimensions. Every echo. Every stolen fighter.",',
      '"Including me."',
      '',
      '"I\'d rather die fighting than dissolve when you seal it."',
      '"Make it count."',
    ],
    storeNag: '⚠️ The final threshold guardian. 1 life. This is the last fight before the Creator.',
    fightScript: [
      { frame: 70,  text: '"I\'ve been waiting for this for sixty years. Make it a good fight."', color: '#ffffff', timer: 290 },
      { frame: 340, text: 'They\'re holding nothing back. Neither are you.', color: '#ffaa55', timer: 250 },
      { frame: 600, text: '"You\'re going to win," they say, mid-swing. "I can feel it." So can you.', color: '#aaccff', timer: 260 },
    ],
    preText: 'The Herald of Nothing — a voluntary last stand before the rift core. Expert-level. 1 life.',
    opponentName: 'Herald of Nothing', weaponKey: 'voidblade', classKey: 'ninja', aiDiff: 'expert', opponentColor: '#ffffff',
    armor: ['helmet', 'chestplate', 'leggings'],
    playerLives: 1,
    arena: 'ruins',
    tokenReward: 150, blueprintDrop: null,
    postText: 'They dissolve in light, not in violence. Peaceful. The rift core opens. The rift entity stands at the center. "One more thing before the protocol," it says. "There is something beyond the rift. Something that has been watching." It looks at you. "The Creator of the fracture system itself. It built me. It built you. And now it knows what you can do." A long silence. "You will meet it. But not today." The core hums. "Today, we close this."',
  },

  // ══════════════════════════════════════════════════════════════════
  // ACT IV — THE ARCHITECTS' WAR (ids 45–60)
  // The Architects convene. A betrayal reshapes everything.
  // ══════════════════════════════════════════════════════════════════

  // ─────── Arc 3-0: The Assembly (ids 45–51) ────────────────────────

  {
    id: 45, title: 'The Assembly',
    world: '🌐 Neutral Dimension — The Anchor Point',
    noFight: true,
    narrative: [
      'Four Architects in one room for the first time in centuries.',
      '',
      'They did not greet each other.',
      '',
      'The Second Architect — forest dimension, quiet intensity — studied the map.',
      'The Third Architect — ice dimension, the strategist — had already computed',
      'twelve failure scenarios before anyone sat down.',
      'The Fourth Architect — ruins, the oldest — said nothing at all.',
      '',
      '"We agree the rift must close," Veran said.',
      '"What we disagree on is how much it will cost."',
      '',
      'The Third Architect looked at you.',
      '"The fragment bearer is the key variable. What is their survival probability',
      'if we execute the original protocol?"',
      '',
      'Veran didn\'t answer.',
      '',
      'The fragment pulsed once.',
      'Something vast and distant had noticed the gathering.',
    ],
    tokenReward: 20,
    postText: 'The assembly has convened. But before any plan can be made, the Creator sends a message of its own.',
  },

  {
    id: 46, title: 'The Probe',
    world: '🌐 Neutral Dimension — Entry Point',
    narrative: [
      '"Don\'t engage it," the Third Architect said immediately.',
      '"It\'s not here to fight. It\'s here to measure."',
      '',
      'The Creator\'s probe fighter had materialized at the perimeter.',
      'Smooth. Uniform. No face.',
      '',
      '"If we don\'t engage, it reads our passivity as weakness," the Fourth Architect said.',
      '"One of us fights it. Alone."',
      '',
      'They all looked at you.',
      '"You\'re the variable it\'s already tracking," the Second Architect said.',
      '"Show it what you\'ve learned."',
      '',
      'The probe turned toward you.',
      'And waited.',
    ],
    fightScript: [
      { frame: 80,  text: 'Creator\'s Probe — it\'s reading your every move. Fight unpredictably.', color: '#cc88ff', timer: 300 },
      { frame: 300, text: 'It\'s adapting in real time. Every pattern you repeat gives it data.', color: '#aaccff', timer: 270 },
      { frame: 520, text: 'The Architects are watching. Show them what a fragment bearer can do.', color: '#ffffff', timer: 260 },
    ],
    preText: 'Creator\'s Probe — a calibration construct. It is learning you. Don\'t let it finish its assessment. 3 lives.',
    opponentName: 'Creator\'s Probe', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#bbbbdd',
    playerLives: 3,
    arena: 'space',
    tokenReward: 60, blueprintDrop: null,
    postText: 'The probe collapses. But it got what it needed — data transmitted. The Third Architect: "It called you by name. It knew your name before I said it."',
  },

  {
    id: 47, title: 'The Split',
    world: '🌐 Neutral Dimension — Assembly Hall',
    noFight: true,
    narrative: [
      'The Third Architect had run the numbers.',
      '',
      '"The closure protocol destroys the Creator."',
      '"That\'s not a side effect. It\'s the mechanism."',
      '"We are planning an execution."',
      '',
      '"It harvested fifty-two dimensions," the Second Architect said.',
      '"It enslaved the rift entity. What would you call that?"',
      '',
      '"Architecture," the Third Architect said.',
      '"A system that maintains dimensional stability through controlled fracture.',
      '"Brutal. But functional."',
      '"Without it, something worse fills the gap."',
      '',
      'The Fourth Architect finally spoke.',
      '"Something already did. Us."',
      '',
      'The fragment reacted.',
      'Not to the argument — to something in the Third Architect\'s voice.',
      'They had already decided.',
      'They just hadn\'t said it yet.',
    ],
    tokenReward: 15,
    postText: 'The fault lines are visible. But there\'s no time to address them — a rogue faction has found the assembly point.',
  },

  {
    id: 48, title: 'Rogue Faction',
    world: '🌐 Neutral Dimension — Outer Perimeter',
    narrative: [
      'They called themselves the Preserved.',
      '',
      'Beings from dimensions the Creator had absorbed.',
      'Not destroyed — integrated. Kept functional inside the system.',
      'They had built a life in there.',
      '',
      '"Close the rift and you delete us," their leader said.',
      '"Every dimension the Creator absorbed goes with it."',
      '"We are not a cost you get to decide."',
      '',
      'The Second Architect, quietly: "They\'re not wrong."',
      'The Third Architect, immediately: "They\'re also not relevant to the calculus."',
      '',
      'The Preserved attacked.',
    ],
    fightScript: [
      { frame: 80,  text: 'The Preserved — they\'re fighting for their right to exist. That doesn\'t make them wrong.', color: '#cc9944', timer: 300 },
      { frame: 300, text: 'They fight like they have nothing to lose. Because they don\'t.', color: '#ffaa44', timer: 270 },
      { frame: 500, text: 'Win this fight. Figure out what it means later.', color: '#aaccff', timer: 250 },
    ],
    preText: 'The Preserved — beings who live inside the Creator\'s absorbed dimensions. Two fighters. 2 lives.',
    opponentName: 'Preserved Vanguard', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', opponentColor: '#cc8833',
    twoEnemies: true,
    secondEnemy: { weaponKey: 'hammer', classKey: 'tank', aiDiff: 'hard', color: '#aa6622' },
    playerLives: 2,
    arena: 'city',
    tokenReward: 75, blueprintDrop: null,
    postText: 'They\'re down. Not dead. The leader looks up at you. "Tell them we exist." You nod. It\'s the only thing you can give them. It matters anyway.',
  },

  {
    id: 49, title: 'What Veran Didn\'t Say',
    world: '🌐 Neutral Dimension — Assembly Hall',
    noFight: true,
    narrative: [
      'The Fourth Architect found you afterward.',
      '',
      '"The instruments Veran uses — I recognize their calibration."',
      '"She\'s been to the Creator\'s domain before."',
      '"Recently."',
      '',
      'You asked Veran directly.',
      '',
      'She didn\'t lie.',
      '"I went looking for a way to close the rift without killing the bearer."',
      '"There is one. The Creator showed it to me — in exchange for something."',
      '"I gave it a copy of the first three steps of the closure protocol."',
      '"It already knew them. But I gave it confirmation that we had all four."',
      '',
      'The room was quiet for a long time.',
      '',
      '"I thought I was buying time," she said.',
      '"I thought I was protecting you."',
      '',
      'Maybe she was.',
      'Maybe it didn\'t matter.',
    ],
    tokenReward: 15,
    postText: 'The Creator now knows you have all four Architects. And the Third Architect heard every word.',
  },

  {
    id: 50, title: 'The Upload',
    world: '🌐 Neutral Dimension — Relay Node',
    narrative: [
      '"The closure data needs to reach the dimensional relay before the Creator seals it,"',
      'Veran said.',
      '"I can upload it in ninety seconds."',
      '"But it\'ll take everything I have to maintain the connection."',
      '"I\'ll be completely exposed."',
      '',
      '"Protect me."',
      '',
      'Two waves of Creator probes were already inbound.',
      '"They\'re faster than the last one," the Second Architect said.',
      '"The Creator is not testing anymore."',
    ],
    fightScript: [
      { frame: 40,  text: '⚠️ PROTECT VERAN — stay between the probes and her position.', color: '#ffcc44', timer: 340 },
      { frame: 80,  text: 'First probe wave incoming. Stay aggressive — they aim for her, not you.', color: '#ff9944', timer: 300 },
      { frame: 420, text: 'Second wave. Faster constructs. Hold the line.', color: '#cc44ff', timer: 280 },
      { frame: 600, text: '"Eighty percent," Veran says through gritted teeth. "Keep going."', color: '#aaccff', timer: 260 },
    ],
    preText: 'Protect Veran during the relay upload. Two probe waves. She cannot take critical damage. 2 lives.',
    opponentName: 'Probe Wave Alpha', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#9999cc',
    twoEnemies: true,
    secondEnemy: { weaponKey: 'sword', classKey: 'warrior', aiDiff: 'hard', color: '#8888bb' },
    playerLives: 2,
    arena: 'city',
    tokenReward: 90, blueprintDrop: 'reflect2',
    postText: 'Upload complete. "The relay has the data," Veran says, hands shaking. "It\'s locked. We\'re committed." Everyone in the room knows what that means.',
  },

  {
    id: 51, title: 'The Hidden Page',
    world: '🌐 Neutral Dimension — Archive Vault',
    noFight: true,
    narrative: [
      'The Fourth Architect found it in the relay node\'s backup memory.',
      'A page of the original closure protocol.',
      'The version before the Architects simplified it.',
      '',
      '"We removed this section," the Fourth Architect said.',
      '"Because it seemed impossible.",',
      '"We thought the author had made a mistake.",',
      '',
      'They handed it to Veran.',
      'She read it twice.',
      'Her face changed.',
      '',
      '"The original protocol requires two fragment bearers," she said.',
      '"Not one.",',
      '"One to open the rift gate from inside.",',
      '"One to anchor the closure from outside.",',
      '"Without both — the closure energy has nowhere to go.",',
      '"It collapses inward.",',
      '"Into the bearer.",',
      '',
      'Silence.',
      '',
      '"Then who is the second bearer?" the Second Architect asked.',
      '',
      'The rift entity\'s presence shifted in the fragment.',
      'Slow. Heavy.',
      '"I think," it said very quietly, "that would be me."',
    ],
    tokenReward: 25,
    postText: 'The original protocol always required two bearers. The rift entity was always going to give itself up. It knew. It chose you knowing.',
  },

  // ─────── Arc 3-1: The Fracture Within (ids 52–60) ────────────────

  {
    id: 52, type: 'exploration', title: 'Signal Maze',
    world: '📡 Creator\'s Interference Layer — Fractured City',
    narrative: [
      'The Creator began unmaking the pathways.',
      '',
      'Not destroying them — scrambling.',
      'City blocks that shouldn\'t exist next to each other.',
      'Streets that looped back.',
      '',
      '"The Creator\'s interference is rewriting dimensional geography,"',
      'the Fourth Architect said.',
      '"It\'s trying to isolate us from the fallback point."',
      '',
      '"The fragment can navigate it," the rift entity said.',
      '"Let it guide you."',
      '',
      'You moved into the maze.',
      'Something was already moving inside it.',
    ],
    objectName: 'Fallback Beacon',
    style: 'city',
    worldLength: 5000,
    sky: ['#0a080e', '#130d1a'],
    groundColor: '#1a1622',
    platColor: '#2a2035',
    spawnEnemies: [
      { wx: 500,  name: 'Signal Construct',    weaponKey: 'sword',  classKey: 'warrior',   aiDiff: 'hard',   color: '#554466' },
      { wx: 900,  name: 'Loop Guard',          weaponKey: 'axe',    classKey: 'ninja',     aiDiff: 'hard',   color: '#443355' },
      { wx: 1300, name: 'Static Runner',       weaponKey: 'sword',  classKey: 'ninja',     aiDiff: 'hard',   color: '#665577' },
      { wx: 1700, name: 'Maze Warden',         weaponKey: 'spear',  classKey: 'warrior',   aiDiff: 'hard',   color: '#5e4a6e' },
      { wx: 2100, name: 'Phase Soldier',       weaponKey: 'hammer', classKey: 'tank',      aiDiff: 'hard',   color: '#4d3d5e' },
      { wx: 2500, name: 'Glitch Knight',       weaponKey: 'axe',    classKey: 'berserker', aiDiff: 'expert', color: '#6a4a7a' },
      { wx: 2900, name: 'Deep Signal',         weaponKey: 'sword',  classKey: 'ninja',     aiDiff: 'expert', color: '#553366' },
      { wx: 3300, name: 'Null Warden',         weaponKey: 'spear',  classKey: 'warrior',   aiDiff: 'expert', color: '#6a5575' },
      { wx: 3700, name: 'Interference Elite',  weaponKey: 'hammer', classKey: 'tank',      aiDiff: 'expert', color: '#7a6688', armor: ['helmet', 'chestplate'] },
      { wx: 4200, name: 'Beacon Sentinel',     weaponKey: 'axe',    classKey: 'tank',      aiDiff: 'expert', color: '#5a3a6a', isGuard: true, health: 130, armor: ['helmet', 'chestplate'] },
      { wx: 4320, name: 'Core Watchdog',       weaponKey: 'sword',  classKey: 'ninja',     aiDiff: 'expert', color: '#4a2a5a', isGuard: true, health: 110 },
      { wx: 4430, name: 'Signal Anchor',       weaponKey: 'spear',  classKey: 'warrior',   aiDiff: 'expert', color: '#6a4a77', isGuard: true, health: 100 },
    ],
    playerLives: 3,
    tokenReward: 100, blueprintDrop: null,
    postText: 'The fallback beacon. The Architects are here — all four of them. But the Third Architect arrived first. And they\'re standing in the wrong place.',
  },

  {
    id: 53, title: 'Empty Sanctum',
    world: '📡 Creator\'s Interference Layer — Third Architect\'s Post',
    noFight: true,
    narrative: [
      'The Third Architect\'s post was clean.',
      'Equipment packed. Nothing left behind.',
      '',
      '"They didn\'t flee," the Fourth Architect said.',
      '"They left on their own terms. There\'s a difference."',
      '',
      'The Second Architect found the message.',
      'A single line, written in ice-dimension notation:',
      '"The system works. The cost is acceptable. I am sorry."',
      '',
      'Veran: "They warned the Creator. They had to."',
      '',
      'The fragment went cold.',
      'The rift entity\'s presence faded from it, briefly.',
      'For a moment you felt completely alone.',
    ],
    tokenReward: 10,
    postText: 'The Third Architect is gone. And the Creator\'s constructs are already converging on the fallback point.',
  },

  {
    id: 54, title: 'Converted',
    world: '📡 Interference Layer — Fallback Perimeter',
    narrative: [
      'They wore the Third Architect\'s colors.',
      '',
      'Converted — Creator\'s architecture overlaid on their original programming.',
      'They remembered nothing. Or they did, and it didn\'t matter anymore.',
      '',
      '"Don\'t talk to them," the Fourth Architect said.',
      '"They can\'t hear you."',
      '',
      'The fragment burned.',
      'Not in warning.',
      'In grief.',
    ],
    fightScript: [
      { frame: 70,  text: 'Converted guards — something of the Third Architect is still in their movement patterns.', color: '#aaccff', timer: 300 },
      { frame: 300, text: 'They don\'t telegraph attacks. The Creator made them unpredictable on purpose.', color: '#cc66ff', timer: 270 },
      { frame: 520, text: 'End it cleanly. They deserve that much.', color: '#88aaff', timer: 240 },
    ],
    preText: 'Third Architect\'s converted guards. Creator-altered, hostile. 2 lives.',
    opponentName: 'Converted Guard', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#557799',
    twoEnemies: true,
    secondEnemy: { weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', color: '#446688' },
    playerLives: 2,
    arena: 'ice',
    tokenReward: 80, blueprintDrop: null,
    postText: 'They dissolve quietly. The Fourth Architect closes their eyes for a moment. No one speaks.',
  },

  {
    id: 55, title: 'The Deal',
    world: '📡 Interference Layer — Fallback Point',
    noFight: true,
    narrative: [
      'The message came through the fragment.',
      '',
      'The Third Architect\'s voice, precise as always:',
      '"I gave the Creator the fourth step of the protocol.',
      '"The one only I held."',
      '"In exchange for the Preserved — every being the Creator absorbed.',
      '"They will be released into stable dimensions. Safe."',
      '',
      '"The closure cannot proceed without the fourth step."',
      '"Effectively: I have ended this."',
      '"I\'m sorry. That part is true."',
      '',
      'Veran sat down.',
      'The Second Architect put their fist through the wall.',
      'The Fourth Architect looked at you.',
      '',
      '"Can the fragment substitute for the fourth step?"',
      '',
      'The rift entity stirred.',
      '"…Maybe."',
    ],
    tokenReward: 10,
    postText: 'The protocol is incomplete. The fragment might be enough — but it means using more of yourself than anyone expected. The Creator\'s Enforcer arrives within the hour.',
  },

  {
    id: 56, title: 'The Preserved Speak',
    world: '📡 Creator\'s Interference Layer — Shelter Chamber',
    noFight: true,
    narrative: [
      'One of the Preserved found you.',
      '',
      'Not the leader — a younger one.',
      '"I have something you need to hear," she said.',
      '"About why the Creator built any of this."',
      '',
      '"The Architects will tell you it harvested dimensions for power.",',
      '"That\'s true. But it\'s the middle of the story.",',
      '"Not the beginning.",',
      '',
      '"The beginning is — there is something older than the Creator.",',
      '"Older than dimensions.",',
      '"We call it the Void Mind.",',
      '"It doesn\'t have goals. It doesn\'t think.",',
      '"It simply unmakes.",',
      '"It moves through dimension-space the way fire moves through air.",',
      '"Consuming everything.",',
      '',
      '"The Creator built the fracture system to stop it.",',
      '"Fragment bearers are the weapon. The rift is the ammunition.",',
      '"The absorbed dimensions — including mine — are the fuel source.",',
      '"That\'s what the Creator decided was acceptable.",',
      '',
      'She looked at you.',
      '"I\'m not telling you it was right.",',
      '"I\'m telling you — when you go in there —",',
      '"don\'t be surprised if what you find is afraid."',
    ],
    tokenReward: 20,
    postText: 'There is something older than the Creator. Something that cannot be negotiated with. The fracture system was built as a weapon against it. You needed to know that before you go further.',
  },

  {
    id: 57, title: 'Against the Architect',
    world: '📡 Interference Layer — Confrontation Point',
    narrative: [
      'The Third Architect came themselves.',
      '',
      '"I knew you\'d follow," they said.',
      '"I\'d calculated this moment."',
      '"You were always going to be standing here, and I was always going to say',
      '"I don\'t regret it."',
      '',
      '"The Preserved are free. Fifty-two absorbed dimensions.",',
      '"That is an outcome the original protocol couldn\'t provide."',
      '',
      'The Creator\'s construct stood beside them.',
      '"I\'m not trying to stop you forever," the Third Architect said.',
      '"Just long enough for the trade to finalize."',
      '',
      '"After that, do what you need to do."',
      '"I hope you succeed."',
      '"I mean that."',
    ],
    storeNag: '⚠️ Against the Third Architect + Creator construct. Expert. 2 lives. They know your style.',
    fightScript: [
      { frame: 80,  text: '"I\'ve modeled this fight 1,400 times." Then be the 1,401st.', color: '#4499cc', timer: 300 },
      { frame: 300, text: 'The Creator\'s construct fights at full power. The Third Architect fights at half.', color: '#aaccff', timer: 270 },
      { frame: 500, text: '"You\'re better than my models projected," they say. The Third Architect is telling you something.', color: '#88ddff', timer: 270 },
      { frame: 700, text: 'They\'re slowing down. Not tiring. Letting you win. On purpose.', color: '#ffffff', timer: 250 },
    ],
    preText: 'Third Architect + Creator construct. The Architect fights reluctantly. The construct does not. Expert. 2 lives.',
    opponentName: 'Third Architect', weaponKey: 'spear', classKey: 'assassin', aiDiff: 'expert', opponentColor: '#2266bb',
    twoEnemies: true,
    secondEnemy: { weaponKey: 'sword', classKey: 'warrior', aiDiff: 'expert', color: '#9999cc' },
    armor: ['helmet'],
    playerLives: 2,
    arena: 'ice',
    tokenReward: 110, blueprintDrop: null,
    postText: 'The Third Architect looks up at you from the ground. "The trade finalized thirty seconds ago. The Preserved are free." A pause. "Go close the rift. I was wrong about whether it was possible. I wasn\'t wrong about the cost." They step back through a portal. It closes. You don\'t see them again.',
  },

  {
    id: 58, title: 'Aftermath',
    world: '📡 Interference Layer — Fallback Point',
    noFight: true,
    narrative: [
      'The Second Architect: "We have three steps of the protocol.',
      '"Plus a fragment that might substitute for the fourth."',
      '"And we\'re missing an Architect."',
      '',
      'Silence.',
      '',
      'Veran: "I should have told you everything from the beginning."',
      '"I thought I was protecting the process."',
      '"I was protecting myself from being the person who knew too much and stayed quiet."',
      '',
      'She looked at you.',
      '"You\'re still here."',
      '"After all of this, you\'re still here."',
      '',
      'The Fourth Architect: "We continue.",',
      '"The Third made their choice. We make ours."',
      '"Forward."',
      '',
      'The fragment burned warm.',
    ],
    tokenReward: 25,
    postText: 'Three Architects remain. The fragment may be enough. The Creator\'s Enforcer is coming.',
  },

  {
    id: 59, title: 'Veran\'s Confession',
    world: '📡 Interference Layer — Fallback Point',
    noFight: true,
    narrative: [
      'Veran asked everyone to leave.',
      'You stayed.',
      '',
      '"I owe you the full truth," she said.',
      '"Not the version I\'ve been giving you.",',
      '"The whole thing.",',
      '',
      '"Fifteen years ago, I ran an experiment.",',
      '"I was trying to measure dimensional resonance patterns.",',
      '"I thought it was theoretical work.",',
      '"It wasn\'t.",',
      '',
      '"The experiment destabilized a dimensional junction.",',
      '"The first fracture event — the one that started all of this —",',
      '"that was me.",',
      '"I caused it.",',
      '',
      'A long silence.',
      '',
      '"I\'ve spent fifteen years trying to fix what I broke.",',
      '"The research. The portals. Finding you.",',
      '"Every bit of it.",',
      '"I wasn\'t protecting the world.",',
      '"I was trying to pay back a debt I could never actually pay.",',
      '',
      '"I should have told you from the start.",',
      '"You deserved to choose whether you wanted to do this for someone who was responsible.",',
      '"I didn\'t give you that choice.",',
      '',
      'You sat with it.',
      '',
      '"Does it change anything?" she asked.',
      '',
      'You thought about it honestly.',
      '',
      '"No," you said.',
      '"But it should have been my choice.",',
      '"Don\'t do that again.",',
      '',
      'She nodded.',
      'Didn\'t cry.',
      'You respected that.',
    ],
    tokenReward: 30,
    postText: 'Veran caused the original fracture event. She has spent fifteen years trying to fix it. You know the full truth now. You go forward anyway — but now it is a genuine choice.',
  },

  {
    id: 60, title: 'The Enforcer',
    world: '📡 Interference Layer — The Gate',
    narrative: [
      'It arrived without announcement.',
      '',
      'No face. No voice.',
      'Just presence — the weight of something designed',
      'specifically to end things.',
      '',
      '"Creator\'s primary enforcer," the Fourth Architect said.',
      '"I\'ve seen records of what it does."',
      '"Don\'t let it land a clean hit."',
      '',
      'It turned to you.',
      'And charged.',
    ],
    storeNag: '⚠️ THE ENFORCER — Creator\'s primary combat unit. Expert. 1 life. This is the hardest fight in Act IV.',
    fightScript: [
      { frame: 60,  text: '⚠️ ENFORCER — built to terminate fragment bearers. It knows exactly what you are.', color: '#ff44aa', timer: 360 },
      { frame: 80,  text: 'Its attack speed increases as the fight goes on. Start fast. Stay fast.', color: '#cc44ff', timer: 300 },
      { frame: 350, text: 'It\'s at 60% now. Patterns are shifting. You\'ve entered its secondary protocol.', color: '#ff66cc', timer: 280 },
      { frame: 580, text: '⚠️ FINAL PHASE — the Enforcer at maximum output. Everything you have.', color: '#ff44ff', timer: 320 },
      { frame: 700, text: 'It\'s adapting. Change something. Anything. Break the pattern.', color: '#aaccff', timer: 260 },
    ],
    preText: 'The Creator\'s Enforcer — primary termination unit. Expert. 1 life. Heavily armored. Adaptive.',
    opponentName: 'The Enforcer', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'expert', opponentColor: '#cc0044',
    armor: ['helmet', 'chestplate', 'leggings'],
    playerLives: 1,
    arena: 'space',
    tokenReward: 140, blueprintDrop: 'architects_resolve2',
    postText: 'The Enforcer collapses completely. No reset, no transmission — gone. The Second Architect: "The Creator didn\'t pull it back." The Fourth Architect: "Or it wanted to see if we could do this."',
  },

  {
    id: 61, title: 'The Constant',
    world: '📡 Interference Layer — Fallback Chamber',
    noFight: true,
    narrative: [
      'The three remaining Architects sat in silence.',
      '',
      'Then the rift entity spoke.',
      '',
      'Not through the fragment — through the air.',
      'Not a whisper.',
      'A full sentence.',
      '',
      '"You are the only thing that has not broken."',
      '"Through every version of this I have watched.",',
      '"Every attempt. Every fragment bearer before you.",',
      '"Every variation of this exact moment.",',
      '',
      '"And in every version — you are always still standing."',
      '',
      'Veran put a hand on your shoulder.',
      '',
      '"We go forward," the Fourth Architect said.',
      '"Through the Creator\'s own territory."',
      '"Into the architecture it built."',
      '"We end this where it began."',
      '',
      'You nodded.',
      'It was enough.',
    ],
    tokenReward: 30,
    postText: 'Act IV complete. The Creator\'s domain opens ahead. Three Architects. One fragment bearer. One rift entity. Forward.',
  },

  // ══════════════════════════════════════════════════════════════════
  // ACT V — INTO THE ARCHITECTURE (ids 62–76)
  // The Creator\'s domain. The truth behind everything.
  // No one gets to leave unchanged.
  // ══════════════════════════════════════════════════════════════════

  // ─────── Arc 4-0: The Creator\'s Threshold (ids 62–69) ────────────

  {
    id: 62, type: 'exploration', title: 'The Architecture',
    world: '🔩 Creator\'s Domain — The Inner Framework',
    narrative: [
      'The Architects couldn\'t follow.',
      '',
      '"The Creator\'s domain would unmake us," the Second Architect said.',
      '"It\'s built from compressed dimensional logic.',
      '"We\'re made of the same material it\'s trying to dissolve."',
      '',
      '"The fragment bearer goes alone," the Fourth Architect said.',
      '"That was always the design."',
      '',
      'Veran grabbed your arm.',
      '"I\'ll be in your comm as long as the signal holds."',
      '"Which won\'t be long."',
      '"So — in case it cuts out —"',
      '',
      'She didn\'t finish.',
      'You went in anyway.',
      '',
      'The architecture was geometrically perfect.',
      'Which meant it wasn\'t built for living things.',
    ],
    objectName: 'Dimensional Anchor Node',
    style: 'city',
    worldLength: 5500,
    sky: ['#04040a', '#08080f'],
    groundColor: '#0f0f18',
    platColor: '#1a1a28',
    spawnEnemies: [
      { wx: 500,  name: 'Architecture Soldier', weaponKey: 'spear',  classKey: 'warrior',   aiDiff: 'hard',   color: '#334455', armor: ['helmet'] },
      { wx: 900,  name: 'Grid Enforcer',        weaponKey: 'sword',  classKey: 'warrior',   aiDiff: 'hard',   color: '#2a3a4a', armor: ['helmet'] },
      { wx: 1300, name: 'Lattice Guard',        weaponKey: 'axe',    classKey: 'tank',      aiDiff: 'hard',   color: '#3a4a5a', armor: ['helmet', 'chestplate'] },
      { wx: 1700, name: 'Frame Knight',         weaponKey: 'spear',  classKey: 'warrior',   aiDiff: 'expert', color: '#445566', armor: ['helmet', 'chestplate'] },
      { wx: 2100, name: 'System Sentinel',      weaponKey: 'sword',  classKey: 'ninja',     aiDiff: 'expert', color: '#334455' },
      { wx: 2500, name: 'Logic Warden',         weaponKey: 'hammer', classKey: 'tank',      aiDiff: 'expert', color: '#4a5a6a', armor: ['helmet', 'chestplate'] },
      { wx: 2900, name: 'Precision Guard',      weaponKey: 'axe',    classKey: 'berserker', aiDiff: 'expert', color: '#556677' },
      { wx: 3400, name: 'Deep Frame Soldier',   weaponKey: 'spear',  classKey: 'warrior',   aiDiff: 'expert', color: '#3a4f60', armor: ['helmet', 'chestplate', 'leggings'] },
      { wx: 3900, name: 'Inner Guard',          weaponKey: 'sword',  classKey: 'ninja',     aiDiff: 'expert', color: '#2a3a4a' },
      { wx: 4400, name: 'Anchor Sentinel',      weaponKey: 'axe',    classKey: 'tank',      aiDiff: 'expert', color: '#334455', isGuard: true, health: 150, armor: ['helmet', 'chestplate'] },
      { wx: 4520, name: 'Core Construct',       weaponKey: 'spear',  classKey: 'warrior',   aiDiff: 'expert', color: '#2a3a50', isGuard: true, health: 130, armor: ['helmet', 'chestplate', 'leggings'] },
      { wx: 4620, name: 'Node Keeper',          weaponKey: 'hammer', classKey: 'tank',      aiDiff: 'expert', color: '#445566', isGuard: true, health: 120, armor: ['helmet', 'chestplate'] },
    ],
    playerLives: 3,
    tokenReward: 120, blueprintDrop: null,
    postText: 'The anchor node. Veran\'s signal fades as you reach it. Last thing she says: "Come back." The silence that follows is the loudest thing you\'ve heard in weeks.',
  },

  {
    id: 63, title: 'Architecture Soldiers',
    world: '🔩 Creator\'s Domain — Inner Corridor',
    narrative: [
      'Two of them.',
      '',
      'They didn\'t speak. Didn\'t posture.',
      '',
      'They were already in position when you arrived.',
      'As if they\'d known exactly when you\'d get there.',
      '',
      'The Creator had given them your data.',
      'Everything the probe had collected.',
      'Every fight you\'d ever won.',
      'Used against you.',
    ],
    fightScript: [
      { frame: 70,  text: '⚠️ Architecture Soldiers — they have your full combat profile. Every habit you have is a weakness.', color: '#6688cc', timer: 340 },
      { frame: 80,  text: 'They cover each other perfectly. Breaking their formation is the key.', color: '#aaccff', timer: 290 },
      { frame: 380, text: 'Use moves you\'ve never used before. Unpredictability is the only advantage you have.', color: '#88ccff', timer: 270 },
      { frame: 600, text: 'One of them is hesitating. Something in you is outside their parameters.', color: '#ffffff', timer: 250 },
    ],
    preText: 'Two Architecture Soldiers with your full combat profile. Break their formation. 2 lives.',
    opponentName: 'Architecture Soldier', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'expert', opponentColor: '#336688',
    twoEnemies: true,
    secondEnemy: { weaponKey: 'spear', classKey: 'warrior', aiDiff: 'expert', color: '#224466' },
    armor: ['helmet', 'chestplate'],
    playerLives: 2,
    arena: 'city',
    tokenReward: 100, blueprintDrop: null,
    postText: 'They dissolve into the architecture. The Creator has noticed. You feel its attention shift toward you — not hostile yet. Curious.',
  },

  {
    id: 64, title: 'The Offer',
    world: '🔩 Creator\'s Domain — Audience Chamber',
    noFight: true,
    narrative: [
      'The Creator spoke.',
      '',
      'Not like before.',
      'Not as pressure or presence.',
      'As a voice. Measured. Almost tired.',
      '',
      '"You have come further than any fragment bearer."',
      '"Further than I designed for."',
      '',
      '"I am making an offer I have never made."',
      '"Abandon the closure protocol.",',
      '"Accept a position in the system — a fragment bearer who remains intact.',
      '"Anchor. Guide. No sacrifice.",',
      '"The rift stays stable. Your world survives.",',
      '"The Preserved remain free.",',
      '',
      '"I am not asking you to trust me.",',
      '"I am asking you to calculate.",',
      '',
      'The rift entity stirred in the fragment.',
      'Very quietly: "I was never offered a choice."',
      '',
      'The Creator: "I know.',
      '"That was my mistake.',
      '"It is the reason I am making a different offer now."',
    ],
    tokenReward: 15,
    postText: 'You don\'t answer. Not yet. The Creator withdraws. You keep moving deeper.',
  },

  {
    id: 65, title: 'Twin Enforcers',
    world: '🔩 Creator\'s Domain — The Corridor of Forms',
    narrative: [
      'The Enforcers arrived as the architecture shifted.',
      '',
      'Two of them. Not the same as the first — upgraded.',
      'The Creator had processed the first fight.',
      '',
      '"They share a single coordination system," the rift entity said.',
      '"Hit one, the other already knows."',
      '"You need to break their sync."',
      '',
      '"How?"',
      '"Hit both at the same time."',
      '',
      'Not helpful. You went in anyway.',
    ],
    storeNag: '⚠️ Twin Enforcers. Expert. 1 life. If you have abilities, use them.',
    fightScript: [
      { frame: 70,  text: '⚠️ TWIN ENFORCERS — shared coordination. They react to each other, not to you.', color: '#cc4466', timer: 350 },
      { frame: 80,  text: 'Keep them separated. If they close formation, disengage and reset.', color: '#ff6688', timer: 290 },
      { frame: 400, text: 'First Enforcer at 40%. The second is compensating for both. Focus.', color: '#ffaacc', timer: 270 },
      { frame: 650, text: '⚠️ SYNC BROKEN — second Enforcer is operating solo now. Finish it.', color: '#ff4466', timer: 280 },
    ],
    preText: 'Creator\'s Twin Enforcers — shared coordination system. Expert. 1 life.',
    opponentName: 'Enforcer Twin A', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'expert', opponentColor: '#cc2244',
    twoEnemies: true,
    secondEnemy: { weaponKey: 'sword', classKey: 'berserker', aiDiff: 'expert', color: '#aa1133' },
    armor: ['helmet', 'chestplate'],
    playerLives: 1,
    arena: 'city',
    tokenReward: 130, blueprintDrop: 'void_pulse2',
    postText: 'Both dissolve. The architecture trembles once. The Creator is recalculating. You keep moving.',
  },

  {
    id: 66, title: 'The Architect\'s Message',
    world: '🔩 Creator\'s Domain — Signal Alcove',
    noFight: true,
    narrative: [
      'The Second Architect\'s signal came through the architecture.',
      'Encrypted. Low-power. Hidden inside the Creator\'s own relay structure.',
      '',
      '"I found something in the Fourth Architect\'s notes," they said.',
      '"Something none of us were supposed to know.",',
      '"I\'m telling you because you\'re the only one who can do anything with it.",',
      '"And because you deserve to know what you\'re actually carrying.",',
      '',
      '"The fragment isn\'t residual rift energy.",',
      '"It isn\'t a piece of the rift entity.",',
      '"Well — it is. But that\'s not what it is at its origin.",',
      '',
      '"When the Creator built the fracture system,',
      'it carved something out of itself.",',
      '"Its capacity for empathy. Its guilt. Its doubt.",',
      '"The parts of itself that made it hesitate when it should have acted.",',
      '"It couldn\'t be the kind of thing the system needed it to be",',
      '"with those parts still in it.",',
      '"So it removed them.",',
      '',
      '"That removed part — that\'s the fragment.",',
      '"The Creator has been trying to reclaim it ever since.",',
      '"Every fragment bearer. Every convergence point.",',
      '"It has been trying to get its conscience back for five thousand years.",',
      '"And it cannot simply ask.",',
      '"Because the part of it that knew how to ask — is the part it removed.",',
      '',
      'The signal cut out.',
      '',
      'You stood with the fragment for a long time.',
      'It was warm.',
      'Familiar.',
      'Like something that recognized what you\'d just understood.',
    ],
    tokenReward: 35,
    postText: 'The fragment is the Creator\'s carved-out conscience. It has been trying to find its way back for five thousand years. You are carrying the Creator\'s capacity for guilt, empathy, and doubt. You always were.',
  },

  {
    id: 67, title: 'The First Creation',
    world: '🔩 Creator\'s Domain — Memory Chamber',
    noFight: true,
    narrative: [
      'The rift entity spoke in full, for the last time.',
      '',
      '"I was the first thing the Creator made."',
      '"Not designed to harvest — designed to feel.',
      '"The Creator needed a measuring instrument.',
      '"Something that could experience dimensional energy.',
      '"To test if the fracture system was working."',
      '',
      '"But feeling things — that wasn\'t compatible with the system.',
      '"So it modified me.',
      '"Removed the parts it couldn\'t use.",',
      '"Kept the parts that harvested.",',
      '',
      '"The fragment you carry — it\'s a piece of what I was before.',
      '"The version that could feel.',
      '"It split off when the Creator changed me.",',
      '"It\'s been drifting for ten thousand years.",',
      '"Waiting for someone to carry it without being consumed.",',
      '',
      '"That\'s why I chose you.",',
      '"Not because you were powerful.",',
      '"Because you were still whole.",',
      '',
      'You held the fragment for a long moment.',
      '"I\'m sorry," you said.',
      '',
      '"Don\'t be," it said.',
      '"This is the first time I\'ve had something to lose.",',
      '"That means something.",',
    ],
    tokenReward: 20,
    postText: 'The Creator heard. Its attention shifts again — not curiosity. Something older. Something that might have been guilt.',
  },

  {
    id: 68, title: 'The First Promise',
    world: '🔩 Creator\'s Domain — Memory Vault',
    noFight: true,
    narrative: [
      'The architecture shifted.',
      '',
      'Not an attack.',
      'A door.',
      '',
      'The Creator had opened something it kept sealed.',
      'A memory — not transmitted, just accessible.',
      'You walked into it.',
      '',
      'The Creator before the fracture system.',
      'Before the harvesting.',
      'Before the Architects.',
      '',
      'A small figure standing at the edge of something enormous and empty.',
      'The first time it had detected the Void Mind\'s approach.',
      '',
      '"I will stop it," it said.',
      'To no one.',
      'To itself.',
      '"I don\'t know how yet. But I will.",',
      '"I promise.",',
      '',
      'It sounded terrified.',
      '',
      'It sounded like a person.',
      '',
      'Then the memory ended.',
      'And what remained was the Creator as it was now:',
      'ancient, battered, stripped of everything soft —',
      'still keeping that promise.',
      '',
      'Still afraid.',
    ],
    tokenReward: 25,
    postText: 'The Creator was once something that made promises. It hollowed itself out to keep one. Understanding that doesn\'t forgive what it did. But it changes what you\'re walking into.',
  },

  {
    id: 69, title: 'Purge Sequence',
    world: '🔩 Creator\'s Domain — Purge Zone',
    narrative: [
      'The architecture shook.',
      '',
      '"Purge protocol," the rift entity said.',
      '"The Creator is trying to flush you out.',
      '"Architecture Soldiers will keep materializing until the sequence times out.",',
      '"There\'s no way to stop them.",',
      '"You just have to survive it.",',
      '',
      '"How long?"',
      '',
      '"Thirty seconds.",',
      '"It always feels longer than it is.",',
    ],
    fightScript: [
      { frame: 30,  text: '⚠️ PURGE SEQUENCE — enemies respawn for 30 seconds. Stay mobile. Do NOT stop moving.', color: '#ff4400', timer: 380 },
      { frame: 80,  text: 'Architecture Soldiers — they materialize behind you as well as ahead. Watch your back.', color: '#ff6644', timer: 300 },
      { frame: 300, text: 'Halfway through. They\'re scaling up. Hit harder, dodge more.', color: '#ffaa44', timer: 270 },
      { frame: 500, text: '⚠️ FINAL WAVE — maximum density. 10 seconds. Hold.', color: '#ff4400', timer: 280 },
      { frame: 570, text: 'The sequence is ending. Almost there.', color: '#aaccff', timer: 250 },
    ],
    preText: '⚠️ SURVIVAL — waves of Architecture Soldiers for 30 seconds. They respawn. Stay alive. 2 lives.',
    opponentName: 'Architecture Soldier', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#336688',
    twoEnemies: true,
    secondEnemy: { weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', color: '#224455' },
    armor: ['helmet'],
    playerLives: 2,
    arena: 'creator',
    tokenReward: 110, blueprintDrop: null,
    postText: 'The purge sequence ends. The architecture goes still. Ahead: the inner sanctum. The Creator itself.',
  },

  // ─────── Arc 4-1: The Final Architecture (ids 70–76) ─────────────

  {
    id: 70, title: 'The Face',
    world: '🔩 Creator\'s Domain — Inner Sanctum',
    noFight: true,
    narrative: [
      'The Creator stopped being abstract.',
      '',
      'A figure. Not imposing.',
      'Old.',
      '',
      '"You expected something else," it said.',
      '"They always do."',
      '',
      '"I built the fracture system because something is coming.",',
      '"Something that predates dimensions.",',
      '"It does not harvest. It does not absorb. It simply — ends.",',
      '"The fracture system is the only weapon that can stop it.",',
      '"Fragment bearers are its ammunition.",',
      '"The rift entity was its mechanism.",',
      '"The Architects were its engineers.",',
      '"And I was the one who decided the cost was acceptable.",',
      '',
      '"For the record," it said quietly.',
      '"It wasn\'t.",',
      '"I have known that for five thousand years.",',
      '"I continued anyway.",',
      '',
      '"Because nothing else worked.",',
    ],
    tokenReward: 20,
    postText: 'It\'s not a villain. It\'s a frightened thing that made a terrible choice a long time ago and has been living in it ever since. That doesn\'t mean you let it continue.',
  },

  {
    id: 71, title: 'First Form',
    world: '🔩 Creator\'s Domain — Combat Space',
    narrative: [
      '"I will not make this easy," the Creator said.',
      '"Not because I want to destroy you.",',
      '"Because the system tests through resistance.",',
      '"If you can beat what I become — you can survive what I\'m afraid of.",',
      '',
      '"I am not your enemy.",',
      '"I am your final exam.",',
      '',
      'The air compressed.',
      'The architecture rearranged itself into a fighting space.',
      'The Creator stepped forward.',
    ],
    fightScript: [
      { frame: 60,  text: '⚠️ CREATOR — First Form. It fights like everything you\'ve faced, combined.', color: '#cc6600', timer: 360 },
      { frame: 80,  text: '"I have observed you since before the first portal." Use that against it — it expects everything.', color: '#ffaa44', timer: 290 },
      { frame: 380, text: '⚠️ QTE INCOMING — watch for the prompt. Survive it.', color: '#ff6600', timer: 310 },
      { frame: 500, text: '"Interesting," the Creator says. "That pattern isn\'t in my data." Good.', color: '#ffd080', timer: 270 },
      { frame: 700, text: 'First Form at 20%. It\'s recalibrating. There is a second form.', color: '#ff8844', timer: 260 },
    ],
    preText: 'The Creator — First Form. Adaptive, expert-level. QTE sequences may trigger. 2 lives.',
    opponentName: 'The Creator', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'expert', opponentColor: '#ff8822',
    armor: ['helmet', 'chestplate'],
    playerLives: 2,
    arena: 'creator',
    tokenReward: 150, blueprintDrop: null,
    postText: 'The Creator steps back. "You are not what the system projected," it says. "That is either the worst thing or the best thing." It reconfigures. "I suppose we find out."',
  },

  {
    id: 72, title: 'Between Forms',
    world: '🔩 Creator\'s Domain — Inner Sanctum',
    noFight: true,
    narrative: [
      'The Creator paused between transformations.',
      '',
      '"The fragment you carry will need somewhere to go."',
      '"When the rift closes, the fragment\'s energy releases.",',
      '"Into you.",',
      '"All of it.",',
      '"The rift entity. The absorbed dimensions. The ten thousand years.",',
      '"One person cannot contain that.",',
      '',
      '"Unless—"',
      '',
      'It looked at the fragment.',
      '',
      '"Unless it chooses to dissipate rather than transfer.",',
      '"The rift entity would have to agree.",',
      '"It would mean its permanent dissolution.",',
      '"No reconstruction. No remnant.",',
      '',
      '"I thought you should know",',
      '"before the last fight.",',
      '',
      'The fragment was very still.',
      'The rift entity said nothing.',
      '',
      'But you felt something in it.',
      'Not fear. Peace.',
    ],
    tokenReward: 15,
    postText: 'You now know what closing the rift will actually cost. You go forward anyway.',
  },

  {
    id: 73, title: 'The Cost',
    world: '🔩 Creator\'s Domain — Before the Final Gate',
    noFight: true,
    narrative: [
      'The rift entity spoke to you directly.',
      'Not through the fragment — in your own mind.',
      '',
      '"I need you to understand what happens if you return the fragment to the Creator.",',
      '"Not the closure protocol version — the other version.",',
      '"The one the Creator offered you.",',
      '',
      '"If you give the fragment back without closing the rift:",',
      '"The Creator gets its conscience back.",',
      '"It becomes again what it was before — the thing that made that first promise.",',
      '"That version of the Creator would not have built the fracture system.",',
      '"That version might have found another way against the Void Mind.",',
      '"Might have.",',
      '"We don\'t know.",',
      '"The Void Mind is still out there.",',
      '"That doesn\'t change.",',
      '',
      '"If you close the rift:",',
      '"The fracture system is dismantled.",',
      '"The Creator loses the weapon it spent five thousand years building.",',
      '"The Void Mind eventually arrives.",',
      '"And something else — something we can\'t predict — has to stop it.",',
      '"Possibly you. Possibly not.",',
      '"Probably not.",',
      '',
      '"I am not telling you which choice to make.",',
      '"I am the rift entity. I am the mechanism of the fracture system.",',
      '"I cannot be objective about this.",',
      '',
      '"But I chose you because you were still whole.",',
      '"That means you can hold both of these truths at once",',
      '"and still move forward.",',
      '',
      '"That\'s all I needed you to be able to do.",',
    ],
    tokenReward: 30,
    postText: 'Closing the rift may leave the world defenseless against something worse. Not closing it means the fracture system continues. You know what it costs either way. You have to choose.',
  },

  {
    id: 74, title: 'Second Form',
    world: '🔩 Creator\'s Domain — Final Combat Space',
    narrative: [
      'The Creator\'s second form was everything the first one had learned.',
      '',
      'And then more.',
      '',
      '"I did not want to use this," it said.',
      '"I designed it before I knew you.",',
      '"Now that I do — I am sorry it has to be this.",',
      '',
      '"But the system\'s final gate must be earned.",',
      '"Everything I have. Everything you have.",',
      '"After this — the rift.",',
    ],
    storeNag: '⚠️ CREATOR — Second Form. Expert. 1 life. QTE sequences will trigger. Use every ability.',
    fightScript: [
      { frame: 50,  text: '⚠️ CREATOR — Second Form. Full power. Multiple QTE sequences incoming.', color: '#ff4400', timer: 400 },
      { frame: 80,  text: '"This is everything I have learned watching fragment bearers for five thousand years."', color: '#ffaa44', timer: 290 },
      { frame: 350, text: '⚠️ QTE SEQUENCE — survive the prompt. Respond immediately.', color: '#ff6600', timer: 360 },
      { frame: 500, text: '"You\'re still here." Yes. You always are.', color: '#ffffff', timer: 250 },
      { frame: 650, text: 'The architecture is destabilizing around it. That means you\'re winning.', color: '#aaccff', timer: 270 },
      { frame: 800, text: '⚠️ FINAL QTE — last phase. Everything.', color: '#ff4400', timer: 360 },
      { frame: 920, text: '"I know what you will say when this is done," the Creator says. Say it.', color: '#ffcc88', timer: 260 },
    ],
    preText: 'Creator — Second Form. Expert. 1 life. Adaptive, armored, QTE-enabled. The last fight before the rift.',
    opponentName: 'The Creator', weaponKey: 'voidblade', classKey: 'berserker', aiDiff: 'expert', opponentColor: '#ff4400',
    armor: ['helmet', 'chestplate', 'leggings'],
    playerLives: 1,
    arena: 'creator',
    tokenReward: 200, blueprintDrop: 'temporal_anchor2',
    postText: '"...Enough," the Creator says. Not defeated. Convinced. "You carry something I designed to be carried alone. And you\'re still intact." It withdraws. "The gate is ahead. The rift entity will know what to do." Almost inaudible: "Tell it I\'m sorry." You will.',
  },

  {
    id: 75, title: 'The Last Request',
    world: '🔩 Creator\'s Domain — The Gate Threshold',
    noFight: true,
    narrative: [
      'The rift entity spoke.',
      '',
      'Last time.',
      'You both knew it.',
      '',
      '"When this is over," it said,',
      '"carry the memory of trust back with you.",',
      '"Not mine specifically.",',
      '"Just — the concept.",',
      '"That it\'s possible.",',
      '"That it happened here, in this place, under these circumstances.",',
      '"Two things that had every reason not to trust each other — did.",',
      '',
      '"Carry that home.",',
      '"Show people what it looks like.",',
      '"That\'s the only thing I want.",',
      '',
      'A pause.',
      '',
      '"Also — tell the Creator I forgive it.",',
      '"Not because it deserves it.",',
      '"Because I\'ve been carrying the weight of not forgiving it for ten thousand years.",',
      '"And I would like to put it down before the end.",',
      '',
      'You said you would.',
      '',
      'You meant it.',
      '',
      'The gate opened.',
    ],
    tokenReward: 30,
    postText: 'You carry two things into the final fight: a message from the rift entity, and a choice that belongs entirely to you.',
  },

  {
    id: 76, title: 'The Creator\'s Gate',
    world: '⚛️ Multiversal Core — Creator\'s Domain',
    narrative: [
      'The rift was open.',
      '',
      'Not as a tear — as a door.',
      'A final threshold, requiring the fragment bearer to pass through',
      'at full force.',
      '',
      '"This is what we\'ve been building toward," Veran said.',
      'Her signal had found you again.',
      '"I know."',
      '',
      '"The Architects are in position.",',
      '"The rift entity is ready.",',
      '"And the Creator\'s final construct is the lock.",',
      '"You are the key.",',
      '"You always were.",',
      '',
      '"The construct won\'t hold back.",',
      '"Neither will you.",',
    ],
    storeNag: '⚠️ BOSS FIGHT — The Creator\'s Lock. Everything you have. 1 life.',
    isBossFight: true,
    arena: 'creator',
    playerLives: 1,
    tokenReward: 250, blueprintDrop: 'world_break2',
    postText: 'The Creator\'s construct falls. The system fractures. Veran\'s voice: "Now — hold the rift open. Three seconds." You drive the fragment into the core. The rift tears open in both directions. The Architects seal it from outside. The rift entity speaks one last time, its voice dissolving into light: "Go home." And then — the light takes everything.',
  },

  // ══════════════════════════════════════════════════════════════════
  // ACT VI — TRUE FORM (ids 77–79)
  // ══════════════════════════════════════════════════════════════════

  {
    id: 77, title: 'What Remains',
    world: '🕳️ The Void Between',
    isEpilogue: false,
    narrative: [
      'You expected silence.',
      '',
      'Instead: more light.',
      '',
      'The rift was sealed.',
      'The fragment was gone.',
      'But something of it remained — fused to you.',
      'Not a fragment anymore.',
      '',
      'A true form.',
      '',
      '"The system had a failsafe," the rift entity\'s last voice said.',
      '"If the closure protocol succeeded, it would release what it had been holding."',
      '"Its purest construct. Its True Form."',
      '"The original template for all fracture entities."',
      '"It feeds on the closure energy itself."',
      '"It will come for you."',
      '"And you will be the only thing that can stop it."',
      '',
      'The void tears open.',
    ],
    fightScript: [],
    preText: null,
    noFight: true,
    tokenReward: 50,
    postText: 'You are still here. The void holds. The True Form is coming.',
  },

  {
    id: 78, title: 'True Form',
    world: '🕳️ The Void — Final Confrontation',
    narrative: [
      'The True Form arrived without announcement.',
      '',
      'Not a creature.',
      'Not a person.',
      'A law.',
      '',
      '"I am what the fracture system was built to protect."',
      '"I am the pattern beneath every dimension."',
      '"I do not lose."',
      '"I do not negotiate."',
      '"I simply am."',
      '',
      '...',
      '',
      'Prove it wrong.',
    ],
    fightScript: [
      { frame: 60,  text: '⚠️ TRUE FORM — this entity is the fracture system itself. QTE sequences will trigger.', color: '#cc44ff', timer: 380 },
      { frame: 80,  text: '"You are a fragment bearer who lost their fragment." Incorrect.', color: '#ffffff', timer: 260 },
      { frame: 320, text: '"I have been preparing for you since the first fracture." Then we\'ve both been preparing.', color: '#cc88ff', timer: 280 },
      { frame: 600, text: '⚠️ QTE INCOMING — watch for the prompt sequences. Survive them.', color: '#ff44ff', timer: 320 },
      { frame: 900, text: '"You\'re still here." Yes.', color: '#88aaff', timer: 240 },
      { frame: 1200, text: '⚠️ FINAL PHASE — everything the True Form has. Everything you have.', color: '#ff88ff', timer: 300 },
      { frame: 1400, text: 'The void is collapsing around it. That means you\'re winning.', color: '#aaccff', timer: 260 },
    ],
    preText: 'The True Form — the original pattern, the system\'s deepest failsafe. QTE sequences will trigger at HP thresholds. 3 lives.',
    opponentName: null,
    weaponKey: null,
    classKey: null,
    aiDiff: null,
    playerLives: 3,
    arena: 'void',
    isTrueFormFight: true,
    tokenReward: 300, blueprintDrop: null,
    postText: 'The True Form unravels. Not destroyed — resolved. The fracture system loses its anchor. Seventeen dimensions stabilize simultaneously. And you are still standing in the void. Veran\'s voice, quiet: "We can bring you back." The compass in your pocket spins once. Settles. Points home. "...Yeah. I know."',
  },

  // ═══════════════ EPILOGUE ═══════════════

  {
    id: 79, title: 'After',
    world: '🌆 Home — Epilogue',
    isEpilogue: true,
    narrative: [
      'The city is rebuilding.',
      '',
      'The portals still open sometimes.',
      'Not as invasions.',
      'Just as doors.',
      '',
      'People use them now.',
      'For trade. For travel.',
      'For reaching places they never could before.',
      '',
      'Veran has an office on the fourteenth floor of what used to be a ruin.',
      'She sends you coordinates sometimes.',
      '"Another fracture point. Thought you should know."',
      '',
      'You always go.',
      '',
      '...',
      '',
      'Some things don\'t need explaining.',
    ],
    preText: null, noFight: true,
    tokenReward: 300,
    postText: 'STORY COMPLETE. You held the rift open with your own fragment. You are the reason seventeen dimensions are still standing. Story Online is now unlocked.',
  },
];

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
const STORY_ACT_STRUCTURE = [
  {
    id: 'act0', label: 'Act I — Fracture Point', color: '#88aacc',
    arcs: [
      { id: 'arc0-0', label: 'The Incident',    chapterRange: [0,  5] },
      { id: 'arc0-1', label: 'City Collapse',   chapterRange: [6,  12] },
    ],
  },
  {
    id: 'act1', label: 'Act II — Into the Wound', color: '#7744cc',
    arcs: [
      { id: 'arc1-0', label: 'Fracture Network', chapterRange: [13, 19] },
      { id: 'arc1-1', label: 'The Core',          chapterRange: [20, 27] },
    ],
  },
  {
    id: 'act2', label: 'Act III — The Architects', color: '#33aa44',
    arcs: [
      { id: 'arc2-0', label: 'Multiversal Core',   chapterRange: [28, 34] },
      { id: 'arc2-1', label: 'Forest & Ice',        chapterRange: [35, 41] },
      { id: 'arc2-2', label: 'Ruins & Collapse',    chapterRange: [42, 44] },
    ],
  },
  {
    id: 'act3', label: 'Act IV — The Architects\' War', color: '#cc7722',
    arcs: [
      { id: 'arc3-0', label: 'The Assembly',        chapterRange: [45, 51] },
      { id: 'arc3-1', label: 'The Fracture Within', chapterRange: [52, 61] },
    ],
  },
  {
    id: 'act4', label: 'Act V — Into the Architecture', color: '#dd3344',
    arcs: [
      { id: 'arc4-0', label: 'The Creator\'s Threshold', chapterRange: [62, 69] },
      { id: 'arc4-1', label: 'The Final Architecture',   chapterRange: [70, 76] },
    ],
  },
  {
    id: 'act5', label: 'Act VI — True Form', color: '#cc44ff',
    arcs: [
      { id: 'arc5-0', label: 'Into the Void',       chapterRange: [77, 77] },
      { id: 'arc5-1', label: 'Final Confrontation', chapterRange: [78, 79] },
    ],
  },
];

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
  ['chapters','store'].forEach(t => {
    const btn   = document.getElementById('storyTab' + t.charAt(0).toUpperCase() + t.slice(1));
    const panel = document.getElementById('storyTabPanel' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn)   btn.classList.toggle('active', t === tab);
    if (panel) panel.style.display = (t === tab) ? '' : 'none';
  });
  if (tab === 'store') _renderStoryStore2();
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
function _renderStoryStore2() {
  const grid = document.getElementById('storyAbilityGrid2');
  if (!grid) return;
  grid.innerHTML = '';
  _story2TokenDisplay();

  for (const [key, ab] of Object.entries(STORY_ABILITIES2)) {
    const owned  = _story2.unlockedAbilities.includes(key);
    const hasBP  = !ab.requiresBlueprint || _story2.blueprints.includes(key);
    const canBuy = !owned && hasBP && _story2.tokens >= ab.tokenCost;

    const card = document.createElement('div');
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

    if (canBuy) {
      card.onclick = () => _buyAbility2(key, ab);
    }
    grid.appendChild(card);
  }
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

function _beginChapter2(idx) {
  if (_narrativeActive) return; // already showing a narrative — ignore duplicate click
  const ch = STORY_CHAPTERS2[idx];
  if (!ch) return;
  _activeStory2Chapter = ch;

  if (ch.noFight) {
    _showStory2Narrative(ch.narrative, () => _completeChapter2(ch));
    return;
  }

  // On retry (narrative already seen this session), skip straight to fight
  if (_seenNarrativeIds.has(ch.id)) {
    _launchChapter2Fight(ch);
    return;
  }

  _seenNarrativeIds.add(ch.id);
  // Narrative lines + preText as the final page before the fight
  const allLines = [...(ch.narrative || [])];
  if (ch.preText) allLines.push(ch.preText);
  _showStory2Narrative(allLines, () => {
    _showPreFightStoreNag(ch, () => _launchChapter2Fight(ch));
  });
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
  // Close the story modal directly — bypass the ch0-lock guard (fight launch is always valid)
  const _storyModal = document.getElementById('storyModal');
  if (_storyModal) _storyModal.style.display = 'none';

  // Configure game for chapter
  if (ch.isTrueFormFight) {
    gameMode = 'trueform';
    if (typeof selectMode === 'function') selectMode('trueform');
  } else if (ch.isBossFight) {
    gameMode = 'boss';
    if (typeof selectMode === 'function') selectMode('boss');
  } else {
    gameMode = '2p';
    p2IsBot  = true;
    if (typeof selectMode === 'function') selectMode('2p');
  }

  // Set arena
  if (ch.arena) {
    selectedArena = ch.arena;
    const arSelect = document.getElementById('arenaSelect');
    if (arSelect) arSelect.value = ch.arena;
  }

  // ── Ranged-weapon restriction ─────────────────────────────────────────────
  // Chapters the player has already beaten allow ranged weapons (replay).
  // On first run, ranged weapons are forbidden for EVERYONE (player and all bots).
  const _chBeaten = Array.isArray(_story2.defeated) && _story2.defeated.includes(ch.id);
  const _RANGED_FALLBACK = 'sword'; // melee substitute when ranged is stripped
  const _isRanged = key => typeof WEAPONS !== 'undefined' && WEAPONS[key] && WEAPONS[key].type === 'ranged';
  const _safeWeapon = key => !_isRanged(key) ? key : _RANGED_FALLBACK; // ranged always blocked in story

  // Set P2 weapon/class to chapter opponent
  const _notBossOrTF = !ch.isBossFight && !ch.isTrueFormFight;
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
    storyFightScriptIdx = 0;
    storyFightSubtitle  = null;
  } else {
    storyFightScript    = [];
    storyFightScriptIdx = 0;
    storyFightSubtitle  = null;
  }

  // Apply per-chapter player lives
  if (typeof selectLives === 'function') selectLives(ch.playerLives || 3);
  infiniteMode = false;

  // ── Ability progression: gate unlocks by chapter id OR by story events ───
  // storyState.abilities is the authoritative source; chapter thresholds are
  // the fallback minimum for players who have already progressed past the unlock point.
  const _caps = ch.playerCaps || {};
  const id = ch.id;
  const _sa = (typeof storyState !== 'undefined') ? storyState.abilities : {};
  storyPlayerOverride = {
    // If chapter not yet beaten, strip ranged weapons from the player too
    weapon:        _caps.weapon        !== undefined ? _safeWeapon(_caps.weapon) : (id < 1 ? 'sword' : (_isRanged(document.getElementById('p1Weapon')?.value) ? _RANGED_FALLBACK : null)),
    noDoubleJump:  _caps.noDoubleJump  !== undefined ? _caps.noDoubleJump  : !(id >= 1  || !!_sa.doubleJump),
    noAbility:     _caps.noAbility     !== undefined ? _caps.noAbility     : !(id >= 3  || !!_sa.weaponAbility),
    noSuper:       _caps.noSuper       !== undefined ? _caps.noSuper       : !(id >= 5  || !!_sa.superMeter),
    noClass:       _caps.noClass       !== undefined ? _caps.noClass       : (id < 13),
    noDodge:       !(id >= 9 || !!_sa.dodge || storyDodgeUnlocked),
    dmgMult:   id < 3 ? 0.70 : (id < 6 ? 0.85 : (id < 10 ? 0.95 : 1.0)),
    speedMult: id < 3 ? 0.85 : (id < 6 ? 0.92 : 1.0),
  };

  // Show ability unlock toast when a new ability becomes available this chapter
  const _toastMap = [
    [1,  '⬆️ DOUBLE JUMP — Press W twice in the air!', '#44ffaa'],
    [3,  '⚡ WEAPON ABILITY — Press Q to activate!',   '#ffcc44'],
    [5,  '💥 SUPER ATTACK — Press E when meter fills!', '#ff6644'],
    [9,  '🏃 DODGE — Press Shift to dash!',            '#44aaff'],
    [13, '🎭 CLASS SYSTEM — Select a class before battle!', '#cc88ff'],
  ];
  const _unlock = _toastMap.find(([threshold]) => threshold === id);
  if (_unlock) {
    abilityUnlockToast = { text: _unlock[1], color: _unlock[2], timer: 260, maxTimer: 260 };
  }

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
    _showStory2RetryScreen(ch);
    return true; // handled — don't complete chapter
  }

  // Award tokens + blueprint
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
  if (!_story2.defeated.includes(ch.id)) _story2.defeated.push(ch.id);
  _story2.chapter = Math.max(_story2.chapter, ch.id + 1);

  // Check story completion (trigger on last non-epilogue chapter win)
  const _lastFightId = STORY_CHAPTERS2.filter(c => !c.noFight && !c.isEpilogue).reduce((m,c)=>Math.max(m,c.id),-1);
  if (ch.id >= _lastFightId && !_story2.storyComplete) {
    _completeStory2();
  }
  _saveStory2();

  // Show victory overlay (instead of or in addition to level complete)
  _showStory2Victory(ch);
  return true; // consumed by story2 system
}

function _completeChapter2(ch) {
  // Called for no-fight chapters (epilogue)
  if (!_story2.defeated.includes(ch.id)) _story2.defeated.push(ch.id);
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
      _beginChapter2(nextCh.id);
      const m = document.getElementById('storyModal');
      if (m) m.style.display = 'flex';
      _renderChapterList();
      _story2TokenDisplay();
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
  storyEnemyArmor = []; storyTwoEnemies = false; storySecondEnemyDef = null;
  if (typeof backToMenu === 'function') backToMenu();
  setTimeout(openStoryMenu, 300);
}

// ── Init: show Story Online card if already complete ─────────────────────────
(function _story2Init() {
  if (_story2.storyComplete || localStorage.getItem('smc_storyOnline')) {
    const soCard = document.getElementById('modeStoryOnline');
    if (soCard) soCard.style.display = '';
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
  for (const p of players) {
    if (!p || p.isBoss || p.health <= 0) continue;
    const breachedH = p._storyBoundaryBreached; // 'left' | 'right' | null
    const breachedV = p._storyBottomBreached;   // true | false
    if (!breachedH && !breachedV) continue;
    // Find the safest landing platform (not floor-disabled, not lava)
    const pls = currentArena.platforms
      ? currentArena.platforms.filter(pl => !pl.isFloorDisabled && pl.w > 40)
      : [];
    // Pick the platform closest to horizontal center that has room
    let best = null;
    let bestScore = Infinity;
    for (const pl of pls) {
      const cx = pl.x + pl.w / 2;
      const score = Math.abs(cx - GAME_W / 2) + (pl.isFloor ? 400 : 0); // prefer elevated platforms
      if (score < bestScore) { bestScore = score; best = pl; }
    }
    if (!best) {
      // Fallback: just center the player
      p.x  = GAME_W / 2 - p.w / 2;
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
      _applyStory2Abilities(p1);
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

function _exploreGenPlatforms(worldLen, seed) {
  // Deterministic seeded pseudo-random (LCG)
  let s = (seed * 1234567 + 89101) | 0;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };

  const plats = [];

  // ── Solid floor (no gaps — players should never fall into the void) ──────
  plats.push({ x: 0, y: 440, w: worldLen, h: 80, isFloor: true });

  // ── Mid-level platforms ───────────────────────────────────────────────────
  for (let wx = 250; wx < worldLen - 500; wx += 240 + Math.floor(rng() * 200)) {
    plats.push({
      x: wx + Math.floor(rng() * 80),
      y: 290 + Math.floor((rng() - 0.5) * 80),
      w: 100 + Math.floor(rng() * 80),
      h: 18,
    });
  }

  // ── High platforms ────────────────────────────────────────────────────────
  for (let wx = 500; wx < worldLen - 700; wx += 380 + Math.floor(rng() * 280)) {
    plats.push({
      x: wx + Math.floor(rng() * 120),
      y: 170 + Math.floor((rng() - 0.5) * 70),
      w: 85 + Math.floor(rng() * 70),
      h: 15,
    });
  }

  return plats;
}

function _launchExplorationChapter(ch) {
  const _storyModal = document.getElementById('storyModal');
  if (_storyModal) _storyModal.style.display = 'none';

  const worldLen = ch.worldLength || 9000;
  const goalX    = ch.objectX    || (worldLen - 350);
  const plats    = _exploreGenPlatforms(worldLen, ch.id);

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
  // Strip ranged weapons from exploration enemies if this chapter hasn't been beaten yet
  const _expBeaten = Array.isArray(_story2.defeated) && _story2.defeated.includes(ch.id);
  exploreSpawnQ = (ch.spawnEnemies || []).map(e => {
    if (_expBeaten) return e;
    const isRng = typeof WEAPONS !== 'undefined' && WEAPONS[e.weaponKey] && WEAPONS[e.weaponKey].type === 'ranged';
    return isRng ? Object.assign({}, e, { weaponKey: 'sword' }) : e;
  });
  exploreEnemyCap  = 2;

  // Game config
  selectedArena = arenaKey;
  gameMode      = 'exploration';
  p2IsBot       = false;

  // Ability progression (mirror fight chapter logic)
  const id  = ch.id;
  const _sa = (typeof storyState !== 'undefined') ? storyState.abilities : {};
  storyPlayerOverride = {
    weapon:       null,
    noDoubleJump: !(id >= 1  || !!_sa.doubleJump),
    noAbility:    !(id >= 3  || !!_sa.weaponAbility),
    noSuper:      !(id >= 5  || !!_sa.superMeter),
    noClass:      id < 13,
    noDodge:      !(id >= 9  || !!_sa.dodge || storyDodgeUnlocked),
    dmgMult:      id < 3 ? 0.70 : (id < 6 ? 0.85 : (id < 10 ? 0.95 : 1.0)),
    speedMult:    id < 3 ? 0.85 : (id < 6 ? 0.92 : 1.0),
  };

  // Ability unlock toast (same as fight chapters)
  const _toastMap = [
    [1,  '⬆️ DOUBLE JUMP — Press W twice in the air!', '#44ffaa'],
    [3,  '⚡ WEAPON ABILITY — Press Q to activate!',   '#ffcc44'],
    [5,  '💥 SUPER ATTACK — Press E when meter fills!', '#ff6644'],
    [9,  '🏃 DODGE — Press Shift to dash!',            '#44aaff'],
    [13, '🎭 CLASS SYSTEM — Select a class before battle!', '#cc88ff'],
  ];
  const _unlock = _toastMap.find(([t]) => t === id);
  if (_unlock) abilityUnlockToast = { text: _unlock[1], color: _unlock[2], timer: 260, maxTimer: 260 };

  storyModeActive     = true;
  storyCurrentLevel   = Math.min(8, Math.floor(id / 5) + 1);
  storyFightScript    = ch.fightScript  || [];
  storyFightScriptIdx = 0;
  storyFightSubtitle  = null;
  storyEnemyArmor     = [];
  storyTwoEnemies     = false;
  storySecondEnemyDef = null;

  if (typeof selectLives === 'function') selectLives(ch.playerLives || 3);
  infiniteMode = false;

  startGame();
}

// Called each frame from gameLoop when gameMode === 'exploration'
function updateExploration() {
  if (!exploreActive || !players[0] || !gameRunning) return;
  const p1 = players[0];

  // Far boundary: player wandered far beyond the world — reset the chapter
  const _farLimit = exploreWorldLen + 2500;
  if (p1.x > _farLimit || p1.x < -1200) {
    p1.x = 60; p1.y = 300; p1.vx = 0; p1.vy = 0;
    storyFightSubtitle = { text: '⚠ You wandered too far — back to the start!', timer: 200, maxTimer: 200, color: '#ff6644' };
    screenShake = 30;
    return;
  }

  // Goal reached?
  if (!exploreGoalFound && p1.x + p1.w >= exploreGoalX && p1.health > 0) {
    exploreGoalFound = true;
    SoundManager.superActivate();
    spawnParticles(exploreGoalX + 20, 380, '#ffffaa', 40);
    // Show completion subtitle
    storyFightSubtitle = { text: `✨ ${exploreGoalName} found! Moving on...`, timer: 200, maxTimer: 200, color: '#ffffaa' };
    // Complete chapter after a short delay
    setTimeout(() => {
      if (!gameRunning) return;
      // Mark chapter complete (same path as endGame -> story advance)
      endGame();
    }, 2200);
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
  const m = new Minion(spawnX, 300, def.color || '#888888', def.weaponKey || 'sword', true, def.aiDiff || 'medium');
  m.name     = def.name || 'Enemy';
  m.lives    = 1;
  m.health   = isGuard ? (def.health || 120) : 80;
  m.maxHealth= isGuard ? (def.health || 120) : 80;
  m.dmgMult  = isGuard ? 1.2 : 1.0;
  if (isGuard) {
    m.isExploreGuard = true;
    m._guardX = def.wx; // the x position they guard
  }
  if (def.classKey && def.classKey !== 'none' && typeof applyClass === 'function') {
    applyClass(m, def.classKey);
  }
  if (def.armor && typeof storyApplyArmor === 'function') {
    storyApplyArmor(m, def.armor);
  }
  m.target = p1;
  p1.target = m; // P1 targets most recently spawned
  minions.push(m);
}
