-- See https://wiki.hypr.land/Configuring/Basics/Monitors/
-- List current monitors and supported resolutions with: hyprctl monitors all

local omarchy_gdk_scale = 2
local omarchy_monitor_scale = 2

hl.env("GDK_SCALE", tostring(omarchy_gdk_scale))
hl.monitor({ output = "", mode = "preferred", position = "auto", scale = omarchy_monitor_scale })

-- Hyprland 0.56 requires an integral logical resolution. 3200 / 1.75 is not
-- valid, so use the nearest equivalent 1920-wide logical desktop instead.
hl.monitor({ output = "eDP-1", mode = "preferred", position = "auto", scale = 2 })
