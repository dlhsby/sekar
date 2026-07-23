# Web platform

Next.js 16 (App Router) / React 19 dashboard — 8-role, realtime, installable PWA, Neo Brutalism.
Setup: [`../../../apps/web/README.md`](../../../apps/web/README.md).

| Doc | What |
|-----|------|
| [`pages.md`](pages.md) | Routes / page structure (the catalogue) |
| [`components.md`](components.md) | shadcn/ui + Neo Brutalism wrappers |
| [`data-fetching.md`](data-fetching.md) | TanStack Query patterns |
| [`data-tables.md`](data-tables.md) | TanStack Table — pagination, sort, filter |
| [`forms.md`](forms.md) | React Hook Form + Zod |
| [`authentication.md`](authentication.md) | JWT httpOnly cookie, route guard (`src/proxy.ts`) |
| [`realtime.md`](realtime.md) | Socket.IO client, room subscriptions |
| [`performance.md`](performance.md) | Code-split, lazy load, image optimization |
| [`design-tokens.md`](design-tokens.md) | Tailwind 4 token bindings (SoT: [`../../design-system/`](../../design-system/README.md)) |

Which page implements which capability → [`../../features/`](../../features/README.md).

## Changelog
- 2026-07-23 — **Every mutating action now reports both outcomes.** Action handlers were mostly bare `await mutation.mutateAsync(...)`: no success toast, and on failure an **unhandled rejection** — a server-refused deactivation looked exactly like one that worked, and the row simply did not change. New `lib/hooks/use-action.ts` `runAction(fn, {success, onSuccess})` wraps a mutation with a success toast + `getErrorMessage` error toast and never rethrows. Applied across **aktivitas** (approve/reject, list + detail), **tugas** (verify, request revision, untag, delegate, delete, create), **lembur** (approve/reject), **jadwal** (change shift, change lokasi), **perantingan** (review, convert — were fire-and-forget `mutate`), **notifikasi** (mark all read), plus the **lokasi** and **pengguna** activate/deactivate toggles (which had used fire-and-forget `mutate`). Pending state still comes from each mutation's `isPending`; cache refresh stays in the hook's `onSuccess`. Generic `common:messages.*` keys added (id/en). **Deliberately not swept:** assets, reports (builder/schedules) and seeds — parked features (`specs/features/_archived/`); `notifications/[id]` mark-read stays silent (background side-effect).
