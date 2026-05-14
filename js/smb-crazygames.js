'use strict';
// smb-crazygames.js — CrazyGames SDK v3 integration
// Wraps all SDK calls with null checks so the game runs identically outside CrazyGames.

var cgSdk = (function () {
  function sdk() {
    return (window.CrazyGames && window.CrazyGames.SDK) || null;
  }

  window.addEventListener('load', function () {
    var s = sdk();
    if (!s) return;

    // SDK v3 auto-initializes — no init() call needed
    s.game.sdkGameLoadingStart();
    s.game.sdkGameLoadingFinished();

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
  });

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
