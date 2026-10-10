# Technical writing

Use this reference when writing or editing technical explanations, procedures,
reports, PR descriptions, or agent-consumed documentation. The existing skill
still owns the document's purpose and format. This is shared guidance, not a
new skill or publication workflow.

## Choose the reader's task

Give a document a clear primary purpose. For guides and documentation, distinguish:

- **Tutorial:** help the learner build something through concrete steps and early,
  visible results. State what they will make and what they should see.
- **How-to:** solve a working reader's specific problem. State prerequisites,
  actions, expected outcomes, and relevant forks; link supporting background.
- **Reference:** organize facts, options, limits, and errors for lookup. Mirror
  the thing being described and keep authoritative identifiers exact.
- **Explanation:** answer a bounded why question with context, evidence, decisions,
  and tradeoffs. Separate observed facts from inference and opinion.

Split and link supporting detail when it distracts from the primary job. This
is a guide to structure, not a ban on useful mixed sections. PRs retain their
review briefing; pitches, research reports, papers, and agent instructions retain
their existing specialized formats.

## Write instructions readers can follow

- Name the actor and action. Use direct commands for steps and plain statements
  for facts. Active voice usually makes responsibility clear; passive voice is
  useful when the actor truly does not matter.
- Put a prerequisite, condition, or warning before the step it guards. Describe
  what the reader should observe, not merely which operation to run.
- Keep one actionable instruction per sentence when combining actions could
  obscure their order or condition. Number sequences; use bullets for peers.
- Put the common path first and exceptions beside the affected action. Make
  commands, working directories, paths, flags, and expected results concrete.
- Link supporting evidence or reference by a descriptive label. Avoid vague
  pointers such as "see above" when the destination matters.

## Make meanings unambiguous

Keep modifiers such as "only" and "not" next to what they qualify. Give pronouns
one obvious referent; repeat the noun when needed. Break long noun chains apart
and make it clear which items "and" or "or" joins. Retain small words that carry
structure rather than cutting them to meet an arbitrary word count.

Use the codebase's actual symbols, filenames, flags, and commands. Use one term
for one thing and the project's existing domain vocabulary. Define a necessary
new term once; do not rename the same mechanism for stylistic variety.

## Edit without flattening the voice

Cut filler and prefer short, ordinary words when they preserve precision. Vary
sentence length: keep a longer sentence when it carries one condition and its
consequence clearly. A useful qualification is not filler. Preserve justified
uncertainty, limitations, source citations, and numerical evidence.

No universal word-count, punctuation, passive-voice, or grammatical bans. Follow
the language and repository's formatting in code examples. `humanizer` remains
the owner for an explicitly needed prose-cleanup pass; do not duplicate its
catalogue here. Product UI and marketing copy keep their specialist guidance.

For brief PRs and handoffs, link long logs and detailed artifacts rather than
pasting them into the briefing. For procedures, keep enough expected output on
the page for the reader to recognize success or a blocked prerequisite.

Adapted from pstack's technical-writing guidance at revision
`3a604672c46cd8187d2b19980eae0a34f9f91138`, with specialized formats and
scientific uncertainty preserved. See [the upstream license](PSTACK-LICENSE)
and [the integration manifest](../pstack-integration/manifest.json).
