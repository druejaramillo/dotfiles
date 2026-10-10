---
name: create-verification-skill
description: Generate and prove a project-local driver and feature map for the real UI, CLI, service, or library when requested.
disable-model-invocation: true
license: MIT
metadata:
  upstream: https://github.com/backnotprop/pstack
  upstream-revision: 3a604672c46cd8187d2b19980eae0a34f9f91138
---

# Create a verification skill

Create a maintained project-local way to launch, drive, observe, and clean up the
real app. This workflow writes the driver and runs its instructions when invoked
for a project; installing this global skill does not run an application.

Read [Skill creator](../skill-creator/SKILL.md) and
[Writing for agents](../writing-for-agents/SKILL.md) before authoring. Follow
repository instructions and existing test-seam, environment, and permission
requirements. Do not repair product code, install dependencies, use paid compute,
or publish just to make verification work without the corresponding authority.

## 1. Learn the repository

Answer from source, scripts, and docs before asking the user:

- **Surface:** identify the user-facing UI, CLI/TUI, API, library, or desktop app.
  Pick the primary surface and note meaningful secondary entry points.
- **Run:** locate the documented command, build, ports, data directories, seed
  fixtures, environment variables, and authentication prerequisites. Refer to
  secret names, not secret values.
- **Drive:** prefer an existing working browser, HTTP, PTY, or library harness.
  Read the installed tool skill before using a generic browser/terminal tool.
- **Observe:** identify screenshots, output, exit status, logs, persisted state,
  or responses that prove the action and side effect.
- **Isolate:** establish owned instances, data, profiles, and ports. Refuse to
  double-drive a shared instance when independent state cannot be guaranteed.

If the base cannot start, report the precise blocker. Verification-only
scaffolding may be created only within the permitted scratch scope, documented,
and cleaned up. A product repair is a separate task. Confirm unobservable choices
or missing execution authority rather than guessing.

Use the project's existing skill convention. Otherwise write
`<project>/.agents/skills/verify-<app>/`; Pi discovers this after project trust.
Do not place app-specific commands, fixtures, or selectors in global skills.

## 2. Write the driver

Create `verify-<app>/SKILL.md` with valid frontmatter: its name matches the
directory, and its description identifies the app, surface, and when to use it.
Choose activation according to project conventions rather than changing global
visibility. Ground every command and selector in the repository; leave no
placeholder masquerading as a runnable step.

Include these sections:

- **Launch:** exact command, working directory, owned resources, readiness check,
  and teardown. A short-lived CLI/library may build once and run each recipe in
  its own isolated invocation; a server/UI may use one owned long-lived instance.
- **Doctor:** a read-only check of instance identity/build, process/endpoint
  readiness, resource ownership, and relevant prerequisites. Run before driving
  and after surprises. If the process is healthy but the UI is wedged, reset to
  a known state or relaunch rather than trusting process liveness alone.
- **Drive:** public user paths with real stable handles, arguments, and expected
  observations. Prefer accessible names and stable attributes over coordinates.
- **Evidence:** capture the action and resulting state, not merely the final
  screen. Observe relevant file/database/network side effects through an
  independent view. Use approved boundary fakes only where the project permits
  them. Observe what a dry-run skips; its name is not a safety guarantee.
- **Cleanup:** tear down only instances, fixtures, and scratch state owned by the
  run. Record ownership explicitly; never kill by process name. Clean residue
  after failed attempts too. Proof artifacts survive every cleanup.
- **Helpers:** add scripts only where needed, make executable helpers executable,
  and document each invocation and working directory. Reuse existing tooling.

Choose a named evidence location outside disposable scratch cleanup. Preserve
browser/screenshot tool outputs there when their default paths are temporary.
Redact credentials and personal data before retaining or sharing artifacts.

## 3. Seed the feature map

Read [the illustrative feature map](references/feature-map-example/README.md).
Its app, commands, and selectors are examples, not dependencies to install.

Create `features/README.md` and one file for each of the first three to five
important features, derived from routes, commands, menus, or documented behavior.
The index names prerequisites, baseline state, driving conventions, evidence
locations, and the feature files. Each feature has a user-facing summary and:

1. `Sub-features`: observable behaviors with short stable IDs.
2. `How to get to it (user POV)`: meaningful user entry points.
3. `Driving it with <actual harness>`: prerequisites, action/command, independently
   expected outcome, and proof capture for each recipe.
4. `Gotchas`: traps, reset requirements, and inaccessible prerequisites.

A convenient entry point does not establish coverage of other mapped paths.
Distinguish covered, pending, and blocked coverage honestly.

## 4. Prove the generated instructions

Within the approved project environment, run launch → doctor → one mapped
feature → evidence → cleanup once. After teardown, inspect the named proof files
and confirm they survive. If a step fails, clean owned residue, fix only driver
or harness drift within scope, then re-drive the corrected instructions. Report
product defects or missing prerequisites separately.

An unexecuted driver is a draft, not a proven deliverable. If execution is
blocked, leave clear runnable instructions where grounded, state what was not
run and why, and do not claim behavior was verified.

## 5. Hand over

Report the driver path, mapped features, actual commands/run result, proof paths,
cleanup result, and limits. Point to
[Maintain a verification skill](../maintain-verification-skill/SKILL.md) for upkeep
or `/skill:maintain-verification-skill` in Pi. Suggest a cadence only if requested.
Creating a driver does not authorize commits, pushes, PRs, or tracker writes.

Adapted from pstack at revision `3a604672c46cd8187d2b19980eae0a34f9f91138`;
see [LICENSE](LICENSE) and [the manifest](../../pstack-integration/manifest.json).
