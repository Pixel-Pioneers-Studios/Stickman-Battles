--!strict
--[[
	ShopController
	--------------
	The merchant's storefront. Opens when the server fires OpenShop (merchant
	ProximityPrompt), renders the weapon catalog from Definitions/Weapons, and
	sends buy/equip INTENT to ShopService — every price and ownership check is
	re-validated server-side, so this UI is presentation only.

	State comes exclusively from ProfileChanged (coins / owned / equipped): the
	buttons re-render on every profile push, which is also how a successful
	purchase confirms itself (no optimistic ownership).
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Net.Net)
local Weapons = require(Shared.Definitions.Weapons)

local InputController = require(script.Parent.InputController)

local ShopController = {}

local player = Players.LocalPlayer

ShopController._screen = nil :: ScreenGui?
ShopController._panel = nil :: Frame?
ShopController._coinsLabel = nil :: TextLabel?
ShopController._rows = {} :: { [string]: { price: TextLabel, button: TextButton } }
ShopController._profile = nil :: any

local GOLD = Color3.fromRGB(255, 205, 90)
local TEXT = Color3.fromRGB(232, 234, 240)
local MUTED = Color3.fromRGB(150, 155, 168)

-- Catalog in shop order (starter weapons included so EQUIP works from the shop).
local function catalog()
	local list = {}
	for _, def in Weapons do
		table.insert(list, def)
	end
	table.sort(list, function(a, b)
		return a.order < b.order
	end)
	return list
end

-- One-line feel summary derived from the data (not hand-maintained).
local function statLine(def): string
	local total = 0
	for _, step in def.combo do
		total += step.damage
	end
	return `{#def.combo}-hit chain \u{00B7} {total} dmg \u{00B7} heavy {def.heavy.damage}`
end

function ShopController:_build()
	local playerGui = player:WaitForChild("PlayerGui")

	local screen = Instance.new("ScreenGui")
	screen.Name = "ShopUI"
	screen.ResetOnSpawn = false
	screen.DisplayOrder = 40
	screen.Enabled = false
	screen.Parent = playerGui
	self._screen = screen

	local list = catalog()
	local rowH, pad = 64, 8

	local panel = Instance.new("Frame")
	panel.Name = "Panel"
	panel.Size = UDim2.fromOffset(440, 96 + #list * (rowH + pad))
	panel.Position = UDim2.new(0.5, -220, 0.5, -(96 + #list * (rowH + pad)) / 2)
	panel.BackgroundColor3 = Color3.fromRGB(16, 16, 20)
	panel.BackgroundTransparency = 0.05
	panel.BorderSizePixel = 0
	panel.Parent = screen
	self._panel = panel

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 10)
	corner.Parent = panel

	local header = Instance.new("TextLabel")
	header.Size = UDim2.new(1, -80, 0, 44)
	header.Position = UDim2.fromOffset(16, 8)
	header.BackgroundTransparency = 1
	header.Font = Enum.Font.GothamBold
	header.TextColor3 = GOLD
	header.TextSize = 20
	header.TextXAlignment = Enum.TextXAlignment.Left
	header.Text = "MERCHANT"
	header.Parent = panel

	local coins = Instance.new("TextLabel")
	coins.Size = UDim2.new(1, -32, 0, 20)
	coins.Position = UDim2.fromOffset(16, 46)
	coins.BackgroundTransparency = 1
	coins.Font = Enum.Font.Gotham
	coins.TextColor3 = TEXT
	coins.TextSize = 14
	coins.TextXAlignment = Enum.TextXAlignment.Left
	coins.Text = "Coins: 0"
	coins.Parent = panel
	self._coinsLabel = coins

	local close = Instance.new("TextButton")
	close.Size = UDim2.fromOffset(32, 32)
	close.Position = UDim2.new(1, -44, 0, 10)
	close.BackgroundColor3 = Color3.fromRGB(36, 38, 46)
	close.BorderSizePixel = 0
	close.Font = Enum.Font.GothamBold
	close.TextColor3 = TEXT
	close.TextSize = 16
	close.Text = "X"
	close.Parent = panel
	local closeCorner = Instance.new("UICorner")
	closeCorner.CornerRadius = UDim.new(0, 6)
	closeCorner.Parent = close
	close.Activated:Connect(function()
		self:_setOpen(false)
	end)

	for i, def in list do
		local row = Instance.new("Frame")
		row.Size = UDim2.new(1, -32, 0, rowH)
		row.Position = UDim2.fromOffset(16, 76 + (i - 1) * (rowH + pad))
		row.BackgroundColor3 = Color3.fromRGB(26, 27, 33)
		row.BorderSizePixel = 0
		row.Parent = panel
		local rowCorner = Instance.new("UICorner")
		rowCorner.CornerRadius = UDim.new(0, 8)
		rowCorner.Parent = row

		local name = Instance.new("TextLabel")
		name.Size = UDim2.new(1, -140, 0, 20)
		name.Position = UDim2.fromOffset(12, 6)
		name.BackgroundTransparency = 1
		name.Font = Enum.Font.GothamBold
		name.TextColor3 = TEXT
		name.TextSize = 15
		name.TextXAlignment = Enum.TextXAlignment.Left
		name.Text = def.displayName
		name.Parent = row

		local desc = Instance.new("TextLabel")
		desc.Size = UDim2.new(1, -140, 0, 16)
		desc.Position = UDim2.fromOffset(12, 26)
		desc.BackgroundTransparency = 1
		desc.Font = Enum.Font.Gotham
		desc.TextColor3 = MUTED
		desc.TextSize = 12
		desc.TextXAlignment = Enum.TextXAlignment.Left
		desc.TextTruncate = Enum.TextTruncate.AtEnd
		desc.Text = def.desc
		desc.Parent = row

		local stats = Instance.new("TextLabel")
		stats.Size = UDim2.new(1, -140, 0, 14)
		stats.Position = UDim2.fromOffset(12, 44)
		stats.BackgroundTransparency = 1
		stats.Font = Enum.Font.Gotham
		stats.TextColor3 = MUTED
		stats.TextSize = 11
		stats.TextXAlignment = Enum.TextXAlignment.Left
		stats.Text = statLine(def)
		stats.Parent = row

		local price = Instance.new("TextLabel")
		price.Size = UDim2.fromOffset(110, 16)
		price.Position = UDim2.new(1, -122, 0, 8)
		price.BackgroundTransparency = 1
		price.Font = Enum.Font.GothamBold
		price.TextColor3 = GOLD
		price.TextSize = 13
		price.Text = def.price > 0 and `{def.price} coins` or "Starter"
		price.Parent = row

		local button = Instance.new("TextButton")
		button.Size = UDim2.fromOffset(110, 28)
		button.Position = UDim2.new(1, -122, 0, 28)
		button.BackgroundColor3 = Color3.fromRGB(46, 82, 140)
		button.BorderSizePixel = 0
		button.Font = Enum.Font.GothamBold
		button.TextColor3 = TEXT
		button.TextSize = 13
		button.Text = "BUY"
		button.Parent = row
		local btnCorner = Instance.new("UICorner")
		btnCorner.CornerRadius = UDim.new(0, 6)
		btnCorner.Parent = button

		button.Activated:Connect(function()
			local profile = self._profile
			if not profile then
				return
			end
			if profile.owned and profile.owned[def.id] then
				if profile.equipped ~= def.id then
					self._equipWeapon:FireServer(def.id)
				end
			elseif def.price > 0 then
				self._buyWeapon:FireServer(def.id)
			end
		end)

		self._rows[def.id] = { price = price, button = button }
	end
end

-- Show/hide the storefront; frees the cursor while it's open so it's clickable.
function ShopController:_setOpen(open: boolean)
	if self._screen then
		self._screen.Enabled = open
	end
	InputController:SetCursorFree("shop", open)
end

-- Re-render every row from the latest profile push.
function ShopController:_refresh()
	local profile = self._profile
	if not profile or not self._panel then
		return
	end
	if self._coinsLabel then
		self._coinsLabel.Text = `Coins: {profile.coins or 0}`
	end
	for id, row in self._rows do
		local def = Weapons[id]
		local owned = profile.owned and profile.owned[id]
		if profile.equipped == id then
			row.button.Text = "EQUIPPED"
			row.button.BackgroundColor3 = Color3.fromRGB(36, 38, 46)
			row.button.TextColor3 = MUTED
			row.price.Text = "Owned"
		elseif owned then
			row.button.Text = "EQUIP"
			row.button.BackgroundColor3 = Color3.fromRGB(46, 110, 74)
			row.button.TextColor3 = TEXT
			row.price.Text = "Owned"
		else
			local affordable = (profile.coins or 0) >= def.price
			row.button.Text = "BUY"
			row.button.BackgroundColor3 = affordable and Color3.fromRGB(46, 82, 140) or Color3.fromRGB(60, 44, 44)
			row.button.TextColor3 = affordable and TEXT or MUTED
			row.price.Text = `{def.price} coins`
		end
	end
end

function ShopController:Init()
	self._openShop = Net.event(Net.Events.OpenShop)
	self._buyWeapon = Net.event(Net.Events.BuyWeapon)
	self._equipWeapon = Net.event(Net.Events.EquipWeapon)
	self._profileChanged = Net.event(Net.Events.ProfileChanged)
end

function ShopController:Start()
	self:_build()

	self._profileChanged.OnClientEvent:Connect(function(payload)
		if typeof(payload) == "table" then
			self._profile = payload
			self:_refresh()
		end
	end)

	self._openShop.OnClientEvent:Connect(function()
		self:_refresh()
		self:_setOpen(true)
	end)
end

return ShopController
