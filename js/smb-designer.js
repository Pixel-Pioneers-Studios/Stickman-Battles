'use strict';

// ============================================================
// STICKMAN EVOLUTION — CREATOR STUDIO (map + weapon designer)
// Opened from the main menu Designer card. The live in-match map editor
// (Training, F4) lives further down and shares only the small style helpers.
//
// Both editors draw with the game's own renderer: while the menu is up the
// game canvas is idle, so each frame the arena (or a real Fighter) is drawn
// into it with drawBackground/drawPlatforms/Fighter.draw and copied into the
// editor canvas. What you edit is what you play.
// ============================================================

// ---- Map editor state ----
let _dPlatforms  = [];          // platforms being edited
let _dHazards    = new Set();   // hazard keys (see _D_HAZARDS)
let _dSelected   = null;        // index of selected platform
let _dDragging   = false;
let _dResizing   = false;       // true when dragging a resize handle
let _dResizeDir  = null;        // 'e' | 'w' | 's' | 'se' | 'sw'
let _dDragOffX   = 0;
let _dDragOffY   = 0;
let _dHistory    = [];          // undo stack (JSON platform snapshots)
let _dBaseArena  = 'grass';
let _dMeta       = { name: 'My Map', sky: null };  // sky null = base arena's sky
let _dCanvas     = null;
let _dCtx        = null;
let _dAnimId     = null;
let _dSnapGrid   = true;        // grid snap toggle
let _dBgKey      = null;        // base arena whose bg elements are generated
let _dKeyHandler = null;
const _D_SNAP    = 20;          // grid snap size (game units)
const _D_MAX_PLATFORMS = 60;

function _dSnapVal(v) { return _dSnapGrid ? Math.round(v / _D_SNAP) * _D_SNAP : v; }

function designerToggleSnap() {
  _dSnapGrid = !_dSnapGrid;
  const btn = document.getElementById('dSnapBtn');
  if (btn) { btn.textContent = `Snap ${_dSnapGrid ? 'on' : 'off'}`; btn.classList.toggle('on', _dSnapGrid); }
}

// Arenas a custom map can be built on: single-screen (900 wide), not story- or
// boss-only. Filtered again at runtime against ARENAS.
const _D_BASES = ['grass', 'city', 'forest', 'ice', 'lava', 'space', 'ruins', 'cave', 'colosseum',
  'cyberpunk', 'underwater', 'volcano', 'desert', 'haunted', 'mushroom', 'clouds', 'suburb', 'rural', 'sewer'];

// Every hazard here is wired to a real engine system (see _dBuildArena).
const _D_HAZARDS = [
  { k: 'lava',      label: 'Lava floor',   tip: 'Falling below the floor line burns' },
  { k: 'lowgrav',   label: 'Low gravity',  tip: 'Floaty jumps, long air time' },
  { k: 'heavygrav', label: 'Heavy gravity', tip: 'Short jumps, fast falls' },
  { k: 'ice',       label: 'Ice',          tip: 'Slippery footing' },
  { k: 'wind',      label: 'Wind gusts',   tip: 'Gusts shove everyone sideways' },
  { k: 'meteors',   label: 'Meteors',      tip: 'Telegraphed meteor strikes' },
  { k: 'beast',     label: 'Forest Beast', tip: 'A beast joins the fight now and then' },
  { k: 'yeti',      label: 'Yeti',         tip: 'A yeti joins the fight now and then' },
];
const _D_HAZARD_KEYS = new Set(_D_HAZARDS.map(h => h.k));

// ---- PRESET LAYOUTS ----
const _D_PRESETS = {
  arena: [
    { x: -60, y: 480, w: 1020, h: 40, isFloor: true },
    { x: 370, y: 200, w: 160, h: 16 },
    { x: 155, y: 275, w: 155, h: 16 },
    { x: 590, y: 275, w: 155, h: 16 },
    { x:  18, y: 150, w: 120, h: 16 },
    { x: 762, y: 150, w: 120, h: 16 },
  ],
  parkour: [
    { x: -60, y: 480, w: 200, h: 40, isFloor: true },
    { x: 140, y: 400, w:  80, h: 14 },
    { x: 240, y: 340, w:  70, h: 14 },
    { x: 330, y: 275, w:  70, h: 14 },
    { x: 420, y: 215, w:  70, h: 14 },
    { x: 510, y: 155, w:  70, h: 14 },
    { x: 600, y: 100, w: 200, h: 14 },
    { x: 700, y: 480, w: 200, h: 40, isFloor: true },
  ],
  boss: [
    { x: 0,   y: 460, w: 900, h: 60, isFloor: true },
    { x: 300, y: 200, w: 300, h: 18 },
    { x:  60, y: 280, w: 150, h: 18 },
    { x: 690, y: 280, w: 150, h: 18 },
    { x: 375, y:  90, w: 150, h: 18 },
  ],
};

function designerApplyPreset(name) {
  const pl = _D_PRESETS[name];
  if (!pl) return;
  _dHistory.push(JSON.stringify(_dPlatforms));
  _dPlatforms = pl.map(p => Object.assign({ oscX: 0, oscY: 0 }, p));
  _dSelected  = null;
  _dSyncControls();
}

// ---- Icons (the game's own SVG set, smb-icons.js) ----
function _dIco(name) {
  return `<svg class="smb-icon cs-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
}

// ---- Styles: one stylesheet, the menu's tokens (SMB.css :root) ----
function _dInjectStyle() {
  if (document.getElementById('csStyle')) return;
  const st = document.createElement('style');
  st.id = 'csStyle';
  st.textContent = `
  #designerOverlay { position:fixed; top:4vh; left:50%; transform:translateX(-50%);
    width:min(1040px,96vw); max-height:92vh; display:none; flex-direction:column; overflow:hidden;
    background:var(--ui-surface,#141926); border:1px solid var(--ui-line-strong,rgba(150,170,210,0.26));
    border-radius:6px; box-shadow:var(--ui-shadow,0 18px 44px rgba(0,0,0,0.55)); z-index:2000;
    color:var(--ui-text,#E6EBF5); font-family:inherit; font-size:14px; user-select:none; }
  #designerOverlay .cs-head { display:flex; align-items:center; justify-content:space-between; gap:12px;
    padding:10px 14px; border-bottom:1px solid var(--ui-line,rgba(150,170,210,0.14)); cursor:grab; flex-shrink:0; }
  #designerOverlay .cs-title { display:flex; align-items:center; gap:8px; font-weight:800; letter-spacing:0.08em;
    text-transform:uppercase; font-size:0.82rem; }
  #designerOverlay .cs-ico { width:16px; height:16px; flex-shrink:0; }
  #designerOverlay .cs-tabs { display:flex; gap:2px; background:var(--ui-ground,#0A0C12); padding:3px; border-radius:4px; }
  #designerOverlay .cs-tab { background:none; border:none; color:var(--ui-muted,#8B97AD); padding:6px 16px;
    border-radius:3px; cursor:pointer; font:inherit; font-size:0.8rem; font-weight:700; letter-spacing:0.04em; }
  #designerOverlay .cs-tab.on { background:var(--ui-raised,#232B3D); color:var(--ui-text,#E6EBF5); }
  #designerOverlay .cs-x { background:none; border:1px solid var(--ui-line,rgba(150,170,210,0.14)); color:var(--ui-muted,#8B97AD);
    width:30px; height:30px; border-radius:3px; cursor:pointer; font-size:1rem; line-height:1; }
  #designerOverlay .cs-x:hover { color:var(--ui-text,#E6EBF5); border-color:var(--ui-line-strong,rgba(150,170,210,0.26)); }
  #designerOverlay .cs-body { display:flex; gap:14px; padding:14px; overflow:auto; flex:1; min-height:0; }
  #designerOverlay .cs-main { flex:1; min-width:0; display:flex; flex-direction:column; gap:8px; }
  #designerOverlay .cs-side { width:236px; flex-shrink:0; display:flex; flex-direction:column; gap:12px; overflow-y:auto; }
  #designerOverlay .cs-sec { display:flex; flex-direction:column; gap:7px; }
  #designerOverlay .cs-label { font-size:0.68rem; font-weight:800; letter-spacing:0.12em; text-transform:uppercase;
    color:var(--ui-faint,#5D6880); }
  #designerOverlay .cs-row { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
  #designerOverlay .cs-hint { font-size:0.74rem; color:var(--ui-muted,#8B97AD); line-height:1.45; }
  #designerOverlay .cs-hint b { color:var(--ui-text,#E6EBF5); font-weight:700; }
  #designerOverlay .cs-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px;
    background:var(--ui-surface-2,#1B2131); color:var(--ui-text,#E6EBF5); border:1px solid var(--ui-line-strong,rgba(150,170,210,0.26));
    border-radius:3px; padding:7px 12px; cursor:pointer; font:inherit; font-size:0.78rem; font-weight:700; }
  #designerOverlay .cs-btn:hover { background:var(--ui-raised,#232B3D); }
  #designerOverlay .cs-btn:disabled { opacity:0.4; cursor:not-allowed; }
  #designerOverlay .cs-btn.primary { background:var(--ember,#F2762B); color:var(--ember-ink,#160A02); border-color:var(--ember,#F2762B); }
  #designerOverlay .cs-btn.primary:hover { background:var(--ember-hover,#FF8A42); }
  #designerOverlay .cs-btn.ghost { background:none; }
  #designerOverlay .cs-btn.small { padding:4px 9px; font-size:0.72rem; }
  #designerOverlay .cs-btn.danger:hover { color:var(--ui-bad,#E05A4E); border-color:var(--ui-bad,#E05A4E); }
  #designerOverlay .cs-btn.wide { flex:1; }
  #designerOverlay .cs-chip { background:none; border:1px solid var(--ui-line-strong,rgba(150,170,210,0.26)); color:var(--ui-muted,#8B97AD);
    border-radius:999px; padding:4px 10px; cursor:pointer; font:inherit; font-size:0.72rem; font-weight:700; }
  #designerOverlay .cs-chip.on, #designerOverlay .cs-btn.on { background:var(--ember-soft,rgba(242,118,43,0.14));
    border-color:var(--ember-line,rgba(242,118,43,0.42)); color:var(--ember,#F2762B); }
  #designerOverlay input[type=text], #designerOverlay input[type=number], #designerOverlay select {
    background:var(--ui-ground,#0A0C12); color:var(--ui-text,#E6EBF5); border:1px solid var(--ui-line-strong,rgba(150,170,210,0.26));
    border-radius:3px; padding:6px 8px; font:inherit; font-size:0.8rem; outline:none; min-width:0; }
  #designerOverlay input:focus, #designerOverlay select:focus { border-color:var(--ember-line,rgba(242,118,43,0.42)); }
  #designerOverlay input[type=number] { width:64px; }
  #designerOverlay input[type=color] { width:34px; height:28px; padding:0; border:1px solid var(--ui-line-strong,rgba(150,170,210,0.26));
    border-radius:3px; background:none; cursor:pointer; }
  #designerOverlay input[type=range] { width:100%; accent-color:var(--ember,#F2762B); }
  #designerOverlay label.cs-check { display:flex; align-items:center; gap:7px; font-size:0.8rem; cursor:pointer; }
  #designerOverlay .cs-canvas { width:100%; aspect-ratio:900/520; border-radius:4px; display:block; cursor:crosshair;
    border:1px solid var(--ui-line,rgba(150,170,210,0.14)); background:#000; }
  #designerOverlay .cs-list { display:flex; flex-direction:column; gap:4px; max-height:150px; overflow-y:auto; }
  #designerOverlay .cs-item { display:flex; align-items:center; gap:6px; padding:6px 8px; border-radius:3px;
    background:var(--ui-ground,#0A0C12); border:1px solid var(--ui-line,rgba(150,170,210,0.14)); font-size:0.78rem; }
  #designerOverlay .cs-item span { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  #designerOverlay .cs-empty { font-size:0.74rem; color:var(--ui-faint,#5D6880); }
  #designerOverlay .cs-bases { display:grid; grid-template-columns:repeat(6,1fr); gap:5px; }
  #designerOverlay .cs-base { display:flex; flex-direction:column; align-items:center; gap:3px; padding:7px 2px 5px;
    background:var(--ui-ground,#0A0C12); border:1px solid var(--ui-line,rgba(150,170,210,0.14)); border-radius:3px;
    color:var(--ui-muted,#8B97AD); cursor:pointer; font:inherit; font-size:0.64rem; font-weight:700; }
  #designerOverlay .cs-base .cs-ico { width:22px; height:22px; }
  #designerOverlay .cs-base.on { border-color:var(--ember-line,rgba(242,118,43,0.42)); color:var(--ember,#F2762B); background:var(--ember-soft,rgba(242,118,43,0.14)); }
  #designerOverlay .cs-stat { display:flex; flex-direction:column; gap:3px; }
  #designerOverlay .cs-stat-top { display:flex; justify-content:space-between; font-size:0.78rem; }
  #designerOverlay .cs-stat-top b { font-variant-numeric:tabular-nums; }
  #designerOverlay .cs-meter { height:8px; border-radius:2px; background:var(--ui-ground,#0A0C12); overflow:hidden;
    border:1px solid var(--ui-line,rgba(150,170,210,0.14)); }
  #designerOverlay .cs-meter i { display:block; height:100%; background:var(--ui-good,#3FB984); transition:width 0.12s; }
  #designerOverlay .cs-meter.over i { background:var(--ui-bad,#E05A4E); }
  #designerOverlay .cs-preview { width:100%; aspect-ratio:1; border-radius:4px; display:block;
    border:1px solid var(--ui-line,rgba(150,170,210,0.14)); background:#000; }
  .cs-modal { position:fixed; inset:0; background:rgba(0,0,0,0.72); z-index:3000; display:flex; align-items:center; justify-content:center; padding:16px; }
  .cs-modal-box { width:min(460px,100%); background:var(--ui-surface,#141926); border:1px solid var(--ui-line-strong,rgba(150,170,210,0.26));
    border-radius:6px; padding:18px; display:flex; flex-direction:column; gap:12px; color:var(--ui-text,#E6EBF5); font-family:inherit; }
  .cs-modal-box h3 { margin:0; font-size:0.95rem; letter-spacing:0.04em; }
  .cs-modal-box p { margin:0; font-size:0.8rem; color:var(--ui-muted,#8B97AD); line-height:1.5; }
  .cs-modal-box textarea { width:100%; min-height:88px; resize:vertical; background:var(--ui-ground,#0A0C12); color:var(--ui-text,#E6EBF5);
    border:1px solid var(--ui-line-strong,rgba(150,170,210,0.26)); border-radius:3px; padding:8px; font:0.74rem/1.4 ui-monospace,Menlo,monospace; word-break:break-all; }
  .cs-modal-box .cs-row { display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap; }
  .cs-modal-box button { display:inline-flex; align-items:center; gap:6px; background:var(--ui-surface-2,#1B2131); color:var(--ui-text,#E6EBF5);
    border:1px solid var(--ui-line-strong,rgba(150,170,210,0.26)); border-radius:3px; padding:7px 14px; cursor:pointer; font:inherit; font-size:0.8rem; font-weight:700; }
  .cs-modal-box button.primary { background:var(--ember,#F2762B); color:var(--ember-ink,#160A02); border-color:var(--ember,#F2762B); }
  @media (max-width: 760px) {
    #designerOverlay .cs-body { flex-direction:column; }
    #designerOverlay .cs-side { width:auto; }
    #designerOverlay .cs-bases { grid-template-columns:repeat(4,1fr); }
  }`;
  document.head.appendChild(st);
}

// ---- Build the whole studio (once) ----
function _dBuildOverlay() {
  if (document.getElementById('designerOverlay')) return;
  _dInjectStyle();
  const panel = document.createElement('div');
  panel.id = 'designerOverlay';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Creator Studio');

  const hazardChips = _D_HAZARDS.map(h =>
    `<button class="cs-chip d-hazard-btn" data-h="${h.k}" title="${h.tip}" onclick="designerToggleHazard('${h.k}')">${h.label}</button>`).join('');
  const abilityOpts = _W_ABILITIES.map(a => `<option value="${a.k}">${a.label}</option>`).join('');

  panel.innerHTML = `
  <div class="cs-head" id="dDragHandle">
    <div class="cs-title">${_dIco('wrench')} Creator Studio</div>
    <div class="cs-tabs" role="tablist">
      <button class="cs-tab on" id="dTabMap" role="tab" onclick="designerTab('map')">Map</button>
      <button class="cs-tab" id="dTabWeapon" role="tab" onclick="designerTab('weapon')">Weapon</button>
    </div>
    <button class="cs-x" onclick="closeDesigner()" aria-label="Close" title="Close (Esc)">&times;</button>
  </div>

  <!-- MAP -->
  <div class="cs-body" id="designerMapPanel">
    <div class="cs-main">
      <div class="cs-row">
        <button class="cs-btn small on" id="dSnapBtn" onclick="designerToggleSnap()">Snap on</button>
        <span class="cs-label" style="margin-left:6px;">Start from</span>
        <button class="cs-btn small ghost" onclick="designerResetToBase()">Arena layout</button>
        <button class="cs-btn small ghost" onclick="designerApplyPreset('arena')">Open arena</button>
        <button class="cs-btn small ghost" onclick="designerApplyPreset('parkour')">Parkour</button>
        <button class="cs-btn small ghost" onclick="designerApplyPreset('boss')">Boss stage</button>
      </div>
      <canvas id="designerCanvas" class="cs-canvas" width="900" height="520"></canvas>
      <div class="cs-hint"><b>Click</b> empty space to add a platform &middot; <b>drag</b> to move &middot; drag the <b>handles</b> to resize &middot;
        <b>Delete</b> removes &middot; <b>D</b> duplicates &middot; <b>arrows</b> nudge &middot; <b>Ctrl+Z</b> undo</div>
    </div>
    <div class="cs-side">
      <div class="cs-sec">
        <div class="cs-label">Map</div>
        <input id="dMapName" type="text" value="My Map" maxlength="32" placeholder="Map name" aria-label="Map name">
        <select id="dBaseArena" onchange="designerChangeBase()" aria-label="Base arena"></select>
        <div class="cs-row">
          <label class="cs-check"><input type="checkbox" id="dSkyOn" onchange="designerSyncMeta()"> Custom sky</label>
          <input id="dSkyColor" type="color" value="#1a2440" oninput="designerSyncMeta()" aria-label="Sky color">
        </div>
      </div>
      <div class="cs-sec">
        <div class="cs-label">Selected platform</div>
        <div class="cs-row" id="dPlatRow">
          <label class="cs-hint">W</label><input id="dPlatW" type="number" value="120" min="20" max="900" onchange="designerUpdateSelected()">
          <label class="cs-hint">H</label><input id="dPlatH" type="number" value="14" min="8" max="80" onchange="designerUpdateSelected()">
        </div>
        <label class="cs-check"><input type="checkbox" id="dPlatFloor" onchange="designerUpdateSelected()"> Ground (spawns land here)</label>
        <label class="cs-check"><input type="checkbox" id="dPlatMoving" onchange="designerUpdateSelected()"> Moving platform</label>
        <div class="cs-row">
          <button class="cs-btn small" onclick="designerDuplicate()">Duplicate</button>
          <button class="cs-btn small danger" onclick="designerDeleteSelected()">Delete</button>
          <button class="cs-btn small" onclick="designerUndo()">Undo</button>
        </div>
      </div>
      <div class="cs-sec">
        <div class="cs-label">Hazards</div>
        <div class="cs-row">${hazardChips}</div>
      </div>
      <div class="cs-sec">
        <button class="cs-btn primary" onclick="designerPlay()">${_dIco('play')} Play this map</button>
        <div class="cs-row">
          <button class="cs-btn wide" onclick="designerSave()">${_dIco('check')} Save</button>
          <button class="cs-btn wide" onclick="designerShare()">${_dIco('globe')} Share</button>
        </div>
        <div class="cs-row">
          <button class="cs-btn wide" onclick="designerImport()">${_dIco('clipboard')} Import</button>
          <button class="cs-btn wide ghost danger" onclick="designerClearPlatforms()">Clear all</button>
        </div>
      </div>
      <div class="cs-sec" id="dSavedMaps">
        <div class="cs-label">Your maps</div>
        <div id="dSavedMapsList" class="cs-list"></div>
      </div>
    </div>
  </div>

  <!-- WEAPON -->
  <div class="cs-body" id="designerWeaponPanel" style="display:none;">
    <div class="cs-side" style="width:300px;">
      <canvas id="weaponPreviewCanvas" class="cs-preview" width="560" height="560"></canvas>
      <div class="cs-sec">
        <div class="cs-stat-top"><span class="cs-label">Power</span><b id="wPowerVal">0%</b></div>
        <div class="cs-meter" id="wPowerMeter"><i style="width:0%"></i></div>
        <div class="cs-hint" id="wPowerHint">Custom weapons can match the strongest weapons in the game, not beat them.</div>
      </div>
      <div class="cs-sec">
        <div class="cs-label">Your weapons</div>
        <div id="dSavedWeaponsList" class="cs-list"></div>
      </div>
    </div>
    <div class="cs-main" style="gap:12px;">
      <div class="cs-sec">
        <div class="cs-label">Start from</div>
        <div class="cs-bases" id="wBaseGrid"></div>
      </div>
      <div class="cs-row">
        <input id="wName" type="text" value="My Weapon" maxlength="24" oninput="wSync()" aria-label="Weapon name" style="flex:1;">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 18px;">
        <div class="cs-stat"><div class="cs-stat-top"><span>Damage</span><b id="wDmgVal"></b></div>
          <input id="wDmg" type="range" oninput="wSync()" aria-label="Damage"></div>
        <div class="cs-stat"><div class="cs-stat-top"><span>Reach</span><b id="wRangeVal"></b></div>
          <input id="wRange" type="range" oninput="wSync()" aria-label="Reach"></div>
        <div class="cs-stat"><div class="cs-stat-top"><span>Time between swings</span><b id="wCoolVal"></b></div>
          <input id="wCool" type="range" oninput="wSync()" aria-label="Swing cooldown"></div>
        <div class="cs-stat"><div class="cs-stat-top"><span>Knockback</span><b id="wKbVal"></b></div>
          <input id="wKb" type="range" oninput="wSync()" aria-label="Knockback"></div>
        <div class="cs-stat"><div class="cs-stat-top"><span>Ability</span></div>
          <select id="wAbilEffect" onchange="wSync()" aria-label="Ability">${abilityOpts}</select></div>
        <div class="cs-stat"><div class="cs-stat-top"><span>Ability recharge</span><b id="wAbilCoolVal"></b></div>
          <input id="wAbilCool" type="range" oninput="wSync()" aria-label="Ability recharge"></div>
      </div>
      <div class="cs-hint" id="wAbilHint"></div>
      <div class="cs-row" style="margin-top:4px;">
        <button class="cs-btn primary" id="wTestBtn" onclick="wTestWeapon()">${_dIco('target')} Test on a dummy</button>
        <button class="cs-btn" id="wUseBtn" onclick="wUseInVersus()">${_dIco('crossedswords')} Use in Versus</button>
        <button class="cs-btn" onclick="wSaveWeapon()">${_dIco('check')} Save</button>
        <button class="cs-btn" onclick="wExportWeapon()">${_dIco('globe')} Share</button>
        <button class="cs-btn" onclick="wImportWeapon()">${_dIco('clipboard')} Import</button>
      </div>
    </div>
  </div>`;

  document.body.appendChild(panel);
  _dMakeDraggable(panel, document.getElementById('dDragHandle'));
  _dFillBaseSelect();
  _wFillBaseGrid();
}

// Style builders kept for the Training live editor further down.
function _dBtnStyle(accentColor, isActive) {
  const c = accentColor || 'rgba(255,255,255,0.7)';
  return `background:${isActive ? 'rgba(68,255,136,0.16)' : 'rgba(255,255,255,0.06)'};
    border:1px solid ${isActive ? c : 'rgba(255,255,255,0.14)'};
    color:${isActive ? c : '#bbc'};border-radius:6px;padding:3px 10px;cursor:pointer;
    font-size:0.76rem;font-family:inherit;transition:background 0.12s;`;
}

// Make element draggable via a handle
function _dMakeDraggable(el, handle) {
  let ox = 0, oy = 0, sx = 0, sy = 0;
  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('button,select,input')) return;
    e.preventDefault();
    sx = e.clientX; sy = e.clientY;
    const rect = el.getBoundingClientRect();
    ox = rect.left; oy = rect.top;
    el.style.left      = ox + 'px';
    el.style.top       = oy + 'px';
    el.style.transform = 'none';
    handle.style.cursor = 'grabbing';
    const onMove = (e) => {
      el.style.left = Math.max(0, Math.min(window.innerWidth  - 80, ox + e.clientX - sx)) + 'px';
      el.style.top  = Math.max(0, Math.min(window.innerHeight - 40, oy + e.clientY - sy)) + 'px';
    };
    const onUp = () => {
      handle.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });
}

function openDesigner() {
  _dBuildOverlay();
  const ov = document.getElementById('designerOverlay');
  ov.style.display = 'flex';
  ov.style.left = '50%'; ov.style.top = '4vh'; ov.style.transform = 'translateX(-50%)';
  _dCanvas = document.getElementById('designerCanvas');
  _dCtx    = _dCanvas.getContext('2d');
  _dSetupCanvasEvents();
  _dInstallKeys();
  // A fresh studio starts on the base arena's real layout, never a blank grid.
  if (_dPlatforms.length === 0) designerChangeBase(true);
  _dLoadSaved();
  _wHydrateLibrary();
  _wRefreshList();
  _dStartPreviewLoop();
  designerTab('map');
  if (!_wSpec) _wApplySpec(_wDefaultSpec('sword'));
  wSync();
}

function closeDesigner() {
  const ov = document.getElementById('designerOverlay');
  if (ov) ov.style.display = 'none';
  if (_dAnimId) { cancelAnimationFrame(_dAnimId); _dAnimId = null; }
  if (_dKeyHandler) { document.removeEventListener('keydown', _dKeyHandler, true); _dKeyHandler = null; }
}

// ── In-game Training Mode Designer ───────────────────────────
// A compact live-edit panel that appears while the game runs.
// All platform changes update currentArena.platforms in real time.
// Human player gets godmode + free flight while open.

let _tdSelectedIdx = -1; // selected platform index in live editor

function openTrainingDesigner() {
  if (!trainingMode && gameMode !== 'training') {
    _dToast('Training designer only available in Training mode');
    return;
  }
  trainingDesignerOpen = true;
  _tdSelectedIdx = -1;
  let existing = document.getElementById('_tdPanel');
  if (existing) { existing.style.display = 'flex'; _tdRefreshList(); return; }

  const panel = document.createElement('div');
  panel.id = '_tdPanel';
  panel.style.cssText = `
    position:fixed;top:12px;right:12px;width:260px;background:rgba(8,8,22,0.93);
    border:1.5px solid rgba(100,200,255,0.35);border-radius:12px;padding:12px 14px 14px;
    font-family:'Segoe UI',Arial,sans-serif;color:#ccd;font-size:0.8rem;
    z-index:1500;box-shadow:0 4px 30px rgba(0,0,80,0.7);display:flex;
    flex-direction:column;gap:8px;user-select:none;`;

  panel.innerHTML = `
    <div id="_tdDragHandle" style="display:flex;align-items:center;justify-content:space-between;
      cursor:move;padding-bottom:6px;border-bottom:1px solid rgba(100,200,255,0.15);">
      <span style="font-weight:700;font-size:0.85rem;color:#88ccff;">🛠 Live Map Editor</span>
      <div style="display:flex;gap:5px;">
        <span style="font-size:0.65rem;opacity:0.55;align-self:center;">✦ Godmode+Flight ON</span>
        <button onclick="closeTrainingDesigner()"
          style="background:rgba(255,60,60,0.18);border:1px solid rgba(255,80,80,0.4);
          color:#ff8888;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:0.78rem;">✕</button>
      </div>
    </div>

    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <button onclick="_tdAddPlatform()" style="${_dBtnStyle('#44ff88')}">+ Add Platform</button>
      <button onclick="_tdDeleteSelected()" style="${_dBtnStyle('#ff4455')}">🗑 Delete</button>
      <button onclick="_tdToggleSnap()" id="_tdSnapBtn" style="${_dBtnStyle('#ffcc44')}">Snap: ON</button>
    </div>

    <div style="font-size:0.72rem;opacity:0.6;">Click canvas to add · Drag to move · Select to edit</div>

    <div id="_tdEditRow" style="display:none;gap:6px;flex-direction:column;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <label>X <input id="_tdX" type="number" oninput="_tdUpdateSelected()" style="${_dInputStyle()}" step="1"></label>
        <label>Y <input id="_tdY" type="number" oninput="_tdUpdateSelected()" style="${_dInputStyle()}" step="1"></label>
        <label>W <input id="_tdW" type="number" oninput="_tdUpdateSelected()" style="${_dInputStyle()}" step="1"></label>
        <label>H <input id="_tdH" type="number" oninput="_tdUpdateSelected()" style="${_dInputStyle()}" step="1"></label>
      </div>
    </div>

    <div id="_tdList" style="display:flex;flex-direction:column;gap:3px;max-height:150px;overflow-y:auto;"></div>

    <div style="display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid rgba(100,200,255,0.12);padding-top:8px;">
      <button onclick="_tdExport()" style="${_dBtnStyle()}">📋 Export</button>
      <button onclick="_tdImport()" style="${_dBtnStyle('#cc88ff')}">↓ Import</button>
      <button onclick="_tdApplyPreset('arena')" style="${_dBtnStyle('#88aaff')}">Reset Default</button>
    </div>`;

  document.body.appendChild(panel);
  _dMakeDraggable(panel, document.getElementById('_tdDragHandle'));

  // Click on game canvas to place platform
  canvas.addEventListener('click', _tdCanvasClick);
  _tdRefreshList();
}

function closeTrainingDesigner() {
  trainingDesignerOpen = false;
  _tdSelectedIdx = -1;
  const panel = document.getElementById('_tdPanel');
  if (panel) panel.style.display = 'none';
  canvas.removeEventListener('click', _tdCanvasClick);
}

let _tdSnap = true;
const _TD_SNAP = 20;

function _tdSnapV(v) { return _tdSnap ? Math.round(v / _TD_SNAP) * _TD_SNAP : Math.round(v); }
function _tdToggleSnap() {
  _tdSnap = !_tdSnap;
  const btn = document.getElementById('_tdSnapBtn');
  if (btn) btn.textContent = `Snap: ${_tdSnap ? 'ON' : 'OFF'}`;
}

function _tdScreenToGame(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  // Convert CSS pixels → canvas pixels
  const canvasPx = (clientX - rect.left) * (canvas.width  / rect.width);
  const canvasPy = (clientY - rect.top)  * (canvas.height / rect.height);
  // Invert the current camera transform (setTransform(scX,0,0,scY,tx,ty))
  const m = ctx.getTransform();
  return {
    x: (canvasPx - m.e) / m.a,
    y: (canvasPy - m.f) / m.d,
  };
}

function _tdCanvasClick(e) {
  if (!trainingDesignerOpen || !currentArena) return;
  // Only place if not clicking in the panel area
  if (e.clientX > window.innerWidth - 280 && e.clientY < 500) return;
  const gp = _tdScreenToGame(e.clientX, e.clientY);
  // Center the new platform on the cursor
  const gx = _tdSnapV(gp.x - 60);
  const gy = _tdSnapV(gp.y - 8);
  currentArena.platforms.push({ x: gx, y: gy, w: 120, h: 16 });
  _tdSelectedIdx = currentArena.platforms.length - 1;
  _tdRefreshList();
  _tdFillEdit();
}

function _tdRefreshList() {
  const list = document.getElementById('_tdList');
  if (!list || !currentArena) return;
  list.innerHTML = currentArena.platforms.map((pl, i) => {
    const active = i === _tdSelectedIdx;
    return `<div onclick="_tdSelect(${i})" style="padding:3px 6px;border-radius:5px;cursor:pointer;
      background:${active ? 'rgba(100,200,255,0.18)' : 'rgba(255,255,255,0.04)'};
      border:1px solid ${active ? 'rgba(100,200,255,0.5)' : 'rgba(255,255,255,0.08)'};
      font-size:0.72rem;color:${pl.isFloor ? '#ffcc44' : '#aabbcc'};">
      ${pl.isFloor ? '⚓ Floor' : `P${i}`} &nbsp;
      <span style="opacity:0.6;">(${Math.round(pl.x)},${Math.round(pl.y)}) ${Math.round(pl.w)}×${Math.round(pl.h)}</span>
    </div>`;
  }).join('');
}

function _tdSelect(idx) {
  _tdSelectedIdx = idx;
  _tdRefreshList();
  _tdFillEdit();
}

function _tdFillEdit() {
  const row = document.getElementById('_tdEditRow');
  if (!row || !currentArena) return;
  const pl = currentArena.platforms[_tdSelectedIdx];
  if (!pl) { row.style.display = 'none'; return; }
  row.style.display = 'flex';
  document.getElementById('_tdX').value = Math.round(pl.x);
  document.getElementById('_tdY').value = Math.round(pl.y);
  document.getElementById('_tdW').value = Math.round(pl.w);
  document.getElementById('_tdH').value = Math.round(pl.h);
}

function _tdUpdateSelected() {
  if (!currentArena || _tdSelectedIdx < 0) return;
  const pl = currentArena.platforms[_tdSelectedIdx];
  if (!pl) return;
  const v = id => parseFloat(document.getElementById(id)?.value) || 0;
  pl.x = v('_tdX'); pl.y = v('_tdY'); pl.w = v('_tdW'); pl.h = v('_tdH');
  _tdRefreshList();
}

function _tdAddPlatform() {
  if (!currentArena) return;
  currentArena.platforms.push({ x: 200, y: 300, w: 120, h: 16 });
  _tdSelectedIdx = currentArena.platforms.length - 1;
  _tdRefreshList();
  _tdFillEdit();
}

function _tdDeleteSelected() {
  if (!currentArena || _tdSelectedIdx < 0) return;
  const pl = currentArena.platforms[_tdSelectedIdx];
  if (pl && pl.isFloor) { _dToast('Cannot delete the floor'); return; }
  currentArena.platforms.splice(_tdSelectedIdx, 1);
  _tdSelectedIdx = -1;
  _tdRefreshList();
  document.getElementById('_tdEditRow').style.display = 'none';
}

function _tdExport() {
  if (!currentArena) return;
  const exportable = currentArena.platforms.map(pl => ({ x: pl.x, y: pl.y, w: pl.w, h: pl.h, ...(pl.isFloor ? { isFloor: true } : {}) }));
  const text = JSON.stringify(exportable, null, 2);
  _dShowExportModal(text, 'arena_platforms.json', 'Export Arena Platforms');
}

function _tdImport() {
  document.getElementById('_dImportModal')?.remove();
  // Reuse the map import modal but apply to live arena
  const modal = document.createElement('div');
  modal.id = '_dImportModal';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:3000;
    display:flex;align-items:center;justify-content:center;`;
  modal.innerHTML = `
  <div style="background:#0c0c1e;border:1.5px solid rgba(100,200,255,0.28);border-radius:13px;
    padding:22px 24px 18px;width:min(480px,92vw);font-family:'Segoe UI',Arial,sans-serif;color:#ccd;">
    <div style="font-weight:700;font-size:0.95rem;margin-bottom:14px;">Import Platforms (Live)</div>
    <textarea id="_dImportText" rows="6" placeholder="Paste platform JSON array here…"
      style="width:100%;background:#07071a;color:#bdc;border:1px solid rgba(100,200,255,0.2);
      border-radius:7px;padding:8px;font-family:monospace;font-size:0.72rem;
      resize:vertical;box-sizing:border-box;"></textarea>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
      <button onclick="document.getElementById('_dImportModal').remove()"
        style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);
        color:#bbc;border-radius:7px;padding:6px 16px;cursor:pointer;font-family:inherit;font-size:0.8rem;">
        Cancel
      </button>
      <button onclick="_tdImportFromText()" style="${_dModalBtnStyle('#88ff44')}">Apply Live</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function _tdImportFromText() {
  const text = document.getElementById('_dImportText')?.value?.trim();
  document.getElementById('_dImportModal')?.remove();
  if (!text || !currentArena) return;
  try {
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) throw new Error('Expected array');
    currentArena.platforms = arr;
    _tdSelectedIdx = -1;
    _tdRefreshList();
    _dToast(`Applied ${arr.length} platforms to live arena`);
  } catch { _dToast('Invalid JSON'); }
}

function _tdApplyPreset(name) {
  if (!currentArena) return;
  // Re-randomize the layout for the current arena key (restores defaults)
  if (typeof randomizeArenaLayout === 'function') randomizeArenaLayout(currentArenaKey);
  _tdSelectedIdx = -1;
  _tdRefreshList();
  _dToast('Reset to default platforms');
}

function _dInputStyle() {
  return `width:100%;background:#07071a;color:#bdc;border:1px solid rgba(100,200,255,0.2);
    border-radius:5px;padding:4px 6px;font-family:monospace;font-size:0.75rem;box-sizing:border-box;`;
}

// ============================================================
// CREATOR STUDIO — MAP EDITOR
// ============================================================

function designerTab(tab) {
  const mp = document.getElementById('designerMapPanel');
  const wp = document.getElementById('designerWeaponPanel');
  if (mp) mp.style.display = tab === 'map'    ? 'flex' : 'none';
  if (wp) wp.style.display = tab === 'weapon' ? 'flex' : 'none';
  document.getElementById('dTabMap')?.classList.toggle('on', tab === 'map');
  document.getElementById('dTabWeapon')?.classList.toggle('on', tab === 'weapon');
}

function _dBaseList() {
  if (typeof ARENAS === 'undefined') return ['grass'];
  return _D_BASES.filter(k => {
    const a = ARENAS[k];
    return a && !a.isStoryOnly && !a.isBossArena && !a.isExploreArena && !(a.worldWidth > 900);
  });
}

function _dFillBaseSelect() {
  const sel = document.getElementById('dBaseArena');
  if (!sel) return;
  // Display names come from the Versus arena list, which already has them.
  const label = (k) => {
    const o = document.querySelector(`#arenaSelect option[value="${k}"]`);
    const t = (o && o.textContent.trim()) || (ARENAS[k] && ARENAS[k].name) || k;
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  sel.innerHTML = _dBaseList().map(k => `<option value="${k}">${_escHtml(label(k))}</option>`).join('');
  sel.value = _dBaseArena;
}

// The hazards a base arena brings with it on its own, so starting from Ice gives
// you the ice, the wind and the yeti without hunting for toggles.
function _dBaseHazards(key) {
  const a = (typeof ARENAS !== 'undefined' && ARENAS[key]) || {};
  const h = [];
  if (a.hasLava) h.push('lava');
  if (a.isLowGravity) h.push('lowgrav');
  if (a.isHeavyGravity) h.push('heavygrav');
  if (a.isIcy) h.push('ice');
  if (key === 'ice') h.push('wind', 'yeti');
  if (key === 'space') h.push('meteors');
  if (key === 'forest') h.push('beast');
  return h;
}

function _dBaseLayout(key) {
  const src = (typeof ARENA_BASE_PLATFORMS !== 'undefined' && ARENA_BASE_PLATFORMS[key])
    || (typeof ARENAS !== 'undefined' && ARENAS[key] && ARENAS[key].platforms) || _D_PRESETS.arena;
  return src.filter(p => !p.noDraw && !p.isFloorDisabled).map(p => ({
    x: p.x, y: p.y, w: p.w, h: p.h || 14, isFloor: !!p.isFloor, oscX: 0, oscY: 0 }));
}

// silent: opening the studio. Otherwise a base change on an edited map asks
// first, because it replaces the layout.
function designerChangeBase(silent) {
  const sel = document.getElementById('dBaseArena');
  const next = (sel && sel.value) || _dBaseArena;
  if (!silent && _dHistory.length && !confirm('Switch arena? This replaces your current layout with its layout.')) {
    if (sel) sel.value = _dBaseArena;
    return;
  }
  _dBaseArena = next;
  _dPlatforms = _dBaseLayout(next);
  _dHazards   = new Set(_dBaseHazards(next));
  _dSelected  = null;
  _dHistory   = [];
  _dSyncHazardChips();
  _dSyncControls();
}

function designerResetToBase() {
  _dHistory.push(JSON.stringify(_dPlatforms));
  _dPlatforms = _dBaseLayout(_dBaseArena);
  _dSelected  = null;
  _dSyncControls();
}

// ---- PLATFORM TOOLS ----
function _dPush() { _dHistory.push(JSON.stringify(_dPlatforms)); if (_dHistory.length > 80) _dHistory.shift(); }

function designerAddPlatform() {
  if (_dPlatforms.length >= _D_MAX_PLATFORMS) { _dToast(`Maps hold up to ${_D_MAX_PLATFORMS} platforms`, true); return; }
  _dPush();
  _dPlatforms.push({ x: 390, y: 220, w: 120, h: 14, isFloor: false, oscX: 0, oscY: 0 });
  _dSelected = _dPlatforms.length - 1;
  _dSyncControls();
}

function designerDuplicate() {
  if (_dSelected === null || !_dPlatforms[_dSelected]) return;
  if (_dPlatforms.length >= _D_MAX_PLATFORMS) { _dToast(`Maps hold up to ${_D_MAX_PLATFORMS} platforms`, true); return; }
  _dPush();
  const c = Object.assign({}, _dPlatforms[_dSelected]);
  c.x += 40; c.y -= 40;
  _dPlatforms.push(c);
  _dSelected = _dPlatforms.length - 1;
  _dSyncControls();
}

function designerDeleteSelected() {
  if (_dSelected === null || !_dPlatforms[_dSelected]) return;
  _dPush();
  _dPlatforms.splice(_dSelected, 1);
  _dSelected = null;
  _dSyncControls();
}

function designerClearPlatforms() {
  if (_dPlatforms.length && !confirm('Remove every platform? You can undo this.')) return;
  _dPush();
  _dPlatforms = [];
  _dSelected  = null;
  _dSyncControls();
}

function designerUndo() {
  if (_dHistory.length === 0) return;
  _dPlatforms = JSON.parse(_dHistory.pop());
  _dSelected  = null;
  _dSyncControls();
}

function designerUpdateSelected() {
  if (_dSelected === null || !_dPlatforms[_dSelected]) return;
  const pl = _dPlatforms[_dSelected];
  _dPush();
  pl.w = Math.max(20, Math.min(900, parseInt(document.getElementById('dPlatW').value) || pl.w));
  pl.h = Math.max(8,  Math.min(80,  parseInt(document.getElementById('dPlatH').value) || pl.h));
  pl.isFloor = document.getElementById('dPlatFloor').checked;
  pl.oscX = document.getElementById('dPlatMoving').checked ? 60 : 0;
}

function _dSyncControls() {
  const pl = _dSelected !== null ? _dPlatforms[_dSelected] : null;
  const w = document.getElementById('dPlatW'); if (!w) return;
  w.value = pl ? Math.round(pl.w) : 120;
  document.getElementById('dPlatH').value       = pl ? Math.round(pl.h) : 14;
  document.getElementById('dPlatFloor').checked  = pl ? !!pl.isFloor : false;
  document.getElementById('dPlatMoving').checked = pl ? (pl.oscX > 0) : false;
  for (const id of ['dPlatW', 'dPlatH', 'dPlatFloor', 'dPlatMoving']) document.getElementById(id).disabled = !pl;
}

// ---- HAZARDS ----
function designerToggleHazard(h) {
  if (!_D_HAZARD_KEYS.has(h)) return;
  if (_dHazards.has(h)) _dHazards.delete(h);
  else {
    _dHazards.add(h);
    if (h === 'lowgrav')   _dHazards.delete('heavygrav');
    if (h === 'heavygrav') _dHazards.delete('lowgrav');
  }
  _dSyncHazardChips();
}

function _dSyncHazardChips() {
  document.querySelectorAll('#designerOverlay .d-hazard-btn').forEach(btn =>
    btn.classList.toggle('on', _dHazards.has(btn.dataset.h)));
}

function designerSyncMeta() {
  const n = document.getElementById('dMapName');
  if (!n) return;
  _dMeta.name = (n.value || '').trim().slice(0, 32) || 'My Map';
  _dMeta.sky  = document.getElementById('dSkyOn').checked ? document.getElementById('dSkyColor').value : null;
}

// ---- KEYBOARD ----
function _dInstallKeys() {
  if (_dKeyHandler) return;
  _dKeyHandler = (e) => {
    const ov = document.getElementById('designerOverlay');
    if (!ov || ov.style.display === 'none') return;
    if (document.querySelector('.cs-modal')) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDesigner(); return; }
    const inField = e.target && e.target.closest && e.target.closest('input,select,textarea');
    if (inField) return;
    const mapOpen = document.getElementById('designerMapPanel').style.display !== 'none';
    if (!mapOpen) return;
    const k = e.key;
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z') { e.preventDefault(); e.stopPropagation(); designerUndo(); return; }
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); e.stopPropagation(); designerDeleteSelected(); return; }
    if (k.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); e.stopPropagation(); designerDuplicate(); return; }
    const nudge = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    if (nudge && _dSelected !== null && _dPlatforms[_dSelected]) {
      e.preventDefault(); e.stopPropagation();
      const step = e.shiftKey ? 1 : (_dSnapGrid ? _D_SNAP : 5);
      const pl = _dPlatforms[_dSelected];
      pl.x += nudge[0] * step; pl.y = Math.max(0, Math.min(520 - pl.h, pl.y + nudge[1] * step));
    }
  };
  // Capture phase: the game's own key handlers must not see studio keys.
  document.addEventListener('keydown', _dKeyHandler, true);
}

// ---- CANVAS EVENTS ----
function _dSetupCanvasEvents() {
  const cv = _dCanvas;
  const _toGame = (cx, cy) => {
    const r = cv.getBoundingClientRect();
    return { x: (cx - r.left) / r.width * 900, y: (cy - r.top) / r.height * 520 };
  };
  const _hit = (x, y) => {
    for (let i = _dPlatforms.length - 1; i >= 0; i--) {
      const pl = _dPlatforms[i];
      if (x >= pl.x && x <= pl.x + pl.w && y >= pl.y - 4 && y <= pl.y + pl.h + 4) return i;
    }
    return -1;
  };
  const _getHandleAt = (x, y) => {
    if (_dSelected === null || !_dPlatforms[_dSelected]) return null;
    const pl = _dPlatforms[_dSelected];
    const r = cv.getBoundingClientRect();
    const hSize = 9 * 900 / Math.max(1, r.width);
    const checks = [
      { dir: 'se', hx: pl.x + pl.w,     hy: pl.y + pl.h },
      { dir: 'sw', hx: pl.x,            hy: pl.y + pl.h },
      { dir: 'e',  hx: pl.x + pl.w,     hy: pl.y + pl.h / 2 },
      { dir: 'w',  hx: pl.x,            hy: pl.y + pl.h / 2 },
      { dir: 's',  hx: pl.x + pl.w / 2, hy: pl.y + pl.h },
    ];
    for (const c of checks) if (Math.abs(x - c.hx) < hSize && Math.abs(y - c.hy) < hSize) return c.dir;
    return null;
  };

  cv.onmousedown = (e) => {
    e.preventDefault();
    const { x, y } = _toGame(e.clientX, e.clientY);
    if (e.button === 2) {
      const idx = _hit(x, y);
      if (idx >= 0) { _dPush(); _dPlatforms.splice(idx, 1); _dSelected = null; _dSyncControls(); }
      return;
    }
    const handle = _getHandleAt(x, y);
    if (handle) { _dPush(); _dResizing = true; _dResizeDir = handle; _dDragOffX = x; _dDragOffY = y; return; }
    const idx = _hit(x, y);
    if (idx >= 0) {
      _dPush();
      _dSelected = idx; _dDragging = true;
      _dDragOffX = x - _dPlatforms[idx].x; _dDragOffY = y - _dPlatforms[idx].y;
    } else {
      if (_dPlatforms.length >= _D_MAX_PLATFORMS) { _dToast(`Maps hold up to ${_D_MAX_PLATFORMS} platforms`, true); return; }
      _dPush();
      const pw = 120, ph = 14;
      _dPlatforms.push({ x: _dSnapVal(x - pw / 2), y: _dSnapVal(y), w: pw, h: ph, isFloor: false, oscX: 0, oscY: 0 });
      _dSelected = _dPlatforms.length - 1;
      _dDragging = true; _dDragOffX = pw / 2; _dDragOffY = ph / 2;
    }
    _dSyncControls();
  };

  cv.onmousemove = (e) => {
    const { x, y } = _toGame(e.clientX, e.clientY);
    if (_dResizing && _dSelected !== null) {
      const pl = _dPlatforms[_dSelected];
      const dx = x - _dDragOffX, dy = y - _dDragOffY;
      _dDragOffX = x; _dDragOffY = y;
      if (_dResizeDir.includes('e')) pl.w = Math.max(20, pl.w + dx);
      if (_dResizeDir.includes('w')) { const nw = Math.max(20, pl.w - dx); pl.x += pl.w - nw; pl.w = nw; }
      if (_dResizeDir.includes('s')) pl.h = Math.max(8, Math.min(80, pl.h + dy));
      _dSyncControls();
      return;
    }
    if (!_dDragging || _dSelected === null) {
      const handle = _getHandleAt(x, y);
      cv.style.cursor = handle ? (handle === 'e' || handle === 'w' ? 'ew-resize' : handle === 's' ? 'ns-resize' : 'nwse-resize')
        : (_hit(x, y) >= 0 ? 'move' : 'crosshair');
      return;
    }
    const pl = _dPlatforms[_dSelected];
    pl.x = _dSnapVal(x - _dDragOffX);
    pl.y = Math.max(0, Math.min(520 - pl.h, _dSnapVal(y - _dDragOffY)));
  };

  const _stopDrag = () => {
    if (_dResizing && _dSelected !== null) {
      const pl = _dPlatforms[_dSelected];
      pl.w = _dSnapGrid ? Math.max(_D_SNAP, _dSnapVal(pl.w)) : Math.round(pl.w);
      pl.x = Math.round(pl.x); pl.h = Math.round(pl.h);
      _dSyncControls();
    }
    _dDragging = false; _dResizing = false; _dResizeDir = null;
  };
  cv.onmouseup = _stopDrag;
  cv.onmouseleave = _stopDrag;
  cv.oncontextmenu = (e) => e.preventDefault();
  cv.onwheel = (e) => {
    if (_dSelected === null || !_dPlatforms[_dSelected]) return;
    e.preventDefault();
    const pl = _dPlatforms[_dSelected];
    pl.w = Math.max(20, Math.min(900, pl.w - Math.sign(e.deltaY) * _D_SNAP));
    _dSyncControls();
  };
}

// ---- RENDER: the game's own renderer, borrowed while the menu is up ----
// Draws `draw` into the idle game canvas at worldW x worldH, then copies the
// result into `target`. Returns false when the game canvas is busy (a match is
// running) so callers can fall back.
function _dRenderViaGame(target, worldW, worldH, draw) {
  if (typeof canvas === 'undefined' || typeof ctx === 'undefined' || !canvas) return false;
  if (typeof gameRunning !== 'undefined' && gameRunning) return false;
  const tw = target.canvas.width, th = target.canvas.height;
  const s  = Math.min(1, canvas.width / tw, canvas.height / th);
  const rw = Math.max(1, Math.floor(tw * s)), rh = Math.max(1, Math.floor(th * s));
  let ok = true;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, rw, rh);
  ctx.beginPath(); ctx.rect(0, 0, rw, rh); ctx.clip();
  ctx.setTransform(rw / worldW, 0, 0, rh / worldH, 0, 0);
  try { draw(); } catch (e) { ok = false; }
  ctx.restore();
  if (ok) {
    target.clearRect(0, 0, tw, th);
    target.drawImage(canvas, 0, 0, rw, rh, 0, 0, tw, th);
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, rw, rh); ctx.restore();
  return ok;
}

// Build the playable arena object for a map spec. The single source of truth:
// the editor view, Play, saved maps and share codes all go through here.
function _dBuildArena(spec) {
  const base = (typeof ARENAS !== 'undefined' && (ARENAS[spec.base] || ARENAS.grass)) || {};
  const hz = new Set(spec.hazards || []);
  let platforms = (spec.platforms || []).map(p => {
    const pl = { x: p.x, y: p.y, w: p.w, h: p.h || 14, isFloor: !!p.isFloor };
    if (p.oscX > 0) { pl.ox = p.x; pl.oscX = p.oscX; pl.oscSpeed = 0.018; pl.oscPhase = (p.x * 0.013) % 6.28; }
    return pl;
  });
  if (!platforms.length) platforms = _dBaseLayout(spec.base).map(p => Object.assign({}, p));
  // Spawning needs a ground platform (pickSafeSpawn). If the author marked none,
  // the widest of the lowest platforms becomes the ground.
  if (!platforms.some(p => p.isFloor)) {
    const g = platforms.slice().sort((a, b) => (b.y - a.y) || (b.w - a.w))[0];
    if (g) g.isFloor = true;
  }
  const a = Object.assign({}, base, {
    name:           spec.name || 'Custom Map',
    designerBase:   (typeof ARENAS !== 'undefined' && ARENAS[spec.base]) ? spec.base : 'grass',
    isCustomMap:    true,
    hasLava:        hz.has('lava'),
    lavaY:          hz.has('lava') ? (base.lavaY || 490) : base.lavaY,
    isLowGravity:   hz.has('lowgrav'),
    isHeavyGravity: hz.has('heavygrav'),
    isIcy:          hz.has('ice'),
    designerPerks:  { blizzard: hz.has('wind'), meteors: hz.has('meteors'), beast: hz.has('beast'), yeti: hz.has('yeti') },
    platforms,
  });
  if (spec.sky) a.sky = [spec.sky, _dDarken(spec.sky)];
  return a;
}

function _dDarken(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#0a0c12';
  const n = parseInt(m[1], 16);
  const c = (v) => Math.round(v * 0.45).toString(16).padStart(2, '0');
  return '#' + c(n >> 16) + c((n >> 8) & 255) + c(n & 255);
}

function _dDrawArenaReal(dc, spec) {
  const arena = _dBuildArena(spec);
  return _dRenderViaGame(dc, 900, 520, () => {
    const pa = currentArena, pk = currentArenaKey;
    currentArena = arena; currentArenaKey = spec.base;
    try {
      if (_dBgKey !== spec.base && typeof generateBgElements === 'function') { generateBgElements(); _dBgKey = spec.base; }
      drawBackground();
      drawPlatforms();
    } finally { currentArena = pa; currentArenaKey = pk; }
  });
}

function _dStartPreviewLoop() {
  const loop = () => {
    const ov = document.getElementById('designerOverlay');
    if (!ov || ov.style.display === 'none') { _dAnimId = null; return; }
    _dAnimId = requestAnimationFrame(loop);
    const mapOpen = document.getElementById('designerMapPanel').style.display !== 'none';
    if (mapOpen) _dDrawEditor(); else _wDraw();
  };
  if (_dAnimId) cancelAnimationFrame(_dAnimId);
  _dAnimId = requestAnimationFrame(loop);
}

function _dDrawEditor() {
  const cv = _dCanvas;
  if (!cv) return;
  const dc = _dCtx;
  const W = cv.width, H = cv.height, sx = W / 900, sy = H / 520;
  designerSyncMeta();
  const spec = _dCurrentSpec();

  if (!_dDrawArenaReal(dc, spec)) {
    // Fallback (a match is running underneath): flat schematic.
    dc.fillStyle = spec.sky || '#141926'; dc.fillRect(0, 0, W, H);
    for (const pl of _dPlatforms) { dc.fillStyle = pl.isFloor ? '#3d4a5c' : '#556070'; dc.fillRect(pl.x * sx, pl.y * sy, pl.w * sx, pl.h * sy); }
  }

  // Grid only while snapping, faint enough to read the art through.
  if (_dSnapGrid) {
    dc.strokeStyle = 'rgba(255,255,255,0.06)'; dc.lineWidth = 1;
    dc.beginPath();
    for (let x = 0; x <= 900; x += _D_SNAP * 2) { dc.moveTo(x * sx + 0.5, 0); dc.lineTo(x * sx + 0.5, H); }
    for (let y = 0; y <= 520; y += _D_SNAP * 2) { dc.moveTo(0, y * sy + 0.5); dc.lineTo(W, y * sy + 0.5); }
    dc.stroke();
  }

  _dPlatforms.forEach((pl, i) => {
    const px = pl.x * sx, py = pl.y * sy, pw = pl.w * sx, ph = (pl.h || 14) * sy;
    if (pl.oscX > 0) {
      dc.strokeStyle = 'rgba(227,179,65,0.8)'; dc.lineWidth = 2; dc.setLineDash([6, 5]);
      dc.beginPath(); dc.moveTo(px - pl.oscX * sx, py + ph / 2); dc.lineTo(px + pw + pl.oscX * sx, py + ph / 2); dc.stroke();
      dc.setLineDash([]);
    }
    if (pl.isFloor && i !== _dSelected) {
      dc.fillStyle = 'rgba(63,185,132,0.9)'; dc.fillRect(px, py - 3 * sy, Math.min(pw, 26 * sx), 2 * sy);
    }
    if (i !== _dSelected) return;
    dc.strokeStyle = '#F2762B'; dc.lineWidth = 2.5;
    dc.strokeRect(px - 2, py - 2, pw + 4, ph + 4);
    const hs = 7 * sx;
    for (const [hx, hy] of [[px + pw, py + ph / 2], [px, py + ph / 2], [px + pw / 2, py + ph], [px + pw, py + ph], [px, py + ph]]) {
      dc.fillStyle = '#F2762B'; dc.fillRect(hx - hs, hy - hs, hs * 2, hs * 2);
      dc.strokeStyle = '#160A02'; dc.lineWidth = 1.5; dc.strokeRect(hx - hs, hy - hs, hs * 2, hs * 2);
    }
    const label = `${Math.round(pl.w)} x ${Math.round(pl.h)}${pl.isFloor ? '  ground' : ''}${pl.oscX > 0 ? '  moving' : ''}`;
    dc.font = `700 ${Math.round(13 * sx)}px system-ui, sans-serif`;
    const tw = dc.measureText(label).width + 12 * sx;
    const ly = Math.max(18 * sy, py - 12 * sy);
    dc.fillStyle = 'rgba(10,12,18,0.85)'; dc.fillRect(px, ly - 14 * sy, tw, 18 * sy);
    dc.fillStyle = '#E6EBF5'; dc.textBaseline = 'middle'; dc.fillText(label, px + 6 * sx, ly - 5 * sy);
    dc.textBaseline = 'alphabetic';
  });

  if (!_dPlatforms.length) {
    dc.fillStyle = 'rgba(10,12,18,0.7)'; dc.fillRect(W / 2 - 230 * sx, H / 2 - 22 * sy, 460 * sx, 44 * sy);
    dc.fillStyle = '#E6EBF5'; dc.font = `700 ${Math.round(16 * sx)}px system-ui, sans-serif`; dc.textAlign = 'center';
    dc.fillText('Click anywhere to place your first platform', W / 2, H / 2 + 6 * sy); dc.textAlign = 'left';
  }
}

// ---- MAP SPECS ----
// A spec is the whole map as plain data. Saves, share codes and Play all use it.
//   { v:1, name, base, sky|null, hazards:[...], platforms:[{x,y,w,h,isFloor,oscX}] }
function _dCurrentSpec() {
  return {
    v: 1, name: _dMeta.name || 'My Map', base: _dBaseArena, sky: _dMeta.sky || null,
    hazards: [..._dHazards],
    platforms: _dPlatforms.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.w), h: Math.round(p.h || 14),
      isFloor: !!p.isFloor, oscX: p.oscX > 0 ? 60 : 0 })),
  };
}

const _dNum = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d; };
const _dCleanName = (s, d, max) => (String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max) || d);

// Accepts anything a player might paste: share codes' payload, the current spec,
// or the pre-September save/export shape { meta, platforms, hazards, base }.
// Everything is clamped; nothing from outside reaches the page unescaped.
function _dSanitizeMapSpec(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const legacy = raw.meta && typeof raw.meta === 'object';
  const bases = _dBaseList();
  const base = bases.includes(raw.base) ? raw.base : 'grass';
  const skyIn = legacy ? raw.meta.skyColor : raw.sky;
  const sky = /^#[0-9a-f]{6}$/i.test(skyIn || '') && !(legacy && /^#0d0d1e$/i.test(skyIn)) ? skyIn : null;
  const LEGACY = { npc_beast: 'beast', npc_yeti: 'yeti' };
  const hz = new Set();
  for (const h of Array.isArray(raw.hazards) ? raw.hazards : []) { const k = LEGACY[h] || h; if (_D_HAZARD_KEYS.has(k)) hz.add(k); }
  if (legacy && raw.meta.hasLava) hz.add('lava');
  const pls = (Array.isArray(raw.platforms) ? raw.platforms : []).slice(0, _D_MAX_PLATFORMS).map(p => {
    if (Array.isArray(p)) p = { x: p[0], y: p[1], w: p[2], h: p[3], isFloor: p[4] & 1, oscX: (p[4] & 2) ? 60 : 0 };
    if (!p || typeof p !== 'object') return null;
    return { x: _dNum(p.x, -200, 1100, 0), y: _dNum(p.y, 0, 520, 300), w: _dNum(p.w, 20, 1200, 120), h: _dNum(p.h, 8, 80, 14),
      isFloor: !!p.isFloor, oscX: Number(p.oscX) > 0 ? 60 : 0 };
  }).filter(Boolean);
  return { v: 1, name: _dCleanName(legacy ? raw.meta.name : raw.name, 'Custom Map', 32), base, sky, hazards: [...hz], platforms: pls };
}

function _dApplySpec(spec) {
  _dMeta = { name: spec.name, sky: spec.sky };
  _dBaseArena = spec.base;
  _dPlatforms = spec.platforms.map(p => Object.assign({ oscY: 0 }, p));
  _dHazards = new Set(spec.hazards);
  _dSelected = null;
  _dHistory = [];
  const sel = document.getElementById('dBaseArena'); if (sel) sel.value = spec.base;
  const nm = document.getElementById('dMapName'); if (nm) nm.value = spec.name;
  const on = document.getElementById('dSkyOn'); if (on) on.checked = !!spec.sky;
  if (spec.sky) { const c = document.getElementById('dSkyColor'); if (c) c.value = spec.sky; }
  _dSyncHazardChips();
  _dSyncControls();
}

// ---- SHARE CODES ----
// "SE-MAP1." / "SE-WPN1." + base64url(JSON). Platforms pack to [x,y,w,h,flags].
function _dB64(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function _dUnB64(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  return decodeURIComponent(escape(atob(s)));
}
function _dMapToCode(spec) {
  const packed = { n: spec.name, b: spec.base, s: spec.sky || 0, z: spec.hazards,
    p: spec.platforms.map(p => [p.x, p.y, p.w, p.h, (p.isFloor ? 1 : 0) | (p.oscX > 0 ? 2 : 0)]) };
  return 'SE-MAP1.' + _dB64(JSON.stringify(packed));
}
function _dCodeToMap(text) {
  text = String(text || '').trim();
  try {
    if (text.startsWith('SE-MAP1.')) {
      const o = JSON.parse(_dUnB64(text.slice(8)));
      return _dSanitizeMapSpec({ name: o.n, base: o.b, sky: o.s || null, hazards: o.z, platforms: o.p });
    }
    return _dSanitizeMapSpec(JSON.parse(text));
  } catch (e) { return null; }
}

// ---- SAVE / LIBRARY ----
function _dGetSaves() {
  try { const o = JSON.parse(localStorage.getItem('smc_custom_maps') || '{}'); return o && typeof o === 'object' ? o : {}; }
  catch (e) { return {}; }
}
function _dPutSaves(saves) {
  try { localStorage.setItem('smc_custom_maps', JSON.stringify(saves)); return true; }
  catch (e) { _dToast('Could not save (storage full or blocked)', true); return false; }
}
function _dSlug(name) { return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32) || 'map'; }
function _dMapKey(spec) { return '_custom_' + _dSlug(spec.name); }

// Registers the map as a selectable arena and returns its ARENAS key.
function _dRegisterMap(spec) {
  const key = _dMapKey(spec);
  if (typeof ARENAS !== 'undefined') ARENAS[key] = _dBuildArena(spec);
  _dInjectArenaOption(key, spec.name + ' (custom)');
  return key;
}

function designerSave(quiet) {
  designerSyncMeta();
  const spec = _dCurrentSpec();
  const saves = _dGetSaves();
  // Same name overwrites, so saving twice doesn't make duplicates.
  for (const [k, v] of Object.entries(saves)) {
    const s = _dSanitizeMapSpec(v.spec || v);
    if (s && _dSlug(s.name) === _dSlug(spec.name)) delete saves[k];
  }
  saves[Date.now().toString(36)] = { spec };
  if (!_dPutSaves(saves)) return null;
  const key = _dRegisterMap(spec);
  _dLoadSaved();
  if (!quiet) _dToast(`Saved "${spec.name}". It's in the arena list too.`);
  return key;
}

function designerLoad() { _dLoadSaved(); }

function _dLoadSaved() {
  const list = document.getElementById('dSavedMapsList');
  if (!list) return;
  const entries = Object.entries(_dGetSaves()).map(([k, v]) => [k, _dSanitizeMapSpec(v.spec || v)]).filter(e => e[1]);
  if (!entries.length) { list.innerHTML = '<div class="cs-empty">Nothing saved yet.</div>'; return; }
  list.innerHTML = entries.reverse().map(([k, s]) =>
    `<div class="cs-item"><span title="${_escHtml(s.name)}">${_escHtml(s.name)}</span>
      <button class="cs-btn small" onclick="_dApplySave('${k}')">Open</button>
      <button class="cs-btn small danger" onclick="_dDeleteSave('${k}')" aria-label="Delete">&times;</button></div>`).join('');
}

function _dApplySave(key) {
  const v = _dGetSaves()[key];
  const spec = v && _dSanitizeMapSpec(v.spec || v);
  if (!spec) return;
  _dApplySpec(spec);
  _dToast(`Opened "${spec.name}"`);
}

function _dDeleteSave(key) {
  const saves = _dGetSaves();
  const spec = saves[key] && _dSanitizeMapSpec(saves[key].spec || saves[key]);
  if (!spec || !confirm(`Delete "${spec.name}"?`)) return;
  delete saves[key];
  _dPutSaves(saves);
  _dLoadSaved();
}

// ---- PLAY ----
function designerPlay() {
  designerSyncMeta();
  const spec = _dCurrentSpec();
  if (!spec.platforms.length) { _dToast('Add at least one platform first', true); return; }
  const key = _dRegisterMap(spec);
  closeDesigner();
  if (typeof selectMode === 'function') selectMode('2p');
  if (typeof p1IsBot !== 'undefined') p1IsBot = false;
  if (typeof p2IsBot !== 'undefined') p2IsBot = true;
  if (typeof p2IsNone !== 'undefined') p2IsNone = false;
  if (typeof selectArena === 'function') selectArena(key);
  if (typeof startGame === 'function') startGame();
}

// ---- SHARE / IMPORT ----
function _dModal(html) {
  document.getElementById('csModal')?.remove();
  const m = document.createElement('div');
  m.id = 'csModal'; m.className = 'cs-modal';
  m.innerHTML = `<div class="cs-modal-box" role="dialog">${html}</div>`;
  m.addEventListener('click', e => { if (e.target === m) m.remove(); });
  m.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); m.remove(); } });
  document.body.appendChild(m);
  return m;
}

function _dCopy(text) {
  const fallback = () => {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove(); _dToast('Copied');
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => _dToast('Copied'), fallback);
  else fallback();
}

function _dShareModal(title, blurb, code) {
  const m = _dModal(`<h3>${_escHtml(title)}</h3><p>${blurb}</p>
    <textarea readonly id="csShareCode"></textarea>
    <div class="cs-row"><button onclick="document.getElementById('csModal').remove()">Close</button>
      <button class="primary" id="csCopyBtn">Copy code</button></div>`);
  const ta = m.querySelector('#csShareCode'); ta.value = code;
  m.querySelector('#csCopyBtn').onclick = () => _dCopy(code);
  ta.focus(); ta.select();
}

function designerShare() {
  designerSyncMeta();
  const spec = _dCurrentSpec();
  if (!spec.platforms.length) { _dToast('Add at least one platform first', true); return; }
  _dShareModal(`Share "${spec.name}"`, 'Anyone can paste this code into <b>Import</b> in their Creator Studio to play your map.', _dMapToCode(spec));
}
function designerExport() { designerShare(); }

function _dImportModal(title, blurb, onCode) {
  const m = _dModal(`<h3>${_escHtml(title)}</h3><p>${blurb}</p>
    <textarea id="csImportCode" placeholder="Paste a code here"></textarea>
    <div class="cs-row"><button onclick="document.getElementById('csModal').remove()">Cancel</button>
      <button class="primary" id="csImportBtn">Import</button></div>`);
  const ta = m.querySelector('#csImportCode');
  m.querySelector('#csImportBtn').onclick = () => { if (onCode(ta.value)) m.remove(); };
  ta.focus();
}

function designerImport() {
  _dImportModal('Import a map', 'Paste a map code (it starts with <b>SE-MAP1.</b>). Older .json map exports work too.', (text) => {
    const spec = _dCodeToMap(text);
    if (!spec) { _dToast("That isn't a map code", true); return false; }
    if (_dPlatforms.length) _dPush();
    _dApplySpec(spec);
    _dToast(`Imported "${spec.name}". Save it to keep it.`);
    return true;
  });
}

// ---- misc helpers (shared with the Training live editor) ----
function _dToast(msg, isError) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.setAttribute('role', 'status');
  t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:${isError ? 'rgba(224,90,78,0.95)' : 'rgba(27,33,49,0.97)'};border:1px solid rgba(150,170,210,0.26);
    color:#E6EBF5;padding:9px 18px;border-radius:4px;font-size:0.85rem;font-weight:700;z-index:4000;pointer-events:none;font-family:inherit;`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

function _dModalBtnStyle(accent) {
  const c = accent || 'rgba(255,255,255,0.7)';
  return `background:rgba(255,255,255,0.06);border:1px solid ${accent ? c : 'rgba(255,255,255,0.18)'};
    color:${accent ? c : '#bbc'};border-radius:7px;padding:8px 16px;cursor:pointer;
    font-size:0.8rem;font-family:inherit;transition:background 0.12s;`;
}

function _escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function _escAttr(s) { return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n'); }

function _dExportAsCode(text) { _dCopy(text); }
function _dExportAsFile(text, filename) {
  const blob = new Blob([text], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  _dToast('File downloaded');
}

// Used by the Training live editor's Export.
function _dShowExportModal(text, filename, title, altCodeText) {
  const code = altCodeText || text;
  const m = _dModal(`<h3>${_escHtml(title || 'Export')}</h3>
    <textarea readonly id="csShareCode"></textarea>
    <div class="cs-row"><button onclick="document.getElementById('csModal').remove()">Close</button>
      <button id="csFileBtn">Download file</button><button class="primary" id="csCopyBtn">Copy</button></div>`);
  m.querySelector('#csShareCode').value = code;
  m.querySelector('#csCopyBtn').onclick = () => _dCopy(code);
  m.querySelector('#csFileBtn').onclick = () => _dExportAsFile(text, filename || 'export.json');
}

function _dInjectArenaOption(key, label) {
  const sel = document.getElementById('arenaSelect');
  if (!sel) return;
  sel.querySelector(`option[value="${CSS.escape(key)}"]`)?.remove();
  let grp = sel.querySelector('optgroup[data-custom="1"]') || sel.querySelector('optgroup[label="─── Custom ────────────"]');
  if (!grp) { grp = document.createElement('optgroup'); grp.label = 'Your maps'; grp.dataset.custom = '1'; sel.appendChild(grp); }
  const opt = document.createElement('option');
  opt.value = key; opt.textContent = label;
  grp.appendChild(opt);
}

// Restore saved maps into ARENAS + the arena list on page load.
function _dRestoreCustomMapsToDropdown() {
  for (const v of Object.values(_dGetSaves())) {
    const spec = _dSanitizeMapSpec(v.spec || v);
    if (spec && spec.platforms.length) _dRegisterMap(spec);
  }
}

// ============================================================
// CREATOR STUDIO — WEAPON BUILDER
// A custom weapon starts from a real weapon and inherits its art, swing and
// (by default) its signature ability; the player retunes the numbers inside a
// power budget. The engine sees an ordinary weapon: the custom key is aliased
// to the base in WEAPON_SPRITES / WEAPON_SWINGS, so nothing in Fighter changes.
// ============================================================

const _W_BASES = [
  { k: 'sword', icon: 'sword' }, { k: 'katana', icon: 'katana' }, { k: 'axe', icon: 'axe' },
  { k: 'hammer', icon: 'hammer' }, { k: 'spear', icon: 'spear' }, { k: 'scythe', icon: 'scythe' },
  { k: 'fryingpan', icon: 'fryingpan' }, { k: 'broomstick', icon: 'broomstick' }, { k: 'flail', icon: 'flail' },
  { k: 'whip', icon: 'whip' }, { k: 'shield', icon: 'shield' }, { k: 'electricstaff', icon: 'bolt' },
];
const _W_ABILITIES = [
  { k: 'signature', label: 'Signature (from base)', hint: '' },
  { k: 'dash',   label: 'Dash strike', hint: 'Lunges forward and hits anyone in reach.' },
  { k: 'leap',   label: 'Leap',        hint: 'A big jump, with the double jump restored.' },
  { k: 'burst',  label: 'Shockwave',   hint: 'Knocks back everyone close by.' },
  { k: 'launch', label: 'Uppercut',    hint: 'Launches a nearby enemy upward.' },
  { k: 'bolt',   label: 'Energy bolt', hint: 'Fires a projectile.' },
  { k: 'heal',   label: 'Mend',        hint: 'Heals 12% of max health. Recharge is at least 6s.' },
];
// Slider ranges in engine units (frames, px). Cooldowns display in seconds.
const _W_RANGE = { damage: [6, 26], range: [55, 150], cooldown: [18, 66], kb: [4, 24], abilityCooldown: [120, 480] };
const _W_BUDGET = 36;   // the power formula below scores Spear 34.9, Electric Staff 36.4, Sword 22.4

let _wSpec = null;          // spec being edited
let _wEditKey = null;       // library key when editing a saved weapon
let _wPreviewFighter = null;

function _wBaseDef(k) { return (typeof WEAPONS !== 'undefined' && WEAPONS[k]) || null; }
function _wBases() { return _W_BASES.filter(b => _wBaseDef(b.k) && _wBaseDef(b.k).type === 'melee'); }

function designerWeaponPower(s) {
  const base = _wBaseDef(s.base) || {};
  const cycle = s.cooldown + (base.endlag || 9);
  return s.damage * (60 / cycle) * (0.6 + s.range / 200) * (0.85 + s.kb / 40);
}

function _wDefaultSpec(baseKey) {
  const b = _wBaseDef(baseKey) || _wBaseDef('sword');
  const clampR = (v, r) => Math.max(r[0], Math.min(r[1], v));
  return { v: 1, name: 'My ' + (b.name || 'Weapon'), base: baseKey,
    damage: clampR(b.damage, _W_RANGE.damage), range: clampR(b.range, _W_RANGE.range),
    cooldown: clampR(b.cooldown, _W_RANGE.cooldown), kb: clampR(b.kb, _W_RANGE.kb),
    ability: 'signature', abilityCooldown: clampR(b.abilityCooldown || 180, _W_RANGE.abilityCooldown) };
}

function _wSanitize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const bases = _wBases().map(b => b.k);
  const base = bases.includes(raw.base) ? raw.base : 'sword';
  const r = _W_RANGE;
  const legacyAbil = { shield_burst: 'burst', projectile: 'bolt', slow: 'launch' };
  let ability = legacyAbil[raw.ability] || legacyAbil[raw._abilEffect] || raw.ability || raw._abilEffect || 'signature';
  if (!_W_ABILITIES.some(a => a.k === ability)) ability = 'signature';
  const s = { v: 1, name: _dCleanName(raw.name, 'Custom Weapon', 24), base,
    damage: _dNum(raw.damage, r.damage[0], r.damage[1], 15), range: _dNum(raw.range, r.range[0], r.range[1], 84),
    cooldown: _dNum(raw.cooldown, r.cooldown[0], r.cooldown[1], 36), kb: _dNum(raw.kb != null ? raw.kb : raw.kbForce, r.kb[0], r.kb[1], 10),
    ability, abilityCooldown: _dNum(raw.abilityCooldown, r.abilityCooldown[0], r.abilityCooldown[1], 180) };
  if (s.ability === 'heal') s.abilityCooldown = Math.max(360, s.abilityCooldown);
  // Over-budget weapons (old saves, hand-edited codes) are scaled back to fair.
  const p = designerWeaponPower(s);
  if (p > _W_BUDGET) s.damage = Math.max(r.damage[0], Math.floor(s.damage * _W_BUDGET / p));
  return s;
}

function _wAbilityFn(spec, base) {
  const dmg = spec.damage, kb = spec.kb, reach = spec.range;
  const foes = (user) => [...players, ...trainingDummies, ...minions].filter(f =>
    f && f !== user && f.health > 0 && !(typeof areAlliedEntities === 'function' && areAlliedEntities(user, f)));
  switch (spec.ability) {
    case 'signature': return base.ability;
    case 'dash': return function (user) {
      user.vx = user.facing * 16;
      for (const f of foes(user)) {
        const ahead = (f.cx() - user.cx()) * user.facing;
        if (ahead > -10 && ahead < reach + 60 && Math.abs(f.cy() - user.cy()) < 60) dealDamage(user, f, Math.round(dmg * 0.8), kb);
      }
      spawnParticles(user.cx(), user.cy(), '#E6EBF5', 12);
    };
    case 'leap': return function (user) { user.vy = -19; user.canDoubleJump = true; spawnParticles(user.cx(), user.y + user.h, '#E6EBF5', 10); };
    case 'burst': return function (user) {
      for (const f of foes(user)) if (dist(user, f) < 110) dealDamage(user, f, Math.round(dmg * 0.5), Math.round(kb * 1.8));
      spawnParticles(user.cx(), user.cy(), '#F2762B', 20);
      if (typeof spawnRing === 'function') spawnRing(user.cx(), user.cy());
    };
    case 'launch': return function (user) {
      for (const f of foes(user)) if (dist(user, f) < reach + 30) {
        dealDamage(user, f, Math.round(dmg * 0.6), 4);
        if (typeof applyLaunch === 'function') applyLaunch(user, f, -15);
      }
    };
    case 'bolt': return function (user) { spawnBullet(user, 12, '#F2762B', Math.round(dmg * 0.8)); };
    case 'heal': return function (user) {
      user.health = Math.min(user.maxHealth, user.health + Math.round(user.maxHealth * 0.12));
      spawnParticles(user.cx(), user.cy(), '#3FB984', 16);
    };
  }
  return function () {};
}

// The weapon object the engine equips.
function designerBuildWeapon(spec) {
  const base = _wBaseDef(spec.base) || _wBaseDef('sword');
  return Object.assign({}, base, {
    name: spec.name, damage: spec.damage, range: spec.range, cooldown: spec.cooldown, kb: spec.kb,
    abilityCooldown: spec.ability === 'heal' ? Math.max(360, spec.abilityCooldown) : spec.abilityCooldown,
    abilityName: spec.ability === 'signature' ? base.abilityName : (_W_ABILITIES.find(a => a.k === spec.ability) || {}).label,
    ability: _wAbilityFn(spec, base),
    description: (base.name || spec.base) + '-based custom weapon',
    _isCustom: true, _base: spec.base, _spec: spec,
  });
}

function designerRegisterWeapon(key, spec) {
  window.CUSTOM_WEAPONS = window.CUSTOM_WEAPONS || {};
  window.CUSTOM_WEAPONS[key] = designerBuildWeapon(spec);
  if (typeof WEAPON_SWINGS !== 'undefined' && WEAPON_SWINGS[spec.base]) WEAPON_SWINGS[key] = WEAPON_SWINGS[spec.base];
  if (typeof WEAPON_SPRITES !== 'undefined' && WEAPON_SPRITES[spec.base]) WEAPON_SPRITES[key] = WEAPON_SPRITES[spec.base];
  return window.CUSTOM_WEAPONS[key];
}

// Saved weapons come back from localStorage as plain data (no ability function,
// no aliases). Rebuild every one from its spec; migrate the old studio list too.
function _wHydrateLibrary() {
  window.CUSTOM_WEAPONS = window.CUSTOM_WEAPONS || {};
  for (const [k, w] of Object.entries(window.CUSTOM_WEAPONS)) {
    if (!k.startsWith('_custom_')) continue;
    const spec = _wSanitize(w._spec || w);
    if (spec) designerRegisterWeapon(k, spec); else delete window.CUSTOM_WEAPONS[k];
  }
  try {
    const old = JSON.parse(localStorage.getItem('smc_custom_weapons') || 'null');
    if (Array.isArray(old) && old.length) {
      const names = new Set(Object.values(window.CUSTOM_WEAPONS).map(w => w.name));
      old.forEach((w, i) => { const s = _wSanitize(w); if (s && !names.has(s.name)) designerRegisterWeapon('_custom_m' + i + Date.now().toString(36), s); });
      localStorage.removeItem('smc_custom_weapons');
      if (typeof saveCustomWeaponsData === 'function') saveCustomWeaponsData();
    }
  } catch (e) {}
  if (typeof refreshCustomWeaponOptions === 'function') refreshCustomWeaponOptions();
}

// ---- UI ----
function _wFillBaseGrid() {
  const g = document.getElementById('wBaseGrid');
  if (!g) return;
  g.innerHTML = _wBases().map(b =>
    `<button class="cs-base" data-base="${b.k}" onclick="wPickBase('${b.k}')" title="${_escHtml(_wBaseDef(b.k).name)}">
      ${_dIco(b.icon)}<span>${_escHtml(_wBaseDef(b.k).name)}</span></button>`).join('');
  const r = _W_RANGE;
  const setR = (id, rr) => { const el = document.getElementById(id); el.min = rr[0]; el.max = rr[1]; el.step = 1; };
  setR('wDmg', r.damage); setR('wRange', r.range); setR('wCool', r.cooldown); setR('wKb', r.kb); setR('wAbilCool', r.abilityCooldown);
}

function wPickBase(k) {
  const keepName = _wSpec && !/^My /.test(_wSpec.name) ? _wSpec.name : null;
  const s = _wDefaultSpec(k);
  if (keepName) s.name = keepName;
  _wApplySpec(s);
}

function _wApplySpec(spec) {
  _wSpec = spec;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('wName', spec.name); set('wDmg', spec.damage); set('wRange', spec.range); set('wCool', spec.cooldown);
  set('wKb', spec.kb); set('wAbilEffect', spec.ability); set('wAbilCool', spec.abilityCooldown);
  wSync();
}

function _wReadSpec() {
  const v = (id) => document.getElementById(id)?.value;
  return _wSanitize({ name: v('wName'), base: _wSpec ? _wSpec.base : 'sword', damage: v('wDmg'), range: v('wRange'),
    cooldown: v('wCool'), kb: v('wKb'), ability: v('wAbilEffect'), abilityCooldown: v('wAbilCool') });
}

function wSync() {
  if (!document.getElementById('wDmg')) return;
  const raw = { dmg: +document.getElementById('wDmg').value };
  const s = _wReadSpec();
  if (!s) return;
  _wSpec = s;
  const sec = (f) => (f / 60).toFixed(1) + 's';
  document.getElementById('wDmgVal').textContent     = raw.dmg;
  document.getElementById('wRangeVal').textContent   = s.range;
  document.getElementById('wCoolVal').textContent    = (s.cooldown / 60).toFixed(2) + 's';
  document.getElementById('wKbVal').textContent      = s.kb;
  document.getElementById('wAbilCoolVal').textContent = sec(s.ability === 'heal' ? Math.max(360, s.abilityCooldown) : s.abilityCooldown);
  document.querySelectorAll('#wBaseGrid .cs-base').forEach(b => b.classList.toggle('on', b.dataset.base === s.base));

  const base = _wBaseDef(s.base) || {};
  const ab = _W_ABILITIES.find(a => a.k === s.ability);
  document.getElementById('wAbilHint').textContent = s.ability === 'signature'
    ? `${base.abilityName || 'Signature'}: the ${base.name || s.base}'s own ability.` : (ab ? ab.hint : '');

  // Power: the raw slider value, before sanitizing scales it back.
  const p = designerWeaponPower(Object.assign({}, s, { damage: raw.dmg }));
  const pct = Math.round(p / _W_BUDGET * 100);
  const over = p > _W_BUDGET + 0.01;
  document.getElementById('wPowerVal').textContent = pct + '%';
  const meter = document.getElementById('wPowerMeter');
  meter.classList.toggle('over', over);
  meter.firstElementChild.style.width = Math.min(100, pct) + '%';
  document.getElementById('wPowerHint').textContent = over
    ? 'Over budget: lower damage, reach, speed or knockback. Saving caps the damage.'
    : 'Custom weapons can match the strongest weapons in the game, not beat them.';

  designerRegisterWeapon('_custom_preview', s);
  _wRefreshPreviewFighter();
}

function _wRefreshPreviewFighter() {
  if (typeof Fighter === 'undefined') return;
  try {
    if (!_wPreviewFighter) {
      _wPreviewFighter = new Fighter(0, 0, '#E6EBF5', 'sword', null, false);
      _wPreviewFighter.onGround = true;
      _wPreviewFighter.facing = 1;
      _wPreviewFighter.lives = 1;
    }
    _wPreviewFighter.weaponKey = '_custom_preview';
    _wPreviewFighter.weapon = window.CUSTOM_WEAPONS['_custom_preview'];
  } catch (e) { _wPreviewFighter = null; }
}

// Real fighter, real weapon art: idle for a beat, then a swing, on a loop.
function _wDraw() {
  const cv = document.getElementById('weaponPreviewCanvas');
  if (!cv) return;
  const dc = cv.getContext('2d');
  const f = _wPreviewFighter;
  const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / (1000 / 60);
  const WW = 200, WH = 200;
  const ok = f && _dRenderViaGame(dc, WW, WH, () => {
    const g = ctx.createLinearGradient(0, 0, 0, WH);
    g.addColorStop(0, '#1B2131'); g.addColorStop(1, '#0A0C12');
    ctx.fillStyle = g; ctx.fillRect(0, 0, WW, WH);
    ctx.fillStyle = '#232B3D'; ctx.fillRect(0, 158, WW, 42);
    ctx.fillStyle = 'rgba(150,170,210,0.26)'; ctx.fillRect(0, 158, WW, 1);
    f.x = WW / 2 - f.w / 2 - 18; f.y = 158 - f.h; f.vx = f.vy = 0; f.onGround = true;
    f.state = 'idle'; f.animTimer = Math.floor(t);
    const cyc = Math.floor(t) % 80;
    f._finPoseP = cyc >= 46 && cyc < 64 ? (cyc - 46) / 18 : null;
    f.draw();
  });
  f && (f._finPoseP = null);
  if (!ok) {
    dc.fillStyle = '#141926'; dc.fillRect(0, 0, cv.width, cv.height);
    dc.fillStyle = '#8B97AD'; dc.font = '700 22px system-ui, sans-serif'; dc.textAlign = 'center';
    dc.fillText('Preview available from the menu', cv.width / 2, cv.height / 2); dc.textAlign = 'left';
  }
}

// ---- LIBRARY ----
function _wLibrary() {
  return Object.entries(window.CUSTOM_WEAPONS || {}).filter(([k, w]) => k.startsWith('_custom_') && k !== '_custom_preview' && w && w._spec);
}

function wSaveWeapon(quiet) {
  const s = _wReadSpec();
  if (!s) return null;
  // Same name overwrites, like maps.
  let key = _wEditKey && window.CUSTOM_WEAPONS[_wEditKey] ? _wEditKey : null;
  for (const [k, w] of _wLibrary()) if (w._spec.name.toLowerCase() === s.name.toLowerCase()) key = k;
  key = key || ('_custom_' + Date.now().toString(36));
  designerRegisterWeapon(key, s);
  _wEditKey = key;
  if (typeof saveCustomWeaponsData === 'function') {
    const prev = window.CUSTOM_WEAPONS._custom_preview;
    delete window.CUSTOM_WEAPONS._custom_preview;   // never persist the preview slot
    saveCustomWeaponsData();
    window.CUSTOM_WEAPONS._custom_preview = prev;
  }
  if (typeof refreshCustomWeaponOptions === 'function') refreshCustomWeaponOptions();
  _wRefreshList();
  if (!quiet) _dToast(`Saved "${s.name}". Pick it in Versus or Training.`);
  return key;
}

function _wRefreshList() {
  const list = document.getElementById('dSavedWeaponsList');
  if (!list) return;
  const lib = _wLibrary();
  if (!lib.length) { list.innerHTML = '<div class="cs-empty">Nothing saved yet.</div>'; return; }
  list.innerHTML = lib.map(([k, w]) =>
    `<div class="cs-item"><span title="${_escHtml(w._spec.name)}">${_escHtml(w._spec.name)}</span>
      <button class="cs-btn small" onclick="_wLoadWeapon('${k}')">Open</button>
      <button class="cs-btn small danger" onclick="_wDeleteWeapon('${k}')" aria-label="Delete">&times;</button></div>`).join('');
}

function _wLoadWeapon(key) {
  const w = window.CUSTOM_WEAPONS && window.CUSTOM_WEAPONS[key];
  if (!w || !w._spec) return;
  _wEditKey = key;
  _wApplySpec(Object.assign({}, w._spec));
}

function _wDeleteWeapon(key) {
  const w = window.CUSTOM_WEAPONS && window.CUSTOM_WEAPONS[key];
  if (!w || !confirm(`Delete "${w.name}"?`)) return;
  delete window.CUSTOM_WEAPONS[key];
  if (_wEditKey === key) _wEditKey = null;
  if (typeof loadCustomWeaponSelection === 'function' && loadCustomWeaponSelection() === key && typeof saveCustomWeaponSelection === 'function') saveCustomWeaponSelection('');
  const prev = window.CUSTOM_WEAPONS._custom_preview; delete window.CUSTOM_WEAPONS._custom_preview;
  if (typeof saveCustomWeaponsData === 'function') saveCustomWeaponsData();
  window.CUSTOM_WEAPONS._custom_preview = prev;
  if (typeof refreshCustomWeaponOptions === 'function') refreshCustomWeaponOptions();
  _wRefreshList();
}

function _wEquipP1(key) {
  if (typeof refreshCustomWeaponOptions === 'function') refreshCustomWeaponOptions();
  const sel = document.getElementById('p1Weapon');
  if (sel) { const o = sel.querySelector(`option[value="${CSS.escape(key)}"]`); if (o) o.hidden = false; sel.value = key; }
  if (typeof saveCustomWeaponSelection === 'function') saveCustomWeaponSelection(key);
}

function wUseInVersus() {
  const key = wSaveWeapon(true);
  if (!key) return;
  closeDesigner();
  if (typeof selectMode === 'function') selectMode('2p');
  _wEquipP1(key);
  _dToast(`"${window.CUSTOM_WEAPONS[key].name}" equipped for Player 1`);
}
function wEquipWeapon() { wUseInVersus(); }

function wTestWeapon() {
  const key = wSaveWeapon(true);
  if (!key) return;
  closeDesigner();
  if (typeof selectMode === 'function') selectMode('training');
  _wEquipP1(key);
  window._wTest = { key, name: window.CUSTOM_WEAPONS[key].name, hits: [], total: 0, best: 0, seen: new Map(), started: false };
  if (typeof startGame === 'function') startGame();
}

function wExportWeapon() {
  const s = _wReadSpec();
  if (!s) return;
  const code = 'SE-WPN1.' + _dB64(JSON.stringify(s));
  _dShareModal(`Share "${s.name}"`, 'Anyone can paste this code into <b>Import</b> on the Weapon tab to get your weapon.', code);
}

function wImportWeapon() {
  _dImportModal('Import a weapon', 'Paste a weapon code (it starts with <b>SE-WPN1.</b>). Older .json weapon exports work too.', (text) => {
    text = String(text || '').trim();
    let raw = null;
    try { raw = text.startsWith('SE-WPN1.') ? JSON.parse(_dUnB64(text.slice(8))) : JSON.parse(text); } catch (e) {}
    const s = _wSanitize(raw);
    if (!s) { _dToast("That isn't a weapon code", true); return false; }
    _wEditKey = null;
    _wApplySpec(s);
    _dToast(`Imported "${s.name}". Save it to keep it.`);
    return true;
  });
}

// ---- WEAPON TEST HUD (Training, after "Test on a dummy") ----
// Reads damage off the dummies' health rather than hooking dealDamage.
function drawDesignerTestHUD(c) {
  const T = window._wTest;
  if (!T || !c) return;
  if (typeof gameRunning === 'undefined' || !gameRunning || gameMode !== 'training') {
    if (T.started) window._wTest = null;   // left Training: the test is over
    return;
  }
  const p1 = players && players[0];
  if (!p1 || p1.weaponKey !== T.key) return;
  if (!T.started) {
    T.started = true;
    if (!trainingDummies.length && typeof spawnTrainingDummy === 'function') spawnTrainingDummy();
  }
  for (const d of trainingDummies) {
    const prev = T.seen.has(d) ? T.seen.get(d) : d.health;
    if (d.health < prev) {
      const dmg = prev - d.health;
      T.total += dmg; T.best = Math.max(T.best, dmg);
      T.hits.push([frameCount, dmg]);
    }
    T.seen.set(d, d.health);
  }
  while (T.hits.length && frameCount - T.hits[0][0] > 300) T.hits.shift();
  const recent = T.hits.reduce((a, h) => a + h[1], 0);
  const dps = recent / 5;

  const w = 250, h = 92, x = 16, y = (typeof _hudBottom === 'function' ? _hudBottom() : 110) + 12;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = 'rgba(20,25,38,0.92)'; c.fillRect(x, y, w, h);
  c.strokeStyle = 'rgba(150,170,210,0.26)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  c.fillStyle = '#F2762B'; c.fillRect(x, y, 3, h);
  c.textBaseline = 'top';
  c.fillStyle = '#5D6880'; c.font = '800 10px system-ui, sans-serif';
  c.fillText('WEAPON TEST', x + 14, y + 10);
  c.fillStyle = '#E6EBF5'; c.font = '700 14px system-ui, sans-serif';
  c.fillText(String(T.name).slice(0, 26), x + 14, y + 24);
  c.font = '700 12px system-ui, sans-serif'; c.fillStyle = '#8B97AD';
  c.fillText('DPS (5s)', x + 14, y + 50); c.fillText('Total', x + 100, y + 50); c.fillText('Best hit', x + 170, y + 50);
  c.fillStyle = '#E6EBF5'; c.font = '800 16px system-ui, sans-serif';
  c.fillText(dps.toFixed(1), x + 14, y + 66); c.fillText(String(Math.round(T.total)), x + 100, y + 66); c.fillText(String(Math.round(T.best)), x + 170, y + 66);
  c.restore();
}

document.addEventListener('DOMContentLoaded', () => {
  // Restore persisted custom weapons, then rebuild them (ability fns + art aliases).
  if (typeof loadCustomWeaponsData === 'function') loadCustomWeaponsData();
  // Defer so ARENAS / WEAPON_SPRITES / menu dropdowns all exist.
  setTimeout(() => {
    try { _wHydrateLibrary(); } catch (e) {}
    try { _dRestoreCustomMapsToDropdown(); } catch (e) {}
  }, 200);
});
