#!/bin/bash
# Exercise desktop setup functions with temporary homes and no network/system changes.
set -euo pipefail

SETUP_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/dev-setup.sh"
# Load the real functions without running the final main invocation.
# shellcheck disable=SC1090
source <(head -n -1 "$SETUP_SCRIPT")
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT

# Model Omarchy's add behavior: an existing empty directory is still a collision.
omarchy() {
  printf 'omarchy %s\n' "$*" >>"$COMMAND_LOG"
  case "$1 $2" in
  'plugin add')
    local id plugin_dir
    case "$3" in
    *basecamp/omarchy-hey-plugin*) id="37signals.hey" ;;
    *thisisgm/omarchy-pods*) id="io.github.thisisgm.omapods" ;;
    *t4t5/omarchy-caldir-widget*) id="org.ren.caldir" ;;
    *konradk/hass*) id="hass" ;;
    *jankeesvw/omarchy-time-machine*) id="jankeesvw.time-machine" ;;
    *) id="test.plugin" ;;
    esac
    plugin_dir="$HOME/.config/omarchy/plugins/$id"
    [[ ! -e "$plugin_dir" ]] || return 1
    mkdir -p "$plugin_dir"
    printf '{"id":"%s"}\n' "$id" >"$plugin_dir/manifest.json"
    if [[ "$id" == "io.github.thisisgm.omapods" ]]; then
      printf '#!/bin/bash\nprintf "omapods setup\\n" >>"$COMMAND_LOG"\n' >"$plugin_dir/setup"
    fi
    return "${PLUGIN_ADD_STATUS:-0}"
    ;;
  'plugin validate')
    [[ -f "$3/manifest.json" ]]
    ;;
  'pkg add') return 0 ;;
  *) return 1 ;;
  esac
}

omarchy-shell() { printf 'shell %s\n' "$*" >>"$COMMAND_LOG"; }
caldir() { printf 'caldir %s\n' "$*" >>"$COMMAND_LOG"; }
hey() { printf 'hey %s\n' "$*" >>"$COMMAND_LOG"; }

assert_log_contains() { grep -Fq -- "$1" "$COMMAND_LOG"; }

run_desktop_test() {
  local name="$1"
  shift
  (
    export HOME="$TEST_ROOT/$name"
    export COMMAND_LOG="$HOME/commands.log"
    mkdir -p "$HOME"
    : >"$COMMAND_LOG"
    OS="linux"
    SETUP_PROFILE="personal"
    "$@"
  )
  printf 'PASS %s\n' "$name"
}

test_empty_plugin_placeholder() {
  mkdir -p "$HOME/.config/omarchy/plugins/test.plugin"
  install_omarchy_plugin test.plugin https://example.invalid/test.git
  [[ -s "$HOME/.config/omarchy/plugins/test.plugin/manifest.json" ]]
  assert_log_contains 'omarchy plugin add https://example.invalid/test.git --yes'
  ! grep -q -- '--enable' "$COMMAND_LOG"
}

test_existing_plugin_is_preserved() {
  local plugin_dir="$HOME/.config/omarchy/plugins/test.plugin"
  mkdir -p "$plugin_dir"
  printf '{"id":"test.plugin"}\n' >"$plugin_dir/manifest.json"
  printf 'local edit\n' >"$plugin_dir/Panel.qml"
  install_omarchy_plugin test.plugin https://example.invalid/test.git
  grep -Fxq 'local edit' "$plugin_dir/Panel.qml"
  ! grep -q 'plugin add' "$COMMAND_LOG"
}

test_nonempty_plugin_is_not_deleted() {
  local plugin_dir="$HOME/.config/omarchy/plugins/test.plugin"
  mkdir -p "$plugin_dir"
  printf 'keep me\n' >"$plugin_dir/local.txt"
  if install_omarchy_plugin test.plugin https://example.invalid/test.git; then
    return 1
  fi
  grep -Fxq 'keep me' "$plugin_dir/local.txt"
  ! grep -q 'plugin add' "$COMMAND_LOG"
}

test_plugin_symlink_is_not_deleted() {
  mkdir -p "$HOME/elsewhere" "$HOME/.config/omarchy/plugins"
  ln -s "$HOME/elsewhere" "$HOME/.config/omarchy/plugins/test.plugin"
  if install_omarchy_plugin test.plugin https://example.invalid/test.git; then
    return 1
  fi
  [[ -L "$HOME/.config/omarchy/plugins/test.plugin" ]]
  [[ -d "$HOME/elsewhere" ]]
}

test_plugin_manifest_id_is_checked() {
  local plugin_dir="$HOME/.config/omarchy/plugins/test.plugin"
  mkdir -p "$plugin_dir"
  printf '{"id":"wrong.plugin"}\n' >"$plugin_dir/manifest.json"
  if install_omarchy_plugin test.plugin https://example.invalid/test.git; then
    return 1
  fi
}

test_headless_plugin_add() {
  # The real CLI returns failure if rescan IPC is unavailable after a valid install.
  PLUGIN_ADD_STATUS=1
  install_omarchy_plugin test.plugin https://example.invalid/test.git
  [[ -s "$HOME/.config/omarchy/plugins/test.plugin/manifest.json" ]]
}

test_all_configured_plugins() {
  local plugins_dir="$HOME/.config/omarchy/plugins"
  mkdir -p "$plugins_dir/drue.lock"
  printf '{"id":"drue.lock"}\n' >"$plugins_dir/drue.lock/manifest.json"
  printf 'unchanged bar layout\n' >"$HOME/.config/omarchy/shell.json"
  install_omarchy_plugins_linux
  local id
  for id in 37signals.hey io.github.thisisgm.omapods org.ren.caldir hass jankeesvw.time-machine; do
    [[ -s "$plugins_dir/$id/manifest.json" ]]
  done
  [[ "$(grep -c 'omarchy plugin add' "$COMMAND_LOG")" -eq 5 ]]
  assert_log_contains 'omarchy pkg add restic'
  assert_log_contains 'omapods setup'
  assert_log_contains 'caldir --version'
  assert_log_contains 'hey --version'
  grep -Fxq 'unchanged bar layout' "$HOME/.config/omarchy/shell.json"
  ! grep -q -- '--enable' "$COMMAND_LOG"
}

test_plugin_profile_gates() {
  SETUP_PROFILE="server"
  install_omarchy_plugins_linux
  [[ ! -s "$COMMAND_LOG" ]]
  SETUP_PROFILE="personal"
  have() { [[ "$1" != "omarchy" ]] && command -v "$1" >/dev/null 2>&1; }
  install_omarchy_plugins_linux
  [[ ! -s "$COMMAND_LOG" ]]
  OS="macos"
  install_omarchy_plugins_linux
  [[ ! -s "$COMMAND_LOG" ]]
}

run_desktop_test empty-placeholder test_empty_plugin_placeholder
run_desktop_test existing-plugin test_existing_plugin_is_preserved
run_desktop_test nonempty-placeholder test_nonempty_plugin_is_not_deleted
run_desktop_test symlink-placeholder test_plugin_symlink_is_not_deleted
run_desktop_test wrong-plugin-id test_plugin_manifest_id_is_checked
run_desktop_test headless-plugin-add test_headless_plugin_add
run_desktop_test configured-plugins test_all_configured_plugins
run_desktop_test plugin-profile-gates test_plugin_profile_gates
