local mappings = {
	add = "gsa",
	delete = "gsd",
	find = "gsf",
	find_left = "gsF",
	highlight = "gsh",
	replace = "gsr",
	update_n_lines = "gsn",
}

return {
	"nvim-mini/mini.surround",
	keys = {
		{ mappings.add, desc = "Add Surrounding", mode = { "n", "x" } },
		{ mappings.delete, desc = "Delete Surrounding" },
		{ mappings.find, desc = "Find Right Surrounding" },
		{ mappings.find_left, desc = "Find Left Surrounding" },
		{ mappings.highlight, desc = "Highlight Surrounding" },
		{ mappings.replace, desc = "Replace Surrounding" },
		{ mappings.update_n_lines, desc = "Update n_lines" },
	},
	opts = {
		mappings = mappings,
	},
}
