#!/usr/bin/env node
// tools/yt-upload.js: upload one video to YouTube Studio through the signed-in Chrome yt-check.js uses
// (profile ~/.agent-chrome-profile-studio, port 9333). The YouTube API is not set up for this channel.
//
//   node tools/yt-upload.js --file=x.mp4 --meta=meta.json --key=long [--thumb=t.jpg] [--related=<videoId>]
//        [--publish] [--schedule="Oct 21, 2026|4:00 PM"] [--shots=<dir>]
// --schedule sets Visibility > Schedule (channel's time zone) instead of Public; --publish then clicks Schedule.
// --related (Shorts) is applied after publishing, on the video's edit page.
//
// meta.json: { <key>: { title, desc, tags[] } }. Without --publish it stops on the Visibility step and
// leaves the dialog open (draft saved). Studio's page.click() hangs, so clicks go through el.click()
// and text fields are set with execCommand('insertText'). A screenshot is written after each step.
const fs = require('fs'), path = require('path');
const puppeteer = require(path.join(__dirname, '..', 'node_modules', 'puppeteer-core'));

const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').slice(k.length + 3) || null;
const FILE = arg('file'), META = arg('meta'), KEY = arg('key'), THUMB = arg('thumb'), RELATED = arg('related');
const PUBLISH = process.argv.includes('--publish'), SHOTS = arg('shots') || '/tmp';
const SCHEDULE = arg('schedule');   // "Oct 21, 2026|4:00 PM"
const sleep = ms => new Promise(r => setTimeout(r, ms));
let shotN = 0;

async function waitFor(p, sel, ms = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await p.evaluate(s => !!document.querySelector(s), sel)) return true;
    await sleep(500);
  }
  throw new Error('timeout waiting for ' + sel);
}
const clickSel = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel);
const clickText = (p, sel, re) => p.evaluate((s, r) => {
  const e = [...document.querySelectorAll(s)].find(x => new RegExp(r).test((x.innerText || x.textContent || '').trim()));
  if (!e) return false; e.click(); return true;
}, sel, re);
async function setText(p, sel, text) {
  await p.evaluate((s, t) => {
    // selectAll can select the whole page instead of the textbox; select its contents with a Range.
    const e = document.querySelector(s); e.focus();
    const r = document.createRange(); r.selectNodeContents(e);
    const g = getSelection(); g.removeAllRanges(); g.addRange(r);
    document.execCommand('insertText', false, t);
  }, sel, text);
  await sleep(400);
  const got = await p.evaluate(s => document.querySelector(s).innerText.trim(), sel);
  if (got !== text.trim()) throw new Error(`text not set in ${sel}: "${got.slice(0, 60)}"`);
}
async function shot(p, name) {
  const f = path.join(SHOTS, `${String(++shotN).padStart(2, '0')}-${name}.png`);
  await p.screenshot({ path: f }); console.log('shot', f);
}

(async () => {
  if (!FILE || !META || !KEY) throw new Error('need --file --meta --key');
  const meta = JSON.parse(fs.readFileSync(META, 'utf8'))[KEY];
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9333', defaultViewport: null });
  const p = await b.newPage();
  await p.setViewport({ width: 1400, height: 950 });
  await p.goto('https://studio.youtube.com/', { waitUntil: 'domcontentloaded' }); await sleep(4000);
  const ch = (p.url().match(/\/channel\/(UC[\w-]+)/) || [])[1];
  if (!ch) throw new Error('not signed in to Studio');
  await p.goto(`https://studio.youtube.com/channel/${ch}/videos/upload?d=ud`, { waitUntil: 'domcontentloaded' });
  await waitFor(p, 'input[type=file]');
  await (await p.$('input[type=file]')).uploadFile(path.resolve(FILE));
  console.log('uploading', FILE);

  // ── Details ──
  await waitFor(p, '#title-textarea #textbox', 120000); await sleep(2500);
  await setText(p, '#title-textarea #textbox', meta.title);
  await setText(p, '#description-textarea #textbox', meta.desc);
  if (THUMB) {
    const inp = await p.$('input#file-loader');
    if (inp) { await inp.uploadFile(path.resolve(THUMB)); await sleep(4000); console.log('thumbnail set'); }
    else console.log('no thumbnail input (channel may not allow custom thumbnails)');
  }
  await clickSel(p, 'tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]');
  await shot(p, 'details');
  await clickSel(p, '#toggle-button'); await sleep(1500);   // Show more
  await clickSel(p, 'tp-yt-paper-radio-button[name="VIDEO_HAS_ALTERED_CONTENT_NO"]');
  if (meta.tags && meta.tags.length) {
    const ok = await p.evaluate(() => { const i = document.querySelector('#tags-container input, ytcp-form-input-container#tags-container input, #text-input[aria-label*="Tags" i]'); if (!i) return false; i.focus(); return true; });
    if (ok) { await p.keyboard.type(meta.tags.join(',') + ',', { delay: 5 }); await sleep(500); } else console.log('tags field not found');
  }
  await shot(p, 'more');

  // ── Next × 3 → Visibility ──
  for (let i = 0; i < 3; i++) { await clickSel(p, '#next-button'); await sleep(2500); }
  await shot(p, 'checks');
  await waitFor(p, 'tp-yt-paper-radio-button[name="PUBLIC"]');
  if (SCHEDULE) {
    const [day, time] = SCHEDULE.split('|');
    await clickSel(p, '#second-container-expand-button'); await sleep(1500);
    await clickSel(p, '#datepicker-trigger'); await sleep(1500);
    const dOk = await p.evaluate(d => {
      const i = document.querySelector('ytcp-date-picker tp-yt-paper-input input, ytcp-date-picker input');
      if (!i) return false; i.focus(); i.value = ''; i.select(); document.execCommand('insertText', false, d);
      i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true })); return true;
    }, day);
    await sleep(1500);
    const tOk = await p.evaluate(t => {
      const i = document.querySelector('#time-of-day-container input, #time-of-day-trigger input');
      if (!i) return false; i.focus(); i.select(); document.execCommand('insertText', false, t);
      i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true })); i.blur(); return true;
    }, time);
    await sleep(1500);
    const shown = await p.evaluate(() => {
      const d = document.querySelector('#datepicker-trigger'), t = document.querySelector('#time-of-day-container input, #time-of-day-trigger input');
      return ((d && d.innerText) || '').trim() + ' | ' + ((t && t.value) || '');
    });
    console.log('schedule', dOk, tOk, 'shown:', shown);
    const nz = x => x.replace(/[\s  ]+/g, ' ');
    if (!nz(shown).includes(nz(day)) || !nz(shown).includes(nz(time))) {
      await shot(p, 'schedule-wrong'); console.log('schedule fields wrong; stopped before publish (draft kept)'); b.disconnect(); return;
    }
  } else {
    await clickSel(p, 'tp-yt-paper-radio-button[name="PUBLIC"]'); await sleep(1000);
  }
  const link = await p.evaluate(() => { const a = document.querySelector('a[href*="youtu.be/"], a[href*="youtube.com/shorts/"]'); return a && a.href; });
  console.log('link', link);
  await shot(p, 'visibility');
  if (!PUBLISH) { console.log('stopped before publish (draft kept)'); b.disconnect(); return; }

  // Wait for the upload itself to finish before Publish (Studio keeps uploading after the dialog closes,
  // but closing early can lose it if the tab is closed).
  for (let i = 0; i < 360; i++) {
    const t = await p.evaluate(() => (document.querySelector('ytcp-video-upload-progress, .progress-label') || {}).innerText || '');
    if (!/Uploading/i.test(t)) break;
    if (i % 10 === 0) console.log('  ', t.replace(/\s+/g, ' ').slice(0, 80));
    await sleep(5000);
  }
  // Publish only after Studio's checks finish clean ("Publish anyway" on an early click means they're still running).
  let checks = '';
  for (let i = 0; i < 120; i++) {
    checks = await p.evaluate(() => { const m = document.body.innerText.match(/Checks complete[^\n]*|Copyright[^\n]*found[^\n]*|Checking[^\n]*/i); return m ? m[0] : ''; });
    if (/Checks complete/i.test(checks)) break;
    if (i % 6 === 0) console.log('  checks:', checks || '(no status yet)');
    await sleep(5000);
  }
  console.log('checks:', checks);
  if (!/Checks complete\. No issues found/i.test(checks)) { console.log('NOT publishing: checks not clean'); await shot(p, 'checks-blocked'); b.disconnect(); return; }
  await clickSel(p, '#done-button'); await sleep(6000);
  await shot(p, 'published');
  const after = await p.evaluate(() => document.body.innerText.match(/(Video published|Short published|published)[^\n]*/i));
  console.log('result', after && after[0], 'link', link);
  if (RELATED && link) {
    // A Short's "Related video" is not in the upload dialog: it shows on the edit page once published.
    const id = link.split('/').pop();
    await p.goto(`https://studio.youtube.com/video/${id}/edit`, { waitUntil: 'domcontentloaded' }); await sleep(8000);
    await p.evaluate(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) if (/^Related video$/i.test(n.textContent.trim())) { const t = n.parentElement.closest('ytcp-dropdown-trigger'); t.scrollIntoView({ block: 'center' }); t.click(); return; } });
    await sleep(3000);
    const picked = await p.evaluate(rid => { const cards = [...document.querySelectorAll('ytcp-video-pick-dialog ytcp-entity-card')];
      const c = cards.find(x => x.innerHTML.includes(rid)) || null; if (!c) return false; c.click(); return true; }, RELATED);
    await sleep(2500);
    if (picked) { await clickSel(p, '#save'); await sleep(5000); }
    console.log('related video', picked ? 'set' : 'NOT FOUND in picker (set it by hand)');
    await shot(p, 'related');
  }
  b.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
