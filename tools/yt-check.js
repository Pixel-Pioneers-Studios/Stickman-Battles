#!/usr/bin/env node
// tools/yt-check.js: did the newest Short pass YouTube's first-impressions test?
//
// Reads the "Stayed to watch / Swiped away" split (Engagement tab, "How viewers
// engaged"; formerly "Viewed vs. swiped away") from YouTube Studio for your newest
// Shorts and grades the newest one. The YouTube APIs don't expose
// this number, so it drives a real signed-in Chrome instead.
//
//   node tools/yt-check.js            # grade newest Short, compare to the last 10
//   node tools/yt-check.js --n=20     # compare against more Shorts
//
// Uses its own Chrome profile (~/.agent-chrome-profile-studio) on port 9333. First
// run opens a window: sign in to YouTube there once, then rerun. Leave that window
// open (or not; it is relaunched when needed).

const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');

const N = Number((process.argv.find(a => a.startsWith('--n=')) || '--n=10').slice(4));

// Creator rules of thumb for Shorts "Stayed to watch" (YouTube publishes no cutoffs).
const PASS = 60, FAIL = 45;
const MIN_VIEWS = 100; // below this the % is mostly noise

const sleep = ms => new Promise(r => setTimeout(r, ms));

const connect = () => require('./studio-chrome').connectStudio();

async function bodyText(p) { return p.evaluate(() => document.body.innerText); }

// Studio's analytics cards sometimes show "Oops, something went wrong" on first load.
async function settle(p, ready) {
  for (let i = 0; i < 12; i++) {
    await sleep(2000);
    const t = await bodyText(p);
    if (ready(t)) return t;
    if (t.includes('Oops, something went wrong')) {
      await p.evaluate(() => [...document.querySelectorAll('button,ytcp-button')]
        .find(x => /Retry/.test(x.textContent))?.click());
    }
  }
  return bodyText(p);
}

async function listShorts(p) {
  await p.goto('https://studio.youtube.com/', { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  const m = p.url().match(/\/channel\/(UC[\w-]+)/);
  if (!m) return null; // not signed in
  await p.goto(`https://studio.youtube.com/channel/${m[1]}/videos/short`, { waitUntil: 'domcontentloaded' });
  await settle(p, t => t.includes('Rows per page'));
  return p.evaluate(() => [...document.querySelectorAll('ytcp-video-row')].map(r => {
    const a = r.querySelector('a[href*="/video/"]');
    return {
      id: a && a.href.split('/video/')[1].split('/')[0],
      title: (r.querySelector('#video-title') || {}).textContent?.trim(),
      date: (r.innerText.match(/[A-Z][a-z]{2} \d{1,2}, \d{4}/) || [''])[0],
    };
  }).filter(v => v.id));
}

async function readShortOnce(p, id) {
  await p.goto(`https://studio.youtube.com/video/${id}/analytics/tab-overview/period-default`,
    { waitUntil: 'domcontentloaded' });
  const t = await settle(p, t => /Views\s*\n\s*Views\s*\n\s*[\d.,]/.test(t));
  const viewsRaw = (t.match(/Views\s*\n\s*Views\s*\n\s*([\d.,]+K?)/) || [])[1];
  let views = viewsRaw ? parseFloat(viewsRaw.replace(/,/g, '')) : null;
  if (viewsRaw && viewsRaw.endsWith('K')) views *= 1000;

  // The swipe split lives on the Engagement tab ("How viewers engaged"). Its URL
  // loads blank when opened directly, so click the tab instead.
  await p.evaluate(() => [...document.querySelectorAll('tp-yt-paper-tab, [role=tab]')]
    .find(x => x.textContent.trim() === 'Engagement')?.click());
  const e = await settle(p, t => /How viewers engaged[\s\S]*?Stayed to watch/.test(t));
  // "How viewers engaged / Since published / 24.4% / 75.6% / Stayed to watch / Swiped away"
  const split = e.match(/How viewers engaged\s*\n[^\n]*\n\s*([\d.]+)%\s*\n\s*([\d.]+)%/);
  const engaged = (e.match(/Engaged views\s*\n\s*Engaged views\s*\n\s*([\d.,]+K?)/) || [])[1];
  return {
    views,
    stayed: split ? Number(split[1]) : null,
    engaged: engaged || null,
    avgDur: (e.match(/Average view duration\s*\n\s*([\d:]+)/) || [])[1] || null,
  };
}

// Studio's cards fail to load often enough that one more pass is worth it.
async function readShort(p, id) {
  let r = await readShortOnce(p, id);
  for (let i = 0; i < 2 && (r.stayed == null || r.views == null); i++) {
    const again = await readShortOnce(p, id);
    r = { views: r.views ?? again.views, stayed: r.stayed ?? again.stayed,
      engaged: r.engaged ?? again.engaged, avgDur: r.avgDur ?? again.avgDur };
  }
  return r;
}

(async () => {
  const b = await connect();
  const p = await require('./studio-chrome').studioPage(b);
  try {
    const shorts = await listShorts(p);
    if (!shorts) {
      console.log('Not signed in. Sign in to YouTube in the Chrome window that just opened, then rerun.');
      return;
    }
    if (!shorts.length) { console.log('No Shorts found on this channel.'); return; }

    const rows = [];
    for (const s of shorts.slice(0, N)) {
      const r = { ...s, ...(await readShort(p, s.id)) };
      rows.push(r);
      console.log(`  ${String(r.stayed ?? '—').padStart(5)}% stayed  ${String(r.views ?? '?').padStart(6)} views  ${String(r.engaged ?? '-').padStart(5)} engaged  ${r.date}  ${r.title}`);
    }

    const [newest, ...rest] = rows;
    const past = rest.filter(r => r.stayed != null && r.views >= MIN_VIEWS);
    const avg = past.length ? past.reduce((a, r) => a + r.stayed, 0) / past.length : null;

    console.log(`\nNewest: "${newest.title}" (${newest.date})`);
    if (newest.stayed == null) {
      console.log('VERDICT: TOO EARLY. Studio has no stayed/swiped split yet. Check again in a few hours.');
    } else if ((newest.views || 0) < MIN_VIEWS) {
      console.log(`VERDICT: TOO EARLY. ${newest.stayed}% stayed, but only ${newest.views} views; the % isn't reliable under ${MIN_VIEWS}.`);
    } else {
      const v = newest.stayed >= PASS ? 'PASSED' : newest.stayed < FAIL ? 'FAILED' : 'BORDERLINE';
      const cmp = avg != null ? `; your recent average is ${avg.toFixed(1)}%` : '';
      console.log(`VERDICT: ${v}. ${newest.stayed}% stayed to watch, ${(100 - newest.stayed).toFixed(1)}% swiped away${cmp}.`);
      console.log(`(pass >= ${PASS}%, fail < ${FAIL}%: creator rules of thumb, not official YouTube numbers)`);
    }
  } finally {
    b.disconnect();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
