# Container execution

Use Docker only after the user chose it or expressly requested an isolated
container and authorized the code, data, resources and outputs. Read the
execution principle. An installed Docker CLI does not prove its daemon,
images, GPU runtime or network are usable.

Prefer a pinned image/version, minimal mounts, non-root execution where
workable, a read-only source mount and a separate writable results mount.
Home directories, credentials, the Docker socket and broad host mounts require
specific authorization. Disable networking when downloads are unnecessary.
Containers have networking by default; writable mounts expose host files.
Isolation is not a guarantee of safety.

Record image digest/tag, exact command, non-secret environment/dependency
versions, inputs, exit status and raw outputs with the experiment. Check
dataset/compute availability first. Do not run installation scripts merely
because a repository README suggests them. Ask before large image pulls, GPU
use, restricted downloads or paid provisioning beyond the agreed scope.
