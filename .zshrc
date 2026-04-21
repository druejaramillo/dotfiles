export PATH
export TERM=xterm

# Oh-My-Zsh
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="robbyrussell"
plugins=(zsh-interactive-cd colorize cp rand-quote)

source $ZSH/oh-my-zsh.sh

# Dotfiles
alias dotfiles='/usr/bin/git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'

# fzf
source <(fzf --zsh)
export FZF_DEFAULT_COMMAND='rg --files --hidden --no-ignore --glob "!.git"'
export FZF_DEFAULT_OPTS='--height=50% --reverse --border --prompt="  " --ansi'

_fzf_compgen_path() {
  rg --files --hidden --no-ignore-vcs "${1:-$HOME}"
}

_fzf_compgen_dir() {
  rg --files --null --hidden --no-ignore-vcs --glob "${1:-$HOME}" \
    | xargs -0 dirname \
    | sort -u
}

# Neovim
alias vim='nvim'
export EDITOR='nvim'

export PATH="$PATH:/opt/nvim-linux-x86_64/bin"

# Docker alias commands
alias d='docker'
alias dc='docker compose'
alias dsp='docker system prune'
alias lzd='lazydocker'

# SSH into my local web server
alias ssh-puter='ssh -i ~/.ssh/id_ed25519 drue@192.168.40.165'

# SSH into my Hetzner web server
alias ssh-hetzner='ssh -i ~/.ssh/hetzner-puter root@5.78.180.182'

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

export GPG_TTY=$(tty)
. "$HOME/.cargo/env"

eval "$(starship init zsh)"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
