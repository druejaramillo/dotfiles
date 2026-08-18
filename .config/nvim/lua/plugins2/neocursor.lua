return {
	"teocns/neocursor.nvim",
	event = "InsertEnter",
	-- pre-warm the sidecar (double quotes so cmd.exe and sh both parse it)
	build = 'uv run --with "httpx[http2]" python -c "import httpx"',
	opts = {
		map_tab = false,
	},
}
