# 🤖 SEKAR Development Plans

This folder contains **comprehensive, phase-by-phase development plans** for building the SEKAR system. These documents are designed to be used with AI coding assistants (Claude, GPT, etc.) or as detailed roadmaps for human developers.

---

## 📋 Table of Contents

- [Project Organization](#-project-organization)
- [Quick Start for AI Agents](#-quick-start-for-ai-agents)
- [Tech Stack & Architecture](#-tech-stack--architecture)
- [Phase Overview](#-phase-overview)
- [Phase Details](#-phase-details)
- [Key Decisions](#-key-decisions)
- [Cost Estimates](#-cost-estimates)
- [Documentation Architecture](#-documentation-architecture)
- [Testing Standards](#-testing-standards)
- [Using with AI Assistants](#-using-with-ai-assistants)

---

## 📁 Project Organization

```
sekar/
├── .agents/                    # ← You are here (High-level plans)
│   ├── README.md               # This file - START HERE
│   └── phase-X-*/              # Phase overviews
│
├── be/.agents/                 # 🔴 Backend (NestJS)
│   ├── README.md
│   ├── ROADMAP.md
│   ├── CURRENT_STATUS.md
│   └── phase-X-*/              # Detailed BE plans
│
├── fe/mobile/.agents/          # 📱 Mobile (React Native)
│   ├── README.md
│   ├── ROADMAP.md
│   ├── CURRENT_STATUS.md
│   └── phase-X-*/              # Detailed mobile plans
│
└── fe/web/.agents/             # 🌐 Web (Next.js)
    ├── README.md
    ├── ROADMAP.md
    ├── CURRENT_STATUS.md
    └── phase-X-*/              # Detailed web plans
```

---

## 🎯 Quick Start for AI Agents

### Working on Backend
```
Read @be/.agents/CURRENT_STATUS.md for progress.
Follow @be/.agents/phase-1-mvp/overview.md for current tasks.
```

### Working on Mobile
```
Read @fe/mobile/.agents/CURRENT_STATUS.md for progress.
Follow @fe/mobile/.agents/phase-1-mvp/overview.md for current tasks.
```

### Working on Web
```
Read @fe/web/.agents/CURRENT_STATUS.md for progress.
Follow @fe/web/.agents/phase-6-full-dashboard/overview.md for tasks.
```

---

## 🛠️ Tech Stack & Architecture

### Backend
| Component | Technology |
|-----------|------------|
| Framework | NestJS |
| Language | TypeScript |
| Database | PostgreSQL (AWS RDS) |
| ORM | TypeORM |
| Auth | JWT with Passport |
| Storage | AWS S3 |
| Hosting | AWS Elastic Beanstalk / ECS |

### Mobile
| Component | Technology |
|-----------|------------|
| Framework | React Native |
| Language | TypeScript |
| State | Zustand |
| Offline | SQLite / WatermelonDB |
| Maps | Google Maps (react-native-maps) |
| Platform | Android (MVP), iOS (Phase 5) |

### Web Dashboard
| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS |
| Components | Shadcn/ui |
| State | Zustand + TanStack Query |
| Charts | Recharts |

---

## 📅 Phase Overview

| Phase | Duration | Backend | Mobile | Web |
|-------|----------|---------|--------|-----|
| **1 - MVP** | 2 weeks | ✅ Auth, Shifts, Reports | ✅ Worker & Supervisor | ❌ |
| **2 - Enhanced** | 2-3 weeks | ✅ Tasks, Notifications | ✅ Task screens | 🔸 Basic |
| **3 - Analytics** | 2 weeks | ✅ Metrics, Report gen | 🔸 Stats screens | ✅ Dashboard |
| **4 - Assets** | 2-3 weeks | ✅ Assets, QR, Maintenance | ✅ QR Scanner | ✅ Asset pages |
| **5 - iOS** | 3 weeks | ✅ Fraud detection | ✅ iOS, Biometrics | ❌ |
| **6 - Web** | 3-4 weeks | ✅ API updates | ❌ | ✅ Full dashboard |

**Legend:** ✅ Full | 🔸 Partial | ❌ N/A

**Total Timeline:** 15-18 weeks

---

## 📦 Phase Details

### Phase 1: MVP (2 weeks) 🔴 CURRENT
**Goal:** Launch pilot with 3 areas, 30 workers

**Features:**
- Worker clock-in/out (GPS + selfie)
- Work reports with photos
- Offline-first sync
- Background location tracking
- Supervisor mobile dashboard

**Deliverables:**
- Backend API with >80% test coverage
- Android mobile app
- Deployed to AWS

### Phase 2: Enhanced Features (2-3 weeks)
**Goal:** Task assignment and notifications

**Features:**
- Task assignment system
- Push notifications (FCM)
- Basic web dashboard
- KMZ file import

### Phase 3: Analytics & Reporting (2 weeks)
**Goal:** Data-driven insights

**Features:**
- Worker performance analytics
- Area condition trends
- Automated reports (daily/weekly/monthly)
- Export (CSV, PDF, Excel)

### Phase 4: Asset Management (2-3 weeks)
**Goal:** Track park assets

**Features:**
- Asset inventory system
- QR code generation/scanning
- Maintenance scheduling
- Asset condition tracking

### Phase 5: iOS & Advanced (3 weeks)
**Goal:** Complete platform support

**Features:**
- iOS app (full parity)
- Biometric authentication
- Anti-cheating algorithms
- Multi-language support

### Phase 6: Web Dashboard (3-4 weeks)
**Goal:** Desktop-optimized supervisor interface

**Features:**
- Next.js 15 web app
- Advanced analytics
- Bulk operations
- Report builder
- KMZ import

---

## 🔑 Key Decisions

### 1. Area Types (Generic, not "Parks")
- System supports multiple area types via `area_types` table
- Types: Park, Pedestrian Zone, Mini Garden, Street
- Extensible for future types

### 2. AWS Architecture
- **Compute:** Elastic Beanstalk (MVP) or ECS/Fargate (scale)
- **Database:** RDS PostgreSQL
- **Storage:** S3 with public read
- **CDN:** CloudFront (Phase 2+)

### 3. Mobile-First MVP
- Phase 1: Mobile only (faster to ship)
- Phase 2+: Add web dashboard
- Rationale: Workers need mobile; validate core workflow first

### 4. Testing Strategy
- Backend: Jest with >80% coverage per module
- Mobile: React Native Testing Library
- SOLID principles, NestJS best practices

---

## 💰 Cost Estimates

### MVP (30 workers, 3 areas)
| Service | Cost/Month |
|---------|------------|
| RDS PostgreSQL (db.t3.micro) | $15-20 |
| Elastic Beanstalk (t3.small) | $15-20 |
| S3 Storage (50GB) | $1-2 |
| Data Transfer | $5-10 |
| Google Maps API | $0-50 |
| **Total** | **$40-100** |

### Full Scale (500 workers, 50 areas)
| Service | Cost/Month |
|---------|------------|
| RDS PostgreSQL (db.t3.medium) | $60-80 |
| Elastic Beanstalk (t3.medium x2) | $60-80 |
| S3 Storage (500GB) | $10-15 |
| CloudFront CDN | $20-40 |
| Google Maps API | $100-200 |
| **Total** | **$250-400** |

---

## 📚 Documentation Architecture

### Layer 1: Requirements (WHAT)
| Document | Purpose |
|----------|---------|
| `functional-requirements.md` | User stories, features |
| `non-functional-requirements.md` | Performance, security |
| `api-contracts.md` | API endpoints (BE) |
| `screen-specs.md` | UI requirements (FE) |

### Layer 2: Design (HOW structured)
| Document | Purpose |
|----------|---------|
| `architecture.md` | Module structure |
| `database-schema.md` | Tables, ERD (BE) |
| `component-tree.md` | Component hierarchy (FE) |

### Layer 3: Implementation (HOW to build)
| Document | Purpose |
|----------|---------|
| `implementation-guide.md` | Day-by-day tasks |
| `coding-standards.md` | Conventions, patterns |

### Layer 4: Testing (HOW to verify)
| Document | Purpose |
|----------|---------|
| `test-plan.md` | Strategy, coverage goals |
| `CHECKLIST.md` | Acceptance criteria |

---

## 🧪 Testing Standards

### Coverage Requirements
- **Unit Tests:** >80% per module
- **Critical Business Logic:** 95%+
- **Integration Points:** 100% error paths

### Test Pattern (AAA)
```typescript
// Arrange - Set up test data
const data = { ... };

// Act - Execute the code
const result = functionUnderTest(data);

// Assert - Verify outcome
expect(result).toBe(expected);
```

### Key Test Scenarios
- ✅ Authentication and authorization
- ✅ Data validation
- ✅ Error handling
- ✅ Offline functionality (mobile)
- ✅ API integration

---

## 🚀 Using with AI Assistants

### Effective Prompts

**✅ GOOD:**
```
Read @be/.agents/phase-1-mvp/overview.md and 
@be/.agents/phase-1-mvp/implementation/implementation-guide.md.
I'm on Day 3. Implement the Shifts module with GPS validation.
Ensure >80% test coverage.
```

**❌ BAD:**
```
Build the backend.
```

### AI Assistant Template
```
I'm working on Phase [X] of SEKAR.
According to @[component]/.agents/phase-X/overview.md, I'm on Day [Y].

Task: [Specific task from timeline]

Please implement with:
- Full implementation
- Unit tests (>80% coverage)
- Error handling
- Documentation
```

---

## 🔄 Development Workflow

### Before Starting
- [ ] Read phase overview document
- [ ] Review requirements documents
- [ ] Set up development environment
- [ ] Check CURRENT_STATUS.md

### During Development
- [ ] Follow day-by-day timeline
- [ ] Write tests alongside code
- [ ] Update CURRENT_STATUS.md

### Completing a Phase
- [ ] All tests passing (>80% coverage)
- [ ] CHECKLIST.md complete
- [ ] Deployed to environment

---

## 🔗 Quick Links

### Phase 1 MVP
- [Backend Overview](./phase-1-mvp/overview.md)
- [Backend Requirements](./phase-1-mvp/backend-requirements.md)
- [Mobile Requirements](./phase-1-mvp/mobile-requirements.md)

### Sub-project Plans
- [Backend Plans](../be/.agents/README.md)
- [Mobile Plans](../fe/mobile/.agents/README.md)
- [Web Plans](../fe/web/.agents/README.md)

### Background
- [Project Brief](../brainstorm/intro.md)
- [MVP Requirements](../brainstorm/mvp.md)

---

## 🚨 Important Notes

1. **Use sub-project `.agents/` folders for implementation** - They have detailed guides
2. **This folder is for reference** - High-level plans only
3. **Update CURRENT_STATUS.md regularly** - In each sub-project
4. **Each phase builds on previous** - Complete in order

---

*Last Updated: January 2026*
*Project: SEKAR (Sistem Evaluasi Kerja Satgas RTH)*
*Client: DKRTH Surabaya*
