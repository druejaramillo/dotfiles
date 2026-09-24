---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
disable-model-invocation: true
---

# Handoff

Write a handoff so a fresh agent can continue the work. Save it in the
user's OS temporary directory, not the current workspace. If the user passed
arguments, use them to focus the next session.

Include a "suggested skills" section naming relevant installed skills. In
Pi, explicitly invoke one with `/skill:<name>`; otherwise give the next agent
the skill name and path. Do not refer to an unavailable Skill tool.

Do not duplicate material already captured in specs, plans, ADRs, issues,
commits, or diffs. Point to those artifacts by path or URL. Redact secrets,
passwords, API keys, and personally identifiable information.
