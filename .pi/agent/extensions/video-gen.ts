import { randomUUID } from "node:crypto";
import { link, mkdir, open, readFile, realpath, lstat, rename, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

// Personal extension: uses Pi's credentials, never stores tokens or installs provider SDKs.
// Video settings are separate from the chat model and from pi-image-gen.
type Provider = "xai" | "google" | "openrouter";
type Selection = { provider: Provider; model: string };
type Settings = { defaultModel: string; outputDir?: string };
type Params = {
  prompt?: string;
  firstFrame?: string;
  lastFrame?: string;
  duration?: number;
  aspectRatio?: string;
  resolution?: string;
  generateAudio?: boolean;
  filename?: string;
  jobId?: string;
};
type Frame = { mime: string; data: string };
type Credential = { token: string; method: "oauth" | "api_key" };
type Job = {
  version: 1;
  provider: Provider;
  model: string;
  state: "submitting" | "ambiguous" | "rejected" | "running" | "failed" | "complete";
  remoteId?: string;
  filename: string;
};

const BASE: Record<Provider, string> = {
  xai: "https://api.x.ai/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
  openrouter: "https://openrouter.ai/api/v1",
};
const ENV_KEY: Record<Provider, string> = { xai: "XAI_API_KEY", google: "GEMINI_API_KEY", openrouter: "OPENROUTER_API_KEY" };
const HINT: Record<Provider, string> = {
  xai: "Run /login xai (OAuth or API key), or set XAI_API_KEY. Video API access/billing may be separate from a Grok subscription.",
  google: "Run /login google or set GEMINI_API_KEY (a Gemini API key with Veo access).",
  openrouter: "Run /login openrouter or set OPENROUTER_API_KEY (with video model access/credits).",
};
const MAX_FRAME = 10 * 1024 * 1024;
const MAX_JSON = 1024 * 1024;
const MAX_VIDEO = 300 * 1024 * 1024;
const POLL_MS = 10_000;
const DEADLINE_MS = 20 * 60 * 1000;
const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class VideoGenError extends Error {}
class HttpError extends VideoGenError {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

function agentDir(): string { return process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent"); }
async function loadSettings(): Promise<Settings> {
  let root: unknown;
  try { root = JSON.parse(await readFile(join(agentDir(), "settings.json"), "utf8")); }
  catch { throw new VideoGenError("Cannot read global Pi settings.json. Set pi-video-gen.defaultModel in ~/.pi/agent/settings.json."); }
  const section = (root as Record<string, unknown> | null)?.["pi-video-gen"];
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    throw new VideoGenError('Set "pi-video-gen": { "defaultModel": "xai/grok-imagine-video-1.5" } in ~/.pi/agent/settings.json.');
  }
  const { defaultModel, outputDir } = section as Record<string, unknown>;
  if (typeof defaultModel !== "string" || !defaultModel.trim()) throw new VideoGenError("pi-video-gen.defaultModel must be a nonempty video model ID.");
  if (outputDir !== undefined && (typeof outputDir !== "string" || !outputDir.trim())) throw new VideoGenError("pi-video-gen.outputDir must be a nonempty directory path.");
  return { defaultModel: defaultModel.trim(), ...(outputDir ? { outputDir: outputDir as string } : {}) };
}

/** Provider prefix is mandatory for OpenRouter (whose model slug contains its vendor). */
export function resolveVideoModel(configured: string): Selection {
  const id = configured.trim();
  if (id.startsWith("openrouter/")) {
    const slug = id.slice("openrouter/".length);
    if (slug.split("/").length === 2 && slug.split("/").every((part) => /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/i.test(part)) && !slug.includes("..")) {
      return { provider: "openrouter", model: slug };
    }
    throw new VideoGenError('OpenRouter video models must use "openrouter/vendor/model-id" (e.g. "openrouter/bytedance/seedance-2.5").');
  }
  const [prefix, ...rest] = id.split("/");
  const model = rest.length ? rest.join("/") : id;
  if ((!rest.length || prefix === "xai") && /^grok-imagine-video(?:-[a-z0-9][a-z0-9.-]*)?$/i.test(model)) return { provider: "xai", model };
  if ((!rest.length || prefix === "google") && /^veo-[0-9]+(?:\.[0-9]+)?-(?:fast-|lite-)?generate-(?:preview|[0-9]{3})$/.test(model)) return { provider: "google", model };
  throw new VideoGenError(`Unsupported video model "${id}". Use xai/grok-imagine-video-1.5, google/veo-3.1-generate-preview, or openrouter/vendor/model-id. Only xAI, Google and OpenRouter are supported.`);
}

/** Pi refreshes OAuth for us. Never read auth.json, and never mistake an OAuth token for an API-key fallback. */
async function credentials(ctx: ExtensionContext, provider: Provider): Promise<{ primary: Credential; fallback?: Credential }> {
  const registry = ctx.modelRegistry;
  const oauthModel = registry.getAll().find((model) => model.provider === provider && registry.isUsingOAuth(model));
  if (oauthModel) {
    let token: string | undefined;
    try {
      const resolved = await registry.getApiKeyAndHeaders(oauthModel);
      if (resolved.ok && resolved.apiKey) token = resolved.apiKey;
    } catch { /* An expired login may still have a separately configured environment API key. */ }
    // Pi can store only one credential per provider. With OAuth active, the distinct
    // API-key fallback can only be supplied via the provider's usual env variable.
    const envKey = process.env[ENV_KEY[provider]]?.trim();
    if (token) return { primary: { token, method: "oauth" }, ...(envKey ? { fallback: { token: envKey, method: "api_key" } } : {}) };
    if (envKey) return { primary: { token: envKey, method: "api_key" } };
    throw new VideoGenError(`${provider} OAuth in Pi could not be refreshed, and no ${ENV_KEY[provider]} API key fallback is configured. ${HINT[provider]}`);
  }
  // Pi resolves saved /login keys, !secret-manager commands, and env keys.
  const token = await registry.getApiKeyForProvider(provider);
  if (!token) throw new VideoGenError(`${provider} has no usable credentials in Pi. ${HINT[provider]}`);
  return { primary: { token, method: "api_key" } };
}

function validate(p: Params, { provider, model }: Selection): void {
  if (!p.prompt?.trim()) throw new VideoGenError("video_generate requires a nonempty prompt for a new clip (or a jobId to resume one).");
  if (p.prompt.length > 10_000) throw new VideoGenError("Prompt must be at most 10,000 characters.");
  if (p.duration !== undefined && (!Number.isInteger(p.duration) || p.duration < 1 || p.duration > (provider === "openrouter" ? 30 : provider === "xai" ? 15 : 8))) {
    throw new VideoGenError(`duration must be an integer from 1 to ${provider === "openrouter" ? 30 : provider === "xai" ? 15 : 8} seconds for ${provider}.`);
  }
  const ratios = provider === "google" ? ["16:9", "9:16"] : provider === "xai"
    ? ["16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3"]
    : ["16:9", "9:16", "1:1", "4:3", "3:4", "3:2", "2:3", "21:9", "9:21"];
  if (p.aspectRatio && !ratios.includes(p.aspectRatio)) throw new VideoGenError(`Unsupported ${provider} aspectRatio. Use ${ratios.join(", ")}.`);
  const resolutions = provider === "google" ? ["720p", "1080p", "4k"] : provider === "xai" ? ["480p", "720p", "1080p"] : ["480p", "720p", "768p", "1080p", "1K", "2K", "4K"];
  if (p.resolution && !resolutions.includes(p.resolution)) throw new VideoGenError(`Unsupported ${provider} resolution. Use ${resolutions.join(", ")}.`);
  if (provider === "google") {
    if (p.duration !== undefined && ![4, 6, 8].includes(p.duration)) throw new VideoGenError("Google Veo duration must be 4, 6, or 8 seconds.");
    if (p.resolution && p.resolution !== "720p" && p.duration !== undefined && p.duration !== 8) throw new VideoGenError("Google Veo 1080p/4k requires duration 8 seconds.");
    if (p.resolution === "4k" && model.includes("lite")) throw new VideoGenError("Google Veo Lite does not support 4k.");
    if (p.lastFrame && !p.firstFrame) throw new VideoGenError("Google Veo lastFrame requires firstFrame.");
    if (p.generateAudio !== undefined) throw new VideoGenError("Google Veo generates audio by default and does not offer a generateAudio toggle; omit it.");
  }
  if (provider === "xai" && p.resolution === "1080p" && !model.startsWith("grok-imagine-video-1.5")) throw new VideoGenError("xAI 1080p requires grok-imagine-video-1.5.");
  if (provider === "xai" && p.lastFrame && !model.startsWith("grok-imagine-video-1.5")) throw new VideoGenError("xAI lastFrame requires grok-imagine-video-1.5.");
  if (provider === "xai" && p.lastFrame && p.resolution === "1080p") throw new VideoGenError("xAI first/last-frame video is limited to 720p; choose 720p or omit resolution.");
  if (provider === "openrouter" && p.lastFrame && !p.firstFrame) throw new VideoGenError("OpenRouter lastFrame requires firstFrame.");
  if (p.filename !== undefined && (!p.filename.trim() || p.filename.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(p.filename))) {
    throw new VideoGenError("filename must be a 1-100 character stem containing only letters, digits, _ and -.");
  }
}

function mimeFromBytes(bytes: Buffer): string | undefined {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return undefined;
}
async function loadFrame(path: string | undefined, cwd: string): Promise<Frame | undefined> {
  if (path === undefined) return undefined;
  if (!path.trim() || /^\w+:\/\//.test(path)) throw new VideoGenError("Frames must be local image files inside the working directory, not URLs.");
  const root = await realpath(cwd);
  const full = resolve(root, path);
  const rel = relative(root, full);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new VideoGenError("Frames must stay inside the working directory.");
  try {
    const info = await lstat(full);
    if (!info.isFile() || info.size > MAX_FRAME || (await realpath(full)) !== full) throw new VideoGenError("Frames must be regular, non-symlink files of at most 10 MB.");
    const bytes = await readFile(full);
    const mime = mimeFromBytes(bytes);
    if (!mime) throw new VideoGenError("Frames must be PNG, JPEG, or WebP images.");
    return { mime, data: bytes.toString("base64") };
  } catch (error) {
    if (error instanceof VideoGenError) throw error;
    throw new VideoGenError("Could not read a frame inside the working directory.");
  }
}

function cancelled(signal: AbortSignal): never {
  throw new VideoGenError(signal.aborted ? "Video generation stopped or timed out; the remote task may still be running and billable." : "Video generation stopped.");
}
async function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) cancelled(signal);
  await new Promise<void>((yes, no) => {
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); yes(); }, ms);
    const abort = () => { clearTimeout(timer); no(new VideoGenError("Video generation stopped or timed out; the remote task may still be running and billable.")); };
    signal.addEventListener("abort", abort, { once: true });
  });
}
async function requestJson(url: string, init: RequestInit, stage: string): Promise<Record<string, unknown>> {
  let response: Response;
  try { response = await fetch(url, { ...init, redirect: "error" }); }
  catch {
    if (init.signal?.aborted) cancelled(init.signal);
    throw new VideoGenError(`${stage} could not connect or redirected unexpectedly; check network/provider availability.`);
  }
  if (!response.ok) {
    void response.body?.cancel().catch(() => {}); // Never expose provider bodies, signed URLs or keys.
    const hint = [401, 403].includes(response.status) ? " Check this credential's video API access and billing."
      : response.status === 429 ? " Quota or rate limit exceeded."
      : response.status === 400 ? " Check model and video parameters."
      : " Check provider status and account.";
    throw new HttpError(`${stage} returned HTTP ${response.status}.${hint}`, response.status);
  }
  try {
    const length = Number(response.headers.get("content-length"));
    if (length > MAX_JSON) throw new VideoGenError(`${stage} response exceeded 1 MB.`);
    const reader = response.body?.getReader();
    if (!reader) throw new VideoGenError(`${stage} returned no response body.`);
    const chunks: Buffer[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_JSON) throw new VideoGenError(`${stage} response exceeded 1 MB.`);
        chunks.push(Buffer.from(value));
      }
    } finally { reader.releaseLock(); }
    const json: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!json || typeof json !== "object" || Array.isArray(json)) throw new Error("invalid JSON");
    return json as Record<string, unknown>;
  } catch (error) {
    if (error instanceof VideoGenError) throw error;
    if (init.signal?.aborted) cancelled(init.signal);
    throw new VideoGenError(`${stage} returned invalid or unreadable JSON.`);
  }
}

function authHeaders(provider: Provider, credential: Credential): Record<string, string> {
  return provider === "google" && credential.method === "api_key"
    ? { "x-goog-api-key": credential.token }
    : { authorization: `Bearer ${credential.token}` };
}
function dataUri(frame: Frame): string { return `data:${frame.mime};base64,${frame.data}`; }
function submitBody(p: Params, selected: Selection, first?: Frame, last?: Frame): { url: string; body: Record<string, unknown> } {
  const { provider, model } = selected;
  if (provider === "xai") return {
    url: `${BASE.xai}/videos/generations`,
    body: { model, prompt: p.prompt, ...(first ? { image: { url: dataUri(first) } } : {}), ...(last ? { last_frame: { url: dataUri(last) } } : {}),
      ...(p.duration ? { duration: p.duration } : {}), ...(p.aspectRatio ? { aspect_ratio: p.aspectRatio } : {}),
      ...(p.resolution ? { resolution: p.resolution } : {}), ...(p.generateAudio !== undefined ? { generate_audio: p.generateAudio } : {}) },
  };
  if (provider === "google") return {
    url: `${BASE.google}/models/${encodeURIComponent(model)}:predictLongRunning`,
    body: { instances: [{ prompt: p.prompt, ...(first ? { image: { inlineData: { mimeType: first.mime, data: first.data } } } : {}),
      ...(last ? { lastFrame: { inlineData: { mimeType: last.mime, data: last.data } } } : {}) }],
      parameters: { ...(p.duration ? { durationSeconds: String(p.duration) } : {}), ...(p.aspectRatio ? { aspectRatio: p.aspectRatio } : {}),
        ...(p.resolution ? { resolution: p.resolution } : {}) } },
  };
  const frame_images = [first && { type: "image_url", image_url: { url: dataUri(first) }, frame_type: "first_frame" },
    last && { type: "image_url", image_url: { url: dataUri(last) }, frame_type: "last_frame" }].filter(Boolean);
  return {
    url: `${BASE.openrouter}/videos`,
    body: { model, prompt: p.prompt, ...(frame_images.length ? { frame_images } : {}), ...(p.duration ? { duration: p.duration } : {}),
      ...(p.aspectRatio ? { aspect_ratio: p.aspectRatio } : {}), ...(p.resolution ? { resolution: p.resolution } : {}),
      ...(p.generateAudio !== undefined ? { generate_audio: p.generateAudio } : {}) },
  };
}
function remoteId(json: Record<string, unknown>, provider: Provider): string | undefined {
  const raw = provider === "xai" ? json.request_id : provider === "google" ? json.name : json.id;
  if (typeof raw !== "string" || raw.length > 256 || raw.includes("..")) return undefined;
  const pattern = provider === "google" ? /^(?:models\/[a-zA-Z0-9._-]+\/)?operations\/[a-zA-Z0-9_-]+$/ : /^[a-zA-Z0-9_-]+$/;
  return pattern.test(raw) ? raw : undefined;
}
function videoUrl(json: Record<string, unknown>, provider: Provider): string | undefined {
  if (provider === "xai") return (json.video as Record<string, unknown> | null)?.url as string | undefined;
  if (provider === "google") {
    const res = json.response as Record<string, unknown> | undefined;
    const samples = (res?.generateVideoResponse as Record<string, unknown> | undefined)?.generatedSamples;
    return (Array.isArray(samples) ? samples[0]?.video?.uri : undefined) as string | undefined;
  }
  return undefined; // OpenRouter supplies a fixed, authenticated /content endpoint instead.
}
function mediaHost(url: string, provider: "xai" | "google"): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return false;
    const host = u.hostname.toLowerCase();
    return provider === "xai" ? (host === "x.ai" || host.endsWith(".x.ai"))
      : (host === "generativelanguage.googleapis.com" || host.endsWith(".googleapis.com") || host.endsWith(".googleusercontent.com") || host.endsWith(".googlevideo.com"));
  } catch { return false; }
}

function outputRoot(cwd: string, settings: Settings): string { return resolve(cwd, settings.outputDir ?? ".pi/videos"); }
async function saveJob(dir: string, job: Job, initial = false): Promise<void> {
  const path = join(dir, "job.json");
  const temporary = initial ? path : join(dir, `.job-${randomUUID()}.tmp`);
  const file = await open(temporary, "wx", 0o600);
  try { await file.writeFile(JSON.stringify(job, null, 2) + "\n"); }
  finally { await file.close(); }
  if (!initial) {
    try { await rename(temporary, path); }
    catch (error) { await unlink(temporary).catch(() => {}); throw error; }
  }
}
async function loadJob(dir: string): Promise<Job> {
  try {
    if ((await realpath(dir)) !== dir || !(await lstat(join(dir, "job.json"))).isFile()) throw new Error("unsafe path");
    const data: unknown = JSON.parse(await readFile(join(dir, "job.json"), "utf8"));
    const j = data as Job;
    if (j?.version !== 1 || !["xai", "google", "openrouter"].includes(j.provider) ||
        !["submitting", "ambiguous", "rejected", "running", "failed", "complete"].includes(j.state) ||
        typeof j.model !== "string" || !j.model || typeof j.filename !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(j.filename) ||
        (j.remoteId !== undefined && remoteId({ [j.provider === "xai" ? "request_id" : j.provider === "google" ? "name" : "id"]: j.remoteId }, j.provider) !== j.remoteId)) throw new Error("invalid job");
    return j;
  } catch { throw new VideoGenError("Could not load a valid video job from the configured outputDir. Check jobId and job.json."); }
}

async function download(url: string, dir: string, name: string, provider: Provider, credential: Credential, signal: AbortSignal): Promise<string> {
  let target = url;
  if (provider !== "openrouter" && !mediaHost(target, provider)) throw new VideoGenError("Video provider returned an untrusted download URL; no request was sent to it. Use the job ID to retrieve the video manually.");
  let res: Response | undefined;
  for (let hop = 0; hop < 4; hop++) {
    const isApiHost = new URL(target).hostname === "generativelanguage.googleapis.com";
    const headers = provider === "openrouter" ? authHeaders(provider, credential)
      : provider === "google" && isApiHost ? authHeaders(provider, credential) : {};
    try { res = await fetch(target, { headers, signal, redirect: "manual" }); }
    catch {
      if (signal.aborted) cancelled(signal);
      throw new VideoGenError("Could not download video; the remote job can be resumed before its URL expires.");
    }
    if (![301, 302, 303, 307, 308].includes(res.status)) break;
    if (provider === "openrouter") throw new VideoGenError("OpenRouter content endpoint redirected; refusing to forward credentials. Resume or download from your provider console.");
    const next = res.headers.get("location");
    if (!next || !mediaHost(new URL(next, target).href, provider)) throw new VideoGenError("Video download redirected to an untrusted host; refusing the redirect.");
    void res.body?.cancel().catch(() => {});
    target = new URL(next, target).href;
    res = undefined;
  }
  if (!res) throw new VideoGenError("Video download redirected too many times; the job can be resumed.");
  if (!res.ok || !res.body) {
    void res.body?.cancel().catch(() => {});
    throw new VideoGenError(`Video download returned HTTP ${res.status}; resume job before its media URL expires.`);
  }
  if (Number(res.headers.get("content-length")) > MAX_VIDEO) throw new VideoGenError("Video exceeds the 300 MB download limit.");
  const path = join(dir, `${name}.mp4`);
  const temp = join(dir, `.video-${randomUUID()}.tmp`);
  try {
    const file = await open(temp, "wx", 0o600);
    const reader = res.body.getReader();
    let total = 0;
    let header = Buffer.alloc(0);
    try {
      for (;;) {
        if (signal.aborted) cancelled(signal);
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_VIDEO) throw new VideoGenError("Video exceeds the 300 MB download limit.");
        if (header.length < 8) header = Buffer.concat([header, Buffer.from(value.subarray(0, 8 - header.length))]);
        await file.writeFile(value);
      }
      if (header.length < 8 || header.toString("ascii", 4, 8) !== "ftyp") throw new VideoGenError("Provider returned non-MP4 data; nothing was saved.");
    } catch (error) {
      if (signal.aborted) cancelled(signal);
      if (error instanceof VideoGenError) throw error;
      throw new VideoGenError("Video download failed mid-stream; resume the job before its URL expires.");
    } finally { reader.releaseLock(); await file.close(); }
    // Same-directory hard link is exclusive even against concurrent writers/symlinks.
    // rename() alone would overwrite an existing file on POSIX.
    await link(temp, path).catch((error) => {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new VideoGenError("Video output already exists; refusing to overwrite it.");
      throw error;
    });
    return path;
  } finally { await unlink(temp).catch(() => {}); }
}

const active = new Set<string>();
async function generate(p: Params, ctx: ExtensionContext, toolSignal?: AbortSignal): Promise<{ path: string; jobId: string; provider: Provider; model: string; method: string }> {
  const settings = await loadSettings();
  const root = outputRoot(ctx.cwd, settings);
  const signal = toolSignal || ctx.signal ? AbortSignal.any([...(toolSignal ? [toolSignal] : []), ...(ctx.signal ? [ctx.signal] : []), AbortSignal.timeout(DEADLINE_MS)]) : AbortSignal.timeout(DEADLINE_MS);
  let id: string;
  let job: Job;
  let dir: string;
  let auth: { primary: Credential; fallback?: Credential };
  let method: string;
  if (p.jobId !== undefined) {
    if (!JOB_ID.test(p.jobId)) throw new VideoGenError("jobId must be a video_generate UUID from a prior call.");
    if (Object.keys(p).some((key) => key !== "jobId" && (p as Record<string, unknown>)[key] !== undefined)) throw new VideoGenError("When resuming, pass only jobId; the previous model and inputs are already fixed.");
    id = p.jobId;
    dir = join(root, id);
    job = await loadJob(dir);
    if (job.state === "submitting" || job.state === "ambiguous") throw new VideoGenError(`Job ${id} has no confirmed remote task ID. It MAY have been billed. Check the ${job.provider} activity/console before making a new request; do not automatically re-submit.`);
    if (job.state === "rejected" || job.state === "failed") throw new VideoGenError(`Job ${id} was rejected or failed at ${job.provider}; a new prompt/request requires a new job.`);
    auth = await credentials(ctx, job.provider);
  } else {
    const selected = resolveVideoModel(settings.defaultModel);
    validate(p, selected);
    auth = await credentials(ctx, selected.provider);
    const first = await loadFrame(p.firstFrame, ctx.cwd);
    const last = await loadFrame(p.lastFrame, ctx.cwd);
    if (signal.aborted) cancelled(signal);
    id = randomUUID();
    dir = join(root, id);
    job = { version: 1, ...selected, state: "submitting", filename: p.filename ?? `video-${id}` };
    await mkdir(dir, { recursive: false }).catch(async (error) => {
      // The output root may not exist yet, but don't swallow other errors.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await mkdir(root, { recursive: true });
      await mkdir(dir);
    });
    await saveJob(dir, job, true);
    if (active.has(dir)) throw new VideoGenError(`Job ${id} is already running in this Pi process.`);
    active.add(dir);
    try {
      const request = submitBody(p, selected, first, last);
      const submit = async (credential: Credential) => requestJson(request.url, {
        method: "POST", signal, headers: { ...authHeaders(job.provider, credential), "content-type": "application/json" }, body: JSON.stringify(request.body),
      }, `${job.provider} video submit`);
      let response: Record<string, unknown>;
      let used = auth.primary;
      try { response = await submit(used); }
      catch (error) {
        if (error instanceof HttpError && [401, 403].includes(error.status)) {
          if (!auth.fallback) {
            job.state = "rejected";
            await saveJob(dir, job);
            throw new VideoGenError(`${job.provider} OAuth was rejected (HTTP ${error.status}); no distinct API key fallback is configured. ${HINT[job.provider]}`);
          }
          used = auth.fallback;
          try { response = await submit(used); }
          catch (fallbackError) {
            job.state = fallbackError instanceof HttpError && fallbackError.status < 500 ? "rejected" : "ambiguous";
            await saveJob(dir, job);
            throw fallbackError;
          }
        } else {
          job.state = error instanceof HttpError && error.status < 500 ? "rejected" : "ambiguous";
          await saveJob(dir, job);
          throw error;
        }
      }
      const handle = remoteId(response, job.provider);
      if (!handle) {
        job.state = "ambiguous";
        await saveJob(dir, job);
        throw new VideoGenError(`${job.provider} accepted the request but did not return a valid task ID. Check provider activity before retrying; a clip may have been billed.`);
      }
      job.remoteId = handle;
      job.state = "running";
      await saveJob(dir, job);
      auth.primary = used;
    } catch (error) {
      const reason = error instanceof VideoGenError ? error.message : "Could not persist the video job; check output directory permissions.";
      throw new VideoGenError(`${reason} Job ${id} is in ${dir}; never blindly repeat an ambiguous paid submission.`);
    } finally { active.delete(dir); }
  }
  method = auth.primary.method;
  if (active.has(dir)) throw new VideoGenError(`Job ${id} is already running in this Pi process.`);
  active.add(dir);
  try {
    const file = join(dir, `${job.filename}.mp4`);
    // A download can finish just before a process crash, leaving state=running.
    // Accept a verified MP4 without paying for another job or overwriting it.
    const existing = await lstat(file).catch(() => null);
    if (existing) {
      if (!existing.isFile() || existing.isSymbolicLink()) throw new VideoGenError("Existing video output is not a regular file; refusing to overwrite it.");
      const handle = await open(file, "r");
      const header = Buffer.alloc(8);
      try { await handle.read(header, 0, 8, 0); } finally { await handle.close(); }
      if (header.toString("ascii", 4, 8) !== "ftyp") throw new VideoGenError("Existing video output is not an MP4; refusing to overwrite it.");
      if (job.state !== "complete") { job.state = "complete"; await saveJob(dir, job); }
      return { path: file, jobId: id, provider: job.provider, model: job.model, method };
    }
    if (!job.remoteId) throw new VideoGenError("Job has no saved remote task ID; check the provider console.");
    let url: string | undefined;
    for (;;) {
      if (signal.aborted) cancelled(signal);
      const endpoint = job.provider === "google" ? `${BASE.google}/${job.remoteId}` : `${BASE[job.provider]}/videos/${encodeURIComponent(job.remoteId)}`;
      let status: Record<string, unknown>;
      try { status = await requestJson(endpoint, { signal, headers: authHeaders(job.provider, auth.primary) }, `${job.provider} video status`); }
      catch (error) {
        // Polling is read-only: if a refreshed OAuth token lost video access,
        // a separately configured API key is safe to try without double billing.
        if (!(error instanceof HttpError) || ![401, 403].includes(error.status) || !auth.fallback) throw error;
        status = await requestJson(endpoint, { signal, headers: authHeaders(job.provider, auth.fallback) }, `${job.provider} video status`);
        auth.primary = auth.fallback;
        method = "api_key";
      }
      if (job.provider === "google") {
        if (status.done === true) {
          if (status.error || !videoUrl(status, job.provider)) {
            job.state = "failed"; await saveJob(dir, job);
            throw new VideoGenError("Google Veo completed without a video (failed, blocked or unsupported input). See provider console for details.");
          }
          url = videoUrl(status, job.provider); break;
        }
      } else {
        const phase = status.status;
        if (phase === (job.provider === "xai" ? "done" : "completed")) {
          if (job.provider === "xai" && (status.video as Record<string, unknown> | undefined)?.respect_moderation === false) {
            job.state = "failed"; await saveJob(dir, job);
            throw new VideoGenError("xAI filtered the generated video for moderation; nothing was downloaded.");
          }
          url = videoUrl(status, job.provider); break;
        }
        if (["failed", "cancelled", "expired"].includes(phase as string)) {
          job.state = "failed"; await saveJob(dir, job);
          throw new VideoGenError(`${job.provider} video task ${phase}. Change the prompt/settings before submitting a new job.`);
        }
        if (!["pending", "in_progress"].includes(phase as string)) throw new VideoGenError(`${job.provider} returned unknown video status; the task ID is saved for resuming.`);
      }
      await sleep(POLL_MS, signal);
    }
    if (job.provider === "openrouter") url = `${BASE.openrouter}/videos/${encodeURIComponent(job.remoteId)}/content`;
    if (!url) throw new VideoGenError("Provider marked the task complete without a video URL. The task ID is saved.");
    const path = await download(url, dir, job.filename, job.provider, auth.primary, signal);
    job.state = "complete";
    await saveJob(dir, job);
    return { path, jobId: id, provider: job.provider, model: job.model, method };
  } catch (error) {
    const reason = error instanceof VideoGenError ? error.message : "Video generation failed; check provider availability and output directory permissions.";
    throw new VideoGenError(`${reason} Job ${id} can be resumed with video_generate({jobId: "${id}"}) if still running; do not submit a second paid job without checking provider activity.`);
  } finally { active.delete(dir); }
}

export default function videoGenExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "video_generate",
    label: "Generate Video",
    description: "Generate ONE paid video clip using pi-video-gen.defaultModel (xAI Grok Imagine, Google Veo, or OpenRouter video models such as Seedance). Saves an MP4 and a resumable job under .pi/videos. Polling may take minutes; if interrupted, call again with ONLY jobId rather than creating a second paid job. No video preview is attached; give the user the saved path.",
    parameters: Type.Object({
      prompt: Type.Optional(Type.String({ description: "Describe subject, scene, camera motion, actions and sound. Required for a new clip; omit with jobId." })),
      firstFrame: Type.Optional(Type.String({ description: "Local PNG/JPEG/WebP image path inside cwd to animate as the first frame (image-to-video)." })),
      lastFrame: Type.Optional(Type.String({ description: "Optional final frame for interpolation; supported by Veo 3.1, Grok Imagine 1.5 and compatible OpenRouter models." })),
      duration: Type.Optional(Type.Integer({ minimum: 1, maximum: 30, description: "Seconds; model-dependent (xAI 1-15, Veo 4/6/8). Omit for model default." })),
      aspectRatio: Type.Optional(Type.String({ description: "e.g. 16:9 or 9:16; support depends on model." })),
      resolution: Type.Optional(Type.String({ description: "e.g. 720p, 1080p. Larger clips cost more; support depends on model." })),
      generateAudio: Type.Optional(Type.Boolean({ description: "xAI/OpenRouter only. Google Veo generates audio by default." })),
      filename: Type.Optional(Type.String({ description: "Optional safe output filename stem (letters, numbers, _ or - only); files are never overwritten." })),
      jobId: Type.Optional(Type.String({ description: "Resume an earlier video_generate job without paying for another submission. Pass ONLY jobId." })),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      try {
        const result = await generate(params, ctx, signal);
        return { content: [{ type: "text" as const, text: `Generated ${result.provider}/${result.model} video (${result.method === "oauth" ? "Pi OAuth" : "Pi API key"}). MP4: ${result.path}\nJob ID: ${result.jobId}\nGive the user the saved MP4 path; use this job ID to resume instead of re-submitting after an interruption.` }],
          details: { provider: result.provider, model: result.model, authMethod: result.method, path: result.path, jobId: result.jobId } };
      } catch (error) {
        if (error instanceof VideoGenError) throw error;
        throw new VideoGenError("Video generation failed unexpectedly; check settings, output directory and provider availability.");
      }
    },
  });
  pi.registerCommand("video-gen", {
    description: "Show selected video model and Pi credential readiness (OAuth first, API key second)",
    handler: async (_args, ctx) => {
      try {
        const selection = resolveVideoModel((await loadSettings()).defaultModel);
        const auth = await credentials(ctx, selection.provider);
        if (ctx.hasUI) ctx.ui.notify(`${selection.provider}/${selection.model}: ${auth.primary.method === "oauth" ? "Pi OAuth preferred" : "Pi API key"}${auth.fallback ? "; API key fallback configured" : ""}. Output: ${outputRoot(ctx.cwd, await loadSettings())}`, "info");
      } catch (error) {
        if (ctx.hasUI) ctx.ui.notify(error instanceof VideoGenError ? error.message : "Could not inspect video settings.", "warning");
      }
    },
  });
}
