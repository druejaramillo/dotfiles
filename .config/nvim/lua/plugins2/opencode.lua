return {
	"sudo-tee/opencode.nvim",
	config = function()
		require("opencode").setup({
			preferred_picker = "telescope",
			preferred_completion = "nvim-cmp",
			default_mode = "plan",
		})
	end,
	dependencies = {
		"nvim-lua/plenary.nvim",
		{
			"MeanderingProgrammer/render-markdown.nvim",
			opts = {
				anti_conceal = { enabled = false },
				file_types = { "markdown", "opencode_output" },
			},
			ft = { "markdown", "Avante", "copilot-chat", "opencode_output" },
		},
		"hrsh7th/nvim-cmp",
		"nvim-telescope/telescope.nvim",
	},
}
