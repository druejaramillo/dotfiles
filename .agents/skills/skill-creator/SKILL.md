---
name: skill-creator
description: Create Agent Skills that follow the Agent Skills specification. Use when the user wants to create a new skill, draft or improve a `SKILL.md`, write a stronger skill description, structure a skill directory, decide whether to add `scripts/`, `references/`, or `assets/`, or turn a repeated workflow into a reusable skill.
---

# Skill Creator

Create skills that are specific, reusable, and easy for an agent to trigger correctly.

At minimum, produce a skill directory containing a valid `SKILL.md` with YAML frontmatter followed by Markdown instructions. Add extra files only when they materially improve the skill.

## Process

### 1. Capture the real task

Start with the user's actual goal, not a generic idea of the domain.

- Extract what you can from the current conversation first.
- Reuse concrete workflows, corrections, conventions, and edge cases the user already revealed.
- If key details are missing, ask only for the minimum needed to write a useful skill.

Collect these facts before drafting:

- What the skill should help the agent do
- When the skill should trigger
- What inputs the agent will usually receive
- What outputs or side effects are expected
- Which constraints, gotchas, or project conventions the agent would otherwise miss

If the user already has a draft skill, improve it instead of rewriting from scratch.

### 2. Choose the smallest correct scope

Design one coherent unit of work.

- Do not make the skill so narrow that many skills must activate for one task.
- Do not make it so broad that the description becomes vague or triggers on unrelated work.
- Prefer a clear default approach over a menu of equivalent options.

If the task can already be handled well without specialized instructions, say so instead of inventing unnecessary skill content.

### 3. Write spec-compliant frontmatter

The `SKILL.md` file must start with YAML frontmatter.

Required fields:

- `name`: lowercase letters, numbers, and hyphens only; 1-64 chars; must match the directory name
- `description`: non-empty; max 1024 chars; explains both what the skill does and when to use it

Optional fields:

- `license`
- `compatibility`
- `metadata`
- `allowed-tools`

Do not invent extra frontmatter fields unless the target environment explicitly supports them.

### 4. Write the description for triggering

The description is the main trigger surface. Write it so an agent can recognize when to load the skill.

- Describe both the job and the situations where it applies.
- Match user intent, not internal implementation details.
- Include concrete phrases, artifacts, or contexts the user is likely to mention.
- Be specific enough to avoid false positives, but broad enough to catch natural variations.
- Prefer direct wording like `Use when...`.

Weak example:

```yaml
description: Helps with PDFs.
```

Stronger example:

```yaml
description: Extract text and structured data from PDF files, including forms and scanned documents. Use when the user needs to read, transform, search, or process PDFs, even if they describe the task without naming PDF tooling.
```

### 5. Write the body for execution

Use the Markdown body to tell the agent how to do the work.

Prefer:

- Step-by-step procedures
- Clear defaults
- Short examples
- Concrete gotchas
- Validation steps when mistakes are costly

Avoid:

- Generic advice the model already knows
- Long background explainers
- Large menus of equally weighted choices
- Copy that describes the task without improving execution

Focus on what the agent would likely get wrong without the skill: project conventions, domain-specific rules, fragile command sequences, output formats, and non-obvious edge cases.

### 6. Use progressive disclosure

Keep `SKILL.md` focused. Move detail into extra files only when needed.

- Put always-needed instructions in `SKILL.md`
- Put detailed documentation in `references/`
- Put reusable deterministic logic in `scripts/`
- Put templates or static resources in `assets/`

When referencing another file, tell the agent when to read it.

Good:

```markdown
If the API returns a non-200 response, read the skill's bundled API error reference before retrying.
```

Bad:

```markdown
See the references for more information.
```

### 7. Add scripts only when they remove repeated work

Bundle a script when the skill depends on logic that is repetitive, fragile, or easy to verify mechanically.

Good script candidates:

- Parsing a custom format
- Validating generated output
- Transforming data in a repeatable way
- Running a delicate command sequence reliably

Script guidance:

- Keep scripts non-interactive
- Accept input via flags, stdin, or files
- Provide `--help`
- Print structured output when possible
- Send diagnostics to stderr and machine-readable output to stdout
- Include clear error messages

If a one-off command is enough, keep it inline in `SKILL.md` instead of creating a script.

### 8. Include evaluation when it is worth it

If the skill's output can be checked in a concrete way, propose lightweight evals.

Start with 2-3 realistic prompts that cover:

- A normal case
- A variation in phrasing or context
- At least one edge case if relevant

For each eval, define:

- The user prompt
- Any input files
- A short description of successful output

Use assertions only for things that can actually be checked. Do not force rigid assertions onto subjective tasks like taste, tone, or visual quality.

### 9. Validate before finalizing

Before you finish, check:

- The directory name matches `name`
- `SKILL.md` has valid frontmatter
- The description covers both what and when
- The body gives the agent actionable instructions
- Referenced files actually exist
- Optional files are justified, not decorative
- The skill is concise enough that the always-loaded content earns its place

If available in the environment, validate with:

```bash
skills-ref validate ./path-to-skill
```

### 10. Present the result cleanly

When delivering a finished skill:

- State the skill name and directory
- Summarize what it does
- Call out any optional files you added and why
- Mention any remaining assumptions or gaps

## Writing Heuristics

Use these defaults unless the task suggests otherwise.

- Prefer procedures over declarations
- Prefer examples over abstract explanations
- Prefer defaults over menus
- Prefer specific gotchas over generic warnings
- Prefer moderate detail over exhaustive documentation
- Prefer real project knowledge over textbook best practices

## Minimal Template

Use this as a starting point, then replace the placeholders with real content.

```markdown
---
name: skill-name
description: Explain what the skill does and when to use it.
---

# Skill Title

One short paragraph on the goal of the skill.

## Process

1. First action
2. Main workflow
3. Validation step

## Gotchas

- Non-obvious rule or edge case
- Project-specific convention

## Example

Input: realistic user request
Output: what the skill should produce or accomplish
```

## Decision Rule

If you are unsure whether to add more content, leave it out unless it clearly helps the agent make a better decision or take a better action.
