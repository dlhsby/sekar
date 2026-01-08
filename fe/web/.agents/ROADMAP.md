# SEKAR Web Dashboard Roadmap

This document outlines the development roadmap for the **Web Dashboard (Next.js)** component across all phases of the SEKAR project.

## 🎯 Overall Web Goal

Build a comprehensive, responsive web dashboard for supervisors and administrators that provides powerful data visualization, management tools, and reporting capabilities.

---

## 📱 Phase Summary

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 2 | 3 days | Initial setup & basic views |
| Phase 6 | 10 days | Complete web dashboard |

---

## 🗺️ Phase Breakdown

### Phase 2: Initial Dashboard (3 days)

**Objective:** Basic web interface for supervisors

**Features:**
- Project setup (Next.js 15, TailwindCSS, Shadcn)
- Authentication with NextAuth.js
- Basic dashboard overview
- Simple reports list
- Area management CRUD

**Screens:**
- Login
- Dashboard (summary metrics)
- Reports List
- Areas Management

### Phase 6: Full Dashboard 🟢 MAIN (10 days)

**Objective:** Comprehensive web application

**Features:**
- Dashboard with real-time metrics
- Live worker map with tracking
- Advanced reports management
- Attendance tracking
- Worker management
- Area management with KMZ import
- Analytics and insights
- Custom report builder
- Settings and preferences

**Screens:**
- Dashboard Home
- Live Map
- Reports List & Detail
- Attendance Management
- Worker Management
- Area Management
- Analytics Dashboard
- Report Builder
- Asset Management
- Settings

---

## 📅 Phase 6 Timeline

| Day | Focus | Features |
|-----|-------|----------|
| Day 1 | Setup | Next.js, Auth, Layout |
| Day 2 | Dashboard | Summary, charts |
| Day 3 | Map | Live workers, areas |
| Day 4-5 | Reports | List, filters, review |
| Day 6 | Attendance | List, export |
| Day 7 | Management | Workers, areas |
| Day 8-9 | Analytics | Charts, trends |
| Day 10 | Polish | Testing, fixes |

---

## 🎨 Key Pages & Components

### Dashboard
```
┌────────────────────────────────────────────────────────────┐
│  SEKAR Dashboard                           🔔  👤 Admin ▼  │
├────────────────────────────────────────────────────────────┤
│  📊 Dashboard │ 🗺️ Map │ 📝 Reports │ 📋 Attendance │ ⚙️  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Workers  │ │ Reports  │ │ Areas    │ │ Tasks    │      │
│  │   28/30  │ │   156    │ │   12     │ │   23     │      │
│  │ Active   │ │ Today    │ │ Covered  │ │ Pending  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                            │
│  ┌─────────────────────────┐ ┌──────────────────────────┐ │
│  │ Attendance This Week    │ │ Reports by Condition     │ │
│  │ [Bar Chart]             │ │ [Pie Chart]              │ │
│  └─────────────────────────┘ └──────────────────────────┘ │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Recent Reports                            View All → │  │
│  │ ┌─────────────────────────────────────────────────┐ │  │
│  │ │ Ahmad | Taman Bungkul | 10:30 | Baik | 📷 3    │ │  │
│  │ │ Siti  | Jl. Darmo     | 10:25 | Cukup | 📷 2   │ │  │
│  │ └─────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Live Map
```
┌────────────────────────────────────────────────────────────┐
│  Live Worker Map                                           │
├────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────┐ ┌──────────────────────┐ │
│ │                              │ │ Active Workers (28)  │ │
│ │                              │ │ ┌──────────────────┐ │ │
│ │     [Google Map View]        │ │ │ 🟢 Ahmad Rizki   │ │ │
│ │     with worker markers      │ │ │    Taman Bungkul │ │ │
│ │     and area boundaries      │ │ │    Since 07:30   │ │ │
│ │                              │ │ └──────────────────┘ │ │
│ │                              │ │ ┌──────────────────┐ │ │
│ │                              │ │ │ 🟢 Siti N.       │ │ │
│ │                              │ │ │    Jl. Darmo     │ │ │
│ │                              │ │ └──────────────────┘ │ │
│ └──────────────────────────────┘ └──────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** TailwindCSS 3.x
- **Components:** Shadcn/ui
- **State:** Zustand
- **Data Fetching:** TanStack Query
- **Forms:** React Hook Form + Zod
- **Maps:** Google Maps JavaScript API
- **Charts:** Recharts
- **Tables:** TanStack Table
- **Auth:** NextAuth.js

---

## 📦 Deliverables

### Phase 2
- [ ] Next.js project initialized
- [ ] Authentication working
- [ ] Basic dashboard page
- [ ] Reports list view
- [ ] Deployed to staging

### Phase 6
- [ ] Full dashboard with all pages
- [ ] Real-time map updates
- [ ] Advanced analytics
- [ ] Report builder
- [ ] KMZ import
- [ ] Deployed to production

---

*Last Updated: January 2026*

