return {
    "neovim/nvim-lspconfig",
    event = { "BufReadPre", "BufNewFile" },
    dependencies = {
        "mason.nvim",
        { "mason-org/mason-lspconfig.nvim", config = true },
        "folke/snacks.nvim",
    },

    opts = function()
        local icons = {
            Error = " ",
            Warn = " ",
            Hint = " ",
            Info = " ",
        }

        local function source_action()
            vim.lsp.buf.code_action({
                context = {
                    only = { "source" },
                    diagnostics = {},
                },
            })
        end

        local function organize_imports()
            vim.lsp.buf.code_action({
                apply = true,
                context = {
                    only = { "source.organizeImports" },
                    diagnostics = {},
                },
            })
        end

        return {
            diagnostics = {
                underline = true,
                update_in_insert = false,
                virtual_text = {
                    spacing = 4,
                    source = "if_many",
                    prefix = "●",
                },
                severity_sort = true,
                signs = {
                    text = {
                        [vim.diagnostic.severity.ERROR] = icons.Error,
                        [vim.diagnostic.severity.WARN] = icons.Warn,
                        [vim.diagnostic.severity.HINT] = icons.Hint,
                        [vim.diagnostic.severity.INFO] = icons.Info,
                    },
                },
            },

            inlay_hints = {
                enabled = true,
                exclude = { "vue" },
            },

            codelens = {
                enabled = false,
            },

            folds = {
                enabled = true,
            },

            format = {
                formatting_options = nil,
                timeout_ms = nil,
            },

            keys = {
                {
                    "<leader>cl",
                    function()
                        vim.cmd("LspInfo")
                    end,
                    desc = "Lsp Info",
                },
                { "gd", vim.lsp.buf.definition,      desc = "Goto Definition" },
                { "gr", vim.lsp.buf.references,      desc = "References" },
                { "gI", vim.lsp.buf.implementation,  desc = "Goto Implementation" },
                { "gy", vim.lsp.buf.type_definition, desc = "Goto Type Definition" },
                { "gD", vim.lsp.buf.declaration,     desc = "Goto Declaration" },
                { "K",  vim.lsp.buf.hover,           desc = "Hover" },
                { "gK", vim.lsp.buf.signature_help,  desc = "Signature Help" },
                {
                    "<C-k>",
                    vim.lsp.buf.signature_help,
                    mode = "i",
                    desc = "Signature Help",
                },
                {
                    "<leader>ca",
                    vim.lsp.buf.code_action,
                    mode = { "n", "x" },
                    desc = "Code Action",
                },
                {
                    "<leader>cc",
                    vim.lsp.codelens.run,
                    mode = { "n", "x" },
                    desc = "Run Codelens",
                },
                {
                    "<leader>cC",
                    vim.lsp.codelens.refresh,
                    desc = "Refresh Codelens",
                },
                {
                    "<leader>cR",
                    function()
                        Snacks.rename.rename_file()
                    end,
                    desc = "Rename File",
                },
                { "<leader>cr", vim.lsp.buf.rename, desc = "Rename Symbol" },
                { "<leader>cA", source_action,      desc = "Source Action" },
                {
                    "]]",
                    function()
                        Snacks.words.jump(vim.v.count1)
                    end,
                    desc = "Next Reference",
                },
                {
                    "[[",
                    function()
                        Snacks.words.jump(-vim.v.count1)
                    end,
                    desc = "Prev Reference",
                },
                {
                    "<A-n>",
                    function()
                        Snacks.words.jump(vim.v.count1, true)
                    end,
                    desc = "Next Reference",
                },
                {
                    "<A-p>",
                    function()
                        Snacks.words.jump(-vim.v.count1, true)
                    end,
                    desc = "Prev Reference",
                },
                {
                    "<leader>co",
                    organize_imports,
                    desc = "Organize Imports",
                },
            },

            servers = {
                ["*"] = {
                    capabilities = {
                        workspace = {
                            fileOperations = {
                                didRename = true,
                                willRename = true,
                            },
                        },
                    },
                },

                lua_ls = {
                    settings = {
                        Lua = {
                            workspace = {
                                checkThirdParty = false,
                            },
                            codeLens = {
                                enable = true,
                            },
                            completion = {
                                callSnippet = "Replace",
                            },
                            doc = {
                                privateName = { "^_" },
                            },
                            hint = {
                                enable = true,
                                setType = false,
                                paramType = true,
                                paramName = "Disable",
                                semicolon = "Disable",
                                arrayIndex = "Disable",
                            },
                        },
                    },
                },

                basedpyright = {
                    settings = {
                        basedpyright = {
                            analysis = {
                                diagnosticMode = "openFilesOnly",
                            },
                        },
                    },
                },

                templ = {
                    filetypes = { "templ" },
                    settings = {
                        templ = {
                            enable_snippets = true,
                        },
                    },
                },

                gopls = {
                    filetypes = { "go", "gomod", "gowork", "gotmpl", "templ" },
                    settings = {
                        gopls = {
                            analyses = {
                                unusedparams = true,
                            },
                            staticcheck = true,
                            gofumpt = true,
                        },
                    },
                },

                golangci_lint_ls = {
                    mason = false,
                    cmd = { "golangci-lint-langserver" },
                    filetypes = { "go", "gomod" },
                    root_markers = {
                        ".golangci.yml",
                        ".golangci.yaml",
                        ".golangci.toml",
                        ".golangci.json",
                        "go.work",
                        "go.mod",
                        ".git",
                    },
                    init_options = {
                        command = {
                            "golangci-lint",
                            "run",
                            "--output.text.path=",
                            "--output.tab.path=",
                            "--output.html.path=",
                            "--output.checkstyle.path=",
                            "--output.junit-xml.path=",
                            "--output.teamcity.path=",
                            "--output.sarif.path=",
                            "--show-stats=false",
                            "--output.json.path=stdout",
                        },
                    },
                },
            },

            setup = {},
        }
    end,

    config = function(_, opts)
        vim.diagnostic.config(vim.deepcopy(opts.diagnostics))

        if opts.folds and opts.folds.enabled then
            pcall(function()
                vim.opt.foldexpr = "v:lua.vim.lsp.foldexpr()"
            end)
        end

        local function has_method(client, method)
            return client and client.supports_method and client:supports_method(method)
        end

        local function buf_has_method(bufnr, method)
            for _, client in ipairs(vim.lsp.get_clients({ bufnr = bufnr })) do
                if has_method(client, method) then
                    return true
                end
            end
            return false
        end

        local group = vim.api.nvim_create_augroup("user_lsp_attach_keymaps", { clear = true })

        vim.api.nvim_create_autocmd("LspAttach", {
            group = group,
            callback = function(args)
                local bufnr = args.buf
                local client = vim.lsp.get_client_by_id(args.data.client_id)
                if not client then
                    return
                end

                local global_keys = opts.keys or {}
                local server_keys = ((opts.servers or {})[client.name] or {}).keys or {}
                local keys = vim.list_extend(vim.deepcopy(global_keys), vim.deepcopy(server_keys))

                for _, key in ipairs(keys) do
                    local lhs = key[1]
                    local rhs = key[2]
                    local mode = key.mode or "n"

                    local enabled = true
                    if type(key.enabled) == "function" then
                        enabled = key.enabled(bufnr)
                    elseif key.enabled ~= nil then
                        enabled = key.enabled
                    end

                    if enabled and key.has then
                        if type(key.has) == "string" then
                            enabled = buf_has_method(bufnr, key.has)
                        elseif type(key.has) == "table" then
                            enabled = vim.iter(key.has):all(function(method)
                                return buf_has_method(bufnr, method)
                            end)
                        end
                    end

                    if enabled then
                        vim.keymap.set(mode, lhs, rhs, {
                            buffer = bufnr,
                            desc = key.desc,
                            silent = key.silent ~= false,
                            nowait = key.nowait,
                        })
                    end
                end

                if
                    opts.inlay_hints
                    and opts.inlay_hints.enabled
                    and client:supports_method("textDocument/inlayHint")
                    and not vim.tbl_contains(opts.inlay_hints.exclude or {}, vim.bo[bufnr].filetype)
                then
                    vim.lsp.inlay_hint.enable(true, { bufnr = bufnr })
                end

                if opts.codelens and opts.codelens.enabled and client:supports_method("textDocument/codeLens") then
                    vim.lsp.codelens.refresh()
                    vim.api.nvim_create_autocmd({ "BufEnter", "CursorHold", "InsertLeave" }, {
                        buffer = bufnr,
                        callback = vim.lsp.codelens.refresh,
                    })
                end
            end,
        })

        if opts.servers and opts.servers["*"] then
            vim.lsp.config("*", vim.deepcopy(opts.servers["*"]))
        end

        for server, server_opts in pairs(opts.servers or {}) do
            if server ~= "*" then
                local sopts = server_opts == true and {} or vim.deepcopy(server_opts)

                local enabled = sopts.enabled ~= false
                sopts.enabled = nil
                sopts.mason = nil
                sopts.keys = nil

                if enabled then
                    vim.lsp.config(server, sopts)
                end
            end
        end

        local ensure_installed = {}

        for name, conf in pairs(opts.servers or {}) do
            conf = conf or {}
            if name ~= "*" and conf.enabled ~= false and conf.mason ~= false then
                table.insert(ensure_installed, name)
            end
        end

        require("mason").setup()
        require("mason-lspconfig").setup({
            ensure_installed = ensure_installed,
            automatic_enable = true,
        })
    end,
}
