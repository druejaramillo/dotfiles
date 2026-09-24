---
name: alpha-research
description: Search, identify, read, and cross-check academic papers using available scholarly and web sources; use for papers, authors, arXiv IDs, DOIs, or research claims.
---
# Scholarly Source Search

This adapts Feynman's alphaXiv-focused method to this Pi installation; **a skill does not install alphaXiv**. Neither `feynman` nor `alpha` is currently on PATH here. Check available tools before choosing a route; do not invoke absent commands.

- For known arXiv IDs or DOIs, locate the canonical arXiv, publisher, Crossref, OpenAlex, Semantic Scholar, PubMed, or Europe PMC record as appropriate. Record title, authors, year/version, stable ID, URL, and venue where known. Distinguish preprint and peer-reviewed versions.
- For discovery, search varied phrasings and date ranges using available `web_search`, scholarly tools, or reachable public database pages/APIs through `fetch_content`. Search paper titles/IDs explicitly to resolve ambiguous names. Citation count is context, not a measure of correctness.
- Fetch the abstract to triage, then actual HTML or PDF and methods/results for claims that matter. If full text is unavailable, label abstract-only evidence. Use `pdf-explore` when a conclusion spans figures, tables, or supplements.
- For a paper's code, verify the repo URL, license/version, and relevant paths before describing implementation. If a user asks to run that code, follow the replication workflow and obtain an environment choice first.
- Cite original paper URLs/identifiers, not just search snippets. Check that quoted results, year, author, and IDs match the exact paper; distinguish the source's result from your own inference.

If a compatible alphaXiv CLI or tool becomes available, prefer its documented interface for paper Q&A and annotations, then still cross-check consequential claims against the underlying paper. Do not require login to answer a question when public sources suffice.
