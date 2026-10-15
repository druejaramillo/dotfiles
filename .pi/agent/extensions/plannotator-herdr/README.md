# Plannotator: terminal tab or private browser link

Keep the native Plannotator commands and tool. This companion changes their
opener, not their review or approval behavior. Each live review has two
independent destinations:

- **Terminal tab:** a dedicated terminal-browser tab on one explicitly selected
  renderer. For remote Pi hosts, terminal-browser uses the renderer's saved
  Herdr SSH profile. Existing browsers never merge with the review.
- **Browser link:** HTTPS through Tailscale Serve on the machine running Pi.
  Open it from any authorized tailnet device. It works without Herdr and
  without a rendering laptop being online. In Moshi, long-press the full URL
  and choose **Open** for Safari.

There are no hardcoded machine names, SSH client addresses, or designated
rendering computer. Renderers advertise short-lived identities. Only the
selected renderer opens a tab; other renderers ignore the request.

## Choose where reviews open

The default is **Ask** for each new review. Set a preference with:

```text
/plannotator-open mode terminal
/plannotator-open mode link
/plannotator-open mode ask
```

Terminal mode asks which renderer to use when several are available. The
preference lasts in this Pi process until changed, `/reload`, or a new session.
**Reattaching from another device does not change it.** On your phone, use
`/plannotator-open mode link`. SSH variables and inherited terminal names
cannot reliably identify the current viewer.

Existing Plannotator plan, annotate, last-message, and code-review flows all use
this opener. Browser-link publication is attempted for every review regardless
of opening preference. The full HTTPS URL appears in the transcript and a
widget while the review remains live. A publication failure does not close the
review or prevent terminal opening. Choosing Browser link does not automatically
repeat a failed attempt; `/plannotator-open link` explicitly retries it.

Reopen the **same live review**, without starting another review server:

```text
/plannotator-open
/plannotator-open list
/plannotator-open link
/plannotator-open terminal
/plannotator-open link latest
/plannotator-open terminal pr-<id-or-unique-prefix>
```

With several reviews, the command offers a chooser unless you supply an ID or
`latest`. These `pr-` routing IDs are separate from the native tool's `pn-`
review IDs. Showing a link does not close an existing terminal view; changing
the preference affects future reviews. Unsaved comments in one browser are not
promised to migrate to another browser.

## Install or migrate

Keep this directory on every machine running Pi. Preserve the executable bit on
`plannotator-open.ts`. The native `npm:@plannotator/pi-extension` stays installed
and unchanged. Node 22.19+ must be on the pane's PATH; runtime npm dependencies
are not required.

Finish outstanding reviews before reloading/upgrading: this companion's links
and terminal routes belong to its current Pi runtime. `/reload` cleans them up,
although a native Plannotator review may still exist independently.

On **each computer you want to render terminal-browser tabs**, install
terminal-browser and link/enable the renderer from a local graphical Herdr pane:

```sh
herdr plugin link "$HOME/.pi/agent/extensions/plannotator-herdr"
node "$HOME/.pi/agent/extensions/plannotator-herdr/plannotator-relay.ts" enable
```

Renderer opt-in is private local runtime state, not synced configuration. It is
not required on machines that only run Pi or on a phone. A renderer watches its
own Herdr server and enabled saved SSH profiles; profiles and sessions are read
from Herdr, never guessed from `SSH_CONNECTION`.

**Upgrading the previous relay:** after finishing its outstanding reviews,
restart only the relay, then `/reload` Pi:

```sh
node "$HOME/.pi/agent/extensions/plannotator-herdr/plannotator-relay.ts" stop
node "$HOME/.pi/agent/extensions/plannotator-herdr/plannotator-relay.ts" start
```

Stopping the relay closes the browser panes it owns, not Herdr or unrelated
panes. `status` must report `protocol: 2` and a `renderer` identity. The previous
relay cannot advertise renderers and safely ignores version-2 requests. New
relays ignore old broadcast requests.

To withdraw a computer as a renderer, use `plannotator-relay.ts disable`.
`start`, `stop`, and `status` remain available. A restarted renderer gets a new
identity: if a preference points to its old identity, Pi asks you again rather
than silently choosing another computer.

## Tailnet prerequisites and access

On every **Pi host** where you want browser links:

- Install/sign in to Tailscale; enable MagicDNS and tailnet HTTPS certificates.
- Permit your OS user to run ordinary HTTP-proxy Serve and allow reviewing devices through
  the tailnet ACLs/grants for the dynamically allocated HTTPS ports.

The publisher uses loopback HTTP, not a Unix-socket or filesystem Serve target.
It does not invoke sudo. Recent Tailscale versions require additional privileges
for Unix-socket targets; those privileges are not needed for this transport.

By default, the proxy accepts only the Tailscale login that owns the Pi host.
For tagged hosts (which have no owner), or an additional login you use, set an
explicit login allowlist in the environment that launches Pi:

```sh
export PLANNOTATOR_TAILNET_ALLOW='me@example.com,other-login@example.com'
```

Then start/reload Pi. This adds logins, not device names; it does not change
Tailscale ACLs. Tagged *client* devices that send no user identity are refused.
HTTPS setup, login, ACL changes, and OS operator permissions remain your
choices; the extension does not enable them or approve setup prompts.

## Security and cleanup

The real review server stays on loopback with a random port. The companion
uses an identity-checked loopback HTTP proxy and a per-review **foreground**
Serve process:

```text
Pi host's loopback Plannotator server
  ← private identity/Host/Origin-checking proxy
  ← Tailscale Serve HTTPS
  ← your authorized browser
```

The proxy rejects other identities, cross-origin requests, and native host-only
control/polling endpoints. It strips forwarded identity and authorization
headers before reaching Plannotator, while supporting streaming and WebSockets.
Serve forwards through an unguessable backend path which is not in the public
review URL. The loopback proxy requires that path as well as the expected Host,
Origin, and Tailscale identity. Direct requests to its root are refused.

Publication first checks Serve state for occupied ports. It never uses Funnel,
`serve reset`, global `off`, `--yes`, or background Serve, and does not replace
an Inbox or another service. Shutdown signals only its own foreground CLI.
The worker's IPC connection is a lease: losing Pi closes its publication and
loopback listener. Cleanup is best effort if related processes are forcibly
killed together.
Completing a review removes its link and terminal request after three failed
one-second listener probes. Renderer advertisements and terminal requests have
15-second leases. Remote transport disconnects retain existing terminal tabs
for a 30-second grace period. Browser cleanup follows terminal identity across
pane moves and never closes panes added by the user.

Process-local environment overrides are restored on shutdown/reload. RPC,
print, and JSON modes retain their previous browser configuration.

## Diagnostics and development

`/plannotator-open list` shows current links. `/plannotator-open link` retries
failed publication. If only Browser link appears, the updated renderer relay
is not advertising on that Pi host. Restart the companion relay on the viewing
computer (not Herdr itself), check that `status` reports `protocol: 2`, and
check its saved SSH profiles and logs under
`${XDG_STATE_HOME:-$HOME/.local/state}/plannotator-herdr/`.

Development checks:

```sh
npm test
npm run check
```

Tests use temporary review servers, Unix sockets, mocked Herdr APIs, and a fake
Tailscale executable. They never change live Herdr layout or real Serve routes.

For an opt-in real-network smoke test, run on a Pi host:

```sh
node scripts/plannotator-tailnet-smoke.ts --publish-probe
```

This temporarily publishes only a disposable marker, checks HTTPS and
cross-origin rejection, stops its foreground Serve process, and verifies that
the pre-existing Serve configuration is unchanged. It never reads review content
or resets Serve. Normal tests do not run this script.
