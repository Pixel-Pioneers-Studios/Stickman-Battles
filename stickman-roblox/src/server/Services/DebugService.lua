--!strict
--[[
	DebugService (Studio-only)
	--------------------------
	Server half of the in-game test panel. Receives DebugCommand requests from
	DebugController and executes them against the real services (PlayerService /
	EnemyService), so what you test is the actual authoritative code path.

	HARD SAFETY GATE: every command is ignored unless `RunService:IsStudio()`.
	The client also only builds the panel in Studio, so this is double-gated and
	can never affect a published place — even a crafted DebugCommand from a hacked
	client is dropped on a live server.
]]

local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Net.Net)
local CombatConfig = require(Shared.Config.CombatConfig)

local PlayerService = require(script.Parent.PlayerService)
local EnemyService = require(script.Parent.EnemyService)
local DataService = require(script.Parent.DataService)
local CombatService = require(script.Parent.CombatService)

local DebugService = {}

-- Where to drop a spawned enemy relative to the requesting player.
local function spawnPointFor(player: Player): Vector3?
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not root then
		return nil
	end
	return (root.CFrame * CFrame.new(0, 0, -14)).Position + Vector3.new(0, 3, 0)
end

function DebugService:_run(player: Player, action: string)
	if action == "fillSuper" then
		PlayerService:SetSuperMeter(player, CombatConfig.SuperMeterMax)
	elseif action == "resetSuper" then
		PlayerService:SetSuperMeter(player, 0)
	elseif action == "healFull" then
		PlayerService:HealFull(player)
	elseif action == "godOn" then
		PlayerService:SetGodMode(player, true)
	elseif action == "godOff" then
		PlayerService:SetGodMode(player, false)
	elseif action == "hurtSelf" then
		PlayerService:ApplyDamage(player, 15)
	elseif action == "killEnemies" then
		EnemyService:KillAll()
	elseif action == "giveCoins" then
		DataService:AddCoins(player, 100)
	elseif action == "giveSkillPoint" then
		DataService:AddSkillPoints(player, 1)
	elseif action == "lobbyCombatOn" or action == "lobbyCombatOff" then
		local on = action == "lobbyCombatOn"
		CombatService.AllowLobbyCombat = on
		-- Replicated so CombatController's client-side swing gate honors the
		-- override too (attribute is only ever set in Studio).
		game:GetService("Workspace"):SetAttribute("DebugLobbyCombat", on)
	elseif action == "spawnGrunt" or action == "spawnReaver" or action == "spawnWarden" then
		local pos = spawnPointFor(player)
		if pos then
			local defId = action == "spawnGrunt" and "Grunt" or action == "spawnReaver" and "Reaver" or "Warden"
			EnemyService:Spawn(defId, pos)
		end
	else
		warn(`[DebugService] unknown action: {action}`)
	end
end

function DebugService:Init()
	self._debug = Net.event(Net.Events.DebugCommand)
end

function DebugService:Start()
	if not RunService:IsStudio() then
		return -- production: never wire the handler at all
	end
	self._debug.OnServerEvent:Connect(function(player, action)
		if typeof(action) == "string" then
			self:_run(player, action)
		end
	end)
	print("[DebugService] Studio test commands enabled")
end

return DebugService
