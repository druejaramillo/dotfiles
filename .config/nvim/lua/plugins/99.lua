return {
	{
		"ThePrimeagen/99",
		config = function()
			local _99 = require("99")
			local cwd = vim.uv.cwd()
			local basename = vim.fs.basename(cwd)
			_99.setup({
				provider = _99.Providers.OpenCodeProvider, -- default: OpenCodeProvider
				model = "anthropic/claude-sonnet-4-5",

				logger = {
					level = _99.DEBUG,
					path = "/tmp/" .. basename .. ".99.debug",
					print_on_error = true,
				},

				tmp_dir = "./tmp",

				--- Completions: #rules and @files in the prompt buffer
				completion = {
					custom_rules = {
						"docs/skills",
					},

					--- Configure @file completion (all fields optional, sensible defaults)
					files = {
						-- enabled = true,
						-- max_file_size = 102400,     -- bytes, skip files larger than this
						-- max_files = 5000,            -- cap on total discovered files
						-- exclude = { ".env", ".env.*", "node_modules", ".git", ... },
					},

					source = "cmp", -- "native" (default), "cmp", or "blink"
				},

				--- md_files is a list of files to look for and auto add based on the location
				--- of the originating request.  That means if you are at /foo/bar/baz.lua
				--- the system will automagically look for:
				--- /foo/bar/AGENT.md
				--- /foo/AGENT.md
				--- assuming that /foo is project root (based on cwd)
				md_files = {
					"AGENTS.md",
				},
			})
		end,
	},
	{
		"folke/which-key.nvim",
		opts = {
			spec = {
				{
					mode = { "n", "x" },
					{
						"<leader>9",
						group = "99",
						icon = "✨",
					},
				},
				{
					mode = { "n" },
					{
						"<leader>9w",
						group = "Worker",
						icon = "🤖",
					},
				},
			},
		},
	},
}
