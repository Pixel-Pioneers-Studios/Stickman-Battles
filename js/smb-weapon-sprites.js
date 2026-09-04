// ── Weapon sprite atlas ───────────────────────────────────────────────────────
// Hand-drawn PNG art for weapons that have it. Everything else stays procedural.
//
// Each sprite is pre-rotated so the shaft runs along +x with the blade at the
// right edge — the same local frame drawWeapon() uses for the vector weapons.
//   len     display length in game units (the sprite is scaled to this width)
//   anchor  fraction along the length where the hand grips it (0 = butt end)
//   shaftY  fraction down the sprite height where the shaft axis sits, so the
//           pole — not the image box — lines up with the hand
//
// Loading is fire-and-forget: `ready` stays false until the image decodes, and
// drawWeapon() falls back to the procedural art until then (and forever, if the
// file is missing). Nothing here can block or break the render pipeline.

const WEAPON_SPRITE_DEFS = {
  axe:    { src: 'images/weapons/axe.png',    len: 58, anchor: 0.20, shaftY: 21.5 / 55 },
  scythe: { src: 'images/weapons/scythe.png', len: 58, anchor: 0.19, shaftY: 41.4 / 99 },
};

const WEAPON_SPRITES = {};

(function loadWeaponSprites() {
  for (const key in WEAPON_SPRITE_DEFS) {
    const def  = WEAPON_SPRITE_DEFS[key];
    const slot = { ready: false, img: null, len: def.len, anchor: def.anchor, shaftY: def.shaftY };
    WEAPON_SPRITES[key] = slot;
    try {
      const img = new Image();
      img.onload  = () => { slot.img = img; slot.ready = true; };
      img.onerror = () => { slot.ready = false; };
      img.src = def.src;
    } catch (e) {
      slot.ready = false;
    }
  }
})();
