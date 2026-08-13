#!/bin/bash
set -euo pipefail

#######################################
# Config
#######################################
DOTFILES_REPO="https://github.com/druejaramillo/dotfiles.git"
DOTFILES_DIR="$HOME/.dotfiles"
DOTFILES_BACKUP_DIR="$HOME/.dotfiles-backup-$(date +%Y%m%d-%H%M%S)"
NVM_VERSION="v0.40.4"
VOXTYPE_REPO="https://github.com/peteonrails/voxtype.git"
VOXTYPE_DIR="$HOME/.local/src/voxtype"
HYPRULER_REPO="https://github.com/t4t5/hypruler.git"
HYPRULER_DIR="$HOME/.local/src/hypruler"
WLUMA_VERSION="4.11.1"
WLUMA_DIR="$HOME/.local/src/wluma-$WLUMA_VERSION"
SETUP_PROFILE="personal"

#######################################
# Logging
#######################################
log() { printf "\n\033[1;34m==>\033[0m %s\n" "$*"; }
warn() { printf "\n\033[1;33mWARN:\033[0m %s\n" "$*"; }
err() { printf "\n\033[1;31mERROR:\033[0m %s\n" "$*" >&2; }

#######################################
# Helpers
#######################################
have() { command -v "$1" >/dev/null 2>&1; }

is_server() { [[ "$SETUP_PROFILE" == "server" ]]; }

usage() {
  cat <<'EOF'
Usage: bash dev-setup.sh [--server]

Profiles:
  personal  Default. Installs the complete local development environment.
  --server  Linux SSH development server. Skips Voxtype, its audio/input
            dependencies, and local terminal fonts.
EOF
}

parse_args() {
  while [[ "$#" -gt 0 ]]; do
    case "$1" in
    --server)
      SETUP_PROFILE="server"
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      err "Unknown option: $1"
      usage >&2
      exit 2
      ;;
    esac
    shift
  done
}

append_line_if_missing() {
  local line="$1"
  local file="$2"
  mkdir -p "$(dirname "$file")"
  touch "$file"
  grep -Fqx "$line" "$file" || printf "%s\n" "$line" >>"$file"
}

detect_os() {
  case "$(uname -s)" in
  Darwin) OS="macos" ;;
  Linux) OS="linux" ;;
  *)
    err "Unsupported OS: $(uname -s)"
    exit 1
    ;;
  esac
}

detect_linux_pkg_mgr() {
  if have apt; then
    PKG_MGR="apt"
  elif have apt-get; then
    PKG_MGR="apt-get"
  elif have dnf; then
    PKG_MGR="dnf"
  elif have pacman; then
    PKG_MGR="pacman"
  elif have zypper; then
    PKG_MGR="zypper"
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
# macOS: Homebrew only
#######################################
install_homebrew_if_needed_macos() {
  if have brew; then
    return
  fi

  log "Installing Homebrew on macOS"
  NONINTERACTIVE=1 /bin/bash -c \
    "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
    append_line_if_missing 'eval "$(/opt/homebrew/bin/brew shellenv)"' "$HOME/.zprofile"
  elif [[ -x /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
    append_line_if_missing 'eval "$(/usr/local/bin/brew shellenv)"' "$HOME/.zprofile"
  fi
}

#######################################
# Linux packages
#######################################
update_system_packages_linux() {
  case "$PKG_MGR" in
  apt | apt-get)
    sudo_if_needed apt update
    ;;
  dnf)
    sudo_if_needed dnf makecache
    ;;
  pacman)
    # Refresh signing keys before the required full system upgrade.
    sudo_if_needed pacman -Sy --needed --noconfirm archlinux-keyring
    sudo_if_needed pacman -Syu --noconfirm
    ;;
  zypper)
    sudo_if_needed zypper refresh
    ;;
  esac
}

install_base_packages_linux() {
  log "Installing base packages via $PKG_MGR"

  case "$PKG_MGR" in
  apt | apt-get)
    sudo_if_needed "$PKG_MGR" install -y \
      zsh git curl wget unzip tar xz-utils ca-certificates gnupg lsb-release \
      build-essential ripgrep neovim python3 python3-pip python3-venv \
      postgresql postgresql-client pkg-config libssl-dev libreadline-dev zlib1g-dev \
      libyaml-dev libffi-dev libgdbm-dev luarocks fd-find fzf ruby tmux \
      cmake clang libclang-dev
    if ! is_server; then
      sudo_if_needed "$PKG_MGR" install -y fontconfig libasound2-dev wtype
    fi
    ;;
  dnf)
    sudo_if_needed dnf install -y \
      zsh git curl wget unzip tar xz ca-certificates gnupg2 \
      gcc gcc-c++ make ripgrep neovim python3 python3-pip \
      postgresql postgresql-server postgresql-contrib \
      pkgconf-pkg-config openssl-devel readline-devel zlib-devel \
      libyaml-devel libffi-devel gdbm-devel luarocks fd-find fzf ruby tmux \
      cmake clang-devel
    if ! is_server; then
      sudo_if_needed dnf install -y fontconfig alsa-lib-devel wtype
    fi
    ;;
  pacman)
    sudo_if_needed pacman -S --needed --noconfirm \
      zsh git curl wget unzip tar xz ca-certificates gnupg \
      base-devel ripgrep neovim python python-pip \
      postgresql luarocks fd fzf ruby tmux \
      clang cmake pkgconf
    if ! is_server; then
      sudo_if_needed pacman -S --noconfirm fontconfig alsa-lib wtype
    fi
    ;;
  zypper)
    sudo_if_needed zypper install -y \
      zsh git curl wget unzip tar xz ca-certificates gpg2 \
      gcc gcc-c++ make ripgrep neovim python3 python3-pip \
      postgresql postgresql-server luarocks fd fzf ruby tmux \
      cmake clang libclang-devel pkg-config
    if ! is_server; then
      sudo_if_needed zypper install -y fontconfig alsa-devel wtype
    fi
    ;;
  esac
}

install_go_linux() {
  if have go; then
    return
  fi

  log "Installing Go via $PKG_MGR"

  case "$PKG_MGR" in
  apt | apt-get)
    sudo_if_needed "$PKG_MGR" install -y golang-go
    ;;
  dnf)
    sudo_if_needed dnf install -y golang
    ;;
  pacman)
    sudo_if_needed pacman -S --noconfirm go
    ;;
  zypper)
    sudo_if_needed zypper install -y go
    ;;
  esac
}

install_starship_linux() {
  if have starship; then
    return
  fi
  log "Installing Starship"
  curl -fsSL https://starship.rs/install.sh | sh -s -- -y
}

install_docker_linux() {
  if have docker; then
    log "Docker already installed"
    return
  fi

  log "Installing Docker on Linux"

  case "$PKG_MGR" in
  apt | apt-get)
    sudo_if_needed "$PKG_MGR" install -y ca-certificates curl gnupg
    sudo_if_needed install -m 0755 -d /etc/apt/keyrings

    if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
      curl -fsSL "https://download.docker.com/linux/$(
        . /etc/os-release
        echo "$ID"
      )/gpg" |
        sudo_if_needed gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    fi

    sudo_if_needed chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$(
        . /etc/os-release
        echo "$ID"
      ) \
        $(
        . /etc/os-release
        echo "${VERSION_CODENAME:-$UBUNTU_CODENAME}"
      ) stable" |
      sudo_if_needed tee /etc/apt/sources.list.d/docker.list >/dev/null

    sudo_if_needed "$PKG_MGR" update
    sudo_if_needed "$PKG_MGR" install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
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

  if [[ "${EUID}" -ne 0 ]]; then
    sudo_if_needed usermod -aG docker "$USER" || true
    warn "You may need to log out and back in for Docker group membership to take effect."
  fi
}

install_lazygit_linux() {
  if have lazygit; then
    return
  fi

  log "Installing lazygit from GitHub releases"

  local version tmpdir arch
  version="$(curl -fsSL https://api.github.com/repos/jesseduffield/lazygit/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([^"]+)".*/\1/')"

  case "$(uname -m)" in
  x86_64 | amd64) arch="x86_64" ;;
  arm64 | aarch64) arch="arm64" ;;
  *)
    err "Unsupported architecture for lazygit: $(uname -m)"
    exit 1
    ;;
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

  log "Installing lazydocker"
  ensure_local_bin_on_path
  DIR="$HOME/.local/bin" curl -fsSL \
    https://raw.githubusercontent.com/jesseduffield/lazydocker/master/scripts/install_update_linux.sh | bash
}

install_firacode_nerd_font_linux() {
  local font_dir zip_path tmpdir
  font_dir="$HOME/.local/share/fonts/FiraCode"
  mkdir -p "$font_dir"

  if find "$font_dir" \( -iname "*Nerd*" -o -iname "*FiraCode*" \) | grep -q . 2>/dev/null; then
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

install_hypruler_linux() {
  if have hypruler || [[ -x "$HOME/.cargo/bin/hypruler" ]]; then
    log "Hypruler already installed"
    return
  fi

  if [[ "$PKG_MGR" == "pacman" ]]; then
    if ! have yay; then
      warn "Skipping Hypruler: yay is not installed"
      return
    fi

    log "Installing Hypruler from the AUR"
    yay -S --needed --noconfirm hypruler-bin
    return
  fi

  if [[ -d "$HYPRULER_DIR" ]]; then
    if [[ ! -f "$HYPRULER_DIR/Cargo.toml" ]]; then
      err "Hypruler directory exists but is not a Rust project: $HYPRULER_DIR"
      exit 1
    fi
  else
    log "Cloning Hypruler"
    mkdir -p "$(dirname "$HYPRULER_DIR")"
    git clone "$HYPRULER_REPO" "$HYPRULER_DIR"
  fi

  log "Building Hypruler"
  cargo build --release --manifest-path "$HYPRULER_DIR/Cargo.toml"
  cargo install --path "$HYPRULER_DIR"
}

install_adaptive_brightness() {
  if [[ "$OS" == "macos" ]]; then
    if [[ -d "/Applications/Lumen.app" ]]; then
      log "Lumen already installed"
      return
    fi

    log "Installing Lumen"
    brew install --cask anishathalye/tap/lumen
    return
  fi

  if have wluma; then
    log "wluma already installed"
    return
  fi

  if [[ "$PKG_MGR" == "pacman" ]]; then
    if have yay; then
      log "Installing wluma from the AUR"
      yay -S --needed --noconfirm wluma
      return
    fi

    warn "yay is unavailable; building wluma from source instead"
  fi

  log "Installing wluma build dependencies via $PKG_MGR"
  case "$PKG_MGR" in
  apt | apt-get)
    sudo_if_needed "$PKG_MGR" install -y \
      v4l-utils libv4l-dev libudev-dev libvulkan-dev libdbus-1-dev
    ;;
  dnf)
    sudo_if_needed dnf install -y \
      v4l-utils libv4l-devel systemd-devel vulkan-loader-devel dbus-devel
    ;;
  zypper)
    sudo_if_needed zypper install -y \
      v4l-utils libv4l-devel systemd-devel vulkan-devel dbus-1-devel
    ;;
  pacman)
    sudo_if_needed pacman -S --needed --noconfirm \
      v4l-utils systemd vulkan-headers vulkan-icd-loader dbus pkgconf
    ;;
  esac

  if [[ -d "$WLUMA_DIR" ]]; then
    if [[ ! -f "$WLUMA_DIR/Cargo.toml" ]]; then
      err "wluma directory exists but is not a Rust project: $WLUMA_DIR"
      exit 1
    fi
  else
    log "Downloading wluma $WLUMA_VERSION"
    mkdir -p "$(dirname "$WLUMA_DIR")"
    local archive tmpdir
    tmpdir="$(mktemp -d)"
    archive="$tmpdir/wluma.tar.gz"
    curl -fsSL -o "$archive" \
      "https://github.com/max-baz/wluma/archive/refs/tags/$WLUMA_VERSION.tar.gz"
    tar -xzf "$archive" -C "$tmpdir"
    mv "$tmpdir/wluma-$WLUMA_VERSION" "$WLUMA_DIR"
    rm -rf "$tmpdir"
  fi

  log "Building wluma $WLUMA_VERSION"
  WLUMA_VERSION="$WLUMA_VERSION" cargo build --release --locked --manifest-path "$WLUMA_DIR/Cargo.toml"
  sudo_if_needed install -m 0755 "$WLUMA_DIR/target/release/wluma" /usr/local/bin/wluma
}

#######################################
# macOS packages
#######################################
install_base_packages_macos() {
  log "Installing packages via Homebrew"
  brew update

  brew install \
    zsh git starship lazygit lazydocker ripgrep neovim python go \
    postgresql@16 luarocks fd fzf ruby tmux

  if ! have docker; then
    brew install --cask docker
  fi

  brew tap homebrew/cask-fonts || true
  brew install --cask font-fira-code-nerd-font || true
}

#######################################
# Shared installs
#######################################
install_tailscale() {
  if have tailscale || [[ -d "/Applications/Tailscale.app" ]]; then
    log "Tailscale already installed"
    return
  fi

  if [[ "$OS" == "linux" ]]; then
    log "Installing Tailscale using its official installer"
    curl -fsSL https://tailscale.com/install.sh | sh
    return
  fi

  log "Installing Tailscale standalone app"
  local pkg_path tmpdir
  tmpdir="$(mktemp -d)"
  pkg_path="$tmpdir/Tailscale.pkg"
  curl -fsSL -o "$pkg_path" https://pkgs.tailscale.com/stable/Tailscale-latest-macos.pkg
  sudo_if_needed installer -pkg "$pkg_path" -target /
  rm -rf "$tmpdir"
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
  # Ignore any NVM_DIR inherited from .zshrc/.profile/dotfiles/etc.
  unset NVM_DIR
  export NVM_DIR="$HOME/.nvm"

  if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
    log "Installing nvm"

    mkdir -p "$NVM_DIR"

    curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" |
      PROFILE=/dev/null bash
  fi

  if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
    err "nvm installation failed; expected $NVM_DIR/nvm.sh"
    exit 1
  fi

  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"

  if ! type nvm >/dev/null 2>&1; then
    err "nvm failed to load after sourcing $NVM_DIR/nvm.sh"
    exit 1
  fi

  log "Installing latest LTS Node.js"
  nvm install --lts
  nvm alias default 'lts/*'
  nvm use default

  append_line_if_missing 'export NVM_DIR="$HOME/.nvm"' "$HOME/.zshrc"
  append_line_if_missing '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' "$HOME/.zshrc"
  append_line_if_missing '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' "$HOME/.zshrc"

  export PATH="$NVM_DIR/versions/node/$(nvm version default)/bin:$PATH"
}

install_rust() {
  if [[ -f "$HOME/.cargo/env" ]]; then
    # shellcheck disable=SC1090
    . "$HOME/.cargo/env"
  fi

  if have rustc && have cargo; then
    append_line_if_missing '[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"' "$HOME/.zshrc"
    return
  fi

  log "Installing Rust via rustup"
  curl --proto '=https' --tlsv1.2 -fsSL https://sh.rustup.rs | sh -s -- -y

  if [[ ! -f "$HOME/.cargo/env" ]]; then
    err "Rust installation failed; expected $HOME/.cargo/env"
    exit 1
  fi

  append_line_if_missing '[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"' "$HOME/.zshrc"

  # shellcheck disable=SC1090
  . "$HOME/.cargo/env"
}

install_tree_sitter_cli() {
  if have tree-sitter; then
    return
  fi

  log "Installing tree-sitter-cli"
  npm install -g tree-sitter-cli
}

install_opencode() {
  if have opencode; then
    log "OpenCode already installed"
    return
  fi

  log "Installing OpenCode"
  ensure_local_bin_on_path
  curl -fsSL https://opencode.ai/install | bash
}

install_plannotator() {
  log "Installing Plannotator"
  curl -fsSL https://plannotator.ai/install.sh | bash
}

install_tpm() {
  if [[ -d "$HOME/.tmux/plugins/tpm" ]]; then
    log "Tmux Plugin Manager already installed"
    return
  fi

  log "Installing Tmux Plugin Manager"
  git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
}

install_voxtype_linux() {
  ensure_local_bin_on_path

  if [[ -d "$VOXTYPE_DIR" ]]; then
    if [[ ! -f "$VOXTYPE_DIR/Cargo.toml" ]]; then
      err "Voxtype directory exists but is not a Rust project: $VOXTYPE_DIR"
      exit 1
    fi
  else
    log "Cloning Voxtype"
    mkdir -p "$(dirname "$VOXTYPE_DIR")"
    git clone "$VOXTYPE_REPO" "$VOXTYPE_DIR"
  fi

  # whisper.cpp triggers an internal compiler error in GCC 16 at -O3.
  log "Building Voxtype with Clang"
  # Remove any CMake cache created by a prior GCC build before switching compilers.
  cargo clean --release --manifest-path "$VOXTYPE_DIR/Cargo.toml" -p whisper-rs-sys
  CC=clang CXX=clang++ cargo build --release --manifest-path "$VOXTYPE_DIR/Cargo.toml"
  install -m 0755 "$VOXTYPE_DIR/target/release/voxtype" "$HOME/.local/bin/voxtype"

  log "Downloading Voxtype Whisper model"
  "$HOME/.local/bin/voxtype" setup --download
}

install_try_cli() {
  if have try; then
    return
  fi

  if ! have gem; then
    err "RubyGems is required to install try-cli"
    exit 1
  fi

  log "Installing try-cli via RubyGems"
  if [[ "$OS" == "linux" ]]; then
    sudo_if_needed gem install try-cli
  else
    gem install try-cli
  fi
}

install_skills_cli() {
  if ! have go; then
    err "Go is required to install skills-cli"
    exit 1
  fi

  local go_bin
  go_bin="$(go env GOPATH)/bin"
  append_line_if_missing 'export PATH="$HOME/go/bin:$PATH"' "$HOME/.zshrc"
  export PATH="$go_bin:$PATH"

  log "Installing skills-cli"
  go install github.com/druejaramillo/skills-cli/cmd/skills@latest
}

setup_fd_symlink() {
  if have fd; then
    return
  fi

  if have fdfind; then
    log "Creating fd symlink for fdfind (Debian/Ubuntu)"
    ensure_local_bin_on_path
    ln -sf "$(command -v fdfind)" "$HOME/.local/bin/fd"
  fi
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

  log "Checking out dotfiles"
  if ! "$git_bin" --git-dir="$DOTFILES_DIR/" --work-tree="$HOME" checkout -f; then
    warn "Dotfiles checkout had conflicts. Backing up existing files to $DOTFILES_BACKUP_DIR"
    mkdir -p "$DOTFILES_BACKUP_DIR"

    "$git_bin" --git-dir="$DOTFILES_DIR/" --work-tree="$HOME" checkout 2>&1 |
      grep -E '^\s+\.' |
      awk '{print $1}' |
      while read -r file; do
        mkdir -p "$DOTFILES_BACKUP_DIR/$(dirname "$file")"
        mv "$HOME/$file" "$DOTFILES_BACKUP_DIR/$file"
      done

    "$git_bin" --git-dir="$DOTFILES_DIR/" --work-tree="$HOME" checkout -f
  fi

  "$git_bin" --git-dir="$DOTFILES_DIR/" --work-tree="$HOME" config status.showUntrackedFiles no

  append_line_if_missing "alias dotfiles='$git_bin --git-dir=\$HOME/.dotfiles/ --work-tree=\$HOME'" "$HOME/.zshrc"
}

setup_postgres() {
  log "Starting PostgreSQL where possible"

  if [[ "$OS" == "macos" ]]; then
    brew services start postgresql@16 || warn "Could not start PostgreSQL automatically"
    return
  fi

  case "$PKG_MGR" in
  apt | apt-get)
    sudo_if_needed systemctl enable postgresql || true
    sudo_if_needed systemctl start postgresql || true
    ;;
  dnf | zypper)
    sudo_if_needed systemctl enable postgresql || true
    sudo_if_needed systemctl start postgresql || true
    ;;
  pacman)
    warn "On Arch, initialize PostgreSQL manually if needed:"
    warn "  sudo -iu postgres initdb -D /var/lib/postgres/data"
    warn "  sudo systemctl enable --now postgresql"
    ;;
  esac
}

print_summary() {
  cat <<EOF

Done.

Setup profile: $SETUP_PROFILE

Installed / configured:
  - zsh
  - Oh My Zsh
  - Starship
  - git
  - go
  - rust
  - Tailscale
  - docker
  - lazygit
  - lazydocker
  - tree-sitter-cli
  - C compiler / build tools
  - luarocks
  - ripgrep
  - fd
  - fzf
  - tmux
   - ruby + try-cli
   - skills-cli
   - nvm + Node.js + npm
    - OpenCode
    - Plannotator
    - Tmux Plugin Manager
    - python
   - postgres
   - neovim
   - bare dotfiles checkout
EOF

  if is_server; then
    cat <<'EOF'

Skipped for the server profile:
  - FiraCode Nerd Font and fontconfig
  - Voxtype, its Whisper model, ALSA development headers, and wtype
  - wluma
EOF
  else
    cat <<'EOF'

Also installed:
  - FiraCode Nerd Font
EOF
    if [[ "$OS" == "linux" ]]; then
      printf '%s\n' '  - Voxtype (Linux)'
      if have wluma; then
        printf '%s\n' '  - wluma (Linux)'
      fi
      if have hypruler || [[ -x "$HOME/.cargo/bin/hypruler" ]]; then
        if [[ "$PKG_MGR" == "pacman" ]]; then
          printf '%s\n' '  - Hypruler (AUR)'
        else
          printf '%s\n' '  - Hypruler (source)'
        fi
      fi
    elif [[ -d "/Applications/Lumen.app" ]]; then
      printf '%s\n' '  - Lumen (macOS)'
    fi
  fi

  cat <<EOF

Recommended next steps:
  1. Start a new shell:
       exec zsh
  2. If Docker was newly installed on Linux, log out/in for docker group access
  3. Sign in to Tailscale:
       Linux: sudo tailscale up
       macOS: open -a Tailscale
  4. Verify:
       zsh --version
       starship --version
       git --version
       go version
       rustc --version
       cargo --version
       docker --version
       lazygit --version
       lazydocker --version
       tree-sitter --version
       cc --version
       luarocks --version
       rg --version
       fd --version
       fzf --version
       tmux -V
       ruby --version
       try --version
       skills --version || true
       node --version
       npm --version
       tailscale version || true
       opencode --version || true
       python3 --version
       psql --version
       nvim --version
EOF

  if ! is_server && [[ "$OS" == "linux" ]]; then
    printf '%s\n' '       voxtype --version || true'
  fi
}

#######################################
# Main
#######################################
main() {
  parse_args "$@"
  detect_os

  if is_server && [[ "$OS" != "linux" ]]; then
    err "The --server profile is only supported on Linux. Run without --server for macOS."
    exit 1
  fi

  if [[ "$OS" == "linux" ]]; then
    detect_linux_pkg_mgr
    update_system_packages_linux
    install_base_packages_linux
    install_go_linux
    install_starship_linux
    install_docker_linux
    install_lazygit_linux
    install_lazydocker_linux
    if ! is_server; then
      install_firacode_nerd_font_linux
    fi
    setup_fd_symlink
  else
    install_homebrew_if_needed_macos
    install_base_packages_macos
  fi

  install_tailscale
  install_oh_my_zsh
  install_nvm_node
  install_rust
  if ! is_server; then
    install_adaptive_brightness
  fi
  if [[ "$OS" == "linux" ]] && ! is_server; then
    install_hypruler_linux
  fi
  install_tree_sitter_cli
  install_opencode
  install_plannotator
  install_tpm
  if [[ "$OS" == "linux" ]] && ! is_server; then
    install_voxtype_linux
  fi
  install_try_cli
  install_skills_cli
  clone_dotfiles
  change_default_shell_to_zsh
  setup_postgres
  print_summary
}

main "$@"
