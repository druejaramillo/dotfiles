hl.unbind("SUPER + RETURN")
o.bind("SUPER + RETURN", "Terminal", { launch = "ghostty --gtk-single-instance=false" })

hl.unbind("SUPER + ALT + RETURN")
o.bind("SUPER + ALT + RETURN", "Tmux", {
	launch = 'xdg-terminal-exec --dir="$HOME" zsh -c "tmux attach || tmux new -s Work"',
})

hl.unbind("SUPER + SHIFT + A")
o.bind("SUPER + SHIFT + A", "ChatGPT", { launch = "chatgpt" })

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

-- Preserve the former clamshell profile behavior instead of Quattro's default
-- internal-display-only handling.
hl.unbind("switch:on:Lid Switch")
hl.unbind("switch:off:Lid Switch")
o.bind("switch:on:Lid Switch", nil, "hyprmon --profile home", { locked = true })
o.bind("switch:off:Lid Switch", nil, "hyprmon --profile laptop", { locked = true })

o.bind("SUPER + M", "Hypruler", { launch = "hypruler" })

o.bind("ALT + SPACE", "Play/pause media", "omarchy-shell media playPause", { locked = true })

-- strata-installer: file-manager start
hl.unbind("SUPER + SHIFT + F")
hl.unbind("SUPER + ALT + SHIFT + F")
o.bind("SUPER + SHIFT + F", "File manager", { launch = "/home/drue/.local/bin/strata" })
o.bind("SUPER + ALT + SHIFT + F", "File manager (cwd)",
  "uwsm-app -- /home/drue/.local/bin/strata \"$(omarchy-cmd-terminal-cwd)\"")
-- strata-installer: file-manager end

-- Dictation keys from before Alt + Space and Right Alt became the defaults.
-- Remove these lines to give the keys back to applications.
if o.dictation_installed and o.dictation_installed() then
  o.bind("SUPER + CTRL + X", "Toggle dictation", "omarchy-dictation toggle")
  o.bind_hold("F9", "Start dictation (push-to-talk)", "omarchy-dictation start", "Stop dictation (push-to-talk)", "omarchy-dictation stop")
end
