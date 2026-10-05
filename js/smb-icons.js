'use strict';
// smb-icons.js — inline SVG icon set, replacing emoji across the UI.
//
// Emoji render differently on every OS, carry their own colour palette that
// fights the theme, and read as text rather than as game art. These are flat
// silhouettes on a 24x24 grid drawn in currentColor, so they inherit the
// colour of whatever they sit in.
//
// Two-tone: any element tagged class="a" is the secondary/accent pass — see
// `.smb-icon .a` in SMB.css. Use it for the part of a shape that should sit
// back (a blade's fuller, a shield's boss, the far wing of a plane).
//
// Depends on: nothing. Loaded early so every later file can call smbIcon().

const SMB_ICONS = {

  // ── Weapons ───────────────────────────────────────────────
  dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="8.5" cy="8.5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="15.5" cy="15.5" r="1.6"/>',

  sword: '<path d="M12 1.5 14.2 6.2V14H9.8V6.2Z"/><path class="a" d="M11.4 6.6h1.2V14h-1.2z"/><rect x="6.4" y="14" width="11.2" height="2.3" rx="1.15"/><rect x="10.9" y="16.3" width="2.2" height="4.4" rx="1.1"/><rect x="9.6" y="20.4" width="4.8" height="2" rx="1"/>',

  katana: '<path d="M19.6 2.2c.7.7.6 1.5-.3 2.6l-8.6 10.4-2-1.7L17 2.9c1-1.1 1.9-1.4 2.6-.7z"/><ellipse cx="8" cy="16.1" rx="2.6" ry="1.6" transform="rotate(-40 8 16.1)" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="2.6" y="17.4" width="5.4" height="2.2" rx="1.1" transform="rotate(40 5.3 18.5)"/>',

  hammer: '<rect x="3.6" y="3.2" width="16.8" height="7" rx="2.2"/><path class="a" d="M8.2 3.2h2.2v7H8.2zM13.6 3.2h2.2v7h-2.2z"/><rect x="10.5" y="10.2" width="3" height="11.4" rx="1.5"/>',

  gun: '<path d="M2.4 6.6h15.2a2.2 2.2 0 0 1 2.2 2.2v2.8H2.4z"/><path d="M6.2 11.6h5.6l-2 8.1a1.5 1.5 0 0 1-1.46 1.15H6.05a1.6 1.6 0 0 1-1.57-1.93z"/><path class="a" d="M12.4 11.6a4 4 0 0 1-3 3.8" fill="none" stroke="currentColor" stroke-width="1.7"/>',

  axe: '<rect x="10.6" y="2.4" width="2.8" height="19.6" rx="1.4"/><rect x="6.4" y="3.2" width="4.6" height="5.6" rx="1.3"/><path d="M12.9 2.9c5.5.4 9.3 3 9.3 6.2 0 2.4-2.1 4.4-5.3 5.3l-4 1.1z"/><path class="a" d="M14.6 5.8c2.8.6 4.6 1.9 4.6 3.4 0 1.1-1 2.1-2.6 2.7l-2 .6z" fill="#000" opacity=".28"/>',

  spear: '<path d="M12 1.2 15.4 8.6H8.6Z"/><rect x="8.6" y="8.6" width="6.8" height="1.9" rx=".95"/><rect x="10.8" y="10.5" width="2.4" height="11.6" rx="1.2"/>',

  bow: '<path d="M16.4 2.4a13.6 13.6 0 0 1 0 19.2" fill="none" stroke="currentColor" stroke-width="2.4"/><path class="a" d="M16.4 2.4v19.2" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="2.6" y="11" width="17.4" height="2" rx="1"/><path d="M23 12 18.4 9.2v5.6z"/><path class="a" d="M2.6 12 6.2 9.4v5.2z"/>',

  shield: '<path d="M12 1.6 20.4 4.7v6.2c0 5.2-3.4 8.8-8.4 11.5C7 19.7 3.6 16.1 3.6 10.9V4.7Z"/><path class="a" d="M12 5.4c-.5 0-.9.4-.9.9v2.4H8.7a.9.9 0 0 0 0 1.8h2.4v4.3a.9.9 0 0 0 1.8 0v-4.3h2.4a.9.9 0 0 0 0-1.8h-2.4V6.3a.9.9 0 0 0-.9-.9z" fill="#000" opacity=".38"/>',

  scythe: '<rect x="16.6" y="2.6" width="2.8" height="19.4" rx="1.4" transform="rotate(10 18 12.3)"/><path d="M18.4 3.8C10.2 3.8 3.6 8.9 1.2 16.4" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/><path d="M1.8 19.6.6 14.2l4.6 1.4z"/>',

  fryingpan: '<circle cx="9.4" cy="12" r="6.6"/><circle class="a" cx="9.4" cy="12" r="3.6" fill="#000" opacity=".28"/><rect x="15.6" y="10.8" width="6.6" height="2.5" rx="1.25"/>',

  broomstick: '<rect x="10.9" y="1.8" width="2.4" height="11.4" rx="1.2"/><path d="M7.6 13.2h8.8l2.2 8.6H5.4z"/><path class="a" d="M10.2 13.2h1.4l-.7 8.6H9.4zM13 13.2h1.4l1.1 8.6h-1.5z" fill="#000" opacity=".3"/>',

  fist: '<path d="M5.2 12.4a2.9 2.9 0 0 1 2.9-2.9h10a2.9 2.9 0 0 1 2.9 2.9v2.3a5.3 5.3 0 0 1-5.3 5.3h-5.2a5.3 5.3 0 0 1-5.3-5.3z"/><path d="M7.6 9.9V7.7a1.9 1.9 0 1 1 3.8 0v2.2zM11.4 9.9V6.9a1.9 1.9 0 1 1 3.8 0v3zM15.2 9.9V8a1.9 1.9 0 1 1 3.8 0v1.9z"/><path class="a" d="M4.6 13.6h8.2a1.8 1.8 0 0 1 0 3.6H4.6z" fill="#000" opacity=".32"/>',

  sprout: '<rect x="10.9" y="11" width="2.2" height="11" rx="1.1"/><path d="M11.4 12.2C11.4 7.6 8 4.6 3.2 4.6c0 4.6 3.4 7.6 8.2 7.6z"/><path class="a" d="M12.6 12.2c0-3.8 2.8-6.4 6.8-6.4 0 3.8-2.8 6.4-6.8 6.4z"/>',

  slingshot: '<path d="M7.4 2.6 11 10M16.6 2.6 13 10" fill="none" stroke="currentColor" stroke-width="2.4"/><path class="a" d="M7.4 2.6C10 6.6 14 6.6 16.6 2.6" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="10.8" y="9.6" width="2.4" height="12.2" rx="1.2"/>',

  plane: '<path d="M21.6 2.4 2.6 10.2l7 2.6 2.6 7.6z"/><path class="a" d="M9.6 12.8 21.6 2.4l-8 14.2z" fill="#000" opacity=".32"/>',

  flail: '<rect x="1.4" y="17.2" width="8.4" height="3" rx="1.5" transform="rotate(-42 5.6 18.7)"/><circle cx="9.2" cy="13.4" r="1.25" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="11.6" cy="10.8" r="1.25" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="15.8" cy="7.4" r="4.3"/><path class="a" d="M15.8 1v2.4M15.8 11.4v2.4M9.5 7.4h2.4M19.7 7.4h2.4M11.6 3.2l1.7 1.7M18.3 9.9l1.7 1.7M20 3.2l-1.7 1.7M13.3 9.9l-1.7 1.7" fill="none" stroke="currentColor" stroke-width="1.9"/>',

  whip: '<rect x="1" y="17" width="6.4" height="3.2" rx="1.6" transform="rotate(14 4.2 18.6)"/><path d="M6.8 19c4.6-.6 4.2-7 8.4-7 3.2 0 3-5.4 7.6-5.6" fill="none" stroke="currentColor" stroke-width="2.3"/>',

  boomerang: '<path d="M5.4 3.2 11.8 13.4 21 17.6" fill="none" stroke="currentColor" stroke-width="4.6"/><path class="a" d="M5.4 3.2 11.8 13.4 21 17.6" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.5"/>',

  flame: '<path d="M12.6 1.4c3.2 4.4 6.4 6.6 6.4 10.8a7 7 0 0 1-14 0c0-2.4 1.2-4.2 3-5.8.4 1.8 1.4 2.8 2.4 3-.8-3.4.6-6.2 2.2-8z"/><path class="a" d="M12.4 11.6c1.6 2 3 3.2 3 5a3.4 3.4 0 0 1-6.8 0c0-1.6 1.4-2.8 2.4-3.8.2.9.7 1.3 1.1 1.4-.4-1.2-.2-1.9.3-2.6z" fill="#000" opacity=".3"/>',

  bolt: '<path d="M13.6 1 7 12.4h4L9.8 23 17.4 10h-4.2z"/>',

  // ── Classes ───────────────────────────────────────────────
  crossedswords: '<path d="M3.4 3.4h3.2l11 11-3.2 3.2z"/><path d="M20.6 3.4h-3.2l-11 11 3.2 3.2z"/><rect class="a" x="2.4" y="17.6" width="5.4" height="2.4" rx="1.2" transform="rotate(-45 5.1 18.8)"/><rect class="a" x="16.2" y="17.6" width="5.4" height="2.4" rx="1.2" transform="rotate(45 18.9 18.8)"/>',

  circleDash: '<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3.4 2.8"/>',

  shuriken: '<path d="M12 1.6 15 9l7.4 3-7.4 3-3 7.4-3-7.4-7.4-3 7.4-3z"/><circle class="a" cx="12" cy="12" r="2.2" fill="#000" opacity=".38"/>',

  helmet: '<path d="M12 1.8c4.8 0 8 3.2 8 8v4.6c0 4-3.4 7.8-8 7.8s-8-3.8-8-7.8V9.8c0-4.8 3.2-8 8-8z"/><path class="a" d="M10.4 8.2h3.2v7.4h-3.2z" fill="#000" opacity=".4"/><path class="a" d="M5 10.6h4.2v2H5zM14.8 10.6H19v2h-4.2z" fill="#000" opacity=".4"/>',

  skull: '<path d="M12 1.8c5 0 8.6 3.6 8.6 8.4 0 2.8-1.2 4.8-2.8 6v3a1.8 1.8 0 0 1-1.8 1.8H8a1.8 1.8 0 0 1-1.8-1.8v-3c-1.6-1.2-2.8-3.2-2.8-6 0-4.8 3.6-8.4 8.6-8.4z"/><circle class="a" cx="8.6" cy="10.4" r="2.4" fill="#000" opacity=".45"/><circle class="a" cx="15.4" cy="10.4" r="2.4" fill="#000" opacity=".45"/><path class="a" d="M10.8 14.6h2.4l-1.2 2.6z" fill="#000" opacity=".45"/>',

  burst: '<path d="M12 1.4 14.4 8l6.6-2.2-4 5.8 4.6 4.6-6.6.4-1.6 6.6-3.4-5.8-6.2 2.4 2.8-6.2L2 9.4l6.6-.6z"/>',

  crosshair: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 1.6v5M12 17.4v5M1.6 12h5M17.4 12h5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle class="a" cx="12" cy="12" r="2.4"/>',

  cross: '<path d="M9.8 1.8h4.4v7.4h7.4v4.4h-7.4v8.6H9.8v-8.6H2.4V9.2h7.4z"/>',

  doubleaxe: '<rect x="10.8" y="1.6" width="2.4" height="20.8" rx="1.2"/><path d="M13.6 3.2c3.9.8 6.4 3.3 6.4 6.4s-2.5 5.6-6.4 6.4c1-2 1.5-4.1 1.5-6.4s-.5-4.4-1.5-6.4z"/><path d="M10.4 3.2C6.5 4 4 6.5 4 9.6s2.5 5.6 6.4 6.4c-1-2-1.5-4.1-1.5-6.4s.5-4.4 1.5-6.4z"/>',

  glove: '<path d="M7.6 9.4a5.2 5.2 0 0 1 5.2-5.2h2.5a4.9 4.9 0 0 1 4.9 4.9v3.5a4.9 4.9 0 0 1-4.9 4.9h-2.9a4.8 4.8 0 0 1-4.8-4.8z"/><path d="M7.4 11.2a3.1 3.1 0 0 0-3.1 3.1v.6a3.1 3.1 0 0 0 3.1 3.1z"/><rect class="a" x="9.2" y="18" width="10.6" height="3.4" rx="1.7"/><path class="a" d="M12.9 4.4v5" fill="none" stroke="#000" stroke-opacity=".32" stroke-width="1.6"/>',

  orbit: '<circle cx="12" cy="12" r="3.2"/><circle cx="12" cy="12" r="8.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3"/><circle class="a" cx="12" cy="3.2" r="2.1"/><circle class="a" cx="19.6" cy="16.4" r="2.1"/><circle class="a" cx="4.4" cy="16.4" r="2.1"/>',

  // ── Achievements ──────────────────────────────────────────
  // Drawn to sit inside the hex badge (see achBadgeSVG), so they favour solid
  // masses over hairlines. Black-at-opacity details read on any tier colour.

  drop: '<path d="M12 2.2C8.6 7.2 5.4 10.9 5.4 14.8a6.6 6.6 0 0 0 13.2 0c0-3.9-3.2-7.6-6.6-12.6z"/><path d="M8.9 14.8a3.1 3.1 0 0 0 3.1 3.1" fill="none" stroke="#000" stroke-width="1.6" opacity=".35"/>',

  chevrons: '<path d="M5 20l7-5 7 5M5 13.6l7-5 7 5M5 7.2l7-5 7 5" fill="none" stroke="currentColor" stroke-width="2.7"/>',

  heartcrack: '<path d="M12 21.2s-8.8-5.2-8.8-11.4A5 5 0 0 1 12 6.6a5 5 0 0 1 8.8 3.2c0 6.2-8.8 11.4-8.8 11.4z"/><path d="M12.8 6.4 10.4 10.8l3.2 2.2-2.2 4.6" fill="none" stroke="#000" stroke-width="1.7" opacity=".5"/>',

  stopwatch: '<circle cx="12" cy="13.6" r="7.8" fill="none" stroke="currentColor" stroke-width="2.3"/><rect x="9.4" y="1.6" width="5.2" height="2.6" rx="1.1"/><rect x="11" y="3.8" width="2" height="2.4"/><path d="M12 13.6V9.2M18.4 5.4l1.6 1.6" fill="none" stroke="currentColor" stroke-width="2.3"/><circle cx="12" cy="13.6" r="1.5"/>',

  star: '<path d="M12 2.2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.4l-6.1 3.4 1.4-6.8-5.1-4.7 6.9-.8z"/>',

  crown: '<path d="M2.8 7.6l4.8 4.4L12 5l4.4 7 4.8-4.4-1.9 10.6H4.7z"/><rect x="4.6" y="19.4" width="14.8" height="2.6" rx="1.1"/><circle class="a" cx="12" cy="3" r="1.7"/><circle class="a" cx="2.8" cy="6.2" r="1.4"/><circle class="a" cx="21.2" cy="6.2" r="1.4"/>',

  wave: '<path d="M2 20.4c2.4 0 2.4-1.8 4.8-1.8s2.4 1.8 4.8 1.8 2.4-1.8 4.8-1.8 2.4 1.8 4.8 1.8" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M2 15.6c1.6-6.6 6.6-11.2 12.6-11.2 3 0 5.4 1 7.2 2.8-3.4-.6-6.4.8-6.6 3.8-.2 2.6 1.8 3.6 4.2 3.2-1.8 1.4-4.2 1.8-6.4 1.4H2z"/>',

  flag: '<path class="a" d="M1.6 22.4c3-4 6.6-6 10.4-6s7.4 2 10.4 6z"/><rect x="10.8" y="1.8" width="2.2" height="16" rx="1.1"/><path d="M13 2.6h8l-2.4 3.2L21 9h-8z"/>',

  spiral: '<path d="M12.0 11.1 L12.1 11.0 L12.3 11.0 L12.4 11.0 L12.6 11.0 L12.8 11.0 L13.0 11.1 L13.2 11.2 L13.3 11.3 L13.5 11.5 L13.6 11.7 L13.7 11.9 L13.8 12.1 L13.9 12.4 L13.9 12.6 L13.8 12.9 L13.7 13.2 L13.6 13.5 L13.5 13.8 L13.2 14.0 L13.0 14.2 L12.7 14.4 L12.4 14.6 L12.0 14.7 L11.7 14.7 L11.3 14.7 L10.9 14.7 L10.5 14.6 L10.1 14.4 L9.7 14.2 L9.4 13.9 L9.1 13.5 L8.9 13.2 L8.7 12.7 L8.5 12.3 L8.4 11.8 L8.4 11.3 L8.5 10.8 L8.6 10.3 L8.8 9.8 L9.1 9.3 L9.4 8.9 L9.8 8.5 L10.3 8.2 L10.8 7.9 L11.3 7.7 L11.9 7.6 L12.5 7.5 L13.1 7.6 L13.8 7.7 L14.4 7.9 L14.9 8.2 L15.5 8.6 L16.0 9.0 L16.4 9.6 L16.8 10.2 L17.1 10.8 L17.2 11.5 L17.3 12.2 L17.3 13.0 L17.2 13.7 L17.0 14.4 L16.7 15.1 L16.3 15.8 L15.8 16.4 L15.2 16.9 L14.5 17.4 L13.8 17.8 L13.0 18.0 L12.2 18.2 L11.3 18.2 L10.5 18.2 L9.6 18.0 L8.8 17.7 L8.0 17.2 L7.3 16.7 L6.6 16.1 L6.1 15.3 L5.6 14.5 L5.2 13.7 L5.0 12.7 L4.9 11.8 L4.9 10.8 L5.1 9.8 L5.4 8.9 L5.8 8.0 L6.3 7.1 L7.0 6.3 L7.8 5.6 L8.6 5.0 L9.6 4.6 L10.6 4.2 L11.7 4.1 L12.8 4.0 L13.9 4.1 L14.9 4.4 L16.0 4.8 L17.0 5.3 L17.9 6.0 L18.7 6.8 L19.4 7.7 L20.0 8.7 L20.4 9.8 L20.7 11.0 L20.9 12.2 L20.8 13.4 L20.6 14.6 L20.3 15.8 L19.8 16.9 L19.1 18.0 L18.2 18.9 L17.3 19.8 L16.2 20.5 L15.1 21.1 L13.8 21.5 L12.5 21.7 L11.2 21.8 L9.8 21.6 L8.5 21.3 L7.3 20.8 L6.1 20.2" fill="none" stroke="currentColor" stroke-width="2"/>',

  diamond: '<path d="M12 1.6 20.4 12 12 22.4 3.6 12z"/><path d="M12 1.6 15.2 12 12 22.4 8.8 12z" fill="#000" opacity=".22"/><path d="M3.6 12h16.8" stroke="#000" stroke-width="1.2" opacity=".28"/>',

  medal: '<path class="a" d="M6.4 1.6h3.8l2.8 6.6H9.2zM17.6 1.6h-3.8l-1.4 3.3 1.5 3.3h.9z"/><circle cx="12" cy="15.2" r="7"/><path d="M12 10.8l1.3 2.7 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4z" fill="#000" opacity=".35"/>',

  compass: '<circle cx="12" cy="12" r="9.4" fill="none" stroke="currentColor" stroke-width="2.1"/><path d="M16.6 7.4 13.6 13.6 7.4 16.6 10.4 10.4z"/><circle cx="12" cy="12" r="1.3" fill="#000" opacity=".45"/>',

  crate: '<rect x="3" y="4" width="18" height="16" rx="1.6"/><path d="M3 8.6h18M3 15.4h18M5.6 8.6l12.8 6.8" fill="none" stroke="#000" stroke-width="1.5" opacity=".35"/>',

  horns: '<path d="M2.6 2.6c.2 4.4 2 6.8 4.8 7.8L6 12.6c0 5 2.8 8.6 6 9.6 3.2-1 6-4.6 6-9.6l-1.4-2.2c2.8-1 4.6-3.4 4.8-7.8-2 2.6-4.4 3.8-7 4h-4.8c-2.6-.2-5-1.4-7-4z"/><path d="M8.4 13.2l2.6 1.4M15.6 13.2 13 14.6M10 18.2h4" fill="none" stroke="#000" stroke-width="1.7" opacity=".5"/>',

  crescent: '<path d="M14.4 2.4a9.8 9.8 0 1 0 7.2 13.4A7.8 7.8 0 1 1 14.4 2.4z"/><circle class="a" cx="18.4" cy="5.4" r="1.2"/><circle class="a" cx="21" cy="10" r=".9"/>',

  snowflake: '<path d="M12 2v20M3.4 7l17.2 10M3.4 17 20.6 7" fill="none" stroke="currentColor" stroke-width="2.1"/><path d="M9.2 3.4 12 6.2l2.8-2.8M9.2 20.6 12 17.8l2.8 2.8M3.2 10.6 7 9.6 6 5.8M20.8 13.4 17 14.4l1 3.8M3.2 13.4 7 14.4 6 18.2M20.8 10.6 17 9.6l1-3.8" fill="none" stroke="currentColor" stroke-width="1.6"/>',

  claw: '<path d="M5.4 2.6c2.8 5.6 3.2 11.4 1.6 19-2.8-6.4-3.4-13-1.6-19zM12.2 2c2.8 6 3 12.4 1 20-2.6-6.8-3-13.4-1-20zM18.8 3c2.4 5.6 2.4 11.4-.2 18-2.2-6.4-2.2-12.2.2-18z"/>',

  omega: '<path d="M3.6 20.6h5.6v-2.4C6.4 16.8 4.8 14.2 4.8 11A7.2 7.2 0 0 1 12 3.6 7.2 7.2 0 0 1 19.2 11c0 3.2-1.6 5.8-4.4 7.2v2.4h5.6" fill="none" stroke="currentColor" stroke-width="2.6"/>',

  halo: '<ellipse cx="12" cy="4.4" rx="7.4" ry="2.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8.6l1.9 5.4 5.7.2-4.5 3.5 1.6 5.5L12 20l-4.7 3.2 1.6-5.5-4.5-3.5 5.7-.2z"/>',

  eye: '<path d="M1.4 12C4 7 7.8 4.4 12 4.4S20 7 22.6 12C20 17 16.2 19.6 12 19.6S4 17 1.4 12z"/><circle cx="12" cy="12" r="4.4" fill="#000" opacity=".55"/><circle cx="12" cy="12" r="1.8"/>',

  portal: '<ellipse cx="12" cy="12" rx="6.6" ry="9.8" fill="none" stroke="currentColor" stroke-width="2.3"/><ellipse class="a" cx="12" cy="12" rx="3.4" ry="6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 9.2l1 1.8 1.8 1-1.8 1-1 1.8-1-1.8-1.8-1 1.8-1z"/>',

  rocket: '<path d="M12 1.6c3.2 2.6 4.6 6.2 4.6 10.2v5H7.4v-5c0-4 1.4-7.6 4.6-10.2z"/><circle cx="12" cy="9.4" r="1.9" fill="#000" opacity=".45"/><path d="M7.4 12.4 4 16v3.4l3.4-1.8zM16.6 12.4 20 16v3.4l-3.4-1.8z"/><path class="a" d="M9.4 17.8h5.2L12 22.6z"/>',

  flask: '<path d="M8.8 2h6.4v2h-.9v5.2l5.6 9.6A2 2 0 0 1 18.2 22H5.8a2 2 0 0 1-1.7-3.2l5.6-9.6V4h-.9z"/><path d="M6.6 15.2h10.8" stroke="#000" stroke-width="1.5" opacity=".3"/><circle cx="10.4" cy="18.2" r="1" fill="#000" opacity=".3"/><circle cx="14" cy="17.4" r=".8" fill="#000" opacity=".3"/>',

  map: '<path d="M2.4 5.2 8.4 3l7.2 2.4L21.6 3v15.8l-6 2.2-7.2-2.4-6 2.2z"/><path d="M8.4 3v15.6M15.6 5.4V21" stroke="#000" stroke-width="1.5" opacity=".35"/><path d="M11 10.4l2.6 2.6M13.6 10.4 11 13" stroke="#000" stroke-width="1.5" opacity=".5"/>',

  planet: '<circle cx="12" cy="12" r="6.4"/><ellipse cx="12" cy="12" rx="11" ry="3.4" transform="rotate(-24 12 12)" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 9.6c2.4-.8 5.6-.6 8 .6" fill="none" stroke="#000" stroke-width="1.3" opacity=".3"/>',

  infinity: '<path d="M12 12c-2.2-3.2-4-4.6-6-4.6a4.6 4.6 0 0 0 0 9.2c2 0 3.8-1.4 6-4.6s4-4.6 6-4.6a4.6 4.6 0 0 1 0 9.2c-2 0-3.8-1.4-6-4.6z" fill="none" stroke="currentColor" stroke-width="2.5"/>',

  branches: '<path d="M12 22v-8.4M12 13.6 5.4 6.4M12 13.6l6.6-7.2M12 13.6V4.4" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="5" cy="5.4" r="2.6"/><circle cx="19" cy="5.4" r="2.6"/><circle cx="12" cy="3.2" r="2.6"/><circle class="a" cx="12" cy="20.4" r="2"/>',

  // ── UI chrome ─────────────────────────────────────────────
  cap: '<path d="M12 2.6 23 8l-11 5.4L1 8z"/><path d="M5.4 10.8v4.6c0 2.2 3 3.8 6.6 3.8s6.6-1.6 6.6-3.8v-4.6L12 14z"/><path class="a" d="M21.4 8.8v6.4" fill="none" stroke="currentColor" stroke-width="1.5"/>',

  user: '<circle cx="12" cy="7.4" r="4.6"/><path d="M12 13.6c4.8 0 8.6 3 8.6 6.6a1.4 1.4 0 0 1-1.4 1.4H4.8a1.4 1.4 0 0 1-1.4-1.4c0-3.6 3.8-6.6 8.6-6.6z"/>',

  coin: '<circle cx="12" cy="12" r="9.4"/><circle class="a" cx="12" cy="12" r="6.2" fill="none" stroke="#000" stroke-opacity=".34" stroke-width="1.6"/><path class="a" d="M12 7.8v8.4M9.6 10h4.8M9.6 14h4.8" fill="none" stroke="#000" stroke-opacity=".34" stroke-width="1.5"/>',

  gear: '<path d="M10.4 1.6h3.2l.5 2.7 2 .8 2.3-1.5 2.3 2.3-1.5 2.3.8 2 2.7.5v3.2l-2.7.5-.8 2 1.5 2.3-2.3 2.3-2.3-1.5-2 .8-.5 2.7h-3.2l-.5-2.7-2-.8-2.3 1.5-2.3-2.3 1.5-2.3-.8-2-2.7-.5v-3.2l2.7-.5.8-2L3.3 5.9l2.3-2.3 2.3 1.5 2-.8z"/><circle class="a" cx="12" cy="12" r="3.4" fill="#000" opacity=".42"/>',

  chat: '<path d="M12 2.6c5.6 0 10.2 3.6 10.2 8s-4.6 8-10.2 8a13 13 0 0 1-2.6-.3l-5 2.6 1.4-4.2c-2.4-1.5-3.8-3.7-3.8-6.1 0-4.4 4.6-8 10-8z"/><circle class="a" cx="8" cy="10.6" r="1.5" fill="#000" opacity=".35"/><circle class="a" cx="12" cy="10.6" r="1.5" fill="#000" opacity=".35"/><circle class="a" cx="16" cy="10.6" r="1.5" fill="#000" opacity=".35"/>',

  play: '<path d="M6.4 3.2 20 12 6.4 20.8z"/>',

  film: '<rect x="2.2" y="4.2" width="19.6" height="15.6" rx="2.4"/><path class="a" d="M5.6 4.2v15.6M18.4 4.2v15.6" fill="none" stroke="#000" stroke-opacity=".38" stroke-width="1.5"/><path class="a" d="M2.2 12h19.6" fill="none" stroke="#000" stroke-opacity=".38" stroke-width="1.5"/>',

  book: '<path d="M3 3.4h6.2c1.6 0 2.8.9 2.8 2.1v14.8c0-1.2-1.2-2.1-2.8-2.1H3z"/><path d="M21 3.4h-6.2c-1.6 0-2.8.9-2.8 2.1v14.8c0-1.2 1.2-2.1 2.8-2.1H21z" opacity=".72"/>',

  trophy: '<path d="M7 2.6h10v6.2a5 5 0 0 1-10 0z"/><path d="M7 4h-3v1.8a3.4 3.4 0 0 0 3 3.4zM17 4h3v1.8a3.4 3.4 0 0 1-3 3.4z" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="10.6" y="13.4" width="2.8" height="4.4"/><rect x="6.6" y="17.8" width="10.8" height="3.4" rx="1.2"/>',

  clipboard: '<rect x="4" y="3.6" width="16" height="18" rx="2.4"/><rect class="a" x="8.4" y="1.6" width="7.2" height="4" rx="1.6"/><path class="a" d="M8 10.6h8M8 14.2h8M8 17.8h5" fill="none" stroke="#000" stroke-opacity=".4" stroke-width="1.6"/>',

  bookopen: '<path d="M12 5.6c-2-1.8-4.4-2.6-8-2.6v14.4c3.6 0 6 .8 8 2.6z"/><path d="M12 5.6c2-1.8 4.4-2.6 8-2.6v14.4c-3.6 0-6 .8-8 2.6z" opacity=".72"/>',

  home: '<path d="M12 2.2 22 11h-3v9.4a1.4 1.4 0 0 1-1.4 1.4h-3.2v-6h-4.8v6H6.4A1.4 1.4 0 0 1 5 20.4V11H2z"/>',

  lock: '<rect x="4.4" y="10" width="15.2" height="11.6" rx="2.6"/><path d="M7.6 10V7.6a4.4 4.4 0 0 1 8.8 0V10" fill="none" stroke="currentColor" stroke-width="2.2"/><circle class="a" cx="12" cy="15.4" r="1.9" fill="#000" opacity=".42"/>',

  check: '<path d="M20.6 5.4 9.4 16.6 3.4 10.6" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',

  wrench: '<path d="M20.4 3.4a6.6 6.6 0 0 1-8.4 8.4L4.6 19.2a2.4 2.4 0 0 1-3.4-3.4L8.6 8.4A6.6 6.6 0 0 1 17 0l-3.4 3.4 1.6 3.4 3.4 1.6z"/>',

  globe: '<circle cx="12" cy="12" r="9.4" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="12" cy="12" rx="4" ry="9.4" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M2.8 12h18.4" fill="none" stroke="currentColor" stroke-width="1.7"/>',

  users: '<circle cx="8.4" cy="7.6" r="3.9"/><path d="M8.4 13c3.9 0 7 2.5 7 5.5a1.2 1.2 0 0 1-1.2 1.2H2.6a1.2 1.2 0 0 1-1.2-1.2c0-3 3.1-5.5 7-5.5z"/><circle class="a" cx="17.2" cy="8.4" r="3.2"/><path class="a" d="M17.2 13c3.2 0 5.4 2 5.4 4.4a1 1 0 0 1-1 1h-4.4z"/>',

  target: '<circle cx="12" cy="12" r="9.4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle class="a" cx="12" cy="12" r="5.4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2"/>',

  bomb: '<circle cx="11" cy="14" r="7.2"/><path class="a" d="M7.6 11.2a4 4 0 0 1 3.2-2.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="13.2" y="5.2" width="3.6" height="3" rx="0.8" transform="rotate(35 15 6.7)"/><path d="M16.6 4.4c1-1.4 2.6-1.8 3.9-1.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="21" cy="3" r="1.3"/>',

  knives: '<path d="M4.2 19.8 13.6 6.4l2 1.4-7.7 14.2z"/><path class="a" d="M14.2 7.1l3.3-4.6 1.3.9-3 4.8z"/><path d="M9.8 20.6 17.4 6l2.2 1.1-6 15.1z" opacity="0.55"/>',

  glassblade: '<path d="M12 1.6 14.6 7l-1.1 7.4h-3L9.4 7z"/><path class="a" d="M11.2 4.6 12.8 8.2 11.6 11.6 12.6 14" fill="none" stroke="currentColor" stroke-width="1.1"/><rect x="7" y="14.4" width="10" height="2.1" rx="1"/><rect x="10.9" y="16.5" width="2.2" height="4.6" rx="1.1"/>',

  anchor: '<circle cx="12" cy="4.4" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="11" y="6.6" width="2" height="13.6" rx="1"/><rect x="7.4" y="9" width="9.2" height="1.9" rx="0.95"/><path d="M4 14.2c.4 4.2 3.8 6.8 8 6.8s7.6-2.6 8-6.8l-2.6 1.4c-.8 2.2-2.8 3.4-5.4 3.4s-4.6-1.2-5.4-3.4z"/>',

  crossbow: '<path d="M3 8.4c4.6-3.6 13.4-3.6 18 0l-1.2 1.6c-4-2.9-11.6-2.9-15.6 0z"/><path class="a" d="M4.3 9.8 12 13.6l7.7-3.8" fill="none" stroke="currentColor" stroke-width="1.1"/><rect x="11" y="6" width="2" height="15" rx="1"/><path d="M12 1.4 14 5h-4z"/>',

  fragment: '<path d="M12 2.2 17.4 8.6 14.6 21.2 12 18.4 9.4 21.2 6.6 8.6z"/><path class="a" d="M12 5.6 14.6 9 12 16 9.4 9z"/>',

  unknown: '<circle cx="12" cy="12" r="9.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.2 9.2a2.8 2.8 0 0 1 5.6.4c0 1.9-2.8 2.2-2.8 4.2" fill="none" stroke="currentColor" stroke-width="2.1"/><circle cx="12" cy="17.6" r="1.5"/>',
};

// Which icon each weapon / class / UI slot uses. Kept separate from the
// shapes so several entries can share one drawing (katana and ronin, bow and
// archer) without duplicating path data.
const SMB_WEAPON_ICONS = {
  random: 'dice', sword: 'sword', hammer: 'hammer', gun: 'gun', axe: 'axe',
  spear: 'spear', bow: 'bow', shield: 'shield', scythe: 'scythe',
  fryingpan: 'fryingpan', broomstick: 'broomstick', combat: 'fist',
  peashooter: 'sprout', slingshot: 'slingshot', paperairplane: 'plane',
  flail: 'flail', whip: 'whip', boomerang: 'boomerang', katana: 'katana',
  flamethrower: 'flame', electricstaff: 'bolt',
  bomb: 'bomb', knives: 'knives', glassblade: 'glassblade', anchor: 'anchor',
  crossbow: 'crossbow', fragment: 'fragment',
};

const SMB_CLASS_ICONS = {
  random: 'dice', none: 'circleDash', warrior: 'crossedswords', thor: 'bolt',
  kratos: 'burst', ninja: 'shuriken', gunner: 'crosshair', archer: 'bow',
  paladin: 'cross', berserker: 'doubleaxe', megaknight: 'helmet',
  pugilist: 'glove', ronin: 'katana', reaper: 'skull', summoner: 'orbit',
  demolitionist: 'bomb', warden: 'anchor', adept: 'fragment',
};

// `size` is a CSS length; icons default to 1em so they track the font size.
function smbIcon(name, opts) {
  const o = opts || {};
  const body = SMB_ICONS[name] || SMB_ICONS.unknown;
  const cls  = 'smb-icon' + (o.cls ? ' ' + o.cls : '');
  const style = o.size ? ` style="width:${o.size};height:${o.size}"` : '';
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" ` +
         `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ` +
         `focusable="false"${style}>${body}</svg>`;
}

function smbWeaponIcon(key, opts) { return smbIcon(SMB_WEAPON_ICONS[key] || 'unknown', opts); }
function smbClassIcon(key, opts)  { return smbIcon(SMB_CLASS_ICONS[key]  || 'unknown', opts); }

// Static markup in index.html references these as <use href="#i-name"/>, which
// keeps the HTML readable instead of inlining full path data at every button.
// <use> resolves live, so injecting the sprite after those nodes exist is fine.
function _smbInjectIconSprite() {
  if (document.getElementById('smbIconSprite')) return;
  let symbols = '';
  for (const name in SMB_ICONS) {
    symbols += `<symbol id="i-${name}" viewBox="0 0 24 24">${SMB_ICONS[name]}</symbol>`;
  }
  const host = document.createElement('div');
  host.id = 'smbIconSprite';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg">${symbols}</svg>`;
  (document.body || document.documentElement).appendChild(host);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _smbInjectIconSprite);
} else {
  _smbInjectIconSprite();
}
