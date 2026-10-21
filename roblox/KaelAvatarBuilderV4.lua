-- KaelAvatarBuilderV4.lua
-- A simple motorized Kael display rig with a grounded neutral stance and
-- procedural walk cycle. Run in Roblox Studio's Command Bar.

local Workspace = game:GetService("Workspace")
local MODEL_NAME = "Kael_95thBearer"
local old = Workspace:FindFirstChild(MODEL_NAME)
if old then old:Destroy() end

local model = Instance.new("Model")
model.Name = MODEL_NAME
model:SetAttribute("Character", "Kael")
model:SetAttribute("DesignNote", "Grounded stickman rig with procedural walk cycle")
model:SetAttribute("WalkEnabled", true)
model.Parent = Workspace

local DARK = Color3.fromRGB(3, 13, 25)
local BLUE = Color3.fromRGB(55, 155, 255)
local BLUE_DARK = Color3.fromRGB(16, 64, 125)
local CYAN = Color3.fromRGB(0, 215, 255)

local function makePart(name, size, cf, color, material, anchored)
	local p = Instance.new("Part")
	p.Name, p.Size, p.CFrame = name, size, cf
	p.Color, p.Material = color, material or Enum.Material.SmoothPlastic
	p.Anchored, p.CanCollide, p.CanTouch, p.CanQuery = anchored == true, false, false, false
	p.CastShadow = false
	p.Parent = model
	return p
end

-- Roblox cylinders use local X as the length axis.
local function stroke(name, a, b, radius, color, material, anchored)
	local mid = (a + b) / 2
	local axis = (b - a).Unit
	local reference = math.abs(axis:Dot(Vector3.new(0, 1, 0))) > 0.98 and Vector3.new(0, 0, 1) or Vector3.new(0, 1, 0)
	local zAxis = axis:Cross(reference).Unit
	local yAxis = zAxis:Cross(axis).Unit
	local p = makePart(name, Vector3.new((b - a).Magnitude, radius * 2, radius * 2), CFrame.fromMatrix(mid, axis, yAxis, zAxis), color, material, anchored)
	p.Shape = Enum.PartType.Cylinder
	return p
end

local root = makePart("HumanoidRootPart", Vector3.new(1, 1, 1), CFrame.new(0, 4.0, 0), DARK, nil, true)
root.Transparency = 1
model.PrimaryPart = root

local torso = stroke("Torso", Vector3.new(0, 3.45, 0), Vector3.new(0, 5.75, 0), 0.23, DARK, nil, false)
local torsoCore = stroke("TorsoGlowCore", Vector3.new(0, 3.5, -0.02), Vector3.new(0, 5.7, -0.02), 0.05, BLUE_DARK, Enum.Material.Neon, false)
local head = makePart("Head", Vector3.new(0.22, 1.42, 1.42), CFrame.new(0, 6.45, 0) * CFrame.Angles(0, math.rad(90), 0), DARK, nil, false)
head.Shape = Enum.PartType.Cylinder

-- Neutral stance: arms down, hips centered, both soles at the same height.
local leftUpperArm = stroke("LeftUpperArm", Vector3.new(-0.16, 5.45, 0), Vector3.new(-0.42, 4.65, 0), 0.105, DARK, nil, false)
local leftForearm = stroke("LeftForearm", Vector3.new(-0.42, 4.65, 0), Vector3.new(-0.48, 3.92, 0), 0.09, DARK, nil, false)
local rightUpperArm = stroke("RightUpperArm", Vector3.new(0.16, 5.45, 0), Vector3.new(0.42, 4.65, 0), 0.105, DARK, nil, false)
local rightForearm = stroke("RightForearm", Vector3.new(0.42, 4.65, 0), Vector3.new(0.48, 3.92, 0), 0.09, DARK, nil, false)

local leftThigh = stroke("LeftThigh", Vector3.new(-0.12, 3.55, 0), Vector3.new(-0.38, 2.45, 0), 0.14, DARK, nil, false)
local leftShin = stroke("LeftShin", Vector3.new(-0.38, 2.45, 0), Vector3.new(-0.42, 1.35, 0), 0.115, DARK, nil, false)
local rightThigh = stroke("RightThigh", Vector3.new(0.12, 3.55, 0), Vector3.new(0.38, 2.45, 0), 0.14, DARK, nil, false)
local rightShin = stroke("RightShin", Vector3.new(0.38, 2.45, 0), Vector3.new(0.42, 1.35, 0), 0.115, DARK, nil, false)
local leftFoot = stroke("LeftFoot", Vector3.new(-0.42, 1.22, 0), Vector3.new(-0.42, 1.22, -0.48), 0.13, BLUE_DARK, nil, false)
local rightFoot = stroke("RightFoot", Vector3.new(0.42, 1.22, 0), Vector3.new(0.42, 1.22, -0.48), 0.13, BLUE_DARK, nil, false)

local fragment = makePart("FragmentMark", Vector3.new(0.14, 0.34, 0.06), CFrame.new(0, 4.85, -0.26), CYAN, Enum.Material.Neon, false)
fragment.Shape = Enum.PartType.Wedge

local highlight = Instance.new("Highlight")
highlight.Name = "KaelBlueOutline"
highlight.FillColor = BLUE_DARK
highlight.OutlineColor = BLUE
highlight.FillTransparency = 0.78
highlight.OutlineTransparency = 0.08
highlight.DepthMode = Enum.HighlightDepthMode.Occluded
highlight.Parent = model

local function motor(name, part0, part1, pivot)
	local m = Instance.new("Motor6D")
	m.Name = name
	m.Part0, m.Part1 = part0, part1
	m.C0 = part0.CFrame:ToObjectSpace(CFrame.new(pivot))
	m.C1 = part1.CFrame:ToObjectSpace(CFrame.new(pivot))
	m.Parent = part0
	return m
end

local motors = {
	Head = motor("Neck", torso, head, Vector3.new(0, 5.85, 0)),
	LeftShoulder = motor("LeftShoulder", torso, leftUpperArm, Vector3.new(-0.16, 5.45, 0)),
	LeftElbow = motor("LeftElbow", leftUpperArm, leftForearm, Vector3.new(-0.42, 4.65, 0)),
	RightShoulder = motor("RightShoulder", torso, rightUpperArm, Vector3.new(0.16, 5.45, 0)),
	RightElbow = motor("RightElbow", rightUpperArm, rightForearm, Vector3.new(0.42, 4.65, 0)),
	LeftHip = motor("LeftHip", torso, leftThigh, Vector3.new(-0.12, 3.55, 0)),
	LeftKnee = motor("LeftKnee", leftThigh, leftShin, Vector3.new(-0.38, 2.45, 0)),
	LeftAnkle = motor("LeftAnkle", leftShin, leftFoot, Vector3.new(-0.42, 1.35, 0)),
	RightHip = motor("RightHip", torso, rightThigh, Vector3.new(0.12, 3.55, 0)),
	RightKnee = motor("RightKnee", rightThigh, rightShin, Vector3.new(0.38, 2.45, 0)),
	RightAnkle = motor("RightAnkle", rightShin, rightFoot, Vector3.new(0.42, 1.35, 0)),
}

local humanoid = Instance.new("Humanoid")
humanoid.DisplayName = "Kael"
humanoid.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOff
humanoid.NameDisplayDistance = 0
humanoid.Parent = model

local animationScript = Instance.new("Script")
animationScript.Name = "KaelProceduralWalk"
animationScript.Source = [[
local RunService = game:GetService("RunService")
local model = script.Parent
local enabled = model:GetAttribute("WalkEnabled") ~= false
local t = 0
local function set(name, cf)
    local joint = model:FindFirstChild(name, true)
    if joint and joint:IsA("Motor6D") then joint.Transform = cf end
end
RunService.Heartbeat:Connect(function(dt)
    if not enabled then return end
    t += dt * 7
    local swing = math.sin(t)
    local opposite = math.sin(t + math.pi)
    local bob = math.abs(math.sin(t * 2)) * 0.035
    set("LeftHip", CFrame.Angles(opposite * 0.42, 0, 0))
    set("RightHip", CFrame.Angles(swing * 0.42, 0, 0))
    set("LeftKnee", CFrame.Angles(math.max(0, swing) * 0.22, 0, 0))
    set("RightKnee", CFrame.Angles(math.max(0, opposite) * 0.22, 0, 0))
    set("LeftAnkle", CFrame.Angles(-math.max(0, swing) * 0.18, 0, 0))
    set("RightAnkle", CFrame.Angles(-math.max(0, opposite) * 0.18, 0, 0))
    set("LeftShoulder", CFrame.Angles(swing * 0.24, 0, 0))
    set("RightShoulder", CFrame.Angles(opposite * 0.24, 0, 0))
    set("LeftElbow", CFrame.Angles(0.08 + math.max(0, swing) * 0.12, 0, 0))
    set("RightElbow", CFrame.Angles(0.08 + math.max(0, opposite) * 0.12, 0, 0))
    set("Neck", CFrame.new(0, bob, 0))
end)
]]
animationScript.Parent = model

print("Kael v4 created: grounded neutral stance + procedural walk cycle")
print("Both feet planted in the reference pose; press Play to preview the walk")
