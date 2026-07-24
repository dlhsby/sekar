#!/usr/bin/env bash
#
# staging-clone.sh — build a local, throwaway replica of the STAGING database.
#
# Why: the revamp cutover runs 38 migrations against a live staging DB holding real
# UAT data, including two data-adoption migrations (17496 kawasan re-parenting,
# 17500 staffing) whose SQL matches on live data shapes. Those two SKIP on a fresh
# DB, so the empty-DB dress-rehearsal never exercised them. The only way to know the
# chain is safe is to run it against the real rows.
#   See specs/deployment/staging-cutover-runbook.md
#
# What it does (all read-only against AWS — pg_dump takes no locks that block writes):
#   1. Reads the dotenvx private key from SSM, decrypts apps/be/.env.staging for the
#      DB connection details.
#   2. Opens an SSM port-forward through the EC2 box to the (private) RDS instance.
#   3. pg_dump -Fc through the tunnel.
#   4. Restores into a THROWAWAY postgres:15-alpine container (staging RDS is 15.17;
#      local infra pins postgres:14, which cannot read a v15 dump).
#   5. Runs the baseline census.
#
# Your dev database (sekar-postgres) is never touched.
#
# Usage:
#   ./staging-clone.sh                 # dump + restore + census
#   ./staging-clone.sh --dump-only     # just refresh the local dump file
#   ./staging-clone.sh --restore-only  # re-restore from the existing dump (fast reset)
#   ./staging-clone.sh --census        # re-run the census against the current clone
#
# Env overrides: AWS_PROFILE_SEKAR, AWS_REGION, EC2_INSTANCE_ID, CLONE_PORT, TUNNEL_PORT
set -euo pipefail

BE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="${STAGING_CLONE_DIR:-/tmp/sekar-staging-clone}"
DUMP_FILE="$WORK_DIR/staging.dump"

AWS_PROFILE_SEKAR="${AWS_PROFILE_SEKAR:-sekar}"
AWS_REGION="${AWS_REGION:-ap-southeast-3}"
EC2_INSTANCE_ID="${EC2_INSTANCE_ID:-i-08edccdc966c0985e}"
TUNNEL_PORT="${TUNNEL_PORT:-15433}"      # local end of the SSM tunnel to RDS
CLONE_PORT="${CLONE_PORT:-15544}"        # the throwaway clone container
CLONE_CONTAINER="sekar-staging-clone"
CLONE_DB="sekar_staging_clone"
CLONE_PASS="clone"                       # throwaway container, local-only, never networked
PG_IMAGE="postgres:15-alpine"

log()  { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

MODE="all"
case "${1:-}" in
  --dump-only)    MODE="dump" ;;
  --restore-only) MODE="restore" ;;
  --census)       MODE="census" ;;
  "")             ;;
  *)              die "unknown flag: $1" ;;
esac

require() { command -v "$1" >/dev/null 2>&1 || die "missing required tool: $1"; }
require aws
require docker
[ -x "$BE_DIR/node_modules/.bin/dotenvx" ] || die "dotenvx not installed — run npm install in apps/be"

mkdir -p "$WORK_DIR"
chmod 700 "$WORK_DIR"

# ---------------------------------------------------------------------------
# 1. Staging DB connection details (decrypted from the committed .env.staging)
# ---------------------------------------------------------------------------
read_staging_env() {
  log "Reading dotenvx private key from SSM…"
  local key
  key="$(aws ssm get-parameter --profile "$AWS_PROFILE_SEKAR" --region "$AWS_REGION" \
        --name /sekar/staging/BE_DOTENV_PRIVATE_KEY --with-decryption \
        --query Parameter.Value --output text)" || die "cannot read the dotenvx key from SSM"

  get_env() {
    DOTENV_PRIVATE_KEY_STAGING="$key" "$BE_DIR/node_modules/.bin/dotenvx" \
      get "$1" -f "$BE_DIR/.env.staging" 2>/dev/null
  }

  STG_HOST="$(get_env DATABASE_HOST)"
  STG_PORT="$(get_env DATABASE_PORT)"
  STG_NAME="$(get_env DATABASE_NAME)"
  STG_USER="$(get_env DATABASE_USER)"
  STG_PASS="$(get_env DATABASE_PASSWORD)"

  [ -n "${STG_HOST:-}" ] && [ -n "${STG_USER:-}" ] && [ -n "${STG_PASS:-}" ] \
    || die "could not decrypt the staging DATABASE_* values"
  # Never print STG_PASS.
  log "Staging DB: ${STG_USER}@${STG_HOST}:${STG_PORT:-5432}/${STG_NAME}"
}

# ---------------------------------------------------------------------------
# 2 + 3. Tunnel through SSM, then pg_dump. RDS is not publicly accessible.
# ---------------------------------------------------------------------------
TUNNEL_PID=""
close_tunnel() {
  if [ -n "$TUNNEL_PID" ] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    log "Closing SSM tunnel…"
    kill "$TUNNEL_PID" 2>/dev/null || true
    wait "$TUNNEL_PID" 2>/dev/null || true
  fi
  TUNNEL_PID=""
}
trap close_tunnel EXIT

dump_staging() {
  read_staging_env
  command -v session-manager-plugin >/dev/null 2>&1 \
    || die "session-manager-plugin missing — required for the SSM port-forward"

  log "Opening SSM tunnel localhost:${TUNNEL_PORT} → ${STG_HOST}:${STG_PORT:-5432} via ${EC2_INSTANCE_ID}…"
  aws ssm start-session --profile "$AWS_PROFILE_SEKAR" --region "$AWS_REGION" \
    --target "$EC2_INSTANCE_ID" \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters "{\"host\":[\"$STG_HOST\"],\"portNumber\":[\"${STG_PORT:-5432}\"],\"localPortNumber\":[\"$TUNNEL_PORT\"]}" \
    >"$WORK_DIR/tunnel.log" 2>&1 &
  TUNNEL_PID=$!

  # Wait for the forwarded port to accept connections.
  local ready=""
  for _ in $(seq 1 30); do
    if (exec 3<>"/dev/tcp/127.0.0.1/$TUNNEL_PORT") 2>/dev/null; then ready=1; exec 3>&- 3<&-; break; fi
    kill -0 "$TUNNEL_PID" 2>/dev/null || die "tunnel died — see $WORK_DIR/tunnel.log"
    sleep 1
  done
  [ -n "$ready" ] || die "tunnel never came up — see $WORK_DIR/tunnel.log"
  log "Tunnel up."

  # pg_dump runs in a container (there is no local postgres client). It reaches the
  # tunnel via host.docker.internal, NOT --network host: under Docker Desktop on WSL2
  # the "host" network is the Docker VM's namespace, so 127.0.0.1 there is not the
  # loopback the SSM tunnel is bound to. --add-host keeps this working on plain Linux
  # Docker too. -Fc = custom format, needed for selective pg_restore.
  log "Dumping ${STG_NAME} (this reads the live DB; it does not modify it)…"
  docker run --rm --add-host=host.docker.internal:host-gateway \
    -e PGPASSWORD="$STG_PASS" \
    "$PG_IMAGE" \
    pg_dump -Fc --no-owner --no-acl \
      -h host.docker.internal -p "$TUNNEL_PORT" -U "$STG_USER" -d "$STG_NAME" \
    > "$DUMP_FILE" || die "pg_dump failed"

  close_tunnel
  chmod 600 "$DUMP_FILE"
  log "Dump written: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"
}

# ---------------------------------------------------------------------------
# 4. Restore into a throwaway PG15 container
# ---------------------------------------------------------------------------
psql_clone() {
  docker exec -i -e PGPASSWORD="$CLONE_PASS" "$CLONE_CONTAINER" \
    psql -v ON_ERROR_STOP=1 -U postgres -d "$CLONE_DB" "$@"
}

restore_clone() {
  [ -s "$DUMP_FILE" ] || die "no dump at $DUMP_FILE — run without --restore-only first"

  log "Recreating the throwaway clone container (${CLONE_CONTAINER} on :${CLONE_PORT})…"
  docker rm -f "$CLONE_CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$CLONE_CONTAINER" \
    -e POSTGRES_PASSWORD="$CLONE_PASS" \
    -e POSTGRES_DB="$CLONE_DB" \
    -p "127.0.0.1:${CLONE_PORT}:5432" \
    "$PG_IMAGE" >/dev/null

  for _ in $(seq 1 60); do
    docker exec "$CLONE_CONTAINER" pg_isready -U postgres -d "$CLONE_DB" >/dev/null 2>&1 && break
    sleep 1
  done
  docker exec "$CLONE_CONTAINER" pg_isready -U postgres -d "$CLONE_DB" >/dev/null 2>&1 \
    || die "clone container never became ready"

  log "Restoring…"
  # --no-owner/--no-acl: the staging roles don't exist locally. Errors are surfaced but
  # non-fatal (extensions/roles commonly warn); the census is the real acceptance check.
  docker exec -i "$CLONE_CONTAINER" \
    pg_restore --no-owner --no-acl -U postgres -d "$CLONE_DB" \
    < "$DUMP_FILE" 2>"$WORK_DIR/restore.log" || warn "pg_restore reported issues — see $WORK_DIR/restore.log"

  log "Clone ready: postgresql://postgres@127.0.0.1:${CLONE_PORT}/${CLONE_DB}"
}

# ---------------------------------------------------------------------------
# 5. Census — the before/after image the whole rehearsal hinges on
# ---------------------------------------------------------------------------
census() {
  local label="${1:-census}"
  local out="$WORK_DIR/${label}.txt"
  docker exec "$CLONE_CONTAINER" true 2>/dev/null || die "clone container is not running"
  log "Running census → $out"
  psql_clone -f - < "$BE_DIR/scripts/staging-census.sql" > "$out" 2>&1 \
    || warn "census reported errors — see $out"
  log "Census written: $out"
  tail -30 "$out"
}

case "$MODE" in
  dump)    dump_staging ;;
  restore) restore_clone; census "census-before" ;;
  census)  census "census-$(date +%H%M%S)" ;;
  all)     dump_staging; restore_clone; census "census-before" ;;
esac

cat <<EOF

Next:
  Point the backend at the clone and run the chain:
    cd apps/be && DATABASE_HOST=127.0.0.1 DATABASE_PORT=$CLONE_PORT \\
      DATABASE_USER=postgres DATABASE_PASSWORD=$CLONE_PASS DATABASE_NAME=$CLONE_DB \\
      npm run migration:run
  Then re-census and diff:
    $0 --census
    diff $WORK_DIR/census-before.txt $WORK_DIR/census-<new>.txt
EOF
