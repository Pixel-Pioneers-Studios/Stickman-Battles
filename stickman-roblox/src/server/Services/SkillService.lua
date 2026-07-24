--!strict
--[[
	SkillService
	------------
	Server authority for the skill tree. Turns a player's PURCHASED ranks (stored
	by DataService) into a compact modifier bundle the combat/player services
	apply, and validates every spend request against Definitions/Skills.

	Cycle discipline: PlayerService and CombatService require THIS module to read
	modifiers, so this module must never require them back. It only touches
	DataService (points + rank storage), Net (the UpgradeSkill remote), Signal,
	and the Skills definition. Consumers react to upgrades via the SkillsChanged
	signal instead of us calling into them.

	Authority model: the client sends a node id only. We re-check the node exists,
	the rank ceiling, the prerequisite chain, and the point balance here — a
	hacked client can at most spam rejected requests.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Net.Net)
local Signal = require(Shared.Util.Signal)
local Skills = require(Shared.Definitions.Skills)

local DataService = require(script.Parent.DataService)

-- Dodge cooldown can never drop below this fraction of its base, so stacking
-- Mobility never produces a zero/negative cooldown.
local DODGE_COOLDOWN_FLOOR = 0.4

export type Modifiers = {
	maxHealthBonus: number,
	damageMult: number,
	superGainMult: number,
	moveSpeedBonus: number,
	dodgeCooldownMult: number,
}

local SkillService = {}
-- Fired (player) after a successful upgrade so PlayerService can re-derive live
-- health/speed without this module depending on it.
SkillService.SkillsChanged = Signal.new()
SkillService._upgradeSkill = nil :: RemoteEvent?

-- Fold a player's owned ranks into the additive/flat modifier bundle. Unknown
-- stored ids (old data / renamed nodes) are ignored so stale profiles are safe.
function SkillService:GetModifiers(player: Player): Modifiers
	local mods: Modifiers = {
		maxHealthBonus = 0,
		damageMult = 1,
		superGainMult = 1,
		moveSpeedBonus = 0,
		dodgeCooldownMult = 1,
	}
	local dodgeReduction = 0

	local ranks = DataService:GetSkills(player)
	for id, rank in ranks do
		local node = Skills.Nodes[id]
		if node and rank > 0 then
			local owned = math.min(rank, node.maxRank)
			local e = node.effects
			if e.maxHealthBonus then
				mods.maxHealthBonus += e.maxHealthBonus * owned
			end
			if e.damageMult then
				mods.damageMult += e.damageMult * owned
			end
			if e.superGainMult then
				mods.superGainMult += e.superGainMult * owned
			end
			if e.moveSpeedBonus then
				mods.moveSpeedBonus += e.moveSpeedBonus * owned
			end
			if e.dodgeCooldownReduction then
				dodgeReduction += e.dodgeCooldownReduction * owned
			end
		end
	end

	mods.dodgeCooldownMult = math.max(DODGE_COOLDOWN_FLOOR, 1 - dodgeReduction)
	return mods
end

-- Are every one of this node's prerequisites owned at the required rank?
local function prereqsMet(node, ranks: { [string]: number }): boolean
	for reqId, minRank in node.requires do
		if (ranks[reqId] or 0) < minRank then
			return false
		end
	end
	return true
end

function SkillService:_onUpgrade(player: Player, nodeId: any)
	if typeof(nodeId) ~= "string" then
		return
	end
	local node = Skills.Nodes[nodeId]
	if not node then
		return
	end

	local ranks = DataService:GetSkills(player)
	local current = ranks[nodeId] or 0
	if current >= node.maxRank then
		return -- already mastered
	end
	if not prereqsMet(node, ranks) then
		return -- prerequisite chain not satisfied
	end

	-- Spend LAST so a failed deduction never advances the rank.
	if not DataService:SpendSkillPoints(player, 1) then
		return -- not enough points
	end

	DataService:SetSkillRank(player, nodeId, current + 1)
	self.SkillsChanged:Fire(player)
end

function SkillService:Init()
	self._upgradeSkill = Net.event(Net.Events.UpgradeSkill)
end

function SkillService:Start()
	(self._upgradeSkill :: RemoteEvent).OnServerEvent:Connect(function(player, nodeId)
		self:_onUpgrade(player, nodeId)
	end)
end

return SkillService
