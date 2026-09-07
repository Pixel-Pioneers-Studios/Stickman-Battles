'use strict';
// smb-story-scenes.js — cinematic per-chapter scene specs.
//
// ── THIS FILE NO LONGER HOLDS THE SPECS ──────────────────────────────────────
// It used to be a single 9,320-line table of all 113 chapter scene specs, which
// docs/story-cinematics-plan.md flagged for a per-act split. That split is done:
// the specs now live in js/story/scenes/, one file per act directory, mirroring
// how the chapters themselves are organised in js/story/acts/.
//
//   js/story/scenes/act0.js         14 specs      js/story/scenes/act5.js          9 specs
//   js/story/scenes/act1.js          8 specs      js/story/scenes/act6.js          5 specs
//   js/story/scenes/act2.js         12 specs      js/story/scenes/act7.js          9 specs
//   js/story/scenes/act3.js          9 specs      js/story/scenes/actvoidmind.js  13 specs
//   js/story/scenes/act4.js          8 specs      js/story/scenes/side.js          4 specs
//   js/story/scenes/act4mv.js       22 specs
//
// To ADD or EDIT a scene spec, edit the file for that chapter's act — not this
// one. A chapter's act is the directory it lives in under js/story/acts/.
//
// This file is kept, and kept first in load order, only to declare the shared
// table before any act file merges into it. Each scenes/ file also declares it
// defensively, so their relative order does not matter; what matters is that all
// of them load BEFORE js/smb-story-narrative-scene.js, which reads the table.
//
// Coverage is validated by tools/audit/check.js — a chapter with narrative text
// but no scene spec is reported there, so this table cannot silently drift.
// ─────────────────────────────────────────────────────────────────────────────

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};
