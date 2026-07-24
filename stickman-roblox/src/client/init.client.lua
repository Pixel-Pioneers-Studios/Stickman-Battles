--!strict
--[[
	Client bootstrap
	----------------
	Rojo maps src/client to StarterPlayerScripts/Client (a LocalScript, because
	of this init file). It Init/Start-s every controller under /Controllers in
	two ordered passes. Add a client system by dropping a ModuleScript into
	Controllers — no edits here.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Loader = require(Shared.Framework.Loader)

Loader.bootstrap(script.Controllers)

print("[Client] booted")
