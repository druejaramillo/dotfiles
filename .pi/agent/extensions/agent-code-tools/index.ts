/** On-demand code intelligence for Pi. No write/edit/turn hooks. */
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, realpathSync, statSync, readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { Type } from "typebox";
import { withFileMutationQueue, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const AST = join(import.meta.dirname, "node_modules", ".bin", "ast-grep");
const MAX_FILE = 2 * 1024 * 1024;
const MAX_OUTPUT = 256 * 1024;
const text = (message: string) => ({ content: [{ type: "text" as const, text: message.slice(0, 16_000) + (message.length > 16_000 ? "\n[Output truncated]" : "") }], details: undefined });
const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 12);
const within = (parent: string, path: string) => { const r = relative(parent, path); return r === "" || (r !== ".." && !r.startsWith(".." + sep) && !isAbsolute(r)); }; 

function safePath(cwd: string, name: string, kind: "file" | "either" = "file") {
  const root = realpathSync(cwd);
  const requested = resolve(cwd, name);
  const path = realpathSync(requested); // reject missing paths and symlink escapes
  if (!within(root, path)) throw new Error("Path must be inside the current working directory");
  const st = statSync(path);
  if (kind === "file" ? !st.isFile() : !(st.isFile() || st.isDirectory())) throw new Error("Expected a regular " + kind);
  if (st.isFile() && st.size > MAX_FILE) throw new Error("File exceeds 2 MiB limit");
  return path;
}
function rootFor(cwd: string, file: string) {
  let dir = statSync(file).isDirectory() ? file : dirname(file);
  const root = realpathSync(cwd);
  while (within(root, dir)) {
    if (["tsconfig.json", "go.mod", "Cargo.toml", "pyproject.toml", "package.json", ".git"].some(x => existsSync(join(dir, x)))) return dir;
    if (dir === root) break;
    dir = dirname(dir);
  }
  return root;
}
function bin(name: string, root: string) {
  // Project executables take precedence. Never invoke via shell or npm exec.
  for (let d = root; ; d = dirname(d)) {
    const local = join(d, "node_modules", ".bin", name);
    if (existsSync(local)) return local;
    if (d === dirname(d)) break;
  }
  for (const d of (process.env.PATH || "").split(sep === "\\" ? ";" : ":")) {
    const p = join(d, name);
    if (d && existsSync(p)) return p;
  }
  return undefined;
}
async function run(cmd: string, args: string[], cwd: string, input?: string, signal?: AbortSignal, timeout = 20_000, cap = MAX_OUTPUT) {
  return new Promise<{ code: number; out: string; err: string }>((yes, no) => {
    if (signal?.aborted) return no(new Error("Cancelled"));
    const child = spawn(cmd, args, { cwd, stdio: "pipe", env: { ...process.env, NO_COLOR: "1" } });
    const chunks: Buffer[] = [], errors: Buffer[] = [];
    let bytes = 0, settled = false;
    const finish = (error?: Error, code?: number) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal?.removeEventListener("abort", abort);
      if (error) no(error); else yes({ code: code ?? -1, out: Buffer.concat(chunks).toString(), err: Buffer.concat(errors).toString() });
    };
    const abort = () => { child.kill(); finish(new Error("Cancelled")); };
    const timer = setTimeout(() => { child.kill(); finish(new Error(`${basename(cmd)} timed out after ${timeout / 1000}s`)); }, timeout);
    signal?.addEventListener("abort", abort, { once: true });
    for (const [stream, target] of [[child.stdout, chunks], [child.stderr, errors]] as const) stream.on("data", (buf: Buffer) => {
      bytes += buf.length;
      if (bytes > cap) { child.kill(); finish(new Error(`${basename(cmd)} exceeded ${cap} bytes of output; narrow the scope`)); }
      else target.push(buf);
    });
    child.on("error", (e: Error) => finish(e));
    child.on("close", (code: number | null) => finish(undefined, code ?? -1));
    if (input !== undefined) child.stdin.end(input); else child.stdin.end();
    child.stdin.on("error", () => {}); // EPIPE from early-exiting commands
  });
}
function configured(root: string, files: string[]) { return files.some(f => existsSync(join(root, f))); }
function language(file: string) {
  const ext = extname(file).toLowerCase();
  if ([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"].includes(ext)) return "typescript";
  return ({ ".py": "python", ".go": "go", ".rs": "rust", ".lua": "lua", ".sh": "shell", ".bash": "shell", ".c": "cpp", ".h": "cpp", ".cc": "cpp", ".cpp": "cpp", ".hpp": "cpp", ".rb": "ruby", ".php": "php", ".css": "css", ".scss": "css", ".html": "html", ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".md": "markdown", ".sql": "sql" } as Record<string, string>)[ext];
}
const lspLanguages: Record<string, { names: string[]; args: string[]; id: (path: string) => string }> = {
  typescript: { names: ["vtsls", "typescript-language-server"], args: ["--stdio"], id: path => ({ ".jsx": "javascriptreact", ".tsx": "typescriptreact", ".js": "javascript", ".mjs": "javascript", ".cjs": "javascript" } as Record<string, string>)[extname(path)] || "typescript" },
  python: { names: ["basedpyright-langserver", "pyright-langserver"], args: ["--stdio"], id: () => "python" },
  go: { names: ["gopls"], args: ["serve"], id: () => "go" },
  rust: { names: ["rust-analyzer"], args: [], id: () => "rust" },
  lua: { names: ["lua-language-server"], args: [], id: () => "lua" },
  cpp: { names: ["clangd"], args: [], id: path => [".c", ".h"].includes(extname(path)) ? "c" : "cpp" },
  shell: { names: ["bash-language-server"], args: ["start"], id: () => "shellscript" },
  ruby: { names: ["solargraph"], args: ["stdio"], id: () => "ruby" },
  php: { names: ["intelephense"], args: ["--stdio"], id: () => "php" },
  css: { names: ["vscode-css-language-server"], args: ["--stdio"], id: path => extname(path) === ".scss" ? "scss" : "css" },
  html: { names: ["vscode-html-language-server"], args: ["--stdio"], id: () => "html" },
  json: { names: ["vscode-json-language-server"], args: ["--stdio"], id: () => "json" },
  yaml: { names: ["yaml-language-server"], args: ["--stdio"], id: () => "yaml" },
};

class Lsp {
  child: ChildProcessWithoutNullStreams;
  private buffer = Buffer.alloc(0);
  private serial = 0;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();
  private watchers = new Map<string, Set<(d: any[] | null, version?: number) => void>>();
  private opened = new Map<string, number>();
  ready: Promise<any>;
  dead = false;
  constructor(cmd: string, args: string[], readonly root: string) {
    this.child = spawn(cmd, args, { cwd: root, stdio: "pipe" });
    this.child.stdout.on("data", (part: Buffer) => this.receive(part));
    this.child.stderr.on("data", () => {}); // servers log to stderr; never interpret it as protocol
    this.child.on("error", (e: Error) => this.fail(e));
    this.child.on("exit", (code) => this.fail(new Error(`Language server exited (${code})`)));
    const uri = pathToFileURL(root).href;
    this.ready = this.request("initialize", { processId: process.pid, rootUri: uri, workspaceFolders: [{ uri, name: basename(root) }], capabilities: { workspace: { configuration: true, workspaceFolders: true }, textDocument: { publishDiagnostics: { relatedInformation: true }, definition: { linkSupport: true } } } }, 12_000)
      .then(result => { this.notify("initialized", {}); return result; });
  }
  private send(message: any) {
    if (this.dead) throw new Error("Language server is not running");
    const json = Buffer.from(JSON.stringify(message));
    this.child.stdin.write(`Content-Length: ${json.length}\r\n\r\n`);
    this.child.stdin.write(json);
  }
  notify(method: string, params: any) { this.send({ jsonrpc: "2.0", method, params }); }
  request(method: string, params: any, timeout = 10_000): Promise<any> {
    const id = ++this.serial;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method} timed out`)); }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      try { this.send({ jsonrpc: "2.0", id, method, params }); } catch (e) { clearTimeout(timer); this.pending.delete(id); reject(e); }
    });
  }
  private receive(part: Buffer) {
    this.buffer = Buffer.concat([this.buffer, part]);
    if (this.buffer.length > 8 * 1024 * 1024) return this.fail(new Error("LSP message too large"));
    while (true) {
      const end = this.buffer.indexOf("\r\n\r\n");
      if (end < 0) return;
      const match = /(?:^|\r\n)Content-Length:\s*(\d+)/i.exec(this.buffer.subarray(0, end).toString());
      if (!match) return this.fail(new Error("Invalid LSP frame"));
      const length = Number(match[1]);
      if (length > 8 * 1024 * 1024) return this.fail(new Error("LSP frame too large"));
      if (this.buffer.length < end + 4 + length) return;
      const body = this.buffer.subarray(end + 4, end + 4 + length);
      this.buffer = this.buffer.subarray(end + 4 + length);
      try { this.message(JSON.parse(body.toString())); } catch { /* malformed server message */ }
    }
  }
  private message(msg: any) {
    if (msg.id !== undefined && !msg.method) {
      const p = this.pending.get(msg.id); if (!p) return;
      this.pending.delete(msg.id); clearTimeout(p.timer);
      msg.error ? p.reject(new Error(msg.error.message || "LSP error")) : p.resolve(msg.result);
    } else if (msg.method === "textDocument/publishDiagnostics") {
      const uri = msg.params?.uri;
      for (const cb of this.watchers.get(uri) || []) cb(msg.params?.diagnostics || [], msg.params?.version);
    } else if (msg.id !== undefined) {
      const result = msg.method === "workspace/configuration" ? (msg.params?.items || []).map(() => null) : msg.method === "workspace/workspaceFolders" ? [{ uri: pathToFileURL(this.root).href, name: basename(this.root) }] : null;
      this.send({ jsonrpc: "2.0", id: msg.id, result });
    }
  }
  private fail(error: Error) {
    if (this.dead) return;
    this.dead = true;
    this.child.kill();
    for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(error); }
    this.pending.clear();
    for (const callbacks of this.watchers.values()) for (const cb of callbacks) cb(null);
    this.watchers.clear();
  }
  close() { this.fail(new Error("Session ended")); }
  async sync(path: string, id: string) {
    await this.ready;
    const uri = pathToFileURL(path).href;
    const source = await readFile(path, "utf8");
    if (Buffer.byteLength(source) > MAX_FILE || source.includes("\0")) throw new Error("LSP only accepts text files up to 2 MiB");
    const version = (this.opened.get(uri) || 0) + 1;
    this.opened.set(uri, version);
    if (version === 1) this.notify("textDocument/didOpen", { textDocument: { uri, languageId: id, version, text: source } });
    else this.notify("textDocument/didChange", { textDocument: { uri, version }, contentChanges: [{ text: source }] });
    return uri;
  }
  async diagnostics(path: string, id: string, signal?: AbortSignal) {
    const uri = pathToFileURL(path).href;
    // Subscribe before didOpen/didChange to avoid missing a fast publish.
    const expectedVersion = (this.opened.get(uri) || 0) + 1;
    let done!: (d: any[] | null, version?: number) => void;
    const result = new Promise<any[] | null>(resolve => { done = (d, version) => { if (version === undefined || version === expectedVersion) resolve(d); }; });
    const callbacks = this.watchers.get(uri) || new Set<(d: any[] | null, version?: number) => void>();
    callbacks.add(done); this.watchers.set(uri, callbacks);
    const abort = () => done(null);
    signal?.addEventListener("abort", abort, { once: true });
    try {
      await this.sync(path, id);
      const timer = setTimeout(() => done(null), 6_000);
      try { return await result; } finally { clearTimeout(timer); }
    } finally {
      signal?.removeEventListener("abort", abort);
      callbacks.delete(done); if (!callbacks.size) this.watchers.delete(uri);
    }
  }
}

export default function (pi: ExtensionAPI) {
  const clients = new Map<string, Lsp>();
  pi.on("session_shutdown", () => { for (const c of clients.values()) c.close(); clients.clear(); });
  async function client(cwd: string, path: string) {
    const lang = language(path), cfg = lang && lspLanguages[lang];
    if (!cfg) throw new Error(`No LSP mapping for ${extname(path)} (supported: JS/TS, Python, Go, Rust, Lua, C/C++, shell, Ruby, PHP, CSS, HTML, JSON, YAML)`);
    const root = rootFor(cwd, path);
    const key = root + "\0" + lang;
    let c = clients.get(key);
    if (!c || c.dead) {
      const cmd = cfg.names.map(n => bin(n, root)).find(Boolean);
      if (!cmd) throw new Error(`No ${lang} language server found (${cfg.names.join(" or ")}); install it in the project or PATH`);
      c = new Lsp(cmd, cfg.args, root); clients.set(key, c);
    }
    return { c, cfg, root };
  }
  pi.registerTool({
    name: "code_lsp", label: "LSP", description: "On-demand language-server diagnostics or navigation (definition, references, hover, document symbols) for a saved file. Run after a coherent batch of edits, not after each edit. Reports unavailable/timeout, never a false clean result.",
    parameters: Type.Object({ path: Type.String(), operation: Type.Union([Type.Literal("diagnostics"), Type.Literal("definition"), Type.Literal("references"), Type.Literal("hover"), Type.Literal("documentSymbols")]), line: Type.Optional(Type.Number({ minimum: 1, description: "1-based line for navigation" })), character: Type.Optional(Type.Number({ minimum: 1, description: "1-based UTF-16 column" })) }),
    async execute(_id, p, signal, _update, ctx) {
      const path = safePath(ctx.cwd, p.path);
      const { c, cfg } = await client(ctx.cwd, path);
      if (p.operation === "diagnostics") {
        const found = await c.diagnostics(path, cfg.id(path), signal);
        if (found === null) return text("LSP did not publish diagnostics within 6s (not a clean result). Try code_check or retry.");
        return text(found.length ? JSON.stringify(found.slice(0, 60).map((d: any) => ({ line: d.range?.start?.line + 1, column: d.range?.start?.character + 1, severity: d.severity, message: d.message, source: d.source, code: d.code })), null, 2) + (found.length > 60 ? `\n[${found.length - 60} more]` : "") : "LSP published no diagnostics for this file.");
      }
      const uri = await c.sync(path, cfg.id(path));
      const op = p.operation;
      if (op !== "documentSymbols" && (!p.line || !p.character)) throw new Error("line and character (both 1-based) required");
      const params = op === "documentSymbols" ? { textDocument: { uri } } : { textDocument: { uri }, position: { line: p.line! - 1, character: p.character! - 1 }, ...(op === "references" ? { context: { includeDeclaration: true } } : {}) };
      const method = ({ definition: "textDocument/definition", references: "textDocument/references", hover: "textDocument/hover", documentSymbols: "textDocument/documentSymbol" } as Record<string, string>)[op];
      const result = await c.request(method, params);
      return text(JSON.stringify(result ?? null, null, 2));
    },
  });

  pi.registerTool({
    name: "code_check", label: "Lint & typecheck", description: "On-demand language-specific lint and type checks on saved code. Run when a logical edit batch is done. Uses installed/configured project tools; reports each run, skipped lane, exit code and output; never modifies files. scope=project enables full-project type/build checks (may take time).",
    parameters: Type.Object({ path: Type.String({ description: "Representative file in the project" }), scope: Type.Optional(Type.Union([Type.Literal("file"), Type.Literal("project")])) }),
    async execute(_id, p, signal, _update, ctx) {
      const path = safePath(ctx.cwd, p.path), root = rootFor(ctx.cwd, path), lang = language(path), project = p.scope === "project";
      const jobs: { name: string; cmd: string; args: string[]; cwd: string }[] = [], skipped: string[] = [];
      const add = (name: string, names: string[], args: string[], dir = root) => {
        const cmd = names.map(n => bin(n, root)).find(Boolean);
        if (cmd) jobs.push({ name, cmd, args, cwd: dir }); else skipped.push(`${name}: executable missing (${names.join("/")})`);
      };
      if (lang === "typescript") {
        if (configured(root, ["biome.json", "biome.jsonc"])) add("Biome lint", ["biome"], ["lint", project ? "." : path]);
        else if (configured(root, ["eslint.config.js", "eslint.config.mjs", "eslint.config.cjs", "eslint.config.ts", ".eslintrc", ".eslintrc.json", ".eslintrc.js", ".eslintrc.cjs"])) add("ESLint", ["eslint"], [project ? "." : path]);
        else skipped.push("JS/TS lint: no Biome/ESLint project config");
        if (configured(root, ["tsconfig.json", "jsconfig.json"])) {
          if (project) add("TypeScript typecheck", ["tsc"], ["--noEmit", "--project", existsSync(join(root, "tsconfig.json")) ? root : join(root, "jsconfig.json")]);
          else skipped.push("TypeScript typecheck: project-scoped; call scope=project after edits");
        }
      } else if (lang === "python") {
        add("Ruff lint", ["ruff"], ["check", project ? "." : path]);
        if (project || existsSync(join(root, "pyrightconfig.json")) || existsSync(join(root, "pyproject.toml"))) add("Pyright typecheck", ["basedpyright", "pyright"], [project ? root : path]);
        else skipped.push("Python typecheck: call scope=project or add Pyright config");
      } else if (lang === "go") {
        if (project && existsSync(join(root, "go.mod"))) add("Go vet/typecheck", ["go"], ["vet", "./..."]);
        else skipped.push("Go vet: project-scoped; requires go.mod and scope=project");
      } else if (lang === "rust") {
        if (project && existsSync(join(root, "Cargo.toml"))) add("Cargo check", ["cargo"], ["check", "--message-format=short"]);
        else skipped.push("Rust typecheck: project-scoped; requires Cargo.toml and scope=project");
      } else if (lang === "shell") add("ShellCheck", ["shellcheck"], [path]);
      else if (lang === "ruby") {
        if (configured(root, [".rubocop.yml", ".rubocop.yaml"])) add("RuboCop", ["rubocop"], ["--format", "simple", project ? "." : path]);
        else skipped.push("Ruby lint: no .rubocop.yml config");
      } else if (lang === "php") add("PHP syntax", ["php"], ["-l", path]);
      else if (lang === "cpp") {
        add("Clang syntax (single file; project flags may be required)", [extname(path) === ".c" ? "clang" : "clang++"], ["-fsyntax-only", path]);
      } else if (lang === "css") {
        if (configured(root, ["stylelint.config.js", "stylelint.config.mjs", ".stylelintrc", ".stylelintrc.json"])) add("Stylelint", ["stylelint"], [project ? "**/*.{css,scss}" : path]);
        else skipped.push("CSS lint: no Stylelint config");
      } else if (lang === "yaml") add("YAML lint", ["yamllint"], [project ? "." : path]);
      else if (lang === "markdown") add("Markdown lint", ["markdownlint-cli2"], [project ? "**/*.md" : path]);
      else if (lang === "sql") {
        if (configured(root, [".sqlfluff", "pyproject.toml"])) add("SQLFluff", ["sqlfluff"], ["lint", project ? "." : path]);
        else skipped.push("SQL lint: no SQLFluff config");
      } else if (lang === "json") {
        if (configured(root, ["biome.json", "biome.jsonc"])) add("Biome lint", ["biome"], ["lint", project ? "." : path]);
        else skipped.push("JSON lint: no Biome config");
      } else skipped.push(`No lint/typecheck mapping for ${extname(path)}`);
      const reports: string[] = [];
      for (const job of jobs) {
        try {
          const r = await run(job.cmd, job.args, job.cwd, undefined, signal, project ? 120_000 : 30_000);
          reports.push(`${job.name}: exit ${r.code}\n${(r.out + "\n" + r.err).trim() || "(no output)"}`);
        } catch (e) { reports.push(`${job.name}: FAILED TO RUN: ${String(e)}`); }
      }
      return text([...reports, ...skipped.map(s => `SKIPPED: ${s}`)].join("\n\n"));
    },
  });

  pi.registerTool({
    name: "code_format", label: "Format preview/apply", description: "On-demand single-file safe formatter. Default preview only; apply=true writes ONLY this file after a fresh read under a file mutation queue. Configured Prettier/Biome for JS/TS/CSS/HTML/JSON/YAML/Markdown; Ruff/Black for Python; gofmt, shfmt, configured clang-format or StyLua. Never runs on edit.",
    parameters: Type.Object({ path: Type.String(), apply: Type.Optional(Type.Boolean({ description: "Explicitly apply the formatted result (default false)" })) }),
    async execute(_id, p, signal, _update, ctx) {
      const path = safePath(ctx.cwd, p.path), root = rootFor(ctx.cwd, path), lang = language(path);
      let name = "", cmd: string | undefined, args: string[] = [];
      const choose = (label: string, binary: string, a: string[]) => { name = label; cmd = bin(binary, root); args = a; };
      if (["typescript", "css", "html", "json", "yaml", "markdown"].includes(lang || "")) {
        if (configured(root, ["biome.json", "biome.jsonc"]) && ["typescript", "css", "json"].includes(lang!)) choose("Biome", "biome", ["format", "--stdin-file-path", path]);
        else if (configured(root, [".prettierrc", ".prettierrc.json", ".prettierrc.js", ".prettierrc.cjs", ".prettierrc.yaml", ".prettierrc.yml", "prettier.config.js", "prettier.config.cjs", "prettier.config.mjs", "prettier.config.ts"]) || (() => { try { return !!JSON.parse(readFileSync(join(root, "package.json"), "utf8")).prettier; } catch { return false; } })()) choose("Prettier", "prettier", ["--stdin-filepath", path]);
      } else if (lang === "python") {
        if (bin("ruff", root)) choose("Ruff", "ruff", ["format", "--stdin-filename", path, "-"]);
        else if (bin("black", root)) choose("Black", "black", ["--quiet", "--stdin-filename", path, "-"]);
      } else if (lang === "go") choose("gofmt", "gofmt", []);
      else if (lang === "shell") choose("shfmt", "shfmt", ["-filename", path]);
      else if (lang === "cpp" && configured(root, [".clang-format", "_clang-format"])) choose("clang-format", "clang-format", ["--assume-filename", path]);
      else if (lang === "lua" && configured(root, ["stylua.toml", ".stylua.toml"])) choose("StyLua", "stylua", ["--stdin-filepath", path, "-"]);
      if (!name || !cmd) return text("SKIPPED: no confidently selected formatter or executable. Configure a project formatter, or format manually.");
      const format = async () => {
        const before = await readFile(path, "utf8");
        if (Buffer.byteLength(before) > MAX_FILE || before.includes("\0")) throw new Error("Only text files up to 2 MiB can be formatted");
        const r = await run(cmd!, args, root, before, signal, 20_000, Math.max(MAX_OUTPUT, Buffer.byteLength(before) * 3 + 4096));
        if (r.code !== 0) throw new Error(`${name} exited ${r.code}: ${r.err || r.out}`);
        if (!r.out && before) throw new Error(`${name} produced empty output; refusing to overwrite`);
        const after = r.out;
        const changed = before !== after;
        // Compact preview: changed region, not the entire file.
        const a = before.split("\n"), b = after.split("\n");
        let first = 0; while (first < Math.min(a.length, b.length) && a[first] === b[first]) first++;
        const preview = changed ? `First differing line ${first + 1}\nBEFORE:\n${a.slice(first, first + 8).join("\n").slice(0, 900)}\nAFTER:\n${b.slice(first, first + 8).join("\n").slice(0, 900)}` : "No changes.";
        if (p.apply && changed) await writeFile(path, after, "utf8");
        return `${name}: ${p.apply ? "applied" : "preview only"}; ${changed ? "changed" : "unchanged"}; sha256 ${hash(before)} → ${hash(after)}\n${preview}`;
      };
      return text(p.apply ? await withFileMutationQueue(path, format) : await format());
    },
  });

  pi.registerTool({
    name: "code_ast", label: "AST search/replace", description: "On-demand ast-grep structural search or single-file replace. Pattern metavariables: $NAME and $$$ARGS. Replace previews by default; apply=true is required to mutate exactly one file. Search accepts a directory. Requires a language for directory search and replacements; e.g. ts, js, python, go, rust.",
    parameters: Type.Object({ path: Type.String(), pattern: Type.String(), lang: Type.Optional(Type.String({ description: "ast-grep language, e.g. ts, js, python, go, rust" })), replacement: Type.Optional(Type.String()), apply: Type.Optional(Type.Boolean()) }),
    async execute(_id, p, signal, _update, ctx) {
      if (!existsSync(AST)) throw new Error("ast-grep binary missing; run npm install in ~/.pi/agent/extensions/agent-code-tools");
      const path = safePath(ctx.cwd, p.path, "either"), isFile = statSync(path).isFile();
      if (!p.pattern) throw new Error("Pattern required");
      if (p.apply && p.replacement === undefined) throw new Error("apply requires replacement");
      if (p.replacement !== undefined && (!isFile || !p.lang)) throw new Error("Replacement requires one file and explicit lang");
      if (!isFile && !p.lang) throw new Error("Directory search requires lang");
      const root = rootFor(ctx.cwd, path);
      const args = ["run", "--pattern", p.pattern, "--json=stream", "--color=never", ...(p.lang ? ["--lang", p.lang] : [])];
      const scan = async (input?: string) => {
        const r = await run(AST, [...args, ...(p.replacement !== undefined ? ["--rewrite", p.replacement] : []), ...(input !== undefined ? ["--stdin"] : [path])], root, input, signal, 30_000, 1024 * 1024);
        if (r.code !== 0 && r.code !== 1) throw new Error(`ast-grep exited ${r.code}: ${r.err || r.out}`);
        return r.out.trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
      };
      if (p.replacement === undefined) {
        const matches = await scan();
        return text(`${matches.length} match(es)${matches.length > 60 ? "; first 60 shown" : ""}\n${JSON.stringify(matches.slice(0, 60).map((m: any) => ({ file: m.file, line: m.range?.start?.line + 1, column: m.range?.start?.column + 1, text: m.text?.slice(0, 300) })), null, 2)}`);
      }
      const replace = async () => {
        const before = await readFile(path, "utf8");
        if (Buffer.byteLength(before) > MAX_FILE || before.includes("\0")) throw new Error("AST replace only accepts text files up to 2 MiB");
        const matches = await scan(before);
        const patches = matches.map((m: any) => ({ start: m.range?.byteOffset?.start, end: m.range?.byteOffset?.end, replacement: m.replacement }));
        if (patches.some((x: any) => !Number.isInteger(x.start) || !Number.isInteger(x.end) || x.start < 0 || x.end < x.start || typeof x.replacement !== "string")) throw new Error("ast-grep returned invalid offsets");
        patches.sort((a: any, b: any) => b.start - a.start);
        let bytes = Buffer.from(before);
        let last = bytes.length;
        for (const patch of patches) {
          if (patch.end > last) throw new Error("Overlapping AST matches; refusing unsafe replace");
          bytes = Buffer.concat([bytes.subarray(0, patch.start), Buffer.from(patch.replacement), bytes.subarray(patch.end)]);
          last = patch.start;
        }
        const after = bytes.toString("utf8");
        if (p.apply && after !== before) await writeFile(path, after, "utf8");
        return `${matches.length} match(es); ${p.apply ? "applied" : "preview only"}; sha256 ${hash(before)} → ${hash(after)}\n${JSON.stringify(matches.slice(0, 12).map((m: any) => ({ line: m.range.start.line + 1, before: m.text?.slice(0, 160), after: m.replacement?.slice(0, 160) })), null, 2)}`;
      };
      return text(p.apply ? await withFileMutationQueue(path, replace) : await replace());
    },
  });
}
