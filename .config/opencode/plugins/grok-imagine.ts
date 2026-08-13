import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"
import { type Plugin, tool } from "@opencode-ai/plugin"

const API_URL = "https://api.x.ai/v1"
const TOKEN_URL = "https://auth.x.ai/oauth2/token"
const OAUTH_CLIENT_ID = "b1a00492-073a-47ea-816f-4c329264a828"
const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 15 * 60 * 1_000
const OAUTH_REFRESH_SKEW_MS = 2 * 60 * 1_000
const MAX_IMAGE_BYTES = 20 * 1024 * 1024

type ApiAuth = {
  type: "api"
  key: string
}

type OAuthAuth = {
  type: "oauth"
  access: string
  refresh: string
  expires: number
}

type XaiAuth = ApiAuth | OAuthAuth

type VideoStatus = {
  status?: string
  error?: {
    code?: string
    message?: string
  }
  video?: {
    url?: string
    duration?: number
    respect_moderation?: boolean
  }
}

function authFilePath(): string {
  return path.join(process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share"), "opencode", "auth.json")
}

async function loadXaiAuth(): Promise<XaiAuth | undefined> {
  try {
    const contents = process.env.OPENCODE_AUTH_CONTENT ?? (await fs.readFile(authFilePath(), "utf8"))
    const entry = (JSON.parse(contents) as { xai?: Partial<XaiAuth> }).xai
    if (entry?.type === "api" && typeof entry.key === "string") {
      return { type: "api", key: entry.key }
    }
    if (
      entry?.type === "oauth" &&
      typeof entry.access === "string" &&
      typeof entry.refresh === "string" &&
      typeof entry.expires === "number"
    ) {
      return {
        type: "oauth",
        access: entry.access,
        refresh: entry.refresh,
        expires: entry.expires,
      }
    }
  } catch {
    // The tool reports a concise authentication error below.
  }
  return undefined
}

async function refreshXaiAuth(auth: OAuthAuth, client: Parameters<Plugin>[0]["client"]): Promise<OAuthAuth> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: OAUTH_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: auth.refresh,
    }),
  })
  if (!response.ok) {
    throw new Error("xAI authentication expired. Reconnect xAI in OpenCode and try again.")
  }

  const tokens = (await response.json()) as {
    access_token?: string
    expires_in?: number
    refresh_token?: string
  }
  if (typeof tokens.access_token !== "string") {
    throw new Error("xAI token refresh returned no access token. Reconnect xAI in OpenCode and try again.")
  }

  const refreshed: OAuthAuth = {
    type: "oauth",
    access: tokens.access_token,
    refresh: tokens.refresh_token ?? auth.refresh,
    expires: Date.now() + (tokens.expires_in ?? 3_600) * 1_000,
  }
  await client.auth
    .set({
      path: { id: "xai" },
      body: refreshed,
    })
    .catch(() => {})
  return refreshed
}

async function xaiBearerToken(client: Parameters<Plugin>[0]["client"]): Promise<string> {
  const auth = await loadXaiAuth()
  if (!auth) {
    throw new Error("xAI credentials are not configured. Authenticate xAI in OpenCode, then try again.")
  }
  if (auth.type === "api") return auth.key
  if (auth.expires - Date.now() > OAUTH_REFRESH_SKEW_MS) return auth.access
  return (await refreshXaiAuth(auth, client)).access
}

function errorDetail(data: unknown): string {
  if (!data || typeof data !== "object") return ""
  const error = "error" in data ? data.error : data
  if (typeof error === "string") return error
  if (error && typeof error === "object") {
    const message = "message" in error ? error.message : undefined
    if (typeof message === "string") return message
  }
  return ""
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const data = (await response.json().catch(() => undefined)) as T | undefined
  if (!response.ok) {
    const detail = errorDetail(data)
    throw new Error(`xAI request failed (${response.status})${detail ? `: ${detail}` : ""}`)
  }
  if (!data) throw new Error("xAI returned an empty response.")
  return data
}

async function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw signal.reason ?? new Error("Video generation was cancelled.")
  await new Promise<void>((resolve, reject) => {
    const onTimeout = () => {
      signal.removeEventListener("abort", onAbort)
      resolve()
    }
    const timer = setTimeout(onTimeout, ms)
    const onAbort = () => {
      clearTimeout(timer)
      signal.removeEventListener("abort", onAbort)
      reject(signal.reason ?? new Error("Video generation was cancelled."))
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

function isRemoteOrDataUrl(value: string): boolean {
  return /^https:\/\//i.test(value) || /^data:image\/(?:jpeg|png);base64,/i.test(value)
}

function imageMime(buffer: Buffer): "image/jpeg" | "image/png" | undefined {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png"
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg"
  return undefined
}

async function imageUrl(value: string, directory: string): Promise<string> {
  if (isRemoteOrDataUrl(value)) return value
  const filePath = path.isAbsolute(value) ? value : path.resolve(directory, value)
  const buffer = await fs.readFile(filePath)
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`Reference image exceeds xAI's 20 MiB limit: ${filePath}`)
  }
  const mime = imageMime(buffer)
  if (!mime) throw new Error(`Reference images must be PNG or JPEG files: ${filePath}`)
  return `data:${mime};base64,${buffer.toString("base64")}`
}

async function saveVideo(out: string, directory: string, response: Response): Promise<{ path: string; versioned: boolean }> {
  if (!response.ok) {
    throw new Error(`Could not download generated video (${response.status}).`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength === 0) throw new Error("xAI returned an empty video file.")

  const requestedPath = path.isAbsolute(out) ? out : path.resolve(directory, out)
  await fs.mkdir(path.dirname(requestedPath), { recursive: true })
  const extension = path.extname(requestedPath)
  const stem = path.basename(requestedPath, extension)
  const parent = path.dirname(requestedPath)

  for (let version = 1; version <= 999; version++) {
    const savedPath = version === 1 ? requestedPath : path.join(parent, `${stem}-v${version}${extension}`)
    try {
      await fs.writeFile(savedPath, buffer, { flag: "wx" })
      return { path: savedPath, versioned: version > 1 }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
    }
  }
  throw new Error(`Could not find a non-conflicting filename for ${requestedPath}.`)
}

export const GrokImaginePlugin: Plugin = async ({ client }) => ({
  tool: {
    grok_imagine: tool({
      description: [
        "Generate an MP4 video with xAI Grok Imagine.",
        "Use for text-to-video, image-to-video, or reference-image-guided video generation.",
        "Use `image` to make its local file, data URL, or public HTTPS URL the first frame; use `images` for visual references that guide the result without fixing the first frame.",
        "Do not supply both `image` and `images` in one request.",
        "xAI charges per generated second. Requires xAI to already be authenticated in OpenCode.",
        "The tool waits for the asynchronous job, downloads the temporary xAI result, and returns the absolute saved MP4 path.",
      ].join(" "),
      args: {
        prompt: tool.schema.string().describe("Detailed description of the video, including subject movement, camera motion, scene, and any dialogue."),
        out: tool.schema
          .string()
          .describe("Output MP4 path, relative to the project directory unless absolute. Existing files are never overwritten."),
        duration: tool.schema.number().int().min(1).max(15).optional().describe("Video length in seconds, from 1 to 15. Defaults to 8."),
        aspect_ratio: tool.schema
          .enum(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"])
          .optional()
          .describe("Output aspect ratio. Defaults to xAI's 16:9; image-to-video otherwise uses the input image ratio."),
        resolution: tool.schema
          .enum(["480p", "720p", "1080p"])
          .optional()
          .describe("Output resolution. Defaults to 480p. The Grok Imagine 1.5 model supports 1080p for text-to-video and image-to-video."),
        image: tool.schema
          .string()
          .optional()
          .describe("Optional starting-frame image: a local PNG/JPEG path, a data URL, or a public HTTPS URL."),
        images: tool.schema
          .array(tool.schema.string())
          .optional()
          .describe("Optional reference PNG/JPEG paths, data URLs, or public HTTPS URLs. Mention them in the prompt as <IMAGE_0>, <IMAGE_1>, and so on."),
      },
      async execute(args, context) {
        if (args.image && args.images?.length) {
          throw new Error("Use either `image` for image-to-video or `images` for reference-to-video, not both.")
        }

        const token = await xaiBearerToken(client)
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
        const body: Record<string, unknown> = {
          model: "grok-imagine-video-1.5",
          prompt: args.prompt,
          duration: args.duration ?? 8,
        }
        if (args.aspect_ratio) body.aspect_ratio = args.aspect_ratio
        if (args.resolution) body.resolution = args.resolution
        if (args.image) body.image = { url: await imageUrl(args.image, context.directory) }
        if (args.images?.length) {
          body.reference_images = await Promise.all(args.images.map((image) => imageUrl(image, context.directory))).then(
            (urls) => urls.map((url) => ({ url })),
          )
        }

        const started = await requestJson<{ request_id?: string }>(`${API_URL}/videos/generations`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: context.abort,
        })
        if (!started.request_id) throw new Error("xAI did not return a video-generation request ID.")

        const deadline = Date.now() + POLL_TIMEOUT_MS
        let completed: VideoStatus | undefined
        while (Date.now() < deadline) {
          await delay(POLL_INTERVAL_MS, context.abort)
          const result = await requestJson<VideoStatus>(`${API_URL}/videos/${started.request_id}`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: context.abort,
          })
          if (result.status === "done") {
            completed = result
            break
          }
          if (result.status === "failed" || result.status === "expired") {
            const message = result.error?.message ?? `xAI video generation ${result.status}.`
            throw new Error(message)
          }
        }
        if (!completed?.video?.url) {
          throw new Error(`xAI video generation timed out after ${POLL_TIMEOUT_MS / 60_000} minutes. Request ID: ${started.request_id}`)
        }

        const saved = await saveVideo(args.out, context.directory, await fetch(completed.video.url, { signal: context.abort }))
        const versionNote = saved.versioned ? " The requested path already existed, so this file was versioned." : ""
        return {
          output: `Generated video saved to ${saved.path}.${versionNote}`,
          metadata: {
            duration: completed.video.duration,
            model: "grok-imagine-video-1.5",
            out: saved.path,
            request_id: started.request_id,
            versioned: saved.versioned,
          },
        }
      },
    }),
  },
})
