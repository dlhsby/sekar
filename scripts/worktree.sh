#!/bin/bash
# SEKAR parallel git worktrees — spin up isolated checkouts for concurrent work
# without colliding on dev-server ports or shared Docker infra.
#
# Usage: ./scripts/worktree.sh [create] <name> [--base <branch>] [--be-port N] [--web-port N]
#        ./scripts/worktree.sh cleanup|remove|rm [<name>] [--force|-f]
#        ./scripts/worktree.sh list|ls
#
#   create   fetch <base> (default: main), add a worktree at
#            .claude/worktrees/<slug> on a new `worktree-<slug>` branch, copy
#            the main checkout's .env.local files, wire unique BE_PORT/WEB_PORT
#            (leaving DATABASE_*/AWS_*/REDIS_* pointed at the ONE shared Docker
#            infra), then npm ci apps/be + apps/web + apps/mobile + root.
#   cleanup  remove a worktree + delete its branch. Infers <name> from cwd if
#            you're inside .claude/worktrees/<name>. Warns on uncommitted work
#            or unpushed commits unless --force.
#   list     table of every worktree: name, branch, wired ports, clean/dirty,
#            commits ahead of the default branch.
#
# All worktrees share the SAME Docker stack (Postgres/MinIO/Redis) as the main
# checkout — never start infra from inside a worktree.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

WORKTREES_DIR="$ROOT/.claude/worktrees"
APPS=(be web mobile)

usage() {
  cat <<'USAGE'
worktree.sh — parallel git worktrees for concurrent SEKAR dev work.

  ./scripts/worktree.sh create <name> [--base <branch>] [--be-port N] [--web-port N]
      Cut a new worktree from origin/<base> (default: main), copy env files,
      auto-pick free BE_PORT/WEB_PORT (or use the ones you pass), install deps
      in apps/be, apps/web, apps/mobile + root.

  ./scripts/worktree.sh cleanup [<name>] [--force|-f]   (aliases: remove, rm)
      Remove a worktree + delete its branch. <name> is inferred from your cwd
      if you're inside .claude/worktrees/<name>. Prompts on uncommitted/unpushed
      work unless --force.

  ./scripts/worktree.sh list   (alias: ls)
      Table of every worktree: branch, ports, clean/dirty, commits ahead.

Every worktree talks to the SAME Docker infra (Postgres/MinIO/Redis) as the
main checkout — don't run scripts/infra.sh from inside a worktree.
USAGE
}

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

default_base_branch() {
  local ref
  ref="$(git -C "$ROOT" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)" || { echo "main"; return; }
  echo "${ref#origin/}"
}

port_in_use() {
  local port="$1"
  if command_exists lsof; then
    lsof -ti tcp:"$port" -sTCP:LISTEN >/dev/null 2>&1 && return 0
  fi
  return 1
}

# Every port already wired to EITHER service (be PORT or web WEB_PORT), across
# the main checkout and every worktree — BE_PORT and WEB_PORT share one pool
# so the two can never collide with each other, not just within their own kind.
collect_used_ports() {
  local f
  for f in "$ROOT/apps/be/.env.local" "$ROOT/apps/web/.env.local" "$WORKTREES_DIR"/*/apps/be/.env.local "$WORKTREES_DIR"/*/apps/web/.env.local; do
    [ -f "$f" ] || continue
    # env_file_value's tr -d '[:space:]' strips its own trailing newline, so
    # bare calls in a loop run on into one line — force one value per line.
    printf '%s\n' "$(env_file_value "$f" PORT)"
    printf '%s\n' "$(env_file_value "$f" WEB_PORT)"
  done
}

pick_free_port() { # START [EXTRA_RESERVED_PORT...]
  local port="$1"; shift
  local extra="$*"
  local used; used="$(collect_used_ports)"
  while echo "$used" | grep -qx "$port" || echo "$extra" | tr ' ' '\n' | grep -qx "$port" || port_in_use "$port"; do
    port=$((port + 1))
  done
  echo "$port"
}

cmd_create() {
  local name="" base="" be_port="" web_port=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --base) base="$2"; shift 2 ;;
      --be-port) be_port="$2"; shift 2 ;;
      --web-port) web_port="$2"; shift 2 ;;
      -h|--help) usage; exit 0 ;;
      -*) print_error "Unknown flag: $1"; exit 1 ;;
      *) name="$1"; shift ;;
    esac
  done

  if [ -z "$name" ] && [ -t 0 ]; then
    read -r -p "Name for this worktree: " name
  fi
  [ -n "$name" ] || { print_error "A name is required: ./scripts/worktree.sh create <name>"; exit 1; }

  local slug; slug="$(slugify "$name")"
  [ -n "$slug" ] || { print_error "Name slugified to empty string — pick something with letters/digits"; exit 1; }
  base="${base:-$(default_base_branch)}"
  local branch="worktree-$slug"
  local dir="$WORKTREES_DIR/$slug"

  [ -e "$dir" ] && { print_error "Worktree dir already exists: $dir"; exit 1; }
  git -C "$ROOT" show-ref --verify --quiet "refs/heads/$branch" && {
    print_error "Branch $branch already exists — pick a different name or clean it up first"; exit 1;
  }

  print_info "Fetching origin/$base..."
  git -C "$ROOT" fetch origin "$base"

  print_info "Creating worktree at $dir (branch $branch, from origin/$base)..."
  mkdir -p "$WORKTREES_DIR"
  git -C "$ROOT" worktree add -b "$branch" "$dir" "origin/$base"

  print_info "Picking ports..."
  be_port="${be_port:-$(pick_free_port 3000)}"
  web_port="${web_port:-$(pick_free_port 3001 "$be_port")}"
  if [ "$be_port" = "$web_port" ]; then
    print_error "BE_PORT and WEB_PORT resolved to the same port ($be_port) — pass --be-port/--web-port explicitly"
    exit 1
  fi
  print_success "BE_PORT=$be_port WEB_PORT=$web_port"

  print_info "Copying local env files..."
  for app in "${APPS[@]}"; do
    local src="$ROOT/apps/$app/.env.local"
    local dst="$dir/apps/$app/.env.local"
    if [ -f "$src" ]; then
      cp "$src" "$dst"
      print_success "apps/$app/.env.local copied"
    else
      print_warning "apps/$app/.env.local not found in main checkout — skipping"
    fi
  done

  # Backend: bind port + make sure CORS allows the new web port.
  local be_env="$dir/apps/be/.env.local"
  if [ -f "$be_env" ]; then
    set_env_key "$be_env" PORT "$be_port"
    local cors; cors="$(env_file_value "$be_env" CORS_ORIGIN)"
    local web_origin="http://localhost:$web_port"
    if [ -n "$cors" ] && ! printf '%s' "$cors" | grep -qF "$web_origin"; then
      set_env_key "$be_env" CORS_ORIGIN "$cors,$web_origin"
    fi
  fi

  # Web: bind port + point at this worktree's backend.
  local web_env="$dir/apps/web/.env.local"
  if [ -f "$web_env" ]; then
    set_env_key "$web_env" WEB_PORT "$web_port"
    set_env_key "$web_env" NEXT_PUBLIC_API_URL "http://localhost:$be_port"
    set_env_key "$web_env" NEXT_PUBLIC_WS_URL "ws://localhost:$be_port"
  fi

  # Mobile: only rewrite API_BASE_URL if it already points at a local backend
  # (leave staging/production URLs alone).
  local mobile_env="$dir/apps/mobile/.env.local"
  if [ -f "$mobile_env" ]; then
    local api_base; api_base="$(env_file_value "$mobile_env" API_BASE_URL)"
    if printf '%s' "$api_base" | grep -qE '^http://(10\.0\.2\.2|localhost|127\.0\.0\.1):[0-9]+$'; then
      local host; host="$(printf '%s' "$api_base" | sed -E 's#^http://([^:]+):.*#\1#')"
      set_env_key "$mobile_env" API_BASE_URL "http://$host:$be_port"
    fi
  fi

  print_info "Installing dependencies (root + apps/be + apps/web + apps/mobile)..."
  ( cd "$dir" && npm ci --no-audit --no-fund )
  for app in "${APPS[@]}"; do
    [ -d "$dir/apps/$app" ] && ( cd "$dir/apps/$app" && npm ci --no-audit --no-fund )
  done

  echo ""
  print_success "Worktree ready: $dir"
  echo -e "  Branch:        ${GREEN}$branch${NC} (from origin/$base)"
  echo -e "  Ports:         ${GREEN}BE_PORT=$be_port${NC} · ${GREEN}WEB_PORT=$web_port${NC}"
  print_warning "Shared infra — this worktree talks to the SAME Postgres/MinIO/Redis as your main checkout. Don't run scripts/infra.sh here."
  echo -e "  Next:          ${GREEN}cd $dir && ./scripts/start.sh${NC}"
  echo -e "  Cleanup later: ${GREEN}./scripts/worktree.sh cleanup $slug${NC}"
}

cmd_cleanup() {
  local name="" force=false
  while [ $# -gt 0 ]; do
    case "$1" in
      --force|-f) force=true; shift ;;
      -h|--help) usage; exit 0 ;;
      -*) print_error "Unknown flag: $1"; exit 1 ;;
      *) name="$1"; shift ;;
    esac
  done

  if [ -z "$name" ]; then
    case "$PWD" in
      "$WORKTREES_DIR"/*)
        name="$(echo "${PWD#"$WORKTREES_DIR"/}" | cut -d/ -f1)"
        ;;
    esac
  fi
  [ -n "$name" ] || { print_error "No name given and cwd isn't inside a worktree — usage: ./scripts/worktree.sh cleanup <name>"; exit 1; }

  local dir="$WORKTREES_DIR/$name"
  local branch="worktree-$name"
  [ -d "$dir" ] || { print_error "No worktree at $dir"; exit 1; }

  local base; base="$(default_base_branch)"
  local dirty; dirty="$(git -C "$dir" status --short 2>/dev/null || true)"
  local ahead=""
  if git -C "$dir" rev-parse --verify "origin/$base" >/dev/null 2>&1; then
    ahead="$(git -C "$dir" log --oneline "origin/$base..HEAD" 2>/dev/null || true)"
  fi

  if [ "$force" != true ] && { [ -n "$dirty" ] || [ -n "$ahead" ]; }; then
    if [ -n "$dirty" ]; then
      print_warning "Uncommitted changes in $dir:"
      echo "$dirty"
    fi
    if [ -n "$ahead" ]; then
      print_warning "Commits not on origin/$base:"
      echo "$ahead"
    fi
    if [ -t 0 ]; then
      read -r -p "Remove anyway? [y/N] " reply
      [[ "$reply" =~ ^[Yy]$ ]] || { print_info "Aborted"; exit 1; }
    else
      print_error "Non-interactive shell and uncommitted/unpushed work present — pass --force to remove anyway"
      exit 1
    fi
  fi

  local was_inside=false
  case "$PWD" in "$dir"|"$dir"/*) was_inside=true ;; esac

  git -C "$ROOT" worktree remove --force "$dir"
  print_success "Worktree removed: $dir"
  if git -C "$ROOT" show-ref --verify --quiet "refs/heads/$branch"; then
    git -C "$ROOT" branch -D "$branch"
    print_success "Branch deleted: $branch"
  fi

  if [ "$was_inside" = true ]; then
    print_warning "Your shell's cwd is now stale (the directory was removed) — run: cd $ROOT"
  fi
}

cmd_list() {
  local base; base="$(default_base_branch)"
  printf '%-20s %-24s %-24s %-8s %s\n' "NAME" "BRANCH" "PORTS" "STATUS" "AHEAD"
  if [ ! -d "$WORKTREES_DIR" ] || [ -z "$(ls -A "$WORKTREES_DIR" 2>/dev/null)" ]; then
    print_info "No worktrees under $WORKTREES_DIR"
    return 0
  fi
  for d in "$WORKTREES_DIR"/*/; do
    [ -d "$d" ] || continue
    local name; name="$(basename "$d")"
    local branch; branch="$(git -C "$d" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "no-branch")"
    local be_port; be_port="$(env_file_value "$d/apps/be/.env.local" PORT)"
    local web_port; web_port="$(env_file_value "$d/apps/web/.env.local" WEB_PORT)"
    local ports="be:${be_port:-?} web:${web_port:-?}"
    local status="clean"
    [ -n "$(git -C "$d" status --short 2>/dev/null)" ] && status="dirty"
    local ahead="?"
    if git -C "$d" rev-parse --verify "origin/$base" >/dev/null 2>&1; then
      ahead="$(git -C "$d" rev-list --count "origin/$base..HEAD" 2>/dev/null || echo "?")"
    fi
    printf '%-20s %-24s %-24s %-8s %s\n' "$name" "$branch" "$ports" "$status" "$ahead"
  done
}

cmd="${1:-create}"
case "$cmd" in
  create) shift; cmd_create "$@" ;;
  cleanup|remove|rm) shift; cmd_cleanup "$@" ;;
  list|ls) shift; cmd_list "$@" ;;
  -h|--help|help) usage ;;
  *) cmd_create "$@" ;;
esac
