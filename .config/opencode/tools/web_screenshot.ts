import { access, mkdir, readFile, realpath, stat } from "node:fs/promises"
import { isAbsolute, relative, resolve, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { chromium } from "playwright"
import { tool } from "@opencode-ai/plugin"

const CAPTURE_ROOT = "/tmp/opencode/web-screenshot"
const VIEWPORTS = {
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
} as const

type Preset = keyof typeof VIEWPORTS | "responsive"
type Capture = { label: keyof typeof VIEWPORTS; path: string }

export default tool({
  description:
    "Capture a local page as screenshots for visual review. Defaults to desktop, tablet, and mobile screenshots, attaches the images directly, and uses Playwright's managed Chromium. Use this instead of composing Chromium screenshot commands.",
  args: {
    target: tool.schema
      .string()
      .describe("A project-relative or absolute local HTML path, file: URL, or localhost development URL."),
    preset: tool.schema
      .enum(["responsive", "desktop", "tablet", "mobile"])
      .default("responsive")
      .describe("Viewport set to capture. Defaults to responsive: desktop, tablet, and mobile."),
    settle_ms: tool.schema
      .number()
      .int()
      .min(0)
      .max(10000)
      .default(500)
      .describe("Extra time to wait after page load before capturing, in milliseconds."),
  },
  async execute(args, context) {
    const target = await resolveTarget(args.target, context.directory, context.worktree)
    const preset = args.preset ?? "responsive"
    const settleMs = args.settle_ms ?? 500
    const viewports = selectedViewports(preset)
    const captureDirectory = resolve(CAPTURE_ROOT, `${context.sessionID}-${Date.now()}`)

    await mkdir(captureDirectory, { recursive: true })

    let browser
    try {
      browser = await chromium.launch({ headless: true, channel: "chromium" })
    } catch (error) {
      throw new Error(
        `Playwright could not launch its managed Chromium. Run \`npx playwright install chromium\` from ~/.config/opencode, then restart OpenCode.\n\n${errorMessage(error)}`,
      )
    }

    const abortBrowser = () => {
      void browser.close()
    }
    context.abort.addEventListener("abort", abortBrowser, { once: true })

    try {
      const results = await Promise.all(
        viewports.map(async (label) => {
          const viewport = VIEWPORTS[label]
          const pageContext = await browser.newContext({
            viewport,
            deviceScaleFactor: 1,
            colorScheme: "light",
            reducedMotion: "reduce",
          })
          const outputPath = resolve(captureDirectory, `${label}-${viewport.width}x${viewport.height}.jpg`)

          try {
            const page = await pageContext.newPage()
            await page.goto(target, { waitUntil: "load", timeout: 15000 })
            await page.waitForTimeout(settleMs)
            await page.screenshot({ path: outputPath, type: "jpeg", quality: 85, animations: "disabled" })
            await access(outputPath)

            return { label, path: outputPath } satisfies Capture
          } finally {
            await pageContext.close()
          }
        }),
      )

      return await screenshotResult(target, results)
    } catch (error) {
      if (context.abort.aborted) {
        throw new Error("Screenshot capture cancelled.")
      }

      throw new Error(`Screenshot capture failed for ${target}.\n\n${errorMessage(error)}`)
    } finally {
      context.abort.removeEventListener("abort", abortBrowser)
      await browser.close()
    }
  },
})

function selectedViewports(preset: Preset) {
  return preset === "responsive" ? (Object.keys(VIEWPORTS) as Array<keyof typeof VIEWPORTS>) : [preset]
}

async function resolveTarget(target: string, directory: string, worktree: string) {
  let url: URL

  try {
    url = new URL(target)
  } catch {
    const filePath = isAbsolute(target) ? target : resolve(directory, target)
    return localFileUrl(filePath, worktree)
  }

  if (url.protocol === "file:") {
    return localFileUrl(fileURLToPath(url), worktree)
  }

  if ((url.protocol === "http:" || url.protocol === "https:") && isLocalHost(url.hostname)) {
    return url.toString()
  }

  throw new Error("Target must be a file in the active worktree or an HTTP(S) URL on localhost.")
}

async function localFileUrl(filePath: string, worktree: string) {
  const [resolvedFile, resolvedWorktree] = await Promise.all([realpath(filePath), realpath(worktree)])
  const fileInfo = await stat(resolvedFile)

  if (!fileInfo.isFile()) {
    throw new Error(`Target is not a file: ${filePath}`)
  }

  const pathFromWorktree = relative(resolvedWorktree, resolvedFile)
  const outsideWorktree =
    pathFromWorktree === ".." || pathFromWorktree.startsWith(`..${sep}`) || isAbsolute(pathFromWorktree)

  if (outsideWorktree) {
    throw new Error("Local screenshot targets must be inside the active worktree.")
  }

  return pathToFileURL(resolvedFile).toString()
}

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "[::1]"
}

async function screenshotResult(target: string, captures: Capture[]) {
  const output = [`Captured ${target}:`, ...captures.map((capture) => `- ${capture.label}: ${capture.path}`)].join("\n")

  return {
    title: `Captured ${captures.map((capture) => capture.label).join(", ")} screenshots`,
    output,
    attachments: await Promise.all(
      captures.map(async (capture) => ({
        type: "file" as const,
        mime: "image/jpeg",
        url: `data:image/jpeg;base64,${await readFile(capture.path, "base64")}`,
        filename: `${capture.label}.jpg`,
      })),
    ),
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
