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

test_parakeet_build_and_config_preservation() {
  VOXTYPE_DIR="$HOME/src/voxtype"
  mkdir -p "$VOXTYPE_DIR/.git" "$VOXTYPE_DIR/target/release" "$HOME/.config/voxtype" "$HOME/.config/systemd/user"
  printf '[package]\nname="voxtype"\n' >"$VOXTYPE_DIR/Cargo.toml"
  cp "$(dirname "$SETUP_SCRIPT")/.config/systemd/user/voxtype.service" "$HOME/.config/systemd/user/voxtype.service"
  grep -Fxq 'ExecStart=%h/.local/bin/voxtype daemon' "$HOME/.config/systemd/user/voxtype.service"
  printf 'engine = "parakeet"\n# preserve this exact file\n' >"$HOME/.config/voxtype/config.toml"
  cp "$HOME/.config/voxtype/config.toml" "$HOME/expected-config.toml"
  local binary
  for binary in voxtype voxtype-osd voxtype-osd-quickshell voxtype-audio-bridge; do
    printf '#!/bin/bash\nprintf "voxtype %%s config=%%s\\n" "$*" "${XDG_CONFIG_HOME:-}" >>"$COMMAND_LOG"\n' >"$VOXTYPE_DIR/target/release/$binary"
    chmod +x "$VOXTYPE_DIR/target/release/$binary"
  done
  git() {
    printf 'git %s\n' "$*" >>"$COMMAND_LOG"
    if [[ "$*" == *'rev-parse HEAD'* ]]; then printf '%s\n' "$VOXTYPE_REV"; fi
  }
  cargo() { printf 'cargo CC=%s CXX=%s %s\n' "${CC:-}" "${CXX:-}" "$*" >>"$COMMAND_LOG"; }
  systemctl() { printf 'systemctl %s\n' "$*" >>"$COMMAND_LOG"; }
  install_voxtype_linux
  cmp "$HOME/expected-config.toml" "$HOME/.config/voxtype/config.toml"
  assert_log_contains "checkout --detach $VOXTYPE_REV"
  assert_log_contains 'cargo CC=clang CXX=clang++ build --release --locked --features parakeet'
  local download_config_dir
  download_config_dir="$(grep -F 'setup --download --model parakeet-tdt-0.6b-v3 --no-post-install config=' "$COMMAND_LOG")"
  download_config_dir="${download_config_dir##* config=}"
  [[ "$download_config_dir" == /* && "$download_config_dir" != "$HOME/.config" ]]
  [[ ! -e "$download_config_dir" ]]
  assert_log_contains 'setup quickshell --source'
  assert_log_contains 'systemctl --user restart voxtype.service'
  [[ -x "$HOME/.local/bin/voxtype-osd" ]]
  [[ -x "$HOME/.local/bin/voxtype-osd-quickshell" ]]
  [[ -x "$HOME/.local/bin/voxtype-audio-bridge" ]]
}

test_main_desktop_order_and_server_gates() {
  local function_name
  for function_name in detect_linux_pkg_mgr update_system_packages_linux install_base_packages_linux \
    install_strata_arch_linux install_go_linux install_starship_linux install_docker_linux \
    install_lazygit_linux install_lazydocker_linux install_firacode_nerd_font_linux setup_fd_symlink \
    install_tailscale install_oh_my_zsh install_nvm_node install_rust install_adaptive_brightness \
    install_hypruler_linux install_tree_sitter_cli install_pi install_plannotator install_tpm \
    install_voxtype_linux install_omarchy_plugins_linux install_try_cli \
    clone_dotfiles change_default_shell_to_zsh setup_postgres print_summary; do
    eval "$function_name() { printf '%s\\n' '$function_name' >>\"\$COMMAND_LOG\"; }"
  done
  detect_os() {
    OS="linux"
    PKG_MGR="pacman"
  }
  main
  local checkout_line voxtype_line plugins_line
  checkout_line="$(grep -n '^clone_dotfiles$' "$COMMAND_LOG" | cut -d: -f1)"
  voxtype_line="$(grep -n '^install_voxtype_linux$' "$COMMAND_LOG" | cut -d: -f1)"
  plugins_line="$(grep -n '^install_omarchy_plugins_linux$' "$COMMAND_LOG" | cut -d: -f1)"
  [[ "$checkout_line" -lt "$voxtype_line" && "$checkout_line" -lt "$plugins_line" ]]
  : >"$COMMAND_LOG"
  main --server
  ! grep -Eq '^install_(voxtype|omarchy_plugins)_linux$' "$COMMAND_LOG"
}

run_desktop_test empty-placeholder test_empty_plugin_placeholder
run_desktop_test existing-plugin test_existing_plugin_is_preserved
run_desktop_test nonempty-placeholder test_nonempty_plugin_is_not_deleted
run_desktop_test symlink-placeholder test_plugin_symlink_is_not_deleted
run_desktop_test wrong-plugin-id test_plugin_manifest_id_is_checked
run_desktop_test headless-plugin-add test_headless_plugin_add
run_desktop_test configured-plugins test_all_configured_plugins
run_desktop_test plugin-profile-gates test_plugin_profile_gates
run_desktop_test parakeet-build test_parakeet_build_and_config_preservation
run_desktop_test main-order test_main_desktop_order_and_server_gates
