-- display CWD in title
vim.opt.title = true
vim.opt.titlestring = "Neovim | " .. vim.fs.basename(vim.fn.getcwd())

-- set <leader>
vim.g.mapleader = " "
-- set <localleader>
vim.g.maplocalleader = "\\"

-- enable auto write
vim.opt.autowrite = true

-- sync with system clipboard
-- only when not in ssh (so OSC52 works remotely)
vim.opt.clipboard = vim.env.SSH_CONNECTION and "" or "unnamedplus"

-- show completion menu + even for single match + don't auto-select items
vim.opt.completeopt = "menu,menuone,noselect"

-- hide markup
vim.opt.conceallevel = 2

-- prompt before closing unsaved changes
vim.opt.confirm = true

-- highlight current line
vim.opt.cursorline = true

-- icons
vim.opt.fillchars = {
	foldopen = "", -- open folds
	foldclose = "", -- closed folds
	fold = " ", -- fold filler
	foldsep = " ", -- fold separator
	diff = "╱", -- diff filler
	eob = " ", -- hide ~ at end of buffer
}

-- start with all folds open
vim.opt.foldlevel = 99
-- use indentation for folding
vim.opt.foldmethod = "indent"
-- use default fold text
vim.opt.foldtext = ""

-- formatting rules
-- j: remove comment leader when joining lines
-- c: auto-wrap comments
-- r: continue comments on Enter
-- o: continue comments with o/O
-- q: allow formating with gq
-- l: long lines not broken in insert mode
-- n: recognize numbered lists
vim.opt.formatoptions = "jcroqlnt"

-- format for grep results (file:line:col:message)
vim.opt.grepformat = "%f:%l:%c:%m"
-- use ripgrep for searching
vim.opt.grepprg = "rg --vimgrep"

-- case-insensitive search by default
vim.opt.ignorecase = true
-- live preview of substitutions
vim.opt.inccommand = "nosplit"
-- preserve view when jumping
vim.opt.jumpoptions = "view"
-- case-sensitive if search includes uppercase
vim.opt.smartcase = true

-- global status line (single for all windows)
vim.opt.laststatus = 3

-- enable mouse support in all modes
vim.opt.mouse = "a"

-- transparency for popup menu
vim.opt.pumblend = 10
-- max items in completion menu
vim.opt.pumheight = 10

-- disable default ruler (status line replaces it)
vim.opt.ruler = false

-- what gets saved in sessions
vim.opt.sessionoptions = {
	"buffers",
	"curdir",
	"tabpages",
	"winsize",
	"help",
	"globals",
	"skiprtp",
	"folds",
}

-- reduce command-line messages
-- W: no "written" message
-- I: no intro message
-- c: no completion messages
-- C: no scan messages
vim.opt.shortmess:append({ W = true, I = true, c = true, C = true })

-- don't show mode (handled by status line)
vim.opt.showmode = false

-- smooth scrolling
vim.opt.smoothscroll = true

-- set spellcheck lang to english
vim.opt.spelllang = { "en" }

-- horizontal splits go below
vim.opt.splitbelow = true
-- keep screen stable when splitting
vim.opt.splitkeep = "screen"
-- vertical splits go right
vim.opt.splitright = true

-- time (ms) to wait for mapped sequence
-- shorter -> faster keybinding response (which-key)
vim.opt.timeoutlen = 300

-- command-line completion behavior
-- longest: complete to longest common match
-- full: cycle through matches
vim.opt.wildmode = "longest:full,full"

-- minimum window match
vim.opt.winminwidth = 5

-- absolute line numbers
vim.opt.nu = true
-- relative line numbers
vim.opt.relativenumber = true

-- tab size
vim.opt.tabstop = 4
-- tab size in insert mode
vim.opt.softtabstop = 4
-- auto indent size
vim.opt.shiftwidth = 4
-- convert tabs to spaces
vim.opt.expandtab = true

-- enable auto indent for new lines
vim.opt.smartindent = true

-- disable line wrapping
vim.opt.wrap = false

-- disable swap files
vim.opt.swapfile = false
-- disable backup files
vim.opt.backup = false
-- where to store undo history
vim.opt.undodir = os.getenv("HOME") .. "/.vim/undodir"
-- enable undo history
vim.opt.undofile = true
-- max undo steps stored
vim.opt.undolevels = 10000

-- disable persistent search highlighting
vim.opt.hlsearch = false
-- show search matches incrementally while typing
vim.opt.incsearch = true

-- enable true color support in terminal
vim.opt.termguicolors = true

-- keep 10 lines visible above/below cursor while scrolling
vim.opt.scrolloff = 10
-- keep 10 columns visible left/right of cursor while side scrolling
vim.opt.sidescrolloff = 10
-- always show sign column
vim.opt.signcolumn = "yes"

-- show vertical line at column 100
vim.opt.colorcolumn = "100"

-- enable snacks.nvim UI animations
vim.g.snacks_animate = true

-- use ai completion source when available & supported
vim.g.ai_cmp = true

-- show current document symbols location from Trouble in lualine
vim.g.trouble_lualine = true

-- add .templ filetype
vim.filetype.add({ extension = { templ = "templ" } })

vim.opt.winbar = "%=%m %f"

-- disable default markdown indentation rules
vim.g.markdown_recommended_style = 0
