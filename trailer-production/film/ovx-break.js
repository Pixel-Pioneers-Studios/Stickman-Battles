// Overlay type logoBreak for the long Sovereign cut: the film's own end card (black, STICKMAN EVOLUTION, THE 95TH, drawn
// exactly as overlay-page's `logo`), then cracks of cyan light running out from one point in it, then the card breaking
// into shards that fly at the camera and show the shot underneath.
//   { type: 'logoBreak', from, to, crackAt, breakAt, y, size, lines, cx, cy }   (cx, cy: where it breaks from, 0..1)
(function () {
  const ease = t => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
  const clamp01 = t => Math.max(0, Math.min(1, t));
  function logoGrad(ctx, y0, y1) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, '#ffd08a'); g.addColorStop(0.45, '#ff9a2e'); g.addColorStop(1, '#e8561a'); return g; }
  function text(ctx, str, x, y, size, o) {
    ctx.save();
    ctx.font = `${o.weight || 400} ${size}px "${o.font || 'Potta One'}"`; ctx.letterSpacing = (o.track || 0) * size + 'px';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const dx = (o.track || 0) * size / 2; ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = size * 0.18; ctx.shadowOffsetY = size * 0.06;
    ctx.strokeStyle = 'rgba(6,4,14,0.92)'; ctx.lineWidth = size * (o.stroke === undefined ? 0.1 : o.stroke); if (ctx.lineWidth > 0) ctx.strokeText(str, x + dx, y);
    ctx.shadowColor = o.glow || 'transparent'; ctx.shadowBlur = o.glow ? size * 0.35 : 0; ctx.shadowOffsetY = 0;
    ctx.fillStyle = o.fill === 'logo' ? logoGrad(ctx, y - size * 0.5, y + size * 0.45) : (o.fill || '#fff'); ctx.fillText(str, x + dx, y);
    ctx.restore();
  }
  function srand(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  // Crack branches from (cx, cy): fixed per run.
  let CR = null, SH = null;
  function cracks(W, H, cx, cy) {
    if (CR && CR.W === W) return CR;
    const r = srand(17), br = [];
    for (let i = 0; i < 11; i++) {
      let an = i / 11 * Math.PI * 2 + (r() - 0.5) * 0.4, x = cx, y = cy; const pts = [[x, y]], n = 6 + Math.floor(r() * 5), seg = Math.max(W, H) * (0.04 + r() * 0.03);
      for (let j = 0; j < n; j++) { an += (r() - 0.5) * 0.7; x += Math.cos(an) * seg; y += Math.sin(an) * seg; pts.push([x, y]); }
      br.push({ pts, d: r() * 0.35, w: 1 + r() * 2 });
    }
    return (CR = { W, br });
  }
  // Shards: wedges round (cx, cy), each cut in two along the radius.
  function shards(W, H, cx, cy) {
    if (SH && SH.W === W) return SH;
    const r = srand(5), list = [], N = 16, R = Math.hypot(W, H);
    const ang = []; for (let i = 0; i < N; i++) ang.push(i / N * Math.PI * 2 + (r() - 0.5) * 0.25);
    for (let i = 0; i < N; i++) {
      const a0 = ang[i], a1 = ang[(i + 1) % N] + (i === N - 1 ? Math.PI * 2 : 0), rm = R * (0.12 + r() * 0.2);
      const p = (a, d) => [cx + Math.cos(a) * d, cy + Math.sin(a) * d];
      list.push({ poly: [[cx, cy], p(a0, rm), p(a1, rm * (0.9 + r() * 0.2))], a: (a0 + a1) / 2, v: 0.9 + r() * 0.8, spin: (r() - 0.5) * 0.12 });
      list.push({ poly: [p(a0, rm), p(a0, R), p(a1, R), p(a1, rm * (0.9 + r() * 0.2))], a: (a0 + a1) / 2, v: 0.5 + r() * 0.5, spin: (r() - 0.5) * 0.06 });
    }
    return (SH = { W, list });
  }
  let off = null;
  window.__OVX = window.__OVX || {};
  window.__OVX.logoBreak = function (ctx, it, f, W, H) {
    if (f < it.from || f >= it.to) return;
    const t = f - it.from, size = (it.size || 150) * H / 1080, x = W / 2, y = H * it.y, lines = it.lines || ['STICKMAN EVOLUTION'];
    const cx = W * (it.cx === undefined ? 0.5 : it.cx), cy = H * (it.cy === undefined ? 0.5 : it.cy);
    // The card on its own canvas: black, the logo, and the cracks so far.
    off = off || document.createElement('canvas'); if (off.width !== W) { off.width = W; off.height = H; }
    const o = off.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, W, H);
    o.fillStyle = '#04020a'; o.fillRect(0, 0, W, H);
    const a = clamp01(t / 3);
    o.save(); o.globalAlpha = a; o.translate(x, y);
    const sc = 1 + 0.4 * (1 - ease(t / 10)); o.save(); o.scale(sc, sc); const lh = size * 0.98;
    lines.forEach((ln, i) => text(o, ln, 0, i * lh, size, { font: 'SE Logo Brush', fill: 'logo', track: 0.02, stroke: 0.06, glow: 'rgba(255,110,30,0.45)' }));
    o.restore();
    o.globalAlpha = a * clamp01((t - 8) / 10); text(o, 'THE 95TH', 0, (lines.length - 1) * lh + size * 0.82, size * 0.34, { fill: '#f3e6d4', track: 0.5, stroke: 0.12 });
    o.restore();
    if (f >= it.crackAt) {
      // Cracks arrive in ticks (each one a hit from behind), light coming through them.
      const k = Math.min(1, (f - it.crackAt) / (it.breakAt - it.crackAt)), steps = [0, 0.18, 0.42, 0.7, 1], kk = steps.filter(s => s <= k + 1e-6).pop();
      const C = cracks(W, H, cx, cy);
      o.save(); o.lineCap = 'round'; o.lineJoin = 'round';
      const glow = o.createRadialGradient(cx, cy, 2, cx, cy, H * (0.1 + 0.4 * kk)); glow.addColorStop(0, `rgba(0,212,255,${0.35 * kk})`); glow.addColorStop(1, 'rgba(0,212,255,0)');
      o.globalCompositeOperation = 'lighter'; o.fillStyle = glow; o.fillRect(0, 0, W, H);
      for (const b of C.br) {
        const u = clamp01((kk - b.d) / (1 - b.d)) * (b.pts.length - 1); if (u <= 0) continue;
        o.beginPath(); o.moveTo(b.pts[0][0], b.pts[0][1]);
        for (let i = 0; i < b.pts.length - 1 && i < u; i++) { const fr = Math.min(1, u - i), p = b.pts[i], q = b.pts[i + 1]; o.lineTo(p[0] + (q[0] - p[0]) * fr, p[1] + (q[1] - p[1]) * fr); }
        o.shadowColor = '#00d4ff'; o.shadowBlur = 18 * H / 1080; o.strokeStyle = '#00d4ff'; o.lineWidth = (3 + b.w) * H / 1080; o.globalAlpha = 0.9; o.stroke();
        o.shadowBlur = 0; o.strokeStyle = '#effdff'; o.lineWidth = 1.2 * H / 1080; o.globalAlpha = 1; o.stroke();
      }
      o.restore();
    }
    if (f < it.breakAt) { ctx.drawImage(off, 0, 0); return; }
    // Broken: the pieces fly out and toward the camera; the shot underneath shows through.
    const u = (f - it.breakAt) / Math.max(1, it.to - it.breakAt), S = shards(W, H, cx, cy);
    for (const s of S.list) {
      const d = ease(u) * H * 0.9 * s.v, z = 1 + u * 1.6 * s.v, al = 1 - clamp01((u - 0.3) / 0.7);
      if (al <= 0) continue;
      ctx.save(); ctx.globalAlpha = al;
      ctx.translate(cx + Math.cos(s.a) * d, cy + Math.sin(s.a) * d); ctx.rotate(s.spin * (f - it.breakAt) * 0.5); ctx.scale(z, z); ctx.translate(-cx, -cy);
      ctx.beginPath(); s.poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      ctx.save(); ctx.clip(); ctx.drawImage(off, 0, 0); ctx.restore();
      ctx.strokeStyle = '#7fe9ff'; ctx.lineWidth = 2 * H / 1080; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 12; ctx.stroke();
      ctx.restore();
    }
    // The flash of it going.
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 * Math.max(0, 1 - u * 5); ctx.fillStyle = '#9ff0ff'; ctx.fillRect(0, 0, W, H);
  };
})();
