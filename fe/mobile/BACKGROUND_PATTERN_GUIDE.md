# Neo Brutalism Background Patterns

**Component:** `NBBackgroundPattern`
**Purpose:** Add visual interest to plain backgrounds while maintaining NB flat color principle

---

## Why Patterns, Not Gradients?

**Neo Brutalism Rule:** ❌ NO gradients (breaks flat color principle)

**Approved alternatives:**
- ✅ Geometric patterns with transparency
- ✅ Grid/checkerboard/stripes
- ✅ Subtle textures (dots, lines)
- ✅ Solid colors with pattern overlays

**Why this works:**
- Maintains flat color aesthetic
- Adds visual interest without blur/softness
- Geometric = honest, structural (NB philosophy)
- Subtle opacity = doesn't interfere with readability

---

## Available Pattern Types

### 1. Grid Pattern (Default) ✅ **Applied to Login**

```tsx
<NBBackgroundPattern
  pattern="grid"
  backgroundColor={nbColors.background}
  patternColor={nbColors.primary}
  opacity={0.04}
>
```

**Visual:**
```
┌─────┬─────┬─────┬─────┐
│     │     │     │     │
├─────┼─────┼─────┼─────┤
│     │     │     │     │
├─────┼─────┼─────┼─────┤
│     │     │     │     │
├─────┼─────┼─────┼─────┤
│     │     │     │     │
└─────┴─────┴─────┴─────┘
```

**Properties:**
- 40x40px grid squares
- 2px line thickness
- Forest green lines on cream background
- 4% opacity (subtle, not distracting)

**Best for:**
- Login/auth screens
- Forms
- Settings pages
- Professional contexts

---

### 2. Checkerboard Pattern

```tsx
<NBBackgroundPattern
  pattern="checkerboard"
  backgroundColor={nbColors.background}
  patternColor={nbColors.black}
  opacity={0.03}
>
```

**Visual:**
```
■ □ ■ □ ■ □
□ ■ □ ■ □ ■
■ □ ■ □ ■ □
□ ■ □ ■ □ ■
```

**Properties:**
- 40x40px total repeat (20x20px squares)
- Alternating filled/empty squares
- Bold NB aesthetic

**Best for:**
- Dashboards
- Data-heavy screens
- Playful sections

---

### 3. Dots Pattern

```tsx
<NBBackgroundPattern
  pattern="dots"
  backgroundColor={nbColors.background}
  patternColor={nbColors.accentGrass}
  opacity={0.05}
>
```

**Visual:**
```
•   •   •   •   •   •
  •   •   •   •   •
•   •   •   •   •   •
  •   •   •   •   •
```

**Properties:**
- 30x30px spacing
- 3px radius dots
- Most subtle pattern

**Best for:**
- Empty states
- Loading screens
- Minimal designs

---

### 4. Diagonal Stripes

```tsx
<NBBackgroundPattern
  pattern="stripes"
  backgroundColor={nbColors.background}
  patternColor={nbColors.primary}
  opacity={0.04}
>
```

**Visual:**
```
╱ ╱ ╱ ╱ ╱ ╱ ╱
╱ ╱ ╱ ╱ ╱ ╱ ╱
╱ ╱ ╱ ╱ ╱ ╱ ╱
╱ ╱ ╱ ╱ ╱ ╱ ╱
```

**Properties:**
- 20px spacing
- 45° rotation
- 2px stroke width
- Dynamic, energetic

**Best for:**
- Action screens
- Alerts/warnings
- High-energy sections

---

### 5. None (Plain)

```tsx
<NBBackgroundPattern
  pattern="none"
  backgroundColor={nbColors.background}
>
```

Renders solid color without pattern (useful for conditional rendering).

---

## Login Screen Implementation

### Current Setup (Grid Pattern)

```tsx
// LoginScreen.tsx
return (
  <NBBackgroundPattern
    pattern="grid"                      // Grid of lines
    backgroundColor={nbColors.background} // #FEF9ED cream
    patternColor={nbColors.primary}      // #2D5016 forest green
    opacity={0.04}                       // 4% - very subtle
  >
    <SafeAreaView style={styles.safeArea}>
      {/* Login form content */}
    </SafeAreaView>
  </NBBackgroundPattern>
);
```

### Visual Effect

**Before (Plain Cream):**
```
┌─────────────────────────────────┐
│                                  │
│      #FEF9ED cream               │
│      (boring, flat)              │
│                                  │
│         ┌──────────┐             │
│         │  SEKAR   │             │
│         └──────────┘             │
│                                  │
└─────────────────────────────────┘
```

**After (Grid Pattern):**
```
┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
│ │ │ │ │ #FEF9ED with subtle  │ │
│ │ │ │ │ forest green grid   │ │
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
│ │ │ │ │ (textured, modern)  │ │
│ │ │ │   ┌──────────┐         │ │
│ │ │ │   │  SEKAR   │         │ │
│ │ │ │   └──────────┘         │ │
├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
└─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘
                ↑
        Subtle texture adds depth
        without being distracting
```

---

## Opacity Guidelines

| Opacity | Effect | Best For |
|---------|--------|----------|
| 0.02 | Barely visible | Professional/formal |
| 0.03 | Very subtle | Default for most screens |
| 0.04 | Subtle (Login uses this) | Balanced visibility |
| 0.05 | Noticeable | Playful sections |
| 0.08 | Strong | Accent areas only |
| 0.10+ | ❌ Too bold | Avoid - interferes with text |

**Rule of thumb:** If you have to squint to see it, it's perfect! 👀

---

## Color Combinations

### Nature Theme (For SEKAR)

```tsx
// Option 1: Forest green grid (✅ Current)
patternColor={nbColors.primary}    // #2D5016 forest green
opacity={0.04}

// Option 2: Grass green accents
patternColor={nbColors.accentGrass} // #7CB342 bright green
opacity={0.03}

// Option 3: Earth brown texture
patternColor={nbColors.secondary}   // #6B4423 earth brown
opacity={0.04}

// Option 4: Black (classic NB)
patternColor={nbColors.black}       // #000000
opacity={0.02}  // Use lower opacity for black
```

### Contrast Principles

**Background:** Cream `#FEF9ED` (warm, light)
**Pattern:** Should be **darker** for visibility

✅ **Good combinations:**
- Forest green on cream (nature theme)
- Black on cream (classic)
- Earth brown on cream (organic)

❌ **Bad combinations:**
- Yellow on cream (too low contrast)
- White on cream (invisible)
- Pink on cream (clashes with parks theme)

---

## Performance Considerations

**SVG Patterns are efficient:**
- ✅ Vector-based (scales perfectly)
- ✅ Small file size (pattern repeats)
- ✅ Hardware accelerated
- ✅ No image loading required

**Rendering cost:**
- Grid/Stripes: Very low
- Checkerboard: Very low
- Dots: Very low
- **Impact:** Negligible on performance

---

## Accessibility

**All patterns maintain accessibility:**

| Element | Contrast Ratio | Status |
|---------|----------------|--------|
| Black text on patterned bg | 17.8:1 | AAA ✅ |
| Green text on patterned bg | 8.1:1 | AAA ✅ |
| White cards on patterned bg | Excellent | ✅ |
| Input focus states | 5.4:1 | AA ✅ |

**Why patterns don't reduce accessibility:**
- Very low opacity (2-5%)
- Pattern doesn't overlap text
- Background + pattern still meets WCAG AA

---

## Neo Brutalism Compliance

✅ **Approved NB techniques:**
1. **Geometric patterns** - Grid, checkerboard, stripes (honest, structural)
2. **Flat colors** - No gradients (maintains NB principle)
3. **Hard edges** - Sharp, crisp patterns (not blurred)
4. **Transparency** - Subtle overlay (doesn't hide structure)

❌ **Rejected non-NB techniques:**
1. ~~Gradients~~ - Breaks flat color rule
2. ~~Soft textures~~ - Too subtle/organic for NB
3. ~~Photos/images~~ - Too complex
4. ~~Blurred patterns~~ - Conflicts with hard-edge aesthetic

---

## Usage Examples

### Login Screen (Current)
```tsx
<NBBackgroundPattern pattern="grid" opacity={0.04}>
  <LoginForm />
</NBBackgroundPattern>
```

### Dashboard (Checkerboard)
```tsx
<NBBackgroundPattern pattern="checkerboard" opacity={0.03}>
  <DashboardContent />
</NBBackgroundPattern>
```

### Empty State (Dots)
```tsx
<NBBackgroundPattern pattern="dots" opacity={0.05}>
  <NBEmptyState variant="noData" />
</NBBackgroundPattern>
```

### Alert Screen (Stripes)
```tsx
<NBBackgroundPattern
  pattern="stripes"
  patternColor={nbColors.warning}
  opacity={0.04}
>
  <AlertContent />
</NBBackgroundPattern>
```

---

## Switching Patterns

To change the login screen pattern:

```tsx
// Option 1: Checkerboard (bold)
<NBBackgroundPattern pattern="checkerboard" opacity={0.03}>

// Option 2: Dots (subtle)
<NBBackgroundPattern pattern="dots" opacity={0.05}>

// Option 3: Stripes (dynamic)
<NBBackgroundPattern pattern="stripes" opacity={0.04}>

// Option 4: No pattern (plain)
<NBBackgroundPattern pattern="none">
```

---

## Summary

✅ **Implemented:** Grid pattern on login screen
✅ **Neo Brutalism compliant:** Geometric, flat colors, hard edges
✅ **Accessible:** 17.8:1 text contrast maintained
✅ **Performant:** SVG patterns, hardware accelerated
✅ **Nature-themed:** Forest green grid on cream background

**Result:** Login screen is no longer boring while maintaining NB aesthetic! 🌲✨

The subtle grid pattern adds **visual interest** without compromising **readability** or **accessibility**.
