--!strict
--[[
	ActHUDController
	----------------
	The objective HUD for an Act run. Listens to the server's ActProgress remote
	(the single source of stage state — this UI is presentation only) and shows:

	  (a) a brief centered stage-title SPLASH ("THE GATE OF SIGILS") that fades in
	      and out whenever the stage number changes, and
	  (b) a persistent top-center objective BANNER (stage name + objective + a
	      progress counter like "2/3 sigils") while a run is active.

	Both hide when no run is active (`active = false`) — e.g. after a clear/abandon.
	Own ScreenGui, ResetOnSpawn = false so it survives death mid-run.
]]

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Net.Net)

local ActHUDController = {}

local player = Players.LocalPlayer

local GOLD = Color3.fromRGB(255, 205, 90)
local PANEL = Color3.fromRGB(16, 16, 20)
local TEXT = Color3.fromRGB(232, 234, 240)
local MUTED = Color3.fromRGB(160, 165, 178)

-- Urgent (escape) styling: a burning panel + hot stroke while the objective pulses.
local URGENT_PANEL = Color3.fromRGB(70, 24, 12)
local URGENT_STROKE = Color3.fromRGB(255, 120, 40)
local TOAST_LIFETIME = 3 -- seconds a transient event line stays up

ActHUDController._screen = nil :: ScreenGui?
ActHUDController._banner = nil :: Frame?
ActHUDController._stroke = nil :: UIStroke?
ActHUDController._nameLabel = nil :: TextLabel?
ActHUDController._objLabel = nil :: TextLabel?
ActHUDController._progressLabel = nil :: TextLabel?
ActHUDController._toastLabel = nil :: TextLabel?
ActHUDController._splash = nil :: TextLabel?
ActHUDController._lastStage = nil :: number?
ActHUDController._toastToken = 0
ActHUDController._urgent = false
ActHUDController._pulseTween = nil :: Tween?

function ActHUDController:_build()
	local playerGui = player:WaitForChild("PlayerGui")

	local screen = Instance.new("ScreenGui")
	screen.Name = "ActHUD"
	screen.ResetOnSpawn = false
	screen.DisplayOrder = 30
	screen.IgnoreGuiInset = true
	screen.Enabled = true
	screen.Parent = playerGui
	self._screen = screen

	-- Persistent objective banner (top-center, hidden until a run starts).
	local banner = Instance.new("Frame")
	banner.Name = "Banner"
	banner.AnchorPoint = Vector2.new(0.5, 0)
	banner.Position = UDim2.new(0.5, 0, 0, 14)
	banner.Size = UDim2.fromOffset(360, 74)
	banner.BackgroundColor3 = PANEL
	banner.BackgroundTransparency = 0.1
	banner.BorderSizePixel = 0
	banner.Visible = false
	banner.Parent = screen
	self._banner = banner

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 10)
	corner.Parent = banner

	local stroke = Instance.new("UIStroke")
	stroke.Color = GOLD
	stroke.Transparency = 0.55
	stroke.Thickness = 1.5
	stroke.Parent = banner
	self._stroke = stroke

	local accent = Instance.new("Frame")
	accent.Name = "Accent"
	accent.Size = UDim2.new(0, 4, 1, -16)
	accent.Position = UDim2.fromOffset(10, 8)
	accent.BackgroundColor3 = GOLD
	accent.BorderSizePixel = 0
	local ac = Instance.new("UICorner")
	ac.CornerRadius = UDim.new(0, 2)
	ac.Parent = accent
	accent.Parent = banner

	local nameLabel = Instance.new("TextLabel")
	nameLabel.Name = "StageName"
	nameLabel.BackgroundTransparency = 1
	nameLabel.Position = UDim2.fromOffset(24, 8)
	nameLabel.Size = UDim2.new(1, -34, 0, 24)
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.TextSize = 18
	nameLabel.TextColor3 = GOLD
	nameLabel.TextXAlignment = Enum.TextXAlignment.Left
	nameLabel.Text = ""
	nameLabel.Parent = banner
	self._nameLabel = nameLabel

	local objLabel = Instance.new("TextLabel")
	objLabel.Name = "Objective"
	objLabel.BackgroundTransparency = 1
	objLabel.Position = UDim2.fromOffset(24, 34)
	objLabel.Size = UDim2.new(1, -34, 0, 18)
	objLabel.Font = Enum.Font.Gotham
	objLabel.TextSize = 14
	objLabel.TextColor3 = TEXT
	objLabel.TextXAlignment = Enum.TextXAlignment.Left
	objLabel.Text = ""
	objLabel.Parent = banner
	self._objLabel = objLabel

	local progressLabel = Instance.new("TextLabel")
	progressLabel.Name = "Progress"
	progressLabel.BackgroundTransparency = 1
	progressLabel.Position = UDim2.fromOffset(24, 52)
	progressLabel.Size = UDim2.new(1, -34, 0, 16)
	progressLabel.Font = Enum.Font.GothamMedium
	progressLabel.TextSize = 13
	progressLabel.TextColor3 = MUTED
	progressLabel.TextXAlignment = Enum.TextXAlignment.Left
	progressLabel.Text = ""
	progressLabel.Parent = banner
	self._progressLabel = progressLabel

	-- Stage-title splash (centered, fades in/out on stage change).
	local splash = Instance.new("TextLabel")
	splash.Name = "Splash"
	splash.AnchorPoint = Vector2.new(0.5, 0.5)
	splash.Position = UDim2.new(0.5, 0, 0.32, 0)
	splash.Size = UDim2.new(1, -80, 0, 60)
	splash.BackgroundTransparency = 1
	splash.Font = Enum.Font.GothamBold
	splash.TextSize = 44
	splash.TextColor3 = GOLD
	splash.TextStrokeColor3 = Color3.fromRGB(0, 0, 0)
	splash.TextStrokeTransparency = 0.4
	splash.TextTransparency = 1
	splash.Text = ""
	splash.Parent = screen
	self._splash = splash

	-- Transient event line ("toast"), just under the banner. Gold, fades in on a
	-- new event, auto-clears after a few seconds; a newer toast replaces the old.
	local toast = Instance.new("TextLabel")
	toast.Name = "Toast"
	toast.AnchorPoint = Vector2.new(0.5, 0)
	toast.Position = UDim2.new(0.5, 0, 0, 14 + 74 + 6) -- below the 74px banner
	toast.Size = UDim2.fromOffset(360, 22)
	toast.BackgroundTransparency = 1
	toast.Font = Enum.Font.GothamMedium
	toast.TextSize = 14
	toast.TextColor3 = GOLD
	toast.TextStrokeColor3 = Color3.fromRGB(0, 0, 0)
	toast.TextStrokeTransparency = 0.5
	toast.TextTransparency = 1
	toast.Text = ""
	toast.Parent = screen
	self._toastLabel = toast
end

-- Show a transient gold event line; a newer one replaces the current.
function ActHUDController:_showToast(text: string)
	local toast = self._toastLabel
	if not toast then
		return
	end
	self._toastToken += 1
	local token = self._toastToken
	toast.Text = text
	toast.TextTransparency = 1
	TweenService:Create(toast, TweenInfo.new(0.25, Enum.EasingStyle.Quad), {
		TextTransparency = 0,
	}):Play()
	task.delay(TOAST_LIFETIME, function()
		-- Only clear if a newer toast hasn't superseded this one.
		if self._toastToken ~= token then
			return
		end
		TweenService:Create(toast, TweenInfo.new(0.4, Enum.EasingStyle.Quad), {
			TextTransparency = 1,
		}):Play()
	end)
end

-- Toggle the burning "escape" styling: hot panel/stroke + a pulsing objective.
function ActHUDController:_setUrgent(urgent: boolean)
	if urgent == self._urgent then
		return
	end
	self._urgent = urgent
	local banner = self._banner
	local stroke = self._stroke
	local obj = self._objLabel

	if self._pulseTween then
		self._pulseTween:Cancel()
		self._pulseTween = nil
	end

	if urgent then
		if banner then
			banner.BackgroundColor3 = URGENT_PANEL
		end
		if stroke then
			stroke.Color = URGENT_STROKE
			stroke.Transparency = 0.2
		end
		if obj then
			obj.TextColor3 = URGENT_STROKE
			local pulse = TweenService:Create(
				obj,
				TweenInfo.new(0.5, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true),
				{ TextTransparency = 0.5 }
			)
			pulse:Play()
			self._pulseTween = pulse
		end
	else
		if banner then
			banner.BackgroundColor3 = PANEL
		end
		if stroke then
			stroke.Color = GOLD
			stroke.Transparency = 0.55
		end
		if obj then
			obj.TextColor3 = TEXT
			obj.TextTransparency = 0
		end
	end
end

-- Play the fade in/out title splash for a newly-entered stage.
function ActHUDController:_playSplash(title: string)
	local splash = self._splash
	if not splash then
		return
	end
	splash.Text = string.upper(title)
	splash.TextTransparency = 1
	splash.TextStrokeTransparency = 1

	local fadeIn = TweenService:Create(splash, TweenInfo.new(0.5, Enum.EasingStyle.Quad), {
		TextTransparency = 0,
		TextStrokeTransparency = 0.4,
	})
	fadeIn:Play()
	fadeIn.Completed:Connect(function()
		task.delay(1.4, function()
			-- Guard: a newer stage may have replaced the text.
			if splash.Text ~= string.upper(title) then
				return
			end
			TweenService:Create(splash, TweenInfo.new(0.6, Enum.EasingStyle.Quad), {
				TextTransparency = 1,
				TextStrokeTransparency = 1,
			}):Play()
		end)
	end)
end

function ActHUDController:_onProgress(payload)
	if typeof(payload) ~= "table" then
		return
	end

	if not payload.active then
		if self._banner then
			self._banner.Visible = false
		end
		self:_setUrgent(false)
		if self._toastLabel then
			self._toastToken += 1 -- invalidate any pending auto-clear
			self._toastLabel.TextTransparency = 1
		end
		self._lastStage = nil
		return
	end

	if self._banner then
		self._banner.Visible = true
	end
	if self._nameLabel then
		self._nameLabel.Text = payload.name or "Act I"
	end
	if self._objLabel then
		self._objLabel.Text = payload.objective or ""
	end
	if self._progressLabel then
		local counter = payload.progress
		local stagePart = payload.stage and payload.total and `Stage {payload.stage}/{payload.total}` or ""
		if counter and counter ~= "" then
			self._progressLabel.Text = stagePart ~= "" and `{stagePart}  \u{00B7}  {counter}` or counter
		else
			self._progressLabel.Text = stagePart
		end
	end

	-- Escape styling: turn the banner hostile while urgent, revert otherwise.
	self:_setUrgent(payload.urgent == true)

	-- Transient event line.
	if typeof(payload.toast) == "string" and payload.toast ~= "" then
		self:_showToast(payload.toast)
	end

	-- New stage number => title splash.
	if payload.stage and payload.stage ~= self._lastStage then
		self._lastStage = payload.stage
		self:_playSplash(payload.name or "Act I")
	end
end

function ActHUDController:Start()
	self:_build()
	local progress = Net.event(Net.Events.ActProgress)
	progress.OnClientEvent:Connect(function(payload)
		self:_onProgress(payload)
	end)
end

return ActHUDController
