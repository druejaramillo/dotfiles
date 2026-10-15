import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { callHerdrApi, watchHerdrPanes } from "./herdr-json-api.ts";
import { startPlannotatorPublisher } from "./plannotator-publisher.ts";
import { isInteractivePlannotatorSession } from "./plannotator-herdr-extension.ts";
import { PlannotatorTabRelay } from "./plannotator-tab-relay.ts";
import {
  buildHerdrRemoteBridgeCommand, buildPlannotatorBrowserArgs, collectPlannotatorRequests,
  collectPlannotatorRenderers, createPlannotatorRequestToken, encodePlannotatorRoute, PLANNOTATOR_RENDERER_TOKEN_PREFIX, PLANNOTATOR_REQUEST_TTL_MS, validatePlannotatorUrl,
  type HerdrMachineProfile, type HerdrPaneRecord,
} from "./plannotator-herdr-protocol.ts";

const rendererId = "a123456789abcdef0123";
const token = "plannotator_0123456789abcdef0123";
const producer: HerdrPaneRecord = { pane_id: "w1:p1", terminal_id: "producer-1", workspace_id: "w1", tab_id: "w1:t1", tokens: { [token]: encodePlannotatorRoute("http://localhost:19432", rendererId), [`${PLANNOTATOR_RENDERER_TOKEN_PREFIX}${rendererId}`]: "Example renderer" } };
const machine: HerdrMachineProfile = { id: "saved-puter", label: "Puter", target: "puter", session: "default", enabled: true };

function mockControl() {
  const calls: { method: string; params: Record<string, unknown> }[] = [];
  const panes: HerdrPaneRecord[] = [{ ...producer, terminal_id: "unrelated-user-pane" }];
  let nextPane = 0;
  let failRename = false;
  async function control(method: string, params: object): Promise<unknown> {
    const data = params as Record<string, unknown>;
    calls.push({ method, params: data });
    if (method === "plugin.pane.open") {
      const n = ++nextPane;
      const pane = { pane_id: `wLocal:p${n}`, terminal_id: `browser-${n}`, workspace_id: "wLocal", tab_id: `wLocal:t${n}` };
      panes.push(pane);
      return { plugin_pane: { pane } };
    }
    if (method === "pane.list") return { panes };
    if (method === "plugin.pane.close") {
      const index = panes.findIndex((pane) => pane.pane_id === data.pane_id);
      if (index >= 0) panes.splice(index, 1);
    }
    if (method === "tab.rename" && failRename) throw new Error("Rename refused");
    return {};
  }
  return { calls, panes, control, failRename: () => { failRename = true; } };
}

async function fakeHerdrSocket(t: TestContext, handle: (request: { id: string; method: string; params: Record<string, unknown> }, socket: Socket) => void) {
  const directory = await mkdtemp(join(tmpdir(), "plannotator-herdr-test-"));
  const socketPath = join(directory, "herdr.sock");
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => {});
    let buffer = "";
    socket.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        handle(JSON.parse(line), socket);
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(socketPath, resolve));
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  return { socket: socketPath };
}

function reply(socket: Socket, id: string, result: unknown) {
  socket.write(`${JSON.stringify({ id, result })}\n`);
}

async function waitUntil(condition: () => boolean, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error("Test condition timed out");
    await delay(20);
  }
}

test("current and legacy Pi enable the opener only for interactive TUI sessions", () => {
  assert.equal(isInteractivePlannotatorSession({ mode: "tui", hasUI: true }, false), true);
  assert.equal(isInteractivePlannotatorSession({ mode: "rpc", hasUI: true }, true), false);
  assert.equal(isInteractivePlannotatorSession({ mode: "print", hasUI: false }, false), false);
  assert.equal(isInteractivePlannotatorSession({ hasUI: true }, true), true);
  assert.equal(isInteractivePlannotatorSession({ hasUI: true }, false), false);
});

test("local browser arguments never split or merge with an existing browser", () => {
  assert.deepEqual(buildPlannotatorBrowserArgs("http://localhost:19432"), ["open", "http://localhost:19432", "--no-merge"]);
  assert.deepEqual(buildPlannotatorBrowserArgs("http://localhost:19432", "root@hetzner-puter"), ["open", "http://localhost:19432", "--no-merge", "--ssh", "root@hetzner-puter"]);
});

test("only bounded loopback review URLs and single-argv SSH targets are allowed", () => {
  for (const url of ["https://localhost:19432", "http://example.com:19432", "http://localhost", "http://user:pass@localhost:19432", "http://localhost:19432\n", `http://localhost:19432/${"x".repeat(80)}`]) {
    assert.throws(() => validatePlannotatorUrl(url));
  }
  assert.throws(() => buildPlannotatorBrowserArgs("http://localhost:19432", "-oProxyCommand=bad"));
  assert.throws(() => buildPlannotatorBrowserArgs("http://localhost:19432", "host other-arg"));
  assert.equal(validatePlannotatorUrl("http://127.0.0.1:45000/path?token=abc"), "http://127.0.0.1:45000/path?token=abc");
  assert.equal(createPlannotatorRequestToken().length, 32);
  assert.equal(collectPlannotatorRequests([{ ...producer, tokens: { unrelated: "http://localhost:19432", [token]: "http://evil.example:19432" } }], rendererId).size, 0);
  assert.equal(collectPlannotatorRequests([producer], "b123456789abcdef0123").size, 0);
  assert.equal(collectPlannotatorRequests([{ ...producer, tokens: { [token]: "http://localhost:19432" } }], rendererId).size, 0);
  assert.equal(collectPlannotatorRequests([producer], rendererId).size, 1);
  assert.throws(() => encodePlannotatorRoute("http://localhost:19432", "unsafe renderer"));
  assert.deepEqual(collectPlannotatorRenderers([producer, producer]), [{ id: rendererId, label: "Example renderer" }]);
});

test("SSH API transport pins the saved session and quotes it rather than guessing from SSH_CONNECTION", () => {
  const command = buildHerdrRemoteBridgeCommand("team's-session");
  assert.match(command, /remote-api-bridge --check/);
  assert.match(command, /herdr-api-bridge-v1/);
  assert.match(command, /"\$HOME\/\.local\/bin\/herdr"/);
  assert.ok(command.endsWith("'team'\\''s-session'"));
  assert.doesNotMatch(command, /server stop|remote-client-bridge|terminal-browser/);
});

test("native requests become dedicated local tabs and close only their owned panes", async () => {
  const mock = mockControl();
  const relay = new PlannotatorTabRelay({ socket: "local.sock" }, "lease.sock", rendererId, assert.fail, mock.control);
  const source = { id: "local", label: "Local" };
  await relay.updateSource(source, [producer]);
  await relay.updateSource(source, [producer]);
  const launches = mock.calls.filter((call) => call.method === "plugin.pane.open");
  assert.equal(launches.length, 1);
  assert.equal(launches[0].params.placement, "tab");
  assert.equal(launches[0].params.workspace_id, producer.workspace_id);
  assert.equal((launches[0].params.env as Record<string, string>).PLANNOTATOR_HERDR_SSH_TARGET, "");
  mock.panes.push({ pane_id: "wLocal:pUser", terminal_id: "extra-user-pane", workspace_id: "wLocal", tab_id: "wLocal:t1" });
  await relay.updateSource(source, []);
  assert.deepEqual(mock.calls.filter((call) => call.method === "plugin.pane.close").map((call) => call.params.pane_id), ["wLocal:p1"]);
  assert.equal(mock.panes.length, 2);
  assert.ok(mock.calls.every((call) => !["tab.close", "workspace.close", "server.stop"].includes(call.method)));
  await relay.stop();
});

test("identical remote pane IDs stay machine-scoped and every remote browser gets its saved --ssh target", async () => {
  const mock = mockControl();
  const relay = new PlannotatorTabRelay({ socket: "local.sock" }, "lease.sock", rendererId, assert.fail, mock.control);
  const second = { ...machine, id: "saved-hetzner", label: "Hetzner", target: "root@hetzner-puter" };
  await relay.updateSource({ id: machine.id, label: machine.label, machine }, [producer]);
  await relay.updateSource({ id: second.id, label: second.label, machine: second }, [producer]);
  const launches = mock.calls.filter((call) => call.method === "plugin.pane.open");
  assert.deepEqual(launches.map((call) => (call.params.env as Record<string, string>).PLANNOTATOR_HERDR_SSH_TARGET), ["puter", "root@hetzner-puter"]);
  assert.ok(launches.every((call) => call.params.workspace_id === undefined));
  await relay.updateSource({ id: machine.id, label: machine.label, machine }, []);
  assert.equal(mock.panes.filter((pane) => pane.terminal_id.startsWith("browser-")).length, 1);
  await relay.stop();
  assert.throws(() => new PlannotatorTabRelay({ machine }, "lease.sock", rendererId, assert.fail));
});

test("moving the producer does not duplicate a review; moving its browser preserves safe cleanup", async () => {
  const mock = mockControl();
  const relay = new PlannotatorTabRelay({ socket: "local.sock" }, "lease.sock", rendererId, assert.fail, mock.control);
  const source = { id: "local", label: "Local" };
  await relay.updateSource(source, [producer]);
  await relay.updateSource(source, [{ ...producer, pane_id: "wMoved:pNew", workspace_id: "wMoved" }]);
  assert.equal(mock.calls.filter((call) => call.method === "plugin.pane.open").length, 1);
  mock.panes[1].pane_id = "wElsewhere:pMoved";
  await relay.updateSource(source, []);
  assert.equal(mock.calls.find((call) => call.method === "plugin.pane.close")?.params.pane_id, "wElsewhere:pMoved");
  await relay.stop();
});

test("a rename failure cannot orphan a successfully launched browser", async () => {
  const mock = mockControl();
  const errors: string[] = [];
  mock.failRename();
  const relay = new PlannotatorTabRelay({ socket: "local.sock" }, "lease.sock", rendererId, (message) => errors.push(message), mock.control);
  await relay.updateSource({ id: "local", label: "Local" }, [producer]);
  await relay.stop();
  assert.equal(mock.panes.length, 1);
  assert.equal(errors.length, 1);
});

test("closing a review during asynchronous tab creation cleans up the late result", async () => {
  const mock = mockControl();
  let release: (() => void) | undefined;
  let launched = false;
  const relay = new PlannotatorTabRelay({ socket: "local.sock" }, "lease.sock", rendererId, assert.fail, async (method, params) => {
    if (method === "plugin.pane.open") {
      launched = true;
      await new Promise<void>((resolve) => { release = resolve; });
    }
    return mock.control(method, params);
  });
  const source = { id: "local", label: "Local" };
  const open = relay.updateSource(source, [producer]);
  await waitUntil(() => launched);
  const closed = relay.updateSource(source, []);
  release!();
  await Promise.all([open, closed]);
  assert.equal(mock.panes.length, 1);
  await relay.stop();
});

test("Herdr protocol errors without a request ID are propagated rather than hidden", async (t) => {
  const endpoint = await fakeHerdrSocket(t, (_request, socket) => {
    socket.end(`${JSON.stringify({ id: null, error: { code: "invalid_request", message: "Invalid method" } })}\n`);
  });
  await assert.rejects(callHerdrApi(endpoint, "invalid.method"), /Invalid method/);
});

test("subscription bootstrap buffers reviews opened between acknowledgement and snapshot", async (t) => {
  let subscriber: Socket | undefined;
  const endpoint = await fakeHerdrSocket(t, (request, socket) => {
    if (request.method === "events.subscribe") {
      subscriber = socket;
      reply(socket, request.id, { type: "subscription_started" });
    } else if (request.method === "session.snapshot") {
      subscriber!.write(`${JSON.stringify({ event: "pane.updated", data: { pane: producer } })}\n`);
      reply(socket, request.id, { snapshot: { panes: [] } });
    }
  });
  const abort = new AbortController();
  let observed = false;
  const watch = watchHerdrPanes(endpoint, (panes) => {
    if (collectPlannotatorRequests(panes, rendererId).size === 1) observed = true;
  }, abort.signal);
  await waitUntil(() => observed);
  abort.abort();
  await watch;
});

test("pane move subscriptions replace old IDs instead of leaving stale review metadata", async (t) => {
  let subscriber: Socket | undefined;
  const endpoint = await fakeHerdrSocket(t, (request, socket) => {
    if (request.method === "events.subscribe") {
      subscriber = socket;
      reply(socket, request.id, { type: "subscription_started" });
    } else if (request.method === "session.snapshot") {
      reply(socket, request.id, { snapshot: { panes: [producer] } });
    }
  });
  const abort = new AbortController();
  let latest: HerdrPaneRecord[] | undefined;
  const watch = watchHerdrPanes(endpoint, (panes) => { latest = panes; }, abort.signal);
  await waitUntil(() => latest !== undefined);
  subscriber!.write(`${JSON.stringify({ event: "pane.moved", data: {
    previous_pane_id: producer.pane_id,
    pane: { ...producer, pane_id: "wMoved:p9", tokens: {} },
  } })}\n`);
  await waitUntil(() => latest?.[0]?.pane_id === "wMoved:p9");
  assert.equal(latest!.length, 1);
  assert.equal(collectPlannotatorRequests(latest!, rendererId).size, 0);
  abort.abort();
  await watch;
});

test("closing a producer tab or workspace clears reviews without individual pane.closed events", async (t) => {
  for (const event of ["tab.closed", "workspace.closed"]) {
    let subscriber: Socket | undefined;
    const endpoint = await fakeHerdrSocket(t, (request, socket) => {
      if (request.method === "events.subscribe") {
        subscriber = socket;
        reply(socket, request.id, { type: "subscription_started" });
      } else if (request.method === "session.snapshot") {
        reply(socket, request.id, { snapshot: { panes: [producer] } });
      }
    });
    const abort = new AbortController();
    let latest: HerdrPaneRecord[] | undefined;
    const watch = watchHerdrPanes(endpoint, (panes) => { latest = panes; }, abort.signal);
    await waitUntil(() => latest !== undefined);
    subscriber!.write(`${JSON.stringify({ event, data: { tab_id: producer.tab_id, workspace_id: producer.workspace_id } })}\n`);
    await waitUntil(() => latest?.length === 0);
    abort.abort();
    await watch;
  }
});

test("shutdown drains an in-flight publisher write before clearing its request", async (t) => {
  const reports: Record<string, unknown>[] = [];
  let releaseWrite: (() => void) | undefined;
  const endpoint = await fakeHerdrSocket(t, (request, socket) => {
    if (request.method === "pane.list") {
      reply(socket, request.id, { panes: [producer] });
    } else if (request.method === "pane.current") {
      reply(socket, request.id, { pane: producer });
    } else if (request.method === "pane.report_metadata") {
      reports.push(request.params);
      if (Object.values(request.params.tokens as object)[0] !== null) {
        releaseWrite = () => reply(socket, request.id, {});
      } else reply(socket, request.id, {});
    }
  });
  const http = createHttpServer((_req, res) => res.end("shutdown race test"));
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  t.after(() => { http.close(); });
  const address = http.address();
  assert.ok(address && typeof address === "object");
  const url = `http://localhost:${address.port}`;
  const publisher = await startPlannotatorPublisher({
    herdr: { socket: endpoint.socket, callerPaneId: producer.pane_id }, reportError: assert.fail,
    onOpen: () => {}, onChange: () => {},
    publishTailnet: async () => ({ url: "https://test.example.ts.net:23456", stop: async () => {} }),
  });
  t.after(() => publisher.stop());
  await callHerdrApi({ socket: publisher.socket }, "open", { url });
  const launch = publisher.openTerminal(publisher.getReviews()[0].id, rendererId);
  await waitUntil(() => releaseWrite !== undefined);
  const stopped = publisher.stop();
  releaseWrite!();
  await Promise.all([launch, stopped]);
  assert.equal(Object.values(reports[0].tokens as object)[0], encodePlannotatorRoute(url, rendererId));
  assert.ok(reports.length >= 2);
  assert.ok(reports.slice(1).every((report) => Object.values(report.tokens as object)[0] === null));
});

test("publisher opens real URLs, follows caller context, and clears tokens when the server closes", async (t) => {
  const reports: Record<string, unknown>[] = [];
  const errors: string[] = [];
  const endpoint = await fakeHerdrSocket(t, (request, socket) => {
    if (request.method === "pane.list") {
      reply(socket, request.id, { panes: [producer] });
    } else if (request.method === "pane.current") {
      assert.equal(request.params.caller_pane_id, "wOriginal:p1");
      reply(socket, request.id, { pane: { ...producer, pane_id: "wMoved:p9" } });
    } else if (request.method === "pane.report_metadata") {
      reports.push(request.params);
      reply(socket, request.id, { type: "metadata_updated" });
    }
  });
  const http = createHttpServer((_req, res) => res.end("test review"));
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const address = http.address();
  assert.ok(address && typeof address === "object");
  const url = `http://localhost:${address.port}`;
  let publicationStopped = false;
  const publisher = await startPlannotatorPublisher({
    herdr: { socket: endpoint.socket, callerPaneId: "wOriginal:p1" }, reportError: (message) => errors.push(message),
    onOpen: () => {}, onChange: () => {},
    publishTailnet: async () => ({ url: "https://test.example.ts.net:23456", stop: async () => { publicationStopped = true; } }),
  });
  t.after(() => publisher.stop());
  t.after(() => { http.close(); });
  await callHerdrApi({ socket: publisher.socket }, "open", { url });
  assert.equal(reports.length, 0, "Opening a review must not broadcast to renderers");
  await publisher.openTerminal(publisher.getReviews()[0].id, rendererId);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].pane_id, "wMoved:p9");
  assert.equal(reports[0].ttl_ms, PLANNOTATOR_REQUEST_TTL_MS);
  assert.equal(Object.values(reports[0].tokens as object)[0], encodePlannotatorRoute(url, rendererId));
  await new Promise<void>((resolve) => http.close(() => resolve()));
  await waitUntil(() => reports.some((report) => Object.values(report.tokens as object)[0] === null) && publicationStopped);
  assert.equal(publisher.getReviews().length, 0);
  assert.deepEqual(errors, []);
  await publisher.stop();
  await publisher.stop();
});
