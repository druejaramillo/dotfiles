return {
	{
		"A-raj468/pomo.nvim",
		branch = "fix-issue-31",
		dependencies = {
			"rcarriga/nvim-notify",
		},
		opts = {
			notifiers = {
				{
					name = "Default",
					opts = {
						sticky = false,
					},
				},
			},
			sessions = {
				pomodoro = {
					{ name = "Work", duration = "25m" },
					{ name = "Break", duration = "5m" },
				},
				shallow = {
					{ name = "Shallow Work", duration = "25m" },
					{ name = "Short Break", duration = "5m" },
					{ name = "Shallow Work", duration = "25m" },
					{ name = "Short Break", duration = "5m" },
					{ name = "Shallow Work", duration = "25m" },
					{ name = "Long Break", duration = "15m" },
				},
				deep = {
					{ name = "Deep Work", duration = "90m" },
					{ name = "Long Break", duration = "20m" },
				},
			},
		},
		config = function(_, opts)
			require("pomo").setup(opts)

			require("telescope").load_extension("pomodori")

			vim.keymap.set("n", "<leader>pt", function()
				require("telescope").extensions.pomodori.timers()
			end, { desc = "Manage Pomodori Timers" })

			vim.keymap.set("n", "<leader>po", "<cmd>TimerSession pomodoro<CR>", { desc = "Start Pomodoro" })

			vim.keymap.set("n", "<leader>ps", "<cmd>TimerSession shallow<CR>", { desc = "Start Shallow Work" })

			vim.keymap.set("n", "<leader>pd", "<cmd>TimerSession deep<CR>", { desc = "Start Deep Work" })

			vim.keymap.set("n", "<leader>pp", "<cmd>TimerPause<CR>", { desc = "Pause Latest Timer" })

			vim.keymap.set("n", "<leader>pr", "<cmd>TimerResume<CR>", { desc = "Resume Latest Timer" })

			vim.keymap.set("n", "<leader>px", "<cmd>TimerStop<CR>", { desc = "Stop Latest Timer" })
		end,
	},
	{
		"folke/which-key.nvim",
		opts = {
			spec = {
				{
					mode = { "n" },
					{
						"<leader>p",
						group = "Pomodoro",
						icon = "⏳",
					},
				},
			},
		},
	},
}
