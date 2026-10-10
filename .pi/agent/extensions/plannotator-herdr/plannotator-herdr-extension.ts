import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { startPlannotatorPublisher } from "./plannotator-publisher.ts";

const extensionDirectory = dirname(fileURLToPath(import.meta.url));

/** Older Pi releases lack ctx.mode; use real terminal I/O to exclude their RPC/print sessions. */
export function isInteractivePlannotatorSession(ctx: { mode?: string; hasUI: boolean }, terminalIsTTY: boolean): boolean {
  return ctx.hasUI && (ctx.mode === "tui" || (ctx.mode === undefined && terminalIsTTY));
}

/** Reuse Plannotator's three native commands; change only their browser opener in Herdr TUI sessions. */
export default function plannotatorHerdrExtension(pi: ExtensionAPI): void {
  let publisher: Awaited<ReturnType<typeof startPlannotatorPublisher>> | undefined;
  let previousEnvironment: Map<string, string | undefined> | undefined;
  let overrides: Record<string, string> = {};

  async function cleanup(): Promise<void> {
    const active = publisher;
    publisher = undefined;
    await active?.stop();
    for (const [key, previous] of previousEnvironment ?? []) {
      if (process.env[key] !== overrides[key]) continue;
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
    previousEnvironment = undefined;
  }

  pi.on("session_start", async (_event, ctx) => {
    await cleanup();
    const terminalIsTTY = !!(process.stdin.isTTY && process.stdout.isTTY);
    if (!isInteractivePlannotatorSession(ctx, terminalIsTTY) || process.env.HERDR_ENV !== "1") return;
    const herdrSocket = process.env.HERDR_SOCKET_PATH;
    const callerPane = process.env.HERDR_PANE_ID;
    if (!herdrSocket || !callerPane) {
      ctx.ui.notify("Plannotator Herdr: missing managed pane context; keeping the existing browser configuration.", "warning");
      return;
    }
    try {
      publisher = await startPlannotatorPublisher(herdrSocket, callerPane, (message) => ctx.ui.notify(message, "error"));
      overrides = {
        PLANNOTATOR_BROWSER: join(extensionDirectory, "plannotator-open.ts"),
        PLANNOTATOR_HERDR_SOCKET: publisher.socket,
        // The review server and the SSH proxy endpoint are on the same host.
        // Never expose it on 0.0.0.0 or advertise the client's/Tailscale's address.
        PLANNOTATOR_REMOTE: "0",
        PLANNOTATOR_PORT: "",
        PLANNOTATOR_URL_HOST: "",
      };
      previousEnvironment = new Map(Object.keys(overrides).map((key) => [key, process.env[key]]));
      Object.assign(process.env, overrides);
    } catch (error) {
      ctx.ui.notify(`Plannotator Herdr: ${error instanceof Error ? error.message : String(error)}`, "error");
    }
  });
  pi.on("session_shutdown", cleanup);
}
