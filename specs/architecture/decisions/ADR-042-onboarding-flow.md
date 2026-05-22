# ADR-042: First-launch onboarding — pre-login carousel + permissions priming + area preview

## Status

Proposed

## Date

2026-05-22

## Context

Phase 1 → Phase 3 shipped SEKAR with **no first-launch onboarding**. The user opens the app and lands directly at the login screen; permissions are requested ad-hoc the first time a feature needs them (location on clock-in, camera on selfie, gallery on perantingan photo upload, notification on FCM-enabled). This:

1. **Burns goodwill on cold permission prompts.** A satgas first asked to grant location permission has no context — they tap "Tolak" half the time, breaking the entire app for them.
2. **Hides the product story.** Satgas onboarding is done verbally by kepala rayon; nothing in the app communicates what SEKAR does.
3. **Misses the moment of arrival.** First-launch is the highest-engagement moment in a user's lifecycle — currently spent staring at a login form.

The Claude Design hi-fi designs a deliberate first-launch sequence:

- **Pre-login (WL-1…WL-5)** — 5-slide swipeable carousel introducing SEKAR's value props (Pantau real-time, Tugas terstruktur, Permohonan kecamatan, Offline-ready) before login. Skippable.
- **Login (AS-1…AS-5)** — see [ADR-041](./ADR-041-forgot-password-contact-admin.md).
- **Post-login first-time (OB-1…OB-3)** — 3 screens that run **once per user** after first successful login:
  - **OB-1 Welcome** — role-aware greeting + role badge + the user's area.
  - **OB-2 Permissions priming** — 6 permission cards with explicit justification (location, camera, notification, gallery, phone, SMS), sequential request flow.
  - **OB-3 Area preview** — embedded map + the user's area card + clock-in CTA.

The user iterated on this sequence in chat and landed on this specific structure. Specifically, the user **rejected** a post-install tutorial overlay variant — they wanted education to happen *before* the user is inside the product.

## Decision

**Implement the WL-1…WL-5 + OB-1…OB-3 first-launch sequence as the canonical onboarding for SEKAR.** The carousel runs once per device (AsyncStorage flag `carousel_seen`); the OB sequence runs once per user account (AsyncStorage flag `onboarding_completed`, keyed by user ID to handle multi-account devices).

Auth-guard routing precedence (top wins):

1. Not authenticated + `!carousel_seen` → **WelcomeCarousel (WL-1…WL-5)**
2. Not authenticated → **Login (AS-1)**
3. Authenticated + `password_must_change=true` → **ChangePassword (AS-5)** *(per ADR-041)*
4. Authenticated + `!onboarding_completed[userId]` → **OnboardingWelcome (OB-1)**
5. Authenticated + onboarded → role-aware **Home (HOME-1/2/3)**

Permission priming uses **explicit just-in-time justification** at OB-2:

| Permission | Justification copy (Indonesian) | Granted via |
|------------|----------------------------------|-------------|
| Lokasi (foreground + background) | "Untuk mencatat absensi dan pantau real-time di area kerja" | `react-native-permissions` LOCATION_ALWAYS |
| Kamera | "Untuk selfie absensi dan foto bukti kerja" | CAMERA |
| Notifikasi | "Untuk tugas baru, persetujuan lembur, dan permohonan" | `messaging().requestPermission()` |
| Galeri | "Untuk lampirkan foto dari galeri pada laporan" | `PHOTO_LIBRARY` / `READ_MEDIA_IMAGES` |
| Telepon | "Untuk panggil koordinator / admin dari aplikasi" | n/a — `CALL_PHONE` only requested if user taps a `tel:` link |
| SMS | "Untuk verifikasi nomor (jika diperlukan)" | n/a — SMS used out-of-band; this is informational consent only |

If the user declines a permission, the corresponding feature degrades gracefully (clock-in shows "Aktifkan lokasi" prompt; FCM bell silently disabled; etc.). The onboarding completes regardless; the app does not gatekeep on declined permissions.

OB-3 area-preview shows the user's primary area (from `users.area_id` or first `user_areas` row). Tapping "Mulai shift saya" routes to the role-aware home with the clock-in card primed.

For `staff_kecamatan` (the new role added in ADR-033), OB-3 shows their kecamatan map view instead of area, and the CTA becomes "Lihat permohonan saya" (no clock-in available for kecamatan).

The previously-implemented `PermissionsModal.tsx` (Phase 3 Round 2 — Apr 27 staff_kecamatan UX fixes) is **deleted**; OB-2 replaces it as the single permission-request entry point. Any feature that needs a permission at runtime falls back to the same `react-native-permissions` flow but does not double-prompt.

## Consequences

### Positive

- **Permission grant rate goes up.** Users receive context before the OS prompt; less "Tolak" by accident.
- **First-launch tells the product story.** WL-1…WL-5 sets expectation; OB-3 grounds the user in their area.
- **Single permission-request entry point.** All 6 permissions live in OB-2; eliminates ad-hoc prompts scattered across features.
- **Role-aware welcome.** `staff_kecamatan` doesn't see clock-in language; satgas doesn't see permohonan-list language; etc.
- **Discoverable for new releases.** When a major change ships, `carousel_seen` can be bumped (e.g., `carousel_seen_v2`) to re-trigger.

### Negative

- **+7 mobile screens to build.** WL-1…WL-5 (1 file), AS-4 (1), AS-5 (1), OB-1/2/3 (3), NOTIF-1 (1). All net-new code.
- **Routing logic in `AppNavigator.tsx` grows.** Auth-guard now considers 4 flag combinations (carousel + must-change + onboarded + role).
- **`carousel_seen` reset across re-installs is intentional.** Users who uninstall + reinstall see the carousel again. Acceptable.
- **Multi-account devices need user-scoped onboarding flags.** `onboarding_completed[userId]: true` map instead of a single boolean.

### Neutral

- **Onboarding does not gate features.** Even if user declines all permissions, they reach the home screen. This is by design — permissions are about quality of experience, not access.

## Implementation

Phase 4 Sub-Phase 4-R. See [`mobile.md § Pre-login carousel`](../../phases/phase-4-production-readiness/mobile.md#ui-ux-revamp) and [`mobile.md § Onboarding & permissions`](../../phases/phase-4-production-readiness/mobile.md#ui-ux-revamp).

## References

- `design/project/hifi-mobile.html` § Pre-login carousel + Onboarding & permissions
- `design/chats/chat1.md` — onboarding flow discussion
- ADR-041 — paired with this ADR (auth-guard routing)
- ADR-009 / ADR-033 — role definitions used for OB-1 / OB-3 role-aware variants
