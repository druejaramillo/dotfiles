<!-- markdownlint-configure-file
{"MD013":{"code_blocks":false,"tables":false}}
-->

# Dotfiles

Personal dotfiles managed with a bare Git repository and `$HOME` as its
working tree. No separate dotfile manager is required.

The approach follows the
[bare-repository technique](https://www.atlassian.com/git/tutorials/dotfiles).
Tracked configuration files live at their real paths. Upstream agent skills
use generated directory links to separate Git checkouts.

[AGENT.md](AGENT.md) documents the Pi skills, commands, and usage examples.

---

## How it works

```text
~/.dotfiles/   ← bare git repository (no working tree of its own)
~/             ← the working tree
```

The `dotfiles` alias is defined as:

```bash
alias dotfiles='git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'
```

`status.showUntrackedFiles no` is set locally on the repository.
`dotfiles status` shows tracked files rather than every file in `$HOME`.
New files still need an explicit `dotfiles add`.

---

## Setup

### Automated (recommended)

`dev-setup.sh` prepares the machine and restores configuration.
`git-setup.sh` handles Git identity and signing separately.

**Step 1: Install tools, restore dotfiles, and link upstream skills.**

Run as your normal user. The full bootstrap needs network access and may
request `sudo`. It supports macOS through Homebrew and Linux with apt,
apt-get, dnf, pacman, or zypper.

> Back up existing home configuration before a full bootstrap. The script
> uses `git checkout -f`, which can overwrite conflicting untracked files.
> An existing dotfiles repository with uncommitted tracked changes stops the
> checkout. That guard runs after tool installation, not before the whole
> script. The fallback conflict-backup code is not a general backup guarantee.

For a personal development machine:

```bash
bash dev-setup.sh
```

The full run:

1. Installs the platform packages and shared development tools listed below.
   On Arch, package setup includes a full system upgrade.
2. Installs Tailscale, shell tools, Node LTS through nvm, Rust, Pi,
   Plannotator, tmux's plugin manager, and try-cli as applicable.
3. Adds personal desktop tools when using the default profile.
4. Clones or reuses `~/.dotfiles` and restores its tracked files into `$HOME`.
5. Clones or reuses the upstream skill sources and generates the `pstack/`,
   `cursor/`, and `mattpocock/` catalog links.
6. Builds Voxtype with CPU Parakeet support and restores Omarchy plugins on
   applicable personal Linux systems.
7. Attempts to set zsh as the login shell and start PostgreSQL.
   Arch PostgreSQL initialization remains a manual step.

For a Linux server accessed over SSH:

```bash
bash dev-setup.sh --server
```

The server profile keeps the shared development and terminal tools, Docker,
PostgreSQL, Tailscale, the complete dotfiles checkout, and upstream skill
links. It skips restic, caldir, renCal, fonts, Voxtype and its model,
desktop audio/input dependencies, Hypruler, Omarchy plugins, and brightness
tools. It does not filter desktop configuration files out of the checkout.
`--server` is Linux-only.

For upstream skill links only, with Git already installed:

```bash
bash dev-setup.sh --agent-skills-only
```

This bypasses package installation, services, shell changes, and dotfiles
checkout. It prepares only the upstream checkouts and generated links.
It does **not** restore owned skills, install tool runtimes, or migrate old
flat skill copies. See [Agent skill restoration](#agent-skill-restoration).

`bash dev-setup.sh --help` prints the supported options.

After a full run, start a new shell to load nvm and Node. If Docker was newly
installed on Linux, log out and back in for group membership. Tailscale,
model providers, calendar/email accounts, and backup destinations need their
own sign-in or configuration. Installing a skill does not authenticate or
install every tool it describes.

The full bootstrap is not a dry run or an all-or-nothing restore. Some steps
skip existing installations, while others update packages or rebuild tools.
Existing dotfiles and skill-source repositories are reused without fetching
new commits.

**Step 2: Configure Git identity, GPG signing, and GitHub CLI.**

```bash
bash git-setup.sh --name "Your Name" --email "you@example.com"
```

This installs and configures git, gh, and gnupg. It authenticates with GitHub
through the browser, generates a GPG key, configures signed commits and tags,
and uploads the public key to GitHub.

Options:

| Flag | Default | Description |
| --- | --- | --- |
| `--name` | _(required)_ | Git `user.name` |
| `--email` | _(required)_ | Git `user.email` |
| `--passphrase VALUE` | none | Passphrase for the GPG key |
| `--key-type TYPE` | `RSA` | GPG key and subkey type |
| `--key-length BITS` | `4096` | GPG key and subkey length |
| `--expire VALUE` | `0` (never) | GPG key expiry, e.g. `1y`, `2y` |
| `--force` | off | Delete and regenerate the GPG key if one already exists |
| `--github-host HOST` | `github.com` | For GitHub Enterprise |
| `--package-manager VALUE` | auto-detected | Force a specific package manager |

`git-setup.sh` reuses an existing key for your email. `--force` deletes and
regenerates that key.

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

Before checkout, you can review untracked files interactively.
This lists untracked files across `$HOME`, not just checkout conflicts:

```bash
cd "$HOME"
dotfiles clean -i
```

This is the bare-repository equivalent of `git clean -i`. Selected files are
permanently deleted. `dotfiles clean -i -d` also includes untracked
directories. Skip this step to keep those files and back up conflicts instead.

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

**7. Generate upstream agent skill links:**

```bash
bash "$HOME/dev-setup.sh" --agent-skills-only
```

This supplies the upstream groups after the owned files are restored.
Install any missing tool-owned resources separately. In Pi, `/reload`
refreshes the catalog. See [AGENT.md](AGENT.md) for the complete skill guide.

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

## What `dev-setup.sh` installs

"Both" means the personal profile on Linux/macOS and the Linux server
profile, subject to the platform restrictions shown. Desktop steps can skip
unsupported or unavailable dependencies, such as AUR installs without `yay`.

| Tool | Purpose | Profile / platform |
| --- | --- | --- |
| zsh + Oh My Zsh + Starship | Shell and prompt | Both |
| git | Version control | Both |
| Go + Rust (rustup) | Development toolchains | Both |
| C/C++ build tools, CMake, Clang, pkg-config | Native builds | Linux |
| Docker + lazydocker | Containers | Both |
| PostgreSQL | Database | Both |
| Tailscale | Private networking | Both |
| restic | Backups | Personal |
| lazygit | Terminal Git UI | Both |
| nvm + Node.js (LTS) + npm | Node version management | Both |
| tree-sitter-cli | Syntax parsing for Neovim | Both |
| neovim | Editor | Both |
| ripgrep, fd, fzf | Search and navigation | Both |
| tmux + Tmux Plugin Manager | Terminal multiplexer | Both |
| Ruby + try-cli | Temporary workspaces | Both |
| luarocks | Lua package manager | Both |
| Python 3 | Scripting | Both |
| Pi + Plannotator | AI coding agent and plan review | Both |
| Dotfiles bare checkout; default shell → zsh | Config files and login shell | Both |
| Upstream agent sources and grouped skill links | Full P Stack, three Cursor helpers, nine Matt skills | Both; also available through `--agent-skills-only` |
| Strata | Terminal workspace tool | Arch Linux |
| FiraCode Nerd Font | Terminal font | Personal |
| caldir + renCal | Calendar tools | Personal |
| Voxtype + Parakeet model; ALSA headers + `wtype` | Local voice dictation | Personal Linux |
| Hypruler | Hyprland window rules helper | Personal Linux |
| Omarchy plugins and dependencies | Desktop integrations (HEY, AirPods/librepods, Caldir, Home Assistant, Time Machine) | Personal Omarchy Linux |
| wluma (Linux) / Lumen (macOS) | Adaptive brightness | Personal |

---

## Agent skill restoration

The full bootstrap restores owned skills and references from dotfiles, then
runs the same source/link step as `--agent-skills-only`.

The upstream repositories live outside the catalog:

| Source | Checkout | Generated catalog selection |
| --- | --- | --- |
| [cursor/plugins](https://github.com/cursor/plugins) | `~/.local/share/agent-sources/cursor-plugins` | `pstack/` links the entire `pstack/skills` tree; `cursor/` links three selected team-kit skills. |
| [mattpocock/skills](https://github.com/mattpocock/skills) | `~/.local/share/agent-sources/mattpocock-skills` | `mattpocock/` links the nine skills selected in `dev-setup.sh`. |

The catalog is `~/.agents/skills/`. Root skills, `concepts/`, `design/`, shared
references, and Pi guidance come from their owned dotfiles or tool installers.
Whole-directory links preserve upstream references, scripts, and assets.
The [complete inventory and usage guide](AGENT.md) lists every skill.

The source/link step reuses correct existing checkouts and links. It does not
pull, reset, switch refs, or edit upstream skill bodies. New clones follow
the upstream default branches, so a fresh machine may get newer skills than
the reviewed local inventory. This is not a version-pinned restore.

Unexpected source origins, missing selected skills, conflicting destinations,
and old flat upstream copies cause an error. Existing conflicting content is
left in place for review, not deleted or migrated automatically. A failed
run can already have created source checkouts; it is not transactional.

Generated links and checkouts are excluded through `~/.dotfiles/info/exclude`.
Do not put these exclusions in a `.gitignore` inside the skill catalog.
Pi honors catalog ignore files, which would hide the linked skills.

For another machine to restore your owned setup, its files and retired-path
removals must first be committed and published through dotfiles. The
skills-only option supplies upstream groups, not those personal files or
external tool installations. Source updates are deliberate Git operations,
followed by catalog checks and `/reload` in Pi.

---

## Check the bootstrap

From the repository's working tree, run:

```bash
bash -n dev-setup.sh
bash tests/dev-setup-skills-test.sh
bash tests/dev-setup-desktop-test.sh
```

The skill fixtures use local Git repositories and temporary homes with network
transports disabled. The desktop fixtures mock installers and services.
These checks do not run the full machine bootstrap or verify every upstream
agent workflow.

---

## Notes

### GPG key for signed commits

`git-setup.sh` generates a GPG key and uploads it to GitHub. The public key is
saved to `~/.gnupg/github-gpg-key.pub`. If the upload failed, add it manually:

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

### Re-run git-setup.sh

An existing GPG key for your email is reused. `--force` deletes that key and
generates a new one:

```bash
bash git-setup.sh --name "Your Name" --email "you@example.com" --force
```
