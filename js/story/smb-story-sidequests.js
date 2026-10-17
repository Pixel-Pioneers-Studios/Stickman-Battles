'use strict';
// smb-story-sidequests.js: optional side objectives for explore and walk-to-fight chapters.
// Nothing here is required. Quest foes are flagged isOptionalEnemy, so the clear gate
// and exit seal skip them. Nothing on the exit or win path reads this file.
//
// Definitions are plain data, looked up in order: chapter.sidequests,
// STORY_LEVELS[id].sidequests, then STORY_SIDEQUESTS[id].
// Fields: id (unique per chapter), type ('find' | 'rescue' | 'clear'), title (HUD line),
// at (0..1 along the world), style (visual variant), intro/done/blocked subtitles,
// foes (rescue and clear), reward { tokens, exp } paid once. Text is second person.
// Done state goes in _story2.lootTaken as '<chapterId>:sq<id>'. Stars only count
// ':c0' and ':c1', so sidequests never change 100%.
// Hooks are typeof-guarded at call sites: storySidequestsReset, storySidequestsArm,
// updateSidequests, drawSidequestWorld, drawSidequestHUD, storySidequestMarks,
// storySidequestProgress.
// Depends on smb-story-config.js and smb-story-engine-explore2.js (_exploreSpawnEnemy).

const STORY_SIDEQUESTS = {
  // Act 0: Home City, the first night of the invasion.
  2: [{
    id: 'a', type: 'rescue', style: 'pinned', at: 0.17,
    title: 'Free the trapped witness',
    intro: 'Someone is under the collapsed awning. Breathing. Not a fighter.',
    blocked: 'The Enforcer is still standing over them.',
    done: '"Go," you tell them. "Don\'t stop until the shelter." They don\'t stop.',
    foes: { count: 1, name: 'Seam Enforcer', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'easy', color: '#cc4444' },
    reward: { tokens: 14, exp: 12 },
  }],
  // Act 1: Fracture Network.
  24: [{
    id: 'a', type: 'clear', style: 'echo', at: 0.40,
    title: 'Clear the echo nest',
    intro: 'The corridor wall is wrong here. Echoes that never finished forming, packed into the stone.',
    done: 'The wall goes quiet. Nothing in it was ever finished.',
    foes: { count: 3, name: 'Unformed Echo', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'medium', color: '#a47fd8' },
    reward: { tokens: 18, exp: 16 },
  }],
  // Act 2: the Ice Dimension, the third Architect's perfect world.
  42: [{
    id: 'a', type: 'find', style: 'journal', at: 0.24,
    title: 'Find the frozen warrior\'s journal',
    intro: 'Something dark under the ice. A hand, still holding on to it.',
    done: 'The pages are fused shut except one. "It was perfect. That was the trap."',
    reward: { tokens: 15, exp: 14 },
  }],
  // Act 2: the abandoned facility.
  66: [{
    id: 'a', type: 'find', style: 'journal', at: 0.65,
    title: 'Find the technician\'s notebook',
    intro: 'A vent cover has been pried off. From the inside.',
    done: 'A technician\'s notebook. "Subject asked if the sky was real. I said yes. I don\'t know why I said yes."',
    reward: { tokens: 20, exp: 16 },
  }],
  // Act 3: War-Torn Dimension.
  86: [{
    id: 'a', type: 'rescue', style: 'bound', at: 0.58,
    title: 'Free the bound conscript',
    intro: 'A conscript is tied to a fence post. Two of his own are watching him.',
    blocked: 'His guards haven\'t stood down.',
    done: '"I stopped," he says. "They told me that was the same as dying." You cut the rope. He runs the other way.',
    foes: { count: 2, name: 'War Conscript', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'easy', color: '#a04a38' },
    reward: { tokens: 20, exp: 18 },
  }],
  // Act 3: Gravity Flux World.
  91: [{
    id: 'a', type: 'clear', style: 'drift', at: 0.26,
    title: 'Clear the drifter nest',
    intro: 'Flux Drifters have tied themselves to a slab that doesn\'t care which way is down.',
    done: 'The slab drifts free. Nobody is holding it down anymore.',
    foes: { count: 3, name: 'Flux Drifter', weaponKey: 'spear', classKey: 'ninja', aiDiff: 'medium', color: '#7fae8a' },
    reward: { tokens: 24, exp: 20 },
  }],
  // Act 3: Titan World.
  99: [{
    id: 'a', type: 'find', style: 'cairn', at: 0.12,
    title: 'Find the pilgrim\'s cairn',
    intro: 'Stones stacked by someone small, in a world built for something large.',
    done: 'Under the top stone, a strip of cloth. Still warm. Someone left in a hurry. Or didn\'t leave.',
    reward: { tokens: 24, exp: 20 },
  }],
  // Act 4: the Creator's Domain.
  129: [{
    id: 'a', type: 'find', style: 'mark', at: 0.84,
    title: 'Find the earlier bearer\'s mark',
    intro: 'Scratched low on the wall, where the lighting doesn\'t reach.',
    done: 'A bearer\'s mark. One of the ninety-four stood here and left it for whoever came next. You add nothing. You remember it.',
    reward: { tokens: 30, exp: 26 },
  }],
};

let _sq = null;   // { chId, quests } while an explore level runs

function storySidequestsFor(ch) {
  if (!ch) return [];
  if (Array.isArray(ch.sidequests)) return ch.sidequests;
  const lv = (typeof STORY_LEVELS !== 'undefined') ? STORY_LEVELS[ch.id] : null;
  if (lv && Array.isArray(lv.sidequests)) return lv.sidequests;
  return STORY_SIDEQUESTS[ch.id] || [];
}
function _sqKey(chId, id) { return chId + ':sq' + id; }
function _sqTaken(key) { return !!(_story2 && _story2.lootTaken && _story2.lootTaken[key]); }

// Chapter-select progress ({ got, total }) for a chapter index.
function storySidequestProgress(idx) {
  const ch = (typeof STORY_CHAPTERS2 !== 'undefined') ? STORY_CHAPTERS2[idx] : null;
  const defs = storySidequestsFor(ch);
  return { got: defs.filter(d => _sqTaken(_sqKey(ch.id, d.id))).length, total: defs.length };
}

// Placement
// Quests anchor to open ground: solid floor, clear of plateaus, shafts, arena locks and perches.
// The explore world is ARENAS.__explore__. currentArena can still hold the previous screen's
// arena for a few frames, so don't read it at arm time.
function _sqArena() { return (typeof ARENAS !== 'undefined' && ARENAS.__explore__) || currentArena; }
function _sqFloorAt(plats, x) {
  let best = null;
  for (const p of plats) {
    if (!p.isFloor || p.h <= 20) continue;
    if (x - 50 >= p.x && x + 50 <= p.x + p.w && (best === null || p.y < best)) best = p.y;
  }
  return best;
}
function _sqBlocked(plats, x) {
  if (_sqFloorAt(plats, x) === null) return true;
  if (plats.some(p => p.isStructure && x + 60 > p.x && x - 60 < p.x + p.w)) return true;
  const ug = (_sqArena() && _sqArena().undergroundRects) || [];
  if (ug.some(r => r.kind === 'shaft' && x + 110 > r.x && x - 110 < r.x + r.w)) return true;
  if ((exploreCheckpoints || []).some(c => !c.rest && Math.abs(c.x - x) < 460)) return true;
  if ((explorePickups || []).some(it => it.type === 'chest' && !it.underground && Math.abs(it.x - x) < 170)) return true;
  return false;
}
function _sqPlace(plats, want) {
  const lo = 360, hi = exploreWorldLen - 700;
  for (let n = 0; n < 40; n++) {
    for (const s of (n === 0 ? [0] : [1, -1])) {
      const x = Math.max(lo, Math.min(hi, want + s * n * 60));
      if (!_sqBlocked(plats, x)) return { x, floorY: _sqFloorAt(plats, x) };
    }
  }
  return null;
}

// Lifecycle
function storySidequestsReset() { _sq = null; }

function storySidequestsArm(ch) {
  _sq = null;
  if (!ch || !exploreActive || gameMode !== 'exploration' || storeSurvivalState) return;
  // Region worlds stack chapters end to end. Quests go in the launched chapter's segment.
  const _segI = exploreRegion ? exploreRegion.chapters.indexOf(ch.id) : 0;
  if (_segI < 0) return;
  const _segLen = exploreRegion ? exploreRegion.segLen : exploreWorldLen;
  const defs = storySidequestsFor(ch);
  const _ar = _sqArena();
  if (!defs.length || !_ar || !_ar.platforms) return;
  const plats = _ar.platforms;
  const quests = [];
  for (const d of defs) {
    const spot = _sqPlace(plats, Math.round(_segI * _segLen + (d.at == null ? 0.5 : d.at) * _segLen));
    if (!spot) continue;   // no safe ground: skip it
    quests.push({
      def: d, key: _sqKey(ch.id, d.id), done: _sqTaken(_sqKey(ch.id, d.id)),
      x: spot.x, floorY: spot.floorY, seen: false, spawned: false, foes: [],
      flash: 0, freedAt: 0, nag: 0,
    });
  }
  if (quests.length) _sq = { chId: ch.id, quests };
}

function _sqFoesAlive(q) { return q.foes.some(m => m.health > 0); }

function _sqSpawnFoes(q, p1) {
  q.spawned = true;
  const f = q.def.foes || {};
  const n = Math.max(1, f.count || 1);
  const plats = (_sqArena() && _sqArena().platforms) || [];
  for (let i = 0; i < n; i++) {
    const off = q.def.type === 'clear' ? (i - (n - 1) / 2) * 80 : (i % 2 ? 1 : -1) * (90 + 30 * Math.floor(i / 2));
    let gx = q.x + off;
    let fy = _sqFloorAt(plats, gx);
    if (fy === null) { gx = q.x; fy = q.floorY; }
    _exploreSpawnEnemy({
      wx: gx, exactX: gx - 17, exactY: fy - 86, isGuard: true, isOptionalEnemy: true,
      name: f.name || 'Enemy', weaponKey: f.weaponKey || 'sword', classKey: f.classKey || 'warrior',
      aiDiff: f.aiDiff || 'easy', color: f.color || '#887766', health: f.health || 70, isWeak: true,
    }, p1);
    q.foes.push(minions[minions.length - 1]);
  }
}

function _sqComplete(q, p1) {
  q.done = true; q.flash = 240; q.freedAt = frameCount;
  _story2.lootTaken = _story2.lootTaken || {};
  _story2.lootTaken[q.key] = 1;
  const r = q.def.reward || {};
  const tokens = r.tokens ? _storyTokenReward(r.tokens) : 0;
  if (tokens) _story2.tokens = (_story2.tokens || 0) + tokens;
  if (typeof _saveStory2 === 'function') _saveStory2();
  if (r.exp && typeof _storyAwardKillExp === 'function') _storyAwardKillExp(r.exp);
  if (tokens && typeof DamageText !== 'undefined' && typeof damageTexts !== 'undefined') {
    damageTexts.push(new DamageText(`+${tokens} coins`, p1.cx(), p1.y - 52, '#ffcc33'));
  }
  spawnParticles(q.x, q.floorY - 20, '#9fd8d0', 18);
  if (typeof SoundManager !== 'undefined' && SoundManager.superActivate) SoundManager.superActivate();
  storyFightSubtitle = { text: q.def.done || 'Done.', timer: 280, maxTimer: 280, color: '#bfe6df' };
  if (typeof checkCompletionAchievements === 'function') checkCompletionAchievements();
}

function updateSidequests(p1) {
  if (!_sq || !p1 || p1.health <= 0) return;
  for (const q of _sq.quests) {
    if (q.flash > 0) q.flash--;
    if (q.done) continue;
    const dx = Math.abs(p1.cx() - q.x);
    const dy = Math.abs(p1.cy() - (q.floorY - 24));
    if (!q.seen && dx < 620 && dy < 260) {
      q.seen = true;
      if (!storyFightSubtitle || storyFightSubtitle.timer <= 0) {
        storyFightSubtitle = { text: q.def.intro || q.def.title, timer: 230, maxTimer: 230, color: '#9fc8c4' };
      }
    }
    const t = q.def.type;
    if (t === 'find') {
      if (dx < 46 && dy < 90) _sqComplete(q, p1);
    } else if (t === 'rescue') {
      if (!q.spawned && dx < 480) _sqSpawnFoes(q, p1);
      if (dx < 58 && dy < 90) {
        if (q.spawned && _sqFoesAlive(q)) {
          if (frameCount - q.nag > 240) {
            q.nag = frameCount;
            storyFightSubtitle = { text: q.def.blocked || 'Not yet.', timer: 150, maxTimer: 150, color: '#e8a58c' };
          }
        } else {
          _sqComplete(q, p1);
        }
      }
    } else if (t === 'clear') {
      if (!q.spawned && dx < 520) _sqSpawnFoes(q, p1);
      if (q.spawned && !_sqFoesAlive(q)) _sqComplete(q, p1);
    }
  }
}

function storySidequestMarks() {
  if (!_sq) return [];
  return _sq.quests.filter(q => q.seen || q.done).map(q => ({ x: q.x, y: q.floorY - 14, done: q.done }));
}

// World-space props
function _sqStick(x, y, sit, alpha, col) {
  // Muted seated or standing figure. y is the ground line.
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = col; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  if (sit) {
    ctx.beginPath(); ctx.arc(x + 2, y - 36, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 2, y - 30); ctx.lineTo(x, y - 12); ctx.lineTo(x + 18, y - 4); ctx.stroke();   // torso, thigh
    ctx.beginPath(); ctx.moveTo(x + 18, y - 4); ctx.lineTo(x + 20, y); ctx.stroke();                               // shin
    ctx.beginPath(); ctx.moveTo(x + 1, y - 26); ctx.lineTo(x + 14, y - 18); ctx.stroke();                          // arm
  } else {
    ctx.beginPath(); ctx.arc(x, y - 56, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 50); ctx.lineTo(x, y - 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 24); ctx.lineTo(x - 8, y); ctx.moveTo(x, y - 24); ctx.lineTo(x + 8, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 44); ctx.lineTo(x - 10, y - 30); ctx.moveTo(x, y - 44); ctx.lineTo(x + 10, y - 30); ctx.stroke();
  }
  ctx.restore();
}

function _sqDrawProp(q) {
  const x = q.x, y = q.floorY;
  const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.05 + x);
  const st = q.def.style;
  ctx.save();
  ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (q.def.type === 'find') {
    if (q.done) { ctx.restore(); return; }
    ctx.translate(x, y); ctx.scale(1.4, 1.4); ctx.translate(-x, -y);   // read at game zoom
    // Faint ground glow so it can be spotted. Not a pickup sparkle.
    const g = ctx.createRadialGradient(x, y - 6, 0, x, y - 6, 34);
    g.addColorStop(0, `rgba(190,226,220,${0.10 + 0.08 * pulse})`);
    g.addColorStop(1, 'rgba(190,226,220,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 34, y - 40, 68, 68);
    if (st === 'journal') {
      ctx.fillStyle = '#2b2a2d'; ctx.strokeStyle = '#b9b49c';
      ctx.beginPath(); ctx.rect(x - 9, y - 11, 18, 11); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x, y); ctx.stroke();
    } else if (st === 'cairn') {
      ctx.fillStyle = '#34333a'; ctx.strokeStyle = '#8f8e98';
      ctx.beginPath(); ctx.ellipse(x, y - 5, 14, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x + 1, y - 13, 9, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x - 1, y - 20, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#c9a888'; ctx.beginPath(); ctx.moveTo(x - 2, y - 22); ctx.lineTo(x - 9, y - 17); ctx.stroke();
    } else {   // 'mark': a scratched sign on a low slab
      ctx.fillStyle = '#26262c'; ctx.strokeStyle = '#6f6f7c';
      ctx.beginPath(); ctx.rect(x - 12, y - 34, 24, 34); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = `rgba(200,224,220,${0.45 + 0.35 * pulse})`;
      ctx.beginPath(); ctx.moveTo(x - 6, y - 26); ctx.lineTo(x - 6, y - 12); ctx.moveTo(x, y - 28); ctx.lineTo(x, y - 12);
      ctx.moveTo(x + 6, y - 26); ctx.lineTo(x + 6, y - 12); ctx.moveTo(x - 9, y - 22); ctx.lineTo(x + 9, y - 17); ctx.stroke();
    }
  } else if (q.def.type === 'rescue') {
    const since = q.done ? frameCount - q.freedAt : 0;
    if (q.done && since > 150) { ctx.restore(); return; }
    const fade = q.done ? Math.max(0, 1 - Math.max(0, since - 70) / 80) : 1;
    if (q.done) {
      const walk = Math.min(since, 150) * 0.9;
      _sqStick(x - walk, y, false, fade, '#c3ccdb');
    } else if (st === 'bound') {
      ctx.strokeStyle = '#6a5a48'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.lineTo(x + 14, y - 62); ctx.stroke();      // post
      _sqStick(x + 6, y, false, 0.9, '#aeb7c6');
      ctx.strokeStyle = '#8a7a62'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - 1, y - 40); ctx.lineTo(x + 14, y - 42); ctx.moveTo(x - 1, y - 32); ctx.lineTo(x + 14, y - 34); ctx.stroke();
    } else {   // 'pinned' under a slab
      _sqStick(x - 8, y, true, 0.9, '#aeb7c6');
      ctx.fillStyle = '#2c2b31'; ctx.strokeStyle = '#7a7a86'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + 2, y - 2); ctx.lineTo(x + 54, y - 26); ctx.lineTo(x + 56, y - 18); ctx.lineTo(x + 8, y + 2); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  } else if (q.def.type === 'clear') {
    const alive = q.spawned ? _sqFoesAlive(q) : true;
    const a = q.done ? Math.max(0, q.flash / 240) * 0.6 : 1;
    if (a <= 0) { ctx.restore(); return; }
    ctx.globalAlpha = a;
    if (st === 'drift') {
      ctx.fillStyle = '#2a2d2b'; ctx.strokeStyle = '#7d9a86';
      ctx.beginPath(); ctx.ellipse(x, y - 64 + 3 * Math.sin(frameCount * 0.03), 54, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(125,154,134,0.45)';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 20, y - 58); ctx.lineTo(x + i * 20, y - 2); ctx.stroke(); }
    } else {   // 'echo': a cluster of half-formed outlines in the wall
      ctx.fillStyle = 'rgba(30,24,44,0.9)'; ctx.strokeStyle = `rgba(164,127,216,${0.45 + 0.3 * pulse})`;
      ctx.beginPath(); ctx.moveTo(x - 46, y); ctx.quadraticCurveTo(x - 30, y - 56, x, y - 58); ctx.quadraticCurveTo(x + 30, y - 56, x + 46, y); ctx.closePath();
      ctx.fill(); ctx.stroke();
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.arc(x + i * 22, y - 30, 5, 0, Math.PI * 2); ctx.moveTo(x + i * 22, y - 25); ctx.lineTo(x + i * 22, y - 8); ctx.stroke();
      }
    }
    if (!alive) ctx.globalAlpha = a * 0.5;
  }
  ctx.restore();
}

function drawSidequestWorld() {
  if (!_sq || !exploreActive) return;
  const p1 = players[0];
  for (const q of _sq.quests) {
    if (p1 && Math.abs(p1.cx() - q.x) > 1100) continue;
    _sqDrawProp(q);
  }
}

// HUD tracker
function drawSidequestHUD() {
  if (!_sq || !exploreActive) return;
  if ((typeof activeCinematic !== 'undefined' && activeCinematic) || (typeof isCinematic !== 'undefined' && isCinematic)) return;
  const avoid = Array.isArray(window._hudAvoid) ? window._hudAvoid : (window._hudAvoid = []);
  let y = Math.round((typeof _hudBottom === 'function' ? _hudBottom() : 0) + 10);
  if (avoid.length) { const r = avoid[avoid.length - 1]; y = r.y + r.h + 6; }
  const x = 14, W = 236, rowH = 15;
  const H = 18 + _sq.quests.length * rowH;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(8,10,16,0.55)';
  ctx.beginPath(); ctx.roundRect(x, y, W, H, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(150,165,190,0.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, W - 1, H - 1, 3); ctx.stroke();
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = '600 8px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = 'rgba(165,178,200,0.6)';
  ctx.fillText('OPTIONAL', x + 8, y + 11);
  let ry = y + 18 + 10;
  for (const q of _sq.quests) {
    const flash = q.flash > 0 ? 0.5 + 0.5 * Math.sin(q.flash * 0.3) : 0;
    ctx.strokeStyle = q.done ? 'rgba(120,170,160,0.8)' : 'rgba(132,200,192,0.9)';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath(); ctx.arc(x + 13, ry - 3.5, 2.8, 0, Math.PI * 2);
    if (q.done) ctx.fill(); else ctx.stroke();
    ctx.font = '11px "Segoe UI", Arial, sans-serif';
    let label = q.def.title;
    if (!q.done && q.def.type === 'clear' && q.spawned) {
      label += `  ${q.foes.filter(m => m.health <= 0).length}/${q.foes.length}`;
    }
    ctx.fillStyle = q.done ? `rgba(150,172,168,${0.7 + 0.3 * flash})` : 'rgba(214,224,236,0.92)';
    ctx.fillText(label, x + 22, ry);
    if (q.done) {
      const w = ctx.measureText(label).width;
      ctx.strokeStyle = 'rgba(150,172,168,0.7)';
      ctx.beginPath(); ctx.moveTo(x + 22, ry - 3.5); ctx.lineTo(x + 22 + w, ry - 3.5); ctx.stroke();
    }
    ry += rowH;
  }
  ctx.restore();
  avoid.push({ x, y, w: W, h: H });
}
