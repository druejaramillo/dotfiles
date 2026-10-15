import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, request, type IncomingHttpHeaders } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { authorizePlannotatorTailnetRequest, startPlannotatorTailnetProxy } from "./plannotator-tailnet-proxy.ts";
import { parsePlannotatorTailnetIdentity, plannotatorServePortIsFree, publishPlannotatorTailnet } from "./plannotator-tailnet.ts";

const publicOrigin = "https://agent.example.ts.net:23456";
const allowedLogins = ["owner@example.com"];
const identityHeaders = { host: new URL(publicOrigin).host, "tailscale-user-login": allowedLogins[0] };
const status = { BackendState: "Running", Self: { DNSName: "agent.example.ts.net.", UserID: 42 }, User: { "42": { LoginName: allowedLogins[0] } } };

async function waitUntil(condition: () => Promise<boolean>, timeoutMs = 8000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!(await condition())) {
    if (Date.now() > deadline) throw new Error("Tailnet fixture condition timed out");
    await delay(25);
  }
}

function socketRequest(socketPath: string, path: string, headers: IncomingHttpHeaders = identityHeaders, method = "GET", body = "") {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = request({ socketPath, path, method, headers, agent: false }, (res) => {
      let text = "";
      res.on("data", (chunk: Buffer) => { text += chunk.toString(); });
      res.on("end", () => resolve({ status: res.statusCode!, body: text }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.end(body);
  });
}

function httpProxyRequest(url: string, headers: IncomingHttpHeaders = {}, method = "GET", body = "") {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = request(url, { headers, method, agent: false }, (res) => {
      let text = "";
      res.on("data", (chunk: Buffer) => { text += chunk.toString(); });
      res.on("end", () => resolve({ status: res.statusCode!, body: text }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.end(body);
  });
}

async function proxyIsClosed(target: string): Promise<boolean> {
  try { await httpProxyRequest(new URL(target).origin); return false; }
  catch (error) { return (error as NodeJS.ErrnoException).code === "ECONNREFUSED"; }
}

test("tailnet identity is discovered dynamically and tagged hosts require a user allowlist", () => {
  assert.deepEqual(parsePlannotatorTailnetIdentity(JSON.stringify(status)), { hostname: "agent.example.ts.net", allowedLogins });
  const tagged = { ...status, Self: { ...status.Self, Tags: ["tag:server"] } };
  assert.throws(() => parsePlannotatorTailnetIdentity(JSON.stringify(tagged)), /PLANNOTATOR_TAILNET_ALLOW/);
  assert.deepEqual(parsePlannotatorTailnetIdentity(JSON.stringify(tagged), "phone@example.com"), {
    hostname: "agent.example.ts.net", allowedLogins: ["phone@example.com"],
  });
  assert.throws(() => parsePlannotatorTailnetIdentity(JSON.stringify({ ...status, BackendState: "Stopped" })), /signed in/);
});

test("publication never overwrites existing Serve, Inbox, foreground, or Funnel ports", () => {
  assert.equal(plannotatorServePortIsFree("null", 23456), true);
  assert.equal(plannotatorServePortIsFree("{}", 23456), true);
  for (const state of [
    { TCP: { "23456": { HTTPS: true } } },
    { Web: { "agent.example.ts.net:23456": { Handlers: { "/": { Proxy: "http://127.0.0.1:3333" } } } } },
    { Foreground: { unrelated: { TCP: { "23456": { HTTPS: true } } } } },
    { AllowFunnel: { "agent.example.ts.net:23456": true } },
  ]) assert.equal(plannotatorServePortIsFree(JSON.stringify(state), 23456), false);
  assert.equal(plannotatorServePortIsFree(JSON.stringify({ TCP: { "443": { HTTPS: true } } }), 23456), true);
  for (const raw of ["broken", "[]", "{\"Foreground\":[]}", "{\"UnknownFutureConfig\":true}"]) {
    assert.equal(plannotatorServePortIsFree(raw, 23456), false);
  }
});

test("tailnet proxy rejects wrong identities, foreign origins, private host APIs and alternate destinations", () => {
  const authorize = (url: string, headers: IncomingHttpHeaders = identityHeaders) => authorizePlannotatorTailnetRequest({ url, headers }, publicOrigin, allowedLogins);
  assert.equal(authorize("/api/plan"), undefined);
  assert.equal(authorize("/api/approve", { ...identityHeaders, origin: publicOrigin }), undefined);
  assert.equal(authorize("/", { host: identityHeaders.host }), 403);
  assert.equal(authorize("/", { ...identityHeaders, "tailscale-user-login": "someone-else@example.com" }), 403);
  assert.equal(authorize("/", { ...identityHeaders, host: "wrong.example.ts.net:23456" }), 403);
  assert.equal(authorize("/", { ...identityHeaders, origin: "https://evil.example" }), 403);
  assert.equal(authorize("/", { ...identityHeaders, origin: "null" }), 403);
  assert.equal(authorize("/", { ...identityHeaders, "sec-fetch-site": "cross-site" }), 403);
  for (const path of ["/api/host/status", "/api/host/close", "/api/ai/bridge/poll", "/api/%68ost/status", "/api%2fhost/status"]) assert.equal(authorize(path), 403);
  for (const path of ["//evil.example/", "/\\evil.example/", "https://evil.example/", "/%zz"]) assert.equal(authorize(path), 400);
});

test("Unix proxy preserves review traffic and streams while keeping identity and host tokens private", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "pn-proxy-test-"));
  const upstream = createServer((req, res) => {
    assert.match(req.headers.host!, /^127\.0\.0\.1:\d+$/);
    assert.equal(req.headers["tailscale-user-login"], undefined);
    assert.equal(req.headers["x-forwarded-host"], undefined);
    assert.equal(req.headers.authorization, undefined);
    if (req.headers.origin) assert.equal(req.headers.origin, `http://${req.headers.host}`);
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", () => {
      if (req.url === "/api/events") {
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write("data: ready\n\n");
        setImmediate(() => res.end("data: done\n\n"));
      } else res.end(`${req.method} ${req.url} ${body}`);
    });
  });
  await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const address = upstream.address();
  assert.ok(address && typeof address === "object");
  const socketPath = join(directory, "review.sock");
  const proxy = await startPlannotatorTailnetProxy({ socketPath, upstreamUrl: `http://127.0.0.1:${address.port}`, publicOrigin, allowedLogins });
  t.after(async () => { await proxy.stop(); upstream.closeAllConnections(); await new Promise<void>((resolve) => upstream.close(() => resolve())); await rm(directory, { recursive: true, force: true }); });
  const response = await socketRequest(socketPath, "/api/approve?version=1", {
    ...identityHeaders, origin: publicOrigin, authorization: "Bearer private-host-token", "x-forwarded-host": "spoofed",
  }, "POST", "review decision");
  assert.equal(response.status, 200);
  assert.equal(response.body, "POST /api/approve?version=1 review decision");
  assert.equal((await socketRequest(socketPath, "/api/events")).body, "data: ready\n\ndata: done\n\n");
  assert.equal((await socketRequest(socketPath, "/api/host/close", identityHeaders, "POST")).status, 403);
  assert.equal((await socketRequest(socketPath, "/", { host: identityHeaders.host })).status, 403);
});

test("Unix proxy passes WebSocket upgrades and bidirectional payloads", { timeout: 5000 }, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "pn-websocket-test-"));
  const upstream = createServer();
  upstream.on("upgrade", (_req, socket) => {
    socket.write("HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n");
    socket.on("data", (chunk) => socket.write(chunk));
    socket.on("end", () => socket.end()); // An upgraded HTTP socket is owned by this echo fixture.
    socket.on("error", () => {});
  });
  await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const address = upstream.address();
  assert.ok(address && typeof address === "object");
  const socketPath = join(directory, "review.sock");
  const proxy = await startPlannotatorTailnetProxy({ socketPath, upstreamUrl: `http://127.0.0.1:${address.port}`, publicOrigin, allowedLogins });
  t.after(async () => {
    await proxy.stop();
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  await new Promise<void>((resolve, reject) => {
    const req = request({ socketPath, path: "/socket", headers: { ...identityHeaders, origin: publicOrigin, connection: "Upgrade", upgrade: "websocket" }, agent: false });
    req.once("upgrade", (_res, socket) => {
      socket.once("data", (chunk) => { assert.equal(chunk.toString(), "ping"); socket.destroy(); resolve(); });
      socket.on("error", reject);
      socket.write("ping");
    });
    req.on("error", reject);
    req.end();
  });
});

async function fakeTailscale(t: TestContext) {
  const directory = await mkdtemp(join(tmpdir(), "pn-tailscale-test-"));
  const log = join(directory, "commands.jsonl");
  // This executable replaces PATH completely: these lifecycle tests cannot invoke real Tailscale.
  await writeFile(join(directory, "tailscale"), `#!${process.execPath}\n` + `
import { appendFileSync } from 'node:fs';
const args = process.argv.slice(2);
if (args[0] === 'status') { console.log(${JSON.stringify(JSON.stringify(status))}); process.exit(0); }
if (args[0] === 'serve' && args[1] === 'status') { console.log('{"TCP":{"443":{"HTTPS":true}}}'); process.exit(0); }
if (args[0] !== 'serve' || !args.includes('--bg=false') || args.some(arg => ['reset','clear','off','--yes'].includes(arg))) process.exit(90);
const port = args.find(arg => arg.startsWith('--https=')).split('=')[1];
const target = args.at(-1);
appendFileSync(process.env.FAKE_TAILSCALE_LOG, JSON.stringify({type:'start', args, pid:process.pid, target})+'\\n');
if (process.env.FAKE_TAILSCALE_DENY_UNIX === '1' && args.at(-1).startsWith('unix:')) {
  console.error("sending serve config: 401 Unauthorized: must be root, or be an operator and able to run 'sudo tailscale' to serve a path or Unix socket");
  process.exit(1);
}
if (process.env.FAKE_TAILSCALE_FAIL === '1') { console.error('fake Serve permission denied'); process.exit(1); }
console.log('Available within your tailnet: https://agent.example.ts.net:'+port);
setInterval(() => {}, 1000);
process.on('SIGTERM', () => { appendFileSync(process.env.FAKE_TAILSCALE_LOG, JSON.stringify({type:'stop',pid:process.pid})+'\\n'); process.exit(0); });
`, { mode: 0o700 });
  t.after(() => rm(directory, { recursive: true, force: true }));
  const environment = { ...process.env, PATH: directory, FAKE_TAILSCALE_LOG: log };
  async function commands(): Promise<{ type: string; args: string[]; pid: number; target: string }[]> {
    try { return (await readFile(log, "utf8")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  }
  return { directory, environment, commands };
}

test("publication owns only a foreground Serve process and closes its loopback proxy on stop", { timeout: 15_000 }, async (t) => {
  const fixture = await fakeTailscale(t);
  const publication = await publishPlannotatorTailnet("http://localhost:19432/plan?rev=1", assert.fail, fixture.environment);
  t.after(() => publication.stop());
  assert.match(publication.url, /^https:\/\/agent\.example\.ts\.net:\d+\/plan\?rev=1$/);
  const started = (await fixture.commands()).find((command) => command.type === "start")!;
  assert.match(started.target, /^http:\/\/127\.0\.0\.1:\d+\/pn-[a-f0-9]{48}$/);
  assert.ok(started.args.includes("--bg=false"));
  assert.equal((await httpProxyRequest(new URL(started.target).origin)).status, 403);
  await publication.stop();
  assert.ok((await fixture.commands()).some((command) => command.type === "stop"));
  assert.ok(await proxyIsClosed(started.target));
});

test("a Serve startup failure is reported and its loopback proxy is cleaned up", { timeout: 15_000 }, async (t) => {
  const fixture = await fakeTailscale(t);
  await assert.rejects(publishPlannotatorTailnet("http://localhost:19432", assert.fail, { ...fixture.environment, FAKE_TAILSCALE_FAIL: "1" }), /permission denied/);
  const started = (await fixture.commands()).find((command) => command.type === "start")!;
  await waitUntil(() => proxyIsClosed(started.target));
});

test("losing the Pi parent lease stops the publisher without a rendering laptop", { timeout: 15_000 }, async (t) => {
  const fixture = await fakeTailscale(t);
  const runnerPath = join(fixture.directory, "pi-parent.mjs");
  const moduleUrl = new URL("./plannotator-tailnet.ts", import.meta.url).href;
  await writeFile(runnerPath, `import { publishPlannotatorTailnet } from ${JSON.stringify(moduleUrl)};\nconst publication = await publishPlannotatorTailnet('http://localhost:19432', () => {});\nprocess.send({url:publication.url});\n`);
  const parent = spawn(process.execPath, [runnerPath], { env: fixture.environment, stdio: ["ignore", "ignore", "pipe", "ipc"] });
  t.after(() => { parent.kill("SIGKILL"); });
  await new Promise<void>((resolve, reject) => {
    parent.once("message", () => resolve());
    parent.once("error", reject);
    parent.once("exit", (code) => reject(new Error(`Mock Pi exited early: ${code}`)));
  });
  const started = (await fixture.commands()).find((command) => command.type === "start")!;
  parent.kill("SIGKILL");
  await waitUntil(async () => (await fixture.commands()).some((command) => command.type === "stop"));
  await waitUntil(() => proxyIsClosed(started.target));
});

test("loopback proxy requires the private backend path and identity before forwarding", async (t) => {
  let requests = 0;
  const upstream = createServer((req, res) => { requests++; res.end(`review ${req.url}`); });
  await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  const address = upstream.address();
  assert.ok(address && typeof address === "object");
  const proxy = await startPlannotatorTailnetProxy({ upstreamUrl: `http://127.0.0.1:${address.port}`, publicOrigin, allowedLogins });
  t.after(async () => { await proxy.stop(); upstream.closeAllConnections(); upstream.close(); });
  const target = new URL(proxy.targetUrl);
  assert.equal(target.hostname, "127.0.0.1");
  assert.equal((await httpProxyRequest(target.origin + "/api/plan", identityHeaders)).status, 403);
  assert.equal((await httpProxyRequest(proxy.targetUrl + "/api/plan")).status, 403);
  assert.equal(requests, 0);
  assert.equal((await httpProxyRequest(proxy.targetUrl + "/api/plan?rev=1", identityHeaders)).body, "review /api/plan?rev=1");
  assert.equal((await httpProxyRequest(proxy.targetUrl + "/api/host/close", identityHeaders, "POST")).status, 403);
  assert.equal((await httpProxyRequest(proxy.targetUrl + "/api/plan", { ...identityHeaders, origin: "https://evil.example" })).status, 403);
  assert.equal(requests, 1);
});

test("ordinary Serve operators can publish without privileged Unix-socket targets", { timeout: 15_000 }, async (t) => {
  const fixture = await fakeTailscale(t);
  const publication = await publishPlannotatorTailnet("http://localhost:19432", assert.fail, { ...fixture.environment, FAKE_TAILSCALE_DENY_UNIX: "1" });
  t.after(() => publication.stop());
  const started = (await fixture.commands()).find((command) => command.type === "start")!;
  assert.match(started.args.at(-1)!, /^http:\/\/127\.0\.0\.1:\d+\//);
  assert.ok(started.args.every((arg) => !arg.startsWith("unix:") && arg !== "sudo"));
});
