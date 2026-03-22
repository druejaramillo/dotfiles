return {
	desc = "Snacks File Explorer",
	recommended = true,
	"folke/snacks.nvim",
	opts = { explorer = {} },
	keys = {
		{
			"<leader>fe",
			function()
				Snacks.explorer({
					cwd = vim.fs.root(vim.api.nvim_buf_get_name(0), { ".git", "Makefile", "package.json" }),
				})
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
