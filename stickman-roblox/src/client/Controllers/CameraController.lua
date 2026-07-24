--!strict
--[[
	CameraController
	----------------
	Custom scriptable third-person camera with an over-the-shoulder offset (GoW
	framing) and obstruction pull-in. Replaces Roblox's default camera entirely.
	It owns the yaw/pitch that the CharacterController reads to orient movement
	and facing, so camera and character never disagree about "forward".
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local GameConfig = require(Shared.Config.GameConfig)

local InputController = require(script.Parent.InputController)

local CameraController = {}

local player = Players.LocalPlayer
local cfg = GameConfig.Camera

CameraController._yaw = 0
CameraController._pitch = math.rad(-10)
CameraController._camera = nil :: Camera?

-- Radians of rotation per unit of accumulated look delta (tunable).
local LOOK_FACTOR = 0.02

function CameraController:GetYaw(): number
	return self._yaw
end

-- Flattened forward vector the character uses as "camera forward".
function CameraController:GetForward(): Vector3
	return Vector3.new(-math.sin(self._yaw), 0, -math.cos(self._yaw)).Unit
end

function CameraController:_getRoot(): BasePart?
	local character = player.Character
	return character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
end

function CameraController:_update(_dt: number)
	local camera = self._camera
	local root = self:_getRoot()
	if not camera or not root then
		return
	end

	local delta = InputController:ConsumeLookDelta()
	self._yaw -= delta.X * cfg.Sensitivity * LOOK_FACTOR
	self._pitch = math.clamp(
		self._pitch - delta.Y * cfg.Sensitivity * LOOK_FACTOR,
		cfg.MinPitch,
		cfg.MaxPitch
	)

	local rot = CFrame.fromEulerAnglesYXZ(self._pitch, self._yaw, 0)
	local focus = root.Position + Vector3.new(0, cfg.Height, 0) + rot.RightVector * cfg.ShoulderOffset
	local desired = focus - rot.LookVector * cfg.Distance

	-- Pull the camera in if something blocks the line from focus to camera.
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { player.Character :: Instance }
	local hit = Workspace:Raycast(focus, desired - focus, params)
	if hit then
		desired = hit.Position + (focus - desired).Unit * 0.5
	end

	local target = CFrame.lookAt(desired, focus)
	-- Smooth toward the target (frame-rate independent-ish).
	camera.CFrame = camera.CFrame:Lerp(target, math.clamp(1 - cfg.LookSmoothing, 0.05, 1))
end

function CameraController:Start()
	local camera = Workspace.CurrentCamera
	self._camera = camera
	camera.CameraType = Enum.CameraType.Scriptable
	camera.FieldOfView = cfg.FieldOfView

	RunService:BindToRenderStep("ActionCamera", Enum.RenderPriority.Camera.Value + 1, function(dt)
		self:_update(dt)
	end)
end

return CameraController
