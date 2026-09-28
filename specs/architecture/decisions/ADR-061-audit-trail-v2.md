# ADR-061: Audit Trail v2 — Automatic, Append-Only, Tamper-Evident

## Status

Active · extends [ADR-015](./ADR-015-audit-trail.md) (explicit domain events stay as they are)

## Context

UAT asked to "see and filter who did what, when, and see the changes" for every CRUD
action in the web, following industry standards. ADR-015 gave us a generic
`audit_logs` table, but:

- **Coverage was accidental.** Services had to remember to call `AuditLogService.log()`.
  Districts, regions, lokasi, location types, team categories, shift definitions,
  holidays and capacity wrote nothing at all.
- **Best-effort writes.** A failed audit insert was swallowed, so a change could
  succeed with no record of it.
- **Mutable.** Any DB user could `UPDATE`/`DELETE` history; nothing would show it.
- **No context.** No actor role/name snapshot, IP, user agent, request id or reason;
  no refused-access or authentication events.
- **No UI** (backend-only).

Controls this is measured against:

| Standard | Control | What it asks | How this ADR meets it |
|---|---|---|---|
| ISO/IEC 27001:2022 | A.8.15 Logging | Record user activities, exceptions, faults, security events; protect logs from tampering | Automatic CRUD capture, denied writes, login events; append-only + hash chain |
| ISO/IEC 27001:2022 | A.8.17 Clock synchronisation | Consistent timestamps | `timestamptz`, stored/exported in UTC; one DB clock |
| ISO/IEC 27001:2022 | A.5.28 Collection of evidence | Evidence must be preservable and its integrity demonstrable | `GET /audit/verify` re-derives the chain; CSV export |
| ISO/IEC 27001:2022 | A.8.2 / A.5.15 Access control | Only authorised people read logs | `audit:read` permission; master-data history gated |
| COBIT 2019 | DSS05.04, DSS06.05–06 | Manage identity/logical access; business-process controls with traceable transactions | Actor + role snapshot, request id, cascade `parent_id` |
| COBIT 2019 | MEA02 | Monitor internal control | Search/filter/export, integrity verification |
| NIST SP 800-92 · OWASP Logging Cheat Sheet | — | Who/what/when/where/outcome; no secrets in logs; injection-safe | Field set below; global secret redaction; CSV formula-injection guard |
| UU PDP No. 27/2022 (Indonesia) | Data minimisation | Log only what is needed | Secrets redacted, phone identifiers masked, UI prefs ignored, oversized blobs replaced by a size marker |

## Decision

### 1. Two capture paths

| Path | For | Semantics |
|---|---|---|
| **Automatic** — `@Auditable({ type, label, redact?, ignore? })` on the entity; `AuditTrailSubscriber` | Plain CRUD on master data and accounts (district, region, location, location_type, team_category, user, role, shift_definition, special_day_override, staff_requirement) | Written through the event's own `EntityManager`, **inside the same transaction as the change — fail-closed**: no audit row, no change |
| **Explicit** — `AuditLogService.log()` (ADR-015) | Domain events that are not a row diff: approve/verify/reassign, role `permissions_change` (a relation), kawasan `locations_change` (bulk re-parent), `login`/`login_failed`/`logout`, `export`, `denied_write` | Best-effort; never fails the business action |

Actions: `create`, `update` (field diff only), `delete` (soft; last state kept),
`restore`, `purge` (hard delete), plus the domain verbs. An update that touches only
bookkeeping columns writes nothing. A service must not log CRUD explicitly for an
`@Auditable` entity (it would duplicate).

**Coverage is enforced, not remembered.** Entity events only fire for `save`,
`softRemove`, `recover` and `remove`. `audit-coverage.spec.ts` fails if a service of an
auditable entity uses `repository.update/delete/softDelete/restore` or QueryBuilder
`.update()/.delete()`, unless the line above carries `// audit: explicit`, pointing at
the explicit event that records it.

### 2. Row content

`created_at` (UTC), `seq`, `actor_id`, **`actor_role` and `actor_name` snapshots**
(true at the time, even after a rename or delete), `entity_type`, `entity_id`,
**`entity_label` snapshot**, `action`, `outcome` (`success|denied|failed`), `source`
(`api|system`), `changes` (`{field: [old, new]}`), `old_value`/`new_value` (full
snapshot on delete/create), `reason`, `parent_id` (cascade root, e.g. a force delete),
`ip`, `user_agent`, `request_id` (correlates with application logs), `metadata`.

Redaction: any column matching `password|token|secret|otp|api_key` is always stored as
`[REDACTED]`, recording that it changed but never the value. Values over 2 KB become
`{_omitted, bytes}`, and virtual (non-column) properties are dropped. Context comes from
`AuditContextInterceptor`, a per-request AsyncLocalStorage store; `auditContext.annotate()`
attaches a reason and a cascade parent to everything written inside it.

### 3. Append-only + hash chain

- **Guard trigger:** refuses `DELETE` and `TRUNCATE`. It allows `UPDATE` only as the
  one-time seal of an unsealed row (`chain_pos`, `prev_hash`, `hash`, `sealed_at`).
- **Sealing is out-of-band:** the `audit-seal` cron runs every minute and calls
  `audit_seal(5000)` under an advisory lock, so audited writes never serialise on a
  global lock. Each row gets the next `chain_pos` and
  `hash = sha256(prev_hash ‖ audit_logs_canonical(row))`, computed entirely in SQL so
  `audit_verify()` reproduces it byte-for-byte. The chain follows `chain_pos`, not `seq`,
  because transactions commit out of order.
- **External anchor:** each pass logs the chain head (`#pos hash`) to the application
  log, which is shipped off the box. Comparing the current head with the last anchor
  detects a truncated tail, which a chain alone cannot.
- **Maintenance escape:** the dev/test seeder sets `sekar.audit_maintenance = 'on'` to
  wipe data. Anyone who can do that can also drop the trigger. So the trigger stops
  accidents, and the chain plus the off-box anchor provides the evidence.

### 4. Access

| Endpoint | Permission |
|---|---|
| `GET /audit` | `audit:read` |
| `GET /audit/export.csv` | `audit:read` (the export itself is audited) |
| `GET /audit/verify` | `audit:read` |
| `GET /audit/types` | `audit:read` |
| `GET /audit/:type/:id` | Operational types (task, activity…) follow entity access, as in ADR-015. Master-data/user history needs `audit:read`, because it contains field diffs. |

Nobody can edit or delete audit rows through the API.

### 5. Retention

Keep at least 1 year online, the ISO/COBIT norm; there is no purge job, because the
table is append-only by design. Volume is about 100–1,000 rows a day, since location
pings and tracking are deliberately excluded. Monthly partitioning is deferred until
the table passes about 5 M rows. Mind the staging volume limits (see the
storage-incident notes).

## Consequences

**Positive**
- Every master-data or account change is recorded by construction, atomically with the change.
- Tampering with sealed history is detectable, and deleting it is refused.
- Who / what / when / where / outcome are all present; secrets never reach the log.

**Negative / accepted**
- A bug in capture now fails the CRUD call (fail-closed). This is covered by unit and e2e tests.
- Rows are unsealed for up to one minute. Tampering within that window is not
  chain-detectable; the guard trigger still blocks it.
- `ScheduleEvent` keeps its explicit ADR-015 logging, because it carries edit scope
  (this / future / series), which a row diff can't express. Roster rows (`schedules`)
  are not captured: they are generated in bulk from events.
- Throttled (429) logins are not recorded, because they never reach the service.
