export PATH
export TERM=xterm

# Oh-My-Zsh
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="robbyrussell"
plugins=(zsh-interactive-cd colorize cp rand-quote)

source $ZSH/oh-my-zsh.sh

# File system
if command -v eza &> /dev/null; then
  alias ls='eza -lh --group-directories-first --icons=auto'
  alias lsa='ls -a'
  alias lt='eza --tree --level=2 --long --icons --git'
  alias lta='lt -a'
fi

# Dotfiles
alias dotfiles='/usr/bin/git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'
# Honestly, I'm really lazy and hate typing these out every time
alias dfs='dotfiles status'
alias dfd='dotfiles diff'
alias dfr='dotfiles reset'
alias dfa='dotfiles add'
alias dfc='dotfiles commit'
alias dfp='dotfiles push'
alias dfl='dotfiles pull'

# Git
alias gs='git status'
alias gd='git diff'
alias gr='git reset'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git pull'

# fzf
source <(fzf --zsh)
export FZF_DEFAULT_COMMAND='fd --type f --hidden --no-ignore-vcs'
export FZF_DEFAULT_OPTS='--height=50% --reverse --border --prompt="  " --ansi'

_fzf_compgen_path() {
  fd --type f --hidden --no-ignore-vcs . "${1:-$HOME}"
}

_fzf_compgen_dir() {
  fd --type d --hidden --no-ignore-vcs . "${1:-$HOME}"
}

# Neovim
alias vim='nvim'
export EDITOR='nvim'

export PATH="$PATH:/opt/nvim-linux-x86_64/bin"

# Add Mason bin folder to PATH
export PATH="$PATH:$HOME/.local/share/nvim/mason/bin"

# OpenCode alias command
function oc() {
  if [[ -n "${TMUX:-}" ]]; then
    local env_commands

    env_commands="$(
      {
        command tmux show-environment -s PLANNOTATOR_REMOTE 2>/dev/null
        command tmux show-environment -s PLANNOTATOR_PORT 2>/dev/null
      }
    )"

    if [[ -n "${env_commands}" ]]; then
      eval "$env_commands"
    fi
  fi

  command opencode "$@"
}

# Docker alias commands
alias d='docker'
alias dc='docker compose'
alias dsp='docker system prune'
alias lzd='lazydocker'

# Tmux alias commands
alias tml='tmux ls'
alias tmd='tmux detach'
alias tmn='tmux new'
alias tmk='tmux kill-session'
alias tmlk='tmux list-keys'

function tma() {
  if [[ -n "${SSH_CONNECTION:-}" || -n "${SSH_TTY:-}" ]]; then
    export PLANNOTATOR_REMOTE=1
    export PLANNOTATOR_PORT='19432-19463'
  else
    export PLANNOTATOR_REMOTE=0
    unset PLANNOTATOR_PORT
  fi

  command tmux attach "$@"
}

# SSH into my local web server
alias ssh-puter='ssh -i ~/.ssh/id_ed25519 drue@100.95.207.59'

# SSH into my Hetzner web server
alias ssh-hetzner='ssh -i ~/.ssh/hetzner-puter root@100.123.104.114'

# Add Go bin directory to PATH
export PATH="$PATH:/usr/local/go/bin"
export PATH="$PATH:$(go env GOPATH)/bin"

# Add to pkg config path
export PKG_CONFIG_PATH="$PKG_CONFIG_PATH:/usr/local/lib/pkgconfig"

# Add ffprobe to path
PATH="/usr/local/bin/ffprobe:$PATH"
export PATH

# Add PDF Notes package to Python path
PYTHONPATH="/Users/user/Documents/Coding/Python:$PYTHONPATH"
export PYTHONPATH

# Setting PATH for Python 3.11
PATH="/Library/Frameworks/Python.framework/Versions/3.11/bin:${PATH}"
export PATH

export PATH="$HOME/.local/bin:$PATH"
export PATH="/usr/local/opt/python@3.12/bin:$PATH"
export PATH="/usr/local/bin:$PATH"
alias python3="/usr/local/bin/python3.12"

# Set GPG_TTY to current tty
export GPG_TTY=$(tty)

# Source Rust env
. "$HOME/.cargo/env"

# Starship
eval "$(starship init zsh)"

# Try
eval "$(try init ~/Work/tries)" || true

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

. "$HOME/.local/share/../bin/env"
