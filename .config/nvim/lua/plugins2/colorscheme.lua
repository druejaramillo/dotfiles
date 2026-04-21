return {
    "EdenEast/nightfox.nvim",
    lazy = false,
    priority = 1000,
    config = function()
      require("nightfox").setup({
        options = {
          transparent = true,
        },
      })

      vim.cmd("colorscheme carbonfox")

      vim.api.nvim_create_autocmd("ColorScheme", {
        pattern = "*",
        callback = function()
          vim.api.nvim_set_hl(0, "SupermavenSuggestion", {
            fg = "#b6b8bb",
            italic = true,
          })
        end,
      })
    end,
}
