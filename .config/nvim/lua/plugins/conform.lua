return {
  "stevearc/conform.nvim",
  dependencies = { "mason.nvim" },
  lazy = true,
  cmd = "ConformInfo",
  keys = {
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
  opts = {
      default_format_opts = {
        timeout_ms = 3000,
        async = false, -- not recommended to change
        quiet = false, -- not recommended to change
        lsp_format = "fallback", -- not recommended to change
      },
      formatters_by_ft = {
        lua = { "stylua" },
        fish = { "fish_indent" },
        sh = { "shfmt" },
        python = { "isort", "black" },
        javascript = { "prettierd", "prettier", stop_after_first = true },
        go = { "goimports", "gofmt" },
        docker = { "dockerfmt" },
        json = { "fixjson" },
        markdown = { "mdformat" },
        sql = { "sqlfluff" },
        templ = { "templ" },
        xml = { "xmlformatter" },
        yaml = { "yamlfmt" },
      },
      ---@type table<string, conform.FormatterConfigOverride|fun(bufnr: integer): nil|conform.FormatterConfigOverride>
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
      format_on_save = { timeout_ms = 3000 },
    }
}
