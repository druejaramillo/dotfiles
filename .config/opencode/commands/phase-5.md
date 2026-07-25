---
description: Phase 5: perform and fully restore a disposable exploratory implementation, then gate its findings.
agent: phase-builder
---

Run only Phase 5, Exploratory Audit and Restore, for `$ARGUMENTS`, or infer the
approved work item from the current conversation. Read
`~/.config/opencode/WORKFLOW.md` and confirm Phases 1 through 4 are approved.

Refuse to start unless the Phase 4 checkpoint is committed and the worktree is
clean. Capture the baseline `HEAD` and status. Implement the full path only at
the mapped TODO sites, run the smallest useful validation, and create a concise
transient findings report. Request confirmation before restoring the exact
baseline and cleaning temporary spike files; verify status matches the captured
baseline afterwards. Do not retain spike code or tests.

Complete the shared adversarial review loop against the restored findings and
restoration evidence. Post a provisional tracker packet after confirmation when
attached. Open `plannotator annotate <findings-report> --gate`, wait for human
approval, record the approved findings in the tracker when applicable, and stop.
