-- change title when CWD changes
vim.api.nvim_create_autocmd("DirChanged", {
	callback = function()
		vim.opt.titlestring = "Neovim | " .. vim.fs.basename(vim.fn.getcwd())
	end,
})

local function augroup(name)
	return vim.api.nvim_create_augroup("lazyvim_" .. name, { clear = true })
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

-- go to last loc when opening a buffer
vim.api.nvim_create_autocmd("BufReadPost", {
	group = augroup("last_loc"),
	callback = function(event)
		local exclude = { "gitcommit" }
		local buf = event.buf
		if vim.tbl_contains(exclude, vim.bo[buf].filetype) or vim.b[buf].lazyvim_last_loc then
			return
		end
		vim.b[buf].lazyvim_last_loc = true
		local mark = vim.api.nvim_buf_get_mark(buf, '"')
		local lcount = vim.api.nvim_buf_line_count(buf)
		if mark[1] > 0 and mark[1] <= lcount then
			pcall(vim.api.nvim_win_set_cursor, 0, mark)
		end
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

-- change cwd to root dir when vim is opened
vim.api.nvim_create_autocmd("VimEnter", {
	callback = function()
		local arg = vim.fn.argv(0)
		if vim.fn.isdirectory(arg) == 1 then
			vim.cmd("cd " .. arg)
		end
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

-- go back to dashboard after closing all buffers
vim.api.nvim_create_autocmd("BufDelete", {
	group = vim.api.nvim_create_augroup("bufdelpost_autocmd", {}),
	desc = "BufDeletePost User autocmd",
	callback = function()
		vim.schedule(function()
			vim.api.nvim_exec_autocmds("User", {
				pattern = "BufDeletePost",
			})
		end)
	end,
})

vim.api.nvim_create_autocmd("User", {
	pattern = "BufDeletePost",
	group = vim.api.nvim_create_augroup("dashboard_delete_buffers", {}),
	desc = "Open Dashboard when no available buffers",
	callback = function(ev)
		local deleted_name = vim.api.nvim_buf_get_name(ev.buf)
		local deleted_ft = vim.api.nvim_get_option_value("filetype", { buf = ev.buf })
		local deleted_bt = vim.api.nvim_get_option_value("buftype", { buf = ev.buf })
		local dashboard_on_empty = deleted_name == "" and deleted_ft == "" and deleted_bt == ""

		if dashboard_on_empty then
			Snacks.dashboard.open()
		end
	end,
})
