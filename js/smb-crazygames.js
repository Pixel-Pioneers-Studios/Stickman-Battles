'use strict';
// smb-crazygames.js — CrazyGames SDK v3 integration
// Wraps all SDK calls with null checks so the game runs identically outside CrazyGames.

var cgSdk = (function () {
  // Returns the SDK only when it is fully initialized (i.e. on CrazyGames).
  // On other hosts the SDK object may exist but throws on property access.
  function sdk() {
    try {
      var s = (window.CrazyGames && window.CrazyGames.SDK) || null;
      if (!s) return null;
      // Probe .game — throws if SDK is present but not initialized (e.g. itch.io)
      void s.game;
      return s;
    } catch(e) { return null; }
  }

  // v3 requires an explicit awaited init(); until it resolves the SDK reports
  // itself as undetected and every other call throws. Fired immediately rather
  // than on window 'load' — the portal watches for the loading-start call while
  // the game is still loading, and 'load' waits on every asset and pending
  // request, which can be seconds later or never.
  (function _cgInit() {
    var raw = (window.CrazyGames && window.CrazyGames.SDK) || null;
    if (!raw || typeof raw.init !== 'function') return;
    Promise.resolve(raw.init()).then(_onSdkReady).catch(function () {});
  }());

  function _onSdkReady() {
    var s = sdk();
    if (!s) return;

    try { s.game.sdkGameLoadingStart(); } catch(e) { return; }
    // Report loading finished once the page really is done — immediately if it
    // already is, so the pair is never left unbalanced.
    if (document.readyState === 'complete') {
      try { s.game.sdkGameLoadingFinished(); } catch(e) {}
    } else {
      window.addEventListener('load', function () {
        try { s.game.sdkGameLoadingFinished(); } catch(e) {}
      });
    }

    // CrazyGames can request chat be disabled (parental controls, minors, etc.)
    if (s.game && typeof s.game.addListener === 'function') {
      s.game.addListener('disableChat', function () {
        window._cgChatDisabled = true;
        var chatEl = document.getElementById('onlineChat');
        if (chatEl) chatEl.style.display = 'none';
      });
    }

    // If opened via an invite link or as instant multiplayer, auto-navigate to online mode
    var inviteCode = null;
    try {
      var params = s.game && s.game.inviteLinkParams;
      if (params && params.code) inviteCode = String(params.code).toUpperCase().trim();
    } catch (e) {}

    var isInstant = false;
    try { isInstant = !!(s.game && s.game.isInstantMultiplayer); } catch (e) {}

    if (inviteCode || isInstant) {
      setTimeout(function () {
        if (typeof selectMode === 'function') selectMode('online');
        if (inviteCode) {
          var inp = document.getElementById('onlineRoomCode');
          if (inp) {
            inp.value = inviteCode;
            if (typeof networkJoinRoom === 'function') networkJoinRoom();
          }
        }
      }, 400);
    }
  }

  return {
    gameplayStart: function () {
      var s = sdk(); if (s) s.game.gameplayStart();
    },
    gameplayStop: function () {
      var s = sdk(); if (s) s.game.gameplayStop();
    },

    // Called after host room is created — shows the Invite Friends button.
    showInviteBtn: function () {
      var btn = document.getElementById('cgInviteBtn');
      if (btn) btn.style.display = 'inline-block';
    },

    // Called when host clicks Invite Friends — triggers native CG share modal,
    // falling back to copying the invite URL to clipboard.
    showInviteButton: function () {
      var s = sdk();
      var roomCode = (window.NetworkManager && NetworkManager.room) ? NetworkManager.room : '';
      var params = { code: roomCode };

      if (s && s.game) {
        // Try native invite button (SDK v3)
        if (typeof s.game.inviteButton === 'function') {
          try { s.game.inviteButton({ params: params }); return; } catch (e) {}
        }
        // Fallback: generate invite link and copy to clipboard
        if (typeof s.game.inviteLink === 'function') {
          try {
            s.game.inviteLink({ params: params }).then(function (url) {
              if (url && navigator.clipboard) {
                navigator.clipboard.writeText(url).then(function () {
                  if (typeof showToast === 'function') showToast('Invite link copied!');
                }).catch(function () {});
              }
            });
            return;
          } catch (e) {}
        }
      }

      // No SDK — copy a plain URL with the room code as a query param
      var fallback = location.href.split('?')[0] + '?code=' + encodeURIComponent(roomCode);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(fallback).then(function () {
          if (typeof showToast === 'function') showToast('Invite link copied!');
        }).catch(function () {});
      }
    },

    // Call between matches. onDone() fires when the ad finishes (or if no ad available).
    requestMidgameAd: function (onDone) {
      var s = sdk();
      if (!s) { if (onDone) onDone(); return; }
      s.game.gameplayStop();
      s.ad.requestAd('midgame', {
        adStarted:  function () {},
        adFinished: function () { s.game.gameplayStart(); if (onDone) onDone(); },
        adError:    function () { s.game.gameplayStart(); if (onDone) onDone(); }
      });
    }
  };
}());
