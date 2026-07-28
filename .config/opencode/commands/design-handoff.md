---
description: Create a verified, redacted handoff for the next design or implementation session.
agent: design-orchestrator
---

Run the handoff phase for `$ARGUMENTS`. Load the `handoff` skill and follow its
workflow exactly. Treat the argument as the user-selected next objective; ask
only for any missing decision, blocker, canonical artifact, or non-default save
location needed for a useful handoff.

Inspect the stated working tree, canonical artifacts, and reported verification
commands. Distinguish verified facts from reported claims, redact sensitive
values, write the standalone handoff to the resolved OS temporary directory by
agent, publish the handoff, or start the next objective.
