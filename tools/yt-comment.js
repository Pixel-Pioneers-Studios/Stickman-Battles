#!/usr/bin/env node
// tools/yt-comment.js: post a comment on one of the channel's videos from the signed-in Studio Chrome, and pin it.
//
//   node tools/yt-comment.js --id=<videoId> --text="..." [--pin] [--shots=<dir>]
//
// Uses the shared hidden Chrome (tools/studio-chrome.js) and its single tab. Every watch-page load counts a view,
// so this is for posting, not for checking comments (Studio's Comments tab is the place to read them).
const path = require('path');
const { connectStudio, studioPage } = require('./studio-chrome');

const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').slice(k.length + 3) || null;
const ID = arg('id'), TEXT = arg('text'), PIN = process.argv.includes('--pin'), SHOTS = arg('shots');
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(p, fn, ms, ...a) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await p.evaluate(fn, ...a)) return true; await sleep(500); }
  return false;
}
async function shot(p, name) {
  if (!SHOTS) return;
  await Promise.race([p.screenshot({ path: path.join(SHOTS, name + '.png') }), sleep(8000)]).catch(() => {});
}

(async () => {
  if (!ID || !TEXT) throw new Error('need --id and --text');
  const b = await connectStudio();
  const p = await studioPage(b);
  await p.setViewport({ width: 1280, height: 1000 });
  await (await p.target().createCDPSession()).send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await p.goto(`https://www.youtube.com/watch?v=${ID}`, { waitUntil: 'domcontentloaded' });
  await sleep(5000);
  // Comments load lazily: scroll down until the comment box appears.
  for (let i = 0; i < 12; i++) {
    if (await p.evaluate(() => !!document.querySelector('#simplebox-placeholder'))) break;
    await p.evaluate(() => window.scrollBy(0, 700)); await sleep(1200);
  }
  if (!await p.evaluate(() => !!document.querySelector('#simplebox-placeholder'))) { await shot(p, 'no-box'); throw new Error('comment box not found'); }
  await p.evaluate(() => { const e = document.querySelector('#simplebox-placeholder'); e.scrollIntoView({ block: 'center' }); e.click(); });
  await waitFor(p, () => !!document.querySelector('#contenteditable-root'), 10000);
  await p.evaluate(() => document.querySelector('#contenteditable-root').focus());
  await p.keyboard.sendCharacter(TEXT);
  await sleep(800);
  const typed = await p.evaluate(() => document.querySelector('#contenteditable-root').innerText.trim());
  const norm = t => t.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim();
  if (norm(typed) !== norm(TEXT)) { await shot(p, 'typed-wrong'); throw new Error('text not entered: ' + typed.slice(0, 60)); }
  await p.evaluate(() => { const s = document.querySelector('#submit-button button, #submit-button'); s.click(); });
  // Our new comment appears at the top of the list.
  const posted = await waitFor(p, t => [...document.querySelectorAll('ytd-comment-thread-renderer #content-text')].some(e => e.innerText.trim() === t.trim()), 20000, TEXT);
  console.log('posted', posted);
  await shot(p, 'posted');
  if (!posted || !PIN) { b.disconnect(); return; }
  // Pin: the thread's action menu (three dots) -> "Pin" -> confirm.
  const opened = await p.evaluate(t => {
    const th = [...document.querySelectorAll('ytd-comment-thread-renderer')].find(r => (r.querySelector('#content-text') || {}).innerText && r.querySelector('#content-text').innerText.trim() === t.trim());
    if (!th) return false;
    th.scrollIntoView({ block: 'center' });
    const btn = [...th.querySelectorAll('button')].find(x => /action menu/i.test(x.getAttribute('aria-label') || ''));
    if (!btn) return false; btn.click(); return true;
  }, TEXT);
  if (!opened) { await shot(p, 'no-menu'); throw new Error('comment menu not found'); }
  await sleep(1500);
  const pinItem = await p.evaluate(() => {
    // Oct 2026 markup: the menu's entries are yt-formatted-strings inside an iron-dropdown.
    const it = [...document.querySelectorAll('tp-yt-iron-dropdown yt-formatted-string')].find(e => e.offsetParent !== null && e.innerText.trim() === 'Pin');
    if (!it) return false; (it.closest('ytd-menu-service-item-renderer, tp-yt-paper-item') || it).click(); return true;
  });
  if (!pinItem) { await shot(p, 'no-pin-item'); throw new Error('Pin menu item not found'); }
  await sleep(1500);
  await p.evaluate(() => {
    const c = [...document.querySelectorAll('tp-yt-paper-dialog button, yt-confirm-dialog-renderer button')].find(e => e.offsetParent !== null && /^\s*Pin\s*$/i.test(e.innerText));
    if (c) c.click();
  });
  await sleep(3000);
  const pinned = await p.evaluate(t => {
    const th = [...document.querySelectorAll('ytd-comment-thread-renderer')].find(r => (r.querySelector('#content-text') || {}).innerText && r.querySelector('#content-text').innerText.trim() === t.trim());
    return !!(th && /Pinned by/i.test(th.innerText));
  }, TEXT);
  console.log('pinned', pinned);
  await shot(p, 'pinned');
  b.disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
