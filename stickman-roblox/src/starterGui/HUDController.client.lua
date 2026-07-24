--!strict
--[[
	HUDController (StarterGui)
	--------------------------
	Minimal authoritative-health HUD. Reads the server's HealthChanged event as
	the source of truth (never local state) and falls back to the character's
	Health attribute for the initial value. Lives in StarterGui so it is a
	per-player screen surface, separate from gameplay controllers.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Net.Net)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local screen = Instance.new("ScreenGui")
screen.Name = "HUD"
screen.ResetOnSpawn = false
screen.IgnoreGuiInset = true
screen.Parent = playerGui

local container = Instance.new("Frame")
container.Size = UDim2.fromOffset(320, 26)
container.Position = UDim2.new(0, 24, 1, -56)
container.BackgroundColor3 = Color3.fromRGB(18, 18, 22)
container.BorderSizePixel = 0
container.Parent = screen

local fill = Instance.new("Frame")
fill.Name = "Fill"
fill.Size = UDim2.fromScale(1, 1)
fill.BackgroundColor3 = Color3.fromRGB(200, 70, 70)
fill.BorderSizePixel = 0
fill.Parent = container

local label = Instance.new("TextLabel")
label.Size = UDim2.fromScale(1, 1)
label.BackgroundTransparency = 1
label.Font = Enum.Font.GothamBold
label.TextColor3 = Color3.fromRGB(240, 240, 240)
label.TextScaled = false
label.TextSize = 16
label.Text = "100 / 100"
label.Parent = container

-- Super meter, sitting just under the health bar.
local superBar = Instance.new("Frame")
superBar.Name = "SuperBar"
superBar.Size = UDim2.fromOffset(320, 12)
superBar.Position = UDim2.new(0, 24, 1, -26)
superBar.BackgroundColor3 = Color3.fromRGB(18, 18, 22)
superBar.BorderSizePixel = 0
superBar.Parent = screen

local superFill = Instance.new("Frame")
superFill.Name = "Fill"
superFill.Size = UDim2.fromScale(0, 1)
superFill.BackgroundColor3 = Color3.fromRGB(90, 150, 240)
superFill.BorderSizePixel = 0
superFill.Parent = superBar

local superLabel = Instance.new("TextLabel")
superLabel.Size = UDim2.fromScale(1, 1)
superLabel.BackgroundTransparency = 1
superLabel.Font = Enum.Font.GothamBold
superLabel.TextColor3 = Color3.fromRGB(235, 238, 245)
superLabel.TextSize = 10
superLabel.Text = "SUPER"
superLabel.Parent = superBar

local function renderSuper(meter: number, max: number)
	local pct = math.clamp(meter / math.max(max, 1), 0, 1)
	TweenService:Create(superFill, TweenInfo.new(0.18), { Size = UDim2.fromScale(pct, 1) }):Play()
	if pct >= 1 then
		-- Full: glow gold and prompt the player to press R.
		superFill.BackgroundColor3 = Color3.fromRGB(255, 205, 80)
		superLabel.Text = "SUPER READY  [R]"
	else
		superFill.BackgroundColor3 = Color3.fromRGB(90, 150, 240)
		superLabel.Text = "SUPER"
	end
end

-- Coin counter (persistent profile currency), top-left corner.
local coinLabel = Instance.new("TextLabel")
coinLabel.Name = "Coins"
coinLabel.Size = UDim2.fromOffset(180, 24)
coinLabel.Position = UDim2.fromOffset(24, 18)
coinLabel.BackgroundTransparency = 1
coinLabel.Font = Enum.Font.GothamBold
coinLabel.TextColor3 = Color3.fromRGB(255, 205, 90)
coinLabel.TextStrokeTransparency = 0.5
coinLabel.TextSize = 18
coinLabel.TextXAlignment = Enum.TextXAlignment.Left
coinLabel.Text = "\u{2B22} 0"
coinLabel.Parent = screen

local function render(health: number, maxHealth: number)
	local pct = math.clamp(health / math.max(maxHealth, 1), 0, 1)
	TweenService:Create(fill, TweenInfo.new(0.18), { Size = UDim2.fromScale(pct, 1) }):Play()
	label.Text = `{math.floor(health + 0.5)} / {maxHealth}`
end

-- Seed from attributes if the character already exists.
local function seedFromCharacter(character: Model)
	local h = character:GetAttribute("Health")
	local m = character:GetAttribute("MaxHealth")
	if typeof(h) == "number" and typeof(m) == "number" then
		render(h, m)
	end
end

if player.Character then
	seedFromCharacter(player.Character)
end
player.CharacterAdded:Connect(seedFromCharacter)

Net.event(Net.Events.HealthChanged).OnClientEvent:Connect(function(payload)
	if typeof(payload) == "table" and payload.health then
		render(payload.health, payload.maxHealth or 100)
	end
end)

Net.event(Net.Events.SuperChanged).OnClientEvent:Connect(function(payload)
	if typeof(payload) == "table" and typeof(payload.meter) == "number" then
		renderSuper(payload.meter, payload.max or 100)
	end
end)

Net.event(Net.Events.ProfileChanged).OnClientEvent:Connect(function(payload)
	if typeof(payload) == "table" and typeof(payload.coins) == "number" then
		coinLabel.Text = `\u{2B22} {payload.coins}`
	end
end)
