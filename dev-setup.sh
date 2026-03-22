#!/bin/bash
set -euo pipefail

#######################################
# Config
#######################################
DOTFILES_REPO="https://github.com/druejaramillo/dotfiles.git"
DOTFILES_DIR="$HOME/.dotfiles"
DOTFILES_BACKUP_DIR="$HOME/.dotfiles-backup-$(date +%Y%m%d-%H%M%S)"
FONT_NAME="FiraCode"
NVM_VERSION="v0.40.3"

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

detect_os() {
  case "$(uname -s)" in
    Darwin) OS="macos" ;;
    Linux)  OS="linux" ;;
    *) err "Unsupported OS: $(uname -s)"; exit 1 ;;
  esac
}

detect_linux_pkg_mgr() {
  if have apt-get; then PKG_MGR="apt"
  elif have dnf; then PKG_MGR="dnf"
  elif have pacman; then PKG_MGR="pacman"
  elif have zypper; then PKG_MGR="zypper"
  else
    err "Unsupported Linux package manager. Supported: apt, dnf, pacman, zypper"
    exit 1
  fi
}

sudo_if_needed() {
  if [[ "${EUID}" -ne 0 ]]; then
    sudo "$@"
  else
    "$@"
  fi
}

ensure_local_bin_on_path() {
  append_line_if_missing 'export PATH="$HOME/.local/bin:$PATH"' "$HOME/.zshrc"
  export PATH="$HOME/.local/bin:$PATH"
}

#######################################
# Homebrew
#######################################
install_homebrew_if_needed() {
  if have brew; then
    return
  fi

  log "Installing Homebrew"
  NONINTERACTIVE=1 /bin/bash -c \
    "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  if [[ "$OS" == "macos" ]]; then
    if [[ -x /opt/homebrew/bin/brew ]]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
      append_line_if_missing 'eval "$(/opt/homebrew/bin/brew shellenv)"' "$HOME/.zprofile"
    elif [[ -x /usr/local/bin/brew ]]; then
      eval "$(/usr/local/bin/brew shellenv)"
      append_line_if_missing 'eval "$(/usr/local/bin/brew shellenv)"' "$HOME/.zprofile"
    fi
  else
    if [[ -x /home/linuxbrew/.linuxbrew/bin/brew ]]; then
      eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
      append_line_if_missing 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' "$HOME/.zprofile"
    elif [[ -x "$HOME/.linuxbrew/bin/brew" ]]; then
      eval "$("$HOME/.linuxbrew/bin/brew" shellenv)"
      append_line_if_missing 'eval "$("$HOME/.linuxbrew/bin/brew" shellenv)' "$HOME/.zprofile"
    fi
  fi
}

#######################################
# Package installation
#######################################
update_system_packages() {
  if [[ "$OS" == "linux" ]]; then
    case "$PKG_MGR" in
      apt)
        sudo_if_needed apt-get update
        ;;
      dnf)
        sudo_if_needed dnf makecache
        ;;
      pacman)
        sudo_if_needed pacman -Sy --noconfirm
        ;;
      zypper)
        sudo_if_needed zypper refresh
        ;;
    esac
  fi
}

install_base_packages_linux() {
  log "Installing base packages via $PKG_MGR"

  case "$PKG_MGR" in
    apt)
      sudo_if_needed apt-get install -y \
        zsh git curl wget unzip tar xz-utils ca-certificates gnupg lsb-release \
        build-essential ripgrep neovim python3 python3-pip python3-venv \
        postgresql postgresql-client pkg-config libssl-dev libreadline-dev zlib1g-dev \
        libyaml-dev libffi-dev libgdbm-dev luarocks fontconfig
      ;;
    dnf)
      sudo_if_needed dnf install -y \
        zsh git curl wget unzip tar xz ca-certificates gnupg2 \
        gcc gcc-c++ make ripgrep neovim python3 python3-pip \
        postgresql postgresql-server postgresql-contrib \
        pkgconf-pkg-config openssl-devel readline-devel zlib-devel \
        libyaml-devel libffi-devel gdbm-devel luarocks fontconfig
      ;;
    pacman)
      sudo_if_needed pacman -S --noconfirm \
        zsh git curl wget unzip tar xz ca-certificates gnupg \
        base-devel ripgrep neovim python python-pip \
        postgresql luarocks fontconfig
      ;;
    zypper)
      sudo_if_needed zypper install -y \
        zsh git curl wget unzip tar xz ca-certificates gpg2 \
        gcc gcc-c++ make ripgrep neovim python3 python3-pip \
        postgresql postgresql-server luarocks fontconfig
      ;;
  esac
}

install_base_packages_macos() {
  log "Installing base packages via Homebrew"
  brew update

  brew install \
    zsh git starship lazygit ripgrep neovim python postgresql@16 \
    luarocks tree-sitter lazydocker

  # Docker Desktop on macOS
  if ! have docker; then
    brew install --cask docker
  fi

  # FiraCode Nerd Font
  brew tap homebrew/cask-fonts || true
  brew install --cask font-fira-code-nerd-font || true
}

install_docker_linux() {
  if have docker; then
    log "Docker already installed"
    return
  fi

  log "Installing Docker on Linux"
  case "$PKG_MGR" in
    apt)
      sudo_if_needed apt-get install -y ca-certificates curl gnupg
      sudo_if_needed install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/"$(. /etc/os-release; echo "$ID")"/gpg \
        | sudo_if_needed gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      sudo_if_needed chmod a+r /etc/apt/keyrings/docker.gpg
      echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$(. /etc/os-release; echo "$ID") \
        $(. /etc/os-release; echo "${VERSION_CODENAME:-$UBUNTU_CODENAME}") stable" \
        | sudo_if_needed tee /etc/apt/sources.list.d/docker.list >/dev/null
      sudo_if_needed apt-get update
      sudo_if_needed apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      ;;
    dnf)
      sudo_if_needed dnf -y install dnf-plugins-core
      sudo_if_needed dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo || true
      sudo_if_needed dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      ;;
    pacman)
      sudo_if_needed pacman -S --noconfirm docker docker-compose
      ;;
    zypper)
      sudo_if_needed zypper install -y docker docker-compose
      ;;
  esac

  sudo_if_needed systemctl enable docker || true
  sudo_if_needed systemctl start docker || true
  sudo_if_needed usermod -aG docker "$USER" || true
  warn "You may need to log out/in for Docker group membership to take effect."
}

install_starship_linux() {
  if have starship; then
    return
  fi
  log "Installing Starship"
  curl -fsSL https://starship.rs/install.sh | sh -s -- -y
}

install_oh_my_zsh() {
  if [[ -d "$HOME/.oh-my-zsh" ]]; then
    log "Oh My Zsh already installed"
    return
  fi

  log "Installing Oh My Zsh"
  RUNZSH=no CHSH=no KEEP_ZSHRC=yes \
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
}

install_nvm_node() {
  if [[ ! -d "$HOME/.nvm" ]]; then
    log "Installing nvm"
    curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
  fi

  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1090
  [[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh"

  if ! have nvm; then
    err "nvm failed to load"
    exit 1
  fi

  log "Installing latest Node.js via nvm"
  nvm install --lts
  nvm alias default 'lts/*'
  nvm use default

  # Ensure shell init
  append_line_if_missing 'export NVM_DIR="$HOME/.nvm"' "$HOME/.zshrc"
  append_line_if_missing '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' "$HOME/.zshrc"
  append_line_if_missing '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' "$HOME/.zshrc"
}

install_tree_sitter_cli() {
  if have tree-sitter; then
    log "tree-sitter already installed"
    return
  fi

  log "Installing tree-sitter-cli globally via npm"
  npm install -g tree-sitter-cli
}

install_opencode() {
  if have opencode; then
    log "OpenCode already installed"
    return
  fi

  log "Installing OpenCode"
  if [[ "$OS" == "macos" ]] && have brew; then
    brew install anomalyco/tap/opencode
  else
    curl -fsSL https://opencode.ai/install | bash
    ensure_local_bin_on_path
  fi
}

install_lazygit_linux() {
  if have lazygit; then
    return
  fi

  if have brew; then
    brew install lazygit
    return
  fi

  log "Installing latest lazygit from GitHub releases"
  local version tmpdir arch
  version="$(curl -fsSL https://api.github.com/repos/jesseduffield/lazygit/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/')"

  case "$(uname -m)" in
    x86_64|amd64) arch="x86_64" ;;
    arm64|aarch64) arch="arm64" ;;
    *) err "Unsupported architecture for lazygit: $(uname -m)"; exit 1 ;;
  esac

  tmpdir="$(mktemp -d)"
  curl -fsSL -o "$tmpdir/lazygit.tar.gz" \
    "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${version}_Linux_${arch}.tar.gz"
  tar -xf "$tmpdir/lazygit.tar.gz" -C "$tmpdir"
  sudo_if_needed install "$tmpdir/lazygit" /usr/local/bin
  rm -rf "$tmpdir"
}

install_lazydocker_linux() {
  if have lazydocker; then
    return
  fi

  if have brew; then
    brew install lazydocker
    return
  fi

  log "Installing lazydocker via upstream installer"
  DIR="$HOME/.local/bin" curl -fsSL \
    https://raw.githubusercontent.com/jesseduffield/lazydocker/master/scripts/install_update_linux.sh | bash
  ensure_local_bin_on_path
}

install_firacode_nerd_font_linux() {
  local font_dir zip_path tmpdir
  font_dir="$HOME/.local/share/fonts/FiraCode"
  mkdir -p "$font_dir"

  if find "$font_dir" -iname "*Nerd*" -o -iname "*FiraCode*" | grep -q . 2>/dev/null; then
    log "FiraCode Nerd Font appears to already be installed"
    return
  fi

  log "Installing FiraCode Nerd Font"
  tmpdir="$(mktemp -d)"
  zip_path="$tmpdir/FiraCode.zip"
  curl -fsSL -o "$zip_path" \
    "https://github.com/ryanoasis/nerd-fonts/releases/latest/download/FiraCode.zip"
  unzip -o "$zip_path" -d "$font_dir" >/dev/null
  if have fc-cache; then
    fc-cache -fv "$HOME/.local/share/fonts" >/dev/null || true
  fi
  rm -rf "$tmpdir"
}

change_default_shell_to_zsh() {
  local zsh_path current_shell
  zsh_path="$(command -v zsh)"
  current_shell="${SHELL:-}"

  if [[ "$current_shell" == "$zsh_path" ]]; then
    log "Default shell already set to zsh"
    return
  fi

  log "Changing default shell to zsh ($zsh_path)"

  if [[ "$OS" == "linux" ]]; then
    if ! grep -qx "$zsh_path" /etc/shells 2>/dev/null; then
      echo "$zsh_path" | sudo_if_needed tee -a /etc/shells >/dev/null
    fi
  fi

  chsh -s "$zsh_path" || warn "Could not change shell automatically. Run: chsh -s $zsh_path"
}

clone_dotfiles() {
  if [[ -d "$DOTFILES_DIR" ]]; then
    log "Dotfiles bare repo already exists at $DOTFILES_DIR"
  else
    log "Cloning bare dotfiles repo"
    git clone --bare "$DOTFILES_REPO" "$DOTFILES_DIR"
  fi

  local git_bin
  git_bin="$(command -v git)"
  alias dotfiles="$git_bin --git-dir=$DOTFILES_DIR/ --work-tree=$HOME"

  log "Checking out dotfiles"
  if ! "$git_bin" --git-dir="$DOTFILES_DIR/" --work-tree="$HOME" checkout -f; then
    warn "Dotfiles checkout had conflicts. Backing up existing files to $DOTFILES_BACKUP_DIR"
    mkdir -p "$DOTFILES_BACKUP_DIR"

    "$git_bin" --git-dir="$DOTFILES_DIR/" --work-tree="$HOME" checkout 2>&1 \
      | grep -E '^\s+\.' \
      | awk '{print $1}' \
      | while read -r file; do
          mkdir -p "$DOTFILES_BACKUP_DIR/$(dirname "$file")"
          mv "$HOME/$file" "$DOTFILES_BACKUP_DIR/$file"
        done

    "$git_bin" --git-dir="$DOTFILES_DIR/" --work-tree="$HOME" checkout -f
  fi

  "$git_bin" --git-dir="$DOTFILES_DIR/" --work-tree="$HOME" config status.showUntrackedFiles no

  append_line_if_missing "alias dotfiles='$git_bin --git-dir=\$HOME/.dotfiles/ --work-tree=\$HOME'" "$HOME/.zshrc"
}

setup_postgres() {
  log "Setting up PostgreSQL service hints"

  if [[ "$OS" == "macos" ]]; then
    if have brew; then
      brew services start postgresql@16 || warn "Could not start PostgreSQL automatically"
    fi
  else
    case "$PKG_MGR" in
      apt|dnf|zypper)
        sudo_if_needed systemctl enable postgresql || true
        sudo_if_needed systemctl start postgresql || true
        ;;
      pacman)
        warn "On Arch, initialize the DB first if needed:"
        warn "  sudo -iu postgres initdb -D /var/lib/postgres/data"
        warn "Then start:"
        warn "  sudo systemctl enable --now postgresql"
        ;;
    esac
  fi
}

print_summary() {
  cat <<EOF

Done.

Installed / configured:
  - zsh + default shell switch
  - Oh My Zsh
  - Starship
  - git
  - docker
  - lazygit
  - lazydocker
  - FiraCode Nerd Font
  - tree-sitter-cli
  - C compiler / build tools
  - luarocks
  - ripgrep
  - nvm + Node.js + npm
  - OpenCode
  - python
  - postgres
  - neovim
  - bare dotfiles checkout

Recommended next steps:
  1. Log out and back in (important for Docker group + shell change)
  2. Open Docker/Desktop once on macOS
  3. Start a new zsh session:
       exec zsh
  4. Verify:
       zsh --version
       starship --version
       git --version
       docker --version
       lazygit --version
       lazydocker --version
       tree-sitter --version
       cc --version
       luarocks --version
       rg --version
       node --version
       npm --version
       opencode --version || true
       python3 --version
       psql --version
       nvim --version

EOF
}

#######################################
# Main
#######################################
main() {
  detect_os

  if [[ "$OS" == "linux" ]]; then
    detect_linux_pkg_mgr
    update_system_packages
    install_base_packages_linux
    install_homebrew_if_needed
    install_starship_linux
    install_docker_linux
    install_lazygit_linux
    install_lazydocker_linux
    install_firacode_nerd_font_linux
  else
    install_homebrew_if_needed
    install_base_packages_macos
  fi

  install_oh_my_zsh
  install_nvm_node
  install_tree_sitter_cli
  install_opencode
  clone_dotfiles
  change_default_shell_to_zsh
  setup_postgres
  print_summary
}

main "$@"
