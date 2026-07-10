# Database

PostgreSQL schema and data layer. Dev uses TypeORM auto-sync; staging/prod use explicit migrations;
soft delete via `deleted_at`.

| Doc | What |
|-----|------|
| [`schema.md`](schema.md) | All tables, relations, indexes, triggers (the catalogue) |
| [`erd.md`](erd.md) | Entity-relationship diagram + aggregates |
| [`migrations.md`](migrations.md) | Migration log + rollback procedures |
| [`seed-data.md`](seed-data.md) | Rayons, shifts, activity/plant types, test users |
| [`hardening.md`](hardening.md) | RLS policies, audit trails, data-purge logic |

Migration/seed **runbooks** live in [`../deployment/README.md`](../deployment/README.md) §G + [`operations.md`](../deployment/operations.md).
