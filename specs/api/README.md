# API

Backend HTTP contracts. **Live spec is Swagger `/api/v1/docs`** (~246 route handlers, 34 modules);
these docs are the written reference.

| Doc | What |
|-----|------|
| [`contracts.md`](contracts.md) | Every endpoint — params, status codes, auth scope (the catalogue) |
| [`authentication.md`](authentication.md) | JWT access + refresh rotation, Passport config, guards |
| [`error-handling.md`](error-handling.md) | Standardized error codes + response shape (API is English-canonical) |

Per-feature endpoint context lives in [`../features/`](../features/README.md).
