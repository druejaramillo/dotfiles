# Investigation

Produce a source-backed explanation, finding, or recommendation. An investigation
is read-only; it does not authorize a product edit or publication.

## Trace the question

1. Bound the question and read relevant repository instructions. Locate public
   entry points, state owners, and the action/data flow that answers it.
2. Use source search, navigation, tests, and docs. Trace enough to support the
   answer; do not run a full-repository or all-source sweep by default.
3. For motivation or regression history, inspect relevant git commits/PRs and
   supplied decisions. Separate documented rationale from inference. Read the
   installed Basecamp or Sentry skill only when that source is relevant and its
   access is authorized; missing access is a stated limit, not invented coverage.
4. Explain with cited locations, meaningful ownership/flow, constraints, and
   uncertainty. For a decision, compare viable options and give a reasoned
   recommendation. Read `~/.agents/skills/show-me/SKILL.md` or
   `~/.pi/agent/skills/eli5/SKILL.md` when the requested presentation
   calls for it.

A request for a fix or implementation is a separate scope decision. Return the
finding rather than quietly starting that work.

## Live runtime forensics

For a live CPU, memory, latency, or UI symptom, read
[Diagnosing bugs](../../skills/diagnosing-bugs/SKILL.md). Start with existing
signals; capture a reproducible symptom, workload, environment/build, and relevant
counters/profile. Map the observed mechanism to source instead of substituting
code speculation for runtime evidence.

Temporary instrumentation, live patching, restarts, debugger attachment, or
external-service capture are not literally read-only. Establish the permitted
environment and actions before doing them. Preserve captured evidence and remove
only owned diagnostic residue. This branch diagnoses; it does not ship a fix.

## Captured trace or profile forensics

Identify the supplied profile/trace/heap format and use its fitting parser or
viewer. Record capture conditions and inspect the actual artifact with bounded
queries: hot frames/call paths, retained objects and GC roots, or a blocked
thread's wait reason. A queryable local representation helps; a new database is
not mandatory when existing tooling already answers the question.

Map findings through the artifact's symbols to source files, symbols, and lines.
Resolve missing mappings or state the limit. Compare paired captures when
available; without that confirmation, label the finding as the strongest
hypothesis the capture supports, not a proven causal fix. Save useful extracted
data rather than flooding the coordinating conversation with raw logs.

For an actual crash dump, read [Diagnose crash](../../skills/diagnose-crash/SKILL.md)
and retain its platform-specific workflow. Do not replace it with generic trace
analysis. Missing symbols, provenance, or comparable captures limit the verdict.

## Report

Give the answer, supporting source/artifact paths, evidence versus inference,
important limits, and the next decision only if needed. No product changes,
commits, PRs, or tracker writes arise from this path alone.

Adapted from pstack's Investigation, Runtime forensics, and Trace forensics
playbooks at revision `3a604672c46cd8187d2b19980eae0a34f9f91138`.
See [the license](../PSTACK-LICENSE) and
[the manifest](../../pstack-integration/manifest.json).
