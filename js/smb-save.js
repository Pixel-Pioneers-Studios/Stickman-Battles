// smc-save.js — Persistent save system: auto-save, export, import
'use strict';

const SAVE_VERSION = 2;
const SAVE_KEY     = 'smc_save_v1'; // legacy fallback key (used when AccountManager is absent)

// Dynamic key helpers — route through AccountManager when available so each
// account gets its own isolated save slot.
function _getSaveKey()   { return (window.AccountManager) ? window.AccountManager.getActiveSaveKey() : SAVE_KEY; }
function _getBackupKey() { return _getSaveKey() + '_backup'; }

// ── Default save structure (used for deep-merge / version migrations) ─────────
const _SAVE_DEFAULTS = {
  version: SAVE_VERSION,
  unlocks: {
    bossBeaten:   false,
    trueform:     false,
    megaknight:   false,
    letters:      [],
    achievements: [],
  },
  settings: {
    sfxVol:    0.35,
    sfxMute:   false,
    musicMute: false,
    ragdoll:   false,
  },
};

// ── Custom Weapon helpers ─────────────────────────────────────────────────────
// window.CUSTOM_WEAPONS is populated by smb-designer.js or cheat console.
// We persist both the selected key and all weapon objects across sessions.
function saveCustomWeaponSelection(key) {
  try { localStorage.setItem('smc_customWeapon', key || ''); } catch(e) {}
}
function loadCustomWeaponSelection() {
  return localStorage.getItem('smc_customWeapon') || '';
}
function clearCustomWeaponSelection() {
  try {
    localStorage.removeItem('smc_customWeapon');
    localStorage.removeItem('smc_customWeaponsData');
  } catch(e) {}
}
function saveCustomWeaponsData() {
  try {
    const data = window.CUSTOM_WEAPONS || {};
    // Strip non-serializable fields (functions like ability)
    const serializable = {};
    for (const [k, w] of Object.entries(data)) {
      const copy = Object.assign({}, w);
      delete copy.ability;
      serializable[k] = copy;
    }
    localStorage.setItem('smc_customWeaponsData', JSON.stringify(serializable));
  } catch(e) {}
}
function loadCustomWeaponsData() {
  try {
    const raw = localStorage.getItem('smc_customWeaponsData');
    if (!raw) return;
    const data = JSON.parse(raw);
    window.CUSTOM_WEAPONS = window.CUSTOM_WEAPONS || {};
    for (const [k, w] of Object.entries(data)) {
      window.CUSTOM_WEAPONS[k] = w;
    }
  } catch(e) {}
}

// ── Migration ─────────────────────────────────────────────────────────────────
function _migrateSave(data) {
  const d = Object.assign({}, data);
  // v1 → v2: ensure settings.musicMute exists (was added in v2)
  if (!d.settings) d.settings = {};
  if (typeof d.settings.musicMute === 'undefined') d.settings.musicMute = false;
  if (typeof d.settings.ragdoll   === 'undefined') d.settings.ragdoll   = false;
  // ensure unlocks sub-object has all keys
  if (!d.unlocks) d.unlocks = {};
  if (typeof d.unlocks.megaknight === 'undefined') d.unlocks.megaknight = false;
  if (!Array.isArray(d.unlocks.achievements)) d.unlocks.achievements = [];
  d.version = SAVE_VERSION;
  return d;
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function _deepMerge(defaults, saved) {
  const out = Object.assign({}, defaults);
  for (const k of Object.keys(saved)) {
    if (k in defaults
        && typeof defaults[k] === 'object'
        && !Array.isArray(defaults[k])
        && defaults[k] !== null) {
      out[k] = _deepMerge(defaults[k], saved[k]);
    } else {
      out[k] = saved[k];
    }
  }
  return out;
}

// ── Gather current state from individual localStorage keys ────────────────────
function _gatherSaveData() {
  return {
    version: SAVE_VERSION,
    story: (typeof getStoryDataForSave === 'function') ? getStoryDataForSave() : null,
    unlocks: {
      bossBeaten:   !!localStorage.getItem('smc_bossBeaten'),
      trueform:     !!localStorage.getItem('smc_trueform'),
      megaknight:   (localStorage.getItem('smc_megaknight') === '1'),
      letters:      JSON.parse(localStorage.getItem('smc_letters')      || '[]'),
      achievements: JSON.parse(localStorage.getItem('smc_achievements') || '[]'),
    },
    settings: {
      sfxVol:    parseFloat(localStorage.getItem('smc_sfxVol') || '0.35'),
      sfxMute:   (localStorage.getItem('smc_sfxMute')    === '1'),
      musicMute: (localStorage.getItem('smc_musicMute')  === '1'),
      ragdoll:   (localStorage.getItem('smc_ragdoll')    === '1'),
    },
  };
}

// ── Write save data back into individual localStorage keys ────────────────────
function _applySaveData(data) {
  const d = _deepMerge(_SAVE_DEFAULTS, data);

  if (d.unlocks.bossBeaten)    localStorage.setItem('smc_bossBeaten',  '1');
  else                          localStorage.removeItem('smc_bossBeaten');
  if (d.unlocks.trueform)      localStorage.setItem('smc_trueform',    '1');
  else                          localStorage.removeItem('smc_trueform');
  if (d.unlocks.megaknight)    localStorage.setItem('smc_megaknight',  '1');
  else                          localStorage.removeItem('smc_megaknight');
  localStorage.setItem('smc_letters',      JSON.stringify(d.unlocks.letters));
  localStorage.setItem('smc_achievements', JSON.stringify(d.unlocks.achievements));
  localStorage.setItem('smc_sfxVol',       String(d.settings.sfxVol));
  localStorage.setItem('smc_sfxMute',      d.settings.sfxMute    ? '1' : '0');
  localStorage.setItem('smc_musicMute',    d.settings.musicMute  ? '1' : '0');
  localStorage.setItem('smc_ragdoll',      d.settings.ragdoll    ? '1' : '0');
  if (d.story && typeof restoreStoryDataFromSave === 'function') {
    restoreStoryDataFromSave(d.story);
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────
// _SAVE_BACKUP_KEY is now computed dynamically via _getBackupKey()

function saveGame() {
  try {
    const key    = _getSaveKey();
    const bkKey  = _getBackupKey();
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(_gatherSaveData()))));
    // Write backup BEFORE overwriting main slot (protects against mid-write crash)
    const prev = localStorage.getItem(key);
    if (prev) localStorage.setItem(bkKey, prev);
    localStorage.setItem(key, encoded);
  } catch(e) {
    console.warn('[SMC Save] Save failed:', e);
  }
}

// ── Load (called once on page start, and on every account switch) ─────────────
function loadGame() {
  const key   = _getSaveKey();
  const bkKey = _getBackupKey();
  function _tryLoad(raw) {
    if (!raw) return false;
    let data = JSON.parse(decodeURIComponent(escape(atob(raw))));
    if (!data || typeof data.version !== 'number') return false;
    if (data.version < SAVE_VERSION) data = _migrateSave(data);
    _applySaveData(data);
    return true;
  }
  try {
    const raw = localStorage.getItem(key);
    if (_tryLoad(raw)) return;
    // Main slot failed or empty — fall back to backup
    const backup = localStorage.getItem(bkKey);
    if (backup) {
      console.warn('[SMC Save] Main save missing/corrupt — restoring backup.');
      if (_tryLoad(backup)) {
        // Restore backup into main slot
        localStorage.setItem(key, backup);
        return;
      }
    }
    // First run — individual keys already in default state
  } catch(e) {
    console.warn('[SMC Save] Load failed:', e);
    // Attempt backup restore on exception
    try {
      const backup = localStorage.getItem(bkKey);
      if (backup) {
        const data = JSON.parse(decodeURIComponent(escape(atob(backup))));
        if (data && typeof data.version === 'number') {
          _applySaveData(data.version < SAVE_VERSION ? _migrateSave(data) : data);
          localStorage.setItem(key, backup);
          console.warn('[SMC Save] Restored from backup after load failure.');
        }
      }
    } catch(e2) { console.warn('[SMC Save] Backup restore also failed:', e2); }
  }
}

// ── Export ────────────────────────────────────────────────────────────────────
function exportSave() {
  try {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(_gatherSaveData()))));
    // populate the textbox so user can copy manually even if clipboard API fails
    const box = document.getElementById('importSaveText');
    if (box) box.value = encoded;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(encoded)
        .then(() => _showSaveToast('✓ Save copied to clipboard!'))
        .catch(() => _showSaveToast('Paste the text from the box below.'));
    } else {
      _showSaveToast('Copy the text from the box below.');
    }
    return encoded;
  } catch(e) {
    console.warn('[SMC Save] Export failed:', e);
    _showSaveToast('Export failed — check console.', true);
    return '';
  }
}

function downloadSave() {
  try {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(_gatherSaveData()))));
    const blob = new Blob([encoded], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'stickman-clash-save.json';
    a.click();
    URL.revokeObjectURL(url);
    _showSaveToast('✓ Save downloaded!');
  } catch(e) {
    console.warn('[SMC Save] Download failed:', e);
    _showSaveToast('Download failed — check console.', true);
  }
}

function importSaveFromFile(input) {
  const file = input && input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = (e.target.result || '').trim();
    const box  = document.getElementById('importSaveText');
    if (box) box.value = text;
    // auto-import immediately
    if (importSave(text)) closeImportSaveModal();
  };
  reader.readAsText(file);
}

// ── Import ────────────────────────────────────────────────────────────────────
function importSave(saveString) {
  try {
    const str = (saveString || '').trim();
    if (!str) { _showSaveToast('Paste a save string first.', true); return false; }

    let data;
    try {
      data = JSON.parse(decodeURIComponent(escape(atob(str))));
    } catch(_) {
      throw new Error('Could not decode — not a valid save string.');
    }

    if (!data || typeof data.version !== 'number' || !data.unlocks) {
      throw new Error('Save data structure invalid.');
    }

    _applySaveData(data);
    saveGame();
    _showSaveToast('✓ Save imported! Reload to apply all changes.');
    return true;
  } catch(e) {
    console.warn('[SMC Save] Import error:', e.message);
    _showSaveToast('Invalid save: ' + e.message, true);
    return false;
  }
}

// ── Import modal helpers (called from HTML) ───────────────────────────────────
function openImportSaveModal() {
  const m = document.getElementById('importSaveModal');
  if (m) { m.style.display = 'flex'; document.getElementById('importSaveText').value = ''; }
}

function closeImportSaveModal() {
  const m = document.getElementById('importSaveModal');
  if (m) m.style.display = 'none';
}

function confirmImportSave() {
  const box = document.getElementById('importSaveText');
  if (!box) return;
  if (importSave(box.value)) {
    closeImportSaveModal();
  }
}

// ── Toast notification ────────────────────────────────────────────────────────
function _showSaveToast(msg, isError) {
  let t = document.getElementById('smcSaveToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'smcSaveToast';
    t.style.cssText = [
      'position:fixed','bottom:32px','left:50%','transform:translateX(-50%)',
      'background:rgba(5,5,20,0.92)','color:#dde4ff',
      'padding:9px 24px','border-radius:8px','font-size:0.85rem',
      'z-index:99999','pointer-events:none','transition:opacity 0.3s',
      'border:1px solid rgba(100,180,255,0.45)',
      'font-family:\'Segoe UI\',Arial,sans-serif',
    ].join(';');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.borderColor = isError ? 'rgba(255,80,80,0.55)' : 'rgba(100,180,255,0.45)';
  t.style.opacity = '1';
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(() => { t.style.opacity = '0'; }, 2800);
}

// ── Auto-save every 15 s ──────────────────────────────────────────────────────
setInterval(saveGame, 15000);

// ── Load on startup ───────────────────────────────────────────────────────────
loadGame();
