# 🤖 Mobile App .agents/ - React Native Development Guide

## 📖 Overview

This folder contains **comprehensive, AI-agent-friendly documentation** for developing the SEKAR Mobile App using React Native.

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
I'm working on Phase X of SEKAR Mobile.
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
│   │   ├── non-functional-requirements.md # Performance, offline
│   │   └── screen-specs.md             # Screen-by-screen specs
│   ├── design/
│   │   ├── architecture.md             # App structure
│   │   ├── component-tree.md           # Component hierarchy
│   │   └── navigation-flow.md          # Navigation structure
│   ├── implementation/
│   │   ├── implementation-guide.md     # Day-by-day tasks
│   │   ├── coding-standards.md         # React Native conventions
│   │   └── dependencies.md             # Required packages
│   ├── testing/
│   │   ├── test-plan.md                # Testing strategy
│   │   └── test-cases.md               # Specific test scenarios
│   ├── deployment/
│   │   └── build-guide.md              # APK build instructions
│   └── CHECKLIST.md                    # Acceptance criteria
│
├── phase-2-enhanced-features/
├── phase-3-analytics/
├── phase-4-asset-management/
└── phase-5-ios-advanced/
```

---

## 🚀 Development Workflow

### 1. Check Backend Readiness
Ensure backend endpoints are available before implementing screens.

### 2. Load Phase Context
```
Read @.agents/phase-X/overview.md
Review @.agents/phase-X/requirements/screen-specs.md
```

### 3. Follow Implementation Guide
```
Follow @.agents/phase-X/implementation/implementation-guide.md
Implement screen by screen
```

### 4. Test Thoroughly
```
Follow @.agents/phase-X/testing/test-plan.md
Test offline functionality
Verify GPS and camera features
```

---

## 📋 Phase Overview

| Phase | Status | Duration | Key Screens |
|-------|--------|----------|-------------|
| **1 - MVP** | 📋 Pending | 9 days (Days 6-14) | Login, Clock-in/out, Reports, Supervisor Dashboard |
| **2 - Enhanced** | ⏳ Pending | 1 week | Tasks, Notifications |
| **3 - Analytics** | ⏳ Pending | 3 days | Enhanced analytics screen |
| **4 - Assets** | ⏳ Pending | 1 week | QR Scanner, Asset screens |
| **5 - iOS** | ⏳ Pending | 2 weeks | iOS app, Biometrics |

---

## 🏗️ Tech Stack

- **Framework:** React Native (latest)
- **Language:** TypeScript
- **State:** Redux Toolkit or Zustand
- **Navigation:** React Navigation v6
- **API Client:** Axios
- **Offline Storage:** WatermelonDB or SQLite
- **Maps:** react-native-maps
- **Location:** react-native-geolocation-service
- **Background Location:** react-native-background-geolocation
- **Camera:** react-native-vision-camera
- **Testing:** Jest + React Native Testing Library

---

## ✅ Quality Standards

### Code Quality
- TypeScript strict mode
- ESLint + Prettier
- Component-based architecture
- Separation of concerns

### Testing
- >80% coverage for critical features
- Offline functionality tested
- Camera/GPS features manually tested

### Performance
- Battery usage <15% per 8-hour shift
- Background location optimized
- Image compression before upload

---

## 📞 Support

- **Backend API:** `http://localhost:3000/api/docs`
- **Root Project Docs:** `../../.agents/`
- **Backend Docs:** `../../be/.agents/`

---

*Last Updated: January 2026*
*Project: SEKAR Mobile*

