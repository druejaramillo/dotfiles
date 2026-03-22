local function get_pkg_path(pkg, suffix)
	local ok, registry = pcall(require, "mason-registry")
	if not ok then
		return nil
	end

	local ok_pkg, pkg_obj = pcall(registry.get_package, pkg)
	if not ok_pkg or not pkg_obj then
		return nil
	end

	local install_path = pkg_obj.install_path or (pkg_obj.get_install_path and pkg_obj:get_install_path()) or nil

	if not install_path then
		return nil
	end

	return install_path .. (suffix or "")
end

return {
	{
		"nvim-treesitter/nvim-treesitter",
		opts = { ensure_installed = { "svelte" } },
	},

	{
		"neovim/nvim-lspconfig",
		opts = function(_, opts)
			opts.servers = opts.servers or {}
			opts.servers.svelte = opts.servers.svelte or {}
			opts.servers.vtsls = opts.servers.vtsls or {}
			opts.servers.vtsls.settings = opts.servers.vtsls.settings or {}
			opts.servers.vtsls.settings.vtsls = opts.servers.vtsls.settings.vtsls or {}
			opts.servers.vtsls.settings.vtsls.tsserver = opts.servers.vtsls.settings.vtsls.tsserver or {}

			local plugins = opts.servers.vtsls.settings.vtsls.tsserver.globalPlugins or {}
			local location = get_pkg_path("svelte-language-server", "/node_modules/typescript-svelte-plugin")

			if location then
				table.insert(plugins, {
					name = "typescript-svelte-plugin",
					location = location,
					enableForWorkspaceTypeScriptVersions = true,
				})
			end

			opts.servers.vtsls.settings.vtsls.tsserver.globalPlugins = plugins
		end,
	},

	{
		"stevearc/conform.nvim",
		optional = true,
		opts = function(_, opts)
			opts.formatters_by_ft = opts.formatters_by_ft or {}
			opts.formatters_by_ft.svelte = { "prettier" }
		end,
	},
}
