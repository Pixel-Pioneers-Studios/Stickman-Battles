# Portal listing kit: Newgrounds and Game Jolt

Everything needed to list the game on two more free portals. The code side is already done: both hosts are in the client sitelock (`js/smb-sitelock.js`) and the server's `PORTAL_ORIGINS` (`server.js`), so online play and saves work there once the server running on Render includes those lines. What's left needs your accounts: sign up, accept each portal's terms, upload.

Written Nov 17 2026. Counts follow the trailer rule: only what a new player can unlock (25 weapons, 15 classes). The copy names no secret boss.

## The build

```sh
tools/package/build-crazygames.sh      # runtime-only bundle, sitelock included
```

It stages `dist/crazygames/` and zips it. Both portals take that zip as-is (an `index.html` at the zip root). Build from a clean `main` so nothing unreviewed ships: `git stash -u` first if the tree has work in progress, `git stash pop` after.

## Newgrounds (newgrounds.com/projects/games)

- **Type:** HTML5. Upload the zip. Frame size **1280 x 720** (the game scales from 900 x 520; bigger is better, the CrazyGames judges said the fighters looked tiny at 918 x 470). Tick "allow fullscreen".
- **Rating:** Teen is the safe pick (stylized violence, some blood on degraded fighters). Fill the questionnaire honestly; it decides the rating.
- **Icon:** `images/store/cover-square-800x800.png`, cropped down to the size the form asks for.
- **Tags (max 5):** fighting, stickman, action, multiplayer, story
- **Genre:** Action > Fighting
- Newgrounds games are reviewed by players in the first hours ("judgment"), so post it when you can watch it, not overnight.

## Game Jolt (gamejolt.com/dashboard)

- **Add game**, then a **Browser** build: upload the zip, type HTML, dimensions 1280 x 720, "Fit to screen" on.
- **Header:** `images/store/cover-landscape-1920x1080.png`. **Thumbnail:** crop the same file to 1280 x 720 (or 16:9 at any size).
- **Media:** the three portal covers plus `images/store/trailer-landscape-1080p.mp4` (Game Jolt takes video uploads or a YouTube link; the Gameplay Showcase video works).
- **Maturity:** Teen. **Tags:** fighting, stickman, action, multiplayer, singleplayer, story
- Game Jolt shows new games in "New" for a short time; a devlog post on launch day keeps it there longer.

## Copy

**Title:** Stickman Evolution: The 95th

**Short description (one line):**
Ninety-four bearers came before you. A hard, fast stickman fighter with a long story, online duels and bosses that learn how you fight.

**Long description:**

Ninety-four people held the Fragment before you. None of them survived it. You are the ninety-fifth.

Stickman Evolution is a fast 2D fighting game built to be hard. Every swing has weight, every move has a counter, and the bosses read your habits and punish them.

- **A long story mode.** Walk the worlds between fights, find side dungeons, solve puzzle rooms and face bosses with real cinematics.
- **25 weapons and 15 fighting styles.** Each weapon has its own moves and a finisher. Each style is a bearer who came before you.
- **Play with friends.** Local versus on one keyboard, or online duels and lobbies in the browser.
- **Bosses that adapt.** They chain attacks, punish passive play and learn what you lean on.
- **More modes:** a 10-rung Fight Ladder, Battle Royale, Endless, minigames.

Controls: A/D move, W jump, Space attack, S shield, Q ability, E super. Gamepads work too, and every key can be rebound in Settings.

## After listing

- Add each new page to the itch.io page's links and the YouTube channel description, so the portals feed each other.
- Check the server log for blocked origins after the first plays. A CORS error from a new CDN host means it needs adding to `PORTAL_ORIGINS` and `smb-sitelock.js`.
