'use strict';
// smb-story-engine-ui.js: story menu tabs, journey/store/skill-tree rendering, prologue overlay.
// Depends on: smb-globals.js, smb-story-registry.js (and preceding story-engine splits)

let _skillTreeAnimId = null;
let _masterySelectedWeapon = 'sword';

function _worldIcon(w) {
  // World names already include their emoji
  return w || '🌐';
}

function _story2TokenDisplay() {
  const el = document.getElementById('storyTokenDisplay');
  if (el) el.textContent = _story2.tokens;
}

function switchStoryTab(tab) {
  // 'multiverse' panel is kept but has no tab button: only accessible via story progression
  ['chapters','multiverse'].forEach(t => {
    const btn   = document.getElementById('storyTab' + t.charAt(0).toUpperCase() + t.slice(1));
    const panel = document.getElementById('storyTabPanel' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn)   btn.classList.toggle('active', t === tab);
    if (panel) panel.style.display = (t === tab) ? '' : 'none';
  });
  if (tab === 'multiverse') {
    const b = document.getElementById('storyTabChapters');
    if (b) b.classList.remove('active');
    if (typeof _renderMultiverseWorldList === 'function') _renderMultiverseWorldList();
  }
  _story2TokenDisplay();
}

function _renderStoryJourney() {
  const list = document.getElementById('storyJourneyList');
  if (!list) return;
  list.innerHTML = '';
  const cur = _story2.chapter;

  STORY_CHAPTERS2.forEach((ch, i) => {
    if (ch._menuHidden) return; // narrative plays as a transition, not a step

    const done    = _story2.defeated.includes(ch.id); // keyed by ch.id
    const current = i === cur;
    const locked  = i > cur;

    const el = document.createElement('div');
    el.className = 'story-journey-card' + (done ? ' done' : current ? ' current' : locked ? ' locked' : '');

    const icon = done ? '✅' : current ? '▶️' : locked ? '🔒' : '⭐';
    let rewardHtml = '';
    if (ch.tokenReward) rewardHtml += `+${_storyTokenReward(ch.tokenReward)} 🪙`;
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

function _renderStoryStore2() {
  const grid = document.getElementById('storyAbilityGrid2');
  if (!grid) return;
  grid.innerHTML = '';
  const tokenEl = document.getElementById('shopModalTokenDisplay');
  if (tokenEl) tokenEl.textContent = (_story2 && _story2.tokens) || 0;
  _storyUpdateExpDisplay();
  _renderShopSection(grid);
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

function _skillNodeReqMet(node, sk) {
  if (!node.requires && !node.requiresAny) return true;
  if (node.requiresAny && node.requiresAny.some(r => !!sk[r])) return true;
  if (node.requires && !!sk[node.requires]) return true;
  return false;
}

function _renderSkillTreeSection(grid) {
  const sk  = _story2.skillTree || {};
  const exp = _story2.exp || 0;

  const expBanner = document.createElement('div');
  expBanner.style.cssText = 'padding:8px 12px;background:rgba(100,220,100,0.08);border:1px solid rgba(100,220,100,0.25);border-radius:7px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;';
  expBanner.innerHTML = `<span style="color:#88cc88;font-size:0.72rem;letter-spacing:1px;">🌟 SKILL POINTS (EXP)</span><span id="storyExpDisplay" style="color:#aaff88;font-size:1.05rem;font-weight:700;">${exp} EXP</span>`;
  grid.appendChild(expBanner);

  for (const [, branch] of Object.entries(STORY_SKILL_TREE)) {
    const branchWrap = document.createElement('div');
    branchWrap.style.cssText = 'margin-bottom:18px;';

    const header = document.createElement('div');
    header.style.cssText = `display:flex;align-items:center;gap:7px;margin-bottom:10px;padding:5px 10px;background:rgba(0,0,0,0.22);border-left:3px solid ${branch.color};border-radius:0 6px 6px 0;`;
    header.innerHTML = `<span style="font-size:1rem;">${branch.icon || ''}</span><span style="font-size:0.70rem;letter-spacing:2px;text-transform:uppercase;color:${branch.color};font-weight:700;">${branch.label}</span>`;
    branchWrap.appendChild(header);

    const nodeMap = {};
    for (const n of branch.nodes) nodeMap[n.id] = n;
    const depthOf = {};
    const getDepth = (n) => {
      if (n.id in depthOf) return depthOf[n.id];
      const parent = n.requires ? nodeMap[n.requires] : null;
      depthOf[n.id] = parent ? getDepth(parent) + 1 : 0;
      return depthOf[n.id];
    };
    for (const n of branch.nodes) getDepth(n);
    const maxDepth = Math.max(...branch.nodes.map(n => depthOf[n.id]));

    const layers = [];
    for (let d = 0; d <= maxDepth; d++) {
      layers.push(branch.nodes.filter(n => depthOf[n.id] === d));
    }

    const treeWrap = document.createElement('div');
    treeWrap.style.cssText = 'position:relative;padding:0 4px;';

    for (let d = 0; d <= maxDepth; d++) {
      const layerNodes = layers[d];
      const layerRow = document.createElement('div');
      layerRow.style.cssText = 'display:flex;gap:8px;margin-bottom:0;';

      for (const node of layerNodes) {
        const owned   = !!sk[node.id];
        const reqMet  = _skillNodeReqMet(node, sk);
        const canBuy  = !owned && reqMet && exp >= node.expCost;
        const isLocked = !owned && !reqMet;

        const colWrap = document.createElement('div');
        colWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;flex:1;min-width:110px;';

        if (d > 0) {
          const connector = document.createElement('div');
          connector.style.cssText = `width:2px;height:14px;background:${owned ? branch.color : reqMet ? branch.color + '55' : 'rgba(255,255,255,0.08)'};margin-bottom:2px;border-radius:1px;`;
          colWrap.appendChild(connector);
        }

        const card = document.createElement('div');
        card.style.cssText = [
          'border-radius:9px', 'padding:9px 10px 8px', 'width:100%', 'box-sizing:border-box',
          `border:1px solid ${owned ? branch.color + 'aa' : canBuy ? branch.color + '55' : 'rgba(255,255,255,0.07)'}`,
          `background:${owned ? 'rgba(20,60,35,0.55)' : canBuy ? 'rgba(20,30,60,0.5)' : 'rgba(5,5,18,0.30)'}`,
          `opacity:${isLocked ? '0.32' : '1'}`,
          canBuy ? 'cursor:pointer;transition:background 0.12s,box-shadow 0.12s;' : 'cursor:default;',
          owned ? `box-shadow:0 0 8px ${branch.color}44;` : '',
        ].join(';');

        const reqLabel = isLocked
          ? (node.requiresAny
              ? '🔒 Requires ' + (node.requiresAny[0] || '').replace(/([A-Z])/g,' $1').trim()
              : '🔒 ' + (node.requires || '').replace(/([A-Z])/g,' $1').trim() + ' required')
          : '';

        card.innerHTML = `
          <div style="font-size:0.80rem;color:${owned ? '#aaff88' : canBuy ? '#dde4ff' : '#556'};font-weight:700;margin-bottom:3px;">${node.name}</div>
          <div style="font-size:0.60rem;color:#5a6a9a;line-height:1.35;margin-bottom:5px;">${node.desc}</div>
          <div style="font-size:0.68rem;${owned ? 'color:#66ee99' : canBuy ? `color:${branch.color}` : 'color:#445'}">
            ${owned ? '✓ Unlocked' : isLocked ? reqLabel : node.expCost + ' EXP'}
          </div>`;

        if (canBuy) {
          card.addEventListener('click', () => _buySkillNode(node, branch));
          card.addEventListener('mouseover', () => { card.style.background = 'rgba(30,55,110,0.7)'; card.style.boxShadow = `0 0 12px ${branch.color}33`; });
          card.addEventListener('mouseout',  () => { card.style.background = 'rgba(20,30,60,0.5)';  card.style.boxShadow = ''; });
        }

        colWrap.appendChild(card);

        const hasChild = branch.nodes.some(c => c.requires === node.id);
        if (hasChild) {
          const connDown = document.createElement('div');
          connDown.style.cssText = `width:2px;height:14px;background:${owned ? branch.color : branch.color + '33'};margin-top:2px;border-radius:1px;`;
          colWrap.appendChild(connDown);
        }

        layerRow.appendChild(colWrap);
      }

      treeWrap.appendChild(layerRow);
    }

    branchWrap.appendChild(treeWrap);
    grid.appendChild(branchWrap);
  }
}

function _buySkillNode(node, branch) {
  const sk  = _story2.skillTree = _story2.skillTree || {};
  const exp = _story2.exp || 0;
  if (sk[node.id]) return;
  if (!_skillNodeReqMet(node, sk)) return;
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

function continueStory() {
  if (!_story2 || typeof STORY_CHAPTERS2 === 'undefined') return;
  const nextIdx = _story2.chapter || 0;
  if (nextIdx >= STORY_CHAPTERS2.length) {
    if (typeof showToast === 'function') showToast('Story Complete — all chapters cleared!');
    return;
  }
  _beginChapter2(nextIdx);
}

function _updateContinueStoryBtn() {
  const btn = document.getElementById('continueStoryBtn');
  if (!btn) return;
  if (!_story2 || typeof STORY_CHAPTERS2 === 'undefined') return;
  const nextIdx = _story2.chapter || 0;
  if (nextIdx >= STORY_CHAPTERS2.length) {
    btn.textContent = '✓ Story Complete';
    btn.disabled    = true;
    btn.style.opacity  = '0.45';
    btn.style.cursor   = 'default';
  } else {
    // Skip menuHidden chapters to get the visible title
    let visIdx = nextIdx;
    while (STORY_CHAPTERS2[visIdx] && STORY_CHAPTERS2[visIdx]._menuHidden) visIdx++;
    const ch = STORY_CHAPTERS2[visIdx] || STORY_CHAPTERS2[nextIdx];
    btn.textContent = '▶ Continue Story' + (ch ? ' — ' + ch.title : '');
    btn.disabled    = false;
    btn.style.opacity = '1';
    btn.style.cursor  = 'pointer';
  }
}

function openStoryMenuChapters() {
  if (typeof closeStoryPath === 'function') closeStoryPath();
  if (typeof openStoryMenu === 'function') openStoryMenu();
  switchStoryTab('chapters');
}

function openStoryMenuShop() {
  if (typeof closeStoryPath === 'function') closeStoryPath();
  const modal = document.getElementById('shopModal');
  if (!modal) return;
  modal.style.display = 'flex';
  _renderStoryStore2();
}

function closeShopModal() {
  const modal = document.getElementById('shopModal');
  if (modal) modal.style.display = 'none';
}

// Story keeps its own weapon/class in _story2.loadout. The picker reuses the Versus P1 card and
// swaps the Versus weapon/class out while open, then restores them.
let _storyLoadoutStash = null; // { parent, next, weapon, cls, reopenStory }

// Story is melee-only and skips the goofy-tone weapons; 'random' always passes.
function _storyWeaponAllowed(key) {
  if (key === 'random') return true;
  if (!WEAPONS[key] || WEAPONS[key].type === 'ranged') return false;
  return typeof STORY_TONE_EXCLUDED_WEAPONS === 'undefined' || !STORY_TONE_EXCLUDED_WEAPONS.includes(key);
}

function storyLoadoutValues() {
  const lo = (_story2 && _story2.loadout) || {};
  return { weapon: lo.weapon || 'sword', cls: lo.cls || 'warrior' };
}

function _storyLoadoutLabel() {
  const lo = storyLoadoutValues();
  const wName = lo.weapon === 'random' ? 'Random' : (WEAPONS[lo.weapon] ? WEAPONS[lo.weapon].name : lo.weapon);
  const cName = lo.cls === 'random' ? 'Random' : (CLASSES[lo.cls] ? CLASSES[lo.cls].name : lo.cls);
  return wName + ' · ' + cName;
}

function _refreshStoryLoadoutLabels() {
  const label = _storyLoadoutLabel();
  const btn  = document.getElementById('storyLoadoutBtn');
  const desc = document.getElementById('storyLoadoutCardDesc');
  if (btn)  btn.textContent  = 'Loadout: ' + label;
  if (desc) desc.textContent = label;
}

function _setP1Loadout(weapon, cls) {
  const wSel = document.getElementById('p1Weapon');
  const cSel = document.getElementById('p1Class');
  if (wSel && [...wSel.options].some(o => o.value === weapon)) wSel.value = weapon;
  if (cSel && [...cSel.options].some(o => o.value === cls))    cSel.value = cls;
  if (typeof _syncSelCards === 'function') {
    _syncSelCards('p1WeaponCards', wSel ? wSel.value : weapon);
    _syncSelCards('p1ClassCards',  cSel ? cSel.value : cls);
  }
  const wGrid = document.getElementById('p1WeaponCards');
  if (wGrid) wGrid.classList.toggle('locked', !!cSel && cSel.value === 'megaknight');
}

function openStoryLoadout() {
  if (_storyLoadoutStash) return;
  const overlay = document.getElementById('storyLoadoutOverlay');
  const host    = document.getElementById('storyLoadoutHost');
  const card    = document.getElementById('p1Config');
  const wSel    = document.getElementById('p1Weapon');
  const cSel    = document.getElementById('p1Class');
  if (!overlay || !host || !card || !wSel || !cSel) return;
  const storyModal = document.getElementById('storyModal');
  const reopenStory = !!storyModal && storyModal.style.display !== 'none';
  if (reopenStory) storyModal.style.display = 'none';
  _storyLoadoutStash = { parent: card.parentNode, next: card.nextSibling, weapon: wSel.value, cls: cSel.value, reopenStory };

  host.appendChild(card);
  card.classList.add('expanded');
  if (typeof applyBossRangedLock === 'function') applyBossRangedLock('story');
  const lo = storyLoadoutValues();
  _setP1Loadout(lo.weapon, lo.cls);
  document.querySelectorAll('#p1WeaponCards .sel-card').forEach(c => {
    c.classList.toggle('card-story-off', !_storyWeaponAllowed(c.dataset.val));
  });
  const desc = document.getElementById('p1Desc');
  if (desc) desc.style.display = 'none';
  overlay.style.display = 'flex';
}

function closeStoryLoadout() {
  const st = _storyLoadoutStash;
  if (!st) return;
  _storyLoadoutStash = null;
  const card = document.getElementById('p1Config');
  const wSel = document.getElementById('p1Weapon');
  const cSel = document.getElementById('p1Class');
  if (_story2 && wSel && cSel) {
    _story2.loadout = { weapon: _storyWeaponAllowed(wSel.value) ? wSel.value : 'sword', cls: cSel.value };
    if (typeof _saveStory2 === 'function') _saveStory2();
  }
  document.querySelectorAll('#p1WeaponCards .sel-card').forEach(c => c.classList.remove('card-story-off'));
  _setP1Loadout(st.weapon, st.cls);
  if (wSel && typeof wSel.disabled === 'boolean') wSel.disabled = !!cSel && cSel.value === 'megaknight';
  if (card && st.parent) st.parent.insertBefore(card, st.next);
  if (typeof applyBossRangedLock === 'function') applyBossRangedLock(gameMode);
  const desc = document.getElementById('p1Desc');
  if (desc) desc.style.display = 'none';
  const overlay = document.getElementById('storyLoadoutOverlay');
  if (overlay) overlay.style.display = 'none';
  _refreshStoryLoadoutLabels();
  if (st.reopenStory) {
    const storyModal = document.getElementById('storyModal');
    if (storyModal) storyModal.style.display = 'flex';
  }
}

// Pixel positions (canvas 780 × 565) for every purchasable node.
const _ST_POS = {
  __root:           { x: 390, y: 28  },
  highJump1:        { x: 82,  y: 105 },
  highJump2:        { x: 82,  y: 185 },
  doubleJump:       { x: 52,  y: 265 },
  fastFall:         { x: 122, y: 265 },
  tankier1:         { x: 210, y: 105 },
  tankier2:         { x: 193, y: 185 },
  superMeter:       { x: 158, y: 265 },
  tankier3:         { x: 208, y: 265 },
  dimensionalPatch: { x: 252, y: 185 },
  voidStep:         { x: 260, y: 265 },
  lastStrike:       { x: 330, y: 130 },
  echoRage:         { x: 305, y: 210 },
  mirrorFracture:   { x: 358, y: 210 },
  temporalBreak:    { x: 292, y: 290 },
  // Mastery sits at the bottom and is gated behind the other branches.
  masterRoot:       { x: 390, y: 400 },
  fragmentHunger:   { x: 348, y: 475 },
  architects:       { x: 432, y: 475 },
  coreCollapse:     { x: 440, y: 530 },
  fastMove1:        { x: 458, y: 130 },
  fastMove2:        { x: 478, y: 210 },
  fastMove3:        { x: 488, y: 290 },
  fractureSurge:    { x: 420, y: 210 },
  heavyHit1:        { x: 660, y: 105 },
  heavyHit2:        { x: 643, y: 185 },
  weaponAbility:    { x: 643, y: 265 },
  comboExtender:    { x: 643, y: 345 },
  criticalEdge:     { x: 643, y: 425 },
  impactShield:     { x: 710, y: 185 },
};

function _stFlatNodes() {
  if (typeof STORY_SKILL_TREE === 'undefined') return [];
  const out = [];
  for (const [bk, branch] of Object.entries(STORY_SKILL_TREE)) {
    for (const n of branch.nodes) {
      const p = _ST_POS[n.id];
      if (p) out.push({ ...n, x: p.x, y: p.y, branchKey: bk, branchColor: branch.color });
    }
  }
  return out;
}

function openSkillTreeModal() {
  if (typeof closeStoryPath === 'function') closeStoryPath();
  const modal = document.getElementById('skillTreeModal');
  if (!modal) return;
  modal.style.display = 'flex';
  _renderSkillTreeModal();
}

function closeSkillTreeModal() {
  if (_skillTreeAnimId) { cancelAnimationFrame(_skillTreeAnimId); _skillTreeAnimId = null; }
  const modal = document.getElementById('skillTreeModal');
  if (modal) modal.style.display = 'none';
}

// Skill node shape: a diamond, same family as the map's boss stops.
function _stDiamond(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
  ctx.closePath();
}

function _renderSkillTreeModal() {
  if (_skillTreeAnimId) { cancelAnimationFrame(_skillTreeAnimId); _skillTreeAnimId = null; }

  const container = document.getElementById('skillTreeModalContent');
  if (!container) return;
  container.innerHTML = '';

  const sk  = (_story2 && _story2.skillTree) || {};
  const exp = (_story2 && _story2.exp) || 0;
  const expEl = document.getElementById('skillTreeExpDisplay');
  if (expEl) expEl.textContent = exp;

  if (typeof STORY_SKILL_TREE === 'undefined') {
    container.innerHTML = '<p style="color:#556;font-size:0.8rem;padding:16px;">Skill tree not available yet.</p>';
    return;
  }

  // Jump link: the mastery panel is below the tall canvas, so it needs a visible link.
  const jumpRow = document.createElement('div');
  jumpRow.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:6px;';
  const jumpBtn = document.createElement('button');
  jumpBtn.textContent = '⚔️ Weapon Mastery ↓';
  jumpBtn.className = 'st-jump';
  jumpBtn.style.cssText = 'padding:4px 10px;font-size:0.68rem;cursor:pointer;letter-spacing:1px;';
  jumpBtn.addEventListener('click', () => {
    const s = container.querySelector('#weaponMasterySection');
    if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  jumpRow.appendChild(jumpBtn);
  container.appendChild(jumpRow);

  const CW = 780, CH = 565, R = 20;
  const canvas = document.createElement('canvas');
  canvas.width  = CW;
  canvas.height = CH;
  canvas.style.cssText = 'display:block;width:100%;height:auto;cursor:default;';
  container.style.position = 'relative';
  container.appendChild(canvas);

  const ttip = document.createElement('div');
  ttip.style.cssText = [
    'position:absolute','pointer-events:none','display:none',
    'background:rgba(12,9,18,0.98)','border:1px solid #8C5E1F',
    'border-radius:2px','padding:10px 14px','font-size:0.72rem','color:#F3E8D2',
    'max-width:215px','z-index:20','font-family:inherit','line-height:1.45',
    'box-shadow:0 0 0 2px #07060C, 0 4px 22px rgba(0,0,0,0.75)',
  ].join(';');
  container.appendChild(ttip);

  const ctx   = canvas.getContext('2d');
  const nodes = _stFlatNodes();
  const nodeMap = {};
  for (const n of nodes) nodeMap[n.id] = n;

  const reqAnyEdges = [];
  for (const n of nodes) {
    if (n.requiresAny) {
      for (const rid of n.requiresAny) {
        if (nodeMap[rid]) reqAnyEdges.push({ from: nodeMap[rid], to: n });
      }
    }
  }

  const branchRoots = nodes.filter(n => !n.requires && !n.requiresAny);

  let frame = 0;

  function draw() {
    const csk  = (_story2 && _story2.skillTree) || {};
    const cexp = (_story2 && _story2.exp) || 0;

    ctx.clearRect(0, 0, CW, CH);

    ctx.fillStyle = '#0B0812';
    ctx.fillRect(0, 0, CW, CH);

    let g = ctx.createRadialGradient(390, 28, 0, 390, 28, 340);
    g.addColorStop(0, 'rgba(226,150,70,0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CW, CH);

    g = ctx.createRadialGradient(390, 400, 0, 390, 400, 200);
    g.addColorStop(0, 'rgba(140,50,210,0.13)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CW, CH);

    const rp = _ST_POS.__root;
    for (const n of branchRoots) {
      const owned = !!csk[n.id];
      ctx.save();
      ctx.lineWidth   = owned ? 2 : 1.5;
      ctx.strokeStyle = owned ? n.branchColor + 'bb' : n.branchColor + '3c';
      ctx.beginPath();
      ctx.moveTo(rp.x, rp.y);
      const cpx1 = rp.x + (n.x - rp.x) * 0.35;
      const cpy1 = rp.y + 55;
      const cpx2 = n.x;
      const cpy2 = n.y - 35;
      ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, n.x, n.y);
      ctx.stroke();
      ctx.restore();
    }

    for (const n of nodes) {
      if (!n.requires) continue;
      const parent = nodeMap[n.requires];
      if (!parent) continue;
      const pOwned = !!csk[parent.id];
      const nOwned = !!csk[n.id];
      ctx.save();
      ctx.lineWidth   = pOwned ? 2.5 : 1.5;
      ctx.strokeStyle = pOwned
        ? (nOwned ? n.branchColor + 'cc' : n.branchColor + '55')
        : n.branchColor + '1e';
      if (!pOwned) ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);
      const dx = n.x - parent.x, dy = n.y - parent.y;
      ctx.bezierCurveTo(
        parent.x + dx * 0.15, parent.y + dy * 0.4,
        n.x - dx * 0.15,      n.y - dy * 0.4,
        n.x, n.y
      );
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    for (const e of reqAnyEdges) {
      const srcOwned  = !!csk[e.from.id];
      const destOwned = !!csk[e.to.id];
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.lineWidth   = 1.5;
      ctx.strokeStyle = srcOwned ? '#cc88ff55' : '#cc88ff18';
      ctx.beginPath();
      ctx.moveTo(e.from.x, e.from.y);
      const cpx1 = e.from.x + (e.to.x - e.from.x) * 0.28;
      const cpy1 = e.from.y + 70;
      const cpx2 = e.to.x + (e.from.x - e.to.x) * 0.12;
      const cpy2 = e.to.y - 70;
      ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, e.to.x, e.to.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    for (const n of nodes) {
      const owned   = !!csk[n.id];
      const reqMet  = _skillNodeReqMet(n, csk);
      const canBuy  = !owned && reqMet && cexp >= n.expCost;
      const locked  = !owned && !reqMet;

      ctx.save();

      ctx.fillStyle = '#07060C';
      _stDiamond(ctx, n.x, n.y + 3, R + 3); ctx.fill();
      _stDiamond(ctx, n.x, n.y, R + 3); ctx.fill();

      if (owned) {
        ctx.shadowColor = n.branchColor;
        ctx.shadowBlur  = 12 + Math.sin(frame * 0.035) * 4;
      } else if (canBuy) {
        ctx.shadowColor = n.branchColor;
        ctx.shadowBlur  = 6 + Math.sin(frame * 0.075 + n.x * 0.02) * 6;
      }

      _stDiamond(ctx, n.x, n.y, R);
      const grd = ctx.createLinearGradient(n.x - R, n.y - R, n.x + R, n.y + R);
      if (owned) {
        grd.addColorStop(0, '#FFF6E0');
        grd.addColorStop(0.35, n.branchColor);
        grd.addColorStop(1, n.branchColor + '99');
      } else if (canBuy) {
        grd.addColorStop(0, '#3A2A38'); grd.addColorStop(1, '#1B1522');
      } else {
        grd.addColorStop(0, '#241D2E'); grd.addColorStop(1, '#110D18');
      }
      ctx.fillStyle = grd;
      ctx.fill();

      // Rim: gold once owned, the branch colour while it can be bought.
      ctx.lineWidth   = owned ? 2 : canBuy ? 2 : 1.2;
      ctx.strokeStyle = owned ? '#FFE7A6'
                       : canBuy ? n.branchColor
                       : '#3A3046';
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      if (owned) {
        ctx.fillStyle = 'rgba(7,6,12,0.8)';
        ctx.font      = 'bold 14px "Segoe UI", Arial, sans-serif';
        ctx.fillText('✓', n.x, n.y + 1);
      } else if (locked) {
        ctx.save();
        _stDiamond(ctx, n.x, n.y, R - 1); ctx.clip();
        for (const sgn of [1, -1]) {
          ctx.strokeStyle = '#07060C'; ctx.lineWidth = 6; ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(n.x - R, n.y - R * 0.55 * sgn); ctx.lineTo(n.x + R, n.y + R * 0.55 * sgn); ctx.stroke();
          ctx.strokeStyle = '#8B8496'; ctx.lineWidth = 4; ctx.setLineDash([5, 2]);
          ctx.beginPath(); ctx.moveTo(n.x - R, n.y - R * 0.55 * sgn); ctx.lineTo(n.x + R, n.y + R * 0.55 * sgn); ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();
      } else if (canBuy) {
        ctx.fillStyle = n.branchColor;
        ctx.font      = "11px 'Russo One', 'Segoe UI', sans-serif";
        ctx.fillText(String(n.expCost), n.x, n.y + 1);
      }

      ctx.shadowColor  = '#000';
      ctx.shadowBlur   = 5;
      ctx.fillStyle    = owned ? n.branchColor : canBuy ? '#F3E8D2' : '#6E6558';
      ctx.font         = "700 9.5px 'Rajdhani', 'Segoe UI', Arial, sans-serif";
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(n.name, n.x, n.y + R + 6);
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = '#07060C';
    _stDiamond(ctx, rp.x, rp.y + 3, 27); ctx.fill();
    _stDiamond(ctx, rp.x, rp.y, 27); ctx.fill();
    ctx.shadowColor = '#F2A03C';
    ctx.shadowBlur  = 10 + Math.sin(frame * 0.04) * 6;
    _stDiamond(ctx, rp.x, rp.y, 24);
    const rg2 = ctx.createLinearGradient(rp.x - 24, rp.y - 24, rp.x + 24, rp.y + 24);
    rg2.addColorStop(0, '#FFE7A6');
    rg2.addColorStop(0.45, '#E2B255');
    rg2.addColorStop(1, '#A8731F');
    ctx.fillStyle = rg2;
    ctx.fill();
    ctx.strokeStyle = '#FFF0C2';
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.shadowBlur  = 0;
    ctx.fillStyle = '#07060C';
    _stDiamond(ctx, rp.x, rp.y, 7); ctx.fill();
    ctx.fillStyle   = '#E2B255';
    ctx.font        = "italic 9px 'Potta One', 'Russo One', sans-serif";
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('FRAGMENT CORE', rp.x + 78, rp.y - 5);
    ctx.restore();

    if (typeof STORY_SKILL_TREE !== 'undefined') {
      for (const [, branch] of Object.entries(STORY_SKILL_TREE)) {
        const firstNode = branch.nodes[0];
        const fp = firstNode && _ST_POS[firstNode.id];
        if (!fp) continue;
        ctx.save();
        ctx.fillStyle = branch.color;
        ctx.font      = "italic 10px 'Potta One', 'Russo One', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = '#07060C'; ctx.shadowBlur = 4;
        ctx.fillText(branch.label.toUpperCase(), fp.x, fp.y - R - 9);
        ctx.restore();
      }
    }

    frame++;
    _skillTreeAnimId = requestAnimationFrame(draw);
  }
  draw();

  _renderWeaponMasterySection(container);

  function hitNode(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = CW / rect.width, sy = CH / rect.height;
    const mx = (e.clientX - rect.left) * sx;
    const my = (e.clientY - rect.top)  * sy;
    return nodes.find(n => Math.hypot(n.x - mx, n.y - my) < R + 3);
  }

  canvas.addEventListener('mousemove', (e) => {
    const n = hitNode(e);
    if (!n) {
      ttip.style.display  = 'none';
      canvas.style.cursor = 'default';
      return;
    }
    const csk  = (_story2 && _story2.skillTree) || {};
    const cexp = (_story2 && _story2.exp) || 0;
    const owned  = !!csk[n.id];
    const reqMet = _skillNodeReqMet(n, csk);
    const canBuy = !owned && reqMet && cexp >= n.expCost;
    const locked = !owned && !reqMet;
    canvas.style.cursor = canBuy ? 'pointer' : 'default';

    const _core = typeof STORY_CORE_UNLOCKS !== 'undefined' && STORY_CORE_UNLOCKS.includes(n.id);

    let st;
    if (_core)       st = `<span style="color:#66ee99">✓ Unlocked — core move, free from the start</span>`;
    else if (owned)  st = `<span style="color:#66ee99">✓ Unlocked</span>`;
    else if (canBuy) st = `<span style="color:${n.branchColor}">${n.expCost} EXP — click to unlock</span>`;
    else if (locked) {
      const need = n.requiresAny
        ? 'Need any: ' + n.requiresAny.map(r => (nodeMap[r] || {}).name || r).join(', ')
        : 'Requires: ' + ((nodeMap[n.requires] || {}).name || n.requires || '');
      st = `<span style="color:#8E8371">🔒 ${need}</span>`;
    } else {
      st = `<span style="color:#8E8371">${n.expCost} EXP (have ${cexp})</span>`;
    }

    ttip.innerHTML = `
      <div style="font-family:'Potta One','Russo One',sans-serif;font-style:italic;text-transform:uppercase;letter-spacing:0.8px;color:${n.branchColor};margin-bottom:5px;font-size:0.8rem;">${n.name}</div>
      <div style="color:#B9AC93;margin-bottom:7px;font-size:0.72rem;line-height:1.4;">${n.desc}</div>
      <div style="font-size:0.67rem;">${st}</div>`;
    ttip.style.display = 'block';

    const cRect = container.getBoundingClientRect();
    let tx = e.clientX - cRect.left + 18;
    let ty = e.clientY - cRect.top  - 12;
    if (tx + 225 > container.clientWidth) tx = e.clientX - cRect.left - 232;
    if (ty < 0) ty = 4;
    ttip.style.left = tx + 'px';
    ttip.style.top  = ty + 'px';
  });

  canvas.addEventListener('mouseleave', () => {
    ttip.style.display  = 'none';
    canvas.style.cursor = 'default';
  });

  canvas.addEventListener('click', (e) => {
    const n = hitNode(e);
    if (!n) return;
    const csk  = (_story2 && _story2.skillTree) || {};
    const cexp = (_story2 && _story2.exp) || 0;
    if (csk[n.id] || !_skillNodeReqMet(n, csk) || cexp < n.expCost) return;
    _story2.skillTree        = csk;
    csk[n.id]                = true;
    _story2.exp              = cexp - n.expCost;
    if (expEl) expEl.textContent = _story2.exp;
    if (typeof _saveStory2 === 'function') _saveStory2();
    if (typeof showToast   === 'function') showToast('✓ ' + n.name + ' unlocked!');
    // The canvas redraws from _story2, but the mastery panel is static DOM, so rebuild it.
    _renderWeaponMasterySection(container);
  });
}

function _meleeWeaponKeys() {
  if (typeof WEAPON_KEYS === 'undefined' || typeof WEAPONS === 'undefined') return ['sword'];
  const _toneOK = k => typeof STORY_TONE_EXCLUDED_WEAPONS === 'undefined' || !STORY_TONE_EXCLUDED_WEAPONS.includes(k);
  return WEAPON_KEYS.filter(k => WEAPONS[k] && WEAPONS[k].type !== 'ranged' && _toneOK(k));
}

function _renderWeaponMasterySection(container) {
  if (!container || typeof STORY_WEAPON_MASTERY === 'undefined') return;
  const old = container.querySelector('#weaponMasterySection');
  if (old) old.remove();

  const melee = _meleeWeaponKeys();
  if (!melee.includes(_masterySelectedWeapon)) _masterySelectedWeapon = melee[0] || 'sword';
  const wKey = _masterySelectedWeapon;
  const wm   = (_story2 && _story2.weaponSkills && _story2.weaponSkills[wKey]) || {};
  const exp  = (_story2 && _story2.exp) || 0;

  const wrap = document.createElement('div');
  wrap.id = 'weaponMasterySection';
  wrap.style.cssText = 'margin-top:18px;padding-top:14px;border-top:1px solid rgba(120,120,200,0.18);';

  const head = document.createElement('div');
  head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap;';
  head.innerHTML = `<span style="font-size:0.72rem;letter-spacing:2px;text-transform:uppercase;color:#ffcc66;font-weight:700;">⚔️ Weapon Mastery</span>
    <span style="font-size:0.68rem;color:#aaff88;">${exp} EXP</span>`;
  const sel = document.createElement('select');
  sel.style.cssText = 'background:rgba(10,10,26,0.9);color:#dde4ff;border:1px solid rgba(120,120,200,0.35);border-radius:6px;padding:5px 9px;font-size:0.72rem;font-family:inherit;';
  for (const k of melee) {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = (WEAPONS[k] && WEAPONS[k].name) || k;
    if (k === wKey) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => { _masterySelectedWeapon = sel.value; _renderWeaponMasterySection(container); });
  head.appendChild(sel);
  wrap.appendChild(head);

  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex;gap:9px;flex-wrap:wrap;';
  for (const node of STORY_WEAPON_MASTERY) {
    const owned   = !!wm[node.id];
    const reqMet  = !node.requires || !!wm[node.requires];
    const canBuy  = !owned && reqMet && exp >= node.expCost;
    const locked  = !owned && !reqMet;

    const card = document.createElement('div');
    card.style.cssText = [
      'border-radius:9px', 'padding:9px 11px 8px', 'width:150px', 'box-sizing:border-box',
      `border:1px solid ${owned ? '#ffcc66aa' : canBuy ? '#ffcc6655' : 'rgba(255,255,255,0.07)'}`,
      `background:${owned ? 'rgba(60,48,20,0.5)' : canBuy ? 'rgba(30,26,50,0.5)' : 'rgba(5,5,18,0.3)'}`,
      `opacity:${locked ? '0.35' : '1'}`,
      canBuy ? 'cursor:pointer;' : 'cursor:default;',
    ].join(';');

    const status = owned
      ? '<span style="color:#66ee99">✓ Unlocked</span>'
      : locked
      ? `<span style="color:#556">🔒 Needs ${((STORY_WEAPON_MASTERY.find(n => n.id === node.requires) || {}).name) || node.requires}</span>`
      : `<span style="color:${canBuy ? '#ffcc66' : '#556'}">${node.expCost} EXP</span>`;

    card.innerHTML = `<div style="font-size:0.78rem;color:${owned ? '#ffe0a0' : canBuy ? '#dde4ff' : '#556'};font-weight:700;margin-bottom:3px;">${node.name}</div>
      <div style="font-size:0.62rem;color:#8899bb;line-height:1.35;margin-bottom:5px;">${node.desc}</div>
      <div style="font-size:0.66rem;">${status}</div>`;
    if (canBuy) card.addEventListener('click', () => _buyWeaponMasteryNode(wKey, node, container));
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
  container.appendChild(wrap);
}

function _buyWeaponMasteryNode(weaponKey, node, container) {
  const ws = _story2.weaponSkills = _story2.weaponSkills || {};
  const wm = ws[weaponKey] = ws[weaponKey] || {};
  const exp = _story2.exp || 0;
  if (wm[node.id]) return;
  if (node.requires && !wm[node.requires]) return;
  if (exp < node.expCost) return;
  _story2.exp = exp - node.expCost;
  wm[node.id] = true;
  if (typeof _saveStory2 === 'function') _saveStory2();
  const expEl = document.getElementById('skillTreeExpDisplay');
  if (expEl) expEl.textContent = _story2.exp;
  _renderWeaponMasterySection(container);
  if (typeof showToast === 'function') showToast(`✓ ${node.name} — ${(WEAPONS[weaponKey] && WEAPONS[weaponKey].name) || weaponKey}`);
}

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
  let ov = document.getElementById('prologueOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'prologueOverlay';
    ov.style.cssText = [
      // Above storyModal (9000): the cold open opens over the chapter list
      'position:fixed', 'inset:0', 'z-index:9500',
      'background:#000', 'display:flex', 'flex-direction:column',
      'align-items:center', 'justify-content:center',
      'cursor:pointer', 'font-family:"Segoe UI",Arial,sans-serif',
      'transition:opacity 0.8s ease',
    ].join(';');
    document.body.appendChild(ov);
  }

  const linesEl = document.createElement('div');
  linesEl.style.cssText = 'text-align:center; max-width:520px; padding:0 24px;';
  ov.innerHTML = '';
  ov.appendChild(linesEl);

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

  const hint = document.createElement('div');
  hint.textContent = 'press any key to skip';
  hint.style.cssText = 'position:absolute;bottom:26px;font-size:0.7rem;letter-spacing:1px;color:rgba(200,200,220,0.4);font-family:inherit;';
  ov.appendChild(hint);

  const bail = document.createElement('button');
  bail.textContent = 'Just let me fight →';
  bail.style.cssText = [
    'position:absolute', 'top:22px', 'right:24px',
    'padding:7px 16px', 'background:rgba(255,255,255,0.06)',
    'color:rgba(230,230,245,0.75)', 'border:1px solid rgba(255,255,255,0.18)',
    'border-radius:6px', 'font-size:0.76rem', 'letter-spacing:0.5px',
    'cursor:pointer', 'font-family:inherit',
  ].join(';');
  bail.onmouseover = () => { bail.style.background = 'rgba(255,255,255,0.14)'; };
  bail.onmouseout  = () => { bail.style.background = 'rgba(255,255,255,0.06)'; };
  ov.appendChild(bail);

  ov.style.opacity = '0';
  ov.style.display = 'flex';
  requestAnimationFrame(() => { ov.style.opacity = '1'; });

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

  const lastDelay = _PROLOGUE_LINES[_PROLOGUE_LINES.length - 1].delay + 1400;
  setTimeout(() => { btn.style.opacity = '1'; }, lastDelay);

  let _dismissed = false;
  function dismiss(e, after) {
    if (e) e.stopPropagation();
    if (_dismissed) return;
    _dismissed = true;
    btn.onclick = null;
    ov.onclick  = null;
    window.removeEventListener('keydown', onKey, true);
    ov.style.opacity = '0';
    setTimeout(() => {
      ov.style.display = 'none';
      (after || onDone)();
    }, 820);
  }
  // Skippable from the first frame. The Begin button only appears after ~8.6s.
  function onKey(e) {
    if (e.key === 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
    dismiss(e);
  }
  window.addEventListener('keydown', onKey, true);
  btn.onclick = dismiss;
  bail.onclick = (e) => dismiss(e, () => {
    if (typeof quickFight === 'function') quickFight();
  });
  setTimeout(() => { ov.onclick = dismiss; }, lastDelay);
}

