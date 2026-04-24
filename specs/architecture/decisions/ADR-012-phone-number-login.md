# ADR-012: Phone Number Login with Identifier-Based Authentication

## Status

Accepted

## Context

Client feedback (March 10, 2026) revealed that field workers frequently forget their usernames, making login difficult. Workers already have registered phone numbers (used for WhatsApp contact in the monitoring system), so using phone numbers as an alternative login credential was requested.

Two approaches were considered:

1. **Replace username with phone number** — All users login with phone number only
2. **Dual-identifier approach** — Users can login with either username OR phone number

Approach 1 was rejected because `admin_system` users do not need phone numbers and may not have personal phones associated with the system account.

## Decision

Implement a **dual-identifier authentication** approach:

1. **New `identifier` field in LoginDto** — Replaces the `username` field. The client sends `{ identifier, password }` where `identifier` can be either a username or phone number.

2. **New `phone_number` column on users** — Separate from the existing `phone` column (which stores display phone numbers). `phone_number` is used exclusively for authentication and is unique + indexed.

3. **Detection logic** — The auth service detects whether the identifier looks like a phone number (starts with `0` or `+`) and queries the appropriate column first, with a fallback OR query to handle ambiguous cases.

4. **Role-based enforcement**:
   - Clockable roles (satgas, linmas, korlap, admin_data, kepala_rayon) and top_management: phone_number is recommended but not database-enforced (nullable). Frontend enforces input on user creation/edit for these roles.
   - admin_system and superadmin: phone_number is optional, login remains username-based.

5. **Separate column rationale** — We chose to add `phone_number` as a new column rather than reusing the existing `phone` column because:
   - `phone` may contain non-login display numbers
   - `phone_number` requires a unique constraint for authentication
   - Clean separation of concerns between display data and auth credentials

## Consequences

### Positive
- Workers can login with their familiar phone number
- WhatsApp numbers used for monitoring contact are the same ones used for login
- admin_system users are unaffected (keep username login)
- Backward compatible — existing sessions/tokens remain valid

### Negative
- Breaking API change: `username` → `identifier` in LoginDto requires simultaneous frontend deployment
- Two phone-related columns on users table (`phone` and `phone_number`) may cause confusion
- Need to migrate existing phone data to phone_number column if applicable

### Migration
- Add `phone_number` column with unique partial index (nullable — allows multiple NULLs)
- Populate from existing `phone` column where values are valid Indonesian phone numbers
- Deploy frontend and backend simultaneously (API contract change)

### Deprecation Plan for `phone` Column
- **Phase 2E:** Add `phone_number`, migrate valid data from `phone`; keep `phone` for backward compatibility
- **Phase 3:** Deprecate `phone` column — stop reading/writing in new code, add DB comment marking deprecated
- **Phase 4:** Drop `phone` column after verifying no remaining references
