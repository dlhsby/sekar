#!/usr/bin/env bash
#
# Provision the staging root-disk >80% CloudWatch alarm (SNS email) + the on-box
# metric publisher. Idempotent — safe to re-run. Runs against the SEKAR staging
# AWS account via the `sekar` CLI profile; the on-box parts go through SSM Run
# Command (no SSH).
#
# Why a systemd timer instead of the CloudWatch agent: the staging box is a shared
# t3.micro that is already RAM-saturated / swapping; the agent's ~40MB resident
# footprint risks OOM. The timer publishes a df-derived custom metric every 5 min
# with negligible resident memory.
#
# Context: a Puppeteer temp-profile leak once filled the 30GB disk and took the API
# down (ADR-024). This alarm is the early-warning net.
#
# Usage:  ./scripts/ops/setup-staging-disk-alarm.sh
# Requires: aws CLI, an `admin@wahyutrip.com`-style ALERT_EMAIL, the `sekar` profile.
set -euo pipefail

PROFILE="${AWS_PROFILE_OVERRIDE:-sekar}"
REGION="ap-southeast-3"
INSTANCE_ID="i-08edccdc966c0985e"
ROLE="dlhsby-ec2-role"
ALERT_EMAIL="${ALERT_EMAIL:-admin@wahyutrip.com}"
TOPIC_NAME="sekar-staging-alerts"
NAMESPACE="SEKAR/Staging"
METRIC="RootDiskUsedPercent"
ALARM="SEKAR-Staging-RootDiskHigh"
THRESHOLD="${THRESHOLD:-80}"

aws() { command aws --profile "$PROFILE" --region "$REGION" "$@"; }

echo "==> 1/4 SNS topic + email subscription"
TOPIC_ARN=$(aws sns create-topic --name "$TOPIC_NAME" --query TopicArn --output text)
# create-topic is idempotent; subscribe is a no-op if an identical sub exists.
if ! aws sns list-subscriptions-by-topic --topic-arn "$TOPIC_ARN" \
      --query 'Subscriptions[].Endpoint' --output text | grep -qF "$ALERT_EMAIL"; then
  aws sns subscribe --topic-arn "$TOPIC_ARN" --protocol email \
    --notification-endpoint "$ALERT_EMAIL" >/dev/null
  echo "    subscribed $ALERT_EMAIL — CONFIRM the emailed link before alerts arrive"
fi

echo "==> 2/4 IAM: allow the instance role to publish the custom metric"
POLICY_JSON=$(cat <<JSON
{"Version":"2012-10-17","Statement":[{"Sid":"PublishCustomDiskMetric","Effect":"Allow","Action":"cloudwatch:PutMetricData","Resource":"*","Condition":{"StringEquals":{"cloudwatch:namespace":"$NAMESPACE"}}}]}
JSON
)
aws iam put-role-policy --role-name "$ROLE" \
  --policy-name sekar-cloudwatch-metrics --policy-document "$POLICY_JSON"

echo "==> 3/4 On-box systemd timer (publishes df % every 5 min) via SSM"
REMOTE=$(cat <<'REMOTE_EOF'
set -e
cat > /usr/local/bin/sekar-disk-metric.sh <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
USED=$(df --output=pcent / | tail -1 | tr -dc '0-9')
aws cloudwatch put-metric-data --region ap-southeast-3 \
  --namespace SEKAR/Staging --metric-name RootDiskUsedPercent \
  --dimensions InstanceId=i-08edccdc966c0985e --value "$USED" --unit Percent
SCRIPT
chmod +x /usr/local/bin/sekar-disk-metric.sh
cat > /etc/systemd/system/sekar-disk-metric.service <<'UNIT'
[Unit]
Description=SEKAR: publish root-disk used% to CloudWatch
After=network-online.target
Wants=network-online.target
[Service]
Type=oneshot
ExecStart=/usr/local/bin/sekar-disk-metric.sh
UNIT
cat > /etc/systemd/system/sekar-disk-metric.timer <<'UNIT'
[Unit]
Description=SEKAR: run disk-metric publisher every 5 minutes
[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
AccuracySec=30s
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now sekar-disk-metric.timer
systemctl start sekar-disk-metric.service
REMOTE_EOF
)
B64=$(printf '%s' "$REMOTE" | base64 -w0)
CID=$(aws ssm send-command --instance-ids "$INSTANCE_ID" \
  --document-name AWS-RunShellScript \
  --parameters "commands=[\"echo $B64 | base64 -d | bash\"]" \
  --query Command.CommandId --output text)
for _ in $(seq 1 40); do
  S=$(aws ssm get-command-invocation --command-id "$CID" --instance-id "$INSTANCE_ID" \
        --query Status --output text 2>/dev/null || echo Pending)
  [[ "$S" =~ ^(Success|Failed|Cancelled|TimedOut)$ ]] && break; sleep 2
done
echo "    on-box install: $S"

echo "==> 4/4 CloudWatch alarm"
aws cloudwatch put-metric-alarm \
  --alarm-name "$ALARM" \
  --alarm-description "Staging EC2 root disk >${THRESHOLD}% (2x5min). Runbook: specs/deployment/operations.md 'Disk Space Full'." \
  --namespace "$NAMESPACE" --metric-name "$METRIC" \
  --dimensions Name=InstanceId,Value="$INSTANCE_ID" \
  --statistic Maximum --period 300 --evaluation-periods 2 --threshold "$THRESHOLD" \
  --comparison-operator GreaterThanThreshold --treat-missing-data notBreaching \
  --alarm-actions "$TOPIC_ARN" --ok-actions "$TOPIC_ARN"

echo "Done. Alarm '$ALARM' active; metric $NAMESPACE/$METRIC published every 5 min."
