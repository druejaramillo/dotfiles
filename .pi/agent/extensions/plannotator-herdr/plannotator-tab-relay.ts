import { callHerdrApi, type HerdrApiEndpoint } from "./herdr-json-api.ts";
import { collectPlannotatorRequests, PLANNOTATOR_RELAY_PLUGIN_ID, type HerdrMachineProfile, type HerdrPaneRecord, type PlannotatorBrowserRequest } from "./plannotator-herdr-protocol.ts";

/** Source identity is machine-scoped, even when two servers issue identical pane IDs. */
export interface PlannotatorReviewSource {
  id: string;
  label: string;
  machine?: HerdrMachineProfile;
}

type OwnedBrowserTab = { request: PlannotatorBrowserRequest; pane?: HerdrPaneRecord };
type SourceState = { source: PlannotatorReviewSource; desired: Map<string, PlannotatorBrowserRequest>; owned: Map<string, OwnedBrowserTab> };
type HerdrControl = (method: string, params: object) => Promise<unknown>;

/** Only the local relay can create rendering processes; remote requests carry a saved --ssh target. */
export class PlannotatorTabRelay {
  private readonly sources = new Map<string, SourceState>();
  private queue: Promise<void> = Promise.resolve();
  private stopped = false;
  private readonly control: HerdrControl;
  private readonly leaseSocket: string;
  private readonly reportError: (message: string) => void;

  constructor(
    localEndpoint: HerdrApiEndpoint,
    leaseSocket: string,
    reportError: (message: string) => void,
    control?: HerdrControl,
  ) {
    if (!("socket" in localEndpoint)) throw new Error("Plannotator Herdr: browser tabs require a local Herdr socket.");
    this.leaseSocket = leaseSocket;
    this.reportError = reportError;
    this.control = control ?? ((method, params) => callHerdrApi(localEndpoint, method, params));
  }

  /** Coalesce metadata heartbeats and serialize creates/closes to prevent duplicate or orphan tabs. */
  updateSource(source: PlannotatorReviewSource, panes: HerdrPaneRecord[]): Promise<void> {
    if (this.stopped) return Promise.resolve();
    let state = this.sources.get(source.id);
    if (!state) {
      state = { source, desired: new Map(), owned: new Map() };
      this.sources.set(source.id, state);
    }
    state.source = source;
    state.desired = collectPlannotatorRequests(panes);
    const current = state;
    this.queue = this.queue.then(() => this.reconcileSource(current)).catch((error: unknown) => {
      this.reportError(error instanceof Error ? error.message : String(error));
    });
    return this.queue;
  }

  private async closeOwnedBrowser(owned: OwnedBrowserTab): Promise<void> {
    if (!owned.pane) return;
    // Terminal identity protects against stale IDs, and follows panes moved by the user.
    const result = await this.control("pane.list", {}) as { panes: HerdrPaneRecord[] };
    const pane = result.panes.find((candidate) => candidate.terminal_id === owned.pane?.terminal_id);
    if (pane) await this.control("plugin.pane.close", { pane_id: pane.pane_id });
  }

  private async reconcileSource(state: SourceState): Promise<void> {
    for (const [key, owned] of state.owned) {
      if (!this.stopped && state.desired.get(key)?.url === owned.request.url) continue;
      try { await this.closeOwnedBrowser(owned); }
      catch (error) { this.reportError(`Plannotator Herdr cleanup: ${error instanceof Error ? error.message : String(error)}`); }
      state.owned.delete(key);
    }
    if (this.stopped) return;
    for (const [key, request] of state.desired) {
      if (state.owned.has(key)) continue;
      // Record before awaiting launch. A manually closed browser stays closed until this request ends.
      const owned: OwnedBrowserTab = { request };
      state.owned.set(key, owned);
      try {
        const response = await this.control("plugin.pane.open", {
          plugin_id: PLANNOTATOR_RELAY_PLUGIN_ID, entrypoint: "browser", placement: "tab", focus: true,
          ...(state.source.machine ? {} : { workspace_id: request.pane.workspace_id }),
          env: {
            PLANNOTATOR_HERDR_URL: request.url,
            PLANNOTATOR_HERDR_SSH_TARGET: state.source.machine?.target ?? "",
            PLANNOTATOR_HERDR_RELAY_SOCKET: this.leaseSocket,
          },
        }) as { plugin_pane: { pane: HerdrPaneRecord } };
        owned.pane = response.plugin_pane.pane;
        if (this.stopped || !state.desired.has(key)) {
          await this.closeOwnedBrowser(owned);
          state.owned.delete(key);
          continue;
        }
        await this.control("tab.rename", {
          tab_id: owned.pane.tab_id,
          label: state.source.machine ? `Plannotator · ${state.source.label}` : "Plannotator",
        });
        if (state.source.machine) {
          await this.control("notification.show", {
            title: `Plannotator · ${state.source.label}`,
            body: "Review ready in a Local Plannotator tab. Rendering is local; browser requests use SSH.",
            sound: "none",
          });
        }
      } catch (error) {
        // A rename/notification failure must not discard ownership of a live pane.
        this.reportError(`Plannotator Herdr launch: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /** Close only panes issued to this relay; additional panes the user added to a tab survive. */
  async stop(): Promise<void> {
    this.stopped = true;
    await this.queue;
    await Promise.all([...this.sources.values()].map((state) => this.reconcileSource(state)));
    this.sources.clear();
  }
}
