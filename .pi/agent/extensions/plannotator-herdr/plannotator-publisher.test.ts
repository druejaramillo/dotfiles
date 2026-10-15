import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test, type TestContext } from "node:test";
import { callHerdrApi } from "./herdr-json-api.ts";
import { startPlannotatorPublisher, type PlannotatorPublishedReview } from "./plannotator-publisher.ts";

async function createReviewFixture(t: TestContext): Promise<string> {
  const server = createServer((_req, res) => res.end("live review"));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${address.port}`;
}

test("without Herdr a concurrent native opener creates one phone link and acknowledges before UI completes", async (t) => {
  const url = await createReviewFixture(t);
  let publications = 0;
  let publicationStops = 0;
  let opens = 0;
  let finishUI: (() => void) | undefined;
  const publisher = await startPlannotatorPublisher({
    reportError: assert.fail, onChange: () => {},
    onOpen: async () => { opens++; await new Promise<void>((resolve) => { finishUI = resolve; }); },
    publishTailnet: async () => {
      publications++;
      return { url: "https://agent.example.ts.net:23456", stop: async () => { publicationStops++; } };
    },
  });
  t.after(() => publisher.stop());
  await Promise.all([1, 2].map(() => callHerdrApi({ socket: publisher.socket }, "open", { url })));
  assert.equal(opens, 1);
  assert.equal(publications, 1);
  assert.equal(publisher.getReviews()[0].tailnetUrl, "https://agent.example.ts.net:23456");
  assert.deepEqual(await publisher.getRenderers(), []);
  await assert.rejects(publisher.openTerminal(publisher.getReviews()[0].id, "a123456789abcdef0123"), /renderer is unavailable/);
  finishUI!();
  await publisher.stop();
  assert.equal(publicationStops, 1);
});

test("a failed link stays retryable without abandoning or recreating the native review", async (t) => {
  const url = await createReviewFixture(t);
  const errors: string[] = [];
  let fail = true;
  const publisher = await startPlannotatorPublisher({
    reportError: (message) => errors.push(message), onChange: () => {}, onOpen: () => {},
    publishTailnet: async () => {
      if (fail) throw new Error("Tailscale unavailable");
      return { url: "https://agent.example.ts.net:23456", stop: async () => {} };
    },
  });
  t.after(() => publisher.stop());
  await callHerdrApi({ socket: publisher.socket }, "open", { url });
  const id = publisher.getReviews()[0].id;
  assert.equal(errors.length, 1);
  assert.match(publisher.getReviews()[0].tailnetError!, /unavailable/);
  fail = false;
  await publisher.retryTailnet(id);
  assert.equal(publisher.getReviews()[0].id, id);
  assert.equal(publisher.getReviews()[0].tailnetError, undefined);
  assert.equal(publisher.getReviews()[0].tailnetUrl, "https://agent.example.ts.net:23456");
});

test("concurrent shutdown callers wait for a late publication and suppress stale UI updates", async (t) => {
  const url = await createReviewFixture(t);
  let complete: (() => void) | undefined;
  let publicationStops = 0;
  const changes: PlannotatorPublishedReview[][] = [];
  const publisher = await startPlannotatorPublisher({
    reportError: assert.fail, onChange: (reviews) => changes.push(reviews), onOpen: () => {},
    publishTailnet: async () => {
      await new Promise<void>((resolve) => { complete = resolve; });
      return { url: "https://agent.example.ts.net:23456", stop: async () => { publicationStops++; } };
    },
  });
  t.after(() => publisher.stop());
  await callHerdrApi({ socket: publisher.socket }, "open", { url });
  const beforeShutdown = changes.length;
  const first = publisher.stop();
  const second = publisher.stop();
  assert.equal(first, second);
  complete!();
  await second;
  assert.equal(publicationStops, 1);
  assert.equal(changes.length, beforeShutdown);
  assert.deepEqual(publisher.getReviews(), []);
});

test("invalid opener URLs fail without publication or UI side effects", async (t) => {
  let publications = 0;
  const publisher = await startPlannotatorPublisher({
    reportError: () => {}, onChange: () => assert.fail("Invalid URLs must not update the UI"), onOpen: () => assert.fail("Invalid URLs must not open a review"),
    publishTailnet: async () => { publications++; throw new Error("must not run"); },
  });
  t.after(() => publisher.stop());
  await assert.rejects(callHerdrApi({ socket: publisher.socket }, "open", { url: "http://remote.example:23456" }), /loopback/);
  assert.equal(publications, 0);
  assert.deepEqual(publisher.getReviews(), []);
});
