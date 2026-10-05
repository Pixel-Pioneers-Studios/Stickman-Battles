// smb-story-config.js
// Pure story data: enemy configs, unlocks, fight scripts, skill tree, worlds, arcs, abilities.
// Depends on: smb-globals.js
// Must load: BEFORE smb-story-engine.js
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

  if (typeof _updateContinueStoryBtn === 'function') _updateContinueStoryBtn();
  if (typeof _refreshStoryLoadoutLabels === 'function') _refreshStoryLoadoutLabels();

  // The seam text — the bridge from the cold open into the player's own story.
  // It used to run on first launch, chained straight off Tuesday; the cold open
  // now ends on the home screen instead, so it plays here, the first time the
  // player chooses Story of their own accord. Its own "Just let me fight" exit
  // still leads out to a quick match.
  // Saves with progress from before difficulties existed keep the setup they
  // were playing on; only a fresh story gets asked.
  if (m && !_story2.difficulty && Array.isArray(_story2.defeated) && _story2.defeated.length > 0) {
    _story2.difficulty = 'normal';
    _saveStory2();
  }
  _updateStoryDifficultyBtn();

  if (m && !_story2.prologueSeen) {
    _story2.prologueSeen = true;
    if (typeof saveGame === 'function') saveGame();
    if (typeof _showPrologue === 'function') setTimeout(() => _showPrologue(_maybePickStoryDifficulty), 260);
    else _maybePickStoryDifficulty();
  } else {
    _maybePickStoryDifficulty();
  }
}

function _showStoryPrologue(modalEl) {
  const ov = document.createElement('div');
  ov.id = 'storyPrologueOverlay';
  ov.style.cssText = [
    'position:absolute;inset:0;z-index:999;background:#000;',
    'display:flex;flex-direction:column;align-items:center;justify-content:center;',
    'padding:48px 40px;box-sizing:border-box;',
  ].join('');

  const lines = [
    { text: 'Something is wrong with the world.',        delay: 0,    color: '#ffffff', size: '1.15rem', weight: '600' },
    { text: 'You can feel it at the edges of things.',   delay: 600,  color: '#dddddd', size: '0.92rem' },
    { text: '',                                          delay: 1000 },
    { text: 'No one else seems to notice.',              delay: 1200, color: '#cc88ff', size: '1rem' },
    { text: '',                                          delay: 1700 },
    { text: 'It starts with you.',                       delay: 1900, color: '#ffffff', size: '1.4rem', weight: '800' },
  ];

  const textContainer = document.createElement('div');
  textContainer.style.cssText = 'max-width:540px;width:100%;text-align:center;';

  lines.forEach(({ text, delay, color, size, weight }) => {
    const el = document.createElement('div');
    el.style.cssText = [
      `color:${color || '#cccccc'};`,
      `font-size:${size || '0.88rem'};`,
      `font-weight:${weight || '400'};`,
      'line-height:1.7;margin-bottom:2px;',
      'opacity:0;transition:opacity 0.6s ease;',
      'font-family:inherit;',
    ].join('');
    el.textContent = text;
    textContainer.appendChild(el);
    setTimeout(() => { el.style.opacity = '1'; }, delay + 300);
  });

  const btn = document.createElement('button');
  btn.textContent = 'Begin';
  btn.style.cssText = [
    'margin-top:40px;padding:12px 36px;',
    'background:rgba(204,68,255,0.15);border:1px solid rgba(204,68,255,0.5);',
    'color:#cc44ff;font-size:0.9rem;font-weight:600;letter-spacing:2px;',
    'border-radius:4px;cursor:pointer;opacity:0;transition:opacity 0.6s ease;',
  ].join('');
  setTimeout(() => { btn.style.opacity = '1'; }, 3000);
  btn.onclick = () => { ov.style.opacity = '0'; setTimeout(() => ov.remove(), 400); };
  ov.style.transition = 'opacity 0.4s ease';

  ov.appendChild(textContainer);
  ov.appendChild(btn);
  modalEl.appendChild(ov);
}

// Single entry point for launching a specific chapter from the menu.
// Every chapter button should call this — behavior is always chapter-driven.
function startStoryFromMenu(chapterId) {
  storyModeActive    = true;
  storyCurrentLevel  = Math.min(8, Math.floor(chapterId / 5) + 1);
  if (typeof _beginChapter2 === 'function') _beginChapter2(chapterId);
}

function closeStoryMenu() {
  const m = document.getElementById('storyModal');
  if (m) m.style.display = 'none';
}

// Story mode is never a trap: the player can leave at any point, including
// before chapter 0 is beaten.
function _updateStoryCloseBtn() {
  const btn = document.querySelector('#storyModal button[onclick="closeStoryMenu()"]');
  if (!btn) return;
  btn.style.opacity       = '1';
  btn.style.pointerEvents = 'auto';
  btn.title               = '';
  btn.textContent         = '✕ Close';
}

function storyNewGame() {
  const msg = 'Start a new story?\nProgress will be reset and you will pick a difficulty again. (Boss/Cosmic Axiom unlocks are kept.)';
  if (!confirm(msg)) return;
  _story2 = _defaultStory2Progress();
  // A real new game replays the cold open, so drop the out-of-save guard too.
  try { localStorage.removeItem('smb_tuesday_seen'); } catch (e) {}
  _saveStory2();
  if (typeof saveGame === 'function') saveGame();
  _renderChapterList();
  if (typeof _story2TokenDisplay === 'function') _story2TokenDisplay();
  if (typeof _updateStoryCloseBtn === 'function') _updateStoryCloseBtn();
  _updateStoryDifficultyBtn();
  _maybePickStoryDifficulty();
}

// ── Story difficulty ──────────────────────────────────────────────────────────
// Picked once, the first time the story menu opens on a fresh story. Read by
// _storyScaleEnemyUnit (enemy stats), _launchExplorationChapter (enemy count),
// the move-speed pass in smb-weapons-ext.js, and dealDamage (Evolution adaptation).
//   shift:   chapters added to the HP/prediction scaling index, so later-chapter enemies arrive
//            early. Damage ignores it: a shifted damage curve put late-game hits (~60 on
//            a 150hp player) on chapter 0, so one combo string was a death.
//   hpCap / dmgCap: multipliers on the per-unit HP and per-hit damage ceilings
//   hp / dmg / cd: final multipliers on enemy HP, damage, and attack cooldown
//   ai:      bot intelligence tier for every non-boss enemy (elites one tier up), so a
//            harder difficulty is never out-thought by an easier one at any chapter
//   mercyTo: chapters below this keep the onboarding mercy band
//   duelExtra: escorts that join every walk-level duel alongside its authored opponent
//   reward:  multiplier on chapter and side-portal token payouts
// Evolution is permanent for a save: the only way out is New Game, and no other
// difficulty can switch into it mid-story.
const STORY_DIFFICULTIES = {
  story: {
    name: 'Story', color: '#88ccff',
    tagline: 'Experience the story with little fighting.',
    lines: ['Enemies are much weaker and slower', 'Easy bot intelligence', 'Fewer enemies in explore levels'],
    shift: 0, hpCap: 1, dmgCap: 1, hp: 0.45, dmg: 0.35, cd: 1.45, speed: 1,
    predict: -1, dodge: -1, ai: 'easy', exploreCap: -2, mercyTo: 6, duelExtra: 0, reward: 1,
  },
  normal: {
    name: 'Normal', color: '#aaffbb',
    tagline: 'The fight as it was designed.',
    lines: ['Enemies grow stronger as the story goes on', 'Normal bot intelligence'],
    shift: 0, hpCap: 1, dmgCap: 1, hp: 1, dmg: 1, cd: 1, speed: 1,
    predict: 0, dodge: 0, ai: 'medium', exploreCap: 0, mercyTo: 6, duelExtra: 0, reward: 1,
  },
  challenge: {
    name: 'Challenge', color: '#ffcc66',
    tagline: 'Stronger enemies arrive earlier.',
    lines: ['Enemies are a dozen chapters ahead of you', 'Tougher enemies that hit a little harder', 'Hard bot intelligence', 'No beginner mercy', 'An extra enemy joins every duel', '+50% tokens'],
    shift: 12, hpCap: 1.25, dmgCap: 1, hp: 1, dmg: 1.05, cd: 0.92, speed: 1.06,
    predict: 0.04, dodge: 0.03, ai: 'hard', exploreCap: 1, mercyTo: 0, duelExtra: 1, reward: 1.5,
  },
  evolution: {
    name: 'Evolution', color: '#ff6644',
    tagline: 'Evolve or die. Permanent.',
    lines: ['Enemies are far ahead of you, faster and sharper', 'Expert bot intelligence', 'Enemies adapt to any move you repeat: vary your attacks',
            'No beginner mercy', 'Two extra enemies join every duel', 'Double tokens', 'Can never be changed without wiping story progress'],
    shift: 25, hpCap: 1.6, dmgCap: 1, hp: 1, dmg: 1.15, cd: 0.82, speed: 1.15,
    predict: 0.08, dodge: 0.06, ai: 'expert', exploreCap: 2, mercyTo: 0, duelExtra: 2, reward: 2,
  },
};
const STORY_DIFFICULTY_ORDER = ['story', 'normal', 'challenge', 'evolution'];

function _storyDifficulty() {
  const d = typeof _story2 !== 'undefined' && _story2 ? _story2.difficulty : null;
  return STORY_DIFFICULTIES[d] ? d : 'normal';
}
function _storyDiffCfg() { return STORY_DIFFICULTIES[_storyDifficulty()]; }
function _storyTokenReward(n) { return Math.round((n || 0) * (_storyDiffCfg().reward || 1)); }

// Evolution: an enemy builds resistance to whichever move keeps hitting it. A
// move is weapon + action tier (swing/ability/super) + ground/air. The first
// three hits of a move are free (a full combo string); each hit past that costs
// 9%, down to 55%. Landing a different move sheds a stack from every other move,
// and a move unused for 4s is forgotten.
function _storyEvoAdapt(attacker, target, dmg) {
  const now = typeof frameCount !== 'undefined' ? frameCount : 0;
  const key = (attacker.weaponKey || '?') + ':' + (attacker._attackKindTier | 0) + (attacker.onGround ? 'g' : 'a');
  const book = target._evoAdapt || (target._evoAdapt = {});
  for (const k in book) {
    if (k !== key && book[k].n > 0) book[k].n--;
  }
  let e = book[key];
  if (!e || now - e.t > 240) e = book[key] = { n: 0, t: now, shown: false };
  e.n++;
  e.t = now;
  const over = e.n - 3;
  if (over <= 0) { e.shown = false; return dmg; }
  const mult = Math.max(0.55, 1 - 0.09 * over);
  if (!e.shown && mult <= 0.82 && settings.dmgNumbers && typeof DamageText !== 'undefined') {
    e.shown = true;
    damageTexts.push(new DamageText(target.cx(), target.y - 38, 'ADAPTING', '#ff7744'));
  }
  return Math.max(1, Math.round(dmg * mult));
}

function _updateStoryDifficultyBtn() {
  const btn = document.getElementById('storyDifficultyBtn');
  if (!btn) return;
  const cfg = _storyDiffCfg();
  const locked = _storyDifficulty() === 'evolution';
  btn.textContent = 'Difficulty: ' + cfg.name + (locked ? ' 🔒' : '');
  btn.style.color = cfg.color;
  btn.title = locked ? 'Evolution is permanent. Start a New Game to leave it.' : 'Change difficulty';
}

function _maybePickStoryDifficulty() {
  const m = document.getElementById('storyModal');
  if (!m || m.style.display === 'none') return;
  if (_story2 && !_story2.difficulty) _showStoryDifficultyPicker(true);
}

// firstPick: a fresh story choosing for the first time (Evolution allowed).
// Otherwise the player is changing an existing choice (Evolution is out of reach,
// and if it is the current choice nothing else is).
function _showStoryDifficultyPicker(firstPick) {
  const old = document.getElementById('storyDifficultyOverlay');
  if (old) old.remove();
  const current = _story2 && _story2.difficulty ? _story2.difficulty : null;
  const evoLocked = current === 'evolution';

  const ov = document.createElement('div');
  ov.id = 'storyDifficultyOverlay';
  ov.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9400', 'background:rgba(3,4,10,0.97)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'padding:16px', 'box-sizing:border-box', 'overflow-y:auto',
  ].join(';');

  const box = document.createElement('div');
  box.style.cssText = 'width:min(760px,100%);text-align:center;';
  const title = document.createElement('h2');
  title.textContent = firstPick ? 'Choose Your Difficulty' : 'Change Difficulty';
  title.style.cssText = 'margin:0 0 6px;color:#fff;font-size:1.5rem;letter-spacing:2px;';
  const sub = document.createElement('p');
  sub.textContent = evoLocked
    ? 'Evolution is permanent. The only way out is a New Game, which wipes your story progress.'
    : firstPick
      ? 'You can switch between Story, Normal and Challenge later. Evolution can only be chosen now, and never left.'
      : 'Evolution can only be chosen when starting a new story.';
  sub.style.cssText = 'margin:0 0 18px;color:#99a;font-size:0.85rem;line-height:1.5;';
  box.appendChild(title);
  box.appendChild(sub);

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;text-align:left;';
  for (const key of STORY_DIFFICULTY_ORDER) {
    const cfg = STORY_DIFFICULTIES[key];
    const disabled = evoLocked ? key !== 'evolution' : (!firstPick && key === 'evolution');
    const isCurrent = !firstPick && key === current;
    const card = document.createElement('button');
    card.style.cssText = [
      'display:flex', 'flex-direction:column', 'gap:6px', 'padding:14px',
      'background:' + (isCurrent ? '#262838' : '#161826'),
      'border:1px solid ' + (isCurrent ? cfg.color : 'rgba(255,255,255,0.14)'),
      'border-radius:10px', 'color:#ccd', 'font-family:inherit', 'text-align:left',
      'cursor:' + (disabled || isCurrent ? 'default' : 'pointer'),
      'opacity:' + (disabled ? '0.4' : '1'), 'transition:background 0.12s,border-color 0.12s',
    ].join(';');
    const name = document.createElement('div');
    name.textContent = cfg.name + (isCurrent ? '  (current)' : '');
    name.style.cssText = 'font-size:1.05rem;font-weight:800;letter-spacing:1px;color:' + cfg.color + ';';
    const tag = document.createElement('div');
    tag.textContent = cfg.tagline;
    tag.style.cssText = 'font-size:0.8rem;color:#eef;';
    card.appendChild(name);
    card.appendChild(tag);
    const ul = document.createElement('ul');
    ul.style.cssText = 'margin:2px 0 0;padding-left:16px;font-size:0.72rem;color:#99a;line-height:1.45;';
    for (const l of cfg.lines) {
      const li = document.createElement('li');
      li.textContent = l;
      ul.appendChild(li);
    }
    card.appendChild(ul);
    if (!disabled && !isCurrent) {
      card.onmouseover = () => { card.style.background = '#22243a'; card.style.borderColor = cfg.color; };
      card.onmouseout  = () => { card.style.background = '#161826'; card.style.borderColor = 'rgba(255,255,255,0.14)'; };
      card.onclick = () => {
        if (key === 'evolution' &&
            !confirm('Evolution is permanent.\nYou will never be able to change difficulty on this story. The only way out is New Game, which wipes your story progress.\n\nChoose Evolution?')) return;
        _story2.difficulty = key;
        _saveStory2();
        _updateStoryDifficultyBtn();
        ov.remove();
      };
    }
    grid.appendChild(card);
  }
  box.appendChild(grid);

  const close = document.createElement('button');
  close.textContent = firstPick ? 'Not now' : 'Close';
  close.style.cssText = 'margin-top:18px;padding:7px 22px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);border-radius:7px;color:#889;cursor:pointer;font-size:0.8rem;font-family:inherit;';
  close.onclick = () => {
    ov.remove();
    // An unpicked story is not playable yet — leave the menu with the overlay.
    if (firstPick) closeStoryMenu();
  };
  box.appendChild(close);
  ov.appendChild(box);
  document.body.appendChild(ov);
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

// Currently-viewed act index in the act-paged level select (null = default to reached act).
let _storyViewAct = null;

function _renderChapterList() {
  const list = document.getElementById('storyLevelList');
  if (!list) return;
  list.innerHTML = '';

  // Clamp into the active saga: a fresh save's chapter 0 would otherwise lock
  // every tile on a Saga II/III build (`locked = ... || i > cur`). The saved
  // value itself is never mutated. No-op on a 'full' build.
  const cur        = (typeof sagaClampChapter === 'function')
    ? sagaClampChapter(_story2.chapter) : _story2.chapter;
  const curArcId   = _getCurrentArcId();

  // ── Overall progress bar ──────────────────────────────────────────────────
  // Saga builds report progress through THIS game, not through all 186 chapters.
  // Both helpers return the whole story on a 'full' build (docs/SAGA_SPLIT_PLAN.md).
  const _sagaScoped = typeof activeSagaChapterCount === 'function'
                   && typeof isChapterInActiveSaga === 'function';
  const totalCh  = _sagaScoped ? activeSagaChapterCount() : STORY_CHAPTERS2.length;
  // `defeated` can hold DUPLICATES, and it mixes two key spaces: chapters are
  // recorded by ch.id (smb-story-engine-flow.js) but tested by array index
  // here. A finished save was reading 373 defeated against 186 chapters, i.e.
  // 201% progress. Counting distinct entries that are actually in range keeps
  // the bar honest. This is a DISPLAY guard only — it deliberately does not
  // touch the unlock tests below, which still use .includes() as before.
  const _seen = new Set(
    (Array.isArray(_story2.defeated) ? _story2.defeated : [])
      .filter(i => Number.isInteger(i) && i >= 0 && i < STORY_CHAPTERS2.length)
  );
  const doneCh   = Math.min(totalCh, _sagaScoped
    ? [..._seen].filter(i => isChapterInActiveSaga(i)).length
    : _seen.size);
  const pct      = totalCh > 0 ? Math.min(100, Math.round((doneCh / totalCh) * 100)) : 0;
  const _tally   = typeof storyStarTally === 'function' ? storyStarTally() : null;
  // Retroactive: an existing save may already qualify for the completion awards.
  if (typeof checkCompletionAchievements === 'function') checkCompletionAchievements();

  // Map view (smb-story-map.js) is the default; the list below is its fallback,
  // one click away on the Map/List toggle.
  const _viewBtn = document.getElementById('storyViewToggle');
  if (typeof StoryMap !== 'undefined') {
    if (_viewBtn) { _viewBtn.style.display = ''; _viewBtn.textContent = StoryMap.enabled() ? 'List view' : 'Map view'; }
    if (StoryMap.enabled()) { StoryMap.mount(list); return; }
    StoryMap.unmount();
  }
  const progWrap = document.createElement('div');
  progWrap.className = 'story-progress-wrap';
  progWrap.innerHTML =
    `<div class="story-progress-row">` +
      `<span>Progress</span><span style="color:#334d55;">${doneCh}/${totalCh} chapters · ${pct}%` +
      (_tally ? ` · ★ ${_tally.stars}/${_tally.total}` : '') + `</span>` +
    `</div>` +
    `<div class="story-progress-bar-bg">` +
      `<div class="story-progress-bar-fill" style="width:${pct}%;"></div>` +
    `</div>`;
  list.appendChild(progWrap);

  // Carry-forward acknowledgment — recognition only, gates nothing.
  if (typeof sagaCarryForward === 'function') {
    const _carried = sagaCarryForward(_story2.defeated);
    if (_carried.length) {
      const cf = document.createElement('div');
      cf.className = 'story-carry-forward';
      cf.style.cssText = 'margin:6px 0 2px;font-size:0.72rem;letter-spacing:0.5px;'
        + 'opacity:0.75;font-style:italic;color:#8fa8b8;';
      cf.textContent = 'Continued from ' + _carried.map(s => s.title).join(' \u00b7 ');
      list.appendChild(cf);
    }
  }

  // ── Act paging ────────────────────────────────────────────────────────────
  // The act list this build presents. On a 'full' build this IS
  // STORY_ACT_STRUCTURE; on a saga build it is that list trimmed to the saga's
  // arcs, with act numbering restarted (Saga III opens on "Act I", not "Act IX").
  const _acts = (typeof activeSagaActView === 'function')
    ? activeSagaActView()
    : STORY_ACT_STRUCTURE;

  // The modal subtitle is authored in index.html as "ten acts to the truth" —
  // true for the combined build and wrong for every saga build, which presents
  // three acts (saga1/saga2) or two (saga3). A newcomer opening a standalone saga
  // must not be told the story is twice the size it is. Full build keeps its
  // authored copy verbatim.
  if (typeof sagaIsFullBuild === 'function' && !sagaIsFullBuild()) {
    const _sub = document.querySelector('.story-modal-subtitle');
    if (_sub) {
      const _words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
      const _n = _words[_acts.length] || String(_acts.length);
      _sub.textContent = 'A world unraveling \u2014 ' + _n + ' act' + (_acts.length === 1 ? '' : 's') + ' to the truth';
    }
  }
  const _actIdxForChapter = (chIdx) => {
    for (let ai = 0; ai < _acts.length; ai++) {
      for (const arc of _acts[ai].arcs) {
        if (chIdx >= arc.chapterRange[0] && chIdx <= arc.chapterRange[1]) return ai;
      }
    }
    return 0;
  };
  const curActIdx = _actIdxForChapter(cur);
  // Furthest act reached = the current pointer's act, OR the highest act that
  // has ANY cleared chapter. A completed save may reset `cur` to Act I, so the
  // defeated set is what unlocks paging through the whole story (spoiler-safe).
  // Scan top-down with the same .includes() predicate the UI uses everywhere —
  // robust to duplicate / non-numeric junk in the defeated array.
  let maxAct = curActIdx;
  for (let ai = _acts.length - 1; ai > maxAct; ai--) {
    const anyDone = _acts[ai].arcs.some(arc => {
      for (let i = arc.chapterRange[0]; i <= arc.chapterRange[1]; i++) {
        if (_story2.defeated.includes(i)) return true;
      }
      return false;
    });
    if (anyDone) { maxAct = ai; break; }
  }
  if (typeof _storyViewAct !== 'number') _storyViewAct = curActIdx;
  _storyViewAct = Math.max(0, Math.min(maxAct, _storyViewAct));

  const act = _acts[_storyViewAct];
  if (!act) return;
  const _hex2rgb = hex => {
    const m = hex.replace('#','').match(/.{2}/g);
    return m ? m.map(x => parseInt(x,16)).join(',') : '136,136,136';
  };

  // Act completion tally
  let actDone = 0, actTotal = 0, actStars = 0;
  for (const arc of act.arcs) {
    for (let i = arc.chapterRange[0]; i <= arc.chapterRange[1]; i++) {
      actTotal++;
      if (_story2.defeated.includes(i)) actDone++;
      if (typeof storyChapterStarred === 'function' && storyChapterStarred(i)) actStars++;
    }
  }

  // ── Act pager header (◀  ACT N — Name  ▶) ─────────────────────────────────
  const pager = document.createElement('div');
  pager.className = 'story-act-pager';
  pager.style.setProperty('--act-color', act.color);
  pager.style.setProperty('--act-rgb', _hex2rgb(act.color));
  const canPrev = _storyViewAct > 0;
  const canNext = _storyViewAct < maxAct;
  pager.innerHTML =
    `<button class="story-act-pager-arrow" data-dir="-1" ${canPrev ? '' : 'disabled'}>◀</button>` +
    `<div class="story-act-pager-mid">` +
      `<div class="story-act-pager-title">${act.label}</div>` +
      `<div class="story-act-pager-sub">${actDone}/${actTotal} levels · ★ ${actStars}/${actTotal} · Act ${_storyViewAct + 1} of ${_acts.length}</div>` +
    `</div>` +
    `<button class="story-act-pager-arrow" data-dir="1" ${canNext ? '' : 'disabled'}>▶</button>`;
  pager.querySelectorAll('.story-act-pager-arrow').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      _storyViewAct += parseInt(btn.getAttribute('data-dir'), 10);
      _renderChapterList();
    });
  });
  list.appendChild(pager);

  // ── Arcs of this act → grids of numbered level tiles ──────────────────────
  act.arcs.forEach(arc => {
    const arcUnlocked = _isArcUnlocked(arc);
    const { done: arcDone, total: arcTotal } = _getArcProgress(arc);
    const arcComplete = _isArcComplete(arc);

    const divider = document.createElement('div');
    divider.className = 'story-arc-divider' + (arcComplete ? ' complete' : '');
    if (!arcUnlocked) divider.style.opacity = '0.4';
    divider.innerHTML =
      `<span class="story-arc-divider-label">${arc.label}</span>` +
      `<span class="story-arc-divider-count${arcComplete ? ' done' : ''}">${arcDone}/${arcTotal}</span>`;
    list.appendChild(divider);

    const grid = document.createElement('div');
    grid.className = 'story-level-grid';

    for (let i = arc.chapterRange[0]; i <= arc.chapterRange[1]; i++) {
      const ch = STORY_CHAPTERS2[i];
      if (!ch) continue;
      const done    = _story2.defeated.includes(i);
      const current = i === cur;
      const locked  = !arcUnlocked || i > cur;
      const isBoss  = !!(ch.isBossFight || ch.isTrueFormFight);
      const isSpoilerLocked = locked && !done && isBoss;

      let displayTitle = ch.title;
      let displayWorld = ch.world || '';
      if (isSpoilerLocked) {
        displayTitle = ch.isTrueFormFight ? '??? Final Entity' : '??? Boss Encounter';
        displayWorld = 'Unknown Zone';
      }

      const tile = document.createElement('div');
      tile.className = 'story-level-tile' +
        (done ? ' lvl-done' : current ? ' lvl-current' : locked ? ' lvl-locked' : ' lvl-open') +
        (isBoss ? ' lvl-boss' : '');

      const badge = done ? '✓' : locked ? '🔒' : current ? '▶' : (i + 1);
      const _lives = ch.playerLives !== undefined ? ch.playerLives : 3;
      const _loot  = typeof storyChapterLootProgress === 'function' ? storyChapterLootProgress(i) : { got: 0, total: 0 };
      const _star  = typeof storyChapterStarred === 'function' && storyChapterStarred(i);
      const tip = isSpoilerLocked
        ? "You're not supposed to see that yet."
        : `Level ${i + 1} · ${displayWorld}` +
          (!ch.noFight ? ` · ${_lives === 1 ? '1 life' : _lives + ' lives'}` : '') +
          (!done && ch.tokenReward ? ` · +${ch.tokenReward}🪙` : '') +
          (_loot.total ? ` · caches ${_loot.got}/${_loot.total}` : '') +
          (_star ? ' · ★ 100%' : done ? ' · replay' : '');
      tile.title = tip;
      if (_star) tile.classList.add('lvl-starred');

      tile.innerHTML =
        `<div class="lvl-num">${badge}</div>` +
        `<div class="lvl-idx">${i + 1}</div>` +
        `<div class="lvl-name">${displayTitle}</div>` +
        (_star ? `<div class="lvl-star" aria-label="100% complete">★</div>` : '');

      if (!locked) {
        tile.style.cursor = 'pointer';
        tile.addEventListener('click', () => _beginChapter2(i));
      }
      grid.appendChild(tile);
    }
    list.appendChild(grid);
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
  if (typeof resetTrialState === 'function') resetTrialState();
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

// ── Unified balance scaling ────────────────────────────────────────────────────
// Returns raw (unclamped) stat targets for a given original chapter index.
// Clamps are applied by _storyScaleEnemyUnit before writing to a fighter.
function getScaling(chapter) {
  const base = 1 + chapter * 0.08;
  return {
    enemyHP:     100 * base,   // standard enemy HP target
    enemyDamage: 12  * base,   // damage per hit target (pre-weapon-multiplier)
    bossHP:      600 * base,   // boss HP target (used for Fallen God / custom bosses)
    bossDamage:  18  * base,   // boss damage per hit target
  };
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
  if (type === 'traversal')     return 'Traversal';
  if (type === 'arena_lock')    return 'Arena Lock';
  if (type === 'hazard_phase')  return 'Hazard Surge';
  if (type === 'elite_wave')    return 'Elite Wave';
  if (type === 'mini_boss')     return 'Mini Boss';
  if (type === 'chase')         return 'Escape Route';
  if (type === 'survival_wave') return 'Survival Wave';
  if (type === 'puzzle_lock')   return 'Mechanism Lock';
  if (type === 'parkour')       return 'Parkour Run';
  if (type === 'branch')        return 'Decision Point';
  if (type === 'stealth')       return 'Infiltration';
  if (type === 'escape')        return 'Escape';
  if (type === 'defense')       return 'Hold the Line';
  if (type === 'scavenge')      return 'Scavenge';
  if (type === 'puzzle')        return 'Mechanism Puzzle';
  if (type === 'assassination') return 'Elimination';
  if (type === 'gauntlet')      return 'Gauntlet';
  if (type === 'ship_flight')   return 'Ship Flight';
  if (type === 'escort')        return 'Escort';
  return 'Phase';
}

// ── Level archetype pacing schedule ──────────────────────────────────────────
// Controls which archetype is injected as a chapter's opening phase.
// Rules checked in order; first match wins.
// every:  fire every N chapters
// offset: shift the start of the cycle
// minId:  gate by chapter index (don't fire in early chapters)
const STORY_PACING_RULES = [
  { every: 4,  offset: 2, inject: 'traversal',     minId: 5  },
  { every: 5,  offset: 0, inject: 'survival_wave', minId: 15 },
  { every: 7,  offset: 3, inject: 'chase',         minId: 20 },
  { every: 10, offset: 1, inject: 'puzzle_lock',   minId: 10 },
  { every: 30, offset: 5, inject: 'branch',        minId: 25 },
  { every: 16, offset: 0, inject: 'parkour',       minId: 14 }, // ch 16, 32, 48, 64 — guaranteed free slots
];

// Returns the pacing archetype override for a given chapter id, or null.
function _storyGetPacingOverride(chId) {
  for (const rule of STORY_PACING_RULES) {
    if (chId < rule.minId) continue;
    if ((chId - rule.offset) % rule.every === 0) return rule.inject;
  }
  return null;
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

  // Stamp the pacing archetype for this chapter. No-op until Phase 2+ dispatchers
  // read ch._pacingOverride and inject the appropriate opening phase.
  if (ch._pacingOverride === undefined) {
    ch._pacingOverride = _storyGetPacingOverride(ch.id);
  }

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

  // ── PROTOTYPE: GoW-style multi-enemy "rounds of fighters" ────────────────
  // A small allowlist of crowd-themed chapters gets a curated wave sequence
  // instead of collapsing to a single duel. If this feels good, widen the set.
  // The Last Army (47), Rogue Faction (52), Architecture Soldiers (127).
  //
  // CRITICAL: gate on `_origId`, which is present ONLY on launch-time chapters
  // (set by _phaseToChapter). During _expandStoryChaptersInPlace the source
  // chapter has no _origId, so this stays single-phase there — returning >1
  // phase at expansion would split the chapter into multiple STORY_CHAPTERS2
  // entries and desync every downstream id + save. Waves are launch-only.
  const PROTOTYPE_WAVE_CHAPTERS = new Set([47, 52, 129]);
  if (ch._origId !== undefined && PROTOTYPE_WAVE_CHAPTERS.has(ch._origId)) {
    const lives = ch.playerLives || 3;
    const arena = ch.arena || 'homeAlley';
    ch.phases = [
      {
        type: 'arena_lock', label: 'Wave 1 — First Line', arena, playerLives: lives,
        opponents: [
          supportEnemy,
          _storyCloneEnemyDef(supportEnemy, { name: `${baseEnemy.name} Grunt`, color: '#667788' }),
        ],
      },
      {
        type: 'elite_wave', label: 'Wave 2 — Heavies', arena, playerLives: lives,
        opponents: [
          eliteEnemy,
          _storyCloneEnemyDef(supportEnemy, { name: `${baseEnemy.name} Skirmisher`, weaponKey: 'spear', classKey: 'ninja', color: '#8855cc' }),
        ],
      },
      {
        type: 'mini_boss', label: ch.opponentName || 'Commander', finalChapter: true, arena, playerLives: lives,
        opponents: [
          _storyCloneEnemyDef(baseEnemy, { name: ch.opponentName || `${baseEnemy.name} Commander`, aiDiff: eliteAI, isElite: true }),
        ],
      },
    ];
    return ch.phases; // skip the finale collapse — keep all three rounds
  }

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
        opponents: [supportEnemy, _storyCloneEnemyDef(supportEnemy, { name: 'Lockdown Guard', weaponKey: 'hammer', classKey: 'thor', color: '#556677' })],
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

  // Apply pacing override: puzzle_lock — replace the opening phase with a mechanism challenge.
  // Three mechanics rotate by chapter id; each is pure flavor on top of normal combat.
  if (ch._pacingOverride === 'puzzle_lock' && ch.phases.length > 0 && !ch.isBossFight && !ch.isTrueFormFight) {
    const mechanic = ch.id % 3 === 0 ? 'timed_duel'
                   : ch.id % 3 === 1 ? 'marked_target'
                   : 'platform_switch';
    const mechanicLabel =
        mechanic === 'timed_duel'
          ? 'One life. No mistakes — win on the first try.'
          : mechanic === 'marked_target'
          ? `Priority target: ${ch.opponentName || 'lead enemy'}. Identify and eliminate first.`
          : 'High-ground advantage active. Use the terrain — they will.';
    ch.phases[0] = {
      ...ch.phases[0],
      type:        'puzzle_lock',
      label:       mechanicLabel,
      mechanic,
      playerLives: mechanic === 'timed_duel'
        ? 1
        : (ch.phases[0].playerLives || Math.max(2, ch.playerLives || 3)),
      arena: mechanic === 'platform_switch'
        ? (ch.id % 2 === 0 ? 'forest' : 'ruins')
        : (ch.phases[0].arena || ch.arena || 'homeAlley'),
    };
  }

  // Apply pacing override: parkour — replace the first traversal phase with a pure platforming run.
  // No enemies in early chapters; sparse spawns after ch 28.
  if (ch._pacingOverride === 'parkour' && !ch.isBossFight && !ch.isTrueFormFight) {
    const parkourIdx = ch.phases.findIndex(p => p.type === 'traversal');
    const insertAt   = parkourIdx >= 0 ? parkourIdx : 0;
    ch.phases[insertAt] = {
      type:        'parkour',
      label:       ch.id >= 30
        ? 'Precision Run — one wrong step ends it.'
        : 'Navigate the terrain. There is no cover here.',
      worldLength: 3200 + Math.min(ch.id * 30, 900),
      objectName:  ch.objectName || 'Checkpoint',
      spawnEnemies: ch.id >= 28 ? (ch.spawnEnemies || []).slice(0, 2) : [],
      playerLives: ch.playerLives || 3,
    };
  }

  // Collapse auto-generated phases to the finale only — each chapter is one focused fight
  const finale = ch.phases.find(p => p.finalChapter) || ch.phases[ch.phases.length - 1];
  ch.phases = [finale];
  return ch.phases;
}

function _storyGetCurrentPhase() {
  return storyGauntletState && storyGauntletState.phases
    ? storyGauntletState.phases[storyGauntletState.index] || null
    : null;
}

function _storyUpdatePhaseIndicator() {
  const phase = _storyGetCurrentPhase();
  if (!storyGauntletState || !phase || storyGauntletState.phases.length <= 1) {
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
  if (typeof _story2 === 'undefined') return null;
  if (!_story2.meta || typeof _story2.meta !== 'object') _story2.meta = {};
  if (typeof _story2.meta.updatedAt !== 'number') {
    _story2.meta.updatedAt = (typeof window.__SMB_PENDING_SAVE_TIMESTAMP === 'number' && window.__SMB_PENDING_SAVE_TIMESTAMP > 0)
      ? window.__SMB_PENDING_SAVE_TIMESTAMP
      : Date.now();
  }
  _story2.meta.source = 'local';
  return JSON.parse(JSON.stringify(_story2));
}

function restoreStoryDataFromSave(data) {
  if (!data || !data.defeated) return;
  _story2 = _normalizeStory2Progress(data);
  _migrateStory2ThreshArc(_story2);
  // Must follow the Thresh migration — see the note on that function.
  _migrateStory2TrialChapters(_story2);
  _saveStory2();
}

// ============================================================
// STORY MODE v2 — Chapter Progression, Tokens, Blueprints,
//                 Ability Store, Story Online unlock
// ============================================================

// ============================================================
// STORY SKILL TREE
// ============================================================
// ── Skill Tree ────────────────────────────────────────────────────────────────
// Layout: each branch has a root node(s), with child chains.
// `requires` is a single parent nodeId (or null for root).
// `requiresAny` is an array of alternative parents (unlocked if ANY is met).
// The renderer builds the visual tree from these dependency relationships.
const STORY_SKILL_TREE = {
  mobility: {
    label: 'Mobility',
    color: '#44ffaa',
    icon: '🏃',
    nodes: [
      { id: 'highJump1',      name: 'Stronger Legs',       desc: 'Jump 15% higher',                           expCost: 25,  requires: null },
      { id: 'highJump2',      name: 'Leap Training',        desc: 'Jump 25% higher total',                     expCost: 45,  requires: 'highJump1' },
      { id: 'doubleJump',     name: 'Double Jump',          desc: 'Press W again while airborne',              expCost: 80,  requires: 'highJump2' },
      { id: 'fastFall',       name: 'Fast Fall',            desc: 'Hold S in air to drop fast; cancel lag',    expCost: 55,  requires: 'highJump2' },
    ],
  },
  combat: {
    label: 'Combat',
    color: '#ff8844',
    icon: '⚔️',
    nodes: [
      { id: 'heavyHit1',      name: 'Stronger Strikes',     desc: '+15% attack damage',                        expCost: 25,  requires: null },
      { id: 'heavyHit2',      name: 'Power Blows',          desc: '+25% damage total',                         expCost: 45,  requires: 'heavyHit1' },
      { id: 'weaponAbility',  name: 'Weapon Mastery',       desc: 'Unlock weapon Q-ability',                   expCost: 80,  requires: 'heavyHit2' },
      { id: 'comboExtender',  name: 'Combo Flow',           desc: 'One extra hit before combo limiter kicks in',expCost: 100, requires: 'weaponAbility' },
      { id: 'criticalEdge',   name: 'Critical Edge',        desc: '8% chance to deal 2× damage on any hit',    expCost: 140, requires: 'comboExtender' },
      { id: 'impactShield',   name: 'Impact Shield',        desc: 'Q while shielding: slam forward 15 dmg + stagger (3s CD)', expCost: 60, requires: 'heavyHit1' },
    ],
  },
  resilience: {
    label: 'Resilience',
    color: '#88aaff',
    icon: '🛡️',
    nodes: [
      { id: 'tankier1',       name: 'Tougher Body',         desc: '+15 max HP',                                expCost: 25,  requires: null },
      { id: 'tankier2',       name: 'Hardened',             desc: '+25 max HP total',                          expCost: 45,  requires: 'tankier1' },
      { id: 'superMeter',     name: 'Inner Power',          desc: 'Unlock Super meter (E key)',                 expCost: 80,  requires: 'tankier2' },
      { id: 'tankier3',       name: 'Iron Frame',           desc: '+40 max HP total',                          expCost: 70,  requires: 'tankier2' },
      { id: 'dimensionalPatch', name: 'Dimensional Patch',  desc: 'Once per match, Q heals 30% max HP',         expCost: 50,  requires: 'tankier1' },
      { id: 'voidStep',       name: 'Void Step',            desc: 'Below 30% HP: one-time +50% speed for 5s',  expCost: 85,  requires: 'dimensionalPatch' },
    ],
  },
  speed: {
    label: 'Speed',
    color: '#ffee44',
    icon: '⚡',
    nodes: [
      { id: 'fastMove1',      name: 'Quick Feet',           desc: 'Move 10% faster',                           expCost: 20,  requires: null },
      { id: 'fastMove2',      name: 'Sprint Training',      desc: 'Move 20% faster total',                     expCost: 40,  requires: 'fastMove1' },
      { id: 'fastMove3',      name: 'Blur Step',            desc: 'Move 30% faster total',                     expCost: 75,  requires: 'fastMove2' },
      { id: 'fractureSurge',  name: 'Fracture Surge',       desc: 'Super meter charges 40% faster',            expCost: 75,  requires: 'fastMove1' },
    ],
  },
  survival: {
    label: 'Survival',
    color: '#ff5588',
    icon: '❤️',
    nodes: [
      { id: 'lastStrike',     name: 'Last Strike',          desc: 'Below 10% HP: next attack deals 2× damage (once per life)', expCost: 60, requires: null },
      { id: 'echoRage',       name: 'Echo Rage',            desc: '3 rapid hits trigger rage: next 5 attacks 3× damage',       expCost: 110, requires: 'lastStrike' },
      { id: 'mirrorFracture', name: 'Mirror Fracture',      desc: 'While shielding, reflect 25% damage back at attacker',      expCost: 90,  requires: 'lastStrike' },
      { id: 'temporalBreak',  name: 'Temporal Break',       desc: 'Below 20% HP: freeze all enemies 2s once per match',        expCost: 180, requires: 'echoRage' },
    ],
  },
  mastery: {
    label: 'Mastery',
    color: '#cc88ff',
    icon: '🌀',
    // Root requires any tier-2 node from another branch (gate behind progression)
    nodes: [
      { id: 'masterRoot',     name: 'Fragment Sync',        desc: 'Reduces all ability cooldowns by 15%',      expCost: 100, requires: null, requiresAny: ['heavyHit2','tankier2','fastMove2'] },
      { id: 'fragmentHunger', name: 'Fragment Hunger',      desc: 'Each kill: +8% damage stacked (max 5 kills, resets on death)', expCost: 130, requires: 'masterRoot' },
      { id: 'architects',     name: 'Architects\' Resolve', desc: 'Once per match: auto-revive at 25% HP when you would die', expCost: 160, requires: 'masterRoot' },
      { id: 'coreCollapse',   name: 'Core Collapse',        desc: 'Once per match, super deals 60% of enemy max HP',           expCost: 350, requires: 'architects' },
    ],
  },
};

// ── Per-weapon mastery (God of War style) ──────────────────────────────────────
// One uniform ladder applied per weapon; purchases live in _story2.weaponSkills[weaponKey].
// EXP is the shared pool (_story2.exp). Effects route through existing hooks:
// damage → storyPlayerOverride.dmgMult, HP → _applySkillTreeToPlayer, Q cooldown → Fighter.ability().
const STORY_WEAPON_MASTERY = [
  { id: 'honed1',     name: 'Honed Edge I',   desc: '+12% damage with this weapon',                expCost: 30,  requires: null },
  { id: 'honed2',     name: 'Honed Edge II',  desc: '+22% damage total with this weapon',          expCost: 55,  requires: 'honed1' },
  { id: 'reinforced', name: 'Reinforced',     desc: '+20 max HP while wielding this weapon',        expCost: 45,  requires: 'honed1' },
  { id: 'swiftdraw',  name: 'Swift Draw',     desc: "This weapon's Q ability cools 25% faster",     expCost: 50,  requires: 'honed1' },
  { id: 'mastery',    name: 'Weapon Mastery', desc: '+10% damage and Q cools 15% faster (stacks)',  expCost: 110, requires: 'honed2' },
];

// Damage fraction added by the equipped weapon's mastery (0 = none).
function _weaponMasteryDmgBonus(weaponKey) {
  const wm = (_story2 && _story2.weaponSkills && _story2.weaponSkills[weaponKey]) || {};
  let b = wm.honed2 ? 0.22 : wm.honed1 ? 0.12 : 0;
  if (wm.mastery) b += 0.10;
  return b;
}

// Max-HP added by the equipped weapon's mastery.
function _weaponMasteryHpBonus(weaponKey) {
  const wm = (_story2 && _story2.weaponSkills && _story2.weaponSkills[weaponKey]) || {};
  return wm.reinforced ? 20 : 0;
}

// Q-ability cooldown multiplier from the equipped weapon's mastery (1 = unchanged).
function _weaponMasteryCdMult(weaponKey) {
  const wm = (_story2 && _story2.weaponSkills && _story2.weaponSkills[weaponKey]) || {};
  let m = 1;
  if (wm.swiftdraw) m *= 0.75;
  if (wm.mastery)   m *= 0.85;
  return m;
}

// Apply purchased skill tree bonuses to a fighter in story mode
function _applySkillTreeToPlayer(p) {
  if (!p || !_story2.skillTree) return;
  const sk = _story2.skillTree;
  // Jump
  p._storyJumpMult = 1.0 + (sk.highJump2 ? 0.25 : sk.highJump1 ? 0.15 : 0);
  if (p._storyNoDoubleJump !== undefined) p._storyNoDoubleJump = !sk.doubleJump;
  // HP bonus (stacking tiers)
  const wKey    = p.weaponKey || 'sword';
  const hpBonus = (sk.tankier3 ? 40 : sk.tankier2 ? 25 : sk.tankier1 ? 15 : 0) + _weaponMasteryHpBonus(wKey);
  if (hpBonus > 0) {
    p.maxHealth = (p.maxHealth || 100) + hpBonus;
    p.health    = Math.min(p.health + hpBonus, p.maxHealth);
  }
  // Per-weapon Q-ability cooldown scaling (consumed in Fighter.ability())
  p._weaponAbilityCdMult = _weaponMasteryCdMult(wKey);
  // Speed
  const speedBonus = sk.fastMove3 ? 0.30 : sk.fastMove2 ? 0.20 : sk.fastMove1 ? 0.10 : 0;
  if (speedBonus > 0) p._storySpeedMult = 1.0 + speedBonus;
  // Damage
  const dmgBonus = sk.heavyHit2 ? 0.25 : sk.heavyHit1 ? 0.15 : 0;
  if (dmgBonus > 0) p._storyDmgMult = 1.0 + dmgBonus;
  // Skill flags (consumed by game systems already checking _story2.skillTree)
  p._skillImpactShield   = !!sk.impactShield;
  p._skillDimensionalPatch = !!sk.dimensionalPatch;
  p._skillVoidStep       = !!sk.voidStep;
  p._skillFractureSurge  = !!sk.fractureSurge;
  p._skillEchoRage       = !!sk.echoRage;
  p._skillMirrorFracture = !!sk.mirrorFracture;
  p._skillFragmentHunger = !!sk.fragmentHunger;
  p._skillArchitects     = !!sk.architects;
  p._skillCoreCollapse   = !!sk.coreCollapse;
  p._skillLastStrike     = !!sk.lastStrike;
  p._skillTemporalBreak  = !!sk.temporalBreak;
  p._skillCriticalEdge   = !!sk.criticalEdge;
  p._skillCooldownReduction = sk.masterRoot ? 0.15 : 0;
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

// ── Core moves are never locked ───────────────────────────────────────────────
// These used to be gated behind skill-tree purchases, so early chapters played
// without Q, E, double jump, dodge or a class. That only made returning players
// re-clearing a chapter for loot fight with half a moveset — the nodes are all
// buyable anyway, so locking them added hassle and nothing else. They are now
// granted on every save (old and new); the tree still renders them, marked owned.
const STORY_CORE_UNLOCKS = ['weaponAbility', 'superMeter', 'doubleJump', 'classUnlock'];
function _applyStoryCoreUnlocks(sk) {
  if (!sk || typeof sk !== 'object') return sk;
  for (const id of STORY_CORE_UNLOCKS) sk[id] = true;
  return sk;
}

function _defaultStory2Progress() {
  return {
    chapter:           0,       // index into STORY_CHAPTERS2 (next to play)
    tokens:            0,
    exp:               0,       // EXP earned from kills — used for skill tree
    health:            null,    // persistent HP carried between walk→fight chapters (null = full)
    lootTaken:         {},      // { 'chapterId:index': 1 } — one-time loot pickups already collected
    cpResume:          null,    // { chId, x } — last rest checkpoint reached; a game-over Retry resumes there
    blueprints:        [],      // blueprint keys earned
    unlockedAbilities: [],      // ability keys bought from store
    skillTree:         _applyStoryCoreUnlocks({}), // { nodeId: true } — purchased skill nodes (core moves pre-granted)
    weaponSkills:      {},      // { weaponKey: { nodeId: true } } — per-weapon mastery
    defeated:          [],      // chapter indices completed
    storyComplete:     false,
    runState:          { healthPct: 1, noDeathChain: 0 },
    metaUpgrades:      { damage: 0, survivability: 0, healUses: 0 },
    // v3 hierarchy fields — added by migration for old saves
    arcCollapsed:      {},      // { arcId: bool } — user-toggled arc collapse state
    actExpanded:       {},      // { actIndex: bool } — user forced an out-of-range act open
    branchFlags:       {},      // { [flagKey]: true } — choices made at branch chapters
    prologueSeen:      false,   // true after the Axiom/multiverse intro plays once
    tuesdaySeen:       false,   // true after the playable Tuesday cold open has run once
    difficulty:        null,    // 'story' | 'normal' | 'challenge' | 'evolution' — null until picked (see STORY_DIFFICULTIES)
    loadout:           { weapon: 'sword', cls: 'warrior' }, // story's own P1 pick, separate from Versus; either may be 'random'
    migrations:        { threshArc: true, trialChapters: true }, // one-time save migrations already applied (new saves need none)
  };
}

// One-time migration for the Thresh arc insertion (pre-expansion ids 117–120, v3.9.3).
// Saved chapter/defeated values index into the EXPANDED chapter list, so the shift
// amount is the expanded length of the arc4mv-thresh range. Only valid after
// _expandStoryChaptersInPlace() has rebuilt STORY_ACT_STRUCTURE chapterRanges
// (window.__SMB_STORY_EXPANDED). Returns true if it mutated the save.
function _migrateStory2ThreshArc(p) {
  if (!p || typeof p !== 'object') return false;
  if (p.migrations && p.migrations.threshArc) return false;
  if (!window.__SMB_STORY_EXPANDED || typeof STORY_ACT_STRUCTURE === 'undefined') return false;
  let range = null;
  for (const act of STORY_ACT_STRUCTURE) {
    const arc = act.arcs && act.arcs.find(a => a.id === 'arc4mv-thresh');
    if (arc) { range = arc.chapterRange; break; }
  }
  if (!range) return false;
  const start = range[0], shift = range[1] - range[0] + 1;
  if (typeof p.chapter === 'number' && p.chapter >= start) p.chapter += shift;
  if (Array.isArray(p.defeated)) {
    p.defeated = p.defeated.map(d => (typeof d === 'number' && d >= start) ? d + shift : d);
  }
  if (!p.migrations || typeof p.migrations !== 'object') p.migrations = {};
  p.migrations.threshArc = true;
  return true;
}

// One-time migration for the two Trial chapters inserted into the multiverse arcs:
// the Trial of Sense at id 106 (Null Space, before the Null duel) and the Trial of
// Self-knowledge at id 117 (Fracture Coast, before the VAEL duel). Two separate
// insertion points, so this is a two-step shift and NOT expressible as the single
// contiguous-range shift _migrateStory2ThreshArc uses.
//
// Order matters: this must run AFTER _migrateStory2ThreshArc, because the
// thresholds below (106 / 116) are post-Thresh-arc ids. A save old enough to need
// both is brought into post-Thresh numbering first, then shifted again here.
//
// Trial chapters stay intact through expansion (origCh.trial takes the stay-intact
// branch), so each adds exactly one entry and the shift is +1 / +2 flat.
function _migrateStory2TrialChapters(p) {
  if (!p || typeof p !== 'object') return false;
  if (p.migrations && p.migrations.trialChapters) return false;
  // Unlike the Thresh migration this needs no expanded-structure lookup — the
  // insertion points are fixed and each contributes exactly one chapter.
  const shift = id => (id >= 116 ? id + 2 : (id >= 106 ? id + 1 : id));

  if (typeof p.chapter === 'number') p.chapter = shift(p.chapter);
  if (Array.isArray(p.defeated)) {
    p.defeated = p.defeated.map(d => (typeof d === 'number' ? shift(d) : d));
  }
  // lootTaken is keyed 'chapterId:index', so its chapter half shifts too or
  // one-time pickups silently re-arm (or stay taken) on the wrong chapters.
  if (p.lootTaken && typeof p.lootTaken === 'object') {
    const next = {};
    for (const k of Object.keys(p.lootTaken)) {
      const m = /^(\d+):(.*)$/.exec(k);
      next[m ? (shift(+m[1]) + ':' + m[2]) : k] = p.lootTaken[k];
    }
    p.lootTaken = next;
  }
  if (!p.migrations || typeof p.migrations !== 'object') p.migrations = {};
  p.migrations.trialChapters = true;
  return true;
}

function _normalizeStory2Progress(data) {
  const base = _defaultStory2Progress();
  if (!data || typeof data !== 'object') return base;
  const out = JSON.parse(JSON.stringify(base));
  if (typeof data.chapter === 'number') out.chapter = data.chapter;
  if (typeof data.tokens === 'number') out.tokens = data.tokens;
  if (typeof data.exp === 'number') out.exp = data.exp;
  if (typeof data.health === 'number') out.health = data.health;
  if (data.lootTaken && typeof data.lootTaken === 'object') out.lootTaken = Object.assign({}, data.lootTaken);
  if (data.cpResume && typeof data.cpResume.chId === 'number' && typeof data.cpResume.x === 'number') {
    out.cpResume = { chId: data.cpResume.chId, x: data.cpResume.x };
  }
  if (Array.isArray(data.blueprints)) out.blueprints = data.blueprints.slice();
  if (Array.isArray(data.unlockedAbilities)) out.unlockedAbilities = data.unlockedAbilities.slice();
  if (data.skillTree && typeof data.skillTree === 'object') out.skillTree = Object.assign({}, data.skillTree);
  // Air Dash was removed from the tree. Drop the stale node from old saves and
  // refund what it cost so the EXP isn't silently lost.
  if (out.skillTree && out.skillTree.airDash) {
    delete out.skillTree.airDash;
    out.exp = (out.exp || 0) + 120;
  }
  // Dodge Roll was removed from the tree along with the double-tap dash. It had
  // been a free core unlock on every save, so there is nothing to refund —
  // just drop the stale node.
  if (out.skillTree && out.skillTree.dodge) delete out.skillTree.dodge;
  _applyStoryCoreUnlocks(out.skillTree); // never locked, on old saves too
  if (data.weaponSkills && typeof data.weaponSkills === 'object') {
    out.weaponSkills = {};
    for (const wk of Object.keys(data.weaponSkills)) {
      if (data.weaponSkills[wk] && typeof data.weaponSkills[wk] === 'object') out.weaponSkills[wk] = Object.assign({}, data.weaponSkills[wk]);
    }
  }
  if (Array.isArray(data.defeated)) {
    // Dedupe + drop stale/out-of-range ids. Past chapter renumberings left
    // duplicate and beyond-range entries that inflated defeated.length (progress
    // read 373/184 · 203%; playerPowerLevel also keys off this length).
    const _maxCh = (typeof STORY_CHAPTERS2 !== 'undefined' && STORY_CHAPTERS2.length) ? STORY_CHAPTERS2.length : Infinity;
    const _seen = {};
    out.defeated = data.defeated.filter(function(i) {
      if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= _maxCh) return false;
      if (_seen[i]) return false;
      _seen[i] = 1;
      return true;
    });
  }
  if (typeof data.storyComplete === 'boolean') out.storyComplete = data.storyComplete;
  if (data.runState && typeof data.runState === 'object') out.runState = Object.assign({}, base.runState, data.runState);
  if (data.metaUpgrades && typeof data.metaUpgrades === 'object') out.metaUpgrades = Object.assign({}, base.metaUpgrades, data.metaUpgrades);
  if (data.arcCollapsed && typeof data.arcCollapsed === 'object') out.arcCollapsed = Object.assign({}, data.arcCollapsed);
  if (data.actExpanded && typeof data.actExpanded === 'object') out.actExpanded = Object.assign({}, data.actExpanded);
  if (data.meta && typeof data.meta === 'object') out.meta = Object.assign({}, data.meta);
  if (data.branchFlags && typeof data.branchFlags === 'object') out.branchFlags = Object.assign({}, data.branchFlags);
  if (typeof data.prologueSeen === 'boolean') out.prologueSeen = data.prologueSeen;
  if (typeof data.tuesdaySeen  === 'boolean') out.tuesdaySeen  = data.tuesdaySeen;
  if (typeof data.difficulty === 'string' && STORY_DIFFICULTIES[data.difficulty]) out.difficulty = data.difficulty;
  if (data.loadout && typeof data.loadout === 'object') {
    if (typeof data.loadout.weapon === 'string') out.loadout.weapon = data.loadout.weapon;
    if (typeof data.loadout.cls    === 'string') out.loadout.cls    = data.loadout.cls;
  }
  // Saves predating the migrations field have had no migrations applied — don't inherit the base defaults
  out.migrations = (data.migrations && typeof data.migrations === 'object') ? Object.assign({}, data.migrations) : {};
  return out;
}

function _story2UpdatedAt(data) {
  return data && data.meta && typeof data.meta.updatedAt === 'number' ? data.meta.updatedAt : 0;
}

function _story2Meaningful(data) {
  if (!data || typeof data !== 'object') return false;
  if ((typeof data.storyComplete === 'boolean' && data.storyComplete) ||
      (typeof data.tokens === 'number' && data.tokens > 0) ||
      (typeof data.exp === 'number' && data.exp > 0)) return true;
  if (Array.isArray(data.defeated) && data.defeated.length > 0) return true;
  if (Array.isArray(data.blueprints) && data.blueprints.length > 0) return true;
  if (Array.isArray(data.unlockedAbilities) && data.unlockedAbilities.length > 0) return true;
  // Core moves are granted to every save, so they are not evidence of progress.
  if (data.skillTree && Object.keys(data.skillTree).some(k => !STORY_CORE_UNLOCKS.includes(k))) return true;
  if (data.weaponSkills && Object.keys(data.weaponSkills).length > 0) return true;
  if (data.runState && ((typeof data.runState.healthPct === 'number' && data.runState.healthPct !== 1) ||
      (typeof data.runState.noDeathChain === 'number' && data.runState.noDeathChain > 0))) return true;
  if (data.metaUpgrades && ((data.metaUpgrades.damage || 0) > 0 || (data.metaUpgrades.survivability || 0) > 0 || (data.metaUpgrades.healUses || 0) > 0)) return true;
  return false;
}

function _pickInitialStory2(localStory, accountStory, accountTs) {
  const local = _normalizeStory2Progress(localStory);
  const cloud = _normalizeStory2Progress(accountStory);
  const localHas = _story2Meaningful(localStory);
  const cloudHas = _story2Meaningful(accountStory);

  if (cloudHas && !localHas) return cloud;
  if (localHas && !cloudHas) return local;
  if (cloudHas && localHas) {
    const localTs = _story2UpdatedAt(localStory);
    const cloudTs = Math.max(_story2UpdatedAt(accountStory), accountTs || 0);
    if (cloudTs > localTs) return cloud;
    if (localTs > cloudTs) return local;

    const localScore = (Array.isArray(local.defeated) ? local.defeated.length : 0)
      + (Array.isArray(local.blueprints) ? local.blueprints.length : 0)
      + (Array.isArray(local.unlockedAbilities) ? local.unlockedAbilities.length : 0)
      + (local.tokens || 0)
      + (local.exp || 0);
    const cloudScore = (Array.isArray(cloud.defeated) ? cloud.defeated.length : 0)
      + (Array.isArray(cloud.blueprints) ? cloud.blueprints.length : 0)
      + (Array.isArray(cloud.unlockedAbilities) ? cloud.unlockedAbilities.length : 0)
      + (cloud.tokens || 0)
      + (cloud.exp || 0);
    return cloudScore >= localScore ? cloud : local;
  }
  return localHas ? local : (cloudHas ? cloud : local);
}

let _story2 = (function() {
  try {
    const canonical = (typeof _readCanonicalSave === 'function') ? _readCanonicalSave() : null;
    const acct = (window.GameState && typeof GameState.getActiveAccount === 'function') ? GameState.getActiveAccount() : null;
    const accountStory = canonical && canonical.story ? canonical.story : (acct && acct.data && acct.data.story ? acct.data.story : null);
    const accountTs = acct && acct.data && acct.data.meta && typeof acct.data.meta.updatedAt === 'number' ? acct.data.meta.updatedAt : 0;
    const chosen = _pickInitialStory2(null, accountStory, accountTs);
    return chosen || _defaultStory2Progress();
  } catch(e) { return _defaultStory2Progress(); }
})();

try { _saveStory2(); } catch(e) {}
window.__SMB_CAN_FLUSH_SAVE = true;

if (window.SupabaseBridge && typeof SupabaseBridge.reconcileActiveSave === 'function') {
  setTimeout(function() {
    if (typeof SupabaseBridge.isRuntimeReady === 'function' && !SupabaseBridge.isRuntimeReady()) return;
    SupabaseBridge.reconcileActiveSave().catch(function(e) {
      console.warn('[story-config] Deferred cloud reconcile failed:', e);
    });
  }, 0);
}

function _saveStory2() {
  try {
    if (!_story2.meta || typeof _story2.meta !== 'object') _story2.meta = {};
    _story2.meta.updatedAt = (typeof window.__SMB_PENDING_SAVE_TIMESTAMP === 'number' && window.__SMB_PENDING_SAVE_TIMESTAMP > 0)
      ? window.__SMB_PENDING_SAVE_TIMESTAMP
      : Date.now();
    _story2.meta.source = 'local';
    if (window.__SMB_CAN_FLUSH_SAVE && typeof saveGame === 'function') {
      saveGame();
    }
  } catch(e) {}
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

  // ── Saga builds ───────────────────────────────────────────────────────────
  // The active saga's opening arc is always unlocked too. Its predecessor lives
  // in the PREVIOUS saga and can never be cleared in this build, so without this
  // a saga build has no reachable first chapter at all. No-ops on 'full'.
  if (typeof sagaFirstArc === 'function' && !sagaIsFullBuild()) {
    const sFirst = sagaFirstArc();
    if (sFirst && arc.id === sFirst.id) return true;
  }

  // Fallen God arc unlocks directly from Act V completion (not multiverse).
  // This ensures the revelation lore fires before the Creator domain,
  // removing the postgame/multiverse-completion dependency.
  if (arc.id === 'arc5-godfall') {
    const actV = STORY_ACT_STRUCTURE.find(a => a.id === 'act5');
    if (actV) return _isArcComplete(actV.arcs[actV.arcs.length - 1]);
    return false;
  }

  // Multiverse arcs (arc4mv-*) additionally require the Axiom Ship to be built.
  // The trials were designed for a traveler with a stable vessel — not before.
  if (arc.id && arc.id.startsWith('arc4mv')) {
    // Every ship part is awarded by saga1 chapters (first hull at ch. 5). On a
    // build that does not contain them the ship can never be built, which would
    // lock the multiverse arcs forever — so the gate only applies when those
    // chapters are actually reachable in this build.
    const _shipReachable = (typeof isChapterInActiveSaga !== 'function')
                        || isChapterInActiveSaga(5);
    if (_shipReachable && (!window.SHIP || !SHIP.built)) return false;
  }

  // An arc is unlocked if all chapters in the previous arc are complete
  // An arc is unlocked if all chapters in the previous arc are complete. A
  // predecessor outside the active saga is unreachable in this build, so it
  // gates nothing — treat it as satisfied.
  const _prevOk = (prevArc) => {
    if (typeof sagaArcInActive === 'function' && !sagaArcInActive(prevArc)) return true;
    return _isArcComplete(prevArc);
  };
  for (let ai = 0; ai < STORY_ACT_STRUCTURE.length; ai++) {
    const act = STORY_ACT_STRUCTURE[ai];
    for (let ri = 0; ri < act.arcs.length; ri++) {
      if (act.arcs[ri].id === arc.id) {
        // get previous arc
        if (ri > 0) return _prevOk(act.arcs[ri - 1]);
        if (ai > 0) {
          const prevAct = STORY_ACT_STRUCTURE[ai - 1];
          return _prevOk(prevAct.arcs[prevAct.arcs.length - 1]);
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

// berserker_blood2 kill stacks: handled inside storyOnEnemyDeath in
// smb-story-engine-frame.js. The wrapper that used to live here was dead code —
// engine-frame.js loads later and its function declaration overwrote this one.

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
    setTimeout(() => { if (typeof openStoryMenuShop === 'function') openStoryMenuShop(); }, 320);
  };
}

// ── Death spirit ─────────────────────────────────────────────────────────────
// On a story game over a spirit tells the player what happened: who landed the
// last blow, with what, and how to answer it next time — plus where to go if
// the fight was simply ahead of them (the skill tree, or coming back later).
// Built from the attribution stamp dealDamage() leaves on every hit
// (_lastAttacker / _lastAttackerFrame / _lastAttackerDmg).
const _SPIRIT_WEAPON_TIPS = [
  [['sword', 'katana', 'glassblade', 'nullblade', 'voidblade'],
    'That blade is quick. Don’t trade hits with it. Shield the first swing, then strike before the next string starts.'],
  [['hammer', 'anchor', 'fryingpan'],
    'Heavy and slow. Bait the swing from just outside its reach, then hit it during the long recovery.'],
  [['axe', 'flail'],
    'Wide arcs with a real wind-up. Stay just past its reach and step in after it swings.'],
  [['spear', 'broomstick', 'whip', 'scythe'],
    'Long reach, weak up close. Get inside the tip and stay there.'],
  [['combat', 'gauntlet', 'mkgauntlet', 'fragment'],
    'Fast close-range strings. Don’t stand in front of it. Make it come to you and hit it on the way in.'],
  [['shield'],
    'It blocks what is in front of it. Go over it or behind it before you swing.'],
  [['flamethrower'],
    'A short cone of fire. Don’t stand in it. Jump over it and strike from behind.'],
  [['boomerang'],
    'It comes back. Step aside after it passes, not before.'],
  [['bomb'],
    'Explosives on a delay. Keep moving and never stand where one lands.'],
];
function _spiritWeaponTip(wk) {
  for (const [keys, tip] of _SPIRIT_WEAPON_TIPS) if (keys.includes(wk)) return tip;
  const w = (typeof WEAPONS !== 'undefined') ? WEAPONS[wk] : null;
  if (w && w.type === 'ranged') {
    return 'It wins at range. Close the distance in jumps, not a straight walk, and push while it reloads.';
  }
  return 'Watch its swing once before you commit. Every weapon has a gap after it attacks.';
}
function _spiritEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
// Unspent EXP that could buy a skill node right now.
function _spiritAffordableSkills() {
  if (typeof STORY_SKILL_TREE === 'undefined' || !_story2) return 0;
  const sk = _story2.skillTree || {}, exp = _story2.exp || 0;
  let n = 0;
  for (const branch of Object.values(STORY_SKILL_TREE)) {
    for (const node of branch.nodes) {
      if (sk[node.id] || exp < node.expCost) continue;
      if (typeof _skillNodeReqMet === 'function' && !_skillNodeReqMet(node, sk)) continue;
      n++;
    }
  }
  return n;
}
function _storyBuildDeathReport(ch) {
  const p1 = (typeof players !== 'undefined' && players) ? players.find(p => p && !p.isAI && !p.isBoss) : null;
  const rep = { cause: 'world', killer: null, lines: [], action: null };
  const k = p1 && p1._lastAttacker;
  const recent = k && typeof frameCount !== 'undefined' && frameCount - (p1._lastAttackerFrame || 0) < 360;
  if (ch && ch.chaseTimer > 0 && typeof storyChaseTimer !== 'undefined' && storyChaseTimer <= 0) {
    rep.cause = 'timer';
    rep.lines.push('The route collapsed around you. The clock ran out, not your strength.');
    rep.lines.push('Keep moving forward. Fight only what stands in your way.');
    return rep;
  }
  if (!recent) {
    rep.lines.push('Nothing struck that last blow. The world took you: a fall, or the ground itself.');
    rep.lines.push('Watch your footing near edges and hazards. They take lives too.');
    return rep;
  }
  rep.cause = 'foe';
  const wk = k.weaponKey || (k.weapon && k.weapon.key) || '';
  const wName = (typeof WEAPONS !== 'undefined' && WEAPONS[wk] && WEAPONS[wk].name) || (wk ? wk : 'bare hands');
  const cName = (k.charClass && k.charClass !== 'none' && typeof CLASSES !== 'undefined' && CLASSES[k.charClass] && CLASSES[k.charClass].name) || null;
  const who = k.name || (k.isBoss ? 'the boss' : 'an enemy');
  rep.killer = { name: who, weapon: wName, cls: cName };
  rep.lines.push(`<b>${_spiritEsc(who)}</b>${cName ? ` (${_spiritEsc(cName)})` : ''} ended you with ${_spiritEsc(/^[aeiou]/i.test(wName) ? 'an' : 'a')} <b>${_spiritEsc(wName)}</b>` +
    (p1._lastAttackerDmg ? `. The last blow did ${Math.round(p1._lastAttackerDmg)} damage.` : '.'));
  rep.lines.push(_spiritWeaponTip(wk));
  const afford = _spiritAffordableSkills();
  if (k.isChestGuardian) {
    rep.lines.push('That one guarded a hidden cache. The fight was optional, and the cache will wait. Come back when you are stronger.');
    rep.action = afford ? 'skills' : null;
  } else if (k.isBoss || k._storyElite) {
    rep.lines.push(k.isBoss
      ? 'Bosses chain their attacks. Learn the tell, and don’t hang in the air, where you can’t shield.'
      : 'That was an elite, tougher than the rest by design.');
  }
  if (afford) {
    rep.lines.push(`You have ${_story2.exp} EXP unspent. ${afford} upgrade${afford > 1 ? 's' : ''} in the skill tree ${afford > 1 ? 'are' : 'is'} yours to take right now.`);
    rep.action = 'skills';
  } else if (k.isChestGuardian || k.isBoss || k._storyElite) {
    rep.lines.push('Cleared levels pay tokens and EXP. Replay an earlier one and return stronger.');
  }
  return rep;
}
function _spiritPanelHTML(rep) {
  return `
    <div class="story-spirit">
      <svg class="story-spirit-fig" viewBox="0 0 40 64" aria-hidden="true">
        <circle cx="20" cy="10" r="7"/>
        <path d="M20 17 L20 40 M20 23 L9 33 M20 23 L31 31 M20 40 L12 56 M20 40 L27 55"/>
      </svg>
      <div class="story-spirit-body">
        <div class="story-spirit-kicker">A spirit lingers where you fell</div>
        ${rep.lines.map(l => `<p>${l}</p>`).join('')}
      </div>
    </div>`;
}

// ── Story retry screen ────────────────────────────────────────────────────────
function _showStory2RetryScreen(ch) {
  // Read the death NOW: the fighters still exist; by the next frame they may not.
  const _death = _storyBuildDeathReport(ch);
  const _canResume = !!(_story2.cpResume && _story2.cpResume.chId === ch.id && !storyPhaseIndicator);
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

    retryDiv.innerHTML = _spiritPanelHTML(_death) + `
      <div style="font-size:0.72rem;letter-spacing:1px;color:#667;text-transform:uppercase;margin-bottom:4px;">${storyPhaseIndicator ? 'Phase Failed' : 'Chapter'}</div>
      <div style="font-size:1.05rem;font-weight:700;color:#dde4ff;margin-bottom:10px;">${ch.title}</div>
      ${storyPhaseIndicator ? `<div style="font-size:0.74rem;color:#8cc8ff;margin-bottom:10px;">PHASE ${storyPhaseIndicator.index}/${storyPhaseIndicator.total} — ${storyPhaseIndicator.label}</div>` : ''}
      ${affordable.length > 0 ? `
        <div style="font-size:0.74rem;color:#ffcc66;margin-bottom:10px;">
          💡 ${affordable.length} upgrade${affordable.length > 1 ? 's' : ''} affordable (${_story2.tokens} 🪙)
        </div>
      ` : ''}
      <div style="display:flex;flex-direction:column;gap:7px;max-width:240px;margin:0 auto;">
        ${_canResume ? `
          <button id="_retryCheckpointBtn" style="padding:10px 0;background:linear-gradient(135deg,#b8741a,#e39a2c);border:none;border-radius:9px;color:#fff;font-weight:700;font-size:0.88rem;cursor:pointer;width:100%;">
            🔥 Retry from Checkpoint
          </button>
        ` : ''}
        <button id="_retryChapterBtn" style="padding:10px 0;background:${_canResume ? 'rgba(40,80,180,0.55)' : 'linear-gradient(135deg,#1a5acc,#2277ee)'};border:none;border-radius:9px;color:#fff;font-weight:700;font-size:0.88rem;cursor:pointer;width:100%;">
          ↺ ${_canResume ? 'Restart' : 'Retry'} ${storyPhaseIndicator ? 'Phase' : 'Chapter'}
        </button>
        ${_death.action === 'skills' ? `
          <button id="_retrySkillsBtn" style="padding:10px 0;background:linear-gradient(135deg,#1f7a44,#2fa05c);border:none;border-radius:9px;color:#fff;font-weight:700;font-size:0.88rem;cursor:pointer;width:100%;">
            🌟 Open Skill Tree
          </button>
        ` : ''}
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
    // endGame titles a story loss "DRAW!" when no enemy is left standing to win.
    const _wt = document.getElementById('winnerText');
    if (_wt) { _wt.textContent = 'YOU FELL'; _wt.style.color = '#ff6a6a'; }
    ov.querySelector('.overlay-box')?.appendChild(retryDiv);

    retryDiv.querySelector('#_retryChapterBtn').onclick = () => {
      ov.style.display = 'none';
      if (btnRow) btnRow.style.display = '';
      storyModeActive = false;
      if (typeof backToMenu === 'function') backToMenu();
      setTimeout(() => _beginChapter2(ch.id), 350);
    };

    const cpBtn = retryDiv.querySelector('#_retryCheckpointBtn');
    if (cpBtn) cpBtn.onclick = () => {
      ov.style.display = 'none';
      if (btnRow) btnRow.style.display = '';
      storyModeActive = false;
      if (typeof backToMenu === 'function') backToMenu();
      // Consumed by _launchExplorationChapter for this chapter only
      window._storyResumeCpFor = ch.id;
      setTimeout(() => _beginChapter2(ch.id), 350);
    };

    const skBtn = retryDiv.querySelector('#_retrySkillsBtn');
    if (skBtn) skBtn.onclick = () => {
      ov.style.display = 'none';
      if (btnRow) btnRow.style.display = '';
      storyModeActive = false;
      if (typeof backToMenu === 'function') backToMenu();
      setTimeout(() => { if (typeof openSkillTreeModal === 'function') openSkillTreeModal(); }, 340);
    };

    const storeBtn = retryDiv.querySelector('#_retryStoreBtn');
    if (storeBtn) storeBtn.onclick = () => {
      ov.style.display = 'none';
      if (btnRow) btnRow.style.display = '';
      storyModeActive = false;
      if (typeof backToMenu === 'function') backToMenu();
      setTimeout(() => { if (typeof openStoryMenuShop === 'function') openStoryMenuShop(); }, 340);
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
  if (id < 122) return 'war';    // +2: the two trial chapters (106, 117)
  if (id < 182) return 'mirror'; // +2: same
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

const _NEW_CHAPTER_TYPES = new Set(['stealth','escape','defense','scavenge','puzzle','assassination','gauntlet','ship_flight','escort','battleroyale']);

function _promotePassiveStoryChapters() {
  for (const ch of STORY_CHAPTERS2) {
    if (!ch || !ch.noFight || ch.isEpilogue || ch.isCinematicBridge) continue;
    // Skip chapters that already have a designated new interactive type
    if (_NEW_CHAPTER_TYPES.has(ch.type) || _NEW_CHAPTER_TYPES.has(ch.exploreMode)) continue;

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
    desc: 'After a double jump, gain 0.4s of invincibility frames. 8s cooldown.',
    icon: '👁️', tokenCost: 110, requiresBlueprint: true,
    lore: 'A half-step between dimensions. The Herald showed you — then let you earn it.',
  },
  berserker_blood2: {
    name: 'Fragment Hunger',
    desc: 'Each kill charges your fragment: +8% damage stacked (max 5 kills, resets on death).',
    icon: '🩸', tokenCost: 130, requiresBlueprint: true,
    lore: 'The fragment was always absorbing. You learned to direct it.',
  },
  // (Impact Shield, Dimensional Patch, Fracture Surge, Void Step migrated to Skill Tree)
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
