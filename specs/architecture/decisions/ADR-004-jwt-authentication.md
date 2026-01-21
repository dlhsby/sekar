# ADR-004: JWT Authentication with Refresh Tokens

**Date:** 2026-01-09 (Updated 2026-01-16)
**Status:** ✅ Accepted
**Deciders:** System Architect, Security Team
**Tags:** security, authentication, api

---

## Context

Need stateless authentication for mobile app and future web dashboard. Must support offline mobile use and role-based access control.

---

## Decision

**Use JWT (JSON Web Tokens) for stateless authentication with a two-token system:**
- **Access Token:** Short-lived (15 minutes)
- **Refresh Token:** Long-lived (7 days), one-time use with rotation

### Token Structure

```typescript
// Access Token Payload
{
  sub: "user-uuid",
  username: "john_doe",
  role: "worker",
  iat: 1642435200,
  exp: 1642436100  // 15 minutes
}

// Refresh Token (opaque, stored in database)
{
  sub: "user-uuid",
  tokenFamily: "family-uuid",
  iat: 1642435200,
  exp: 1643040000  // 7 days
}
```

### Authentication Flow

```typescript
// 1. Login
POST /api/v1/auth/login
→ { access_token, refresh_token, expires_in: 900 }

// 2. API Request
GET /api/v1/shifts
Headers: { Authorization: "Bearer <access_token>" }

// 3. Token Refresh (when access token expires)
POST /api/v1/auth/refresh
Body: { refresh_token }
→ { access_token, refresh_token, expires_in: 900 }
```

---

## Consequences

### ✅ Positive
- **Stateless:** No server-side session storage needed
- **Scalable:** Can horizontally scale backend without shared session state
- **Mobile-friendly:** Tokens stored securely in Encrypted Storage
- **RBAC:** Role included in token, checked by guards
- **Offline:** Token valid for 7 days without server communication

### ❌ Negative
- **Cannot revoke:** Access tokens valid until expiry (15 min window)
- **Token size:** ~200 bytes per request (acceptable overhead)
- **Refresh complexity:** Need refresh endpoint and rotation logic

### Security Features
- ✅ Bcrypt password hashing (10 rounds)
- ✅ Refresh token rotation (one-time use)
- ✅ Token family tracking (detects stolen refresh tokens)
- ✅ HTTPS only (in production)
- ✅ HTTP-only cookies for web (Phase 6)

---

## Alternatives Considered

1. **Session-based auth** - Requires server-side storage, not scalable
2. **OAuth2** - Overkill for internal app, no third-party login needed
3. **Longer access tokens (7 days)** - Security risk, cannot revoke

---

## Implementation

- [x] JWT strategy with Passport.js
- [x] JwtAuthGuard for protected routes
- [x] RolesGuard for RBAC
- [x] Refresh token endpoint
- [x] Token rotation logic
- [x] Mobile: Encrypted Storage for tokens
- [x] Auto-refresh in mobile app

---

**Related ADRs:** [ADR-008: Modular Monolith](./ADR-008-modular-monolith.md)

**References:**
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)

**Last Updated:** 2026-01-16
