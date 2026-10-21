-- KaelAvatarBuilderV3.lua
-- A deliberately simple, graphic Kael silhouette based on the supplied
-- home-screen/cinematic references: one round head, clean limbs, dark body,
-- blue edge glow. No joint spheres, orbiting shards, purple accents, or armor.

local Workspace = game:GetService("Workspace")
local MODEL_NAME = "Kael_95thBearer"
local old = Workspace:FindFirstChild(MODEL_NAME)
if old then old:Destroy() end

local model = Instance.new("Model")
model.Name = MODEL_NAME
model:SetAttribute("Character", "Kael")
model:SetAttribute("VisualReference", "Stickman Battles home screen and cinematic silhouette")
model:SetAttribute("DesignNote", "Simple black-blue stickman with blue outline; no joint spheres")
model.Parent = Workspace

local DARK = Color3.fromRGB(3, 13, 25)
local BLUE = Color3.fromRGB(55, 155, 255)
local BLUE_DARK = Color3.fromRGB(16, 64, 125)
local CYAN = Color3.fromRGB(0, 215, 255)

local function part(name, size, cf, color, material, parent)
	local p = Instance.new("Part")
	p.Name, p.Size, p.CFrame = name, size, cf
	p.Color, p.Material = color, material or Enum.Material.SmoothPlastic
	-- Static display prototype: keep the clean silhouette rigid in Studio.
	p.Anchored, p.CanCollide, p.CanTouch, p.CanQuery = true, false, false, false
	p.CastShadow = false
	p.TopSurface, p.BottomSurface = Enum.SurfaceType.Smooth, Enum.SurfaceType.Smooth
	p.Parent = parent or model
	return p
end

local function weld(root, child)
	local w = Instance.new("WeldConstraint")
	w.Part0, w.Part1, w.Parent = root, child, child
end

-- Cylinders are used as single clean line strokes. There are intentionally no
-- balls at shoulders, elbows, knees, hands, or ankles.
local function stroke(name, a, b, radius, color, material)
	local mid = (a + b) / 2
	local length = (b - a).Magnitude
	-- Roblox cylinders use their local X axis as the length axis. Build an
	-- orthonormal frame so every stroke connects exactly from a to b.
	local axis = (b - a).Unit
	local reference = math.abs(axis:Dot(Vector3.new(0, 1, 0))) > 0.98
		and Vector3.new(0, 0, 1)
		or Vector3.new(0, 1, 0)
	local zAxis = axis:Cross(reference).Unit
	local yAxis = zAxis:Cross(axis).Unit
	local cf = CFrame.fromMatrix(mid, axis, yAxis, zAxis)
	local p = part(name, Vector3.new(length, radius * 2, radius * 2), cf, color, material)
	p.Shape = Enum.PartType.Cylinder
	return p
end

local root = part("HumanoidRootPart", Vector3.new(1, 1, 1), CFrame.new(0, 4.0, 0), DARK)
root.Transparency = 1
model.PrimaryPart = root

-- The torso is a single slim stroke, slightly wider at the shoulder via a
-- second dark-blue stroke. The image's character is a line drawing, not a rig.
stroke("Torso", Vector3.new(0, 3.45, 0), Vector3.new(0, 5.85, 0), 0.24, DARK)
stroke("TorsoGlowCore", Vector3.new(0, 3.48, -0.02), Vector3.new(0, 5.78, -0.02), 0.055, BLUE_DARK, Enum.Material.Neon)

-- One head circle is the only round silhouette element.
local head = part("Head", Vector3.new(0.22, 1.42, 1.42), CFrame.new(0, 6.55, 0) * CFrame.Angles(0, math.rad(90), 0), DARK)
head.Shape = Enum.PartType.Cylinder

-- Arms: long, clean, slightly raised like the home-screen pose.
stroke("LeftArm", Vector3.new(-0.12, 5.55, 0), Vector3.new(-1.72, 6.25, 0), 0.12, DARK)
stroke("RightArm", Vector3.new(0.12, 5.55, 0), Vector3.new(1.72, 6.25, 0), 0.12, DARK)
stroke("LeftHandLine", Vector3.new(-1.72, 6.25, 0), Vector3.new(-1.97, 6.43, 0), 0.08, DARK)
stroke("RightHandLine", Vector3.new(1.72, 6.25, 0), Vector3.new(1.97, 6.43, 0), 0.08, DARK)

-- Legs: two long strokes, with a simple bent lower leg and flat-ish foot stroke.
stroke("LeftUpperLeg", Vector3.new(-0.10, 3.55, 0), Vector3.new(-1.12, 2.15, 0), 0.16, DARK)
stroke("LeftLowerLeg", Vector3.new(-1.12, 2.15, 0), Vector3.new(-1.95, 1.25, 0), 0.14, DARK)
stroke("LeftFoot", Vector3.new(-1.95, 1.25, 0), Vector3.new(-2.30, 1.25, -0.02), 0.13, DARK)
stroke("RightUpperLeg", Vector3.new(0.10, 3.55, 0), Vector3.new(0.45, 2.20, 0), 0.16, DARK)
stroke("RightLowerLeg", Vector3.new(0.45, 2.20, 0), Vector3.new(0.55, 1.25, 0), 0.14, DARK)
stroke("RightFoot", Vector3.new(0.55, 1.25, 0), Vector3.new(0.95, 1.25, -0.02), 0.13, DARK)

-- The Fragment is reduced to one small cyan chest mark. No extra effects.
local fragment = part("FragmentMark", Vector3.new(0.16, 0.38, 0.06), CFrame.new(0, 4.95, -0.27), CYAN, Enum.Material.Neon)
fragment.Shape = Enum.PartType.Wedge

-- Blue/cyan outline is the visual language from the references.
local outline = Instance.new("Highlight")
outline.Name = "KaelBlueOutline"
outline.FillColor = BLUE_DARK
outline.OutlineColor = BLUE
outline.FillTransparency = 0.78
outline.OutlineTransparency = 0.08
outline.DepthMode = Enum.HighlightDepthMode.Occluded
outline.Parent = model

local humanoid = Instance.new("Humanoid")
humanoid.DisplayName = "Kael"
humanoid.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOff
humanoid.NameDisplayDistance = 0
humanoid.Parent = model

for _, item in ipairs(model:GetDescendants()) do
	if item:IsA("BasePart") and item ~= root then weld(root, item) end
end

print("Kael v3 created: " .. model:GetFullName())
print("Simple reference silhouette: one head circle, clean strokes, blue outline")
