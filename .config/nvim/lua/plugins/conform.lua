return {
	"stevearc/conform.nvim",
	event = { "BufWritePre" },
	cmd = { "ConformInfo" },
	keys = {
		{
			"<leader>cf",
			function()
				require("conform").format({ async = true, lsp_format = "fallback" })
			end,
			mode = "",
			desc = "[F]ormat buffer",
		},
		{
			"<leader>cF",
			function()
				require("conform").format({ formatters = { "injected" }, timeout_ms = 3000 })
			end,
			mode = { "n", "x" },
			desc = "Format Injected Langs",
		},
	},
	init = function()
		vim.o.formatexpr = "v:lua.require'conform'.formatexpr()"
	end,
	---@type conform.setupOpts
	opts = {
		notify_on_error = false,
		format_on_save = function(bufnr)
			---@type string[]
			local ignored_filetypes = { "templ", "go" }
			if vim.tbl_contains(ignored_filetypes, vim.bo[bufnr].filetype) then
				return nil
			else
				---@type conform.FormatOpts
				return {
					timeout_ms = 500,
					lsp_format = "fallback",
				}
			end
		end,
		formatters_by_ft = {
			astro = { "prettierd", "prettier", stop_after_first = true },
			css = { "prettierd", "prettier", stop_after_first = true },
			go = { "gofumpt", "goimports" },
			html = { "prettierd", "prettier", stop_after_first = true },
			javascript = { "prettierd", "prettier", stop_after_first = true },
			javascriptreact = { "prettierd", "prettier", stop_after_first = true },
			json = { "prettierd", "prettier", stop_after_first = true },
			lua = { "stylua" },
			python = { "isort", "black" },
			sh = { "shfmt" },
			sql = { "sqlfluff" },
			templ = { "templ" },
			typescript = { "prettierd", "prettier", stop_after_first = true },
			typescriptreact = { "prettierd", "prettier", stop_after_first = true },
			yaml = { "prettierd", "prettier", stop_after_first = true },
			markdown = { "mdformat" },
			xml = { "xmlformatter" },
			docker = { "dockerfmt" },
			fish = { "fish_indent" },
		},
		formatters = {
			injected = { options = { ignore_errors = true } },
			black = {
				prepend_args = { "--fast", "--line-length", "100" },
			},
			shfmt = {
				append_args = { "-i", "2" },
			},
			mdformat = {
				append_args = { "--number" },
			},
			sqlfluff = {
				command = "sqlfluff",
				args = { "fix", "--dialect", "postgres", "-f", "--FIX-EVEN-UNPARSABLE", "-" },
				stdin = true,
			},
		},
	},
	---@param opts conform.setupOpts
	config = function(_, opts)
		local conform = require("conform")
		conform.setup(opts)

		local templ_group = vim.api.nvim_create_augroup("ConformPrettierTempl", { clear = true })

		vim.api.nvim_create_autocmd("BufWritePre", {
			group = templ_group,
			pattern = "*.templ",
			callback = function(args)
				local bufnr = args.buf
				local filename = vim.api.nvim_buf_get_name(bufnr)

				local errors = vim.diagnostic.get(bufnr, { severity = vim.diagnostic.severity.ERROR })

				if #errors == 0 then
					local prettierd_templ = require("utils.conform.prettier_templ")

					local formatted = prettierd_templ.format_start_tags({
						buf = bufnr,
						filename = filename,
					})

					vim.api.nvim_buf_set_lines(bufnr, 0, -1, false, vim.split(formatted, "\n", { plain = true }))
				end

				local text = table.concat(vim.api.nvim_buf_get_lines(bufnr, 0, -1, false), "\n")

				local out = vim.system({ "templ", "fmt" }, {
					stdin = text,
					text = true,
					cwd = vim.fs.root(filename, { "go.work", "go.mod", ".git" }) or vim.fn.getcwd(),
				}):wait()

				if out.code ~= 0 then
					vim.notify("templ fmt failed: " .. vim.inspect(out), vim.log.levels.ERROR)
					return
				end

				vim.api.nvim_buf_set_lines(bufnr, 0, -1, false, vim.split(out.stdout or text, "\n", { plain = true }))
			end,
		})

		conform.formatters.prettierd_speckles = {
			format = function(_, ctx, _, callback)
				local errors = vim.diagnostic.get(ctx.buf, { severity = vim.diagnostic.severity.ERROR })
				if #errors > 0 then
					vim.notify("Conform: prettier_speckles formatting skipped due to LSP errors", vim.log.levels.WARN)
				else
					local prettied_gostar = require("utils.conform.prettierd_speckles")
					local formatted = prettied_gostar.format_classes(ctx)
					local formatted_lines = vim.split(formatted, "\n")
					vim.api.nvim_buf_set_lines(ctx.buf, 0, -1, false, formatted_lines)
				end

				conform.format({
					bufnr = ctx.buf,
					formatters = { "gofumpt", "goimports" },
					lsp_format = "never",
					async = false,
				})

				if callback then
					callback(nil, nil)
				end
			end,
		}

		vim.api.nvim_create_autocmd("BufWritePre", {
			group = vim.api.nvim_create_augroup("ConformPrettierGostar", { clear = true }),
			pattern = "*.go",
			callback = function(args)
				conform.format({
					bufnr = args.buf,
					formatters = { "prettierd_speckles" },
					lsp_format = "never",
					async = false,
					timeout_ms = 10000,
				})
			end,
		})
	end,
}
