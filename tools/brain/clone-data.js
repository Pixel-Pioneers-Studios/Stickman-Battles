'use strict';
/*
 * tools/brain/clone-data.js — the user's replays as (observation, action) pairs. DEV ONLY.
 *
 * For tools/brain/clone_train.py, which fits a brain-format net to them (behavior cloning):
 * an opponent that plays like the user, Q/E/shield included, for train.js --hunters.
 *
 * Each replay sample (every 3 frames = one brain decision) is put back onto two real
 * Fighter objects in a game page and run through Brain.observe(), so the clone sees
 * exactly what the brain sees. Fields the replay does not store are inferred:
 * canDoubleJump from jumps, swing cooldown from swing starts, ability cooldown from
 * the recorded Q presses, superReady from the meter. Projectiles, domains, clash and
 * parry windows read as zero.
 *
 * Labels come from the per-frame input track (smb-replay.js _recordInputs): move and
 * jump/shield from the keys held at the decision, the button from any attack /
 * ability / super press in its 3 frames (super > ability > attack).
 *
 * Only replays with an input track for a human P1 are used.
 *
 * Usage: node tools/brain/clone-data.js [--out=data/brain-clone/data.json] [replay ...]
 *        (no replays given: every *.smbreplay in the repo root and replays/)
 */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return [m[1], m[2] === undefined ? true : m[2]];
}));
const ROOT = path.resolve(__dirname, '..', '..'), PORT = parseInt(args.port, 10) || 8197;
const OUT = path.resolve(ROOT, args.out || 'data/brain-clone/data.json');

let files = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!files.length) {
  for (const d of [ROOT, path.join(ROOT, 'replays')])
    for (const f of fs.readdirSync(d)) if (f.endsWith('.smbreplay')) files.push(path.join(d, f));
}
const reps = [];
for (const f of files) {
  const r = JSON.parse(fs.readFileSync(f, 'utf8'));
  const inp = r.inputs && r.inputs[0];
  const p0 = r.meta && r.meta.players && r.meta.players[0];
  if (!inp || !inp.length || !p0 || p0.ai || (r.meta.players || []).length !== 2) continue;
  reps.push({ name: path.basename(f), frames: r.frames, inputs: inp });
}
console.log(`${reps.length} replays with a human input track`);

(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
    fs.createReadStream(fp).pipe(r);
  }).listen(PORT);
  const browser = await puppeteer.launch({ headless: 'new', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--mute-audio', '--disable-gpu'], timeout: 180000, protocolTimeout: 3600000 });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', q => { const u = q.url(); (u.startsWith('http://localhost') || u.startsWith('data:')) ? q.continue() : q.abort(); });
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 180000 });
    await new Promise(r => setTimeout(r, 2500));
    await page.evaluate(() => { try { backToHome(); } catch (e) {} });

    const out = { OBS_DIM: 0, HEADS: null, episodes: [] };
    for (const rep of reps) {
      const ep = await page.evaluate(rep => {
        const IN_L = 1, IN_R = 2, IN_J = 4, IN_SH = 8, IN_ATK = 32, IN_ABI = 64, IN_SUP = 128;
        const F = rep.frames, inp = rep.inputs;
        // Held mask at frame fc, and every press in [fc, fc + 3).
        let k = 0;
        const maskAt = fc => { while (k + 1 < inp.length && inp[k + 1][0] <= fc) k++; return inp[k][0] <= fc ? inp[k][1] : 0; };
        const pressIn = (a, b) => { let m = 0; for (const [fc, mk] of inp) { if (fc >= b) break; if (fc >= a) m |= mk & (IN_ATK | IN_ABI | IN_SUP); } return m; };

        const saved = { players: players.slice(), proj: typeof projectiles !== 'undefined' ? projectiles.slice() : null, fc: frameCount };
        const first = F.find(Boolean);
        const mk = s => {
          const f = new Fighter(s.x, s.y, s.col || '#fff', s.wk || 'sword', null, false);
          if (s.cls && s.cls !== 'none' && typeof applyClass === 'function') { try { applyClass(f, s.cls); } catch (e) {} }
          f.weaponKey = s.wk; f.weapon = WEAPONS[s.wk] || f.weapon;
          return f;
        };
        const me = mk(first[0]), opp = mk(first[1]);
        players.length = 0; players.push(me, opp);
        if (typeof projectiles !== 'undefined') projectiles.length = 0;
        const track = [{ cd: 0, abiCd: 0, atk0: -99, dj: false }, { cd: 0, abiCd: 0, atk0: -99, dj: false }];
        const put = (f, s, t, prev, i, abiPress) => {
          const W = f.weapon || {};
          f.x = s.x; f.y = s.y; f.vx = s.vx; f.vy = s.vy; f.facing = s.f;
          f.health = s.hp; f.maxHealth = s.mhp; f.lives = s.lives;
          f.onGround = !!s.g; f.shielding = !!s.sh; f.shieldHP = s.sh ? 50 : 0; f.shieldStacks = s.sh ? 1 : 0;
          f.stunTimer = s.stn; f.ragdollTimer = s.rag; f.invincible = s.inv; f.attackEndlag = s.el;
          f.superMeter = s.sm; f.superReady = s.sm >= 100;
          // Swing start: cooldown and a decaying attack timer.
          if (s.atk && !(prev && prev.atk)) { t.atk0 = i; t.cd = W.cooldown || 30; }
          f.attackTimer = s.atk ? Math.max(1, 12 - (i - t.atk0) * 3) : 0;
          f.cooldown = t.cd; t.cd = Math.max(0, t.cd - 3);
          if (abiPress && t.abiCd === 0) t.abiCd = W.abilityCooldown || 240;
          f.abilityCooldown = t.abiCd; t.abiCd = Math.max(0, t.abiCd - 3);
          // Double jump: armed by a ground jump, spent by a second rise in the air.
          if (s.g) t.dj = false;
          else if (prev && prev.g && s.vy < -8) t.dj = true;
          else if (prev && !prev.g && s.vy < -10 && prev.vy > -6) t.dj = false;
          f.canDoubleJump = t.dj;
          f._landLag = 0; f._parryVulnFrames = 0; f._clashCd = 0; f.shieldBroken = false;
        };
        const obsAll = [], acts = [];
        const prevAct = [1, 0, 0, 0];
        const ob = new Float32Array(Brain.OBS_DIM);
        let prev = null, skipped = 0;
        for (let i = 1; i < F.length; i++) {
          const fr = F[i];
          if (!fr || !fr[0] || !fr[1]) { prev = null; continue; }
          const fc = i * 3;
          const held = maskAt(fc + 1), press = pressIn(fc, fc + 3);
          put(me, fr[0], track[0], prev && prev[0], i, !!(press & IN_ABI));
          put(opp, fr[1], track[1], prev && prev[1], i, false);
          prev = fr;
          // Dead or respawning: no decision to learn.
          if (fr[0].hp <= 0 || fr[1].hp <= 0) { skipped++; continue; }
          frameCount = fc;
          Brain.observe(me, opp, prevAct, ob);
          const L = !!(held & IN_L), R = !!(held & IN_R);
          const a = [L && !R ? 0 : R && !L ? 2 : 1, held & IN_J ? 1 : 0, held & IN_SH ? 1 : 0,
                     press & IN_SUP ? 3 : press & IN_ABI ? 2 : press & IN_ATK ? 1 : 0];
          for (let q = 0; q < ob.length; q++) obsAll.push(ob[q]);
          acts.push(...a);
          for (let q = 0; q < 4; q++) prevAct[q] = a[q];
        }
        players.length = 0; players.push(...saved.players);
        if (saved.proj) { projectiles.length = 0; projectiles.push(...saved.proj); }
        frameCount = saved.fc;
        const b = new Uint8Array(new Float32Array(obsAll).buffer);
        let s = ''; for (let q = 0; q < b.length; q += 0x8000) s += String.fromCharCode.apply(null, b.subarray(q, q + 0x8000));
        return { n: acts.length / 4, obs: btoa(s), acts, skipped, OBS_DIM: Brain.OBS_DIM, HEADS: Brain.HEADS };
      }, rep);
      out.OBS_DIM = ep.OBS_DIM; out.HEADS = ep.HEADS;
      out.episodes.push({ name: rep.name, n: ep.n, obs: ep.obs, acts: ep.acts });
      const A = ep.acts, n = ep.n, c = (h, v) => { let m = 0; for (let q = 0; q < n; q++) if (A[q * 4 + h] === v) m++; return m; };
      console.log(`${rep.name.padEnd(48)} ${String(n).padStart(6)} decisions (${ep.skipped} skipped)  move L/-/R ${c(0, 0)}/${c(0, 1)}/${c(0, 2)}  jump ${c(1, 1)}  shield ${c(2, 1)}  atk/abi/sup ${c(3, 1)}/${c(3, 2)}/${c(3, 3)}`);
    }
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(out));
    console.log(`wrote ${path.relative(ROOT, OUT)}: ${out.episodes.reduce((a, e) => a + e.n, 0)} decisions, OBS_DIM ${out.OBS_DIM}`);
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
