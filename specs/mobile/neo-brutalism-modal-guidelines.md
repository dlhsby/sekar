# Neo Brutalism Modal Design Guidelines

**Version:** 1.1
**Last Updated:** April 25, 2026 (Phase 3 M1-R cross-link added)
**Status:** Active
**Platform:** React Native Mobile
**Implementation:** Component spec + props in [`specs/mobile/component-library.md §NBModal`](./component-library.md#nbmodal); shipping in Phase 3 M1-R sub-phase 3-R3 as a unified `NBModal` wrapping `@gorhom/bottom-sheet` (sheet variant) + RN `<Modal>` (fullscreen variant). All visual rules in this guide are enforced by that component.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Visual Elements](#visual-elements)
4. [Layout Patterns](#layout-patterns)
5. [Color Usage](#color-usage)
6. [Component Specifications](#component-specifications)
7. [Examples](#examples)
8. [Accessibility](#accessibility)

---

## Overview

Modal components in the SEKAR mobile app should embody Neo Brutalism 2.0 design principles while maintaining excellent readability and WCAG 2.1 AA accessibility compliance. This guide provides specific patterns for making modals visually engaging without sacrificing usability.

**Core Philosophy:** Modals should be bold, distinctive, and functional. Use geometric shapes, color blocks, varied borders, and icons strategically to create visual hierarchy and guide user attention.

---

## Core Principles

### 1. Bold Visual Hierarchy
- **Color blocks** for section grouping and emphasis
- **Varied border thickness** (1px dividers, 2px containers, 3px emphasis)
- **Geometric accents** (squares, rectangles, circles) to draw attention
- **Icon integration** beyond functional purposes (decorative accents welcome)

### 2. Structured Information
- **Left-side accent bars** for status/category indication (4px width, full section height)
- **Background colors** for sections (use light pastel variants: successLight, warningLight, infoLight)
- **Inline badges** for status indicators
- **Color-coded sections** based on semantic meaning

### 3. Visual Interest Through Contrast
- **Mix bold and subtle** (black text on white, colored backgrounds, thick/thin borders)
- **Layered elements** (overlapping borders, shadow depth changes)
- **Asymmetric layouts** where appropriate (avoid perfect symmetry in favor of dynamic balance)

---

## Visual Elements

### Border Treatments

#### Section Borders
```typescript
// Main container
borderWidth: nbBorders.base,        // 2px
borderColor: nbColors.black,
borderRadius: nbBorderRadius.base,  // 6px

// Section dividers
borderBottomWidth: nbBorders.thin,  // 1px
borderBottomColor: nbColors.gray['200'],

// Emphasis sections (validation, status)
borderWidth: nbBorders.thick,       // 3px
borderColor: nbColors.successDark,  // Or danger/warning
```

#### Accent Bars
```typescript
// Left-side status indicator
{
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: 4,
  backgroundColor: nbColors.successDark, // Or warning, danger
  borderTopLeftRadius: nbBorderRadius.base,
  borderBottomLeftRadius: nbBorderRadius.base,
}
```

### Color Block Patterns

#### Background Sections
```typescript
// Success section (location valid)
backgroundColor: nbColors.successLight,  // #B5D2AD
borderLeftWidth: 4,
borderLeftColor: nbColors.successDark,

// Warning section (maintenance, time-sensitive)
backgroundColor: nbColors.warningLight,  // #FFDB58 (canonical per Phase 3-0, ADR-036 — pastel #FDFD96 was drift)
borderLeftWidth: 4,
borderLeftColor: nbColors.warning,

// Error section (location invalid)
backgroundColor: nbColors.dangerLight,   // #FFA07A
borderLeftWidth: 4,
borderLeftColor: nbColors.dangerDark,

// Info section (neutral data)
backgroundColor: nbColors.infoLight,     // #A7DBD8
borderLeftWidth: 4,
borderLeftColor: nbColors.info,
```

#### Icon Containers
```typescript
// Colored icon background
{
  width: 40,
  height: 40,
  borderRadius: nbBorderRadius.sm,     // 4px for small elements
  borderWidth: nbBorders.base,
  borderColor: nbColors.black,
  backgroundColor: nbColors.successLight,
  justifyContent: 'center',
  alignItems: 'center',
  ...nbShadows.xs,
}
```

### Geometric Accents

#### Corner Badges
```typescript
// Top-right status badge
{
  position: 'absolute',
  top: -8,
  right: 8,
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: nbBorderRadius.sm,
  borderWidth: nbBorders.base,
  borderColor: nbColors.black,
  backgroundColor: nbColors.primary,
  ...nbShadows.sm,
}
```

#### Divider Blocks
```typescript
// Small colored block divider (alternative to plain lines)
{
  width: 40,
  height: 4,
  backgroundColor: nbColors.primary,
  marginVertical: nbSpacing.md,
  borderRadius: nbBorderRadius.sm,
}
```

---

## Layout Patterns

### Pattern 1: Table with Colored Rows (Default)

**Use case:** General information display (shift details, user info)

```typescript
// Alternate row backgrounds
<View style={[
  styles.tableRow,
  index % 2 === 0 && { backgroundColor: nbColors.gray['50'] }
]}>
  <Text style={styles.label}>Label</Text>
  <Text style={styles.value}>Value</Text>
</View>
```

**Enhancement:** Add left accent bar to important rows (status, validation)

### Pattern 2: Section Grouping with Color Blocks

**Use case:** Mixed data types (location, time, status)

```typescript
// Group related fields in colored sections
<View style={styles.section}>
  {/* Left accent bar */}
  <View style={styles.accentBar} />

  <View style={styles.sectionContent}>
    <Text style={styles.sectionTitle}>Location Info</Text>
    {/* Fields */}
  </View>
</View>
```

### Pattern 3: Card Grid Layout

**Use case:** Multiple status indicators, feature list

```typescript
// 2-column grid of mini cards
<View style={styles.grid}>
  <View style={styles.miniCard}>
    <MaterialCommunityIcons name="map-marker" size={24} />
    <Text>GPS Valid</Text>
  </View>
  <View style={styles.miniCard}>
    <MaterialCommunityIcons name="clock" size={24} />
    <Text>On Time</Text>
  </View>
</View>
```

### Pattern 4: Hero Section + Details

**Use case:** Primary status with supporting details

```typescript
<View>
  {/* Large status indicator at top */}
  <View style={styles.heroSection}>
    <MaterialCommunityIcons name="check-circle" size={64} />
    <Text style={styles.heroText}>Location Valid</Text>
  </View>

  {/* Supporting details below */}
  <View style={styles.detailsTable}>
    {/* Table rows */}
  </View>
</View>
```

---

## Color Usage

### Semantic Color Mapping

| Data Type | Background | Border | Icon Color | Use Case |
|-----------|------------|--------|-----------|----------|
| **Location Valid** | `successLight` | `successDark` | `successDark` | GPS within radius |
| **Location Invalid** | `dangerLight` | `dangerDark` | `dangerDark` | GPS outside radius |
| **Time/Schedule** | `warningLight` | `warning` | `warning` | Clock in/out times |
| **General Info** | `infoLight` | `info` | `info` | Area name, type |
| **Neutral Data** | `gray['50']` | `gray['200']` | `gray['600']` | Coordinates, distance |

### Color Block Size Guidelines

| Block Size | When to Use | Example |
|------------|-------------|---------|
| **Full section** | Major status (valid/invalid) | Entire location validation section |
| **Row background** | Group related fields | All GPS coordinates |
| **Inline badge** | Single value emphasis | "Valid" badge |
| **Accent bar (4px)** | Section indicator | Left border of grouped section |
| **Icon background** | Visual focal point | Checkmark icon container |

---

## Component Specifications

### Modal Container

```typescript
const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: nbColors.surface,        // White
    borderTopLeftRadius: nbBorderRadius.md,  // 8px for modals
    borderTopRightRadius: nbBorderRadius.md,
    borderTopWidth: nbBorders.base,          // 2px
    borderLeftWidth: nbBorders.base,
    borderRightWidth: nbBorders.base,
    borderColor: nbColors.black,
    maxHeight: '85%',
    ...nbShadows.lg,                         // Prominent shadow
  },
});
```

### Header Variants

#### Standard Header
```typescript
header: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: nbSpacing.md,
  paddingVertical: nbSpacing.md,
  borderBottomWidth: nbBorders.base,        // 2px
  borderBottomColor: nbColors.black,
  backgroundColor: nbColors.surface,
}
```

#### Colored Header (Status-Based)
```typescript
headerSuccess: {
  backgroundColor: nbColors.successLight,   // Light green
  borderBottomWidth: nbBorders.thick,       // 3px emphasis
  borderBottomColor: nbColors.successDark,
}
```

### Section Styles

#### Colored Section with Accent Bar
```typescript
section: {
  position: 'relative',
  paddingLeft: nbSpacing.md + 8,           // Account for 4px accent bar
  paddingRight: nbSpacing.md,
  paddingVertical: nbSpacing.sm,
  backgroundColor: nbColors.successLight,
  borderLeftWidth: 4,
  borderLeftColor: nbColors.successDark,
  borderBottomWidth: nbBorders.thin,
  borderBottomColor: nbColors.gray['200'],
},

sectionTitle: {
  fontSize: nbTypography.fontSize.sm,
  fontWeight: nbTypography.fontWeight.bold,
  color: nbColors.black,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: nbSpacing.xs,
}
```

#### Mini Card in Grid
```typescript
miniCard: {
  flex: 1,
  padding: nbSpacing.sm,
  borderWidth: nbBorders.base,
  borderColor: nbColors.black,
  borderRadius: nbBorderRadius.sm,
  backgroundColor: nbColors.surface,
  alignItems: 'center',
  gap: nbSpacing.xs,
  ...nbShadows.xs,
}
```

### Icon Container
```typescript
iconContainer: {
  width: 40,
  height: 40,
  borderRadius: nbBorderRadius.sm,
  borderWidth: nbBorders.base,
  borderColor: nbColors.black,
  backgroundColor: nbColors.successLight,  // Semantic color
  justifyContent: 'center',
  alignItems: 'center',
  ...nbShadows.xs,
}
```

### Badge Inline
```typescript
inlineBadge: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: nbBorderRadius.sm,
  borderWidth: nbBorders.thin,
  borderColor: nbColors.black,
  backgroundColor: nbColors.successLight,
  alignSelf: 'flex-start',
}

badgeText: {
  fontSize: nbTypography.fontSize.xs,
  fontWeight: nbTypography.fontWeight.bold,
  color: nbColors.black,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}
```

---

## Examples

### Example 1: Shift Detail Modal (Enhanced)

**Improvements Applied:**
1. ✅ Colored section for location validation (green/red based on status)
2. ✅ Left accent bar (4px) on validation section
3. ✅ Icon container with background for validation icon
4. ✅ Inline badge for "Valid"/"Invalid" status
5. ✅ Alternating row backgrounds (gray['50'])
6. ✅ Thicker border (3px) on validation section for emphasis
7. ✅ Mini cards for key metrics (distance, radius)

### Example 2: Report Details Modal

**Visual Elements:**
- Hero section: Large checkmark icon (64px) with "Report Submitted" text
- Colored header: Success green for approved, warning yellow for pending
- Section grouping: Location info (blue), Time info (yellow), Media (gray)
- Icon containers: Camera, clock, map-marker with semantic backgrounds

### Example 3: Profile Modal

**Visual Elements:**
- Top section: Avatar with colored border (2px), name, role badge
- Alternating row backgrounds for personal info
- Section dividers: Small colored blocks (40x4px) instead of plain lines
- Action buttons: Full-width with icons at bottom

---

## Accessibility

### WCAG 2.1 AA Compliance

#### Color Contrast Requirements
- **Text on colored backgrounds:** Minimum 4.5:1 ratio
  - Black (#1C1917) on successLight (#B5D2AD): ✅ 7.8:1
  - Black (#1C1917) on warningLight (#FDFD96): ✅ 10.2:1
  - Black (#1C1917) on dangerLight (#FFA07A): ✅ 5.1:1
  - Black (#1C1917) on infoLight (#A7DBD8): ✅ 8.3:1

#### Focus Indicators
- All interactive elements: 3px focus ring with 2px offset
- Color: nbColors.primary with 40% opacity
- Visible on keyboard navigation

#### Screen Reader Support
```typescript
// Section with semantic meaning
<View
  accessibilityRole="region"
  accessibilityLabel="Location validation"
>
  {/* Content */}
</View>

// Status indicator
<View
  accessibilityRole="text"
  accessibilityLabel="Location valid, GPS coordinates within allowed radius"
>
  <Icon name="check-circle" />
  <Text>Valid</Text>
</View>
```

#### Touch Targets
- Minimum size: 48x48px (nbTouchTarget.minHeight)
- Spacing between targets: 8px minimum
- Close button: 48x48px with centered icon

### Color Independence
- **Never rely on color alone** for critical information
- Always pair color with:
  - Icons (check/alert/info)
  - Text labels ("Valid", "Invalid")
  - Borders/patterns (thick border for emphasis)

---

## Anti-Patterns (Avoid)

❌ **Plain table rows with no visual variation**
- Even plain data benefits from alternating backgrounds

❌ **All borders same thickness**
- Use varied widths (1px, 2px, 3px) for hierarchy

❌ **No color usage**
- Neo Brutalism embraces bold color blocks (with good contrast)

❌ **Purely decorative elements without semantic meaning**
- Every color should communicate status/category

❌ **Overcrowding with too many colors**
- Limit to 2-3 accent colors per modal based on semantic sections

❌ **Ignoring accessibility for visual appeal**
- All enhancements must maintain WCAG 2.1 AA compliance

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 8, 2026 | Initial guidelines created based on NB 2.0 design system |

---

## Related Documents

- [Design Tokens Reference](./design-tokens.md) - Complete token specifications
- [Component Library](./component-library.md) - Pre-built NB components
- [Phase 2-B Components](../phases/phase-2-b-ui-ux-revamp/components.md) - Component specifications
- [Neo Brutalism Design System](../ui-ux/neo-brutalism.md) - Core design principles

---

## Questions or Feedback

If you have questions about applying these guidelines or want to propose new patterns:
1. Check existing modal implementations for reference
2. Review the design token specifications for available options
3. Ensure all changes maintain WCAG 2.1 AA accessibility compliance
4. Document new patterns in this guide for future reference
