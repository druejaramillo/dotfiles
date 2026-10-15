import { randomBytes } from "node:crypto";
import { createServer, request, type IncomingHttpHeaders, type IncomingMessage, type OutgoingHttpHeaders } from "node:http";
import type { AddressInfo, Socket } from "node:net";
import { validatePlannotatorUrl } from "./plannotator-herdr-protocol.ts";

const hopHeaders = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]);

/** Strip hop-by-hop and proxy identity headers before a request reaches the loopback review. */
function reviewProxyHeaders(headers: IncomingHttpHeaders, upstream: URL, websocket = false): OutgoingHttpHeaders {
  const blocked = new Set([...hopHeaders, ...(headers.connection ?? "").toLowerCase().split(",").map((value) => value.trim())]);
  const forwarded: OutgoingHttpHeaders = {};
  for (const [name, value] of Object.entries(headers)) {
    if (blocked.has(name) || name === "authorization" || name === "forwarded" || name.startsWith("x-forwarded-") || name.startsWith("tailscale-")) continue;
    forwarded[name] = value;
  }
  forwarded.host = upstream.host;
  if (headers.origin) forwarded.origin = upstream.origin;
  if (websocket) { forwarded.connection = "Upgrade"; forwarded.upgrade = "websocket"; }
  return forwarded;
}

function responseProxyHeaders(headers: IncomingHttpHeaders): OutgoingHttpHeaders {
  const blocked = new Set([...hopHeaders, ...(headers.connection ?? "").toLowerCase().split(",").map((value) => value.trim())]);
  return { ...Object.fromEntries(Object.entries(headers).filter(([name]) => !blocked.has(name))), "cache-control": "no-store" };
}

/** Check Tailscale identity, public Host and Origin before rewriting headers for Plannotator. */
export function authorizePlannotatorTailnetRequest(req: Pick<IncomingMessage, "url" | "headers">, publicOrigin: string, allowedLogins: readonly string[]): number | undefined {
  const loginHeader = req.headers["tailscale-user-login"];
  if (typeof loginHeader !== "string") return 403;
  let login: string;
  try { login = decodeURIComponent(loginHeader).toLowerCase(); } catch { return 403; }
  if (!allowedLogins.some((allowed) => allowed.toLowerCase() === login)) return 403;
  const expected = new URL(publicOrigin);
  if (req.headers.host?.toLowerCase() !== expected.host) return 403;
  if (req.headers.origin !== undefined && req.headers.origin !== expected.origin) return 403;
  if (["cross-site", "same-site"].includes(String(req.headers["sec-fetch-site"]))) return 403;
  if (!req.url?.startsWith("/") || req.url.startsWith("//")) return 400;
  let pathname: string;
  try {
    const target = new URL(req.url, publicOrigin);
    if (target.origin !== expected.origin) return 400;
    pathname = decodeURIComponent(target.pathname);
  } catch { return 400; }
  // A remote reviewer is never the native host's polling bridge or session-control client.
  if (/^\/api\/(?:host|ai\/bridge)(?:\/|$)/.test(pathname)) return 403;
  return undefined;
}

/** Ordinary Serve operators use loopback HTTP with a private backend path; Unix sockets remain available for local tests. */
export async function startPlannotatorTailnetProxy(options: {
  socketPath?: string;
  upstreamUrl: string;
  publicOrigin: string;
  allowedLogins: readonly string[];
}): Promise<{ targetUrl: string; stop: () => Promise<void> }> {
  const upstream = new URL(validatePlannotatorUrl(options.upstreamUrl));
  const backendPath = options.socketPath ? "" : `/pn-${randomBytes(24).toString("hex")}`;
  function authorizeProxyRequest(req: IncomingMessage): number | undefined {
    if (backendPath) {
      const path = req.url ?? "";
      if (path === backendPath) req.url = "/";
      else if (path.startsWith(`${backendPath}/`)) req.url = path.slice(backendPath.length);
      else if (path.startsWith(`${backendPath}?`)) req.url = `/${path.slice(backendPath.length)}`;
      else return 403;
    }
    return authorizePlannotatorTailnetRequest(req, options.publicOrigin, options.allowedLogins);
  }
  if (!options.allowedLogins.length) throw new Error("Plannotator tailnet proxy: no allowed Tailscale login.");
  const sockets = new Set<Socket>();
  function trackSocket(socket: Socket): void {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
    socket.on("error", () => {});
  }
  const server = createServer((req, res) => {
    const refused = authorizeProxyRequest(req);
    if (refused) { res.writeHead(refused, { "cache-control": "no-store" }); res.end("Plannotator tailnet: request refused.\n"); return; }
    const outgoing = request(new URL(req.url!, upstream), { method: req.method, headers: reviewProxyHeaders(req.headers, upstream) }, (response) => {
      res.writeHead(response.statusCode ?? 502, responseProxyHeaders(response.headers));
      response.pipe(res);
      response.on("error", () => res.destroy());
    });
    outgoing.on("socket", trackSocket);
    outgoing.on("error", () => {
      if (!res.headersSent) { res.writeHead(502); res.end("Plannotator tailnet: review is unavailable.\n"); }
      else res.destroy();
    });
    req.once("aborted", () => outgoing.destroy());
    res.once("close", () => outgoing.destroy());
    req.pipe(outgoing);
  });
  server.requestTimeout = 0; // Reviews and Ask this session use long-lived SSE responses.
  server.on("connection", trackSocket);
  server.on("upgrade", (req, socket, head) => {
    const refused = authorizeProxyRequest(req);
    if (refused || req.headers.upgrade?.toLowerCase() !== "websocket") {
      socket.end(`HTTP/1.1 ${refused ?? 400} Refused\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
      return;
    }
    const outgoing = request(new URL(req.url!, upstream), { headers: reviewProxyHeaders(req.headers, upstream, true) });
    outgoing.on("socket", trackSocket);
    outgoing.on("upgrade", (response, remote, remoteHead) => {
      trackSocket(remote);
      socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(response.headers).flatMap(([name, value]) =>
        (Array.isArray(value) ? value : [value]).filter((item) => item !== undefined).map((item) => `${name}: ${item}\r\n`)).join("")}\r\n`);
      if (head.length) remote.write(head);
      if (remoteHead.length) socket.write(remoteHead);
      remote.pipe(socket);
      socket.pipe(remote);
      remote.once("close", () => socket.destroy());
      socket.once("close", () => remote.destroy());
    });
    outgoing.on("response", (response) => {
      response.resume();
      socket.end(`HTTP/1.1 ${response.statusCode ?? 502} Refused\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    });
    outgoing.on("error", () => socket.destroy());
    socket.once("close", () => outgoing.destroy());
    outgoing.end();
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    if (options.socketPath) server.listen(options.socketPath, resolve);
    else server.listen(0, "127.0.0.1", resolve);
  });
  const targetUrl = options.socketPath ? `unix:${options.socketPath}` : `http://127.0.0.1:${(server.address() as AddressInfo).port}${backendPath}`;
  let stopping: Promise<void> | undefined;
  return {
    targetUrl,
    stop() {
      stopping ??= new Promise<void>((resolve) => {
        server.close(() => resolve());
        for (const socket of sockets) socket.destroy();
      });
      return stopping;
    },
  };
}
