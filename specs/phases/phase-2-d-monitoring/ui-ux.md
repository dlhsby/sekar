# Phase 2D: UI/UX Design Specification

**Last Updated:** 2026-03-03
**Status:** Planning
**Design System:** Neo Brutalism 2.0 (WCAG 2.1 AA)
**Related ADR:** ADR-011 (new)
**See also:** [Mobile Requirements](./mobile.md), [Web Requirements](./web.md), [README](./README.md)

---

## A. Status Color System

### A1. Primary Status Colors

| Status | Use | Hex | RGB | Tailwind | NB Token |
|--------|-----|-----|-----|----------|----------|
| **Active** | Marker, chip, card bg | `#15803D` | 21, 128, 61 | `green-700` | `nbColors.success` |
| **Idle** | Marker, chip, card bg | `#D97706` | 217, 119, 6 | `amber-600` | `nbColors.warning` |
| **Outside Area** | Marker, chip, card bg | `#9333EA` | 147, 51, 234 | `purple-600` | `nbColors.info` (override) |
| **Missing** | Marker, chip, card bg | `#DC2626` | 220, 38, 38 | `red-600` | `nbColors.danger` |
| **Offline** | List only (not on map) | `#6B7280` | 107, 114, 128 | `gray-500` | `nbColors.muted` |

### A2. Status Chip Colors (Background + Text)

| Status | Chip Background | Chip Text | Border |
|--------|----------------|-----------|--------|
| Active | `#DCFCE7` (green-100) | `#15803D` (green-700) | `#15803D` |
| Idle | `#FEF3C7` (amber-100) | `#92400E` (amber-800) | `#D97706` |
| Outside Area | `#F3E8FF` (purple-100) | `#6B21A8` (purple-800) | `#9333EA` |
| Missing | `#FEE2E2` (red-100) | `#991B1B` (red-800) | `#DC2626` |
| Offline | `#F3F4F6` (gray-100) | `#374151` (gray-700) | `#6B7280` |

### A3. WCAG Contrast Ratios

| Combination | Ratio | Pass |
|-------------|-------|------|
| Green-700 on white | 4.96:1 | AA ✅ |
| Amber-600 on white | 3.59:1 | AA (large text) ✅ |
| Amber-800 on amber-100 | 7.2:1 | AAA ✅ |
| Purple-600 on white | 5.42:1 | AA ✅ |
| Red-600 on white | 4.63:1 | AA ✅ |
| Gray-500 on white | 4.64:1 | AA ✅ |

### A4. Color Blindness Support

To ensure usability for users with color vision deficiencies, each status uses a unique combination of color + shape + icon:

| Status | Color | Shape | Icon | Pattern |
|--------|-------|-------|------|---------|
| Active | Green | Circle | ✓ check | Solid fill |
| Idle | Amber | Triangle | ⏸ pause | Diagonal stripes |
| Outside Area | Purple | Diamond | ↗ arrow-out | Dotted border |
| Missing | Red | Square | ! exclamation | Cross-hatch |

**Implementation:**
- Map markers: different icon shapes per status
- Status chips: include icon before label
- Status cards: include icon in card header
- High contrast mode: toggle in settings for enhanced patterns

---

## B. Map Marker Design

### B1. User Marker Dimensions

| Element | Size | Notes |
|---------|------|-------|
| Outer ring | 36px diameter | Status color |
| Inner icon | 20px | Role icon, white fill |
| Name label | 10px font | Below marker, white text with black outline |
| Selection ring | 44px diameter | Appears when selected, pulsing animation |
| Touch target | 44×44px | WCAG minimum touch target |

### B2. Role Icons (Inside Marker)

| Role | Icon Name | Description |
|------|-----------|-------------|
| `satgas` | `account` | Person silhouette |
| `linmas` | `shield` | Shield shape |
| `korlap` | `star` | Star shape |

**Color:** White icon on status-colored background.

### B3. Status Indicator Ring

The outer ring of the marker changes color based on status. For additional differentiation:

- **Active:** Solid ring, no animation
- **Idle:** Solid ring, slow pulse (2s period)
- **Outside Area:** Dashed ring (4px dash, 4px gap)
- **Missing:** Solid ring, fast pulse (1s period)

### B4. Area/Rayon Markers

For area center points (not user positions):

| Element | Design |
|---------|--------|
| Shape | Flag icon (distinct from user circles) |
| Size | 28px |
| Color | Area type color or rayon color |
| Label | Area name, 11px, below flag |
| Behavior | Click to zoom to area boundaries |

---

## C. Mobile Layout Specifications

### C1. MapDashboardScreen Structure

```
┌────────────────────────────────────────┐  ← 0px
│  Header (FieldHomeHeader, 56px)        │
├────────────────────────────────────────┤  ← 56px
│  Status Summary Bar (48px)             │
│  [●12 Active] [●5 Idle] [●2 Out] [●1] │
├────────────────────────────────────────┤  ← 104px
│                                        │
│                                        │
│              Map View                  │
│         (flex: 1, fills remaining)     │
│                                        │
│                         ┌────┐         │
│                         │ 🔍 │← FAB   │
│                         ├────┤  column │
│                         │ 📍 │  (right │
│                         ├────┤  edge)  │
│                         │ + │         │
│                         ├────┤         │
│                         │ - │         │
│                         ├────┤         │
│                         │ ↻ │         │
│                         └────┘         │
│                                        │
├────────────────────────────────────────┤
│  User List Strip (80px)                │
│  [Card1] [Card2] [Card3] [Card4] ...  │
└────────────────────────────────────────┘
│  Tab Bar (existing, ~56px)             │
└────────────────────────────────────────┘
```

### C2. Measurements

| Element | Height | Notes |
|---------|--------|-------|
| Header | 56px | FieldHomeHeader with title "Monitoring" |
| Summary bar | 48px | Horizontal scroll, `paddingHorizontal: 16` |
| Map | flex: 1 | Fills remaining space |
| FAB column | 5 × 44px + gaps | Right edge, `marginRight: 16` |
| User list strip | 80px | Horizontal FlatList |
| Tab bar | ~56px | Existing React Navigation tab bar |

### C3. FAB Button Specs

| Property | Value |
|----------|-------|
| Size | 44 × 44px |
| Border radius | 22px (full circle) |
| Background | White (`#FFFFFF`) |
| Border | 2px solid `#1A1A1A` |
| Shadow | NB shadow (offset 2,2 black) |
| Icon size | 22px |
| Icon color | `#1A1A1A` |
| Gap between FABs | 8px |
| Position | Right edge, vertically centered in map area |

---

## D. Web Layout Specifications

### D1. Split Panel (Desktop xl)

```
┌──────────────────────────────────────────────────────────┐
│  Page Header: "Monitoring Real-Time"   [⟳]    ← 64px    │
├──────────────────────────────────┬───────────────────────┤
│                                  │     Side Panel        │
│                                  │     width: 35%        │
│       Map                        │     min: 320px        │
│       width: 65%                 │     max: 480px        │
│       min-height: 600px          │                       │
│                                  │     padding: 16px     │
│                                  │     overflow-y: auto  │
│                                  │     border-left: 2px  │
│                                  │       solid #E5E7EB  │
│                                  │                       │
└──────────────────────────────────┴───────────────────────┘
```

### D2. Status Card Grid

```
┌──────────┐ ┌──────────┐
│  ● 12    │ │  ▲ 5     │
│  Active  │ │  Idle    │
│  ──────  │ │  ──────  │
│  green bg│ │  amber bg│
└──────────┘ └──────────┘
┌──────────┐ ┌──────────┐
│  ◆ 2     │ │  ■ 1     │
│  Outside │ │  Missing │
│  ──────  │ │  ──────  │
│  purple  │ │  red bg  │
└──────────┘ └──────────┘
```

| Property | Value |
|----------|-------|
| Card size | Equal width, `gap: 12px` |
| Border radius | 8px |
| Border | 2px solid (status color) |
| Background | Light status color (see A2) |
| Count font | 28px, bold |
| Label font | 12px, uppercase |
| Icon | Status icon (see A4), 16px |

### D3. User List Item

```
┌─────────────────────────────────────┐
│ [●] Ahmad Santoso            2m ago │
│     Satgas • Kebun Bibit   🔋 78%  │
└─────────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Height | 60px |
| Padding | 12px horizontal |
| Status dot | 10px diameter |
| Name font | 14px, semibold |
| Detail font | 12px, gray-500 |
| Hover | Light gray background |
| Selected | Left border 3px status color |
| Battery icon | Show when < 20%, red/yellow |

---

## E. User Detail Modal/Panel

### E1. Mobile: Bottom Sheet

| Property | Value |
|----------|-------|
| Initial height | 50% screen |
| Max height | 85% screen |
| Background | White |
| Border radius | 16px top |
| Handle | 32×4px, gray-300, centered |
| Close button | 24×24px, top-right corner |
| Padding | 16px |

### E2. Web: Side Panel Push

| Property | Value |
|----------|-------|
| Width | Same as side panel (35%) |
| Transition | Slide from right, 200ms ease |
| Background | White |
| Back button | Arrow + "Kembali", top-left |
| Padding | 16px |

### E3. Content Sections

Each section uses NB card styling:

| Section | Card Style |
|---------|------------|
| Shift Info | `bg-gray-50`, `border: 1px solid #E5E7EB`, `rounded-lg` |
| Last Location | Same as shift info |
| Activities | Collapsible, default expanded |
| Tasks | Collapsible, default expanded |
| Action Buttons | Bottom sticky area, `gap: 8px` |

### E4. Action Button Specs

| Button | Style | Icon |
|--------|-------|------|
| WhatsApp | Green bg (`#25D366`), white text | WhatsApp icon |
| Call | Blue bg (`#3B82F6`), white text | Phone icon |
| Trail/History | Purple bg (`#9333EA`), white text | Route icon |

Size: 44px height, flex: 1, `gap: 8px` between buttons.

---

## F. Location History Trail

### F1. Polyline Specs

| Property | Value |
|----------|-------|
| Width | 3px |
| Inside area color | `#15803D` (green-700) |
| Outside area color | `#9333EA` (purple-600) |
| Opacity | 0.8 |
| Line join | Round |

### F2. Point Markers

| Type | Size | Color | Label |
|------|------|-------|-------|
| Start point | 14px circle | `#15803D` | "S" |
| End point | 14px circle | `#DC2626` | "E" |
| Normal point | 6px circle | Same as polyline segment | None |
| Selected point | 10px circle | White with status border | Time callout |

### F3. Callout on Point Tap

```
┌─────────────────────┐
│ 08:45 WIB           │
│ ±12m • 🔋 78%       │
│ ✅ Inside area       │
└─────────────────────┘
```

---

## G. Filter Modal

### G1. Mobile: Full-Screen Modal

| Property | Value |
|----------|-------|
| Presentation | Full screen slide-up |
| Background | White |
| Header | "Filter Monitoring" + back arrow + "Reset" |
| Content | ScrollView with sections |
| Footer | "Terapkan" button (primary, full width, 48px height) |

### G2. Web: Inline Panel Section

Filters rendered inline at the top of the side panel:
- Collapsible with "Filter" toggle button
- Badge showing active filter count
- No modal — always visible in panel

### G3. Staffing Summary Card (in filter)

```
┌───────────────────────────────────┐
│  Kebun Bibit Wonorejo             │
│                                   │
│  Satgas    8/10   [██████░░] 80%  │
│            2 idle, 1 outside      │
│                                   │
│  Linmas    3/5    [██████░░] 60%  │
│            1 missing ⚠️            │
│                                   │
│  Korlap    1/1    [██████████] ✅  │
└───────────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Background | `gray-50` |
| Border | 1px solid `gray-200` |
| Border radius | 8px |
| Progress bar | 4px height, status-weighted color |
| Warning icon | Show when `!is_fully_staffed` |

---

## H. Accessibility

### H1. WCAG 2.1 AA Requirements

| Requirement | Implementation |
|-------------|---------------|
| Color contrast | All text meets 4.5:1 ratio (see A3) |
| Touch targets | Minimum 44×44px for all interactive elements |
| Screen reader | All markers have `accessibilityLabel` with name + status + role |
| Keyboard navigation | Web: all controls focusable, Tab order logical |
| Focus indicators | 2px blue outline on focus, 2px offset |
| Motion reduction | Respect `prefers-reduced-motion`; disable pulse animations |
| Status announcements | Screen reader announces status changes via live region |

### H2. Outdoor Use Considerations

The monitoring dashboard is used by field supervisors outdoors:

| Consideration | Solution |
|---------------|----------|
| Bright sunlight | High contrast colors; dark status colors on light backgrounds |
| Glare | Avoid pure white backgrounds; use `gray-50` as base |
| One-hand operation | FAB controls on right edge (thumb-reachable) |
| Quick glance | Large status counts (28px font); color-coded chips |
| Low battery | Battery level shown prominently; warn at <20% |

### H3. Screen Reader Labels

```typescript
// Marker
accessibilityLabel={`${user.full_name}, ${getRoleLabel(user.role)}, status ${getStatusLabel(user.status)}, di area ${user.area_name}`}

// Status chip
accessibilityLabel={`${count} petugas ${getStatusLabel(status)}`}

// User list card
accessibilityLabel={`${user.full_name}, ${getRoleLabel(user.role)}, ${getStatusLabel(user.status)}, terakhir aktif ${formatRelativeTime(user.last_update)}`}
```

---

## I. Micro-Interactions

### I1. Animations

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Marker appear | Scale from 0 to 1 | 200ms ease-out |
| Marker status change | Color transition | 300ms ease |
| Status chip tap | Scale 0.95 → 1.0 | 150ms |
| Side panel open | Slide from right | 200ms ease |
| Bottom sheet drag | Spring physics | ~300ms |
| Map fly-to | Mapbox flyTo | 1000ms ease |
| Trail polyline draw | Progressive reveal | 500ms |
| User list card hover | Background fade | 150ms |

### I2. Loading States

| Component | Loading State |
|-----------|--------------|
| Map | Skeleton map with pulsing overlay |
| User list | 5 skeleton rows with animated gradient |
| Status cards | 4 skeleton cards with pulsing numbers |
| Detail panel | Section-by-section skeleton loading |
| Location trail | Spinner overlay on map |
| Filter results | Inline spinner below filter bar |

### I3. Error States

| Error | Display |
|-------|---------|
| Map load failure | Fallback message: "Peta tidak tersedia" with retry button |
| API timeout | Toast: "Koneksi terputus. Data mungkin tidak terbaru." |
| WebSocket disconnect | Banner at top: "Koneksi real-time terputus. Reconnecting..." |
| No users found | Empty state: illustration + "Tidak ada petugas ditemukan" |
| Location history empty | "Tidak ada riwayat lokasi untuk tanggal ini" |

### I4. Empty States

| Screen | Empty State Message |
|--------|-------------------|
| Map (no users) | "Tidak ada petugas aktif saat ini" |
| Filter (no results) | "Tidak ada petugas yang cocok dengan filter" |
| Activities list | "Belum ada aktivitas hari ini" |
| Tasks list | "Tidak ada tugas hari ini" |

---

## J. Design Tokens

### J1. CSS Variables (Web)

```css
:root {
  /* Status colors */
  --status-active: #15803D;
  --status-active-bg: #DCFCE7;
  --status-active-text: #15803D;
  --status-idle: #D97706;
  --status-idle-bg: #FEF3C7;
  --status-idle-text: #92400E;
  --status-outside: #9333EA;
  --status-outside-bg: #F3E8FF;
  --status-outside-text: #6B21A8;
  --status-missing: #DC2626;
  --status-missing-bg: #FEE2E2;
  --status-missing-text: #991B1B;
  --status-offline: #6B7280;
  --status-offline-bg: #F3F4F6;
  --status-offline-text: #374151;

  /* Marker dimensions */
  --marker-size: 36px;
  --marker-icon-size: 20px;
  --marker-label-size: 10px;
  --marker-touch-target: 44px;

  /* Panel */
  --panel-width-xl: 35%;
  --panel-width-lg: 40%;
  --panel-min-width: 320px;
  --panel-max-width: 480px;

  /* Action buttons */
  --whatsapp-color: #25D366;
  --call-color: #3B82F6;
  --trail-color: #9333EA;
}
```

### J2. Mobile Constants

Add to `fe/mobile/src/constants/nbTokens.ts`:

```typescript
export const monitoringTokens = {
  status: {
    active: { color: '#15803D', bg: '#DCFCE7', label: 'Aktif' },
    inactive: { color: '#D97706', bg: '#FEF3C7', label: 'Idle' },
    outside_area: { color: '#9333EA', bg: '#F3E8FF', label: 'Di Luar Area' },
    missing: { color: '#DC2626', bg: '#FEE2E2', label: 'Tidak Terdeteksi' },
    offline: { color: '#6B7280', bg: '#F3F4F6', label: 'Offline' },
  },
  marker: {
    outerSize: 36,
    iconSize: 20,
    labelFontSize: 10,
    touchTarget: 44,
    selectionRingSize: 44,
  },
  summaryBar: {
    height: 48,
    chipHeight: 32,
    chipGap: 8,
    chipPaddingH: 12,
  },
  userListStrip: {
    height: 80,
    cardWidth: 160,
    cardGap: 8,
    cardPaddingH: 12,
  },
  fab: {
    size: 44,
    gap: 8,
    borderWidth: 2,
    shadowOffset: { width: 2, height: 2 },
  },
  detailSheet: {
    initialSnapPoint: '50%',
    maxSnapPoint: '85%',
    handleWidth: 32,
    handleHeight: 4,
    padding: 16,
  },
} as const;
```

---

## K. Indonesian Labels Reference

| English | Indonesian (UI) | Context |
|---------|----------------|---------|
| Active | Aktif | Status label |
| Idle | Idle | Status label (English borrowed) |
| Outside Area | Di Luar Area | Status label |
| Missing | Tidak Terdeteksi | Status label |
| Offline | Offline | Status label (English borrowed) |
| Filter | Filter | Button label |
| Apply | Terapkan | Filter apply button |
| Reset | Reset | Filter reset button |
| Search user | Cari petugas... | Search placeholder |
| Location History | Riwayat Lokasi | Button/section label |
| Shift Info | Info Shift | Section label |
| Last Location | Lokasi Terakhir | Section label |
| Activities Today | Aktivitas Hari Ini | Section label |
| Tasks Today | Tugas Hari Ini | Section label |
| Inside area | Dalam area | Boundary status |
| Outside area | Di luar area | Boundary status |
| Distance | Jarak | Summary label |
| Staffing | Kepegawaian | Summary label |
| Fully staffed | Lengkap | Staffing indicator |
| Understaffed | Kurang | Staffing indicator |
| No workers found | Tidak ada petugas ditemukan | Empty state |
| Connection lost | Koneksi terputus | Error state |
| Map unavailable | Peta tidak tersedia | Error state |

---

**Last Updated:** 2026-03-03
