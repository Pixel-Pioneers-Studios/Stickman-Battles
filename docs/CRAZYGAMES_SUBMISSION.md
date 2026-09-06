# CrazyGames submission

Everything needed to submit **Stickman Evolution: The 95th**. Code work is done;
what remains is the dashboard upload, which only the account owner can do.

## 1. Build the bundle

```sh
bash tools/package/build-crazygames.sh
# -> dist/stickman-evolution-crazygames.zip
```

The script prints the three numbers QA checks against:

| Limit | Current |
|-------|---------|
| ≤ 250MB total | 14MB unpacked / 8.8MB zipped |
| ≤ 1500 files | 216 |
| ≤ 50MB before gameplay start (20MB for mobile home page) | 14MB |

`index.html` sits at the archive root, all paths are relative, and the bundle
excludes `server.js`, `docs/`, `tools/`, `replays/`, `node_modules/`, the
sibling games, `SMB.env` and `images/store/`.

## 2. Redeploy the API server first — required

`server.js` now allows every CrazyGames origin (regional portals, the
`game-files` CDN, and the Android/iOS app origins). **Render does not
auto-deploy**, so until it is deployed manually the live server returns 403 to
CrazyGames and online multiplayer, ban checks and live-config will all fail
there. Verify after deploying:

```sh
curl -s -D- -o /dev/null -H "Origin: https://games.crazygames.com" \
  https://stickman-battles.onrender.com/api/live-config | grep -i "allow-origin"
# expect: access-control-allow-origin: https://games.crazygames.com
```

## 3. Upload at developer.crazygames.com

Assets are already produced in `images/store/`:

| Field | File |
|-------|------|
| Landscape cover 16:9 | `cover-landscape-1920x1080.png` |
| Portrait cover 2:3 | `cover-portrait-800x1200.png` |
| Square cover 1:1 | `cover-square-800x800.png` |
| Landscape video | `preview-landscape-1080p.mp4` |
| Portrait video | `preview-portrait-1080p.mp4` |

### Store copy

**Title:** Stickman Evolution: The 95th

**Short description (≤ 160 chars):**
> A stickman platform fighter with 10 classes, 16 weapons and 18 arenas — fight
> bots, a friend, or the world in a 184-chapter story.

**Description:**
> Stickman Evolution: The 95th is a fast 2D platform fighter. Pick from ten
> classes and sixteen weapons, each with its own ability and super, and fight
> across eighteen arenas with their own physics and hazards — lava floors,
> inverted gravity, collapsing platforms.
>
> Play instantly against a bot, share a keyboard with a friend, or take on the
> story: 184 chapters following the 95th bearer of a power that has destroyed
> every one before them. Multi-phase bosses learn how you fight and punish
> repetition. Online matches are supported through room codes and invites.

**Controls:**
> Player 1 — A/D move, W jump (press twice to double jump), S shield,
> Space attack, Q ability, E super.
> Player 2 — J/L move, I jump, K shield, U attack, O ability, P super.
> Esc pauses. Letter bindings follow physical key position, so AZERTY plays ZQSD.

**Tags:** fighting, action, platform, 2 player, stickman, multiplayer, boss,
story, arena, singleplayer

**Genre:** Action / Fighting · **Devices:** Desktop only (no touch controls)

## 4. What the SDK already does

- `init()`, `loadingStart` / `loadingStop`, `gameplayStart` / `gameplayStop`
  (start, pause, resume, end)
- Midgame ad break between matches — skips the first break of the session,
  keeps a 3-minute minimum gap, and never fires online or mid-cinematic
  (`cgSdk.adBreak`, called from `endGame()`)
- Rewarded ads available via `cgSdk.requestRewardedAd(onReward, onSkip)` —
  **not yet wired to anything**; it needs a player-initiated button (e.g. a
  continue or a coin double) before it earns anything
- Data module for cloud saves, user module for the platform username
- Multiplayer rooms: `updateRoom` / `leftRoom` / invite links / join listener
- Portal settings: mute and chat-disable honoured
- Sitelock in `js/smb-sitelock.js` — **add any new host to `ALLOWED_HOSTS`
  before deploying there**, or the new host shows the lock screen

## 5. Known gaps worth deciding on

- **No touch controls.** Desktop-only is accepted, but it forfeits mobile
  traffic, which is the majority of the portal.
- **Account integration is partial.** The CrazyGames username is adopted for
  online play, but the game's own Supabase login runs alongside it rather than
  behind it.
- **Rewarded ads unused** — see above.
