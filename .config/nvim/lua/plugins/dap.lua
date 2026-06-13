local function has(plugin)
	local ok, lazy_config = pcall(require, "lazy.core.config")
	return ok and lazy_config.plugins[plugin] ~= nil
end

---@param config {type?:string, args?:string[]|fun():string[]?}
local function get_args(config)
	local args = type(config.args) == "function" and (config.args() or {}) or config.args or {}
	local args_str = type(args) == "table" and table.concat(args, " ") or args

	config = vim.deepcopy(config)
	config.args = function()
		local new_args = vim.fn.expand(vim.fn.input("Run with args: ", args_str))
		if config.type == "java" then
			return new_args
		end
		return require("dap.utils").splitstr(new_args)
	end
	return config
end

local function refresh_dapui()
	local ok, dapui = pcall(require, "dapui")
	if not ok then
		return
	end

	vim.schedule(function()
		-- Refresh without disturbing the bottom tray.
		-- This is much less annoying than closing/reopening all dap-ui windows.
		dapui.close({ layout = 1 })
		dapui.open({ layout = 1 })
	end)
end

return {
	{
		"mfussenegger/nvim-dap",
		desc = "Debugging support",

		dependencies = {
			"nvim-lua/plenary.nvim",
			"rcarriga/nvim-dap-ui",
			{
				"theHamsta/nvim-dap-virtual-text",
				opts = {},
			},
		},

		keys = {
			{
				"<leader>dB",
				function()
					require("dap").set_breakpoint(vim.fn.input("Breakpoint condition: "))
					refresh_dapui()
				end,
				desc = "Breakpoint Condition",
			},
			{
				"<leader>db",
				function()
					require("dap").toggle_breakpoint()
					refresh_dapui()
				end,
				desc = "Toggle Breakpoint",
			},
			{
				"<leader>dc",
				function()
					require("dap").continue()
				end,
				desc = "Run/Continue",
			},
			{
				"<leader>da",
				function()
					require("dap").continue({ before = get_args })
				end,
				desc = "Run with Args",
			},
			{
				"<leader>dC",
				function()
					require("dap").run_to_cursor()
				end,
				desc = "Run to Cursor",
			},
			{
				"<leader>dg",
				function()
					require("dap").goto_()
				end,
				desc = "Go to Line (No Execute)",
			},
			{
				"<leader>di",
				function()
					require("dap").step_into()
				end,
				desc = "Step Into",
			},
			{
				"<leader>dj",
				function()
					require("dap").down()
				end,
				desc = "Down",
			},
			{
				"<leader>dk",
				function()
					require("dap").up()
				end,
				desc = "Up",
			},
			{
				"<leader>dl",
				function()
					require("dap").run_last()
				end,
				desc = "Run Last",
			},
			{
				"<leader>dL",
				function()
					require("dap").set_breakpoint(nil, nil, vim.fn.input("Log point message: "))
					refresh_dapui()
				end,
				desc = "Log Point",
			},
			{
				"<leader>do",
				function()
					require("dap").step_out()
				end,
				desc = "Step Out",
			},
			{
				"<leader>dO",
				function()
					require("dap").step_over()
				end,
				desc = "Step Over",
			},
			{
				"<leader>dP",
				function()
					require("dap").pause()
				end,
				desc = "Pause",
			},
			{
				"<leader>dr",
				function()
					require("dap").repl.toggle()
				end,
				desc = "Toggle REPL",
			},
			{
				"<leader>ds",
				function()
					require("dap").session()
				end,
				desc = "Session",
			},
			{
				"<leader>dt",
				function()
					require("dap").terminate()
				end,
				desc = "Terminate",
			},
			{
				"<leader>dw",
				function()
					require("dap.ui.widgets").hover()
				end,
				desc = "Widgets",
			},
		},

		config = function()
			vim.api.nvim_set_hl(0, "DapStoppedLine", { default = true, link = "Visual" })

			vim.fn.sign_define("DapBreakpoint", {
				text = "●",
				texthl = "DiagnosticError",
				linehl = "",
				numhl = "",
			})

			vim.fn.sign_define("DapBreakpointCondition", {
				text = "◆",
				texthl = "DiagnosticWarn",
				linehl = "",
				numhl = "",
			})

			vim.fn.sign_define("DapBreakpointRejected", {
				text = "",
				texthl = "DiagnosticError",
				linehl = "",
				numhl = "",
			})

			vim.fn.sign_define("DapLogPoint", {
				text = "◆",
				texthl = "DiagnosticInfo",
				linehl = "",
				numhl = "",
			})

			vim.fn.sign_define("DapStopped", {
				text = "▶",
				texthl = "DiagnosticInfo",
				linehl = "Visual",
				numhl = "Visual",
			})

			local vscode = require("dap.ext.vscode")
			local json = require("plenary.json")

			vscode.json_decode = function(str)
				return vim.json.decode(json.json_strip_comments(str))
			end
		end,
	},

	-- Go DAP
	{
		"leoluz/nvim-dap-go",
		ft = "go",
		dependencies = {
			"mfussenegger/nvim-dap",
		},
		keys = {
			{
				"<leader>dgt",
				function()
					require("dap-go").debug_test()
				end,
				desc = "Debug Go Test",
			},
			{
				"<leader>dgl",
				function()
					require("dap-go").debug_last_test()
				end,
				desc = "Debug Last Go Test",
			},
		},
		opts = {
			delve = {
				path = vim.fn.exepath("dlv") ~= "" and vim.fn.exepath("dlv") or "dlv",
			},
		},
		config = function(_, opts)
			require("dap-go").setup(opts)
		end,
	},

	-- DAP UI
	{
		"rcarriga/nvim-dap-ui",
		dependencies = { "nvim-neotest/nvim-nio" },
		keys = {
			{
				"<leader>du",
				function()
					require("dapui").toggle({})
				end,
				desc = "Dap UI",
			},
			{
				"<leader>de",
				function()
					require("dapui").eval()
				end,
				desc = "Eval",
				mode = { "n", "x" },
			},
		},
		opts = {},
		config = function(_, opts)
			local dap = require("dap")
			local dapui = require("dapui")

			dapui.setup(opts)

			dap.listeners.after.event_initialized["dapui_config"] = function()
				dapui.open({})
			end

			dap.listeners.before.event_terminated["dapui_config"] = function()
				dapui.close({})
			end

			dap.listeners.before.event_exited["dapui_config"] = function()
				dapui.close({})
			end
		end,
	},

	-- mason integration
	{
		"jay-babu/mason-nvim-dap.nvim",
		dependencies = "mason.nvim",
		cmd = { "DapInstall", "DapUninstall" },
		opts = {
			automatic_installation = true,
			handlers = {},
			ensure_installed = {
				"delve",
			},
		},
	},
}
