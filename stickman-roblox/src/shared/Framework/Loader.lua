--!strict
--[[
	Loader
	------
	Tiny, dependency-free module bootstrapper (Knit-style lifecycle without the
	framework lock-in). A "unit" is any ModuleScript that returns a table. If it
	exposes `Init` and/or `Start` methods they are invoked in two ordered passes:

		1. Init  — construct state, wire references. NO cross-unit calls that
		           assume another unit has started yet.
		2. Start — begin running: connect events, spawn loops, spawn enemies.

	Two passes guarantee every unit is Init'd before any unit Starts, so units
	can safely reference each other in Start without ordering headaches.
]]

local Loader = {}

export type Unit = {
	Init: ((self: any) -> ())?,
	Start: ((self: any) -> ())?,
	[any]: any,
}

-- Require every ModuleScript directly under `container` into a name->unit map.
function Loader.require(container: Instance): { [string]: Unit }
	local units: { [string]: Unit } = {}
	for _, child in container:GetChildren() do
		if child:IsA("ModuleScript") then
			local ok, result = pcall(require, child)
			if ok and typeof(result) == "table" then
				units[child.Name] = result
			elseif not ok then
				warn(`[Loader] failed to require {child:GetFullName()}: {result}`)
			end
		end
	end
	return units
end

-- Run the Init pass then the Start pass over an already-required unit map.
function Loader.start(units: { [string]: Unit })
	for name, unit in units do
		if typeof(unit.Init) == "function" then
			local ok, err = pcall(unit.Init, unit)
			if not ok then
				warn(`[Loader] {name}:Init errored: {err}`)
			end
		end
	end
	for name, unit in units do
		if typeof(unit.Start) == "function" then
			-- Start may run long-lived loops; isolate each in its own thread.
			task.spawn(function()
				local ok, err = pcall(unit.Start, unit)
				if not ok then
					warn(`[Loader] {name}:Start errored: {err}`)
				end
			end)
		end
	end
	return units
end

-- Convenience: require a container and start it in one call.
function Loader.bootstrap(container: Instance): { [string]: Unit }
	return Loader.start(Loader.require(container))
end

return Loader
