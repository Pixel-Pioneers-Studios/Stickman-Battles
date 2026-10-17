'use strict';
// Shared scene-spec table. Specs live in js/story/scenes/<act>.js, one file per act
// directory. Each act file merges into this table, so edit the act file for the
// chapter, not this one. All scenes/ files must load before smb-story-narrative-scene.js.
// Coverage is checked by tools/audit/check.js.

window.STORY_SCENE_SPECS = window.STORY_SCENE_SPECS || {};
