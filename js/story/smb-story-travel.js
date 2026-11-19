'use strict';
// smb-story-travel.js: story fast travel (docs/god-of-war-plan.md, "Fast travel").
//
// Two ways back to a place you have already been, both from the pause menu's Travel button:
//   Beacons: standing at a rest beacon you have lit, travel to any other lit beacon in a chapter you have reached.
//            The same launch as Continue (cpResume + _storyResumeCpFor), so you arrive at the beacon.
//   The fragment's trail: anywhere in a chapter world, pull yourself back along the fractures the fragment has
//            already passed through, up to STORY_TRAIL_REACH chapters back, never forwards. Canon: this is not a
//            law (Kael has no command over law before the anchor); it is the shield's phase displacement
//            stretched over distance, and he is new at it. So it is unstable: you arrive hurt, it needs time to
//            settle, and sometimes the trail slips and drops you a chapter further back than you aimed.
// Walking back through the left edge of each world still works (exploreBackChapter).
//
// Returning to a beaten chapter: the duel is skipped (_cinReplaySkip) and a thinned guard holds the place
// (smb-story-engine-explore.js, _expBeaten).
//
// Depends on (at call time): _story2, STORY_CHAPTERS2, _beginChapter2, _seenNarrativeIds (smb-story-engine-flow.js),
// exploreCheckpoints / exploreArenaLock / exploreActive (smb-globals.js), resumeGame (smb-drawing-arenas.js),
// realmInSideRoom (smb-realm.js).

const STORY_TRAIL_REACH  = 10;          // chapters back
const STORY_TRAIL_CD_MS  = 4 * 60000;   // the trail needs this long to settle between uses
const STORY_TRAIL_HP     = 0.6;         // you arrive with this share of your health
const STORY_TRAIL_SLIP   = 0.2;         // chance it drops you one walkable chapter further back
const STORY_BEACON_REACH = 150;         // px from a lit beacon that counts as standing at it

function _travelWalkable(ch) {
  return !!ch && !ch._menuHidden && !ch.noFight && ch.type !== 'branch' &&
    (ch.walkFight === true || ch.type === 'exploration') && (ch.worldLength || 3000) >= 2000;
}

// Why travel is not possible right now, or null.
function storyTravelBlocked() {
  if (typeof storyModeActive === 'undefined' || !storyModeActive || !gameRunning) return 'Only during a story chapter.';
  if (gameMode !== 'exploration' || !exploreActive) return 'Only out in a chapter world.';
  if (typeof realmInSideRoom === 'function' && realmInSideRoom()) return 'Not from inside a side room.';
  if (exploreArenaLock) return 'Not in the middle of a fight.';
  const p = players[0];
  if (!p || p.health <= 0) return 'Not now.';
  const unseen = typeof stealthModeActive !== 'undefined' && stealthModeActive && typeof stealthAlarmed !== 'undefined' && !stealthAlarmed;
  const near = !unseen && minions.some(m => m.health > 0 && Math.abs(m.cx() - p.cx()) < 520 &&
    (typeof isHostileTarget !== 'function' || isHostileTarget(p, m)));
  if (near) return 'Not with enemies this close.';
  return null;
}

function _travelAtBeacon() {
  const p = players[0];
  if (!p) return null;
  return (exploreCheckpoints || []).find(cp => cp.rest && cp.hit && Math.abs(cp.x - p.cx()) < STORY_BEACON_REACH) || null;
}

function _travelCurId() {
  return (typeof _activeStory2Chapter !== 'undefined' && _activeStory2Chapter) ? _activeStory2Chapter.id : null;
}

// Lit beacons in chapters you have reached, oldest chapter first. Skips the beacon you are standing at.
function storyTravelBeacons() {
  const out = [], lb = (_story2 && _story2.litBeacons) || {};
  const furthest = Math.max(_story2.chapter || 0, _travelCurId() || 0);
  const here = _travelAtBeacon(), cur = _travelCurId();
  Object.keys(lb).map(Number).sort((a, b) => a - b).forEach(id => {
    const ch = STORY_CHAPTERS2[id];
    if (!_travelWalkable(ch) || id > furthest) return;
    lb[id].slice().sort((a, b) => a - b).forEach((x, i) => {
      if (here && id === cur && Math.abs(x - here.x) < 4) return;
      out.push({ chId: id, x: x, n: i + 1, title: ch.title });
    });
  });
  return out;
}

function storyTrailTargets() {
  const cur = _travelCurId(), out = [];
  if (cur == null) return out;
  for (let id = cur - 1; id >= Math.max(0, cur - STORY_TRAIL_REACH); id--) {
    if (_travelWalkable(STORY_CHAPTERS2[id])) out.push({ chId: id, title: STORY_CHAPTERS2[id].title });
  }
  return out;
}

function storyTrailWait() {
  const t = (_story2 && _story2.trailReadyAt) || 0;
  return Math.max(0, t - Date.now());
}

function _travelLaunch(chId, x, hurt, line) {
  if (typeof _seenNarrativeIds !== 'undefined') _seenNarrativeIds.add(chId);
  if (x != null) {
    _story2.cpResume = { chId: chId, x: x };
    window._storyResumeCpFor = chId;
  }
  window._storyTravelArrive = { hurt: hurt || 0, line: line || null };
  if (typeof _saveStory2 === 'function') _saveStory2();
  storyTravelClose();
  if (typeof resumeGame === 'function') resumeGame();
  _beginChapter2(chId);
}

function storyTravelToBeacon(i) {
  if (storyTravelBlocked() || !_travelAtBeacon()) return;
  const b = storyTravelBeacons()[i];
  if (!b) return;
  _travelLaunch(b.chId, b.x, 0, 'The beacon holds. You step out beside it.');
}

function storyTravelTrail(i) {
  if (storyTravelBlocked() || storyTrailWait() > 0) return;
  const list = storyTrailTargets();
  const t = list[i];
  if (!t) return;
  let id = t.chId, slipped = false;
  if (Math.random() < STORY_TRAIL_SLIP) {
    // Never forwards: a slip only ever lands further back.
    for (let k = id - 1; k >= 0; k--) if (_travelWalkable(STORY_CHAPTERS2[k])) { id = k; slipped = true; break; }
  }
  _story2.trailReadyAt = Date.now() + STORY_TRAIL_CD_MS;
  _travelLaunch(id, null, STORY_TRAIL_HP, slipped
    ? 'The trail slips. This is not where you aimed. (' + STORY_CHAPTERS2[id].title + ')'
    : 'The fragment pulls you back along its own trail. It costs you.');
}

// Called by updateExploration on the first frame of a chapter launched by travel.
function storyTravelArrived(p1) {
  const a = window._storyTravelArrive;
  if (!a || !p1) return;
  window._storyTravelArrive = null;
  if (a.hurt) {
    p1.health = Math.max(1, Math.round(p1.maxHealth * a.hurt));
    if (typeof spawnParticles === 'function') spawnParticles(p1.cx(), p1.cy(), '#8fd8ff', 26);
    if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 10);
  }
  if (a.line && typeof storyFightSubtitle !== 'undefined') {
    storyFightSubtitle = { text: a.line, timer: 220, maxTimer: 220, color: a.hurt ? '#8fd8ff' : '#ffd27a' };
  }
}

// ── Panel ───────────────────────────────────────────────────────────────────────────────────────────────────

function storyTravelClose() {
  const el = document.getElementById('storyTravelPanel');
  if (el) el.remove();
}

function _travelEsc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function openStoryTravel() {
  storyTravelClose();
  const why = storyTravelBlocked();
  const atBeacon = !why && _travelAtBeacon();
  const wait = storyTrailWait();
  let h = '<div class="overlay-box" style="max-width:520px;max-height:80vh;overflow:auto;text-align:left;">';
  h += '<h2 style="text-align:center;">Travel</h2>';
  if (why) h += '<p style="color:#ff9a88;text-align:center;">' + _travelEsc(why) + '</p>';

  h += '<h3 style="margin:10px 0 4px;color:#ffd27a;">Beacons</h3>';
  if (!atBeacon) {
    h += '<p style="color:var(--ui-faint,#9aa8bb);font-size:0.85rem;margin:2px 0 8px;">Stand at a lit beacon to travel between beacons.</p>';
  } else {
    const bs = storyTravelBeacons();
    if (!bs.length) h += '<p style="color:var(--ui-faint,#9aa8bb);font-size:0.85rem;">No other beacons lit yet.</p>';
    bs.forEach((b, i) => {
      h += '<button class="btn" style="display:block;width:100%;margin:3px 0;text-align:left;" onclick="storyTravelToBeacon(' + i + ')">' +
        'Ch ' + (b.chId + 1) + ' · ' + _travelEsc(b.title) + ' <span style="opacity:.6">· beacon ' + b.n + '</span></button>';
    });
  }

  h += '<h3 style="margin:14px 0 4px;color:#8fd8ff;">The fragment\'s trail</h3>';
  h += '<p style="color:var(--ui-faint,#9aa8bb);font-size:0.85rem;margin:2px 0 8px;">Back along the fractures you came through, up to ' +
    STORY_TRAIL_REACH + ' chapters, never forwards. Unstable: you arrive hurt, and it can slip further back than you aim.</p>';
  if (!why) {
    if (wait > 0) {
      h += '<p style="color:#8fd8ff;font-size:0.85rem;">The trail is still settling. ' + Math.ceil(wait / 1000) + ' s.</p>';
    } else {
      const ts = storyTrailTargets();
      if (!ts.length) h += '<p style="color:var(--ui-faint,#9aa8bb);font-size:0.85rem;">Nothing behind you to pull back to.</p>';
      ts.forEach((t, i) => {
        h += '<button class="btn" style="display:block;width:100%;margin:3px 0;text-align:left;" onclick="storyTravelTrail(' + i + ')">' +
          'Ch ' + (t.chId + 1) + ' · ' + _travelEsc(t.title) + '</button>';
      });
    }
  }
  h += '<div class="btn-row" style="justify-content:center;margin-top:12px;"><button class="btn" onclick="storyTravelClose()">Back</button></div></div>';
  const el = document.createElement('div');
  el.id = 'storyTravelPanel';
  el.className = 'overlay-screen';
  el.style.display = 'flex';
  el.style.zIndex = '1200';
  el.innerHTML = h;
  document.body.appendChild(el);
}

function isStoryTravelOpen() { return !!document.getElementById('storyTravelPanel'); }
