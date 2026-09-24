'use strict';

// ============================================================
// SOUND SYSTEM
// ============================================================
const SoundManager = (() => {
  let _ctx = null;
  let _vol = 0.35;
  let _muted = false;
  let _silencedGain = undefined; // set by gameLoop for cosmic silence moments
  let _cosmicSilenceTimer = 0;
  // File-based audio: raw bytes fetched at load time, decoded to AudioBuffer on first play
  const _rawBuffers = {};  // key → ArrayBuffer
  const _buffers    = {};  // key → AudioBuffer (decoded, reusable)
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
    // BR mode: cap to 4 sounds per frame to prevent audio overload from 99 bots fighting
    if (typeof gameMode !== 'undefined' && gameMode === 'battleroyale') {
      var _cf = typeof frameCount !== 'undefined' ? frameCount : 0;
      if (_cf !== _brSndFrame) { _brSndFrame = _cf; _brSndCount = 0; }
      if (++_brSndCount > 4) return;
    }
    try { fn(_getCtx()); } catch(e) {}
  }
  function _playBuffer(key, vol) {
    if (_muted) return;
    const finish = (audioBuf) => {
      try {
        const ctx = _getCtx();
        const src = ctx.createBufferSource();
        src.buffer = audioBuf;
        const g = ctx.createGain();
        g.gain.value = vol * _effectiveVol();
        src.connect(g); g.connect(ctx.destination);
        src.start();
      } catch(e) {}
    };
    if (_buffers[key]) { finish(_buffers[key]); return; }
    if (!_rawBuffers[key]) return;
    // Decode on first play — slice so the ArrayBuffer stays intact for future calls
    _getCtx().decodeAudioData(_rawBuffers[key].slice(0))
      .then(buf => { _buffers[key] = buf; finish(buf); })
      .catch(() => {});
  }
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
    // Cosmic silence API — set by smb-particles.js, ticked by smb-loop.js
    get _cosmicSilenceTimer() { return _cosmicSilenceTimer; },
    set _cosmicSilenceTimer(v) { _cosmicSilenceTimer = v; },
    get _silencedGain() { return _silencedGain; },
    set _silencedGain(v) { _silencedGain = v; },

    swing()    { _play(c => { _osc(c,'sine',180,0.10,0.18); _noise(c,0.07,0.12,800); }); },
    hit()      { _play(c => { _osc(c,'square',120,0.12,0.22); _noise(c,0.10,0.20,400); }); },
    heavyHit() { _play(c => { _osc(c,'sawtooth',80,0.20,0.38); _noise(c,0.18,0.35,200); }); },
    // Per-archetype melee hit sounds (weapon identity rework — see docs/weapon-identity-spec.md)
    hitBlunt()  { _play(c => { _osc(c,'sine',55,0.22,0.40); _osc(c,'square',90,0.10,0.18); _noise(c,0.16,0.28,150); }); },   // deep concussive thud (hammer, flail, gloves)
    hitPierce() { _play(c => { _osc(c,'sine',1100,0.05,0.16); _osc(c,'square',300,0.06,0.10); _noise(c,0.07,0.14,2200); }); }, // sharp needle tick (spear, katana, broomstick)
    hitSnap()   { _play(c => { _noise(c,0.05,0.42,3000); _osc(c,'square',1500,0.03,0.12); _osc(c,'sine',200,0.08,0.10); }); }, // whip crack
    hitZap()    { _play(c => { _osc(c,'sawtooth',880,0.09,0.16); _osc(c,'sawtooth',1320,0.06,0.10); _noise(c,0.08,0.12,1500); }); }, // electric bite (staff)
    // Ronin Death's Dojo — Deferred Cuts (js/smb-domain.js)
    iaiMark(n)  { _play(c => { _osc(c,'sine',1400+(n||1)*180,0.05,0.09); _noise(c,0.03,0.05,4000); }); }, // quiet mark chime, pitch rises with cut count
    iaiSheathe(){ _play(c => { _noise(c,0.03,0.50,4500); _osc(c,'square',2100,0.03,0.14);            // the click of the sheath
                   setTimeout(()=>{ _noise(c,0.22,0.40,1400); _osc(c,'sine',1300,0.12,0.18);
                                    _osc(c,'sawtooth',180,0.20,0.22); },70); }); },                  // ...then every cut lands at once
    // Reaper Eternal Harvest — Soul Tithe (js/smb-domain.js)
    soulRip(n)  { _play(c => { const o=c.createOscillator(); const g=c.createGain();                 // faint falling wail as a soul tears loose
                   o.type='sine'; o.frequency.setValueAtTime(760+(n||1)*45,c.currentTime);
                   o.frequency.exponentialRampToValueAtTime(320,c.currentTime+0.16);
                   g.gain.setValueAtTime(_effectiveVol()*0.07,c.currentTime);
                   g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.18);
                   o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+0.18);
                   _noise(c,0.06,0.04,2200); }); },
    soulAbsorb(n){ _play(c => { _osc(c,'triangle',480+(n||1)*55,0.10,0.08); _osc(c,'sine',960+(n||1)*110,0.06,0.04); }); }, // soft chime, pitch rises with the harvest
    soulHarvest(){ _play(c => { _noise(c,0.26,0.30,700); _osc(c,'sawtooth',130,0.30,0.18); _osc(c,'sine',65,0.34,0.22);    // deep reap whoosh...
                   setTimeout(()=>{ _osc(c,'sine',920,0.16,0.10); _noise(c,0.12,0.14,3200); },90); }); },                  // ...then the shriek of release
    // Story-scene beat stings (docs/story-cinematics-plan.md Phase 2)
    stingLow()    { _play(c => { _osc(c,'sine',55,0.85,0.20,0.08); _osc(c,'sine',82,0.65,0.09,0.10); }); },              // deep dread swell
    stingImpact() { _play(c => { _osc(c,'sawtooth',58,0.45,0.34); _osc(c,'sine',40,0.55,0.22); _noise(c,0.30,0.22,120); }); }, // dramatic boom
    stingRise()   { _play(c => { const o=c.createOscillator(); const g=c.createGain();
                     o.type='sine'; o.frequency.setValueAtTime(110,c.currentTime);
                     o.frequency.linearRampToValueAtTime(330,c.currentTime+0.7);
                     g.gain.setValueAtTime(0.0001,c.currentTime);
                     g.gain.linearRampToValueAtTime(_effectiveVol()*0.14,c.currentTime+0.35);
                     g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.8);
                     o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+0.8); }); },                // tension riser
    jump()     { _play(c => { const o=c.createOscillator(); const g=c.createGain();
                   o.type='sine'; o.frequency.setValueAtTime(220,c.currentTime);
                   o.frequency.linearRampToValueAtTime(440,c.currentTime+0.10);
                   g.gain.setValueAtTime(_effectiveVol()*0.15,c.currentTime);
                   g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.18);
                   o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+0.18); }); },
    land()     { _play(c => { _noise(c,0.06,0.18,100); _osc(c,'sine',80,0.06,0.12); }); },
    shoot()    { _play(c => { _noise(c,0.08,0.22,2000); _osc(c,'sawtooth',300,0.05,0.10); }); },
    pickup()   { _play(c => { _osc(c,'sine',523,0.08,0.10); _osc(c,'sine',784,0.08,0.10); }); },
    death()    { _play(c => { _osc(c,'sawtooth',160,0.30,0.35); _osc(c,'sine',80,0.20,0.50); _noise(c,0.25,0.20,150); }); },
    explosion(){ _play(c => { _noise(c,0.35,0.55,80); _osc(c,'sawtooth',55,0.25,0.40); }); },
    uiClick()  { _play(c => { _osc(c,'sine',440,0.06,0.10); }); },
    uiHover()  { _play(c => { _osc(c,'sine',330,0.03,0.05); }); },
    clang()    { _play(c => { _osc(c,'triangle',600,0.15,0.20); _osc(c,'sine',300,0.10,0.18); _noise(c,0.05,0.15,1200); }); },
    phaseUp()  { _play(c => { [440,554,659,880].forEach((f,i)=>setTimeout(()=>_osc(c,'sine',f,0.20,0.18),i*80)); }); },
    waveStart(){ _play(c => { [330,440,550].forEach((f,i)=>setTimeout(()=>_osc(c,'square',f,0.12,0.14),i*60)); }); },
    portalOpen(){ _play(c => { const o=c.createOscillator(); const g=c.createGain();
                   o.type='sine'; o.frequency.setValueAtTime(880,c.currentTime);
                   o.frequency.exponentialRampToValueAtTime(110,c.currentTime+0.40);
                   g.gain.setValueAtTime(_vol*0.22,c.currentTime);
                   g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.40);
                   o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+0.40); }); },
    superHeal(){ _play(c => { [523,659,784].forEach((f,i)=>setTimeout(()=>_osc(c,'sine',f,0.12,0.16),i*40)); }); },
    superActivate(){ _play(c => { [262,330,392,523].forEach((f,i)=>setTimeout(()=>_osc(c,'sine',f,0.18,0.22),i*55)); }); },
    megaknightFall() { _playBuffer('megaknight', 0.90); },
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

// Pre-fetch audio assets so they're decoded and ready on first play
SoundManager.loadAudio('megaknight', 'mega-knight-evolution.mp3');

// ============================================================
// MUSIC MANAGER  (YouTube IFrame API — background music only)
// YouTube IFrame API requires an HTTP/HTTPS origin to function.
// When opened as a local file:// the origin is 'null' and postMessage
// will fail. We detect this and return a silent no-op stub instead.
// ============================================================
const MusicManager = (() => {
  // Detect file:// context — YouTube API cannot work here
  const _isLocal = (location.protocol === 'file:');
  const _isCrazyGames = /(^|\.)crazygames\.(com|co\.uk)$/i.test(location.hostname)
    || (window.CrazyGames && window.CrazyGames.SDK && window.CrazyGames.SDK.environment === 'crazygames');
  if (_isLocal || _isCrazyGames) {
    // Suppress YouTube script loading and return no-op stub
    console.info('[MusicManager] External music disabled in this environment.');
    return { playBoss(){}, playNormal(){}, stop(){}, setMuted(){}, isMuted(){ return true; }, toggle(){},
             setDucked(){}, isDucked(){ return false; } };
  }

  const BOSS_VID   = 'LsRdmuTmU4k';
  const NORMAL_VID = 'GO_ygNZbmqs';
  const MUSIC_VOL  = 20; // 0-100, kept low so SFX are audible
  const DUCK_VOL   = 0;  // volume while ducked (0 = silenced) (story voice-over / cinematic dialogue)

  let _bossPlayer   = null;
  let _normalPlayer = null;
  let _ready        = false; // true once both players are created
  let _bossReady    = false;
  let _normalReady  = false;
  let _muted        = (localStorage.getItem('smc_musicMute') === '1');
  let _current      = null;  // 'boss' | 'normal' | null
  let _ducked       = false; // true while a voice-over needs the floor
  let _pendingTrack = null;  // track queued before API ready

  function _vol() { return _ducked ? DUCK_VOL : MUSIC_VOL; }

  function _applyVolume() {
    const v = _vol();
    try { _bossPlayer.setVolume(v);   } catch(e) {}
    try { _normalPlayer.setVolume(v); } catch(e) {}
  }

  function _tryPlay(track) {
    if (!_ready) { _pendingTrack = track; return; }
    if (_muted)  return;
    if (track === _current) return; // already playing
    // Stop whichever is playing
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
    playBoss()   { _tryPlay('boss');   },
    playNormal() { _tryPlay('normal'); },
    stop() {
      _current = null;
      try { _bossPlayer.pauseVideo();   } catch(e) {}
      try { _normalPlayer.pauseVideo(); } catch(e) {}
    },
    setMuted(m) {
      _muted = !!m || !!window._cgAudioMuted;
      localStorage.setItem('smc_musicMute', m ? '1' : '0');
      if (m) { try { _bossPlayer.pauseVideo();   } catch(e) {} try { _normalPlayer.pauseVideo(); } catch(e) {} }
      else if (_current) { _applyVolume(); const t = _current; _current = null; _tryPlay(t); }
    },
    // Duck the music under story voice-over / cinematic dialogue so the line is audible.
    setDucked(d) {
      d = !!d;
      if (d === _ducked) return;
      _ducked = d;
      if (!_ready || _muted) return;
      _applyVolume();
    },
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
