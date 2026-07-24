--!strict
--[[
	DebugController (Studio-only test panel)
	----------------------------------------
	The "tool ingame to test easily". Builds a button panel that fires
	DebugCommand intents to DebugService (which is itself Studio-gated). Toggle
	the panel with the \ (backslash) key.

	Only built when `RunService:IsStudio()`, so it never appears for real players.
	Every button is a shortcut for exercising the actual authoritative code path
	(spawn a real enemy, fill the real super meter, etc.) rather than a fake.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Net.Net)

local DebugController = {}

-- { label, action }. God is special-cased to toggle its own label.
local BUTTONS = {
	{ "Fill Super", "fillSuper" },
	{ "Reset Super", "resetSuper" },
	{ "Heal Full", "healFull" },
	{ "God Mode: OFF", "toggleGod" },
	{ "Spawn Grunt", "spawnGrunt" },
	{ "Spawn Reaver", "spawnReaver" },
	{ "Spawn Warden", "spawnWarden" },
	{ "Kill All Enemies", "killEnemies" },
	{ "Hurt Self (15)", "hurtSelf" },
	{ "Give 100 Coins", "giveCoins" },
	{ "Give Skill Point", "giveSkillPoint" },
	{ "Lobby Combat: OFF", "toggleLobbyCombat" },
}

function DebugController:_build()
	local player = Players.LocalPlayer
	local playerGui = player:WaitForChild("PlayerGui")

	local screen = Instance.new("ScreenGui")
	screen.Name = "DebugPanel"
	screen.ResetOnSpawn = false
	screen.DisplayOrder = 50
	screen.Parent = playerGui

	local panel = Instance.new("Frame")
	panel.Name = "Panel"
	panel.Size = UDim2.fromOffset(190, #BUTTONS * 30 + 34)
	panel.Position = UDim2.new(1, -206, 0, 16)
	panel.BackgroundColor3 = Color3.fromRGB(16, 16, 20)
	panel.BackgroundTransparency = 0.1
	panel.BorderSizePixel = 0
	panel.Parent = screen

	local layout = Instance.new("UIListLayout")
	layout.Padding = UDim.new(0, 4)
	layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Parent = panel

	local header = Instance.new("TextLabel")
	header.Size = UDim2.new(1, -8, 0, 22)
	header.BackgroundTransparency = 1
	header.Font = Enum.Font.GothamBold
	header.TextColor3 = Color3.fromRGB(255, 205, 90)
	header.TextSize = 13
	header.Text = "TEST PANEL  ( \\ )"
	header.LayoutOrder = 0
	header.Parent = panel

	local godOn = false
	local lobbyCombatOn = false
	for i, spec in BUTTONS do
		local label, action = spec[1], spec[2]
		local btn = Instance.new("TextButton")
		btn.Size = UDim2.new(1, -12, 0, 26)
		btn.BackgroundColor3 = Color3.fromRGB(36, 38, 46)
		btn.BorderSizePixel = 0
		btn.AutoButtonColor = true
		btn.Font = Enum.Font.Gotham
		btn.TextColor3 = Color3.fromRGB(232, 234, 240)
		btn.TextSize = 13
		btn.Text = label
		btn.LayoutOrder = i
		btn.Parent = panel

		btn.Activated:Connect(function()
			if action == "toggleGod" then
				godOn = not godOn
				btn.Text = godOn and "God Mode: ON" or "God Mode: OFF"
				btn.TextColor3 = godOn and Color3.fromRGB(120, 255, 150) or Color3.fromRGB(232, 234, 240)
				self._debug:FireServer(godOn and "godOn" or "godOff")
			elseif action == "toggleLobbyCombat" then
				lobbyCombatOn = not lobbyCombatOn
				btn.Text = lobbyCombatOn and "Lobby Combat: ON" or "Lobby Combat: OFF"
				btn.TextColor3 = lobbyCombatOn and Color3.fromRGB(120, 255, 150) or Color3.fromRGB(232, 234, 240)
				self._debug:FireServer(lobbyCombatOn and "lobbyCombatOn" or "lobbyCombatOff")
			else
				self._debug:FireServer(action)
			end
		end)
	end

	self._panel = panel
end

function DebugController:Init()
	self._debug = Net.event(Net.Events.DebugCommand)
end

function DebugController:Start()
	if not RunService:IsStudio() then
		return -- never build the panel for real players
	end
	self:_build()

	UserInputService.InputBegan:Connect(function(input, gameProcessed)
		if gameProcessed then
			return
		end
		if input.KeyCode == Enum.KeyCode.Backslash and self._panel then
			self._panel.Visible = not self._panel.Visible
		end
	end)
end

return DebugController
