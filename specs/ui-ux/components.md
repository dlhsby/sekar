# Component Library

UI component specifications with states, variants, and usage guidelines.

## Component Categories

| Category | Components |
|----------|------------|
| **Actions** | Button, IconButton, FAB |
| **Inputs** | TextInput, Select, Checkbox, Radio |
| **Display** | Card, Badge, Avatar, StatusIndicator |
| **Feedback** | Toast, Modal, BottomSheet, Loading |
| **Navigation** | TabBar, Header, ListItem |
| **Data** | DataCard, ReportCard, WorkerCard |

---

## Button

Primary interactive element for user actions.

### Variants

| Variant | Usage | Background | Text |
|---------|-------|------------|------|
| **Primary** | Main CTAs | `primary` | `white` |
| **Secondary** | Secondary actions | `transparent` | `primary` |
| **Outline** | Tertiary actions | `transparent` | `textPrimary` |
| **Text** | Inline actions | `transparent` | `primary` |
| **Danger** | Destructive actions | `error` | `white` |

### Sizes

| Size | Height | Padding H | Font Size |
|------|--------|-----------|-----------|
| `sm` | 36px | 12px | 14px |
| `md` | 48px | 16px | 16px |
| `lg` | 56px | 24px | 18px |

### States

```
┌─────────────────────────────────────────────────┐
│ Default    │ Hover      │ Pressed    │ Disabled │
├─────────────────────────────────────────────────┤
│ Primary    │ 10% darker │ 20% darker │ 40% α    │
│ #2E7D32    │ #267028    │ #1B5E20    │ #2E7D32  │
│            │ (web only) │            │ + overlay│
├─────────────────────────────────────────────────┤
│ Loading: Show spinner, disable interaction      │
└─────────────────────────────────────────────────┘
```

### Specifications

```typescript
// Primary Button - Default
{
  height: 48,
  paddingHorizontal: 16,
  backgroundColor: colors.primary,
  borderRadius: borderRadius.md,
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: touchTarget.minWidth, // 48px
}

// Primary Button - Disabled
{
  ...defaultStyles,
  opacity: 0.4,
}

// Primary Button - Loading
{
  ...defaultStyles,
  // Replace text with ActivityIndicator
}
```

### Usage Example

```tsx
<Button
  variant="primary"
  size="md"
  onPress={handleClockIn}
  loading={isLoading}
  disabled={!isWithinBoundary}
>
  Masuk Kerja
</Button>
```

---

## TextInput

Single-line and multi-line text input field.

### States

| State | Border | Label | Helper | Background |
|-------|--------|-------|--------|------------|
| **Default** | `border` | `textSecondary` | `textSecondary` | `white` |
| **Focused** | `primary` | `primary` | `textSecondary` | `white` |
| **Filled** | `border` | `textSecondary` | `textSecondary` | `white` |
| **Error** | `error` | `error` | `error` | `white` |
| **Disabled** | `gray200` | `textDisabled` | `textDisabled` | `gray100` |
| **Success** | `success` | `textSecondary` | `success` | `white` |

### Anatomy

```
┌────────────────────────────────────┐
│ Label                              │  ← Label (sm, textSecondary)
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ [Icon] Placeholder        [X]  │ │  ← Input (base, textPrimary)
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ Helper text or error message       │  ← Helper (xs, textSecondary/error)
└────────────────────────────────────┘
```

### Specifications

```typescript
// TextInput Container
{
  marginBottom: spacing.md, // 16px
}

// Label
{
  fontSize: typography.fontSize.sm, // 14px
  fontWeight: typography.fontWeight.medium,
  color: colors.textSecondary,
  marginBottom: spacing.xs, // 4px
}

// Input Field
{
  height: 48,
  paddingHorizontal: spacing.md, // 16px
  backgroundColor: colors.white,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: borderRadius.md, // 8px
  fontSize: typography.fontSize.base, // 16px
  color: colors.textPrimary,
}

// Input Field - Focused
{
  borderColor: colors.primary,
  borderWidth: 2,
}

// Input Field - Error
{
  borderColor: colors.error,
}

// Helper Text
{
  fontSize: typography.fontSize.xs, // 12px
  color: colors.textSecondary,
  marginTop: spacing.xs, // 4px
}
```

---

## Card

Container for grouped content.

### Variants

| Variant | Background | Border | Shadow |
|---------|------------|--------|--------|
| **Elevated** | `surface` | none | `shadows.sm` |
| **Outlined** | `surface` | `border` | none |
| **Filled** | `gray100` | none | none |

### Anatomy

```
┌────────────────────────────────────┐
│ ┌────────────────────────────────┐ │
│ │           Header               │ │  ← Optional header
│ ├────────────────────────────────┤ │
│ │                                │ │
│ │           Content              │ │  ← Main content
│ │                                │ │
│ ├────────────────────────────────┤ │
│ │           Actions              │ │  ← Optional footer
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
     ↑ padding: 16px (lg on larger cards)
```

### Specifications

```typescript
// Elevated Card
{
  backgroundColor: colors.surface,
  borderRadius: borderRadius.md, // 8px
  padding: spacing.md, // 16px
  ...shadows.sm,
}

// Outlined Card
{
  backgroundColor: colors.surface,
  borderRadius: borderRadius.md,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
}

// Interactive Card (pressed state)
{
  ...cardStyles,
  opacity: 0.8, // or backgroundColor with slight overlay
}
```

---

## StatusBadge

Compact status indicator with icon and optional text.

### Variants

| Status | Color | Icon | Text Example |
|--------|-------|------|--------------|
| **Online** | `success` | `●` (circle-medium) | Online |
| **Offline** | `error` | `○` (circle-outline) | Offline |
| **Syncing** | `warning` | `↻` (sync) | Menyinkronkan... |
| **Pending** | `gray500` | `○` | Menunggu |
| **Success** | `success` | `✓` (check) | Berhasil |
| **Error** | `error` | `✗` (close) | Gagal |

### Anatomy

```
┌─────────────────────────┐
│ [●] Online              │  ← Icon (16px) + Text (sm)
└─────────────────────────┘
     └─ Dot indicator
```

### Specifications

```typescript
// StatusBadge Container
{
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: spacing.sm, // 8px
  paddingVertical: spacing.xs, // 4px
  backgroundColor: colors.gray100, // or status color with 0.1 opacity
  borderRadius: borderRadius.full, // Pill shape
}

// Status Icon
{
  width: 16,
  height: 16,
  marginRight: spacing.xs, // 4px
}

// Status Text
{
  fontSize: typography.fontSize.sm, // 14px
  fontWeight: typography.fontWeight.medium,
  color: colors.textPrimary, // or status color
}
```

---

## Toast / Snackbar

Temporary feedback message.

### Variants

| Type | Background | Icon |
|------|------------|------|
| **Success** | `success` | check-circle |
| **Error** | `error` | alert-circle |
| **Warning** | `warning` | alert |
| **Info** | `info` | information |

### Anatomy

```
┌──────────────────────────────────────┐
│ [Icon]  Message text          [X]   │
└──────────────────────────────────────┘
```

### Specifications

```typescript
// Toast Container
{
  flexDirection: 'row',
  alignItems: 'center',
  padding: spacing.md, // 16px
  backgroundColor: colors.success, // varies by type
  borderRadius: borderRadius.md, // 8px
  marginHorizontal: spacing.md,
  ...shadows.md,
}

// Toast Message
{
  flex: 1,
  fontSize: typography.fontSize.base, // 16px
  color: colors.white,
  marginLeft: spacing.sm, // 8px
}

// Duration
{
  duration: 3000, // 3 seconds default
  // Success/Info: 3s
  // Warning: 4s
  // Error: 5s (or until dismissed)
}
```

---

## Modal / Dialog

Overlay container for important interactions.

### Types

| Type | Usage | Actions |
|------|-------|---------|
| **Alert** | Confirmation | 1-2 buttons |
| **Form** | Data input | Cancel + Submit |
| **Full-screen** | Complex content | Close button |

### Anatomy

```
┌────────────────────────────────────────┐
│                Overlay                 │
│   ┌────────────────────────────────┐   │
│   │            Title               │   │
│   ├────────────────────────────────┤   │
│   │                                │   │
│   │           Content              │   │
│   │                                │   │
│   ├────────────────────────────────┤   │
│   │  [Cancel]         [Confirm]    │   │
│   └────────────────────────────────┘   │
│                                        │
└────────────────────────────────────────┘
```

### Specifications

```typescript
// Overlay
{
  flex: 1,
  backgroundColor: colors.overlay, // rgba(0, 0, 0, 0.5)
  justifyContent: 'center',
  alignItems: 'center',
}

// Modal Container
{
  width: '85%',
  maxWidth: 400,
  backgroundColor: colors.surface,
  borderRadius: borderRadius.lg, // 12px
  ...shadows.lg,
}

// Modal Title
{
  fontSize: typography.fontSize.xl, // 20px
  fontWeight: typography.fontWeight.bold,
  padding: spacing.md, // 16px
  borderBottomWidth: 1,
  borderBottomColor: colors.divider,
}

// Modal Content
{
  padding: spacing.md, // 16px
}

// Modal Actions
{
  flexDirection: 'row',
  justifyContent: 'flex-end',
  padding: spacing.md,
  gap: spacing.sm, // 8px
}
```

---

## Loading States

### Full Screen Loading

```
┌────────────────────────────────────┐
│                                    │
│                                    │
│              [Spinner]             │
│              Memuat...             │
│                                    │
│                                    │
└────────────────────────────────────┘
```

### Inline Loading

```
┌──────────────────────┐
│  [○] Menyimpan...    │
└──────────────────────┘
```

### Skeleton Loading

```
┌────────────────────────────────────┐
│ ████████████████                   │  ← Title skeleton
│ ████████████████████████████████   │  ← Body line 1
│ ████████████████████████           │  ← Body line 2
│                                    │
│ ┌────────┐ ┌────────┐ ┌────────┐   │  ← Card skeletons
│ │ ██████ │ │ ██████ │ │ ██████ │   │
│ │ █████  │ │ █████  │ │ █████  │   │
│ └────────┘ └────────┘ └────────┘   │
└────────────────────────────────────┘
```

### Specifications

```typescript
// Skeleton Placeholder
{
  backgroundColor: colors.gray200,
  borderRadius: borderRadius.sm, // 4px
  // Animate opacity: 0.5 → 1.0 → 0.5
}
```

---

## Empty State

Placeholder for screens with no data.

### Anatomy

```
┌────────────────────────────────────┐
│                                    │
│         [Illustration]             │  ← 120×120px illustration
│                                    │
│         Belum Ada Laporan          │  ← Title (xl)
│                                    │
│    Buat laporan pertama Anda       │  ← Description (sm, secondary)
│    untuk memulai.                  │
│                                    │
│        [Buat Laporan]              │  ← Primary CTA
│                                    │
└────────────────────────────────────┘
```

### Specifications

```typescript
// Empty State Container
{
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: spacing.xl, // 32px
}

// Illustration
{
  width: 120,
  height: 120,
  marginBottom: spacing.lg, // 24px
}

// Title
{
  fontSize: typography.fontSize.xl, // 20px
  fontWeight: typography.fontWeight.semibold,
  color: colors.textPrimary,
  textAlign: 'center',
  marginBottom: spacing.sm, // 8px
}

// Description
{
  fontSize: typography.fontSize.sm, // 14px
  color: colors.textSecondary,
  textAlign: 'center',
  marginBottom: spacing.lg, // 24px
  maxWidth: 280,
}
```

---

## Select / Dropdown

Dropdown selection field for choosing from predefined options.

### States

| State | Border | Label | Background | Dropdown |
|-------|--------|-------|------------|----------|
| **Default** | `border` | `textSecondary` | `white` | Closed |
| **Open** | `primary` | `primary` | `white` | Visible |
| **Selected** | `border` | `textSecondary` | `white` | Closed, shows value |
| **Disabled** | `gray200` | `textDisabled` | `gray100` | Cannot open |
| **Error** | `error` | `error` | `white` | Closed, error message |

### Sizes

| Size | Height | Font Size | Padding |
|------|--------|-----------|---------|
| `sm` | 40px | 14px | 12px |
| `md` | 48px | 16px | 16px |
| `lg` | 56px | 18px | 20px |

### Anatomy

```
┌────────────────────────────────────┐
│ Label                              │  ← Label (sm, textSecondary)
├────────────────────────────────────┤
│ ┌────────────────────────────────┐ │
│ │ Selected Value        [▼]      │ │  ← Select (base, textPrimary)
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ Helper text or error message       │  ← Helper (xs, textSecondary/error)
└────────────────────────────────────┘

When open:
┌────────────────────────────────────┐
│ ┌────────────────────────────────┐ │
│ │ [✓] Option 1                   │ │  ← Selected
│ │ [ ] Option 2                   │ │  ← Unselected
│ │ [ ] Option 3                   │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

### Specifications

```typescript
// Select Container
{
  marginBottom: spacing.md, // 16px
}

// Select Field (Closed)
{
  height: 48,
  paddingHorizontal: spacing.md, // 16px
  backgroundColor: colors.white,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: borderRadius.md, // 8px
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
}

// Dropdown (Open)
{
  position: 'absolute',
  top: 52, // Below select field
  left: 0,
  right: 0,
  maxHeight: 240, // ~5 items visible
  backgroundColor: colors.white,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: borderRadius.md,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 4,
  zIndex: 1000,
}

// Dropdown Item
{
  height: 48,
  paddingHorizontal: spacing.md,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottomWidth: 1,
  borderBottomColor: colors.gray200,
}

// Dropdown Item (Selected)
{
  backgroundColor: colors.primaryLight + '10', // 10% opacity
}

// Chevron Icon
{
  // Rotate 180° when open
  transform: [{ rotate: isOpen ? '180deg' : '0deg' }],
}
```

### Usage Example

```tsx
<Select
  label="Pilih Area"
  placeholder="Pilih area kerja"
  value={selectedArea}
  onChange={setSelectedArea}
  options={[
    { value: 'area-1', label: 'Taman Bungkul' },
    { value: 'area-2', label: 'Taman Harmoni' },
    { value: 'area-3', label: 'Taman Flora' },
  ]}
  error={errors.area}
  disabled={isLoading}
/>
```

### Features

**Basic Select:**
- Single selection
- Keyboard navigation (Arrow keys, Enter, Escape)
- Touch-friendly dropdown (48px minimum item height)
- Scrollable if options > 5 items

**With Search (Optional):**
```tsx
<Select
  label="Pilih Area"
  options={areas}
  searchable
  searchPlaceholder="Cari area..."
  onSearch={filterAreas}
/>
```

**Multi-Select Variant:**
```tsx
<Select
  label="Pilih Area (multiple)"
  multi
  value={selectedAreas} // Array
  onChange={setSelectedAreas}
  options={areas}
  renderValue={(selected) => `${selected.length} area dipilih`}
/>
```

---

## Checkbox

Checkbox for binary or multi-selection input.

### States

| State | Border | Background | Checkmark | Touchable |
|-------|--------|------------|-----------|-----------|
| **Unchecked** | `border` | `white` | None | Yes |
| **Checked** | `primary` | `primary` | White ✓ | Yes |
| **Indeterminate** | `primary` | `primary` | White – | Yes |
| **Disabled (Unchecked)** | `gray300` | `gray100` | None | No |
| **Disabled (Checked)** | `gray300` | `gray300` | Gray ✓ | No |

### Sizes

| Size | Box Size | Icon Size | Touch Target | Font Size |
|------|----------|-----------|--------------|-----------|
| `sm` | 20×20px | 14px | 44×44px | 14px |
| `md` | 24×24px | 16px | 48×48px | 16px |
| `lg` | 28×28px | 20px | 56×56px | 18px |

### Anatomy

```
┌──────────────────────────────────────────┐
│ [✓] Label text                           │  ← Touch target: full row
│     Helper text (optional)               │
└──────────────────────────────────────────┘
    ↑
    24×24px visible checkbox
    48×48px touch target
```

### Specifications

```typescript
// Checkbox Container (with label)
{
  flexDirection: 'row',
  alignItems: 'center',
  minHeight: touchTarget.minHeight, // 48px
  paddingVertical: spacing.xs, // 4px
}

// Checkbox Touch Area
{
  width: 48,
  height: 48,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: spacing.sm, // 8px
}

// Checkbox Visual (Unchecked)
{
  width: 24,
  height: 24,
  borderWidth: 2,
  borderColor: colors.border,
  borderRadius: borderRadius.sm, // 4px
  backgroundColor: colors.white,
}

// Checkbox Visual (Checked)
{
  width: 24,
  height: 24,
  borderWidth: 2,
  borderColor: colors.primary,
  borderRadius: borderRadius.sm,
  backgroundColor: colors.primary,
  alignItems: 'center',
  justifyContent: 'center',
}

// Checkmark Icon
{
  // MaterialCommunityIcons: "check"
  size: 16,
  color: colors.white,
}

// Label Text
{
  fontSize: typography.fontSize.base, // 16px
  fontWeight: typography.fontWeight.regular,
  color: colors.textPrimary,
  flex: 1,
}

// Helper Text
{
  fontSize: typography.fontSize.sm, // 14px
  color: colors.textSecondary,
  marginLeft: 56, // Align with label
  marginTop: spacing.xxs, // 2px
}
```

### Usage Example

```tsx
// Single checkbox
<Checkbox
  label="Saya setuju dengan syarat dan ketentuan"
  checked={agreed}
  onChange={setAgreed}
/>

// Checkbox group
<View>
  <Text style={styles.groupLabel}>Pilih jenis pekerjaan:</Text>
  <Checkbox
    label="Pemangkasan rumput"
    checked={tasks.includes('mowing')}
    onChange={() => toggleTask('mowing')}
  />
  <Checkbox
    label="Penyiraman tanaman"
    checked={tasks.includes('watering')}
    onChange={() => toggleTask('watering')}
  />
  <Checkbox
    label="Pembersihan sampah"
    checked={tasks.includes('cleaning')}
    onChange={() => toggleTask('cleaning')}
  />
</View>

// Indeterminate state (for "select all")
<Checkbox
  label="Pilih semua"
  checked={allSelected}
  indeterminate={someSelected}
  onChange={toggleAllTasks}
/>
```

### Accessibility

```tsx
<Checkbox
  label="Remember me"
  checked={rememberMe}
  onChange={setRememberMe}
  accessibilityLabel="Remember me checkbox"
  accessibilityRole="checkbox"
  accessibilityState={{ checked: rememberMe }}
/>
```

### Variations

**With Helper Text:**
```tsx
<Checkbox
  label="Aktifkan notifikasi"
  helper="Terima pemberitahuan tugas baru via push notification"
  checked={notificationsEnabled}
  onChange={setNotificationsEnabled}
/>
```

**Disabled:**
```tsx
<Checkbox
  label="Fitur premium (segera hadir)"
  checked={false}
  disabled
/>
```

---

## BottomSheet (Mobile)

Modal sheet that slides up from bottom, commonly used for actions, filters, or forms on mobile.

### Snap Points

| Snap Point | Height | Usage |
|------------|--------|-------|
| **25%** | 1/4 screen | Quick actions (2-3 buttons) |
| **50%** | 1/2 screen | Forms, filters |
| **75%** | 3/4 screen | Long lists, detailed content |
| **100%** | Full screen | Complex forms, galleries |

### Anatomy

```
┌────────────────────────────────────┐
│ Screen Content                     │  ← Dimmed backdrop (opacity 0.5)
│                                    │
│                                    │
├────────────────────────────────────┤  ← BottomSheet starts here
│ ━━━━━━━━━━                         │  ← Drag handle (40×4px, centered)
│                                    │
│ Sheet Header (optional)            │  ← Title, close button
│                                    │
│ Sheet Content                      │  ← Scrollable content
│                                    │
│ [Primary Action Button]            │  ← Fixed footer (optional)
└────────────────────────────────────┘
```

### States

| State | Backdrop | Sheet Position | Draggable |
|-------|----------|----------------|-----------|
| **Closed** | Hidden | Off-screen | No |
| **Opening** | Fading in | Sliding up | No |
| **Open (at snap point)** | Visible (0.5α) | At snap point | Yes |
| **Dragging** | Visible | Following touch | Yes |
| **Closing** | Fading out | Sliding down | No |

### Specifications

```typescript
// Backdrop
{
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
}

// BottomSheet Container
{
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  maxHeight: '90%', // Never cover entire screen
  backgroundColor: colors.white,
  borderTopLeftRadius: borderRadius.xl, // 20px
  borderTopRightRadius: borderRadius.xl,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 8,
}

// Drag Handle
{
  width: 40,
  height: 4,
  backgroundColor: colors.gray300,
  borderRadius: 2,
  alignSelf: 'center',
  marginTop: spacing.sm, // 8px
  marginBottom: spacing.md, // 16px
}

// Sheet Header
{
  paddingHorizontal: spacing.lg, // 24px
  paddingTop: spacing.md, // 16px
  paddingBottom: spacing.sm, // 8px
  borderBottomWidth: 1,
  borderBottomColor: colors.gray200,
}

// Sheet Content (Scrollable)
{
  flex: 1,
  paddingHorizontal: spacing.lg, // 24px
  paddingVertical: spacing.md, // 16px
}

// Sheet Footer (Fixed)
{
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  borderTopWidth: 1,
  borderTopColor: colors.gray200,
  backgroundColor: colors.white,
}
```

### Usage Example

```tsx
import { BottomSheet } from '@/components/BottomSheet';

// Quick action sheet (25%)
<BottomSheet
  visible={showActions}
  onClose={() => setShowActions(false)}
  snapPoint="25%"
>
  <Text style={styles.sheetTitle}>Pilih Aksi</Text>
  <TouchableOpacity style={styles.actionItem} onPress={editReport}>
    <MaterialCommunityIcons name="pencil" size={20} />
    <Text>Edit Laporan</Text>
  </TouchableOpacity>
  <TouchableOpacity style={styles.actionItem} onPress={deleteReport}>
    <MaterialCommunityIcons name="delete" size={20} color={colors.error} />
    <Text style={{ color: colors.error }}>Hapus Laporan</Text>
  </TouchableOpacity>
</BottomSheet>

// Filter sheet (50%)
<BottomSheet
  visible={showFilters}
  onClose={() => setShowFilters(false)}
  snapPoint="50%"
  title="Filter Laporan"
>
  <Select
    label="Status"
    value={filterStatus}
    onChange={setFilterStatus}
    options={statusOptions}
  />
  <Select
    label="Area"
    value={filterArea}
    onChange={setFilterArea}
    options={areaOptions}
  />
  <View style={styles.footer}>
    <Button variant="outline" onPress={resetFilters}>
      Reset
    </Button>
    <Button variant="primary" onPress={applyFilters}>
      Terapkan Filter
    </Button>
  </View>
</BottomSheet>

// Form sheet (75%)
<BottomSheet
  visible={showReportForm}
  onClose={() => setShowReportForm(false)}
  snapPoint="75%"
  title="Buat Laporan Baru"
  scrollable
>
  <TextInput label="Judul Laporan" {...} />
  <TextInput label="Deskripsi" multiline {...} />
  <Select label="Jenis Laporan" {...} />
  <Button onPress={submitReport}>Kirim Laporan</Button>
</BottomSheet>
```

### Behavior

**Opening:**
- Animate backdrop opacity: 0 → 0.5 (200ms)
- Animate sheet position: bottom -100% → snap point (300ms, ease-out)

**Dragging:**
- Allow drag from anywhere on sheet (not just handle)
- Snap to nearest snap point on release
- Close if dragged below minimum threshold (10% of screen height)
- Provide haptic feedback at snap points (iOS/Android)

**Closing:**
- Tap backdrop: Close sheet
- Drag down past threshold: Close sheet
- Press close button: Close sheet
- Press device back button (Android): Close sheet

**Platform Differences:**

```typescript
// iOS: Use native feel
{
  borderTopRadius: 20, // More rounded
  shadowOpacity: 0.15, // Softer shadow
}

// Android: Use Material Design feel
{
  borderTopRadius: 16, // Less rounded
  elevation: 8, // More pronounced elevation
}
```

### Accessibility

```tsx
<BottomSheet
  visible={visible}
  onClose={onClose}
  accessibilityLabel="Filter options"
  accessibilityViewIsModal
  accessibilityRole="menu"
>
  {/* Content */}
</BottomSheet>
```

**Focus Management:**
- Trap focus within sheet when open
- Return focus to trigger element when closed
- Support Escape key to close (Android hardware keyboard)

---

## Component Checklist

### Specified (Complete)

- [x] Button (all variants)
- [x] TextInput
- [x] Card
- [x] StatusBadge
- [x] Toast / Snackbar
- [x] Modal / Dialog
- [x] Loading States
- [x] Empty State
- [x] Select / Dropdown
- [x] Checkbox
- [x] BottomSheet

### To Specify

- [ ] Radio Button
- [ ] Avatar
- [ ] IconButton
- [ ] FAB (Floating Action Button)
- [ ] TabBar
- [ ] Header
- [ ] ListItem
- [ ] Badge
- [ ] Skeleton Loader

---

**Document Owner:** UI/UX Designer
**Last Updated:** 2026-01-16
**Status:** Active
**Implementation:** `fe/mobile/src/components/`
