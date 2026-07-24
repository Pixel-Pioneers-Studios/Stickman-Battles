--!strict
--[[
	WorldService
	------------
	Builds the whole map at runtime (server-authoritative world). The Rojo project
	ships an empty Workspace; this service constructs every zone on boot from the
	shared `Zones` config so ActService and WorldService never disagree on layout.

	Structure ("zones in one place"):
		Workspace/Zones/Lobby  — hub: spawn, shop + merchant, the Start Pad
		Workspace/Zones/Act1   — the Act I combat arena the party is teleported into

	Each zone is a clean framed floor: a solid slab, a raised neon trim edge, four
	corner pillars for structure, and INVISIBLE collision walls (so nobody slides
	off, without the ugly semi-transparent barrier look from before).
]]

local Workspace = game:GetService("Workspace")
local Lighting = game:GetService("Lighting")

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Zones = require(Shared.Config.Zones)

local WorldService = {}

local FLOOR_COLOR = Color3.fromRGB(48, 52, 63)
local TRIM_COLOR = Color3.fromRGB(96, 150, 220)
local PILLAR_COLOR = Color3.fromRGB(36, 39, 48)
local WALL_COLOR = Color3.fromRGB(60, 64, 78)
local ROOF_COLOR = Color3.fromRGB(40, 43, 53)
local WALL_HEIGHT = 42
local BUILDING_HEIGHT = 26

-- Set at runtime too (not only via the Rojo project tree) so the mood applies on
-- every Play regardless of whether property syncs reached Lighting.
function WorldService:_applyLighting()
	Lighting.Brightness = 2
	Lighting.ExposureCompensation = -0.15
	Lighting.Ambient = Color3.fromRGB(74, 78, 92)
	Lighting.OutdoorAmbient = Color3.fromRGB(120, 126, 145)
	Lighting.ClockTime = 15.2
	Lighting.GlobalShadows = true
	Lighting.FogEnd = 900
	Lighting.FogStart = 220
	Lighting.FogColor = Color3.fromRGB(120, 128, 148)

	-- A soft atmosphere gives the far zones depth without murk.
	local atmos = Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere")
	atmos.Density = 0.28
	atmos.Offset = 0.1
	atmos.Color = Color3.fromRGB(190, 195, 210)
	atmos.Decay = Color3.fromRGB(80, 90, 110)
	atmos.Glare = 0.1
	atmos.Haze = 1.2
	atmos.Parent = Lighting

	local bloom = Lighting:FindFirstChildOfClass("BloomEffect") or Instance.new("BloomEffect")
	bloom.Intensity = 0.5
	bloom.Size = 24
	bloom.Threshold = 1.1
	bloom.Parent = Lighting
end

-- Small part-building helper: anchored, non-query optional, parented to `parent`.
local function part(parent: Instance, name: string, size: Vector3, position: Vector3, color: Color3, material: Enum.Material): BasePart
	local p = Instance.new("Part")
	p.Name = name
	p.Anchored = true
	p.Size = size
	p.Position = position
	p.Color = color
	p.Material = material
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Parent = parent
	return p
end

-- Builds one framed zone floor centered at `center`. `size` is the X side length;
-- pass `depth` for a rectangle (Z side length) — nil means a square. `floorColor`
-- overrides the default slab tint (each Act I stage gets its own subtle identity).
-- `enclosed = true` builds a real hall: visible walls, roof, windows and ceiling
-- lights instead of the invisible open-air containment walls.
-- `hallOpts` (enclosed only): { dark = true, doorWidth = n } — dark drops the
-- bright windows/lamps (torch-lit interior); doorWidth cuts a passage gap in the
-- ±X walls so corridors/gates can pass through. `skipWalls` (open-air only) omits
-- the invisible containment wall at the given edge index (e.g. a plaza doorway to
-- a side alcove). `skipFloor` leaves the single floor slab out (the caller builds
-- a segmented floor itself — the crypt with its gaps).
function WorldService:_buildZone(parent: Instance, center: Vector3, size: number, accent: Color3, enclosed: boolean?, depth: number?, floorColor: Color3?, hallOpts: { dark: boolean?, doorWidth: number? }?, skipWalls: { [number]: boolean }?, skipFloor: boolean?)
	local sizeX = size
	local sizeZ = depth or size
	local halfX = sizeX / 2
	local halfZ = sizeZ / 2

	-- Floor top sits at +0.05 (not 0) so it can never be coplanar with a stray
	-- Baseplate or terrain at Y=0 (coplanar tops z-fight/flicker).
	if not skipFloor then
		local floor = part(parent, "Floor", Vector3.new(sizeX, 2, sizeZ), center + Vector3.new(0, -0.95, 0), floorColor or FLOOR_COLOR, Enum.Material.Slate)
		floor.Reflectance = 0.02
	end

	-- Raised neon trim along each edge: reads as a clean, deliberate border.
	local trimY = center.Y + 0.4
	local edges = {
		{ Vector3.new(sizeX + 2, 0.8, 2), Vector3.new(center.X, trimY, center.Z - halfZ) },
		{ Vector3.new(sizeX + 2, 0.8, 2), Vector3.new(center.X, trimY, center.Z + halfZ) },
		{ Vector3.new(2, 0.8, sizeZ + 2), Vector3.new(center.X - halfX, trimY, center.Z) },
		{ Vector3.new(2, 0.8, sizeZ + 2), Vector3.new(center.X + halfX, trimY, center.Z) },
	}
	for i, e in edges do
		local trim = part(parent, "Trim" .. i, e[1], e[2], accent, Enum.Material.Neon)
		trim.CanCollide = false
	end

	if enclosed then
		self:_buildHallShell(parent, center, sizeX, sizeZ, accent, hallOpts)
	else
		-- Invisible containment walls: keep players/knockback in, no visible barrier.
		for i, e in edges do
			if not (skipWalls and skipWalls[i]) then
				local wall = Instance.new("Part")
				wall.Name = "Wall" .. i
				wall.Anchored = true
				wall.CanCollide = true
				wall.Transparency = 1
				wall.CastShadow = false
				wall.Size = Vector3.new(e[1].X, WALL_HEIGHT, e[1].Z)
				wall.Position = Vector3.new(e[2].X, center.Y + WALL_HEIGHT / 2, e[2].Z)
				wall.Parent = parent
			end
		end
	end

	-- Corner pillars for a bit of structure/scale. In an enclosed hall they run
	-- to just under the roof so the columns read as load-bearing.
	local pillarH = if enclosed then BUILDING_HEIGHT - 0.1 else 22
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			part(
				parent,
				"Pillar",
				Vector3.new(4, pillarH, 4),
				center + Vector3.new(sx * (halfX - 3), pillarH / 2, sz * (halfZ - 3)),
				PILLAR_COLOR,
				Enum.Material.Concrete
			)
			-- Neon cap.
			part(
				parent,
				"PillarCap",
				Vector3.new(4.6, 0.8, 4.6),
				center + Vector3.new(sx * (halfX - 3), pillarH - 0.6, sz * (halfZ - 3)),
				accent,
				Enum.Material.Neon
			).CanCollide =
				false
		end
	end
end

-- Visible building shell around a rectangular zone: four solid walls, a roof slab,
-- a wainscot band, and (bright halls) glowing windows + a ceiling-lamp grid. Dark
-- halls (`opts.dark`) skip the windows/lamps so the interior reads as a torch-lit
-- crypt/hall. `opts.doorWidth` cuts a passage gap in the ±X walls (for corridors).
function WorldService:_buildHallShell(parent: Instance, center: Vector3, sizeX: number, sizeZ: number, accent: Color3, opts: { dark: boolean?, doorWidth: number? }?)
	opts = opts or {}
	local dark = opts.dark == true
	local doorW = opts.doorWidth
	local halfX = sizeX / 2
	local halfZ = sizeZ / 2
	local h = BUILDING_HEIGHT
	local wallY = center.Y + h / 2
	local wallColor = if dark then Color3.fromRGB(34, 32, 38) else WALL_COLOR
	local roofColor = if dark then Color3.fromRGB(26, 24, 30) else ROOF_COLOR

	-- North/South walls span the full width (including corners).
	part(parent, "HallWall1", Vector3.new(sizeX + 6, h, 3), Vector3.new(center.X, wallY, center.Z - halfZ - 1.5), wallColor, Enum.Material.Brick)
	part(parent, "HallWall2", Vector3.new(sizeX + 6, h, 3), Vector3.new(center.X, wallY, center.Z + halfZ + 1.5), wallColor, Enum.Material.Brick)

	-- East/West walls fit between them. If a doorway is requested, each splits into
	-- two Z-segments around a central gap so the corridor/gate can pass through.
	for _, sx in { -1, 1 } do
		local wx = center.X + sx * (halfX + 1.5)
		if doorW then
			local segLen = (sizeZ - doorW) / 2
			local segOff = doorW / 2 + segLen / 2
			for _, sz in { -1, 1 } do
				part(parent, "HallWallX", Vector3.new(3, h, segLen), Vector3.new(wx, wallY, center.Z + sz * segOff), wallColor, Enum.Material.Brick)
			end
		else
			part(parent, "HallWallX", Vector3.new(3, h, sizeZ), Vector3.new(wx, wallY, center.Z), wallColor, Enum.Material.Brick)
		end
	end

	part(parent, "Roof", Vector3.new(sizeX + 6, 1.5, sizeZ + 6), center + Vector3.new(0, h + 0.75, 0), roofColor, Enum.Material.Slate)

	-- Wainscot band along each interior wall face for a finished look.
	local bandY = center.Y + 5
	local bands = {
		{ Vector3.new(sizeX - 0.5, 1.2, 0.6), Vector3.new(center.X, bandY, center.Z - halfZ + 0.35) },
		{ Vector3.new(sizeX - 0.5, 1.2, 0.6), Vector3.new(center.X, bandY, center.Z + halfZ - 0.35) },
		{ Vector3.new(0.6, 1.2, sizeZ - 2), Vector3.new(center.X - halfX + 0.35, bandY, center.Z) },
		{ Vector3.new(0.6, 1.2, sizeZ - 2), Vector3.new(center.X + halfX - 0.35, bandY, center.Z) },
	}
	for i, b in bands do
		part(parent, "WallBand" .. i, b[1], b[2], accent, Enum.Material.SmoothPlastic).CanCollide = false
	end

	if dark then
		return -- torch/brazier decor supplies the only light for a dark interior
	end

	-- Tall glowing windows, three per wall, inset just off the interior face.
	local windowY = center.Y + 14
	for _, side in { -1, 1 } do
		for _, off in { -sizeX / 3, 0, sizeX / 3 } do
			local wz = part(
				parent,
				"Window",
				Vector3.new(9, 10, 0.4),
				Vector3.new(center.X + off, windowY, center.Z + side * (halfZ - 0.45)),
				Color3.fromRGB(196, 214, 240),
				Enum.Material.Neon
			)
			wz.CanCollide = false
			wz.Transparency = 0.15
			local wx = part(
				parent,
				"Window",
				Vector3.new(0.4, 10, 9),
				Vector3.new(center.X + side * (halfX - 0.45), windowY, center.Z + off * (sizeZ / sizeX)),
				Color3.fromRGB(196, 214, 240),
				Enum.Material.Neon
			)
			wx.CanCollide = false
			wx.Transparency = 0.15
		end
	end

	-- Ceiling lamps: neon squares under the roof with real PointLights, laid out
	-- on a 3x3 grid so the whole interior is evenly lit.
	for _, gx in { -sizeX / 3, 0, sizeX / 3 } do
		for _, gz in { -sizeZ / 3, 0, sizeZ / 3 } do
			local lamp = part(
				parent,
				"CeilingLamp",
				Vector3.new(6, 0.5, 6),
				center + Vector3.new(gx, h - 0.35, gz),
				Color3.fromRGB(255, 244, 214),
				Enum.Material.Neon
			)
			lamp.CanCollide = false
			local light = Instance.new("PointLight")
			light.Color = Color3.fromRGB(255, 236, 200)
			light.Brightness = 1.4
			light.Range = 42
			light.Shadows = false
			light.Parent = lamp
		end
	end
end

-- Interior furnishing for the lobby hall: a rug running from spawn to the
-- Start Pad, benches along the walls, planters by the pillars, wall banners
-- and a pair of glowing braziers flanking the pad.
function WorldService:_furnishLobby(parent: Instance, center: Vector3, size: number, accent: Color3)
	local half = size / 2
	local floorTop = center.Y + 0.05

	local furnishings = Instance.new("Model")
	furnishings.Name = "Furnishings"

	-- Rug: spawn (z=-40) up to the Start Pad (z=34).
	local rug = part(
		furnishings,
		"Rug",
		Vector3.new(14, 0.15, 88),
		Vector3.new(center.X, floorTop + 0.14, center.Z - 5),
		Color3.fromRGB(112, 48, 52),
		Enum.Material.Fabric
	)
	rug.CanCollide = false
	local rugTrim = part(
		furnishings,
		"RugTrim",
		Vector3.new(15.5, 0.12, 89.5),
		Vector3.new(center.X, floorTop + 0.07, center.Z - 5),
		Color3.fromRGB(200, 170, 100),
		Enum.Material.Fabric
	)
	rugTrim.CanCollide = false

	-- Benches: wood seat on a solid base, along the east wall and the back wall.
	local seatColor = Color3.fromRGB(110, 78, 50)
	local baseColor = Color3.fromRGB(70, 50, 34)
	local function bench(pos: Vector3, alongX: boolean)
		local seatSize = if alongX then Vector3.new(9, 0.9, 2.6) else Vector3.new(2.6, 0.9, 9)
		local baseSize = if alongX then Vector3.new(8, 1.3, 2) else Vector3.new(2, 1.3, 8)
		part(furnishings, "BenchBase", baseSize, pos + Vector3.new(0, 0.65, 0), baseColor, Enum.Material.Wood)
		part(furnishings, "BenchSeat", seatSize, pos + Vector3.new(0, 1.75, 0), seatColor, Enum.Material.WoodPlanks)
	end
	for _, off in { -22, 0, 22 } do
		bench(Vector3.new(center.X + half - 5, floorTop, center.Z + off), false) -- east wall
		bench(Vector3.new(center.X + off, floorTop, center.Z - half + 5), true) -- back (spawn-side) wall
	end

	-- Planters tucked beside each corner pillar.
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			local px = center.X + sx * (half - 9)
			local pz = center.Z + sz * (half - 9)
			local pot = part(furnishings, "PlanterPot", Vector3.new(2.6, 2.2, 2.6), Vector3.new(px, floorTop + 1.1, pz), Color3.fromRGB(88, 84, 78), Enum.Material.Concrete)
			pot.TopSurface = Enum.SurfaceType.Smooth
			local bush = part(furnishings, "PlanterBush", Vector3.new(3.4, 3, 3.4), Vector3.new(px, floorTop + 3.6, pz), Color3.fromRGB(64, 118, 62), Enum.Material.Grass)
			bush.CanCollide = false
		end
	end

	-- Banners on the north wall (behind the Start Pad).
	for _, off in { -26, 0, 26 } do
		local banner = part(
			furnishings,
			"Banner",
			Vector3.new(6, 13, 0.4),
			Vector3.new(center.X + off, center.Y + 15, center.Z + half - 0.9),
			accent,
			Enum.Material.Fabric
		)
		banner.CanCollide = false
		local rod = part(
			furnishings,
			"BannerRod",
			Vector3.new(7.2, 0.5, 0.7),
			Vector3.new(center.X + off, center.Y + 21.8, center.Z + half - 0.9),
			Color3.fromRGB(150, 130, 80),
			Enum.Material.Metal
		)
		rod.CanCollide = false
	end

	-- Braziers flanking the Start Pad: stone pedestal + glowing flame orb.
	for _, sx in { -1, 1 } do
		local bx = center.X + sx * 12
		local bz = center.Z + 34
		part(furnishings, "BrazierBase", Vector3.new(2.4, 3, 2.4), Vector3.new(bx, floorTop + 1.5, bz), Color3.fromRGB(80, 80, 88), Enum.Material.Concrete)
		local flame = part(furnishings, "BrazierFlame", Vector3.new(1.8, 1.8, 1.8), Vector3.new(bx, floorTop + 3.9, bz), accent, Enum.Material.Neon)
		flame.CanCollide = false
		local light = Instance.new("PointLight")
		light.Color = accent
		light.Brightness = 2
		light.Range = 22
		light.Parent = flame
	end

	furnishings.Parent = parent
end

-- Assembles a simple anchored stickman merchant from parts (no rig import).
local function buildMerchant(cframe: CFrame): Model
	local npc = Instance.new("Model")
	npc.Name = "Merchant"

	local function limb(name: string, size: Vector3, offset: Vector3, color: Color3): BasePart
		local p = Instance.new("Part")
		p.Name = name
		p.Anchored = true
		p.CanCollide = false
		p.Size = size
		p.CFrame = cframe * CFrame.new(offset)
		p.Color = color
		p.Material = Enum.Material.SmoothPlastic
		p.Parent = npc
		return p
	end

	local cloak = Color3.fromRGB(58, 44, 78)
	local skin = Color3.fromRGB(232, 200, 150)
	local torso = limb("Torso", Vector3.new(1.5, 2.1, 0.85), Vector3.new(0, 3, 0), cloak)
	limb("Head", Vector3.new(1, 1, 1), Vector3.new(0, 4.65, 0), skin)
	limb("Hat", Vector3.new(1.3, 0.5, 1.3), Vector3.new(0, 5.35, 0), Color3.fromRGB(150, 120, 60))
	limb("ArmL", Vector3.new(0.5, 1.9, 0.5), Vector3.new(-1.15, 3, 0), cloak)
	limb("ArmR", Vector3.new(0.5, 1.9, 0.5), Vector3.new(1.15, 3, 0), cloak)
	limb("LegL", Vector3.new(0.6, 2, 0.6), Vector3.new(-0.4, 1, 0), Color3.fromRGB(40, 32, 52))
	limb("LegR", Vector3.new(0.6, 2, 0.6), Vector3.new(0.4, 1, 0), Color3.fromRGB(40, 32, 52))
	npc.PrimaryPart = torso

	local billboard = Instance.new("BillboardGui")
	billboard.Name = "Nameplate"
	billboard.Size = UDim2.fromOffset(160, 40)
	billboard.StudsOffset = Vector3.new(0, 3.4, 0)
	billboard.AlwaysOnTop = true
	billboard.Adornee = torso
	local nameLabel = Instance.new("TextLabel")
	nameLabel.Size = UDim2.fromScale(1, 1)
	nameLabel.BackgroundTransparency = 1
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.TextColor3 = Color3.fromRGB(255, 210, 120)
	nameLabel.TextStrokeTransparency = 0.4
	nameLabel.TextSize = 18
	nameLabel.Text = "MERCHANT"
	nameLabel.Parent = billboard
	billboard.Parent = torso

	-- ShopService finds this prompt at boot and wires Triggered to open the shop
	-- UI on the interacting client (WorldService only builds the world).
	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "TalkPrompt"
	prompt.ActionText = "Shop"
	prompt.ObjectText = "Merchant"
	prompt.HoldDuration = 0
	prompt.MaxActivationDistance = 12
	prompt.RequiresLineOfSight = false
	prompt.Parent = torso

	return npc
end

-- A small shop building with a warm light and the merchant behind the counter.
function WorldService:_buildShop(parent: Instance, base: Vector3)
	local shop = Instance.new("Model")
	shop.Name = "Shop"

	local wood = Color3.fromRGB(104, 72, 46)
	local darkWood = Color3.fromRGB(74, 50, 32)
	local post = Color3.fromRGB(58, 40, 26)

	part(shop, "Deck", Vector3.new(22, 1, 18), base + Vector3.new(0, 0.5, 0), darkWood, Enum.Material.WoodPlanks)
	part(shop, "BackWall", Vector3.new(22, 11, 1), base + Vector3.new(0, 5.5, -8.5), wood, Enum.Material.WoodPlanks)
	part(shop, "SideWallL", Vector3.new(1, 11, 18), base + Vector3.new(-10.5, 5.5, 0), wood, Enum.Material.WoodPlanks)
	part(shop, "SideWallR", Vector3.new(1, 11, 18), base + Vector3.new(10.5, 5.5, 0), wood, Enum.Material.WoodPlanks)
	part(shop, "Counter", Vector3.new(18, 3, 2), base + Vector3.new(0, 2, 6), Color3.fromRGB(128, 96, 64), Enum.Material.WoodPlanks)

	-- Corner posts + an overhanging roof.
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			part(shop, "Post", Vector3.new(1, 11, 1), base + Vector3.new(sx * 10.5, 5.5, sz * 8.5), post, Enum.Material.Wood)
		end
	end
	part(shop, "Roof", Vector3.new(26, 1, 22), base + Vector3.new(0, 11.5, 0), darkWood, Enum.Material.WoodPlanks)

	-- Warm interior light.
	local lamp = part(shop, "Lamp", Vector3.new(1.4, 1.4, 1.4), base + Vector3.new(0, 9.5, -2), Color3.fromRGB(255, 220, 150), Enum.Material.Neon)
	lamp.CanCollide = false
	local light = Instance.new("PointLight")
	light.Color = Color3.fromRGB(255, 210, 150)
	light.Brightness = 2.2
	light.Range = 26
	light.Parent = lamp

	-- Sign above the front.
	local sign = part(shop, "Sign", Vector3.new(12, 3, 0.5), base + Vector3.new(0, 13.6, 8), Color3.fromRGB(42, 30, 22), Enum.Material.WoodPlanks)
	local signGui = Instance.new("SurfaceGui")
	signGui.Face = Enum.NormalId.Front
	signGui.CanvasSize = Vector2.new(480, 120)
	signGui.Adornee = sign
	local signText = Instance.new("TextLabel")
	signText.Size = UDim2.fromScale(1, 1)
	signText.BackgroundTransparency = 1
	signText.Font = Enum.Font.GothamBold
	signText.TextColor3 = Color3.fromRGB(255, 210, 120)
	signText.TextScaled = true
	signText.Text = "SHOP"
	signText.Parent = signGui
	signGui.Parent = sign

	local merchant = buildMerchant(CFrame.new(base + Vector3.new(0, 1, -3)))
	merchant.Parent = shop

	shop.Parent = parent
end

-- The glowing pad that groups up and starts an Act I run. Purely visual here:
-- ActService detects who is standing on it, runs the auto-start countdown, and
-- drives the billboard text (Label/Text) to show party count + timer.
function WorldService:_buildStartPad(parent: Instance, pos: Vector3)
	local pad = Instance.new("Model")
	pad.Name = "StartPad"

	local disc = part(pad, "Disc", Vector3.new(14, 0.6, 14), pos + Vector3.new(0, 0.6, 0), TRIM_COLOR, Enum.Material.Neon)
	disc.Shape = Enum.PartType.Cylinder -- rotate a cylinder flat
	disc.Size = Vector3.new(0.6, 14, 14)
	disc.CFrame = CFrame.new(pos + Vector3.new(0, 0.6, 0)) * CFrame.Angles(0, 0, math.rad(90))
	pad.PrimaryPart = disc

	local light = Instance.new("PointLight")
	light.Color = TRIM_COLOR
	light.Brightness = 3
	light.Range = 30
	light.Parent = disc

	local billboard = Instance.new("BillboardGui")
	billboard.Name = "Label"
	billboard.Size = UDim2.fromOffset(260, 72)
	billboard.StudsOffset = Vector3.new(0, 7, 0)
	billboard.AlwaysOnTop = true
	billboard.Adornee = disc
	local label = Instance.new("TextLabel")
	label.Name = "Text"
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBold
	label.TextColor3 = Color3.fromRGB(200, 225, 255)
	label.TextStrokeTransparency = 0.3
	label.TextSize = 22
	label.Text = "ACT I"
	label.Parent = billboard
	billboard.Parent = disc

	pad.Parent = parent
end

-- ==========================================================================
-- Act I "The Buried Approach" — staged world builder + decor
-- ==========================================================================

local RUBBLE_COLOR = Color3.fromRGB(64, 60, 54)
local STONE_COLOR = Color3.fromRGB(78, 74, 68)
local DARK_STONE = Color3.fromRGB(38, 36, 40)
local GATE_FRAME_COLOR = Color3.fromRGB(26, 24, 30)
local GATE_CLOSED_COLOR = Color3.fromRGB(220, 50, 50)

-- A wall-mounted torch: bracket + glowing head with a warm PointLight and a
-- small fire ParticleEmitter. Purely decorative (CanCollide off).
local function torch(parent: Instance, pos: Vector3)
	local bracket = part(parent, "TorchBracket", Vector3.new(0.6, 2.6, 0.6), pos, Color3.fromRGB(40, 34, 28), Enum.Material.Metal)
	bracket.CanCollide = false
	local head = part(parent, "TorchFlame", Vector3.new(1, 1, 1), pos + Vector3.new(0, 1.7, 0), Color3.fromRGB(255, 150, 50), Enum.Material.Neon)
	head.Shape = Enum.PartType.Ball
	head.CanCollide = false

	local light = Instance.new("PointLight")
	light.Color = Color3.fromRGB(255, 170, 90)
	light.Brightness = 2.2
	light.Range = 20
	light.Parent = head

	local fire = Instance.new("ParticleEmitter")
	fire.Texture = "rbxassetid://243098098"
	fire.Rate = 26
	fire.Lifetime = NumberRange.new(0.5, 0.8)
	fire.Speed = NumberRange.new(2, 4)
	fire.SpreadAngle = Vector2.new(12, 12)
	fire.Size = NumberSequence.new(1.6)
	fire.Color = ColorSequence.new(Color3.fromRGB(255, 200, 120), Color3.fromRGB(220, 80, 30))
	fire.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.2),
		NumberSequenceKeypoint.new(1, 1),
	})
	fire.LightEmission = 0.7
	fire.Acceleration = Vector3.new(0, 6, 0)
	fire.Parent = head
end

-- A hanging brazier bowl on a chain stub with a glowing coal.
local function brazier(parent: Instance, base: Vector3, accent: Color3)
	part(parent, "BrazierStem", Vector3.new(1, 3.2, 1), base + Vector3.new(0, 1.6, 0), DARK_STONE, Enum.Material.Metal)
	local bowl = part(parent, "BrazierBowl", Vector3.new(3.4, 1, 3.4), base + Vector3.new(0, 3.4, 0), Color3.fromRGB(58, 52, 48), Enum.Material.Metal)
	bowl.CanCollide = false
	local coal = part(parent, "BrazierCoal", Vector3.new(2.6, 1.2, 2.6), base + Vector3.new(0, 4, 0), accent, Enum.Material.Neon)
	coal.CanCollide = false
	local light = Instance.new("PointLight")
	light.Color = accent
	light.Brightness = 2
	light.Range = 24
	light.Parent = coal
end

-- A broken/leaning pillar with a rubble base — reads as ruin.
local function brokenPillar(parent: Instance, base: Vector3, height: number, lean: number)
	local col = part(parent, "RuinPillar", Vector3.new(3.2, height, 3.2), base + Vector3.new(0, height / 2, 0), STONE_COLOR, Enum.Material.Concrete)
	col.CFrame = CFrame.new(base + Vector3.new(0, height / 2, 0)) * CFrame.Angles(math.rad(lean), 0, math.rad(lean * 0.5))
	part(parent, "RuinBase", Vector3.new(5, 1.4, 5), base + Vector3.new(0, 0.7, 0), RUBBLE_COLOR, Enum.Material.Slate).CanCollide = false
end

-- A scatter of small rubble chunks around a point (decor, non-colliding).
local function rubble(parent: Instance, center: Vector3, spread: number, count: number)
	for i = 1, count do
		local a = (i / count) * math.pi * 2 + center.X
		local r = spread * (0.4 + (i % 3) * 0.25)
		local p = center + Vector3.new(math.cos(a) * r, 0.4, math.sin(a) * r)
		local chunk = part(parent, "Rubble", Vector3.new(1.4 + (i % 3), 0.8 + (i % 2), 1.4 + (i % 2)), p, RUBBLE_COLOR, Enum.Material.Slate)
		chunk.CanCollide = false
		chunk.CFrame = CFrame.new(p) * CFrame.Angles(0, a, 0)
	end
end

-- A simple statue-from-parts (plinth + torso + head) facing +Z.
local function statue(parent: Instance, base: Vector3, accent: Color3)
	part(parent, "StatuePlinth", Vector3.new(4, 2, 4), base + Vector3.new(0, 1, 0), DARK_STONE, Enum.Material.Slate)
	part(parent, "StatueBody", Vector3.new(2.2, 5, 1.6), base + Vector3.new(0, 4.5, 0), STONE_COLOR, Enum.Material.Marble)
	local head = part(parent, "StatueHead", Vector3.new(1.4, 1.4, 1.4), base + Vector3.new(0, 7.7, 0), STONE_COLOR, Enum.Material.Marble)
	head.Shape = Enum.PartType.Ball
	head.CanCollide = false
	local eyes = part(parent, "StatueEyes", Vector3.new(1.5, 0.3, 0.3), base + Vector3.new(0, 7.8, 0.7), accent, Enum.Material.Neon)
	eyes.CanCollide = false
end

-- A glowing floating crystal cluster (small light source + accent).
local function crystal(parent: Instance, base: Vector3, accent: Color3)
	local c = part(parent, "Crystal", Vector3.new(1.6, 3.4, 1.6), base + Vector3.new(0, 2, 0), accent, Enum.Material.Neon)
	c.Transparency = 0.15
	c.CanCollide = false
	c.CFrame = CFrame.new(base + Vector3.new(0, 2, 0)) * CFrame.Angles(math.rad(12), 0, math.rad(8))
	local light = Instance.new("PointLight")
	light.Color = accent
	light.Brightness = 1.6
	light.Range = 16
	light.Parent = c
end

-- A freestanding stone arch spanning across Z at an X station.
local function arch(parent: Instance, center: Vector3, span: number, height: number)
	for _, sz in { -1, 1 } do
		part(parent, "ArchLeg", Vector3.new(2.4, height, 3), center + Vector3.new(0, height / 2, sz * span / 2), STONE_COLOR, Enum.Material.Concrete)
	end
	part(parent, "ArchTop", Vector3.new(2.4, 2.2, span + 3), center + Vector3.new(0, height + 1.1, 0), DARK_STONE, Enum.Material.Concrete).CanCollide = false
end

-- A GATE across the +X corridor at `x`: a dark frame (two posts + lintel) plus a
-- glowing red energy pane that blocks passage. ActService toggles the pane to
-- open the gate (green flash → transparent + non-collidable) and restores it on
-- run end. Named `Gate{id}` with the pane as child "Pane".
function WorldService:_buildGate(parent: Instance, id: number, x: number, width: number, height: number, accent: Color3)
	local gate = Instance.new("Model")
	gate.Name = "Gate" .. id
	local baseY = 0

	-- Dark stone frame.
	for _, sz in { -1, 1 } do
		part(gate, "GatePost", Vector3.new(4, height + 4, 5), Vector3.new(x, baseY + (height + 4) / 2, sz * (width / 2 + 2)), GATE_FRAME_COLOR, Enum.Material.Slate)
	end
	part(gate, "GateLintel", Vector3.new(5, 5, width + 12), Vector3.new(x, baseY + height + 2, 0), GATE_FRAME_COLOR, Enum.Material.Slate)
	-- Accent runes along the lintel.
	local runes = part(gate, "GateRunes", Vector3.new(1, 1.4, width + 6), Vector3.new(x, baseY + height + 2, 0), accent, Enum.Material.Neon)
	runes.CanCollide = false

	-- The energy pane: the actual barrier. Closed = red neon, semi-transparent,
	-- collidable. ActService owns opening/closing it.
	local pane = part(gate, "Pane", Vector3.new(1.6, height, width), Vector3.new(x, baseY + height / 2, 0), GATE_CLOSED_COLOR, Enum.Material.ForceField)
	pane.Transparency = 0.35
	pane.CanCollide = true
	local glow = Instance.new("PointLight")
	glow.Name = "Glow"
	glow.Color = GATE_CLOSED_COLOR
	glow.Brightness = 1.4
	glow.Range = 20
	glow.Parent = pane

	gate.Parent = parent
end

-- A SIGIL pedestal: a plinth with a neon rune disc on top. ActService finds these
-- by name (`Sigil{i}`) and brightens/recolors the disc when channelled. The disc
-- starts dim; the "Beam" pillar is hidden until activation.
function WorldService:_buildSigil(parent: Instance, id: number, pos: Vector3, accent: Color3)
	local sigil = Instance.new("Model")
	sigil.Name = "Sigil" .. id

	part(sigil, "Plinth", Vector3.new(6, 4, 6), pos + Vector3.new(0, 2, 0), DARK_STONE, Enum.Material.Slate)
	part(sigil, "PlinthCap", Vector3.new(7, 0.6, 7), pos + Vector3.new(0, 4.3, 0), STONE_COLOR, Enum.Material.Concrete).CanCollide = false

	local disc = part(sigil, "Disc", Vector3.new(5, 0.4, 5), pos + Vector3.new(0, 4.7, 0), accent, Enum.Material.Neon)
	disc.Shape = Enum.PartType.Cylinder
	disc.Size = Vector3.new(0.4, 5, 5)
	disc.CFrame = CFrame.new(pos + Vector3.new(0, 4.7, 0)) * CFrame.Angles(0, 0, math.rad(90))
	disc.Transparency = 0.55 -- dim until channelled
	disc.CanCollide = false

	local light = Instance.new("PointLight")
	light.Name = "Glow"
	light.Color = accent
	light.Brightness = 0.6 -- dim until channelled
	light.Range = 14
	light.Parent = disc

	-- A vertical beam that ActService reveals when the sigil goes active.
	local beam = part(sigil, "Beam", Vector3.new(2.2, 40, 2.2), pos + Vector3.new(0, 24, 0), accent, Enum.Material.Neon)
	beam.Transparency = 1 -- hidden until activated
	beam.CanCollide = false
	beam.CanQuery = false

	sigil.Parent = parent
end

-- A short walled corridor floor connecting two stage regions across [x0, x1].
function WorldService:_buildCorridor(parent: Instance, x0: number, x1: number, width: number, accent: Color3)
	local cx = (x0 + x1) / 2
	local length = x1 - x0 + 4
	local floor = part(parent, "CorridorFloor", Vector3.new(length, 2, width), Vector3.new(cx, -0.95, 0), Color3.fromRGB(46, 44, 42), Enum.Material.Slate)
	floor.Reflectance = 0.02
	-- Visible low side walls + invisible tall containment above them.
	for _, sz in { -1, 1 } do
		part(parent, "CorridorWall", Vector3.new(length, 10, 3), Vector3.new(cx, 5, sz * (width / 2 + 1.5)), STONE_COLOR, Enum.Material.Concrete)
		part(parent, "CorridorTrim", Vector3.new(length, 0.6, 0.8), Vector3.new(cx, 10.2, sz * (width / 2 + 1.5)), accent, Enum.Material.Neon).CanCollide = false
		local barrier = Instance.new("Part")
		barrier.Name = "CorridorBarrier"
		barrier.Anchored = true
		barrier.CanCollide = true
		barrier.Transparency = 1
		barrier.CastShadow = false
		barrier.Size = Vector3.new(length, WALL_HEIGHT, 3)
		barrier.Position = Vector3.new(cx, WALL_HEIGHT / 2 + 8, sz * (width / 2 + 1.5))
		barrier.Parent = parent
	end
end

-- A sealed sarcophagus/tomb box (dark stone body + a slightly raised lid). Decor
-- only (non-colliding) so the narrow crypt never snags a running player.
local function sarcophagus(parent: Instance, base: Vector3, alongX: boolean)
	local bodySize = if alongX then Vector3.new(5.5, 2.4, 2.6) else Vector3.new(2.6, 2.4, 5.5)
	local lidSize = if alongX then Vector3.new(5.8, 0.7, 2.9) else Vector3.new(2.9, 0.7, 5.8)
	part(parent, "Sarcophagus", bodySize, base + Vector3.new(0, 1.2, 0), Color3.fromRGB(52, 50, 46), Enum.Material.Slate).CanCollide = false
	part(parent, "SarcophagusLid", lidSize, base + Vector3.new(0, 2.7, 0), Color3.fromRGB(66, 62, 56), Enum.Material.Slate).CanCollide = false
end

-- A leaning cracked slab propped against a wall — reads as collapsed masonry.
local function leaningSlab(parent: Instance, base: Vector3, lean: number)
	local slab = part(parent, "Slab", Vector3.new(4.5, 6, 0.8), base + Vector3.new(0, 3, 0), STONE_COLOR, Enum.Material.Slate)
	slab.CanCollide = false
	slab.CFrame = CFrame.new(base + Vector3.new(0, 3, 0)) * CFrame.Angles(math.rad(lean), 0, math.rad(lean * 0.4))
end

-- A small tree from parts (trunk + rounded foliage) for the shrine's serenity.
local function simpleTree(parent: Instance, base: Vector3)
	part(parent, "TreeTrunk", Vector3.new(1.2, 5, 1.2), base + Vector3.new(0, 2.5, 0), Color3.fromRGB(70, 52, 36), Enum.Material.Wood).CanCollide = false
	local foliage = part(parent, "TreeFoliage", Vector3.new(5, 4.5, 5), base + Vector3.new(0, 6.4, 0), Color3.fromRGB(70, 130, 96), Enum.Material.Grass)
	foliage.Shape = Enum.PartType.Ball
	foliage.CanCollide = false
end

-- Stage-specific decor pass: sprinkles ruin/torches/statues to give each region
-- its own look without blowing the part budget. Keyed off `stage.kind` so it
-- tracks the eight-stage layout even as ids/coordinates change.
function WorldService:_decorateStage(parent: Instance, stage)
	local c = stage.center
	local accent = stage.accent
	local halfX = stage.sizeX / 2
	local halfZ = stage.sizeZ / 2
	local kind = stage.kind

	-- Wall torches along both long edges (a few, evenly spaced). The shrine stays
	-- unlit by fire — its teal glow comes from the shrine structure itself.
	if kind ~= "shrine" then
		local torchCount = math.clamp(math.floor(stage.sizeX / 110), 2, 4)
		for i = 1, torchCount do
			local fx = c.X - halfX + (i / (torchCount + 1)) * stage.sizeX
			torch(parent, Vector3.new(fx, 6, c.Z - halfZ + 1.5))
			torch(parent, Vector3.new(fx, 6, c.Z + halfZ - 1.5))
		end
	end

	if kind == "road" then
		-- Causeway: leaning broken pillars + rubble lining the road, plus arches.
		for i = 1, 4 do
			local fx = c.X - halfX + (i / 5) * stage.sizeX
			brokenPillar(parent, Vector3.new(fx, 0, c.Z - halfZ + 12), 10 + (i % 3) * 3, (i % 2 == 0) and 6 or -5)
			brokenPillar(parent, Vector3.new(fx, 0, c.Z + halfZ - 12), 9 + (i % 2) * 4, (i % 2 == 0) and -6 or 5)
			rubble(parent, Vector3.new(fx, 0, c.Z), 10, 4)
		end
		arch(parent, Vector3.new(c.X - halfX + 40, 0, c.Z), stage.sizeZ - 16, 22)
		arch(parent, Vector3.new(c.X + halfX - 40, 0, c.Z), stage.sizeZ - 16, 22)
	elseif kind == "crypt" then
		-- Collapsed crypt: cracked tombs, leaning slabs, rubble. Kept off the
		-- centre line so nothing overlaps the floor gaps or blocks the way.
		sarcophagus(parent, Vector3.new(c.X - halfX + 24, 0, c.Z - halfZ + 12), true)
		sarcophagus(parent, Vector3.new(c.X + halfX - 24, 0, c.Z + halfZ - 12), true)
		leaningSlab(parent, Vector3.new(c.X - 6, 0, c.Z + halfZ - 3), -14)
		leaningSlab(parent, Vector3.new(c.X + 30, 0, c.Z - halfZ + 3), 14)
		rubble(parent, Vector3.new(c.X - halfX + 30, 0, c.Z + halfZ - 18), 10, 4)
		rubble(parent, Vector3.new(c.X + halfX - 30, 0, c.Z - halfZ + 18), 10, 4)
	elseif kind == "sigils" then
		-- Sigil plaza: flanking statues + glowing crystals + corner braziers.
		statue(parent, Vector3.new(c.X - halfX + 22, 0, c.Z - halfZ + 22), accent)
		statue(parent, Vector3.new(c.X + halfX - 22, 0, c.Z - halfZ + 22), accent)
		for _, sx in { -1, 1 } do
			brazier(parent, Vector3.new(c.X + sx * (halfX - 16), 0, c.Z - halfZ + 16), accent)
			crystal(parent, Vector3.new(c.X + sx * (halfX - 34), 0, c.Z - halfZ + 40), accent)
		end
		rubble(parent, c, 24, 6)
	elseif kind == "stealth" then
		-- Watchers' Hall: colonnades down both sides (cover to sneak between) with
		-- gold lantern caps, plus a couple of hanging braziers for moody fill.
		for i = 1, 4 do
			local fx = c.X - halfX + (i / 5) * stage.sizeX
			for _, sz in { -1, 1 } do
				local pz = c.Z + sz * (halfZ - 10)
				part(parent, "HallColumn", Vector3.new(3.4, BUILDING_HEIGHT - 1, 3.4), Vector3.new(fx, c.Y + (BUILDING_HEIGHT - 1) / 2, pz), STONE_COLOR, Enum.Material.Concrete)
				part(parent, "HallColumnLantern", Vector3.new(2.4, 1.4, 2.4), Vector3.new(fx, c.Y + 4.5, pz + sz * -2.4), accent, Enum.Material.Neon).CanCollide = false
			end
		end
		brazier(parent, Vector3.new(c.X - halfX + 40, 0, c.Z), accent)
		brazier(parent, Vector3.new(c.X + halfX - 40, 0, c.Z), accent)
	elseif kind == "arena" then
		-- Overlook arena: broken pillars ringing the pit + braziers at the mouth.
		for i = 1, 6 do
			local a = (i / 6) * math.pi * 2
			brokenPillar(parent, c + Vector3.new(math.cos(a) * (halfX - 16), 0, math.sin(a) * (halfZ - 16)), 12 + (i % 3) * 3, (i % 2 == 0) and 7 or -7)
		end
		for _, sx in { -1, 1 } do
			brazier(parent, Vector3.new(c.X - halfX + 18, 0, c.Z + sx * 26), accent)
		end
		rubble(parent, c, 30, 5)
	elseif kind == "escape" then
		-- The Collapse: fallen pillars + rubble heaps + dread arches, all pushed to
		-- the flanks so the central ~12-stud sprint lane stays clear.
		for i = 1, 5 do
			local fx = c.X - halfX + (i / 6) * stage.sizeX
			brokenPillar(parent, Vector3.new(fx, 0, c.Z - halfZ + 9), 8 + (i % 3) * 4, (i % 2 == 0) and 26 or -22)
			brokenPillar(parent, Vector3.new(fx + 20, 0, c.Z + halfZ - 9), 9 + (i % 2) * 4, (i % 2 == 0) and -24 or 24)
			rubble(parent, Vector3.new(fx, 0, c.Z - halfZ + 7), 8, 3)
			rubble(parent, Vector3.new(fx + 12, 0, c.Z + halfZ - 7), 8, 3)
		end
		arch(parent, Vector3.new(c.X - halfX + 70, 0, c.Z), stage.sizeZ - 6, 24)
		arch(parent, Vector3.new(c.X + halfX - 70, 0, c.Z), stage.sizeZ - 6, 24)
	elseif kind == "shrine" then
		-- The Shrine sanctuary: crystal clusters + a couple of small trees for calm.
		for _, sx in { -1, 1 } do
			crystal(parent, Vector3.new(c.X + sx * (halfX - 20), 0, c.Z - halfZ + 22), accent)
			simpleTree(parent, Vector3.new(c.X + sx * (halfX - 18), 0, c.Z - 30))
		end
	else
		-- Warden's Court: throne-like statues + braziers flanking the far end.
		statue(parent, Vector3.new(c.X + halfX - 26, 0, c.Z - 20), accent)
		statue(parent, Vector3.new(c.X + halfX - 26, 0, c.Z + 20), accent)
		for _, sz in { -1, 1 } do
			brazier(parent, Vector3.new(c.X + halfX - 40, 0, c.Z + sz * 44), accent)
			crystal(parent, Vector3.new(c.X - halfX + 34, 0, c.Z + sz * 40), accent)
		end
		arch(parent, Vector3.new(c.X - halfX + 34, 0, c.Z), stage.sizeZ - 20, 26)
		rubble(parent, c, 30, 6)
	end
end

-- ==========================================================================
-- Interactive/segment geometry for the new Act I stages. Each builds instances
-- under the Act1 model named per the WorldService<->ActService NAMING CONTRACT.
-- ==========================================================================

-- A small treasure chest (dark wood body, gold trim band, slightly raised lid).
-- Built FULLY HIDDEN — every BasePart Transparency 1 / CanCollide false / CanQuery
-- true — plus a warm gold PointLight (disabled). ActService reveals a subset each
-- run by toggling transparency/light and runs its own proximity pickup.
function WorldService:_buildChest(parent: Instance, name: string, pos: Vector3)
	local chest = Instance.new("Model")
	chest.Name = name

	local body = part(chest, "Body", Vector3.new(4, 2.2, 2.8), pos + Vector3.new(0, 1.3, 0), Color3.fromRGB(66, 44, 26), Enum.Material.Wood)
	part(chest, "Lid", Vector3.new(4.2, 0.9, 3), pos + Vector3.new(0, 2.7, 0), Color3.fromRGB(80, 54, 32), Enum.Material.Wood)
	part(chest, "TrimBand", Vector3.new(4.3, 0.5, 3), pos + Vector3.new(0, 1.9, 0), Color3.fromRGB(205, 168, 72), Enum.Material.Metal)
	part(chest, "Lock", Vector3.new(0.7, 0.9, 0.3), pos + Vector3.new(0, 1.9, 1.55), Color3.fromRGB(222, 182, 92), Enum.Material.Metal)
	chest.PrimaryPart = body

	for _, p in chest:GetChildren() do
		if p:IsA("BasePart") then
			p.Transparency = 1
			p.CanCollide = false
			p.CanQuery = true
		end
	end

	local glow = Instance.new("PointLight")
	glow.Name = "Glow"
	glow.Color = Color3.fromRGB(255, 200, 110)
	glow.Brightness = 2.4
	glow.Range = 16
	glow.Enabled = false
	glow.Parent = body

	chest.Parent = parent
end

-- An imposing ~9-stud stone sentinel (plinth + body + head) with a glowing "Eye"
-- and a long semi-transparent "GazeCone" extending `range` studs out its front
-- (-Z / LookVector). Built at `w.pos` facing `w.facingDeg` yaw; the cone is part
-- of the model so ActService's per-tick PivotTo sweeps it with the statue.
function WorldService:_buildWatcher(parent: Instance, id: number, w)
	local base = CFrame.new(w.pos) * CFrame.Angles(0, math.rad(w.facingDeg), 0)
	local model = Instance.new("Model")
	model.Name = "Watcher" .. id

	local function bp(name: string, size: Vector3, offset: Vector3, color: Color3, material: Enum.Material): BasePart
		local p = Instance.new("Part")
		p.Name = name
		p.Anchored = true
		p.Size = size
		p.CFrame = base * CFrame.new(offset)
		p.Color = color
		p.Material = material
		p.TopSurface = Enum.SurfaceType.Smooth
		p.BottomSurface = Enum.SurfaceType.Smooth
		p.Parent = model
		return p
	end

	bp("Plinth", Vector3.new(5, 2, 5), Vector3.new(0, 1, 0), DARK_STONE, Enum.Material.Slate)
	local body = bp("Body", Vector3.new(3, 5, 2), Vector3.new(0, 4.5, 0), STONE_COLOR, Enum.Material.Marble)
	bp("Head", Vector3.new(1.9, 1.9, 1.9), Vector3.new(0, 7.6, 0), STONE_COLOR, Enum.Material.Marble)

	local eye = bp("Eye", Vector3.new(1.2, 0.5, 0.4), Vector3.new(0, 7.7, -0.95), Color3.fromRGB(255, 224, 130), Enum.Material.Neon)
	eye.CanCollide = false
	local eyeLight = Instance.new("PointLight")
	eyeLight.Name = "Glow"
	eyeLight.Color = Color3.fromRGB(255, 214, 120)
	eyeLight.Brightness = 1.6
	eyeLight.Range = 16
	eyeLight.Parent = eye

	local cone = bp("GazeCone", Vector3.new(6, 0.4, w.range), Vector3.new(0, 7.7, -(w.range / 2) - 1), Color3.fromRGB(235, 200, 90), Enum.Material.Neon)
	cone.Transparency = 0.75
	cone.CanCollide = false
	cone.CanQuery = false

	model.PrimaryPart = body
	model.Parent = parent
end

-- The DoomWall: a burning-orange barrier spanning the escape corridor cross-section
-- at `escape.wallStartX`. Starts invisible + non-colliding; ActService reveals,
-- advances and resets it during the run.
function WorldService:_buildDoomWall(parent: Instance, stage)
	local esc = stage.escape
	local wall = part(
		parent,
		"DoomWall",
		Vector3.new(3, 30, stage.sizeZ),
		Vector3.new(esc.wallStartX, stage.center.Y + 15, stage.center.Z),
		Color3.fromRGB(255, 120, 40),
		Enum.Material.Neon
	)
	wall.Transparency = 1
	wall.CanCollide = false
	wall.CastShadow = false
end

-- The Shrine: a raised circular dais, a glowing teal monolith centerpiece named
-- "Focus" (touchable — ActService listens for Touched), and kneeling braziers.
function WorldService:_buildShrine(parent: Instance, stage)
	local pos = stage.shrine.pos
	local accent = stage.accent
	local shrine = Instance.new("Model")
	shrine.Name = "Shrine"

	-- Two stacked circular steps (flat cylinders) for the dais.
	local dais = part(shrine, "Dais", Vector3.new(1.4, 26, 26), pos + Vector3.new(0, 0.6, 0), Color3.fromRGB(58, 74, 72), Enum.Material.Slate)
	dais.Shape = Enum.PartType.Cylinder
	dais.CFrame = CFrame.new(pos + Vector3.new(0, 0.6, 0)) * CFrame.Angles(0, 0, math.rad(90))
	local step = part(shrine, "DaisStep", Vector3.new(1.4, 17, 17), pos + Vector3.new(0, 1.4, 0), Color3.fromRGB(68, 88, 84), Enum.Material.Slate)
	step.Shape = Enum.PartType.Cylinder
	step.CFrame = CFrame.new(pos + Vector3.new(0, 1.4, 0)) * CFrame.Angles(0, 0, math.rad(90))

	-- The touchable teal monolith. CanCollide true so Touched fires reliably.
	local focus = part(shrine, "Focus", Vector3.new(3, 8, 3), pos + Vector3.new(0, 6, 0), Color3.fromRGB(120, 235, 215), Enum.Material.Neon)
	focus.Transparency = 0.1
	focus.CanCollide = true
	local focusLight = Instance.new("PointLight")
	focusLight.Name = "Glow"
	focusLight.Color = accent
	focusLight.Brightness = 2.4
	focusLight.Range = 30
	focusLight.Parent = focus

	-- Four kneeling-height braziers ringing the dais.
	for i = 1, 4 do
		local a = (i / 4) * math.pi * 2 + math.pi / 4
		local bx = pos.X + math.cos(a) * 11
		local bz = pos.Z + math.sin(a) * 11
		part(shrine, "Candle", Vector3.new(1, 3, 1), Vector3.new(bx, 3.4, bz), Color3.fromRGB(60, 74, 72), Enum.Material.Concrete).CanCollide = false
		local flame = part(shrine, "CandleFlame", Vector3.new(1, 1, 1), Vector3.new(bx, 5.2, bz), accent, Enum.Material.Neon)
		flame.Shape = Enum.PartType.Ball
		flame.CanCollide = false
		local fl = Instance.new("PointLight")
		fl.Color = accent
		fl.Brightness = 1.4
		fl.Range = 14
		fl.Parent = flame
	end

	shrine.PrimaryPart = focus
	shrine.Parent = parent
end

-- A side alcove attached to a plaza's south (+Z) edge. Builds its own floor/trim,
-- low ruined walls + tall invisible containment on its three exposed edges, and
-- rebuilds the plaza's south containment wall as two segments around a doorway so
-- players can walk in. The plaza must have been built with skipWalls[2] = true.
function WorldService:_buildAlcove(parent: Instance, stage)
	local al = stage.alcove
	local c = al.center
	local halfX = al.sizeX / 2
	local halfZ = al.sizeZ / 2
	local accent = stage.accent

	local floor = part(parent, "AlcoveFloor", Vector3.new(al.sizeX, 2, al.sizeZ), c + Vector3.new(0, -0.95, 0), stage.floorColor or FLOOR_COLOR, Enum.Material.Slate)
	floor.Reflectance = 0.02

	local trimY = c.Y + 0.4
	part(parent, "AlcoveTrimS", Vector3.new(al.sizeX + 2, 0.8, 2), Vector3.new(c.X, trimY, c.Z + halfZ), accent, Enum.Material.Neon).CanCollide = false
	part(parent, "AlcoveTrimE", Vector3.new(2, 0.8, al.sizeZ + 2), Vector3.new(c.X + halfX, trimY, c.Z), accent, Enum.Material.Neon).CanCollide = false
	part(parent, "AlcoveTrimW", Vector3.new(2, 0.8, al.sizeZ + 2), Vector3.new(c.X - halfX, trimY, c.Z), accent, Enum.Material.Neon).CanCollide = false

	-- Invisible containment wall helper.
	local function barrier(name: string, size: Vector3, posv: Vector3)
		local w = Instance.new("Part")
		w.Name = name
		w.Anchored = true
		w.CanCollide = true
		w.Transparency = 1
		w.CastShadow = false
		w.Size = size
		w.Position = posv
		w.Parent = parent
	end

	-- Low ruined stone (visible decor) + tall invisible containment on S/E/W.
	part(parent, "AlcoveWallS", Vector3.new(al.sizeX + 4, 6, 2), Vector3.new(c.X, c.Y + 3, c.Z + halfZ), STONE_COLOR, Enum.Material.Concrete).CanCollide = false
	barrier("AlcoveBarrierS", Vector3.new(al.sizeX + 4, WALL_HEIGHT, 2), Vector3.new(c.X, c.Y + WALL_HEIGHT / 2, c.Z + halfZ))
	part(parent, "AlcoveWallE", Vector3.new(2, 6, al.sizeZ + 4), Vector3.new(c.X + halfX, c.Y + 3, c.Z), STONE_COLOR, Enum.Material.Concrete).CanCollide = false
	barrier("AlcoveBarrierE", Vector3.new(2, WALL_HEIGHT, al.sizeZ + 4), Vector3.new(c.X + halfX, c.Y + WALL_HEIGHT / 2, c.Z))
	part(parent, "AlcoveWallW", Vector3.new(2, 6, al.sizeZ + 4), Vector3.new(c.X - halfX, c.Y + 3, c.Z), STONE_COLOR, Enum.Material.Concrete).CanCollide = false
	barrier("AlcoveBarrierW", Vector3.new(2, WALL_HEIGHT, al.sizeZ + 4), Vector3.new(c.X - halfX, c.Y + WALL_HEIGHT / 2, c.Z))

	-- Rebuild the plaza's south wall as two segments around a doorway aligned to
	-- the alcove mouth (the plaza was built with its south wall omitted).
	local pc = stage.center
	local southZ = pc.Z + stage.sizeZ / 2
	local wallSpan = stage.sizeX + 2
	local westEdge = pc.X - wallSpan / 2
	local eastEdge = pc.X + wallSpan / 2
	local doorHalf = 20
	local doorL = c.X - doorHalf
	local doorR = c.X + doorHalf
	barrier("PlazaSouthWallL", Vector3.new(doorL - westEdge, WALL_HEIGHT, 2), Vector3.new((westEdge + doorL) / 2, pc.Y + WALL_HEIGHT / 2, southZ))
	barrier("PlazaSouthWallR", Vector3.new(eastEdge - doorR, WALL_HEIGHT, 2), Vector3.new((doorR + eastEdge) / 2, pc.Y + WALL_HEIGHT / 2, southZ))

	-- Two dim torches flanking the entrance: discoverable, not obvious.
	torch(parent, Vector3.new(doorL - 2, 6, southZ - 1.5))
	torch(parent, Vector3.new(doorR + 2, 6, southZ - 1.5))
end

-- The crypt's segmented floor: solid strips between the config `gaps`, with a
-- sunken pit floor ~8 studs down under each gap and a tilted ramp at the +Z end so
-- a party member who drops in climbs back out rather than dying.
function WorldService:_buildCryptFloor(parent: Instance, stage)
	local c = stage.center
	local sizeZ = stage.sizeZ
	local floorColor = stage.floorColor or FLOOR_COLOR
	local westEdge = c.X - stage.sizeX / 2
	local eastEdge = c.X + stage.sizeX / 2
	local topY = -0.95 -- floor part center; top face at +0.05

	-- Build solid floor strips between successive gaps (gaps are given in +X order).
	local cursor = westEdge
	local function strip(x0: number, x1: number)
		if x1 - x0 <= 0.5 then
			return
		end
		local f = part(parent, "Floor", Vector3.new(x1 - x0, 2, sizeZ), Vector3.new((x0 + x1) / 2, topY, c.Z), floorColor, Enum.Material.Slate)
		f.Reflectance = 0.02
	end
	for _, gap in stage.gaps do
		local gl = gap.x - gap.width / 2
		local gr = gap.x + gap.width / 2
		strip(cursor, gl)
		cursor = gr

		-- Sunken pit floor 8 studs down under the gap.
		part(parent, "PitFloor", Vector3.new(gap.width + 2, 2, sizeZ), Vector3.new(gap.x, topY - 8, c.Z), Color3.fromRGB(28, 30, 30), Enum.Material.Slate)

		-- Climb-out ramp along the +Z edge, rising +X from the pit up to floor level.
		local ramp = part(parent, "PitRamp", Vector3.new(gap.width + 16, 1.2, 12), Vector3.new(gap.x + 2, topY - 3.6, c.Z + sizeZ / 2 - 8), STONE_COLOR, Enum.Material.Slate)
		ramp.CFrame = CFrame.new(ramp.Position) * CFrame.Angles(0, 0, math.rad(18))
	end
	strip(cursor, eastEdge)
end

-- Builds the whole Act I march: eight framed stage regions (a rectangular road,
-- interior crypt/stealth halls, arenas, an escape run, a shrine and the boss
-- court), the corridors + gates between them, sigils, and every interactive prop
-- named per the WorldService<->ActService NAMING CONTRACT. Entirely config-driven
-- off `Zones.Act1.stages` — no stage count or coordinate is hardcoded here.
function WorldService:_buildAct1(parent: Instance)
	local Act1 = require(Shared.Config.Zones).Act1
	local act1 = Instance.new("Model")
	act1.Name = "Act1"

	for _, stage in Act1.stages do
		-- The framed region. Enclosed stages get a dark, torch-lit hall with ±X
		-- doorways for the corridors; the crypt additionally supplies its own
		-- segmented (gapped) floor. The sigil plaza omits its south wall so the
		-- alcove doorway can open through it.
		if stage.kind == "crypt" then
			self:_buildZone(act1, stage.center, stage.sizeX, stage.accent, true, stage.sizeZ, stage.floorColor, { dark = true, doorWidth = 48 }, nil, true)
			self:_buildCryptFloor(act1, stage)
		elseif stage.enclosed then
			self:_buildZone(act1, stage.center, stage.sizeX, stage.accent, true, stage.sizeZ, stage.floorColor, { dark = true, doorWidth = 48 })
		elseif stage.alcove then
			self:_buildZone(act1, stage.center, stage.sizeX, stage.accent, false, stage.sizeZ, stage.floorColor, nil, { [2] = true })
		else
			self:_buildZone(act1, stage.center, stage.sizeX, stage.accent, false, stage.sizeZ, stage.floorColor)
		end
		self:_decorateStage(act1, stage)

		-- Side alcove (sigil plaza's hidden third-sigil room).
		if stage.alcove then
			self:_buildAlcove(act1, stage)
		end

		-- Hidden treasure chests: a chest per pool slot, named Chest<id>_<i>.
		if stage.chestPool then
			for i, pos in stage.chestPool do
				self:_buildChest(act1, "Chest" .. stage.id .. "_" .. i, pos)
			end
		end
		if stage.secretChest then
			self:_buildChest(act1, "Chest" .. stage.id .. "_1", stage.secretChest.pos)
		end

		-- Sweeping-gaze Watcher statues (stealth hall).
		if stage.watchers then
			for i, w in stage.watchers do
				self:_buildWatcher(act1, i, w)
			end
		end

		-- The advancing DoomWall (escape run).
		if stage.escape then
			self:_buildDoomWall(act1, stage)
		end

		-- The healing shrine (its secret chest was built above via secretChest).
		if stage.shrine then
			self:_buildShrine(act1, stage)
		end

		-- Exit gate + corridor to the next stage (every stage with a `gate` field).
		if stage.gate then
			self:_buildGate(act1, stage.id, stage.gate.x, stage.gate.width, stage.gate.height, stage.accent)
			local next = Act1.stages[stage.id + 1]
			if next then
				local westEdge = next.center.X - next.sizeX / 2
				self:_buildCorridor(act1, stage.gate.x, westEdge, stage.gate.width - 6, stage.accent)
			end
		end

		-- Sigil pedestals (sigil plaza).
		if stage.sigils then
			for i, pos in stage.sigils do
				self:_buildSigil(act1, i, pos, stage.accent)
			end
		end
	end

	act1.Parent = parent
end

function WorldService:Start()
	self:_applyLighting()

	-- The world is built entirely at runtime — remove any leftover Studio
	-- template geometry. The default Baseplate's top face sits at exactly Y=0,
	-- coplanar with our zone floors, which is what caused the flickering
	-- color-fighting floor.
	-- (our own SpawnLocation lives inside Zones/Lobby, never as a direct child)
	for _, child in Workspace:GetChildren() do
		if child.Name == "Baseplate" or child:IsA("SpawnLocation") then
			child:Destroy()
		end
	end

	if Workspace:FindFirstChild("Zones") then
		return
	end

	local zones = Instance.new("Model")
	zones.Name = "Zones"

	-- Lobby -------------------------------------------------------------
	local lobby = Instance.new("Model")
	lobby.Name = "Lobby"
	self:_buildZone(lobby, Zones.Lobby.center, Zones.Lobby.size, TRIM_COLOR, true)
	self:_furnishLobby(lobby, Zones.Lobby.center, Zones.Lobby.size, TRIM_COLOR)
	self:_buildShop(lobby, Zones.Lobby.center + Vector3.new(-42, 0, -6))
	self:_buildStartPad(lobby, Zones.Lobby.startPad)

	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "Spawn"
	spawn.Anchored = true
	spawn.Size = Vector3.new(12, 1, 12)
	spawn.Position = Zones.Lobby.playerSpawn - Vector3.new(0, 3.5, 0)
	spawn.Color = Color3.fromRGB(90, 130, 200)
	spawn.Material = Enum.Material.Neon
	spawn.Neutral = true
	spawn.Parent = lobby
	lobby.Parent = zones

	-- Act I "The Buried Approach" — four staged regions marching +X ----------
	self:_buildAct1(zones)

	zones.Parent = Workspace

	-- Drifting cloud cover over the far zones for depth (kept subtle).
	local terrain = Workspace:FindFirstChildOfClass("Terrain")
	if terrain and not terrain:FindFirstChildOfClass("Clouds") then
		local clouds = Instance.new("Clouds")
		clouds.Cover = 0.55
		clouds.Density = 0.55
		clouds.Color = Color3.fromRGB(180, 186, 200)
		clouds.Parent = terrain
	end
end

return WorldService
