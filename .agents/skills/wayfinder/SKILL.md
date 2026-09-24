---
name: wayfinder
description: Plan a large, uncertain effort as a shared map of decision tickets in an approved issue tracker or local Markdown directory. Use when work spans sessions and the route to the destination is not yet clear.
disable-model-invocation: true
---

# Wayfinder

A loose idea has arrived, too big for one agent session, and wrapped in fog: the way from here to the **destination** isn't visible yet. Wayfinding is about finding that way, not charging at the destination. This skill charts the way as a **shared map** in the approved tracker or local Markdown directory, then works its **decision tickets** (questions whose resolution is a decision, not slices of a build to execute) one at a time until the route is clear.

The destination varies per effort, and naming it is the first act of charting: it shapes every ticket. It might be a spec to hand off and iterate on, a decision to lock before planning starts, or a change made in place like a data-structure migration. The map is domain-agnostic: engineering work, course content, whatever fits the shape.

## Plan, don't do

Wayfinder is **planning** by default: each ticket resolves a decision, and the map is done when the way is clear, with nothing left to decide before someone goes and does the thing. The pull to just do the work is usually the signal you've reached the edge of the map and it's time to hand off. An effort can override this in its **Notes**, carrying execution into the map itself, but absent that, produce decisions, not deliverables.

## Refer by name

Every map and ticket has a **name**: its title, whether it is an issue or a local file. In everything the human reads (narration, the map's Decisions-so-far), refer to it by that name, never by a bare id, number, or slug. A wall of `#42, #43, #44` is illegible; names read at a glance. The id and URL don't vanish; a name wraps its link, but they ride _inside_ the name, never stand in for it.

## The Map

The map is one canonical artifact: an issue labelled `wayfinder:map` on the chosen tracker, or a local Markdown map if the user chooses files. Its tickets are linked child issues or separate linked Markdown files.

The map is an **index**, not a store. It lists the decisions made and points at the tickets that hold their detail; a decision lives in exactly one place, its ticket, so the map never restates it, only gists it and links.

**Where maps, tickets, blocking, and frontier queries live is tracker-specific.** Read an existing `docs/agents/issue-tracker.md` if available. Otherwise inspect the repo's existing conventions and ask whether to use its tracker or local Markdown before writing anything. For local files, use a user-approved directory with `MAP.md` and one `tickets/<slug>.md` per decision. Link tickets from the map; record blockers as titles/relative paths and claim/status in each ticket. Do not require an uninstalled setup skill.

### The map body

The whole map at low resolution, loaded once per session. Open tickets are **not** listed in the map body: find them by a child-issue query or in the local `tickets/` directory.

```markdown
## Destination

<what reaching the end of this map looks like: the spec, decision, or change this effort is finding its way to. One or two lines; every session orients to it before choosing a ticket.>

## Notes

<domain; skills every session should consult; standing preferences for this effort>

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

- [<closed ticket title>](link): <one-line gist of the answer>

## Not yet specified

<!-- see "Fog of war": in-scope fog you can't ticket yet; graduates as the frontier advances -->

## Out of scope

<!-- see "Out of scope": work ruled beyond the destination; closed, never graduates -->
```

### Tickets

Each ticket is a **child issue** of the map, or a separate linked Markdown file in local mode. Its body is a question sized for one agent session:

```markdown
## Question

<the decision or investigation this ticket resolves>
```

Each ticket carries a `wayfinder:<type>` label (or a `Type:` field in local files), one of `research`, `prototype`, `grilling`, `task` (see [Ticket Types](#ticket-types)).

A session **claims** a ticket before any work: assign it to the dev on a tracker, or set a named claim/status in its local file after checking that no other session has claimed it. Do not treat a local file as concurrency-safe without an explicit coordination agreement.

Use native dependency relationships when the approved tracker supports them. Otherwise record explicit `Blocked by` links in ticket bodies, including in local Markdown. A ticket is **unblocked** when every ticket blocking it is closed; the **frontier** is the open, unblocked, unclaimed children, the edge of the known.

The answer isn't part of the body; it's recorded on resolution (see [Work through the map](#work-through-the-map)). Assets created while resolving a ticket are linked from that ticket, not pasted in.

## Ticket Types

Every ticket is either **HITL** (human in the loop, worked _with_ a human who speaks for themselves) or **AFK**, driven by the agent alone. A HITL ticket only resolves through that live exchange; the agent never stands in for the human's side of it (a grilling agent that answers its own questions has broken this).

- **Research** (AFK): Read primary documentation, third-party APIs, or local sources to establish facts a decision needs. Research directly; delegate only when the user asks for subagents and a runner is available. Do not invoke a `research` skill that is not installed.
- **Prototype** (HITL): Raise the fidelity of the discussion by making a cheap, rough, concrete artifact to react to (an outline, a rough take, a stub, or UI/logic code). Read the installed `prototype` skill when building a UI/logic prototype. Links the prototype as an asset. Use when "how should it look" or "how should it behave" is the key question.
- **Grilling** (HITL): Conversation. The default case. Read the installed `grilling` and `domain-modeling` skills to guide interviewing and terminology, without assuming a Skill tool.
- **Task** (HITL or AFK): Manual work that must happen before a _decision_ can be made: nothing to decide, prototype, or research, but the discussion is blocked until it's done. Signing up for a service so its API can be judged, provisioning access, moving data so its shape can be seen. This is the one type that _does_ rather than decides, and it earns its place by unblocking a decision, not by delivering the destination. The agent drives it alone where it can (AFK); otherwise it hands the human a precise checklist (HITL). Resolved when the work is done; the answer records what was done and any resulting facts (credentials location, new URLs, row counts) later tickets depend on.

## Fog of war

The map is _deliberately_ incomplete: don't chart what you can't yet see. Beyond the live tickets lies the **fog of war**: the dim view of decisions and investigations you can tell are coming but can't yet pin down, because they hang on questions still open. Resolving a ticket clears the fog ahead of it, graduating whatever's now specifiable into fresh tickets, one at a time, until the way to the destination is clear and no tickets remain.

The map's **Not yet specified** section is where that dim view is written down: the suspected question, the area to revisit later. It's the undiscovered frontier _toward_ the destination: everything here is in scope, just not sharp enough to ticket. Write as loosely or as fully as the view allows; it doubles as a signpost for collaborators reading where the effort is headed.

**Fog or ticket?** The test is whether you can state the question precisely now, _not_ whether you can answer it now.

- **Ticket when** the question is already sharp, even if it's blocked and you can't act on it yet.
- **Not yet specified when** you can't yet phrase it that sharply. Don't pre-slice the fog into ticket-sized pieces: it's coarser than a ticket, and one patch may graduate into several tickets, or none, once the frontier reaches it.

**Not yet specified** excludes what's already decided (Decisions so far), what's already a live ticket, and what's out of scope (the next section).

## Out of scope

Fog only ever gathers _toward_ the destination. The destination fixes the scope, so work beyond it is **out of scope**: it isn't fog, and it doesn't belong in **Not yet specified**. It gets its own **Out of scope** section on the map: work you've consciously ruled out of _this_ effort. Scope, not sharpness, lands it here.

Out-of-scope work never graduates (the frontier stops at the destination), so it returns only if the destination is redrawn, and then as a fresh effort, not a resumption.

Ruling something out of scope is a scoping act, not a step on the route. When a ticket that already exists turns out to sit past the destination (mis-scoped in while charting, or exposed by a resolution), **close it** (or set `Status: closed` locally, removing it from the frontier) and leave one line in the **Out of scope** section: the gist plus why it's out of scope, linking the closed ticket. It stays out of **Decisions so far**, which records the route actually walked; a scope boundary isn't a step on it.

## Invocation

Two modes. Either way, **never resolve more than one ticket per session**, with the exception of research tickets.

### Chart the map

User invokes with a loose idea.

1. **Name the destination.** Read the installed `grilling` and `domain-modeling` skills and interview the user to pin down the spec, decision, or change this map is finding its way to. The destination fixes the scope, so settle it first.
2. **Map the frontier.** Grill again, **breadth-first** this time: fan out across the whole space rather than deep on any one thread, surfacing the open decisions and the first steps takeable now. **If this surfaces no fog** (the way to the destination is already clear, the whole journey small enough for one session), you don't need a map. Stop and ask the user how they'd like to proceed.
3. **Create the map** (use `wayfinder:map` on a tracker or `MAP.md` locally): fill in Destination and Notes, leave Decisions-so-far empty, and sketch the fog under **Not yet specified**. Confirm the proposed tracker changes or local path with the user before publishing.
4. **Create the tickets you can specify now** as child issues or linked local files. Wire blocking edges in a second pass after identifiers/paths exist. This sorts the frontier from blocked tickets; everything not yet specifiable stays in **Not yet specified**.
5. **Leave research tickets on the frontier.** Resolve them in a later session against cited primary sources. Delegate only if the user explicitly requests subagents and a runner is available; do not create branches or agents by default.
6. Stop: charting is one session's work; it hand-resolves nothing.

### Work through the map

User invokes with a map (URL or number). A ticket is **optional**: without one, you pick the next decision, not the user.

1. Load the **map**: the low-res view, not every ticket body.
2. Choose the ticket. If the user named one, use it. Otherwise take the first frontier ticket in order. **Claim it** before any work: assign it on the tracker or record the claimant in its local file.
3. Resolve it. **Zoom as needed**: fetch related ticket bodies on demand. Read installed skills named in `## Notes` when relevant. For unresolved human decisions, use `grilling`; for shared terminology, use `domain-modeling`.
4. Record the resolution: post the answer as a resolution comment and close the tracker issue, or append the answer to the local ticket and set `Status: closed`. Add a short pointer to the map's Decisions-so-far.
5. Add newly-surfaced tickets (create-then-wire); graduate any fog the answer has made specifiable, clearing each graduated patch from **Not yet specified** so it lives only as its new ticket. If the answer reveals that a ticket (this one or another) sits beyond the destination, **rule it out of scope** rather than resolving it on the route. If the decision invalidates other parts of the map, update or delete those tickets.

The user may run unblocked tickets in parallel. Recheck tracker or local-file state before claiming or changing one; local files require extra coordination against concurrent writes.
