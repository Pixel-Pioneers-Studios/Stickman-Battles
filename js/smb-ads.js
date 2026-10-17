'use strict';
// AdManager: one ad interface for every host. Loads after smb-crazygames.js.
// CrazyGames uses cgSdk, and no other ads are allowed there. Our own site and local
// builds use AD_CONFIG.provider. Other portals (itch, Newgrounds, Game Jolt) get nothing.
// Placement rules live here, not at call sites: interstitials only between matches,
// never online or in a cinematic, not in a new player's first minutes, and at most one
// per interstitialGapMs.

const AD_CONFIG = {
  provider: 'placeholder',         // 'placeholder' | 'none'; a real network adds a case in _provider
  interstitialGapMs: 180000,       // matches CrazyGames' midgame spacing
  newPlayerGraceMs: 300000,        // no interstitial in the first 5 minutes of a session
  placeholderAdSecs: 5,
};

const AdManager = (function () {
  const _sessionStart = Date.now();
  let _lastInterstitial = 0;
  let _showing = false;

  function _host() { return String(location.hostname || '').toLowerCase(); }
  function _onCrazyGames() {
    return /(^|\.)crazygames\.(com|com\.[a-z]{2}|co\.[a-z]{2}|[a-z]{2,3})$/i.test(_host()) ||
      !!(window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.environment === 'crazygames');
  }
  function _onOtherPortal() {
    return /(^|\.)(itch\.io|itch\.zone|hwcdn\.net|newgrounds\.com|ungrounded\.net|gamejolt\.(com|net|io))$/i.test(_host());
  }
  // 'cg' | 'placeholder' | 'none'
  function _provider() {
    if (_onCrazyGames()) return 'cg';
    if (_onOtherPortal()) return 'none';
    return AD_CONFIG.provider === 'placeholder' ? 'placeholder' : 'none';
  }

  function _stopRematch() {
    if (typeof _cancelRematchCountdown === 'function') { try { _cancelRematchCountdown(); } catch (e) {} }
  }

  // Full-screen stand-in for a video ad. Mutes game audio like a real ad must.
  function _placeholderAd(kind, secs, onFinish) {
    const ov = document.createElement('div');
    ov.className = 'ad-placeholder-overlay';
    ov.innerHTML =
      '<div class="ad-placeholder-box">' +
        '<div class="ad-placeholder-tag">AD PLACEHOLDER</div>' +
        '<div class="ad-placeholder-kind">' + (kind === 'rewarded' ? 'Rewarded video' : 'Interstitial') + '</div>' +
        '<div class="ad-placeholder-count"></div>' +
        (kind === 'rewarded' ? '<button class="btn ad-placeholder-skip">Close (no reward)</button>' : '') +
      '</div>';
    document.body.appendChild(ov);
    let wasMuted = null;
    try { if (typeof SoundManager !== 'undefined' && SoundManager.isMuted) { wasMuted = SoundManager.isMuted(); SoundManager.setMuted(true); } } catch (e) {}
    const countEl = ov.querySelector('.ad-placeholder-count');
    let left = secs;
    let done = false;
    function finish(ok) {
      if (done) return; done = true;
      clearInterval(iv);
      ov.remove();
      try { if (wasMuted !== null) SoundManager.setMuted(wasMuted || !!window._cgAudioMuted); } catch (e) {}
      onFinish(ok);
    }
    countEl.textContent = left + 's';
    const iv = setInterval(function () {
      left--;
      if (left <= 0) finish(true);
      else countEl.textContent = left + 's';
    }, 1000);
    const skip = ov.querySelector('.ad-placeholder-skip');
    if (skip) skip.onclick = function () { finish(false); };
  }

  // Interstitial: between matches only
  function interstitial(onDone) {
    function done() { if (onDone) { try { onDone(); } catch (e) {} } }
    const prov = _provider();
    if (prov === 'cg') { if (typeof cgSdk !== 'undefined') cgSdk.adBreak(onDone); else done(); return; }
    if (prov !== 'placeholder' || _showing) { done(); return; }
    if (typeof onlineMode !== 'undefined' && onlineMode) { done(); return; }
    if (typeof activeCinematic !== 'undefined' && activeCinematic) { done(); return; }
    if (typeof storyModeActive !== 'undefined' && storyModeActive) { done(); return; }
    const now = Date.now();
    if (now - _sessionStart < AD_CONFIG.newPlayerGraceMs) { done(); return; }
    if (now - _lastInterstitial < AD_CONFIG.interstitialGapMs) { done(); return; }
    _lastInterstitial = now;
    _showing = true;
    _stopRematch();
    _placeholderAd('interstitial', 3, function () { _showing = false; done(); });
  }

  // Rewarded: only from a button the player pressed
  function canShowRewarded() {
    const prov = _provider();
    if (prov === 'cg') return typeof cgSdk !== 'undefined';
    return prov === 'placeholder';
  }

  // Stricter than canShowRewarded: needs a real portal SDK. Gates the watch-an-ad buttons,
  // which stay hidden on itch, github.io and local.
  function rewardedReady() {
    return _provider() === 'cg' && typeof cgSdk !== 'undefined' &&
      typeof cgSdk.adReady === 'function' && cgSdk.adReady();
  }

  function rewarded(onReward, onSkip) {
    const ok = function () { if (onReward) { try { onReward(); } catch (e) {} } };
    const no = function () { if (onSkip) { try { onSkip(); } catch (e) {} } };
    if (_showing || !canShowRewarded()) { no(); return; }
    _stopRematch();
    if (_provider() === 'cg') { cgSdk.requestRewardedAd(ok, no); return; }
    _showing = true;
    _placeholderAd('rewarded', AD_CONFIG.placeholderAdSecs, function (completed) {
      _showing = false;
      if (completed) ok(); else no();
    });
  }

  // Display banners: our own site only, never over the arena
  function refreshBanners() {
    const show = _provider() === 'placeholder';
    document.querySelectorAll('.ad-slot').forEach(function (el) {
      el.classList.toggle('ad-slot-live', show);
      if (show && !el.firstChild) {
        el.innerHTML = '<span class="ad-slot-label">Ad</span><span class="ad-slot-size">' +
          (el.dataset.size || '') + '</span>';
      }
    });
  }

  // Post-match offer: an ad doubles this match's coins
  function offerMatchCoins(coins) {
    const row = document.getElementById('adRewardRow');
    const btn = document.getElementById('adRewardBtn');
    if (!row || !btn) return;
    const eligible = coins > 0 && canShowRewarded() &&
      !(typeof storyModeActive !== 'undefined' && storyModeActive) &&
      !(typeof onlineMode !== 'undefined' && onlineMode);
    row.style.display = eligible ? '' : 'none';
    if (!eligible) return;
    btn.disabled = false;
    btn.textContent = '▶ Watch an ad: +' + coins + ' coins';
    const matchKey = (window._achStats && window._achStats.matchStartTime) || Date.now();
    btn.onclick = function () {
      btn.disabled = true;
      rewarded(function () {
        _grantCoins(coins, matchKey);
        btn.textContent = '+' + coins + ' coins added';
      }, function () {
        btn.disabled = false;
      });
    };
  }

  // Store: coins for an ad, about one match's worth, with a cooldown
  const STORE_AD_COINS = 15;
  const STORE_AD_COOLDOWN_MS = 180000;
  const _STORE_AD_KEY = 'smb_store_ad_last';
  function _storeAdLeft() {
    let last = 0;
    try { last = +localStorage.getItem(_STORE_AD_KEY) || 0; } catch (e) {}
    return Math.max(0, last + STORE_AD_COOLDOWN_MS - Date.now());
  }
  function _storeAdLabel(btn) {
    const left = _storeAdLeft();
    btn.disabled = left > 0;
    btn.textContent = left > 0
      ? '▶ Next ad reward in ' + Math.floor(left / 60000) + ':' + String(Math.ceil(left % 60000 / 1000) % 60).padStart(2, '0')
      : '▶ Watch an ad for ' + STORE_AD_COINS + ' coins';
    return left;
  }
  // Called from renderStore(); adds the button above `grid` when an ad is available.
  function mountStoreOffer(grid) {
    const old = document.getElementById('storeAdRow');
    if (old) old.remove();
    if (!grid || !rewardedReady() ||
        (typeof onlineMode !== 'undefined' && onlineMode)) return;
    const row = document.createElement('div');
    row.id = 'storeAdRow';
    row.style.cssText = 'margin:0 0 12px;text-align:center;';
    const btn = document.createElement('button');
    btn.id = 'storeAdBtn';
    btn.className = 'btn ad-reward-btn';
    row.appendChild(btn);
    grid.parentNode.insertBefore(row, grid);
    _storeAdLabel(btn);
    const iv = setInterval(function () {
      if (!document.body.contains(btn)) { clearInterval(iv); return; }
      if (!_showing) _storeAdLabel(btn);
    }, 1000);
    btn.onclick = function () {
      if (_storeAdLeft() > 0) return;
      btn.disabled = true;
      rewarded(function () {
        try { localStorage.setItem(_STORE_AD_KEY, String(Date.now())); } catch (e) {}
        _grantCoins(STORE_AD_COINS, 'store' + Date.now());
        if (typeof renderStore === 'function') renderStore();
      }, function () { _storeAdLabel(btn); });
    };
  }

  function _grantCoins(coins, matchKey) {
    if (window.SupabaseBridge && typeof SupabaseBridge.claimMatchRewards === 'function') {
      void SupabaseBridge.claimMatchRewards({
        rewardType: 'match',
        claimKey: 'adbonus:' + matchKey,
        reward: { coins: coins, mode: 'ad_bonus' },
      });
    } else if (typeof awardCoins === 'function') {
      awardCoins(coins);
    }
  }

  window.addEventListener('DOMContentLoaded', refreshBanners);
  if (document.readyState !== 'loading') setTimeout(refreshBanners, 0);

  return { interstitial, rewarded, canShowRewarded, rewardedReady, mountStoreOffer, refreshBanners, offerMatchCoins, provider: _provider };
}());

window.AdManager = AdManager;
