return {
	{
		"hrsh7th/nvim-cmp",
		version = false,
		event = "InsertEnter",
		dependencies = {
			"hrsh7th/cmp-nvim-lsp",
			"hrsh7th/cmp-buffer",
			"hrsh7th/cmp-path",
			{
				"garymjr/nvim-snippets",
				opts = {
					friendly_snippets = true,
				},
				dependencies = {
					"rafamadriz/friendly-snippets",
				},
			},
		},
		opts = function()
			local cmp = require("cmp")
			local defaults = require("cmp.config.default")()
			local auto_select = true

			-- Add cmp LSP capabilities to all servers
			vim.lsp.config("*", {
				capabilities = require("cmp_nvim_lsp").default_capabilities(),
			})

			vim.api.nvim_set_hl(0, "CmpGhostText", { link = "Comment", default = true })

			local kind_icons = {
				Text = "󰉿 ",
				Method = "󰆧 ",
				Function = "󰊕 ",
				Constructor = " ",
				Field = "󰜢 ",
				Variable = "󰀫 ",
				Class = "󰠱 ",
				Interface = " ",
				Module = " ",
				Property = "󰜢 ",
				Unit = "󰑭 ",
				Value = "󰎠 ",
				Enum = " ",
				Keyword = "󰌋 ",
				Snippet = " ",
				Color = "󰏘 ",
				File = "󰈙 ",
				Reference = "󰈇 ",
				Folder = "󰉋 ",
				EnumMember = " ",
				Constant = "󰏿 ",
				Struct = "󰙅 ",
				Event = " ",
				Operator = "󰆕 ",
				TypeParameter = "󰊄 ",
			}

			local function confirm(opts)
				opts = opts or {}
				return cmp.mapping.confirm({
					behavior = opts.behavior or cmp.ConfirmBehavior.Insert,
					select = opts.select or false,
				})
			end

			return {
				completion = {
					completeopt = "menu,menuone,noinsert" .. (auto_select and "" or ",noselect"),
				},

				preselect = auto_select and cmp.PreselectMode.Item or cmp.PreselectMode.None,

				snippet = {
					expand = function(args)
						vim.snippet.expand(args.body)
					end,
				},

				mapping = cmp.mapping.preset.insert({
					["<C-b>"] = cmp.mapping.scroll_docs(-4),
					["<C-f>"] = cmp.mapping.scroll_docs(4),
					["<C-n>"] = cmp.mapping.select_next_item({ behavior = cmp.SelectBehavior.Insert }),
					["<C-p>"] = cmp.mapping.select_prev_item({ behavior = cmp.SelectBehavior.Insert }),
					["<C-Space>"] = cmp.mapping.complete(),

					["<CR>"] = confirm({ select = auto_select }),
					["<C-y>"] = confirm({ select = true }),
					["<S-CR>"] = confirm({
						behavior = cmp.ConfirmBehavior.Replace,
						select = auto_select,
					}),

					["<C-CR>"] = function(fallback)
						cmp.abort()
						fallback()
					end,

					["<Tab>"] = function(fallback)
						local ok, suggestion = pcall(require, "supermaven-nvim.completion_preview")
						if ok and suggestion.has_suggestion() then
							suggestion.on_accept_suggestion()
							return
						end

						if cmp.visible() then
							cmp.select_next_item()
						else
							fallback()
						end
					end,

					["<S-Tab>"] = function(fallback)
						if cmp.visible() then
							cmp.select_prev_item()
						else
							fallback()
						end
					end,
				}),

				sources = cmp.config.sources({
					{ name = "lazydev" },
					{ name = "nvim_lsp" },
					{ name = "path" },
					{ name = "snippets" },
				}, {
					{ name = "buffer" },
				}),

				formatting = {
					format = function(entry, item)
						if kind_icons[item.kind] then
							item.kind = kind_icons[item.kind] .. item.kind
						end

						local widths = {
							abbr = vim.g.cmp_widths and vim.g.cmp_widths.abbr or 40,
							menu = vim.g.cmp_widths and vim.g.cmp_widths.menu or 30,
						}

						for key, width in pairs(widths) do
							if item[key] and vim.fn.strdisplaywidth(item[key]) > width then
								item[key] = vim.fn.strcharpart(item[key], 0, width - 1) .. "…"
							end
						end

						return item
					end,
				},

				experimental = {
					ghost_text = vim.g.ai_cmp and {
						hl_group = "CmpGhostText",
					} or false,
				},

				sorting = defaults.sorting,
			}
		end,
		config = function(_, opts)
			require("cmp").setup(opts)
		end,
	},

	{
		"garymjr/nvim-snippets",
		opts = {
			friendly_snippets = true,
		},
		dependencies = {
			"rafamadriz/friendly-snippets",
		},
	},

	{ "rafamadriz/friendly-snippets" },
}
