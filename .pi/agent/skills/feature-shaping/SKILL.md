---
name: feature-shaping
description: Shape a bounded product feature into a Shape Up pitch for a build decision. Use when a framed feature needs a rough but viable interaction and technical approach, an appetite, resolved rabbit holes and explicit no-gos, or when reviewing whether a proposed pitch is ready to bet on. Preserve builder autonomy and consult concept specs only for consequential behavior.
---

# Shape a feature

Turn a framed problem into a **pitch** that is rough, solved at the macro
level, and bounded by its appetite. Shaping verifies the essential wiring and
removes foreseeable time bombs; it does not predetermine every implementation
detail. The human chooses whether to bet on the pitch.

## Process

1. Read the frame: baseline, desired outcome, and proposed appetite. If the
   problem or appetite is missing, use `feature-framing` first. Check that the
   team controls the builders' schedules. Route reactive or externally blocked
   work through a different process.
2. Explore the product, code, data paths, and relevant concept specs **only as
   far as needed to shape a viable approach**. Consult the user or a
   knowledgeable engineer/designer where available; code inspection does not
   count as team review. When new durable user-facing behavior or a contested
   concept boundary matters, read
   `~/.agents/skills/concept-design/SKILL.md` and propose the smallest useful
   spec or revision. Otherwise, link the existing spec. Read
   `~/.pi/agent/references/concept-integrity.md` when a consequential concept
   boundary or synchronization affects feasibility.
3. Find a solution with the necessary places, affordances, connections, state
   transitions, and data flow. Sketch a breadboard or fat-marker-level diagram
   where it communicates better than prose. Show how the core use case works,
   leaving visual polish, routine code structure, and other builder-owned
   decisions open.
4. Walk the core use case end to end. Inspect assumptions that could overturn
   the approach or exceed the appetite. Distinguish **a rabbit hole to solve,
   test, cut, or fence off now** from **a bounded design/implementation choice
   for the builders**. Use a targeted sketch, code inspection, prototype, or
   spike to answer a specific doubt; report the result and remaining
   uncertainty. If a consequential risk depends on unavailable expert
   knowledge, mark it unvalidated rather than claiming Shape Go.
5. Hammer scope: retain the improvement over the baseline, find the smallest
   viable form, and state what is deliberately excluded. Cut optional cases or
   polish, not behavior promised by an approved concept. Check the appetite
   again after cuts.
6. Write the pitch using the five ingredients below. Give a candid **Shape Go
   / reshape / no bet** recommendation and name who must decide. Shape Go means
   no *known, unbounded* interaction or technical hole is silently handed to
   the builders, not that their tasks and final design are already chosen.

If stuck, read [shaping tools](references/shaping-tools.md) and choose **one**
tool for the present unknown. These are tools, not a sequence of ceremonies.

## Pitch format

```markdown
# [Feature name]

## Problem
A concrete baseline story, affected people, and the outcome we need.

## Appetite
The time budget and the scope trade-off it forces; not an implementation estimate.

## Solution
The essential interaction and technical wiring, in rough prose and selective
sketches. Link concept specs and name consequential synchronizations rather
than pasting full specs or assigning tasks. Mark examples as illustrative.

## Rabbit holes
Material risks found, how each was resolved or bounded, and evidence for viability.

## No-gos
Explicit use cases, integrations, or polish excluded to fit the appetite.
```

Keep the problem and solution together so the pitch can be judged against the
baseline. Add detail where it shows feasibility or avoids a specific trap.
Leave out the full task plan and affordance-by-affordance concept specs. Draft
in conversation by default; save at a user-approved or established project
location when a durable pitch is wanted. State whether technical collaborators
actually validated risky assumptions. Frame Go is not itself a build bet.

Sources: [Shape Up: Principles](https://basecamp.com/shapeup/1.1-chapter-02),
[Write the Pitch](https://basecamp.com/shapeup/1.5-chapter-06),
[Risks and Rabbit Holes](https://basecamp.com/shapeup/1.4-chapter-05),
[Right Level of Detail](https://www.ryansinger.co/whats-the-right-level-of-detail-when-shaping/),
and [Pitfalls](https://www.ryansinger.co/pitfalls-when-adopting-shape-up/).
