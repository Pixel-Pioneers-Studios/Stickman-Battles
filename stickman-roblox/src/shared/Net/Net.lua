--!strict
--[[
	Net
	---
	Single source of truth for remote names + a tiny accessor that works on
	either side. The server calls `Net.provision()` once at boot to create the
	RemoteEvents under ReplicatedStorage/Remotes; everyone else calls
	`Net.event(name)` to fetch one (yielding until it exists on the client).

	Keeping the catalog here means client and server can never disagree about a
	remote's name, and it documents the entire client<->server surface in one
	place.
]]

local RunService = game:GetService("RunService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Net = {}

-- The complete networking surface for the vertical slice.
Net.Events = {
	-- client -> server: "I pressed attack" (intent only; server owns damage)
	RequestAttack = "RequestAttack",
	-- client -> server: "I pressed dodge" (server grants i-frames authoritatively)
	RequestDodge = "RequestDodge",
	-- client -> server: block held/released (server owns block + parry timing)
	SetBlocking = "SetBlocking",
	-- client -> server: "I pressed super" (server validates the meter is full)
	RequestSuper = "RequestSuper",
	-- server -> client: authoritative combat feedback (hit landed, rejected, hitstop)
	CombatFeedback = "CombatFeedback",
	-- server -> client: your health changed (authoritative)
	HealthChanged = "HealthChanged",
	-- server -> client: your super meter changed (authoritative, 0..100)
	SuperChanged = "SuperChanged",
	-- server -> client: your persistent profile changed (coins, owned weapons,
	-- equipped weapon). Sent on load and after every economy mutation.
	ProfileChanged = "ProfileChanged",
	-- server -> client: the merchant was interacted with; show the shop UI.
	OpenShop = "OpenShop",
	-- client -> server: "I want to buy this weapon" (server validates coins/ownership)
	BuyWeapon = "BuyWeapon",
	-- client -> server: "equip this weapon" (server validates ownership)
	EquipWeapon = "EquipWeapon",
	-- client -> server: "spend a skill point on this node" (server validates
	-- prerequisites, ranks, and the point balance)
	UpgradeSkill = "UpgradeSkill",
	-- server -> client: act/stage progress for the objective HUD (stage name,
	-- objective text, counters)
	ActProgress = "ActProgress",
	-- client -> server: developer test command. IGNORED unless the server is
	-- running in Studio (double-gated with the client, which only builds the
	-- panel in Studio). Never functions in a published place.
	DebugCommand = "DebugCommand",
}

local function remotesFolder(): Folder
	return ReplicatedStorage:WaitForChild("Remotes") :: Folder
end

-- Server-only: create every RemoteEvent up front. Idempotent.
function Net.provision()
	assert(RunService:IsServer(), "Net.provision may only be called on the server")
	local folder = ReplicatedStorage:FindFirstChild("Remotes")
	if not folder then
		folder = Instance.new("Folder")
		folder.Name = "Remotes"
		folder.Parent = ReplicatedStorage
	end
	for _, name in Net.Events do
		if not folder:FindFirstChild(name) then
			local ev = Instance.new("RemoteEvent")
			ev.Name = name
			ev.Parent = folder
		end
	end
end

-- Both sides: fetch a RemoteEvent by name. Yields on the client until ready.
function Net.event(name: string): RemoteEvent
	return remotesFolder():WaitForChild(name) :: RemoteEvent
end

return Net
