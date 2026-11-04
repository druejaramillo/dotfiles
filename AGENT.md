<!-- markdownlint-configure-file
{"MD013":{"code_blocks":false,"tables":false}}
-->

# My agent toolbox

A usage reference for the Pi-first setup: 107 skills in one recursively
discovered catalog, upstream P Stack for engineering, nine selected Matt
skills, and retained tools and specialists.

This is singular `AGENT.md`, a guide for you. Pi's global instructions live
in [`~/.pi/agent/AGENTS.md`](.pi/agent/AGENTS.md), not this file.

- [Start here](#start-here)
- [Files and ownership](#files-and-ownership)
- [Every installed skill](#every-installed-skill)
- [P Stack playbooks](#p-stack-playbooks)
- [Research-mode usage](#research-mode-usage)
- [Design-lab phases](#design-lab-phases)
- [Executable commands and tools](#executable-commands-and-tools)
- [Former entry points](#former-entry-points)
- [Reload and maintenance](#reload-and-maintenance)

## Start here

Ask normally when you know the outcome: "Fix this bug" or "Review this Go
handler." Pi can load advertised skills from their descriptions. The global
engineering guidance points to P Stack rather than the retired local copies.

For a specific method, use Pi's native syntax:

```text
/skill:<name> <request>
```

For example:

```text
/skill:poteto-mode fix the duplicate-job bug in this project
/skill:research-mode compare these two papers for our use case
/skill:grill-with-docs stress-test this billing model
/skill:design-lab design-hero-lab prototypes/home 4
/skill:slop-go ./internal
```

Grouping folders do not change command names. A skill under
`mattpocock/grill-me/` is `/skill:grill-me`, not `/mattpocock:grill-me`.
The same rule applies to every group.

A skill loads instructions and supporting files. It does not create tools,
install dependencies, authenticate services, or authorize external actions.
Executable commands such as `/plannotator-review` are a separate mechanism.
There are no personal prompt-template aliases in `~/.pi/agent/prompts/`.

### Choose an entry point

| Task | Example Pi input | Result or boundary |
| --- | --- | --- |
| Build, debug, refactor, or investigate software | `/skill:poteto-mode diagnose this slow endpoint` | P Stack selects its matching playbook. Required verification remains part of that workflow. |
| Understand code or a change | `/skill:teach explain the scheduler redesign` | A plain explanation combining how it works and why it exists. Use `how` or `why` separately for a narrower question. |
| Research a source or topic | `/skill:research-mode summarize report.pdf` | Evidence-backed reading or research. Ordinary research has no preliminary plan-approval gate. |
| Stress-test a decision | `/skill:grill-me this migration plan` | An interview. `grill-with-docs` also captures resolved domain terms and suitable decisions. |
| Review standards and spec fidelity | `/skill:code-review review since main` | Matt's Standards and Spec reviews. This is an optional complement, not a mandatory second P Stack pipeline. |
| Review code yourself in a browser | `/plannotator-review .` | Human annotation UI, distinct from model code review. |
| Design or improve an interface | `/skill:impeccable critique this settings page` | A focused UI workflow without requiring the design lab. |
| Explore visual alternatives | `/skill:design-lab design-study-matrix brief.md` | Only the selected exploration phase, not production promotion. |
| Explain something visually | `/skill:show-me diagram this request flow` | An inline sketch or a larger visual artifact when needed. |
| Use optional Shape Up planning | `/skill:frame this feature idea` | Frame the problem, then choose whether to shape it. An approved pitch can later go through `kickoff`. |

Shape Up is optional. `frame` ends at a human framing decision, `shape` at a
human build decision, and `kickoff` discovers scopes for an approved pitch.
None of them silently starts implementation or publishes tickets.

P Stack uses TDD when requested or when a bug has an obvious cheap local test.
It does not require an expensive integration-test setup for every change.

## Files and ownership

| Location | Contents and owner |
| --- | --- |
| `~/.agents/skills/pstack/` | Whole-directory link to `cursor-plugins/pstack/skills`. Full upstream P Stack, currently 58 names. |
| `~/.agents/skills/cursor/` | Three selected links into Cursor's team kit. |
| `~/.agents/skills/mattpocock/` | Nine selected links into Matt's upstream collection. |
| `~/.agents/skills/concepts/` | Two retained concept methods. |
| `~/.agents/skills/design/` | Three retained design methods. |
| `~/.agents/skills/<name>/` | 32 root entries, including your modes and retained tool/specialist skills. Some are tool-owned links. `show-me` stays here. |
| `~/.agents/references/` | Shared operating boundaries and concept-integrity guidance. |
| `~/.local/share/agent-sources/` | Persistent `cursor-plugins` and `mattpocock-skills` Git checkouts. |
| `~/.pi/agent/references/upstream-skills-pi.md` | Cursor-to-Pi mapping for tools, workers, models, paths, and unsupported features. |
| `~/.pi/agent/extensions/` and configured Pi packages | Executable tools and commands, independent of the skill catalog. |
| `~/.pi/agent/skills/` and `~/.pi/agent/prompts/` | Empty personal collections. No second personal catalog or prompt-alias layer. |

The reviewed source revisions are `ae5650febf4320793844c12c4adaa937f417f8da`
for [cursor/plugins](https://github.com/cursor/plugins) and
`4ae2317ddb22b046e26455e4f9c9b3aaaf62212d` for
[mattpocock/skills](https://github.com/mattpocock/skills).
The inventory below describes those installed versions. Fresh bootstrap clones
follow upstream default branches, so later inventories can differ.

Links preserve complete skill bundles. Relative references, scripts, and
assets resolve from the physical source skill directory. Project files such
as specs, Standards, glossaries, and code belong to the active project.

### Scope and capability limits

The [Pi mapping](.pi/agent/references/upstream-skills-pi.md) translates upstream
instructions. It does not create Cursor Automations, cloud agents, Bugbot
controls, or secret-request APIs. A required unavailable capability remains a
gap, not a simulated passing result. Full-playbook and diverse-model coverage
are not implied by installing the collection.

[Operating boundaries](.agents/references/operating-boundaries.md) govern
scope, external actions, resources, and transcript privacy. Upstream autonomy
does not override them. Commits, pushes, PRs, merges, paid experiments, and
unrelated history access need their appropriate authorization. Development
worktrees retain the canonical `.bare` repository layout.

Herdr workers require `HERDR_ENV=1`, bounded scope and resources, real
completion checks, and cleanup of only the workers owned by the task.
A worker is not automatically a different model. Model roles use detected Pi
models, optionally recorded in `~/.pi/agent/references/pstack-models.md`.
That file is not required merely to use the skills.

## Every installed skill

The tables list all 107 names. Every row uses `/skill:<name> <request>`.
The file is `<catalog>/<group>/<name>/SKILL.md`, or
`<catalog>/<name>/SKILL.md` for root entries.

- **A**: Advertised for automatic matching. Explicit invocation also works.
- **M**: Manual-entry metadata hides the skill from automatic matching.
  Use its explicit command to select it. A calling workflow can still read
  it as support. This flag is not a separate directory or a sandbox.

### pstack/ (58)

[Upstream P Stack](https://github.com/cursor/plugins/tree/main/pstack) owns
these skills. `poteto-mode` is the main engineering entry point.

#### Workflows and helpers (34)

| Skill | Entry | What it does or when to use it |
| --- | --- | --- |
| `architect` | M | Sketch types, signatures, and module boundaries before implementation, then review how the design is filled in. |
| `arena` | M | Run parallel candidates for one task, select a base, and incorporate the strongest alternatives. Requires authorized worker capacity. |
| `automate-me` | M | Capture your working preferences in a personal `-mode` skill. Transcript evidence remains scoped and private. |
| `benchmark-checklist` | M | Check whether a performance measurement is valid, repeatable, relevant, and measures the claimed work. |
| `blast-radius` | M | Investigate effects beyond the diff and run code to prove the safety assumption. |
| `bro` | M | Restate the preceding answer in plain language. |
| `correct` | M | Prevent recurring mistakes through architecture, types, lint, or tests, with checks proven against past failures. |
| `create-formal-verification-skill` | M | Create project-local verification for high-risk invariants, concurrency, parsers, or stateful logic using a suitable formal tool. |
| `create-verification-skill` | M | Create a project-local skill that drives the application as a user would and checks observable behavior. |
| `figure-it-out` | M | Design an auditable, task-specific workflow for ambitious work that has no narrower playbook. |
| `how` | M | Explain architecture, runtime flow, placement, and ownership from implementation evidence. |
| `in-your-own-words` | M | Restate the user's goal and the problem the assistant thinks it is solving. |
| `interrogate` | M | Run adversarial reviews of code or a design. Findings survive only when demonstrated by a run. Required model diversity must be real. |
| `ketchup` | M | Summarize progress since your last message and list decisions waiting on you. |
| `ketchup-video` | M | Produce a subtitled slide-video catch-up with pending decisions supplied as text. Requires suitable rendering tools. |
| `maintain-formal-verification-skill` | M | Update formal models, properties, and checks after code changes, distinguishing model drift from implementation bugs. |
| `maintain-verification-skill` | M | Audit project verification against source and live behavior, then propose proven corrections. Publishing still needs authorization. |
| `make-bot-ui` | M | Build a webhook-driven Grok Bot UI exposed through Tailscale. Requires Cursor automation and secret APIs that this Pi setup does not supply. |
| `no-comments` | M | Delegate a Comment Sicko review, fix accepted comment findings, and offer executable encodings of claimed constraints. |
| `poteto-help` | M | Explain P Stack setup and help select a skill, playbook, or principle. |
| `poteto-mode` | M | Own the engineering task, select a playbook, delegate bounded work, and verify the actual result. |
| `recall` | M | Reconstruct earlier working context from scoped history, current state, and project records. Uses Pi transcript mappings. |
| `reflect` | M | Review the active transcript through three workers and route useful lessons into existing skills. Requires authorized workers and edit scope. |
| `setup-pstack` | A | Configure available models and reasoning budgets by role. In Pi, agreed choices use the optional Pi model-role reference, not a Cursor rule. |
| `sharpen` | M | Improve the depth and precision of a task prompt without expanding its scope. |
| `show-me-your-work` | M | Keep a TSV decision trail for long or unattended work. Creating the trail does not authorize committing or publishing it. |
| `statechart` | M | Check a TLA+ state model and draw a Mermaid statechart with paths to rule-breaking states. Requires the verification tooling. |
| `swarm` | M | Assign parallel workers distinct coverage or attempts, join them, and return one report. |
| `tdd` | M | Use a failing test and vertical behavior slices when requested or when the local regression target is obvious and cheap. |
| `teach` | M | Combine `how` and `why` into a clear explanation of a subsystem or body of work. This is P Stack's explanation skill, not Matt's former tutoring workspace. |
| `technical-writing` | M | Write or review technical documentation with explicit structure, concrete language, and readable instructions. |
| `typescript-best-practices` | M | Apply P Stack's TypeScript rules while reading or changing `.ts` and `.tsx` code. |
| `unslop` | M | Edit prose to remove formulaic AI language while preserving its meaning. |
| `why` | M | Investigate rationale and trade-offs through available history, issues, docs, and operational evidence. Missing integrations remain evidence gaps. |

#### Principles (24)

These are directly callable skills, usually read as support by P Stack.
For example, `/skill:principle-explain-the-number check this speedup claim`.

| Skill | Entry | What it does or when to use it |
| --- | --- | --- |
| `principle-attack-the-premise` | M | Test a shared assumption when repeated fixes based on it fail the same check. |
| `principle-boundary-discipline` | M | Validate external inputs at boundaries and keep internal business logic simple. |
| `principle-build-the-lever` | M | Build a reusable script, generator, or check for non-trivial repeated work. |
| `principle-encode-lessons-in-structure` | M | Turn recurring corrections into checks or structure rather than more instructions. |
| `principle-exhaust-the-design-space` | M | Compare competing prototypes before committing to a novel design. |
| `principle-experience-first` | M | Prefer a polished user experience over implementation convenience or extra rough features. |
| `principle-explain-the-number` | M | Identify what limits a measurement and rule out misleading explanations before trusting it. |
| `principle-fix-root-causes` | M | Trace a symptom to the first incorrect state and fix the cause there. |
| `principle-foundational-thinking` | M | Choose core data structures, types, and shared-state boundaries before detailed logic. |
| `principle-guard-the-context-window` | M | Keep bulk output out of the main conversation and retain useful summaries. |
| `principle-laziness-protocol` | M | Prefer deletion and the smallest effective change over unnecessary abstraction. |
| `principle-make-operations-idempotent` | M | Make repeated operations converge after retries, interruptions, or partial runs. |
| `principle-migrate-callers-then-delete-legacy-apis` | M | Move callers to the new internal API and remove the old API in the same change sequence. |
| `principle-minimize-reader-load` | M | Reduce indirection, mutable scope, and hidden state that make code hard to follow. |
| `principle-model-the-domain` | M | Model state and domain rules explicitly instead of repeating structural assumptions. |
| `principle-never-block-on-the-human` | M | Continue authorized reversible work without unnecessary questions. Actual approval and resource boundaries still apply. |
| `principle-outcome-oriented-execution` | M | Move toward the agreed target design without building disposable compatibility stages. |
| `principle-prove-it-works` | M | Verify the real artifact or behavior before declaring completion. |
| `principle-redesign-from-first-principles` | M | Reconsider the design when a new requirement changes its assumptions. |
| `principle-separate-before-serializing-shared-state` | M | Remove unnecessary shared writes before adding synchronization. |
| `principle-sequence-verifiable-units` | M | Split multi-step work into independently checkable units and verify each before proceeding. |
| `principle-subtract-before-you-add` | M | Remove dead code and redundant structure before extending the remaining design. |
| `principle-test-behavior-not-implementation` | M | Assert observable behavior so tests survive internal refactoring. |
| `principle-type-system-discipline` | M | Encode valid states, semantic distinctions, and exhaustive cases in types. |

### cursor/ (3)

These come from the
[Cursor team kit](https://github.com/cursor/plugins/tree/main/cursor-team-kit).
Control workflows use actual available Pi, Herdr, browser, or local driver
capabilities rather than invented Cursor APIs.

| Skill | Entry | What it does or when to use it |
| --- | --- | --- |
| `control-cli` | A | Build or adapt a local driver to inspect, exercise, and profile a CLI or TUI. Useful for hangs, startup, memory, and interaction checks. |
| `control-ui` | A | Build or adapt a browser/CDP driver for web, IDE, or Electron interaction, accessibility, screenshots, and profiling. |
| `deslop` | A | Remove unnecessary AI-generated code patterns and align the diff with existing code style. `unslop` is the prose counterpart. |

### mattpocock/ (9)

Only these nine [Matt skills](https://github.com/mattpocock/skills) are selected.
There is no Matt tracker/coordinator, setup, implementation, or tutoring bundle.

| Skill | Entry | What it does or when to use it |
| --- | --- | --- |
| `code-review` | A | Review changes since a fixed ref separately for documented Standards and originating Spec fidelity. Uses parallel reviewers when available. |
| `domain-modeling` | A | Sharpen domain terms in `GLOSSARY.md`, honor `GLOSSARY-MAP.md` for multiple contexts, and offer ADRs for consequential trade-offs. The glossary is not an implementation spec. |
| `grill-me` | M | Run an interview to sharpen a plan without the document-writing variant. |
| `grill-with-docs` | M | Interview while recording resolved domain vocabulary and suitable architectural decisions through `domain-modeling`. |
| `grilling` | A | Stress-test a plan through decision questions and recommendations, investigating factual questions itself. |
| `writing-beats` | M | Turn raw material into an article through a branching sequence of beats you select. |
| `writing-for-agents` | A | Improve skills and agent-facing documents through clear triggers, steps, references, and completion criteria. |
| `writing-fragments` | M | Interview for raw article ideas and append fragments to a chosen Markdown capture file without imposing an outline. |
| `writing-shape` | M | Shape raw material into an article paragraph by paragraph with you, keeping the source separate from the output. |

Writing examples:

```text
/skill:writing-fragments ~/ideas.md
/skill:writing-shape ~/ideas.md into ~/article.md
/skill:writing-beats ~/ideas.md into ~/article.md
```

### concepts/ (2)

| Skill | Entry | What it does or when to use it |
| --- | --- | --- |
| `concept-audit` | A | Read-only audit of existing concepts, behavioral boundaries, coupling, and implementation evidence. |
| `concept-design` | A | Design or review independent software concepts through purpose, state, actions, operational principles, and named synchronizations. |

The shared [concept-integrity rules](.agents/references/concept-integrity.md)
apply when implementing or refactoring approved concept specs or pitches that
name concepts or synchronizations.

### design/ (3)

| Skill | Entry | What it does or when to use it |
| --- | --- | --- |
| `design-inspo` | A | Search the local Field Notes catalog by tags for visual direction. Requires `inspo`; references inform design rather than supply brands to copy. |
| `design-lab` | M | Run one named exploration or promotion phase. See the phase reference below. |
| `impeccable` | A | Design, implement, audit, or refine frontend interfaces, including typography, layout, accessibility, motion, responsive behavior, and edge cases. |

### Root entries (32)

These live directly under `~/.agents/skills/`.

| Skill | Entry | What it does or when to use it |
| --- | --- | --- |
| `basecamp` | A | Read or change Basecamp projects, todos, cards, messages, files, schedules, and other resources through the authenticated CLI. Posting retains its external-action boundary. |
| `diagnose-crash` | A | Diagnose a machine-local crash from systemd core dumps and symbolized backtraces. Not the general application bug-fix workflow. |
| `frame` | A | Establish a feature's customer problem, current baseline, outcome, and whether it deserves shaping. Stops at the framing decision. |
| `go` | A | Apply idiomatic Go package design, errors, interfaces, concurrency, testing, and project conventions. |
| `go-spec-reviewer` | A | Review a Go design spec before implementation, including context, errors, composition, and applicable CLI conventions. |
| `herdr` | A | Manage panes, servers, background processes, and real agent workers inside Herdr. Requires `HERDR_ENV=1`. |
| `hey` | A | Read or change HEY email, contacts, boxes, calendars, todos, and related resources through its authenticated CLI. Sending needs its appropriate authorization. |
| `htmx` | A | Build HTML-over-the-wire interactions, fragment endpoints, validation, and other `hx-*` patterns. |
| `jevlint` | A | Configure or run plain-language repository rules and interpret findings. Requires the CLI and applicable project setup. |
| `kickoff` | M | Run DUMP/AFFINITIZE scope discovery for an approved Shape Up pitch. Does not assign tasks, publish tickets, or begin coding. |
| `obsidian-cleanup` | A | Reformat named notes into citation-preserving nested study outlines. The requested paths bound the work. |
| `omarchy` | A | Customize the Linux desktop, Hyprland, terminal settings, and other end-user Omarchy configuration. |
| `plannotator` | A | General Plannotator reference for plans, annotations, guided reviews, archives, sharing, and Inbox operations. |
| `plannotator-annotate` | A | Open files, URLs, folders, or supported live apps for annotation, then handle the returned feedback. |
| `plannotator-compound` | A | Analyze archived plan decisions and denial feedback, then produce an HTML report of patterns and improvements. |
| `plannotator-inbox` | M | Open or start the Inbox, report its address, and load its session usage guidance. |
| `plannotator-last` | A | Open the latest assistant message for annotation, then revise or continue from the feedback. |
| `plannotator-review` | A | Open a browser code review for the current worktree, another directory, or a PR, then act on feedback. |
| `plannotator-setup-goal` | A | Build a reviewed fact sheet and execution plan for a `/goal` workflow. Keeping this skill does not install a `/goal` runtime command. |
| `plannotator-visual-explainer` | A | Produce Plannotator-themed HTML plans, PR explainers, diagrams, tables, or other visual explanations. Retained alongside `show-me`. |
| `research-mode` | M | Research, compare, audit, review, draft, or plan reproductions through shared evidence rules and internal playbooks. |
| `sentry-cli` | A | Investigate Sentry issues, events, projects, and API data through authenticated CLI access. Event payloads may be sensitive. |
| `sentry-go` | A | Instrument or review Go Sentry errors, transactions, spans, propagation, sampling, and data protection. |
| `shape` | A | Shape a framed feature into a bounded pitch with appetite, rough solution, rabbit holes, and no-gos. Stops at the human build decision. |
| `show-me` | A | Explain the current topic visually, preferring a small inline sketch before a larger HTML artifact. |
| `skill-creator` | A | Create or improve compliant skills, their descriptions, references, scripts, and packaging. |
| `slop-go` | A | Read-only Go code-health audit of verbosity, structural erosion, maintainability, and Halstead metrics. Metrics identify suspects, not automatic quality failures. |
| `tailwind` | A | Apply Tailwind CSS v4 configuration, theme, utility, responsive, and build-performance practices. |
| `templ` | A | Build and troubleshoot Go templ components, generation, HTTP integration, and safe attributes. Edit `.templ`, not generated `_templ.go`. |
| `terminal-browser` | A | Open a real browser beside the conversation and inspect or interact with its tabs through the CLI. Requires its own installation. |
| `worktrees` | A | Create, reuse, list, repair, or remove Git worktrees in the canonical `.bare` repository layout. |
| `write-discoverable-code` | A | Keep names, files, errors, and documentation findable through plain-text search. Applies when writing or renaming code. |

## P Stack playbooks

The 23 playbooks are files inside `pstack/poteto-mode/playbooks/`, not skills
or slash commands. Select them through a request to `poteto-mode`:

```text
/skill:poteto-mode use the bug-fix playbook for this regression
/skill:poteto-mode use multi-phase-plan; deliver a plan, do not implement
/skill:poteto-mode prototype two approaches to this state model
```

| Playbook file | Purpose |
| --- | --- |
| `authoring-a-skill.md` | Author or revise a skill. Pi maps Cursor's creation helper to `skill-creator` and `writing-for-agents`. |
| `autonomous-run.md` | Drive one authorized task to a checkable exit condition. Cursor's loop facility is not supplied by this catalog. |
| `autopilot-full.md` | Coordinate a build-to-merge program with separate implementation owners and verification. Needs explicit publishing/merge authority and the required capabilities. |
| `autopilot-stack.md` | Coordinate work through verified PRs and stop before merging. Publishing PRs still needs authority. |
| `babysit.md` | Monitor and clear a PR's readiness issues, stopping before the separate shipping decision. |
| `bug-fix.md` | Reproduce, investigate, fix, and verify a demonstrated bug. |
| `eval.md` | Design and run a blinded evaluation with controlled evidence. Experiment authorization and resource limits apply. |
| `feature.md` | Ground, design, implement, and verify new behavior. |
| `hillclimb.md` | Improve one measured objective through bounded change/measurement iterations. This owns optimization; there is no second autoresearch loop. |
| `investigation.md` | Deliver a read-only, cited explanation or recommendation. |
| `multi-phase-plan.md` | Deliver a verifiable plan for larger work, not its implementation. |
| `opening-a-pr.md` | Prepare the authorized branch, commits, PR, and review information. It does not itself grant permission to publish. |
| `orchestrate.md` | Coordinate a standing multi-day program and check delegated outputs. Requires an actual available runner and agreed scope. |
| `pause-safely.md` | Stop at a safe boundary and leave a resumable checkpoint without incidental irreversible actions. |
| `perf-issue.md` | Capture a baseline, diagnose a performance problem, and verify any change through valid measurements. |
| `prototype.md` | Build throwaway alternatives to answer a design question before the real feature build. |
| `refactoring.md` | Change structure while preserving a pinned behavior contract. |
| `runtime-forensics.md` | Diagnose a live process through instrumentation. The deliverable is the diagnosis, not a fix. |
| `session-pickup.md` | Resume from the prior scoped record instead of repeating completed investigation. |
| `shipping.md` | Verify and land only the authorized, verified PR revisions. |
| `trace-forensics.md` | Diagnose an existing captured trace rather than collecting a new one. |
| `visual-parity.md` | Establish a baseline and prove visual equivalence through image differences. |
| `worktree-cleanup.md` | Audit worktree and simulator storage, then clean only safe, authorized targets under the retained worktree rules. |

The upstream `poteto-agent` and `comment-sicko` definitions remain in the
source checkout. Markdown definitions do not register Pi agent types.
The Pi mapping and Herdr skill describe how an actual worker gets its role.

## Research-mode usage

`research-mode` owns one research task and its follow-ups. Its eight internal
playbooks share evidence and execution rules. These files are not commands.

| Request | Internal playbook | Example Pi input |
| --- | --- | --- |
| Investigate a question | `investigate.md` | `/skill:research-mode investigate why these methods disagree` |
| Review a field, author, or corpus | `literature-review.md` | `/skill:research-mode review literature on this retrieval method` |
| Compare claims or options | `compare.md` | `/skill:research-mode compare A and B on these criteria` |
| Check claims against code or data | `audit.md` | `/skill:research-mode audit paper.pdf against this repository` |
| Critique research or a draft | `review.md` | `/skill:research-mode review report.md for unsupported claims` |
| Develop a practical method | `training-recipe.md` | `/skill:research-mode propose a training recipe for this dataset` |
| Draft from established evidence | `draft.md` | `/skill:research-mode draft a report from these findings` |
| Plan or reproduce a result | `replicate.md` | `/skill:research-mode plan a replication; do not execute it` |

A source summary or explanation uses the shared evidence rules and relevant
reading references without needing another wrapper. Supporting references
cover scholarly sources, PDF pages/figures/tables, and Docker when chosen.

Ordinary search, reading, and drafting need no dedicated plan approval.
Substantive research uses one canonical artifact with source provenance,
uncertainty, and access limits. Quick answers can stay in chat.

A recipe or replication plan does not authorize execution. Experiment runs
need an approved environment, allowed work, resource budget, and run limits.
An optimization request routes to P Stack's hillclimb with a fixed benchmark,
metric, allowed files, data/seeds, and approved iteration cap. A former
20-iteration suggestion is not standing authorization. Stop requests preserve
logs at a safe boundary; deleting experiment state needs confirmation.

Earlier-work recall uses P Stack's `recall` with Pi transcript mappings.
Research-mode adds no scheduler, worker pool, or competing experiment log.

## Design-lab phases

The syntax is `/skill:design-lab <phase-name> <target> [count]`.
The six installed phases stop at their own boundaries. Production promotion
is a separate explicit choice. These phases replace the former `/design-*`
prompt aliases.

| Phase name | What it produces or changes |
| --- | --- |
| `design-catalog` | Catalog-backed visual families. Discovery only, without file edits. |
| `design-study-matrix` | Different responsive studies across visual families. Leaves production unchanged. |
| `design-family-variants` | Substantially different variants of one selected family/study. Preserves the source. |
| `design-hero-lab` | Separate hero alternatives with a picker, preserving the full-page draft. |
| `design-promote-hero` | Integrate a selected hero into the full-page draft, not the production home route. |
| `design-build-home` | Promote the accepted design to the production home route with build and visual checks. |

For example:

```text
/skill:design-lab design-catalog brief.md
/skill:design-lab design-family-variants prototypes/editorial 3
/skill:design-lab design-build-home prototypes/accepted
```

Inspiration needs the local `inspo` catalog. Implementation needs the app and
appropriate build, browser, and screenshot checks. Independent studies can
use bounded Herdr workers when available; otherwise they run sequentially
with that limitation reported.

## Executable commands and tools

These are not prompt aliases. They come from executable extensions or
packages and remain separate from `/skill:name`. Type `/` in Pi to inspect
what the current profile actually loaded. Package versions and feature
settings can change the menu.

### Pi built-ins

| Command | Purpose |
| --- | --- |
| `/reload` | Reload discovered skills, templates, extensions, context, and other resources. |
| `/model`, `/thinking` | Choose an available model and its supported reasoning level. |
| `/login`, `/logout` | Manage provider authentication. |
| `/settings`, `/hotkeys` | Inspect settings and active keyboard shortcuts. |
| `/new`, `/resume`, `/session`, `/name` | Start, find, inspect, or name sessions. |
| `/tree`, `/fork`, `/clone`, `/compact` | Navigate or branch a session and manage its context. |
| `/copy`, `/export` | Copy the last response or export the session locally. |
| `/share` | Upload a session. Review its contents first; raw transcripts can include private data. |

### Installed extension/package command families

| Command | Purpose and usage |
| --- | --- |
| `/plannotator-plan-mode` | Toggle the Plannotator planning workflow. |
| `/plannotator-review [target]` | Open a human code review, for example `/plannotator-review .` or a PR URL. |
| `/plannotator-annotate <target>` | Annotate a file, URL, folder, or supported live app, for example `/plannotator-annotate README.md`. |
| `/plannotator-last` | Annotate the last assistant message. |
| `/plannotator-inbox` | Open the Inbox for asynchronous questions, decisions, and attached artifacts. |
| `/plannotator-open` | Open the active Plannotator review through the local Herdr integration. |
| `/auto-perms` | Inspect or control tool-permission behavior. A reviewer-directed one-shot approval is a user action, not an agent workaround for a block. |
| `/cloak-status` | Inspect the secret-cloaking integration's status. |
| `/image-gen`, `/video-gen` | Show selected media-model and credential readiness. These commands inspect status; generation is requested in conversation through the media tools. |
| `/openai-image <prompt>` | Generate through the standalone Codex Images integration using configured subscription authentication. |
| `/openai-websearch <query>` | Search through the Codex-backed live web integration. |
| `/openai-settings` | Open Better OpenAI configuration. |
| `/openai-tier` | Inspect or select a supported service tier. Tier changes can affect cost or quota. |
| `/openai-usage`, `/openai-resets` | Inspect subscription usage or manage supported banked resets. |
| `/openai-decisions` | Configure the opt-in native decision integration. |
| `/live` | Start or stop the configured realtime voice mode. |
| `/pets` | Inspect or configure Better OpenAI footer pets. |
| `/websearch` | Open the web-search curator. |
| `/curator` | Toggle or configure its review workflow. |
| `/search` | Browse stored web-search results. |
| `/google-account` | Inspect the active Gemini Web account. |

Some Plannotator names have both forms. `/plannotator-review` runs the
executable UI command; `/skill:plannotator-review` loads the skill's procedure
for launching it and handling feedback. Neither is Matt's `code-review`.
The skills cleanup did not remove these executable integrations.

Web fetching, knowledge indexing/search, screenshots, media generation, and
code diagnostics also exist as agent tools. Their tool names are not slash
commands. Ask for the operation in conversation. For example, "Index these
docs" uses knowledge tooling rather than a removed prompt alias. Tool access
and paid usage remain subject to the configured capability and permission
boundaries.

## Former entry points

These are migration notes, not additional active commands.

| Former entry point or owner | Current route |
| --- | --- |
| `/frame`, `/shape`, `/kickoff`, `/slop-go` prompt aliases | `/skill:frame`, `/skill:shape`, `/skill:kickoff`, `/skill:slop-go`. |
| `/summarize`, `/lit`, `/compare`, `/deepresearch`, `/audit`, `/review`, `/draft`, `/recipe`, `/replicate` | `/skill:research-mode` with the requested operation in words. |
| `/autoresearch` or local `autoresearch` | `/skill:poteto-mode` with the hillclimb request and explicitly approved experiment bounds. |
| `/design-*` prompt aliases | `/skill:design-lab <phase-name> <target>`. |
| Local `bdfl-mode` | Upstream `/skill:poteto-mode`. |
| Local `diagnosing-bugs`, `prototype`, `handoff`, `pr`, `retro` | Matching P Stack playbooks or helpers, such as bug-fix, prototype, pause-safely, opening-a-pr, and reflect. Not new bare commands. |
| Local `humanizer` | P Stack `/skill:unslop`. |
| Local TDD and verification copies | P Stack skills under the existing declared names. |
| `feature-framing`, `feature-shaping` | Renamed to `frame` and `shape`. |
| Former research support skills | Consolidated research-mode playbooks/references and the Pi compatibility guide. |
| Matt's former `teach` | Removed. The active `/skill:teach` is P Stack's explanation method. |

The tracker trio `to-tickets`, `triage`, and `wayfinder` is removed.
So are the dedicated marketing/SEO and slide skills: `copywriting`, `cro`,
`marketing-psychology`, `product-marketing-context`, `seo`, `site-architecture`,
`pptx`, and `revealjs`. The `caldir` skill is removed even though the CLI can
still be installed by the personal machine bootstrap. Removing a skill does
not uninstall its application or delete service data.

## Reload and maintenance

After changes, `/reload` or a new Pi session refreshes discovery.
The startup diagnostics and `/skill:` completion show the loaded catalog.
Duplicate declared names are a problem even if they live in different groups.

The source/link bootstrap is:

```bash
bash "$HOME/dev-setup.sh" --agent-skills-only
```

It recreates upstream groups, reuses existing source refs, and refuses
conflicts. It does not restore owned files, update existing checkouts, or
install missing tool-owned skills. Full restore behavior and safety limits
are in [README.md](README.md#agent-skill-restoration).

The installed skill files and their count can be listed with:

```bash
find -L "$HOME/.agents/skills" -type f -name SKILL.md | sort
find -L "$HOME/.agents/skills" -type f -name SKILL.md | wc -l
```

The reviewed catalog count is 107: 58 P Stack, three Cursor, nine Matt,
two concept, three design, and 32 root skills. File counts alone do not prove
Pi loaded them. In particular, a catalog `.gitignore` can hide linked skills.
Generated-link exclusions belong in `~/.dotfiles/info/exclude`.

Source updates require an explicit Git review/update, then name, reference,
and runtime-discovery checks. This guide is a reference snapshot. The current
`SKILL.md`, its supporting files, installed command handlers, and actual
runtime capabilities determine behavior.
