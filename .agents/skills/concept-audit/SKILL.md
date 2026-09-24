---
name: concept-audit
description: Analyze existing software, codebases, APIs, schemas, or system descriptions through Daniel Jackson's concept design methodology. Use when auditing conceptual integrity, identifying concepts, evaluating boundaries or modularity, mapping code to concept specs, finding overloaded, duplicate, or missing concepts, or optionally assessing code-realization health with evidence. Produces a read-only audit with inventory, quality assessment, composition analysis, strengths, and targeted recommendations.
---

# Concept Audit

A concept audit analyzes a system at the **conceptual level** — the level of user-facing functionality — to answer: what are the units of behavior here, are they well-formed, and where are the design problems?

A codebase is conceptually healthy when:
- user-facing functionality is organized around clear concepts
- each concept has one purpose
- concept state has local, explicit logical ownership and is minimal
- actions are explicit and atomic
- concepts do not bypass another concept's state owner or invariants
- cross-concept behavior lives in synchronization/mediator code
- UI/API language maps cleanly to concept language
- tests verify operational principles and action traces
- code can be explained as a composition of independent concepts

---

## Audit Levels

Choose the lightest level that satisfies the request.

| Level | Use when asked | Output |
|-------|---------------|--------|
| **1 — Concept inventory** | "What concepts are here?" | Candidate concepts, purposes, evidence, confidence, obvious problems |
| **2 — Concept/code map** | "How does code map to concepts?" | Inventory + actions/state/files/routes/tables/synchronizations per concept |
| **3 — Design misfit audit** | "What's wrong?" or "How do I improve?" | Inventory + misfit report, conceptual severity, evidence, and recommended decisions |
| **4 — Code-realization health** | "Are these seams, dependencies, and ownership boundaries healthy?" | Inventory + evidence-backed ownership/caller/seam/dependency map and ranked decisions; no patches |

---

## Step 1: Gather Material

Work with what's available. In rough order of usefulness:

- **Database schema / data model** — reveals possible state and write paths; not proof of concept boundaries
- **API routes or service interfaces** — reveal actions; what users can do
- **Module/service/package names** — often reflect (or violate) concept structure
- **Feature documentation or user stories** — reveal purpose; useful for naming concepts
- **Source code** — most complete but most time-consuming

Also inspect: README/product docs, UI pages/components, CLI commands, public SDK/API, tests and fixtures.

Aim to identify: what state does this system maintain? What actions can users perform? What purposes do those actions serve?

---

## Step 2: Identify Concepts

Look for coherent clusters of state + behavior that serve a recognizable user-facing purpose. For each candidate:

1. Can you name it? (one or two words)
2. Can you write a one-sentence purpose?
3. Can you sketch an operational principle?

If all three are yes, it's a concept. Record each candidate as:

```
## Candidate: Name

Purpose:
State evidence:
Action evidence:
Operational principle evidence:
Files:
Confidence:
```

Look for: nouns in routes and UI labels, verbs in handlers and service methods, tables and migrations, repeated action traces in tests, user-visible status/state, policy gates, workflows, background jobs that produce user-visible state.

**Do not** treat every table, struct, class, package, or service as a concept.

Classify each candidate:

| Classification | Meaning |
|----------------|---------|
| **Strong concept** | Clear purpose, independent, behavioral, end-to-end |
| **Weak concept** | Present but structurally scattered or partially overloaded |
| **Implementation detail** | Internal mechanism users don't experience |
| **Entity only** | Identity-bearing object but no meaningful behavior |
| **Workflow/synchronization** | Cross-concept coordination, not a standalone concept |
| **Overloaded concept** | Serves multiple separable purposes |
| **Redundant concept** | Duplicates another concept |
| **Missing concept** | User need exists but has no named, bounded representation |

---

## Step 3: Assess Each Concept

Evaluate against the **seven criteria**:

| Criterion | Test question |
|-----------|---------------|
| **User-facing** | Would a user ever directly interact with this, or is it purely internal infrastructure? |
| **Semantic** | Is it about abstract behavior and state, or about UI layout, colors, or widgets? |
| **Independent** | Can you explain what it does without mentioning another concept? Is it polymorphic over external types? |
| **Behavioral** | Does it have actions that change or observe state? Or is it just a data record? |
| **Purposive** | Does it serve one specific, valuable purpose — not two, not zero, not "manage X"? |
| **End-to-end** | Does its functionality fully deliver on its stated purpose, or is half the workflow missing? |
| **Familiar / Reusable** | Would this concept appear in a similar form in other apps? Can it be named without referencing this app? |

For each criterion that fails, note specifically why and what it implies.

Also check for overloading sub-patterns:
- **False convergence**: Two purposes that seemed like one thing
- **Piggybacking**: A new feature bolted onto an existing concept because it was convenient
- **Denied purpose**: A user need embedded in something else rather than given its own concept
- **Emergent purpose**: Users found a use the designer never intended; concept now serves two purposes

**Eigensolution check**: Does the concept's design handle a broad range of similar scenarios naturally, or does it require workarounds and special cases for near-identical situations?

**Map concept state:**
- What state, fields, relations, and invariants does the concept logically own?
- Which code paths are allowed to write that state?
- Where is that state physically represented, if it is relevant evidence?
- Which fields are required by the concept's actions vs. accidental?
- Which state is duplicated across concepts?
- Which invariants are enforced by code, database, tests, or not at all?

**State smells:** fields or relations have unclear or competing logical owners; status fields mix different lifecycles; a concept's state can be changed through unrelated code paths; physical representation obscures which action protects an invariant. A shared table or collection alone is not a smell.

**Map concept actions:**
- List action names from code
- Map handlers/routes/methods/jobs to actions
- Identify blocked/error cases and tests

**Action smells:** one method performs several concept actions; CRUD-only names but behavior is richer; same action implemented in multiple places; background job mutates concept state with no corresponding concept action.

---

## Step 4: Assess Composition

Look at how concepts are combined. Classify each synchronization:

| Classification | Meaning |
|----------------|---------|
| **Healthy synchronization** | Mediator/workflow composes independent concept actions |
| **Under-synchronization** | Expected automation is missing; user must manually coordinate |
| **Over-synchronization** | Automation removes user control or creates surprise |
| **Hidden coupling** | One concept directly mutates another |
| **Integrity violation** | Composition causes a concept to behave contrary to its own spec |

**Synchronization smells:**
- Concept code uses a sibling package or shared record to mutate state it does not logically own
- Service method named after one concept performs another concept's behavior
- UI relies on action order not enforced by backend
- Transaction spans unrelated purposes without a named workflow
- Event handler changes state in ways no user-facing action explains

**Integrity violations**: A concept behaves differently inside the app than its standalone definition would predict. Users encounter unexpected behavior that violates their mental model.

**Concept mapping issues**: The way a concept is presented in the UI doesn't match its underlying state model. (Gmail's Label concept is a good example — labels exist on messages but the UI shows them on conversations.)

**Composition evidence** (if reviewing code):
- Does a caller bypass another concept's action or state owner to mutate its logical state?
- Does business logic that composes concepts lack a named synchronization boundary?
- Do imports, transactions, shared records, or event handlers hide a dependency or ownership conflict?

An import or shared physical record is evidence to investigate, not a violation by itself. Report a problem only when the evidence shows hidden coupling, a bypassed owner or invariant, contradictory behavior, or an unjustified seam.

---

## Step 5: Compare to DDD Boundaries

When the codebase uses DDD or domain language:

- Compare concepts to bounded contexts
- Compare concept actions to aggregate methods
- Compare concept state to aggregate consistency boundaries
- Identify entities that are not concepts
- Identify concepts split across aggregates
- Identify aggregates with multiple concept purposes
- Identify domain services that are actually synchronization mediators

Do not force DDD terminology onto the audit. Use it only to explain current architecture and refactor options.

---

## Optional Code-Realization Health Pass

Run this pass only when the user asks about implementation health or the concept map exposes a concrete realization risk. It remains read-only: map evidence and recommend a next human decision; do not turn it into a broad periodic architecture scan, a refactor plan, or code edits.

Build only the maps needed to support a finding:
- **Ownership map:** logical state, invariant, authorized action, and actual writers
- **Caller map:** callers of a concept action or state-changing seam, including background jobs and handlers
- **Dependency map:** dependency direction and category: opaque identity, composed concept action, infrastructure, framework, or presentation
- **Seam map:** public action seams, hidden realization behavior, adapters/ports, and the tests that exercise each seam

Look for these evidence-backed issues:
- **Direct cross-concept mutation:** a caller writes another concept's logical state instead of using the owner action or named synchronization
- **Hidden dependency:** a dependency changes concept behavior but is absent from the concept map or synchronization ledger
- **Shallow pass-through:** a module or service adds no ownership, rule, policy, adaptation, or useful seam beyond forwarding calls
- **Leaked rule:** a concept invariant or policy is enforced only in a caller, UI, route, or unrelated module
- **Storage-bypassing test:** a test claims to verify behavior but writes or asserts through storage while bypassing the action or synchronization seam that owns it
- **Unjustified interface:** an abstraction exists without meaningful variation, protocol boundary, or independently changing implementation evidence

Physical co-location, a shared table, a common transaction, or a concrete dependency is not an issue on its own. It becomes relevant only when it produces an ownership conflict, invariant bypass, hidden behavioral dependency, misleading seam, or a concrete delivery risk.

For every issue, cite the exact files, symbols, callers, tests, migrations, or traces that support it. Separate these assessments:

| Assessment | Meaning |
|------------|---------|
| **Conceptual severity** | Harm to concept integrity or user-visible semantics if the issue remains |
| **Architecture payoff** | Expected benefit of addressing it for ownership, locality, change safety, or testability |
| **Delivery risk** | Risk and cost of changing it, including migration, compatibility, and operational concerns |
| **Confidence** | Strength and completeness of the available evidence |

End each issue with a **next human decision**. Stop and report uncertainty rather than assign a high-confidence ownership, severity, or seam judgment without evidence.

## Authority Boundary

The audit recommends decisions; the user selects which findings to pursue. Do not edit code, generate a refactor plan, or create ADRs/documents as an audit byproduct. Stop when a finding's ownership, conceptual severity, or evidence is unclear enough that a recommendation would be speculative.

---

## Step 6: Rank Findings

Assess **conceptual severity** separately from architecture payoff, delivery risk, and confidence:

- **Critical**: causes user-visible contradictions, data loss, security errors, billing/access errors, or impossible mental model
- **High**: overloaded concept, hidden coupling, missing invariant, or action bypass likely to cause bugs. The flaw is observable by users or creates genuine confusion.
- **Medium**: unclear naming, scattered state/action, missing OP tests, redundant behavior. Works but will cause maintenance pain or limit future extensibility.
- **Low**: documentation, package naming, minor concept/code mismatch. A refinement that would improve clarity but current design functions fine.

Each finding:
```
### Finding: title

Conceptual severity: Low | Medium | High | Critical
Architecture payoff: Low | Medium | High
Delivery risk: Low | Medium | High
Confidence: Low | Medium | High
Concept(s):
Evidence:
Why it matters:
Recommendation:
Design move: Split | Merge | Unify | Specialize | Tighten | Loosen | None
Next human decision:
```

---

## Step 7: Write the Report

Use this structure. Be honest. If a concept is well-formed, say so and move on. Don't manufacture findings.

```markdown
# Concept Audit Report: [System Name]

**Date:** [date]
**Source material:** [what was analyzed]

---

## Summary

[2–4 sentences. Overall assessment: is the conceptual design sound, mixed, or problematic?
Name the 1–2 biggest strengths and the 1–2 most important concerns.]

---

## Identified Concepts

### [Concept Name]

**Type:** Explicit | Implicit
**Inferred purpose:** [one sentence]
**Assessment:** Strong | Acceptable | Needs work | Problematic
**Criteria:** [list any that fail, or "all pass"]
**Notes:** [specific observations — keep tight]

[repeat for each concept]

---

## Composition Analysis

[How are concepts composed? Any synchronization problems (over/under-sync)?
Any integrity violations? Any mapping issues between concept state and UI presentation?
If composition is clean, say so.]

---

## Code-Realization Health (optional)

[Include only when requested or supported by concrete evidence. Show the relevant ownership,
caller, dependency, and seam maps. State explicitly when the evidence is insufficient.]

---

## Strengths

[What is genuinely well-designed. Be specific. "The Label concept is cleanly polymorphic
and correctly treats items as opaque IDs" is useful. "Good separation of concerns" is not.]

---

## Findings & Recommendations

### [Finding Title]

**Conceptual severity:** Low | Medium | High | Critical
**Architecture payoff:** Low | Medium | High
**Delivery risk:** Low | Medium | High
**Confidence:** Low | Medium | High
**Problem:** [What's wrong and why it matters]
**Evidence:** [Where specifically — route, schema, feature name, etc.]
**Recommendation:** [Concrete suggestion]
**Design move:** Split | Merge | Unify | Specialize | Tighten | Loosen | None
**Next human decision:** [The choice the user should make]

[omit this section entirely if no findings]

---

## Concept Coupling and Explanation Order

[Map consequential dependencies without treating concepts as a required workflow.
ConceptA → ConceptB  (kind: opaque identity | named synchronization | infrastructure; reason: "...")]

[Use to show natural explanation order and viable scope subsets.]

---

## Verdict

[One paragraph. Is this a sound conceptual design? What's the single most important thing
to address, if anything? If it's good, say it's good.]
```

---

## Codebase Audit Heuristics

### Route Heuristic

Routes often reveal concepts and actions:
- `POST /sessions` → `Session.create`
- `DELETE /sessions/{token}` → `Session.invalidate`
- `POST /invites/{token}/accept` → `Invite.accept`
- `POST /documents/{id}/restore` → `Trash.restore` or `Document.restore`
- `POST /subscriptions/{id}/cancel` → `Subscription.cancel`

If route names do not map to concept actions, investigate.

### Table Heuristic

Tables reveal state, not necessarily concepts:
- `users` may support User
- `sessions` may support Session
- `role_permissions` may support Role or Access
- `jobs` may support Job, Generation, Import, Sync, or several overloaded concepts

If one table supports many concepts, identify the logical owner, allowed writers, and protected invariants for each relevant field or relation. Do not report co-location as a fault without behavioral evidence.

### Service Heuristic

Services often hide overloaded concepts. A `ProjectService` with `addMember`, `uploadDocument`, `generateVideo`, `sendInvite`, and `trackUsage` is not one concept — it is likely a workflow/application service coordinating several concepts.

### Test Heuristic

Good concept tests read like operational principles:

Bad: `TestCreateUpdatesDatabaseRows`

Good: `TestInvite_CreateThenAcceptAllowsMembershipSynchronization`

### Naming Heuristic

Concept language should appear consistently in specs, routes, handlers, service methods, tests, user-facing copy, and docs. Different names for the same purpose usually indicate redundancy or conceptual drift.

---

## Common Findings and Prescriptions

### Overloaded concept
**Symptom**: One concept has several purposes.
**Prescription**: Split into independent concepts and synchronize actions.
**Example**: "Like" may be Reaction + Upvote + Recommendation.

### Hidden implementation detail pretending to be concept
**Symptom**: Concept named Queue, Cache, Worker, Blob, Row, TokenStore, or Manager but users don't experience it directly.
**Prescription**: Move it to implementation notes for the real concept.

### Entity mistaken for concept
**Symptom**: Spec only describes fields, not behavior.
**Prescription**: Identify the user-facing behavior that gives the entity purpose.

### Missing concept
**Symptom**: Behavior appears repeatedly but has no name, spec, package, or tests.
**Prescription**: Introduce concept spec, then align code around its actions.

### Concept coupling
**Symptom**: Concept action mutates another concept's state directly.
**Prescription**: Extract a synchronization mediator.

### Under-synchronization
**Symptom**: User must manually do a follow-up action that should naturally follow.
**Prescription**: Add synchronization if it preserves user control.

### Over-synchronization
**Symptom**: One action unexpectedly triggers another action users may not want.
**Prescription**: Decouple actions, add confirmation, or make automation configurable.

### Overfit feature
**Symptom**: Many special cases for similar user needs.
**Prescription**: Search for a more polymorphic concept that covers the cases with fewer primitives.

---

## Quick Reference: Design Moves

| Move | Use when |
|------|----------|
| **Split** | Concept serves multiple separable purposes |
| **Merge** | Two concepts are always used together and coupling is fundamental |
| **Unify** | Multiple similar concepts could be one general parameterized concept |
| **Specialize** | General concept is too unconstrained for a specific purpose |
| **Tighten** | Add sync: automate a workflow users always execute manually |
| **Loosen** | Remove sync: automation is removing user control they want back |
| **None** | Design is fine; note this explicitly |

---

## After the Audit

This skill is read-only. When the user chooses to act on a finding, preserve its evidence, conceptual severity, architecture payoff, delivery risk, confidence, and next human decision. If the fix is a meaningfully sized, schedulable feature, frame and shape it into a pitch before building; otherwise handle it through the project's normal bug, maintenance, or reactive workflow. Consult `~/.pi/agent/references/concept-integrity.md` when implementing an approved concept or synchronization. Do not turn every finding into a rewrite or a Shape Up project.

---

## Final Rules

Be direct. Do not merely describe architecture — judge it.

Use confidence levels where evidence is incomplete.

Do not recommend a rewrite unless the concept/code mismatch is systemic and severe.

A report where every concept has a finding is not a rigorous audit — it's manufacturing problems. If a concept passes all seven criteria, the assessment is "Strong / all pass" and you move on. If the design is sound, say so.

High conceptual-severity patterns to watch for:
- A concept whose purpose can't be stated without mentioning another concept (independence failure)
- Two clearly distinct user needs served by a single concept (overloading)
- Actions that enforce app-specific rules that belong in the sync layer (integrity violation)
- State that means different things in different contexts within the same concept (false convergence)
- A "concept" that is purely a data record with no meaningful behavior

Low conceptual-severity patterns:
- Polymorphism that could be pushed further but works as-is
- A familiar concept given an app-specific name
- A sync that could be automated but users can manage manually without friction
- Minor naming inconsistencies
