# UI/UX Design Specifications

Design system and visual guidelines for SEKAR mobile and web applications.

---

## 🚀 Quick Start (New Developers)

**Total time: 30 minutes to production-ready**

### Step 1: Understand the Foundation (15 minutes)
Read **[neo-brutalism.md](./neo-brutalism.md)** Sections 1-6:
- Design philosophy and principles
- Design tokens (colors, shadows, borders, spacing, typography)
- Why Neo Brutalism for SEKAR

### Step 2: Platform-Specific Implementation (10 minutes)
- **Mobile developers:** Read [neo-brutalism.md](./neo-brutalism.md) Sections 7-8 + 11
- **Web developers:** Read [neo-brutalism.md](./neo-brutalism.md) Sections 9-10 + 11

### Step 3: Start Coding (5 minutes)
- Mobile tokens: `fe/mobile/src/constants/nbTokens.ts`
- Mobile components: `fe/mobile/src/components/nb/`
- Web tokens: `fe/web/src/app/globals.css`
- Web components: `fe/web/src/components/nb/`

### Reference While Coding
Use [Design Tokens Quick Reference](#design-tokens-quick-reference) below for copy-paste.

---

## 📚 Documentation Structure

### Primary Reference (Single Source of Truth)

**[neo-brutalism.md](./neo-brutalism.md)** - Complete Neo Brutalism design system specification

**What's inside:**
- Sections 1-6: Design foundations (tokens, colors, shadows, typography)
- Sections 7-8: Mobile components (React Native)
- Sections 9-10: Web components (Next.js/Tailwind CSS 4)
- Section 11: Cross-platform consistency verification

### Supporting Documentation

| Document | When to Use |
|----------|-------------|
| [accessibility.md](./accessibility.md) | WCAG 2.1 AA compliance checklist, fixing accessibility issues |
| [typography.md](./typography.md) | Deep dive into font system, Indonesian language patterns |
| [responsive-design.md](./responsive-design.md) | Responsive breakpoints, layout patterns |
| [interaction-patterns.md](./interaction-patterns.md) | Animation timing, gestures, haptic feedback |
| [icons-assets.md](./icons-assets.md) | Icon library reference, image guidelines |
| [future-phases-patterns.md](./future-phases-patterns.md) | Phase 3-6 component specifications |

### Historical Reference

| Document | Purpose |
|----------|---------|
| [REVIEW_SUMMARY.md](./REVIEW_SUMMARY.md) | Design review audit trail (for context/history) |

---

## 🎨 Design System

**SEKAR uses the Neo Brutalism design system (Phase 2+)**

Neo Brutalism features bold aesthetics with excellent usability:
- **Heavy 3px borders** - Clear boundaries, authority
- **Hard-edge shadows** - No blur, stark offset (4px/6px/8px)
- **High contrast** - Designed for outdoor field workers in bright sunlight
- **Sharp corners** - 0 border-radius (except avatars)
- **Bold colors** - Saturated, not muted

### Design Principles

1. **Bold & Confident** - Conveys authority appropriate for government applications
2. **Function Over Decoration** - Every element serves a purpose
3. **High Visibility** - Optimized for bright sunlight and varying literacy levels
4. **Accessibility First** - WCAG 2.1 AA compliant, 4.5:1 minimum contrast
5. **Platform Consistency** - 100% design token parity between mobile and web

---

## 👥 Target Users

### Field Workers (Petugas Lapangan)
- **Context:** Outdoor work in parks, sidewalks, gardens
- **Challenges:** Bright sunlight, may wear gloves, varying literacy levels
- **Needs:** Large touch targets (48×48px), high contrast, simple vocabulary

### Supervisors (Pengawas)
- **Context:** Office and field, monitoring multiple workers
- **Needs:** Dashboard clarity, quick filtering, map visualization

### Administrators (Admin)
- **Context:** Office-based, system configuration
- **Needs:** Comprehensive tables, bulk actions, detailed reports

---

## 💻 Implementation Reference

### Mobile (React Native 0.76.x)
```
Design tokens:  fe/mobile/src/constants/nbTokens.ts
Components:     fe/mobile/src/components/nb/
                ├── NBButton.tsx (+ tests)
                ├── NBCard.tsx (+ tests)
                ├── NBBadge.tsx (+ tests)
                ├── NBTab.tsx (+ tests)
                └── NBTextInput.tsx (+ tests)
```

### Web (Next.js 16.1.4 + Tailwind CSS 4)
```
Design tokens:  fe/web/src/app/globals.css (@theme inline)
Components:     fe/web/src/components/nb/
                ├── NBButton.tsx
                ├── NBCard.tsx
                ├── NBInput.tsx
                ├── NBBadge.tsx
                ├── NBSelect.tsx
                ├── NBModal.tsx
                ├── NBTable.tsx
                ├── NBDropdown.tsx
                ├── NBSidebar.tsx
                └── NBTextarea.tsx
```

---

## ⚡ Design Tokens Quick Reference

**Copy-paste ready for implementation:**

### Colors
```typescript
primary:   '#0066CC'  // Action blue
success:   '#1B5E20'  // Government green
warning:   '#F57C00'  // Alert orange (outdoor optimized)
danger:    '#DC2626'  // Error red
black:     '#000000'  // Borders, shadows, text
white:     '#FFFFFF'  // Backgrounds
navy:      '#001F3F'  // Sidebar, authority accent
```

### Shadows (Hard-Edge Offset)
```css
/* CSS */
sm:     4px 4px 0px #000000   /* Cards, inputs */
md:     6px 6px 0px #000000   /* Buttons, elevated cards */
lg:     8px 8px 0px #000000   /* Modals, popovers */
hover:  8px 8px 0px #000000   /* Hover state (with translate) */
active: 2px 2px 0px #000000   /* Pressed state */
```

```typescript
// React Native
sm:     { shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 }
md:     { shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6 }
lg:     { shadowOffset: { width: 8, height: 8 }, shadowOpacity: 1, shadowRadius: 0, elevation: 8 }
active: { shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 }
```

### Borders
```
thin:    2px solid #000000   /* Secondary elements, dividers */
default: 3px solid #000000   /* Primary elements, cards, buttons */
thick:   4px solid #000000   /* Emphasis, selected states */
```

### Spacing (8px Baseline Grid)
```
xs: 4px    sm: 8px    md: 16px    lg: 24px
xl: 32px   2xl: 48px  3xl: 64px
```

### Typography
```
Display:    36px / 800 / 1.25    /* Page titles */
H1:         30px / 700 / 1.25    /* Section headers */
H2:         24px / 700 / 1.25    /* Card titles */
H3:         20px / 600 / 1.25    /* Subheadings */
Body Large: 18px / 500 / 1.5     /* Emphasized body */
Body:       16px / 400 / 1.5     /* Default body */
Body Small: 14px / 400 / 1.5     /* Secondary text */
Caption:    12px / 400 / 1.5     /* Timestamps, labels */
```

### Touch/Click Targets
```
Minimum: 48×48px (WCAG 2.1 AA compliant)
```

### Animation Durations
```
fast:   100ms   /* Button press, hover states */
normal: 200ms   /* State transitions, modals */
slow:   300ms   /* Page transitions */
```

---

## 📖 When to Reference Which Document

### During Implementation

| Task | Primary Reference | Supporting Docs |
|------|-------------------|-----------------|
| Setup new project | [neo-brutalism.md](./neo-brutalism.md) §1-6 | This README |
| Create mobile component | [neo-brutalism.md](./neo-brutalism.md) §7-8 | [interaction-patterns.md](./interaction-patterns.md) |
| Create web component | [neo-brutalism.md](./neo-brutalism.md) §9-10 | [responsive-design.md](./responsive-design.md) |
| Fix accessibility issue | [accessibility.md](./accessibility.md) | [neo-brutalism.md](./neo-brutalism.md) §4 |
| Add icons | [icons-assets.md](./icons-assets.md) | [neo-brutalism.md](./neo-brutalism.md) §4 |
| Implement responsive layout | [responsive-design.md](./responsive-design.md) | [neo-brutalism.md](./neo-brutalism.md) §10 |

### During Code Review

| Review Focus | Reference |
|--------------|-----------|
| Design token usage | [neo-brutalism.md](./neo-brutalism.md) §3 |
| Color contrast | [accessibility.md](./accessibility.md) |
| Shadow implementation | [neo-brutalism.md](./neo-brutalism.md) §5 |
| Component variants | [neo-brutalism.md](./neo-brutalism.md) §7-10 |
| Responsive behavior | [responsive-design.md](./responsive-design.md) |
| Animation timing | [interaction-patterns.md](./interaction-patterns.md) |

---

## 🎯 Phase Status

| Phase | Components | Status |
|-------|-----------|--------|
| **Phase 1 MVP** | 14 core components | ✅ Complete (Material Design - Archived) |
| **Phase 2C Mobile** | 5 Neo Brutalism components | ✅ Complete (nbTokens + 5 components tested) |
| **Phase 2D Web** | 10 Neo Brutalism components | ✅ Complete (globals.css + 10 components) |
| **Phase 3** | 5 components (Charts, Dashboard, Builder) | ✅ Specified in future-phases-patterns.md |
| **Phase 4** | 3 components (QR, Asset, Maintenance) | ✅ Specified in future-phases-patterns.md |
| **Phase 5** | 4 patterns (iOS-specific) | ✅ Specified in future-phases-patterns.md |
| **Phase 6** | 4 components (Web dashboard) | ✅ Specified in future-phases-patterns.md |

---

## 📂 Related Documentation

**Other specs folders:**
- `specs/mobile/screens.md` - Screen wireframes and layouts
- `specs/mobile/navigation.md` - Navigation structure
- `specs/web/pages.md` - Web dashboard pages
- `specs/architecture/data-flow.md` - Data flow patterns

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-01-28
**Status:** Active - Simplified Single-Source Documentation Structure
**Implementation Review:** ✅ Complete (January 28, 2026) - See REVIEW_SUMMARY.md

**Implementation Status:**
- Mobile (Phase 2C): ✅ 5 components production-ready (100% compliant)
- Web (Phase 2D): ✅ 10 components production-ready (100% compliant)
- Design Token Parity: ✅ Perfect 100% match
- Code Quality: ⭐⭐⭐⭐⭐ Excellent (TypeScript, accessibility, tests)

**For the complete design system specification, see [neo-brutalism.md](./neo-brutalism.md)**
**For implementation review results, see [REVIEW_SUMMARY.md](./REVIEW_SUMMARY.md)**
