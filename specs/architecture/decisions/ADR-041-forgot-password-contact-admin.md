# ADR-041: Forgot-password = contact admin (no self-serve reset)

## Status

Accepted (Phase 4 M3a, 2026-05-24 — backend `users.password_must_change` + `POST /auth/change-password` shipped; mobile ForgotPasswordScreen (AS-4) + ChangePasswordScreen (AS-5) shipped).

## Date

2026-05-22 (proposed) · 2026-05-24 (accepted)

## Context

SEKAR has never had a forgot-password user flow. Logins are username / phone + password, validated by `ThrottlerGuard` and `AUTH_LOGIN_THROTTLE_*` env knobs (added in Phase 3). Password resets today are an out-of-band conversation: a user contacts an admin through WhatsApp / phone, the admin opens the web console, sets a new password via the user-edit endpoint, and tells the user the new password verbally.

This works because SEKAR is a managed municipal workforce — every satgas / linmas / korlap is onboarded by a kepala rayon, every admin sits in the same office, and the threat model assumes adversary access is more likely via lost phone than via password-reset social-engineering.

The Claude Design hi-fi makes the existing practice explicit:

- **AS-4 "Lupa sandi · contact admin"** — an informational screen listing per-rayon admin contact (phone + WhatsApp deep-links) with the headline "Sandi tidak bisa di-reset sendiri". No email field, no SMS code, no security questions.
- **AS-5 "Ganti sandi · forced after reset"** — a forced password-change screen that surfaces when the admin has reset the user's password. Locks the user in until they set their own password; success state ("Sandi tersimpan") routes to home.

This is a deliberate user-flow choice; the user iterated on it across multiple chats and landed there. The alternative (self-serve reset via email / SMS) was considered and rejected because:

1. **Not every satgas has an email account.** SEKAR onboards users with username + phone; email is optional. Self-serve email reset is not a universal channel.
2. **SMS gateway cost + integration.** Adds AWS SNS / Twilio dependency for a low-volume need (current support volume is ~ 5 resets / week organisation-wide).
3. **Phishing risk.** Satgas are not security-trained users; an SMS reset link is a phishable channel. The wa.me link to a known admin is a stronger trust anchor than an SMS code from an unknown number.
4. **Municipal IT policy.** DLH Surabaya's existing internal apps follow the same "contact admin" pattern for password resets.

## Decision

**SEKAR will not implement a self-serve password-reset endpoint.** Forgot-password is an informational screen (mobile AS-4 + web mirror) that surfaces per-rayon admin contact details. Admin-driven resets use the existing `PATCH /users/:id` endpoint, extended to set `users.password_must_change = true`. On next login the user is forced into a change-password flow (mobile AS-5 + web mirror) that clears the flag.

Concretely:

1. **Backend** — add `users.password_must_change BOOLEAN NOT NULL DEFAULT false` column. The existing admin reset path (whatever endpoint admins use today) sets the flag. `/auth/login` and `/auth/me` return the flag in the user payload. The existing `/auth/change-password` endpoint clears the flag on success.
2. **Mobile** — `ForgotPasswordScreen` (AS-4) is informational; renders per-rayon admin contact list with `tel:` and `wa.me` deep-links. `ChangePasswordScreen` (AS-5) is required when `password_must_change=true`; the auth-guard pushes the user there before any other route.
3. **Web** — mirror at `(auth)/forgot-password/page.tsx`. Web also surfaces forced-change at the same route as mobile (`/change-password` redirect on login response).
4. **Admin UX** — when an admin resets a password (existing user-edit screen), surface a confirmation: "User will be forced to change password on next login."

Per-rayon admin contact data is stored in `rayons` table (existing fields `contact_phone`, `contact_whatsapp` or equivalent — add if missing). AS-4 fetches via `GET /rayons/contacts` (admin contact list, public-readable).

## Consequences

### Positive

- **No new attack surface.** No email / SMS / OTP service to integrate; no rate-limit edge cases on a reset endpoint.
- **No new dependencies.** No SES / SNS / Twilio.
- **Audit trail intact.** Every reset already passes through admin user-edit, which is audit-logged.
- **Forced password change keeps the rotation hygienic.** Users set their own password after reset rather than continuing to use whatever the admin typed.
- **Faster to ship.** AS-4 is informational HTML; AS-5 uses an existing endpoint.

### Negative

- **24/7 admin coverage required.** A satgas who forgets their password at 2 am can't reset until an admin is reachable. Mitigated by per-rayon WhatsApp contact + 8 rayons means generally someone is awake.
- **Doesn't scale to consumer-grade adoption.** If SEKAR ever opens to public-facing users beyond `staff_kecamatan`, this flow must be revisited.
- **Admin burden.** ~ 5 resets/week today; expected to plateau at ~ 15/week at full deployment (500 satgas). Admin time per reset ≈ 2 min — total ≈ 30 min/week absorbed by `admin_rayon` role.

### Neutral

- **Future migration path is open.** If `staff_kecamatan` adoption grows or municipal IT policy changes, a self-serve reset endpoint can be added later without breaking this ADR — the AS-4 screen would simply gain a "reset via email" button.

## Implementation

Phase 4 Sub-Phase 4-R (mobile + web AS-4 / AS-5 screens) + backend `password_must_change` column migration. See [`mobile.md § R1`](../../history/CHANGELOG.md) and the mobile screen matrix at [`mobile.md § Login & auth`](../../history/CHANGELOG.md).

## References

- `design/project/hifi-mobile.html` § Login & auth (AS-4, AS-5)
- `design/chats/chat1.md` — design intent (forgot-password discussion)
- ADR-004 — JWT authentication baseline
- ADR-009 — role system (admin / admin_rayon / superadmin are the reset-authorized roles)
