# Plannotator → Herdr → terminal-browser

Reuse the existing global Plannotator package and its native Pi commands:

- `/plannotator-last`
- `/plannotator-annotate <file>`
- `/plannotator-review [directory | PR URL]`

Every review opens in a **new Herdr tab**, never a split or a tab in someone
else's browser. Submitting/closing the review stops its server; Pi then clears
its request and the local relay closes only the browser pane it created. The
empty tab disappears. If you add other panes to that tab, they are not closed.

## Local rendering for SSH machines

Herdr cannot put a local process in a remote workspace. The local relay watches
its own server and enabled saved SSH machine profiles, using long-lived Herdr
API subscriptions over SSH. It launches all browsers on the rendering machine:

```text
remote Pi → remote loopback Plannotator server → Herdr request metadata
          → local relay → Local Herdr tab
          → terminal-browser open <actual-url> --no-merge --ssh <saved-target>
```

The target and remote session come from `herdr machine list --json`. Neither
`SSH_CONNECTION` nor machine labels are used to guess a hostname. There is no
remote browser installation, remote rendering, reverse SSH, or exposed HTTP
listener. terminal-browser supplies its normal SSH network proxy.

Remote reviews appear under **Local**, labelled `Plannotator · <machine>`.
Herdr's API cannot switch a client from a selected remote machine to Local:
if you are looking at a remote machine, select the new Local tab in the sidebar.
You never need to copy/open a Plannotator URL.

## Installation

The Pi extension is auto-loaded from this directory. Keep the same directory
on every machine running Pi, preserving the executable bit on
`plannotator-open.ts`. Run `/reload` or restart Pi after syncing it. Node
22.19+ must be on the pane's PATH; no runtime npm dependencies are required.
The existing `npm:@plannotator/pi-extension` package remains unchanged.

On the **local rendering machine only**, link the companion Herdr plugin and
enable the local relay once, from a Herdr pane:

```sh
herdr plugin link "$HOME/.pi/agent/extensions/plannotator-herdr"
node "$HOME/.pi/agent/extensions/plannotator-herdr/plannotator-relay.ts" enable
```

Renderer opt-in is stored in private local runtime state, not synced agent
config. A synced plugin registry therefore cannot accidentally start rendering
on a remote host. Once enabled, the plugin's startup hook starts the relay for
new local Herdr servers; its start action is also idempotent. Install
terminal-browser on this rendering machine, not on the remote agents.

The Pi side enables the opener only in a Herdr TUI session. It supports the
installed Pi 1.1.0 locally and Pi 0.87.1 on the saved SSH hosts; older contexts
without `ctx.mode` also use real terminal I/O to exclude RPC/print mode. It overrides
`PLANNOTATOR_REMOTE`, `PLANNOTATOR_PORT`, `PLANNOTATOR_URL_HOST`, and
`PLANNOTATOR_BROWSER` **inside that Pi process only**: loopback, random port,
actual localhost URL, and the companion opener. It restores previous values on
shutdown/reload. Shell configuration and Plannotator behavior outside Herdr
are untouched. Plan reviews also benefit from the same opener.

## Cleanup and failure behavior

- Review-server shutdown clears its request after three failed one-second probes.
- Closing the originating Pi pane, tab, or workspace also releases its browsers.
- Request tokens have a 15-second lease, refreshed while the server is running.
  An unexpected Pi crash cannot leave a request behind indefinitely.
- Browser sessions hold a connection to the local relay. Losing that relay
  closes only these sessions, not terminal-browser's shared daemon.
- A remote API disconnect has a 30-second grace period before its tabs close;
  subscriptions reconnect with backoff. Disabled/removed profiles are released.
- Browser/pane moves use terminal identity, not stale workspace-qualified IDs.
- Closing a browser manually does not immediately reopen it. Close its review or
  rerun the relevant Pi command when you want to open a new review.
- The relay reads metadata from your enabled saved machines. SSH authentication
  uses OpenSSH/your agent; background subscriptions never approve host keys,
  install software, or start/restart remote Herdr servers.
- This is a single designated rendering-machine workflow. Do not enable a relay
  on several rendering machines for the same agents unless you want several
  independent browser tabs.

## Diagnostics

From a local Herdr pane:

```sh
node "$HOME/.pi/agent/extensions/plannotator-herdr/plannotator-relay.ts" status
node "$HOME/.pi/agent/extensions/plannotator-herdr/plannotator-relay.ts" stop
node "$HOME/.pi/agent/extensions/plannotator-herdr/plannotator-relay.ts" start
```

Status shows the relay PID and connected machine IDs. Logs are in
`relay.log` next to the reported relay socket, under
`${XDG_STATE_HOME:-$HOME/.local/state}/plannotator-herdr/`.

The remote transport checks `herdr-api-bridge-v1`, the bridge used by Herdr's
saved-machine CLI, before subscribing. Herdr 0.9.1 supports the required API.
The current relay supports Linux/macOS rendering hosts and POSIX SSH servers.

Development only:

```sh
npm install --ignore-scripts
npm test
npm run check
```
