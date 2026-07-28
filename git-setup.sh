#!/bin/bash
set -euo pipefail

#######################################
# Defaults
#######################################
GIT_NAME=""
GIT_EMAIL=""
GPG_PASSPHRASE=""
GPG_KEY_TYPE="RSA"
GPG_KEY_LENGTH="4096"
GPG_EXPIRE_DATE="0"
GITHUB_HOST="github.com"
PACKAGE_MANAGER=""
FORCE_REGEN_GPG=false

#######################################
# Logging
#######################################
log()  { printf "\n\033[1;34m==>\033[0m %s\n" "$*"; }
warn() { printf "\n\033[1;33mWARN:\033[0m %s\n" "$*"; }
err()  { printf "\n\033[1;31mERROR:\033[0m %s\n" "$*" >&2; }

#######################################
# Helpers
#######################################
have() { command -v "$1" >/dev/null 2>&1; }

append_line_if_missing() {
  local line="$1"
  local file="$2"
  mkdir -p "$(dirname "$file")"
  touch "$file"
  grep -Fqx "$line" "$file" || printf "%s\n" "$line" >> "$file"
}

sudo_if_needed() {
  if [[ "${EUID}" -ne 0 ]]; then
    sudo "$@"
  else
    "$@"
  fi
}

detect_os() {
  case "$(uname -s)" in
    Darwin) OS="macos" ;;
    Linux)  OS="linux" ;;
    *) err "Unsupported OS: $(uname -s)"; exit 1 ;;
  esac
}

usage() {
  cat <<'EOF'
Usage:
  git-gh-signing-setup.sh --name "Your Name" --email "you@example.com" [options]

Required:
  --name NAME                Git user.name
  --email EMAIL              Git user.email

Optional:
  --passphrase VALUE         GPG key passphrase (default: no passphrase)
  --key-type TYPE            GPG key type (default: RSA)
  --key-length BITS          GPG key length (default: 4096)
  --expire VALUE             GPG expiration, e.g. 0, 1y, 2y (default: 0)
  --github-host HOST         GitHub hostname (default: github.com)
  --package-manager VALUE    Force package manager on Linux:
                             apt, apt-get, dnf, pacman, zypper
  --force                    Delete and regenerate the GPG key even if one already exists
  --help                     Show this help

Examples:
  ./git-gh-signing-setup.sh --name "Jane Doe" --email "jane@example.com"

  ./git-gh-signing-setup.sh \
    --name "Jane Doe" \
    --email "jane@example.com" \
    --passphrase "secret" \
    --package-manager apt
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name)
        [[ $# -ge 2 ]] || { err "--name requires a value"; exit 1; }
        GIT_NAME="$2"
        shift 2
        ;;
      --email)
        [[ $# -ge 2 ]] || { err "--email requires a value"; exit 1; }
        GIT_EMAIL="$2"
        shift 2
        ;;
      --passphrase)
        [[ $# -ge 2 ]] || { err "--passphrase requires a value"; exit 1; }
        GPG_PASSPHRASE="$2"
        shift 2
        ;;
      --key-type)
        [[ $# -ge 2 ]] || { err "--key-type requires a value"; exit 1; }
        GPG_KEY_TYPE="$2"
        shift 2
        ;;
      --key-length)
        [[ $# -ge 2 ]] || { err "--key-length requires a value"; exit 1; }
        GPG_KEY_LENGTH="$2"
        shift 2
        ;;
      --expire)
        [[ $# -ge 2 ]] || { err "--expire requires a value"; exit 1; }
        GPG_EXPIRE_DATE="$2"
        shift 2
        ;;
      --github-host)
        [[ $# -ge 2 ]] || { err "--github-host requires a value"; exit 1; }
        GITHUB_HOST="$2"
        shift 2
        ;;
      --package-manager)
        [[ $# -ge 2 ]] || { err "--package-manager requires a value"; exit 1; }
        PACKAGE_MANAGER="$2"
        shift 2
        ;;
      --force)
        FORCE_REGEN_GPG=true
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        err "Unknown argument: $1"
        usage
        exit 1
        ;;
    esac
  done
}

normalize_package_manager() {
  case "$PACKAGE_MANAGER" in
    "")
      ;;
    apt-get)
      PACKAGE_MANAGER="apt"
      ;;
    apt|dnf|pacman|zypper)
      ;;
    *)
      err "Unsupported --package-manager value: $PACKAGE_MANAGER"
      err "Supported values: apt, apt-get, dnf, pacman, zypper"
      exit 1
      ;;
  esac
}

detect_linux_pkg_mgr() {
  if [[ -n "$PACKAGE_MANAGER" ]]; then
    PKG_MGR="$PACKAGE_MANAGER"
    return
  fi

  if have apt; then PKG_MGR="apt"
  elif have apt-get; then PKG_MGR="apt"
  elif have dnf; then PKG_MGR="dnf"
  elif have pacman; then PKG_MGR="pacman"
  elif have zypper; then PKG_MGR="zypper"
  else
    err "Unsupported Linux package manager"
    err "Supported: apt, apt-get, dnf, pacman, zypper"
    exit 1
  fi
}

require_git_identity() {
  if [[ -z "$GIT_NAME" ]]; then
    err "--name is required"
    usage
    exit 1
  fi

  if [[ -z "$GIT_EMAIL" ]]; then
    err "--email is required"
    usage
    exit 1
  fi
}

#######################################
# Install packages
#######################################
install_macos_packages() {
  if ! have brew; then
    err "Homebrew is required on macOS for this script."
    err "Install Homebrew first, then rerun."
    exit 1
  fi

  log "Installing packages with Homebrew"
  brew update
  brew install git gh gnupg pinentry-mac
}

install_linux_packages() {
  log "Installing packages via $PKG_MGR"

  case "$PKG_MGR" in
    apt)
      sudo_if_needed apt update
      sudo_if_needed apt install -y git gh gnupg2 pinentry-curses pinentry-tty ca-certificates curl
      ;;
    dnf)
      sudo_if_needed dnf install -y git gh gnupg2 pinentry ca-certificates curl
      ;;
    pacman)
      sudo_if_needed pacman -Syu --needed --noconfirm git github-cli gnupg pinentry ca-certificates curl
      ;;
    zypper)
      sudo_if_needed zypper install -y git gh gpg2 pinentry ca-certificates curl
      ;;
  esac
}

#######################################
# GPG config
#######################################
configure_gpg_tty() {
  log "Configuring GPG_TTY in shell startup files"
  append_line_if_missing 'export GPG_TTY=$(tty)' "$HOME/.zshrc"
  append_line_if_missing 'export GPG_TTY=$(tty)' "$HOME/.bashrc"
  export GPG_TTY="$(tty || true)"
}

configure_gpg_agent() {
  log "Configuring gpg-agent"
  mkdir -p "$HOME/.gnupg"
  chmod 700 "$HOME/.gnupg"

  local pinentry_path=""
  if [[ "$OS" == "macos" ]]; then
    if have brew; then
      pinentry_path="$(brew --prefix)/bin/pinentry-mac"
    fi
  else
    if have pinentry-curses; then
      pinentry_path="$(command -v pinentry-curses)"
    elif have pinentry-tty; then
      pinentry_path="$(command -v pinentry-tty)"
    elif have pinentry; then
      pinentry_path="$(command -v pinentry)"
    fi
  fi

  if [[ -n "$pinentry_path" ]]; then
    cat > "$HOME/.gnupg/gpg-agent.conf" <<EOF
default-cache-ttl 28800
max-cache-ttl 28800
pinentry-program $pinentry_path
EOF
  else
    cat > "$HOME/.gnupg/gpg-agent.conf" <<EOF
default-cache-ttl 28800
max-cache-ttl 28800
EOF
    warn "No explicit pinentry program found. gpg may still work if your system provides one."
  fi

  cat > "$HOME/.gnupg/gpg.conf" <<EOF
use-agent
EOF

  chmod 600 "$HOME/.gnupg/gpg-agent.conf" "$HOME/.gnupg/gpg.conf"
  gpgconf --kill gpg-agent || true
  gpgconf --launch gpg-agent || true
}

#######################################
# Git config
#######################################
configure_git_identity() {
  log "Configuring Git identity"
  git config --global user.name "$GIT_NAME"
  git config --global user.email "$GIT_EMAIL"
  git config --global init.defaultBranch main
  git config --global pull.rebase false
  git config --global fetch.prune true
}

#######################################
# GitHub CLI auth
#######################################
authenticate_gh() {
  if gh auth status -h "$GITHUB_HOST" >/dev/null 2>&1; then
    log "GitHub CLI already authenticated for $GITHUB_HOST"
  else
    log "Authenticating GitHub CLI"
    gh auth login --hostname "$GITHUB_HOST" --git-protocol https --web \
      --scopes "write:gpg_key"
  fi

  log "Ensuring write:gpg_key scope is granted"
  gh auth refresh --hostname "$GITHUB_HOST" --scopes "write:gpg_key"

  log "Configuring Git to use GitHub CLI as credential helper"
  gh auth setup-git --hostname "$GITHUB_HOST"
}

#######################################
# GPG key creation / discovery
#######################################

# Returns the long key ID (e.g. ABCD1234ABCD1234) for the first secret key
# matching GIT_EMAIL, using --with-colons for stable parsing across gpg versions.
find_existing_key_id_for_email() {
  # --with-colons output: sec lines have key ID in field 5, uid lines have email in field 10
  # We find the first sec entry whose associated uid matches the email.
  gpg --list-secret-keys --with-colons "$GIT_EMAIL" 2>/dev/null \
    | awk -F: -v email="$GIT_EMAIL" '/^sec:/ { keyid=$5 } keyid && /^uid:/ && index($10, email) { print keyid; exit }'
}

# Returns the full 40-char fingerprint for the first secret key matching GIT_EMAIL.
# GnuPG 2.4+ batch --delete-secret-and-public-key requires the fingerprint, not the key ID.
find_existing_fingerprint_for_email() {
  gpg --list-secret-keys --with-colons "$GIT_EMAIL" 2>/dev/null \
    | awk -F: '
        /^sec:/  { found_sec=1 }
        found_sec && /^fpr:/ { print $10; found_sec=0; exit }
      '
}

delete_gpg_key() {
  local fingerprint="$1"
  log "Deleting existing GPG key $fingerprint (--force)"
  gpg --batch --yes --delete-secret-and-public-key "$fingerprint" || true
}

generate_gpg_key() {
  log "Generating a new GPG key for $GIT_EMAIL"

  local batch_file
  batch_file="$(mktemp)"

  if [[ -n "${GPG_PASSPHRASE}" ]]; then
    cat > "$batch_file" <<EOF
%echo Generating a GPG key
Key-Type: $GPG_KEY_TYPE
Key-Length: $GPG_KEY_LENGTH
Subkey-Type: $GPG_KEY_TYPE
Subkey-Length: $GPG_KEY_LENGTH
Name-Real: $GIT_NAME
Name-Email: $GIT_EMAIL
Expire-Date: $GPG_EXPIRE_DATE
Passphrase: $GPG_PASSPHRASE
%commit
%echo done
EOF
  else
    cat > "$batch_file" <<EOF
%echo Generating a GPG key
Key-Type: $GPG_KEY_TYPE
Key-Length: $GPG_KEY_LENGTH
Subkey-Type: $GPG_KEY_TYPE
Subkey-Length: $GPG_KEY_LENGTH
Name-Real: $GIT_NAME
Name-Email: $GIT_EMAIL
Expire-Date: $GPG_EXPIRE_DATE
%no-protection
%commit
%echo done
EOF
  fi

  gpg --batch --generate-key "$batch_file"
  rm -f "$batch_file"
}

configure_git_signing() {
  local key_id="$1"

  log "Configuring Git commit/tag signing"
  git config --global gpg.program gpg
  git config --global user.signingkey "$key_id"
  git config --global commit.gpgsign true
  git config --global tag.gpgsign true
}

export_public_key() {
  local key_id="$1"
  local outfile="$2"
  gpg --armor --export "$key_id" > "$outfile"
}

upload_gpg_key_to_github() {
  local pubkey_file="$1"

  if gh auth status -h "$GITHUB_HOST" >/dev/null 2>&1; then
    log "Uploading public GPG key to GitHub"
    if gh gpg-key add "$pubkey_file" --title "$(hostname)-$(date +%Y-%m-%d)"; then
      log "GPG key uploaded to GitHub"
    else
      warn "Could not upload GPG key automatically. It may already exist, or gh may need refreshed scopes."
      warn "You can run manually:"
      warn "  gh gpg-key add \"$pubkey_file\" --title \"$(hostname)-$(date +%Y-%m-%d)\""
    fi
  else
    warn "gh is not authenticated; skipping GPG key upload to GitHub"
  fi
}

test_signing() {
  log "Testing GPG signing"
  local tmpdir
  tmpdir="$(mktemp -d)"
  pushd "$tmpdir" >/dev/null

  git init -q
  git config user.name "$GIT_NAME"
  git config user.email "$GIT_EMAIL"
  echo "signed commit test" > README.md
  git add README.md

  if git commit -S -m "test signed commit" >/dev/null 2>&1; then
    log "Signed commit test succeeded"
  else
    warn "Signed commit test failed"
    warn "Try these diagnostics:"
    warn "  export GPG_TTY=\$(tty)"
    warn "  gpgconf --kill gpg-agent && gpgconf --launch gpg-agent"
    warn "  git config --global gpg.program gpg"
  fi

  popd >/dev/null
  rm -rf "$tmpdir"
}

print_summary() {
  local key_id="$1"

  cat <<EOF

Done.

Git:
  user.name        = $(git config --global user.name || true)
  user.email       = $(git config --global user.email || true)
  user.signingkey  = $(git config --global user.signingkey || true)
  commit.gpgsign   = $(git config --global commit.gpgsign || true)
  tag.gpgsign      = $(git config --global tag.gpgsign || true)

GPG key:
  key id           = $key_id

Useful checks:
  gh auth status
  gpg --list-secret-keys --keyid-format=long
  git config --global --list | grep -E 'user.signingkey|commit.gpgsign|tag.gpgsign|credential'

If GitHub does not show “Verified” on signed commits:
  1. Make sure this email is verified on GitHub: $GIT_EMAIL
  2. Make sure the public GPG key is added to your GitHub account
  3. Make sure commits use the same email as the GPG UID

EOF
}

#######################################
# Main
#######################################
main() {
  parse_args "$@"
  normalize_package_manager
  detect_os
  require_git_identity

  if [[ "$OS" == "linux" ]]; then
    detect_linux_pkg_mgr
    install_linux_packages
  else
    install_macos_packages
  fi

  configure_gpg_tty
  configure_gpg_agent
  configure_git_identity
  authenticate_gh

  local key_id fingerprint
  key_id="$(find_existing_key_id_for_email || true)"

  if [[ -n "$key_id" ]] && [[ "$FORCE_REGEN_GPG" == "true" ]]; then
    fingerprint="$(find_existing_fingerprint_for_email || true)"
    if [[ -n "$fingerprint" ]]; then
      delete_gpg_key "$fingerprint"
    else
      warn "Could not find fingerprint for existing key $key_id; skipping deletion"
    fi
    key_id=""
  fi

  if [[ -z "$key_id" ]]; then
    generate_gpg_key
    sleep 1
    key_id="$(find_existing_key_id_for_email || true)"
  fi

  if [[ -z "$key_id" ]]; then
    err "Failed to find or generate a GPG key for $GIT_EMAIL"
    exit 1
  fi

  configure_git_signing "$key_id"

  local pubkey_file
  pubkey_file="$HOME/.gnupg/github-gpg-key.pub"
  export_public_key "$key_id" "$pubkey_file"
  upload_gpg_key_to_github "$pubkey_file"

  test_signing
  print_summary "$key_id"
}

main "$@"
