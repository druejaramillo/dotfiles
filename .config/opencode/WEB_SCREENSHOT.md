# Web Screenshot Tool

`web_screenshot` uses Playwright's managed Chromium instead of the browser
installed by the operating system. It returns quality-controlled JPEG captures,
which keep visual attachments within OpenCode's image budget on photo-heavy
pages. This gives OpenCode a known browser version on workstations and servers
alike.

## Setup

Run these commands from `~/.config/opencode` after installing dependencies:

```sh
npx playwright install chromium
```

On a supported Debian or Ubuntu server without the required browser libraries,
provision the server or image with:

```sh
npx playwright install --with-deps chromium
```

Do this during server or image setup, not from an OpenCode task. Playwright
downloads its browser into `~/.cache/ms-playwright` on Linux and requires a few
hundred MB of disk space. To use a persistent shared browser cache, set
`PLAYWRIGHT_BROWSERS_PATH` to the same writable directory during both browser
installation and OpenCode startup.

## Recovery

If `web_screenshot` reports that Playwright cannot launch Chromium, rerun:

```sh
cd ~/.config/opencode
npx playwright install chromium
```

The tool intentionally does not fall back to `/usr/bin/chromium` or download a
browser while an agent is running. Restart OpenCode after changing this config
or the tool source.
