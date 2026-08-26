local M = {}

---@param bufnr integer
---@param lang string
---@return TSNode|nil
function M.get_root(bufnr, lang)
	-- Parse with treesitter
	local parser = vim.treesitter.get_parser(bufnr, lang)
	if parser == nil then
		vim.notify("Error: no parser found for " .. lang, vim.log.levels.ERROR)
		return nil
	end

	local trees = parser:parse()
	if trees == nil then
		vim.notify("Error: no trees found for " .. lang .. "parser", vim.log.levels.ERROR)
		return nil
	end

	return trees[1]:root()
end

return M
