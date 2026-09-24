---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

# Grilling

Interview the user until you share a clear understanding. Treat the plan as
a **design tree**: each decision branches into decisions that depend on it.

Work in **rounds**. The **frontier** is the set of questions whose prerequisites
are settled. Ask the whole frontier in one round, numbering each question and
offering a recommended answer. Wait for the user's answers before the next
round. For example:

```text
❓ Q1 — <question>: <choices and context>
➡️ Recommendation: <answer and reason>

---

❓ Q2 — <independent question>: <choices and context>
➡️ Recommendation: <answer and reason>
```

An answer reshapes the tree. Recompute the frontier after each round. A question
that depends on an unanswered question belongs in a **later** round, not the
same one.

Finding facts is your job, not the user's. Investigate facts available in the
filesystem, tools, code, or reliable sources instead of asking the user.
Delegate independent research only when an agent runner is available and
its use is authorized; otherwise investigate directly. While exploring an
unsettled prerequisite, you may ask other independent frontier questions.

Decisions belong to the user. Present them and wait rather than silently
choosing. Finish when no unresolved branch remains, then confirm that your
understanding matches the user's before taking action on the plan.
