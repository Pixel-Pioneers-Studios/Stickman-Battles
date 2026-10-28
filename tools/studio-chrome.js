// tools/studio-chrome.js: connect to the signed-in YouTube Studio Chrome (profile ~/.agent-chrome-profile-studio,
// port 9333), launching it if it isn't running, without opening a window over
// the user's work. Studio refuses headless Chrome ("unsupported browser"), so this is a real Chrome started in
// the background (open -g: no focus steal) and its app hidden (Cmd-H style), with background throttling off so
// pages keep running. Opening a new tab un-hides the app, so tools drive the one existing tab via studioPage().
// Hidden pages don't paint: page.screenshot can hang, so callers must time it out. Pass show=true (yt-check/yt-upload --show) to leave the window up, e.g. to sign in again.
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require(path.join(__dirname, '..', 'node_modules', 'puppeteer-core'));

const PORT = 9333;
const PROFILE = path.join(os.homedir(), '.agent-chrome-profile-studio');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = `http://127.0.0.1:${PORT}`;

async function connectStudio(show = process.argv.includes('--show')) {
  try {
    const b = await puppeteer.connect({ browserURL: url, defaultViewport: null });
    if (!show) await hide(b).catch(() => {});
    return b;
  } catch (_) {}
  const args = [`--user-data-dir=${PROFILE}`, `--remote-debugging-port=${PORT}`,
    '--no-first-run', '--no-default-browser-check', '--window-size=1400,950',
    '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
    '--disable-background-timer-throttling', 'https://studio.youtube.com/'];
  spawn('open', ['-g', '-n', '-a', 'Google Chrome', '--args', ...args], { detached: true, stdio: 'ignore' }).unref();
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    let b;
    try { b = await puppeteer.connect({ browserURL: url, defaultViewport: null }); } catch (_) { continue; }
    if (!show) { await sleep(2000); await hide(b).catch(() => {}); }
    return b;
  }
  throw new Error('Could not start Chrome on port ' + PORT);
}

// Hide the Studio Chrome app (only that instance, by pid) so it never shows over the user's work.
async function hide(b) {
  const cdp = await b.target().createCDPSession();
  const info = await cdp.send('SystemInfo.getProcessInfo');
  const pid = (info.processInfo.find(x => x.type === 'browser') || {}).id;
  if (!pid) return;
  require('child_process').execFileSync('osascript', ['-l', 'JavaScript', '-e',
    `ObjC.import('AppKit'); $.NSRunningApplication.runningApplicationWithProcessIdentifier(${pid}).hide`]);
}

// The tab to drive: reuse the existing one (a new tab would un-hide the app); create one only if none is open.
async function studioPage(b) {
  const pages = await b.pages();
  return pages[0] || b.newPage();
}

module.exports = { connectStudio, studioPage, PORT, PROFILE };
