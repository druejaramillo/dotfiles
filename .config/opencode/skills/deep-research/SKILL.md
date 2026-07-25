---
name: deep-research
description: Use when executing /research or the research catalog commands, or when the user explicitly requests a cited deep-research brief, competitive analysis, market research, regulatory research, literature review, or a multi-entity research dataset.
---

# Deep Research

Use this skill for source-grounded research, not for casual explanations. Keep
research artifacts under `research/<topic-slug>/` in the active project. Do not
write application source files or change project configuration as part of a
research run.

## Intake

Classify the request before researching:

- **Narrative brief:** a decision, question, comparison, landscape, or analysis.
  `/research` is autonomous by default. Ask no more than two focused questions
  only when the goal, scope, audience, time range, geography, or constraints
  would materially change the result.
- **Structured catalog:** a set of comparable people, companies, products,
  papers, laws, or other entities. Use the catalog commands and preserve the
  user's approved item and field definitions.

For either mode, identify the decision the research should inform, what is out
of scope, the relevant time period, and known assumptions. Read
`references/frameworks.md` and `references/source-selection.md` before creating
the strategy. Read the matching section of `references/playbooks.md` when a
topic fits one of its research categories.

## Narrative Brief Workflow

1. Create `strategy.md` with the core question, scope, selected frameworks,
   five-layer map, source strategy, three non-overlapping workstreams, known
   unknowns, and likely decision points.
2. Create one skeleton under `workstreams/` for each workstream. Include the
   bounded scope, required sections, status, and an inline-citation reminder.
3. Launch no more than three `research-worker` agents in parallel. Give each an
   absolute output path, exclusive scope, source priorities, and explicit
   section list.
4. A worker must write a concise finding, its URL, source type, and confidence
   after every web search or fetch. It must distinguish sourced facts from
   inference and mark unknowns rather than filling gaps. Workers set their
   artifact status to `COMPLETE` only after all assigned sections are covered.
5. Ask `research-auditor` to inspect all completed workstreams. Save the result
   as `audit.md`. Resolve valid findings once; retain unresolved evidence gaps
   in the final output.
6. Ask `research-synthesizer` to write `brief.md`. Before synthesis, it must
   read `references/synthesis.md` and every workstream plus `audit.md`.

`brief.md` must contain a direct TL;DR, scope and methods, the landscape and
decision logic, practitioner or implementation reality, adjacent opportunities,
counterarguments, decision points where useful, horizon pointers, and sources
with confidence and limitations. Organize by the reader's decision, never by
which worker found the fact.

## Catalog Workflow

`/research-catalog` creates these user-reviewable files:

```yaml
# outline.yaml
topic: Example topic
items:
  - name: Example item
    description: Why this item belongs in the catalog.
execution:
  batch_size: 3
  items_per_agent: 1
  output_dir: results
```

```yaml
# fields.yaml
field_categories:
  - category: Basic information
    fields:
      - name: description
        description: What the field means and acceptable evidence.
        detail_level: moderate
        required: true
```

Confirm proposed item and field changes before writing either schema. Keep
`batch_size` at three unless the user requests another limit. `/research-deep`
must locate the catalog, validate its YAML shape, inspect `results/`, and skip
only result files that pass validation. Process remaining items in batches of
at most three.

Each result is valid JSON. It contains every defined field, uses `[uncertain]`
for unavailable values, lists such fields in `uncertain`, and includes a
non-empty `sources` array. A source entry includes at least `title`, `url`, and
the claim or fields it supports. Run:

```text
~/.local/share/opencode/deep-research-venv/bin/python \
  ~/.config/opencode/skills/deep-research/scripts/validate_json.py \
  --fields <absolute-fields-path> --json <absolute-result-path>
```

`/research-report` reads only validated results. It writes `report.md` directly
and omits uncertain values, while keeping source links and a clear limitations
section. Do not generate or execute a report-generation script.

## Source and Claim Rules

- Prefer primary sources for rules, product behavior, data, and announcements.
  Use independent secondary and practitioner sources to test them.
- Every material factual or quantitative claim needs an inline URL. Cite the
  original source, not a search-result page or an unsourced summary.
- Record publication or effective dates for time-sensitive claims. Do not use
  stale material without stating why it remains relevant.
- Treat forum posts, reviews, and social media as practitioner evidence, not
  universal facts. Look for patterns across independent accounts.
- State source disagreement, explain the likely cause, and calibrate confidence.
  Never average conflicting numbers or present a disputed value as settled.
- Never fabricate a source, citation, direct quote, field value, or unsupported
  causal claim.

## Quality Gate

Before completing a research run, ensure the final artifact includes concrete
insights rather than a source dump, cites material claims, identifies gaps and
counterarguments, distinguishes evidence from inference, and states what the
research changes for the reader's decision.
