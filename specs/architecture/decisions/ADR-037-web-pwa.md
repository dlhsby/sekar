# ADR-037: Web becomes an installable PWA (service worker + offline shell + web push)

## Status

Accepted

## Date

2026-04-25

## Context

SEKAR's web dashboard serves two audiences today and will serve a third in Phase 3:

1. **Supervisors in the field** — `korlap`, `kepala_rayon`. They use their phone browser when away from a desk; the current site is desktop-only and hostile on a phone.
2. **Desk roles** — `admin_data`, `top_management`, `admin_system`, `superadmin`. Stable desk with reliable internet.
3. **Kecamatan staff (new, Phase 3)** — `staff_kecamatan`. Submit pruning requests from a sub-district office, then monitor outcomes. Primary channel is mobile; the backup is a phone browser.

Two Phase 3 realities tip the balance:

- **Monitoring v2 snapshot payload is expensive** ([ADR-029](./ADR-029-monitoring-v2-event-sourced-redis.md)). Every full-refresh-on-filter today costs ~200 kB + a DB query storm. Stale-while-revalidate caching on the snapshot endpoint is the single largest bandwidth win for supervisors on mobile networks.
- **Kecamatan submissions come from spotty field connections.** The submission itself still needs the network (we do not queue writes client-side — see ADR-019), but the shell must load offline so staff can at least see their existing requests while waiting for signal.

Native apps are already covered by `apps/mobile`. The web channel doesn't need to *replace* mobile — it needs to be a **decent backup** for field users who don't have the app installed, and a **first-class experience** for desk users who spend all day in it.

## Decision

**Web becomes an installable PWA starting Phase 3 M1-R sub-phase 3-R4.**

- Ship `/manifest.webmanifest` with brand colors from [tokens.json](../../design-system/tokens.json): `background_color: "#F5F0EB"`, `theme_color: "#1A4D2E"`.
- Ship a service worker (`public/sw.js`) with a shell precache + route-aware caching strategies:

  | Pattern | Strategy | Rationale |
  |---------|----------|-----------|
  | `/_next/static/**`, fonts, generated tokens, icons | **cache-first**, 1 year | Immutable build assets |
  | `GET /api/monitoring/snapshot` | **stale-while-revalidate**, 30 s | Always render last-good; banner when stale |
  | `GET /api/plant-species` | **cache-first**, 1 day | 131 rows rarely change |
  | `GET /api/pruning-requests/**` (detail) | **network-first**, 2 s timeout → cache | Reviewers need fresh data |
  | `GET /api/schedules/**` | cache-first, 5 min | Quasi-static |
  | `POST`/`PUT`/`PATCH`/`DELETE` | **network-only** | Writes are never queued client-side |
  | `GET /api/auth/**` | network-only | Never cache auth |

- **No client-side write queueing.** This is load-bearing: the mobile app owns offline writes (AsyncStorage queue). Adding a second offline-write system in the web PWA would duplicate conflict resolution and give us two sources of truth for unsynced actions. The web PWA is read-first, write-online-only.

- **Install prompt:**
  - Capture `beforeinstallprompt` on `/login` and `/monitoring`.
  - Render an NB-styled banner (yellow `#FDFD96`, 2 px border, 4 px shadow) instead of the raw browser banner.
  - "Nanti saja" suppresses for 14 days via `localStorage`.
  - iOS Safari: fallback to a `/install-help` page with screenshots (Safari doesn't fire `beforeinstallprompt`).

- **Offline banner:** persistent top strip when `navigator.onLine === false`; `role="status"`; write CTAs visually disabled with tooltip "Butuh koneksi."

- **Web push notifications** (same FCM project as the native app): subscribed for `admin_data`, `kepala_rayon`, `top_management`, `admin_system`, `superadmin`. Types mirror mobile (`pruning_request_submitted`, `task_overdue`, `area_plant_overdue`, etc.); click deep-links into the PWA.

- **Field-role mobile-web escape hatch:** if a user with role `satgas` / `linmas` / `korlap` hits the site on a viewport < 768 px, show a banner pointing to Play Store / App Store. Don't redirect; field staff may legitimately need a browser fallback.

## Consequences

### Positive

- **Shell loads offline.** Supervisors stuck on slow hotel wi-fi at 7 am still see the last-good monitoring snapshot with a yellow "Mode offline — data 2 menit lalu" banner.
- **Snapshot bandwidth drops sharply.** Stale-while-revalidate on `/monitoring/snapshot` means repeat loads are instant and the network fetch is backgrounded.
- **Browser push works for desk admins** who don't have the mobile app installed — one fewer reason to delay a kecamatan review.
- **Kecamatan staff get an "app-like" experience** on the web channel without us shipping a native app for them (they're a small cohort — not worth a RN build).
- **Install banner honors Neo Brutalism.** The PWA feels like SEKAR, not like a stock browser prompt.

### Negative

- **Service worker adds lifecycle complexity.** Stale workers can pin old bundles. Mitigated by `UpdateToast` that surfaces "Versi baru tersedia — [Muat ulang]" when the SW detects a waiting update.
- **HTTPS-only, in all environments.** Dev setup needs local HTTPS (`next dev --experimental-https` or a caddy reverse proxy). Documented in deployment specs.
- **Web push subscription management is a new surface.** Token lifecycle (subscribe on login, unsubscribe on logout, resubscribe on device change) needs testing. Testing covered in M1-R sub-phase 3-R4 (scaffolding) + 3-9 (backend) + 3-14 (load).
- **iOS install path is worse than Android.** Until Apple fires `beforeinstallprompt` consistently, we ship a `/install-help` page with screenshots. Acceptable; iOS users are minority of the field cohort.
- **One more file to manage per deploy.** `sw.js` must be versioned; cache keys include the build hash to prevent stale-asset bugs.

## Alternatives Considered

- **Native-app-only for field roles; ignore mobile-web entirely.** Rejected — kecamatan staff without the app need a submission channel today, and supervisors in transit use a browser even when the app is installed. A half-usable mobile web is strictly better than "use the app" stickers on a desk.
- **Wrap apps/web in Capacitor as a WebView app.** Rejected — we already have a first-class React Native app for field roles; a WebView wrapper for desk roles solves a problem we don't have and adds App Store overhead.
- **Offline writes in the PWA (full queue).** Rejected — second source of truth conflicts with the mobile offline queue (ADR-019). Writes stay online-only on web.
- **Don't ship a PWA; just make the site mobile-responsive.** Rejected — cache-first snapshot loading is the main bandwidth win, and it needs a service worker. Responsive layout alone leaves supervisors re-downloading 200 kB of payload every filter tap.

## References

- [design-tokens.md §PWA Requirements](../../design-system/design-tokens.md) — manifest, icons, service worker, install banner, push notifications, offline shell
- [ADR-036](./ADR-036-design-tokens-single-source.md) — tokens consumed by the manifest and install banner
- [ADR-029](./ADR-029-monitoring-v2-event-sourced-redis.md) — monitoring snapshot endpoint that benefits most from SWR caching
- [ADR-019](./ADR-019-offline-connectivity-model.md) — offline connectivity model that mobile owns; web inherits the terminology but not the write queue
- Phase 3: [README](../../history/CHANGELOG.md) · [web](../../history/CHANGELOG.md) · [ui-ux](../../history/CHANGELOG.md)
