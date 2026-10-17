# Kael Roblox avatar prototype

`KaelAvatarBuilder.lua` is the original Roblox Studio Command Bar builder. The improved rounded-blue pass is `KaelAvatarBuilderV2.lua`.

## Run it

1. Install/open Roblox Studio.
2. Create a new Baseplate place.
3. Open **View → Script → Command Bar**.
4. Paste the contents of `KaelAvatarBuilderV2.lua` and press Enter.
5. Select `Kael_95thBearer` in Workspace and use the model as the visual prototype.

The improved pass intentionally uses Studio primitives, so Blender is not required. It creates:

- a blue, rounded capsule stickman silhouette;
- a cyan/ice-blue Fragment crystal integrated into the sternum;
- curved hands, knees, and feet made from cylinder-and-sphere caps;
- cyan fissure lines and sparse orbiting shards;
- a restrained violet/magenta Paradox echo;
- a hidden root part, Humanoid, attributes, and welds for later rigging.

This is a display-rig prototype rather than a marketplace-ready R15 package. Once Studio is available, the next pass can convert the silhouette into a proper R15 rig and add idle/attack animations.
