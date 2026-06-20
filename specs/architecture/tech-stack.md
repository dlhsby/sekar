# Technology Stack

Complete technology specification for all SEKAR system components.

## Backend Stack (NestJS)

### Core Framework
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Node.js** | >=24.13 LTS | Runtime environment | Long-term support, excellent performance |
| **NestJS** | 11.x | Backend framework | Enterprise TypeScript framework, modular architecture |
| **TypeScript** | 5.9 | Programming language | Type safety, better tooling, maintainability |

### Database & ORM
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **PostgreSQL** | 14+ | Primary database | ACID compliance, JSON support, reliability |
| **TypeORM** | 0.3.x | ORM | Excellent NestJS integration, migrations, decorators |
| **pg** | 8.x | PostgreSQL driver | Native PostgreSQL client for Node.js |

### Authentication & Security
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Passport.js** | 0.7.x | Authentication middleware | Industry standard, multiple strategies |
| **@nestjs/passport** | 10.x | NestJS Passport integration | Official NestJS package |
| **@nestjs/jwt** | 10.x | JWT handling | Built-in JWT strategy for Passport |
| **bcrypt** | 5.x | Password hashing | Industry standard, secure hashing (10 rounds) |
| **class-validator** | 0.14.x | Input validation | Decorator-based validation |
| **class-transformer** | 0.5.x | Data transformation | DTO transformation |

### File Storage
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **AWS SDK v3** | 3.x | AWS service integration | Official SDK, modular imports |
| **@aws-sdk/client-s3** | 3.x | S3 operations | Upload/download photos and videos |
| **@aws-sdk/s3-request-presigner** | 3.x | Presigned URLs | Secure direct client uploads |
| **multer** | 1.4.x | File upload handling | Multipart form data parsing |

### API Documentation
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **@nestjs/swagger** | 7.x | OpenAPI documentation | Auto-generate API docs, SwaggerUI |
| **swagger-ui-express** | 5.x | Swagger UI hosting | Interactive API testing |

### Testing
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Jest** | 29.x | Test framework | De facto Node.js testing standard |
| **@nestjs/testing** | 10.x | NestJS test utilities | Module mocking, dependency injection |
| **supertest** | 6.x | HTTP assertion | E2E API testing |

### Development Tools
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **ESLint** | 8.x | Code linting | Catch errors, enforce style |
| **Prettier** | 3.x | Code formatting | Consistent code style |
| **ts-node** | 10.x | TypeScript execution | Run TS without compilation |
| **nodemon** | 3.x | Dev server | Auto-restart on file changes |

### Future Additions (Phase 2+)
| Technology | Version | Purpose | Phase |
|------------|---------|---------|-------|
| **Redis** | 7.x | Caching, session store | Phase 2 |
| **Bull** | 4.x | Background job queue | Phase 2 |
| **@nestjs/throttler** | 5.x | Rate limiting | Phase 2 |
| **Winston** | 3.x | Logging | Phase 2 |
| **Sentry** | 7.x | Error tracking | Phase 2 |
| **Elastic Search** | 8.x | Full-text search | Phase 3 |
| **Socket.io** | 4.x | Real-time communication | Phase 3 |

---

## Mobile Stack (React Native)

### Core Framework
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **React Native** | 0.83.x | Mobile framework | Cross-platform, native performance |
| **React** | 19.x | UI library | Component-based architecture |
| **TypeScript** | 5.9 | Programming language | Type safety, better tooling |

### State Management
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Redux Toolkit** | 2.x | Global state management | Official recommended approach, less boilerplate |
| **React Redux** | 9.x | React bindings for Redux | Official React integration |
| **redux-persist** | 6.x | State persistence | Offline data persistence |
| **@react-native-firebase/messaging** | 18.x | FCM push notifications | Phase 5+ (enabled per-environment) |

### Navigation
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **React Navigation** | 6.x | Navigation library | Most popular, native feel |
| **@react-navigation/native** | 6.x | Core navigation | Base functionality |
| **@react-navigation/native-stack** | 6.x | Stack navigation | iOS/Android native navigation |
| **@react-navigation/bottom-tabs** | 6.x | Tab navigation | Bottom tab bar |

### Storage
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **@react-native-async-storage/async-storage** | 1.x | Async key-value storage | Official community package |
| **react-native-encrypted-storage** | 4.x | Encrypted storage | Secure storage for tokens |

### Location & Maps
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **react-native-geolocation-service** | 5.x | GPS location | Better than built-in, more reliable |
| **react-native-maps** | 1.x | Map display | Industry standard for RN maps |
| **@react-native-community/geolocation** | 3.x | Location services | Fallback option |

### Camera & Media
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **react-native-image-picker** | 7.x | Photo/video capture | Simple API, good permissions handling |
| **react-native-vision-camera** | - | Advanced camera (future) | Better performance (Phase 2+) |
| **react-native-fast-image** | 8.x | Optimized image loading | Caching, better performance |

### Networking
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **axios** | 1.x | HTTP client | Promise-based, interceptors, retry logic |
| **@react-native-community/netinfo** | 11.x | Network status monitoring | Detect online/offline |

### Permissions
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **react-native-permissions** | 4.x | Unified permissions API | Cross-platform permissions handling |

### UI Components
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **react-native-vector-icons** | 10.x | Icon library | Large icon set, easy to use |
| **react-native-paper** | 5.x (optional) | Material Design components | Consistent UI (Phase 2+) |

### Utilities
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **date-fns** | 3.x | Date manipulation | Lightweight, immutable |
| **react-hook-form** | 7.x | Form management | Performance, validation |

### Testing
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Jest** | 29.x | Test framework | Built-in with RN |
| **@testing-library/react-native** | 12.x | Component testing | Best practices testing |
| **@testing-library/jest-native** | 5.x | Additional matchers | Better assertions |

### Development Tools
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Metro** | 0.80.x | JavaScript bundler | Built-in with RN |
| **React Native Debugger** | Latest | Debugging | Redux DevTools integration |
| **Flipper** | Latest | Mobile debugging | Network inspector, layout |
| **ESLint** | 8.x | Code linting | Catch errors, enforce style |
| **Prettier** | 3.x | Code formatting | Consistent code style |

### Future Additions (Phase 2+)
| Technology | Version | Purpose | Phase |
|------------|---------|---------|-------|
| **@react-native-firebase/messaging** | 18.x | Push notifications | Phase 2 |
| **react-native-background-fetch** | 4.x | Background tasks | Phase 2 |
| **react-native-keychain** | 8.x | Secure credential storage | Phase 2 |
| **react-native-biometrics** | 3.x | Biometric auth | Phase 2 |
| **react-native-device-info** | 10.x | Device information | Phase 2 |
| **Sentry React Native** | 5.x | Error tracking | Phase 2 |
| **Detox** | 20.x | E2E testing | Phase 3 |

---

## Web Stack (Next.js) - Phase 6

### Core Framework
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Next.js** | 16.x | React framework | SSR, app router, TypeScript support |
| **React** | 19.x | UI library | Component-based architecture |
| **TypeScript** | 5.9 | Programming language | Type safety, better tooling |

### State Management
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **TanStack Query** (React Query) | 5.x | Server state management | Caching, automatic refetch |
| **Zustand** | 4.x | Client state management | Lightweight, simple API |

### Styling
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Tailwind CSS** | 4.x | Utility-first CSS | Rapid development, consistency |
| **PostCSS** | 8.x | CSS processing | Tailwind dependency |
| **Autoprefixer** | 10.x | CSS vendor prefixes | Browser compatibility |

### UI Components
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Radix UI** | 1.x | Headless components | Accessibility, customizable |
| **shadcn/ui** | Latest | Component library | Built on Radix, Tailwind |
| **Lucide React** | Latest | Icon library | Modern, consistent icons |

### Data Visualization & Maps
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Recharts** | 2.x | Chart library | React-based, declarative |
| **Mapbox GL JS** | Latest | Map display | High-performance vector tiles, mobile-friendly |

### Forms & Validation
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **React Hook Form** | 7.x | Form management | Performance, validation |
| **Zod** | 3.x | Schema validation | TypeScript-first validation |

### Authentication
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **AuthContext** | (custom) | Authentication | JWT via httpOnly cookies, route guards via `src/proxy.ts` |

### Testing
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Jest** | 29.x | Test framework | Industry standard for Next.js |
| **@testing-library/react** | 14.x | Component testing | Best practices testing |
| **Playwright** | 1.x | E2E testing | Cross-browser testing (required >80% coverage) |

### Development Tools
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **ESLint** | 8.x | Code linting | Catch errors, enforce style |
| **Prettier** | 3.x | Code formatting | Consistent code style |

---

## Database Stack

### Primary Database
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **PostgreSQL** | 14+ | Relational database | ACID, JSON, mature |

### Development Tools
| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Adminer** | 4.8.x | Database GUI | Lightweight, web-based |
| **pgAdmin** | - | Database GUI (alternative) | More features, heavier |

### Future Additions (Phase 3+)
| Technology | Version | Purpose | Phase |
|------------|---------|---------|-------|
| **Redis** | 7.x | Caching | Phase 2 |
| **TimescaleDB** | 2.x | Time-series data | Phase 4 (location history) |
| **PostGIS** | 3.x | Geospatial queries | Phase 4 (advanced location) |

---

## Infrastructure & DevOps

### Cloud & On-Prem Infrastructure
| Technology | Purpose | Status |
|------------|---------|--------|
| **AWS (Staging)** | Cloud infrastructure | ap-southeast-3, co-tenant EC2 + RDS |
| **AWS RDS** | Managed PostgreSQL (staging) | Automated backups, scaling |
| **AWS S3** | Object storage (staging) | Reliable, scalable media storage |
| **AWS Systems Manager** | Secret rotation, parameter store | Per-environment keys via GitHub OIDC |
| **Docker Compose (Production)** | On-prem containerization | Production = docker-compose.prod.yml (no cloud) |
| **MinIO** | S3-compatible object storage | Dev (localhost:9000) + Production (on-prem) |
| **Redis** | Caching, Streams, WebSocket adapter | Staging + Production (ADR-029) |
| **AWS CloudWatch** | Monitoring (staging) | Logs, metrics, alarms |

### CI/CD & Deployment
| Technology | Purpose | Current Setup |
|------------|---------|--------------|
| **GitHub Actions** | CI/CD pipeline | Integrated with GitHub, free |
| **Docker** | Containerization | Consistent environments (staging + production) |
| **Docker Compose** | Local development + production | Multi-container orchestration |
| **GitHub OIDC** | Secure AWS credential exchange | Staging deploy authentication |
| **AWS ECR** | Container registry | Staging image storage |
| **AWS Systems Manager** | Parameter storage, secret rotation | Environment-specific secrets via SSM |

### Monitoring & Logging
| Technology | Version | Purpose | Phase |
|------------|---------|---------|-------|
| **AWS CloudWatch** | - | Application monitoring | Phase 1 |
| **Sentry** | 7.x | Error tracking | Phase 2 |
| **Winston** | 3.x | Structured logging | Phase 2 |
| **Datadog** | - | APM (optional) | Phase 3+ |

---

## Development Environment

### Required Tools
| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18.x LTS | Runtime |
| **npm** | 9.x | Package manager |
| **Git** | 2.x | Version control |
| **Docker** | 24.x | Containerization |
| **Docker Compose** | 2.x | Multi-container |
| **Android Studio** | Latest | Android development |
| **Xcode** | Latest (macOS) | iOS development |
| **VS Code** | Latest | Code editor (recommended) |

### Recommended VS Code Extensions
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Docker
- Thunder Client (API testing)
- GitLens
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense (for web)

---

## Version Strategy

### Dependency Updates
- **Major versions:** Review breaking changes, test thoroughly
- **Minor versions:** Safe to update regularly
- **Patch versions:** Auto-update (security fixes)

### Lock Files
- **Backend:** `package-lock.json` (npm)
- **Mobile:** `package-lock.json` (npm)
- **Web:** `package-lock.json` (npm)
- Always commit lock files to git

### Node.js LTS Strategy
- Production: >=24.13 LTS (current)
- Dev/CI: >=24.13 LTS
- Update cadence: Minor version updates quarterly, patches as needed
- Never use odd-numbered versions in production

---

## Technology Decision Log

### Why TypeScript Everywhere?
- Catch errors at compile time
- Better IDE support (autocomplete, refactoring)
- Self-documenting code via types
- Easier refactoring
- Industry standard for large projects

### Why Redux Toolkit over Context API?
- Better DevTools
- Middleware support (redux-persist, logger)
- Time-travel debugging
- Scales better for complex state
- Undo/redo capabilities

### Why JWT over Session Cookies?
- Stateless (easier to scale horizontally)
- Works well with mobile apps
- No server-side session storage needed
- Can include claims (role, permissions)
- Industry standard for APIs

### Why PostgreSQL over MySQL/MongoDB?
- ACID compliance for financial/tracking data
- JSON/JSONB for flexibility when needed
- Excellent TypeORM support
- PostGIS for future geospatial features
- More robust for complex queries

### Why React Navigation over React Native Navigation?
- Pure JavaScript (no native code changes)
- Easier to customize
- Better TypeScript support
- Larger community
- Sufficient for our use case

---

**Document Owner:** Software Architect
**Last Updated:** 2026-06-20
**Status:** Active — Phases 1–5 shipped
**Related Docs:** [`system-overview.md`](./system-overview.md), [`data-flow.md`](./data-flow.md), [`../CLAUDE.md`](../../CLAUDE.md)
