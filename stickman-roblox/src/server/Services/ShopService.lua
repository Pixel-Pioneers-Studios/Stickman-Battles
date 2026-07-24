--!strict
--[[
	ShopService
	-----------
	The merchant's brain. WorldService builds the merchant model + TalkPrompt;
	this service finds the prompt (same WaitForChild pattern ActService uses for
	the Start Pad) and wires it to open the shop UI on the interacting client.

	Purchases follow the same authority rule as combat: the client sends INTENT
	("buy Axe") and the server validates everything — the weapon exists, is
	actually for sale, isn't already owned, and the coins are there. Prices come
	from Definitions/Weapons on the server; a hacked client can't set its own.
	A successful purchase auto-equips (buying a weapon means you want to swing it).
]]

local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Net.Net)
local Weapons = require(Shared.Definitions.Weapons)

local DataService = require(script.Parent.DataService)
local PlayerService = require(script.Parent.PlayerService)

local ShopService = {}

function ShopService:_onBuy(player: Player, weaponId: string)
	local def = Weapons[weaponId]
	if not def or def.price <= 0 then
		return -- unknown, or a starter weapon that is not for sale
	end
	if DataService:OwnsWeapon(player, weaponId) then
		return
	end
	if not DataService:SpendCoins(player, def.price) then
		return -- can't afford it; the client greys the button, but never trust it
	end
	DataService:GrantWeapon(player, weaponId)
	self:_equip(player, weaponId)
end

function ShopService:_equip(player: Player, weaponId: string)
	if not DataService:OwnsWeapon(player, weaponId) then
		return
	end
	DataService:SetEquipped(player, weaponId) -- persistent side
	PlayerService:SetWeapon(player, weaponId) -- live combat side
end

function ShopService:Init()
	self._openShop = Net.event(Net.Events.OpenShop)
	self._buyWeapon = Net.event(Net.Events.BuyWeapon)
	self._equipWeapon = Net.event(Net.Events.EquipWeapon)
end

function ShopService:Start()
	self._buyWeapon.OnServerEvent:Connect(function(player, weaponId)
		if typeof(weaponId) == "string" then
			self:_onBuy(player, weaponId)
		end
	end)
	self._equipWeapon.OnServerEvent:Connect(function(player, weaponId)
		if typeof(weaponId) == "string" then
			self:_equip(player, weaponId)
		end
	end)

	-- Wire the merchant prompt WorldService built (parallel Start passes;
	-- WaitForChild handles the ordering).
	task.spawn(function()
		local zones = Workspace:WaitForChild("Zones")
		local shop = zones:WaitForChild("Lobby"):WaitForChild("Shop")
		local merchant = shop:WaitForChild("Merchant")
		local torso = merchant:WaitForChild("Torso")
		local prompt = torso:WaitForChild("TalkPrompt") :: ProximityPrompt
		prompt.Triggered:Connect(function(player)
			self._openShop:FireClient(player)
		end)
	end)
end

return ShopService
