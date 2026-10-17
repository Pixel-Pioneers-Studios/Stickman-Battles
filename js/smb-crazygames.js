'use strict';
// CrazyGames SDK v3 wrapper. Null checks let the game run unchanged outside CrazyGames.

var cgSdk = (function () {
  var MIN_AD_GAP_MS = 180000;   // ms between midgame ads
  var _lastAdAt   = 0;
  var _breaksSeen = 0;

  // Mute game audio during an ad (CrazyGames rule). Restores the prior mute state after.
  var _preAdMuted = null;
  function _adMute() {
    if (_preAdMuted !== null) return;
    try { _preAdMuted = SoundManager.isMuted(); SoundManager.setMuted(true); } catch (e) { _preAdMuted = null; }
  }
  function _adUnmute() {
    if (_preAdMuted === null) return;
    var was = _preAdMuted; _preAdMuted = null;
    try { SoundManager.setMuted(was || !!window._cgAudioMuted); } catch (e) {}
  }

  // Only returns the SDK once init() has resolved. Earlier access throws or logs errors.
  var _initDone = false;
  function sdk() {
    if (!_initDone) return null;
    try {
      var s = (window.CrazyGames && window.CrazyGames.SDK) || null;
      if (!s) return null;
      // Throws if the SDK exists but is not initialised (itch.io)
      void s.game;
      return s;
    } catch(e) { return null; }
  }

  // v3 needs an awaited init(). Fire it now, not on window 'load': the portal watches for loading start, and load can wait a long time.
  (function _cgInit() {
    var raw = (window.CrazyGames && window.CrazyGames.SDK) || null;
    if (!raw || typeof raw.init !== 'function') return;
    Promise.resolve(raw.init()).then(_onSdkReady).catch(function () {});
  }());

  function _onSdkReady() {
    _initDone = true;
    var s = sdk();
    if (!s) return;

    try { s.game.loadingStart(); } catch(e) { return; }
    // Report loading done once the page is done, or now if it already is.
    if (document.readyState === 'complete') {
      try { s.game.loadingStop(); } catch(e) {}
    } else {
      window.addEventListener('load', function () {
        try { s.game.loadingStop(); } catch(e) {}
      });
    }

    // Platform profile when available. Guests still work.
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
        if (params && params.lobby && window.PubHub) { PubHub.join({ code: String(params.lobby) }); return; }
        var roomCode = params && (params.roomName || params.roomId || params.code);
        if (!roomCode) return;
        var inp = document.getElementById('onlineRoomCode');
        if (inp) inp.value = String(roomCode).toUpperCase();
        if (typeof selectMode === 'function') selectMode('online');
        if (typeof networkJoinRoom === 'function') networkJoinRoom();
      });
    }

    // Invite link or instant multiplayer: go straight to online mode
    var inviteCode = null;
    var lobbyCode = null;
    try {
      var params = s.game && (s.game.inviteParams || s.game.inviteLinkParams);
      lobbyCode = params && params.lobby;
      if (!lobbyCode && s.game && typeof s.game.getInviteParam === 'function') lobbyCode = s.game.getInviteParam('lobby');
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

    if (lobbyCode) {
      window._pubInvitePending = true;   // skips the first-run fight (smb-tutorial.js)
      setTimeout(function () {
        if (!window.PubHub) return;
        // SDK can resolve after the first-run fight has started.
        if (typeof tutorialActive !== 'undefined' && tutorialActive) {
          if (typeof endTutorial === 'function') endTutorial(false);
          if (typeof gameRunning !== 'undefined' && gameRunning && typeof backToMenu === 'function') backToMenu();
        }
        ['storyModal', 'prologueOverlay'].forEach(function (id) { var el = document.getElementById(id); if (el) el.style.display = 'none'; });
        PubHub.join({ code: String(lobbyCode) });
      }, 1200);
    } else if (inviteCode || isInstant) {
      setTimeout(function () {
        if (typeof selectMode === 'function') selectMode('online');
        if (inviteCode) {
          var inp = document.getElementById('onlineRoomCode');
          if (inp) {
            inp.value = inviteCode;
            if (typeof networkJoinRoom === 'function') networkJoinRoom();
          }
        } else if (typeof LobbyManager !== 'undefined' && !(window.NetworkManager && NetworkManager.isConnected())) {
          // Instant multiplayer with no invite: host a room now. CG brings the party in via the join listener.
          LobbyManager.createLobby({ maxPlayers: 2, isPrivate: true });
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

    // Portal invite link for a Public Server lobby (smb-public-hub.js). A URL, a promise of one, or null.
    lobbyInviteLink: function (code) {
      var s = sdk();
      if (!s || !s.game || typeof s.game.inviteLink !== 'function') return null;
      try { return s.game.inviteLink({ lobby: String(code || '') }); } catch (e) { return null; }
    },

    // Called after a host room is created. Shows the Invite Friends button.
    showInviteBtn: function () {
      var btn = document.getElementById('cgInviteBtn');
      if (btn) btn.style.display = 'inline-block';
    },

    // Invite Friends: native CG share modal, or copy the URL to the clipboard.
    showInviteButton: function () {
      var s = sdk();
      var roomCode = (window.NetworkManager && NetworkManager.room) ? NetworkManager.room : '';
      var params = { roomName: roomCode };

      if (s && s.game) {
        // inviteLink is the current API. showInviteButton is only for older SDKs.
        if (typeof s.game.inviteLink === 'function') {
          try {
            var link = s.game.inviteLink(params);
            Promise.resolve(link).then(function (url) {
              var copied = function () { if (typeof showToast === 'function') showToast('Invite link copied!'); };
              // Portal iframe may deny clipboard access. The room code still works.
              var denied = function () { if (typeof showToast === 'function') showToast('Room code: ' + roomCode, 4000); };
              if (url && navigator.clipboard) navigator.clipboard.writeText(url).then(copied, denied);
              else denied();
            });
            return;
          } catch (e) {}
        }
        if (typeof s.game.showInviteButton === 'function') {
          try { s.game.showInviteButton(params); return; } catch (e) {}
        }
      }

      // No SDK: copy a plain URL with the room code
      var fallback = location.href.split('?')[0] + '?code=' + encodeURIComponent(roomCode);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(fallback).then(function () {
          if (typeof showToast === 'function') showToast('Invite link copied!');
        }).catch(function () {});
      }
    },

    // Midgame ads only between matches, with a gap between them. The first break of a session is skipped.
    // Always calls onDone().
    adBreak: function (onDone) {
      function done() { if (onDone) { try { onDone(); } catch (e) {} } }
      var s = sdk();
      if (!s || !s.ad || typeof s.ad.requestAd !== 'function') { done(); return; }
      // Never interrupt an online match
      if (typeof onlineMode !== 'undefined' && onlineMode) { done(); return; }
      // Never interrupt a cinematic
      if (typeof activeCinematic !== 'undefined' && activeCinematic) { done(); return; }
      _breaksSeen++;
      var now = Date.now();
      if (_breaksSeen < 2 || (now - _lastAdAt) < MIN_AD_GAP_MS) { done(); return; }
      _lastAdAt = now;
      var finished = false;
      function settle() { if (finished) return; finished = true; _adUnmute(); done(); }
      try {
        s.game.gameplayStop();
        s.ad.requestAd('midgame', {
          adStarted:  _adMute,
          adFinished: settle,
          adError:    settle
        });
      } catch (e) { settle(); }
    },

    // True only when the SDK can serve ads (never on itch or locally)
    adReady: function () {
      var s = sdk();
      return !!(s && s.ad && typeof s.ad.requestAd === 'function');
    },

    // Rewarded ad: call only from a player-initiated button. onReward() on completion, onSkip() otherwise.
    requestRewardedAd: function (onReward, onSkip) {
      var s = sdk();
      if (!s || !s.ad || typeof s.ad.requestAd !== 'function') { if (onSkip) onSkip(); return; }
      var wasRunning = (typeof gameRunning !== 'undefined' && gameRunning);
      var settled = false;
      function fin(ok) {
        if (settled) return; settled = true;
        _adUnmute();
        if (wasRunning) { try { s.game.gameplayStart(); } catch (e) {} }
        if (ok) { if (onReward) onReward(); } else if (onSkip) onSkip();
      }
      try {
        s.game.gameplayStop();
        s.ad.requestAd('rewarded', {
          adStarted:  _adMute,
          adFinished: function () { fin(true); },
          adError:    function () { fin(false); }
        });
      } catch (e) { fin(false); }
    },

    // Call between matches. onDone() always runs.
    requestMidgameAd: function (onDone) {
      var s = sdk();
      if (!s) { if (onDone) onDone(); return; }
      s.game.gameplayStop();
      s.ad.requestAd('midgame', {
        adStarted:  _adMute,
        adFinished: function () { _adUnmute(); s.game.gameplayStart(); if (onDone) onDone(); },
        adError:    function () { _adUnmute(); s.game.gameplayStart(); if (onDone) onDone(); }
      });
    }
  };
}());
