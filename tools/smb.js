#!/usr/bin/env node
'use strict';
// tools/smb.js — one front door for the repo's dev tools.
//
//   node tools/smb.js                 # list everything
//   node tools/smb.js <command> [args]
//   npm run smb -- <command> [args]
//
// Add a shell alias to call it from anywhere:
//   alias smb="node ~/Developer/Personal/Stickman-Battles/tools/smb.js"

const { spawnSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// [command, how to run it, description, group]
const CMDS = [
  ['serve',      ['bash', 'tools/dev/serve.sh'],          'Start the game locally and open it (--static, --no-open)', 'Everyday'],
  ['preflight',  ['bash', 'tools/dev/preflight.sh'],      'All pre-ship checks: syntax, audit, spoilers, ?v= tags', 'Everyday'],
  ['bump',       ['node', 'tools/dev/bump-version.js'],   'Bump ?v= tags for changed files (--all, --to X, --dry-run)', 'Everyday'],
  ['chapter',    ['node', 'tools/dev/chapter.js'],        'Find a story chapter by number (1-based) or title', 'Everyday'],
  ['where',      ['node', 'tools/dev/where.js'],          'Where a global is defined + load-order risks (--refs)', 'Everyday'],
  ['owner',      ['node', 'tools/dev/owner-check.js'],    'Owner/admin/dev power config check (--live)', 'Everyday'],
  ['spoilers',   ['node', 'tools/dev/changelog-lint.js'], 'Changelog spoiler-gate lint (--latest)', 'Everyday'],
  ['disk',       ['bash', 'tools/dev/disk-report.sh'],    'Where disk space is going (read-only)', 'Everyday'],

  ['check',      ['npm', 'run', 'check'],                 'Syntax + audit + eslint (the CI gate)', 'Existing checks'],
  ['audit',      ['node', 'tools/audit/check.js'],        'Invariant audit (dealDamage, load order, story ids…)', 'Existing checks'],
  ['whatsnew',   ['node', 'tools/whatsnew/gen.js'],       'Regenerate the F6 "test the latest update" panel', 'Existing checks'],
  ['flash',      ['node', 'tools/flash-audit.js'],        'Which code whites out the screen, and how often', 'Existing checks'],

  ['levels',     ['node', 'tools/level-tester.js'],       'Sovereign plays every story chapter headless', 'Headless testing'],
  ['capture',    ['node', 'tools/headless-capture.js'],   'Real-boot headless screenshot capture', 'Headless testing'],
  ['camera',     ['node', 'tools/camera-stress.js'],      'Camera containment stress test', 'Headless testing'],
  ['figure',     ['node', 'tools/figure-sheet.js'],       'Player-figure inspection sheet', 'Headless testing'],
  ['moves',      ['node', 'tools/move-scene-sheet.js'],   'Move-scene contact sheets + probe', 'Headless testing'],
  ['br',         ['node', 'tools/br-watch.js'],           'Watch a real Battle Royale and log bot behaviour', 'Headless testing'],

  ['balance',    ['node', 'tools/class-balance.js'],      'Class-vs-class win-rate matrix', 'Balance'],
  ['weapons',    ['node', 'tools/weapon-tune.js'],        'Melee weapon balance tuner', 'Balance'],
  ['botduel',    ['node', 'tools/bot-duel.js'],           'How a stock bot holds up against a human proxy', 'Balance'],

  ['zip',        ['bash', 'tools/package/build-school.sh'],     'Build the school zip (dist/stickman-evolution.zip)', 'Shipping'],
  ['crazygames', ['bash', 'tools/package/build-crazygames.sh'], 'Build the CrazyGames upload', 'Shipping'],
  ['itch',       ['bash', 'tools/package/deploy-itch.sh'],      'Push a build to itch.io with butler', 'Shipping'],
];

const [cmd, ...rest] = process.argv.slice(2);
const entry = CMDS.find(c => c[0] === cmd);

if (!entry) {
  if (cmd && cmd !== 'help') console.log(`Unknown command "${cmd}".\n`);
  let group = '';
  for (const [name, run, desc, g] of CMDS) {
    if (!fs.existsSync(path.join(ROOT, run[run.length - 1])) && run[0] !== 'npm') continue;
    if (g !== group) { group = g; console.log(`\n${g}`); }
    console.log(`  ${name.padEnd(11)} ${desc}`);
  }
  console.log('\nusage: node tools/smb.js <command> [args]');
  process.exit(cmd && cmd !== 'help' ? 1 : 0);
}

const [bin, ...args] = entry[1];
const r = spawnSync(bin, [...args, ...rest], { cwd: ROOT, stdio: 'inherit' });
process.exit(r.status == null ? 1 : r.status);
