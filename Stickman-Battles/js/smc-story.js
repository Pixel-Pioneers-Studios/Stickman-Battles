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
  8: { enemyDmgMult: 1.00, enemyAtkCdMult: 1.00 }, // Ch7 — boss fight, unscaled
  9: { enemyDmgMult: 1.00, enemyAtkCdMult: 1.00 }, // Final — unscaled
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
    num: 9,
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
  if (num === 8) return { text: 'Challenger',  color: '#ff8844' };
  return { text: 'Complete',    color: '#ffaaff' };
}

function _renderChapterList() {
  const list = document.getElementById('storyLevelList');
  if (!list) return;
  list.innerHTML = '';

  const cur = _story2.chapter; // index of the next unlocked chapter

  const actLabels = {
    0:  '— Act I: The World Breaks —',
    6:  '— Act II: Adapting —',
    11: '— Act III: The Decision —',
    13: '— Act IV: The New Realm —',
    21: '— Act V: Home World Legends —',
    25: '— Epilogue —',
  };

  STORY_CHAPTERS2.forEach((ch, i) => {
    const done    = _story2.defeated.includes(i);
    const current = i === cur;
    const locked  = i > cur;

    if (actLabels[i]) {
      const sep = document.createElement('div');
      sep.style.cssText = 'font-size:0.59rem;letter-spacing:2px;text-transform:uppercase;color:rgba(150,130,240,0.55);text-align:center;padding:8px 0 3px;';
      sep.textContent = actLabels[i];
      list.appendChild(sep);
    }

    const borderCol = done ? 'rgba(80,220,120,0.35)' : current ? 'rgba(120,170,255,0.40)' : 'rgba(255,255,255,0.07)';
    const bgCol     = done ? 'rgba(30,90,55,0.28)'  : current ? 'rgba(25,55,110,0.35)'  : 'rgba(10,10,30,0.20)';

    const el = document.createElement('div');
    el.style.cssText = [
      'display:flex', 'align-items:center', 'gap:11px',
      'padding:9px 13px', 'border-radius:9px', 'margin-bottom:4px',
      `border:1px solid ${borderCol}`, `background:${bgCol}`,
      `opacity:${locked ? '0.32' : '1'}`,
      'transition:background 0.14s,border-color 0.14s',
      locked ? 'cursor:default' : 'cursor:pointer',
    ].join(';');

    const statusEl = document.createElement('span');
    statusEl.style.cssText = 'font-size:0.75rem;min-width:18px;text-align:center;flex-shrink:0;';
    statusEl.textContent = done ? '✓' : locked ? '🔒' : current ? '▶' : String(i + 1);
    statusEl.style.color  = done ? '#66ee99' : current ? '#aacfff' : '#445';

    const livesTag = (!locked && !done && ch.playerLives === 1)
      ? `<span style="font-size:0.56rem;color:#ff5533;background:rgba(255,50,20,0.15);border:1px solid rgba(255,50,20,0.30);border-radius:3px;padding:1px 4px;margin-left:4px;">1 life</span>`
      : (!locked && !done && ch.playerLives === 2)
      ? `<span style="font-size:0.56rem;color:#ffaa44;background:rgba(255,140,0,0.08);border:1px solid rgba(255,140,0,0.25);border-radius:3px;padding:1px 4px;margin-left:4px;">2 lives</span>`
      : '';
    const rewardTag = (!done && ch.tokenReward)
      ? `<span style="font-size:0.56rem;color:#998833;margin-left:3px;">+${ch.tokenReward}🪙</span>` : '';
    const bpTag = (!done && ch.blueprintDrop && STORY_ABILITIES2[ch.blueprintDrop])
      ? `<span style="font-size:0.56rem;color:#5577bb;margin-left:2px;">📋</span>` : '';

    const infoEl = document.createElement('div');
    infoEl.style.cssText = 'flex:1;min-width:0;line-height:1.3;';
    infoEl.innerHTML =
      `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:2px;">` +
        `<span style="font-size:0.83rem;color:${done ? '#88ffaa' : current ? '#dde4ff' : '#556'};">${ch.title}</span>` +
        livesTag + rewardTag + bpTag +
      `</div>` +
      `<div style="font-size:0.62rem;color:#4a4a6a;margin-top:1px;">${ch.world || ''}</div>`;

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
    lvl.mode === 'boss'     ? '⚔ Face the Creator' :
    lvl.mode === 'trueform' ? '✦ Face True Form'   : 'Fight →';
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
  };
}

let _story2 = (function() {
  try {
    const raw = localStorage.getItem(_STORY2_KEY);
    if (!raw) return _defaultStory2Progress();
    const p = JSON.parse(raw);
    return (p && Array.isArray(p.defeated)) ? p : _defaultStory2Progress();
  } catch(e) { return _defaultStory2Progress(); }
})();

function _saveStory2() {
  try { localStorage.setItem(_STORY2_KEY, JSON.stringify(_story2)); } catch(e) {}
}

// ── Chapter definitions ───────────────────────────────────────────────────────
const STORY_CHAPTERS2 = [

  // ═══════════════ ACT I — THE WORLD BREAKS ═══════════════

  {
    id: 0, title: 'Tuesday',
    world: '🌆 Home City',
    narrative: [
      'You wake up.',
      'Go to work.',
      'Come home.',
      'Tuesday.',
      'Same as Monday.',
      'Same as every day before.',
      '',
      'You had no reason to think today would be different.',
    ],
    fightScript: [
      { frame: 30,  speaker: 'GUIDE', text: 'Press  A / D  to move.  W  to jump.', color: '#ffffaa', timer: 330 },
      { frame: 70,  text: 'You\'ve never been in a fight before. Neither has your fist.', color: '#aaccff', timer: 240 },
      { frame: 240, speaker: 'GUIDE', text: 'Press  Space  to attack.  Hold S  to shield.', color: '#ffffaa', timer: 330 },
      { frame: 380, text: '"Why are you fighting me?!" Neither of you knows.', color: '#aaccff', timer: 220 },
      { frame: 520, speaker: 'GUIDE', text: 'Double-tap  A / D  to dash forward!', color: '#ffffaa', timer: 320 },
      { frame: 520, speaker: 'GUIDE', text: 'Press  Q  for your ability.  E  for your super.', color: '#ffffaa', timer: 360, requires: ['ability', 'super'] },
      { frame: 700, text: 'Something clicked. Keep going.', color: '#88ddff', timer: 200 },
    ],
    preText: 'A normal afternoon in your backyard. Some stranger jumped your fence. They look twitchy.',
    opponentName: 'Panicked Bystander', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'easy', opponentColor: '#888888',
    playerLives: 1,
    arena: 'homeYard',
    tokenReward: 10, blueprintDrop: null,
    postText: 'That... worked? You\'re not sure what just happened. But you\'re still standing.',
  },

  {
    id: 1, title: 'The Sky Broke',
    world: '🌆 Home City',
    narrative: [
      'The first portal opened at 2:17 PM.',
      'Then another.',
      'Then twelve more.',
      'They tore through the air like something had punctured reality.',
      '',
      'And through them stepped fighters.',
      'They didn\'t look scared.',
      'They looked like they\'d been here before.',
    ],
    fightScript: [
      { frame: 80,  text: '"Where did you come from?" Wrong question. Why are they HERE?', color: '#aaccff', timer: 230 },
      { frame: 260, text: '"Easy pickings," they said. Prove them wrong.', color: '#ff9966', timer: 220 },
    ],
    preText: 'A portal fighter drops into the park. Locks eyes with you. Decides you\'re the target.',
    opponentName: 'Portal Scout', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'medium', opponentColor: '#cc4444',
    playerLives: 1,
    arena: 'rural',
    tokenReward: 15, blueprintDrop: null,
    postText: 'You beat them. You have no idea how. But you did.',
  },

  {
    id: 2, title: 'Running',
    world: '🌆 Home City',
    narrative: [
      'You tried to run.',
      'Three blocks later, another portal opened ahead of you.',
      'You turned around.',
      'Portal behind you too.',
      '',
      'There was nowhere to go.',
      'So you stopped running.',
    ],
    fightScript: [
      { frame: 60,  text: '🆕 UNLOCKED: Double Jump — press W again while airborne!', color: '#44ffaa', timer: 360, requires: 'doubleJump' },
      { frame: 90,  text: 'They\'re faster. You\'re smarter. Use it.', color: '#aaccff', timer: 220 },
      { frame: 300, text: '"Two in a row. Brave or stupid?" Both. Probably.', color: '#ff9966', timer: 220 },
    ],
    preText: 'Trapped in a suburban street between portals. No escape. Win or stay trapped.',
    opponentName: 'Street Brawler', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'medium', opponentColor: '#bb6622',
    playerLives: 1,
    arena: 'suburb',
    tokenReward: 18, blueprintDrop: null,
    postText: 'The portals don\'t close. But there\'s a gap. You move.',
  },

  {
    id: 3, title: 'Block by Block',
    world: '🌆 Home City',
    narrative: [
      'The city changed overnight.',
      'Traffic lights obeyed no one.',
      'Police couldn\'t contain it.',
      'Buildings collapsed.',
      'Fires nobody put out.',
      '',
      'People ran — those who could.',
      'Everyone else fought.',
    ],
    fightScript: [
      { frame: 100, text: 'This one is different. They\'ve done this before.', color: '#aaccff', timer: 220 },
      { frame: 300, text: 'You\'re getting hit more. Adapt. Shield early.', color: '#ffaa55', timer: 230 },
    ],
    preText: 'A portal fighter, experienced. This is their job. They\'ve cleared entire city blocks.',
    opponentName: 'Street Ravager', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', opponentColor: '#bb5500',
    playerLives: 1,
    arena: 'homeAlley',
    tokenReward: 20, blueprintDrop: 'last_stand2',
    postText: 'You found something useful in the rubble. Hold onto it.',
  },

  {
    id: 4, title: 'Every Man for Himself',
    world: '🌆 Home City',
    narrative: [
      'There was no help coming.',
      'No rescue. No authority.',
      'The experienced fighters from the portals',
      'were tearing through entire blocks.',
      '',
      'Your neighbors. Your coworkers.',
      'People were dying.',
      '',
      'Every man for himself.',
    ],
    fightScript: [
      { frame: 60,  speaker: 'GUIDE', text: '🆕 UNLOCKED: Ability — press  Q  to use your weapon\'s special attack!', color: '#44ffaa', timer: 380, requires: 'ability' },
      { frame: 80,  text: 'You\'re angry now. Good. Use it.', color: '#ff6644', timer: 220 },
      { frame: 260, text: '"Another one? How many of you ARE there?"', color: '#ff9966', timer: 220 },
      { frame: 460, text: 'Keep hitting. Don\'t let up.', color: '#ffaa55', timer: 200 },
    ],
    preText: 'Cornered in the ruins of what was your block. Nowhere to run. Fight your way through.',
    opponentName: 'Ruthless Raider', weaponKey: 'hammer', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#884400',
    playerLives: 1,
    arena: 'suburb',
    tokenReward: 25, blueprintDrop: null,
    postText: 'You\'re still alive. That means something. Keep moving.',
  },

  {
    id: 5, title: 'Last One Standing',
    world: '🌆 Home City',
    narrative: [
      'The block was almost empty now.',
      'Most people had fled or fallen.',
      'One fighter remained.',
      'The biggest one you\'d seen.',
      'They looked at the bodies around them.',
      'Then at you.',
      '"Still here?"',
      'There was something almost like respect in their voice.',
    ],
    storeNag: '⚠️ Harder than anything before. Consider spending tokens in the Ability Store.',
    fightScript: [
      { frame: 60,  speaker: 'GUIDE', text: '🆕 UNLOCKED: Super — press  E  to unleash your super move! Charges by dealing damage.', color: '#44ffaa', timer: 400, requires: 'super' },
      { frame: 260, text: 'They hit like a truck. Wait for openings. Shield.', color: '#ffaa55', timer: 260 },
      { frame: 460, text: 'Use your super — you earned it.', color: '#aaccff', timer: 220, requires: 'super' },
    ],
    preText: 'The last big fighter from this block. Bigger. Stronger. One chance.',
    opponentName: 'Block Captain', weaponKey: 'hammer', classKey: 'tank', aiDiff: 'expert', opponentColor: '#664422',
    armor: ['helmet'],
    playerLives: 1,
    arena: 'homeAlley',
    tokenReward: 35, blueprintDrop: null,
    postText: 'You needed everything you had for that one. This is only going to get harder.',
  },

  // ═══════════════ ACT II — ADAPTING ═══════════════

  {
    id: 6, title: 'The Outskirts',
    world: '🏘️ Suburbs',
    narrative: [
      'You got out of the city center.',
      'The suburbs looked quieter.',
      '',
      'They weren\'t.',
      '',
      'The fighters had spread here too.',
      'Quieter meant: fewer witnesses.',
    ],
    fightScript: [
      { frame: 60,  text: '🆕 UNLOCKED: Super Charge — your super (E) now charges faster when you take hits!', color: '#44ffaa', timer: 380 },
      { frame: 90,  text: '"No cameras out here. No one coming to help you."', color: '#ff9966', timer: 240 },
      { frame: 300, text: 'Faster than city brawlers. Spear range is dangerous — stay mobile.', color: '#ffffaa', timer: 260 },
    ],
    preText: 'A residential street. A fighter who thought they had easy pickings.',
    opponentName: 'Suburb Predator', weaponKey: 'spear', classKey: 'ninja', aiDiff: 'medium', opponentColor: '#446688',
    armor: ['helmet'],
    playerLives: 3,
    arena: 'suburb',
    tokenReward: 30, blueprintDrop: 'time_stop2',
    postText: 'You\'re getting better at this. You hate that you\'re getting better at this.',
  },

  {
    id: 7, title: 'Two at Once',
    world: '🏘️ Suburbs',
    narrative: [
      'You came around a corner.',
      'Two of them.',
      'They saw you at the same time.',
      '',
      'You had a fraction of a second to decide.',
      '',
      'Hit first.',
    ],
    fightScript: [
      { frame: 60,  text: 'Two fighters, one arena. Pick the aggressive one first.', color: '#ffffaa', timer: 280 },
      { frame: 300, text: 'Don\'t let them get behind you. Keep moving.', color: '#ffaa55', timer: 230 },
      { frame: 480, text: 'Almost. Keep the pressure on.', color: '#aaccff', timer: 210 },
    ],
    preText: 'Two fighters. Same side. Handle both.',
    opponentName: 'Suburb Duo', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'medium', opponentColor: '#669933',
    twoEnemies: true,
    secondEnemy: { weaponKey: 'sword', classKey: 'warrior', aiDiff: 'medium', color: '#aa6600' },
    armor: ['chestplate'],
    playerLives: 3,
    arena: 'suburb',
    tokenReward: 35, blueprintDrop: null,
    postText: 'That should not have worked. But it did. File that away.',
  },

  {
    id: 8, title: 'Open Fields',
    world: '🌾 Rural',
    narrative: [
      'You went further.',
      'Past the suburbs. Into the countryside.',
      'Open fields. Farms.',
      '',
      'You thought distance meant safety.',
      '',
      'A portal opened three feet in front of you.',
      'So much for that theory.',
    ],
    fightScript: [
      { frame: 80,  text: 'No walls. Open ground. Change your approach.', color: '#ffffaa', timer: 260 },
      { frame: 300, text: 'This one\'s fast. Don\'t let them circle you.', color: '#ff9966', timer: 220 },
    ],
    preText: 'Rural fields. Open space. A portal fighter who moves like they\'ve been doing this for years.',
    opponentName: 'Field Stalker', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'medium', opponentColor: '#779933',
    armor: ['helmet', 'chestplate'],
    playerLives: 3,
    arena: 'rural',
    tokenReward: 35, blueprintDrop: null,
    postText: 'There is no safe distance. The portals go everywhere.',
  },

  {
    id: 9, title: 'Hunted',
    world: '🌾 Rural',
    narrative: [
      'Three more fighters found you by the barn.',
      'They came one at a time.',
      'You handled each one.',
      'You were surprised by that.',
      '',
      'More surprised by the fact that after each fight,',
      'something in you felt... sharper.',
      'Like you were being forged.',
    ],
    storeNag: '⚠️ 2 lives. Things are escalating. Spend those tokens before the fight.',
    fightScript: [
      { frame: 60,  text: '🆕 UNLOCKED: Shield Counter — release S right as an attack lands to stagger the enemy!', color: '#44ffaa', timer: 400 },
      { frame: 80,  text: 'They tracked you down. They planned this.', color: '#ff7744', timer: 230 },
      { frame: 280, text: '"You\'ve been getting better too fast." That\'s not a good sign.', color: '#ff9966', timer: 250 },
      { frame: 500, text: 'Two lives. Don\'t waste the second one.', color: '#ffaa55', timer: 220 },
    ],
    preText: 'Near the barn. They\'ve been tracking you. They know your patterns now.',
    opponentName: 'Relentless Hunter', weaponKey: 'gun', classKey: 'gunner', aiDiff: 'hard', opponentColor: '#558844',
    armor: ['helmet', 'chestplate'],
    playerLives: 2,
    arena: 'rural',
    tokenReward: 45, blueprintDrop: 'rage_mode2',
    postText: 'You\'re not running anymore. You\'re surviving. There\'s a difference.',
  },

  {
    id: 10, title: 'Cornered',
    world: '🌾 Rural',
    narrative: [
      'A coordinated unit.',
      'Three fighters from three different portals.',
      'They had a plan.',
      '"Cut off the exits first. Then close in."',
      '',
      'They miscalculated something.',
      '',
      'You.',
    ],
    storeNag: '⚠️ Single life. No second chances. This is why the Ability Store exists.',
    fightScript: [
      { frame: 60,  text: 'Coordinated. They\'ve done this dozens of times.', color: '#ff7744', timer: 270 },
      { frame: 320, text: '"This is the one? Doesn\'t look like much."', color: '#ff9966', timer: 230 },
      { frame: 520, text: '1 life. Make every hit count.', color: '#ff4444', timer: 280 },
    ],
    preText: 'A trained squad. Their best fighter steps forward. Single life — no respawns.',
    opponentName: 'Squad Elite', weaponKey: 'spear', classKey: 'ninja', aiDiff: 'hard', opponentColor: '#884455',
    twoEnemies: true,
    secondEnemy: { weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', color: '#553366' },
    armor: ['helmet', 'leggings'],
    playerLives: 1,
    arena: 'rural',
    tokenReward: 55, blueprintDrop: null,
    postText: 'The squad retreats. Word will travel. You\'re on a list now.',
  },

  // ═══════════════ ACT III — THE DECISION ═══════════════

  {
    id: 11, title: 'The Portal\'s Gate',
    world: '🌀 Portal Threshold',
    narrative: [
      'You found it.',
      'The original portal.',
      'Larger than the others.',
      'Older.',
      'The edges had a different color.',
      '',
      'The fighters coming through looked different too.',
      'More purposeful. More organized.',
      '',
      'Someone was sending them.',
    ],
    fightScript: [
      { frame: 80,  text: '"You followed the trail all the way here. Impressive." They don\'t step aside.', color: '#cc88ff', timer: 270 },
      { frame: 300, text: 'This portal fighter is in a different class. You can feel it.', color: '#aaccff', timer: 240 },
    ],
    preText: 'The first guardian of the original portal.',
    opponentName: 'Portal Warden', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#7733aa',
    playerLives: 3,
    arena: 'portalEdge',
    tokenReward: 45, blueprintDrop: null,
    postText: 'One guardian down. More will come. The portal is right there. You don\'t care.',
  },

  {
    id: 12, title: 'The Gatekeeper',
    world: '🌀 Portal Threshold',
    narrative: [
      'A second guardian stepped forward.',
      'Bigger. Slower.',
      'But with the weight of someone who had never lost.',
      '"No one passes," they said.',
      '"No one from your world has ever passed."',
      '',
      'You stepped forward.',
    ],
    storeNag: '⚠️ The Gatekeeper has never been beaten. 1 life. Use your tokens first.',
    fightScript: [
      { frame: 60,  text: 'Slow but devastating. Do NOT get cornered.', color: '#ffffaa', timer: 280 },
      { frame: 280, text: '"No one from your world has ever gone through." You\'re changing that.', color: '#cc88ff', timer: 260 },
      { frame: 520, text: 'One life. One shot. This is it.', color: '#ff4444', timer: 300 },
    ],
    preText: 'The Gatekeeper. No one has ever passed them. Single life.',
    opponentName: 'The Gatekeeper', weaponKey: 'hammer', classKey: 'tank', aiDiff: 'hard', opponentColor: '#552299',
    armor: ['helmet', 'chestplate', 'leggings'],
    playerLives: 1,
    arena: 'portalEdge',
    tokenReward: 60, blueprintDrop: null,
    postText: 'The path is clear. The portal hums. You step forward.',
  },

  // ═══════════════ ACT IV — THE NEW REALM ═══════════════

  {
    id: 13, title: 'The Other Side',
    world: '✨ New Realm',
    narrative: [
      'The world dissolved.',
      'Then reformed.',
      'Different sky. Different gravity.',
      'Different everything.',
      '',
      'And immediately — three fighters looking right at you.',
      'Word had traveled.',
      '"That\'s the one from the other side."',
    ],
    fightScript: [
      { frame: 60,  text: '🆕 UNLOCKED: Ability Combo — use Q mid-attack to extend your combo!', color: '#44ffaa', timer: 380 },
      { frame: 80,  text: 'Different gravity here. Trust your instincts.', color: '#ffffaa', timer: 270 },
      { frame: 280, text: '"From the other world? That\'s rare." It\'s not a welcome.', color: '#88ccff', timer: 240 },
    ],
    preText: 'You\'ve just arrived. They already know you\'re here.',
    opponentName: 'Realm Sentry', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'medium', opponentColor: '#2288aa',
    playerLives: 3,
    arena: 'realmEntry',
    tokenReward: 50, blueprintDrop: null,
    postText: 'First fight in the new world. Still standing. That surprises everyone, including you.',
  },

  {
    id: 14, title: 'Laws of This World',
    world: '✨ New Realm',
    narrative: [
      'The gravity felt different.',
      'Everything moved differently.',
      'The fighters here had adapted over years.',
      '',
      'You had twenty minutes.',
      '',
      'Close enough.',
    ],
    fightScript: [
      { frame: 80,  text: 'They use the gravity here as a weapon. You don\'t know how yet.', color: '#88ccff', timer: 260 },
      { frame: 320, text: '"You\'re adapting faster than you should be."', color: '#cc88ff', timer: 240 },
    ],
    preText: 'A realm veteran who knows every angle of this arena. They fight the environment as much as you.',
    opponentName: 'Realm Veteran', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#226688',
    playerLives: 3,
    arena: 'realmEntry',
    tokenReward: 60, blueprintDrop: null,
    postText: 'They weren\'t expecting that. Neither were you.',
  },

  {
    id: 15, title: 'Ruins and Power',
    world: '✨ New Realm',
    narrative: [
      'The ancient ruins held something older than the portals.',
      'A knowledge. A power.',
      'A guardian had watched over it for centuries.',
      '"No one from your world has made it this far," the guardian said.',
      '"Let\'s find out why."',
    ],
    storeNag: '⚠️ Ancient guardian. 2 lives. This is where many stories end. Make sure yours doesn\'t.',
    fightScript: [
      { frame: 90,  text: '"You don\'t belong here." You keep hearing that.', color: '#cc88ff', timer: 240 },
      { frame: 310, text: 'Their technique is perfect. Find the imperfection.', color: '#aaccff', timer: 240 },
      { frame: 520, text: 'The ruins are responding to the fight. That\'s... not normal.', color: '#88aaff', timer: 250 },
    ],
    preText: 'The ancient guardian. Centuries of experience compressed into one body. 2 lives.',
    opponentName: 'Ruins Guardian', weaponKey: 'voidblade', classKey: 'warrior', aiDiff: 'hard', opponentColor: '#887722',
    armor: ['helmet', 'chestplate'],
    playerLives: 2,
    arena: 'ruins',
    tokenReward: 70, blueprintDrop: 'reflect2',
    postText: 'The ruins\' energy flows through you. Something fundamental has shifted.',
  },

  {
    id: 16, title: 'The Prodigy',
    world: '✨ New Realm',
    narrative: [
      'Word had spread about you.',
      'A prodigy — barely older than you — wanted to test something.',
      '"Every generation has one person who arrived and changed things."',
      '"Last time it was me."',
      '"I want to see if it\'s you."',
    ],
    fightScript: [
      { frame: 80,  text: 'Fastest fighter in the realm. Don\'t chase — react.', color: '#ff88ff', timer: 280 },
      { frame: 300, text: '"Good. You\'re not dead yet. Most are by now."', color: '#cc88ff', timer: 240 },
      { frame: 510, text: 'They\'re changing tactics. They\'re being serious now.', color: '#aaccff', timer: 240 },
    ],
    preText: 'The Prodigy. Fastest you\'ve ever seen. 2 lives. No mistakes allowed.',
    opponentName: 'The Prodigy', weaponKey: 'sword', classKey: 'ninja', aiDiff: 'hard', opponentColor: '#cc44cc',
    playerLives: 2,
    arena: 'realmEntry',
    tokenReward: 80, blueprintDrop: null,
    postText: 'They nod. That\'s the closest thing to an endorsement you\'re going to get.',
  },

  {
    id: 17, title: 'No Mercy',
    world: '✨ New Realm',
    narrative: [
      'Not everyone welcomed the prodigy\'s assessment.',
      '"The last outsider who came through caused chaos."',
      '"They should have been stopped at the gate."',
      '"I\'m correcting that mistake."',
    ],
    storeNag: '⚠️ 2 lives. This enforcer is angrier and more precise than what came before.',
    fightScript: [
      { frame: 70,  text: '"I don\'t care what the Prodigy thinks. You shouldn\'t be here."', color: '#ff6644', timer: 260 },
      { frame: 310, text: 'Pure aggression. Shield early. Look for the rhythm.', color: '#ffaa55', timer: 250 },
      { frame: 540, text: 'They\'re not stopping. Neither are you.', color: '#aaccff', timer: 220 },
    ],
    preText: 'An enforcer. Their job is to close the loopholes. You\'re a loophole.',
    opponentName: 'The Enforcer', weaponKey: 'shockrifle', classKey: 'berserker', aiDiff: 'hard', opponentColor: '#aa3322',
    armor: ['helmet', 'chestplate'],
    playerLives: 2,
    arena: 'ruins',
    tokenReward: 85, blueprintDrop: null,
    postText: 'They tried to make it clean. You made it messy. Messy works.',
  },

  {
    id: 18, title: 'The Realm\'s Champion',
    world: '✨ New Realm',
    narrative: [
      'There was one name everyone spoke.',
      'The Champion.',
      'Undefeated since the portals opened.',
      '"They want to see you," your contact said.',
      '"They want to test something."',
      '',
      'The Champion stepped forward alone.',
      'No weapon. No entourage.',
      '"Show me what you are."',
    ],
    storeNag: '⚠️ Undefeated Champion. 2 lives. Spend everything you have before this fight.',
    fightScript: [
      { frame: 80,  text: 'Undefeated. Every movement is deliberate. Watch for the pattern.', color: '#ff88ff', timer: 290 },
      { frame: 320, text: '"Good. Now I\'m actually trying." That\'s bad news.', color: '#cc88ff', timer: 250 },
      { frame: 580, text: '"I haven\'t fought someone like this in years."', color: '#ffaaff', timer: 250 },
      { frame: 740, text: 'You\'re the first person to make them work this hard. Keep it up.', color: '#aaccff', timer: 260 },
    ],
    preText: 'The Champion. No weaknesses on file. 2 lives.',
    opponentName: 'The Champion', weaponKey: 'voidblade', classKey: 'ninja', aiDiff: 'expert', opponentColor: '#cc44cc',
    armor: ['helmet', 'chestplate', 'leggings'],
    playerLives: 2,
    arena: 'colosseum',
    tokenReward: 100, blueprintDrop: null,
    postText: 'The crowd is silent. The Champion nods. You\'ve just become part of the realm\'s history.',
  },

  {
    id: 19, title: 'Voice of the Ruler',
    world: '✨ New Realm — Inner Sanctum',
    narrative: [
      'The Champion gave you a name.',
      'A location.',
      'And a warning.',
      '"The Ruler knows you\'re coming."',
      '"They\'ve sent their best — not to stop you."',
      '"To exhaust you first."',
    ],
    storeNag: '⚠️ Expert-level herald. 1 life. The boss fight is next. Spend every token you have.',
    fightScript: [
      { frame: 70,  text: '"The Ruler sends their regards." They don\'t look friendly.', color: '#ff6644', timer: 250 },
      { frame: 320, text: 'Expert-level. Sent specifically to drain you before the boss.', color: '#ffaa55', timer: 270 },
      { frame: 560, text: '"You won\'t have anything left for what\'s coming." Prove them wrong.', color: '#cc88ff', timer: 260 },
    ],
    preText: 'The Ruler\'s herald. Expert-level fighter. Single life.',
    opponentName: 'Ruler\'s Herald', weaponKey: 'shockrifle', classKey: 'ninja', aiDiff: 'expert', opponentColor: '#550099',
    armor: ['helmet', 'chestplate', 'leggings'],
    playerLives: 1,
    arena: 'bossSanctum',
    tokenReward: 110, blueprintDrop: null,
    postText: 'The herald falls. Through the next door, you can feel what\'s waiting.',
  },

  {
    id: 20, title: 'The One Who Opened the Portals',
    world: '✨ New Realm — Sanctum',
    narrative: [
      'The Champion told you the truth.',
      'There was a ruler.',
      'Someone who had opened the portals deliberately.',
      'Who had sent fighters to destroy your world.',
      'Who had watched cities burn like entertainment.',
      '',
      'You had their location.',
      'You had the power.',
      'You had every reason.',
    ],
    storeNag: '⚠️ BOSS FIGHT. Everything you\'ve bought leads to this. 1 life. No retry.',
    isBossFight: true,
    arena: 'bossSanctum',
    playerLives: 1,
    tokenReward: 150, blueprintDrop: 'world_break2',
    postText: 'Done. The portals destabilize. They answer to no one now. Except maybe you.',
  },

  // ═══════════════ ACT V — HOME WORLD LEGENDS ═══════════════

  {
    id: 21, title: 'Earn the Right',
    world: '✨ New Realm',
    narrative: [
      'With the ruler gone, an elder found you.',
      '"The knowledge of traversal," they said,',
      '"is not given. It is taken — from those who already carry it."',
      'They stepped into a fighting stance.',
      '"Prove you deserve to walk between worlds."',
    ],
    fightScript: [
      { frame: 80,  text: 'Elder of the realm. Knows every counter before you throw it.', color: '#88aaff', timer: 270 },
      { frame: 360, text: '"You fight with anger. The best fight with intention."', color: '#aaccff', timer: 250 },
    ],
    preText: 'The realm elder. Calm. Methodical. The hardest kind of opponent. 2 lives.',
    opponentName: 'Realm Elder', weaponKey: 'hammer', classKey: 'tank', aiDiff: 'hard', opponentColor: '#4488cc',
    playerLives: 2,
    arena: 'realmEntry',
    tokenReward: 100, blueprintDrop: null,
    postText: 'The knowledge passes to you. You can go home. And come back. Whenever you want.',
  },

  {
    id: 22, title: 'Home World: The Recluse',
    world: '🏡 Home World',
    narrative: [
      'You returned to a changed world.',
      'The portals were fewer now. Quieter.',
      '',
      'But in the silence, you found something unexpected:',
      'Fighters who had never left.',
      'Never ran. Never hid.',
      'Who had trained through the chaos',
      'and come out the other side as something harder.',
    ],
    storeNag: '⚠️ Home World legends are at a different level entirely. 2 lives. Prepare accordingly.',
    fightScript: [
      { frame: 80,  text: '"You went through the portal. I stayed here." Neither choice was easy.', color: '#ffaa88', timer: 280 },
      { frame: 370, text: 'They trained through the apocalypse. That forges something different.', color: '#aaccff', timer: 260 },
      { frame: 640, text: 'Everything you\'ve learned. Use it. All of it. Now.', color: '#ffffff', timer: 260 },
    ],
    preText: 'A reclusive fighter who stayed and trained while everyone else fled. 2 lives.',
    opponentName: 'The Recluse', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'expert', opponentColor: '#ffaa00',
    playerLives: 2,
    arena: 'grass',
    tokenReward: 130, blueprintDrop: 'berserker_blood2',
    postText: 'They fought like the world still depended on it. For them, it did.',
  },

  {
    id: 23, title: 'Home World: The Ghost',
    world: '🏡 Home World',
    narrative: [
      'No one knew his name.',
      'During the invasion, he had been everywhere.',
      'Dozens of portal fighters stopped cold.',
      'No one ever saw him do it.',
      '',
      'He sought you out now.',
      '"I heard someone went through the portal," he said.',
      '"I wanted to see what came back."',
    ],
    storeNag: '⚠️ The Ghost. Expert. 1 life. He doesn\'t give second chances. Neither does this fight.',
    fightScript: [
      { frame: 80,  text: 'He\'s reading every move before you make it. Change your pattern.', color: '#ccccff', timer: 280 },
      { frame: 330, text: '"You\'ve been through the portal. It changed you." He sounds almost envious.', color: '#aaccff', timer: 270 },
      { frame: 580, text: 'You can\'t outlast him. You can\'t outthink him. Just outfight him.', color: '#ffffff', timer: 260 },
    ],
    preText: 'The Ghost. He fought the entire invasion alone. Nobody knew. 1 life.',
    opponentName: 'The Ghost', weaponKey: 'spear', classKey: 'ninja', aiDiff: 'expert', opponentColor: '#ccccff',
    playerLives: 1,
    arena: 'city',
    tokenReward: 160, blueprintDrop: 'ghost_step2',
    postText: 'He vanishes the instant the fight ends. You never see him again.',
  },

  {
    id: 24, title: 'Home World: The Last Warrior',
    world: '🏡 Home World',
    narrative: [
      'One fighter stood above all others.',
      'Not because they were the strongest.',
      'Because they had made a choice:',
      'To be complete.',
      '',
      'Meeting them felt like standing in front of a mirror',
      'that showed you everything you still had to become.',
      '',
      'This is the final fight.',
    ],
    storeNag: '⚠️ The Last Warrior. Expert. 1 life. The hardest fight in the story. Spend every token you have.',
    fightScript: [
      { frame: 80,  text: 'Perfect. They are simply perfect.', color: '#ffffff', timer: 300 },
      { frame: 320, text: '"You\'ve come far." It\'s not flattery. It\'s assessment.', color: '#aaccff', timer: 260 },
      { frame: 580, text: 'Nothing held back. This is everything you have.', color: '#ff8844', timer: 250 },
      { frame: 800, text: '"There\'s nothing more I can teach you." They mean it.', color: '#ffffff', timer: 300 },
    ],
    preText: 'The Last Warrior. The pinnacle. No shortcuts. No mercy. 1 life.',
    opponentName: 'The Last Warrior', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'expert', opponentColor: '#ffffff',
    playerLives: 1,
    arena: 'grass',
    tokenReward: 220, blueprintDrop: null,
    postText: '"There\'s nothing more I can teach you," they say. "There\'s nothing left to give."',
  },

  // ═══════════════ EPILOGUE ═══════════════

  {
    id: 25, title: 'Between Worlds',
    world: '🏆 Epilogue',
    isEpilogue: true,
    narrative: [
      'You can walk between worlds now.',
      'Both realms know who you are.',
      '',
      'The city is rebuilding.',
      'Slowly.',
      'The portals still open sometimes.',
      'Fighters still step through.',
      '',
      'But now they\'ve heard the story.',
      'And they know what\'s already here.',
      '',
      'You.',
    ],
    preText: null, noFight: true,
    tokenReward: 250,
    postText: 'STORY COMPLETE. You have earned the right to fight across worlds. Story Online is now unlocked.',
  },
];

// ── Ability definitions for the store ────────────────────────────────────────
const STORY_ABILITIES2 = {
  last_stand2: {
    name: 'Last Stand',
    desc: 'When HP < 15%, gain +60% speed and double damage for 8 seconds.',
    icon: '🔥', tokenCost: 80, requiresBlueprint: true,
  },
  time_stop2: {
    name: 'Time Stop',
    desc: 'Super (E) briefly stuns all enemies for 3 seconds. 45s cooldown.',
    icon: '⏱️', tokenCost: 120, requiresBlueprint: true,
  },
  rage_mode2: {
    name: 'Rage Mode',
    desc: 'Taking damage charges a rage meter. At full, next 5 attacks deal 3× damage.',
    icon: '💢', tokenCost: 100, requiresBlueprint: true,
  },
  reflect2: {
    name: 'Reflect Shield',
    desc: 'While shielding, reflect 20% of incoming damage back at the attacker.',
    icon: '🛡️', tokenCost: 90, requiresBlueprint: true,
  },
  world_break2: {
    name: 'World Break',
    desc: 'Once per match, super deals 60% of enemy max HP instantly.',
    icon: '🌍', tokenCost: 350, requiresBlueprint: true,
  },
  shield_bash2: {
    name: 'Shield Bash',
    desc: 'Press ability (Q) while shielding to slam forward: 15 dmg + stun. 3s cooldown.',
    icon: '🛡', tokenCost: 60, requiresBlueprint: false,
  },
  medkit2: {
    name: 'Medkit',
    desc: 'Once per match, press Q to heal 30% of max HP instantly.',
    icon: '💊', tokenCost: 50, requiresBlueprint: false,
  },
  ghost_step2: {
    name: 'Ghost Step',
    desc: 'When you dash, gain 0.5s of invincibility frames. 8s cooldown.',
    icon: '👻', tokenCost: 110, requiresBlueprint: false,
  },
  berserker_blood2: {
    name: 'Berserker\'s Blood',
    desc: 'Each kill raises your damage by 5% for the match (max 5 stacks).',
    icon: '🩸', tokenCost: 130, requiresBlueprint: false,
  },
};

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
  { text: 'The portals were not an accident.', delay: 0 },
  { text: 'Someone opened them.', delay: 900 },
  { text: 'Your world was the target.', delay: 1800 },
  { text: '', delay: 2600 },
  { text: 'You didn\'t choose this.', delay: 3200 },
  { text: '', delay: 3900 },
  { text: 'But you\'re still here.', delay: 4500 },
  { text: '...', delay: 5400 },
  { text: 'So is the fight.', delay: 6100 },
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
  _showStory2Narrative(allLines, () => _launchChapter2Fight(ch));
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
    btn.textContent = idx < lines.length ? 'Next →' : '⚔️ Fight!';
    btn.onclick = showLine;
  }

  if (chEl)    chEl.textContent   = _activeStory2Chapter ? _worldIcon(_activeStory2Chapter.world) : '';
  if (titleEl) titleEl.textContent = _activeStory2Chapter ? _activeStory2Chapter.title : '';
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

  // Boss fight: show cinematic intro before launching (async — delays startGame)
  if (ch.isBossFight) {
    if (typeof triggerEvent === 'function') triggerEvent('BOSS_INTRO', { ch }, true);
    // Delay the actual fight launch until the cinematic finishes (~8s)
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
  if (ch.isBossFight) {
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

  // Set P2 weapon/class to chapter opponent
  if (!ch.isBossFight && ch.weaponKey) {
    const p2w = document.getElementById('p2Weapon');
    if (p2w) p2w.value = ch.weaponKey;
  }
  if (!ch.isBossFight && ch.classKey) {
    const p2c = document.getElementById('p2Class');
    if (p2c) p2c.value = ch.classKey;
  }
  if (!ch.isBossFight && ch.aiDiff) {
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
    weapon:        _caps.weapon        !== undefined ? _caps.weapon        : (id < 4 ? 'sword' : null),
    noDoubleJump:  _caps.noDoubleJump  !== undefined ? _caps.noDoubleJump  : !(id >= 2  || !!_sa.doubleJump),
    noAbility:     _caps.noAbility     !== undefined ? _caps.noAbility     : !(id >= 4  || !!_sa.weaponAbility),
    noSuper:       _caps.noSuper       !== undefined ? _caps.noSuper       : !(id >= 5  || !!_sa.superMeter),
    noClass:       _caps.noClass       !== undefined ? _caps.noClass       : (id < 18),
    noDodge:       !(id >= 9 || !!_sa.dodge || storyDodgeUnlocked),
  };

  // Armor and multi-enemy setup
  storyEnemyArmor     = ch.armor || [];
  storyTwoEnemies     = !!ch.twoEnemies;
  storySecondEnemyDef = ch.secondEnemy || null;

  // Mark story2 fight active
  storyModeActive = true;

  // Boss chapter: register director sequences that fire during the fight
  if (ch.isBossFight && typeof directorOnce === 'function') {
    // Use setTimeout so players[] is populated after startGame initializes
    setTimeout(() => {
      const _boss = players && players.find(p => p.isBoss);
      if (!_boss) return;

      directorOnce('boss_first_blood',
        () => gameRunning && _boss.health < _boss.maxHealth - 180,
        () => {
          if (typeof showBossDialogue === 'function') showBossDialogue('"Interesting."', 120);
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
          if (typeof showBossDialogue === 'function') showBossDialogue('"...Now I am serious."', 160);
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
          if (typeof showBossDialogue === 'function') showBossDialogue('"...I did not design for this."', 210);
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
  if (!playerWon) {
    // Show shop recommendation on the game-over overlay when the player loses
    _showStory2LoseNag(ch);
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
  storyState.abilities.doubleJump    = id >= 2;
  storyState.abilities.weaponAbility = id >= 4;
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
          desc: 'Pure instinct.\nDouble-tap ← or → to roll through attacks.',
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
    { text: 'This world was built by something.',                 delay: 0,    color: '#dde4ff' },
    { text: 'Every arena. Every fighter. Every rule.',            delay: 1000, color: '#aaccff' },
    { text: '"I gave you the sword."',                            delay: 2100, color: '#ff8866', italic: true },
    { text: '"And now I will take everything back."',             delay: 3200, color: '#ff6644', italic: true },
    { text: '...',                                                delay: 4400, color: '#445566' },
    { text: 'Face the Creator.',                                  delay: 5100, color: '#ffaaff' },
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

  // ── REALITY_BREAK: chapters 7+ trigger ambient world distortion ──────────
  if (chId >= 7 && !storyEventFired['REALITY_BREAK']) {
    triggerEvent('REALITY_BREAK', { chapterId: chId });
  }

  // ── FIRST_KILL: track whether an enemy just died to p1 ───────────────────
  // (This is called separately by checkDeaths() via storyOnEnemyDeath)
  // Handled in storyOnEnemyDeath below.

  // ── ABILITY_UNLOCK: chapter 4, once the player successfully uses Q ────────
  if (chId >= 4 && !storyEventFired['ABILITY_UNLOCK'] && !storyState.abilities.weaponAbility) {
    if (p1.abilityCooldown > 0) {  // ability was just used (cooldown just started)
      triggerEvent('ABILITY_UNLOCK', { player: p1 });
    }
  }

  // ── SUPER_UNLOCK: chapter 5, when super meter first fires ────────────────
  if (chId >= 5 && !storyEventFired['SUPER_UNLOCK'] && !storyState.abilities.superMeter) {
    if (p1.superMeter >= (p1.maxSuperMeter || 100)) {
      triggerEvent('SUPER_UNLOCK', { player: p1 });
    }
  }

  // ── Tick storyFreezeTimer ─────────────────────────────────────────────────
  if (storyFreezeTimer > 0) storyFreezeTimer--;
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
  if (id < 7) {
    storyDistortLevel = 0;
  } else if (id < 13) {
    storyDistortLevel = (id - 7) / 6 * 0.55; // 0 → 0.55 across chapters 7-13
  } else {
    storyDistortLevel = 0.55 + (id - 13) / 10 * 0.45; // 0.55 → 1.0 chapters 13-23
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
  storyState.abilities.doubleJump    = id >= 2  || storyState.abilities.doubleJump;
  storyState.abilities.weaponAbility = id >= 4  || storyState.abilities.weaponAbility;
  storyState.abilities.superMeter    = id >= 5  || storyState.abilities.superMeter;
  storyState.abilities.dodge         = id >= 9  || storyDodgeUnlocked;
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

