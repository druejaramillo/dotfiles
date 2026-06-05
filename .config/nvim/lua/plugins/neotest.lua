local function has(plugin)
	local ok, lazy_config = pcall(require, "lazy.core.config")
	return ok and lazy_config.plugins[plugin] ~= nil
end

local function open_neotest_output()
	vim.defer_fn(function()
		pcall(function()
			require("neotest").output_panel.open()
		end)
	end, 200)
end

local function run_go_bench_file()
	require("neotest").run.run({
		vim.fn.expand("%"),
		extra_args = {
			go_test_args = {
				"-v",
				"-run=^$",
				"-bench=.",
				"-benchmem",
				"-count=5",
			},
		},
	})

	open_neotest_output()
end

local function run_go_bench_all()
	require("neotest").run.run({
		vim.uv.cwd(),
		extra_args = {
			go_test_args = {
				"-v",
				"-run=^$",
				"-bench=.",
				"-benchmem",
				"-count=5",
			},
		},
	})

	open_neotest_output()
end

local function run_go_fuzz_file()
	local target = vim.fn.expand("<cword>")

	require("neotest").run.run({
		vim.fn.expand("%"),
		extra_args = {
			go_test_args = {
				"-v",
				"-run=^$",
				"-fuzz=" .. target,
				"-fuzztime=10s",
			},
		},
	})

	open_neotest_output()
end

local function run_go_fuzz_prompt()
	vim.ui.input({ prompt = "Fuzz target regex: ", default = "Fuzz" }, function(input)
		if not input or input == "" then
			return
		end

		require("neotest").run.run({
			vim.fn.expand("%"),
			extra_args = {
				go_test_args = {
					"-v",
					"-run=^$",
					"-fuzz=" .. input,
					"-fuzztime=10s",
				},
			},
		})

		open_neotest_output()
	end)
end

return {
	{
		"nvim-neotest/neotest",
		desc = "Neotest support",
		dependencies = {
			"nvim-neotest/nvim-nio",
			"nvim-lua/plenary.nvim",
			"antoinemadec/FixCursorHold.nvim",
			{
				"nvim-treesitter/nvim-treesitter",
				branch = "main",
				build = function()
					vim.cmd(":TSUpdate go")
				end,
			},
			{
				"fredrikaverpil/neotest-golang",
				version = "*",
				build = function()
					vim.system({ "go", "install", "gotest.tools/gotestsum@latest" }):wait()
				end,
			},
		},

		opts = {
			adapters = {
				["neotest-golang"] = {
					runner = "gotestsum",
				},
			},

			status = { virtual_text = true },
			output = { open_on_run = true },

			quickfix = {
				open = function()
					if has("folke/trouble.nvim") then
						require("trouble").open({ mode = "quickfix", focus = false })
					else
						vim.cmd("copen")
					end
				end,
			},
		},

		config = function(_, opts)
			local neotest_ns = vim.api.nvim_create_namespace("neotest")

			vim.diagnostic.config({
				virtual_text = {
					format = function(diagnostic)
						return diagnostic.message:gsub("\n", " "):gsub("\t", " "):gsub("%s+", " "):gsub("^%s+", "")
					end,
				},
			}, neotest_ns)

			-- Trouble integration
			if has("folke/trouble.nvim") then
				opts.consumers = opts.consumers or {}

				opts.consumers.trouble = function(client)
					client.listeners.results = function(adapter_id, results, partial)
						if partial then
							return
						end

						local tree = assert(client:get_position(nil, { adapter = adapter_id }))
						local failed = 0

						for pos_id, result in pairs(results) do
							if result.status == "failed" and tree:get_key(pos_id) then
								failed = failed + 1
							end
						end

						vim.schedule(function()
							local trouble = require("trouble")
							if trouble.is_open() then
								trouble.refresh()
								if failed == 0 then
									trouble.close()
								end
							end
						end)

						return {}
					end
				end
			end

			-- Adapter loader (unchanged)
			if opts.adapters then
				local adapters = {}

				for name, config in pairs(opts.adapters) do
					if type(name) == "number" then
						if type(config) == "string" then
							config = require(config)
						end
						adapters[#adapters + 1] = config
					elseif config ~= false then
						local adapter = require(name)

						if type(config) == "table" and not vim.tbl_isempty(config) then
							local meta = getmetatable(adapter)

							if adapter.setup then
								adapter.setup(config)
							elseif adapter.adapter then
								adapter.adapter(config)
								adapter = adapter.adapter
							elseif meta and meta.__call then
								adapter = adapter(config)
							else
								error("Adapter " .. name .. " does not support setup")
							end
						end

						adapters[#adapters + 1] = adapter
					end
				end

				opts.adapters = adapters
			end

			require("neotest").setup(opts)
		end,

		keys = {
			{ "<leader>t", "", desc = "+test" },
			{
				"<leader>ta",
				function()
					require("neotest").run.attach()
				end,
				desc = "Attach",
			},
			{
				"<leader>tt",
				function()
					require("neotest").run.run(vim.fn.expand("%"))
				end,
				desc = "Run File",
			},
			{
				"<leader>tT",
				function()
					require("neotest").run.run(vim.uv.cwd())
				end,
				desc = "Run All",
			},
			{
				"<leader>tr",
				function()
					require("neotest").run.run()
				end,
				desc = "Run Nearest",
			},
			{
				"<leader>tl",
				function()
					require("neotest").run.run_last()
				end,
				desc = "Run Last",
			},
			{
				"<leader>ts",
				function()
					require("neotest").summary.toggle()
				end,
				desc = "Summary",
			},
			{
				"<leader>to",
				function()
					require("neotest").output.open({ enter = true, auto_close = true })
				end,
				desc = "Output",
			},
			{
				"<leader>tO",
				function()
					require("neotest").output_panel.toggle()
				end,
				desc = "Output Panel",
			},
			{
				"<leader>tS",
				function()
					require("neotest").run.stop()
				end,
				desc = "Stop",
			},
			{
				"<leader>tw",
				function()
					require("neotest").watch.toggle(vim.fn.expand("%"))
				end,
				desc = "Watch",
			},
			{
				"<leader>tb",
				run_go_bench_file,
				desc = "Run Benchmarks in File",
			},
			{
				"<leader>tB",
				run_go_bench_all,
				desc = "Run All Benchmarks",
			},
			{
				"<leader>tf",
				run_go_fuzz_file,
				desc = "Run Fuzz Target Under Cursor",
			},
			{
				"<leader>tF",
				run_go_fuzz_prompt,
				desc = "Run Fuzz Target",
			},
		},
	},

	{
		"mfussenegger/nvim-dap",
		optional = true,
		keys = {
			{
				"<leader>td",
				function()
					require("neotest").run.run({ strategy = "dap" })
				end,
				desc = "Debug Nearest",
			},
		},
	},
}
