import { randomBytes } from "node:crypto";

/** The local Herdr plugin owns browser tabs, never remote rendering processes. */
export const PLANNOTATOR_RELAY_PLUGIN_ID = "local.plannotator-herdr";
/** Review request tokens expire if Pi crashes before clearing them. */
export const PLANNOTATOR_REQUEST_TTL_MS = 15_000;

/** Only fields needed to route reviews; IDs are always issued by Herdr. */
export interface HerdrPaneRecord {
  pane_id: string;
  terminal_id: string;
  workspace_id: string;
  tab_id: string;
  tokens?: Record<string, string>;
}

/** Each saved machine's SSH target and session come from Herdr, not SSH_CONNECTION. */
export interface HerdrMachineProfile {
  id: string;
  label: string;
  target: string;
  session: string;
  enabled: boolean;
}

/** The identity follows a terminal when Herdr moves it to another workspace. */
export interface PlannotatorBrowserRequest {
  key: string;
  token: string;
  url: string;
  pane: HerdrPaneRecord;
}

/** Reject non-loopback URLs, credentials, and values Herdr would silently truncate. */
export function validatePlannotatorUrl(raw: unknown): string {
  if (typeof raw !== "string" || raw.length > 80 || /[\x00-\x20\x7f]/.test(raw)) {
    throw new Error("Plannotator Herdr: invalid or oversized review URL.");
  }
  let url: URL;
  try { url = new URL(raw); }
  catch { throw new Error("Plannotator Herdr: malformed review URL."); }
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !url.port || url.username || url.password
  ) {
    throw new Error("Plannotator Herdr: review URL must be an HTTP loopback URL with a port.");
  }
  return raw;
}

/** Stay within Herdr's 32-character token-name limit without reusing review IDs. */
export function createPlannotatorRequestToken(): string {
  return `plannotator_${randomBytes(10).toString("hex")}`;
}

/** Ignore unrelated pane metadata; machine identity is supplied by the relay connection. */
export function collectPlannotatorRequests(panes: Iterable<HerdrPaneRecord>): Map<string, PlannotatorBrowserRequest> {
  const requests = new Map<string, PlannotatorBrowserRequest>();
  for (const pane of panes) {
    for (const [token, raw] of Object.entries(pane.tokens ?? {})) {
      if (!/^plannotator_[a-f0-9]{20}$/.test(token)) continue;
      try {
        const url = validatePlannotatorUrl(raw);
        const key = `${pane.terminal_id}/${token}`;
        requests.set(key, { key, token, url, pane });
      } catch {
        // Metadata is untrusted input; never turn it into an arbitrary browser command.
      }
    }
  }
  return requests;
}

/** A saved SSH target is one argv item, never a shell command or inferred reverse address. */
export function validateHerdrSshTarget(target: string): string {
  if (!target || target.startsWith("-") || /[\s\x00-\x1f\x7f]/.test(target)) {
    throw new Error("Plannotator Herdr: invalid saved SSH target.");
  }
  return target;
}

/** Disable browser merging so cleanup cannot take an existing browser with it. */
export function buildPlannotatorBrowserArgs(url: string, sshTarget?: string): string[] {
  const args = ["open", validatePlannotatorUrl(url), "--no-merge"];
  if (sshTarget) args.push("--ssh", validateHerdrSshTarget(sshTarget));
  return args;
}

/** Quote only plugin-owned argv for the remote shell; browser URLs never go through a shell. */
export function quoteHerdrShellArgument(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

/** Use the same versioned API bridge Herdr uses for saved machines, without starting a server. */
export function buildHerdrRemoteBridgeCommand(session: string): string {
  const script = `
for candidate in "$(command -v herdr 2>/dev/null)" "$HOME/.local/bin/herdr" /usr/local/bin/herdr /opt/homebrew/bin/herdr; do
  [ -x "$candidate" ] || continue
  capability=$("$candidate" --session "$1" remote-api-bridge --check </dev/null 2>/dev/null) || continue
  [ "$capability" = herdr-api-bridge-v1 ] || continue
  exec "$candidate" --session "$1" remote-api-bridge
done
printf '%s\\n' 'Plannotator Herdr: no compatible remote Herdr API bridge.' >&2
exit 1`;
  return `/bin/sh -c ${quoteHerdrShellArgument(script)} plannotator-herdr ${quoteHerdrShellArgument(session)}`;
}
