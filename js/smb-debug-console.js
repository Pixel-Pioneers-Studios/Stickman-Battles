'use strict';
// smb-debug-console.js: in-game developer console (_consoleExec). Open: Ctrl+Shift+O then Ctrl+Shift+X (smb-debug-overlay.js).
// Load after smb-debug-overlay.js, before smb-debug-jump.js.

let _consoleOpen      = false;
let _consoleHistory   = [];  // command history (up/down arrow)
let _consoleHistIdx   = -1;
let consoleUnlocked   = false;  // password lock, reset each page load
const _CONSOLE_PASS   = 'devmode';  // hardcoded password

// Intercept native console so game logs appear in the overlay
const _origLog   = console.log.bind(console);
const _origWarn  = console.warn.bind(console);
const _origError = console.error.bind(console);
console.log   = (...a) => { _origLog(...a);   _consoleAppend('[log]',   a.join(' '), '#aaddff'); };
console.warn  = (...a) => { _origWarn(...a);  _consoleAppend('[warn]',  a.join(' '), '#ffdd88'); };
console.error = (...a) => { _origError(...a); _consoleAppend('[error]', a.join(' '), '#ff6666'); };

function _consoleAppend(prefix, text, color) {
  const log = document.getElementById('gameConsoleLog');
  if (!log) return;
  const line = document.createElement('div');
  line.style.color = color || '#ccddff';
  line.textContent = prefix + ' ' + text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
  // Trim old entries to prevent memory bloat
  while (log.children.length > 300) log.removeChild(log.firstChild);
}

function _consolePrint(text, color) { _consoleAppend('>', text, color || '#ccddff'); }
function _consoleOk(text)           { _consoleAppend('✓', text, '#44ff88'); }
function _consoleErr(text)          { _consoleAppend('✗', text, '#ff5555'); }

// Admin/dev console session. Reset on close, so account switches apply on next open.
let _consoleIsAdmin = false;

function _consoleApplyAdminTheme(role) {
  // role: 'admin' or 'dev'
  const isDev = role === 'dev';
  const ov      = document.getElementById('gameConsoleOverlay');
  const titleBar = document.getElementById('gameConsoleTitleBar');
  const title    = document.getElementById('gameConsoleTitle');
  const badge    = document.getElementById('gameConsoleRoleBadge');

  if (isDev) {
    if (ov)       { ov.style.borderTopColor = '#ff9900'; ov.style.borderTopWidth = '2px'; }
    if (titleBar) { titleBar.style.background = 'rgba(40,20,0,0.97)'; titleBar.style.borderBottomColor = '#cc6600'; }
    if (title)    { title.style.color = '#ffcc44'; title.textContent = '\u26A0 Stickman Evolution — Dev Console'; }
    if (badge)    { badge.style.display = ''; badge.textContent = 'DEV'; badge.style.background = 'rgba(255,150,0,0.25)'; badge.style.border = '1px solid rgba(255,150,0,0.55)'; badge.style.color = '#ffcc44'; }
  } else {
    // admin (not dev)
    if (ov)       { ov.style.borderTopColor = '#ff8800'; ov.style.borderTopWidth = '2px'; }
    if (titleBar) { titleBar.style.background = 'rgba(35,15,0,0.97)'; titleBar.style.borderBottomColor = '#994400'; }
    if (title)    { title.style.color = '#ffaa44'; title.textContent = '\u{1F6E1} Stickman Evolution — Admin Console'; }
    if (badge)    { badge.style.display = ''; badge.textContent = 'ADMIN'; badge.style.background = 'rgba(255,120,0,0.2)'; badge.style.border = '1px solid rgba(255,120,0,0.5)'; badge.style.color = '#ffaa44'; }
  }
}

function _consoleApplyModeratorTheme() {
  const ov      = document.getElementById('gameConsoleOverlay');
  const titleBar = document.getElementById('gameConsoleTitleBar');
  const title    = document.getElementById('gameConsoleTitle');
  const badge    = document.getElementById('gameConsoleRoleBadge');
  if (ov)       { ov.style.borderTopColor = '#00ccaa'; ov.style.borderTopWidth = '2px'; }
  if (titleBar) { titleBar.style.background = 'rgba(0,25,20,0.97)'; titleBar.style.borderBottomColor = '#008866'; }
  if (title)    { title.style.color = '#44ffcc'; title.textContent = '\u{1F6E1} Stickman Evolution — Mod Console'; }
  if (badge)    { badge.style.display = ''; badge.textContent = 'MOD'; badge.style.background = 'rgba(0,200,150,0.2)'; badge.style.border = '1px solid rgba(0,200,150,0.5)'; badge.style.color = '#44ffcc'; }
}

function _consoleResetTheme() {
  const ov      = document.getElementById('gameConsoleOverlay');
  const titleBar = document.getElementById('gameConsoleTitleBar');
  const title    = document.getElementById('gameConsoleTitle');
  const badge    = document.getElementById('gameConsoleRoleBadge');
  if (ov)       { ov.style.borderTopColor = '#3366ff'; ov.style.borderTopWidth = '2px'; }
  if (titleBar) { titleBar.style.background = 'rgba(20,30,80,0.95)'; titleBar.style.borderBottomColor = '#3366ff'; }
  if (title)    { title.style.color = '#88aaff'; title.textContent = '\u25B6 Stickman Evolution Console'; }
  if (badge)    { badge.style.display = 'none'; badge.textContent = ''; }
}

function openGameConsole() {
  const ov = document.getElementById('gameConsoleOverlay');
  if (!ov) return;

  const _acct = (typeof AccountManager !== 'undefined' && AccountManager.getActiveAccount) ? AccountManager.getActiveAccount() : null;
  const _role = _acct ? (_acct.role || 'player') : 'player';
  const _hasAdminRole = (typeof hasPermission === 'function' && hasPermission('admin')) ||
                        (typeof _isAdmin === 'function' && _acct && _isAdmin(_acct.id));
  const _hasDevRole   = _role === 'dev' || (typeof isSuperuserAccountId === 'function' && _acct && isSuperuserAccountId(_acct.id));
  const _hasModRole   = !_hasAdminRole && !_hasDevRole && (typeof hasPermission === 'function' && hasPermission('moderator'));

  _consoleIsAdmin = _hasAdminRole || _hasDevRole;

  // Admins, devs and mods skip the password gate
  if ((_consoleIsAdmin || _hasModRole) && !consoleUnlocked) {
    consoleUnlocked = true;
  }

  if (_hasDevRole) {
    _consoleApplyAdminTheme('dev');
  } else if (_hasAdminRole) {
    _consoleApplyAdminTheme('admin');
  } else if (_hasModRole) {
    _consoleApplyModeratorTheme();
  } else {
    _consoleResetTheme();
  }

  _consoleOpen = true;
  ov.style.display = 'flex';
  const inp = document.getElementById('gameConsoleInput');
  if (inp) { inp.value = ''; inp.focus(); }

  if (!consoleUnlocked) {
    _consolePrint('Console locked. Enter password to continue.', '#ffaa44');
  } else if (_hasModRole) {
    const nameLabel = _acct ? ' (' + (_acct.username || _acct.id) + ')' : '';
    _consolePrint('\u{1F6E1} Mod Console unlocked' + nameLabel + '. Type HELP for commands.', '#44ffcc');
    _consolePrint('Mod-only: bancheck  notify', '#88ffdd');
  } else if (_consoleIsAdmin) {
    const roleLabel = _hasDevRole ? 'Dev' : 'Admin';
    const nameLabel = _acct ? ' (' + (_acct.username || _acct.id) + ')' : '';
    _consolePrint('\u26A0 ' + roleLabel + ' Console unlocked' + nameLabel + '. Type HELP for full command list.', _hasDevRole ? '#ffcc44' : '#ffaa44');
    _consolePrint('Admin-only: ban  tempban  banpeer  banip  unban  banlist  kick  bancheck  setaccountrole  notify', '#ffdd88');
    _consolePrint('Dev-only:   spawn  godmode  eval  unlockall  setchapter  startboss  gravity  noclip  setspeed  reload', '#ffbb66');
  } else {
    _consolePrint('Stickman Evolution Console \u2014 type HELP for commands.', '#88bbff');
  }

  if (inp) {
    inp.onkeydown = (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (_consoleHistIdx < _consoleHistory.length - 1) _consoleHistIdx++;
        inp.value = _consoleHistory[_consoleHistory.length - 1 - _consoleHistIdx] || '';
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (_consoleHistIdx > 0) _consoleHistIdx--;
        else { _consoleHistIdx = -1; inp.value = ''; }
        inp.value = _consoleHistIdx >= 0 ? (_consoleHistory[_consoleHistory.length - 1 - _consoleHistIdx] || '') : '';
      }
    };
  }
}

function closeGameConsole() {
  const ov = document.getElementById('gameConsoleOverlay');
  if (ov) ov.style.display = 'none';
  _consoleOpen = false;
  _consoleHistIdx = -1;
  _consoleIsAdmin = false;
  _consoleResetTheme();
}

function gameConsoleRun() {
  const inp = document.getElementById('gameConsoleInput');
  if (!inp) return;
  const raw = inp.value.trim();
  inp.value = '';
  if (!raw) return;

  // Password gate, check on every submission until unlocked
  if (!consoleUnlocked) {
    if (raw === _CONSOLE_PASS) {
      consoleUnlocked = true;
      inp.type = 'text';   // masked only while it holds the password
      _consoleOk('Password accepted. Console unlocked.');
      _consolePrint('Stickman Evolution Console — type HELP for commands.', '#88bbff');
    } else {
      _consoleErr('Incorrect password. Console locked.');
    }
    return;
  }

  _consoleHistory.push(raw);
  _consoleHistIdx = -1;
  _consolePrint('> ' + raw, '#ffffff');
  // Prefix a command with "--local " to skip broadcast and run only on this client
  const isLocal = raw.startsWith('--local ');
  const execRaw = isLocal ? raw.slice('--local '.length).trim() : raw;
  const localOnly = isLocal || _consoleIsLocalOnlyCommand(execRaw);
  // Online: broadcast command to all peers so it runs on every client
  if (!localOnly && typeof onlineMode !== 'undefined' && onlineMode &&
      typeof NetworkManager !== 'undefined' && NetworkManager.connected) {
    NetworkManager.sendGameEvent('consoleCmd', { cmd: execRaw });
    _consolePrint('[broadcast to all players]', '#55aaff');
  } else if (localOnly) {
    _consolePrint('[local only — not broadcast]', '#ffaa44');
  }
  _consoleExec(execRaw);
}

function _consoleIsLocalOnlyCommand(raw) {
  const cmd = String(raw || '').trim().toUpperCase();
  return (
    cmd === 'BAN' ||
    cmd.startsWith('BAN ') ||
    cmd === 'TEMPBAN' ||
    cmd.startsWith('TEMPBAN ') ||
    cmd === 'BANPEER' ||
    cmd.startsWith('BANPEER ') ||
    cmd === 'BANIP' ||
    cmd.startsWith('BANIP ') ||
    cmd === 'UNBAN' ||
    cmd.startsWith('UNBAN ') ||
    cmd === 'BANLIST' ||
    cmd === 'KICK' ||
    cmd.startsWith('KICK ') ||
    cmd === 'WHOAMI' ||
    cmd === 'WHO' ||
    cmd === 'ACCOUNTS' ||
    cmd === 'NET STATUS' ||
    cmd === 'NET PEERS' ||
    cmd === 'SYNC' ||
    cmd === 'SYNC BANS' ||
    cmd === 'SERVER' ||
    cmd === 'SERVER STATUS' ||
    cmd === 'NOTIFY_DISPLAY' ||
    cmd.startsWith('NOTIFY_DISPLAY ')
  );
}

function _consoleExec(raw) {
  const cmd  = raw.toUpperCase().trim();
  const parts = raw.trim().split(/\s+/);
  const sub  = parts[1] ? parts[1].toLowerCase() : '';

  function _parseBanArgs(startIndex) {
    const target = parts[startIndex] || '';
    const maybeMinutes = parts[startIndex + 1];
    const hasMinutes = maybeMinutes !== undefined && /^-?\d+(?:\.\d+)?$/.test(maybeMinutes);
    const minutes = hasMinutes ? parseFloat(maybeMinutes) : null;
    const reason = parts.slice(startIndex + (hasMinutes ? 2 : 1)).join(' ').trim();
    return { target, minutes, reason };
  }

  if (cmd === 'HELP') {
    const cmds = [
      '── General ──────────────────────────────────────────────────────',
      'help                    — show this list',
      'clear                   — clear console output',
      'status                  — show game state summary',
      'syscheck                — health-check all major systems',
      'check fighter [p1|p2]   — detailed fighter state dump',
      'brain [off]             — hand P2 to the trained brain (data/brain/latest.json) [dev]',
      'version                 — show build/game version info',
      'time                    — show current frame count and game clock',
      'fps                     — show current FPS',
      'camtrace arm [px]       — record camera, auto-freeze on first jolt',
      'camtrace report         — print camera diagnosis (arm/start first)',
      'reload                  — reload the page (dev only)',
      '── Combat ───────────────────────────────────────────────────────',
      'heal [p1|p2|p3…|bot|boss|minions|all] — restore health',
      'kill [p1|p2|p3…|bot|boss|minions|enemies|all] — set health to 0',
      'sethp <n> [p1|p2|player|boss|all] — set health to exact value',
      'lives <n> [p1|p2|all]   — set lives remaining',
      'revive [p1|p2|p3…|bot|boss|minions|all] — respawn fighters at full health',
      'godmode [p1|p2|on|off]  — toggle invincibility (dev only)',
      '── Game Setup ───────────────────────────────────────────────────',
      'setmap <arena>          — change arena (e.g. setmap lava)',
      'studio                  — load The Studio recording stage',
      'setweapon <key> [p1|p2] — change weapon (e.g. setweapon gun)',
      'setclass <key> [p1|p2]  — change class (e.g. setclass megaknight)',
      'setspeed <n>            — set game time scale (1=normal, 0.5=slow, 2=fast) [dev]',
      'slow [on|off]           — toggle slow motion (0.25×)',
      'pause [on|off|toggle]   — pause or resume the game',
      'gravity [n]             — set gravity multiplier (1=normal) [dev]',
      'noclip [p1|p2|on|off]   — toggle platform collision [dev]',
      '── Entities ─────────────────────────────────────────────────────',
      'spawn <forestbeast|yeti|minion|dummy|god|absoluteaxiom> — spawn entity [dev]',
      'spawn bot [weapon] [class]    — spawn an AI fighter (e.g. spawn bot gun megaknight) [dev]',
      'summon god — summon God entity (no crash behavior) [dev]',
      'summon absoluteaxiom (alias: axiom, aa) — summon Absolute Axiom [dev]',
      'bots reset              — reset all bot AI states',
      'bots kill               — kill all bots instantly',
      'boss phase <1|2|3>      — force boss to a phase [dev]',
      '── Listings ─────────────────────────────────────────────────────',
      'arena list              — list all available arena keys',
      'weapon list             — list all weapon keys',
      'class list              — list all class keys',
      'story list              — list story chapters [dev]',
      '── Economy ──────────────────────────────────────────────────────',
      'coins show|set|give|take — view or edit the coin wallet',
      '── Unlocks ──────────────────────────────────────────────────────',
      'unlock trueform|megaknight — unlock secret content',
      'unlockall               — unlock everything [dev]',
      'grant unlock <type> <accountId>  — grant a fight unlock to a player [admin] (types: creator|trueform|sovereign|absoluteaxiom|god|bossrush|megaknight|damnation)',
      '── Accounts / Moderation ────────────────────────────────────────',
      'who                     — list all accounts with IDs and roles',
      'whoami                  — show local player/account/network identity',
      'account info <id>       — show detailed account info [admin]',
      'bancheck <target>       — check if a target is currently banned [admin]',
      'notify <message>        — show an in-game notification to all players [admin]',
      'sync [bans]             — pull latest bans from server [admin]',
      'server [status]         — check server health and ban count [admin]',
      'ban <target> [min] [reason]     — ban by account/slot/peer/device [admin]',
      'tempban <target> <min> [reason] — temporary ban [admin]',
      'banpeer <peerId> [min] [reason] — ban a peer id directly [admin]',
      'banip <target> [min] [reason]   — best-effort IP-style ban [admin]',
      'unban <target>          — remove matching bans [admin]',
      'banlist                 — list active bans [admin]',
      'kick <target>           — remove a player from the room [admin]',
      'setaccountrole <id> <player|admin|dev> — change account role [dev]',
      '── Network ──────────────────────────────────────────────────────',
      'net status              — show network role, slot, and peer count',
      'net peers               — print connected peer roster',
      '── Dev / Story ──────────────────────────────────────────────────',
      'setchapter <id> [acctId]        — jump to story chapter [dev]',
      'startboss [boss|trueform]       — start boss fight immediately [dev]',
      'unlockallskills [acctId]        — unlock all items for account [dev]',
      'eval <js>               — evaluate raw JavaScript [dev]',
      '── Map Analysis ─────────────────────────────────────────────────',
      'maps analyze            — print analysis of all maps',
      'maps analyze raw        — print raw analysis array',
      'map analyze <key>       — print analysis of one map',
    ];
    cmds.forEach(c => {
      const isSection = c.startsWith('──');
      _consolePrint(c, isSection ? '#556688' : '#88bbff');
    });
    return;
  }

  if (cmd === 'CLEAR') {
    const log = document.getElementById('gameConsoleLog');
    if (log) log.innerHTML = '';
    return;
  }

  if (cmd === 'STATUS') {
    _consolePrint('gameMode: ' + (typeof gameMode !== 'undefined' ? gameMode : '?'));
    _consolePrint('gameRunning: ' + (typeof gameRunning !== 'undefined' ? gameRunning : '?'));
    _consolePrint('players: ' + (typeof players !== 'undefined' ? players.length : '?'));
    _consolePrint('FPS: ' + _dbgFpsCurrent);
    if (typeof players !== 'undefined') {
      players.forEach((p, i) => _consolePrint(`  [${i}] ${p.name||'?'} HP:${Math.round(p.health)}/${p.maxHealth} lives:${p.lives}`));
    }
    return;
  }

  if (cmd === 'SYSCHECK') {
    const ok  = (s) => _consolePrint('  ✓ ' + s, '#44ff88');
    const warn = (s) => _consolePrint('  ⚠ ' + s, '#ffcc44');
    const err  = (s) => _consolePrint('  ✗ ' + s, '#ff4444');
    _consolePrint('══ SYSTEM CHECK ═══════════════════════════════', '#88bbff');

    // Core loop
    (typeof gameLoop === 'function') ? ok('gameLoop defined') : err('gameLoop MISSING');
    (typeof gameRunning !== 'undefined') ? ok('gameRunning=' + gameRunning) : err('gameRunning MISSING');

    // Rendering
    (typeof ctx !== 'undefined' && ctx) ? ok('Canvas context present') : err('ctx MISSING');
    (typeof drawBackground === 'function') ? ok('drawBackground defined') : warn('drawBackground not found');
    (typeof drawPlatforms === 'function') ? ok('drawPlatforms defined') : warn('drawPlatforms not found');

    // Combat
    (typeof dealDamage === 'function') ? ok('dealDamage defined') : err('dealDamage MISSING — all combat broken');
    (typeof spawnParticles === 'function') ? ok('spawnParticles defined') : warn('spawnParticles not found');

    // Arena
    (typeof ARENAS !== 'undefined' && ARENAS) ? ok('ARENAS loaded (' + Object.keys(ARENAS).length + ' arenas)') : err('ARENAS MISSING');
    (typeof currentArenaKey !== 'undefined' && currentArenaKey) ? ok('currentArena=' + currentArenaKey) : warn('currentArenaKey not set');

    // Weapons / Classes
    (typeof WEAPONS !== 'undefined' && WEAPONS) ? ok('WEAPONS loaded (' + Object.keys(WEAPONS).length + ' entries)') : err('WEAPONS MISSING');
    (typeof CLASSES !== 'undefined' && CLASSES) ? ok('CLASSES loaded (' + Object.keys(CLASSES).length + ' classes)') : err('CLASSES MISSING');

    // Story
    (typeof STORY_CHAPTER_REGISTRY !== 'undefined' && STORY_CHAPTER_REGISTRY) ? ok('STORY_CHAPTER_REGISTRY: ' + STORY_CHAPTER_REGISTRY.length + ' chapters') : warn('STORY_CHAPTER_REGISTRY not found');
    if (typeof STORY_CHAPTER_REGISTRY !== 'undefined' && STORY_CHAPTER_REGISTRY) {
      let _idErr = false;
      STORY_CHAPTER_REGISTRY.forEach((ch, i) => { if (ch.id !== i) { err('Chapter id≠index: index ' + i + ' has id ' + ch.id); _idErr = true; } });
      if (!_idErr) ok('Story chapter id=index invariant holds');
    }

    // Cinematics
    (typeof CinematicManager !== 'undefined') ? ok('CinematicManager present') : warn('CinematicManager not found');
    (typeof activeCinematic !== 'undefined') ? ok('activeCinematic=' + (activeCinematic ? 'ACTIVE' : 'null')) : warn('activeCinematic not defined');

    // Audio
    (typeof SoundManager !== 'undefined' && SoundManager) ? ok('SoundManager present') : warn('SoundManager not found');

    // Network
    (typeof NetworkManager !== 'undefined' && NetworkManager) ? ok('NetworkManager present') : warn('NetworkManager not found');

    // Domain / Conviction
    (typeof DomainManager !== 'undefined' && DomainManager) ? ok('DomainManager (Conviction) present') : warn('DomainManager not found');

    // Physics
    (typeof VerletRagdoll !== 'undefined') ? ok('VerletRagdoll defined') : warn('VerletRagdoll not found');

    // Players
    if (typeof players !== 'undefined' && players.length) {
      players.forEach((p, i) => {
        if (!p) { warn('players[' + i + '] is null'); return; }
        const _pOk = p.health > 0 && typeof p.update === 'function' && typeof p.draw === 'function';
        _pOk ? ok('players[' + i + '] ' + (p.weaponKey||'?') + '/' + (p.charClass||'none') + ' ' + Math.round(p.health) + 'hp') :
               warn('players[' + i + '] has issues (hp=' + Math.round(p.health) + ' update=' + typeof p.update + ')');
      });
    } else {
      warn('No active players (game not running)');
    }

    _consolePrint('═══════════════════════════════════════════════', '#88bbff');
    return;
  }

  if (cmd.startsWith('CHECK FIGHTER') || cmd.startsWith('CHECK F')) {
    const who = sub === 'p2' ? 1 : 0;
    if (typeof players === 'undefined' || !players[who]) { _consoleErr('No fighter in slot ' + (who + 1)); return; }
    const p = players[who];
    _consolePrint('══ FIGHTER P' + (who + 1) + ' ════════════════════════════════════', '#cc88ff');
    _consolePrint('  weapon:       ' + (p.weaponKey  || 'none'));
    _consolePrint('  class:        ' + (p.charClass  || 'none'));
    _consolePrint('  HP:           ' + Math.round(p.health) + ' / ' + p.maxHealth);
    _consolePrint('  lives:        ' + p.lives);
    _consolePrint('  superMeter:   ' + (p.superMeter || 0).toFixed(1) + ' / ' + (p.superMeterMax || 100));
    _consolePrint('  superReady:   ' + !!p.superReady);
    _consolePrint('  superCount:   ' + (p._domainSuperCount || 0) + ' landed (Conviction banked at 4, hold super to fire)');
    _consolePrint('  abilityCd:    ' + (p.abilityCooldown || 0));
    _consolePrint('  attackTimer:  ' + (p.attackTimer || 0));
    _consolePrint('  isAI:         ' + !!p.isAI);
    _consolePrint('  isBoss:       ' + !!p.isBoss);
    _consolePrint('  isTrueForm:   ' + !!p.isTrueForm);
    _consolePrint('  godMode:      ' + !!p.godMode);
    _consolePrint('  onGround:     ' + !!p.onGround);
    _consolePrint('  shielding:    ' + !!p.shielding +
                  '  stacks=' + (p.shieldStacks || 0) + '  shieldHP=' + Math.round(p.shieldHP || 0));
    if (p._tacticGrid) {
      const SITN = { c: 'close', m: 'mid', f: 'far' }, HN = { a: 'above', l: 'level', b: 'below' };
      const sits = Object.keys(p._tacticGrid);
      _consolePrint('  tactic grid:  ' + (sits.length ? '' : '(nothing booked yet)'));
      for (const sit of sits.sort()) {
        const row = p._tacticGrid[sit];
        const cells = Object.keys(row).sort().map(a => {
          const e = row[a];
          const v = e.tries >= 3 ? ((e.dealt - e.taken) / e.tries).toFixed(1) : '?';
          return a + ' ' + v + '(' + e.tries.toFixed(0) + ')';
        });
        _consolePrint('    ' + (SITN[sit[0]] + '/' + HN[sit[1]]).padEnd(12) + cells.join('  '));
      }
      const here = p._situationKey && p._situationKey();
      if (here) {
        const best = p._bestAction && p._bestAction(here);
        _consolePrint('    now: ' + SITN[here[0]] + '/' + HN[here[1]] +
                      '  best=' + (best ? best.action + ' (' + best.value.toFixed(1) + ')' : 'no opinion yet'));
      }
      const ap = p._approachStat;
      if (ap) _consolePrint('    air approach (drives the guard): tries=' + ap.tries.toFixed(1) +
                            '  net/try=' + (ap.tries >= 4 ? ((ap.dealt - ap.taken) / ap.tries).toFixed(1) : 'n/a'));
      if (p._airDenyTimer > 0) _consolePrint('    (air approach vetoed, ' + p._airDenyTimer + 'f left)');
      if (p._swingGated)       _consolePrint('    (swings turned into guards: ' + p._swingGated + ')');
    }
    _consolePrint('  inQuicksand:  ' + !!p._inQuicksand);
    _consolePrint('  storyCharId:  ' + (p.storyCharId || 'none'));
    _consolePrint('  pos:          x=' + Math.round(p.x) + ' y=' + Math.round(p.y));
    _consolePrint('  vel:          vx=' + (p.vx||0).toFixed(1) + ' vy=' + (p.vy||0).toFixed(1));
    if (p.isAI && p._behaviorModel) {
      const bm = p._behaviorModel;
      _consolePrint('  AI profile:   super=' + (p._superProfile||'?') + ' ability=' + (p._abilityProfile||'?'));
      _consolePrint('  AI stage:     ' + (p._evolutionStage||0) + ' intelligence=' + (p.intelligence||0).toFixed(2));
    }
    _consolePrint('════════════════════════════════════════════════', '#cc88ff');
    return;
  }

  if (cmd === 'FPS') { _consolePrint('FPS: ' + _dbgFpsCurrent, '#44ff88'); return; }

  if (cmd.startsWith('HEAL')) {
    const who = sub || 'all';
    const _heal = (p) => { if (!p) return; p.health = p.maxHealth; p.invincible = 60; };
    if (typeof players === 'undefined') { _consoleErr('No game running.'); return; }
    const _slotH = who.match(/^p?(\d+)$/);
    if (_slotH) {
      const idx = parseInt(_slotH[1]) - 1;
      if (players[idx]) _heal(players[idx]); else _consoleErr('No player in slot ' + (idx + 1));
    } else if (who === 'bot' || who === 'bots') {
      players.filter(p => p.isAI && !p.isBoss).forEach(_heal);
    } else if (who === 'minion' || who === 'minions') {
      (minions || []).forEach(_heal);
    } else if (who === 'boss') {
      const b = players.find(p => p && p.isBoss); if (b) _heal(b); else _consoleErr('No boss active.');
    } else {
      players.forEach(_heal);
      (typeof trainingDummies !== 'undefined') && trainingDummies.forEach(_heal);
      (minions || []).forEach(_heal);
    }
    _consoleOk('Healed ' + who);
    return;
  }

  if (cmd.startsWith('KILL')) {
    const who = sub || 'all';
    if (typeof players === 'undefined') { _consoleErr('No game running.'); return; }
    const _killBoss = (p) => {
      if (!p.isBoss) return;
      if (p.isTrueForm
          && typeof tfCinematicState !== 'undefined'
          && tfCinematicState !== 'none'
          && tfCinematicState !== 'backstage') {
        _consoleErr('TF intro in progress (' + tfCinematicState + ') — wait for backstage state.');
        return;
      }
      p.health = (p.isTrueForm && typeof tfFalseVictoryFired !== 'undefined' && !tfFalseVictoryFired) ? 1 : 0;
    };
    const _slotK = who.match(/^p?(\d+)$/);
    if (_slotK) {
      const idx = parseInt(_slotK[1]) - 1;
      const p = players[idx];
      if (p) { if (p.isBoss) _killBoss(p); else if (!p.godmode && !p._godmode) p.health = 0; }
      else _consoleErr('No player in slot ' + (idx + 1));
    } else if (who === 'boss') {
      players.forEach(_killBoss);
    } else if (who === 'bot' || who === 'bots') {
      const bots = players.filter(p => p.isAI && !p.isBoss);
      if (!bots.length) { _consoleErr('No bots in game.'); return; }
      bots.forEach(p => { if (!p.godmode && !p._godmode) p.health = 0; });
    } else if (who === 'minion' || who === 'minions') {
      (minions || []).forEach(p => { if (!p.godmode && !p._godmode) p.health = 0; });
    } else if (who === 'enemies') {
      players.filter(p => p.isAI && !p.isBoss).forEach(p => { if (!p.godmode && !p._godmode) p.health = 0; });
      (minions || []).forEach(p => { if (!p.godmode && !p._godmode) p.health = 0; });
    } else {
      const all = [...players, ...(minions || []), ...(trainingDummies || [])];
      all.forEach(p => { if (p.isBoss) _killBoss(p); else if (!p.godmode && !p._godmode) p.health = 0; });
    }
    _consoleOk('Killed ' + who);
    return;
  }

  if (cmd.startsWith('SPAWN')) {
    if (typeof hasPermission === 'function' && !hasPermission('dev')) {
      _consoleErr('Permission denied — developer role required.'); return;
    }
    if (!sub) { _consoleErr('Usage: spawn <forestbeast|yeti|minion|dummy|god|bot [weapon] [class]>'); return; }
    if (typeof gameRunning === 'undefined' || !gameRunning) { _consoleErr('Start a game first.'); return; }
    const _spawnPos = () => {
      if (typeof pickSafeSpawn === 'function') {
        const sp = pickSafeSpawn('right');
        if (sp) return sp;
      }
      return { x: 600, y: 300 };
    };
    if (sub === 'forestbeast' || sub === 'forest') {
      if (typeof ForestBeast !== 'undefined') {
        const _sp = _spawnPos();
        const fb = new ForestBeast(_sp.x, _sp.y);
        minions.push(fb);
        _consoleOk('Spawned ForestBeast');
      } else _consoleErr('ForestBeast not available in this arena.');
    } else if (sub === 'yeti') {
      if (typeof Yeti !== 'undefined') {
        const _sp = _spawnPos();
        const y = new Yeti(_sp.x, _sp.y);
        minions.push(y);
        _consoleOk('Spawned Yeti');
      } else _consoleErr('Yeti not available.');
    } else if (sub === 'minion') {
      if (typeof Minion !== 'undefined') {
        const _sp = _spawnPos();
        const mn = new Minion(_sp.x, _sp.y);
        minions.push(mn);
        _consoleOk('Spawned Minion');
      } else _consoleErr('Minion not available.');
    } else if (sub === 'dummy') {
      if (typeof Dummy !== 'undefined') {
        const _sp = _spawnPos();
        const d = new Dummy(_sp.x, _sp.y);
        d.playerNum = 9; d.name = 'DUMMY';
        trainingDummies.push(d);
        _consoleOk('Spawned Dummy');
      }
    } else if (sub === 'god') {
      if (typeof spawnGod === 'function') {
        const _g = spawnGod(true); // consoleSummoned=true suppresses crash screen
        if (_g) _consoleOk('Summoned God (no crash — dev mode)');
        else    _consoleErr('I am already present.');
      } else _consoleErr('spawnGod not available.');
    } else if (sub === 'absoluteaxiom' || sub === 'axiom' || sub === 'aa') {
      if (typeof AbsoluteAxiom === 'undefined') { _consoleErr('AbsoluteAxiom not available.'); return; }
      const already = Array.isArray(minions) && minions.some(m => m.isAbsoluteAxiom && m.health > 0);
      if (already) { _consoleErr('Absolute Axiom is already present.'); return; }
      const _sp = _spawnPos();
      const _aa = new AbsoluteAxiom(_sp.x, _sp.y);
      _aa._teamId = 50;
      minions.push(_aa);
      window._absoluteAxiomWasAlive = true;
      if (typeof resetGodCinematicFlags === 'function') resetGodCinematicFlags();
      _consoleOk('Absolute Axiom summoned. Good luck.');
    } else if (sub === 'bot') {
      if (typeof Fighter === 'undefined') { _consoleErr('Fighter not available.'); return; }
      const _botWKey   = (parts[2] || 'sword').toLowerCase();
      const _botCKey   = (parts[3] || '').toLowerCase();
      const _botWeapon = (typeof WEAPONS !== 'undefined' && WEAPONS[_botWKey]) ? _botWKey : 'sword';
      if (parts[2] && !WEAPONS[_botWKey]) _consolePrint('Unknown weapon "' + parts[2] + '" — defaulting to sword.', '#ffaa44');
      if (_botCKey && typeof CLASSES !== 'undefined' && !CLASSES[_botCKey]) _consolePrint('Unknown class "' + parts[3] + '" — no class applied.', '#ffaa44');
      const _sp  = _spawnPos();
      const _num = players.length + 1;
      const _botColors = ['#cc3322','#2244cc','#22aa44','#cc8800','#8833cc','#00aacc'];
      const _col = _botColors[(_num - 1) % _botColors.length];
      const bot  = new Fighter(_sp.x, _sp.y, _col, _botWeapon,
        { left:null, right:null, jump:null, attack:null, ability:null, super:null },
        true, 'hard');
      bot.playerNum = _num;
      bot.name      = 'BOT' + _num;
      bot.lives     = 3;
      // Target the nearest living, non-godmoded fighter, not players[0]. Otherwise a boss-vs-bot
      // fight crawls: the bot chases an invincible player instead of the boss and never opens a punish window.
      bot.target = (() => {
        const _cands = [...players, ...(typeof minions !== 'undefined' ? minions : [])]
          .filter(f => f && f !== bot && f.health > 0 && f.godmode !== true);
        if (!_cands.length) return players[0] || null;
        return _cands.reduce((best, f) =>
          Math.hypot(f.cx() - bot.cx(), f.cy() - bot.cy()) <
          Math.hypot(best.cx() - bot.cx(), best.cy() - bot.cy()) ? f : best);
      })();
      if (_botCKey && typeof CLASSES !== 'undefined' && CLASSES[_botCKey] && typeof applyClass === 'function') {
        applyClass(bot, _botCKey);
      }
      players.push(bot);
      _consoleOk('Spawned bot #' + _num + ' (' + _botWeapon + (_botCKey && CLASSES && CLASSES[_botCKey] ? ' / ' + _botCKey : '') + ')');
    } else { _consoleErr('Unknown entity: ' + sub + '.  Try: forestbeast yeti minion dummy god absoluteaxiom bot'); }
    return;
  }

  if (cmd.startsWith('SUMMON')) {
    if (typeof gameRunning === 'undefined' || !gameRunning) { _consoleErr('Start a game first.'); return; }
    if (sub === 'god') {
      if (typeof spawnGod === 'function') {
        const _g = spawnGod(true);
        if (_g) _consoleOk('Summoned God (no crash — dev mode)');
        else    _consoleErr('I am already present.');
      } else _consoleErr('spawnGod not available.');
    } else if (sub === 'absoluteaxiom' || sub === 'axiom' || sub === 'aa') {
      if (typeof AbsoluteAxiom === 'undefined') { _consoleErr('AbsoluteAxiom not available.'); return; }
      const already = Array.isArray(minions) && minions.some(m => m.isAbsoluteAxiom && m.health > 0);
      if (already) { _consoleErr('Absolute Axiom is already present.'); return; }
      const _aaRef = Array.isArray(players) && players[0];
      const _aaX   = _aaRef ? _aaRef.x + (_aaRef.facing > 0 ? 160 : -160) : 550;
      const _aaY   = _aaRef ? _aaRef.y - 60 : 200;
      const _aa    = new AbsoluteAxiom(_aaX, _aaY);
      _aa._teamId  = 50;
      minions.push(_aa);
      window._absoluteAxiomWasAlive = true;
      if (typeof resetGodCinematicFlags === 'function') resetGodCinematicFlags();
      _consoleOk('Absolute Axiom summoned. Good luck.');
    } else {
      _consoleErr('Usage: summon god | summon absoluteaxiom');
    }
    return;
  }

  if (cmd === 'STUDIO') {
    if (typeof gameRunning === 'undefined' || !gameRunning) { _consoleErr('Start a game first, then run STUDIO.'); return; }
    if (typeof ARENAS === 'undefined' || !ARENAS['studio']) { _consoleErr('Studio arena not found.'); return; }
    currentArenaKey = 'studio';
    currentArena    = ARENAS['studio'];
    if (typeof generateBgElements === 'function') generateBgElements();
    _consoleOk('Studio mode — The Studio loaded.');
    _consolePrint('Tips: SLOW ON  •  GODMODE ON  •  PAUSE to freeze  •  F10 hides HUD', '#8899cc');
    return;
  }

  if (cmd.startsWith('SETMAP')) {
    // Arena keys are camelCase but `sub` is lowercased, so match case-insensitively on keys and names.
    let mapKey = null;
    if (typeof ARENAS !== 'undefined' && sub) {
      const norm = v => String(v || '').toLowerCase().replace(/[\s_-]/g, '');
      const want = norm(parts.slice(1).join(' '));
      mapKey = Object.keys(ARENAS).find(k =>
        norm(k) === want || norm(ARENAS[k] && ARENAS[k].name) === want
      ) || null;
    }
    if (!mapKey) {
      _consoleErr('Unknown arena. Use `arena list` for keys (e.g. grass lava homeYard bossSanctum)'); return;
    }
    if (typeof gameRunning !== 'undefined' && gameRunning) {
      currentArenaKey = mapKey;
      currentArena    = ARENAS[mapKey];
      if (typeof randomizeArenaLayout === 'function') randomizeArenaLayout(mapKey);
      if (typeof generateBgElements   === 'function') generateBgElements();
      _consoleOk('Arena changed to: ' + mapKey);
    } else { _consoleErr('Start a game first.'); }
    return;
  }

  if (cmd.startsWith('SETWEAPON')) {
    const wKey = sub;
    const who  = (parts[2] || 'p1').toLowerCase();
    if (!wKey || typeof WEAPONS === 'undefined' || !WEAPONS[wKey]) { _consoleErr('Unknown weapon key.'); return; }
    if (typeof players === 'undefined') { _consoleErr('No game running.'); return; }
    const p = who === 'p2' || who === '2' ? players[1] : players[0];
    if (p) { p.weapon = WEAPONS[wKey]; p.weaponKey = wKey; _consoleOk(who + ' weapon set to ' + wKey); }
    return;
  }

  if (cmd.startsWith('SETCLASS')) {
    const cKey = sub;
    const who  = (parts[2] || 'p1').toLowerCase();
    if (!cKey || typeof CLASSES === 'undefined' || !CLASSES[cKey]) { _consoleErr('Unknown class key.'); return; }
    if (typeof players === 'undefined') { _consoleErr('No game running.'); return; }
    const p = who === 'p2' || who === '2' ? players[1] : players[0];
    if (p && typeof applyClass === 'function') { applyClass(p, cKey); _consoleOk(who + ' class set to ' + cKey); }
    return;
  }

  if (cmd.startsWith('LIVES')) {
    const n   = parseInt(parts[1]);
    const who = (parts[2] || 'all').toLowerCase();
    if (isNaN(n)) { _consoleErr('Usage: lives <number> [p1|p2|all]'); return; }
    if (typeof players === 'undefined') { _consoleErr('No game running.'); return; }
    const _setLives = (p) => { p.lives = n; };
    if (who === 'p1' || who === '1') { if (players[0]) _setLives(players[0]); }
    else if (who === 'p2' || who === '2') { if (players[1]) _setLives(players[1]); }
    else { players.forEach(_setLives); }
    _consoleOk('Lives set to ' + n + ' for ' + who);
    return;
  }

  if (cmd.startsWith('GODMODE')) {
    if (typeof hasPermission === 'function' && !hasPermission('dev')) {
      _consoleErr('Permission denied — developer role required.'); return;
    }
    if (typeof players === 'undefined') { _consoleErr('No game running.'); return; }
    const who = sub || 'p1';
    const on  = parts[2] ? parts[2].toLowerCase() !== 'off' : true;
    const targets = (who === 'all' || who === 'everyone')
      ? players
      : [who === 'p2' || who === '2' ? players[1] : players[0]];
    targets.forEach(p => {
      if (!p) return;
      p.godmode    = on;
      p._godmode   = on;
      if (on) p.invincible = 999999;
      else    p.invincible = 0;
    });
    _consoleOk('Godmode ' + (on ? 'ON' : 'OFF') + ' for ' + who);
    return;
  }

  if (cmd.startsWith('BOTS')) {
    if (sub === 'reset') {
      if (typeof players !== 'undefined') players.filter(p => p.isAI).forEach(p => { p._aiState = 'approach'; p._stuckFrames = 0; });
      _consoleOk('All bot states reset to approach.');
    } else if (sub === 'kill') {
      if (typeof players !== 'undefined') players.filter(p => p.isAI && !p.isBoss).forEach(p => p.health = 0);
      _consoleOk('All bots killed.');
    } else { _consoleErr('Usage: bots reset|kill'); }
    return;
  }

  if (cmd.startsWith('DEBUG')) {
    if (typeof debugMode !== 'undefined') {
      debugMode = sub !== 'off';
      _consoleOk('Debug overlay: ' + (debugMode ? 'ON' : 'OFF'));
    }
    return;
  }

  if (cmd.startsWith('SLOW')) {
    if (typeof timeScale !== 'undefined') {
      timeScale  = sub === 'off' ? 1.0 : 0.25;
      slowMotion = timeScale;
      _consoleOk('Slow motion: ' + (timeScale < 1 ? 'ON (0.25×)' : 'OFF'));
    }
    return;
  }

  if (cmd === 'COINS') {
    const action = sub || 'show';
    const parseAmt = () => {
      const amt = parseInt(parts[2], 10);
      return Number.isFinite(amt) ? amt : null;
    };
    const current = (typeof getCoinBalance === 'function')
      ? getCoinBalance()
      : (typeof playerCoins !== 'undefined' ? playerCoins : 0);

    if (action === 'show') {
      _consoleOk('Coins: ' + current + ' ⬡');
      return;
    }

    const amount = parseAmt();
    if (amount === null) {
      _consoleErr('Usage: coins show|set <n>|give <n>|take <n>');
      return;
    }

    if (action === 'set') {
      if (typeof setCoinBalance === 'function') setCoinBalance(amount);
      else if (typeof updateCoins === 'function') updateCoins(function() { return amount; });
      _consoleOk('Coins set to ' + Math.max(0, amount) + ' ⬡');
    } else if (action === 'give' || action === 'add' || action === 'grant') {
      if (typeof awardCoins === 'function') awardCoins(amount);
      else if (typeof updateCoins === 'function') updateCoins(function(b) { return b + amount; });
      _consoleOk('Added ' + amount + ' ⬡. New balance: ' + (current + amount) + ' ⬡');
    } else if (action === 'take' || action === 'remove' || action === 'deduct') {
      if (typeof setCoinBalance === 'function') setCoinBalance(current - amount);
      else if (typeof updateCoins === 'function') updateCoins(function(b) { return b - amount; });
      _consoleOk('Removed ' + amount + ' ⬡. New balance: ' + Math.max(0, current - amount) + ' ⬡');
    } else {
      _consoleErr('Usage: coins show|set <n>|give <n>|take <n>');
    }
    return;
  }

  if (cmd === 'PAUSE' || cmd === 'RESUME') {
    if (typeof pauseGame !== 'function' || typeof resumeGame !== 'function') {
      _consoleErr('Pause system not available.');
      return;
    }
    const mode = (sub || (cmd === 'RESUME' ? 'off' : 'toggle')).toLowerCase();
    if (mode === 'off' || mode === 'resume') {
      resumeGame();
      _consoleOk('Game resumed.');
    } else if (mode === 'on' || mode === 'pause') {
      if (!paused) pauseGame();
      _consoleOk('Game paused.');
    } else {
      pauseGame();
      _consoleOk(paused ? 'Game paused.' : 'Game resumed.');
    }
    return;
  }

  if (cmd === 'REVIVE' || cmd === 'RESPAWN') {
    if (typeof players === 'undefined' || players.length === 0) {
      _consoleErr('No active game.');
      return;
    }
    const who = (sub || 'all').toLowerCase();
    const _revive = (p) => {
      if (!p) return;
      if (typeof p.respawn === 'function') {
        p.respawn();
      } else {
        p.health = p.maxHealth;
        p.invincible = 100;
      }
      if (typeof p.lives === 'number' && p.lives <= 0) p.lives = 1;
    };
    const _slotR = who.match(/^p?(\d+)$/);
    if (_slotR) {
      const idx = parseInt(_slotR[1]) - 1;
      if (players[idx]) _revive(players[idx]); else _consoleErr('No player in slot ' + (idx + 1));
    } else if (who === 'boss') {
      _revive(players.find(p => p && p.isBoss));
    } else if (who === 'bot' || who === 'bots') {
      players.filter(p => p.isAI && !p.isBoss).forEach(_revive);
    } else if (who === 'minion' || who === 'minions') {
      if (typeof minions !== 'undefined') minions.forEach(_revive);
    } else {
      players.forEach(_revive);
      if (typeof trainingDummies !== 'undefined') trainingDummies.forEach(_revive);
      if (typeof minions !== 'undefined') minions.forEach(_revive);
    }
    _consoleOk('Respawned ' + who);
    return;
  }

  if (cmd === 'UNLOCKALL') {
    if (typeof hasPermission === 'function' && !hasPermission('dev')) {
      _consoleErr('Permission denied — developer role required.'); return;
    }
    if (typeof _cheatUnlockAll === 'function') {
      _cheatUnlockAll();
      _consoleOk('Everything unlocked!');
    } else { _consoleErr('_cheatUnlockAll not found.'); }
    return;
  }

  if (cmd.startsWith('UNLOCK')) {
    if (sub === 'trueform') {
      if (typeof setAccountFlagWithRuntime === 'function') {
        setAccountFlagWithRuntime(['unlocks', 'trueform'], true, function(v) { unlockedTrueBoss = v; });
      } else if (typeof unlockedTrueBoss !== 'undefined') { unlockedTrueBoss = true; }
      const card = document.getElementById('modeTrueForm');
      if (card) card.style.display = '';
      _consoleOk('Cosmic Axiom unlocked!');
    } else if (sub === 'megaknight') {
      if (typeof unlockedMegaknight !== 'undefined') {
        if (typeof setAccountFlagWithRuntime === 'function') {
          setAccountFlagWithRuntime(['unlocks', 'megaknight'], true, function(v) { unlockedMegaknight = v; });
        } else { unlockedMegaknight = true; }
        ['p1Class','p2Class'].forEach(id => {
          const sel = document.getElementById(id);
          if (sel && !sel.querySelector('option[value="megaknight"]')) {
            const opt = document.createElement('option'); opt.value='megaknight'; opt.textContent='Class: Knight ★'; sel.appendChild(opt);
          }
        });
        _consoleOk('Class: Knight unlocked!');
      }
    } else { _consoleErr('Usage: unlock trueform|megaknight'); }
    return;
  }

  // Supported types and their save keys:
  //   creator       → bossBeaten         (Creator / Phase-1 boss fight)
  //   trueform      → trueform            (True Form fight)
  //   sovereign     → sovereignBeaten     (Sovereign MK2 refight)
  //   absoluteaxiom → absoluteAxiomUnlocked (Absolute Axiom mode)
  //   god           → godDefeated         (God fight)
  //   bossrush      → bossRushUnlocked    (Boss Rush mode)
  //   megaknight    → megaknight          (Knight class)
  //   damnation     → damnationScar       (Damnation mode)
  if (cmd === 'GRANT' && (parts[1] || '').toUpperCase() === 'UNLOCK') {
    const activeAcct = typeof AccountManager !== 'undefined' ? AccountManager.getActiveAccount() : null;
    const callerId   = activeAcct ? activeAcct.id : '';
    if (!callerId || !_isAdmin(callerId)) {
      _consoleErr('Permission denied — admin only.'); return;
    }

    const _GRANT_UNLOCK_MAP = {
      creator:       'bossBeaten',
      trueform:      'trueform',
      sovereign:     'sovereignBeaten',
      absoluteaxiom: 'absoluteAxiomUnlocked',
      fallengod:     'fallenGodBeaten',
      god:           'godDefeated',
      bossrush:      'bossRushUnlocked',
      megaknight:    'megaknight',
      damnation:     'damnationScar',
    };
    const unlockAlias   = (parts[2] || '').toLowerCase();
    const grantTarget   = parts[3] || '';
    const saveKey       = _GRANT_UNLOCK_MAP[unlockAlias];

    if (!saveKey) {
      _consoleErr('Unknown unlock type "' + unlockAlias + '". Options: ' + Object.keys(_GRANT_UNLOCK_MAP).join(', ')); return;
    }
    if (!grantTarget) {
      _consoleErr('Usage: grant unlock <type> <accountId>'); return;
    }

    // 1. Try local account first
    if (typeof _adminMutateRawSave === 'function' &&
        typeof AccountManager !== 'undefined' &&
        AccountManager.getAllAccounts().some(function(a) { return a.id === grantTarget; })) {
      const ok = _adminMutateRawSave(grantTarget, function(d) {
        if (!d.unlocks) d.unlocks = {};
        d.unlocks[saveKey] = true;
      });
      if (ok) {
        _consoleOk(unlockAlias + ' unlocked for local account ' + grantTarget + '.');
        return;
      }
    }

    // 2. Try online peer (targeted: the recipient checks their own account ID)
    if (typeof NetworkManager !== 'undefined' && typeof NetworkManager.getSlotByAccountId === 'function') {
      const slot = NetworkManager.getSlotByAccountId(grantTarget);
      if (slot !== null && slot !== undefined && slot >= 0) {
        if (typeof NetworkManager.sendToSlot === 'function') {
          const sent = NetworkManager.sendToSlot(slot, {
            type: 'gameEvent', event: 'grantUnlock',
            targetAccountId: grantTarget, unlock: saveKey
          });
          if (sent) {
            _consoleOk(unlockAlias + ' unlock sent to online player in slot ' + slot + ' (' + grantTarget + ').');
            return;
          }
        }
      }
    }

    _consoleErr('Account not found locally or online: ' + grantTarget);
    return;
  }

  if (cmd.startsWith('SETWEAPON')) {
    const parts = raw.trim().split(/\s+/);
    const wName = (parts[1] || '').toLowerCase();
    const slot  = parts[2] === 'p2' ? 1 : 0;
    if (!wName) { _consoleErr('Usage: setweapon <name> [p1|p2]'); return; }
    const allWeapons = Object.assign({}, typeof WEAPONS !== 'undefined' ? WEAPONS : {}, window.CUSTOM_WEAPONS || {});
    const wKey = Object.keys(allWeapons).find(k => k.toLowerCase() === wName);
    if (!wKey) { _consoleErr('Unknown weapon: ' + wName + '. Available: ' + Object.keys(allWeapons).join(', ')); return; }
    const p = players && players[slot];
    if (!p) { _consoleErr('No player in slot ' + slot); return; }
    p.weapon = allWeapons[wKey];
    p.weaponKey = wKey;
    _consoleOk('P' + (slot + 1) + ' weapon set to ' + wKey);
    return;
  }

  if (raw.toLowerCase().startsWith('eval ')) {
    if (typeof hasPermission === 'function' && !hasPermission('dev')) {
      _consoleErr('Permission denied — developer role required.'); return;
    }
    const code = raw.slice(5);
    try {
      // eslint-disable-next-line no-eval
      const result = eval(code);  // intentional
      _consoleOk(String(result));
    } catch(err) {
      _consoleErr(err.message);
    }
    return;
  }

  // True Form adaptive AI debug commands
  if (cmd === 'TF ADAPT' || cmd === 'TF ADAPTATION') { if (typeof showAdaptationLevel === 'function') showAdaptationLevel(); return; }
  if (cmd === 'TF PROFILE') { if (typeof showPlayerProfile === 'function') showPlayerProfile(); return; }
  if (parts[0] && parts[0].toLowerCase() === 'tf' && parts[1] && parts[1].toLowerCase() === 'force' && parts[2]) {
    if (typeof forceAdaptationLevel === 'function') { forceAdaptationLevel(parseFloat(parts[2])); return; }
  }
  if (typeof handleChaosConsoleCmd === 'function' && handleChaosConsoleCmd(raw)) return;

  if (cmd === 'PF' || cmd === 'PATHFINDING') {
    if (sub === 'graph') {
      window._pfShowGraph = !window._pfShowGraph;
      _consoleOk('Platform graph viz: ' + (window._pfShowGraph ? 'ON' : 'OFF'));
    } else if (sub === 'paths') {
      window._pfShowPaths = !window._pfShowPaths;
      _consoleOk('Bot path viz: ' + (window._pfShowPaths ? 'ON' : 'OFF'));
    } else if (sub === 'arcs') {
      window._pfShowArcs = !window._pfShowArcs;
      _consoleOk('Projected landing arcs: ' + (window._pfShowArcs ? 'ON' : 'OFF'));
    } else if (sub === 'dj' || sub === 'doublejump') {
      window._pfShowDJ = !window._pfShowDJ;
      _consoleOk('Double-jump edge highlight: ' + (window._pfShowDJ ? 'ON' : 'OFF'));
    } else if (sub === 'log') {
      if (typeof logUnsafeEdgeAttempts === 'function') logUnsafeEdgeAttempts();
      _consoleOk('Unsafe edge log printed to console.');
    } else if (sub === 'reset') {
      if (typeof players !== 'undefined')
        players.filter(p => p.isAI).forEach(p => { if (typeof forceRecalculatePath === 'function') forceRecalculatePath(p); });
      _consoleOk('All bot paths reset.');
    } else if (sub === 'rebuild') {
      if (typeof buildGraphForCurrentArena === 'function') { buildGraphForCurrentArena(); _consoleOk('Graph rebuilt.'); }
    } else {
      _consoleOk('pf graph | pf paths | pf arcs | pf dj | pf log | pf reset | pf rebuild');
    }
    return;
  }

  if (cmd === 'MAPS ANALYZE') {
    analyzeAllMaps().forEach(r => { console.log(formatMapAnalysis(r)); });
    _consoleOk('Map analysis printed to browser console.');
    return;
  }
  if (cmd === 'MAPS ANALYZE RAW') {
    console.log(analyzeAllMaps());
    _consoleOk('Raw map analysis array printed to browser console.');
    return;
  }
  if (cmd.startsWith('MAP ANALYZE ')) {
    const key = parts[2];
    if (ARENAS[key]) {
      console.log(formatMapAnalysis({ key, ...analyzeMap(ARENAS[key]) }));
      _consoleOk('Analysis for "' + key + '" printed to browser console.');
    } else {
      _consoleErr('Map not found: ' + key);
    }
    return;
  }

  if (cmd === 'SOV STATS' || cmd === 'SOVEREIGN STATS') { if (typeof showSovereignStats === 'function') showSovereignStats(!adaptiveAIDebug); return; }
  if (cmd === 'SOV PREDICT' || cmd === 'SOVEREIGN PREDICT') { if (typeof showSovereignPredictions === 'function') showSovereignPredictions(); return; }
  if (cmd === 'SOV RESET' || cmd === 'SOVEREIGN RESET') { if (typeof resetSovereignMK2 === 'function') resetSovereignMK2(); return; }
  if (cmd === 'BRAIN NAV ON' || cmd === 'BRAIN NAV OFF') {
    if (typeof Brain === 'undefined' || !Brain.setNav) { _consoleErr('Brain not loaded.'); return; }
    Brain.setNav(cmd === 'BRAIN NAV ON');
    _consolePrint(Brain.nav ? 'Brain navigator ON: the bots\' pathfinding moves the brain across gaps (off The Circuit).' : 'Brain navigator OFF: the net moves on its own everywhere.', '#44ff88');
    return;
  }
  if (cmd === 'BRAIN' || cmd === 'BRAIN ON' || cmd === 'BRAIN OFF') {
    if (typeof Brain === 'undefined') { _consoleErr('Brain not loaded.'); return; }
    if (cmd === 'BRAIN OFF') { Brain.release(); if (Brain.setSovereignDrive) Brain.setSovereignDrive(false); _consolePrint('Brain released P2; Sovereign uses the cascade (BRAIN ON to restore).', '#44ff88'); return; }
    if (cmd === 'BRAIN ON' && Brain.setSovereignDrive) Brain.setSovereignDrive(true);
    if (!gameRunning || !players[1]) { _consoleErr('Start a 1v1 match first.'); return; }
    Brain.takeOver(players[1], players[0])
      .then(it => it >= 0 ? _consolePrint('Brain (iteration ' + it + ') now controls P2.', '#44ff88') : _consoleErr('Brain: bad checkpoint.'))
      .catch(e => _consoleErr('Brain: no checkpoint at data/brain/latest.json (' + e.message + ')'));
    return;
  }

  // In-match read on top of the brain (smb-brain-read.js).
  if (cmd === 'READ' || cmd === 'READ ON' || cmd === 'READ OFF') {
    if (typeof BrainRead === 'undefined') { _consoleErr('BrainRead not loaded.'); return; }
    if (cmd !== 'READ') BrainRead.enabled = cmd === 'READ ON';
    _consolePrint('Read is ' + (BrainRead.enabled ? 'ON' : 'OFF') + '.', '#44ff88');
    const L = typeof Brain !== 'undefined' && Brain.live;
    if (!L || !L.read) { _consolePrint('  (no brain-driven fighter in this match)', '#888888'); return; }
    const reads = BrainRead.describe(L.read);
    if (!reads.length) _consolePrint('  nothing read yet', '#888888');
    for (const r of reads) _consolePrint('  ' + r.read + ' ' + r.at + '  x' + r.strength + '  (n ' + r.evidence + ')', '#aaddff');
    _consolePrint('  ' + JSON.stringify(L.read.stats), '#888888');
    return;
  }

  const _ok = (s) => _consolePrint('  ✓ ' + s, '#44ff88');
  if (cmd.startsWith('SOVEREIGN:TRAIN') || cmd.startsWith('SOV:TRAIN')) {
    if (typeof SMK2Trainer === 'undefined') { _ok('SMK2Trainer not loaded.'); return; }
    const _tp = raw.trim().split(/\s+/);
    const _gens    = parseInt(_tp[1]) || 20;
    const _matches = parseInt(_tp[2]) || 10;
    const _bots    = parseInt(_tp[3]) || 2;
    SMK2Trainer.run(_gens, _matches, _bots);
    _ok(`Training started: ${_gens} gen × ${_matches} matches vs ${_bots} bot(s). Watch console.`);
    return;
  }
  if (cmd.startsWith('SOVEREIGN:STRESS') || cmd.startsWith('SOV:STRESS')) {
    if (typeof SMK2Trainer === 'undefined') { _ok('SMK2Trainer not loaded.'); return; }
    const _sp = raw.trim().split(/\s+/);
    const _maxBots  = parseInt(_sp[1]) || 6;
    const _matches  = parseInt(_sp[2]) || 8;
    SMK2Trainer.stressTest(_maxBots, _matches);
    _ok(`Stress test started: 1 → ${_maxBots} bots, ${_matches} matches/level. Watch console.`);
    return;
  }
  if (cmd.startsWith('SOVEREIGN:EVAL') || cmd.startsWith('SOV:EVAL')) {
    if (typeof SMK2Trainer === 'undefined') { _ok('SMK2Trainer not loaded.'); return; }
    const _ep = raw.trim().split(/\s+/);
    const _bots    = parseInt(_ep[1]) || 2;
    const _matches = parseInt(_ep[2]) || 40;
    SMK2Trainer.evalVsDefault(_bots, _matches);
    _ok(`Eval started: champion vs DEFAULT, ${_matches} paired matches vs ${_bots} bot(s). Watch console.`);
    return;
  }
  if (cmd === 'SOVEREIGN:GENOME' || cmd === 'SOV:GENOME') {
    if (typeof SMK2Trainer === 'undefined') { _ok('SMK2Trainer not loaded.'); return; }
    const _g = SMK2Trainer.loadChampion();
    console.table(_g);
    _ok(JSON.stringify(_g, null, 2));
    return;
  }
  if (cmd === 'SOVEREIGN:RESET' || cmd === 'SOV:GENOME RESET') {
    if (typeof SMK2Trainer === 'undefined') { _ok('SMK2Trainer not loaded.'); return; }
    SMK2Trainer.resetChampion();
    _ok('Champion genome reset to defaults. Reload to apply.');
    return;
  }
  if (cmd === 'SOVEREIGN:STOP' || cmd === 'SOV:STOP') {
    if (typeof SMK2Trainer === 'undefined') { _ok('SMK2Trainer not loaded.'); return; }
    SMK2Trainer.stop();
    _ok('Training stopped.');
    return;
  }
  if (cmd.startsWith('SOV LIMITER') || cmd.startsWith('SOVEREIGN LIMITER')) {
    const ai = players && players.find(p => p.isSovereignMK2);
    if (ai) { ai._limiterBroken = !ai._limiterBroken; _ok(`Limiter break: ${ai._limiterBroken ? 'ON' : 'OFF'}`); }
    return;
  }

  if (parts[0].toLowerCase() === 'sethp') {
    // sethp <value>  |  sethp p1|p2|player|boss|all <value>
    let target = 'all', valStr;
    if (parts.length >= 3 && isNaN(parts[1])) {
      target = parts[1].toLowerCase();
      valStr = parts[2];
    } else {
      valStr = parts[1];
    }
    const val = parseInt(valStr, 10);
    if (isNaN(val)) { _consoleErr('Usage: sethp <value>  or  sethp p1|p2|player|boss|all <value>'); return; }
    if (!players || players.length === 0) { _consoleErr('No active game.'); return; }
    let count = 0;
    players.forEach((p, idx) => {
      const isBossEntity = p.isBoss || p.isTrueForm;
      if (target === 'player' && isBossEntity) return;
      if (target === 'boss'   && !isBossEntity) return;
      if (target === 'p1'     && idx !== 0) return;
      if (target === 'p2'     && idx !== 1) return;
      p.health = Math.max(1, Math.min(val, p.maxHealth));
      count++;
    });
    _consoleOk(`Set HP to ${val} for ${count} entit${count === 1 ? 'y' : 'ies'}.`);
    return;
  }

  if (cmd.startsWith('SETCHAPTER')) {
    if (typeof hasPermission === 'function' && !hasPermission('dev')) {
      _consoleErr('Permission denied — developer role required.'); return;
    }
    const chId  = parseInt(parts[1], 10);
    const acId  = parts[2] || (typeof AccountManager !== 'undefined' && AccountManager.getActiveAccount()
      ? AccountManager.getActiveAccount().id : '');
    if (isNaN(chId))  { _consoleErr('Usage: setchapter <id> [accountId]'); return; }
    if (!acId)        { _consoleErr('No active account.'); return; }
    if (typeof setPlayerChapter === 'function') { setPlayerChapter(acId, chId); _consoleOk('Chapter set to ' + chId); }
    else              { _consoleErr('setPlayerChapter not available.'); }
    return;
  }

  if (cmd.startsWith('STARTMATCH')) {
    if (typeof hasPermission === 'function' && !hasPermission('dev')) {
      _consoleErr('Permission denied — developer role required.'); return;
    }
    const matchType = sub || 'p1vsbot';
    if (typeof gameRunning !== 'undefined' && gameRunning && typeof backToMenu === 'function') backToMenu();
    // "1p vs bot" is mode '2p' with p2IsBot=true, there is no separate '1p' mode
    const isVsBot = matchType === 'p1vsbot' || matchType === '1p' || matchType === 'bot' || matchType === '1pvbot';
    const modeMap = { '2p': '2p', 'boss': 'boss', 'trueform': 'trueform', 'training': 'training', 'adaptive': 'adaptive', 'sovereign': 'sovereign' };
    const resolvedMode = isVsBot ? '2p' : (modeMap[matchType] || '2p');
    if (typeof p2IsBot !== 'undefined') p2IsBot = isVsBot;
    if (typeof p2IsNone !== 'undefined') p2IsNone = false;
    if (typeof selectMode === 'function') selectMode(resolvedMode);
    if (typeof startGame === 'function') startGame();
    _consoleOk('Starting match: ' + (isVsBot ? '1p vs bot' : resolvedMode));
    return;
  }

  if (cmd.startsWith('STARTBOSS')) {
    if (typeof hasPermission === 'function' && !hasPermission('dev')) {
      _consoleErr('Permission denied — developer role required.'); return;
    }
    const bossType = sub || 'boss';
    if (typeof gameRunning !== 'undefined' && gameRunning && typeof backToMenu === 'function') backToMenu();
    if (typeof selectMode === 'function') selectMode(bossType === 'trueform' ? 'trueform' : 'boss');
    if (typeof startGame  === 'function') startGame();
    _consoleOk('Starting ' + bossType + ' fight…');
    return;
  }

  if (cmd === 'UNLOCKALLSKILLS') {
    if (typeof hasPermission === 'function' && !hasPermission('dev')) {
      _consoleErr('Permission denied — developer role required.'); return;
    }
    const unlAcct = parts[1] || (typeof AccountManager !== 'undefined' && AccountManager.getActiveAccount()
      ? AccountManager.getActiveAccount().id : '');
    if (!unlAcct) { _consoleErr('No active account.'); return; }
    if (typeof unlockAllItems === 'function') { unlockAllItems(unlAcct); _consoleOk('All items unlocked for ' + unlAcct); }
    else          { _consoleErr('unlockAllItems not available.'); }
    return;
  }

  if (cmd.startsWith('SETACCOUNTROLE')) {
    if (typeof hasPermission === 'function' && !hasPermission('dev')) {
      _consoleErr('Permission denied — developer role required.'); return;
    }
    const roleTargetId = parts[1] || '';
    const newRole      = (parts[2] || '').toLowerCase();
    if (!roleTargetId || !['player', 'moderator', 'admin', 'dev'].includes(newRole)) {
      _consoleErr('Usage: setaccountrole <accountId> <player|moderator|admin|dev>'); return;
    }
    if (typeof AccountManager === 'undefined') { _consoleErr('AccountManager not available.'); return; }
    const roleAcct = AccountManager.getAllAccounts().find(function(a) { return a.id === roleTargetId; });
    if (!roleAcct) { _consoleErr('Account not found: ' + roleTargetId); return; }
    if (typeof isSuperuserAccountId === 'function' && isSuperuserAccountId(roleTargetId) && newRole !== 'dev') {
      _consoleErr('That account is pinned to dev and cannot be downgraded.');
      return;
    }
    if (typeof GameState !== 'undefined') {
      GameState.update(function(s) {
        if (s.persistent.accounts[roleTargetId]) s.persistent.accounts[roleTargetId].role = newRole;
      });
      GameState.save();
    }
    _consoleOk('Account ' + roleTargetId + ' role set to ' + newRole);
    return;
  }

  if (cmd === 'WHO' || cmd === 'ACCOUNTS') {
    if (typeof AccountManager === 'undefined') { _consoleErr('AccountManager not available.'); return; }
    const _active = AccountManager.getActiveAccount();
    const _all    = AccountManager.getAllAccounts();
    if (_all.length === 0) { _consolePrint('No accounts found.', '#ffaa44'); return; }
    _consolePrint('── Accounts (' + _all.length + ') ──', '#44aaff');
    _all.forEach(function(a) {
      const isMe = _active && a.id === _active.id;
      _consolePrint((isMe ? '★ ' : '  ') + a.username + '  [' + (a.role || 'player') + ']', isMe ? '#ffdd66' : '#ccccff');
      _consolePrint('    id: ' + a.id, '#6688cc');
    });
    return;
  }

  if (cmd === 'WHOAMI') {
    if (typeof adminWhoAmI === 'function') {
      adminWhoAmI();
    } else {
      _consoleErr('Identity helper not available.');
    }
    return;
  }

  if (cmd === 'NET STATUS') {
    if (typeof adminNetStatus === 'function') {
      adminNetStatus();
    } else {
      _consoleErr('Network status helper not available.');
    }
    return;
  }
  if (cmd === 'NET PEERS') {
    if (window.NetworkManager && typeof NetworkManager.getPeerRoster === 'function') {
      const roster = NetworkManager.getPeerRoster();
      if (!roster.length) { _consolePrint('No connected peers.', '#ffaa44'); return; }
      roster.forEach(function(p) {
        _consolePrint(
          'slot ' + p.slot + ' | ' + (p.username || 'Unknown') +
          ' | acct=' + (p.accountId || '—') +
          ' | peer=' + (p.peerId || '—') +
          ' | device=' + (p.deviceId || '—'),
          '#88bbff'
        );
      });
    } else {
      _consoleErr('Network roster not available.');
    }
    return;
  }

  if (cmd.startsWith('BANIP')) {
    const parsed = _parseBanArgs(1);
    if (!parsed.target) { _consoleErr('Usage: banip <target> [minutes] [reason]'); return; }
    if (typeof adminBanIp === 'function') {
      adminBanIp(parsed.target, parsed.minutes, parsed.reason);
      _consoleOk('Best-effort IP ban queued for ' + parsed.target);
    } else {
      _consoleErr('Ban helpers not available.');
    }
    return;
  }
  if (cmd.startsWith('BANPEER')) {
    const parsed = _parseBanArgs(1);
    if (!parsed.target) { _consoleErr('Usage: banpeer <peerId> [minutes] [reason]'); return; }
    if (typeof adminBanPeer === 'function') {
      adminBanPeer(parsed.target, parsed.minutes, parsed.reason);
      _consoleOk('Peer ban queued for ' + parsed.target);
    } else {
      _consoleErr('Ban helpers not available.');
    }
    return;
  }
  if (cmd === 'BAN' || cmd.startsWith('BAN ')) {
    const parsed = _parseBanArgs(1);
    if (!parsed.target) { _consoleErr('Usage: ban <target> [minutes] [reason]'); return; }
    if (typeof adminBanTarget === 'function') {
      adminBanTarget(parsed.target, parsed.minutes, parsed.reason, { kind: 'mixed' });
      _consoleOk('Ban queued for ' + parsed.target);
    } else {
      _consoleErr('Ban helpers not available.');
    }
    return;
  }
  if (cmd.startsWith('TEMPBAN')) {
    const parsed = _parseBanArgs(1);
    if (!parsed.target || !parsed.minutes) { _consoleErr('Usage: tempban <target> <minutes> [reason]'); return; }
    if (typeof adminTempBanTarget === 'function') {
      adminTempBanTarget(parsed.target, parsed.minutes, parsed.reason, { kind: 'mixed' });
      _consoleOk('Temp ban queued for ' + parsed.target + ' (' + parsed.minutes + 'm)');
    } else {
      _consoleErr('Ban helpers not available.');
    }
    return;
  }
  if (cmd.startsWith('UNBAN')) {
    const target = parts.slice(1).join(' ').trim();
    if (!target) { _consoleErr('Usage: unban <target>'); return; }
    if (typeof adminUnbanTarget === 'function') {
      adminUnbanTarget(target);
      _consoleOk('Unban processed for ' + target);
    } else {
      _consoleErr('Ban helpers not available.');
    }
    return;
  }
  if (cmd === 'BANLIST') {
    if (typeof adminListBans === 'function') {
      adminListBans();
    } else {
      _consoleErr('Ban helpers not available.');
    }
    return;
  }
  if (cmd.startsWith('KICK')) {
    const target = parts.slice(1).join(' ').trim();
    if (!target) { _consoleErr('Usage: kick <target>'); return; }
    if (typeof _adminPanelKickTarget === 'function') {
      _adminPanelKickTarget(target);
      _consoleOk('Kick processed for ' + target);
    } else {
      _consoleErr('Kick helper not available.');
    }
    return;
  }

  if (cmd === 'VERSION') {
    _consolePrint('Stickman Evolution: The 95th', '#88bbff');
    _consolePrint('Build: ' + (typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : 'dev'), '#88bbff');
    _consolePrint('Mode: ' + (typeof gameMode !== 'undefined' ? gameMode || 'menu' : 'unknown'), '#88bbff');
    _consolePrint('Arena: ' + (typeof currentArenaKey !== 'undefined' ? currentArenaKey || '—' : '—'), '#88bbff');
    const _acctV = (typeof AccountManager !== 'undefined' && AccountManager.getActiveAccount) ? AccountManager.getActiveAccount() : null;
    if (_acctV) _consolePrint('Account: ' + _acctV.username + ' [' + (_acctV.role || 'player') + '] ' + _acctV.id, '#88bbff');
    return;
  }

  if (cmd === 'TIME' || cmd === 'GAMETIME') {
    const fc = typeof frameCount !== 'undefined' ? frameCount : '?';
    const secs = typeof frameCount !== 'undefined' ? (frameCount / 60).toFixed(1) : '?';
    _consolePrint('Frame: ' + fc + '  |  Time: ' + secs + 's', '#88bbff');
    _consolePrint('Date: ' + new Date().toLocaleString(), '#88bbff');
    return;
  }

  if (cmd.startsWith('SETSPEED')) {
    if (typeof hasPermission === 'function' && !hasPermission('dev')) { _consoleErr('Permission denied — developer role required.'); return; }
    const spd = parseFloat(parts[1]);
    if (isNaN(spd) || spd <= 0) { _consoleErr('Usage: setspeed <n>  (e.g. setspeed 0.5 or setspeed 2)'); return; }
    if (typeof timeScale !== 'undefined') { timeScale = spd; slowMotion = spd; }
    else if (typeof slowMotion !== 'undefined') { slowMotion = spd; }
    _consoleOk('Game speed set to ' + spd + '×');
    return;
  }

  if (cmd.startsWith('GRAVITY')) {
    if (typeof hasPermission === 'function' && !hasPermission('dev')) { _consoleErr('Permission denied — developer role required.'); return; }
    const gv = parseFloat(parts[1]);
    if (isNaN(gv)) { _consolePrint('Current gravity multiplier: ' + (typeof gravityMult !== 'undefined' ? gravityMult : 1), '#88bbff'); return; }
    if (typeof window !== 'undefined') { window.gravityMult = gv; }
    _consoleOk('Gravity multiplier set to ' + gv + '×  (takes effect on next physics tick)');
    _consolePrint('Note: gravityMult is read in Fighter.update(). If your build reads a local var, use eval instead.', '#ffaa44');
    return;
  }

  if (cmd.startsWith('NOCLIP')) {
    if (typeof hasPermission === 'function' && !hasPermission('dev')) { _consoleErr('Permission denied — developer role required.'); return; }
    if (typeof players === 'undefined' || !players.length) { _consoleErr('No active game.'); return; }
    const who  = (parts[1] || 'p1').toLowerCase();
    const onOff = parts[2] ? parts[2].toLowerCase() !== 'off' : null; // null = toggle
    const targets = (who === 'all') ? players : [who === 'p2' || who === '2' ? players[1] : players[0]];
    targets.forEach(p => {
      if (!p) return;
      p._noclip = (onOff !== null) ? onOff : !p._noclip;
      if (p._noclip) p.onGround = false; // prevent immediate snap-to-floor
    });
    const state = targets[0] && targets[0]._noclip;
    _consoleOk('Noclip ' + (state ? 'ON' : 'OFF') + ' for ' + who);
    _consolePrint('Note: Fighter.update() must check p._noclip to skip platform collision.', '#ffaa44');
    return;
  }

  if (cmd === 'RELOAD') {
    if (typeof hasPermission === 'function' && !hasPermission('dev')) { _consoleErr('Permission denied — developer role required.'); return; }
    _consolePrint('Reloading…', '#ffaa44');
    setTimeout(function() { window.location.reload(); }, 400);
    return;
  }

  if (cmd === 'BOSS PHASE' || (parts[0].toUpperCase() === 'BOSS' && parts[1] && parts[1].toLowerCase() === 'phase')) {
    if (typeof hasPermission === 'function' && !hasPermission('dev')) { _consoleErr('Permission denied — developer role required.'); return; }
    const targetPhase = parseInt(parts[2], 10);
    if (isNaN(targetPhase) || targetPhase < 1 || targetPhase > 3) { _consoleErr('Usage: boss phase <1|2|3>'); return; }
    const bossEntity = (typeof players !== 'undefined') ? players.find(function(p) { return p && p.isBoss && !p.isTrueForm; }) : null;
    if (!bossEntity) { _consoleErr('No boss entity found in current game.'); return; }
    // Set health to the threshold that forces the target phase
    // Phase 1: >2000 HP, Phase 2: 1001-2000 HP, Phase 3: <=1000 HP
    const phaseThresholds = { 1: bossEntity.maxHealth, 2: 1500, 3: 500 };
    bossEntity.health = Math.min(phaseThresholds[targetPhase], bossEntity.maxHealth);
    _consoleOk('Boss health set to ' + bossEntity.health + ' (targeting phase ' + targetPhase + ')');
    return;
  }

  if (cmd === 'ARENA LIST') {
    if (typeof ARENAS === 'undefined') { _consoleErr('ARENAS not available.'); return; }
    _consolePrint('Available arenas:', '#44aaff');
    Object.keys(ARENAS).forEach(function(k) {
      const a = ARENAS[k];
      _consolePrint('  ' + k + (a.name ? '  — ' + a.name : '') + (a.isBossArena ? '  [boss]' : '') + (a.isVoidArena ? '  [trueform]' : '') + (a.isStudioArena ? '  [studio — dev only]' : ''), '#ccddff');
    });
    return;
  }

  if (cmd === 'WEAPON LIST') {
    if (typeof WEAPONS === 'undefined') { _consoleErr('WEAPONS not available.'); return; }
    _consolePrint('Available weapons:', '#44aaff');
    Object.keys(WEAPONS).forEach(function(k) {
      const w = WEAPONS[k];
      _consolePrint('  ' + k + (w.name ? '  — ' + w.name : '') + (w.damage ? '  dmg:' + w.damage : ''), '#ccddff');
    });
    return;
  }

  if (cmd === 'CLASS LIST') {
    if (typeof CLASSES === 'undefined') { _consoleErr('CLASSES not available.'); return; }
    _consolePrint('Available classes:', '#44aaff');
    Object.keys(CLASSES).forEach(function(k) {
      const c = CLASSES[k];
      _consolePrint('  ' + k + (c.name ? '  — ' + c.name : ''), '#ccddff');
    });
    return;
  }

  if (cmd === 'STORY LIST') {
    if (typeof hasPermission === 'function' && !hasPermission('dev')) { _consoleErr('Permission denied — developer role required.'); return; }
    if (typeof STORY_CHAPTERS === 'undefined') { _consoleErr('STORY_CHAPTERS not available.'); return; }
    _consolePrint('Story chapters (' + STORY_CHAPTERS.length + '):', '#44aaff');
    STORY_CHAPTERS.forEach(function(ch, i) {
      _consolePrint('  [' + i + '] ' + (ch.title || ch.id || '(untitled)'), '#ccddff');
    });
    return;
  }

  if (cmd.startsWith('ACCOUNT INFO') || (parts[0].toUpperCase() === 'ACCOUNT' && parts[1] && parts[1].toLowerCase() === 'info')) {
    if (!_consoleIsAdmin && typeof hasPermission === 'function' && !hasPermission('admin')) { _consoleErr('Permission denied — admin role required.'); return; }
    if (typeof AccountManager === 'undefined') { _consoleErr('AccountManager not available.'); return; }
    const targetId = parts[2] || '';
    const infoAcct = targetId
      ? AccountManager.getAllAccounts().find(function(a) { return a.id === targetId; })
      : AccountManager.getActiveAccount();
    if (!infoAcct) { _consoleErr('Account not found: ' + (targetId || '(none active)')); return; }
    _consolePrint('── Account: ' + infoAcct.username + ' ──', '#44aaff');
    _consolePrint('  id:       ' + infoAcct.id, '#ccddff');
    _consolePrint('  role:     ' + (infoAcct.role || 'player'), '#ccddff');
    _consolePrint('  created:  ' + new Date(infoAcct.createdAt).toLocaleString(), '#ccddff');
    _consolePrint('  saveKey:  ' + (infoAcct.saveKey || '—'), '#ccddff');
    // Check ban status
    if (typeof isConnectionBanned === 'function') {
      const br = isConnectionBanned({ accountId: infoAcct.id, username: infoAcct.username });
      if (br) {
        const ttl = br.expiresAt ? Math.max(0, Math.ceil((br.expiresAt - Date.now()) / 60000)) + 'm remaining' : 'permanent';
        _consolePrint('  BANNED:   ' + (br.reason || 'no reason') + ' [' + ttl + ']', '#ff6666');
      } else {
        _consolePrint('  status:   not banned', '#44ff88');
      }
    }
    return;
  }

  if (cmd.startsWith('BANCHECK')) {
    if (!_consoleIsAdmin && typeof hasPermission === 'function' && !hasPermission('moderator')) { _consoleErr('Permission denied — moderator role required.'); return; }
    const checkTarget = parts.slice(1).join(' ').trim();
    if (!checkTarget) { _consoleErr('Usage: bancheck <accountId|username>'); return; }
    if (typeof isConnectionBanned !== 'function' || typeof _adminResolveBanTarget !== 'function') { _consoleErr('Ban helpers not available.'); return; }
    const checkBundle = _adminResolveBanTarget(checkTarget);
    if (!checkBundle) { _consoleErr('Could not resolve target: ' + checkTarget); return; }
    const identity = { accountId: checkBundle.accountId || '', peerId: checkBundle.peerId || '', deviceId: checkBundle.deviceId || '', username: checkBundle.username || '' };
    const banRec = isConnectionBanned(identity);
    if (banRec) {
      const ttl = banRec.expiresAt ? Math.max(0, Math.ceil((banRec.expiresAt - Date.now()) / 60000)) + 'm remaining' : 'permanent';
      _consolePrint(checkBundle.label + ' is BANNED  [' + ttl + ']', '#ff6666');
      _consolePrint('Reason: ' + (banRec.reason || 'none'), '#ffaaaa');
      _consolePrint('Issued: ' + (banRec.createdAt ? new Date(banRec.createdAt).toLocaleString() : '?'), '#ffaaaa');
    } else {
      _consoleOk(checkBundle.label + ' is NOT banned.');
    }
    return;
  }

  if (cmd.startsWith('NOTIFY')) {
    if (!_consoleIsAdmin && typeof hasPermission === 'function' && !hasPermission('moderator')) { _consoleErr('Permission denied — moderator role required.'); return; }
    const notifyMsg = parts.slice(1).join(' ').trim();
    if (!notifyMsg) { _consoleErr('Usage: notify <message>'); return; }
    // Broadcast online if connected
    if (typeof onlineMode !== 'undefined' && onlineMode && typeof NetworkManager !== 'undefined' && NetworkManager.connected) {
      NetworkManager.sendGameEvent('consoleCmd', { cmd: 'NOTIFY_DISPLAY ' + notifyMsg });
    }
    // Show locally
    if (typeof _showNotification === 'function') {
      _showNotification(notifyMsg);
    } else if (typeof _adminToast === 'function') {
      _adminToast(notifyMsg);
    } else {
      _consolePrint('[Notification] ' + notifyMsg, '#ffdd88');
    }
    _consoleOk('Notification sent: ' + notifyMsg);
    return;
  }

  // Pulls the latest ban list from the server and merges it locally.
  if (cmd === 'SYNC' || cmd === 'SYNC BANS') {
    if (!_consoleIsAdmin && typeof hasPermission === 'function' && !hasPermission('admin')) { _consoleErr('Permission denied — admin role required.'); return; }
    const serverUrl = (typeof SERVER_CONFIG !== 'undefined') ? SERVER_CONFIG.url : '';
    if (!serverUrl) {
      _consolePrint('SERVER_CONFIG.url is not set — running in offline mode.', '#ffaa44');
      _consolePrint('Set SERVER_CONFIG.url in smb-globals.js to enable server sync.', '#ffaa44');
      return;
    }
    _consolePrint('Syncing bans from ' + serverUrl + ' …', '#88bbff');
    if (typeof syncBansFromServer === 'function') {
      syncBansFromServer().then(function(added) {
        if (added === null || added === undefined) {
          _consoleErr('Server unreachable — could not sync.');
        } else {
          _consoleOk('Sync complete. ' + added + ' new ban(s) imported.');
        }
      });
    } else {
      _consoleErr('syncBansFromServer not available.');
    }
    return;
  }

  if (cmd === 'SERVER' || cmd === 'SERVER STATUS') {
    const serverUrl = (typeof SERVER_CONFIG !== 'undefined') ? SERVER_CONFIG.url : '';
    if (!serverUrl) { _consolePrint('Server: (not configured — offline mode)', '#ffaa44'); return; }
    _consolePrint('Checking ' + serverUrl + '/api/status …', '#88bbff');
    fetch(serverUrl + '/api/status')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        _consoleOk('Server online  v' + (d.version || '?') + '  |  active bans: ' + (d.activeBans || 0) + '  |  uptime: ' + (d.uptime || 0) + 's');
      })
      .catch(function(e) { _consoleErr('Server unreachable: ' + (e.message || e)); });
    return;
  }

  // Handle NOTIFY_DISPLAY (received from broadcast): render it locally
  if (cmd.startsWith('NOTIFY_DISPLAY')) {
    const displayMsg = raw.slice('NOTIFY_DISPLAY '.length).trim();
    if (typeof _showNotification === 'function') { _showNotification(displayMsg); }
    else if (typeof _adminToast === 'function') { _adminToast(displayMsg); }
    return;
  }

  if (cmd.startsWith('CAMTRACE')) {
    if (typeof camTrace === 'undefined') { _consoleErr('camTrace not loaded'); return; }
    if (sub === '' || sub === 'arm') {
      _consoleOk(camTrace.arm(parts[2] ? parseFloat(parts[2]) : undefined));
      _consolePrint('Now reproduce the bug, then run: camtrace report');
      return;
    }
    if (sub === 'start') { _consoleOk(camTrace.start()); return; }
    if (sub === 'stop')  { _consoleOk(camTrace.stop());  return; }
    if (sub === 'mark')  { camTrace.mark(parts.slice(2).join(' ')); _consoleOk('marked'); return; }
    if (sub === 'report') {
      const r = camTrace.report();
      if (typeof r === 'string') { _consoleErr(r); return; }
      const c = r.caught_event, y = r.whole_buffer.y, x = r.whole_buffer.x;
      _consoleOk('camTrace report (' + r.whole_buffer.frames + ' frames) — copy the lines below');
      _consolePrint('caught: ' + (c ? JSON.stringify(c) : 'nothing tripped the arm threshold'));
      _consolePrint('Y: maxStep=' + y.maxStepPx + 'px mean=' + y.meanStepPx + ' reversals=' + y.reversals +
        ' targetFrozen=' + y.pctTargetFrozen + '% maxTargetJump=' + y.maxTargetJumpPx + ' maxLag=' + y.maxLagPx);
      _consolePrint('X: maxStep=' + x.maxStepPx + 'px mean=' + x.meanStepPx + ' reversals=' + x.reversals +
        ' targetFrozen=' + x.pctTargetFrozen + '% maxLag=' + x.maxLagPx);
      _consolePrint('failsafeSnaps=' + r.whole_buffer.failsafeSnaps + ' airborneFrames=' + r.whole_buffer.airborneFrames +
        ' zoomReversals=' + r.whole_buffer.zoomReversals + ' modeChanges=' + r.whole_buffer.modeChanges);
      _consolePrint('context: ' + JSON.stringify(r.context_at_worst));
      _consolePrint('entities: ' + JSON.stringify(r.whole_buffer.entities));
      for (const line of r.sample_rows.slice(0, 12)) _consolePrint(line, '#99aacc');
      _consolePrint('(full JSON also logged to the browser DevTools console)');
      return;
    }
    _consoleErr('camtrace: use arm | start | stop | mark | report');
    return;
  }

  _consoleErr('Unknown command: ' + parts[0] + '  (type HELP for list)');
}


// ════════════════════════════════════════════════════════════════════════════
// Console extensions: more commands, $ helpers for eval, chained commands,
// macros, live watches, and Tab autocomplete for commands and JavaScript.
// Wraps _consoleExec the same way smb-ai-console.js and smb-attacktest-gui.js do,
// so anything this block doesn't handle falls through to the original.
// ════════════════════════════════════════════════════════════════════════════
(function() {
  const _MACRO_KEY = 'smb_console_macros';
  const X = { infSuper: false, noCd: false, aiFreeze: false, speed: 1, grav: null, frozen: false, stepUntil: -1, watches: [] };
  const _gravOrig = new Map();
  const _geval = (0, eval);

  const _isDev = () => typeof hasPermission !== 'function' || hasPermission('dev');
  const _devOnly = () => { if (_isDev()) return true; _consoleErr('Permission denied — developer role required.'); return false; };
  const _inGame = () => {
    if (typeof gameRunning !== 'undefined' && gameRunning && typeof players !== 'undefined' && players.length) return true;
    _consoleErr('Start a match first.'); return false;
  };

  // ── Who's who ──────────────────────────────────────────────────────────────
  function _me() {
    if (typeof players === 'undefined' || !players.length) return null;
    return players.find(p => p && !p.isAI && !p.isRemote) || players[0];
  }
  function _everyone() {
    const out = typeof players !== 'undefined' ? [...players] : [];
    if (typeof minions !== 'undefined') out.push(...minions);
    if (typeof trainingDummies !== 'undefined') out.push(...trainingDummies);
    return out.filter(Boolean);
  }
  // me | p1..p8 | all | boss | bots | enemies | minions | <name fragment>
  function _who(sel, dflt) {
    const s = String(sel || dflt || 'me').toLowerCase();
    const all = _everyone(), m = _me();
    if (s === 'me') return m ? [m] : [];
    const slot = s.match(/^p?(\d)$/);
    if (slot) return typeof players !== 'undefined' && players[+slot[1] - 1] ? [players[+slot[1] - 1]] : [];
    if (s === 'all') return all;
    if (s === 'boss') return all.filter(p => p.isBoss || p.isTrueForm);
    if (s === 'bot' || s === 'bots') return all.filter(p => p.isAI && !p.isBoss && p !== m);
    if (s === 'minion' || s === 'minions') return typeof minions !== 'undefined' ? [...minions] : [];
    if (s === 'enemies' || s === 'foes') return all.filter(p => p !== m && (p.isAI || p.isBoss));
    return all.filter(p => String(p.name || '').toLowerCase().includes(s));
  }
  const _label = p => (p && (p.name || (p.constructor && p.constructor.name))) || '?';
  const _whoNames = list => list.length ? list.map(_label).join(', ') : 'nobody';

  // ── $ helpers for eval ─────────────────────────────────────────────────────
  const _helpers = {
    $me: () => _me(), $p1: () => (typeof players !== 'undefined' ? players[0] : undefined),
    $p2: () => (typeof players !== 'undefined' ? players[1] : undefined),
    $boss: () => _who('boss')[0], $all: () => _everyone(), $enemies: () => _who('enemies'),
    $bots: () => _who('bots'), $arena: () => (typeof currentArena !== 'undefined' ? currentArena : undefined),
  };
  for (const k in _helpers) {
    if (!(k in window)) Object.defineProperty(window, k, { get: _helpers[k], configurable: true });
  }
  window.$find  = (name) => _who(name)[0];
  window.$super = (p) => { for (const f of [].concat(p || _me())) if (f) { f.superMeter = 100; f.superReady = true; } return 'super full'; };
  window.$heal  = (p) => { for (const f of [].concat(p || _me())) if (f) f.health = f.maxHealth; return 'healed'; };
  window.$tp    = (p, x, y) => { p = p || _me(); if (p) { p.x = x - p.w / 2; p.y = y - p.h; p.vx = 0; p.vy = 0; } return p && [Math.round(p.x), Math.round(p.y)]; };
  window.$set   = (p, props) => { for (const f of [].concat(p)) if (f) Object.assign(f, props); return props; };
  window.$run   = (cmd) => { window._consoleExec(cmd); };
  window.$props = (o) => _propNames(o).join('  ');

  // ── Pretty results ─────────────────────────────────────────────────────────
  function _fmt(v, depth) {
    depth = depth === undefined ? 1 : depth;
    if (v === undefined) return 'undefined';
    if (v === null) return 'null';
    const t = typeof v;
    if (t === 'string') return depth < 1 ? JSON.stringify(v) : v;
    if (t === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
    if (t !== 'object' && t !== 'function') return String(v);
    if (t === 'function') {
      const src = Function.prototype.toString.call(v);
      const sig = src.match(/^[^{=]*?\(([^)]*)\)/);
      return 'ƒ ' + (v.name || 'anonymous') + '(' + (sig ? sig[1].replace(/\s+/g, ' ').slice(0, 60) : '') + ')';
    }
    if (typeof v.health === 'number' && typeof v.x === 'number' && typeof v.cx === 'function') {
      return _label(v) + ' {hp ' + Math.round(v.health) + '/' + Math.round(v.maxHealth) +
        (typeof v.lives === 'number' ? ', lives ' + v.lives : '') + ', weapon ' + (v.weaponKey || '?') +
        ', class ' + (v.charClass || '?') + ', x ' + Math.round(v.x) + ', y ' + Math.round(v.y) +
        ', super ' + Math.round(v.superMeter || 0) + (v.isAI ? ', AI' : '') + (v.godmode ? ', GOD' : '') + '}';
    }
    if (depth < 1) return Array.isArray(v) ? 'Array(' + v.length + ')' : (v.constructor && v.constructor.name !== 'Object' ? v.constructor.name : '{…}');
    if (Array.isArray(v) || v instanceof Set) {
      const arr = [...v];
      return (v instanceof Set ? 'Set' : 'Array') + '(' + arr.length + ') [' + arr.slice(0, 12).map(x => _fmt(x, 0)).join(', ') + (arr.length > 12 ? ', …' : '') + ']';
    }
    if (v instanceof Map) return 'Map(' + v.size + ')';
    const keys = Object.keys(v);
    const name = v.constructor && v.constructor.name !== 'Object' ? v.constructor.name + ' ' : '';
    return name + '{' + keys.slice(0, 20).map(k => k + ': ' + _fmt(v[k], 0)).join(', ') + (keys.length > 20 ? ', … ' + (keys.length - 20) + ' more' : '') + '}';
  }

  function _evalAndPrint(code) {
    try {
      const r = _geval(code);
      window.$_ = r;
      if (r && typeof r.then === 'function') {
        _consolePrint('Promise… (result arrives below)', '#8899bb');
        r.then(v => { window.$_ = v; _consoleOk(_fmt(v)); }, e => _consoleErr(String(e && e.message || e)));
      } else {
        _consoleOk(_fmt(r));
      }
    } catch (e) { _consoleErr(e.message); }
  }

  // ── Per-frame toggles ──────────────────────────────────────────────────────
  function _frame() {
    requestAnimationFrame(_frame);
    if (typeof gameRunning === 'undefined' || !gameRunning) {
      if (X.frozen) { X.frozen = false; hitStopFrames = 0; }
      return;
    }
    const m = _me();
    if (m && X.infSuper) { m.superMeter = 100; m.superReady = true; }
    if (m && X.noCd) { m.cooldown = 0; m.cooldown2 = 0; m.abilityCooldown = 0; m.abilityCooldown2 = 0; }
    if (X.aiFreeze) {
      for (const p of _everyone()) {
        if (p === m || !p.isAI || p.health <= 0) continue;
        p._aiHoldUntil = frameCount + 2;
        if (p.onGround) p.vx *= 0.5;
      }
    }
    if (X.speed !== 1 && !activeCinematic && !(typeof activeFinisher !== 'undefined' && activeFinisher)) slowMotion = X.speed;
    if (X.grav !== null && currentArena) {
      if (!_gravOrig.has(currentArena)) _gravOrig.set(currentArena, currentArena.modifiers);
      const mods = currentArena.modifiers || {};
      if (mods.gravityMult !== X.grav) currentArena.modifiers = Object.assign({}, mods, { gravityMult: X.grav });
    }
    if (X.frozen && frameCount >= X.stepUntil) hitStopFrames = 1e9;
    if (X.watches.length && frameCount % 6 === 0) _drawWatches();
  }
  requestAnimationFrame(_frame);

  function _onOff(arg, cur) {
    const a = String(arg || '').toLowerCase();
    if (a === 'on' || a === '1' || a === 'true') return true;
    if (a === 'off' || a === '0' || a === 'false') return false;
    return !cur;
  }

  // ── Watches ────────────────────────────────────────────────────────────────
  function _drawWatches() {
    let box = document.getElementById('_conWatch');
    if (!X.watches.length) { if (box) box.remove(); return; }
    if (!box) {
      box = document.createElement('div');
      box.id = '_conWatch';
      box.style.cssText = 'position:fixed;top:8px;left:8px;z-index:9998;background:rgba(8,8,18,0.85);border:1px solid #3366ff;' +
        'border-radius:6px;padding:5px 9px;font:11px "Courier New",monospace;color:#cfe;pointer-events:none;max-width:46vw';
      document.body.appendChild(box);
    }
    box.innerHTML = X.watches.map((w, i) => {
      let v;
      try { v = _fmt(_geval(w), 0); } catch (e) { v = '⚠ ' + e.message; }
      const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      return '<div><span style="color:#7f9cff">' + (i + 1) + '. ' + esc(w) + '</span> = ' + esc(v) + '</div>';
    }).join('');
  }

  // ── Macros ─────────────────────────────────────────────────────────────────
  function _macros() { try { return JSON.parse(localStorage.getItem(_MACRO_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function _saveMacros(m) { try { localStorage.setItem(_MACRO_KEY, JSON.stringify(m)); return true; } catch (e) { return false; } }

  // ── Scenarios ──────────────────────────────────────────────────────────────
  function _whenInGame(fn) {
    const t0 = performance.now();
    const iv = setInterval(() => {
      if (typeof gameRunning !== 'undefined' && gameRunning && typeof players !== 'undefined' && players.length && frameCount > 30) { clearInterval(iv); fn(); }
      else if (performance.now() - t0 > 10000) { clearInterval(iv); _consoleErr('Match did not start in time.'); }
    }, 100);
  }
  const SCENARIOS = {
    sandbox:  { d: 'godmode, infinite super, no cooldowns, frozen AI', run: () => _chain('godmode me on; infsuper on; nocd on; aifreeze on') },
    finisher: { d: 'every enemy at 1 HP and your super full — test finishers', run: () => {
      if (!_inGame()) return;
      for (const p of _who('enemies')) if (!(p.isTrueForm && typeof tfFalseVictoryFired !== 'undefined' && !tfFalseVictoryFired)) p.health = 1;
      _chain('super me'); } },
    clutch:   { d: 'you at 15% HP on your last life, super full, enemies healed', run: () => {
      if (!_inGame()) return;
      const m = _me(); m.health = Math.max(1, Math.round(m.maxHealth * 0.15)); if (typeof m.lives === 'number') m.lives = 1;
      for (const p of _who('enemies')) p.health = p.maxHealth;
      _chain('super me'); } },
    crowd:    { d: 'spawn N bots with random weapons and classes (default 4)', run: (n) => {
      if (!_inGame()) return;
      const W = Object.keys(WEAPONS), C = Object.keys(CLASSES), pick = a => a[Math.floor(Math.random() * a.length)];
      for (let i = 0; i < Math.min(12, parseInt(n, 10) || 4); i++) window._consoleExec('spawn bot ' + pick(W) + ' ' + pick(C)); } },
    duel:     { d: 'start a vs-bot match with your weapon and class: scenario duel <weapon> [class]', run: (w, c) => {
      window._consoleExec('startmatch p1vsbot');
      _whenInGame(() => { if (w) _chain('setweapon ' + w + ' me' + (c ? '; setclass ' + c + ' me' : '')); _consoleOk('Duel ready.'); }); } },
    boss3:    { d: 'boss fight at phase 3 (starts one if needed)', run: () => {
      if (_who('boss').length) { window._consoleExec('boss phase 3'); return; }
      window._consoleExec('startboss boss');
      _whenInGame(() => window._consoleExec('boss phase 3')); } },
    slowmo:   { d: 'quarter speed with hitboxes on', run: () => { _chain('speed 0.25'); debugMode = true; showHitboxes = true; } },
    reset:    { d: 'turn every toggle off and heal everyone', run: () => {
      X.infSuper = X.noCd = X.aiFreeze = false;
      if (X.frozen) { X.frozen = false; hitStopFrames = 0; }
      _chain('speed 1; grav reset');
      if (typeof gameRunning !== 'undefined' && gameRunning) _chain('godmode me off; heal all'); } },
  };

  function _chain(line) {
    for (const part of String(line).split(';')) { const c = part.trim(); if (c) window._consoleExec(c); }
  }

  // ── Command catalog (autocomplete + help) ──────────────────────────────────
  const WHO = ['me', 'p1', 'p2', 'all', 'boss', 'bots', 'enemies', 'minions'];
  const ON = ['on', 'off'];
  const keysOf = name => () => { try { return Object.keys(_geval(name) || {}); } catch (e) { return []; } };
  const W = keysOf('WEAPONS'), C = keysOf('CLASSES'), A = keysOf('ARENAS');
  const CMDS = [
    // new
    ['super', 'fill super meter', [WHO]], ['infsuper', 'keep your super full', [ON]], ['nocd', 'no cooldowns for you', [ON]],
    ['cd', 'reset cooldowns once', [WHO]], ['dmg', 'damage multiplier: dmg <x> [who]', [['1', '2', '5', '999'], WHO]],
    ['hp', 'set health: hp <n|max|%> [who]', [['max', '1', '50%'], WHO]], ['tp', 'teleport: tp <x> <y> [who]  or  tp <who> <toWho>', [WHO, WHO]],
    ['aifreeze', 'AI stands still', [ON]], ['speed', 'game speed that sticks (0.1–1)', [['0.1', '0.25', '0.5', '1']]],
    ['grav', 'gravity multiplier that works', [['0.3', '0.6', '1.6', '2.5', 'reset']]], ['freeze', 'freeze time', [ON]],
    ['step', 'advance N frames while frozen', [['1', '5', '10', '60']]], ['inspect', 'show a fighter in detail', [WHO]],
    ['props', 'list properties: props <expression>', []], ['find', 'search global names: find <text>', []],
    ['watch', 'live readout: watch <expression> | watch clear | watch del <n>', [['clear', 'del', '$me.health', '$me.superMeter', 'slowMotion', 'frameCount']]],
    ['scenario', 'set up a situation', [() => Object.keys(SCENARIOS), W, C]], ['macro', 'save/run command lists', [['save', 'run', 'list', 'del'], () => Object.keys(_macros())]],
    ['after', 'run later: after <seconds> <command>', [['1', '3', '5']]], ['repeat', 'repeat <n> <command>', [['3', '5', '10']]],
    ['js', 'evaluate JavaScript (same as eval, prettier output)', []], ['eval', 'evaluate JavaScript', []],
    // existing
    ['help', 'command list', []], ['clear', 'clear output', []], ['status', 'game state summary', []], ['syscheck', 'health-check systems', []],
    ['check fighter', 'fighter dump', [['p1', 'p2']]], ['fps', 'current FPS', []], ['time', 'frame count and clock', []], ['version', 'build info', []],
    ['heal', 'restore health', [WHO]], ['kill', 'kill fighters', [WHO]], ['sethp', 'set HP: sethp [who] <n>', [['p1', 'p2', 'player', 'boss', 'all']]],
    ['lives', 'lives <n> [p1|p2|all]', [['1', '3', '99'], ['p1', 'p2', 'all']]], ['revive', 'respawn fighters', [WHO]],
    ['godmode', 'invincible + fly', [WHO, ON]], ['setmap', 'change arena', [A]], ['setweapon', 'setweapon <key> [who]', [W, WHO]],
    ['setclass', 'setclass <key> [who]', [C, WHO]], ['slow', 'slow motion', [ON]], ['pause', 'pause game', [['on', 'off', 'toggle']]],
    ['spawn', 'spawn entity', [['bot', 'dummy', 'minion', 'forestbeast', 'yeti', 'god', 'absoluteaxiom'], W, C]],
    ['summon', 'summon god/axiom', [['god', 'absoluteaxiom']]], ['bots', 'bots reset|kill', [['reset', 'kill']]],
    ['boss phase', 'force boss phase', [['1', '2', '3']]], ['arena list', 'arena keys', []], ['weapon list', 'weapon keys', []],
    ['class list', 'class keys', []], ['story list', 'story chapters', []], ['coins', 'coins show|set|give|take', [['show', 'set', 'give', 'take']]],
    ['unlock', 'unlock trueform|megaknight', [['trueform', 'megaknight']]], ['unlockall', 'unlock everything', []],
    ['unlockallskills', 'unlock all items', []], ['setchapter', 'setchapter <id> (0-based)', []],
    ['startmatch', 'start a match', [['p1vsbot', '2p', 'boss', 'trueform', 'training', 'adaptive', 'sovereign']]],
    ['startboss', 'start a boss fight', [['boss', 'trueform']]], ['studio', 'recording stage', []], ['debug', 'debug overlay', [ON]], ['debugmenu', 'open the debug menu', []],
    ['brain', 'trained brain plays P2', [['on', 'off', 'nav on', 'nav off']]], ['read', 'brain read layer', [ON]], ['sov stats', 'Sovereign stats', []],
    ['sov predict', 'Sovereign predictions', []], ['sov reset', 'reset Sovereign', []], ['tf adapt', 'TrueForm adaptation', []],
    ['tf profile', 'TrueForm player profile', []], ['camtrace', 'camera trace', [['arm', 'start', 'stop', 'mark', 'report']]],
    ['maps analyze', 'analyze all maps', []], ['map analyze', 'analyze one map', [A]], ['pf', 'pathfinding debug', []],
    ['who', 'list accounts', []], ['whoami', 'your identity', []], ['net status', 'network role', []], ['net peers', 'peer roster', []],
    ['server', 'server health', []], ['sync', 'pull bans', []], ['notify', 'notify <message>', []], ['banlist', 'active bans', []],
    ['ban', 'ban <target> [min] [reason]', []], ['tempban', 'tempban <target> <min>', []], ['unban', 'unban <target>', []],
    ['kick', 'kick <target>', []], ['bancheck', 'bancheck <target>', []], ['account info', 'account info <id>', []],
    ['grant unlock', 'grant unlock <type> <accountId>', [['creator', 'trueform', 'sovereign', 'absoluteaxiom', 'god', 'bossrush', 'megaknight', 'damnation']]],
    ['setaccountrole', 'setaccountrole <id> <role>', []], ['reload', 'reload page', []], ['atk', 'attack sandbox', [['help', 'list', 'gui', 'summon', 'all', 'reset']]],
    ['vector', 'AI console mode', []],
  ];
  const _cmdNames = new Set(CMDS.map(c => c[0].split(' ')[0]));

  // ── Command handling ───────────────────────────────────────────────────────
  function _handle(raw) {
    const s = raw.trim();
    const parts = s.split(/\s+/);
    const c0 = parts[0].toLowerCase();
    const a1 = parts[1], a2 = parts[2];

    if (c0 === 'js' || c0 === 'eval' || s.startsWith('=')) {
      if (!_devOnly()) return true;
      _evalAndPrint(s.startsWith('=') ? s.slice(1) : s.slice(parts[0].length));
      return true;
    }
    // Chains: "heal all; super me; speed 0.5"
    if (s.includes(';') && c0 !== 'macro') { _chain(s); return true; }

    switch (c0) {
      case 'debugmenu':
        if (typeof openDebugMenu !== 'function') { _consoleErr('Debug menu not loaded.'); return true; }
        closeGameConsole();
        openDebugMenu();
        return true;
      case 'help': {
        if (a1) return false;
        _origExec(raw);
        _consolePrint('── More (Tab completes commands and JavaScript) ──────────────', '#556688');
        for (const [n, d] of CMDS.slice(0, 22)) _consolePrint(n.padEnd(14) + '— ' + d, '#ffcc66');
        _consolePrint('$me $p1 $p2 $boss $all $enemies $bots $arena, $find(name) $super(p) $heal(p) $tp(p,x,y) $set(p,{…}) $run(cmd), $_ = last result', '#ffcc66');
        _consolePrint('Chain with ;  e.g.  heal all; super me; speed 0.5     Shortcut: =expr is js expr', '#ffcc66');
        return true;
      }
      case 'super': {
        if (!_devOnly() || !_inGame()) return true;
        const t = _who(a1, 'me'); window.$super(t); _consoleOk('Super full: ' + _whoNames(t)); return true;
      }
      case 'infsuper': if (!_devOnly()) return true; X.infSuper = _onOff(a1, X.infSuper); _consoleOk('Infinite super ' + (X.infSuper ? 'ON' : 'OFF')); return true;
      case 'nocd':     if (!_devOnly()) return true; X.noCd = _onOff(a1, X.noCd); _consoleOk('No cooldowns ' + (X.noCd ? 'ON' : 'OFF')); return true;
      case 'aifreeze': if (!_devOnly()) return true; X.aiFreeze = _onOff(a1, X.aiFreeze); _consoleOk('AI freeze ' + (X.aiFreeze ? 'ON' : 'OFF')); return true;
      case 'cd': {
        if (!_devOnly() || !_inGame()) return true;
        const t = _who(a1, 'me'); t.forEach(f => { f.cooldown = 0; f.cooldown2 = 0; f.abilityCooldown = 0; f.abilityCooldown2 = 0; });
        _consoleOk('Cooldowns reset: ' + _whoNames(t)); return true;
      }
      case 'dmg': {
        if (!_devOnly() || !_inGame()) return true;
        const x = parseFloat(a1); if (!(x > 0)) { _consoleErr('Usage: dmg <multiplier> [who]   (1 = normal)'); return true; }
        const t = _who(a2, 'me'); t.forEach(f => { f.dmgMult = x; }); _consoleOk('Damage ×' + x + ': ' + _whoNames(t)); return true;
      }
      case 'hp': {
        if (!_devOnly() || !_inGame()) return true;
        const t = _who(a2, 'me');
        if (!a1) { _consoleErr('Usage: hp <n|max|50%> [who]'); return true; }
        t.forEach(f => {
          const v = a1 === 'max' ? f.maxHealth : a1.endsWith('%') ? f.maxHealth * parseFloat(a1) / 100 : parseFloat(a1);
          if (!isNaN(v)) f.health = Math.max(1, Math.min(f.maxHealth, Math.round(v)));
        });
        _consoleOk('HP set: ' + _whoNames(t)); return true;
      }
      case 'tp': {
        if (!_devOnly() || !_inGame()) return true;
        if (!isNaN(parseFloat(a1)) && !isNaN(parseFloat(a2))) {
          const t = _who(parts[3], 'me'); t.forEach(f => window.$tp(f, parseFloat(a1), parseFloat(a2)));
          _consoleOk('Teleported ' + _whoNames(t)); return true;
        }
        const src = _who(a1, 'me'), dst = _who(a2, 'me')[0];
        if (!dst || !src.length) { _consoleErr('Usage: tp <x> <y> [who]   or   tp <who> <toWho>'); return true; }
        src.forEach((f, i) => { if (f !== dst) window.$tp(f, dst.cx() + (i + 1) * 60 * (dst.facing || 1), dst.y + dst.h); });
        _consoleOk('Moved ' + _whoNames(src) + ' to ' + _label(dst)); return true;
      }
      case 'speed': case 'setspeed': {
        if (!_devOnly()) return true;
        const v = parseFloat(a1); if (!(v > 0 && v <= 1)) { _consoleErr('Usage: speed <0.05–1>   (sticks until speed 1)'); return true; }
        X.speed = v; if (v === 1) slowMotion = 1; _consoleOk('Game speed ' + v + '×'); return true;
      }
      case 'grav': case 'gravity': {
        if (!_devOnly()) return true;
        if (!a1) { _consolePrint('Gravity multiplier: ' + (X.grav === null ? 'arena default' : X.grav), '#88bbff'); return true; }
        if (a1 === 'reset' || a1 === 'off') {
          X.grav = null; for (const [ar, mods] of _gravOrig) ar.modifiers = mods; _gravOrig.clear();
          _consoleOk('Gravity back to arena default'); return true;
        }
        const g = parseFloat(a1); if (!(g >= 0)) { _consoleErr('Usage: grav <multiplier>|reset'); return true; }
        X.grav = g; _consoleOk('Gravity ×' + g); return true;
      }
      case 'noclip': if (!_devOnly()) return true; _consolePrint('noclip never worked — godmode includes flight through floors (jump = up, shield = down).', '#ffaa44'); return true;
      case 'freeze': {
        if (!_devOnly() || !_inGame()) return true;
        X.frozen = _onOff(a1, X.frozen); X.stepUntil = -1; hitStopFrames = X.frozen ? 1e9 : 0;
        _consoleOk(X.frozen ? 'Time frozen — "step N" advances N frames, "freeze off" resumes' : 'Time resumed'); return true;
      }
      case 'step': {
        if (!_devOnly() || !_inGame()) return true;
        const n = Math.max(1, parseInt(a1, 10) || 1);
        X.frozen = true; X.stepUntil = frameCount + n; hitStopFrames = 0; return true;
      }
      case 'inspect': {
        if (!_devOnly() || !_inGame()) return true;
        const t = _who(a1, 'me'); if (!t.length) { _consoleErr('Nobody matches "' + a1 + '"'); return true; }
        for (const f of t) {
          _consoleOk(_fmt(f));
          _consolePrint('  state ' + f.state + '  vx ' + (f.vx || 0).toFixed(1) + ' vy ' + (f.vy || 0).toFixed(1) + '  onGround ' + f.onGround +
            '  stun ' + (f.stunTimer || 0) + '  invincible ' + (f.invincible || 0) + '  dmgMult ' + (f.dmgMult === undefined ? 1 : f.dmgMult) +
            '  cd ' + (f.cooldown || 0) + '/' + (f.abilityCooldown || 0) + '  shielding ' + !!f.shielding, '#aabbdd');
        }
        window.$_ = t.length === 1 ? t[0] : t; return true;
      }
      case 'props': {
        if (!_devOnly()) return true;
        try { const o = _geval(s.slice(parts[0].length)); _consolePrint(_propNames(o).join('  ') || '(none)', '#aabbdd'); }
        catch (e) { _consoleErr(e.message); }
        return true;
      }
      case 'find': {
        if (!a1) { _consoleErr('Usage: find <text>'); return true; }
        const q = a1.toLowerCase();
        const hits = _globalNames().filter(n => n.toLowerCase().includes(q)).slice(0, 80);
        _consolePrint(hits.length ? hits.join('  ') : 'No globals contain "' + a1 + '"', '#aabbdd'); return true;
      }
      case 'watch': {
        if (!_devOnly()) return true;
        if (!a1) { _consolePrint(X.watches.length ? X.watches.map((w, i) => (i + 1) + '. ' + w).join('   ') : 'No watches. watch <expression>', '#aabbdd'); return true; }
        if (a1 === 'clear') { X.watches = []; _drawWatches(); _consoleOk('Watches cleared'); return true; }
        if (a1 === 'del') { X.watches.splice((parseInt(a2, 10) || 0) - 1, 1); _drawWatches(); return true; }
        X.watches.push(s.slice(parts[0].length).trim()); _drawWatches(); _consoleOk('Watching ' + X.watches[X.watches.length - 1]); return true;
      }
      case 'scenario': {
        const sc = SCENARIOS[(a1 || '').toLowerCase()];
        if (!sc) {
          _consolePrint('Scenarios:', '#88bbff');
          for (const k in SCENARIOS) _consolePrint('  ' + k.padEnd(10) + SCENARIOS[k].d, '#aabbdd');
          return true;
        }
        if (!_devOnly()) return true;
        sc.run(a2, parts[3]); return true;
      }
      case 'macro': {
        const m = _macros(), sub = (a1 || 'list').toLowerCase();
        if (sub === 'list') {
          const ks = Object.keys(m);
          if (!ks.length) _consolePrint('No macros. macro save <name> <cmd; cmd; …>', '#aabbdd');
          ks.forEach(k => _consolePrint('  ' + k + ' = ' + m[k], '#aabbdd'));
          return true;
        }
        if (sub === 'save') {
          const body = s.replace(/^\S+\s+\S+\s+\S+\s*/, '').trim();
          if (!a2 || !body) { _consoleErr('Usage: macro save <name> <command; command; …>'); return true; }
          m[a2.toLowerCase()] = body;
          _saveMacros(m) ? _consoleOk('Saved macro "' + a2 + '" — run it with: ' + a2.toLowerCase()) : _consoleErr('Could not save (storage blocked)');
          return true;
        }
        if (sub === 'del') { delete m[(a2 || '').toLowerCase()]; _saveMacros(m); _consoleOk('Deleted ' + a2); return true; }
        if (sub === 'run' && m[(a2 || '').toLowerCase()]) { _chain(m[a2.toLowerCase()]); return true; }
        _consoleErr('Usage: macro save|run|list|del'); return true;
      }
      case 'after': {
        const sec = parseFloat(a1), rest = s.split(/\s+/).slice(2).join(' ');
        if (!(sec >= 0) || !rest) { _consoleErr('Usage: after <seconds> <command>'); return true; }
        setTimeout(() => { _consolePrint('> ' + rest + '  (after ' + sec + 's)', '#ffffff'); _chain(rest); }, sec * 1000);
        _consoleOk('Scheduled in ' + sec + 's'); return true;
      }
      case 'repeat': {
        const n = Math.min(50, parseInt(a1, 10) || 0), rest = s.split(/\s+/).slice(2).join(' ');
        if (!n || !rest) { _consoleErr('Usage: repeat <n> <command>'); return true; }
        for (let i = 0; i < n; i++) _chain(rest);
        return true;
      }
    }
    // A saved macro name typed on its own runs the macro.
    const mac = _macros()[c0];
    if (mac && parts.length === 1 && !_cmdNames.has(c0)) { _chain(mac); return true; }
    // godmode/setweapon/setclass in the original only know p1/p2; route other targets here.
    if ((c0 === 'setweapon' || c0 === 'setclass') && a2 && !/^p?[12]$/i.test(a2)) {
      if (!_inGame()) return true;
      const t = _who(a2);
      for (const f of t) {
        if (c0 === 'setweapon' && WEAPONS[a1]) { f.weapon = WEAPONS[a1]; f.weaponKey = a1; }
        if (c0 === 'setclass' && CLASSES[a1] && typeof applyClass === 'function') applyClass(f, a1);
      }
      _consoleOk(c0.slice(3) + ' ' + a1 + ': ' + _whoNames(t)); return true;
    }
    if (c0 === 'godmode' && a1 && !/^(p?[12]|on|off|all|everyone)$/i.test(a1)) {
      if (!_devOnly() || !_inGame()) return true;
      const on = (a2 || 'on').toLowerCase() !== 'off', t = _who(a1);
      t.forEach(f => { f.godmode = on; f._godmode = on; f.invincible = on ? 999999 : 0; });
      _consoleOk('Godmode ' + (on ? 'ON' : 'OFF') + ': ' + _whoNames(t)); return true;
    }
    return false;
  }

  const _origExec = window._consoleExec;
  window._consoleExec = function(raw) {
    if (raw && _handle(String(raw))) return;
    _origExec(raw);
  };

  // ── Autocomplete ───────────────────────────────────────────────────────────
  const _CURATED = ['players', 'minions', 'trainingDummies', 'gameMode', 'gameRunning', 'currentArena', 'currentArenaKey', 'ARENAS',
    'WEAPONS', 'CLASSES', 'settings', 'slowMotion', 'hitStopFrames', 'frameCount', 'activeCinematic', 'isCinematic', 'paused',
    'debugMode', 'showHitboxes', 'storyModeActive', 'onlineMode', 'camZoomTarget', 'camXCur', 'camYCur', 'screenShake',
    'bossFloorState', 'tfGravityInverted', 'tfControlsInverted', 'GAME_W', 'GAME_H', 'projectiles', 'damageTexts', 'particles',
    'dealDamage', 'applyClass', 'spawnParticles', 'triggerFinisher', 'STORY_CHAPTER_REGISTRY', 'GameState', 'AccountManager'];
  let _fileGlobals = null;
  function _loadFileGlobals() {
    if (_fileGlobals) return;
    _fileGlobals = [];
    if (location.protocol === 'file:') return;
    fetch('tools/audit/globals.json').then(r => r.ok ? r.json() : null)
      .then(j => { if (j && Array.isArray(j.globals)) _fileGlobals = j.globals; }).catch(() => {});
  }
  function _globalNames() {
    const set = new Set([..._CURATED, ...Object.keys(_helpers), '$find', '$super', '$heal', '$tp', '$set', '$run', '$props', '$_']);
    for (const n of _fileGlobals || []) set.add(n);
    for (const k of Object.getOwnPropertyNames(window)) if (/^[A-Za-z_$][\w$]*$/.test(k) && !/^on[a-z]/.test(k) && !/^webkit/i.test(k)) set.add(k);
    return [...set];
  }
  function _propNames(o) {
    if (o === null || o === undefined) return [];
    const seen = new Set(), out = [];
    let cur = typeof o === 'object' || typeof o === 'function' ? o : Object(o);
    while (cur && cur !== Object.prototype && cur !== Function.prototype) {
      for (const k of Object.getOwnPropertyNames(cur)) if (!seen.has(k) && k !== 'constructor' && /^[A-Za-z_$][\w$]*$/.test(k)) { seen.add(k); out.push(k); }
      cur = Object.getPrototypeOf(cur);
    }
    return out;
  }
  function _hint(v) {
    const t = typeof v;
    if (t === 'number') return String(Number.isInteger(v) ? v : Math.round(v * 100) / 100);
    if (t === 'boolean') return String(v);
    if (t === 'string') return JSON.stringify(v.length > 24 ? v.slice(0, 24) + '…' : v);
    if (t === 'function') return 'ƒ';
    if (Array.isArray(v)) return 'Array(' + v.length + ')';
    if (v && t === 'object') return (v.constructor && v.constructor.name) || 'object';
    return t;
  }

  // Returns { items:[{text, hint}], from } where from = index in the input the completion replaces.
  function _suggest(val) {
    const seg0 = val.lastIndexOf(';') + 1;
    const lead = val.slice(seg0).match(/^\s*/)[0].length;
    const segStart = seg0 + lead, seg = val.slice(segStart);
    if (!seg) return null;
    const js = seg.match(/^(?:js|eval)\s+|^=/i);
    if (js) {
      const code = seg.slice(js[0].length);
      const tail = code.match(/[\w$.\[\]]*$/)[0];
      const dot = tail.lastIndexOf('.');
      const partial = dot >= 0 ? tail.slice(dot + 1) : tail;
      if (!/^[\w$]*$/.test(partial)) return null;
      const from = val.length - partial.length;
      if (dot >= 0) {
        const base = tail.slice(0, dot);
        // Only plain property chains are evaluated, so completing never calls a function.
        if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[\d+\])*$/.test(base)) return null;
        let obj; try { obj = _geval(base); } catch (e) { return null; }
        // Internal _names sink below the public ones unless the user typed the underscore.
        const names = _propNames(obj).filter(n => n.startsWith(partial)).sort((a, b) => (a[0] === '_') - (b[0] === '_') || a.localeCompare(b));
        return { from, items: names.slice(0, 60).map(n => { let v; try { v = obj[n]; } catch (e) {} return { text: n, hint: _hint(v) }; }) };
      }
      if (!partial) return null;
      _loadFileGlobals();
      const names = _globalNames().filter(n => n.startsWith(partial)).sort((a, b) => a.length - b.length || a.localeCompare(b));
      return { from, items: names.slice(0, 60).map(n => { let v; try { v = _geval(n); } catch (e) {} return { text: n, hint: _hint(v) }; }) };
    }
    const lower = seg.toLowerCase();
    const toks = seg.split(/\s+/);
    // Whole-command matches (handles two-word commands like "boss phase").
    if (!/\s$/.test(seg) || toks.length <= 1) {
      const cmdHits = CMDS.filter(c => c[0].startsWith(lower) && c[0] !== lower);
      if (toks.length <= 2 && cmdHits.length) return { from: segStart, items: cmdHits.map(c => ({ text: c[0], hint: c[1] })) };
    }
    // Argument completion.
    const spec = CMDS.slice().sort((a, b) => b[0].length - a[0].length).find(c => lower.startsWith(c[0] + ' '));
    if (!spec) return null;
    const argText = seg.slice(spec[0].length + 1);
    const args = argText.split(/\s+/);
    const idx = args.length - 1, partial = args[idx] || '';
    let src = spec[2][idx];
    if (spec[0] === 'macro' && idx === 1 && args[0] === 'save') src = null;
    if (!src) return null;
    const list = (typeof src === 'function' ? src() : src).filter(o => o.toLowerCase().startsWith(partial.toLowerCase()) && o !== partial);
    return list.length ? { from: val.length - partial.length, items: list.slice(0, 60).map(o => ({ text: o, hint: '' })) } : null;
  }

  let _ac = null, _acItems = [], _acIdx = -1, _acFrom = 0;
  function _acBox() {
    if (_ac) return _ac;
    const ov = document.getElementById('gameConsoleOverlay');
    if (!ov) return null;
    _ac = document.createElement('div');
    _ac.style.cssText = 'position:absolute;left:28px;bottom:34px;min-width:260px;max-width:70vw;max-height:190px;overflow-y:auto;display:none;' +
      'background:rgba(14,16,34,0.98);border:1px solid #3366ff;border-radius:6px;font:12px "Courier New",monospace;z-index:2;box-shadow:0 -4px 16px rgba(0,0,0,.5)';
    ov.appendChild(_ac);
    _ac.addEventListener('mousedown', e => {
      const row = e.target.closest('[data-i]');
      if (row) { e.preventDefault(); _acIdx = +row.dataset.i; _acAccept(); }
    });
    return _ac;
  }
  function _acRender() {
    const box = _acBox(); if (!box) return;
    if (!_acItems.length) { box.style.display = 'none'; return; }
    const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    box.innerHTML = _acItems.map((it, i) =>
      '<div data-i="' + i + '" style="padding:2px 8px;cursor:pointer;display:flex;gap:14px;justify-content:space-between;' +
      (i === _acIdx ? 'background:#23306a;color:#fff' : 'color:#cfe') + '"><span>' + esc(it.text) + '</span>' +
      '<span style="color:#7f8bb5">' + esc(it.hint || '') + '</span></div>').join('');
    box.style.display = 'block';
    const sel = box.children[_acIdx]; if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
  function _acUpdate() {
    if (!consoleUnlocked) { _acItems = []; _acRender(); return; }   // no suggestions off a password
    const inp = document.getElementById('gameConsoleInput'); if (!inp) return;
    if (inp.selectionStart !== inp.value.length) { _acItems = []; _acRender(); return; }
    let r = null; try { r = _suggest(inp.value); } catch (e) {}
    _acItems = r ? r.items : []; _acFrom = r ? r.from : 0; _acIdx = -1;
    _acRender();
  }
  function _acAccept() {
    const inp = document.getElementById('gameConsoleInput'); if (!inp || !_acItems.length) return;
    const it = _acItems[Math.max(0, _acIdx)];
    const isJs = /(?:^|;)\s*(?:js|eval)\s|(?:^|;)\s*=/i.test(inp.value);
    inp.value = inp.value.slice(0, _acFrom) + it.text + (isJs ? '' : ' ');
    inp.setSelectionRange(inp.value.length, inp.value.length);
    _acUpdate();
  }

  let _acWired = false;
  function _acWire() {
    if (_acWired) return;
    const inp = document.getElementById('gameConsoleInput'); if (!inp) return;
    _acWired = true;
    _loadFileGlobals();
    inp.addEventListener('input', _acUpdate);
    inp.addEventListener('blur', () => setTimeout(() => { _acItems = []; _acRender(); }, 120));
    // Capture on document runs before the input's own history handler and the global Enter handler.
    document.addEventListener('keydown', e => {
      if (e.target !== inp) return;
      const open = _acItems.length > 0;
      const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
      if (e.key === 'Tab') {
        stop();
        if (!open) _acUpdate();
        if (_acItems.length) _acAccept();
      } else if (open && e.key === 'ArrowDown') { stop(); _acIdx = (_acIdx + 1) % _acItems.length; _acRender(); }
      else if (open && e.key === 'ArrowUp') { stop(); _acIdx = _acIdx <= 0 ? _acItems.length - 1 : _acIdx - 1; _acRender(); }
      else if (open && e.key === 'Enter' && _acIdx >= 0) { stop(); _acAccept(); }
      else if (open && e.key === 'Escape') { stop(); _acItems = []; _acRender(); }
      else if (e.key === 'Enter') { _acItems = []; _acRender(); }
    }, true);
  }
  const _origOpen = window.openGameConsole;
  window.openGameConsole = function() {
    _origOpen.apply(this, arguments);
    _acWire();
    const inp = document.getElementById('gameConsoleInput');
    if (!inp) return;
    // While locked the box takes the password, so it is masked like any password field.
    inp.type = consoleUnlocked ? 'text' : 'password';
    inp.placeholder = consoleUnlocked ? 'type a command… Tab completes · HELP for list · =expr runs JavaScript' : 'password';
  };
})();
