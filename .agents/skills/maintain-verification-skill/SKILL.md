---
name: maintain-verification-skill
description: Audit every feature of a project's verification driver against source and live behavior, correcting only proven driver or map drift when requested.
disable-model-invocation: true
license: MIT
metadata:
  upstream: https://github.com/backnotprop/pstack
  upstream-revision: 3a604672c46cd8187d2b19980eae0a34f9f91138
---

# Maintain a verification skill

Maintain a project driver's feature map by checking every mapped feature from
source and live behavior. Installing this global workflow does not start a
maintenance run. The unit of coverage is the feature, with meaningful entry
points accounted for; it is not every sentence in the map.

## Scope and outcomes

Edit only the target verification directory: `SKILL.md`, its feature map, and its
owned harness scripts. Product regressions are separate findings, not permission
to repair product code or rewrite the map to call a defect intended behavior.
Respect the granted environment and action authority; dependencies, external
side effects, publication, or wider repairs require their own approval.

Report one outcome:

- **clean:** every mapped feature has source and live coverage, with no drift or
  unresolved product gap. No edits are needed.
- **changed:** complete coverage and proven local driver/map/harness corrections,
  with changed recipes re-driven. This does not imply a PR or commit.
- **blocked:** coverage or safe re-proof is incomplete, or a product regression
  prevents the documented behavior. Name the features, prerequisites, and any
  partial corrections instead of upgrading incomplete coverage to a pass.

## 1. Locate and index

Find the project's verification skill with launch/doctor/drive sections and a
feature map, usually `verify-*/` in its existing skill directory. Ask which one
if ambiguous. If absent, stop and point to
[Create a verification skill](../create-verification-skill/SKILL.md).

Read the driver, `features/README.md`, and all indexed feature files. Compare the
index to its sibling files; identify missing, extra, duplicate, and dead entries.
Keep the maintained map, not a second generated inventory.

## 2. Read source and reconcile

For every feature, trace its public entry points and return:

- The user-visible feature summary and source locations.
- Likely drift with citations, or no source drift found.
- One concise live recipe with prerequisites and expected observable outcomes.

Default to sequential source reading. If the task authorizes helpers, read
[Herdr](../herdr/SKILL.md), establish count/budget/topology, and assign bounded
read-only feature slices. Helpers never drive or edit; the coordinator owns the
live app and synthesis. Missing helper coverage is a gap, not a clean verdict.

Spot-check cited drift and combine compatible recipes into as few app states as
practical. Inspect recent source changes for missing user surfaces; require a
concrete entry point before adding one to the map.

## 3. Drive every feature

Run the target driver's own launch model: serial driving of an owned server/UI,
or a fresh isolated invocation per short-lived CLI/library recipe. Cover every
mapped feature and record meaningful entry-point coverage or remaining gaps.
Keep these invariants throughout:

1. Doctor before the first drive, on each fresh session where sessions are the
   unit, and after unexpected failures. Reset/relaunch a broken UI state when
   doctor cannot see that failure.
2. Evidence survives every cleanup, checked at its named location rather than
   assumed. Keep the action, output/state, side effects, and relevant run identity.
3. Nothing started for a drive outlives its usefulness. Clean failed-attempt
   residue promptly and tear down owned instances after the final re-proof.
   Never stop or mutate someone else's instance to recover the run.

A doctor failure caused by proven driver drift may be corrected within the
verification directory and retried once, restarting only what it invalidated.
Other missing prerequisites are blocked. Record the attempted route and exact
missing authentication, entitlement, OS, or external state; an unreachable
feature is not live-verified through a different feature.

## 4. Correct drift and re-prove

- Wrong user-facing description or missing prerequisite: correct proven map drift.
- Working app that the harness cannot drive: correct the owned harness, document
  executable helper invocations, and re-drive affected recipes.
- Broken product behavior: report the regression with evidence; keep it outside
  the edit scope and retain the intended contract.

Read [Writing for agents](../writing-for-agents/SKILL.md) for documentation edits.
Do not change assertions or expected outcomes merely to quiet a failure.
Re-read changed files and exercise changed harness recipes before declaring
corrections proven. If that cannot finish, report `blocked` with partial work.

## 5. Report and stop

Keep concise notes and evidence paths for features covered, confirmed drift,
product gaps, blocked routes, owned resources, cleanup, and the outcome. Redact
secrets. Cleanup removes scratch state, not proof. Save durable notes only where
this task calls for them; do not invent another experiment ledger.

No automatic branch, commit, push, PR, tracker write, or continuing scheduler.
Publication is separately requested work using the existing repository owners.

Adapted from pstack at revision `3a604672c46cd8187d2b19980eae0a34f9f91138`;
see [LICENSE](LICENSE) and [the manifest](../../pstack-integration/manifest.json).
