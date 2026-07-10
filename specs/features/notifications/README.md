# Notifications

**Status:** ✅ Active · **Backend:** `notifications`, `queue` · **Key ADRs:** ADR-016 (Redis / retry)

## Overview
Push notifications via FCM with a BullMQ retry queue, plus in-app realtime toasts over WebSocket. FCM token registration on login; delivery is feature-flagged (`FCM_ENABLED`) until Firebase is configured.

## Key decisions
- **BullMQ on Redis** (ADR-016) — async delivery with retry.
- In-app notifications also delivered over the Socket.IO realtime channel.

## Implementation
- **API:** [`../../api/contracts.md`](../../api/contracts.md) · errors [`../../api/error-handling.md`](../../api/error-handling.md) (live Swagger `/api/v1/docs`)
- **Database:** [`../../database/schema.md`](../../database/schema.md)
- **Web:** notification dropdown / toasts — [`../../platforms/web/pages.md`](../../platforms/web/pages.md)
- **Mobile:** push + in-app toasts — [`../../platforms/mobile/screens.md`](../../platforms/mobile/screens.md)

## Related features
- [monitoring](../monitoring/README.md)
- [system](../system/README.md)

## Changelog
- 2026-07-10 — Spec created in product-docs restructure. History: [`../../history/CHANGELOG.md`](../../history/CHANGELOG.md).
