<!-- markdownlint-configure-file {"MD013":{"tables":false}} -->

# P Stack and Matt skills in Pi

Read once when using an upstream workflow. Translate Cursor references with
this guide, then follow the selected upstream skill. Omit unsupported fields
and state the effect. Never pass arguments the installed tool rejects.

The upstream [Claude Code guide](https://github.com/cursor/plugins/blob/main/pstack/docs/harness/claude-code.md)
is the pattern for this translation, not a Pi API.

- `<pstack>` is `~/.local/share/agent-sources/cursor-plugins/pstack`.
- `<matt>` is `~/.local/share/agent-sources/mattpocock-skills`.
- The active catalog is `~/.agents/skills/`. pstack, cursor, mattpocock,
  concepts and design are grouping folders, not extra skills.
- The engineering router is `<pstack>/skills/poteto-mode/SKILL.md`.
  The calling chat owns its selected playbook and delegates.
- Apply `~/.agents/references/operating-boundaries.md` to scope, authorization,
  resources and privacy. It overrides broader upstream autonomy defaults.

## Tools

| Cursor reference | Pi translation |
| --- | --- |
| Run a skill, /name, or Skill call | Read the discovered SKILL.md and follow it. For human invocation use /skill:name. A grouping folder is not a command prefix. |
| P Stack skill name | Read `<pstack>/skills/<name>/SKILL.md`, including manual-only leaves. |
| Matt skill name | Find the selected link under ~/.agents/skills/mattpocock/ and resolve its physical directory before following relative pointers. |
| Task | Actual Herdr agent dispatch below. A Markdown agent definition does not register a Pi agent type. |
| AskQuestion or AskUserQuestion | Use Plannotator Inbox for workflow decisions, or chat where appropriate. Existing permission-block handling stays authoritative. |
| Open/update a todo list | Use an offered todo tool or a concise working checklist/report. Do not invent TodoWrite. |
| Grep, Glob | Available search/navigation tools or bash with rg/find. Read file contents with read. |
| Cursor create-skill built-in | Read ~/.agents/skills/skill-creator/SKILL.md and the selected Matt writing-for-agents skill. |
| CLI/UI control | Read the selected cursor/control-cli or control-ui skill, then use actual available Herdr/terminal-browser/web_screenshot capabilities. Unavailable driver operations remain gaps. |

Manual-only hides automatic discovery, not file access. Do not fork an upstream
skill merely to replace a Skill tool call with an explicit file read. Resolve
bundled references/scripts/assets from the physical skill directory. Resolve
project files such as Standards, specs, CONTEXT.md and code from the task's
workspace, as the upstream workflow specifies.

## Herdr dispatch

Read `~/.agents/skills/herdr/SKILL.md` first. It owns exact CLI syntax and
lifecycle checks. Require HERDR_ENV=1; from outside Herdr, do not inspect or
control its focused session.

1. Establish worker scope/count, resource limits, deadline and output ownership.
   Inspect the current pane and available CLI kinds. Preserve the caller's cwd.
2. Create a sibling pane with a suitable direction and --no-focus unless the
   user requested another topology. Do not create a workspace/worktree
   incidentally.
3. Start a fresh named actual agent with `herdr agent start`, normally
   --kind pi unless another available kind was requested. Native agent flags
   go after --. Wait for successful ready state before prompting. Verify the
   effective process arguments, model, tools and session path; an echoed
   requested argv is not proof that a shell launcher forwarded its arguments.
   Use an existing installed executable when a probe must avoid CLI updates.
4. Submit with `herdr agent prompt`. A background Task maps to submission
   without --wait and a later explicit join; do useful parent work meanwhile.
   Use --wait for a deliberate immediate join, with a bounded timeout.
5. Inspect get/read/wait results. Submission only acknowledges delivery.
   Completion needs the result and its check. On timeout or blockage, inspect
   before retrying; do not blindly resubmit or answer approval dialogs.
6. Check delegated edits/evidence yourself. Close only a finished pane/process
   this task created; never stop the Herdr server or unrelated work.

For a poteto-agent role, include the upstream agent-definition path and the
absolute poteto-mode SKILL.md path in the brief. The delegate reads both.
For another role, use that role's source brief/instructions rather than
pretending subagent_type is an accepted Herdr argument.

## Subagent fields

| Cursor field | Pi/Herdr translation |
| --- | --- |
| subagent_type: poteto-agent | Actual agent process with `<pstack>/agents/poteto-agent.md` and the absolute poteto-mode path in its brief. |
| Another subagent_type | Preserve the requested role/purpose in the brief and use a genuinely available runner. Report an unavailable required specialist. |
| readonly: true | Explicit no-edit scope, suitable native read-only tool selection when available, and before/after state checks. A brief is not a sandbox. |
| readonly: false | Keep the normal authorized tools/integrations; still honor the task's write scope. |
| run_in_background: true | Submit without waiting; retain the returned identity and join through the actual runner later. |
| environment: local | Same cwd by default. |
| environment: cloud | No Cursor cloud agent. Use a separately authorized local worktree only when it satisfies the task; read worktrees first. Otherwise report the missing capability. |
| cloud_base_branch | Put the required branch/commit in the brief and verify it before work. |
| resume | Prefer a fresh worker with consolidated scope and the prior result; reuse live state only under upstream's stated exception. |
| file_attachments | Necessary explicit local paths in the brief, not copied parent transcripts or credentials. |

One fresh worker is independent execution, not automatically a different model.
Do not claim a diverse-model panel when all workers used one model. A required
unavailable independent or cross-model gate remains a gap unless its upstream
fallback actually permits a substitute.

## Models and setup-pstack

Use real model/provider/effort controls from the installed Pi CLI or session API.
Check available models before selecting a real ID. Pi supports --provider,
--model and --thinking; other kinds have their own interfaces. Do not pass a
Cursor slug or -fast suffix as an unsupported native field.

For inherit-parent/auto, use the observable parent model/provider/effort and
pass supported exact choices explicitly when spawning a fresh process.
PI_MODEL, PI_PROVIDER and PI_REASONING_LEVEL may supply that context. A new Pi
process otherwise uses its configured default, which need not match the parent.
If true inheritance cannot be established, say which configured default was
used instead; do not claim inheritance.

A requested unavailable family/effort follows the upstream fallback, with its
limit reported. Do not guess access, silently purchase usage or repeatedly
retry rejected IDs. Multi-model gates must retain their stated diversity.

Map the Cursor pstack-models.mdc rule to the optional
`~/.pi/agent/references/pstack-models.md`. Read it explicitly when it exists;
Pi does not auto-load arbitrary rule files or .mdc files. No role file is needed
merely to use the collection.

When the user invokes setup-pstack, follow its role/budget/confirmation steps
using actually detected Pi choices and Inbox decisions. Write the agreed role
lines as plain Markdown to the Pi path, not Cursor frontmatter or AGENTS.md.
Keep the upstream role labels; an alias needs a real parent/default mapping.
Missing configuration is not permission to configure models during every task.

## Paths, transcripts and configuration

| Cursor reference | Pi location/behavior |
| --- | --- |
| User skills | ~/.agents/skills/, recursively discovered. Selected sources are in pstack/, cursor/ and mattpocock/. |
| Project .cursor/skills | Project .agents/skills/ (or an existing Pi project-skill location). Keep one authoritative copy. |
| Always-applied Cursor rules | Appropriate Pi AGENTS.md pointers or existing settings. Pi does not read .mdc rules. |
| Upstream relative files/assets | Resolve from the physical source skill directory, not project cwd or a lexical symlink alias. |
| P Stack GitHub documentation URL | Read `<pstack>/<path>` locally when present. Use the public URL for user-facing links. |
| Cursor transcript slug/path | Use Pi's actual session path/storage configuration, not Cursor's slug algorithm. |

For recall/session pickup, prefer project artifacts, then PI_SESSION_FILE or
the Pi session interface/configured storage. Default history is beneath
~/.pi/agent/sessions/; sessionDir or environment/CLI overrides can change it.
Verify the workspace from session metadata before reading its messages.
Restrict history to the requested project/topic/window, exclude current/helper
noise as appropriate, order by actual modification time, and sanitize findings.
Do not upload raw transcripts or assume another harness's session directory.

Pi honors .gitignore inside a skill catalog. Do not put generated-link ignore
rules there: they hide upstream skills from normal discovery. The bootstrap
keeps those exclusions in the bare dotfiles repository's info/exclude instead.

Source/asset homes come from the current installation, not hard-coded temporary
audit paths. Existing project Standards/spec configuration remains project
owned. Missing required configuration is reported; it does not authorize
installing an excluded Matt setup/tracker pipeline.

## Cursor-only capabilities

Cursor Automations, its webhook/state/secret-request APIs, Bugbot launch
controls and cloud dashboards are not created by installing these files.
Report an optional unsupported step and its downstream effects, then continue
the available work. If a required result or proof cannot exist without it,
mark that branch blocked rather than invent a URL, key, worker or passing gate.

Existing GitHub review comments can be read with the actual forge CLI. PR
creation/replies, publishing, shipping and merges still require their proper
authorization; generating the text is not that authorization. A human review
UI remains Plannotator, not a substitute for model review or runtime proof.
