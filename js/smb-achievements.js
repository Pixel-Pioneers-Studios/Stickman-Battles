'use strict';

// ============================================================
// ACHIEVEMENT SYSTEM
// ============================================================
// `icon` names a glyph in SMB_ICONS (smb-icons.js); achBadgeSVG() frames it in
// a hex badge coloured by `tier` (bronze → silver → gold → mythic).
// `desc` states the exact unlock condition — keep it in step with the
// unlockAchievement() call site. `hint` is the how-to shown while locked.
// `secret` hides title and desc until earned (spoilers); the hint still shows.
const ACHIEVEMENT_CATEGORIES = [
  { id: 'fight',  title: 'Fighting' },
  { id: 'modes',  title: 'Modes' },
  { id: 'br',     title: 'Battle Royale' },
  { id: 'bosses', title: 'Bosses' },
  { id: 'story',  title: 'Story & Worlds' },
  { id: 'complete', title: 'Completion' },
];

const ACHIEVEMENTS = [
  // Fighting
  { id: 'first_blood',         cat: 'fight', tier: 'bronze', icon: 'drop',          title: 'First Blood',          desc: 'Beat a Hard bot',                                   hint: 'Set the opposing bot to Hard in the fighter setup, then win the match' },
  { id: 'hat_trick',           cat: 'fight', tier: 'silver', icon: 'chevrons',      title: 'Hat Trick',            desc: 'Win 3 matches in a row',                            hint: 'Any loss resets the streak' },
  { id: 'survivor',            cat: 'fight', tier: 'silver', icon: 'heartcrack',    title: 'Survivor',             desc: 'Win a match with 10 HP or less left',               hint: 'Hang on. It counts as long as you finish the match standing' },
  { id: 'untouchable',         cat: 'fight', tier: 'gold',   icon: 'shield',        title: 'Untouchable',          desc: 'Win a match without taking any damage',             hint: 'Blocked hits don\'t count against you, so shield freely' },
  { id: 'combo_king',          cat: 'fight', tier: 'bronze', icon: 'fist',          title: 'Combo King',           desc: 'Land 5 hits in a row without getting hit',          hint: 'Getting hit resets the count. Whiffs don\'t' },
  { id: 'speedrun',            cat: 'fight', tier: 'silver', icon: 'stopwatch',     title: 'Speedster',            desc: 'Win a match in under 30 seconds',                   hint: 'Fewer lives and a heavy weapon make this much easier' },
  { id: 'perfectionist',       cat: 'fight', tier: 'silver', icon: 'star',          title: 'Perfectionist',        desc: 'Win 10 matches',                                    hint: 'Wins against bots and players both count' },
  { id: 'legend',              cat: 'fight', tier: 'gold',   icon: 'crown',         title: 'Legend',               desc: 'Win 50 matches',                                    hint: 'Wins against bots and players both count' },
  { id: 'class_collector',     cat: 'fight', tier: 'silver', icon: 'users',         title: 'Class Collector',      desc: 'Win as 5 different classes in one session',         hint: 'Change your class between matches. Closing the game resets the count' },
  { id: 'clash_master',        cat: 'fight', tier: 'bronze', icon: 'crossedswords', title: 'Clash Master',         desc: 'Clash weapons with an opponent mid-swing',          hint: 'Swing into their swing. The blades spark when they meet' },
  { id: 'super_saver',         cat: 'fight', tier: 'bronze', icon: 'bolt',          title: 'Super Saver',          desc: 'Use your super 10 times in one match',              hint: 'Supers charge as you deal and take damage, so stay aggressive' },
  { id: 'first_finisher',      cat: 'fight', tier: 'bronze', icon: 'burst',         title: 'Finishing Touch',      desc: 'Perform a Finisher',                                hint: 'Land the final KO with Finishers turned on' },
  { id: 'finisher_master',     cat: 'fight', tier: 'silver', icon: 'film',          title: 'Finisher Master',      desc: 'Perform 10 Finishers in one session',               hint: 'Finishers count across matches until you close the game' },
  { id: 'gunslinger',          cat: 'fight', tier: 'silver', icon: 'gun',           title: 'Gunslinger',           desc: 'Deal 500 ranged damage in a match you win',         hint: 'Any ranged weapon counts: Gun, Bow, Crossbow and the rest' },
  { id: 'hammer_time',         cat: 'fight', tier: 'bronze', icon: 'hammer',        title: 'Hammer Time',          desc: 'Win a match with the Hammer',                       hint: 'Pick the Hammer as your weapon and win' },
  // Modes
  { id: 'wave_5',              cat: 'modes', tier: 'bronze', icon: 'wave',          title: 'Wave Warrior',         desc: 'Reach wave 5 in Survival',                          hint: 'Start Survival from the Minigames menu' },
  { id: 'wave_10',             cat: 'modes', tier: 'silver', icon: 'wave',          title: 'Wave Master',          desc: 'Reach wave 10 in Survival',                         hint: 'Enemies hit harder every wave until wave 8' },
  { id: 'survival_win',        cat: 'modes', tier: 'gold',   icon: 'trophy',        title: 'Extinction Event',     desc: 'Clear every wave of a Survival run',                hint: 'Set a wave goal (not Infinite) and clear the last wave' },
  { id: 'koth_win',            cat: 'modes', tier: 'bronze', icon: 'flag',          title: 'King of the Hill',     desc: 'Win a King of the Hill match',                      hint: 'Hold the zone longer than anyone else' },
  { id: 'chaos_survivor',      cat: 'modes', tier: 'silver', icon: 'spiral',        title: 'Chaos Agent',          desc: 'Survive a Survival wave with 3 chaos modifiers',   hint: 'From wave 7 on, every Survival wave rolls 3 chaos modifiers' },
  { id: 'chaos_all',           cat: 'modes', tier: 'gold',   icon: 'flame',         title: 'Pure Chaos',           desc: 'Have every chaos modifier active at once',           hint: 'Chaos Match adds a new modifier every 15 seconds. Last long enough' },
  { id: 'nexus_defender',      cat: 'modes', tier: 'silver', icon: 'diamond',       title: 'Nexus Defender',       desc: 'Clear 5 waves in Nexus Defense',                    hint: 'Keep attackers off the Nexus while you clear each wave' },
  { id: 'online_winner',       cat: 'modes', tier: 'silver', icon: 'globe',         title: 'Connected',            desc: 'Win an online match',                               hint: 'Beat a real player in online play' },
  // Battle Royale
  { id: 'br_victory',          cat: 'br',    tier: 'gold',   icon: 'medal',         title: 'Last One Standing',    desc: 'Win a Battle Royale',                               hint: 'Outlast all 99 other fighters in one match' },
  { id: 'br_kills_10',         cat: 'br',    tier: 'bronze', icon: 'target',        title: 'Ten Down',             desc: 'Get 10 eliminations in one Battle Royale',          hint: 'Only final blows count' },
  { id: 'br_kills_25',         cat: 'br',    tier: 'silver', icon: 'crosshair',     title: 'Rampage',              desc: 'Get 25 eliminations in one Battle Royale',          hint: 'A quarter of the field, in one match' },
  { id: 'br_kills_50',         cat: 'br',    tier: 'gold',   icon: 'skull',         title: 'Half the Field',       desc: 'Get 50 eliminations in one Battle Royale',          hint: 'Half the field. One match. Yes, really' },
  { id: 'br_cartographer',     cat: 'br',    tier: 'silver', icon: 'compass',       title: 'Cartographer',         desc: 'Visit every zone in one Battle Royale',             hint: 'All fifteen zones, including Cloud Kingdom and Volcano Depths, which you can only reach through rifts' },
  { id: 'br_scavenger',        cat: 'br',    tier: 'bronze', icon: 'crate',         title: 'Scavenger',            desc: 'Open 20 crates in one Battle Royale',               hint: 'You have to break the crates yourself' },
  // Bosses
  { id: 'boss_slayer',         cat: 'bosses', tier: 'gold',   icon: 'horns',        title: 'Boss Slayer',          desc: 'Defeat the Creator',                                hint: 'Beat the Creator in Story Mode, or rematch him from The Simulator under Refights' },
  { id: 'true_form',           cat: 'bosses', tier: 'mythic', icon: 'crescent',     title: 'Cosmic Axiom',            desc: 'Defeat Cosmic Axiom',                              hint: 'Beat the Creator, then collect the 8 hidden letters (supers reveal them in the arenas) to unlock the fight' },
  { id: 'yeti_hunter',         cat: 'bosses', tier: 'silver', icon: 'snowflake',    title: 'Yeti Hunter',          desc: 'Defeat the Yeti',                                   hint: 'It roams the Ice arena. Fight there until it shows up' },
  { id: 'beast_tamer',         cat: 'bosses', tier: 'silver', icon: 'claw',         title: 'Beast Tamer',          desc: 'Defeat the Forest Beast',                           hint: 'It roams the Forest arena. Fight there until it shows up' },
  { id: 'sovereign_slayer',    cat: 'bosses', tier: 'gold',   icon: 'omega',        title: 'Sovereign Slayer',     desc: 'Defeat Sovereign Ω',                           hint: 'Beat Sovereign in Adaptive mode. He learns how you play, so keep changing it up' },
  { id: 'god_slayer',          cat: 'bosses', tier: 'mythic', icon: 'halo',         title: 'God Slayer',           desc: 'Defeat God',                                        hint: 'Some fights aren\'t on any menu', secret: true },
  { id: 'absolute_axiom_slayer', cat: 'bosses', tier: 'mythic', icon: 'eye',        title: 'Beyond Godhood',       desc: 'Defeat Absolute Axiom',                             hint: 'A secret boss. You\'ll know it when you see it', secret: true },
  // Story & Worlds
  { id: 'tutorial_done',       cat: 'story', tier: 'bronze', icon: 'cap',           title: 'First Steps',          desc: 'Complete the tutorial',                             hint: 'Start the Tutorial from the home screen' },
  { id: 'story_begin',         cat: 'story', tier: 'bronze', icon: 'bookopen',      title: 'The Journey Begins',   desc: 'Clear your first Story chapter',                    hint: 'Win any chapter in Story Mode' },
  // Per-saga completion. On a 'full' build all three are reachable in one run;
  // a saga build awards only its own. See docs/SAGA_SPLIT_PLAN.md.
  { id: 'saga1_complete',      cat: 'story', tier: 'silver', icon: 'fragment',      title: 'Not the Ninety-Fifth', desc: 'Finish The Fragment',                               hint: 'Clear every chapter of the first saga' },
  { id: 'saga2_complete',      cat: 'story', tier: 'gold',   icon: 'orbit',         title: 'The Man Who Built It', desc: 'Finish The Multiverse War',                         hint: 'Clear every chapter of the second saga', secret: true },
  { id: 'saga3_complete',      cat: 'story', tier: 'mythic', icon: 'infinity',      title: 'What Cannot Be Erased', desc: 'Finish The Substrate',                             hint: 'Clear every chapter of the third saga', secret: true },
  { id: 'story_complete',      cat: 'story', tier: 'gold',   icon: 'book',          title: 'End of the Line',      desc: 'Finish Story Mode',                                 hint: 'Reach and win the final chapter' },
  { id: 'lab_infiltrator',     cat: 'story', tier: 'silver', icon: 'flask',         title: 'Lab Infiltrator',      desc: 'Complete the Laboratory Infiltration',              hint: 'A side mission. Look for it off the main Story path' },
  { id: 'multiverse_warrior',  cat: 'story', tier: 'silver', icon: 'planet',        title: 'Multiverse Warrior',   desc: 'Conquer a Multiverse world',                        hint: 'Defeat the champion of any world in Multiverse mode' },
  { id: 'multiverse_master',   cat: 'story', tier: 'gold',   icon: 'map',           title: 'Dimension Breaker',    desc: 'Conquer every Multiverse world',                    hint: 'Clear all four worlds in Multiverse mode' },
  { id: 'fracture_explorer',   cat: 'story', tier: 'bronze', icon: 'portal',        title: 'Fracture Explorer',    desc: 'Enter a Fracture',                                  hint: 'Find an unlocked Fracture portal and step through' },
  { id: 'ship_builder',        cat: 'story', tier: 'gold',   icon: 'rocket',        title: 'Axiom Ship Complete',  desc: 'Build the Axiom Ship',                              hint: 'Collect every part: 5 Hull plates, the Engine, the Core and the Crystal' },
  { id: 'branch_conqueror',    cat: 'story', tier: 'gold',   icon: 'branches',      title: 'Branch Conqueror',     desc: 'Clear all three Fracture branches',                 hint: 'Build the ship, then defeat Vael, Kael and Sora in their own branches' },
  // Completion — checked by checkCompletionAchievements() below
  { id: 'story_100',           cat: 'complete', tier: 'mythic', icon: 'star',     title: 'Every Stone Turned',   desc: 'Earn a star on every Story level',                  hint: 'A level\'s star needs it cleared and every hidden cache in it opened. Look for dark shafts in the ground' },
  { id: 'game_100',            cat: 'complete', tier: 'mythic', icon: 'crown',    title: 'The Whole Evolution',  desc: 'Star every Story level, own every skin and weapon theme, and earn every other achievement', hint: 'Everything. Every level, every cache, every cosmetic, every achievement' },
];

// ── 100% completion ──────────────────────────────────────────────────────────
// story_100: a star on every Story level in this build (storyStarTally, in the
// story explore engine — cleared + every hidden cache opened).
// game_100: story_100 + every cosmetic in COSMETIC_CATALOG + every other
// achievement. On a single-saga build the other sagas' completion awards can't
// be earned, so they are not required.
// Called on chest open, chapter clear, cosmetic unlock, any achievement unlock
// and when the level select renders (retroactive for existing saves).
let _completionChecking = false;
function _completionRequiredAchievements() {
  const full = typeof sagaIsFullBuild !== 'function' || sagaIsFullBuild();
  const active = (typeof ACTIVE_SAGA !== 'undefined') ? ACTIVE_SAGA : 'full';
  return ACHIEVEMENTS.filter(a => {
    if (a.id === 'game_100') return false;
    const m = /^(saga\d+)_complete$/.exec(a.id);
    if (m && !full && m[1] !== active) return false;
    return true;
  });
}
function checkCompletionAchievements() {
  if (_completionChecking) return;
  _completionChecking = true;
  try {
    if (!earnedAchievements.has('story_100') && typeof storyStarTally === 'function') {
      const t = storyStarTally();
      if (t.total > 0 && t.stars >= t.total) unlockAchievement('story_100');
    }
    if (!earnedAchievements.has('game_100') && earnedAchievements.has('story_100')) {
      const cosmetics = (typeof COSMETIC_CATALOG === 'undefined' || typeof isCosmeticUnlocked !== 'function') ||
        COSMETIC_CATALOG.every(c => isCosmeticUnlocked(c.id));
      if (cosmetics && _completionRequiredAchievements().every(a => earnedAchievements.has(a.id))) {
        unlockAchievement('game_100');
      }
    }
  } finally {
    _completionChecking = false;
  }
}

// Hydrated by _refreshRuntimeFromSave(); never read directly from localStorage
let earnedAchievements = new Set();
let achievementQueue   = []; // pending popup animations
let achievementTimer   = 0;  // frames remaining for current popup

// Per-session stats for achievements
let _achStats = { damageTaken: 0, rangedDmg: 0, consecutiveHits: 0, superCount: 0,
                  winStreak: 0, totalWins: 0, matchStartTime: 0,
                  botKills: 0, pvpDamageDealt: 0, pvpDamageReceived: 0,
                  finisherCount: 0, classWins: null };

// ── Badge art ────────────────────────────────────────────────
// rim = bevel gradient top/bottom, bg = inner plate, glyph = icon colour
const ACH_TIERS = {
  bronze: { label: 'Bronze', rim: ['#f0b684', '#8a4f26'], bg: '#24160d', glyph: '#f3bd8c' },
  silver: { label: 'Silver', rim: ['#eef3fb', '#6b7688'], bg: '#171c27', glyph: '#e2e9f4' },
  gold:   { label: 'Gold',   rim: ['#ffe79a', '#a8741a'], bg: '#231b0b', glyph: '#ffd766' },
  mythic: { label: 'Mythic', rim: ['#dcc8ff', '#5b33b8'], bg: '#170f2b', glyph: '#cdb5ff' },
  locked: { label: 'Locked', rim: ['#4a5264', '#262b36'], bg: '#10131a', glyph: '#586173' },
};

// Self-contained SVG string (explicit colours, xmlns) so the same markup works
// inline in the modal and as a data-URL image for the in-game canvas popup.
function achBadgeSVG(a, earned) {
  const key = earned ? (a.tier || 'bronze') : 'locked';
  const t = ACH_TIERS[key] || ACH_TIERS.bronze;
  const glyphName = (!earned && a.secret) ? 'lock' : a.icon;
  const glyph = (typeof SMB_ICONS !== 'undefined' && (SMB_ICONS[glyphName] || SMB_ICONS.unknown)) || '';
  const gid = 'achRim-' + key;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="ach-badge ach-tier-${key}" aria-hidden="true">` +
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.rim[0]}"/><stop offset="1" stop-color="${t.rim[1]}"/></linearGradient></defs>` +
    `<path d="M24 1.5 43.5 12.75v22.5L24 46.5 4.5 35.25v-22.5Z" fill="url(#${gid})"/>` +
    `<path d="M24 5.4 40.1 14.7v18.6L24 42.6 7.9 33.3V14.7Z" fill="${t.bg}"/>` +
    `<path d="M24 5.4 40.1 14.7 24 24 7.9 14.7Z" fill="#fff" opacity="${earned ? 0.06 : 0.02}"/>` +
    `<svg x="10" y="10" width="28" height="28" viewBox="0 0 24 24" color="${t.glyph}" fill="currentColor" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg>` +
    `</svg>`;
}

// Canvas popups can't take markup, so each earned badge is rasterised once.
const _achBadgeImgs = {};
function _achBadgeImage(a) {
  if (_achBadgeImgs[a.id]) return _achBadgeImgs[a.id];
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(achBadgeSVG(a, true));
  _achBadgeImgs[a.id] = img;
  return img;
}

function unlockAchievement(id) {
  if (earnedAchievements.has(id)) return;
  const def = ACHIEVEMENTS.find(a => a.id === id);
  if (!def) return;
  if (typeof addAchievement === 'function') {
    addAchievement(id);
  } else {
    earnedAchievements.add(id);
  }
  // Persist via debounced queue (addAchievement calls queueGameStateSave)
  if (typeof addAchievement !== 'function' && typeof saveGame === 'function') saveGame();
  // Online: sync achievements between players
  if (onlineMode && NetworkManager.connected) {
    NetworkManager.sendGameEvent('achievementUnlocked', { id });
  }
  _achBadgeImage(def); // start decoding now so the canvas popup has it on frame 1
  achievementQueue.push({ ...def, frame: 0 });
  SoundManager.phaseUp();
  // This may have been the last one game_100 was waiting on
  if (id !== 'game_100') checkCompletionAchievements();
  if (typeof _achUpdateNavCount === 'function') _achUpdateNavCount();
  // HTML bottom-right notification
  const existing = document.getElementById('achNotif');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'achNotif';
  el.className = 'ach-notif ach-notif-' + (def.tier || 'bronze');
  el.innerHTML = `<div class="ach-notif-badge">${achBadgeSVG(def, true)}</div><div><div class="ach-notif-kicker">Achievement unlocked</div><div class="ach-notif-title">${def.title}</div><div class="ach-notif-desc">${def.desc}</div></div>`;
  el.addEventListener('click', () => {
    el.remove();
    showAchievementsModal(def.id);
  });
  document.body.appendChild(el);
  const _autoFade = setTimeout(() => { el.style.transition='opacity 0.5s'; el.style.opacity='0'; setTimeout(() => el.remove(), 500); }, 3500);
  el.addEventListener('mouseenter', () => clearTimeout(_autoFade));  // pause fade on hover
}

function drawAchievementPopups() {
  if (achievementQueue.length === 0) return;
  const ACH_SHOW = 240; // 4 seconds
  const cur = achievementQueue[0];
  cur.frame++;
  if (cur.frame >= ACH_SHOW) { achievementQueue.shift(); return; }

  const t = cur.frame;
  const alpha = t < 20 ? t / 20 : t > ACH_SHOW - 30 ? (ACH_SHOW - t) / 30 : 1;
  const slideX = t < 20 ? (20 - t) * 14 : 0;
  const tier = ACH_TIERS[cur.tier] || ACH_TIERS.bronze;

  ctx.save();
  ctx.globalAlpha = alpha;
  const bw = 270, bh = 56, bx = GAME_W - bw - 12 + slideX, by = 12;
  // Background
  ctx.fillStyle = 'rgba(12,10,22,0.94)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill();
  ctx.strokeStyle = tier.rim[0]; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.stroke();
  // Badge
  const img = _achBadgeImage(cur);
  if (img.complete && img.naturalWidth) ctx.drawImage(img, bx + 8, by + 6, 44, 44);
  // Text
  ctx.textAlign = 'left';
  ctx.fillStyle = tier.glyph; ctx.font = 'bold 10px Arial';
  ctx.fillText('ACHIEVEMENT UNLOCKED', bx + 60, by + 17);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px Arial';
  ctx.fillText(cur.title, bx + 60, by + 32);
  ctx.fillStyle = '#9aa3b5'; ctx.font = '10px Arial';
  ctx.fillText(cur.desc, bx + 60, by + 46, bw - 68);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Home-screen button: earned count in the corner badge, full tally in the tooltip
function _achUpdateNavCount() {
  const el = document.getElementById('homeAchCount');
  if (el) el.textContent = earnedAchievements.size ? String(earnedAchievements.size) : '';
  const btn = document.getElementById('homeAchBtn');
  if (btn) btn.title = `Achievements: ${earnedAchievements.size} of ${ACHIEVEMENTS.length} earned`;
}

function closeAchievementsModal() {
  const modal = document.getElementById('achievementsModal');
  if (modal) modal.style.display = 'none';
}

// focusId: optional achievement id to select on open (used by the unlock toast)
function showAchievementsModal(focusId) {
  const modal = document.getElementById('achievementsModal');
  if (!modal) return;
  const list = document.getElementById('achievementsGrid');
  if (!list) return;

  const total = ACHIEVEMENTS.length, got = earnedAchievements.size;
  const countEl = document.getElementById('achCount');
  if (countEl) countEl.textContent = `${got} / ${total}`;
  const barEl = document.getElementById('achProgressFill');
  if (barEl) barEl.style.width = (total ? (got / total) * 100 : 0) + '%';
  _achUpdateNavCount();

  list.innerHTML = '';

  function showDetail(a) {
    const earned = earnedAchievements.has(a.id);
    const hidden = !earned && a.secret;
    const tier = ACH_TIERS[a.tier] || ACH_TIERS.bronze;
    const detail = document.getElementById('achDetail');
    if (detail) detail.dataset.tier = earned ? (a.tier || 'bronze') : 'locked';
    const iconEl = document.getElementById('achDetailIcon');
    const tierEl = document.getElementById('achDetailTier');
    const titleEl = document.getElementById('achDetailTitle');
    const descEl = document.getElementById('achDetailDesc');
    const hintEl = document.getElementById('achDetailHint');
    const statusEl = document.getElementById('achDetailStatus');
    if (iconEl) iconEl.innerHTML = achBadgeSVG(a, earned);
    if (tierEl) { tierEl.textContent = hidden ? 'Hidden' : tier.label; tierEl.style.color = hidden ? '' : tier.glyph; }
    if (titleEl) titleEl.textContent = hidden ? 'Hidden achievement' : a.title;
    if (descEl) descEl.textContent = hidden ? 'Keep playing to find out.' : a.desc;
    if (hintEl) hintEl.innerHTML = (!earned && a.hint) ? `<span class="ach-hint-label">How to unlock</span>${a.hint}` : '';
    if (statusEl) {
      statusEl.textContent = earned ? 'Earned' : 'Locked';
      statusEl.className = 'ach-status ' + (earned ? 'ach-status-earned' : 'ach-status-locked');
    }
    list.querySelectorAll('.ach-card').forEach(c => c.classList.remove('ach-selected'));
    const target = list.querySelector(`.ach-card[data-id="${a.id}"]`);
    if (target) target.classList.add('ach-selected');
  }

  ACHIEVEMENT_CATEGORIES.forEach(cat => {
    const items = ACHIEVEMENTS.filter(a => a.cat === cat.id);
    if (!items.length) return;
    const have = items.filter(a => earnedAchievements.has(a.id)).length;
    const head = document.createElement('div');
    head.className = 'ach-cat-head';
    head.innerHTML = `<span>${cat.title}</span><span class="ach-cat-count">${have}/${items.length}</span>`;
    list.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'ach-cat-grid';
    items.forEach(a => {
      const earned = earnedAchievements.has(a.id);
      const hidden = !earned && a.secret;
      const div = document.createElement('div');
      div.tabIndex = 0;
      div.setAttribute('role', 'button');
      div.className = 'ach-card' + (earned ? ' ach-earned ach-tier-' + (a.tier || 'bronze') : ' ach-locked');
      div.dataset.id = a.id;
      div.title = hidden ? 'Hidden achievement' : `${a.title}: ${a.desc}`;
      div.innerHTML = `<div class="ach-icon">${achBadgeSVG(a, earned)}</div><div class="ach-title-mini">${hidden ? '???' : a.title}</div>`;
      div.addEventListener('click', () => showDetail(a));
      div.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showDetail(a); } });
      grid.appendChild(div);
    });
    list.appendChild(grid);
  });

  const focus = (focusId && ACHIEVEMENTS.find(a => a.id === focusId)) ||
                ACHIEVEMENTS.find(a => earnedAchievements.has(a.id)) || ACHIEVEMENTS[0];
  showDetail(focus);

  modal.style.display = 'flex';
  const sel = list.querySelector('.ach-selected');
  if (focusId && sel) sel.scrollIntoView({ block: 'nearest' });
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const modal = document.getElementById('achievementsModal');
  if (modal && modal.style.display !== 'none') { closeAchievementsModal(); e.stopPropagation(); }
}, true);
