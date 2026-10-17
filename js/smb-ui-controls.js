'use strict';
// Styled stand-in for the native <select> in the menus: a stepper plate (◀ label ▶)
// that opens a panel of option tiles.
//
// The <select> stays in the DOM as the source of truth. This writes select.value and
// dispatches 'change', so existing onchange handlers and .value readers keep working.
// Loaded last, after the menu DOM exists.

const GAME_SELECT_IDS = [
  'arenaSelect', 'livesSelect',
  'p1Hat', 'p1Cape', 'p2Hat', 'p2Cape',
];

const _gameSelects = [];

function _gsEsc(str) {
  return String(str).replace(/[&<>"]/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
}

// Flat list of {value, label, group} in document order, skipping hidden options
function _gsOptions(sel) {
  const out = [];
  for (const opt of sel.options) {
    if (opt.disabled || opt.hidden || opt.style.display === 'none') continue;
    const grp = opt.parentElement && opt.parentElement.tagName === 'OPTGROUP'
      ? opt.parentElement.label.replace(/[─\s]+/g, ' ').trim()
      : '';
    out.push({ value: opt.value, label: opt.textContent.trim(), group: grp });
  }
  return out;
}

// Arena rows get a chip in that arena's own sky and platform colours.
function _gsSwatch(w, value) {
  if (w.sel.id !== 'arenaSelect') return '';
  if (typeof ARENAS === 'undefined') return '';
  const a = ARENAS[value];
  if (!a) return '<i class="gs-chip gs-chip-any"></i>';
  const sky  = (a.sky && a.sky[0]) || a.platColor || '#666';
  const land = a.platColor || sky;
  return `<i class="gs-chip" style="background:linear-gradient(160deg,${sky} 0 52%,${land} 52% 100%)"></i>`;
}

function _gsCommit(w, value) {
  if (w.sel.value === value) return;
  w.sel.value = value;
  w.sel.dispatchEvent(new Event('change', { bubbles: true }));
  _gsSync(w);
}

// Re-read state from the <select>. Needed because code elsewhere sets .value directly,
// which fires no event.
function _gsSync(w) {
  const opts = _gsOptions(w.sel);
  w.opts = opts;
  const idx = opts.findIndex(o => o.value === w.sel.value);
  w.index = idx < 0 ? 0 : idx;
  const cur = opts[w.index];
  w.label.innerHTML = cur ? _gsSwatch(w, cur.value) + _gsEsc(cur.label) : '';
  if (w.panel.dataset.open === '1') _gsRenderPanel(w);
}

function _gsStep(w, dir) {
  if (!w.opts.length) return;
  const next = (w.index + dir + w.opts.length) % w.opts.length;
  _gsCommit(w, w.opts[next].value);
}

function _gsRenderPanel(w) {
  w.panel.innerHTML = '';
  let lastGroup = null;
  for (const o of w.opts) {
    if (o.group && o.group !== lastGroup) {
      const h = document.createElement('div');
      h.className = 'gs-group';
      h.textContent = o.group;
      w.panel.appendChild(h);
      lastGroup = o.group;
    }
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'gs-option' + (o.value === w.sel.value ? ' active' : '');
    tile.innerHTML = _gsSwatch(w, o.value) + _gsEsc(o.label);
    tile.addEventListener('click', (e) => {
      e.stopPropagation();
      _gsCommit(w, o.value);
      _gsClose(w);
    });
    w.panel.appendChild(tile);
  }
}

function _gsOpen(w) {
  for (const other of _gameSelects) if (other !== w) _gsClose(other);
  _gsRenderPanel(w);
  w.panel.dataset.open = '1';
  w.root.classList.add('gs-open');
}

function _gsClose(w) {
  w.panel.dataset.open = '0';
  w.root.classList.remove('gs-open');
}

function _gsBuild(sel) {
  if (sel.dataset.gsBound === '1') return null;
  sel.dataset.gsBound = '1';

  const root = document.createElement('div');
  root.className = 'game-select';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'gs-arrow';
  prev.textContent = '◀';

  const face = document.createElement('button');
  face.type = 'button';
  face.className = 'gs-face';

  const label = document.createElement('span');
  label.className = 'gs-label';
  const caret = document.createElement('span');
  caret.className = 'gs-caret';
  caret.textContent = '▾';
  face.appendChild(label);
  face.appendChild(caret);

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'gs-arrow';
  next.textContent = '▶';

  const panel = document.createElement('div');
  panel.className = 'gs-panel';
  panel.dataset.open = '0';

  root.appendChild(prev);
  root.appendChild(face);
  root.appendChild(next);
  root.appendChild(panel);

  // Carry over flex sizing but not width: the arrow buttons take room, and a fixed
  // width (livesSelect is 100px) would clip them.
  const cs = getComputedStyle(sel);
  if (cs.flex && cs.flex !== '0 1 auto') root.style.flex = cs.flex;

  sel.parentElement.insertBefore(root, sel);
  sel.classList.add('gs-native-hidden');

  const w = { sel, root, label, panel, opts: [], index: 0 };
  prev.addEventListener('click', (e) => { e.stopPropagation(); _gsStep(w, -1); });
  next.addEventListener('click', (e) => { e.stopPropagation(); _gsStep(w, 1); });
  face.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.dataset.open === '1' ? _gsClose(w) : _gsOpen(w);
  });
  sel.addEventListener('change', () => _gsSync(w));

  _gsSync(w);
  return w;
}

function initGameSelects() {
  for (const id of GAME_SELECT_IDS) {
    const sel = document.getElementById(id);
    if (!sel) continue;
    const w = _gsBuild(sel);
    if (w) _gameSelects.push(w);
  }
  if (!_gameSelects.length) return;

  document.addEventListener('click', () => {
    for (const w of _gameSelects) _gsClose(w);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') for (const w of _gameSelects) _gsClose(w);
  });

  // Story flow, the designer and network sync set .value directly and fire no event,
  // so poll while the menu is on screen.
  setInterval(() => {
    const menu = document.getElementById('menu');
    if (!menu || menu.style.display === 'none') return;
    for (const w of _gameSelects) {
      const cur = w.opts[w.index];
      if (!cur || cur.value !== w.sel.value) _gsSync(w);
    }
  }, 300);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGameSelects);
} else {
  initGameSelects();
}
