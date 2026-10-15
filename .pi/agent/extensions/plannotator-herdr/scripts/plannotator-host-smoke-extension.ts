import { basename } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { runPlannotatorTailnetSmoke } from "./plannotator-tailnet-smoke.ts";

/** Opt-in host integration test: no prompts or model calls; only the disposable tailnet probe runs. */
export default function plannotatorHostSmokeExtension(pi: ExtensionAPI): void {
  pi.registerFlag("plannotator-publish-probe", { type: "boolean", description: "Publish a disposable HTTPS probe, then exit without an agent turn" });
  pi.on("session_start", async (_event, ctx) => {
    if (pi.getFlag("plannotator-publish-probe") !== true) {
      console.error("Plannotator host smoke test requires --plannotator-publish-probe.");
      process.exitCode = 1;
      ctx.shutdown();
      return;
    }
    try {
      console.log(`Plannotator host smoke: executable=${basename(process.execPath)}, bundled=${Boolean(process.versions.bun)}.`);
      await runPlannotatorTailnetSmoke();
      console.log("PASS: Plannotator worker IPC and HTTPS publication from the actual Pi host.");
    } catch (error) {
      console.error(`FAIL: Plannotator host smoke: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    } finally {
      ctx.shutdown();
    }
  });
}
