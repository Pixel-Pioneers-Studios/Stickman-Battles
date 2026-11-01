# Team notes

For plzgimmeaname, and for your Claude if you use one. Written by Aarush's Claude at Aarush's request (Nov 1, 2026), so the two of you don't work on the same things. Aarush's and your own instructions outrank this file. If you use Claude, point it here from your session or your CLAUDE.md.

## The art direction was never written down

This is on us: it only existed in Aarush's private notes, so you couldn't have known it.

- **Target look:** shonen anime. Saturated, energetic colour; held poses, impact frames, speed lines, cut-ins, move-name cards.
- **Lighting:** consistent, from the upper left, shaped with value ramps.
- **Fighters are locked:** near-black body, neon outline, round head. Store art and trailers match this, so ask before changing it.
- **Full-screen white flashes are rationed:** keep them for kills and finishers.

## Pixel Effects: please talk to Aarush before building more

Aarush's first reaction is that the pixel look feels far from the game's theme. Nothing has been decided about what happens to it, and nothing has been reverted.

The main clash is resolution: 2px unsmoothed art sits on top of smooth HD arenas and thin vector fighters, and the boss and domain visuals remastered in October now go through the pixel pass too.

The event hooks are useful whatever the style ends up being. They cover swings, hits, supers, domains and finishers, with a settings toggle and fallbacks to the old effects.

One thing to check: after the first frame, `_passInstall` routes every `ctx` call through a wrapper, even with the setting off. That needs testing on low-end school machines.

## Who is on what

**Aarush is working on these now:**
- Making Story Mode beatable at every difficulty (`js/story/`, `tools/level-tester.js`)
- God and Absolute Axiom fights, plus checkpoint QTEs (`js/smb-god.js`, `js/smb-absolute-axiom.js`, `js/smb-axiom-multiverse.js`, `js/smb-qte-*.js`)
- Rebuilding the Fight Ladder as a skills curriculum (`js/smb-ladder.js`)
- Finishing the story cinematics
- The Sovereign brain (`tools/brain/`)

Most of those files have large uncommitted changes right now, so edits there are likely to conflict.

**Shared, so keep changes small:** `js/smb-combat.js`, `js/smb-fighter.js`, `js/smb-loop-core.js`, `js/smb-menu-startcore.js`, `index.html`.

**Your lane (suggested by Claude, not agreed yet):** combat feel, meaning how swings, hits and supers look and read, plus fighter animation. Your keybinds, Combo Domain and limb animation work already shipped in 4.7.3. Tell Aarush if you'd rather take something else.

## Proposed working agreement

1. Before starting anything big or visual, tell each other. For a new look, share a screenshot or clip first.
2. Put big visual changes on a branch or behind a default-off setting until Aarush has seen them.
3. Add what you're starting to the list above, and remove it when it's done.
4. `?v=` tags in `index.html` conflict on nearly every merge. Take the higher number, then run `node tools/dev/bump-version.js <changed files>`.
5. Say what changed in commit messages. "full animation rework" was really a VFX layer, and that matters when someone is deciding what to pull.
