import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { publishPlannotatorTailnet, type PlannotatorTailnetPublication } from "../plannotator-tailnet.ts";

const execFileAsync = promisify(execFile);
async function serveState(): Promise<string> {
  const { stdout } = await execFileAsync("tailscale", ["serve", "status", "--json"], { timeout: 5000 });
  function canonical(value: unknown): unknown {
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(canonical);
    return Object.fromEntries(Object.entries(value).filter(([key, child]) => key !== "ETag" && !(key === "Foreground" && child && typeof child === "object" && !Object.keys(child).length)).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)]));
  }
  return JSON.stringify(canonical(JSON.parse(stdout) ?? {}));
}

/** Publish only a disposable marker and verify real HTTPS, origin protection, and complete Serve cleanup. */
export async function runPlannotatorTailnetSmoke(): Promise<void> {
  const before = await serveState();
  const marker = "Disposable Plannotator tailnet probe";
  const review = createServer((_req, res) => { res.setHeader("content-type", "text/plain"); res.end(marker); });
  await new Promise<void>((resolve) => review.listen(0, "127.0.0.1", resolve));
  const address = review.address();
  assert.ok(address && typeof address === "object");
  let publication: PlannotatorTailnetPublication | undefined;
  let publicationFailure: string | undefined;
  try {
    publication = await publishPlannotatorTailnet(`http://127.0.0.1:${address.port}`, (message) => { publicationFailure = message; });
    const response = await fetch(publication.url, { signal: AbortSignal.timeout(20_000) });
    assert.equal(response.status, 200, "The serving host's Tailscale login must reach the probe over HTTPS");
    assert.equal(await response.text(), marker);
    const refused = await fetch(publication.url, { method: "POST", headers: { Origin: "https://foreign.invalid" }, signal: AbortSignal.timeout(10_000) });
    assert.equal(refused.status, 403, "Cross-origin writes must be refused");
    await refused.text();
    assert.equal(publicationFailure, undefined);
    console.log("PASS: real HTTPS publication, identity-checked access, and cross-origin rejection.");
  } finally {
    await publication?.stop();
    review.closeAllConnections();
    await new Promise<void>((resolve) => review.close(() => resolve()));
    const deadline = Date.now() + 5000;
    while (await serveState() !== before) {
      if (Date.now() > deadline) throw new Error("Plannotator smoke test: Serve state differs from the initial snapshot; inspect tailscale serve status. No global reset was attempted.");
      await delay(100);
    }
    console.log("PASS: probe stopped and the pre-existing Serve configuration is unchanged.");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv[2] !== "--publish-probe") {
    throw new Error("Plannotator smoke test: pass --publish-probe to temporarily publish a disposable probe over your tailnet. No review content is used.");
  }
  await runPlannotatorTailnetSmoke();
}
