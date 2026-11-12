hl.unbind("SUPER + SHIFT + E")
o.bind("SUPER + SHIFT + E", "Email", { launch = "hey-mail" })

hl.unbind("SUPER + SHIFT + C")
o.bind("SUPER + SHIFT + C", "Calendar", { launch = "rencal" })

hl.unbind("SUPER + SHIFT + M")
o.bind("SUPER + SHIFT + M", "Music", { launch = "spotifast" })

o.bind("SUPER + SHIFT + CTRL + code:10", "HyprMon laptop profile", "hyprmon --profile laptop")
o.bind("SUPER + SHIFT + CTRL + code:11", "HyprMon work profile", "hyprmon --profile work")
o.bind("SUPER + SHIFT + CTRL + code:12", "HyprMon home profile", "hyprmon --profile home")
o.bind("SUPER + SHIFT + CTRL + code:13", "HyprMon Denon profile", "hyprmon --profile denon")

-- Toggle Airpods connection
o.bind("SUPER + ALT + A", "Toggle Airpods", "~/.config/hypr/scripts/toggle-airpods.sh")

o.bind("SUPER + M", "Hypruler", { launch = "hypruler" })

o.bind("ALT + P", "Play/pause media", "omarchy-shell media playPause", { locked = true })

-- strata-installer: file-manager start
hl.unbind("SUPER + SHIFT + F")
hl.unbind("SUPER + ALT + SHIFT + F")
o.bind("SUPER + SHIFT + F", "File manager", { launch = "/home/drue/.local/bin/strata" })
o.bind(
	"SUPER + ALT + SHIFT + F",
	"File manager (cwd)",
	'uwsm-app -- /home/drue/.local/bin/strata "$(omarchy-cmd-terminal-cwd)"'
)
-- strata-installer: file-manager end
