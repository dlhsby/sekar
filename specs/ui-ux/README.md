# UI/UX Design Specifications

**Version:** 2.1.1 (Neo Brutalism 2.0 + generated tokens, Phase 4 rebrand re-baseline)
**Last Updated:** 2026-06-20

Design system and visual guidelines for SEKAR mobile and web applications.

> **Phase 3 M1-R update (Apr 25, 2026):** Design tokens are sourced from a single JSON file — see **[design-tokens.md](./design-tokens.md)** and **[tokens.json](./tokens.json)**. Hand-maintained copies in `fe/web/src/app/globals.css` and `fe/mobile/src/constants/nbTokens.ts` are replaced by **generated** artifacts (`fe/web/src/app/generated/tokens.css`, `fe/mobile/src/constants/generated/tokens.ts`) from Phase 3 M1-R sub-phase 3-R2 onward. CI job `tokens-verify` regenerates and diffs every PR; drift fails the build. See [ADR-036](../architecture/decisions/ADR-036-design-tokens-single-source.md).
>
> **One visual spine, three presentations.** Mobile native + mobile web (<768 px) + desktop web all consume the same generated tokens. Phase 3 M1-R sub-phase 3-R4 makes the web installable AND mobile-responsive — see [ADR-037](../architecture/decisions/ADR-037-web-pwa.md). Sub-phase 3-R5 sweeps every non-rewritten existing screen onto the new tokens so the entire app shares one visual language by end of M1-R.

---

## 🚀 Quick Start (New Developers)

**Total time: 30 minutes to production-ready**

### Step 1: Tokens first (5 minutes)
Read **[design-tokens.md](./design-tokens.md)** — the single source of truth for every color, shadow, radius, and type token used on both platforms. All Layer 1 values live in [`tokens.json`](./tokens.json); generated files (`fe/web/src/app/generated/tokens.css`, `fe/mobile/src/constants/generated/tokens.ts`) are produced by `scripts/build-tokens.ts` and CI-validated for drift.

### Step 2: Understand the design language (15 minutes)
Read **[neo-brutalism.md](./neo-brutalism.md)** Sections 1-6:
- Design philosophy and principles
- Component patterns (borders, shadows, typography rules)
- Sepidy's 4x6 color palette (now exposed via token names in `tokens.json`)

### Step 3: Platform-specific implementation (10 minutes)
- **Mobile developers:** Read [neo-brutalism.md](./neo-brutalism.md) Sections 12-13
- **Web developers:** Read [neo-brutalism.md](./neo-brutalism.md) Sections 11-12 + [ADR-037](../architecture/decisions/ADR-037-web-pwa.md) if touching the shell

### Step 4: Start coding
- **Do not** edit `fe/web/src/app/globals.css` or `fe/mobile/src/constants/nbTokens.ts` by hand from Phase 3 onward — they reference generated files.
- To change a token: edit `specs/ui-ux/tokens.json`, run `npm run tokens:build`, commit generated files.
- Components: `fe/mobile/src/components/nb/` · `fe/web/src/components/ui/`

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
| [design-tokens.md](./design-tokens.md) | **Start here.** Layer 1/2/3 token model, token registry, generator pipeline, PWA manifest, responsive breakpoints |
| [tokens.json](./tokens.json) | Machine-readable source of truth (consumed by `scripts/build-tokens.ts`) |
| [tokens.schema.json](./tokens.schema.json) | JSON Schema validator (CI enforces) |
| [CHANGELOG.md](./CHANGELOG.md) | Version history, migration guides 1.0 → 2.0 → 2.1 |
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
- **Warm stone canvas** - `#F5F0EB` warm stone is the page/app background on BOTH platforms (Phase 3-0, ADR-036). `#FDFD96` pastel yellow is now reserved for **accent callouts only** (section headers, banners, callouts) — it is no longer a page background.
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

> **Phase 3 M1-R note:** From sub-phase 3-R2 onward, the canonical token consumers are the **generated** files. `nbTokens.ts` and `globals.css` become thin wrappers (re-export / `@import`). Never hand-edit token values in either — edit `tokens.json` and run `npm run tokens:build`.

### Mobile (React Native 0.83.x)
```
Token source (canonical):    specs/ui-ux/tokens.json
Generated consumer:          fe/mobile/src/constants/generated/tokens.ts  (CI-validated, never hand-edit)
Re-export wrapper:           fe/mobile/src/constants/nbTokens.ts          (export * from generated; platform helpers only)
Brand fonts (.ttf):          fe/mobile/assets/fonts/                      (Space Grotesk, Inter, JetBrains Mono — OFL)
Components:                  fe/mobile/src/components/nb/
                             ├── NBButton.tsx (+ tests)
                             ├── NBCard.tsx (+ tests)
                             ├── NBBadge.tsx (+ tests)
                             ├── NBTab.tsx (+ tests)
                             ├── NBTextInput.tsx (+ tests)
                             ├── NBModal.tsx (NEW in 3-R3)
                             ├── NBToast.tsx (NEW in 3-R3)
                             └── NBText.tsx  (NEW in 3-R3)
```

### Web (Next.js 16.1.x + Tailwind CSS 4)
```
Token source (canonical):    specs/ui-ux/tokens.json
Generated consumer:          fe/web/src/app/generated/tokens.css          (CI-validated, never hand-edit)
@import wrapper:             fe/web/src/app/globals.css (@import './generated/tokens.css')
Brand fonts:                 next/font/google in fe/web/src/app/layout.tsx (Space Grotesk, Inter, JetBrains Mono; display: swap)
PWA assets (NEW in 3-R4):    fe/web/public/manifest.webmanifest
                             fe/web/public/sw.js (compiled from src/sw/sw.ts)
                             fe/web/public/icons/{192,512,512-maskable,180}.png
PWA components (NEW):        fe/web/src/components/pwa/{InstallBanner,OfflineBanner,UpdateToast,MobileInstallPush}.tsx
Responsive shell (NEW):      fe/web/src/components/layout/ResponsiveShell.tsx (sidebar / icon rail / ☰ drawer)
```

### Web (legacy reference — superseded by generated tokens above)
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

### Monitoring Components (Phase 2D)
```
Web:            fe/web/src/app/(dashboard)/monitoring/
                ├── MonitoringMap        — Mapbox GL interactive map with markers, polygons, clusters
                ├── MonitoringSidePanel  — Filterable worker list with status counts
                ├── UserDetailPanel      — Detailed worker view with shift info and actions
                ├── LocationTimeline     — GPS history trail with date picker
                ├── StatusCard           — Status count cards with filter action
                └── UserListItem         — Individual worker row with status indicator
Mobile:         fe/mobile/src/screens/supervisor/
                └── LocationStatusCard   — Home screen GPS/boundary status (mobile only)
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

// Backgrounds
// NOTE: Phase 2 layout — superseded by Phase 3-0 `bg.canvas = #F5F0EB` (warm stone) via generated
// tokens (ADR-036). The pastel-yellow entry below is now an ACCENT ONLY (section headers / callouts),
// not a page background. See specs/ui-ux/design-tokens.md for the canonical registry.
bgCanvas:       '#F5F0EB'    // Warm stone — canonical app/page background (Phase 3-0)
bgPrimary:      '#FDFD96'    // (legacy name) Pastel yellow — now ACCENT-ONLY; do not use as page bg
bgSecondary:    '#B5D2AD'    // Pastel green - alternate accent
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
// React Native — Phase 3-0 canonical emission (ADR-036): hard-edge, no blur.
// `shadowRadius` is ALWAYS 0 and `shadowOpacity` is ALWAYS 1 in the generated tokens file;
// Android `elevation` is derived as max(offsetX, offsetY). See design-tokens.md §Shadows.
xs:     { shadowOffset: { width: 2,  height: 2  }, shadowOpacity: 1, shadowRadius: 0, elevation: 2  }
sm:     { shadowOffset: { width: 4,  height: 4  }, shadowOpacity: 1, shadowRadius: 0, elevation: 4  }
md:     { shadowOffset: { width: 6,  height: 6  }, shadowOpacity: 1, shadowRadius: 0, elevation: 6  }
lg:     { shadowOffset: { width: 8,  height: 8  }, shadowOpacity: 1, shadowRadius: 0, elevation: 8  }
active: { shadowOffset: { width: 2,  height: 2  }, shadowOpacity: 1, shadowRadius: 0, elevation: 2  }
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

### Monitoring Design Tokens
- Status colors: See `specs/phases/phase-2-d-monitoring/ui-ux.md` Section J
- Map tokens: marker size (36px), touch target (44x44px), cluster threshold (zoom < 13)
- Animation durations: marker appear (200ms), status transition (300ms), fly-to (1000ms)
- Responsive breakpoints: xl (65/35 split), lg (60/40), md (stacked+drawer), sm (stacked+sheet)

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
| Change a token value | [design-tokens.md](./design-tokens.md) + edit [tokens.json](./tokens.json) | [ADR-036](../architecture/decisions/ADR-036-design-tokens-single-source.md) |
| Add a PWA surface | [ADR-037](../architecture/decisions/ADR-037-web-pwa.md) + [design-tokens.md §PWA](./design-tokens.md) | phase-3 web.md |
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

| Phase | Status | Details |
|-------|--------|---------|
| **Phase 1–3** | ✅ Complete | All components shipped on Neo Brutalism 2.0 design system (April 2026) |
| **Phase 4** | ✅ Complete (Jun 11, 2026) | UI/UX revamp (4-R sub-phase) shipped; design-system v2.1 re-baseline applied (May 22–25); all 3 workspaces on v2.1 tokens + role accents |
| **Phase 5** | ✅ Complete (Jun 17, 2026) | Reporting (5-1), Analytics (5-2), Assets (5-3) feature modules shipped; web 11 pages (Recharts), mobile 8 screens + 3 Redux slices (charts wired) |
| **Phases 6+** | See `specs/COMPLETION_STATUS.md` | Refer to project SoT for current phase scope and status |

---

## 📂 Related Documentation

**Other specs folders:**
- `specs/mobile/screens.md` - Screen wireframes and layouts
- `specs/mobile/navigation.md` - Navigation structure
- `specs/web/pages.md` - Web dashboard pages
- `specs/architecture/data-flow.md` - Data flow patterns

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-06-20
**Status:** Active - Phase 4 v2.1 Baseline + Phase 5 Feature Modules (Reporting/Analytics/Assets)
**Design System Version:** 2.1.1 (Modern Neo Brutalism, Phase 4 rebrand re-baseline reconciled to design/)

**For the complete design system specification, see [neo-brutalism.md](./neo-brutalism.md)**
**For version history and migration guides, see [CHANGELOG.md](./CHANGELOG.md)**
