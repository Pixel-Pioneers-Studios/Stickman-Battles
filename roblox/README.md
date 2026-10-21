# Kael Roblox avatar prototype

`KaelAvatarBuilder.lua` is the original Roblox Studio Command Bar builder. `KaelAvatarBuilderV3.lua` is the static reference pass, while `KaelAvatarBuilderV4.lua` adds a grounded neutral stance and procedural walk cycle.

## Run it

1. Install/open Roblox Studio.
2. Create a new Baseplate place.
3. Open **View → Script → Command Bar**.
4. Paste the contents of `KaelAvatarBuilderV4.lua` and press Enter.
5. Select `Kael_95thBearer` in Workspace and use the model as the visual prototype.

The current pass intentionally uses Studio primitives, so Blender is not required. It creates:

- a single round head with no joint spheres;
- clean, connected cylinder strokes for the torso, limbs, hands, and curved feet;
- a dark interior with a bright blue outline matching the supplied references;
- one small cyan Fragment mark at the chest;
- a motorized rig with both feet planted in neutral pose and a procedural walk cycle when Play mode runs;
- a hidden root part, Humanoid, attributes, and welds for later rigging.

This is a display-rig prototype rather than a marketplace-ready R15 package. Once Studio is available, the next pass can convert the silhouette into a proper R15 rig and add idle/attack animations.
