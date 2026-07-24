--!strict
--[[
	DataService
	-----------
	Owns each player's PERSISTENT profile: coins, owned weapons, and the equipped
	weapon. Everything economy-shaped mutates through here so persistence and the
	client mirror (ProfileChanged) can never drift apart.

	Persistence model:
	  * Load on join (pcall-guarded GetAsync). If the load FAILS we still hand out
	    a default profile so the player can play, but mark it save-locked — we
	    never risk overwriting a real profile with defaults.
	  * Save on leave, on server close, and on a slow autosave loop.
	  * In Studio without API access every call fails quietly; the session simply
	    runs on in-memory profiles.

	Other services read/mutate via the API (AddCoins/SpendCoins/GrantWeapon/
	SetEquipped). None of them touch the DataStore. `ProfileLoaded` fires when a
	profile is ready so PlayerService can apply the equipped weapon — a signal so
	this module never has to require PlayerService (no cycle).
]]

local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Net.Net)
local Signal = require(Shared.Util.Signal)
local GameConfig = require(Shared.Config.GameConfig)
local Weapons = require(Shared.Definitions.Weapons)

local STORE_NAME = "The95th_Profile_v1"
local STARTER_WEAPON = "Sword"

export type Profile = {
	coins: number,
	owned: { [string]: boolean },
	equipped: string,
	skillPoints: number,
	skills: { [string]: number }, -- node id -> purchased rank
}

local DataService = {}
DataService._profiles = {} :: { [Player]: Profile }
-- Players whose load FAILED (not "empty"): never save, or we'd clobber real data.
DataService._saveLocked = {} :: { [Player]: boolean }
DataService._store = nil :: DataStore?
DataService._profileChanged = nil :: RemoteEvent?
-- Fired (player, profile) once the profile is ready. PlayerService listens to
-- apply the equipped weapon without this module requiring PlayerService.
DataService.ProfileLoaded = Signal.new()

local function defaultProfile(): Profile
	return {
		coins = 0,
		owned = { [STARTER_WEAPON] = true },
		equipped = STARTER_WEAPON,
		skillPoints = 0,
		skills = {},
	}
end

-- Repair anything odd in a stored blob (old schema, deleted weapon ids, …) so
-- the rest of the game can trust the profile's shape.
local function sanitize(raw: any): Profile
	local profile = defaultProfile()
	if typeof(raw) ~= "table" then
		return profile
	end
	if typeof(raw.coins) == "number" and raw.coins >= 0 then
		profile.coins = math.floor(raw.coins)
	end
	if typeof(raw.owned) == "table" then
		for id, v in raw.owned do
			if v == true and Weapons[id] then
				profile.owned[id] = true
			end
		end
	end
	if typeof(raw.equipped) == "string" and profile.owned[raw.equipped] then
		profile.equipped = raw.equipped
	end
	if typeof(raw.skillPoints) == "number" and raw.skillPoints >= 0 then
		profile.skillPoints = math.floor(raw.skillPoints)
	end
	-- Shape-only validation here (id existence/rank caps are SkillService's
	-- domain — it re-validates against Definitions/Skills on every upgrade).
	if typeof(raw.skills) == "table" then
		for id, rank in raw.skills do
			if typeof(id) == "string" and typeof(rank) == "number" and rank > 0 then
				profile.skills[id] = math.floor(rank)
			end
		end
	end
	return profile
end

function DataService:GetProfile(player: Player): Profile?
	return self._profiles[player]
end

function DataService:GetEquipped(player: Player): string
	local profile = self._profiles[player]
	return profile and profile.equipped or STARTER_WEAPON
end

-- Mirror the profile to the owning client's HUD/shop.
function DataService:_push(player: Player)
	local profile = self._profiles[player]
	if profile and self._profileChanged then
		self._profileChanged:FireClient(player, {
			coins = profile.coins,
			owned = profile.owned,
			equipped = profile.equipped,
			skillPoints = profile.skillPoints,
			skills = profile.skills,
		})
	end
end

function DataService:AddCoins(player: Player, amount: number)
	local profile = self._profiles[player]
	if not profile or amount <= 0 then
		return
	end
	profile.coins += math.floor(amount)
	self:_push(player)
end

-- Returns true (and deducts) only if the player can afford it.
function DataService:SpendCoins(player: Player, amount: number): boolean
	local profile = self._profiles[player]
	if not profile or amount < 0 or profile.coins < amount then
		return false
	end
	profile.coins -= math.floor(amount)
	self:_push(player)
	return true
end

function DataService:OwnsWeapon(player: Player, weaponId: string): boolean
	local profile = self._profiles[player]
	return profile ~= nil and profile.owned[weaponId] == true
end

function DataService:GrantWeapon(player: Player, weaponId: string)
	local profile = self._profiles[player]
	if not profile or not Weapons[weaponId] then
		return
	end
	profile.owned[weaponId] = true
	self:_push(player)
end

-- Persist which weapon is equipped. Combat runtime is PlayerService's job —
-- ShopService calls both sides so they stay in step.
function DataService:SetEquipped(player: Player, weaponId: string)
	local profile = self._profiles[player]
	if not profile or not profile.owned[weaponId] then
		return
	end
	profile.equipped = weaponId
	self:_push(player)
end

-- Skill points: earned from act clears / bosses, spent by SkillService (which
-- owns all tree validation). DataService only stores + mirrors them.
function DataService:AddSkillPoints(player: Player, amount: number)
	local profile = self._profiles[player]
	if not profile or amount <= 0 then
		return
	end
	profile.skillPoints += math.floor(amount)
	self:_push(player)
end

-- Returns true (and deducts) only if the player has enough points.
function DataService:SpendSkillPoints(player: Player, amount: number): boolean
	local profile = self._profiles[player]
	if not profile or amount <= 0 or profile.skillPoints < amount then
		return false
	end
	profile.skillPoints -= math.floor(amount)
	self:_push(player)
	return true
end

function DataService:GetSkills(player: Player): { [string]: number }
	local profile = self._profiles[player]
	return profile and profile.skills or {}
end

-- Set a node's purchased rank (SkillService has already validated it).
function DataService:SetSkillRank(player: Player, id: string, rank: number)
	local profile = self._profiles[player]
	if not profile then
		return
	end
	profile.skills[id] = rank
	self:_push(player)
end

function DataService:_load(player: Player)
	local raw: any = nil
	local ok = true
	if self._store then
		ok, raw = pcall(function()
			return (self._store :: DataStore):GetAsync(`p_{player.UserId}`)
		end)
	end

	if not ok then
		warn(`[DataService] load failed for {player.Name} — session is save-locked`)
		self._saveLocked[player] = true
		raw = nil
	end

	if player.Parent == nil then
		return -- left while GetAsync was in flight; don't leak a profile entry
	end

	local profile = sanitize(raw)
	self._profiles[player] = profile
	self:_push(player)
	self.ProfileLoaded:Fire(player, profile)
end

function DataService:_save(player: Player)
	local profile = self._profiles[player]
	if not profile or self._saveLocked[player] or not self._store then
		return
	end
	local snapshot = {
		coins = profile.coins,
		owned = profile.owned,
		equipped = profile.equipped,
		skillPoints = profile.skillPoints,
		skills = profile.skills,
	}
	local ok, err = pcall(function()
		(self._store :: DataStore):UpdateAsync(`p_{player.UserId}`, function()
			return snapshot
		end)
	end)
	if not ok then
		warn(`[DataService] save failed for {player.Name}: {err}`)
	end
end

function DataService:Init()
	self._profileChanged = Net.event(Net.Events.ProfileChanged)
	-- Studio without API access errors here; play on with in-memory profiles.
	local ok, store = pcall(function()
		return DataStoreService:GetDataStore(STORE_NAME)
	end)
	if ok then
		self._store = store
	else
		warn("[DataService] DataStore unavailable — profiles are in-memory only this session")
	end
end

function DataService:Start()
	local function onPlayer(player: Player)
		task.spawn(function()
			self:_load(player)
		end)
	end
	for _, player in Players:GetPlayers() do
		onPlayer(player)
	end
	Players.PlayerAdded:Connect(onPlayer)

	Players.PlayerRemoving:Connect(function(player)
		self:_save(player)
		self._profiles[player] = nil
		self._saveLocked[player] = nil
	end)

	game:BindToClose(function()
		for _, player in Players:GetPlayers() do
			self:_save(player)
		end
	end)

	task.spawn(function()
		while true do
			task.wait(GameConfig.Economy.AutosaveInterval)
			for _, player in Players:GetPlayers() do
				self:_save(player)
			end
		end
	end)
end

return DataService
