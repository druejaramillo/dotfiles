# Deep Research Workflow

This configuration provides two research workflows that run from any active
project:

- A one-command narrative brief for a question, decision, comparison, or
  landscape.
- A resumable catalog workflow for researching many comparable entities such as
  companies, products, papers, laws, or vendors.

Both workflows write their output inside the active project. They never modify
application source code, dependencies, or project configuration.

## Requirements

- Restart OpenCode after installing or changing this global configuration.
- Run OpenCode from an environment where `OPENCODE_ENABLE_EXA=1` is exported if
  you want the workers to use web search. Web fetch remains available when a
  source URL is known.
- Structured-catalog validation uses the isolated Python environment at
  `~/.local/share/opencode/deep-research-venv/` and its installed `PyYAML`
  dependency. No project Python environment is used.

## Quick Start

Use a narrative brief when you want an answer to a decision or question:

```text
/research Compare Linear, Jira, and GitHub Projects for a 20-person product team.
```

Use a catalog when you need consistent research across many entities:

```text
/research-catalog AI coding assistants for enterprise teams
```

The narrative command starts immediately unless one or two missing constraints
would materially change the research. The catalog command proposes its item and
field schema first and requires confirmation before saving it.

## Commands

| Command | Use it for | What it does |
| --- | --- | --- |
| `/research <question>` | A decision-ready brief | Runs up to three evidence workstreams, audits them, and writes a cited brief. |
| `/research-catalog <topic>` | A research dataset | Proposes and creates an entity outline plus field schema. |
| `/research-add-items [topic-or-path]` | More entities | Proposes deduplicated additions to an existing outline and saves them after confirmation. |
| `/research-add-fields [topic-or-path]` | More comparison dimensions | Proposes schema fields and saves them after confirmation. |
| `/research-deep [topic-or-path]` | Entity-by-entity research | Resumes incomplete catalog research in batches of up to three workers. |
| `/research-report [topic-or-path]` | Final catalog output | Validates JSON records and writes a cited Markdown report. |

When a project has exactly one research catalog, the catalog commands can locate
it automatically. When it has several, provide the topic or its directory, for
example `research/ai-coding-assistants`.

## Narrative Briefs

### Usage

```text
/research Should we build or buy a customer feedback platform for our SaaS product?
```

The command works from the argument or, if no argument is supplied, the active
conversation. It is autonomous by default. It asks up to two focused questions
only when a missing goal, audience, time range, geography, budget, or other
constraint would make the result unreliable.

### Process

1. The `research-orchestrator` identifies the decision, scope, assumptions,
   time range, applicable framework, source strategy, and unknowns.
2. It writes `strategy.md` and divides the topic into no more than three
   non-overlapping workstreams.
3. Up to three `research-worker` subagents research those workstreams in
   parallel. Each worker records a finding after every web search or fetch,
   including a source URL, source type, relevant date, and confidence.
4. The read-only `research-auditor` checks the evidence for unsupported claims,
   weak sources, stale information, conflicts, missing counterarguments, and
   source bias.
5. The orchestrator addresses valid audit findings once.
6. The `research-synthesizer` produces the final brief from the research
   artifacts. It does not search for new evidence during synthesis.

### Output

```text
research/<topic-slug>/
  strategy.md
  workstreams/
    <workstream>.md
  audit.md
  brief.md
```

`brief.md` is the final deliverable. It includes:

- A direct TL;DR that answers the question.
- Scope, methods, framework choice, and important assumptions.
- Landscape and decision logic rather than a list of facts.
- Practitioner or implementation reality, including failures and tradeoffs where
  evidence supports them.
- Adjacent opportunities and horizon pointers.
- Competing perspectives and a red-team challenge to the leading conclusion.
- Decision points when the research supports a choice.
- Inline sources, confidence labels, unresolved gaps, and limitations.

## Structured Catalogs

Use this workflow when each entity should be researched against the same fields.
Examples include competitor landscapes, vendor selection, product comparisons,
literature reviews, jurisdiction-by-jurisdiction rules, and due diligence.

### 1. Create The Schema

```text
/research-catalog AI coding assistants for enterprise teams
```

The command creates a proposed outline and field schema in:

```text
research/<topic-slug>/
  outline.yaml
  fields.yaml
```

It combines a model-generated initial framework with a bounded source-grounded
supplement, then asks you to confirm the items and fields before writing them.
The default `batch_size` is three workers.

`outline.yaml` identifies the research topic, entities, and execution settings:

```yaml
topic: AI coding assistants for enterprise teams
items:
  - name: Example Assistant
    description: Why it belongs in this comparison.
execution:
  batch_size: 3
  items_per_agent: 1
  output_dir: results
```

`fields.yaml` defines the comparison dimensions and whether they are required:

```yaml
field_categories:
  - category: Commercial
    fields:
      - name: pricing_model
        description: Pricing tiers and enterprise packaging.
        detail_level: moderate
        required: true
```

### 2. Refine The Catalog

Use these before starting or resuming deep research when the catalog needs to
change:

```text
/research-add-items research/ai-coding-assistants
/research-add-fields research/ai-coding-assistants
```

Both commands propose changes first. They do not alter the schema until you
confirm. Adding a field does not retroactively edit existing result records.

### 3. Research The Remaining Entities

```text
/research-deep research/ai-coding-assistants
```

The command checks existing JSON files before starting. A result is skipped only
when it passes the local validator. Remaining entities run in batches of no more
than three parallel workers, so interrupted research can be resumed by invoking
the command again.

Results are stored here:

```text
research/<topic-slug>/
  results/
    <entity-slug>.json
```

Each result must include all configured fields. When evidence is unavailable,
the worker writes `[uncertain]` rather than inventing a value, adds the field to
the `uncertain` array, and supplies a non-empty `sources` array. Every source
contains `title`, `url`, and `supports` keys.

### 4. Create The Report

```text
/research-report research/ai-coding-assistants
```

Only JSON records that pass validation are included. The report is written to:

```text
research/<topic-slug>/report.md
```

It compares decision-relevant data, retains relevant source links, excludes
uncertain values, and explicitly states incomplete coverage and evidence limits.
It does not generate or execute a report-generation script.

## Manual Validation

`/research-deep` and `/research-report` run validation as part of their normal
workflow. To inspect a specific record manually, run:

```text
~/.local/share/opencode/deep-research-venv/bin/python \
  ~/.config/opencode/skills/deep-research/scripts/validate_json.py \
  --fields research/<topic-slug>/fields.yaml \
  --json research/<topic-slug>/results/<entity-slug>.json
```

To validate every record in a catalog:

```text
~/.local/share/opencode/deep-research-venv/bin/python \
  ~/.config/opencode/skills/deep-research/scripts/validate_json.py \
  --fields research/<topic-slug>/fields.yaml \
  --dir research/<topic-slug>/results
```

Validation checks that required fields are present, `uncertain` names refer to
defined fields, and source evidence has the expected structure. A failed record
remains in place for a later `/research-deep` resume.

## Source Standards

The workflow uses sources according to the claim being made:

- Use statutes, agencies, courts, enforcement actions, official documentation,
  product pages, source code, filings, original datasets, and peer-reviewed work
  for primary evidence.
- Use independent secondary, practitioner, and community sources to test
  primary-source claims and reveal implementation reality.
- Prefer three independent source types for high-confidence claims and two for
  medium confidence. Single-source claims are labeled low confidence.
- Cite material factual and quantitative claims inline with the original URL.
- Record dates for time-sensitive claims and surface conflicting evidence rather
  than averaging it or selecting a preferred answer silently.
- Treat reviews, forums, and social posts as practitioner evidence, not as
  universally representative facts.

## Built-In Roles

| Role | Responsibility | Write Access |
| --- | --- | --- |
| `research-orchestrator` | Creates artifacts, launches workers, validates records, and coordinates review. | `research/**` only |
| `research-worker` | Researches one bounded workstream or catalog entity. | Assigned `research/**` artifact only |
| `research-auditor` | Independently spot-checks evidence and reports findings. | None |
| `research-synthesizer` | Turns audited artifacts into a brief or report. | Assigned `research/**` output only |

No research role may modify application source files, project configuration, or
dependencies. Workers cannot delegate work, and the synthesizer cannot search
for new evidence. These boundaries preserve evidence traceability and keep
research output separate from implementation work.

## Methodology References

The installed `deep-research` skill uses these internal references:

```text
~/.config/opencode/skills/deep-research/
  SKILL.md
  references/frameworks.md
  references/playbooks.md
  references/source-selection.md
  references/synthesis.md
  scripts/validate_json.py
```

The methodology selects one to three useful frameworks, applies one of six
playbooks where relevant, prioritizes sources by research type, triangulates
key claims, turns facts into decision-relevant insights, red-teams conclusions,
and records meaningful absences in the available evidence.

## Operational Notes

- Research artifacts are project files. Decide whether to commit, ignore, or
  archive `research/` according to the project's normal repository practice.
- `/research` does not need a plan-approval gate. Catalog schema changes do,
  because they affect the dataset that later workers will populate.
- The workflow avoids Claude-specific task monitoring and does not execute
  model-generated scripts. If a worker fails, its partial artifact and status
  remain visible for a later resume.
- Use a focused question and a concrete decision whenever possible. This gives
  the workers better boundaries and produces a more useful final brief.
