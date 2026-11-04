# Concept integrity during implementation

Read this when implementing or refactoring an approved concept spec or a Shape
Up pitch that names concepts or synchronizations. This is a behavioral
constraint, not a prescribed architecture or delivery process.

- Keep the approved purpose, action outcomes, operational principle, and
  invariants intact. If a time-box cut breaks the concept's purpose, narrow
  the release's use case or defer a whole piece of behavior. Ask before
  changing the concept contract.
- Give logical state and invariants clear owners. Route mutations through the
  owner's action seam. Shared tables, transactions, modules, or processes are
  fine when ownership and authorized writers remain clear.
- Treat external type parameters as opaque identities unless the approved
  concept explicitly depends on their behavior. The notation does not
  require a package per concept or a repository interface per table.
- Keep cross-concept behavior at a named synchronization or existing
  application boundary. Preserve its approved trigger, participating actions,
  consistency, retry owner (if any), and forbidden bypass. Ask the user about
  consequential behavior that remains undecided.
- Verify user-visible behavior through concept actions and composed behavior
  through the named synchronization seam. Derive a central test from the
  operational principle; test blocked outcomes and important invariants where
  they matter.
- Follow the codebase's architecture and the builders' judgment for choices
  the approved behavior does not constrain. Avoid speculative abstractions
  and implementing future actions merely because they appear in a broader
  concept spec.

The approved concept specs and pitch are authoritative for their respective
purposes. If they disagree, surface the conflict before encoding either
interpretation in code.
