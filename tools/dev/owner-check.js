#!/usr/bin/env node
'use strict';
// tools/dev/owner-check.js — what grants owner powers, and do the lists agree?
//
//   node tools/dev/owner-check.js
//   node tools/dev/owner-check.js --live    # also ask the deployed server if it's up
//
// Two tiers exist:
//   admin — admin panel (F9), bans, kicks, admin console. Granted by ADMIN_IDS, server
//           overrides, OR being signed in to the cloud with an email in ADMIN_EMAILS.
//   dev   — GODMODE, NOCLIP, SPAWN, UNLOCKALL, SETCHAPTER, AI mode, etc. Granted ONLY by
//           SUPERUSER_ACCOUNT_IDS or role:'dev' on the local account. Account IDs are
//           random per browser, so a new computer does not get dev from the cloud login.
// Never prints key values.

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = f => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { return ''; } };
const arr  = (src, name) => {
  const m = src.match(new RegExp(`const ${name}\\s*=\\s*\\[([^\\]]*)\\]`));
  return m ? [...m[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map(x => x[1] || x[2]) : null;
};
const envFile = f => Object.fromEntries(read(f).split('\n')
  .map(l => l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m => [m[1], m[2].replace(/^['"]|['"]$/g, '')]));

const adminCore = read('js/smb-admin-core.js');
const accounts  = read('js/smb-accounts.js');
const server    = read('server.js');
const globals   = read('js/smb-globals.js');

const adminIds  = arr(adminCore, 'ADMIN_IDS') || [];
const superIds  = arr(accounts, 'SUPERUSER_ACCOUNT_IDS') || [];
const clientEm  = (arr(adminCore, 'ADMIN_EMAILS') || []).map(s => s.toLowerCase());
const serverDef = ((server.match(/process\.env\.ADMIN_EMAILS \|\| '([^']*)'/) || [])[1] || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const env       = Object.assign({}, envFile('SMB.env'), envFile('.env'));
const serverEm  = env.ADMIN_EMAILS ? env.ADMIN_EMAILS.split(',').map(s => s.trim().toLowerCase()) : serverDef;
const serverUrl = (globals.match(/url:\s*'([^']+)'/) || [])[1];

let problems = 0;
const ok   = m => console.log('  ok    ' + m);
const warn = m => { problems++; console.log('  WARN  ' + m); };

console.log('Account IDs');
console.log('  admin (ADMIN_IDS):            ' + adminIds.join(', '));
console.log('  dev   (SUPERUSER_ACCOUNT_IDS): ' + superIds.join(', '));
const onlyA = adminIds.filter(x => !superIds.includes(x)), onlyS = superIds.filter(x => !adminIds.includes(x));
if (onlyA.length || onlyS.length) warn(`lists differ — admin-only: [${onlyA}] dev-only: [${onlyS}]`);
else ok('admin and dev ID lists match');

console.log('\nOwner emails');
console.log('  client ADMIN_EMAILS (smb-admin-core.js): ' + clientEm.join(', '));
console.log('  server ADMIN_EMAILS (' + (env.ADMIN_EMAILS ? 'local env file' : 'server.js default') + '): ' + serverEm.join(', '));
const miss = clientEm.filter(e => !serverEm.includes(e));
if (miss.length) warn(`server would refuse admin sessions for: ${miss.join(', ')}`);
else ok('every client owner email is accepted by the server');
console.log('  The deployed Render server uses ITS env var, which this tool cannot see.');

console.log('\nSigning in on another computer');
console.log('  admin powers: YES, if you sign in with Google or email/password as ' + (clientEm[0] || '<owner email>'));
console.log('                NO with a plain username login (that maps to <name>@players.stickmanevolution.net)');
const devViaEmail = /isSuperuserAccountId[\s\S]{0,400}ADMIN_EMAILS|ADMIN_EMAILS[\s\S]{0,400}role\s*=\s*'dev'/.test(accounts + adminCore);
if (devViaEmail) ok('dev powers follow the owner email');
else warn('dev powers (GODMODE, NOCLIP, SPAWN, UNLOCKALL, SETCHAPTER, AI mode…) are tied to the 3 local account IDs only — a new computer won\'t have them');

if (process.argv.includes('--live') && serverUrl) {
  console.log('\nLive server ' + serverUrl);
  fetch(serverUrl.replace(/\/$/, '') + '/healthz', { signal: AbortSignal.timeout(20000) })
    .then(r => r.text().then(t => console.log(`  /healthz -> ${r.status} ${t.slice(0, 160)}`)))
    .catch(e => console.log('  unreachable: ' + e.message + ' (Render free tier can take ~30s to wake)'))
    .finally(() => process.exit(problems ? 1 : 0));
} else {
  process.exitCode = problems ? 1 : 0;
}
