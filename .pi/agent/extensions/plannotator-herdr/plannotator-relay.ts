import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, openSync } from "node:fs";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import { createServer, type Socket } from "node:net";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { callHerdrApi, watchHerdrPanes, type HerdrApiEndpoint } from "./herdr-json-api.ts";
import { PlannotatorTabRelay, type PlannotatorReviewSource } from "./plannotator-tab-relay.ts";
import { validateHerdrSshTarget, type HerdrMachineProfile, type HerdrPaneRecord } from "./plannotator-herdr-protocol.ts";

const execFileAsync = promisify(execFile);
const herdrSocket = process.env.HERDR_SOCKET_PATH;
if (process.env.HERDR_ENV !== "1" || !herdrSocket) {
  throw new Error("Plannotator Herdr: start the local relay from a managed Herdr pane or plugin.");
}
const localEndpoint = { socket: herdrSocket };
const namespace = createHash("sha256").update(herdrSocket).digest("hex").slice(0, 12);
// Runtime opt-in is deliberately not in synced Herdr/Pi configuration.
const rendererStateDirectory = join(process.env.XDG_STATE_HOME ?? join(homedir(), ".local", "state"), "plannotator-herdr");
const rendererEnabledFile = join(rendererStateDirectory, "renderer-enabled");
const stateDirectory = join(rendererStateDirectory, namespace);
const relaySocket = join(stateDirectory, "relay.sock");
const relayEndpoint = { socket: relaySocket };

function relayLog(message: string): void {
  console.error(`${new Date().toISOString()} ${message}`);
}

async function readMachineProfiles(): Promise<HerdrMachineProfile[]> {
  const { stdout } = await execFileAsync(process.env.HERDR_BIN_PATH ?? "herdr", ["machine", "list", "--json"], { timeout: 5000, maxBuffer: 1024 * 1024 });
  const profiles = JSON.parse(stdout) as HerdrMachineProfile[];
  return profiles.filter((profile) => {
    if (!profile.enabled || typeof profile.id !== "string" || typeof profile.session !== "string" || typeof profile.label !== "string") return false;
    try { validateHerdrSshTarget(profile.target); return true; } catch { return false; }
  }).map(({ id, label, target, session, enabled }) => ({ id, label, target, session, enabled }));
}

async function serveRelay(): Promise<void> {
  await access(rendererEnabledFile);
  await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
  const clients = new Set<Socket>();
  const globalAbort = new AbortController();
  const tabRelay = new PlannotatorTabRelay(localEndpoint, relaySocket, relayLog);
  const workers = new Map<string, { signature: string; abort: AbortController; done: Promise<void> }>();
  const connected = new Set<string>();
  let stopping = false;
  let refreshing = false;

  async function monitorSource(source: PlannotatorReviewSource, endpoint: HerdrApiEndpoint, signal: AbortSignal): Promise<void> {
    let retryMs = 1000;
    let staleTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      while (!signal.aborted) {
        try {
          await watchHerdrPanes(endpoint, (panes: HerdrPaneRecord[]) => {
            connected.add(source.id);
            retryMs = 1000;
            if (staleTimer) { clearTimeout(staleTimer); staleTimer = undefined; }
            void tabRelay.updateSource(source, panes);
          }, signal);
        } catch (error) {
          connected.delete(source.id);
          if (signal.aborted) break;
          relayLog(`${source.label}: ${error instanceof Error ? error.message : String(error)}`);
          if (source.id === "local") { void stopRelay(); break; }
          // A short network interruption does not destroy the review. A permanently
          // lost machine cannot leave browser tabs and SSH proxy processes behind.
          staleTimer ??= setTimeout(() => { void tabRelay.updateSource(source, []); }, 30_000);
          await delay(retryMs, undefined, { signal }).catch(() => {});
          retryMs = Math.min(retryMs * 2, 30_000);
        }
      }
    } finally {
      if (staleTimer) clearTimeout(staleTimer);
      connected.delete(source.id);
    }
  }

  async function refreshMachines(): Promise<void> {
    if (refreshing || stopping) return;
    refreshing = true;
    try {
      const profiles = await readMachineProfiles();
      const enabled = new Map(profiles.map((profile) => [profile.id, profile]));
      for (const [id, worker] of workers) {
        const profile = enabled.get(id);
        if (profile && worker.signature === JSON.stringify(profile)) continue;
        worker.abort.abort();
        await worker.done;
        workers.delete(id);
        await tabRelay.updateSource({ id, label: "Removed SSH machine" }, []);
      }
      for (const profile of profiles) {
        if (workers.has(profile.id) || stopping) continue;
        const abort = new AbortController();
        workers.set(profile.id, {
          signature: JSON.stringify(profile), abort,
          done: monitorSource({ id: profile.id, label: profile.label, machine: profile }, { machine: profile }, abort.signal),
        });
      }
    } catch (error) {
      relayLog(`Plannotator Herdr machine catalog: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      refreshing = false;
    }
  }

  const server = createServer((client) => {
    clients.add(client);
    client.on("close", () => clients.delete(client));
    client.on("error", () => {});
    let buffer = "";
    client.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      if (buffer.length > 4096) { client.destroy(); return; }
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      try {
        const request = JSON.parse(line) as { id: string; method: string };
        const status = { pid: process.pid, herdrSocket, relaySocket, connected: [...connected] };
        if (!["lease", "status", "stop"].includes(request.method)) throw new Error("Unsupported local relay method.");
        client.write(`${JSON.stringify({ id: request.id, result: status })}\n`);
        if (request.method === "stop") void stopRelay();
      } catch (error) {
        client.end(`${JSON.stringify({ error: { code: "invalid_request", message: String(error) } })}\n`);
      }
    });
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(relaySocket, resolve); });
  const localMonitor = monitorSource({ id: "local", label: "Local" }, localEndpoint, globalAbort.signal);
  const refreshTimer = setInterval(() => { void refreshMachines(); }, 30_000);

  async function stopRelay(): Promise<void> {
    if (stopping) return;
    stopping = true;
    clearInterval(refreshTimer);
    globalAbort.abort();
    for (const worker of workers.values()) worker.abort.abort();
    // Browser leases close on orderly shutdown and on an unexpected relay crash.
    for (const client of clients) client.destroy();
    server.close();
    await tabRelay.stop();
    await Promise.allSettled([localMonitor, ...[...workers.values()].map((worker) => worker.done)]);
    await unlink(relaySocket).catch(() => {});
  }
  for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"] as const) process.once(signal, () => { void stopRelay(); });
  await refreshMachines();
  relayLog("Plannotator Herdr: local browser relay ready.");
}

async function startRelay(): Promise<void> {
  try { await access(rendererEnabledFile); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    console.log(JSON.stringify({ localRendererEnabled: false }));
    return;
  }
  await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
  try {
    const status = await callHerdrApi(relayEndpoint, "status", {}, 1000);
    console.log(JSON.stringify(status));
    return;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT" && code !== "ECONNREFUSED") throw error;
    await unlink(relaySocket).catch(() => {});
  }
  const logFile = openSync(join(stateDirectory, "relay.log"), "a", 0o600);
  try {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "serve"], {
      detached: true, stdio: ["ignore", logFile, logFile], cwd: dirname(fileURLToPath(import.meta.url)),
    });
    child.unref();
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      try {
        const status = await callHerdrApi(relayEndpoint, "status", {}, 1000);
        console.log(JSON.stringify(status));
        return;
      } catch { await delay(100); }
    }
    throw new Error(`Plannotator Herdr: local relay did not start; see ${join(stateDirectory, "relay.log")}`);
  } finally { closeSync(logFile); }
}

switch (process.argv[2]) {
  case "enable":
    if (process.env.SSH_CONNECTION || process.env.SSH_TTY || (process.platform !== "darwin" && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY)) {
      throw new Error("Plannotator Herdr: enable the renderer on the local graphical client, not an SSH host.");
    }
    await mkdir(rendererStateDirectory, { recursive: true, mode: 0o700 });
    await writeFile(rendererEnabledFile, "Local Plannotator renderer explicitly enabled.\n", { mode: 0o600 });
    await startRelay();
    break;
  case "start": await startRelay(); break;
  case "serve": await serveRelay(); break;
  case "status": console.log(JSON.stringify(await callHerdrApi(relayEndpoint, "status"), null, 2)); break;
  case "stop": await callHerdrApi(relayEndpoint, "stop"); break;
  default: throw new Error("Plannotator Herdr: usage: node plannotator-relay.ts enable|start|status|stop");
}
