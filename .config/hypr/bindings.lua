-- These bindings intentionally replace Quattro's defaults where the former
-- configuration selected a different application or launch behavior.
hl.unbind("SUPER + RETURN")
o.bind("SUPER + RETURN", "Terminal", { launch = "ghostty +new-window" })

hl.unbind("SUPER + ALT + RETURN")
o.bind("SUPER + ALT + RETURN", "Tmux", {
  launch = 'xdg-terminal-exec --dir="$HOME" zsh -c "tmux attach || tmux new -s Work"',
})

hl.unbind("SUPER + SHIFT + E")
o.bind("SUPER + SHIFT + E", "Email", { launch = "mailspring --password-store=gnome-libsecret" })

hl.unbind("SUPER + SHIFT + C")
o.bind("SUPER + SHIFT + C", "Calendar", { launch = "rencal" })

hl.unbind("SUPER + SHIFT + W")
o.bind("SUPER + SHIFT + W", "Typora", { launch = "typora --enable-wayland-ime" })

-- Quattro uses these keys for bar panels; retain the former HyprMon profiles.
for profile = 1, 4 do
  hl.unbind("SUPER + CTRL + code:" .. (profile + 9))
end
o.bind("SUPER + CTRL + 0", "HyprMon profiles", "hyprmon profiles")
o.bind("SUPER + CTRL + 1", "HyprMon laptop profile", "hyprmon --profile laptop")
o.bind("SUPER + CTRL + 2", "HyprMon work profile", "hyprmon --profile work")
o.bind("SUPER + CTRL + 3", "HyprMon home profile", "hyprmon --profile home")
o.bind("SUPER + CTRL + 4", "HyprMon Denon profile", "hyprmon --profile denon")

-- Preserve the former clamshell profile behavior instead of Quattro's default
-- internal-display-only handling.
hl.unbind("switch:on:Lid Switch")
hl.unbind("switch:off:Lid Switch")
o.bind("switch:on:Lid Switch", nil, "hyprmon --profile home", { locked = true })
o.bind("switch:off:Lid Switch", nil, "hyprmon --profile laptop", { locked = true })

o.bind("SUPER + M", "Hypruler", { launch = "hypruler" })
