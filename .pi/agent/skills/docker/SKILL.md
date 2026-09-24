---
name: docker
description: Use Docker as an explicitly chosen execution environment for replication, experiments, or benchmarks; not for routine research or unapproved code execution.
---
# Docker Research Execution

Only use Docker after the user has selected it (or expressly asked for an isolated container) and agreed on the code, data, resource budget, and output location. Verify `docker` is available and usable; an installed CLI is not proof the daemon, images, GPU runtime, or network are available.

Prefer a pinned image/version, minimal mounts, non-root execution when workable, and a read-only source mount with a separate writable results mount. Do not mount home directories, credentials, Docker socket, or the entire host unless explicitly required and approved. Disable the network if no download is needed; containers have networking by default and mounting the workspace writable exposes it to changes. Clarify that Docker is isolation, not a guarantee of safety.

Record the image digest/tag, exact command, environment (without secrets), package versions, inputs, exit status, and raw outputs in the experiment artifact. Check dataset and compute availability before launching expensive jobs. Never run a paper's installation script simply because its README suggests it. Stop and ask before pulling large images, using GPUs, downloading restricted data, or provisioning paid resources.
