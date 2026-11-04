---
name: research-mode
description: Research sources, compare claims, review or draft evidence-backed documents, and plan or run explicitly authorized reproductions through internal playbooks.
disable-model-invocation: true
---

# Research mode

Own the requested research task and its follow-ups. Read
[the evidence rules](principles/evidence.md). For actions that change code,
spend resources, publish or expose private material, also follow
`~/.agents/references/operating-boundaries.md`.

1. Identify the question, supplied sources, intended artifact and relevant
   scope. Use facts already provided. Ask only when missing facts or a human
   decision materially changes the task.
2. Select the smallest matching path below and read that file. A short source
   explanation needs the evidence rules and relevant reading reference, not a
   full investigation. Load only references the task needs.
3. Gather evidence and produce the requested answer or artifact. Ordinary
   search, reading and drafting have no preliminary plan-approval gate. A
   request for a plan stops at the plan.
4. Check consequential claims against their actual sources. Report access and
   verification gaps. Use one canonical artifact for substantive work; keep
   quick answers in chat unless a file is requested.

| Request | Read |
| --- | --- |
| Open question or deep research | [Investigate](playbooks/investigate.md) |
| Scholarly landscape, author or corpus | [Literature review](playbooks/literature-review.md) |
| Compare sources, options or claims | [Compare](playbooks/compare.md) |
| Claim against code, data or underlying evidence | [Audit](playbooks/audit.md) |
| Critique a paper, report or draft | [Review](playbooks/review.md) |
| Practical ML or technical recipe | [Training recipe](playbooks/training-recipe.md) |
| Evidence-grounded paper or report | [Draft](playbooks/draft.md) |
| Reproduction plan or approved execution | [Replicate](playbooks/replicate.md) |
| Scholarly discovery or paper identification | [Scholarly sources](references/scholarly-sources.md) |
| PDF pages, figures, tables or supplements | [PDF reading](references/pdf-reading.md) |

For earlier work, read the Pi transcript mapping in
`~/.pi/agent/references/upstream-skills-pi.md`, then the upstream
`~/.agents/skills/pstack/recall/SKILL.md`. Do not maintain another recall flow.

For an explicitly requested metric-optimization loop, hand the engineering task
to upstream poteto-mode's hillclimb playbook through the same Pi mapping. Its
loop and decision log remain authoritative. Reproduction is not permission to
tune a result until it matches a published number.

Use existing tools and the ordinary calling agent. Independent Herdr work is
optional, scoped and subject to its guard and resource limits. A self-check is
not an independent review. This mode creates neither a scheduler nor new tools.
