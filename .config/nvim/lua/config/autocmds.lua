-- change cwd to root dir when vim is opened
vim.api.nvim_create_autocmd("VimEnter", {
	callback = function()
		local arg = vim.fn.argv(0)
		if vim.fn.isdirectory(arg) == 1 then
			vim.cmd("cd " .. arg)
		end
	end,
})

-- change title when CWD changes
vim.api.nvim_create_autocmd("DirChanged", {
	callback = function()
		vim.opt.titlestring = "Neovim | " .. vim.fs.basename(vim.fn.getcwd())
	end,
})

-- helper function to create custom augroups
local function augroup(name)
	return vim.api.nvim_create_augroup("custom_augroup_" .. name, { clear = true })
end

-- check if we need to reload the file when it changed
vim.api.nvim_create_autocmd({ "FocusGained", "TermClose", "TermLeave" }, {
	group = augroup("checktime"),
	callback = function()
		if vim.o.buftype ~= "nofile" then
			vim.cmd("checktime")
		end
	end,
})

-- highlight on yank
vim.api.nvim_create_autocmd("TextYankPost", {
	group = augroup("highlight_yank"),
	callback = function()
		(vim.hl or vim.highlight).on_yank()
	end,
})

-- resize splits if window got resized
vim.api.nvim_create_autocmd({ "VimResized" }, {
	group = augroup("resize_splits"),
	callback = function()
		local current_tab = vim.fn.tabpagenr()
		vim.cmd("tabdo wincmd =")
		vim.cmd("tabnext " .. current_tab)
	end,
})

-- close some filetypes with <q>
vim.api.nvim_create_autocmd("FileType", {
	group = augroup("close_with_q"),
	pattern = {
		"PlenaryTestPopup",
		"checkhealth",
		"dap-float",
		"dbout",
		"gitsigns-blame",
		"grug-far",
		"help",
		"lspinfo",
		"neotest-output",
		"neotest-output-panel",
		"neotest-summary",
		"notify",
		"qf",
		"spectre_panel",
		"startuptime",
		"tsplayground",
	},
	callback = function(event)
		vim.bo[event.buf].buflisted = false
		vim.schedule(function()
			vim.keymap.set("n", "q", function()
				vim.cmd("close")
				pcall(vim.api.nvim_buf_delete, event.buf, { force = true })
			end, {
				buffer = event.buf,
				silent = true,
				desc = "Quit buffer",
			})
		end)
	end,
})

-- make it easier to close man-files when opened inline
vim.api.nvim_create_autocmd("FileType", {
	group = augroup("man_unlisted"),
	pattern = { "man" },
	callback = function(event)
		vim.bo[event.buf].buflisted = false
	end,
})

-- wrap and check for spell in text filetypes
vim.api.nvim_create_autocmd("FileType", {
	group = augroup("wrap_spell"),
	pattern = { "text", "plaintex", "typst", "gitcommit", "markdown" },
	callback = function()
		vim.opt_local.wrap = true
		vim.opt_local.spell = true
	end,
})

-- fix conceallevel for json files
vim.api.nvim_create_autocmd({ "FileType" }, {
	group = augroup("json_conceal"),
	pattern = { "json", "jsonc", "json5" },
	callback = function()
		vim.opt_local.conceallevel = 0
	end,
})

-- auto create dir when saving a file, in case some intermediate directory does not exist
vim.api.nvim_create_autocmd({ "BufWritePre" }, {
	group = augroup("auto_create_dir"),
	callback = function(event)
		if event.match:match("^%w%w+:[\\/][\\/]") then
			return
		end
		local file = vim.uv.fs_realpath(event.match) or event.match
		vim.fn.mkdir(vim.fn.fnamemodify(file, ":p:h"), "p")
	end,
})

-- set supermaven suggestion text color
vim.api.nvim_create_autocmd({ "ColorScheme", "VimEnter" }, {
	callback = function()
		vim.api.nvim_set_hl(0, "SupermavenSuggestion", { fg = "#a0a0a0", italic = true })
		vim.api.nvim_set_hl(0, "CmpGhostText", { fg = "#a0a0a0", italic = true })
	end,
})

-- disable diagnostics for .env files
local group = vim.api.nvim_create_augroup("__env", { clear = true })

vim.api.nvim_create_autocmd("BufEnter", {
	pattern = ".env",
	group = group,
	callback = function(args)
		vim.diagnostic.enable(false, { bufnr = args.buf })
	end,
})

-- format on save
vim.api.nvim_create_autocmd("BufWritePre", {
	callback = function(args)
		vim.lsp.buf.format({ bufnr = args.buf })
	end,
})

-- go back to dashboard after closin
vim.api.nvim_create_autocmd("BufDelete", {
	group = vim.api.nvim_create_augroup("dashboard_on_empty", { clear = true }),
	desc = "Open Dashboard when no listed buffers remain",
	callback = function()
		vim.schedule(function()
			local real_bufs = vim.tbl_filter(function(b)
				return vim.api.nvim_buf_is_valid(b)
					and vim.bo[b].buflisted
					and vim.bo[b].buftype == ""
					and vim.api.nvim_buf_get_name(b) ~= ""
			end, vim.api.nvim_list_bufs())

			if #real_bufs == 0 then
				local target_win, target_buf
				for _, w in ipairs(vim.api.nvim_list_wins()) do
					local b = vim.api.nvim_win_get_buf(w)
					if
						vim.api.nvim_buf_is_valid(b)
						and vim.bo[b].buftype == ""
						and vim.bo[b].filetype == ""
						and vim.api.nvim_buf_get_name(b) == ""
					then
						target_win = w
						target_buf = b
						break
					end
				end

				if target_win and target_buf then
					Snacks.dashboard.open({ buf = target_buf, win = target_win })
				else
					Snacks.dashboard.open()
				end
			end
		end)
	end,
})
