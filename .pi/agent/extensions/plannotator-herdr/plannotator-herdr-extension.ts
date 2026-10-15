import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { PlannotatorReviewOpening } from "./plannotator-opening.ts";
import { startPlannotatorPublisher } from "./plannotator-publisher.ts";
import { publishPlannotatorTailnet } from "./plannotator-tailnet.ts";

const extensionDirectory = dirname(fileURLToPath(import.meta.url));

/** Older Pi releases lack ctx.mode; use real terminal I/O to exclude their RPC/print sessions. */
export function isInteractivePlannotatorSession(ctx: { mode?: string; hasUI: boolean }, terminalIsTTY: boolean): boolean {
  return ctx.hasUI && (ctx.mode === "tui" || (ctx.mode === undefined && terminalIsTTY));
}

/** Reuse native Plannotator flows while choosing an independent browser link or one advertised terminal renderer. */
export default function plannotatorHerdrExtension(pi: ExtensionAPI): void {
  let publisher: Awaited<ReturnType<typeof startPlannotatorPublisher>> | undefined;
  let opening: PlannotatorReviewOpening | undefined;
  let previousEnvironment: Map<string, string | undefined> | undefined;
  let overrides: Record<string, string> = {};
  let generation = 0;
  let clearUI: (() => void) | undefined;

  async function cleanup(): Promise<void> {
    generation++;
    opening?.stop();
    opening = undefined;
    const active = publisher;
    publisher = undefined;
    try { clearUI?.(); } catch { /* Pi may already have replaced the UI context. */ }
    clearUI = undefined;
    await active?.stop();
    for (const [key, previous] of previousEnvironment ?? []) {
      if (process.env[key] !== overrides[key]) continue;
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
    previousEnvironment = undefined;
  }

  pi.registerCommand("plannotator-open", {
    description: "Choose where to open a live review; list links; mode [ask|terminal|link] sets this Pi process's preference",
    handler: async (args, ctx) => {
      if (!opening) { ctx.ui.notify("Plannotator routing requires an interactive Pi terminal session.", "warning"); return; }
      try { await opening.handleCommand(args); }
      catch (error) { ctx.ui.notify(error instanceof Error ? error.message : String(error), "error"); }
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    await cleanup();
    const terminalIsTTY = !!(process.stdin.isTTY && process.stdout.isTTY);
    if (!isInteractivePlannotatorSession(ctx, terminalIsTTY)) return;
    const currentGeneration = generation;
    const shownLinks = new Set<string>();
    function notify(message: string, kind: "info" | "warning" | "error"): void {
      if (currentGeneration !== generation) return;
      try { ctx.ui.notify(message, kind); } catch { /* Ignore completion after session replacement. */ }
    }
    const herdrSocket = process.env.HERDR_ENV === "1" ? process.env.HERDR_SOCKET_PATH : undefined;
    const callerPaneId = process.env.HERDR_ENV === "1" ? process.env.HERDR_PANE_ID : undefined;
    if (process.env.HERDR_ENV === "1" && (!herdrSocket || !callerPaneId)) {
      notify("Plannotator routing: missing managed pane context; browser links are available, terminal routing is disabled.", "warning");
    }
    try {
      publisher = await startPlannotatorPublisher({
        herdr: herdrSocket && callerPaneId ? { socket: herdrSocket, callerPaneId } : undefined,
        reportError: (message) => notify(message, "warning"),
        onOpen: (review) => opening?.openNewReview(review),
        onChange: (reviews) => {
          if (currentGeneration !== generation) return;
          try {
            ctx.ui.setWidget("plannotator-links", reviews.length ? reviews.flatMap((review) => [
              `Plannotator ${review.id.slice(0, 11)} · /plannotator-open`,
              review.tailnetUrl ?? (review.publishing ? "Private browser link starting…" : "Browser link unavailable · /plannotator-open link to retry"),
            ]) : undefined);
            for (const review of reviews) {
              if (!review.tailnetUrl || shownLinks.has(review.tailnetUrl)) continue;
              shownLinks.add(review.tailnetUrl);
              pi.sendMessage({ customType: "plannotator-browser-link", content: `Plannotator browser link (${review.id}):\n${review.tailnetUrl}`, display: true }, { triggerTurn: false });
            }
          } catch { /* A late publication must not call into a replaced Pi runtime. */ }
        },
        publishTailnet: publishPlannotatorTailnet,
      });
      opening = new PlannotatorReviewOpening(publisher, {
        select: (title, choices) => ctx.ui.select(title, choices),
        notify,
        modeChanged: (label) => { if (currentGeneration === generation) ctx.ui.setStatus("plannotator-opening", `review:${label}`); },
      });
      clearUI = () => { ctx.ui.setWidget("plannotator-links", undefined); ctx.ui.setStatus("plannotator-opening", undefined); };
      overrides = {
        PLANNOTATOR_BROWSER: join(extensionDirectory, "plannotator-open.ts"),
        PLANNOTATOR_HERDR_SOCKET: publisher.socket,
        // Both destinations proxy the real loopback listener; remote mode's wide bind is unnecessary.
        PLANNOTATOR_REMOTE: "0",
        PLANNOTATOR_PORT: "",
        PLANNOTATOR_URL_HOST: "",
      };
      previousEnvironment = new Map(Object.keys(overrides).map((key) => [key, process.env[key]]));
      Object.assign(process.env, overrides);
    } catch (error) {
      notify(`Plannotator routing: ${error instanceof Error ? error.message : String(error)}`, "error");
      await cleanup();
    }
  });
  pi.on("session_shutdown", cleanup);
}
