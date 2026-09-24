import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import webScreenshotExtension, {
  resolveScreenshotTarget,
  validateScreenshotRequest,
} from "./index.ts";

const root = await mkdtemp(join(tmpdir(), "pi-web-screenshot-test-"));
let screenshotTool;
let shutdown;
webScreenshotExtension({
  registerTool: (tool) => {
    screenshotTool = tool;
  },
  on: (event, handler) => {
    if (event === "session_shutdown") shutdown = handler;
  },
});
const html = join(root, "page.html");
await writeFile(
  html,
  "<!doctype html><title>Preview</title><h1>Screenshot test</h1>",
);
const server = createServer((_request, response) => {
  response.setHeader("content-type", "text/html");
  response.end("<!doctype html><h1>Served route</h1>");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}/test`;

try {
  await test("validates batch sizes and arbitrary CSS pixel resolutions", () => {
    assert.deepEqual(validateScreenshotRequest({ pages: [url] }), [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]);
    assert.deepEqual(
      validateScreenshotRequest({
        pages: [url],
        viewports: [{ width: 1760, height: 1080 }],
      }),
      [{ width: 1760, height: 1080 }],
    );
    assert.throws(
      () =>
        validateScreenshotRequest({
          pages: [url, url, url, url],
          viewports: Array(3).fill({ width: 500, height: 500 }),
        }),
      /8 images/,
    );
    assert.throws(
      () =>
        validateScreenshotRequest({
          pages: [url],
          viewports: [{ width: 100, height: 200 }],
        }),
      /320 to 4096/,
    );
    assert.throws(
      () =>
        validateScreenshotRequest({
          pages: [url],
          viewports: [
            { width: 4096, height: 4096 },
            { width: 4096, height: 4096 },
          ],
        }),
      /32 million/,
    );
    assert.throws(
      () =>
        validateScreenshotRequest({
          pages: [url],
          fullPage: true,
          scrollY: 100,
        }),
      /cannot be combined/,
    );
    assert.throws(
      () => validateScreenshotRequest({ pages: [url], colorScheme: "sepia" }),
      /light or dark/,
    );
  });

  await test("resolves local paths inside cwd, rejects traversal, symlink escape and unsafe schemes", async () => {
    assert.equal(
      await resolveScreenshotTarget("page.html", root),
      new URL(`file://${html}`).href,
    );
    assert.equal(await resolveScreenshotTarget(url, root), url);
    assert.equal(
      await resolveScreenshotTarget(new URL(`file://${html}`).href, root),
      new URL(`file://${html}`).href,
    );
    await symlink("/etc/passwd", join(root, "outside.html"));
    await assert.rejects(
      resolveScreenshotTarget("outside.html", root),
      /inside the working directory/,
    );
    await assert.rejects(
      resolveScreenshotTarget("/etc/passwd", root),
      /inside the working directory/,
    );
    await assert.rejects(
      resolveScreenshotTarget("data:text/html,hi", root),
      /HTTP\(S\)/,
    );
  });

  await test("one call returns labelled screenshot attachments and saved JPEGs for multiple pages and sizes", async () => {
    assert.equal(screenshotTool.name, "web_screenshot");
    const result = await screenshotTool.execute(
      "call",
      {
        pages: [url, "page.html"],
        viewports: [
          { width: 440, height: 650 },
          { width: 900, height: 700 },
        ],
        waitMs: 0,
      },
      undefined,
      undefined,
      { cwd: root },
    );
    assert.equal(
      result.details.paths.length,
      4,
      result.details.errors.join("\n"),
    );
    assert.equal(
      result.content.filter((item) => item.type === "image").length,
      4,
    );
    assert.match(result.content[0].text, /Captured 4\/4 screenshots/);
    for (const image of result.content.slice(1)) {
      assert.equal(image.mimeType, "image/jpeg");
      assert.deepEqual(
        Buffer.from(image.data, "base64"),
        await readFile(result.details.paths[result.content.indexOf(image) - 1]),
      );
      assert.equal(
        Buffer.from(image.data, "base64").subarray(0, 2).toString("hex"),
        "ffd8",
      );
    }
    await Promise.all(result.details.paths.map((path) => rm(path)));
  });

  await test("accepts full-page capture and arbitrary scroll and color scheme requests", async () => {
    const viewport = [{ width: 510, height: 710 }];
    const full = await screenshotTool.execute(
      "call",
      { pages: [html], viewports: viewport, fullPage: true, waitMs: 0 },
      undefined,
      undefined,
      { cwd: root },
    );
    const scrolled = await screenshotTool.execute(
      "call",
      {
        pages: [url],
        viewports: viewport,
        scrollY: 600,
        colorScheme: "dark",
        waitMs: 0,
      },
      undefined,
      undefined,
      { cwd: root },
    );
    assert.equal(full.content[1].mimeType, "image/jpeg");
    assert.match(scrolled.content[0].text, /scrollY=600/);
    await Promise.all(
      [...full.details.paths, ...scrolled.details.paths].map((path) =>
        rm(path),
      ),
    );
  });

  await test("failed route reports its error while returning successful screenshots", async () => {
    const result = await screenshotTool.execute(
      "call",
      {
        pages: [url, "http://127.0.0.1:1/missing"],
        viewports: [{ width: 400, height: 500 }],
        waitMs: 0,
      },
      undefined,
      undefined,
      { cwd: root },
    );
    assert.equal(result.details.paths.length, 1);
    assert.equal(result.details.errors.length, 1);
    assert.match(result.content[0].text, /Captured 1\/2 screenshots/);
    await Promise.all(result.details.paths.map((path) => rm(path)));
  });
} finally {
  await shutdown();
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
}
