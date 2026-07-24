--!strict
--[[
	GameConfig
	----------
	Tunables for movement/camera feel. Kept data-only so both the client
	controller and any server-side sanity checks read one source of truth.
	God-of-War-ish target: heavier than a battlegrounds game, deliberate dashes,
	grounded jumps.
]]

local GameConfig = {}

-- Player-facing title for this Roblox build (the player is the 95th bearer).
GameConfig.GameTitle = "The 95th"

GameConfig.Movement = {
	WalkSpeed = 14, -- studs/sec baseline
	SprintSpeed = 24,
	JumpPower = 48,
	-- Dodge/dash: short burst, brief i-frames, then a recovery window.
	DodgeSpeed = 62,
	DodgeDuration = 0.28,
	DodgeIFrames = 0.20,
	DodgeCooldown = 0.55,
	-- How fast the character model yaws to face the movement/camera direction.
	TurnSpeed = 18,
}

GameConfig.Camera = {
	Distance = 13,
	Height = 3.5,
	ShoulderOffset = 2.25, -- lateral over-the-shoulder offset (GoW framing)
	MinPitch = math.rad(-60),
	MaxPitch = math.rad(45),
	Sensitivity = 0.32,
	LookSmoothing = 0.18, -- 0 = instant, higher = floatier
	FieldOfView = 74,
}

GameConfig.Economy = {
	-- Coins every party member receives when an Act is cleared (kills also pay
	-- per-enemy — see `coins` in Definitions/Enemies).
	ActClearBonus = 30,
	-- Seconds between background profile saves (join/leave saves always happen).
	AutosaveInterval = 120,
}

GameConfig.Combat = {
	-- Reserved for Phase 2 anti-cheat. NOT yet enforced: the server currently
	-- reads the live replicated root CFrame for hit resolution and the client
	-- sends no position, so there is nothing to validate against yet.
	HitValidationSlack = 6,
}

return table.freeze(GameConfig)
