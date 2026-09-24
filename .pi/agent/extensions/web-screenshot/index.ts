import { mkdtemp, realpath, stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium, type Browser, type BrowserContext } from "playwright";
import { Type } from "typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type Viewport = { width: number; height: number };
type ScreenshotRequest = {
  pages: string[];
  viewports?: Viewport[];
  fullPage?: boolean;
  waitMs?: number;
  scrollY?: number;
  colorScheme?: "light" | "dark";
};
type ScreenshotCapture = {
  page: string;
  viewport: Viewport;
  path: string;
  bytes: Buffer;
};

const DEFAULT_VIEWPORTS: Viewport[] = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];
const MAX_CAPTURE_COUNT = 8;
const MAX_CAPTURE_PIXELS = 32_000_000;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const NAVIGATION_TIMEOUT_MS = 20_000;

/** Resolve a screenshot target; file URLs and paths stay inside the current project directory. */
export async function resolveScreenshotTarget(
  input: string,
  cwd: string,
): Promise<string> {
  let parsed: URL | undefined;
  try {
    parsed = new URL(input);
  } catch {
    /* A plain project-relative or absolute path. */
  }
  if (parsed?.protocol === "http:" || parsed?.protocol === "https:")
    return parsed.href;
  if (parsed && parsed.protocol !== "file:") {
    throw new Error(
      "web_screenshot: Target must be an HTTP(S) URL or a local file inside the working directory.",
    );
  }
  const filePath = parsed
    ? fileURLToPath(parsed)
    : isAbsolute(input)
      ? input
      : resolve(cwd, input);
  const [root, file] = await Promise.all([realpath(cwd), realpath(filePath)]);
  const fromRoot = relative(root, file);
  if (
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot)
  ) {
    throw new Error(
      "web_screenshot: Local files must be inside the working directory.",
    );
  }
  if (!(await stat(file)).isFile())
    throw new Error("web_screenshot: Local target is not a file.");
  return pathToFileURL(file).href;
}

/** Check batch size and viewport dimensions before launching Chromium or writing screenshots. */
export function validateScreenshotRequest(
  params: ScreenshotRequest,
): Viewport[] {
  if (
    !Array.isArray(params.pages) ||
    params.pages.length < 1 ||
    params.pages.length > 4 ||
    params.pages.some((page) => typeof page !== "string" || !page.trim())
  ) {
    throw new Error(
      "web_screenshot: Provide 1–4 nonempty page URLs or local paths.",
    );
  }
  const viewports = params.viewports ?? DEFAULT_VIEWPORTS;
  if (
    !Array.isArray(viewports) ||
    viewports.length < 1 ||
    viewports.length > 8 ||
    viewports.some(
      (viewport) =>
        !viewport ||
        !Number.isInteger(viewport.width) ||
        !Number.isInteger(viewport.height) ||
        viewport.width < 320 ||
        viewport.width > 4096 ||
        viewport.height < 320 ||
        viewport.height > 4096,
    )
  ) {
    throw new Error(
      "web_screenshot: Provide 1–8 viewports with integer widths and heights from 320 to 4096 CSS pixels.",
    );
  }
  if (
    params.pages.length * viewports.length > MAX_CAPTURE_COUNT ||
    params.pages.length *
      viewports.reduce(
        (total, { width, height }) => total + width * height,
        0,
      ) >
      MAX_CAPTURE_PIXELS
  ) {
    throw new Error(
      "web_screenshot: Limit each batch to 8 images and 32 million total viewport pixels; split larger jobs into calls.",
    );
  }
  if (
    params.waitMs !== undefined &&
    (!Number.isInteger(params.waitMs) ||
      params.waitMs < 0 ||
      params.waitMs > 3000)
  ) {
    throw new Error(
      "web_screenshot: waitMs must be an integer from 0 to 3000.",
    );
  }
  if (
    params.scrollY !== undefined &&
    (!Number.isInteger(params.scrollY) ||
      params.scrollY < 0 ||
      params.scrollY > 50000 ||
      params.fullPage)
  ) {
    throw new Error(
      "web_screenshot: scrollY must be 0–50000 and cannot be combined with fullPage.",
    );
  }
  if (
    params.colorScheme !== undefined &&
    params.colorScheme !== "light" &&
    params.colorScheme !== "dark"
  ) {
    throw new Error("web_screenshot: colorScheme must be light or dark.");
  }
  return viewports;
}

async function captureScreenshot(
  browser: Browser,
  target: string,
  viewport: Viewport,
  path: string,
  fullPage: boolean,
  waitMs: number,
  scrollY: number,
  colorScheme: "light" | "dark",
  signal?: AbortSignal,
): Promise<Buffer> {
  if (signal?.aborted)
    throw new Error("web_screenshot: Screenshot capture cancelled.");
  const context: BrowserContext = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    colorScheme,
  });
  const cancel = () => {
    void context.close().catch(() => {});
  };
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    const page = await context.newPage();
    await page.goto(target, {
      waitUntil: "domcontentloaded",
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    await page.evaluate(() =>
      Promise.race([
        document.fonts.ready,
        new Promise((done) => setTimeout(done, 3000)),
      ]),
    );
    if (scrollY) await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    if (waitMs) await page.waitForTimeout(waitMs);
    const bytes = await page.screenshot({
      path,
      type: "jpeg",
      quality: 80,
      fullPage,
      animations: "disabled",
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    if (bytes.length > MAX_IMAGE_BYTES) {
      await unlink(path).catch(() => {});
      throw new Error(
        "web_screenshot: Capture exceeds 12 MB; use a smaller viewport or turn off fullPage.",
      );
    }
    return bytes;
  } finally {
    signal?.removeEventListener("abort", cancel);
    await context.close().catch(() => {});
  }
}

/** Pi screenshot tool: batch requested pages and sizes, attach JPEGs, and report saved full-resolution paths. */
export default function webScreenshotExtension(pi: ExtensionAPI) {
  let browserPromise: Promise<Browser> | undefined;
  async function getBrowser(): Promise<Browser> {
    if (!browserPromise) {
      browserPromise = chromium
        .launch({ headless: true })
        .catch((error: unknown) => {
          browserPromise = undefined;
          throw new Error(
            `web_screenshot: Could not launch Playwright Chromium. Install it with \`cd ~/.pi/agent/extensions/web-screenshot && npx playwright install chromium\`. ${String(error)}`,
          );
        });
    }
    const browser = await browserPromise;
    if (!browser.isConnected()) {
      browserPromise = undefined;
      return getBrowser();
    }
    return browser;
  }

  pi.registerTool({
    name: "web_screenshot",
    label: "Web Screenshots",
    description:
      "Capture multiple web pages or project-local HTML files at arbitrary viewport sizes in one call. Defaults to desktop and mobile. Returns JPEG images inline for immediate visual inspection plus saved paths; use instead of composing Playwright screenshot bash commands. Supports local dev servers and remote HTTP(S) pages.",
    parameters: Type.Object({
      pages: Type.Array(Type.String(), {
        minItems: 1,
        maxItems: 4,
        description:
          "1–4 URLs (HTTP/S, including localhost) or project-local HTML paths.",
      }),
      viewports: Type.Optional(
        Type.Array(
          Type.Object({
            width: Type.Integer({ minimum: 320, maximum: 4096 }),
            height: Type.Integer({ minimum: 320, maximum: 4096 }),
          }),
          {
            minItems: 1,
            maxItems: 8,
            description:
              "Viewport sizes in CSS pixels. Defaults to 1440×900 and 390×844. Max 8 captures and 32 million total viewport pixels per call.",
          },
        ),
      ),
      fullPage: Type.Optional(
        Type.Boolean({
          description:
            "Capture the full scrollable page instead of just the viewport (default false). Tall images may be resized by the model; saved files remain full resolution.",
        }),
      ),
      waitMs: Type.Optional(
        Type.Integer({
          minimum: 0,
          maximum: 3000,
          description:
            "Extra wait after DOM and fonts settle, in milliseconds. Default 350.",
        }),
      ),
      scrollY: Type.Optional(
        Type.Integer({
          minimum: 0,
          maximum: 50000,
          description:
            "Scroll to this vertical CSS-pixel offset before viewport capture. For sections below the fold; cannot combine with fullPage.",
        }),
      ),
      colorScheme: Type.Optional(
        Type.Union([Type.Literal("light"), Type.Literal("dark")], {
          description: "Browser color scheme for theme testing. Default light.",
        }),
      ),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const viewports = validateScreenshotRequest(params);
      const targets = await Promise.all(
        params.pages.map((page) => resolveScreenshotTarget(page, ctx.cwd)),
      );
      if (signal?.aborted)
        throw new Error("web_screenshot: Screenshot capture cancelled.");
      const browser = await getBrowser();
      const directory = await mkdtemp(join(tmpdir(), "pi-web-screenshot-"));
      const jobs = targets.flatMap((target, pageIndex) =>
        viewports.map((viewport, viewportIndex) => ({
          target,
          viewport,
          path: join(
            directory,
            `page-${pageIndex + 1}-${viewport.width}x${viewport.height}-y${params.scrollY ?? 0}-${viewportIndex + 1}.jpg`,
          ),
        })),
      );
      const results: Array<{ capture?: ScreenshotCapture; error?: string }> =
        new Array(jobs.length);
      let nextIndex = 0;
      await Promise.all(
        Array.from({ length: Math.min(3, jobs.length) }, async () => {
          while (nextIndex < jobs.length && !signal?.aborted) {
            const index = nextIndex++;
            const job = jobs[index];
            try {
              const bytes = await captureScreenshot(
                browser,
                job.target,
                job.viewport,
                job.path,
                params.fullPage ?? false,
                params.waitMs ?? 350,
                params.scrollY ?? 0,
                params.colorScheme ?? "light",
                signal,
              );
              results[index] = {
                capture: {
                  page: job.target,
                  viewport: job.viewport,
                  path: job.path,
                  bytes,
                },
              };
            } catch (error) {
              results[index] = {
                error: `${job.target} at ${job.viewport.width}×${job.viewport.height}: ${error instanceof Error ? error.message : String(error)}`,
              };
            }
          }
        }),
      );
      if (signal?.aborted)
        throw new Error("web_screenshot: Screenshot capture cancelled.");
      const captures = results.flatMap((result) =>
        result.capture ? [result.capture] : [],
      );
      const errors = results.flatMap((result) =>
        result.error ? [result.error] : [],
      );
      if (!captures.length)
        throw new Error(
          `web_screenshot: All captures failed:\n${errors.join("\n")}`,
        );
      return {
        content: [
          {
            type: "text" as const,
            text: `Captured ${captures.length}/${jobs.length} screenshots${params.scrollY ? ` at scrollY=${params.scrollY}` : ""}. Full-resolution JPEGs are saved in ${directory}. Inspect the attached images before editing the UI.\n${captures.map(({ page, viewport, path }) => `- ${page} at ${viewport.width}×${viewport.height}: ${path}`).join("\n")}${errors.length ? `\nFailures:\n${errors.join("\n")}` : ""}`,
          },
          ...captures.map(({ bytes }) => ({
            type: "image" as const,
            mimeType: "image/jpeg",
            data: bytes.toString("base64"),
          })),
        ],
        details: { paths: captures.map(({ path }) => path), errors },
      };
    },
  });

  pi.on("session_shutdown", async () => {
    const browser = await browserPromise?.catch(() => undefined);
    browserPromise = undefined;
    await browser?.close();
  });
}
