# Dotfiles

Personal dotfiles managed with a bare Git repository — no symlinks, no extra tooling, just Git.

The approach comes from a [technique popularized on Hacker News](https://www.atlassian.com/git/tutorials/dotfiles): a bare repo lives at `~/.dotfiles` and a shell alias (`dotfiles`) acts as a drop-in for `git`, with `$HOME` as the working tree. Files are tracked at their real paths — no symlink indirection, no dedicated dotfile manager required.

---

## How it works

```
~/.dotfiles/   ← bare git repository (no working tree of its own)
~/             ← the working tree
```

The `dotfiles` alias is defined as:

```bash
alias dotfiles='git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'
```

`showUntrackedFiles no` is set locally on the repo, so running `dotfiles status` only shows files you have explicitly added — not every file in `$HOME`.

---

## Setup

### Automated (recommended)

Two scripts handle everything on a fresh machine.

**Step 1 — Install tools and check out dotfiles:**

```bash
bash dev-setup.sh
```

The default personal profile installs the complete local development environment, including Voxtype, FiraCode Nerd Font, Hypruler, and wluma (Linux), or Lumen (macOS). It then clones this dotfiles repo as a bare repo to `~/.dotfiles` and checks out all tracked files into `$HOME`, backing up any conflicts to `~/.dotfiles-backup-<timestamp>/`. Finally it sets zsh as the default shell.

For a Linux server accessed over SSH, use the server profile:

```bash
bash dev-setup.sh --server
```

It retains the development and terminal tooling (including tmux/TPM, skills-cli, OpenCode, and Plannotator), Docker, PostgreSQL, Tailscale, and the complete dotfiles checkout. It skips FiraCode Nerd Font and `fontconfig`, plus Voxtype, its Whisper model, its ALSA development dependency, `wtype`, Hypruler, and wluma. The `--server` profile is Linux-only; macOS continues to use the default profile.

> **Note:** nvm and node will not be available until you start a new shell after the script finishes.

> **Note:** If Docker was newly installed on Linux, log out and back in for the docker group to take effect.

**Step 2 — Configure Git identity, GPG signing, and GitHub CLI:**

```bash
bash git-setup.sh --name "Your Name" --email "you@example.com"
```

This installs and configures git, gh, and gnupg; authenticates with GitHub (browser); generates a GPG key; configures Git to sign all commits and tags; and uploads the public key to GitHub.

Options:

| Flag | Default | Description |
|------|---------|-------------|
| `--name` | _(required)_ | Git `user.name` |
| `--email` | _(required)_ | Git `user.email` |
| `--passphrase VALUE` | none | Passphrase for the GPG key |
| `--expire VALUE` | `0` (never) | GPG key expiry, e.g. `1y`, `2y` |
| `--force` | off | Delete and regenerate the GPG key if one already exists |
| `--github-host HOST` | `github.com` | For GitHub Enterprise |
| `--package-manager VALUE` | auto-detected | Force a specific package manager |

Re-running `git-setup.sh` is safe. Use `--force` to start fresh with a new GPG key.

---

### Manual

If you prefer to set up without the scripts:

**Prerequisites:** `git` must be installed.

**1. Clone the bare repo:**

```bash
git clone --bare https://github.com/druejaramillo/dotfiles.git $HOME/.dotfiles
```

**2. Define the alias in your current shell:**

```bash
alias dotfiles='git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'
```

**3. Optionally remove conflicting files:**

Before checking out the dotfiles, you can interactively review pre-existing, untracked files in `$HOME` that may conflict with them:

```bash
cd "$HOME"
dotfiles clean -i
```

This is the bare-repository equivalent of `git clean -i`. Select only files you are certain you no longer need, since selected files are permanently deleted. To include untracked directories, use `dotfiles clean -i -d` and review the choices especially carefully. Skip this step if you want to keep the files and back them up instead.

**4. Check out the dotfiles:**

```bash
dotfiles checkout
```

If existing files would be overwritten, Git will error. Back them up and retry:

```bash
mkdir -p ~/.dotfiles-backup
dotfiles checkout 2>&1 | grep -E '^\s+\.' | awk '{print $1}' | \
  xargs -I{} sh -c 'mkdir -p ~/.dotfiles-backup/$(dirname {}) && mv $HOME/{} ~/.dotfiles-backup/{}'
dotfiles checkout
```

**5. Hide untracked files:**

```bash
dotfiles config --local status.showUntrackedFiles no
```

**6. Persist the alias** (add to `~/.zshrc` or `~/.bashrc`):

```bash
alias dotfiles='git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'
```

---

## Day-to-day usage

Use `dotfiles` exactly as you would use `git`:

```bash
dotfiles status
dotfiles add ~/.zshrc
dotfiles commit -m "Update zshrc"
dotfiles push

dotfiles add ~/.config/nvim/init.lua
dotfiles commit -m "Add neovim config"
dotfiles push

dotfiles log --oneline
dotfiles diff HEAD~1
```

To track a new file that lives anywhere under `$HOME`:

```bash
dotfiles add ~/.config/starship.toml
dotfiles commit -m "Add starship config"
dotfiles push
```

---

## What dev-setup.sh installs

| Tool | Purpose | Profile |
|------|---------|---------|
| zsh + Oh My Zsh | Shell | Both |
| Starship | Shell prompt | Both |
| git | Version control | Both |
| Go | Go toolchain | Both |
| Rust (rustup) | Rust toolchain | Both |
| C compiler, CMake, Clang, pkg-config | Native build tools | Both |
| Docker + lazydocker | Containers | Both |
| PostgreSQL | Database | Both |
| Tailscale | Private networking | Both |
| lazygit | Terminal Git UI | Both |
| nvm + Node.js (LTS) + npm | Node version management | Both |
| tree-sitter-cli | Syntax parsing (neovim) | Both |
| neovim | Editor | Both |
| ripgrep | Fast grep | Both |
| fd | Fast find | Both |
| fzf | Fuzzy finder | Both |
| tmux + Tmux Plugin Manager | Terminal multiplexer | Both |
| Ruby + try-cli | Try workspace manager | Both |
| skills-cli | Agent skills CLI | Both |
| luarocks | Lua package manager | Both |
| Python 3 | Scripting | Both |
| OpenCode | AI coding agent | Both |
| Plannotator | AI plan review | Both |
| Dotfiles bare checkout | Config files into `$HOME` | Both |
| Default shell → zsh | Login shell | Both |
| FiraCode Nerd Font (+ fontconfig on Linux) | Terminal font | Personal |
| Voxtype + Whisper model | Local voice dictation | Personal Linux |
| ALSA dev headers + wtype | Voxtype audio/input deps | Personal Linux |
| Hypruler | Hyprland window rules helper | Personal Linux |

---

## Notes

**GPG key for signed commits**

`git-setup.sh` generates a GPG key and uploads it to GitHub automatically. The public key is saved to `~/.gnupg/github-gpg-key.pub` — if the upload failed, you can add it manually:

```bash
gh gpg-key add ~/.gnupg/github-gpg-key.pub --title "$(hostname)-$(date +%Y-%m-%d)"
```

Or via the GitHub web UI under **Settings → SSH and GPG keys**.

To verify signed commits are working:

```bash
gpg --list-secret-keys --keyid-format=long
git config --global --list | grep -E 'signingkey|gpgsign'
gh auth status
```

**Re-running git-setup.sh**

Safe to re-run at any time. If a GPG key already exists for your email it will be reused. Pass `--force` to delete it and generate a new one:

```bash
bash git-setup.sh --name "Your Name" --email "you@example.com" --force
```
