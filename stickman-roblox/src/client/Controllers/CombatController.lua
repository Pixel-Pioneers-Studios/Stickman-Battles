--!strict
--[[
	CombatController
	----------------
	Client half of combat. Translates the Attack/Dodge input Signals into server
	requests (intent only), predicts the swing locally for responsiveness, and
	reacts to authoritative CombatFeedback (hit juice, rejects). Also owns the
	weapon visual and its swing animation.

	It never applies damage — that is entirely server-side (CombatService). The
	worst a desynced prediction can do is play a swing animation the server
	rejected, which self-corrects on the next input.
]]

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Net.Net)
local Weapons = require(Shared.Definitions.Weapons)
local Zones = require(Shared.Config.Zones)

local InputController = require(script.Parent.InputController)
local CharacterController = require(script.Parent.CharacterController)

local CombatController = {}

local player = Players.LocalPlayer

CombatController._motor = nil :: Motor6D?
CombatController._blade = nil :: BasePart?
CombatController._bladeBaseColor = nil :: Color3?
CombatController._bladeBaseMaterial = nil :: Enum.Material?
CombatController._localComboIndex = 0
CombatController._localComboResetAt = 0
CombatController._nextSwingReadyAt = 0
CombatController._nextHeavyReadyAt = 0
CombatController._blocking = false

local REST_C0 = CFrame.new(0, -1.4, -0.6) * CFrame.Angles(math.rad(-90), 0, 0)

-- Client half of the lobby safe-zone gate: don't even play the swing (or send
-- the intent) in the lobby. The server enforces the same rule authoritatively;
-- the DebugLobbyCombat attribute is the Studio test-panel override.
local function combatAllowedHere(): boolean
	if Workspace:GetAttribute("DebugLobbyCombat") == true then
		return true
	end
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	return root ~= nil and Zones.combatAllowed(root.Position)
end
local GUARD_C0 = CFrame.new(0.4, -0.6, -1) * CFrame.Angles(math.rad(-10), math.rad(70), math.rad(20))

-- The weapon the server says we hold (mirrored to the "Weapon" attribute by
-- PlayerService). Prediction/visuals key off this; Sword is the safe fallback.
function CombatController:_equippedDef()
	local character = player.Character
	local id = character and character:GetAttribute("Weapon")
	return (typeof(id) == "string" and Weapons[id]) or Weapons.Sword
end

function CombatController:_detachWeapon()
	if self._motor then
		self._motor:Destroy()
		self._motor = nil
	end
	if self._blade then
		self._blade:Destroy()
		self._blade = nil
	end
end

function CombatController:_attachWeapon(character: Model)
	local hand = character:WaitForChild("RightHand", 5) :: BasePart?
	if not hand then
		return
	end
	self:_detachWeapon()

	local visual = self:_equippedDef().visual
	local blade = Instance.new("Part")
	blade.Name = "Blade"
	blade.Size = visual.size
	blade.Color = visual.color
	blade.Material = visual.material
	blade.CanCollide = false
	blade.Massless = true
	blade.CFrame = hand.CFrame

	local motor = Instance.new("Motor6D")
	motor.Part0 = hand
	motor.Part1 = blade
	motor.C0 = self._blocking and GUARD_C0 or REST_C0
	motor.Parent = hand

	blade.Parent = character
	self._blade = blade
	self._motor = motor
	self._bladeBaseColor = visual.color
	self._bladeBaseMaterial = visual.material
end

-- A quick two-tween swing arc keyed off the combo step index for variety.
function CombatController:_playSwing(stepIndex: number)
	local motor = self._motor
	if not motor then
		return
	end
	local dir = (stepIndex % 2 == 1) and 1 or -1
	local windUp = REST_C0 * CFrame.Angles(0, math.rad(70 * dir), math.rad(-30))
	local strike = REST_C0 * CFrame.Angles(math.rad(-40), math.rad(-90 * dir), math.rad(20))

	motor.C0 = windUp
	TweenService:Create(motor, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		C0 = strike,
	}):Play()
	task.delay(0.16, function()
		if self._motor == motor then
			TweenService:Create(motor, TweenInfo.new(0.2, Enum.EasingStyle.Sine), { C0 = REST_C0 }):Play()
		end
	end)
end

function CombatController:_onAttackInput()
	local now = os.clock()
	if now < self._nextSwingReadyAt or not combatAllowedHere() then
		return
	end
	-- Predict which combo step this is (mirrors server logic for feel only).
	local weapon = self:_equippedDef()
	if now > self._localComboResetAt then
		self._localComboIndex = 0
	end
	self._localComboIndex += 1
	if self._localComboIndex > #weapon.combo then
		self._localComboIndex = 1
	end
	local step = weapon.combo[self._localComboIndex]
	self._nextSwingReadyAt = now + step.windup + step.active
	self._localComboResetAt = step.comboWindow > 0 and (now + step.windup + step.comboWindow) or 0

	CharacterController:FaceCameraFor(step.windup + step.active)
	self:_playSwing(self._localComboIndex)

	self._requestAttack:FireServer("light")
end

-- Slow overhead heavy: wind up over the step's windup, then a fast strike down.
function CombatController:_playHeavy()
	local motor = self._motor
	if not motor then
		return
	end
	local wind = REST_C0 * CFrame.Angles(math.rad(130), 0, 0)
	local strike = REST_C0 * CFrame.Angles(math.rad(-75), 0, 0)
	TweenService:Create(motor, TweenInfo.new(0.42, Enum.EasingStyle.Sine), { C0 = wind }):Play()
	task.delay(0.42, function()
		if self._motor ~= motor then
			return
		end
		TweenService:Create(motor, TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
			C0 = strike,
		}):Play()
		task.delay(0.2, function()
			if self._motor == motor and not self._blocking then
				TweenService:Create(motor, TweenInfo.new(0.3, Enum.EasingStyle.Sine), { C0 = REST_C0 }):Play()
			end
		end)
	end)
end

function CombatController:_onHeavyInput()
	local now = os.clock()
	if now < self._nextHeavyReadyAt or now < self._nextSwingReadyAt or not combatAllowedHere() then
		return
	end
	local step = self:_equippedDef().heavy
	self._nextHeavyReadyAt = now + step.windup + step.active + step.recovery
	self._nextSwingReadyAt = now + step.windup + step.active
	self._localComboIndex = 0 -- heavy breaks the light chain
	self._localComboResetAt = 0

	CharacterController:FaceCameraFor(step.windup + step.active)
	self:_playHeavy()
	self._requestAttack:FireServer("heavy")
end

-- Super release: a fast full spin of the blade. Damage/validation is the
-- server's job; this is purely the local read of pressing R.
function CombatController:_playSuper()
	local motor = self._motor
	if not motor then
		return
	end
	local spin = REST_C0 * CFrame.Angles(0, math.rad(359), 0)
	TweenService:Create(motor, TweenInfo.new(0.28, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		C0 = spin,
	}):Play()
	task.delay(0.3, function()
		if self._motor == motor and not self._blocking then
			motor.C0 = REST_C0
		end
	end)
end

function CombatController:_onSuperInput()
	if not combatAllowedHere() then
		return
	end
	-- Optimistic: play the spin locally; server rejects (no VFX) if meter empty.
	self:_playSuper()
	self._requestSuper:FireServer()
end

function CombatController:_onBlock(on: boolean)
	self._blocking = on
	self._setBlocking:FireServer(on)
	local motor = self._motor
	if motor then
		TweenService:Create(motor, TweenInfo.new(0.12), { C0 = on and GUARD_C0 or REST_C0 }):Play()
	end
end

function CombatController:_onFeedback(payload: any)
	if payload.type == "hit" then
		self:_flashBlade(Color3.fromRGB(255, 240, 180))
	elseif payload.type == "parry" then
		self:_flashBlade(Color3.fromRGB(120, 190, 255))
	elseif payload.type == "blocked" then
		self:_flashBlade(Color3.fromRGB(200, 205, 215))
	elseif payload.type == "super" then
		self:_flashBlade(Color3.fromRGB(255, 210, 90))
	elseif payload.type == "reject" then
		-- Roll our local prediction back a step so it can't drift out of sync.
		self._localComboIndex = math.max(0, self._localComboIndex - 1)
	end
end

function CombatController:_flashBlade(color: Color3)
	local blade = self._blade
	if not blade then
		return
	end
	blade.Color = color
	blade.Material = Enum.Material.Neon
	task.delay(0.08, function()
		if self._blade == blade then
			blade.Color = self._bladeBaseColor or Color3.fromRGB(210, 215, 230)
			blade.Material = self._bladeBaseMaterial or Enum.Material.Metal
		end
	end)
end

function CombatController:Init()
	self._requestAttack = Net.event(Net.Events.RequestAttack)
	self._requestDodge = Net.event(Net.Events.RequestDodge)
	self._requestSuper = Net.event(Net.Events.RequestSuper)
	self._setBlocking = Net.event(Net.Events.SetBlocking)
	self._feedback = Net.event(Net.Events.CombatFeedback)
end

function CombatController:Start()
	-- (Re)build the held weapon when the character spawns AND whenever the
	-- server switches the equipped weapon (shop buy/equip) mid-life.
	local function watchCharacter(character: Model)
		self:_attachWeapon(character)
		character:GetAttributeChangedSignal("Weapon"):Connect(function()
			self._localComboIndex = 0
			self._localComboResetAt = 0
			self:_attachWeapon(character)
		end)
	end

	if player.Character then
		watchCharacter(player.Character)
	end
	player.CharacterAdded:Connect(function(character)
		self._localComboIndex = 0
		self._blocking = false
		watchCharacter(character)
	end)

	InputController.Attacked:Connect(function()
		self:_onAttackInput()
	end)
	InputController.HeavyAttacked:Connect(function()
		self:_onHeavyInput()
	end)
	InputController.Supered:Connect(function()
		self:_onSuperInput()
	end)
	InputController.Dodged:Connect(function()
		-- Movement is handled locally by CharacterController; this asks the
		-- server to grant the authoritative i-frames.
		self._requestDodge:FireServer()
	end)
	InputController.BlockChanged:Connect(function(on)
		self:_onBlock(on)
	end)

	self._feedback.OnClientEvent:Connect(function(payload)
		self:_onFeedback(payload)
	end)
end

return CombatController
