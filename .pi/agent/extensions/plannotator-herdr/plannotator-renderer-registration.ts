import { callHerdrApi, type HerdrApiEndpoint } from "./herdr-json-api.ts";
import { PLANNOTATOR_RENDERER_TOKEN_PREFIX, PLANNOTATOR_REQUEST_TTL_MS, type HerdrPaneRecord, type PlannotatorRenderer } from "./plannotator-herdr-protocol.ts";

type RendererControl = (method: string, params: object) => Promise<unknown>;

/** Advertise one renderer lease per source server, following an anchor pane's terminal identity. */
export class PlannotatorRendererRegistration {
  private panes: HerdrPaneRecord[] = [];
  private anchor: HerdrPaneRecord | undefined;
  private refreshedAt = 0;
  private stopped = false;
  private pending: Promise<void> | undefined;
  private readonly control: RendererControl;
  private readonly token: string;
  private readonly label: string;

  constructor(endpoint: HerdrApiEndpoint, renderer: PlannotatorRenderer, control?: RendererControl) {
    if (!/^[a-f0-9]{20}$/.test(renderer.id)) throw new Error("Plannotator renderer: invalid identity.");
    this.token = `${PLANNOTATOR_RENDERER_TOKEN_PREFIX}${renderer.id}`;
    this.label = renderer.label.replace(/[\x00-\x1f\x7f]/g, " ").slice(0, 80) || "Terminal renderer";
    this.control = control ?? ((method, params) => callHerdrApi(endpoint, method, params, 4000));
  }

  /** Snapshot updates never write metadata synchronously, avoiding subscription feedback loops. */
  update(panes: HerdrPaneRecord[]): void {
    this.panes = panes;
  }

  /** Refresh at most once per five seconds; Herdr expires the lease after a crash or disconnect. */
  refresh(now = Date.now()): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.pending) return this.pending;
    const anchor = this.panes.find((pane) => pane.terminal_id === this.anchor?.terminal_id) ?? this.panes[0];
    if (!anchor) return Promise.resolve();
    if (anchor.terminal_id === this.anchor?.terminal_id && now - this.refreshedAt < 5000) return Promise.resolve();
    this.anchor = anchor;
    this.refreshedAt = now;
    this.pending = this.control("pane.report_metadata", {
      pane_id: anchor.pane_id,
      source: `pi:plannotator-renderer:${this.token.slice(12)}`,
      tokens: { [this.token]: this.label },
      ttl_ms: PLANNOTATOR_REQUEST_TTL_MS,
    }).then(() => {}).finally(() => { this.pending = undefined; });
    return this.pending;
  }

  /** Remove only this renderer's advertisement; stale leases still expire if the server is unreachable. */
  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    await this.pending?.catch(() => {});
    const anchor = this.panes.find((pane) => pane.terminal_id === this.anchor?.terminal_id);
    if (!anchor) return;
    await this.control("pane.report_metadata", {
      pane_id: anchor.pane_id,
      source: `pi:plannotator-renderer:${this.token.slice(12)}`,
      tokens: { [this.token]: null },
    }).catch(() => {});
  }
}
