# UI/UX Design Specifications

**Version:** 2.0.0 (Modern Neo Brutalism)

Design system and visual guidelines for SEKAR mobile and web applications.

---

## 🚀 Quick Start (New Developers)

**Total time: 30 minutes to production-ready**

### Step 1: Understand the Foundation (15 minutes)
Read **[neo-brutalism.md](./neo-brutalism.md)** Sections 1-6:
- Design philosophy and principles
- Design tokens (colors, shadows, borders, spacing, typography)
- Sepidy's 4x6 color palette

### Step 2: Platform-Specific Implementation (10 minutes)
- **Mobile developers:** Read [neo-brutalism.md](./neo-brutalism.md) Sections 12-13
- **Web developers:** Read [neo-brutalism.md](./neo-brutalism.md) Sections 11-12

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

**[neo-brutalism.md](./neo-brutalism.md)** - Complete Neo Brutalism 2.0 design system specification

**What's inside:**
- Sections 1-3: Philosophy, research sources
- Sections 4-10: Design tokens (Sepidy's palette, shadows, borders, typography, animation, patterns)
- Sections 11-13: Component specs, web/mobile implementation
- Section 14: Accessibility guidelines

### Supporting Documentation

| Document | When to Use |
|----------|-------------|
| [CHANGELOG.md](./CHANGELOG.md) | Version history, migration guides 1.0 → 2.0 |
| [accessibility.md](./accessibility.md) | WCAG 2.1 AA compliance checklist, fixing accessibility issues |
| [typography.md](./typography.md) | Deep dive into Space Grotesk + Inter, Indonesian language patterns |
| [responsive-design.md](./responsive-design.md) | Responsive breakpoints, layout patterns |
| [interaction-patterns.md](./interaction-patterns.md) | Animation timing, gestures, haptic feedback, bounce easing |
| [icons-assets.md](./icons-assets.md) | Icon library reference, image guidelines |
| [future-phases-patterns.md](./future-phases-patterns.md) | Phase 3-6 component specifications |

---

## 🎨 Design System

**SEKAR uses the Neo Brutalism 2.0 design system (Phase 2+)**

Modern Neo Brutalism features bold aesthetics with excellent usability:
- **2px borders** - Clean, modern (neobrutalism.dev standard)
- **Hard-edge shadows** - Stark offset (4px/6px/8px), soft black (#1C1917)
- **6px border radius** - Friendly, approachable feel
- **High contrast** - Designed for outdoor field workers in bright sunlight
- **Warm pastel backgrounds** - Inviting feel (#FDFD96 pastel yellow)
- **Nature green primary** - Parks/green spaces identity (#7FBC8C)

### Design Principles

1. **Bold & Confident** - Conveys authority appropriate for government applications
2. **Nature-Aligned** - Parks green primary creates parks/environment association
3. **Warm & Inviting** - Pastel backgrounds feel friendly yet professional
4. **Function Over Decoration** - Every element serves a purpose
5. **High Visibility** - Optimized for bright sunlight and outdoor use
6. **Platform Consistency** - 100% design token parity between mobile and web

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

### Colors (Sepidy's Neo Brutalism Palette)

```typescript
// Primary (Row 4 Green - Parks/Nature Theme)
primary:        '#7FBC8C'    // Bold nature green
primaryHover:   '#6BA87A'    // 15% darker
primaryActive:  '#5A9468'    // 25% darker

// Secondary (Earth Brown)
secondary:      '#8B7355'    // Warm earth brown
secondaryHover: '#725E45'    // Darker

// Status Colors (Sepidy Palette)
success:        '#7FBC8C'    // Same as primary
warning:        '#E3A018'    // Bold amber (Row 4)
danger:         '#FF6B6B'    // Bold red (Row 4)
info:           '#69D2E7'    // Bold cyan (Row 4)

// Backgrounds (Sepidy Palette - Row 1 Pastels)
bgPrimary:      '#FDFD96'    // Pastel yellow - main background
bgSecondary:    '#B5D2AD'    // Pastel green - alternate
bgMint:         '#DAF5F0'    // Pastel mint - cards, dialogs
bgSurface:      '#FFFFFF'    // Pure white - elevated cards

// Sidebar (Dark Forest Green)
sidebarBg:      '#1A4D2E'    // Dark forest green
sidebarText:    '#FFFFFF'    // White text
sidebarHover:   '#2D5233'    // Medium forest green

// Neutrals (Warm Stone Tones)
black:          '#1C1917'    // Stone-900 (soft black)
white:          '#FFFFFF'
```

### Shadows (Hard-Edge Offset)
```css
/* CSS */
--shadow-xs:     2px 2px 0px #1C1917   /* Badges */
--shadow-sm:     4px 4px 0px #1C1917   /* Cards, inputs */
--shadow-md:     6px 6px 0px #1C1917   /* Buttons */
--shadow-lg:     8px 8px 0px #1C1917   /* Modals */
--shadow-hover:  8px 8px 0px #1C1917   /* With translate(-2px) */
--shadow-active: 2px 2px 0px #1C1917   /* With translate(+2px) */
```

```typescript
// React Native
sm:     { shadowOffset: { width: 3, height: 3 }, shadowOpacity: 0.18, shadowRadius: 2, elevation: 3 }
md:     { shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.20, shadowRadius: 3, elevation: 4 }
lg:     { shadowOffset: { width: 5, height: 5 }, shadowOpacity: 0.22, shadowRadius: 4, elevation: 5 }
active: { shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.15, shadowRadius: 0, elevation: 1 }
```

### Borders
```
thin:    1px solid #1C1917   /* Dividers */
base:    2px solid #1C1917   /* DEFAULT - buttons, cards, inputs */
thick:   3px solid #1C1917   /* Emphasis */
```

### Border Radius
```
none:    0px     /* Decorative elements */
sm:      4px     /* Badges, tags */
base:    6px     /* DEFAULT - buttons, cards, inputs */
md:      8px     /* Modals */
lg:      12px    /* Callouts */
full:    9999px  /* Avatars, pills */
```

### Spacing (8px Baseline Grid)
```
xs: 4px    sm: 8px    md: 16px    lg: 24px
xl: 32px   2xl: 48px  3xl: 64px
```

### Typography (Space Grotesk + Inter)
```
Display XL: 48px / 800 / 1.25    /* Hero text (Space Grotesk) */
Display:    40px / 800 / 1.25    /* Page titles (Space Grotesk) */
H1:         32px / 700 / 1.25    /* Section headers (Space Grotesk) */
H2:         26px / 700 / 1.25    /* Card titles (Space Grotesk) */
H3:         22px / 600 / 1.25    /* Subheadings (Space Grotesk) */
H4:         18px / 600 / 1.25    /* Minor headings (Inter) */
Body Large: 18px / 500 / 1.5     /* Emphasized body (Inter) */
Body:       16px / 400 / 1.5     /* Default body (Inter) */
Body Small: 14px / 400 / 1.5     /* Secondary text (Inter) */
Caption:    12px / 400 / 1.5     /* Timestamps (Inter) */
```

### Touch/Click Targets
```
Minimum: 48×48px (WCAG 2.1 AA)
```

### Animation Durations
```
instant: 80ms     /* Micro-feedback */
fast:    150ms    /* Button press, hover states */
normal:  250ms    /* State transitions, modals */
slow:    400ms    /* Page transitions */
```

### Easing Curves
```
easeOut:   cubic-bezier(0.0, 0, 0.2, 1)           /* Elements entering */
easeIn:    cubic-bezier(0.4, 0, 1, 1)             /* Elements exiting */
easeInOut: cubic-bezier(0.4, 0, 0.2, 1)           /* Moving elements */
bounce:    cubic-bezier(0.68, -0.55, 0.265, 1.55) /* Playful bounce */
```

### Background Patterns
```css
/* Grid Pattern (3% opacity) */
background-image:
  linear-gradient(rgba(45, 82, 51, 0.03) 1px, transparent 1px),
  linear-gradient(90deg, rgba(45, 82, 51, 0.03) 1px, transparent 1px);
background-size: 32px 32px;

/* Dots Pattern (3-4% opacity) */
background-image: radial-gradient(
  circle at center,
  rgba(45, 82, 51, 0.04) 1.5px,
  transparent 1.5px
);
background-size: 24px 24px;
```

---

## 📖 When to Reference Which Document

### During Implementation

| Task | Primary Reference | Supporting Docs |
|------|-------------------|-----------------|
| Setup new project | [neo-brutalism.md](./neo-brutalism.md) §1-6 | This README |
| Create mobile component | [neo-brutalism.md](./neo-brutalism.md) §12-13 | [interaction-patterns.md](./interaction-patterns.md) |
| Create web component | [neo-brutalism.md](./neo-brutalism.md) §11-12 | [responsive-design.md](./responsive-design.md) |
| Fix accessibility issue | [accessibility.md](./accessibility.md) | [neo-brutalism.md](./neo-brutalism.md) §14 |
| Add icons | [icons-assets.md](./icons-assets.md) | - |
| Implement responsive layout | [responsive-design.md](./responsive-design.md) | - |
| Add animations | [interaction-patterns.md](./interaction-patterns.md) | - |
| Check migration guide | [CHANGELOG.md](./CHANGELOG.md) | - |

### During Code Review

| Review Focus | Reference |
|--------------|-----------|
| Design token usage | [neo-brutalism.md](./neo-brutalism.md) §4-10 |
| Color contrast | [accessibility.md](./accessibility.md) |
| Shadow implementation | [neo-brutalism.md](./neo-brutalism.md) §5 |
| Component variants | [neo-brutalism.md](./neo-brutalism.md) §11 |
| Responsive behavior | [responsive-design.md](./responsive-design.md) |
| Animation timing | [interaction-patterns.md](./interaction-patterns.md) |

---

## 🎯 Phase Status

| Phase | Components | Status |
|-------|-----------|--------|
| **Phase 1 MVP** | 14 core components | ✅ Complete (Material Design - Archived) |
| **Phase 2C Mobile** | 5 Neo Brutalism components | ✅ Complete (needs token update for v2.0) |
| **Phase 2D Web** | 10 Neo Brutalism components | ✅ Complete (needs token update for v2.0) |
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
**Last Updated:** 2026-02-05
**Status:** Active - Simplified Single-Source Documentation Structure
**Design System Version:** 2.0.0 (Modern Neo Brutalism)

**For the complete design system specification, see [neo-brutalism.md](./neo-brutalism.md)**
**For version history and migration guides, see [CHANGELOG.md](./CHANGELOG.md)**
