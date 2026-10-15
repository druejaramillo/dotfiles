import assert from "node:assert/strict";
import { test } from "node:test";
import { PlannotatorReviewOpening } from "./plannotator-opening.ts";
import { PlannotatorRendererRegistration } from "./plannotator-renderer-registration.ts";
import { PlannotatorTabRelay } from "./plannotator-tab-relay.ts";
import { encodePlannotatorRoute, PLANNOTATOR_RENDERER_TOKEN_PREFIX, type HerdrPaneRecord } from "./plannotator-herdr-protocol.ts";

const firstRenderer = { id: "a123456789abcdef0123", label: "First renderer" };
const secondRenderer = { id: "b123456789abcdef0123", label: "Second renderer" };
const review = { id: "pr-12345678", url: "http://localhost:23456", tailnetUrl: "https://agent.example.ts.net:34567/", publishing: false };

function openingFixture() {
  let available = [firstRenderer, secondRenderer];
  const terminals: string[] = [];
  const notices: string[] = [];
  const modes: string[] = [];
  const choices: string[][] = [];
  const answers: (string | undefined)[] = [];
  const opening = new PlannotatorReviewOpening({
    getReviews: () => [review], getRenderers: async () => available,
    retryTailnet: async () => {}, openTerminal: async (id, rendererId) => { assert.equal(id, review.id); terminals.push(rendererId); },
  }, {
    select: async (_title, options) => { choices.push(options); return answers.shift(); },
    notify: (message) => notices.push(message), modeChanged: (mode) => modes.push(mode),
  });
  return { opening, terminals, notices, modes, choices, answers, setRenderers: (renderers: typeof available) => { available = renderers; } };
}

test("Ask offers a browser link without broadcasting a terminal request", async () => {
  const fixture = openingFixture();
  fixture.answers.push("Browser link");
  await fixture.opening.openNewReview(review);
  assert.equal(fixture.choices[0][0], "Browser link");
  assert.deepEqual(fixture.terminals, []);
  assert.ok(fixture.notices[0].includes(review.tailnetUrl));
});

test("a process preference targets exactly one renderer and can switch to phone-link mode", async () => {
  const fixture = openingFixture();
  fixture.answers.push(`${secondRenderer.label} · ${secondRenderer.id.slice(0, 6)}`);
  await fixture.opening.handleCommand("mode terminal");
  await fixture.opening.openNewReview(review);
  assert.deepEqual(fixture.terminals, [secondRenderer.id]);
  await fixture.opening.handleCommand("mode link");
  await fixture.opening.openNewReview(review);
  assert.equal(fixture.terminals.length, 1);
  assert.equal(fixture.modes.at(-1), "link");
  assert.ok(fixture.notices.at(-1)?.includes(review.tailnetUrl));
});

test("a lost renderer falls back to a choice instead of selecting another computer", async () => {
  const fixture = openingFixture();
  fixture.setRenderers([firstRenderer]);
  await fixture.opening.handleCommand("mode terminal");
  fixture.setRenderers([secondRenderer]);
  fixture.answers.push("Browser link");
  await fixture.opening.openNewReview(review);
  assert.deepEqual(fixture.terminals, []);
  assert.equal(fixture.modes.at(-1), "ask");
  assert.ok(fixture.notices.some((notice) => notice.includes("no longer available")));
});

test("link-only opening works without any renderer and list/reopen never creates a new review", async () => {
  const fixture = openingFixture();
  fixture.setRenderers([]);
  await fixture.opening.handleCommand("link latest");
  await fixture.opening.handleCommand("list");
  assert.equal(fixture.notices.length, 2);
  assert.ok(fixture.notices.every((notice) => notice.includes(review.tailnetUrl)));
  assert.deepEqual(fixture.terminals, []);
  await assert.rejects(fixture.opening.handleCommand("link unknown"), /review ID/);
  await assert.rejects(fixture.opening.handleCommand("mode invalid"), /mode must/);
});

test("cancelling a destination chooser keeps the review and never opens a browser elsewhere", async () => {
  const fixture = openingFixture();
  fixture.answers.push(undefined);
  await fixture.opening.openNewReview(review);
  assert.deepEqual(fixture.terminals, []);
  assert.deepEqual(fixture.notices, []);
});

test("late UI completion after runtime replacement does not launch a terminal", async () => {
  let complete: ((value: string) => void) | undefined;
  let launches = 0;
  const opening = new PlannotatorReviewOpening({
    getReviews: () => [review], getRenderers: async () => [firstRenderer], retryTailnet: async () => {},
    openTerminal: async () => { launches++; },
  }, {
    select: async () => new Promise<string>((resolve) => { complete = resolve; }), notify: () => {}, modeChanged: () => {},
  });
  const pending = opening.openNewReview(review);
  await new Promise<void>((resolve) => setImmediate(resolve));
  opening.stop();
  complete!(`Terminal tab · ${firstRenderer.label} · ${firstRenderer.id.slice(0, 6)}`);
  await pending;
  assert.equal(launches, 0);
});

test("renderer leases are deduplicated, follow moved anchors, and clear only their own metadata", async () => {
  const calls: { method: string; params: Record<string, unknown> }[] = [];
  const anchor: HerdrPaneRecord = { pane_id: "w1:p1", tab_id: "w1:t1", workspace_id: "w1", terminal_id: "stable-terminal" };
  const registration = new PlannotatorRendererRegistration({ socket: "unused.sock" }, firstRenderer, async (method, params) => {
    calls.push({ method, params: params as Record<string, unknown> });
  });
  registration.update([anchor]);
  await registration.refresh(1000);
  await registration.refresh(2000);
  assert.equal(calls.length, 1);
  registration.update([{ ...anchor, pane_id: "wMoved:p9" }]);
  await registration.refresh(6000);
  await registration.stop();
  assert.equal(calls[1].params.pane_id, "wMoved:p9");
  assert.deepEqual(calls[2].params.tokens, { [`${PLANNOTATOR_RENDERER_TOKEN_PREFIX}${firstRenderer.id}`]: null });
  assert.ok(calls.every((call) => call.method === "pane.report_metadata"));
});

test("two relays observe the same request but only the selected renderer opens a tab", async () => {
  const calls: Record<string, unknown>[] = [];
  const pane: HerdrPaneRecord = { pane_id: "w1:p1", workspace_id: "w1", tab_id: "w1:t1", terminal_id: "producer", tokens: {
    plannotator_0123456789abcdef0123: encodePlannotatorRoute(review.url, secondRenderer.id),
  } };
  const control = async (method: string, params: object) => {
    if (method === "plugin.pane.open") {
      calls.push(params as Record<string, unknown>);
      return { plugin_pane: { pane: { ...pane, pane_id: "w1:p2", terminal_id: "browser" } } };
    }
    if (method === "pane.list") return { panes: [] };
    return {};
  };
  const first = new PlannotatorTabRelay({ socket: "unused.sock" }, "lease.sock", firstRenderer.id, assert.fail, control);
  const second = new PlannotatorTabRelay({ socket: "unused.sock" }, "lease.sock", secondRenderer.id, assert.fail, control);
  await first.updateSource({ id: "local", label: "Local" }, [pane]);
  assert.equal(calls.length, 0);
  await second.updateSource({ id: "local", label: "Local" }, [pane]);
  assert.equal(calls.length, 1);
  await first.stop();
  await second.stop();
});

test("choosing Browser link does not repeat a failed automatic publication; explicit link command retries", async () => {
  const failedReview = { id: "pr-failed", url: "http://localhost:23456", publishing: false, tailnetError: "401 Unauthorized" };
  let attempts = 0;
  const opening = new PlannotatorReviewOpening({
    getReviews: () => [failedReview], getRenderers: async () => [], openTerminal: async () => assert.fail(),
    retryTailnet: async () => { attempts++; },
  }, {
    select: async () => "Browser link", notify: () => {}, modeChanged: () => {},
  });
  await opening.openNewReview(failedReview);
  assert.equal(attempts, 0, "A failed publication must not retry automatically when the chooser resolves");
  await opening.handleCommand("link");
  assert.equal(attempts, 1);
});

test("a browser-only chooser explains how to make terminal renderers available", async () => {
  const fixture = openingFixture();
  fixture.setRenderers([]);
  fixture.answers.push("Browser link");
  await fixture.opening.openNewReview(review);
  assert.ok(fixture.notices.some((notice) => notice.includes("renderer") && notice.includes("relay")));
});
