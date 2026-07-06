---
name: worktree
description: Manage parallel SEKAR git worktrees (create, cleanup, list) for concurrent work without port/infra collisions. Invoke for /worktree.
---

# /worktree

Thin wrapper around `./scripts/worktree.sh` — a worktree cuts a fresh checkout
under `.claude/worktrees/<name>` on its own `worktree-<name>` branch, with
unique `BE_PORT`/`WEB_PORT` wired into its `.env.local` files, while still
talking to the ONE shared Docker infra (Postgres/MinIO/Redis) the main
checkout uses.

## How to run this skill

Parse the trailing args after `/worktree` (everything the user typed after
the command name) and pass them straight through to the script — don't
reinterpret or add flags of your own:

```
./scripts/worktree.sh <args...>
```

- No args → `create` (the script will prompt for a name interactively).
- `/worktree create feature-x` → `./scripts/worktree.sh create feature-x`
- `/worktree create feature-x --base develop --be-port 3010` → forward verbatim
- `/worktree cleanup feature-x` → `./scripts/worktree.sh cleanup feature-x`
- `/worktree list` / `/worktree ls` → `./scripts/worktree.sh list`

## Rules

1. **Run the script directly in the foreground** — do not redirect/capture
   stdin or stdout. `create` and `cleanup` can prompt (for a name, or to
   confirm removing a dirty/unpushed worktree) and those prompts must reach
   the user's terminal, not be swallowed or auto-answered.
2. **Never inject `--force`/`-f`** into a `cleanup` call unless the user's own
   words explicitly asked to force it. If the script prompts for
   confirmation, relay that prompt as-is and wait for the user's real answer
   — don't decide on their behalf.
3. **Relay the script's own output verbatim** (ports picked, warnings,
   summaries) rather than paraphrasing — it already prints exactly what the
   user needs (next command, cleanup command, "shared infra" warning).
4. Every worktree shares the same Postgres/MinIO/Redis as the main checkout —
   never suggest running `scripts/infra.sh` from inside a worktree.
