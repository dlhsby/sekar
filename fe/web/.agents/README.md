# SEKAR Web Dashboard Agent Documentation

This folder contains all documentation and plans specific to the **Web Dashboard (Next.js)** component of the SEKAR project.

## 🎯 Overview

The SEKAR Web Dashboard provides a comprehensive interface for supervisors and administrators to monitor operations, manage data, and generate reports. It complements the mobile app by providing desktop-optimized views and bulk operations.

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** TailwindCSS
- **Components:** Shadcn/ui
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod
- **Maps:** Google Maps JavaScript API
- **Charts:** Recharts
- **Tables:** TanStack Table
- **Authentication:** NextAuth.js

## 📅 Development Phases

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 2 | 3 days | Initial setup, basic dashboard |
| Phase 6 | 10 days | Full web dashboard |

---

## 📁 Documentation Structure

```
fe/web/.agents/
├── README.md                           # This file
├── ROADMAP.md                          # Phase timeline
├── CURRENT_STATUS.md                   # Development progress
│
├── phase-2-initial/                    # 🟡 NEXT
│   └── overview.md
│
└── phase-6-full-dashboard/             # 🟢 FUTURE
    ├── overview.md
    ├── requirements/
    ├── design/
    └── CHECKLIST.md
```

---

## 🚀 Getting Started

The web dashboard development primarily happens in Phase 6, with initial groundwork laid in Phase 2. Refer to the main project's `.agents/phase-6-web-dashboard/` for the comprehensive plan.

---

*Last Updated: January 2026*
