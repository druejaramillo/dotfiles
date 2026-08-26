---@module "conform"
local utils = require("utils.conform")

local M = {}

---@param filename string
---@param text string
---@return string formatted_text
local function run_prettierd(filename, text)
	-- Make sure prettierd is executed inside the project directory
	local project_root = vim.fs.root(filename, { "package.json", "node_modules" })

	local stdin_filepath = filename:gsub("%.go$", ".html")

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

---@param html string
---@return string[]|nil tag_starts
local function extract_classes(html)
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
      (element
        (start_tag
          (attribute
            (attribute_name) @name (#eq? @name "class")
            (quoted_attribute_value
              (attribute_value) @class
            )
          )
        )
      )
    ]]
	)

	---@type string[]
	local formatted_classes = {}

	for _, node in query:iter_captures(root, bufnr) do
		if node:type() == "attribute_value" then
			local node_text = vim.treesitter.get_node_text(node, bufnr)
			table.insert(formatted_classes, node_text)
		end
	end

	vim.api.nvim_buf_delete(bufnr, { force = true })

	return formatted_classes
end

---@param ctx conform.Context
---@return string formatted_text
function M.format_classes(ctx)
	local lines = vim.api.nvim_buf_get_lines(ctx.buf, 0, -1, false)
	local text = table.concat(lines, "\n")

	local root = utils.get_root(ctx.buf, "go")
	if root == nil then
		vim.notify("Error: no root found", vim.log.levels.ERROR)
		return text
	end

	local query = vim.treesitter.query.parse(
		"go",
		[[
      (call_expression
        function:
          (selector_expression
            field: (field_identifier) @identifier
              (#any-of? @identifier "Class" "IfClass")
        )
        arguments:
          (argument_list
            (interpreted_string_literal
              (interpreted_string_literal_content) @content
            )
        )
      )
    ]]
	)

	---@type PrettierdGostarCapture[]
	local captures = {}

	for _, node in query:iter_captures(root, ctx.buf) do
		if node:type() == "interpreted_string_literal_content" then
			local _, _, start_byte, _, _, end_byte = node:range(true)
			local node_text = vim.treesitter.get_node_text(node, ctx.buf)

			---@type PrettierdGostarCapture
			local capture = {
				start_byte = start_byte,
				end_byte = end_byte,
				class = node_text,
				formatted_class = "",
			}

			table.insert(captures, capture)
		end
	end

	-- Create the HTML to be formatted by concatenating all the captured elements

	---@type string[]
	local elements = {}

	for _, capture in ipairs(captures) do
		local element = '<div class="' .. capture.class .. '"></div>'
		table.insert(elements, element)
	end

	local html = table.concat(elements, "\n")

	local formatted_html = run_prettierd(ctx.filename, html)

	local formatted_classes = extract_classes(formatted_html)
	if formatted_classes == nil then
		vim.notify("Error: failed to extract classes", vim.log.levels.ERROR)
		return text
	end

	if #formatted_classes ~= #captures then
		vim.notify("Error: number of formatted classes does not match number of go captures", vim.log.levels.ERROR)
		return text
	end

	for i, formatted_class in ipairs(formatted_classes) do
		captures[i].formatted_class = formatted_class
	end

	-- Replace the original start tags in reverse order to avoid messing up byte positions
	for i = #captures, 1, -1 do
		local capture = captures[i]

		local formatted_class = capture.formatted_class

		local before = text:sub(1, capture.start_byte)
		local after = text:sub(capture.end_byte + 1, -1)
		text = before .. formatted_class .. after
	end

	return text
end

return M

---@class PrettierdGostarCapture
---@field start_byte integer
---@field end_byte integer
---@field class string
---@field formatted_class string
