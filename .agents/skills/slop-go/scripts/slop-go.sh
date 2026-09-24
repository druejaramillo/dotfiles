#!/usr/bin/env bash
# Run the bundled, read-only Go analyzer from any project directory.
set -euo pipefail
project_root="$PWD"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$script_dir"
exec go run . -root "$project_root" "$@"
