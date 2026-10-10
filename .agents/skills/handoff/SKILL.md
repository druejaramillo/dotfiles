---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
disable-model-invocation: true
---

# Handoff

Write a handoff so a fresh agent can continue the work. Save it in the
user's OS temporary directory, not the current workspace. If the user passed
arguments, use them to focus the next session. Use a durable location instead
only when explicitly agreed for the task.

Read the shared [technical-writing reference](../../references/technical-writing.md)
when writing resume instructions and artifact pointers. Make the first resume
action concrete, and distinguish verified results from pending or blocked work.

For a coding handoff, include the project path and current branch/head when
relevant, authoritative spec/plan pointers, exact proof paths and their freshness,
owned processes/resources and their known state, and remaining approvals or stop
limits. Do not commit WIP, cancel processes, or publish as a handoff side effect.
Record enough state for the next agent without repeating existing documents.

Include a "suggested skills" section naming relevant installed skills. In
Pi, explicitly invoke one with `/skill:<name>`; otherwise give the next agent
the skill name and path. Do not refer to an unavailable Skill tool.

Do not duplicate material already captured in specs, plans, ADRs, issues,
commits, or diffs. Point to those artifacts by path or URL. Redact secrets,
passwords, API keys, and personally identifiable information.
