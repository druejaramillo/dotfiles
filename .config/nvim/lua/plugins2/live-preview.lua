return {
	"brianhuster/live-preview.nvim",
	dependencies = {
		"nvim-telescope/telescope.nvim",
	},
	keys = {
		{
			"<leader>cps",
			"<cmd>LivePreview start<CR>",
			desc = "Start Live Preview",
		},
		{
			"<leader>cpx",
			"<cmd>LivePreview close<CR>",
			desc = "Close Live Preview",
		},
		{
			"<leader>cpp",
			"<cmd>LivePreview pick<CR>",
			desc = "Pick File",
		},
	},
}
