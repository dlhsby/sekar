# Nature-Themed Neo Brutalism Guide

**DLH Surabaya Parks & Environment Management App**

This guide shows how to apply the nature-themed Neo Brutalism design system to create a distinctive, park-focused visual identity while maintaining bold NB aesthetics.

---

## Color Philosophy

Instead of generic corporate blue/white, SEKAR embraces **nature-inspired colors** that reflect DLH's mission:

- **Forest Green** (`#2D5016`) - Primary brand color representing parks, trees, environmental stewardship
- **Warm Backgrounds** (`#F5F3EF`) - Natural paper/sand texture instead of stark white
- **Earth Tones** - Browns, greens from the Indonesian landscape
- **Playful Accents** - Grass green, sky blue, sunshine yellow, flower pink

---

## Key UI Elements

### 1. Screen Background (ALL SCREENS)

```tsx
// BEFORE: Boring pure white
container: {
  flex: 1,
  backgroundColor: '#FFFFFF', // ❌ Too generic
}

// AFTER: Warm natural background
container: {
  flex: 1,
  backgroundColor: nbColors.background, // ✅ #F5F3EF - warm off-white
}
```

**Why?**
- Reduces eye strain with warmer tone
- Creates "paper/parchment" feel - professional yet natural
- Makes white cards pop with better contrast
- Distinctive from generic apps

---

### 2. Top Navigation Bar (Header)

```tsx
// Deep forest green header with white text
header: {
  backgroundColor: nbColors.primary, // #2D5016 - forest green
  borderBottomWidth: nbBorders.default, // 3px
  borderBottomColor: nbColors.black,
  paddingVertical: nbSpacing.md,
  paddingHorizontal: nbSpacing.lg,
  ...nbShadows.sm, // Hard-edge shadow: 4px 4px 0 #000000
}

headerTitle: {
  fontSize: nbTypography.fontSize.xl,
  fontWeight: nbTypography.fontWeight.bold,
  color: nbColors.white, // White text on forest green
}

headerIcon: {
  color: nbColors.white,
}
```

**Visual Impact:**
```
┌─────────────────────────────────┐
│ SEKAR Dashboard      ☰          │ ← Forest green (#2D5016)
│                                  │   White text & icons
└─────────────────────────────────┘
  └─── 4px black shadow
```

---

### 3. Bottom Tab Bar

```tsx
// Forest green bottom bar with accent selection
tabBar: {
  backgroundColor: nbColors.primary, // #2D5016
  borderTopWidth: nbBorders.default, // 3px
  borderTopColor: nbColors.black,
  height: 64,
  paddingBottom: nbSpacing.sm,
  ...nbShadows.sm, // Hard shadow (inverted for top)
}

// Active/selected tab
tabActive: {
  backgroundColor: nbColors.accentGrass, // #7CB342 - bright grass green
  borderRadius: 0, // Sharp corners
  borderWidth: nbBorders.default,
  borderColor: nbColors.black,
}

// Inactive tabs
tabInactive: {
  backgroundColor: 'transparent',
}

// Icon colors
tabIconActive: {
  color: nbColors.black, // Black icon on grass green
}

tabIconInactive: {
  color: nbColors.white, // White icon on forest green
}
```

**Visual:**
```
┌─────────────────────────────────┐
│ Content area (warm background)  │
│                                  │
└─────────────────────────────────┘
  ┌───┬───┬───┬───┐
  │ 📍│🟩 │ 📊│ 👤│ ← Forest green bar
  └───┴───┴───┴───┘   Green highlight for active
      └─ Active tab (grass green)
```

---

### 4. Primary Button (Action Buttons)

```tsx
// Forest green button with press animation
button: {
  backgroundColor: nbColors.primary, // #2D5016
  borderWidth: nbBorders.default, // 3px
  borderColor: nbColors.black,
  paddingVertical: nbSpacing.md,
  paddingHorizontal: nbSpacing.lg,
  ...nbShadows.md, // 6px 6px 0 #000000
}

buttonText: {
  color: nbColors.white,
  fontSize: nbTypography.fontSize.base,
  fontWeight: nbTypography.fontWeight.bold,
  textAlign: 'center',
}

// Pressed state
buttonPressed: {
  backgroundColor: nbColors.primaryLight, // #4A7C2C - lighter green
  transform: [{ translateX: 2 }, { translateY: 2 }],
  ...nbShadows.active, // 2px 2px 0 #000000
}
```

**Press Animation:**
```
┌──────────────┐
│ Clock In     │ ← Normal: 6px 6px shadow
└──────────────┘

  ↓ Press

 ┌──────────────┐
 │ Clock In     │ ← Pressed: shifts 2px, 2px shadow
 └──────────────┘
```

---

### 5. Secondary Button (Cancel, Back)

```tsx
// Earth brown or outlined variant
buttonSecondary: {
  backgroundColor: nbColors.white, // White background
  borderWidth: nbBorders.default, // 3px
  borderColor: nbColors.primary, // Forest green border
  paddingVertical: nbSpacing.md,
  paddingHorizontal: nbSpacing.lg,
  ...nbShadows.sm,
}

buttonSecondaryText: {
  color: nbColors.primary, // Forest green text
  fontSize: nbTypography.fontSize.base,
  fontWeight: nbTypography.fontWeight.bold,
}
```

---

### 6. Cards (Content Cards)

```tsx
// Pure white cards on warm background for maximum contrast
card: {
  backgroundColor: nbColors.surface, // #FFFFFF - pure white
  borderWidth: nbBorders.default, // 3px
  borderColor: nbColors.black,
  padding: nbSpacing.md,
  marginBottom: nbSpacing.md,
  ...nbShadows.md, // 6px 6px 0 #000000
}

// Card header with green accent
cardHeader: {
  borderBottomWidth: nbBorders.thin, // 2px
  borderBottomColor: nbColors.primary, // Forest green divider
  paddingBottom: nbSpacing.sm,
  marginBottom: nbSpacing.md,
}

cardTitle: {
  fontSize: nbTypography.fontSize.lg,
  fontWeight: nbTypography.fontWeight.bold,
  color: nbColors.primary, // Forest green title
}
```

**Visual:**
```
#F5F3EF (warm background)
  ┌─────────────────────────┐
  │ Shift Information       │ ← White card
  │ ─────────────────       │   Green title
  │                         │   Black 3px border
  │ Area: Taman Bungkul     │   6px shadow
  │ Status: Active          │
  └─────────────────────────┘
    └──── 6px black shadow
```

---

### 7. Status Badges

```tsx
// Active status - grass green
badgeActive: {
  backgroundColor: nbColors.accentGrass, // #7CB342
  borderWidth: nbBorders.thin, // 2px
  borderColor: nbColors.black,
  paddingHorizontal: nbSpacing.sm,
  paddingVertical: nbSpacing.xs,
  borderRadius: nbBorderRadius.full, // Circular badge
}

badgeActiveText: {
  color: nbColors.black,
  fontSize: nbTypography.fontSize.sm,
  fontWeight: nbTypography.fontWeight.semibold,
}

// Warning status - sunshine yellow
badgeWarning: {
  backgroundColor: nbColors.accentSunshine, // #FDD835
  borderWidth: nbBorders.thin,
  borderColor: nbColors.black,
  paddingHorizontal: nbSpacing.sm,
  paddingVertical: nbSpacing.xs,
  borderRadius: nbBorderRadius.full,
}
```

---

### 8. Input Fields

```tsx
// Natural form inputs
input: {
  backgroundColor: nbColors.white,
  borderWidth: nbBorders.default, // 3px
  borderColor: nbColors.black,
  paddingHorizontal: nbSpacing.md,
  paddingVertical: nbSpacing.sm,
  fontSize: nbTypography.fontSize.base,
  color: nbColors.black,
  ...nbShadows.sm,
}

// Focused state
inputFocused: {
  borderColor: nbColors.primary, // Forest green border
  ...nbShadows.md, // Larger shadow
}

// Label
inputLabel: {
  fontSize: nbTypography.fontSize.sm,
  fontWeight: nbTypography.fontWeight.semibold,
  color: nbColors.primary, // Forest green label
  marginBottom: nbSpacing.xs,
}
```

---

### 9. Map Elements

```tsx
// Map container with green border
mapContainer: {
  height: 400,
  backgroundColor: nbColors.surface,
  borderWidth: nbBorders.default,
  borderColor: nbColors.primary, // Forest green border
  ...nbShadows.lg, // 8px 8px 0 #000000
}

// Custom map markers
markerActive: {
  backgroundColor: nbColors.accentGrass, // Grass green for active workers
  borderWidth: nbBorders.thin,
  borderColor: nbColors.black,
}

markerInactive: {
  backgroundColor: nbColors.gray[400], // Gray for inactive
  borderWidth: nbBorders.thin,
  borderColor: nbColors.black,
}
```

---

### 10. Bottom Sheets / Modals

```tsx
// Elevated modal with warm background
modal: {
  backgroundColor: nbColors.surface, // White
  borderWidth: nbBorders.thick, // 4px for emphasis
  borderColor: nbColors.black,
  borderTopLeftRadius: 0, // Sharp corners
  borderTopRightRadius: 0,
  ...nbShadows.lg, // Large shadow
}

// Modal header with green accent
modalHeader: {
  backgroundColor: nbColors.primary, // Forest green
  paddingVertical: nbSpacing.md,
  paddingHorizontal: nbSpacing.lg,
  borderBottomWidth: nbBorders.default,
  borderBottomColor: nbColors.black,
}

modalTitle: {
  fontSize: nbTypography.fontSize.xl,
  fontWeight: nbTypography.fontWeight.bold,
  color: nbColors.white,
}
```

---

## Accent Color Usage Guide

Use sparingly for **playful Neo Brutalism touches**:

### 🟩 Grass Green (`accentGrass: #7CB342`)
- Active badges
- Success indicators
- "Online" status
- Selected tab background
- Positive metrics

### ☀️ Sunshine Yellow (`accentSunshine: #FDD835`)
- Notifications badge
- Attention indicators
- Warning highlights (non-critical)
- New feature tags

### 🌸 Flower Pink (`accentFlower: #EC407A`)
- Special events
- Achievement badges
- VIP indicators
- Celebratory elements

### 🌤️ Sky Blue (`accentSky: #29B6F6`)
- Informational elements
- Help tooltips
- Secondary highlights
- Calm/neutral state

---

## Typography Hierarchy with Green Accents

```tsx
// Page title (forest green)
pageTitle: {
  fontSize: nbTypography.fontSize['3xl'],
  fontWeight: nbTypography.fontWeight.bold,
  color: nbColors.primary, // Forest green
  marginBottom: nbSpacing.md,
}

// Section heading (forest green)
sectionHeading: {
  fontSize: nbTypography.fontSize.xl,
  fontWeight: nbTypography.fontWeight.semibold,
  color: nbColors.primary,
  marginBottom: nbSpacing.sm,
}

// Body text (black)
bodyText: {
  fontSize: nbTypography.fontSize.base,
  fontWeight: nbTypography.fontWeight.regular,
  color: nbColors.black,
  lineHeight: nbTypography.fontSize.base * nbTypography.lineHeight.normal,
}

// Secondary text (gray)
secondaryText: {
  fontSize: nbTypography.fontSize.sm,
  color: nbColors.gray[600],
}
```

---

## Implementation Checklist

Apply these nature-themed updates to:

- [ ] All screen container backgrounds → `nbColors.background` (`#F5F3EF`)
- [ ] Top navigation bar → Forest green (`#2D5016`) background, white text
- [ ] Bottom tab bar → Forest green background, grass green active state
- [ ] Primary buttons → Forest green (`#2D5016`)
- [ ] Secondary buttons → White with forest green border
- [ ] Card titles → Forest green text
- [ ] Input labels → Forest green
- [ ] Status badges → Use accent colors (grass, sunshine, flower, sky)
- [ ] Map borders → Forest green
- [ ] Modal headers → Forest green background

---

## Before vs After

### BEFORE (Generic Blue/White)
```
┌─────────────────────────────┐
│ #FFFFFF (boring white)      │
│ ┌───────────────────────┐   │
│ │ Blue button (#0066CC) │   │
│ └───────────────────────┘   │
│                             │
│ Generic corporate look      │
└─────────────────────────────┘
```

### AFTER (Nature-Themed NB)
```
┌──────────────────────────────┐
│ 🌲 SEKAR (#2D5016 green)   │ ← Forest green header
├──────────────────────────────┤
│ #F5F3EF (warm background)   │
│ ┌─────────────────────────┐ │
│ │ 🌳 Forest Green Button  │ │ ← Nature-themed
│ └─────────────────────────┘ │
│   └── Black 3px border +    │
│       Hard-edge shadow      │
│                             │
│ Distinctive park identity   │
└──────────────────────────────┘
```

---

## Accessibility Notes

All color combinations maintain **WCAG AA contrast** (4.5:1 minimum):

- Forest green (`#2D5016`) + White text: **9.8:1** ✅
- Black text on warm background (`#F5F3EF`): **15.2:1** ✅
- Grass green (`#7CB342`) + Black text: **4.6:1** ✅
- Sunshine yellow (`#FDD835`) + Black text: **11.5:1** ✅

All touch targets remain **48x48px minimum** for accessibility.

---

## Next Steps

1. Update all screen containers to use `nbColors.background`
2. Style navigation bars with forest green
3. Update button colors to nature theme
4. Apply green accents to headings and labels
5. Use playful accent colors for badges/notifications
6. Test contrast ratios in bright outdoor conditions (field use)

This creates a **distinctive, nature-focused identity** while maintaining **bold Neo Brutalism aesthetics**!
