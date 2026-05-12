'use strict';

// smb-supabase.js — Supabase auth + cloud save bridge
//
// Loaded before smb-accounts.js / smb-save.js so the rest of the game can
// query auth state and queue syncs without knowing about Supabase internals.

window.SMB_SUPABASE_CONFIG = window.SMB_SUPABASE_CONFIG || {
  url: 'https://cpqlqaynealpilmvollv.supabase.co',
  anonKey: 'sb_publishable_kGUxVfyEd6i4UeLPDBb_Ag_6jEYsZvh',
  authStorageKey: 'smc_supabase_auth_v1',
};

const SupabaseBridge = (() => {
  const _listeners = new Set();
  const _storageKey = (window.SMB_SUPABASE_CONFIG && window.SMB_SUPABASE_CONFIG.authStorageKey) || 'smc_supabase_auth_v1';

  let _clientPromise = null;
  let _client = null;
  let _bootPromise = null;
  let _session = null;
  let _user = null;
  let _ready = false;
  let _syncTimer = null;
  let _syncQueued = null;
  let _syncInFlight = false;
  let _lastStatus = 'disconnected';

  function _cfg() {
    return window.SMB_SUPABASE_CONFIG || {};
  }

  function isAvailable() {
    const cfg = _cfg();
    return !!(cfg.url && cfg.anonKey);
  }

  function _menuButtonLabel() {
    if (!isAvailable()) return '👤 Account & Saves';
    if (!_ready) return '👤 Account & Saves...';
    if (!_session || !_user) return '👤 Account & Saves';
    const label = _user.email || _user.user_metadata?.full_name || _user.id.slice(0, 8);
    return '👤 ' + String(label).split('@')[0].slice(0, 18);
  }

  function _saveRuntimeReady() {
    return isRuntimeReady() && typeof window._gatherSaveData === 'function' && typeof window.saveGame === 'function';
  }

  function isRuntimeReady() {
    return typeof window.getStoryDataForSave === 'function' && typeof window.restoreStoryDataFromSave === 'function';
  }

  function _updateMenuButton() {
    const btn = document.getElementById('accountsSavesBtn') || document.getElementById('cloudAuthBtn');
    if (!btn) return;
    btn.textContent = _menuButtonLabel();
    btn.title = _session
      ? ('Signed in as ' + (_user?.email || 'cloud user'))
      : (isAvailable() ? 'Open account, local save, and cloud sync settings' : 'Supabase config missing');
  }

  function _emit(event, payload) {
    _updateMenuButton();
    const msg = {
      ready: _ready,
      status: _lastStatus,
      session: _session,
      user: _user,
      event: event || 'update',
      payload: payload || null,
    };
    _listeners.forEach(function(fn) {
      try { fn(msg); } catch (e) {}
    });
  }

  async function _loadClientModule() {
    return import('https://esm.sh/@supabase/supabase-js@2');
  }

  async function getClient() {
    if (_client) return _client;
    if (_clientPromise) return _clientPromise;
    _clientPromise = (async function() {
      if (!isAvailable()) throw new Error('Supabase config is missing');
      const mod = await _loadClientModule();
      const cfg = _cfg();
      _client = mod.createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          storageKey: _storageKey,
        },
      });
      _client.auth.onAuthStateChange(function(event, session) {
        _session = session || null;
        _user = session ? session.user : null;
        _ready = true;
        _lastStatus = session ? 'signed_in' : 'signed_out';
        _emit(event, session);
        if (session && _saveRuntimeReady()) {
          void reconcileActiveSave();
        }
      });
      return _client;
    })();
    return _clientPromise;
  }

  async function bootstrap() {
    if (_bootPromise) return _bootPromise;
    _bootPromise = (async function() {
      try {
        const client = await getClient();
        const res = await client.auth.getSession();
        _session = res && res.data ? res.data.session : null;
        _user = _session ? _session.user : null;
        _ready = true;
        _lastStatus = _session ? 'signed_in' : 'signed_out';
        _emit('bootstrap', _session);
        if (_session && _saveRuntimeReady()) {
          void reconcileActiveSave();
        }
        return _session;
      } catch (e) {
        _ready = true;
        _lastStatus = 'error';
        _emit('bootstrap_error', e);
        return null;
      }
    })();
    return _bootPromise;
  }

  async function ensureReady() {
    await bootstrap();
    return _session;
  }

  function onChange(fn) {
    if (typeof fn !== 'function') return function() {};
    _listeners.add(fn);
    return function() { _listeners.delete(fn); };
  }

  function getState() {
    return {
      ready: _ready,
      status: _lastStatus,
      session: _session,
      user: _user,
      available: isAvailable(),
    };
  }

  function getSession() {
    return _session;
  }

  function getUser() {
    return _user;
  }

  function isSignedIn() {
    return !!(_session && _user);
  }

  function _redirectTarget() {
    return window.location.href.split('#')[0];
  }

  async function signUp(email, password) {
    const client = await getClient();
    return client.auth.signUp({
      email: String(email || '').trim(),
      password: String(password || ''),
      options: {
        emailRedirectTo: _redirectTarget(),
      },
    });
  }

  async function signIn(email, password) {
    const client = await getClient();
    return client.auth.signInWithPassword({
      email: String(email || '').trim(),
      password: String(password || ''),
    });
  }

  async function signOut() {
    if (!_client && !_clientPromise) return { error: null };
    const client = await getClient();
    const res = await client.auth.signOut();
    _session = null;
    _user = null;
    _ready = true;
    _lastStatus = 'signed_out';
    _emit('signed_out', res);
    return res;
  }

  function _localSaveTimestamp(save) {
    const meta = save && save.meta ? save.meta : null;
    const ts = meta && typeof meta.updatedAt === 'number' ? meta.updatedAt : 0;
    return ts || 0;
  }

  function _runtimeSave() {
    if (typeof window._gatherSaveData === 'function') return window._gatherSaveData();
    if (typeof window.GameState !== 'undefined' && typeof window.saveGame === 'function') {
      try { return window._gatherSaveData(); } catch (e) {}
    }
    return null;
  }

  function _saveTimestampFromRow(row) {
    if (!row) return 0;
    const ts = row.client_updated_at || row.updated_at || row.created_at || null;
    const parsed = ts ? Date.parse(ts) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function _cloneSave(save) {
    if (!save) return null;
    try { return JSON.parse(JSON.stringify(save)); } catch (e) { return null; }
  }

  function _uniqMerge(primary, secondary) {
    const out = [];
    const push = function(value) {
      if (value === null || value === undefined || value === '') return;
      const key = typeof value === 'number' ? String(value) : String(value).trim();
      if (!key) return;
      if (out.indexOf(key) === -1) out.push(key);
    };
    (Array.isArray(primary) ? primary : []).forEach(push);
    (Array.isArray(secondary) ? secondary : []).forEach(push);
    return out;
  }

  function _fractureMap(save) {
    const out = {};
    const add = function(entry) {
      if (!entry || entry.id === undefined || entry.id === null) return;
      const id = String(entry.id);
      out[id] = {
        id: id,
        unlocked: !!entry.unlocked,
        previewed: !!entry.previewed,
        completed: !!entry.completed,
      };
    };
    if (save && save.progression && Array.isArray(save.progression.fractures)) save.progression.fractures.forEach(add);
    return out;
  }

  function _saveMeaningfulScore(save) {
    if (!save || typeof save !== 'object') return 0;
    let score = 0;
    if (typeof save.coins === 'number' && save.coins > 0) score += 1;
    if (Array.isArray(save.cosmetics) && save.cosmetics.length > 0) score += 2;
    if (save.unlocks) {
      if (save.unlocks.bossBeaten) score += 2;
      if (save.unlocks.trueform) score += 3;
      if (save.unlocks.megaknight) score += 2;
      if (Array.isArray(save.unlocks.letters) && save.unlocks.letters.length > 0) score += 1;
      if (Array.isArray(save.unlocks.achievements) && save.unlocks.achievements.length > 0) score += 1;
      if (save.unlocks.sovereignBeaten) score += 2;
      if (save.unlocks.storyOnline) score += 2;
      if (save.unlocks.tfEndingSeen) score += 1;
      if (save.unlocks.damnationScar) score += 1;
      if (save.unlocks.storyDodgeUnlocked) score += 1;
      if (save.unlocks.paradoxCompanion) score += 1;
      if (save.unlocks.interTravel) score += 1;
      if (save.unlocks.patrolMode) score += 1;
      if (save.unlocks.godEncountered) score += 1;
      if (save.unlocks.godDefeated) score += 1;
    }
    if (save.storyProgress) {
      if (typeof save.storyProgress.act === 'number' && save.storyProgress.act > 0) score += 2;
      if (typeof save.storyProgress.chapter === 'number' && save.storyProgress.chapter > 0) score += 1;
      if (save.storyProgress.flags && Object.keys(save.storyProgress.flags).length > 0) score += 1;
    }
    if (save.story) {
      if (Array.isArray(save.story.defeated) && save.story.defeated.length > 0) score += 3;
      if (Array.isArray(save.story.blueprints) && save.story.blueprints.length > 0) score += 1;
      if (Array.isArray(save.story.unlockedAbilities) && save.story.unlockedAbilities.length > 0) score += 1;
      if (save.story.storyComplete) score += 3;
    }
    if (save.progression) {
      if (save.progression.ship && save.progression.ship.built) score += 2;
      if (Array.isArray(save.progression.fractures) && save.progression.fractures.some(function(f) { return f && (f.unlocked || f.previewed || f.completed); })) score += 2;
      if (typeof save.progression.motivationStage === 'number' && save.progression.motivationStage > 0) score += 1;
    }
    if (save.settings) {
      if (typeof save.settings.sfxVol === 'number' && save.settings.sfxVol !== 0.35) score += 1;
      if (save.settings.sfxMute || save.settings.musicMute || save.settings.ragdoll) score += 1;
    }
    return score;
  }

  function _mergeSaveData(primary, secondary) {
    const out = _cloneSave(primary) || _cloneSave(secondary) || null;
    if (!out || !secondary) return out;
    const other = secondary;
    out.version = Math.max(out.version || 3, other.version || 3);

    out.unlocks = Object.assign({}, other.unlocks || {}, out.unlocks || {});
    if (other.unlocks) {
      const u = out.unlocks;
      u.bossBeaten         = !!(u.bossBeaten         || other.unlocks.bossBeaten);
      u.trueform           = !!(u.trueform           || other.unlocks.trueform);
      u.megaknight         = !!(u.megaknight         || other.unlocks.megaknight);
      u.sovereignBeaten    = !!(u.sovereignBeaten    || other.unlocks.sovereignBeaten);
      u.storyOnline        = !!(u.storyOnline        || other.unlocks.storyOnline);
      u.tfEndingSeen       = !!(u.tfEndingSeen       || other.unlocks.tfEndingSeen);
      u.damnationScar      = !!(u.damnationScar      || other.unlocks.damnationScar);
      u.storyDodgeUnlocked = !!(u.storyDodgeUnlocked || other.unlocks.storyDodgeUnlocked);
      u.paradoxCompanion   = !!(u.paradoxCompanion   || other.unlocks.paradoxCompanion);
      u.interTravel        = !!(u.interTravel        || other.unlocks.interTravel);
      u.patrolMode         = !!(u.patrolMode         || other.unlocks.patrolMode);
      u.godEncountered     = !!(u.godEncountered     || other.unlocks.godEncountered);
      u.godDefeated        = !!(u.godDefeated        || other.unlocks.godDefeated);
      u.letters            = _uniqMerge(u.letters, other.unlocks.letters);
      u.achievements       = _uniqMerge(u.achievements, other.unlocks.achievements);
    }

    out.cosmetics = _uniqMerge(out.cosmetics, other.cosmetics);

    if (other.storyProgress) {
      out.storyProgress = out.storyProgress || {};
      out.storyProgress.flags = Object.assign({}, other.storyProgress.flags || {}, out.storyProgress.flags || {});
    }
    if (other.story && out.story) {
      out.story.defeated = _uniqMerge(out.story.defeated, other.story.defeated).map(function(v) {
        const n = Number(v);
        return Number.isFinite(n) ? n : v;
      }).sort(function(a, b) { return Number(a) - Number(b); });
      out.story.blueprints = _uniqMerge(out.story.blueprints, other.story.blueprints);
      out.story.unlockedAbilities = _uniqMerge(out.story.unlockedAbilities, other.story.unlockedAbilities);
      out.story.storyComplete = !!(out.story.storyComplete || other.story.storyComplete);
    }
    if (other.progression) {
      out.progression = out.progression || {};
      if (other.progression.ship) {
        out.progression.ship = out.progression.ship || {};
        out.progression.ship.built = !!((out.progression.ship && out.progression.ship.built) || other.progression.ship.built);
        if (other.progression.ship.parts) {
          out.progression.ship.parts = Object.assign({}, other.progression.ship.parts, out.progression.ship.parts || {});
        }
      }
      const mineFract = _fractureMap(out);
      const otherFract = _fractureMap(other);
      const mergedFractures = {};
      Object.keys(otherFract).concat(Object.keys(mineFract)).forEach(function(id) {
        const mine = mineFract[id] || { id: id, unlocked: false, previewed: false, completed: false };
        const theirs = otherFract[id] || { id: id, unlocked: false, previewed: false, completed: false };
        mergedFractures[id] = {
          id: id,
          unlocked:  !!(mine.unlocked  || theirs.unlocked),
          previewed: !!(mine.previewed || theirs.previewed),
          completed:  !!(mine.completed  || theirs.completed),
        };
      });
      if (Object.keys(mergedFractures).length > 0) {
        out.progression.fractures = Object.values(mergedFractures);
      }
      if (typeof other.progression.motivationStage === 'number') {
        const mineStage = typeof out.progression.motivationStage === 'number' ? out.progression.motivationStage : 0;
        out.progression.motivationStage = Math.max(mineStage, other.progression.motivationStage);
      }
    }

    if (other.settings) {
      out.settings = out.settings || {};
      if (typeof out.settings.sfxVol !== 'number') out.settings.sfxVol = other.settings.sfxVol;
      if (typeof out.settings.sfxMute === 'undefined') out.settings.sfxMute = !!other.settings.sfxMute;
      if (typeof out.settings.musicMute === 'undefined') out.settings.musicMute = !!other.settings.musicMute;
      if (typeof out.settings.ragdoll === 'undefined') out.settings.ragdoll = !!other.settings.ragdoll;
    }

    return out;
  }

  function _coalesceList(primary, secondary) {
    const out = [];
    const push = function(value) {
      if (value === null || value === undefined || value === '') return;
      const key = String(value);
      if (out.indexOf(key) === -1) out.push(key);
    };
    (Array.isArray(primary) ? primary : []).forEach(push);
    (Array.isArray(secondary) ? secondary : []).forEach(push);
    return out;
  }

  function _buildProgressRow(save) {
    return {
      user_id: _user.id,
      save_version: save.version || 3,
      progress_data: {
        storyProgress: save.storyProgress || null,
        progression: save.progression || null,
        unlocks: save.unlocks || null,
        coins: typeof save.coins === 'number' ? save.coins : 0,
        cosmetics: Array.isArray(save.cosmetics) ? save.cosmetics : [],
        settings: save.settings || null,
      },
      updated_at: new Date().toISOString(),
    };
  }

  function _buildStatsRow(save) {
    const sessionStats = (typeof window._achStats === 'object' && window._achStats) ? window._achStats : {};
    const stats = {
      session: sessionStats,
      winsP1: (typeof window.winsP1 === 'number') ? window.winsP1 : 0,
      winsP2: (typeof window.winsP2 === 'number') ? window.winsP2 : 0,
      playerCoins: (typeof window.playerCoins === 'number') ? window.playerCoins : 0,
      cosmeticsUnlocked: Array.isArray(save.cosmetics) ? save.cosmetics.length : 0,
      storyChaptersBeaten: save.story && Array.isArray(save.story.defeated) ? save.story.defeated.length : 0,
      achievements: save.unlocks && Array.isArray(save.unlocks.achievements) ? save.unlocks.achievements.length : 0,
    };
    return {
      user_id: _user.id,
      stats_data: stats,
      updated_at: new Date().toISOString(),
    };
  }

  function _buildSnapshotRow(save) {
    const data = JSON.parse(JSON.stringify(save || {}));
    data.meta = data.meta || {};
    if (typeof data.meta.updatedAt !== 'number' || !data.meta.updatedAt) data.meta.updatedAt = Date.now();
    data.meta.source = 'cloud';
    return {
      user_id: _user.id,
      save_version: data.version || 3,
      save_data: data,
      client_updated_at: new Date(data.meta.updatedAt).toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  function _buildProfileRow(save) {
    const active = (typeof window.GameState !== 'undefined' && typeof GameState.getActiveAccount === 'function')
      ? GameState.getActiveAccount()
      : null;
    const profileName = active && active.username
      ? active.username
      : (save && save.profile && save.profile.displayName) || (_user.email ? _user.email.split('@')[0] : 'Player');
    return {
      user_id: _user.id,
      email: _user.email || '',
      display_name: String(profileName || 'Player').slice(0, 32),
      provider: (_user.app_metadata && _user.app_metadata.provider) ? String(_user.app_metadata.provider) : 'email',
      last_login_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  function _extractWeapons(save) {
    const raw = [];
    const add = function(value) {
      if (value === null || value === undefined || value === '') return;
      const key = String(value).trim();
      if (!key) return;
      if (raw.indexOf(key) === -1) raw.push(key);
    };
    if (Array.isArray(save.weaponsUnlocked)) save.weaponsUnlocked.forEach(add);
    if (save.unlocks && Array.isArray(save.unlocks.weapons)) save.unlocks.weapons.forEach(add);
    if (save.story && Array.isArray(save.story.unlockedWeapons)) save.story.unlockedWeapons.forEach(add);
    if (save.progression && Array.isArray(save.progression.weapons)) save.progression.weapons.forEach(add);
    return raw;
  }

  function _extractChapters(save) {
    const chapters = [];
    if (save.story && Array.isArray(save.story.defeated)) {
      save.story.defeated.forEach(function(idx) {
        const n = Number(idx);
        if (Number.isFinite(n) && chapters.indexOf(n) === -1) chapters.push(n);
      });
    }
    return chapters;
  }

  function _extractCosmetics(save) {
    const ids = [];
    if (Array.isArray(save.cosmetics)) {
      save.cosmetics.forEach(function(id) {
        const key = String(id || '').trim();
        if (key && ids.indexOf(key) === -1) ids.push(key);
      });
    }
    return ids;
  }

  async function _upsertRows(client, table, rows, conflictCol) {
    if (!rows || rows.length === 0) {
      const del = await client.from(table).delete().eq('user_id', _user.id);
      if (del.error) throw del.error;
      return;
    }
    const payload = rows.map(function(row) {
      return Object.assign({ user_id: _user.id }, row);
    });
    const opts = conflictCol ? { onConflict: 'user_id,' + conflictCol } : {};
    const res = await client.from(table).upsert(payload, opts);
    if (res.error) throw res.error;
  }

  async function syncFromRuntime(saveOverride) {
    if (!isAvailable()) return { skipped: true, reason: 'unavailable' };
    if (_syncInFlight) return { skipped: true, reason: 'in_flight' };
    await ensureReady();
    if (!_session || !_user) return { skipped: true, reason: 'signed_out' };
    const save = saveOverride || _runtimeSave();
    if (!save) return { skipped: true, reason: 'no-save' };
    const client = await getClient();
    const saveCopy = JSON.parse(JSON.stringify(save));
    if (!saveCopy.meta) saveCopy.meta = {};
    if (typeof saveCopy.meta.updatedAt !== 'number' || !saveCopy.meta.updatedAt) saveCopy.meta.updatedAt = Date.now();
    saveCopy.meta.source = 'local';

    const weapons = _extractWeapons(saveCopy);
    const chapters = _extractChapters(saveCopy);
    const cosmetics = _extractCosmetics(saveCopy);

    const weaponRows = weapons.map(function(weapon_key) {
      return { weapon_key: weapon_key, unlocked_at: new Date().toISOString() };
    });
    const chapterRows = chapters.map(function(chapter_index) {
      return { chapter_index: chapter_index, beaten_at: new Date().toISOString() };
    });
    const cosmeticRows = cosmetics.map(function(cosmetic_id) {
      return { cosmetic_id: cosmetic_id, unlocked_at: new Date().toISOString() };
    });

    try {
      _syncInFlight = true;
      const profileRes = await client.from('player_profiles').upsert(_buildProfileRow(saveCopy));
      if (profileRes.error) throw profileRes.error;
      const progressRes = await client.from('player_progress').upsert(_buildProgressRow(saveCopy));
      if (progressRes.error) throw progressRes.error;
      const statsRes = await client.from('player_stats').upsert(_buildStatsRow(saveCopy));
      if (statsRes.error) throw statsRes.error;
      const snapshotRes = await client.from('player_save_snapshots').upsert(_buildSnapshotRow(saveCopy));
      if (snapshotRes.error) throw snapshotRes.error;
      await _upsertRows(client, 'player_unlocked_weapons', weaponRows, 'weapon_key');
      await _upsertRows(client, 'player_chapters_beaten', chapterRows, 'chapter_index');
      await _upsertRows(client, 'player_cosmetics', cosmeticRows, 'cosmetic_id');
      if (typeof window.GameState !== 'undefined' && typeof GameState.update === 'function' && typeof GameState.save === 'function') {
        GameState.update(function(s) {
          const acct = s.persistent.accounts && s.persistent.activeAccountId
            ? s.persistent.accounts[s.persistent.activeAccountId]
            : null;
          if (acct) {
            if (!acct.data) acct.data = {};
            acct.data.meta = Object.assign({}, acct.data.meta || {}, {
              updatedAt: saveCopy.meta.updatedAt,
              source: 'cloud',
            });
          }
        });
        GameState.save();
      }
      _emit('synced', { source: 'local', userId: _user.id });
      return { ok: true };
    } finally {
      _syncInFlight = false;
      _syncQueued = null;
    }
  }

  async function logSuspiciousActivity(type, details) {
    try {
      await ensureReady();
      if (!_session || !_user) return { skipped: true, reason: 'signed_out' };
      const client = await getClient();
      return client.from('suspicious_activity').insert({
        user_id: _user.id,
        event_type: String(type || 'unknown').slice(0, 80),
        details: details || {},
      });
    } catch (e) {
      return { skipped: true, reason: e.message || 'error' };
    }
  }

  function _rewardHash(input) {
    const text = String(input || '');
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function _makeRewardClaimKey(payload) {
    const reward = payload && payload.reward ? payload.reward : {};
    const stats = (typeof window._achStats === 'object' && window._achStats) ? window._achStats : {};
    const accountId = _user && _user.id ? _user.id : 'anon';
    const mode = String(reward.mode || window.gameMode || 'unknown');
    const arena = String(reward.arena || window.currentArenaKey || 'unknown');
    const rewardType = String(payload.rewardType || 'match');
    const matchStart = Number(stats.matchStartTime || 0);
    const coins = Number(reward.coins || 0);
    const chapterAdvance = Number(reward.chapterAdvance || 0);
    const chapterTarget = Number(reward.chapterTarget || 0);
    return [
      'rw',
      accountId,
      rewardType,
      mode,
      arena,
      String(matchStart),
      String(coins),
      String(chapterAdvance),
      String(chapterTarget),
      _rewardHash([accountId, rewardType, mode, arena, matchStart, coins, chapterAdvance, chapterTarget].join('|')),
    ].join(':').slice(0, 180);
  }

  function _isServerUnavailable(err, resp) {
    if (resp && resp.status >= 500) return true;
    if (!err) return false;
    const msg = String(err.message || err);
    return /fetch|network|failed to fetch|load failed|timeout/i.test(msg);
  }

  function _applyOfflineRewardFallback(reward) {
    if (typeof window.applyRewardDeltaLocally === 'function') {
      return window.applyRewardDeltaLocally(reward);
    }
    if (reward && typeof reward.coins === 'number' && typeof addCoins === 'function') {
      addCoins(reward.coins);
    }
    return { ok: true, offline: true };
  }

  async function claimMatchRewards(payload) {
    const body = payload && typeof payload === 'object' ? JSON.parse(JSON.stringify(payload)) : {};
    const reward = body.reward && typeof body.reward === 'object' ? body.reward : {};
    body.rewardType = body.rewardType || 'match';
    body.claimKey = body.claimKey || _makeRewardClaimKey(body);
    body.reward = reward;

    try {
      await ensureReady();
      if (!_session || !_user) {
        return _applyOfflineRewardFallback(reward);
      }
      const token = _session.access_token || '';
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await resp.json().catch(function() { return null; });
      if (!resp.ok) {
        if (_isServerUnavailable(null, resp)) {
          return _applyOfflineRewardFallback(reward);
        }
        return {
          ok: false,
          status: resp.status,
          error: data && data.error ? data.error : 'Reward claim rejected',
          claimKey: body.claimKey,
          duplicate: !!(data && data.duplicate),
        };
      }
      if (data && data.save) {
        if (typeof window.applyServerRewardSave === 'function') {
          window.applyServerRewardSave(data.save);
        } else if (typeof window._applySaveData === 'function' && typeof window._refreshRuntimeFromSave === 'function') {
          window._applySaveData(data.save);
          window._refreshRuntimeFromSave(data.save);
        }
      }
      return data || { ok: true, claimKey: body.claimKey };
    } catch (err) {
      if (_isServerUnavailable(err)) {
        return _applyOfflineRewardFallback(reward);
      }
      return { ok: false, error: err && err.message ? err.message : 'Reward claim failed', claimKey: body.claimKey };
    }
  }

  async function fetchRemoteSave() {
    if (!isAvailable()) return null;
    await ensureReady();
    if (!_session || !_user) return null;
    const client = await getClient();
    const { data, error } = await client
      .from('player_save_snapshots')
      .select('save_version, save_data, updated_at, client_updated_at')
      .eq('user_id', _user.id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function reconcileActiveSave() {
    if (!isAvailable()) return { skipped: true, reason: 'unavailable' };
    await ensureReady();
    if (!_session || !_user) return { skipped: true, reason: 'signed_out' };

    const local = _runtimeSave();
    const remote = await fetchRemoteSave();
    const localTs = _localSaveTimestamp(local);
    const remoteTs = _saveTimestampFromRow(remote);
    const localScore = _saveMeaningfulScore(local);
    const remoteScore = _saveMeaningfulScore(remote && remote.save_data ? remote.save_data : null);
    const hasRemote = !!(remote && remote.save_data);
    const chooseRemote = hasRemote && (
      (!local && remoteScore > 0) ||
      (remoteScore > 0 && localScore === 0) ||
      (remoteScore > 0 && localScore > 0 && remoteTs >= localTs)
    );

    if (chooseRemote) {
      const merged = local ? _mergeSaveData(remote.save_data, local) : _cloneSave(remote.save_data);
      if (merged && typeof window._applySaveData === 'function') window._applySaveData(merged);
      if (merged && typeof window._refreshRuntimeFromSave === 'function') window._refreshRuntimeFromSave(merged);
      if (typeof window.GameState !== 'undefined' && typeof saveGame === 'function') {
        window.__SMB_SUPPRESS_CLOUD_SYNC = true;
        window.__SMB_PENDING_SAVE_TIMESTAMP = remoteTs || Date.now();
        try { saveGame(); } finally {
          window.__SMB_SUPPRESS_CLOUD_SYNC = false;
          window.__SMB_PENDING_SAVE_TIMESTAMP = undefined;
        }
      }
      _emit('loaded_remote', { updatedAt: remote.updated_at || remote.client_updated_at || null });
      return { source: 'cloud' };
    }

    if (local) {
      const merged = hasRemote ? _mergeSaveData(local, remote.save_data) : local;
      await syncFromRuntime(merged);
      _emit('loaded_local', { updatedAt: localTs || null });
      return { source: 'local' };
    }

    return { skipped: true, reason: 'no-local-save' };
  }

  function queueSyncFromRuntime(saveOverride) {
    if (!isAvailable()) return;
    if (!_session || !_user) return;
    _syncQueued = saveOverride || _runtimeSave();
    if (!_syncQueued) return;
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(async function() {
      _syncTimer = null;
      if (_syncInFlight) return;
      try {
        await syncFromRuntime(_syncQueued);
      } catch (e) {
        _emit('sync_error', e);
      } finally {
        _syncQueued = null;
      }
    }, 800);
  }

  async function signInWithGoogle() {
    const client = await getClient();
    return client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: _redirectTarget() },
    });
  }

  async function signInAndLoad(email, password) {
    const res = await signIn(email, password);
    if (res && !res.error) {
      await reconcileActiveSave();
    }
    return res;
  }

  async function signUpAndLoad(email, password) {
    const res = await signUp(email, password);
    if (res && res.data && res.data.session) {
      await reconcileActiveSave();
    }
    return res;
  }

  function suppressNextSync() {
    window.__SMB_SUPPRESS_CLOUD_SYNC = true;
  }

  function clearSuppressNextSync() {
    window.__SMB_SUPPRESS_CLOUD_SYNC = false;
  }

  void bootstrap();

  return {
    isAvailable,
    isRuntimeReady,
    ensureReady,
    bootstrap,
    getClient,
    getState,
    getSession,
    getUser,
    isSignedIn,
    onChange,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    logSuspiciousActivity,
    claimMatchRewards,
    signInAndLoad,
    signUpAndLoad,
    fetchRemoteSave,
    reconcileActiveSave,
    queueSyncFromRuntime,
    suppressNextSync,
    clearSuppressNextSync,
  };
})();

window.SupabaseBridge = SupabaseBridge;

const SovereignAdaptiveMemory = (() => {
  const _sessions = new Map();
  const _table = 'sovereign_matchup_memory';
  const _routeNames = ['direct', 'crossup', 'delayed'];

  function _clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function _safeJsonClone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (e) { return null; }
  }

  function _emptyActionCounts() {
    return {
      attack: 0,
      shield: 0,
      jump: 0,
      dodge: 0,
      idle: 0,
      edge: 0,
      melee: 0,
      ranged: 0,
    };
  }

  function _emptyContextCounts() {
    return { grounded: 0, airborne: 0, edge: 0 };
  }

  function _emptyPunishStats() {
    return {
      direct:  { hits: 0, escapes: 0 },
      crossup: { hits: 0, escapes: 0 },
      delayed: { hits: 0, escapes: 0 },
    };
  }

  function _emptySourceCounts() {
    return { human: 0, self_play: 0, replay: 0 };
  }

  function _normalizeKey(value, fallback) {
    const key = String(value || fallback || 'unknown').trim().toLowerCase();
    return key || String(fallback || 'unknown');
  }

  function _resolveTargetParts(target) {
    const weaponKey = _normalizeKey(target && target.weaponKey, 'sword');
    const classKey = _normalizeKey(target && target.charClass, 'none');
    const loadoutKey = `${weaponKey}|${classKey}`;
    return {
      weaponKey,
      classKey,
      loadoutKey,
      sessionKey: loadoutKey,
    };
  }

  function _getSession(parts) {
    const key = parts.sessionKey;
    if (_sessions.has(key)) return _sessions.get(key);
    const session = {
      key,
      weaponKey: parts.weaponKey,
      classKey: parts.classKey,
      loadoutKey: parts.loadoutKey,
      observed: 0,
      currentActionCounts: _emptyActionCounts(),
      currentContextCounts: _emptyContextCounts(),
      currentPunishStats: _emptyPunishStats(),
      currentTendencies: {
        aggression: 0,
        shield: 0,
        jump: 0,
        edgeCamp: 0,
        meleePressure: 0,
        passive: 0,
      },
      currentSourceCounts: _emptySourceCounts(),
      globalSummary: null,
      globalLoaded: false,
      globalLoading: false,
      globalLoadError: null,
      loadPromise: null,
      lastObservedAt: 0,
      lastSummary: null,
    };
    _sessions.set(key, session);
    return session;
  }

  function _mergeCounts(target, source) {
    const out = target || {};
    if (!source) return out;
    for (const [key, value] of Object.entries(source)) {
      out[key] = (Number(out[key]) || 0) + (Number(value) || 0);
    }
    return out;
  }

  function _mergePunishStats(target, source) {
    const out = target || _emptyPunishStats();
    if (!source) return out;
    for (const route of _routeNames) {
      const row = out[route] || { hits: 0, escapes: 0 };
      const add = source[route] || {};
      row.hits    = (Number(row.hits) || 0) + (Number(add.hits) || 0);
      row.escapes = (Number(row.escapes) || 0) + (Number(add.escapes) || 0);
      out[route] = row;
    }
    return out;
  }

  function _mergeSourceCounts(target, source) {
    const out = target || _emptySourceCounts();
    if (!source) return out;
    for (const [key, value] of Object.entries(source)) {
      out[key] = (Number(out[key]) || 0) + (Number(value) || 0);
    }
    return out;
  }

  function _effectiveSampleCount(summary) {
    if (!summary) return 0;
    const counts = summary.source_counts || summary.sourceCounts || null;
    const human = Number(counts && counts.human) || 0;
    const selfPlay = Number(counts && counts.self_play) || 0;
    const replay = Number(counts && counts.replay) || 0;
    const raw = Number(summary.sample_count) || 0;
    return Math.max(0, raw + human * 0.3 + replay * 0.15 - selfPlay * 0.05);
  }

  function _bucketKey(type, value) {
    return `${type}:${String(value || 'unknown').trim().toLowerCase()}`;
  }

  function _rowFromSession(session, bucketType, bucketValue, outcome, summary) {
    const row = {
      bucket_key: _bucketKey(bucketType, bucketValue),
      bucket_type: bucketType,
      bucket_value: String(bucketValue || 'unknown'),
      sample_count: 1,
      win_count: outcome.sovereignWon ? 1 : 0,
      loss_count: outcome.sovereignWon ? 0 : 1,
      action_counts: _safeJsonClone(session.currentActionCounts) || _emptyActionCounts(),
      context_counts: _safeJsonClone(session.currentContextCounts) || _emptyContextCounts(),
      punish_stats: _safeJsonClone(session.currentPunishStats) || _emptyPunishStats(),
      tendency_stats: _safeJsonClone(session.currentTendencies) || {},
      source_counts: _safeJsonClone(session.currentSourceCounts) || _emptySourceCounts(),
      last_summary: summary || {},
      updated_at: new Date().toISOString(),
    };
    return row;
  }

  function _mergeRows(existing, incoming) {
    if (!existing) return _safeJsonClone(incoming);
    const out = _safeJsonClone(existing) || {};
    out.sample_count = (Number(out.sample_count) || 0) + (Number(incoming.sample_count) || 0);
    out.win_count = (Number(out.win_count) || 0) + (Number(incoming.win_count) || 0);
    out.loss_count = (Number(out.loss_count) || 0) + (Number(incoming.loss_count) || 0);
    out.action_counts = _mergeCounts(out.action_counts || _emptyActionCounts(), incoming.action_counts);
    out.context_counts = _mergeCounts(out.context_counts || _emptyContextCounts(), incoming.context_counts);
    out.punish_stats = _mergePunishStats(out.punish_stats || _emptyPunishStats(), incoming.punish_stats);
    out.tendency_stats = _mergeCounts(out.tendency_stats || {}, incoming.tendency_stats);
    out.source_counts = _mergeSourceCounts(out.source_counts || _emptySourceCounts(), incoming.source_counts);
    out.last_summary = incoming.last_summary || out.last_summary || {};
    out.bucket_key = incoming.bucket_key || out.bucket_key;
    out.bucket_type = incoming.bucket_type || out.bucket_type;
    out.bucket_value = incoming.bucket_value || out.bucket_value;
    out.updated_at = incoming.updated_at || out.updated_at;
    return out;
  }

  function _mergeSummaries(rows) {
    const summary = {
      sample_count: 0,
      win_count: 0,
      loss_count: 0,
      action_counts: _emptyActionCounts(),
      context_counts: _emptyContextCounts(),
      punish_stats: _emptyPunishStats(),
      tendency_stats: {},
      source_counts: _emptySourceCounts(),
      row_count: 0,
    };
    for (const row of rows || []) {
      if (!row) continue;
      summary.row_count++;
      summary.sample_count += Number(row.sample_count) || 0;
      summary.win_count += Number(row.win_count) || 0;
      summary.loss_count += Number(row.loss_count) || 0;
      summary.action_counts = _mergeCounts(summary.action_counts, row.action_counts);
      summary.context_counts = _mergeCounts(summary.context_counts, row.context_counts);
      summary.punish_stats = _mergePunishStats(summary.punish_stats, row.punish_stats);
      summary.tendency_stats = _mergeCounts(summary.tendency_stats, row.tendency_stats);
      summary.source_counts = _mergeSourceCounts(summary.source_counts, row.source_counts);
    }
    return summary;
  }

  function _deriveState(session) {
    const localObs = Math.max(1, session.observed);
    const globalSummary = session.globalSummary || null;
    const globalObs = globalSummary ? _effectiveSampleCount(globalSummary) : 0;

    const localWeight = _clamp((localObs - 4) / 18, 0, 1);
    const globalWeight = _clamp(globalObs / 14, 0, 1);
    const blendLocal = 0.25 + localWeight * 0.75;
    const blendGlobal = (0.15 + globalWeight * 0.85) * (1 - 0.35 * blendLocal);

    const localAction = session.currentActionCounts;
    const localContext = session.currentContextCounts;
    const localPunish = session.currentPunishStats;
    const globalAction = globalSummary ? globalSummary.action_counts : _emptyActionCounts();
    const globalContext = globalSummary ? globalSummary.context_counts : _emptyContextCounts();
    const globalPunish = globalSummary ? globalSummary.punish_stats : _emptyPunishStats();

    const localTotal = Object.values(localAction).reduce((s, n) => s + (Number(n) || 0), 0);
    const globalTotal = Object.values(globalAction).reduce((s, n) => s + (Number(n) || 0), 0);

    const localAttack = localTotal > 0 ? ((localAction.attack || 0) / localTotal) : 0;
    const localShield = localTotal > 0 ? ((localAction.shield || 0) / localTotal) : 0;
    const localJump   = localTotal > 0 ? ((localAction.jump || 0) / localTotal) : 0;
    const localDodge  = localTotal > 0 ? ((localAction.dodge || 0) / localTotal) : 0;
    const localEdge   = localTotal > 0 ? ((localAction.edge || 0) / localTotal) : 0;
    const localMelee  = localTotal > 0 ? ((localAction.melee || 0) / localTotal) : 0;
    const localPassive = localTotal > 0 ? ((localAction.idle || 0) / localTotal) : 0;

    const globalAttack = globalTotal > 0 ? (((globalAction.attack || 0) + (globalAction.dodge || 0) * 0.25) / globalTotal) : 0;
    const globalShield = globalTotal > 0 ? ((globalAction.shield || 0) / globalTotal) : 0;
    const globalJump   = globalTotal > 0 ? ((globalAction.jump || 0) / globalTotal) : 0;
    const globalEdge   = globalTotal > 0 ? ((globalAction.edge || 0) / globalTotal) : 0;

    const localRouteHits = {
      direct:  localPunish.direct.hits + localPunish.direct.escapes,
      crossup: localPunish.crossup.hits + localPunish.crossup.escapes,
      delayed: localPunish.delayed.hits + localPunish.delayed.escapes,
    };
    const globalRouteHits = {
      direct:  globalPunish.direct.hits + globalPunish.direct.escapes,
      crossup: globalPunish.crossup.hits + globalPunish.crossup.escapes,
      delayed: globalPunish.delayed.hits + globalPunish.delayed.escapes,
    };

    function _routeRate(route, hits, total) {
      return total > 0 ? (hits + 0.5) / (total + 1) : 0.5;
    }

    const localRouteBias = {
      direct:  _routeRate('direct', localPunish.direct.hits, localRouteHits.direct),
      crossup: _routeRate('crossup', localPunish.crossup.hits, localRouteHits.crossup),
      delayed: _routeRate('delayed', localPunish.delayed.hits, localRouteHits.delayed),
    };
    const globalRouteBias = {
      direct:  _routeRate('direct', globalPunish.direct.hits, globalRouteHits.direct),
      crossup: _routeRate('crossup', globalPunish.crossup.hits, globalRouteHits.crossup),
      delayed: _routeRate('delayed', globalPunish.delayed.hits, globalRouteHits.delayed),
    };

    const meleeThreat = /hammer|axe|sword|spear|gauntlet|nullblade|voidblade|scythe|shield|boxing gloves|frying pan|broomstick|mk\. gauntlets/.test(
      `${session.weaponKey} ${session.classKey}`
    );

    const aggressionBias = _clamp(
      (globalAttack * 0.18 * blendGlobal) +
      (localAttack * 0.28 * blendLocal) +
      (meleeThreat ? 0.05 : 0) +
      (localPassive > 0.28 ? -0.03 : 0),
      -0.08,
      0.28
    );
    const defenseBias = _clamp(
      (globalShield * 0.16 * blendGlobal) +
      (localShield * 0.24 * blendLocal) +
      (localJump * 0.08 * blendLocal) +
      (meleeThreat ? 0.05 : 0),
      0,
      0.32
    );
    const spacingShift = _clamp(
      (localAttack > 0.28 ? -0.05 : 0) +
      (localShield > 0.18 ? -0.04 : 0) +
      (localEdge > 0.18 ? -0.05 : 0) +
      (globalAttack > 0.24 ? -0.03 : 0),
      -0.16,
      0.04
    );
    const reactionBoost = _clamp(
      (globalJump * 0.08 * blendGlobal) +
      (localJump * 0.14 * blendLocal) +
      (localEdge > 0.18 ? 0.05 : 0),
      0,
      0.28
    );
    const dodgeBias = _clamp(
      1 + (localJump * 0.85 * blendLocal) + (globalJump * 0.35 * blendGlobal),
      1,
      1.9
    );
    const baitBias = _clamp(
      1 + (localPassive * 0.75 * blendLocal) + (globalAttack < 0.22 ? 0.18 : 0) - (localAttack * 0.40 * blendLocal),
      0.62,
      1.85
    );
    const shieldBias = _clamp(
      (localShield * 1.0 * blendLocal) + (globalShield * 0.50 * blendGlobal) + (meleeThreat ? 0.14 : 0),
      0,
      0.60
    );

    const routeBias = {
      direct:  _clamp((localRouteBias.direct * blendLocal) + (globalRouteBias.direct * blendGlobal) + (meleeThreat ? 0.12 : 0), 0.28, 2.0),
      crossup: _clamp((localRouteBias.crossup * blendLocal) + (globalRouteBias.crossup * blendGlobal) + (localJump * 0.35), 0.28, 2.0),
      delayed: _clamp((localRouteBias.delayed * blendLocal) + (globalRouteBias.delayed * blendGlobal) + (localShield * 0.30), 0.28, 2.0),
    };

    return {
      loaded: !!session.globalLoaded,
      loading: !!session.globalLoading,
      localWeight,
      globalWeight,
      aggressionBias,
      defenseBias,
      spacingShift,
      reactionBoost,
      dodgeBias,
      baitBias,
      shieldBias,
      routeBias,
      meleeThreat,
      openingStyle: localShield > 0.20 ? 'defensive' : localJump > 0.20 ? 'airborne' : localAttack > 0.26 ? 'aggressive' : localEdge > 0.18 ? 'edge' : 'balanced',
      summary: {
        weaponKey: session.weaponKey,
        classKey: session.classKey,
        loadoutKey: session.loadoutKey,
        observed: session.observed,
        localActionCounts: _safeJsonClone(localAction) || _emptyActionCounts(),
        localContextCounts: _safeJsonClone(localContext) || _emptyContextCounts(),
        localPunishStats: _safeJsonClone(localPunish) || _emptyPunishStats(),
        localSourceCounts: _safeJsonClone(session.currentSourceCounts) || _emptySourceCounts(),
        globalSummary: _safeJsonClone(globalSummary) || null,
      },
    };
  }

  async function _loadGlobalSummary(session) {
    if (session.globalLoading || session.globalLoaded) return;
    if (!window.SupabaseBridge || typeof SupabaseBridge.isAvailable !== 'function' || !SupabaseBridge.isAvailable()) {
      session.globalLoaded = true;
      session.globalSummary = null;
      return;
    }

    session.globalLoading = true;
    try {
      const client = await SupabaseBridge.getClient();
      const keys = [
        _bucketKey('weapon', session.weaponKey),
        _bucketKey('class', session.classKey),
        _bucketKey('loadout', session.loadoutKey),
      ];
      const res = await client
        .from(_table)
        .select('*')
        .in('bucket_key', keys);
      if (res.error) throw res.error;
      session.globalSummary = _mergeSummaries(res.data || []);
      session.globalLoaded = true;
      session.globalLoadError = null;
    } catch (e) {
      session.globalSummary = null;
      session.globalLoaded = true;
      session.globalLoadError = e && e.message ? e.message : 'unknown';
    } finally {
      session.globalLoading = false;
    }
  }

  function _recordObservation(session, payload) {
    const currentAction = String(payload.currentAction || 'idle');
    const bmObs = payload.bmObs || {};
    const bmPred = payload.bmPred || {};
    const bmRead = payload.bmRead || {};
    const target = payload.target || null;

    session.observed++;
    session.lastObservedAt = Date.now();

    const actionCounts = session.currentActionCounts;
    actionCounts[currentAction] = (Number(actionCounts[currentAction]) || 0) + 1;
    if (bmObs.context === BM_CTX.EDGE) session.currentActionCounts.edge++;
    if (bmObs.context === BM_CTX.AIRBORNE) session.currentContextCounts.airborne++;
    if (bmObs.context === BM_CTX.GROUNDED) session.currentContextCounts.grounded++;
    if (bmObs.context === BM_CTX.EDGE) session.currentContextCounts.edge++;

    const targetWeapon = String(target && target.weaponKey || session.weaponKey || '').toLowerCase();
    const targetClass = String(target && target.charClass || session.classKey || '').toLowerCase();
    if (targetWeapon) {
      const meleeKeys = ['hammer', 'axe', 'sword', 'spear', 'gauntlet', 'nullblade', 'voidblade', 'scythe', 'shield', 'boxing gloves', 'frying pan', 'broomstick', 'mk. gauntlets'];
      const isMelee = meleeKeys.includes(targetWeapon) || meleeKeys.includes(targetClass);
      if (isMelee) {
        session.currentActionCounts.melee++;
        session.currentTendencies.meleePressure += 1;
      } else {
        session.currentActionCounts.ranged++;
      }
    }

    if (currentAction === 'attack') session.currentTendencies.aggression += 1;
    if (currentAction === 'shield') session.currentTendencies.shield += 1;
    if (currentAction === 'jump') session.currentTendencies.jump += 1;
    if (currentAction === 'dodge') session.currentTendencies.edgeCamp += bmObs.context === BM_CTX.EDGE ? 1 : 0;
    if (currentAction === 'idle') session.currentTendencies.passive += 1;
    if (bmObs.context === BM_CTX.EDGE) session.currentTendencies.edgeCamp += 1;

    const route = payload.route || null;
    const landed = !!payload.punishLanded;
    if (route && session.currentPunishStats[route]) {
      if (landed) session.currentPunishStats[route].hits += 1;
      else session.currentPunishStats[route].escapes += 1;
    }

    if (bmRead && bmRead.style === 'aggressive') session.currentTendencies.aggression += 1;
    if (bmRead && bmRead.style === 'defensive') session.currentTendencies.shield += 1;
    if (bmRead && bmRead.style === 'airborne') session.currentTendencies.jump += 1;
    if (bmPred && (bmPred.action === PA.JUMP || bmPred.action === PA.AIRBORNE_ATK)) session.currentTendencies.jump += 0.5;
    if (bmPred && (bmPred.action === PA.ATTACK || bmPred.action === PA.AIRBORNE_ATK)) session.currentTendencies.aggression += 0.5;
    if (bmPred && bmPred.action === PA.BLOCK) session.currentTendencies.shield += 0.5;

    return _deriveState(session);
  }

  function _buildCommitRows(session, outcome, summary) {
    return [
      _rowFromSession(session, 'weapon', session.weaponKey, outcome, summary),
      _rowFromSession(session, 'class', session.classKey, outcome, summary),
      _rowFromSession(session, 'loadout', session.loadoutKey, outcome, summary),
    ];
  }

  function _buildSelfPlayRows(session, outcome, summary) {
    const rows = _buildCommitRows(session, outcome, summary).map(function(row) {
      const out = _safeJsonClone(row) || row;
      const punish = out.punish_stats || _emptyPunishStats();
      const routes = _routeNames.map(function(route) {
        const stats = punish[route] || { hits: 0, escapes: 0 };
        const total = (Number(stats.hits) || 0) + (Number(stats.escapes) || 0);
        const rate = total > 0 ? (Number(stats.hits) || 0) / total : 0.5;
        return { route, stats, rate };
      }).sort(function(a, b) {
        return a.rate - b.rate;
      });

      const weak = routes[0] || { route: 'direct', stats: { hits: 0, escapes: 0 } };
      punish[weak.route] = punish[weak.route] || { hits: 0, escapes: 0 };
      punish[weak.route].escapes = (Number(punish[weak.route].escapes) || 0) + 2;

      if ((session.currentTendencies.edgeCamp || 0) > 1 || (session.currentActionCounts.edge || 0) > 1) {
        out.context_counts.edge = (Number(out.context_counts.edge) || 0) + 2;
        out.tendency_stats.edgeCamp = (Number(out.tendency_stats.edgeCamp) || 0) + 2;
      }
      if ((session.currentActionCounts.jump || 0) > 1) {
        out.action_counts.jump = (Number(out.action_counts.jump) || 0) + 1;
        out.context_counts.airborne = (Number(out.context_counts.airborne) || 0) + 1;
        out.tendency_stats.jump = (Number(out.tendency_stats.jump) || 0) + 1;
      }
      if ((session.currentActionCounts.melee || 0) > 0 || (out.last_summary && out.last_summary.meleeThreat)) {
        out.tendency_stats.meleePressure = (Number(out.tendency_stats.meleePressure) || 0) + 1;
      }
      out.action_counts.idle = (Number(out.action_counts.idle) || 0) + 1;
      out.source_counts = _mergeSourceCounts(out.source_counts || _emptySourceCounts(), { self_play: 1 });
      out.last_summary = Object.assign({}, out.last_summary || {}, {
        source: 'self_play',
        training: true,
        weakRoute: weak.route,
        replayMeta: null,
      });
      return out;
    });
    return rows;
  }

  async function _postSovereignMemoryCommit(payload) {
    const token = _session && _session.access_token ? _session.access_token : '';
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const resp = await fetch('/api/sovereign/memory/commit', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(function() { return null; });
    if (!resp.ok) {
      const err = new Error((data && data.error) ? data.error : `Sovereign memory commit failed (${resp.status})`);
      err.status = resp.status;
      err.data = data;
      throw err;
    }
    return data || { ok: true };
  }

  async function observe(ai, payload) {
    const target = payload && payload.target ? payload.target : (ai && ai.target) || null;
    if (!target) return null;

    const parts = _resolveTargetParts(target);
    const session = _getSession(parts);

    if (!session.loadPromise && !session.globalLoaded) {
      session.loadPromise = _loadGlobalSummary(session).finally(function() {
        session.loadPromise = null;
      });
    }

    const state = _recordObservation(session, Object.assign({ target: target }, payload || {}, parts));
    if (ai) {
      ai._adaptiveMemoryKey = session.key;
      ai._adaptiveMemoryState = state;
      ai._adaptiveMemorySession = session;
    }
    return state;
  }

  async function commit(ai, payload) {
    try {
      const target = payload && payload.target ? payload.target : (ai && ai.target) || null;
      if (!target) return { skipped: true, reason: 'no-target' };

      const parts = _resolveTargetParts(target);
      const session = _getSession(parts);
      const outcome = {
        sovereignWon: !!(payload && payload.sovereignWon),
        mode: payload && payload.mode ? String(payload.mode) : 'sovereign',
        arenaKey: payload && payload.arenaKey ? String(payload.arenaKey) : 'unknown',
        durationSec: payload && payload.durationSec ? Number(payload.durationSec) : 0,
        replayVersion: payload && payload.replay && payload.replay.version ? String(payload.replay.version) : null,
      };

      const summary = {
        matchup: parts,
        mode: outcome.mode,
        arenaKey: outcome.arenaKey,
        durationSec: outcome.durationSec,
        replayMeta: payload && payload.replay && payload.replay.meta ? _safeJsonClone(payload.replay.meta) : null,
        winner: payload && payload.winner ? String(payload.winner.name || 'unknown') : null,
        source: payload && payload.source ? String(payload.source) : 'human',
      };

      const humanRows = _buildCommitRows(session, outcome, summary);
      humanRows.forEach(function(row) {
        row.source_counts = _mergeSourceCounts(row.source_counts || _emptySourceCounts(), {
          human: 1,
          replay: payload && payload.replay ? 1 : 0,
        });
        row.last_summary = Object.assign({}, row.last_summary || {}, summary);
      });

      const shouldTrain = payload && payload.autoTrain !== false;
      const trainingRows = shouldTrain ? _buildSelfPlayRows(session, outcome, summary) : [];
      const commitRows = humanRows.concat(trainingRows);

      const remote = await _postSovereignMemoryCommit({
        rows: commitRows,
        source: summary.source,
        target: parts,
        summary,
      });

      session.currentSourceCounts.human += 1;
      if (payload && payload.replay) session.currentSourceCounts.replay += 1;
      if (trainingRows.length) session.currentSourceCounts.self_play += trainingRows.length;
      session.globalSummary = _mergeSummaries(commitRows);
      session.globalLoaded = true;
      session.globalLoadError = null;
      _sessions.delete(session.key);
      return { ok: true, rows: commitRows.length, bucketKey: session.key, remote };
    } catch (e) {
      return { skipped: true, reason: e && e.message ? e.message : 'commit_failed' };
    }
  }

  function resetSession(target) {
    const parts = _resolveTargetParts(target);
    _sessions.delete(parts.sessionKey);
  }

  function getState(target) {
    const parts = _resolveTargetParts(target);
    const session = _sessions.get(parts.sessionKey) || null;
    if (!session) return null;
    return _deriveState(session);
  }

  return {
    observe,
    commit,
    getState,
    resetSession,
  };
})();

window.SovereignAdaptiveMemory = SovereignAdaptiveMemory;
