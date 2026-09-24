import { mkdir, open, readFile, realpath, lstat, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { Type } from "typebox";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

// Standalone personal extension: no extra keys, SDKs, or package installation.
// The image model is selected in ~/.pi/agent/settings.json, NOT the chat model.
type Provider = "openai" | "google" | "openrouter";
type ImageSettings = { defaultModel: string; outputDir?: string };
type ModelSelection = { provider: Provider; model: string };
type ImageParams = {
  prompt: string;
  image?: string[];
  n?: number;
  size?: string;
  aspectRatio?: string;
  imageSize?: string;
  quality?: "auto" | "low" | "medium" | "high" | "xhigh" | "max";
  filename?: string;
};
type InputImage = { bytes: Buffer; mime: string };

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 80 * 1024 * 1024;
const GOOGLE_MODELS: Record<string, string> = {
  "nano-banana": "gemini-2.5-flash-image",
  "nano-banana-2": "gemini-3.1-flash-image",
  "nano-banana-2-lite": "gemini-3.1-flash-lite-image",
  "nano-banana-pro": "gemini-3-pro-image",
  "gemini-2.5-flash-image": "gemini-2.5-flash-image",
  "gemini-3.1-flash-image": "gemini-3.1-flash-image",
  "gemini-3.1-flash-lite-image": "gemini-3.1-flash-lite-image",
  "gemini-3-pro-image": "gemini-3-pro-image",
};
const ENDPOINTS: Record<Provider, string> = {
  openai: "https://api.openai.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta",
  openrouter: "https://openrouter.ai/api/v1",
};
const CREDENTIAL_HINTS: Record<Provider, string> = {
  openai: "Run /login openai or set OPENAI_API_KEY. An openai-codex subscription token does not authenticate the OpenAI Images API.",
  google: "Run /login google or set GEMINI_API_KEY.",
  openrouter: "Run /login openrouter or set OPENROUTER_API_KEY.",
};

class ImageGenError extends Error {}

function agentDir(): string {
  return process.env.PI_CODING_AGENT_DIR || join(homedir(), ".pi", "agent");
}

async function loadSettings(): Promise<ImageSettings> {
  let root: unknown;
  try {
    root = JSON.parse(await readFile(join(agentDir(), "settings.json"), "utf8"));
  } catch {
    throw new ImageGenError("Cannot read Pi's global settings.json. Set pi-image-gen.defaultModel in ~/.pi/agent/settings.json.");
  }
  const section = (root as Record<string, unknown> | null)?.["pi-image-gen"];
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    throw new ImageGenError('Set "pi-image-gen": { "defaultModel": "gpt-image-2.5-flare" } in ~/.pi/agent/settings.json.');
  }
  const { defaultModel, outputDir } = section as Record<string, unknown>;
  if (typeof defaultModel !== "string" || !defaultModel.trim()) {
    throw new ImageGenError('pi-image-gen.defaultModel must be a nonempty model ID (e.g. "gpt-image-2.5-flare").');
  }
  if (outputDir !== undefined && (typeof outputDir !== "string" || !outputDir.trim())) {
    throw new ImageGenError("pi-image-gen.outputDir must be a nonempty directory path.");
  }
  return { defaultModel: defaultModel.trim(), ...(outputDir ? { outputDir: outputDir as string } : {}) };
}

/** Accept only the three image providers; an OpenRouter slug includes its vendor. */
export function resolveImageModel(configured: string): ModelSelection {
  const id = configured.trim();
  if (id.startsWith("openrouter/")) {
    const slug = id.slice("openrouter/".length);
    if (slug.split("/").length >= 2 && slug.split("/").every((part) => /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/i.test(part)) && !slug.includes("..")) {
      return { provider: "openrouter", model: slug };
    }
    throw new ImageGenError('OpenRouter image models must use "openrouter/vendor/model-id".');
  }
  const [prefix, ...rest] = id.split("/");
  const model = rest.length ? rest.join("/") : id;
  if ((!rest.length || prefix === "openai") && /^gpt-image-[a-z0-9][a-z0-9.-]*$/i.test(model)) {
    return { provider: "openai", model: model === "gpt-image-2.5" ? "gpt-image-2.5-flare" : model };
  }
  if ((!rest.length || prefix === "google") && GOOGLE_MODELS[model]) {
    return { provider: "google", model: GOOGLE_MODELS[model] };
  }
  throw new ImageGenError(`Unsupported image model "${id}". Use gpt-image-2.5-flare, google/nano-banana-2, or openrouter/vendor/model-id. Only OpenAI, Google and OpenRouter are supported.`);
}

function mimeFromBytes(bytes: Uint8Array): string | undefined {
  if (bytes.length >= 8 && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP") return "image/webp";
  if (bytes.length >= 6 && /^GIF8[79]a$/.test(Buffer.from(bytes.subarray(0, 6)).toString())) return "image/gif";
  return undefined;
}

async function loadInputs(paths: string[] | undefined, cwd: string): Promise<InputImage[]> {
  if (!paths?.length) return [];
  if (paths.length > 16) throw new ImageGenError("At most 16 reference images can be supplied.");
  const root = await realpath(cwd);
  const inputs: InputImage[] = [];
  for (const path of paths) {
    if (typeof path !== "string" || !path.trim() || /^\w+:\/\//.test(path)) {
      throw new ImageGenError("Reference images must be local file paths inside the working directory (not URLs or data URIs).");
    }
    const full = resolve(root, path);
    const rel = relative(root, full);
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      throw new ImageGenError("Reference images must stay inside the working directory.");
    }
    try {
      const info = await lstat(full);
      if (!info.isFile() || info.size > MAX_IMAGE_BYTES || (await realpath(full)) !== full) {
        throw new ImageGenError("Reference images must be regular, non-symlink files of at most 50 MB inside the working directory.");
      }
      const bytes = await readFile(full);
      const mime = mimeFromBytes(bytes);
      if (!mime) throw new ImageGenError("Reference images must be PNG, JPEG, WebP or GIF files.");
      inputs.push({ bytes, mime });
    } catch (error) {
      if (error instanceof ImageGenError) throw error;
      throw new ImageGenError("Could not read a reference image. Check that the file exists inside the working directory.");
    }
  }
  return inputs;
}

function validateParams(params: ImageParams, { provider, model }: ModelSelection): void {
  if (!params.prompt?.trim()) throw new ImageGenError("image_generate requires a nonempty prompt.");
  if (params.n !== undefined && (!Number.isInteger(params.n) || params.n < 1 || params.n > (provider === "google" ? 8 : 10))) {
    throw new ImageGenError(`n must be an integer from 1 to ${provider === "google" ? 8 : 10}.`);
  }
  if (provider === "openai" && (params.aspectRatio || params.imageSize)) {
    throw new ImageGenError("OpenAI GPT Image uses size (WIDTHxHEIGHT), not aspectRatio/imageSize.");
  }
  if (provider === "google" && (params.size || params.quality)) {
    throw new ImageGenError("Google Nano Banana uses aspectRatio/imageSize, not size/quality.");
  }
  if (provider === "google" && params.imageSize && (model === "gemini-2.5-flash-image" || model === "gemini-3.1-flash-lite-image")) {
    throw new ImageGenError("This Nano Banana model has a fixed output resolution; omit imageSize.");
  }
  if (params.imageSize && !["512px", "512", "1K", "2K", "4K"].includes(params.imageSize)) {
    throw new ImageGenError("imageSize must be 512px, 1K, 2K or 4K.");
  }
  if (provider === "google" && params.imageSize &&
      ((params.imageSize === "512px" && model !== "gemini-3.1-flash-image") || params.imageSize === "512")) {
    throw new ImageGenError('For Google, 512px is supported only by gemini-3.1-flash-image; otherwise use 1K, 2K or 4K.');
  }
  if (params.aspectRatio && !/^\d{1,2}:\d{1,2}$/.test(params.aspectRatio)) {
    throw new ImageGenError('aspectRatio must be a ratio such as "16:9".');
  }
  if (params.size && !/^(auto|\d{3,4}x\d{3,4}|[124]K)$/.test(params.size)) {
    throw new ImageGenError('size must be "auto", "1024x1024", or (for OpenRouter) a tier like "2K".');
  }
  if (provider === "openai" && params.size && /^[124]K$/.test(params.size)) {
    throw new ImageGenError("OpenAI GPT Image size must be WIDTHxHEIGHT or auto; tiers are for OpenRouter.");
  }
}

// A limit on the *entire* HTTP body, including JSON/base64. Never log response bodies or keys.
async function readBounded(response: Response, limit = MAX_RESPONSE_BYTES): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new ImageGenError("The image provider returned an empty response.");
  const chunks: Buffer[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) throw new ImageGenError("The image provider response exceeded the 80 MB safety limit.");
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, length).toString("utf8");
}

async function requestJson(url: string, init: RequestInit, provider: Provider): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    if (init.signal?.aborted) throw new ImageGenError("Image generation was cancelled or timed out.");
    throw new ImageGenError(`${provider} image request failed to connect. Check network access and try again.`);
  }
  if (!response.ok) {
    // Provider bodies can contain signed URLs, prompt text or credentials: never echo them.
    void response.body?.cancel().catch(() => {});
    const hint = response.status === 401 || response.status === 403 ? " Check the provider's API key and image API access."
      : response.status === 429 ? " Rate limit or quota exceeded."
      : response.status === 400 ? " Check the model, prompt and image options."
      : " Check your provider account and try again.";
    throw new ImageGenError(`${provider} image API returned HTTP ${response.status}.${hint}`);
  }
  try {
    const parsed: unknown = JSON.parse(await readBounded(response));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ImageGenError) throw error;
    if (init.signal?.aborted) throw new ImageGenError("Image generation was cancelled or timed out.");
    throw new ImageGenError(`${provider} image API returned an invalid or unreadable JSON response.`);
  }
}

function decodeImage(base64: unknown): InputImage {
  if (typeof base64 !== "string" || !base64 || base64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 16) {
    throw new ImageGenError("The provider returned missing or oversized image data.");
  }
  const bytes = Buffer.from(base64, "base64");
  const mime = mimeFromBytes(bytes);
  if (!mime || bytes.length > MAX_IMAGE_BYTES) throw new ImageGenError("The provider returned an invalid or oversized raster image.");
  return { bytes, mime };
}

function extractImages(json: Record<string, unknown>, provider: Provider): InputImage[] {
  const images: InputImage[] = [];
  if (provider === "google") {
    const candidates = Array.isArray(json.candidates) ? json.candidates : [];
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts;
      if (!Array.isArray(parts)) continue;
      for (const part of parts) {
        const data = part?.inlineData?.data ?? part?.inline_data?.data;
        if (data) images.push(decodeImage(data));
      }
    }
  } else {
    const data = Array.isArray(json.data) ? json.data : [];
    for (const item of data) {
      if (item?.b64_json) images.push(decodeImage(item.b64_json));
      else if (item?.url) throw new ImageGenError(`${provider} returned a URL instead of image bytes; this extension only accepts base64 image responses.`);
    }
  }
  if (!images.length) throw new ImageGenError(`${provider} returned no images. The model may have refused the prompt; try rephrasing it.`);
  if (images.length > 10) throw new ImageGenError("The provider returned more than 10 images; nothing was saved.");
  return images;
}

async function generate(params: ImageParams, ctx: ExtensionContext, toolSignal?: AbortSignal) {
  const settings = await loadSettings();
  const selected = resolveImageModel(settings.defaultModel);
  validateParams(params, selected);
  const key = await ctx.modelRegistry.getApiKeyForProvider(selected.provider);
  if (!key) throw new ImageGenError(`${selected.provider} is not configured with an API key in Pi. ${CREDENTIAL_HINTS[selected.provider]}`);
  const inputs = await loadInputs(params.image, ctx.cwd);
  const { provider, model } = selected;
  const turnSignal = toolSignal ?? ctx.signal;
  const signal = turnSignal ? AbortSignal.any([turnSignal, AbortSignal.timeout(300_000)]) : AbortSignal.timeout(300_000);
  let url: string;
  let init: RequestInit;
  if (provider === "google") {
    url = `${ENDPOINTS.google}/models/${encodeURIComponent(model)}:generateContent`;
    const imageConfig: Record<string, string> = {};
    if (params.aspectRatio) imageConfig.aspectRatio = params.aspectRatio;
    if (params.imageSize) imageConfig.imageSize = params.imageSize;
    const parts = inputs.map(({ bytes, mime }) => ({ inline_data: { mime_type: mime, data: bytes.toString("base64") } }));
    init = {
      method: "POST", signal,
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [...parts, { text: params.prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"], candidateCount: params.n ?? 1, ...(Object.keys(imageConfig).length ? { imageConfig } : {}) },
      }),
    };
  } else if (provider === "openai" && inputs.length) {
    url = `${ENDPOINTS.openai}/images/edits`;
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", params.prompt);
    form.append("n", String(params.n ?? 1));
    if (params.size) form.append("size", params.size);
    if (params.quality) form.append("quality", params.quality);
    for (const [index, input] of inputs.entries()) {
      form.append(inputs.length > 1 ? "image[]" : "image", new Blob([new Uint8Array(input.bytes)], { type: input.mime }), `reference-${index}.${input.mime.split("/")[1]}`);
    }
    init = { method: "POST", signal, headers: { authorization: `Bearer ${key}` }, body: form };
  } else {
    url = `${ENDPOINTS[provider]}/images${provider === "openai" ? "/generations" : ""}`;
    const body: Record<string, unknown> = { model, prompt: params.prompt, n: params.n ?? 1 };
    if (params.size) body.size = params.size;
    if (params.quality) body.quality = params.quality;
    if (provider === "openrouter") {
      if (params.aspectRatio) body.aspect_ratio = params.aspectRatio;
      if (params.imageSize) body.resolution = params.imageSize === "512px" ? "512" : params.imageSize;
      if (inputs.length) body.input_references = inputs.map(({ bytes, mime }) => ({ type: "image_url", image_url: { url: `data:${mime};base64,${bytes.toString("base64")}` } }));
    }
    init = { method: "POST", signal, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify(body) };
  }
  const images = extractImages(await requestJson(url, init, provider), provider);
  if (signal.aborted) throw new ImageGenError("Image generation was cancelled or timed out.");
  const dir = resolve(ctx.cwd, settings.outputDir ?? ".pi/images");
  try { await mkdir(dir, { recursive: true }); }
  catch { throw new ImageGenError("Could not create the image output directory. Check pi-image-gen.outputDir and its permissions."); }
  const stem = (params.filename ?? `${model.replace(/[^a-zA-Z0-9_-]/g, "-")}-${new Date().toISOString().replace(/[:.]/g, "-")}`)
    .replace(/[^a-zA-Z0-9_-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "image";
  const paths: string[] = [];
  try {
    for (const [index, image] of images.entries()) {
      if (signal.aborted) throw new ImageGenError("Image generation was cancelled or timed out.");
      const ext = ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" } as Record<string, string>)[image.mime]!;
      const name = `${stem}${images.length > 1 ? `-${index + 1}` : ""}`;
      for (let version = 1; ; version++) {
        const path = join(dir, `${name}${version > 1 ? `-v${version}` : ""}.${ext}`);
        try {
          const file = await open(path, "wx"); // atomic, never overwrite an earlier result
          paths.push(path); // clean up even if the subsequent write fails
          try { await file.writeFile(image.bytes, { signal }); }
          finally { await file.close(); }
          break;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "EEXIST") continue;
          throw new ImageGenError("Could not save the image. Check output directory permissions and available disk space.");
        }
      }
    }
  } catch (error) {
    await Promise.all(paths.map((path) => unlink(path).catch(() => {})));
    throw error;
  }
  return { provider, model, paths };
}

export default function imageGenExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: "image_generate",
    label: "Generate Image",
    description: "Generate or edit raster images with the model selected by pi-image-gen.defaultModel in global settings. Saves files under .pi/images (or the configured outputDir). Include the returned markdown image links in your answer to display them.",
    parameters: Type.Object({
      prompt: Type.String({ description: "Describe the image; for edits say what to change and preserve." }),
      image: Type.Optional(Type.Array(Type.String(), { description: "Local reference image path(s) inside the working directory. Supports PNG, JPEG, WebP, GIF. For edits, pass the previous output file." })),
      n: Type.Optional(Type.Integer({ minimum: 1, maximum: 10, description: "Variants of the same prompt (Google supports at most 8). Default 1." })),
      size: Type.Optional(Type.String({ description: "OpenAI/OpenRouter: WIDTHxHEIGHT (e.g. 1024x1024), auto; OpenRouter also accepts tiers (2K). Not for Google." })),
      aspectRatio: Type.Optional(Type.String({ description: "Google/OpenRouter only, e.g. 16:9. Google uses this instead of size." })),
      imageSize: Type.Optional(Type.String({ description: "Google: 512px/1K/2K/4K if supported; OpenRouter: resolution tier. Not for OpenAI." })),
      quality: Type.Optional(Type.Union([Type.Literal("auto"), Type.Literal("low"), Type.Literal("medium"), Type.Literal("high"), Type.Literal("xhigh"), Type.Literal("max")], { description: "OpenAI GPT Image / OpenRouter only. Omit for model default." })),
      filename: Type.Optional(Type.String({ description: "Safe filename stem, no extension. Existing images are never overwritten." })),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      try {
        const result = await generate(params, ctx, signal);
        return {
          content: [{ type: "text" as const, text: `Generated ${result.paths.length} image(s) with ${result.provider}/${result.model}. Show these inline in your answer:\n${result.paths.map((p) => `![${basename(p).replace(/\]/g, "\\]")}](${p.replace(/[\s#%()?<>]/g, (ch) => encodeURIComponent(ch))})`).join("\n")}` }],
          details: { provider: result.provider, model: result.model, paths: result.paths },
        };
      } catch (error) {
        if (error instanceof ImageGenError) throw error;
        throw new ImageGenError("Image generation failed unexpectedly. Check settings, file permissions, and provider availability.");
      }
    },
  });
  pi.registerCommand("image-gen", {
    description: "Show the selected image model and whether Pi has its provider API key",
    handler: async (_args, ctx) => {
      try {
        const selected = resolveImageModel((await loadSettings()).defaultModel);
        const ready = Boolean(await ctx.modelRegistry.getApiKeyForProvider(selected.provider));
        if (ctx.hasUI) ctx.ui.notify(`${selected.provider}/${selected.model}: ${ready ? "API key configured" : `API key missing. ${CREDENTIAL_HINTS[selected.provider]}`}`, ready ? "info" : "warning");
      } catch (error) {
        if (ctx.hasUI) ctx.ui.notify(error instanceof ImageGenError ? error.message : "Could not inspect image-generation settings.", "error");
      }
    },
  });
}
