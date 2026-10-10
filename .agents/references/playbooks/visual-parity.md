# Visual parity

Use for an explicitly requested UI migration that preserves agreed visual
behavior, not for every design task. Existing UI specialists and browser/project
harnesses remain the owners of implementation and capture.

## Freeze a reproducible baseline

Before migration, record the component/page states, viewports, browser/build,
fonts, data, locale/time conditions, animation policy, and capture command.
Capture the current implementation and any agreed target with a deterministic
harness. Agree the meaningful diff tolerance; arbitrary screenshots do not
promise noise-free pixel equality.

No baseline means no parity claim. Preserve baseline images and the capture
contract. If the baseline or spec is wrong, ask about that decision rather than
silently changing it to make the result pass.

## Migrate and compare

1. Read the relevant design/web/language skills and repository instructions.
   Identify shared primitives before component-specific work.
2. Migrate one coherent unit at a time. Direct work is the default; authorized
   parallel writers get exclusive outputs/worktrees and follow
   [Separate shared state](../principles/separate-before-serializing-shared-state.md).
3. Reuse the same capture conditions and compare actual before/after images
   with the repository's image-diff tool. Inspect deltas; distinguish genuine
   changes from demonstrated capture noise using the agreed tolerance.
4. Exercise relevant interactions and important states too. A matching static
   image does not prove focus, validation, navigation, or persisted behavior.
5. Preserve screenshots/diffs, commands, and any interaction proof outside
   scratch cleanup. Temporary screenshot-tool output must be copied to the
   named evidence location. Generated artwork is not application evidence.

Fix the implementation or explain a blocker within the authorized scope. Do not
alter baselines, weaken assertions, or restructure the target merely to quiet a
failure. A deliberate baseline/contract revision is separately reviewed work.
No unbounded loop to chase nondeterministic pixels.

## Report

Name units migrated, agreed capture conditions/tolerance, image-diff results,
interaction coverage, proof paths, and remaining gaps. PRs/merges remain separate
authorized actions using the existing repository owners.

Adapted from pstack's Visual parity playbook at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`.
See [the license](../PSTACK-LICENSE) and
[the manifest](../../pstack-integration/manifest.json).
