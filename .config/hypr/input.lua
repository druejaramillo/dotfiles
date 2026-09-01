-- Personal input policy from the pre-Quattro configuration.
hl.config({
  input = {
    kb_layout = "us",
    kb_options = "",
    repeat_rate = 40,
    repeat_delay = 250,
    numlock_by_default = true,
    mouse_refocus = false,
    follow_mouse = 2,
    natural_scroll = true,
    touchpad = {
      natural_scroll = true,
      clickfinger_behavior = true,
      scroll_factor = 0.4,
      tap_to_click = false,
    },
  },
})

hl.device({
  name = "at-translated-set-2-keyboard",
  kb_options = "caps:escape_shifted_capslock",
})
hl.device({
  name = "corsair-corsair-k70-rgb-mk.2-low-profile-mechanical-gaming-keyboard",
  kb_options = "caps:escape_shifted_capslock",
})
hl.device({
  name = "adv360-pro-keyboard",
  kb_options = "",
})

-- Omarchy still supplies the legacy terminal and Ghostty scroll rules.
hl.gesture({ fingers = 3, direction = "horizontal", action = "workspace" })
