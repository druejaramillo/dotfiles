---
name: concept-design
description: Design, write, review, edit, split, merge, or critique software concepts using Daniel Jackson's concept design methodology. Use when defining user-facing functionality as discrete reusable units, writing concept specs, refining boundaries, discussing operational principles or concept independence, or relating concepts to DDD, aggregates, bounded contexts, and user stories.
---

# Concept Design

Concept design (Daniel Jackson, *The Essence of Software*) structures software around **concepts** — discrete, reusable units of user-facing functionality. Each concept has a clear purpose, stands alone without reference to other concepts, and is recognizable across different applications.

This skill is for both human collaborators and coding agents. Its job is to produce concept specs that are clear enough to guide code, tests, APIs, storage, UI flows, and refactoring.

---

## Canonical Spec Format

Every concept spec has exactly these five parts:

```
concept ConceptName [TypeParam, ...]

purpose
  one sentence: the value this concept delivers to users, standalone

state
  SSF declarations (see State Notation)

actions
  action signatures (see Action Notation)

operational principle
  a short scenario showing the concept fulfilling its purpose
```

**Type parameters** in `[brackets]` represent external types the concept treats as opaque identities — no structure assumed. Use them whenever the concept should work polymorphically (e.g., `Label [Item]`, `Comment [Target, Author]`).

Optional supporting sections may follow the canonical five:

```
notes
invariants
non-goals
implementation projection
synchronization/coupling ledger
open questions
```

Never replace the canonical five sections with another format.

---

## State Notation (SSF)

SSF (Simple State Form) is the mandatory notation for state. It is whitespace-sensitive; one declaration per line; field declarations indented under their set.

**A set of objects with fields:**
```
a set of Users with
  an email String
  a password String
  a createdAt DateTime
  an isActive Flag
```

**A subset (adds fields to objects already in a superset):**
```
a set of Items with
  a title String

a Archived set of Items with
  an archivedAt DateTime
  an archivedBy User
```

**An enumerated field:**
```
a set of Subscriptions with
  a status of ACTIVE or CANCELLED or EXPIRED
```

**A set-valued field:**
```
a set of Posts with
  a tags set of String
  a coauthors set of User
```

**An optional scalar:**
```
a set of Events with
  an optional endDate Date
```

**A relation defined as a subset:**
```
a set of Users with
  a username String

a Following set of Users with
  a follows set of Users
```

**A singleton:**
```
an element AppConfig with
  a maintenanceMode Flag
  an appName String
```

**Implicit field name** (when field name equals type name, lowercased): omit the name.
```
a set of Posts with
  a User        ← same as: a user User
  a set of Tags ← same as: a tags set of Tag
```

**Primitives:** `String`, `Number`, `Flag`, `Date`, `DateTime`

For complex or ambiguous SSF cases, read `references/ssf.md` for the full grammar.

---

## Action Notation

```
actionName [inputParam: Type; anotherParam: Type] => [outputParam: Type]
actionName [inputParam: Type; anotherParam: Type] => [error: String]
```

Rules:
- Square brackets on both sides; semicolons between params
- Every fallible action gets a success overload *and* an error overload
- Infallible actions (pure state reads, always-succeed mutations) only need one overload
- Empty inputs or outputs: `[]`
- Set outputs: `=> [results: set of Item]`
- Multiple outputs: `=> [session: Session; token: String]`
- camelCase for actions and params; PascalCase for types

**Common patterns:**
```
create [name: String; owner: User] => [item: Item]
create [name: String; owner: User] => [error: String]

delete [item: Item; requestedBy: User] => []
delete [item: Item; requestedBy: User] => [error: String]

find [label: String; owner: User] => [items: set of Item]

checkPermission [user: User; resource: String; action: String] => [allowed: Flag]
```

Validation-only actions that produce no state change are still actions — they just return a result or error.

---

## Operational Principle

The OP is a short narrative scenario — not a formal proof, not a test. It tells the basic story of how the concept delivers its purpose.

A good OP:
- Covers the archetypal path (not edge cases)
- Shows the concept fulfilling its stated purpose end-to-end
- Reads naturally in prose or light pseudocode
- Is 2–5 sentences

**Strong OP:**
> after `register [email: "a@b.com"; firstName: "Alice"]` => `[user: alice]` and `setPassword [user: alice; password: "secret"]` => `[user: alice]`, then `authenticate [email: "a@b.com"; password: "secret"]` => `[user: alice]` succeeds, while `authenticate [...; password: "wrong"]` => `[error: ...]`

**Weak OP** (too mechanical, doesn't show purpose):
> after `create [name: "x"]` => `[item: i]`, the item exists in the set

---

## Working Mode

Concept work is standalone; it does not depend on a prescribed workflow or an implementation phase. Discover only what is needed to make a sound concept decision, then prescribe the concept.

### Socratic Discovery

Ask focused questions only when they will materially change the concept. Good questions:

- What user-facing value does this concept provide by itself?
- What would a user expect to be able to do with it?
- What state must be visible or inferable to make those actions intelligible?
- What is the shortest story showing that the concept works?
- Is this one purpose or several purposes masquerading as one?
- Is this concept familiar under another name?
- Could it be made more polymorphic by replacing domain-specific nouns with generic targets, items, users, resources, or containers?
- What should happen when an action is blocked?
- What behavior belongs inside this concept versus in synchronization with another concept?

Do not ask for information already implied by the codebase, existing docs, or the user's prompt. If the user asks you to proceed, make reasonable assumptions and list them.

### Strong Prescription

Once enough context exists, stop asking broad questions and produce the best spec. Be opinionated. Identify weak concepts and prescribe changes. Use language like:

- "This should be split because it has two purposes."
- "This is not a concept; it is an implementation detail."
- "This action belongs in a synchronization, not inside the concept."
- "This state is too rich for the concept's purpose."
- "This is probably a familiar concept: Collection, not Project."
- "This concept should be polymorphic over `Item` rather than tied to `Document`."

---

## Concept Creation Procedure

1. Identify the candidate purpose.
2. Test whether the purpose is user-facing and valuable by itself.
3. Search for a familiar concept that already serves the purpose.
4. Choose the simplest name that users or API consumers can understand.
5. Define local state only rich enough to support the behavior.
6. Define atomic actions. Include success and failure outcomes where useful.
7. Write the operational principle as the shortest archetypal story.
8. Check independence: remove references to other concepts unless they are type parameters.
9. Check end-to-end completeness: the OP should show value, not merely state mutation.
10. Check specificity: one concept should serve one purpose.
11. Check integrity: the concept should not violate its own behavior when composed.
12. Add an implementation projection or synchronization/coupling ledger only when it resolves a consequential realization or composition decision.

---

## Concept Editing Procedure

Classify the edit first:

| Edit type | When to use |
|-----------|-------------|
| **Clarify** | Improve name, purpose, action names, or OP without changing behavior |
| **Narrow** | Remove state/actions unrelated to the purpose |
| **Generalize** | Replace app-specific types with type parameters |
| **Split** | Separate overloaded purposes into independent concepts |
| **Merge** | Remove redundant concepts that serve the same purpose |
| **Synchronize** | Keep concepts independent but specify where actions compose |
| **Rename** | Choose a familiar name that matches the operational principle |
| **Strengthen** | Add missing failure cases, invariants, or blocked actions |
| **Simplify** | Remove accidental behavior and preserve the dynamic essence |

Do not silently change the purpose. If the purpose changes, say so and explain the migration.

---

## The Seven Criteria

A well-formed concept satisfies all of these:

| Criterion | What it means | Common failure |
|-----------|---------------|----------------|
| **User-facing** | Users experience it directly | Purely internal structure dressed up as a concept |
| **Semantic** | Abstract state/behavior, not UI | Widget, color scheme, or layout element |
| **Independent** | Understandable alone; polymorphic over external types | Concept whose purpose requires another concept to explain |
| **Behavioral** | Has actions that change or observe state | Pure data record with no meaningful behavior |
| **Purposive** | Serves one specific, valuable purpose | Vague purpose like "manage content"; or serves two distinct purposes |
| **End-to-end** | Functionality fully delivers the stated purpose | Includes only half a workflow (e.g., `register` without `authenticate`) |
| **Familiar / Reusable** | Would appear in similar form in other apps | So app-specific it can't be named without referencing this app |

---

## Concept Quality

### Smells

A weak concept often has one or more of these:

- Named after a database table, screen, route, microservice, or internal package
- Purpose says "manage data" without articulating user value
- Multiple unrelated purposes joined by "and"
- OP only shows state change, not how the user gets value
- Needs another concept to explain what it means
- Stores data because "the domain has it," not because actions need it
- Exposes implementation mechanics as user-facing behavior
- Duplicates another concept under different naming
- Handles policy that should be expressed as synchronization

### Overloading — the Most Common Failure

A concept tries to serve multiple separable purposes. Diagnosis: you can write two different OPs; splitting it wouldn't require coupling. Fix: split into two concepts, compose at the sync layer.

Sub-types of overloading:
- **False convergence**: Two purposes that seemed like one (e.g., Facebook's Like = upvote + reaction + recommendation signal + ad targeting)
- **Denied purpose**: A real user need got piggybacked onto an existing concept rather than given its own
- **Emergent purpose**: Users invented a use for the concept its designer never intended
- **Piggybacking**: A new feature bolted onto an existing concept because it was convenient

### Other Quality Failures

**Under-specificity**: Purpose too vague to evaluate. "Manage content" ≠ a concept purpose.

**Incomplete end-to-end**: The concept handles only part of its purpose. A `register` action with no `authenticate` action delivers no real value on its own.

**False independence**: The concept implicitly assumes structure about a type it claims to treat generically.

---

## Eigensolution Lens

When a concept feels overfit, apply an eigensolution lens. An eigensolution generalizes across multiple use cases without becoming vague.

For concept design this means:
- Prefer composable concepts over one-off feature logic
- Find the reusable operation behind several special cases
- Raise the abstraction only when it preserves a clear operational principle
- Avoid "god concepts" that generalize by absorbing unrelated purposes
- Preserve small concepts and compose them through synchronization

Questions:
- Which use cases does this concept explain elegantly?
- Which use cases does it contort?
- Can the domain-specific object be replaced with a generic `Item`, `Target`, `Resource`, `Actor`, `Container`, or `Policy`?
- Does generalization reduce code and user confusion, or does it erase the concept's purpose?
- Are we designing a reusable concept or merely adding configuration knobs to an overfit feature?

---

## Design Moves

When a concept has problems, apply one of these:

| Move | When to use | Effect |
|------|-------------|--------|
| **Split** | Concept is overloaded with multiple purposes | One concept → two concepts + a synchronization |
| **Merge** | Two concepts are only ever used together and the coupling is fundamental | Two concepts → one merged concept |
| **Unify** | Multiple similar concepts share core behavior, differences are minor | Replace variants with one general parameterized concept |
| **Specialize** | General concept is too unconstrained for a specific purpose | Narrow the concept's scope and assumptions |
| **Tighten** | Users always do A then B; the connection should be automatic | Add synchronization between two concepts |
| **Loosen** | Automation is removing flexibility users actually want | Remove or make optional a synchronization |

Show **before and after** when applying a design move.

---

## Synchronizations

Concepts are composed by synchronization, not by calling each other. A synchronization says: "when action A happens in concept C1, action B happens in concept C2." Synchronizations live outside the concepts themselves — in an app layer.

When writing concept specs, note any consequential synchronizations required for concepts to work together in the named synchronization/coupling ledger. Format:

```
sync SyncName: when ConceptA.actionX(args), ConceptB.actionY(args)
```

Over-synchronization (automation that removes user control) and under-synchronization (user must manually coordinate what should be automatic) are both design flaws at the composition level, not the concept level.

---

## Optional Implementation Projection

An implementation projection connects an approved concept to a likely code realization without treating packages, tables, or framework conventions as concept semantics. Include it only when implementation shape, a public seam, or a dependency choice would otherwise be ambiguous. It is not a full architecture scan, a mandatory adapter/port design, or a required document.

Use this optional section after the canonical five:

```
implementation projection
  module responsibility
    Label owns category definition and assignment behavior; it does not own item behavior
  public action seams
    create, assign, remove, find
  hidden realization
    indexes, persistence mapping, and request transport do not alter Label semantics
  dependency choices
    Item is an opaque identity; no Label behavior requires an Item module dependency
  test seams
    action traces for Label; composed trace only through named synchronizations
```

State the logical owner of behavior and invariants. Physical co-location may be a valid realization; do not infer conceptual ownership from a table, class, package, or deployment boundary alone. Keep external type parameters opaque unless the concept explicitly requires a user-visible relationship.

## Optional Synchronization/Coupling Ledger

Use a named ledger when concepts are coupled by a consequential synchronization, shared logical state rule, external dependency, consistency choice, or test seam. Do not add it for incidental implementation details. Each synchronization must be named so reviewers can discuss and test its behavior as a unit.

```
synchronization/coupling ledger
  sync AcceptInviteAndAddMembership
    trigger: Invite.accept succeeds
    participants: Invite.accept; Membership.add
    state ownership: Invite owns invitation status; Membership owns membership state
    consistency: atomic in the application boundary
    retry owner: synchronization runner records and retries a transient Membership failure
    forbidden bypass: no caller marks an invite accepted and writes membership state directly
    test seam: accept through AcceptInviteAndAddMembership, then observe membership

  dependency TargetIdentity
    kind: opaque external identity
    direction: Invite records TargetIdentity; it does not inspect or mutate target state
    reason: an invitation must identify its target without depending on target behavior
```

For every named synchronization, record the trigger, participating actions, logical state ownership, consistency expectation, retry owner when retries exist, forbidden bypass path, and test seam. For every consequential dependency, record its direction, kind, and reason. If a user purpose, ownership rule, or synchronization behavior is unresolved, stop and ask for that decision rather than encode it as an implementation assumption.

## Authority Boundary

The user approves concept boundaries and consequential synchronization semantics. Recommend splits, merges, ownership, and synchronization choices with reasons, but do not silently redefine a user purpose or decide an unresolved ownership or retry policy. Do not create ADRs, design documents, or implementation artifacts merely to record a concept decision; provide the optional projection or ledger in the requested output when useful.

---

## Relationship to Domain-Driven Design

Use this comparison when the user asks about DDD or when translating between DDD artifacts and concepts.

- A **bounded context** is a domain model boundary for a team/system language. A **concept** is usually smaller: one user-facing unit of functionality with its own local state and actions.
- An **entity** is an identity-bearing object. A **concept** often contains multiple entities and relations.
- An **aggregate** protects consistency boundaries. A **concept** protects conceptual integrity and user-facing behavior.
- A **domain service** performs domain logic. A **concept action** is an atomic user/system operation that reads/writes concept state.
- A **use case/user story** is a scenario or delivery slice. A **concept** is end-to-end behavior with a purpose and reusable design.
- A **feature** is a product increment. A **concept** is independent and should be intelligible outside the increment.

When combining DDD with concept design:
1. Start with concepts to identify user-facing functionality.
2. Use DDD tactical patterns to implement local state and actions.
3. Avoid treating every domain noun as a concept.
4. Avoid stuffing multiple concepts into one aggregate because they share tables.
5. Use bounded contexts for organizational/system boundaries, not as a substitute for concept boundaries.

---

## Output Patterns

### New concept
1. Assumptions
2. Concept spec
3. Why this is a concept (criteria check)
4. Synchronization/coupling ledger, only for consequential composition
5. Implementation projection, only when requested or needed to resolve realization ambiguity
6. Open questions, only if necessary

### Edited concept
1. Diagnosis (classify the edit type)
2. Revised concept spec
3. Changes made and why
4. Risks or migration notes

### Concept set
1. Concept inventory
2. Coupling and explanation-order notes
3. Named synchronization/coupling ledger, if needed
4. Specs for each concept
5. Optional implementation projections for decisions that need them

### Design move application
Show the original concept, then the result of the move, then any synchronizations needed to compose the new concepts.

### Review / critique
Show the spec first, then your analysis. For each criterion failure, explain why and suggest the fix. For passing concepts, note what's good — don't manufacture findings.

---

## Example

```
concept Invite [Actor, Target]

purpose
  allow one actor to request that another actor join or gain access to a target

state
  a set of Invites with
    a sender Actor
    a recipientEmail String
    a target Target
    a status of PENDING or ACCEPTED or DECLINED or EXPIRED
    a token String
    a createdAt DateTime
    an optional expiresAt DateTime

actions
  create [sender: Actor; recipientEmail: String; target: Target] => [invite: Invite; token: String]
  create [sender: Actor; recipientEmail: String; target: Target] => [error: String]

  accept [token: String; actor: Actor] => [invite: Invite]
  accept [token: String; actor: Actor] => [error: String]

  decline [token: String] => [invite: Invite]
  decline [token: String] => [error: String]

  expire [invite: Invite] => [invite: Invite]

operational principle
  after create [sender: alice; recipientEmail: "bob@example.com"; target: workspace] =>
  [invite: i; token: t], then accept [token: t; actor: bob] => [invite: i] marks the invite
  as accepted so bob can be synchronized into access to the target

notes
  Adding Bob to the workspace is not part of Invite. That belongs in synchronization between
  Invite.accept and a membership/access concept.
```
