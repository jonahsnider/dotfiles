# lazygit
abbr --add lg lazygit

# lazydocker
abbr --add ld lazydocker

# Git
abbr --add g git
abbr --add ga "git add"
abbr --add gA "git add -A"
abbr --add gcm "git commit -m"
abbr --add gp "git pull"
abbr --add gP "git push"
abbr --add gr "git rebase"
abbr --add gc "git checkout"
abbr --add gR "git reset"
abbr --add gb "git branch"
abbr --add gs "git switch"
abbr --add gsm git_switch_main

# Graphite
abbr --add gtA "gt add -A"
abbr --add gtm "gt modify"
abbr --add gts "gt sync"
abbr --add gtS "gt submit"
abbr --add gtSS "gt submit --stack"
abbr --add gtSs "gt submit --stack"
abbr --add gtc "gt continue"
abbr --add gtr "gt restack"

# GitHub
abbr --add gpc "gh pr checkout"
abbr --add gpC "gh pr create --web"
abbr --add gpv "gh pr view --web"
abbr --add grv "gh repo view --web"
abbr --add grc "gh repo clone"
abbr --add gpl "gh pr list"

# Watson
if type -q watson
  abbr --add w watson
  abbr --add ws "watson start"
  abbr --add wS "watson stop"
  abbr --add wC "watson cancel"
  abbr --add wr "watson report"
  abbr --add wl "watson log"
  abbr --add we "watson edit"
  abbr --add wst "watson status"
  abbr --add wR "watson remove"
end

# Yarn
abbr --add y yarn
abbr --add yi "yarn install"
abbr --add ya "yarn add"
abbr --add yR "yarn remove"
abbr --add ys "yarn start"
abbr --add ysd "yarn start:dev"
abbr --add yp "yarn preview"
abbr --add yt "yarn test"
abbr --add yl "yarn lint"
abbr --add yL "yarn lint:fix"
abbr --add yS "yarn style --write"
abbr --add yb "yarn build"
abbr --add yd "yarn dev"
abbr --add yw "yarn watch"
abbr --add yf "yarn format"
abbr --add yF "yarn format:write"

# Bun
abbr --add b bun
abbr --add bi "bun install"
abbr --add ba "bun add"
abbr --add bR "bun remove"
abbr --add bs "bun start"
abbr --add bsd "bun start:dev"
abbr --add bp "bun preview"
abbr --add bt "bun test"
abbr --add bl "bun lint"
abbr --add bL "bun lint:fix"
abbr --add bS "bun style --write"
abbr --add bb "bun run build"
abbr --add bd "bun dev"
abbr --add bw "bun watch"
abbr --add bx "bunx"
abbr --add bf "bun format"
abbr --add bF "bun format:write"

# pnpm
abbr --add p pnpm
abbr --add pi "pnpm install"
abbr --add pa "pnpm add"
abbr --add pR "pnpm remove"
abbr --add ps "pnpm start"
abbr --add psd "pnpm start:dev"
abbr --add pp "pnpm preview"
abbr --add pt "pnpm test"
abbr --add pl "pnpm lint"
abbr --add pL "pnpm lint:fix"
abbr --add pS "pnpm style --write"
abbr --add pb "pnpm build"
abbr --add pd "pnpm dev"
abbr --add pw "pnpm watch"
abbr --add px "pnpx"
abbr --add pf "pnpm format"
abbr --add pF "pnpm format:write"

# Docker
abbr --add d docker
abbr --add db "docker build"
abbr --add dc "docker compose"
abbr --add dcp "docker compose pull"
abbr --add dcps "docker compose ps"
abbr --add dcl "docker compose logs"
abbr --add dcu "docker compose up"
abbr --add dcD "docker compose down"
abbr --add dcS "docker compose stop"
abbr --add dcb "docker compose build"

# cd
abbr --add cdp "cd ~/programming"
if test -d ~/programming/sanity
  abbr --add cdps "cd ~/programming/sanity"
end
if test -d ~/programming/zws
  abbr --add cdpz "cd ~/programming/zws"
end
if test -d ~/programming/team581
  abbr --add cdpt "cd ~/programming/team581"
end

# Brew
if type -q brew
  abbr --add br brew
  abbr --add bru "brew update"
  abbr --add brU "brew upgrade"
  abbr --add brt "brew tap"
  abbr --add bri "brew install"
end

# apt
if type -q apt; and test (uname) != "Darwin"
  abbr --add a apt
  abbr --add ai "apt install"
  abbr --add aR "apt remove"
  abbr --add au "apt update"
  abbr --add aU "apt upgrade"
end

# sudo
abbr --add s sudo

# open
abbr --add o open

# FFMPEG
abbr --add ff ffmpeg

# squoosh
abbr --add sq squoosh

# nano
abbr --add N nano

# cURL
abbr --add cu curl

# clear
abbr --add c "clear -x"

# Biome
abbr --add biome "yarn biome"
abbr --add r "yarn biome"
abbr --add rc "yarn biome check"
abbr --add rC "yarn biome check --apply"
abbr --add rt "yarn biome test"

# Turbo
# abbr --add turbo "yarn turbo"
abbr --add t "turbo"
abbr --add tr "turbo run"

if test -d ~/programming/voiceflow/database-cli
  abbr --add dbcli ~/programming/voiceflow/database-cli/bin/run
  abbr --add vfdb ~/programming/voiceflow/database-cli/bin/run
end

# Python
abbr --add py python

# Ruby
abbr --add rb ruby

# Node.js
abbr --add n node

# Gradle wrapper
abbr --add gw ./gradlew
abbr --add gwa "./gradlew assemble"
abbr --add gwb "./gradlew build"
abbr --add gwS "./gradlew spotlessApply"
abbr --add gwt "./gradlew test"

# Go
abbr --add gor "go run"
abbr --add gom "go mod"
abbr --add gob "go build"
abbr --add gomt "go mod tidy"

# Just
abbr --add j just
abbr --add jb "just build"
abbr --add jt "just test"
abbr --add jl "just lint"
abbr --add jL "just lint-fix"

# yt-dlp
abbr --add ytdlp "yt-dlp"

# EdgeDB
abbr --add edb "edgedb"

# Kaitai Struct Compiler
abbr --add ksc "kaitai-struct-compiler"

# Google Java Format
abbr --add gjf "google-java-format"

# Swift
abbr --add sw swift

# Mise
abbr --add m mise
abbr --add ml "mise lint"
abbr --add mL "mise lint:fix"
abbr --add mb "mise build"
abbr --add mt "mise test"
abbr --add mf "mise format"
abbr --add mF "mise format:fix"
abbr --add md "mise dev"
abbr --add mr "mise run"

# Cursor
abbr --add cur cursor

# scc
abbr --add sloc scc

alias clod claude
