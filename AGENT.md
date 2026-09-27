# My agent toolbox

A plain-language map of the **45 local skills** in [`~/.agents/skills/`](.agents/skills/) and **23 Pi commands** in [`~/.pi/agent/prompts/`](.pi/agent/prompts/). This is a *usage guide*, not an instruction file for agents. It deliberately leaves out `~/.pi/agent/skills/` as a user-facing skill catalog and the two symlinked system skills in `.agents/skills/`.

## Start here

- **Just ask normally** when you know the outcome but not the tool: “Debug this error,” “Help me plan this site,” or “Make these slides.” Pi can load an applicable skill from its description.
- **Force a skill** with `/skill:<name> <request>` when you want a particular method: `/skill:diagnosing-bugs find why this endpoint is slow`. A skill supplies instructions, references, and sometimes scripts. Some skills are *manual-only*, so you must invoke them explicitly (marked **manual** below).
- **Run a command** with `/<filename-without-.md> <arguments>` when you want its particular workflow: `/lit graph neural networks` or `/frame this idea`. These are prompt templates, not shell commands. They may load *supporting* instructions from `~/.pi/agent/skills/` internally; you do **not** have to invoke those separately.
- **Choose one entry point, not both**: `/slop-go .` and `/skill:slop-go .` lead to the same read-only audit. Likewise, `/design-*` commands already arrange their own design skills.
- **After editing or adding a skill or command in an active Pi session**, run `/reload`. Requirements below describe what a workflow uses; an installed CLI may still need authentication, project setup, or user approval.

```text
I want to do something
       |
       +-- I know the outcome, not the workflow --> ask in plain English
       |                                         \--> Pi loads a matching skill if needed
       |
       +-- I want a named method ---------------> /skill:<name> <request>
       |                                         \--> SKILL.md --> references / scripts / tools
       |
       +-- I want a repeatable workflow --------> /<command> <arguments>
                                                 \--> prompt --> support instructions
                                                             --> skills / tools --> result

Examples of paths through the toolbox (not mandatory pipelines):
  feature idea:    /frame -> human go/no-go -> /shape -> human build decision -> /kickoff
  design idea:     /design-catalog -> /design-study-matrix -> pick a study
                                                    -> /design-family-variants OR /design-hero-lab
  research:        /summarize (one source) -> /lit or /compare -> /deepresearch (approved plan)
  marketing site:  product-marketing-context -> site-architecture -> copywriting + impeccable
                                                   -> cro / seo (measure and audit)
  hard bug:        diagnosing-bugs (repro first) -> tdd if test-first requested -> code-review
  long-form text:  writing-fragments -> writing-shape OR writing-beats -> humanizer (if wanted)
```

**The gates matter.** `/frame` stops at a human Frame Go; `/shape` asks for the human build decision; `/kickoff` assumes an approved pitch but does not start coding. `/deepresearch` needs plan approval, `/replicate` needs an execution-environment choice before running anything, and `/autoresearch` needs explicit approval of its bounded loop. The design commands stop at their named phase; exploratory work does not silently become production UI.

## Commands: `/name ...`

Each linked filename is the actual command definition. The **relies on / boundary** column tells you what it loads or needs, not another command you must type.

### Research and writing

| Command | Use it like this / what you get | Relies on / boundary |
| --- | --- | --- |
| [`/summarize`](.pi/agent/prompts/summarize.md) | `/summarize paper.pdf` — read **one** source and save a substantive `outputs/<slug>-summary.md` with gaps. | Source itself; PDF-reading support for PDFs and research evidence rules. A one-source summary is not independent verification. |
| [`/lit`](.pi/agent/prompts/lit.md) | `/lit retrieval-augmented generation` — review a topic, lab, researcher, or publication corpus with sources. | Literature-review support and scholarly/web sources; normally no plan-approval stop. |
| [`/compare`](.pi/agent/prompts/compare.md) | `/compare approach A vs B for my use case` — compare claims, methods, products, or rules on common criteria. | Source-comparison support and evidence; separates real disagreement from different definitions or absent evidence. |
| [`/deepresearch`](.pi/agent/prompts/deepresearch.md) | `/deepresearch how does X affect Y?` — plan then deliver a comprehensive cited investigation. | Deep-research support and available source tools; **approve the saved plan before evidence gathering**. A separate agent is optional, not required. |
| [`/audit`](.pi/agent/prompts/audit.md) | `/audit this report against its dataset` — check claims against code, data, papers, or docs. | Paper/code-audit support and underlying evidence; inspecting third-party code does not authorize executing it. |
| [`/review`](.pi/agent/prompts/review.md) | `/review report.md` — critically review a paper, report, or proposal with severity-ranked findings and revisions. | Research-review support; an independent Herdr perspective only if useful and available. **Not** the `code-review` skill for Git diffs. |
| [`/draft`](.pi/agent/prompts/draft.md) | `/draft a report from these findings` — write a sourced paper, report, or technical document. | Paper-writing support, supplied research, citation checks; does not invent findings or numbers. |
| [`/recipe`](.pi/agent/prompts/recipe.md) | `/recipe train a small classifier on this dataset` — rank practical, evidence-backed methods and prerequisites. | Training-recipe support (also handles non-ML procedures); **describes** steps, does not execute them without authorization. |
| [`/replicate`](.pi/agent/prompts/replicate.md) | `/replicate result from this paper` — plan or run a reproducibility check. | Replication support; offers plan-only and asks you to choose an execution environment **before** installs, experiments, code changes, or paid compute. |
| [`/autoresearch`](.pi/agent/prompts/autoresearch.md) | `/autoresearch improve this benchmark score` — run a bounded change/benchmark loop; `/autoresearch off` preserves state, `/autoresearch clear` requests clearing its state. | Autoresearch support; needs a benchmark, metric, change scope, iteration cap, environment, and **explicit approval**. `clear` requires confirmation. |

### Product decisions

| Command | Use it like this / what you get | Relies on / boundary |
| --- | --- | --- |
| [`/frame`](.pi/agent/prompts/frame.md) | `/frame idea or issue` — identify the customer problem, current baseline, outcome, and appetite. | Feature-framing support; ends with a **human Frame Go** decision, not a solution design. |
| [`/shape`](.pi/agent/prompts/shape.md) | `/shape agreed frame` — turn a framed problem into a Shape Up pitch: problem, appetite, solution, rabbit holes, no-gos. | Feature-shaping support; falls back to framing if needed and consults `concept-design` only for consequential behavior. Ends with a **human build decision**. |
| [`/kickoff`](.pi/agent/prompts/kickoff.md) | `/kickoff approved-pitch.md` — discuss the approved pitch with builders, tentative integrated scopes, and an early risky slice. | Full pitch, linked concept specs, shaping tools; asks if the pitch or approval is missing. **No tickets, task assignments, or coding just from kickoff.** |
| [`/slop-go`](.pi/agent/prompts/slop-go.md) | `/slop-go path/to/go/package` — read-only Go code-health report (verbosity, structural erosion, maintainability index, Halstead). | Local `slop-go` skill and Go toolchain; same as `/skill:slop-go`; excludes generated/test code by default and does not score `.templ`. |

### Visual design: one phase at a time

These commands all use internal `design-lab` support and, where relevant, local `design-inspo` + `impeccable`. Work in the active project. Inspiration needs the local `inspo` catalog; implementation needs a runnable app/build and visual verification. If inside Herdr, independent studies can use separate agents; otherwise they are made sequentially. Image generation may be used for original stills; video is limited to the family-variants phase when useful. **Pick a result before promoting it.**

| Command | Use it like this / what you get | Needs / stops before |
| --- | --- | --- |
| [`/design-catalog`](.pi/agent/prompts/design-catalog.md) | `/design-catalog visual brief` — five distinct catalog-backed visual families. | `inspo` catalog; **discovery only**, no file edits. |
| [`/design-study-matrix`](.pi/agent/prompts/design-study-matrix.md) | `/design-study-matrix brief` — two different responsive studies per family in an exploration comparison (five families by default). | Product facts, catalog, Impeccable, root app server/build; does not promote a study. Can establish families itself if none supplied. |
| [`/design-family-variants`](.pi/agent/prompts/design-family-variants.md) | `/design-family-variants chosen-study 3` — explore substantially different versions of one family (three by default). | A chosen family/study and exploration host; preserves the source, does not promote a variant. |
| [`/design-tweak-lab`](.pi/agent/prompts/design-tweak-lab.md) | `/design-tweak-lab prototype body` — add an accessible floating control panel to try live visual choices. | Prototype plus `body`, `hero`, or `page` scope; lab controls stay out of public UI until approved. |
| [`/design-hero-lab`](.pi/agent/prompts/design-hero-lab.md) | `/design-hero-lab full-page-prototype 4` — separate hero studies with a keyboard-accessible picker (four by default). | Existing full-page prototype and original local assets; leaves the draft intact. |
| [`/design-promote-hero`](.pi/agent/prompts/design-promote-hero.md) | `/design-promote-hero full-page-prototype chosen-hero` — integrate the selected hero into the full-page draft. | Both inputs and approved copy; preserves alternative studies and stops before production-home promotion. |
| [`/design-document`](.pi/agent/prompts/design-document.md) | `/design-document accepted-surface` — record the *implemented* visual system in root `DESIGN.md` (plus Impeccable sidecar). | Observed CSS/assets and Impeccable document workflow; asks before changing an existing `DESIGN.md`. |
| [`/design-build-home`](.pi/agent/prompts/design-build-home.md) | `/design-build-home accepted-prototype` — put the accepted design on the production home route. | Accepted prototype or `DESIGN.md`, approved content and app build; keeps lab routes separate. |
| [`/design-handoff`](.pi/agent/prompts/design-handoff.md) | `/design-handoff next objective` — verified notes for the next design session. | Local `handoff` skill; saves in OS temp unless you choose elsewhere, does not start the next phase. |

The diagram shows *common* design progress, not a forced sequence. For example, you can use `/design-tweak-lab` on any suitable prototype, and `/design-document` after you have accepted and implemented a surface.

## Skills: `/skill:name ...`

The links open the actual `SKILL.md`. “Manual” means its frontmatter disables automatic model invocation: use `/skill:<name>` deliberately. Other skills may load automatically for matching requests, but explicit invocation works when you want to be sure. The example in each row is a **Pi input**, not a shell command.

### Everyday work and coordination

| Skill | What to ask it to do | Relies on / important limit |
| --- | --- | --- |
| [`bro`](.agents/skills/bro/SKILL.md) **manual** | `/skill:bro` — restate the assistant's last message plainly and briefly. | The preceding answer; this is a rewrite, not a new investigation. |
| [`handoff`](.agents/skills/handoff/SKILL.md) **manual** | `/skill:handoff focus on unresolved tests` — leave a compact continuation note for a fresh agent. | Current conversation and existing artifacts; saves to OS temp, links rather than duplicates, redacts secrets. |
| [`herdr`](.agents/skills/herdr/SKILL.md) | `/skill:herdr start a reviewer agent` — manage panes, background commands, servers, and agents. | `HERDR_ENV=1`, live Herdr CLI/session; subagents only when requested or another workflow requires them. Extra agents can cost money. |
| [`show-me`](.agents/skills/show-me/SKILL.md) | `/skill:show-me diagram this flow` — explain with a small sketch or, for dense subjects, a visual explainer. | Real paths/behavior; HTML explainers use its theme rules and Plannotator. Inline diagrams need no extra app. |
| [`teach`](.agents/skills/teach/SKILL.md) **manual** | `/skill:teach probability basics` — build a continuing course of short HTML lessons and practice. | A teaching workspace with `MISSION.md`, `RESOURCES.md`, lessons, learning records, and trusted sources; establishes your learning goal first. |

### Build, debug, and maintain software

| Skill | What to ask it to do | Relies on / important limit |
| --- | --- | --- |
| [`code-review`](.agents/skills/code-review/SKILL.md) **manual** | `/skill:code-review review since main` — examine a Git diff separately for repo standards and original spec fidelity. | A fixed Git ref and ideally a spec/issue; can review standards alone if no spec. Subagents only when available and authorized. |
| [`diagnosing-bugs`](.agents/skills/diagnosing-bugs/SKILL.md) | `/skill:diagnosing-bugs why is search slow?` — build a fast, reproducible failing signal, then isolate, test, and fix the cause. | Runnable project/test or redacted traces; stops and asks for evidence if no real repro loop is possible. |
| [`prototype`](.agents/skills/prototype/SKILL.md) | `/skill:prototype test this state model` or `... show three UI directions` — make a **throwaway** logic demo or UI variant route. | A specific question, nearby project context, easy run path; validated decision goes into real code, prototype stays off main. |
| [`tdd`](.agents/skills/tdd/SKILL.md) **manual** | `/skill:tdd implement this test-first` — red → green in vertical behavior slices. | Agreed public test seams **before** writing tests; tests behavior, not private implementation. |
| [`worktrees`](.agents/skills/worktrees/SKILL.md) | `/skill:worktrees create a checkout for feature-x` — create/reuse/remove Git worktrees. | Canonical `.bare` repository layout and bundled helper; checks uncommitted work before removal. |
| [`write-discoverable-code`](.agents/skills/write-discoverable-code/SKILL.md) | `/skill:write-discoverable-code name these APIs` — keep new code findable by search and self-explanatory at the definition. | Existing domain vocabulary; applies when writing/renaming symbols, filenames, errors, and doc comments. |
| [`slop-go`](.agents/skills/slop-go/SKILL.md) | `/skill:slop-go ./internal` — audit authored Go verbosity, erosion, MI, and Halstead with concrete suspects. | Go 1.22+ and bundled analyzer; **read-only**, metrics are clues, not quality gates. Also available as `/slop-go`. |
| [`sentry-cli`](.agents/skills/sentry-cli/SKILL.md) | `/skill:sentry-cli investigate PROJECT-123` — use Sentry CLI for issues, events, traces, logs, projects, API, etc. | `sentry` binary and Sentry access; CLI usually finds org/project from checkout; event payloads may contain sensitive data. |
| [`sentry-go`](.agents/skills/sentry-go/SKILL.md) | `/skill:sentry-go add tracing to this Go handler` — review or instrument Go Sentry transactions, spans, error capture. | `github.com/getsentry/sentry-go`, SDK/version and tracing reference; protect PII and avoid redundant spans. |
| [`templ`](.agents/skills/templ/SKILL.md) | `/skill:templ fix this .templ component` — build/debug server-rendered Go templ and its HTTP/JS integration. | Project's templ version and `templ generate`; edit `.templ`, not generated `_templ.go`. |
| [`htmx`](.agents/skills/htmx/SKILL.md) | `/skill:htmx submit this form without a reload` — design HTML-over-the-wire interactions and fragments. | htmx on the page and server endpoints returning HTML; check the project's htmx version before adopting version-specific syntax. |
| [`tailwind`](.agents/skills/tailwind/SKILL.md) | `/skill:tailwind review this v4 theme setup` — Tailwind v4 build, CSS generation, utility, responsive, and theming rules. | Tailwind **v4** project and bundled rules; not a generic CSS or Go templ guide. |

### Product, decisions, and issue tracking

| Skill | What to ask it to do | Relies on / important limit |
| --- | --- | --- |
| [`concept-audit`](.agents/skills/concept-audit/SKILL.md) | `/skill:concept-audit map this app's concepts` — read-only assessment of user-facing behaviors, boundaries, coupling, and misfits. | Code/schema/API/docs evidence; recommends decisions, does not refactor. |
| [`concept-design`](.agents/skills/concept-design/SKILL.md) | `/skill:concept-design specify the Invite concept` — write/review independent user-facing concept specs and named synchronizations. | Purpose, state, actions, operational principle; ask you to decide consequential ownership/behavior. |
| [`domain-modeling`](.agents/skills/domain-modeling/SKILL.md) | `/skill:domain-modeling clarify Customer vs User` — sharpen terms and maintain `CONTEXT.md`. | Project code and existing glossary; glossary is domain language, not an implementation spec. |
| [`grilling`](.agents/skills/grilling/SKILL.md) | `/skill:grilling stress-test my plan` — ask decision questions in rounds with recommendations. | Your answers for consequential choices; investigates facts itself instead of making you look them up. |
| [`grill-me`](.agents/skills/grill-me/SKILL.md) **manual** | `/skill:grill-me my migration plan` — interview-only shortcut to `grilling`. | Same interview method; doesn't write glossary or ADRs unless separately asked. |
| [`grill-with-docs`](.agents/skills/grill-with-docs/SKILL.md) **manual** | `/skill:grill-with-docs new billing model` — interview while updating resolved domain terms. | `grilling` + `domain-modeling`; ADRs only with your approval. |
| [`to-tickets`](.agents/skills/to-tickets/SKILL.md) **manual** | `/skill:to-tickets approved plan.md` — split a plan into small, end-to-end, dependency-linked tickets. | Repo tracker conventions or your chosen local/remote tracker; **approve breakdown and destination before publishing**. |
| [`triage`](.agents/skills/triage/SKILL.md) **manual** | `/skill:triage let's look at #42` — verify and classify an issue (and eligible PRs), then produce next-state notes/briefs. | Issue tracker and its label conventions; confirms proposed state changes with maintainer. |
| [`wayfinder`](.agents/skills/wayfinder/SKILL.md) **manual** | `/skill:wayfinder map this multi-session effort` — chart decision tickets when the route is still unclear; later sessions work the next unblocked decision. | Approved tracker or local directory, human decisions; planning by default, **not** a build ticket backlog. |

`/frame` and `/shape` are the concise command entry points for a *bounded product feature*. `wayfinder` is for a much foggier multi-session effort; `to-tickets` is for work already decided and ready to slice. `triage` classifies incoming issues. They solve different stages of the problem.

### Visual design and marketing

| Skill | What to ask it to do | Relies on / important limit |
| --- | --- | --- |
| [`design-inspo`](.agents/skills/design-inspo/SKILL.md) | `/skill:design-inspo find editorial, warm visual references` — search saved Field Notes by tags for art direction. | Local `inspo` CLI/catalog; **read-only**, no importing, no copying brands/layouts. |
| [`impeccable`](.agents/skills/impeccable/SKILL.md) | `/skill:impeccable critique this page` or `... make this UI quieter` — design, build, review, and refine frontend UX/visuals. | Project context, its own launcher/playbooks, running UI/screenshots; use a specific target/verb when possible. Backend-only work is out of scope. |
| [`product-marketing-context`](.agents/skills/product-marketing-context/SKILL.md) | `/skill:product-marketing-context set up positioning for this project` — create/update reusable audience, product, voice, proof, and goals context. | Repo or your answers; writes **project-local** `.agents/product-marketing-context.md`, which other marketing skills read. |
| [`site-architecture`](.agents/skills/site-architecture/SKILL.md) | `/skill:site-architecture plan our site navigation` — page hierarchy, URLs, menus, internal links. | Audience/goals/content inventory; uses product marketing context if present. For XML sitemaps, use `seo`. |
| [`copywriting`](.agents/skills/copywriting/SKILL.md) | `/skill:copywriting rewrite this landing-page hero` — persuasive page sections, headlines, and CTAs. | Product context, audience, offer, proof; no invented testimonials or stats. For page/form bottlenecks, use `cro`. |
| [`cro`](.agents/skills/cro/SKILL.md) | `/skill:cro audit this pricing page` — diagnose page or non-signup form friction and propose measurable tests. | Page/form, conversion goal, analytics or observed UI; hypotheses when baseline data is absent. |
| [`marketing-psychology`](.agents/skills/marketing-psychology/SKILL.md) | `/skill:marketing-psychology why won't visitors choose a plan?` — apply behavioral models to marketing choices. | Product context and customer behavior; use ethically and test assumptions, not magic persuasion claims. |
| [`seo`](.agents/skills/seo/SKILL.md) | `/skill:seo audit indexability and AI-answer visibility` — technical/on-page search plus AI-citation visibility. | Site, target queries, search/analytics evidence; distinguish observed rankings/citations from a measurement plan. |

### Documents, teaching materials, and writing

| Skill | What to ask it to do | Relies on / important limit |
| --- | --- | --- |
| [`humanizer`](.agents/skills/humanizer/SKILL.md) | `/skill:humanizer make this draft sound like me` — remove formulaic AI-writing patterns while keeping meaning. | Your text and ideally a voice sample; returns a draft, self-critique, and final rewrite. |
| [`obsidian-cleanup`](.agents/skills/obsidian-cleanup/SKILL.md) | `/skill:obsidian-cleanup notes/chapter-2.md` — turn named notes into citation-preserving nested study outlines. | Explicit note paths and (per its workflow) read-only section subagents; never quietly edits an entire vault. |
| [`pptx`](.agents/skills/pptx/SKILL.md) | `/skill:pptx review these slides.pptx` or `... create a deck` — extract, edit, or generate PowerPoint. | Extraction/render tools; PptxGenJS for programmatic creation and visual slide checks after edits. |
| [`revealjs`](.agents/skills/revealjs/SKILL.md) | `/skill:revealjs make a 10-slide deck` — create an HTML/CSS slideshow (not `.pptx`). | Node + bundled scaffold; browser/CDN for slides, Puppeteer/Decktape for overflow and slide screenshots. |
| [`skill-creator`](.agents/skills/skill-creator/SKILL.md) | `/skill:skill-creator turn this repeatable workflow into a skill` — write or improve a compliant `SKILL.md`. | Clear trigger, inputs/outputs, and optional refs/scripts; validates structure when tooling exists. |
| [`writing-for-agents`](.agents/skills/writing-for-agents/SKILL.md) | `/skill:writing-for-agents simplify this AGENTS.md` — make instructions for agents easier to trigger and follow. | Existing agent docs/skills and their readers; especially useful for `AGENTS.md`, `CLAUDE.md`, or skill authoring. |
| [`writing-fragments`](.agents/skills/writing-fragments/SKILL.md) **manual** | `/skill:writing-fragments ~/ideas.md` — interview for raw article ideas and append fragments without an outline. | A Markdown capture path; **explore** mode, preserves edits between turns. |
| [`writing-shape`](.agents/skills/writing-shape/SKILL.md) **manual** | `/skill:writing-shape ~/ideas.md` — choose an article angle and build it block by block with you. | Existing raw material plus a separate output path; **exploit** mode, leaves source untouched. |
| [`writing-beats`](.agents/skills/writing-beats/SKILL.md) **manual** | `/skill:writing-beats ~/ideas.md` — build an article as a branching sequence of beats you select. | Raw Markdown plus article output path; grounds unfamiliar ideas before using them, writes one chosen beat at a time. |

### Connected services

| Skill | What to ask it to do | Relies on / important limit |
| --- | --- | --- |
| [`basecamp`](.agents/skills/basecamp/SKILL.md) | `/skill:basecamp show my assigned todos` — read/write Basecamp projects, todos, cards, messages, files, schedules, etc. | Authenticated `basecamp` CLI and usually a project (`--in` or `.basecamp/config.json`); use care with posting and client visibility. |
| [`caldir`](.agents/skills/caldir/SKILL.md) | `/skill:caldir what's on my calendar this week?` — read/create/edit `.ics` events and sync calendars. | `caldir` CLI, `~/.config/caldir/config.toml`, calendar files (usually `~/caldir/`), provider connection for sync; local edits may need `caldir push`/`sync`. |

## Quick chooser

- **Research?** One document → `/summarize`. A field → `/lit`. Two things → `/compare`. Deep multi-source answer → `/deepresearch`. Check a claim against underlying data → `/audit`. Judge a research artifact → `/review`. Draft from research → `/draft`.
- **Trying to implement a study?** Methods → `/recipe`. Reproduce a result → `/replicate`. Repeated optimization experiment → `/autoresearch` *only after defining and approving a bounded loop*.
- **Product work?** User problem → `/frame`; buildable pitch → `/shape`; approved bet → `/kickoff`. Unsure what the actual domain words or behavior mean → `domain-modeling` or `concept-design`. Existing conceptual health → `concept-audit`.
- **UI?** Need directions → `/design-catalog`; multiple implementations → `/design-study-matrix`; want to explore one study → variants, tweak lab, or hero lab; accepted design → document/build home. For one ordinary interface review or edit without the lab workflow, use `impeccable` directly.
- **Code trouble?** App bug or performance problem → `diagnosing-bugs`. Sentry evidence → `sentry-cli`; Go instrumentation → `sentry-go`. Review a Git branch → `code-review`. Go health metrics → `/slop-go`.
- **Slides?** Need `.pptx` → `pptx`. Need an HTML presentation → `revealjs`. **Need another agent?** `herdr` only in a Herdr session; many workflows can proceed without one.

For the latest behavior, follow the linked prompt/skill file. This guide is a map; those files are the source of truth.
