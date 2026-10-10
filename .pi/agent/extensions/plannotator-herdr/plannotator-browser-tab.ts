import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { callHerdrApi } from "./herdr-json-api.ts";
import { buildPlannotatorBrowserArgs, type HerdrPaneRecord } from "./plannotator-herdr-protocol.ts";

if (process.env.HERDR_ENV !== "1" || !process.env.HERDR_SOCKET_PATH || !process.env.HERDR_PANE_ID) {
  throw new Error("Plannotator Herdr: browser must run inside a local managed plugin pane.");
}
const args = buildPlannotatorBrowserArgs(process.env.PLANNOTATOR_HERDR_URL ?? "", process.env.PLANNOTATOR_HERDR_SSH_TARGET || undefined);
const leaseSocket = process.env.PLANNOTATOR_HERDR_RELAY_SOCKET;
if (!leaseSocket) throw new Error("Plannotator Herdr: missing local relay lease.");
const lease = createConnection(leaseSocket);
await new Promise<void>((resolve, reject) => { lease.once("connect", resolve); lease.once("error", reject); });
lease.write(`${JSON.stringify({ id: "browser-lease", method: "lease", params: {} })}\n`);

const browser = spawn("terminal-browser", args, { stdio: "inherit", env: { ...process.env, TERMINAL_BROWSER_NO_MERGE: "1" } });
let closing = false;
async function cleanup(): Promise<void> {
  if (closing) return;
  closing = true;
  lease.destroy();
  browser.kill("SIGTERM"); // Closes this browser session, not the shared browser daemon.
  try {
    const endpoint = { socket: process.env.HERDR_SOCKET_PATH! };
    const { pane } = await callHerdrApi<{ pane: HerdrPaneRecord }>(endpoint, "pane.current", { caller_pane_id: process.env.HERDR_PANE_ID });
    await callHerdrApi(endpoint, "plugin.pane.close", { pane_id: pane.pane_id });
  } catch {
    // The relay or Herdr may already have closed the same pane.
  }
}
lease.on("close", () => { void cleanup(); });
lease.on("error", () => { void cleanup(); });
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.on(signal, () => { void cleanup(); });
browser.once("error", (error) => { console.error(`Plannotator Herdr browser: ${error.message}`); void cleanup(); });
browser.once("exit", () => { void cleanup(); });
