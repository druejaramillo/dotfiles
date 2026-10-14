---
name: portfolio-email-drafting
description: Read client portfolio and offering materials, write a client-specific email describing each offering and comparing portfolio options, and save a HEY draft with requested attachments. This workflow is strictly draft-only; never send email.
---

# Portfolio email drafting

Prepare a clear, source-grounded client email and save it as a HEY draft with the requested files attached. **This workflow is strictly draft-only. Never send or deliver the email, even if the user says “send,” “I need to send,” or “it’s ready.”** If the user asks for sending, prepare the draft and clearly state that it remains unsent for the user to review and send themselves. The client chooses the final portfolio architecture; the email presents possibilities, not a recommendation.

## Workflow

1. **Confirm the envelope and files.** Identify the client’s name and email, CCs, requested sender, portfolio/reference documents, and which files should be attached. Treat the documents to summarize and the files to attach as separate lists. Do not attach every reference file automatically; attach only what the user requests or clearly identifies as client-facing material.

2. **Read the source materials.** Extract each portfolio’s allocations, asset classes, property/program counts, modeled debt, and relevant projected cash/total return figures. Read each individual offering summary, not just the consolidated portfolio page. Use the supplied portfolio PDFs as the primary source for what each proposed allocation contains. If material is unclear or text extraction is unreliable, inspect the relevant page visually or report the uncertainty rather than filling gaps. A video supplied only as an attachment need not be summarized.

3. **Draft one paragraph per offering.** Use the client’s preferred structure: a friendly opening, a clear statement that these are possibilities and the client has the final choice of architecture, then each offering as its own short paragraph under a bold offering name. Write **3–5 sentences per offering**. Describe the property or asset, location, tenant/operator or revenue source, and a material lease, financing, or operating feature when the source supports it. Include an allocation amount only when it helps explain the proposed mix. Keep descriptions factual and distinguish sourced facts from projections.

4. **Compare the portfolios separately.** In a concise paragraph, contrast the asset-class mix, diversification/property count, client-level debt or leverage, and projected returns when those figures are available. Name the measure and period precisely (for example, projected five-year average total return versus projected Year 1 cash return). Describe returns as sponsor/model projections, not expected or guaranteed outcomes. Do not repeat all of the offering descriptions in the comparison.

5. **Use the client’s tone.** Prefer the style of the sent “Sample Personal Optimized Property Portfolios” email: personable and direct (“Hi [name]”), plain-language explanations, clear portfolio headings, brief qualification of the proposals, and a respectful close inviting questions. The sent email’s opening gives the client freedom to combine these or other platform offerings. A concise closing such as “We can use these as a starting point and adjust the mix to fit your preferences” is appropriate. Use the sender’s name/sign-off as supplied or known; do not invent a credential or title.

6. **Qualify investment claims.** Identify financial metrics as projections and include the applicable PPM/risks caveat. Never invent or extrapolate performance, appreciation, tax treatment, liquidity, guarantees, regulatory requirements, or historical results. The sent email included client-specific claims about historical appreciation and regulatory limits; do not reuse those claims by default. Include capital-appreciation or historical-performance statements only when they are supported by approved source material and the user wants them included. Do not present the email as individualized investment advice.

7. **Draft only—hard stop before delivery.** Save the email as a HEY draft using `hey compose --draft`. Never compose without `--draft`, run `hey draft send`, or otherwise send, deliver, or schedule the email. This rule does not change when the user says “send,” “I need to send,” “go ahead,” or “it’s ready”; those requests authorize preparing the draft only within this skill. Use the requested To/CC and sender. Attach the requested individual portfolio PDFs and narration/media file; include a consolidated reference PDF only when requested. Keep dollar signs literal in shell commands: use a single-quoted heredoc (for example, `$(cat <<'BODY' ... BODY)`) or another quoting method that prevents Bash variable expansion. Never put a body containing `$` inside double quotes without escaping the dollars.

8. **Protect attachments during draft edits.** Check `hey compose --help` and `hey draft edit --help` in the current environment instead of assuming flags. In the HEY CLI used for the reference email, `compose --from` was unavailable and `draft edit` had no attachment flag. A later body edit caused the draft’s attachments to disappear, and the CLI could not add them back to an existing draft. Therefore finalize the body before composing; create the draft with `hey compose --draft` and all attachments in one action; avoid subsequent draft edits. If the requested sender cannot be selected during compose, use a supported sender-selection route only if it can be verified not to drop attachments, then inspect the resulting draft in HEY before reporting completion. If no safe route is available, stop and explain the limitation rather than claiming the draft is complete. If an attached draft must be revised, do not silently replace it: explain that the CLI cannot preserve/add attachments through draft editing and ask before creating a replacement draft or directing the user to edit it in HEY.

9. **Verify completion.** Confirm HEY reports that the draft was saved with the expected attachment count. Read the draft back to verify sender, subject, To/CC, and body. Since `hey draft show` may not expose draft attachments, use the compose result and, when available, the HEY UI to verify them. State clearly that the email remains a draft and was not sent.

## Email structure

- Greeting and brief context.
- State that the offerings are proposed possibilities and the client controls the final architecture, including combinations with other platform offerings.
- A separate 3–5 sentence paragraph for every offering, with a bold offering name.
- A distinct portfolio-comparison section covering key differences and sourced projected metrics.
- A short PPM/projection caveat and an invitation to discuss or adjust the mix.
- Respectful sign-off.
