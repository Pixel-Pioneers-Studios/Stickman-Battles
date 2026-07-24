--!strict
--[[
	SkillController
	---------------
	The skill tree storefront. Toggled with K (or an always-visible bottom-right
	"SKILLS" button that badges unspent points), it renders the three branches
	from Definitions/Skills as columns of node cards — name, blurb, rank pips, and
	an UPGRADE button.

	Presentation only: clicking UPGRADE sends the node id as INTENT over the
	UpgradeSkill remote; the server owns every prerequisite / rank / point check.
	There is NO optimistic state — the tree re-renders exclusively from the
	ProfileChanged pushes (payload.skills + payload.skillPoints), so a successful
	spend confirms itself exactly like a shop purchase does.
]]

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Net.Net)
local Skills = require(Shared.Definitions.Skills)

local InputController = require(script.Parent.InputController)

local SkillController = {}

local player = Players.LocalPlayer

local GOLD = Color3.fromRGB(255, 205, 90)
local TEXT = Color3.fromRGB(232, 234, 240)
local MUTED = Color3.fromRGB(150, 155, 168)
local PANEL_BG = Color3.fromRGB(16, 16, 20)
local CARD_BG = Color3.fromRGB(26, 27, 33)
local BTN_LOCKED = Color3.fromRGB(36, 38, 46)

local COL_W = 236
local COL_GAP = 12
local CARD_H = 104
local CARD_GAP = 8
local PAD = 16
local HEADER_H = 68
local COLHEAD_H = 26

type Row = {
	button: TextButton,
	pips: TextLabel,
	node: any,
}

SkillController._screen = nil :: ScreenGui?
SkillController._panel = nil :: Frame?
SkillController._pointsLabel = nil :: TextLabel?
SkillController._toggleBadge = nil :: TextLabel?
SkillController._rows = {} :: { [string]: Row }
SkillController._profile = nil :: any
SkillController._open = false

-- Recursive prerequisite depth so a branch's cards stack in chain order (root
-- node at the top, capstone at the bottom).
local function depth(node): number
	local d = 0
	for reqId in node.requires do
		local req = Skills.Nodes[reqId]
		if req then
			d = math.max(d, 1 + depth(req))
		end
	end
	return d
end

-- Nodes of a branch, ordered by prerequisite depth then name (stable columns).
local function branchNodes(branch: string)
	local list = {}
	for _, node in Skills.Nodes do
		if node.branch == branch then
			table.insert(list, node)
		end
	end
	table.sort(list, function(a, b)
		local da, db = depth(a), depth(b)
		if da ~= db then
			return da < db
		end
		return a.id < b.id
	end)
	return list
end

-- Rank dots: filled for owned ranks, hollow for the rest.
local function pipText(rank: number, maxRank: number): string
	return string.rep("\u{25CF} ", rank) .. string.rep("\u{25CB} ", math.max(0, maxRank - rank))
end

local function makeCorner(radius: number, parent: Instance)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = parent
end

function SkillController:_buildCard(node, parent: Instance, index: number)
	local card = Instance.new("Frame")
	card.Name = node.id
	card.Size = UDim2.new(1, 0, 0, CARD_H)
	card.Position = UDim2.fromOffset(0, (index - 1) * (CARD_H + CARD_GAP))
	card.BackgroundColor3 = CARD_BG
	card.BorderSizePixel = 0
	card.Parent = parent
	makeCorner(8, card)

	local name = Instance.new("TextLabel")
	name.Size = UDim2.new(1, -20, 0, 20)
	name.Position = UDim2.fromOffset(10, 8)
	name.BackgroundTransparency = 1
	name.Font = Enum.Font.GothamBold
	name.TextColor3 = TEXT
	name.TextSize = 15
	name.TextXAlignment = Enum.TextXAlignment.Left
	name.Text = node.displayName
	name.Parent = card

	local desc = Instance.new("TextLabel")
	desc.Size = UDim2.new(1, -20, 0, 30)
	desc.Position = UDim2.fromOffset(10, 28)
	desc.BackgroundTransparency = 1
	desc.Font = Enum.Font.Gotham
	desc.TextColor3 = MUTED
	desc.TextSize = 12
	desc.TextXAlignment = Enum.TextXAlignment.Left
	desc.TextYAlignment = Enum.TextYAlignment.Top
	desc.TextWrapped = true
	desc.Text = node.desc
	desc.Parent = card

	local pips = Instance.new("TextLabel")
	pips.Size = UDim2.new(1, -120, 0, 20)
	pips.Position = UDim2.fromOffset(10, CARD_H - 30)
	pips.BackgroundTransparency = 1
	pips.Font = Enum.Font.Gotham
	pips.TextColor3 = GOLD
	pips.TextSize = 14
	pips.TextXAlignment = Enum.TextXAlignment.Left
	pips.Text = pipText(0, node.maxRank)
	pips.Parent = card

	local button = Instance.new("TextButton")
	button.Size = UDim2.fromOffset(100, 26)
	button.Position = UDim2.new(1, -110, 1, -34)
	button.BackgroundColor3 = BTN_LOCKED
	button.BorderSizePixel = 0
	button.Font = Enum.Font.GothamBold
	button.TextColor3 = TEXT
	button.TextSize = 12
	button.Text = "UPGRADE"
	button.Parent = card
	makeCorner(6, button)

	button.Activated:Connect(function()
		self:_tryUpgrade(node)
	end)

	self._rows[node.id] = { button = button, pips = pips, node = node }
end

function SkillController:_build()
	local playerGui = player:WaitForChild("PlayerGui")

	local screen = Instance.new("ScreenGui")
	screen.Name = "SkillUI"
	screen.ResetOnSpawn = false
	screen.DisplayOrder = 45
	screen.Parent = playerGui
	self._screen = screen

	-- Always-visible toggle button (bottom-right) with an unspent-points badge.
	local toggle = Instance.new("TextButton")
	toggle.Name = "SkillToggle"
	toggle.Size = UDim2.fromOffset(128, 34)
	toggle.Position = UDim2.new(1, -140, 1, -46)
	toggle.BackgroundColor3 = CARD_BG
	toggle.BackgroundTransparency = 0.1
	toggle.BorderSizePixel = 0
	toggle.Font = Enum.Font.GothamBold
	toggle.TextColor3 = GOLD
	toggle.TextSize = 13
	toggle.Text = "SKILLS [K]"
	toggle.Parent = screen
	makeCorner(8, toggle)
	toggle.Activated:Connect(function()
		self:_setOpen(not self._open)
	end)

	local badge = Instance.new("TextLabel")
	badge.Name = "Badge"
	badge.Size = UDim2.fromOffset(22, 22)
	badge.Position = UDim2.new(1, -11, 0, -11)
	badge.BackgroundColor3 = GOLD
	badge.BorderSizePixel = 0
	badge.Font = Enum.Font.GothamBold
	badge.TextColor3 = Color3.fromRGB(20, 18, 10)
	badge.TextSize = 12
	badge.Text = "0"
	badge.Visible = false
	badge.Parent = toggle
	makeCorner(11, badge)
	self._toggleBadge = badge

	local branches = Skills.Branches
	local colCount = #branches
	-- Tallest branch decides the panel height.
	local maxNodes = 0
	for _, branch in branches do
		maxNodes = math.max(maxNodes, #branchNodes(branch))
	end

	local bodyH = COLHEAD_H + maxNodes * (CARD_H + CARD_GAP)
	local panelW = PAD * 2 + colCount * COL_W + (colCount - 1) * COL_GAP
	local panelH = HEADER_H + bodyH + PAD

	local panel = Instance.new("Frame")
	panel.Name = "Panel"
	panel.Size = UDim2.fromOffset(panelW, panelH)
	panel.Position = UDim2.new(0.5, -panelW / 2, 0.5, -panelH / 2)
	panel.BackgroundColor3 = PANEL_BG
	panel.BackgroundTransparency = 0.05
	panel.BorderSizePixel = 0
	panel.Visible = false
	panel.Parent = screen
	self._panel = panel
	makeCorner(10, panel)

	local title = Instance.new("TextLabel")
	title.Size = UDim2.new(1, -80, 0, 28)
	title.Position = UDim2.fromOffset(PAD, 12)
	title.BackgroundTransparency = 1
	title.Font = Enum.Font.GothamBold
	title.TextColor3 = GOLD
	title.TextSize = 22
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.Text = "SKILL TREE"
	title.Parent = panel

	local points = Instance.new("TextLabel")
	points.Size = UDim2.new(1, -80, 0, 18)
	points.Position = UDim2.fromOffset(PAD, 42)
	points.BackgroundTransparency = 1
	points.Font = Enum.Font.Gotham
	points.TextColor3 = TEXT
	points.TextSize = 14
	points.TextXAlignment = Enum.TextXAlignment.Left
	points.Text = "Skill Points: 0"
	points.Parent = panel
	self._pointsLabel = points

	local close = Instance.new("TextButton")
	close.Size = UDim2.fromOffset(32, 32)
	close.Position = UDim2.new(1, -44, 0, 12)
	close.BackgroundColor3 = BTN_LOCKED
	close.BorderSizePixel = 0
	close.Font = Enum.Font.GothamBold
	close.TextColor3 = TEXT
	close.TextSize = 16
	close.Text = "X"
	close.Parent = panel
	makeCorner(6, close)
	close.Activated:Connect(function()
		self:_setOpen(false)
	end)

	for c, branch in branches do
		local colX = PAD + (c - 1) * (COL_W + COL_GAP)

		local colHead = Instance.new("TextLabel")
		colHead.Size = UDim2.fromOffset(COL_W, COLHEAD_H)
		colHead.Position = UDim2.fromOffset(colX, HEADER_H)
		colHead.BackgroundTransparency = 1
		colHead.Font = Enum.Font.GothamBold
		colHead.TextColor3 = GOLD
		colHead.TextSize = 16
		colHead.TextXAlignment = Enum.TextXAlignment.Center
		colHead.Text = string.upper(branch)
		colHead.Parent = panel

		local column = Instance.new("Frame")
		column.Name = branch
		column.Size = UDim2.fromOffset(COL_W, maxNodes * (CARD_H + CARD_GAP))
		column.Position = UDim2.fromOffset(colX, HEADER_H + COLHEAD_H)
		column.BackgroundTransparency = 1
		column.Parent = panel

		for i, node in branchNodes(branch) do
			self:_buildCard(node, column, i)
		end
	end
end

function SkillController:_tryUpgrade(node)
	local profile = self._profile
	if not profile then
		return
	end
	-- Client-side gate is UX only; the server re-validates everything.
	local ranks = profile.skills or {}
	local rank = ranks[node.id] or 0
	if rank >= node.maxRank then
		return
	end
	if (profile.skillPoints or 0) <= 0 then
		return
	end
	for reqId, minRank in node.requires do
		if (ranks[reqId] or 0) < minRank then
			return
		end
	end
	self._upgradeSkill:FireServer(node.id)
end

function SkillController:_setOpen(open: boolean)
	self._open = open
	if self._panel then
		self._panel.Visible = open
	end
	InputController:SetCursorFree("skills", open)
end

-- First unmet requirement of a node (for the locked-state button label), or nil.
local function firstUnmet(node, ranks: { [string]: number })
	for reqId, minRank in node.requires do
		if (ranks[reqId] or 0) < minRank then
			return reqId, minRank
		end
	end
	return nil, nil
end

-- Re-render every card + the points counters purely from the latest profile.
function SkillController:_refresh()
	local profile = self._profile
	if not profile then
		return
	end
	local ranks = profile.skills or {}
	local points = profile.skillPoints or 0

	if self._pointsLabel then
		self._pointsLabel.Text = `Skill Points: {points}`
	end
	if self._toggleBadge then
		self._toggleBadge.Text = tostring(points)
		self._toggleBadge.Visible = points > 0
	end

	for id, row in self._rows do
		local node = row.node
		local rank = ranks[id] or 0
		row.pips.Text = pipText(math.min(rank, node.maxRank), node.maxRank)

		local btn = row.button
		if rank >= node.maxRank then
			btn.Text = "MASTERED"
			btn.BackgroundColor3 = BTN_LOCKED
			btn.TextColor3 = MUTED
		else
			local reqId, minRank = firstUnmet(node, ranks)
			if reqId then
				local reqNode = Skills.Nodes[reqId]
				local reqName = reqNode and reqNode.displayName or reqId
				btn.Text = `Requires {reqName} {minRank}`
				btn.BackgroundColor3 = BTN_LOCKED
				btn.TextColor3 = MUTED
			elseif points <= 0 then
				btn.Text = "UPGRADE"
				btn.BackgroundColor3 = BTN_LOCKED
				btn.TextColor3 = MUTED
			else
				btn.Text = "UPGRADE"
				btn.BackgroundColor3 = GOLD
				btn.TextColor3 = Color3.fromRGB(20, 18, 10)
			end
		end
	end
end

function SkillController:Init()
	self._upgradeSkill = Net.event(Net.Events.UpgradeSkill)
	self._profileChanged = Net.event(Net.Events.ProfileChanged)
end

function SkillController:Start()
	self:_build()

	self._profileChanged.OnClientEvent:Connect(function(payload)
		if typeof(payload) == "table" then
			self._profile = payload
			self:_refresh()
		end
	end)

	UserInputService.InputBegan:Connect(function(input, gameProcessed)
		if gameProcessed then
			return
		end
		if input.KeyCode == Enum.KeyCode.K then
			self:_setOpen(not self._open)
		end
	end)
end

return SkillController
