---
name: obsidian-cleanup
description: Clean up specified Obsidian Markdown note(s) into a citation-preserving, nested-outline study-note style. Use when the user asks to clean, reformat, normalize, or polish Obsidian notes, lecture notes, textbook transcriptions, or a vault note.
---

# Obsidian Cleanup

Apply this skill only to the note or notes the user explicitly names. If the
user has not specified a note, ask one short question for the note name or
path before reading or editing anything. Do not clean an entire vault merely
because it is available.

The target is a concise, logically nested study outline. Treat the existing
text as source material to restructure, not as prose to rewrite. Preserve its
meaning, mathematical notation, examples, and scholarly citations unless a
rule below says otherwise.

## Workflow

1. Confirm the target note or notes. If a name is ambiguous, ask the user to
   choose its path.
2. Read each target note in full before editing. Identify its headings,
   logical structure, definitions, display math, tables, figures, citations,
   callouts, source labels, and broken transcription fragments.
3. Make the smallest complete cleanup that applies every relevant rule below.
   Edit only the requested notes.
4. Review the edited Markdown for outline depth, table and math indentation,
   dangling prose, accidental content loss, and formatting that no longer
   renders as Markdown.
5. State which notes were cleaned and any content that required a judgment
   call. Do not claim that a note was fully cleaned if only part of it was
   requested or completed.

When a request specifies a range, clean only that range unless it would leave
an adjacent broken list, table, display, or sentence. In that case, make the
minimal adjacent change needed to preserve valid structure.

## Outline Structure

- Use headings for major conceptual divisions. Retain the source heading level
  when it expresses a real hierarchy, but remove textbook section-number
  prefixes.
- Make the body a nested Markdown outline, using literal tabs for each nesting
  level.
- Use a top-level bullet for each primary claim, definition, result, or
  example within a section.
- Use child bullets for support, qualifications, derivation steps, examples,
  and consequences. Nest again only when the child itself has supporting
  detail.
- Give every complete sentence or separate logical claim its own bullet.
- Rejoin extraction fragments that belong to one sentence or one idea before
  placing them in the outline. Do not create artificial bullets from source
  line wraps.
- Do not leave ordinary prose as a root-level paragraph, an unindented
  continuation, or a dangling sentence between bullets.
- Do not add blank lines between ordinary adjacent bullets. Keep one blank
  line after a heading. Tables have their own spacing rule below.

Example, convert a dense paragraph into logical hierarchy:

```md
Before

The sample space has eight points. Each point has probability 1/8. Therefore
the events are mutually independent.

After

- The sample space has eight points
	- Each point has probability $1/8$
	- Therefore, the events are mutually independent
```

Example, rejoin a broken transcription before outlining it:

```md
Before

- The job can be completed in
	$$
	2 \times 3 = 6
	$$
- ways, establishing the theorem

After

- The job can be completed in $$
	2 \times 3 = 6
	$$
	ways, establishing the theorem
```

Use judgment when a fragment is not grammatically continuous. If it starts a
new conclusion, make it a child bullet instead of joining it into the prior
sentence.

## Headings, Labels, And Lists

- Remove source-only numbering from headings while retaining the meaningful
  title and heading depth: `## 1.2.4 Enumerating Outcomes` becomes
  `## Enumerating Outcomes`.
- Remove serial numbers from source labels such as `Definition 1.2.16`,
  `Theorem 1.3.5`, and `Example 1.2.15`.
- Keep a concise semantic label when it helps orient the reader, such as
  `Definition`, `Lemma`, `Bayes' Theorem`, or `Summary of Independence`.
- Present theorem statements, examples, and proofs as ordinary outline items,
  not source-style blocks. Turn `Proof:` into the nested reasoning that proves
  the preceding statement.
- Use `-` for normal hierarchy.
- Use `1.`, `2.`, `3.` only for a genuinely enumerated set of conditions,
  axioms, cases, methods, or summary points.
- Convert lettered source lists such as `a.`, `b.`, and `c.` to numeric lists.
  Update every related reference from `(a)` to `(1)`, and so on.
- Replace source equation-number references with a meaningful reference to the
  equation's role or origin. Never leave a reference such as `(1.3.1)` or
  `Equation (2.1.2)` merely because it appeared in the source.

```md
Before

## 1.3 Conditional Probability

- Theorem 1.3.5 (Bayes' Rule) ...
	- a. First condition
	- b. Second condition
- From (1.3.1), we obtain the result

After

## Conditional Probability

- Bayes' Theorem
	1. First condition
	2. Second condition
- From the definition of conditional probability, we obtain the result
```

Use semantic references that make sense in context, for example: `from the
definition of conditional probability`, `using the third axiom`, `from the
preceding result`, or `from the last lemma`.

## Definitions, Prose, And Notation

- Bold a term when it is formally defined for the first time.
- Bold all newly introduced synonymous formal terms in that definition.
- Do not use bold for routine later mentions or generic emphasis.
- Remove periods ending prose bullets. Retain commas, colons, semicolons, and
  internal punctuation where they improve meaning.
- Do not alter source-specific mathematical notation. Keep a source's choice
  of `$P` versus `$\mathbb{P}$`, `$\cap$` versus juxtaposition, variable names,
  and notation conventions unless the source itself is internally inconsistent
  or clearly malformed.
- Correct obvious OCR and transcription errors only when the intended meaning
  is clear. If the intended content is uncertain, preserve it and flag it to
  the user instead of inventing a correction.

```md
Before

- An event is any collection of possible outcomes of an experiment.
- The union of A and B is the set of elements in either A or B.

After

- An **event** is any collection of possible outcomes of an experiment
- The **union** of $A$ and $B$ is the set of elements in either $A$ or $B$
```

Terminal punctuation inside a display equation is mathematical source content,
not prose-bullet punctuation. Do not mechanically remove it:

```md
- The probability is $$
	P(A) = \frac{|A|}{|\Omega|},
	$$
```

## Display Math

- Put the opening `$$` on the same bullet line as the prose that introduces
  the display. The display must visibly belong to that thought.
- Indent every display line, including the closing `$$`, one level beneath the
  owning bullet. If the owning bullet is nested, indent the display one level
  further.
- Keep a grammatical continuation after a display indented as part of its
  owning bullet. If the following text is a distinct sentence or idea, make it
  a child bullet at that indentation.
- Preserve the actual mathematical content and source-specific notation.
- Do not add equation numbers, labels, or tags.

```md
Before

- If $P(B) > 0$, the conditional probability is
$$
P(A \mid B) = \frac{P(A \cap B)}{P(B)}
$$

After

- If $P(B) > 0$, the **conditional probability** is $$
	P(A \mid B) = \frac{P(A \cap B)}{P(B)}
	$$
```

```md
Before

- The formula is
	$$
	F(x) = \sum_i p_i
	$$
and it applies for every $x$

After

- The formula is $$
	F(x) = \sum_i p_i
	$$
	and it applies for every $x$
```

## Tables

- Put a table under the bullet that introduces or explains it.
- Indent every table row to the parent bullet's content level.
- Leave one blank, correctly indented line immediately above and below the
  table.
- Do not leave a table flush-left between outline items.
- Preserve data and meaningful headers. Repair an obviously broken Markdown
  table only when its intended rows and columns are clear.

```md
- The test outcomes have the following probabilities:
	
	| Result | Disease | No disease |
	| --- | --- | --- |
	| Positive | .009 | .099 |
	| Negative | .001 | .891 |
	
	- A positive result alone does not imply a high probability of disease
```

## Citations, Figures, And Callouts

- Keep scholarly citations, author-year references, bracketed source
  references, bibliographic citations, and page references when they support
  the content.
- A citation may move with the sentence it supports, but do not delete it just
  because it is source-derived.
- Remove figures and their image Markdown, including remote Mathpix images.
- Remove a figure caption if it only names the figure. If a caption contains a
  substantive observation, convert that observation to a regular bullet and
  retain any scholarly citation it contains.
- Remove native Obsidian callouts, such as `> [!note]`, `> [!warning]`, or
  similar callout blocks. Convert important content in a callout into regular
  bullets at the appropriate logical depth; discard decorative or redundant
  callout text.
- Do not introduce new callouts, blockquotes, or figure captions.
- If an imported blockquote contains a substantive aside or quotation that
  must remain, rewrite it as a regular bullet. Preserve any citation within
  that bullet.

```md
Before

![](https://example.invalid/figure.png)
> *Figure 2.1. Distribution of the observations*

> [!note]
> The distribution is right-skewed [Smith 2024]

After

- The distribution is right-skewed [Smith 2024]
```

## Remove Source Artifacts

- Remove QED markers, including `$\square$`, `\blacksquare`, and standalone
  filled-square characters.
- Remove source-only equation numbering, chapter-section references, and
  exercise references when they are used only as navigation markers. Rewrite
  an explanatory reference semantically if it contributes to the content.
- Remove source-only figure references after removing the associated figure.
  Reword the sentence so it stands on its own.
- Do not remove a named theorem, author attribution, historical note, or
  scholarly citation merely because it originated in the source.

```md
Before

- By Equation (1.5.4), the geometric series gives the result.
	- $\square$

After

- By the geometric-series formula, we obtain the result
```

## Final Review Checklist

Before finishing, verify that the requested note has:

- no remaining source-only heading or theorem/example/definition serials
- no remaining source equation-number references or lettered sublists
- no prose-ending periods on outline bullets
- first-definition terms bolded without excess bolding
- displays attached to and indented beneath their parent bullets
- continuation text after displays correctly nested
- tables indented and surrounded by one blank line at their owning depth
- no figures, figure captions, native callouts, or QED markers
- scholarly citations retained
- source-specific notation preserved
- no accidental unbulleted prose, dangling fragments, or malformed list depth

If a cleanup rule and factual accuracy conflict, preserve factual accuracy and
tell the user what needs a decision.
