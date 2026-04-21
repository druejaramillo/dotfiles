--- @param git boolean if true, only return git root, otherwise return any root
local function get_root(git)
	local root = vim.fs.root(vim.api.nvim_buf_get_name(0), function(name, path)
		if git == true then
			if name:match(".git") ~= nil then
				return true
			end
		else
			if name:match("*lock%.json$") ~= nil then
				return true
			end
			local patterns = { ".git", "Makefile", "package.json", "init.lua" }
			for _, pattern in ipairs(patterns) do
				if name:match(pattern) ~= nil then
					return true
				end
			end
		end
		return false
	end)
	return root
end

return {
	desc = "Snacks File Explorer",
	recommended = true,
	"folke/snacks.nvim",
	opts = { explorer = {} },
	keys = {
		{
			"<leader>fe",
			function()
				Snacks.explorer({ cwd = get_root(false) })
			end,
			desc = "Explorer Snacks (root dir)",
		},
		{
			"<leader>fE",
			function()
				Snacks.explorer()
			end,
			desc = "Explorer Snacks (cwd)",
		},
		{ "<leader>e", "<leader>fe", desc = "Explorer Snacks (root dir)", remap = true },
		{ "<leader>E", "<leader>fE", desc = "Explorer Snacks (cwd)", remap = true },
	},
}
