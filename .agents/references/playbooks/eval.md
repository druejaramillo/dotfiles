# Eval

Use only for an explicitly requested skill/prompt experiment. Installing the
integration does not require evaluation runs or post-setup acceptance tests.

## Agree the experiment

Identify the variants, task fixtures, observable success criteria, trial count,
allowed models/environment, resource budget, and permitted side effects. Write a
fixed rubric with a few concrete criteria before seeing candidate outputs.
An evaluation request does not authorize unrelated session mining or publication.

Read [Explain the number](../principles/explain-the-number.md) before interpreting
numerical results. A small trial supports a local decision, not a statistical
productivity claim.

## Keep the comparison fair

- Give variants the same organic user task and meaningful starting conditions.
  Use neutral, project-shaped fixture paths and labels; do not leak variant/model
  identities, the hidden rubric, or the fact other candidates exist to candidates.
- Preserve instructions a real task would contain. Do not impose arbitrary word
  bans on legitimate task wording in the name of blinding.
- Isolate writable outputs so trials cannot overwrite each other or inherit
  another variant's edits. Record the actual conditions and relevant differences.
- A judge can know it is judging, but sees sanitized artifact labels and the
  rubric, not model names or favored-variant identities. Compare variants on the
  same scale in one pass where feasible.

## Run only the authorized trials

Use direct isolated Pi runs or explicitly authorized Herdr helpers; read
[Herdr](../../skills/herdr/SKILL.md) before delegation and require its environment,
count, topology, budget, and lifecycle rules. Select actual available Pi model
identifiers rather than inventing an upstream role configuration. Missing required
independence/blinding is a stated limit or blocker, not a claimed property.

Save each prompt, resulting artifact, run conditions, failures, and relevant
file/tool-use evidence from those trial sessions. Inspect only the authorized
sessions for this experiment, not every local project or unrelated private chats.
Do not solicit private reasoning or ask candidates to recite the skills they
used. Check artifact behavior and observed file/tool use instead of self-report.

Read every result, compare with the rubric/judge, and investigate disagreements
or ambiguity before recommending a variant. Stop at the approved cap/budget or
user stop; no parallel shared benchmark edits or uncontrolled nested delegation.

## Report

Give the question/variants, rubric, actual trials, artifact paths, blind verdict
when available, your synthesis, and limits. Keep failures and inconclusive trials
visible. Recommend promotion only on the evidence; do not automatically edit
skills, publish findings, or start another run.

Adapted from pstack's Eval playbook at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`.
See [the license](../PSTACK-LICENSE) and
[the manifest](../../pstack-integration/manifest.json).
