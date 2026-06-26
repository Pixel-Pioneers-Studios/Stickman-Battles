const puppeteer = require('puppeteer');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, 'tour-frames');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const BASE = 'http://localhost:3001/index.html';

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function shot(page, name) {
  const file = path.join(OUT_DIR, name);
  await page.screenshot({ path: file, type: 'png' });
  console.log('captured:', name);
  return file;
}

function holdFrame(name, count, frames) {
  for (let i = 0; i < count; i++) frames.push(path.join(OUT_DIR, name));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 60000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=900,600'],
    defaultViewport: { width: 900, height: 600 }
  });
  const page = await browser.newPage();
  page.on('console', () => {});
  page.on('pageerror', () => {});

  const frames = [];

  // ── LOAD PAGE — keep localStorage (user's save has ch0 beaten → no prologue) ─
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 20000 });
  // Wait for IIFE (fires at 500ms) + any overlays to settle, then dismiss them
  await wait(1800);
  await page.evaluate(() => {
    ['prologueOverlay','storyPrologueOverlay','loadOverlay','fadeOverlay','storyModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.style.opacity = '0'; }
    });
    // Close story modal and return to home menu
    const sm = document.getElementById('storyModal');
    if (sm) sm.style.display = 'none';
    if (typeof selectMode === 'function') selectMode('2p');
    const hc = document.getElementById('menuHomeContent');
    if (hc) hc.style.display = '';
    ['storyPathPanel','simulatorPanel','refightPanel','theGridPanel'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
  });
  await wait(500);

  // ── 1. MAIN MENU HOME ──────────────────────────────────────────────────────
  await shot(page, '01-main-menu.png');
  holdFrame('01-main-menu.png', 75, frames); // 2.5s

  // ── 2. STORY PATH panel ────────────────────────────────────────────────────
  await page.evaluate(() => {
    // Show the story path panel directly without triggering the prologue overlay
    const hc = document.getElementById('menuHomeContent');
    if (hc) hc.style.display = 'none';
    ['simulatorPanel','refightPanel','theGridPanel'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    const sp = document.getElementById('storyPathPanel');
    if (sp) sp.style.display = 'block';
  });
  await wait(600);
  await shot(page, '02-story-path.png');
  holdFrame('02-story-path.png', 75, frames);

  // ── 3. Back to home, open Simulator (Boss Rush) ────────────────────────────
  await page.evaluate(() => {
    // Hide story panel, show home
    const sp = document.getElementById('storyPathPanel');
    if (sp) sp.style.display = 'none';
    const hc = document.getElementById('menuHomeContent');
    if (hc) hc.style.display = '';
    if (typeof openSimulator === 'function') openSimulator();
  });
  await wait(600);
  await shot(page, '03-simulator.png');
  holdFrame('03-simulator.png', 60, frames);

  // ── 4. Back to home, The Grid ──────────────────────────────────────────────
  await page.evaluate(() => {
    const sp = document.getElementById('simulatorPanel');
    if (sp) sp.style.display = 'none';
    const hc = document.getElementById('menuHomeContent');
    if (hc) hc.style.display = '';
    if (typeof openTheGrid === 'function') openTheGrid();
  });
  await wait(600);
  await shot(page, '04-the-grid.png');
  holdFrame('04-the-grid.png', 60, frames);

  // ── 5. Back to home — show mode cards clearly ─────────────────────────────
  await page.evaluate(() => {
    const gp = document.getElementById('theGridPanel');
    if (gp) gp.style.display = 'none';
    const hc = document.getElementById('menuHomeContent');
    if (hc) hc.style.display = '';
  });
  await wait(400);
  await shot(page, '05-mode-select.png');
  holdFrame('05-mode-select.png', 75, frames);

  // ── 6. Select 2P mode → show arena section ────────────────────────────────
  await page.evaluate(() => {
    if (typeof selectMode === 'function') selectMode('2p');
  });
  await wait(600);
  await shot(page, '06-arena-config.png');
  holdFrame('06-arena-config.png', 90, frames);

  // ── 7. Launch actual game ─────────────────────────────────────────────────
  await page.evaluate(() => {
    if (typeof startGame === 'function') startGame();
  });

  // Remove any fullscreen overlays and debug panels after game starts
  await wait(2000);
  await page.evaluate(() => {
    ['prologueOverlay','storyPrologueOverlay','loadOverlay','fadeOverlay','storyModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.style.opacity = '0'; }
    });
    // Hide debug overlay
    const dbg = document.getElementById('debugOverlay');
    if (dbg) dbg.style.display = 'none';
    if (typeof window.showDebugOverlay !== 'undefined') window.showDebugOverlay = false;
    // Any other high-z overlays
    document.querySelectorAll('[style*="z-index: 8000"],[style*="z-index:8000"]').forEach(el => {
      el.style.display = 'none';
    });
  });
  await wait(1500);
  await shot(page, '07-gameplay-a.png');
  holdFrame('07-gameplay-a.png', 90, frames);

  await wait(2500);
  await shot(page, '08-gameplay-b.png');
  holdFrame('08-gameplay-b.png', 75, frames);

  await wait(2500);
  await shot(page, '09-gameplay-c.png');
  holdFrame('09-gameplay-c.png', 90, frames);

  await wait(3000);
  await shot(page, '10-gameplay-d.png');
  holdFrame('10-gameplay-d.png', 75, frames);

  // ── 8. Battle Royale mode ─────────────────────────────────────────────────
  // Reload for a fresh state, go straight to battle royale
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 15000 });
  await wait(1800);
  await page.evaluate(() => {
    ['prologueOverlay','storyPrologueOverlay','loadOverlay','fadeOverlay','storyModal'].forEach(id => {
      const el = document.getElementById(id); if (el) { el.style.display='none'; el.style.opacity='0'; }
    });
    if (typeof selectMode === 'function') selectMode('battleroyale');
    const hc = document.getElementById('menuHomeContent');
    if (hc) hc.style.display = '';
  });
  await wait(800);
  await shot(page, '11-battle-royale.png');
  holdFrame('11-battle-royale.png', 60, frames);

  // ── 9. Launch battle royale game ─────────────────────────────────────────
  await page.evaluate(() => {
    if (typeof startGame === 'function') startGame();
  });
  await wait(2500);
  await page.evaluate(() => {
    ['prologueOverlay','storyPrologueOverlay','loadOverlay','fadeOverlay','storyModal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.style.opacity = '0'; }
    });
  });
  await wait(1500);
  await shot(page, '12-br-gameplay-a.png');
  holdFrame('12-br-gameplay-a.png', 90, frames);
  await wait(2500);
  await shot(page, '13-br-gameplay-b.png');
  holdFrame('13-br-gameplay-b.png', 75, frames);

  // ── 10. Outro — reuse the title splash ───────────────────────────────────
  // (avoid a reload which times out due to active socket connections)
  holdFrame('01-main-menu.png', 60, frames);

  await browser.close();

  // ── Build video ────────────────────────────────────────────────────────────
  const listFile = path.join(OUT_DIR, 'frames.txt');
  const listContent = frames.map(f => `file '${f}'\nduration 0.0333`).join('\n');
  fs.writeFileSync(listFile, listContent);

  const videoOut = path.join(__dirname, 'stickman-tour.mp4');
  const ffmpegCmd = [
    'ffmpeg -y',
    `-f concat -safe 0 -i "${listFile}"`,
    `-vf "scale=900:600:flags=lanczos,fps=30"`,
    `-c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p`,
    `"${videoOut}"`
  ].join(' ');

  console.log('\nBuilding video...');
  execSync(ffmpegCmd, { stdio: 'inherit' });
  console.log('\nDone!', videoOut);
})().catch(err => { console.error(err); process.exit(1); });
