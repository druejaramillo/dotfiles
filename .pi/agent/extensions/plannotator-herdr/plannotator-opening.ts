import type { PlannotatorPublishedReview, startPlannotatorPublisher } from "./plannotator-publisher.ts";
import type { PlannotatorRenderer } from "./plannotator-herdr-protocol.ts";

type OpeningPublisher = Pick<Awaited<ReturnType<typeof startPlannotatorPublisher>>, "getReviews" | "getRenderers" | "retryTailnet" | "openTerminal">;
type OpeningPreference = { mode: "ask" | "link" } | { mode: "terminal"; rendererId: string; label: string };
type OpeningUI = {
  select: (title: string, options: string[]) => Promise<string | undefined>;
  notify: (message: string, kind: "info" | "warning") => void;
  modeChanged: (label: string) => void;
};

/** Choose destinations explicitly: a running Pi process cannot infer which device reattached to its terminal. */
export class PlannotatorReviewOpening {
  private preference: OpeningPreference = { mode: "ask" };
  private queue: Promise<void> = Promise.resolve();
  private stopped = false;
  private readonly publisher: OpeningPublisher;
  private readonly ui: OpeningUI;

  constructor(publisher: OpeningPublisher, ui: OpeningUI) {
    this.publisher = publisher;
    this.ui = ui;
    this.ui.modeChanged("ask");
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const pending = this.queue.then(async () => { if (!this.stopped) await operation(); });
    this.queue = pending.catch(() => {});
    return pending;
  }

  private currentReview(id: string): PlannotatorPublishedReview | undefined {
    return this.publisher.getReviews().find((review) => review.id === id);
  }

  private async renderers(): Promise<PlannotatorRenderer[]> {
    try { return await this.publisher.getRenderers(); }
    catch (error) { this.ui.notify(`Plannotator routing: renderer discovery failed: ${String(error)}`, "warning"); return []; }
  }

  private async showLink(id: string): Promise<void> {
    let review = this.currentReview(id);
    if (!review || this.stopped) return;
    if (!review.tailnetUrl) await this.publisher.retryTailnet(id);
    review = this.currentReview(id);
    if (!review || this.stopped) return;
    if (review.tailnetUrl) this.ui.notify(`Plannotator ${review.id}: ${review.tailnetUrl}`, "info");
    else this.ui.notify(`Plannotator: browser link unavailable. ${review.tailnetError ?? "Check Tailscale Serve and retry with /plannotator-open link."}\nSame-host URL only: ${review.url}`, "warning");
  }

  private async chooseRenderer(): Promise<PlannotatorRenderer | undefined> {
    const renderers = await this.renderers();
    if (!renderers.length) {
      this.ui.notify("Plannotator: no renderer is advertising here. Start the updated relay on a rendering computer, or use Browser link.", "warning");
      return;
    }
    if (renderers.length === 1) return renderers[0];
    const labels = renderers.map((renderer) => `${renderer.label} · ${renderer.id.slice(0, 6)}`);
    const selected = await this.ui.select("Open terminal-browser on which renderer?", labels);
    return renderers[labels.indexOf(selected ?? "")];
  }

  private async chooseDestination(id: string): Promise<void> {
    const renderers = await this.renderers();
    if (this.stopped || !this.currentReview(id)) return;
    const labels = renderers.map((renderer) => `Terminal tab · ${renderer.label} · ${renderer.id.slice(0, 6)}`);
    const selected = await this.ui.select("Open Plannotator where? (/plannotator-open mode sets a preference)", ["Browser link", ...labels]);
    if (this.stopped || !this.currentReview(id) || !selected) return;
    if (selected === "Browser link") await this.showLink(id);
    else {
      const renderer = renderers[labels.indexOf(selected)];
      if (renderer) await this.publisher.openTerminal(id, renderer.id);
    }
  }

  /** New reviews follow this process's preference; a missing renderer falls back to an explicit choice. */
  openNewReview(review: PlannotatorPublishedReview): Promise<void> {
    return this.enqueue(async () => {
      if (!this.currentReview(review.id)) return;
      if (this.preference.mode === "link") { await this.showLink(review.id); return; }
      if (this.preference.mode === "terminal") {
        const rendererId = this.preference.rendererId;
        if ((await this.renderers()).some((renderer) => renderer.id === rendererId)) {
          await this.publisher.openTerminal(review.id, rendererId);
          return;
        }
        this.preference = { mode: "ask" };
        this.ui.modeChanged("ask");
        this.ui.notify("Plannotator: your selected renderer is no longer available. Choose where to open this review.", "warning");
      }
      await this.chooseDestination(review.id);
    });
  }

  private async changeMode(mode?: string): Promise<void> {
    if (!mode) {
      const selected = await this.ui.select("Opening preference until /reload or a new Pi session", ["Ask for each review", "Browser link", "Terminal tab"]);
      mode = selected === "Ask for each review" ? "ask" : selected === "Browser link" ? "link" : selected === "Terminal tab" ? "terminal" : undefined;
      if (!mode) return;
    }
    if (mode === "ask" || mode === "link") this.preference = { mode };
    else if (mode === "terminal") {
      const renderer = await this.chooseRenderer();
      if (!renderer || this.stopped) return;
      this.preference = { mode, rendererId: renderer.id, label: renderer.label };
    } else throw new Error("Plannotator routing: mode must be ask, terminal, or link.");
    if (this.stopped) return;
    this.ui.modeChanged(this.preference.mode === "terminal" ? `terminal · ${this.preference.label}` : this.preference.mode);
  }

  private async chooseReview(id?: string): Promise<PlannotatorPublishedReview | undefined> {
    const reviews = this.publisher.getReviews();
    if (!reviews.length) { this.ui.notify("Plannotator: no live reviews in this Pi process.", "info"); return; }
    if (id === "latest") return reviews.at(-1);
    if (id) {
      const matches = reviews.filter((review) => review.id.startsWith(id));
      if (matches.length !== 1) throw new Error("Plannotator routing: review ID is missing or ambiguous; use /plannotator-open list.");
      return matches[0];
    }
    if (reviews.length === 1) return reviews[0];
    const labels = reviews.map((review) => `${review.id} · ${review.url}`);
    const selected = await this.ui.select("Which existing Plannotator review?", labels);
    return reviews[labels.indexOf(selected ?? "")];
  }

  /** Reopen an existing review, list its links, or change preference without creating another review server. */
  handleCommand(args: string): Promise<void> {
    return this.enqueue(async () => {
      const [action, id, ...extra] = args.trim().split(/\s+/);
      if (extra.length || (action === "list" && id)) throw new Error("Plannotator routing: use /plannotator-open [link|terminal] [review-id], list, or mode [ask|terminal|link].");
      if (action === "mode") { await this.changeMode(id); return; }
      if (action === "list") {
        const reviews = this.publisher.getReviews();
        this.ui.notify(reviews.length ? reviews.map((review) => `${review.id}\n${review.tailnetUrl ?? `Link ${review.publishing ? "starting" : "unavailable"}; same-host only: ${review.url}`}`).join("\n\n") : "Plannotator: no live reviews in this Pi process.", "info");
        return;
      }
      if (action && action !== "link" && action !== "terminal") throw new Error("Plannotator routing: use /plannotator-open [link|terminal] [review-id], list, or mode [ask|terminal|link].");
      const review = await this.chooseReview(id);
      if (!review || this.stopped) return;
      if (action === "link") await this.showLink(review.id);
      else if (action === "terminal") {
        const renderer = await this.chooseRenderer();
        if (renderer && !this.stopped && this.currentReview(review.id)) await this.publisher.openTerminal(review.id, renderer.id);
      } else await this.chooseDestination(review.id);
    });
  }

  /** Ignore a dialog that resolves after the originating Pi runtime has been replaced. */
  stop(): void { this.stopped = true; }
}
