// StoryVoice: speaks story dialogue aloud. Lines rendered by tools/voice/render.py play from
// audio/voice/; anything else falls back to the Web Speech API. Captions stay on screen regardless.

(function () {
  'use strict';

  const synth = (typeof window !== 'undefined') ? window.speechSynthesis : null;

  // Fallback voices for lines with no recorded file. Pitch stays at 1: shifting it is what made voices crack.
  // voiceHint names match in order against system voice names; the neural/premium voices come first.
  const NATURAL = ['Natural', 'Neural', 'Premium', 'Enhanced', 'Google'];
  const PROFILES = {
    GOD:   { rate: 0.9,  voiceHint: [...NATURAL, 'Daniel'] },
    KAEL:  { rate: 1.0,  voiceHint: [...NATURAL, 'Alex', 'Aaron'] },
    YOU:   { rate: 1.0,  voiceHint: [...NATURAL, 'Alex', 'Aaron'] },
    GUIDE: { rate: 1.0,  voiceHint: [...NATURAL, 'Serena', 'Kate', 'Samantha'] },
    // 'none' = narration, 'player' = you, 'npc' = other characters
    none:   { rate: 0.98, voiceHint: [...NATURAL, 'Samantha', 'Ava'] },
    player: { rate: 1.0,  voiceHint: [...NATURAL, 'Alex', 'Aaron'] },
    npc:    { rate: 0.98, voiceHint: [...NATURAL, 'Daniel', 'Alex'] },
    _default: { rate: 1.0, voiceHint: [...NATURAL, 'Samantha'] }
  };
  const BAD_VOICES = /\b(Fred|Ralph|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Kathy|Princess|Deranged|Hysterical)\b/i;
  const VOICE_DIR = 'audio/voice/';

  let _voices = [];
  let _lastSub = null;   // last subtitle we reacted to
  let _rafId = 0;
  let _duckUntil = 0;    // music stays ducked until this time
  let _ducked = false;
  let _audio = null;     // one element, reused: a recorded line replaces the previous one

  const DUCK_RELEASE_MS = 700; // stops gaps between lines from strobing the music

  // Duck music while a line is spoken.
  function _setDuck(on) {
    if (on === _ducked) return;
    _ducked = on;
    try {
      if (typeof MusicManager !== 'undefined' && MusicManager && MusicManager.setDucked) MusicManager.setDucked(on);
    } catch (e) { /* cosmetic; never break a frame */ }
  }

  function _updateDuck() {
    const speaking = isSpeaking();
    const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    if (speaking) _duckUntil = now + DUCK_RELEASE_MS;
    _setDuck(now < _duckUntil);
  }

  function _loadVoices() {
    if (!synth) return;
    _voices = synth.getVoices() || [];
  }

  function _resolveVoice(profile) {
    if (!_voices.length) _loadVoices();
    if (!_voices.length) return null;
    const en = _voices.filter(v => /^en/i.test(v.lang) && !BAD_VOICES.test(v.name || ''));
    for (const hint of (profile.voiceHint || [])) {
      const h = hint.toLowerCase();
      const v = en.find(v => v.name && v.name.toLowerCase().includes(h));
      if (v) return v;
    }
    return en.find(v => v.default) || en[0] || _voices[0] || null;
  }

  // Must match key() in tools/voice/extract-lines.js.
  function _key(speaker, text) {
    const s = (speaker || 'none') + '|' + String(text).replace(/\s+/g, ' ').trim();
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  function _voiceVolume() {
    if (typeof SoundManager === 'undefined' || !SoundManager) return 1;
    if (SoundManager.isMuted && SoundManager.isMuted()) return 0;
    // SFX volume defaults to 0.35; the voice sits at full volume there and scales with the slider.
    const v = SoundManager.getVolume ? SoundManager.getVolume() : 0.35;
    return Math.max(0, Math.min(1, v / 0.35));
  }

  function _playRecorded(text, speaker) {
    if (typeof STORY_VOICE_LINES === 'undefined' || typeof Audio === 'undefined') return false;
    const k = _key(speaker, text);
    if (!STORY_VOICE_LINES.has(k)) return false;
    if (!_audio) _audio = new Audio();
    _audio.pause();
    _audio.src = VOICE_DIR + k + '.mp3';
    _audio.volume = _voiceVolume();
    const p = _audio.play();
    if (p && p.catch) p.catch(() => {});
    return true;
  }

  function isSpeaking() {
    if (_audio && !_audio.paused && !_audio.ended) return true;
    return !!synth && (synth.speaking || synth.pending);
  }

  function _enabled() {
    return !(typeof settings !== 'undefined' && settings && settings.storyVoice === false);
  }

  function speak(text, speaker) {
    if (!text || !_enabled()) return;
    try {
      if (synth) synth.cancel();  // one line at a time
      if (!_playRecorded(text, speaker)) {
        if (_audio) _audio.pause();
        if (!synth) return;
        const profile = PROFILES[speaker] || PROFILES._default;
        const u = new SpeechSynthesisUtterance(String(text));
        const v = _resolveVoice(profile);
        if (v) u.voice = v;
        u.rate = profile.rate;
        synth.speak(u);
      }
      _duckUntil = ((typeof performance !== 'undefined') ? performance.now() : Date.now()) + DUCK_RELEASE_MS;
      _setDuck(true);
    } catch (e) { /* speech is non-critical; never let it break a frame */ }
  }

  function stop() {
    if (synth) { try { synth.cancel(); } catch (e) {} }
    if (_audio) { try { _audio.pause(); } catch (e) {} }
    _duckUntil = 0;
    _setDuck(false);
  }

  function _tick() {
    const sub = (typeof storyFightSubtitle !== 'undefined') ? storyFightSubtitle : null;
    if (sub !== _lastSub) {
      _lastSub = sub;
      if (sub && sub.speaker && sub.text) speak(sub.text, sub.speaker);
    }
    _updateDuck();
    _rafId = requestAnimationFrame(_tick);
  }

  function start() {
    if (_rafId) return;
    if (synth) {
      _loadVoices();
      if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', _loadVoices);
      else if ('onvoiceschanged' in synth) synth.onvoiceschanged = _loadVoices;
    }
    const cb = document.getElementById('settingStoryVoice');
    if (cb && typeof settings !== 'undefined' && settings) cb.checked = settings.storyVoice !== false;
    _rafId = requestAnimationFrame(_tick);
  }

  window.StoryVoice = {
    speak, stop, start, isSpeaking, _resolveVoice, _loadVoices, _key,
    get voices() { return _voices; }
  };

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'complete' || document.readyState === 'interactive') start();
    else window.addEventListener('DOMContentLoaded', start);
  }
})();
