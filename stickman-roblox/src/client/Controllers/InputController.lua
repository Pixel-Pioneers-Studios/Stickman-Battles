--!strict
--[[
	InputController
	---------------
	The one place that reads hardware. It normalizes keyboard/mouse and gamepad
	into intent: a move vector, a camera look delta, a sprint flag, and three
	action Signals (Attack / Dodge / Jump). Other controllers subscribe to those
	Signals instead of touching UserInputService, so rebinding lives here alone.

	Design intent (God-of-War feel): mouse-locked over-the-shoulder aiming, right
	stick / mouse drives the camera, actions are edge-triggered (fire on press).
]]

local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Signal = require(Shared.Util.Signal)

local InputController = {}

InputController.Attacked = Signal.new()
InputController.HeavyAttacked = Signal.new()
InputController.Supered = Signal.new()
InputController.Dodged = Signal.new()
InputController.Jumped = Signal.new()
InputController.BlockChanged = Signal.new() -- fires with a boolean (held / released)

InputController._lookDelta = Vector2.zero
InputController._sprinting = false
InputController._blocking = false
InputController._enabled = true
-- Cursor-free bookkeeping: the mouse unlocks if the player toggled it manually
-- (Left Alt) OR any UI holds a tag (shop, skill tree, …). While free, mouse
-- movement stops driving the camera and the icon is visible so UI is clickable.
InputController._manualCursorFree = false
InputController._cursorTags = {} :: { [string]: boolean }
InputController.CursorFreeChanged = Signal.new() -- fires with a boolean

-- Bindings (edit here to rebind). Keyboard-primary to match the web game:
--   E = light, Q = heavy, R = super, Space = jump, Left Ctrl = dodge.
-- Mouse buttons and gamepad face buttons are kept as convenience alternates.
local ATTACK_KEYS = { [Enum.KeyCode.E] = true, [Enum.UserInputType.MouseButton1] = true, [Enum.KeyCode.ButtonX] = true }
local HEAVY_KEYS = { [Enum.KeyCode.Q] = true, [Enum.UserInputType.MouseButton2] = true, [Enum.KeyCode.ButtonY] = true }
local SUPER_KEYS = { [Enum.KeyCode.R] = true, [Enum.KeyCode.ButtonR3] = true }
local DODGE_KEYS = { [Enum.KeyCode.LeftControl] = true, [Enum.KeyCode.RightControl] = true, [Enum.KeyCode.ButtonB] = true }
local JUMP_KEYS = { [Enum.KeyCode.Space] = true, [Enum.KeyCode.ButtonA] = true }
local SPRINT_KEYS = { [Enum.KeyCode.LeftShift] = true, [Enum.KeyCode.ButtonL3] = true }
local BLOCK_KEYS = { [Enum.KeyCode.F] = true, [Enum.KeyCode.ButtonL1] = true }

local MOUSE_LOOK_SCALE = 0.35
local STICK_LOOK_SCALE = 12
local STICK_DEADZONE = 0.15

function InputController:IsCursorFree(): boolean
	if self._manualCursorFree then
		return true
	end
	return next(self._cursorTags) ~= nil
end

function InputController:_applyCursorMode()
	local free = self:IsCursorFree()
	UserInputService.MouseBehavior = free and Enum.MouseBehavior.Default or Enum.MouseBehavior.LockCenter
	UserInputService.MouseIconEnabled = free
	self.CursorFreeChanged:Fire(free)
end

-- UI panels call this with a unique tag when they open/close so the cursor is
-- usable while ANY panel is up, and re-locks when the last one closes.
function InputController:SetCursorFree(tag: string, on: boolean)
	self._cursorTags[tag] = on and true or nil
	self:_applyCursorMode()
end

-- Camera consumes and clears the accumulated look delta each frame.
function InputController:ConsumeLookDelta(): Vector2
	local delta = self._lookDelta
	self._lookDelta = Vector2.zero

	-- Add gamepad right-stick contribution (polled, not event-based).
	local stick = UserInputService:GetGamepadState(Enum.UserInputType.Gamepad1)
	for _, state in stick do
		if state.KeyCode == Enum.KeyCode.Thumbstick2 then
			local p = state.Position
			if p.Magnitude > STICK_DEADZONE then
				delta += Vector2.new(-p.X, p.Y) * STICK_LOOK_SCALE
			end
		end
	end
	return delta
end

-- Camera-space-agnostic raw move input: X = strafe (+right), Y = forward (+fwd).
function InputController:GetMoveVector(): Vector2
	local move = Vector2.zero
	if UserInputService:IsKeyDown(Enum.KeyCode.W) then
		move += Vector2.new(0, 1)
	end
	if UserInputService:IsKeyDown(Enum.KeyCode.S) then
		move += Vector2.new(0, -1)
	end
	if UserInputService:IsKeyDown(Enum.KeyCode.D) then
		move += Vector2.new(1, 0)
	end
	if UserInputService:IsKeyDown(Enum.KeyCode.A) then
		move += Vector2.new(-1, 0)
	end

	local stick = UserInputService:GetGamepadState(Enum.UserInputType.Gamepad1)
	for _, state in stick do
		if state.KeyCode == Enum.KeyCode.Thumbstick1 and state.Position.Magnitude > STICK_DEADZONE then
			move += Vector2.new(state.Position.X, state.Position.Y)
		end
	end

	if move.Magnitude > 1 then
		move = move.Unit
	end
	return move
end

function InputController:IsSprinting(): boolean
	return self._sprinting
end

function InputController:_bind()
	UserInputService.MouseBehavior = Enum.MouseBehavior.LockCenter
	UserInputService.MouseIconEnabled = false

	UserInputService.InputBegan:Connect(function(input, gameProcessed)
		if gameProcessed or not self._enabled then
			return
		end
		local key = input.KeyCode ~= Enum.KeyCode.Unknown and input.KeyCode or input.UserInputType
		if ATTACK_KEYS[key] then
			self.Attacked:Fire()
		elseif HEAVY_KEYS[key] then
			self.HeavyAttacked:Fire()
		elseif SUPER_KEYS[key] then
			self.Supered:Fire()
		elseif DODGE_KEYS[key] then
			self.Dodged:Fire()
		elseif JUMP_KEYS[key] then
			self.Jumped:Fire()
		elseif SPRINT_KEYS[key] then
			self._sprinting = true
		elseif BLOCK_KEYS[key] then
			self._blocking = true
			self.BlockChanged:Fire(true)
		elseif key == Enum.KeyCode.LeftAlt then
			-- Manual mouse-lock toggle: frees the cursor to click UI, press
			-- again (or open/close a panel) to re-lock for camera control.
			self._manualCursorFree = not self._manualCursorFree
			self:_applyCursorMode()
		end
	end)

	UserInputService.InputEnded:Connect(function(input)
		local key = input.KeyCode ~= Enum.KeyCode.Unknown and input.KeyCode or input.UserInputType
		if SPRINT_KEYS[key] then
			self._sprinting = false
		elseif BLOCK_KEYS[key] then
			self._blocking = false
			self.BlockChanged:Fire(false)
		end
	end)

	UserInputService.InputChanged:Connect(function(input, gameProcessed)
		if
			input.UserInputType == Enum.UserInputType.MouseMovement
			and not gameProcessed
			and not self:IsCursorFree() -- free cursor aims, it doesn't spin the camera
		then
			self._lookDelta += Vector2.new(input.Delta.X, input.Delta.Y) * MOUSE_LOOK_SCALE
		end
	end)

	-- Reassert the current cursor mode if the engine releases it (focus loss).
	UserInputService.WindowFocused:Connect(function()
		if self._enabled then
			self:_applyCursorMode()
		end
	end)
end

function InputController:Start()
	self:_bind()
end

return InputController
