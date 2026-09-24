'use strict';

let menuState = 'title';   // 'title' | 'chapter_select'
let menuPulse = 0;
let menuSel   = 0;
let menuNote  = 0;         // frames left on the "not built yet" note

function updateMenu() {
  menuPulse += 0.03;
  if (menuNote > 0) menuNote--;

  if (menuState === 'title') {
    if (just('confirm')) { menuState = 'chapter_select'; menuSel = 0; }
    return;
  }

  if (just('back')) { menuState = 'title'; return; }
  if (just('left'))  menuSel = (menuSel - 1 + CHAPTERS.length) % CHAPTERS.length;
  if (just('right')) menuSel = (menuSel + 1) % CHAPTERS.length;

  if (just('confirm')) {
    if (!isChapterBuilt(menuSel)) { menuNote = 150; return; }
    currentChapter = menuSel;
    loadChapter(menuSel);
    _enterChapter(CHAPTERS[menuSel]);
  }
}

function drawMenu() {
  ctx.fillStyle = '#0c0b09';
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  if (menuState === 'title') _drawTitleScreen();
  else                       _drawChapterSelect();
}

function _drawTitleScreen() {
  ctx.textAlign = 'center';

  ctx.fillStyle = '#5c5440';
  ctx.font      = '13px Courier New';
  ctx.fillText('S T I C K M A N   E V O L U T I O N', GAME_W / 2, GAME_H * 0.36 - 52);

  ctx.fillStyle = `rgba(206,196,176,${0.9 + Math.sin(menuPulse * 1.2) * 0.07})`;
  ctx.font      = 'bold 64px Courier New';
  ctx.fillText('S O V E R E I G N', GAME_W / 2, GAME_H * 0.36);

  ctx.fillStyle = '#7a6e52';
  ctx.font      = '14px Courier New';
  ctx.fillText('a prequel', GAME_W / 2, GAME_H * 0.36 + 34);

  ctx.fillStyle = '#33301e';
  ctx.fillRect(GAME_W / 2 - 120, GAME_H * 0.52, 240, 1);

  ctx.fillStyle = `rgba(150,140,110,${0.55 + Math.sin(menuPulse * 2) * 0.25})`;
  ctx.font      = '14px Courier New';
  ctx.fillText('[ press J to begin ]', GAME_W / 2, GAME_H * 0.63);

  ctx.fillStyle = '#4a4436';
  ctx.font      = 'italic 12px Courier New';
  ctx.fillText('"He was right about it. He was right about all of it."', GAME_W / 2, GAME_H - 24);
}

function _drawChapterSelect() {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8b8069';
  ctx.font      = 'bold 15px Courier New';
  ctx.fillText('SELECT CHAPTER', GAME_W / 2, 36);

  const cardW = 150, cardH = 108, gap = 14;
  const perRow = 5;
  const rows   = Math.ceil(CHAPTERS.length / perRow);
  const startY = 70;

  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch  = CHAPTERS[i];
    const r   = Math.floor(i / perRow);
    const c   = i % perRow;
    const cx  = GAME_W / 2 + (c - (perRow - 1) / 2) * (cardW + gap);
    const cy  = startY + r * (cardH * 0.62 + gap) + cardH / 2 - 20;
    const on  = i === menuSel;
    const built = !!ch.built;

    ctx.fillStyle   = built ? (on ? '#221f18' : '#16140f') : '#100f0c';
    ctx.strokeStyle = on ? '#9b8c66' : (built ? '#3a3528' : '#221f19');
    ctx.lineWidth   = on ? 2 : 1;
    roundedRect(cx - cardW / 2, cy - cardH / 2 + 18, cardW, cardH * 0.62, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = built ? '#8b8069' : '#3d3a30';
    ctx.font      = 'bold 10px Courier New';
    ctx.fillText(ch.title, cx, cy - cardH / 2 + 34);

    ctx.fillStyle = built ? '#ded5c0' : '#4b463a';
    ctx.font      = '11px Courier New';
    _wrap(ch.subtitle, cx, cy - cardH / 2 + 50, cardW - 16, 13);

    if (!built) {
      ctx.fillStyle = '#5a5244';
      ctx.font      = '9px Courier New';
      ctx.fillText('— unbuilt —', cx, cy + cardH * 0.31 - 4);
    }
  }

  const sel = CHAPTERS[menuSel];
  if (sel?.note) {
    ctx.fillStyle = '#6d6553';
    ctx.font      = 'italic 12px Courier New';
    ctx.fillText(sel.note, GAME_W / 2, GAME_H - 46);
  }

  if (menuNote > 0) {
    ctx.fillStyle = `rgba(190,150,90,${Math.min(1, menuNote / 40)})`;
    ctx.font      = 'bold 12px Courier New';
    ctx.fillText('NOT BUILT YET', GAME_W / 2, GAME_H - 64);
  }

  ctx.fillStyle = '#4a4436';
  ctx.font      = '11px Courier New';
  ctx.fillText('← →  CHOOSE    J  START    ESC  BACK', GAME_W / 2, GAME_H - 22);
}

function _wrap(text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', ly = y;
  for (const w of words) {
    if (ctx.measureText(line + w).width > maxW && line) {
      ctx.fillText(line.trim(), cx, ly);
      line = ''; ly += lh;
    }
    line += w + ' ';
  }
  ctx.fillText(line.trim(), cx, ly);
}
