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
  });

  return {
    gameplayStart: function () {
      var s = sdk(); if (s) s.game.gameplayStart();
    },
    gameplayStop: function () {
      var s = sdk(); if (s) s.game.gameplayStop();
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
