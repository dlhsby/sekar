# 🅿️ Parked features

These features are **fully built and still functional via API/direct URL**, but were **hidden from
the web sidebar on 2026-07-07** because UAT found them unpolished or low-priority. They are **parked,
not removed** — to be revisited (revamp / update / or decide to drop) in a later product cycle. No
code was deleted; mobile screens where present remain in the app.

> Do not treat these as active product surface. When revisiting, promote the relevant one back into
> `specs/features/<name>/` with a full spec and re-enable its nav entry.

| Feature | Backend module | Web surface | Mobile | Why parked |
|---------|----------------|-------------|--------|------------|
| **Asset management** ("reports-management asset") | `assets` | `/assets` (nav hidden) | Asset list/detail/checkout/return/QR screens | Unpolished; QR/maintenance flows need rework (ADR-026) |
| **Analytics** ("tanaman-analytics") | `analytics` | `/analytics/*` (nav hidden) | Worker/Team analytics screens | Not actionable in current form; revisit metrics model (ADR-025) |
| **Reporting builder & schedules** | `reporting` | `/reports/builder`, `/reports/schedules` (nav hidden; `/reports/reporting` stays) | — | Builder/scheduling UX incomplete (ADR-024) |
| **Import / Export** | `import`, `export` | `/import`, `/export` (nav hidden) | — | Admin-only power tool; direct-URL access retained (ADR-018) |
| **Plant seeds** | `plant-seeds` | `/seeds` (nav hidden) | Seeds screen | Inventory flow deprioritized vs. plant catalog |

**Nav source of truth:** the web sidebar nav config (`apps/web/src/lib/navigation.ts` — entries are
commented out, not deleted). The pages/routes still exist and resolve.

## Pending decision (revamp · update · remove)

Each parked feature needs an explicit call in a later product cycle. Status: **⏳ Not yet decided**
for all. When decided, record the choice + date here and act on it.

| Feature | Decision | Notes |
|---------|----------|-------|
| Asset management ("reports-management asset") | ⏳ TBD | User flagged as currently unusable; likely revamp or remove |
| Analytics ("tanaman-analytics") | ⏳ TBD | User flagged as currently unusable; likely revamp or remove |
| Reporting builder & schedules | ⏳ TBD | `/reports/reporting` stays live; builder/scheduler need UX rework |
| Import / Export | ⏳ TBD | Works via direct URL; decide whether to re-surface for admins |
| Plant seeds | ⏳ TBD | Deprioritized vs. plant catalog |

> Promoting one back to active: move it into `specs/features/<name>/` with a full spec, re-enable its
> `navigation.ts` entry, and log the change in that feature's `## Changelog`.

See the build history in [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
