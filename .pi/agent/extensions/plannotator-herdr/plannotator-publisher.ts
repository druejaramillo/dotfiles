import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { callHerdrApi, plannotatorServerIsListening } from "./herdr-json-api.ts";
import { createPlannotatorRequestToken, PLANNOTATOR_REQUEST_TTL_MS, validatePlannotatorUrl, type HerdrPaneRecord } from "./plannotator-herdr-protocol.ts";

type PublishedReview = { token: string; url: string; misses: number; refreshedAt: number };

/** Publish review URLs from a managed Pi pane without ever launching a remote browser. */
export async function startPlannotatorPublisher(
  herdrSocket: string,
  callerPaneId: string,
  reportError: (message: string) => void,
): Promise<{ socket: string; stop: () => Promise<void> }> {
  const directory = await mkdtemp(join(tmpdir(), "pi-plannotator-herdr-"));
  const socketPath = join(directory, "open.sock");
  const endpoint = { socket: herdrSocket };
  const reviews = new Map<string, PublishedReview>();
  const metadataWrites = new Set<Promise<void>>();
  const connections = new Set<Socket>();
  let stopped = false;
  let ticking = false;
  let server: Server;

  function reportPublisherError(message: string): void {
    if (stopped) return;
    try { reportError(message); } catch { console.error(message); }
  }

  async function reportToken(token: string, value: string | null): Promise<void> {
    if (stopped && value !== null) return;
    const update = (async () => {
      // Inherited caller context follows a moved pane; never fall back to UI focus.
      const { pane } = await callHerdrApi<{ pane: HerdrPaneRecord }>(endpoint, "pane.current", { caller_pane_id: callerPaneId });
      if (stopped && value !== null) return;
      await callHerdrApi(endpoint, "pane.report_metadata", {
        pane_id: pane.pane_id, source: "pi:plannotator-herdr", tokens: { [token]: value }, ttl_ms: PLANNOTATOR_REQUEST_TTL_MS,
      });
    })();
    metadataWrites.add(update);
    try { await update; } finally { metadataWrites.delete(update); }
  }

  async function openReview(rawUrl: unknown): Promise<void> {
    if (stopped) throw new Error("Plannotator Herdr: the Pi session is shutting down.");
    const url = validatePlannotatorUrl(rawUrl);
    if ([...reviews.values()].some((review) => review.url === url)) return;
    if (!(await plannotatorServerIsListening(url))) {
      throw new Error("Plannotator Herdr: the review server is not listening.");
    }
    if (stopped) throw new Error("Plannotator Herdr: the Pi session is shutting down.");
    const review = { token: createPlannotatorRequestToken(), url, misses: 0, refreshedAt: Date.now() };
    reviews.set(review.token, review);
    try {
      await reportToken(review.token, review.url);
      if (stopped) await reportToken(review.token, null);
    } catch (error) {
      reviews.delete(review.token);
      throw error;
    }
  }

  async function tickReviews(): Promise<void> {
    if (ticking || stopped) return;
    ticking = true;
    try {
      await Promise.all([...reviews.values()].map(async (review) => {
        const listening = await plannotatorServerIsListening(review.url);
        if (stopped || !reviews.has(review.token)) return;
        review.misses = listening ? 0 : review.misses + 1;
        if (review.misses >= 3) {
          reviews.delete(review.token);
          await reportToken(review.token, null);
        } else if (Date.now() - review.refreshedAt >= 5000) {
          await reportToken(review.token, review.url);
          review.refreshedAt = Date.now();
        }
      }));
    } catch (error) {
      reportPublisherError(error instanceof Error ? error.message : String(error));
    } finally {
      ticking = false;
    }
  }

  server = createServer((connection) => {
    connections.add(connection);
    connection.on("close", () => connections.delete(connection));
    let buffer = "";
    let handled = false;
    connection.setTimeout(8000, () => connection.destroy());
    connection.on("error", () => {});
    connection.on("data", (chunk: Buffer) => {
      if (handled) return;
      buffer += chunk.toString();
      if (buffer.length > 4096) { handled = true; connection.destroy(); return; }
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      handled = true;
      void (async () => {
        let id: string = randomUUID();
        try {
          const request = JSON.parse(buffer.slice(0, newline)) as { id: string; method: string; params?: { url?: unknown } };
          id = request.id;
          if (request.method !== "open") throw new Error("Plannotator Herdr: unsupported launcher request.");
          await openReview(request.params?.url);
          connection.end(`${JSON.stringify({ id, result: { opened: true } })}\n`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          reportPublisherError(message);
          connection.end(`${JSON.stringify({ id, error: { code: "launch_failed", message } })}\n`);
        }
      })();
    });
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(socketPath, resolve);
    });
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  const interval = setInterval(() => { void tickReviews(); }, 1000);
  interval.unref();

  return {
    socket: socketPath,
    async stop() {
      if (stopped) return;
      stopped = true;
      clearInterval(interval);
      for (const connection of connections) connection.destroy();
      server.close();
      // Drain writes before clearing: a late heartbeat must not resurrect a closed review.
      await Promise.allSettled([...metadataWrites]);
      const clear = [...reviews.values()].map((review) => reportToken(review.token, null).catch(() => {}));
      reviews.clear();
      await Promise.all(clear);
      await rm(directory, { recursive: true, force: true });
    },
  };
}
