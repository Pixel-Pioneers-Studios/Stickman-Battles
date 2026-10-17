'use strict';
// Motion graphics, drawn in a headless page on a transparent canvas, one call
// per output frame. Everything here runs IN THE PAGE (it is stringified and
// injected by edit.js), so it must not reference Node.
//
// Sizes are in pixels of a frame whose short side is 1080.
function overlayPage() {
  const ease = t => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
  const clamp01 = t => Math.max(0, Math.min(1, t));
  const ORANGE = '#ff9a2e';

  function logoGrad(ctx, y0, y1) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#ffd08a'); g.addColorStop(0.45, '#ff9a2e'); g.addColorStop(1, '#e8561a');
    return g;
  }

  // Dark band behind text so it reads over any footage.
  function band(ctx, W, y, h, a) {
    const g = ctx.createLinearGradient(0, y - h, 0, y + h);
    g.addColorStop(0, 'rgba(4,2,10,0)'); g.addColorStop(0.35, `rgba(4,2,10,${a})`);
    g.addColorStop(0.65, `rgba(4,2,10,${a})`); g.addColorStop(1, 'rgba(4,2,10,0)');
    ctx.fillStyle = g; ctx.fillRect(0, y - h, W, h * 2);
  }

  function text(ctx, str, x, y, size, o) {
    ctx.save();
    ctx.font = `${o.weight || 400} ${size}px "${o.font || 'Potta One'}"`;
    ctx.letterSpacing = (o.track || 0) * size + 'px';
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
    const dx = o.align === 'center' || !o.align ? (o.track || 0) * size / 2 : 0;
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = size * 0.18; ctx.shadowOffsetY = size * 0.06;
    ctx.strokeStyle = 'rgba(6,4,14,0.92)'; ctx.lineWidth = size * (o.stroke === undefined ? 0.1 : o.stroke);
    if (ctx.lineWidth > 0) ctx.strokeText(str, x + dx, y);
    ctx.shadowColor = o.glow || 'transparent'; ctx.shadowBlur = o.glow ? size * 0.35 : 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = o.fill === 'logo' ? logoGrad(ctx, y - size * 0.5, y + size * 0.45) : (o.fill || '#fff');
    ctx.fillText(str, x + dx, y);
    ctx.restore();
  }

  const D = {
    // Full-frame colour flash that decays: the cut hits harder.
    flash(ctx, it, f, W, H) {
      const t = (f - it.at) / (it.len || 8);
      if (t < 0 || t >= 1) return;
      ctx.fillStyle = it.color || '#fff'; ctx.globalAlpha = (it.a || 0.85) * Math.pow(1 - t, 2);
      ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    },
    // Full-frame dark scrim (title cards over footage).
    scrim(ctx, it, f, W, H) {
      if (f < it.from || f >= it.to) return;
      const a = (it.a === undefined ? 0.72 : it.a) * clamp01((f - it.from) / (it.fade || 10)) * clamp01((it.to - f) / (it.fadeOut || 1));
      ctx.fillStyle = `rgba(4,2,10,${a})`; ctx.fillRect(0, 0, W, H);
    },
    // Big caption that slams in, holds, and cuts out.
    slam(ctx, it, f, W, H) {
      if (f < it.from || f >= it.to) return;
      const t = f - it.from, left = it.to - f;
      const a = clamp01(t / 3) * clamp01(left / 5);
      const sc = 1 + 0.55 * (1 - ease(t / 8)) - 0.03 * (1 - clamp01(left / 5));
      const x = W * (it.x === undefined ? 0.5 : it.x), y = H * it.y, size = it.size || 120;
      ctx.save(); ctx.globalAlpha = a;
      if (it.band !== false) band(ctx, W, y + (it.sub ? size * 0.3 : 0), size * (it.sub ? 1.7 : 1.3), 0.6);
      ctx.translate(x, y); ctx.scale(sc, sc);
      const lines = Array.isArray(it.text) ? it.text : [it.text];
      const lh = size * 1.02, y0 = -(lines.length - 1) * lh / 2;
      lines.forEach((ln, i) => text(ctx, ln, 0, y0 + i * lh, size, { fill: it.fill || '#fff', track: 0.02, align: it.align, glow: it.glow }));
      const yb = y0 + (lines.length - 1) * lh + size * 0.62;
      if (it.sub) {
        const ta = clamp01((t - 5) / 6);
        ctx.globalAlpha = a * ta;
        text(ctx, it.sub, 0, yb + size * 0.12, size * 0.34, { font: 'Rajdhani', weight: 700, fill: it.subFill || ORANGE, track: 0.32, stroke: 0.16, align: it.align });
      } else if (it.bar !== false) {
        const bw = size * 2.2 * ease(t / 10);
        ctx.fillStyle = ORANGE; ctx.fillRect(it.align === 'left' ? 0 : -bw / 2, yb - size * 0.06, bw, Math.max(4, size * 0.05));
      }
      ctx.restore();
    },
    // Small persistent label (weapon names, section tags).
    tag(ctx, it, f, W, H) {
      if (f < it.from || f >= it.to) return;
      const t = f - it.from, left = it.to - f, size = it.size || 46;
      const a = clamp01(t / 4) * clamp01(left / 4);
      const x = W * (it.x === undefined ? 0.5 : it.x), y = H * it.y;
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = `700 ${size}px "Rajdhani"`; ctx.letterSpacing = size * 0.22 + 'px';
      const w = ctx.measureText(it.text).width + size * 1.1, h = size * 1.5;
      const slide = (1 - ease(t / 7)) * size * 0.8;
      const x0 = (it.align === 'left' ? x : x - w / 2) - slide;
      ctx.fillStyle = 'rgba(6,4,14,0.78)'; ctx.fillRect(x0, y - h / 2, w, h);
      ctx.fillStyle = ORANGE; ctx.fillRect(x0, y - h / 2, Math.max(5, size * 0.12), h);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(it.text, x0 + size * 0.55, y + size * 0.04);
      ctx.restore();
    },
    // Quiet corner note: game ads are assumed to exaggerate, so say this is real footage.
    ingame(ctx, it, f, W, H) {
      if (f < it.from || f >= it.to) return;
      const size = it.size || 26, a = clamp01((f - it.from) / 10) * clamp01((it.to - f) / 10);
      ctx.globalAlpha = a * 0.72;
      ctx.font = `600 ${size}px "Rajdhani"`; ctx.letterSpacing = size * 0.24 + 'px';
      ctx.textAlign = it.align || 'right'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = size * 0.3;
      ctx.fillStyle = '#f3e6d4';
      ctx.fillText(it.text || 'IN-GAME FOOTAGE', W * it.x, H * it.y);
    },
    // The game's logo, as on the store cover, plus optional call-to-action lines.
    logo(ctx, it, f, W, H) {
      if (f < it.from || f >= it.to) return;
      const t = f - it.from, left = it.to - f;
      const a = clamp01(t / 3) * clamp01(left / (it.fadeOut || 1));
      const size = it.size || 150, x = W * (it.x === undefined ? 0.5 : it.x), y = H * it.y;
      const lines = it.lines || ['STICKMAN EVOLUTION'];
      ctx.save(); ctx.globalAlpha = a;
      ctx.translate(x, y);
      const sc = 1 + 0.4 * (1 - ease(t / 10));
      ctx.save(); ctx.scale(sc, sc);
      const lh = size * 0.98;
      lines.forEach((ln, i) => text(ctx, ln, 0, i * lh, size, { font: 'SE Logo Brush', fill: 'logo', track: 0.02, stroke: 0.06, glow: 'rgba(255,110,30,0.45)' }));
      ctx.restore();
      let yy = (lines.length - 1) * lh + size * 0.82;
      ctx.globalAlpha = a * clamp01((t - 8) / 10);
      text(ctx, 'THE 95TH', 0, yy, size * 0.34, { fill: '#f3e6d4', track: 0.5, stroke: 0.12 });
      if (it.cta) {
        const t2 = t - (it.ctaAt || 30);
        if (t2 > 0) {
          const ca = clamp01(t2 / 8), cs = it.ctaSize || size * 0.42;
          yy += size * 0.95;
          ctx.globalAlpha = a * ca;
          ctx.font = `700 ${cs}px "Rajdhani"`; ctx.letterSpacing = cs * 0.14 + 'px';
          const w = ctx.measureText(it.cta).width + cs * 1.6, h = cs * 1.75;
          const pop = 1 + 0.12 * (1 - ease(t2 / 8));
          ctx.save(); ctx.translate(0, yy); ctx.scale(pop, pop);
          ctx.fillStyle = logoGrad(ctx, -h / 2, h / 2);
          ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h * 0.16); ctx.fill();
          ctx.fillStyle = '#12080a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(it.cta, cs * 0.07, cs * 0.05);
          ctx.restore();
          if (it.url) {
            ctx.globalAlpha = a * clamp01((t2 - 10) / 10);
            text(ctx, it.url, 0, yy + h * 0.5 + cs * 0.95, cs * 0.72, { font: 'Rajdhani', weight: 600, fill: '#f3e6d4', track: 0.06, stroke: 0.14 });
          }
        }
      }
      ctx.restore();
    },
    // Soft dark edges; keeps the eye on the fight.
    vignette(ctx, it, f, W, H) {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.hypot(W, H) * 0.56);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${it.a || 0.42})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    // Darkens the bottom of the frame (thumbnail title band).
    bottomfade(ctx, it, f, W, H) {
      const g = ctx.createLinearGradient(0, H * (it.y0 || 0.5), 0, H);
      g.addColorStop(0, 'rgba(4,2,10,0)'); g.addColorStop(1, `rgba(4,2,10,${it.a || 0.9})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    },
    // Opaque fade from/to black.
    fade(ctx, it, f, W, H) {
      if (f < it.from || f >= it.to) return;
      const t = (f - it.from) / (it.to - it.from);
      ctx.fillStyle = `rgba(0,0,0,${it.out ? t : 1 - t})`; ctx.fillRect(0, 0, W, H);
    },
  };

  window.__draw = function (f, items) {
    const cv = document.getElementById('c'), ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const it of items) { ctx.save(); D[it.type](ctx, it, f, cv.width, cv.height); ctx.restore(); }
    return cv.toDataURL('image/png');
  };
  window.__drawOver = function (f, items, bgUrl, type, q) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const cv = document.getElementById('c'), ctx = cv.getContext('2d');
        const s = Math.max(cv.width / img.width, cv.height / img.height);
        ctx.drawImage(img, (cv.width - img.width * s) / 2, (cv.height - img.height * s) / 2, img.width * s, img.height * s);
        for (const it of items) { ctx.save(); D[it.type](ctx, it, f, cv.width, cv.height); ctx.restore(); }
        res(cv.toDataURL(type || 'image/png', q));
      };
      img.src = bgUrl;
    });
  };
}

module.exports = { overlayPage };
