// ESLint flat config. Dev-tooling only — nothing here is loaded by the browser,
// so the "no ES modules" rule in CLAUDE.md does not apply to this file.
//
// The point of this config is `no-undef` over js/. The game is globals-based
// with ordered <script> tags, so a typo'd or not-yet-loaded global is silent at
// parse time and only explodes at runtime. tools/audit/globals.json lists every
// name legitimately declared at the top level of a loaded file; anything else a
// js/ file references is a real bug.
//
// Regenerate the globals list after adding a file or a new top-level name:
//   node tools/audit/gen-globals.js

import js from '@eslint/js';
import globals from 'globals';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const gameGlobals = require('./tools/audit/globals.json').globals;

// Every game global is writable: files routinely reassign state declared
// elsewhere (slowMotion, gameRunning, activeCinematic, ...).
const gameGlobalMap = Object.fromEntries(gameGlobals.map((n) => [n, 'writable']));

// Loaded from CDN in index.html, so they exist at runtime but are declared
// nowhere in js/.
const vendorGlobals = {
  gsap: 'readonly',
  Peer: 'readonly',
  CrazyGames: 'readonly',
  supabase: 'readonly',
  // YouTube IFrame API, injected asynchronously and used by smb-audio.js.
  YT: 'readonly',
};

export default [
  {
    ignores: [
      'node_modules/**',
      'data.db',
      'replays/**',
      'tools/tour/frames/**',
      // Separate sibling games — not part of this build.
      'axiom-prequel/**',
      'stickman-roblox/**',
      'Stickman-Battles-3d/**',
    ],
  },

  // ---- The game itself: plain scripts sharing one global scope ----
  {
    files: ['js/**/*.js'],
    // Stale eslint-disable comments are worth knowing about but must not fail
    // the build over a comment.
    linterOptions: { reportUnusedDisableDirectives: 'warn' },
    languageOptions: {
      ecmaVersion: 2022,
      // 'script' (not 'module') is load-bearing: it makes any stray
      // import/export a parse error, which is the CLAUDE.md failure that
      // silences every file loaded afterwards.
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...vendorGlobals,
        ...gameGlobalMap,
      },
    },
    rules: {
      ...js.configs.recommended.rules,

      // The rule this whole setup exists for.
      'no-undef': 'error',

      // Catches a name declared twice inside one file. builtinGlobals must be
      // false: every game global is listed in this config, so with it on, the
      // file that actually declares a global is reported for "redeclaring" it
      // (~2350 false positives). Cross-file collisions are a separate problem
      // no per-file linter can see — tools/audit/gen-globals.js reports those.
      'no-redeclare': ['error', { builtinGlobals: false }],

      // High-signal correctness rules that catch real bugs in long files.
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-dupe-else-if': 'error',
      'no-unreachable': 'error',
      'no-const-assign': 'error',
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-unsafe-negation': 'error',
      'no-compare-neg-zero': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-sparse-arrays': 'error',
      'no-cond-assign': ['error', 'except-parens'],

      // Deliberately relaxed for a large legacy codebase. These are style or
      // low-severity findings; leaving them as errors would bury no-undef.
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'no-prototype-builtins': 'off',
      'no-useless-escape': 'off',
      'no-control-regex': 'off',
      'no-fallthrough': 'off',
      'no-inner-declarations': 'off',
    },
  },

  // ---- Server + dev tooling: Node, CommonJS ----
  // tools/ scripts drive the game through puppeteer, so the bodies of their
  // page.evaluate() callbacks are browser code referencing game globals even
  // though the file itself is Node. Both sets have to be in scope or every
  // such callback is a wall of false no-undef.
  {
    files: ['server.js', 'storage.js', 'tools/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.browser,
        ...vendorGlobals,
        ...gameGlobalMap,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'no-redeclare': ['error', { builtinGlobals: false }],
    },
  },
];
