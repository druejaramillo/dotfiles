return {
	"nvim-lualine/lualine.nvim",
	event = "VeryLazy",
	dependencies = {
		"nvim-tree/nvim-web-devicons",
	},
	init = function()
		vim.g.lualine_laststatus = vim.o.laststatus
		if vim.fn.argc(-1) > 0 then
			-- Set an empty statusline until lualine loads
			vim.o.statusline = " "
		else
			-- Hide statusline on starter page
			vim.o.laststatus = 0
		end
	end,
	opts = function()
		-- PERF: avoid lualine's custom require wrapper overhead
		local lualine_require = require("lualine_require")
		lualine_require.require = require

		vim.o.laststatus = vim.g.lualine_laststatus

		local icons = {
			diagnostics = {
				Error = " ",
				Warn = " ",
				Info = " ",
				Hint = " ",
			},
			git = {
				added = "+",
				modified = "~",
				removed = "-",
			},
		}

		local function has(plugin)
			return package.loaded[plugin] ~= nil or require("lazy.core.config").plugins[plugin] ~= nil
		end

		local function root_dir()
			return function()
				local cwd = vim.uv.cwd() or ""
				local name = vim.fn.fnamemodify(cwd, ":t")
				return name ~= "" and ("󰉋 " .. name) or ""
			end
		end

		local function pretty_path()
			return function()
				local path = vim.fn.expand("%:~:.")
				if path == "" then
					return "[No Name]"
				end
				return path
			end
		end

		local opts = {
			options = {
				theme = "auto",
				globalstatus = vim.o.laststatus == 3,
				disabled_filetypes = {
					statusline = { "dashboard", "alpha", "ministarter", "snacks_dashboard" },
				},
			},
			sections = {
				lualine_a = { "mode" },
				lualine_b = { "branch" },

				lualine_c = {
					root_dir(),
					{
						"diagnostics",
						symbols = {
							error = icons.diagnostics.Error,
							warn = icons.diagnostics.Warn,
							info = icons.diagnostics.Info,
							hint = icons.diagnostics.Hint,
						},
					},
					{
						"filetype",
						icon_only = true,
						separator = "",
						padding = { left = 1, right = 0 },
					},
					{ pretty_path() },
				},

				lualine_x = {
					{
						function()
							local ok, pomo = pcall(require, "pomo")
							if not ok then
								return ""
							end

							local timer = pomo.get_first_to_finish()
							if timer == nil then
								return ""
							end

							return "󰄉 " .. tostring(timer)
						end,
					},
					Snacks.profiler.status(),
					{
						function()
							return require("noice").api.status.command.get()
						end,
						cond = function()
							return package.loaded["noice"] and require("noice").api.status.command.has()
						end,
						color = function()
							return { fg = Snacks.util.color("Statement") }
						end,
					},
					{
						function()
							return require("noice").api.status.mode.get()
						end,
						cond = function()
							return package.loaded["noice"] and require("noice").api.status.mode.has()
						end,
						color = function()
							return { fg = Snacks.util.color("Constant") }
						end,
					},
					{
						function()
							return "  " .. require("dap").status()
						end,
						cond = function()
							return package.loaded["dap"] and require("dap").status() ~= ""
						end,
						color = function()
							return { fg = Snacks.util.color("Debug") }
						end,
					},
					{
						require("lazy.status").updates,
						cond = require("lazy.status").has_updates,
						color = function()
							return { fg = Snacks.util.color("Special") }
						end,
					},
					{
						"diff",
						symbols = {
							added = icons.git.added,
							modified = icons.git.modified,
							removed = icons.git.removed,
						},
						source = function()
							local gitsigns = vim.b.gitsigns_status_dict
							if gitsigns then
								return {
									added = gitsigns.added,
									modified = gitsigns.changed,
									removed = gitsigns.removed,
								}
							end
						end,
					},
				},

				lualine_y = {
					{ "progress", separator = " ", padding = { left = 1, right = 0 } },
					{ "location", padding = { left = 0, right = 1 } },
				},

				lualine_z = {
					function()
						return " " .. os.date("%R")
					end,
				},
			},
			extensions = { "neo-tree", "lazy", "fzf" },
		}

		-- Add Trouble symbols if enabled
		if vim.g.trouble_lualine and has("trouble.nvim") then
			local trouble = require("trouble")
			local symbols = trouble.statusline({
				mode = "symbols",
				groups = {},
				title = false,
				filter = { range = true },
				format = "{kind_icon}{symbol.name:Normal}",
				hl_group = "lualine_c_normal",
			})

			table.insert(opts.sections.lualine_c, {
				symbols and symbols.get,
				cond = function()
					return vim.b.trouble_lualine ~= false and symbols.has()
				end,
			})
		end

		return opts
	end,
}
