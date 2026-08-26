---@module "conform"
local utils = require("utils.conform")

local M = {}

local function escape_pattern(text)
	return text:gsub("([^%w])", "%%%1")
end

---@param html string
---@return string[]|nil tag_starts
local function extract_start_tags(html)
	local bufnr = vim.api.nvim_create_buf(false, true)

	local lines = vim.split(html, "\n")
	vim.api.nvim_buf_set_lines(bufnr, 0, -1, false, lines)

	local root = utils.get_root(bufnr, "html")
	if root == nil then
		vim.notify("Error: no root found", vim.log.levels.ERROR)
		return nil
	end

	local query = vim.treesitter.query.parse(
		"html",
		[[
      (start_tag) @start.tag
    ]]
	)

	---@type string[]
	local formatted_tag_starts = {}

	for _, node in query:iter_captures(root, bufnr) do
		local node_text = vim.treesitter.get_node_text(node, bufnr)
		table.insert(formatted_tag_starts, node_text)
	end

	vim.api.nvim_buf_delete(bufnr, { force = true })

	return formatted_tag_starts
end

---@param filename string
---@param text string
---@return string
local function run_prettierd(filename, text)
	-- Make sure prettierd is executed inside the templ project directory
	local project_root = vim.fs.root(filename, { "package.json", "node_modules" })

	local stdin_filepath = filename:gsub("%.templ$", ".html")

	local out = vim.system(
		{ "prettierd", "--stdin-filepath", stdin_filepath },
		{ stdin = text, text = true, cwd = project_root }
	)
		:wait()

	if out.code ~= 0 then
		vim.notify("Failed to run prettierd: " .. vim.inspect(out), vim.log.levels.ERROR)
		return text
	end

	local stdout = out.stdout
	if stdout ~= nil then
		text = stdout
	end

	return text
end

---@param ctx conform.Context
---@return string
function M.format_start_tags(ctx)
	local lines = vim.api.nvim_buf_get_lines(ctx.buf, 0, -1, false)
	local text = table.concat(lines, "\n")

	local root = utils.get_root(ctx.buf, "templ")
	if root == nil then
		vim.notify("Error: no root found", vim.log.levels.ERROR)
		return text
	end

	local query = vim.treesitter.query.parse(
		"templ",
		[[
      (element (tag_start) @tag.start)
    ]]
	)

	---@type PrettierdTemplCapture[]
	local captures = {}

	for _, node in query:iter_captures(root, ctx.buf) do
		local _, _, start_byte, _, _, end_byte = node:range(true)
		local node_text = vim.treesitter.get_node_text(node, ctx.buf)

		---@type PrettierdTemplCapture
		local capture = {
			start_byte = start_byte,
			end_byte = end_byte,
			tag_end = "",
			text = node_text,
			formatted_start_tag = "",
			attr_expr = {},
		}

		for child, _ in node:iter_children() do
			if node:type() == "tag_start" and child:type() == "element_identifier" then
				local element_identifier = vim.treesitter.get_node_text(child, ctx.buf)
				capture.tag_end = "</" .. element_identifier .. ">"
			end
		end

		-- Replace templ expression attributes with valid placeholder HTML attributes.
		-- Example:
		--   href={ templ.SafeURL(props.Href) }
		-- becomes:
		--   href="__TEMPL_ATTR_EXPR_123_1__"
		local expr_index = 0

		local has_templ_syntax = capture.text:match("%f[%w]if%f[%W]")
			or capture.text:match("%f[%w]for%f[%W]")
			or capture.text:match("%?")
			or capture.text:match("=%s*{")

		if not has_templ_syntax then
			table.insert(captures, capture)
		end
	end

	-- Create the HTML to be formatted by concatenating all the captured elements

	---@type string[]
	local elements = {}

	for _, capture in ipairs(captures) do
		local element = capture.text .. capture.tag_end
		table.insert(elements, element)
	end

	local html = table.concat(elements, "\n")

	local formatted_html = run_prettierd(ctx.filename, html)

	local formatted_start_tags = extract_start_tags(formatted_html)
	if formatted_start_tags == nil then
		vim.notify("Error: failed to extract start tags", vim.log.levels.ERROR)
		return text
	end

	if #formatted_start_tags ~= #captures then
		vim.notify(
			"Error: number of formatted start tags does not match number of templ captures",
			vim.log.levels.ERROR
		)
		return text
	end

	for i, formatted_start_tag in ipairs(formatted_start_tags) do
		captures[i].formatted_start_tag = formatted_start_tag
	end

	-- Replace the original start tags in reverse order to avoid messing up byte positions
	for i = #captures, 1, -1 do
		local capture = captures[i]

		local formatted_start_tag = capture.formatted_start_tag

		-- Re-insert the original attribute expressions
		-- for _, attr_expr in ipairs(capture.attr_expr) do
		-- 	local attr_name = escape_pattern(attr_expr.attr_name)
		-- 	local key = escape_pattern(attr_expr.key)
		--
		-- 	formatted_start_tag = formatted_start_tag:gsub(
		-- 		"(%s+)" .. attr_name .. '%s*=%s*"' .. key .. '"',
		-- 		function(prefix)
		-- 			return prefix .. attr_expr.templ_attr
		-- 		end
		-- 	)
		--
		-- 	formatted_start_tag = formatted_start_tag:gsub(
		-- 		"(%s+)" .. attr_name .. "%s*=%s*'" .. key .. "'",
		-- 		function(prefix)
		-- 			return prefix .. attr_expr.templ_attr
		-- 		end
		-- 	)
		-- end

		local before = text:sub(1, capture.start_byte)
		local after = text:sub(capture.end_byte + 1, -1)
		text = before .. formatted_start_tag .. after
	end

	return text
end

return M

---@alias PrettierdTemplCapture.AttrExpr { attr_name: string, key: string, templ_attr: string }

---@class PrettierdTemplCapture
---@field start_byte integer
---@field end_byte integer
---@field tag_end string
---@field text string
---@field formatted_start_tag string
---@field attr_expr table[]
