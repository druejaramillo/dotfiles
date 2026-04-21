return {
	desc = "Aerial Symbol Browser",

	{
		"stevearc/aerial.nvim",
		event = { "BufReadPost", "BufNewFile" },
		opts = function()
			local kind_icons = {
				Array = " ",
				Boolean = "󰨙 ",
				Class = " ",
				Constant = "󰏿 ",
				Constructor = " ",
				Enum = " ",
				EnumMember = " ",
				Event = " ",
				Field = " ",
				File = " ",
				Function = "󰊕 ",
				Interface = " ",
				Key = " ",
				Method = "󰊕 ",
				Module = " ",
				Namespace = "󰦮 ",
				Null = " ",
				Number = "󰎠 ",
				Object = " ",
				Operator = " ",
				Package = " ",
				Property = " ",
				String = " ",
				Struct = "󰙅 ",
				TypeParameter = " ",
				Variable = "󰀫 ",
				Control = " ",
			}

			-- Fix lua using Package for control-flow constructs
			kind_icons.lua = { Package = kind_icons.Control }

			-- Set to false to show all symbol kinds
			-- Or define your own per-filetype filters below
			local filter_kind = false

			-- Example if you want filtering later:
			-- local filter_kind = {
			--   default = {
			--     "Class",
			--     "Constructor",
			--     "Enum",
			--     "Function",
			--     "Interface",
			--     "Method",
			--     "Module",
			--     "Namespace",
			--     "Package",
			--     "Property",
			--     "Struct",
			--     "Trait",
			--   },
			--   lua = {
			--     "Function",
			--     "Method",
			--     "Table",
			--     "Module",
			--   },
			-- }

			return {
				attach_mode = "global",
				backends = { "lsp", "treesitter", "markdown", "man" },
				show_guides = true,
				layout = {
					resize_to_content = false,
					win_opts = {
						winhl = "Normal:NormalFloat,FloatBorder:NormalFloat,SignColumn:SignColumnSB",
						signcolumn = "yes",
						statuscolumn = " ",
					},
				},
				icons = kind_icons,
				filter_kind = filter_kind,
				guides = {
					mid_item = "├╴",
					last_item = "└╴",
					nested_top = "│ ",
					whitespace = "  ",
				},
			}
		end,
		keys = {
			{ "<leader>cs", "<cmd>AerialToggle<cr>", desc = "Aerial (Symbols)" },
		},
	},
	{
		"nvim-telescope/telescope.nvim",
		optional = true,
		dependencies = { "stevearc/aerial.nvim" },
		config = function()
			pcall(function()
				require("telescope").load_extension("aerial")
			end)
		end,
		keys = {
			{
				"<leader>ss",
				"<cmd>Telescope aerial<cr>",
				desc = "Goto Symbol (Aerial)",
			},
		},
	},
	{
		"nvim-lualine/lualine.nvim",
		optional = true,
		opts = function(_, opts)
			if not vim.g.trouble_lualine then
				table.insert(opts.sections.lualine_c, {
					"aerial",
					sep = " ",
					sep_icon = "",
					depth = 5,
					dense = false,
					dense_sep = ".",
					colored = true,
				})
			end
		end,
	},
}
