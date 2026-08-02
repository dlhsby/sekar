# AWS cost position and runway

**As of 2026-08-02.** Account `659828096624`, region `ap-southeast-3` (Jakarta).

Written because the account is on the **AWS Free Plan**, where the consequence of
running out is not a bill — *"your access to AWS services will end when credits are
depleted or the free period ends"*. Staging is the **live operational system** (there is
no production environment yet), so depletion means an outage, not an invoice.

## Position

| | |
|---|---|
| Credits remaining | **$57.60** |
| Free period ends | 2026-12-16 (137 days) |
| Net paid to date | **$0.00** — credits have covered 100% of usage |
| Credits consumed | $141.33 ($16.78 Jun · $123.58 Jul · rest Aug) |
| Forecast month-end | ~$98 (gross usage; AWS Budgets does not model future credit offsets) |

**Budget to reach 2026-12-16: $57.60 ÷ 137 = $0.42/day ≈ $12.79/month.**

Unavoidable always-on cost, before a single byte of transfer:

| Item | $/mo |
|---|---|
| RDS db.t4g.micro | 18.66 |
| EC2 t3.micro | 9.82 |
| RDS backup storage (beyond free 20 GB) | 5.06 |
| Public IPv4 | 3.72 |
| EBS 30 GB gp3 | 2.88 |
| RDS GP2 storage | 2.77 |
| t3 CPU credits (bursting) | 2.32 |
| **Floor** | **≈ 45.23** |

**The floor alone exhausts $57.60 in ~38 days (≈ 9 September).** Reaching December on
credits is arithmetically impossible with an always-on environment.

**Conclusion: a paid-plan upgrade is required.** The optimisation work below only decides
whether that bill is ~$20/month or ~$98/month. Pick the date deliberately rather than
discovering it when the system stops.

## Where July's $123.58 went

| Usage type | $ | Cause |
|---|---|---|
| `DataTransfer-Out-Bytes` (EC2) | 48.49 | 398.6 GB egress |
| `InstanceUsage:db.t4g.micro` | 18.66 | 24/7 |
| `DataTransfer-Regional-Bytes` | 17.99 | **1,799 GB cross-AZ** |
| `DataTransfer-Out-Bytes` (S3) | 11.42 | 155.2 GB (media + APKs) |
| `BoxUsage:t3.micro` | 9.82 | 24/7 |
| `RDS:ChargedBackupUsage` | 5.06 | beyond free 20 GB |
| others | 11.14 | IPv4, EBS, RDS storage, CPU credits |

**63% is data transfer**, and the root cause is one defect: `sekar_staging` was 12 GB, of
which ~8.1 GB is base64 photos still stored inline in `activities` (all 15,103 rows) and
~3.2 GB was `location_logs`. Big rows dragged across an AZ boundary on every query
produced both the 1.8 TB regional traffic and much of the egress.

## Why there is no nightly-shutdown option

Shifts cover **06:00–05:00 WIB — 23 hours a day** (Shift 1 `06:00–15:00`, Shift 2
`15:00–23:00`, Shift 3 `21:00–05:00`). Measured clock-in/out by hour (30 days) shows
22:00 and 23:00 are the **second-busiest clock-out period of the day** (1,107 events), so
a 22:00 stop breaks exactly the Shift 2 clock-out it was meant to protect.

Shift 3 is genuine production usage, not test data: **412 sessions, 103 distinct workers,
100% with location pings, 198 sessions submitting activities.**

The only quiet window is **00:00–04:00**, and stopping there saves just **~$5.14/month**
(only instance-hours stop; EBS, RDS storage, IPv4 and backups bill while stopped) — about
**5 extra days of runway** in exchange for 103 workers losing GPS tracking nightly (the
100-ping client buffer overflows long before 4 hours). **Rejected as a poor trade.**

## Actions

| # | Action | Saves | Status |
|---|---|---|---|
| 1 | Drop 4 never-scanned indexes on `location_logs` | 1.35 GB | **done 2026-08-02** |
| 2 | Thin redundant stationary pings server-side | most new ping volume | **done** (see below) |
| 3 | Move EC2 to `ap-southeast-3c` | ~$18/mo | runbook below |
| 4 | Backfill inline photos + `VACUUM FULL` | ~8 GB, big egress cut | at revamp deploy |
| 5 | Review RDS backup retention | up to ~$5/mo | open |
| 6 | `location_logs` tiering/partitioning | ongoing growth | proposed below |

### 1. Dead indexes (done)

`location_logs` carried 2.6 GB of indexes on 606 MB of heap. Four had **0 scans over 27
days of uptime with stats never reset**, including two byte-identical duplicates of a
third. Dropped `CONCURRENTLY` (no lock, live traffic unaffected): table **3217 → 1864 MB**,
database **12 → 10 GB**.

Recreate statements, if ever needed:

```sql
CREATE INDEX idx_location_logs_worker_latest   ON public.location_logs USING btree (user_id, logged_at DESC);
CREATE INDEX idx_location_logs_shift_time      ON public.location_logs USING btree (shift_id, logged_at DESC);
CREATE INDEX idx_location_logs_user_shift_time ON public.location_logs USING btree (user_id, shift_id, logged_at DESC);
CREATE INDEX idx_location_logs_user_date       ON public.location_logs USING btree (user_id, logged_at DESC);
```

### 2. Stationary thinning (done)

`LOCATION_DISTANCE_FILTER_METERS` is **dead config** — parsed in `constants/config.ts` and
named in the tracker docblock, but never read, because the tracker polls
`getCurrentPosition` on a `setTimeout` loop and `distanceFilter` only applies to
`watchPosition`. Thinning is therefore done server-side in `location.service`, which also
takes effect for every app version already in the field.

Constraint: presence is derived from the newest ping's age, so the 4-minute heartbeat must
stay well under the 10-minute offline threshold. A test guards that invariant.

### 3. EC2 → `ap-southeast-3c` runbook

EC2 `i-08edccdc966c0985e` is in `3a`; RDS `dlhsby` is in `3c`. Every byte read from
Postgres is billed cross-AZ (1,799 GB × $0.01 = $17.99, an exact match).

**Move the EC2, not the database.** The RDS instance also hosts `swat_staging`, so a
snapshot-restore-and-repoint risks forking a co-tenant's data. Moving the EC2 touches no
database at all.

Window: **05:00–06:00 WIB** — the only hour no shift covers. Expect ~15 minutes.

1. Verify the co-tenant (SWAT) is idle and announce the window.
2. Snapshot: create an AMI of `i-08edccdc966c0985e` (`aws ec2 create-image`).
3. Launch a new t3.micro from that AMI into a **`3c`** subnet, same security group, same
   IAM instance profile (it needs SSM + S3 + ECR).
4. Reassociate the Elastic IP `16.79.124.63` to the new instance — this is what makes DNS
   cut over without touching Route 53.
5. Verify: `GET /health/live` returns the expected `{version,gitSha,builtAt}`; a clock-in
   succeeds; the monitoring map shows live pings.
6. Keep the old instance **stopped, not terminated**, for one working day. Rollback is
   reassociating the EIP back to it.
7. Terminate the old instance and delete the AMI once satisfied.

Verify the saving after ~48 h: `DataTransfer-Regional-Bytes` should fall to near zero in
the Cost Explorer daily breakdown.

### 6. Proposed `location_logs` lifecycle

Not yet implemented. Ping volume is ~200k rows/day and unbounded.

- **Hot (0–14 d)** — full fidelity. Live map + recent audit.
- **Warm (14–90 d)** — downsample to ~1 fix per 5 min per user. Usable track for
  attendance disputes at ~10% of the rows.
- **Cold (>90 d)** — keep `location_daily_summaries` (the table already exists: per user
  per day, first/last seen, counts) plus optionally the full track exported to S3.
  **S3 is $0.023/GB vs $0.115/GB on RDS gp2** — 5× cheaper, and the right home for
  evidence that must be retained but is rarely read.
- **Partition by month.** This is what makes expiry cheap: `DROP PARTITION` is instant and
  leaves no bloat, where `DELETE` of millions of rows needs a `VACUUM FULL` that locks the
  table.

Retention must be agreed with the client before anything is deleted — this is operational
attendance evidence, not disposable staging data.

## Verifying cost changes

```bash
aws ce get-cost-and-usage --profile sekar \
  --time-period Start=<start>,End=<end> --granularity DAILY \
  --metrics UNBLENDED_COST USAGE_QUANTITY \
  --filter '{"Dimensions":{"Key":"RECORD_TYPE","Values":["Usage"]}}' \
  --group-by Type=DIMENSION,Key=USAGE_TYPE --output json
```

Cost Explorer bills $0.01 per request. Note the **console's "Accrued total" shows gross
usage, not money owed** — net is `Usage + Credit`, which has been $0.00 every day so far.
