--!strict
--[[
	CharacterController
	-------------------
	The custom action-game locomotion layer. It disables Roblox's default control
	+ auto-rotate, then drives the character itself every frame:

	  * camera-relative movement,
	  * sprint,
	  * a burst dodge (reuses Humanoid:Move at DodgeSpeed for a fixed window —
	    no BodyMovers, fully deterministic) with a matching server i-frame request
	    sent by CombatController,
	  * manual facing (toward movement normally; snapped to camera-forward during
	    an attack so swings go where you aim),
	  * knockback / stagger applied from server HealthChanged events.

	We keep the engine Humanoid for locomotion PHYSICS only. All gameplay
	decisions (state, dodge, facing, stagger) live here — the Humanoid never
	decides anything.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local GameConfig = require(Shared.Config.GameConfig)
local Net = require(Shared.Net.Net)

local InputController = require(script.Parent.InputController)
local CameraController = require(script.Parent.CameraController)

local CharacterController = {}

local player = Players.LocalPlayer
local mv = GameConfig.Movement

CharacterController._humanoid = nil :: Humanoid?
CharacterController._root = nil :: BasePart?
CharacterController._dodging = false
CharacterController._dodgeDir = Vector3.zero
CharacterController._dodgeEndsAt = 0
CharacterController._faceCameraUntil = 0
CharacterController._staggerUntil = 0

-- Called by CombatController so attacks aim where the camera points.
function CharacterController:FaceCameraFor(duration: number)
	self._faceCameraUntil = os.clock() + duration
end

function CharacterController:IsGrounded(): boolean
	local h = self._humanoid
	return h ~= nil and h.FloorMaterial ~= Enum.Material.Air
end

function CharacterController:_cameraBasis(): (Vector3, Vector3)
	local forward = CameraController:GetForward()
	local right = Vector3.new(-forward.Z, 0, forward.X)
	return forward, right
end

-- Flat direction from the character to the world point under the mouse cursor.
-- Raycast first (aims at what you're pointing at); if the ray hits nothing,
-- intersect the character's ground plane so aiming at the sky still works.
function CharacterController:_cursorAimDir(): Vector3?
	local root = self._root
	local camera = Workspace.CurrentCamera
	if not root or not camera then
		return nil
	end
	local mouse = UserInputService:GetMouseLocation()
	local ray = camera:ViewportPointToRay(mouse.X, mouse.Y)

	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { player.Character :: Instance }
	local hit = Workspace:Raycast(ray.Origin, ray.Direction * 600, params)

	local target: Vector3?
	if hit then
		target = hit.Position
	elseif math.abs(ray.Direction.Y) > 1e-4 then
		local t = (root.Position.Y - ray.Origin.Y) / ray.Direction.Y
		if t > 0 then
			target = ray.Origin + ray.Direction * t
		end
	end
	if not target then
		return nil
	end
	local flat = Vector3.new(target.X - root.Position.X, 0, target.Z - root.Position.Z)
	return flat.Magnitude > 1 and flat.Unit or nil
end

function CharacterController:_beginDodge()
	if not self:IsGrounded() or self._dodging or os.clock() < self._staggerUntil then
		return
	end
	local forward, right = self:_cameraBasis()
	local input = InputController:GetMoveVector()
	local dir = right * input.X + forward * input.Y
	if dir.Magnitude < 0.1 then
		dir = -(self._root and self._root.CFrame.LookVector or forward) -- backstep
	end
	self._dodgeDir = Vector3.new(dir.X, 0, dir.Z).Unit
	self._dodging = true
	self._dodgeEndsAt = os.clock() + mv.DodgeDuration
end

function CharacterController:_applyKnockback(payload: any)
	local root, humanoid = self._root, self._humanoid
	if not root or not humanoid then
		return
	end
	local kb = payload.knockback
	if typeof(kb) == "Vector3" then
		-- PlatformStand releases the Humanoid's locomotion controller so the
		-- impulse isn't immediately braked back to zero by Humanoid:Move.
		humanoid.PlatformStand = true
		root.AssemblyLinearVelocity = kb
		self._staggerUntil = os.clock() + 0.25
	end
end

function CharacterController:_update(dt: number)
	local humanoid, root = self._humanoid, self._root
	if not humanoid or not root or humanoid.Health <= 0 then
		return
	end

	local now = os.clock()

	-- Stagger window: PlatformStand carries the server knockback with no control
	-- input this frame. Recover control (and end PlatformStand) once it lapses.
	if now < self._staggerUntil then
		return
	elseif humanoid.PlatformStand then
		humanoid.PlatformStand = false
	end

	local forward, right = self:_cameraBasis()
	local input = InputController:GetMoveVector()

	local moveDir: Vector3
	if self._dodging then
		if now >= self._dodgeEndsAt then
			self._dodging = false
			moveDir = Vector3.zero
		else
			moveDir = self._dodgeDir
			humanoid.WalkSpeed = mv.DodgeSpeed
		end
	end

	if not self._dodging then
		moveDir = right * input.X + forward * input.Y
		moveDir = Vector3.new(moveDir.X, 0, moveDir.Z)
		if moveDir.Magnitude > 0 then
			moveDir = moveDir.Unit
		end
		local character = self._root and self._root.Parent
		local speedBonus = (character and character:GetAttribute("SpeedBonus")) :: number? or 0
		humanoid.WalkSpeed = (InputController:IsSprinting() and mv.SprintSpeed or mv.WalkSpeed) + speedBonus
	end

	humanoid:Move(moveDir, false)

	-- Facing = aim. Mouse locked: the crosshair IS the camera center, so face
	-- camera-forward at all times (attacks go exactly where you look). Mouse
	-- free (Alt / UI): face the point under the cursor so you keep aiming with
	-- the visible mouse instead of the camera.
	local faceDir: Vector3?
	if now < self._faceCameraUntil then
		faceDir = forward
	elseif InputController:IsCursorFree() then
		faceDir = self:_cursorAimDir()
	else
		faceDir = forward
	end

	if faceDir then
		local pos = root.Position
		local goal = CFrame.lookAt(pos, pos + faceDir)
		root.CFrame = root.CFrame:Lerp(
			CFrame.new(pos) * (goal - goal.Position),
			math.clamp(mv.TurnSpeed * dt, 0, 1)
		)
	end
end

function CharacterController:_onCharacter(character: Model)
	local humanoid = character:WaitForChild("Humanoid") :: Humanoid
	local root = character:WaitForChild("HumanoidRootPart") :: BasePart
	humanoid.AutoRotate = false
	humanoid.WalkSpeed = mv.WalkSpeed
	humanoid.JumpPower = mv.JumpPower
	humanoid.UseJumpPower = true
	self._humanoid = humanoid
	self._root = root
	self._dodging = false
end

function CharacterController:Init()
	self._healthChanged = Net.event(Net.Events.HealthChanged)
end

function CharacterController:Start()
	-- Disable the default control scripts; we drive movement ourselves.
	local ok, playerModule = pcall(function()
		return require(player:WaitForChild("PlayerScripts"):WaitForChild("PlayerModule"))
	end)
	if ok and playerModule then
		pcall(function()
			playerModule:GetControls():Disable()
		end)
	end

	if player.Character then
		self:_onCharacter(player.Character)
	end
	player.CharacterAdded:Connect(function(character)
		self:_onCharacter(character)
	end)

	InputController.Dodged:Connect(function()
		self:_beginDodge()
	end)
	InputController.Jumped:Connect(function()
		if self._humanoid and self:IsGrounded() then
			self._humanoid.Jump = true
		end
	end)

	self._healthChanged.OnClientEvent:Connect(function(payload)
		self:_applyKnockback(payload)
	end)

	RunService.RenderStepped:Connect(function(dt)
		self:_update(dt)
	end)
end

return CharacterController
