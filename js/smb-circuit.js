// ============================================================================
// THE CIRCUIT — PLATE CONTROL
// ----------------------------------------------------------------------------
// Sovereign's arena is a void with one perforated plate laid across it. The voids
// in that plate are permanent features of the substrate: Sovereign never opens one
// and never closes one. He slides the entire plate, and the voids travel with it,
// under whoever happens to be standing there.
//
// This is the mechanical form of what he is. God builds, the Void Mind erases,
// Sovereign controls (docs/canon.md — SOVEREIGN, THE THIRD PRINCIPLE). He creates
// nothing and destroys nothing here. He positions. The stage is not a hazard he
// summons; it is a board he moves.
//
// Contract with the rest of the engine:
//   - The arena data in smb-data-arenas.js is the AUTHORING source (px / plateF /
//     anchor). This file owns pl.x and pl.w every frame and writes them from the
//     current offset. Nothing else should mutate Circuit platform positions.
//   - Voids are gaps between real isFloor segments, so cliff detection, lethal-fall
//     recovery and pathfinding read them for free. Do not collapse the segments back
//     into one wide floor.
//   - The two outer segments are ANCHORS whose outer edges are pinned. The stage's
//     kill boundary never moves; only the voids do. Sovereign already wins edge
//     conversion 4-0 and does not get to slide the killing lip at the player.
//
// Load order: after smb-data-arenas.js (needs ARENAS to exist for authoring fields),
// before smb-loop-core.js (which drives update/draw). Runtime globals used —
// currentArena, players, gameRunning, frameCount, ctx, lerp, clamp — are all
// resolved lazily inside functions, never at load time.
// ============================================================================

const CIRCUIT_TUNE = {
  enabled:      true,  // master switch — off restores a static neutral plate
  telegraph:     34,   // frames of warning before the plate commits to a slide
  ease:        0.055,  // lerp rate once sliding (a full 130px throw takes ~1.2s)
  minGapFrames: 150,   // cooldown after a slide settles, so it never feels strobed
  minTravel:     34,   // ignore slide requests smaller than this — no twitching
  autoDrift:  false,   // idle heartbeat — off: every slide must come from a read
  driftGap:     420,   // frames between idle drifts
  ownerSafe:   true,   // never park a void under Sovereign's own feet
};

const CircuitPlate = (function () {
  const FLOOR_TOP = 460;   // plate surface y — all segments share it

  let bound     = null;    // arena object this state was derived from
  let offset    = 0;       // current plate offset, px
  let target    = 0;       // offset being eased toward
  let phase     = 'idle';  // 'idle' | 'telegraph' | 'slide'
  let timer     = 0;       // telegraph countdown
  let cooldown  = 0;       // frames until another slide may be requested
  let driftTick = 0;       // idle heartbeat counter
  let reason    = '';      // why the current slide was requested (debug/advisor)
  let lastSpans = [];      // cached void spans, recomputed each apply()

  function active() {
    return CIRCUIT_TUNE.enabled &&
           typeof currentArena !== 'undefined' && currentArena &&
           !!currentArena.isCircuitPlate &&
           Array.isArray(currentArena.platforms);
  }

  function range() {
    return (currentArena && currentArena.plateRange) || 130;
  }

  // ── Geometry ──────────────────────────────────────────────────────────────
  // Write pl.x / pl.w for a given offset. Anchors keep their outer edge pinned and
  // change width; everything else translates by offset * plateF.
  function apply(off) {
    const plats = currentArena.platforms;
    for (const pl of plats) {
      if (!pl || pl.px === undefined) continue;
      if (pl.anchor === 'left') {
        pl.x = pl.px;
        pl.w = Math.max(24, (pl.pxInner + off) - pl.px);
      } else if (pl.anchor === 'right') {
        const nx = pl.px + off;
        pl.x = nx;
        pl.w = Math.max(24, pl.pxOuter - nx);
      } else {
        pl.x = pl.px + off * (pl.plateF === undefined ? 1 : pl.plateF);
      }
    }
    lastSpans = computeSpans();
  }

  // Void spans = the gaps between consecutive live floor segments, left to right.
  function computeSpans() {
    if (!active()) return [];
    const segs = currentArena.platforms
      .filter(p => p && p.isFloor && !p.isFloorDisabled)
      .sort((a, b) => a.x - b.x);
    const out = [];
    for (let i = 0; i < segs.length - 1; i++) {
      const gapL = segs[i].x + segs[i].w;
      const gapR = segs[i + 1].x;
      if (gapR - gapL > 6) out.push({ x: gapL, w: gapR - gapL });
    }
    return out;
  }

  // Where the voids WOULD be at a hypothetical offset, without disturbing live
  // geometry. Used for the telegraph and for owner-safety checks.
  function spansAt(off) {
    const plats = currentArena.platforms;
    const segs = [];
    for (const pl of plats) {
      if (!pl || !pl.isFloor || pl.isFloorDisabled || pl.px === undefined) continue;
      let x, w;
      if (pl.anchor === 'left')       { x = pl.px;      w = Math.max(24, (pl.pxInner + off) - pl.px); }
      else if (pl.anchor === 'right') { x = pl.px + off; w = Math.max(24, pl.pxOuter - x); }
      else                            { x = pl.px + off * (pl.plateF === undefined ? 1 : pl.plateF); w = pl.w; }
      segs.push({ x, w });
    }
    segs.sort((a, b) => a.x - b.x);
    const out = [];
    for (let i = 0; i < segs.length - 1; i++) {
      const gapL = segs[i].x + segs[i].w;
      const gapR = segs[i + 1].x;
      if (gapR - gapL > 6) out.push({ x: gapL, w: gapR - gapL });
    }
    return out;
  }

  function sovereign() {
    if (typeof players === 'undefined' || !Array.isArray(players)) return null;
    return players.find(p => p && p.isSovereignMK2 && p.health > 0) || null;
  }

  // He is never caught out by his own board. This is a fairness guard AND a canon
  // one: the entity that positions does not get positioned. It also removes a whole
  // class of pathfinding failure where the plate drops him mid-pursuit.
  function safeForOwner(off) {
    if (!CIRCUIT_TUNE.ownerSafe) return true;
    const s = sovereign();
    if (!s) return true;

    // Which x does he need to be solid? Standing: where he is. Airborne: where he
    // is going to come down. The airborne case is not optional — the first version
    // of this guard only checked the grounded case, so a slide could legally park a
    // void under his landing spot, and his recovery would then pogo him into the
    // sky. He is the one who positions; he does not get positioned.
    let cx;
    if (s.onGround) {
      if (Math.abs((s.y + s.h) - FLOOR_TOP) > 26) return true;  // up on a deck — unaffected
      cx = s.cx();
    } else {
      const framesToFloor = Math.min(60, Math.max(0, (FLOOR_TOP - (s.y + s.h)) / Math.max(0.8, s.vy || 0.8)));
      cx = s.cx() + (s.vx || 0) * framesToFloor;
    }

    for (const sp of spansAt(off)) {
      if (cx > sp.x - 34 && cx < sp.x + sp.w + 34) return false;
    }
    return true;
  }

  // ── Public: request a slide ───────────────────────────────────────────────
  // Returns true if the request was accepted. Rejected while a slide is already
  // running, during cooldown, for trivial travel, or if it would drop Sovereign.
  function requestSlide(want, why) {
    if (!active() || phase !== 'idle' || cooldown > 0) return false;
    const r = range();
    let t = Math.max(-r, Math.min(r, want));
    if (Math.abs(t - offset) < CIRCUIT_TUNE.minTravel) return false;
    if (!safeForOwner(t)) {
      // Try the mirrored throw before giving up — usually still achieves the intent.
      const alt = Math.max(-r, Math.min(r, -t));
      if (Math.abs(alt - offset) < CIRCUIT_TUNE.minTravel || !safeForOwner(alt)) return false;
      t = alt;
    }
    target = t;
    phase  = 'telegraph';
    timer  = CIRCUIT_TUNE.telegraph;
    reason = why || 'unspecified';
    driftTick = 0;
    return true;
  }

  // Convenience for callers that think in intent rather than in px: push the voids
  // toward a world x. Sovereign's platform-denial will use this.
  function slideVoidToward(worldX, why) {
    if (!active()) return false;
    // Pick the offset that puts a void nearest the requested x.
    const r = range();
    let best = null, bestD = Infinity;
    for (let off = -r; off <= r; off += 10) {
      for (const sp of spansAt(off)) {
        const d = Math.abs((sp.x + sp.w / 2) - worldX);
        if (d < bestD) { bestD = d; best = off; }
      }
    }
    if (best === null) return false;
    return requestSlide(best, why);
  }

  function reset() {
    bound = (typeof currentArena !== 'undefined') ? currentArena : null;
    offset = 0; target = 0; phase = 'idle'; timer = 0;
    cooldown = 0; driftTick = 0; reason = ''; lastSpans = [];
    if (active()) apply(0);
  }

  // ── Per-frame ─────────────────────────────────────────────────────────────
  function update() {
    if (!active()) { bound = null; return; }
    if (bound !== currentArena) reset();

    if (cooldown > 0) cooldown--;

    if (phase === 'telegraph') {
      timer--;
      if (timer <= 0) phase = 'slide';
    } else if (phase === 'slide') {
      const _lerp = (typeof lerp === 'function') ? lerp : (a, b, t) => a + (b - a) * t;
      offset = _lerp(offset, target, CIRCUIT_TUNE.ease);
      if (Math.abs(target - offset) < 0.6) {
        offset   = target;
        phase    = 'idle';
        cooldown = CIRCUIT_TUNE.minGapFrames;
      }
    } else if (CIRCUIT_TUNE.autoDrift && typeof gameRunning !== 'undefined' && gameRunning) {
      // Scaffolding from before Sovereign drove the plate, kept behind a flag that
      // now ships off. It was predicted to stop firing on its own once his
      // platform-denial owned the plate; it did not, because his own cooldown is
      // longer than driftGap, so the two simply alternated and most plate movement
      // the player saw carried no read behind it. The arena then reads as a stage
      // hazard instead of as him. Do not re-enable to make the stage "feel alive".
      driftTick++;
      if (driftTick >= CIRCUIT_TUNE.driftGap && cooldown <= 0) {
        driftTick = 0;
        const r = range();
        requestSlide((Math.random() < 0.5 ? -1 : 1) * (r * (0.55 + Math.random() * 0.45)), 'drift');
      }
    }

    apply(offset);
  }

  // ── Background layer (drawn before platforms) ─────────────────────────────
  // The void reads as void: a cold lattice receding into nothing under each gap.
  function draw() {
    if (!active() || typeof ctx === 'undefined') return;
    const f = (typeof frameCount === 'number') ? frameCount : 0;
    ctx.save();
    for (const sp of lastSpans) {
      // Depth gradient down the shaft
      const g = ctx.createLinearGradient(0, FLOOR_TOP - 4, 0, FLOOR_TOP + 150);
      g.addColorStop(0,   'rgba(0,0,0,0.95)');
      g.addColorStop(0.4, 'rgba(6,0,10,0.75)');
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sp.x, FLOOR_TOP - 4, sp.w, 154);

      // Lattice rungs falling away — sells motion when the plate slides
      ctx.strokeStyle = 'rgba(170,10,10,0.16)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const yy = FLOOR_TOP + 12 + i * 26 + ((f * 0.6) % 26);
        const inset = 4 + i * 5;
        if (sp.w - inset * 2 <= 0) continue;
        ctx.globalAlpha = 0.5 - i * 0.09;
        ctx.beginPath();
        ctx.moveTo(sp.x + inset, yy);
        ctx.lineTo(sp.x + sp.w - inset, yy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // ── Overlay layer (drawn after platforms) ─────────────────────────────────
  // Two jobs: make the live void edges unmistakable, and telegraph where the voids
  // are about to be. The telegraph is the whole fairness contract of this arena —
  // the player must always be able to see a void coming and leave.
  function drawOverlay() {
    if (!active() || typeof ctx === 'undefined') return;
    const f = (typeof frameCount === 'number') ? frameCount : 0;
    ctx.save();

    // Live void lips — a bright edge on the standable side of every gap.
    for (const sp of lastSpans) {
      ctx.fillStyle = 'rgba(255,60,40,0.5)';
      ctx.fillRect(sp.x - 3, FLOOR_TOP, 3, 5);
      ctx.fillRect(sp.x + sp.w, FLOOR_TOP, 3, 5);
    }

    // Telegraph — the spans that are about to become void, marked on the floor the
    // player is currently standing on. Ramps in over the warning window.
    if (phase === 'telegraph') {
      const t     = 1 - (timer / Math.max(1, CIRCUIT_TUNE.telegraph)); // 0 → 1
      const pulse = 0.5 + 0.5 * Math.sin(f * 0.35);
      const a     = 0.18 + t * 0.34 + pulse * 0.10;
      for (const sp of spansAt(target)) {
        ctx.fillStyle = `rgba(220,20,20,${a.toFixed(3)})`;
        ctx.fillRect(sp.x, FLOOR_TOP, sp.w, 16);

        // Hatching, so it is legible even for colour-blind players and at low alpha
        ctx.strokeStyle = `rgba(255,140,110,${(0.25 + t * 0.4).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        for (let hx = sp.x - 16; hx < sp.x + sp.w; hx += 12) {
          ctx.beginPath();
          ctx.moveTo(hx, FLOOR_TOP + 16);
          ctx.lineTo(hx + 16, FLOOR_TOP);
          ctx.stroke();
        }

        // Travel arrow — which way the plate is throwing
        const dir = Math.sign(target - offset) || 1;
        const midX = sp.x + sp.w / 2, midY = FLOOR_TOP - 12;
        ctx.strokeStyle = `rgba(255,90,60,${(0.4 + t * 0.5).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(midX - 12 * dir, midY);
        ctx.lineTo(midX + 12 * dir, midY);
        ctx.moveTo(midX + 12 * dir, midY);
        ctx.lineTo(midX + 4 * dir,  midY - 5);
        ctx.moveTo(midX + 12 * dir, midY);
        ctx.lineTo(midX + 4 * dir,  midY + 5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── Queries for AI / debug ────────────────────────────────────────────────
  function isOverVoid(x, pad) {
    const p = pad || 0;
    for (const sp of lastSpans) if (x > sp.x - p && x < sp.x + sp.w + p) return true;
    return false;
  }

  function status() {
    return {
      active: active(), phase, offset: +offset.toFixed(1), target,
      cooldown, reason, range: active() ? range() : 0,
      voids: lastSpans.map(s => `${Math.round(s.x)}..${Math.round(s.x + s.w)}`),
    };
  }

  return {
    update, draw, drawOverlay, reset,
    requestSlide, slideVoidToward,
    voidSpans: () => lastSpans.slice(),
    spansAt, isOverVoid, status,
    get offset() { return offset; },
    get phase()  { return phase; },
  };
})();
