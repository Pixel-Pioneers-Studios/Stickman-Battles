-- KaelAvatarBuilder.lua
-- Stickman Battles -> Roblox Studio avatar/display-rig builder
--
-- Run this in Roblox Studio's Command Bar (View > Script > Command Bar).
-- It creates a model named "Kael_95thBearer" in Workspace.
-- Studio primitives are intentional: no Blender/import pipeline is required.

local Workspace = game:GetService("Workspace")

local MODEL_NAME = "Kael_95thBearer"
local old = Workspace:FindFirstChild(MODEL_NAME)
if old then old:Destroy() end

local model = Instance.new("Model")
model.Name = MODEL_NAME
model:SetAttribute("Character", "Kael")
model:SetAttribute("Lore", "95th Fragment Bearer")
model:SetAttribute("FragmentState", "Fully integrated")
model:SetAttribute("DesignNote", "Ordinary stickman silhouette; crystallized cyan Fragment; restrained Paradox violet")
model.Parent = Workspace

local COLORS = {
	Ink = Color3.fromRGB(12, 14, 22),
	InkSoft = Color3.fromRGB(28, 32, 44),
	Fragment = Color3.fromRGB(143, 216, 255),
	FragmentCore = Color3.fromRGB(225, 250, 255),
	Void = Color3.fromRGB(170, 68, 255),
	Paradox = Color3.fromRGB(255, 0, 204),
	White = Color3.fromRGB(245, 250, 255),
}

local function part(name, size, cf, color, material, parent)
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	p.CFrame = cf
	p.Color = color
	p.Material = material or Enum.Material.SmoothPlastic
	p.Anchored = false
	p.CanCollide = false
	p.CanTouch = false
	p.CanQuery = false
	p.CastShadow = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent or model
	return p
end

local function cylinder(name, radius, height, cf, color, material, parent)
	local p = part(name, Vector3.new(radius * 2, height, radius * 2), cf, color, material, parent)
	p.Shape = Enum.PartType.Cylinder
	return p
end

local function sphere(name, diameter, cf, color, material, parent)
	local p = part(name, Vector3.new(diameter, diameter, diameter), cf, color, material, parent)
	p.Shape = Enum.PartType.Ball
	return p
end

local function weld(root, child)
	local w = Instance.new("WeldConstraint")
	w.Part0 = root
	w.Part1 = child
	w.Parent = child
	return w
end

local function neonLight(parent, color, brightness, range)
	local light = Instance.new("PointLight")
	light.Color = color
	light.Brightness = brightness
	light.Range = range
	light.Shadows = false
	light.Parent = parent
	return light
end

-- A compact R15-like stickman silhouette. The dark body keeps Kael visually
-- ordinary; the integrated Fragment is the focal point rather than armor.
local root = part("HumanoidRootPart", Vector3.new(1.6, 2.0, 0.9), CFrame.new(0, 4.3, 0), COLORS.Ink, Enum.Material.SmoothPlastic)
root.Transparency = 1
model.PrimaryPart = root

local torso = part("UpperTorso", Vector3.new(2.4, 2.0, 0.85), CFrame.new(0, 5.7, 0), COLORS.Ink, Enum.Material.SmoothPlastic)
local waist = part("LowerTorso", Vector3.new(1.8, 0.8, 0.75), CFrame.new(0, 4.3, 0), COLORS.InkSoft, Enum.Material.SmoothPlastic)
local head = sphere("Head", 1.65, CFrame.new(0, 7.25, 0), COLORS.Ink, Enum.Material.SmoothPlastic)

local neck = cylinder("Neck", 0.24, 0.35, CFrame.new(0, 6.8, 0), COLORS.InkSoft, Enum.Material.SmoothPlastic)
local leftShoulder = sphere("LeftShoulder", 0.62, CFrame.new(-1.35, 6.25, 0), COLORS.InkSoft, Enum.Material.SmoothPlastic)
local rightShoulder = sphere("RightShoulder", 0.62, CFrame.new(1.35, 6.25, 0), COLORS.InkSoft, Enum.Material.SmoothPlastic)

local leftArm = cylinder("LeftUpperArm", 0.32, 1.9, CFrame.new(-1.65, 5.25, 0) * CFrame.Angles(0, 0, math.rad(-8)), COLORS.Ink, Enum.Material.SmoothPlastic)
local rightArm = cylinder("RightUpperArm", 0.32, 1.9, CFrame.new(1.65, 5.25, 0) * CFrame.Angles(0, 0, math.rad(8)), COLORS.Ink, Enum.Material.SmoothPlastic)
local leftHand = sphere("LeftHand", 0.62, CFrame.new(-1.78, 4.22, 0), COLORS.Ink, Enum.Material.SmoothPlastic)
local rightHand = sphere("RightHand", 0.62, CFrame.new(1.78, 4.22, 0), COLORS.Ink, Enum.Material.SmoothPlastic)

local leftLeg = cylinder("LeftLeg", 0.38, 2.5, CFrame.new(-0.62, 2.65, 0), COLORS.Ink, Enum.Material.SmoothPlastic)
local rightLeg = cylinder("RightLeg", 0.38, 2.5, CFrame.new(0.62, 2.65, 0), COLORS.Ink, Enum.Material.SmoothPlastic)
local leftFoot = part("LeftFoot", Vector3.new(0.75, 0.35, 1.35), CFrame.new(-0.62, 1.25, -0.22), COLORS.InkSoft, Enum.Material.SmoothPlastic)
local rightFoot = part("RightFoot", Vector3.new(0.75, 0.35, 1.35), CFrame.new(0.62, 1.25, -0.22), COLORS.InkSoft, Enum.Material.SmoothPlastic)

-- Head mark: a single cool-white slash, echoing Kael's identity surviving erasure.
local visor = part("IdentityMark", Vector3.new(0.09, 0.26, 0.72), CFrame.new(0.42, 7.28, -0.78) * CFrame.Angles(0, math.rad(8), math.rad(-24)), COLORS.White, Enum.Material.Neon)
neonLight(visor, COLORS.Fragment, 0.2, 3)

-- Fragment: a small faceted crystal embedded in the sternum, not a backpack or weapon.
local fragment = part("Fragment_ChestCore", Vector3.new(0.58, 0.95, 0.22), CFrame.new(0, 5.78, -0.52) * CFrame.Angles(0, 0, math.rad(18)), COLORS.Fragment, Enum.Material.Neon)
fragment.Shape = Enum.PartType.Wedge
fragment.Transparency = 0.08
neonLight(fragment, COLORS.Fragment, 2.4, 10)

local fragmentCore = part("Fragment_InnerLight", Vector3.new(0.20, 0.58, 0.08), CFrame.new(0, 5.79, -0.66) * CFrame.Angles(0, 0, math.rad(18)), COLORS.FragmentCore, Enum.Material.Neon)
fragmentCore.Transparency = 0.08
neonLight(fragmentCore, COLORS.FragmentCore, 1.6, 5)

-- Fine cyan fissure lines: the fragment has bonded into him and radiates outward.
local fissureL = part("Fragment_Fissure_L", Vector3.new(0.06, 0.92, 0.06), CFrame.new(-0.28, 5.82, -0.55) * CFrame.Angles(0, 0, math.rad(-34)), COLORS.Fragment, Enum.Material.Neon)
local fissureR = part("Fragment_Fissure_R", Vector3.new(0.06, 0.78, 0.06), CFrame.new(0.31, 5.65, -0.55) * CFrame.Angles(0, 0, math.rad(42)), COLORS.Fragment, Enum.Material.Neon)

-- Minimal violet trace at the back: Paradox is present as an echo, never the main palette.
local backTrace = part("ParadoxTrace", Vector3.new(0.12, 1.15, 0.08), CFrame.new(0, 5.7, 0.48) * CFrame.Angles(0, 0, math.rad(-16)), COLORS.Void, Enum.Material.Neon)
backTrace.Transparency = 0.25
neonLight(backTrace, COLORS.Void, 0.7, 5)

-- Orbiting shard halo. It is decorative and intentionally sparse so the silhouette stays clean.
local shardFolder = Instance.new("Folder")
shardFolder.Name = "FragmentShardOrbit"
shardFolder.Parent = model

local shardPositions = {
	Vector3.new(-0.95, 6.45, -0.25),
	Vector3.new(0.85, 6.00, -0.15),
	Vector3.new(-0.72, 4.78, -0.10),
}
for i, offset in ipairs(shardPositions) do
	local shard = part("FragmentShard_" .. i, Vector3.new(0.14, 0.5, 0.12), CFrame.new(offset) * CFrame.Angles(0, 0, math.rad(25 + i * 19)), COLORS.Fragment, Enum.Material.Neon, shardFolder)
	shard.Transparency = 0.18
	neonLight(shard, COLORS.Fragment, 0.9, 4)
	weld(root, shard)
end

-- A subtle magenta counter-shard marks the Paradox echo without replacing Kael's cyan identity.
local paradoxShard = part("ParadoxEchoShard", Vector3.new(0.12, 0.42, 0.12), CFrame.new(1.02, 5.55, 0.18) * CFrame.Angles(0, 0, math.rad(-35)), COLORS.Paradox, Enum.Material.Neon, shardFolder)
paradoxShard.Transparency = 0.25
neonLight(paradoxShard, COLORS.Paradox, 0.7, 4)
weld(root, paradoxShard)

-- Weld the complete display rig to the hidden root so it can be moved as one model.
for _, item in ipairs(model:GetDescendants()) do
	if item:IsA("BasePart") and item ~= root and not item:FindFirstChildOfClass("WeldConstraint") then
		weld(root, item)
	end
end

-- Helpful metadata for later conversion into an avatar/accessory.
local humanoid = Instance.new("Humanoid")
humanoid.DisplayName = "Kael • 95th Fragment Bearer"
humanoid.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOff
humanoid.NameDisplayDistance = 0
humanoid.Parent = model

local highlight = Instance.new("Highlight")
highlight.Name = "FragmentResonanceHighlight"
highlight.FillColor = COLORS.Fragment
highlight.OutlineColor = COLORS.Void
highlight.FillTransparency = 1
highlight.OutlineTransparency = 0.72
highlight.DepthMode = Enum.HighlightDepthMode.Occluded
highlight.Parent = model

print("Kael avatar created: " .. model:GetFullName())
print("Lore: ordinary stickman silhouette / integrated cyan Fragment / restrained Paradox echo")
