#!/bin/bash
# Exercise only the agent skill helpers with local Git fixtures and a temporary HOME.
set -euo pipefail

BOOTSTRAP_SCRIPT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/dev-setup.sh}"
BOOTSTRAP_SCRIPT="$(cd "$(dirname "$BOOTSTRAP_SCRIPT")" && pwd)/$(basename "$BOOTSTRAP_SCRIPT")"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT
TEST_LOG="$TEST_ROOT/bootstrap.log"

# Prevent network transports and user Git hooks/config from affecting fixture tests.
mkdir -p "$TEST_ROOT/empty-template"
export GIT_TEMPLATE_DIR="$TEST_ROOT/empty-template"
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 GIT_ALLOW_PROTOCOL=file

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  if [[ -f "$TEST_LOG" ]]; then
    tail -n 20 "$TEST_LOG" >&2
  fi
  exit 1
}

write_fixture_skill() {
  local directory="$1" name="${1##*/}"
  mkdir -p "$directory"
  printf '%s\n' '---' "name: $name" 'description: Offline bootstrap fixture.' '---' >"$directory/SKILL.md"
}

create_fixture_repo() {
  git init -q "$1"
  git -C "$1" add .
  git -C "$1" -c user.name=BootstrapFixture -c user.email=fixture@example.invalid \
    -c commit.gpgsign=false -c core.hooksPath=/dev/null commit -qm fixture
}

cursor_fixture="$TEST_ROOT/cursor-source"
matt_fixture="$TEST_ROOT/matt-source"
for skill in poteto-mode fixture-principle; do
  write_fixture_skill "$cursor_fixture/pstack/skills/$skill"
done
for skill in deslop control-cli control-ui unselected-cursor-skill; do
  write_fixture_skill "$cursor_fixture/cursor-team-kit/skills/$skill"
done
for skill in productivity/grilling productivity/grill-me engineering/grill-with-docs \
  engineering/domain-modeling engineering/code-review productivity/writing-for-agents \
  in-progress/writing-beats in-progress/writing-fragments in-progress/writing-shape \
  productivity/teach; do
  write_fixture_skill "$matt_fixture/skills/$skill"
done
mkdir -p "$matt_fixture/skills/productivity/grilling/references"
printf '%s\n' 'bundled reference survives the directory link' >"$matt_fixture/skills/productivity/grilling/references/probe.txt"
create_fixture_repo "$cursor_fixture"
create_fixture_repo "$matt_fixture"

# Git records canonical origins while resolving both clone URLs to local fixtures.
export GIT_CONFIG_COUNT=2
export GIT_CONFIG_KEY_0="url.file://$cursor_fixture.insteadOf"
export GIT_CONFIG_VALUE_0=https://github.com/cursor/plugins.git
export GIT_CONFIG_KEY_1="url.file://$matt_fixture.insteadOf"
export GIT_CONFIG_VALUE_1=https://github.com/mattpocock/skills.git

new_case() {
  export HOME="$TEST_ROOT/$1 home with spaces"
  mkdir -p "$HOME"
  # The source guard prevents the system/package bootstrap from running.
  # shellcheck disable=SC1090
  source "$BOOTSTRAP_SCRIPT"
}

expect_setup_failure() {
  if setup_agent_skill_catalog >"$TEST_LOG" 2>&1; then
    fail "Expected skill setup to fail: $1"
  fi
}

assert_no_catalog_links() {
  [[ ! -L "$AGENT_SKILLS_DIR/pstack" && ! -e "$AGENT_SKILLS_DIR/cursor" &&
    ! -e "$AGENT_SKILLS_DIR/mattpocock" ]] || fail 'Preflight failure created catalog links'
}

new_case fresh
setup_agent_skill_catalog >"$TEST_LOG" 2>&1
[[ -L "$AGENT_SKILLS_DIR/pstack" ]] || fail 'Missing P Stack collection link'
[[ -d "$AGENT_SKILLS_DIR/cursor" && ! -L "$AGENT_SKILLS_DIR/cursor" ]] || fail 'Cursor group is not a directory'
[[ -d "$AGENT_SKILLS_DIR/mattpocock" && ! -L "$AGENT_SKILLS_DIR/mattpocock" ]] || fail 'Matt group is not a directory'
[[ "$(find -L "$AGENT_SKILLS_DIR" -type f -name SKILL.md | wc -l | tr -d ' ')" == 14 ]] || fail 'Wrong selected fixture skill count'
[[ ! -e "$AGENT_SKILLS_DIR/mattpocock/teach" && ! -e "$AGENT_SKILLS_DIR/cursor/unselected-cursor-skill" ]] || fail 'Unselected skills were exposed'
[[ "$(<"$AGENT_SKILLS_DIR/mattpocock/grilling/references/probe.txt")" == 'bundled reference survives the directory link' ]] || fail 'Bundled files did not resolve'
printf '%s\n' 'ok - fresh grouped links, recursive files, selected skills, bundled assets and HOME with spaces'

printf '%s\n' 'keep local source note' >"$AGENT_SKILL_SOURCES_DIR/cursor-plugins/local-note.txt"
write_fixture_skill "$AGENT_SKILLS_DIR/show-me"
setup_agent_skill_catalog >"$TEST_LOG" 2>&1
[[ "$(<"$AGENT_SKILL_SOURCES_DIR/cursor-plugins/local-note.txt")" == 'keep local source note' ]] || fail 'Existing checkout was replaced'
[[ -f "$AGENT_SKILLS_DIR/show-me/SKILL.md" ]] || fail 'Owned root skill was changed'
printf '%s\n' 'ok - rerun reuses existing checkouts/links and preserves owned files'

new_case existing-content
mkdir -p "$AGENT_SKILLS_DIR/pstack"
printf '%s\n' keep >"$AGENT_SKILLS_DIR/pstack/sentinel"
expect_setup_failure 'existing directory'
[[ "$(<"$AGENT_SKILLS_DIR/pstack/sentinel")" == keep ]] || fail 'Existing directory content was changed'
assert_no_catalog_links
printf '%s\n' 'ok - existing content is refused without replacement'

new_case wrong-link
mkdir -p "$AGENT_SKILLS_DIR" "$HOME/other-source"
ln -s "$HOME/other-source" "$AGENT_SKILLS_DIR/pstack"
expect_setup_failure 'wrong symlink'
[[ "$(readlink "$AGENT_SKILLS_DIR/pstack")" == "$HOME/other-source" ]] || fail 'Wrong link was replaced'
[[ ! -e "$AGENT_SKILLS_DIR/cursor" ]] || fail 'Links were created after wrong-link failure'
printf '%s\n' 'ok - conflicting symlinks are preserved'

new_case missing-source
clone_agent_skill_source "$CURSOR_PLUGINS_REPO" "$AGENT_SKILL_SOURCES_DIR/cursor-plugins" >"$TEST_LOG" 2>&1
clone_agent_skill_source "$MATTPOCOCK_SKILLS_REPO" "$AGENT_SKILL_SOURCES_DIR/mattpocock-skills" >>"$TEST_LOG" 2>&1
rm "$AGENT_SKILL_SOURCES_DIR/mattpocock-skills/skills/in-progress/writing-shape/SKILL.md"
expect_setup_failure 'last selected source missing'
assert_no_catalog_links
printf '%s\n' 'ok - every selected source is checked before catalog links are created'

new_case legacy-matt
write_fixture_skill "$AGENT_SKILLS_DIR/grilling"
expect_setup_failure 'legacy flat Matt skill'
[[ -f "$AGENT_SKILLS_DIR/grilling/SKILL.md" ]] || fail 'Legacy Matt copy was changed'
assert_no_catalog_links
printf '%s\n' 'ok - legacy flat Matt copies require explicit migration'

new_case legacy-pstack
write_fixture_skill "$AGENT_SKILLS_DIR/poteto-mode"
expect_setup_failure 'legacy flat P Stack skill'
[[ -f "$AGENT_SKILLS_DIR/poteto-mode/SKILL.md" ]] || fail 'Legacy P Stack copy was changed'
assert_no_catalog_links
printf '%s\n' 'ok - legacy flat P Stack copies require explicit migration'

new_case unexpected-origin
clone_agent_skill_source "$CURSOR_PLUGINS_REPO" "$AGENT_SKILL_SOURCES_DIR/cursor-plugins" >"$TEST_LOG" 2>&1
git -C "$AGENT_SKILL_SOURCES_DIR/cursor-plugins" remote set-url origin https://example.invalid/unrelated.git
expect_setup_failure 'unexpected source origin'
[[ "$(git -C "$AGENT_SKILL_SOURCES_DIR/cursor-plugins" config --get remote.origin.url)" == https://example.invalid/unrelated.git ]] || fail 'Existing origin was rewritten'
assert_no_catalog_links
printf '%s\n' 'ok - an unrelated checkout is refused without modification'

new_case linked-group
mkdir -p "$AGENT_SKILLS_DIR" "$HOME/other-group"
ln -s "$HOME/other-group" "$AGENT_SKILLS_DIR/cursor"
expect_setup_failure 'group directory is a symlink'
[[ -z "$(find "$HOME/other-group" -mindepth 1 -print -quit)" ]] || fail 'Linked group target was written'
[[ ! -L "$AGENT_SKILLS_DIR/pstack" ]] || fail 'Catalog links were created before group validation'
printf '%s\n' 'ok - group directories cannot redirect writes through symlinks'

new_case bare-dotfiles-excludes
git init -q --bare "$DOTFILES_DIR"
mkdir -p "$DOTFILES_DIR/info"
printf '%s\n' '/keep-existing-rule' >"$DOTFILES_DIR/info/exclude"
setup_agent_skill_catalog >"$TEST_LOG" 2>&1
[[ ! -e "$AGENT_SKILLS_DIR/.gitignore" ]] || fail 'Catalog ignore rules would hide upstream skills from Pi'
[[ "$(git --git-dir="$DOTFILES_DIR" --work-tree="$HOME" check-ignore .agents/skills/pstack .agents/skills/cursor .agents/skills/mattpocock .local/share/agent-sources | wc -l | tr -d ' ')" == 4 ]] || fail 'Generated source/link exclusions are missing'
grep -Fqx '/keep-existing-rule' "$DOTFILES_DIR/info/exclude" || fail 'Existing Git exclusion was lost'
exclude_checksum="$(cksum "$DOTFILES_DIR/info/exclude")"
setup_agent_skill_catalog >"$TEST_LOG" 2>&1
[[ "$(cksum "$DOTFILES_DIR/info/exclude")" == "$exclude_checksum" ]] || fail 'Git exclusion rules are not idempotent'
printf '%s\n' 'ok - generated paths are Git-ignored outside the Pi discovery tree'

new_case dirty-dotfiles-guard
git init -q --bare "$DOTFILES_DIR"
printf '%s\n' original >"$HOME/tracked-config.txt"
git --git-dir="$DOTFILES_DIR" --work-tree="$HOME" add tracked-config.txt
git --git-dir="$DOTFILES_DIR" --work-tree="$HOME" -c user.name=BootstrapFixture -c user.email=fixture@example.invalid -c commit.gpgsign=false -c core.hooksPath=/dev/null commit -qm fixture
printf '%s\n' keep-local-edit >"$HOME/tracked-config.txt"
if clone_dotfiles >"$TEST_LOG" 2>&1; then
  fail 'Dotfiles checkout accepted uncommitted tracked changes'
fi
[[ "$(<"$HOME/tracked-config.txt")" == keep-local-edit ]] || fail 'Dotfiles checkout overwrote local work'
printf '%s\n' 'ok - full dotfiles restore refuses to overwrite tracked local changes'

new_case skills-only-dispatch
(
  setup_agent_skill_catalog() { printf '%s\n' dispatched >"$HOME/dispatch.txt"; }
  detect_os() { fail 'Skills-only mode entered the full system bootstrap'; }
  main --agent-skills-only
)
[[ "$(<"$HOME/dispatch.txt")" == dispatched ]] || fail 'Skills-only mode was not dispatched'
printf '%s\n' 'ok - skills-only mode bypasses the system/package bootstrap'

printf '%s\n' '12 offline bootstrap fixture checks passed.'
