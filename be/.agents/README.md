# 🤖 Backend .agents/ - NestJS Development Guide

## 📖 Overview

This folder contains **comprehensive, AI-agent-friendly documentation** for developing the SEKAR Backend API. Each phase has detailed requirements, designs, implementation guides, and test plans.

---

## 🎯 Quick Start

### For AI Assistants

**Starting Development:**
```
Read @.agents/ROADMAP.md to understand the overall timeline.
Check @.agents/CURRENT_STATUS.md for current progress.
Load the relevant phase documents and start implementing.
```

**Implementing a Phase:**
```
I'm working on Phase X of SEKAR Backend.
Read @.agents/phase-X/overview.md for context.
Follow @.agents/phase-X/implementation/implementation-guide.md for daily tasks.
Ensure code meets @.agents/phase-X/testing/test-plan.md requirements (>80% coverage).
```

---

## 📁 Folder Structure

```
.agents/
├── README.md                           # This file
├── ROADMAP.md                          # Timeline for all phases
├── CURRENT_STATUS.md                   # Current development progress
│
├── phase-1-mvp/                        # 🔴 CURRENT PHASE
│   ├── overview.md                     # Phase goals, timeline
│   ├── requirements/
│   │   ├── functional-requirements.md  # Features, user stories
│   │   ├── non-functional-requirements.md # Performance, security
│   │   └── api-contracts.md            # Endpoint specifications
│   ├── design/
│   │   ├── architecture.md             # Module structure
│   │   ├── database-schema.md          # PostgreSQL tables
│   │   └── data-flow.md                # Request/response flow
│   ├── implementation/
│   │   ├── implementation-guide.md     # Day-by-day tasks
│   │   ├── coding-standards.md         # NestJS conventions
│   │   └── dependencies.md             # Required packages
│   ├── testing/
│   │   ├── test-plan.md                # Testing strategy
│   │   └── test-cases.md               # Specific test scenarios
│   ├── deployment/
│   │   ├── deployment-guide.md         # AWS deployment
│   │   └── environment-config.md       # Environment variables
│   └── CHECKLIST.md                    # Acceptance criteria
│
├── phase-2-enhanced-features/
├── phase-3-analytics/
├── phase-4-asset-management/
└── phase-5-ios-advanced/
```

---

## 🚀 Development Workflow

### 1. Check Current Status
```
Read @.agents/CURRENT_STATUS.md
```

### 2. Load Phase Context
```
Read @.agents/phase-X/overview.md
Review @.agents/phase-X/requirements/functional-requirements.md
```

### 3. Follow Implementation Guide
```
Follow @.agents/phase-X/implementation/implementation-guide.md
Implement day-by-day tasks
```

### 4. Write Tests
```
Follow @.agents/phase-X/testing/test-plan.md
Implement test cases from @.agents/phase-X/testing/test-cases.md
Ensure >80% coverage
```

### 5. Deploy
```
Follow @.agents/phase-X/deployment/deployment-guide.md
Configure per @.agents/phase-X/deployment/environment-config.md
```

---

## 📋 Phase Overview

| Phase | Status | Duration | Key Modules |
|-------|--------|----------|-------------|
| **1 - MVP** | 🔄 In Progress (Day 1-2 Done) | 5 days | Auth, Users, Areas, Shifts, Reports, Location |
| **2 - Enhanced** | ⏳ Pending | 1 week | Tasks, Notifications, KMZ Import |
| **3 - Analytics** | ⏳ Pending | 1 week | Analytics, Report Builder, Scheduler |
| **4 - Assets** | ⏳ Pending | 1.5 weeks | Assets, Maintenance, QR Codes |
| **5 - Advanced** | ⏳ Pending | 1.5 weeks | Fraud Detection, Integrations, i18n |

---

## 🏗️ Tech Stack

- **Framework:** NestJS 10.x
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL 14+ (AWS RDS)
- **ORM:** TypeORM
- **Auth:** Passport.js + JWT
- **Storage:** AWS S3
- **Testing:** Jest (>80% coverage)
- **Docs:** Swagger/OpenAPI

---

## ✅ Quality Standards

### Code Quality
- [x] TypeScript strict mode
- [x] ESLint + Prettier
- [x] JSDoc comments on public methods
- [x] SOLID principles
- [x] NestJS best practices

### Testing
- [x] >80% test coverage per module
- [x] Unit tests for all services
- [x] Integration tests for API endpoints
- [x] Mock external dependencies

### Documentation
- [x] Swagger decorators on all endpoints
- [x] JSDoc for complex functions
- [x] Updated README per phase

---

## 📞 Support

- **API Documentation:** `http://localhost:3000/api/docs`
- **Root Project Docs:** `../../.agents/`
- **Brainstorm:** `../../brainstorm/`

---

*Last Updated: January 2026*
*Project: SEKAR Backend*

