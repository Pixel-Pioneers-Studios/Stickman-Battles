// smb-storyvoice.js — StoryVoice: speaks story dialogue lines aloud via the Web Speech API.
// Watches storyFightSubtitle; when a new line carrying a speaker appears, it is spoken with a
// per-speaker voice profile. Captions stay on-screen regardless — this is an additive layer.
// Only real dialogue (a truthy speaker) is voiced; gameplay banners without a speaker stay silent.

(function () {
  'use strict';

  const synth = (typeof window !== 'undefined') ? window.speechSynthesis : null;

  // Per-speaker voice profiles. voiceHint terms are matched in order against available system
  // voice names; pitch/rate shape delivery once a profile resolves. Falls back to any English voice.
  const PROFILES = {
    GOD:   { pitch: 0.5,  rate: 0.85, voiceHint: ['Daniel', 'Ralph', 'Google UK English Male'] },
    KAEL:  { pitch: 0.92, rate: 1.0,  voiceHint: ['Ralph', 'Fred', 'Rishi', 'Google US English'] },
    YOU:   { pitch: 0.92, rate: 1.0,  voiceHint: ['Ralph', 'Fred', 'Rishi', 'Google US English'] },
    GUIDE: { pitch: 1.08, rate: 0.96, voiceHint: ['Moira', 'Tessa', 'Karen', 'Samantha'] },
    // Narrative-scene / interlude speakers ('none' = narration, 'player' = you, 'npc' = other characters)
    none:   { pitch: 1.0,  rate: 0.96, voiceHint: ['Samantha', 'Tessa', 'Google US English'] },
    player: { pitch: 0.92, rate: 1.0,  voiceHint: ['Ralph', 'Fred', 'Rishi', 'Google US English'] },
    npc:    { pitch: 0.9,  rate: 0.98, voiceHint: ['Daniel', 'Ralph', 'Google UK English Male'] },
    _default: { pitch: 1.0, rate: 1.0, voiceHint: ['Samantha', 'Google US English'] }
  };

  let _voices = [];
  let _lastSub = null;   // identity of the last subtitle object we reacted to
  let _rafId = 0;
  let _duckUntil = 0;    // keep music ducked until this timestamp (release tail between lines)
  let _ducked = false;

  const DUCK_RELEASE_MS = 700; // hold the duck briefly so gaps between lines don't strobe the music

  // Pull the music down while a line is being spoken so the voice-over is audible.
  function _setDuck(on) {
    if (on === _ducked) return;
    _ducked = on;
    try {
      if (typeof MusicManager !== 'undefined' && MusicManager && MusicManager.setDucked) MusicManager.setDucked(on);
    } catch (e) { /* audio ducking is cosmetic; never break a frame */ }
  }

  function _updateDuck() {
    const speaking = !!synth && (synth.speaking || synth.pending);
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
    for (const hint of (profile.voiceHint || [])) {
      const h = hint.toLowerCase();
      const v = _voices.find(v => v.name && v.name.toLowerCase().includes(h));
      if (v) return v;
    }
    return _voices.find(v => /^en/i.test(v.lang)) || _voices[0] || null;
  }

  function _enabled() {
    return !(typeof settings !== 'undefined' && settings && settings.storyVoice === false);
  }

  function speak(text, speaker) {
    if (!synth || !text || !_enabled()) return;
    const profile = PROFILES[speaker] || PROFILES._default;
    try {
      synth.cancel();  // one line at a time — a new line interrupts the previous
      const u = new SpeechSynthesisUtterance(String(text));
      const v = _resolveVoice(profile);
      if (v) u.voice = v;
      u.pitch = profile.pitch;
      u.rate = profile.rate;
      synth.speak(u);
      _duckUntil = ((typeof performance !== 'undefined') ? performance.now() : Date.now()) + DUCK_RELEASE_MS;
      _setDuck(true);
    } catch (e) { /* speech is non-critical; never let it break a frame */ }
  }

  function stop() {
    if (synth) { try { synth.cancel(); } catch (e) {} }
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
    if (!synth || _rafId) return;
    _loadVoices();
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', _loadVoices);
    else if ('onvoiceschanged' in synth) synth.onvoiceschanged = _loadVoices;
    const cb = document.getElementById('settingStoryVoice');
    if (cb && typeof settings !== 'undefined' && settings) cb.checked = settings.storyVoice !== false;
    _rafId = requestAnimationFrame(_tick);
  }

  window.StoryVoice = {
    speak, stop, start, _resolveVoice, _loadVoices,
    get voices() { return _voices; }
  };

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'complete' || document.readyState === 'interactive') start();
    else window.addEventListener('DOMContentLoaded', start);
  }
})();
