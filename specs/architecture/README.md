# Architecture

System design and the decisions behind it. Start with **[`system-overview.md`](system-overview.md)**.

| Doc | What |
|-----|------|
| [`system-overview.md`](system-overview.md) | How the pieces fit — modular monolith, data flow, realtime |
| [`tech-stack.md`](tech-stack.md) | Frameworks, versions, and why |
| [`data-flow.md`](data-flow.md) | End-to-end flow (mobile → backend → web → realtime) |
| [`security.md`](security.md) | Auth, S3, SQL-injection, CORS, dependency audit |
| [`caching-strategy.md`](caching-strategy.md) | Redis Streams, Socket.IO adapter, cache tags |
| [`cross-cutting-concerns.md`](cross-cutting-concerns.md) | Logging, error handling, validation |
| [`decisions/`](decisions/README.md) | **38 ADRs** — the decision log (indexed, grouped, supersessions) |

See also [`../features/`](../features/README.md) (per-feature specs link to the relevant ADRs).
