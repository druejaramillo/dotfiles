import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { test } from "node:test";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import plannotatorHerdrExtension from "./plannotator-herdr-extension.ts";

function extensionFixture(mode: string, hasUI: boolean) {
  const handlers = new Map<string, (event: unknown, ctx: ExtensionContext) => Promise<void>>();
  const commands = new Map<string, { handler: (args: string, ctx: ExtensionContext) => Promise<void> }>();
  const notices: string[] = [];
  const statuses: (string | undefined)[] = [];
  const ctx = { mode, hasUI, ui: {
    notify: (message: string) => notices.push(message),
    select: async () => undefined,
    setStatus: (_key: string, value: string | undefined) => statuses.push(value),
    setWidget: () => {},
  } } as unknown as ExtensionContext;
  plannotatorHerdrExtension({
    on: (name: string, handler: (event: unknown, ctx: ExtensionContext) => Promise<void>) => handlers.set(name, handler),
    registerCommand: (name: string, command: { handler: (args: string, ctx: ExtensionContext) => Promise<void> }) => commands.set(name, command),
    sendMessage: () => assert.fail("Startup alone must not publish a review"),
  } as unknown as ExtensionAPI);
  return { handlers, commands, ctx, notices, statuses };
}

const environmentKeys = ["HERDR_ENV", "HERDR_SOCKET_PATH", "HERDR_PANE_ID", "PLANNOTATOR_BROWSER", "PLANNOTATOR_REMOTE", "PLANNOTATOR_PORT", "PLANNOTATOR_URL_HOST", "PLANNOTATOR_HERDR_SOCKET"];

function restoreEnvironment(original: Map<string, string | undefined>): void {
  for (const [key, value] of original) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test("interactive Pi outside Herdr installs the link opener and restores environment on shutdown", async () => {
  const original = new Map(environmentKeys.map((key) => [key, process.env[key]]));
  const fixture = extensionFixture("tui", true);
  try {
    delete process.env.HERDR_ENV;
    process.env.PLANNOTATOR_BROWSER = "original-browser";
    process.env.PLANNOTATOR_REMOTE = "1";
    process.env.PLANNOTATOR_PORT = "19432";
    process.env.PLANNOTATOR_URL_HOST = "previous-host";
    await fixture.handlers.get("session_start")!({}, fixture.ctx);
    assert.match(process.env.PLANNOTATOR_BROWSER!, /plannotator-open\.ts$/);
    assert.equal(process.env.PLANNOTATOR_REMOTE, "0");
    assert.equal(process.env.PLANNOTATOR_PORT, "");
    assert.equal(process.env.PLANNOTATOR_URL_HOST, "");
    assert.ok((await stat(process.env.PLANNOTATOR_HERDR_SOCKET!)).isSocket());
    assert.ok(fixture.statuses.includes("review:ask"));
    await fixture.commands.get("plannotator-open")!.handler("mode link", fixture.ctx);
    assert.ok(fixture.statuses.includes("review:link"));
    await fixture.handlers.get("session_shutdown")!({}, fixture.ctx);
    assert.equal(process.env.PLANNOTATOR_BROWSER, "original-browser");
    assert.equal(process.env.PLANNOTATOR_REMOTE, "1");
    assert.equal(process.env.PLANNOTATOR_PORT, "19432");
    assert.equal(process.env.PLANNOTATOR_URL_HOST, "previous-host");
    assert.deepEqual(fixture.notices, []);
  } finally {
    await fixture.handlers.get("session_shutdown")!({}, fixture.ctx);
    restoreEnvironment(original);
  }
});

test("RPC and print sessions retain their original browser environment", async () => {
  const original = new Map(environmentKeys.map((key) => [key, process.env[key]]));
  for (const [mode, hasUI] of [["rpc", true], ["print", false]] as const) {
    const fixture = extensionFixture(mode, hasUI);
    await fixture.handlers.get("session_start")!({}, fixture.ctx);
    assert.deepEqual(new Map(environmentKeys.map((key) => [key, process.env[key]])), original);
    assert.deepEqual(fixture.statuses, []);
    await fixture.handlers.get("session_shutdown")!({}, fixture.ctx);
  }
});
