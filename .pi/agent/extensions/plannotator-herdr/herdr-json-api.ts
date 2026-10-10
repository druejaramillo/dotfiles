import { spawn } from "node:child_process";
import { createConnection, type Socket } from "node:net";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { buildHerdrRemoteBridgeCommand, validateHerdrSshTarget, type HerdrMachineProfile, type HerdrPaneRecord } from "./plannotator-herdr-protocol.ts";

/** Raw Herdr socket errors retain their code for idempotent cleanup. */
export class HerdrApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`Plannotator Herdr API: ${message}`);
    this.code = code;
  }
}

/** Local endpoints use inherited sockets; remote endpoints use a saved SSH profile. */
export type HerdrApiEndpoint = { socket: string } | { machine: HerdrMachineProfile };

type HerdrTransport = { input: Writable; output: Readable; close: () => void };
type HerdrReply = { id?: string | null; result?: unknown; error?: { code: string; message: string }; event?: string; data?: Record<string, unknown> };

/** One dedicated connection per request or subscription; no ambient UI focus is used. */
export function openHerdrTransport(endpoint: HerdrApiEndpoint): HerdrTransport {
  if ("socket" in endpoint) {
    const socket = createConnection(endpoint.socket);
    return { input: socket, output: socket, close: () => socket.destroy() };
  }
  const profile = endpoint.machine;
  const child = spawn("ssh", [
    "-T", "-o", "BatchMode=yes", "-o", "ConnectTimeout=5",
    "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=2", "--",
    validateHerdrSshTarget(profile.target), buildHerdrRemoteBridgeCommand(profile.session),
  ], { stdio: ["pipe", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk: Buffer) => { stderr = (stderr + chunk.toString()).slice(-4000); });
  child.on("error", (error) => child.stdout.destroy(error));
  child.on("exit", (code) => {
    if (code) child.stdout.destroy(new Error(`Plannotator Herdr: SSH API bridge exited (${code}): ${stderr.trim()}`));
    // Successful exit must drain stdout: destroying it here can lose the final reply.
  });
  child.stdin.on("error", () => {}); // The output side reports SSH failures.
  return { input: child.stdin, output: child.stdout, close: () => { child.stdin.destroy(); child.kill(); } };
}

/** Send a bounded newline-delimited request to a specific server, never the focused machine. */
export async function callHerdrApi<T>(endpoint: HerdrApiEndpoint, method: string, params: object = {}, timeoutMs = 8000): Promise<T> {
  const transport = openHerdrTransport(endpoint);
  const lines = createInterface({ input: transport.output });
  transport.output.once("close", () => lines.close());
  const timer = setTimeout(() => transport.output.destroy(new Error(`Plannotator Herdr: ${method} timed out.`)), timeoutMs);
  transport.input.write(`${JSON.stringify({ id: "plannotator-herdr", method, params })}\n`);
  try {
    for await (const line of lines) {
      const reply = JSON.parse(line) as HerdrReply;
      if (reply.error && (reply.id == null || reply.id === "plannotator-herdr")) {
        throw new HerdrApiError(reply.error.code, reply.error.message);
      }
      if (reply.id !== "plannotator-herdr") continue;
      if (reply.result !== undefined) return reply.result as T;
    }
    throw new Error(`Plannotator Herdr: ${method} connection closed without a response.`);
  } finally {
    clearTimeout(timer);
    lines.close();
    transport.close();
  }
}

/** Subscribe before bootstrapping, buffering events so reviews opened during startup are not lost. */
export async function watchHerdrPanes(
  endpoint: HerdrApiEndpoint,
  onPanes: (panes: HerdrPaneRecord[]) => void,
  signal: AbortSignal,
): Promise<void> {
  const transport = openHerdrTransport(endpoint);
  const lines = createInterface({ input: transport.output });
  transport.output.once("close", () => lines.close());
  const panes = new Map<string, HerdrPaneRecord>();
  const buffered: HerdrReply[] = [];
  let ready = false;
  let bootstrap: Promise<void> | undefined;
  let bootstrapError: unknown;
  const abort = () => transport.close();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(() => transport.output.destroy(new Error("Plannotator Herdr: subscription startup timed out.")), 15_000);

  function applyEvent(reply: HerdrReply): void {
    if (!reply.event) return;
    const data = reply.data ?? {};
    if (reply.event === "tab.closed" || reply.event === "workspace.closed") {
      for (const [id, pane] of panes) {
        if (reply.event === "tab.closed" ? pane.tab_id === data.tab_id : pane.workspace_id === data.workspace_id) panes.delete(id);
      }
    } else if (reply.event === "pane.closed" || reply.event === "pane.exited") {
      if (typeof data.pane_id === "string") panes.delete(data.pane_id);
    } else if (reply.event === "pane.moved") {
      if (typeof data.previous_pane_id === "string") panes.delete(data.previous_pane_id);
      if (data.pane) {
        const pane = data.pane as HerdrPaneRecord;
        panes.set(pane.pane_id, pane);
      }
    } else if (data.pane) {
      const pane = data.pane as HerdrPaneRecord;
      panes.set(pane.pane_id, pane);
    }
    onPanes([...panes.values()]);
  }

  transport.input.write(`${JSON.stringify({ id: "plannotator-herdr-subscribe", method: "events.subscribe", params: { subscriptions: [
    { type: "pane.created" }, { type: "pane.updated" }, { type: "pane.closed" }, { type: "pane.exited" }, { type: "pane.moved" },
    { type: "tab.closed" }, { type: "workspace.closed" },
  ] } })}\n`);
  try {
    for await (const line of lines) {
      const reply = JSON.parse(line) as HerdrReply;
      if (reply.error) throw new HerdrApiError(reply.error.code, reply.error.message);
      if (reply.id === "plannotator-herdr-subscribe") {
        if (bootstrap) continue;
        clearTimeout(timer);
        bootstrap = callHerdrApi<{ snapshot: { panes: HerdrPaneRecord[] } }>(endpoint, "session.snapshot").then((result) => {
          if (signal.aborted) return;
          for (const pane of result.snapshot.panes) panes.set(pane.pane_id, pane);
          ready = true;
          for (const event of buffered.splice(0)) applyEvent(event);
          onPanes([...panes.values()]);
        }).catch((error: unknown) => { bootstrapError = error; transport.close(); });
      } else if (reply.event) {
        if (ready) applyEvent(reply);
        else buffered.push(reply);
      }
    }
    await bootstrap;
    if (bootstrapError) throw bootstrapError;
    if (!signal.aborted) throw new Error("Plannotator Herdr: pane subscription disconnected.");
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    lines.close();
    transport.close();
  }
}

/** Probe only the local review server's TCP listener; never submit or alter a review. */
export function plannotatorServerIsListening(rawUrl: string): Promise<boolean> {
  const url = new URL(rawUrl);
  return new Promise((resolve) => {
    const socket: Socket = createConnection({ host: url.hostname === "localhost" ? "127.0.0.1" : url.hostname.replace(/^\[|\]$/g, ""), port: Number(url.port) });
    const finish = (listening: boolean) => { socket.destroy(); resolve(listening); };
    socket.setTimeout(750, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}
