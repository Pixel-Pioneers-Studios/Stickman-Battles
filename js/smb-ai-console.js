'use strict';
// smb-ai-console.js — Ollama AI assistant for the in-game developer console
// Depends on: smb-debug-console.js (must load after it)
// Activate with: AI ON  |  Exit with: AI OFF

// ============================================================
// STATE
// ============================================================

let _aiActive    = false;
let _aiModel     = null;
let _aiHistory   = [];  // conversation history sent to Ollama
const _AI_URL    = 'http://localhost:11434';
const _AI_TURNS  = 8;   // max turns kept in history

let _aiVoiceActive    = false;
let _aiVoiceRecog     = null;   // SpeechRecognition instance
let _aiVoiceBusy      = false;  // true while an AI request is in-flight (voice)
let _aiVoiceGen       = 0;      // incremented on voice off; stale responses check this
let _aiVoiceAbortCtrl = null;   // AbortController for the current voice request

// ============================================================
// SYSTEM PROMPT
// ============================================================

const _AI_SYSTEM_PROMPT = `You are a developer assistant embedded in the game "Stickman Battles" (Stickman Clash).
You control the game by emitting <cmd>...</cmd> tags which are executed as console commands.

CURRENT GAME STATE is injected below under "--- Game State ---". Never echo it as a command.

== PREFERRED METHOD: eval ==
For anything involving match setup, spawning, or multi-step state changes, use:
  <cmd>eval <javascript></cmd>
This runs JS directly against the game globals — it is exact and unambiguous.

Key globals and functions available via eval:
  gameRunning          — true while a match is active
  gameMode             — current mode string ('2p', 'boss', 'trueform', etc.)
  players[]            — array of active fighters (players[0]=P1, players[1]=P2)
  p2IsBot              — true if P2 slot is an AI bot
  p2IsNone             — true if P2 slot is empty
  selectMode(mode)     — sets gameMode and updates UI ('2p', 'boss', 'trueform', 'adaptive', 'sovereign')
  startGame()          — starts a match with current settings
  backToMenu()         — returns to menu (call before startGame if game is running)
  minions[]            — array of enemy entities (yeti, forestbeast, minion, etc.)
  _consoleExec(cmd)    — run any console command string programmatically (use this to spawn inside eval)
  ARENAS              — arena definitions (keys: grass, lava, space, city, forest, ice, ruins, cave, etc.)
  WEAPONS             — weapon definitions (keys: sword, gun, bow, spear, axe, etc.)
  CLASSES             — class definitions (keys: megaknight, archer, rogue, berserker, etc.)
  currentArenaKey      — active arena key
  currentArena         — active arena object
  generateBgElements() — regenerates background after arena change

== EVAL EXAMPLES ==
Start 1v1 vs bot (P2 is AI fighter):
  <cmd>eval if(gameRunning)backToMenu(); p2IsBot=true; p2IsNone=false; selectMode('2p'); startGame()</cmd>

Start solo match (P1 only — use this before spawning enemies like yeti/beast/axiom):
  <cmd>eval if(gameRunning)backToMenu(); p2IsBot=false; p2IsNone=true; selectMode('2p'); startGame()</cmd>

Start human vs human:
  <cmd>eval if(gameRunning)backToMenu(); p2IsBot=false; p2IsNone=false; selectMode('2p'); startGame()</cmd>

Start human vs human with specific weapons/classes (startGame FIRST, then set weapon/class via separate commands):
  <cmd>eval if(gameRunning)backToMenu(); p2IsBot=false; p2IsNone=false; selectMode('2p'); startGame()</cmd>
  <cmd>setweapon sword p1</cmd>
  <cmd>setclass thor p1</cmd>
  <cmd>setweapon scythe p2</cmd>
  <cmd>setclass ninja p2</cmd>
IMPORTANT: NEVER call players[0].setWeapon() or players[0].setClass() — these methods do NOT exist.
NEVER set weapons/classes inside an eval before startGame() — players[] is empty until startGame() runs.
Always use separate <cmd>setweapon</cmd> and <cmd>setclass</cmd> commands AFTER the startGame eval.

Start boss fight:
  <cmd>eval if(gameRunning)backToMenu(); selectMode('boss'); startGame()</cmd>

Spawn a yeti after match starts (chain this AFTER a startGame eval — do NOT call spawn() directly):
  <cmd>spawn yeti</cmd>

Change arena mid-match:
  <cmd>eval currentArenaKey='lava'; currentArena=ARENAS['lava']; generateBgElements()</cmd>

Heal P1 to full:
  <cmd>eval players[0].health=players[0].maxHealth</cmd>

== SIMPLE COMMANDS (use these for basic actions) ==
  heal [p1|p2|all]              restore health
  kill [p1|p2|boss|all]         set health to 0
  sethp <n> [target]            set exact HP
  lives <n> [target]            set lives (default 3)
  revive [target]               respawn at full HP
  godmode [p1|p2|on|off]        toggle invincibility
  setweapon <key> [p1|p2]       change weapon
  setclass <key> [p1|p2]        change class
  setspeed <n>                  time scale (1=normal)
  slow [on|off]                 0.25× slow motion
  pause [on|off|toggle]         pause/resume
  spawn <forestbeast|yeti|minion|dummy|absoluteaxiom>  spawn enemy
  boss phase <1|2|3>            force boss phase
  coins show|set|give|take <n>  manage coins
  status                        show game state

RULES:
- Only emit <cmd>...</cmd> tags when asked to do something in-game.
- One <cmd>...</cmd> per action. Chain multiple for multi-step requests.
- Prefer eval for match setup — it is always more precise than named commands.
- NEVER call spawn() directly in eval — it does not exist. Use a separate <cmd>spawn yeti</cmd> tag instead.
- When spawning enemies (yeti, forestbeast, axiom), use p2IsNone=true so P2 slot is empty.
- Keep replies to 1–2 sentences max.
- NEVER output game state as a <cmd>...</cmd> tag.`;

// ============================================================
// OLLAMA HELPERS
// ============================================================

function _aiThinkingEl() {
  const log = document.getElementById('gameConsoleLog');
  if (!log) return null;
  const el = document.createElement('div');
  el.style.color = '#9966cc';
  el.textContent = '[AI] Thinking…';
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

function _aiSystemWithContext() {
  const ctx = _aiContext();
  if (!ctx) return _AI_SYSTEM_PROMPT;
  return _AI_SYSTEM_PROMPT + '\n\n--- Game State ---\n' + ctx + '\n--- End Game State ---';
}

async function _aiSend(msg, signal) {
  _aiHistory.push({ role: 'user', content: msg });
  if (_aiHistory.length > _AI_TURNS * 2) _aiHistory = _aiHistory.slice(-_AI_TURNS * 2);

  // Combine caller's signal with a 30-second timeout
  const timeoutCtrl = new AbortController();
  const timeoutId   = setTimeout(() => timeoutCtrl.abort(new DOMException('signal timed out', 'TimeoutError')), 30000);
  let combined = timeoutCtrl.signal;
  if (signal) {
    // Abort whichever fires first
    const ac = new AbortController();
    signal.addEventListener('abort', () => ac.abort(signal.reason), { once: true });
    timeoutCtrl.signal.addEventListener('abort', () => ac.abort(timeoutCtrl.signal.reason), { once: true });
    combined = ac.signal;
  }

  try {
    const resp = await fetch(_AI_URL + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: _aiModel,
        messages: [{ role: 'system', content: _aiSystemWithContext() }, ..._aiHistory],
        stream: false
      }),
      signal: combined
    });
    clearTimeout(timeoutId);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    const reply = ((data.message && data.message.content) || '(no response)').trim();
    _aiHistory.push({ role: 'assistant', content: reply });
    return reply;
  } catch (err) {
    clearTimeout(timeoutId);
    _aiHistory.pop();
    // Suppress abort errors — caller decides whether to surface them
    if (err.name === 'AbortError' || err.name === 'TimeoutError') return null;
    return 'Error: ' + (err.message || String(err));
  }
}

function _aiContext() {
  const parts = [];
  try {
    if (typeof gameMode !== 'undefined' && gameMode)          parts.push('mode=' + gameMode);
    if (typeof gameRunning !== 'undefined')                    parts.push('running=' + gameRunning);
    if (typeof currentArenaKey !== 'undefined' && currentArenaKey) parts.push('arena=' + currentArenaKey);
    if (typeof players !== 'undefined' && Array.isArray(players)) {
      players.forEach((p, i) => {
        if (p) parts.push('p' + (i + 1) + '=' + Math.round(p.health || 0) + '/' + Math.round(p.maxHealth || 100) + 'hp');
      });
    }
  } catch (_) {}
  return parts.join(', ');
}

function _aiExecChain(cmds, idx) {
  if (idx >= cmds.length) return;
  const c = cmds[idx];
  _consoleAppend('↪', c, '#ffcc44');
  _consoleExec(c);

  if (idx + 1 >= cmds.length) return;

  // If this command starts a match, wait for gameRunning before continuing
  const startsMatch = /^(startmatch|startboss)\b/i.test(c) || (/^eval\b/i.test(c) && /startGame\(\)/.test(c));
  if (startsMatch) {
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      if ((typeof gameRunning !== 'undefined' && gameRunning) || attempts > 40) {
        clearInterval(poll);
        if (attempts > 40) _consoleAppend('[AI]', 'Match did not start in time — remaining commands skipped.', '#ff9944');
        else _aiExecChain(cmds, idx + 1);
      }
    }, 250);
  } else {
    _aiExecChain(cmds, idx + 1);
  }
}

function _aiRender(reply, thinkingEl) {
  if (thinkingEl && thinkingEl.parentNode) thinkingEl.parentNode.removeChild(thinkingEl);
  if (reply === null) return; // aborted — nothing to show

  const cmdRe = /<cmd>([\s\S]*?)<\/cmd>/gi;
  const cmds  = [];
  let match;
  while ((match = cmdRe.exec(reply)) !== null) cmds.push(match[1].trim());

  const text = reply.replace(/<cmd>[\s\S]*?<\/cmd>/gi, '').trim();
  if (text) _consoleAppend('🤖', text, '#cc88ff');

  _aiExecChain(cmds, 0);
}

// ============================================================
// VOICE MODE
// ============================================================

function _aiVoiceOn() {
  if (!_aiActive) { _consoleErr('Start VECTOR first (type VECTOR).'); return; }
  if (_aiVoiceActive) { _consolePrint('[Voice] Already listening.', '#cc88ff'); return; }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    _consoleErr('Voice mode is not supported in this browser. Try Chrome or Edge.');
    return;
  }

  _aiVoiceRecog = new SR();
  _aiVoiceRecog.lang = 'en-US';
  _aiVoiceRecog.continuous = true;
  _aiVoiceRecog.interimResults = false;
  _aiVoiceRecog.maxAlternatives = 1;

  _aiVoiceRecog.onresult = function(e) {
    const result = e.results[e.results.length - 1];
    if (!result.isFinal) return;  // ignore interim partials
    const transcript = result[0].transcript.trim();
    if (!transcript) return;

    // Allow saying "ai voice off" (or close variants) to stop voice mode
    if (/^(ai\s+)?voice\s+off$/i.test(transcript) || /^stop\s+(voice|listening)$/i.test(transcript)) {
      _aiVoiceOff();
      return;
    }

    // Wake-word gate: only respond to speech that starts with "vector" (or "hey vector")
    const wakeMatch = transcript.match(/^(?:hey\s+)?vector[,.]?\s*/i);
    if (!wakeMatch) return; // not addressed to VECTOR — ignore
    const command = transcript.slice(wakeMatch[0].length).trim();
    if (!command) return; // just the wake word with nothing after it

    if (_aiVoiceBusy) {
      _consolePrint('[Voice] Still processing previous request — skipped: "' + command + '"', '#9966cc');
      return;
    }
    const myGen = _aiVoiceGen;
    _aiVoiceAbortCtrl = new AbortController();
    _aiVoiceBusy = true;
    _consoleAppend('🎤', command, '#ffffff');
    const thinkEl = _aiThinkingEl();
    _aiSend(command, _aiVoiceAbortCtrl.signal).then(reply => {
      _aiVoiceBusy = false;
      _aiVoiceAbortCtrl = null;
      if (_aiVoiceGen !== myGen) return; // voice was turned off — discard
      _aiRender(reply, thinkEl);
      // Voice stays on — listening for next "Vector ..." command
    });
  };

  _aiVoiceRecog.onerror = function(e) {
    if (e.error === 'no-speech') return; // normal silence, restart quietly
    _consoleErr('[Voice] Error: ' + e.error);
    if (e.error === 'not-allowed') { _aiVoiceOff(); return; }
  };

  // Restart automatically when the browser ends the session (timeout, etc.)
  _aiVoiceRecog.onend = function() {
    if (_aiVoiceActive) {
      try { _aiVoiceRecog.start(); } catch (_) {}
    }
  };

  try {
    _aiVoiceRecog.start();
  } catch (err) {
    _consoleErr('[Voice] Could not start microphone: ' + err.message);
    return;
  }

  _aiVoiceActive = true;
  _aiVoiceUpdateTitle();
  _consolePrint('🎤 Voice mode ON — say "Vector, ..." to send a command.', '#cc88ff');
  _consolePrint('Type AI VOICE OFF or say "voice off" to stop.', '#665599');
}

function _aiVoiceOff() {
  if (!_aiVoiceActive) { _consolePrint('[Voice] Voice mode is not active.', '#9966cc'); return; }
  _aiVoiceActive = false;
  _aiVoiceGen++;           // invalidate any in-flight voice responses
  _aiVoiceBusy   = false;
  if (_aiVoiceAbortCtrl) {
    try { _aiVoiceAbortCtrl.abort(); } catch (_) {}
    _aiVoiceAbortCtrl = null;
  }
  if (_aiVoiceRecog) {
    try { _aiVoiceRecog.stop(); } catch (_) {}
    _aiVoiceRecog = null;
  }
  _aiVoiceUpdateTitle();
  _consolePrint('🎤 Voice mode OFF.', '#9966cc');
}

function _aiVoiceUpdateTitle() {
  const title = document.getElementById('gameConsoleTitle');
  if (!title) return;
  if (_aiActive) {
    title.textContent = (_aiVoiceActive ? '🎤 ' : '🤖 ') + 'VECTOR  —  ' + (_aiModel || '');
  }
}

// ============================================================
// ACTIVATE / DEACTIVATE
// ============================================================

async function _aiOn() {
  if (typeof hasPermission === 'function' && !hasPermission('dev')) {
    _consoleErr('AI mode requires the developer role.');
    return;
  }
  if (_aiActive) { _consoleOk('AI mode is already on (model: ' + _aiModel + ')'); return; }

  _consoleAppend('[AI]', 'Connecting to Ollama…', '#9966cc');

  let models;
  try {
    const r = await fetch(_AI_URL + '/api/tags', { signal: AbortSignal.timeout(3000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    models = ((await r.json()).models) || [];
  } catch (err) {
    _consoleErr('Ollama unreachable at ' + _AI_URL + '  —  ' + err.message);
    _consolePrint('Start Ollama:  ollama serve', '#ffaa44');
    return;
  }

  if (!models.length) {
    _consoleErr('No models installed.');
    _consolePrint('Pull one:  ollama pull phi3   (or llama3.2, mistral, gemma2, etc.)', '#ffaa44');
    return;
  }

  const preferred = ['qwen2.5-coder:7b', 'qwen2.5-coder', 'phi3', 'llama3.2', 'mistral', 'llama3', 'gemma2', 'qwen2.5', 'llama2'];
  let best = null;
  for (const p of preferred) {
    best = models.find(m => m.name.toLowerCase().startsWith(p));
    if (best) break;
  }
  if (!best) best = models[0];

  _aiModel  = best.name;
  _aiActive = true;
  _aiHistory = [];

  // Visual theme
  const badge = document.getElementById('gameConsoleRoleBadge');
  const title = document.getElementById('gameConsoleTitle');
  if (badge) {
    badge.style.display    = '';
    badge.textContent      = 'AI';
    badge.style.background = 'rgba(160,60,255,0.25)';
    badge.style.border     = '1px solid rgba(160,60,255,0.6)';
    badge.style.color      = '#cc88ff';
  }
  if (title) title.textContent = '🤖 VECTOR  —  ' + _aiModel;
  _aiVoiceUpdateTitle();

  _consoleAppend('[AI]', 'Ready  •  model: ' + _aiModel, '#cc88ff');
  if (models.length > 1) {
    const others = models.filter(m => m !== best).map(m => m.name).join(', ');
    _consolePrint('Other available models: ' + others + '  (use AI MODEL <name> to switch)', '#665599');
  }
  _consolePrint('VECTOR is ready — I can run commands. Type AI OFF to exit.', '#9966cc');
}

function _aiOff() {
  if (!_aiActive) { _consolePrint('AI mode is not active.', '#9966cc'); return; }
  if (_aiVoiceActive) _aiVoiceOff();
  _aiActive  = false;
  _aiModel   = null;
  _aiHistory = [];
  _consoleAppend('[AI]', 'AI mode off.', '#9966cc');
  // Restore console chrome by re-running the open routine
  if (typeof openGameConsole === 'function') openGameConsole();
}

// ============================================================
// PATCH gameConsoleRun — intercept input when AI mode is on
// ============================================================

(function () {
  const _origRun = window.gameConsoleRun;

  window.gameConsoleRun = function () {
    const inp = document.getElementById('gameConsoleInput');
    if (!inp) return _origRun();

    const raw    = inp.value.trim();
    const cmdUp  = raw.toUpperCase().trim();

    // Always let AI control commands through to _consoleExec
    if (cmdUp === 'VECTOR' || cmdUp === 'AI OFF' || cmdUp === 'AI STATUS' ||
        cmdUp.startsWith('AI MODEL ') || cmdUp.startsWith('AI MODEL') ||
        cmdUp === 'AI EXIT' || cmdUp === 'AI VOICE ON' || cmdUp === 'AI VOICE OFF' ||
        cmdUp === 'CLEAR' || cmdUp === 'HELP') {
      _origRun();
      return;
    }

    if (!_aiActive) {
      _origRun();
      return;
    }

    // In AI mode: clear input and route to model
    if (!raw) return;
    inp.value = '';
    _consoleAppend('You', raw, '#ffffff');
    const thinkEl = _aiThinkingEl();
    _aiSend(raw).then(reply => _aiRender(reply, thinkEl));
  };
})();

// ============================================================
// PATCH _consoleExec — add AI ON / AI OFF / AI STATUS / AI MODEL
// ============================================================

(function () {
  const _origExec = window._consoleExec;

  window._consoleExec = function (raw) {
    const cmdUp = (raw || '').toUpperCase().trim();

    if (cmdUp === 'VECTOR')                          { _aiOn();  return; }
    if (cmdUp === 'AI OFF' || cmdUp === 'AI EXIT')   { _aiOff(); return; }

    if (cmdUp === 'AI STATUS') {
      if (_aiActive) {
        _consoleOk('AI mode ON  •  model: ' + _aiModel + '  •  history: ' + Math.floor(_aiHistory.length / 2) + ' turn(s)');
      } else {
        _consolePrint('VECTOR is OFF  —  type VECTOR to activate (dev only)', '#9966cc');
      }
      return;
    }

    if (cmdUp.startsWith('AI MODEL ')) {
      if (!_aiActive) { _consoleErr('VECTOR is not active. Run VECTOR first.'); return; }
      const name = raw.trim().slice(9).trim();
      if (!name) { _consoleErr('Usage: ai model <name>'); return; }
      _aiModel = name;
      _consoleOk('Model switched to: ' + _aiModel + '  (takes effect on next message)');
      return;
    }

    if (cmdUp === 'AI VOICE ON') { _aiVoiceOn(); return; }
    if (cmdUp === 'AI VOICE OFF') { _aiVoiceOff(); return; }

    // Append AI commands to the HELP output
    if (cmdUp === 'HELP') {
      _origExec(raw);
      _consolePrint('── VECTOR (Ollama AI) ────────────────────────────────────', '#556688');
      _consolePrint('vector                  — activate VECTOR AI chat mode (dev only)', '#88bbff');
      _consolePrint('ai off                  — exit AI mode', '#88bbff');
      _consolePrint('ai status               — show AI state and model', '#88bbff');
      _consolePrint('ai model <name>         — switch Ollama model (while AI mode is on)', '#88bbff');
      _consolePrint('ai voice on             — start voice input; say "Vector, ..." to trigger', '#88bbff');
      _consolePrint('ai voice off            — stop voice input (or say "voice off")', '#88bbff');
      return;
    }

    _origExec(raw);
  };
})();
