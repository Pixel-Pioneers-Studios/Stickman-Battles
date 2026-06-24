'use strict';

// ─── Title screen state ───────────────────────────────────────────────────────
let menuFrame   = 0;
let menuPulse   = 0;
let menuState   = 'title';  // 'title' | 'chapter_select'
let selectedCh  = 0;

function updateMenu() {
  menuFrame++;
  menuPulse = menuFrame * 0.025;

  if (menuState === 'title') {
    if (just('confirm')) {
      menuState = 'chapter_select';
    }
  } else if (menuState === 'chapter_select') {
    if (just('left') || held('left') && menuFrame % 10 === 0) {
      selectedCh = Math.max(0, selectedCh - 1);
    }
    if (just('right') || held('right') && menuFrame % 10 === 0) {
      selectedCh = Math.min(CHAPTERS.length - 1, selectedCh + 1);
    }
    if (just('confirm')) {
      _launchChapter(selectedCh);
    }
    if (just('back')) {
      menuState = 'title';
    }
  }
}

function drawMenu() {
  // Background — void shimmer
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Subtle background glow
  const gr = ctx.createRadialGradient(GAME_W / 2, GAME_H * 0.45, 0, GAME_W / 2, GAME_H * 0.45, 280);
  gr.addColorStop(0, `rgba(40,20,100,${0.18 + Math.sin(menuPulse) * 0.05})`);
  gr.addColorStop(1, 'transparent');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  if (menuState === 'title') {
    _drawTitleScreen();
  } else {
    _drawChapterSelect();
  }
}

function _drawTitleScreen() {
  // Main title
  ctx.textAlign   = 'center';
  ctx.fillStyle   = `rgba(220,210,190,${0.9 + Math.sin(menuPulse * 1.2) * 0.07})`;
  ctx.font        = 'bold 72px Courier New';
  ctx.fillText('A X I O M', GAME_W / 2, GAME_H * 0.4);

  // Subtitle
  ctx.fillStyle = '#443c2c';
  ctx.font      = '14px Courier New';
  ctx.fillText('a prequel', GAME_W / 2, GAME_H * 0.4 + 34);

  // Divider
  ctx.fillStyle = '#222216';
  ctx.fillRect(GAME_W / 2 - 120, GAME_H * 0.55, 240, 1);

  // Prompt
  const promptAlpha = 0.4 + Math.sin(menuPulse * 2.2) * 0.25;
  ctx.fillStyle = `rgba(180,160,120,${promptAlpha})`;
  ctx.font      = '13px Courier New';
  ctx.fillText('[ press J to begin ]', GAME_W / 2, GAME_H * 0.65);

  // Bottom lore line
  ctx.fillStyle = '#2a261a';
  ctx.font      = '11px Courier New';
  ctx.fillText('"He kept his name.  That was all he kept."', GAME_W / 2, GAME_H - 24);
}

function _drawChapterSelect() {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#666655';
  ctx.font      = '11px Courier New';
  ctx.fillText('SELECT CHAPTER', GAME_W / 2, 36);

  const totalW  = CHAPTERS.length * 140;
  const startX  = GAME_W / 2 - totalW / 2 + 70;

  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch   = CHAPTERS[i];
    const cx   = startX + i * 140;
    const cy   = GAME_H / 2;
    const sel  = i === selectedCh;

    // Card — interlude chapters get a cooler, muted look
    const cardW = 120, cardH = 80;
    const isIl  = ch.type === 'interlude';
    ctx.fillStyle   = sel
      ? (isIl ? 'rgba(20,24,34,0.9)' : 'rgba(40,34,20,0.9)')
      : (isIl ? 'rgba(10,10,16,0.7)' : 'rgba(14,12,8,0.7)');
    ctx.strokeStyle = sel
      ? (isIl ? '#556688' : '#aa9944')
      : (isIl ? '#1a1c28' : '#2a2618');
    ctx.lineWidth   = sel ? 2 : 1;
    roundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 4);
    ctx.fill();
    ctx.stroke();

    // Act label
    ctx.fillStyle = sel ? (isIl ? '#446688' : '#887755') : (isIl ? '#222a3a' : '#443c2c');
    ctx.font      = '9px Courier New';
    ctx.fillText(ch.title, cx, cy - cardH / 2 + 16);

    // Interlude tag
    if (isIl) {
      ctx.fillStyle = sel ? '#334466' : '#1e2230';
      ctx.font      = '8px Courier New';
      ctx.fillText('~ INTERLUDE ~', cx, cy - cardH / 2 + 27);
    }

    // Chapter name
    ctx.fillStyle = sel
      ? (isIl ? '#aabbd0' : '#eedeaa')
      : (isIl ? '#44526a' : '#665c44');
    ctx.font      = `bold ${sel ? 11 : 10}px Courier New`;
    const words   = ch.subtitle.split(' ');
    let line = '', lineY = isIl ? cy - 6 : cy - 12;
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 14) {
        ctx.fillText(line.trim(), cx, lineY);
        line  = w;
        lineY += 14;
      } else {
        line += (line ? ' ' : '') + w;
      }
    }
    ctx.fillText(line.trim(), cx, lineY);
  }

  // Nav hints
  ctx.fillStyle = '#3a3628';
  ctx.font      = '10px Courier New';
  ctx.fillText('← →  CHOOSE   J  START   ESC  BACK', GAME_W / 2, GAME_H - 24);
}

// ─── Launch a chapter ─────────────────────────────────────────────────────────
function _launchChapter(idx) {
  currentChapter = idx;
  loadChapter(idx);
  const ch = CHAPTERS[idx];
  startPreText(idx, () => {
    if (ch.type === 'interlude') {
      initInterlude(ch);
      gamePhase = 'interlude';
    } else {
      gamePhase = 'playing';
    }
    showChapterTitle();
  });
}
