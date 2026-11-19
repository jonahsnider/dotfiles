local terminal = "com.superlogical.terminal"

local function fish_quote(s)
  return "'" .. s:gsub("[\\']", "\\%0") .. "'"
end

rex.action{
  name  = "gh_repo_configure",
  title = "GitHub: Configure Repo…",
  run   = function(ctx, args)
    local pwd, err = rex.block.call(terminal, "pwd", { block_id = ctx.block_id })
    if pwd == nil then error(err, 0) end
    -- The shell reports its directory as a URL, such as file://host/Users/me/repo
    local cwd = pwd.pwd:gsub("^file://[^/]*", ""):gsub("%%(%x%x)", function(hex)
      return string.char(tonumber(hex, 16))
    end)

    -- The server's PATH is minimal (launchd on macOS), so run the login shell by its full path
    local r, err = rex.exec(
      { os.getenv("SHELL"), "-lc", "gh_repo_configure --list-checks" },
      { cwd = cwd, timeout = 25 })
    if r == nil then error(err, 0) end
    if not r.ok then error(r.stderr, 0) end

    -- Each line is "<workflow> / <job>\t<check>", and one check can appear under several workflows
    local items, seen = {}, {}
    for label, check in r.stdout:gmatch("([^\t\n]+)\t([^\n]+)") do
      if not seen[check] then
        seen[check] = true
        table.insert(items, { id = check, title = label, icon = "branch" })
      end
    end

    local command = "gh_repo_configure"
    if #items > 0 then
      local checks = rex.ui.pick{
        title       = "Automerge checks",
        placeholder = "Filter checks",
        multiple    = true,
        confirm     = "Configure",
        items       = items,
      }
      if checks == nil or #checks == 0 then return end

      for _, check in ipairs(checks) do
        command = command .. " --checks " .. fish_quote(check)
      end
    end

    -- Run in the focused terminal so the work isn't bound by the action's 30-second limit
    rex.block.call(terminal, "write", { block_id = ctx.block_id, data = command .. "\r" })
  end,
}
