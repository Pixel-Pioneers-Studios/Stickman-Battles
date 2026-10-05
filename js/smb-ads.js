'use strict';
// smb-ads.js — AdManager: one ad interface for every host.
// Load order: after smb-crazygames.js (routes to cgSdk on CrazyGames).
//
// Where an ad request goes:
//   CrazyGames          -> cgSdk (the portal's own SDK; no other ads are allowed there)
//   our own site / local -> AD_CONFIG.provider ('placeholder' until a real network is wired)
//   any other portal     -> nothing (itch, Newgrounds, Game Jolt have their own rules)
//
// Placement rules live here, not at call sites: interstitials only between
// matches, never online or during a cinematic, never in a new player's first
// minutes, and no more than one per AD_CONFIG.interstitialGapMs.

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

  // ── Interstitial: between matches only ───────────────────────────────────
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

  // ── Rewarded: only ever from a button the player pressed ─────────────────
  function canShowRewarded() {
    const prov = _provider();
    if (prov === 'cg') return typeof cgSdk !== 'undefined';
    return prov === 'placeholder';
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

  // ── Display banners: our own site only, never over the arena ─────────────
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

  // ── Post-match offer: watch an ad to double this match's coins ───────────
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

  return { interstitial, rewarded, canShowRewarded, refreshBanners, offerMatchCoins, provider: _provider };
}());

window.AdManager = AdManager;
