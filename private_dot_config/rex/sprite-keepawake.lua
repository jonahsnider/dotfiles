-- Run through `sprite exec`, so stdout heartbeats count as Sprite activity.
local started = false

local function check(result, err)
	if not result then
		rex.log("error", err)
		rex.stop(1)
	end
	return result
end

local function connected_terminal()
	local clients = check(rex.call("client.list"))
	for _, client in ipairs(clients.clients or {}) do
		if client.info and client.info.kind == "app" and client.connection_state == "connected" then
			for _, id in ipairs(client.session_ids or {}) do
				check(rex.session.attach({ session_id = id }))
				local view = check(rex.call("session.view", { session_id = id }))
				check(rex.session.detach({ session_id = id }))
				for _, window in ipairs(view.windows or {}) do
					for _, layer in ipairs(window.layers or {}) do
						for _, block in ipairs(layer.blocks or {}) do
							if block.creator_name == "com.superlogical.terminal" then
								return true
							end
						end
					end
				end
			end
		end
	end
	return false
end

local function heartbeat()
	if connected_terminal() then
		if not started then
			print("sprite-rex-keepawake ready")
			started = true
		end
		print(".")
	elseif started then
		rex.stop()
	end
end

heartbeat()
rex.every(3, heartbeat)
