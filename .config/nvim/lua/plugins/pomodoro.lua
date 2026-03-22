return {
	{
		"A-raj468/pomo.nvim",
		branch = "fix-issue-31",
		lazy = true,
		cmd = { "TimerStart", "TimerRepeat", "TimerSession" },
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
