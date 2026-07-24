--!strict
--[[
	Server bootstrap
	----------------
	Entry point that Rojo maps to ServerScriptService/Server. It provisions the
	networking surface, then Init/Start-s every service under /Services in two
	ordered passes. Add a new server system by dropping a ModuleScript into
	Services — no edits here.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Loader = require(Shared.Framework.Loader)
local Net = require(Shared.Net.Net)

-- Create every RemoteEvent before any client script can WaitForChild them.
Net.provision()

Loader.bootstrap(script.Services)

print("[Server] booted")
