# ADR-062: Force Delete of In-Use Records — Future-Only Cascade

## Status

Active · builds on [ADR-061](./ADR-061-audit-trail-v2.md) (audit) and [ADR-047](./ADR-047-schedule-redesign.md) (past occurrences are never rewritten)

## Context

UAT: operators could not delete a Rayon, Kawasan, Lokasi, user etc. once it was used,
for example by a schedule. Every service blocked or silently orphaned in its own way:
districts refused while children existed, lokasi refused while users pointed at it,
kawasan detached its lokasi, and roles refused while assigned. The users asked to be
able to delete **regardless of use**, as long as the UI warns clearly that it is
dangerous and irreversible.

User decisions (2026-09-26):
- **Soft delete + cascade the future only.** Past attendance, reports and roster
  history are left exactly as they are.
- **Show the impact first; audit everything.**
- **A Rayon cascades to its Kawasan and Lokasi.**

## Decision

**One engine** (`modules/deletion`), not eight bespoke delete paths:

| Endpoint | Purpose |
|---|---|
| `GET /deletions/:type/:id/impact` | Dry run: counts of what will change, the exact confirm label, and how many dependants need a replacement |
| `POST /deletions/:type/:id` | Body `{confirm_name, reason (5–500), replacement_id?}` |

- **Types:** `district, region, location, location_type, team_category, user, role, shift_definition`.
- **Permission:** `<resource>:delete`, checked per type in the service.

**Future only.** "Future" means tomorrow onward in Jakarta time.
- Roster rows dated after today are soft-deleted. Today's rows are kept, because the
  worker may already be on shift.
- A recurring series is **ended at today** (`end_date = today`), not deleted, so its
  materialised past occurrences keep a real event. A series that has not started yet
  is removed.
- Nothing dated today or earlier is touched: attendance punches, shifts, activities,
  reports, tasks.

**Per-type cascade**

| Type | Cascade |
|---|---|
| Lokasi | Its future rows and static series cancelled; `users.location_id` cleared; `user_locations` rows removed |
| Kawasan | Kawasan-scoped rows and series cancelled; its Lokasi are **detached** (they stay valid under their Rayon); `users.region_id` cleared |
| Rayon | **Every Kawasan and Lokasi in it is force-deleted too** (each with its own cascade); Rayon-scoped rows and series cancelled; `users.district_id` cleared |
| User | Series they own (individual, or as team PIC) end today; their other team memberships and lokasi assignments are removed; their future rows cancelled |
| Shift definition | Series and future rows on that shift cancelled; users' default shift cleared |
| Team category | Nothing cancelled; team series keep running and only lose the category's marker |
| Role / location type | Dependants **must be moved to a replacement** (`DELETE_REPLACEMENT_REQUIRED`, 409), because a user can't exist without a role, nor a lokasi without a type |

**Never deletable (`DELETE_NOT_ALLOWED`):** your own account, a system role, and a
superadmin account (unless the actor is a superadmin).

**Confirmation:** the operator types the record's name (for a user, the username),
compared ignoring case and repeated spaces (`DELETE_CONFIRMATION_MISMATCH`), plus a
reason.

**Atomic and audited:** everything runs in one transaction.
- First, an explicit `force_delete` audit row is written with the reason and the planned
  impact.
- Its id becomes the `parent_id` of every row the cascade writes, through
  `auditContext.annotate`. So the audit page can show a whole cascade under one entry.
- If anything fails, nothing changes, including the audit rows.

**Web:** one `ForceDeleteDialog` replaces the per-page delete modals. It shows the impact
list, an irreversibility warning, the "history is kept" guarantee, the type-to-confirm
field, the reason, and a replacement picker for roles and types.

## Consequences

**Positive**
- Deleting "anything" is possible and predictable, with the same rules and the same dialog everywhere.
- History stays intact. Soft delete keeps names resolvable for past records.
- One audit tree per delete, including the reason.

**Negative / accepted**
- A Rayon delete can touch many rows. The impact preview shows the totals before confirmation.
- The old `DELETE /districts|locations|users|…/:id` routes remain for compatibility,
  with their narrower guards. The web no longer calls them.
- The disabled-by-default `users/cron/soft-delete-purge.cron.ts` (`ENABLE_HARD_PURGE`)
  hard-deletes a soft-deleted user's past shifts after 180 days. That contradicts
  "history untouched" and must stay **off**; review it before ever enabling it.
