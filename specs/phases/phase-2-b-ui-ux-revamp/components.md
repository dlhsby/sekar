# Phase 2B: Component Specifications

**Last Updated:** February 5, 2026
**Version:** Neo Brutalism 2.0

This document provides complete specifications for all NB components across web and mobile platforms.

---

## Related Documents

| Document | Description |
|----------|-------------|
| [README.md](./README.md) | Phase overview, objectives, risk assessment |
| [STATUS.md](./STATUS.md) | Progress tracking checklists |
| [web.md](./web.md) | Web page specifications (22 pages) |
| [mobile.md](./mobile.md) | Mobile screen specifications (17 screens) |
| [timeline.md](./timeline.md) | Implementation schedule |
| [design-tokens.md](../../mobile/design-tokens.md) | Complete mobile token reference |
| [component-library.md](../../mobile/component-library.md) | Mobile component library |

---

## Table of Contents

1. [Design Token Reference](#design-token-reference)
2. [Web Components (16)](#web-components)
3. [Mobile Components (10)](#mobile-components)
4. [Component Parity Matrix](#component-parity-matrix)

---

## Design Token Reference

### Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `nb-primary` | #7FBC8C | Primary actions, active states |
| `nb-primary-dark` | #5A9468 | Hover/pressed states |
| `nb-secondary` | #8B7355 | Secondary actions |
| `nb-background` | #FFFBF0 | Main backgrounds (very soft cream) |
| `nb-sidebar` | #1A4D2E | Sidebar background |
| `nb-sidebar-hover` | #2D5233 | Sidebar hover state |
| `nb-sidebar-active` | #0F3520 | Sidebar active state |
| `nb-black` | #1C1917 | Borders, text |
| `nb-white` | #FFFFFF | Card backgrounds |
| `nb-gray-50` | #FAFAF9 | Light backgrounds |
| `nb-gray-100` | #F5F5F4 | Alternate backgrounds |
| `nb-gray-500` | #78716C | Muted text, icons |
| `nb-gray-600` | #57534E | Secondary text |
| `nb-success` | #BAFCA2 | Success backgrounds |
| `nb-success-border` | #7FBC8C | Success borders |
| `nb-warning` | #FFDB58 | Warning backgrounds |
| `nb-warning-border` | #E3A018 | Warning borders |
| `nb-danger` | #FF6B6B | Danger/error |
| `nb-danger-light` | #FFA07A | Danger backgrounds |
| `nb-info` | #A7DBD8 | Info backgrounds |
| `nb-info-border` | #69D2E7 | Info borders |

### Border Tokens

| Token | Web (Tailwind) | Mobile (nbTokens) | Value |
|-------|----------------|-------------------|-------|
| thin | `border` | `nbBorders.thin` | 1px |
| base | `border-2` | `nbBorders.base` | 2px |
| thick | `border-3` | `nbBorders.thick` | 3px |
| extra | `border-4` | `nbBorders.extra` | 4px |

### Border Radius Tokens

| Token | Web (Tailwind) | Mobile (nbTokens) | Value |
|-------|----------------|-------------------|-------|
| none | `rounded-none` | `nbBorderRadius.none` | 0px |
| sm | `rounded-nb-sm` | `nbBorderRadius.sm` | 4px |
| base | `rounded-nb-base` | `nbBorderRadius.base` | 6px |
| md | `rounded-nb-md` | `nbBorderRadius.md` | 8px |
| lg | `rounded-nb-lg` | `nbBorderRadius.lg` | 12px |
| full | `rounded-full` | `nbBorderRadius.full` | 9999px |

### Shadow Tokens

| Token | Web Value | Mobile Value |
|-------|-----------|--------------|
| xs | `2px 2px 0px rgba(28,25,23,0.15)` | `{x:2, y:2, opacity:0.15, radius:1}` |
| sm | `4px 4px 0px rgba(28,25,23,0.18)` | `{x:4, y:4, opacity:0.18, radius:2}` |
| md | `6px 6px 0px rgba(28,25,23,0.20)` | `{x:6, y:6, opacity:0.20, radius:3}` |
| lg | `8px 8px 0px rgba(28,25,23,0.22)` | `{x:8, y:8, opacity:0.22, radius:4}` |

---

## Web Components

### NBButton

```yaml
file: apps/web/src/components/ui/button.tsx
description: Primary action button with Neo Brutalism styling

tokens:
  border: border-2 (2px)
  border_color: border-nb-black
  radius: rounded-nb-base (6px)
  shadow: shadow-nb-md (6px offset)
  min_height: h-12 (48px)
  transition: transition-all duration-150

variants:
  primary:
    background: bg-nb-primary (#7FBC8C)
    text: text-white
    hover: bg-nb-primary-dark (#5A9468)
  secondary:
    background: bg-nb-secondary (#8B7355)
    text: text-white
  outline:
    background: bg-transparent
    text: text-nb-black
    border: border-2 border-nb-black
  ghost:
    background: bg-transparent
    text: text-nb-black
    border: none
    shadow: none
  destructive:
    background: bg-nb-danger (#FF6B6B)
    text: text-white

sizes:
  sm: h-10 px-4 text-sm
  md: h-12 px-6 text-base
  lg: h-14 px-8 text-lg

states:
  hover: translate-x-[-2px] translate-y-[-2px] shadow-nb-lg
  active: translate-x-[2px] translate-y-[2px] shadow-nb-xs
  disabled: opacity-50 cursor-not-allowed
  loading: opacity-80 + spinner
  focused: ring-3 ring-nb-primary/40 ring-offset-2

accessibility:
  - role="button"
  - aria-disabled={disabled}
  - aria-busy={loading}
  - aria-label required for icon-only
  - keyboard: Enter/Space to activate

migration:
  - border-3 → border-2
  - rounded-none → rounded-nb-base
  - Verify shadow uses soft-edge
```

### NBCard

```yaml
file: apps/web/src/components/ui/card.tsx
description: Container component for grouped content

tokens:
  background: bg-white
  border: border-2 border-nb-black
  radius: rounded-nb-base (6px)
  padding: p-6 (24px default)

shadows:
  default: shadow-nb-sm (4px offset)
  elevated: shadow-nb-md (6px offset)
  interactive_hover: shadow-nb-md + translate(-2px, -2px)
  interactive_active: shadow-nb-xs + translate(2px, 2px)

variants:
  default: shadow-nb-sm
  elevated: shadow-nb-md
  outlined: shadow-none, border only
  filled: bg-nb-success/20, no border
  interactive: hover/active animations

subcomponents:
  CardHeader:
    border: border-b-2 border-nb-black
    padding: px-6 py-4
    background: bg-nb-gray-100 (optional)
  CardContent:
    padding: p-6
  CardFooter:
    border: border-t-2 border-nb-black
    padding: px-6 py-4

accessibility:
  - role="region" when has title
  - role="button" when interactive
  - aria-label required when interactive
  - tabIndex={0} when interactive

migration:
  - border-3 → border-2
  - All subcomponent borders border-*-3 → border-*-2
  - rounded-none → rounded-nb-base
```

### NBInput

```yaml
file: apps/web/src/components/ui/input.tsx
description: Text input field with validation states

tokens:
  height: h-12 (48px min touch target)
  padding: px-4 py-3
  border: border-2
  radius: rounded-nb-base (6px)
  background: bg-white
  shadow: shadow-nb-sm

border_colors:
  default: border-nb-black
  focus: border-nb-primary
  error: border-nb-danger
  success: border-nb-primary

focus_state:
  border: border-3 border-nb-primary
  ring: ring-3 ring-nb-primary/15

states:
  default: standard styling
  focused: green border + focus ring
  error: red border + error message
  success: green border + check icon
  disabled: bg-nb-gray-100 opacity-70 no-shadow

with_icons:
  left_icon: pl-12
  right_icon: pr-12
  icon_size: w-6 h-6
  icon_color: text-nb-gray-500

label:
  font: text-sm font-medium
  color: text-nb-black
  margin: mb-2
  required: text-nb-danger

helper_text:
  font: text-xs
  color_default: text-nb-gray-600
  color_error: text-nb-danger
  color_success: text-nb-primary
  margin: mt-1

accessibility:
  - aria-invalid={hasError}
  - aria-describedby={helperId}
  - aria-required={required}
  - autocomplete attribute

migration:
  - border-3 → border-2
  - rounded-none → rounded-nb-base
```

### NBTextarea

```yaml
file: apps/web/src/components/ui/textarea.tsx
description: Multi-line text input

tokens:
  min_height: min-h-[120px]
  padding: px-4 py-3
  border: border-2
  radius: rounded-nb-base (6px)
  background: bg-white
  shadow: shadow-nb-sm
  resize: resize-y

inherits: NBInput (colors, states, label, helper)

migration:
  - border-3 → border-2
  - rounded-none → rounded-nb-base
```

### NBSelect

```yaml
file: apps/web/src/components/ui/select.tsx
description: Dropdown select component

trigger:
  height: h-12
  padding: px-4
  border: border-2
  radius: rounded-nb-base
  background: bg-white
  shadow: shadow-nb-sm

content:
  border: border-2
  radius: rounded-nb-base
  background: bg-white
  shadow: shadow-nb-lg
  max_height: max-h-60

item:
  padding: px-4 py-2
  hover: bg-nb-gray-100
  selected: bg-nb-primary text-white

accessibility:
  - role="listbox" on content
  - role="option" on items
  - aria-selected on selected item
  - aria-expanded on trigger

migration:
  - All border-3 → border-2
  - All rounded-none → rounded-nb-base
```

### NBBadge

```yaml
file: apps/web/src/components/ui/badge.tsx
description: Status indicator for labels and counts

tokens:
  border: border-2
  radius: rounded-nb-sm (4px)
  shadow: shadow-nb-xs (2px offset)
  font: text-xs font-semibold uppercase
  letter_spacing: tracking-wide

sizes:
  sm: px-2 py-0.5
  md: px-3 py-1
  lg: px-4 py-2 text-sm

variants:
  primary: bg-nb-primary text-white
  secondary: bg-nb-gray-100 text-nb-black
  success: bg-nb-success text-nb-black border-nb-success-border
  warning: bg-nb-warning text-nb-black border-nb-warning-border
  danger: bg-nb-danger-light text-nb-black border-nb-danger
  info: bg-nb-info text-nb-black border-nb-info-border
  outline: bg-transparent text-nb-black

accessibility:
  - role="status" for dynamic badges
  - aria-label describing the badge meaning

migration:
  - rounded-none → rounded-nb-sm
  - Add shadow-nb-xs
```

### NBDialog

```yaml
file: apps/web/src/components/ui/dialog.tsx
description: Modal dialog component

overlay:
  background: bg-nb-black/80
  animation: fade-in

content:
  border: border-2
  radius: rounded-nb-md (8px)
  background: bg-white
  shadow: shadow-nb-lg
  max_width: max-w-lg
  padding: p-0 (subcomponents have padding)

header:
  border: border-b-2
  padding: px-6 py-4
  font: text-lg font-bold

body:
  padding: p-6

footer:
  border: border-t-2
  padding: px-6 py-4
  layout: flex justify-end gap-3

accessibility:
  - role="dialog"
  - aria-modal="true"
  - aria-labelledby={titleId}
  - aria-describedby={descriptionId}
  - Focus trap enabled
  - Escape to close

migration:
  - All border-3 → border-2
  - rounded-none → rounded-nb-md
  - Ensure aria-labelledby links to title
```

### NBDropdownMenu

```yaml
file: apps/web/src/components/ui/dropdown-menu.tsx
description: Dropdown menu for actions

trigger:
  inherits: NBButton styling

content:
  border: border-2
  radius: rounded-nb-base
  background: bg-white
  shadow: shadow-nb-lg
  min_width: min-w-[200px]
  padding: py-1

item:
  padding: px-4 py-2
  hover: bg-nb-gray-100
  disabled: opacity-50

separator:
  border: border-t border-nb-gray-200
  margin: my-1

accessibility:
  - role="menu" on content
  - role="menuitem" on items
  - Arrow key navigation
  - Escape to close

migration:
  - All border-3 → border-2
  - All rounded-none → rounded-nb-base
```

### NBTable

```yaml
file: apps/web/src/components/ui/table.tsx
description: Data table with NB styling

container:
  border: border-2
  radius: rounded-nb-base
  background: bg-white
  shadow: shadow-nb-sm
  overflow: overflow-hidden

header:
  border: border-b-2
  background: bg-nb-gray-100
  font: text-sm font-semibold uppercase

header_cell:
  padding: px-4 py-3
  text: text-left

body_row:
  border: border-b border-nb-gray-200
  hover: hover:bg-nb-gray-50

body_cell:
  padding: px-4 py-3
  text: text-sm

footer:
  border: border-t-2
  background: bg-nb-gray-50

accessibility:
  - role="table"
  - role="rowgroup" for thead/tbody
  - role="row" for tr
  - role="columnheader" / role="cell"
  - aria-sort on sortable columns

migration:
  - Outer border-3 → border-2
  - Header border-b-3 → border-b-2
  - Add aria-sort to sortable headers
```

### NBDataTable

```yaml
file: apps/web/src/components/ui/data-table.tsx
description: Enhanced data table with sorting, selection, pagination

inherits: NBTable

features:
  sorting:
    icons: ChevronUp/ChevronDown
    aria_sort: ascending/descending/none
  selection:
    checkbox: NBCheckbox styling
    aria_selected: true/false
  pagination:
    component: NBPagination
    aria_label: "Page navigation"

migration:
  - Apply all NBTable migrations
  - Ensure aria-sort on headers
```

### NBSidebar

```yaml
file: apps/web/src/components/ui/sidebar.tsx
description: Navigation sidebar for web dashboard

container:
  width: w-60 (240px)
  background: bg-nb-sidebar (#1A4D2E)
  border: border-r-2 border-nb-black
  height: h-screen
  position: fixed

colors:
  bg_default: #1A4D2E
  bg_hover: #2D5233
  bg_active: #0F3520
  text_default: text-white
  text_muted: text-white/70
  border_internal: #2D5233

nav_item:
  height: h-12 (48px)
  padding: px-4
  margin: mx-2 my-1
  radius: rounded-nb-base
  icon_size: w-6 h-6
  gap: gap-3

states:
  default: transparent
  hover: bg-nb-sidebar-hover
  active: bg-nb-sidebar-active + left accent (4px #7FBC8C)
  expanded: shows children

user_section:
  position: bottom
  border: border-t-2 border-[#2D5233]
  avatar_size: w-10 h-10
  avatar_border: border-2 border-nb-black

accessibility:
  - role="navigation"
  - aria-label="Main navigation"
  - aria-expanded on collapsible items
  - aria-current="page" on active item
  - Arrow keys to navigate

migration:
  - border-r-3 → border-r-2
  - bg-nb-navy (#001F3F) → bg-nb-sidebar (#1A4D2E)
  - Update all hover/active colors
  - Add aria-expanded to toggles
```

### NBEmptyState

```yaml
file: apps/web/src/components/ui/empty-state.tsx
description: Empty state placeholder

container:
  border: border-2
  radius: rounded-nb-base
  background: bg-white
  shadow: shadow-nb-sm
  padding: p-8
  text_align: text-center

icon_container:
  size: w-16 h-16
  border: border-2
  radius: rounded-nb-base
  background: bg-nb-gray-100
  margin: mb-4 mx-auto

title:
  font: text-lg font-bold
  color: text-nb-black
  margin: mb-2

description:
  font: text-sm
  color: text-nb-gray-600
  margin: mb-4

action:
  component: NBButton
  variant: primary

migration:
  - All border-3 → border-2
  - All rounded-none → rounded-nb-base
```

### NBSkeleton

```yaml
file: apps/web/src/components/ui/skeleton.tsx
description: Loading placeholder

container:
  border: border border-nb-gray-300
  radius: rounded-nb-sm (4px)
  background: bg-nb-gray-200
  shadow: shadow-nb-xs
  animation: animate-shimmer

variants:
  text: h-4 w-full
  title: h-6 w-3/4
  avatar: w-10 h-10 rounded-full
  button: h-10 w-24
  card: h-32 w-full

migration:
  - rounded-none → rounded-nb-sm
  - Add shadow-nb-xs
```

### NBFormInput

```yaml
file: apps/web/src/components/ui/form-input.tsx
description: Form input with label and error handling

inherits: NBInput

structure:
  label:
    element: <label>
    htmlFor: linked to input id
  input:
    component: NBInput
  error:
    element: <span>
    role: "alert"
    color: text-nb-danger

accessibility:
  - htmlFor links label to input
  - aria-describedby links to error
  - role="alert" on error message

migration:
  - Apply all NBInput migrations
```

### NBFormSelect

```yaml
file: apps/web/src/components/ui/form-select.tsx
description: Form select with label and error handling

inherits: NBSelect

structure:
  label:
    element: <label>
    htmlFor: linked to select
  select:
    component: NBSelect
  error:
    element: <span>
    role: "alert"
    color: text-nb-danger

accessibility:
  - htmlFor links label to select
  - role="alert" on error message

migration:
  - Apply all NBSelect migrations
```

### NBLabel

```yaml
file: apps/web/src/components/ui/label.tsx
description: Form label component

tokens:
  font: text-sm font-medium
  color: text-nb-black
  display: block

required_indicator:
  content: " *"
  color: text-nb-danger

migration:
  - Add explicit text-nb-black color
```

---

## Mobile Components

### NBButton

```yaml
file: apps/mobile/src/components/nb/NBButton.tsx
description: Primary action button for mobile

tokens:
  border: nbBorders.base (2px)
  radius: nbBorderRadius.base (6px)
  shadow: nbShadows.md (soft-edge)
  min_height: 48
  padding_horizontal: 24
  padding_vertical: 12

variants:
  primary:
    background: nbColors.primary (#7FBC8C)
    text: white
    border_color: nbColors.black
  secondary:
    background: nbColors.secondary (#8B7355)
    text: white
  outline:
    background: transparent
    text: nbColors.black
  ghost:
    background: transparent
    text: nbColors.black
    border: none
    shadow: none
  destructive:
    background: nbColors.danger (#FF6B6B)
    text: white

sizes:
  sm: height: 40, paddingHorizontal: 16, fontSize: 14
  md: height: 48, paddingHorizontal: 24, fontSize: 16
  lg: height: 56, paddingHorizontal: 32, fontSize: 18

animations:
  press: translateY(2), shadow reduced
  release: translateY(0), shadow restored

haptics:
  press: impactLight
  release: impactMedium

accessibility:
  - accessibilityRole="button"
  - accessibilityState={{ disabled, busy }}
  - accessibilityLabel required for icon-only
  - Respects AccessibilityInfo.isReduceMotionEnabled

migration:
  - nbBorders.default (3) → nbBorders.base (2)
  - nbBorderRadius.minimal (2) → nbBorderRadius.base (6)
  - Shadow opacity 1 → 0.20, radius 0 → 3
```

### NBCard

```yaml
file: apps/mobile/src/components/nb/NBCard.tsx
description: Container component for mobile

tokens:
  background: white
  border: nbBorders.base (2px)
  radius: nbBorderRadius.base (6px)
  padding: 16 (default)
  shadow: nbShadows.sm (soft-edge)

variants:
  default: standard styling
  elevated: shadow nbShadows.md
  outlined: no shadow
  interactive: press animations

animations:
  interactive_press: translateY(2), shadow reduced
  interactive_release: translateY(0), shadow restored

haptics:
  press: impactLight (when interactive)

accessibility:
  - accessibilityRole="button" when interactive
  - accessibilityLabel when interactive

migration:
  - nbBorders.default (3) → nbBorders.base (2)
  - nbBorderRadius.minimal (2) → nbBorderRadius.base (6)
  - Shadow opacity 1 → 0.18, radius 0 → 2
```

### NBTextInput

```yaml
file: apps/mobile/src/components/nb/NBTextInput.tsx
description: Text input for mobile

tokens:
  height: 48
  padding: 12 16
  border_default: nbBorders.base (2px)
  border_focus: nbBorders.thick (3px)
  radius: nbBorderRadius.base (6px)
  background: white
  shadow: nbShadows.sm

colors:
  border_default: nbColors.black
  border_focus: nbColors.primary
  border_error: nbColors.danger
  border_success: nbColors.primary

focus_shadow:
  color: rgba(127, 188, 140, 0.15)
  offset: { width: 0, height: 0 }
  radius: 6

label:
  font_size: 14
  font_weight: 500
  color: nbColors.black
  margin_bottom: 8

helper_text:
  font_size: 12
  color_default: nbColors.gray600
  color_error: nbColors.danger
  margin_top: 4

accessibility:
  - accessibilityLabel for input
  - accessibilityHint for helper text
  - accessibilityState={{ invalid: hasError }}

migration:
  - Border 3px → 2px
  - Focus border 4px → 3px
  - Radius 2px → 6px
  - Focus shadow hard → soft
```

### NBPasswordInput

```yaml
file: apps/mobile/src/components/nb/NBPasswordInput.tsx
description: Password input with visibility toggle

inherits: NBTextInput

toggle_button:
  size: 48x48 (touch target)
  icon: eye / eye-off
  position: absolute right

accessibility:
  - Toggle accessibilityRole="button"
  - Toggle accessibilityLabel="Tampilkan/Sembunyikan password"
  - Toggle accessibilityState={{ checked: visible }}

migration:
  - Apply all NBTextInput migrations
```

### NBAlert

```yaml
file: apps/mobile/src/components/nb/NBAlert.tsx
description: Alert/notification component

tokens:
  border: nbBorders.base (2px)
  radius: nbBorderRadius.base (6px)
  padding: 16
  shadow: nbShadows.sm

variants:
  success:
    background: nbColors.successLight
    border_color: nbColors.success
    icon: check-circle
  warning:
    background: nbColors.warningLight
    border_color: nbColors.warning
    icon: alert-triangle
  error:
    background: nbColors.dangerLight
    border_color: nbColors.danger
    icon: alert-circle
  info:
    background: nbColors.infoLight
    border_color: nbColors.info
    icon: info

haptics:
  error: notificationError
  warning: notificationWarning
  success: notificationSuccess

accessibility:
  - accessibilityRole="alert"
  - accessibilityLiveRegion="assertive" (error) / "polite" (others)

migration:
  - Border 3px → 2px
  - Radius 2px → 6px
  - Shadow hard → soft
```

### NBBadge

```yaml
file: apps/mobile/src/components/nb/NBBadge.tsx
description: Status indicator badge

tokens:
  border: nbBorders.thin (1px)
  radius: nbBorderRadius.sm (4px)
  padding_horizontal: 8
  padding_vertical: 4
  font_size: 12
  font_weight: 600
  text_transform: uppercase

variants:
  primary: bg nbColors.primary, text white
  secondary: bg nbColors.gray100, text nbColors.black
  success: bg nbColors.successLight, border nbColors.success
  warning: bg nbColors.warningLight, border nbColors.warning
  danger: bg nbColors.dangerLight, border nbColors.danger
  info: bg nbColors.infoLight, border nbColors.info
  outline: bg transparent, border nbColors.black

accessibility:
  - accessibilityRole="text" (NEW - add this)
  - accessibilityLabel describing badge meaning (NEW - add this)

migration:
  - nbBorders.thin (2) → nbBorders.thin (1)
  - Radius 2px → 4px
  - ADD accessibilityRole="text"
  - ADD accessibilityLabel prop
```

### NBTab

```yaml
file: apps/mobile/src/components/nb/NBTab.tsx
description: Tab button component

tokens:
  border: nbBorders.base (2px)
  radius: nbBorderRadius.base (6px)
  height: 48
  padding_horizontal: 16

colors:
  inactive_bg: transparent
  inactive_text: nbColors.gray600
  active_bg: nbColors.primary
  active_text: white
  active_border: nbColors.black

haptics:
  select: impactLight

accessibility:
  tab_item:
    - accessibilityRole="tab"
    - accessibilityState={{ selected }}
  tab_container:
    - accessibilityRole="tablist" (NEW - add to container)

migration:
  - Border 3px → 2px
  - Radius 2px → 6px
  - ADD accessibilityRole="tablist" to container
```

### NBSkeleton

```yaml
file: apps/mobile/src/components/nb/NBSkeleton.tsx
description: Loading placeholder

tokens:
  border: nbBorders.thin (1px)
  radius: nbBorderRadius.sm (4px)
  background: nbColors.gray200
  animation: shimmer (opacity 0.3 → 0.7)

variants:
  text: height 16, width 100%
  title: height 24, width 75%
  avatar: width 40, height 40, borderRadius full
  button: height 40, width 80
  card: height 120, width 100%

accessibility:
  - accessibilityRole="progressbar" (NEW - add this)
  - accessibilityState={{ busy: true }} (NEW - add this)
  - accessibilityLabel="Loading..." (NEW - add this)

migration:
  - Border 2px → 1px
  - Radius 2px → 4px
  - ADD accessibility props
```

### NBEmptyState

```yaml
file: apps/mobile/src/components/nb/NBEmptyState.tsx
description: Empty state placeholder

tokens:
  border: nbBorders.base (2px)
  radius: nbBorderRadius.base (6px)
  background: white
  shadow: nbShadows.sm
  padding: 24
  text_align: center

icon_container:
  size: 64
  border: nbBorders.base (2px)
  radius: nbBorderRadius.base (6px)
  background: nbColors.gray100

title:
  font_size: 18
  font_weight: bold
  color: nbColors.black
  margin_top: 16

description:
  font_size: 14
  color: nbColors.gray600
  margin_top: 8

action:
  component: NBButton
  margin_top: 16

labels: Indonesian text by default

migration:
  - Border 3px → 2px
  - Radius 2px → 6px
  - Icon radius 2px → 6px
  - Shadow hard → soft
```

### NBBackgroundPattern

```yaml
file: apps/mobile/src/components/nb/NBBackgroundPattern.tsx
description: Decorative background pattern

types:
  grid: intersecting lines
  dots: dot matrix
  stripes: diagonal lines
  checkerboard: alternating squares

tokens:
  opacity: 0.03 (3%)
  color: nbColors.black

svg_implementation: true
performance_optimized: true

migration: No changes required
```

---

## Component Parity Matrix

| Component | Web | Mobile | Parity Status | Notes |
|-----------|-----|--------|---------------|-------|
| Button | ✅ | ✅ | ✅ Match | After token updates |
| Card | ✅ | ✅ | ✅ Match | After token updates |
| Badge | ✅ | ✅ | ✅ Match | After token + a11y |
| Input | ✅ | ✅ | ✅ Match | After token updates |
| Password Input | ⚠️ type="password" | ✅ Dedicated | ⚠️ Different | OK - platform appropriate |
| Textarea | ✅ | ❌ Missing | ❌ Gap | Consider adding to mobile |
| Select | ✅ | ❌ Missing | ❌ Gap | Use native picker on mobile |
| Form Input | ✅ | ⚠️ Label in Input | ⚠️ Different | OK - platform appropriate |
| Form Select | ✅ | ❌ Missing | ❌ Gap | Use native picker on mobile |
| Dialog | ✅ | ❌ Missing | ❌ Gap | Add NBModal to mobile |
| Dropdown | ✅ | ❌ Missing | ⚠️ N/A | Use ActionSheet on mobile |
| Table | ✅ | N/A | N/A | Web only |
| DataTable | ✅ | N/A | N/A | Web only |
| Sidebar | ✅ | N/A | N/A | Web only |
| Tab | ⚠️ Missing | ✅ | ❌ Gap | Add NBTabs to web |
| Alert | ⚠️ Missing | ✅ | ❌ Gap | Add NBAlert to web |
| Empty State | ✅ | ✅ | ✅ Match | After token updates |
| Skeleton | ✅ | ✅ | ✅ Match | After token + a11y |
| Background Pattern | ⚠️ CSS | ✅ Component | ⚠️ Different | OK - platform appropriate |
| Label | ✅ | ⚠️ Inline | ⚠️ Different | OK - platform appropriate |

---

## Component Testing

### Web Component Tests

```bash
# Run all UI component tests
cd apps/web && npm test -- --testPathPattern="components/ui"

# Run specific component test
cd apps/web && npm test -- button.test
cd apps/web && npm test -- card.test
cd apps/web && npm test -- input.test
```

### Mobile Component Tests

```bash
# Run all NB component tests
cd apps/mobile && npm test -- --testPathPattern="components/nb"

# Run specific component test
cd apps/mobile && npm test -- NBButton
cd apps/mobile && npm test -- NBCard
cd apps/mobile && npm test -- NBTextInput
```

### After Each Component Update

1. Run component-specific tests
2. Run visual regression check (if available)
3. Verify no TypeScript errors: `npm run lint`
4. Check build passes: `npm run build`

---

## File Locations

### Web Components
| Component | File Path |
|-----------|-----------|
| NBButton | `apps/web/src/components/ui/button.tsx` |
| NBCard | `apps/web/src/components/ui/card.tsx` |
| NBInput | `apps/web/src/components/ui/input.tsx` |
| NBSelect | `apps/web/src/components/ui/select.tsx` |
| NBDialog | `apps/web/src/components/ui/dialog.tsx` |
| NBTable | `apps/web/src/components/ui/table.tsx` |
| NBSidebar | `apps/web/src/components/ui/sidebar.tsx` |
| NBBadge | `apps/web/src/components/ui/badge.tsx` |

### Mobile Components
| Component | File Path |
|-----------|-----------|
| NBButton | `apps/mobile/src/components/nb/NBButton.tsx` |
| NBCard | `apps/mobile/src/components/nb/NBCard.tsx` |
| NBTextInput | `apps/mobile/src/components/nb/NBTextInput.tsx` |
| NBPasswordInput | `apps/mobile/src/components/nb/NBPasswordInput.tsx` |
| NBAlert | `apps/mobile/src/components/nb/NBAlert.tsx` |
| NBBadge | `apps/mobile/src/components/nb/NBBadge.tsx` |
| NBTab | `apps/mobile/src/components/nb/NBTab.tsx` |
| NBSkeleton | `apps/mobile/src/components/nb/NBSkeleton.tsx` |

### Token Files
| Platform | File Path |
|----------|-----------|
| Web | `apps/web/src/app/globals.css` |
| Mobile | `apps/mobile/src/constants/nbTokens.ts` |
