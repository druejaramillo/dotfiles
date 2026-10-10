# Skill mechanics

The skill-specific branch of [Writing for agents](SKILL.md): frontmatter,
invocation, composition, and router skills. The universal document-writing
method remains in `SKILL.md`.

## Invocation

Separate automatic discovery from the ability to read instructions. In Pi:

- A **model-invoked** skill has a name/description advertised in the model's
  context. It can be selected when the task matches, and the human can still use
  `/skill:<name>`. Omit `disable-model-invocation` or set it to `false`.
- A **manual-only** skill sets `disable-model-invocation: true`. It is hidden from
  automatic model selection but remains available through `/skill:<name>`. Keep
  a valid description; for a by-hand workflow, make it a concise human-facing
  summary rather than an always-loaded trigger catalogue.

**Manual-only is not a file-access boundary.** Another skill or prompt template
can explicitly instruct the agent to read a known `SKILL.md` path. That loads the
instructions without globally advertising the leaf or requiring an unavailable
Skill tool. The leaf's scope and approval requirements still apply.

Other harnesses may expose different command/discovery behavior. Check their
supported mechanics rather than assuming a visibility flag prohibits file reads.

## Choose the reach that is needed

Advertise a skill when its independent automatic trigger earns permanent context
load. Keep it manual-only when explicit invocation or a precise parent pointer
provides sufficient reach. A skill needed by a router does not need to become
model-invoked solely for that composition.

Match the directory and `name`, keep a non-empty description, and use only fields
the target harness supports. Preserve existing visibility when changing a body.

## Composition and shared reference

A pointer names the exact file and the condition for reading it. Resolve relative
paths from the containing skill directory, not the project working directory.
Use absolute/home-relative paths for external locations when that is clearer.

A shared workflow can live in one existing skill reached by explicit path. Pure
reference can instead live in a plain shared file outside the skill namespace,
with no frontmatter or `SKILL.md`. Use the latter when guidance should be usable
independently without another skill command. Keep one authoritative copy rather
than duplicating bodies to work around manual-only visibility.

## Router skills

A router gives the human one entry point and the agent a conditional map of
existing owners. In Pi it can explicitly read a manual-only leaf by path, then
follow its workflow; it need not merely suggest that the human invoke it.

Keep task classification, authority, and sequencing in the router. Keep detailed
workflow/reference content with its owner and load only the selected branch.
Invoking a router does not grant extra edit, spending, publication, or merge
permission. An explanation stays an explanation; a plan stops before execution.
