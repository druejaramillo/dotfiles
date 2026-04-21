return {
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
					".opencode/skills",
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
	keys = {
		{
			"<leader>9v",
			function()
				require("99").visual()
			end,
			desc = "Visual Prompt",
			mode = "v",
		},
		{
			"<leader>9v",
			function()
				require("99").vibe()
			end,
			desc = "Vibe",
			mode = "n",
		},
		{
			"<leader>9x",
			function()
				require("99").stop_all_requests()
			end,
			desc = "Stop All Requests",
			mode = { "n", "v" },
		},
		{
			"<leader>9s",
			function()
				require("99").search()
			end,
			desc = "Search",
		},
		{
			"<leader>9t",
			function()
				require("99").tutorial()
			end,
			desc = "Tutorial",
		},
		{
			"<leader>9ws",
			function()
				require("99").Extensions.Worker.set_work()
			end,
			desc = "Set Work",
		},
		{
			"<leader>9wr",
			function()
				require("99").Extensions.Worker.search()
			end,
			desc = "Find Remaining",
		},
		{
			"<leader>9o",
			function()
				require("99").open()
			end,
			desc = "Open History",
		},
		{
			"<leader>9l",
			function()
				require("99").view_logs()
			end,
			desc = "View Logs",
		},
		{
			"<leader>9c",
			function()
				require("99").clear_previous_requests()
			end,
			desc = "Clear Previous",
		},
		{
			"<leader>9p",
			function()
				require("99.extensions.telescope").select_provider()
			end,
			desc = "Select Provider",
		},
		{
			"<leader>9m",
			function()
				require("99.extensions.telescope").select_model()
			end,
			desc = "Select Model",
		},
	},
}
