'use strict';
// smb-crazygames.js — CrazyGames SDK v3 integration
// Wraps all SDK calls with null checks so the game runs identically outside CrazyGames.

var cgSdk = (function () {
  var MIN_AD_GAP_MS = 180000;   // >= 3 minutes between midgame ads
  var _lastAdAt   = 0;
  var _breaksSeen = 0;

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

    try { s.game.loadingStart(); } catch(e) { return; }
    // Report loading finished once the page really is done — immediately if it
    // already is, so the pair is never left unbalanced.
    if (document.readyState === 'complete') {
      try { s.game.loadingStop(); } catch(e) {}
    } else {
      window.addEventListener('load', function () {
        try { s.game.loadingStop(); } catch(e) {}
      });
    }

    // Use the platform profile when available; guests remain supported.
    if (s.user && typeof s.user.getUser === 'function') {
      Promise.resolve(s.user.getUser()).then(function (user) {
        window._cgUser = user || null;
      }).catch(function () { window._cgUser = null; });
    }

    if (s.data && typeof s.data.getItem === 'function') {
      Promise.resolve(s.data.getItem('smb_state')).then(function (raw) {
        window._cgRemoteSave = raw || null;
        if (raw && !localStorage.getItem('smb_state')) {
          try {
            JSON.parse(raw);
            localStorage.setItem('smb_state', raw);
            location.reload();
          } catch (e) {}
        }
      }).catch(function () { window._cgRemoteSave = null; });
    }

    function _applySettings(settings) {
      settings = settings || {};
      if (settings.disableChat) {
        window._cgChatDisabled = true;
        var chatEl = document.getElementById('onlineChat');
        if (chatEl) chatEl.style.display = 'none';
      }
      if (settings.muteAudio !== undefined) {
        window._cgAudioMuted = !!settings.muteAudio;
        if (typeof SoundManager !== 'undefined' && SoundManager.setMuted) {
          SoundManager.setMuted(window._cgAudioMuted);
        }
        if (typeof MusicManager !== 'undefined' && MusicManager.setMuted) {
          MusicManager.setMuted(window._cgAudioMuted);
        }
      }
    }
    _applySettings(s.game.settings);
    if (s.game && typeof s.game.addSettingsChangeListener === 'function') {
      s.game.addSettingsChangeListener(_applySettings);
    }

    if (s.game && typeof s.game.addJoinRoomListener === 'function') {
      s.game.addJoinRoomListener(function (params) {
        var roomCode = params && (params.roomName || params.roomId || params.code);
        if (!roomCode) return;
        var inp = document.getElementById('onlineRoomCode');
        if (inp) inp.value = String(roomCode).toUpperCase();
        if (typeof selectMode === 'function') selectMode('online');
        if (typeof networkJoinRoom === 'function') networkJoinRoom();
      });
    }

    // If opened via an invite link or as instant multiplayer, auto-navigate to online mode
    var inviteCode = null;
    try {
      var params = s.game && (s.game.inviteParams || s.game.inviteLinkParams);
      var roomName = params && (params.roomName || params.roomId || params.code);
      if (!roomName && s.game && typeof s.game.getInviteParam === 'function') {
        roomName = s.game.getInviteParam('roomName');
      }
      if (roomName) inviteCode = String(roomName).toUpperCase().trim();
    } catch (e) {}

    var isInstant = false;
    try {
      isInstant = !!(s.game && (s.game.isInstantMultiplayer || s.game.isInstantJoin));
    } catch (e) {}

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
    updateRoom: function (roomId, isJoinable) {
      var s = sdk();
      if (!s || !s.game || typeof s.game.updateRoom !== 'function') return;
      try {
        var result = s.game.updateRoom({
          roomId: String(roomId || ''),
          isJoinable: !!isJoinable,
          inviteParams: { roomName: String(roomId || '') }
        });
        if (result && typeof result.catch === 'function') result.catch(function () {});
      } catch (e) {}
    },
    leftRoom: function () {
      var s = sdk();
      if (!s || !s.game || typeof s.game.leftRoom !== 'function') return;
      try {
        var result = s.game.leftRoom();
        if (result && typeof result.catch === 'function') result.catch(function () {});
      } catch (e) {}
    },
    saveProgress: function (serialized) {
      var s = sdk();
      if (!s || !s.data || typeof s.data.setItem !== 'function') return;
      try {
        var result = s.data.setItem('smb_state', String(serialized || ''));
        if (result && typeof result.catch === 'function') result.catch(function () {});
      } catch (e) {}
    },
    isAudioMuted: function () { return !!window._cgAudioMuted; },

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
      var params = { roomName: roomCode };

      if (s && s.game) {
        // Try native invite button (SDK v3)
        if (typeof s.game.showInviteButton === 'function') {
          try { s.game.showInviteButton(params); return; } catch (e) {}
        }
        // Fallback: generate invite link and copy to clipboard
        if (typeof s.game.inviteLink === 'function') {
          try {
            var link = s.game.inviteLink(params);
            Promise.resolve(link).then(function (url) {
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

    // ── Ad breaks ─────────────────────────────────────────────────────────────
    // Midgame ads are only allowed between matches, never during gameplay, and
    // CrazyGames asks for a comfortable gap between them. The first break of a
    // session is skipped so a new player reaches a second match before seeing
    // an ad. Always calls onDone(), including when no ad is shown at all.
    adBreak: function (onDone) {
      function done() { if (onDone) { try { onDone(); } catch (e) {} } }
      var s = sdk();
      if (!s || !s.ad || typeof s.ad.requestAd !== 'function') { done(); return; }
      // Never interrupt an online match — the other peers keep playing.
      if (typeof onlineMode !== 'undefined' && onlineMode) { done(); return; }
      // Never interrupt a cinematic.
      if (typeof activeCinematic !== 'undefined' && activeCinematic) { done(); return; }
      _breaksSeen++;
      var now = Date.now();
      if (_breaksSeen < 2 || (now - _lastAdAt) < MIN_AD_GAP_MS) { done(); return; }
      _lastAdAt = now;
      var finished = false;
      function settle() { if (finished) return; finished = true; done(); }
      try {
        s.game.gameplayStop();
        s.ad.requestAd('midgame', {
          adStarted:  function () {},
          adFinished: settle,
          adError:    settle
        });
      } catch (e) { settle(); }
    },

    // Rewarded ad — call from an explicit player-initiated button only.
    // onReward() runs when the ad completed; onSkip() when it did not.
    requestRewardedAd: function (onReward, onSkip) {
      var s = sdk();
      if (!s || !s.ad || typeof s.ad.requestAd !== 'function') { if (onSkip) onSkip(); return; }
      var wasRunning = (typeof gameRunning !== 'undefined' && gameRunning);
      var settled = false;
      function fin(ok) {
        if (settled) return; settled = true;
        if (wasRunning) { try { s.game.gameplayStart(); } catch (e) {} }
        if (ok) { if (onReward) onReward(); } else if (onSkip) onSkip();
      }
      try {
        s.game.gameplayStop();
        s.ad.requestAd('rewarded', {
          adStarted:  function () {},
          adFinished: function () { fin(true); },
          adError:    function () { fin(false); }
        });
      } catch (e) { fin(false); }
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
