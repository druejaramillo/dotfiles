import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { callHerdrApi, plannotatorServerIsListening } from "./herdr-json-api.ts";
import { collectPlannotatorRenderers, createPlannotatorRequestToken, encodePlannotatorRoute, PLANNOTATOR_REQUEST_TTL_MS, validatePlannotatorUrl, type HerdrPaneRecord, type PlannotatorRenderer } from "./plannotator-herdr-protocol.ts";
import type { PlannotatorTailnetPublication } from "./plannotator-tailnet.ts";

/** A live review has independent terminal and browser-link destinations. */
export interface PlannotatorPublishedReview {
  id: string;
  url: string;
  tailnetUrl?: string;
  tailnetError?: string;
  publishing: boolean;
  rendererId?: string;
}

type PublishedReview = {
  snapshot: PlannotatorPublishedReview;
  misses: number;
  route?: { token: string; value: string; refreshedAt: number };
  publication?: PlannotatorTailnetPublication;
  publishing?: Promise<void>;
};

/** UI and publication hooks run in Pi, not in the detached PLANNOTATOR_BROWSER opener. */
export interface PlannotatorPublisherOptions {
  herdr?: { socket: string; callerPaneId: string };
  reportError: (message: string) => void;
  onOpen: (review: PlannotatorPublishedReview) => void | Promise<void>;
  onChange: (reviews: PlannotatorPublishedReview[]) => void;
  publishTailnet: (url: string, reportFailure: (message: string) => void) => Promise<PlannotatorTailnetPublication>;
}

/** Publish live review links without Herdr; advertise terminal requests only after a renderer is selected. */
export async function startPlannotatorPublisher(options: PlannotatorPublisherOptions) {
  const directory = await mkdtemp(join(tmpdir(), "pi-plannotator-herdr-"));
  const socketPath = join(directory, "open.sock");
  const endpoint = options.herdr ? { socket: options.herdr.socket } : undefined;
  const reviews = new Map<string, PublishedReview>();
  const metadataWrites = new Set<Promise<void>>();
  const connections = new Set<Socket>();
  let stopped = false;
  let stopPromise: Promise<void> | undefined;
  let ticking = false;
  let routeQueue: Promise<void> = Promise.resolve();
  let openQueue: Promise<void> = Promise.resolve();

  function reportPublisherError(message: string): void {
    if (stopped) return;
    try { options.reportError(message); } catch { console.error(message); }
  }
  function getReviews(): PlannotatorPublishedReview[] {
    return [...reviews.values()].map((review) => ({ ...review.snapshot }));
  }
  function changed(): void {
    if (stopped) return;
    try { options.onChange(getReviews()); } catch (error) { reportPublisherError(String(error)); }
  }
  function serializeRoute<T>(operation: () => Promise<T>): Promise<T> {
    const pending = routeQueue.then(operation);
    routeQueue = pending.then(() => {}, () => {});
    return pending;
  }
  async function reportToken(token: string, value: string | null): Promise<void> {
    if (!endpoint || !options.herdr || (stopped && value !== null)) return;
    const update = (async () => {
      const { pane } = await callHerdrApi<{ pane: HerdrPaneRecord }>(endpoint, "pane.current", { caller_pane_id: options.herdr!.callerPaneId });
      if (stopped && value !== null) return;
      await callHerdrApi(endpoint, "pane.report_metadata", {
        pane_id: pane.pane_id, source: "pi:plannotator-herdr", tokens: { [token]: value }, ttl_ms: PLANNOTATOR_REQUEST_TTL_MS,
      });
    })();
    metadataWrites.add(update);
    try { await update; } finally { metadataWrites.delete(update); }
  }
  async function getRenderers(): Promise<PlannotatorRenderer[]> {
    if (!endpoint || stopped) return [];
    const { panes } = await callHerdrApi<{ panes: HerdrPaneRecord[] }>(endpoint, "pane.list");
    return collectPlannotatorRenderers(panes);
  }
  function findReview(id: string): PublishedReview {
    const review = reviews.get(id);
    if (!review || stopped) throw new Error("Plannotator routing: this review is no longer open.");
    return review;
  }
  function publishLink(review: PublishedReview): Promise<void> {
    if (review.publishing) return review.publishing;
    if (review.publication || stopped) return Promise.resolve();
    review.snapshot.publishing = true;
    delete review.snapshot.tailnetError;
    changed();
    review.publishing = (async () => {
      try {
        const publication = await options.publishTailnet(review.snapshot.url, (message) => {
          if (stopped || !reviews.has(review.snapshot.id)) return;
          delete review.snapshot.tailnetUrl;
          review.snapshot.tailnetError = message;
          const failed = review.publication;
          review.publication = undefined;
          void failed?.stop().catch((error: unknown) => reportPublisherError(String(error)));
          changed();
          reportPublisherError(message);
        });
        if (stopped || !reviews.has(review.snapshot.id)) { await publication.stop(); return; }
        review.publication = publication;
        review.snapshot.tailnetUrl = publication.url;
      } catch (error) {
        review.snapshot.tailnetError = error instanceof Error ? error.message : String(error);
        reportPublisherError(review.snapshot.tailnetError);
      } finally {
        review.snapshot.publishing = false;
        review.publishing = undefined;
        changed();
      }
    })();
    return review.publishing;
  }
  async function openReview(rawUrl: unknown): Promise<void> {
    if (stopped) throw new Error("Plannotator routing: the Pi session is shutting down.");
    const url = validatePlannotatorUrl(rawUrl);
    if ([...reviews.values()].some((review) => review.snapshot.url === url)) return;
    if (!(await plannotatorServerIsListening(url))) throw new Error("Plannotator routing: the review server is not listening.");
    if (stopped) throw new Error("Plannotator routing: the Pi session is shutting down.");
    const id = `pr-${createPlannotatorRequestToken().slice(12)}`;
    const review: PublishedReview = { snapshot: { id, url, publishing: false }, misses: 0 };
    reviews.set(id, review);
    void publishLink(review);
    // The opener acknowledges immediately. UI selection must never hold up its private socket request.
    void Promise.resolve().then(() => options.onOpen({ ...review.snapshot })).catch((error: unknown) => reportPublisherError(String(error)));
  }
  async function releaseReview(review: PublishedReview): Promise<void> {
    reviews.delete(review.snapshot.id);
    changed();
    await serializeRoute(async () => {
      if (review.route) await reportToken(review.route.token, null).catch((error: unknown) => reportPublisherError(String(error)));
      review.route = undefined;
    });
    await review.publishing;
    await review.publication?.stop().catch((error: unknown) => reportPublisherError(String(error)));
  }
  async function tickReviews(): Promise<void> {
    if (ticking || stopped) return;
    ticking = true;
    try {
      await Promise.all([...reviews.values()].map(async (review) => {
        const listening = await plannotatorServerIsListening(review.snapshot.url);
        if (stopped || !reviews.has(review.snapshot.id)) return;
        review.misses = listening ? 0 : review.misses + 1;
        if (review.misses >= 3) await releaseReview(review);
        else if (review.route && Date.now() - review.route.refreshedAt >= 5000) {
          await serializeRoute(async () => {
            if (stopped || !reviews.has(review.snapshot.id) || !review.route) return;
            await reportToken(review.route.token, review.route.value);
            review.route.refreshedAt = Date.now();
          });
        }
      }));
    } catch (error) { reportPublisherError(error instanceof Error ? error.message : String(error)); }
    finally { ticking = false; }
  }

  const server = createServer((connection) => {
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
        let id = randomUUID() as string;
        try {
          const request = JSON.parse(buffer.slice(0, newline)) as { id: string; method: string; params?: { url?: unknown } };
          id = request.id;
          if (request.method !== "open") throw new Error("Plannotator routing: unsupported launcher request.");
          const pending = openQueue.then(() => openReview(request.params?.url));
          openQueue = pending.catch(() => {});
          await pending;
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
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(socketPath, resolve); });
  } catch (error) { await rm(directory, { recursive: true, force: true }); throw error; }
  const interval = setInterval(() => { void tickReviews(); }, 1000);
  interval.unref();

  return {
    socket: socketPath,
    getReviews,
    getRenderers,
    retryTailnet(id: string): Promise<void> { return publishLink(findReview(id)); },
    openTerminal(id: string, rendererId: string): Promise<void> {
      return serializeRoute(async () => {
        const review = findReview(id);
        if (!(await getRenderers()).some((renderer) => renderer.id === rendererId)) throw new Error("Plannotator routing: the selected renderer is unavailable; choose another renderer or Browser link.");
        findReview(id); // The review may have ended while renderer discovery was in flight.
        if (review.route) await reportToken(review.route.token, null);
        // A new request token also lets the user reopen a browser they closed manually.
        review.route = { token: createPlannotatorRequestToken(), value: encodePlannotatorRoute(review.snapshot.url, rendererId), refreshedAt: Date.now() };
        await reportToken(review.route.token, review.route.value);
        review.snapshot.rendererId = rendererId;
        changed();
      });
    },
    stop(): Promise<void> {
      stopPromise ??= (async () => {
        stopped = true;
        clearInterval(interval);
        for (const connection of connections) connection.destroy();
        server.close();
        await openQueue;
        await routeQueue;
        await Promise.allSettled([...metadataWrites]);
        await Promise.all([...reviews.values()].map(releaseReview));
        await rm(directory, { recursive: true, force: true });
      })();
      return stopPromise;
    },
  };
}
