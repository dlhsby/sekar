#!/usr/bin/env bash
# Rescue the important data from the CLOSED AWS account 659828096624.
#
# The account bills from the moment it is reopened, so this script is written to
# keep that window short: it INVENTORIES first and prints sizes, then waits for
# you to choose. Nothing is downloaded until you pass a stage explicitly.
#
#   ./scripts/rescue-old-account.sh inventory   # sizes only — pennies, do this first
#   ./scripts/rescue-old-account.sh db          # the 4 tables the 1 Aug dump lacks
#   ./scripts/rescue-old-account.sh media       # sekar media bucket
#   ./scripts/rescue-old-account.sh swat        # swat photos + reports buckets
#
# Prereq: the old account is reopened and `--profile sekar` works again.
set -euo pipefail

OLD_PROFILE="${OLD_PROFILE:-sekar}"
OLD_REGION="${OLD_REGION:-ap-southeast-3}"
OUT="${RESCUE_DIR:-$HOME/sekar-rescue}"
A="--profile $OLD_PROFILE --region $OLD_REGION"

need_access() {
  if ! aws sts get-caller-identity $A >/dev/null 2>&1; then
    echo "✖ profile '$OLD_PROFILE' cannot reach AWS." >&2
    echo "  Reopen account 659828096624 as root, then re-check its access keys." >&2
    exit 1
  fi
  echo "→ $(aws sts get-caller-identity $A --query Arn --output text)"
}

case "${1:-}" in
inventory)
  need_access
  echo
  echo "=== compute (do NOT start these unless a stage below needs them) ==="
  aws ec2 describe-instances $A --instance-ids i-08edccdc966c0985e \
    --query 'Reservations[0].Instances[0].[InstanceId,State.Name]' --output text 2>&1 || echo "  EC2: gone"
  aws rds describe-db-instances $A --db-instance-identifier dlhsby \
    --query 'DBInstances[0].[DBInstanceIdentifier,DBInstanceStatus]' --output text 2>&1 || echo "  RDS: gone"
  echo
  echo "=== snapshots (a cheap alternative to a live dump) ==="
  aws rds describe-db-snapshots $A --db-instance-identifier dlhsby \
    --query 'DBSnapshots[].[DBSnapshotIdentifier,SnapshotCreateTime,Status]' --output text 2>&1 | head -8 || true
  echo
  echo "=== bucket sizes — this is the number that decides the egress bill ==="
  for b in sekar-media-staging swat-photos-staging swat-reports-staging; do
    printf '  %-24s ' "$b"
    aws s3 ls "s3://$b" $A --recursive --summarize 2>/dev/null | tail -2 | tr '\n' ' ' || echo "unreadable"
    echo
  done
  echo
  echo "Egress is ~\$0.074/GB (observed). Decide what is worth pulling, then run a stage."
  ;;

db)
  need_access
  mkdir -p "$OUT"
  echo "→ dumping ONLY the tables the 1 Aug local dump is missing."
  echo "  (activities carries the inline photos; audit_logs is small but irreplaceable)"
  echo "  location_logs + notifications are SKIPPED by default — set RESCUE_ALL=1 to include them."
  TABLES="-t activities -t audit_logs"
  [ "${RESCUE_ALL:-0}" = "1" ] && TABLES="$TABLES -t location_logs -t notifications"
  echo "  tables: $TABLES"
  echo
  echo "  This needs the SSM tunnel from apps/be/scripts/staging-clone.sh."
  echo "  Start it in another terminal, then run the pg_dump it prints, adding: $TABLES"
  echo "  Reason: that script already resolves the RDS creds from SSM + dotenvx,"
  echo "  and re-implementing that here would duplicate the one thing it does well."
  ;;

media)
  need_access
  mkdir -p "$OUT/sekar-media"
  aws s3 sync "s3://sekar-media-staging" "$OUT/sekar-media" $A
  du -sh "$OUT/sekar-media"
  ;;

swat)
  need_access
  mkdir -p "$OUT/swat-photos" "$OUT/swat-reports"
  aws s3 sync "s3://swat-photos-staging"  "$OUT/swat-photos"  $A
  aws s3 sync "s3://swat-reports-staging" "$OUT/swat-reports" $A
  du -sh "$OUT/swat-photos" "$OUT/swat-reports"
  ;;

*)
  sed -n '2,14p' "$0"; exit 1 ;;
esac
