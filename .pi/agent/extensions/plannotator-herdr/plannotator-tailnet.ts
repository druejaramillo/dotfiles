import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomInt } from "node:crypto";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { validatePlannotatorUrl } from "./plannotator-herdr-protocol.ts";
import { startPlannotatorTailnetProxy } from "./plannotator-tailnet-proxy.ts";

const execFileAsync = promisify(execFile);
type TailnetIdentity = { hostname: string; allowedLogins: string[] };
type WorkerReply = { type: "ready"; url: string } | { type: "error"; message: string };

/** A publication owns its foreground Serve process and guarded loopback proxy, not global Serve configuration. */
export interface PlannotatorTailnetPublication {
  url: string;
  stop: () => Promise<void>;
}

/** Discover the serving host and its owning login; tagged machines require an explicit login allowlist. */
export function parsePlannotatorTailnetIdentity(raw: string, extraLogins = ""): TailnetIdentity {
  const status = JSON.parse(raw) as {
    BackendState?: string;
    Self?: { DNSName?: string; UserID?: string | number; Tags?: string[] };
    User?: Record<string, { LoginName?: string }>;
  };
  const hostname = status.Self?.DNSName?.replace(/\.$/, "").toLowerCase();
  if (status.BackendState !== "Running" || !hostname || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(hostname)) {
    throw new Error("Plannotator tailnet: Tailscale must be signed in with MagicDNS and HTTPS enabled.");
  }
  const owner = status.Self?.Tags?.length ? undefined : status.User?.[String(status.Self?.UserID)]?.LoginName;
  const allowedLogins = [...new Set([owner ?? "", ...extraLogins.split(",")].map((login) => login.trim().toLowerCase()).filter(Boolean))];
  if (!allowedLogins.length) {
    throw new Error("Plannotator tailnet: this machine has no owning login; set PLANNOTATOR_TAILNET_ALLOW to your Tailscale login, then /reload.");
  }
  return { hostname, allowedLogins };
}

/** Fail closed on malformed Serve state and avoid every occupied node HTTPS port, including foreground routes. */
export function plannotatorServePortIsFree(raw: string, port: number): boolean {
  let root: unknown;
  try { root = JSON.parse(raw); } catch { return false; }
  function available(value: unknown): boolean {
    if (value === null) return true;
    if (typeof value !== "object" || Array.isArray(value)) return false;
    const config = value as Record<string, unknown>;
    if (Object.keys(config).some((key) => !["TCP", "Web", "Foreground", "AllowFunnel", "Services", "ETag"].includes(key))) return false;
    for (const name of ["TCP", "Web", "AllowFunnel"]) {
      const routes = config[name];
      if (routes == null) continue;
      if (typeof routes !== "object" || Array.isArray(routes)) return false;
      if (Object.keys(routes).some((key) => key === String(port) || key.endsWith(`:${port}`))) return false;
    }
    const foreground = config.Foreground;
    return foreground == null || (typeof foreground === "object" && !Array.isArray(foreground) && Object.values(foreground).every(available));
  }
  return available(root);
}

function tailnetErrorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).replace(/[\x00-\x1f\x7f]/g, " ").slice(-1800);
}

/** Publish in a leased subprocess so Pi crashes/reloads close the link independently of any rendering laptop. */
export function publishPlannotatorTailnet(
  url: string,
  reportFailure: (message: string) => void,
  workerEnvironment: NodeJS.ProcessEnv = process.env,
): Promise<PlannotatorTailnetPublication> {
  validatePlannotatorUrl(url);
  return new Promise((resolve, reject) => {
    // Standalone Pi bundles its runtime: process.execPath names Pi, not Node.
    const child = spawn("node", [fileURLToPath(import.meta.url), "--worker"], {
      stdio: ["ignore", "ignore", "pipe", "ipc"], serialization: "json", env: workerEnvironment,
    });
    let ready = false;
    let stopping: Promise<void> | undefined;
    let stderr = "";
    child.stderr?.on("data", (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-1800); });
    const exited = new Promise<void>((done) => { child.once("exit", () => done()); child.once("error", () => done()); });
    function stop(): Promise<void> {
      stopping ??= (async () => {
        clearTimeout(timeout);
        if (child.connected) child.disconnect(); // Worker treats the IPC connection as its parent lease.
        const timer = setTimeout(() => child.kill("SIGTERM"), 5000);
        const force = setTimeout(() => child.kill("SIGKILL"), 8000);
        try { await exited; } finally { clearTimeout(timer); clearTimeout(force); }
      })();
      return stopping;
    }
    const fail = (message: string) => {
      if (stopping) return;
      const detail = `Plannotator tailnet: ${message}`;
      if (ready) reportFailure(detail);
      else reject(new Error(detail));
      void stop();
    };
    const timeout = setTimeout(() => fail("publication timed out; check Tailscale Serve permissions and HTTPS setup."), 20_000);
    child.on("error", (error: NodeJS.ErrnoException) => fail(error.code === "ENOENT"
      ? "Node.js 22.19+ was not found on Pi's PATH. Install Node and restart Pi."
      : tailnetErrorMessage(error)));
    child.on("exit", (code) => fail(`publisher exited (${code ?? "signal"})${stderr ? `: ${tailnetErrorMessage(stderr)}` : "."}`));
    child.on("message", (message: WorkerReply) => {
      if (stopping) return;
      if (message.type === "error") { fail(message.message); return; }
      if (message.type !== "ready" || ready) return;
      let published: URL;
      try { published = new URL(message.url); } catch { fail("publisher returned an invalid URL."); return; }
      if (published.protocol !== "https:" || published.username || published.password) { fail("publisher returned an unsafe URL."); return; }
      ready = true;
      clearTimeout(timeout);
      resolve({ url: published.origin + new URL(url).pathname + new URL(url).search + new URL(url).hash, stop });
    });
    child.send({ url }, (error) => { if (error) fail(tailnetErrorMessage(error)); });
  });
}

/** The worker leases a guarded loopback HTTP proxy; ordinary operators never need privileged Unix-socket Serve. */
async function runPlannotatorTailnetWorker(): Promise<void> {
  const abort = new AbortController();
  let proxy: Awaited<ReturnType<typeof startPlannotatorTailnetProxy>> | undefined;
  let serve: ChildProcess | undefined;
  let serveExited: Promise<void> | undefined;
  let starting: Promise<void> | undefined;
  let stopping: Promise<void> | undefined;
  function send(message: WorkerReply): void {
    if (process.connected) process.send?.(message, () => {});
  }
  async function runTailscale(args: string[]): Promise<string> {
    const { stdout } = await execFileAsync("tailscale", args, { timeout: 5000, maxBuffer: 2 * 1024 * 1024, signal: abort.signal });
    return stdout;
  }
  async function start(url: string): Promise<void> {
    const upstreamUrl = validatePlannotatorUrl(url);
    const identity = parsePlannotatorTailnetIdentity(await runTailscale(["status", "--json"]), process.env.PLANNOTATOR_TAILNET_ALLOW);
    const state = await runTailscale(["serve", "status", "--json"]);
    let port = 0;
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = randomInt(20000, 60000);
      if (plannotatorServePortIsFree(state, candidate)) { port = candidate; break; }
    }
    if (!port) throw new Error("no safe HTTPS port available in Tailscale Serve configuration.");
    if (abort.signal.aborted) throw new Error("publisher stopped during startup.");
    const publicOrigin = `https://${identity.hostname}:${port}`;
    proxy = await startPlannotatorTailnetProxy({ upstreamUrl, publicOrigin, allowedLogins: identity.allowedLogins });
    if (abort.signal.aborted) throw new Error("publisher stopped during startup.");
    serve = spawn("tailscale", ["serve", "--bg=false", `--https=${port}`, proxy.targetUrl], { stdio: ["ignore", "pipe", "pipe"] });
    serveExited = new Promise<void>((resolve) => { serve!.once("exit", () => resolve()); serve!.once("error", () => resolve()); });
    let output = "";
    const safeOutput = () => output.replaceAll(new URL(proxy!.targetUrl).pathname, "/<private-proxy>");
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Serve did not announce the review URL. ${safeOutput()}`)), 10_000);
      const append = (chunk: Buffer) => {
        output = (output + chunk.toString()).slice(-3000);
        if (output.includes(publicOrigin)) { clearTimeout(timer); resolve(); }
      };
      serve!.stdout!.on("data", append);
      serve!.stderr!.on("data", append);
      serve!.once("error", (error) => { clearTimeout(timer); reject(error); });
      serve!.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`Serve exited (${code ?? "signal"}). ${safeOutput()}`));
        if (!stopping) { send({ type: "error", message: tailnetErrorMessage(safeOutput() || "Serve stopped.") }); void stop(); }
      });
    });
    if (!abort.signal.aborted) send({ type: "ready", url: publicOrigin });
  }
  function stop(): Promise<void> {
    stopping ??= (async () => {
      abort.abort();
      // Signal only this worker's foreground CLI; never reset or disable a route by port.
      const child = serve;
      if (child?.pid && child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
        const force = setTimeout(() => child.kill("SIGKILL"), 2000);
        await serveExited;
        clearTimeout(force);
      } else await serveExited;
      await starting?.catch(() => {});
      await proxy?.stop();
      if (process.connected) process.disconnect();
    })();
    return stopping;
  }
  process.once("disconnect", () => { void stop(); });
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.once(signal, () => { void stop(); });
  process.once("message", (message: { url: string }) => {
    if (stopping) return;
    starting = start(message.url);
    void starting.catch((error: unknown) => { if (!stopping) send({ type: "error", message: tailnetErrorMessage(error) }); void stop(); });
  });
}

if (process.argv[2] === "--worker" && process.argv[1] === fileURLToPath(import.meta.url)) {
  await runPlannotatorTailnetWorker();
}
