return {
	"XXiaoA/atone.nvim",
	cmd = "Atone",
	---@module "atone"
	---@type AtoneConfig
	opts = {},
	keys = {
		{ "<leader>fu", "<cmd>Atone toggle<cr>", desc = "Toggle undo tree" },
	},
}
