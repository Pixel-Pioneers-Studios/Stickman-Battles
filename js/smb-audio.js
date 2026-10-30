'use strict';

const SoundManager = (() => {
  let _ctx = null;
  let _vol = 0.35;
  let _muted = false;
  let _silencedGain = undefined; // cosmic-silence gain, set by gameLoop
  let _cosmicSilenceTimer = 0;
  // Raw bytes are fetched at load and decoded on first play.
  const _rawBuffers = {};  // key -> ArrayBuffer
  const _buffers    = {};  // key -> decoded AudioBuffer
  function _effectiveVol() {
    if (_silencedGain !== undefined) return _vol * _silencedGain;
    return _vol;
  }
  function _getCtx() {
    if (!_ctx) _ctx = new (window.AudioContext || (/** @type {any} */(window)).webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }
  let _brSndFrame = -1, _brSndCount = 0;
  function _play(fn) {
    if (_muted) return;
    // BR: at most 4 sounds per frame, or 99 bots drown the mixer.
    if (typeof gameMode !== 'undefined' && gameMode === 'battleroyale') {
      var _cf = typeof frameCount !== 'undefined' ? frameCount : 0;
      if (_cf !== _brSndFrame) { _brSndFrame = _cf; _brSndCount = 0; }
      if (++_brSndCount > 4) return;
    }
    try { fn(_getCtx()); } catch(e) {}
  }
  function _playBuffer(key, vol, options = {}) {
    if (_muted) return;
    const finish = (audioBuf) => {
      try {
        const ctx = _getCtx();
        const src = ctx.createBufferSource();
        src.buffer = audioBuf;
        src.playbackRate.value = options.rate || 1;
        const g = ctx.createGain();
        g.gain.value = vol * _effectiveVol();
        src.connect(g);
        if (options.pan && ctx.createStereoPanner) {
          const panner = ctx.createStereoPanner();
          panner.pan.value = options.pan;
          g.connect(panner); panner.connect(ctx.destination);
        } else {
          g.connect(ctx.destination);
        }
        src.start();
      } catch(e) {}
    };
    if (_buffers[key]) { finish(_buffers[key]); return; }
    if (!_rawBuffers[key]) return;
    // slice() keeps the raw ArrayBuffer intact for later decodes.
    _getCtx().decodeAudioData(_rawBuffers[key].slice(0))
      .then(buf => { _buffers[key] = buf; finish(buf); })
      .catch(() => {});
  }
  // Prefer the rendered pack. The Web Audio fallback means a missing file never mutes gameplay.
  function _sample(key, vol, fallback, pitch = 1, pan = 0) {
    _play(c => {
      if (_buffers[key] || _rawBuffers[key]) {
        const variation = 0.965 + Math.random() * 0.07;
        _playBuffer(key, vol, { rate: pitch * variation, pan });
      } else {
        fallback(c);
      }
    });
  }
  // Round-robin variants so one cue never repeats a sample back to back.
  const _rr = {};
  function _next(keys) {
    const i = (_rr[keys[0]] = ((_rr[keys[0]] || 0) + 1) % keys.length);
    return keys[i];
  }
  const _SWING_BY_ARCH = { smash: 'swingHeavy', cleave: 'swingHeavy', whirl: 'swingHeavy', sweep: 'swingHeavy',
                           iai: 'swingLight', jab: 'swingLight', poke: 'swingLight', thrust: 'swingLight', crack: 'swingLight' };
  const _SHOT_BY_WEAPON = { bow: 'shootBow', crossbow: 'shootBow', slingshot: 'shootBow',
                            shockrifle: 'shootZap', electricstaff: 'shootZap', flamethrower: 'flame',
                            boomerang: 'throwSpin', paperairplane: 'throwSpin', knives: 'throwSpin', bomb: 'throwSpin', axe: 'throwSpin' };
  function _osc(ctx, type, freq, dur, vol, envA = 0.005) {
    const g = ctx.createGain();
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol * _effectiveVol(), ctx.currentTime + envA);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    o.connect(g); o.start(); o.stop(ctx.currentTime + dur);
  }
  function _noise(ctx, dur, vol, hiPass = 300) {
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type = 'highpass'; filt.frequency.value = hiPass;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * _effectiveVol(), ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(filt); filt.connect(g); g.connect(ctx.destination);
    src.start(); src.stop(ctx.currentTime + dur);
  }
  return {
    setVolume(v) { _vol = Math.max(0, Math.min(1, v)); },
    setMuted(m) { _muted = m; },
    isMuted() { return _muted; },
    getVolume() { return _vol; },
    // Cosmic silence API. Set by smb-particles.js, ticked by smb-loop.js.
    get _cosmicSilenceTimer() { return _cosmicSilenceTimer; },
    set _cosmicSilenceTimer(v) { _cosmicSilenceTimer = v; },
    get _silencedGain() { return _silencedGain; },
    set _silencedGain(v) { _silencedGain = v; },

    // `weaponKey` picks the whoosh that fits the weapon's swing archetype.
    swing(weaponKey) {
      const g = weaponKey && typeof WEAPON_SWINGS !== 'undefined' ? WEAPON_SWINGS[weaponKey] : null;
      const key = (g && _SWING_BY_ARCH[g.archetype]) || _next(['swing', 'swing2', 'swing3']);
      _sample(key, 0.78, c => { _osc(c,'sine',180,0.10,0.18); _noise(c,0.07,0.12,800); });
    },
    hit()         { _sample(_next(['hit', 'hit2', 'hit3']), 0.84, c => { _osc(c,'square',120,0.12,0.22); _noise(c,0.10,0.20,400); }); },
    heavyHit()    { _sample(_next(['heavyHit', 'heavyHit2']), 0.92, c => { _osc(c,'sawtooth',80,0.20,0.38); _noise(c,0.18,0.35,200); }); },
    hitSlash()    { _sample(_next(['hitSlash', 'hitSlash2']), 0.80, c => { _noise(c,0.06,0.30,2600); _osc(c,'square',160,0.08,0.18); }); },
    hitBlunt()    { _sample('hitBlunt', 0.88, c => { _osc(c,'sine',55,0.22,0.40); _noise(c,0.16,0.28,150); }); },
    hitPierce()   { _sample('hitPierce', 0.72, c => { _osc(c,'sine',1100,0.05,0.16); _noise(c,0.07,0.14,2200); }); },
    hitSnap()     { _sample('hitSnap', 0.82, c => { _noise(c,0.05,0.42,3000); _osc(c,'square',1500,0.03,0.12); }); },
    hitZap()      { _sample('hitZap', 0.75, c => { _osc(c,'sawtooth',880,0.09,0.16); _noise(c,0.08,0.12,1500); }); },
    iaiMark(n)    { _sample('iaiMark', 0.54, c => { _osc(c,'sine',1400+(n||1)*180,0.05,0.09); _noise(c,0.03,0.05,4000); }, 1 + Math.min(6, n || 1) * 0.035); },
    iaiSheathe()  { _sample('iaiSheathe', 0.82, c => { _noise(c,0.03,0.50,4500); _osc(c,'square',2100,0.03,0.14); }); },
    soulRip(n)    { _sample('soulRip', 0.60, c => { _osc(c,'sine',760+(n||1)*45,0.16,0.08); _noise(c,0.06,0.04,2200); }, 1 + Math.min(5, n || 1) * 0.025); },
    soulAbsorb(n) { _sample('soulAbsorb', 0.55, c => { _osc(c,'triangle',480+(n||1)*55,0.10,0.08); _osc(c,'sine',960+(n||1)*110,0.06,0.04); }, 1 + Math.min(5, n || 1) * 0.03); },
    soulHarvest() { _sample('soulHarvest', 0.80, c => { _noise(c,0.26,0.30,700); _osc(c,'sawtooth',130,0.30,0.18); }); },
    stingLow()    { _sample('stingLow', 0.74, c => { _osc(c,'sine',55,0.85,0.20,0.08); _osc(c,'sine',82,0.65,0.09,0.10); }); },
    stingImpact() { _sample('stingImpact', 0.90, c => { _osc(c,'sawtooth',58,0.45,0.34); _osc(c,'sine',40,0.55,0.22); _noise(c,0.30,0.22,120); }); },
    stingRise()   { _sample('stingRise', 0.70, c => { _osc(c,'sine',220,0.80,0.14,0.08); }); },
    jump()        { _sample('jump', 0.66, c => { _osc(c,'sine',330,0.18,0.15); }); },
    doubleJump()  { _sample('doubleJump', 0.62, c => { _osc(c,'sine',520,0.14,0.13); }); },
    // `hard` is a fall from height: the heavier landing.
    land(hard)    { _sample(hard ? 'landHard' : 'land', hard ? 0.84 : 0.76, c => { _noise(c,0.06,0.18,100); _osc(c,'sine',80,0.06,0.12); }); },
    shoot(weaponKey) { _sample((weaponKey && _SHOT_BY_WEAPON[weaponKey]) || 'shoot', 0.74, c => { _noise(c,0.08,0.22,2000); _osc(c,'sawtooth',300,0.05,0.10); }); },
    parry()       { _sample('parry', 0.84, c => { _osc(c,'triangle',1480,0.25,0.22); _noise(c,0.03,0.2,3000); }); },
    shieldUp()    { _sample('shieldUp', 0.5, c => { _osc(c,'sine',320,0.08,0.10); }); },
    ko()          { _sample('ko', 0.95, c => { _osc(c,'sawtooth',60,0.5,0.4); _noise(c,0.3,0.3,100); }); },
    respawn()     { _sample('respawn', 0.6, c => { _osc(c,'sine',440,0.2,0.12); _osc(c,'sine',880,0.2,0.10); }); },
    pickup()      { _sample('pickup', 0.64, c => { _osc(c,'sine',523,0.08,0.10); _osc(c,'sine',784,0.08,0.10); }); },
    death()       { _sample('death', 0.84, c => { _osc(c,'sawtooth',160,0.30,0.35); _osc(c,'sine',80,0.20,0.50); _noise(c,0.25,0.20,150); }); },
    explosion()   { _sample('explosion', 0.88, c => { _noise(c,0.35,0.55,80); _osc(c,'sawtooth',55,0.25,0.40); }); },
    uiClick()     { _sample('uiClick', 0.46, c => { _osc(c,'sine',440,0.06,0.10); }); },
    uiHover()     { _sample('uiHover', 0.34, c => { _osc(c,'sine',330,0.03,0.05); }); },
    menuMove()    { _sample('uiHover', 0.30, c => { _osc(c,'sine',330,0.03,0.05); }); },
    clang()       { _sample('clang', 0.80, c => { _osc(c,'triangle',600,0.15,0.20); _osc(c,'sine',300,0.10,0.18); _noise(c,0.05,0.15,1200); }); },
    shieldBlock() { _sample('clang', 0.72, c => { _osc(c,'triangle',600,0.15,0.20); _osc(c,'sine',300,0.10,0.18); _noise(c,0.05,0.15,1200); }); },
    thud()        { _sample('hitBlunt', 0.68, c => { _osc(c,'sine',55,0.22,0.40); _noise(c,0.16,0.28,150); }); },
    phaseUp()     { _sample('phaseUp', 0.74, c => { [440,554,659,880].forEach((f,i)=>setTimeout(()=>_osc(c,'sine',f,0.20,0.18),i*80)); }); },
    waveStart()   { _sample('waveStart', 0.70, c => { [330,440,550].forEach((f,i)=>setTimeout(()=>_osc(c,'square',f,0.12,0.14),i*60)); }); },
    portalOpen()  { _sample('portalOpen', 0.70, c => { _osc(c,'sine',440,0.40,0.22); }); },
    superHeal()   { _sample('superHeal', 0.70, c => { [523,659,784].forEach((f,i)=>setTimeout(()=>_osc(c,'sine',f,0.12,0.16),i*40)); }); },
    superActivate(){ _sample('superActivate', 0.80, c => { [262,330,392,523].forEach((f,i)=>setTimeout(()=>_osc(c,'sine',f,0.18,0.22),i*55)); }); },
    ability()     { _sample('superActivate', 0.66, c => { _osc(c,'sine',392,0.25,0.20); }); },
    megaknightFall() { _sample('entranceCrash', 0.94, c => { _noise(c,0.50,0.55,90); _osc(c,'sawtooth',55,0.40,0.40); }); },
    loadAudio(key, url) {
      fetch(url)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(buf => { _rawBuffers[key] = buf; })
        .catch(e => console.warn('[SoundManager] Failed to load audio "' + key + '":', e));
    },
  };
})();

// Sound volume and mute state (persisted in localStorage)
(function() {
  const sv = localStorage.getItem('smc_sfxVol');
  if (sv !== null) SoundManager.setVolume(parseFloat(sv));
  if (localStorage.getItem('smc_sfxMute') === '1') SoundManager.setMuted(true);
})();

// Fetch SFX bytes now. Decode lazily, since AudioContext needs a user gesture.
const SFX_ASSET_PATHS = {
  swing: 'audio/sfx/swing.wav', hit: 'audio/sfx/hit.wav', heavyHit: 'audio/sfx/heavyHit.wav',
  hitBlunt: 'audio/sfx/hitBlunt.wav', hitPierce: 'audio/sfx/hitPierce.wav', hitSnap: 'audio/sfx/hitSnap.wav',
  hitZap: 'audio/sfx/hitZap.wav', clang: 'audio/sfx/clang.wav', jump: 'audio/sfx/jump.wav',
  land: 'audio/sfx/land.wav', shoot: 'audio/sfx/shoot.wav', pickup: 'audio/sfx/pickup.wav',
  death: 'audio/sfx/death.wav', explosion: 'audio/sfx/explosion.wav', uiClick: 'audio/sfx/uiClick.wav',
  uiHover: 'audio/sfx/uiHover.wav', phaseUp: 'audio/sfx/phaseUp.wav', waveStart: 'audio/sfx/waveStart.wav',
  portalOpen: 'audio/sfx/portalOpen.wav', superHeal: 'audio/sfx/superHeal.wav',
  superActivate: 'audio/sfx/superActivate.wav', iaiMark: 'audio/sfx/iaiMark.wav',
  iaiSheathe: 'audio/sfx/iaiSheathe.wav', soulRip: 'audio/sfx/soulRip.wav',
  soulAbsorb: 'audio/sfx/soulAbsorb.wav', soulHarvest: 'audio/sfx/soulHarvest.wav',
  stingLow: 'audio/sfx/stingLow.wav', stingImpact: 'audio/sfx/stingImpact.wav',
  stingRise: 'audio/sfx/stingRise.wav', entranceCrash: 'audio/sfx/entranceCrash.wav',
};
['hit2', 'hit3', 'hitSlash', 'hitSlash2', 'heavyHit2', 'swing2', 'swing3', 'swingLight', 'swingHeavy',
 'doubleJump', 'landHard', 'parry', 'shieldUp', 'shootBow', 'shootZap', 'flame', 'throwSpin', 'ko', 'respawn',
].forEach(k => { SFX_ASSET_PATHS[k] = 'audio/sfx/' + k + '.wav'; });
Object.entries(SFX_ASSET_PATHS).forEach(([key, url]) => SoundManager.loadAudio(key, url));

// Background music via the YouTube IFrame API, which needs http(s).
// Under file:// it fails, so a silent no-op stub is used instead.
const MusicManager = (() => {
  // YouTube API can't run under file://
  const _isLocal = (location.protocol === 'file:');
  const _isCrazyGames = /(^|\.)crazygames\.(com|co\.uk)$/i.test(location.hostname)
    || (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.environment === 'crazygames');
  if (_isLocal || _isCrazyGames) {
    // No external music here (file:// or CrazyGames). Bundled tracks still play.
    console.info('[MusicManager] External music disabled; using bundled tracks.');
  }

  const BOSS_VID   = 'LsRdmuTmU4k';
  const NORMAL_VID = 'GO_ygNZbmqs';
  const MUSIC_VOL  = 20; // 0-100, kept low so SFX stay audible
  const DUCK_VOL   = 0;  // ducked volume under voice-over

  let _bossPlayer   = null;
  let _normalPlayer = null;
  let _ready        = false; // set once both players exist
  let _bossReady    = false;
  let _normalReady  = false;
  let _muted        = (localStorage.getItem('smc_musicMute') === '1');
  let _current      = null;  // 'boss' | 'normal' | null
  let _ducked       = false; // true during voice-over
  let _pendingTrack = null;  // track queued before API ready

  // Local soundtrack, preferred over YouTube so music works offline and on locked-down hosts.
  const _localSources = {
  boss: 'audio/music/boss-threshold.mp3',
  story: 'audio/music/story-embers.mp3',
  battleroyale: 'audio/music/battle-royale.mp3',
  arena: 'audio/music/arena-neon.mp3',
  };
  let _localAudio = null;
  let _localCurrent = null;

  let _scale = Math.max(0, Math.min(1, parseFloat(localStorage.getItem('smc_musicVol') || '1')));
  if (!isFinite(_scale)) _scale = 1;
  function _localVolume() { return _muted ? 0 : (_ducked ? 0.035 : 0.18) * _scale; }

  function _playLocal(track) {
    const src = _localSources[track];
    if (!src) return false;
    if (_localCurrent === track && _localAudio && ! _localAudio.paused) return true;
    if (_localAudio) { _localAudio.pause(); _localAudio.currentTime = 0; }
    _localAudio = new Audio(src);
    _localAudio.loop = true;
    _localAudio.volume = _localVolume();
    _localCurrent = track;
    const p = _localAudio.play();
    if (p && p.catch) p.catch(() => {}); // autoplay may be blocked until a gesture
    return true;
  }

  function _stopLocal() {
    if (_localAudio) { _localAudio.pause(); _localAudio.currentTime = 0; }
    _localAudio = null;
    _localCurrent = null;
  }

  function _vol() { return _ducked ? DUCK_VOL : Math.round(MUSIC_VOL * _scale); }

  function _applyVolume() {
    const v = _vol();
    try { _bossPlayer.setVolume(v);   } catch(e) {}
    try { _normalPlayer.setVolume(v); } catch(e) {}
  }

  function _tryPlay(track) {
    if (!_ready) { _pendingTrack = track; return; }
    if (_muted)  return;
    if (track === _current) return;
    try { _bossPlayer.pauseVideo();   } catch(e) {}
    try { _normalPlayer.pauseVideo(); } catch(e) {}
    _current = track;
    try {
      if (track === 'boss')   { _bossPlayer.setVolume(_vol());   _bossPlayer.playVideo();   }
      if (track === 'normal') { _normalPlayer.setVolume(_vol()); _normalPlayer.playVideo(); }
    } catch(e) {}
  }

  function _checkReady() {
    if (_bossReady && _normalReady) {
      _ready = true;
      if (_pendingTrack) { const t = _pendingTrack; _pendingTrack = null; _tryPlay(t); }
    }
  }

  // Called by YouTube API when script loads
  window.onYouTubeIframeAPIReady = function() {
    try {
      _bossPlayer = new YT.Player('ytBossPlayer', {
        videoId: BOSS_VID,
        playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: BOSS_VID, playsinline: 1, origin: location.origin },
        events: { onReady() { _bossReady = true; _checkReady(); } }
      });
      _normalPlayer = new YT.Player('ytNormalPlayer', {
        videoId: NORMAL_VID,
        playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: NORMAL_VID, playsinline: 1, origin: location.origin },
        events: { onReady() { _normalReady = true; _checkReady(); } }
      });
    } catch(e) {
      console.warn('[MusicManager] YouTube player init failed:', e.message);
    }
  };

  return {
    playBoss()   { if (!_playLocal('boss')) _tryPlay('boss'); },
    playNormal() {
      const mode = typeof gameMode !== 'undefined' ? gameMode : '';
      const localTrack = mode === 'story' ? 'story' : mode === 'battleroyale' ? 'battleroyale' : 'arena';
      if (!_playLocal(localTrack)) _tryPlay('normal');
    },
    stop() {
      _stopLocal();
      _current = null;
      try { _bossPlayer.pauseVideo();   } catch(e) {}
      try { _normalPlayer.pauseVideo(); } catch(e) {}
    },
    setMuted(m) {
      _muted = !!m || !!window._cgAudioMuted;
      localStorage.setItem('smc_musicMute', m ? '1' : '0');
      if (_localAudio) _localAudio.volume = _localVolume();
      if (m) { try { _bossPlayer.pauseVideo();   } catch(e) {} try { _normalPlayer.pauseVideo(); } catch(e) {} }
      else if (_current) { _applyVolume(); const t = _current; _current = null; _tryPlay(t); }
    },
    // Duck music under voice-over so the line is audible.
    setDucked(d) {
      d = !!d;
      if (d === _ducked) return;
      _ducked = d;
      if (_localAudio) _localAudio.volume = _localVolume();
      if (!_ready || _muted) return;
      _applyVolume();
    },
    setVolume(v) {
      _scale = Math.max(0, Math.min(1, v));
      try { localStorage.setItem('smc_musicVol', String(_scale)); } catch (e) {}
      if (_localAudio) _localAudio.volume = _localVolume();
      if (_ready && !_muted) _applyVolume();
    },
    getVolume() { return _scale; },
    isDucked() { return _ducked; },
    isMuted()  { return _muted; },
    toggle()   { this.setMuted(!_muted); },
  };
})();

function toggleSfxMute() {
  if (window._cgAudioMuted) return;
  const m = !SoundManager.isMuted();
  SoundManager.setMuted(m);
  localStorage.setItem('smc_sfxMute', m ? '1' : '0');
  const btn = document.getElementById('sfxMuteBtn');
  if (btn) btn.textContent = m ? '🔇 Sound: Off' : '🔊 Sound: On';
}
function setSfxVolume(v) {
  SoundManager.setVolume(v);
  localStorage.setItem('smc_sfxVol', v);
}
